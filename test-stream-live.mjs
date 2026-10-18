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
const PORT = 9346;
const KEY = process.env.CA_KEY || '';
if (!KEY) { console.error('缺少 CA_KEY'); process.exit(1); }

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

  await send('Runtime.evaluate', {
    expression: `chrome.storage.local.set({apiKey:${JSON.stringify(KEY)}, model:'cn:deepseek-v4.1-flash', baseUrl:'http://127.0.0.1:7863/v1'}).then(()=> 'ok')`,
    awaitPromise: true, returnByValue: true
  }, sessionId);

  await send('Runtime.evaluate', {
    expression: `messages = []; lastShot = null; render(); runAgent('用一句话说明地球是圆的'); 'started'`,
    returnByValue: true
  }, sessionId);

  const trace = [];
  for (let i = 0; i < 60; i++) {
    await sleep(250);
    const r = await send('Runtime.evaluate', {
      expression: `JSON.stringify({
        running,
        n: messages.length,
        last: messages.length ? { c: (messages[messages.length-1].content||'').length, r: (messages[messages.length-1].reasoning||'').length, live: !!messages[messages.length-1]._live } : null,
        think: !!document.querySelector('.think'),
        tag: (() => { const m = document.querySelector('.msg-bot'); if (!m) return null; if (!m.__tag) m.__tag = 'N' + Math.random().toString(36).slice(2, 6); return m.__tag; })(),
        thinkCollapsed: document.querySelector('.think')?.classList.contains('collapsed') ?? null,
        thinkLen: document.querySelector('.think-body')?.textContent.length || 0,
        answerLen: document.querySelector('.bot-md')?.textContent.length || 0
      })`,
      returnByValue: true
    }, sessionId);
    const j = JSON.parse(r.result.value);
    trace.push(j);
    console.log(String(i).padStart(2), 'run=' + (j.running ? 1 : 0), 'live=' + (j.last?.live ? 1 : 0), 'reason=' + (j.last?.r ?? 0), 'content=' + (j.last?.c ?? 0), 'think=' + j.thinkLen, 'tag=' + j.tag, 'answer=' + j.answerLen, 'collapsed=' + j.thinkCollapsed);
    if (!j.running && i > 3) break;
  }
  writeFileSync(join(DOCS, 'stream-trace.json'), JSON.stringify(trace, null, 2));

  const shot = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
  writeFileSync(join(DOCS, 'stream-live.png'), Buffer.from(shot.data, 'base64'));
  console.log('saved stream-live.png');
} catch (e) {
  console.error('FAIL', e);
} finally {
  try { ws.close(); } catch {}
  proc.kill();
}
