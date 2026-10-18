/**
 * 视觉验证：加载扩展，注入样例对话，截 sidepanel 图。
 * 用法：node test-shot.mjs
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const EXT = join(HERE, 'extension');
const OUT = join(HERE, 'docs', 'panel-v2.png');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9333;

mkdirSync(join(HERE, 'docs'), { recursive: true });
const userDir = mkdtempSync(join(tmpdir(), 'ca-shot-'));

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

  const samples = [
    { role: 'user', content: '打开 example.com 看看标题，再试着搜索机械键盘' },
    { role: 'assistant', tool_calls: [{ id: 't1', type: 'function', function: { name: 'browser_navigate', arguments: '{"url":"https://example.com"}' } }] },
    { role: 'tool', tool_call_id: 't1', content: '{"ok":true,"url":"https://example.com/","title":"Example Domain","loadMs":412,"loaded":true}' },
    { role: 'assistant', tool_calls: [{ id: 't2', type: 'function', function: { name: 'browser_snapshot', arguments: '{}' } }] },
    { role: 'tool', tool_call_id: 't2', content: 'URL: https://example.com/\n标题: Example Domain\n可交互元素 2 个:\n[0] <a> More information...\n[1] <a> 中文' },
    { role: 'assistant', content: '标题是 **Example Domain**。页面上只有两个链接，第一个指向 IANA 的说明页。\n\n如果要在搜索框输入，需要先导航到有搜索框的站点。' },
    { role: 'assistant', tool_calls: [{ id: 't3', type: 'function', function: { name: 'browser_get_text', arguments: '{"maxChars":3500}' } }] },
    { role: 'tool', tool_call_id: 't3', content: 'Example Domain\nThis domain is for use in illustrative examples in documents. You may use this domain in literature without prior coordination or asking for permission.\nMore information...\n\n（这是一段用来演示长输出折叠效果的示例文本，展开后才显示。）' },
    { role: 'assistant', content: '⚠️ API Key 无效或没填对。点右上角 ⚙ 重新粘贴一次。', _err: '⚠️ API Key 无效或没填对。点右上角 ⚙ 重新粘贴一次。', _repeat: 3 }
  ];

  const expr = `messages = ${JSON.stringify(samples)}; lastShot = null; render();
    ${JSON.stringify('ok')}`;

  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true }, sessionId);
  await send('Runtime.evaluate', { expression: "document.querySelectorAll('details.tool')[2]?.setAttribute('open','')", returnByValue: true }, sessionId);
  await sleep(300);
  if (r.exceptionDetails) console.error('注入异常:', r.exceptionDetails);
  await sleep(400);

  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }, sessionId);
  writeFileSync(OUT, Buffer.from(shot.data, 'base64'));
  console.log('saved:', OUT);

  const errs = await send('Runtime.evaluate', {
    expression: `JSON.stringify({ tools: TOOLS.length, h: document.body.scrollHeight, bot: (document.querySelector(".msg-bot")?.innerHTML||"").slice(0,120) })`,
    returnByValue: true
  }, sessionId);
  console.log('probe:', errs.result?.value);
} catch (e) {
  console.error('FAILED:', e.message);
  process.exitCode = 1;
} finally {
  ws.close();
  proc.kill('SIGKILL');
}
