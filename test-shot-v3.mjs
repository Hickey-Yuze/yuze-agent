/**
 * v0.3 视觉验证：主界面 / 历史抽屉 / 模型切换
 * 用法：node test-shot-v3.mjs
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
const PORT = 9334;

mkdirSync(DOCS, { recursive: true });
const userDir = mkdtempSync(join(tmpdir(), 'ca-shot3-'));

const proc = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${userDir}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-gpu',
  '--window-size=420,900',
  'about:blank'
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitPort() {
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (r.ok) return await r.json();
    } catch {}
    await sleep(150);
  }
  throw new Error('Chrome 未就绪');
}

const ver = await waitPort();
const ws = new WebSocket(ver.webSocketDebuggerUrl);
let seq = 0;
const pending = new Map();

ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const p = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? p.reject(new Error(JSON.stringify(msg.error))) : p.resolve(msg.result);
  }
});
await new Promise((r) => ws.addEventListener('open', r, { once: true }));

function send(method, params = {}, sessionId) {
  const id = ++seq;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });
}

const samples = [
  { role: 'user', content: '打开 example.com 看看标题，再试着搜索机械键盘' },
  { role: 'assistant', tool_calls: [{ id: 't1', type: 'function', function: { name: 'browser_navigate', arguments: '{"url":"https://example.com"}' } }] },
  { role: 'tool', tool_call_id: 't1', content: '{"ok":true,"url":"https://example.com/","title":"Example Domain","loadMs":412,"loaded":true}' },
  { role: 'assistant', tool_calls: [{ id: 't2', type: 'function', function: { name: 'browser_snapshot', arguments: '{}' } }] },
  { role: 'tool', tool_call_id: 't2', content: 'URL: https://example.com/\n标题: Example Domain\n可交互元素 2 个:\n[0] <a> More information...\n[1] <a> 中文' },
  { role: 'assistant', content: '标题是 **Example Domain**。页面上只有两个链接，第一个指向 IANA 的说明页。' },
  { role: 'assistant', tool_calls: [{ id: 't3', type: 'function', function: { name: 'browser_get_text', arguments: '{"maxChars":3500}' } }] },
  { role: 'tool', tool_call_id: 't3', content: 'Example Domain\nThis domain is for use in illustrative examples in documents.' }
];

try {
  const loaded = await send('Extensions.loadUnpacked', { path: EXT });
  const extId = loaded.id;
  console.log('extension id:', extId);

  const { targetId } = await send('Target.createTarget', {
    url: `chrome-extension://${extId}/sidepanel.html`
  });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId);
  await send('Runtime.enable', {}, sessionId);
  await send('Emulation.setDeviceMetricsOverride', {
    width: 420, height: 900, deviceScaleFactor: 2, mobile: false
  }, sessionId);
  await sleep(700);

  // 预置历史会话
  await send('Runtime.evaluate', {
    expression: `chrome.storage.local.set({ sessions: [
      { id: 'b', title: '把当前页面的表格整理成 markdown', at: Date.now() - 3600e3, messages: [{role:'user',content:'把当前页面的表格整理成 markdown'}] },
      { id: 'c', title: '对比这两个标签页在讲什么', at: Date.now() - 86400e3, messages: [{role:'user',content:'对比这两个标签页'}] },
      { id: 'd', title: '在京东搜索机械键盘并比价', at: Date.now() - 3 * 86400e3, messages: [{role:'user',content:'京东比价'}] }
    ] })`,
    returnByValue: true, awaitPromise: true
  }, sessionId);

  // 图 1：主界面
  await send('Runtime.evaluate', {
    expression: `messages = ${JSON.stringify(samples)}; lastShot = null; render(); 'ok'`,
    returnByValue: true
  }, sessionId);
  await sleep(450);
  let shot = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
  writeFileSync(join(DOCS, 'panel-v3-main.png'), Buffer.from(shot.data, 'base64'));
  console.log('saved panel-v3-main.png');

  // 图 2：历史抽屉
  await send('Runtime.evaluate', { expression: 'openDrawer(); "ok"', returnByValue: true }, sessionId);
  await sleep(600);
  const dbg = await send('Runtime.evaluate', {
    expression: `(async () => {
      const o = await chrome.storage.local.get('sessions');
      return JSON.stringify({
        storageN: (o.sessions || []).length,
        domN: document.querySelectorAll('#sessionList .sess').length,
        html: document.querySelector('#sessionList')?.innerHTML.slice(0, 120)
      });
    })()`,
    awaitPromise: true, returnByValue: true
  }, sessionId);
  console.log('drawer debug:', dbg.result?.value);
  shot = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
  writeFileSync(join(DOCS, 'panel-v3-history.png'), Buffer.from(shot.data, 'base64'));
  console.log('saved panel-v3-history.png');

  // 图 3：模型切换
  await send('Runtime.evaluate', { expression: 'closeDrawer(); "ok"', returnByValue: true }, sessionId);
  await sleep(200);
  await send('Runtime.evaluate', {
    expression: `modelIds = ['cn:hy4-preview-f','cn:deepseek-v4-pro','cn:glm-5.3','cn:kimi-k3']; chrome.storage.local.set({model:'cn:hy4-preview-f'}); openModelMenu(); 'ok'`,
    returnByValue: true
  }, sessionId);
  await sleep(600);
  shot = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
  writeFileSync(join(DOCS, 'panel-v3-model.png'), Buffer.from(shot.data, 'base64'));
  console.log('saved panel-v3-model.png');

  const probe = await send('Runtime.evaluate', {
    expression: `JSON.stringify({
      tools: TOOLS.length,
      chips: document.querySelectorAll('.chip').length,
      drawer: !!document.querySelector('#drawer'),
      modelItems: document.querySelectorAll('#modelMenu .pop-item').length,
      errors: window.__errs || []
    })`,
    returnByValue: true
  }, sessionId);
  console.log('probe:', probe.result?.value);
} catch (e) {
  console.error('FAILED:', e.message);
  process.exitCode = 1;
} finally {
  ws.close();
  proc.kill('SIGKILL');
}
