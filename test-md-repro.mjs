/**
 * v0.4 markdown 排版验证：标题 / 分隔线 / 列表 / 代码块 / 引用
 * 用法：node test-shot-v4.mjs
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
const PORT = 9335;

mkdirSync(DOCS, { recursive: true });
const userDir = mkdtempSync(join(tmpdir(), 'ca-shot4-'));

const proc = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${userDir}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-gpu',
  '--window-size=420,1200',
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

const RICH = [
  '顶部黄色条是反诈提示文案，链接不可点击。',
  '',
  '---',
  '## 不属于网站本身的元素',
  '',
  '- 页面里有 **23 个** `.engine` 的 `<a>`（"Trans_stIcon"、"Copy_stIcon"、"Baidu_stIcon"）：它们全部 **0×0 隐藏**，来自浏览器上的翻译或划词类扩展注入，不属于蓝奏云的功能。',
  '- 页面右侧悬浮的两个紫色小图标在截图里能看到，但不在页面 DOM 里，是由扩展（`crx-mouse-redesign-content-root` 等容器）注入的。',
  '',
  '---',
  '## 小结',
  '',
  '真正的功能入口只有「举报」+「下载」+「扫码」三个。当前如果点击下载，很可能失败、拿不到文件；因为地址已经超时，需要重新加载页面，等 iframe 里的下载链接生成后再点击。',
  '',
  '> 另提醒：这是一个 APK 分享链接，安装前建议先核验来源和哈希值。',
  '',
  '接下来可以这样取下载地址：',
  '',
  '```js',
  'const links = [...document.querySelectorAll("iframe")]',
  '  .map(f => f.src)',
  '  .filter(Boolean);',
  'console.log(links);',
  '```',
  '',
  '1. 重新加载页面',
  '2. 等 iframe 生成下载链接',
  '3. 点击下载',
  '',
  '详情见 [蓝奏云帮助](https://example.com/help)。'
].join('\n');

const samples = [
  { role: 'user', content: '这个界面有什么' },
  { role: 'assistant', content: "• 顶部黄色条是反诈提示文案，链接不可点击。\n\n## 不属于网站本身的元素\n\n• 页面里有 23 个 `.engine` 的 `<a>`（Trans_stIcon、Copy_stIcon、Baidu_stIcon、Google_stIcon 等）：它们全部 0×0 隐藏，来自浏览器上的翻译或划词类扩展注入，不属于蓝奏云的功能。\n\n• 页面右侧悬浮的两个紫色小图标在截图里能看到，但不在页面 DOM 里，是由扩展（crx-mouse-redesign-content-root 等容器）注入的。\n\n## 小结\n\n真正的功能入口只有「举报」+「下载」+「扫码」三个。" }
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
    width: 420, height: 1200, deviceScaleFactor: 2, mobile: false
  }, sessionId);
  await sleep(700);

  await send('Runtime.evaluate', {
    expression: `messages = ${JSON.stringify(samples)}; lastShot = null; render(); 'ok'`,
    returnByValue: true
  }, sessionId);
  await sleep(500);
  const shot = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
  writeFileSync(join(DOCS, 'md-repro.png'), Buffer.from(shot.data, 'base64'));
  console.log('saved md-repro.png');

  const probe = await send('Runtime.evaluate', {
    expression: `JSON.stringify({
      h3: document.querySelectorAll('.msg-bot h3').length,
      h3Texts: [...document.querySelectorAll('.msg-bot h3')].map(e=>e.textContent),
      bareHash: /^##\s/m.test(document.querySelector('.msg-bot')?.textContent || ''),
      hr: document.querySelectorAll('.msg-bot hr').length,
      pre: document.querySelectorAll('.msg-bot pre.code').length,
      quote: document.querySelectorAll('.msg-bot blockquote').length,
      ol: document.querySelectorAll('.msg-bot ol').length,
      bareHash: /^##/m.test(document.querySelector('.msg-bot')?.textContent || '')
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
