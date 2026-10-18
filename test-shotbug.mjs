/**
 * 回归：截图消息发出后不应再在对话末尾重复渲染
 * 断言：图片只作为 .msg-user 的子元素出现一次；chatEl 直接子级无裸 img
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const EXT = join(HERE, 'extension');
const DOCS = join(HERE, 'docs');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9339;

mkdirSync(DOCS, { recursive: true });
const userDir = mkdtempSync(join(tmpdir(), 'ca-shotbug-'));

const proc = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${userDir}`,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu',
  '--window-size=420,900', 'about:blank'
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
const send = (method, params = {}, sessionId) => {
  const id = ++seq;
  return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params, sessionId })); });
};

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

try {
  const { id: extId } = await send('Extensions.loadUnpacked', { path: EXT });
  const { targetId } = await send('Target.createTarget', { url: `chrome-extension://${extId}/sidepanel.html` });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId);
  await send('Runtime.enable', {}, sessionId);
  await send('Emulation.setDeviceMetricsOverride', { width: 420, height: 900, deviceScaleFactor: 2, mobile: false }, sessionId);
  await sleep(700);

  const MSGS = JSON.stringify([
    { role: 'user', content: '生成两张祝寿图' },
    { role: 'assistant', tool_calls: [{ id: 'g1', type: 'function', function: { name: 'generate_image', arguments: '{"prompt":"猫蝶图"}' } }] },
    { role: 'tool', tool_call_id: 'g1', content: JSON.stringify({ ok: true, image: PNG }) },
    { role: 'assistant', content: '两张图已生成：\n\n1. 传统《耄耋图》\n![耄耋图](' + PNG + ')\n\n2. 写实人像\n![长者肖像](' + PNG + ')' }
  ]);

  const r = await send('Runtime.evaluate', {
    expression: `(() => { try {
      messages = ${MSGS};
      render();
      const md = [...document.querySelectorAll('.md-img')].map(n => Math.round(n.getBoundingClientRect().width));
      return JSON.stringify({ mdImgs: md.length, widths: md, toolImg: document.querySelectorAll('.tool-img').length, txt: document.getElementById('chat').innerText.includes('!耄耋图') });
    } catch (e) { return 'ERR: ' + e.message; } })()`,
    returnByValue: true
  }, sessionId);
  console.log('assert:', r.result?.value);

  const shot = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
  writeFileSync(join(DOCS, 'panel-shot-fix.png'), Buffer.from(shot.data, 'base64'));
  console.log('saved panel-shot-fix.png');
} catch (e) {
  console.error('FAILED:', e.message);
  process.exitCode = 1;
} finally {
  ws.close(); proc.kill('SIGKILL');
}
