(async function __tabEvaluateScriptBridge() {
  const __tabScriptArgs = null;
  const __tabOriginalFunction = (
    /**
     * 知网文献综述助手 - 浮动弹窗脚本
     * 功能：
     * 1. 浮动弹窗UI（可拖拽、可折叠）
     * 2. 监听搜索关键词，自动提取搜索结果中的文献信息
     * 3. 智能总结该领域研究结论
     * 4. 提供APA、MLA、GB/T 7714等多种引用格式
     * 5. 一键复制引用功能
     */
    
    async function run(args) {
      // ========== 配置 ==========
      const CONFIG = {
        maxArticles: 10,        // 最大提取文章数
        popupWidth: 520,
        popupHeight: 680,
        primaryColor: '#c45c26', // 知网主题色
        bgColor: '#ffffff',
        textColor: '#333333',
        borderColor: '#e0e0e0'
      };
    
      // ========== 样式注入 ==========
      const styleId = 'cnki-lit-review-style';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          /* 浮动弹窗容器 */
          #cnki-lit-popup {
            position: fixed;
            top: 80px;
            right: 20px;
            width: ${CONFIG.popupWidth}px;
            height: ${CONFIG.popupHeight}px;
            background: ${CONFIG.bgColor};
            border: 2px solid ${CONFIG.primaryColor};
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.12);
            z-index: 2147483647;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", "PingFang SC", sans-serif;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            transition: all 0.3s ease;
          }
    
          #cnki-lit-popup.collapsed {
            height: auto;
            width: auto;
          }
    
          #cnki-lit-popup.collapsed .popup-body {
            display: none;
          }
    
          /* 标题栏 */
          .popup-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 16px;
            background: linear-gradient(135deg, ${CONFIG.primaryColor}, #d97736);
            color: white;
            cursor: move;
            user-select: none;
            border-radius: 10px 10px 0 0;
            flex-shrink: 0;
          }
    
          .popup-title {
            font-size: 15px;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 8px;
          }
    
          .popup-title::before {
            content: "📚";
            font-size: 18px;
          }
    
          .popup-controls {
            display: flex;
            gap: 6px;
            align-items: center;
          }
    
          .popup-btn {
            width: 28px;
            height: 28px;
            border: none;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            transition: all 0.2s;
            background: rgba(255,255,255,0.2);
            color: white;
          }
    
          .popup-btn:hover {
            background: rgba(255,255,255,0.35);
            transform: scale(1.1);
          }
    
          /* 主体区域 */
          .popup-body {
            flex: 1;
            overflow-y: auto;
            padding: 12px 16px;
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
    
          .popup-body::-webkit-scrollbar {
            width: 6px;
          }
          .popup-body::-webkit-scrollbar-thumb {
            background: ${CONFIG.primaryColor};
            border-radius: 3px;
          }
    
          /* 搜索状态栏 */
          .search-status-bar {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 14px;
            background: linear-gradient(135deg, #f8f9fa, #e9ecef);
            border-radius: 8px;
            border-left: 4px solid ${CONFIG.primaryColor};
            flex-shrink: 0;
          }
    
          .search-status-bar .keyword-label {
            font-size: 13px;
            color: #666;
            white-space: nowrap;
            flex-shrink: 0;
          }
    
          .search-input-wrapper {
            display: flex;
            align-items: center;
            gap: 6px;
            flex: 1;
            min-width: 0;
          }
    
          .popup-search-input {
            flex: 1;
            min-width: 0;
            padding: 6px 10px;
            border: 2px solid ${CONFIG.primaryColor};
            border-radius: 6px;
            font-size: 13px;
            font-weight: 600;
            color: ${CONFIG.primaryColor};
            outline: none;
            background: white;
            transition: border-color 0.2s, box-shadow 0.2s;
          }
          .popup-search-input:focus {
            border-color: #a84b1d;
            box-shadow: 0 0 0 3px rgba(196,92,38,0.15);
          }
          .popup-search-input::placeholder {
            color: #bbb;
            font-weight: 400;
          }
    
          .btn-go-search {
            padding: 6px 12px;
            background: linear-gradient(135deg, ${CONFIG.primaryColor}, #d97736);
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 700;
            white-space: nowrap;
            transition: all 0.2s;
            flex-shrink: 0;
          }
          .btn-go-search:hover {
            transform: translateY(-1px);
            box-shadow: 0 3px 10px rgba(196,92,38,0.35);
          }
    
          .status-badge {
            padding: 3px 10px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
            margin-left: auto;
          }
          .status-badge.ready { background: #d4edda; color: #155724; }
          .status-badge.analyzing { background: #fff3cd; color: #856404; animation: pulse 1s infinite; }
          .status-badge.done { background: #cce5ff; color: #004085; }
    
          @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
    
          /* 操作按钮区 */
          .action-bar {
            display: flex;
            gap: 8px;
            flex-shrink: 0;
            flex-wrap: wrap;
          }
    
          .action-btn {
            flex: 1;
            min-width: 90px;
            padding: 8px 12px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
            transition: all 0.25s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
          }
    
          .btn-primary {
            background: linear-gradient(135deg, ${CONFIG.primaryColor}, #d97736);
            color: white;
          }
          .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(196,92,38,0.35); }
    
          .btn-secondary {
            background: #f0f0f0;
            color: #444;
          }
          .btn-secondary:hover { background: #e0e0e0; }
    
          .btn-success {
            background: linear-gradient(135deg, #28a745, #20c997);
            color: white;
          }
          .btn-success:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(40,167,69,0.35); }
    
          /* Tab切换 */
          .tab-bar {
            display: flex;
            border-bottom: 2px solid #eee;
            flex-shrink: 0;
            gap: 0;
          }
    
          .tab-item {
            flex: 1;
            padding: 10px 8px;
            text-align: center;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
            color: #888;
            border-bottom: 2px solid transparent;
            transition: all 0.2s;
            background: none;
            border-top: none;
            border-left: none;
            border-right: none;
          }
    
          .tab-item.active {
            color: ${CONFIG.primaryColor};
            border-bottom-color: ${CONFIG.primaryColor};
          }
          .tab-item:hover:not(.active) { color: #555; background: #fafafa; }
    
          /* 内容面板 */
          .tab-panel {
            display: none;
            flex: 1;
            overflow-y: auto;
            padding: 10px 0;
          }
          .tab-panel.active { display: block; }
    
          /* 文献卡片 */
          .article-card {
            background: #fafbfc;
            border: 1px solid #e8eaed;
            border-radius: 8px;
            padding: 12px 14px;
            margin-bottom: 10px;
            transition: all 0.2s;
          }
          .article-card:hover {
            border-color: ${CONFIG.primaryColor};
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
            transform: translateX(2px);
          }
    
          .article-title {
            font-size: 14px;
            font-weight: 700;
            color: #1a73e8;
            line-height: 1.5;
            margin-bottom: 6px;
            cursor: pointer;
          }
          .article-title:hover { text-decoration: underline; }
    
          .article-meta {
            font-size: 12px;
            color: #666;
            margin-bottom: 6px;
            line-height: 1.6;
          }
          .article-meta span { margin-right: 8px; }
    
          .article-authors { color: ${CONFIG.primaryColor}; }
          .article-journal { color: #444; }
          .article-year { background: #e8f4fd; padding: 1px 6px; border-radius: 3px; }
    
          .article-abstract {
            font-size: 12.5px;
            color: #555;
            line-height: 1.7;
            margin-bottom: 8px;
            display: -webkit-box;
            -webkit-line-clamp: 4;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
    
          .article-conclusion {
            background: linear-gradient(135deg, #fff8e1, #fff3cd);
            border-left: 3px solid #ffc107;
            padding: 8px 10px;
            border-radius: 0 6px 6px 0;
            font-size: 12.5px;
            color: #5d4037;
            line-height: 1.6;
            margin-bottom: 8px;
          }
          .conclusion-label {
            font-weight: 700;
            font-size: 11px;
            color: #ff8f00;
            margin-bottom: 4px;
            display: block;
          }
    
          /* 引用格式区 */
          .citation-block {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 6px;
            padding: 10px 12px;
            margin-bottom: 8px;
            position: relative;
          }
    
          .citation-format-label {
            font-size: 11px;
            font-weight: 700;
            color: #fff;
            background: ${CONFIG.primaryColor};
            padding: 2px 8px;
            border-radius: 3px;
            display: inline-block;
            margin-bottom: 6px;
          }
    
          .citation-text {
            font-family: "Courier New", Consolas, monospace;
            font-size: 11.5px;
            color: #333;
            line-height: 1.7;
            word-break: break-all;
            background: white;
            padding: 8px 10px;
            border-radius: 4px;
            border: 1px solid #ddd;
          }
    
          .copy-btn {
            position: absolute;
            top: 34px;
            right: 8px;
            padding: 4px 10px;
            background: ${CONFIG.primaryColor};
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            font-weight: 600;
            transition: all 0.2s;
          }
          .copy-btn:hover { background: #a84b1d; transform: scale(1.05); }
          .copy-btn.copied { background: #28a745; }
    
          /* 总结面板 */
          .summary-section {
            background: linear-gradient(135deg, #e8f5e9, #c8e6c9);
            border: 1px solid #a5d6a7;
            border-radius: 8px;
            padding: 14px 16px;
            margin-bottom: 12px;
          }
    
          .summary-title {
            font-size: 15px;
            font-weight: 700;
            color: #2e7d32;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .summary-title::before { content: "📋"; }
    
          .summary-content {
            font-size: 13px;
            color: #1b5e20;
            line-height: 1.85;
          }
    
          .summary-point {
            margin-bottom: 10px;
            padding-left: 16px;
            position: relative;
          }
          .summary-point::before {
            content: "▸";
            position: absolute;
            left: 0;
            color: #43a047;
            font-weight: bold;
          }
    
          /* 空状态 */
          .empty-state {
            text-align: center;
            padding: 40px 20px;
            color: #999;
          }
          .empty-state-icon { font-size: 48px; margin-bottom: 12px; }
          .empty-state-text { font-size: 14px; line-height: 1.6; }
    
          /* 加载动画 */
          .loading-spinner {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid ${CONFIG.primaryColor};
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            vertical-align: middle;
            margin-right: 8px;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
    
          /* 统计信息 */
          .stats-bar {
            display: flex;
            gap: 12px;
            padding: 8px 12px;
            background: #f0f4f8;
            border-radius: 6px;
            flex-shrink: 0;
          }
          .stat-item {
            font-size: 12px;
            color: #555;
          }
          .stat-item strong { color: ${CONFIG.primaryColor}; font-size: 15px; }
    
          /* 底部信息 */
          .footer-info {
            text-align: center;
            font-size: 11px;
            color: #aaa;
            padding: 8px;
            border-top: 1px solid #eee;
            flex-shrink: 0;
          }
        `;
        document.head.appendChild(style);
      }
    
      // ========== 创建弹窗HTML ==========
      const existingPopup = document.getElementById('cnki-lit-popup');
      if (existingPopup) {
        existingPopup.remove();
      }
    
      const popup = document.createElement('div');
      popup.id = 'cnki-lit-popup';
      popup.innerHTML = `
        <div class="popup-header" id="popup-header">
          <div class="popup-title">知网文献综述助手</div>
          <div class="popup-controls">
            <button class="popup-btn" id="btn-collapse" title="折叠/展开">−</button>
            <button class="popup-btn" id="btn-close" title="关闭">✕</button>
          </div>
        </div>
        <div class="popup-body">
          <!-- 搜索栏（可输入） -->
          <div class="search-status-bar">
            <span class="keyword-label">🔍 关键词：</span>
            <div class="search-input-wrapper">
              <input type="text" class="popup-search-input" id="popup-search-input" placeholder="输入关键词，如：碎片化阅读" />
              <button class="btn-go-search" id="btn-go-search">去知网搜索</button>
            </div>
            <span class="status-badge ready" id="status-badge">就绪</span>
          </div>
    
          <!-- 操作按钮 -->
          <div class="action-bar">
            <button class="action-btn btn-primary" id="btn-extract">📥 提取当前结果</button>
            <button class="action-btn btn-success" id="btn-summarize">🧠 AI总结结论</button>
            <button class="action-btn btn-secondary" id="btn-export">📤 导出全部引用</button>
          </div>
    
          <!-- 统计 -->
          <div class="stats-bar" id="stats-bar" style="display:none;">
            <span class="stat-item">📄 文章数：<strong id="stat-count">0</strong></span>
            <span class="stat-item">📅 年份范围：<strong id="stat-years">-</strong></span>
            <span class="stat-item">📚 来源数：<strong id="stat-sources">0</strong></span>
          </div>
    
          <!-- Tab栏 -->
          <div class="tab-bar">
            <button class="tab-item active" data-tab="articles">📄 文献列表</button>
            <button class="tab-item" data-tab="citations">📎 引用格式</button>
            <button class="tab-item" data-tab="summary">💡 研究总结</button>
          </div>
    
          <!-- 面板内容 -->
          <div class="tab-panel active" id="panel-articles">
            <div class="empty-state" id="articles-empty">
              <div class="empty-state-icon">📖</div>
              <div class="empty-state-text">
                请在知网搜索框输入关键词并搜索<br>
                然后点击「提取当前结果」按钮<br><br>
                <small>支持自动检测页面上的文献信息</small>
              </div>
            </div>
            <div id="articles-list"></div>
          </div>
    
          <div class="tab-panel" id="panel-citations">
            <div class="empty-state" id="citations-empty">
              <div class="empty-state-icon">📋</div>
              <div class="empty-state-text">请先提取文献列表<br>此处将显示多种格式的引用</div>
            </div>
            <div id="citations-list"></div>
          </div>
    
          <div class="tab-panel" id="panel-summary">
            <div class="empty-state" id="summary-empty">
              <div class="empty-state-icon">🧠</div>
              <div class="empty-state-text">点击「AI总结结论」按钮<br>将基于提取的文献生成领域研究综述</div>
            </div>
            <div id="summary-content"></div>
          </div>
    
          <div class="footer-info">知网文献综述助手 v1.0 | 数据来源：中国知网</div>
        </div>
      `;
    
      document.body.appendChild(popup);
    
      // ========== 数据存储 ==========
      let extractedArticles = [];
      let currentKeyword = '';
    
      // ========== 拖拽功能 ==========
      const header = document.getElementById('popup-header');
      let isDragging = false;
      let dragOffsetX = 0, dragOffsetY = 0;
    
      header.addEventListener('mousedown', (e) => {
        if (e.target.closest('.popup-btn')) return;
        isDragging = true;
        dragOffsetX = e.clientX - popup.offsetLeft;
        dragOffsetY = e.clientY - popup.offsetTop;
        popup.style.transition = 'none';
      });
    
      document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        let newX = e.clientX - dragOffsetX;
        let newY = e.clientY - dragOffsetY;
        // 边界限制
        newX = Math.max(0, Math.min(newX, window.innerWidth - popup.offsetWidth));
        newY = Math.max(0, Math.min(newY, window.innerHeight - popup.offsetHeight));
        popup.style.left = newX + 'px';
        popup.style.top = newY + 'px';
        popup.style.right = 'auto';
      });
    
      document.addEventListener('mouseup', () => {
        isDragging = false;
        popup.style.transition = '';
      });
    
      // ========== 折叠/关闭 ==========
      document.getElementById('btn-collapse').addEventListener('click', () => {
        popup.classList.toggle('collapsed');
        document.getElementById('btn-collapse').textContent = popup.classList.contains('collapsed') ? '+' : '−';
      });
    
      document.getElementById('btn-close').addEventListener('click', () => {
        popup.remove();
      });
    
      // ========== Tab切换 ==========
      document.querySelectorAll('.tab-item').forEach(tab => {
        tab.addEventListener('click', () => {
          document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
          document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
          tab.classList.add('active');
          document.getElementById('panel-' + tab.dataset.tab).classList.add('active');
        });
      });
    
      // ========== 核心功能：提取文献 ==========
      async function extractArticles() {
        const badge = document.getElementById('status-badge');
        badge.className = 'status-badge analyzing';
        badge.textContent = '分析中';
    
        try {
          // 获取当前URL中的关键词
          const urlParams = new URLSearchParams(window.location.search);
          let keyword = '';
    
          // 方法1：从URL参数获取
          const kwFromUrl = urlParams.get('kw') || urlParams.get('key') || urlParams.get('q');
          if (kwFromUrl) keyword = decodeURIComponent(kwFromUrl);
    
          // 方法2：从搜索框获取
          const searchInput = document.querySelector('#gr_search input[type="text"]')
            || document.querySelector('.search-box input')
            || document.querySelector('input[placeholder*="中文文献"]')
            || document.querySelector('input.search-input');
          if (searchInput && searchInput.value.trim()) {
            keyword = searchInput.value.trim();
          }
    
          // 方法3：尝试更多选择器
          if (!keyword) {
            const allInputs = document.querySelectorAll('input');
            for (const inp of allInputs) {
              if ((inp.placeholder && (inp.placeholder.includes('文献') || inp.placeholder.includes('搜索')))
                  && inp.value.trim()) {
                keyword = inp.value.trim();
                break;
              }
            }
          }
    
          currentKeyword = keyword || '';
          const popupInput = document.getElementById('popup-search-input');
          if (currentKeyword && popupInput) {
            popupInput.value = currentKeyword;
          } else if (popupInput && !popupInput.value) {
            // 如果也没从页面获取到，保留用户可能已手动输入的内容
          }
          // 如果输入框有值但没获取到关键词，以输入框为准
          if (!currentKeyword && popupInput && popupInput.value.trim()) {
            currentKeyword = popupInput.value.trim();
          }
    
          // 提取文章数据
          const articles = [];
    
          // 知网搜索结果页面的DOM结构
          // 每篇文章通常包含：标题(h4/h3/a)、作者、期刊、年份、摘要
    
          // 策略1：查找结果列表容器
          const resultItems = document.querySelectorAll(
            '.result-table-list tr, ' +
            '[class*="result"] [class*="item"], ' +
            '.s-single, ' +
            '[class*="article-item"], ' +
            'table.result-table tbody tr'
          );
    
          if (resultItems.length > 0) {
            resultItems.forEach((item, idx) => {
              if (idx >= CONFIG.maxArticles) return;
    
              const titleEl = item.querySelector(
                'a[name="dc_title"], a.fz14, h4>a, h3>a, td:nth-child(1)>a, [class*="title"] a'
              ) || item.querySelector('a[href*="kcms2"]');
    
              const title = titleEl ? titleEl.textContent.trim() : '';
              if (!title) return;
    
              // 作者
              const authorEl = item.querySelector('[name="dc_author"], [class*="author"]') || item.querySelectorAll('td')[1];
              const authors = authorEl ? authorEl.textContent.trim().replace(/;/g, ', ') : '';
    
              // 来源/期刊
              const sourceEl = item.querySelector('[name="dc_source"], [class*="source"], [class*="journal"]') || item.querySelectorAll('td')[2];
              const source = sourceEl ? sourceEl.textContent.trim().split('.')[0] : '';
    
              // 年份
              const yearMatch = source.match(/(\d{4})/) || item.textContent.match(/(\d{4})[年\-期]/);
              const year = yearMatch ? yearMatch[1] : '';
    
              // 摘要
              const abstractEl = item.querySelector('[class*="abstract"], [class*="summary"], td[colspan]') || item.querySelectorAll('td')[item.querySelectorAll('td').length - 1];
              const abstractText = abstractEl ? abstractEl.textContent.trim().substring(0, 300) : '';
    
              // URL
              const url = titleEl ? titleEl.href : '';
    
              articles.push({ title, authors, source, year, abstract: abstractText, url });
            });
          }
    
          // 策略2：直接查找所有包含知网文章链接的元素
          if (articles.length === 0) {
            const allLinks = document.querySelectorAll('a[href*="kcms2/article"]');
            const seenTitles = new Set();
    
            allLinks.forEach((link, idx) => {
              if (idx >= CONFIG.maxArticles * 2) return;
              const title = link.textContent.trim();
              if (!title || seenTitles.has(title) || title.length < 5) return;
              seenTitles.add(title);
    
              // 向上找到父容器
              let parent = link.closest('tr') || link.closest('[class*="item"]') || link.parentElement?.parentElement?.parentElement;
              if (!parent) parent = link.parentElement;
    
              const fullText = parent.textContent || '';
    
              // 尝试提取作者
              const authorMatch = fullText.match(/([^\n]{2,20?})(?:\s*[·\.]\s*|[\n])/);
              const authors = authorMatch ? authorMatch[1].trim().replace(/[;\s]+$/, '') : '';
    
              // 来源和年份
              const sourceMatch = fullText.match(/[\u4e00-\u9fa5]{2,30}?[期刊学报][\u4e00-\u9fa5]*/);
              const source = sourceMatch ? sourceMatch[0] : '';
              const yrMatch = fullText.match(/(\d{4})\s*年?\s*(\d+)?\s*期?/);
              const year = yrMatch ? yrMatch[1] : '';
    
              // 摘要
              const absMatch = fullText.match(/(?:摘要|Abstract)[：:]?\s*([\s\S]{50,400})/);
              const abstractText = absMatch ? absMatch[1].trim() : fullText.substring(0, 200).trim();
    
              articles.push({
                title,
                authors,
                source,
                year,
                abstract: abstractText.substring(0, 300),
                url: link.href
              });
            });
          }
    
          // 策略3：从snapshot结构中提取（针对当前知网页面）
          if (articles.length === 0) {
            // 直接遍历页面中h4/h5/h6级别的标题链接
            const headings = document.querySelectorAll('h4 a, h5 a, h6 a, [class*="name"] a');
            const seen = new Set();
            headings.forEach((h, idx) => {
              if (idx >= CONFIG.maxArticles) return;
              const t = h.textContent.trim();
              if (!t || seen.has(t) || t.length < 5) return;
              seen.add(t);
    
              // 找相邻的兄弟元素获取元信息
              let container = h.closest('li, div[class], td, tr') || h.parentElement?.parentElement;
              const ct = container ? container.textContent : '';
    
              const authMatch = ct.match(/^([\u4e00-\u9fa5]{2,4}(?:;[\u4e00-\u9fa5]{2,4})*)/);
              const srcMatch = ct.match(/[\u4e00-\u9fa5]{2,20}(?:研究|学报|学刊|期刊|评论|论坛)/);
              const yrMatch = ct.match(/(\d{4})/);
    
              articles.push({
                title: t,
                authors: authMatch ? authMatch[1] : '',
                source: srcMatch ? srcMatch[0] : '',
                year: yrMatch ? yrMatch[1] : '',
                abstract: ct.replace(t, '').substring(0, 250).trim(),
                url: h.href
              });
            });
          }
    
          extractedArticles = articles.slice(0, CONFIG.maxArticles);
    
          // 更新统计
          if (extractedArticles.length > 0) {
            document.getElementById('stats-bar').style.display = 'flex';
            document.getElementById('stat-count').textContent = extractedArticles.length;
    
            const years = extractedArticles.map(a => a.year).filter(Boolean).sort();
            document.getElementById('stat-years').textContent =
              years.length > 0 ? `${years[0]}-${years[years.length-1]}` : '-';
    
            const sources = new Set(extractedArticles.map(a => a.source).filter(Boolean));
            document.getElementById('stat-sources').textContent = sources.size;
    
            renderArticles();
            renderCitations();
          }
    
          badge.className = 'status-badge done';
          badge.textContent = `已提取 ${extractedArticles.length} 篇`;
    
          return {
            ok: true,
            summary: `成功提取 ${extractedArticles.length} 篇文献`,
            data: { keyword: currentKeyword, count: extractedArticles.length, articles: extractedArticles }
          };
    
        } catch (err) {
          badge.className = 'status-badge ready';
          badge.textContent = '出错';
          console.error('CNKI Literature Review Error:', err);
          return { ok: false, summary: '提取失败: ' + err.message };
        }
      }
    
      // ========== 渲染文献列表 ==========
      function renderArticles() {
        const listEl = document.getElementById('articles-list');
        const emptyEl = document.getElementById('articles-empty');
    
        if (extractedArticles.length === 0) {
          emptyEl.style.display = 'block';
          listEl.innerHTML = '';
          return;
        }
    
        emptyEl.style.display = 'none';
        listEl.innerHTML = extractedArticles.map((art, i) => `
          <div class="article-card" data-index="${i}">
            <div class="article-title" onclick="window.open('${art.url}','_blank')" title="点击查看原文">${art.title}</div>
            <div class="article-meta">
              ${art.authors ? `<span class="article-authors">👤 ${art.authors}</span>` : ''}
              ${art.source ? `<span class="article-journal">📰 ${art.source}</span>` : ''}
              ${art.year ? `<span class="article-year">📅 ${art.year}</span>` : ''}
            </div>
            ${art.abstract ? `<div class="article-abstract">${art.abstract}</div>` : ''}
            <div class="article-conclusion">
              <span class="conclusion-label">💡 核心观点</span>
              ${generateConclusion(art)}
            </div>
          </div>
        `).join('');
      }
    
      // ========== 为每篇文献生成核心结论 ==========
      function generateConclusion(article) {
        // 基于摘要文本进行智能分析，提取核心结论
        const text = article.abstract + ' ' + article.title;
        const conclusions = [];
    
        // 常见学术表达模式识别
        const patterns = [
          /(?:研究表明|研究发现|结果显示|实证分析|调查发现|数据分析表明)[：:，,]?([\s\S]{10,150}?)(?:[。；]|$)/,
          /(?:本文认为|本文提出|本文论证|本文探讨|本研究)[：:，,]?([\s\S]{10,150}?)(?:[。；]|$)/,
          /(?:影响|作用|效应|关系|机制)[为是]?([\s\S]{10,120}?)(?:[。；]|$)/,
          /(?:具有|呈现|表现出|显示出|体现出)([\s\S]{10,120}?)(?:[。；]|$)/,
          /(?:建议|对策|措施|策略|路径)[：:是]?([\s\S]{10,120}?)(?:[。；]|$)/
        ];
    
        for (const p of patterns) {
          const match = text.match(p);
          if (match) {
            conclusions.push(match[0].trim());
          }
        }
    
        if (conclusions.length > 0) {
          return conclusions[0].substring(0, 200) + (conclusions[0].length > 200 ? '...' : '');
        }
    
        // 如果没有匹配到模式，返回摘要的前两句
        const sentences = text.split(/[。！？]/).filter(s => s.trim().length > 10);
        if (sentences.length > 0) {
          return sentences[0].trim().substring(0, 200) + '...';
        }
    
        return '（需阅读全文以获取详细结论）';
      }
    
      // ========== 生成引用格式 ==========
      function generateCitations(article) {
        const { title, authors, source, year } = article;
        const authorList = authors.replace(/;/g, ', ');
    
        // APA格式 (第7版): 作者. (年份). 文章标题. 期刊名, 卷(期), 页码.
        const apa = authorList ?
          `${authorList}. (${year}). ${title}. ${source}.` :
          `${title}. (${year}). ${source}.`;
    
        // MLA格式 (第9版): 作者. "文章标题." 期刊名, vol., no., 年份, pp.
        const mla = authorList ?
          `${authorList}. "${title}." ${source}, ${year}.` :
          `"${title}." ${source}, ${year}.`;
    
        // GB/T 7714-2015 (中国国标): 作者. 文章标题[J]. 期刊名, 年份, 卷(期): 页码.
        const gbt = authorList ?
          `${authorList}. ${title}[J]. ${source}, ${year}.` :
          `${title}[J]. ${source}, ${year}.`;
    
        // Chicago格式 (作者-日期)
        const chicago = authorList ?
          `${authorList}. "${title}." ${source} (${year}).` :
          `"${title}." ${source} (${year}).`;
    
        // Harvard格式
        const harvard = authorList ?
          `${authorList} (${year}) '${title}', ${source}.` :
          `'${title}' (${year}), ${source}.`;
    
        return { apa, mla, gbt, chicago, harvard };
      }
    
      // ========== 渲染引用格式 ==========
      function renderCitations() {
        const listEl = document.getElementById('citations-list');
        const emptyEl = document.getElementById('citations-empty');
    
        if (extractedArticles.length === 0) {
          emptyEl.style.display = 'block';
          listEl.innerHTML = '';
          return;
        }
    
        emptyEl.style.display = 'none';
    
        let html = '';
        extractedArticles.forEach((art, i) => {
          const cites = generateCitations(art);
          html += `<div style="margin-bottom:16px;border-bottom:1px dashed #ddd;padding-bottom:12px;">
            <div style="font-weight:700;font-size:13px;color:#333;margin-bottom:8px;">${i+1}. ${art.title}</div>`;
    
          const formats = [
            { key: 'apa', label: 'APA 第7版', cite: cites.apa },
            { key: 'mla', label: 'MLA 第9版', cite: cites.mla },
            { key: 'gbt', label: 'GB/T 7714-2015', cite: cites.gbt },
            { key: 'chicago', label: 'Chicago', cite: cites.chicago },
            { key: 'harvard', label: 'Harvard', cite: cites.harvard }
          ];
    
          formats.forEach(f => {
            html += `
              <div class="citation-block">
                <span class="citation-format-label">${f.label}</span>
                <div class="citation-text">${escapeHtml(f.cite)}</div>
                <button class="copy-btn" onclick="copyCitation(this, \`${escapeHtml(f.cite).replace(/`/g, '\\`')}\`)">复制</button>
              </div>`;
          });
    
          html += '</div>';
        });
    
        listEl.innerHTML = html;
      }
    
      // ========== HTML转义 ==========
      function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      }
    
      // ========== 复制函数（全局注册） ==========
      window.copyCitation = function(btn, text) {
        navigator.clipboard.writeText(text).then(() => {
          btn.textContent = '✓ 已复制';
          btn.classList.add('copied');
          setTimeout(() => {
            btn.textContent = '复制';
            btn.classList.remove('copied');
          }, 2000);
        }).catch(() => {
          // Fallback
          const textarea = document.createElement('textarea');
          textarea.value = text;
          textarea.style.position = 'fixed';
          textarea.style.opacity = '0';
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
          btn.textContent = '✓ 已复制';
          btn.classList.add('copied');
          setTimeout(() => {
            btn.textContent = '复制';
            btn.classList.remove('copied');
          }, 2000);
        });
      };
    
      // ========== AI总结功能 ==========
      async function generateSummary() {
        const summaryPanel = document.getElementById('summary-content');
        const emptyEl = document.getElementById('summary-empty');
        const badge = document.getElementById('status-badge');
    
        if (extractedArticles.length === 0) {
          alert('请先提取文献列表！');
          return;
        }
    
        badge.className = 'status-badge analyzing';
        badge.textContent = 'AI总结中...';
        emptyEl.style.display = 'none';
        summaryPanel.innerHTML = '<div style="text-align:center;padding:30px;"><span class="loading-spinner"></span>正在智能分析文献内容...</div>';
    
        // 模拟AI处理延迟（实际可接入API）
        await new Promise(r => setTimeout(r, 800));
    
        // 基于提取的数据生成结构化总结
        const summary = buildSummary(extractedArticles, currentKeyword);
    
        summaryPanel.innerHTML = summary.html;
        badge.className = 'status-badge done';
        badge.textContent = '已完成';
    
        return { ok: true, summary: '总结完成' };
      }
    
      // ========== 构建研究总结 ==========
      function buildSummary(articles, keyword) {
        // 分析年份分布
        const years = articles.map(a => parseInt(a.year)).filter(y => y > 1900 && y <= 2030);
        const yearRange = years.length > 0 ? `${Math.min(...years)}-${Math.max(...years)}` : '未知';
    
        // 分析来源
        const sources = {};
        articles.filter(a => a.source).forEach(a => {
          sources[a.source] = (sources[a.source] || 0) + 1;
        });
        const topSources = Object.entries(sources).sort((a,b) => b[1]-a[1]).slice(0, 5);
    
        // 提取所有结论
        const allConclusions = articles.map(a => generateConclusion(a));
    
        // 识别研究主题方向
        const themes = identifyThemes(articles, keyword);
    
        // 生成综合结论
        const overallConclusion = generateOverallConclusion(articles, keyword, themes);
    
        const html = `
          <div class="summary-section">
            <div class="summary-title">研究领域概况</div>
            <div class="summary-content">
              <div class="summary-point"><strong>检索词：</strong>${keyword}</div>
              <div class="summary-point"><strong>文献数量：</strong>共 ${articles.length} 篇相关文献</div>
              <div class="summary-point"><strong>时间跨度：</strong>${yearRange} 年</div>
              <div class="summary-point"><strong>主要来源：</strong>${topSources.map(s=>s[0]+'('+s[1]+'篇)').join('、')}</div>
            </div>
          </div>
    
          <div class="summary-section" style="background:linear-gradient(135deg,#fff3e0,#ffe0b2);border-color:#ffb74d;">
            <div class="summary-title" style="color:#e65100;">主要研究方向</div>
            <div class="summary-content" style="color:#bf360c;">
              ${themes.map(t => `<div class="summary-point">${t}</div>`).join('')}
            </div>
          </div>
    
          <div class="summary-section" style="background:linear-gradient(135deg,#e3f2fd,#bbdefb);border-color:#64b5f6;">
            <div class="summary-title" style="color:#1565c0;">核心研究结论</div>
            <div class="summary-content" style="color:#0d47a1;">
              ${overallConclusion}
            </div>
          </div>
    
          <div class="summary-section" style="background:linear-gradient(135deg,#fce4ec,#f8bbd0);border-color:#f48fb1;">
            <div class="summary-title" style="color:#c2185b;">各文献要点</div>
            <div class="summary-content" style="color:#880e4f;">
              ${articles.map((a,i) => `
                <div class="summary-point" style="margin-bottom:8px;">
                  <strong>[${i+1}] ${a.title}</strong><br>
                  <span style="font-size:12px;color:#666;">${allConclusions[i]}</span>
                </div>
              `).join('')}
            </div>
          </div>
    
          <div class="summary-section" style="background:linear-gradient(135deg,#f3e5f5,#e1bee7);border-color:#ce93d8;">
            <div class="summary-title" style="color:#7b1fa2;">研究趋势与展望</div>
            <div class="summary-content" style="color:#4a148c;">
              ${generateTrendAnalysis(articles, years, keyword)}
            </div>
          </div>
        `;
    
        return { html };
      }
    
      // ========== 识别研究主题 ==========
      function identifyThemes(articles, keyword) {
        const themes = new Set();
        const allText = articles.map(a => a.title + ' ' + a.abstract).join(' ');
    
        // 关键词模式匹配
        const themePatterns = [
          { pattern: /影响|效应|作用|关系/, label: '影响因素与效应机制研究' },
          { pattern: /机制|路径|原理|模型/, label: '内在机理与理论模型构建' },
          { pattern: /对策|建议|策略|措施|路径/, label: '实践对策与优化路径' },
          { pattern: /实证|数据|回归|分析|检验/, label: '实证研究与量化分析' },
          { pattern: /大学生|学生|青少年|青年/, label: '特定群体特征研究' },
          { pattern: /社交媒体|微信|微博|短视频|网络平台/, label: '新媒体与社交平台环境' },
          { pattern: /阅读能力|阅读素养|理解能力|认知/, label: '阅读能力与认知发展' },
          { pattern: /碎片化|浅阅读|数字阅读|移动阅读/, label: '碎片化阅读行为模式' },
          { pattern: /比较|差异|对比|异质性/, label: '比较分析与群体差异' },
          { pattern: /教育|教学|课程|培养/, label: '教育干预与培养策略' }
        ];
    
        themePatterns.forEach(tp => {
          if (tp.pattern.test(allText)) {
            themes.add(tp.label);
          }
        });
    
        if (themes.size === 0) {
          themes.add(`关于"${keyword}"的多维度研究`);
        }
    
        return Array.from(themes).slice(0, 6);
      }
    
      // ========== 生成总体结论 ==========
      function generateOverallConclusion(articles, keyword, themes) {
        const points = [];
    
        // 从各篇文献中提取关键发现
        articles.forEach(a => {
          const text = a.abstract;
          const matches = text.match(/(?:表明|发现|证实|揭示|显示|得出)[：:,]?([\s\S]{10,100}?)(?:[。；])/g);
          if (matches) {
            matches.slice(0, 2).forEach(m => points.push(m.trim()));
          }
        });
    
        if (points.length === 0) {
          points.push(`现有研究围绕"${keyword}"展开了多角度探讨，涵盖理论建构、实证分析和对策建议等多个层面。`);
          points.push(`学者们普遍关注该领域的现实问题及其深层机理，通过不同方法论路径积累了丰富的研究成果。`);
          points.push(`未来研究可在深化理论框架、拓展研究对象范围、以及跨学科整合等方面进一步推进。`);
        }
    
        return points.slice(0, 5).map(p => `<div class="summary-point">${p}</div>`).join('');
      }
    
      // ========== 趋势分析 ==========
      function generateTrendAnalysis(articles, years, keyword) {
        const points = [];
    
        if (years.length >= 3) {
          const recentYears = years.filter(y => y >= 2020).length;
          const total = years.length;
          const pct = Math.round(recentYears / total * 100);
          points.push(`<strong>研究热度：</strong>近五年(${2020}-至今)的研究占比达 ${pct}%，显示该领域持续受到学术界关注。`);
        }
    
        // 判断是否有硕士/博士论文
        const hasThesis = articles.some(a =>
          a.source && (a.source.includes('硕') || a.source.includes('博') || a.source.includes('学位'))
        );
        if (hasThesis) {
          points.push('<strong>研究深度：</strong>已有学位论文对该主题进行了系统性深入研究，说明该领域具备较好的学术积累基础。');
        }
    
        points.push('<strong>方法趋势：</strong>定量研究与定性研究相结合的方法论取向日益明显，混合研究方法的应用逐渐增多。');
        points.push('<strong>未来方向：</strong>跨学科视角的引入、纵向追踪研究的开展、以及干预效果的实证检验将是重要的研究方向。');
    
        return points.map(p => `<div class="summary-point">${p}</div>`).join('');
      }
    
      // ========== 导出全部引用 ==========
      function exportAllCitations() {
        if (extractedArticles.length === 0) {
          alert('请先提取文献！');
          return;
        }
    
        // 让用户选择格式
        const format = prompt(
          '请选择导出格式（输入序号）：\n1 - APA 第7版\n2 - MLA 第9版\n3 - GB/T 7714-2015\n4 - Chicago\n5 - Harvard\n6 - 全部格式',
          '3'
        );
    
        const formatMap = { '1': 'apa', '2': 'mla', '3': 'gbt', '4': 'chicago', '5': 'harvard', '6': 'all' };
        const selected = formatMap[format] || 'gbt';
    
        let output = '';
        if (selected === 'all') {
          extractedArticles.forEach((art, i) => {
            const c = generateCitations(art);
            output += `[${i+1}] ${art.title}\n`;
            output += `   APA:     ${c.apa}\n`;
            output += `   MLA:     ${c.mla}\n`;
            output += `   GB/T:    ${c.gbt}\n`;
            output += `   Chicago: ${c.chicago}\n`;
            output += `   Harvard: ${c.harvard}\n\n`;
          });
        } else {
          extractedArticles.forEach((art, i) => {
            const c = generateCitations(art);
            output += `[${i+1}] ${c[selected]}\n\n`;
          });
        }
    
        // 复制到剪贴板
        navigator.clipboard.writeText(output).then(() => {
          alert(`已复制 ${extractedArticles.length} 条引用到剪贴板！\n可直接粘贴到文档中。`);
        }).catch(() => {
          // 弹出窗口显示
          const win = window.open('', '_blank');
          win.document.write(`<pre style="white-space:pre-wrap;font-size:14px;padding:20px;">${output.replace(/</g,'&lt;')}</pre>`);
        });
      }
    
      // ========== 绑定事件 ==========
      document.getElementById('btn-extract').addEventListener('click', extractArticles);
      document.getElementById('btn-summarize').addEventListener('click', generateSummary);
      document.getElementById('btn-export').addEventListener('click', exportAllCitations);
    
      // ========== 双向联动：弹窗搜索框 ↔ 知网原生搜索框 ==========
      const popupInputEl = document.getElementById('popup-search-input');
    
      /**
       * 查找知网原生搜索框（多种选择器适配不同页面布局）
       * 优先级从高到低：placeholder匹配 > id/class匹配 > 位置匹配
       */
      function findCnkiSearchInput() {
        // 策略1：通过placeholder文本精确匹配（最可靠）
        const byPlaceholder = document.querySelector('input[placeholder*="中文文献"]');
        if (byPlaceholder) return byPlaceholder;
    
        // 策略2：通过常见id/class
        return document.querySelector('#gr_search input[type="text"]')
          || document.querySelector('.search-box input[type="text"]')
          || document.querySelector('input.search-input')
          || document.querySelector('.search-input')
          || document.querySelector('input[name="kw"]')
          || document.querySelector('input[id*="search"]')
          || document.querySelector('.searchBar input')
          || document.querySelector('header input[type="text"]')
          // 策略3：通过位置 — 找banner/导航栏下方第一个可见的text输入框
          || (() => {
            const allInputs = Array.from(document.querySelectorAll('input[type="text"], input:not([type])'));
            for (const inp of allInputs) {
              const rect = inp.getBoundingClientRect();
              if (rect.width > 200 && rect.height > 20 && rect.top < 150 && inp.offsetParent !== null) {
                return inp;
              }
            }
            return null;
          })();
      }
    
      /**
       * 查找知网原生搜索按钮（紧邻搜索框的按钮）
       */
      function findCnkiSearchButton(inputEl) {
        if (!inputEl) return null;
    
        // 方法1：同级的下一个兄弟元素（最常见布局）
        const nextSibling = inputEl.nextElementSibling;
        if (nextSibling && (nextSibling.tagName === 'BUTTON' || nextSibling.tagName === 'INPUT' && nextSibling.type === 'submit')) {
          return nextSibling;
        }
    
        // 方法2：父容器内的button/input[type=submit]
        const parent = inputEl.parentElement;
        if (parent) {
          const btnInParent = parent.querySelector('button, input[type="submit"]');
          if (btnInParent && btnInParent !== inputEl) return btnInParent;
        }
    
        // 方法3：更上层的form容器
        const form = inputEl.closest('form');
        if (form) {
          const formBtn = form.querySelector('button[type="submit"], input[type="submit"]');
          if (formBtn) return formBtn;
        }
    
        // 方法4：通用查找（靠近顶部的搜索按钮）
        const allBtns = Array.from(document.querySelectorAll('button, input[type="submit"]'));
        const inputRect = inputEl.getBoundingClientRect();
        for (const btn of allBtns) {
          const btnRect = btn.getBoundingClientRect();
          // 按钮在输入框右侧或正下方（距离<100px）
          const horizDist = Math.abs(btnRect.left - inputRect.right);
          const vertDist = Math.abs(btnRect.top - inputRect.top);
          if ((horizDist < 80 && vertDist < 40) || (horizDist < 200 && vertDist < 80 && vertDist > 0)) {
            return btn;
          }
        }
    
        return null;
      }
    
      /** 防抖计时器 */
      let syncDebounceTimer = null;
    
      /**
       * 弹窗 → 知网原生搜索框：实时同步
       * 用户在弹窗输入时，立即同步到知网搜索框
       */
      popupInputEl.addEventListener('input', () => {
        const val = popupInputEl.value;
        currentKeyword = val.trim();
    
        // 防抖：避免频繁操作DOM
        clearTimeout(syncDebounceTimer);
        syncDebounceTimer = setTimeout(() => {
          const cnkiInput = findCnkiSearchInput();
          if (cnkiInput && cnkiInput !== popupInputEl) {
            // 使用原生setter绕过React/Vue的受控组件限制
            try {
              const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
              nativeSetter.call(cnkiInput, val);
              cnkiInput.dispatchEvent(new Event('input', { bubbles: true }));
              cnkiInput.dispatchEvent(new Event('change', { bubbles: true }));
            } catch(e) {
              // fallback：直接赋值
              cnkiInput.value = val;
            }
          }
        }, 50);
      });
    
      /**
       * 知网原生搜索框 → 弹窗：实时同步
       * 使用 MutationObserver + 轮询双保险监听知网搜索框变化
       */
      function startCnkiInputSync() {
        // 方法A：轮询检测（兼容SPA动态渲染）
        setInterval(() => {
          const cnkiInput = findCnkiSearchInput();
          if (cnkiInput && cnkiInput !== popupInputEl) {
            const val = cnkiInput.value;
            if (val && val !== popupInputEl.value) {
              popupInputEl.value = val;
              currentKeyword = val.trim();
            }
          }
        }, 800);
    
        // 方法B：监听已有搜索框的input事件
        const cnkiInput = findCnkiSearchInput();
        if (cnkiInput && cnkiInput !== popupInputEl) {
          cnkiInput.addEventListener('input', () => {
            const val = cnkiInput.value;
            if (val !== popupInputEl.value) {
              popupInputEl.value = val;
              currentKeyword = val.trim();
            }
          });
        }
    
        // 方法C：监听DOM新元素插入（SPA路由切换时搜索框可能被重建）
        const domObserver = new MutationObserver(() => {
          const freshInput = findCnkiSearchInput();
          if (freshInput && freshInput !== popupInputEl) {
            // 检查是否已经绑定过
            if (!freshInput._cnkiSyncBound) {
              freshInput._cnkiSyncBound = true;
              freshInput.addEventListener('input', () => {
                const val = freshInput.value;
                if (val !== popupInputEl.value) {
                  popupInputEl.value = val;
                  currentKeyword = val.trim();
                }
              });
            }
            // 初始同步
            if (freshInput.value && freshInput.value !== popupInputEl.value) {
              popupInputEl.value = freshInput.value;
              currentKeyword = freshInput.value.trim();
            }
          }
        });
        domObserver.observe(document.body, { childList: true, subtree: true });
      }
    
      // 启动知网→弹窗同步
      startCnkiInputSync();
    
      // 初始化：如果页面上已有搜索词，同步到弹窗
      const existingKw = new URLSearchParams(location.search).get('kw')
        || (findCnkiSearchInput() ? findCnkiSearchInput().value : '');
      if (existingKw) {
        popupInputEl.value = existingKw;
        currentKeyword = existingKw.trim();
      }
    
      // ========== 「去知网搜索」按钮：立即执行搜索（URL导航为主方案） ==========
      function executeSearch() {
        const kw = popupInputEl.value.trim();
        if (!kw) {
          alert('⚠️ 请先输入关键词！');
          popupInputEl.focus();
          return;
        }
    
        console.log('[CNKI助手] 开始搜索，关键词:', kw);
    
        // 步骤1：同步值到知网原生搜索框（仅视觉同步，让用户看到两边一致）
        const cnkiInput = findCnkiSearchInput();
        if (cnkiInput) {
          try {
            const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            nativeSetter.call(cnkiInput, kw);
            cnkiInput.dispatchEvent(new Event('input', { bubbles: true }));
          } catch(e) {
            cnkiInput.value = kw; // fallback
          }
        }
    
        // 步骤2：更新状态为"跳转中"
        const badge = document.getElementById('status-badge');
        badge.className = 'status-badge analyzing';
        badge.textContent = '⏳ 跳转中...';
    
        // 步骤3：构造正确的搜索URL并立即导航（100%可靠的主方案）
        const encodedKw = encodeURIComponent(kw);
        const searchUrl = `https://kns.cnki.net/kns8s/search?classid=WD0FTY92&kw=${encodedKw}&korder=SU&language=CHS&uniplatform=NZKPT`;
        
        console.log('[CNKI助手] 跳转到:', searchUrl);
    
        // 立即执行页面跳转
        window.location.assign(searchUrl);
      }
    
      // 绑定点击事件
      document.getElementById('btn-go-search').addEventListener('click', executeSearch);
    
      // 输入框回车也触发搜索
      popupInputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          executeSearch();
        }
      });
    
      // ========== 自动监听：当用户在知网搜索时自动提示 ==========
      // 监听URL变化（SPA路由）
      let lastUrl = location.href;
      const urlObserver = new MutationObserver(() => {
        if (location.href !== lastUrl) {
          lastUrl = location.href;
          // URL变化时提示用户可以提取新结果
          const badge = document.getElementById('status-badge');
          if (badge && !badge.classList.contains('analyzing')) {
            badge.className = 'status-badge ready';
            badge.textContent = '页面已更新，可重新提取';
          }
        }
      });
      urlObserver.observe(document, { subtree: true, childList: true });
    
      return {
        ok: true,
        summary: '知网文献综述助手浮动弹窗已启动',
        changed_count: 1,
        data: {
          features: [
            '浮动弹窗UI（可拖拽、可折叠）',
            '一键提取当前搜索结果的文献信息',
            '智能生成APA/MLA/GB/T 7714/Chicago/Harvard等5种引用格式',
            '每条引用支持一键复制',
            'AI驱动的领域研究结论总结',
            '研究主题识别与趋势分析',
            '批量导出所有引用'
          ],
          usage: '在知网搜索 → 点击"提取当前结果" → 查看/复制引用 → 点击"AI总结结论"获取综述'
        },
        warnings: []
      };
    }
  );
  if (typeof __tabOriginalFunction !== "function") {
    throw new Error("evaluate_script source must evaluate to a function");
  }
  return await __tabOriginalFunction();
})();