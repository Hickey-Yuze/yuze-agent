import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
const HERE = dirname(fileURLToPath(import.meta.url));
const EXT = join(HERE, 'extension');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9921;
const userDir = mkdtempSync(join(tmpdir(), 'ca-qb-'));
const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${userDir}`,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--window-size=980,1300', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitPort() { for (let i = 0; i < 80; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return await r.json(); } catch {} await sleep(150); } throw new Error('no chrome'); }
const ver = await waitPort();
const ws = new WebSocket(ver.webSocketDebuggerUrl);
let seq = 0; const pending = new Map();
ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); } });
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
function send(method, params = {}, sessionId) { const id = ++seq; return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params, sessionId })); }); }
try {
  const loaded = await send('Extensions.loadUnpacked', { path: EXT });
  const { targetId } = await send('Target.createTarget', { url: `chrome-extension://${loaded.id}/sidepanel.html` });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId);
  await send('Runtime.enable', {}, sessionId);
  await sleep(1300);
  const r = await send('Runtime.evaluate', {
    expression: `(async () => {
      try {
        const wrap = document.getElementById('quoteWrap');
        const inInner = !!wrap?.closest('.composer-inner');
        window.addQuote('Hickey-Yuze/yuze-agent: 浏览器侧边栏 AI agent', '【引用标签页】这是仓库 README 的摘要内容，用于验证详情预览面板的效果。'.repeat(3), { kind: 'tab', url: 'https://github.com/Hickey-Yuze/yuze-agent' });
        window.addQuote('抓取商品价格任务', '【引用标签页】第二条引用内容', { kind: 'tab', url: 'https://jd.com/item/123' });
        await new Promise(r => setTimeout(r, 100));
        const main = !!document.querySelector('#quoteBar .qc-main');
        const tx = document.querySelector('#quoteBar .qc-tx')?.textContent;
        const url = document.querySelector('#quoteBar .qc-url')?.textContent;
        const link = !!document.querySelector('#quoteBar .qc-link');
        const more = document.querySelector('#quoteBar .qc-more')?.textContent;
        const sw = !!document.querySelector('#quoteWrap > .quote-switch');
        document.querySelector('#quoteBar .qc-tx')?.click();
        await new Promise(r => setTimeout(r, 60));
        const popOpen = !document.getElementById('quotePop')?.classList.contains('hidden');
        const popB = document.querySelector('#quotePop > b')?.textContent?.slice(0, 20);
        document.body.click();
        await new Promise(r => setTimeout(r, 60));
        const popClosed = document.getElementById('quotePop')?.classList.contains('hidden');
        document.querySelector('#quoteBar .qc-x')?.click();
        await new Promise(r => setTimeout(r, 60));
        const toastShown = !document.getElementById('quoteToast')?.classList.contains('hidden');
        const countAfterRemove = document.querySelectorAll('#quoteBar .qc-main').length + (document.querySelector('#quoteBar .qc-more') ? 1 : 0);
        document.getElementById('qtUndo')?.click();
        await new Promise(r => setTimeout(r, 60));
        const countAfterUndo = document.querySelectorAll('#quoteBar .qc-main').length + (document.querySelector('#quoteBar .qc-more') ? 1 : 0);
        window.quoteAuto = false;
        window.renderQuoteBar();
        await new Promise(r => setTimeout(r, 60));
        const disabled = document.getElementById('quoteWrap')?.classList.contains('q-disabled');
        const offTag = document.querySelector('#quoteBar .qc-off')?.textContent;
        window.quoteAuto = true;
        window.renderQuoteBar();
        await new Promise(r => setTimeout(r, 60));
        return JSON.stringify({ inInner, main, tx: tx && tx.slice(0, 20), url, link, more, sw, popOpen, popB, popClosed, toastShown, countAfterRemove, countAfterUndo, disabled, offTag });      } catch (e) { return 'ERR: ' + ((e && e.message) || e); }
    })()`,
    awaitPromise: true, returnByValue: true,
  }, sessionId);
  console.log('QUOTEBAR:', r.result.value);
  const shot = await send('Page.captureScreenshot', { format: 'png' }, sessionId).catch(() => null);
  if (shot) (await import('node:fs')).writeFileSync(join(HERE, 'docs', 'panel-quotebar.png'), Buffer.from(shot.data, 'base64'));
} finally { try { ws.close(); } catch (_) {} proc.kill('SIGKILL'); }
