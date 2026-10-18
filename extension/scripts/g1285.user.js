// ==UserScript==
// @name 以图搜图
// @description 默认Ctrl+鼠标右键打开界面
// @match https://*/*
// @icon  data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNGE5ZWZmIiBzdHJva2Utd2lkdGg9IjEuOCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cmVjdCB4PSIzIiB5PSIzIiB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHJ4PSIyLjUiLz48Y2lyY2xlIGN4PSI4LjUiIGN5PSI4LjUiIHI9IjEuNSIvPjxwb2x5bGluZSBwb2ludHM9IjIxIDE1IDE2IDEwIDUgMjEiLz48Y2lyY2xlIGN4PSIxNy41IiBjeT0iMTcuNSIgcj0iMi41Ii8+PGxpbmUgeDE9IjE5LjUiIHkxPSIxOS41IiB4Mj0iMjIiIHkyPSIyMiIvPjwvc3ZnPg==
// @grant GM_setValue
// @grant GM_deleteValue
// @grant GM_openInTab
// @grant GM_registerMenuCommand
// ==/UserScript==
(function () {
  'use strict';

  const IS_TAMPERMONKEY =
    typeof GM_getValue !== 'undefined' &&
    typeof GM_setValue !== 'undefined' &&
    typeof GM_openInTab !== 'undefined';

  const Storage = {
    get(key, defaultValue = null) {
      try {
        if (IS_TAMPERMONKEY) {
          const value = GM_getValue(key);
          return value !== undefined ? value : defaultValue;
        } else {
          const value = localStorage.getItem(key);
          return value !== null ? JSON.parse(value) : defaultValue;
        }
      } catch (e) {
        return defaultValue;
      }
    },
    set(key, value) {
      try {
        if (IS_TAMPERMONKEY) GM_setValue(key, value);
        else localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {}
    },
    remove(key) {
      try {
        if (IS_TAMPERMONKEY) GM_deleteValue(key);
        else localStorage.removeItem(key);
      } catch (e) {}
    },
  };

  const iconCache = IS_TAMPERMONKEY ? (Storage.get('imageSearchPro_iconCache') || {}) : {};

  function saveIconCache() {
    if (IS_TAMPERMONKEY) Storage.set('imageSearchPro_iconCache', iconCache);
  }

  function extractDomainFromUrl(url) {
    try { return new URL(url).hostname; } catch (e) { return null; }
  }

  function fetchAndCacheIcon(engineName, searchUrl, imgEl) {
    const domain = extractDomainFromUrl(searchUrl);
    if (!domain) return;
    if (iconCache[domain]) { imgEl.src = iconCache[domain]; return; }
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
    const testImg = document.createElement('img');
    testImg.onload = () => {
      iconCache[domain] = faviconUrl;
      saveIconCache();
      imgEl.src = faviconUrl;
    };
    testImg.onerror = () => {
      imgEl.style.display = 'none';
      const fallback = document.createElement('span');
      fallback.textContent = '🔎';
      if (imgEl.parentNode) imgEl.parentNode.insertBefore(fallback, imgEl);
    };
    testImg.src = faviconUrl;
  }

  function isImageUrl(icon) {
    return !!icon && typeof icon === 'string' &&
      (icon.startsWith('http://') || icon.startsWith('https://') || icon.startsWith('data:image'));
  }

  function createIconElementAuto(engineName, icon, searchUrl, className = '') {
    if (isImageUrl(icon)) {
      const img = document.createElement('img');
      img.src = icon;
      img.className = className;
      img.style.cssText = 'width:20px;height:20px;object-fit:contain;';
      img.onerror = () => {
        img.style.display = 'none';
        const fallback = document.createElement('span');
        fallback.textContent = '🔎';
        fallback.className = className;
        if (img.parentNode) img.parentNode.insertBefore(fallback, img);
      };
      return img;
    }
    if (icon && [...icon].length <= 2) {
      const span = document.createElement('span');
      span.textContent = icon;
      span.className = className;
      return span;
    }
    const img = document.createElement('img');
    img.className = className;
    img.style.cssText = 'width:20px;height:20px;object-fit:contain;';
    const domain = extractDomainFromUrl(searchUrl);
    if (domain && iconCache[domain]) {
      img.src = iconCache[domain];
    } else if (domain) {
      fetchAndCacheIcon(engineName, searchUrl, img);
    } else {
      const fallback = document.createElement('span');
      fallback.textContent = '🔎';
      fallback.className = className;
      return fallback;
    }
    img.onerror = () => {
      img.style.display = 'none';
      const fallback = document.createElement('span');
      fallback.textContent = '🔎';
      if (img.parentNode) img.parentNode.insertBefore(fallback, img);
    };
    return img;
  }

  const DEFAULT_ENGINES = {
    Google: { url: 'https://lens.google.com/uploadbyurl?url={%s}', icon: 'https://raw.githubusercontent.com/fmz200/wool_scripts/main/icons/apps/Google.png' },
    Yandex: { url: 'https://yandex.com/images/search?rpt=imageview&url={%s}', icon: '' },
    SauceNAO: { url: 'https://saucenao.com/search.php?db=999&url={%s}', icon: '🍜' },
    IQDB: { url: 'https://iqdb.org/?url={%s}', icon: '' },
    '3D IQDB': { url: 'https://3d.iqdb.org/?url={%s}', icon: '' },
    WhatAnime: { url: 'https://trace.moe/?url={%s}', icon: '' },
    Ascii2D: { url: 'https://ascii2d.net/search/url/{%s}', icon: '' },
  };

  const DEFAULT_CONFIG = {
    engines: JSON.parse(JSON.stringify(DEFAULT_ENGINES)),
    enabledEngines: Object.keys(DEFAULT_ENGINES),
    hotKey: 'ctrlKey',
    customHotKey: '',
    openMode: 'background',
    maxHistory: 20,
    showPreview: true,
    keepPanelOpen: false,
  };

  const EMOJI_CATEGORIES = {
    表情: [
      '🔍','🔎','🌐','🎯','⭐','✨','💫','🔥','💡','📌','👁️','🔭','📡','📊','📈',
      '🗂️','📁','📂','☁️','🖥️','💻','📱','🔗','📍','🗺️','🧭','🅰️','🅱️','🆎','🅾️',
      '🆘','⭕','❌','➕','➖','✖️','😀','😎','🤔','😍','🥳','😊','🤩','😋','🤗','😇',
      '📷','🖼️','🎨','🎬','📺','📻','💿','🎥','📽️','📹','🐕','🐈','🦊','🐻','🐼',
      '🦁','🐯','🦄','🐲','🦋','🍜','🍕','🍔','🌮','🍰','🍩','🍪','☕','🍵','🥤',
    ],
  };

  const PANEL_DIMENSIONS = { minWidth: 280, maxWidth: 360, previewMaxHeight: 180, enginesMaxHeight: 320 };

  let panel = null;
  let currentImageData = { url: null, blob: null, width: 0, height: 0, size: 0 };
  let isPanelVisible = false;
  let config = IS_TAMPERMONKEY ? loadConfig() : { ...DEFAULT_CONFIG };
  let searchHistory = IS_TAMPERMONKEY ? loadHistory() : [];
  let isDragging = false;
  let dragOffset = { x: 0, y: 0 };
  let currentEmojiPicker = null;
  let hotKeyPressed = false;

  function loadConfig() {
    if (!IS_TAMPERMONKEY) return { ...DEFAULT_CONFIG };
    const saved = Storage.get('imageSearchPro_config');
    if (saved) {
      if (saved.engines) {
        Object.keys(saved.engines).forEach((key) => {
          if (typeof saved.engines[key] === 'string')
            saved.engines[key] = { url: saved.engines[key], icon: getEngineIcon(key) };
        });
      }
      return { ...DEFAULT_CONFIG, ...saved };
    }
    return { ...DEFAULT_CONFIG };
  }

  function saveConfig() {
    if (IS_TAMPERMONKEY) Storage.set('imageSearchPro_config', config);
  }

  function loadHistory() {
    if (!IS_TAMPERMONKEY) return [];
    return Storage.get('imageSearchPro_history', []);
  }

  function saveHistory() {
    if (IS_TAMPERMONKEY) Storage.set('imageSearchPro_history', searchHistory.slice(0, config.maxHistory));
  }

  function addToHistory(url, thumbnail) {
    if (!IS_TAMPERMONKEY) return;
    const existing = searchHistory.findIndex((h) => h.url === url);
    if (existing > -1) searchHistory.splice(existing, 1);
    searchHistory.unshift({ url, thumbnail: thumbnail || url, timestamp: Date.now() });
    if (searchHistory.length > config.maxHistory) searchHistory = searchHistory.slice(0, config.maxHistory);
    saveHistory();
  }

  function getThemeColors() {
    const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return {
      bg: dark ? 'rgba(30,30,30,0.97)' : 'rgba(255,255,255,0.97)',
      text: dark ? '#e0e0e0' : '#333333',
      textSecondary: dark ? '#a0a0a0' : '#666666',
      border: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
      hover: dark ? 'rgba(255,255,255,0.08)' : 'rgba(59,130,246,0.08)',
      accent: dark ? '#60a5fa' : '#3b82f6',
      gradient: 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)',
      shadow: dark ? '0 8px 32px rgba(0,0,0,0.6)' : '0 8px 32px rgba(0,0,0,0.18)',
      inputBg: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
      headerBg: 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)',
    };
  }

  function setVars(el, colors) {
    el.style.setProperty('--isp-bg', colors.bg);
    el.style.setProperty('--isp-text', colors.text);
    el.style.setProperty('--isp-text-secondary', colors.textSecondary);
    el.style.setProperty('--isp-border', colors.border);
    el.style.setProperty('--isp-hover', colors.hover);
    el.style.setProperty('--isp-accent', colors.accent);
    el.style.setProperty('--isp-gradient', colors.gradient);
    el.style.setProperty('--isp-input-bg', colors.inputBg);
    el.style.setProperty('--isp-header-bg', colors.headerBg);
    el.style.setProperty('--isp-shadow', colors.shadow);
  }

  function injectStyles() {
    if (document.getElementById('image-search-pro-styles')) return;
    const style = document.createElement('style');
    style.id = 'image-search-pro-styles';
    style.textContent = `
      .isp-panel{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;user-select:none;color:var(--isp-text)}
      .isp-panel *{box-sizing:border-box;margin:0;padding:0}
      @keyframes isp-fadeIn{from{opacity:0;transform:scale(0.97)}to{opacity:1;transform:scale(1)}}
      @keyframes isp-slideIn{from{opacity:0;transform:translateX(-10px)}to{opacity:1;transform:translateX(0)}}
      @keyframes isp-scaleIn{from{opacity:0;transform:scale(0.93) translateY(-6px)}to{opacity:1;transform:scale(1) translateY(0)}}
      @keyframes isp-slideUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      @keyframes isp-modalIn{from{opacity:0;transform:translate(-50%,-48%) scale(0.96)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}
      .isp-header-btn{width:28px;height:28px;display:flex;align-items:center;justify-content:center;cursor:pointer;border-radius:8px;transition:background .2s ease;color:white;background:transparent;border:none!important;outline:none!important;box-shadow:none!important;font-size:15px}
      .isp-header-btn:hover{background:rgba(255,255,255,.2)}
      .isp-item{display:flex;align-items:center;gap:10px;padding:11px 16px;cursor:pointer;transition:all .18s cubic-bezier(.4,0,.2,1);border-bottom:1px solid var(--isp-border);font-size:14px;color:var(--isp-text);position:relative;overflow:hidden}
      .isp-item::before{content:'';position:absolute;left:0;top:0;width:3px;height:100%;background:var(--isp-accent);transform:scaleY(0);transition:transform .18s ease;border-radius:0 2px 2px 0}
      .isp-item:hover{background:var(--isp-hover)}
      .isp-item:hover::before{transform:scaleY(1)}
      .isp-item:last-child{border-bottom:none}
      .isp-icon{width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0}
      .isp-icon img{width:20px;height:20px;object-fit:contain}
      .isp-shortcut{margin-left:auto;font-size:11px;color:var(--isp-text-secondary);background:var(--isp-input-bg);padding:2px 7px;border-radius:5px;font-weight:500;border:1px solid var(--isp-border)}
      .isp-preview{position:relative;width:100%;padding:12px;background:var(--isp-input-bg);border-bottom:1px solid var(--isp-border)}
      .isp-preview-image{width:100%;max-height:180px;object-fit:contain;border-radius:8px;background:repeating-conic-gradient(#80808020 0% 25%,transparent 0% 50%) 50%/16px 16px}
      .isp-preview-info{display:flex;gap:12px;margin-top:8px;font-size:11px;color:var(--isp-text-secondary)}
      .isp-preview-info span{display:flex;align-items:center;gap:4px}
      .isp-history-item{display:flex;align-items:center;gap:10px;padding:8px 16px;cursor:pointer;transition:background .15s ease}
      .isp-history-item:hover{background:var(--isp-hover)}
      .isp-history-thumb{width:40px;height:40px;border-radius:6px;object-fit:cover;background:var(--isp-input-bg)}
      .isp-history-time{font-size:11px;color:var(--isp-text-secondary);margin-left:auto}
      .isp-modal{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:2147483647;border-radius:16px;max-width:90vw;max-height:90vh;overflow-y:auto}
      .isp-settings-modal{overflow:hidden;display:flex;flex-direction:column;max-height:90vh;}
      .isp-settings-content{min-width:480px;max-width:95vw;flex:1;overflow-y:auto;overflow-x:hidden;padding:24px;scrollbar-gutter:stable;border-radius:16px;}
      .isp-settings-content::-webkit-scrollbar{width:6px}
      .isp-settings-content::-webkit-scrollbar-track{background:transparent}
      .isp-settings-content::-webkit-scrollbar-thumb{background:var(--isp-border);border-radius:999px}
      .isp-settings-content::-webkit-scrollbar-thumb:hover{background:var(--isp-accent)}
      .isp-modal-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.45);backdrop-filter:blur(6px);z-index:2147483646}
      .isp-input{width:100%;padding:9px 12px;border:1px solid var(--isp-border);border-radius:8px;background:var(--isp-input-bg);color:var(--isp-text);font-size:14px;transition:all .2s ease;box-sizing:border-box}
      .isp-input:focus{outline:none;border-color:var(--isp-accent);box-shadow:0 0 0 3px rgba(59,130,246,.15)}
      .isp-btn{padding:9px 20px;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:500;transition:all .2s ease}
      .isp-btn-primary{background:var(--isp-gradient);color:white}
      .isp-btn-primary:hover{opacity:.9;transform:translateY(-1px);box-shadow:0 4px 12px rgba(102,126,234,.4)}
      .isp-btn-secondary{background:var(--isp-input-bg);color:var(--isp-text);border:1px solid var(--isp-border)}
      .isp-btn-secondary:hover{background:var(--isp-hover)}
      .isp-switch{position:relative;width:40px;height:22px;background:var(--isp-border);border-radius:11px;cursor:pointer;transition:background .2s ease;flex-shrink:0}
      .isp-switch.active{background:var(--isp-accent)}
      .isp-switch::after{content:'';position:absolute;top:3px;left:3px;width:16px;height:16px;background:white;border-radius:50%;transition:transform .2s ease;box-shadow:0 1px 4px rgba(0,0,0,.25)}
      .isp-switch.active::after{transform:translateX(18px)}
      .isp-toast{position:fixed;bottom:28px;left:50%;transform:translateX(-50%) translateY(16px);background:rgba(30,30,30,.96);color:white;padding:10px 22px;border-radius:10px;box-shadow:0 4px 20px rgba(0,0,0,.25);z-index:2147483648!important;font-size:13px;opacity:0;transition:all .28s cubic-bezier(.4,0,.2,1);pointer-events:none;white-space:nowrap}
      .isp-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
      .isp-engines-container{max-height:320px;overflow-y:auto;overflow-x:hidden}
      .isp-engines-container::-webkit-scrollbar{width:4px}
      .isp-engines-container::-webkit-scrollbar-track{background:transparent}
      .isp-engines-container::-webkit-scrollbar-thumb{background:var(--isp-border);border-radius:2px}
      .isp-drag-handle{cursor:grab;user-select:none}
      .isp-drag-handle:active{cursor:grabbing}
      .isp-emoji-btn{width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:18px;cursor:pointer;border-radius:6px;border:1px solid var(--isp-border);background:var(--isp-input-bg);transition:all .2s ease;flex-shrink:0;position:relative}
      .isp-emoji-btn:hover{background:var(--isp-hover);border-color:var(--isp-accent)}
      .isp-emoji-btn img{width:20px;height:20px;object-fit:contain}
      .isp-radio-group{display:flex;gap:5px;flex-wrap:nowrap}
      .isp-radio-btn{flex:1;padding:6px 4px;border:1.5px solid var(--isp-border);border-radius:9px;cursor:pointer;text-align:center;font-size:11px;font-weight:500;color:var(--isp-text-secondary);transition:all .18s ease;background:var(--isp-input-bg);white-space:nowrap;min-width:0}
      .isp-radio-btn:hover{border-color:var(--isp-accent);color:var(--isp-accent)}
      .isp-radio-btn.active{border-color:var(--isp-accent);background:var(--isp-accent);color:white;box-shadow:0 2px 8px rgba(59,130,246,.3)}
      .isp-section-label{font-size:12px;color:var(--isp-text-secondary);font-weight:600;letter-spacing:.3px;margin-bottom:8px;display:block}
      .isp-setting-row{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;background:var(--isp-input-bg);border-radius:10px}
      .isp-setting-row-label{font-size:14px;color:var(--isp-text)}
      .isp-popover{position:fixed;z-index:2147483647;border-radius:14px;overflow:hidden;animation:isp-scaleIn .18s ease;width:300px;max-width:92vw}
      .isp-popover-header{padding:10px 14px;display:flex;align-items:center;justify-content:space-between}
      .isp-popover-title{color:white;font-size:13px;font-weight:600}
      .isp-popover-close{width:22px;height:22px;border-radius:6px;background:rgba(255,255,255,.15);border:none;color:white;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:15px;transition:background .2s;line-height:1}
      .isp-popover-close:hover{background:rgba(255,255,255,.3)}
      .isp-popover-tabs{display:flex;border-bottom:1px solid var(--isp-border)}
      .isp-popover-tab{flex:1;padding:8px 4px;font-size:11px;font-weight:500;color:var(--isp-text-secondary);cursor:pointer;text-align:center;transition:all .2s ease;border-bottom:2px solid transparent}
      .isp-popover-tab:hover{color:var(--isp-text)}
      .isp-popover-tab.active{color:var(--isp-accent);border-bottom-color:var(--isp-accent)}
      .isp-popover-body{padding:10px}
      .isp-emoji-grid{display:grid;grid-template-columns:repeat(8,1fr);gap:2px}
      .isp-emoji-item{aspect-ratio:1;display:flex;align-items:center;justify-content:center;font-size:18px;cursor:pointer;border-radius:7px;transition:all .14s ease}
      .isp-emoji-item:hover{background:var(--isp-hover);transform:scale(1.18)}
      .isp-emoji-item.selected{background:var(--isp-accent)}
      .isp-url-field{display:flex;flex-direction:column;gap:8px}
      .isp-url-preview-box{padding:8px;background:var(--isp-input-bg);border-radius:8px;display:flex;align-items:center;gap:8px;border:1px solid var(--isp-border)}
      .isp-url-preview-box img{width:28px;height:28px;object-fit:contain;border-radius:5px;flex-shrink:0}
      .isp-url-preview-text{flex:1;font-size:11px;color:var(--isp-text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .isp-url-error{color:#ef4444;font-size:11px;padding:5px 8px;background:rgba(239,68,68,.08);border-radius:6px;border:1px solid rgba(239,68,68,.2)}
      .isp-popover-footer{padding:8px 10px;border-top:1px solid var(--isp-border)}
      .isp-input-error{border-color:#ef4444!important;box-shadow:0 0 0 3px rgba(239,68,68,.15)!important}
      .isp-inline-error{display:none;margin-top:6px;color:#ef4444;font-size:12px;padding:5px 8px;background:rgba(239,68,68,.08);border-radius:6px;border:1px solid rgba(239,68,68,.2);}
    `;
    document.head.appendChild(style);
  }

  function createPanel() {
    if (panel) return panel;
    injectStyles();
    panel = document.createElement('div');
    panel.className = 'isp-panel';
    panel.id = 'image-search-panel';
    panel.style.cssText = `position:fixed;z-index:2147483647;border-radius:14px;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);animation:isp-fadeIn .2s ease;overflow:hidden;`;
    document.body.appendChild(panel);
    return panel;
  }

  function rebuildPanelContent() {
    if (!panel) return;
    const colors = getThemeColors();
    setVars(panel, colors);
    panel.style.background = colors.bg;
    panel.style.border = `1px solid ${colors.border}`;
    panel.style.boxShadow = colors.shadow;
    panel.style.minWidth = PANEL_DIMENSIONS.minWidth + 'px';
    panel.style.maxWidth = PANEL_DIMENSIONS.maxWidth + 'px';

    while (panel.firstChild) panel.removeChild(panel.firstChild);

    const header = document.createElement('div');
    header.className = 'isp-drag-handle';
    header.id = 'isp-header';
    header.style.cssText = `padding:13px 16px;background:${colors.headerBg};color:white;font-size:14px;font-weight:600;display:flex;align-items:center;justify-content:space-between;`;

    const headerLeft = document.createElement('div');
    headerLeft.style.cssText = 'display:flex;align-items:center;gap:8px;';
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', '17');
    svg.setAttribute('height', '17');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2.2');
    const circle = document.createElementNS(svgNS, 'circle');
    circle.setAttribute('cx', '11');
    circle.setAttribute('cy', '11');
    circle.setAttribute('r', '8');
    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('d', 'm21 21-4.35-4.35');
    svg.appendChild(circle);
    svg.appendChild(path);
    const titleSpan = document.createElement('span');
    titleSpan.textContent = '以图搜图';
    headerLeft.appendChild(svg);
    headerLeft.appendChild(titleSpan);

    const headerRight = document.createElement('div');
    headerRight.style.cssText = 'display:flex;align-items:center;gap:4px;';

    if (IS_TAMPERMONKEY) {
      const historyBtn = document.createElement('button');
      historyBtn.className = 'isp-header-btn';
      historyBtn.id = 'isp-history-btn';
      historyBtn.title = '历史记录';
      historyBtn.textContent = '🕐';
      historyBtn.addEventListener('click', (e) => { e.stopPropagation(); showHistory(); });

      const settingsBtn = document.createElement('button');
      settingsBtn.className = 'isp-header-btn';
      settingsBtn.id = 'isp-settings-btn';
      settingsBtn.title = '设置';
      settingsBtn.textContent = '⚙️';
      settingsBtn.addEventListener('click', (e) => { e.stopPropagation(); openSettings(); });

      headerRight.appendChild(historyBtn);
      headerRight.appendChild(settingsBtn);
    }

    header.appendChild(headerLeft);
    header.appendChild(headerRight);
    panel.appendChild(header);

    if (config.showPreview && currentImageData.url) {
      const preview = document.createElement('div');
      preview.className = 'isp-preview';

      const previewImg = document.createElement('img');
      previewImg.className = 'isp-preview-image';
      previewImg.src = currentImageData.url;
      previewImg.alt = '预览';
      preview.appendChild(previewImg);

      const previewInfo = document.createElement('div');
      previewInfo.className = 'isp-preview-info';

      const dimSpan = document.createElement('span');
      dimSpan.textContent = `📐 ${currentImageData.width} × ${currentImageData.height}`;
      previewInfo.appendChild(dimSpan);

      if (currentImageData.size) {
        const fileSizeSpan = document.createElement('span');
        fileSizeSpan.textContent = `💾 ${formatFileSize(currentImageData.size)}`;
        previewInfo.appendChild(fileSizeSpan);
      }

      preview.appendChild(previewInfo);
      panel.appendChild(preview);
    }

    const enginesContainer = document.createElement('div');
    enginesContainer.className = 'isp-engines-container';

    if (IS_TAMPERMONKEY) {
      const allItem = document.createElement('div');
      allItem.className = 'isp-item';
      allItem.style.cssText = 'background:var(--isp-input-bg);font-weight:600;';

      const allIcon = document.createElement('span');
      allIcon.className = 'isp-icon';
      allIcon.textContent = '🌐';

      const allLabel = document.createElement('span');
      allLabel.textContent = `全部搜索 (${config.enabledEngines.length} 个引擎)`;

      const allShortcut = document.createElement('span');
      allShortcut.className = 'isp-shortcut';
      allShortcut.textContent = 'Space';

      allItem.appendChild(allIcon);
      allItem.appendChild(allLabel);
      allItem.appendChild(allShortcut);
      allItem.addEventListener('click', searchWithAllEngines);
      enginesContainer.appendChild(allItem);
    }

    config.enabledEngines.forEach((name, index) => {
      if (!config.engines[name]) return;
      const engineData = config.engines[name];
      const item = document.createElement('div');
      item.className = 'isp-item';

      const iconContainer = document.createElement('span');
      iconContainer.className = 'isp-icon';
      iconContainer.appendChild(createIconElementAuto(name, engineData.icon, engineData.url));

      const nameSpan = document.createElement('span');
      nameSpan.textContent = name;

      const shortcutSpan = document.createElement('span');
      shortcutSpan.className = 'isp-shortcut';
      shortcutSpan.textContent = (index + 1).toString();

      item.appendChild(iconContainer);
      item.appendChild(nameSpan);
      item.appendChild(shortcutSpan);
      item.addEventListener('click', () => searchWithEngine(name));
      enginesContainer.appendChild(item);
    });

    panel.appendChild(enginesContainer);
    setupDrag(header);
  }

  function setupDrag(header) {
    header.addEventListener('mousedown', (e) => {
      if (e.target.closest('#isp-settings-btn') || e.target.closest('#isp-history-btn')) return;
      isDragging = true;
      const rect = panel.getBoundingClientRect();
      dragOffset.x = e.clientX - rect.left;
      dragOffset.y = e.clientY - rect.top;
      panel.style.transition = 'none';
      header.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging || !panel) return;
      e.preventDefault();
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      const maxX = window.innerWidth - panel.offsetWidth;
      const maxY = window.innerHeight - panel.offsetHeight;
      panel.style.left = Math.max(0, Math.min(newX, maxX)) + 'px';
      panel.style.top = Math.max(0, Math.min(newY, maxY)) + 'px';
    });

    document.addEventListener('mouseup', () => {
      if (isDragging && panel) {
        isDragging = false;
        panel.style.transition = '';
        const h = panel.querySelector('#isp-header');
        if (h) h.style.cursor = 'grab';
      }
    });
  }

  function getEngineIcon(name) {
    const icons = {
      Google: 'https://raw.githubusercontent.com/fmz200/wool_scripts/main/icons/apps/Google.png',
      Yandex: '', SauceNAO: '🍜', IQDB: '', '3D IQDB': '', WhatAnime: '', Ascii2D: '',
    };
    return icons[name] || '';
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function showPanel(x, y) {
    if (!panel) createPanel();
    rebuildPanelContent();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const panelWidth = PANEL_DIMENSIONS.maxWidth;
    const engineCount = config.enabledEngines.length;
    const headerHeight = 52;
    const allSearchHeight = IS_TAMPERMONKEY ? 48 : 0;
    const engineItemHeight = 47;
    const previewHeight = config.showPreview && currentImageData.url ? 200 : 0;
    const panelHeight = headerHeight + previewHeight + allSearchHeight + engineCount * engineItemHeight;
    const maxX = viewportWidth - panelWidth - 20;
    const maxY = viewportHeight - panelHeight - 20;
    panel.style.left = Math.max(20, Math.min(x, maxX)) + 'px';
    panel.style.top = Math.max(20, Math.min(y, maxY)) + 'px';
    panel.style.display = 'block';
    isPanelVisible = true;
  }

  function hidePanel() {
    if (panel) panel.style.display = 'none';
    isPanelVisible = false;
    hotKeyPressed = false;
  }

  function shouldKeepPanelOpen() {
    return IS_TAMPERMONKEY && !!config.keepPanelOpen;
  }

  function buildSearchUrl(template, url) {
    let searchUrl = url;
    const before = template.split(/{%s+}/)[0];
    const hasQueryParam = before.indexOf('?') >= 0;
    if (hasQueryParam) {
      const match = template.match(/{%s+}/);
      if (match) {
        const encodeTimes = match[0].length - 3;
        for (let j = 0; j < encodeTimes; j++) searchUrl = encodeURIComponent(searchUrl);
      }
    }
    return template.replace(/{%s+}/g, searchUrl);
  }

  function openTab(url) {
    const mode = config.openMode || 'background';
    if (IS_TAMPERMONKEY) {
      if (mode === 'current') {
        window.location.href = url;
      } else {
        GM_openInTab(url, mode === 'background');
      }
    } else {
      window.open(url, '_blank');
    }
  }

  function searchWithAllEngines() {
    if (!IS_TAMPERMONKEY) { showToast('全部搜索功能仅在油猴环境下可用'); return; }
    if (!currentImageData.url) { showToast('请先选择图片'); return; }
    addToHistory(currentImageData.url, currentImageData.url);
    for (let i = config.enabledEngines.length - 1; i >= 0; i--) {
      const engineName = config.enabledEngines[i];
      const engineData = config.engines[engineName];
      if (!engineData || !engineData.url) continue;
      GM_openInTab(buildSearchUrl(engineData.url, currentImageData.url), true);
    }
    if (!shouldKeepPanelOpen()) hidePanel();
    else showToast(`已使用 ${config.enabledEngines.length} 个引擎搜索`);
  }

  function searchWithEngine(engineName) {
    if (!currentImageData.url) { showToast('请先选择图片'); return; }
    const engineData = config.engines[engineName];
    if (!engineData || !engineData.url) return;
    addToHistory(currentImageData.url, currentImageData.url);
    const finalUrl = buildSearchUrl(engineData.url, currentImageData.url);
    openTab(finalUrl);
    if (!shouldKeepPanelOpen()) hidePanel();
    else showToast(`已使用 ${engineName} 搜索`);
  }

  function closeEmojiPicker() {
    if (currentEmojiPicker) {
      currentEmojiPicker.remove();
      currentEmojiPicker = null;
    }
  }

  function createEmojiPicker(anchorEl, currentIcon, onSelect) {
    closeEmojiPicker();
    const colors = getThemeColors();

    const popover = document.createElement('div');
    popover.className = 'isp-popover';
    setVars(popover, colors);
    popover.style.background = colors.bg;
    popover.style.boxShadow = colors.shadow;
    popover.style.border = `1px solid ${colors.border}`;

    const popHeader = document.createElement('div');
    popHeader.className = 'isp-popover-header';
    popHeader.style.background = colors.headerBg;

    const popTitle = document.createElement('div');
    popTitle.className = 'isp-popover-title';
    popTitle.textContent = '🎨 选择图标';

    const popClose = document.createElement('button');
    popClose.className = 'isp-popover-close';
    popClose.textContent = '×';
    popClose.addEventListener('click', closeEmojiPicker);

    popHeader.appendChild(popTitle);
    popHeader.appendChild(popClose);
    popover.appendChild(popHeader);

    const tabs = document.createElement('div');
    tabs.className = 'isp-popover-tabs';
    tabs.style.background = colors.inputBg;
    const categories = [...Object.keys(EMOJI_CATEGORIES), '网络图片'];

    categories.forEach((category, index) => {
      const tab = document.createElement('div');
      tab.className = 'isp-popover-tab' + (index === 0 ? ' active' : '');
      tab.textContent = category === '表情' ? '😊 表情' : '🌐 网络图片';
      tab.dataset.category = category;
      tabs.appendChild(tab);
    });

    popover.appendChild(tabs);

    const body = document.createElement('div');
    body.className = 'isp-popover-body';

    function showCategory(category) {
      while (body.firstChild) body.removeChild(body.firstChild);
      const existingFooter = popover.querySelector('.isp-popover-footer');
      if (existingFooter) existingFooter.remove();

      if (category === '网络图片') {
        const urlField = document.createElement('div');
        urlField.className = 'isp-url-field';

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'isp-input';
        input.placeholder = '输入图片 URL (https://...)';
        input.style.fontSize = '12px';
        if (isImageUrl(currentIcon)) input.value = currentIcon;

        const previewBox = document.createElement('div');
        previewBox.className = 'isp-url-preview-box';
        previewBox.style.display = 'none';

        const previewImg = document.createElement('img');
        previewImg.alt = '预览';
        const previewText = document.createElement('div');
        previewText.className = 'isp-url-preview-text';
        previewBox.appendChild(previewImg);
        previewBox.appendChild(previewText);

        const errorDiv = document.createElement('div');
        errorDiv.className = 'isp-url-error';
        errorDiv.style.display = 'none';

        input.addEventListener('input', () => {
          const url = input.value.trim();
          errorDiv.style.display = 'none';
          if (isImageUrl(url)) {
            previewImg.src = url;
            previewImg.onload = () => {
              previewBox.style.display = 'flex';
              previewText.textContent = url;
            };
            previewImg.onerror = () => {
              previewBox.style.display = 'none';
              errorDiv.textContent = '图片加载失败，请检查 URL';
              errorDiv.style.display = 'block';
            };
          } else {
            previewBox.style.display = 'none';
            if (url && url.startsWith('http')) {
              errorDiv.textContent = '请输入有效的图片 URL';
              errorDiv.style.display = 'block';
            }
          }
        });

        urlField.appendChild(input);
        urlField.appendChild(previewBox);
        urlField.appendChild(errorDiv);
        body.appendChild(urlField);

        const footer = document.createElement('div');
        footer.className = 'isp-popover-footer';
        footer.style.background = colors.inputBg;
        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'isp-btn isp-btn-primary';
        confirmBtn.style.cssText = 'width:100%;padding:7px;font-size:13px;';
        confirmBtn.textContent = '✓ 确认使用';
        confirmBtn.addEventListener('click', () => {
          const url = input.value.trim();
          if (isImageUrl(url)) {
            onSelect(url);
            closeEmojiPicker();
          } else {
            errorDiv.textContent = '请输入有效的图片 URL (https:// 开头)';
            errorDiv.style.display = 'block';
          }
        });
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') confirmBtn.click(); });
        footer.appendChild(confirmBtn);
        popover.appendChild(footer);
      } else {
        const grid = document.createElement('div');
        grid.className = 'isp-emoji-grid';
        EMOJI_CATEGORIES[category].forEach((emoji) => {
          const item = document.createElement('div');
          item.className = 'isp-emoji-item' + (emoji === currentIcon ? ' selected' : '');
          item.textContent = emoji;
          item.addEventListener('click', () => {
            onSelect(emoji);
            closeEmojiPicker();
          });
          grid.appendChild(item);
        });
        body.appendChild(grid);
      }
    }

    showCategory(categories[0]);
    popover.appendChild(body);

    tabs.querySelectorAll('.isp-popover-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.querySelectorAll('.isp-popover-tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        showCategory(tab.dataset.category);
      });
    });

    document.documentElement.appendChild(popover);
    currentEmojiPicker = popover;

    const anchorRect = anchorEl.getBoundingClientRect();
    const popW = 300;
    const popH = popover.offsetHeight || 280;
    let left = anchorRect.left;
    let top = anchorRect.bottom + 6;
    if (left + popW > window.innerWidth - 8) left = window.innerWidth - popW - 8;
    if (top + popH > window.innerHeight - 8) top = anchorRect.top - popH - 6;
    popover.style.left = Math.max(8, left) + 'px';
    popover.style.top = Math.max(8, top) + 'px';

    setTimeout(() => {
      document.addEventListener('mousedown', function outsideClick(e) {
        if (!popover.contains(e.target) && e.target !== anchorEl) {
          closeEmojiPicker();
          document.removeEventListener('mousedown', outsideClick);
        }
      });
    }, 0);

    return popover;
  }

  function openSettings() {
    if (!IS_TAMPERMONKEY) return;
    hidePanel();
    const colors = getThemeColors();

    const overlay = document.createElement('div');
    overlay.className = 'isp-modal-overlay';
    overlay.id = 'isp-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'isp-modal isp-settings-modal';
    modal.id = 'image-search-settings';
    modal.style.cssText = `
      position:fixed;
      top:50%;
      left:50%;
      transform:translate(-50%,-50%);
      z-index:2147483647;
      border-radius:16px;
      max-width:90vw;
      max-height:90vh;
      overflow:hidden;
      animation:isp-modalIn .22s ease forwards;
    `;
    setVars(modal, colors);
    modal.style.background = colors.bg;
    modal.style.boxShadow = colors.shadow;

    const content = document.createElement('div');
    content.className = 'isp-settings-content';

    const titleRow = document.createElement('div');
    titleRow.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:22px;';
    const titleH2 = document.createElement('h2');
    titleH2.style.cssText = 'margin:0;font-size:18px;font-weight:700;color:var(--isp-text);';
    titleH2.textContent = '⚙️ 设置';
    const closeBtn = document.createElement('div');
    closeBtn.style.cssText = 'width:30px;height:30px;display:flex;align-items:center;justify-content:center;cursor:pointer;border-radius:8px;transition:background .2s;font-size:22px;color:var(--isp-text-secondary);';
    closeBtn.textContent = '×';
    closeBtn.addEventListener('mouseenter', () => { closeBtn.style.background = colors.hover; });
    closeBtn.addEventListener('mouseleave', () => { closeBtn.style.background = 'transparent'; });
    titleRow.appendChild(titleH2);
    titleRow.appendChild(closeBtn);
    content.appendChild(titleRow);

    const hotkeySection = document.createElement('div');
    hotkeySection.style.cssText = 'margin-bottom:20px;';
    const hotkeyLabel = document.createElement('span');
    hotkeyLabel.className = 'isp-section-label';
    hotkeyLabel.textContent = '触发快捷键';

    const hotkeySelect = document.createElement('select');
    hotkeySelect.id = 'isp-hotkey-select';
    hotkeySelect.className = 'isp-input';
    hotkeySelect.style.cssText = 'width:100%;box-sizing:border-box;';
    [
      ['ctrlKey', 'Ctrl + 右键'],
      ['shiftKey', 'Shift + 右键'],
      ['altKey', 'Alt + 右键'],
      ['custom', '自定义'],
    ].forEach(([val, text]) => {
      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = text;
      hotkeySelect.appendChild(opt);
    });
    hotkeySelect.value = config.hotKey;

    const customHotkeyWrap = document.createElement('div');
    customHotkeyWrap.style.cssText = `margin-top:8px;width:100%;box-sizing:border-box;display:${config.hotKey === 'custom' ? 'block' : 'none'};`;

    const customHotkeyInput = document.createElement('input');
    customHotkeyInput.className = 'isp-input';
    customHotkeyInput.id = 'isp-custom-hotkey-input';
    customHotkeyInput.placeholder = '按下组合键（如 Ctrl+Shift）';
    customHotkeyInput.value = config.customHotKey || '';
    customHotkeyInput.readOnly = true;
    customHotkeyInput.style.cssText = 'cursor:pointer;width:100%;box-sizing:border-box;';

    const customHotkeyError = document.createElement('div');
    customHotkeyError.className = 'isp-inline-error';
    customHotkeyError.textContent = '⚠️ 请先按下组合键绑定自定义快捷键';

    customHotkeyInput.addEventListener('keydown', (e) => {
      e.preventDefault();
      const parts = [];
      if (e.ctrlKey) parts.push('Ctrl');
      if (e.shiftKey) parts.push('Shift');
      if (e.altKey) parts.push('Alt');
      if (e.metaKey) parts.push('Meta');
      customHotkeyInput.value = parts.join('+') || '';
      customHotkeyInput.classList.remove('isp-input-error');
      customHotkeyError.style.display = 'none';
      config.customHotKey = customHotkeyInput.value;
    });

    customHotkeyWrap.appendChild(customHotkeyInput);
    customHotkeyWrap.appendChild(customHotkeyError);

    hotkeySelect.addEventListener('change', () => {
      const isCustom = hotkeySelect.value === 'custom';
      customHotkeyWrap.style.display = isCustom ? 'block' : 'none';
      if (!isCustom) {
        customHotkeyInput.classList.remove('isp-input-error');
        customHotkeyError.style.display = 'none';
      }
    });

    hotkeySection.appendChild(hotkeyLabel);
    hotkeySection.appendChild(hotkeySelect);
    hotkeySection.appendChild(customHotkeyWrap);
    content.appendChild(hotkeySection);

    const enginesSection = document.createElement('div');
    enginesSection.style.cssText = 'margin-bottom:20px;';
    const enginesHeader = document.createElement('div');
    enginesHeader.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;';
    const enginesLabel = document.createElement('span');
    enginesLabel.className = 'isp-section-label';
    enginesLabel.style.marginBottom = '0';
    enginesLabel.textContent = '搜索引擎';
    const addEngineBtn = document.createElement('button');
    addEngineBtn.className = 'isp-btn isp-btn-secondary';
    addEngineBtn.style.cssText = 'padding:5px 12px;font-size:12px;';
    addEngineBtn.textContent = '+ 添加';
    enginesHeader.appendChild(enginesLabel);
    enginesHeader.appendChild(addEngineBtn);

    const enginesList = document.createElement('div');
    enginesList.id = 'isp-engines-list';
    enginesList.style.cssText = 'max-height:217px;overflow-y:auto;border:1px solid var(--isp-border);border-radius:10px;';

    Object.keys(config.engines).forEach((name) => {
      const engineData = config.engines[name];
      enginesList.appendChild(
        createEngineItem(name, engineData.url, config.enabledEngines.includes(name), engineData.icon || '')
      );
    });

    enginesSection.appendChild(enginesHeader);
    enginesSection.appendChild(enginesList);
    content.appendChild(enginesSection);

    const otherSection = document.createElement('div');
    otherSection.style.cssText = 'margin-bottom:20px;';
    const otherLabel = document.createElement('span');
    otherLabel.className = 'isp-section-label';
    otherLabel.textContent = '其他设置';

    const togglesWrapper = document.createElement('div');
    togglesWrapper.style.cssText = 'display:flex;flex-direction:column;gap:8px;';

    function createToggleRow(labelText, id, active) {
      const row = document.createElement('div');
      row.className = 'isp-setting-row';
      const span = document.createElement('span');
      span.className = 'isp-setting-row-label';
      span.textContent = labelText;
      const sw = document.createElement('div');
      sw.id = id;
      sw.className = 'isp-switch' + (active ? ' active' : '');
      sw.addEventListener('click', function () { this.classList.toggle('active'); });
      row.appendChild(span);
      row.appendChild(sw);
      return row;
    }

    togglesWrapper.appendChild(createToggleRow('显示图片预览', 'isp-toggle-preview', config.showPreview));
    togglesWrapper.appendChild(createToggleRow('搜索后保持面板', 'isp-toggle-keep-open', config.keepPanelOpen));

    const openModeRow = document.createElement('div');
    openModeRow.className = 'isp-setting-row';
    openModeRow.style.cssText = 'flex-direction:column;align-items:flex-start;gap:10px;';
    const openModeLabel = document.createElement('span');
    openModeLabel.className = 'isp-setting-row-label';
    openModeLabel.textContent = '单引擎打开方式';

    const radioGroup = document.createElement('div');
    radioGroup.className = 'isp-radio-group';
    radioGroup.style.cssText = 'width:100%;';

    [['background', '后台新标签'], ['foreground', '前台新标签'], ['current', '当前页']].forEach(([val, text]) => {
      const btn = document.createElement('div');
      btn.className = 'isp-radio-btn' + ((config.openMode || 'background') === val ? ' active' : '');
      btn.textContent = text;
      btn.dataset.value = val;
      btn.addEventListener('click', () => {
        radioGroup.querySelectorAll('.isp-radio-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
      });
      radioGroup.appendChild(btn);
    });

    openModeRow.appendChild(openModeLabel);
    openModeRow.appendChild(radioGroup);
    togglesWrapper.appendChild(openModeRow);

    otherSection.appendChild(otherLabel);
    otherSection.appendChild(togglesWrapper);
    content.appendChild(otherSection);

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:10px;';

    const saveBtn = document.createElement('button');
    saveBtn.className = 'isp-btn isp-btn-primary';
    saveBtn.style.flex = '1';
    saveBtn.textContent = '保存设置';

    const resetBtn = document.createElement('button');
    resetBtn.className = 'isp-btn isp-btn-secondary';
    resetBtn.style.flex = '1';
    resetBtn.textContent = '重置默认';

    btnRow.appendChild(saveBtn);
    btnRow.appendChild(resetBtn);
    content.appendChild(btnRow);
    modal.appendChild(content);

    document.documentElement.appendChild(overlay);
    document.documentElement.appendChild(modal);

    const close = () => {
      closeEmojiPicker();
      overlay.remove();
      modal.remove();
    };
    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', close);

    addEngineBtn.addEventListener('click', () => {
      enginesList.insertBefore(createEngineItem('', '', false, '', true), enginesList.firstChild);
    });

    saveBtn.addEventListener('click', () => {
      if (hotkeySelect.value === 'custom' && !customHotkeyInput.value.trim()) {
        customHotkeyInput.classList.add('isp-input-error');
        customHotkeyError.style.display = 'block';
        customHotkeyWrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
        customHotkeyInput.focus();
        return;
      }
      config.hotKey = hotkeySelect.value;
      if (hotkeySelect.value === 'custom') config.customHotKey = customHotkeyInput.value;
      config.showPreview = modal.querySelector('#isp-toggle-preview').classList.contains('active');
      config.keepPanelOpen = modal.querySelector('#isp-toggle-keep-open').classList.contains('active');
      const activeMode = radioGroup.querySelector('.isp-radio-btn.active');
      if (activeMode) config.openMode = activeMode.dataset.value;
      const newEngines = {};
      const newEnabled = [];
      enginesList.querySelectorAll('.isp-engine-item').forEach((item) => {
        const name = item.querySelector('.engine-name').value.trim();
        const url = item.querySelector('.engine-url').value.trim();
        const iconContainer = item.querySelector('.engine-icon');
        const img = iconContainer.querySelector('img');
        const icon = img ? img.src : iconContainer.textContent.trim() || '';
        const enabled = item.querySelector('.engine-enabled').classList.contains('active');
        if (name && url) {
          newEngines[name] = { url, icon };
          if (enabled) newEnabled.push(name);
        }
      });
      config.engines = newEngines;
      config.enabledEngines = newEnabled;
      saveConfig();
      close();
      showToast('设置已保存');
    });

    resetBtn.addEventListener('click', () => {
      if (confirm('确定要重置所有设置吗?')) {
        config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
        saveConfig();
        close();
        showToast('设置已重置');
      }
    });
  }

  function createEngineItem(name, url, enabled, icon = '', isNew = false) {
    const item = document.createElement('div');
    item.className = 'isp-engine-item';
    item.style.cssText = `padding:10px 12px;border-bottom:1px solid var(--isp-border);display:flex;gap:8px;align-items:center;`;

    const enabledSwitch = document.createElement('div');
    enabledSwitch.className = 'engine-enabled isp-switch' + (enabled ? ' active' : '');
    enabledSwitch.addEventListener('click', function () { this.classList.toggle('active'); });

    const emojiBtn = document.createElement('div');
    emojiBtn.className = 'isp-emoji-btn engine-icon';
    emojiBtn.title = '点击选择图标';

    if (isImageUrl(icon)) {
      const img = document.createElement('img');
      img.src = icon;
      img.style.cssText = 'width:20px;height:20px;object-fit:contain;';
      img.onerror = () => {
        while (emojiBtn.firstChild) emojiBtn.removeChild(emojiBtn.firstChild);
        emojiBtn.textContent = '🔎';
      };
      emojiBtn.appendChild(img);
    } else if (icon && [...icon].length <= 2) {
      emojiBtn.textContent = icon;
    } else {
      const img = document.createElement('img');
      img.style.cssText = 'width:20px;height:20px;object-fit:contain;';
      const domain = extractDomainFromUrl(url);
      if (domain && iconCache[domain]) {
        img.src = iconCache[domain];
        emojiBtn.appendChild(img);
      } else if (domain) {
        fetchAndCacheIcon(name, url, img);
        emojiBtn.appendChild(img);
      } else {
        emojiBtn.textContent = '🔎';
      }
      img.onerror = () => {
        while (emojiBtn.firstChild) emojiBtn.removeChild(emojiBtn.firstChild);
        emojiBtn.textContent = '🔎';
      };
    }

    emojiBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const currentIcon = isImageUrl(icon)
        ? icon
        : (emojiBtn.querySelector('img') ? emojiBtn.querySelector('img').src : emojiBtn.textContent);
      createEmojiPicker(emojiBtn, currentIcon, (selectedIcon) => {
        while (emojiBtn.firstChild) emojiBtn.removeChild(emojiBtn.firstChild);
        if (isImageUrl(selectedIcon)) {
          const img = document.createElement('img');
          img.src = selectedIcon;
          img.style.cssText = 'width:20px;height:20px;object-fit:contain;';
          img.onerror = () => {
            while (emojiBtn.firstChild) emojiBtn.removeChild(emojiBtn.firstChild);
            emojiBtn.textContent = '🔎';
          };
          emojiBtn.appendChild(img);
        } else {
          emojiBtn.textContent = selectedIcon;
        }
        icon = selectedIcon;
      });
    });

    const nameInput = document.createElement('input');
    nameInput.className = 'engine-name isp-input';
    nameInput.value = name;
    nameInput.placeholder = '名称';
    nameInput.style.cssText = 'width:90px;padding:7px 8px;font-size:13px;';

    const urlInput = document.createElement('input');
    urlInput.className = 'engine-url isp-input';
    urlInput.value = url;
    urlInput.placeholder = 'URL ({%s} 替代图片地址)';
    urlInput.style.cssText = 'flex:1;padding:7px 8px;font-size:13px;';

    const deleteBtn = document.createElement('div');
    deleteBtn.style.cssText = 'cursor:pointer;padding:4px;opacity:.5;transition:opacity .2s;font-size:15px;flex-shrink:0;';
    deleteBtn.textContent = '🗑️';
    deleteBtn.addEventListener('mouseenter', function () { this.style.opacity = '1'; });
    deleteBtn.addEventListener('mouseleave', function () { this.style.opacity = '.5'; });
    deleteBtn.addEventListener('click', () => {
      item.style.animation = 'isp-slideIn .2s ease reverse';
      setTimeout(() => item.remove(), 180);
    });

    item.appendChild(enabledSwitch);
    item.appendChild(emojiBtn);
    item.appendChild(nameInput);
    item.appendChild(urlInput);
    item.appendChild(deleteBtn);
    return item;
  }

  function showHistory() {
    if (!IS_TAMPERMONKEY) return;
    if (searchHistory.length === 0) { showToast('暂无搜索历史'); return; }
    hidePanel();
    const colors = getThemeColors();

    const overlay = document.createElement('div');
    overlay.className = 'isp-modal-overlay';
    overlay.id = 'isp-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'isp-modal';
    modal.style.cssText = `
      position:fixed;
      top:50%;
      left:50%;
      transform:translate(-50%,-50%);
      z-index:2147483647;
      border-radius:16px;
      max-width:90vw;
      max-height:90vh;
      overflow-y:auto;
      animation:isp-modalIn .22s ease forwards;
    `;
    setVars(modal, colors);
    modal.style.background = colors.bg;
    modal.style.boxShadow = colors.shadow;

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'padding:22px;min-width:400px;max-width:500px;';

    const headerRow = document.createElement('div');
    headerRow.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;';

    const titleH2 = document.createElement('h2');
    titleH2.style.cssText = 'margin:0;font-size:17px;font-weight:700;color:var(--isp-text);';
    titleH2.textContent = '🕐 搜索历史';

    const headerBtns = document.createElement('div');
    headerBtns.style.cssText = 'display:flex;gap:10px;align-items:center;';

    const clearBtn = document.createElement('button');
    clearBtn.className = 'isp-btn isp-btn-secondary';
    clearBtn.style.cssText = 'padding:5px 12px;font-size:12px;';
    clearBtn.textContent = '清空历史';

    const closeX = document.createElement('div');
    closeX.style.cssText = 'width:26px;height:26px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:20px;color:var(--isp-text-secondary);border-radius:6px;transition:background .2s;';
    closeX.textContent = '×';
    closeX.addEventListener('mouseenter', () => { closeX.style.background = colors.hover; });
    closeX.addEventListener('mouseleave', () => { closeX.style.background = 'transparent'; });

    headerBtns.appendChild(clearBtn);
    headerBtns.appendChild(closeX);
    headerRow.appendChild(titleH2);
    headerRow.appendChild(headerBtns);

    const listContainer = document.createElement('div');
    listContainer.style.cssText = 'max-height:400px;overflow-y:auto;border-radius:10px;border:1px solid var(--isp-border);overflow:hidden;';

    searchHistory.forEach((histItem, index) => {
      const row = document.createElement('div');
      row.className = 'isp-history-item';
      row.dataset.index = index;

      const thumb = document.createElement('img');
      thumb.className = 'isp-history-thumb';
      thumb.src = histItem.thumbnail;
      thumb.alt = '历史图片';

      const info = document.createElement('div');
      info.style.cssText = 'flex:1;overflow:hidden;';

      const urlText = document.createElement('div');
      urlText.style.cssText = 'font-size:12px;color:var(--isp-text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
      urlText.textContent = histItem.url;

      const timeText = document.createElement('div');
      timeText.className = 'isp-history-time';
      timeText.textContent = formatTime(histItem.timestamp);

      info.appendChild(urlText);
      info.appendChild(timeText);
      row.appendChild(thumb);
      row.appendChild(info);

      row.addEventListener('click', () => {
        currentImageData.url = histItem.url;
        window.open(histItem.url, '_blank');
        overlay.remove();
        modal.remove();
      });

      listContainer.appendChild(row);
    });

    wrapper.appendChild(headerRow);
    wrapper.appendChild(listContainer);
    modal.appendChild(wrapper);

    document.documentElement.appendChild(overlay);
    document.documentElement.appendChild(modal);

    const close = () => { overlay.remove(); modal.remove(); };
    closeX.addEventListener('click', close);
    overlay.addEventListener('click', close);

    clearBtn.addEventListener('click', () => {
      if (confirm('确定要清空所有历史记录吗?')) {
        searchHistory = [];
        saveHistory();
        close();
        showToast('历史已清空');
      }
    });
  }

  function formatTime(timestamp) {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes} 分钟前`;
    if (hours < 24) return `${hours} 小时前`;
    return `${days} 天前`;
  }

  function showToast(message) {
    const existing = document.querySelector('.isp-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'isp-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  function isHotKeyMatch(e) {
    if (config.hotKey === 'custom') {
      if (!config.customHotKey) return false;
      const parts = config.customHotKey.split('+');
      return parts.every((p) => {
        if (p === 'Ctrl') return e.ctrlKey;
        if (p === 'Shift') return e.shiftKey;
        if (p === 'Alt') return e.altKey;
        if (p === 'Meta') return e.metaKey;
        return false;
      });
    }
    return !!e[config.hotKey];
  }

  document.addEventListener('mousedown', function (e) {
    if (isHotKeyMatch(e) && e.button === 2) {
      hotKeyPressed = true;
      if (e.target.tagName === 'IMG' && e.target.src) {
        e.preventDefault();
        currentImageData = {
          url: e.target.src,
          blob: null,
          width: e.target.naturalWidth || e.target.width,
          height: e.target.naturalHeight || e.target.height,
          size: 0,
        };
        if (e.target.complete) {
          fetch(e.target.src, { method: 'HEAD' })
            .then((res) => {
              const size = parseInt(res.headers.get('content-length'));
              if (size) currentImageData.size = size;
            })
            .catch(() => {});
        }
        showPanel(e.pageX, e.pageY);
      }
    }
  }, true);

  document.addEventListener('contextmenu', function (e) {
    if (isPanelVisible && isHotKeyMatch(e)) e.preventDefault();
  }, true);

  document.addEventListener('click', function (e) {
    if (isPanelVisible && panel && !panel.contains(e.target)) {
      const modal = document.getElementById('isp-modal-overlay');
      const settings = document.getElementById('image-search-settings');
      if (!modal && !settings) hidePanel();
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (currentEmojiPicker) { closeEmojiPicker(); return; }
      if (isPanelVisible) {
        const modal = document.getElementById('isp-modal-overlay');
        if (modal) modal.click();
        else hidePanel();
      }
    }
    if (isPanelVisible && panel && !isNaN(e.key)) {
      const index = parseInt(e.key) - 1;
      if (index >= 0 && index < config.enabledEngines.length)
        searchWithEngine(config.enabledEngines[index]);
    }
    if (IS_TAMPERMONKEY && isPanelVisible && e.code === 'Space' && document.activeElement.tagName !== 'INPUT') {
      e.preventDefault();
      searchWithAllEngines();
    }
  });

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (panel) rebuildPanelContent();
  });

  window.addEventListener('resize', () => {
    if (panel && isPanelVisible) {
      const rect = panel.getBoundingClientRect();
      if (rect.right > window.innerWidth)
        panel.style.left = Math.max(0, window.innerWidth - rect.width - 20) + 'px';
      if (rect.bottom > window.innerHeight)
        panel.style.top = Math.max(0, window.innerHeight - rect.height - 20) + 'px';
    }
  });

  console.log(
    '🖼️ 以图搜图 已加载 - 按住 ' +
      (config.hotKey === 'ctrlKey' ? 'Ctrl' : config.hotKey === 'shiftKey' ? 'Shift' : config.hotKey === 'altKey' ? 'Alt' : '自定义键') +
      ' + 右键点击图片开始搜索'
  );
})();