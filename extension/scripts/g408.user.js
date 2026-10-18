(async function __tabEvaluateScriptBridge() {
  const __tabScriptArgs = null;
  const __tabOriginalFunction = (
    /**
     * 📖 电子书智能书摘助手 (EBook Smart Quote Extractor)
     * 
     * 功能说明：
     * 1. 自动识别当前页面的电子书文字内容
     * 2. 智能提取书籍名称（从标题、header等位置）
     * 3. 自动检测当前页码
     * 4. 生成带格式的可复制文本（含书籍名+页码+摘录内容）
     * 5. 提供浮动UI面板，支持一键复制、选中文字提取、手动编辑
     * 
     * 适用场景：网页版电子书阅读器、PDF在线阅读、epub阅读器等
     * 
     * 使用方法：在电子书阅读页面执行此脚本，面板会自动出现
     */
    
    async function run(args = {}) {
      // ========== 配置项 ==========
      const CONFIG = {
        panelId: 'ebook-extractor-panel',
        panelTitle: '📖 电子书智能书摘',
        primaryColor: '#4f46e5',
        bgColor: '#ffffff',
        textColor: '#1f2937',
        borderColor: '#e5e7eb',
        shadowColor: 'rgba(0,0,0,0.15)',
        fontSize: '14px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
      };
    
      // ========== 工具函数 ==========
    
      /**
       * 智能识别书籍名称
       * 从多个常见位置尝试提取书籍标题
       */
      function detectBookTitle() {
        const candidates = [];
    
        // 1. document.title
        if (document.title && document.title.trim()) {
          candidates.push({ source: 'document.title', text: document.title.trim(), priority: 10 });
        }
    
        // 2. 常见的标题元素选择器
        const titleSelectors = [
          'h1.book-title', 'h1.title', '.book-title', '.book-name',
          '[class*="book-title"]', '[class*="bookName"]', '[id*="book-title"]',
          '.reader-title', '.ebook-title', '.publication-title',
          'header h1', 'header [class*="title"]',
          '.header-title', '.work-title', '.novel-title',
          'h1:first-of-type', '.content-header h1',
          '[data-book-title]', '[data-title]',
          // Kindle Web Reader / Common e-reader patterns
          '.library-title', '#bookTitle', '.bookInfo_title',
          // 超星/读秀等中文平台
          '.introinfo h1', '.detail h1', '.book_info h2',
          // 通用PDF阅读器
          '#filename', '.pdf-title', '.file-name'
        ];
    
        for (const sel of titleSelectors) {
          try {
            const el = document.querySelector(sel);
            if (el && el.textContent && el.textContent.trim()) {
              const text = el.textContent.trim();
              if (text.length > 1 && text.length < 200) {
                candidates.push({ source: sel, text, priority: 8 });
              }
            }
          } catch (e) { /* ignore */ }
        }
    
        // 3. Open Graph / meta tags
        const metaSelectors = [
          { sel: 'meta[property="og:title"]', attr: 'content' },
          { sel: 'meta[name="title"]', attr: 'content' },
          { sel: 'meta[name="book"]', attr: 'content' },
          { sel: 'meta[name="citation.title"]', attr: 'content' },
          { sel: 'meta[name="dc.Title"]', attr: 'content' },
          { sel: 'meta[name="bibtex.title"]', attr: 'content' }
        ];
        for (const { sel, attr } of metaSelectors) {
          try {
            const el = document.querySelector(sel);
            if (el && el.getAttribute(attr)) {
              candidates.push({ source: sel, text: el.getAttribute(attr).trim(), priority: 9 });
            }
          } catch (e) { /* ignore */ }
        }
    
        // 4. 清理候选标题（去除网站名后缀等）
        const cleanedCandidates = candidates.map(c => {
          let text = c.text;
          // 去除常见的网站后缀
          const suffixes = [
            /\s*[-|–—]\s*(Google\s*Books|Amazon\.com|Kindle|豆瓣读书|超星|读秀|京东图书|当当网|微信读书|知乎|百度百科)\s*$/i,
            /\s*[-|–—]\s*(在线阅读|免费阅读|电子书|PDF|全文阅读)\s*$/i,
            /\s*[-|–—]\s*(第\s*\d+\s*页)*\s*$/
          ];
          for (const regex of suffixes) {
            text = text.replace(regex, '');
          }
          return { ...c, text: text.trim() };
        }).filter(c => c.text.length > 1);
    
        // 按优先级排序，返回最佳匹配
        cleanedCandidates.sort((a, b) => b.priority - a.priority);
        
        return cleanedCandidates.length > 0 ? cleanedCandidates[0].text : '未知书籍';
      }
    
      /**
       * 智能检测页码
       * 从多个常见位置尝试提取当前页码
       */
      function detectPageNumber() {
        const candidates = [];
    
        // 1. 常见页码选择器
        const pageSelectors = [
          '.page-num', '.page-number', '.pageNum', '.currentPage',
          '[class*="page-num"]', '[class*="pageNumber"]', '[class*="page_num"]',
          '[id*="page-num"]', '#pageNumber', '#pageNo',
          '.reader-page', '.current-page', '.page-indicator',
          '.page-display', '.page-info', '.pagination-current',
          'span.page', '.viewer-page-count',
          // PDF阅读器常见选择器
          '#pageInput', 'input[type="number"][title*="页"]',
          '[class*="toolbar"] [class*="page"]',
          // 中文阅读器
          '.ye-num', '.num', '.p-num', '.cur-page',
          // 通用模式
          '[data-page]', '[data-current-page]'
        ];
    
        for (const sel of pageSelectors) {
          try {
            const els = document.querySelectorAll(sel);
            els.forEach(el => {
              const text = el.textContent || el.value || '';
              const match = text.match(/(\d+)/);
              if (match) {
                const num = parseInt(match[1], 10);
                if (num > 0 && num < 100000) {
                  candidates.push({ source: sel + ':' + text, num, priority: el.closest('.toolbar,.pagination,[role="navigation"]') ? 8 : 6 });
                }
              }
              // data 属性
              const dataPage = el.getAttribute('data-page') || el.getAttribute('data-current-page');
              if (dataPage) {
                const match = String(dataPage).match(/(\d+)/);
                if (match) {
                  candidates.push({ source: sel + '[data]', num: parseInt(match[1], 10), priority: 9 });
                }
              }
            });
          } catch (e) { /* ignore */ }
        }
    
        // 2. URL中的页码参数
        try {
          const urlMatch = window.location.search.match(/[?&](page|p|pg|pageno|page_num)=(\d+)/i);
          if (urlMatch) {
            candidates.push({ source: 'URL param', num: parseInt(urlMatch[2], 10), priority: 7 });
          }
          // 路径中的页码如 /page/123
          const pathMatch = window.location.pathname.match(/\/(?:page|p|pg)\/(\d+)/i);
          if (pathMatch) {
            candidates.push({ source: 'URL path', num: parseInt(pathMatch[1], 10), priority: 7 });
          }
        } catch (e) { /* ignore */ }
    
        // 3. 全文正则搜索可见文本中的页码指示
        try {
          const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            { acceptNode: (node) => node.textContent.length < 50 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT }
          );
          const pagePatterns = [
            /(?:第?\s*)(\d+)\s*(?:页|P|p)/g,
            /(?:\/\s*|共\s*|of\s*)(\d+)\s*(?:页)?$/gm,
            /^(\d+)\s*\/\s*\d+\s*$/gm
          ];
          while (walker.nextNode()) {
            const text = walker.currentNode.textContent.trim();
            for (const pattern of pagePatterns) {
              pattern.lastIndex = 0;
              const match = pattern.exec(text);
              if (match) {
                candidates.push({ source: 'text:' + text, num: parseInt(match[1], 10), priority: 5 });
              }
            }
          }
        } catch (e) { /* ignore */ }
    
        // 选择最佳页码（优先级最高的合理值）
        candidates.sort((a, b) => b.priority - a.priority);
    
        return candidates.length > 0 ? candidates[0].num : null;
      }
    
      /**
       * 提取页面主要内容文字
       * 智能识别正文区域，排除导航、广告、侧边栏等噪音
       */
      function extractMainContent() {
        // 尝试找到正文容器
        const contentSelectors = [
          // 电子书阅读器正文区
          '.reader-content', '.reading-content', '.book-content',
          '.text-content', '.article-content', '.chapter-content',
          '#content', '#mainContent', '#readContent',
          '[class*="content"]', '[class*="article"]', '[class*="chapter"]',
          '[class*="reader-text"]', '[class*="read-content"]',
          '.viewerArea', '.pdfViewer .page', '.textLayer',
          // 中文电子书平台
          '.introinfo', '.detail_content', '.book_text',
          '#contentBody', '#txt', '#chapterContent',
          // 通用语义标签
          'main', 'article', '[role="main"]', '[role="article"]',
          '.post-content', '.entry-content', '.prose'
        ];
    
        let bestContainer = null;
        let bestScore = 0;
    
        for (const sel of contentSelectors) {
          try {
            const els = document.querySelectorAll(sel);
            els.forEach(el => {
              // 计算得分：文字数量 + 是否在视口内
              const textLen = el.textContent.replace(/\s+/g, '').length;
              const rect = el.getBoundingClientRect();
              const inViewport = rect.width > 200 && rect.height > 100;
              const score = textLen * (inViewport ? 1.5 : 0.5);
              
              // 排除太小的或可能是导航的元素
              if (textLen > 50 && score > bestScore) {
                // 检查是否包含大量链接（可能是导航）
                const links = el.querySelectorAll('a').length;
                const linkRatio = links / (textLen / 10);
                if (linkRatio < 0.3) {
                  bestScore = score;
                  bestContainer = el;
                }
              }
            });
          } catch (e) { /* ignore */ }
        }
    
        // 如果没找到合适的容器，用 body
        if (!bestContainer) {
          bestContainer = document.body;
        }
    
        // 提取并清理文本
        return cleanExtractedText(bestContainer);
      }
    
      /**
       * 清理提取的文本
       */
      function cleanExtractedText(container) {
        // 克隆节点以避免修改原始DOM
        const clone = container.cloneNode(true);
    
        // 移除不需要的元素
        const removeSelectors = [
          'script', 'style', 'noscript', 'iframe',
          'nav', 'header', 'footer', 'aside',
          '[class*="nav"]', '[class*="sidebar"]', '[class*="menu"]',
          '[class*="comment"]', '[class*="ad-"]', '[class*="advertisement"]',
          '[role="navigation"]', '[role="complementary"]',
          '.toolbar', '.controls', '.control-bar',
          'button', 'input', 'select', 'textarea',
          '[class*="share"]', '[class*="social"]', '[class*="related"]'
        ];
        removeSelectors.forEach(sel => {
          try {
            clone.querySelectorAll(sel).forEach(el => el.remove());
          } catch (e) { /* ignore */ }
        });
    
        // 获取文本内容并清理
        let text = clone.textContent || '';
    
        // 清理空白
        text = text
          .replace(/\t/g, ' ')
          .replace(/[ \u00A0]+/g, ' ')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
    
        // 如果文本太长，截取合理的长度（约3000字）
        if (text.length > 3000) {
          text = text.substring(0, 3000) + '\n\n...(文本过长，已截取部分内容)';
        }
    
        return text;
      }
    
      /**
       * 获取用户选中的文字
       */
      function getSelectedText() {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || !selection.toString().trim()) {
          return null;
        }
        return selection.toString().trim();
      }
    
      // ========== UI 面板创建 ==========
    
      function createPanel() {
        // 移除已存在的面板
        const existing = document.getElementById(CONFIG.panelId);
        if (existing) existing.remove();
    
        // 创建面板容器
        const panel = document.createElement('div');
        panel.id = CONFIG.panelId;
        panel.setAttribute('style', `
          position: fixed;
          top: 20px;
          right: 20px;
          width: 420px;
          max-height: 70vh;
          background: ${CONFIG.bgColor};
          border-radius: 12px;
          box-shadow: 0 8px 32px ${CONFIG.shadowColor}, 0 2px 8px rgba(0,0,0,0.08);
          border: 1px solid ${CONFIG.borderColor};
          font-family: ${CONFIG.fontFamily};
          font-size: ${CONFIG.fontSize};
          color: ${CONFIG.textColor};
          z-index: 2147483647;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          transition: all 0.3s ease;
        `);
    
        panel.innerHTML = `
          <!-- 标题栏 -->
          <div style="
            display: flex; align-items: center; justify-content: space-between;
            padding: 14px 18px; background: linear-gradient(135deg, ${CONFIG.primaryColor}, #7c3aed);
            color: white; cursor: move; user-select: none;
            border-radius: 12px 12px 0 0;
          ">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 20px;">📖</span>
              <span style="font-weight: 600; font-size: 15px;">${CONFIG.panelTitle}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <button id="${CONFIG.panelId}-minimize" title="最小化" style="
                background: rgba(255,255,255,0.2); border: none; color: white;
                width: 26px; height: 26px; border-radius: 6px; cursor: pointer;
                font-size: 16px; display: flex; align-items: center; justify-content: center;
              ">−</button>
              <button id="${CONFIG.panelId}-close" title="关闭" style="
                background: rgba(255,255,255,0.2); border: none; color: white;
                width: 26px; height: 26px; border-radius: 6px; cursor: pointer;
                font-size: 16px; display: flex; align-items: center; justify-content: center;
              ">✕</button>
            </div>
          </div>
    
          <!-- 书籍信息栏 -->
          <div id="${CONFIG.panelId}-info" style="
            padding: 12px 18px; background: #f8fafc; border-bottom: 1px solid ${CONFIG.borderColor};
            display: flex; flex-direction: column; gap: 6px;
          ">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="color: #6b7280; font-size: 12px; min-width: 42px;">📚 书名</span>
              <input id="${CONFIG.panelId}-book-input" type="text" value="检测中..." style="
                flex: 1; padding: 4px 10px; border: 1px solid #d1d5db; border-radius: 6px;
                font-size: 13px; color: ${CONFIG.textColor}; outline: none;
                transition: border-color 0.2s;
              " onfocus="this.style.borderColor='${CONFIG.primaryColor}'" onblur="this.style.borderColor='#d1d5db'" />
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="color: #6b7280; font-size: 12px; min-width: 42px;">📄 页码</span>
              <input id="${CONFIG.panelId}-page-input" type="text" value="检测中..." placeholder="自动检测/手动输入" style="
                flex: 1; padding: 4px 10px; border: 1px solid #d1d5db; border-radius: 6px;
                font-size: 13px; color: ${CONFIG.textColor}; outline: none; width: 80px;
                transition: border-color 0.2s;
              " onfocus="this.style.borderColor='${CONFIG.primaryColor}'" onblur="this.style.borderColor='#d1d5db'" />
              <span id="${CONFIG.panelId}-selected-hint" style="
                font-size: 11px; color: #059669; background: #ecfdf5; padding: 2px 8px;
                border-radius: 10px; display: none;
              ">✨ 已选中文字</span>
            </div>
          </div>
    
          <!-- 操作按钮栏 -->
          <div style="
            padding: 10px 18px; display: flex; gap: 8px; border-bottom: 1px solid ${CONFIG.borderColor};
            flex-wrap: wrap;
          ">
            <button id="${CONFIG.panelId}-btn-extract" style="
              padding: 7px 16px; background: ${CONFIG.primaryColor}; color: white; border: none;
              border-radius: 7px; cursor: pointer; font-size: 13px; font-weight: 500;
              transition: all 0.2s; display: flex; align-items: center; gap: 4px;
            ">🔍 提取全文</button>
            <button id="${CONFIG.panelId}-btn-selection" style="
              padding: 7px 16px; background: #059669; color: white; border: none;
              border-radius: 7px; cursor: pointer; font-size: 13px; font-weight: 500;
              transition: all 0.2s; display: flex; align-items: center; gap: 4px;
            ">📝 提取选中</button>
            <button id="${CONFIG.panelId}-btn-copy" style="
              padding: 7px 16px; background: #f59e0b; color: white; border: none;
              border-radius: 7px; cursor: pointer; font-size: 13px; font-weight: 500;
              transition: all 0.2s; display: flex; align-items: center; gap: 4px;
            ">📋 复制结果</button>
            <button id="${CONFIG.panelId}-btn-clear" style="
              padding: 7px 12px; background: #e5e7eb; color: #374151; border: none;
              border-radius: 7px; cursor: pointer; font-size: 13px;
              transition: all 0.2s;
            ">清空</button>
          </div>
    
          <!-- 文本输出区域 -->
          <div style="flex: 1; overflow: auto; padding: 12px 18px;">
            <textarea id="${CONFIG.panelId}-output" placeholder="
    👆 点击「提取全文」自动提取当前页面文字
    👆 或先选中页面上的精美语句，再点击「提取选中」
    👆 提取后点击「复制结果」即可粘贴到任何地方
    
    💡 提示：
    • 书名和页码可以手动修改
    • 支持拖拽移动此面板
    • 按 Esc 键快速关闭面板
            " style="
              width: 100%; height: 280px; padding: 12px; border: 1px solid ${CONFIG.borderColor};
              border-radius: 8px; resize: vertical; font-size: 13px; line-height: 1.7;
              color: ${CONFIG.textColor}; outline: none; font-family: inherit;
              background: #fafafa; box-sizing: border-box;
              transition: border-color 0.2s;
            " onfocus="this.style.borderColor='${CONFIG.primaryColor}';this.background='#fff'"
               onblur="this.style.borderColor='${CONFIG.borderColor}';this.background='#fafafa'"
            ></textarea>
          </div>
    
          <!-- 底部状态栏 -->
          <div id="${CONFIG.panelId}-status" style="
            padding: 8px 18px; background: #f8fafc; border-top: 1px solid ${CONFIG.borderColor};
            font-size: 11px; color: #9ca3af; display: flex; justify-content: space-between;
          ">
            <span>就绪 — 在电子书阅读页面使用效果最佳</span>
            <span id="${CONFIG.panelId}-char-count">0 字</span>
          </div>
        `;
    
        document.body.appendChild(panel);
    
        // ===== 绑定事件 =====
    
        // 拖拽功能
        const header = panel.querySelector(`#${CONFIG.panelId}-minimize`).parentElement;
        let isDragging = false, dragOffsetX = 0, dragOffsetY = 0;
        header.addEventListener('mousedown', (e) => {
          if (e.target.tagName === 'BUTTON') return;
          isDragging = true;
          dragOffsetX = e.clientX - panel.offsetLeft;
          dragOffsetY = e.clientY - panel.offsetTop;
          panel.style.transition = 'none';
        });
        document.addEventListener('mousemove', (e) => {
          if (!isDragging) return;
          const x = Math.max(0, Math.min(window.innerWidth - panel.offsetWidth, e.clientX - dragOffsetX));
          const y = Math.max(0, Math.min(window.innerHeight - panel.offsetHeight, e.clientY - dragOffsetY));
          panel.style.left = x + 'px';
          panel.style.top = y + 'px';
          panel.style.right = 'auto';
        });
        document.addEventListener('mouseup', () => { isDragging = false; panel.style.transition = ''; });
    
        // 最小化/关闭
        panel.querySelector(`#${CONFIG.panelId}-minimize`).addEventListener('click', () => {
          const body = panel.querySelector(`#${CONFIG.panelId}-output`).parentElement;
          const status = panel.querySelector(`#${CONFIG.panelId}-status`);
          const info = panel.querySelector(`#${CONFIG.panelId}-info`);
          const btnBar = panel.querySelector(`#${CONFIG.panelId}-output`).parentElement.previousElementSibling;
          if (body.style.display === 'none') {
            body.style.display = '';
            status.style.display = '';
            info.style.display = '';
            btnBar.style.display = '';
            panel.style.maxHeight = '70vh';
          } else {
            body.style.display = 'none';
            status.style.display = 'none';
            info.style.display = 'none';
            btnBar.style.display = 'none';
            panel.style.maxHeight = 'none';
          }
        });
        panel.querySelector(`#${CONFIG.panelId}-close`).addEventListener('click', () => panel.remove());
    
        // 提取全文按钮
        panel.querySelector(`#${CONFIG.panelId}-btn-extract`).addEventListener('click', () => {
          const bookTitle = panel.querySelector(`#${CONFIG.panelId}-book-input`).value.trim();
          const pageNum = panel.querySelector(`#${CONFIG.panelId}-page-input`).value.trim();
          const content = extractMainContent();
    
          let output = '';
          if (bookTitle && bookTitle !== '未知书籍') {
            output += `《${bookTitle}》`;
            if (pageNum) output += ` — 第 ${pageNum} 页`;
            output += '\n' + '─'.repeat(30) + '\n\n';
          }
          output += content;
    
          const textarea = panel.querySelector(`#${CONFIG.panelId}-output`);
          textarea.value = output;
          updateCharCount(textarea.value);
          showStatus('✅ 已提取页面全部文字内容');
        });
    
        // 提取选中文字按钮
        panel.querySelector(`#${CONFIG.panelId}-btn-selection`).addEventListener('click', () => {
          const selected = getSelectedText();
          if (!selected) {
            showStatus('⚠️ 请先在页面上选中要提取的文字（鼠标拖选）');
            return;
          }
    
          const bookTitle = panel.querySelector(`#${CONFIG.panelId}-book-input`).value.trim();
          const pageNum = panel.querySelector(`#${CONFIG.panelId}-page-input`).value.trim();
    
          let output = '';
          if (bookTitle && bookTitle !== '未知书籍') {
            output += `《${bookTitle}》`;
            if (pageNum) output += ` — 第 ${pageNum} 页`;
            output += '\n' + '─'.repeat(30) + '\n\n';
          }
          output += selected;
    
          const textarea = panel.querySelector(`#${CONFIG.panelId}-output`);
          textarea.value = output;
          updateCharCount(textarea.value);
          showStatus(`✅ 已提取选中文字 (${selected.length} 字)`);
        });
    
        // 复制按钮
        panel.querySelector(`#${CONFIG.panelId}-btn-copy`).addEventListener('click', async () => {
          const textarea = panel.querySelector(`#${CONFIG.panelId}-output`);
          if (!textarea.value.trim()) {
            showStatus('⚠️ 没有可复制的内容，请先提取文字');
            return;
          }
          try {
            await navigator.clipboard.writeText(textarea.value);
            showStatus('✅ 已复制到剪贴板！可以直接 Ctrl+V 粘贴');
            const btn = panel.querySelector(`#${CONFIG.panelId}-btn-copy`);
            const origText = btn.innerHTML;
            btn.innerHTML = '✅ 已复制!';
            btn.style.background = '#059669';
            setTimeout(() => { btn.innerHTML = origText; btn.style.background = '#f59e0b'; }, 1500);
          } catch (err) {
            // fallback: 传统复制方式
            textarea.select();
            document.execCommand('copy');
            showStatus('✅ 已复制！（使用了兼容模式）');
          }
        });
    
        // 清空按钮
        panel.querySelector(`#${CONFIG.panelId}-btn-clear`).addEventListener('click', () => {
          panel.querySelector(`#${CONFIG.panelId}-output`).value = '';
          updateCharCount(0);
          showStatus('🗑️ 已清空');
        });
    
        // 字数统计
        function updateCharCount(val) {
          const countEl = panel.querySelector(`#${CONFIG.panelId}-char-count`);
          countEl.textContent = (typeof val === 'string' ? val.length : val) + ' 字';
        }
    
        // 状态提示
        function showStatus(msg) {
          const statusEl = panel.querySelector(`#${CONFIG.panelId}-status span:first-child`);
          statusEl.textContent = msg;
          setTimeout(() => {
            if (statusEl.textContent === msg) statusEl.textContent = '就绪 — 在电子书阅读页面使用效果最佳';
          }, 4000);
        }
    
        // 监听选中变化
        document.addEventListener('selectionchange', () => {
          const selected = getSelectedText();
          const hint = panel.querySelector(`#${CONFIG.panelId}-selected-hint`);
          if (hint) {
            hint.style.display = selected ? 'inline' : 'none';
          }
        });
    
        // ESC 关闭
        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') {
            const p = document.getElementById(CONFIG.panelId);
            if (p) p.remove();
          }
        });
    
        // ===== 自动填充书籍信息 =====
        setTimeout(() => {
          const titleInput = panel.querySelector(`#${CONFIG.panelId}-book-input`);
          const pageInput = panel.querySelector(`#${CONFIG.panelId}-page-input`);
    
          const detectedTitle = detectBookTitle();
          const detectedPage = detectPageNumber();
    
          titleInput.value = detectedTitle;
          pageInput.value = detectedPage ? String(detectedPage) : '';
    
          showStatus(detectedPage 
            ? `✅ 已识别书籍：《${detectedTitle}》第${detectedPage}页` 
            : `✅ 已识别书籍：《${detectedTitle}》（页码未检测到，可手动输入）`
          );
        }, 300);
    
        return panel;
      }
    
      // ========== 主逻辑 ==========
      
      // 创建面板
      const panel = createPanel();
    
      return {
        ok: true,
        summary: `📖 电子书智能书摘助手已启动！面板已显示在右上角。`,
        details: {
          features: [
            '🔍 提取全文 — 自动识别并提取当前页面所有正文文字',
            '📝 提取选中 — 先在页面选中精美语句，再点此按钮精确提取',
            '📋 复制结果 — 一键复制格式化文本（含书名+页码）',
            '✏️ 可编辑 — 书名、页码均可手动修改',
            '🎯 智能识别 — 自动从页面标题、URL、DOM结构中推断书名和页码'
          ],
          usage: '在电子书阅读页面打开此脚本 → 面板自动识别书籍信息 → 选中或提取文字 → 复制粘贴'
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