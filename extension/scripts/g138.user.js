/**
 * 智读笔记 (Smart Read Notes) v7.0 — 合并版
 * 网页 AI 阅读辅助工具：划词问答、全文总结、摘录管理、思维导图
 *
 * 合并策略：
 * - 架构：沿用 v6.1 模块化（Store/Utils/Markdown/LLM/UI/Highlight/Bubble/Chat/Cards/Editor/MindMap/Report）
 * - 持久化：cards / cardCounter / dialogSessions / reports / mindMap（不持久化高亮）
 * - 保留旧版功能：智能摘要(smart类型)、卡片收藏(★)、原文预览块、卡片 title、直接保存流程
 * - 保留新版功能：思维导图、anchorText 上下文定位、内嵌历史面板、编辑模式检测
 * - 高亮：回原文时用固定定位遮罩闪烁，不改原文 DOM / 布局
 * - 角标 badge：零尺寸 wrap + 绝对定位，不破坏原文布局
 * - 侧面板：覆盖 / 停靠 两种布局，标题栏下方独立切换
 *
 * 依赖：需要全局 LLMBridge 对象，提供 chat(prompt) -> Promise<string> 方法
 */
(() => {

    // ============================================================
    // 卸载逻辑
    // ============================================================
    if (document.getElementById('_sr_root')) {
      // 清理插入到页面正文里的锚点 badge 和临时闪烁标记，还原原始文本布局
      // 必须在移除 _sr_style 之前/之后都行：这里直接用 JS 删节点并 normalize 合并文本
      document.querySelectorAll('.sr-anchor-badge-wrap').forEach(wrap => {
        const p = wrap.parentNode;
        if (p) { p.removeChild(wrap); p.normalize(); }
      });
      document.querySelectorAll('.sr-source-flash').forEach(mark => {
        const p = mark.parentNode;
        if (!p) return;
        while (mark.firstChild) p.insertBefore(mark.firstChild, mark);
        p.removeChild(mark);
        p.normalize();
      });
      if (window._sr_flashCleanup) { window._sr_flashCleanup(); delete window._sr_flashCleanup; }
      document.documentElement.classList.remove('_sr_push');
      document.documentElement.style.removeProperty('--_sr_panel_w');
      document.getElementById('_sr_root').remove();
      const s = document.getElementById('_sr_style');
      if (s) s.remove();
      if (window._sr_cleanup) { window._sr_cleanup(); delete window._sr_cleanup; }
      return { ok: true, action: 'unloaded' };
    }

    // ============================================================
    // Store — 共享状态中心
    // ============================================================
    const Store = {
      STORAGE_PREFIX: '_sr_data_',
      VERSION: 3,
      state: {
        cards: [], cardCounter: 0, cardFilter: 'all',
        selectedCardIndices: [], cardMultiSelectMode: false,
        editingCardIdx: null, editingCardType: 'define',
        chatHistory: [], dialogSessions: [], currentDialogId: null,
        selectedMsgIndices: [], multiSelectMode: false,
        lockedText: '', lockedRange: null, highlightEnabled: true, lastReply: '',
        reports: [],
        mindMap: null,
      },
      get(key) { return this.state[key]; },
      set(key, val) {
        this.state[key] = val;
        this._notify(key, val);
        const persistKeys = ['cards', 'cardCounter', 'dialogSessions', 'reports', 'mindMap', 'currentDialogId'];
        if (persistKeys.includes(key)) this._debounceSave();
      },
      _listeners: {},
      on(key, fn) { (this._listeners[key] = this._listeners[key] || []).push(fn); },
      _notify(key, val) { if (this._listeners[key]) this._listeners[key].forEach(fn => fn(val)); },
      _storageKey() {
        const path = location.origin + location.pathname;
        let hash = 0;
        for (let i = 0; i < path.length; i++) { hash = ((hash << 5) - hash) + path.charCodeAt(i); hash = hash & hash; }
        return this.STORAGE_PREFIX + Math.abs(hash);
      },
      init() {
        try {
          const raw = localStorage.getItem(this._storageKey());
          if (raw) {
            const data = JSON.parse(raw);
            if (data.cards) this.state.cards = data.cards.map(c => ({ ...c, badge: null, type: c.type === 'discuss' ? 'define' : (c.type || 'define') }));
            if (data.cardCounter) this.state.cardCounter = data.cardCounter;
            if (data.dialogSessions) this.state.dialogSessions = data.dialogSessions;
            if (data.reports) this.state.reports = (data.reports || []).map(r => ({ ...r, type: r.type === 'discuss' ? 'dialog' : r.type }));
            if (data.mindMap) this.state.mindMap = data.mindMap;
            if (data.currentDialogId) this.state.currentDialogId = data.currentDialogId;
            // 自动恢复上次对话
            if (data.currentDialogId) {
              const dlg = (data.dialogSessions || []).find(d => d.id === data.currentDialogId);
              if (dlg && dlg.messages) this.state.chatHistory = JSON.parse(JSON.stringify(dlg.messages));
            }
          }
        } catch (e) { console.warn('[智读笔记] 加载持久化数据失败:', e); }
      },
      _saveTimer: null,
      _debounceSave() {
        if (this._saveTimer) clearTimeout(this._saveTimer);
        this._saveTimer = setTimeout(() => this.save(), 500);
      },
      save() {
        try {
          const data = {
            version: this.VERSION,
            cards: this.state.cards.map(c => ({ ...c, badge: null })),
            cardCounter: this.state.cardCounter,
            dialogSessions: this.state.dialogSessions,
            currentDialogId: this.state.currentDialogId,
            reports: this.state.reports,
            mindMap: this.state.mindMap,
            savedAt: Date.now(),
          };
          localStorage.setItem(this._storageKey(), JSON.stringify(data));
        } catch (e) {
          if (e.name === 'QuotaExceededError') Utils.showToast('存储空间已满，请清理旧数据');
          else console.warn('[智读笔记] 保存失败:', e);
        }
      },
      _mergeCards() {
        try {
          const raw = localStorage.getItem(this._storageKey());
          if (!raw) return this.state.cards.map(c => ({ ...c, badge: null }));
          const existing = JSON.parse(raw);
          const existingCards = existing.cards || [];
          const currentIds = new Set(this.state.cards.map(c => c.id));
          return [
            ...existingCards.filter(c => !currentIds.has(c.id)).map(c => ({ ...c, badge: null, type: c.type === 'discuss' ? 'define' : (c.type || 'define') })),
            ...this.state.cards.map(c => ({ ...c, badge: null, type: c.type === 'discuss' ? 'define' : (c.type || 'define') })),
          ];
        } catch (e) { return this.state.cards.map(c => ({ ...c, badge: null })); }
      },
    };

    // ============================================================
    // Utils — 工具函数
    // ============================================================
    const Utils = {
      $(id) {
        const root = document.getElementById('_sr_root');
        if (root) {
          const el = root.querySelector(`[id="${id}"]`);
          if (el) return el;
        }
        return document.getElementById(id);
      },
      esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); },
      normalizeCardType(type) { return type === 'discuss' ? 'define' : (type || 'define'); },
      cardTypeLabel(type) {
        const map = { define: '定义', note: '批注', smart: '智能摘要' };
        return map[this.normalizeCardType(type)] || '定义';
      },
      showToast(msg, ms = 2000) {
        const t = Utils.$('_sr_toast'); if (!t) return;
        t.textContent = msg; t.classList.add('show');
        setTimeout(() => t.classList.remove('show'), ms);
      },
      downloadText(filename, text) {
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
      },
      getPageText() {
        const selectors = ['article', 'main', '[role="main"]', '.content', '.post-content', '#content', '#main-content', '.collabpage-content', '.wiki-content', '.rich-text', '#js_content', '.rich_media_content', '#js_article', '.profile_container'];
        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (el && el.innerText.trim().length > 100) return el.innerText.trim().slice(0, 12000);
        }
        return document.body.innerText.trim().slice(0, 12000);
      },
      PANEL_MODE_KEY: '_sr_panel_mode',
      getPanelMode() {
        try { return localStorage.getItem(this.PANEL_MODE_KEY) === 'overlay' ? 'overlay' : 'push'; }
        catch (e) { return 'push'; }
      },
      setPanelMode(mode) {
        const next = mode === 'overlay' ? 'overlay' : 'push';
        try { localStorage.setItem(this.PANEL_MODE_KEY, next); } catch (e) {}
        this.syncPanelLayout();
        this.updateDockToggle();
      },
      togglePanelMode() {
        const next = this.getPanelMode() === 'push' ? 'overlay' : 'push';
        this.setPanelMode(next);
        this.showToast(next === 'push' ? '已切换为停靠，原文会让出空间' : '已切换为覆盖，面板浮在原文上');
      },
      syncPanelLayout() {
        const html = document.documentElement;
        const panel = this.$('_sr_panel');
        const shouldPush = panel && panel.classList.contains('open') && this.getPanelMode() === 'push';
        if (shouldPush) {
          const w = panel.offsetWidth || 420;
          html.style.setProperty('--_sr_panel_w', w + 'px');
          html.classList.add('_sr_push');
        } else {
          html.classList.remove('_sr_push');
          html.style.removeProperty('--_sr_panel_w');
        }
      },
      updateDockToggle() {
        const btn = this.$('_sr_dock_toggle');
        if (!btn) return;
        const push = this.getPanelMode() === 'push';
        btn.textContent = push ? '停靠' : '覆盖';
        btn.title = push ? '当前停靠，点击切换为覆盖' : '当前覆盖，点击切换为停靠';
      },
      bindHeightResize(handle, contentEl, onCommit) {
        if (!handle || !contentEl || handle._srBound) return;
        handle._srBound = true;
        const minH = 80;
        const maxH = () => Math.max(240, Math.round(window.innerHeight * 0.85));
        handle.addEventListener('mousedown', (e) => {
          if (e.button !== 0) return;
          e.preventDefault();
          e.stopPropagation();
          const startY = e.clientY;
          const startH = contentEl.getBoundingClientRect().height;
          handle.classList.add('dragging');
          document.body.style.cursor = 'ns-resize';
          document.body.style.userSelect = 'none';
          const apply = (h) => {
            const clamped = Math.max(minH, Math.min(maxH(), h));
            contentEl.style.height = clamped + 'px';
            contentEl.style.maxHeight = 'none';
            return clamped;
          };
          const onMove = (ev) => { apply(startH + (ev.clientY - startY)); };
          const onUp = () => {
            handle.classList.remove('dragging');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            if (onCommit) onCommit(contentEl.getBoundingClientRect().height);
          };
          document.addEventListener('mousemove', onMove);
          document.addEventListener('mouseup', onUp);
        });
        handle.addEventListener('dblclick', (e) => {
          e.preventDefault();
          e.stopPropagation();
          contentEl.style.height = '';
          contentEl.style.maxHeight = '';
          if (onCommit) onCommit(null);
        });
      },
      openPanel() {
        this.$('_sr_panel').classList.add('open');
        this.$('_sr_book_btn').classList.add('hidden');
        this.syncPanelLayout();
      },
      closePanel() {
        this.$('_sr_panel').classList.remove('open');
        this.$('_sr_book_btn').classList.remove('hidden');
        this.syncPanelLayout();
      },
      switchTab(name) {
        document.querySelectorAll('#_sr_root .sr-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
        document.querySelectorAll('#_sr_root .sr-pane').forEach(p => p.classList.toggle('active', p.dataset.pane === name));
      },
    };

    // ============================================================
    // Markdown — 轻量级 Markdown 渲染器
    // ============================================================
    const Markdown = {
      _unwrapOuterFence(text) {
        const t = String(text || '').replace(/^\uFEFF/, '').trim();
        const m = t.match(/^```([^\n`]*)\r?\n([\s\S]*)\r?\n```[ \t]*$/);
        if (!m) return t;
        const lang = (m[1] || '').trim().toLowerCase();
        if (lang && !/^(markdown|md|txt|text)$/.test(lang)) return t;
        return m[2].replace(/^\s+|\s+$/g, '');
      },
      _inline(escaped) {
        let s = escaped;
        s = s.replace(/`([^`\n]+?)`/g, '<code class="sr-md-code">$1</code>');
        s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        s = s.replace(/__(.+?)__/g, '<strong>$1</strong>');
        s = s.replace(/([^*]|^)\*(?!\*)([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
        s = s.replace(/~~(.+?)~~/g, '<del>$1</del>');
        return s;
      },
      render(text) {
        if (!text) return '';
        let src = this._unwrapOuterFence(text);
        const fences = [];
        src = src.replace(/```[^\n`]*\r?\n?([\s\S]*?)```/g, (m, code) => {
          const i = fences.length;
          fences.push(code);
          return `\n%%SRMDCODE${i}%%\n`;
        });
        const escInline = (s) => this._inline(Utils.esc(s));
        const out = [];
        let listItems = [];
        let listTag = 'ul';
        let para = [];
        const flushList = () => {
          if (!listItems.length) return;
          const cls = listTag === 'ol' ? 'sr-md-ol' : 'sr-md-ul';
          out.push(`<${listTag} class="${cls}">${listItems.map(t => `<li>${escInline(t)}</li>`).join('')}</${listTag}>`);
          listItems = [];
        };
        const flushPara = () => {
          if (!para.length) return;
          out.push(`<p>${para.map(escInline).join('<br>')}</p>`);
          para = [];
        };
        src.split(/\r?\n/).forEach((line) => {
          const codeM = line.match(/^%%SRMDCODE(\d+)%%$/);
          if (codeM) {
            flushPara();
            flushList();
            out.push(`<pre class="sr-md-codeblock"><code>${Utils.esc((fences[+codeM[1]] || '').trim())}</code></pre>`);
            return;
          }
          const heading = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
          if (heading) {
            flushPara();
            flushList();
            const n = heading[1].length;
            const tag = n === 1 ? 'h2' : n === 2 ? 'h3' : 'h4';
            const cls = n === 1 ? 'sr-md-h2' : n === 2 ? 'sr-md-h3' : 'sr-md-h4';
            out.push(`<${tag} class="${cls}">${escInline(heading[2])}</${tag}>`);
            return;
          }
          if (/^\s{0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
            flushPara();
            flushList();
            out.push('<hr class="sr-md-hr">');
            return;
          }
          const quote = line.match(/^\s{0,3}>\s?(.*)$/);
          if (quote) {
            flushPara();
            flushList();
            out.push(`<blockquote class="sr-md-quote">${escInline(quote[1])}</blockquote>`);
            return;
          }
          const ul = line.match(/^\s{0,6}[*+\-]\s+(.+)$/);
          const ol = line.match(/^\s{0,6}\d+[.)、．]\s+(.+)$/);
          if (ul || ol) {
            flushPara();
            const nextTag = ul ? 'ul' : 'ol';
            if (listItems.length && listTag !== nextTag) flushList();
            listTag = nextTag;
            listItems.push((ul || ol)[1]);
            return;
          }
          if (!line.trim()) {
            flushPara();
            flushList();
            return;
          }
          flushList();
          para.push(line.replace(/^\s{0,3}/, ''));
        });
        flushPara();
        flushList();
        return out.join('');
      },
      set(el, text) { if (el) el.innerHTML = Markdown.render(text); },
    };

    // ============================================================
    // LLM — AI 接口安全封装
    // ============================================================
    const LLM = {
      async chat(prompt, options) {
        if (typeof LLMBridge !== 'undefined' && LLMBridge && typeof LLMBridge.chat === 'function') {
          return options !== undefined ? await LLMBridge.chat(prompt, options) : await LLMBridge.chat(prompt);
        }
        throw new Error('LLMBridge 未定义，请先配置 AI 桥接接口');
      },
      getErrMsg(e) {
        if (e && e.message && String(e.message).includes('超时')) return '⚠️ AI 请求超时，请稍后重试。';
        return (e.message && e.message.includes('LLMBridge'))
          ? '⚠️ AI 接口未配置，请联系管理员设置 LLMBridge。'
          : '⚠️ AI 回复失败，请重试。';
      },
    };

    // ============================================================
    // SR_CSS — 样式表
    // ============================================================
    const SR_CSS = `
      html._sr_push {
        margin-right: var(--_sr_panel_w, 420px) !important;
        width: calc(100% - var(--_sr_panel_w, 420px)) !important;
        max-width: calc(100% - var(--_sr_panel_w, 420px)) !important;
        box-sizing: border-box !important;
      }
      html._sr_push body {
        max-width: 100% !important;
        box-sizing: border-box !important;
      }
      #_sr_root * { box-sizing:border-box; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; }

      #_sr_bubble {
        position:fixed; z-index:2147483641; display:none;
        background:#fff; border-radius:16px;
        box-shadow:0 8px 32px rgba(108,92,231,.28),0 2px 8px rgba(0,0,0,.1);
        padding:10px 12px; width:340px; flex-direction:column; gap:8px;
        animation:_sr_pop .15s ease;
      }
      #_sr_bubble.show { display:flex; }
      @keyframes _sr_pop { from{transform:scale(.9) translateY(8px);opacity:0} to{transform:scale(1) translateY(0);opacity:1} }
      #_sr_bub_actions_main { display:flex; gap:6px; }
      .sr-bub-main-btn {
        flex:1; padding:10px 6px; border-radius:8px; border:1.5px solid #ddd;
        background:#fafafa; font-size:13px; cursor:pointer; font-weight:700; color:#555;
        display:flex; align-items:center; justify-content:center; gap:3px;
      }
      .sr-bub-main-btn:hover { background:#f0eeff; border-color:#a29bfe; }
      .sr-bub-main-btn.explain { border-color:#b3d9ff; color:#0984e3; }
      .sr-bub-main-btn.explain:hover { background:#e3f2ff; }
      .sr-bub-main-btn.discuss { border-color:#b3ffd9; color:#00b894; }
      .sr-bub-main-btn.discuss:hover { background:#e0fff5; }
      .sr-bub-main-btn.note { border-color:#fdcb6e; color:#d4a017; }
      .sr-bub-main-btn.note:hover { background:#fff8e1; }

      #_sr_bub_explain_area { display:none; flex-direction:column; gap:8px; }
      #_sr_bub_explain_area.show { display:flex; }
      #_sr_bub_reply {
        font-size:13px; line-height:1.6; color:#2d3436;
        background:#f4f3ff; border-radius:10px; padding:9px 11px;
        white-space:pre-wrap; display:none; max-height:180px; overflow-y:auto; overflow-x:hidden; word-break:break-word;
      }
      #_sr_bub_reply.show { display:block; }
      #_sr_bub_actions { display:flex; gap:6px; }
      #_sr_bub_actions.hidden { display:none; }
      .sr-bub-btn {
        flex:1; padding:6px 8px; border-radius:8px; border:1.5px solid #a29bfe;
        background:#fff; color:#6c5ce7; font-size:12px; font-weight:700;
        cursor:pointer; text-align:center; white-space:nowrap;
      }
      .sr-bub-btn:hover { background:#f0eeff; }

      #_sr_bub_row { display:flex; gap:6px; align-items:center; }
      #_sr_bub_row.hidden { display:none; }
      #_sr_bub_input {
        flex:1; border:1.5px solid #ddd; border-radius:10px;
        padding:8px 11px; font-size:13px; outline:none; min-width:0;
      }
      #_sr_bub_input:focus { border-color:#6c5ce7; }
      #_sr_bub_send {
        width:34px; height:34px; border-radius:9px; border:none;
        background:#6c5ce7; color:#fff; font-size:15px; cursor:pointer;
        display:flex; align-items:center; justify-content:center; flex-shrink:0;
      }
      #_sr_bub_send:hover { background:#5a4bd1; }
      #_sr_bub_send:disabled { background:#ccc; cursor:not-allowed; }

      #_sr_bub_note_area { display:none; flex-direction:column; gap:6px; }
      #_sr_bub_note_area.show { display:flex; }
      #_sr_bub_note_input {
        width:100%; min-height:60px; max-height:120px; border:1.5px solid #fdcb6e; border-radius:10px;
        padding:8px 11px; font-size:13px; outline:none; resize:vertical; font-family:inherit;
        background:#fffdf5; color:#2d3436;
      }
      #_sr_bub_note_input:focus { border-color:#d4a017; }
      #_sr_bub_note_save {
        padding:6px 14px; border-radius:8px; border:none; background:#fdcb6e;
        color:#fff; font-size:12px; font-weight:700; cursor:pointer; align-self:flex-end;
      }
      #_sr_bub_note_save:hover { background:#d4a017; }

      #_sr_bub_close {
        position:absolute; top:8px; right:10px; font-size:14px;
        color:#bbb; cursor:pointer; line-height:1; background:none; border:none; padding:0; z-index:2;
      }
      #_sr_bub_close:hover { color:#888; }
      #_sr_bub_hl_toggle { display:flex; align-items:center; gap:4px; font-size:11px; color:#888; margin-top:2px; }
      #_sr_bub_hl_toggle input { cursor:pointer; }
      .sr-bub-thinking { font-size:13px; color:#aaa; padding:8px 4px; font-style:italic; }

      #_sr_book_btn {
        position:fixed; bottom:24px; right:24px; z-index:2147483638;
        width:52px; height:52px; border-radius:14px; border:none;
        background:linear-gradient(135deg,#6c5ce7,#a29bfe); color:#fff;
        font-size:24px; cursor:pointer; display:flex; align-items:center; justify-content:center;
        box-shadow:0 4px 16px rgba(108,92,231,.4); transition:transform .2s, box-shadow .2s;
      }
      #_sr_book_btn:hover { transform:scale(1.1); box-shadow:0 6px 24px rgba(108,92,231,.5); }
      #_sr_book_btn.hidden { display:none; }

      #_sr_panel {
        position:fixed; top:0; right:0; width:420px; height:100vh;
        background:#fff; box-shadow:-4px 0 24px rgba(0,0,0,.13);
        display:flex; flex-direction:column; z-index:2147483640;
        transform:translateX(100%); transition:transform .25s ease;
      }
      #_sr_panel.open { transform:translateX(0); }
      #_sr_resize_handle {
        position:absolute; top:0; left:0; width:6px; height:100%;
        cursor:col-resize; background:transparent; z-index:2147483641;
      }
      #_sr_resize_handle:hover { background:rgba(108,92,231,.2); }
      #_sr_resize_handle.dragging { background:rgba(108,92,231,.4); }

      #_sr_header {
        display:flex; align-items:stretch;
        background:linear-gradient(135deg,#6c5ce7,#a29bfe);
        color:#fff; flex-shrink:0;
        position:relative; z-index:2147483642;
        height:52px;
      }
      .sr-tabs { display:flex; flex:1; min-width:0; height:100%; }
      .sr-tab {
        flex:1; height:100%; display:flex; align-items:center; justify-content:center;
        padding:0 4px; text-align:center; cursor:pointer;
        font-size:12px; font-weight:600; opacity:.7;
        border-bottom:3px solid transparent; transition:opacity .2s;
      }
      .sr-tab.active { opacity:1; border-bottom-color:#fff; }
      #_sr_header_actions {
        display:flex; flex-direction:column; justify-content:space-evenly;
        align-items:center; flex-shrink:0; height:100%;
        padding:3px 5px;
        border-left:1px solid rgba(255,255,255,.28);
        border-bottom:3px solid transparent;
      }
      #_sr_close {
        width:18px; height:18px; display:flex; align-items:center;
        justify-content:center; cursor:pointer; opacity:.85; flex-shrink:0;
        font-size:13px; border-radius:5px; user-select:none;
      }
      #_sr_close:hover { opacity:1; background:rgba(255,255,255,.18); }
      #_sr_root #_sr_dock_toggle {
        appearance:none !important; -webkit-appearance:none !important;
        display:block !important; box-sizing:border-box !important;
        width:auto !important; height:auto !important;
        min-width:0 !important; min-height:0 !important;
        margin:0 !important; box-shadow:none !important; outline:none !important;
        background:rgba(255,255,255,.16) !important;
        border:1px solid rgba(255,255,255,.8) !important;
        border-radius:4px !important;
        color:#fff !important;
        font-size:9px !important; font-weight:700 !important;
        font-family:inherit !important; letter-spacing:.2px !important;
        line-height:1.2 !important; padding:2px 5px !important;
        cursor:pointer !important; white-space:nowrap !important; user-select:none !important;
      }
      #_sr_root #_sr_dock_toggle:hover {
        background:rgba(255,255,255,.28) !important;
      }
      .sr-pane { display:none; flex:1; overflow:hidden; flex-direction:column; min-height:0; }
      .sr-pane.active { display:flex; }
      #_sr_ctx_bar_wrap { flex-shrink:0; }
      .sr-ctx-bar {
        background:#f0eeff; border-left:3px solid #6c5ce7;
        border-radius:6px; padding:8px 10px; font-size:12px;
        color:#555; margin:8px 14px 0;
      }
      .sr-ctx-label { font-weight:700; color:#6c5ce7; margin-bottom:2px; font-size:11px; }
      .sr-ctx-text { line-height:1.5; max-height:52px; overflow-y:auto; }

      #_sr_dialog_list_bar {
        display:flex; align-items:center; gap:6px; padding:8px 14px 6px; flex-shrink:0;
        border-bottom:1px solid #f0f0f0;
      }
      #_sr_dialog_sel {
        flex:1; border:1.5px solid #ddd; border-radius:6px; padding:4px 8px;
        font-size:12px; color:#555; background:#fafafa; cursor:pointer;
      }
      .sr-small-btn {
        padding:4px 8px; border-radius:6px; border:1.5px solid #a29bfe; background:#fff; color:#6c5ce7;
        font-size:11px; font-weight:700; cursor:pointer; white-space:nowrap; flex-shrink:0;
      }
      .sr-small-btn:hover { background:#f0eeff; }
      .sr-small-btn.active { background:#fff8e1; border-color:#fdcb6e; color:#d4a017; }

      #_sr_smart_summary {
        width:calc(100% - 28px); padding:8px; margin:6px 14px 0; border-radius:8px; border:none;
        background:linear-gradient(135deg,#a855f7,#c084fc); color:#fff;
        font-size:13px; font-weight:700; cursor:pointer; flex-shrink:0;
        box-shadow:0 2px 8px rgba(168,85,247,.3);
      }
      #_sr_smart_summary:hover { filter:brightness(1.05); }
      #_sr_smart_summary:disabled { opacity:.6; cursor:not-allowed; }

      #_sr_multi_select_bar {
        display:none; align-items:center; gap:6px; padding:6px 14px; flex-shrink:0;
        background:#fff8e1; border-bottom:1px solid #fdcb6e;
      }
      #_sr_multi_select_bar.show { display:flex; }
      #_sr_multi_select_count { font-size:12px; color:#d4a017; font-weight:600; flex:1; }
      .sr-multi-btn { padding:4px 10px; border-radius:6px; border:1.5px solid #fdcb6e; background:#fff; color:#d4a017; font-size:11px; font-weight:700; cursor:pointer; }
      .sr-multi-btn:hover { background:#fff8e1; }

      #_sr_messages {
        flex:1; padding:12px 14px 6px; overflow-y:auto; overflow-x:hidden;
        display:flex; flex-direction:column; gap:10px; min-height:0;
      }
      .sr-bubble { max-width:92%; padding:10px 13px; border-radius:14px; font-size:14px; line-height:1.6; word-break:break-word; overflow-wrap:anywhere; position:relative; }
      .sr-bubble.user { align-self:flex-end; background:#6c5ce7; color:#fff; border-bottom-right-radius:4px; }
      .sr-bubble.ai { align-self:flex-start; background:#f4f3ff; color:#2d3436; border-bottom-left-radius:4px; }
      .sr-bubble.ai .sr-card-btn-row { display:flex; gap:6px; margin-top:8px; flex-wrap:wrap; }
      .sr-bubble.ai .sr-card-btn {
        padding:5px 10px; background:#fff; border:1.5px solid #a29bfe; border-radius:20px;
        font-size:12px; color:#6c5ce7; cursor:pointer; text-align:center;
      }
      .sr-bubble.ai .sr-card-btn:hover { background:#f0eeff; }
      .sr-bubble .sr-msg-select {
        position:absolute; top:6px; right:6px;
        width:18px; height:18px; cursor:pointer; accent-color:#fdcb6e;
      }
      .sr-bubble.selected { outline:2px solid #fdcb6e; outline-offset:1px; }
      .sr-thinking { align-self:flex-start; font-size:13px; color:#aaa; padding:8px 12px; font-style:italic; }
      #_sr_input_area { padding:8px 14px 14px; border-top:1px solid #eee; flex-shrink:0; }
      #_sr_new_chat {
        width:100%; padding:6px; border-radius:8px; border:1.5px solid #ddd;
        background:#fafafa; font-size:12px; color:#888; cursor:pointer; margin-bottom:8px;
      }
      #_sr_new_chat:hover { border-color:#a29bfe; color:#6c5ce7; }
      #_sr_input_row { display:flex; gap:8px; }
      #_sr_input {
        flex:1; border:1.5px solid #ddd; border-radius:10px;
        padding:9px 12px; font-size:14px; outline:none; resize:none;
        min-height:40px; max-height:120px; transition:border-color .2s;
      }
      #_sr_input:focus { border-color:#6c5ce7; }
      #_sr_send {
        width:40px; height:40px; border-radius:10px; border:none;
        background:#6c5ce7; color:#fff; font-size:18px; cursor:pointer;
        display:flex; align-items:center; justify-content:center; flex-shrink:0;
      }
      #_sr_send:hover { background:#5a4bd1; }
      #_sr_send:disabled { background:#ccc; cursor:not-allowed; }
      #_sr_cards_pane { padding:14px; gap:10px; min-height:0; }
      #_sr_cards_sum_btn {
        width:100%; padding:10px; border-radius:10px; border:none;
        background:linear-gradient(135deg,#00b894,#55efc4); color:#fff;
        font-size:14px; font-weight:700; cursor:pointer; margin-bottom:4px; flex-shrink:0;
      }
      .sr-card-filter-row { display:flex; gap:6px; margin-bottom:6px; flex-wrap:wrap; flex-shrink:0; }
      .sr-card-filter-btn {
        flex:1; padding:5px 8px; border-radius:6px; border:1.5px solid #ddd;
        background:#fafafa; font-size:11px; cursor:pointer; font-weight:600; color:#888;
      }
      .sr-card-filter-btn.active.all { border-color:#6c5ce7; background:#f0eeff; color:#6c5ce7; }
      .sr-card-filter-btn.active.define { border-color:#0984e3; background:#e3f2ff; color:#0984e3; }
      .sr-card-filter-btn.active.discuss { border-color:#00b894; background:#e0fff5; color:#00b894; }
      .sr-card-filter-btn.active.note { border-color:#d4a017; background:#fff8e1; color:#d4a017; }
      .sr-card-filter-btn.active.smart { border-color:#9b51e0; background:#f8edff; color:#9b51e0; }
      .sr-card-filter-btn.favorite { color:#f6b800; }
      .sr-card-filter-btn.active.favorite { border-color:#f6b800; background:#fff8e1; color:#d4a017; }
      .sr-card-section-label { font-size:11px; font-weight:700; color:#aaa; margin:6px 0 4px; text-transform:uppercase; }
      #_sr_cards_list {
        flex:1 1 0; overflow-y:auto !important; overflow-x:hidden;
        display:flex; flex-direction:column; gap:8px; min-width:0; min-height:0;
        overscroll-behavior:contain; -webkit-overflow-scrolling:touch; touch-action:pan-y; padding-bottom:20px;
      }
      .sr-card-item { border:1.5px solid #e0deff; border-radius:10px; overflow:hidden; position:relative; min-width:0; flex-shrink:0; }
      .sr-card-item.define { background:#f0f7ff; border-color:#b3d9ff; }
      .sr-card-item.discuss { background:#f0fff8; border-color:#b3ffd9; }
      .sr-card-item.note { background:#fffdf5; border-color:#fdcb6e; }
      .sr-card-item.smart { background:#fcf5ff; border-color:#dfa9ff; }
      .sr-card-item:hover { border-color:#a29bfe; }
      .sr-card-item.selected { box-shadow:0 0 0 2px #fdcb6e; }
      .sr-card-item .sr-card-check {
        position:absolute; top:8px; right:8px; width:20px; height:20px; cursor:pointer; accent-color:#fdcb6e; z-index:2;
      }
      .sr-card-head { display:flex; align-items:center; gap:6px; padding:10px 12px; cursor:pointer; }
      .sr-card-num { font-weight:800; font-size:13px; min-width:26px; }
      .sr-card-num.define { color:#0984e3; }
      .sr-card-num.discuss { color:#00b894; }
      .sr-card-num.note { color:#d4a017; }
      .sr-card-num.smart { color:#9b51e0; }
      .sr-card-type-tag { font-size:9px; font-weight:700; padding:1px 5px; border-radius:4px; flex-shrink:0; color:#fff; }
      .sr-card-type-tag.define { background:#0984e3; }
      .sr-card-type-tag.discuss { background:#00b894; }
      .sr-card-type-tag.note { background:#d4a017; }
      .sr-card-type-tag.smart { background:#9b51e0; }
      .sr-card-excerpt { flex:1; font-size:13px; color:#555; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .sr-card-favorite {
        width:32px; height:32px; padding:0; border:none; background:transparent;
        font-size:25px; line-height:1; color:#c8c8c8; cursor:pointer; flex-shrink:0;
      }
      .sr-card-favorite:hover, .sr-card-favorite.active { color:#f6b800; transform:scale(1.08); }
      .sr-card-toggle { font-size:12px; color:#aaa; }
      .sr-card-toggle.open { display:inline-block; transform:rotate(180deg); }
      .sr-card-body { padding:0 12px 12px; display:none; }
      .sr-card-body.open { display:block; }
      .sr-card-content {
        font-size:13px; line-height:1.6; color:#2d3436; background:#fff; border-radius:6px; padding:8px;
        word-break:break-word; overflow-wrap:anywhere; white-space:normal;
        min-width:0; max-width:100%; box-sizing:border-box;
        max-height:min(36vh, 280px); overflow-y:auto; overflow-x:hidden;
        overscroll-behavior:contain;
      }
      .sr-v-resize {
        height:12px; margin:6px 0 2px; cursor:ns-resize;
        display:flex; align-items:center; justify-content:center;
        border-radius:6px; flex-shrink:0; user-select:none;
      }
      .sr-v-resize::after {
        content:''; width:40px; height:3px; border-radius:2px; background:#d4d0f5;
      }
      .sr-v-resize:hover::after, .sr-v-resize.dragging::after { background:#6c5ce7; }
      .sr-v-resize:hover, .sr-v-resize.dragging { background:rgba(108,92,231,.08); }
      .sr-card-source {
        margin-bottom:8px; padding:8px 10px; border-radius:7px; background:rgba(255,255,255,.82);
        border-left:3px solid #a29bfe; color:#555; font-size:12px; line-height:1.55;
        cursor:pointer; word-break:break-word; overflow-wrap:anywhere; overflow:hidden;
      }
      .sr-card-source:hover { background:#fff; color:#6c5ce7; }
      .sr-card-source-label { display:block; color:#888; font-size:10px; font-weight:800; margin-bottom:3px; }
      .sr-card-meta { font-size:11px; color:#aaa; margin-top:6px; }
      .sr-card-meta a { color:#6c5ce7; cursor:pointer; text-decoration:underline; }
      .sr-card-btns { display:flex; gap:6px; margin-top:8px; flex-wrap:wrap; flex-shrink:0; position:relative; z-index:1; }
      .sr-card-edit-btn, .sr-card-del-btn, .sr-card-trace-btn, .sr-card-loc-btn {
        padding:5px 10px; border-radius:6px; border:1.5px solid;
        font-size:12px; cursor:pointer; font-weight:600; background:#fff;
      }
      .sr-card-edit-btn { border-color:#6c5ce7; color:#6c5ce7; }
      .sr-card-del-btn { border-color:#ff7675; color:#ff7675; }
      .sr-card-trace-btn { border-color:#fdcb6e; color:#d4a017; }
      .sr-card-loc-btn { border-color:#0984e3; color:#0984e3; }
      #_sr_cards_empty { color:#aaa; font-size:13px; text-align:center; padding:30px 0; display:none; }
      #_sr_cards_sel_bar {
        display:none; align-items:center; gap:6px; padding:8px 14px; flex-shrink:0;
        background:#e0fff5; border-bottom:1px solid #00b894; margin-bottom:6px;
      }
      #_sr_cards_sel_bar.show { display:flex; }
      #_sr_cards_sel_count { font-size:12px; color:#00b894; font-weight:600; flex:1; }
      #_sr_cards_sel_gen { padding:6px 14px; border-radius:8px; border:none; background:#00b894; color:#fff; font-size:12px; font-weight:700; cursor:pointer; }
      #_sr_cards_sel_gen:hover { background:#019a82; }
      #_sr_cards_sel_all { padding:6px 14px; border-radius:8px; border:1.5px solid #00b894; background:#fff; color:#00b894; font-size:12px; font-weight:600; cursor:pointer; }
      #_sr_cards_sel_all:hover { background:#e0fff5; }
      #_sr_cards_sel_cancel { padding:6px 14px; border-radius:8px; border:1.5px solid #00b894; background:#fff; color:#00b894; font-size:12px; font-weight:600; cursor:pointer; }

      #_sr_card_editor {
        position:fixed; inset:0; z-index:2147483645;
        background:rgba(0,0,0,.4); display:none; align-items:center; justify-content:center;
      }
      #_sr_card_editor.open { display:flex; }
      #_sr_card_modal {
        background:#fff; border-radius:16px; width:480px; max-width:95vw;
        max-height:90vh; overflow-y:auto; overflow-x:hidden; padding:24px;
        box-shadow:0 20px 60px rgba(0,0,0,.2);
      }
      #_sr_card_modal h3 { margin:0 0 14px; font-size:16px; color:#2d3436; }
      #_sr_card_modal label { font-size:12px; font-weight:700; color:#888; display:block; margin-bottom:4px; }
      #_sr_card_edit_text {
        width:100%; min-height:120px; max-height:200px; border:1.5px solid #ddd; border-radius:10px;
        padding:10px 12px; font-size:14px; line-height:1.6; resize:vertical; outline:none; margin-bottom:14px;
      }
      #_sr_card_edit_text:focus { border-color:#6c5ce7; }
      .sr-card-type-row { display:flex; gap:8px; margin-bottom:10px; }
      .sr-card-type-btn {
        flex:1; padding:8px; border-radius:8px; border:1.5px solid #ddd;
        background:#fafafa; font-size:13px; cursor:pointer; font-weight:600; color:#888;
      }
      .sr-card-type-btn.active.define { border-color:#0984e3; background:#e3f2ff; color:#0984e3; }
      .sr-card-type-btn.active.discuss { border-color:#00b894; background:#e0fff5; color:#00b894; }
      .sr-card-type-btn.active.note { border-color:#d4a017; background:#fff8e1; color:#d4a017; }
      .sr-card-type-btn.active.smart { border-color:#9b51e0; background:#f8edff; color:#9b51e0; }
      #_sr_card_ai_row { display:flex; gap:8px; margin-bottom:10px; }
      #_sr_card_ai_input { flex:1; border:1.5px solid #ddd; border-radius:8px; padding:8px 12px; font-size:13px; outline:none; }
      #_sr_card_ai_input:focus { border-color:#6c5ce7; }
      #_sr_card_ai_btn {
        padding:8px 14px; border-radius:8px; border:none; background:#6c5ce7; color:#fff;
        font-size:13px; cursor:pointer; white-space:nowrap;
      }
      #_sr_card_ai_btn:hover { background:#5a4bd1; }
      #_sr_card_ai_btn:disabled { background:#ccc; cursor:not-allowed; }
      #_sr_card_modal_btns { display:flex; gap:8px; margin-top:14px; }
      #_sr_card_save_btn { flex:1; padding:10px; border-radius:8px; border:none; background:#6c5ce7; color:#fff; font-size:14px; font-weight:700; cursor:pointer; }
      #_sr_card_cancel_btn { padding:10px 18px; border-radius:8px; border:1.5px solid #ddd; background:#fff; color:#666; font-size:14px; cursor:pointer; }

      .sr-anchor-badge-wrap {
        display:inline-block !important; position:relative !important;
        width:0 !important; height:0 !important; line-height:0 !important;
        margin:0 !important; padding:0 !important; border:none !important;
        vertical-align:baseline !important; overflow:visible !important;
        font-size:0 !important; background:transparent !important;
        float:none !important; transform:none !important;
        max-width:none !important; max-height:none !important;
        pointer-events:none !important;
      }
      .sr-anchor-badge {
        position:absolute !important; left:2px; bottom:0.35em !important; top:auto !important;
        display:inline-block !important; color:#fff !important;
        font-size:10px !important; font-weight:800 !important; font-style:normal !important;
        font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif !important;
        border-radius:8px !important; padding:1px 5px !important; margin:0 !important;
        cursor:pointer !important; line-height:1.4 !important; white-space:nowrap !important;
        width:auto !important; height:auto !important; max-width:none !important; max-height:none !important;
        float:none !important; transform:none !important; letter-spacing:0 !important;
        z-index:2147483000 !important; pointer-events:auto !important;
        box-shadow:0 1px 2px rgba(0,0,0,.2);
      }
      .sr-anchor-badge.define { background:#0984e3 !important; }
      .sr-anchor-badge.discuss { background:#00b894 !important; }
      .sr-anchor-badge.note { background:#d4a017 !important; }
      .sr-anchor-badge.smart { background:#9b51e0 !important; }
      .sr-preview-bubble {
        display:none; position:fixed; left:0; top:0;
        background:#fff; color:#2d3436;
        font-size:12px; border-radius:10px; padding:0;
        width:300px; max-width:min(320px, calc(100vw - 16px));
        max-height:min(70vh, 420px); line-height:1.55; z-index:2147483642;
        box-shadow:0 8px 24px rgba(0,0,0,.22);
        flex-direction:column; overflow:hidden;
        white-space:normal; word-break:break-word; overflow-wrap:anywhere;
        box-sizing:border-box;
      }
      .sr-preview-bubble.show { display:flex; }
      .sr-preview-head {
        display:flex; align-items:center; gap:6px; flex-shrink:0;
        padding:8px 10px; border-bottom:1px solid #eee; background:#fafafa;
      }
      .sr-preview-title { font-size:12px; font-weight:700; color:#6c5ce7; flex:1; min-width:0; }
      .sr-preview-open, .sr-preview-close {
        border:none; background:transparent; cursor:pointer; padding:2px 6px;
        font-size:12px; color:#666; border-radius:4px; flex-shrink:0;
      }
      .sr-preview-open { color:#6c5ce7; font-weight:700; }
      .sr-preview-open:hover, .sr-preview-close:hover { background:#f0eeff; }
      .sr-preview-body {
        flex:1; min-height:0; overflow-y:auto !important; overflow-x:hidden !important;
        overscroll-behavior:contain; -webkit-overflow-scrolling:touch;
        padding:10px 12px 12px; white-space:normal !important; word-break:break-word; overflow-wrap:anywhere;
        touch-action:pan-y;
      }
      #_sr_flash_layer {
        position:fixed !important; inset:0 !important; pointer-events:none !important;
        z-index:2147483630 !important; overflow:visible !important;
        background:transparent !important; margin:0 !important; padding:0 !important;
        border:none !important;
      }
      .sr-source-flash-box {
        position:fixed !important; pointer-events:none !important;
        margin:0 !important; padding:0 !important; border:none !important;
        border-radius:3px !important; box-sizing:border-box !important;
        background:rgba(255, 211, 70, .42) !important;
        box-shadow:0 0 0 2px rgba(246,184,0,.75) !important;
        animation:_sr_source_flash_box 1.8s ease;
      }
      @keyframes _sr_source_flash_box { 0%,100%{opacity:0} 18%,72%{opacity:1} }

      #_sr_summary_modal_wrap {
        position:fixed; inset:0; z-index:2147483645;
        background:rgba(0,0,0,.4); display:none; align-items:center; justify-content:center;
      }
      #_sr_summary_modal_wrap.open { display:flex; }
      #_sr_summary_modal {
        background:#fff; border-radius:16px; width:560px; max-width:95vw;
        max-height:88vh; overflow-y:auto; overflow-x:hidden; padding:24px;
        box-shadow:0 20px 60px rgba(0,0,0,.2);
      }
      #_sr_summary_modal h3 { margin:0 0 14px; font-size:16px; }
      #_sr_summary_modal_body { font-size:14px; line-height:1.8; color:#2d3436; background:#f8f8ff; border-radius:8px; padding:14px; max-height:500px; overflow-y:auto; }
      #_sr_summary_modal_btns { display:flex; gap:8px; margin-top:14px; flex-wrap:wrap; }
      .sr-sm-btn { flex:1; padding:10px; border-radius:8px; font-size:13px; font-weight:700; cursor:pointer; border:none; min-width:100px; }
      #_sr_sm_save { background:#6c5ce7; color:#fff; }
      #_sr_sm_copy { background:#00b894; color:#fff; }
      #_sr_sm_download { background:#0984e3; color:#fff; }
      #_sr_sm_close { background:#eee; color:#555; }
      #_sr_report_pane { padding:14px; gap:10px; min-height:0; overflow:hidden; }
      #_sr_report_gen_full {
        width:100%; padding:10px; border-radius:10px; border:none;
        background:linear-gradient(135deg,#6c5ce7,#a29bfe); color:#fff;
        font-size:14px; font-weight:700; cursor:pointer; margin-bottom:6px; flex-shrink:0;
      }
      #_sr_report_list { flex:1 1 0; overflow-y:auto !important; overflow-x:hidden; display:flex; flex-direction:column; gap:8px; min-width:0; min-height:0; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; padding-bottom:20px; }
      .sr-report-item {
        border:1.5px solid #e0deff; border-radius:10px; overflow:hidden;
        flex-shrink:0; min-width:0; max-width:100%; box-sizing:border-box; background:#fff;
        position:relative;
      }
      .sr-report-item.dialog { border-color:#b3d9ff; }
      .sr-report-item.card { border-color:#b3ffd9; }
      .sr-report-item.full { border-color:#a29bfe; }
      .sr-report-item.discuss { border-color:#fdcb6e; }
      .sr-report-head { display:flex; align-items:center; gap:6px; padding:10px 12px; cursor:pointer; }
      .sr-report-type-tag { font-size:9px; font-weight:700; padding:1px 5px; border-radius:4px; flex-shrink:0; color:#fff; }
      .sr-report-type-tag.dialog { background:#0984e3; }
      .sr-report-type-tag.card { background:#00b894; }
      .sr-report-type-tag.full { background:#6c5ce7; }
      .sr-report-type-tag.discuss { background:#fdcb6e; }
      .sr-report-title { flex:1; font-size:13px; color:#555; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .sr-report-time { font-size:11px; color:#aaa; flex-shrink:0; }
      .sr-report-toggle { font-size:12px; color:#aaa; }
      .sr-report-toggle.open { display:inline-block; transform:rotate(180deg); }
      .sr-report-body { padding:0 12px 12px; display:none; min-width:0; overflow:hidden !important; }
      .sr-report-body.open { display:block; }
      .sr-report-content {
        font-size:13px; line-height:1.7; color:#2d3436; background:#f8f8ff; border-radius:6px; padding:8px;
        word-break:break-word; overflow-wrap:anywhere; white-space:normal;
        min-width:0; max-width:100%; box-sizing:border-box;
        max-height:min(36vh, 280px); overflow-y:auto; overflow-x:hidden;
        overscroll-behavior:contain; -webkit-overflow-scrolling:touch;
      }
      .sr-report-content, .sr-report-content *:not(button) { float:none !important; max-width:100%; }
      .sr-report-content p, .sr-report-content li, .sr-report-content h2,
      .sr-report-content h3, .sr-report-content h4, .sr-report-content pre {
        position:static !important; top:auto !important; left:auto !important;
        transform:none !important; z-index:auto !important;
        white-space:normal; word-break:break-word; overflow-wrap:anywhere;
      }
      .sr-report-content .sr-md-codeblock, .sr-report-content pre {
        white-space:pre !important; overflow-x:auto !important; max-width:100% !important;
      }
      .sr-report-btns {
        display:flex; gap:6px; margin-top:8px; flex-wrap:wrap;
        position:static !important; z-index:auto !important; background:#fff;
      }
      .sr-report-btn { padding:5px 10px; border-radius:6px; border:1.5px solid #a29bfe; background:#fff; color:#6c5ce7; font-size:12px; cursor:pointer; font-weight:600; }
      .sr-report-btn:hover { background:#f0eeff; }
      #_sr_report_empty { color:#aaa; font-size:13px; text-align:center; padding:30px 0; display:none; }

      #_sr_mindmap_pane { padding:14px; gap:10px; }
      #_sr_mindmap_gen_btn, #_sr_mindmap_regen_btn {
        width:100%; padding:10px; border-radius:10px; border:none;
        background:linear-gradient(135deg,#7c3aed,#c084fc); color:#fff;
        font-size:14px; font-weight:700; cursor:pointer;
      }
      #_sr_mindmap_regen_btn { background:#fff; color:#7c3aed; border:1.5px solid #a78bfa; display:none; }
      #_sr_mindmap_regen_btn.show { display:block; }
      #_sr_mindmap_gen_btn:hover, #_sr_mindmap_regen_btn:hover { filter:brightness(.97); }
      #_sr_mindmap_gen_btn:disabled, #_sr_mindmap_regen_btn:disabled { opacity:.6; cursor:not-allowed; }
      #_sr_mindmap_tip { padding:8px 10px; border-radius:8px; background:#f5f3ff; color:#6d28d9; font-size:12px; line-height:1.5; }
      #_sr_mindmap_empty { color:#aaa; font-size:13px; text-align:center; padding:30px 0; display:none; }
      #_sr_mindmap_canvas { flex:1; overflow-y:auto; overflow-x:hidden; padding:2px 0 16px; min-width:0; min-height:0; }
      .sr-mm-title { font-size:17px; font-weight:800; color:#312e81; line-height:1.4; margin:6px 0 3px; }
      .sr-mm-summary { font-size:12px; line-height:1.6; color:#666; margin-bottom:12px; }
      .sr-mm-root { padding:12px; background:linear-gradient(135deg,#ede9fe,#f5f3ff); border:1.5px solid #a78bfa; border-radius:12px; margin-bottom:10px; }
      .sr-mm-root-label { font-size:14px; font-weight:800; color:#5b21b6; }
      .sr-mm-topic { position:relative; margin:10px 0 0 10px; padding:10px 10px 10px 14px; border:1.5px solid #ddd6fe; border-radius:10px; background:#fff; }
      .sr-mm-topic::before { content:''; position:absolute; left:-11px; top:20px; width:10px; border-top:2px solid #c4b5fd; }
      .sr-mm-topic.high { border-color:#f59e0b; background:#fffbeb; box-shadow:0 2px 8px rgba(245,158,11,.12); }
      .sr-mm-topic-head { display:flex; align-items:flex-start; gap:6px; }
      .sr-mm-topic-label { flex:1; font-size:13px; font-weight:800; color:#3730a3; line-height:1.45; }
      .sr-mm-topic.high .sr-mm-topic-label { color:#92400e; }
      .sr-mm-important { padding:1px 5px; border-radius:4px; background:#f59e0b; color:#fff; font-size:10px; font-weight:700; white-space:nowrap; }
      .sr-mm-topic-summary { font-size:12px; line-height:1.6; color:#666; margin:5px 0 7px; }
      .sr-mm-card-chips { display:flex; flex-wrap:wrap; gap:5px; }
      .sr-mm-card-chip { padding:4px 7px; border:1px solid #a78bfa; border-radius:12px; background:#faf5ff; color:#6d28d9; font-size:11px; cursor:pointer; }
      .sr-mm-card-chip:hover { background:#ede9fe; }
      .sr-mm-card-chip.important { border-color:#f59e0b; color:#92400e; background:#fffbeb; font-weight:700; }
      .sr-card-item.sr-card-important { border-left:4px solid #f59e0b; box-shadow:0 1px 7px rgba(245,158,11,.16); }
      .sr-card-important-badge { padding:1px 5px; border-radius:4px; background:#f59e0b; color:#fff; font-size:9px; font-weight:700; white-space:nowrap; }
      .sr-mm-toggle {
        width:20px; height:20px; flex-shrink:0; border:1px solid #c4b5fd; border-radius:6px;
        background:#fff; color:#6d28d9; font-size:11px; line-height:1; cursor:pointer;
        display:flex; align-items:center; justify-content:center; padding:0;
      }
      .sr-mm-toggle:hover { background:#ede9fe; }
      .sr-mm-toggle:disabled { opacity:.25; cursor:default; }
      .sr-mm-toggle.open { transform:rotate(90deg); }
      #_sr_mindmap_export_btn {
        width:100%; padding:8px; border-radius:8px; border:1.5px solid #a78bfa;
        background:#fff; color:#7c3aed; font-size:13px; font-weight:700; cursor:pointer; display:none;
      }
      #_sr_mindmap_export_btn.show { display:block; }
      #_sr_mindmap_export_btn:hover { background:#f5f3ff; }

      #_sr_toast {
        position:fixed; bottom:80px; left:50%; transform:translateX(-50%);
        background:#2d3436; color:#fff; padding:10px 20px; border-radius:20px;
        font-size:13px; z-index:2147483646; opacity:0; transition:opacity .3s; pointer-events:none;
      }
      #_sr_toast.show { opacity:1; }

      .sr-md-h2 { font-size:16px; font-weight:700; color:#2d3436; margin:10px 0 6px; }
      .sr-md-h3 { font-size:15px; font-weight:700; color:#2d3436; margin:8px 0 4px; }
      .sr-md-h4 { font-size:14px; font-weight:700; color:#555; margin:6px 0 3px; }
      .sr-md-ul, .sr-md-ol { margin:4px 0 6px; padding-left:20px; }
      .sr-md-ul li, .sr-md-ol li { font-size:13px; line-height:1.7; color:#2d3436; margin:2px 0; }
      .sr-md-ul li { list-style:disc; }
      .sr-md-ol li { list-style:decimal; }
      .sr-md-quote { margin:6px 0; padding:4px 10px; border-left:3px solid #a29bfe; color:#555; background:#f5f3ff; border-radius:0 6px 6px 0; }
      .sr-md-code { background:#f0f0f0; color:#e74c3c; padding:1px 5px; border-radius:4px; font-size:12px; font-family:'SF Mono',Consolas,monospace; }
      .sr-md-codeblock { background:#2d3436; color:#dfe6e9; padding:10px 12px; border-radius:8px; overflow-x:auto; margin:8px 0; font-size:12px; line-height:1.5; }
      .sr-md-codeblock code { background:none; color:inherit; padding:0; font-family:'SF Mono',Consolas,monospace; }
      .sr-md-hr { border:none; border-top:1px solid #e0e0e0; margin:10px 0; }
      .sr-bubble.ai p, .sr-bubble.ai strong, .sr-bubble.ai em { font-size:14px; line-height:1.6; }
      .sr-bubble.ai p { margin:4px 0; }
      .sr-bubble.ai .sr-md-ul, .sr-bubble.ai .sr-md-ol { margin:4px 0; }
      .sr-bubble.ai .sr-md-h2, .sr-bubble.ai .sr-md-h3, .sr-bubble.ai .sr-md-h4 { color:#2d3436; }
      #_sr_summary_modal_body p, #_sr_summary_modal_body strong, #_sr_summary_modal_body em { font-size:14px; line-height:1.8; }
      #_sr_summary_modal_body p { margin:6px 0; }
      .sr-report-content p, .sr-report-content strong, .sr-report-content em { font-size:13px; line-height:1.7; overflow-wrap:anywhere; }
      .sr-report-content p { margin:4px 0; }
      .sr-card-content p, .sr-card-content strong, .sr-card-content em { font-size:13px; line-height:1.6; overflow-wrap:anywhere; }
      .sr-card-content p { margin:3px 0; }
      #_sr_bub_reply p, #_sr_bub_reply strong, #_sr_bub_reply em { font-size:13px; line-height:1.6; overflow-wrap:anywhere; }
      #_sr_bub_reply p { margin:3px 0; }
      .sr-preview-bubble p, .sr-preview-bubble strong, .sr-preview-bubble em, .sr-preview-bubble li { color:#2d3436; white-space:normal; }
      .sr-preview-bubble .sr-md-h2, .sr-preview-bubble .sr-md-h3, .sr-preview-bubble .sr-md-h4 { color:#2d3436; }
      .sr-preview-bubble .sr-md-ul li, .sr-preview-bubble .sr-md-ol li { color:#2d3436; }
      .sr-preview-body p { margin:4px 0; }
      .sr-card-content .sr-md-h2 { color:#2d3436; font-size:14px; margin:8px 0 4px; }
      .sr-card-content .sr-md-h3 { color:#2d3436; font-size:13px; margin:6px 0 3px; }
      .sr-card-content .sr-md-h4 { color:#2d3436; font-size:13px; margin:5px 0 2px; }
      .sr-card-content .sr-md-h2:first-child, .sr-card-content .sr-md-h3:first-child,
      .sr-card-content .sr-md-h4:first-child { margin-top:0; }
      .sr-card-content .sr-md-ul, .sr-card-content .sr-md-ol { margin:2px 0 6px; padding-left:18px; }
      .sr-card-content .sr-md-ul li, .sr-card-content .sr-md-ol li { color:#2d3436; }
      .sr-card-content .sr-md-quote { font-size:12px; margin:4px 0; }
      .sr-report-content .sr-md-h2, .sr-report-content .sr-md-h3, .sr-report-content .sr-md-h4 { color:#2d3436; }
      .sr-report-content .sr-md-ul li, .sr-report-content .sr-md-ol li { color:#2d3436; }
      #_sr_summary_modal_body .sr-md-h2, #_sr_summary_modal_body .sr-md-h3, #_sr_summary_modal_body .sr-md-h4 { color:#2d3436; }
      #_sr_summary_modal_body .sr-md-ul li, #_sr_summary_modal_body .sr-md-ol li { color:#2d3436; }
    `;

    // ============================================================
    // SR_DOM — DOM 结构
    // ============================================================
    const SR_DOM = `
      <div id="_sr_bubble">
        <button id="_sr_bub_close">✕</button>
        <div id="_sr_bub_actions_main">
          <button class="sr-bub-main-btn explain" id="_sr_bub_explain">📖 解释</button>
          <button class="sr-bub-main-btn discuss" id="_sr_bub_discuss">💬 讨论</button>
          <button class="sr-bub-main-btn note" id="_sr_bub_note">📌 批注</button>
        </div>
        <div id="_sr_bub_explain_area">
          <div id="_sr_bub_reply"></div>
          <div id="_sr_bub_actions" class="hidden">
            <button class="sr-bub-btn" id="_sr_bub_card">📝 存为摘录</button>
          </div>
          <div id="_sr_bub_row">
            <input id="_sr_bub_input" placeholder="继续追问…  按 Enter 发送，转入侧面板" autocomplete="off" />
            <button id="_sr_bub_send">➤</button>
          </div>
        </div>
        <div id="_sr_bub_note_area">
          <textarea id="_sr_bub_note_input" placeholder="输入你的批注内容…"></textarea>
          <button id="_sr_bub_note_save">💾 保存批注</button>
        </div>
        <label id="_sr_bub_hl_toggle"><input type="checkbox" id="_sr_bub_hl_chk" checked /> 定位原文时高亮</label>
      </div>

      <button id="_sr_book_btn" title="打开/关闭侧面板">📖</button>

      <div id="_sr_panel">
        <div id="_sr_resize_handle"></div>
        <div id="_sr_header">
          <div class="sr-tabs">
            <div class="sr-tab active" data-tab="chat">💬 问答</div>
            <div class="sr-tab" data-tab="cards">📝 摘录</div>
            <div class="sr-tab" data-tab="report">📊 报告</div>
            <div class="sr-tab" data-tab="mindmap">🧠 导图</div>
          </div>
          <div id="_sr_header_actions">
            <div id="_sr_close">✕</div>
            <button type="button" id="_sr_dock_toggle" title="点击切换覆盖 / 停靠">覆盖</button>
          </div>
        </div>

        <div class="sr-pane active" id="_sr_chat_pane" data-pane="chat">
          <div id="_sr_dialog_list_bar">
            <select id="_sr_dialog_sel"><option value="">选择历史对话</option></select>
            <button class="sr-small-btn" id="_sr_multi_select_toggle">☑ 多选</button>
          </div>
          <button id="_sr_smart_summary">✨ 一键摘录（智能摘要）</button>
          <div id="_sr_multi_select_bar">
            <span id="_sr_multi_select_count">已选 0 条</span>
            <button class="sr-multi-btn" id="_sr_multi_select_all">☑ 全选</button>
            <button class="sr-multi-btn" id="_sr_multi_select_sum">✨ 总结为摘录</button>
            <button class="sr-multi-btn" id="_sr_multi_select_cancel">取消</button>
          </div>
          <div id="_sr_ctx_bar_wrap"></div>
          <div id="_sr_messages"></div>
          <div id="_sr_input_area">
            <button id="_sr_new_chat">＋ 新对话（清除记忆）</button>
            <div id="_sr_input_row">
              <textarea id="_sr_input" rows="1" placeholder="输入问题…按 Enter 发送（空输入让AI解释）"></textarea>
              <button id="_sr_send">➤</button>
            </div>
          </div>
        </div>

        <div class="sr-pane" id="_sr_cards_pane" data-pane="cards">
          <button id="_sr_cards_sum_btn">📊 摘录总结（选摘录生成报告）</button>
          <div id="_sr_cards_sel_bar">
            <span id="_sr_cards_sel_count">已选 0 条摘录</span>
            <button id="_sr_cards_sel_all">☑ 全选</button>
            <button id="_sr_cards_sel_gen">📊 生成报告</button>
            <button id="_sr_cards_sel_cancel">取消</button>
          </div>
          <div class="sr-card-filter-row">
            <button class="sr-card-filter-btn active all" data-filter="all">全部</button>
            <button class="sr-card-filter-btn define" data-filter="define">定义</button>
            <button class="sr-card-filter-btn note" data-filter="note">批注</button>
            <button class="sr-card-filter-btn smart" data-filter="smart">智能摘要</button>
            <button class="sr-card-filter-btn favorite" data-filter="favorite">★ 收藏</button>
          </div>
          <div id="_sr_cards_list"></div>
          <div id="_sr_cards_empty">暂无摘录，划词问答后保存吧～</div>
        </div>

        <div class="sr-pane" id="_sr_report_pane" data-pane="report">
          <button id="_sr_report_gen_full">📄 全文总结</button>
          <div id="_sr_report_list"></div>
          <div id="_sr_report_empty">暂无报告，点击上方按钮生成全文总结，或在摘录/对话中总结生成</div>
        </div>

        <div class="sr-pane" id="_sr_mindmap_pane" data-pane="mindmap">
          <button id="_sr_mindmap_gen_btn">🧠 基于文章与摘录生成导图</button>
          <button id="_sr_mindmap_regen_btn">↻ 重新生成导图</button>
          <button id="_sr_mindmap_export_btn">⬇ 导出大纲 (Markdown)</button>
          <div id="_sr_mindmap_tip">基于当前可读取的文章正文和已保存摘录生成；点击关联卡片可查看具体内容。</div>
          <div id="_sr_mindmap_canvas"></div>
          <div id="_sr_mindmap_empty">暂无导图，先保存至少一张摘录吧～</div>
        </div>
      </div>

      <div id="_sr_card_editor">
        <div id="_sr_card_modal">
          <h3>📝 编辑摘录</h3>
          <label for="_sr_card_edit_text">摘录内容（可编辑）</label>
          <textarea id="_sr_card_edit_text" placeholder="编辑摘录内容…"></textarea>
          <label for="_sr_card_ai_input">AI 修改指令</label>
          <div id="_sr_card_ai_row">
            <input id="_sr_card_ai_input" placeholder="💬 输入指令让 AI 修改…" />
            <button id="_sr_card_ai_btn">AI 改</button>
          </div>
          <label>摘录类型</label>
          <div class="sr-card-type-row">
            <button class="sr-card-type-btn active define" id="_sr_card_type_define">📖 定义摘录</button>
            <button class="sr-card-type-btn note" id="_sr_card_type_note">📌 批注</button>
            <button class="sr-card-type-btn smart" id="_sr_card_type_smart">✨ 智能摘要</button>
          </div>
          <div id="_sr_card_modal_btns">
            <button id="_sr_card_save_btn">💾 保存摘录</button>
            <button id="_sr_card_cancel_btn">取消</button>
          </div>
        </div>
      </div>

      <div id="_sr_summary_modal_wrap">
        <div id="_sr_summary_modal">
          <h3 id="_sr_sm_title">📌 总结报告</h3>
          <div id="_sr_summary_modal_body">生成中…</div>
          <div id="_sr_summary_modal_btns">
            <button class="sr-sm-btn" id="_sr_sm_save">📝 存为摘录</button>
            <button class="sr-sm-btn" id="_sr_sm_copy">📋 复制</button>
            <button class="sr-sm-btn" id="_sr_sm_download">⬇ 下载</button>
            <button class="sr-sm-btn" id="_sr_sm_close">✕ 关闭</button>
          </div>
        </div>
      </div>

      <div id="_sr_preview_bubble" class="sr-preview-bubble">
        <div class="sr-preview-head">
          <span class="sr-preview-title" id="_sr_preview_title">摘录</span>
          <button type="button" class="sr-preview-open" id="_sr_preview_open">打开摘录</button>
          <button type="button" class="sr-preview-close" id="_sr_preview_close">✕</button>
        </div>
        <div class="sr-preview-body" id="_sr_preview_body"></div>
      </div>

      <div id="_sr_toast"></div>
    `;

    // ============================================================
    // UI — CSS 注入 + DOM 结构 + 面板交互
    // ============================================================
    const UI = {
      injectCSS() {
        const style = document.createElement('style');
        style.id = '_sr_style';
        style.textContent = SR_CSS;
        document.head.appendChild(style);
      },

      injectDOM() {
        const root = document.createElement('div');
        root.id = '_sr_root';
        root.innerHTML = SR_DOM;
        document.body.appendChild(root);
      },

      initPanel() {
        Utils.$('_sr_book_btn').onclick = () => Utils.openPanel();
        Utils.$('_sr_close').onclick = () => Utils.closePanel();
        Utils.$('_sr_dock_toggle').onclick = (e) => {
          e.stopPropagation();
          Utils.togglePanelMode();
        };
        Utils.updateDockToggle();
        document.querySelectorAll('#_sr_root .sr-tab').forEach(tab => {
          tab.onclick = (e) => {
            e.stopPropagation();
            Utils.switchTab(tab.dataset.tab);
            if (tab.dataset.tab === 'cards') Cards.render();
            if (tab.dataset.tab === 'report') Report.render();
            if (tab.dataset.tab === 'mindmap') MindMap.render();
          };
        });
        const resizeHandle = Utils.$('_sr_resize_handle');
        const panel = Utils.$('_sr_panel');
        let isResizing = false, startX = 0, startWidth = 0;
        resizeHandle.addEventListener('mousedown', (e) => {
          isResizing = true; startX = e.clientX; startWidth = panel.offsetWidth;
          resizeHandle.classList.add('dragging');
          document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none';
          e.preventDefault();
        });
        document.addEventListener('mousemove', (e) => {
          if (!isResizing) return;
          let w = startWidth + (startX - e.clientX);
          if (w < 300) w = 300; if (w > 800) w = 800;
          panel.style.width = w + 'px';
          Utils.syncPanelLayout();
        });
        document.addEventListener('mouseup', () => {
          if (isResizing) {
            isResizing = false; resizeHandle.classList.remove('dragging');
            document.body.style.cursor = ''; document.body.style.userSelect = '';
          }
        });
      },
    };

    // ============================================================
    // Highlight — 角标管理 + 定位闪烁（不持久化高亮）
    // ============================================================
    const Highlight = {
      _previewEl: null,
      _previewBody: null,
      _previewPinned: false,
      _hoverTimer: null,
      _activeCardIdx: -1,
      _flashTimer: null,
      _flashLayer: null,
      _flashRange: null,
      _flashReposition: null,

      init() {
        this._previewEl = Utils.$('_sr_preview_bubble');
        this._previewBody = Utils.$('_sr_preview_body');
        const prev = this._previewEl;
        if (!prev) return;

        prev.addEventListener('mouseenter', () => {
          if (this._hoverTimer) { clearTimeout(this._hoverTimer); this._hoverTimer = null; }
        });
        prev.addEventListener('mouseleave', () => {
          if (this._previewPinned) return;
          this._hoverTimer = setTimeout(() => this._hidePreview(), 200);
        });
        prev.addEventListener('wheel', (e) => { e.stopPropagation(); }, { passive: true });
        prev.addEventListener('touchmove', (e) => { e.stopPropagation(); }, { passive: true });

        Utils.$('_sr_preview_close').onclick = (e) => {
          e.stopPropagation();
          this._previewPinned = false;
          this._hidePreview(true);
        };
        Utils.$('_sr_preview_open').onclick = (e) => {
          e.stopPropagation();
          if (this._activeCardIdx >= 0) this._openCardInPanel(this._activeCardIdx);
        };

        document.addEventListener('click', (e) => {
          if (!this._previewPinned) return;
          if (prev.contains(e.target)) return;
          if (e.target.closest && e.target.closest('.sr-anchor-badge')) return;
          this._previewPinned = false;
          this._hidePreview(true);
        }, true);
        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape' && prev.classList.contains('show')) {
            this._previewPinned = false;
            this._hidePreview(true);
          }
        });
      },

      _hidePreview(force) {
        if (this._previewPinned && !force) return;
        this._previewPinned = false;
        if (this._previewEl) this._previewEl.classList.remove('show');
      },

      _positionPreview(badgeEl) {
        const prev = this._previewEl;
        if (!prev || !badgeEl) return;
        const r = badgeEl.getBoundingClientRect();
        const pw = Math.min(300, window.innerWidth - 16);
        const ph = Math.min(prev.offsetHeight || 280, window.innerHeight * 0.7, 420);
        let left = r.left + r.width / 2 - pw / 2;
        left = Math.max(8, Math.min(left, window.innerWidth - pw - 8));
        let top = r.top - ph - 8;
        if (top < 8) top = r.bottom + 8;
        if (top + ph > window.innerHeight - 8) top = Math.max(8, window.innerHeight - ph - 8);
        prev.style.left = left + 'px';
        prev.style.top = top + 'px';
      },

      _showPreview(badgeEl, cardIdx, pinned) {
        const cards = Store.get('cards');
        const card = cards[cardIdx];
        if (!card || !this._previewEl || !this._previewBody) return;
        if (this._hoverTimer) { clearTimeout(this._hoverTimer); this._hoverTimer = null; }
        this._activeCardIdx = cardIdx;
        if (pinned) this._previewPinned = true;
        Utils.$('_sr_preview_title').textContent = `摘录 [${cardIdx + 1}] · ${Utils.cardTypeLabel(card.type)}`;
        Markdown.set(this._previewBody, card.text);
        this._previewBody.scrollTop = 0;
        this._previewEl.classList.add('show');
        this._positionPreview(badgeEl);
        requestAnimationFrame(() => this._positionPreview(badgeEl));
      },

      _openCardInPanel(cardIdx) {
        const cards = Store.get('cards');
        if (!cards[cardIdx]) return;
        Cards.locateInArticle(cardIdx);
        Utils.openPanel();
        Utils.switchTab('cards');
        cards.forEach(c => c.expanded = false);
        cards[cardIdx].expanded = true;
        Store.set('cards', cards);
        Cards.render();
        setTimeout(() => {
          const el = document.querySelector(`.sr-card-item[data-card-idx="${cardIdx}"]`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 300);
      },

      isInEditor(range) {
        let node = range.commonAncestorContainer;
        if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
        while (node && node !== document.body) {
          if (node.isContentEditable) return true;
          node = node.parentNode;
        }
        return false;
      },

      _shouldSkipEl(el) {
        if (!el || el.nodeType !== 1) return false;
        if (el.id === '_sr_root' || (el.closest && el.closest('#_sr_root'))) return true;
        if (el.classList && el.classList.contains('sr-anchor-badge-wrap')) return true;
        const tag = el.tagName;
        return tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'TEXTAREA';
      },

      // 从某一点向前/向后收集正文（跳过角标和插件 UI），用于还原选区和提取上下文
      _collectTextToward(originNode, originOffset, dir, maxLen) {
        const chunks = [];
        const isBefore = dir === 'before';
        if (!originNode || maxLen <= 0) return { chunks, joined: '' };
        const total = () => chunks.reduce((n, c) => n + c.text.length, 0);
        const takeText = (textNode, start, end) => {
          if (total() >= maxLen) return;
          if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return;
          if (textNode.parentElement && this._shouldSkipEl(textNode.parentElement)) return;
          const s = Math.max(0, start);
          const e = Math.min(textNode.nodeValue.length, end);
          if (e <= s) return;
          let text = textNode.nodeValue.slice(s, e);
          const remain = maxLen - total();
          if (text.length > remain) {
            if (isBefore) {
              const cut = text.length - remain;
              text = text.slice(cut);
              chunks.unshift({ node: textNode, start: s + cut, end: e, text });
            } else {
              text = text.slice(0, remain);
              chunks.push({ node: textNode, start: s, end: s + text.length, text });
            }
          } else {
            const item = { node: textNode, start: s, end: e, text };
            if (isBefore) chunks.unshift(item);
            else chunks.push(item);
          }
        };
        const visitEl = (el) => {
          if (!el || el.nodeType !== 1 || this._shouldSkipEl(el) || total() >= maxLen) return;
          const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
            acceptNode: (n) => (n.parentElement && this._shouldSkipEl(n.parentElement)
              ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT)
          });
          const texts = [];
          let n;
          while ((n = walker.nextNode())) texts.push(n);
          if (isBefore) {
            for (let i = texts.length - 1; i >= 0 && total() < maxLen; i--) {
              takeText(texts[i], 0, texts[i].nodeValue.length);
            }
          } else {
            for (let i = 0; i < texts.length && total() < maxLen; i++) {
              takeText(texts[i], 0, texts[i].nodeValue.length);
            }
          }
        };
        let seed = originNode;
        if (originNode.nodeType === Node.TEXT_NODE) {
          if (isBefore) takeText(originNode, 0, originOffset);
          else takeText(originNode, originOffset, originNode.nodeValue.length);
        } else if (originNode.nodeType === Node.ELEMENT_NODE) {
          if (isBefore) {
            const child = originNode.childNodes[originOffset - 1];
            if (child) {
              if (child.nodeType === Node.TEXT_NODE) takeText(child, 0, child.nodeValue.length);
              else visitEl(child);
              seed = child;
            }
          } else {
            const child = originNode.childNodes[originOffset];
            if (child) {
              if (child.nodeType === Node.TEXT_NODE) takeText(child, 0, child.nodeValue.length);
              else visitEl(child);
              seed = child;
            }
          }
        }
        let cur = seed;
        while (cur && total() < maxLen) {
          let sib = isBefore ? cur.previousSibling : cur.nextSibling;
          while (sib && total() < maxLen) {
            if (sib.nodeType === Node.TEXT_NODE) takeText(sib, 0, sib.nodeValue.length);
            else if (sib.nodeType === Node.ELEMENT_NODE) visitEl(sib);
            sib = isBefore ? sib.previousSibling : sib.nextSibling;
          }
          cur = cur.parentNode;
          if (!cur || cur === document.documentElement || cur === document.body) break;
        }
        return { chunks, joined: chunks.map(c => c.text).join('') };
      },

      _rangeFromChunks(chunks, start, end) {
        if (!chunks.length) return null;
        const pointAt = (pos) => {
          let acc = 0;
          for (let i = 0; i < chunks.length; i++) {
            const len = chunks[i].text.length;
            if (pos <= acc + len) {
              return { node: chunks[i].node, offset: chunks[i].start + (pos - acc) };
            }
            acc += len;
          }
          const last = chunks[chunks.length - 1];
          return { node: last.node, offset: last.end };
        };
        const s = pointAt(start);
        const e = pointAt(end);
        const range = document.createRange();
        range.setStart(s.node, s.offset);
        range.setEnd(e.node, e.offset);
        return range;
      },

      // 提取锚点上下文：优先用真实选区 Range 的前后文，避免 innerText.indexOf 命中第一次出现
      extractAnchorText(selectedText, range) {
        const ctxLen = 40;
        const selected = String(selectedText || '');
        try {
          if (range && range.startContainer) {
            const before = this._collectTextToward(range.startContainer, range.startOffset, 'before', ctxLen).joined.slice(-ctxLen);
            const after = this._collectTextToward(range.endContainer, range.endOffset, 'after', ctxLen).joined.slice(0, ctxLen);
            return { selected, before, after };
          }
          const bodyText = document.body.innerText || '';
          const idx = bodyText.indexOf(selected);
          if (idx >= 0) {
            const before = bodyText.substring(Math.max(0, idx - ctxLen), idx);
            const after = bodyText.substring(idx + selected.length, idx + selected.length + ctxLen);
            return { selected, before: before.slice(-ctxLen), after: after.slice(0, ctxLen) };
          }
        } catch (e) { console.warn('[智读笔记] 提取锚点上下文失败:', e); }
        return { selected, before: '', after: '' };
      },

      // 创建一个 badge 元素（序号 + hover/click 预览；预览卡片挂在 #_sr_root，避免被原文 overflow/nowrap 裁切）
      _createBadge(cardIdx) {
        const cards = Store.get('cards');
        const card = cards[cardIdx];
        if (!card) return null;
        const badge = document.createElement('span');
        badge.className = `sr-anchor-badge ${card.type}`;
        badge.setAttribute('data-sr-card-id', String(card.id));
        const num = document.createElement('span');
        num.textContent = `[${cardIdx + 1}]`;
        badge.appendChild(num);

        badge.addEventListener('mouseenter', () => {
          const curIdx = Store.get('cards').findIndex(c => c.id === card.id);
          if (curIdx < 0) return;
          this._showPreview(badge, curIdx, false);
        });
        badge.addEventListener('mouseleave', () => {
          this._hoverTimer = setTimeout(() => this._hidePreview(), 280);
        });
        badge.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          const curIdx = Store.get('cards').findIndex(c => c.id === card.id);
          if (curIdx < 0) return;
          this._showPreview(badge, curIdx, true);
          this._openCardInPanel(curIdx);
        };
        return badge;
      },

      _isBadgeWrap(node) {
        return !!(node && node.nodeType === 1 && node.classList && node.classList.contains('sr-anchor-badge-wrap'));
      },

      _skipEmpty(node, dir) {
        let n = node;
        while (n && n.nodeType === Node.TEXT_NODE && !(n.textContent || '').length) {
          n = dir === 'prev' ? n.previousSibling : n.nextSibling;
        }
        return n;
      },

      _collectBadgeGroup(wrap) {
        if (!this._isBadgeWrap(wrap)) return [];
        let first = wrap;
        for (;;) {
          const prev = this._skipEmpty(first.previousSibling, 'prev');
          if (!this._isBadgeWrap(prev)) break;
          first = prev;
        }
        const wraps = [];
        let n = first;
        while (this._isBadgeWrap(n)) {
          wraps.push(n);
          n = this._skipEmpty(n.nextSibling, 'next');
        }
        return wraps;
      },

      _moveToGroupEnd(wrap) {
        const group = this._collectBadgeGroup(wrap);
        if (group.length < 2 || !wrap.parentNode) return;
        const last = group[group.length - 1];
        if (last !== wrap) wrap.parentNode.insertBefore(wrap, last.nextSibling);
      },

      // 同一位置的多个角标横向排开 [n][n+1][n+2]，互不遮挡，点击各自对应卡片
      _layoutBadgeGroup(wrap) {
        const group = this._collectBadgeGroup(wrap);
        let offset = 2;
        group.forEach((w, i) => {
          const badge = w.querySelector('.sr-anchor-badge');
          if (!badge) return;
          badge.style.setProperty('left', offset + 'px', 'important');
          badge.style.setProperty('z-index', String(2147483000 + i), 'important');
          offset += Math.max(badge.offsetWidth || 20, 18) + 3;
        });
      },

      anchorKey(anchorText) {
        if (!anchorText || !anchorText.selected) return '';
        return `${anchorText.before || ''}\u0001${anchorText.selected}\u0001${anchorText.after || ''}`;
      },

      _makeWrap(cardIdx) {
        const badge = this._createBadge(cardIdx);
        if (!badge) return null;
        const wrap = document.createElement('span');
        wrap.className = 'sr-anchor-badge-wrap';
        wrap.appendChild(badge);
        return wrap;
      },

      // 用零尺寸 wrap 包裹 badge，插入到原文末尾；多个角标追加到同一组后面并横向排开
      insertBadge(range, cardIdx, afterWrap) {
        const anchor = (afterWrap && afterWrap.isConnected) ? afterWrap : null;
        if (!anchor) {
          if (!range) return null;
          try {
            if (this.isInEditor(range)) {
              Utils.showToast('⚠️ 检测到编辑模式，请退出编辑模式后再添加摘录');
              return null;
            }
          } catch (e) {
            console.warn('[智读笔记] 检测编辑模式失败:', e);
          }
        }
        const wrap = this._makeWrap(cardIdx);
        if (!wrap) return null;
        try {
          if (anchor && anchor.parentNode) {
            const group = this._collectBadgeGroup(anchor);
            const last = group[group.length - 1] || anchor;
            last.parentNode.insertBefore(wrap, last.nextSibling);
          } else {
            const endRange = range.cloneRange();
            endRange.collapse(false);
            endRange.insertNode(wrap);
            this._moveToGroupEnd(wrap);
          }
          this._layoutBadgeGroup(wrap);
        } catch (err) {
          console.warn('[智读笔记] 插入锚点失败:', err);
          return null;
        }
        return wrap;
      },

      // 在文本节点指定偏移处插入 badge wrap
      _insertBadgeAtPosition(textNode, offset, cardIdx) {
        try {
          const wrap = this._makeWrap(cardIdx);
          if (!wrap) return null;
          const range = document.createRange();
          range.setStart(textNode, Math.min(offset, textNode.length));
          range.insertNode(wrap);
          this._moveToGroupEnd(wrap);
          const cards = Store.get('cards');
          if (cards[cardIdx]) cards[cardIdx].badge = wrap;
          this._layoutBadgeGroup(wrap);
          return wrap;
        } catch (e) {
          console.warn('[智读笔记] 还原锚点插入失败:', e);
          return null;
        }
      },

      // 刷新后还原所有 badge：同一原文位置的多条摘要合并插入，依次跟在后面
      restoreBadges() {
        const cards = Store.get('cards');
        const groups = new Map();
        cards.forEach((card, idx) => {
          if (card.badge && card.badge.isConnected) return;
          card.badge = null;
          const key = this.anchorKey(card.anchorText);
          if (!key) return;
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key).push(idx);
        });
        let restored = 0;
        groups.forEach((indices) => {
          const firstIdx = indices[0];
          const card = cards[firstIdx];
          const selected = card.anchorText.selected;
          const before = card.anchorText.before || '';
          const after = card.anchorText.after || '';
          const fullPattern = before + selected + after;
          let wrap = null;
          if (fullPattern.length > selected.length) {
            wrap = this._findAndInsertBadge(fullPattern, selected, before, firstIdx);
          }
          if (!wrap) wrap = this._findAndInsertBadge(selected, selected, '', firstIdx);
          if (!wrap) return;
          cards[firstIdx].badge = wrap;
          restored++;
          let prev = wrap;
          for (let i = 1; i < indices.length; i++) {
            const next = this.insertBadge(null, indices[i], prev);
            if (!next) continue;
            cards[indices[i]].badge = next;
            prev = next;
            restored++;
          }
          this._layoutBadgeGroup(prev);
        });
        if (restored > 0) {
          Store.state.cards = cards;
          console.log(`[智读笔记] 还原了 ${restored} 个锚点标记`);
        }
      },

      _findAndInsertBadge(fullPattern, selected, before, cardIdx) {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
        let node;
        while ((node = walker.nextNode())) {
          if (node.parentElement && (node.parentElement.closest('#_sr_root') || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(node.parentElement.tagName))) continue;
          const text = node.textContent;
          let pos = text.indexOf(fullPattern);
          if (pos >= 0) {
            const selectedEnd = before ? pos + before.length + selected.length : pos + selected.length;
            return this._insertBadgeAtPosition(node, selectedEnd, cardIdx);
          }
          if (fullPattern === selected) {
            pos = text.indexOf(selected);
            if (pos >= 0) return this._insertBadgeAtPosition(node, pos + selected.length, cardIdx);
          }
        }
        return null;
      },

      // 按文本查找一个 Range（用于智能摘要定位插入点）
      findSourceRangeByText(needle) {
        const text = String(needle || '');
        if (!text) return null;
        const shortNeedle = text.replace(/\s+/g, ' ').trim().slice(0, Math.min(80, text.length));
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
          acceptNode(node) {
            const parent = node.parentElement;
            if (!parent || (parent.closest && parent.closest('#_sr_root')) || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(parent.tagName)) {
              return NodeFilter.FILTER_REJECT;
            }
            return node.nodeValue.replace(/\s+/g, ' ').includes(shortNeedle)
              ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
          }
        });
        const node = walker.nextNode();
        if (!node) return null;
        const idx = node.nodeValue.replace(/\s+/g, ' ').indexOf(shortNeedle);
        if (idx < 0) return null;
        const range = document.createRange();
        range.setStart(node, idx);
        range.setEnd(node, Math.min(idx + shortNeedle.length, node.nodeValue.length));
        return range;
      },

      _unwrapMark(mark) {
        if (!mark || !mark.parentNode) return;
        if (mark.closest && mark.closest('#_sr_flash_layer')) {
          mark.remove();
          return;
        }
        const p = mark.parentNode;
        while (mark.firstChild) p.insertBefore(mark.firstChild, mark);
        p.removeChild(mark);
        p.normalize();
      },

      _ensureFlashLayer() {
        if (this._flashLayer && this._flashLayer.isConnected) return this._flashLayer;
        const layer = document.createElement('div');
        layer.id = '_sr_flash_layer';
        const root = document.getElementById('_sr_root');
        (root || document.body).appendChild(layer);
        this._flashLayer = layer;
        return layer;
      },

      _clearFlashMarks() {
        if (this._flashTimer) { clearTimeout(this._flashTimer); this._flashTimer = null; }
        if (this._flashReposition) {
          window.removeEventListener('scroll', this._flashReposition, true);
          window.removeEventListener('resize', this._flashReposition);
          this._flashReposition = null;
        }
        this._flashRange = null;
        if (this._flashLayer) this._flashLayer.innerHTML = '';
        document.querySelectorAll('.sr-source-flash').forEach(mark => this._unwrapMark(mark));
      },

      _paintFlashRects(range) {
        const layer = this._ensureFlashLayer();
        layer.innerHTML = '';
        if (!range) return;
        let rects;
        try { rects = range.getClientRects(); }
        catch (e) { return; }
        const seen = new Set();
        for (let i = 0; i < rects.length; i++) {
          const r = rects[i];
          if (r.width < 1 || r.height < 1) continue;
          const key = [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)].join(',');
          if (seen.has(key)) continue;
          seen.add(key);
          const box = document.createElement('div');
          box.className = 'sr-source-flash-box';
          box.style.left = (r.left - 1) + 'px';
          box.style.top = (r.top - 1) + 'px';
          box.style.width = (r.width + 2) + 'px';
          box.style.height = (r.height + 2) + 'px';
          layer.appendChild(box);
        }
      },

      _scrollTarget(range) {
        if (!range) return null;
        const n = range.startContainer;
        return (n && n.nodeType === 1) ? n : (n && n.parentElement);
      },

      _flashOverlay(range, fallbackEl) {
        this._clearFlashMarks();
        const el = this._scrollTarget(range) || fallbackEl;
        if (el && el.scrollIntoView) {
          try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
          catch (e) { /* ignore */ }
        }
        if (!range || range.collapsed) return el;
        try { this._flashRange = range.cloneRange(); }
        catch (e) { this._flashRange = range; }
        const paint = () => {
          if (!this._flashRange) return;
          this._paintFlashRects(this._flashRange);
        };
        this._flashReposition = paint;
        window.addEventListener('scroll', paint, true);
        window.addEventListener('resize', paint);
        window._sr_flashCleanup = () => this._clearFlashMarks();
        requestAnimationFrame(() => { paint(); requestAnimationFrame(paint); });
        this._flashTimer = setTimeout(() => this._clearFlashMarks(), 1800);
        return el;
      },

      // 角标插在选区末尾：从第一个 wrap 往前还原划词 Range
      _rangeBeforeNode(endNode, selected) {
        const target = String(selected || '');
        if (!endNode) return null;
        const pack = this._collectTextToward(endNode, 0, 'before', Math.max(target.length, 1) + 64);
        if (!pack.joined) return null;
        if (!target) return null;
        let idx = pack.joined.lastIndexOf(target);
        let len = target.length;
        if (idx < 0) {
          const flex = this._matchFromEnd(pack.joined, target);
          if (flex) { idx = flex.idx; len = flex.len; }
          else { idx = Math.max(0, pack.joined.length - target.length); len = pack.joined.length - idx; }
        }
        try { return this._rangeFromChunks(pack.chunks, idx, idx + len); }
        catch (e) { return null; }
      },

      _matchFromEnd(haystack, needle) {
        const isWs = (c) => /\s/.test(c);
        let i = haystack.length;
        let j = needle.length;
        while (i > 0 && isWs(haystack[i - 1])) i--;
        while (j > 0 && isWs(needle[j - 1])) j--;
        const end = i;
        while (i > 0 && j > 0) {
          if (haystack[i - 1] === needle[j - 1]) { i--; j--; continue; }
          if (isWs(haystack[i - 1]) && isWs(needle[j - 1])) {
            while (i > 0 && isWs(haystack[i - 1])) i--;
            while (j > 0 && isWs(needle[j - 1])) j--;
            continue;
          }
          if (isWs(haystack[i - 1])) { i--; continue; }
          if (isWs(needle[j - 1])) { j--; continue; }
          return null;
        }
        if (j > 0) return null;
        return { idx: i, len: end - i };
      },

      flashNearBadge(wrap, anchorText) {
        if (!wrap || !wrap.isConnected) return null;
        const group = this._collectBadgeGroup(wrap);
        const anchor = group[0] || wrap;
        const selected = (anchorText && anchorText.selected) || '';
        const range = this._rangeBeforeNode(anchor, selected);
        return this._flashOverlay(range, wrap);
      },

      _collectArticleTextNodes() {
        const nodes = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
          acceptNode: (node) => {
            const parent = node.parentElement;
            if (!parent || this._shouldSkipEl(parent)) return NodeFilter.FILTER_REJECT;
            if (parent.closest && parent.closest('.sr-anchor-badge-wrap')) return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
          }
        });
        let n;
        while ((n = walker.nextNode())) {
          if (n.nodeValue) nodes.push(n);
        }
        return nodes;
      },

      _mapJoinedPos(nodes, pos) {
        let acc = 0;
        for (let i = 0; i < nodes.length; i++) {
          const len = nodes[i].nodeValue.length;
          if (pos <= acc + len) return { node: nodes[i], offset: pos - acc };
          acc += len;
        }
        const last = nodes[nodes.length - 1];
        return last ? { node: last, offset: last.nodeValue.length } : null;
      },

      _findRangeByAnchorText(anchorText) {
        const selected = anchorText.selected;
        const before = anchorText.before || '';
        const after = anchorText.after || '';
        const nodes = this._collectArticleTextNodes();
        if (!nodes.length || !selected) return null;
        let joined = '';
        for (let i = 0; i < nodes.length; i++) joined += nodes[i].nodeValue;
        let start = -1;
        const full = before + selected + after;
        if (before || after) {
          const pos = joined.indexOf(full);
          if (pos >= 0) start = pos + before.length;
        }
        if (start < 0) {
          let best = -1;
          let bestScore = -1;
          let from = 0;
          const beforeTail = before.slice(-Math.min(16, before.length));
          const afterHead = after.slice(0, Math.min(16, after.length));
          while (from <= joined.length) {
            const pos = joined.indexOf(selected, from);
            if (pos < 0) break;
            const b = joined.slice(Math.max(0, pos - before.length), pos);
            const a = joined.slice(pos + selected.length, pos + selected.length + after.length);
            let score = 0;
            if (before && b === before) score += 2;
            else if (beforeTail && b.endsWith(beforeTail)) score += 1;
            if (after && a === after) score += 2;
            else if (afterHead && a.startsWith(afterHead)) score += 1;
            if (score > bestScore) { bestScore = score; best = pos; }
            from = pos + 1;
          }
          start = best;
        }
        if (start < 0) return null;
        const s = this._mapJoinedPos(nodes, start);
        const e = this._mapJoinedPos(nodes, start + selected.length);
        if (!s || !e) return null;
        try {
          const range = document.createRange();
          range.setStart(s.node, s.offset);
          range.setEnd(e.node, e.offset);
          return range;
        } catch (err) {
          return null;
        }
      },

      // 无角标时的兜底：跨文本节点搜索，用 before/after 消歧，不再取全文第一处
      findAnchorElement(anchorText) {
        if (!anchorText || !anchorText.selected) return null;
        const range = this._findRangeByAnchorText(anchorText);
        if (!range) return null;
        return this._flashOverlay(range, this._scrollTarget(range));
      },
    };

    // ============================================================
    // Bubble — 划词气泡
    // ============================================================
    const Bubble = {
      el: null,

      init() {
        this.el = Utils.$('_sr_bubble');
        document.addEventListener('mouseup', this.onMouseUp, true);
        document.addEventListener('mousedown', this.onMouseDown, true);
        this._bindOutsideClick();
        window._sr_cleanup = () => {
          document.removeEventListener('mouseup', this.onMouseUp, true);
          document.removeEventListener('mousedown', this.onMouseDown, true);
          if (this._clickHandler) document.removeEventListener('click', this._clickHandler, true);
        };

        Utils.$('_sr_bub_close').onclick = () => this.hide();
        Utils.$('_sr_bub_hl_chk').onchange = (e) => {
          Store.set('highlightEnabled', e.target.checked);
          Utils.showToast(Store.get('highlightEnabled') ? '已开启定位高亮' : '已关闭定位高亮');
        };
        Utils.$('_sr_bub_explain').onclick = () => this.explain();
        Utils.$('_sr_bub_discuss').onclick = () => this.discuss();
        Utils.$('_sr_bub_note').onclick = () => this.showNote();
        Utils.$('_sr_bub_note_save').onclick = () => this.saveNote();
        Utils.$('_sr_bub_send').onclick = () => this.followUp();
        Utils.$('_sr_bub_input').addEventListener('keydown', e => {
          if (e.key === 'Enter') { e.preventDefault(); this.followUp(); }
          if (e.key === 'Escape') this.hide();
        });
        Utils.$('_sr_bub_card').onclick = () => this.saveCard();
      },

      hide() { this.el.classList.remove('show'); },

      resetContent() {
        Utils.$('_sr_bub_actions_main').style.display = 'flex';
        Utils.$('_sr_bub_explain_area').classList.remove('show');
        Utils.$('_sr_bub_reply').textContent = '';
        Utils.$('_sr_bub_reply').classList.remove('show');
        Utils.$('_sr_bub_actions').classList.add('hidden');
        Utils.$('_sr_bub_row').classList.remove('hidden');
        Utils.$('_sr_bub_input').value = '';
        Utils.$('_sr_bub_send').disabled = false;
        Utils.$('_sr_bub_note_area').classList.remove('show');
        Utils.$('_sr_bub_note_input').value = '';
        Store.set('lastReply', '');
      },

      show(text, range, rectBottom, rectLeft) {
        Store.set('lockedText', text);
        Store.set('lockedRange', range);
        const chatHistory = Store.get('chatHistory');
        const hasDialog = !!Store.get('currentDialogId') || chatHistory.filter(m => m.role !== 'system').length > 0;
        if (!hasDialog) {
          Store.set('chatHistory', [{
            role: 'system',
            content: `用户正在阅读网页，当前划词选中的上下文：\n\n${text}\n\n请基于此内容回答用户的问题。`
          }]);
        }
        Chat.renderCtxBar();
        this.resetContent();

        const vw = window.innerWidth, vh = window.innerHeight, bw = 340;
        let left = rectLeft;
        if (left + bw > vw - 8) left = vw - bw - 8;
        if (left < 8) left = 8;
        let top = rectBottom + 8;
        if (top + 200 > vh) top = Math.max(8, rectBottom - 200 - 8);
        this.el.style.left = left + 'px';
        this.el.style.top = top + 'px';
        this.el.classList.add('show');
      },

      onMouseUp(e) {
        const root = document.getElementById('_sr_root');
        if (root.contains(e.target)) return;
        if (this.el && this.el.contains(e.target)) return;
        setTimeout(() => {
          const sel = window.getSelection();
          if (!sel || sel.isCollapsed) return;
          const text = sel.toString().trim();
          if (text.length < 2) return;
          let range, rect;
          try { range = sel.getRangeAt(0); rect = range.getBoundingClientRect(); }
          catch (err) { console.warn('[智读笔记] 获取选区失败:', err); return; }
          if (Highlight.isInEditor(range)) {
            Utils.showToast('⚠️ 检测到编辑模式，请退出编辑模式后再操作');
            try { sel.removeAllRanges(); } catch (err) {}
            return;
          }
          let rectBottom = rect.bottom, rectLeft = rect.left;
          if (rectBottom === 0 && rectLeft === 0) {
            rectBottom = e.clientY || (window.innerHeight / 2);
            rectLeft = e.clientX || (window.innerWidth / 2);
          }
          const clonedRange = range.cloneRange();
          try { sel.removeAllRanges(); } catch (err) {}
          Bubble.show(text, clonedRange, rectBottom, rectLeft);
        }, 50);
      },

      onMouseDown(e) {
        if (this.el && this.el.classList.contains('show') && !this.el.contains(e.target) && !document.getElementById('_sr_root').contains(e.target)) {
          this.hide();
        }
      },

      _clickHandler: null,
      _bindOutsideClick() {
        if (this._clickHandler) return;
        this._clickHandler = (e) => {
          if (this.el && this.el.classList.contains('show') && !this.el.contains(e.target) && !document.getElementById('_sr_root').contains(e.target)) {
            this.hide();
          }
        };
        document.addEventListener('click', this._clickHandler, true);
      },

      async explain() {
        Utils.$('_sr_bub_actions_main').style.display = 'none';
        Utils.$('_sr_bub_explain_area').classList.add('show');
        Utils.$('_sr_bub_reply').textContent = '';
        Utils.$('_sr_bub_reply').classList.remove('show');
        Utils.$('_sr_bub_actions').classList.add('hidden');
        Utils.$('_sr_bub_row').classList.remove('hidden');
        Utils.$('_sr_bub_input').value = '';
        Utils.$('_sr_bub_send').disabled = true;

        const thinkDiv = document.createElement('div');
        thinkDiv.className = 'sr-bub-thinking';
        thinkDiv.textContent = 'AI 思考中…';
        Utils.$('_sr_bub_explain_area').insertBefore(thinkDiv, Utils.$('_sr_bub_reply'));

        try {
          const lockedText = Store.get('lockedText');
          const q = `请解释：${lockedText}`;
          const chatHistory = Store.get('chatHistory');
          chatHistory.push({ role: 'user', content: q });
          const sys = (chatHistory.find(m => m.role === 'system') || {}).content || '';
          const hist = chatHistory.filter(m => m.role !== 'system').slice(-12).map(m => `${m.role === 'user' ? '用户' : 'AI'}：${m.content}`).join('\n');
          const reply = await LLM.chat(`${sys ? sys + '\n\n' : ''}对话历史：\n${hist}\n\n请用简洁准确的语言解释概念，侧重定义和原理。\n\n请回答用户最新的问题。`);
          chatHistory.push({ role: 'assistant', content: reply });
          Store.set('chatHistory', chatHistory);
          Store.set('lastReply', reply);
          thinkDiv.remove();
          Markdown.set(Utils.$('_sr_bub_reply'), reply);
          Utils.$('_sr_bub_reply').classList.add('show');
          Utils.$('_sr_bub_actions').classList.remove('hidden');
          Utils.$('_sr_bub_input').placeholder = '继续追问…  按 Enter 转入侧面板';
          Chat.addMsg('user', Utils.esc(q));
          Chat.addMsg('ai', Markdown.render(reply), reply);
          Chat.saveCurrentDialog();
        } catch (e) {
          thinkDiv.remove();
          Utils.$('_sr_bub_reply').textContent = LLM.getErrMsg(e);
          Utils.$('_sr_bub_reply').classList.add('show');
        }
        Utils.$('_sr_bub_send').disabled = false;
        setTimeout(() => Utils.$('_sr_bub_input').focus(), 60);
      },

      discuss() {
        this.hide();
        Chat.saveCurrentDialog();
        const lockedText = Store.get('lockedText');
        Store.set('chatHistory', lockedText
          ? [{ role: 'system', content: `用户正在阅读网页，当前划词选中的上下文：\n\n${lockedText}\n\n请基于此内容回答用户的问题。` }]
          : []);
        Store.set('currentDialogId', null);
        Utils.$('_sr_messages').innerHTML = '';
        Chat.updateDialogSelector();
        Chat.renderCtxBar();
        Utils.openPanel();
        Utils.switchTab('chat');
        Utils.$('_sr_input').focus();
        Utils.$('_sr_input').placeholder = '输入问题…或直接发送让AI解释';
        Utils.showToast('已开启新对话，带着划词原文输入问题或直接发送');
      },

      showNote() {
        Utils.$('_sr_bub_actions_main').style.display = 'none';
        Utils.$('_sr_bub_note_area').classList.add('show');
        Utils.$('_sr_bub_note_input').value = '';
        setTimeout(() => Utils.$('_sr_bub_note_input').focus(), 60);
      },

      saveNote() {
        const noteText = Utils.$('_sr_bub_note_input').value.trim();
        if (!noteText) { Utils.showToast('请输入批注内容'); return; }
        Cards.directSave(noteText, 'note');
        Utils.$('_sr_bub_note_area').classList.remove('show');
        this.hide();
        Utils.openPanel();
        Utils.switchTab('cards');
      },

      async followUp() {
        const q = Utils.$('_sr_bub_input').value.trim();
        this.hide();
        Utils.openPanel();
        Utils.switchTab('chat');
        if (!q) { Utils.$('_sr_input').focus(); return; }
        Utils.$('_sr_input').value = q;
        await Chat.sendMessage();
      },

      saveCard() {
        const lastReply = Store.get('lastReply');
        if (lastReply) {
          Cards.directSave(lastReply, 'define');
          Utils.openPanel();
          Utils.switchTab('cards');
        }
      },
    };

    // ============================================================
    // Chat — 对话系统
    // ============================================================
    const Chat = {
      init() {
        Utils.$('_sr_send').onclick = () => this.sendMessage();
        Utils.$('_sr_input').addEventListener('keydown', e => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendMessage(); }
        });
        Utils.$('_sr_input').addEventListener('input', () => {
          const inp = Utils.$('_sr_input');
          inp.style.height = 'auto';
          inp.style.height = Math.min(inp.scrollHeight, 120) + 'px';
        });
        Utils.$('_sr_new_chat').onclick = () => this.newChat();
        Utils.$('_sr_dialog_sel').onchange = (e) => {
          const dialogId = e.target.value;
          if (dialogId) this.loadDialog(dialogId);
        };
        Utils.$('_sr_multi_select_toggle').onclick = () => this.toggleMultiSelect();
        Utils.$('_sr_multi_select_cancel').onclick = () => this.toggleMultiSelect();
        Utils.$('_sr_multi_select_all').onclick = () => this.selectAll();
        Utils.$('_sr_multi_select_sum').onclick = () => this.summarizeSelected();
        Utils.$('_sr_smart_summary').onclick = () => this.smartSummary();
      },

      extractCtxFromSys(messages) {
        const sys = (messages || []).find(m => m.role === 'system');
        if (!sys) return '';
        const m = String(sys.content || '').match(/当前划词选中的上下文：\n\n([\s\S]*?)\n\n请基于此内容/);
        return m ? m[1].trim() : '';
      },

      getDialogCtx() {
        const dlg = Store.get('dialogSessions').find(d => d.id === Store.get('currentDialogId'));
        const fromSys = this.extractCtxFromSys(Store.get('chatHistory'));
        const text = (dlg && dlg.ctxText) || fromSys || Store.get('lockedText') || '';
        let range = null;
        const liveText = Store.get('lockedText');
        const liveRange = Store.get('lockedRange');
        if (text && liveText === text && liveRange) {
          try {
            const node = liveRange.commonAncestorContainer;
            const el = node && (node.nodeType === 1 ? node : node.parentNode);
            if (el && document.contains(el)) range = liveRange;
          } catch (e) { range = null; }
        }
        if (!range && text) range = Highlight.findSourceRangeByText(text);
        const anchorText = text ? Highlight.extractAnchorText(text, range) : null;
        return { text, range, anchorText };
      },

      renderCtxBar() {
        const wrap = Utils.$('_sr_ctx_bar_wrap');
        if (!wrap) return;
        const { text } = this.getDialogCtx();
        if (!text) { wrap.innerHTML = ''; return; }
        wrap.innerHTML = `<div class="sr-ctx-bar"><div class="sr-ctx-label">📎 划词原文</div><div class="sr-ctx-text">${Utils.esc(text.slice(0, 240))}${text.length > 240 ? '…' : ''}</div></div>`;
      },

      saveSmartCards(summaries, fallbackText) {
        const ctx = this.getDialogCtx();
        const sourceText = ctx.text || String(fallbackText || '').slice(0, 500);
        let sourceRange = ctx.range;
        if (!sourceRange && sourceText) sourceRange = Highlight.findSourceRangeByText(sourceText);
        const anchorText = ctx.anchorText || (sourceText ? Highlight.extractAnchorText(sourceText, sourceRange) : null);
        let prevWrap = null;
        summaries.forEach((summary, i) => {
          const wrap = Cards.directSave(summary.content, 'smart', {
            title: summary.title,
            sourceText,
            sourceRange,
            anchorText,
            sourceKind: 'dialog',
            sourceDialogId: Store.get('currentDialogId'),
            expanded: i === 0,
            silent: true,
            afterWrap: prevWrap,
            keepRange: true,
          });
          if (wrap) prevWrap = wrap;
        });
        if (prevWrap) {
          Highlight._layoutBadgeGroup(prevWrap);
          requestAnimationFrame(() => Highlight._layoutBadgeGroup(prevWrap));
        }
        Utils.openPanel();
        Utils.switchTab('cards');
        Store.set('cardFilter', 'smart');
        document.querySelectorAll('.sr-card-filter-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === 'smart'));
        Cards.render();
      },

      addMsg(role, html, rawText) {
        const msgs = Utils.$('_sr_messages');
        const div = document.createElement('div');
        div.className = `sr-bubble ${role}`;
        div.innerHTML = html;
        if (rawText) div._rawText = rawText;
        else div._rawText = div.textContent;
        if (role === 'ai' && rawText) {
          const btnRow = document.createElement('div');
          btnRow.className = 'sr-card-btn-row';
          const cardBtn = document.createElement('button');
          cardBtn.className = 'sr-card-btn';
          cardBtn.textContent = '📝 存为摘录';
          cardBtn.onclick = () => {
            Cards.directSave(rawText, 'define');
            Utils.openPanel();
            Utils.switchTab('cards');
          };
          btnRow.appendChild(cardBtn);
          div.appendChild(btnRow);
        }
        if (Store.get('multiSelectMode')) {
          const cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.className = 'sr-msg-select';
          cb.onclick = (e) => {
            e.stopPropagation();
            const msgIdx = Array.from(msgs.children).indexOf(div);
            let sel = Store.get('selectedMsgIndices');
            if (cb.checked) { div.classList.add('selected'); if (!sel.includes(msgIdx)) sel.push(msgIdx); }
            else { div.classList.remove('selected'); sel = sel.filter(i => i !== msgIdx); }
            Store.set('selectedMsgIndices', sel);
            this.updateMultiSelectCount();
          };
          div.appendChild(cb);
        }
        msgs.appendChild(div);
        msgs.scrollTop = msgs.scrollHeight;
        return div;
      },

      addThinking(container) {
        const d = document.createElement('div');
        d.className = 'sr-thinking';
        d.textContent = 'AI 思考中…';
        container.appendChild(d);
        container.scrollTop = container.scrollHeight;
        return d;
      },

      updateMultiSelectCount() {
        Utils.$('_sr_multi_select_count').textContent = `已选 ${Store.get('selectedMsgIndices').length} 条`;
      },

      toggleMultiSelect() {
        const mode = !Store.get('multiSelectMode');
        Store.set('multiSelectMode', mode);
        if (mode) {
          Store.set('selectedMsgIndices', []);
          Utils.$('_sr_multi_select_bar').classList.add('show');
          Utils.$('_sr_multi_select_toggle').classList.add('active');
          Utils.showToast('多选模式已开启，勾选对话范围后点击「总结为摘录」');
        } else {
          Utils.$('_sr_multi_select_bar').classList.remove('show');
          Utils.$('_sr_multi_select_toggle').classList.remove('active');
          Store.set('selectedMsgIndices', []);
        }
        this._rerenderMessages();
      },

      selectAll() {
        const allMsgs = Store.get('chatHistory').filter(m => m.role !== 'system');
        const allIndices = allMsgs.map((_, i) => i);
        let sel = Store.get('selectedMsgIndices');
        if (sel.length === allIndices.length && allIndices.length > 0) {
          sel = []; Utils.$('_sr_multi_select_all').textContent = '☑ 全选';
        } else {
          sel = allIndices.slice(); Utils.$('_sr_multi_select_all').textContent = '☐ 取消全选';
        }
        Store.set('selectedMsgIndices', sel);
        this._rerenderMessages();
        const children = Array.from(Utils.$('_sr_messages').children);
        sel.forEach(idx => {
          const div = children[idx];
          const cb = div && div.querySelector('.sr-msg-select');
          if (cb) { cb.checked = true; div.classList.add('selected'); }
        });
        this.updateMultiSelectCount();
      },

      _rerenderMessages() {
        const msgs = Utils.$('_sr_messages');
        const allMsgs = Store.get('chatHistory').filter(m => m.role !== 'system');
        msgs.innerHTML = '';
        allMsgs.forEach(m => {
          if (m.role === 'user') this.addMsg('user', Utils.esc(m.content));
          else this.addMsg('ai', Markdown.render(m.content), m.content);
        });
      },

      async summarizeSelected() {
        const sel = Store.get('selectedMsgIndices');
        if (!sel.length) { Utils.showToast('请至少选择 1 条消息'); return; }
        const allMsgs = Store.get('chatHistory').filter(m => m.role !== 'system');
        sel.sort((a, b) => a - b);
        const selected = sel.map(idx => allMsgs[idx]).filter(Boolean);
        if (!selected.length) { Utils.showToast('请选择消息'); return; }
        const transcript = selected.map(m => `${m.role === 'user' ? '用户' : 'AI'}：${m.content}`).join('\n\n');
        const btn = Utils.$('_sr_multi_select_sum');
        const prevLabel = btn.textContent;
        btn.disabled = true; btn.textContent = '⏳ 生成中';
        this.saveCurrentDialog();
        try {
          const result = await LLM.chat(this.buildSmartSummaryPrompt('选中的对话', transcript));
          const summaries = this.parseSmartSummaries(result);
          if (!summaries.length) { Utils.showToast('摘要解析失败，请重试'); return; }
          this.saveSmartCards(summaries, transcript);
          this.toggleMultiSelect();
          Utils.showToast(`已生成 ${summaries.length} 条智能摘要 ✓`);
        } catch (e) {
          Utils.showToast(e.message && e.message.includes('LLMBridge') ? 'AI 接口未配置' : '智能摘要生成失败，请重试');
        } finally {
          btn.disabled = false; btn.textContent = prevLabel;
        }
      },

      async smartSummary() {
        const history = Store.get('chatHistory').filter(m => m.role !== 'system');
        if (history.length < 2) { Utils.showToast('当前对话内容太少，至少完成一轮问答'); return; }
        this.saveCurrentDialog();
        const btn = Utils.$('_sr_smart_summary');
        btn.disabled = true; btn.textContent = '⏳ 生成中';
        const transcript = history.map(m => `${m.role === 'user' ? '用户' : 'AI'}：${m.content}`).join('\n\n');
        try {
          const result = await LLM.chat(this.buildSmartSummaryPrompt('对话历史', transcript));
          const summaries = this.parseSmartSummaries(result);
          if (!summaries.length) { Utils.showToast('摘要解析失败，请重试'); return; }
          this.saveSmartCards(summaries, transcript);
          Utils.showToast(`已生成 ${summaries.length} 条智能摘要 ✓`);
        } catch (e) {
          Utils.showToast(e.message && e.message.includes('LLMBridge') ? 'AI 接口未配置' : '智能摘要生成失败，请重试');
        } finally {
          btn.disabled = false; btn.textContent = '✨ 一键摘录（智能摘要）';
        }
      },

      buildSmartSummaryPrompt(sourceLabel, transcript) {
        return `请把下面的${sourceLabel}整理成结构整齐的归纳笔记，便于日后回顾。不是逐句摘要，而是提炼后的结构化记录。条数由你判断，1 到 3 条都可以。

任务目标：
把对话从「聊天记录」整理成「可复用的知识笔记」。读者应能快速看清：问了什么、核心结论是什么、思路是怎么推进的。

必须保留：
1. 核心知识点：关键结论、定义、方法、对比、判断依据、可复用的原则或步骤。写清楚、写完整，不要只留口号。
2. 用户的提问思路：用户真正在追问什么、关心什么、问题是如何一层层推进的。用一两句点出提问主线即可，不要复述整段对话。
3. 若有明确的后续行动或待解决问题，可简要记下。

必须舍弃：
1. 细节追问、确认性问答、口头禅、客套、重复解释。
2. 过程性闲聊、试探性补充、没有独立信息量的来回。
3. 为理解当场语境才有用、日后回顾不必再看的细节。

content 必须用 Markdown 排版（卡片会按 Markdown 渲染）：
1. 用 **加粗** 标出小标题或关键词；用 - 无序列表或 1. 有序列表组织要点；必要时用 ## / ### 分小节。
2. 推荐结构：先「核心结论/知识点」（列表），再「提问思路」（一两句）。层次清楚，短句为主。
3. 不要用 \`\`\` 代码围栏包住 content 全文；content 内部也不要再套一层代码块。
4. 换行必须写成 JSON 转义 \\n，英文双引号写成 \\"。

拆分与写法（必须遵守）：
1. 默认优先 1 条。只有出现彼此独立、无法合并的多个主题时，才拆成 2 或 3 条。
2. 禁止为了凑条数而拆分。同一主题的不同细节、前后因果、问答推进，都应写在同一条里。
3. 3 条是上限，不是目标。没有必要时不要拆到 3 条。
4. 每条必须包含 title 和 content。title 不超过 12 字，概括该条核心，禁止写成「智能摘要」「摘要1」这类占位名。
5. 若有多条，条与条之间不要重复。
6. 只返回 JSON 数组，不要用 Markdown 代码块包裹整个回复，不要输出任何 JSON 以外的文字：
[{"title":"小标题","content":"**核心结论**\\n- 要点一\\n- 要点二\\n\\n**提问思路**\\n用户从X追问到Y。"}]

${sourceLabel}：
${transcript}`;
      },

      _fallbackSmartTitle(text, i) {
        const line = String(text || '').replace(/^#+\s*/, '').split(/\n/)[0].replace(/[*_`#]/g, '').trim();
        if (line && line.length <= 16) return line;
        if (line) return line.slice(0, 12);
        return `要点 ${i + 1}`;
      },

      parseSmartSummaries(raw) {
        const cleaned = String(raw || '').replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
        const unescapeJson = (s) => String(s || '').replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\').trim();
        const repairJsonStrings = (s) => {
          let out = '', inStr = false, escaped = false;
          for (let i = 0; i < s.length; i++) {
            const ch = s[i];
            if (!inStr) {
              if (ch === '"') inStr = true;
              out += ch;
              continue;
            }
            if (escaped) { out += ch; escaped = false; continue; }
            if (ch === '\\') { out += ch; escaped = true; continue; }
            if (ch === '"') { inStr = false; out += ch; continue; }
            if (ch === '\n') { out += '\\n'; continue; }
            if (ch === '\r') { continue; }
            if (ch === '\t') { out += '\\t'; continue; }
            out += ch;
          }
          return out;
        };
        const toItem = (item, i) => {
          if (item == null) return null;
          if (typeof item === 'string') {
            const content = item.trim();
            return content ? { title: this._fallbackSmartTitle(content, i), content } : null;
          }
          const content = unescapeJson(item.content || item.summary || item.text || '');
          if (!content) return null;
          const title = unescapeJson(item.title) || this._fallbackSmartTitle(content, i);
          return { title, content };
        };
        const fromParsed = (parsed) => {
          const list = Array.isArray(parsed) ? parsed : (parsed && typeof parsed === 'object' ? [parsed] : []);
          return list.map(toItem).filter(Boolean).slice(0, 3);
        };
        const tryParse = (s) => {
          if (!s) return null;
          const repaired = repairJsonStrings(s);
          try { return JSON.parse(s); } catch (e) {}
          try { return JSON.parse(repaired); } catch (e) {}
          try { return JSON.parse(s.replace(/,\s*([}\]])/g, '$1')); } catch (e) {}
          try { return JSON.parse(repaired.replace(/,\s*([}\]])/g, '$1')); } catch (e) {}
          return null;
        };
        const sliceAndParse = (openCh, closeCh) => {
          const start = cleaned.indexOf(openCh);
          const end = cleaned.lastIndexOf(closeCh);
          if (start < 0 || end <= start) return [];
          return fromParsed(tryParse(cleaned.slice(start, end + 1)));
        };

        let valid = sliceAndParse('[', ']');
        if (valid.length) return valid;
        valid = sliceAndParse('{', '}');
        if (valid.length) return valid;

        const re = /"title"\s*:\s*"((?:\\.|[^"\\])*)"\s*,\s*"content"\s*:\s*"((?:\\.|[^"\\])*)"/gi;
        const extracted = [];
        let m;
        while ((m = re.exec(cleaned)) && extracted.length < 3) {
          const content = unescapeJson(m[2]);
          if (!content) continue;
          extracted.push({ title: unescapeJson(m[1]) || this._fallbackSmartTitle(content, extracted.length), content });
        }
        if (extracted.length) return extracted;

        if (/^\s*[\[{]/.test(cleaned) && /"title"\s*:|"content"\s*:/.test(cleaned)) {
          console.warn('[智读笔记] 智能摘要 JSON 无法解析，已丢弃原始结构，避免把括号展示到卡片里');
          return [];
        }
        if (!cleaned) return [];
        return [{ title: this._fallbackSmartTitle(cleaned, 0), content: cleaned }];
      },

      saveCurrentDialog() {
        const chatHistory = Store.get('chatHistory');
        if (!chatHistory.filter(m => m.role !== 'system').length) return;
        const dialogSessions = Store.get('dialogSessions');
        let currentDialogId = Store.get('currentDialogId');
        if (!currentDialogId) {
          currentDialogId = 'dlg_' + Date.now();
          const firstUserMsg = chatHistory.find(m => m.role === 'user');
          dialogSessions.push({
            id: currentDialogId,
            title: (firstUserMsg ? firstUserMsg.content : '对话').slice(0, 30),
            messages: JSON.parse(JSON.stringify(chatHistory)),
            ctxText: this.extractCtxFromSys(chatHistory) || Store.get('lockedText') || '',
            timestamp: Date.now()
          });
          Store.set('currentDialogId', currentDialogId);
        } else {
          const dlg = dialogSessions.find(d => d.id === currentDialogId);
          if (dlg) {
            dlg.messages = JSON.parse(JSON.stringify(chatHistory));
            if (!dlg.ctxText) dlg.ctxText = this.extractCtxFromSys(chatHistory) || Store.get('lockedText') || '';
            dlg.timestamp = Date.now();
          }
        }
        Store.set('dialogSessions', dialogSessions);
        this.updateDialogSelector();
      },

      updateDialogSelector() {
        const sel = Utils.$('_sr_dialog_sel');
        if (!sel) return;
        const currentId = Store.get('currentDialogId');
        sel.innerHTML = '<option value="">选择历史对话</option>';
        Store.get('dialogSessions').slice().reverse().forEach(d => {
          const opt = document.createElement('option');
          opt.value = d.id;
          opt.textContent = d.title || '未命名对话';
          sel.appendChild(opt);
        });
        sel.value = currentId || '';
      },

      loadDialog(dialogId) {
        if (!dialogId) return;
        if (Store.get('currentDialogId') !== dialogId) this.saveCurrentDialog();
        const dlg = Store.get('dialogSessions').find(d => d.id === dialogId);
        if (!dlg) { Utils.showToast('未找到该对话'); return; }
        Store.set('currentDialogId', dlg.id);
        Store.set('chatHistory', JSON.parse(JSON.stringify(dlg.messages)));
        const ctxText = dlg.ctxText || this.extractCtxFromSys(dlg.messages) || '';
        if (!dlg.ctxText && ctxText) dlg.ctxText = ctxText;
        Store.set('lockedText', ctxText);
        Store.set('lockedRange', ctxText ? Highlight.findSourceRangeByText(ctxText) : null);
        this._rerenderMessages();
        this.renderCtxBar();
        this.updateDialogSelector();
        Utils.showToast('已切换对话 ✓');
      },

      newChat() {
        this.saveCurrentDialog();
        Store.set('chatHistory', []);
        Store.set('currentDialogId', null);
        Store.set('lockedText', '');
        Store.set('lockedRange', null);
        this.renderCtxBar();
        Utils.$('_sr_messages').innerHTML = '';
        this.updateDialogSelector();
        Bubble.hide();
        Utils.showToast('已开启新对话 ✓');
      },

      async sendMessage() {
        const input = Utils.$('_sr_input');
        const q = input.value.trim();
        const ctxText = this.getDialogCtx().text;
        if (!q && !ctxText) return;
        const actualQ = q || `请基于当前上下文进行解释和讨论：${ctxText}`;
        input.value = '';
        input.style.height = 'auto';
        Utils.$('_sr_send').disabled = true;
        this.addMsg('user', Utils.esc(actualQ));
        const chatHistory = Store.get('chatHistory');
        chatHistory.push({ role: 'user', content: actualQ });
        Store.set('chatHistory', chatHistory);
        const tk = this.addThinking(Utils.$('_sr_messages'));
        try {
          const sys = (chatHistory.find(m => m.role === 'system') || {}).content || '';
          const hist = chatHistory.filter(m => m.role !== 'system').slice(-12).map(m => `${m.role === 'user' ? '用户' : 'AI'}：${m.content}`).join('\n');
          const reply = await LLM.chat(`${sys ? sys + '\n\n' : ''}对话历史：\n${hist}\n\n请回答用户最新的问题。`);
          tk.remove();
          chatHistory.push({ role: 'assistant', content: reply });
          Store.set('chatHistory', chatHistory);
          this.addMsg('ai', Markdown.render(reply), reply);
          this.saveCurrentDialog();
        } catch (e) {
          tk.remove();
          this.addMsg('ai', LLM.getErrMsg(e));
        }
        Utils.$('_sr_send').disabled = false;
      },
    };

    // ============================================================
    // Cards — 摘录管理
    // ============================================================
    const Cards = {
      init() {
        document.querySelectorAll('.sr-card-filter-btn').forEach(btn => {
          btn.onclick = () => {
            Store.set('cardFilter', btn.dataset.filter);
            document.querySelectorAll('.sr-card-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            Cards.render();
          };
        });
        Utils.$('_sr_cards_sum_btn').onclick = () => this.toggleMultiSelect();
        Utils.$('_sr_cards_sel_cancel').onclick = () => this.toggleMultiSelect();
        Utils.$('_sr_cards_sel_all').onclick = () => this.selectAll();
        Utils.$('_sr_cards_sel_gen').onclick = () => this.genReport();
      },

      // 直接保存（不经编辑器），返回 badge wrap（用于智能摘要连续插入）
      directSave(text, type = 'define', options = {}) {
        const summaryText = String(text || '').trim();
        if (!summaryText) { Utils.showToast('摘录内容不能为空'); return null; }
        const cards = Store.get('cards');
        const idx = cards.length;
        const lockedText = Store.get('lockedText');
        const lockedRange = Store.get('lockedRange');
        const sourceText = options.sourceText !== undefined ? options.sourceText : lockedText;
        const sourceRange = options.sourceRange !== undefined ? options.sourceRange : lockedRange;
        let anchorText = options.anchorText;
        if (!anchorText && sourceText) anchorText = Highlight.extractAnchorText(sourceText, sourceRange);
        const cardType = Utils.normalizeCardType(type);
        const card = {
          id: ++Store.state.cardCounter,
          text: summaryText,
          type: cardType,
          title: options.title || '',
          badge: null,
          sourceText: sourceText || '',
          sourceKind: options.sourceKind || 'page',
          // 批注不挂对话溯源：用户本地写的备注，与问答历史无关
          sourceDialogId: cardType === 'note'
            ? null
            : (options.sourceDialogId !== undefined ? options.sourceDialogId : Store.get('currentDialogId')),
          anchorText,
          expanded: options.expanded !== false,
          favorite: false,
        };
        cards.push(card);
        let wrap = null;
        if (sourceRange) {
          wrap = Highlight.insertBadge(sourceRange, idx, options.afterWrap);
          if (wrap) {
            card.badge = wrap;
            if (!options.keepRange) Store.set('lockedRange', null);
          }
        }
        Store.set('cards', cards);
        MindMap.markStale();
        Cards.render();
        if (!options.silent) {
          Utils.showToast(type === 'smart' ? '智能摘要已保存 ✓' : `摘录 [${idx + 1}] 已保存 ✓`);
        }
        return wrap;
      },

      render() {
        const list = Utils.$('_sr_cards_list'), empty = Utils.$('_sr_cards_empty');
        const cards = Store.get('cards');
        const cardFilter = Store.get('cardFilter');
        list.innerHTML = '';
        const filtered = cardFilter === 'all' ? cards : cardFilter === 'favorite' ? cards.filter(c => c.favorite) : cards.filter(c => c.type === cardFilter);
        if (!filtered.length) {
          empty.style.display = 'block';
          const labels = { all: '暂无摘录，划词问答后保存吧～', define: '暂无定义摘录', note: '暂无批注', smart: '暂无智能摘要', favorite: '暂无收藏摘录，点 ☆ 收藏即可加入' };
          empty.textContent = labels[cardFilter] || '暂无摘录';
          return;
        }
        empty.style.display = 'none';
        const typeMap = { define: '定义', note: '批注', smart: '智能摘要' };
        const selectedCardIndices = Store.get('selectedCardIndices');
        const cardMultiSelectMode = Store.get('cardMultiSelectMode');

        filtered.forEach(card => {
            const idx = cards.indexOf(card);
            const item = document.createElement('div');
            item.className = `sr-card-item ${card.type}`;
            if (MindMap.isImportantCard(card.id)) item.classList.add('sr-card-important');
            item.dataset.cardIdx = idx;
            const isSelected = selectedCardIndices.includes(idx);
            if (isSelected) item.classList.add('selected');
            const canTraceDialog = card.type !== 'note' && card.sourceDialogId;
            const metaHtml = canTraceDialog ? `<div class="sr-card-meta">来源：<a class="sr-trace-link" data-idx="${idx}">查看关联对话</a></div>` : '';
            const sourceHtml = card.sourceText
              ? `<div class="sr-card-source" data-idx="${idx}" title="点击跳转到原文"><span class="sr-card-source-label">原文 · 点击跳转</span>${Utils.esc(card.sourceText)}</div>`
              : '';
            const checkHtml = cardMultiSelectMode ? `<input type="checkbox" class="sr-card-check" ${isSelected ? 'checked' : ''} data-idx="${idx}" />` : '';
            const headTitle = card.title
              ? card.title
              : (card.text.slice(0, 50) + (card.text.length > 50 ? '…' : ''));
            const hStyle = card.bodyHeight ? ` style="height:${card.bodyHeight}px;max-height:none"` : '';
            item.innerHTML = `
              ${checkHtml}
              <div class="sr-card-head" data-idx="${idx}">
                <span class="sr-card-num ${card.type}">[${idx + 1}]</span>
                <span class="sr-card-type-tag ${card.type}">${typeMap[card.type] || card.type}</span>
                <span class="sr-card-excerpt"${card.title ? ' style="font-weight:600"' : ''}>${Utils.esc(headTitle)}</span>
                <button class="sr-card-favorite ${card.favorite ? 'active' : ''}" data-idx="${idx}" title="${card.favorite ? '取消收藏' : '收藏'}">${card.favorite ? '★' : '☆'}</button>
                <span class="sr-card-toggle ${card.expanded ? 'open' : ''}">▼</span>
              </div>
              <div class="sr-card-body ${card.expanded ? 'open' : ''}">
                ${sourceHtml}
                <div class="sr-card-content"${hStyle}>${Markdown.render(card.text)}</div>
                <div class="sr-v-resize" data-idx="${idx}" ></div>
                ${metaHtml}
                <div class="sr-card-btns">
                  <button class="sr-card-edit-btn" data-idx="${idx}">✏️ 编辑</button>
                  <button class="sr-card-trace-btn" data-idx="${idx}" ${canTraceDialog ? '' : 'style="display:none"'}>溯源对话</button>
                  <button class="sr-card-loc-btn" data-loc="${idx}" ${card.anchorText && card.anchorText.selected ? '' : 'style="display:none"'}>📍 回到原文</button>
                  <button class="sr-card-del-btn" data-idx="${idx}">🗑 删除</button>
                </div>
              </div>`;
            list.appendChild(item);
        });

        list.querySelectorAll('.sr-card-head').forEach(h => {
          h.onclick = (e) => {
            if (e.target.closest('.sr-card-favorite, .sr-card-check')) return;
            const i = +h.dataset.idx;
            const cards = Store.get('cards');
            if (!cards[i]) return;
            cards[i].expanded = !cards[i].expanded;
            Store.set('cards', cards);
            const item = h.closest('.sr-card-item');
            if (!item) return;
            item.querySelector('.sr-card-body')?.classList.toggle('open', cards[i].expanded);
            item.querySelector('.sr-card-toggle')?.classList.toggle('open', cards[i].expanded);
          };
        });
        list.querySelectorAll('.sr-card-edit-btn').forEach(b => {
          b.onclick = (e) => { e.stopPropagation(); Editor.open(cards[+b.dataset.idx].text, +b.dataset.idx, cards[+b.dataset.idx].type); };
        });
        list.querySelectorAll('.sr-card-favorite').forEach(b => {
          b.onclick = (e) => {
            e.stopPropagation();
            const i = +b.dataset.idx;
            cards[i].favorite = !cards[i].favorite;
            Store.set('cards', cards);
            this.render();
            Utils.showToast(cards[i].favorite ? '已收藏摘录 ★' : '已取消收藏');
          };
        });
        list.querySelectorAll('.sr-card-source').forEach(source => {
          source.onclick = (e) => { e.stopPropagation(); this.locateInArticle(+source.dataset.idx); };
        });
        list.querySelectorAll('.sr-card-del-btn').forEach(b => {
          b.onclick = (e) => {
            e.stopPropagation();
            const i = +b.dataset.idx;
            const wrap = cards[i].badge;
            const neighbor = wrap && (Highlight._skipEmpty(wrap.previousSibling, 'prev') || Highlight._skipEmpty(wrap.nextSibling, 'next'));
            if (wrap) wrap.remove();
            if (Highlight._isBadgeWrap(neighbor)) Highlight._layoutBadgeGroup(neighbor);
            cards.splice(i, 1);
            let sel = Store.get('selectedCardIndices').filter(x => x !== i);
            Store.set('selectedCardIndices', sel);
            Store.set('cards', cards);
            MindMap.markStale();
            this.render();
            Utils.showToast('摘录已删除');
          };
        });
        list.querySelectorAll('.sr-card-trace-btn').forEach(b => {
          b.onclick = (e) => {
            e.stopPropagation();
            const card = cards[+b.dataset.idx];
            if (card.sourceDialogId) { Chat.loadDialog(card.sourceDialogId); Utils.openPanel(); Utils.switchTab('chat'); }
          };
        });
        list.querySelectorAll('.sr-card-loc-btn').forEach(b => {
          b.onclick = (e) => { e.stopPropagation(); this.locateInArticle(+b.dataset.loc); };
        });
        list.querySelectorAll('.sr-trace-link').forEach(a => {
          a.onclick = (e) => {
            e.stopPropagation();
            const card = cards[+a.dataset.idx];
            if (card.sourceDialogId) { Chat.loadDialog(card.sourceDialogId); Utils.openPanel(); Utils.switchTab('chat'); }
          };
        });
        list.querySelectorAll('.sr-card-check').forEach(cb => {
          cb.onclick = (e) => {
            e.stopPropagation();
            const idx = +cb.dataset.idx;
            let sel = Store.get('selectedCardIndices');
            if (cb.checked) { if (!sel.includes(idx)) sel.push(idx); }
            else { sel = sel.filter(x => x !== idx); }
            Store.set('selectedCardIndices', sel);
            this.updateSelCount();
            this.render();
          };
        });
        list.querySelectorAll('.sr-v-resize').forEach(handle => {
          const item = handle.closest('.sr-card-item');
          const contentEl = item && item.querySelector('.sr-card-content');
          const i = +handle.dataset.idx;
          Utils.bindHeightResize(handle, contentEl, (h) => {
            const next = Store.get('cards');
            if (!next[i]) return;
            if (h == null) delete next[i].bodyHeight;
            else next[i].bodyHeight = Math.round(h);
            Store.set('cards', next);
          });
        });
      },

      updateSelCount() {
        Utils.$('_sr_cards_sel_count').textContent = `已选 ${Store.get('selectedCardIndices').length} 条摘录`;
      },

      // 回跳原文：有角标则从角标向前还原选区高亮；否则按 anchorText 搜索
      locateInArticle(cardIdx) {
        const cards = Store.get('cards');
        const card = cards[cardIdx];
        if (!card) return;
        const hlOn = Store.get('highlightEnabled');
        if (!hlOn) Utils.showToast('已关闭定位高亮，可在气泡中开启');
        if (card.badge && card.badge.isConnected) {
          if (hlOn) Highlight.flashNearBadge(card.badge, card.anchorText);
          else {
            try { card.badge.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
            catch (e) { /* ignore */ }
          }
          return;
        }
        if (hlOn && card.anchorText && card.anchorText.selected) {
          const target = Highlight.findAnchorElement(card.anchorText);
          if (target) return;
        }
        Utils.showToast('未能定位原文位置（页面内容可能已变化）');
      },

      toggleMultiSelect() {
        const mode = !Store.get('cardMultiSelectMode');
        Store.set('cardMultiSelectMode', mode);
        if (mode) {
          Store.set('selectedCardIndices', []);
          Utils.$('_sr_cards_sel_bar').classList.add('show');
          Utils.showToast('多选模式：勾选摘录后点击生成报告');
        } else {
          Utils.$('_sr_cards_sel_bar').classList.remove('show');
          Store.set('selectedCardIndices', []);
        }
        this.render();
      },

      selectAll() {
        const cards = Store.get('cards');
        const cardFilter = Store.get('cardFilter');
        const filtered = cardFilter === 'all' ? cards : cardFilter === 'favorite' ? cards.filter(c => c.favorite) : cards.filter(c => c.type === cardFilter);
        const visibleIndices = filtered.map(c => cards.indexOf(c)).filter(i => i >= 0);
        let sel = Store.get('selectedCardIndices');
        if (sel.length === visibleIndices.length && visibleIndices.length > 0) {
          sel = []; Utils.$('_sr_cards_sel_all').textContent = '☑ 全选';
        } else {
          sel = visibleIndices.slice(); Utils.$('_sr_cards_sel_all').textContent = '☐ 取消全选';
        }
        Store.set('selectedCardIndices', sel);
        this.updateSelCount();
        this.render();
      },

      async genReport() {
        const sel = Store.get('selectedCardIndices');
        if (!sel.length) { Utils.showToast('请选择摘录'); return; }
        const cards = Store.get('cards');
        const selectedCards = sel.map(i => cards[i]).filter(Boolean);
        if (!selectedCards.length) { Utils.showToast('未找到有效摘录'); return; }
        const btn = Utils.$('_sr_cards_sel_gen');
        if (btn) { btn.disabled = true; btn.textContent = '生成中…'; }
        Utils.showToast('正在生成摘录总结…');
        try {
          const cardTexts = selectedCards.map((c, i) => `[${i + 1}] (${Utils.cardTypeLabel(c.type)}) ${c.text}`).join('\n\n');
          const r = await LLM.chat(`以下是用户选中的摘录：\n\n${cardTexts}\n\n请综合整理为结构化学习报告：整体主题、知识要点、关键概念、行动建议。`);
          Report.addAndOpen({ type: 'card', title: '摘录总结报告', content: r });
          if (Store.get('cardMultiSelectMode')) this.toggleMultiSelect();
          Utils.showToast('摘录总结已存入报告 ✓');
        } catch (e) {
          Utils.showToast('生成失败，请重试');
        }
        if (btn) { btn.disabled = false; btn.textContent = '📊 生成报告'; }
      },
    };

    // ============================================================
    // Editor — 摘录编辑器弹窗
    // ============================================================
    const Editor = {
      init() {
        Utils.$('_sr_card_type_define').onclick = () => this.setType('define');
        Utils.$('_sr_card_type_note').onclick = () => this.setType('note');
        Utils.$('_sr_card_type_smart').onclick = () => this.setType('smart');
        Utils.$('_sr_card_cancel_btn').onclick = () => Utils.$('_sr_card_editor').classList.remove('open');
        Utils.$('_sr_card_editor').onclick = e => { if (e.target === Utils.$('_sr_card_editor')) Utils.$('_sr_card_editor').classList.remove('open'); };
        Utils.$('_sr_card_ai_btn').onclick = () => this.aiModify();
        Utils.$('_sr_card_save_btn').onclick = () => this.save();
      },

      setType(type) {
        const t = Utils.normalizeCardType(type);
        Store.set('editingCardType', t);
        Utils.$('_sr_card_type_define').classList.toggle('active', t === 'define');
        Utils.$('_sr_card_type_note').classList.toggle('active', t === 'note');
        Utils.$('_sr_card_type_smart').classList.toggle('active', t === 'smart');
      },

      open(aiText, existingIdx, cardType) {
        Store.set('editingCardIdx', existingIdx);
        const type = Utils.normalizeCardType(cardType || (existingIdx !== null && existingIdx >= 0 ? Store.get('cards')[existingIdx]?.type : 'define'));
        Store.set('editingCardType', type);
        Utils.$('_sr_card_edit_text').value = aiText;
        Utils.$('_sr_card_ai_input').value = '';
        Utils.$('_sr_card_type_define').classList.toggle('active', type === 'define');
        Utils.$('_sr_card_type_note').classList.toggle('active', type === 'note');
        Utils.$('_sr_card_type_smart').classList.toggle('active', type === 'smart');
        Utils.$('_sr_card_editor').classList.add('open');
      },

      async aiModify() {
        const ins = Utils.$('_sr_card_ai_input').value.trim();
        const cur = Utils.$('_sr_card_edit_text').value.trim();
        if (!ins) { Utils.showToast('请输入修改指令'); return; }
        if (!cur) { Utils.showToast('摘录内容为空'); return; }
        const btn = Utils.$('_sr_card_ai_btn');
        btn.disabled = true; btn.textContent = '修改中…';
        try {
          const result = await LLM.chat(`你是摘录编辑助手。当前摘录：\n\n${cur}\n\n用户指令：${ins}\n\n请按指令修改，直接返回修改后的文本。`);
          Utils.$('_sr_card_edit_text').value = result;
          Utils.$('_sr_card_ai_input').value = '';
          Utils.showToast('AI 修改完成 ✓');
        } catch (e) { Utils.showToast(LLM.getErrMsg(e)); }
        btn.disabled = false; btn.textContent = 'AI 改';
      },

      save() {
        const text = Utils.$('_sr_card_edit_text').value.trim();
        if (!text) { Utils.showToast('摘录内容不能为空'); return; }
        const cards = Store.get('cards');
        const editingCardIdx = Store.get('editingCardIdx');
        const editingCardType = Store.get('editingCardType');
        if (editingCardIdx !== null && editingCardIdx >= 0) {
          const nextType = Utils.normalizeCardType(editingCardType);
          cards[editingCardIdx].text = text;
          cards[editingCardIdx].type = nextType;
          if (nextType === 'note') cards[editingCardIdx].sourceDialogId = null;
          const wrap = cards[editingCardIdx].badge;
          const badgeEl = wrap?.querySelector('.sr-anchor-badge');
          if (badgeEl) badgeEl.className = `sr-anchor-badge ${Utils.normalizeCardType(editingCardType)}`;
          Store.set('cards', cards);
          MindMap.markStale();
          Cards.render();
          Utils.showToast('摘录已更新 ✓');
        }
        Utils.$('_sr_card_editor').classList.remove('open');
      },
    };

    // ============================================================
    // MindMap — 基于文章全文和摘录的可交互思维导图
    // ============================================================
    const MindMap = {
      MAX_INPUT_CARDS: 30,
      MAX_CARD_TEXT: 500,

      init() {
        const genBtn = Utils.$('_sr_mindmap_gen_btn');
        const regenBtn = Utils.$('_sr_mindmap_regen_btn');
        const exportBtn = Utils.$('_sr_mindmap_export_btn');
        if (genBtn) genBtn.onclick = () => this.generate();
        if (regenBtn) regenBtn.onclick = () => this.generate();
        if (exportBtn) exportBtn.onclick = () => this.exportMarkdown();
      },

      _collapsed: {},

      isImportantCard(cardId) {
        const ids = Store.get('mindMap')?.importantCardIds || [];
        return ids.map(String).includes(String(cardId));
      },

      markStale() {
        const mindMap = Store.get('mindMap');
        if (!mindMap || mindMap.stale) return;
        mindMap.stale = true;
        Store.set('mindMap', mindMap);
      },

      setBusy(busy) {
        const btn = Utils.$('_sr_mindmap_gen_btn');
        const regenBtn = Utils.$('_sr_mindmap_regen_btn');
        if (btn) {
          btn.disabled = busy;
          btn.textContent = busy ? '⏳ 正在梳理文章与摘录…' : '🧠 基于文章与摘录生成导图';
        }
        if (regenBtn) regenBtn.disabled = busy;
      },

      setTip(text) {
        const tip = Utils.$('_sr_mindmap_tip');
        if (tip) tip.textContent = text;
      },

      async generate() {
        const cards = Store.get('cards');
        if (!cards.length) { Utils.showToast('请先保存至少一张摘录，再生成导图'); return; }
        const pageText = Utils.getPageText();
        if (!pageText || pageText.length < 50) { Utils.showToast('未能读取足够的页面正文'); return; }
        const inputCards = cards.slice(-this.MAX_INPUT_CARDS).map(card => ({
          id: card.id, type: card.type, text: String(card.text || '').slice(0, this.MAX_CARD_TEXT),
        }));
        const prompt = `你是文章阅读笔记助手。请根据【文章正文】和【用户摘录卡片】，建立可导航的知识思维导图。

严格要求：
1. 只输出合法 JSON。不要 Markdown、不要代码围栏、不要任何 JSON 以外的文字。
2. 一级主题 3 到 6 个；整棵树最多 3 层；每个 label 不超过 14 个字，summary 不超过 50 个字。
3. cardIds 只能引用【用户摘录卡片】中真实存在的 id；一个节点可以没有关联卡片。
4. importantCardIds 选择最关键、最能支撑文章主旨的 1 到 3 张卡片；不要因为卡片类型而偏向某类。
5. 没有卡片覆盖但文章的重要观点，也可以保留为节点（cardIds 为空）。
6. 重点主题的 importance 填 "high"，其他填 "normal"。

输出 JSON Schema：
{
  "title": "文章主题",
  "summary": "一句话总览",
  "importantCardIds": [1, 2],
  "tree": {
    "id": "root",
    "label": "文章主题",
    "summary": "一句话总览",
    "children": [
      { "id": "topic_1", "label": "一级主题", "summary": "主题说明", "importance": "high", "cardIds": [1], "children": [] }
    ]
  }
}

【文章正文】
${pageText}

【用户摘录卡片】
${JSON.stringify(inputCards)}`;
        try {
          this.setBusy(true);
          this.setTip('AI 正在建立知识结构，请稍候…');
          const started = Date.now();
          console.info('[智读笔记] 导图请求', { promptLen: prompt.length, pageLen: pageText.length, cardCount: inputCards.length });
          const response = await Promise.race([
            LLM.chat(prompt, 'json'),
            new Promise((_, reject) => setTimeout(() => reject(new Error('LLM 请求超时')), 180000)),
          ]);
          console.info('[智读笔记] 导图模型回复', {
            elapsedMs: Date.now() - started,
            type: typeof response,
            preview: typeof response === 'string' ? response.slice(0, 2000) : response,
          });
          const parsed = (response && typeof response === 'object') ? response : this.parseJSON(response);
          const mindMap = this.normalizeMindMap(parsed, cards, pageText);
          Store.set('mindMap', mindMap);
          this.render();
          Cards.render();
          Utils.showToast('思维导图已生成 ✓');
        } catch (e) {
          console.warn('[智读笔记] 思维导图生成失败:', e);
          this.setTip('生成失败，请检查 AI 接口后重试。');
          Utils.showToast(e instanceof SyntaxError ? 'AI 返回格式异常，请重试' : LLM.getErrMsg(e));
        } finally {
          this.setBusy(false);
        }
      },

      parseJSON(text) {
        const raw = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
        try { return JSON.parse(raw); }
        catch (e) {
          const start = raw.indexOf('{'), end = raw.lastIndexOf('}');
          if (start >= 0 && end > start) return JSON.parse(raw.slice(start, end + 1));
          throw e;
        }
      },

      normalizeMindMap(raw, cards, pageText) {
        if (!raw || typeof raw !== 'object') throw new SyntaxError('思维导图 JSON 不合法');
        const validIds = new Set(cards.map(c => String(c.id)));
        const normalizeIds = (ids) => [...new Set((Array.isArray(ids) ? ids : []).map(String).filter(id => validIds.has(id)))];
        const normalizeNode = (node, depth = 0, fallbackId = 'node') => {
          const safe = node && typeof node === 'object' ? node : {};
          const children = depth < 2 && Array.isArray(safe.children)
            ? safe.children.slice(0, 8).map((child, i) => normalizeNode(child, depth + 1, `${fallbackId}_${i + 1}`))
            : [];
          return {
            id: String(safe.id || fallbackId).slice(0, 60),
            label: String(safe.label || '未命名主题').replace(/\s+/g, ' ').trim().slice(0, 20),
            summary: String(safe.summary || '').replace(/\s+/g, ' ').trim().slice(0, 80),
            importance: safe.importance === 'high' ? 'high' : 'normal',
            cardIds: normalizeIds(safe.cardIds),
            children,
          };
        };
        const title = String(raw.title || raw.tree?.label || '文章知识导图').replace(/\s+/g, ' ').trim().slice(0, 30);
        const tree = normalizeNode(raw.tree || { label: title, children: [] }, 0, 'root');
        tree.label = tree.label === '未命名主题' ? title : tree.label;
        const highNodeIds = [];
        const collectHighIds = (node) => { if (node.importance === 'high') highNodeIds.push(...node.cardIds); node.children.forEach(collectHighIds); };
        collectHighIds(tree);
        const importantCardIds = normalizeIds(raw.importantCardIds).slice(0, 3);
        const fallbackImportant = [...new Set(highNodeIds)].slice(0, 3);
        return {
          version: 1, generatedAt: Date.now(),
          articleFingerprint: this.hashText(pageText),
          title,
          summary: String(raw.summary || tree.summary || '').replace(/\s+/g, ' ').trim().slice(0, 100),
          importantCardIds: importantCardIds.length ? importantCardIds : fallbackImportant,
          tree, stale: false,
        };
      },

      hashText(text) {
        let hash = 0;
        const v = String(text || '').slice(0, 12000);
        for (let i = 0; i < v.length; i++) hash = ((hash << 5) - hash + v.charCodeAt(i)) | 0;
        return String(Math.abs(hash));
      },

      render() {
        const canvas = Utils.$('_sr_mindmap_canvas');
        const empty = Utils.$('_sr_mindmap_empty');
        const genBtn = Utils.$('_sr_mindmap_gen_btn');
        const regenBtn = Utils.$('_sr_mindmap_regen_btn');
        const exportBtn = Utils.$('_sr_mindmap_export_btn');
        const tip = Utils.$('_sr_mindmap_tip');
        if (!canvas || !empty || !genBtn || !regenBtn) return;
        const mindMap = Store.get('mindMap');
        canvas.innerHTML = '';
        if (!mindMap) {
          empty.style.display = 'block';
          regenBtn.classList.remove('show');
          if (exportBtn) exportBtn.classList.remove('show');
          genBtn.style.display = '';
          return;
        }
        empty.style.display = 'none';
        genBtn.style.display = 'none';
        regenBtn.classList.add('show');
        if (exportBtn) exportBtn.classList.add('show');
        const isStale = mindMap.stale || mindMap.articleFingerprint !== this.hashText(Utils.getPageText());
        if (tip) {
          tip.textContent = isStale
            ? '摘录或文章内容已变化，当前导图可能过期；建议重新生成。'
            : '点击关联摘录卡片，即可跳转到其完整内容。';
        }

        const title = document.createElement('div');
        title.className = 'sr-mm-title';
        title.textContent = mindMap.title || mindMap.tree?.label || '文章知识导图';
        canvas.appendChild(title);
        if (mindMap.summary) {
          const summary = document.createElement('div');
          summary.className = 'sr-mm-summary';
          summary.textContent = mindMap.summary;
          canvas.appendChild(summary);
        }
        const root = document.createElement('div');
        root.className = 'sr-mm-root';
        const rootLabel = document.createElement('div');
        rootLabel.className = 'sr-mm-root-label';
        rootLabel.textContent = mindMap.tree?.label || mindMap.title || '文章主题';
        root.appendChild(rootLabel);
        if (mindMap.tree?.summary) {
          const rs = document.createElement('div');
          rs.className = 'sr-mm-topic-summary';
          rs.textContent = mindMap.tree.summary;
          root.appendChild(rs);
        }
        root.appendChild(this.createCardChips(mindMap.tree?.cardIds || []));
        canvas.appendChild(root);
        (mindMap.tree?.children || []).forEach(node => canvas.appendChild(this.createNode(node, 0)));
      },

      createNode(node, depth) {
        const item = document.createElement('div');
        item.className = `sr-mm-topic ${node.importance === 'high' ? 'high' : ''}`;
        item.style.marginLeft = `${10 + depth * 12}px`;
        const hasChildren = node.children && node.children.length > 0;
        const collapsed = !!this._collapsed[node.id];
        const head = document.createElement('div');
        head.className = 'sr-mm-topic-head';
        if (hasChildren) {
          const toggle = document.createElement('button');
          toggle.type = 'button';
          toggle.className = `sr-mm-toggle ${collapsed ? '' : 'open'}`;
          toggle.textContent = '▶';
          toggle.title = collapsed ? '展开子主题' : '折叠子主题';
          toggle.onclick = (e) => { e.stopPropagation(); this._collapsed[node.id] = !this._collapsed[node.id]; this.render(); };
          head.appendChild(toggle);
        }
        const label = document.createElement('div');
        label.className = 'sr-mm-topic-label';
        label.textContent = node.label || '未命名主题';
        head.appendChild(label);
        if (node.importance === 'high') {
          const imp = document.createElement('span');
          imp.className = 'sr-mm-important';
          imp.textContent = '⭐ 重点';
          head.appendChild(imp);
        }
        item.appendChild(head);
        if (node.summary) {
          const s = document.createElement('div');
          s.className = 'sr-mm-topic-summary';
          s.textContent = node.summary;
          item.appendChild(s);
        }
        item.appendChild(this.createCardChips(node.cardIds || []));
        if (hasChildren && !collapsed) (node.children || []).forEach(c => item.appendChild(this.createNode(c, depth + 1)));
        return item;
      },

      createCardChips(cardIds) {
        const wrap = document.createElement('div');
        wrap.className = 'sr-mm-card-chips';
        const cards = Store.get('cards');
        cardIds.forEach(cardId => {
          const card = cards.find(c => String(c.id) === String(cardId));
          const chip = document.createElement('button');
          chip.type = 'button';
          chip.className = `sr-mm-card-chip ${this.isImportantCard(cardId) ? 'important' : ''}`;
          chip.textContent = card
            ? `${this.isImportantCard(cardId) ? '⭐ ' : ''}卡片 #${cards.indexOf(card) + 1} · ${String(card.text || '').replace(/\s+/g, ' ').slice(0, 18)}`
            : '已删除摘录';
          chip.disabled = !card;
          if (card) chip.onclick = () => this.openCard(cardId);
          wrap.appendChild(chip);
        });
        return wrap;
      },

      openCard(cardId) {
        const cards = Store.get('cards');
        const cardIdx = cards.findIndex(c => String(c.id) === String(cardId));
        if (cardIdx < 0) { Utils.showToast('关联摘录已删除'); return; }
        cards.forEach(c => { c.expanded = false; });
        cards[cardIdx].expanded = true;
        Store.set('cards', cards);
        Utils.openPanel();
        Utils.switchTab('cards');
        Cards.render();
        setTimeout(() => {
          document.querySelector(`.sr-card-item[data-card-idx="${cardIdx}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 0);
      },

      exportMarkdown() {
        const mindMap = Store.get('mindMap');
        if (!mindMap) { Utils.showToast('请先生成思维导图'); return; }
        const cards = Store.get('cards');
        const lines = [];
        lines.push(`# ${mindMap.title || '文章知识导图'}`);
        if (mindMap.summary) lines.push('', `> ${mindMap.summary}`);
        if (mindMap.importantCardIds && mindMap.importantCardIds.length) {
          lines.push('', '**⭐ 重点卡片**');
          mindMap.importantCardIds.forEach(id => {
            const card = cards.find(c => String(c.id) === String(id));
            if (card) lines.push(`- [重点] 卡片#${cards.indexOf(card) + 1}：${String(card.text).replace(/\s+/g, ' ').slice(0, 60)}`);
          });
        }
        const walk = (node, depth) => {
          const prefix = ''.padStart(depth * 2, ' ');
          const mark = node.importance === 'high' ? '⭐ ' : '';
          lines.push(`${prefix}- ${mark}${node.label || '未命名'}${node.summary ? `：${node.summary}` : ''}`);
          (node.cardIds || []).forEach(id => {
            const card = cards.find(c => String(c.id) === String(id));
            if (!card) return;
            const idx = cards.indexOf(card);
            const important = this.isImportantCard(id) ? '⭐ ' : '';
            lines.push(`${prefix}  - 📌 ${important}卡片#${idx + 1}：${String(card.text).replace(/\s+/g, ' ').slice(0, 80)}`);
          });
          (node.children || []).forEach(c => walk(c, depth + 1));
        };
        (mindMap.tree?.children || []).forEach(n => walk(n, 1));
        const content = lines.join('\n');
        Utils.downloadText(`${mindMap.title || '思维导图'}大纲.md`, content);
        navigator.clipboard?.writeText(content).catch(() => {});
        Utils.showToast('大纲已下载，并已复制到剪贴板 ✓');
      },
    };

    // ============================================================
    // Report — 报告系统
    // ============================================================
    const Report = {
      init() {
        Utils.$('_sr_report_gen_full').onclick = () => this.genFullSummary();
        Utils.$('_sr_sm_close').onclick = () => Utils.$('_sr_summary_modal_wrap').classList.remove('open');
        Utils.$('_sr_summary_modal_wrap').onclick = e => { if (e.target === Utils.$('_sr_summary_modal_wrap')) Utils.$('_sr_summary_modal_wrap').classList.remove('open'); };
        Utils.$('_sr_sm_copy').onclick = () => this.copySummary();
        Utils.$('_sr_sm_download').onclick = () => this.downloadSummary();
        Utils.$('_sr_sm_save').onclick = () => this.saveSummary();
      },

      _applyExpanded(item, expanded) {
        if (!item) return;
        item.querySelector('.sr-report-body')?.classList.toggle('open', expanded);
        item.querySelector('.sr-report-toggle')?.classList.toggle('open', expanded);
      },

      openReport(rpt) {
        if (!rpt) return;
        const reports = Store.get('reports');
        const target = reports.find(r => r.id === rpt.id) || rpt;
        target.expanded = true;
        Store.set('reports', reports);
        Utils.openPanel();
        Utils.switchTab('report');
        this.render();
        requestAnimationFrame(() => {
          const el = document.querySelector(`.sr-report-item[data-rpt-id="${target.id}"]`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
      },

      addAndOpen({ type, title, content, kind }) {
        const reports = Store.get('reports');
        const rpt = { id: 'rpt_' + Date.now(), type, title, content, timestamp: Date.now(), expanded: true, kind: kind || type };
        reports.unshift(rpt);
        Store.set('reports', reports);
        this.openReport(rpt);
        return rpt;
      },

      findFullReport() {
        return Store.get('reports').find(r => r.kind === 'full' || r.type === 'full' || r.title === '全文总结报告');
      },

      async genFullSummary() {
        const existing = this.findFullReport();
        if (existing) {
          this.openReport(existing);
          Utils.showToast('已打开全文总结报告');
          return;
        }
        const btn = Utils.$('_sr_report_gen_full');
        btn.disabled = true; btn.textContent = '⏳ 总结中…';
        const body = Utils.getPageText();
        if (!body || body.length < 50) {
          Utils.showToast('未能获取页面内容');
          btn.disabled = false; btn.textContent = '📄 全文总结';
          return;
        }
        const prompt = `请对以下网页正文进行全面总结，用 Markdown 输出（# / ## 标题、列表、加粗），不要用代码围栏包裹全文。\n1. 核心主题与目的\n2. 结构化要点（层级 + 关键数据/术语）\n3. 结论与要点回顾\n\n网页正文：\n${body}`;
        try {
          const r = await LLM.chat(prompt);
          this.addAndOpen({ type: 'full', title: '全文总结报告', content: r, kind: 'full' });
          Utils.showToast('全文总结已生成 ✓');
        } catch (e) { Utils.showToast('总结失败，请重试'); }
        btn.disabled = false; btn.textContent = '📄 全文总结';
      },

      render() {
        const list = Utils.$('_sr_report_list'), empty = Utils.$('_sr_report_empty');
        const reports = Store.get('reports');
        list.innerHTML = '';
        if (!reports.length) {
          empty.style.display = 'block';
          empty.textContent = '暂无报告，点击上方按钮生成全文总结，或在摘录/对话中总结生成';
          return;
        }
        empty.style.display = 'none';
        const typeMap = { dialog: '对话', card: '摘录', full: '全文' };
        reports.forEach((rpt, idx) => {
          const item = document.createElement('div');
          item.className = `sr-report-item ${rpt.type}${rpt.kind === 'full' ? ' full' : ''}`;
          item.dataset.rptId = rpt.id;
          const hStyle = rpt.bodyHeight ? ` style="height:${rpt.bodyHeight}px;max-height:none"` : '';
          item.innerHTML = `
            <div class="sr-report-head" data-idx="${idx}">
              <span class="sr-report-type-tag ${rpt.type}">${typeMap[rpt.type] || rpt.type}</span>
              <span class="sr-report-title">${Utils.esc(rpt.title)}</span>
              <span class="sr-report-time">${new Date(rpt.timestamp).toLocaleDateString()}</span>
              <span class="sr-report-toggle ${rpt.expanded ? 'open' : ''}">▼</span>
            </div>
            <div class="sr-report-body ${rpt.expanded ? 'open' : ''}">
              <div class="sr-report-content"${hStyle}>${Markdown.render(rpt.content)}</div>
              <div class="sr-v-resize" data-idx="${idx}" ></div>
              <div class="sr-report-btns">
                <button class="sr-report-btn" data-idx="${idx}" data-action="copy">📋 复制</button>
                <button class="sr-report-btn" data-idx="${idx}" data-action="download">⬇ 下载</button>
                <button class="sr-report-btn" data-idx="${idx}" data-action="delete">🗑 删除</button>
              </div>
            </div>`;
          list.appendChild(item);
        });
        list.querySelectorAll('.sr-report-head').forEach(h => {
          h.onclick = () => {
            const i = +h.dataset.idx;
            const reports = Store.get('reports');
            if (!reports[i]) return;
            reports[i].expanded = !reports[i].expanded;
            Store.set('reports', reports);
            this._applyExpanded(h.closest('.sr-report-item'), reports[i].expanded);
          };
        });
        list.querySelectorAll('.sr-report-btn').forEach(b => {
          b.onclick = (e) => {
            e.stopPropagation();
            const i = +b.dataset.idx;
            const reports = Store.get('reports');
            const rpt = reports[i];
            const action = b.dataset.action;
            if (action === 'copy') {
              navigator.clipboard.writeText(rpt.content).then(() => Utils.showToast('已复制 ✓')).catch(() => Utils.showToast('复制失败'));
            } else if (action === 'download') {
              Utils.downloadText(`${rpt.title}.txt`, rpt.content);
              Utils.showToast('已下载 ✓');
            } else if (action === 'save') {
              Cards.directSave(rpt.content, 'define', { sourceText: '', sourceRange: null });
              Utils.openPanel();
              Utils.switchTab('cards');
            } else if (action === 'delete') {
              reports.splice(i, 1);
              Store.set('reports', reports);
              this.render();
              Utils.showToast('报告已删除');
            }
          };
        });
        list.querySelectorAll('.sr-v-resize').forEach(handle => {
          const item = handle.closest('.sr-report-item');
          const contentEl = item && item.querySelector('.sr-report-content');
          const i = +handle.dataset.idx;
          Utils.bindHeightResize(handle, contentEl, (h) => {
            const next = Store.get('reports');
            if (!next[i]) return;
            if (h == null) delete next[i].bodyHeight;
            else next[i].bodyHeight = Math.round(h);
            Store.set('reports', next);
          });
        });
      },

      copySummary() {
        const t = Utils.$('_sr_summary_modal_body')._result || Utils.$('_sr_summary_modal_body').textContent;
        navigator.clipboard.writeText(t).then(() => Utils.showToast('已复制 ✓')).catch(() => Utils.showToast('复制失败'));
      },

      downloadSummary() {
        const t = Utils.$('_sr_summary_modal_body')._result || Utils.$('_sr_summary_modal_body').textContent;
        const title = Utils.$('_sr_sm_title').textContent.replace(/^[📌📋📝]+ /, '');
        Utils.downloadText(`${title}.txt`, t);
        Utils.showToast('已下载 ✓');
      },

      saveSummary() {
        const t = Utils.$('_sr_summary_modal_body')._result || Utils.$('_sr_summary_modal_body').textContent;
        const reportType = Utils.$('_sr_summary_modal_body')._reportType || 'dialog';
        const reportTitle = Utils.$('_sr_summary_modal_body')._reportTitle || '总结报告';
        const reports = Store.get('reports');
        reports.unshift({ id: 'rpt_' + Date.now(), type: reportType === 'discuss' ? 'dialog' : reportType, title: reportTitle, content: t, timestamp: Date.now(), expanded: true });
        Store.set('reports', reports);
        this.render();
        Utils.$('_sr_summary_modal_wrap').classList.remove('open');
        Cards.directSave(t, 'define', {
          sourceText: Utils.$('_sr_summary_modal_body')._sourceText || '',
          sourceRange: null,
          sourceKind: reportType === 'dialog' ? 'dialog' : 'report',
          sourceDialogId: reportType === 'dialog' ? Store.get('currentDialogId') : null,
        });
        Utils.openPanel();
        Utils.switchTab('cards');
        Utils.showToast('已存为摘录并加入报告列表 ✓');
      },
    };

    // === MORE_MODULES_HERE ===

    // ============================================================
    // App — 入口
    // ============================================================
    const App = {
      init() {
        UI.injectCSS();
        UI.injectDOM();
        Store.init();
        UI.initPanel();
        Highlight.init();
        Bubble.init();
        Chat.init();
        Editor.init();
        Cards.init();
        Report.init();
        MindMap.init();
        Cards.render();
        Report.render();
        MindMap.render();
        // 恢复上次对话到问答面板
        Chat.updateDialogSelector();
        if (Store.get('chatHistory').filter(m => m.role !== 'system').length) {
          Chat._rerenderMessages();
        }
        Chat.renderCtxBar();
        Utils.showToast('智能阅读已打开～开始沉浸阅读吧～', 3000);
        let attempts = 0;
        function attemptRestore() {
          attempts++;
          Highlight.restoreBadges();
          if (attempts < 5) setTimeout(attemptRestore, 1000);
        }
        setTimeout(attemptRestore, 500);

        // 跨标签同步：监听 localStorage 变化，保持同一页面多标签状态一致
        // 避免一个标签删除后，另一个标签的旧数据把删除覆盖回去
        window.addEventListener('storage', (e) => {
          if (e.key !== Store._storageKey() || !e.newValue) return;
          // 忽略自己触发的写入（storage 事件本就不在写入标签触发，这里双重保险）
          if (e.newValue === e.oldValue) return;
          try {
            const data = JSON.parse(e.newValue);
            // 直接更新 state，绕过 Store.set 以避免触发回写 save（防止循环）
            if (data.cards) Store.state.cards = data.cards.map(c => ({ ...c, badge: null, type: c.type === 'discuss' ? 'define' : (c.type || 'define') }));
            if (data.cardCounter) Store.state.cardCounter = data.cardCounter;
            if (data.dialogSessions) Store.state.dialogSessions = data.dialogSessions;
            if (data.currentDialogId) Store.state.currentDialogId = data.currentDialogId;
            if (data.reports) Store.state.reports = (data.reports || []).map(r => ({ ...r, type: r.type === 'discuss' ? 'dialog' : r.type }));
            if (data.mindMap) Store.state.mindMap = data.mindMap;
            // 清理本标签已有 badge（其他标签可能删除了某些卡，本标签角标会变孤儿）
            document.querySelectorAll('.sr-anchor-badge-wrap').forEach(wrap => {
              const p = wrap.parentNode;
              if (p) { p.removeChild(wrap); p.normalize(); }
            });
            // 重新渲染各面板
            Cards.render();
            Report.render();
            MindMap.render();
            if (Chat && Chat.updateDialogSelector) Chat.updateDialogSelector();
            // 重新还原 badge
            Highlight.restoreBadges();
            Utils.showToast('已同步其他标签页的更新');
          } catch (err) {
            console.warn('[智读笔记] 跨标签同步失败:', err);
          }
        });
      },
    };

    App.init();

    return { ok: true, action: 'loaded', version: '7.0' };

})();