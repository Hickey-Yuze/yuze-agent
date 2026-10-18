(function () {
  if (window.__EHB__) window.__EHB__.destroy();

  const ready = (fn) => document.body ? fn() : document.addEventListener('DOMContentLoaded', fn);

  ready(() => {
    const STORAGE_KEY = 'ehb-bindings-data';
    const VARS_KEY = 'ehb-globals-data';
    let bindings = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    let globals = JSON.parse(localStorage.getItem(VARS_KEY) || '{}');
    const runtimeVars = {};

    let picking = false, hoverEl = null, savedOutline = '';
    let editingId = null, draftSteps = [], pickingStepIdx = -1;
    let recording = false, recordHandlers = null, recordedSteps = [];

    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    let theme = prefersDark ? 'dark' : 'light';

    const ACTIONS = {
      click: '点击',
      dblclick: '双击',
      contextmenu: '右键菜单',
      focus: '聚焦',
      scrollIntoView: '滚动到元素',
      submit: '提交表单',
      setValue: '填充输入框',
      keypress: '模拟按键',
      dragdrop: '拖拽到目标',
      waitFor: '等待元素出现',
      extract: '提取内容到变量',
      ifThen: '条件判断',
      runJs: '执行自定义 JS',
      delayOnly: '纯延迟等待'
    };

    const css = `
      :root,.ehb-root{
        --ehb-bg:#fff;--ehb-bg-soft:#f8fafc;--ehb-bg-input:#f1f5f9;
        --ehb-border:#e2e8f0;--ehb-border-strong:#cbd5e1;
        --ehb-text:#0f172a;--ehb-text-soft:#475569;--ehb-text-muted:#94a3b8;
        --ehb-primary:#6366f1;--ehb-primary-2:#8b5cf6;--ehb-primary-soft:rgba(99,102,241,.12);
        --ehb-danger:#ef4444;--ehb-success:#10b981;--ehb-warning:#f59e0b;
        --ehb-shadow:0 12px 40px rgba(15,23,42,.12);--ehb-mask:rgba(15,23,42,.45);
      }
      .ehb-root[data-theme="dark"]{
        --ehb-bg:#0f172a;--ehb-bg-soft:#1e293b;--ehb-bg-input:#0f172a;
        --ehb-border:rgba(148,163,184,.18);--ehb-border-strong:rgba(148,163,184,.32);
        --ehb-text:#f1f5f9;--ehb-text-soft:#cbd5e1;--ehb-text-muted:#94a3b8;
        --ehb-primary:#818cf8;--ehb-primary-2:#a78bfa;--ehb-primary-soft:rgba(129,140,248,.18);
        --ehb-danger:#f87171;--ehb-success:#34d399;--ehb-warning:#fbbf24;
        --ehb-shadow:0 20px 60px rgba(0,0,0,.55);--ehb-mask:rgba(0,0,0,.6);
      }
      .ehb-root,.ehb-root *{box-sizing:border-box!important;font-family:-apple-system,"Segoe UI",system-ui,sans-serif!important;}
      #ehb-fab,#ehb-panel,#ehb-mask,#ehb-toast,#ehb-progress,#ehb-runtime-hl{position:fixed!important;z-index:2147483647!important;}
      #ehb-fab{top:20px!important;right:20px!important;width:36px!important;height:36px!important;border-radius:11px!important;border:none!important;cursor:grab!important;background:linear-gradient(135deg,var(--ehb-primary),var(--ehb-primary-2))!important;color:#fff!important;font-size:16px!important;display:flex!important;align-items:center!important;justify-content:center!important;box-shadow:0 6px 18px rgba(99,102,241,.4)!important;transition:transform .2s!important;touch-action:none!important;user-select:none!important;-webkit-user-select:none!important;}
      #ehb-fab:hover{transform:scale(1.1)!important;}
      #ehb-fab.ehb-dragging{cursor:grabbing!important;transition:none!important;transform:none!important;}
      #ehb-panel{top:20px!important;right:20px!important;width:440px!important;color:var(--ehb-text)!important;background:var(--ehb-bg)!important;border:1px solid var(--ehb-border)!important;border-radius:18px!important;box-shadow:var(--ehb-shadow)!important;overflow:hidden!important;}
      .ehb-header{display:flex!important;align-items:center!important;justify-content:space-between!important;padding:16px 18px!important;background:linear-gradient(135deg,var(--ehb-primary-soft),transparent)!important;border-bottom:1px solid var(--ehb-border)!important;}
      .ehb-brand{display:flex!important;align-items:center!important;gap:10px!important;}
      .ehb-logo{width:30px!important;height:30px!important;border-radius:9px!important;background:linear-gradient(135deg,var(--ehb-primary),var(--ehb-primary-2))!important;color:#fff!important;display:flex!important;align-items:center!important;justify-content:center!important;font-size:16px!important;}
      .ehb-title{display:flex!important;flex-direction:column!important;line-height:1.2!important;}
      .ehb-title strong{font-size:14px!important;color:var(--ehb-text)!important;font-weight:600!important;}
      .ehb-title small{font-size:10px!important;color:var(--ehb-text-muted)!important;margin-top:2px!important;}
      .ehb-head-actions{display:flex!important;gap:4px!important;align-items:center!important;}
      .ehb-icon-only{width:28px!important;height:28px!important;border-radius:8px!important;border:none!important;background:transparent!important;color:var(--ehb-text-soft)!important;cursor:pointer!important;display:flex!important;align-items:center!important;justify-content:center!important;font-size:14px!important;transition:all .15s!important;}
      .ehb-icon-only:hover{background:var(--ehb-primary-soft)!important;color:var(--ehb-text)!important;}
      .ehb-body{padding:14px 18px 18px!important;}
      .ehb-tb{display:flex!important;gap:6px!important;margin-bottom:12px!important;flex-wrap:wrap!important;}
      .ehb-btn{padding:7px 12px!important;border-radius:10px!important;border:none!important;font-size:11px!important;cursor:pointer!important;font-weight:500!important;transition:all .2s!important;display:inline-flex!important;align-items:center!important;gap:4px!important;}
      .ehb-pri{background:linear-gradient(135deg,var(--ehb-primary),var(--ehb-primary-2))!important;color:#fff!important;}
      .ehb-pri:hover{transform:translateY(-1px)!important;}
      .ehb-gh{background:var(--ehb-bg-input)!important;color:var(--ehb-text-soft)!important;border:1px solid var(--ehb-border)!important;}
      .ehb-gh:hover{background:var(--ehb-primary-soft)!important;color:var(--ehb-text)!important;}
      .ehb-rec{background:linear-gradient(135deg,#ef4444,#f97316)!important;color:#fff!important;}
      .ehb-rec.active{animation:ehbPulse 1s infinite!important;}
      @keyframes ehbPulse{0%,100%{opacity:1}50%{opacity:.6}}
      #ehb-list{max-height:380px!important;overflow-y:auto!important;}
      #ehb-list::-webkit-scrollbar{width:6px!important;}
      #ehb-list::-webkit-scrollbar-thumb{background:var(--ehb-border-strong)!important;border-radius:3px!important;}
      .ehb-empty{padding:40px 16px!important;text-align:center!important;color:var(--ehb-text-muted)!important;font-size:12px!important;}
      .ehb-empty-icon{font-size:32px!important;margin-bottom:8px!important;opacity:.5!important;}
      .ehb-item{display:grid!important;grid-template-columns:auto 1fr auto!important;gap:10px!important;align-items:center!important;padding:10px 12px!important;border-radius:12px!important;background:var(--ehb-bg-soft)!important;margin-bottom:8px!important;border:1px solid var(--ehb-border)!important;transition:all .2s!important;}
      .ehb-item:hover{border-color:var(--ehb-primary)!important;box-shadow:inset 0 0 0 1px var(--ehb-primary-soft)!important;}
      .ehb-kbd{padding:5px 10px!important;background:var(--ehb-bg)!important;border:1px solid var(--ehb-border-strong)!important;border-radius:7px!important;font-family:ui-monospace,monospace!important;font-size:11px!important;font-weight:600!important;}
      .ehb-item-body{min-width:0!important;}
      .ehb-item-name{font-weight:600!important;color:var(--ehb-text)!important;font-size:12px!important;margin-bottom:2px!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;}
      .ehb-item-flow{font-size:11px!important;color:var(--ehb-text-soft)!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;margin-bottom:2px!important;}
      .ehb-step-pill{display:inline-flex!important;align-items:center!important;gap:3px!important;padding:2px 6px!important;border-radius:4px!important;background:var(--ehb-primary-soft)!important;color:var(--ehb-primary)!important;font-size:9px!important;font-weight:600!important;}
      .ehb-item-actions{display:flex!important;gap:2px!important;}
      #ehb-mask{inset:0!important;background:var(--ehb-mask)!important;backdrop-filter:blur(8px)!important;align-items:center!important;justify-content:center!important;}
      .ehb-modal{background:var(--ehb-bg)!important;border:1px solid var(--ehb-border)!important;border-radius:18px!important;width:92%!important;max-width:620px!important;max-height:88vh!important;overflow:hidden!important;color:var(--ehb-text)!important;display:flex!important;flex-direction:column!important;box-shadow:var(--ehb-shadow)!important;}
      .ehb-modal-head{padding:16px 22px!important;border-bottom:1px solid var(--ehb-border)!important;display:flex!important;align-items:center!important;justify-content:space-between!important;}
      .ehb-modal-head h2{font-size:15px!important;margin:0!important;font-weight:600!important;}
      .ehb-modal-body{padding:18px 22px!important;overflow-y:auto!important;flex:1!important;}
      .ehb-modal-foot{padding:14px 22px!important;border-top:1px solid var(--ehb-border)!important;display:flex!important;gap:8px!important;justify-content:flex-end!important;background:var(--ehb-bg-soft)!important;}
      .ehb-field{margin-bottom:14px!important;}
      .ehb-field label{display:flex!important;align-items:center!important;gap:5px!important;font-size:11px!important;color:var(--ehb-text-soft)!important;margin-bottom:6px!important;font-weight:500!important;}
      .ehb-field input,.ehb-field select,.ehb-field textarea{width:100%!important;padding:9px 12px!important;background:var(--ehb-bg-input)!important;border:1px solid var(--ehb-border)!important;border-radius:9px!important;color:var(--ehb-text)!important;font-size:12px!important;outline:none!important;transition:all .15s!important;font-family:inherit!important;}
      .ehb-field textarea{font-family:ui-monospace,monospace!important;resize:vertical!important;min-height:60px!important;}
      .ehb-field input:focus,.ehb-field select:focus,.ehb-field textarea:focus{border-color:var(--ehb-primary)!important;box-shadow:0 0 0 3px var(--ehb-primary-soft)!important;}
      #ehb-key{cursor:pointer!important;text-align:center!important;font-family:ui-monospace,monospace!important;letter-spacing:2px!important;font-weight:600!important;font-size:14px!important;padding:14px!important;}
      .ehb-hint{font-size:10px!important;color:var(--ehb-text-muted)!important;margin-top:5px!important;}
      .ehb-steps-head{display:flex!important;justify-content:space-between!important;align-items:center!important;margin-bottom:10px!important;}
      .ehb-badge{padding:3px 8px!important;border-radius:6px!important;background:var(--ehb-primary-soft)!important;color:var(--ehb-primary)!important;font-size:10px!important;font-weight:600!important;}
      .ehb-step{background:var(--ehb-bg-soft)!important;border:1px solid var(--ehb-border)!important;border-radius:12px!important;padding:12px!important;margin-bottom:10px!important;transition:border-color .2s!important;}
      .ehb-step:hover{border-color:var(--ehb-primary)!important;}
      .ehb-step-head{display:flex!important;align-items:center!important;justify-content:space-between!important;margin-bottom:10px!important;gap:8px!important;}
      .ehb-step-num{display:flex!important;align-items:center!important;gap:8px!important;flex:1!important;min-width:0!important;}
      .ehb-step-idx{width:24px!important;height:24px!important;border-radius:7px!important;background:linear-gradient(135deg,var(--ehb-primary),var(--ehb-primary-2))!important;color:#fff!important;font-size:11px!important;font-weight:700!important;display:flex!important;align-items:center!important;justify-content:center!important;flex-shrink:0!important;}
      .ehb-step-action-sel{flex:1!important;padding:5px 8px!important;background:var(--ehb-bg)!important;border:1px solid var(--ehb-border)!important;border-radius:7px!important;color:var(--ehb-text)!important;font-size:11px!important;outline:none!important;}
      .ehb-step-tools{display:flex!important;gap:3px!important;flex-shrink:0!important;}
      .ehb-tool-btn{width:24px!important;height:24px!important;border-radius:6px!important;border:1px solid var(--ehb-border)!important;background:var(--ehb-bg)!important;color:var(--ehb-text-soft)!important;cursor:pointer!important;font-size:11px!important;display:flex!important;align-items:center!important;justify-content:center!important;}
      .ehb-tool-btn:hover{background:var(--ehb-primary-soft)!important;color:var(--ehb-primary)!important;}
      .ehb-tool-btn.danger:hover{color:var(--ehb-danger)!important;border-color:var(--ehb-danger)!important;}
      .ehb-step-target{display:flex!important;gap:6px!important;margin-bottom:6px!important;}
      .ehb-step-target input{flex:1!important;padding:7px 9px!important;background:var(--ehb-bg)!important;border:1px solid var(--ehb-border)!important;border-radius:7px!important;color:var(--ehb-text)!important;font-size:11px!important;font-family:ui-monospace,monospace!important;outline:none!important;}
      .ehb-pick-btn{background:var(--ehb-primary-soft)!important;color:var(--ehb-primary)!important;border:1px solid var(--ehb-primary)!important;padding:0 10px!important;border-radius:7px!important;font-size:11px!important;cursor:pointer!important;white-space:nowrap!important;font-weight:600!important;}
      .ehb-pick-btn:hover{background:var(--ehb-primary)!important;color:#fff!important;}
      .ehb-step-desc{font-size:10px!important;color:var(--ehb-text-muted)!important;font-family:ui-monospace,monospace!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;margin-bottom:8px!important;}
      .ehb-step-grid{display:grid!important;gap:6px!important;grid-template-columns:1fr 1fr!important;}
      .ehb-mini{display:flex!important;flex-direction:column!important;gap:3px!important;}
      .ehb-mini.full{grid-column:1/-1!important;}
      .ehb-mini label{font-size:10px!important;color:var(--ehb-text-muted)!important;margin:0!important;}
      .ehb-mini input,.ehb-mini select,.ehb-mini textarea{padding:6px 8px!important;background:var(--ehb-bg)!important;border:1px solid var(--ehb-border)!important;border-radius:6px!important;color:var(--ehb-text)!important;font-size:11px!important;outline:none!important;width:100%!important;font-family:inherit!important;}
      .ehb-mini textarea{font-family:ui-monospace,monospace!important;resize:vertical!important;min-height:50px!important;}
      .ehb-add-step{width:100%!important;padding:10px!important;background:transparent!important;color:var(--ehb-primary)!important;border:1.5px dashed var(--ehb-primary)!important;border-radius:10px!important;cursor:pointer!important;font-size:12px!important;font-weight:500!important;}
      .ehb-add-step:hover{background:var(--ehb-primary-soft)!important;}
      #ehb-toast{bottom:24px!important;left:50%!important;transform:translateX(-50%)!important;background:var(--ehb-text)!important;color:var(--ehb-bg)!important;padding:10px 18px!important;border-radius:12px!important;font-size:12px!important;opacity:0!important;transition:all .3s!important;pointer-events:none!important;box-shadow:0 8px 24px rgba(0,0,0,.2)!important;}
      #ehb-toast.show{opacity:1!important;transform:translateX(-50%) translateY(-4px)!important;}
      #ehb-progress{bottom:24px!important;right:24px!important;background:var(--ehb-bg)!important;border:1px solid var(--ehb-primary)!important;border-radius:14px!important;padding:12px 16px!important;color:var(--ehb-text)!important;font-size:12px!important;display:none!important;flex-direction:column!important;gap:6px!important;min-width:220px!important;box-shadow:var(--ehb-shadow)!important;}
      #ehb-progress.show{display:flex!important;}
      .ehb-prog-head{display:flex!important;justify-content:space-between!important;align-items:center!important;font-weight:600!important;font-size:11px!important;}
      .ehb-prog-bar{height:4px!important;background:var(--ehb-bg-input)!important;border-radius:2px!important;overflow:hidden!important;}
      .ehb-prog-fill{height:100%!important;background:linear-gradient(90deg,var(--ehb-primary),var(--ehb-primary-2))!important;transition:width .3s!important;width:0%!important;}
      .ehb-prog-step{font-size:10px!important;color:var(--ehb-text-muted)!important;}
      #ehb-runtime-hl{pointer-events:none!important;border:3px solid var(--ehb-success)!important;border-radius:4px!important;display:none!important;transition:all .2s!important;box-shadow:0 0 0 9999px rgba(0,0,0,.15)!important;}
      .ehb-var-row{display:grid!important;grid-template-columns:1fr 1fr auto!important;gap:6px!important;margin-bottom:6px!important;}
      .ehb-var-row input{padding:7px 9px!important;background:var(--ehb-bg-input)!important;border:1px solid var(--ehb-border)!important;border-radius:7px!important;color:var(--ehb-text)!important;font-size:11px!important;outline:none!important;}
    `;
    const styleEl = document.createElement('style');
    styleEl.id = 'ehb-style'; styleEl.textContent = css;
    document.head.appendChild(styleEl);

    const create = (tag, attrs = {}, html = '') => {
      const el = document.createElement(tag);
      Object.assign(el, attrs);
      if (html) el.innerHTML = html;
      return el;
    };

    const fab = create('button', { id: 'ehb-fab', textContent: '⌨', title: '一键即发' });
    const panel = create('div', { id: 'ehb-panel', className: 'ehb-root' }, `
      <div class="ehb-header">
        <div class="ehb-brand">
          <div class="ehb-logo">⌨</div>
          <div class="ehb-title"><strong>一键即发</strong><small>动作链 · 录制 · 变量流转</small></div>
        </div>
        <div class="ehb-head-actions">
          <button class="ehb-icon-only" id="ehb-vars" title="变量">🔧</button>
          <button class="ehb-icon-only" id="ehb-theme" title="切换主题">🌓</button>
          <button class="ehb-icon-only" id="ehb-close-panel" title="收起">×</button>
        </div>
      </div>
      <div class="ehb-body">
        <div class="ehb-tb">
          <button class="ehb-btn ehb-pri" id="ehb-add">＋ 新增绑定</button>
          <button class="ehb-btn ehb-rec" id="ehb-record">⏺ 录制</button>
          <button class="ehb-btn ehb-gh" id="ehb-imp">导入</button>
          <button class="ehb-btn ehb-gh" id="ehb-exp">导出</button>
          <button class="ehb-btn ehb-gh" id="ehb-clr">清空</button>
        </div>
        <div id="ehb-list"></div>
      </div>
    `);
    const mask = create('div', { id: 'ehb-mask', className: 'ehb-root' }, `
      <div class="ehb-modal">
        <div class="ehb-modal-head">
          <h2 id="ehb-modal-title">新增快捷键绑定</h2>
          <button class="ehb-icon-only" id="ehb-modal-x">×</button>
        </div>
        <div class="ehb-modal-body" id="ehb-modal-body"></div>
        <div class="ehb-modal-foot">
          <button class="ehb-btn ehb-gh" id="ehb-cancel">取消</button>
          <button class="ehb-btn ehb-pri" id="ehb-save">保存</button>
        </div>
      </div>
    `);
    const toastEl = create('div', { id: 'ehb-toast', className: 'ehb-root' });
    const progressEl = create('div', { id: 'ehb-progress', className: 'ehb-root' }, `
      <div class="ehb-prog-head"><span id="ehb-prog-title">执行中</span><span id="ehb-prog-count">0/0</span></div>
      <div class="ehb-prog-bar"><div class="ehb-prog-fill" id="ehb-prog-fill"></div></div>
      <div class="ehb-prog-step" id="ehb-prog-step">准备中...</div>
    `);
    const runtimeHl = create('div', { id: 'ehb-runtime-hl', className: 'ehb-root' });
    const fileInput = create('input', { type: 'file', accept: '.json', style: 'display:none' });

    panel.style.setProperty('display', 'none', 'important');
    mask.style.setProperty('display', 'none', 'important');

    function saveBindings() { localStorage.setItem(STORAGE_KEY, JSON.stringify(bindings)); }
    function saveGlobals() { localStorage.setItem(VARS_KEY, JSON.stringify(globals)); }

    function applyTheme() {
      [panel, mask, toastEl, progressEl, runtimeHl].forEach(el => el.setAttribute('data-theme', theme));
      document.documentElement.style.colorScheme = theme;
    }
    applyTheme();

    [fab, panel, mask, toastEl, progressEl, runtimeHl, fileInput].forEach(el => document.body.appendChild(el));

    const $ = (id) => document.getElementById(id);
    const show = (el, on, mode = 'block') => el.style.setProperty('display', on ? mode : 'none', 'important');
    const isVisible = (el) => el.style.display !== 'none';

    function toast(m, type) {
      toastEl.textContent = m;
      toastEl.style.background = type === 'error' ? 'var(--ehb-danger)' : type === 'warn' ? 'var(--ehb-warning)' : 'var(--ehb-text)';
      toastEl.style.color = type ? '#fff' : 'var(--ehb-bg)';
      toastEl.classList.add('show');
      setTimeout(() => toastEl.classList.remove('show'), 2200);
    }

    function confirmDialog({ title, message, okText, cancelText, thirdText }) {
      return new Promise(resolve => {
        const ov = create('div');
        ov.style.cssText = 'position:fixed!important;z-index:2147483647!important;inset:0!important;background:var(--ehb-mask)!important;backdrop-filter:blur(4px)!important;display:flex!important;align-items:center!important;justify-content:center!important;';
        ov.setAttribute('data-theme', theme);
        ov.className = 'ehb-root';
        const card = create('div');
        card.style.cssText = 'background:var(--ehb-bg)!important;border:1px solid var(--ehb-border)!important;border-radius:16px!important;padding:20px 22px!important;width:360px!important;max-width:90vw!important;box-shadow:var(--ehb-shadow)!important;color:var(--ehb-text)!important;';
        const h = create('div');
        h.style.cssText = 'font-size:14px!important;font-weight:600!important;margin-bottom:8px!important;';
        h.textContent = title;
        const p = create('div');
        p.style.cssText = 'font-size:12px!important;color:var(--ehb-text-soft)!important;margin-bottom:18px!important;line-height:1.6!important;';
        p.textContent = message;
        card.appendChild(h); card.appendChild(p);
        const row = create('div');
        row.style.cssText = 'display:flex!important;gap:8px!important;justify-content:flex-end!important;';
        const close = () => { ov.remove(); };
        const mkBtn = (text, isPrimary, val) => {
          const b = create('button', { className: 'ehb-btn ' + (isPrimary ? 'ehb-pri' : 'ehb-gh'), textContent: text });
          b.addEventListener('click', () => { close(); resolve(val); });
          return b;
        };
        if (cancelText) row.appendChild(mkBtn(cancelText, false, 'cancel'));
        if (thirdText) row.appendChild(mkBtn(thirdText, false, 'third'));
        row.appendChild(mkBtn(okText || '确认', true, 'ok'));
        card.appendChild(row);
        ov.appendChild(card);
        ov.addEventListener('click', (e) => { if (e.target === ov) { close(); resolve('cancel'); } });
        document.body.appendChild(ov);
        row.lastChild.focus();
      });
    }

    const showFab = (on) => show(fab, on, 'flex');
    const showPanel = (on) => {
      if (on) {
        const r = fab.getBoundingClientRect();
        const pw = 440;
        const gap = 8;
        const spaceRight = window.innerWidth - r.left;
        let px, py;
        if (spaceRight >= pw + r.width + gap) {
          px = r.right + gap;
        } else if (r.left >= pw + gap) {
          px = r.left - pw - gap;
        } else {
          px = Math.max(gap, r.right + gap <= window.innerWidth ? r.right + gap : r.left - pw - gap);
        }
        py = r.top;
        px = Math.max(gap, Math.min(px, window.innerWidth - pw - gap));
        py = Math.max(gap, Math.min(py, window.innerHeight - 80));
        panel.style.setProperty('top', py + 'px', 'important');
        panel.style.setProperty('left', px + 'px', 'important');
        panel.style.setProperty('right', 'auto', 'important');
      }
      show(panel, on, 'block'); showFab(!on);
    };
    const showModal = (on) => show(mask, on, 'flex');

    function deepQuery(root, sel) {
      try {
        const direct = root.querySelector(sel);
        if (direct) return direct;
      } catch (e) {}
      const walker = root.querySelectorAll('*');
      for (const el of walker) {
        if (el.shadowRoot) {
          const found = deepQuery(el.shadowRoot, sel);
          if (found) return found;
        }
      }
      return null;
    }

    function deepQueryAll(root, sel) {
      let results = [];
      try { results = Array.from(root.querySelectorAll(sel)); } catch (e) {}
      const walker = root.querySelectorAll('*');
      for (const el of walker) {
        if (el.shadowRoot) results = results.concat(deepQueryAll(el.shadowRoot, sel));
      }
      return results;
    }

    function smartQuery(step) {
      if (step.elRef && step.elRef.deref) {
        const ref = step.elRef.deref();
        if (ref && document.contains(ref)) return ref;
      }
      if (step.testid) {
        const el = deepQuery(document, `[data-testid="${step.testid}"]`);
        if (el) return el;
      }
      if (step.selector) {
        const el = deepQuery(document, step.selector);
        if (el) return el;
      }
      if (step.text) {
        const tag = step.tag || '*';
        const all = document.querySelectorAll(tag);
        for (const el of all) {
          const t = (el.textContent || '').trim();
          if (t === step.text) return el;
        }
      }
      return null;
    }

    function describeEl(el) {
      let s = el.tagName.toLowerCase();
      if (el.id) s += '#' + el.id;
      else if (el.className && typeof el.className === 'string') {
        const c = el.className.trim().split(/\s+/)[0];
        if (c) s += '.' + c;
      }
      const txt = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 24);
      if (txt) s += ' "' + txt + '"';
      return s;
    }

    function buildSmartSelector(el) {
      const out = { selector: '', testid: '', text: '', tag: '' };
      if (el.dataset && el.dataset.testid) {
        out.testid = el.dataset.testid;
        out.selector = `[data-testid="${el.dataset.testid}"]`;
        return out;
      }
      if (el.id) {
        try {
          if (document.querySelectorAll('#' + CSS.escape(el.id)).length === 1) {
            out.selector = '#' + CSS.escape(el.id);
            return out;
          }
        } catch (e) {}
      }
      const txt = (el.textContent || '').trim().replace(/\s+/g, ' ');
      if (txt && txt.length < 50 && el.children.length === 0) {
        out.text = txt;
        out.tag = el.tagName.toLowerCase();
      }
      const parts = [];
      let cur = el;
      while (cur && cur.nodeType === 1 && cur !== document.body) {
        let part = cur.tagName.toLowerCase();
        const parent = cur.parentElement;
        if (parent) {
          const sameTag = Array.from(parent.children).filter(c => c.tagName === cur.tagName);
          if (sameTag.length > 1) part += ':nth-of-type(' + (sameTag.indexOf(cur) + 1) + ')';
        }
        parts.unshift(part);
        cur = parent;
      }
      out.selector = 'body > ' + parts.join(' > ');
      return out;
    }

    function newStep(action) {
      return { selector: '', testid: '', text: '', tag: '', desc: '', elRef: null, action: action || 'click', value: '', delay: 0, key: '', dropTarget: '', timeout: 5000, varName: '', extractFrom: 'text', attrName: '', condition: 'exists', conditionValue: '', thenSteps: [], elseSteps: [], code: '' };
    }

    function interpolate(str) {
      if (typeof str !== 'string') return str;
      return str.replace(/\$\{(\w+)\}/g, (m, k) => {
        if (runtimeVars[k] !== undefined) return runtimeVars[k];
        if (globals[k] !== undefined) return globals[k];
        switch (k) {
          case '_url': return location.href;
          case '_host': return location.host;
          case '_path': return location.pathname;
          case '_title': return document.title;
          case '_timestamp': return Date.now();
          case '_date': return new Date().toLocaleDateString();
          case '_time': return new Date().toLocaleTimeString();
          case '_random': return Math.floor(Math.random() * 1000000);
          default: return m;
        }
      });
    }

    function renderStepFields(step, container) {
      container.innerHTML = '';
      const grid = create('div', { className: 'ehb-step-grid' });
      const a = step.action;
      const needsTarget = !['delayOnly', 'runJs'].includes(a) && !(a === 'extract' && ['url', 'title', 'cookie', 'timestamp'].includes(step.extractFrom)) && !(a === 'ifThen' && ['urlContains', 'varEquals', 'varContains'].includes(step.condition));

      if (needsTarget) {
        const target = create('div', { className: 'ehb-step-target' });
        const inp = create('input', { type: 'text', readOnly: true, placeholder: '目标元素…', value: step.selector || step.testid || (step.text ? `text:${step.text}` : '') });
        const pick = create('button', { className: 'ehb-pick-btn', textContent: '🎯 选择' });
        pick.addEventListener('click', () => startPickingForStep(step.__idx));
        target.appendChild(inp); target.appendChild(pick);
        container.appendChild(target);
        const desc = create('div', { className: 'ehb-step-desc', textContent: step.desc ? '已选中：' + step.desc : '尚未选择元素' });
        container.appendChild(desc);
      }

      const addField = (label, key, type, opts) => {
        const cell = create('div', { className: 'ehb-mini' + (opts && opts.full ? ' full' : '') });
        cell.appendChild(create('label', { textContent: label }));
        let inp;
        if (type === 'select') {
          inp = create('select');
          opts.options.forEach(o => {
            const op = create('option', { value: o.v, textContent: o.t });
            if (step[key] === o.v) op.selected = true;
            inp.appendChild(op);
          });
        } else if (type === 'textarea') {
          inp = create('textarea', { placeholder: opts && opts.ph || '' });
          inp.value = step[key] || '';
        } else {
          inp = create('input', { type, placeholder: opts && opts.ph || '', value: step[key] || '' });
        }
        inp.addEventListener('input', () => { step[key] = type === 'number' ? (parseInt(inp.value, 10) || 0) : inp.value; });
        inp.addEventListener('change', () => { step[key] = type === 'number' ? (parseInt(inp.value, 10) || 0) : inp.value; if (type === 'select') renderSteps(); });
        cell.appendChild(inp);
        grid.appendChild(cell);
      };

      if (a === 'setValue') addField('✏️ 填充值（支持 ${var}）', 'value', 'text', { full: true, ph: '内容或 ${varName} / ${_url} / ${_date}' });
      if (a === 'keypress') addField('🔑 按键（支持 ${var}）', 'key', 'text', { ph: '如 Enter / Tab / a / ${var}' });
      if (a === 'dragdrop') addField('🎯 拖拽目标选择器（支持 ${var}）', 'dropTarget', 'text', { full: true, ph: 'CSS selector 或 ${var}' });
      if (a === 'waitFor') addField('⏳ 超时 (ms)', 'timeout', 'number', { ph: '5000' });
      if (a === 'extract') {
        addField('📦 变量名', 'varName', 'text', { ph: 'orderId' });
        addField('🔍 提取来源', 'extractFrom', 'select', { options: [{ v: 'text', t: '文本内容' }, { v: 'value', t: '输入框值' }, { v: 'attr', t: '属性' }, { v: 'html', t: 'HTML' }, { v: 'url', t: '当前页面 URL' }, { v: 'title', t: '页面标题' }, { v: 'cookie', t: 'Cookie' }, { v: 'localStorage', t: 'localStorage 值' }, { v: 'count', t: '匹配元素数量' }, { v: 'timestamp', t: '当前时间戳' }] });
        if (step.extractFrom === 'attr') addField('属性名', 'attrName', 'text', { ph: 'href' });
        if (step.extractFrom === 'localStorage') addField('存储键名', 'attrName', 'text', { ph: 'keyName' });
      }
      if (a === 'ifThen') {
        addField('🔀 条件', 'condition', 'select', { options: [{ v: 'exists', t: '元素存在' }, { v: 'notExists', t: '元素不存在' }, { v: 'textEquals', t: '文本等于' }, { v: 'textContains', t: '文本包含' }, { v: 'textNotContains', t: '文本不包含' }, { v: 'urlContains', t: 'URL 包含' }, { v: 'varEquals', t: '变量等于' }, { v: 'varContains', t: '变量包含' }] });
        if (['textEquals', 'textContains', 'textNotContains'].includes(step.condition)) addField('📝 对比值（支持 ${var}）', 'conditionValue', 'text', { full: true, ph: '输入文本或 ${varName}' });
        if (['urlContains'].includes(step.condition)) addField('🔗 URL 包含', 'conditionValue', 'text', { full: true, ph: '路径片段或 ${var}' });
        if (['varEquals', 'varContains'].includes(step.condition)) {
          addField('📦 变量名', 'varName', 'text', { ph: '变量名' });
          addField('📝 对比值', 'conditionValue', 'text', { full: true, ph: '对比值' });
        }
      }
      if (a === 'runJs') addField('💻 JS 代码（vars / globals 可用）', 'code', 'textarea', { full: true, ph: 'vars.x = document.title; return vars.x;' });

      addField('⏱ 延迟 (ms)', 'delay', 'number', { ph: '0' });
      container.appendChild(grid);
    }

    function renderSteps() {
      const wrap = $('ehb-steps');
      wrap.innerHTML = '';
      $('ehb-steps-count').textContent = draftSteps.length + ' 步';
      if (!draftSteps.length) {
        const e = create('div', {}, '');
        e.style.cssText = 'padding:18px;text-align:center;color:var(--ehb-text-muted);font-size:11px;background:var(--ehb-bg-soft);border-radius:10px;margin-bottom:10px;';
        e.textContent = '尚无步骤，点击下方按钮添加';
        wrap.appendChild(e);
        return;
      }
      draftSteps.forEach((step, idx) => {
        step.__idx = idx;
        const box = create('div', { className: 'ehb-step' });
        const head = create('div', { className: 'ehb-step-head' });
        const num = create('div', { className: 'ehb-step-num' });
        const idxBox = create('div', { className: 'ehb-step-idx', textContent: idx + 1 });
        const actSel = create('select', { className: 'ehb-step-action-sel' });
        Object.entries(ACTIONS).forEach(([v, t]) => {
          const op = create('option', { value: v, textContent: t });
          if (step.action === v) op.selected = true;
          actSel.appendChild(op);
        });
        actSel.addEventListener('change', () => { step.action = actSel.value; renderSteps(); });
        num.appendChild(idxBox); num.appendChild(actSel);
        const tools = create('div', { className: 'ehb-step-tools' });
        const mk = (txt, cls, fn) => { const b = create('button', { className: 'ehb-tool-btn' + (cls ? ' ' + cls : ''), textContent: txt }); b.addEventListener('click', fn); return b; };
        tools.appendChild(mk('↑', '', () => { if (idx > 0) { [draftSteps[idx - 1], draftSteps[idx]] = [draftSteps[idx], draftSteps[idx - 1]]; renderSteps(); } }));
        tools.appendChild(mk('↓', '', () => { if (idx < draftSteps.length - 1) { [draftSteps[idx + 1], draftSteps[idx]] = [draftSteps[idx], draftSteps[idx + 1]]; renderSteps(); } }));
        tools.appendChild(mk('×', 'danger', () => { draftSteps.splice(idx, 1); renderSteps(); }));
        head.appendChild(num); head.appendChild(tools);
        box.appendChild(head);
        const fields = create('div');
        renderStepFields(step, fields);
        box.appendChild(fields);
        wrap.appendChild(box);
      });
    }

    function render() {
      const list = $('ehb-list');
      list.innerHTML = '';
      if (!bindings.length) {
        const e = create('div', { className: 'ehb-empty' }, '<div class="ehb-empty-icon">⌨️</div>暂无绑定<br><span style="font-size:10px;">点击「新增绑定」或「录制」开始</span>');
        list.appendChild(e);
        return;
      }
      bindings.forEach(b => {
        const item = create('div', { className: 'ehb-item' });
        const kbd = create('span', { className: 'ehb-kbd', textContent: b.key });
        const body = create('div', { className: 'ehb-item-body' });
        const name = create('div', { className: 'ehb-item-name', textContent: b.name || '未命名绑定' });
        const flow = create('div', { className: 'ehb-item-flow' });
        flow.title = b.steps.map(s => (ACTIONS[s.action] || s.action) + '·' + (s.desc || s.selector || '')).join(' → ');
        flow.textContent = b.steps.map(s => ACTIONS[s.action] || s.action).join(' → ');
        const meta = create('div', { className: 'ehb-item-meta' });
        const pill = create('span', { className: 'ehb-step-pill' }, '⚡ ' + b.steps.length + ' 步');
        meta.appendChild(pill);
        body.appendChild(name); body.appendChild(flow); body.appendChild(meta);
        const acts = create('div', { className: 'ehb-item-actions' });
        const run = create('button', { className: 'ehb-icon-only', title: '试运行', textContent: '▶' });
        run.addEventListener('click', (e) => { e.stopPropagation(); executeBinding(b); });
        const edit = create('button', { className: 'ehb-icon-only', title: '编辑', textContent: '✎' });
        edit.addEventListener('click', (e) => { e.stopPropagation(); openEditModal(b); });
        const del = create('button', { className: 'ehb-icon-only', title: '删除', innerHTML: '🗑' });
        del.addEventListener('click', (e) => { e.stopPropagation(); bindings.splice(bindings.indexOf(b), 1); saveBindings(); render(); });
        acts.appendChild(run); acts.appendChild(edit); acts.appendChild(del);
        item.appendChild(kbd); item.appendChild(body); item.appendChild(acts);
        list.appendChild(item);
      });
    }

    function comboFromEvent(e) {
      const k = [];
      if (e.ctrlKey) k.push('Ctrl');
      if (e.altKey) k.push('Alt');
      if (e.shiftKey) k.push('Shift');
      if (e.metaKey) k.push('Meta');
      if (e.code === 'Space') { k.push('Space'); }
      else if (!['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
        k.push(e.key.length === 1 ? e.key.toUpperCase() : e.key);
      }
      return k.join('+');
    }

    function highlightRuntime(el) {
      if (!el) { runtimeHl.style.display = 'none'; return; }
      const r = el.getBoundingClientRect();
      runtimeHl.style.cssText = `position:fixed!important;z-index:2147483647!important;display:block!important;left:${r.left - 3}px!important;top:${r.top - 3}px!important;width:${r.width + 6}px!important;height:${r.height + 6}px!important;pointer-events:none!important;border:3px solid var(--ehb-success)!important;border-radius:4px!important;box-shadow:0 0 0 9999px rgba(0,0,0,.12)!important;transition:all .2s!important;`;
    }

    function progressShow(total) { progressEl.classList.add('show'); $('ehb-prog-count').textContent = '0/' + total; $('ehb-prog-fill').style.width = '0%'; }
    function progressUpdate(i, total, label) { $('ehb-prog-count').textContent = i + '/' + total; $('ehb-prog-fill').style.width = (i / total * 100) + '%'; $('ehb-prog-step').textContent = label; }
    function progressHide() { setTimeout(() => { progressEl.classList.remove('show'); runtimeHl.style.display = 'none'; }, 800); }

    async function waitForElement(step, timeout) {
      const start = Date.now();
      while (Date.now() - start < timeout) {
        const el = smartQuery(step);
        if (el) return el;
        await new Promise(r => setTimeout(r, 200));
      }
      return null;
    }

    function dispatchClick(el) {
      const opts = { bubbles: true, cancelable: true, view: window, button: 0 };
      try { el.dispatchEvent(new PointerEvent('pointerdown', opts)); } catch (e) {}
      el.dispatchEvent(new MouseEvent('mousedown', opts));
      try { el.dispatchEvent(new PointerEvent('pointerup', opts)); } catch (e) {}
      el.dispatchEvent(new MouseEvent('mouseup', opts));
      el.dispatchEvent(new MouseEvent('click', opts));
      if (typeof el.click === 'function') el.click();
    }

    async function runStep(step) {
      const a = step.action;
      if (a === 'delayOnly') { await new Promise(r => setTimeout(r, step.delay || 0)); return true; }
      if (a === 'runJs') {
        try {
          const fn = new Function('vars', 'globals', step.code);
          const ret = await fn(runtimeVars, globals);
          if (ret !== undefined && step.varName) runtimeVars[step.varName] = ret;
          return true;
        } catch (e) { toast('JS 执行失败：' + e.message, 'error'); return false; }
      }
      if (a === 'waitFor') {
        const el = await waitForElement(step, step.timeout || 5000);
        if (!el) { toast('等待超时：' + (step.desc || step.selector), 'error'); return false; }
        highlightRuntime(el);
        return true;
      }
      if (a === 'extract' && ['url', 'title', 'cookie', 'timestamp'].includes(step.extractFrom)) {
        let v = '';
        if (step.extractFrom === 'url') v = location.href;
        else if (step.extractFrom === 'title') v = document.title;
        else if (step.extractFrom === 'cookie') v = document.cookie;
        else if (step.extractFrom === 'timestamp') v = String(Date.now());
        if (step.varName) runtimeVars[step.varName] = v;
        toast('已提取 ' + step.varName + ' = ' + String(v).slice(0, 40));
        return true;
      }
      const el = smartQuery(step);
      if (!el) {
        if (a === 'ifThen' && step.condition === 'notExists') {
          const branch = step.thenSteps || [];
          if (branch.length) {
            for (const s of branch) {
              if (s.delay > 0) await new Promise(r => setTimeout(r, s.delay));
              const ok = await runStep(s);
              if (!ok) return false;
            }
          }
          return true;
        }
        if (a === 'ifThen' && ['urlContains', 'varEquals', 'varContains'].includes(step.condition)) {
          let pass = false;
          if (step.condition === 'urlContains') pass = location.href.includes(interpolate(step.conditionValue));
          else if (step.condition === 'varEquals') pass = String(runtimeVars[step.varName] || '') === interpolate(step.conditionValue);
          else if (step.condition === 'varContains') pass = String(runtimeVars[step.varName] || '').includes(interpolate(step.conditionValue));
          const branch = pass ? (step.thenSteps || []) : (step.elseSteps || []);
          if (branch.length) {
            for (const s of branch) {
              if (s.delay > 0) await new Promise(r => setTimeout(r, s.delay));
              const ok = await runStep(s);
              if (!ok) return false;
            }
          }
          return true;
        }
        toast('未找到元素：' + (step.desc || step.selector), 'error'); return false;
      }
      highlightRuntime(el);
      try {
        const opts = { bubbles: true, cancelable: true, view: window, button: 0 };
        switch (a) {
          case 'click': dispatchClick(el); break;
          case 'dblclick':
            dispatchClick(el);
            await new Promise(r => setTimeout(r, 60));
            dispatchClick(el);
            el.dispatchEvent(new MouseEvent('dblclick', opts));
            break;
          case 'contextmenu':
            el.dispatchEvent(new MouseEvent('contextmenu', { ...opts, button: 2 }));
            break;
          case 'focus': el.focus({ preventScroll: false }); break;
          case 'scrollIntoView': el.scrollIntoView({ behavior: 'smooth', block: 'center' }); break;
          case 'submit': {
            const form = el.tagName === 'FORM' ? el : el.form || el.closest('form');
            if (form) (form.requestSubmit ? form.requestSubmit() : form.submit());
            else dispatchClick(el);
            break;
          }
          case 'setValue': {
            const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
            const desc = Object.getOwnPropertyDescriptor(proto, 'value');
            const v = interpolate(step.value);
            if (desc && desc.set) desc.set.call(el, v); else el.value = v;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            break;
          }
          case 'keypress': {
            const k = step.key || 'Enter';
            ['keydown', 'keypress', 'keyup'].forEach(t => {
              el.dispatchEvent(new KeyboardEvent(t, { key: k, code: k, bubbles: true, cancelable: true }));
            });
            break;
          }
          case 'dragdrop': {
            const target = deepQuery(document, interpolate(step.dropTarget));
            if (!target) { toast('拖拽目标未找到', 'error'); return false; }
            const dt = new DataTransfer();
            const dragOpts = { bubbles: true, cancelable: true, dataTransfer: dt };
            el.dispatchEvent(new DragEvent('dragstart', dragOpts));
            target.dispatchEvent(new DragEvent('dragenter', dragOpts));
            target.dispatchEvent(new DragEvent('dragover', dragOpts));
            target.dispatchEvent(new DragEvent('drop', dragOpts));
            el.dispatchEvent(new DragEvent('dragend', dragOpts));
            break;
          }
          case 'extract': {
            let v = '';
            if (step.extractFrom === 'text') v = (el.textContent || '').trim();
            else if (step.extractFrom === 'value') v = el.value || '';
            else if (step.extractFrom === 'html') v = el.innerHTML || '';
            else if (step.extractFrom === 'attr') v = el.getAttribute(step.attrName) || '';
            else if (step.extractFrom === 'count') { const sel = step.selector || step.testid; if (!sel) { toast('元素计数需要选择目标元素', 'error'); return false; } v = String(deepQueryAll(document, sel).length); }
            else if (step.extractFrom === 'localStorage') v = localStorage.getItem(step.attrName) || '';
            if (step.varName) runtimeVars[step.varName] = v;
            toast('已提取 ' + step.varName + ' = ' + String(v).slice(0, 40));
            break;
          }
          case 'ifThen': {
            let pass = false;
            if (step.condition === 'exists') pass = !!el;
            else if (step.condition === 'textEquals') pass = (el.textContent || '').trim() === interpolate(step.conditionValue);
            else if (step.condition === 'textContains') pass = (el.textContent || '').includes(interpolate(step.conditionValue));
            else if (step.condition === 'textNotContains') pass = !(el.textContent || '').includes(interpolate(step.conditionValue));
            const branch = pass ? (step.thenSteps || []) : (step.elseSteps || []);
            if (branch && branch.length) {
              for (const s of branch) {
                if (s.delay > 0) await new Promise(r => setTimeout(r, s.delay));
                const ok = await runStep(s);
                if (!ok) return false;
              }
            }
            break;
          }
        }
        return true;
      } catch (err) { toast('执行失败：' + err.message, 'error'); return false; }
    }

    async function executeBinding(b) {
      Object.keys(runtimeVars).forEach(k => delete runtimeVars[k]);
      progressShow(b.steps.length);
      $('ehb-prog-title').textContent = '执行：' + (b.name || b.key);
      for (let i = 0; i < b.steps.length; i++) {
        const step = b.steps[i];
        progressUpdate(i, b.steps.length, (ACTIONS[step.action] || step.action) + ' · ' + (step.desc || step.selector || ''));
        if (step.delay > 0) await new Promise(r => setTimeout(r, step.delay));
        const ok = await runStep(step);
        if (!ok) { progressUpdate(i + 1, b.steps.length, '已中止'); progressHide(); return; }
      }
      progressUpdate(b.steps.length, b.steps.length, '✅ 已完成');
      progressHide();
      toast('✅ 已执行 ' + b.steps.length + ' 步');
    }

    function buildModalBody() {
      const body = $('ehb-modal-body');
      body.innerHTML = `
        <div class="ehb-field">
          <label>📝 项目名称</label>
          <input id="ehb-name" placeholder="为这个绑定起一个名字（如：一键登录）" maxlength="40">
          <div class="ehb-hint">便于识别与管理，可随时编辑</div>
        </div>
        <div class="ehb-field">
          <label>⌨️ 触发快捷键</label>
          <input id="ehb-key" placeholder="点击此处后按下组合键">
          <div class="ehb-hint">支持多键组合，推荐使用 Alt 组合避免冲突</div>
        </div>
        <div class="ehb-field">
          <div class="ehb-steps-head">
            <div style="font-size:12px;font-weight:600;">📋 动作序列</div>
            <span class="ehb-badge" id="ehb-steps-count">0 步</span>
          </div>
          <div id="ehb-steps"></div>
          <button class="ehb-add-step" id="ehb-add-step">＋ 添加动作步骤</button>
        </div>
      `;
      const keyInput = $('ehb-key');
      keyInput.addEventListener('focus', () => { keyInput.value = ''; });
      keyInput.addEventListener('keydown', (e) => { e.preventDefault(); e.stopPropagation(); keyInput.value = comboFromEvent(e); });
      keyInput.addEventListener('beforeinput', (e) => e.preventDefault());
      $('ehb-add-step').addEventListener('click', () => { draftSteps.push(newStep()); renderSteps(); });
    }

    function resetModal() {
      editingId = null;
      buildModalBody();
      $('ehb-modal-title').textContent = '新增快捷键绑定';
      $('ehb-key').value = '';
      $('ehb-name').value = '';
      draftSteps = [newStep()];
      renderSteps();
    }
    function openEditModal(b) {
      editingId = b.id;
      buildModalBody();
      $('ehb-modal-title').textContent = '编辑快捷键绑定';
      $('ehb-key').value = b.key;
      $('ehb-name').value = b.name || '';
      draftSteps = b.steps.map(s => ({ ...s, thenSteps: s.thenSteps || [], elseSteps: s.elseSteps || [] }));
      renderSteps();
      showModal(true);
    }

    function openVarsModal() {
      editingId = '__vars__';
      $('ehb-modal-title').textContent = '🔧 变量';
      const body = $('ehb-modal-body');
      body.innerHTML = `<div class="ehb-field"><div class="ehb-hint">在任意输入框中使用 <code>\${变量名}</code> 即可引用变量</div><div class="ehb-hint" style="margin-top:4px;line-height:1.6;">内置变量：<code>\${_url}</code> 页面地址 · <code>\${_host}</code> 域名 · <code>\${_path}</code> 路径 · <code>\${_title}</code> 页面标题 · <code>\${_date}</code> 日期 · <code>\${_time}</code> 时间 · <code>\${_timestamp}</code> 时间戳 · <code>\${_random}</code> 随机数</div><div id="ehb-vars-list" style="margin-top:10px;"></div><button class="ehb-add-step" id="ehb-add-var" style="margin-top:8px;">＋ 添加变量</button></div>`;
      const renderVars = () => {
        const list = $('ehb-vars-list');
        list.innerHTML = '';
        Object.entries(globals).forEach(([k, v]) => {
          const row = create('div', { className: 'ehb-var-row' });
          const ki = create('input', { value: k, placeholder: '变量名' });
          const vi = create('input', { value: v, placeholder: '值' });
          const dl = create('button', { className: 'ehb-tool-btn danger', textContent: '×' });
          ki.addEventListener('change', () => { delete globals[k]; globals[ki.value] = vi.value; });
          vi.addEventListener('input', () => { globals[ki.value] = vi.value; });
          dl.addEventListener('click', () => { delete globals[k]; renderVars(); });
          row.appendChild(ki); row.appendChild(vi); row.appendChild(dl);
          list.appendChild(row);
        });
      };
      renderVars();
      $('ehb-add-var').addEventListener('click', () => { globals['var' + Date.now()] = ''; renderVars(); });
      showModal(true);
    }

    (() => {
      let fabDrag = null;
      const DRAG_THRESHOLD = 4;
      fab.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        fabDrag = { startX: e.clientX, startY: e.clientY, moved: false,
          origLeft: fab.offsetLeft, origTop: fab.offsetTop,
          origRight: window.innerWidth - fab.getBoundingClientRect().right,
          origBottom: window.innerHeight - fab.getBoundingClientRect().bottom };
        fab.setPointerCapture(e.pointerId);
      });
      fab.addEventListener('pointermove', (e) => {
        if (!fabDrag) return;
        const dx = e.clientX - fabDrag.startX;
        const dy = e.clientY - fabDrag.startY;
        if (!fabDrag.moved && Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return;
        fabDrag.moved = true;
        fab.classList.add('ehb-dragging');
        const r = fab.getBoundingClientRect();
        let newLeft = fabDrag.origLeft + dx;
        let newTop = fabDrag.origTop + dy;
        newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - r.width));
        newTop = Math.max(0, Math.min(newTop, window.innerHeight - r.height));
        fab.style.setProperty('left', newLeft + 'px', 'important');
        fab.style.setProperty('top', newTop + 'px', 'important');
        fab.style.setProperty('right', 'auto', 'important');
      });
      fab.addEventListener('pointerup', (e) => {
        if (!fabDrag) return;
        fab.classList.remove('ehb-dragging');
        if (!fabDrag.moved) { showPanel(true); }
        fabDrag = null;
      });
      fab.addEventListener('lostpointercapture', () => {
        if (fabDrag) { fab.classList.remove('ehb-dragging'); fabDrag = null; }
      });
    })();
    $('ehb-close-panel').addEventListener('click', () => showPanel(false));
    $('ehb-theme').addEventListener('click', () => { theme = theme === 'dark' ? 'light' : 'dark'; applyTheme(); });
    $('ehb-vars').addEventListener('click', () => openVarsModal());
    $('ehb-add').addEventListener('click', () => { resetModal(); showModal(true); });
    $('ehb-clr').addEventListener('click', async () => {
      const r = await confirmDialog({ title: '清空所有绑定', message: '此操作不可撤销，所有快捷键绑定将被删除。', okText: '确认清空', cancelText: '取消' });
      if (r === 'ok') { bindings.length = 0; saveBindings(); render(); toast('已清空'); }
    });
    $('ehb-exp').addEventListener('click', () => {
      const data = { bindings, globals, exportedAt: new Date().toISOString() };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = create('a', { href: url, download: 'ehb-bindings-' + Date.now() + '.json' });
      a.click();
      URL.revokeObjectURL(url);
      toast('JSON 文件已导出');
    });
    $('ehb-imp').addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          const arr = Array.isArray(data) ? data : data.bindings;
          if (!Array.isArray(arr)) throw new Error('格式错误');
          const r = await confirmDialog({ title: '导入 ' + arr.length + ' 条绑定', message: '选择导入方式：合并将保留现有绑定并追加新的，覆盖将删除所有现有绑定。', okText: '合并', thirdText: '覆盖', cancelText: '取消' });
          if (r === 'cancel') return;
          if (r === 'ok') {
            arr.forEach(b => { if (!bindings.find(x => x.key === b.key)) bindings.push(b); });
          } else {
            bindings.length = 0;
            arr.forEach(b => bindings.push(b));
          }
          if (data.globals) Object.assign(globals, data.globals);
          saveBindings(); saveGlobals(); render();
          toast('✅ 导入完成');
        } catch (err) { toast('导入失败：' + err.message, 'error'); }
      };
      reader.readAsText(file);
      fileInput.value = '';
    });

    $('ehb-cancel').addEventListener('click', () => { editingId = null; showModal(false); });
    $('ehb-modal-x').addEventListener('click', () => { editingId = null; showModal(false); });
    $('ehb-save').addEventListener('click', () => {
      if (editingId === '__vars__') { saveGlobals(); editingId = null; showModal(false); toast('✅ 变量已保存'); return; }
      const key = $('ehb-key').value;
      const name = ($('ehb-name').value || '').trim();
      if (!key) { toast('请设置快捷键', 'warn'); return; }
      const conflict = bindings.find(b => b.key === key && b.id !== editingId);
      if (conflict) { toast('⚠️ 快捷键冲突：' + key + ' 已被占用', 'warn'); return; }
      const validSteps = draftSteps.filter(s => s.selector || s.testid || s.text || ['delayOnly', 'runJs'].includes(s.action) || (s.action === 'extract' && ['url', 'title', 'cookie', 'timestamp'].includes(s.extractFrom)) || (s.action === 'ifThen' && ['urlContains', 'varEquals', 'varContains'].includes(s.condition)));
      if (!validSteps.length) { toast('请至少添加一个有效步骤', 'warn'); return; }
      if (editingId !== null) {
        const b = bindings.find(x => x.id === editingId);
        if (b) { b.key = key; b.name = name; b.steps = validSteps; }
      } else {
        bindings.push({ id: Date.now(), name, key, steps: validSteps });
      }
      editingId = null;
      saveBindings();
      showModal(false);
      render();
      toast('✅ 已保存：' + (name || key));
    });
    mask.addEventListener('click', (e) => { if (e.target === mask) { editingId = null; showModal(false); } });

    function startPickingForStep(idx) {
      pickingStepIdx = idx;
      showModal(false); showPanel(false);
      setTimeout(() => {
        picking = true;
        document.body.style.cursor = 'crosshair';
        toast('🎯 请点击页面元素（步骤 ' + (idx + 1) + '），ESC 取消');
      }, 60);
    }
    function stopPicking(canceled) {
      picking = false;
      document.body.style.cursor = '';
      if (hoverEl) { hoverEl.style.outline = savedOutline; hoverEl = null; }
      if (canceled) { toast('已取消选择'); showPanel(true); showModal(true); }
    }

    const inUI = (el) => el && (fab.contains(el) || panel.contains(el) || mask.contains(el) || toastEl.contains(el) || progressEl.contains(el) || runtimeHl.contains(el));

    const blockEvent = (e) => {
      if ((!picking && !recording) || inUI(e.target)) return;
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    };
    ['mousedown', 'mouseup', 'pointerdown', 'pointerup', 'auxclick', 'contextmenu', 'dblclick', 'submit'].forEach(type => {
      document.addEventListener(type, blockEvent, true);
    });

    document.addEventListener('mouseover', (e) => {
      if (!picking || inUI(e.target)) return;
      if (hoverEl) hoverEl.style.outline = savedOutline;
      hoverEl = e.target;
      savedOutline = hoverEl.style.outline;
      hoverEl.style.outline = '2px solid #6366f1';
    }, true);

    document.addEventListener('click', (e) => {
      if (!picking || inUI(e.target)) return;
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      if (hoverEl) hoverEl.style.outline = savedOutline;
      const t = e.target;
      if (pickingStepIdx >= 0 && draftSteps[pickingStepIdx]) {
        const step = draftSteps[pickingStepIdx];
        const sm = buildSmartSelector(t);
        Object.assign(step, sm);
        step.desc = describeEl(t);
        if (typeof WeakRef !== 'undefined') step.elRef = new WeakRef(t);
      }
      pickingStepIdx = -1;
      picking = false;
      document.body.style.cursor = '';
      hoverEl = null;
      showPanel(true); showModal(true);
      renderSteps();
    }, true);

    function startRecording() {
      recordedSteps = [];
      recording = true;
      $('ehb-record').classList.add('active');
      $('ehb-record').textContent = '⏹ 停止';
      showPanel(false);
      toast('🔴 录制中，页面交互已被拦截，再次点击悬浮按钮停止');

      const onClick = (e) => {
        if (inUI(e.target)) return;
        e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
        const sm = buildSmartSelector(e.target);
        recordedSteps.push({ ...newStep('click'), ...sm, desc: describeEl(e.target) });
      };
      const onInput = (e) => {
        if (inUI(e.target)) return;
        const tg = e.target;
        if (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA') {
          const last = recordedSteps[recordedSteps.length - 1];
          const sm = buildSmartSelector(tg);
          if (last && last.action === 'setValue' && last.selector === sm.selector) {
            last.value = tg.value;
          } else {
            recordedSteps.push({ ...newStep('setValue'), ...sm, desc: describeEl(tg), value: tg.value });
          }
        }
      };
      const onKey = (e) => {
        if (inUI(e.target)) return;
        if (['Enter', 'Tab', 'Escape'].includes(e.key)) {
          e.preventDefault(); e.stopPropagation();
          const sm = buildSmartSelector(e.target);
          recordedSteps.push({ ...newStep('keypress'), ...sm, desc: describeEl(e.target), key: e.key });
        }
      };
      const onBeforeUnload = (e) => { e.preventDefault(); e.returnValue = ''; return ''; };
      recordHandlers = { onClick, onInput, onKey, onBeforeUnload };
      document.addEventListener('click', onClick, true);
      document.addEventListener('input', onInput, true);
      document.addEventListener('keydown', onKey, true);
      window.addEventListener('beforeunload', onBeforeUnload, true);
    }
    function stopRecording() {
      recording = false;
      $('ehb-record').classList.remove('active');
      $('ehb-record').textContent = '⏺ 录制';
      if (recordHandlers) {
        document.removeEventListener('click', recordHandlers.onClick, true);
        document.removeEventListener('input', recordHandlers.onInput, true);
        document.removeEventListener('keydown', recordHandlers.onKey, true);
        window.removeEventListener('beforeunload', recordHandlers.onBeforeUnload, true);
      }
      if (!recordedSteps.length) { toast('未录制到任何动作'); showPanel(true); return; }
      resetModal();
      draftSteps = recordedSteps.slice();
      renderSteps();
      showPanel(true);
      showModal(true);
      toast('已录制 ' + recordedSteps.length + ' 步，请设置名称与快捷键');
    }
    $('ehb-record').addEventListener('click', (e) => { e.stopPropagation(); recording ? stopRecording() : startRecording(); });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (picking) { stopPicking(true); return; }
        if (recording) { stopRecording(); return; }
        if (isVisible(mask)) { editingId = null; showModal(false); return; }
      }
      if (isVisible(mask) || picking || recording) return;
      const t = e.target;
      const typingInPage = !inUI(t) && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
      if (typingInPage) return;
      const combo = comboFromEvent(e);
      if (!combo || ['Ctrl', 'Alt', 'Shift', 'Meta'].includes(combo)) return;
      const b = bindings.find(x => x.key === combo);
      if (!b) return;
      e.preventDefault(); e.stopPropagation();
      executeBinding(b);
    }, true);

    if (window.matchMedia) {
      try {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (ev) => {
          theme = ev.matches ? 'dark' : 'light';
          applyTheme();
        });
      } catch (e) {}
    }

    render();

    window.__EHB__ = {
      destroy() { [fab, panel, mask, toastEl, progressEl, runtimeHl, styleEl, fileInput].forEach(el => el && el.remove()); delete window.__EHB__; },
      bindings, globals, runtimeVars,
      trigger(combo) { const b = bindings.find(x => x.key === combo); if (b) executeBinding(b); },
      test(idx = 0) { if (bindings[idx]) executeBinding(bindings[idx]); },
      setTheme(t) { theme = t; applyTheme(); },
      record: { start: startRecording, stop: stopRecording }
    };
  });
})();