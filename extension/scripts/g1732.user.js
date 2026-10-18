(function () {
  if (window.__WX_LEFT_TOC_V3_INSTALLED__) return;
  window.__WX_LEFT_TOC_V3_INSTALLED__ = true;

  const CONFIG = {
    contentSelector: '#js_content',
    articleTitleSelector: '#activity-name',
    tocId: 'wx-left-toc-panel',
    styleId: 'wx-left-toc-style',
    activeClass: 'wx-left-toc-active',
    maxItems: 100,
    scrollOffset: 24,
    rebuildDelay: 250,
    panelWidth: 240
  };

  let contentObserver = null;
  let themeObserver = null;
  let scrollHandlerBound = false;
  let currentItems = [];
  let lastSignature = '';
  let rebuildTimer = null;

  function getContentRoot() {
    return document.querySelector(CONFIG.contentSelector);
  }

  function normalizeText(text) {
    return (text || '')
      .replace(/\s+/g, ' ')
      .replace(/\u200B/g, '')
      .trim();
  }

  function getText(el) {
    if (!el) return '';
    return normalizeText(el.innerText || el.textContent || '');
  }

  function getArticleTitle() {
    const el = document.querySelector(CONFIG.articleTitleSelector);
    return normalizeText(el ? el.textContent : '');
  }

  function isProbablyUsefulHeading(text) {
    if (!text) return false;
    if (text.length < 2 || text.length > 120) return false;
    if (/^(https?:\/\/|www\.)/i.test(text)) return false;
    if (/^(赞赏|留言|写留言|发消息|继续滑动|向上滑动|轻触阅读原文|我知道了|作者提示)/.test(text)) return false;
    return true;
  }

  function ensureAnchor(el, index) {
    if (!el) return '';
    const id = `wx-left-toc-anchor-${index + 1}`;
    if (el.id !== id) {
      el.id = id;
    }
    return id;
  }

  function collectHeadings() {
    const root = getContentRoot();
    if (!root) return [];

    const articleTitle = getArticleTitle();
    const seen = new Set();
    const nodes = Array.from(root.querySelectorAll('h1, h2, h3, h4'));
    const items = [];

    nodes.forEach((el) => {
      const text = getText(el);
      if (!isProbablyUsefulHeading(text)) return;
      if (articleTitle && text === articleTitle) return;
      if (text === '#') return;
      if (seen.has(text)) return;

      seen.add(text);
      items.push({
        el,
        text,
        level: parseInt((el.tagName || 'H2').replace(/[^\d]/g, ''), 10) || 2
      });
    });

    return items.slice(0, CONFIG.maxItems).map((item, index) => ({
      ...item,
      id: ensureAnchor(item.el, index)
    }));
  }

  function buildSignature(items) {
    return items.map(item => `${item.level}:${item.text}`).join('||');
  }

  function isDarkMode() {
    const html = document.documentElement;
    const body = document.body;

    const classText = `${html.className || ''} ${body ? body.className || '' : ''}`.toLowerCase();
    if (
      classText.includes('dark') ||
      classText.includes('darkmode') ||
      classText.includes('night') ||
      classText.includes('theme-dark')
    ) {
      return true;
    }

    const bg = window.getComputedStyle(body || html).backgroundColor;
    const nums = (bg.match(/\d+(\.\d+)?/g) || []).map(Number);
    if (nums.length >= 3) {
      const [r, g, b] = nums;
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      return brightness < 150;
    }

    return false;
  }

  function injectStyle() {
    const dark = isDarkMode();
    let style = document.getElementById(CONFIG.styleId);

    if (!style) {
      style = document.createElement('style');
      style.id = CONFIG.styleId;
      document.head.appendChild(style);
    }

    const panelBg = dark ? 'rgba(24, 24, 28, 0.82)' : 'rgba(255, 255, 255, 0.84)';
    const panelBorder = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
    const panelShadow = dark
      ? '0 8px 30px rgba(0,0,0,0.35)'
      : '0 8px 30px rgba(0,0,0,0.08)';
    const textColor = dark ? 'rgba(255,255,255,0.88)' : 'rgba(0,0,0,0.82)';
    const subTextColor = dark ? 'rgba(255,255,255,0.66)' : 'rgba(0,0,0,0.58)';
    const hoverBg = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';
    const activeBg = dark ? 'rgba(122, 162, 255, 0.18)' : 'rgba(24, 119, 242, 0.10)';
    const activeColor = dark ? '#9ec1ff' : '#1769e0';

    style.textContent = `
      #${CONFIG.tocId} {
        position: fixed;
        left: max(12px, calc((100vw - 960px) / 2 - 280px));
        top: 96px;
        width: ${CONFIG.panelWidth}px;
        max-height: calc(100vh - 120px);
        overflow: auto;
        z-index: 9999;
        box-sizing: border-box;
        padding: 12px;
        border-radius: 12px;
        background: ${panelBg};
        color: ${textColor};
        border: 1px solid ${panelBorder};
        box-shadow: ${panelShadow};
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      #${CONFIG.tocId} * {
        box-sizing: border-box;
      }

      #${CONFIG.tocId} .wx-left-toc-title {
        font-size: 14px;
        font-weight: 700;
        margin-bottom: 10px;
        color: ${textColor};
      }

      #${CONFIG.tocId} .wx-left-toc-list {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      #${CONFIG.tocId} .wx-left-toc-item {
        display: block;
        width: 100%;
        border: 0;
        background: transparent;
        color: ${subTextColor};
        text-align: left;
        cursor: pointer;
        border-radius: 8px;
        padding-top: 8px;
        padding-right: 10px;
        padding-bottom: 8px;
        padding-left: 10px;
        font-size: 13px;
        line-height: 1.45;
        transition: background .15s ease, color .15s ease, transform .15s ease;
        white-space: normal;
        word-break: break-word;
      }

      #${CONFIG.tocId} .wx-left-toc-item:hover {
        background: ${hoverBg};
        color: ${textColor};
        transform: translateX(2px);
      }

      #${CONFIG.tocId} .wx-left-toc-item.${CONFIG.activeClass} {
        background: ${activeBg};
        color: ${activeColor};
        font-weight: 600;
      }

      #${CONFIG.tocId} .wx-left-toc-item[data-depth="0"] {
        padding-left: 10px;
        font-weight: 600;
      }

      #${CONFIG.tocId} .wx-left-toc-item[data-depth="1"] {
        padding-left: 24px;
      }

      #${CONFIG.tocId} .wx-left-toc-item[data-depth="2"] {
        padding-left: 38px;
      }

      #${CONFIG.tocId} .wx-left-toc-item[data-depth="3"] {
        padding-left: 52px;
      }

      #${CONFIG.tocId} .wx-left-toc-empty {
        font-size: 12px;
        color: ${subTextColor};
      }

      @media (max-width: 1500px) {
        #${CONFIG.tocId} {
          left: 12px;
          width: min(${CONFIG.panelWidth}px, 22vw);
        }
      }

      @media (max-width: 1180px) {
        #${CONFIG.tocId} {
          display: none !important;
        }
      }
    `;
  }

  function getOrCreatePanel() {
    let panel = document.getElementById(CONFIG.tocId);
    if (panel) return panel;

    panel = document.createElement('aside');
    panel.id = CONFIG.tocId;

    const title = document.createElement('div');
    title.className = 'wx-left-toc-title';
    title.textContent = '目录';

    const list = document.createElement('div');
    list.className = 'wx-left-toc-list';

    panel.appendChild(title);
    panel.appendChild(list);
    document.body.appendChild(panel);

    return panel;
  }

  function normalizeLevels(items) {
    if (!items.length) return [];

    const minLevel = Math.min(...items.map(item => item.level));

    return items.map((item) => {
      const depth = Math.max(0, Math.min(3, item.level - minLevel));
      return {
        ...item,
        depth
      };
    });
  }

  function renderPanel(items) {
    const panel = getOrCreatePanel();
    const list = panel.querySelector('.wx-left-toc-list');
    if (!list) return;

    list.textContent = '';

    if (!items.length) {
      const empty = document.createElement('div');
      empty.className = 'wx-left-toc-empty';
      empty.textContent = '未识别到目录';
      list.appendChild(empty);
      return;
    }

    const normalizedItems = normalizeLevels(items);

    normalizedItems.forEach((item) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'wx-left-toc-item';
      btn.textContent = item.text;
      btn.dataset.targetId = item.id;
      btn.dataset.level = String(item.level);
      btn.dataset.depth = String(item.depth);

      btn.addEventListener('click', function () {
        const target = document.getElementById(item.id);
        if (!target) return;

        const top = window.scrollY + target.getBoundingClientRect().top - CONFIG.scrollOffset;
        window.scrollTo({
          top,
          behavior: 'smooth'
        });
      });

      list.appendChild(btn);
    });
  }

  function updateActiveState() {
    if (!currentItems.length) return;

    let activeId = currentItems[0].id;
    const threshold = 140;

    for (const item of currentItems) {
      const rect = item.el.getBoundingClientRect();
      if (rect.top <= threshold) {
        activeId = item.id;
      } else {
        break;
      }
    }

    const panel = document.getElementById(CONFIG.tocId);
    if (!panel) return;

    const buttons = panel.querySelectorAll('.wx-left-toc-item');
    buttons.forEach((btn) => {
      btn.classList.toggle(CONFIG.activeClass, btn.dataset.targetId === activeId);
    });
  }

  function bindScrollHandler() {
    if (scrollHandlerBound) return;
    scrollHandlerBound = true;

    let ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        updateActiveState();
        ticking = false;
      });
    }, { passive: true });
  }

  function rebuildIfNeeded(force) {
    injectStyle();

    const items = collectHeadings();
    const signature = buildSignature(items);

    if (!force && signature === lastSignature) {
      currentItems = items;
      updateActiveState();
      return;
    }

    currentItems = items;
    lastSignature = signature;
    renderPanel(items);
    updateActiveState();
  }

  function scheduleRebuild(force) {
    clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(() => rebuildIfNeeded(!!force), CONFIG.rebuildDelay);
  }

  function watchContent() {
    const root = getContentRoot();
    if (!root) return;

    if (contentObserver) {
      contentObserver.disconnect();
    }

    contentObserver = new MutationObserver((mutations) => {
      const shouldRebuild = mutations.some((mutation) => {
        if (mutation.type === 'childList') return true;
        if (mutation.type === 'attributes') {
          return /^(id|class)$/.test(mutation.attributeName || '');
        }
        return false;
      });

      if (shouldRebuild) {
        scheduleRebuild(false);
      }
    });

    contentObserver.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['id', 'class']
    });
  }

  function watchTheme() {
    if (themeObserver) {
      themeObserver.disconnect();
    }

    themeObserver = new MutationObserver(() => {
      injectStyle();
    });

    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style']
    });

    if (document.body) {
      themeObserver.observe(document.body, {
        attributes: true,
        attributeFilter: ['class', 'style']
      });
    }
  }

  function executeAutomation() {
    console.log('Executing automation script...');
    const root = getContentRoot();

    if (!root) {
      console.warn('Target element not found:', CONFIG.contentSelector);
      return;
    }

    injectStyle();
    rebuildIfNeeded(true);
    bindScrollHandler();
    watchContent();
    watchTheme();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', executeAutomation, { once: true });
  } else {
    executeAutomation();
  }
})();