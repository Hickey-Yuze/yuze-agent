// 思考区真实视觉验证：模拟流式思考→正文，确认摘要/秒数/自动折叠可见
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const EXT = join(HERE, 'extension');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9985;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const userDir = mkdtempSync(join(tmpdir(), 'yz-think-'));
const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${userDir}`,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });

async function waitPort() {
  for (let i = 0; i < 80; i++) {
    try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return await r.json(); } catch {}
    await sleep(150);
  }
  throw new Error('no chrome');
}

const R = {};
try {
  const ver = await waitPort();
  const ws = new WebSocket(ver.webSocketDebuggerUrl);
  let seq = 0; const pending = new Map();
  ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); } });
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  const send = (method, params = {}, sessionId) => { const id = ++seq; return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params, sessionId })); }); };
  const ev = async (expression, sessionId) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId);
    if (r.exceptionDetails) return { err: r.exceptionDetails.text + ' ' + (r.exceptionDetails.exception?.description || '') };
    return r.result.value;
  };

  const loaded = await send('Extensions.loadUnpacked', { path: EXT });
  const spUrl = `chrome-extension://${loaded.id}/sidepanel.html`;
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId);
  await send('Runtime.enable', {}, sessionId);
  await send('Page.navigate', { url: spUrl }, sessionId);
  await sleep(3500);

  // 1) 模拟一条「正在思考」的消息：验证摘要 + 秒数出现
  R.step1_thinking = await ev(`(async () => {
    const chat = document.querySelector('#chat');
    chat.innerHTML = '';
    const live = { role:'assistant', content:'', reasoning:'我先梳理一下这个问题的背景，然后确认需要修改哪些地方，最后给出具体结论。这里补充一些推理细节。', _live:true, _id:'t1' };
    midOf(live); updateLive(live);
    await new Promise(r=>setTimeout(r,1200));
    const n = chat.querySelector('.think');
    return {
      think_exists: !!n,
      brief: n?.querySelector('.t-brief')?.textContent || '(none)',
      elapse_before: n?.querySelector('[data-elapse]')?.textContent || '(none)',
      collapsed_while_thinking: n?.classList.contains('collapsed') || false,
      head_text: n?.querySelector('.think-head')?.innerText?.replace(/\\n/g,' | ') || ''
    };
  })()`, sessionId);

  // 2) 让它跑 3 秒，确认秒数在走动（不是死的）
  R.step2_ticking = await ev(`(async () => {
    await new Promise(r=>setTimeout(r,3000));
    const n = document.querySelector('.think');
    return { elapse_after_3s: n?.querySelector('[data-elapse]')?.textContent || '(none)' };
  })()`, sessionId);

  const shot1 = await send('Page.captureScreenshot', {}, sessionId);
  writeFileSync(join(HERE, 'docs', 'think-1-thinking.png'), Buffer.from(shot1.data, 'base64'));

  // 3) 正文出现 → 应自动折叠 + 秒数定格
  R.step3_autocollapse = await ev(`(async () => {
    const live = { role:'assistant', content:'这是最终回答正文。', reasoning:'我先梳理一下这个问题的背景，然后确认需要修改哪些地方，最后给出具体结论。', _id:'t1' };
    updateLive(live);
    await new Promise(r=>setTimeout(r,400));
    const n = document.querySelector('.think');
    return {
      collapsed_after_content: n?.classList.contains('collapsed') || false,
      elapse_done: n?.querySelector('[data-elapse]')?.textContent || '(none)',
      body_hidden: n ? getComputedStyle(n.querySelector('.think-body')).display : '(no node)',
      content_visible: !!document.querySelector('.bot-md'),
      head_text: n?.querySelector('.think-head')?.innerText?.replace(/\\n/g,' | ') || ''
    };
  })()`, sessionId);

  const shot2 = await send('Page.captureScreenshot', {}, sessionId);
  writeFileSync(join(HERE, 'docs', 'think-2-collapsed.png'), Buffer.from(shot2.data, 'base64'));

  // 4) base64 思考不应污染摘要（0.7.1 回归）
  R.step4_base64 = await ev(`(async () => {
    const b64 = 'eyJhIjoxLCJiIjoyfQ'.repeat(40);
    const out = thinkSummary(b64);
    return { looksEncoded: looksEncoded(b64), summary_is_readable: !looksEncoded(out), summary_len: out.length };
  })()`, sessionId);

} catch (e) {
  R.fatal = String(e && e.stack || e);
} finally {
  try { proc.kill('SIGKILL'); } catch {}
  try { rmSync(userDir, { recursive: true, force: true }); } catch {}
}
console.log(JSON.stringify(R, null, 2));
