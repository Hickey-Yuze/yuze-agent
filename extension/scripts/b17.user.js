(function () {
  'use strict';
  if (window.__instantStickyNotesBooted__) {
    if (typeof window.__instantStickyNotesCreateNew === 'function') window.__instantStickyNotesCreateNew();
    return;
  }
  window.__instantStickyNotesBooted__ = true;

  const STORAGE_KEY = 'instant_sticky_notes_v1';
  const COUNTER_KEY = 'instant_sticky_notes_counter_v1';
  const STYLE_ID = 'instant-sticky-note-styles';
  const NOTE_CLASS = 'instant-sticky-note';
  const MAX_Z = 999999;

  const clamp = (v, min, max) => Math.max(min, Math.min(v, max));
  const qs = (root, sel) => root.querySelector(sel);
  const qsa = (root, sel) => Array.from(root.querySelectorAll(sel));
  const systemTheme = () => window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

  function loadNotes() {
    try {
      const d = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(d) ? d : [];
    } catch (e) { return []; }
  }

  function saveNotes(notes) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(notes)); } catch (e) {}
  }

  function getNextNoteNumber() {
    try {
      const c = parseInt(localStorage.getItem(COUNTER_KEY) || '0', 10);
      const n = Number.isFinite(c) ? c + 1 : 1;
      localStorage.setItem(COUNTER_KEY, String(n));
      return n;
    } catch (e) { return Date.now(); }
  }

  function ensureCounterInitialized(notes) {
    try {
      const c = parseInt(localStorage.getItem(COUNTER_KEY) || '0', 10);
      const m = notes.reduce((mx, note) => {
        const match = note && typeof note.id === 'string' && note.id.match(/^便签#(\d+)$/);
        const num = match ? parseInt(match[1], 10) : 0;
        return Number.isFinite(num) ? Math.max(mx, num) : mx;
      }, 0);
      if (m > (Number.isFinite(c) ? c : 0)) localStorage.setItem(COUNTER_KEY, String(m));
    } catch (e) {}
  }

  function generateId() { return '便签#' + getNextNoteNumber(); }

  function defaultRect() {
    const w = 320, h = 280, mg = 80;
    const mx = Math.max(mg, window.innerWidth - w - 20);
    const my = Math.max(mg, window.innerHeight - h - 20);
    return {
      left: Math.round(mg + Math.random() * Math.max(0, mx - mg)),
      top: Math.round(mg + Math.random() * Math.max(0, my - mg)),
      width: w, height: h
    };
  }

  function normalizeNote(note) {
    const d = defaultRect();
    return {
      id: typeof note.id === 'string' ? note.id : generateId(),
      content: typeof note.content === 'string' ? note.content : '',
      left: typeof note.left === 'number' ? note.left : d.left,
      top: typeof note.top === 'number' ? note.top : d.top,
      width: typeof note.width === 'number' ? note.width : d.width,
      height: typeof note.height === 'number' ? note.height : d.height,
      theme: note.theme === 'dark' ? 'dark' : 'light',
      minimized: !!note.minimized,
      zIndex: typeof note.zIndex === 'number' ? note.zIndex : MAX_Z
    };
  }

  const store = {
    notes: loadNotes().map(normalizeNote),
    getAll() { return this.notes; },
    get(id) { return this.notes.find(n => n.id === id) || null; },
    upsert(data) {
      const i = this.notes.findIndex(n => n.id === data.id);
      if (i > -1) this.notes[i] = { ...this.notes[i], ...data };
      else this.notes.push(data);
      saveNotes(this.notes);
    },
    remove(id) {
      this.notes = this.notes.filter(n => n.id !== id);
      saveNotes(this.notes);
    },
    clear() {
      this.notes = [];
      try { localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(COUNTER_KEY); } catch (e) {}
    },
    nextZ() {
      return this.notes.reduce((m, n) => Math.max(m, n.zIndex || MAX_Z), MAX_Z) + 1;
    }
  };

  ensureCounterInitialized(store.getAll());

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
.instant-sticky-note{
--bg:linear-gradient(135deg,#667eea 0%,#764ba2 100%);
--bg2:rgba(255,255,255,.15);--bg3:rgba(255,255,255,.05);
--text:#fff;--editor-bg:rgba(255,255,255,.98);--editor-text:#333;
--btn:rgba(255,255,255,.2);--btn-close:rgba(255,80,80,.45);
--shadow:0 10px 40px rgba(0,0,0,.3);
--bubble-bg:rgba(17,24,39,.92);--bubble-border:rgba(255,255,255,.08);
--menu-bg:rgba(255,255,255,.98);--menu-border:rgba(0,0,0,.08);
--menu-text:#1e293b;--menu-hover:rgba(0,0,0,.06);
position:fixed;display:flex;flex-direction:column;resize:both;overflow:hidden;
box-sizing:border-box;min-width:280px;min-height:50px;border-radius:12px;
background:var(--bg);box-shadow:var(--shadow);
font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
animation:noteIn .18s ease-out;
}
.instant-sticky-note.minimized{resize:none;}
.instant-sticky-note.pinned{
resize:none;border-radius:8px;
box-shadow:0 2px 12px rgba(0,0,0,.18);
min-width:120px;min-height:40px;
}
.instant-sticky-note.pinned .note-header{display:none !important;}
.instant-sticky-note.pinned .note-content{padding:10px;background:transparent;}
.instant-sticky-note.pinned .note-editor{border-radius:6px;pointer-events:none;user-select:none;}
.note-pin-overlay{
position:absolute;inset:0;z-index:10;border-radius:8px;
background:rgba(0,0,0,0);display:flex;align-items:center;justify-content:center;
opacity:0;transition:opacity .22s ease,background .22s ease;cursor:grab;
}
.note-pin-overlay:hover{opacity:1;background:rgba(0,0,0,.08);}
.note-pin-overlay.dark-overlay:hover{background:rgba(0,0,0,.28);}
.note-unlock-btn{
border:0;border-radius:999px;padding:7px 16px;font-size:13px;font-weight:600;cursor:pointer;
background:rgba(255,255,255,.92);color:#333;
box-shadow:0 4px 16px rgba(0,0,0,.22);
display:flex;align-items:center;gap:6px;
transition:transform .15s,box-shadow .15s,background .15s;
pointer-events:auto;white-space:nowrap;
}
.note-unlock-btn:hover{transform:scale(1.06);box-shadow:0 6px 20px rgba(0,0,0,.3);background:#fff;}
.dark-mode .note-unlock-btn{background:rgba(30,30,40,.92);color:rgba(255,255,255,.9);}
.dark-mode .note-unlock-btn:hover{background:rgba(40,40,55,.98);}
.instant-sticky-note.light-mode{
--bg:linear-gradient(135deg,#667eea 0%,#764ba2 100%);
--bg2:rgba(255,255,255,.15);--bg3:rgba(255,255,255,.05);
--text:#fff;--editor-bg:rgba(255,255,255,.98);--editor-text:#333;
--btn:rgba(255,255,255,.2);--btn-close:rgba(255,80,80,.45);
--shadow:0 10px 40px rgba(0,0,0,.3);
--bubble-bg:rgba(255,255,255,.97);--bubble-border:rgba(0,0,0,.07);
--menu-bg:rgba(255,255,255,.98);--menu-border:rgba(0,0,0,.08);
--menu-text:#1e293b;--menu-hover:rgba(0,0,0,.06);
}
.instant-sticky-note.dark-mode{
--bg:linear-gradient(135deg,#1f2937 0%,#111827 45%,#312e81 100%);
--bg2:rgba(255,255,255,.08);--bg3:rgba(255,255,255,.04);
--text:rgba(255,255,255,.92);--editor-bg:rgba(17,24,39,.92);--editor-text:#e5e7eb;
--btn:rgba(255,255,255,.12);--btn-close:rgba(239,68,68,.5);
--shadow:0 10px 40px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.05);
--bubble-bg:rgba(17,24,39,.96);--bubble-border:rgba(255,255,255,.1);
--menu-bg:rgba(17,24,39,.97);--menu-border:rgba(255,255,255,.1);
--menu-text:rgba(255,255,255,.88);--menu-hover:rgba(255,255,255,.08);
}
@keyframes noteIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes popIn{from{opacity:0;transform:translateY(8px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes menuSlideDown{from{opacity:0;transform:translateY(-6px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}
.note-header{
display:flex;justify-content:space-between;align-items:center;
padding:10px 12px;background:var(--bg2);cursor:move;user-select:none;flex-shrink:0;gap:8px;
}
.note-title{
color:var(--text);font-size:13px;font-weight:600;opacity:.96;
overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;
}
.note-controls{display:flex;align-items:center;gap:6px;flex-shrink:0;position:relative;}
.note-btn{
width:26px;height:26px;border:0;border-radius:999px;
display:flex;align-items:center;justify-content:center;
background:var(--btn);color:var(--text);cursor:pointer;font-size:14px;line-height:1;
transition:transform .15s ease,background .15s ease,box-shadow .15s ease,opacity .15s ease;flex-shrink:0;
}
.note-btn:hover{transform:scale(1.08);box-shadow:0 4px 14px rgba(0,0,0,.15);}
.note-btn.hidden-minimized{opacity:0;pointer-events:none;width:0;overflow:hidden;margin:0;padding:0;}
.note-close{background:var(--btn-close);font-size:18px;}
.note-menu-wrap{position:relative;display:flex;align-items:center;}
.note-menu-wrap.hidden-minimized{opacity:0;pointer-events:none;width:0;overflow:hidden;margin:0;padding:0;}
.note-menu-dropdown{
position:absolute;top:calc(100% + 8px);right:0;
background:var(--menu-bg);
border:1px solid var(--menu-border);
border-radius:12px;padding:6px;
display:flex;flex-direction:column;gap:4px;
box-shadow:0 8px 28px rgba(0,0,0,.32);
z-index:99999999;
animation:menuSlideDown .16s ease-out;
min-width:120px;align-items:stretch;
}
.note-menu-dropdown.hidden{display:none;}
.note-menu-item{
border:0;border-radius:8px;
height:32px;padding:0 10px;
display:flex;align-items:center;gap:8px;
background:transparent;
color:var(--menu-text);
cursor:pointer;font-size:13px;font-weight:500;white-space:nowrap;
transition:background .13s;
}
.note-menu-item:hover{background:var(--menu-hover);}
.note-menu-item-icon{font-size:15px;width:18px;text-align:center;flex-shrink:0;}
.note-menu-divider{height:1px;background:var(--menu-border);margin:2px 4px;}
.note-menu-item.danger{color:#f87171;}
.note-menu-item.danger:hover{background:rgba(239,68,68,.15);}
.note-content{
flex:1;min-height:0;display:flex;flex-direction:column;padding:16px;
background:var(--bg3);overflow:hidden;transition:opacity .2s,max-height .2s,padding .2s;
}
.note-content.collapsed{
opacity:0;max-height:0 !important;
padding-top:0 !important;padding-bottom:0 !important;
pointer-events:none;overflow:hidden;
}
.note-editor{
flex:1;min-height:100px;box-sizing:border-box;overflow:auto;outline:none;
padding:14px;border-radius:8px;background:var(--editor-bg);color:var(--editor-text);
font-size:14px;line-height:1.6;white-space:pre-wrap;word-wrap:break-word;
}
.note-editor:empty:before{content:attr(data-placeholder);opacity:.4;}
.note-editor img{max-width:100%;height:auto;display:block;margin:8px 0;border-radius:6px;cursor:pointer;}
.img-wrapper{position:relative;display:inline-block;margin:8px 0;}
.note-lightbox,.note-confirm-mask{
position:fixed;inset:0;z-index:9999999;display:flex;align-items:center;justify-content:center;
background:rgba(0,0,0,.6);backdrop-filter:blur(6px);animation:fadeIn .16s ease-out;
}
.note-lightbox img{max-width:90%;max-height:90%;object-fit:contain;border-radius:10px;box-shadow:0 20px 60px rgba(0,0,0,.5);}
.note-lightbox-close{
position:absolute;top:20px;right:20px;width:40px;height:40px;
border:0;border-radius:999px;background:rgba(255,255,255,.2);color:#fff;
cursor:pointer;font-size:24px;
}
.note-confirm{
--c-bg:rgba(17,24,39,.96);--c-border:rgba(255,255,255,.07);
--c-text:#f1f5f9;--c-text-sub:rgba(241,245,249,.78);
--c-cancel-bg:rgba(255,255,255,.1);--c-cancel-hover:rgba(255,255,255,.18);
--c-cancel-text:rgba(241,245,249,.85);
width:min(92vw,360px);border-radius:18px;padding:18px;
background:var(--c-bg);color:var(--c-text);
box-shadow:0 20px 60px rgba(0,0,0,.45),0 0 0 1px var(--c-border);
animation:popIn .18s ease-out;
}
.note-confirm.light{
--c-bg:rgba(255,255,255,.97);--c-border:rgba(15,23,42,.07);
--c-text:#1e293b;--c-text-sub:#475569;
--c-cancel-bg:rgba(0,0,0,.06);--c-cancel-hover:rgba(0,0,0,.11);--c-cancel-text:#374151;
}
.note-confirm-title{font-size:16px;font-weight:700;margin-bottom:8px;color:var(--c-text);}
.note-confirm-text{font-size:13px;line-height:1.6;color:var(--c-text-sub);}
.note-confirm-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:14px;}
.note-confirm-action{border:0;border-radius:10px;padding:8px 14px;cursor:pointer;font-size:13px;font-weight:600;transition:background .15s;}
.note-confirm-cancel{background:var(--c-cancel-bg);color:var(--c-cancel-text);}
.note-confirm-cancel:hover{background:var(--c-cancel-hover);}
.note-confirm-ok{background:#ef4444;color:#fff;}
.note-confirm-ok:hover{background:#dc2626;}
.note-confirm-restore{background:#667eea;color:#fff;}
.note-confirm-restore:hover{background:#5a6fd6;}
.note-format-popup{
position:fixed;z-index:99999999;display:flex;flex-direction:column;align-items:center;pointer-events:none;
}
.note-format-popup-inner{
pointer-events:auto;background:var(--bubble-bg);border-radius:12px;padding:7px 10px;
display:flex;align-items:center;gap:6px;white-space:nowrap;
box-shadow:0 8px 24px rgba(0,0,0,.28),0 0 0 1px var(--bubble-border);
}
.note-format-popup.pop-dark{
--bubble-bg:rgba(17,24,39,.95);--bubble-border:rgba(255,255,255,.1);
--bubble-text:rgba(255,255,255,.9);--bubble-text-dim:rgba(255,255,255,.5);
--bubble-btn-bg:rgba(255,255,255,.1);--bubble-btn-hover:rgba(255,255,255,.2);
--bubble-div:rgba(255,255,255,.18);
}
.note-format-popup.pop-light{
--bubble-bg:rgba(255,255,255,.97);--bubble-border:rgba(0,0,0,.07);
--bubble-text:#374151;--bubble-text-dim:#9ca3af;
--bubble-btn-bg:rgba(0,0,0,.06);--bubble-btn-hover:rgba(0,0,0,.12);
--bubble-div:rgba(0,0,0,.12);
}
.note-fmt-divider{width:1px;height:18px;background:var(--bubble-div);flex-shrink:0;}
.note-fmt-btn{
border:0;border-radius:8px;cursor:pointer;font-weight:700;color:var(--bubble-text);
background:var(--bubble-btn-bg);transition:background .15s,transform .1s;line-height:1;
white-space:nowrap;font-size:13px;width:32px;height:26px;
display:flex;align-items:center;justify-content:center;padding:0;
font-family:'Courier New',Courier,monospace;letter-spacing:0;
}
.note-fmt-btn:hover{background:var(--bubble-btn-hover);transform:scale(1.06);}
.note-fmt-color-swatch{
width:20px;height:20px;border-radius:999px;border:2px solid rgba(128,128,128,.25);cursor:pointer;
transition:transform .15s,border-color .15s;flex-shrink:0;overflow:hidden;
}
.note-fmt-color-swatch:hover{transform:scale(1.15);border-color:rgba(128,128,128,.5);}
.note-fmt-color-wrap{position:relative;display:flex;align-items:center;}
.note-fmt-color-input{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%;border:0;padding:0;}
`;
    if (document.head) document.head.appendChild(style);
  }

  function updateTitle(note, editor, noteData) {
    const title = qs(note, '.note-title');
    if (!title) return;
    const first = ((editor.innerText || '').trim().split('\n')[0] || '');
    title.textContent = '📝 ' + (first ? (first.length > 15 ? first.slice(0, 15) + '...' : first) : noteData.id);
  }

  function openLightbox(src) {
    const box = document.createElement('div');
    box.className = 'note-lightbox';
    box.innerHTML = `<button class="note-lightbox-close" type="button">×</button><img src="" alt="Preview">`;
    const img = qs(box, 'img');
    if (img) img.src = src;
    const close = () => { document.removeEventListener('keydown', onKey); box.remove(); };
    const onKey = e => e.key === 'Escape' && close();
    box.addEventListener('click', e => {
      if (e.target === box || (e.target.classList && e.target.classList.contains('note-lightbox-close'))) close();
    });
    document.addEventListener('keydown', onKey);
    if (document.body) document.body.appendChild(box);
  }

  function confirmClear(onConfirm) {
    const mask = document.createElement('div');
    mask.className = 'note-confirm-mask';
    mask.innerHTML = `<div class="note-confirm" role="dialog" aria-modal="true">
      <div class="note-confirm-title">清空所有数据？</div>
      <div class="note-confirm-text">所有便签内容、位置、尺寸和计数都会被删除，此操作不可撤销。</div>
      <div class="note-confirm-actions">
        <button class="note-confirm-action note-confirm-cancel" type="button">取消</button>
        <button class="note-confirm-action note-confirm-ok" type="button">确认清空</button>
      </div>
    </div>`;
    const close = () => { document.removeEventListener('keydown', onKey); mask.remove(); };
    const onKey = e => e.key === 'Escape' && close();
    mask.addEventListener('click', e => {
      const t = e.target;
      if (t === mask || (t.classList && t.classList.contains('note-confirm-cancel'))) { close(); return; }
      if (t.classList && t.classList.contains('note-confirm-ok')) { close(); if (typeof onConfirm === 'function') onConfirm(); }
    });
    document.addEventListener('keydown', onKey);
    if (document.body) document.body.appendChild(mask);
  }

  function confirmRestore(onRestore, onFresh) {
    const mask = document.createElement('div');
    mask.className = 'note-confirm-mask';
    mask.innerHTML = `<div class="note-confirm" role="dialog" aria-modal="true">
      <div class="note-confirm-title">发现已保存便签</div>
      <div class="note-confirm-text">是否恢复上次的便签内容？选择「新建」将清空所有已保存数据并新开一张便签。</div>
      <div class="note-confirm-actions">
        <button class="note-confirm-action note-confirm-cancel" type="button">新建</button>
        <button class="note-confirm-action note-confirm-restore" type="button">恢复旧内容</button>
      </div>
    </div>`;
    const close = () => { document.removeEventListener('keydown', onKey); mask.remove(); };
    const onKey = e => e.key === 'Escape' && close();
    mask.addEventListener('click', e => {
      const t = e.target;
      if (t === mask) return;
      if (t.classList && t.classList.contains('note-confirm-cancel')) { close(); if (typeof onFresh === 'function') onFresh(); return; }
      if (t.classList && t.classList.contains('note-confirm-restore')) { close(); if (typeof onRestore === 'function') onRestore(); }
    });
    document.addEventListener('keydown', onKey);
    if (document.body) document.body.appendChild(mask);
  }

  function makeImageWrapper(img) {
    if (!img || !img.parentNode || (img.parentNode.classList && img.parentNode.classList.contains('img-wrapper'))) return;
    const wrapper = document.createElement('span');
    wrapper.className = 'img-wrapper';
    img.parentNode.insertBefore(wrapper, img);
    wrapper.appendChild(img);
  }

  function prepareImages(editor) { qsa(editor, 'img').forEach(makeImageWrapper); }

  function persistNote(noteEl) {
    const id = noteEl.getAttribute('data-note-id');
    const data = store.get(id);
    const editor = qs(noteEl, '.note-editor');
    const content = qs(noteEl, '.note-content');
    if (!id || !data || !editor || !content) return;
    const rect = noteEl.getBoundingClientRect();
    const collapsed = content.classList.contains('collapsed');
    const z = parseInt(noteEl.style.zIndex || String(MAX_Z), 10);
    store.upsert({
      ...data,
      content: editor.innerHTML,
      left: Math.round(rect.left),
      top: Math.round(rect.top),
      width: Math.round(noteEl.offsetWidth),
      height: collapsed ? (data.height || 280) : Math.round(noteEl.offsetHeight),
      theme: noteEl.classList.contains('dark-mode') ? 'dark' : 'light',
      minimized: collapsed,
      zIndex: Number.isFinite(z) ? z : MAX_Z
    });
  }

  function clearAllNotes() {
    confirmClear(() => {
      qsa(document, '.' + NOTE_CLASS).forEach(el => el.remove());
      store.clear();
    });
  }

  function getCurrentFontSize(editor) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return 14;
    let node = sel.getRangeAt(0).startContainer;
    if (node.nodeType === 3) node = node.parentElement;
    while (node && node !== editor) {
      const fs = window.getComputedStyle(node).fontSize;
      if (fs) return parseFloat(fs);
      node = node.parentElement;
    }
    return parseFloat(window.getComputedStyle(editor).fontSize) || 14;
  }

  function clearInheritedStyleOnEnter(editor) {
    editor.addEventListener('keydown', e => {
      if (e.key !== 'Enter' || e.shiftKey) return;
      setTimeout