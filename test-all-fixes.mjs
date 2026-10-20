// 总回归：把 10-19/10-20 用户报的每个问题点一次性跑一遍，拿客观基线
// 用法：node test-all-fixes.mjs
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const EXT = join(HERE, 'extension');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9981;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const userDir = mkdtempSync(join(tmpdir(), 'yz-all-'));
const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${userDir}`,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });

async function waitPort() {
  for (let i = 0; i < 80; i++) {
    try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return await r.json(); } catch {}
    await sleep(150);
  }
  throw new Error('no chrome');
}

const R = {};
try {
  const ver = await waitPort();
  const ws = new WebSocket(ver.webSocketDebuggerUrl);
  let seq = 0; const pending = new Map();
  ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); } });
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  const send = (method, params = {}, sessionId) => { const id = ++seq; return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params, sessionId })); }); };
  const ev = async (expression, sessionId) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId);
    if (r.exceptionDetails) return { err: r.exceptionDetails.text + ' ' + (r.exceptionDetails.exception?.description || '') };
    return r.result.value;
  };

  const loaded = await send('Extensions.loadUnpacked', { path: EXT });
  const extId = loaded.id;
  R.extId = extId;

  const spUrl = `chrome-extension://${extId}/sidepanel.html`;
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId: sId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sId);
  await send('Runtime.enable', {}, sId);
  await send('Page.navigate', { url: spUrl }, sId);
  await sleep(3500);

  // ---------- A. 版本号与基本就绪 ----------
  R.A_ready = await ev(`(async () => {
    const v = document.querySelector('#verText')?.textContent
      || document.body.innerText.match(/v0\\.\\d+\\.\\d+/)?.[0] || '(none)';
    return { version: v, hasInput: !!document.querySelector('#inpMsg'),
             hasSend: !!document.querySelector('#btnSend'),
             title: document.title };
  })()`, sId);

  // ---------- B. 思考 base64 检测（0.7.1） ----------
  R.B_base64 = await ev(`(async () => {
    if (typeof looksEncoded !== 'function') return { err: 'looksEncoded 不存在' };
    const b64 = 'eyJhIjoxLCJiIjoyfQ'.repeat(40);
    const normal = '这是一段正常的中文思考内容。'.repeat(20);
    return { b64_detected: looksEncoded(b64), normal_not: !looksEncoded(normal),
             short: !looksEncoded('abc') };
  })()`, sId);

  // ---------- C. 生图卡片下载按钮 ----------
  R.C_imgcard = await ev(`(async () => {
    const src = (typeof sidepanelSrc === 'string') ? sidepanelSrc : null;
    // 直接看 toolNode 里生图分支的按钮文本
    const fnSrc = typeof toolNode === 'function' ? toolNode.toString() : '';
    const hasDownloadBtn = fnSrc.includes('下载图片');
    const hasDataUrl = fnSrc.includes('dataUrl') || fnSrc.includes('data:image');
    const genSrc = typeof toolGenerateImage === 'function' ? toolGenerateImage.toString() : '';
    return { toolNode_has_download_btn: hasDownloadBtn,
             toolNode_has_dataurl: hasDataUrl,
             gen_has_fetch: genSrc.includes('fetch'),
             gen_has_base64: /b64|base64|blob|arrayBuffer/.test(genSrc) };
  })()`, sId);

  // ---------- D. 续写与截断（autoCont / _finish） ----------
  R.D_continue = await ev(`(async () => {
    const s = typeof runAgent === 'function' ? runAgent.toString() : '';
    return { has_finish: s.includes('_finish'),
             has_autoCont: s.includes('autoCont'),
             has_truncated: s.includes('truncated'),
             autoCont_limit: (s.match(/autoCont\\s*<\\s*(\\d+)/) || [])[1] || null,
             has_maxTokens: s.includes('max_tokens') };
  })()`, sId);

  // ---------- E. 单进程执行（不再走 offscreen） ----------
  R.E_singleproc = await ev(`(async () => {
    const s = typeof send === 'function' ? send.toString() : '';
    return { send_calls_runAgent: s.includes('runAgent'),
             send_calls_bg: s.includes('startInBackground'),
             has_offscreen_fn: typeof startInBackground === 'function' };
  })()`, sId);

  // ---------- F. IndexedDB 会话持久化 ----------
  R.F_db = await ev(`(async () => {
    if (!window.YZDB || !window.YZDB.put) return { err: 'YZDB 不可用' };
    await window.YZDB.put({ id: 'test-self', at: Date.now(), messages: [] });
    const got = await window.YZDB.get('test-self');
    await window.YZDB.del('test-self');
    return { ok: !!got, hasDbJs: !!document.querySelector('script[src*="db.js"]') };
  })()`, sId);

  // ---------- G. 引用联动 & 引用文件卡片 ----------
  R.G_quote = await ev(`(async () => {
    return { hasQuoteWrap: !!document.querySelector('#quoteWrap'),
             syncAutoQuote: typeof syncAutoQuote === 'function',
             renderQuoteBar: typeof renderQuoteBar === 'function',
             quoteRefsType: typeof quoteRefs };
  })()`, sId);

  // ---------- H. 技炉搜索窗口 ----------
  R.H_skill = await ev(`(async () => {
    const s = document.body.innerHTML;
    return { hasSkillSearch: /skillSearch|技炉搜索|搜索技炉/.test(s),
             builtinCount: typeof BUILTIN_SKILLS !== 'undefined' ? BUILTIN_SKILLS.length : null,
             extraCount: typeof SKILLS_EXTRA !== 'undefined' ? SKILLS_EXTRA.length : (typeof skillsExtra!=='undefined'?skillsExtra.length:null) };
  })()`, sId);

  // ---------- I. 状态条 / 秒数显示 ----------
  R.I_status = await ev(`(async () => {
    const s = typeof setStatus === 'function' ? setStatus.toString() : '';
    const live = typeof updateLive === 'function' ? updateLive.toString() : '';
    return { setStatus_ok: s.length > 0,
             has_elapsed: /已跑|秒|elapsed|秒数/.test(s + live + document.body.innerHTML),
             updateLive_delta: live.includes('reasoning') || live.includes('think-body') };
  })()`, sId);

  // ---------- J. 滚动条不自动上移 ----------
  R.J_scroll = await ev(`(async () => {
    const s = typeof render === 'function' ? render.toString() : '';
    return { render_has_scroll: /scrollTop|scrollIntoView|scrollTo/.test(s),
             snippet: (s.match(/[^\\n]*(scrollTop|scrollIntoView)[^\\n]*/g) || []).slice(0,3) };
  })()`, sId);

  await send('Page.captureScreenshot', {}, sId).then(async (r) => {
    writeFileSync(join(HERE, 'docs', 'allfix-baseline.png'), Buffer.from(r.data, 'base64'));
  }).catch(()=>{});

} catch (e) {
  R.fatal = String(e && e.stack || e);
} finally {
  try { proc.kill('SIGKILL'); } catch {}
  try { rmSync(userDir, { recursive: true, force: true }); } catch {}
}

console.log(JSON.stringify(R, null, 2));
