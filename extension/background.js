// 点击工具栏图标直接打开侧边栏（MV3 必须显式开启，否则点图标无反应）
chrome.sidePanel?.setPanelBehavior?.({ openPanelOnActionClick: true }).catch(() => {});

// 自动运行：进入匹配网站时自动注入已启用「自动运行」的脚本技炉
chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
  if (info.status !== 'complete' || !tab.url) return;
  try {
    const { autoSkills, scriptOverrides = {} } = await chrome.storage.local.get(['autoSkills', 'scriptOverrides']);
    if (!Array.isArray(autoSkills) || !autoSkills.length) return;
    for (const s of autoSkills) {
      if (!s.codeFile) continue;
      if (s.match && s.match !== 'all' && !tab.url.startsWith(s.match)) continue;
      try {
        const ov = scriptOverrides[s.id];
        if (ov != null) {
          await chrome.debugger.attach({ tabId }, '1.3');
          try { await chrome.debugger.sendCommand({ tabId }, 'Runtime.evaluate', { expression: ov, userGesture: true }); } finally { try { await chrome.debugger.detach({ tabId }); } catch (_) {} }
        } else {
          await chrome.scripting.executeScript({ target: { tabId }, files: [s.codeFile] });
        }
      } catch (_) {}
    }
  } catch (_) {}
});


// 注入脚本的持久存储桥：脚本数据存进扩展 chrome.storage，重启浏览器不丢
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || typeof msg !== 'object') return;
  try {
    if (msg.type === 'yz:store:get') {
      chrome.storage.local.get(msg.key).then((o) => sendResponse({ ok: true, value: o[msg.key] ?? null })).catch(() => sendResponse({ ok: false }));
      return true;
    }
    if (msg.type === 'yz:store:set') {
      chrome.storage.local.set({ [msg.key]: msg.value }).then(() => sendResponse({ ok: true })).catch(() => sendResponse({ ok: false }));
      return true;
    }
  } catch (_) {}
});

/* ══ 后台任务执行器（offscreen）══ */
async function ensureOffscreen() {
  try {
    const ctx = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
    if (ctx && ctx.length) return true;
  } catch (_) {}
  try {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['WORKERS'],
      justification: '运行 agent 任务循环，让关闭侧边栏后任务继续执行'
    });
    return true;
  } catch (e) {
    return false;
  }
}

/* 等 offscreen 的 JS 真正就绪：createDocument 返回不代表页面已加载完成，
   立刻发 offscreen:start 会无人接收，被误判成「启动成功」，侧边栏就会停在准备中。 */
async function waitOffscreenReady(timeoutMs = 5000) {
  const t0 = Date.now();
  let delay = 60;
  while (Date.now() - t0 < timeoutMs) {
    try {
      const r = await chrome.runtime.sendMessage({ type: 'offscreen:ping' });
      if (r && r.ok) return true;
    } catch (_) {}
    await new Promise((res) => setTimeout(res, delay));
    delay = Math.min(delay * 1.6, 400);
  }
  return false;
}

/* offscreen 的通用 API 代理：offscreen 只能访问 chrome.runtime，其余 API 由这里代执行 */
chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (msg?.type === 'api:call') {
    (async () => {
      try {
        const parts = String(msg.path || '').split('.');
        let obj = chrome;
        for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]];
        const fn = obj[parts[parts.length - 1]];
        if (typeof fn !== 'function') throw new Error('未找到 API: ' + msg.path);
        const out = await fn.apply(obj, msg.args || []);
        reply({ ok: true, result: out });
      } catch (e) {
        reply({ ok: false, error: String(e?.message || e) });
      }
    })();
    return true;
  }
  return false;
});

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (msg?.type === 'agent:start') {
    (async () => {
      const ok = await ensureOffscreen();
      if (!ok) { reply({ ok: false, error: '无法创建后台执行器' }); return; }
      const ready = await waitOffscreenReady();
      if (!ready) { reply({ ok: false, error: '后台执行器无响应' }); return; }
      try {
        const r = await chrome.runtime.sendMessage({ type: 'offscreen:start', payload: msg.payload || {} });
        reply(r || { ok: false, error: '后台执行器无响应' });
      } catch (e) {
        reply({ ok: false, error: String(e?.message || e) });
      }
    })();
    return true;
  }
  if (msg?.type === 'agent:stop') {
    (async () => {
      try {
        // 带上 requestId：后台只停这条投递，避免误杀刚发的新任务
        const r = await chrome.runtime.sendMessage({ type: 'offscreen:stop', requestId: msg.requestId || '' });
        reply(r || { ok: true });
      } catch (_) { reply({ ok: true }); }
    })();
    return true;
  }
  return false;
});
