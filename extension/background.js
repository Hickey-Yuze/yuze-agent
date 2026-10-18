// 自动运行：进入匹配网站时自动注入已启用「自动运行」的脚本妙招
chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
  if (info.status !== 'complete' || !tab.url) return;
  try {
    const { autoSkills } = await chrome.storage.local.get('autoSkills');
    if (!Array.isArray(autoSkills) || !autoSkills.length) return;
    for (const s of autoSkills) {
      if (!s.codeFile) continue;
      if (s.match && s.match !== 'all' && !tab.url.startsWith(s.match)) continue;
      try {
        await chrome.scripting.executeScript({ target: { tabId }, files: [s.codeFile] });
      } catch (_) {}
    }
  } catch (_) {}
});
