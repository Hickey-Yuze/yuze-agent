
// Full-runAgent reproduction: SSE tool_calls -> big b64_json image -> DOM tool-img?
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
const HERE = dirname(fileURLToPath(import.meta.url));
const EXT = join(HERE, 'extension');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9711;
const userDir = mkdtempSync(join(tmpdir(), 'yz-agent-'));
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

  await ev(`(async () => {
    window.__errs = [];
    window.addEventListener('error', (e) => window.__errs.push(String(e.message).slice(0, 200)));
    window.__unhandled = [];
    window.addEventListener('unhandledrejection', (e) => window.__unhandled.push(String(e.reason && e.reason.message || e.reason).slice(0, 200)));
    const ok = (j) => new Response(JSON.stringify(j), { status: 200, headers: { 'Content-Type': 'application/json' } });
    const sseTool = () => new Response(
      'data: ' + JSON.stringify({ choices: [{ delta: { reasoning_content: 'thinking...' } }] }) + '\\n\\n' +
      'data: ' + JSON.stringify({ choices: [{ delta: { tool_calls: [{ index: 0, id: 'call_1', type: 'function', function: { name: 'generate_image', arguments: '{"prompt":"office","size":"1024x1024"}' } }] } }] }) + '\\n\\n' +
      'data: ' + JSON.stringify({ choices: [{ delta: {}, finish_reason: 'tool_calls' }] }) + '\\n\\n' +
      'data: [DONE]\\n\\n',
      { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
    window.__realFetch = window.fetch;
    window.fetch = async (u, opt) => {
      const url = String(u || '');
      if (url.indexOf('/chat/completions') >= 0) return sseTool();
      if (url.indexOf('/images/generations') >= 0) {
        const b = JSON.parse((opt && opt.body) || '{}');
        window.__IMG_BODY = b;
                if (!window.__BIGPNG) {
          const c = document.createElement('canvas'); c.width = 3000; c.height = 3000;
          const cx = c.getContext('2d');
          const id = cx.createImageData(3000, 3000);
          for (let i = 0; i < id.data.length; i += 4) { id.data[i] = (Math.random() * 256) | 0; id.data[i + 1] = (Math.random() * 256) | 0; id.data[i + 2] = (Math.random() * 256) | 0; id.data[i + 3] = 255; }
          cx.putImageData(id, 0, 0);
          window.__BIGPNG = c.toDataURL('image/png');
        }
        return ok({ data: [{ b64_json: window.__BIGPNG.split(',')[1] }] });
      }
      return window.__realFetch(u, opt);
    };
    await chrome.storage.local.set({ providers: [{ id: 'p1', name: 'T', baseUrl: 'http://127.0.0.1:7863/v1', apiKey: 'sk', model: 'test-model' }], activeProvider: 'p1', imageModel: 'Doubao-Seedream-5.0' });
    return true;
  })()`, sessionId);
  await sleep(150);

  const out = await ev(`(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    messages.length = 0;
    messages.push({ role: 'user', content: 'draw office' });
    mode = 'task';
    await agentLoop();
    await wait(300);
    const warns = [...document.querySelectorAll('details.tool .think-warn')].map((n) => n.textContent);
    const toolNodes = [...document.querySelectorAll('details.tool')];
    const imgs = [...document.querySelectorAll('img.tool-img')];
    const toolMsg = messages.find((m) => m.role === 'tool');
    return {
      err: window.__errs.slice(0, 3), unhandled: window.__unhandled.slice(0, 3),
      toolNodes: toolNodes.length,
      toolState: toolNodes.map((n) => n.dataset.state),
      toolOpen: toolNodes.map((n) => n.open),
      toolImgs: imgs.length,
      imgSrcLen: imgs.map((i) => i.src.length),
      imgBlob: imgs.map((i) => i.src.startsWith('blob:')),
      imgDecoded: imgs.map((i) => i.naturalWidth > 0),
      warns,
      toolMsgLen: toolMsg ? toolMsg.content.length : -1,
      msgLens: messages.map((m) => (typeof m.content === 'string' ? m.content.length : 0)),
      assistantToolCalls: messages.filter((m) => m.role === 'assistant').map((m) => (m.tool_calls || []).map((t) => t.id))
    };
  })()`, sessionId);
  console.log(JSON.stringify(out, null, 1));
} finally {
  try { ws.close(); } catch (_) {} try { proc.kill(); } catch (_) {}
  try { rmSync(userDir, { recursive: true, force: true, maxRetries: 5 }); } catch (_) {}
}
