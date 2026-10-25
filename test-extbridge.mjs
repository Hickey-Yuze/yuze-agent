/**
 * 本地 Harness 桥回归（扩展侧）：mock /ext-bridge 服务 + 真加载扩展 + 真发消息
 * 覆盖：ping/会话列表 → 发送 → 流式增量 → 工具标签 → turn/end 收尾 → 停止走 /cancel
 * 用法：node test-extbridge.mjs
 */
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const EXT = join(HERE, 'extension');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const CDP_PORT = 9691;
const MOCK_PORT = 9788;
const TOKEN = 'test-token-123';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = {};
let fail = 0;
function ok(name, cond, extra) {
  out[name] = cond ? 'PASS' : { FAIL: extra === undefined ? true : extra };
  if (!cond) fail++;
}

/* ───────── mock /ext-bridge ───────── */
let seq = 0;
const log = { cancels: 0, prompts: 0, sseHits: 0, sseClients: new Set() };
function emit(type, data, sessionId = 'sess-1') {
  const ev = { id: 'e' + (++seq), type, seq, sessionId, timestamp: new Date().toISOString(), data };
  const line = 'data: ' + JSON.stringify(ev) + '\n\n';
  for (const res of log.sseClients) res.write(line);
}

const mock = createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  const cors = {
    'access-control-allow-origin': req.headers.origin || '*',
    'access-control-allow-headers': 'authorization, content-type',
    'access-control-allow-methods': 'GET, POST, OPTIONS'
  };
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
  const json = (code, obj) => {
    res.writeHead(code, { ...cors, 'content-type': 'application/json' });
    res.end(JSON.stringify(obj));
  };
  const authed = req.headers.authorization === 'Bearer ' + TOKEN || u.searchParams.get('token') === TOKEN;

  if (u.pathname === '/ext-bridge/ping') return json(200, { ok: true, version: 'mock', sessions: 1 });
  if (!authed) return json(401, { error: 'bad token' });

  if (u.pathname === '/ext-bridge/sessions' && req.method === 'GET') {
    return json(200, { sessions: [{ id: 'sess-1', title: '测试会话', updatedAt: Date.now() }] });
  }
  if (u.pathname === '/ext-bridge/sessions' && req.method === 'POST') {
    return json(200, { sessionId: 'sess-new' });
  }
  if (u.pathname === '/ext-bridge/cancel') {
    log.cancels++;
    emit('turn/end', { turn: 1 });
    return json(200, { ok: true });
  }
  if (u.pathname === '/ext-bridge/prompt') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      log.prompts++;
      let parsed = {};
      try { parsed = JSON.parse(body); } catch {}
      out.promptBody = { text: parsed.text, sessionId: parsed.sessionId };
      const slow = /慢/.test(String(parsed.text || ''));
      const sid = parsed.sessionId || 'sess-1';
      const emitS = (t, d) => emit(t, d, sid);
      setTimeout(async () => {
        emitS('turn/start', { turn: 1 });
        const parts = slow ? ['正在思考', '，稍等'] : ['你好，', '我是 ', 'Harness ', '侧边栏'];
        for (const t of parts) {
          emitS('assistant/chunk', { turn: 1, step: 1, chunk: { type: 'text-delta', index: 0, text: t } });
          await sleep(slow ? 400 : 45);
        }
        emitS('assistant/chunk', { turn: 1, step: 1, chunk: { type: 'reasoning-delta', index: 0, text: '先想想' } });
        emitS('assistant/chunk', { turn: 1, step: 2, chunk: { type: 'tool-call-delta', index: 0, id: 't1', name: 'read_file', argumentsDelta: '{}' } });
        await sleep(60);
        emitS('tool/result', { name: 'read_file', ok: true });
        emitS('assistant/message', { turn: 1, message: { role: 'assistant', content: '你好，我是 Harness 侧边栏' } });
        if (!slow) emitS('turn/end', { turn: 1 });
      }, 60);
      json(202, { ok: true });
    });
    return;
  }
  if (u.pathname === '/ext-bridge/events') {
    log.sseHits++;
    out.sseQuery = u.search;
    res.writeHead(200, { ...cors, 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
    res.write(': hi\n\n');
    log.sseClients.add(res);
    req.on('close', () => log.sseClients.delete(res));
    return;
  }
  json(404, { error: 'not found' });
});
await new Promise((r) => mock.listen(MOCK_PORT, '127.0.0.1', r));

/* ───────── Chrome ───────── */
const userDir = mkdtempSync(join(tmpdir(), 'yz-extbridge-'));
const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${userDir}`,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--window-size=420,1100', 'about:blank'], { stdio: 'ignore' });

async function waitPort() {
  for (let i = 0; i < 100; i++) {
    try { const r = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`); if (r.ok) return await r.json(); } catch {}
    await sleep(150);
  }
  throw new Error('Chrome 未就绪');
}

let ws;
try {
  const ver = await waitPort();
  ws = new WebSocket(ver.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', (m2) => {
    const m = JSON.parse(m2.data);
    if (m.id && pending.has(m.id)) {
      const p = pending.get(m.id); pending.delete(m.id);
      m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result);
    }
  });
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  const send = (method, params = {}, sessionId) => {
    const mid = ++id;
    return new Promise((resolve, reject) => { pending.set(mid, { resolve, reject }); ws.send(JSON.stringify({ id: mid, method, params, sessionId })); });
  };
  const ev = async (expr, sessionId) => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true, userGesture: true }, sessionId);
    if (r.exceptionDetails) {
      const d = r.exceptionDetails.exception && (r.exceptionDetails.exception.description || r.exceptionDetails.exception.value);
      throw new Error('EVAL FAIL: ' + (d || r.exceptionDetails.text) + '\nEXPR: ' + expr.slice(0, 200));
    }
    return r.result.value;
  };

  const loaded = await send('Extensions.loadUnpacked', { path: EXT });
  const { targetId } = await send('Target.createTarget', { url: `chrome-extension://${loaded.id}/sidepanel.html` });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId);
  for (let i = 0; i < 120; i++) {
    const s = await ev(`document.readyState + '|' + (typeof send) + '|' + (typeof HarnessBridge)`, sessionId);
    if (s === 'complete|function|object') break;
    await sleep(120);
  }
  await sleep(300);
  out.version = await ev(`chrome.runtime.getManifest().version`, sessionId);

  // 1) 配好桥设置（走真实 storage + loadBridgeSettings）
  await ev(`(async () => {
    await chrome.storage.local.set({ bridgeEnabled: true, bridgeUrl: 'http://127.0.0.1:${MOCK_PORT}', bridgeToken: '${TOKEN}', bridgeSession: '' });
    await loadBridgeSettings();
    await refreshBridgeSessions();
    return 1;
  })()`, sessionId);
  out.settings = await ev(`(() => ({
    enabled: bridgeState.enabled, url: bridgeState.url, hasToken: !!bridgeState.token,
    boxShown: !document.getElementById('bridgeBox').classList.contains('hidden'),
    opts: document.getElementById('selBridgeSession').options.length
  }))()`, sessionId);
  ok('settings_wired', out.settings.enabled && out.settings.url === `http://127.0.0.1:${MOCK_PORT}` && out.settings.hasToken && out.settings.opts >= 1, out.settings);


  // 直连 SSE 探针
  out.sseProbe = await ev(`new Promise((res) => {
    let done = false;
    const es = new EventSource('http://127.0.0.1:${MOCK_PORT}/ext-bridge/events?sessionId=sess-1&since=0&token=${TOKEN}');
    es.onopen = () => { done = true; es.close(); res('open'); };
    es.onerror = () => { if (!done) { done = true; es.close(); res('error'); } };
    setTimeout(() => { if (!done) { done = true; es.close(); res('timeout'); } }, 2500);
  })`, sessionId);
  ok('sse_probe', out.sseProbe === 'open', out.sseProbe);

  // 2) 发送 → 流式
  await ev(`(() => { document.getElementById('inpMsg').value = '你好'; send(); return 1; })()`, sessionId);
  let mid = null;
  for (let i = 0; i < 40; i++) {
    await sleep(60);
    const st = await ev(`(() => {
      const live = messages.find((m) => m._live);
      const bots = [...document.querySelectorAll('.msg-bot')];
      const last = bots[bots.length - 1];
      const md = last ? last.querySelector('.bot-md') : null;
      return { running, liveLen: live ? String(live.content || '').length : -1, domLen: md ? String(md.textContent || '').length : 0 };
    })()`, sessionId);
    if (st.liveLen > 0 && !mid) mid = st;
    if (!st.running) break;
  }
  ok('streamed_mid', !!mid && mid.liveLen > 0 && mid.domLen > 0, mid);

  await sleep(400);
  out.final = await ev(`(() => {
    const bots = [...document.querySelectorAll('.msg-bot')];
    const last = bots[bots.length - 1];
    const live = messages.find((m) => m._live);
    return {
      running,
      stopping: !!document.getElementById('btnSend') && document.getElementById('btnSend').classList.contains('stop'),
      content: (last && last.querySelector('.bot-md') ? last.querySelector('.bot-md').textContent : ''),
      chips: [...document.querySelectorAll('.bridge-tools .bt-chip')].map((n) => n.textContent),
      liveGone: !live,
      hasReasoning: !!document.querySelector('.msg-bot .think-body')
    };
  })()`, sessionId);
  ok('final_content', /你好，我是 Harness 侧边栏/.test(out.final.content), out.final.content);
  ok('turn_ended', out.final.running === false && out.final.liveGone === true && out.final.stopping === false, out.final);
  ok('tool_chip', out.final.chips.some((c) => /read_file/.test(c)), out.final.chips);
  ok('prompt_payload', out.promptBody && out.promptBody.text === '你好', out.promptBody);
  ok('reasoning_rendered', out.final.hasReasoning === true, out.final.hasReasoning);

  // 3) 停止 → /cancel
  await ev(`(() => { document.getElementById('inpMsg').value = '慢慢来'; send(); return 1; })()`, sessionId);
  await sleep(700);
  const beforeCancel = log.cancels;
  out.stopper = await ev(`(() => { const st = { running, stopping: document.getElementById('btnSend').classList.contains('stop') }; stopRun(); return st; })()`, sessionId);
  await sleep(300);
  out.afterStop = await ev(`(() => ({ running, stopping: document.getElementById('btnSend').classList.contains('stop'), live: !!messages.find((m) => m._live) }))()`, sessionId);
  ok('stop_resets', out.afterStop.running === false && out.afterStop.stopping === false, out.afterStop);
  ok('stop_cancels', log.cancels > beforeCancel, { before: beforeCancel, after: log.cancels });
  out.sseHits = log.sseHits;
  ok('sse_closed', log.sseClients.size === 0, log.sseClients.size);
} catch (e) {
  out.FATAL = String(e && e.stack || e);
  fail++;
} finally {
  try { ws && ws.close(); } catch {}
  try { proc.kill('SIGKILL'); } catch {}
  try { mock.close(); } catch {}
}

const summary = Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v === 'PASS' ? 'PASS' : v]));
console.log(JSON.stringify(summary, null, 2));
console.log(fail ? `\n❌ ${fail} 项失败` : '\n✅ 全部通过');
process.exit(fail ? 1 : 0);
