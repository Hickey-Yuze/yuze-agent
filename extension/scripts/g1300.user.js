(function () {
  'use strict';

  /* =========================
   *  全局防重复执行
   * ========================= */
  if (window.__QL_PROD_LOADED__) return;
  window.__QL_PROD_LOADED__ = true;

  /* =========================
   *  配置区
   * ========================= */
  const CONFIG = {
    STORAGE_KEY: 'quickLinksConfig',

    BTN_COUNT: 8,
    RENDER_DELAY: 200,

    // ✅ 唯一、严格的目标锚点（页面身份）
    TARGET_SELECTOR:
      'div.flex.flex-col.transition-all.duration-300.ease-in-out.mb-4.rounded-[28px]' +
      '.border.border-[var(--chat-input-border)]' +
      '.shadow-[0px_20px_50px_0px_var(--input-shadow)]' +
      '.w-full.overflow-visible.relative.theme-input-container' +
      '.bg-[var(--panel-bg)]',

    DEFAULT_LINKS: [
      { id: 1, name: 'Google', url: 'https://www.google.com', icon: '🔍' },
      { id: 2, name: 'GitHub', url: 'https://github.com', icon: '💻' },
      { id: 3, name: 'YouTube', url: 'https://www.youtube.com', icon: '📺' },
      { id: 4, name: 'Gmail', url: 'https://mail.google.com', icon: '📧' },
      { id: 5, name: '', url: '', icon: '' },
      { id: 6, name: '', url: '', icon: '' },
      { id: 7, name: '', url: '', icon: '' },
      { id: 8, name: '', url: '', icon: '' }
    ],

    EMOJIS: ['🌐','📁','💬','📧','📊','🎯','🏠','💼','📱','🎮','🛒','🎨','📚','🔍','⚙️','🚀']
  };

  /* =========================
   *  内部状态
   * ========================= */
  let containerRef = null;
  let configCache = null;
  let observer = null;

  /* =========================
   *  页面 Guard（最关键）
   * ========================= */
  function getAnchor() {
    return document.querySelector(CONFIG.TARGET_SELECTOR);
  }

  if (!getAnchor()) {
    // 🚫 不在目标页面，彻底退出
    return;
  }

  /* =========================
   *  配置管理
   * ========================= */
  function createDefaultConfig() {
    return Array.from({ length: CONFIG.BTN_COUNT }, (_, i) => {
      const d = CONFIG.DEFAULT_LINKS[i] || {};
      return {
        id: i + 1,
        name: d.name || '',
        url: d.url || '',
        icon: d.icon || ''
      };
    });
  }

  function loadConfig() {
    if (configCache) return configCache;
    try {
      const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
      configCache = raw ? JSON.parse(raw) : createDefaultConfig();
    } catch {
      configCache = createDefaultConfig();
    }
    return configCache;
  }

  function saveConfig(next) {
    configCache = next;
    try {
      localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(next));
    } catch {}
  }

  function isConfigured(item) {
    return !!(item && item.url);
  }

  /* =========================
   *  样式（只注入一次）
   * ========================= */
  function injectStyle() {
    if (document.getElementById('ql-style-prod')) return;

    const style = document.createElement('style');
    style.id = 'ql-style-prod';
    style.textContent = `
      .ql-container {
        display: flex;
        gap: 14px;
        margin: 12px auto;
        justify-content: center;
      }
      .ql-btn {
        width: 80px;
        height: 80px;
        border-radius: 18px;
        border: 1px solid rgba(120,120,140,.2);
        background: rgba(255,255,255,.75);
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        transition: .2s;
      }
      .ql-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 18px rgba(0,0,0,.12);
      }
      .ql-icon { font-size: 22px; }
      .ql-name {
        font-size: 10px;
        margin-top: 4px;
        color: #6b7280;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    `;
    document.head.appendChild(style);
  }

  /* =========================
   *  渲染
   * ========================= */
  function render() {
    const anchor = getAnchor();
    if (!anchor) return;

    if (containerRef && containerRef.isConnected) {
      containerRef.remove();
    }

    const container = document.createElement('div');
    container.className = 'ql-container';

    const config = loadConfig();
    config.forEach(item => {
      const btn = document.createElement('button');
      btn.className = 'ql-btn';
      btn.type = 'button';

      if (isConfigured(item)) {
        btn.innerHTML = `
          <div class="ql-icon">${item.icon || '🌐'}</div>
          <div class="ql-name">${item.name || '未命名'}</div>
        `;
        btn.onclick = () => window.open(item.url, '_blank', 'noopener');
      } else {
        btn.textContent = '+';
      }

      container.appendChild(btn);
    });

    anchor.insertAdjacentElement('afterend', container);
    containerRef = container;
  }

  /* =========================
   *  SPA 稳定监听（生产级）
   * ========================= */
  function observeAnchor() {
    if (observer) observer.disconnect();

    observer = new MutationObserver(() => {
      if (!getAnchor()) {
        if (containerRef) {
          containerRef.remove();
          containerRef = null;
        }
        return;
      }
      if (!containerRef || !containerRef.isConnected) {
        render();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /* =========================
   *  初始化
   * ========================= */
  function init() {
    injectStyle();
    setTimeout(render, CONFIG.RENDER_DELAY);
    observeAnchor();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

})();(function () {
  'use strict';

  if (window.quickLinksAdded) return;
  window.quickLinksAdded = true;

  const CONFIG = {
    STORAGE_KEY: 'quickLinksConfig',
    CONTAINER_WIDTH: 783.1,
    BTN_COUNT: 8,
    BTN_SIZE: 80,
    RADIUS: 24,
    RENDER_DELAY: 200,
    MAX_RETRY: 20,
    RETRY_INTERVAL: 500,

    // 可直接在这里修改默认快捷方式
    DEFAULT_LINKS: [
      { id: 1, name: 'Google', url: 'https://www.google.com', icon: '🔍' },
      { id: 2, name: 'GitHub', url: 'https://github.com', icon: '💻' },
      { id: 3, name: 'YouTube', url: 'https://www.youtube.com', icon: '📺' },
      { id: 4, name: 'Gmail', url: 'https://mail.google.com', icon: '📧' },
      { id: 5, name: '', url: '', icon: '' },
      { id: 6, name: '', url: '', icon: '' },
      { id: 7, name: '', url: '', icon: '' },
      { id: 8, name: '', url: '', icon: '' }
    ],

    EMOJIS: ['🌐', '📁', '💬', '📧', '📊', '🎯', '🏠', '💼', '📱', '🎮', '🛒', '🎨', '📚', '🔍', '⚙️', '🚀', '💡', '🎵', '📷', '❤️']
  };

  const GAP = (CONFIG.CONTAINER_WIDTH - CONFIG.BTN_COUNT * CONFIG.BTN_SIZE) / (CONFIG.BTN_COUNT - 1);

  let configCache = null;
  let containerRef = null;
  let retryCount = 0;

  function createDefaultConfig() {
    return Array.from({ length: CONFIG.BTN_COUNT }, (_, i) => {
      const item = CONFIG.DEFAULT_LINKS[i] || {};
      return {
        id: i + 1,
        name: item.name || '',
        url: item.url || '',
        icon: item.icon || ''
      };
    });
  }

  function normalizeConfig(data) {
    const defaults = createDefaultConfig();
    if (!Array.isArray(data)) return defaults;

    return defaults.map((def, i) => {
      const item = data[i] || {};
      return {
        id: def.id,
        name: typeof item.name === 'string' ? item.name : def.name,
        url: typeof item.url === 'string' ? item.url : def.url,
        icon: typeof item.icon === 'string' ? item.icon : def.icon
      };
    });
  }

  function loadConfig() {
    if (configCache) return configCache;

    try {
      const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
      configCache = raw ? normalizeConfig(JSON.parse(raw)) : createDefaultConfig();
    } catch {
      configCache = createDefaultConfig();
    }
    return configCache;
  }

  function saveConfig(nextConfig) {
    configCache = normalizeConfig(nextConfig);
    try {
      localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(configCache));
      return true;
    } catch {
      return false;
    }
  }

  function isConfigured(item) {
    return !!(item && item.url && item.url.trim());
  }

  function isValidUrl(url) {
    try {
      const u = new URL(url);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (m) {
      return ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      })[m];
    });
  }

  function injectStyle() {
    if (document.getElementById('ql-style')) return;

    const style = document.createElement('style');
    style.id = 'ql-style';
    style.textContent = `
      .ql-container {
        display: flex;
        gap: ${GAP}px;
        margin: 10px auto 12px;
        width: ${CONFIG.CONTAINER_WIDTH}px;
        box-sizing: border-box;
        justify-content: center;
        align-items: center;
      }
      .ql-btn {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: ${CONFIG.BTN_SIZE}px;
        height: ${CONFIG.BTN_SIZE}px;
        border-radius: ${CONFIG.RADIUS}px;
        border: 1px solid rgba(142,142,160,0.2);
        background: rgba(255,255,255,0.7);
        cursor: pointer;
        transition: all 0.2s cubic-bezier(.4,0,.2,1);
        padding: 6px 4px;
        box-sizing: border-box;
        flex-shrink: 0;
        overflow: hidden;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        outline: none;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      .ql-btn:hover {
        background: rgba(255,255,255,0.95);
        border-color: rgba(99,102,241,0.4);
        box-shadow: 0 4px 16px rgba(99,102,241,0.12);
        transform: translateY(-2px);
      }
      .ql-btn:active {
        transform: translateY(0);
        box-shadow: 0 1px 4px rgba(0,0,0,0.08);
      }
      .ql-btn.configured {
        border-color: rgba(99,102,241,0.25);
        background: rgba(238,240,255,0.6);
      }
      .ql-btn.configured:hover {
        border-color: rgba(99,102,241,0.5);
        background: rgba(238,240,255,0.9);
      }
      .ql-btn .ql-icon {
        font-size: 22px;
        line-height: 1;
        margin-bottom: 4px;
      }
      .ql-btn .ql-plus {
        font-size: 26px;
        color: #b0b4c0;
        font-weight: 300;
        line-height: 1;
      }
      .ql-btn .ql-name {
        font-size: 10px;
        color: #6b7280;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
        text-align: center;
        line-height: 1.2;
      }
      .ql-btn .ql-edit {
        position: absolute;
        top: 4px;
        right: 8px;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: rgba(0,0,0,0.06);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 9px;
        color: #9ca3af;
        opacity: 0;
        transition: opacity 0.15s;
        pointer-events: auto;
        z-index: 2;
      }
      .ql-btn:hover .ql-edit {
        opacity: 1;
      }
      .ql-edit:hover {
        background: rgba(99,102,241,0.15) !important;
        color: #6366f1 !important;
      }

      .ql-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.4);
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 99999;
        animation: ql-fadeIn 0.15s ease;
      }
      @keyframes ql-fadeIn { from { opacity: 0 } to { opacity: 1 } }
      @keyframes ql-slideUp { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: translateY(0) } }

      .ql-modal {
        background: #fff;
        border-radius: 20px;
        padding: 28px 28px 20px;
        width: 380px;
        max-width: 90vw;
        box-shadow: 0 24px 80px rgba(0,0,0,0.2);
        animation: ql-slideUp 0.2s ease;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      .ql-modal h3 {
        margin: 0 0 20px;
        font-size: 16px;
        font-weight: 600;
        color: #1f2937;
        text-align: center;
      }
      .ql-modal label {
        display: block;
        font-size: 12px;
        font-weight: 500;
        color: #6b7280;
        margin-bottom: 6px;
      }
      .ql-modal input[type="text"] {
        width: 100%;
        padding: 10px 14px;
        border: 1.5px solid #e5e7eb;
        border-radius: 12px;
        font-size: 14px;
        outline: none;
        transition: border-color 0.15s;
        box-sizing: border-box;
        background: #fafbfc;
        margin-bottom: 14px;
      }
      .ql-modal input[type="text"]:focus {
        border-color: #6366f1;
        background: #fff;
      }
      .ql-emoji-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 14px;
      }
      .ql-emoji-opt {
        width: 36px;
        height: 36px;
        border-radius: 10px;
        border: 1.5px solid transparent;
        background: #f3f4f6;
        cursor: pointer;
        font-size: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.12s;
      }
      .ql-emoji-opt:hover {
        background: #e0e7ff;
        border-color: #a5b4fc;
      }
      .ql-emoji-opt.selected {
        background: #e0e7ff;
        border-color: #6366f1;
      }
      .ql-modal-actions {
        display: flex;
        gap: 10px;
        margin-top: 20px;
      }
      .ql-modal-actions button {
        flex: 1;
        padding: 10px 0;
        border-radius: 12px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s;
        border: none;
      }
      .ql-modal-actions .ql-cancel {
        background: #f3f4f6;
        color: #6b7280;
      }
      .ql-modal-actions .ql-cancel:hover { background: #e5e7eb; }
      .ql-modal-actions .ql-save {
        background: #6366f1;
        color: #fff;
      }
      .ql-modal-actions .ql-save:hover { background: #4f46e5; }
      .ql-modal-actions .ql-delete {
        flex: none;
        width: 40px;
        background: #fef2f2;
        color: #ef4444;
        font-size: 16px;
      }
      .ql-modal-actions .ql-delete:hover { background: #fee2e2; }

      @media (prefers-color-scheme: dark) {
        .ql-btn {
          background: rgba(50,50,60,0.6);
          border-color: rgba(255,255,255,0.1);
        }
        .ql-btn:hover {
          background: rgba(60,60,75,0.9);
          border-color: rgba(129,140,248,0.4);
          box-shadow: 0 4px 16px rgba(0,0,0,0.3);
        }
        .ql-btn.configured {
          background: rgba(67,56,202,0.15);
          border-color: rgba(129,140,248,0.2);
        }
        .ql-btn .ql-name { color: #a1a1aa; }
        .ql-btn .ql-plus { color: #71717a; }
        .ql-edit { background: rgba(255,255,255,0.08); color: #71717a; }
        .ql-modal { background: #1e1e2e; }
        .ql-modal h3 { color: #e5e7eb; }
        .ql-modal label { color: #9ca3af; }
        .ql-modal input[type="text"] {
          background: #2a2a3a;
          border-color: #3f3f5a;
          color: #e5e7eb;
        }
        .ql-modal input[type="text"]:focus {
          border-color: #818cf8;
          background: #2a2a3a;
        }
        .ql-emoji-opt { background: #2a2a3a; }
        .ql-emoji-opt:hover {
          background: #3730a3;
          border-color: #818cf8;
        }
        .ql-emoji-opt.selected {
          background: #3730a3;
          border-color: #818cf8;
        }
        .ql-modal-actions .ql-cancel {
          background: #2a2a3a;
          color: #9ca3af;
        }
        .ql-modal-actions .ql-cancel:hover { background: #3a3a4a; }
      }
    `;
    document.head.appendChild(style);
  }

  function findAnchor() {
    return document.querySelector('.theme-input-container') ||
           document.querySelector('[class*="input"]');
  }

  function createButton(item, index) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ql-btn' + (isConfigured(item) ? ' configured' : '');
    btn.dataset.index = String(index);

    if (isConfigured(item)) {
      const icon = document.createElement('span');
      icon.className = 'ql-icon';
      icon.textContent = item.icon || '🌐';

      const name = document.createElement('span');
      name.className = 'ql-name';
      name.textContent = item.name || '未命名';

      const edit = document.createElement('span');
      edit.className = 'ql-edit';
      edit.title = '编辑';
      edit.textContent = '✎';

      btn.appendChild(icon);
      btn.appendChild(name);
      btn.appendChild(edit);
    } else {
      const plus = document.createElement('span');
      plus.className = 'ql-plus';
      plus.textContent = '+';
      btn.appendChild(plus);
    }

    return btn;
  }

  function bindContainerEvents(container) {
    if (container.dataset.bound === '1') return;
    container.dataset.bound = '1';

    container.addEventListener('click', function (e) {
      const btn = e.target.closest('.ql-btn');
      if (!btn || !container.contains(btn)) return;

      const index = Number(btn.dataset.index);
      const config = loadConfig();
      const item = config[index];
      if (!item) return;

      if (e.target.closest('.ql-edit')) {
        e.preventDefault();
        e.stopPropagation();
        openModal(index);
        return;
      }

      if (isConfigured(item)) {
        window.open(item.url, '_blank', 'noopener');
      } else {
        openModal(index);
      }
    });
  }

  function render() {
    const anchor = findAnchor();
    if (!anchor || !anchor.parentNode) {
      return false;
    }

    if (containerRef && containerRef.parentNode) {
      containerRef.remove();
    } else {
      const existing = document.querySelector('.ql-container');
      if (existing) existing.remove();
    }

    const container = document.createElement('div');
    container.className = 'ql-container';

    const fragment = document.createDocumentFragment();
    const config = loadConfig();

    for (let i = 0; i < config.length; i++) {
      fragment.appendChild(createButton(config[i], i));
    }

    container.appendChild(fragment);
    bindContainerEvents(container);

    anchor.parentNode.insertBefore(container, anchor.nextSibling);
    containerRef = container;
    return true;
  }

  function closeExistingModal() {
    const existing = document.querySelector('.ql-overlay');
    if (existing) existing.remove();
  }

  function openModal(index) {
    const config = loadConfig();
    const item = config[index];
    if (!item) return;

    closeExistingModal();

    const configured = isConfigured(item);
    const overlay = document.createElement('div');
    overlay.className = 'ql-overlay';

    const modal = document.createElement('div');
    modal.className = 'ql-modal';

    const emojiHtml = CONFIG.EMOJIS.map(function (emoji) {
      const selected = emoji === (item.icon || '') ? ' selected' : '';
      return `<button type="button" class="ql-emoji-opt${selected}" data-e="${escapeHtml(emoji)}">${escapeHtml(emoji)}</button>`;
    }).join('');

    modal.innerHTML = `
      <h3>快捷方式</h3>
      <label>图标</label>
      <div class="ql-emoji-grid">${emojiHtml}</div>

      <label>名称</label>
      <input type="text" id="ql-name" value="${escapeHtml(item.name || '')}" placeholder="网站名称" maxlength="10">

      <label>网址</label>
      <input type="text" id="ql-url" value="${escapeHtml(item.url || '')}" placeholder="https://example.com">

      <div class="ql-modal-actions">
        ${configured ? '<button type="button" class="ql-delete" title="删除">🗑</button>' : ''}
        <button type="button" class="ql-cancel">取消</button>
        <button type="button" class="ql-save">保存</button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    let selectedIcon = item.icon || '';
    const nameInput = modal.querySelector('#ql-name');
    const urlInput = modal.querySelector('#ql-url');
    const cancelBtn = modal.querySelector('.ql-cancel');
    const saveBtn = modal.querySelector('.ql-save');
    const deleteBtn = modal.querySelector('.ql-delete');

    function close() {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }

    modal.addEventListener('click', function (e) {
      const emojiBtn = e.target.closest('.ql-emoji-opt');
      if (!emojiBtn) return;

      const all = modal.querySelectorAll('.ql-emoji-opt');
      for (let i = 0; i < all.length; i++) {
        all[i].classList.remove('selected');
      }
      emojiBtn.classList.add('selected');
      selectedIcon = emojiBtn.dataset.e || '';
    });

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) close();
    });

    cancelBtn.addEventListener('click', close);

    if (deleteBtn) {
      deleteBtn.addEventListener('click', function () {
        config[index] = { id: item.id, name: '', url: '', icon: '' };
        saveConfig(config);
        render();
        close();
      });
    }

    saveBtn.addEventListener('click', function () {
      const name = nameInput.value.trim();
      const url = urlInput.value.trim();

      urlInput.style.borderColor = '';

      if (url && !isValidUrl(url)) {
        urlInput.style.borderColor = '#ef4444';
        urlInput.focus();
        return;
      }

      config[index] = {
        id: item.id,
        name: name || '未命名',
        url: url,
        icon: selectedIcon || '🌐'
      };

      saveConfig(config);
      render();
      close();
    });

    modal.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveBtn.click();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    });

    setTimeout(function () {
      if (nameInput) nameInput.focus();
    }, 80);
  }

  function tryRender() {
    if (render()) return;

    retryCount += 1;
    if (retryCount <= CONFIG.MAX_RETRY) {
      setTimeout(tryRender, CONFIG.RETRY_INTERVAL);
    } else {
      console.warn('ql: anchor not found');
    }
  }

  function init() {
    injectStyle();
    setTimeout(tryRender, CONFIG.RENDER_DELAY);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  window.addEventListener('storage', function (e) {
    if (e.key === CONFIG.STORAGE_KEY) {
      configCache = null;
      render();
    }
  });
})();