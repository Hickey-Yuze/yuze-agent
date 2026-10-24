
// Verify: prune removes hr-only rendered body regardless of shape
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
const HERE = dirname(fileURLToPath(import.meta.url));
const EXT = join(HERE, 'extension');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9707;
const userDir = mkdtempSync(join(tmpdir(), 'yz-hr-'));
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
  const ev = async (expression, sessionId) => { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId); if (r.exceptionDetails) return { err: String((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || '').slice(0, 300) }; return r.result && r.result.value; };
  const loaded = await send('Extensions.loadUnpacked', { path: EXT });
  const { targetId } = await send('Target.createTarget', { url: `chrome-extension://${loaded.id}/sidepanel.html` });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId);
  for (let i = 0; i < 100; i++) { const s = await ev(`document.readyState + '|' + (typeof render)`, sessionId); if (s === 'complete|function') break; await sleep(120); }
  await sleep(400);
  const out = await ev(`(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const mk = (id, content) => ({ role: 'assistant', reasoning: '', content, _live: false, _id: id });
    messages.length = 0;
    messages.push({ role: 'user', content: 'q' });
    // c1: hr-only via direct DOM injection then render (bypasses hasVisibleContent)
    messages.push(mk('c1', '---')); midOf(messages[1]); render();
    const bot1 = [...document.querySelectorAll('.msg-bot')].at(-1);
    if (bot1) { const b = document.createElement('div'); b.className = 'bot-md'; b.innerHTML = '<hr><hr>'; bot1.appendChild(b); }
    pruneGhostBlocks(document.getElementById('chat'));
    const c1removed = ![...document.querySelectorAll('.msg-bot')].some((n) => n.dataset.mid === midOf(messages[1]));
    // c2: text content preserved
    messages.push(mk('c2', 'REAL TEXT')); render();
    const c2alive = [...document.querySelectorAll('.msg-bot')].some((n) => n.textContent.includes('REAL TEXT'));
    // c3: hasVisibleContent variants
    return {
      c1removed, c2alive,
      v1: hasVisibleContent('---'), v2: hasVisibleContent('----------'),
      v3: hasVisibleContent('\\n---\\n\\n---\\n'), v4: hasVisibleContent('***'),
      v5: hasVisibleContent('______'), v6: hasVisibleContent('hello'),
      v7: hasVisibleContent('- - - -')
    };
  })()`, sessionId);
  console.log(JSON.stringify(out, null, 1));
} finally {
  try { ws.close(); } catch (_) {} try { proc.kill(); } catch (_) {}
  try { rmSync(userDir, { recursive: true, force: true, maxRetries: 5 }); } catch (_) {}
}
