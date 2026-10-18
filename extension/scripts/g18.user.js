(async function __tabEvaluateScriptBridge() {
  const __tabScriptArgs = null;
  const __tabOriginalFunction = (
    /**
     * 背书脚本 - 为页面内容添加背书/批注交互功能
     * 
     * 功能：
     * - 选中文字后可添加背书标记（高亮+批注）
     * - 浮动工具栏：背书、取消背书
     * - 背书面板：查看所有背书记录
     * - 支持导出背书内容
     */
    
    async function run(args) {
      const CONFIG = {
        id: 'endorsement-widget',
        colors: {
          primary: '#4A90D9',
          success: '#52C41A',
          warning: '#FAAD14',
          highlight: 'rgba(74, 144, 217, 0.25)',
          border: '#4A90D9'
        },
        storageKey: 'page_endorsements'
      };
    
      // ========== 初始化 ==========
      let container = null;
      let toolbar = null;
      let panel = null;
      let endorsements = [];
      let selection = null;
    
      // 加载已保存的背书数据
      function loadEndorsements() {
        try {
          const saved = localStorage.getItem(CONFIG.storageKey);
          if (saved) endorsements = JSON.parse(saved);
        } catch (e) {
          endorsements = [];
        }
      }
    
      function saveEndorsements() {
        try {
          localStorage.setItem(CONFIG.storageKey, JSON.stringify(endorsements));
        } catch (e) { /* ignore */ }
      }
    
      // ========== 样式注入 ==========
      function injectStyles() {
        if (document.getElementById('endorsement-styles')) return;
        const style = document.createElement('style');
        style.id = 'endorsement-styles';
        style.textContent = `
          .endorsement-container {
            position: fixed;
            z-index: 2147483647;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            user-select: none;
          }
    
          /* 浮动工具栏 */
          .endorsement-toolbar {
            position: fixed;
            display: none;
            flex-direction: row;
            gap: 6px;
            padding: 8px 12px;
            background: #fff;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15), 0 2px 6px rgba(0,0,0,0.1);
            border: 1px solid #e8e8e8;
            z-index: 2147483647;
            animation: endorsement-fadeIn 0.15s ease-out;
          }
    
          @keyframes endorsement-fadeIn {
            from { opacity: 0; transform: translateY(-4px); }
            to { opacity: 1; transform: translateY(0); }
          }
    
          .endorsement-toolbar.visible {
            display: flex;
          }
    
          .endorsement-btn {
            padding: 5px 12px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            transition: all 0.15s ease;
            white-space: nowrap;
          }
    
          .endorsement-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(0,0,0,0.12);
          }
    
          .endorsement-btn-primary {
            background: ${CONFIG.colors.primary};
            color: #fff;
          }
    
          .endorsement-btn-primary:hover {
            background: #3a7bc8;
          }
    
          .endorsement-btn-default {
            background: #f5f5f5;
            color: #555;
          }
    
          .endorsement-btn-default:hover {
            background: #ebebeb;
          }
    
          .endorsement-btn-danger {
            background: #ff4d4f;
            color: #fff;
          }
    
          /* 背书高亮 */
          .endorsement-highlight {
            background: ${CONFIG.colors.highlight};
            border-bottom: 2px solid ${CONFIG.colors.border};
            border-radius: 2px;
            padding: 0 2px;
            cursor: pointer;
            transition: background 0.2s ease;
          }
    
          .endorsement-highlight:hover {
            background: rgba(74, 144, 217, 0.4);
          }
    
          /* 主控制按钮 */
          .endorsement-fab {
            position: fixed;
            right: 24px;
            bottom: 80px;
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: ${CONFIG.colors.primary};
            color: #fff;
            border: none;
            cursor: pointer;
            box-shadow: 0 4px 16px rgba(74, 144, 217, 0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            z-index: 2147483646;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          }
    
          .endorsement-fab:hover {
            transform: scale(1.08);
            box-shadow: 0 6px 24px rgba(74, 144, 217, 0.5);
          }
    
          .endorsement-fab.active {
            transform: rotate(45deg);
            background: #ff4d4f;
          }
    
          /* 背书面板 */
          .endorsement-panel {
            position: fixed;
            right: -380px;
            top: 0;
            bottom: 0;
            width: 360px;
            background: #fff;
            box-shadow: -4px 0 24px rgba(0,0,0,0.12);
            z-index: 2147483646;
            transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }
    
          .endorsement-panel.open {
            right: 0;
          }
    
          .endorsement-panel-header {
            padding: 20px 24px;
            border-bottom: 1px solid #f0f0f0;
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: linear-gradient(135deg, ${CONFIG.colors.primary}, #6BA3E0);
            color: #fff;
          }
    
          .endorsement-panel-title {
            font-size: 17px;
            font-weight: 600;
            margin: 0;
          }
    
          .endorsement-panel-close {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            border: none;
            background: rgba(255,255,255,0.2);
            color: #fff;
            cursor: pointer;
            font-size: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.15s;
          }
    
          .endorsement-panel-close:hover {
            background: rgba(255,255,255,0.35);
          }
    
          .endorsement-panel-body {
            flex: 1;
            overflow-y: auto;
            padding: 16px 0;
          }
    
          .endorsement-empty {
            text-align: center;
            padding: 60px 24px;
            color: #999;
          }
    
          .endorsement-empty-icon {
            font-size: 48px;
            margin-bottom: 12px;
            opacity: 0.3;
          }
    
          .endorsement-item {
            padding: 14px 24px;
            border-bottom: 1px solid #f5f5f5;
            cursor: pointer;
            transition: background 0.15s;
          }
    
          .endorsement-item:hover {
            background: #fafafa;
          }
    
          .endorsement-item-text {
            font-size: 14px;
            line-height: 1.6;
            color: #333;
            margin-bottom: 6px;
            word-break: break-word;
          }
    
          .endorsement-item-meta {
            font-size: 12px;
            color: #999;
            display: flex;
            align-items: center;
            gap: 10px;
          }
    
          .endorsement-item-delete {
            float: right;
            padding: 2px 8px;
            border: none;
            background: transparent;
            color: #ccc;
            cursor: pointer;
            font-size: 13px;
            border-radius: 4px;
            transition: all 0.15s;
          }
    
          .endorsement-item-delete:hover {
            color: #ff4d4f;
            background: #fff1f0;
          }
    
          .endorsement-panel-footer {
            padding: 14px 24px;
            border-top: 1px solid #f0f0f0;
            display: flex;
            gap: 8px;
          }
    
          .endorsement-panel-footer button {
            flex: 1;
            padding: 8px;
            border-radius: 6px;
            border: 1px solid #d9d9d9;
            background: #fff;
            cursor: pointer;
            font-size: 13px;
            transition: all 0.15s;
          }
    
          .endorsement-panel-footer button:hover {
            border-color: ${CONFIG.colors.primary};
            color: ${CONFIG.colors.primary};
          }
    
          /* 输入对话框 */
          .endorsement-dialog-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.35);
            z-index: 2147483647;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: endorsement-overlayIn 0.15s ease-out;
          }
    
          @keyframes endorsement-overlayIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
    
          .endorsement-dialog {
            background: #fff;
            border-radius: 12px;
            padding: 24px;
            width: 400px;
            max-width: 90vw;
            box-shadow: 0 12px 48px rgba(0,0,0,0.2);
            animation: endorsement_dialogIn 0.2s ease-out;
          }
    
          @keyframes endorsement_dialogIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
    
          .endorsement-dialog-title {
            font-size: 16px;
            font-weight: 600;
            margin: 0 0 16px 0;
            color: #333;
          }
    
          .endorsement-dialog-text {
            font-size: 13px;
            color: #666;
            background: #f7f9fc;
            padding: 10px 12px;
            border-radius: 6px;
            margin-bottom: 14px;
            line-height: 1.5;
            word-break: break-word;
            max-height: 100px;
            overflow-y: auto;
          }
    
          .endorsement-dialog-input {
            width: 100%;
            padding: 10px 12px;
            border: 1px solid #d9d9d9;
            border-radius: 6px;
            font-size: 14px;
            resize: vertical;
            min-height: 72px;
            font-family: inherit;
            box-sizing: border-box;
            transition: border-color 0.15s;
          }
    
          .endorsement-dialog-input:focus {
            outline: none;
            border-color: ${CONFIG.colors.primary};
            box-shadow: 0 0 0 3px rgba(74, 144, 217, 0.12);
          }
    
          .endorsement-dialog-actions {
            display: flex;
            justify-content: flex-end;
            gap: 8px;
            margin-top: 18px;
          }
    
          .endorsement-count-badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 18px;
            height: 18px;
            padding: 0 5px;
            border-radius: 9px;
            background: rgba(255,255,255,0.3);
            font-size: 11px;
            font-weight: 600;
            margin-left: 8px;
          }
    
          /* Toast 提示 */
          .endorsement-toast {
            position: fixed;
            top: 24px;
            left: 50%;
            transform: translateX(-50%) translateY(-20px);
            padding: 10px 20px;
            background: #333;
            color: #fff;
            border-radius: 8px;
            font-size: 14px;
            z-index: 2147483647;
            opacity: 0;
            transition: all 0.3s ease;
            pointer-events: none;
          }
    
          .endorsement-toast.show {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        `;
        document.head.appendChild(style);
      }
    
      // ========== 创建 UI ==========
      function createToolbar() {
        toolbar = document.createElement('div');
        toolbar.className = 'endorsement-toolbar';
        toolbar.innerHTML = `
          <button class="endorsement-btn endorsement-btn-primary" data-action="add">✨ 背书</button>
          <button class="endorsement-btn endorsement-btn-default" data-action="cancel">取消</button>
        `;
        document.body.appendChild(toolbar);
    
        toolbar.addEventListener('click', (e) => {
          const action = e.target.closest('.endorsement-btn')?.dataset.action;
          if (action === 'add') showAddDialog();
          if (action === 'cancel') hideToolbar();
        });
      }
    
      function createFab() {
        const fab = document.createElement('button');
        fab.className = 'endorsement-fab';
        fab.innerHTML = '📝';
        fab.title = '背书面板';
        document.body.appendChild(fab);
    
        fab.addEventListener('click', () => togglePanel());
      }
    
      function createPanel() {
        panel = document.createElement('div');
        panel.className = 'endorsement-panel';
        panel.innerHTML = `
          <div class="endorsement-panel-header">
            <h3 class="endorsement-panel-title">
              📋 背书记录
              <span class="endorsement-count-badge" id="endorsement-count">0</span>
            </h3>
            <button class="endorsement-panel-close" title="关闭">×</button>
          </div>
          <div class="endorsement-panel-body" id="endorsement-list"></div>
          <div class="endorsement-panel-footer">
            <button id="endorsement-export">导出背书</button>
            <button id="endorsement-clear">清空全部</button>
          </div>
        `;
        document.body.appendChild(panel);
    
        panel.querySelector('.endorsement-panel-close').addEventListener('click', () => togglePanel());
        panel.querySelector('#endorsement-export').addEventListener('click', exportEndorsements);
        panel.querySelector('#endorsement-clear').addEventListener('click', clearAllEndorsements);
      }
    
      // ========== 工具栏逻辑 ==========
      function showToolbar(x, y) {
        if (!toolbar) return;
        // 确保不超出视口
        const rect = toolbar.getBoundingClientRect();
        const maxX = window.innerWidth - 200;
        const maxY = window.innerHeight - 60;
        toolbar.style.left = Math.min(x, maxX) + 'px';
        toolbar.style.top = Math.min(y, maxY) + 'px';
        toolbar.classList.add('visible');
      }
    
      function hideToolbar() {
        if (toolbar) toolbar.classList.remove('visible');
        window.getSelection().removeAllRanges();
      }
    
      // ========== 对话框逻辑 ==========
      function showAddDialog() {
        const sel = window.getSelection();
        const text = sel.toString().trim();
        if (!text) {
          showToast('请先选择要背书的文字');
          return;
        }
        selection = {
          text: text,
          range: sel.getRangeAt(0).cloneRange()
        };
        hideToolbar();
    
        const overlay = document.createElement('div');
        overlay.className = 'endorsement-dialog-overlay';
        overlay.innerHTML = `
          <div class="endorsement-dialog">
            <h4 class="endorsement-dialog-title">添加背书</h4>
            <div class="endorsement-dialog-text">${escapeHtml(text)}</div>
            <textarea class="endorsement-dialog-input" placeholder="输入背书批注（可选）..." rows="3"></textarea>
            <div class="endorsement-dialog-actions">
              <button class="endorsement-btn endorsement-btn-default" data-action="cancel">取消</button>
              <button class="endorsement-btn endorsement-btn-primary" data-action="confirm">确认背书</button>
            </div>
          </div>
        `;
        document.body.appendChild(overlay);
    
        const input = overlay.querySelector('.endorsement-dialog-input');
        input.focus();
    
        overlay.addEventListener('click', (e) => {
          const action = e.target.closest('[data-action]')?.dataset.action;
          if (action === 'confirm') {
            const note = input.value.trim();
            addEndorsement(selection.text, selection.range, note);
            overlay.remove();
          } else if (action === 'cancel' || e.target === overlay) {
            overlay.remove();
          }
        });
      }
    
      // ========== 核心操作 ==========
      function addEndorsement(text, range, note) {
        const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
        
        // 包裹选中的文字
        const span = document.createElement('span');
        span.className = 'endorsement-highlight';
        span.dataset.endorseId = id;
        span.title = note ? `背书: ${note}` : '已背书';
        try {
          range.surroundContents(span);
        } catch (e) {
          // 如果跨元素，用 CSS 高亮替代
          span.removeAttribute('data-endorse-id');
          try {
            range.surroundContents(span);
            span.dataset.endorseId = id;
          } catch (e2) {
            showToast('无法背书跨多段落的文本，请选择单段内文字');
            return;
          }
        }
    
        const record = {
          id,
          text,
          note,
          time: new Date().toLocaleString('zh-CN'),
          element: span
        };
    
        endorsements.push(record);
        saveEndorsements();
        renderPanelList();
        showToast('✅ 背书添加成功');
    
        // 点击高亮文字时滚动到面板对应项
        span.addEventListener('click', () => {
          openPanel();
          highlightPanelItem(id);
        });
      }
    
      function removeEndorsement(id) {
        const idx = endorsements.findIndex(e => e.id === id);
        if (idx === -1) return;
    
        const record = endorsements[idx];
        // 移除高亮样式，保留原文字
        if (record.element && record.element.parentNode) {
          const parent = record.element.parentNode;
          while (record.element.firstChild) {
            parent.insertBefore(record.element.firstChild, record.element);
          }
          parent.removeChild(record.element);
        }
    
        endorsements.splice(idx, 1);
        saveEndorsements();
        renderPanelList();
        showToast('背书已移除');
      }
    
      // ========== 面板操作 ==========
      function togglePanel() {
        if (!panel) return;
        const isOpen = panel.classList.contains('open');
        if (isOpen) {
          panel.classList.remove('open');
          document.querySelector('.endorsement-fab')?.classList.remove('active');
        } else {
          openPanel();
        }
      }
    
      function openPanel() {
        if (!panel) return;
        panel.classList.add('open');
        document.querySelector('.endorsement-fab')?.classList.add('active');
        renderPanelList();
      }
    
      function renderPanelList() {
        const list = document.getElementById('endorsement-list');
        const countEl = document.getElementById('endorsement-count');
        if (!list || !countEl) return;
    
        countEl.textContent = endorsements.length;
    
        if (endorsements.length === 0) {
          list.innerHTML = `
            <div class="endorsement-empty">
              <div class="endorsement-empty-icon">📝</div>
              <div>暂无背书记录</div>
              <div style="font-size:12px;margin-top:4px;">选中页面文字后点击「背书」添加</div>
            </div>
          `;
          return;
        }
    
        list.innerHTML = endorsements.map(e => `
          <div class="endorsement-item" data-id="${e.id}">
            <button class="endorsement-item-delete" data-action="delete" data-id="${e.id}">删除</button>
            <div class="endorsement-item-text">${escapeHtml(e.text)}</div>
            ${e.note ? `<div style="font-size:12px;color:${CONFIG.colors.primary};margin-bottom:4px;">💬 ${escapeHtml(e.note)}</div>` : ''}
            <div class="endorsement-item-meta">
              <span>🕐 ${e.time}</span>
            </div>
          </div>
        `).join('');
    
        list.querySelectorAll('.endorsement-item').forEach(item => {
          item.addEventListener('click', (e) => {
            if (e.target.closest('[data-action]')) return;
            const id = item.dataset.id;
            const record = endorsements.find(r => r.id === id);
            if (record?.element) {
              record.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
              record.element.style.background = 'rgba(82, 196, 26, 0.4)';
              setTimeout(() => {
                record.element.style.background = '';
              }, 1500);
            }
          });
        });
    
        list.querySelectorAll('[data-action="delete"]').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeEndorsement(btn.dataset.id);
          });
        });
      }
    
      function highlightPanelItem(id) {
        const item = document.querySelector(`.endorsement-item[data-id="${id}"]`);
        if (item) {
          item.style.background = '#e6f7ff';
          setTimeout(() => { item.style.background = ''; }, 1500);
        }
      }
    
      // ========== 导出与清空 ==========
      function exportEndorsements() {
        if (endorsements.length === 0) {
          showToast('暂无背书可导出');
          return;
        }
        const data = endorsements.map((e, i) => ({
          序号: i + 1,
          原文: e.text,
          批注: e.note || '',
          时间: e.time
        }));
    
        const blob = new Blob(
          [JSON.stringify(data, null, 2)],
          { type: 'application/json;charset=utf-8' }
        );
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `背书记录_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast(`已导出 ${endorsements.length} 条背书`);
      }
    
      function clearAllEndorsements() {
        if (endorsements.length === 0) {
          showToast('暂无背书');
          return;
        }
        if (!confirm(`确定要清空全部 ${endorsements.length} 条背书吗？`)) return;
    
        // 移除所有高亮
        endorsements.forEach(e => {
          if (e.element && e.element.parentNode) {
            const parent = e.element.parentNode;
            while (e.element.firstChild) {
              parent.insertBefore(e.element.firstChild, e.element);
            }
            parent.removeChild(e.element);
          }
        });
    
        endorsements = [];
        saveEndorsements();
        renderPanelList();
        showToast('已清空全部背书');
      }
    
      // ========== 工具函数 ==========
      function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
      }
    
      function showToast(msg) {
        let toast = document.querySelector('.endorsement-toast');
        if (!toast) {
          toast = document.createElement('div');
          toast.className = 'endorsement-toast';
          document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.classList.add('show');
        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => toast.classList.remove('show'), 2000);
      }
    
      // ========== 事件监听 ==========
      function bindEvents() {
        // 文字选择 → 显示工具栏
        document.addEventListener('mouseup', (e) => {
          // 忽略面板和工具栏内的点击
          if (e.target.closest('.endorsement-panel, .endorsement-toolbar, .endorsement-dialog, .endorsement-fab')) return;
    
          setTimeout(() => {
            const sel = window.getSelection();
            const text = sel.toString().trim();
            if (text.length > 0) {
              const range = sel.getRangeAt(0);
              const rect = range.getBoundingClientRect();
              showToolbar(rect.left + rect.width / 2 - 60, rect.top - 46);
            } else {
              hideToolbar();
            }
          }, 10);
        });
    
        // 点击空白处隐藏工具栏
        document.addEventListener('mousedown', (e) => {
          if (!e.target.closest('.endorsement-toolbar')) {
            hideToolbar();
          }
        });
    
        // ESC 关闭面板
        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') {
            if (panel?.classList.contains('open')) togglePanel();
            hideToolbar();
          }
        });
      }
    
      // ========== 启动 ==========
      function init() {
        // 防止重复初始化
        if (document.getElementById(CONFIG.id)) {
          return { ok: false, summary: '背书脚本已在运行中', warnings: [] };
        }
    
        injectStyles();
        loadEndorsements();
        createToolbar();
        createFab();
        createPanel();
        bindEvents();
    
        // 创建容器标记
        container = document.createElement('div');
        container.id = CONFIG.id;
        container.style.display = 'none';
        document.body.appendChild(container);
    
        // 恢复之前的高亮（仅恢复当前页面的）
        renderPanelList();
    
        return {
          ok: true,
          summary: '背书脚本已启动 — 选中文字即可添加背书，右下角 📝 按钮打开背书面板',
          changed_count: 1,
          data: {
            total_endorsements: endorsements.length,
            features: ['文字选中背书', '浮动工具栏', '背书面板', '导出JSON', '一键清空']
          },
          warnings: []
        };
      }
    
      return init();
    }
  );
  if (typeof __tabOriginalFunction !== "function") {
    throw new Error("evaluate_script source must evaluate to a function");
  }
  return await __tabOriginalFunction();
})();