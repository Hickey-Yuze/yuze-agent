/**
 * HTML → PDF：用本机 Chrome 的排版引擎（Page.printToPDF）
 *
 * 相比 pdf-lib 手写坐标，这条路径能拿到：
 * 中文标点挤压、断行、表格跨页重复表头、页脚页码、页边距、字体回退。
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROFILE = process.env.FILEGEN_CHROME_PROFILE || join(HERE, '.tmp', 'chrome');
mkdirSync(PROFILE, { recursive: true });

const CHROME_CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
];

const CHROME = CHROME_CANDIDATES.find((p) => existsSync(p));

let chromeProc = null;
let chromePort = 0;
let starting = null;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* 空闲 5 分钟自动关掉 headless Chrome，别一直占内存 */
const IDLE_MS = 5 * 60 * 1000;
let idleTimer = null;
function touchIdle() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    closeChrome();
    console.log('[chrome-pdf] 空闲回收，headless Chrome 已退出');
  }, IDLE_MS);
  idleTimer.unref?.();
}

async function startChrome() {
  if (chromeProc && chromePort) return chromePort;
  if (starting) return starting;

  starting = (async () => {
    if (!CHROME) throw new Error('没有找到 Chrome，无法使用 HTML 排版');

    const proc = spawn(CHROME, [
      '--headless=new',
      '--remote-debugging-port=0',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-gpu',
      '--disable-extensions',
      '--hide-scrollbars',
      '--font-render-hinting=none',
      '--user-data-dir=' + PROFILE,
      'about:blank'
    ], { stdio: ['ignore', 'ignore', 'pipe'] });

    chromeProc = proc;

    const port = await new Promise((resolve, reject) => {
      let buf = '';
      const timer = setTimeout(() => reject(new Error('Chrome 启动超时')), 15000);
      proc.stderr.on('data', (d) => {
        buf += String(d);
        const m = buf.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)\//);
        if (m) { clearTimeout(timer); resolve(Number(m[1])); }
      });
      proc.on('exit', (code) => { clearTimeout(timer); reject(new Error('Chrome 退出：' + code)); });
    });

    chromePort = port;
    process.on('exit', () => { try { proc.kill('SIGKILL'); } catch {} });
    return port;
  })();

  try {
    return await starting;
  } finally {
    starting = null;
  }
}

/* 极简 CDP 客户端 */
function openWs(url) {
  const ws = new WebSocket(url);
  let seq = 0;
  const pending = new Map();

  const ready = new Promise((res, rej) => {
    ws.addEventListener('open', res, { once: true });
    ws.addEventListener('error', () => rej(new Error('WebSocket 连接失败')), { once: true });
  });

  ws.addEventListener('message', (ev) => {
    let msg;
    try { msg = JSON.parse(ev.data); } catch { return; }
    if (msg.id && pending.has(msg.id)) {
      const p = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? p.reject(new Error(msg.error.message || 'CDP 错误')) : p.resolve(msg.result);
    }
  });

  const send = (method, params = {}) => {
    const id = ++seq;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  };

  return { ws, ready, send };
}

/* ── HTML 模板 ───────────────────────────────────────── */

const esc = (s) =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function buildHtml({ title, sections }) {
  const body = [];

  for (const sec of sections || []) {
    if (sec.heading) body.push(`<h2>${esc(sec.heading)}</h2>`);

    if (sec.body) {
      for (const para of String(sec.body).split(/\n{2,}/)) {
        const parts = para.split('\n').filter((x) => x.trim());
        if (!parts.length) continue;
        body.push(`<p>${parts.map(esc).join('<br>')}</p>`);
      }
    }

    if (Array.isArray(sec.bullets) && sec.bullets.length) {
      body.push('<ul>' + sec.bullets.map((b) => `<li>${esc(b)}</li>`).join('') + '</ul>');
    }

    if (sec.table && Array.isArray(sec.table.rows) && sec.table.rows.length) {
      const cols = sec.table.columns || Object.keys(sec.table.rows[0]);
      const head = '<thead><tr>' + cols.map((c) => `<th>${esc(c)}</th>`).join('') + '</tr></thead>';
      const rows = sec.table.rows
        .map((r) => {
          const cells = Array.isArray(r) ? r : cols.map((c) => r[c]);
          return '<tr>' + cells.map((v) => `<td>${esc(v)}</td>`).join('') + '</tr>';
        })
        .join('');
      body.push(`<table>${head}<tbody>${rows}</tbody></table>`);
    }
  }

  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<style>
  @page { size: A4; margin: 17mm 16mm 19mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
    font-size: 10.5pt; line-height: 1.78; color: #1b1c20;
    -webkit-font-smoothing: antialiased;
  }
  h1 {
    font-size: 21pt; font-weight: 700; letter-spacing: .3px;
    margin: 0 0 7mm; padding-bottom: 3mm;
    border-bottom: 2px solid #1f3a5f; color: #16233a;
  }
  h2 {
    font-size: 13pt; font-weight: 600; color: #1f3a5f;
    margin: 7mm 0 2.5mm; padding-left: 3mm;
    border-left: 3px solid #2f6fd0;
    page-break-after: avoid;
  }
  p { margin: 0 0 2.6mm; text-align: justify; }
  ul { margin: 0 0 3mm; padding-left: 5.5mm; }
  li { margin: 0 0 1.2mm; }
  li::marker { color: #6b7c96; }
  table {
    width: 100%; border-collapse: collapse;
    margin: 3mm 0 4mm; font-size: 9.5pt;
    page-break-inside: auto;
  }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  th, td {
    border: 1px solid #d9dfe8; padding: 2mm 2.4mm;
    text-align: left; vertical-align: top;
  }
  th { background: #eef2f9; font-weight: 600; color: #1f3a5f; }
  tbody tr:nth-child(even) td { background: #fafbfd; }
</style></head><body>
<h1>${esc(title)}</h1>
${body.join('\n')}
</body></html>`;
}

/* ── 渲染 ─────────────────────────────────────────────── */

export async function renderPdf({ title, sections }) {
  const port = await startChrome();
  touchIdle();
  const html = buildHtml({ title, sections });

  const created = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' });
  if (!created.ok) throw new Error('建页失败：' + created.status);
  const target = await created.json();

  const { ws, ready, send } = openWs(target.webSocketDebuggerUrl);
  try {
    await ready;
    await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 794, height: 1123, deviceScaleFactor: 1, mobile: false
    });

    const { frameTree } = await send('Page.getFrameTree');
    const frameId = frameTree.frame.id;

    await send('Page.setDocumentContent', { frameId, html });

    // 等字体就绪（中文首屏最怕字体没落就打印）
    for (let i = 0; i < 40; i++) {
      const r = await send('Runtime.evaluate', {
        expression: 'document.fonts ? document.fonts.status : "loaded"',
        returnByValue: true
      });
      if (r.result?.value === 'loaded') break;
      await sleep(120);
    }
    await sleep(220);

    const { data } = await send('Page.printToPDF', {
      printBackground: true,
      format: 'A4',
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate:
        '<div style="width:100%;font-size:8.5px;color:#8a8f99;text-align:center;'
        + 'font-family:PingFang SC,sans-serif;">'
        + '<span class="pageNumber"></span> / <span class="totalPages"></span></div>',
      marginTop: 0.67,
      marginBottom: 0.75,
      marginLeft: 0.63,
      marginRight: 0.63
    });

    return Buffer.from(data, 'base64');
  } finally {
    try { ws.close(); } catch {}
    try { await fetch(`http://127.0.0.1:${port}/json/close/${target.id}`); } catch {}
    touchIdle();
  }
}

export function closeChrome() {
  clearTimeout(idleTimer);
  try { chromeProc?.kill('SIGKILL'); } catch {}
  chromeProc = null;
  chromePort = 0;
}
