// v0.7.12 回归：①思考强度档位（按模型元数据过滤后下发 reasoning_effort）②生图模型可配置
// 真实加载扩展 + 打桩 fetch（不烧真实额度），断言请求体与 UI 行为
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const EXT = join(HERE, 'extension');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9690;
const userDir = mkdtempSync(join(tmpdir(), 'yz-thinkimg-'));
const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${userDir}`,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu',
  '--window-size=420,1100', 'about:blank'], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitPort() {
  for (let i = 0; i < 80; i++) {
    try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return await r.json(); } catch {}
    await sleep(150);
  }
  throw new Error('Chrome 未就绪');
}

const out = {};
let ws;
try {
  const ver = await waitPort();
  ws = new WebSocket(ver.webSocketDebuggerUrl);
  let seq = 0; const pending = new Map();
  ws.addEventListener('message', (m2) => {
    const m = JSON.parse(m2.data);
    if (m.id && pending.has(m.id)) {
      const p = pending.get(m.id); pending.delete(m.id);
      m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result);
    }
  });
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  const send = (method, params = {}, sessionId) => {
    const id = ++seq;
    return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params, sessionId })); });
  };
  const ev = async (expression, sessionId) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId);
    if (r.exceptionDetails) return { err: String((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text || 'exc').slice(0, 600) };
    return r.result && r.result.value;
  };

  const loaded = await send('Extensions.loadUnpacked', { path: EXT });
  const { targetId } = await send('Target.createTarget', { url: `chrome-extension://${loaded.id}/sidepanel.html` });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId);
  for (let i = 0; i < 100; i++) {
    const s = await ev(`document.readyState + '|' + (typeof render)`, sessionId);
    if (s === 'complete|function') break;
    await sleep(120);
  }
  await sleep(500);

  /* ── A. 页面就绪 ── */
  out.A_ready = await ev(`(async () => {
    const mf = await chrome.runtime.getManifest();
    return {
      version: mf.version,
      hasThink: typeof thinkNode === 'function',
      hasGenImg: typeof toolGenerateImage === 'function',
      hasLoadGen: typeof loadGenSettings === 'function',
      selEffort: !!document.getElementById('selEffort'),
      inpImageModel: !!document.getElementById('inpImageModel'),
      dlPresets: !!document.getElementById('imageModelPresets'),
      hint: !!document.getElementById('effortHint')
    };
  })()`, sessionId);

  /* ── B. 打桩 fetch：/models 返回真实元数据，其余记录请求体并返回假响应 ── */
  out.B_stub = await ev(`(async () => {
    const MODELS = [
      { id: 'cn:deepseek-v4-flash', reasoning_supported_efforts: ['low','high','xhigh'] },
      { id: 'cn:hy4-preview-f',     reasoning_supported_efforts: ['high'] },
      { id: 'cn:glm-5.3',           reasoning_supported_efforts: ['low','high','max'] },
      { id: 'cn:step-5-preview',    reasoning_supported_efforts: ['low','medium','high'] },
      { id: 'cn:auto',              reasoning_supported_efforts: null }
    ];
    window.__CHAT_CALLS = [];
    window.__IMG_CALLS = [];
    const ok = (obj, status) => new Response(JSON.stringify(obj), { status: status || 200, headers: { 'Content-Type': 'application/json' } });
    const sse = (text) => new Response(
      'data: ' + JSON.stringify({ choices: [{ delta: { content: text } }] }) + '\\n\\n' +
      'data: ' + JSON.stringify({ choices: [{ delta: {}, finish_reason: 'stop' }] }) + '\\n\\n' +
      'data: [DONE]\\n\\n',
      { status: 200, headers: { 'Content-Type': 'text/event-stream' } }
    );
    window.fetch = async (url, opt) => {
      const u = String(url || '');
      if (u.indexOf('/models') >= 0) return ok({ data: MODELS });
      if (u.indexOf('/chat/completions') >= 0) {
        window.__CHAT_CALLS.push(JSON.parse((opt && opt.body) || '{}'));
        return sse('ok');
      }
      if (u.indexOf('/images/generations') >= 0) {
        const b = JSON.parse((opt && opt.body) || '{}');
        window.__IMG_CALLS.push(b);
        // 网关实测：只有 hunyuan-image-v3.0 能出图，其余 400
        if (b.model === 'hunyuan-image-v3.0') return ok({ data: [{ url: 'https://example.com/a.png' }] });
        return new Response('Image model [' + b.model + '] is not supported. Create image failed', { status: 400 });
      }
      // 图片转 dataURL 的二次抓取
      return new Response('PNG-BYTES', { status: 200 });
    };
    return { stubbed: true, models: MODELS.length };
  })()`, sessionId);

  /* 工具：设置指定模型 + 档位，跑一次 callLLM，返回最后一次请求体里的 reasoning_effort */
  const probe = `(async (model, effort) => {
    await chrome.storage.local.set({
      providers: [{ id: 'p1', name: 'T', baseUrl: 'http://127.0.0.1:7863/v1', apiKey: 'sk-test', protocol: 'openai', model: model }],
      activeProvider: 'p1',
      reasoningEffort: effort
    });
    modelIds = []; modelMeta = {};
    await fetchModels();
    messages = [{ role: 'user', content: 'hi' }];
    await callLLM(() => {});
    const last = window.__CHAT_CALLS[window.__CHAT_CALLS.length - 1] || {};
    return {
      sent: last.reasoning_effort === undefined ? null : last.reasoning_effort,
      hasKey: Object.prototype.hasOwnProperty.call(last, 'reasoning_effort'),
      model: last.model,
      maxTokens: last.max_tokens,
      metaEfforts: (modelMeta[model] || {}).efforts || []
    };
  })`;

  /* ── D. 模型支持该档位 → 正常下发 ── */
  out.D_effortSent = await ev(`${probe}('cn:deepseek-v4-flash', 'xhigh')`, sessionId);
  /* ── E. 模型只支持 high，却选了 xhigh → 必须跳过（否则网关静默降级、思考更短）── */
  out.E_effortSkipped = await ev(`${probe}('cn:hy4-preview-f', 'xhigh')`, sessionId);
  /* ── F. 模型支持 high，选 high → 下发 ── */
  out.F_effortHigh = await ev(`${probe}('cn:hy4-preview-f', 'high')`, sessionId);
  /* ── G. 选「跟随模型默认」→ 不下发该字段 ── */
  out.G_effortEmpty = await ev(`${probe}('cn:deepseek-v4-flash', '')`, sessionId);
  /* ── G2. 模型无任何档位信息 → 跳过 ── */
  out.G2_noEffortMeta = await ev(`${probe}('cn:auto', 'high')`, sessionId);

  /* ── H/I/J. 生图模型 ── */
  const imgProbe = `(async (imageModel) => {
    await chrome.storage.local.set({
      providers: [{ id: 'p1', name: 'T', baseUrl: 'http://127.0.0.1:7863/v1', apiKey: 'sk-test', protocol: 'openai', model: 'cn:deepseek-v4-flash' }],
      activeProvider: 'p1',
      imageModel: imageModel
    });
    try {
      const r = await toolGenerateImage({ prompt: 'a cat' });
      return { ok: true, sentModels: window.__IMG_CALLS.map((c) => c.model), result: !!r };
    } catch (e) {
      return { ok: false, sentModels: window.__IMG_CALLS.map((c) => c.model), err: String(e.message || e) };
    }
  })`;
  out.H_imgCustom = await ev(`${imgProbe}('my-custom-image-model')`, sessionId);
  out.I_imgDefault = await ev(`${imgProbe}('')`, sessionId);

  /* ── C. 设置面板 UI：档位下拉按当前模型真实档位填充 ── */
  out.C_effortUI = await ev(`(async () => {
    await chrome.storage.local.set({
      providers: [{ id: 'p1', name: 'T', baseUrl: 'http://127.0.0.1:7863/v1', apiKey: 'sk-test', protocol: 'openai', model: 'cn:deepseek-v4-flash' }],
      activeProvider: 'p1',
      reasoningEffort: 'xhigh',
      imageModel: 'hunyuan-image-v3.0'
    });
    modelIds = []; modelMeta = {};
    await loadSettings();
    const sel = document.getElementById('selEffort');
    const hint = document.getElementById('effortHint');
    const dl = document.getElementById('imageModelPresets');
    const ds3 = [...sel.options].map((o) => o.value);
    const labels = [...sel.options].map((o) => o.textContent);
    // 以下三项必须在这时就取，后面会切到 hy4 模型
    const dsValue = sel.value;
    const dsHint = hint.textContent;
    // 换到只支持 high 的模型，档位应随之变化
    await loadGenSettings('cn:hy4-preview-f');
    const hy4 = [...sel.options].map((o) => o.value);
    return {
      deepseekOptions: ds3,
      deepseekLabels: labels,
      selValue: dsValue,
      hintText: dsHint,
      presets: [...dl.options].map((o) => o.value),
      imgInput: document.getElementById('inpImageModel').value,
      hy4Options: hy4,
      hy4Value: sel.value   // xhigh 不被 hy4 支持，应回落为空
    };
  })()`, sessionId);

  /* ── L. 折叠态摘要：字数与行数都要够看 ── */
  out.L_brief = await ev(`(async () => {
    const long = '首先我需要把这个应用题的条件整理清楚。甲管单独注满水池需要6小时，那么甲的工作效率是1/6。'
      + '乙管单独注满需要4小时，效率是1/4。丙管排空需要12小时，效率是-1/12。'
      + '三管齐开时的净效率等于1/6加1/4再减去1/12，通分后得到4/12。'
      + '所以注满水池需要的时间是1除以4/12，等于3小时。最后我要检查一下有没有漏掉什么情况，比如水池是否初始为空。';
    const node = thinkNode(long, true);
    document.getElementById('chat').appendChild(node);
    const brief = node.querySelector('.t-brief');
    // 摘要由 tickThink 每 500ms 填一次，这里走真实路径（不等 500ms 就手动触发一帧）
    tickThink(node, () => long, Date.now() - 4200);
    await new Promise((r) => setTimeout(r, 60));
    const cs = getComputedStyle(brief);
    const short = thinkSummary('好的。');
    // 摘要高度：4 行内应明显铺开，不再是单行
    const lineH = parseFloat(cs.lineHeight) || 18;
    return {
      len: brief.textContent.length,
      overOld: brief.textContent.length > 34,
      height: Math.round(brief.getBoundingClientRect().height),
      lines: Math.round(brief.getBoundingClientRect().height / lineH),
      fullLen: thinkSummary(long).length,
      clamp: cs.webkitLineClamp || cs.getPropertyValue('-webkit-line-clamp'),
      whiteSpace: cs.whiteSpace,
      collapsed: node.classList.contains('collapsed'),
      bodyHidden: getComputedStyle(node.querySelector('.think-body')).display === 'none',
      shortKeep: short,
      // 秒数仍在且右对齐
      elapse: !!node.querySelector('[data-elapse]')
    };
  })()`, sessionId);

  /* ── K. 版本 ── */
  out.K_other = await ev(`(async () => ({
    defaultModel: DEFAULT_MODEL,
    defaultImageModel: DEFAULT_IMAGE_MODEL,
    presets: IMAGE_MODEL_PRESETS.length
  }))()`, sessionId);

} catch (e) {
  out.FATAL = String(e && (e.stack || e.message) || e);
} finally {
  try { ws && ws.close(); } catch {}
  try { proc.kill('SIGKILL'); } catch {}
  try { rmSync(userDir, { recursive: true, force: true }); } catch {}
  console.log(JSON.stringify(out, null, 2));
}

/* ── 断言 ── */
const A = [];
const t = (name, cond) => A.push({ name, pass: !!cond });

t('A1 思考渲染函数在', out.A_ready && out.A_ready.hasThink);
t('A2 生图函数在', out.A_ready && out.A_ready.hasGenImg);
t('A3 设置面板有档位下拉', out.A_ready && out.A_ready.selEffort);
t('A4 设置面板有生图模型输入', out.A_ready && out.A_ready.inpImageModel);
t('A5 有模型预设 datalist', out.A_ready && out.A_ready.dlPresets);
t('B1 fetch 桩装好', out.B_stub && out.B_stub.stubbed);

t('D1 deepseek 支持 xhigh → 下发', out.D_effortSent && out.D_effortSent.sent === 'xhigh');
t('D2 字段确实存在', out.D_effortSent && out.D_effortSent.hasKey);
t('D3 max_tokens 仍为 16000（没被改坏）', out.D_effortSent && out.D_effortSent.maxTokens === 16000);
t('D4 元数据读到了三档', out.D_effortSent && out.D_effortSent.metaEfforts.join(',') === 'low,high,xhigh');

t('E1 hy4 只支持 high，选 xhigh 时跳过（关键：防静默降级）', out.E_effortSkipped && out.E_effortSkipped.hasKey === false);
t('E2 未发送任何档位值', out.E_effortSkipped && out.E_effortSkipped.sent === null);
t('E3 模型本身照常下发', out.E_effortSkipped && out.E_effortSkipped.model === 'cn:hy4-preview-f');

t('F1 hy4 选 high → 下发', out.F_effortHigh && out.F_effortHigh.sent === 'high');
t('G1 跟随默认 → 不下发档位', out.G_effortEmpty && out.G_effortEmpty.hasKey === false);
t('G2 无档位元数据的模型 → 跳过', out.G2_noEffortMeta && out.G2_noEffortMeta.hasKey === false);

t('H1 自定义生图模型被发出', out.H_imgCustom && out.H_imgCustom.sentModels.indexOf('my-custom-image-model') >= 0);
t('H2 不支持的模型会报错', out.H_imgCustom && out.H_imgCustom.ok === false);
t('H3 报错含模型名', out.H_imgCustom && /my-custom-image-model/.test(out.H_imgCustom.err || ''));
t('H4 报错含 400 状态码', out.H_imgCustom && /400/.test(out.H_imgCustom.err || ''));
t('H5 报错提示可换模型', out.H_imgCustom && /换一个生图模型/.test(out.H_imgCustom.err || ''));
t('I1 空值回落默认 hunyuan-image-v3.0', out.I_imgDefault && out.I_imgDefault.sentModels.indexOf('hunyuan-image-v3.0') >= 0);
t('I2 默认模型能成功出图', out.I_imgDefault && out.I_imgDefault.ok === true);

t('C1 下拉含跟随默认项', out.C_effortUI && out.C_effortUI.deepseekOptions[0] === '');
t('C2 deepseek 有三档可选', out.C_effortUI && out.C_effortUI.deepseekOptions.join(',') === ',low,high,xhigh');
t('C3 已存的 xhigh 被正确回显', out.C_effortUI && out.C_effortUI.selValue === 'xhigh');
t('C4 档位有中文标签', out.C_effortUI && /超高/.test(out.C_effortUI.deepseekLabels.join('')));
t('C5 提示列出支持档位', out.C_effortUI && /low \/ high \/ xhigh/.test(out.C_effortUI.hintText || ''));
t('C6 预设列表有 7 项', out.C_effortUI && out.C_effortUI.presets.length === 7);
t('C7 生图输入框回填默认值', out.C_effortUI && out.C_effortUI.imgInput === 'hunyuan-image-v3.0');
t('C8 换模型后档位仅剩 high', out.C_effortUI && out.C_effortUI.hy4Options.join(',') === ',high');
t('C9 换模型后不支持的档位被清空（不显示假选项）', out.C_effortUI && out.C_effortUI.hy4Value === '');

t('K1 默认模型仍为 hy4（实测思考最长）', out.K_other && out.K_other.defaultModel === 'cn:hy4-preview-f');
t('K2 默认生图模型为 hunyuan-image-v3.0', out.K_other && out.K_other.defaultImageModel === 'hunyuan-image-v3.0');

t('L1 折叠摘要超过原 34 字上限', out.L_brief && out.L_brief.overOld);
t('L2 摘要放长到 100 字以上', out.L_brief && out.L_brief.len > 100);
t('L2b 摘要铺开多行（≥2 行）', out.L_brief && out.L_brief.lines >= 2);
t('L2c 摘要不超 4 行上限', out.L_brief && out.L_brief.lines <= 4);
t('L3 摘要改为多行（white-space 非 nowrap）', out.L_brief && out.L_brief.whiteSpace !== 'nowrap');
t('L4 CSS 限 4 行', out.L_brief && String(out.L_brief.clamp).trim() === '4');
t('L5 折叠态正文仍隐藏', out.L_brief && out.L_brief.bodyHidden);
t('L6 短思考不画蛇添足', out.L_brief && out.L_brief.shortKeep === '好的。');
t('L7 秒数元素仍在', out.L_brief && out.L_brief.elapse);

const pass = A.filter((x) => x.pass).length;
console.log('\n' + A.map((x) => (x.pass ? '  ✅' : '  ❌') + ' ' + x.name).join('\n'));
console.log(`\n结果：${pass}/${A.length} 通过` + (out.FATAL ? `\nFATAL: ${out.FATAL}` : ''));
process.exit(pass === A.length && !out.FATAL ? 0 : 1);
