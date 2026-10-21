// v0.7.11 三项回归：
// 1) 任意类型文件 → 必须有可下载卡片，且绝不自动下载（pending=true + 无 chrome.downloads 调用）
// 2) 截图可自定义：点截图出三选菜单（可见区域/整页/框选），各分支走对应 capture 参数
// 3) 两个「发现技炉」按钮已删除，且无残留引用
// 真实 headless 加载扩展，页面内真实 DOM + 真实 IndexedDB
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const EXT = join(HERE, 'extension');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9681;
const userDir = mkdtempSync(join(tmpdir(), 'yz-v11-'));
const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${userDir}`,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--window-size=420,1100', 'about:blank'], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitPort() {
  for (let i = 0; i < 80; i++) {
    try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return await r.json(); } catch {}
    await sleep(150);
  }
  throw new Error('Chrome 未就绪');
}

const out = {};
let ws;
try {
  const ver = await waitPort();
  ws = new WebSocket(ver.webSocketDebuggerUrl);
  let seq = 0; const pending = new Map();
  ws.addEventListener('message', (m2) => {
    const m = JSON.parse(m2.data);
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
  const ev = async (expression, sessionId) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId);
    if (r.exceptionDetails) return { err: String((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text || 'exc').slice(0, 500) };
    return r.result && r.result.value;
  };

  const loaded = await send('Extensions.loadUnpacked', { path: EXT });
  const { targetId } = await send('Target.createTarget', { url: `chrome-extension://${loaded.id}/sidepanel.html` });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  for (let i = 0; i < 100; i++) {
    const s = await ev(`document.readyState + '|' + (typeof addFileCard)`, sessionId);
    if (s === 'complete|function') break;
    await sleep(120);
  }
  await sleep(400);
  out.A_ready = await ev(`({ ready: document.readyState, ver: (chrome.runtime.getManifest() || {}).version })`, sessionId);

  // ═══ 项 3：两个「发现技炉」按钮已删除 ═══
  out.B_noDiscover = await ev(`(() => {
    const ids = ['btnSkillDiscover', 'btnSkillDiscoverTop'];
    const present = ids.filter((id) => document.getElementById(id));
    const html = document.documentElement.innerHTML;
    // 页面上任何可见文案里都不该再出现「发现技炉」
    const visible = Array.from(document.querySelectorAll('button'))
      .map((b) => (b.textContent || '').trim())
      .filter((t) => t.includes('发现技炉'));
    return { present, visibleCount: visible.length, visible, srcHasId: html.includes('btnSkillDiscover') };
  })()`, sessionId);

  // ═══ 项 1：任意类型文件 → 有卡片 + 不自动下载 ═══
  // 打桩 chrome.downloads.download，抓住是否被调用（自动下载的铁证）
  out.C_fileCard = await ev(`(async () => {
    const calls = [];
    const origDl = chrome.downloads && chrome.downloads.download;
    chrome.downloads.download = (...a) => { calls.push(a[0] && a[0].filename); return Promise.resolve(1); };
    // 覆盖四种典型类型，全部走 addFileCard
    const types = [
      { name: '报表.xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', size: 12345 },
      { name: '报告.pdf',  mime: 'application/pdf', size: 23456 },
      { name: '演示.pptx', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', size: 34567 },
      { name: '文稿.docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 45678 },
      { name: '脚本.js',   mime: 'text/javascript', size: 789 }
    ];
    messages.length = 0;
    for (const t of types) {
      await addFileCard(Object.assign({ b64: btoa('X'.repeat(64)) }, t));
    }
    await sleep(120);
    const fileMsgs = messages.filter((m) => m.role === 'file');
    const cardWrap = document.querySelector('.filegroup');
    const exp = cardWrap && cardWrap.querySelector('.fg-expand');
    if (exp) exp.click();                       // 展开分页，让每个文件都真的有卡片
    await sleep(150);
    const cards = document.querySelectorAll('.filegroup .fg-item');
    const dlBtns = document.querySelectorAll('.filegroup .fg-dl');
    const res = {
      pushed: fileMsgs.length,
      allPending: fileMsgs.every((m) => m.file && m.file.pending === true),
      names: fileMsgs.map((m) => m.file.name).join(','),
      cards: cards.length,
      everyFileHasCard: cards.length === fileMsgs.length,
      everyCardHasDlBtn: dlBtns.length === cards.length,
      dlBtns: dlBtns.length,
      autoDownloadCalls: calls.length,          // 关键：必须为 0
      cached: types.every((t) => fileCache.has('name:' + t.name)),
      subText: Array.from(document.querySelectorAll('.fg-sub')).map((e) => e.textContent.trim())[0] || null
    };
    chrome.downloads.download = origDl;
    return res;
  })()`, sessionId);

  // 点卡片右侧按钮 → 才真正落盘（打桩验证调用发生）
  out.D_clickDl = await ev(`(async () => {
    const calls = [];
    const origDl = chrome.downloads && chrome.downloads.download;
    chrome.downloads.download = (...a) => { calls.push(a[0] && a[0].filename); return Promise.resolve(1); };
    const btn = document.querySelector('.filegroup .fg-dl');
    if (!btn) return { err: '找不到下载按钮' };
    btn.click();
    await sleep(200);
    const r = { clicked: true, calls: calls.slice(0, 2), count: calls.length };
    chrome.downloads.download = origDl;
    return r;
  })()`, sessionId);

  // save_js 返回文案不再声称「已下载」
  out.E_saveJsWording = await ev(`(async () => {
    const s = await toolSaveJs({ filename: 't.js', code: 'console.log(1)' });
    return { text: String(s), claimsDownload: /已(生成并)?下载|已开始下载/.test(String(s)) };
  })()`, sessionId);

  // ═══ 项 2：截图自定义 ═══
  out.F_shotMenu = await ev(`(() => {
    const m = document.getElementById('shotModal');
    if (!m) return { err: 'shotModal 不存在' };
    const before = m.classList.contains('hidden');
    document.getElementById('btnShot').click();
    const after = m.classList.contains('hidden');
    const opts = Array.from(m.querySelectorAll('.sm-type')).map((b) => ({
      mode: b.dataset.shot, title: (b.querySelector('b') || {}).textContent
    }));
    return { hiddenBefore: before, opened: !after, opts };
  })()`, sessionId);

  // 三个分支各自走的 capture 参数（打桩 cdp 抓参数）
  out.G_shotModes = await ev(`(async () => {
    const orig = window.cdp;
    const seen = [];
    window.cdp = async (method, params) => {
      seen.push({ method, params });
      if (method === 'Page.captureScreenshot') return { data: 'AAA' };
      if (method === 'Page.getLayoutMetrics') return { contentSize: { width: 1280, height: 2400 } };
      return {};
    };
    // 关闭菜单
    document.getElementById('shotModal').classList.add('hidden');
    const r = {};
    const mk = (tag, url) => ({ tag, isJpeg: String(url || '').indexOf('data:image/jpeg;base64,') === 0 });
    const uv = await shotView();  r.view = mk('view', uv);
    const sv = seen.filter(s => s.method === 'Page.captureScreenshot').slice(-1)[0].params;
    r.view.clip = sv.clip || null;
    const uf = await shotFull();  r.full = mk('full', uf);
    const sf = seen.filter(s => s.method === 'Page.captureScreenshot').slice(-1)[0].params;
    r.full.metrics = seen.some(s => s.method === 'Page.getLayoutMetrics');
    r.full.beyond = sf.captureBeyondViewport;
    const ua = await shotArea({ x: 10, y: 20, width: 300, height: 200 });
    const sa = seen.filter(s => s.method === 'Page.captureScreenshot').slice(-1)[0].params;
    r.area = mk('area', ua);
    r.area.clip = sa.clip;
    window.cdp = orig;
    return r;
  })()`, sessionId);

  // 弹窗点「可见区域」→ 关菜单 + 引用入框
  out.H_clickView = await ev(`(async () => {
    const orig = window.cdp;
    window.cdp = async (method) => {
      if (method === 'Page.captureScreenshot') return { data: 'BBB' };
      return {};
    };
    pendingShot = null; quoteRefs.length = 0; renderQuoteBar();
    document.getElementById('shotModal').classList.remove('hidden');
    const b = document.querySelector('#shotModal .sm-type[data-shot="view"]');
    b.click();
    await sleep(300);
    const r = {
      menuClosed: document.getElementById('shotModal').classList.contains('hidden'),
      pendingShot: !!pendingShot,
      chipShown: !!document.querySelector('.quote-chip')
    };
    window.cdp = orig;
    return r;
  })()`, sessionId);

  // 框选：模拟太小的拖拽 → 应取消，不产生截图
  out.I_areaCancel = await ev(`(async () => {
    pendingShot = null;
    // 打桩选区返回 null（等同用户 Esc 或框太小）
    const origPick = window.pickAreaOnPage;
    window.pickAreaOnPage = async () => null;
    await doShot('area');
    await sleep(150);
    const r = { cancelled: !pendingShot };
    window.pickAreaOnPage = origPick;
    return r;
  })()`, sessionId);

  out.J_version = await ev(`(() => {
    const v = (chrome.runtime.getManifest() || {}).version;
    const p = String(v).split('.').map(Number);
    return { v, gte711: p[0] > 0 || (p[0] === 0 && (p[1] > 7 || (p[1] === 7 && p[2] >= 11))) };
  })()`, sessionId);
} catch (e) {
  out.ERR = String(e && e.stack || e).slice(0, 900);
} finally {
  try { ws && ws.close(); } catch {}
  try { proc.kill('SIGKILL'); } catch {}
  try { rmSync(userDir, { recursive: true, force: true }); } catch {}
  await sleep(300);
}

console.log(JSON.stringify(out, null, 2));
process.exit(0);
