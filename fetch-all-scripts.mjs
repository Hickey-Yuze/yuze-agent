import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
const HERE = dirname(fileURLToPath(import.meta.url));
const DOCS = join(HERE, 'docs');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9811;
const userDir = mkdtempSync(join(tmpdir(), 'ca-all-'));
const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${userDir}`,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--window-size=1280,1600', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitPort() { for (let i = 0; i < 80; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return await r.json(); } catch {} await sleep(150); } throw new Error('no chrome'); }
const ver = await waitPort();
const ws = new WebSocket(ver.webSocketDebuggerUrl);
let seq = 0; const pending = new Map();
ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); } });
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
function send(method, params = {}, sessionId) { const id = ++seq; return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params, sessionId })); }); }
const TITLES = ['打工人便利贴', '智能工作流引擎', '便签', '待办事项', '奇点标签'];
try {
  const { targetId } = await send('Target.createTarget', { url: 'https://skills.tabbit.com/plaza/skills?display_type=script&category_id=productivity' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId);
  await send('Runtime.enable', {}, sessionId);
  await sleep(9000);
  for (let i = 0; i < TITLES.length; i++) {
    const title = TITLES[i];
    const el = await send('Runtime.evaluate', { expression: `(() => {
      const els = [...document.querySelectorAll('*')].filter(e => e.children.length === 0 && (e.textContent||'').includes(${JSON.stringify(title)}));
      if (!els.length) return null;
      const r = els[0].getBoundingClientRect();
      return JSON.stringify({ x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) });
    })()`, returnByValue: true }, sessionId);
    if (!el.result.value) { console.log(title, 'not found'); continue; }
    const { x, y } = JSON.parse(el.result.value);
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 }, sessionId);
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 }, sessionId);
    await sleep(4500);
    const code = await send('Runtime.evaluate', { expression: `JSON.stringify([...document.querySelectorAll('pre, code')].map(e => e.textContent))`, returnByValue: true }, sessionId);
    writeFileSync(join(DOCS, `script-${i + 1}-${title.replace(/[^\w\u4e00-\u9fa5]/g, '')}.json`), code.result.value || '[]');
    console.log(title, 'code-len', (code.result.value || '').length);
    // 返回列表
    await send('Runtime.evaluate', { expression: 'history.back()' }, sessionId);
    await sleep(3000);
    if (i === TITLES.length - 1) {
      const shot = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
      writeFileSync(join(DOCS, 'script-last.png'), Buffer.from(shot.data, 'base64'));
    }
  }
} finally { try { ws.close(); } catch (_) {} proc.kill('SIGKILL'); }
