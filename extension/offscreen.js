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

/* 引擎回调：状态条、文件卡片、错误合并 */
E.setStatusSink((t) => snapshot({ status: t || '' }));
E.setFileSink((f) => { messages.push({ role: 'file', file: f }); snapshot(); });
E.setErrorSink((clean) => {
  const last = messages[messages.length - 1];
  if (last && last.role === 'assistant' && last._err === clean) {
    last._repeat = (last._repeat || 1) + 1;
  } else {
    messages.push({ role: 'assistant', content: clean, _err: clean, _repeat: 1 });
  }
  snapshot();
});

let running = false;
let sessionId = '';
let messages = [];
let step = 0;
let lastWrite = 0;
/* Tabbit 式回执：一次投递 = 一个 requestId 的 receipt。
   - 同一 requestId 重复投递直接返回，绝不重复执行（幂等）
   - taskStatus 是终态语义：running / succeeded / failed / interrupted
   侧边栏只认 receipt，不再靠本地 running 猜。 */
let activeRequestId = '';
let taskStatus = '';
let statusText = '';   // 当前阶段文案（准备工具 / 思考中 · 第 n 轮 / 执行 xxx）

function snapshot(patch) {
  const now = Date.now();
  if (!patch && now - lastWrite < 120) return;
  lastWrite = now;
  // 阶段文案要保住：流式 paint 调 snapshot() 不带 patch，若这里不存 status，
  // 侧边栏会收到 status=undefined → 状态条在思考中途变空。
  if (patch && patch.status !== undefined) statusText = patch.status;
  // messages 为空时不要写：侧边栏收到空数组会覆盖掉用户刚发的消息
  const data = { requestId: activeRequestId, taskStatus, running, step, sessionId, status: statusText, at: now };
  if (!running) data.completedAt = now;
  if (messages.length) data.messages = messages;
  Object.assign(data, patch || {});
  // 必须挂 catch：api:call 是异步的，同步 try 抓不到 rejection，
  // 写入失败会让侧边栏永远收不到最终状态（卡在「准备中」）。
  APIC.storage.local.set({ [RUN_KEY]: data }).catch((e) => {
    try { console.warn('[yz] agentRun 写入失败', e && e.message); } catch (_) {}
  });
}

async function prepareTools() {
  const s = await APIC.storage.local.get(['mcp', 'model', 'providers', 'activeProvider']);
  E.setServers(Array.isArray(s.mcp) ? s.mcp : []);
  const servers = E.getServers();
  const tools = [];
  if (!servers.length) { E.setTools(tools); return; }
  // 并行探测，每个 2 秒封顶：串行 10s×N 会让「准备中」停十几秒，
  // 用户会以为任务卡死。任何一个慢/失效的服务器都不该拖住整轮对话。
  let doneCount = 0;
  const probe = async (srv) => {
    try {
      const t = await Promise.race([
        E.connectMcp(srv),
        new Promise((_, rej) => setTimeout(() => rej(new Error('MCP 准备超时')), 2000))
      ]);
      tools.push(...t);
    } catch (_) {} finally {
      doneCount += 1;
      if (!E.stopped) snapshot({ running: true, status: `准备工具 ${doneCount}/${servers.length}` });
    }
  };
  await Promise.allSettled(servers.map(probe));
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
        taskStatus = 'succeeded';
        snapshot({ running: false, status: '' });
        return;
      }

      const sig = calls.map((c) => (c.function?.name || '') + ':' + String(c.function?.arguments || '').slice(0, 160)).join('|');
      const hasNew = !!(msg.content && String(msg.content).trim()) || sig !== lastSig;
      if (hasNew) noProgress = 0; else noProgress += 1;
      lastSig = sig;
      if (noProgress >= 4) {
        taskStatus = 'interrupted';
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
    taskStatus = 'interrupted';
    snapshot({ running: false, status: '达到最大轮次，先停在这里' });
  } catch (e) {
    const msg = String(e?.message || e);
    if (msg === '已停止') {
      taskStatus = 'interrupted';
      snapshot({ running: false, status: '已停止' });
    } else {
      taskStatus = 'failed';
      messages.push({ role: 'assistant', content: '⚠️ ' + msg, _err: true });
      snapshot({ running: false, status: '' });
    }
  } finally {
    running = false;
    if (!taskStatus || taskStatus === 'running') taskStatus = 'interrupted';
    E.clearStop();
    snapshot({ running: false });
  }
}

async function start(payload) {
  const reqId = String(payload.requestId || '');
  // 幂等：同一 requestId 已经在跑（或刚跑完），直接回执，不重复执行
  if (reqId && reqId === activeRequestId) {
    return { ok: true, duplicate: true, requestId: reqId };
  }
  if (running) {
    // 僵尸任务检测：60 秒内没有任何快照更新（loop 每轮/每次工具/流式 paint 都会写），
    // 说明上一个任务其实已经死了（异常退出但没走到 finally），必须让新任务进得来。
    // 否则用户再发消息会永远停在「准备中」。
    if (Date.now() - lastWrite > 60000) {
      try { E.requestStop(); E.abort(); } catch (_) {}
      running = false;
    } else {
      return { ok: false, busy: true, error: '上一个任务还在运行' };
    }
  }
  running = true;
  activeRequestId = reqId || ('r_' + Date.now().toString(36));
  taskStatus = 'running';
  sessionId = payload.sessionId || Date.now().toString(36);
  messages = Array.isArray(payload.messages) ? payload.messages : [];
  step = 0;
  E.clearStop();
  snapshot({ running: true, status: '准备工具' });
  // 整体最多等 5 秒：prepareTools 内部已并行 + 2 秒封顶，
  // 这里再兜一层，确保任何配置都不会让准备阶段停太久
  await Promise.race([
    prepareTools(),
    new Promise((res) => setTimeout(res, 5000))
  ]);
  if (E.stopped) { snapshot({ running: false, status: '已停止' }); running = false; return { ok: true }; }
  loop();
  return { ok: true };
}

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (msg?.type === 'offscreen:start') {
    start(msg.payload || {}).then(reply).catch((e) => reply({ ok: false, error: String(e?.stack || e?.message || e) }));
    return true;
  }
  if (msg?.type === 'offscreen:stop') {
    const want = String(msg.requestId || '');
    // 指定了 requestId 却不是当前任务：说明用户停的是另一条投递，别误杀新任务
    if (want && activeRequestId && want !== activeRequestId) {
      reply({ ok: true, ignored: true, requestId: activeRequestId });
      return true;
    }
    E.requestStop();
    E.abort();
    // 停止即刻落终态 receipt：侧边栏认到 completedAt 就复位，不用等心跳
    taskStatus = 'interrupted';
    snapshot({ running: false, status: '已停止', completedAt: Date.now() });
    reply({ ok: true, requestId: activeRequestId });
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
