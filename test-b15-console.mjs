import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
const HERE = dirname(fileURLToPath(import.meta.url));
const EXT = join(HERE, 'extension');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9851;
const userDir = mkdtempSync(join(tmpdir(), 'ca-b15-'));
const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${userDir}`,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--window-size=980,1300', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitPort() { for (let i = 0; i < 80; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return await r.json(); } catch {} await sleep(150); } throw new Error('no chrome'); }
const ver = await waitPort();
const ws = new WebSocket(ver.webSocketDebuggerUrl);
let seq = 0; const pending = new Map(); const logs = [];
ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); } if (m.method === 'Runtime.consoleAPICalled') logs.push((m.params.args||[]).map(a=>a.value||a.description||'').join(' ')); if (m.method === 'Runtime.exceptionThrown') logs.push('EXC: ' + (m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text)); });
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
function send(method, params = {}, sessionId) { const id = ++seq; return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params, sessionId })); }); }
try {
  const loaded = await send('Extensions.loadUnpacked', { path: EXT });
  const { targetId } = await send('Target.createTarget', { url: 'https://example.com' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId);
  await send('Runtime.enable', {}, sessionId);
  await sleep(2500);
  const r = await send('Runtime.evaluate', {
    expression: `(async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const tab2 = tab && tab.url && tab.url.includes('example') ? tab : (await chrome.tabs.query({})).find(t => t.url && t.url.includes('example'));
      const res = await chrome.scripting.executeScript({ target: { tabId: tab2.id }, files: ['scripts/b15.user.js'] });
      await new Promise(r => setTimeout(r, 800));
      const check = await chrome.scripting.executeScript({ target: { tabId: tab2.id }, func: () => ({ root: !!document.getElementById('rilakkuma-memo-root'), body: !!document.body, nodes: document.body ? document.body.children.length : 0 }) });
      return JSON.stringify({ injected: !!res, check: check[0].result });
    })()`,
    awaitPromise: true, returnByValue: true,
  }, sessionId);
  console.log('RESULT:', r.result.value);
  console.log('LOGS:', JSON.stringify(logs.slice(0, 10)));
} finally { try { ws.close(); } catch (_) {} proc.kill('SIGKILL'); }
