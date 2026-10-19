import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
const HERE = dirname(fileURLToPath(import.meta.url));
const EXT = join(HERE, 'extension');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9935;
const userDir = mkdtempSync(join(tmpdir(), 'ca-nf2-'));
const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${userDir}`,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--window-size=980,1300', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitPort() { for (let i = 0; i < 80; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return await r.json(); } catch {} await sleep(150); } throw new Error('no chrome'); }
const ver = await waitPort();
const ws = new WebSocket(ver.webSocketDebuggerUrl);
let seq = 0; const pending = new Map();
ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); } });
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
function send(method, params = {}, sessionId) { const id = ++seq; return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params, sessionId })); }); }
try {
  const loaded = await send('Extensions.loadUnpacked', { path: EXT });
  const { targetId } = await send('Target.createTarget', { url: `chrome-extension://${loaded.id}/sidepanel.html` });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId);
  await send('Runtime.enable', {}, sessionId);
  await sleep(1300);
  const r = await send('Runtime.evaluate', {
    expression: `(async () => {
      try {
        const libBtn = !!document.getElementById('btnSkillsLibrary');
        let chips = -1, text = '', err = '';
        try {
          const node = userNode({ role: 'user', content: '【引用文件：a.txt】\\n全文全文', display: '帮我看看', quotes: [{ label: '文件：a.txt', kind: 'file' }, { label: '标签页 b', kind: 'tab' }] });
          chips = node.querySelectorAll('.uq-quotes .uq-q').length;
          text = node.querySelector('.q-text')?.textContent || '';
        } catch (e) { err = String(e && e.message); }
        return JSON.stringify({ libBtn, chips, text, err });
      } catch (e) { return 'ERR: ' + ((e && e.message) || e); }
    })()`,
    awaitPromise: true, returnByValue: true,
  }, sessionId);
  console.log('PART1:', r.result.value);
  // 写 storage 并 reload
  await send('Runtime.evaluate', {
    expression: `(async () => { await chrome.storage.local.set({ lastSessionId: 'restore-test-1', sessions: [{ id: 'restore-test-1', title: '恢复测试会话', at: Date.now(), host: '', messages: [{ role: 'user', content: '历史消息一', display: '历史消息一', quotes: [] }] }] }); location.reload(); return 'reloading'; })()`,
    awaitPromise: true, returnByValue: true,
  }, sessionId).catch(() => null);
  await sleep(2500);
  const r2 = await send('Runtime.evaluate', {
    expression: `(async () => { await new Promise(r => setTimeout(r, 500)); return JSON.stringify({ restoredUsers: document.querySelectorAll('#chat .msg-user').length, firstText: (document.querySelector('#chat .msg-user')||{}).textContent || '' }); })()`,
    awaitPromise: true, returnByValue: true,
  }, sessionId).catch(() => ({ result: { value: 'ERR reload' } }));
  console.log('PART2:', r2.result && r2.result.value);
  const shot = await send('Page.captureScreenshot', { format: 'png' }, sessionId).catch(() => null);
  if (shot) (await import('node:fs')).writeFileSync(join(HERE, 'docs', 'panel-settings.png'), Buffer.from(shot.data, 'base64'));
} finally { try { ws.close(); } catch (_) {} proc.kill('SIGKILL'); }
