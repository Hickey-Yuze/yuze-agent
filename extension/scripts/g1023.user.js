// 可直接丢给 AI 的 Prompt 模板 (接入自己的组件统一管理)

// 运行环境
//- 扩展以 Content Script 形式注入 Yuze 新标签页
//- 注入前必须检测守卫元素，确认运行环境：
//  ```js
//  if (!document.getElementById('__TAB_APP_MOUNTED_GUARD__')) return;
//  if (window.__tbBeautyLoaded) return; // 宿主主脚本已加载的标志
//  ```

// 通信协议

// 1. 等待宿主就绪后再注册
//```js
//window.addEventListener('tb-skill:master-online', () => {
//  // 在此注册主题或组件，确保宿主已初始化
//});
//```

// 2. 注册主题
//```js
//window.__tbThemeRegistry.add({
//  id: 'my-theme',       // 唯一 ID
//  label: '主题名',
//  emoji: '🌙',
//  desc: '简短描述',
//  css: `/* 全局注入的 CSS */`,
//  onApply()  { /* 激活时执行 */ },
//  onRemove() { /* 移除时执行 */ },
//});
//```

//# 3. 注册组件（Widget）
//```js
//window.__tbWidgetRegistry.add({
//  id: 'my-widget',      // 唯一 ID
//  label: '组件名',
//  icon: '🧩',
//  order: 1,             // 排列顺序，越小越靠前
//  mount({ dark }) {
//    // dark: boolean，当前是否深色模式
//    // 在此创建并插入 DOM 节点
//    const el = document.createElement('div');
//    document.querySelector('.theme-input-container')
//      ?.parentNode?.appendChild(el);

//    return {
//      onDarkChange(isDark) { /* 深色模式切换时更新 UI */ },
//      destroy() { el.remove(); /* 清理所有副作用 */ },
//    };
//  },
//  panelSections: [      // 可选：在设置面板中渲染配置 UI
//    {
//      render(container) {
//        container.innerHTML = `<div>自定义配置项</div>`;
//      }
//    }
//  ],
//});
//```

//# 4. 技能权限请求（可选）
//```js
// 发起请求
//window.dispatchEvent(new CustomEvent('tb-skill:hook', {
//  detail: { name: 'my-skill' }
//}));

// 监听结果
//window.addEventListener('tb-skill:gate-result', (e) => {
//  if (e.detail.name === 'my-skill' && e.detail.allowed) {
//    // 执行对应功能
//  }
//});
//```

// 5. 触发组件重排序（可选）
//```js
//window.dispatchEvent(new CustomEvent('tb-widget:reorder'));
//```

// 持久化存储
//- `localStorage.__tbBeautyTheme`   — 当前主题 ID（宿主管理，只读参考）
//- `localStorage.__tbActiveWidgets` — 已激活组件 ID 数组（宿主管理，只读参考）

// 开发规范
//1. 整体用 IIFE 包裹，避免污染全局：`(function(){ ... })()`
//2. `mount()` 返回的对象必须实现 `destroy()` 以防内存泄漏
//3. 所有 DOM 操作需判断元素存在性
//4. 组件挂载锚点：`.theme-input-container` 或 `[class*="input-container"]`

// 任务
//请根据以上协议，开发一个 [在此描述你的需求] 扩展。

(function () {
  'use strict';

  var NS = 'tbb-';
  var STORAGE_KEY = '__tbBeautyTheme';
  var ACTIVE_WIDGET_KEY = '__tbActiveWidgets';
  var WAIT_TIMEOUT = 10000;
  var LOG = '[TBB]';

  function log() {
    var args = Array.prototype.slice.call(arguments);
    console.log.apply(console, [LOG].concat(args));
  }
  function warn() {
    var args = Array.prototype.slice.call(arguments);
    console.warn.apply(console, [LOG].concat(args));
  }

  log('init start');

  if (!document.getElementById('__TAB_APP_MOUNTED_GUARD__')) {
    log('skip:not newtab (no guard el)');
    return;
  }
  log('guard ok');

  if (window.__tbBeautyLoaded) { log('skip:already loaded'); return; }
  window.__tbBeautyLoaded = true;

  var HOST_SELECTOR = '.bg-background.theme-background';

  function waitForHostEl(callback) {
    var el = document.querySelector(HOST_SELECTOR);
    if (el) { log('hostEl found immediately selector=' + HOST_SELECTOR); callback(el); return; }

    log('hostEl not ready, waiting... selector=' + HOST_SELECTOR);
    var timer = null;
    var obs = new MutationObserver(function () {
      var found = document.querySelector(HOST_SELECTOR);
      if (found) {
        obs.disconnect();
        clearTimeout(timer);
        log('hostEl found after mutation selector=' + HOST_SELECTOR);
        callback(found);
      }
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
    timer = setTimeout(function () {
      obs.disconnect();
      warn('timeout:hostEl never appeared selector=' + HOST_SELECTOR + ' (' + WAIT_TIMEOUT + 'ms)');
    }, WAIT_TIMEOUT);
  }

  waitForHostEl(function (hostEl) {
    log('hostEl ready, launching main | el:', hostEl);
    main(hostEl);
  });

  function main(hostEl) {

    window.__tbGate = window.__tbGate || { allow: true };

    window.addEventListener('tb-skill:hook', function (e) {
      var name = e.detail.name;
      var allowed = window.__tbGate.allow;
      log('skill:hook name=' + name + ' allowed=' + allowed);
      sessionStorage.setItem('__tbGateResult', JSON.stringify({ name: name, allowed: allowed, ts: Date.now() }));
      window.dispatchEvent(new CustomEvent('tb-skill:gate-result', { detail: { name: name, allowed: allowed } }));
      window.dispatchEvent(new CustomEvent('tb-skill:master-online'));
    });

    window.dispatchEvent(new CustomEvent('tb-skill:master-online'));
    log('tb-skill:master-online dispatched');

    function cssIn(css, id) {
      var old = document.getElementById(id);
      if (old) old.remove();
      var s = document.createElement('style');
      s.id = id; s.textContent = css;
      document.head.appendChild(s);
      log('cssIn id=' + id);
    }
    function cssOut(id) {
      var el = document.getElementById(id);
      if (el) { el.remove(); log('cssOut id=' + id); }
    }

    var darkMql = window.matchMedia ? window.matchMedia('(prefers-color-scheme:dark)') : null;
    function isDarkMode() { return darkMql ? darkMql.matches : false; }
    log('darkMode=' + isDarkMode());

    function notifyDarkChange(isDark) {
      log('darkChange isDark=' + isDark);
      activeWidgetInstances.forEach(function (inst) {
        if (inst && typeof inst.onDarkChange === 'function') {
          try { inst.onDarkChange(isDark); } catch (e) { warn('onDarkChange err', e); }
        }
      });
    }

    if (darkMql) {
      var _h = function (e) { notifyDarkChange(e.matches); };
      if (typeof darkMql.addEventListener === 'function') darkMql.addEventListener('change', _h);
      else if (typeof darkMql.addListener === 'function') darkMql.addListener(_h);
    }

    var themeList = [];
    var activeThemeId = 'default';

    window.__tbThemeRegistry = {
      add: function (cfg) {
        if (!cfg || !cfg.id) { warn('themeRegistry.add: invalid cfg', cfg); return; }
        if (!themeList.some(function (t) { return t.id === cfg.id; })) {
          themeList.push(cfg);
          log('theme added id=' + cfg.id + ' total=' + themeList.length);
          if (themeGrid) rebuildThemeGrid();
          try {
            var savedTheme = localStorage.getItem(STORAGE_KEY) || 'default';
            if (savedTheme !== 'default' && savedTheme === cfg.id && activeThemeId !== cfg.id) {
              log('theme auto-restore id=' + cfg.id);
              applyTheme(cfg.id);
            }
          } catch (e) { warn('theme auto-restore err', e); }
        } else { log('theme exists id=' + cfg.id); }
      },
      remove: function (id) {
        themeList = themeList.filter(function (t) { return t.id !== id; });
        log('theme removed id=' + id);
        if (activeThemeId === id) applyTheme('default');
        if (themeGrid) rebuildThemeGrid();
      },
      list: function () { return themeList.slice(); }
    };

    var widgetList = [];
    var activeWidgetIds = new Set();
    var activeWidgetInstances = new Map();

    function loadActiveWidgets() {
      try {
        var s = localStorage.getItem(ACTIVE_WIDGET_KEY);
        var r = s ? JSON.parse(s) : [];
        log('loadActiveWidgets:', r); return r;
      } catch (e) { warn('loadActiveWidgets err', e); return []; }
    }

    function saveActiveWidgets(arr) {
      try {
        localStorage.setItem(ACTIVE_WIDGET_KEY, JSON.stringify(arr));
        log('saveActiveWidgets:', arr);
      } catch (e) { warn('saveActiveWidgets err', e); }
    }

    function findWidgetAnchor() {
      return document.querySelector('.theme-input-container') ||
             document.querySelector('[class*="input-container"]');
    }

    function reorderMountedWidgets() {
      var anchor = findWidgetAnchor();
      if (!anchor || !anchor.parentNode) return;
      var parent = anchor.parentNode;
      var nodes = Array.from(parent.children).filter(function (el) {
        return el.dataset && el.dataset.widgetId;
      });
      if (nodes.length < 2) return;
      nodes.sort(function (a, b) {
        var wa = widgetList.find(function (w) { return w.id === a.dataset.widgetId; });
        var wb = widgetList.find(function (w) { return w.id === b.dataset.widgetId; });
        var oa = (wa && wa.order != null) ? wa.order : 99;
        var ob = (wb && wb.order != null) ? wb.order : 99;
        return oa - ob;
      });
      var ref = anchor.nextSibling;
      nodes.forEach(function (node) {
        parent.insertBefore(node, ref);
        ref = node.nextSibling;
      });
      log('reorderMountedWidgets done');
    }

    function activateWidget(id) {
      if (!id || activeWidgetIds.has(id)) { if (id) log('widget already active id=' + id); return; }
      var cfg = widgetList.find(function (w) { return w.id === id; });
      if (!cfg) { warn('activateWidget: cfg not found id=' + id); return; }
      activeWidgetIds.add(id);
      if (typeof cfg.mount === 'function') {
        try {
          var inst = cfg.mount({ dark: isDarkMode() }) || null;
          activeWidgetInstances.set(id, inst);
          log('widget mounted id=' + id + ' inst=' + (inst ? 'ok' : 'null'));
          reorderMountedWidgets();
        } catch (e) {
          warn('widget mount err id=' + id, e);
          activeWidgetIds.delete(id);
        }
      }
      rebuildWidgetSection();
    }

    function deactivateWidget(id) {
      if (!id) return;
      var inst = activeWidgetInstances.get(id);
      if (inst && typeof inst.destroy === 'function') {
        try { inst.destroy(); log('widget destroyed id=' + id); } catch (e) { warn('widget destroy err', e); }
      }
      activeWidgetInstances.delete(id);
      activeWidgetIds.delete(id);
      log('widget deactivated id=' + id);
      rebuildWidgetSection();
    }

    window.__tbWidgetRegistry = {
      add: function (cfg) {
        if (!cfg || !cfg.id) { warn('widgetRegistry.add: invalid cfg', cfg); return; }
        if (!widgetList.some(function (w) { return w.id === cfg.id; })) {
          widgetList.push(cfg);
          log('widget registered id=' + cfg.id + ' total=' + widgetList.length);
          if (widgetSection) rebuildWidgetSection();
          var savedIds = loadActiveWidgets();
          if (savedIds.indexOf(cfg.id) > -1 && !activeWidgetIds.has(cfg.id)) {
            log('registry.add auto-activate id=' + cfg.id);
            activateWidget(cfg.id);
          }
        } else { log('widget exists id=' + cfg.id); }
      },
      remove: function (id) {
        widgetList = widgetList.filter(function (w) { return w.id !== id; });
        if (activeWidgetIds.has(id)) deactivateWidget(id);
        if (widgetSection) rebuildWidgetSection();
        log('widget unregistered id=' + id);
      },
      list: function () { return widgetList.slice(); }
    };

    var decorEls = [], leafRaf = null;
    function removeDecorations() {
      var n = decorEls.length;
      decorEls.forEach(function (el) { if (el && el.parentNode) el.remove(); });
      decorEls = [];
      if (leafRaf) { cancelAnimationFrame(leafRaf); leafRaf = null; }
      if (n) log('decorations removed n=' + n);
    }

    function applyTheme(id) {
      log('applyTheme id=' + id + ' prev=' + activeThemeId);
      var oldTheme = themeList.find(function (t) { return t.id === activeThemeId; });
      if (oldTheme && typeof oldTheme.onRemove === 'function') {
        try { oldTheme.onRemove(); } catch (e) { warn('theme onRemove err', e); }
      }
      cssOut(NS + 'theme-css'); removeDecorations();
      var theme = themeList.find(function (t) { return t.id === id; });
      activeThemeId = theme ? theme.id : 'default';
      if (theme && theme.css) cssIn(theme.css, NS + 'theme-css');
      if (theme && typeof theme.onApply === 'function') {
        try { theme.onApply(); } catch (e) { warn('theme onApply err', e); }
      }
      try { localStorage.setItem(STORAGE_KEY, activeThemeId); } catch (e) { warn('theme save err', e); }
      if (themeGrid) {
        themeGrid.querySelectorAll('.' + NS + 'theme-card').forEach(function (c) {
          c.classList.toggle(NS + 'theme-active', c.dataset.id === activeThemeId);
        });
      }
      updateRestoreBtn();
      log('applyTheme done active=' + activeThemeId);
    }

    var entryBtn, drawer, overlay, themeGrid, restoreBtn, widgetSection, drawerOpen = false;

    function updateRestoreBtn() {
      if (!restoreBtn) return;
      restoreBtn.style.display = (activeThemeId !== 'default') ? '' : 'none';
    }

    function rebuildThemeGrid() {
      if (!themeGrid) return;
      themeGrid.innerHTML = '';
      if (themeList.length === 0) {
        var e = document.createElement('div');
        e.className = NS + 'theme-empty'; e.textContent = '暂无主题';
        themeGrid.appendChild(e); log('themeGrid: empty'); return;
      }
      themeList.forEach(function (theme) {
        var card = document.createElement('div');
        card.className = NS + 'theme-card' + (theme.id === activeThemeId ? ' ' + NS + 'theme-active' : '');
        card.dataset.id = theme.id;
        card.innerHTML =
          '<span class="' + NS + 'tc-emoji">' + (theme.emoji || '🎨') + '</span>' +
          '<span class="' + NS + 'tc-label">' + theme.label + '</span>' +
          '<span class="' + NS + 'tc-desc">' + (theme.desc || '') + '</span>';
        card.addEventListener('click', function () { applyTheme(theme.id); });
        themeGrid.appendChild(card);
      });
      log('themeGrid rebuilt n=' + themeList.length);
    }

    function rebuildWidgetSection() {
      if (!widgetSection) return;
      widgetSection.innerHTML = '';
      if (widgetList.length === 0) {
        var e = document.createElement('div');
        e.className = NS + 'theme-empty'; e.textContent = '暂无扩展';
        widgetSection.appendChild(e); log('widgetSection: empty'); return;
      }
      var savedIds = loadActiveWidgets();
      var sorted = widgetList.slice().sort(function (a, b) {
        var oa = a.order != null ? a.order : 99;
        var ob = b.order != null ? b.order : 99;
        return oa - ob;
      });
      sorted.forEach(function (w) {
        var isActive = savedIds.indexOf(w.id) > -1;
        var row = document.createElement('div'); row.className = NS + 'widget-row';
        var info = document.createElement('div'); info.className = NS + 'widget-info';
        var icon = document.createElement('span'); icon.className = NS + 'widget-icon'; icon.textContent = w.icon || '🧩';
        var label = document.createElement('span'); label.className = NS + 'widget-label'; label.textContent = w.label || w.id;
        info.appendChild(icon); info.appendChild(label);
        var toggle = document.createElement('div');
        toggle.className = NS + 'widget-toggle' + (isActive ? ' ' + NS + 'widget-toggle-on' : '');
        toggle.addEventListener('click', function () {
          var current = loadActiveWidgets();
          var idx = current.indexOf(w.id);
          if (idx > -1) {
            current.splice(idx, 1);
            saveActiveWidgets(current);
            log('widget toggle OFF id=' + w.id);
            deactivateWidget(w.id);
          } else {
            current.push(w.id);
            saveActiveWidgets(current);
            log('widget toggle ON id=' + w.id);
            activateWidget(w.id);
          }
        });
        row.appendChild(info); row.appendChild(toggle); widgetSection.appendChild(row);
        if (isActive && w.panelSections && Array.isArray(w.panelSections)) {
          w.panelSections.forEach(function (ps) {
            var sub = document.createElement('div'); sub.className = NS + 'widget-sub';
            if (typeof ps.render === 'function') {
              try { ps.render(sub); } catch (e) { warn('panelSection render err id=' + w.id, e); }
            }
            widgetSection.appendChild(sub);
          });
        }
      });
      log('widgetSection rebuilt n=' + widgetList.length + ' savedActive=' + savedIds.length);
    }

    function buildDrawer() {
      overlay = document.createElement('div');
      overlay.id = NS + 'overlay';
      overlay.addEventListener('click', closeDrawer);

      drawer = document.createElement('div');
      drawer.id = NS + 'drawer';
      drawer.addEventListener('click', function (e) { e.stopPropagation(); });

      var header = document.createElement('div'); header.id = NS + 'header';
      var titleSpan = document.createElement('span'); titleSpan.id = NS + 'header-title'; titleSpan.textContent = '🎨自定义面板';
      var closeBtn = document.createElement('button'); closeBtn.id = NS + 'close-btn'; closeBtn.textContent = '✕';
      closeBtn.addEventListener('click', closeDrawer);
      header.appendChild(titleSpan); header.appendChild(closeBtn);

      var secTheme = buildSection('🎨 主题', function (body) {
        body.style.cssText = 'height:220px;overflow-y:auto;padding:0 14px 12px;';
        themeGrid = document.createElement('div'); themeGrid.id = NS + 'theme-grid';
        rebuildThemeGrid(); body.appendChild(themeGrid);
      });

      restoreBtn = document.createElement('div'); restoreBtn.id = NS + 'restore-row';
      var rBtn = document.createElement('button'); rBtn.id = NS + 'restore-btn'; rBtn.textContent = '↩ 恢复默认';
      rBtn.addEventListener('click', function () { log('restoreBtn click'); applyTheme('default'); });
      restoreBtn.appendChild(rBtn);

      var secWidget = buildSection('🧩 扩展', function (body) {
        body.style.cssText = 'padding:0 14px 12px;';
        widgetSection = document.createElement('div'); widgetSection.id = NS + 'widget-list';
        rebuildWidgetSection(); body.appendChild(widgetSection);
      });

      var scrollBody = document.createElement('div'); scrollBody.id = NS + 'scroll-body';
      scrollBody.appendChild(secTheme); scrollBody.appendChild(restoreBtn); scrollBody.appendChild(secWidget);
      drawer.appendChild(header); drawer.appendChild(scrollBody);
      document.body.appendChild(overlay); document.body.appendChild(drawer);
      updateRestoreBtn();
      log('drawer built');
    }

    function buildSection(title, contentFn) {
      var sec = document.createElement('div'); sec.className = NS + 'section';
      var head = document.createElement('div'); head.className = NS + 'section-head';
      var titleEl = document.createElement('span'); titleEl.className = NS + 'section-title'; titleEl.textContent = title;
      var arrow = document.createElement('span'); arrow.className = NS + 'section-arrow'; arrow.textContent = '▾';
      head.appendChild(titleEl); head.appendChild(arrow);
      var body = document.createElement('div'); body.className = NS + 'section-body';
      contentFn(body);
      var collapsed = false;
      head.addEventListener('click', function () {
        collapsed = !collapsed;
        body.style.display = collapsed ? 'none' : '';
        arrow.style.transform = collapsed ? 'rotate(-90deg)' : '';
        log('section toggle "' + title + '" collapsed=' + collapsed);
      });
      sec.appendChild(head); sec.appendChild(body);
      return sec;
    }

    function buildEntryBtn() {
      entryBtn = document.createElement('button');
      entryBtn.id = NS + 'entry-btn';
      entryBtn.title = '自定义面板';
      entryBtn.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
          '<circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/>' +
          '<circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/>' +
          '<circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/>' +
          '<circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/>' +
          '<path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>' +
        '</svg>';
      entryBtn.addEventListener('click', function () {
        log('entryBtn click drawerOpen=' + drawerOpen);
        toggleDrawer();
      });
      hostEl.appendChild(entryBtn);
      log('entryBtn appended to hostEl');
    }

    function toggleDrawer() { drawerOpen ? closeDrawer() : openDrawer(); }
    function openDrawer() {
      drawerOpen = true;
      drawer.classList.add(NS + 'open');
      overlay.classList.add(NS + 'open');
      entryBtn.classList.add(NS + 'active');
      rebuildWidgetSection();
      log('drawer opened');
    }
    function closeDrawer() {
      drawerOpen = false;
      drawer.classList.remove(NS + 'open');
      overlay.classList.remove(NS + 'open');
      entryBtn.classList.remove(NS + 'active');
      log('drawer closed');
    }

    function injectPanelCSS() {
      cssIn(
        '#' + NS + 'entry-btn{' +
          'position:fixed;left:14px;bottom:14px;z-index:2147483646;' +
          'width:36px;height:36px;border-radius:50%;' +
          'background:linear-gradient(135deg,#3b82f6 0%,#2563eb 100%);' +
          'color:#fff;display:flex;align-items:center;justify-content:center;' +
          'cursor:pointer;user-select:none;border:none;outline:none;padding:0;' +
          'box-shadow:0 2px 10px rgba(59,130,246,0.45);' +
          'transition:transform .2s,box-shadow .2s,opacity .2s;will-change:transform;' +
        '}' +
        '#' + NS + 'entry-btn:hover{transform:scale(1.1);box-shadow:0 4px 16px rgba(59,130,246,0.55);}' +
        '#' + NS + 'entry-btn.' + NS + 'active{opacity:0.5;pointer-events:none;transform:scale(0.95);}' +
        '#' + NS + 'entry-btn svg{display:block;flex-shrink:0;}' +
        '#' + NS + 'overlay{position:fixed;inset:0;z-index:2147483644;background:rgba(0,0,0,0);pointer-events:none;transition:background .3s;}' +
        '#' + NS + 'overlay.' + NS + 'open{background:rgba(0,0,0,0.3);pointer-events:auto;}' +
        '#' + NS + 'drawer{position:fixed;left:0;top:0;height:100vh;width:clamp(260px,24vw,340px);z-index:2147483645;display:flex;flex-direction:column;background:#ffffff;border-right:1px solid rgba(0,0,0,0.08);transform:translateX(-100%);transition:transform .32s cubic-bezier(.4,0,.2,1);overflow:hidden;}' +
        '#' + NS + 'drawer.' + NS + 'open{transform:translateX(0);}' +
        '#' + NS + 'header{display:flex;align-items:center;justify-content:space-between;padding:16px 16px 12px;flex-shrink:0;border-bottom:1px solid rgba(0,0,0,0.07);}' +
        '#' + NS + 'header-title{font-size:14px;font-weight:700;color:#1e293b;letter-spacing:.3px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}' +
        '#' + NS + 'close-btn{background:none;border:none;cursor:pointer;width:26px;height:26px;border-radius:6px;font-size:12px;color:#94a3b8;display:flex;align-items:center;justify-content:center;transition:background .15s,color .15s;font-family:inherit;}' +
        '#' + NS + 'close-btn:hover{background:rgba(239,68,68,0.08);color:#ef4444;}' +
        '#' + NS + 'scroll-body{flex:1;overflow-y:auto;min-height:0;scrollbar-width:thin;scrollbar-color:rgba(0,0,0,0.12) transparent;}' +
        '#' + NS + 'scroll-body::-webkit-scrollbar{width:4px;}' +
        '#' + NS + 'scroll-body::-webkit-scrollbar-track{background:transparent;}' +
        '#' + NS + 'scroll-body::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.12);border-radius:2px;}' +
        '.' + NS + 'section{flex-shrink:0;}' +
        '.' + NS + 'section-head{display:flex;align-items:center;justify-content:space-between;padding:12px 16px 8px;cursor:pointer;user-select:none;}' +
        '.' + NS + 'section-head:hover .' + NS + 'section-title{color:#3b82f6;}' +
        '.' + NS + 'section-title{font-size:11px;font-weight:600;color:#94a3b8;letter-spacing:.8px;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}' +
        '.' + NS + 'section-arrow{font-size:10px;color:#cbd5e1;transition:transform .2s;}' +
        '.' + NS + 'section-body{overflow-y:auto;}' +
        '.' + NS + 'section-body::-webkit-scrollbar{width:3px;}' +
        '.' + NS + 'section-body::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.10);border-radius:2px;}' +
        '#' + NS + 'theme-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:7px;padding-top:4px;}' +
        '.' + NS + 'theme-empty{grid-column:1/-1;text-align:center;font-size:12px;color:#cbd5e1;padding:24px 0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}' +
        '.' + NS + 'theme-card{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;padding:10px 6px;border-radius:8px;cursor:pointer;background:rgba(0,0,0,0.03);border:1.5px solid rgba(0,0,0,0.06);transition:background .15s,border-color .15s,transform .15s;user-select:none;text-align:center;}' +
        '.' + NS + 'theme-card:hover{background:rgba(59,130,246,0.06);border-color:rgba(59,130,246,0.25);transform:translateY(-1px);}' +
        '.' + NS + 'theme-card.' + NS + 'theme-active{background:rgba(59,130,246,0.10);border-color:#3b82f6;}' +
        '.' + NS + 'tc-emoji{font-size:18px;line-height:1;}' +
        '.' + NS + 'tc-label{font-size:11px;font-weight:600;color:#334155;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}' +
        '.' + NS + 'tc-desc{font-size:10px;color:#94a3b8;line-height:1.3;}' +
        '#' + NS + 'restore-row{padding:10px 14px 16px;flex-shrink:0;}' +
        '#' + NS + 'restore-btn{width:100%;padding:8px;border-radius:7px;border:1px solid rgba(0,0,0,0.08);background:transparent;color:#94a3b8;font-size:12px;font-weight:500;cursor:pointer;letter-spacing:.03em;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;transition:background .15s,color .15s,border-color .15s;}' +
        '#' + NS + 'restore-btn:hover{background:rgba(239,68,68,0.06);color:#ef4444;border-color:rgba(239,68,68,0.20);}' +
        '#' + NS + 'widget-list{display:flex;flex-direction:column;gap:6px;padding-top:4px;}' +
        '.' + NS + 'widget-row{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-radius:8px;background:rgba(0,0,0,0.03);border:1.5px solid rgba(0,0,0,0.06);}' +
        '.' + NS + 'widget-info{display:flex;align-items:center;gap:8px;}' +
        '.' + NS + 'widget-icon{font-size:16px;line-height:1;}' +
        '.' + NS + 'widget-label{font-size:12px;font-weight:600;color:#334155;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}' +
        '.' + NS + 'widget-toggle{position:relative;width:36px;height:20px;border-radius:10px;background:#e2e8f0;cursor:pointer;transition:background .2s;flex-shrink:0;}' +
        '.' + NS + 'widget-toggle::after{content:"";position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;transition:transform .2s;box-shadow:0 1px 3px rgba(0,0,0,0.15);}' +
        '.' + NS + 'widget-toggle-on{background:#3b82f6;}' +
        '.' + NS + 'widget-toggle-on::after{transform:translateX(16px);}' +
        '.' + NS + 'widget-sub{margin-top:4px;padding:10px 12px;border-radius:8px;background:rgba(59,130,246,0.04);border:1.5px solid rgba(59,130,246,0.12);}' +
        '@media(prefers-color-scheme:dark){' +
          '#' + NS + 'entry-btn{box-shadow:0 2px 10px rgba(59,130,246,0.30);}' +
          '#' + NS + 'drawer{background:#0f172a;border-right:1px solid rgba(255,255,255,0.07);}' +
          '#' + NS + 'header{border-bottom:1px solid rgba(255,255,255,0.07);}' +
          '#' + NS + 'header-title{color:#e2e8f0;}' +
          '#' + NS + 'close-btn{color:#64748b;}' +
          '#' + NS + 'close-btn:hover{background:rgba(239,68,68,0.12);color:#f87171;}' +
          '#' + NS + 'scroll-body{scrollbar-color:rgba(255,255,255,0.10) transparent;}' +
          '#' + NS + 'scroll-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.10);}' +
          '.' + NS + 'section-head:hover .' + NS + 'section-title{color:#60a5fa;}' +
          '.' + NS + 'section-title{color:#475569;}' +
          '.' + NS + 'section-arrow{color:#475569;}' +
          '.' + NS + 'section-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);}' +
          '.' + NS + 'theme-empty{color:#475569;}' +
          '.' + NS + 'theme-card{background:rgba(255,255,255,0.04);border-color:rgba(255,255,255,0.07);}' +
          '.' + NS + 'theme-card:hover{background:rgba(59,130,246,0.10);border-color:rgba(59,130,246,0.35);}' +
          '.' + NS + 'theme-card.' + NS + 'theme-active{background:rgba(59,130,246,0.16);border-color:#3b82f6;}' +
          '.' + NS + 'tc-label{color:#cbd5e1;}' +
          '.' + NS + 'tc-desc{color:#64748b;}' +
          '#' + NS + 'restore-btn{background:transparent;border-color:rgba(255,255,255,0.08);color:#64748b;}' +
          '#' + NS + 'restore-btn:hover{background:rgba(239,68,68,0.10);color:#f87171;border-color:rgba(239,68,68,0.22);}' +
          '#' + NS + 'overlay.' + NS + 'open{background:rgba(0,0,0,0.5);}' +
          '.' + NS + 'widget-row{background:rgba(255,255,255,0.04);border-color:rgba(255,255,255,0.07);}' +
          '.' + NS + 'widget-label{color:#cbd5e1;}' +
          '.' + NS + 'widget-toggle{background:#334155;}' +
          '.' + NS + 'widget-toggle-on{background:#3b82f6;}' +
          '.' + NS + 'widget-sub{background:rgba(59,130,246,0.08);border-color:rgba(59,130,246,0.20);color:#94a3b8;}' +
        '}',
        NS + 'panel-styles'
      );
    }

    var domObs = new MutationObserver(function () {
      if (entryBtn && !hostEl.contains(entryBtn)) {
        hostEl.appendChild(entryBtn); log('obs: entryBtn re-appended');
      }
      if (drawer && !document.body.contains(drawer)) {
        document.body.appendChild(drawer); log('obs: drawer re-appended');
      }
      if (overlay && !document.body.contains(overlay)) {
        document.body.appendChild(overlay); log('obs: overlay re-appended');
      }
    });
    domObs.observe(document.documentElement, { childList: true });

    injectPanelCSS();
    buildEntryBtn();
    buildDrawer();

    window.addEventListener('tb-widget:reorder', function () {
      reorderMountedWidgets();
      log('tb-widget:reorder received, reordered');
    });
    log('main() done');
  }
})();