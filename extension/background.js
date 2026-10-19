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
