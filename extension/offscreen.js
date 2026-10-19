/* 后台任务执行器：侧边栏关闭后继续跑 agent 循环，状态写入 storage.agentRun。
   offscreen 文档只暴露 chrome.runtime，其他 chrome API 通过 background 代理。 */
function apiCall(path, args) {
  return chrome.runtime.sendMessage({ type: 'api:call', path, args: args || [] }).then((r) => {
    if (!r || !r.ok) throw new Error((r && r.error) || ('API 调用失败: ' + path));
    return r.result;
  });
}
const APIC = {
  storage: { local: {
    get: (...a) => apiCall('storage.local.get', a),
    set: (...a) => apiCall('storage.local.set', a)
  } },
  debugger: {
    attach: (...a) => apiCall('debugger.attach', a),
    detach: (...a) => apiCall('debugger.detach', a),
    sendCommand: (...a) => apiCall('debugger.sendCommand', a)
  },
  tabs: {
    get: (...a) => apiCall('tabs.get', a),
    query: (...a) => apiCall('tabs.query', a),
    update: (...a) => apiCall('tabs.update', a)
  },
  downloads: { download: (...a) => apiCall('downloads.download', a) }
};

const E = window.Engine;
const RUN_KEY = 'agentRun';

let running = false;
let sessionId = '';
let messages = [];
let step = 0;
let lastWrite = 0;

function snapshot(patch) {
  const now = Date.now();
  if (!patch && now - lastWrite < 120) return;
  lastWrite = now;
  const data = { messages, running, step, sessionId, at: now };
  Object.assign(data, patch || {});
  try { APIC.storage.local.set({ [RUN_KEY]: data }); } catch (_) {}
}

async function prepareTools() {
  const s = await APIC.storage.local.get(['mcp', 'model', 'providers', 'activeProvider']);
  E.setServers(Array.isArray(s.mcp) ? s.mcp : []);
  const tools = [];
  for (const srv of E.getServers()) {
    try {
      const t = await E.connectMcp(srv);
      tools.push(...t);
    } catch (_) {}
  }
  E.setTools(tools);
}

async function loop() {
  let lastSig = '';
  let noProgress = 0;
  const MAX = E.MAX_STEPS;

  try {
    for (step = 1; step <= MAX; step++) {
      if (E.stopped) throw new Error('已停止');
      snapshot({ running: true, status: `思考中 · 第 ${step}/${MAX} 轮` });

      const live = { role: 'assistant', content: '', reasoning: '', _live: true };
      messages.push(live);

      let msg;
      const paint = (acc) => {
        live.content = acc.content;
        live.reasoning = acc.reasoning;
        snapshot();
      };
      try {
        msg = await E.callLLM(paint);
      } catch (err) {
        if (!live.content && !live.reasoning) {
          const i = messages.indexOf(live);
          if (i >= 0) messages.splice(i, 1);
        } else {
          delete live._live;
        }
        throw err;
      }

      delete live._live;
      live.reasoning = msg.reasoning;
      if (msg.content) live.content = msg.content;
      if (msg.tool_calls && msg.tool_calls.length) live.tool_calls = msg.tool_calls;
      snapshot({ running: true });

      const calls = msg.tool_calls || [];
      if (!calls.length) {
        snapshot({ running: false, status: '' });
        return;
      }

      const sig = calls.map((c) => (c.function?.name || '') + ':' + String(c.function?.arguments || '').slice(0, 160)).join('|');
      const hasNew = !!(msg.content && String(msg.content).trim()) || sig !== lastSig;
      if (hasNew) noProgress = 0; else noProgress += 1;
      lastSig = sig;
      if (noProgress >= 4) {
        snapshot({ running: false, status: '连续 4 轮没有新进展，先停在这里' });
        return;
      }

      for (const tc of calls) {
        const name = tc.function?.name;
        snapshot({ running: true, status: `执行 ${name}` });
        const out = await E.runTool(name, E.parseArgs(tc.function?.arguments));
        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: typeof out === 'string' ? out : JSON.stringify(out)
        });
        snapshot({ running: true });
      }
    }
    snapshot({ running: false, status: '达到最大轮次，先停在这里' });
  } catch (e) {
    const msg = String(e?.message || e);
    if (msg === '已停止') {
      snapshot({ running: false, status: '已停止' });
    } else {
      messages.push({ role: 'assistant', content: '⚠️ ' + msg, _err: true });
      snapshot({ running: false, status: '' });
    }
  } finally {
    running = false;
    E.clearStop();
    snapshot({ running: false });
  }
}

async function start(payload) {
  if (running) return { ok: false, error: '已有任务在运行' };
  running = true;
  sessionId = payload.sessionId || Date.now().toString(36);
  messages = Array.isArray(payload.messages) ? payload.messages : [];
  step = 0;
  E.clearStop();
  snapshot({ running: true, status: '准备中' });
  await prepareTools();
  loop();
  return { ok: true };
}

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (msg?.type === 'offscreen:start') {
    start(msg.payload || {}).then(reply).catch((e) => reply({ ok: false, error: String(e?.stack || e?.message || e) }));
    return true;
  }
  if (msg?.type === 'offscreen:stop') {
    E.requestStop();
    E.abort();
    reply({ ok: true });
    return true;
  }
  if (msg?.type === 'offscreen:ping') {
    let diag = {};
    try {
      diag = {
        chromeType: typeof chrome,
        keys: (typeof chrome === 'object' && chrome) ? Object.keys(chrome).slice(0, 60) : [],
        storage: typeof (chrome && chrome.storage),
        runtime: typeof (chrome && chrome.runtime),
        tabs: typeof (chrome && chrome.tabs),
        debugger: typeof (chrome && chrome.debugger)
      };
    } catch (e) { diag = { err: String(e) }; }
    reply({ ok: true, running, step, diag });
    return true;
  }
  return false;
});
