(async function __tabEvaluateScriptBridge() {
  const __tabScriptArgs = null;
  const __tabOriginalFunction = (
    async function run(args) {
      'use strict';
    
      // ====== 步骤0：清除旧注入（支持热更新）======
      window.quickLinksAdded = false;
      var _oldStyle = document.getElementById('ql-style');
      if (_oldStyle) _oldStyle.remove();
      var _oldContainer = document.getElementById('ql-search-container');
      if (_oldContainer) _oldContainer.remove();
      var _oldPanel = document.getElementById('ql-engine-panel');
      if (_oldPanel) _oldPanel.remove();
      document.querySelectorAll('#ql-manage-modal, #ql-edit-modal').forEach(function(m){m.remove();});
      document.querySelectorAll('.ql-toast').forEach(function(t){t.remove();});
    
      // ====== 主逻辑 ======
      if (window.quickLinksAdded) return { ok: true, summary: '已注入过，跳过' };
      window.quickLinksAdded = true;
    
      var PLACEHOLDER = '%s';
    
      var CONFIG = {
        ENGINE_KEY: 'searchEngine',
        ENGINES_KEY: 'searchEngines_custom',
        RENDER_DELAY: 200,
        MAX_RETRY: 20,
        RETRY_INTERVAL: 500,
        DEFAULT_ENGINES: {
          baidu: { name: '百度', url: 'https://www.baidu.com/s?wd=' + PLACEHOLDER },
          bing: { name: 'Bing', url: 'https://www.bing.com/search?q=' + PLACEHOLDER },
          google: { name: 'Google', url: 'https://www.google.com/search?q=' + PLACEHOLDER },
          '360': { name: '360搜索', url: 'https://www.so.com/s?q=' + PLACEHOLDER }
        }
      };
    
      var searchContainerRef = null;
      var retryCount = 0;
      var currentEngine = 'baidu';
      var engines = {};
      var colorMap = {};
    
      var BASE_COLORS = ['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ef4444','#14b8a6','#f97316','#06b6d4'];
    
      // ---- 工具函数 ----
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
              if (!usedSet[BASE_COLORS[j]]) { assigned = BASE_COLORS[j]; break; }
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
    
      function getEngineColor(key) { return colorMap[key] || '#6366f1'; }
    
      function getEngineLabel(name) {
        if (!name) return '?';
        var first = name.charAt(0);
        if (/[\u4e00-\u9fff]/.test(first)) return name.substring(0, 2);
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
              if (migrated !== engines[key].url) { engines[key].url = migrated; needsSave = true; }
              if (engines[key].domain) { delete engines[key].domain; needsSave = true; }
            });
            if (needsSave) saveEngines();
            return;
          }
        } catch (e) {}
        engines = JSON.parse(JSON.stringify(CONFIG.DEFAULT_ENGINES));
      }
    
      function saveEngines() { try { localStorage.setItem(CONFIG.ENGINES_KEY, JSON.stringify(engines)); } catch (e) {} }
    
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
    
      function escapeHtml(str) {
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
      }
    
      function showToast(msg) {
        var toast = document.createElement('div');
        toast.className = 'ql-toast';
        toast.textContent = msg;
        toast.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#1f2937;color:#fff;padding:8px 20px;border-radius:20px;font-size:13px;z-index:999999;box-shadow:0 4px 12px rgba(0,0,0,.3);transition:opacity .3s;opacity:0;';
        document.body.appendChild(toast);
        requestAnimationFrame(function(){ toast.style.opacity = '1'; });
        setTimeout(function() { toast.style.opacity = '0'; setTimeout(function(){toast.remove();},300); }, 2000);
      }
    
      // ==================== 样式注入 ====================
      function injectStyle() {
        if (document.getElementById('ql-style')) return;
        var style = document.createElement('style');
        style.id = 'ql-style';
        style.textContent = [
          /* 容器 */
          '.ql-search-container{display:flex;align-items:center;justify-content:center;gap:13px;margin:8px auto 2px;max-width:783px;width:100%;box-sizing:border-box}',
          '.ql-search-wrapper{flex:1;position:relative;display:flex;align-items:center}',
    
          /* 圆形引擎Logo */
          '.ql-engine-logo-wrap{position:relative;flex-shrink:0;z-index:5}',
          '.ql-engine-logo{display:flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:21px;border:1px solid var(--chat-input-border,var(--intensity-6,rgba(142,142,160,.25)));background:var(--panel-bg,#fff);cursor:pointer;transition:all .2s ease;outline:none;padding:0;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;user-select:none;-webkit-user-select:none}',
          '.ql-engine-logo:hover{background:var(--intensity-6,rgba(0,0,0,.05));transform:scale(1.05)}',
          '.ql-engine-logo:active{transform:scale(.95)}',
          '.ql-engine-logo:focus-visible{border-color:#6366f1;box-shadow:0 0 0 2px rgba(99,102,241,.3)}',
          '.ql-engine-logo-text{font-size:14px;font-weight:700;line-height:1;pointer-events:none;color:#fff;letter-spacing:-.5px;text-shadow:0 1px 2px rgba(0,0,0,.15)}',
          '.ql-engine-logo-text.zh{font-size:12px;letter-spacing:0}',
    
          /* 编辑按钮（右上角小铅笔） */
          '.ql-engine-edit-badge{position:absolute;top:-4px;right:-4px;width:18px;height:18px;border-radius:50%;background:var(--panel-bg,#fff);border:1px solid var(--chat-input-border,rgba(142,142,160,.25));display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .2s ease;z-index:10;padding:0;color:var(--text-tertiary,#9ca3af);box-shadow:0 1px 3px rgba(0,0,0,.12);user-select:none;-webkit-user-select:none}',
          '.ql-engine-edit-badge:hover{background:#6366f1;color:#fff;border-color:#6366f1;transform:scale(1.1)}',
    
          /* 搜索输入框 */
          '.ql-search-input{flex:1;height:42px;border-radius:21px;border:1px solid var(--chat-input-border,var(--intensity-6,rgba(142,142,160,.25)));background:var(--panel-bg,#fff);padding:0 44px 0 16px;font-size:14px;color:var(--text-primary,#111827);outline:none;transition:all .2s ease;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;box-sizing:border-box;line-height:20px}',
          '.ql-search-input::placeholder{color:var(--text-tertiary,#9ca3af)}',
          '.ql-search-input:focus{border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,.15)}',
    
          /* 搜索按钮（右侧圆形） */
          '.ql-search-btn-wrap{position:absolute;right:2px;top:2px;z-index:5}',
          '.ql-search-btn{display:flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:19px;border:none;background:#6366f1;cursor:pointer;transition:all .15s ease;outline:none;padding:0;color:#fff}',
          '.ql-search-btn:hover{background:#5521d6;transform:scale(1.05)}',
          '.ql-search-btn:active{transform:scale(.95)}',
          '.ql-search-btn:focus-visible{box-shadow:0 0 0 2px rgba(99,102,241,.4)}',
          '.ql-search-btn svg{width:18px;height:18px;flex-shrink:0}',
    
          /* 引擎面板（弹出选择） */
          '#ql-engine-panel{position:absolute;top:48px;left:50%;transform:translateX(-50%) translateY(-8px);min-width:280px;background:var(--panel-bg,#fff);border:1px solid var(--chat-input-border,rgba(142,142,160,.25));border-radius:16px;padding:12px;box-shadow:0 12px 32px rgba(0,0,0,.18);z-index:100000;opacity:0;visibility:hidden;transition:opacity .18s ease,visibility .18s ease,transform .18s ease;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}',
          '#ql-engine-panel.ql-open{opacity:1;visibility:visible;transform:translateX(-50%) translateY(0)}',
          '.ql-panel-title{font-size:11px;font-weight:600;color:var(--text-tertiary,#9ca3af);text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px;padding:0 4px}',
          '.ql-engine-list{display:flex;flex-direction:column;gap:4px;max-height:260px;overflow-y:auto}',
          '.ql-engine-item{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:10px;cursor:pointer;transition:background .12s ease;border:1px solid transparent;user-select:none;-webkit-user-select:none}',
          '.ql-engine-item:hover{background:var(--intensity-6,rgba(0,0,0,.04))}',
          '.ql-engine-item.ql-active{background:rgba(99,102,241,.08);border-color:rgba(99,102,241,.25)}',
          '.ql-engine-dot{width:28px;height:28px;border-radius:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:12px;font-weight:700;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.15)}',
          '.ql-engine-dot.zh{font-size:10px}',
          '.ql-engine-info{flex:1;min-width:0}',
          '.ql-engine-name{font-size:13px;font-weight:600;color:var(--text-primary,#111827);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
          '.ql-engine-url{font-size:11px;color:var(--text-tertiary,#9ca3af);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px}',
          '.ql-engine-check{width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#6366f1;opacity:0;transition:opacity .15s ease}',
          '.ql-engine-item.ql-active .ql-engine-check{opacity:1}',
    
          /* 管理弹窗 */
          '#ql-manage-modal{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.45);z-index:999998;display:flex;align-items:center;justify-content:center;opacity:0;visibility:hidden;transition:opacity .25s ease,visibility .25s ease;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}',
          '#ql-manage-modal.ql-open{opacity:1;visibility:visible}',
          '.ql-modal-card{background:var(--panel-bg,#fff);border-radius:20px;width:90%;max-width:520px;max-height:80vh;display:flex;flex-direction:column;box-shadow:0 24px 64px rgba(0,0,0,.28);transform:translateY(12px);transition:transform .25s ease}',
          '#ql-manage-modal.ql-open .ql-modal-card{transform:translateY(0)}',
          '.ql-modal-header{display:flex;align-items:center;justify-content:space-between;padding:18px 22px 14px;border-bottom:1px solid var(--chat-input-border,rgba(142,142,160,.15))}',
          '.ql-modal-title{font-size:17px;font-weight:700;color:var(--text-primary,#111827)}',
          '.ql-modal-close{width:30px;height:30px;border-radius:15px;border:none;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--text-tertiary,#9ca3af);transition:all .15s ease;padding:0}',
          '.ql-modal-close:hover{background:rgba(239,68,68,.1);color:#ef4444}',
          '.ql-modal-body{flex:1;overflow-y:auto;padding:16px 22px}',
          '.ql-manage-list{display:flex;flex-direction:column;gap:8px}',
          '.ql-manage-item{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;border:1px solid var(--chat-input-border,rgba(142,142,160,.18));background:var(--panel-bg,#fff);transition:all .15s ease}',
          '.ql-manage-item:hover{border-color:rgba(99,102,241,.35)}',
          '.ql-manage-dot{width:30px;height:30px;border-radius:15px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:13px;font-weight:700;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.15)}',
          '.ql-manage-dot.zh{font-size:11px}',
          '.ql-manage-info{flex:1;min-width:0}',
          '.ql-manage-name{font-size:14px;font-weight:600;color:var(--text-primary,#111827)}',
          '.ql-manage-url{font-size:11px;color:var(--text-tertiary,#9ca3af);margin-top:2px;word-break:break-all}',
          '.ql-manage-actions{display:flex;gap:6px;flex-shrink:0}',
          '.ql-manage-btn{width:32px;height:32px;border-radius:8px;border:1px solid var(--chat-input-border,rgba(142,142,160,.2));background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .12s ease;padding:0;color:var(--text-secondary,#6b7280)}',
          '.ql-manage-btn:hover{background:var(--intensity-6,rgba(0,0,0,.04))}',
          '.ql-manage-btn.ql-danger:hover{background:rgba(239,68,68,.08);color:#ef4444;border-color:rgba(239,68,68,.3)}',
          '.ql-modal-footer{display:flex;align-items:center;justify-content:center;padding:14px 22px 18px;border-top:1px solid var(--chat-input-border,rgba(142,142,160,.15))}',
          '.ql-add-btn{display:inline-flex;align-items:center;gap:6px;padding:10px 24px;border-radius:12px;border:1px dashed var(--chat-input-border,rgba(142,142,160,.35));background:transparent;color:var(--text-secondary,#6b7280);font-size:13px;font-weight:600;cursor:pointer;transition:all .15s ease;font-family:inherit}',
          '.ql-add-btn:hover{border-color:#6366f1;color:#6366f1;background:rgba(99,102,241,.06)}',
    
          /* 编辑弹窗 */
          '#ql-edit-modal{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.45);z-index:999999;display:flex;align-items:center;justify-content:center;opacity:0;visibility:hidden;transition:opacity .25s ease,visibility .25s ease;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}',
          '#ql-edit-modal.ql-open{opacity:1;visibility:visible}',
          '.ql-edit-card{background:var(--panel-bg,#fff);border-radius:20px;width:90%;max-width:420px;box-shadow:0 24px 64px rgba(0,0,0,.28);transform:translateY(12px);transition:transform .25s ease;padding:24px}',
          '#ql-edit-modal.ql-open .ql-edit-card{transform:translateY(0)}',
          '.ql-edit-title{font-size:17px;font-weight:700;color:var(--text-primary,#111827);margin-bottom:18px}',
          '.ql-form-group{margin-bottom:16px}',
          '.ql-form-label{display:block;font-size:12px;font-weight:600;color:var(--text-secondary,#6b7280);margin-bottom:6px;text-transform:uppercase;letter-spacing:.06em}',
          '.ql-form-input{width:100%;padding:10px 14px;border-radius:10px;border:1px solid var(--chat-input-border,rgba(142,142,160,.25));background:var(--panel-bg,#fff);font-size:14px;color:var(--text-primary,#111827);outline:none;box-sizing:border-box;font-family:inherit;transition:border-color .15s ease}',
          '.ql-form-input:focus{border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,.15)}',
          '.ql-form-help{font-size:11px;color:var(--text-tertiary,#9ca3af);margin-top:4px}',
          '.ql-form-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:20px}',
          '.ql-btn{padding:9px 20px;border-radius:10px;border:none;font-size:13px;font-weight:600;cursor:pointer;transition:all .15s ease;font-family:inherit}',
          '.ql-btn-cancel{background:var(--intensity-6,rgba(0,0,0,.05));color:var(--text-secondary,#6b7280)}',
          '.ql-btn-cancel:hover{background:var(--intensity-6,rgba(0,0,0,.1))}',
          '.ql-btn-save{background:#6366f1;color:#fff}',
          '.ql-btn-save:hover{background:#5521d6}',
    
          /* 响应式 */
          '@media(max-width:600px){.ql-search-container{gap:16px;padding:0 8px}.ql-search-input{padding-right:40px}.ql-engine-logo{width:38px;height:38px;border-radius:19px}.ql-search-input{height:38px;border-radius:19px}}'
        ].join('\n');
        document.head.appendChild(style);
      }
    
      // ==================== 创建搜索容器 ====================
      function createSearchContainer() {
        var container = document.createElement('div');
        container.id = 'ql-search-container';
        container.className = 'ql-search-container';
    
        // Logo区域
        var logoWrap = document.createElement('div');
        logoWrap.className = 'ql-engine-logo-wrap';
    
        var logoBtn = document.createElement('button');
        logoBtn.className = 'ql-engine-logo';
        logoBtn.type = 'button';
        logoBtn.setAttribute('aria-label', '切换搜索引擎');
    
        var logoText = document.createElement('span');
        logoText.className = 'ql-engine-logo-text';
        logoBtn.appendChild(logoText);
        logoWrap.appendChild(logoBtn);
    
        // 编辑按钮
        var editBadge = document.createElement('button');
        editBadge.className = 'ql-engine-edit-badge';
        editBadge.type = 'button';
        editBadge.setAttribute('aria-label', '管理搜索引擎');
        editBadge.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>';
        logoWrap.appendChild(editBadge);
    
        container.appendChild(logoWrap);
    
        // 搜索框区域
        var wrapper = document.createElement('div');
        wrapper.className = 'ql-search-wrapper';
    
        var input = document.createElement('input');
        input.className = 'ql-search-input';
        input.type = 'text';
        input.setAttribute('autocomplete', 'off');
        input.setAttribute('spellcheck', 'false');
        input.setAttribute('placeholder', '搜索...');
        wrapper.appendChild(input);
    
        // 搜索按钮
        var btnWrap = document.createElement('div');
        btnWrap.className = 'ql-search-btn-wrap';
    
        var searchBtn = document.createElement('button');
        searchBtn.className = 'ql-search-btn';
        searchBtn.type = 'button';
        searchBtn.setAttribute('aria-label', '搜索');
        searchBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>';
        btnWrap.appendChild(searchBtn);
        wrapper.appendChild(btnWrap);
    
        container.appendChild(wrapper);
    
        // ==================== 引擎选择面板 ====================
        var panel = document.createElement('div');
        panel.id = 'ql-engine-panel';
        panel.innerHTML = '<div class="ql-panel-title">选择搜索引擎</div><div class="ql-engine-list"></div>';
        container.appendChild(panel);
    
        // ==================== 管理弹窗 ====================
        var manageModal = document.createElement('div');
        manageModal.id = 'ql-manage-modal';
        manageModal.innerHTML =
          '<div class="ql-modal-card">' +
            '<div class="ql-modal-header">' +
              '<span class="ql-modal-title">管理搜索引擎</span>' +
              '<button class="ql-modal-close" type="button" aria-label="关闭"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>' +
            '</div>' +
            '<div class="ql-modal-body"><div class="ql-manage-list"></div></div>' +
            '<div class="ql-modal-footer"><button class="ql-add-btn" type="button"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg> 添加引擎</button></div>' +
          '</div>';
        document.body.appendChild(manageModal);
    
        // ==================== 编辑弹窗 ====================
        var editModal = document.createElement('div');
        editModal.id = 'ql-edit-modal';
        editModal.innerHTML =
          '<div class="ql-edit-card">' +
            '<div class="ql-edit-title">编辑搜索引擎</div>' +
            '<div class="ql-form-group">' +
              '<label class="ql-form-label">名称</label>' +
              '<input class="ql-form-input" id="ql-edit-name" type="text" placeholder="如：百度" maxlength="20">' +
            '</div>' +
            '<div class="ql-form-group">' +
              '<label class="ql-form-label">搜索链接</label>' +
              '<input class="ql-form-input" id="ql-edit-url" type="text" placeholder="https://www.baidu.com/s?wd=%s">' +
              '<div class="ql-form-help">%s 会被替换为搜索关键词</div>' +
            '</div>' +
            '<div class="ql-form-actions">' +
              '<button class="ql-btn ql-btn-cancel" type="button">取消</button>' +
              '<button class="ql-btn ql-btn-save" type="button">保存</button>' +
            '</div>' +
          '</div>';
        document.body.appendChild(editModal);
    
        // ==================== 更新Logo显示 ====================
        function updateLogo() {
          var eng = engines[currentEngine];
          if (!eng) return;
          var name = eng.name || '?';
          var label = getEngineLabel(name);
          logoText.textContent = label;
          if (/[\u4e00-\u9fff]/.test(label)) {
            logoText.classList.add('zh');
          } else {
            logoText.classList.remove('zh');
          }
          logoBtn.style.background = getEngineColor(currentEngine);
          input.placeholder = (eng.name || '搜索') + ' 搜索...';
        }
    
        // ==================== 渲染引擎列表 ====================
        function renderEngineList(containerEl, onItemClick) {
          containerEl.innerHTML = '';
          var keys = Object.keys(engines);
          if (keys.length === 0) {
            containerEl.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-tertiary,#9ca3af);font-size:13px;">暂无搜索引擎，请添加</div>';
            return;
          }
          keys.forEach(function(key) {
            var eng = engines[key];
            if (!eng) return;
            var item = document.createElement('div');
            item.className = 'ql-engine-item' + (key === currentEngine ? ' ql-active' : '');
            item.dataset.key = key;
    
            var dot = document.createElement('span');
            dot.className = 'ql-engine-dot' + (/[\u4e00-\u9fff]/.test(getEngineLabel(eng.name)) ? ' zh' : '');
            dot.style.background = getEngineColor(key);
            dot.textContent = getEngineLabel(eng.name);
    
            var info = document.createElement('div');
            info.className = 'ql-engine-info';
            info.innerHTML = '<div class="ql-engine-name">' + escapeHtml(eng.name) + '</div>' +
                             '<div class="ql-engine-url">' + escapeHtml(eng.url.replace(PLACEHOLDER, '')) + '</div>';
    
            var check = document.createElement('span');
            check.className = 'ql-engine-check';
            check.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
    
            item.appendChild(dot);
            item.appendChild(info);
            item.appendChild(check);
    
            item.addEventListener('click', function() { onItemClick(key); });
            containerEl.appendChild(item);
          });
        }
    
        // ==================== 渲染管理列表 ====================
        function renderManageList() {
          var list = manageModal.querySelector('.ql-manage-list');
          renderEngineList(list, function(key) { openEditModal(key); });
        }
    
        // ==================== 面板开关 ====================
        var panelOpen = false;
        function togglePanel(forceClose) {
          if (forceClose) { panelOpen = false; }
          else { panelOpen = !panelOpen; }
          if (panelOpen) {
            var listEl = panel.querySelector('.ql-engine-list');
            renderEngineList(listEl, function(key) {
              saveEngine(key);
              updateLogo();
              togglePanel(true);
              showToast('已切换到 ' + (engines[key] ? engines[key].name : key));
            });
            panel.classList.add('ql-open');
          } else {
            panel.classList.remove('ql-open');
          }
        }
    
        // ==================== 管理弹窗开关 ====================
        function openManageModal() {
          renderManageList();
          manageModal.classList.add('ql-open');
        }
        function closeManageModal() {
          manageModal.classList.remove('ql-open');
        }
    
        // ==================== 编辑弹窗 ====================
        var editingKey = null;
        function openEditModal(key) {
          editingKey = key;
          var eng = engines[key];
          if (!eng) return;
          document.getElementById('ql-edit-name').value = eng.name || '';
          document.getElementById('ql-edit-url').value = eng.url || '';
          editModal.classList.add('ql-open');
        }
        function closeEditModal() {
          editModal.classList.remove('ql-open');
          editingKey = null;
        }
        function saveEditModal() {
          var name = (document.getElementById('ql-edit-name').value || '').trim();
          var url = (document.getElementById('ql-edit-url').value || '').trim();
          if (!name || !url) { showToast('请填写完整信息'); return; }
          url = migrateUrl(url);
          if (editingKey && engines[editingKey]) {
            engines[editingKey].name = name;
            engines[editingKey].url = url;
          } else {
            var newKey = name.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]/g, '').substring(0, 12) || ('engine_' + Date.now());
            engines[newKey] = { name: name, url: url };
            editingKey = newKey;
          }
          assignColors();
          saveEngines();
          updateLogo();
          closeEditModal();
          renderManageList();
          showToast('已保存: ' + name);
        }
    
        // ==================== 删除引擎 ====================
        function deleteEngine(key) {
          if (!engines[key]) return;
          var name = engines[key].name;
          delete engines[key];
          if (currentEngine === key) {
            var keys = Object.keys(engines);
            currentEngine = keys.length > 0 ? keys[0] : '';
            saveEngine(currentEngine);
          }
          assignColors();
          saveEngines();
          updateLogo();
          renderManageList();
          showToast('已删除: ' + name);
        }
    
        // ==================== 搜索执行 ====================
        function doSearch() {
          var query = (input.value || '').trim();
          if (!query) { input.focus(); return; }
          var eng = engines[currentEngine];
          if (!eng) { showToast('无可用搜索引擎'); return; }
          var url = eng.url.replace(PLACEHOLDER, encodeURIComponent(query));
          window.open(url, '_blank');
        }
    
        // ==================== 事件绑定 ====================
        logoBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          togglePanel();
        });
    
        editBadge.addEventListener('click', function(e) {
          e.stopPropagation();
          togglePanel(true);
          openManageModal();
        });
    
        document.addEventListener('click', function(e) {
          if (panelOpen && !panel.contains(e.target) && !logoBtn.contains(e.target) && !editBadge.contains(e.target)) {
            togglePanel(true);
          }
        });
    
        input.addEventListener('keydown', function(e) {
          if (e.key === 'Enter') { e.preventDefault(); doSearch(); }
        });
    
        searchBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          doSearch();
        });
    
        manageModal.querySelector('.ql-modal-close').addEventListener('click', closeManageModal);
        manageModal.addEventListener('click', function(e) {
          if (e.target === manageModal) closeManageModal();
        });
        manageModal.querySelector('.ql-add-btn').addEventListener('click', function() {
          editingKey = null;
          document.getElementById('ql-edit-name').value = '';
          document.getElementById('ql-edit-url').value = '';
          editModal.classList.add('ql-open');
        });
    
        editModal.querySelector('.ql-btn-cancel').addEventListener('click', closeEditModal);
        editModal.querySelector('.ql-btn-save').addEventListener('click', saveEditModal);
        editModal.addEventListener('click', function(e) {
          if (e.target === editModal) closeEditModal();
        });
    
        // Logo右键快捷切换
        logoBtn.addEventListener('contextmenu', function(e) {
          e.preventDefault();
          var nextKey = getNextEngineKey();
          saveEngine(nextKey);
          updateLogo();
          showToast('已切换: ' + (engines[nextKey] ? engines[nextKey].name : nextKey));
        });
    
        // 初始化渲染
        updateLogo();
    
        return container;
      }
    
      // ==================== 插入到多功能对话框下方 ====================
      function tryInsert(container) {
        // 核心修改：查找多功能对话框 (.theme-input-container)，在其下方插入
        var dialogBox = document.querySelector('.theme-input-container');
        if (dialogBox && dialogBox.parentNode) {
          // 在多功能对话框之后、其下一个兄弟节点之前插入
          var nextSibling = dialogBox.nextSibling;
          if (nextSibling) {
            dialogBox.parentNode.insertBefore(container, nextSibling);
          } else {
            dialogBox.parentNode.appendChild(container);
          }
          searchContainerRef = container;
          return true;
        }
    
        // 备用方案：查找主内容区
        var mainArea = document.querySelector('.theme-background') ||
                       document.querySelector('[class*="max-w-200"]') ||
                       document.querySelector('main') ||
                       document.body;
        if (mainArea) {
          mainArea.appendChild(container);
          searchContainerRef = container;
          return true;
        }
        return false;
      }
    
      // ==================== 主流程 ====================
      injectStyle();
      loadEngines();
      assignColors();
      loadEngine();
    
      var container = createSearchContainer();
    
      // 尝试插入
      if (tryInsert(container)) {
        return {
          ok: true,
          summary: '搜索引擎选择器已成功注入到多功能对话框下方',
          engine_count: Object.keys(engines).length,
          current_engine: currentEngine
        };
      }
    
      // 重试机制
      var retryTimer = setInterval(function() {
        retryCount++;
        if (tryInsert(container)) {
          clearInterval(retryTimer);
          return {
            ok: true,
            summary: '重试第' + retryCount + '次后成功注入到多功能对话框下方',
            engine_count: Object.keys(engines).length,
            current_engine: currentEngine
          };
        }
        if (retryCount >= CONFIG.MAX_RETRY) {
          clearInterval(retryTimer);
          return {
            ok: false,
            summary: '达到最大重试次数，未能找到插入点',
            retries: retryCount
          };
        }
      }, CONFIG.RETRY_INTERVAL);
    
      return {
        ok: true,
        summary: '正在尝试插入搜索引擎选择器...',
        pending: true
      };
    }
  );
  if (typeof __tabOriginalFunction !== "function") {
    throw new Error("evaluate_script source must evaluate to a function");
  }
  return await __tabOriginalFunction();
})();