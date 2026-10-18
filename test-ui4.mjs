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
  const shot = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
  writeFileSync(join(DOCS, 'brand-bar.png'), Buffer.from(shot.data, 'base64'));
  console.log('saved brand-bar.png');

  const r1 = await send('Runtime.evaluate', {
  expression: `(async () => {
    const narrow = getComputedStyle(document.querySelector('#btnQuote')).fontSize;
    // 底栏顺序
    const order = [...document.querySelectorAll('.tools-row > button')].map(b => b.id);
    // 设置页
    await loadSettings();
    const provs = provList.querySelectorAll('.prov').length;
    document.getElementById('btnProvAdd').click();
    const provsAfter = provList.querySelectorAll('.prov').length;
    // 模型菜单搜索
    modelIds = ['cn:deepseek-v4.1-flash','cn:deepseek-v4-pro','cn:glm-5.3','cn:kimi-k3-1'];
    await openModelMenu();
    await new Promise(r => setTimeout(r, 150));
    const hasSearch = !!modelMenu.querySelector('.pop-search input');
    const before = modelMenu.querySelectorAll('.pop-item').length;
    const si = modelMenu.querySelector('.pop-search input');
    si.value = 'deepseek';
    si.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 80));
    const after = modelMenu.querySelectorAll('.pop-item').length;
    modelMenu.classList.add('hidden');
    return JSON.stringify({ narrow, order, provs, provsAfter, hasSearch, before, after });
  })()`, returnByValue: true, awaitPromise: true }, sessionId);
console.log('UI4:', r1.result?.result?.value ?? JSON.stringify(r1).slice(0,300));
// 宽屏检测
await send('Emulation.setDeviceMetricsOverride', { width: 560, height: 1200, deviceScaleFactor: 2, mobile: false }, sessionId);
await sleep(300);
const r2 = await send('Runtime.evaluate', {
  expression: `JSON.stringify({ wide: getComputedStyle(document.querySelector('#btnQuote')).fontSize, tip: !!document.querySelector('#btnQuote').dataset.label })`,
  returnByValue: true }, sessionId);
console.log('WIDE:', JSON.stringify(r2).slice(0,300));

} catch (e) {
  console.error('FAIL', e);
} finally {
  try { ws.close(); } catch {}
  proc.kill();
}
