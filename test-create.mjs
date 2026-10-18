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
      messages = [{ role: 'user', content: '测试' }];
      render();
      openSkillPanel();
      document.getElementById('btnSkillNew').click();
      const m = document.getElementById('skillTypeModal');
      return JSON.stringify({
        modal: !m.classList.contains('hidden'),
        types: [...m.querySelectorAll('.sm-type')].map(b => b.dataset.type + ':' + b.querySelector('b').textContent)
      });
    } catch (e) { return 'ERR: ' + e.message; } })()`,
    returnByValue: true
  }, sessionId);
  console.log('step1:', r1.result?.value);
  const shot0 = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
  writeFileSync(join(DOCS, 'panel-skill-types.png'), Buffer.from(shot0.data, 'base64'));

  const r2 = await send('Runtime.evaluate', {
    expression: `(() => { try {
      document.querySelector('#skillTypeModal .sm-type[data-type="prompt"]').click();
      const vis = [...document.querySelectorAll('#skillEdit .se-group')]
        .filter(g => !g.hidden).map(g => g.dataset.for);
      return JSON.stringify({
        editor: !document.getElementById('skillEdit').classList.contains('hidden'),
        meta: document.getElementById('seMeta').textContent,
        visibleGroups: vis
      });
    } catch (e) { return 'ERR: ' + e.message; } })()`,
    returnByValue: true
  }, sessionId);
  console.log('step2:', r2.result?.value);

  const shot1 = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
  writeFileSync(join(DOCS, 'panel-skill-create.png'), Buffer.from(shot1.data, 'base64'));

  const r3 = await send('Runtime.evaluate', {
    expression: `(async () => { try {
      const n = document.querySelectorAll('#skillEdit .se-group').length;
      document.getElementById('seName').value = '竞品对比表';
      document.getElementById('sePrompt').value = '把当前页面提到的竞品做成对比表，标出数据来源与缺口。';
      await saveCustomSkill();
      return JSON.stringify({
        saved: customSkills.length,
        last: customSkills[customSkills.length-1] && {
          name: customSkills[customSkills.length-1].name,
          cat: customSkills[customSkills.length-1].cat,
          src: customSkills[customSkills.length-1].src
        },
        editorHidden: document.getElementById('skillEdit').classList.contains('hidden'),
        panelOpen: !document.getElementById('skillPanel').classList.contains('hidden'),
        customCount: [...document.querySelectorAll('.sk-src')].map(b => b.dataset.src + '=' + b.querySelector('em')?.textContent)
      });
    } catch (e) { return 'ERR: ' + e.message; } })()`,
    awaitPromise: true, returnByValue: true
  }, sessionId);
  console.log('step3:', r3.result?.value);

  const shot2 = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
  writeFileSync(join(DOCS, 'panel-skill-saved.png'), Buffer.from(shot2.data, 'base64'));
  console.log('saved shots');
} catch (e) {
  console.error('FAILED:', e.message);
  process.exitCode = 1;
} finally {
  ws.close(); proc.kill('SIGKILL');
}
