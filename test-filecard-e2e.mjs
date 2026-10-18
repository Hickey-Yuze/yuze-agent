/**
 * 文件产物卡片验证：真实生成 PDF → 扩展下载 → 卡片渲染 → ⋯ 菜单
 * 用法：先 node server/server.mjs；再 node test-filecard.mjs
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
const PORT = 9337;

mkdirSync(DOCS, { recursive: true });
const userDir = mkdtempSync(join(tmpdir(), 'ca-file-'));

/* 先从 filegen 拿一份真实 PDF */
async function genPdf() {
  const r = await fetch('http://127.0.0.1:8950/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', id: 1, method: 'tools/call',
      params: {
        name: 'gen_pdf',
        arguments: {
          filename: '三季度复盘',
          title: '三季度经营复盘',
          sections: [
            { heading: '结论', body: '整体达成率 92%，高于目标 2 个百分点。', bullets: ['华东区超额完成', '华南区缺口 8%'] },
            { heading: '数据', table: { columns: ['区域', '达成率'], rows: [['华东', '108%'], ['华南', '92%']] } }
          ]
        }
      }
    })
  });
  const j = await r.json();
  const line = j.result.content.map((c) => c.text).find((t) => t.startsWith('FILE_JSON:'));
  return JSON.parse(line.slice(10));
}

const pdf = await genPdf();
console.log('gen:', pdf.name, pdf.size, 'B');

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

  const inject = `(async () => {
    mcpServers = [{ name: 'filegen', url: 'http://127.0.0.1:8950/mcp', headers: [] }];
    await loadMcp();
    const names = mcpTools.map(t => t.function.name);
    const out = await runTool('mcp_gen_pdf', {
      filename: '三季度复盘',
      title: '三季度经营复盘',
      sections: [
        { heading: '结论', body: '整体达成率 92%。', bullets: ['华东超额', '华南缺口 8%'] },
        { heading: '数据', table: { columns: ['区域','达成率'], rows: [['华东','108%'],['华南','92%']] } }
      ]
    });
    return JSON.stringify({
      toolNames: names,
      result: out,
      cards: document.querySelectorAll('.filecard').length,
      name: document.querySelector('.fname')?.textContent,
      size: document.querySelector('.fsize')?.textContent
    });
  })()`;

  const r1 = await send('Runtime.evaluate', {
    expression: inject, awaitPromise: true, returnByValue: true
  }, sessionId);
  console.log('inject:', r1.result?.value || r1.result?.description);

  await sleep(800);
  let shot = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
  writeFileSync(join(DOCS, 'e2e-card.png'), Buffer.from(shot.data, 'base64'));
  console.log('saved e2e-card.png');

  // ⋯ 菜单
  await send('Runtime.evaluate', {
    expression: `document.querySelector('.fmore').click(); 'ok'`, returnByValue: true
  }, sessionId);
  await sleep(400);
  const r2 = await send('Runtime.evaluate', {
    expression: `JSON.stringify({ items: [...document.querySelectorAll('.pop.fpop .pop-item')].map(n => n.textContent) })`,
    returnByValue: true
  }, sessionId);
  console.log('menu:', r2.result?.value);

  shot = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
  writeFileSync(join(DOCS, 'e2e-menu.png'), Buffer.from(shot.data, 'base64'));
  console.log('saved e2e-menu.png');
} catch (e) {
  console.error('FAILED:', e.message);
  process.exitCode = 1;
} finally {
  ws.close();
  proc.kill('SIGKILL');
}
