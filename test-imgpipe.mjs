
// Image pipeline regression: 5 gateway response shapes -> card + model-side strip
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
const HERE = dirname(fileURLToPath(import.meta.url));
const EXT = join(HERE, 'extension');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9710;
const userDir = mkdtempSync(join(tmpdir(), 'yz-img2-'));
const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${userDir}`,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--window-size=420,900', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitPort() { for (let i = 0; i < 80; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return await r.json(); } catch {} await sleep(150); } throw new Error('no'); }
const PNG1 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PzWvWQAAAABJRU5ErkJggg==';
const JPG1 = '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AmgA//9k=';
try {
  const ver = await waitPort();
  const ws = new WebSocket(ver.webSocketDebuggerUrl);
  let seq = 0; const pending = new Map();
  ws.addEventListener('message', (m2) => { const m = JSON.parse(m2.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); } });
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  const send = (method, params = {}, sessionId) => { const id = ++seq; return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params, sessionId })); }); };
  const ev = async (expression, sessionId) => { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId); if (r.exceptionDetails) return { err: String((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || '').slice(0, 300) }; return r.result && r.result.value; };
  const loaded = await send('Extensions.loadUnpacked', { path: EXT });
  const { targetId } = await send('Target.createTarget', { url: `chrome-extension://${loaded.id}/sidepanel.html` });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId);
  for (let i = 0; i < 100; i++) { const s = await ev(`document.readyState + '|' + (typeof render)`, sessionId); if (s === 'complete|function') break; await sleep(120); }
  await sleep(400);

  // stub fetch: images/generations returns shape per prompt tag; file urls served
  await ev(`(async () => {
    const PNG1 = '${PNG1}'; const JPG1 = '${JPG1}';
    window.__realFetch = window.fetch;
    window.fetch = async (u, opt) => {
      const url = String(u);
      if (url.includes('/images/generations')) {
        const body = JSON.parse((opt && opt.body) || '{}');
        const p = body.prompt || '';
        let j;
        if (p.includes('SHAPE_B64PNG')) j = { data: [{ b64_json: PNG1 }] };
        else if (p.includes('SHAPE_B64JPG')) j = { data: [{ b64_json: JPG1 }] };
        else if (p.includes('SHAPE_URL')) j = { data: [{ url: 'https://cdn.test/img.png' }] };
        else if (p.includes('SHAPE_REL')) j = { data: [{ url: '/v1/files/rel.png' }] };
        else if (p.includes('SHAPE_ERR')) return new Response('{"error":{"message":"model not found"}}', { status: 400 });
        else if (p.includes('SHAPE_SIZE')) {
          if (String(body.size) === '1024x1024') return new Response(JSON.stringify({ error: { message: 'Doubao-Seedream-5.0 要求图片尺寸至少 3,686,400 像素' } }), { status: 400 });
          return new Response(JSON.stringify({ data: [{ b64_json: PNG1 }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        else return new Response('not json', { status: 500 });
        return new Response(JSON.stringify(j), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (url === 'https://cdn.test/img.png' || url.endsWith('/v1/files/rel.png')) {
        const bin = Uint8Array.from(atob(PNG1), (c) => c.charCodeAt(0));
        return new Response(bin.buffer, { status: 200, headers: { 'Content-Type': 'image/png' } });
      }
      return window.__realFetch(u, opt);
    };
    // config stub
    await chrome.storage.local.set({ providers: [{ id: 'p1', name: 't', baseUrl: 'https://gw.test/v1', apiKey: 'k', model: 'm' }], activeProvider: 'p1', imageModel: 'test-img' });
    return true;
  })()`, sessionId);
  await sleep(150);

  const out = await ev(`(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const run = async (tag) => {
      const r = await toolGenerateImage({ prompt: tag + ' a cat', size: '1024x1024', n: 1 });
      return r;
    };
    const res = {};
    const r1 = await run('SHAPE_B64PNG'); res.b64png = { ok: r1.ok, isData: r1.image.startsWith('data:image/png') };
    const r2 = await run('SHAPE_B64JPG'); res.b64jpg = { ok: r2.ok, mime: r2.image.slice(5, 15) };
    const r3 = await run('SHAPE_URL');   res.url = { ok: r3.ok, isData: r3.image.startsWith('data:image/png') };
    const r4 = await run('SHAPE_REL');   res.rel = { ok: r4.ok, isData: r4.image.startsWith('data:image/png') };
    let errTxt = '';
    try { await run('SHAPE_ERR'); } catch (e) { errTxt = String(e.message || e); }
    res.err = { mentions400: errTxt.includes('400'), mentionsModelHint: errTxt.includes('换一个生图模型') };
    const r5 = await run('SHAPE_SIZE'); res.sizeretry = { ok: r5.ok, usedSize: r5.size, isData: r5.image.startsWith('data:image/png') };
    // sizeRetryFromError 单元：像素数解析与 WxH 直取
    res.sizeretryParse = {
      px: sizeRetryFromError('要求图片尺寸至少 3,686,400 像素', '1024x1024') === '2560x1440',
      wxh: sizeRetryFromError('must be at least 2560x1440', '1024x1024') === '2560x1440',
      noErr: sizeRetryFromError('model not found', '1024x1024') === null,
      smallWxh: sizeRetryFromError('1024x1024', '1024x1024') === null
    };
    // wire strip check: big base64 tool content -> wireMessages strips, render keeps
    messages.length = 0;
    messages.push({ role: 'user', content: 'draw' });
    messages.push({ role: 'assistant', content: '', tool_calls: [{ id: 'c1', type: 'function', function: { name: 'generate_image', arguments: '{"prompt":"x"}' } }] });
    const big = 'data:image/png;base64,' + 'A'.repeat(20000);
    messages.push({ role: 'tool', tool_call_id: 'c1', content: JSON.stringify({ ok: true, image: big, note: 'n' }) });
    const wire = wireMessages();
    const wireTool = wire.find((m) => m.role === 'tool');
    res.strip = {
      wireShort: wireTool.content.length < 1000,
      wireHasNote: wireTool.content.includes('已生成并显示在对话中'),
      renderStillFull: (render(), [...document.querySelectorAll('img.tool-img')].length === 1 && document.querySelector('img.tool-img').src.length > 15000)
    };
    res.pass = res.b64png.ok && res.b64png.isData && res.b64jpg.mime.startsWith('image/jpe') && res.url.ok && res.rel.ok && res.err.mentions400 && res.err.mentionsModelHint && res.strip.wireShort && res.strip.wireHasNote && res.strip.renderStillFull && res.sizeretry.ok && res.sizeretry.usedSize === '2560x1440' && res.sizeretry.isData && res.sizeretryParse.px && res.sizeretryParse.wxh && res.sizeretryParse.noErr && res.sizeretryParse.smallWxh;
    return res;
  })()`, sessionId);
  console.log(JSON.stringify(out, null, 1));
} finally {
  try { ws.close(); } catch (_) {} try { proc.kill(); } catch (_) {}
  try { rmSync(userDir, { recursive: true, force: true, maxRetries: 5 }); } catch (_) {}
}
