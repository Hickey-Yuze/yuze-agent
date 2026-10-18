(function() {
  'use strict';

  // ===== 弹窗样式 =====
  const style = document.createElement('style');
  style.textContent = `
    .xhs-extractor-overlay {
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.5); z-index: 99999;
      display: flex; align-items: center; justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    .xhs-extractor-panel {
      background: #fff; border-radius: 16px; padding: 28px 32px;
      width: 560px; max-width: 90vw; max-height: 80vh;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      display: flex; flex-direction: column;
    }
    .xhs-extractor-panel h2 {
      margin: 0 0 4px; font-size: 18px; font-weight: 600; color: #1a1a1a;
    }
    .xhs-extractor-panel .sub {
      margin: 0 0 20px; font-size: 13px; color: #888;
    }
    .xhs-extractor-row {
      display: flex; align-items: center; gap: 10px; margin-bottom: 16px;
    }
    .xhs-extractor-row label {
      font-size: 14px; color: #333; white-space: nowrap;
    }
    .xhs-extractor-row select {
      flex: 1; padding: 8px 12px; border: 1px solid #ddd;
      border-radius: 8px; font-size: 14px; background: #fafafa;
    }
    .xhs-extractor-btn {
      padding: 10px 24px; border: none; border-radius: 10px;
      font-size: 14px; font-weight: 500; cursor: pointer;
      background: #ff2442; color: #fff; transition: all 0.2s;
    }
    .xhs-extractor-btn:hover { background: #e01e3a; }
    .xhs-extractor-btn:disabled { background: #ccc; cursor: not-allowed; }
    .xhs-extractor-btn.secondary {
      background: #f0f0f0; color: #333;
    }
    .xhs-extractor-btn.secondary:hover { background: #e0e0e0; }
    .xhs-extractor-result {
      margin-top: 12px; border: 1px solid #e0e0e0; border-radius: 10px;
      padding: 12px; background: #f9f9f9; min-height: 200px; max-height: 300px;
      overflow-y: auto; font-size: 12px; line-height: 1.6;
    }
    .xhs-extractor-result textarea {
      width: 100%; height: 100%; min-height: 180px;
      border: none; background: transparent; resize: none;
      font-family: "SF Mono", "Menlo", monospace; font-size: 12px;
      outline: none; color: #333;
    }
    .xhs-extractor-footer {
      display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px;
    }
    .xhs-extractor-count {
      font-size: 13px; color: #666; margin-top: 8px;
    }
  `;
  document.head.appendChild(style);

  // ===== 弹窗HTML =====
  const overlay = document.createElement('div');
  overlay.className = 'xhs-extractor-overlay';
  overlay.innerHTML = `
    <div class="xhs-extractor-panel">
      <h2>小红书收藏链接提取器</h2>
      <p class="sub">从当前收藏页面提取笔记链接</p>
      <div class="xhs-extractor-row">
        <label>提取数量：</label>
        <select id="xhs-count-select">
          <option value="10">10 条</option>
          <option value="20">20 条</option>
          <option value="30" selected>30 条</option>
          <option value="50">50 条</option>
          <option value="100">100 条</option>
        </select>
        <button class="xhs-extractor-btn" id="xhs-start-btn">开始采集</button>
      </div>
      <div class="xhs-extractor-result">
        <textarea id="xhs-result-area" placeholder="点击「开始采集」后，链接会显示在这里..."></textarea>
      </div>
      <p class="xhs-extractor-count" id="xhs-count-label">共 0 个链接</p>
      <div class="xhs-extractor-footer">
        <button class="xhs-extractor-btn secondary" id="xhs-close-btn">关闭</button>
        <button class="xhs-extractor-btn" id="xhs-copy-btn">复制链接</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // ===== 逻辑 =====
  const countSelect = document.getElementById('xhs-count-select');
  const startBtn = document.getElementById('xhs-start-btn');
  const resultArea = document.getElementById('xhs-result-area');
  const countLabel = document.getElementById('xhs-count-label');
  const copyBtn = document.getElementById('xhs-copy-btn');
  const closeBtn = document.getElementById('xhs-close-btn');

  let collectedLinks = [];

  startBtn.addEventListener('click', function() {
    const maxCount = parseInt(countSelect.value);
    startBtn.disabled = true;
    startBtn.textContent = '采集中...';
    resultArea.value = '';

    // 采集链接：查找 /user/profile/{userId}/{noteId} 格式的链接
    const links = [];
    const seen = new Set();

    document.querySelectorAll('a[href*="/user/profile/"]').forEach(a => {
      const href = a.getAttribute('href');
      if (!href) return;

      let fullUrl;
      if (href.startsWith('http')) {
        fullUrl = href;
      } else {
        fullUrl = 'https://www.xiaohongshu.com' + (href.startsWith('/') ? '' : '/') + href;
      }

      const match = fullUrl.match(/\/user\/profile\/[a-zA-Z0-9]+\/([a-zA-Z0-9]+)/);
      if (!match) return;
      if (seen.has(match[1])) return;
      seen.add(match[1]);

      links.push(fullUrl);
    });

    // 如果没找到，再试试 /explore/ 格式（部分页面可能用这个）
    if (links.length === 0) {
      document.querySelectorAll('a[href*="/explore/"]').forEach(a => {
        const href = a.getAttribute('href');
        if (!href) return;

        let fullUrl;
        if (href.startsWith('http')) {
          fullUrl = href;
        } else {
          fullUrl = 'https://www.xiaohongshu.com' + (href.startsWith('/') ? '' : '/') + href;
        }

        const match = fullUrl.match(/\/explore\/([a-zA-Z0-9]+)/);
        if (!match) return;
        if (seen.has(match[1])) return;
        seen.add(match[1]);

        links.push(fullUrl);
      });
    }

    collectedLinks = links.slice(0, maxCount);
    resultArea.value = collectedLinks.join('\n');
    countLabel.textContent = '共 ' + collectedLinks.length + ' 个链接';

    startBtn.disabled = false;
    startBtn.textContent = '重新采集';
  });

  copyBtn.addEventListener('click', function() {
    if (collectedLinks.length === 0) {
      new Notice('请先点击「开始采集」', 2000);
      return;
    }
    resultArea.select();
    document.execCommand('copy');
    new Notice('✅ 已复制 ' + collectedLinks.length + ' 个链接到剪贴板', 3000);
  });

  closeBtn.addEventListener('click', function() {
    overlay.remove();
    style.remove();
  });

  // 点击遮罩层关闭
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) {
      overlay.remove();
      style.remove();
    }
  });
})();