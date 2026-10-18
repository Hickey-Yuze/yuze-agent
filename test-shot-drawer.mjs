/**
 * 历史抽屉：分组 / 行式 / ⋯ 删除 验证
 * 用法：node test-shot-drawer.mjs
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
const PORT = 9350;

mkdirSync(DOCS, { recursive: true });
const userDir = mkdtempSync(join(tmpdir(), 'ca-drawer-'));
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

const now = Date.now();
const SEED = `(() => {
  const now = ${now};
  const mk = (id, title, ago, host) => ({ id, title, at: now - ago, host, messages: [{ role: 'user', content: title }] });
  const list = [
    mk('s1', '用户询问界面所包含的内容', 0, 'ops.rrzu.com'),
    mk('s2', '请求制作可搜索红色款指定内容并导出', 3600e3, 'ops.rrzu.com'),
    mk('s3', '订单号.js未找到订单号，需确认', 86400e3, 'other.com'),
    mk('s4', '油猴脚本抓取订单号并复制', 2 * 86400e3, ''),
    mk('s5', '问候交流', 10 * 86400e3, '')
  ];
  sessionId = 's1';
  pageHost = async () => 'ops.rrzu.com';
  return chrome.storage.local.set({ sessions: list }).then(() => 'seeded');
})()`;

try {
  const loaded = await send('Extensions.loadUnpacked', { path: EXT });
  const { targetId } = await send('Target.createTarget', { url: `chrome-extension://${loaded.id}/sidepanel.html` });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId);
  await send('Runtime.enable', {}, sessionId);
  await send('Emulation.setDeviceMetricsOverride', { width: 420, height: 1200, deviceScaleFactor: 2, mobile: false }, sessionId);
  await sleep(600);

  await send('Runtime.evaluate', { expression: SEED, awaitPromise: true, returnByValue: true }, sessionId);
  await send('Runtime.evaluate', { expression: `openDrawer().then(() => 'opened')`, awaitPromise: true, returnByValue: true }, sessionId);
  await sleep(500);

  const shot1 = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
  writeFileSync(join(DOCS, 'drawer-list.png'), Buffer.from(shot1.data, 'base64'));
  console.log('saved drawer-list.png');

  const p1 = await send('Runtime.evaluate', {
    expression: `JSON.stringify({
      groups: [...document.querySelectorAll('.sess-group-head span')].map(e => e.textContent),
      rows: document.querySelectorAll('.sess').length,
      first: document.querySelector('.sess-t')?.textContent,
      time: document.querySelector('.sess-d')?.textContent,
      onCount: document.querySelectorAll('.sess.on').length,
      moreVisible: (() => { const b = document.querySelector('.sess-more'); return b ? getComputedStyle(b).opacity : null; })()
    })`,
    returnByValue: true
  }, sessionId);
  console.log('list probe:', p1.result?.value);

  // 点 ⋯ 打开菜单
  await send('Runtime.evaluate', { expression: `document.querySelectorAll('.sess-more')[1].click(); 'ok'`, returnByValue: true }, sessionId);
  await sleep(250);
  const shot2 = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
  writeFileSync(join(DOCS, 'drawer-menu.png'), Buffer.from(shot2.data, 'base64'));
  console.log('saved drawer-menu.png');

  // 删除
  await send('Runtime.evaluate', { expression: `document.querySelector('.sess-menu-item.danger').click(); 'ok'`, returnByValue: true }, sessionId);
  await sleep(500);
  const p2 = await send('Runtime.evaluate', {
    expression: `(async () => {
      const o = await chrome.storage.local.get('sessions');
      return JSON.stringify({
        menuGone: !document.getElementById('sessMenu'),
        rows: document.querySelectorAll('.sess').length,
        stored: (o.sessions || []).map(s => s.id),
        titles: [...document.querySelectorAll('.sess-t')].map(e => e.textContent)
      });
    })()`,
    awaitPromise: true, returnByValue: true
  }, sessionId);
  console.log('after delete:', p2.result?.value);

  const shot3 = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
  writeFileSync(join(DOCS, 'drawer-deleted.png'), Buffer.from(shot3.data, 'base64'));
  console.log('saved drawer-deleted.png');
} catch (e) {
  console.error('FAIL', e);
} finally {
  try { ws.close(); } catch {}
  proc.kill();
}
