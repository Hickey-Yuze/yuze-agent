/**
 * 设置页「本地 Harness」块视觉核对 + 截图
 * node test-shot-bridge.mjs → out/shot-bridge.png
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const EXT = join(HERE, 'extension');
const OUT = join(HERE, 'out');
mkdirSync(OUT, { recursive: true });
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9693;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const userDir = mkdtempSync(join(tmpdir(), 'yz-shot-'));
const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${userDir}`,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--window-size=420,760', 'about:blank'], { stdio: 'ignore' });

let ws;
try {
  let ver;
  for (let i = 0; i < 100; i++) {
    try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) { ver = await r.json(); break; } } catch {}
    await sleep(150);
  }
  ws = new WebSocket(ver.webSocketDebuggerUrl);
  let id = 0; const pending = new Map();
  ws.addEventListener('message', (m2) => {
    const m = JSON.parse(m2.data);
    if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); }
  });
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  const send = (method, params = {}, sessionId) => { const mid = ++id; return new Promise((res, rej) => { pending.set(mid, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id: mid, method, params, sessionId })); }); };
  const ev = async (expr, sessionId) => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true, userGesture: true }, sessionId);
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 300));
    return r.result.value;
  };

  const loaded = await send('Extensions.loadUnpacked', { path: EXT });
  const { targetId } = await send('Target.createTarget', { url: `chrome-extension://${loaded.id}/sidepanel.html` });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId);
  await send('Emulation.setDeviceMetricsOverride', { width: 420, height: 760, deviceScaleFactor: 2, mobile: false }, sessionId);
  for (let i = 0; i < 80; i++) { if ((await ev(`document.readyState`, sessionId)) === 'complete') break; await sleep(120); }
  await sleep(400);

  await ev(`(async () => {
    await chrome.storage.local.set({ bridgeEnabled: true, bridgeUrl: 'http://127.0.0.1:43120', bridgeToken: 'demo' });
    await loadBridgeSettings();
    document.getElementById('settings').classList.remove('hidden');
    const sel = document.getElementById('selBridgeSession');
    for (const [v, t] of [['', '（新会话）'], ['s1', '浏览器侧栏']]) {
      const o = document.createElement('option'); o.value = v; o.textContent = t; sel.appendChild(o);
    }
    sel.value = 's1';
    document.getElementById('chkBridge').checked = true;
    document.getElementById('bridgeBox').classList.remove('hidden');
    setBridgeHint('Harness 已连接，5 个会话');
    const sc = document.querySelector('#settings .set-scroll') || document.querySelector('#settings .set-card') || document.getElementById('settings');
    sc.scrollTop = sc.scrollHeight;
    return 1;
  })()`, sessionId);
  await sleep(400);
  const geo = await ev(`(() => {
    const r = (id) => { const el = document.getElementById(id); if (!el) return null; const b = el.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; };
    const box = document.getElementById('bridgeBox');
    const sc = document.querySelector('#settings .set-card');
    return {
      settingsVisible: !document.getElementById('settings').classList.contains('hidden'),
      chk: r('chkBridge'), url: r('inpBridgeUrl'), token: r('inpBridgeToken'),
      sel: r('selBridgeSession'), refresh: r('btnBridgeRefresh'), test: r('btnBridgeTest'),
      box: r('bridgeBox'), hint: r('bridgeHint'),
      cardScroll: sc ? { sh: sc.scrollHeight, ch: sc.clientHeight, scrollable: sc.scrollHeight > sc.clientHeight } : null,
      overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      hintText: (document.getElementById('bridgeHint') || {}).textContent
    };
  })()`, sessionId);
  console.log(JSON.stringify(geo, null, 2));
  const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, sessionId);
  writeFileSync(join(OUT, 'shot-bridge.png'), Buffer.from(data, 'base64'));
  console.log('saved', join(OUT, 'shot-bridge.png'));
} finally {
  try { ws && ws.close(); } catch {}
  try { proc.kill('SIGKILL'); } catch {}
}
