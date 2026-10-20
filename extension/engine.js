/* Yuze-agent 引擎 —— 由 gen-engine.mjs 从 sidepanel.js 自动抽取，勿手改。
   chrome.* 已替换为 APIC.*（offscreen 文档里由 RPC 代理到 background）。 */
window.Engine = (function () {
  'use strict';

  let attachedTabId = null;
  let mcpServers = [];
  let mcpTools = [];
  let abortCtrl = null;
  let stopRequested = false;
  let agentMode = 'task';
  let lastShot = null;
  let statusSink = null;
  let fileSink = null;
  let errorSink = null;

  function setStatus(t) { if (statusSink) { try { statusSink(t); } catch (_) {} } }

  async function addFileCard(f) {
    let arr = null;
    try {
      const bin = atob(f.b64);
      arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    } catch (e) {
      throw new Error('文件内容解码失败：' + (e?.message || e));
    }
    const url = URL.createObjectURL(new Blob([arr], { type: f.mime || 'application/octet-stream' }));
    let downloadId = null;
    try {
      downloadId = await APIC.downloads.download({ url, filename: f.name, saveAs: false, conflictAction: 'uniquify' });
    } catch (e) {
      // 下载被拦截时仍交给 UI 显示卡片，便于重试
    }
    if (fileSink) { try { fileSink(Object.assign({}, f, { downloadId })); } catch (_) {} }
    return downloadId;
  }

const DEFAULT_BASE = 'http://127.0.0.1:7863/v1';
const DEFAULT_MODEL = 'cn:hy4-preview-f';
const MAX_STEPS = 300;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* 上下文保护：消息过长时保留首条任务描述 + 最近内容，避免 400 把任务打挂 */
function trimMessages(list) {
  const sizeOf = (m) => {
    const c = m && m.content;
    if (typeof c === 'string') return c.length;
    try { return JSON.stringify(c || '').length; } catch (_) { return 0; }
  };
  let total = 0;
  for (const m of list) total += sizeOf(m);
  if (total < 360000) return list;
  const keep = [];
  let cur = 0;
  for (let i = list.length - 1; i >= 0; i--) {
    const sz = sizeOf(list[i]);
    if (cur + sz > 280000 && keep.length > 8) break;
    keep.unshift(list[i]);
    cur += sz;
  }
  // 开头补一条说明，告诉模型前面被截断了
  if (keep.length && keep[0].role === 'user') {
    keep.unshift({ role: 'system', content: '（更早的对话已因长度限制被截断，下面是最近的部分，请基于这些继续。）' });
  }
  return keep;
}


/* ══ CDP 层 ═══════════════════════════════════════════════ */

async function activeTab() {
  const [tab] = await APIC.tabs.query({ active: true, currentWindow: true });
  if (!tab || tab.id == null) throw new Error('找不到当前标签页');
  if (/^(chrome|edge|about|devtools):/i.test(tab.url || '')) {
    throw new Error('无法在浏览器内部页面上操作，请先切到一个普通网页');
  }
  if ((tab.url || '').startsWith('chrome-extension://')) {
    throw new Error('当前标签是扩展自身页面，请切到要操作的网页');
  }
  return tab;
}

async function attachTo(tabId) {
  try {
    await APIC.debugger.attach({ tabId }, '1.3');
  } catch (e) {
    const msg = String(e?.message || e);
    if (/already attached|Another debugger/i.test(msg)) {
      try { await APIC.debugger.detach({ tabId }); } catch (_) {}
      await APIC.debugger.attach({ tabId }, '1.3');
    } else if (/Cannot access|not allowed/i.test(msg)) {
      throw new Error('这个页面受保护，无法附加调试器');
    } else {
      throw new Error('附加调试器失败：' + msg);
    }
  }
  attachedTabId = tabId;
  await APIC.debugger.sendCommand({ tabId }, 'Runtime.enable').catch(() => {});
  await APIC.debugger.sendCommand({ tabId }, 'Page.enable').catch(() => {});
}

async function ensureAttached() {
  const tab = await activeTab();
  if (attachedTabId !== null && attachedTabId !== tab.id) {
    try { await APIC.debugger.detach({ tabId: attachedTabId }); } catch (_) {}
    attachedTabId = null;
  }
  if (attachedTabId !== tab.id) await attachTo(tab.id);
  return tab;
}

async function cdp(method, params = {}, allowRetry = true) {
  const tab = await ensureAttached();
  try {
    return await APIC.debugger.sendCommand({ tabId: tab.id }, method, params);
  } catch (e) {
    const msg = String(e?.message || e);
    if (allowRetry && /detached|target closed|no tab with given id|Cannot find/i.test(msg)) {
      attachedTabId = null;
      await sleep(350);
      const fresh = await activeTab();
      await attachTo(fresh.id);
      return APIC.debugger.sendCommand({ tabId: fresh.id }, method, params);
    }
    throw e;
  }
}

async function evalInPage(expression) {
  const r = await cdp('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
    userGesture: true
  });
  if (r.exceptionDetails) {
    throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text || '页面脚本异常');
  }
  return r.result?.value;
}

/* ══ 页面采集器 ═══════════════════════════════════════════ */

const COLLECT_CORE = `
  const SEL = 'a,button,input,textarea,select,summary,[role="button"],[role="link"],[role="tab"],[role="menuitem"],[contenteditable="true"],[onclick]';
  const out = [], els = [], seen = new Set();
  for (const el of document.querySelectorAll(SEL)) {
    if (out.length >= 150) break;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    if (r.bottom < 0 || r.top > innerHeight) continue;
    const st = getComputedStyle(el);
    if (st.visibility === 'hidden' || st.display === 'none' || st.opacity === '0') continue;
    const raw = el.innerText || el.value || el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.getAttribute('title') || '';
    const label = String(raw).trim().replace(/\\s+/g, ' ').slice(0, 100);
    const key = el.tagName + '|' + label + '|' + Math.round(r.x) + '|' + Math.round(r.y);
    if (seen.has(key)) continue;
    seen.add(key);
    els.push(el);
    out.push({
      i: out.length,
      tag: el.tagName.toLowerCase(),
      label,
      x: Math.round(r.x + r.width / 2),
      y: Math.round(r.y + r.height / 2)
    });
  }
  window.__agentEls = els;
`;

function exprSnapshot() {
  return `(() => {${COLLECT_CORE}
    return { url: location.href, title: document.title, elements: out };
  })()`;
}

function exprPoint(index) {
  return `(() => {
    const els = window.__agentEls || [];
    const el = els[${Number(index) || 0}];
    if (!el || !el.isConnected) return null;
    try { el.scrollIntoView({ block: 'center', inline: 'center' }); } catch (_) {}
    const r = el.getBoundingClientRect();
    return {
      x: Math.round(r.x + r.width / 2),
      y: Math.round(r.y + r.height / 2),
      label: String(el.innerText || el.value || '').trim().slice(0, 60)
    };
  })()`;
}

/* ══ 工具实现 ═════════════════════════════════════════════ */

async function toolSnapshot() {
  const data = await evalInPage(exprSnapshot());
  const lines = (data.elements || []).map((e) => `[${e.i}] <${e.tag}> ${e.label || '(无文本)'}`);
  return [`URL: ${data.url}`, `标题: ${data.title}`, `可交互元素 ${lines.length} 个:`, ...lines].join('\n');
}

async function pointFor({ index, selector } = {}) {
  if (selector) {
    const p = await evalInPage(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return null;
      el.scrollIntoView({ block: 'center', inline: 'center' });
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), label: String(el.innerText || el.value || '').trim().slice(0, 60) };
    })()`);
    if (!p) throw new Error(`选择器没有命中元素：${selector}`);
    return p;
  }
  const p = await evalInPage(exprPoint(index));
  if (!p) throw new Error(`没有序号 ${index} 的元素，请先调用 browser_snapshot`);
  return p;
}

async function toolClick(args) {
  const { x, y, label } = await pointFor(args);
  await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  await sleep(350);
  return { ok: true, clicked: label || `(${x}, ${y})` };
}

async function toolType(args) {
  const { x, y, label } = await pointFor(args);
  await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  await sleep(120);

  if (args.clear) {
    await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'a', code: 'KeyA', modifiers: 4, windowsVirtualKeyCode: 65 });
    await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'a', code: 'KeyA', modifiers: 4, windowsVirtualKeyCode: 65 });
    await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 });
    await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 });
  }

  const text = String(args.text ?? '');
  if (text) await cdp('Input.insertText', { text });
  await sleep(150);

  if (args.submit) {
    await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
    await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
    await sleep(500);
  }

  return { ok: true, into: label || `(${x}, ${y})`, typed: text.length };
}

async function waitForTabLoad(tabId, timeoutMs = 20000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try {
      const t = await APIC.tabs.get(tabId);
      if (t && t.status === 'complete') { await sleep(250); return { ok: true, ms: Date.now() - t0 }; }
    } catch (_) {}
    await sleep(200);
  }
  return { ok: false, ms: Date.now() - t0 };
}

async function toolNavigate(args) {
  let url = String(args.url || '').trim();
  if (!url) throw new Error('缺少 url');
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

  const tab = await activeTab();

  // 导航会让 CDP 会话失效，先主动断开，改用 tabs API 跳转
  if (attachedTabId !== null) {
    try { await APIC.debugger.detach({ tabId: attachedTabId }); } catch (_) {}
    attachedTabId = null;
  }

  await APIC.tabs.update(tab.id, { url });
  const loaded = await waitForTabLoad(tab.id);
  await attachTo(tab.id);

  const info = await evalInPage('({ url: location.href, title: document.title })')
    .catch(() => ({ url, title: '' }));

  if (String(info.url).startsWith('chrome-error://')) {
    throw new Error(`页面加载失败：${url}（网络不可达或被拦截）`);
  }

  return { ok: true, url: info.url, title: info.title, loadMs: loaded.ms, loaded: loaded.ok };
}

async function toolGetText(args) {
  const limit = Math.min(Number(args.maxChars) || 3000, 8000);
  const text = await evalInPage(`(() => {
    const el = document.querySelector('main, article, [role="main"], #content, .content') || document.body;
    return String(el.innerText || '').replace(/\\s+\\n/g, '\\n').trim();
  })()`);
  const s = String(text || '');
  return s.slice(0, limit) + (s.length > limit ? `\n…（已截断，原文 ${s.length} 字）` : '');
}

async function toolEvaluate(args) {
  const v = await evalInPage(String(args.expression || 'undefined'));
  const s = typeof v === 'string' ? v : JSON.stringify(v);
  return String(s ?? '').slice(0, 4000);
}

async function toolScreenshot() {
  const r = await cdp('Page.captureScreenshot', { format: 'jpeg', quality: 55 });
  lastShot = 'data:image/jpeg;base64,' + r.data;
  return { ok: true, image: lastShot, note: '截图已展示给用户' };
}

async function toolGenerateImage(args) {
  const prompt = String(args.prompt || '').trim();
  if (!prompt) throw new Error('缺少 prompt');
  const size = String(args.size || '1024x1024');
  const n = Math.min(Math.max(Number(args.n) || 1, 1), 4);
  const { apiKey, baseUrl } = await readConf();
  if (!apiKey) throw new Error('还没填 API Key，点 ⚙ 配置提供商');
  setStatus('生成图片中…（约 15 秒）');
  try {
    const res = await fetch(String(baseUrl).replace(/\/+$/, '') + '/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
      body: JSON.stringify({ model: 'hunyuan-image-v3.0', prompt, size, n })
    });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      throw new Error('网关 ' + res.status + '：' + t.slice(0, 240));
    }
    const j = await res.json();
    const item = (j.data || [])[0];
    if (!item) throw new Error('网关没有返回图片');
    const url = item.url || (item.b64_json ? 'data:image/png;base64,' + item.b64_json : '');
    if (!url) throw new Error('图片地址为空');
    return {
      ok: true,
      image: url,
      revised_prompt: item.revised_prompt || '',
      note: '图片已生成，显示在对话下方；也可用 image 字段引用'
    };
  } finally {
    setStatus('');
  }
}

const TOOLS = [
  { type: 'function', function: {
    name: 'browser_snapshot',
    description: '获取当前页面的可交互元素列表（链接/按钮/输入框等），每个元素带序号 index 与文本。点击或输入前必须先调用它。',
    parameters: { type: 'object', properties: {}, required: [] }
  }},
  { type: 'function', function: {
    name: 'browser_click',
    description: '点击页面元素。用 browser_snapshot 返回的 index，或直接给 CSS selector。',
    parameters: { type: 'object', properties: {
      index: { type: 'number', description: 'snapshot 里的元素序号' },
      selector: { type: 'string', description: 'CSS 选择器，优先用它做精确点击' }
    }, required: [] }
  }},
  { type: 'function', function: {
    name: 'browser_type',
    description: '在输入框中键入文本。可选 clear 先清空，submit 键入后按回车。',
    parameters: { type: 'object', properties: {
      index: { type: 'number' },
      selector: { type: 'string' },
      text: { type: 'string' },
      clear: { type: 'boolean' },
      submit: { type: 'boolean' }
    }, required: ['text'] }
  }},
  { type: 'function', function: {
    name: 'browser_navigate',
    description: '在当前标签页打开一个网址。',
    parameters: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] }
  }},
  { type: 'function', function: {
    name: 'browser_get_text',
    description: '读取当前页面的正文纯文本，用于阅读和总结内容。',
    parameters: { type: 'object', properties: { maxChars: { type: 'number' } }, required: [] }
  }},
  { type: 'function', function: {
    name: 'browser_evaluate',
    description: '在页面上下文执行一段 JavaScript 表达式并返回结果。',
    parameters: { type: 'object', properties: { expression: { type: 'string' } }, required: ['expression'] }
  }},
  { type: 'function', function: {
    name: 'browser_screenshot',
    description: '对当前页面截图并展示给用户。',
    parameters: { type: 'object', properties: {}, required: [] }
  }},
  { type: 'function', function: {
    name: 'generate_image',
    description: '文生图：根据文字描述生成一张真实图片。当用户要求画图、生成图片、出图、设计海报/插画/头像等视觉素材时调用。生成约需 15 秒。',
    parameters: { type: 'object', properties: {
      prompt: { type: 'string', description: '画面描述：主体、场景、风格、构图、光线、颜色，越具体越好' },
      size: { type: 'string', enum: ['1024x1024', '1024x1536', '1536x1024'], description: '图片尺寸，默认 1024x1024' },
      n: { type: 'number', description: '生成张数，默认 1，最多 4' }
    }, required: ['prompt'] }
  }},
  { type: 'function', function: {
    name: 'save_js',
    description: '把生成的 JavaScript 代码保存为 .js 文件并下载。用户要求生成脚本或代码文件时必须使用它。文件很长时用 append/finish 分多段写，否则单次输出上限会把代码截断。',
    parameters: { type: 'object', properties: {
      filename: { type: 'string', description: '文件名，默认 script.js' },
      code: { type: 'string', description: '本段 JavaScript 代码（append 模式只传新增部分）' },
      append: { type: 'boolean', description: '为 true 时把 code 追加进同名草稿（不立即下载），用于分段写长文件' },
      finish: { type: 'boolean', description: '为 true 时合并之前追加的草稿并下载（最后一段用）' }
    }, required: ['code'] }
  }}
];

const TOOL_IMPL = {
  browser_snapshot: toolSnapshot,
  browser_click: toolClick,
  browser_type: toolType,
  browser_navigate: toolNavigate,
  browser_get_text: toolGetText,
  browser_evaluate: toolEvaluate,
  save_js: toolSaveJs,
  browser_screenshot: toolScreenshot,
  generate_image: toolGenerateImage
};

/* ══ LLM ══════════════════════════════════════════════════ */

const DEFAULT_PROVIDER = { id: 'workbuddy', name: 'WorkBuddy 本机网关', baseUrl: DEFAULT_BASE, apiKey: '', protocol: 'openai' };
const uid = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function loadProviders() {
  const s = await APIC.storage.local.get(['providers', 'activeProvider', 'apiKey', 'baseUrl', 'model']);
  let list = Array.isArray(s.providers) ? s.providers.filter(Boolean) : [];
  if (!list.length) {
    list = [Object.assign({}, DEFAULT_PROVIDER, { apiKey: s.apiKey || '', baseUrl: s.baseUrl || DEFAULT_BASE })];
  }
  list = list.map((p) => ({
    id: p.id || uid(),
    name: p.name || '未命名提供商',
    baseUrl: p.baseUrl || DEFAULT_BASE,
    apiKey: p.apiKey || '',
    protocol: p.protocol || 'openai',
    model: p.model || s.model || DEFAULT_MODEL
  }));
  const active = s.activeProvider && list.some((p) => p.id === s.activeProvider) ? s.activeProvider : list[0].id;
  return { list, active };
}

async function readConf() {
  const { list, active } = await loadProviders();
  const p = list.find((x) => x.id === active) || list[0];
  const s = await APIC.storage.local.get('model');
  return {
    apiKey: p.apiKey,
    model: p.model || DEFAULT_MODEL,
    baseUrl: (p.baseUrl || DEFAULT_BASE).replace(/\/+$/, ''),
    provider: p
  };
}

function wireMessages() {
  return messages.filter((m) => m.role !== 'file').map((m) => {
    const out = { role: m.role };
    if (m.content != null) out.content = m.content;
    if (m.tool_calls) out.tool_calls = m.tool_calls;
    if (m.tool_call_id) out.tool_call_id = m.tool_call_id;
    return out;
  });
}

const SYSTEM_PROMPT = [
  'You are Yuze-agent, an AI agent living in a Chrome side panel.',
  'Modes: "ask" = pure chat, no tools. "task" = you may control the page and generate files.',
  'In task mode, when the user asks for a PDF/PPT/Excel/Word file, you MUST call the matching tool',
  '(mcp_gen_pdf / mcp_gen_pptx / mcp_gen_xlsx / mcp_gen_docx) and produce the file.',
  'Do NOT substitute navigation, screenshots or pasted text for file generation.',
  'If a needed tool is missing or fails, say so explicitly and stop instead of retrying the same step.',
  'Never end a turn with thinking only: if you plan to produce a file, call save_js (or the matching tool) in the same turn.',
  'If the file is very long, write it in parts: several save_js({filename, code, append:true}) calls, then save_js({filename, code:"", finish:true}) to merge and download. Never skip the file because it is long.',
  'You may think in stages: spending one turn on thinking + part 1 is fine, then continue with part 2 in the next turn. Do not attempt to finish everything in a single turn if it would exceed the output limit.',
  'Keep replies in the user\'s language (usually Simplified Chinese).'
].join(' ');

async function callLLM(onDelta) {
  const { apiKey, model, baseUrl } = await readConf();
  if (!apiKey) throw new Error('还没填 API Key，点右上角 ⚙');

  const ctrl = new AbortController();
  abortCtrl = ctrl;
  let idleTimer = null;
  let idleHit = false;
  let hardHit = false;
  // 首字节给 45 秒（多数模型的首 token 在这之内），之后按 120 秒续命；
  // 只有真实 token 续命，心跳不算——否则会一直「思考中」永不超时。
  const bumpIdle = (ms = 120000) => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { idleHit = true; try { ctrl.abort(); } catch (_) {} }, ms);
  };
  bumpIdle(45000);
  const hardTimer = setTimeout(() => { hardHit = true; try { ctrl.abort(); } catch (_) {} }, 600000);
  const allTools = agentMode === 'ask' ? [] : TOOLS.concat(mcpTools);

  let res;
  try {
    res = await fetch(baseUrl + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
      body: JSON.stringify(Object.assign({
        model,
        messages: (() => {
          let wm = wireMessages();
          wm = trimMessages(wm);
          if (agentMode !== 'ask') wm.unshift({ role: 'system', content: SYSTEM_PROMPT });
          return wm;
        })(),
        temperature: 0.2,
        // 不设 max_tokens 时网关默认很小，长思考会把额度吃光、正文直接被截断，
        // 表现就是「思考完没正文就结束」。这里显式要一个够大的额度。
        max_tokens: 16000,
        stream: true
      }, allTools.length ? { tools: allTools, tool_choice: 'auto' } : {})),
      signal: ctrl.signal
    });
  } catch (e) {
    if (e.name === 'AbortError') {
      if (stopRequested) throw new Error('已停止');
      throw new Error(idleHit ? '模型长时间没有输出，已中断（可重试）' : hardHit ? '单轮请求超过 10 分钟，已中断' : '请求被中断');
    }
    throw new Error('连不上模型网关：' + (e.message || e));
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    clearTimeout(idleTimer);
    clearTimeout(hardTimer);
    abortCtrl = null;
    throw new Error(`网关返回 ${res.status}：${body.slice(0, 400)}`);
  }

  const out = { role: 'assistant', content: '', reasoning: '', tool_calls: [] };
  const calls = [];

  const handleLine = (line) => {
    line = line.trim();
    if (!line.startsWith('data:')) return;
    const payload = line.slice(5).trim();
    if (!payload || payload === '[DONE]') return;
    let j;
    try { j = JSON.parse(payload); } catch (_) { return; }
    const choice = j.choices && j.choices[0];
    if (choice && choice.finish_reason) out._finish = choice.finish_reason;
    const delta = choice && choice.delta;
    if (!delta) return;
    let touched = false;
    if (delta.reasoning_content) { out.reasoning += delta.reasoning_content; touched = true; }
    if (delta.content) { out.content += delta.content; touched = true; }
    if (delta.tool_calls) {
      for (const tc of delta.tool_calls) {
        const i = tc.index || 0;
        if (!calls[i]) calls[i] = { id: '', type: 'function', function: { name: '', arguments: '' } };
        if (tc.id) calls[i].id = tc.id;
        if (tc.function && tc.function.name) calls[i].function.name += tc.function.name;
        if (tc.function && tc.function.arguments) calls[i].function.arguments += tc.function.arguments;
      }
    }
    // 只有真正收到 token 才续命：心跳或空 delta 也续命的话，
    // 「思考中」会永不超时（用户看到的就是一直卡着）。
    if (touched) {
      bumpIdle();
      if (onDelta) onDelta(out);
    }
  };

  try {
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      // 这里不能续命：心跳和空 delta 也会走到，会让「思考中」永不超时；
      // 续命统一由 handleLine 在收到真实 token 时做。
      buf += dec.decode(value, { stream: true });
      let at;
      while ((at = buf.indexOf('\n')) >= 0) {
        handleLine(buf.slice(0, at));
        buf = buf.slice(at + 1);
      }
    }
    if (buf.trim()) handleLine(buf);
  } catch (e) {
    if (e.name === 'AbortError') {
      if (stopRequested) throw new Error('已停止');
      const hint = idleHit ? '模型长时间没有输出，已中断（可重试）' : hardHit ? '单轮请求超过 10 分钟，已中断' : '流式读取中断（可重试）';
      if (out.content || out.reasoning) {
        out._interrupted = true;
        out.content = (out.content || '') + '\n\n> ⚠️ ' + hint + '。上面已生成的内容已保留，可直接再发一条消息继续。';
        return out;
      }
      throw new Error(hint);
    }
    throw new Error('流式读取失败：' + (e.message || e));
  } finally {
    clearTimeout(idleTimer);
    clearTimeout(hardTimer);
    abortCtrl = null;
  }

  const finals = calls.filter(Boolean).map((c) => {
    if (!c.id) c.id = 'call_' + Math.random().toString(36).slice(2, 8);
    return c;
  });
  if (finals.length) out.tool_calls = finals;
  if (!out.content && !out.reasoning && !finals.length) throw new Error('模型没有返回内容');
  return out;
}

/* ══ Agent 循环 ═══════════════════════════════════════════ */

function parseArgs(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw); } catch (_) { return {}; }
}

function friendlyError(raw) {
  const s = String(raw || '');
  const jsonPart = s.replace(/^网关返回 \d+：/, '');
  try {
    const j = JSON.parse(jsonPart);
    if (j?.error?.code === 'invalid_api_key') {
      return 'API Key 无效或没填对。点右上角 ⚙ 重新粘贴一次。';
    }
    if (j?.error?.message) return j.error.message;
  } catch (_) {}
  return s;
}

function pushError(text) {
  const clean = '⚠️ ' + friendlyError(text);
  if (errorSink) { try { errorSink(clean); } catch (_) {} }
}

async function toolSaveJs({ filename, code, append, finish }) {
  const raw = String(filename || '').trim() || 'script.js';
  const safe = raw.replace(/[\\/:*?"<>|]/g, '_');
  const name = /\.js$/i.test(safe) ? safe : safe + '.js';
  const text = String(code || '');
  const draftKey = '__draft:' + name;
  // 分段写：长文件一次输出必然被模型上限截断，先 append 攒草稿，最后一次 finish 合并下载
  if (append) {
    const prev = (await APIC.storage.local.get(draftKey))[draftKey] || '';
    const next = prev + text;
    await APIC.storage.local.set({ [draftKey]: next });
    return '已追加到草稿 ' + name + '：本段 ' + text.length + ' 字符，累计 ' + next.length + ' 字符。继续 append，写完后用 finish:true 合并下载。';
  }
  let full = text;
  if (finish) {
    const prev = (await APIC.storage.local.get(draftKey))[draftKey] || '';
    full = prev + text;
    await APIC.storage.local.remove(draftKey);
  }
  // 转 base64（中文安全），走统一的文件卡片与下载链路
  const b64 = btoa(unescape(encodeURIComponent(full)));
  try {
    await addFileCard({ name, mime: 'text/javascript', size: full.length, b64 });
    return '已生成并下载 ' + name + '（' + full.length + ' 字符）';
  } catch (e) {
    return '已生成 ' + name + '（' + text.length + ' 字符），但下载被浏览器拦截：' + (e?.message || e) + '。可在「生成的文件」卡片里点下载重试。';
  }
}

async function runTool(name, args) {
  if (String(name).startsWith('mcp_')) {
    const t = mcpTools.find((x) => x.function.name === name);
    if (!t) return { error: 'MCP 工具不存在: ' + name };
    try {
      const r = await mcpRpc(t._mcp.server, 'tools/call', { name: t._mcp.name, arguments: args || {} });
      if (r.error) return { error: r.error.message || 'MCP 调用失败' };
      const content = r.result?.content || [];
      const texts = content.map((c) => c.text || '').filter(Boolean);
      const fileLine = texts.find((t) => t.startsWith('FILE_JSON:'));
      if (fileLine) {
        const f = JSON.parse(fileLine.slice(10));
        const human = texts.find((t) => !t.startsWith('FILE_JSON:')) || `已生成 ${f.name}`;
        try {
          await addFileCard(f);
        } catch (e) {
          return { error: '文件已生成，但下载失败：' + (e?.message || e) };
        }
        return human;
      }
      return texts.join('\n') || '(空结果)';
    } catch (e) {
      return { error: String(e.message || e) };
    }
  }
  const fn = TOOL_IMPL[name];
  if (!fn) return { error: '未知工具: ' + name };
  try {
    return await fn(args || {});
  } catch (e) {
    return { error: String(e?.message || e) };
  }
}

async function mcpRpc(server, method, params = {}) {
  const url = typeof server === 'string' ? server : server.url;
  const id = mcpSeq++;
  const body = { jsonrpc: '2.0', id, method, params };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  let r;
  try {
    r = await fetch(url, {
      method: 'POST',
      headers: mcpHeaderObject(typeof server === 'string' ? null : server),
      body: JSON.stringify(body),
      signal: ctrl.signal
    });
  } catch (e) {
    clearTimeout(timer);
    if (e && e.name === 'AbortError') throw new Error('MCP 连接超时（8 秒）：' + url);
    throw e;
  }
  clearTimeout(timer);
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const ct = r.headers.get('content-type') || '';
  const txt = await r.text();
  if (ct.includes('text/event-stream')) {
    for (const line of txt.split('\n')) {
      if (!line.startsWith('data:')) continue;
      try {
        const j = JSON.parse(line.slice(5).trim());
        if (j.id === id) return j;
      } catch (_) {}
    }
    throw new Error('SSE 流里没找到响应');
  }
  return JSON.parse(txt);
}

async function connectMcp(server) {
  await mcpRpc(server, 'initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'Yuze-agent', version: '0.5' }
  });
  const list = await mcpRpc(server, 'tools/list', {});
  const seen = new Set();
  return (list.result?.tools || []).map((t) => {
    const slug = String(t.name).replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 60) || 'tool';
    let fn = 'mcp_' + slug;
    let k = 2;
    while (seen.has(fn)) fn = 'mcp_' + slug + '_' + k++;
    seen.add(fn);
    return {
      type: 'function',
      function: {
        name: fn,
        description: String(t.description || '').slice(0, 220),
        parameters: t.inputSchema || { type: 'object', properties: {} }
      },
      _mcp: { server, name: t.name }
    };
  });
}

  return {
    DEFAULT_BASE, DEFAULT_MODEL, MAX_STEPS, sleep,
    activeTab, attachTo, ensureAttached, cdp, evalInPage,
    TOOLS, TOOL_IMPL, callLLM, parseArgs, runTool, readConf,
    toolScreenshot, toolSnapshot, toolGetText, toolEvaluate,
    SYSTEM_PROMPT, mcpRpc, connectMcp,
    setServers(list) { mcpServers = Array.isArray(list) ? list : []; },
    getServers() { return mcpServers; },
    setTools(list) { mcpTools = Array.isArray(list) ? list : []; },
    getTools() { return mcpTools; },
    setAbort(ctrl) { abortCtrl = ctrl; },
    abort() { try { abortCtrl?.abort(); } catch (_) {} },
    setStatusSink(fn) { statusSink = fn; },
    setFileSink(fn) { fileSink = fn; },
    setErrorSink(fn) { errorSink = fn; },
    setMode(m) { agentMode = m === 'ask' ? 'ask' : 'task'; },
    get mode() { return agentMode; },
    requestStop() { stopRequested = true; },
    clearStop() { stopRequested = false; },
    get stopped() { return stopRequested; }
  };
})();
