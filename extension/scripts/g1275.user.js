(function() {
  if (window.__urlNumberHighlighter) return;
  window.__urlNumberHighlighter = true;

  const STYLE_ID = '__url_number_highlight_style__';
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .__url-selected__ {
      background-color: rgba(0, 100, 255, 0.28) !important;
      outline: 1px solid rgba(0, 100, 255, 0.5);
      outline-offset: 1px;
      border-radius: 3px;
      padding: 0 2px;
      margin: 0 -1px;
      user-select: all;
      cursor: text;
      transition: background-color 0.15s ease;
    }
    .__url-selected__:hover {
      background-color: rgba(0, 100, 255, 0.45) !important;
    }
  `;
  document.head.appendChild(style);

  const URL_REGEX = /(https?:\/\/[^\s<>"'\)\]\}，。、；：！？）】》]+|www\.[^\s<>"'\)\]\}，。、；：！？）】》]+\.[^\s<>"'\)\]\}，。、；：！？）】》]+)/g;
  const URL_ONLY = /^https?:\/\/[^\s]+|^www\.[^\s]+\.[^\s]+$/;

  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'SELECT']);

  let debounceTimer = null;

  function debounce(fn, delay) {
    return function(...args) {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  function processTextNode(textNode) {
    const text = textNode.textContent;
    if (!text || text.trim().length === 0) return;

    URL_REGEX.lastIndex = 0;
    if (!URL_REGEX.test(text)) return;
    URL_REGEX.lastIndex = 0;

    const matches = [];
    let m;
    while ((m = URL_REGEX.exec(text)) !== null) {
      matches.push({ s: m.index, e: m.index + m[0].length, t: m[0] });
    }
    if (matches.length === 0) return;

    const frag = document.createDocumentFragment();
    let cursor = 0;

    for (const item of matches) {
      if (item.s > cursor) {
        frag.appendChild(document.createTextNode(text.substring(cursor, item.s)));
      }
      const span = document.createElement('span');
      span.className = '__url-selected__';
      span.textContent = item.t;
      span.dataset.url = item.t;
      frag.appendChild(span);
      cursor = item.e;
    }

    if (cursor < text.length) {
      frag.appendChild(document.createTextNode(text.substring(cursor)));
    }

    textNode.parentNode.replaceChild(frag, textNode);
  }

  function walkAndProcess(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const el = node.parentElement;
        if (!el) return NodeFilter.FILTER_REJECT;
        if (SKIP_TAGS.has(el.tagName)) return NodeFilter.FILTER_REJECT;
        if (el.classList.contains('__url-selected__')) return NodeFilter.FILTER_REJECT;
        if (el.closest('[contenteditable="true"]')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const n of nodes) processTextNode(n);
  }

  function highlightUrlAnchors() {
    document.querySelectorAll('a[href]').forEach(a => {
      if (a.classList.contains('__url-selected__')) return;
      if (a.querySelector('.__url-selected__')) return;

      const visibleText = (a.textContent || '').trim();
      if (visibleText.length > 0 && URL_ONLY.test(visibleText)) {
        a.classList.add('__url-selected__');
        a.dataset.url = a.getAttribute('href') || visibleText;
      }
    });
  }

  function execute() {
    console.log('[URL Highlighter] Scanning page...');
    walkAndProcess(document.body);
    highlightUrlAnchors();
    const urlCount = document.querySelectorAll('.__url-selected__').length;
    console.log(`[URL Highlighter] Done: ${urlCount} URL(s) highlighted`);
  }

  // ---------- 新增：分页翻页后自动重新扫描 ----------

  const debouncedExecute = debounce(execute, 300);

  // 1) MutationObserver：监听 DOM 新增节点，自动重新扫描
  const observer = new MutationObserver((mutations) => {
    let hasNewContent = false;
    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE && !node.classList?.contains('__url-selected__')) {
            hasNewContent = true;
            break;
          }
        }
      }
      if (hasNewContent) break;
    }
    if (hasNewContent) {
      debouncedExecute();
    }
  });

  function startObserver() {
    if (!document.body) return;
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  // 2) 点击翻页按钮后，延迟重新扫描（确保新内容已加载）
  document.addEventListener('click', (e) => {
    const target = e.target.closest(
      'a[href], button, [rel="next"], [class*="next" i], [class*="page" i], [class*="pager" i], [class*="pagination" i], [role="button"]'
    );
    if (target) {
      // 给页面一点时间加载新内容
      setTimeout(execute, 500);
      setTimeout(execute, 1500);
    }
  }, true);

  // 3) 监听 SPA 路由变化（popstate + pushState/replaceState）
  window.addEventListener('popstate', () => {
    setTimeout(execute, 300);
  });

  const originalPushState = history.pushState;
  history.pushState = function(...args) {
    originalPushState.apply(this, args);
    setTimeout(execute, 300);
  };

  const originalReplaceState = history.replaceState;
  history.replaceState = function(...args) {
    originalReplaceState.apply(this, args);
    setTimeout(execute, 300);
  };

  // ---------- 初始化 ----------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      execute();
      startObserver();
    });
  } else {
    execute();
    startObserver();
  }
})();