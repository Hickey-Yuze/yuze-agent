
// Visual forensics: real-width settings PNG + chat thin-line scan
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
const HERE = dirname(fileURLToPath(import.meta.url));
const EXT = join(HERE, 'extension');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9705;
const userDir = mkdtempSync(join(tmpdir(), 'yz-visual-'));
const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${userDir}`,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--window-size=768,1002', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitPort() { for (let i = 0; i < 80; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return await r.json(); } catch {} await sleep(150); } throw new Error('no'); }
const b64 = (s) => Buffer.from(s, 'base64');
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
  const out = {};

  // Settings at 768 width, scroll bottom, screenshot
  await ev(`$('settings').classList.remove('hidden');`, sessionId);
  await sleep(150);
  out.scrollDump = await ev(`(async () => {
    const card = document.querySelector('.set-card');
    card.scrollTop = card.scrollHeight;
    await new Promise((r) => setTimeout(r, 120));
    const g = document.querySelector('.set-group');
    const gr = g.getBoundingClientRect();
    return { groupH: Math.round(gr.height), groupW: Math.round(gr.width), groupTop: Math.round(gr.top), groupBottom: Math.round(gr.bottom), cardH: Math.round(card.getBoundingClientRect().height), scrollTop: card.scrollTop, scrollH: card.scrollHeight };
  })()`, sessionId);
  const shot1 = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
  writeFileSync('docs/set-768.png', b64(shot1.data));

  // Thin-line scan in chat after mock image gen rounds
  out.lines = await ev(`(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    messages.length = 0;
    messages.push({ role: 'user', content: 'gen image' });
    // round 1: tool call then assistant with separator-only content (mimic real flow shapes)
    const m1 = { role: 'assistant', reasoning: 'thinking about image', content: '', _live: true, _id: 'fx1' };
    messages.push(m1); midOf(m1); render(); updateLive(m1);
    m1.content = '---'; updateLive(m1); await wait(40);
    m1.content = '\\n---\\n\\n---\\n'; updateLive(m1); await wait(40);
    m1.content = ''; m1._live = false; render(); updateLive(m1);
    await wait(80);
    const bad = [];
    document.querySelectorAll('#chat *').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.height >= 1 && r.height <= 4 && r.width > 150) {
        const cs = getComputedStyle(el);
        bad.push({ tag: el.tagName, cls: el.className && String(el.className).slice(0, 30), h: Math.round(r.height), w: Math.round(r.width), bg: cs.backgroundColor, border: cs.borderTopWidth + ' ' + cs.borderTopColor, parentCls: el.parentElement && String(el.parentElement.className).slice(0, 30) });
      }
    });
    return { count: bad.length, items: bad.slice(0, 10) };
  })()`, sessionId);

  console.log(JSON.stringify(out, null, 1));
} finally {
  try { ws.close(); } catch (_) {} try { proc.kill(); } catch (_) {}
  try { rmSync(userDir, { recursive: true, force: true, maxRetries: 5 }); } catch (_) {}
}
