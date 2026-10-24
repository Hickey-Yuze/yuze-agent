
// agentLoop E2E: claim-detection (text-only reply) + big b64_json image rendering
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
const HERE = dirname(fileURLToPath(import.meta.url));
const EXT = join(HERE, 'extension');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9712;
const userDir = mkdtempSync(join(tmpdir(), 'yz-agent2-'));
const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${userDir}`,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--window-size=420,900', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitPort() { for (let i = 0; i < 80; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return await r.json(); } catch {} await sleep(150); } throw new Error('no'); }
try {
  const ver = await waitPort();
  const ws = new WebSocket(ver.webSocketDebuggerUrl);
  let seq = 0; const pending = new Map();
  ws.addEventListener('message', (m2) => { const m = JSON.parse(m2.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); } });
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  const send = (method, params = {}, sessionId) => { const id = ++seq; return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params, sessionId })); }); };
  const ev = async (expression, sessionId) => { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId); if (r.exceptionDetails) return { err: String((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || '').slice(0, 400) }; return r.result && r.result.value; };
  const loaded = await send('Extensions.loadUnpacked', { path: EXT });
  const { targetId } = await send('Target.createTarget', { url: `chrome-extension://${loaded.id}/sidepanel.html` });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId);
  for (let i = 0; i < 100; i++) { const s = await ev(`document.readyState + '|' + (typeof render)`, sessionId); if (s === 'complete|function') break; await sleep(120); }
  await sleep(400);

  const setup = await ev(`(async () => {
    window.__errs = []; window.__unhandled = [];
    window.addEventListener('error', (e) => window.__errs.push(String(e.message).slice(0, 200)));
    window.addEventListener('unhandledrejection', (e) => window.__unhandled.push(String(e.reason && e.reason.message || e.reason).slice(0, 200)));
    window.__SSE_TOOL = "data: {\"choices\": [{\"delta\": {\"reasoning_content\": \"thinking...\"}}]}\n\ndata: {\"choices\": [{\"delta\": {\"tool_calls\": [{\"index\": 0, \"id\": \"call_1\", \"type\": \"function\", \"function\": {\"name\": \"generate_image\", \"arguments\": \"{\\\"prompt\\\": \\\"office\\\", \\\"size\\\": \\\"1024x1024\\\"}\"}}]}}]}\n\ndata: {\"choices\": [{\"delta\": {}, \"finish_reason\": \"tool_calls\"}]}\n\ndata: [DONE]\n\n";
    window.__SSE_TEXT = "data: {\"choices\": [{\"delta\": {\"reasoning_content\": \"The image was generated successfully.\"}}]}\n\ndata: {\"choices\": [{\"delta\": {\"content\": \"DONE. \\u5df2\\u91cd\\u65b0\\u751f\\u6210\\u5b8c\\u6210\\uff0c\\u65b0\\u7684\\u56fe\\u7247\\u5df2\\u7ecf\\u663e\\u793a\\u5728\\u5bf9\\u8bdd\\u4e2d\\u4e86\\u3002\"}}]}\n\ndata: {\"choices\": [{\"delta\": {}, \"finish_reason\": \"stop\"}]}\n\ndata: [DONE]\n\n";
    window.__realFetch = window.fetch;
    window.fetch = async (u, opt) => {
      const url = String(u || '');
      if (url.indexOf('/chat/completions') >= 0) {
        return new Response(window.__SCEN === 'text' ? window.__SSE_TEXT : window.__SSE_TOOL, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
      }
      if (url.indexOf('/images/generations') >= 0) {
        if (!window.__BIGPNG) {
          const c = document.createElement('canvas'); c.width = 3000; c.height = 3000;
          const cx = c.getContext('2d');
          const id = cx.createImageData(3000, 3000);
          for (let i = 0; i < id.data.length; i += 4) { id.data[i] = (Math.random() * 256) | 0; id.data[i + 1] = (Math.random() * 256) | 0; id.data[i + 2] = (Math.random() * 256) | 0; id.data[i + 3] = 255; }
          cx.putImageData(id, 0, 0);
          window.__BIGPNG = c.toDataURL('image/png');
        }
        return new Response(JSON.stringify({ data: [{ b64_json: window.__BIGPNG.split(',')[1] }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return window.__realFetch(u, opt);
    };
    await chrome.storage.local.set({ providers: [{ id: 'p1', name: 'T', baseUrl: 'http://127.0.0.1:7863/v1', apiKey: 'sk', model: 'test-model' }], activeProvider: 'p1', imageModel: 'Doubao-Seedream-5.0' });
    return 'setup-ok';
  })()`.replace('"data: {\"choices\": [{\"delta\": {\"reasoning_content\": \"thinking...\"}}]}\n\ndata: {\"choices\": [{\"delta\": {\"tool_calls\": [{\"index\": 0, \"id\": \"call_1\", \"type\": \"function\", \"function\": {\"name\": \"generate_image\", \"arguments\": \"{\\\"prompt\\\": \\\"office\\\", \\\"size\\\": \\\"1024x1024\\\"}\"}}]}}]}\n\ndata: {\"choices\": [{\"delta\": {}, \"finish_reason\": \"tool_calls\"}]}\n\ndata: [DONE]\n\n"', JSON.stringify("data: {\"choices\": [{\"delta\": {\"reasoning_content\": \"thinking...\"}}]}\n\ndata: {\"choices\": [{\"delta\": {\"tool_calls\": [{\"index\": 0, \"id\": \"call_1\", \"type\": \"function\", \"function\": {\"name\": \"generate_image\", \"arguments\": \"{\\\"prompt\\\": \\\"office\\\", \\\"size\\\": \\\"1024x1024\\\"}\"}}]}}]}\n\ndata: {\"choices\": [{\"delta\": {}, \"finish_reason\": \"tool_calls\"}]}\n\ndata: [DONE]\n\n")).replace('"data: {\"choices\": [{\"delta\": {\"reasoning_content\": \"The image was generated successfully.\"}}]}\n\ndata: {\"choices\": [{\"delta\": {\"content\": \"DONE. \\u5df2\\u91cd\\u65b0\\u751f\\u6210\\u5b8c\\u6210\\uff0c\\u65b0\\u7684\\u56fe\\u7247\\u5df2\\u7ecf\\u663e\\u793a\\u5728\\u5bf9\\u8bdd\\u4e2d\\u4e86\\u3002\"}}]}\n\ndata: {\"choices\": [{\"delta\": {}, \"finish_reason\": \"stop\"}]}\n\ndata: [DONE]\n\n"', JSON.stringify("data: {\"choices\": [{\"delta\": {\"reasoning_content\": \"The image was generated successfully.\"}}]}\n\ndata: {\"choices\": [{\"delta\": {\"content\": \"DONE. \\u5df2\\u91cd\\u65b0\\u751f\\u6210\\u5b8c\\u6210\\uff0c\\u65b0\\u7684\\u56fe\\u7247\\u5df2\\u7ecf\\u663e\\u793a\\u5728\\u5bf9\\u8bdd\\u4e2d\\u4e86\\u3002\"}}]}\n\ndata: {\"choices\": [{\"delta\": {}, \"finish_reason\": \"stop\"}]}\n\ndata: [DONE]\n\n")), sessionId);
  console.log('SETUP:', JSON.stringify(setup));
  await sleep(150);

  const claimOut = await ev(`(async () => {
    window.__SCEN = 'text';
    messages.length = 0;
    messages.push({ role: 'user', content: 'draw office' });
    mode = 'task';
    await agentLoop();
    const fixNudges = messages.filter((m) => m.role === 'user' && String(m.content).indexOf('没有实际调用任何工具') >= 0).length;
    const bot = [...messages].reverse().find((m) => m.role === 'assistant');
    return { fixNudges, claimNoTool: !!(bot && bot._claimNoTool), toolCount: messages.filter((m) => m.role === 'tool').length };
  })()`, sessionId);
  console.log('CLAIM:', JSON.stringify(claimOut));

  const out = await ev(`(async () => {
    window.__SCEN = 'img';
    messages.length = 0;
    messages.push({ role: 'user', content: 'draw office' });
    await agentLoop();
    const imgs = [...document.querySelectorAll('img.tool-img')];
    await Promise.all(imgs.map((i) => i.decode().catch(() => null)));
    await new Promise((r) => setTimeout(r, 400));
    return {
      toolImgs: imgs.length,
      bigLen: (window.__BIGPNG || '').length,
      imgBlob: imgs.map((i) => i.src.startsWith('blob:')),
      imgDecoded: imgs.map((i) => i.naturalWidth > 0),
      err: window.__errs.slice(0, 2), unhandled: window.__unhandled.slice(0, 2)
    };
  })()`, sessionId);
  console.log('IMG:', JSON.stringify(out));
  const pass = !!(setup === 'setup-ok' && claimOut && claimOut.fixNudges >= 1 && out && out.toolImgs >= 1 && out.imgBlob.every(Boolean) && out.imgDecoded.every(Boolean));
  console.log('PASS:', pass);
} finally {
  try { ws.close(); } catch (_) {} try { proc.kill(); } catch (_) {}
  try { rmSync(userDir, { recursive: true, force: true, maxRetries: 5 }); } catch (_) {}
}
