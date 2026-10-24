/**
 * Chrome Agent — side panel agent loop
 *
 * 用户输入 → LLM（OpenAI 兼容，本机网关）→ tool_calls → CDP 操作页面 → 结果回填 → 循环
 * 浏览器操控走 chrome.debugger（原生 CDP），不需要 Playwright，也不需要调试端口。
 */

const DEFAULT_BASE = 'http://127.0.0.1:7863/v1';
// 实测（双题目 × 4 次采样）：hy4-preview-f 不传档位时思考约 3400 字，
// 明显长于 deepseek-v4-flash 的约 600 字，故默认仍留在 hy4-preview-f。
const DEFAULT_MODEL = 'cn:hy4-preview-f';
const DEFAULT_IMAGE_MODEL = 'hunyuan-image-v3.0';
// 生图模型预设；网关目前实测只认 hunyuan-image-v3.0，其余保留以便网关后续放开时直接可填
const IMAGE_MODEL_PRESETS = [
  'hunyuan-image-v3.0',
  'hunyuan-image-v2.0',
  'gpt-image-1',
  'dall-e-3',
  'flux-kontext-pro',
  'seedream-4.0',
  'qwen-image'
];
const EFFORT_LABEL = { low: '低 · 快', medium: '中', high: '高 · 深', xhigh: '超高 · 最深', max: '最大' };
const MAX_STEPS = 300;

const $ = (id) => document.getElementById(id);
const chatEl = $('chat');
const inpMsg = $('inpMsg');
const findBarEl = $('findBar');
const inpFindEl = $('inpFind');
const findCountEl = $('findCount');
const btnFindEl = $('btnFind');
const btnSend = $('btnSend');
const statusDot = $('statusDot');
const statusEl = $('statusLine');
const settingsEl = $('settings');
const modelTag = $('modelTag');
const btnHistory = $('btnHistory');
const btnNew = $('btnNew');
const btnQuote = $('btnQuote');
const btnShot = $('btnShot');
const btnSkill = $('btnSkill');
const btnMcp = $('btnMcp');
const drawerEl = $('drawer');
const scrimEl = $('scrim');
const sessionListEl = $('sessionList');
const inpSearch = $('inpSearch');
const modelMenu = $('modelMenu');
const skillMenu = $('skillMenu');
const quoteMenu = $('quoteMenu');
const provList = $('provList');

let messages = [];
let running = false;
let attachedTabId = null;
let lastShot = null;
const ctxComp = { pending: '' }; // 上下文压缩摘要缓存（本轮请求用）
let abortCtrl = null;          // 当前请求的 AbortController
let stopRequested = false;     // 用户主动停止
let sessionId = Date.now().toString(36);
let mcpTools = [];             // 从 MCP 服务器拉来的工具
let agentMode = 'task';        // 'ask' 问答（不调工具） | 'task' 任务（可操作网页）
let mcpServers = [];           // [{name,url,headers}] MCP 服务器列表
let modelIds = [];             // 网关返回的模型 id 列表
let modelMeta = {};            // 模型 id -> {efforts:[], canDisable:bool} 由 /v1/models 元数据填充

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* 上下文保护：消息过长时保留首条任务描述 + 最近内容，避免 400 把任务打挂 */
function trimMessages(list, compSummary) {
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
  // 这一步是否真的丢掉了头部消息（下面的结构修剪另算）
  const droppedBySize = keep.length < list.length;
  // 上下文自动压缩：被截掉的旧轮次若已有摘要，用摘要替代「已截断」提示，
  // 模型仍能看得到早期脉络（摘要由后台压缩任务生成，一次生成反复使用）
  const head = [];
  if (droppedBySize || keep.length < list.length) {
    head.push({ role: 'system', content: compSummary
      ? '（更早的对话已压缩为以下摘要：\n' + compSummary + '\n——摘要之后的对话见后续消息。）'
      : '（更早的对话已因长度限制被截断。用户的原始任务见下一条消息，请基于它继续，不要说没收到任务。）' });
  }
  const firstUser = list.find((m) => m && m.role === 'user');
  if (firstUser && !keep.includes(firstUser)) head.push(firstUser);
  return head.length ? head.concat(keep) : keep;
}

// ── 上下文自动压缩：总字数超阈值时把尾部保留窗口之外的旧消息摘要化 ──
let compCache = { fingerprint: '', summary: '' };
async function compressContextIfNeeded(wire) {
  const sizeOf = (m) => {
    const c = m && m.content;
    if (typeof c === 'string') return c.length;
    try { return JSON.stringify(c || '').length; } catch (_) { return 0; }
  };
  let total = 0;
  for (const m of wire) total += sizeOf(m);
  if (total < 360000) return '';
  // 指纹：消息条数+总长，没变就复用上次的摘要（同一轮任务反复调用不重复算）
  const fp = wire.length + ':' + total;
  if (compCache.fingerprint === fp && compCache.summary) return compCache.summary;
  // 取尾部保留窗口之外的部分做摘要源（与 trimMessages 同一分割逻辑）
  const keep = [];
  let cur = 0;
  for (let i = wire.length - 1; i >= 0; i--) {
    const sz = sizeOf(wire[i]);
    if (cur + sz > 280000 && keep.length > 8) break;
    keep.unshift(wire[i]);
    cur += sz;
  }
  const dropped = wire.slice(0, wire.length - keep.length);
  if (!dropped.length) return '';
  const text = dropped.map((m) => (m.role === 'assistant' && Array.isArray(m.tool_calls)
    ? '[assistant 调用工具: ' + m.tool_calls.map((t) => t.function?.name).join(', ') + ']'
    : '[' + m.role + '] ' + String(m.content == null ? '' : m.content).replace(/\s+/g, ' '))).join('\n').slice(0, 60000);
  try {
    const { apiKey, baseUrl, model } = await readConf();
    if (!apiKey) return '';
    const res = await fetch(String(baseUrl).replace(/\/+$/, '') + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: '把下面的对话历史压缩成简明摘要（800字以内），保留：用户的任务目标、已完成的步骤与结果、关键决定、尚未完成的部分。直接输出摘要正文，不要客套。' },
          { role: 'user', content: text }
        ],
        max_tokens: 2000
      })
    });
    if (!res.ok) return '';
    const j = await res.json();
    const s = String(j.choices?.[0]?.message?.content || '').trim();
    if (!s) return '';
    compCache = { fingerprint: fp, summary: s };
    return s;
  } catch (_) { return ''; }
}


/* ══ CDP 层 ═══════════════════════════════════════════════ */

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
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
    await chrome.debugger.attach({ tabId }, '1.3');
  } catch (e) {
    const msg = String(e?.message || e);
    if (/already attached|Another debugger/i.test(msg)) {
      try { await chrome.debugger.detach({ tabId }); } catch (_) {}
      await chrome.debugger.attach({ tabId }, '1.3');
    } else if (/Cannot access|not allowed/i.test(msg)) {
      throw new Error('这个页面受保护，无法附加调试器');
    } else {
      throw new Error('附加调试器失败：' + msg);
    }
  }
  attachedTabId = tabId;
  await chrome.debugger.sendCommand({ tabId }, 'Runtime.enable').catch(() => {});
  await chrome.debugger.sendCommand({ tabId }, 'Page.enable').catch(() => {});
}

async function ensureAttached() {
  const tab = await activeTab();
  if (attachedTabId !== null && attachedTabId !== tab.id) {
    try { await chrome.debugger.detach({ tabId: attachedTabId }); } catch (_) {}
    attachedTabId = null;
  }
  if (attachedTabId !== tab.id) await attachTo(tab.id);
  return tab;
}

async function cdp(method, params = {}, allowRetry = true) {
  const tab = await ensureAttached();
  try {
    return await chrome.debugger.sendCommand({ tabId: tab.id }, method, params);
  } catch (e) {
    const msg = String(e?.message || e);
    if (allowRetry && /detached|target closed|no tab with given id|Cannot find/i.test(msg)) {
      attachedTabId = null;
      await sleep(350);
      const fresh = await activeTab();
      await attachTo(fresh.id);
      return chrome.debugger.sendCommand({ tabId: fresh.id }, method, params);
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

function waitForTabLoad(tabId, timeoutMs = 20000) {
  return new Promise((resolve) => {
    let done = false;
    const t0 = Date.now();
    const finish = (ok) => {
      if (done) return;
      done = true;
      chrome.tabs.onUpdated.removeListener(onUpd);
      clearTimeout(timer);
      resolve({ ok, ms: Date.now() - t0 });
    };
    const onUpd = (id, info) => { if (id === tabId && info.status === 'complete') finish(true); };
    chrome.tabs.onUpdated.addListener(onUpd);
    const timer = setTimeout(() => finish(false), timeoutMs);
    chrome.tabs.get(tabId)
      .then((t) => { if (t.status === 'complete') setTimeout(() => finish(true), 250); })
      .catch(() => {});
  });
}

async function toolNavigate(args) {
  let url = String(args.url || '').trim();
  if (!url) throw new Error('缺少 url');
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

  const tab = await activeTab();

  // 导航会让 CDP 会话失效，先主动断开，改用 tabs API 跳转
  if (attachedTabId !== null) {
    try { await chrome.debugger.detach({ tabId: attachedTabId }); } catch (_) {}
    attachedTabId = null;
  }

  await chrome.tabs.update(tab.id, { url });
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

async function fetchImgModels() {
  const { apiKey, baseUrl, imgBaseUrl, imgKey } = await readConf();
  const base = (imgBaseUrl || baseUrl).replace(/\/+$/, '');
  const key = imgBaseUrl ? (imgKey || apiKey) : apiKey;
  const res = await fetch(base + '/models', { headers: { Authorization: 'Bearer ' + key } });
  if (!res.ok) throw new Error('获取模型列表失败：' + res.status);
  const j = await res.json();
  const ids = (j.data || []).map((m) => m.id).filter(Boolean);
  const dl = document.getElementById('imageModelPresets');
  if (dl) {
    dl.innerHTML = '';
    for (const id of ids) {
      const o = document.createElement('option');
      o.value = id;
      dl.appendChild(o);
    }
  }
  return ids;
}

async function toolGenerateImage(args) {
  const prompt = String(args.prompt || '').trim();
  if (!prompt) throw new Error('缺少 prompt');
  const size = String(args.size || '1024x1024');
  const n = Math.min(Math.max(Number(args.n) || 1, 1), 4);
  const { apiKey, baseUrl, imageModel, imgBaseUrl, imgKey } = await readConf();
  const gwBase = imgBaseUrl || baseUrl;
  const gwKey = imgBaseUrl ? (imgKey || apiKey) : apiKey;
  if (!gwKey) throw new Error('还没填 API Key，点 ⚙ 配置提供商');
  setStatus('生成图片中…（' + imageModel + '，约 15 秒）');
  try {
    const res = await fetch(gwBase + '/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + gwKey },
      body: JSON.stringify({ model: imageModel, prompt, size, n })
    });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      // 网关对不认识的生图模型回 400 + 上游文案，这里补一句可操作提示
      throw new Error('生图失败（' + imageModel + '）网关 ' + res.status + '：' + t.slice(0, 240)
        + (res.status === 400 ? '\n该模型可能不被网关支持，可在设置里换一个生图模型。' : ''));
    }
    const j = await res.json();
    const item = (j.data || [])[0];
    if (!item) throw new Error('网关没有返回图片');
    const url = item.url || (item.b64_json ? 'data:image/png;base64,' + item.b64_json : '');
    if (!url) throw new Error('图片地址为空');
    // 立刻转 dataURL：网关给的多是临时链接，过期后历史会话里就只剩裂图
    let image = url;
    if (!/^data:image\//.test(url)) {
      try {
        const r2 = await fetch(url);
        const b = await r2.blob();
        if (b && b.size <= 3 * 1024 * 1024) {
          image = await new Promise((res, rej) => {
            const fr = new FileReader();
            fr.onload = () => res(String(fr.result));
            fr.onerror = rej;
            fr.readAsDataURL(b);
          });
        }
      } catch (_) { /* 取不到就退回原链接 */ }
    }
    return {
      ok: true,
      image,
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
    description: '把生成的 JavaScript 代码保存为 .js 文件，并在对话里插入可下载的文件卡片（不会自动下载，由用户点卡片保存）。用户要求生成脚本或代码文件时必须使用它。文件很长时用 append/finish 分多段写，否则单次输出上限会把代码截断。',
    parameters: { type: 'object', properties: {
      filename: { type: 'string', description: '文件名，默认 script.js' },
      code: { type: 'string', description: '本段 JavaScript 代码（append 模式只传新增部分）' },
      append: { type: 'boolean', description: '为 true 时把 code 追加进同名草稿（不立即出卡片），用于分段写长文件' },
      finish: { type: 'boolean', description: '为 true 时合并之前追加的草稿并生成文件卡片（最后一段用）' }
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
  const s = await chrome.storage.local.get(['providers', 'activeProvider', 'apiKey', 'baseUrl', 'model']);
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
  const s = await chrome.storage.local.get(['model', 'reasoningEffort', 'imageModel', 'imgBase', 'imgKey']);
  return {
    apiKey: p.apiKey,
    model: p.model || DEFAULT_MODEL,
    baseUrl: (p.baseUrl || DEFAULT_BASE).replace(/\/+$/, ''),
    // 空串表示「跟随模型默认」，此时不向网关传该字段
    reasoningEffort: String(s.reasoningEffort || ''),
    imageModel: String(s.imageModel || DEFAULT_IMAGE_MODEL),
    // 生图专属网关/Key：留空则回落聊天网关与聊天 Key
    imgBaseUrl: String(s.imgBase || '').trim().replace(/\/+$/, ''),
    imgKey: String(s.imgKey || '').trim(),
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
  'When the user asks to generate/draw an image (生成图片/画一张/画图/头像/海报等), you MUST call generate_image in that same turn with a complete prompt. Never reply with only text claiming the image exists — an image only exists after the tool call returns it.',
  'If the user message includes a screenshot or quoted page content, treat it as CONTEXT ONLY. Do what the user message text literally asks. Do not start analyzing or fixing whatever is shown in the screenshot unless the user text explicitly asks for that. E.g. text "生成柴犬图片" means: call generate_image for a shiba dog — not to inspect the screenshot.',
  'If the file is very long, write it in parts: several save_js({filename, code, append:true}) calls, then save_js({filename, code:"", finish:true}) to merge and produce the file card. Never skip the file because it is long.',
  'You may think in stages: spending one turn on thinking + part 1 is fine, then continue with part 2 in the next turn. Do not attempt to finish everything in a single turn if it would exceed the output limit.',
  'Keep replies in the user\'s language (usually Simplified Chinese).'
].join(' ');

async function callLLM(onDelta) {
  const { apiKey, model, baseUrl, reasoningEffort } = await readConf();
  if (!apiKey) throw new Error('还没填 API Key，点右上角 ⚙');
  // 上下文自动压缩：本轮开始前若历史超阈值，后台生成旧轮次摘要并缓存
  try { ctxComp.pending = await compressContextIfNeeded(wireMessages()); } catch (_) { ctxComp.pending = ''; }
  // 记忆模块：把长期记忆注入系统提示（ask/task 都注入）
  const memText = await getMemoryPrompt().catch(() => '');
  // 思考强度：只在网关元数据确认该模型支持这一档时才下发。
  // 传了不支持的档位网关不会报错，而是静默降级成很短的思考——比不传更糟。
  let effort = '';
  if (reasoningEffort) {
    const meta = modelMeta[model];
    if (!meta || !meta.efforts.length) {
      if (!modelIds.length) await fetchModels();
    }
    const m2 = modelMeta[model];
    if (m2 && m2.efforts.includes(reasoningEffort)) effort = reasoningEffort;
  }

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
    const sysParts = [SYSTEM_PROMPT];
    if (agentMode !== 'ask') sysParts.push('You are in TASK mode: tools are available. In ask mode no tools are offered.');
    if (memText) sysParts.push('【长期记忆】以下是你在过往对话中记住的用户事实与偏好，相关时自然运用，无关时忽略：\n' + memText);
    res = await fetch(baseUrl + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
      body: JSON.stringify(Object.assign({
        model,
        messages: (() => {
          let wm = wireMessages();
          wm = trimMessages(wm, ctxComp.pending);
          wm.unshift({ role: 'system', content: sysParts.join('\n\n') });
          return wm;
        })(),
        temperature: 0.2,
        // 不设 max_tokens 时网关默认很小，长思考会把额度吃光、正文直接被截断，
        // 表现就是「思考完没正文就结束」。这里显式要一个够大的额度。
        max_tokens: 16000,
        stream: true
      }, effort ? { reasoning_effort: effort } : {}, allTools.length ? { tools: allTools, tool_choice: 'auto' } : {})),
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
  const last = messages[messages.length - 1];
  if (last && last.role === 'assistant' && last._err === clean) {
    last._repeat = (last._repeat || 1) + 1;
    return;
  }
  messages.push({ role: 'assistant', content: clean, _err: clean, _repeat: 1 });
}

async function toolSaveJs({ filename, code, append, finish }) {
  const raw = String(filename || '').trim() || 'script.js';
  const safe = raw.replace(/[\\/:*?"<>|]/g, '_');
  const name = /\.js$/i.test(safe) ? safe : safe + '.js';
  const text = String(code || '');
  const draftKey = '__draft:' + name;
  // 分段写：长文件一次输出必然被模型上限截断，先 append 攒草稿，最后一次 finish 合并下载
  if (append) {
    const prev = (await chrome.storage.local.get(draftKey))[draftKey] || '';
    const next = prev + text;
    await chrome.storage.local.set({ [draftKey]: next });
    return '已追加到草稿 ' + name + '：本段 ' + text.length + ' 字符，累计 ' + next.length + ' 字符。继续 append，写完后用 finish:true 合并出文件卡片。';
  }
  let full = text;
  if (finish) {
    const prev = (await chrome.storage.local.get(draftKey))[draftKey] || '';
    full = prev + text;
    await chrome.storage.local.remove(draftKey);
  }
  // 转 base64（中文安全），走统一的文件卡片链路（不自动下载）
  const b64 = btoa(unescape(encodeURIComponent(full)));
  try {
    await addFileCard({ name, mime: 'text/javascript', size: full.length, b64 });
    return '已生成文件卡片 ' + name + '（' + full.length + ' 字符）。文件不会自动下载，用户点卡片右侧按钮才会保存。';
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
          return { error: '文件已生成，但文件卡片创建失败：' + (e?.message || e) };
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

function setSendMode(mode) {
  if (mode === 'stop') {
    btnSend.classList.add('stop');
    btnSend.title = '停止';
    btnSend.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>';
  } else {
    btnSend.classList.remove('stop');
    btnSend.title = '发送';
    btnSend.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
  }
}

function stopRun() {
  if (!running) return;
  stopRequested = true;
  try { abortCtrl?.abort(); } catch (_) {}
  try { chrome.runtime.sendMessage({ type: 'agent:stop', requestId: currentRequestId }); } catch (_) {}
  setStatus('正在停止…');
  // 兜底：后台 6 秒内还没停（例如卡在 MCP 准备阶段），直接复位界面状态
  setTimeout(() => {
    if (!running) return;
    // 单进程执行：6 秒兜底直接复位，不再参考跨进程快照（旧快照会误判成还在跑）
    running = false;
    backgroundMode = false;
    setSendMode('send');
    setDot('idle');
    setStatus('已停止');
    render();
  }, 6000);
}

let resumeStep = 0;
let backgroundMode = false;
/* 每次投递一个 requestId：重复发送同一条时后台按 ID 幂等，不会再起一个循环 */
let currentRequestId = '';
let stickBottom = true;
let lastMsgCount = 0;
let staleRunTicks = 0;
let prepareAt = 0;
const APP_VER = (() => { try { return chrome.runtime.getManifest().version; } catch (_) { return '?'; } })();
setInterval(async () => {
  if (!running) { staleRunTicks = 0; return; }
  let run = null;
  try { run = (await chrome.storage.local.get('agentRun')).agentRun; } catch (_) { return; }
  const sameSess = !!(run && run.sessionId === sessionId);
  // 判活要同时看 agentRun 和流式增量包的 at：长思考期间只写增量小包，
  // agentRun 可能几十秒不刷新，只看 run.at 会把正在思考的任务当成僵尸杀掉。
  let beatAt = run ? (run.at || 0) : 0;
  try {
    const s = (await chrome.storage.local.get('agentStream')).agentStream;
    if (s && s.sessionId === sessionId && s.at > beatAt) beatAt = s.at;
  } catch (_) {}
  // 阈值 90 秒：首字节超时是 45 秒，必须留出余量，否则「慢但没死」会被误杀
  const fresh = !!(run && Date.now() - beatAt < 90000);
  const alive = sameSess && run.running && fresh;
  // 诊断：只要还在「准备」阶段，第 3 秒起就把后台真实状态和秒数露出来。
  // 不放在 alive 分支里——正是「后台根本没起来」时最需要看到它。
  const stNow = (statusEl.textContent || '');
  // 后台已经报出真实阶段（准备工具 / 思考中 · 第 n 轮 / 执行 xxx）时看门狗不抢文案，
  // 否则「准备工具」会被反复改回「准备中…」，看上去永远卡在准备阶段。
  const bStatus = run && run.status ? String(run.status).trim() : '';
  if (bStatus && /^(准备工具|思考中|执行 |已停止|已中断)/.test(bStatus)) {
    // 思考中带已跑秒数：用户能看出它还在动，而不是卡死
    if (/思考中/.test(bStatus)) {
      const secs = Math.max(0, Math.round((Date.now() - statusSince) / 1000));
      setStatus(bStatus + ' · ' + secs + 's');
    } else {
      setStatus(bStatus);
    }
  } else if (prepareAt && Date.now() - prepareAt > 1000 && /准备/.test(stNow)) {
    const secs = Math.round((Date.now() - prepareAt) / 1000);
    const age = run && run.at ? Math.round((Date.now() - run.at) / 1000) : -1;
    const bg = !run ? '无记录' : !sameSess ? '别的会话'
      : run.running ? (run.status || '运行中')
      : '已停止' + (age >= 0 ? `(${age}s前)` : '');
    setStatus(`准备中… v${APP_VER} ${secs}s · 后台 ${bg}`);
  }
  if (alive) { staleRunTicks = 0; return; }
  // 同会话且后台明确已停：这是僵尸态，立刻复位，不用等 6 秒
  if (sameSess && run && !run.running) staleRunTicks = 3;
  if (!sameSess && !backgroundMode) { staleRunTicks = 0; return; }
  staleRunTicks += 1;
  if (staleRunTicks < 3) return;   // 连续 3 次（约 6 秒）都对不上才复位
  staleRunTicks = 0;
  try { chrome.runtime.sendMessage({ type: 'agent:stop', requestId: currentRequestId }); } catch (_) {}
  running = false;
  backgroundMode = false;
  setSendMode('send');
  setDot('ok');
  setStatus('');
  render();
}, 1000);
let lastPersist = 0;
function persistThrottled() {
  const now = Date.now();
  if (now - lastPersist < 600) return;
  lastPersist = now;
  persist();
}
chatEl.addEventListener('scroll', () => {
  stickBottom = chatEl.scrollHeight - chatEl.scrollTop - chatEl.clientHeight < 110;
});

function saveSnap(step, isRunning, interrupted) {
  try {
    chrome.storage.local.set({ taskSnap: { sessionId, messages, step: step || 0, running: !!isRunning, interrupted: !!interrupted, at: Date.now() } });
  } catch (_) {}
}

window.addEventListener('pagehide', () => {
  if (running && !backgroundMode) saveSnap(0, false, true);
});

async function agentLoop() {
  let lastSig = '';
  let noProgress = 0;
  let autoCont = 0;
  let autoFix = 0;    // 「声称完成却没调工具」的纠正次数

  try {
    for (let step = 1; step <= MAX_STEPS; step++) {
      if (stopRequested) throw new Error('已停止');
      setStatus(`思考中 · 第 ${step}/${MAX_STEPS} 轮`);
      saveSnap(step, true);

      const live = { role: 'assistant', content: '', reasoning: '', _live: true };
      messages.push(live);
      render();

      let painted = 0;
      const paint = () => {
        const now = Date.now();
        if (now - painted < 70) return;
        painted = now;
        updateLive(live);
      };

      let msg;
      try {
        msg = await callLLM((acc) => {
          live.content = acc.content;
          live.reasoning = acc.reasoning;
          paint(false);
        });
      } catch (err) {
        if (!live.content && !live.reasoning) {
          const i = messages.indexOf(live);
          if (i >= 0) messages.splice(i, 1);
        } else {
          delete live._live;
        }
        throw err;
      }

      delete live._live;
      live.reasoning = msg.reasoning;
      if (msg.content) live.content = msg.content;
      if (msg.tool_calls && msg.tool_calls.length) live.tool_calls = msg.tool_calls;

      if (live.tool_calls && live.tool_calls.length) {
        render();
      } else {
        updateLive(live);
        // 思考过程保持展开，用户想看过程时不用再点开
      }

      const calls = msg.tool_calls || [];
      if (!calls.length) {
        // 只回文字说「已生成」但没调工具（模型幻觉）：追一轮，最多一次
        const claimsDone2 = /(已生成|已经生成|生成好了|已经完成)/.test(String(msg.content || ''));
        const lastUserIdx = messages.map((m) => m.role).lastIndexOf('user');
        const hasToolSinceUser = messages.slice(lastUserIdx + 1).some((m) => m.role === 'tool');
        if (autoFix < 3 && claimsDone2 && !hasToolSinceUser) {
          autoFix += 1;
          messages.push({ role: 'user', content: '（你只回复了文字，没有实际调用任何工具。正文里那些链接是历史结果，不是本次输出）请在本轮直接调用 generate_image 工具（参数 prompt 填完整画面描述）真正生成图片，或调用对应工具完成任务。禁止只写文字说明。' });
          render();
          continue;
        }
        // 纠正次数用尽仍光说不做：给这条消息打标，UI 明示「没真调工具」，
        // 不让用户对着「已生成」三个字猜为什么没图
        if (claimsDone2 && !hasToolSinceUser) live._claimNoTool = true;
        // 模型在思考里写到一半就停了（finish_reason=length），或只有思考没有正文：
        // 直接收工会让用户看到半句话就结束，这里自动续写最多两轮。
        // content 只有空白同样算没正文（模型偶尔只回一个换行）
        const truncated = msg._finish === 'length' || (!String(msg.content || '').trim() && !!String(msg.reasoning || '').trim());
        if (truncated && autoCont < 6) {
          autoCont += 1;
          // 思考保留在思考区（完整模式），不搬进正文；模型缺什么就提示它补什么
          if (!String(live.content || '').trim()) {
            if (looksEncoded(live.reasoning)) {
              messages.push({ role: 'user', content: '（你上一条回复只有编码内容，没有正文）请直接用正常文字回答，不要输出 base64 或大段代码。' });
            } else {
              messages.push({ role: 'user', content: '（你上一条只有思考没有正文）请基于上面的思考直接给出正文回答。' });
            }
          }
          messages.push({ role: 'user', content: '（上一条输出被截断）继续：如果还没写完，用 save_js append 接着写下一段，写完后用 finish 合并出文件卡片。不要重新开始，不要解释。' });
          render();
          continue;
        }
        if (!msg.content && msg.reasoning) {
          setStatus('模型只输出了思考没有正文，建议换个模型');
          setDot('ok');
          return;
        }
        setStatus('');
        setDot('ok');
        return;
      }

      const sig = calls.map((c) => (c.function?.name || '') + ':' + String(c.function?.arguments || '').slice(0, 160)).join('|');
      const hasNew = !!(msg.content && String(msg.content).trim()) || sig !== lastSig;
      if (hasNew) noProgress = 0; else noProgress += 1;
      lastSig = sig;
      if (noProgress >= 4) {
        setStatus('连续 4 轮没有新进展，先停在这里');
        setDot('ok');
        return;
      }

      for (const tc of calls) {
        const name = tc.function?.name;
        setStatus(`执行 ${name}`);
        const out = await runTool(name, parseArgs(tc.function?.arguments));
        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: typeof out === 'string' ? out : JSON.stringify(out)
        });
        render();
        saveSnap(step, true);
      }
    }
    setStatus('达到最大轮次，先停在这里');
    setDot('err');
  } catch (e) {
    const msg = String(e?.message || e);
    if (msg === '已停止') {
      setStatus('已停止');
      setDot('idle');
    } else {
      pushError(msg);
      setStatus('');
      setDot('err');
    }
    render();
  } finally {
    running = false;
    abortCtrl = null;
    setSendMode('send');
    saveSnap(0, false);
    persist();
    // 对话一轮结束：异步提炼长期记忆（不阻塞 UI，失败静默）
    memExtractAfterTurn();
  }
}

async function runAgent(userText, imageUrl, meta) {
  if (running) return;
  running = true;
  stopRequested = false;
  resumeStep = 0;
  document.querySelectorAll('#chat .feedback').forEach((n) => n.remove());
  setSendMode('stop');
  setDot('busy');
  setStatus('');

  const userContent = imageUrl
    ? [{ type: 'text', text: userText }, { type: 'image_url', image_url: { url: imageUrl } }]
    : userText;
  messages.push({ role: 'user', content: userContent, display: (meta && meta.display) || '', quotes: (meta && meta.quotes) || [] });
  render(true);
  persist();
  saveSnap(1, true);
  await agentLoop();
}

function cleanMsg(m) {
  const o = { role: m.role };
  if (m.content != null) o.content = m.content;
  if (m.tool_calls) o.tool_calls = m.tool_calls;
  if (m.tool_call_id) o.tool_call_id = m.tool_call_id;
  if (m.display) o.display = m.display;
  if (m.quotes) o.quotes = m.quotes;
  if (m._err) o._err = true;
  return o;
}

async function startInBackground(userText, imageUrl, meta) {
  if (running) return;
  running = true;
  stopRequested = false;
  resumeStep = 0;
  document.querySelectorAll('#chat .feedback').forEach((n) => n.remove());
  setSendMode('stop');
  setDot('busy');
  prepareAt = Date.now();
  currentRequestId = 'r_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  setStatus('准备中… v' + APP_VER);

  const userContent = imageUrl
    ? [{ type: 'text', text: userText }, { type: 'image_url', image_url: { url: imageUrl } }]
    : userText;
  messages.push({ role: 'user', content: userContent, display: (meta && meta.display) || '', quotes: (meta && meta.quotes) || [] });
  render(true);
  persist();
  saveSnap(1, true);

  let r = null;
  try {
    r = await Promise.race([
      chrome.runtime.sendMessage({ type: 'agent:start', payload: { sessionId, messages: messages.map(cleanMsg), requestId: currentRequestId } }),
      new Promise((res) => setTimeout(() => res(null), 12000))
    ]);
  } catch (e) {
    r = { ok: false, error: String(e?.message || e) };
  }
  if (r && r.ok) { backgroundMode = true; armPrepareWatchdog(); return; }
  // 后台明确表示「上一个任务还在跑」：不要停在这里干等，直接说清楚，
  // 并把本地 running 复位，让用户能点停止或等它结束。
  if (r && r.busy) {
    messages.pop();
    running = false;
    setSendMode('send');
    setDot('busy');
    setStatus('上一个任务还在跑，等它结束或点停止');
    render();
    return;
  }
  armPrepareWatchdog();
  // 回执丢了/超时：先看后台是不是其实已经跑起来，避免误判为失败
  try {
    const { agentRun } = await chrome.storage.local.get('agentRun');
    const fresh = agentRun && Date.now() - (agentRun.at || 0) < 15000;
    if (agentRun && agentRun.sessionId === sessionId && agentRun.running && fresh) {
      backgroundMode = true;
      return;
    }
  } catch (_) {}
  messages.pop();
  running = false;
  setSendMode('send');
  setDot('idle');
  setStatus('后台不可用，改在本页执行');
  runAgent(userText, imageUrl, meta);
}

/* 看门狗：后台 15 秒还没离开「准备中」就直接降级到本页执行，绝不让用户干等
   （准备阶段已压到 8 秒封顶，15 秒还没动静基本可以判定后台没起来） */
function armPrepareWatchdog() {
  setTimeout(async () => {
    if (!running) return;
    const st = (statusEl.textContent || '').trim();
    if (!/准备中/.test(st)) return;
    let diag = '';
    try {
      const ctx = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
      diag = 'offscreen:' + (ctx || []).length;
    } catch (_) { diag = 'offscreen:?'; }
    try {
      const { agentRun } = await chrome.storage.local.get('agentRun');
      diag += ' run:' + (agentRun ? (agentRun.running ? '跑' : '停') + '/' + (agentRun.status || '') : '无');
      // 后台 15 秒内有快照 = 它真的活着（只是还在准备 MCP/首轮），别误杀
      if (agentRun && agentRun.running && Date.now() - (agentRun.at || 0) < 15000) {
        setStatus(agentRun.status || '还在准备…');
        return;
      }
    } catch (_) {}
    try { chrome.runtime.sendMessage({ type: 'agent:stop', requestId: currentRequestId }); } catch (_) {}
    const last = messages[messages.length - 1];
    const lastText = last && typeof last.content === 'string' ? last.content : '';
    messages.pop();
    running = false;
    setSendMode('send');
    setDot('idle');
    render();
    setStatus('后台卡住（' + diag + '），已改在本页执行');
    if (lastText) runAgent(lastText, null, { display: last.display || '' });
  }, 15000);
}

/* 后台流式增量：后台只写「新增尾巴」的小对象（<2KB/包），这里按 seq 去重后追加。
   不走整条 messages 回传——那正是长思考被拖死的原因。 */
let lastStreamSeq = 0;

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  // 流式增量包：只含新增尾巴，按 seq 去重后追加到当前 assistant 消息
  if (changes.agentStream) {
    const s = changes.agentStream.newValue;
    if (s && s.sessionId === sessionId && s.seq > lastStreamSeq) {
      lastStreamSeq = s.seq;
      let last = messages[messages.length - 1];
      // 快照可能落在「刚 push user、还没 push assistant」的空档，末条是 user 时先补一条
      if (!last || last.role !== 'assistant') {
        last = { role: 'assistant', content: '', reasoning: '' };
        messages.push(last);
        lastMsgCount = messages.length;
        render();
      }
      if (s.dReasoning) last.reasoning = (last.reasoning || '') + s.dReasoning;
      if (s.dContent) last.content = (last.content || '') + s.dContent;
      if (!running) { running = true; setSendMode('stop'); setDot('busy'); }
      updateLive(last);
    }
  }
  if (!changes.agentRun) return;
  const run = changes.agentRun.newValue;
  if (!run || (run.sessionId && run.sessionId !== sessionId)) return;
  // 后台快照可能是「刚启动、还没消息」的空数组，直接覆盖会把用户刚发的消息吞掉
  const incoming = Array.isArray(run.messages) ? run.messages : null;
  if (incoming && (incoming.length || !messages.length)) {
    // 后台快照来自「发给模型的副本」，reasoning 被 cleanMsg 剥掉；
    // 直接覆盖会把上一轮的思考块清空（用户重发后「思考不见了」）。按位置把本地思考补回去。
    incoming.forEach((m, i) => {
      const old = messages[i];
      if (old && old.role === m.role && old.reasoning && !m.reasoning) m.reasoning = old.reasoning;
    });
    messages = incoming;
  }
  // Tabbit 语义：客户端只认终态。receipt 带 completedAt + taskStatus 就是结束，
  // 立刻复位，不再依赖 running 字段（否则后台已结束、侧边栏还挂着「准备中」）。
  const TERMINAL = ['succeeded', 'failed', 'interrupted'];
  const done = !!run.completedAt && TERMINAL.indexOf(run.taskStatus) !== -1;
  running = done ? false : !!run.running;
  setSendMode(running ? 'stop' : 'send');
  let st = run.status || '';
  // 任务已收尾：状态条一律清空。用户看助手回复就知道结束了，
  // 不需要「后台任务已结束」这种吓人的残留提示。
  // 正常收尾才清状态；错误/中断的原因要留在状态条上，否则用户只看到状态突然变空
  if (done) {
    if (!/⚠️|失败|已中断|已停止/.test(st)) st = '';
  } else if (!running && /准备中|执行 /.test(st)) {
    st = '';
  }
  if (st !== lastStatusText) { lastStatusText = st; statusSince = Date.now(); }
  setStatus(st);
  setDot(running ? 'busy' : 'ok');
  if (running) {
    // 消息条数变了（工具结果/文件卡片/新的一轮）必须重建，否则工具卡片不显示
    if (messages.length !== lastMsgCount) {
      render();
      persistThrottled();
    } else {
      const live = messages[messages.length - 1];
      if (live && (live._live || live.reasoning || live.content)) updateLive(live);
      else render();
    }
  } else {
    render();
    persist();
    saveSnap(0, false);
  }
});

async function continueRun() {
  if (running || !messages.length) return;
  resumeStep = 0;
  running = true;
  stopRequested = false;
  setSendMode('stop');
  setDot('busy');
  setStatus('继续上次任务…');
  render();
  await agentLoop();
}

/* ══ 渲染 ═════════════════════════════════════════════════ */

function setDot(state) { statusDot.className = 'dot ' + state; }
function setStatus(text) { statusEl.textContent = text || ''; }

function summarizeTool(name, raw) {
  let r;
  const s = typeof raw === 'string' ? raw : JSON.stringify(raw);
  try { r = JSON.parse(s); } catch (_) { r = null; }

  if (r && typeof r === 'object' && r.error) return String(r.error).slice(0, 46);

  switch (name) {
    case 'browser_snapshot': {
      const m = s.match(/可交互元素 (\d+) 个/);
      return m ? `${m[1]} 个元素` : '已读取';
    }
    case 'browser_click': return r?.clicked ? `点击「${r.clicked}」` : '已点击';
    case 'browser_type': return r?.into ? `「${r.into}」· ${r.typed ?? 0} 字` : '已输入';
    case 'browser_navigate': return r?.title || r?.url || '已导航';
    case 'browser_get_text': return `${s.length} 字`;
    case 'browser_evaluate': return s.replace(/\s+/g, ' ').slice(0, 46);
    case 'browser_screenshot': return '已截图 · 点开查看';
    default: return s.replace(/\s+/g, ' ').slice(0, 46);
  }
}

function prettyResult(raw) {
  const s = typeof raw === 'string' ? raw : JSON.stringify(raw);
  try {
    const j = JSON.parse(s);
    if (j && typeof j === 'object') return JSON.stringify(j, null, 2);
  } catch (_) {}
  return s;
}

const WELCOME_CARDS = [
  { ico: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14.5 14.5 0 0 1 0 18 14.5 14.5 0 0 1 0-18z"/></svg>', title: '打开网页并总结', q: '打开 example.com 并告诉我这页的标题', hint: '例如：打开 example.com 并告诉我这页的标题' },
  { ico: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M16.5 16.5L21 21M8.5 11h5M8.5 8.5h5"/></svg>', title: '搜索并浏览结果', q: '在搜索框输入「机械键盘」并查看搜索结果', hint: '在搜索框输入「机械键盘」并查看搜索结果' },
  { ico: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4l14 8-14 8z"/></svg>', title: '模拟点击操作', q: '点开第一条结果，总结这页讲了什么', hint: '点开第一条结果，总结这页讲了什么' },
];

function hostOf(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (_) { return u || ''; } }

function welcomeNode() {
  const d = document.createElement('div');
  d.className = 'welcome';
  let recents = [];
  try {
    const list = recentSessions.filter((s) => s && s.title && s.host);
    for (const s of list.slice(0, 2)) recents.push({ title: s.title.slice(0, 14), host: s.host });
  } catch (_) {}
  const cardsHtml = WELCOME_CARDS.map((c, i) => `
    <button type="button" class="wl-card" data-i="${i}">
      <span class="wl-ico">${c.ico}</span><b>${c.title}</b><i>${c.hint}</i>
    </button>`).join('');
  const recentHtml = recents.length
    ? `<div class="wl-recent"><span class="wl-rl">最近任务</span>${recents.map((r) => `<button type="button" class="wl-chip"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>${r.title} · ${r.host}</button>`).join('')}</div>`
    : '';
  d.innerHTML = `
    <div class="wl-hero">
      <h2>描述任务，我替你操作页面</h2>
      <p>打开网页、搜索信息、填写表单、抓取数据，像真人一样替你操作浏览器</p>
      <span class="wl-pill"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l1.9 5.6L19.5 10.5l-5.6 1.9L12 18l-1.9-5.6L4.5 10.5l5.6-1.9z"/></svg>AI 浏览器助手</span>
    </div>
    <div class="wl-cards">${cardsHtml}</div>
    ${recentHtml}`;
  d.querySelectorAll('.wl-card').forEach((btn) => {
    btn.addEventListener('click', () => {
      const inp = document.getElementById('inpMsg');
      if (inp) { inp.value = WELCOME_CARDS[+btn.dataset.i].q; inp.focus(); inp.dispatchEvent(new Event('input')); }
    });
  });
  return d;
}

/* ── 悬停操作栏共享状态：⋯ 菜单开关 + 收藏（fav 记录与会话同库但独立列出）── */
let msgMenuCloser = null;
function closeMsgMenu() {
  if (msgMenuCloser) { document.removeEventListener('click', msgMenuCloser); msgMenuCloser = null; }
  const m = document.querySelector('.msg-more');
  if (m) m.remove();
}
function favKey(sid, role, text) {
  const s = sid + '|' + role + '|' + String(text || '').slice(0, 120);
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return 'fav_' + h.toString(36);
}
function favTitle(m, text) {
  if (m.role === 'user') {
    const t = sessionTitle([m]);
    if (t && t !== '新对话') return t;
  }
  return String(text || '').replace(/\s+/g, ' ').trim().slice(0, 46) || '收藏';
}
let favRows = [];
let favIds = new Set();
function splitFavs(all) {
  favRows = all.filter((r) => r.fav).sort((a, b) => (b.at || 0) - (a.at || 0));
  favIds = new Set(favRows.map((f) => f.id));
  return all.filter((r) => !r.fav);
}
async function refreshFavs() {
  try { splitFavs(await window.YZDB.list()); } catch (_) {}
  return favRows;
}

/* 消息悬停操作栏：复制 / 收藏 / 分享 / ⋯（分支、删除）。idx = messages 下标 */
function msgActions(idx) {
  const m = messages[idx];
  const bar = document.createElement('div');
  bar.className = 'msg-actions';
  const mk = (svg, title) => {
    const b = document.createElement('button');
    b.className = 'ma-btn'; b.type = 'button'; b.title = title; b.innerHTML = svg;
    return b;
  };
  const textOf = (x) => {
    if (!x) return '';
    if (typeof x === 'string') return x;
    if (Array.isArray(x)) return x.filter((p) => p.type === 'text').map((p) => p.text).join('\n');
    return x.display || '';
  };
  const copyText = m.role === 'user' ? (m.display || textOf(m.content)) : (textOf(m.content) || (m.reasoning ? '[思考]\n' + m.reasoning : ''));

  // 复制
  const bCopy = mk('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>', '复制');
  bCopy.onclick = async (e) => { e.stopPropagation(); try { await navigator.clipboard.writeText(copyText); bCopy.title = '已复制'; setTimeout(() => bCopy.title = '复制', 1200); } catch (_) {} };
  // 收藏：再点一次取消；记录带 fav:true，只在历史抽屉的「⭐ 收藏」分组出现，不算对话
  const STAR_OFF = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l2.7 5.9 6.3.7-4.7 4.3 1.3 6.1L12 17l-5.6 3 1.3-6.1L3 9.6l6.3-.7z"/></svg>';
  const STAR_ON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3l2.7 5.9 6.3.7-4.7 4.3 1.3 6.1L12 17l-5.6 3 1.3-6.1L3 9.6l6.3-.7z"/></svg>';
  const fId = favKey(sessionId, m.role, copyText);
  const bStar = mk(favIds.has(fId) ? STAR_ON : STAR_OFF, favIds.has(fId) ? '取消收藏' : '收藏');
  bStar.onclick = async (e) => {
    e.stopPropagation();
    if (!window.YZDB) { setStatus('收藏不可用：本地库未就绪'); return; }
    try {
      if (favIds.has(fId)) {
        await window.YZDB.del(fId);
        favIds.delete(fId);
        favRows = favRows.filter((f) => f.id !== fId);
        bStar.innerHTML = STAR_OFF; bStar.title = '收藏';
        setStatus('已取消收藏');
      } else {
        const rec = { id: fId, at: Date.now(), fav: true, sessionId, msgIdx: idx, title: favTitle(m, copyText), text: copyText.slice(0, 2000), messages: [] };
        await window.YZDB.put(rec);
        favIds.add(fId);
        favRows = [rec, ...favRows];
        bStar.innerHTML = STAR_ON; bStar.title = '取消收藏';
        setStatus('已收藏 · 历史抽屉「⭐ 收藏」可查看');
      }
    } catch (err) { setStatus('收藏失败：本地库写入异常'); }
  };
  // 分享（导出为文本，走系统分享/剪贴板）
  const bShare = mk('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v13"/></svg>', '分享');
  bShare.onclick = async (e) => {
    e.stopPropagation();
    const blob = new Blob([copyText], { type: 'text/plain;charset=utf-8' });
    const file = new File([blob], 'yuze-' + (m.role === 'user' ? 'msg' : 'reply') + '.txt', { type: 'text/plain' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file] }); return; } catch (_) {} }
    try { await navigator.clipboard.writeText(copyText); bShare.title = '已复制'; setTimeout(() => bShare.title = '分享', 1200); } catch (_) {}
  };
  // ⋯ 菜单：分支 / 删除
  const bMore = mk('<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>', '更多');
  bMore.onclick = (e) => {
    e.stopPropagation();
    const open = document.querySelector('.msg-more');
    if (open) { const wasMine = open._owner === bMore; closeMsgMenu(); if (wasMine) return; }
    const menu = document.createElement('div');
    menu.className = 'msg-more';
    menu._owner = bMore;
    const fork = document.createElement('button'); fork.textContent = '⎇ 分支';
    fork.onclick = async (ev) => {
      ev.stopPropagation(); closeMsgMenu();
      if (running && !window.confirm('任务还在运行，分支会中断它。确定吗？')) return;
      stopRun();
      const keep = messages.slice(0, idx + 1);
      const rec = { id: Date.now().toString(36), title: (sessionTitle([m]) || '分支会话'), at: Date.now(), messages: keep.map(cleanMsg), host: await pageHost() };
      try { await window.YZDB.put(rec); } catch (_) {}
      sessionId = rec.id; lastStreamSeq = 0; messages = keep; lastShot = null;
      closeDrawer(); render(); persist();
      setStatus('已从这条消息分支出新对话');
      setTimeout(() => { if (/分支出新对话/.test(statusEl.textContent)) setStatus(''); }, 2500);
    };
    const del = document.createElement('button'); del.textContent = '🗑 删除'; del.classList.add('danger');
    del.onclick = async (ev) => {
      ev.stopPropagation(); closeMsgMenu();
      const n = messages.length - idx;
      if (!window.confirm(n === 1 ? '删除这条消息？' : '删除这条消息及其后的 ' + (n - 1) + ' 条？')) return;
      messages.splice(idx);
      if (!messages.length) {
        // 删空：库里这条会话必须一起删，否则 persist() 见空消息早退，重开还能看到已删内容
        const dead = sessionId;
        sessionId = Date.now().toString(36); lastStreamSeq = 0; messages = []; lastShot = null;
        try { await window.YZDB.del(dead); } catch (_) {}
        try { await chrome.storage.local.set({ lastSessionId: sessionId }); } catch (_) {}
        setDot('idle'); setStatus('已删除这条消息'); render();
        return;
      }
      render(); persist();
    };
    menu.append(fork, del);
    document.body.appendChild(menu);
    const r = bMore.getBoundingClientRect();
    menu.style.left = Math.min(r.left, window.innerWidth - 130) + 'px';
    menu.style.top = (r.bottom + 4) + 'px';
    setTimeout(() => { msgMenuCloser = (ev) => { if (!menu.contains(ev.target)) closeMsgMenu(); }; document.addEventListener('click', msgMenuCloser); }, 0);
  };
  bar.append(bCopy, bStar, bShare, bMore);
  return bar;
}

function userNode(m) {
  const d = document.createElement('div');
  d.className = 'msg-user';
  const content = m && typeof m === 'object' && 'role' in m ? m.content : m;

  if (m && typeof m === 'object' && typeof m.display === 'string' && (m.display || (m.quotes || []).length)) {
    if (Array.isArray(m.quotes) && m.quotes.length) {
      const qb = document.createElement('div');
      qb.className = 'uq-quotes';
      for (const q of m.quotes.slice(0, 3)) {
        const c = document.createElement('span');
        c.className = 'uq-q';
        const ic = q.kind === 'tab' ? '💡 ' : q.kind === 'file' ? '📄 ' : q.kind === 'dir' ? '📁 ' : q.kind === 'skill' ? '✦ ' : '';
        c.textContent = ic + String(q.label || '').slice(0, 40);
        c.title = q.label || '';
        qb.appendChild(c);
      }
      if (m.quotes.length > 3) {
        const more = document.createElement('span');
        more.className = 'uq-q';
        more.textContent = '+' + (m.quotes.length - 3);
        qb.appendChild(more);
      }
      d.appendChild(qb);
    }
    if (m.display) {
      const p = document.createElement('div');
      p.className = 'q-text';
      p.textContent = m.display;
      d.appendChild(p);
    }
    if (Array.isArray(content)) {
      for (const part of content) {
        if (part && part.type === 'image_url') {
          const img = document.createElement('img');
          img.className = 'q-img';
          img.src = part.image_url?.url || '';
          d.appendChild(img);
        }
      }
    }
    return d;
  }

  if (typeof content === 'string') {
    d.textContent = content;
  } else if (Array.isArray(content)) {
    for (const part of content) {
      if (!part) continue;
      if (part.type === 'text') {
        const p = document.createElement('div');
        p.className = 'q-text';
        p.textContent = part.text || '';
        d.appendChild(p);
      } else if (part.type === 'image_url') {
        const img = document.createElement('img');
        img.className = 'q-img';
        img.src = part.image_url?.url || '';
        d.appendChild(img);
      }
    }
  }
  return d;
}

/* 轻量 markdown：标题 / 分隔线 / 列表 / 代码块 / 引用 / 行内样式。
   只做渲染层，不引外部库（扩展 CSP 限制），所有文本先转义再拼结构。 */
function highlightCode(line, lang) {
  const L = String(lang || '').toLowerCase();
  const known = ['javascript','js','typescript','ts','json','python','py','css','html','xml','bash','sh','shell','sql','go','rust','java','yaml','yml','markdown','md'];
  const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  if (!known.includes(L)) return esc(line);
  const tokens = [];
  const keep = (html) => { tokens.push(html); return '\u0001' + (tokens.length - 1) + '\u0002'; };
  let s = esc(line);
  if (['python','py','bash','sh','shell','yaml','yml'].includes(L)) {
    s = s.replace(/(^|\s)(#[^\n]*)/g, (m, p1, p2) => p1 + keep('<span class="c-com">' + p2 + '</span>'));
  } else {
    s = s.replace(/(^|[^:])\/\/([^\n]*)/g, (m, p1, p2) => p1 + keep('<span class="c-com">//' + p2 + '</span>'));
  }
  s = s.replace(/('(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\\n])*`)/g, (m) => keep('<span class="c-str">' + m + '</span>'));
  s = s.replace(/\b(const|let|var|function|return|if|else|for|while|class|new|this|true|false|null|undefined|async|await|import|export|from|try|catch|throw|typeof|do|switch|case|break|continue|default|extends|super|delete|void|in|of|yield)\b/g, '<span class="c-kw">$1</span>');
  s = s.replace(/(?<!\u0001)\b(\d+(?:\.\d+)?)\b(?!\u0002)/g, '<span class="c-num">$1</span>');
  s = s.replace(/\u0001(\d+)\u0002/g, (_, i) => tokens[+i]);
  return s;
}

function mdToHtml(src) {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inline = (s) =>
    esc(s)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*\w])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>')
      .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img class="md-img" src="$2" alt="$1">')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  const lines = String(src).replace(/\r\n?/g, '\n').split('\n');
  const isBlockStart = (l) =>
    /^```/.test(l.trim()) || /^\s*#{1,6}\s+/.test(l) ||
    /^\s*(---|\*\*\*|___)\s*$/.test(l) || /^\s*\|.*\|\s*$/.test(l) || /^\s*[-*+]\s+/.test(l) ||
    /^\s*\d+[.)]\s+/.test(l) || /^\s*>\s?/.test(l);

  let html = '';
  let list = null; // 'ul' | 'ol'
  const closeList = () => { if (list) { html += `</${list}>`; list = null; } };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^```/.test(line.trim())) {
      closeList();
      const lang = line.trim().slice(3).trim();
      const buf = [];
      for (i++; i < lines.length && !/^```/.test(lines[i].trim()); i++) buf.push(lines[i]);
      const codeTxt = buf.join('\n');
      const label = (lang || 'text').toUpperCase();
      const linesHtml = codeTxt.split('\n').map((l) => '<span class="cl">' + highlightCode(l, lang) + '</span>').join('\n');
      html += '<div class="code-block"><div class="code-head"><span class="code-lang">' + esc(label) + '</span>'
        + '<span class="code-acts">'
        + `<button type="button" data-cb="run" title="在页面执行">▷ 执行</button>`
        + `<button type="button" data-cb="download" title="下载">⬇ 下载</button>`
        + `<button type="button" data-cb="copy" title="复制代码">⧉ 复制</button>`
        + `<button type="button" data-cb="fold" title="折叠">⌃</button>`
        + '</span></div>'
        + `<pre class="code"><code>${linesHtml}</code></pre></div>`;
      continue;
    }

    if (/^\s*(---|\*\*\*|___)\s*$/.test(line)) { closeList(); html += '<hr>'; continue; }

    const h = line.match(/^\s*(#{1,6})\s+(.*)$/);
    if (h) {
      closeList();
      const lv = Math.min(h[1].length + 1, 6); // # → h2，## → h3 …
      html += `<h${lv}>${inline(h[2])}</h${lv}>`;
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      closeList();
      const buf = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^\s*>\s?/, ''));
      i--;
      html += `<blockquote>${buf.map(inline).join('<br>')}</blockquote>`;
      continue;
    }

    if (/^\s*\|.*\|\s*$/.test(line)) {
      closeList();
      const rows = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) rows.push(lines[i++].trim());
      i--;
      const cells = (r) => r.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
      if (rows.length >= 2 && /^\|[\s:|-]+\|$/.test(rows[1])) {
        const head = cells(rows[0]);
        const body = rows.slice(2).map(cells);
        html += '<table class="md-table"><thead><tr>'
          + head.map((c) => `<th>${inline(c)}</th>`).join('')
          + '</tr></thead><tbody>'
          + body.map((r) => '<tr>' + r.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>').join('')
          + '</tbody></table>';
      } else {
        html += '<p>' + rows.map(inline).join('<br>') + '</p>';
      }
      continue;
    }

    const ul = line.match(/^\s*[-*+]\s+(.*)$/);
    const ol = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (ul || ol) {
      const want = ul ? 'ul' : 'ol';
      if (list !== want) { closeList(); html += `<${want}>`; list = want; }
      html += `<li>${inline(ul ? ul[1] : ol[1])}</li>`;
      continue;
    }

    if (!line.trim()) { closeList(); continue; }

    closeList();
    const buf = [line];
    while (i + 1 < lines.length && lines[i + 1].trim() && !isBlockStart(lines[i + 1])) buf.push(lines[++i]);
    html += `<p>${buf.map(inline).join('<br>')}</p>`;
  }
  closeList();
  return html;
}

/* 摘一行人类可读的思考摘要：跳过纯符号噪音行，取第一句有意义的中文/英文 */
// 折叠态摘要：原来只截 34 字，几千字的思考折叠后只剩一行，看着就像「思考很短」。
// 放宽到多句、约 240 字（再由 CSS 按行数截断），折叠时也能看到思考脉络。
const THINK_BRIEF_MAX = 240;
function thinkSummary(text) {
  const raw = String(text || '').replace(/\s+/g, ' ').trim();
  if (!raw) return '';
  const parts = raw.split(/(?<=[。！？；.!?;])/).map((x) => x.trim()).filter(Boolean);
  const pick = (seg) => {
    const t = seg.replace(/^[-*>#\d.、)）\s]+/, '').trim();
    const cjk = (t.match(/[\u4e00-\u9fa5]/g) || []).length;
    // 至少 4 个汉字，或者足够长的英文单词序列；排除纯 base64/代码
    if (cjk >= 4 || /[A-Za-z]{3,}(\s+[A-Za-z]{2,}){2,}/.test(t)) return t;
    return '';
  };
  // 逐句累加，尽量多带几句，凑不满再退回第一句硬截
  let buf = '';
  for (const seg of parts) {
    const t = pick(seg);
    if (!t) continue;
    if (!buf) buf = t;
    else if ((buf + t).length <= THINK_BRIEF_MAX) buf += t;
    else break;
    if (buf.length >= THINK_BRIEF_MAX) break;
  }
  if (buf) return buf.length > THINK_BRIEF_MAX ? buf.slice(0, THINK_BRIEF_MAX) + '…' : buf;
  const flat = raw.slice(0, THINK_BRIEF_MAX);
  return flat.length >= THINK_BRIEF_MAX ? flat + '…' : flat;
}

/* 折叠的瞬间就要有摘要（ticker 已停，之后没人再填）。空才填，不覆盖已有内容 */
function fillBriefIfEmpty(thinkEl) {
  const br = thinkEl.querySelector('.t-brief');
  const body = thinkEl.querySelector('.think-body');
  if (br && !br.textContent && body && body.textContent) br.textContent = thinkSummary(body.textContent);
}

function thinkNode(text, collapsed) {
  const d = document.createElement('div');
  d.className = 'think' + (collapsed ? ' collapsed' : '');
  const head = document.createElement('button');
  head.type = 'button';
  head.className = 'think-head';
  head.innerHTML = '<span class="t-label">思考过程</span><span class="t-brief"></span><span class="t-elapse" data-elapse></span>'
    + '<svg class="t-chev" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 15l6-6 6 6"/></svg>';
  const body = document.createElement('div');
  body.className = 'think-body';
  body.textContent = text;
  head.addEventListener('click', () => {
    d.classList.toggle('collapsed');
    // 用户手动折叠时同步补一次摘要（实时态的 ticker 只管展开/流式期间）
    const br = d.querySelector('.t-brief');
    if (d.classList.contains('collapsed') && br && !br.textContent) {
      br.textContent = thinkSummary(body.textContent);
    }
  });
  d.append(head, body);
  // 渲染时就是折叠态（历史消息、本轮已结束的消息）必须立刻有摘要，
  // 不能等 tickThink 的 500ms 定时器——那些路径根本不启动 ticker，摘要会永远空白
  if (collapsed && text) d.querySelector('.t-brief').textContent = thinkSummary(text);
  return d;
}

/* 思考区跟跑：标题栏摘要 + 实时秒数（每 500ms 更新一次，避免和大段渲染抢帧） */
const thinkTickers = new Map();
function tickThink(node, getText, startedAt) {
  if (!node || !getText) return;
  const brief = node.querySelector('.t-brief');
  const elapse = node.querySelector('[data-elapse]');
  const briefText = () => {
    // 展开时正文就是完整思考流，头部不重复摘要（用户要完整模式，不要截取）
    if (!node.classList.contains('collapsed')) return '';
    const t = getText();
    if (!t) return '';
    return thinkSummary(t);
  };
  const tick = () => {
    const secs = Math.max(0, Math.round((Date.now() - startedAt) / 1000));
    if (elapse) {
      const txt = secs < 1 ? '0s' : (secs < 60 ? secs + 's' : Math.floor(secs / 60) + 'm' + (secs % 60) + 's');
      if (elapse.textContent !== txt) elapse.textContent = txt;
    }
    if (brief) {
      const b = briefText();
      if (brief.textContent !== b) brief.textContent = b;
    }
  };
  tick();
  const id = setInterval(tick, 500);
  thinkTickers.set(node, id);
}
function stopTickThink(node) {
  if (!node) return;
  const id = thinkTickers.get(node);
  if (id) { clearInterval(id); thinkTickers.delete(node); }
  const elapse = node.querySelector('[data-elapse]');
  if (elapse) {
    const done = elapse.dataset.done;
    if (done) elapse.textContent = done;
  }
}

let midSeq = 0;
function midOf(msg) {
  if (!msg._id) msg._id = 'm' + (++midSeq) + '_' + Date.now().toString(36);
  return msg._id;
}

// 模型思考层吐 base64 时不要原样展示（deepseek-v4.1-flash 常见）
function looksEncoded(s) {
  const t = String(s || '');
  if (t.length < 200) return false;
  const b64 = (t.match(/[A-Za-z0-9+/=]/g) || []).length;
  return b64 / t.length > 0.92;
}

// 正文是否含有可见内容：纯空白、或只有一条 ---/***/___ 分隔线（生图轮模型常发这种空消息，
// 渲染出来就是一条孤零零的横线，用户当成杂线 bug）都视为不可见
function hasVisibleContent(c) {
  const t = String(c == null ? '' : c);
  if (!t.trim()) return false;
  return !t.split('\n').every((line) => /^\s*$/.test(line) || /^\s*(---|\*\*\*|___)\s*$/.test(line));
}

function botNode(msg) {
  const d = document.createElement('div');
  if (msg._claimNoTool) {
    const warn = document.createElement('div');
    warn.className = 'think-warn';
    warn.textContent = '⚠ 模型声称已生成，但没有实际调用工具（可能是模型本轮偷懒）；请回复「重新生成」让它真正调用工具。';
    d.appendChild(warn);
  }
  d.className = 'msg-bot';
  d.dataset.mid = midOf(msg);
  // 一轮结束（不再是 _live）就默认折叠；思考中保持展开
  // reasoning 是空白串时直接不渲染思考块（生图等无思考轮次会出现空壳）
  if (msg.reasoning && String(msg.reasoning).trim()) {
    if (looksEncoded(msg.reasoning)) {
      const warn = document.createElement('div');
      warn.className = 'think-warn';
      warn.textContent = '模型思考内容异常（疑似 base64），建议换用 glm-5.3-flash 后重试';
      d.appendChild(warn);
    } else {
      d.appendChild(thinkNode(msg.reasoning, !msg._live));
    }
  }
  if (msg.content) {
    const body = document.createElement('div');
    body.className = 'bot-md';
    body.innerHTML = mdToHtml(msg.content);
    d.appendChild(body);
  }
  return d;
}

function errorNode(text, repeat) {
  const d = document.createElement('div');
  d.className = 'msg-err';
  const ico = document.createElement('span');
  ico.className = 'ico';
  ico.textContent = '!';
  const body = document.createElement('span');
  body.className = 'body';
  body.textContent = text.replace(/^⚠️\s*/, '');
  if (repeat > 1) {
    const badge = document.createElement('span');
    badge.className = 'repeat';
    badge.textContent = '×' + repeat;
    body.appendChild(badge);
  }
  d.append(ico, body);
  return d;
}

function humanSize(bytes) {
  const n = Number(bytes) || 0;
  if (n >= 1024 * 1024) return (n / 1024 / 1024).toFixed(1) + ' MB';
  if (n >= 1024) return (n / 1024).toFixed(1) + ' KB';
  return n + ' B';
}
function bytesOf(text) {
  try { return new TextEncoder().encode(String(text || '')).length; } catch (_) { return String(text || '').length; }
}

/* 工具调用 → 图一那种「写入文件 xxx 859 B」「执行命令 xxx」的展示语义 */
function toolMeta(name, args, raw) {
  const a = args || {};
  const text = String(raw == null ? '' : raw);
  if (name === 'save_js') {
    return { icon: 'file', title: '写入文件', detail: String(a.filename || 'script.js'), size: humanSize(bytesOf(a.code)) };
  }
  if (/^mcp_gen_/.test(name)) {
    const m = text.match(/"name"\s*:\s*"([^"]+)"/);
    const sz = text.match(/"size"\s*:\s*(\d+)/);
    return { icon: 'file', title: '写入文件', detail: m ? m[1] : (a.filename || '生成文件'), size: sz ? humanSize(+sz[1]) : '' };
  }
  if (name === 'run_skill_script' || name === 'run_script') {
    return { icon: 'term', title: '执行脚本', detail: String(a.name || a.id || ''), size: '' };
  }
  if (name === 'screenshot') return { icon: 'image', title: '截图', detail: '', size: '' };
  if (/^(navigate|open_url|open_tab)/.test(name)) {
    let host = String(a.url || '');
    try { host = new URL(host).host; } catch (_) {}
    return { icon: 'globe', title: '打开页面', detail: host, size: '' };
  }
  if (/^(click|move_mouse|type_text|key_press|scroll|hover)/.test(name)) {
    return { icon: 'cursor', title: '页面操作', detail: name, size: '' };
  }
  if (/^(read_page|get_dom|page_text|evaluate|browser_snapshot)/.test(name)) {
    return { icon: 'globe', title: '读取页面', detail: '', size: '' };
  }
  if (/^mcp_/.test(name)) {
    const t = name.replace(/^mcp_[^_]+_/, '');
    return { icon: 'tool', title: '调用 MCP', detail: t, size: '' };
  }
  return { icon: 'tool', title: name, detail: hasResultText(raw), size: '' };
}
function hasResultText(raw) { return raw === undefined ? '' : ''; }

function ticon(kind) {
  const w = 'width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"';
  if (kind === 'file') return '<svg ' + w + '><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>';
  if (kind === 'term') return '<svg ' + w + '><rect x="3" y="4" width="18" height="16" rx="2"/><path d="m7 9 2 2-2 2"/><path d="M12 15h5"/></svg>';
  if (kind === 'image') return '<svg ' + w + '><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>';
  if (kind === 'globe') return '<svg ' + w + '><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></svg>';
  if (kind === 'cursor') return '<svg ' + w + '><path d="M4 3l7 17 2.5-7L21 11z"/></svg>';
  return '<svg ' + w + '><path d="M14.7 6.3a4 4 0 0 0 5 5L10 21H4v-6z"/></svg>';
}

function toolNode(tc, rawResult) {
  const name = tc.function?.name || 'tool';
  const args = parseArgs(tc.function?.arguments);
  const hasResult = rawResult !== undefined;
  const failed = hasResult && /"error"\s*:/.test(String(rawResult));

  const d = document.createElement('details');
  d.className = 'tool';
  d.dataset.state = !hasResult ? 'run' : failed ? 'err' : 'ok';
  if (hasResult && (failed || name === 'generate_image')) d.open = true;

  const meta = toolMeta(name, args, rawResult);
  const sm = document.createElement('summary');
  const chev = document.createElement('span');
  chev.className = 'chev';
  chev.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>';
  const state = document.createElement('span');
  state.className = 'state';
  const ic = document.createElement('span');
  ic.className = 'ticon';
  ic.innerHTML = ticon(meta.icon);
  const tlabel = document.createElement('span');
  tlabel.className = 'tlabel';
  tlabel.textContent = meta.title;
  const tdetail = document.createElement('span');
  tdetail.className = 'tdetail';
  tdetail.textContent = hasResult ? (meta.detail || summarizeTool(name, rawResult)) : '执行中…';
  const tsize = document.createElement('span');
  tsize.className = 'tsize';
  tsize.textContent = hasResult ? (meta.size || '') : '';
  sm.append(state, ic, tlabel, tdetail, tsize, chev);
  d.appendChild(sm);

  if (hasResult) {
    let shotUrl = '';
    try {
      const j = typeof rawResult === 'string' ? JSON.parse(rawResult) : rawResult;
      if (j && (j.image || j.url)) shotUrl = String(j.image || j.url);
    } catch (_) {}
    if (shotUrl && /^(data:image\/|https?:\/\/)/.test(shotUrl)) {
      const im = document.createElement('img');
      im.className = 'tool-img';
      im.src = shotUrl;
      im.alt = '生成结果';
      im.onerror = () => {
        const miss = document.createElement('div');
        miss.className = 'think-warn';
        miss.textContent = '⚠ 图片地址已失效（临时链接过期），回复「重新生成」即可再出一张。';
        im.replaceWith(miss);
      };
      d.appendChild(im);
      // 图片卡片自带下载按钮：点了才落盘
      const bar = document.createElement('div');
      bar.className = 'tool-img-bar';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'img-dl';
      btn.textContent = '下载图片';
      btn.onclick = async (e) => {
        if (e) e.stopPropagation();
        try {
          let u = shotUrl, tmp = '';
          if (/^data:/.test(shotUrl)) {
            const blob = await (await fetch(shotUrl)).blob();
            u = tmp = URL.createObjectURL(blob);
          }
          const name = 'yz-image-' + Date.now() + '.png';
          await chrome.downloads.download({ url: u, filename: name, saveAs: false, conflictAction: 'uniquify' });
          if (tmp) setTimeout(() => URL.revokeObjectURL(tmp), 8000);
          setStatus('图片已开始下载：' + name);
          setTimeout(() => setStatus(''), 2500);
        } catch (err) {
          setStatus('下载失败：' + ((err && err.message) || err));
          setTimeout(() => setStatus(''), 3500);
        }
      };
      bar.appendChild(btn);
      d.appendChild(bar);
    }
    const pre = document.createElement('pre');
    pre.className = 'out';
    const argKeys = Object.keys(args);
    const argLine = argKeys.length ? '参数  ' + JSON.stringify(args) : '';
    pre.textContent = (argLine ? argLine + '\n' : '') + prettyResult(rawResult);
    d.appendChild(pre);
  }
  return d;
}

/* ── 文件产物卡片 ─────────────────────────────────────── */

const fileCache = new Map(); // downloadId -> blob url

function humanSize(n) {
  n = Number(n) || 0;
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1024 / 1024).toFixed(1) + ' MB';
}

function fileGlyph(name) {
  const e = String(name).split('.').pop().toLowerCase();
  return { pdf: 'PDF', pptx: 'PPT', xlsx: 'XLS', docx: 'DOC' }[e] || 'FILE';
}

async function addFileCard(f) {
  const bin = atob(f.b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([arr], { type: f.mime }));
  // 只生成卡片，不自动下载：是否落盘由用户在卡片上决定
  fileCache.set('name:' + f.name, url);
  messages.push({
    role: 'file',
    file: { name: f.name, mime: f.mime, size: f.size, downloadId: '', pending: true }
  });
  render();
  persist();
}

function fileGroupNode(files) {
  const wrap = document.createElement('div');
  wrap.className = 'filegroup';
  const head = document.createElement('div');
  head.className = 'fg-head';
  head.textContent = '生成的文件';
  wrap.appendChild(head);
  const grid = document.createElement('div');
  grid.className = 'fg-grid';
  const PAGE = 4;
  let expanded = false;
  const paint = () => {
    grid.innerHTML = '';
    const list = expanded ? files : files.slice(0, PAGE);
    for (const f of list) grid.appendChild(fgItem(f));
  };
  paint();
  wrap.appendChild(grid);
  if (files.length > PAGE) {
    const exp = document.createElement('button');
    exp.type = 'button';
    exp.className = 'fg-expand';
    const setLabel = () => { exp.textContent = expanded ? '收起' : '展开查看剩余 ' + (files.length - PAGE) + ' 个文件'; };
    setLabel();
    exp.onclick = () => { expanded = !expanded; paint(); setLabel(); };
    wrap.appendChild(exp);
  }
  const tip = document.createElement('div');
  tip.className = 'fg-tip';
  tip.textContent = '文件已生成，点卡片右侧按钮下载';
  tip.onclick = () => { try { chrome.downloads.showDefaultFolder(); } catch (_) {} };
  wrap.appendChild(tip);
  return wrap;
}

function fgItem(file) {
  const el = document.createElement('div');
  el.className = 'fg-item';
  const ic = document.createElement('div');
  const ext = String(file.name).split('.').pop().toLowerCase();
  ic.className = 'fg-ico f-' + ext;
  ic.textContent = fileGlyph(file.name);
  const meta = document.createElement('div');
  meta.className = 'fg-meta';
  const nm = document.createElement('div');
  nm.className = 'fg-name';
  nm.textContent = file.name;
  nm.title = file.name;
  const sub = document.createElement('div');
  sub.className = 'fg-sub';
  sub.textContent = file.pending ? '待下载 · ' + humanSize(file.size)
    : file.failed ? '下载失败，点击右侧重试'
    : fileGlyph(file.name) + ' · ' + humanSize(file.size);
  if (file.failed) sub.style.color = '#d92b1f';
  meta.append(nm, sub);
  const dl = document.createElement('button');
  dl.type = 'button';
  dl.className = 'fg-dl';
  dl.title = file.pending ? '下载' : '打开下载文件';
  dl.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11"/><path d="M7 11l5 5 5-5"/><path d="M5 20h14"/></svg>';
  dl.onclick = async (e) => {
    e.stopPropagation();
    // 待下载：用户在卡片上点了才真正落盘
    if (file.pending) {
      const u = fileCache.get('name:' + file.name);
      if (!u) {
        setStatus('这个文件需要重新生成一次才能下载');
        setTimeout(() => setStatus(''), 3000);
        return;
      }
      try {
        const id = await chrome.downloads.download({ url: u, filename: file.name, saveAs: false, conflictAction: 'uniquify' });
        file.downloadId = id;
        file.pending = false;
        setStatus('已下载：' + file.name);
        setTimeout(() => setStatus(''), 2500);
        render();
        persist();
      } catch (err) {
        setStatus('下载失败：' + ((err && err.message) || err));
        setTimeout(() => setStatus(''), 3500);
      }
      return;
    }
    if (file.failed) {
      const u = fileCache.get(file.downloadId);
      if (u) {
        chrome.downloads.download({ url: u, filename: file.name, saveAs: false, conflictAction: 'uniquify' })
          .then(() => { setStatus('已重新下载：' + file.name); setTimeout(() => setStatus(''), 2500); })
          .catch((err) => { setStatus('下载失败：' + ((err && err.message) || err)); setTimeout(() => setStatus(''), 3500); });
      } else {
        setStatus('这不是本次运行生成的文件，请让 agent 重新生成');
      }
      return;
    }
    openFileFile(file, 'open');
  };
  el.append(ic, meta, dl);
  return el;
}

function feedbackNode() {
  const el = document.createElement('div');
  el.className = 'feedback';
  const t = document.createElement('div');
  t.className = 'fb-title';
  t.textContent = '本次任务完成得怎么样？';
  el.appendChild(t);
  const row = document.createElement('div');
  row.className = 'fb-row';
  for (const label of ['成功交付', '部分完成', '未完成']) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'fb-btn';
    b.textContent = label;
    b.onclick = (ev) => {
      if (ev) ev.stopPropagation();
      row.querySelectorAll('.fb-btn').forEach((x) => x.classList.remove('on'));
      b.classList.add('on');
      setStatus('已记录反馈：' + label);
      setTimeout(() => setStatus(''), 2000);
    };
    row.appendChild(b);
  }
  el.appendChild(row);
  return el;
}

function fileCardNode(file) {
  const el = document.createElement('div');
  el.className = 'filecard';

  const glyph = document.createElement('div');
  glyph.className = 'fico f-' + String(file.name).split('.').pop().toLowerCase();
  glyph.textContent = fileGlyph(file.name);

  const meta = document.createElement('div');
  meta.className = 'fmeta';
  const nm = document.createElement('div');
  nm.className = 'fname';
  nm.textContent = file.name;
  const sz = document.createElement('div');
  sz.className = 'fsize';
  sz.textContent = humanSize(file.size) + (file.downloadId ? '' : ' · 历史文件');
  meta.append(nm, sz);

  const acts = document.createElement('div');
  acts.className = 'facts';

  const open = document.createElement('button');
  open.className = 'fopen';
  open.textContent = '打开';
  open.onclick = (e) => { e.stopPropagation(); openFileFile(file, 'open'); };

  const more = document.createElement('button');
  more.className = 'fmore';
  more.textContent = '⋯';
  more.title = '更多操作';
  more.onclick = (e) => { e.stopPropagation(); openFileMenu(more, file); };

  acts.append(open, more);
  el.append(glyph, meta, acts);
  return el;
}

async function openFileFile(file, how) {
  if (!file.downloadId) {
    setStatus('这是历史记录里的文件，重新生成一次才能打开');
    return;
  }
  try {
    if (how === 'open') await chrome.downloads.open(file.downloadId);
    else chrome.downloads.show(file.downloadId);
  } catch (e) {
    setStatus('打不开：' + (e?.message || e));
  }
}

async function saveFileAs(file) {
  const url = fileCache.get(file.downloadId);
  if (!url) {
    setStatus('历史文件无法另存，请重新生成');
    return;
  }
  try {
    await chrome.downloads.download({ url, filename: file.name, saveAs: true });
  } catch (e) {
    setStatus('另存失败：' + (e?.message || e));
  }
}

async function copyFilePath(file) {
  let p = file.name;
  if (file.downloadId) {
    const [info] = await chrome.downloads.search({ id: file.downloadId });
    if (info?.filename) p = info.filename;
    chrome.downloads.show(file.downloadId);
  }
  try {
    await navigator.clipboard.writeText(p);
    setStatus('已复制：' + p);
  } catch (e) {
    setStatus('复制失败：' + (e?.message || e));
  }
}

function openFileMenu(anchor, file) {
  document.querySelectorAll('.pop.fpop').forEach((n) => n.remove());

  const pop = document.createElement('div');
  pop.className = 'pop fpop';

  const items = [
    ['打开文件夹', () => openFileFile(file, 'show')],
    ['在默认应用打开', () => openFileFile(file, 'open')],
    ['复制路径', () => copyFilePath(file)],
    ['另存为…', () => saveFileAs(file)],
    ['添加到对话框', () => {
      inpMsg.value = (inpMsg.value ? inpMsg.value + '\n' : '') + `[文件] ${file.name}`;
      inpMsg.focus();
    }]
  ];

  for (const [label, fn] of items) {
    const b = document.createElement('button');
    b.className = 'pop-item';
    b.textContent = label;
    b.onclick = () => { pop.remove(); fn(); };
    pop.appendChild(b);
  }

  document.body.appendChild(pop);
  placePop(pop, anchor, true);
}

let statusSince = Date.now();
let lastStatusText = '';
function render(forceToBottom) {
  closeMsgMenu();   // 重建 DOM 前先摘掉浮层菜单，否则它 fixed 在 body 上会漏到抽屉/新会话之上
  lastMsgCount = messages.length;
  // 记住“距底距离”：用户主动上翻看历史时，重建后不要把他拽回底部
  const fromBottom = chatEl.scrollHeight - chatEl.scrollTop - chatEl.clientHeight;
  chatEl.innerHTML = '';

  if (!messages.length) {
    chatEl.appendChild(welcomeNode());
    return;
  }

  const results = new Map();
  for (const m of messages) {
    if (m.role === 'tool') results.set(m.tool_call_id, m.content);
  }

  let pendingFiles = [];
  const flushFiles = () => {
    if (!pendingFiles.length) return;
    chatEl.appendChild(fileGroupNode(pendingFiles));
    pendingFiles = [];
  };
  let hasAssistant = false;
  for (let mi = 0; mi < messages.length; mi++) {
    const m = messages[mi];
    if (m.role === 'file') {
      pendingFiles.push(m.file);
      continue;
    }
    flushFiles();
    if (m.role === 'user') {
      const un = userNode(m);
      if (!m._live) un.appendChild(msgActions(mi));
      chatEl.appendChild(un);
    } else if (m.role === 'assistant') {
      hasAssistant = true;
      for (const tc of m.tool_calls || []) {
        chatEl.appendChild(toolNode(tc, results.get(tc.id)));
      }
      if (m._err) {
        chatEl.appendChild(errorNode(m.content, m._repeat));
      } else if (m._live || (m.reasoning && String(m.reasoning).trim()) || hasVisibleContent(m.content)) {
        const bn = botNode(m);
        if (!m._live) bn.appendChild(msgActions(mi));
        chatEl.appendChild(bn);
      }
    }
  }

  flushFiles();
  if (resumeStep > 0 && !running) {
    const bar = document.createElement('div');
    bar.className = 'resume-bar';
    bar.innerHTML = '<span>上次任务在关闭侧边栏时中断（第 ' + resumeStep + ' 轮），已保留上下文</span><button id="btnResume">继续任务</button>';
    bar.querySelector('#btnResume').onclick = () => continueRun();
    chatEl.appendChild(bar);
  }
  if (hasAssistant && !running && resumeStep === 0) chatEl.appendChild(feedbackNode());
  if (forceToBottom || fromBottom < 120) {
    chatEl.scrollTop = chatEl.scrollHeight;
  } else {
    chatEl.scrollTop = Math.max(0, chatEl.scrollHeight - chatEl.clientHeight - fromBottom);
  }
  if (inpFindEl.value.trim()) runFind(inpFindEl.value);
  pruneGhostBlocks(chatEl);
}

// 孤线清理闸：渲染后扫一遍消息流，删掉「几乎无高度且无任何文字」的顶层块。
// 生图轮模型会发多种形态的空消息（纯 --- / 纯空白 / 空 tool 结果），渲染出来都是
// 一条细线，用户当成杂线 bug；与其逐形态堵，不如渲染后统一清理（live 增量不受影响，
// 只在整树重建与轮次结束时跑）。
function pruneGhostBlocks(root) {
  for (const n of [...root.children]) {
    if (n.id === 'chat-empty' || n.classList.contains('welcome')) continue;
    const r = n.getBoundingClientRect();
    // 判据从「高度」改为「内容」：消息流里任何可见高度但既无文字也无图片/媒体的
    // 节点都是幽灵（空 hr、空壳容器），无论多高一律清掉；内容节点（含纯图片消息、
    // 工具卡、状态条）被 text/img 条件保护。流式空消息被删后 updateLive 会自动补回。
    if (r.height < 1) continue;
    if ((n.textContent || '').trim()) continue;
    if (n.querySelector('img,video,canvas')) continue;
    n.remove();
  }
}

/* 流式增量更新：只改最后一条消息里的文本，不重建 DOM（避免闪烁） */
function updateLive(msg) {
  const id = msg._id || midOf(msg);
  let node = chatEl.querySelector('[data-mid="' + id + '"]');
  if (!node || !node.classList.contains('msg-bot')) {
    // 不再为一条消息重建整个对话：长历史下 render() 要重算几万字，
    // 正文就会卡住好几秒才出现。这里只补一个空节点，下面按增量填充。
    node = document.createElement('div');
    node.className = 'msg-bot';
    node.dataset.mid = id;
    const fb = chatEl.querySelector('.feedback');
    if (fb) chatEl.insertBefore(node, fb);
    else chatEl.appendChild(node);
  }

  // 只把新增的尾巴 append 进节点，避免每帧整段替换导致文字闪
  const streamAppend = (el, text) => {
    if (!el) return;
    const prev = Number(el.dataset.streamLen || 0);
    if (text.length > prev) {
      const add = text.slice(prev);
      const last = el.lastChild;
      // 合并进最后一个文本节点：长期流式时避免堆积成百上千个 TextNode
      if (last && last.nodeType === 3) last.appendData(add);
      else el.appendChild(document.createTextNode(add));
    } else if (text.length < prev) {
      el.textContent = text;
    }
    el.dataset.streamLen = text.length;
  };

  // 空白思考不建壳不追加（否则出现只有标题没有内容的空思考块）
  if (msg.reasoning && String(msg.reasoning).trim()) {
    let think = node.querySelector('.think');
    let body = null;
    if (!think) {
      think = thinkNode('', false);
      node.insertBefore(think, node.firstChild);
      body = think.querySelector('.think-body');
      // 从第一条思考出现开始计时
      think._thinkStart = Date.now();
      tickThink(think, () => msg.reasoning, think._thinkStart);
    }
    body = think.querySelector('.think-body');
    streamAppend(body, msg.reasoning);
  }

  if (msg.content && hasVisibleContent(msg.content)) {
    // 一旦开始出正文，这一轮思考就结束了：自动折叠思考块（省地方，用户想看可点开）
    // 注意：工具轮次正文为空不会走到这里，思考保持展开
    {
      const tk = node.querySelector('.think');
      if (tk) {
        const secs = Math.max(0, Math.round((Date.now() - (tk._thinkStart || Date.now())) / 1000));
        const el = tk.querySelector('[data-elapse]');
        if (el) el.dataset.done = secs < 1 ? '0s' : (secs < 60 ? secs + 's' : Math.floor(secs/60)+'m'+(secs%60)+'s');
        stopTickThink(tk);
        if (!tk.classList.contains('collapsed')) tk.classList.add('collapsed');
        fillBriefIfEmpty(tk);
      }
    }
    let md = node.querySelector('.bot-md');
    if (!md) {
      md = document.createElement('div');
      md.className = 'bot-md';
      node.appendChild(md);
    }
    if (msg._live) {
      md.classList.add('streaming');
      streamAppend(md, msg.content);
    } else {
      md.classList.remove('streaming');
      md.innerHTML = mdToHtml(msg.content);
    }
  }

  if (stickBottom) chatEl.scrollTop = chatEl.scrollHeight;
  pruneGhostBlocks(chatEl);
}

/* ══ UI ═══════════════════════════════════════════════════ */

let provState = { list: [], active: '' };

async function loadSettings() {
  const { list, active } = await loadProviders();
  provState = { list, active };
  const s = await chrome.storage.local.get(['mcp', 'reasoningEffort', 'imageModel']);
  mcpServers = (Array.isArray(s.mcp) ? s.mcp : []).map(normalizeMcp).filter(Boolean);
  renderProvList();
  const cur = list.find((x) => x.id === active) || list[0];
  const curModel = cur.model || DEFAULT_MODEL;
  modelTag.textContent = curModel.replace(/^cn:/, '');
  modelTag.title = curModel;
  await loadGenSettings(curModel);
}

/* 生成与思考：档位下拉按当前模型真实支持的档位填充，避免选了不支持的档被静默降级 */
async function loadGenSettings(curModel) {
  // 生图模型预设（网关目前只有 hunyuan-image-v3.0 可用，其余保留供以后直接填）
  const dl = $('imageModelPresets');
  if (dl) {
    dl.innerHTML = '';
    IMAGE_MODEL_PRESETS.forEach((m) => {
      const o = document.createElement('option');
      o.value = m;
      dl.appendChild(o);
    });
  }
  const st = await chrome.storage.local.get(['reasoningEffort', 'imageModel', 'imgBase', 'imgKey']);
  $('inpImageModel').value = String(st.imageModel || DEFAULT_IMAGE_MODEL);
  $('inpImgBase').value = String(st.imgBase || '');
  $('inpImgKey').value = String(st.imgKey || '');

  const sel = $('selEffort');
  const saved = String(st.reasoningEffort || '');
  // 先保证模型元数据可用：打开设置时顺手拉一次，失败也不阻塞
  if (!modelMeta[curModel]) await fetchModels();
  const efforts = (modelMeta[curModel] || {}).efforts || [];
  sel.innerHTML = '<option value="">跟随模型默认</option>';
  efforts.forEach((e) => {
    const o = document.createElement('option');
    o.value = e;
    o.textContent = EFFORT_LABEL[e] || e;
    sel.appendChild(o);
  });
  // 当前模型不支持已存档位时不强行选中，交由请求侧跳过
  sel.value = efforts.includes(saved) ? saved : '';
  const hint = $('effortHint');
  if (hint) {
    hint.textContent = efforts.length
      ? '当前模型 ' + curModel.replace(/^cn:/, '') + ' 支持：' + efforts.join(' / ') + '。档位越高思考越长、也越慢。'
      : '尚未读到 ' + curModel.replace(/^cn:/, '') + ' 的档位信息（填好 API Key 并保存后会自动读取）。';
  }
}

function renderProvList() {
  provList.innerHTML = '';
  provState.list.forEach((p) => {
    const card = document.createElement('div');
    card.className = 'prov' + (p.id === provState.active ? ' on' : '');
    card.dataset.id = p.id;

    const head = document.createElement('div');
    head.className = 'prov-head';
    head.innerHTML = '<div class="prov-main"><span class="prov-dot"></span><div class="prov-info"><span class="prov-name"></span><span class="prov-meta"><span class="prov-tag"></span><span class="prov-status"></span></span></div></div><button class="prov-edit">编辑</button>'
      + (provState.list.length > 1 ? '<button class="prov-del">删除</button>' : '');
    head.querySelector('.prov-name').textContent = p.name;
    head.querySelector('.prov-tag').textContent = p.id === 'workbuddy' ? '本机' : '自定义';
    head.querySelector('.prov-status').textContent = p.id === provState.active ? '已连接' : '';

    const body = document.createElement('div');
    body.className = 'prov-body hidden';
    body.innerHTML = '<label>显示名称</label><input data-f="name" type="text">'
      + '<label>API 密钥</label><input data-f="apiKey" type="password" autocomplete="off" placeholder="已配置——输入新值可替换">'
      + '<label>API 地址</label><input data-f="baseUrl" type="text">'
      + '<label>API 协议</label><select data-f="protocol"><option value="openai">OpenAI Chat Completions</option></select>'
      + '<label>模型</label><div class="model-row"><input data-f="model" type="text" placeholder="cn:deepseek-v4.1-flash"><button class="ghost-btn prov-fetch">获取模型</button><div class="model-pick hidden"></div></div>';
    body.querySelector('[data-f=name]').value = p.name;
    body.querySelector('[data-f=apiKey]').value = p.apiKey;
    body.querySelector('[data-f=baseUrl]').value = p.baseUrl;
    body.querySelector('[data-f=protocol]').value = p.protocol;
    body.querySelector('[data-f=model]').value = p.model || '';
    const miEl = body.querySelector('[data-f=model]');
    const pickEl = body.querySelector('.model-pick');
    miEl.addEventListener('focus', () => { if (pickEl.children.length) pickEl.classList.remove('hidden'); });
    miEl.addEventListener('blur', () => setTimeout(() => pickEl.classList.add('hidden'), 140));

    body.querySelector('.prov-fetch').addEventListener('click', async (ev) => {
      const btn = ev.currentTarget;
      const base = (body.querySelector('[data-f=baseUrl]').value.trim() || DEFAULT_BASE).replace(/\/+$/, '');
      const key = body.querySelector('[data-f=apiKey]').value.trim();
      const mi = body.querySelector('[data-f=model]');
      const pick = body.querySelector('.model-pick');
      btn.disabled = true;
      setStatus('正在获取模型列表…');
      try {
        const r = await fetch(base + '/models', { headers: key ? { Authorization: 'Bearer ' + key } : {} });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const j = await r.json();
        const ids = (j.data || j.models || []).map((x) => x.id || x.name).filter(Boolean);
        pick.innerHTML = '';
        ids.forEach((id) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.textContent = id;
          if (id === mi.value.trim()) b.classList.add('on');
          b.addEventListener('mousedown', (e) => {
            e.preventDefault();
            mi.value = id;
            pick.classList.add('hidden');
          });
          pick.appendChild(b);
        });
        if (ids.length) pick.classList.remove('hidden');
        if (ids.length && !mi.value.trim()) mi.value = ids[0];
        setStatus(ids.length ? '已获取 ' + ids.length + ' 个模型，点下拉选择' : '网关没有返回模型');
      } catch (err) {
        setStatus('获取失败：' + (err.message || err));
      } finally {
        btn.disabled = false;
        setTimeout(() => setStatus(''), 4200);
      }
    });

    head.addEventListener('click', (e) => {
      if (e.target.closest('.prov-del')) {
        provState.list = provState.list.filter((x) => x.id !== p.id);
        if (provState.active === p.id) provState.active = provState.list[0].id;
        renderProvList();
        return;
      }
      if (e.target.closest('.prov-edit')) { body.classList.toggle('hidden'); return; }
      provState.active = p.id;
      renderProvList();
    });

    card.appendChild(head);
    card.appendChild(body);
    provList.appendChild(card);
  });
}

$('btnProvAdd').addEventListener('click', () => {
  provState.list.push({ id: uid(), name: '新提供商', baseUrl: DEFAULT_BASE, apiKey: '', protocol: 'openai' });
  renderProvList();
  const last = provList.lastElementChild;
  if (last) {
    last.querySelector('.prov-body').classList.remove('hidden');
    last.scrollIntoView({ block: 'nearest' });
  }
});

$('btnSettings').addEventListener('click', () => {
  settingsEl.classList.toggle('hidden');
  if (!settingsEl.classList.contains('hidden')) loadSettings();
});

/* 获取模型按钮已移进每个提供商卡片 */

$('btnSave').addEventListener('click', async () => {
  const cards = [...provList.querySelectorAll('.prov')];
  const list = cards.map((c) => ({
    id: c.dataset.id,
    name: c.querySelector('[data-f=name]').value.trim() || '未命名提供商',
    apiKey: c.querySelector('[data-f=apiKey]').value.trim().replace(/\s+/g, ''),
    baseUrl: (c.querySelector('[data-f=baseUrl]').value.trim() || DEFAULT_BASE).replace(/\/+$/, ''),
    protocol: c.querySelector('[data-f=protocol]').value,
    model: c.querySelector('[data-f=model]').value.trim()
  }));
  await chrome.storage.local.set({
    providers: list,
    activeProvider: provState.active,
    mcp: mcpServers,
    reasoningEffort: $('selEffort').value,
    imageModel: $('inpImageModel').value.trim() || DEFAULT_IMAGE_MODEL,
    imgBase: $('inpImgBase').value.trim(),
    imgKey: $('inpImgKey').value.trim()
  });
  provState.list = list;
  modelIds = [];
  const p = list.find((x) => x.id === provState.active) || list[0];
  const showModel = p.model || DEFAULT_MODEL;
  modelTag.textContent = showModel.replace(/^cn:/, '');
  modelTag.title = showModel;
  setStatus('校验 Key…');
  try {
    const r = await fetch(p.baseUrl + '/models', { headers: p.apiKey ? { Authorization: 'Bearer ' + p.apiKey } : {} });
    if (r.ok) {
      setStatus('已保存，连接正常（' + p.name + '）');
      settingsEl.classList.add('hidden');
    } else {
      setStatus('Key 校验失败 HTTP ' + r.status);
      pushError('网关返回 ' + r.status + '：' + (await r.text().catch(() => '')).slice(0, 160));
      render();
    }
  } catch (e) {
    setStatus('连不上网关');
    pushError('连不上 ' + p.baseUrl + '：' + (e.message || e));
    render();
  }
  setTimeout(() => setStatus(''), 5000);
});

function send() {
  if (running) {
    // 运行中：输入框有内容说明用户想发新消息，不能静默变成「停止任务」（那样消息就吞了）
    if ((inpMsg.value || '').trim()) {
      setStatus('任务还在运行，先点停止或等它结束');
      setTimeout(() => { if (/任务还在运行/.test(statusEl.textContent || '')) setStatus(''); }, 2500);
      return;
    }
    stopRun();
    return;
  }
  if (/准备中/.test(statusEl.textContent || '')) setStatus('');
  const text = inpMsg.value.trim();
  if (!text && !quoteRefs.length && !pendingShot) return;
  const prefix = quoteRefs.map((q) => q.content).join('\n\n');
  const img = pendingShot;
  const quotes = quoteRefs.map((q) => ({
    label: q.label || '',
    kind: (q.meta || {}).kind || '',
    url: (q.meta || {}).url || '',
  }));
  clearQuotes();
  inpMsg.value = '';
  inpMsg.style.height = 'auto';
  // 单进程执行：任务跑在侧边栏自身，不再经 offscreen 跨进程同步——消息/状态不会再错位
  runAgent(((prefix ? prefix + '\n\n' : '') + text).trim(), img, { display: text, quotes });
}

btnSend.addEventListener('click', send);

inpMsg.addEventListener('keydown', (e) => {
  // 中文输入法按 Enter 是「选词上屏」，不是发送：组合期间 isComposing 为 true / keyCode 为 229。
  // 不加这道守卫的话，打字打到一半按 Enter 选词会把半成品直接发出去。
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229) {
    e.preventDefault();
    send();
  }
});

inpMsg.addEventListener('input', () => {
  inpMsg.style.height = 'auto';
  inpMsg.style.height = Math.min(inpMsg.scrollHeight, 132) + 'px';
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  syncAutoQuote();
  if (attachedTabId !== null && attachedTabId !== tabId) {
    try { await chrome.debugger.detach({ tabId: attachedTabId }); } catch (_) {}
    attachedTabId = null;
  }
});

chrome.tabs.onUpdated.addListener((tid, info, tab) => {
  if (info.status === 'complete') {
    chrome.tabs.query({ active: true, currentWindow: true }).then(([a]) => {
      if (a && a.id === tid) syncAutoQuote();
    });
  }
});

window.addEventListener('unload', () => {
  if (attachedTabId !== null) chrome.debugger.detach({ tabId: attachedTabId }).catch(() => {});
});

/* ══ 会话持久化（历史 / 目录 / 搜索）══════════════════════ */

const SESS_LIMIT = 100;

let recentSessions = [];
async function loadSessions() {
  // IndexedDB 优先：chrome.storage 单条 10MB 上限，长思考/图片一多就写失败丢消息
  try {
    // 收藏记录（fav:true）不是对话：拆出去，绝不进历史列表 / 搜索 / 批量删除
    let rows = splitFavs(await window.YZDB.list());
    if (!rows.length) {
      const o = await chrome.storage.local.get('sessions');
      const old = Array.isArray(o.sessions) ? o.sessions : [];
      if (old.length) {
        await window.YZDB.putMany(old);
        try { await chrome.storage.local.remove('sessions'); } catch (_) {}
        rows = old.filter((r) => !r.fav).sort((a, b) => (b.at || 0) - (a.at || 0));
      }
    }
    recentSessions = rows;
    return rows;
  } catch (e) {
    const o = await chrome.storage.local.get('sessions');
    recentSessions = Array.isArray(o.sessions) ? o.sessions : [];
    return recentSessions;
  }
}
async function saveSessions(list) {
  try { await window.YZDB.putMany(list); }
  catch (e) { await chrome.storage.local.set({ sessions: list }); }
}
function sessionTitle(msgs) {
  const u = msgs.find((m) => m.role === 'user');
  let t = '';
  if (u?.display) t = String(u.display);
  if (!t && typeof u?.content === 'string') t = u.content;
  if (!t && Array.isArray(u?.content)) t = (u.content.find((p) => p.type === 'text')?.text || '');
  t = t.replace(/【引用(?:文件|标签页)[：:][^】]*】/g, ' ').replace(/\s+/g, ' ').trim();
  return t.slice(0, 46) || '新对话';
}

let persistTimer = null;
function persist() {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(async () => {
    if (!messages.length) return;
    const rec = { id: sessionId, title: sessionTitle(messages), at: Date.now(), messages, host: await pageHost() };
    // 只写当前会话，不再整表覆盖
    try { await window.YZDB.put(rec); }
    catch (e) {
      const list = await loadSessions();
      await saveSessions([rec, ...list.filter((s) => s.id !== sessionId)].slice(0, SESS_LIMIT));
    }
    try { await chrome.storage.local.set({ lastSessionId: sessionId }); } catch (_) {}
  }, 300);
}

function newSession() {
  if (running) {
    if (!window.confirm('任务还在运行，新建对话会中断它。确定要新建吗？')) return;
    stopRun();
  }
  sessionId = Date.now().toString(36);
  lastStreamSeq = 0;
  messages = [];
  lastShot = null;
  setDot('idle');
  setStatus('');
  closeDrawer();
  render();
}

async function openSession(id) {
  // 后台任务属于原会话：切走只换 UI，不中断它（重开原会话时按 sessionId 恢复进度）
  const list = await loadSessions();
  const rec = list.find((s) => s.id === id);
  if (!rec) return;
  sessionId = rec.id;
  lastStreamSeq = 0;   // 新会话的增量包从 1 开始，旧 seq 会把新流式全挡掉
  messages = rec.messages || [];
  lastShot = null;
  closeDrawer();
  render();
  // 状态条跟随目标会话：有后台任务就显示进度，否则清空
  const { agentRun } = await chrome.storage.local.get('agentRun');
  running = !!(agentRun && agentRun.sessionId === sessionId && agentRun.running);
  backgroundMode = running;
  setSendMode(running ? 'stop' : 'send');
  setStatus(running ? (agentRun.status || '') : '');
  setDot(running ? 'busy' : 'idle');
}

function sessTime(at) {
  const d = new Date(at || 0);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  return (d.getMonth() + 1) + '月' + d.getDate() + '日';
}

async function pageHost() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab && tab.url ? new URL(tab.url).host : '';
  } catch (_) {
    return '';
  }
}

let drawerBatchMode = false;
let drawerSel = new Set();

function sessRow(s) {
  const row = document.createElement('div');
  row.className = 'sess' + (s.id === sessionId ? ' on' : '') + (drawerBatchMode && drawerSel.has(s.id) ? ' picked' : '');
  if (drawerBatchMode) {
    const cb = document.createElement('span');
    cb.className = 'sess-cb' + (drawerSel.has(s.id) ? ' on' : '');
    cb.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>';
    row.appendChild(cb);
  }

  const t = document.createElement('span');
  t.className = 'sess-t';
  const shown = (Array.isArray(s.messages) && s.messages.length && /^【引用/.test(String(s.title || '')))
    ? sessionTitle(s.messages)
    : (s.title || '新对话');
  t.textContent = shown;
  t.title = shown;

  const d = document.createElement('span');
  d.className = 'sess-d';
  d.textContent = sessTime(s.at);

  const more = document.createElement('button');
  more.type = 'button';
  more.className = 'sess-more';
  more.setAttribute('aria-label', '更多操作');
  more.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></svg>';
  more.addEventListener('click', (e) => { e.stopPropagation(); openSessMenu(more, s); });

  row.append(t, d, more);
  row.addEventListener('click', () => {
    if (drawerBatchMode) {
      drawerSel.has(s.id) ? drawerSel.delete(s.id) : drawerSel.add(s.id);
      const batch = document.getElementById('drawerBatch');
      const cnt = document.getElementById('dbCount');
      if (cnt) cnt.textContent = '已选 ' + drawerSel.size;
      renderDrawer(document.getElementById('inpSearch').value);
      return;
    }
    openSession(s.id);
  });
  return row;
}

function sessGroup(title, rows, rowFn = sessRow) {
  const box = document.createElement('div');
  box.className = 'sess-group';

  const head = document.createElement('div');
  head.className = 'sess-group-head';
  head.innerHTML = '<span>' + title + '</span><svg class="g-chev" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 15l6-6 6 6"/></svg>';
  head.addEventListener('click', () => box.classList.toggle('closed'));

  const list = document.createElement('div');
  list.className = 'sess-group-list';
  for (const s of rows) list.appendChild(rowFn(s));

  box.append(head, list);
  return box;
}

function closeSessMenu() {
  const m = document.getElementById('sessMenu');
  if (m) m.remove();
}

/* ── 收藏行：历史抽屉「⭐ 收藏」分组用（不是会话，点击＝复制内容）── */
function favRow(f) {
  const row = document.createElement('div');
  row.className = 'sess';

  const t = document.createElement('span');
  t.className = 'sess-t';
  const title = String(f.title || f.text || '收藏').replace(/\s+/g, ' ').trim() || '收藏';
  t.textContent = title;
  t.title = String(f.text || title).slice(0, 300);

  const d = document.createElement('span');
  d.className = 'sess-d';
  d.textContent = sessTime(f.at);

  const more = document.createElement('button');
  more.className = 'sess-more';
  more.type = 'button';
  more.setAttribute('aria-label', '更多操作');
  more.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></svg>';
  more.addEventListener('click', (e) => { e.stopPropagation(); openFavMenu(more, f); });

  row.append(t, d, more);
  row.addEventListener('click', async (e) => {
    if (e.target.closest('.sess-more')) return;
    try {
      await navigator.clipboard.writeText(String(f.text || ''));
      setStatus('已复制收藏内容');
      setTimeout(() => { if (/已复制收藏内容/.test(statusEl.textContent)) setStatus(''); }, 1600);
    } catch (_) { setStatus('复制失败'); }
  });
  return row;
}

function openFavMenu(anchor, f) {
  closeSessMenu();
  const m = document.createElement('div');
  m.className = 'sess-menu';
  m.id = 'sessMenu';

  const del = document.createElement('button');
  del.className = 'sess-menu-item danger';
  del.textContent = '删除收藏';
  del.addEventListener('click', async () => {
    closeSessMenu();
    try { await window.YZDB.del(f.id); } catch (_) {}
    favIds.delete(f.id);
    favRows = favRows.filter((r) => r.id !== f.id);
    renderDrawer(document.getElementById('inpSearch').value);
  });

  m.appendChild(del);
  document.body.appendChild(m);

  const r = anchor.getBoundingClientRect();
  const w = m.offsetWidth || 132;
  m.style.left = Math.max(8, Math.min(r.right - w, innerWidth - w - 8)) + 'px';
  m.style.top = Math.round(r.bottom + 4) + 'px';

  const node = m;
  const off = (ev) => {
    if (node && !node.contains(ev.target)) { closeSessMenu(); document.removeEventListener('mousedown', off, true); }
  };
  setTimeout(() => document.addEventListener('mousedown', off, true), 0);
}

function openSessMenu(anchor, rec) {
  closeSessMenu();
  const m = document.createElement('div');
  m.id = 'sessMenu';
  m.className = 'sess-menu';

  const del = document.createElement('button');
  del.type = 'button';
  del.className = 'sess-menu-item danger';
  del.textContent = '删除对话';
  del.addEventListener('click', async () => {
    closeSessMenu();
    await deleteSession(rec.id);
    renderDrawer(inpSearch.value);
  });

  m.appendChild(del);
  document.body.appendChild(m);

  const r = anchor.getBoundingClientRect();
  const w = m.offsetWidth || 132;
  m.style.left = Math.max(8, Math.min(r.right - w, innerWidth - w - 8)) + 'px';
  m.style.top = Math.round(r.bottom + 4) + 'px';

  const off = (ev) => {
    const node = document.getElementById('sessMenu');
    if (node && !node.contains(ev.target)) {
      closeSessMenu();
      document.removeEventListener('mousedown', off, true);
    }
  };
  setTimeout(() => document.addEventListener('mousedown', off, true), 0);
}

async function deleteSession(id) {
  try { await window.YZDB.del(id); } catch (_) {}
  if (id === sessionId) {
    sessionId = Date.now().toString(36);
    messages = [];
    lastShot = null;
    setDot('idle');
    setStatus('');
    render();
  }
}

async function renderDrawer(q = '') {
  const list = await loadSessions();
  const kw = String(q || '').trim().toLowerCase();
  const shown = kw
    ? list.filter((s) =>
        String(s.title || '').toLowerCase().includes(kw) ||
        JSON.stringify(s.messages || []).toLowerCase().includes(kw))
    : list;

  // 收藏单独一组：不进「全部对话」/批量管理，也不会被会话搜索当成空白对话
  const favs = kw
    ? favRows.filter((f) => String(f.text || '').toLowerCase().includes(kw) ||
        String(f.title || '').toLowerCase().includes(kw))
    : favRows;

  sessionListEl.innerHTML = '';
  if (!shown.length && !favs.length) {
    const e = document.createElement('div');
    e.className = 'sess-empty';
    e.textContent = kw ? '没有匹配的对话' : '还没有历史对话';
    sessionListEl.appendChild(e);
    return;
  }

  const db = document.getElementById('drawerBatch');
  if (db) {
    db.classList.toggle('hidden', !drawerBatchMode || !shown.length);
    const cnt = document.getElementById('dbCount');
    if (cnt) cnt.textContent = '已选 ' + drawerSel.size;
    const all = document.getElementById('cbDrawerAll');
    if (all) all.checked = shown.length > 0 && shown.every((s) => drawerSel.has(s.id));
  }
  const mg = document.getElementById('btnDrawerManage');
  if (mg) mg.classList.toggle('hidden', drawerBatchMode || !shown.length);

  const host = await pageHost();
  const related = host ? shown.filter((s) => s.host === host) : [];

  if (related.length) sessionListEl.appendChild(sessGroup('与当前页面相关对话', related));
  if (favs.length) sessionListEl.appendChild(sessGroup('⭐ 收藏', favs, favRow));
  if (shown.length) sessionListEl.appendChild(sessGroup('全部对话', shown));
}

function closePops() {
  closeMsgMenu();
  modelMenu.classList.add('hidden');
  skillMenu.classList.add('hidden');
  quoteMenu.classList.add('hidden');
  closeMcpPanel();
  closeDrawer();
}

async function drawerBatchDelete() {
  if (!drawerSel.size) return;
  const list = await loadSessions();
  const del = new Set(drawerSel);
  // 不能走 saveSessions(list.filter(...))：它底层是 putMany，只写不删，
  // 被过滤掉的会话仍原封不动留在库里，批量删除会静默失效（界面刷新后又全回来）。
  try {
    await Promise.all([...del].map((id) => window.YZDB.del(id)));
  } catch (e) {
    // IndexedDB 不可用时退回全量覆盖写回
    try { await chrome.storage.local.set({ sessions: list.filter((s) => !del.has(s.id)) }); } catch (_) {}
  }
  drawerSel.clear();
  if (del.has(sessionId)) {
    sessionId = Date.now().toString(36);
    messages = [];
    lastShot = null;
    setDot('idle');
    setStatus('');
    render();
  }
  await renderDrawer(document.getElementById('inpSearch').value);
}
function drawerBatchExit() {
  drawerBatchMode = false;
  drawerSel.clear();
  document.getElementById('drawerBatch')?.classList.add('hidden');
  document.getElementById('btnDrawerManage')?.classList.remove('hidden');
  renderDrawer(document.getElementById('inpSearch').value);
}
document.getElementById('btnDrawerManage')?.addEventListener('click', () => {
  drawerBatchMode = true;
  drawerSel.clear();
  closeSessMenu();
  renderDrawer(document.getElementById('inpSearch').value);
});
document.getElementById('btnDrawerDone')?.addEventListener('click', drawerBatchExit);
document.getElementById('cbDrawerAll')?.addEventListener('change', async (e) => {
  const list = await loadSessions();
  const kw = String(document.getElementById('inpSearch').value || '').trim().toLowerCase();
  const shown = kw
    ? list.filter((s) => String(s.title || '').toLowerCase().includes(kw) || JSON.stringify(s.messages || []).toLowerCase().includes(kw))
    : list;
  if (e.target.checked) shown.forEach((s) => drawerSel.add(s.id));
  else drawerSel.clear();
  renderDrawer(document.getElementById('inpSearch').value);
});
document.getElementById('btnDrawerDelete')?.addEventListener('click', () => {
  const n = drawerSel.size;
  if (!n) return;
  if (confirm('确定删除选中的 ' + n + ' 个对话？删除后不可恢复。')) drawerBatchDelete();
});

async function openDrawer() {
  closeMsgMenu();   // 抽屉是全屏浮层，消息菜单（fixed z-index 9999）不能留在它上面
  modelMenu.classList.add('hidden');
  skillMenu.classList.add('hidden');
  quoteMenu.classList.add('hidden');
  closeMcpPanel();
  scrimEl.classList.remove('hidden');
  drawerEl.classList.remove('hidden');
  inpSearch.value = '';
  await renderDrawer('');
  setTimeout(() => inpSearch.focus(), 30);
}
function closeDrawer() {
  scrimEl.classList.add('hidden');
  drawerEl.classList.add('hidden');
  drawerBatchExit();
}

/* ══ 模型切换 ═════════════════════════════════════════════ */

async function fetchModels() {
  const { apiKey, baseUrl } = await readConf();
  if (!apiKey) return [];
  try {
    const r = await fetch(baseUrl + '/models', { headers: { Authorization: 'Bearer ' + apiKey } });
    if (!r.ok) return [];
    const j = await r.json();
    // 顺手把每个模型支持的思考档位记下来，供设置面板与请求体使用
    (j.data || []).forEach((x) => {
      if (!x || !x.id) return;
      modelMeta[x.id] = {
        efforts: Array.isArray(x.reasoning_supported_efforts) ? x.reasoning_supported_efforts.slice() : [],
        canDisable: !!x.can_disable_thinking
      };
    });
    return (j.data || []).map((x) => x.id).filter(Boolean);
  } catch (_) {
    return [];
  }
}

function placePop(el, anchor, preferBelow) {
  const r = anchor.getBoundingClientRect();
  const below = preferBelow && (window.innerHeight - r.bottom) >= 220;
  el.style.left = 'auto';
  el.style.right = Math.max(8, window.innerWidth - r.right) + 'px';
  if (below) { el.style.top = r.bottom + 6 + 'px'; el.style.bottom = 'auto'; }
  else { el.style.top = 'auto'; el.style.bottom = (window.innerHeight - r.top + 6) + 'px'; }
}

async function openModelMenu() {
  closePops();
  const { model } = await readConf();
  modelMenu.innerHTML = '<div class="pop-empty">读取模型…</div>';
  modelMenu.classList.remove('hidden');
  placePop(modelMenu, modelTag, true);

  if (!modelIds.length) modelIds = await fetchModels();
  modelMenu.innerHTML = '';

  if (!modelIds.length) {
    const e = document.createElement('div');
    e.className = 'pop-empty';
    e.textContent = '网关没返回模型列表，先在 ⚙ 里填对 Key';
    modelMenu.appendChild(e);
    return;
  }

  const search = document.createElement('div');
  search.className = 'pop-search';
  const si = document.createElement('input');
  si.type = 'search';
  si.placeholder = '搜索模型…';
  search.appendChild(si);
  modelMenu.appendChild(search);

  const body = document.createElement('div');
  body.className = 'pop-body';
  modelMenu.appendChild(body);

  const paint = (q) => {
    body.innerHTML = '';
    const hits = q ? modelIds.filter((id) => id.toLowerCase().includes(q)) : modelIds;
    if (!hits.length) {
      const e = document.createElement('div');
      e.className = 'pop-empty';
      e.textContent = '没有匹配的模型';
      body.appendChild(e);
      return;
    }
    for (const id of hits) {
      const b = document.createElement('button');
      b.className = 'pop-item' + (id === model ? ' on' : '');
      const n = document.createElement('span');
      n.textContent = id;
      b.appendChild(n);
      if (id === model) {
        const ck = document.createElement('span');
        ck.className = 'ck';
        ck.textContent = '✓';
        b.appendChild(ck);
      }
      b.addEventListener('click', async () => {
        const { list, active } = await loadProviders();
        const idx = list.findIndex((x) => x.id === active);
        if (idx >= 0) {
          list[idx].model = id;
          await chrome.storage.local.set({ providers: list });
        }
        modelTag.textContent = id.replace(/^cn:/, '');
        modelTag.title = id;
        modelMenu.classList.add('hidden');
        setStatus('模型已切换：' + id);
        setTimeout(() => setStatus(''), 2200);
        // 换模型后支持的思考档位会变，设置面板正开着就同步一下
        if (settingsEl && !settingsEl.classList.contains('hidden')) loadGenSettings(id);
      });
      body.appendChild(b);
    }
  };

  si.addEventListener('input', () => paint(si.value.trim().toLowerCase()));
  paint('');
  setTimeout(() => si.focus(), 30);
}

/* ══ MCP（Streamable HTTP JSON-RPC）═══════════════════════ */

let mcpSeq = 1;

function guessMcpName(url) {
  try {
    const u = new URL(url);
    return u.hostname + (u.pathname && u.pathname !== '/' ? u.pathname : '');
  } catch (_) {
    return String(url).slice(0, 32);
  }
}

function normalizeMcp(v) {
  if (!v) return null;
  if (typeof v === 'string') {
    const url = v.trim();
    if (!url) return null;
    return { name: guessMcpName(url), url, headers: [] };
  }
  const url = String(v.url || '').trim();
  if (!url) return null;
  const headers = (Array.isArray(v.headers) ? v.headers : [])
    .map((h) => ({
      key: String((h && h.key) != null ? h.key : ((h && h.name) || '')).trim(),
      value: String((h && h.value) != null ? h.value : '').trim()
    }))
    .filter((h) => h.key);
  return { name: String(v.name || '').trim() || guessMcpName(url), url, headers };
}

function mcpHeaderObject(server) {
  const h = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' };
  for (const x of ((server && server.headers) || [])) if (x.key) h[x.key] = x.value;
  return h;
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

async function loadMcp() {
  mcpTools = [];
  if (!mcpServers.length) return;
  for (const srv of mcpServers) {
    try {
      const tools = await connectMcp(srv);
      mcpTools = mcpTools.concat(tools);
    } catch (e) {
      setStatus('MCP 连不上：' + srv.url + '（' + ((e && e.message) || e) + '）');
      setTimeout(() => setStatus(''), 4000);
    }
  }
  if (mcpTools.length) {
    setStatus(`MCP 已连接 ${mcpTools.length} 个工具`);
    setTimeout(() => setStatus(''), 3000);
  }
}

/* ══ MCP 配置面板 ═══════════════════════════════════════ */

const mcpPanel = $('mcpPanel');
const mcpListEl = $('mcpList');
const mcpModal = $('mcpModal');
const mcpNameEl = $('mcpName');
const mcpUrlEl = $('mcpUrl');
const mcpHeadersEl = $('mcpHeaders');

let mcpEditing = -1;
let mcpTab = 'form';
let mcpTabName = 'all';

const MCP_RECOMMENDED = [
  { name: '智谱开源仓库 MCP', url: 'https://open.bigmodel.cn/api/mcp/zread/mcp', desc: '智谱官方 MCP，提供开源仓库内容获取能力。' },
  { name: '麦当劳 MCP', url: 'https://mcp.mcd.cn/mcp', desc: '麦当劳中国官方 MCP，支持麦乐送点餐、优惠券、积分、活动日历、营养信息等能力。' }
];

function openMcpPanel() {
  modelMenu.classList.add('hidden');
  skillMenu.classList.add('hidden');
  quoteMenu.classList.add('hidden');
  closeDrawer();
  mcpPanel.classList.remove('hidden');
  renderMcpList();
}

function closeMcpPanel() {
  mcpPanel.classList.add('hidden');
}

function mcpToolCount(server) {
  return mcpTools.filter((t) => t._mcp && t._mcp.server === server).length;
}

function mcpAdded(url) {
  return mcpServers.some((srv) => srv.url === url);
}

async function persistMcp() {
  await chrome.storage.local.set({ mcp: mcpServers });
}

function renderMcpList() {
  const own = mcpServers;
  const unadded = MCP_RECOMMENDED.filter((r) => !mcpAdded(r.url));

  $('mcpCountAll').textContent = String(own.length + unadded.length);
  $('mcpCountRec').textContent = String(MCP_RECOMMENDED.length);
  $('mcpCountOwn').textContent = String(own.length);
  document.querySelectorAll('.mcp-tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === mcpTabName));

  mcpListEl.innerHTML = '';
  const rows = [];
  if (mcpTabName === 'all' || mcpTabName === 'rec') {
    for (const r of MCP_RECOMMENDED) {
      if (mcpTabName === 'rec' || !mcpAdded(r.url)) rows.push({ kind: 'rec', rec: r });
    }
  }
  if (mcpTabName === 'all' || mcpTabName === 'own') {
    own.forEach((srv, i) => rows.push({ kind: 'own', srv, idx: i }));
  }

  if (!rows.length) {
    const e = document.createElement('div');
    e.className = 'empty';
    e.textContent = mcpTabName === 'rec' ? '没有更多推荐' : '还没有 MCP 服务器，点右上角「+ 新增」添加';
    mcpListEl.appendChild(e);
    return;
  }

  rows.forEach((row) => mcpListEl.appendChild(mcpCard(row)));
}

function mcpCard(row) {
  const card = document.createElement('div');
  card.className = 'mcp-card';

  const left = document.createElement('div');
  left.className = 'm-left';
  const name = document.createElement('div');
  name.className = 'm-name';
  name.textContent = row.kind === 'rec' ? row.rec.name : (row.srv.name || guessMcpName(row.srv.url));
  left.appendChild(name);

  if (row.kind === 'rec') {
    const tag = document.createElement('span');
    tag.className = 'm-tag';
    tag.textContent = '推荐';
    name.appendChild(tag);
    const desc = document.createElement('div');
    desc.className = 'm-desc';
    desc.textContent = row.rec.desc;
    left.appendChild(desc);
  } else {
    const ur = document.createElement('div');
    ur.className = 'm-url';
    ur.textContent = row.srv.url;
    left.appendChild(ur);
  }

  const ops = document.createElement('div');
  ops.className = 'm-ops';
  if (row.kind === 'rec') {
    if (mcpAdded(row.rec.url)) {
      const a = document.createElement('span');
      a.className = 'm-added';
      a.textContent = '已添加';
      ops.appendChild(a);
    } else {
      const add = document.createElement('button');
      add.type = 'button';
      add.className = 'm-add';
      add.textContent = '+ 添加';
      add.addEventListener('click', async () => {
        mcpServers.push({ name: row.rec.name, url: row.rec.url, headers: [] });
        await persistMcp();
        renderMcpList();
        await loadMcp();
        renderMcpList();
      });
      ops.appendChild(add);
    }
  } else {
    const n = mcpToolCount(row.srv);
    const badge = document.createElement('span');
    badge.className = 'm-badge' + (n ? ' on' : '');
    badge.textContent = n ? n + ' 工具' : '未连接';
    const ed = document.createElement('button');
    ed.type = 'button';
    ed.className = 'op';
    ed.textContent = '编辑';
    ed.addEventListener('click', () => openMcpModal(row.idx));
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'op danger';
    del.textContent = '删除';
    del.addEventListener('click', async () => {
      mcpServers.splice(row.idx, 1);
      await persistMcp();
      renderMcpList();
      await loadMcp();
      renderMcpList();
    });
    ops.append(badge, ed, del);
  }

  card.append(left, ops);
  return card;
}

function addHeaderRow(key = '', value = '') {
  const row = document.createElement('div');
  row.className = 'hdr-row';
  const k = document.createElement('input');
  k.className = 'hdr-k';
  k.type = 'text';
  k.placeholder = 'Authorization';
  k.value = key;
  k.spellcheck = false;
  const v = document.createElement('input');
  v.className = 'hdr-v';
  v.type = 'text';
  v.placeholder = 'Bearer your_api_key';
  v.value = value;
  v.spellcheck = false;
  const x = document.createElement('button');
  x.type = 'button';
  x.className = 'hdr-x';
  x.textContent = '×';
  x.title = '删除该 Header';
  x.addEventListener('click', () => row.remove());
  row.append(k, v, x);
  mcpHeadersEl.appendChild(row);
  return row;
}

function readHeaderRows() {
  return [...mcpHeadersEl.querySelectorAll('.hdr-row')]
    .map((r) => ({
      key: r.querySelector('.hdr-k').value.trim(),
      value: r.querySelector('.hdr-v').value.trim()
    }))
    .filter((h) => h.key);
}

function switchMcpTab(tab) {
  mcpTab = tab;
  document.querySelectorAll('.mtab').forEach((b) => b.classList.toggle('active', b.dataset.mtab === tab));
  $('mcpForm').classList.toggle('hidden', tab !== 'form');
  $('mcpJson').classList.toggle('hidden', tab !== 'json');
}

function openMcpModal(idx = -1) {
  mcpEditing = idx;
  const srv = idx >= 0 ? mcpServers[idx] : null;
  $('mcpModalTitle').textContent = srv ? '编辑 MCP' : '新增 MCP';
  mcpNameEl.value = (srv && srv.name) || '';
  mcpUrlEl.value = (srv && srv.url) || '';
  mcpHeadersEl.innerHTML = '';
  if (srv && srv.headers && srv.headers.length) srv.headers.forEach((h) => addHeaderRow(h.key, h.value));
  else addHeaderRow(srv ? '' : 'Authorization', '');
  $('mcpJsonText').value = srv ? JSON.stringify(srv, null, 2) : '';
  switchMcpTab('form');
  mcpModal.classList.remove('hidden');
  setTimeout(() => (srv ? mcpNameEl : mcpUrlEl).focus(), 40);
}

function closeMcpModal() {
  mcpModal.classList.add('hidden');
}

async function saveMcpModal() {
  let obj;
  if (mcpTab === 'json') {
    let j;
    try {
      j = JSON.parse($('mcpJsonText').value);
    } catch (e) {
      setStatus('JSON 解析失败：' + e.message);
      setTimeout(() => setStatus(''), 3500);
      return;
    }
    if (Array.isArray(j)) j = j[0];
    obj = normalizeMcp(j);
    if (!obj) {
      setStatus('JSON 里缺少 url 字段');
      setTimeout(() => setStatus(''), 3500);
      return;
    }
  } else {
    const url = mcpUrlEl.value.trim();
    if (!url) {
      setStatus('请填写 Server URL');
      setTimeout(() => setStatus(''), 3000);
      return;
    }
    obj = {
      name: mcpNameEl.value.trim() || guessMcpName(url),
      url,
      headers: readHeaderRows()
    };
  }
  if (mcpEditing >= 0) mcpServers[mcpEditing] = obj;
  else mcpServers.push(obj);
  await persistMcp();
  closeMcpModal();
  renderMcpList();
  await loadMcp();
  renderMcpList();
  setStatus('已保存 MCP 服务器');
  setTimeout(() => setStatus(''), 2500);
}

async function testMcp() {
  if (!mcpServers.length) {
    setStatus('没有可测试的服务器');
    setTimeout(() => setStatus(''), 2500);
    return;
  }
  setStatus('正在测试 MCP 连接…');
  await loadMcp();
  renderMcpList();
  const n = mcpTools.length;
  setStatus(n ? `MCP 连接正常，共 ${n} 个工具` : 'MCP 全部连接失败，检查地址或请求头');
  setTimeout(() => setStatus(''), 4000);
}

document.querySelectorAll('.mcp-tab').forEach((b) => {
  b.addEventListener('click', () => { mcpTabName = b.dataset.tab; renderMcpList(); });
});
$('btnSkillsManage').addEventListener('click', () => {
  settingsEl.classList.add('hidden');
  openSkillPanel();
});
const sv = document.getElementById('setVer'); if (sv) sv.textContent = 'v' + chrome.runtime.getManifest().version;
$('btnSettingsClose').addEventListener('click', () => $('settings').classList.add('hidden'));
$('btnMcpManage').addEventListener('click', openMcpPanel);
$('btnMcpClose').addEventListener('click', closeMcpPanel);
$('btnMcpAdd').addEventListener('click', () => openMcpModal(-1));
$('btnMcpTest').addEventListener('click', testMcp);
$('btnMcpCancel').addEventListener('click', closeMcpModal);
$('btnMcpCancelX').addEventListener('click', closeMcpModal);
$('btnMcpSave').addEventListener('click', saveMcpModal);
$('btnMcpHeaderAdd').addEventListener('click', () => addHeaderRow());
document.querySelectorAll('.mtab').forEach((b) => {
  b.addEventListener('click', () => {
    if (b.dataset.mtab === 'json') {
      const ta = $('mcpJsonText');
      if (!ta.value.trim()) {
        ta.value = JSON.stringify({ name: mcpNameEl.value.trim(), url: mcpUrlEl.value.trim(), headers: readHeaderRows() }, null, 2);
      }
    }
    switchMcpTab(b.dataset.mtab);
  });
});

/* ══ 引用 / 截图 / 技能 ══════════════════════════════════ */

/* ══ 引用菜单（标签页 / 本地文件 / 文件夹）═══════════════ */

let quoteTabs = [];
let quoteRefs = [];
let pendingShot = null;

async function openQuoteMenu() {
  modelMenu.classList.add('hidden');
  skillMenu.classList.add('hidden');
  closeDrawer();
  closeMcpPanel();
  quoteMenu.classList.remove('hidden');
  const qs = $('quoteSearch');
  qs.value = '';
  $('quoteList').innerHTML = '<div class="qm-empty">读取标签页…</div>';
  placeQuoteMenu();
  setTimeout(() => qs.focus(), 40);
  await loadBookmarks();
  try {
    const tabs = await chrome.tabs.query({});
    quoteTabs = tabs.filter((t) => t.id != null && t.url && !/^(chrome|chrome-extension|devtools|about|edge|chrome-search):/i.test(t.url));
  } catch (_) {
    quoteTabs = [];
  }
  renderQuoteMenu('');
}

function closeQuoteMenu() {
  quoteMenu.classList.add('hidden');
}

function placeQuoteMenu() {
  const r = btnQuote.getBoundingClientRect();
  const c = document.querySelector('.composer').getBoundingClientRect();
  const w = Math.min(312, window.innerWidth - 16);
  quoteMenu.style.right = 'auto';
  quoteMenu.style.left = Math.max(8, Math.min(r.left, window.innerWidth - 8 - w)) + 'px';
  quoteMenu.style.top = 'auto';
  quoteMenu.style.bottom = (window.innerHeight - c.top + 8) + 'px';
}

const QM_ICONS = {
  tabs: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M6 4h12"/>',
  files: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M12 18v-6M9 15h6"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  star: '<path d="M12 3l2.7 5.6 6.3.9-4.5 4.3 1 6.2-5.5-2.9-5.5 2.9 1-6.2L3 9.5l6.3-.9z"/>'
};

function qmIcon(kind) {
  return '<svg class="qm-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + (QM_ICONS[kind] || '') + '</svg>';
}

let quoteBookmarks = [];

async function loadBookmarks() {
  try {
    const o = await chrome.storage.local.get('quoteBookmarks');
    quoteBookmarks = Array.isArray(o.quoteBookmarks) ? o.quoteBookmarks : [];
  } catch (_) {
    quoteBookmarks = [];
  }
}

async function saveBookmarks() {
  await chrome.storage.local.set({ quoteBookmarks });
}

function renderQuoteMenu(filter) {
  const list = $('quoteList');
  list.innerHTML = '';
  const f = String(filter || '').trim().toLowerCase();
  const items = quoteTabs.filter((t) => !f || String(t.title || '').toLowerCase().includes(f) || String(t.url || '').toLowerCase().includes(f));

  const sec = document.createElement('div');
  sec.className = 'qm-sec';
  sec.innerHTML = qmIcon('tabs') + '<span>所有已打开标签页 (' + items.length + ')</span>';
  list.appendChild(sec);

  if (!items.length) {
    const e = document.createElement('div');
    e.className = 'qm-empty';
    e.textContent = f ? '没有匹配的标签页' : '没有可引用的标签页';
    list.appendChild(e);
  }

  items.forEach((t) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'qm-item';
    b.title = t.url || '';
    if (t.favIconUrl) {
      const img = document.createElement('img');
      img.className = 'qm-fav';
      img.src = t.favIconUrl;
      img.alt = '';
      img.addEventListener('error', () => { img.style.visibility = 'hidden'; });
      b.appendChild(img);
    } else {
      const ph = document.createElement('span');
      ph.className = 'qm-fav ph';
      b.appendChild(ph);
    }
    const title = document.createElement('span');
    title.className = 'qm-title';
    title.textContent = t.title || t.url || '无标题';
    b.appendChild(title);
    const tag = document.createElement('em');
    tag.className = 'qm-tag';
    tag.textContent = '- 标签';
    b.appendChild(tag);
    b.addEventListener('click', () => quoteTab(t));
    list.appendChild(b);
  });

  const sep = document.createElement('div');
  sep.className = 'qm-sep';
  list.appendChild(sep);

  const fav = document.createElement('button');
  fav.type = 'button';
  fav.className = 'qm-item';
  fav.innerHTML = qmIcon('star') + '<span class="qm-title">收藏</span><span class="qm-arrow">›</span>';
  fav.addEventListener('click', () => toggleBookmarks(fav));
  list.appendChild(fav);

  const up = document.createElement('button');
  up.type = 'button';
  up.className = 'qm-item';
  up.innerHTML = qmIcon('files') + '<span class="qm-title">上传本地文件</span>';
  up.addEventListener('click', () => { closeQuoteMenu(); $('fileInput').click(); });
  list.appendChild(up);

  const dir = document.createElement('button');
  dir.type = 'button';
  dir.className = 'qm-item';
  dir.innerHTML = qmIcon('folder') + '<span class="qm-title">选择本地文件夹</span>';
  dir.addEventListener('click', () => { closeQuoteMenu(); $('dirInput').click(); });
  list.appendChild(dir);
}

function toggleBookmarks(anchor) {
  const prev = anchor.nextElementSibling;
  if (prev && prev.classList.contains('qm-bm-list')) { prev.remove(); return; }
  const wrap = document.createElement('div');
  wrap.className = 'qm-bm-list';
  if (!quoteBookmarks.length) {
    const e = document.createElement('div');
    e.className = 'qm-empty';
    e.textContent = '暂无收藏';
    wrap.appendChild(e);
  }
  quoteBookmarks.forEach((bm) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'qm-item';
    const tx = document.createElement('span');
    tx.className = 'qm-title';
    tx.textContent = bm.title || bm.url;
    b.appendChild(tx);
    b.addEventListener('click', async () => {
      const tabs = await chrome.tabs.query({});
      const hit = tabs.find((t) => t.url === bm.url);
      if (hit) return quoteTab(hit);
      addQuote('收藏：' + String(bm.title || bm.url).slice(0, 20), `【引用页面：${bm.title || ''}】\n${bm.url}`, { kind: 'tab', url: bm.url });
      closeQuoteMenu();
    });
    wrap.appendChild(b);
  });
  const add = document.createElement('button');
  add.type = 'button';
  add.className = 'qm-item';
  add.innerHTML = '<span class="qm-title">+ 收藏当前页</span>';
  add.addEventListener('click', addCurrentBookmark);
  wrap.appendChild(add);
  anchor.after(wrap);
}

async function addCurrentBookmark() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab || !tab.url) return;
    if (quoteBookmarks.some((b) => b.url === tab.url)) {
      setStatus('已经收藏过了');
      setTimeout(() => setStatus(''), 2000);
      return;
    }
    quoteBookmarks.unshift({ title: tab.title || tab.url, url: tab.url });
    quoteBookmarks = quoteBookmarks.slice(0, 20);
    await saveBookmarks();
    setStatus('已收藏');
    setTimeout(() => setStatus(''), 1600);
    const anchor = [...document.querySelectorAll('.qm-item')].find((e) => e.querySelector('.qm-title')?.textContent === '收藏');
    if (anchor) {
      const prev = anchor.nextElementSibling;
      if (prev && prev.classList.contains('qm-bm-list')) prev.remove();
      toggleBookmarks(anchor);
    }
  } catch (e) {
    setStatus('收藏失败：' + String((e && e.message) || e).slice(0, 40));
    setTimeout(() => setStatus(''), 2500);
  }
}

async function readTabText(tabId) {
  const mine = tabId === attachedTabId;
  if (!mine) {
    try {
      await chrome.debugger.attach({ tabId }, '1.3');
    } catch (e) {
      const msg = String((e && e.message) || e);
      if (!/already attached|Another debugger/i.test(msg)) throw new Error(msg);
    }
  }
  try {
    const r = await chrome.debugger.sendCommand({ tabId }, 'Runtime.evaluate', {
      expression: '(() => { const s = window.getSelection ? String(window.getSelection().toString()).trim() : ""; if (s) return s.slice(0, 6000); const b = document.body; return b ? String(b.innerText || "").replace(/\\n{3,}/g, "\\n\\n").slice(0, 3000) : ""; })()',
      returnByValue: true,
      awaitPromise: true,
      userGesture: true
    });
    if (r && r.exceptionDetails) throw new Error('页面脚本异常');
    return (r && r.result && r.result.value) || '';
  } finally {
    if (!mine) {
      try { await chrome.debugger.detach({ tabId }); } catch (_) {}
    }
  }
}

async function quoteTab(tab) {
  closeQuoteMenu();
  setStatus('读取「' + String(tab.title || '标签页').slice(0, 20) + '」…');
  try {
    const text = await readTabText(tab.id);
    setStatus('');
    if (!text) {
      setStatus('这个标签页没有可引用的文字');
      setTimeout(() => setStatus(''), 2400);
      return;
    }
    addQuote(String(tab.title || tab.url || '标签页').slice(0, 22), `【引用标签页：${tab.title || ''}】\n${tab.url || ''}\n${text}`, { kind: 'tab', url: tab.url });
  } catch (e) {
    setStatus('读取失败：' + String((e && e.message) || e).slice(0, 60));
    setTimeout(() => setStatus(''), 3500);
  }
}

function addQuote(label, content, meta) {
  quoteRefs.push({ label, content, meta: meta || {} });
  renderQuoteBar();
  inpMsg.focus();
}

function clearQuotes() {
  quoteRefs = [];
  pendingShot = null;
  renderQuoteBar();
}

function renderQuoteBar() {
  const bar = $('quoteBar');
  if (!bar) return;
  bar.innerHTML = '';
  const wrap = document.getElementById('quoteWrap');
  if (wrap) {
    wrap.classList.toggle('hidden', quoteRefs.length === 0 && !pendingShot);
    wrap.classList.toggle('q-disabled', quoteRefs.length > 0 && !quoteAuto);
  }

  const FILE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="14" y2="17"/></svg>';
  const LINK_SVG = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';
  const kindOf = (q) => (q.meta || {}).kind;

  function mkX(q) {
    const x = document.createElement('button');
    x.type = 'button';
    x.className = 'qc-x';
    x.textContent = '\u00d7';
    x.title = '移除引用';
    x.addEventListener('click', (e) => {
      e.stopPropagation();
      if (q.__shot) { pendingShot = null; renderQuoteBar(); return; }
      const i = quoteRefs.indexOf(q);
      if (i >= 0) {
        lastRemoved = { index: i, item: q };
        quoteRefs.splice(i, 1);
        hideQuotePop();
        renderQuoteBar();
        showQuoteToast('已移除「' + String(q.label || '').slice(0, 14) + '」');
      }
    });
    return x;
  }

  function kindIcon(k) {
    if (k === 'tab') return '\ud83d\udca1';
    if (k === 'dir') return '\ud83d\udcc1';
    if (k === 'skill') return '\u2726';
    if (k === 'file') return FILE_SVG;
    return '\u25c7';
  }

  const skBar = $('skillBar');
  if (skBar) {
    skBar.innerHTML = '';
    const skills = quoteRefs.filter((q) => kindOf(q) === 'skill');
    skBar.classList.toggle('hidden', skills.length === 0);
    skills.forEach((q) => {
      const chip = document.createElement('span');
      chip.className = 'qc-fchip';
      const ic = document.createElement('span');
      ic.className = 'qc-fic';
      ic.innerHTML = FILE_SVG;
      const t = document.createElement('span');
      t.className = 'qc-ftx';
      t.textContent = q.label;
      chip.append(ic, t, mkX(q));
      skBar.appendChild(chip);
    });
  }

  if (pendingShot) {
    const chip = document.createElement('span');
    chip.className = 'quote-chip shot';
    const im = document.createElement('img');
    im.className = 'qc-img';
    im.src = pendingShot;
    im.alt = '截图';
    const tx = document.createElement('span');
    tx.className = 'qc-tx';
    tx.textContent = '截图';
    tx.style.maxWidth = '60px';
    tx.style.cursor = 'default';
    chip.append(im, tx, mkX({ __shot: true }));
    bar.appendChild(chip);
  }

  const first = quoteRefs[0];
  if (first) {
    const row = document.createElement('div');
    row.className = 'quote-chip qc-main';
    const ic = document.createElement('span');
    ic.className = 'qc-ic';
    ic.innerHTML = kindIcon(kindOf(first));
    const tx = document.createElement('span');
    tx.className = 'qc-tx';
    tx.textContent = first.label;
    tx.title = first.label;
    tx.addEventListener('click', () => openQuotePop('detail', first));
    row.append(ic);
    if (!quoteAuto) {
      const off = document.createElement('span');
      off.className = 'qc-off';
      off.textContent = '已停用';
      row.append(off);
    }
    row.append(tx);
    const url = String((first.meta || {}).url || '').replace(/^https?:\/\//, '');
    if (url) {
      const u = document.createElement('span');
      u.className = 'qc-url';
      u.textContent = url;
      u.title = url;
      row.append(u);
      const lk = document.createElement('button');
      lk.type = 'button';
      lk.className = 'qc-link';
      lk.title = '在新标签页打开';
      lk.innerHTML = LINK_SVG;
      lk.addEventListener('click', () => { try { chrome.tabs.create({ url: (first.meta || {}).url }); } catch (_) {} });
      row.append(lk);
    }
    row.append(mkX(first));
    const extra = quoteRefs.length - 1;
    if (extra > 0) {
      const more = document.createElement('button');
      more.type = 'button';
      more.className = 'qc-more';
      more.textContent = '+' + extra;
      more.title = '查看全部引用';
      more.addEventListener('click', (e) => { e.stopPropagation(); openQuotePop('list'); });
      row.append(more);
    }
    bar.appendChild(row);
  }
}

let lastRemoved = null;
let toastTimer = null;
function showQuoteToast(msg) {
  const t = document.getElementById('quoteToast');
  if (!t) return;
  t.querySelector('.qt-msg').textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 3000);
}
function hideQuotePop() {
  const p = document.getElementById('quotePop');
  if (p) p.classList.add('hidden');
}
function openQuotePop(mode, q) {
  const p = document.getElementById('quotePop');
  if (!p) return;
  p.innerHTML = '';
  if (mode === 'detail') {
    const h = document.createElement('b');
    h.textContent = q.label || '';
    p.append(h);
    const url = String((q.meta || {}).url || '').replace(/^https?:\/\//, '');
    if (url) {
      const u = document.createElement('span');
      u.className = 'qp-url';
      u.textContent = url;
      p.append(u);
    }
    const s = document.createElement('p');
    s.className = 'qp-sum';
    const raw = String(q.content || '').replace(/^\u3010[^\u3011]*\u3011\n?/, '');
    s.textContent = raw.slice(0, 300) || '（无摘要）';
    p.append(s);
  } else {
    const h = document.createElement('b');
    h.textContent = '全部引用（' + quoteRefs.length + '）';
    p.append(h);
    quoteRefs.forEach((q2) => {
      const r = document.createElement('div');
      r.className = 'qp-row';
      const t = document.createElement('span');
      t.className = 'qp-t';
      t.textContent = q2.label || '';
      t.title = q2.label || '';
      r.append(t, mkX(q2));
      p.append(r);
    });
  }
  p.classList.remove('hidden');
}
document.addEventListener('click', (e) => {
  const p = document.getElementById('quotePop');
  if (!p || p.classList.contains('hidden')) return;
  if (p.contains(e.target) || (e.target.closest && e.target.closest('#quoteWrap'))) return;
  hideQuotePop();
});

$('fileInput').addEventListener('change', async (e) => {
  const files = [...(e.target.files || [])];
  e.target.value = '';
  for (const f of files.slice(0, 20)) {
    if (f.size > 512 * 1024) {
      addQuote('文件：' + f.name, `【引用文件：${f.name}】（文件过大，${Math.round(f.size / 1024)}KB，未读取内容）`, { kind: 'file', name: f.name });
      continue;
    }
    let txt = '';
    try { txt = await f.text(); } catch (_) { txt = ''; }
    addQuote('文件：' + f.name, `【引用文件：${f.name}】\n${txt.slice(0, 20000)}`, { kind: 'file', name: f.name });
  }
});

$('dirInput').addEventListener('change', async (e) => {
  const all = [...(e.target.files || [])];
  e.target.value = '';
  const files = all.filter((f) => f.size <= 512 * 1024).slice(0, 30);
  if (!files.length) return;
  const root = (files[0].webkitRelativePath || '').split('/')[0] || '目录';
  const parts = [];
  let total = 0;
  for (const f of files) {
    if (total > 80000) break;
    let txt = '';
    try { txt = await f.text(); } catch (_) { continue; }
    total += txt.length;
    parts.push(`--- ${f.webkitRelativePath || f.name} ---\n${txt.slice(0, 12000)}`);
  }
  addQuote(`文件夹：${root}（${parts.length} 个文件）`, `【引用文件夹：${root}】\n${parts.join('\n\n')}`, { kind: 'dir', name: root });
});

$('quoteSearch').addEventListener('input', (e) => renderQuoteMenu(e.target.value));

async function doQuote() {
  setStatus('读取页面…');
  let text = '';
  try {
    text = await evalInPage('(() => String(window.getSelection ? window.getSelection().toString() : "").trim())()');
  } catch (_) {}
  let label = '选中内容';
  if (!text) {
    try {
      text = await evalInPage('(() => { const b = document.body; return b ? String(b.innerText || "").replace(/\\n{3,}/g, "\\n\\n").slice(0, 3000) : ""; })()');
    } catch (_) {}
    label = '当前页面';
  }
  setStatus('');
  if (!text) {
    setStatus('这个页面没有可引用的文字');
    setTimeout(() => setStatus(''), 2200);
    return;
  }
  inpMsg.value = `【引用${label}】\n${text}\n\n` + inpMsg.value;
  inpMsg.focus();
  inpMsg.style.height = 'auto';
  inpMsg.style.height = Math.min(inpMsg.scrollHeight, 132) + 'px';
}

function openShotMenu() {
  const m = $('shotModal');
  if (!m) { doShot('view'); return; }
  m.classList.remove('hidden');
}
function closeShotMenu() {
  $('shotModal')?.classList.add('hidden');
}

/* 在页面上拉一个覆盖层让用户拖框，返回文档坐标选区；取消/太小返回 null */
async function pickAreaOnPage() {
  const rect = await evalInPage(`new Promise((resolve) => {
    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;z-index:2147483647;cursor:crosshair;background:rgba(0,0,0,.04)';
    const box = document.createElement('div');
    box.style.cssText = 'position:fixed;display:none;pointer-events:none;border:2px solid #007aff;background:rgba(0,122,255,.12);border-radius:2px';
    const tip = document.createElement('div');
    tip.style.cssText = 'position:fixed;left:50%;top:14px;transform:translateX(-50%);z-index:2147483647;background:#111;color:#fff;font:12px/1.4 system-ui;padding:6px 12px;border-radius:8px;pointer-events:none;opacity:.92';
    tip.textContent = '拖动鼠标框选要截的区域，Esc 取消';
    document.body.append(ov, box, tip);
    let x0 = 0, y0 = 0, dragging = false;
    const done = (r) => { cleanup(); resolve(r); };
    const cleanup = () => {
      ov.remove(); box.remove(); tip.remove();
      window.removeEventListener('mousedown', onDown, true);
      window.removeEventListener('mousemove', onMove, true);
      window.removeEventListener('mouseup', onUp, true);
      window.removeEventListener('keydown', onKey, true);
    };
    const onKey = (e) => { if (e.key === 'Escape') done(null); };
    const onDown = (e) => {
      dragging = true; x0 = e.clientX; y0 = e.clientY;
      box.style.display = 'block';
      box.style.left = x0 + 'px'; box.style.top = y0 + 'px';
      box.style.width = '0'; box.style.height = '0';
    };
    const onMove = (e) => {
      if (!dragging) return;
      box.style.left = Math.min(x0, e.clientX) + 'px';
      box.style.top = Math.min(y0, e.clientY) + 'px';
      box.style.width = Math.abs(e.clientX - x0) + 'px';
      box.style.height = Math.abs(e.clientY - y0) + 'px';
    };
    const onUp = (e) => {
      if (!dragging) return;
      dragging = false;
      const w = Math.abs(e.clientX - x0), h = Math.abs(e.clientY - y0);
      if (w < 8 || h < 8) { done(null); return; }
      done({
        x: Math.round(Math.min(x0, e.clientX) + window.scrollX),
        y: Math.round(Math.min(y0, e.clientY) + window.scrollY),
        width: Math.round(w), height: Math.round(h)
      });
    };
    window.addEventListener('mousedown', onDown, true);
    window.addEventListener('mousemove', onMove, true);
    window.addEventListener('mouseup', onUp, true);
    window.addEventListener('keydown', onKey, true);
  })`);
  return rect;
}

async function shotView() {
  const r = await cdp('Page.captureScreenshot', { format: 'jpeg', quality: 55 });
  return 'data:image/jpeg;base64,' + r.data;
}

async function shotFull() {
  const m = await cdp('Page.getLayoutMetrics');
  const w = Math.min(Math.ceil(m.contentSize.width), 8000);
  let h = Math.ceil(m.contentSize.height);
  if (h > 30000) h = 30000;
  // 先把视口撑到整页高度再截，避免 captureBeyondViewport 在不同版本上的差异
  await cdp('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  try {
    const r = await cdp('Page.captureScreenshot', { format: 'jpeg', quality: 50, captureBeyondViewport: true });
    return 'data:image/jpeg;base64,' + r.data;
  } finally {
    await cdp('Emulation.clearDeviceMetricsOverride').catch(() => {});
  }
}

async function shotArea(rect) {
  const r = await cdp('Page.captureScreenshot', {
    format: 'jpeg', quality: 70,
    clip: { x: rect.x, y: rect.y, width: rect.width, height: rect.height, scale: 1 },
    captureBeyondViewport: true
  });
  return 'data:image/jpeg;base64,' + r.data;
}

async function doShot(mode = 'view') {
  setStatus(mode === 'area' ? '在页面上拖框选择区域…' : '截图中…');
  try {
    let url;
    if (mode === 'full') {
      url = await shotFull();
    } else if (mode === 'area') {
      const rect = await pickAreaOnPage();
      if (!rect) { setStatus('已取消截图'); setTimeout(() => setStatus(''), 1800); return; }
      setStatus('截图中…');
      url = await shotArea(rect);
    } else {
      url = await shotView();
    }
    if (!url) throw new Error('没有拿到图片');
    lastShot = url;
    pendingShot = url;
    renderQuoteBar();
    setStatus('截图已引用，点 × 可移除');
    setTimeout(() => setStatus(''), 2200);
  } catch (e) {
    setStatus('');
    pushError('截图失败：' + (e?.message || e));
    render();
  }
}

const TASK_ICONS = {
  research: { c: '#2f7cf6', p: '<circle cx="11" cy="11" r="6"/><path d="M16 16l4 4"/>' },
  chart: { c: '#12b5a6', p: '<path d="M4 19V5"/><path d="M4 19h16"/><path d="M7 15l4-5 3 3 4-6"/>' },
  web: { c: '#34a853', p: '<circle cx="12" cy="12" r="8"/><path d="M4 12h16"/><path d="M12 4c2.4 2.6 2.4 13.4 0 16M12 4c-2.4 2.6-2.4 13.4 0 16"/>' },
  pdf: { c: '#e5484d', p: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>' },
  ppt: { c: '#f5a623', p: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M12 16v4M8 20h8"/>' },
  excel: { c: '#34a853', p: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9 4v16M15 4v16"/>' },
  word: { c: '#2f7cf6', p: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 12h6M9 16h4"/>' },
  image: { c: '#8b5cf6', p: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="M21 16l-5-5-4 4-2-2-7 7"/>' },
  code: { c: '#6b7280', p: '<path d="M8 8l-4 4 4 4M16 8l4 4-4 4"/>' },
  note: { c: '#8a8f99', p: '<path d="M8 4h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><path d="M9 9h6M9 13h6M9 17h3"/>' },
  lang: { c: '#2f7cf6', p: '<path d="M4 5h8M8 5v3c0 3-2 5-4 6"/><path d="M6 12c1.5 2 3.5 3 5 3"/><path d="M14 19l3-8 3 8M15.2 16.5h3.6"/>' },
  table: { c: '#34a853', p: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 4v16"/>' },
  tab: { c: '#f5a623', p: '<rect x="3" y="7" width="14" height="12" rx="2"/><path d="M7 7V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-2"/>' },
  target: { c: '#e5484d', p: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>' }
};

function taskIcon(k) {
  const it = TASK_ICONS[k] || TASK_ICONS.code;
  return '<svg class="sk-svg" viewBox="0 0 24 24" fill="none" stroke="' + it.c + '" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + it.p + '</svg>';
}

const TASK_ITEMS = [
  { icon: 'research', name: '深度研究', prompt: '围绕我的问题做一轮深度研究：先在当前页面和已打开的标签页里收集信息，再给出结构化结论、证据来源和不确定的地方。' },
  { icon: 'chart', name: '金融市场分析', prompt: '分析当前页面里的金融或市场数据：关键指标、趋势判断、风险和需要补充的信息。' },
  { icon: 'web', name: '生成网页', prompt: '根据当前页面内容生成一个可直接打开的 HTML 页面（内联样式、完整可用），然后把代码给我。' },
  { icon: 'pdf', name: '生成 PDF', needTask: true, desc: '制作可打印的 A4 报告，或把现有内容转成排版规整的 PDF。', prompt: [
    '制作一份可打印的 A4 PDF。',
    '第一步：判断内容来源 —— 我给了主题（如「做一份《家庭应急手册》」）就基于主题自己组织内容；没给主题才用 browser_get_text 取当前页面正文。不要因为页面上没内容就停住，主题明确时直接写。',
    '第二步：整理成「封面标题 → 分级小节（每节含正文 + 要点或表格）→ 关键结论」，不要只给大纲，正文要完整可读。',
    '第三步：调用 gen_pdf（工具名 mcp_gen_pdf），sections 里每节给 heading + body，有数据时用 bullets 或 table{columns,rows}。',
    '排版要求：中文、A4、页边距统一、自动分页、表格不跨页断裂、页脚自动带页码。文件名用内容主题命名。'
  ].join('') },
  { icon: 'ppt', name: '生成 PPT', needTask: true, desc: '把页面内容整理成 5–8 页演示文稿。', prompt: [
    '制作一份演示文稿。',
    '先用 browser_get_text 取当前页面内容，再整理成 5–8 页：每页一个标题 + 3–5 条要点（长句拆短，每条不超过 20 字），页与页之间逻辑递进（现状 → 问题 → 方案 → 结论）。',
    '调用 gen_pptx（工具名 mcp_gen_pptx），sections 每项对应一页。文件名用主题命名。'
  ].join('') },
  { icon: 'excel', name: '生成 Excel', needTask: true, desc: '把页面里的表格或列表转成可计算的表格文件。', prompt: [
    '把当前页面里的表格或列表整理成结构化数据。',
    '先用 browser_get_text 或 browser_evaluate 取数，字段名用中文、数值去掉单位和千分位。',
    '调用 gen_xlsx（工具名 mcp_gen_xlsx）：单表用 columns + rows，多表用 sheets[{name,columns,rows}]。行数据要完整，不要只给前几行。'
  ].join('') },
  { icon: 'word', name: '生成 Word', needTask: true, desc: '把正文整理成可打印的 Word 文档。', prompt: [
    '制作一份可直接打印的 Word 文档。',
    '先用 browser_get_text 取当前页面正文，整理成「标题 → 分级小节 → 要点 / 表格」，长文保持完整、不要压缩成摘要。',
    '调用 gen_docx（工具名 mcp_gen_docx），sections 每项给 heading + body（或 bullets / table）。'
  ].join('') },
  { icon: 'image', name: '生成图片', prompt: '把当前页面内容提炼成一段可直接用于文生图的提示词，包含主体、场景、风格和构图。' },
  { icon: 'code', name: '生成网页脚本', prompt: '写一段可以直接注入当前页面执行的 JavaScript，完成我描述的操作。' }
];

function renderSkillMenu() {
  skillMenu.innerHTML = '';

  const modes = [
    { id: 'ask', icon: '💬', name: '问答', desc: '快速聊天、解释和轻量生成。' },
    { id: 'task', icon: '🧰', name: '任务', desc: '生成文件、操作网页和长程任务。' }
  ];
  const wrap = document.createElement('div');
  wrap.className = 'sk-mode';
  for (const m of modes) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'sk-mode-card' + (agentMode === m.id ? ' active' : '');
    const em = document.createElement('span');
    em.className = 'sk-em';
    em.textContent = m.icon;
    const mt = document.createElement('span');
    mt.className = 'sk-mt';
    const nm = document.createElement('b');
    nm.textContent = m.name;
    const ds = document.createElement('em');
    ds.textContent = m.desc;
    mt.append(nm, ds);
    b.append(em, mt);
    if (agentMode === m.id) {
      const ck = document.createElement('span');
      ck.className = 'sk-check';
      ck.textContent = '✓';
      b.appendChild(ck);
    }
    b.addEventListener('click', () => {
      agentMode = m.id;
      skillMenu.classList.add('hidden');
      setStatus(m.id === 'ask' ? '已切到问答模式（不调用工具）' : '已切到任务模式（可操作网页）');
      setTimeout(() => setStatus(''), 1800);
    });
    wrap.appendChild(b);
  }
  skillMenu.appendChild(wrap);

  const sep = document.createElement('div');
  sep.className = 'sk-sep';
  skillMenu.appendChild(sep);

  for (const it of TASK_ITEMS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'sk-item';
    const ic = document.createElement('span');
    ic.className = 'sk-ic';
    ic.innerHTML = taskIcon(it.icon);
    const nm = document.createElement('span');
    nm.className = 'sk-name';
    nm.textContent = it.name;
    b.append(ic, nm);
    b.addEventListener('click', () => {
      if (it.needTask && agentMode !== 'task') {
        agentMode = 'task';
        setStatus('已切到任务模式，好让它调用生成工具');
      }
      addQuote(it.name, it.prompt, { kind: 'skill', prompt: it.prompt });
      skillMenu.classList.add('hidden');
      inpMsg.focus();
    });
    skillMenu.appendChild(b);
  }
}

function openSkillMenu() {
  closeDrawer();
  quoteMenu.classList.add('hidden');
  closeMcpPanel();
  modelMenu.classList.add('hidden');
  skillMenu.className = 'pop skill-pop';
  skillMenu.classList.remove('hidden');
  placeSkillMenu();
  renderSkillMenu();
}

function placeSkillMenu() {
  const r = btnSkill.getBoundingClientRect();
  const c = document.querySelector('.composer').getBoundingClientRect();
  const w = Math.min(330, window.innerWidth - 16);
  skillMenu.style.right = 'auto';
  skillMenu.style.left = Math.max(8, Math.min(r.left, window.innerWidth - 8 - w)) + 'px';
  skillMenu.style.top = 'auto';
  skillMenu.style.bottom = (window.innerHeight - c.top + 8) + 'px';
}

/* ══ 新控件事件 ═══════════════════════════════════════════ */

btnHistory.addEventListener('click', openDrawer);
btnNew.addEventListener('click', newSession);
$('btnCloseDrawer').addEventListener('click', closeDrawer);
scrimEl.addEventListener('click', () => {
  closeDrawer();
  modelMenu.classList.add('hidden');
  skillMenu.classList.add('hidden');
  quoteMenu.classList.add('hidden');
});
inpSearch.addEventListener('input', () => renderDrawer(inpSearch.value));

modelTag.addEventListener('click', () => {
  if (modelMenu.classList.contains('hidden')) openModelMenu();
  else modelMenu.classList.add('hidden');
});
btnSkill.addEventListener('click', () => {
  if (skillMenu.classList.contains('hidden')) openSkillMenu();
  else skillMenu.classList.add('hidden');
});
let quoteAuto = false;
(async () => {
  try {
    const { quoteAuto: qa } = await chrome.storage.local.get('quoteAuto');
    quoteAuto = !!qa;
    $('btnQuoteAuto')?.classList.toggle('on', quoteAuto);
  } catch (_) {}
})();

async function syncAutoQuote() {
  if (!quoteAuto) return;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url || !/^https?:/.test(tab.url)) return;
    quoteRefs = quoteRefs.filter((q) => !(q.meta || {}).auto);
    const title = String(tab.title || tab.url).slice(0, 40);
    quoteRefs.push({
      label: title,
      content: '【引用标签页：' + (tab.title || '') + '】\n' + tab.url,
      meta: { kind: 'tab', url: tab.url, auto: true },
    });
    renderQuoteBar();
  } catch (_) {}
}

$('qtUndo')?.addEventListener('click', () => {
  const t = document.getElementById('quoteToast');
  if (lastRemoved) {
    quoteRefs.splice(Math.min(lastRemoved.index, quoteRefs.length), 0, lastRemoved.item);
    lastRemoved = null;
    renderQuoteBar();
  }
  if (t) t.classList.add('hidden');
});
$('btnQuoteAuto')?.addEventListener('click', async () => {
  quoteAuto = !quoteAuto;
  $('btnQuoteAuto')?.classList.toggle('on', quoteAuto);
  try { await chrome.storage.local.set({ quoteAuto }); } catch (_) {}
  if (quoteAuto) {
    await syncAutoQuote();
    setStatus('\u5df2\u5f00\u542f\u81ea\u52a8\u5f15\u7528\uff08\u968f\u6807\u7b7e\u9875\u5207\u6362\uff09');
  } else {
    quoteRefs = quoteRefs.filter((q) => !(q.meta || {}).auto);
    renderQuoteBar();
    setStatus('\u5df2\u5173\u95ed\u81ea\u52a8\u5f15\u7528');
  }
  setTimeout(() => setStatus(''), 2200);
});

btnQuote.addEventListener('click', openQuoteMenu);
btnShot.addEventListener('click', openShotMenu);
btnMcp.addEventListener('click', openMcpPanel);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!mcpModal.classList.contains('hidden')) { closeMcpModal(); return; }
    if (!mcpPanel.classList.contains('hidden')) { closeMcpPanel(); return; }
    if (!quoteMenu.classList.contains('hidden')) { closeQuoteMenu(); return; }
    if (!skillPanel.classList.contains('hidden')) { closeSkillPanel(); return; }
    closeDrawer();
    modelMenu.classList.add('hidden');
    skillMenu.classList.add('hidden');
  }
});

loadSettings().then(() => loadMcp());
(async function restoreAndRender() {
  try {
    await refreshFavs();   // 首屏就要知道哪些消息已收藏，星标才是实心
    const { lastSessionId, sessions } = await chrome.storage.local.get(['lastSessionId', 'sessions']);
    if (lastSessionId && Array.isArray(sessions)) {
      const rec = sessions.find((s) => s && s.id === lastSessionId);
      if (rec && Array.isArray(rec.messages) && rec.messages.length) {
        sessionId = rec.id;
        messages = rec.messages;
        lastShot = null;
      }
    }
    const { agentRun } = await chrome.storage.local.get('agentRun');
    const runMatches = !!(agentRun && agentRun.sessionId === sessionId && Array.isArray(agentRun.messages));
    if (runMatches) {
      // 后台记录最完整（含工具结果/思考过程），优先用它，不再回落到旧的 taskSnap
      messages = agentRun.messages;
      running = !!agentRun.running;
      backgroundMode = true;
      setStatus(agentRun.status || '');
      setSendMode(agentRun.running ? 'stop' : 'send');
      setDot(agentRun.running ? 'busy' : 'ok');
    } else {
      const { taskSnap } = await chrome.storage.local.get('taskSnap');
      if (taskSnap && taskSnap.sessionId === sessionId && Array.isArray(taskSnap.messages)
          && (taskSnap.running || taskSnap.interrupted)) {
        messages = taskSnap.messages;
        resumeStep = taskSnap.step || 1;
      }
    }
  } catch (_) {}
  render();
})();

$('btnHide')?.addEventListener('click', () => {
  if (running && !backgroundMode) saveSnap(0, false, true);
  try { window.close(); } catch (_) {}
});

$('btnSkillsLibrary')?.addEventListener('click', () => {
  modelMenu.classList.add('hidden');
  skillMenu.classList.add('hidden');
  quoteMenu.classList.add('hidden');
  openSkillPanel();
});

/* ══ 点弹层外关闭 ════════════════════════════════════════════ */
document.addEventListener('mousedown', (e) => {
  const t = e.target;
  const inPop = [modelMenu, skillMenu, quoteMenu, mcpPanel].some((el) => el && el.contains(t));
  const onTrigger = [modelTag, btnSkill, btnQuote, btnMcp, btnHistory, btnNew, btnSettings].some((el) => el && el.contains(t));
  const inDrawer = (drawerEl && drawerEl.contains(t)) || (scrimEl && scrimEl.contains(t));
  if (inPop || onTrigger || inDrawer) return;
  modelMenu.classList.add('hidden');
  skillMenu.classList.add('hidden');
  quoteMenu.classList.add('hidden');
  closeMcpPanel();
  if (!drawerEl.classList.contains('hidden')) closeDrawer();
}, true);

/* 代码块工具栏：执行 / 保存 / 下载 / 复制 / 折叠 */
const CODE_EXT = { javascript:'js', js:'js', typescript:'ts', json:'json', html:'html', css:'css', python:'py', py:'py', bash:'sh', shell:'sh', sh:'sh', sql:'sql', go:'go', rust:'rs', java:'java', yaml:'yml', markdown:'md', md:'md', text:'txt', txt:'txt' };
function downloadText(name, text, mime) {
  const blob = new Blob([text], { type: mime || 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}
chatEl.addEventListener('click', async (e) => {
  const btn = e.target.closest ? e.target.closest('[data-cb]') : null;
  if (!btn) return;
  const block = btn.closest('.code-block');
  if (!block) return;
  const codeEl = block.querySelector('pre.code code');
  const code = codeEl ? codeEl.textContent : '';
  const lang = (block.querySelector('.code-lang')?.textContent || '').toLowerCase();
  const act = btn.dataset.cb;
  const labels = { run:'▷ 执行', download:'⬇ 下载', copy:'⧉ 复制', fold:'⌃' };
  const flash = (t) => { btn.textContent = t; setTimeout(() => { btn.textContent = labels[act] || t; }, 1100); };
  try {
    if (act === 'copy') {
      await navigator.clipboard.writeText(code);
      flash('已复制');
    } else if (act === 'fold') {
      block.classList.toggle('folded');
      btn.textContent = block.classList.contains('folded') ? '⌄' : '⌃';
    } else if (act === 'download') {
      const ext = CODE_EXT[lang] || 'txt';
      downloadText('snippet-' + Date.now() + '.' + ext, code);
      flash('已下载');
    } else if (act === 'run') {
      if (['javascript','js'].includes(lang)) {
        const r = await evalInPage('(function(){try{' + code + '\n}catch(err){return "ERROR: "+err.message}})()');
        setStatus('执行结果：' + String(typeof r === 'string' ? r : JSON.stringify(r)).slice(0, 160));
        setTimeout(() => setStatus(''), 5000);
      } else {
        setStatus('只有 JS 代码可以在当前页面执行');
        setTimeout(() => setStatus(''), 2600);
      }
    }
  } catch (err) {
    setStatus('操作失败：' + (err?.message || err));
    setTimeout(() => setStatus(''), 3200);
  }
});


/* ── 对话内搜索：高亮 + 精确定位 ───────────────────────── */

let findRanges = [];
let findIdx = 0;

function clearFind() {
  findRanges = [];
  findIdx = 0;
  if (window.CSS && CSS.highlights) {
    CSS.highlights.delete('find-all');
    CSS.highlights.delete('find-cur');
  }
  if (findCountEl) findCountEl.textContent = '0/0';
}

function paintFind() {
  const H = window.Highlight;
  if (!H || !window.CSS || !CSS.highlights) return;
  const cur = findRanges[findIdx];
  CSS.highlights.set('find-all', new H(...findRanges.filter((_, i) => i !== findIdx)));
  CSS.highlights.set('find-cur', new H(...(cur ? [cur] : [])));
  if (findCountEl) {
    findCountEl.textContent = findRanges.length ? `${findIdx + 1}/${findRanges.length}` : '0/0';
  }
  if (cur) {
    const el = cur.startContainer.parentElement;
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
}

function runFind(q) {
  clearFind();
  const needle = String(q || '').trim().toLowerCase();
  if (!needle) return;

  const walker = document.createTreeWalker(chatEl, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      const p = n.parentElement;
      if (!p || p.closest('pre, code, textarea, .find-bar, .think, .sk-')) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  let node;
  while ((node = walker.nextNode())) {
    const text = node.nodeValue.toLowerCase();
    let from = 0;
    let at;
    while ((at = text.indexOf(needle, from)) !== -1) {
      const r = new Range();
      r.setStart(node, at);
      r.setEnd(node, at + needle.length);
      findRanges.push(r);
      from = at + needle.length;
    }
  }

  findIdx = 0;
  paintFind();
}

function stepFind(d) {
  if (!findRanges.length) return;
  findIdx = (findIdx + d + findRanges.length) % findRanges.length;
  paintFind();
}

function closeFind() {
  findBarEl.classList.add('hidden');
  clearFind();
}

if (btnFindEl) {
  btnFindEl.addEventListener('click', () => {
    const open = findBarEl.classList.toggle('hidden');
    if (!open) {
      inpFindEl.focus();
      inpFindEl.select();
      if (inpFindEl.value.trim()) runFind(inpFindEl.value);
    } else {
      clearFind();
    }
  });
}
if (inpFindEl) {
  inpFindEl.addEventListener('input', () => runFind(inpFindEl.value));
  inpFindEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); stepFind(e.shiftKey ? -1 : 1); }
    else if (e.key === 'Escape') { e.preventDefault(); closeFind(); }
  });
}
$('btnFindPrev')?.addEventListener('click', () => stepFind(-1));
$('btnFindNext')?.addEventListener('click', () => stepFind(1));
$('btnFindClose')?.addEventListener('click', closeFind);

/* ══ 技炉面板 ════════════════════════════════════════════════ */
const skillPanel = $('skillPanel');
const skillGrid = $('skillGrid');
(function () {
  const host = skillGrid.closest('.sk-scroll') || skillGrid;
  host.addEventListener('scroll', () => {
    if (host.scrollTop + host.clientHeight >= host.scrollHeight - 320) skillGridAppend();
  }, { passive: true });
})();
const skillSearch = $('skillSearch');
let skillCat = 'all';
let skillView = 'library';
let skillSrc = 'all';
function srcOf(s) { return s.src || (s.custom ? 'custom' : 'official'); }

// 技炉广场（发现技炉）：静态条目，安装进自定义
const DISCOVER_POOL = [
  { id: 'd1', cat: 'prompt', icon: '📰', name: '新闻摘要', desc: '抓取当前页面新闻，按事件分组输出要点', prompt: '把当前页面里的新闻整理成摘要：按事件分组，每条一到两句话，标注来源与时间。' },
  { id: 'd2', cat: 'prompt', icon: '💻', name: '代码解释', desc: '解释选中代码做了什么，标出风险点', prompt: '解释这段代码在做什么，逐段说明，并指出可能的 bug 或风险：\n\n```\n\n```' },
  { id: 'd3', cat: 'prompt', icon: '✍️', name: '中英互译', desc: '保留术语与格式的精准翻译', prompt: '把下面内容翻译成英文，保留专业术语与原有格式：\n\n' },
  { id: 'd4', cat: 'prompt', icon: '📅', name: '日程规划', desc: '把待办排成一天的时间表', prompt: '根据我今天的待办，排一份时间表：按优先级与依赖排序，留出缓冲时间。' },
  { id: 'd5', cat: 'prompt', icon: '📧', name: '邮件起草', desc: '按场景起草正式邮件', prompt: '帮我起草一封邮件，主题是：，语气正式简洁，包含称呼、正文、结尾。' },
  { id: 'd6', cat: 'prompt', icon: '📄', name: '简历优化', desc: '按岗位要求重写简历要点', prompt: '按岗位要求重写我的简历要点：突出量化结果，控制在每条两行内。' },
];
let customSkills = [];

const BUILTIN_SKILLS = [
  { id: 'b1', cat: 'prompt', icon: '🛒', name: '省钱助手', desc: '想找外卖红包、购物优惠或出行折扣，却总在几个 App 之间来回比价？把当前页面和已打开标签页里的优惠券、红包、满减活动整理成清单，标清来源、面额、使用条件和到期时间，帮你挑出真正划算的组合。适合点餐、购物、订酒店和出行前快速算账。优惠以目标平台实际展示为准，助手不代为下单。', prompt: '帮我在当前页和已打开的标签页里找可用的优惠券、红包与满减活动，整理成清单：来源、面额、使用条件、到期时间。' },
  { id: 'b2', cat: 'prompt', icon: '🍔', name: '生活助手', desc: '点外卖、订酒店、看出行选项时，价格和优惠组合太多不知道选哪个？对比当前页面里的候选方案，列出原价、优惠和到手价，给出最省钱的组合建议。适合外卖、美食、酒店和出行等日常消费场景。价格与库存以目标平台为准，下单前请自行核对。', prompt: '对比当前页面里的外卖/酒店/出行选项，列出价格、优惠和到手价，给出最省钱的组合。' },
  { id: 'b3', cat: 'task', icon: '🎨', name: '生成图片', desc: '有一段文字描述，但不知道怎么写提示词才能生成想要的图？把当前页面内容提炼成文生图提示词（主体、场景、风格、构图、光线），渲染出图片，也可以按你的要求修改已有图片。适合做封面图、配图和概念图。生成结果受模型能力限制，细节可能需要多试几次。', prompt: '把当前页面内容提炼成一段可直接用于文生图的提示词（主体、场景、风格、构图、光线），然后调用 generate_image 生成。' },
  { id: 'b4', cat: 'prompt', icon: '📈', name: '金融市场分析', desc: '看股票、基金或 ETF 页面时，数据很多却抓不住重点？分析当前页面的关键指标、趋势和风险点，核验数据来源，给出结构化判断。适合读财报、看行情和做市场速览。分析基于页面可见数据，不构成投资建议。', prompt: '分析当前页面里的金融市场数据：关键指标、趋势判断、风险点，并核验数据来源。' },
  { id: 'b5', cat: 'prompt', icon: '🔬', name: '深度研究', desc: '遇到复杂问题，想查得深一点又怕信息零散？围绕你的问题检索当前页面和已打开标签页，交叉核验多方资料，输出结构化结论、证据来源和不确定的地方。适合写报告、做方案和快速摸清一个陌生领域。', prompt: '围绕我的问题做深度研究：先在当前页和已打开的标签页收集信息，再交叉核验，输出结构化结论 + 证据来源 + 不确定处。' },
  { id: 'b6', cat: 'script', icon: '🌐', name: '生成网页', desc: '想把页面内容变成一个能直接打开的网页？生成单文件 HTML（内联样式、响应式、可交互），内容取自当前页面，代码可直接保存运行。适合做落地页、数据看板和内容卡片。', prompt: '根据当前页面内容生成一个可直接打开的单文件 HTML（内联样式、响应式、可用），把代码给我。' },
  { id: 'b7', cat: 'task', src: 'installed', icon: '📊', name: '生成 PPT', desc: '要把页面内容整理成演示文稿，但排版很费时间？提取正文并整理成 5–8 页结构（每页标题 + 要点 + 备注），生成可编辑的 PPT。适合汇报、分享和提案。生成后可在 PowerPoint 里继续调整。', prompt: '把当前页面内容整理成 5–8 页演示结构（每页标题 + 3–5 条要点 + 备注），调用 gen_pptx（mcp_gen_pptx）生成 PPT。' },
  { id: 'b8', cat: 'script', icon: '🧩', name: '网页脚本', desc: '想自动化页面上的重复操作，又不想手动点？根据你的描述写一段可直接注入当前页面执行的 JavaScript，完成点击、填表、提取等操作，并说明如何验证效果。适合批量操作和页面调试。脚本只在当前页面生效。', prompt: '写一段可以直接注入当前页面执行的 JavaScript，完成我描述的操作，并说明如何验证效果。' },
  { id: 'b9', cat: 'task', src: 'installed', icon: '📄', name: '生成 PDF', desc: '需要把网页内容整理成一份能打印的文档？提取正文并按标题、小节、要点、表格排成结构化内容，导出 A4 PDF。适合做报告、手册和资料归档。排版自动分页，表格不跨页断裂。', prompt: '把当前页面正文整理成结构化内容（标题、小节、要点、表格），调用 gen_pdf（mcp_gen_pdf）生成 PDF。' },
  { id: 'b10', cat: 'task', icon: '📗', name: '生成 Excel', desc: '页面里的表格想导入 Excel 继续计算？把表格数据整理成结构化的列和行，生成可打开的 Excel 文件。适合做数据整理、对比和二次计算。', prompt: '把当前页面里的表格数据整理成 columns 和 rows，调用 gen_xlsx（mcp_gen_xlsx）生成 Excel。' },
  { id: 'b11', cat: 'task', icon: '📘', name: '生成 Word', desc: '需要一份带标题层级的 Word 文档？把正文整理成标题、小节和要点结构，生成可打印的 Word 文件。适合写纪要、报告和正式文档。', prompt: '把当前页面正文整理成标题、小节、要点结构，调用 gen_docx（mcp_gen_docx）生成 Word。' },
  { id: 'b12', cat: 'prompt', icon: '📝', name: '总结本页', desc: '打开一篇长文，想先知道它讲什么？通读当前页面，用要点总结页面主题、核心信息和值得注意的细节。适合快速判断一篇文章值不值得细读。', prompt: '读取当前页面内容，用要点总结：这是什么页面、核心信息、值得注意的细节。' },
  { id: 'b13', cat: 'prompt', icon: '🌐', name: '翻译成中文', desc: '遇到英文页面或资料，想快速读懂？把正文翻译成简体中文，专业术语保留原文并加括号。适合读文档、论文和外文新闻。', prompt: '把当前页面正文翻译成简体中文，专业术语保留原文并加括号。' },
  { id: 'b14', cat: 'prompt', icon: '📋', name: '提取表格', desc: '页面里有多张表格，手动复制很麻烦？抓取当前页面所有表格，按「表名 → 列 → 行」输出结构化数据，方便粘贴到表格工具。适合做资料整理和数据核对。', prompt: '把当前页面里的所有表格提取出来，按「表名 → 列 → 行」输出。' },
  { id: 'b15', cat: 'script', icon: '📌', name: '打工人便利贴', desc: '可拖拽至页面任意位置，随时随地记录一切。在任意网页贴上便签，随开随记，位置和内容都会保留，适合记待办、记灵感、临时存一些不想丢的片段。', prompt: '在当前页面打开或创建一个可拖拽的便签，记录我接下来提供的内容，并保持可编辑。', author: '喜之螂', installs: 865, codeFile: 'scripts/b15.user.js'  },
  { id: 'b16', cat: 'script', icon: '⚙️', name: '智能工作流引擎', desc: '你的全能网页助手：集成阅读增强（字号/行高/护眼/专注/沉浸模式）、视频倍速控制（0.5x-16x 锁定）、快速笔记（划词快捷添加 + MD 导出）、待办清单、番茄钟（5/15/25/45 分钟）。毛玻璃 UI、模块化设计、零配置启动、数据本地持久化。', prompt: '在当前页面启用智能工作流引擎：阅读增强、视频倍速控制、快速笔记、待办与番茄钟。', author: '围巾哥萧尘', installs: 762, codeFile: 'scripts/b16.user.js'  },
  { id: 'b17', cat: 'script', icon: '🗒️', name: '便签', desc: '在网页上随手贴便签，记录临时信息，支持拖拽与编辑，适合快速记下看到的内容或待办。', prompt: '在当前页面创建一个便签，把我给你的内容写进去。', author: 'smiler', installs: 748, codeFile: 'scripts/b17.user.js'  },
  { id: 'b18', cat: 'script', icon: '✅', name: '待办事项', desc: '右键悬浮球打开菜单，支持待办清单与提醒；「技炉」每个网页用「提醒」需要允许网页通知。支持数据导出/导入，油猴版支持云同步。', prompt: '在当前页面打开待办清单，添加我接下来提供的待办事项。', author: 'smiler', installs: 736, codeFile: 'scripts/b18.user.js'  },
  { id: 'b19', cat: 'script', icon: '🏷️', name: '奇点标签', desc: '拖拽、便签、贴图、计时、表格一体的网页工作台：悬浮便签随开随记、支持图片与表格、内置番茄钟/倒计时、批量收纳与一键清空。', prompt: '在当前页面启用奇点标签工作台。', author: '奇点标签', installs: 0, codeFile: 'scripts/b19.user.js'  },
  { id: 'b20', cat: 'task', src: 'installed', icon: '🎓', name: 'B站学习视频对比推荐', desc: '想在 B 站学一项技能，却不知道哪个视频更适合自己？提供学习主题、当前基础、学习目标和时间安排，技炉会筛选可访问的视频或课程，并从内容方向、学习难度、课程结构、热度和用户反馈等方面进行比较，生成课程对比表与推荐建议。适合备考、软件学习、兴趣培养及生活技能入门时使用。', prompt: '帮我对比 B站上关于我主题的学习视频，从内容方向、难度、结构、热度和反馈打分，输出对比表与推荐顺序。', author: '萝萝山大王', installs: 17105 },
  { id: 'b21', cat: 'task', src: 'installed', icon: '📝', name: 'B站课程视频学习笔记', desc: '一键把当前 B站课程视频整理成便于复习的结构化学习笔记（仅适用于有 AI 字幕的视频）。选择是否保留时间戳，技炉会提取当前视频可读取的字幕，整理为便于复制和保存的文本，也可生成 TXT 文件。适合整理课程内容、保存学习资料、制作笔记或回顾视频重点。', prompt: '把当前 B站视频的字幕提取出来，整理成结构化学习笔记，可选保留时间戳并导出 TXT。', author: '萝萝山大王', installs: 16466 },
  { id: 'b22', cat: 'task', src: 'installed', icon: '📚', name: '知网文献筛选助手', desc: '查论文时结果太多，不知道哪些真正值得读？根据你提供的研究主题、地域范围和研究重点，梳理检索方向、筛选高度相关的 7-15 篇优质文献，并生成精简文献清单、入选理由与推荐阅读顺序。适合撰写课程论文、毕业论文、开题报告、文献综述或开展专题研究时使用。', prompt: '根据我的研究主题、地域范围和研究重点，梳理检索方向，筛选 7-15 篇高相关文献，输出清单、入选理由与阅读顺序。', author: '萝萝山大王', installs: 15631 },
  { id: 'b23', cat: 'task', src: 'installed', icon: '📖', name: '考研英语学习计划', desc: '基础薄弱不知道先背单词还是看网课？想冲高分不知道如何突破？结合你的英语基础、目标分数、备考时间和当前进度，判断适合的学习路线，安排词汇、真题、写作等任务，并给出资料和课程建议。最后生成 J 人版或 P 人版规划，让你知道当前重点、每周怎么学、什么时候复盘。', prompt: '结合我的基础、目标分数、备考时间和进度，帮我制定一份可执行的考研英语学习计划（J 人版 / P 人版可选）。', author: '去码头整点内存条', installs: 15098 },
  { id: 'b24', cat: 'script', icon: '👑', name: '你就是爱奇艺VIP', desc: '适用于爱奇艺，绕过会员限制直接看 VIP 视频。仅用于个人学习体验，请支持正版。', prompt: '在爱奇艺页面启用 VIP 观看。', author: '益生菌', installs: 12245 },
  { id: 'b25', cat: 'script', icon: '🧰', name: '全能工具箱', desc: '网页脚本工具集，集成常用页面增强与快捷操作，可一键安装启用。', prompt: '在当前页面启用全能工具箱。', author: '插件作者', installs: 0 },
  { id: 'b26', cat: 'task', icon: '🎬', name: '短剧改编方案', desc: '把网络小说、短篇小说、自媒体内容改编成微短剧方案（10-30 集，每集 3-10 分钟）。自动提取高能片段、设计悬念钩子、优化平台适配、规划商业化路径。适用于网络小说、短篇小说、自媒体内容的快速影视化变现。', prompt: '把我的小说/故事改编成 10-30 集微短剧方案：提取高能片段、设计悬念钩子、适配平台、规划商业化。', author: '围巾哥萧尘', installs: 3276 },
  { id: 'b27', cat: 'prompt', icon: '🤖', name: '文本去 AI 化', desc: '将 AI 生成的文本转化为更自然、更人性化的表达；也可以引用自己写的文章，让它按照你的文字风格修改，去掉机器感。', prompt: '把这段 AI 生成的文本改写成自然、有人味的表达，保留信息但去掉机器腔；可以按我提供的范文风格改写。', author: 'Mo', installs: 3126 },
  { id: 'b28', cat: 'prompt', icon: '🎥', name: '视频总结', desc: '将视频快速转化为文字总结报告，支持 B 站、YouTube、抖音、小红书等主流视频网站。适合快速浏览长视频、提取要点和做学习笔记。', prompt: '总结当前视频的内容，输出结构化文字报告：主题、要点、时间线、关键结论。', author: 'Calvin', installs: 3046 },
  { id: 'b29', cat: 'task', icon: '🛒', name: '全网比价决策助手', desc: '输入商品名称或打开商品页面，自动在淘宝、京东、拼多多三大平台搜索比价，深度分析真实评价，30 秒生成跨平台对比报告。实时比价、评价去水、智能推荐，给出最终购买建议。', prompt: '帮我对比这个商品在淘宝、京东、拼多多的价格与优惠，识别刷单好评，给出购买建议。', author: '青言AI进化论', installs: 2824 },
  { id: 'b30', cat: 'prompt', icon: '🖼️', name: '图→反推提示词', desc: '（先选技炉再截图）根据图片反推 AI 生图的提示词，适合复刻参考图的风格与构图。', prompt: '根据我提供的图片，反推一段可用于 AI 生图的提示词，覆盖主体、场景、风格、构图与光线。', author: '666ahxxx', installs: 2750 },
  { id: 'b31', cat: 'task', icon: '📈', name: '金融大师·自进化', desc: '专业的全品类金融投资分析助手：股票推荐、评分、走势分析、基本面评估、交易建议、市场日总结、新股申购建议，并支持理财产品、基金、债券、保险分析。支持多平台财经师舆情分析与 .txt 批量导入。分析不构成投资建议。', prompt: '对当前页面或我提供的标的做全品类金融分析：走势、基本面、风险与操作建议，并标注数据来源。', author: 'Hermione', installs: 2723 },
  { id: 'b32', cat: 'script', icon: '📦', name: '小红书收藏整理', desc: '整理小红书收藏内容，支持分类归档与批量处理，方便后续查找。', prompt: '整理我小红书收藏的内容，按主题分类并给出索引。', author: 'Leo的屋儿', installs: 2599 },
  { id: 'b33', cat: 'task', icon: '🎞️', name: '内容转视频生成器', desc: '输入任意文字内容，自动生成精美动画视频。支持产品介绍、社交媒体、知识科普、教程演示等多种场景，一键输出 MP4。无需剪辑软件，像写网页一样做视频。', prompt: '把我提供的文字内容生成一段动画视频（MP4），按场景设计节奏与转场。', author: '围巾哥萧尘', installs: 2262 },
  ...(Array.isArray(window.YUZE_DISCOVER_EXTRA) ? window.YUZE_DISCOVER_EXTRA : []),
];

async function loadCustomSkills() {
  const o = await chrome.storage.local.get('skills');
  customSkills = Array.isArray(o.skills) ? o.skills : [];
}
async function saveCustomSkills() {
  await chrome.storage.local.set({ skills: customSkills });
}

function openSkillPanel() {
  closeDrawer();
  modelMenu.classList.add('hidden');
  skillMenu.classList.add('hidden');
  quoteMenu.classList.add('hidden');
  closeMcpPanel();
  skillPanel.classList.remove('hidden');
  skillSearch.value = '';
  renderSkillGrid();
  // 面板刚显示时高度还没算出来，下一帧再渲染一次，避免网格塌成 0 高
  requestAnimationFrame(() => {
    if (!skillPanel.classList.contains('hidden')) renderSkillGrid();
  });
}

function closeSkillPanel() {
  skillPanel.classList.add('hidden');
}

function updateSkillHead() {
  const all = skillView === 'discover' ? DISCOVER_POOL : BUILTIN_SKILLS.concat(customSkills);
  const n = (f) => all.filter((s) => f(srcOf(s))).length;
  const cnt = { all: all.length, official: n((x) => x === 'official'), installed: n((x) => x === 'installed'), custom: n((x) => x === 'custom') };
  const set = (id, v) => { const el = $(id); if (el) el.textContent = v; };
  set('nAll', cnt.all);
  set('nOfficial', cnt.official);
  set('nInstalled', cnt.installed);
  set('nCustom', cnt.custom);
  const titles = { all: '全部', official: '官方技炉', installed: '已安装技炉', custom: '自定义技炉' };
  const subs = { all: '管理官方技炉、已安装技炉和你创建的技炉', official: '官方提供的技炉，开箱即用', installed: '从技炉广场安装的技炉', custom: '你创建的自定义技炉' };
  set('skMainTitle', titles[skillSrc] || '全部');
  set('skMainSub', subs[skillSrc] || '');
  const g = $('skGroupTitle');
  if (g) {
    g.textContent = (titles[skillSrc] || '全部') + ' ';
    const em = document.createElement('em');
    em.textContent = String(cnt[skillSrc] ?? cnt.all);
    g.appendChild(em);
  }
}

function renderSkillGrid() {
  const q = String(skillSearch.value || '').trim().toLowerCase();
  const source = skillView === 'discover' ? DISCOVER_POOL : BUILTIN_SKILLS.concat(customSkills);
  const rows = source.filter((s) =>
    (skillCat === 'all' || s.cat === skillCat) &&
    (skillSrc === 'all' || srcOf(s) === skillSrc) &&
    (!q || (s.name + ' ' + (s.desc || '') + ' ' + (s.prompt || '')).toLowerCase().includes(q))
  );
  skillGrid.innerHTML = '';
  updateSrcCounts();
  updateSkillHead();
  if (!rows.length) {
    const e = document.createElement('div');
    e.className = 'empty';
    e.textContent = '没有匹配的技炉';
    skillGrid.appendChild(e);
    return;
  }
  skillGrid._rows = rows;
  skillGrid._shown = 0;
  skillGridAppend();
}

function skillGridAppend() {
  const rows = skillGrid._rows || [];
  const PAGE = 80;
  const next = rows.slice(skillGrid._shown, skillGrid._shown + PAGE);
  next.forEach((s) => skillGrid.appendChild(skillCard(s)));
  skillGrid._shown += next.length;
}

function skillCard(s) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'sk-card';
  const row = document.createElement('div');
  row.className = 'sk-row1';
  const ic = document.createElement('span');
  ic.className = 'sk-card-ic';
  ic.textContent = s.icon || '\u2728';
  const b = document.createElement('b');
  b.textContent = s.name;
  row.append(ic, b);
  const em = document.createElement('em');
  em.className = 'sk-desc';
  em.textContent = s.desc || '';
  const foot = document.createElement('div');
  foot.className = 'sk-foot';
  if (s.author) {
    foot.textContent = s.author + (s.installs ? ' \u00b7 ' + s.installs.toLocaleString() + ' \u4eba\u5b89\u88c5' : '');
  } else {
    foot.textContent = '\u81ea\u52a8\u66f4\u65b0';
  }
  card.append(row, em, foot);
  if (s.custom) {
    const del = document.createElement('span');
    del.className = 'sk-card-del';
    del.textContent = '\u00d7';
    del.title = '\u5220\u9664\u5999\u62db';
    del.addEventListener('click', async (e) => {
      e.stopPropagation();
      customSkills = customSkills.filter((x) => x.id !== s.id);
      await saveCustomSkills();
      renderSkillGrid();
    });
    card.appendChild(del);
  }
  if (skillView === 'discover') {
    const has = customSkills.some((x) => x.name === s.name);
    if (has) {
      const tag = document.createElement('span');
      tag.className = 'sk-card-tag';
      tag.textContent = '\u5df2\u5b89\u88c5';
      card.appendChild(tag);
    } else {
      const tag = document.createElement('span');
      tag.className = 'sk-card-tag add';
      tag.textContent = '+ \u5b89\u88c5';
      tag.addEventListener('click', async (e) => {
        e.stopPropagation();
        customSkills.push({ ...s, id: uid(), custom: true, src: 'installed', desc: s.desc });
        await saveCustomSkills();
        renderSkillGrid();
      });
      card.appendChild(tag);
    }
  }
  card.addEventListener('click', () => {
    openSkillDetail(s);
  });
  return card;
}

document.querySelectorAll('.sk-tab').forEach((b) => {
  b.addEventListener('click', () => {
    skillCat = b.dataset.cat;
    document.querySelectorAll('.sk-tab').forEach((x) => x.classList.toggle('active', x === b));
    renderSkillGrid();
  });
});
skillSearch.addEventListener('input', renderSkillGrid);
$('btnSkillClose').addEventListener('click', closeSkillPanel);

document.querySelectorAll('.sk-src').forEach((b) => {
  b.addEventListener('click', () => {
    skillSrc = b.dataset.src;
    document.querySelectorAll('.sk-src').forEach((x) => x.classList.toggle('active', x === b));
    renderSkillGrid();
  });
});

function updateSrcCounts() {
  const all = BUILTIN_SKILLS.concat(customSkills);
  const n = (f) => all.filter((s) => f(srcOf(s))).length;
  const map = { all: all.length, official: n((x) => x === 'official'), installed: n((x) => x === 'installed'), custom: n((x) => x === 'custom') };
  document.querySelectorAll('.sk-src').forEach((b) => {
    let el = b.querySelector('em') || b.querySelector('i');
    if (!el) { el = document.createElement('em'); b.appendChild(el); }
    el.textContent = String(map[b.dataset.src] || 0);
  });
}

$('btnSkillNew').addEventListener('click', openSkillTypePicker);
$('btnSkillNewTop').addEventListener('click', () => $('btnSkillNew').click());

loadCustomSkills();


/* ── 技炉详情 ─────────────────────────────────────────── */

const MZ_EXAMPLES = {
  '生成 PDF': [
    '制作一份《常见网络诈骗图鉴》PDF：结合近一年公开案例，用聊天、电话、支付和屏幕共享场景拆解典型套路，并给出遇到可疑情况时的处理顺序。',
    '制作一份可打印的《家庭应急准备手册》PDF：按停电、火灾、暴雨和突发就医分类，说明当下应该做什么，并附上可勾选的物资与联系方式清单。',
    '制作一套 A4 可打印的全年计划 PDF：从本月开始共 12 个月，每月包含日历、三件要事、习惯记录和自由书写区，并先填好一页示例。'
  ],
  '生成 PPT': [
    '把当前页面整理成 6 页汇报 PPT：每页一个标题、3 条要点，最后一页给行动建议。',
    '做一份周报演示：本周进展、数据变化、问题与下周计划各一页。'
  ],
  '生成 Excel': [
    '把当前页面的订单列表导出成 Excel：订单号、日期、状态、金额、区域五列，全部行都要。',
    '把页面里的指标做成多表 Excel：明细表 + 按区域汇总表。'
  ],
  '生成 Word': [
    '把当前页面正文整理成正式 Word 文档，保留小标题和列表，长文别压缩。',
    '做一份会议纪要 Word：议题、结论、待办三项，待办标负责人。'
  ],
  '深度研究': [
    '围绕「订单派发效率」查一遍公开资料，给出 5 条可落地的优化建议，并标出每条的证据来源。',
    '把当前页面提到的三家竞品做成对比表，标出数据缺口。'
  ],
  '生成网页': [
    '把当前页面内容做成一个单文件 HTML，内联样式，可直接双击打开。',
    '做一个数据看板页面：顶部三个指标卡，下面是趋势图。'
  ]
};


let mzCurrent = null;

function mzEsc(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function openSkillDetail(s) {
  if (!s) return;
  mzCurrent = s;

  $('sdIcon').textContent = s.icon || '✨';
  $('sdName').textContent = s.name || '技炉';
  $('sdMeta').textContent = '创建者 Yuze-agent · 最后更新 2026-10-18 · 版本 v1';
  const intro = (s.desc || s.name || '技炉') + '。当你在任务中描述类似需求时，Yuze-agent 会按这个技炉的固定流程执行：先确认页面状态与数据来源，再整理结果并标注来源、时间与不确定项。你可以直接输入任务，也可以点上方「去试试」把示例带入输入框。';
  const contents = '加载条件：用户从「技能」面板选择本技炉，或在任务中直接描述对应需求时加载；同一会话内持续生效，换新对话需重新选择。\n\n执行方式：' + (s.prompt || s.desc || '') + '\n\n输出要求：结果按结构化格式呈现，标注来源与时间；数据有出入或无法确认时明确说明，不臆测缺失信息。\n\n适用边界：仅处理当前请求，不会自动应用到其他对话；涉及网页操作时先确认页面状态再执行；涉及价格、库存、优惠等信息以目标平台为准。';
  if ($('sdIntro')) $('sdIntro').textContent = intro;
  $('sdSkillDesc').textContent = contents;

  const slug = String(s.name || '').replace(/\s+/g, '-').toLowerCase();
  const flow = String(s.prompt || '').split(/[。；;\n]/).map((t) => t.trim()).filter(Boolean).slice(0, 6);
  const md = '# ' + (s.name || '技炉') + '\n\n' + (s.desc || '') + '\n\n' +
    '## 加载条件\n- 用户从「技能」面板选择本技炉后发出任务时加载\n- 仅对当前请求生效，不会自动应用到其他对话\n\n' +
    '## 执行流程\n' + flow.map((t, i) => (i + 1) + '. ' + t).join('\n') + (flow.length ? '' : '1. 按任务描述执行并给出结果') + '\n\n' +
    '## 输出要求\n- 结构化输出，标注来源与不确定项\n- 涉及网页操作时先确认页面状态再执行';
  $('sdMd').innerHTML =
    '<table class="sd-mdt">' +
      '<tr><td>name</td><td>' + mzEsc(slug) + '</td></tr>' +
      '<tr><td>description</td><td>' + mzEsc(s.desc || '') + '</td></tr>' +
      '<tr><td>title</td><td>' + mzEsc(s.name || '') + '</td></tr>' +
      '<tr><td>author</td><td>Yuze-agent</td></tr>' +
    '</table>' +
    '<div class="sd-md-body">' + mdToHtml(md) + '</div>';

  const ex = $('sdExamples');
  ex.innerHTML = '';
  const list = MZ_EXAMPLES[s.name] || (s.prompt ? [s.prompt] : []);
  for (const t of list) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'sd-ex';
    const ic = document.createElement('span');
    ic.className = 'sd-ex-ico';
    ic.textContent = '✦';
    const tx = document.createElement('span');
    tx.className = 'sd-ex-txt';
    tx.textContent = t;
    const go = document.createElement('span');
    go.className = 'sd-ex-go';
    go.textContent = '›';
    btn.append(ic, tx, go);
    btn.addEventListener('click', () => runSkillNow(s, t));
    ex.appendChild(btn);
  }

  fixSkillMdList();
  const runBtn = $('btnSkillRun');
  if (runBtn) runBtn.style.display = s.codeFile ? '' : 'none';
  // 非脚本类技炉（提示词/任务型）没有脚本可跑，改为「去试试」——点击把技炉提示词作为引用卡片加入输入框
  const tryBtn = $('btnSkillTry');
  if (tryBtn) {
    const canTry = !s.codeFile && !!(s.prompt || s.desc);
    tryBtn.style.display = canTry ? '' : 'none';
    tryBtn.title = canTry ? '把「' + (s.name || '技炉') + '」的提示词作为引用加入输入框' : '';
  }
  const pauseBtn = $('btnSkillPause');
  if (pauseBtn) {
    pauseBtn.style.display = 'none';
    pauseBtn.textContent = '⏸ 暂停运行';
    pauseBtn.classList.remove('paused');
    pauseBtn.disabled = false;
  }
  (async () => {
    try {
      const { skillSites = {} } = await chrome.storage.local.get('skillSites');
      const site = skillSites[s.id] || '';
      if ($('sdSiteText')) $('sdSiteText').textContent = site ? '🌐 ' + site : '🌐 全部网站';
    } catch (_) {}
  })();
  (async () => {
    try {
      const { autoSkills = [] } = await chrome.storage.local.get('autoSkills');
      const on = autoSkills.some((x) => x.id === s.id);
      document.querySelectorAll('.sd-mode').forEach((m) => m.classList.toggle('active', m.dataset.mode === (on ? 'auto' : 'manual')));
    } catch (_) {}
  })();

  const codeEl = $('sdCode');
  if (codeEl) {
    codeEl.value = '';
    sdDefaultCode = '';
    const ov = (scriptOverrides || {})[s.id];
    if (s.codeFile) {
      codeEl.value = '加载中…';
      if (ov != null) {
        sdDefaultCode = ov;
        codeEl.value = ov;
      } else {
        fetch(chrome.runtime.getURL(s.codeFile))
          .then((r) => r.text())
          .then((t) => { sdDefaultCode = t; if (mzCurrent && mzCurrent.id === s.id) codeEl.value = t; updateSdCodeBtns(); })
          .catch((e) => { codeEl.value = '读取失败：' + (e && e.message); });
      }
    } else {
      codeEl.value = '该技炉不含脚本代码（提示词类）。';
    }
    codeEl.readOnly = !s.codeFile;
    updateSdCodeBtns();
  }

  skillPanel.classList.add('hidden');
  $('skillDetail').classList.remove('hidden');
  const sc = document.querySelector('.sd-scroll');
  if (sc) sc.scrollTop = 0;
}

function runSkillNow(s, text) {
  const body = text || s.prompt || '';
  addQuote(s.name, body, { kind: 'skill', prompt: body });
  closeSkillDetail();
  inpMsg.focus();
}

$('btnSkillPause')?.addEventListener('click', async () => {
  if (!mzCurrent) return;
  const b = $('btnSkillPause');
  const origText = '⏸ 暂停运行';
  b.disabled = true;
  b.textContent = '暂停中…';
  let wasAuto = false;
  try {
    const { autoSkills = [] } = await chrome.storage.local.get('autoSkills');
    wasAuto = autoSkills.some((x) => x.id === mzCurrent.id);
    if (wasAuto) {
      await chrome.storage.local.set({ autoSkills: autoSkills.filter((x) => x.id !== mzCurrent.id) });
      const modes = document.querySelectorAll('.sd-mode');
      modes.forEach((m) => m.classList.toggle('active', m.dataset.mode === 'manual'));
    }
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) await chrome.tabs.reload(tab.id).catch(() => {});
    if (attachedTabId !== null && tab && tab.id === attachedTabId) attachedTabId = null;
    b.textContent = '✓ 已暂停';
    b.classList.add('paused');
    setStatus('已暂停：页面已刷新，脚本已停止' + (wasAuto ? '（自动运行已关闭）' : ''));
    setTimeout(() => setStatus(''), 3200);
  } catch (e) {
    b.textContent = origText;
    setStatus('暂停失败：' + ((e && e.message) || e));
    setTimeout(() => setStatus(''), 3200);
  } finally {
    b.disabled = false;
    setTimeout(() => {
      if (b.textContent === '✓ 已暂停') {
        b.textContent = origText;
        b.classList.remove('paused');
      }
    }, 2200);
  }
});

function setRunBtn(state, text, ms) {
  const b = $('btnSkillRun');
  if (!b) return;
  if (!b._orig) b._orig = b.textContent;
  clearTimeout(b._timer);
  b.classList.remove('busy', 'ok', 'err');
  b.disabled = false;
  if (state === 'busy') {
    b.classList.add('busy');
    b.textContent = text || '运行中…';
    b.disabled = true;
    return;
  }
  if (state === 'ok') { b.classList.add('ok'); b.textContent = text || '✓ 运行成功'; }
  else if (state === 'err') { b.classList.add('err'); b.textContent = text || '✗ 运行失败'; }
  else { b.textContent = b._orig || '▶ 运行脚本'; return; }
  b._timer = setTimeout(() => {
    b.classList.remove('ok', 'err');
    b.textContent = b._orig || '▶ 运行脚本';
  }, ms || 2400);
}

// 非脚本类技炉：点击把提示词作为引用卡片带入输入框（与「试试这样问」示例按钮同一链路）
$('btnSkillTry')?.addEventListener('click', () => {
  if (!mzCurrent) return;
  const b = $('btnSkillTry');
  const orig = '✦ 去试试';
  b.textContent = '✦ 已加入引用';
  setTimeout(() => { b.textContent = orig; }, 1600);
  runSkillNow(mzCurrent);
});

$('btnSkillRun')?.addEventListener('click', async () => {
  if (!mzCurrent || !mzCurrent.codeFile) return;
  setRunBtn('busy');
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) throw new Error('没有活动标签页');
    const ov = (scriptOverrides || {})[mzCurrent.id];
    if (ov != null) {
      await cdp('Runtime.evaluate', { expression: ov, userGesture: true });
      setRunBtn('ok', '✓ 已运行（编辑版）', 2500);
      setStatus('已运行（编辑版）：' + mzCurrent.name);
    } else {
      if (attachedTabId !== null) {
        try { await chrome.debugger.detach({ tabId: attachedTabId }); } catch (_) {}
        attachedTabId = null;
      }
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: [mzCurrent.codeFile] });
      setRunBtn('ok', '✓ 已运行', 2500);
      setStatus('已运行：' + mzCurrent.name);
    }
    const pb = document.getElementById('btnSkillPause');
    if (pb) pb.style.display = '';
    setTimeout(() => setStatus(''), 2500);
  } catch (e) {
    const msg = (e && e.message) || String(e);
    setRunBtn('err', '✗ 运行失败', 3000);
    setStatus('运行失败：' + msg);
    setTimeout(() => setStatus(''), 4000);
  }
});

let sdDefaultCode = '';
let scriptOverrides = {};
(async () => { try { const o = await chrome.storage.local.get('scriptOverrides'); scriptOverrides = o.scriptOverrides || {}; } catch (_) {} })();

function updateSdCodeBtns() {
  const s = mzCurrent; const save = $('btnSdSave'); const reset = $('btnSdReset');
  if (!save || !reset) return;
  const editable = !!(s && s.codeFile);
  const val = $('sdCode') ? $('sdCode').value : '';
  save.classList.toggle('hidden', !editable || val === sdDefaultCode || !sdDefaultCode);
  reset.classList.toggle('hidden', !(editable && (scriptOverrides || {})[s.id] != null));
}
$('sdCode')?.addEventListener('input', updateSdCodeBtns);
$('btnSdSave')?.addEventListener('click', async () => {
  if (!mzCurrent || !mzCurrent.codeFile) return;
  scriptOverrides = scriptOverrides || {};
  scriptOverrides[mzCurrent.id] = $('sdCode').value;
  try {
    await chrome.storage.local.set({ scriptOverrides });
    setStatus('已保存脚本，下次运行生效');
    setTimeout(() => setStatus(''), 2500);
  } catch (e) {
    setStatus('保存失败：' + ((e && e.message) || e));
    setTimeout(() => setStatus(''), 4000);
  }
  updateSdCodeBtns();
});
$('btnSdReset')?.addEventListener('click', async () => {
  if (!mzCurrent || !mzCurrent.codeFile) return;
  delete scriptOverrides[mzCurrent.id];
  try { await chrome.storage.local.set({ scriptOverrides }); } catch (_) {}
  const el = $('sdCode');
  if (el && sdDefaultCode) el.value = sdDefaultCode;
  setStatus('已还原默认脚本');
  setTimeout(() => setStatus(''), 2500);
  updateSdCodeBtns();
});

function closeSkillDetail() {
  $('skillDetail').classList.add('hidden');
}

$('btnSkillSheetClose')?.addEventListener('click', closeSkillDetail);
$('btnSkillDetailClose')?.addEventListener('click', closeSkillDetail);
$('btnEditSite')?.addEventListener('click', async () => {
  if (!mzCurrent) return;
  try {
    const { skillSites = {} } = await chrome.storage.local.get('skillSites');
    const cur = skillSites[mzCurrent.id] || '';
    const url = window.prompt('\u9002\u7528\u7f51\u7ad9\uff08\u7559\u7a7a = \u5168\u90e8\u7f51\u7ad9\uff09', cur);
    if (url === null) return;
    const t = String(url).trim();
    if (t) skillSites[mzCurrent.id] = t; else delete skillSites[mzCurrent.id];
    await chrome.storage.local.set({ skillSites });
    if ($('sdSiteText')) $('sdSiteText').textContent = t ? '\ud83c\udf10 ' + t : '\ud83c\udf10 \u5168\u90e8\u7f51\u7ad9';
  } catch (e) {
    setStatus('\u4fdd\u5b58\u5931\u8d25\uff1a' + ((e && e.message) || e));
    setTimeout(() => setStatus(''), 3000);
  }
});

document.querySelectorAll('.sd-mode').forEach((m) => {
  m.addEventListener('click', async () => {
    if (!mzCurrent) return;
    try {
      const { autoSkills = [] } = await chrome.storage.local.get('autoSkills');
      const list = autoSkills.filter((x) => x.id !== mzCurrent.id);
      if (m.dataset.mode === 'auto') {
        if (!mzCurrent.codeFile) { setStatus('\u8be5\u5999\u62db\u6ca1\u6709\u811a\u672c\uff0c\u65e0\u6cd5\u81ea\u52a8\u8fd0\u884c'); setTimeout(() => setStatus(''), 2500); return; }
        const { skillSites = {} } = await chrome.storage.local.get('skillSites');
        list.push({ id: mzCurrent.id, name: mzCurrent.name, codeFile: mzCurrent.codeFile, match: skillSites[mzCurrent.id] || 'all' });
      }
      await chrome.storage.local.set({ autoSkills: list });
      document.querySelectorAll('.sd-mode').forEach((x) => x.classList.toggle('active', x === m));
      if (m.dataset.mode === 'auto') {
        // 切到自动后立即在当前页执行一次，避免等页面刷新
        try {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tab && tab.id) {
            await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: [mzCurrent.codeFile] });
            setStatus('\u5df2\u8bbe\u4e3a\u81ea\u52a8\u8fd0\u884c\uff0c\u5e76\u5728\u5f53\u524d\u9875\u6267\u884c\u4e86\u4e00\u6b21');
          } else {
            setStatus('\u5df2\u8bbe\u4e3a\u81ea\u52a8\u8fd0\u884c');
          }
        } catch (e) {
          setStatus('\u5df2\u8bbe\u7f6e\uff0c\u4f46\u5f53\u524d\u9875\u6267\u884c\u5931\u8d25\uff1a' + ((e && e.message) || e));
        }
      } else {
        setStatus('\u5df2\u8bbe\u4e3a\u624b\u52a8\u8fd0\u884c');
      }
      setTimeout(() => setStatus(''), 2600);
    } catch (e) {
      setStatus('\u4fdd\u5b58\u5931\u8d25\uff1a' + ((e && e.message) || e));
      setTimeout(() => setStatus(''), 3000);
    }
  });
});

$('btnSkillBack')?.addEventListener('click', () => {
  $('skillDetail').classList.add('hidden');
  skillPanel.classList.remove('hidden');
});

/* ── 创建技炉 ─────────────────────────────────────────── */

let seType = 'prompt';
let seSites = [];
let seOneClick = false;
let seRunMode = 'manual';

function openSkillTypePicker() {
  closeSkillPanel();
  $('skillTypeModal').classList.remove('hidden');
}

function closeSkillTypePicker() {
  $('skillTypeModal').classList.add('hidden');
}

function syncSegs() {
  document.querySelectorAll('#seOneClick .seg').forEach((b) => {
    b.classList.toggle('on', String(seOneClick ? 1 : 0) === b.dataset.v);
  });
  document.querySelectorAll('#seRunMode .seg').forEach((b) => {
    b.classList.toggle('on', seRunMode === b.dataset.v);
  });
  const h = $('seRunHint');
  if (h) {
    h.textContent = seRunMode === 'auto'
      ? '打开匹配网站时自动运行脚本'
      : '需要用户主动点击运行，脚本才会注入当前页面';
  }
}

function syncGroups() {
  document.querySelectorAll('#skillEdit .se-group').forEach((g) => {
    const list = String(g.dataset.for || '').split(/\s+/).filter(Boolean);
    g.hidden = !list.includes(seType);
  });
}

function renderSeSites() {
  const box = $('seSites');
  box.innerHTML = '';
  seSites.forEach((url, i) => {
    const chip = document.createElement('span');
    chip.className = 'se-site';
    const b = document.createElement('b');
    b.textContent = url;
    const x = document.createElement('button');
    x.type = 'button';
    x.textContent = '×';
    x.title = '移除';
    x.addEventListener('click', () => {
      seSites.splice(i, 1);
      renderSeSites();
    });
    chip.append(b, x);
    box.appendChild(chip);
  });
}

function openSkillEditor(type) {
  seType = type;
  seSites = [];
  seOneClick = false;
  seRunMode = 'manual';
  closeSkillTypePicker();
  closeSkillPanel();

  const kicker = type === 'prompt' ? '提示词' : type === 'script' ? '网页脚本' : '任务';
  $('seIcon').textContent = type === 'prompt' ? '💡' : type === 'script' ? '</>' : '🧰';
  $('seName').value = '';
  $('seMeta').textContent = kicker + ' · 创建者 我 · 最后更新 刚刚';
  $('sePrompt').value = '';
  $('seDesc').value = '';
  $('seDescCount').textContent = '0/1000';
  $('seMd').value = '---\nname: custom-skill\ndescription: ""\n---\n';
  $('seCode').value = '';

  renderSeSites();
  syncSegs();
  syncGroups();

  $('skillEdit').classList.remove('hidden');
  const sc = document.querySelector('#skillEdit .se-scroll');
  if (sc) sc.scrollTop = 0;
  setTimeout(() => { try { $('seName').focus(); } catch (_) {} }, 60);
}

function closeSkillEditor() {
  $('skillEdit').classList.add('hidden');
}

function backToCustomSkills() {
  closeSkillEditor();
  skillPanel.classList.remove('hidden');
  skillSrc = 'custom';
  skillView = 'library';
  document.querySelectorAll('.sk-src').forEach((b) => {
    b.classList.toggle('active', b.dataset.src === 'custom');
  });
  renderSkillGrid();
}

async function saveCustomSkill() {
  const name = ($('seName').value || '').trim();
  if (!name) {
    setStatus('先给技炉起个名字');
    $('seName').focus();
    return;
  }

  let item = null;

  if (seType === 'prompt') {
    const prompt = ($('sePrompt').value || '').trim();
    if (!prompt) { setStatus('提示词内容不能为空'); return; }
    item = {
      id: uid(), custom: true, src: 'custom', cat: 'prompt', icon: '💡',
      name, desc: prompt.slice(0, 46), prompt, oneClick: seOneClick
    };
  } else if (seType === 'script') {
    const code = ($('seCode').value || '').trim();
    if (!code) { setStatus('脚本代码不能为空'); return; }
    item = {
      id: uid(), custom: true, src: 'custom', cat: 'script', icon: '🧩',
      name, desc: '自定义网页脚本', prompt: code, code,
      sites: seSites.slice(), runMode: seRunMode
    };
  } else {
    const desc = ($('seDesc').value || '').trim();
    item = {
      id: uid(), custom: true, src: 'custom', cat: 'task', icon: '🧰',
      name, desc: desc || '自定义任务', prompt: desc,
      md: $('seMd').value, sites: seSites.slice()
    };
  }

  customSkills.push(item);
  await saveCustomSkills();

  closeSkillEditor();
  skillPanel.classList.remove('hidden');
  skillSrc = 'custom';
  document.querySelectorAll('.sk-src').forEach((b) => {
    b.classList.toggle('active', b.dataset.src === 'custom');
  });
  renderSkillGrid();
  setStatus('技炉已保存');
  setTimeout(() => setStatus(''), 2000);
}

document.querySelectorAll('#skillTypeModal .sm-type').forEach((b) => {
  b.addEventListener('click', () => openSkillEditor(b.dataset.type));
});
$('btnSkillTypeClose')?.addEventListener('click', closeSkillTypePicker);

document.querySelectorAll('#shotModal .sm-type').forEach((b) => {
  b.addEventListener('click', async () => {
    const mode = b.dataset.shot || 'view';
    closeShotMenu();
    // 让弹窗先淡出，再进入页面拖框，避免遮罩挡住选区
    if (mode === 'area') await sleep(180);
    doShot(mode);
  });
});
$('btnShotClose')?.addEventListener('click', closeShotMenu);
$('shotModal')?.addEventListener('click', (e) => { if (e.target === $('shotModal')) closeShotMenu(); });
$('btnSkillEditBack')?.addEventListener('click', backToCustomSkills);
$('btnSkillEditCancel')?.addEventListener('click', backToCustomSkills);
$('btnSkillEditSave')?.addEventListener('click', saveCustomSkill);

$('seOneClick')?.addEventListener('click', (e) => {
  const b = e.target.closest('.seg');
  if (!b) return;
  seOneClick = b.dataset.v === '1';
  syncSegs();
});
$('seRunMode')?.addEventListener('click', (e) => {
  const b = e.target.closest('.seg');
  if (!b) return;
  seRunMode = b.dataset.v;
  syncSegs();
});
$('seDesc')?.addEventListener('input', () => {
  const n = $('seDesc').value.length;
  $('seDescCount').textContent = n + '/1000';
});
$('btnSeAddSite')?.addEventListener('click', () => {
  const url = window.prompt('网页匹配规则（支持 * 通配符）', 'https://example.com/*');
  if (!url || !url.trim()) return;
  seSites.push(url.trim());
  renderSeSites();
});


/* SKILL.md 列表缩进写死，外部 CSS 没加载也不会把圆点切掉 */
function fixSkillMdList() {
  const box = $('sdMd');
  if (!box) return;
  box.style.padding = '14px 16px';
  box.querySelectorAll('ul, ol').forEach((el) => {
    el.style.paddingLeft = '24px';
    el.style.margin = '8px 0';
  });
  box.querySelectorAll('li').forEach((el) => {
    el.style.margin = '4px 0';
  });
  box.querySelectorAll('h1, h2, h3').forEach((el) => {
    el.style.margin = '16px 0 6px';
    el.style.fontSize = '13.5px';
    el.style.fontWeight = '600';
    el.style.color = '#1d1d1f';
  });
}

/* ── 截图/图片 hover 预览：事件委托，鼠标悬停在 q-img / tool-img 上浮出大图 ── */
(function installHoverPeek() {
  let peek = null, hideTimer = null;
  function ensure() {
    if (!peek) {
      peek = document.createElement('img');
      peek.className = 'hover-peek';
      document.body.appendChild(peek);
    }
    return peek;
  }
  function show(src, x, y) {
    const p = ensure();
    if (p.src !== src) p.src = src;
    p.classList.add('show');
    // 定位：优先显示在鼠标右侧，放不下换左侧；上下夹在视口内
    const vw = window.innerWidth, vh = window.innerHeight;
    const w = Math.min(560, vw * 0.92), h = vh * 0.78;
    let left = x + 16;
    if (left + w > vw - 8) left = Math.max(8, x - w - 16);
    let top = Math.min(Math.max(8, y - 40), vh - h - 8);
    p.style.left = left + 'px';
    p.style.top = top + 'px';
  }
  function hide() { if (peek) { peek.classList.remove('show'); } }
  document.addEventListener('mouseover', (e) => {
    const t = e.target;
    if (!(t instanceof HTMLImageElement) || !(t.classList.contains('q-img') || t.classList.contains('tool-img') || t.classList.contains('qc-img'))) return;
    clearTimeout(hideTimer);
    show(t.src, e.clientX, e.clientY);
  });
  document.addEventListener('mousemove', (e) => {
    if (!peek || !peek.classList.contains('show')) return;
    const t = e.target;
    if (t instanceof HTMLImageElement && (t.classList.contains('q-img') || t.classList.contains('tool-img') || t.classList.contains('qc-img'))) {
      show(t.src, e.clientX, e.clientY);
    } else {
      // 移出图片稍作延迟再收起，避免快速滑动闪断
      clearTimeout(hideTimer);
      hideTimer = setTimeout(hide, 180);
    }
  });
  document.addEventListener('mouseleave', hide);
})();

/* ══ 记忆模块 ═══════════════════════════════════════════════ */
// 存储：YZDB.memList/memPut/memDel/memClear（IndexedDB memories store）
// 注入：callLLM 里 getMemoryPrompt() 拼进系统提示
// 写入：①对话结束（run 收尾）后用 LLM 判断本轮是否有值得记住的新事实；②设置面板手动增删
const MEM_LIMIT = 200;      // 记忆条数上限
const MEM_PROMPT_MAX = 1500; // 注入提示词的字符上限

async function getMemoryPrompt() {
  if (!window.YZDB) return '';
  const rows = await window.YZDB.memList();
  if (!rows.length) return '';
  return rows.slice(0, 60).map((r) => '- ' + r.text).join('\n').slice(0, MEM_PROMPT_MAX);
}

async function memAddText(text) {
  text = String(text || '').trim();
  if (!text) return false;
  const rows = (await window.YZDB.memList()) || [];
  // 去重：完全相同文本不重复记
  if (rows.some((r) => r.text === text)) return false;
  await window.YZDB.memPut({ id: 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), text, at: Date.now(), hits: 0 });
  // 超上限删最旧
  if (rows.length + 1 > MEM_LIMIT) {
    for (const old of rows.slice(MEM_LIMIT - 1)) { try { await window.YZDB.memDel(old.id); } catch (_) {} }
  }
  return true;
}

// 每轮对话收尾后异步提炼：把「用户」最新两条消息交给 LLM 判断是否要记住
let memExtractBusy = false;
async function memExtractAfterTurn() {
  if (memExtractBusy || !window.YZDB) return;
  const users = messages.filter((m) => m.role === 'user').slice(-2);
  const lastUser = users[users.length - 1];
  const text = lastUser && (typeof lastUser.content === 'string'
    ? lastUser.content
    : (Array.isArray(lastUser.content) ? lastUser.content.filter((p) => p && p.type === 'text').map((p) => p.text).join(' ') : ''));
  if (!text || text.length < 6) return;
  memExtractBusy = true;
  try {
    const { apiKey, baseUrl, model } = await readConf();
    if (!apiKey) return;
    // 给最近一轮完整对话（user+assistant），模型才能分清哪些是用户的事实
    const lastA = [...messages].reverse().find((m) => m.role === 'assistant');
    const aText = lastA && typeof lastA.content === 'string' ? lastA.content : '';
    const res = await fetch(String(baseUrl).replace(/\/+$/, '') + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: '从这轮对话中提取值得跨对话长期记住的「用户本人」的事实与偏好：身份、长期目标、偏好习惯、稳定的项目背景。'
            + '严格禁止：助手说过的话（回复内容/能力说明/客套话）、一次性任务内容、网页内容、临时上下文。'
            + '只记用户明确表达或反复体现的持久信息；拿不准就不记，宁缺毋滥。'
            + '没有值得记的就只输出 NONE。有则每行一条简短陈述（以「用户」开头），不要编号，最多3条。' },
          { role: 'user', content: '[用户] ' + String(text).slice(0, 2000) + (aText ? '\n[助手] ' + String(aText).slice(0, 1000) : '') }
        ],
        max_tokens: 300
      })
    });
    if (!res.ok) return;
    const j = await res.json();
    const out = String(j.choices?.[0]?.message?.content || '').trim();
    if (!out || /NONE/i.test(out.slice(0, 12))) return;
    for (const line of out.split('\n').map((s) => s.replace(/^[-*\d.\s]+/, '').trim()).filter(Boolean).slice(0, 3)) {
      await memAddText(line);
    }
  } catch (_) {} finally { memExtractBusy = false; }
}

/* ── 设置面板：记忆管理 ── */
function renderMemPanel() {
  const listEl = $('memList');
  if (!listEl) return;
  window.YZDB.memList().then((rows) => {
    listEl.innerHTML = '';
    if (!rows.length) { listEl.innerHTML = '<div class="set-hint">还没有记忆。</div>'; return; }
    for (const r of rows) {
      const it = document.createElement('div');
      it.className = 'mem-item';
      const t = document.createElement('span');
      t.className = 'mem-txt';
      t.textContent = r.text;
      const x = document.createElement('button');
      x.className = 'mem-x';
      x.type = 'button';
      x.textContent = '×';
      x.title = '删除这条记忆';
      x.onclick = async () => { await window.YZDB.memDel(r.id); renderMemPanel(); };
      it.appendChild(t); it.appendChild(x);
      listEl.appendChild(it);
    }
  }).catch(() => { listEl.innerHTML = '<div class="set-hint">记忆库读取失败。</div>'; });
}
$('btnMemManage')?.addEventListener('click', () => {
  const p = $('memPanel');
  p.classList.toggle('hidden');
  if (!p.classList.contains('hidden')) renderMemPanel();
});
$('btnFetchImgModels')?.addEventListener('click', async () => {
  const b = $('btnFetchImgModels');
  const old2 = b.textContent;
  b.textContent = '…';
  b.disabled = true;
  try {
    const ids = await fetchImgModels();
    b.textContent = ids.length + ' 个';
    // 不依赖 datalist 的隐晦交互：获取后直接弹可点选列表，点击即填入
    const pop = $('imgModelPop');
    if (pop) {
      pop.innerHTML = '';
      for (const id of ids) {
        const o = document.createElement('div');
        o.className = 'im-opt';
        o.textContent = id;
        o.title = id;
        o.onclick = () => { $('inpImageModel').value = id; pop.classList.add('hidden'); };
        pop.appendChild(o);
      }
      pop.classList.toggle('hidden', !ids.length);
    }
    setStatus('已获取 ' + ids.length + ' 个生图模型，点击列表直接选择');
  } catch (e) {
    b.textContent = old2;
    const pop = $('imgModelPop');
    if (pop) pop.classList.add('hidden');
    setStatus('获取生图模型失败：' + (e.message || e));
  } finally {
    setTimeout(() => { b.textContent = old2; b.disabled = false; }, 1800);
  }
});
document.addEventListener('click', (e) => {
  const pop = document.getElementById('imgModelPop');
  if (pop && !pop.classList.contains('hidden') && !pop.contains(e.target) && e.target !== document.getElementById('btnFetchImgModels')) pop.classList.add('hidden');
}, true);
$('btnMemAdd')?.addEventListener('click', async () => {
  const inp = $('inpMem');
  if (await memAddText(inp.value)) { inp.value = ''; renderMemPanel(); }
});
$('inpMem')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') $('btnMemAdd').click(); });
$('btnMemClear')?.addEventListener('click', async () => {
  if (!confirm('清空全部记忆？此操作不可恢复。')) return;
  await window.YZDB.memClear();
  renderMemPanel();
});
