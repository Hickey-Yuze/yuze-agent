
// Short-window reproduction: settings collapse + long-dash separator leak
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
const HERE = dirname(fileURLToPath(import.meta.url));
const EXT = join(HERE, 'extension');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9706;
const userDir = mkdtempSync(join(tmpdir(), 'yz-short-'));
const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${userDir}`,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--window-size=420,700', 'about:blank'], { stdio: 'ignore' });
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
  const out = {};

  // A: settings at short window
  out.settings = await ev(`(async () => {
    $('settings').classList.remove('hidden');
    await new Promise((r) => setTimeout(r, 120));
    const card = document.querySelector('.set-card');
    const g = document.querySelector('.set-group');
    const gr = g.getBoundingClientRect();
    const skills = $('btnSkillsManage').getBoundingClientRect();
    const canScroll = card.scrollHeight > card.clientHeight + 2;
    return {
      winH: innerHeight, cardH: Math.round(card.getBoundingClientRect().height),
      groupH: Math.round(gr.height), skillsH: Math.round(skills.height),
      skillsVisible: skills.height > 30, scrollable: canScroll
    };
  })()`, sessionId);

  // B: long-dash separator lines leak through hasVisibleContent?
  out.sep = await ev(`(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    messages.length = 0;
    messages.push({ role: 'user', content: 'q' });
    const m1 = { role: 'assistant', reasoning: '', content: '', _live: true, _id: 's1' };
    messages.push(m1); midOf(m1); render(); updateLive(m1);
    m1.content = '\\n----------\\n\\n----------\\n'; updateLive(m1); await wait(60);
    m1._live = false; render();
    await wait(60);
    const node = [...document.querySelectorAll('.msg-bot')].at(-1);
    const hrs = node ? node.querySelectorAll('hr').length : -1;
    const nodeGone = !node;
    return { longDashHrs: hrs, botNodeCount: document.querySelectorAll('.msg-bot').length };
  })()`, sessionId);

  console.log(JSON.stringify(out, null, 1));
} finally {
  try { ws.close(); } catch (_) {} try { proc.kill(); } catch (_) {}
  try { rmSync(userDir, { recursive: true, force: true, maxRetries: 5 }); } catch (_) {}
}
