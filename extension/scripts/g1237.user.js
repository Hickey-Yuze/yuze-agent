(function() {
  'use strict';

  if (window.quickLinksV2Ready) return;
  window.quickLinksV2Ready = true;

  var PLACEHOLDER = '%s';

  var CONFIG = {
    ENGINE_KEY: 'searchEngine_v2',
    ENGINES_KEY: 'searchEngines_custom_v2',
    RENDER_DELAY: 200,
    MAX_RETRY: 20,
    RETRY_INTERVAL: 500,
    DEFAULT_ENGINES: {
      baidu: { name: '百度', url: 'https://www.baidu.com/s?wd=' + PLACEHOLDER },
      bing: { name: 'Bing', url: 'https://www.bing.com/search?q=' + PLACEHOLDER },
      google: { name: 'Google', url: 'https://www.google.com/search?q=' + PLACEHOLDER }
    }
  };

  var searchContainerRef = null;
  var retryCount = 0;
  var currentEngine = 'baidu';
  var engines = {};
  var colorMap = {};

  var BASE_COLORS = ['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ef4444','#14b8a6','#f97316','#06b6d4'];

  function hashString(str) {
    var hash = 0;
    for (var i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return hash;
  }

  function assignColors() {
    colorMap = {};
    var usedSet = {};
    var keys = Object.keys(engines);

    keys.forEach(function(key) {
      var name = engines[key].name;
      var h = hashString(name);
      var prefIdx = Math.abs(h) % BASE_COLORS.length;
      var assigned = null;

      if (!usedSet[BASE_COLORS[prefIdx]]) {
        assigned = BASE_COLORS[prefIdx];
      } else {
        for (var j = 0; j < BASE_COLORS.length; j++) {
          if (!usedSet[BASE_COLORS[j]]) {
            assigned = BASE_COLORS[j];
            break;
          }
        }
      }

      if (!assigned) {
        var hue = ((Math.abs(h) * 137) % 300) + 30;
        assigned = 'hsl(' + hue + ',65%,55%)';
      }

      colorMap[key] = assigned;
      usedSet[assigned] = true;
    });
  }

  function getEngineColor(key) {
    return colorMap[key] || '#6366f1';
  }

  function getEngineLabel(name) {
    if (!name) return '?';
    var first = name.charAt(0);
    if (/[\u4e00-\u9fff]/.test(first)) {
      return name.substring(0, 2);
    }
    return first.toUpperCase();
  }

  function migrateUrl(url) {
    if (url.indexOf(PLACEHOLDER) !== -1) return url;
    if (url.endsWith('=')) return url + PLACEHOLDER;
    return url + (url.indexOf('?') !== -1 ? '&' : '?') + 'q=' + PLACEHOLDER;
  }

  function loadEngines() {
    try {
      var saved = localStorage.getItem(CONFIG.ENGINES_KEY);
      if (saved) {
        engines = JSON.parse(saved);
        var needsSave = false;
        Object.keys(engines).forEach(function(key) {
          var migrated = migrateUrl(engines[key].url);
          if (migrated !== engines[key].url) {
            engines[key].url = migrated;
            needsSave = true;
          }
          if (engines[key].domain) {
            delete engines[key].domain;
            needsSave = true;
          }
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

  function getNextEngineKey() {
    var keys = Object.keys(engines);
    var idx = keys.indexOf(currentEngine);
    if (idx === -1 || keys.length <= 1) return keys[0];
    return keys[(idx + 1) % keys.length];
  }

  function removeOldInstances() {
    var oldV1 = document.querySelector('.ql-search-container');
    if (oldV1 && oldV1.parentNode) oldV1.remove();
    var oldStyle = document.getElementById('ql-style');
    if (oldStyle) oldStyle.remove();
  }

  function injectStyle() {
    if (document.getElementById('ql-style-v2')) return;
    var style = document.createElement('style');
    style.id = 'ql-style-v2';
    style.textContent = '\
      .ql-search-container{display:flex;align-items:center;justify-content:center;gap:10px;margin:10px auto 6px;max-width:783px;width:100%;box-sizing:border-box}\
      .ql-search-wrapper{flex:1;position:relative;display:flex;align-items:center}\
      .ql-engine-logo-wrap{position:relative;flex-shrink:0}\
      .ql-engine-logo{display:flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:21px;border:1px solid var(--chat-input-border,var(--intensity-6,rgba(142,142,160,.25)));background:var(--panel-bg);cursor:pointer;transition:all .2s ease;outline:none;padding:0;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}\
      .ql-engine-logo:hover{background:var(--intensity-6,rgba(0,0,0,.05))}\
      .ql-engine-logo:active{transform:scale(.98)}\
      .ql-engine-logo:focus-visible{border-color:var(--chat-input-border);box-shadow:0 0 0 1.5px var(--intensity-6,rgba(142,142,160,.2))}\
      .ql-engine-logo-text{font-size:14px;font-weight:700;line-height:1;pointer-events:none;color:#fff;letter-spacing:-.5px}\
      .ql-engine-logo-text.zh{font-size:13px;letter-spacing:0}\
      .ql-engine-edit-badge{position:absolute;top:-4px;right:-4px;width:18px;height:18px;border-radius:50%;background:var(--panel-bg);border:1px solid var(--chat-input-border,var(--intensity-6,rgba(142,142,160,.25)));display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .2s ease;z-index:2;padding:0;color:var(--text-tertiary,#9ca3af);box-shadow:0 1px 3px rgba(0,0,0,.1)}\
      .ql-engine-edit-badge:hover{background:var(--accent,#6366f1);color:#fff;border-color:var(--accent,#6366f1)}\
      .ql-engine-edit-badge svg{width:10px;height:10px;pointer-events:none}\
      .ql-search-input{width:100%;height:42px;padding:0 48px 0 16px;border:1px solid var(--chat-input-border,var(--intensity-6,rgba(142,142,160,.25)));border-radius:21px;font-size:14px;outline:none;background:var(--panel-bg);transition:border-color .2s ease,box-shadow .2s ease;box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:var(--text-primary,#1f2937)}\
      .ql-search-input::placeholder{color:var(--text-tertiary,#9ca3af)}\
      .ql-search-input:focus{border-color:var(--chat-input-border);box-shadow:0 0 0 1.5px var(--intensity-6,rgba(142,142,160,.2))}\
      .ql-search-btn{position:absolute;right:4px;width:34px;height:34px;border-radius:50%;border:none;background:linear-gradient(135deg,var(--accent,#6366f1) 0%,var(--accent-dark,#4f46e5) 100%);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s ease;font-size:16px;outline:none}\
      .ql-search-btn:hover{transform:scale(1.05);box-shadow:0 2px 8px var(--accent-shadow,rgba(99,102,241,.4))}\
      .ql-search-btn:active{transform:scale(.98)}\
      .ql-search-btn:focus-visible{box-shadow:0 0 0 1.5px var(--intensity-6,rgba(142,142,160,.2))}\
      .ql-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;z-index:99999;animation:ql-fade-in .15s ease}\
      @keyframes ql-fade-in{from{opacity:0}to{opacity:1}}\
      @keyframes ql-slide-up{from{transform:translateY(10px);opacity:0}to{transform:translateY(0);opacity:1}}\
      .ql-modal{background:var(--panel-bg,#fff);border-radius:16px;width:420px;max-width:90vw;max-height:80vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.2);border:1px solid var(--chat-input-border,var(--intensity-6,rgba(142,142,160,.25)));animation:ql-slide-up .2s ease;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;overflow:hidden}\
      .ql-modal-header{display:flex;align-items:center;justify-content:space-between;padding:16px 20px 12px;border-bottom:1px solid var(--intensity-6,rgba(0,0,0,.06))}\
      .ql-modal-title{font-size:15px;font-weight:600;color:var(--text-primary,#1f2937)}\
      .ql-modal-close{width:28px;height:28px;border-radius:50%;border:none;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--text-tertiary,#9ca3af);transition:all .15s ease;padding:0}\
      .ql-modal-close:hover{background:var(--intensity-6,rgba(0,0,0,.06));color:var(--text-primary,#1f2937)}\
      .ql-modal-body{padding:12px 20px;overflow-y:auto;flex:1}\
      .ql-engine-item{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--intensity-6,rgba(0,0,0,.04))}\
      .ql-engine-item:last-child{border-bottom:none}\
      .ql-engine-item-icon{width:24px;height:24px;border-radius:6px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:10px;font-weight:700;color:#fff;line-height:1}\
      .ql-engine-item-icon.zh{font-size:9px;letter-spacing:0}\
      .ql-engine-item-info{flex:1;min-width:0}\
      .ql-engine-item-name{font-size:13px;font-weight:500;color:var(--text-primary,#1f2937)}\
      .ql-engine-item-url{font-size:11px;color:var(--text-tertiary,#9ca3af);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\
      .ql-engine-item-delete{width:26px;height:26px;border-radius:50%;border:none;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--text-tertiary,#9ca3af);transition:all .15s ease;flex-shrink:0;padding:0}\
      .ql-engine-item-delete:hover{background:rgba(239,68,68,.1);color:#ef4444}\
      .ql-engine-item-delete.disabled{opacity:.3;cursor:not-allowed}\
      .ql-engine-item-delete.disabled:hover{background:transparent;color:var(--text-tertiary,#9ca3af)}\
      .ql-engine-item.active{background:var(--intensity-6,rgba(99,102,241,.06));margin:0 -8px;padding:8px 8px;border-radius:8px}\
      .ql-engine-item.active .ql-engine-item-name::after{content:" ✓";color:var(--accent,#6366f1);font-size:11px}\
      .ql-modal-add-section{padding:12px 20px 16px;border-top:1px solid var(--intensity-6,rgba(0,0,0,.06))}\
      .ql-modal-add-title{font-size:12px;font-weight:600;color:var(--text-secondary,#6b7280);margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px}\
      .ql-modal-field{margin-bottom:8px}\
      .ql-modal-field label{display:block;font-size:12px;color:var(--text-secondary,#6b7280);margin-bottom:3px}\
      .ql-modal-field input{width:100%;height:34px;padding:0 10px;border:1px solid var(--chat-input-border,var(--intensity-6,rgba(142,142,160,.25)));border-radius:8px;font-size:13px;outline:none;background:var(--panel-bg,#fff);color:var(--text-primary,#1f2937);box-sizing:border-box;font-family:inherit;transition:border-color .15s ease}\
      .ql-modal-field input:focus{border-color:var(--accent,#6366f1)}\
      .ql-modal-field input::placeholder{color:var(--text-tertiary,#9ca3af)}\
      .ql-modal-field input.ql-input-error{border-color:#ef4444}\
      .ql-modal-hint{font-size:11px;color:var(--text-tertiary,#9ca3af);margin-top:2px;line-height:1.4}\
      .ql-modal-hint code{background:var(--intensity-6,rgba(0,0,0,.06));padding:1px 4px;border-radius:3px;font-size:11px;color:var(--accent,#6366f1)}\
      .ql-modal-add-btn{width:100%;height:34px;border-radius:8px;border:none;background:var(--accent,#6366f1);color:#fff;font-size:13px;font-weight:500;cursor:pointer;transition:all .15s ease;margin-top:4px;padding:0}\
      .ql-modal-add-btn:hover{opacity:.9}\
      .ql-modal-add-btn:disabled{opacity:.4;cursor:not-allowed}\
    ';
    document.head.appendChild(style);
  }

  function findAnchor() {
    return document.querySelector('.theme-input-container') ||
           document.querySelector('[class*="input"]');
  }

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
        empty.style.cssText = 'text-align:center;padding:20px 0;color:var(--text-tertiary,#9ca3af);font-size:13px;';
        empty.textContent = '暂无搜索引擎，请添加';
        body.appendChild(empty);
        return;
      }
      keys.forEach(function(key) {
        var eng = engines[key];
        var item = document.createElement('div');
        item.className = 'ql-engine-item' + (key === currentEngine ? ' active' : '');

        var isZh = /[\u4e00-\u9fff]/.test(eng.name.charAt(0));
        var icon = document.createElement('div');
        icon.className = 'ql-engine-item-icon' + (isZh ? ' zh' : '');
        icon.style.background = getEngineColor(key);
        icon.textContent = getEngineLabel(eng.name);

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
            assignColors();
            updateEngineUI();
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
      engines[key] = { name: name, url: url };
      saveEngines();
      assignColors();
      nameInput.value = '';
      urlInput.value = '';
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

  var logoBtnRef = null;
  var inputRef = null;

  function updateEngineUI() {
    if (!engines[currentEngine]) {
      var keys = Object.keys(engines);
      currentEngine = keys.length > 0 ? keys[0] : '';
      saveEngine(currentEngine);
    }
    var eng = engines[currentEngine];
    if (!eng || !logoBtnRef || !inputRef) return;

    var label = getEngineLabel(eng.name);
    var isZh = /[\u4e00-\u9fff]/.test(eng.name.charAt(0));
    var color = getEngineColor(currentEngine);

    logoBtnRef.style.background = color;
    logoBtnRef.style.borderColor = color;
    logoBtnRef.innerHTML = '<span class="ql-engine-logo-text' + (isZh ? ' zh' : '') + '">' + label + '</span>';
    inputRef.placeholder = '在' + eng.name + '搜索...';
    logoBtnRef.title = '当前: ' + eng.name + '（点击切换）';
  }

  function createSearchContainer() {
    var container = document.createElement('div');
    container.className = 'ql-search-container';

    var logoWrap = document.createElement('div');
    logoWrap.className = 'ql-engine-logo-wrap';

    var logoBtn = document.createElement('button');
    logoBtn.type = 'button';
    logoBtn.className = 'ql-engine-logo';
    logoBtn.setAttribute('aria-label', '切换搜索引擎');
    logoBtnRef = logoBtn;

    var editBadge = document.createElement('button');
    editBadge.type = 'button';
    editBadge.className = 'ql-engine-edit-badge';
    editBadge.setAttribute('aria-label', '管理搜索引擎');
    editBadge.title = '管理搜索引擎';
    editBadge.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>';
    editBadge.addEventListener('click', function(e) {
      e.stopPropagation();
      openEditModal();
    });

    logoWrap.appendChild(logoBtn);
    logoWrap.appendChild(editBadge);

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

    loadEngines();
    loadEngine();
    assignColors();
    updateEngineUI();

    logoBtn.addEventListener('click', function() {
      currentEngine = getNextEngineKey();
      saveEngine(currentEngine);
      updateEngineUI();
    });

    wrapper.appendChild(input);
    wrapper.appendChild(btn);
    container.appendChild(logoWrap);
    container.appendChild(wrapper);

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

    return container;
  }

  function render() {
    var anchor = findAnchor();
    if (!anchor || !anchor.parentNode) return false;
    removeOldInstances();
    if (searchContainerRef && searchContainerRef.parentNode) searchContainerRef.remove();
    var searchContainer = createSearchContainer();
    anchor.parentNode.insertBefore(searchContainer, anchor.nextSibling);
    searchContainerRef = searchContainer;
    return true;
  }

  function tryRender() {
    if (render()) return;
    retryCount += 1;
    if (retryCount <= CONFIG.MAX_RETRY) setTimeout(tryRender, CONFIG.RETRY_INTERVAL);
    else console.warn('ql-v2: anchor not found');
  }

  function init() {
    removeOldInstances();
    injectStyle();
    setTimeout(tryRender, CONFIG.RENDER_DELAY);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();