
// Live-path regression: updateLive with separator-only content must not render <hr>
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
const HERE = dirname(fileURLToPath(import.meta.url));
const EXT = join(HERE, 'extension');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9702;
const userDir = mkdtempSync(join(tmpdir(), 'yz-live2-'));
const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${userDir}`,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--window-size=420,1100', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitPort() { for (let i = 0; i < 80; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return await r.json(); } catch {} await sleep(150); } throw new Error('no'); }
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
  await sleep(300);

  // 打桩 fetch：截获 /images/generations，记录 URL+Auth，返回一张 1px png
  const res = await ev(`(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const calls = [];
    const realFetch = window.fetch;
    window.fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : input.url;
      if (url.includes('/images/generations')) {
        calls.push({ url, auth: (init.headers && init.headers.Authorization) || '' });
        return new Response(JSON.stringify({ data: [{ b64_json: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==' }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (url.startsWith('data:')) return realFetch(input, init);
      return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
    };
    const out = { calls };
    out.ui = { base: !!document.querySelector('#inpImgBase'), key: !!document.querySelector('#inpImgKey') };
    // 场景1：默认网关（storage 空）→ 打聊天网关 + 聊天 Key
    await chrome.storage.local.remove(['imgBase', 'imgKey']);
    await chrome.storage.local.set({ providers: [{ id: 'p1', name: 't', apiKey: 'CHATKEY', baseUrl: 'https://chat.example.com/v1', model: 'm1' }], activeProvider: 'p1' });
    const r1 = await toolGenerateImage({ prompt: 'a cat', size: '1024x1024', n: 1 });
    out.s1 = { url: calls[0].url, auth: calls[0].auth, ok: !!(r1 && r1.image) };
    // 场景2：自定义网关+Key → 打自定义 URL + 自定义 Key
    await chrome.storage.local.set({ imgBase: 'https://img.example.com/v1/', imgKey: 'IMGKEY' });
    const r2 = await toolGenerateImage({ prompt: 'a dog', size: '1024x1024', n: 1 });
    out.s2 = { url: calls[1].url, auth: calls[1].auth, ok: !!(r2 && r2.image) };
    // 场景3：自定义网关但 Key 留空 → 回落聊天 Key
    await chrome.storage.local.set({ imgBase: 'https://img.example.com/v1', imgKey: '' });
    await toolGenerateImage({ prompt: 'a bird', size: '1024x1024', n: 1 });
    out.s3 = { url: calls[2].url, auth: calls[2].auth };
    // 场景4：保存后 loadSettings 回填
    await loadSettings();
    out.ui.fill = document.querySelector('#inpImgBase').value === 'https://img.example.com/v1' && document.querySelector('#inpImgKey').value === '';
    out.pass = out.ui.base && out.ui.key && out.ui.fill && out.s1.url === 'https://chat.example.com/v1/images/generations'
      && out.s1.auth === 'Bearer CHATKEY'
      && out.s2.url === 'https://img.example.com/v1/images/generations'
      && out.s2.auth === 'Bearer IMGKEY'
      && out.s2.ok
      && out.s3.url === 'https://img.example.com/v1/images/generations'
      && out.s3.auth === 'Bearer CHATKEY';
    return out;
  })()`, sessionId);
  console.log(JSON.stringify(res, null, 1));
} finally {
  try { ws.close(); } catch (_) {} try { proc.kill(); } catch (_) {}
  try { rmSync(userDir, { recursive: true, force: true, maxRetries: 5 }); } catch (_) {}
}
