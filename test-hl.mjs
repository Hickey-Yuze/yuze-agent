/**
 * 端到端流式验证：真实调用网关，观察 reasoning/content 增量增长
 * 用法：CA_KEY=sk-... node test-stream-live.mjs
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const EXT = join(HERE, 'extension');
const DOCS = join(HERE, 'docs');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9348;


const userDir = mkdtempSync(join(tmpdir(), 'ca-live-'));
const proc = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${userDir}`,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu',
  '--window-size=420,1200', 'about:blank'
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitPort() {
  for (let i = 0; i < 80; i++) {
    try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return await r.json(); } catch {}
    await sleep(150);
  }
  throw new Error('Chrome 未就绪');
}

const ver = await waitPort();
const ws = new WebSocket(ver.webSocketDebuggerUrl);
let seq = 0;
const pending = new Map();
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    const p = pending.get(m.id); pending.delete(m.id);
    m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result);
  }
});
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
function send(method, params = {}, sessionId) {
  const id = ++seq;
  return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params, sessionId })); });
}

try {
  const loaded = await send('Extensions.loadUnpacked', { path: EXT });
  const { targetId } = await send('Target.createTarget', { url: `chrome-extension://${loaded.id}/sidepanel.html` });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId);
  await send('Runtime.enable', {}, sessionId);
  await send('Emulation.setDeviceMetricsOverride', { width: 420, height: 1200, deviceScaleFactor: 2, mobile: false }, sessionId);
  await sleep(700);

  await sleep(600);
  const r = await send('Runtime.evaluate', {
  expression: `(async () => {
    const md = '这是一段脚本：\\n\\n\`\`\`javascript\\n// 复制订单号\\n(function () {\\n  const nums = [1, 2, 3];\\n  const msg = "共 " + nums.length + " 个";\\n  return nums.map(n => n * 2);\\n})();\\n\`\`\`\\n\\n说明：可执行、可保存。';
    chatEl.innerHTML = '';
    const u = document.createElement('div');
    u.className = 'msg-user';
    u.textContent = '这段代码做什么';
    chatEl.appendChild(u);
    const b = document.createElement('div');
    b.className = 'msg-bot';
    b.innerHTML = mdToHtml(md);
    chatEl.appendChild(b);
    await new Promise(r => setTimeout(r, 150));
    const q = (sel) => document.querySelectorAll(sel).length;
    return JSON.stringify({ cl: q('.cl'), kw: q('.c-kw'), str: q('.c-str'), num: q('.c-num'), com: q('.c-com'), langs: q('.code-lang') });
  })()`, returnByValue: true, awaitPromise: true }, sessionId);
console.log('HL:', JSON.stringify(r).slice(0, 400));
await sleep(250);
const sh = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
writeFileSync(join(DOCS, 'code-hl.png'), Buffer.from(sh.data, 'base64'));
console.log('saved code-hl.png');

} catch (e) {
  console.error('FAIL', e);
} finally {
  try { ws.close(); } catch {}
  proc.kill();
}
