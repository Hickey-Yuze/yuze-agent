import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
const HERE = dirname(fileURLToPath(import.meta.url));
const EXT = join(HERE, 'extension');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9901;
const userDir = mkdtempSync(join(tmpdir(), 'ca-st-'));
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
        document.querySelector('#btnSettings').click();
        await new Promise(r => setTimeout(r, 300));
        const card = !!document.querySelector('#settings .set-card');
        const title = document.querySelector('#settings .set-title')?.textContent;
        const rows = [...document.querySelectorAll('#settings .set-row b')].map(x => x.textContent).join(',');
        const save = document.querySelector('#btnSave')?.textContent;
        const provEdit = !!document.querySelector('#provList .prov-edit');
        document.querySelector('#btnSettingsClose').click();
        await new Promise(r => setTimeout(r, 200));
        const closed = document.querySelector('#settings').classList.contains('hidden');
        // quoteWrap
        const at = !!document.querySelector('#btnQuote .at-ic');
        const swInWrap = !!document.querySelector('#quoteWrap > #btnQuoteAuto');
        document.querySelector('#btnSettingsClose').click();
        await new Promise(r => setTimeout(r, 200));
        document.querySelector('#btnSettings').click();
        return JSON.stringify({ card, title, rows, save, provEdit, closed, at, swInWrap });
      } catch (e) { return 'ERR: ' + ((e && e.message) || e); }
    })()`,
    awaitPromise: true, returnByValue: true,
  }, sessionId);
  console.log('SETTINGS:', r.result.value);
  const shot = await send('Page.captureScreenshot', { format: 'png' }, sessionId).catch(() => null);
  if (shot) (await import('node:fs')).writeFileSync(join(HERE, 'docs', 'panel-settings.png'), Buffer.from(shot.data, 'base64'));
} finally { try { ws.close(); } catch (_) {} proc.kill('SIGKILL'); }
