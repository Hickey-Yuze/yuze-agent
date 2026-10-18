/**
 * 流式思考过程验证：网关 SSE 支持 + 思考块展开/折叠渲染
 * 用法：node test-shot-stream.mjs
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
const PORT = 9344;

mkdirSync(DOCS, { recursive: true });
const userDir = mkdtempSync(join(tmpdir(), 'ca-stream-'));

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

const THINK = [
  '用户打开的是一个订单管理系统的页面，问"这个界面有什么"。我需要基于当前网页内容来回答。',
  '',
  '这个页面是"订单派发"页面，URL 是 https://ops.rrzu.com/super/order-distribute/list，里面嵌入了 iframe：https://admin-vue.rrzu.com/order/manage/order-dispatch-v2。',
  '',
  '页面内容包含：',
  '- 顶部导航：首页、运营、商品、营销、订单、商家、统计、仓储、数据',
  '- 左侧菜单：订单管理（订单管理首页、订单列表-v4、订单代发V2、订单派发、订单批量操作2.0）',
  '- 当前页面：订单派发'
].join('\n');

const ANSWER = [
  '这是「订单派发」页面，主要分三块：',
  '',
  '## 页面结构',
  '',
  '- **顶部导航**：首页 / 运营 / 商品 / 营销 / 订单 / 商家 / 统计 / 仓储 / 数据',
  '- **左侧菜单**：订单管理下的订单列表-v4、订单代发V2、订单派发、订单批量操作2.0',
  '- **主内容区**：筛选条件 + 订单列表，当前停在「订单派发」',
  '',
  '## 可操作的事',
  '',
  '1. 按订单ID / 商品ID / 商家ID 筛订单',
  '2. 选择派单方式后批量派发',
  '3. 查看风控定性、决策路径等字段',
  '',
  '需要我帮你定位某个具体功能吗？'
].join('\n');

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

  // ── 1. 网关是否支持 SSE ──
  const streamProbe = await send('Runtime.evaluate', {
    expression: `(async () => {
      const conf = await chrome.storage.local.get(['apiKey','model','baseUrl']);
      const base = (conf.baseUrl || 'http://127.0.0.1:7863/v1').replace(/\\/$/,'');
      const out = { hasKey: !!conf.apiKey, model: conf.model || '(默认)' };
      let r;
      try {
        r = await fetch(base + '/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (conf.apiKey || '') },
          body: JSON.stringify({
            model: conf.model, stream: true, temperature: 0.2,
            messages: [{ role: 'user', content: '用一句话说明地球是圆的。' }]
          })
        });
      } catch (e) { out.error = String(e.message || e); return out; }
      out.status = r.status;
      out.ct = r.headers.get('content-type') || '';
      if (!r.ok) { out.body = (await r.text()).slice(0, 300); return out; }
      if (!(out.ct.includes('event-stream'))) { out.body = (await r.text()).slice(0, 200); out.sse = false; return out; }
      out.sse = true;
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let buf = '', chunks = 0, content = '', reasoning = '', sawDone = false;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let at;
        while ((at = buf.indexOf('\\n')) >= 0) {
          const line = buf.slice(0, at).trim(); buf = buf.slice(at + 1);
          if (!line.startsWith('data:')) continue;
          const p = line.slice(5).trim();
          if (!p) continue;
          if (p === '[DONE]') { sawDone = true; continue; }
          try {
            const j = JSON.parse(p);
            const d = j.choices && j.choices[0] && j.choices[0].delta;
            if (!d) continue;
            if (d.reasoning_content) reasoning += d.reasoning_content;
            if (d.content) { content += d.content; chunks++; }
          } catch (_) {}
        }
        if (chunks > 40) break;
      }
      out.contentChunks = chunks;
      out.contentLen = content.length;
      out.reasoningLen = reasoning.length;
      out.sawDone = sawDone;
      out.sample = content.slice(0, 50);
      return out;
    })()`,
    awaitPromise: true, returnByValue: true
  }, sessionId);
  console.log('stream probe:', JSON.stringify(streamProbe.result?.value));

  // ── 2. 渲染「流式中」思考块（展开） ──
  const partial = ANSWER.split('\n').slice(0, 4).join('\n');
  await send('Runtime.evaluate', {
    expression: `messages = [
      { role: 'user', content: '这个界面有什么' },
      { role: 'assistant', reasoning: ${JSON.stringify(THINK)}, content: ${JSON.stringify(partial)}, _live: true }
    ]; lastShot = null; render(); 'ok'`,
    returnByValue: true
  }, sessionId);
  await sleep(400);
  const shot1 = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
  writeFileSync(join(DOCS, 'stream-thinking.png'), Buffer.from(shot1.data, 'base64'));
  console.log('saved stream-thinking.png');

  // ── 3. 渲染「已完成」思考块（折叠） ──
  await send('Runtime.evaluate', {
    expression: `messages = [
      { role: 'user', content: '这个界面有什么' },
      { role: 'assistant', reasoning: ${JSON.stringify(THINK)}, content: ${JSON.stringify(ANSWER)}, _live: false }
    ]; render(); 'ok'`,
    returnByValue: true
  }, sessionId);
  await sleep(400);
  const shot2 = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
  writeFileSync(join(DOCS, 'stream-done.png'), Buffer.from(shot2.data, 'base64'));
  console.log('saved stream-done.png');

  const probe = await send('Runtime.evaluate', {
    expression: `JSON.stringify({
      think: !!document.querySelector('.think'),
      collapsed: document.querySelector('.think')?.classList.contains('collapsed'),
      bodyLen: document.querySelector('.think-body')?.textContent.length || 0,
      answerText: document.querySelector('.bot-md')?.textContent.slice(0, 24) || ''
    })`,
    returnByValue: true
  }, sessionId);
  console.log('render probe:', probe.result?.value);

  // ── 4. 点击标题展开 ──
  await send('Runtime.evaluate', {
    expression: `document.querySelector('.think-head').click(); 'ok'`,
    returnByValue: true
  }, sessionId);
  await sleep(250);
  const probe2 = await send('Runtime.evaluate', {
    expression: `JSON.stringify({ collapsed: document.querySelector('.think')?.classList.contains('collapsed') })`,
    returnByValue: true
  }, sessionId);
  console.log('after toggle:', probe2.result?.value);

  const shot3 = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
  writeFileSync(join(DOCS, 'stream-expanded.png'), Buffer.from(shot3.data, 'base64'));
  console.log('saved stream-expanded.png');
} catch (e) {
  console.error('FAIL', e);
} finally {
  try { ws.close(); } catch {}
  proc.kill();
}
