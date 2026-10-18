(function() {
  'use strict';

  if (window.quickLinksAdded) return;
  window.quickLinksAdded = true;

  var PLACEHOLDER = '%s';

  var CONFIG = {
    ENGINE_KEY: 'searchEngine',
    ENGINES_KEY: 'searchEngines_custom',
    QUOTE_KEY: 'ql_daily_quote',
    RENDER_DELAY: 200,
    MAX_RETRY: 20,
    RETRY_INTERVAL: 500,
    // ====== 拖拽相关配置 ======
    ENABLE_LINK_DRAG: true,
    ENABLE_TEXT_DRAG: true,
    SHOW_DRAG_NOTIFICATIONS: true,
    MIN_TEXT_LENGTH: 2,
    DRAG_DISTANCE_THRESHOLD: 50,
    DEFAULT_ENGINES: {
      baidu:   { name: '百度',       url: 'https://www.baidu.com/s?wd=' + PLACEHOLDER,   favicon: 'https://www.baidu.com/favicon.ico' },
      bing:    { name: 'Bing',       url: 'https://www.bing.com/search?q=' + PLACEHOLDER, favicon: 'https://www.bing.com/favicon.ico' },
      google:  { name: 'Google',     url: 'https://www.google.com/search?q=' + PLACEHOLDER, favicon: 'https://p2.itc.cn/q_70/images03/20201113/84223f851dd54f94ba49ee294bb33968.png' },
      sogou:   { name: '搜狗',       url: 'https://www.sogou.com/web?query=' + PLACEHOLDER, favicon: 'https://www.sogou.com/favicon.ico' },
      so360:   { name: '360搜索',    url: 'https://www.so.com/s?q=' + PLACEHOLDER,        favicon: 'https://www.so.com/favicon.ico' },
      duck:    { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=' + PLACEHOLDER,      favicon: 'https://skyimg.cbjy520.com/f8/a0e47f1c9e9971627868933254cad5' }
    },
    FALLBACK_QUOTES: [
      { text: '生活不止眼前的苟且，还有诗和远方。', from: '高晓松' },
      { text: '千里之行，始于足下。', from: '老子' },
      { text: '凡是过往，皆为序章。', from: '莎士比亚' },
      { text: '保持热爱，奔赴山海。', from: '佚名' },
      { text: '你所浪费的今天，是昨天死去的人奢望的明天。', from: '哈佛校训' },
      { text: '种一棵树最好的时间是十年前，其次是现在。', from: '非洲谚语' },
      { text: '不积跬步，无以至千里；不积小流，无以成江海。', from: '荀子' }
    ]
  };

  var engines = {};
  var currentEngine = 'baidu';
  var panelRef = null;
  var expanded = false;
  var retryCount = 0;
  var quoteRef = null;

  /* ====== 新增：每日一言自动隐藏定时器 ====== */
  var quoteTimer = null;

  // ====== 拖拽状态 ======
  var dragState = {
    isDragging: false,
    startX: 0,
    startY: 0,
    dragType: null,   // 'link' | 'text' | null
    dragData: null     // linkInfo or selectedText
  };

  var engineBtnRef = null;
  var engineBtnImgRef = null;
  var engineBtnFallbackRef = null;
  var inputRef = null;
  var bottomRef = null;
  var engineListRef = null;

  /* ================================================================
   *  数据读写
   * ================================================================ */
  function migrateUrl(url) {
    if (url.indexOf(PLACEHOLDER) !== -1) return url;
    if (url.endsWith('=')) return url + PLACEHOLDER;
    return url + (url.indexOf('?') !== -1 ? '&' : '?') + 'q=' + PLACEHOLDER;
  }

  function extractFavicon(url) {
    try {
      var u = new URL(url);
      return u.origin + '/favicon.ico';
    } catch (e) { return ''; }
  }

  function loadEngines() {
    try {
      var saved = localStorage.getItem(CONFIG.ENGINES_KEY);
      if (saved) {
        engines = JSON.parse(saved);
        var needsSave = false;
        Object.keys(engines).forEach(function(key) {
          var migrated = migrateUrl(engines[key].url);
          if (migrated !== engines[key].url) { engines[key].url = migrated; needsSave = true; }
          if (engines[key].domain) { delete engines[key].domain; needsSave = true; }
          if (!engines[key].favicon) { engines[key].favicon = extractFavicon(engines[key].url); needsSave = true; }
        });
        if (needsSave) saveEngines();
        return;
      }
    } catch (e) {}
    engines = JSON.parse(JSON.stringify(CONFIG.DEFAULT_ENGINES));
  }

  function saveEngines() {
    try { localStorage.setItem(CONFIG.ENGINES_KEY, JSON.stringify(engines)); } catch (e) {}
  }

  function loadEngine() {
    try {
      var saved = localStorage.getItem(CONFIG.ENGINE_KEY);
      if (saved && engines[saved]) { currentEngine = saved; return currentEngine; }
    } catch (e) {}
    var keys = Object.keys(engines);
    if (keys.length > 0) currentEngine = keys[0];
    return currentEngine;
  }

  function saveEngine(engine) {
    currentEngine = engine;
    try { localStorage.setItem(CONFIG.ENGINE_KEY, engine); } catch (e) {}
  }

  /* ================================================================
   *  每日一言
   * ================================================================ */
  function getTodayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function getRandomFallback() {
    var list = CONFIG.FALLBACK_QUOTES;
    return list[Math.floor(Math.random() * list.length)];
  }

  function fetchDailyQuote() {
    try {
      var cached = localStorage.getItem(CONFIG.QUOTE_KEY);
      if (cached) {
        var data = JSON.parse(cached);
        if (data.date === getTodayStr() && data.text) {
          renderQuote(data.text, data.from);
          return;
        }
      }
    } catch (e) {}

    try {
      fetch('https://v1.hitokoto.cn/?c=a&c=b&c=c&c=d&c=e&c=f&c=g&c=h&c=i&c=j&c=k&c=l&min_length=8&max_length=40')
        .then(function(res) { return res.json(); })
        .then(function(data) {
          var quote = {
            date: getTodayStr(),
            text: data.hitokoto || '',
            from: data.from || ''
          };
          try { localStorage.setItem(CONFIG.QUOTE_KEY, JSON.stringify(quote)); } catch (e) {}
          renderQuote(quote.text, quote.from);
        })
        .catch(function() {
          var fb = getRandomFallback();
          renderQuote(fb.text, fb.from);
        });
    } catch (e) {
      var fb = getRandomFallback();
      renderQuote(fb.text, fb.from);
    }
  }

  /* ====== 修改：renderQuote 增加 10 秒后自动隐藏逻辑 ====== */
  function renderQuote(text, from) {
    if (!quoteRef) return;

    // 清除之前的定时器，确保元素可见
    if (quoteTimer) { clearTimeout(quoteTimer); quoteTimer = null; }
    var quoteRow = quoteRef.parentElement;
    if (quoteRow) {
      quoteRow.classList.remove('ql-quote-hidden');
    }

    quoteRef.style.opacity = '0';
    quoteRef.style.transition = 'opacity .4s ease';
    quoteRef.textContent = text;
    if (from) {
      quoteRef.textContent += ' —— ' + from;
    }
    void quoteRef.offsetWidth;
    quoteRef.style.opacity = '1';

    // 10 秒后自动隐藏
    quoteTimer = setTimeout(function() {
      if (quoteRow) {
        quoteRow.classList.add('ql-quote-hidden');
      }
    }, 10000);
  }

  /* ================================================================
   *  Fallback 文字
   * ================================================================ */
  function getFallbackLabel(name) {
    if (!name) return '?';
    var first = name.charAt(0);
    if (/[\u4e00-\u9fff]/.test(first)) return name.substring(0, 2);
    return first.toUpperCase();
  }

  function isChineseName(name) {
    return /[\u4e00-\u9fff]/.test(name.charAt(0));
  }

  /* ================================================================
   *  样式注入（毛玻璃风格全面强化）
   * ================================================================ */
  function injectStyle() {
    if (document.getElementById('ql-style')) return;
    var style = document.createElement('style');
    style.id = 'ql-style';
    style.textContent = [
      /* ---------- 面板容器 ---------- */
      '.ql-panel{',
      'max-width:783px;width:100%;margin:10px auto 6px;box-sizing:border-box;',
      'border-radius:24px;',
      'background:rgba(255,255,255,.55);',
      'backdrop-filter:blur(24px) saturate(180%);',
      '-webkit-backdrop-filter:blur(24px) saturate(180%);',
      'border:1px solid rgba(255,255,255,.5);',
      'box-shadow:0 4px 24px rgba(0,0,0,.06),0 1px 4px rgba(0,0,0,.04);',
      'transition:border-radius .35s cubic-bezier(.4,0,.2,1),box-shadow .35s ease;',
      'position:relative;z-index:2;overflow:hidden;',
      '}',

      '.ql-panel:hover{box-shadow:0 8px 32px rgba(0,0,0,.08),0 2px 8px rgba(0,0,0,.05);}',
      '.ql-panel.ql-expanded{',
      'border-radius:24px;',
      'box-shadow:0 12px 40px rgba(0,0,0,.1),0 4px 12px rgba(0,0,0,.06);',
      '}',

      /* ---------- 搜索行 ---------- */
      '.ql-panel-top{',
      'display:flex;align-items:center;gap:10px;',
      'padding:10px 14px;',
      '}',

      /* ---------- 引擎切换按钮 ---------- */
      '.ql-engine-btn{',
      'position:relative;flex-shrink:0;',
      'width:42px;height:42px;border-radius:50%;',
      'border:1.5px solid rgba(255,255,255,.4);',
      'background:rgba(255,255,255,.5);',
      'backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);',
      'cursor:pointer;outline:none;padding:0;',
      'display:flex;align-items:center;justify-content:center;',
      'transition:all .25s cubic-bezier(.4,0,.2,1);',
      'box-shadow:0 2px 12px rgba(0,0,0,.06);',
      'overflow:visible;',
      '}',
      '.ql-engine-btn:hover{transform:scale(1.06);box-shadow:0 4px 20px rgba(0,0,0,.1);}',
      '.ql-engine-btn:active{transform:scale(.95);transition:all .1s ease;}',
      '.ql-engine-btn:focus-visible{box-shadow:0 0 0 3px rgba(129,140,248,.3);}',
      '.ql-engine-btn img{width:22px;height:22px;object-fit:contain;border-radius:4px;}',
      '.ql-engine-btn .ql-fallback{',
      'font-size:14px;font-weight:700;color:#fff;line-height:1;',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;',
      'text-shadow:0 1px 2px rgba(0,0,0,.12);',
      '}',
      '.ql-engine-btn .ql-fallback.zh{font-size:13px;letter-spacing:0;}',

      '.ql-engine-arrow{',
      'position:absolute;bottom:-2px;right:-2px;',
      'width:18px;height:18px;border-radius:50%;',
      'background:rgba(255,255,255,.75);',
      'backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);',
      'border:1px solid rgba(255,255,255,.6);',
      'display:flex;align-items:center;justify-content:center;',
      'transition:transform .35s cubic-bezier(.4,0,.2,1);',
      'pointer-events:none;',
      '}',
      '.ql-engine-arrow svg{width:10px;height:10px;color:#94a3b8;}',
      '.ql-expanded .ql-engine-arrow{transform:rotate(180deg);}',

      /* ---------- 搜索输入 ---------- */
      '.ql-search-wrapper{flex:1;position:relative;display:flex;align-items:center;}',
      '.ql-search-input{',
      'width:100%;height:42px;',
      'padding:0 48px 0 16px;',
      'border:1.5px solid rgba(255,255,255,.45);',
      'border-radius:21px;font-size:14px;outline:none;',
      'background:rgba(255,255,255,.45);',
      'backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);',
      'transition:all .3s cubic-bezier(.4,0,.2,1);',
      'box-sizing:border-box;',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;',
      'color:#1e293b;box-shadow:inset 0 1px 3px rgba(0,0,0,.04);',
      '}',
      '.ql-search-input::placeholder{color:#94a3b8;font-weight:400;}',
      '.ql-search-input:focus{',
      'border-color:rgba(129,140,248,.4);',
      'background:rgba(255,255,255,.65);',
      'box-shadow:0 0 0 4px rgba(129,140,248,.1),inset 0 1px 3px rgba(0,0,0,.04);',
      '}',

      '.ql-search-btn{',
      'position:absolute;right:4px;',
      'width:34px;height:34px;border-radius:50%;',
      'border:none;',
      'background:var(--accent,#818cf8);',
      'color:#fff;cursor:pointer;',
      'display:flex;align-items:center;justify-content:center;',
      'transition:all .25s cubic-bezier(.4,0,.2,1);',
      'font-size:16px;outline:none;',
      'box-shadow:0 2px 8px rgba(0,0,0,.08);',
      '}',
      '.ql-search-btn:hover{background:var(--accent-hover,#7178e8);transform:scale(1.06);box-shadow:0 4px 14px rgba(0,0,0,.12);}',
      '.ql-search-btn:active{transform:scale(.94);transition:all .1s ease;}',
      '.ql-search-btn:focus-visible{box-shadow:0 0 0 3px rgba(129,140,248,.3);}',

      /* ---------- 每日一言 ---------- */
      /* ====== 修改：增加 transition 属性用于平滑隐藏 ====== */
      '.ql-quote-row{',
      'padding:4px 18px 8px;',
      'text-align:center;',
      'transition:opacity .6s ease,max-height .6s ease,padding .6s ease;',
      '}',
      /* ====== 新增：隐藏状态 ====== */
      '.ql-quote-row.ql-quote-hidden{',
      'opacity:0;max-height:0;padding-top:0;padding-bottom:0;overflow:hidden;',
      '}',
      '.ql-quote-text{',
      'font-size:12px;color:#94a3b8;',
      'line-height:1.6;',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Noto Sans SC",sans-serif;',
      'letter-spacing:.3px;',
      'max-width:100%;',
      'overflow:hidden;',
      'text-overflow:ellipsis;',
      'white-space:nowrap;',
      'transition:opacity .4s ease;',
      'cursor:default;',
      'user-select:none;',
      '}',
      '.ql-quote-text:hover{',
      'color:#64748b;',
      '}',

      /* ---------- 分割线 ---------- */
      '.ql-panel-divider{',
      'height:1px;background:rgba(0,0,0,.06);',
      'margin:0 14px;',
      'opacity:0;transform-origin:left center;',
      'transform:scaleX(0);',
      'transition:opacity .35s ease,transform .35s cubic-bezier(.4,0,.2,1);',
      '}',
      '.ql-expanded .ql-panel-divider{opacity:1;transform:scaleX(1);}',

      /* ---------- 引擎选择区 ---------- */
      '.ql-panel-bottom{',
      'max-height:0;opacity:0;overflow:hidden;',
      'transition:max-height .4s cubic-bezier(.4,0,.2,1),opacity .3s ease,padding .3s ease;',
      'padding:0 14px;',
      '}',
      '.ql-expanded .ql-panel-bottom{',
      'max-height:180px;opacity:1;',
      'padding:10px 14px 18px;',
      '}',

      '.ql-engine-list{',
      'display:flex;align-items:center;gap:6px;flex-wrap:wrap;',
      '}',

      '.ql-engine-option{',
      'display:flex;flex-direction:column;align-items:center;gap:4px;',
      'cursor:pointer;transition:all .2s ease;',
      'padding:8px 6px 6px;border-radius:14px;',
      'min-width:56px;border:2px solid transparent;',
      'background:transparent;',
      '}',
      '.ql-engine-option:hover{',
      'background:rgba(129,140,248,.08);',
      'transform:translateY(-2px);',
      '}',
      '.ql-engine-option:active{transform:scale(.94);transition:all .1s ease;}',
      '.ql-engine-option.active{',
      'border-color:var(--accent,#818cf8);',
      'background:rgba(129,140,248,.1);',
      '}',

      '.ql-engine-icon-wrap{',
      'width:36px;height:36px;border-radius:50%;',
      'display:flex;align-items:center;justify-content:center;',
      'flex-shrink:0;',
      'background:rgba(255,255,255,.5);',
      'backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);',
      'box-shadow:0 2px 8px rgba(0,0,0,.08);',
      'overflow:hidden;',
      '}',
      '.ql-engine-icon-wrap img{width:20px;height:20px;object-fit:contain;border-radius:3px;}',
      '.ql-engine-icon-wrap .ql-fallback{',
      'font-size:13px;font-weight:700;color:#fff;line-height:1;',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;',
      'text-shadow:0 1px 2px rgba(0,0,0,.12);',
      '}',
      '.ql-engine-icon-wrap .ql-fallback.zh{font-size:12px;letter-spacing:0;}',

      '.ql-engine-option-name{',
      'font-size:11px;color:#64748b;font-weight:500;',
      'white-space:nowrap;text-align:center;line-height:1.2;',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;',
      'max-width:60px;overflow:hidden;text-overflow:ellipsis;',
      '}',

      '.ql-engine-option-add{',
      'display:flex;flex-direction:column;align-items:center;gap:4px;',
      'cursor:pointer;transition:all .2s ease;',
      'padding:8px 6px 6px;border-radius:14px;min-width:56px;',
      '}',
      '.ql-engine-option-add:hover{',
      'background:rgba(129,140,248,.08);transform:translateY(-2px);',
      '}',
      '.ql-engine-option-add-icon{',
      'width:36px;height:36px;border-radius:50%;',
      'display:flex;align-items:center;justify-content:center;',
      'flex-shrink:0;font-size:18px;color:#94a3b8;',
      'background:rgba(255,255,255,.45);',
      'backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);',
      'border:1.5px dashed rgba(0,0,0,.12);',
      'transition:all .2s ease;',
      '}',
      '.ql-engine-option-add:hover .ql-engine-option-add-icon{',
      'border-color:var(--accent,#818cf8);color:var(--accent,#818cf8);',
      'background:rgba(129,140,248,.08);',
      '}',
      '.ql-engine-option-add-name{',
      'font-size:11px;color:#94a3b8;font-weight:500;white-space:nowrap;',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;',
      '}',

      /* ---------- 模态框（毛玻璃强化） ---------- */
      '.ql-modal-overlay{',
      'position:fixed;inset:0;',
      'background:rgba(15,23,42,.35);',
      'backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);',
      'display:flex;align-items:center;justify-content:center;',
      'z-index:99999;animation:ql-fade-in .2s ease;',
      '}',
      '@keyframes ql-fade-in{from{opacity:0}to{opacity:1}}',
      '@keyframes ql-slide-up{from{transform:translateY(16px) scale(.98);opacity:0}to{transform:translateY(0) scale(1);opacity:1}}',

      '.ql-modal{',
      'background:rgba(255,255,255,.72);',
      'backdrop-filter:blur(40px) saturate(180%);',
      '-webkit-backdrop-filter:blur(40px) saturate(180%);',
      'border-radius:20px;width:440px;max-width:92vw;max-height:80vh;',
      'display:flex;flex-direction:column;',
      'box-shadow:0 24px 64px rgba(0,0,0,.18),0 8px 24px rgba(0,0,0,.08);',
      'border:1px solid rgba(255,255,255,.55);',
      'animation:ql-slide-up .3s cubic-bezier(.22,1,.36,1);',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;',
      'overflow:hidden;',
      '}',
      '.ql-modal-header{',
      'display:flex;align-items:center;justify-content:space-between;',
      'padding:18px 22px 14px;',
      'border-bottom:1px solid rgba(0,0,0,.06);',
      '}',
      '.ql-modal-title{font-size:16px;font-weight:650;color:#1e293b;letter-spacing:-.2px;}',
      '.ql-modal-close{',
      'width:32px;height:32px;border-radius:50%;',
      'border:1px solid rgba(0,0,0,.08);',
      'background:rgba(255,255,255,.5);',
      'backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);',
      'cursor:pointer;display:flex;align-items:center;justify-content:center;',
      'color:#94a3b8;transition:all .2s ease;padding:0;',
      '}',
      '.ql-modal-close:hover{background:rgba(239,68,68,.12);color:#ef4444;border-color:rgba(239,68,68,.25);}',
      '.ql-modal-body{',
      'padding:8px 22px;overflow-y:auto;flex:1;',
      'scrollbar-width:thin;scrollbar-color:rgba(0,0,0,.15) transparent;',
      '}',
      '.ql-modal-body::-webkit-scrollbar{width:5px;}',
      '.ql-modal-body::-webkit-scrollbar-track{background:transparent;}',
      '.ql-modal-body::-webkit-scrollbar-thumb{background:rgba(0,0,0,.15);border-radius:10px;}',
      '.ql-engine-item{',
      'display:flex;align-items:center;gap:12px;',
      'padding:10px 6px;border-radius:12px;transition:all .15s ease;',
      '}',
      '.ql-engine-item:hover{background:rgba(129,140,248,.06);}',
      '.ql-engine-item+.ql-engine-item{border-top:1px solid rgba(0,0,0,.04);}',
      '.ql-engine-item-icon{',
      'width:32px;height:32px;border-radius:10px;',
      'display:flex;align-items:center;justify-content:center;',
      'flex-shrink:0;background:rgba(255,255,255,.5);',
      'backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);',
      'box-shadow:0 2px 6px rgba(0,0,0,.08);overflow:hidden;',
      '}',
      '.ql-engine-item-icon img{width:18px;height:18px;object-fit:contain;border-radius:3px;}',
      '.ql-engine-item-icon .ql-fallback{font-size:12px;font-weight:700;color:#fff;line-height:1;}',
      '.ql-engine-item-info{flex:1;min-width:0;}',
      '.ql-engine-item-name{font-size:13px;font-weight:550;color:#1e293b;}',
      '.ql-engine-item-url{font-size:11px;color:#94a3b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px;}',
      '.ql-engine-item-delete{',
      'width:30px;height:30px;border-radius:50%;border:1px solid transparent;',
      'background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;',
      'color:#cbd5e1;transition:all .2s ease;flex-shrink:0;padding:0;',
      '}',
      '.ql-engine-item-delete:hover{background:rgba(239,68,68,.1);color:#ef4444;border-color:rgba(239,68,68,.2);}',
      '.ql-engine-item-delete.disabled{opacity:.25;cursor:not-allowed;}',
      '.ql-engine-item-delete.disabled:hover{background:transparent;color:#cbd5e1;border-color:transparent;}',
      '.ql-engine-item.active{background:rgba(129,140,248,.08);border-radius:12px;padding:10px 10px;margin:0 -4px;}',
      '.ql-engine-item.active .ql-engine-item-name::after{content:" ✓";color:var(--accent,#818cf8);font-size:11px;font-weight:700;}',
      '.ql-modal-add-section{',
      'padding:14px 22px 18px;',
      'border-top:1px solid rgba(0,0,0,.06);',
      '}',
      '.ql-modal-add-title{font-size:12px;font-weight:650;color:#64748b;margin-bottom:10px;text-transform:uppercase;letter-spacing:.6px;}',
      '.ql-modal-field{margin-bottom:10px;}',
      '.ql-modal-field label{display:block;font-size:12px;color:#64748b;margin-bottom:4px;font-weight:500;}',
      '.ql-modal-field input{',
      'width:100%;height:38px;padding:0 12px;border:1.5px solid rgba(0,0,0,.1);',
      'border-radius:10px;font-size:13px;outline:none;',
      'background:rgba(255,255,255,.5);',
      'backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);',
      'color:#1e293b;box-sizing:border-box;font-family:inherit;transition:all .2s ease;',
      '}',
      '.ql-modal-field input:focus{border-color:var(--accent,#818cf8);box-shadow:0 0 0 3px rgba(129,140,248,.1);}',
      '.ql-modal-field input::placeholder{color:#cbd5e1;}',
      '.ql-modal-field input.ql-input-error{border-color:#ef4444;box-shadow:0 0 0 3px rgba(239,68,68,.1);}',
      '.ql-modal-hint{font-size:11px;color:#94a3b8;margin-top:4px;line-height:1.5;}',
      '.ql-modal-hint code{background:rgba(129,140,248,.1);padding:2px 5px;border-radius:4px;font-size:11px;color:var(--accent,#6366f1);font-weight:500;}',
      '.ql-modal-add-btn{',
      'width:100%;height:38px;border-radius:10px;border:none;',
      'background:var(--accent,#818cf8);color:#fff;font-size:13px;font-weight:600;cursor:pointer;',
      'transition:all .25s ease;margin-top:6px;padding:0;box-shadow:0 2px 8px rgba(0,0,0,.08);',
      '}',
      '.ql-modal-add-btn:hover{background:var(--accent-hover,#7178e8);box-shadow:0 4px 14px rgba(0,0,0,.12);transform:translateY(-1px);}',
      '.ql-modal-add-btn:active{transform:translateY(0);}',
      '.ql-modal-add-btn:disabled{opacity:.4;cursor:not-allowed;transform:none;box-shadow:none;}',

      /* ---------- 拖拽指示器（灰白毛玻璃风格） ---------- */
      '.ql-drag-indicator{',
      'position:fixed;top:20px;right:20px;',
      'background:rgba(245,245,250,.82);',
      'backdrop-filter:blur(24px) saturate(120%);',
      '-webkit-backdrop-filter:blur(24px) saturate(120%);',
      'color:#475569;padding:11px 20px;',
      'border-radius:28px;font-size:13px;font-weight:550;',
      'z-index:999999;',
      'box-shadow:0 4px 20px rgba(0,0,0,.08),0 1px 4px rgba(0,0,0,.04);',
      'border:1px solid rgba(0,0,0,.06);',
      'transition:opacity .3s ease,transform .3s cubic-bezier(.22,1,.36,1);',
      'pointer-events:none;',
      'max-width:340px;word-wrap:break-word;',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Noto Sans SC",sans-serif;',
      'letter-spacing:.2px;',
      '}',

      '.ql-drag-link-hover{',
      'outline:2px dashed rgba(148,163,184,.5)!important;',
      'outline-offset:2px!important;',
      'cursor:grab!important;',
      'background-color:rgba(148,163,184,.08)!important;',
      'border-radius:4px;',
      '}',

      /* ---------- 暗色模式（毛玻璃强化） ---------- */
      '@media (prefers-color-scheme:dark){',
      '.ql-panel{',
      'background:rgba(30,32,42,.55);border-color:rgba(255,255,255,.1);',
      'box-shadow:0 4px 24px rgba(0,0,0,.25),0 1px 4px rgba(0,0,0,.2);',
      '}',
      '.ql-panel:hover{box-shadow:0 8px 32px rgba(0,0,0,.35),0 2px 8px rgba(0,0,0,.25);}',
      '.ql-panel.ql-expanded{box-shadow:0 12px 40px rgba(0,0,0,.4),0 4px 12px rgba(0,0,0,.3);}',
      '.ql-panel-divider{background:rgba(255,255,255,.06);}',
      '.ql-search-input{',
      'background:rgba(30,32,42,.45);border-color:rgba(255,255,255,.12);color:#e2e8f0;',
      'box-shadow:inset 0 1px 3px rgba(0,0,0,.15);',
      '}',
      '.ql-search-input::placeholder{color:rgba(255,255,255,.3);}',
      '.ql-search-input:focus{',
      'border-color:rgba(129,140,248,.4);background:rgba(30,32,42,.55);',
      'box-shadow:0 0 0 4px rgba(129,140,248,.15),inset 0 1px 3px rgba(0,0,0,.15);',
      '}',
      '.ql-search-btn{box-shadow:0 2px 8px rgba(0,0,0,.25);}',
      '.ql-search-btn:hover{box-shadow:0 4px 16px rgba(0,0,0,.35);}',
      '.ql-engine-btn{background:rgba(30,32,45,.45);border-color:rgba(255,255,255,.15);box-shadow:0 2px 8px rgba(0,0,0,.2);}',
      '.ql-engine-btn:hover{box-shadow:0 4px 16px rgba(0,0,0,.35);}',
      '.ql-engine-arrow{background:rgba(30,32,45,.55);border-color:rgba(255,255,255,.12);}',
      '.ql-engine-arrow svg{color:#64748b;}',
      '.ql-engine-option:hover{background:rgba(129,140,248,.12);}',
      '.ql-engine-option.active{border-color:var(--accent,#818cf8);background:rgba(129,140,248,.15);}',
      '.ql-engine-option-name{color:#94a3b8;}',
      '.ql-engine-icon-wrap{background:rgba(30,32,45,.4);box-shadow:0 2px 8px rgba(0,0,0,.2);}',
      '.ql-engine-option-add-icon{background:rgba(30,32,45,.4);border-color:rgba(255,255,255,.1);color:#64748b;}',
      '.ql-engine-option-add-name{color:#64748b;}',
      '.ql-engine-option-add:hover .ql-engine-option-add-icon{',
      'border-color:var(--accent,#818cf8);color:var(--accent,#818cf8);background:rgba(129,140,248,.12);',
      '}',
      '.ql-modal-overlay{background:rgba(0,0,0,.5);}',
      '.ql-modal{',
      'background:rgba(30,32,45,.78);border-color:rgba(255,255,255,.1);',
      'box-shadow:0 24px 64px rgba(0,0,0,.4),0 8px 24px rgba(0,0,0,.2);',
      '}',
      '.ql-modal-header{border-bottom-color:rgba(255,255,255,.06);}',
      '.ql-modal-title{color:#e2e8f0;}',
      '.ql-modal-close{background:rgba(30,32,45,.5);border-color:rgba(255,255,255,.1);color:#64748b;}',
      '.ql-modal-close:hover{color:#ef4444;border-color:rgba(239,68,68,.3);}',
      '.ql-engine-item+.ql-engine-item{border-top-color:rgba(255,255,255,.04);}',
      '.ql-engine-item:hover{background:rgba(129,140,248,.08);}',
      '.ql-engine-item-name{color:#e2e8f0;}',
      '.ql-engine-item-url{color:#64748b;}',
      '.ql-engine-item.active{background:rgba(129,140,248,.12);}',
      '.ql-engine-item-delete{color:#475569;}',
      '.ql-engine-item-delete:hover{color:#ef4444;}',
      '.ql-engine-item-icon{background:rgba(30,32,45,.4);}',
      '.ql-modal-add-section{border-top-color:rgba(255,255,255,.06);}',
      '.ql-modal-add-title{color:#94a3b8;}',
      '.ql-modal-field label{color:#94a3b8;}',
      '.ql-modal-field input{',
      'background:rgba(30,32,45,.45);border-color:rgba(255,255,255,.1);color:#e2e8f0;',
      '}',
      '.ql-modal-field input::placeholder{color:#475569;}',
      '.ql-modal-field input:focus{border-color:var(--accent,#818cf8);}',
      '.ql-modal-hint{color:#64748b;}',
      '.ql-modal-hint code{background:rgba(129,140,248,.15);}',
      '.ql-modal-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,.12);}',
      '.ql-modal-add-btn{box-shadow:0 2px 8px rgba(0,0,0,.25);}',
      '.ql-modal-add-btn:hover{box-shadow:0 4px 16px rgba(0,0,0,.35);}',
      '.ql-quote-text{color:rgba(255,255,255,.35);}',
      '.ql-quote-text:hover{color:rgba(255,255,255,.55);}',

      /* 暗色模式 - 拖拽指示器（灰白风格适配） */
      '.ql-drag-indicator{',
      'background:rgba(55,58,75,.82);',
      'box-shadow:0 4px 24px rgba(0,0,0,.25),0 1px 4px rgba(0,0,0,.15);',
      'border-color:rgba(255,255,255,.1);',
      'color:#cbd5e1;',
      '}',

      /* 暗色模式 - 拖拽链接悬停 */
      '.ql-drag-link-hover{',
      'outline-color:rgba(148,163,184,.4)!important;',
      'background-color:rgba(148,163,184,.1)!important;',
      '}',
      '}'
    ].join('\n');
    document.head.appendChild(style);
  }

  /* ================================================================
   *  构建 DOM
   * ================================================================ */

  function createFaviconImg(faviconUrl, fallbackName, wrapEl) {
    var img = document.createElement('img');
    img.src = faviconUrl;
    img.alt = fallbackName;
    img.setAttribute('loading', 'lazy');
    var fb = document.createElement('span');
    fb.className = 'ql-fallback';
    if (isChineseName(fallbackName)) fb.classList.add('zh');
    fb.textContent = getFallbackLabel(fallbackName);
    fb.style.display = 'none';

    img.addEventListener('error', function() {
      img.style.display = 'none';
      fb.style.display = 'block';
    });
    img.addEventListener('load', function() {
      fb.style.display = 'none';
      img.style.display = 'block';
    });

    if (wrapEl) {
      wrapEl.appendChild(img);
      wrapEl.appendChild(fb);
    }
    return { img: img, fallback: fb };
  }

  function updateEngineBtn() {
    var eng = engines[currentEngine];
    if (!eng || !engineBtnRef || !inputRef) return;

    engineBtnRef.innerHTML = '';

    var wrap = document.createElement('span');
    wrap.style.cssText = 'display:flex;align-items:center;justify-content:center;width:100%;height:100%;';
    var refs = createFaviconImg(eng.favicon || extractFavicon(eng.url), eng.name, wrap);
    engineBtnImgRef = refs.img;
    engineBtnFallbackRef = refs.fallback;
    engineBtnRef.appendChild(wrap);

    var arrow = document.createElement('span');
    arrow.className = 'ql-engine-arrow';
    arrow.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg>';
    engineBtnRef.appendChild(arrow);

    inputRef.placeholder = '在 ' + eng.name + ' 搜索…';
    engineBtnRef.title = '当前: ' + eng.name + '（点击切换引擎）';
  }

  function updateEngineList() {
    if (!engineListRef) return;
    engineListRef.innerHTML = '';

    var keys = Object.keys(engines);

    keys.forEach(function(key) {
      var eng = engines[key];
      var isActive = key === currentEngine;

      var option = document.createElement('div');
      option.className = 'ql-engine-option' + (isActive ? ' active' : '');

      var iconWrap = document.createElement('div');
      iconWrap.className = 'ql-engine-icon-wrap';
      if (isActive) {
        iconWrap.style.background = 'var(--accent,#818cf8)';
        iconWrap.style.boxShadow = '0 2px 12px rgba(129,140,248,.3)';
      }
      createFaviconImg(eng.favicon || extractFavicon(eng.url), eng.name, iconWrap);

      var nameEl = document.createElement('div');
      nameEl.className = 'ql-engine-option-name';
      nameEl.textContent = eng.name;

      option.appendChild(iconWrap);
      option.appendChild(nameEl);

      option.addEventListener('click', function(e) {
        e.stopPropagation();
        saveEngine(key);
        updateEngineBtn();
        updateEngineList();
        collapsePanel();
      });

      engineListRef.appendChild(option);
    });

    var addOption = document.createElement('div');
    addOption.className = 'ql-engine-option-add';
    var addIcon = document.createElement('div');
    addIcon.className = 'ql-engine-option-add-icon';
    addIcon.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';
    var addName = document.createElement('div');
    addName.className = 'ql-engine-option-add-name';
    addName.textContent = '管理';
    addOption.appendChild(addIcon);
    addOption.appendChild(addName);
    addOption.addEventListener('click', function(e) {
      e.stopPropagation();
      collapsePanel();
      openEditModal();
    });
    engineListRef.appendChild(addOption);
  }

  /* ================================================================
   *  展开 / 收起
   * ================================================================ */
  function expandPanel() {
    if (expanded) return;
    expanded = true;
    panelRef.classList.add('ql-expanded');
    updateEngineList();
    setTimeout(function() {
      document.addEventListener('click', outsideClickHandler, { once: true });
    }, 0);
  }

  function collapsePanel() {
    if (!expanded) return;
    expanded = false;
    panelRef.classList.remove('ql-expanded');
    document.removeEventListener('click', outsideClickHandler);
  }

  function togglePanel(e) {
    e.stopPropagation();
    if (expanded) {
      collapsePanel();
    } else {
      expandPanel();
    }
  }

  function outsideClickHandler(e) {
    if (panelRef && !panelRef.contains(e.target)) {
      collapsePanel();
    } else {
      setTimeout(function() {
        document.addEventListener('click', outsideClickHandler, { once: true });
      }, 0);
    }
  }

  /* ================================================================
   *  模态框：管理引擎
   * ================================================================ */
  function openEditModal() {
    var overlay = document.createElement('div');
    overlay.className = 'ql-modal-overlay';
    var modal = document.createElement('div');
    modal.className = 'ql-modal';

    var header = document.createElement('div');
    header.className = 'ql-modal-header';
    var title = document.createElement('div');
    title.className = 'ql-modal-title';
    title.textContent = '管理搜索引擎';
    var closeBtn = document.createElement('button');
    closeBtn.className = 'ql-modal-close';
    closeBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>';
    header.appendChild(title);
    header.appendChild(closeBtn);

    var body = document.createElement('div');
    body.className = 'ql-modal-body';

    function renderList() {
      body.innerHTML = '';
      var keys = Object.keys(engines);
      if (keys.length === 0) {
        var empty = document.createElement('div');
        empty.style.cssText = 'text-align:center;padding:24px 0;color:#94a3b8;font-size:13px;';
        empty.textContent = '暂无搜索引擎，请在下方添加';
        body.appendChild(empty);
        return;
      }
      keys.forEach(function(key) {
        var eng = engines[key];
        var item = document.createElement('div');
        item.className = 'ql-engine-item' + (key === currentEngine ? ' active' : '');

        var icon = document.createElement('div');
        icon.className = 'ql-engine-item-icon';
        createFaviconImg(eng.favicon || extractFavicon(eng.url), eng.name, icon);

        var info = document.createElement('div');
        info.className = 'ql-engine-item-info';
        var nameEl = document.createElement('div');
        nameEl.className = 'ql-engine-item-name';
        nameEl.textContent = eng.name;
        var urlEl = document.createElement('div');
        urlEl.className = 'ql-engine-item-url';
        urlEl.textContent = eng.url;
        info.appendChild(nameEl);
        info.appendChild(urlEl);

        var delBtn = document.createElement('button');
        delBtn.className = 'ql-engine-item-delete';
        var canDelete = keys.length > 1;
        if (!canDelete) delBtn.classList.add('disabled');
        delBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>';
        delBtn.title = canDelete ? '删除' : '至少保留一个引擎';

        if (canDelete) {
          delBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            delete engines[key];
            if (currentEngine === key) {
              currentEngine = Object.keys(engines)[0] || '';
              saveEngine(currentEngine);
            }
            saveEngines();
            updateEngineBtn();
            updateEngineList();
            renderList();
          });
        }

        item.appendChild(icon);
        item.appendChild(info);
        item.appendChild(delBtn);
        body.appendChild(item);
      });
    }

    renderList();

    var addSection = document.createElement('div');
    addSection.className = 'ql-modal-add-section';
    var addTitle = document.createElement('div');
    addTitle.className = 'ql-modal-add-title';
    addTitle.textContent = '添加搜索引擎';
    addSection.appendChild(addTitle);

    var nameField = document.createElement('div');
    nameField.className = 'ql-modal-field';
    var nameLabel = document.createElement('label');
    nameLabel.textContent = '名称';
    var nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = '如：DuckDuckGo';
    nameField.appendChild(nameLabel);
    nameField.appendChild(nameInput);

    var urlField = document.createElement('div');
    urlField.className = 'ql-modal-field';
    var urlLabel = document.createElement('label');
    urlLabel.textContent = '搜索地址';
    var urlInput = document.createElement('input');
    urlInput.type = 'text';
    urlInput.placeholder = '如：https://duckduckgo.com/?q=' + PLACEHOLDER;
    urlField.appendChild(urlLabel);
    urlField.appendChild(urlInput);
    var urlHint = document.createElement('div');
    urlHint.className = 'ql-modal-hint';
    urlHint.innerHTML = '用 <code>' + PLACEHOLDER + '</code> 表示搜索关键词的位置，如 <code>https://www.baidu.com/s?wd=' + PLACEHOLDER + '</code>';
    urlField.appendChild(urlHint);

    var addBtn = document.createElement('button');
    addBtn.className = 'ql-modal-add-btn';
    addBtn.textContent = '添加';

    addBtn.addEventListener('click', function() {
      var name = nameInput.value.trim();
      var url = urlInput.value.trim();
      urlInput.classList.remove('ql-input-error');
      if (!name || !url) return;
      if (url.indexOf(PLACEHOLDER) === -1) {
        urlInput.classList.add('ql-input-error');
        return;
      }
      var key = 'engine_' + Date.now();
      engines[key] = { name: name, url: url, favicon: extractFavicon(url) };
      saveEngines();
      nameInput.value = '';
      urlInput.value = '';
      updateEngineBtn();
      updateEngineList();
      renderList();
    });

    addSection.appendChild(nameField);
    addSection.appendChild(urlField);
    addSection.appendChild(addBtn);
    modal.appendChild(header);
    modal.appendChild(body);
    modal.appendChild(addSection);
    overlay.appendChild(modal);

    function close() { overlay.remove(); }
    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) close(); });
    document.addEventListener('keydown', function handler(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', handler); }
    });
    document.body.appendChild(overlay);
  }

  /* ================================================================
   *  拖拽搜索功能（修复版）
   *  - 支持链接拖拽到任意位置打开
   *  - 支持文字选中后拖拽搜索
   *  - 支持外部拖入链接/文字进行搜索
   *  - 使用当前选中的搜索引擎
   * ================================================================ */
  var dragIndicator = null;

  function resetDragState() {
    dragState.isDragging = false;
    dragState.dragType = null;
    dragState.dragData = null;
  }

  function getDragIndicator() {
    if (!dragIndicator) {
      dragIndicator = document.createElement('div');
      dragIndicator.className = 'ql-drag-indicator';
      dragIndicator.style.display = 'none';
      dragIndicator.style.opacity = '0';
      document.body.appendChild(dragIndicator);
    }
    return dragIndicator;
  }

  function showDragNotification(text, duration) {
    if (!CONFIG.SHOW_DRAG_NOTIFICATIONS) return;
    duration = duration || 2000;
    var ind = getDragIndicator();
    ind.textContent = text;
    ind.style.display = 'block';
    ind.style.opacity = '1';
    ind.style.transform = 'translateY(0)';

    clearTimeout(ind._timeout);
    ind._timeout = setTimeout(function() {
      ind.style.opacity = '0';
      ind.style.transform = 'translateY(-6px)';
      setTimeout(function() {
        ind.style.display = 'none';
      }, 300);
    }, duration);
  }

  function doDragSearch(text) {
    if (!text || text.trim().length < CONFIG.MIN_TEXT_LENGTH) return;
    var eng = engines[currentEngine];
    if (!eng) return;
    var searchUrl = eng.url.replace(PLACEHOLDER, encodeURIComponent(text.trim()));
    window.open(searchUrl, '_blank', 'noopener');
    showDragNotification('正在 ' + eng.name + ' 搜索: ' + text.substring(0, 30) + (text.length > 30 ? '…' : ''));
  }

  function isValidLink(element) {
    if (!element) return false;
    var tagName = element.tagName.toLowerCase();
    if (tagName === 'a' && element.href) {
      return element.href.startsWith('http://') || element.href.startsWith('https://');
    }
    var parentLink = element.closest('a');
    if (parentLink && parentLink.href) {
      return parentLink.href.startsWith('http://') || parentLink.href.startsWith('https://');
    }
    return false;
  }

  function getLinkInfo(element) {
    if (!element) return null;
    var linkElement = element;
    if (element.tagName.toLowerCase() !== 'a') {
      linkElement = element.closest('a');
    }
    if (!linkElement || !linkElement.href) return null;
    return {
      url: linkElement.href,
      title: linkElement.textContent.trim() || linkElement.title || linkElement.getAttribute('aria-label') || '链接'
    };
  }

  // dragstart 处理器：显式将选中文字写入 dataTransfer 并保存到 dragState
  function handleDragStart(event) {
    var selection = window.getSelection();
    var selectedText = selection ? selection.toString().trim() : '';
    if (selectedText.length >= CONFIG.MIN_TEXT_LENGTH) {
      event.dataTransfer.setData('text/plain', selectedText);
      event.dataTransfer.effectAllowed = 'copy';
      dragState.isDragging = true;
      dragState.dragType = 'text';
      dragState.dragData = selectedText;
    }
  }

  // 链接拖拽 - mousedown 开始跟踪
  function handleDragMouseDown(event) {
    if (!CONFIG.ENABLE_LINK_DRAG) return;
    var target = event.target;
    if (isValidLink(target)) {
      var linkInfo = getLinkInfo(target);
      if (linkInfo) {
        dragState.isDragging = true;
        dragState.startX = event.clientX;
        dragState.startY = event.clientY;
        dragState.dragType = 'link';
        dragState.dragData = linkInfo;

        var linkElement = target.tagName.toLowerCase() === 'a' ? target : target.closest('a');
        if (linkElement) linkElement.classList.add('ql-drag-link-hover');

        showDragNotification('拖拽链接: ' + linkInfo.title.substring(0, 20) + '…');
      }
    }
  }

  function handleDragMouseMove(event) {
    if (!dragState.isDragging) return;
    var distanceX = Math.abs(event.clientX - dragState.startX);
    var distanceY = Math.abs(event.clientY - dragState.startY);
    var totalDistance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

    if (totalDistance > CONFIG.DRAG_DISTANCE_THRESHOLD && dragState.dragData) {
      try {
        if (dragState.dragType === 'link') {
          event.dataTransfer.setData('text/uri-list', dragState.dragData.url);
          event.dataTransfer.setData('text/plain', dragState.dragData.title);
        }
        event.dataTransfer.effectAllowed = 'copy';
      } catch (e) {}
    }
  }

  function handleDragMouseUp(event) {
    if (dragState.isDragging) {
      var hoveredLinks = document.querySelectorAll('.ql-drag-link-hover');
      for (var i = 0; i < hoveredLinks.length; i++) {
        hoveredLinks[i].classList.remove('ql-drag-link-hover');
      }
      resetDragState();
    }
  }

  function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();

    var dataTransfer = event.dataTransfer;

    // 1. 优先检查 URL（链接拖拽）
    var url = dataTransfer.getData('text/uri-list') ||
              dataTransfer.getData('text/plain') ||
              dataTransfer.getData('URL');

    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      window.open(url, '_blank', 'noopener');
      showDragNotification('已在新标签页打开链接');
      resetDragState();
      return;
    }

    // 2. 优先从 dragState 获取文字（dragstart 时已保存，最可靠）
    if (dragState.dragType === 'text' && dragState.dragData &&
        dragState.dragData.trim().length >= CONFIG.MIN_TEXT_LENGTH) {
      doDragSearch(dragState.dragData);
      resetDragState();
      return;
    }

    // 3. 尝试 window.getSelection()（部分浏览器 drop 时选区仍在）
    var selection = window.getSelection();
    var selectedText = selection ? selection.toString().trim() : '';
    if (selectedText.length >= CONFIG.MIN_TEXT_LENGTH) {
      doDragSearch(selectedText);
      selection.removeAllRanges();
      resetDragState();
      return;
    }

    // 4. 最后尝试 dataTransfer 中的文字（外部拖入等场景）
    var text = dataTransfer.getData('text/plain') || dataTransfer.getData('text');
    if (text && text.trim().length >= CONFIG.MIN_TEXT_LENGTH) {
      doDragSearch(text);
    }

    resetDragState();
  }

  function handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }

  function handleTextSelection() {
    if (!CONFIG.ENABLE_TEXT_DRAG) return;
    var selection = window.getSelection();
    var selectedText = selection.toString().trim();
    if (selectedText.length >= CONFIG.MIN_TEXT_LENGTH) {
      var eng = engines[currentEngine];
      var engName = eng ? eng.name : '搜索';
      showDragNotification('已选中文字: ' + selectedText.substring(0, 20) + (selectedText.length > 20 ? '…' : '') + ' (可拖拽以 ' + engName + ' 搜索)', 1800);
    }
  }

  function initDragEvents() {
    document.removeEventListener('mousedown', handleDragMouseDown, true);
    document.removeEventListener('mousemove', handleDragMouseMove, true);
    document.removeEventListener('mouseup', handleDragMouseUp, true);
    document.removeEventListener('drop', handleDrop, true);
    document.removeEventListener('dragover', handleDragOver, true);
    document.removeEventListener('mouseup', handleTextSelection, true);
    document.removeEventListener('dragstart', handleDragStart, true);

    if (CONFIG.ENABLE_LINK_DRAG) {
      document.addEventListener('mousedown', handleDragMouseDown, true);
      document.addEventListener('mousemove', handleDragMouseMove, true);
      document.addEventListener('mouseup', handleDragMouseUp, true);
    }

    document.addEventListener('drop', handleDrop, true);
    document.addEventListener('dragover', handleDragOver, true);
    document.addEventListener('dragstart', handleDragStart, true);

    if (CONFIG.ENABLE_TEXT_DRAG) {
      document.addEventListener('mouseup', handleTextSelection, true);
    }

    console.log('QL: 拖拽功能已初始化（当前引擎: ' + (engines[currentEngine] ? engines[currentEngine].name : '未知') + '）');
  }

  /* ================================================================
   *  创建面板
   * ================================================================ */
  function createPanel() {
    var panel = document.createElement('div');
    panel.className = 'ql-panel';
    panelRef = panel;

    var topRow = document.createElement('div');
    topRow.className = 'ql-panel-top';

    var engineBtn = document.createElement('button');
    engineBtn.type = 'button';
    engineBtn.className = 'ql-engine-btn';
    engineBtn.setAttribute('aria-label', '切换搜索引擎');
    engineBtnRef = engineBtn;
    engineBtn.addEventListener('click', togglePanel);

    var wrapper = document.createElement('div');
    wrapper.className = 'ql-search-wrapper';
    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'ql-search-input';
    inputRef = input;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ql-search-btn';
    btn.setAttribute('aria-label', '搜索');
    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>';

    wrapper.appendChild(input);
    wrapper.appendChild(btn);
    topRow.appendChild(engineBtn);
    topRow.appendChild(wrapper);

    var quoteRow = document.createElement('div');
    quoteRow.className = 'ql-quote-row';
    var quoteText = document.createElement('div');
    quoteText.className = 'ql-quote-text';
    quoteText.textContent = '';
    quoteRef = quoteText;
    quoteRow.appendChild(quoteText);

    var divider = document.createElement('div');
    divider.className = 'ql-panel-divider';

    var bottomRow = document.createElement('div');
    bottomRow.className = 'ql-panel-bottom';
    bottomRef = bottomRow;
    var engineList = document.createElement('div');
    engineList.className = 'ql-engine-list';
    engineListRef = engineList;
    bottomRow.appendChild(engineList);

    panel.appendChild(topRow);
    panel.appendChild(quoteRow);
    panel.appendChild(divider);
    panel.appendChild(bottomRow);

    function doSearch() {
      var query = input.value.trim();
      if (query && engines[currentEngine]) {
        var url = engines[currentEngine].url.replace(PLACEHOLDER, encodeURIComponent(query));
        window.open(url, '_blank', 'noopener');
      }
    }
    btn.addEventListener('click', doSearch);
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') { e.preventDefault(); doSearch(); }
    });

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && expanded) { collapsePanel(); }
    });

    return panel;
  }

  /* ================================================================
   *  渲染 & 初始化
   * ================================================================ */
  function findAnchor() {
    return document.querySelector('.theme-input-container') ||
           document.querySelector('[class*="input"]');
  }

  function render() {
    var anchor = findAnchor();
    if (!anchor || !anchor.parentNode) return false;
    if (panelRef && panelRef.parentNode) panelRef.remove();
    var panel = createPanel();
    anchor.parentNode.insertBefore(panel, anchor.nextSibling);
    loadEngines();
    loadEngine();
    updateEngineBtn();
    fetchDailyQuote();
    initDragEvents();
    return true;
  }

  function tryRender() {
    if (render()) return;
    retryCount += 1;
    if (retryCount <= CONFIG.MAX_RETRY) setTimeout(tryRender, CONFIG.RETRY_INTERVAL);
    else console.warn('ql: anchor not found');
  }

  function init() {
    injectStyle();
    loadEngines();
    loadEngine();
    initDragEvents();
    setTimeout(tryRender, CONFIG.RENDER_DELAY);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  // 暴露调试接口
  window.qlDebug = function() {
    console.log('Quick Links 状态:', {
      engines: engines,
      currentEngine: currentEngine,
      panelRendered: !!panelRef,
      expanded: expanded,
      dragEnabled: {
        linkDrag: CONFIG.ENABLE_LINK_DRAG,
        textDrag: CONFIG.ENABLE_TEXT_DRAG
      }
    });
  };

  window.qlReinit = function() {
    loadEngines();
    loadEngine();
    updateEngineBtn();
    updateEngineList();
    initDragEvents();
    console.log('QL: 已重新初始化');
  };
})();