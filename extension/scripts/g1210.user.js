(function () {
  'use strict';

  if (window.__tbCapsuleSearchLoaded) return;
  window.__tbCapsuleSearchLoaded = true;

  var PLACEHOLDER   = '%s';
  var ENGINE_KEY    = 'cs_engine_v1';
  var ENGINES_KEY   = 'cs_engines_v1';
  var STYLE_ID      = 'cs-ext-style';
  var ROOT_ID       = 'cs-bar-root';
  var WIDGET_ID     = 'capsule-search';

  var DEFAULT_ENGINES = [
    { key: 'baidu',  name: '百度',   url: 'https://www.baidu.com/s?wd=%s' },
    { key: 'bing',   name: 'Bing',   url: 'https://www.bing.com/search?q=%s' },
    { key: 'google', name: 'Google', url: 'https://www.google.com/search?q=%s' }
  ];

  var RENDER_DELAY   = 200;
  var MAX_RETRY      = 20;
  var RETRY_INTERVAL = 500;

  var engines    = [];
  var current    = 0;
  var isOpen     = false;
  var retryCount = 0;
  var retryTimer = null;
  var isDark     = false;

  var containerEl = null;
  var panelEl     = null;
  var labelEl     = null;
  var inputEl     = null;

  var dragIdx   = null;
  var dragWrap  = null;
  var ghost     = null;
  var phEl      = null;
  var pillRects = [];
  var grabOffX  = 0;

  function loadEngines() {
    try {
      var s = localStorage.getItem(ENGINES_KEY);
      if (s) { engines = JSON.parse(s); return; }
    } catch (e) {}
    engines = JSON.parse(JSON.stringify(DEFAULT_ENGINES));
  }
  function saveEngines() {
    try { localStorage.setItem(ENGINES_KEY, JSON.stringify(engines)); } catch (e) {}
  }
  function loadCurrent() {
    try {
      var k = localStorage.getItem(ENGINE_KEY);
      var idx = engines.findIndex(function (e) { return e.key === k; });
      if (idx > -1) { current = idx; return; }
    } catch (e) {}
    current = 0;
  }
  function saveCurrent() {
    try { localStorage.setItem(ENGINE_KEY, engines[current] ? engines[current].key : ''); } catch (e) {}
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = getCss();
    document.head.appendChild(s);
  }
  function removeStyle() {
    var el = document.getElementById(STYLE_ID);
    if (el) el.remove();
  }

  function getCss() {
    return (
      '#cs-bar-root{' +
        'display:flex;flex-direction:column;align-items:center;' +
        'width:100%;margin:12px auto 0;' +
      '}' +
      '.cs-container{' +
        'width:100%;box-sizing:border-box;' +
        'background:var(--cs-panel-bg,#fff);' +
        'border:.5px solid rgba(0,0,0,.1);' +
        'border-radius:999px;' +
        'box-shadow:0 4px 16px rgba(0,0,0,.08);' +
        'overflow:hidden;' +
        'transition:box-shadow .18s ease;' +
      '}' +
      '.cs-container.open{border-radius:18px;box-shadow:0 8px 24px rgba(0,0,0,.1);}' +
      '.cs-pill-row{' +
        'display:flex;align-items:center;' +
        'height:46px;padding:0 6px 0 14px;gap:8px;' +
        'width:100%;box-sizing:border-box;' +
      '}' +
      '.cs-engine-label{' +
        'font-size:12px;font-weight:500;color:rgba(0,0,0,.45);' +
        'white-space:nowrap;flex-shrink:0;padding:0 4px;' +
        'cursor:pointer;user-select:none;transition:color .15s;' +
      '}' +
      '.cs-engine-label:hover{color:rgba(0,0,0,.7);}' +
      '.cs-vdivider{width:.5px;height:16px;background:rgba(0,0,0,.1);flex-shrink:0;}' +
      '.cs-input{' +
        'flex:1;border:none;outline:none;background:transparent;' +
        'font-size:14px;color:inherit;caret-color:#F3A04C;' +
        'min-width:0;font-family:inherit;' +
      '}' +
      '.cs-input::placeholder{color:rgba(0,0,0,.3);}' +
      '.cs-search-btn{' +
        'flex-shrink:0;width:34px;height:34px;border-radius:50%;' +
        'border:none;background:#F3A04C;color:#fff;' +
        'display:flex;align-items:center;justify-content:center;' +
        'transition:background .15s,transform .1s;cursor:pointer;' +
      '}' +
      '.cs-search-btn:hover{background:#E58522;transform:scale(1.06);}' +
      '.cs-search-btn:active{transform:scale(.97);}' +
      '.cs-panel{' +
        'max-height:0;overflow:hidden;' +
        'transition:max-height .2s linear;' +
        'border-top:0px solid rgba(0,0,0,.07);' +
      '}' +
      '.cs-panel.open{max-height:220px;border-top-width:.5px;}' +
      '.cs-panel-inner{padding:12px 14px 14px;}' +
      '.cs-section-label{font-size:11px;font-weight:500;color:rgba(0,0,0,.3);margin-bottom:8px;}' +
      '.cs-tags{display:flex;gap:6px;flex-wrap:wrap;align-items:center;min-height:28px;}' +
      '.cs-tag-wrap{position:relative;display:inline-flex;flex-shrink:0;touch-action:none;}' +
      '.cs-tag{' +
        'height:26px;padding:0 22px 0 10px;' +
        'border-radius:999px;font-size:12px;font-weight:500;' +
        'border:.5px solid rgba(0,0,0,.1);' +
        'background:rgba(0,0,0,.04);color:rgba(0,0,0,.7);' +
        'cursor:grab;user-select:none;white-space:nowrap;font-family:inherit;' +
        'transition:background .15s,border-color .15s,color .15s;' +
      '}' +
      '.cs-tag.active{border-color:#F3A04C;background:#F3A04C;color:#fff;}' +
      '.cs-tag-ghost{' +
        'position:fixed;pointer-events:none;z-index:9999;' +
        'height:26px;padding:0 22px 0 10px;' +
        'border-radius:999px;font-size:12px;font-weight:500;' +
        'border:.5px solid rgba(0,0,0,.1);' +
        'background:rgba(0,0,0,.04);color:rgba(0,0,0,.7);' +
        'white-space:nowrap;font-family:inherit;' +
        'display:flex;align-items:center;' +
        'box-shadow:0 4px 12px rgba(0,0,0,.15);' +
        'transform:scale(1.06);opacity:.92;transition:none;' +
      '}' +
      '.cs-tag-ghost.active{border-color:#F3A04C;background:#F3A04C;color:#fff;}' +
      '.cs-placeholder{' +
        'display:inline-flex;flex-shrink:0;' +
        'height:26px;border-radius:999px;' +
        'background:rgba(0,0,0,.03);' +
        'border:.5px dashed rgba(0,0,0,.15);' +
        'pointer-events:none;' +
      '}' +
      '.cs-tag-del{' +
        'position:absolute;top:-5px;right:-5px;' +
        'width:14px;height:14px;border-radius:50%;' +
        'background:rgba(0,0,0,.18);color:#fff;' +
        'font-size:10px;display:flex;align-items:center;justify-content:center;' +
        'cursor:pointer;transition:background .15s;z-index:2;' +
        'border:none;padding:0;font-family:inherit;line-height:1;' +
      '}' +
      '.cs-tag-del:hover{background:#E65C53;}' +
      '.cs-hint{display:flex;align-items:center;gap:4px;margin-top:6px;font-size:10px;color:rgba(0,0,0,.28);}' +
      '.cs-kbd{' +
        'display:inline-flex;align-items:center;justify-content:center;' +
        'height:16px;padding:0 5px;' +
        'border:.5px solid rgba(0,0,0,.14);border-radius:4px;' +
        'background:rgba(0,0,0,.04);font-size:10px;color:rgba(0,0,0,.4);' +
        'font-family:inherit;' +
      '}' +
      '.cs-hdivider{height:.5px;background:rgba(0,0,0,.06);margin:10px 0;}' +
      '.cs-add-row{display:flex;gap:6px;}' +
      '.cs-add-input{' +
        'height:28px;border:.5px solid rgba(0,0,0,.1);border-radius:8px;' +
        'background:rgba(0,0,0,.04);color:inherit;padding:0 8px;' +
        'font-size:12px;outline:none;font-family:inherit;' +
        'transition:border-color .15s;box-sizing:border-box;' +
      '}' +
      '.cs-add-input:focus{border-color:#F3A04C;}' +
      '.cs-add-input::placeholder{color:rgba(0,0,0,.3);}' +
      '.cs-add-input.name{flex:0 0 72px;}' +
      '.cs-add-input.url{flex:1;min-width:0;}' +
      '.cs-add-btn{' +
        'flex-shrink:0;height:28px;padding:0 10px;' +
        'border:none;border-radius:8px;' +
        'background:#F3A04C;color:#fff;' +
        'font-size:12px;font-weight:500;cursor:pointer;' +
        'transition:background .15s;font-family:inherit;' +
      '}' +
      '.cs-add-btn:hover{background:#E58522;}' +
      '.cs-err{font-size:11px;color:#E65C53;margin-top:4px;display:none;}' +
      '@media(prefers-color-scheme:dark){' +
        '.cs-container{background:#2E2E2E;border-color:rgba(255,255,255,.1);}' +
        '.cs-engine-label{color:rgba(255,255,255,.45);}' +
        '.cs-engine-label:hover{color:rgba(255,255,255,.75);}' +
        '.cs-vdivider{background:rgba(255,255,255,.1);}' +
        '.cs-input{color:rgba(255,255,255,.8);}' +
        '.cs-input::placeholder{color:rgba(255,255,255,.25);}' +
        '.cs-panel{border-top-color:rgba(255,255,255,.08);}' +
        '.cs-section-label{color:rgba(255,255,255,.3);}' +
        '.cs-tag{border-color:rgba(255,255,255,.1);background:rgba(255,255,255,.06);color:rgba(255,255,255,.75);}' +
        '.cs-tag-ghost{border-color:rgba(255,255,255,.1);background:rgba(255,255,255,.06);color:rgba(255,255,255,.75);}' +
        '.cs-tag-ghost.active{border-color:#F3A04C;background:#F3A04C;color:#fff;}' +
        '.cs-tag-del{background:rgba(255,255,255,.2);}' +
        '.cs-placeholder{background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.15);}' +
        '.cs-hdivider{background:rgba(255,255,255,.07);}' +
        '.cs-add-input{border-color:rgba(255,255,255,.1);background:rgba(255,255,255,.06);color:rgba(255,255,255,.8);}' +
        '.cs-add-input::placeholder{color:rgba(255,255,255,.25);}' +
        '.cs-hint{color:rgba(255,255,255,.28);}' +
        '.cs-kbd{border-color:rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:rgba(255,255,255,.4);}' +
      '}' +
      '.cs-dark .cs-container{background:#2E2E2E;border-color:rgba(255,255,255,.1);}' +
      '.cs-dark .cs-engine-label{color:rgba(255,255,255,.45);}' +
      '.cs-dark .cs-engine-label:hover{color:rgba(255,255,255,.75);}' +
      '.cs-dark .cs-vdivider{background:rgba(255,255,255,.1);}' +
      '.cs-dark .cs-input{color:rgba(255,255,255,.8);}' +
      '.cs-dark .cs-input::placeholder{color:rgba(255,255,255,.25);}' +
      '.cs-dark .cs-panel{border-top-color:rgba(255,255,255,.08);}' +
      '.cs-dark .cs-section-label{color:rgba(255,255,255,.3);}' +
      '.cs-dark .cs-tag{border-color:rgba(255,255,255,.1);background:rgba(255,255,255,.06);color:rgba(255,255,255,.75);}' +
      '.cs-dark .cs-tag-ghost{border-color:rgba(255,255,255,.1);background:rgba(255,255,255,.06);color:rgba(255,255,255,.75);}' +
      '.cs-dark .cs-tag-ghost.active{border-color:#F3A04C;background:#F3A04C;color:#fff;}' +
      '.cs-dark .cs-tag-del{background:rgba(255,255,255,.2);}' +
      '.cs-dark .cs-placeholder{background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.15);}' +
      '.cs-dark .cs-hdivider{background:rgba(255,255,255,.07);}' +
      '.cs-dark .cs-add-input{border-color:rgba(255,255,255,.1);background:rgba(255,255,255,.06);color:rgba(255,255,255,.8);}' +
      '.cs-dark .cs-add-input::placeholder{color:rgba(255,255,255,.25);}' +
      '.cs-dark .cs-hint{color:rgba(255,255,255,.28);}' +
      '.cs-dark .cs-kbd{border-color:rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:rgba(255,255,255,.4);}'
    );
  }

  function applyDark(dark) {
    isDark = dark;
    var root = document.getElementById(ROOT_ID);
    if (!root) return;
    if (dark) root.classList.add('cs-dark');
    else root.classList.remove('cs-dark');
  }

  function cleanupDrag() {
    if (ghost && ghost.parentNode) ghost.parentNode.removeChild(ghost);
    if (phEl  && phEl.parentNode)  phEl.parentNode.removeChild(phEl);
    if (dragWrap) dragWrap.style.display = '';
    ghost = null; phEl = null; dragIdx = null; dragWrap = null;
  }

  function renderTags() {
    var tagsEl = document.getElementById('cs-tags');
    if (!tagsEl) return;
    tagsEl.innerHTML = '';

    engines.forEach(function (e, i) {
      var wrap = document.createElement('div');
      wrap.className = 'cs-tag-wrap';
      wrap.dataset.idx = String(i);

      var pill = document.createElement('button');
      pill.className = 'cs-tag' + (i === current ? ' active' : '');
      pill.textContent = e.name;

      var del = document.createElement('button');
      del.className = 'cs-tag-del';
      del.title = '删除';
      del.innerHTML = '&times;';
      del.addEventListener('pointerdown', function (ev) { ev.stopPropagation(); });
      del.addEventListener('click', function (ev) {
        ev.stopPropagation();
        if (engines.length <= 1) return;
        engines.splice(i, 1);
        if (current >= engines.length) current = engines.length - 1;
        saveEngines(); saveCurrent();
        if (labelEl) labelEl.textContent = engines[current].name;
        renderTags();
      });

      wrap.appendChild(pill);
      wrap.appendChild(del);
      tagsEl.appendChild(wrap);

      pill.addEventListener('pointerdown', function (ev) {
        if (ev.button !== 0) return;
        ev.preventDefault(); ev.stopPropagation();
        dragIdx = i; dragWrap = wrap;

        pillRects = [];
        tagsEl.querySelectorAll('.cs-tag-wrap').forEach(function (w) {
          var r = w.getBoundingClientRect();
          pillRects.push({ el: w, cx: r.left + r.width / 2, width: r.width });
        });

        var pr = pill.getBoundingClientRect();
        grabOffX = ev.clientX - pr.left;

        phEl = document.createElement('div');
        phEl.className = 'cs-placeholder';
        phEl.style.width = wrap.offsetWidth + 'px';
        tagsEl.insertBefore(phEl, wrap);
        wrap.style.display = 'none';

        ghost = document.createElement('div');
        ghost.className = 'cs-tag-ghost' + (i === current ? ' active' : '');
        ghost.textContent = e.name;
        ghost.style.left = (ev.clientX - grabOffX) + 'px';
        ghost.style.top  = pr.top + 'px';
        document.body.appendChild(ghost);

        pill.setPointerCapture(ev.pointerId);
      });

      pill.addEventListener('pointermove', function (ev) {
        if (dragIdx === null || dragWrap !== wrap) return;
        ghost.style.left = (ev.clientX - grabOffX) + 'px';
        ghost.style.top  = (ev.clientY - 13) + 'px';

        var cx = ev.clientX, insertBefore = null;
        for (var k = 0; k < pillRects.length; k++) {
          if (pillRects[k].el === wrap) continue;
          if (cx < pillRects[k].cx) { insertBefore = pillRects[k].el; break; }
        }
        if (phEl.parentNode) phEl.parentNode.removeChild(phEl);
        if (insertBefore) tagsEl.insertBefore(phEl, insertBefore);
        else tagsEl.appendChild(phEl);
      });

      pill.addEventListener('pointerup', function (ev) {
        if (dragIdx === null || dragWrap !== wrap) return;
        var cx = ev.clientX, newIdx = engines.length - 1;
        for (var k = 0; k < pillRects.length; k++) {
          if (pillRects[k].el === wrap) continue;
          if (cx < pillRects[k].cx) {
            newIdx = Number(pillRects[k].el.dataset.idx);
            if (newIdx > dragIdx) newIdx--;
            break;
          }
        }
        if (newIdx !== dragIdx) {
          var moved = engines.splice(dragIdx, 1)[0];
          engines.splice(newIdx, 0, moved);
          if (dragIdx === current)                          current = newIdx;
          else if (dragIdx < current && newIdx >= current)  current--;
          else if (dragIdx > current && newIdx <= current)  current++;
          saveEngines(); saveCurrent();
          if (labelEl) labelEl.textContent = engines[current].name;
        }
        cleanupDrag();
        renderTags();
      });

      pill.addEventListener('click', function () {
        if (dragIdx !== null) return;
        selectEngine(i);
        if (inputEl) inputEl.focus();
      });
    });
  }

  function selectEngine(i) {
    if (i < 0) i = engines.length - 1;
    if (i >= engines.length) i = 0;
    current = i;
    saveCurrent();
    if (labelEl) labelEl.textContent = engines[i].name;
    renderTags();
  }

  function togglePanel(force) {
    isOpen = typeof force === 'boolean' ? force : !isOpen;
    if (!containerEl || !panelEl) return;
    if (isOpen) {
      containerEl.style.borderRadius = '18px';
      requestAnimationFrame(function () {
        containerEl.classList.add('open');
        panelEl.classList.add('open');
      });
    } else {
      containerEl.classList.remove('open');
      panelEl.classList.remove('open');
      setTimeout(function () {
        if (!isOpen) containerEl.style.borderRadius = '';
      }, 200);
    }
  }

  function doSearch() {
    if (!inputEl) return;
    var q = inputEl.value.trim();
    if (!q || !engines[current]) return;
    var url = engines[current].url.replace(PLACEHOLDER, encodeURIComponent(q));
    window.open(url, '_blank', 'noopener');
  }

  function buildBar() {
    var root = document.createElement('div');
    root.id = ROOT_ID;
    root.dataset.widgetId = WIDGET_ID;
    if (isDark) root.classList.add('cs-dark');

    var container = document.createElement('div');
    container.className = 'cs-container';
    containerEl = container;

    var pillRow = document.createElement('div');
    pillRow.className = 'cs-pill-row';

    var lbl = document.createElement('span');
    lbl.className = 'cs-engine-label';
    lbl.textContent = engines[current] ? engines[current].name : '';
    labelEl = lbl;
    lbl.addEventListener('click', function () { togglePanel(); });

    var vdiv = document.createElement('div');
    vdiv.className = 'cs-vdivider';

    var inp = document.createElement('input');
    inp.type = 'text';
    inp.className = 'cs-input';
    inp.placeholder = '搜索…';
    inputEl = inp;
    inp.addEventListener('keydown', function (ev) {
      if (ev.key === 'Tab')    { ev.preventDefault(); selectEngine(ev.shiftKey ? current - 1 : current + 1); return; }
      if (ev.key === 'Enter')  { ev.preventDefault(); doSearch(); return; }
      if (ev.key === 'Escape') { togglePanel(false); inp.blur(); return; }
    });

    var searchBtn = document.createElement('button');
    searchBtn.className = 'cs-search-btn';
    searchBtn.setAttribute('aria-label', '搜索');
    searchBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>';
    searchBtn.addEventListener('click', doSearch);

    pillRow.appendChild(lbl);
    pillRow.appendChild(vdiv);
    pillRow.appendChild(inp);
    pillRow.appendChild(searchBtn);

    var panel = document.createElement('div');
    panel.className = 'cs-panel';
    panelEl = panel;

    var inner = document.createElement('div');
    inner.className = 'cs-panel-inner';

    var sec1 = document.createElement('div');
    sec1.className = 'cs-section-label';
    sec1.textContent = '切换搜索引擎';

    var tagsEl = document.createElement('div');
    tagsEl.className = 'cs-tags';
    tagsEl.id = 'cs-tags';

    var hint = document.createElement('div');
    hint.className = 'cs-hint';
    hint.innerHTML = '<span class="cs-kbd">Tab</span> 切换 &nbsp;· 左右拖拽排序 &nbsp;· 右上角 ✕ 删除';

    var hdiv = document.createElement('div');
    hdiv.className = 'cs-hdivider';

    var sec2 = document.createElement('div');
    sec2.className = 'cs-section-label';
    sec2.textContent = '添加引擎';

    var addRow = document.createElement('div');
    addRow.className = 'cs-add-row';

    var nameInp = document.createElement('input');
    nameInp.type = 'text';
    nameInp.className = 'cs-add-input name';
    nameInp.placeholder = '名称';

    var urlInp = document.createElement('input');
    urlInp.type = 'text';
    urlInp.className = 'cs-add-input url';
    urlInp.placeholder = 'https://…?q=%s';

    var addBtn = document.createElement('button');
    addBtn.className = 'cs-add-btn';
    addBtn.textContent = '添加';

    var errEl = document.createElement('div');
    errEl.className = 'cs-err';
    errEl.textContent = '请填写名称，并在 URL 中包含 %s';

    addBtn.addEventListener('click', function () {
      var n = nameInp.value.trim(), u = urlInp.value.trim();
      errEl.style.display = 'none';
      if (!n || !u || u.indexOf(PLACEHOLDER) === -1) { errEl.style.display = 'block'; return; }
      engines.push({ key: 'custom_' + Date.now(), name: n, url: u });
      saveEngines();
      nameInp.value = ''; urlInp.value = '';
      renderTags();
    });

    addRow.appendChild(nameInp);
    addRow.appendChild(urlInp);
    addRow.appendChild(addBtn);

    inner.appendChild(sec1);
    inner.appendChild(tagsEl);
    inner.appendChild(hint);
    inner.appendChild(hdiv);
    inner.appendChild(sec2);
    inner.appendChild(addRow);
    inner.appendChild(errEl);
    panel.appendChild(inner);

    container.appendChild(pillRow);
    container.appendChild(panel);
    root.appendChild(container);

    document.addEventListener('click', onOutsideClick);
    document.addEventListener('pointerup', onGlobalPointerUp);

    return root;
  }

  function onOutsideClick(ev) {
    var r = document.getElementById(ROOT_ID);
    if (r && !r.contains(ev.target)) togglePanel(false);
  }
  function onGlobalPointerUp() {
    if (dragIdx !== null) { cleanupDrag(); renderTags(); }
  }

  function findAnchor() {
    return document.querySelector('.theme-input-container') ||
           document.querySelector('[class*="input-container"]') ||
           document.querySelector('[class*="input"]');
  }

  function mountBar() {
    var anchor = findAnchor();
    if (!anchor || !anchor.parentNode) return false;
    removeBar();
    var bar = buildBar();
    anchor.parentNode.insertBefore(bar, anchor.nextSibling);
    renderTags();
    return true;
  }

  function removeBar() {
    var old = document.getElementById(ROOT_ID);
    if (old) old.remove();
    document.removeEventListener('click', onOutsideClick);
    document.removeEventListener('pointerup', onGlobalPointerUp);
    cleanupDrag();
    containerEl = null; panelEl = null; labelEl = null; inputEl = null;
    isOpen = false;
  }

  function tryMount() {
    if (mountBar()) { retryCount = 0; return; }
    retryCount++;
    if (retryCount < MAX_RETRY) {
      retryTimer = setTimeout(tryMount, RETRY_INTERVAL);
    }
  }

  function register() {
    var registry = window.__tbWidgetRegistry;
    if (!registry) return;

    registry.add({
      id:    WIDGET_ID,
      label: '搜索栏',
      icon:  '🔍',
      order: 0,

      mount: function (ctx) {
        isDark = !!(ctx && ctx.dark);
        loadEngines();
        loadCurrent();
        retryCount = 0;
        injectStyle();
        setTimeout(tryMount, RENDER_DELAY);

        return {
          onDarkChange: function (dark) {
            applyDark(dark);
          },
          destroy: function () {
            if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
            removeBar();
            removeStyle();
          }
        };
      }
    });
  }

  function tryRegister() {
    if (window.__tbWidgetRegistry) {
      register();
      return;
    }
    window.addEventListener('tb-skill:master-online', function wake() {
      window.removeEventListener('tb-skill:master-online', wake);
      tryRegister();
    });
    var ob = new MutationObserver(function () {
      if (window.__tbWidgetRegistry) {
        ob.disconnect();
        tryRegister();
      }
    });
    ob.observe(document.documentElement, { childList: true, subtree: true });
  }

  function onDestroyAll() {
    window.removeEventListener('tb-skill:destroy-all', onDestroyAll);
    window.__tbCapsuleSearchLoaded = false;
  }
  window.addEventListener('tb-skill:destroy-all', onDestroyAll);
  tryRegister();

})();