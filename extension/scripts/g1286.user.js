(function() {
  'use strict';
  
  if (window.googleQuickSaveInitialized) return;
  window.googleQuickSaveInitialized = true;

  const STORAGE_KEYS = {
    ITEMS: 'gqs_items',
    THEME: 'gqs_theme',
    COLLAPSED: 'gqs_collapsed'
  };

  const THEMES = {
    blue: '#4285f4',
    red: '#ea4335',
    yellow: '#fbbc04',
    green: '#34a853',
    light: '#f8f9fa',
    dark: '#202124'
  };

  const MAX_TEXT_LENGTH = 500;

  function loadData(key, defaultValue = null) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  }

  function saveData(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {}
  }

  function injectStyles(themeColor) {
    const existingStyle = document.getElementById('gqs-styles');
    if (existingStyle) existingStyle.remove();

    const isLight = ['#fbbc04', '#f8f9fa'].includes(themeColor);
    const headerTextColor = isLight ? '#202124' : '#fff';
    const activeBorderColor = isLight ? '#202124' : '#fff';

    const style = document.createElement('style');
    style.id = 'gqs-styles';
    style.textContent = `
      #gqs-container {
        max-width: 584px;
        margin: 8px auto 0;
        font-family: arial, sans-serif;
        transition: all 0.3s ease;
      }

      #gqs-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 16px;
        background: ${themeColor};
        border-radius: 20px;
        cursor: pointer;
        user-select: none;
        box-shadow: 0 1px 4px rgba(32,33,36,.18);
        transition: all 0.3s ease;
      }

      #gqs-header:hover { box-shadow: 0 2px 8px rgba(32,33,36,.24); }

      #gqs-title {
        font-size: 13px;
        font-weight: 500;
        color: ${headerTextColor};
      }

      #gqs-controls { display: flex; gap: 8px; align-items: center; }

      #gqs-theme-selector {
        display: flex;
        gap: 5px;
        align-items: center;
        padding: 3px 8px;
        background: rgba(128,128,128,0.2);
        border-radius: 12px;
        opacity: 0;
        max-width: 0;
        overflow: hidden;
        transition: all 0.3s ease;
      }

      #gqs-theme-selector.visible {
        opacity: 1;
        max-width: 180px;
      }

      .gqs-theme-btn {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        border: 2px solid rgba(128,128,128,0.4);
        cursor: pointer;
        transition: all 0.2s;
        flex-shrink: 0;
      }
      .gqs-theme-btn:hover { transform: scale(1.2); }
      .gqs-theme-btn.active {
        border-width: 2px;
        border-color: ${activeBorderColor};
      }

      #gqs-toggle {
        font-size: 14px;
        color: ${headerTextColor};
        transition: transform 0.3s;
        margin-left: 4px;
      }
      #gqs-toggle.collapsed { transform: rotate(-90deg); }

      #gqs-content {
        background: #fff;
        border: 1px solid #e8eaed;
        border-radius: 0 0 16px 16px;
        margin-top: -10px;
        padding: 20px 12px 12px 12px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        max-height: 450px;
        overflow: hidden;
        transition: all 0.3s ease;
      }
      #gqs-content.collapsed {
        max-height: 0;
        padding: 0 12px;
        border: none;
        margin-top: 0;
      }

      #gqs-paste-area {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 8px 16px;
        border: 1.5px dashed ${themeColor};
        border-radius: 12px;
        background: #f8f9fa;
        cursor: pointer;
        transition: all 0.2s;
        user-select: none;
        outline: none;
      }
      #gqs-paste-area:hover, #gqs-paste-area:focus {
        background: #f1f3f4;
        box-shadow: 0 2px 6px rgba(0,0,0,0.05);
      }
      .gqs-paste-icon { font-size: 16px; }
      .gqs-paste-text { font-size: 13px; font-weight: 500; color: #5f6368; }

      #gqs-display-area {
        max-height: 300px;
        overflow-y: auto;
        display: flex;
        flex-wrap: wrap;
        flex-direction: row;
        align-content: flex-start;
        gap: 8px;
        padding: 4px;
      }
      #gqs-display-area::-webkit-scrollbar { width: 4px; }
      #gqs-display-area::-webkit-scrollbar-track { background: transparent; }
      #gqs-display-area::-webkit-scrollbar-thumb { background: #dadce0; border-radius: 2px; }

      .gqs-item {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 6px 6px 12px;
        background: #fff;
        border: 1px solid #dadce0;
        border-radius: 20px;
        max-width: 100%;
        transition: all 0.2s;
        box-shadow: 0 1px 2px rgba(0,0,0,0.04);
        animation: fadeIn 0.2s ease;
      }
      @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      .gqs-item:hover { border-color: ${themeColor}; box-shadow: 0 1px 4px rgba(0,0,0,0.1); }

      /* 完整显示文本，不截断 */
      .gqs-item-content, .gqs-item-link {
        font-size: 13px;
        color: #202124;
        line-height: 1.4;
        word-break: break-word;
        white-space: pre-wrap;
        flex: 1;
        text-decoration: none;
      }
      .gqs-item-link { color: #1a73e8; }
      .gqs-item-link:hover { text-decoration: underline; }
      
      .gqs-item-content.editing { display: none; }
      .gqs-item-input {
        display: none;
        padding: 4px 8px;
        border: 1px solid ${themeColor};
        border-radius: 12px;
        font-size: 13px;
        outline: none;
        width: 200px;
        min-height: 30px;
        resize: vertical;
        font-family: arial, sans-serif;
      }
      .gqs-item-input.active { display: block; }

      .gqs-item-image-thumb {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        object-fit: cover;
        cursor: pointer;
        flex-shrink: 0;
      }

      .gqs-item-actions { 
        display: inline-flex; 
        gap: 2px; 
        align-items: center;
        flex-shrink: 0;
      }
      
      .gqs-item-btn {
        width: 24px;
        height: 24px;
        padding: 0;
        border: none;
        border-radius: 50%;
        background: transparent;
        font-size: 13px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        flex-shrink: 0;
      }
      .gqs-item-btn:hover { background: #f1f3f4; transform: scale(1.1); }
      .gqs-item-btn.delete:hover { background: #fce8e6; }

      .gqs-empty { color: #bdc1c6; font-size: 12px; margin: 10px auto; }
      
      .gqs-toast {
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        background: #323232;
        color: #fff;
        padding: 10px 20px;
        border-radius: 20px;
        font-size: 13px;
        z-index: 10000;
        opacity: 0;
        transition: opacity 0.3s;
        pointer-events: none;
      }
      .gqs-toast.show { opacity: 1; }
    `;
    document.head.appendChild(style);
  }

  function createContainer(theme) {
    const container = document.createElement('div');
    container.id = 'gqs-container';
    
    const themeOptionsHtml = Object.entries(THEMES).map(([name, color]) => 
      `<div class="gqs-theme-btn ${theme === color ? 'active' : ''}" 
            data-theme="${color}" 
            style="background: ${color}"
            title="${name}"></div>`
    ).join('');

    container.innerHTML = `
      <div id="gqs-header">
        <div id="gqs-title">📌 Quick Save</div>
        <div id="gqs-controls">
          <div id="gqs-theme-selector">
            ${themeOptionsHtml}
          </div>
          <span id="gqs-toggle">▼</span>
        </div>
      </div>
      <div id="gqs-content">
        <div id="gqs-paste-area" tabindex="0" title="点击或按 Ctrl+V 粘贴">
          <div class="gqs-paste-icon">📋</div>
          <div class="gqs-paste-text">点击粘贴 / Ctrl+V</div>
        </div>
        <div id="gqs-display-area"></div>
      </div>
    `;
    return container;
  }

  function showToast(message) {
    let toast = document.getElementById('gqs-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'gqs-toast';
      toast.className = 'gqs-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
  }

  function detectType(content) {
    if (/^data:image\//.test(content)) return 'image';
    if (/^https?:\/\/.+/i.test(content)) return 'link';
    return 'text';
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function renderItems(items) {
    const displayArea = document.getElementById('gqs-display-area');
    if (!displayArea) return;

    if (!items || items.length === 0) {
      displayArea.innerHTML = '<div class="gqs-empty">暂无保存内容</div>';
      return;
    }

    displayArea.innerHTML = items.map((item, index) => {
      const type = detectType(item.content);
      let contentHtml = '';

      if (type === 'image') {
        contentHtml = `<img src="${escapeHtml(item.content)}" class="gqs-item-image-thumb" data-index="${index}" alt="img" title="点击查看大图">`;
      } else if (type === 'link') {
        contentHtml = `<a href="${escapeHtml(item.content)}" target="_blank" class="gqs-item-link" title="${escapeHtml(item.content)}">${escapeHtml(item.content)}</a>`;
      } else {
        contentHtml = `
          <div class="gqs-item-content" title="${escapeHtml(item.content)}">${escapeHtml(item.content)}</div>
          <textarea class="gqs-item-input" data-index="${index}">${escapeHtml(item.content)}</textarea>
        `;
      }

      const canEdit = type !== 'image';
      const canInsert = type !== 'image';

      const actionsHtml = `
        <div class="gqs-item-actions">
          ${canEdit ? `<button type="button" class="gqs-item-btn edit" data-index="${index}" title="编辑">✏️</button>` : ''}
          <button type="button" class="gqs-item-btn copy" data-index="${index}" title="复制">📄</button>
          ${canInsert ? `<button type="button" class="gqs-item-btn insert" data-index="${index}" title="插入搜索框">⤴️</button>` : ''}
          <button type="button" class="gqs-item-btn delete" data-index="${index}" title="删除">🗑️</button>
          ${canEdit ? `<button type="button" class="gqs-item-btn save" data-index="${index}" title="保存" style="display:none;">💾</button>` : ''}
        </div>
      `;

      return `<div class="gqs-item" data-index="${index}">${contentHtml}${actionsHtml}</div>`;
    }).join('');
  }

  async function handlePaste(contentObj) {
    if (!contentObj) {
      showToast('无法读取剪贴板');
      return;
    }
    const { content } = contentObj;
    if (detectType(content) === 'text' && content.length > MAX_TEXT_LENGTH) {
      showToast(`文本不能超过${MAX_TEXT_LENGTH}字符`);
      return;
    }
    const items = loadData(STORAGE_KEYS.ITEMS, []);
    items.unshift({ content, timestamp: Date.now() });
    saveData(STORAGE_KEYS.ITEMS, items);
    renderItems(items);
    showToast('✓ 已保存');
  }

  async function readClipboardApi() {
    try {
      if (navigator.clipboard && navigator.clipboard.read) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          for (const type of item.types) {
            if (type.startsWith('image/')) {
              const blob = await item.getType(type);
              return new Promise(resolve => {
                const reader = new FileReader();
                reader.onload = e => resolve({ type: 'image', content: e.target.result });
                reader.readAsDataURL(blob);
              });
            }
          }
          if (item.types.includes('text/plain')) {
            const blob = await item.getType('text/plain');
            const text = await blob.text();
            if (text.trim()) return { type: 'text', content: text.trim() };
          }
        }
      }
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text.trim()) return { type: 'text', content: text.trim() };
      }
    } catch (e) {
      console.warn('Clipboard API failed', e);
    }
    return null;
  }

  function initializeFeatures() {
    const items = loadData(STORAGE_KEYS.ITEMS, []);
    const isCollapsed = loadData(STORAGE_KEYS.COLLAPSED, false);
    renderItems(items);

    const content = document.getElementById('gqs-content');
    const toggle = document.getElementById('gqs-toggle');
    const themeSelector = document.getElementById('gqs-theme-selector');
    
    if (isCollapsed) {
      content.classList.add('collapsed');
      toggle.classList.add('collapsed');
    } else {
      themeSelector.classList.add('visible');
    }

    document.getElementById('gqs-header').addEventListener('click', (e) => {
      if (e.target.classList.contains('gqs-theme-btn')) return;
      const isNowCollapsed = content.classList.toggle('collapsed');
      toggle.classList.toggle('collapsed');
      isNowCollapsed ? themeSelector.classList.remove('visible') : themeSelector.classList.add('visible');
      saveData(STORAGE_KEYS.COLLAPSED, isNowCollapsed);
    });

    document.querySelectorAll('.gqs-theme-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const newTheme = btn.dataset.theme;
        saveData(STORAGE_KEYS.THEME, newTheme);
        const container = document.getElementById('gqs-container');
        injectStyles(newTheme);
        container.replaceWith(createContainer(newTheme));
        initializeFeatures();
      });
    });

    const pasteArea = document.getElementById('gqs-paste-area');
    pasteArea.addEventListener('click', async () => {
      pasteArea.focus();
      const data = await readClipboardApi();
      if (data) handlePaste(data);
      else showToast('请尝试按 Ctrl+V 粘贴');
    });

    pasteArea.addEventListener('paste', (e) => {
      e.preventDefault();
      const items = e.clipboardData?.items;
      if (items) {
        for (const item of items) {
          if (item.type.startsWith('image/')) {
            const blob = item.getAsFile();
            if (blob) {
              const reader = new FileReader();
              reader.onload = ev => handlePaste({ type: 'image', content: ev.target.result });
              reader.readAsDataURL(blob);
              return;
            }
          }
        }
      }
      const text = e.clipboardData?.getData('text/plain');
      if (text && text.trim()) handlePaste({ type: 'text', content: text.trim() });
    });

    document.getElementById('gqs-display-area').addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const target = e.target;
      const itemEl = target.closest('.gqs-item');
      if (!itemEl) return;
      
      const index = parseInt(itemEl.dataset.index);
      const items = loadData(STORAGE_KEYS.ITEMS, []);

      if (target.classList.contains('gqs-item-image-thumb')) {
        const win = window.open();
        win.document.write(`<img src="${items[index].content}" style="max-width:100%;">`);
        return;
      }

      if (target.classList.contains('delete')) {
        items.splice(index, 1);
        saveData(STORAGE_KEYS.ITEMS, items);
        renderItems(items);
        showToast('已删除');
      } else if (target.classList.contains('copy')) {
        try {
          await navigator.clipboard.writeText(items[index].content);
          showToast('✓ 已复制');
        } catch(err) { showToast('复制失败'); }
      } else if (target.classList.contains('insert')) {
        const searchInput = document.querySelector('textarea.gLFyf, #APjFqb');
        if (searchInput) {
          searchInput.value = items[index].content;
          searchInput.focus();
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));
          showToast('✓ 已插入搜索框');
        } else {
          showToast('未找到搜索框');
        }
      } else if (target.classList.contains('edit')) {
        itemEl.querySelector('.gqs-item-content').classList.add('editing');
        const input = itemEl.querySelector('.gqs-item-input');
        input.classList.add('active');
        target.style.display = 'none';
        itemEl.querySelector('.save').style.display = 'flex';
        input.focus();
      } else if (target.classList.contains('save')) {
        const val = itemEl.querySelector('.gqs-item-input').value.trim();
        if (val && val.length <= MAX_TEXT_LENGTH) {
          items[index].content = val;
          saveData(STORAGE_KEYS.ITEMS, items);
          renderItems(items);
          showToast('✓ 已更新');
        } else {
          showToast(`内容需在1-${MAX_TEXT_LENGTH}字符`);
        }
      }
    });
  }

  function init() {
    const searchBox = document.querySelector('.A8SBwf');
    if (!searchBox) return;

    const currentTheme = loadData(STORAGE_KEYS.THEME, THEMES.blue);
    injectStyles(currentTheme);
    const container = createContainer(currentTheme);
    searchBox.parentNode.insertBefore(container, searchBox.nextSibling);
    initializeFeatures();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 300);
  }
})();