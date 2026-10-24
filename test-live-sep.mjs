
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

  const res = await ev(`(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const SEP = String.fromCharCode(10) + '---' + String.fromCharCode(10);
    const out = {};
    messages.length = 0;
    messages.push({ role: 'user', content: 'gen image' });
    const m1 = { role: 'assistant', reasoning: 'thinking...', content: '', _live: true, _id: 'ml1' };
    messages.push(m1); midOf(m1); render(); updateLive(m1);
    m1.content = SEP; updateLive(m1); await wait(50);
    out.sepOnly = {
      hrs: document.querySelectorAll('.msg-bot hr').length,
      mdH: (() => { const md = document.querySelector('.msg-bot .bot-md'); return md ? Math.round(md.getBoundingClientRect().height) : -1; })()
    };
    m1.content = 'IMG DONE'; updateLive(m1); await wait(50);
    out.normal = { text: document.querySelector('.msg-bot .bot-md').textContent, hrs: document.querySelectorAll('.msg-bot hr').length };
    const m2 = { role: 'assistant', reasoning: '', content: '', _live: true, _id: 'ml2' };
    messages.push(m2); render(); updateLive(m2);
    m2.content = '---'; updateLive(m2); await wait(30);
    m2.content = 'SECOND BODY'; updateLive(m2); await wait(50);
    out.recover = { texts: [...document.querySelectorAll('.msg-bot .bot-md')].map((n) => n.textContent), hrs: document.querySelectorAll('.msg-bot hr').length };
    out.pass = out.sepOnly.hrs === 0 && out.normal.text === 'IMG DONE' && out.normal.hrs === 0 && out.recover.hrs === 0 && out.recover.texts.join(',') === 'IMG DONE,SECOND BODY';
    return out;
  })()`, sessionId);
  console.log(JSON.stringify(res, null, 1));
} finally {
  try { ws.close(); } catch (_) {} try { proc.kill(); } catch (_) {}
  try { rmSync(userDir, { recursive: true, force: true, maxRetries: 5 }); } catch (_) {}
}
