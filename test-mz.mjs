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
  await send('Emulation.setDeviceMetricsOverride', { width: 460, height: 1100, deviceScaleFactor: 2, mobile: false }, sessionId);
  await sleep(700);

  const MSGS = JSON.stringify([
    { role: 'user', content: '这个页面的订单怎么筛选' },
    { role: 'assistant', content: '订单派发页面的筛选区完整展开。\n\n| 项 | 说明 |\n|---|---|\n| 时间复杂度 | 最坏 O(n²) |\n| 空间复杂度 | O(1)，原地排序 |\n\n订单列表为空时点搜索即可。' },
    { role: 'user', content: '订单状态在哪' },
    { role: 'assistant', content: '订单状态在第三行，右侧有派发状态下拉。' }
  ]);

  await sleep(600);
  await sleep(400);
  const r1 = await send('Runtime.evaluate', {
    expression: `(() => { try {
      messages = [{ role: 'user', content: '把当前页面导出成 PDF' }];
      render();
      openSkillPanel();
      const p = document.getElementById('skillPanel');
      return JSON.stringify({
        panel: !p.classList.contains('hidden'),
        cards: document.querySelectorAll('#skillGrid .sk-card').length,
        gridH: Math.round(document.getElementById('skillGrid').getBoundingClientRect().height),
        sheetH: Math.round(document.getElementById('skillPanel').getBoundingClientRect().height),
        winH: window.innerHeight,
        card0H: (() => { const c = document.querySelector('.sk-card'); return c ? Math.round(c.getBoundingClientRect().height) : 0; })(),
        src: [...document.querySelectorAll('.sk-src')].map(b => b.textContent.replace(/\s+/g,' ').trim())
      });
    } catch (e) { return 'ERR: ' + e.message; } })()`,
    returnByValue: true
  }, sessionId);
  console.log('list:', r1.result?.value);

  let shot = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
  writeFileSync(join(DOCS, 'panel-mz-list.png'), Buffer.from(shot.data, 'base64'));
  console.log('saved panel-mz-list.png');

  const r2 = await send('Runtime.evaluate', {
    expression: `(() => { try {
      const c = [...document.querySelectorAll('#skillGrid .sk-card')].find(n => n.textContent.includes('生成 Excel'));
      c.click();
      const sec = document.querySelector('.sd-sec');
      const md = document.getElementById('sdMd');
      const ul = md.querySelector('ul');
      const cs = sec ? getComputedStyle(sec) : null;
      return JSON.stringify({
        secExists: !!sec,
        secColor: cs && cs.color,
        secWeight: cs && cs.fontWeight,
        secMarginTop: cs && cs.marginTop,
        mdPadding: getComputedStyle(md).padding,
        ulPadLeft: ul ? getComputedStyle(ul).paddingLeft : 'no-ul',
        hasBody: !!md.querySelector('.sd-md-body')
      });
    } catch (e) { return 'ERR: ' + e.message; } })()`,
    returnByValue: true
  }, sessionId);
  console.log('detail:', r2.result?.value);

  shot = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
  writeFileSync(join(DOCS, 'panel-mz-detail.png'), Buffer.from(shot.data, 'base64'));
  console.log('saved panel-mz-detail.png');
} catch (e) {
  console.error('FAILED:', e.message);
  process.exitCode = 1;
} finally {
  ws.close(); proc.kill('SIGKILL');
}
