
// Image-gen across gateway response shapes: which shapes drop the card?
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
const HERE = dirname(fileURLToPath(import.meta.url));
const EXT = join(HERE, 'extension');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9708;
const userDir = mkdtempSync(join(tmpdir(), 'yz-img2-'));
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
  const out = await ev(`(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const out = {};
    // bypass network: call toolGenerateImage with mocked fetch per shape
    const run = async (respBody, extraFetch) => {
      const origFetch = window.fetch;
      window.fetch = async (u, o) => {
        if (typeof u === 'string' && u.includes('/images/generations')) {
          return new Response(respBody, { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        if (extraFetch && typeof u === 'string' && extraFetch[u]) {
          return new Response(extraFetch[u].body, { status: 200, headers: extraFetch[u].headers || { 'Content-Type': 'image/png' } });
        }
        return origFetch(u, o);
      };
      try { return await toolGenerateImage({ prompt: 'test', size: '1024x1024' }); }
      catch (e) { return { threw: String(e.message).slice(0, 120) }; }
      finally { window.fetch = origFetch; }
    };
    const A = await run(JSON.stringify({ data: [{ b64_json: btoa('tiny') }] }));
    out.A_b64 = { ok: A.ok, img: A.image && A.image.slice(0, 20), threw: A.threw };
    const B = await run(JSON.stringify({ data: [{ url: 'https://cdn.example.com/x.png' }] }), { 'https://cdn.example.com/x.png': { body: new Uint8Array(1024).fill(1).buffer } });
    out.B_url = { ok: B.ok, img: B.image && B.image.slice(0, 30), threw: B.threw };
    const C = await run(JSON.stringify({ data: [{ url: '/files/x.png' }] }));
    out.C_rel = { ok: C.ok, img: C.image && C.image.slice(0, 30), threw: C.threw };
    // D: big b64 (4MB) — does the tool even succeed?
    const big = 'A'.repeat(4 * 1024 * 1024);
    const D = await run(JSON.stringify({ data: [{ b64_json: big }] }));
    out.D_big = { ok: D.ok, imgLen: D.image && D.image.length, threw: D.threw };
    // E: Seedream-like non-OpenAI shape
    const E = await run(JSON.stringify({ images: [{ url: 'https://cdn.example.com/y.png' }], output: 'https://cdn.example.com/z.png' }));
    out.E_shape = { ok: E.ok, threw: E.threw };
    // F: rendering — a tool message with image dataURL, does tool-img appear?
    messages.length = 0;
    messages.push({ role: 'user', content: 'img' });
    messages.push({ role: 'assistant', content: '', tool_calls: [{ id: 'tc1', type: 'function', function: { name: 'generate_image', arguments: '{"prompt":"x"}' } }] });
    messages.push({ role: 'tool', tool_call_id: 'tc1', content: JSON.stringify({ ok: true, image: 'data:image/png;base64,' + btoa('tiny') }) });
    render();
    await wait(60);
    out.F_render = { toolImgs: document.querySelectorAll('img.tool-img').length, src: (document.querySelector('img.tool-img') || {}).src && String(document.querySelector('img.tool-img').src).slice(0, 30) };
    // G: big 4MB dataURL as tool content — render still ok?
    messages.push({ role: 'assistant', content: '', tool_calls: [{ id: 'tc2', type: 'function', function: { name: 'generate_image', arguments: '{"prompt":"x"}' } }] });
    messages.push({ role: 'tool', tool_call_id: 'tc2', content: JSON.stringify({ ok: true, image: 'data:image/png;base64,' + big }) });
    render();
    await wait(120);
    out.G_bigrender = { toolImgs: document.querySelectorAll('img.tool-img').length, chatLen: document.getElementById('chat').innerHTML.length };
    return out;
  })()`, sessionId);
  console.log(JSON.stringify(out, null, 1));
} finally {
  try { ws.close(); } catch (_) {} try { proc.kill(); } catch (_) {}
  try { rmSync(userDir, { recursive: true, force: true, maxRetries: 5 }); } catch (_) {}
}
