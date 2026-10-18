(function () {
  'use strict';

  if (!document.getElementById('__TAB_APP_MOUNTED_GUARD__')) return;
  if (window.__tbYiyanWidgetLoaded) return;
  window.__tbYiyanWidgetLoaded = true;

  function isStillHomePage() {
    return !!document.getElementById('__TAB_APP_MOUNTED_GUARD__');
  }
  function findHostEl() {
    return document.querySelector('.bg-background.theme-background') || document.body;
  }

  var LF = String.fromCharCode(10);

  var API_SOURCES = [
    { id: 'cenguigui_SCi', name: '诗词', url: 'https://api-v2.cenguigui.cn/api/yyan/api.php', enabled: true },
    { id: 'hitokoto_PL', name: '评论', url: 'https://v1.hitokoto.cn/?c=j', enabled: true },
    { id: 'hitokoto_WX', name: '文学', url: 'https://v1.hitokoto.cn/?c=d', enabled: true },
    { id: 'hitokoto_ZX', name: '哲学', url: 'https://v1.hitokoto.cn/?c=k', enabled: true }
  ];

  var CONFIG_KEY = 'dq_settings_v7';
  var clone = function (o) { return JSON.parse(JSON.stringify(o)); };
  var defaultSettings = { apis: clone(API_SOURCES), hideDelaySec: 60, neverHide: false, panelOpen: false };

  function loadSettings() {
    try {
      var saved = localStorage.getItem(CONFIG_KEY);
      if (!saved) return clone(defaultSettings);
      var parsed = JSON.parse(saved);
      var savedApis = Array.isArray(parsed.apis) ? parsed.apis : [];
      return Object.assign({}, clone(defaultSettings), parsed, {
        apis: API_SOURCES.map(function (api) {
          var old = savedApis.find(function (a) { return a.id === api.id; });
          return Object.assign({}, api, { enabled: old && typeof old.enabled === 'boolean' ? old.enabled : api.enabled });
        })
      });
    } catch (e) { return clone(defaultSettings); }
  }
  function saveSettings(s) {
    try { localStorage.setItem(CONFIG_KEY, JSON.stringify(s)); } catch (e) {}
  }

  var settings = loadSettings();
  if (settings.hideDelaySec > 300) { settings.hideDelaySec = 300; saveSettings(settings); }

  function cleanText(text) {
    if (text === undefined || text === null) return '';
    text = String(text).replace(/^\uFEFF/, '');
    text = text.replace(/<br\s*\/?>/gi, LF).replace(/<\/p\s*>/gi, LF).replace(/<\/div\s*>/gi, LF)
      .replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
    return text;
  }
  function normalizeLine(s) {
    return String(s || '').replace(/\s+/g, ' ').replace(/^["'\u201c\u201d\u2018\u2019`]+|["'\u201c\u201d\u2018\u2019`]+$/g, '').trim();
  }
  function stripSourceAfterDash(text) {
    text = String(text || '').trim();
    var i = text.indexOf('\u2014\u2014');
    if (i !== -1) text = text.substring(0, i).trim();
    return text;
  }
  function isBadLine(line) {
    return !line || /warning|notice|deprecated|fatal error|undefined|on line\s+\d+|\/www\/|api\.php|stack trace|php/i.test(line);
  }
  function isQuoteLine(line) {
    return /[\u4e00-\u9fa5]/.test(line) && (/[\u3002\uff1f\uff01\uff1b\uff1a]/.test(line) || /\u2014\u2014|\u300a.+\u300b/.test(line) || line.length >= 8);
  }
  function extractCenguiguiText(raw) {
    var cleaned = cleanText(raw);
    if (!cleaned) return '';
    var lines = cleaned.split(new RegExp('[' + LF + ']+')).map(normalizeLine).filter(Boolean).filter(function (l) { return !isBadLine(l); });
    if (!lines.length) return '';
    var qs = lines.filter(isQuoteLine);
    var result = qs.length ? qs[qs.length - 1] : lines[lines.length - 1];
    return stripSourceAfterDash(result) || '';
  }
  function tryParseJson(raw) {
    if (typeof raw !== 'string') return raw;
    var text = raw.trim();
    var m = text.match(/^[\w$]+$([\s\S]*)$\s*;?$/);
    if (m) text = m[1].trim();
    try { return JSON.parse(text); } catch (e) { return raw; }
  }
  function getByPath(obj, path) {
    try { return path.split('.').reduce(function (o, k) { return o && o[k] !== undefined ? o[k] : undefined; }, obj); } catch (e) { return undefined; }
  }
  function pickFromObject(data) {
    if (data === undefined || data === null) return '';
    if (typeof data === 'string' || typeof data === 'number') return normalizeLine(data);
    if (Array.isArray(data)) { for (var i = 0; i < data.length; i++) { var t = pickFromObject(data[i]); if (t) return t; } return ''; }
    if (typeof data !== 'object') return '';
    var paths = ['data.content','data.text','data.yiyan','data.hitokoto','data.sentence','data.quote','data.msg','data.message','data.result','result.content','result.text','result.hitokoto','content','text','yiyan','hitokoto','sentence','quote','words','word','value','data','result','msg','message'];
    for (var p = 0; p < paths.length; p++) {
      var val = getByPath(data, paths[p]);
      if (val !== undefined && val !== null && typeof val !== 'object') {
        var tt = normalizeLine(val);
        if (tt && !/^(success|ok|true|false|null|undefined)$/i.test(tt)) return tt;
      }
    }
    for (var key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key) && typeof data[key] === 'object') {
        var t2 = pickFromObject(data[key]); if (t2) return t2;
      }
    }
    return '';
  }
  function pickText(raw, api) {
    if (api && api.id === 'cenguigui_SCi') return extractCenguiguiText(raw);
    return pickFromObject(tryParseJson(raw));
  }

  function injectCSS() {
    if (document.getElementById('yiyan-widget-css')) return;
    var s = document.createElement('style');
    s.id = 'yiyan-widget-css';
    s.textContent = [
      '.yy-container{position:absolute;top:80px;right:0;z-index:100;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;transition:opacity .3s ease,transform .3s ease}',
      '.yy-container.yy-hidden{opacity:0;pointer-events:none;transform:translateX(20px)}',
      '.yy-card{width:300px;background:linear-gradient(135deg,rgba(255,255,255,.95),rgba(250,250,252,.92));border-radius:14px 0 0 14px;box-shadow:-4px 4px 20px rgba(0,0,0,.06);border:1px solid rgba(142,142,160,.18);border-left:3px solid #667eea;border-right:none;overflow:hidden;cursor:pointer;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);transition:box-shadow .2s,border-color .2s,transform .2s}',
      '.yy-card:hover{box-shadow:-6px 6px 24px rgba(102,126,234,.15);border-color:rgba(102,126,234,.4);transform:translateX(-2px)}',
      '.yy-body{padding:16px 18px;min-height:54px;display:flex;align-items:center;justify-content:center}',
      '.yy-text{font-size:16px;line-height:1.7;color:#2c3e50;text-align:center;word-break:break-word;font-weight:500}',
      '.yy-loading{font-size:15px;color:#95a5a6;display:flex;align-items:center;gap:8px}',
      '.yy-loading::before{content:"";width:14px;height:14px;border:2px solid #e0e0e0;border-top-color:#667eea;border-radius:50%;animation:yy-spin .8s linear infinite}',
      '@keyframes yy-spin{to{transform:rotate(360deg)}}',
      '.yy-toggle-btn{position:absolute;right:0;top:80px;z-index:99;width:6px;height:50px;background:linear-gradient(180deg,#667eea,#764ba2);border-radius:6px 0 0 6px;box-shadow:-2px 0 8px rgba(102,126,234,.3);cursor:pointer;opacity:0;transform:translateX(100%);transition:opacity .3s ease,transform .3s ease,width .2s ease;pointer-events:none}',
      '.yy-toggle-btn.show{opacity:1;transform:translateX(0);pointer-events:auto}',
      '.yy-toggle-btn:hover{width:10px}',
      '.yy-panel-gear{width:24px;height:24px;border-radius:6px;border:1px solid rgba(0,0,0,.08);background:rgba(0,0,0,.03);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:13px;margin-left:auto;margin-right:10px;flex-shrink:0;transition:background .2s ease,border-color .2s ease;user-select:none}',
      '.yy-panel-gear:hover{background:rgba(59,130,246,.1);border-color:rgba(59,130,246,.3)}',
      '.yy-panel-gear.active{background:#3b82f6;color:#fff;border-color:#3b82f6}',
      '.yy-panel-settings{display:none}',
      '.yy-panel-settings.show{display:block;animation:yy-fade .2s ease}',
      '@keyframes yy-fade{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}',
      '.yy-sec-title{font-size:11px;font-weight:600;color:#64748b;margin:4px 0 6px;letter-spacing:.5px}',
      '.yy-set-row{display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid rgba(0,0,0,.06)}',
      '.yy-set-row:last-child{border-bottom:none}',
      '.yy-set-row.disabled{opacity:.45;pointer-events:none}',
      '.yy-set-label{font-size:12px;font-weight:500;color:#334155}',
      '.yy-set-desc{font-size:10px;color:#94a3b8;margin-top:2px}',
      '.yy-switch{position:relative;width:34px;height:19px;border-radius:10px;background:#e2e8f0;cursor:pointer;transition:background .2s;flex-shrink:0}',
      '.yy-switch::after{content:"";position:absolute;top:2px;left:2px;width:15px;height:15px;border-radius:50%;background:#fff;transition:transform .2s;box-shadow:0 1px 3px rgba(0,0,0,.15)}',
      '.yy-switch.on{background:#3b82f6}',
      '.yy-switch.on::after{transform:translateX(15px)}',
      '.yy-slider-row{display:flex;align-items:center;gap:8px}',
      '.yy-slider{width:78px;height:4px;border-radius:2px;background:#e2e8f0;outline:none;-webkit-appearance:none;appearance:none;cursor:pointer}',
      '.yy-slider::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;background:#3b82f6;cursor:pointer}',
      '.yy-slider-val{font-size:11px;color:#3b82f6;font-weight:600;min-width:40px;text-align:right}',
      '@media(prefers-color-scheme:dark){',
      '.yy-card{background:linear-gradient(135deg,rgba(30,30,40,.95),rgba(25,25,35,.92));border-color:rgba(255,255,255,.1);border-left-color:#818cf8}',
      '.yy-text{color:#e2e8f0}.yy-loading{color:#64748b}',
      '.yy-panel-gear{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.1);color:#cbd5e1}',
      '.yy-panel-gear:hover{background:rgba(59,130,246,.15)}',
      '.yy-panel-gear.active{background:#3b82f6;color:#fff}',
      '.yy-set-row{border-bottom-color:rgba(255,255,255,.08)}',
      '.yy-set-label{color:#cbd5e1}.yy-set-desc{color:#64748b}.yy-sec-title{color:#94a3b8}',
      '.yy-switch{background:#334155}.yy-switch.on{background:#3b82f6}',
      '.yy-slider{background:#334155}.yy-slider-val{color:#a78bfa}',
      '}'
    ].join('');
    document.head.appendChild(s);
  }

  function renderSettingsInto(target, instance) {
    target.innerHTML = '';

    var title = document.createElement('div');
    title.className = 'yy-sec-title';
    title.textContent = '数据源';
    target.appendChild(title);

    settings.apis.forEach(function (api) {
      var row = document.createElement('div'); row.className = 'yy-set-row';
      var label = document.createElement('div'); label.className = 'yy-set-label'; label.textContent = api.name;
      var sw = document.createElement('div'); sw.className = 'yy-switch' + (api.enabled ? ' on' : '');
      sw.addEventListener('click', function (e) {
        e.stopPropagation();
        api.enabled = !api.enabled; sw.classList.toggle('on', api.enabled); saveSettings(settings);
        if (instance && instance.refresh) instance.refresh();
      });
      row.appendChild(label); row.appendChild(sw); target.appendChild(row);
    });

    var nhRow = document.createElement('div'); nhRow.className = 'yy-set-row';
    nhRow.innerHTML = '<div><div class="yy-set-label">不隐藏</div><div class="yy-set-desc">卡片始终显示</div></div>';
    var nhSw = document.createElement('div'); nhSw.className = 'yy-switch' + (settings.neverHide ? ' on' : '');
    nhRow.appendChild(nhSw); target.appendChild(nhRow);

    var dRow = document.createElement('div'); dRow.className = 'yy-set-row' + (settings.neverHide ? ' disabled' : '');
    dRow.innerHTML = '<div><div class="yy-set-label">隐藏延迟</div><div class="yy-set-desc">5s - 300s</div></div>';
    var sWrap = document.createElement('div'); sWrap.className = 'yy-slider-row';
    var slider = document.createElement('input');
    slider.type = 'range'; slider.className = 'yy-slider';
    slider.min = '5'; slider.max = '300'; slider.step = '1'; slider.value = settings.hideDelaySec;
    var val = document.createElement('span'); val.className = 'yy-slider-val'; val.textContent = settings.hideDelaySec + 's';
    slider.addEventListener('input', function () {
      settings.hideDelaySec = parseInt(slider.value, 10); val.textContent = settings.hideDelaySec + 's'; saveSettings(settings);
      if (instance && instance.restartHideTimer) instance.restartHideTimer();
    });
    sWrap.appendChild(slider); sWrap.appendChild(val); dRow.appendChild(sWrap); target.appendChild(dRow);

    nhSw.addEventListener('click', function (e) {
      e.stopPropagation();
      settings.neverHide = !settings.neverHide; nhSw.classList.toggle('on', settings.neverHide);
      dRow.classList.toggle('disabled', settings.neverHide); saveSettings(settings);
      if (instance && instance.applyNeverHide) instance.applyNeverHide();
    });
  }

  function createInstance() {
    injectCSS();

    var wrapper = null, card = null, toggleBtn = null, hostEl = null;
    var hideTimer = null, isHidden = false, destroyed = false, ro = null;
    var retryTimer = null, retryCount = 0;

    function buildDom() {
      var w = document.createElement('div');
      w.className = 'yy-container';
      w.dataset.widgetId = 'yiyan';
      w.innerHTML = '<div class="yy-card" title="点击换一句"><div class="yy-body"><div class="yy-loading">加载中</div></div></div>';
      return w;
    }

    function syncToggleHeight() {
      if (!card || !toggleBtn) return;
      var h = card.offsetHeight;
      if (h && h > 20) toggleBtn.style.height = Math.round(h) + 'px';
    }

    function mountDom() {
      if (destroyed || !isStillHomePage()) return false;
      hostEl = findHostEl();
      if (!hostEl) return false;
      var cs = getComputedStyle(hostEl);
      if (cs.position === 'static') hostEl.style.position = 'relative';

      document.querySelectorAll('.yy-container[data-widget-id="yiyan"]').forEach(function (el) { el.remove(); });
      document.querySelectorAll('.yy-toggle-btn[data-widget-id="yiyan"]').forEach(function (el) { el.remove(); });

      wrapper = buildDom();
      hostEl.appendChild(wrapper);
      card = wrapper.querySelector('.yy-card');

      toggleBtn = document.createElement('div');
      toggleBtn.className = 'yy-toggle-btn';
      toggleBtn.dataset.widgetId = 'yiyan';
      toggleBtn.title = '显示一言';
      toggleBtn.addEventListener('click', showCard);
      hostEl.appendChild(toggleBtn);

      card.addEventListener('click', function () { startHideTimer(); fetchQuote(); });
      card.addEventListener('mouseenter', clearHideTimer);
      card.addEventListener('mouseleave', function () { if (!isHidden && !settings.neverHide) startHideTimer(); });

      if (window.ResizeObserver) {
        if (ro) { try { ro.disconnect(); } catch (e) {} }
        ro = new ResizeObserver(function () { syncToggleHeight(); });
        ro.observe(card);
      }

      applyNeverHide();
      fetchQuote();
      startHideTimer();
      requestAnimationFrame(syncToggleHeight);
      return true;
    }

    function tryMount() {
      if (destroyed || !isStillHomePage()) return;
      if (mountDom()) { retryCount = 0; return; }
      if (++retryCount < 20) retryTimer = setTimeout(tryMount, 500);
    }

    function startHideTimer() {
      if (settings.neverHide) return;
      clearHideTimer();
      hideTimer = setTimeout(function () {
        if (destroyed || !isStillHomePage()) return;
        hideCard();
      }, settings.hideDelaySec * 1000);
    }
    function clearHideTimer() { if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; } }
    function hideCard() {
      if (isHidden || settings.neverHide || !wrapper) return;
      syncToggleHeight();
      isHidden = true;
      wrapper.classList.add('yy-hidden');
      if (toggleBtn) toggleBtn.classList.add('show');
    }
    function showCard() {
      if (!isHidden || !wrapper) return;
      isHidden = false;
      wrapper.classList.remove('yy-hidden');
      if (toggleBtn) toggleBtn.classList.remove('show');
      requestAnimationFrame(syncToggleHeight);
      startHideTimer();
    }
    function displayText(text) {
      if (!wrapper) return;
      var body = wrapper.querySelector('.yy-body');
      if (!body) return;
      var div = document.createElement('div');
      div.className = 'yy-text';
      div.textContent = text || '\u751f\u6d3b\u4e0d\u6b62\u773c\u524d\u7684\u4ee3\u7801\uff0c\u8fd8\u6709\u8bd7\u548c\u8fdc\u65b9';
      body.innerHTML = ''; body.appendChild(div);
      requestAnimationFrame(syncToggleHeight);
    }
    async function fetchQuote() {
      if (destroyed || !isStillHomePage() || !wrapper) return;
      var body = wrapper.querySelector('.yy-body');
      if (!body) return;
      body.innerHTML = '<div class="yy-loading">加载中</div>';
      var enabled = settings.apis.filter(function (a) { return a.enabled; }).sort(function () { return Math.random() - 0.5; });
      if (!enabled.length) { displayText('没有可用的 API'); return; }
      for (var i = 0; i < enabled.length; i++) {
        if (destroyed || !isStillHomePage()) return;
        try {
          var res = await fetch(enabled[i].url, { cache: 'no-store' });
          var raw = await res.text();
          if (destroyed || !isStillHomePage()) return;
          var text = pickText(raw, enabled[i]);
          if (text && text.trim().length > 2) { displayText(text.trim().slice(0, 80)); return; }
        } catch (e) {}
      }
      displayText('加载失败，点击重试');
    }
    function applyNeverHide() {
      if (settings.neverHide) {
        clearHideTimer();
        if (isHidden) showCard();
      } else {
        if (!isHidden) startHideTimer();
      }
    }
    function restartHideTimer() {
      if (!isHidden && !settings.neverHide) startHideTimer();
    }

    tryMount();

    return {
      applyNeverHide: applyNeverHide,
      restartHideTimer: restartHideTimer,
      refresh: function () { if (!destroyed && isStillHomePage()) fetchQuote(); },
      onDarkChange: function () {},
      destroy: function () {
        destroyed = true; clearHideTimer();
        if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
        if (ro) { try { ro.disconnect(); } catch (e) {} ro = null; }
        if (wrapper && wrapper.parentNode) wrapper.remove();
        if (toggleBtn && toggleBtn.parentNode) toggleBtn.remove();
        wrapper = null; card = null; toggleBtn = null; hostEl = null;
      }
    };
  }

  var currentInstance = null;
  function register() {
    if (!window.__tbWidgetRegistry) return false;
    window.__tbWidgetRegistry.add({
      id: 'yiyan',
      label: '一言',
      icon: '\ud83d\udcdc',
      order: 5,
      mount: function () { currentInstance = createInstance(); return currentInstance; },
      panelSections: [{
        render: function (container) {
          container.classList.add('yy-panel-settings');

          renderSettingsInto(container, currentInstance);

          container.classList.toggle('show', !!settings.panelOpen);

          var tries = 0;
          function injectGear() {
            if (!container.isConnected) {
              if (++tries < 30) return requestAnimationFrame(injectGear);
              return;
            }
            var row = container.previousElementSibling;
            while (row && !(row.querySelector && row.querySelector('[class*="widget-toggle"]'))) {
              row = row.previousElementSibling;
            }
            var toggle = row && row.querySelector ? row.querySelector('[class*="widget-toggle"]') : null;

            if (toggle && !row.querySelector('.yy-panel-gear')) {
              var gear = document.createElement('div');
              gear.className = 'yy-panel-gear' + (settings.panelOpen ? ' active' : '');
              gear.title = '设置';
              gear.textContent = '\u2699';
              gear.addEventListener('click', function (e) {
                e.stopPropagation();
                var on = container.classList.toggle('show');
                gear.classList.toggle('active', on);
                settings.panelOpen = on; saveSettings(settings);
              });
              toggle.parentNode.insertBefore(gear, toggle);
              return;
            }

            if (!container.querySelector('.yy-panel-gear')) {
              var gear2 = document.createElement('div');
              gear2.className = 'yy-panel-gear' + (settings.panelOpen ? ' active' : '');
              gear2.title = '设置';
              gear2.textContent = '\u2699';
              gear2.style.cssText = 'position:absolute;top:6px;right:10px;';
              gear2.addEventListener('click', function (e) {
                e.stopPropagation();
                var on = container.classList.toggle('show');
                gear2.classList.toggle('active', on);
                settings.panelOpen = on; saveSettings(settings);
              });
              if (getComputedStyle(container).position === 'static') {
                container.style.position = 'relative';
              }
              container.insertBefore(gear2, container.firstChild);
            }
          }
          requestAnimationFrame(injectGear);
        }
      }]
    });
    return true;
  }

  window.addEventListener('tb-skill:master-online', register);
  if (!register()) {
    var tries = 0;
    var timer = setInterval(function () {
      if (!isStillHomePage()) { clearInterval(timer); return; }
      if (register() || ++tries > 40) clearInterval(timer);
    }, 250);
  }
})();