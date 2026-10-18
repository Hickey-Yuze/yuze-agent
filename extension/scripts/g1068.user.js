/**
 * CSDN 阅读增强脚本
 *
 * @version    1.1.0
 * @author     epiphuany
 * @date       2026-08-29
 * @license    MIT
 *
 * 功能列表：
 *   1. 屏蔽广告（侧边栏广告、推荐位广告、iframe 广告、VIP 推广横幅）
 *   2. 隐藏顶部导航栏
 *   3. 删除左侧栏（用户信息、推荐文章、广告轮播等），文章内容居中显示
 *   4. 屏蔽登录弹窗与"猜你想问"AI 问答框
 *   5. 删除代码块上的"AI写代码""登录复制""运行"按钮
 *   6. 为每个代码块添加绿色"复制"按钮（保留原始换行格式）
 *   7. 解除复制/剪切事件拦截，选中代码后可直接 Ctrl+C 复制
 *   8. 解除代码块文本选中限制，支持手动选中复制
 *   9. 自动展开折叠文章，恢复页面滚动
 *  10. 右上角状态面板（动态倒计时 5→0 秒后自动消失）
 *
 * 用法：复制本脚本至「我的技炉」，在 CSDN 文章页面点击执行
 * 注意：刷新页面后需重新执行
 */

(function () {
  'use strict';

  /** 防重复执行标志 */
  var SCRIPT_FLAG = '__csdnReaderEnhancer';
  if (window[SCRIPT_FLAG]) return;
  window[SCRIPT_FLAG] = true;

  var adCount = 0;
  var processed = new WeakSet();

  /* ========================================================
   * 1. 样式注入
   * ====================================================== */
  var STYLE_ID = 'csdn-reader-enhancer-style';

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    var css = `
      /* 顶部导航栏 */
      #csdn-toolbar, .csdn-toolbar, #csdnTool, .toolbar-wrap,
      header, .header, #header, .csdn-header,
      .csdn-nav, .nav-wrap, .toolbar-contents,
      .csdn-toolbar-contents, .toolbar-content,
      [class*="toolbar"], [class*="Toolbar"] {
        display: none !important;
      }

      /* 代码块原始按钮（AI写代码/登录复制/运行） */
      .hljs-button, .signin, .hljs-signin, .pre-code-toolbar, .code-toolbar,
      .csdn-code-toolbar, .toolbar-ad-ai, .ai-write-code, .hljs-ai-button,
      [class*="ai-code"], [class*="ai-write"], [class*="run-code"],
      [class*="run-code-btn"], [class*="code-run"], [class*="login-copy"],
      [class*="loginCode"], [data-type="ai"], [data-type="run"], [data-type="signin"],
      .code-snippet__toolbar, .snippet-code-show-row, .csdn-code-mp,
      .hljs-code-button, .hljs-signin-code, .code-top, .code-bottom,
      .pre-code-toolbar-item, .code-toolbar-item, .hljs-button-signin,
      .codecopy, .copy-code, .signin-code {
        display: none !important;
      }

      /* 登录弹窗 */
      .passport-login-container, .passport-login-mask, #passportbox,
      .login-mark, .weixin-shadowbox, .feed-Sign-span, .no-login-box,
      .phone-login-box, .signin-guide, .unlogin-comment-tips,
      .login-box, .login-tip, [class*="login-box"], [class*="loginBox"],
      .passport-login-expired, .login-expired, .login-markdown,
      .unlogin-tips, .login-guide-box, .no-login-tips,
      .passport-tip, .tip-box, [class*="unlogin"],
      [class*="loginGuide"], [class*="login-guide"],
      [class*="loginPop"], [class*="login-pop"] {
        display: none !important;
      }

      /* "猜你想问" AI 问答框 */
      .csdn-ai, .ai-dialog, .ai-question-box, .ai-chat-box,
      [class*="ai-helper"], [class*="aiHelper"],
      [class*="guess-question"], [class*="guessQuestion"],
      [class*="csdn-robot"], [class*="csdnRobot"],
      #csdn-ai, #ai-dialog, #aiQuestionBox,
      .robot-box, .robot-dialog, .ask-box, .ask-container,
      .comment-edit-box, .ai-comment-box, .blog_comment_box {
        display: none !important;
      }

      /* 左侧栏 */
      aside, [class*="aside"], [class*="Aside"],
      [class*="sidebar"], [class*="Sidebar"],
      [class*="column-left"], [class*="ColumnLeft"],
      [class*="blog-slider"], [class*="BlogSlider"],
      #blogColumn, #asideProfile, #asideArchive, #asideHotArticle,
      #asideNewComments, #asideNewArticles, #asideCategory, #asideFooter,
      #rightAside, .blog-aside, .aside-content, .aside-box,
      .blog-column-left, .blog_column, .blog-slider-bar,
      [class*="left-aside"], [class*="LeftAside"] {
        display: none !important;
      }

      /* 文章居中布局（打破 flex，强制 block 居中） */
      #mainBox, .main, [class*="main-box"], [class*="mainBox"] {
        display: block !important;
        width: 100% !important; max-width: 860px !important;
        margin: 0 auto !important; padding: 0 !important;
        float: none !important;
      }
      #mainBox > main, #mainBox > .main-content,
      #mainBox > [class*="main-column"], #mainBox > .blog-content-box {
        display: block !important;
        width: 100% !important; max-width: 100% !important;
        margin: 0 auto !important; padding: 0 !important;
        float: none !important; flex: none !important;
      }
      .blog-content-box, .container, .wrap,
      [class*="container"], [class*="wrap"] {
        display: block !important;
        width: 100% !important; max-width: 860px !important;
        margin: 0 auto !important; padding: 0 !important;
        float: none !important;
      }
      #article_content, article, .article-content {
        width: 100% !important; max-width: 100% !important;
        margin: 0 auto !important; padding: 20px !important;
        float: none !important; box-sizing: border-box !important;
      }
      body { padding-top: 0 !important; margin-top: 0 !important; }

      /* 解除代码选中限制 */
      #content_views, #content_views *, .markdown_views, .markdown_views *,
      #article_content, #article_content *, .code-content, .code-content *,
      pre, pre *, code, code * {
        user-select: text !important;
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        pointer-events: auto !important;
      }

      /* 复制按钮 */
      pre { position: relative !important; }
      .csdn-copy-btn {
        position: absolute !important; top: 8px !important; right: 8px !important;
        z-index: 2147483647 !important;
        background: #00a86b !important; color: #fff !important;
        border: none !important; padding: 4px 12px !important;
        border-radius: 4px !important; font-size: 12px !important;
        cursor: pointer !important; opacity: 0.9 !important;
      }
      .csdn-copy-btn:hover { opacity: 1 !important; }
    `;

    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  }

  /* ========================================================
   * 2. 元素删除工具
   * ====================================================== */

  /** 安全删除元素（跳过已处理的，避免重复操作） */
  function safeRemove(el) {
    if (!el || processed.has(el)) return false;
    processed.add(el);
    el.remove();
    adCount++;
    return true;
  }

  /** 按选择器批量删除 */
  function removeBySelectors(selectors) {
    selectors.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el) {
        safeRemove(el);
      });
    });
  }

  /* ========================================================
   * 3. 顶部导航栏删除
   * ====================================================== */
  function removeTopBar() {
    removeBySelectors([
      '#csdn-toolbar', '.csdn-toolbar', '#csdnTool',
      'header', '.header', '#header', '.csdn-header',
      '.toolbar-wrap', '.csdn-nav', '.nav-wrap',
      '.toolbar-contents', '.csdn-toolbar-contents', '.toolbar-content'
    ]);
  }

  /* ========================================================
   * 4. 左侧栏删除（按 DOM 结构定位，不依赖文本内容）
   * ====================================================== */
  function removeLeftSidebar() {
    removeBySelectors([
      'aside',
      '[class*="aside"]', '[class*="Aside"]',
      '[class*="sidebar"]', '[class*="Sidebar"]',
      '[class*="column-left"]', '[class*="ColumnLeft"]',
      '[class*="blog-slider"]', '[class*="BlogSlider"]',
      '#blogColumn', '#asideProfile', '#asideArchive',
      '#asideHotArticle', '#asideNewComments', '#asideNewArticles',
      '#asideCategory', '#asideFooter', '#rightAside',
      '.blog-aside', '.aside-content', '.aside-box',
      '.blog-column-left', '.blog_column', '.blog-slider-bar',
      '[class*="left-aside"]', '[class*="LeftAside"]'
    ]);

    /* 删除文章主体的兄弟元素（即左右两侧的非内容容器） */
    var article = document.querySelector('#article_content') ||
                  document.querySelector('.blog-content-box') ||
                  document.querySelector('article');
    if (!article) return;

    var mainCol = article.closest('#mainBox') ||
                  article.closest('.main-content') ||
                  article.closest('[class*="main-column"]') ||
                  article.closest('.blog-content-box') ||
                  article.parentElement;
    if (!mainCol || !mainCol.parentElement) return;

    Array.prototype.forEach.call(mainCol.parentElement.children, function (sibling) {
      if (sibling === mainCol) return;
      var tag = sibling.tagName.toLowerCase();
      /* 保留脚本和样式标签 */
      if (tag === 'script' || tag === 'style' || tag === 'link') return;
      safeRemove(sibling);
    });
  }

  /* ========================================================
   * 5. 广告与弹窗删除
   * ====================================================== */
  function removeAds() {
    removeBySelectors([
      '.passport-login-container', '.passport-login-mask', '#passportbox',
      '.login-mark', '.weixin-shadowbox', '.feed-Sign-span',
      '.no-login-box', '.phone-login-box', '.signin-guide',
      '.unlogin-comment-tips', '.login-box', '.login-tip',
      '.vip-expert-box', '.vip-card', '.vip-join', '.vip_article',
      '.hide-article-box', '.hide-article-bg',
      '.adsense', '[class*="advert"]', '[id*="advert"]',
      '.recommend-ad-box', '.csdn-side-toolbar',
      '.bottom-pub-footer', '.tool-box', '.option-box',
      '#toolBarBox', '.more-toolbox-new',
      '#vipBox', '.vip-box', '.vip-promotion', '.member-promotion',
      '.unlogin-tips', '.login-guide-box', '.no-login-tips',
      '.passport-tip', '.tip-box'
    ]);

    /* 删除广告 iframe */
    document.querySelectorAll('iframe').forEach(function (f) {
      if (f.src && f.src.indexOf('csdnimg.cn') > -1) {
        safeRemove(f);
      }
    });

    /* 删除"登录后您可以享受以下权益"弹窗（仅匹配固定文案） */
    document.querySelectorAll('div, section').forEach(function (el) {
      if (processed.has(el) || el.children.length > 6) return;
      var text = (el.textContent || '').trim();
      if (text.indexOf('登录后您可以享受以下权益') > -1 && text.length < 300) {
        removeFixedAncestor(el);
      }
    });
  }

  /* ========================================================
   * 6. "猜你想问" AI 问答框删除
   *    仅匹配固定标题"猜你想问"，不碰动态标签内容
   * ====================================================== */
  function removeAIQuestion() {
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    var targets = [];

    while (walker.nextNode()) {
      var t = walker.currentNode.nodeValue;
      if (t && t.indexOf('猜你想问') > -1) {
        targets.push(walker.currentNode);
      }
    }

    targets.forEach(function (textNode) {
      var el = textNode.parentElement;
      /* 优先找 fixed/absolute 定位祖先 */
      while (el && el !== document.body) {
        var pos = getComputedStyle(el).position;
        if (pos === 'fixed' || pos === 'absolute') {
          safeRemove(el);
          return;
        }
        el = el.parentElement;
      }
      /* 未找到定位祖先，找包含输入控件的祖先 */
      el = textNode.parentElement;
      while (el && el !== document.body) {
        if (el.querySelector('textarea, input[type="text"], button')) {
          safeRemove(el);
          return;
        }
        el = el.parentElement;
      }
    });
  }

  /* ========================================================
   * 7. 复制事件拦截解除
   *    CSDN 在 document 上监听 copy 事件并阻止默认复制行为，
   *    导致选中代码后 Ctrl+C 无反应。
   *    解决方案：
   *    a) 清除 DOM0 内联处理器（oncopy/oncut/oncontextmenu）
   *    b) 在 window 与 document 的捕获阶段拦截事件传播，
   *       使 CSDN 的监听器永不触发，浏览器默认复制得以执行
   *    c) 放行 Ctrl/Cmd + C / A / X 组合键
   * ====================================================== */
  var copyUnlocked = false;

  function unlockCopyEvents() {
    /* a) 清除内联处理器（CSDN 可能重新赋值，需在轮询中反复清理） */
    document.oncopy = null;
    document.oncut = null;
    document.oncontextmenu = null;
    if (document.body) {
      document.body.oncopy = null;
      document.body.oncut = null;
      document.body.oncontextmenu = null;
    }

    if (copyUnlocked) return;
    copyUnlocked = true;

    /* b) 捕获阶段拦截：事件传播顺序为 window → document(捕获) → target → document(冒泡)，
     *    在 window 捕获阶段 stopPropagation 可挡住 document 上所有阶段的监听器 */
    ['copy', 'cut', 'contextmenu', 'dragstart'].forEach(function (type) {
      window.addEventListener(type, function (e) {
        e.stopPropagation();
      }, true);
      document.addEventListener(type, function (e) {
        e.stopPropagation();
      }, true);
    });

    /* c) 放行复制相关组合键，防止 CSDN 的 keydown 拦截 */
    window.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) &&
          (e.key === 'c' || e.key === 'a' || e.key === 'x')) {
        e.stopPropagation();
      }
    }, true);
  }

  /* ========================================================
   * 8. 代码块按钮删除（CSS 隐藏 + JS 兜底）
   * ====================================================== */
  function removeCodeButtons() {
    var selectors = [
      '.hljs-button', '.signin', '.hljs-signin',
      '[class*="ai-code"]', '[class*="ai-write"]',
      '[class*="run-code"]', '[class*="login-copy"]',
      '[class*="loginCode"]', '.hljs-button-signin',
      '.codecopy', '.copy-code', '.signin-code',
      '.pre-code-toolbar', '.code-toolbar', '.csdn-code-toolbar',
      '.toolbar-ad-ai', '.ai-write-code', '.hljs-ai-button',
      '.code-snippet__toolbar', '.snippet-code-show-row', '.csdn-code-mp',
      '.hljs-code-button', '.hljs-signin-code',
      '.code-top', '.code-bottom',
      '.pre-code-toolbar-item', '.code-toolbar-item'
    ];

    selectors.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el) { el.remove(); });
    });

    /* 文本匹配兜底（仅精确匹配按钮文字） */
    var btnTexts = ['AI写代码', 'AI代码', '登录复制', '运行', '一键运行', '登录后复制'];
    document.querySelectorAll('pre, .code-content, .code-snippet__fix').forEach(function (block) {
      block.querySelectorAll('*').forEach(function (el) {
        var text = (el.textContent || '').trim();
        if (btnTexts.indexOf(text) > -1) el.remove();
      });
    });
  }

  /* ========================================================
   * 9. 文章展开与滚动恢复
   * ====================================================== */
  function expandArticle() {
    var hideBox = document.querySelector('.hide-article-box');
    if (hideBox) hideBox.remove();

    var content = document.querySelector('#article_content');
    if (content) {
      content.style.height = 'auto';
      content.style.overflow = 'visible';
      content.style.maxHeight = 'none';
    }
  }

  function restoreScroll() {
    document.body.style.overflow = 'auto';
    document.documentElement.style.overflow = 'auto';
  }

  /* ========================================================
   * 10. 复制按钮
   * ====================================================== */

  /** 使用 textarea + execCommand 实现兼容性复制 */
  function copyText(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.top = '-9999px';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try { ta.setSelectionRange(0, ta.value.length); } catch (e) {}
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
    return ok;
  }

  /** 提取代码块文本（保留换行） */
  function getCodeText(block) {
    var codeEl = block.querySelector('code') ||
                 block.querySelector('.code-content') ||
                 block;
    return codeEl.innerText || codeEl.textContent || '';
  }

  function processCodeBlocks() {
    document.querySelectorAll('pre').forEach(function (block) {
      if (block.dataset.copyBtn === '1') return;
      if (!block.querySelector('code') && !block.querySelector('.code-content')) return;
      block.dataset.copyBtn = '1';

      var btn = document.createElement('button');
      btn.className = 'csdn-copy-btn';
      btn.textContent = '复制';

      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var ok = copyText(getCodeText(block));
        btn.textContent = ok ? '已复制' : '复制失败';
        btn.style.background = ok ? '#00a86b' : '#e74c3c';
        setTimeout(function () {
          btn.textContent = '复制';
          btn.style.background = '#00a86b';
        }, 2000);
      });

      block.appendChild(btn);
    });
  }

  /* ========================================================
   * 11. 辅助函数
   * ====================================================== */

  /** 向上查找 fixed/absolute 定位祖先并删除 */
  function removeFixedAncestor(el) {
    var node = el;
    while (node.parentElement && node.parentElement !== document.body) {
      var pos = getComputedStyle(node.parentElement).position;
      if (pos === 'fixed' || pos === 'absolute') {
        node = node.parentElement;
      } else {
        break;
      }
    }
    safeRemove(node);
  }

  /* ========================================================
   * 12. 状态面板（动态倒计时 5 → 0）
   * ====================================================== */
  function showPanel(adNum, codeNum) {
    var old = document.getElementById('__csdnPanel');
    if (old) old.remove();

    var panel = document.createElement('div');
    panel.id = '__csdnPanel';
    panel.setAttribute('style', [
      'position:fixed', 'top:20px', 'right:20px',
      'background:linear-gradient(135deg,#00a86b 0%,#008f5a 100%)',
      'color:#fff', 'padding:16px 24px', 'border-radius:10px',
      'font-size:14px', 'font-family:sans-serif',
      'box-shadow:0 4px 20px rgba(0,0,0,0.3)',
      'z-index:2147483647', 'transition:opacity 0.5s',
      'opacity:1', 'line-height:1.8'
    ].join(';'));

    panel.innerHTML =
      '<div style="font-weight:bold;font-size:16px;margin-bottom:4px">CSDN 阅读增强已启动</div>' +
      '<div>屏蔽广告：' + adNum + ' 个</div>' +
      '<div>复制按钮：' + codeNum + ' 个</div>' +
      '<div>左侧栏：已隐藏</div>' +
      '<div style="margin-top:4px;font-size:12px;opacity:0.8">' +
      '<span id="__csdnPanelCountdown">5</span> 秒后自动消失</div>';

    document.body.appendChild(panel);

    /* 动态倒计时：5, 4, 3, 2, 1, 0，归零后淡出并移除面板 */
    var countEl = document.getElementById('__csdnPanelCountdown');
    var remaining = 5;
    var timer = setInterval(function () {
      remaining--;
      if (countEl) countEl.textContent = remaining;
      if (remaining <= 0) {
        clearInterval(timer);
        /* 显示 0 后稍作停顿再淡出 */
        setTimeout(function () {
          panel.style.opacity = '0';
          setTimeout(function () {
            if (panel.parentNode) panel.parentNode.removeChild(panel);
          }, 500);
        }, 400);
      }
    }, 1000);
  }

  /* ========================================================
   * 13. 主流程
   * ====================================================== */
  function run() {
    injectStyles();
    unlockCopyEvents();
    removeTopBar();
    removeLeftSidebar();
    removeAds();
    removeAIQuestion();
    removeCodeButtons();
    expandArticle();
    restoreScroll();
    processCodeBlocks();

    var codeCount = document.querySelectorAll('[data-copy-btn="1"]').length;
    showPanel(adCount, codeCount);
  }

  /* ========================================================
   * 14. 执行入口
   * ====================================================== */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }

  /* ========================================================
   * 15. 持续监控（定时轮询 + MutationObserver）
   *    CSDN 大量元素由 JS 动态创建，需持续清理
   *    轮询：每 2 秒执行一次，持续 60 秒后停止
   *    观察器：DOM 变化时触发，30 秒后自动断开
   * ====================================================== */
  var POLL_INTERVAL = 2000;
  var POLL_MAX_COUNT = 30;      /* 30 次 × 2 秒 = 60 秒 */
  var OBSERVER_TIMEOUT = 30000;

  var pollCount = 0;
  var pollTimer = setInterval(function () {
    pollCount++;
    unlockCopyEvents();
    removeTopBar();
    removeLeftSidebar();
    removeAds();
    removeAIQuestion();
    removeCodeButtons();
    processCodeBlocks();
    if (pollCount >= POLL_MAX_COUNT) clearInterval(pollTimer);
  }, POLL_INTERVAL);

  var observerStartTime = Date.now();
  var observer = new MutationObserver(function () {
    if (Date.now() - observerStartTime > OBSERVER_TIMEOUT) {
      observer.disconnect();
      return;
    }
    unlockCopyEvents();
    removeTopBar();
    removeLeftSidebar();
    removeAds();
    removeAIQuestion();
    removeCodeButtons();
    processCodeBlocks();
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();