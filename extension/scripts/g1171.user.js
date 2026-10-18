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
    let interceptMode = false;

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
      .ehb-root {
        --background:#F4F4F6;--panel-bg:#FEFDFC;--card-bg:#fff;--destructive:#E65C53;
        --text-primary:rgba(0,0,0,.85);--text-secondary:rgba(0,0,0,.5);--text-tertiary:rgba(0,0,0,.35);
        --intensity-3:rgba(0,0,0,.03);--intensity-6:rgba(0,0,0,.06);--intensity-8:rgba(0,0,0,.08);
        --intensity-12:rgba(0,0,0,.12);--input-shadow:rgba(0,0,0,.1);
        --ap-blue:#0A84FF;--ap-blue2:#5E5CE6;
        font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
      }
      .ehb-root[data-theme="dark"] {
        --background:#1c1c1e;--panel-bg:rgba(44,44,46,.9);--card-bg:#2c2c2e;
        --text-primary:rgba(255,255,255,.92);--text-secondary:rgba(255,255,255,.55);--text-tertiary:rgba(255,255,255,.38);
        --intensity-3:rgba(255,255,255,.04);--intensity-6:rgba(255,255,255,.07);--intensity-8:rgba(255,255,255,.1);
        --intensity-12:rgba(255,255,255,.14);--input-shadow:rgba(0,0,0,.5);
        --ap-blue:#0A84FF;--ap-blue2:#7D7AFF;
      }
      .ehb-root, .ehb-root * { box-sizing:border-box!important; }
      .ehb-root button { cursor:pointer; font-family:inherit; }

      #ehb-panel,#ehb-mask,#ehb-toast,#ehb-progress,#ehb-runtime-hl { position:fixed!important; z-index:2147483647!important; }

      #ehb-panel {
        top:0!important; right:14px!important; width:380px!important;
        background:var(--panel-bg)!important;
        backdrop-filter:saturate(180%) blur(40px)!important;
        -webkit-backdrop-filter:saturate(180%) blur(40px)!important;
        border:.5px solid var(--intensity-12)!important;
        border-top:none!important;
        border-radius:0 0 20px 20px!important; overflow:hidden!important;
        box-shadow:0 22px 60px var(--input-shadow),0 2px 8px rgba(0,0,0,.06)!important;
        color:var(--text-primary)!important;
        animation:ehbSlideDown .4s cubic-bezier(.22,.61,.36,1) both;
      }
      @keyframes ehbSlideDown { from{transform:translateY(-100%);opacity:0} to{transform:translateY(0);opacity:1} }
      @keyframes ehbSlideUp   { from{transform:translateY(0);opacity:1}    to{transform:translateY(-100%);opacity:0} }

      .ehb-content { padding:0 8px!important; }
      #ehb-list { display:flex!important; flex-direction:column!important; gap:6px!important; max-height:min(480px, 60vh)!important; overflow-y:auto!important; padding:10px 4px 4px!important; }
      #ehb-list::-webkit-scrollbar { width:4px!important; }
      #ehb-list::-webkit-scrollbar-thumb { background:var(--intensity-12)!important; border-radius:2px!important; }

      .ehb-dock {
        padding:5px 10px 7px!important;
        border-top:.5px solid var(--intensity-8)!important;
        display:flex!important; align-items:center!important;
        justify-content:space-between!important;
        gap:6px!important; margin-top:4px!important;
      }
      .ehb-dock-left  { display:flex!important; align-items:center!important; gap:5px!important; flex:1!important; min-width:0!important; }
      .ehb-dock-right { display:flex!important; align-items:center!important; gap:2px!important; flex:0 0 auto!important; }

      .ehb-add-btn {
        flex:0 0 auto!important;
        display:inline-flex!important; align-items:center!important; gap:4px!important;
        height:26px!important; padding:0 12px 0 8px!important;
        border-radius:999px!important; border:none!important;
        background:linear-gradient(135deg,var(--ap-blue),var(--ap-blue2))!important;
        color:#fff!important; font-size:11.5px!important; font-weight:600!important; letter-spacing:-.1px!important;
        box-shadow:0 2px 8px rgba(10,132,255,.26)!important;
        transition:transform .12s,box-shadow .12s!important;
        white-space:nowrap!important;
      }
      .ehb-add-btn:hover { transform:translateY(-1px)!important; box-shadow:0 4px 12px rgba(10,132,255,.36)!important; }
      .ehb-add-btn:active { transform:scale(.97)!important; }
      .ehb-add-btn svg { width:12px!important; height:12px!important; display:block!important; flex-shrink:0!important; }

      .ehb-dock-group {
        display:flex!important; align-items:center!important; gap:0!important;
        background:var(--intensity-6)!important; border-radius:8px!important; padding:2px!important;
        flex:0 0 auto!important;
      }
      .ehb-divider { width:1px!important; height:12px!important; background:var(--intensity-12)!important; flex-shrink:0!important; margin:0 2px!important; }

      .ehb-dico {
        width:26px!important; height:24px!important; border-radius:6px!important; border:none!important;
        background:transparent!important; color:var(--text-secondary)!important;
        display:flex!important; align-items:center!important; justify-content:center!important;
        transition:background .15s,color .15s,transform .12s!important;
      }
      .ehb-dico:hover { background:var(--card-bg)!important; color:var(--text-primary)!important; box-shadow:0 1px 3px rgba(0,0,0,.06)!important; }
      .ehb-dico:active { transform:scale(.9)!important; }
      .ehb-dico.rec { color:var(--destructive)!important; }
      .ehb-dico.rec:hover { background:color-mix(in srgb,var(--destructive) 12%,var(--card-bg))!important; }
      .ehb-dico.rec.active { animation:ehbPulse 1s infinite!important; }
      .ehb-dico svg { width:14px!important; height:14px!important; display:block!important; }
      @keyframes ehbPulse{0%,100%{opacity:1}50%{opacity:.5}}

      .ehb-ico {
        width:26px!important; height:26px!important; border-radius:7px!important;
        border:none!important; background:transparent!important; color:var(--text-secondary)!important;
        display:flex!important; align-items:center!important; justify-content:center!important;
        transition:background .15s,color .15s,transform .12s!important;
      }
      .ehb-ico:hover { background:var(--intensity-8)!important; color:var(--text-primary)!important; }
      .ehb-ico:active { transform:scale(.9)!important; }
      .ehb-ico.ehb-close { color:var(--text-tertiary)!important; }
      .ehb-ico.ehb-close:hover {
        background:color-mix(in srgb,var(--destructive) 14%,transparent)!important;
        color:var(--destructive)!important;
      }
      .ehb-ico svg { width:14px!important; height:14px!important; display:block!important; }

      .ehb-ico.intercept { color:var(--text-tertiary)!important; }
      .ehb-ico.intercept:hover { background:color-mix(in srgb,var(--ap-blue) 12%,transparent)!important; color:var(--ap-blue)!important; }
      .ehb-ico.intercept.on {
        color:var(--ap-blue)!important;
        background:color-mix(in srgb,var(--ap-blue) 14%,transparent)!important;
      }
      .ehb-ico.intercept.on:hover { background:color-mix(in srgb,var(--ap-blue) 22%,transparent)!important; }

      .ehb-dico.intercept { color:var(--text-tertiary)!important; }
      .ehb-dico.intercept:hover { background:var(--card-bg)!important; color:var(--ap-blue)!important; box-shadow:0 1px 3px rgba(0,0,0,.06)!important; }
      .ehb-dico.intercept.on { color:var(--ap-blue)!important; }
      .ehb-dico.intercept.on:hover { background:color-mix(in srgb,var(--ap-blue) 14%,var(--card-bg))!important; }

      .ehb-empty { padding:24px 16px!important; text-align:center!important; color:var(--text-tertiary)!important; font-size:11px!important; }
      .ehb-item {
        display:grid!important; grid-template-columns:auto 1fr auto!important; gap:10px!important;
        align-items:center!important;
        background:var(--card-bg)!important; border:.5px solid var(--intensity-8)!important;
        border-radius:12px!important; padding:9px 11px!important;
        transition:border-color .15s!important;
      }
      .ehb-item:hover { border-color:var(--ap-blue)!important; }
      .ehb-kbd {
        padding:4px 8px!important; border-radius:7px!important;
        background:var(--intensity-6)!important; border:.5px solid var(--intensity-8)!important;
        font-size:10px!important; font-weight:600!important; color:var(--text-primary)!important;
        font-family:ui-monospace,monospace!important; white-space:nowrap!important;
      }
      .ehb-item-body { min-width:0!important; }
      .ehb-iname { font-size:12px!important; font-weight:600!important; color:var(--text-primary)!important; margin-bottom:1px!important; overflow:hidden!important; text-overflow:ellipsis!important; white-space:nowrap!important; }
      .ehb-iflow { font-size:10px!important; color:var(--text-secondary)!important; white-space:nowrap!important; overflow:hidden!important; text-overflow:ellipsis!important; }
      .ehb-pill {
        display:inline-flex!important; align-items:center!important; gap:2px!important; margin-top:3px!important;
        padding:2px 6px!important; border-radius:999px!important;
        background:color-mix(in srgb,var(--ap-blue) 14%,transparent)!important;
        color:var(--ap-blue)!important; font-size:8px!important; font-weight:600!important;
      }
      .ehb-racts { display:flex!important; gap:1px!important; }
      .ehb-mini-btn {
        width:28px!important; height:28px!important; border-radius:7px!important;
        border:none!important; background:transparent!important; color:var(--text-secondary)!important;
        display:flex!important; align-items:center!important; justify-content:center!important;
        transition:background .15s,color .15s,transform .12s!important;
      }
      .ehb-mini-btn:hover { background:var(--intensity-6)!important; color:var(--text-primary)!important; }
      .ehb-mini-btn:active { transform:scale(.9)!important; }
      .ehb-mini-btn.run:hover { color:var(--ap-blue)!important; }
      .ehb-mini-btn.del:hover { color:var(--destructive)!important; }
      .ehb-mini-btn svg { width:14px!important; height:14px!important; display:block!important; }

      #ehb-mask {
        inset:0!important; background:rgba(0,0,0,.45)!important; backdrop-filter:blur(8px)!important;
        display:flex!important; align-items:center!important; justify-content:center!important;
      }
      .ehb-modal {
        background:var(--panel-bg)!important; backdrop-filter:saturate(180%) blur(28px)!important;
        -webkit-backdrop-filter:saturate(180%) blur(28px)!important;
        border:.5px solid var(--intensity-12)!important; border-radius:20px!important;
        box-shadow:0 22px 60px var(--input-shadow)!important;
        overflow:hidden!important; width:92%!important; max-width:620px!important;
        max-height:88vh!important; display:flex!important; flex-direction:column!important;
        color:var(--text-primary)!important;
      }
      .ehb-m-head {
        display:flex!important; align-items:center!important; gap:10px!important;
        padding:15px 16px!important; border-bottom:.5px solid var(--intensity-8)!important;
      }
      .ehb-m-title { font-size:14px!important; font-weight:600!important; margin:0!important; }
      .ehb-m-sub { font-size:11px!important; color:var(--text-tertiary)!important; margin-top:1px!important; }
      .ehb-m-spacer { flex:1!important; }
      .ehb-xbtn {
        width:30px!important; height:30px!important; border-radius:8px!important;
        border:none!important; background:transparent!important; color:var(--text-secondary)!important;
        display:flex!important; align-items:center!important; justify-content:center!important;
        transition:background .15s,color .15s!important;
      }
      .ehb-xbtn:hover { background:color-mix(in srgb,var(--destructive) 14%,transparent)!important; color:var(--destructive)!important; }
      .ehb-xbtn svg { width:15px!important; height:15px!important; }
      .ehb-m-body { padding:16px!important; overflow-y:auto!important; flex:1!important; display:flex!important; flex-direction:column!important; gap:12px!important; }
      .ehb-m-foot {
        display:flex!important; justify-content:flex-end!important; gap:8px!important;
        padding:12px 16px!important; border-top:.5px solid var(--intensity-8)!important;
        background:linear-gradient(180deg,transparent,var(--intensity-3))!important;
      }

      .ehb-field { display:flex!important; flex-direction:column!important; gap:6px!important; margin-bottom:2px!important; }
      .ehb-label { font-size:11px!important; font-weight:600!important; color:var(--text-secondary)!important; padding-left:2px!important; }
      .ehb-inp {
        height:36px!important; border:.5px solid var(--intensity-8)!important; border-radius:10px!important;
        background:var(--intensity-3)!important; color:var(--text-primary)!important;
        padding:0 12px!important; font-size:13px!important; outline:none!important;
        transition:border-color .15s,box-shadow .15s!important; width:100%!important; font-family:inherit!important;
      }
      .ehb-inp:focus { border-color:var(--ap-blue)!important; box-shadow:0 0 0 3px color-mix(in srgb,var(--ap-blue) 16%,transparent)!important; }
      .ehb-inp.mono { font-family:ui-monospace,monospace!important; }
      .ehb-keycap {
        height:42px!important; display:flex!important; align-items:center!important; justify-content:center!important;
        letter-spacing:2px!important; font-weight:600!important; font-size:14px!important;
        font-family:ui-monospace,monospace!important; border-radius:10px!important;
        border:1px dashed var(--intensity-12)!important; background:var(--intensity-3)!important;
        color:var(--ap-blue)!important; cursor:pointer!important; outline:none!important; width:100%!important;
        transition:border-color .15s!important;
      }
      .ehb-keycap:focus { border-color:var(--ap-blue)!important; box-shadow:0 0 0 3px color-mix(in srgb,var(--ap-blue) 16%,transparent)!important; }
      .ehb-hint { font-size:10px!important; color:var(--text-tertiary)!important; padding-left:2px!important; }
      .ehb-inp-ta {
        width:100%!important; padding:8px 12px!important; background:var(--intensity-3)!important;
        border:.5px solid var(--intensity-8)!important; border-radius:10px!important;
        color:var(--text-primary)!important; font-size:12px!important; outline:none!important;
        font-family:ui-monospace,monospace!important; resize:vertical!important; min-height:60px!important;
        transition:border-color .15s,box-shadow .15s!important;
      }
      .ehb-inp-ta:focus { border-color:var(--ap-blue)!important; box-shadow:0 0 0 3px color-mix(in srgb,var(--ap-blue) 16%,transparent)!important; }

      .ehb-steps-head { display:flex!important; justify-content:space-between!important; align-items:center!important; margin-bottom:10px!important; }
      .ehb-badge { padding:3px 8px!important; border-radius:6px!important; background:color-mix(in srgb,var(--ap-blue) 14%,transparent)!important; color:var(--ap-blue)!important; font-size:10px!important; font-weight:600!important; }
      .ehb-step { border:.5px solid var(--intensity-8)!important; border-radius:12px!important; background:var(--card-bg)!important; padding:11px!important; margin-bottom:8px!important; transition:border-color .2s!important; }
      .ehb-step:hover { border-color:var(--ap-blue)!important; }
      .ehb-step-head { display:flex!important; align-items:center!important; gap:8px!important; margin-bottom:9px!important; }
      .ehb-step-idx { width:22px!important; height:22px!important; border-radius:7px!important; background:linear-gradient(135deg,var(--ap-blue),var(--ap-blue2))!important; color:#fff!important; font-size:11px!important; font-weight:700!important; display:flex!important; align-items:center!important; justify-content:center!important; flex-shrink:0!important; }
      .ehb-step-action-sel { flex:1!important; height:30px!important; border:.5px solid var(--intensity-8)!important; border-radius:8px!important; background:var(--intensity-3)!important; color:var(--text-primary)!important; padding:0 9px!important; font-size:12px!important; outline:none!important; font-family:inherit!important; }
      .ehb-step-tools { display:flex!important; gap:2px!important; flex-shrink:0!important; }
      .ehb-stbtn { width:26px!important; height:26px!important; border-radius:7px!important; border:none!important; background:transparent!important; color:var(--text-tertiary)!important; display:flex!important; align-items:center!important; justify-content:center!important; transition:background .15s,color .15s!important; }
      .ehb-stbtn:hover { background:var(--intensity-6)!important; color:var(--text-primary)!important; }
      .ehb-stbtn.danger:hover { background:color-mix(in srgb,var(--destructive) 14%,transparent)!important; color:var(--destructive)!important; }
      .ehb-stbtn svg { width:13px!important; height:13px!important; }
      .ehb-step-target { display:flex!important; gap:6px!important; margin-bottom:6px!important; }
      .ehb-step-target .ehb-inp { height:32px!important; font-size:12px!important; font-family:ui-monospace,monospace!important; }
      .ehb-pick-btn { height:32px!important; padding:0 11px!important; border-radius:8px!important; border:.5px solid var(--ap-blue)!important; background:color-mix(in srgb,var(--ap-blue) 10%,transparent)!important; color:var(--ap-blue)!important; font-size:11px!important; font-weight:600!important; white-space:nowrap!important; display:flex!important; align-items:center!important; gap:4px!important; }
      .ehb-pick-btn:hover { background:var(--ap-blue)!important; color:#fff!important; }
      .ehb-pick-btn svg { width:13px!important; height:13px!important; }
      .ehb-step-desc { font-size:10px!important; color:var(--text-tertiary)!important; font-family:ui-monospace,monospace!important; overflow:hidden!important; text-overflow:ellipsis!important; white-space:nowrap!important; margin-bottom:8px!important; padding-left:2px!important; }
      .ehb-step-grid { display:grid!important; gap:7px!important; grid-template-columns:1fr 1fr!important; }
      .ehb-mini { display:flex!important; flex-direction:column!important; gap:3px!important; }
      .ehb-mini.full { grid-column:1/-1!important; }
      .ehb-mini label { font-size:10px!important; color:var(--text-tertiary)!important; padding-left:2px!important; }
      .ehb-mini .ehb-inp { height:30px!important; font-size:12px!important; }
      .ehb-add-step { width:100%!important; height:34px!important; border-radius:10px!important; border:1px dashed var(--ap-blue)!important; background:transparent!important; color:var(--ap-blue)!important; font-size:12px!important; font-weight:500!important; transition:background .15s!important; }
      .ehb-add-step:hover { background:color-mix(in srgb,var(--ap-blue) 10%,transparent)!important; }

      .ehb-var-row { display:grid!important; grid-template-columns:1fr 1.3fr auto!important; gap:8px!important; align-items:center!important; margin-bottom:8px!important; }
      .ehb-varbtn { width:32px!important; height:36px!important; border-radius:9px!important; border:none!important; background:transparent!important; color:var(--text-tertiary)!important; display:flex!important; align-items:center!important; justify-content:center!important; transition:background .15s,color .15s!important; }
      .ehb-varbtn:hover { background:color-mix(in srgb,var(--destructive) 14%,transparent)!important; color:var(--destructive)!important; }
      .ehb-varbtn svg { width:15px!important; height:15px!important; }

      .ehb-builtins {
        display:grid!important; grid-template-columns:1fr 1fr!important;
        gap:4px 8px!important; margin-top:4px!important;
      }
      .ehb-bvar-row {
        display:flex!important; align-items:center!important; gap:6px!important;
        padding:3px 6px!important; border-radius:6px!important;
        background:var(--intensity-3)!important;
        overflow:hidden!important;
      }
      .ehb-bvar-desc { font-size:10px!important; color:var(--text-tertiary)!important; white-space:nowrap!important; overflow:hidden!important; text-overflow:ellipsis!important; }
      .ehb-chip { height:20px!important; padding:0 7px!important; display:inline-flex!important; align-items:center!important; border-radius:999px!important; background:var(--intensity-6)!important; border:.5px solid var(--intensity-8)!important; font-size:10px!important; font-family:ui-monospace,monospace!important; color:var(--text-secondary)!important; flex-shrink:0!important; white-space:nowrap!important; }

      .ehb-btn { height:34px!important; padding:0 16px!important; border-radius:10px!important; font-size:12px!important; font-weight:600!important; border:.5px solid var(--intensity-8)!important; background:var(--card-bg)!important; color:var(--text-primary)!important; transition:background .15s,transform .12s!important; display:inline-flex!important; align-items:center!important; justify-content:center!important; gap:4px!important; }
      .ehb-btn:hover { background:var(--intensity-6)!important; }
      .ehb-btn:active { transform:scale(.97)!important; }
      .ehb-btn.pri { border:none!important; color:#fff!important; background:linear-gradient(135deg,var(--ap-blue),var(--ap-blue2))!important; box-shadow:0 3px 10px rgba(10,132,255,.3)!important; }

      .ehb-branch-block { grid-column:1/-1!important; border:1px dashed var(--intensity-12)!important; border-radius:8px!important; padding:8px!important; margin-top:4px!important; }
      .ehb-branch-label { font-size:10px!important; font-weight:600!important; color:var(--text-tertiary)!important; margin-bottom:6px!important; }
      .ehb-branch-step { display:flex!important; gap:6px!important; align-items:center!important; margin-bottom:5px!important; }
      .ehb-branch-step select { flex:1!important; padding:5px 7px!important; background:var(--intensity-3)!important; border:.5px solid var(--intensity-8)!important; border-radius:6px!important; color:var(--text-primary)!important; font-size:11px!important; outline:none!important; }
      .ehb-branch-step input { flex:2!important; padding:5px 7px!important; background:var(--intensity-3)!important; border:.5px solid var(--intensity-8)!important; border-radius:6px!important; color:var(--text-primary)!important; font-size:11px!important; font-family:ui-monospace,monospace!important; outline:none!important; }
      .ehb-branch-add { width:100%!important; padding:5px!important; background:transparent!important; color:var(--ap-blue)!important; border:1px dashed var(--ap-blue)!important; border-radius:6px!important; cursor:pointer!important; font-size:10px!important; margin-top:2px!important; }
      .ehb-branch-add:hover { background:color-mix(in srgb,var(--ap-blue) 10%,transparent)!important; }

      #ehb-toast { bottom:24px!important; left:50%!important; transform:translateX(-50%)!important; background:var(--text-primary)!important; color:var(--card-bg)!important; padding:10px 18px!important; border-radius:12px!important; font-size:12px!important; opacity:0!important; transition:all .3s!important; pointer-events:none!important; box-shadow:0 8px 24px rgba(0,0,0,.2)!important; white-space:nowrap!important; font-family:inherit!important; }
      #ehb-toast.show { opacity:1!important; transform:translateX(-50%) translateY(-4px)!important; }
      #ehb-progress { bottom:24px!important; right:24px!important; background:var(--panel-bg)!important; border:.5px solid var(--ap-blue)!important; border-radius:14px!important; padding:12px 16px!important; color:var(--text-primary)!important; font-size:12px!important; display:none!important; flex-direction:column!important; gap:6px!important; min-width:220px!important; box-shadow:0 8px 24px rgba(0,0,0,.15)!important; font-family:inherit!important; }
      #ehb-progress.show { display:flex!important; }
      .ehb-prog-head { display:flex!important; justify-content:space-between!important; align-items:center!important; font-weight:600!important; font-size:11px!important; }
      .ehb-prog-bar { height:4px!important; background:var(--intensity-8)!important; border-radius:2px!important; overflow:hidden!important; }
      .ehb-prog-fill { height:100%!important; background:linear-gradient(90deg,var(--ap-blue),var(--ap-blue2))!important; transition:width .3s!important; width:0%!important; }
      .ehb-prog-step { font-size:10px!important; color:var(--text-tertiary)!important; }
      #ehb-runtime-hl { pointer-events:none!important; border:3px solid #34d399!important; border-radius:4px!important; display:none!important; transition:all .2s!important; box-shadow:0 0 0 9999px rgba(0,0,0,.12)!important; }
    `;

    const styleEl = document.createElement('style');
    styleEl.id = 'ehb-style'; styleEl.textContent = css;
    document.head.appendChild(styleEl);

    const SVG = {
      vars:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 4C4.8 4 4.3 5 4.3 7c0 2.2-.4 3.4-1.8 4 1.4.6 1.8 1.8 1.8 4 0 2 .5 3 2.2 3"/><path d="M17.5 4c1.7 0 2.2 1 2.2 3 0 2.2.4 3.4 1.8 4-1.4.6-1.8 1.8-1.8 4 0 2-.5 3-2.2 3"/><circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none"/></svg>`,
      moon:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A8.2 8.2 0 1 1 11.2 3a6.4 6.4 0 0 0 9.8 9.8z"/></svg>`,
      sun:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.5M12 19v2.5M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M2.5 12h2.5M19 12h2.5M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8"/></svg>`,
      close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12"/><path d="M18 6L6 18"/></svg>`,
      run:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M7 5l11 7-11 7z" fill="currentColor" stroke="none"/></svg>`,
      edit:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 5.5l4 4"/><path d="M4 20l1-4L16 5l3 3L8 19z"/></svg>`,
      del:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16"/><path d="M9 7V5h6v2"/><path d="M6 7l1 13h10l1-13"/></svg>`,
      rec:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="6" fill="currentColor" stroke="none"/></svg>`,
      stop:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none"/></svg>`,
      imp:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v11"/><path d="M8 10l4 4 4-4"/><path d="M4 19h16"/></svg>`,
      exp:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21V10"/><path d="M8 14l4-4 4 4"/><path d="M4 5h16"/></svg>`,
      pick:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>`,
      up:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 14l6-6 6 6"/></svg>`,
      down:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 10l6 6 6-6"/></svg>`,
      plus:  `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>`,
      shield:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l7 3v5c0 5-3.5 9-7 10C8.5 19 5 15 5 10V5l7-3z"/></svg>`,
    };

    const create = (tag, attrs = {}, html = '') => {
      const el = document.createElement(tag);
      Object.assign(el, attrs);
      if (html) el.innerHTML = html;
      return el;
    };

    const panel = create('div', { id: 'ehb-panel', className: 'ehb-root' }, `
      <div class="ehb-content">
        <div id="ehb-list"></div>
      </div>
      <div class="ehb-dock">
        <div class="ehb-dock-left">
          <button class="ehb-add-btn" id="ehb-add" title="新增绑定">${SVG.plus}新增绑定</button>
          <div class="ehb-dock-group">
            <button class="ehb-dico rec" id="ehb-record" title="录制">${SVG.rec}</button>
            <span class="ehb-divider"></span>
            <button class="ehb-dico" id="ehb-imp" title="导入">${SVG.imp}</button>
            <button class="ehb-dico" id="ehb-exp" title="导出">${SVG.exp}</button>
            <button class="ehb-dico" id="ehb-vars" title="变量管理">${SVG.vars}</button>
            <button class="ehb-dico intercept" id="ehb-intercept" title="录制拦截：关闭（点击开启）">${SVG.shield}</button>
            <button class="ehb-dico" id="ehb-theme" title="切换主题">${SVG.moon}</button>
          </div>
        </div>
        <div class="ehb-dock-right">
          <button class="ehb-ico ehb-close" id="ehb-close-panel" title="收起面板">${SVG.close}</button>
        </div>
      </div>
    `);

    const mask = create('div', { id: 'ehb-mask', className: 'ehb-root' }, `
      <div class="ehb-modal">
        <div class="ehb-m-head">
          <div>
            <div class="ehb-m-title" id="ehb-modal-title">新增快捷键绑定</div>
            <div class="ehb-m-sub" id="ehb-modal-sub"></div>
          </div>
          <div class="ehb-m-spacer"></div>
          <button class="ehb-xbtn" id="ehb-modal-x">${SVG.close}</button>
        </div>
        <div class="ehb-m-body" id="ehb-modal-body"></div>
        <div class="ehb-m-foot">
          <button class="ehb-btn" id="ehb-cancel">取消</button>
          <button class="ehb-btn pri" id="ehb-save">保存</button>
        </div>
      </div>
    `);

    const toastEl    = create('div', { id: 'ehb-toast',    className: 'ehb-root' });
    const progressEl = create('div', { id: 'ehb-progress', className: 'ehb-root' }, `
      <div class="ehb-prog-head"><span id="ehb-prog-title">执行中</span><span id="ehb-prog-count">0/0</span></div>
      <div class="ehb-prog-bar"><div class="ehb-prog-fill" id="ehb-prog-fill"></div></div>
      <div class="ehb-prog-step" id="ehb-prog-step">准备中...</div>
    `);
    const runtimeHl  = create('div', { id: 'ehb-runtime-hl', className: 'ehb-root' });
    const fileInput  = create('input', { type: 'file', accept: '.json', style: 'display:none' });

    mask.style.setProperty('display', 'none', 'important');

    function saveBindings() { localStorage.setItem(STORAGE_KEY, JSON.stringify(bindings)); }
    function saveGlobals()  { localStorage.setItem(VARS_KEY,    JSON.stringify(globals));  }

    function applyTheme() {
      [panel, mask, toastEl, progressEl, runtimeHl].forEach(el => el.setAttribute('data-theme', theme));
      document.documentElement.colorScheme = theme;
      const themeBtn = document.getElementById('ehb-theme');
      if (themeBtn) themeBtn.innerHTML = theme === 'dark' ? SVG.moon : SVG.sun;
    }
    applyTheme();

    [panel, mask, toastEl, progressEl, runtimeHl, fileInput].forEach(el => document.body.appendChild(el));

    const $ = (id) => document.getElementById(id);
    const show = (el, on, mode = 'block') => el.style.setProperty('display', on ? mode : 'none', 'important');
    const isVisible = (el) => el.style.display !== 'none';

    let _panelVisible = true;
    function showPanel(on) {
      if (on) {
        _panelVisible = true;
        panel.style.removeProperty('display');
        panel.style.opacity = '1';
        panel.style.visibility = 'visible';
        panel.style.pointerEvents = 'auto';
        panel.style.animation = 'none';
        void panel.offsetHeight;
        panel.style.animation = 'ehbSlideDown .35s cubic-bezier(.22,.61,.36,1) forwards';
      } else {
        _panelVisible = false;
        panel.style.animation = 'ehbSlideUp .3s cubic-bezier(.55,.06,.68,.25) forwards';
        setTimeout(() => { if (!_panelVisible) { panel.style.display = 'none'; panel.style.animation = ''; } }, 300);
      }
    }
    const showModal = (on) => show(mask, on, 'flex');
    setTimeout(() => showPanel(true), 60);

    function toast(m, type) {
      toastEl.textContent = m;
      toastEl.style.background = type === 'error' ? 'var(--destructive)' : type === 'warn' ? '#f59e0b' : 'var(--text-primary)';
      toastEl.style.color = type ? '#fff' : 'var(--card-bg)';
      toastEl.classList.add('show');
      setTimeout(() => toastEl.classList.remove('show'), 2200);
    }

    function confirmDialog({ title, message, okText, cancelText, thirdText }) {
      return new Promise(resolve => {
        const ov = create('div');
        ov.style.cssText = 'position:fixed!important;z-index:2147483648!important;inset:0!important;background:rgba(0,0,0,.45)!important;backdrop-filter:blur(4px)!important;display:flex!important;align-items:center!important;justify-content:center!important;';
        ov.setAttribute('data-theme', theme); ov.className = 'ehb-root';
        const card = create('div');
        card.style.cssText = 'background:var(--panel-bg)!important;border:.5px solid var(--intensity-12)!important;border-radius:16px!important;padding:20px 22px!important;width:360px!important;max-width:90vw!important;box-shadow:0 22px 60px rgba(0,0,0,.2)!important;color:var(--text-primary)!important;';
        const h = create('div'); h.style.cssText = 'font-size:14px!important;font-weight:600!important;margin-bottom:8px!important;'; h.textContent = title;
        const p = create('div'); p.style.cssText = 'font-size:12px!important;color:var(--text-secondary)!important;margin-bottom:18px!important;line-height:1.6!important;'; p.textContent = message;
        card.appendChild(h); card.appendChild(p);
        const row = create('div'); row.style.cssText = 'display:flex!important;gap:8px!important;justify-content:flex-end!important;';
        const close = () => ov.remove();
        const mkBtn = (text, isPri, val) => { const b = create('button', { className: 'ehb-btn' + (isPri ? ' pri' : ''), textContent: text }); b.addEventListener('click', () => { close(); resolve(val); }); return b; };
        if (cancelText) row.appendChild(mkBtn(cancelText, false, 'cancel'));
        if (thirdText)  row.appendChild(mkBtn(thirdText,  false, 'third'));
        row.appendChild(mkBtn(okText || '确认', true, 'ok'));
        card.appendChild(row); ov.appendChild(card);
        ov.addEventListener('click', (e) => { if (e.target === ov) { close(); resolve('cancel'); } });
        document.body.appendChild(ov); row.lastChild.focus();
      });
    }

    function deepQuery(root, sel) {
      try { const d = root.querySelector(sel); if (d) return d; } catch (e) {}
      for (const el of root.querySelectorAll('*')) { if (el.shadowRoot) { const f = deepQuery(el.shadowRoot, sel); if (f) return f; } }
      return null;
    }
    function deepQueryAll(root, sel) {
      let res = []; try { res = Array.from(root.querySelectorAll(sel)); } catch (e) {}
      for (const el of root.querySelectorAll('*')) { if (el.shadowRoot) res = res.concat(deepQueryAll(el.shadowRoot, sel)); }
      return res;
    }
    function smartQuery(step) {
      if (step.iframeSelector) {
        const iframe = deepQuery(document, step.iframeSelector);
        if (!iframe || !iframe.contentDocument) return null;
        const doc = iframe.contentDocument;
        if (step.elRef && step.elRef.deref) { const r = step.elRef.deref(); if (r && doc.contains(r)) return r; }
        return deepQuery(doc, step.innerSelector || '*');
      }
      if (step.elRef && step.elRef.deref) { const r = step.elRef.deref(); if (r && document.contains(r)) return r; }
      if (step.testid) { const el = deepQuery(document, '[data-testid="' + step.testid + '"]'); if (el) return el; }
      if (step.selector) { const el = deepQuery(document, step.selector); if (el) return el; }
      if (step.text) { const tag = step.tag || '*'; for (const el of document.querySelectorAll(tag)) { if ((el.textContent || '').trim() === step.text) return el; } }
      return null;
    }
    function describeEl(el) {
      let s = el.tagName.toLowerCase();
      if (el.id) s += '#' + el.id;
      else if (el.className && typeof el.className === 'string') { const c = el.className.trim().split(/\s+/)[0]; if (c) s += '.' + c; }
      const txt = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 24);
      if (txt) s += ' "' + txt + '"';
      return s;
    }
    function buildSmartSelector(el) {
      const out = { selector: '', testid: '', text: '', tag: '' };
      if (el.dataset && el.dataset.testid) { out.testid = el.dataset.testid; out.selector = '[data-testid="' + el.dataset.testid + '"]'; return out; }
      if (el.id) { try { if (document.querySelectorAll('#' + CSS.escape(el.id)).length === 1) { out.selector = '#' + CSS.escape(el.id); return out; } } catch (e) {} }
      const txt = (el.textContent || '').trim().replace(/\s+/g, ' ');
      if (txt && txt.length < 50 && el.children.length === 0) { out.text = txt; out.tag = el.tagName.toLowerCase(); }
      const parts = []; let cur = el;
      while (cur && cur.nodeType === 1 && cur !== document.body) {
        let part = cur.tagName.toLowerCase();
        const parent = cur.parentElement;
        if (parent) { const st = Array.from(parent.children).filter(c => c.tagName === cur.tagName); if (st.length > 1) part += ':nth-of-type(' + (st.indexOf(cur) + 1) + ')'; }
        parts.unshift(part); cur = parent;
      }
      out.selector = 'body > ' + parts.join(' > ');
      return out;
    }
    function newStep(action) {
      return { selector:'',testid:'',text:'',tag:'',desc:'',elRef:null,action:action||'click',value:'',delay:0,key:'',dropTarget:'',timeout:5000,varName:'',extractFrom:'text',attrName:'',condition:'exists',conditionValue:'',thenSteps:[],elseSteps:[],code:'',iframeSelector:'',innerSelector:'' };
    }
    function interpolate(str) {
      if (typeof str !== 'string') return str;
      return str.replace(/\$\{([\w\u4e00-\u9fa5\u3400-\u4dbf]+)\}/g, (m, k) => {
        if (runtimeVars[k] !== undefined) return runtimeVars[k];
        if (globals[k] !== undefined) return globals[k];
        switch (k) {
          case '_url': return location.href; case '_host': return location.host; case '_path': return location.pathname;
          case '_title': return document.title; case '_timestamp': return Date.now();
          case '_date': return new Date().toLocaleDateString(); case '_time': return new Date().toLocaleTimeString();
          case '_random': return Math.floor(Math.random() * 1000000); default: return m;
        }
      });
    }

    function renderBranchSteps(branchSteps, container, label) {
      const block = create('div', { className: 'ehb-branch-block' });
      const lbl = create('div', { className: 'ehb-branch-label', textContent: label });
      block.appendChild(lbl);
      const renderRows = () => {
        block.querySelectorAll('.ehb-branch-step').forEach(r => r.remove());
        const addBtn = block.querySelector('.ehb-branch-add');
        branchSteps.forEach((s, i) => {
          const row = create('div', { className: 'ehb-branch-step' });
          const actSel = create('select');
          Object.entries(ACTIONS).forEach(([v, t]) => { const op = create('option', { value: v, textContent: t }); if (s.action === v) op.selected = true; actSel.appendChild(op); });
          actSel.addEventListener('change', () => { s.action = actSel.value; });
          const valInp = create('input', { type: 'text', placeholder: '值/选择器（可选）', value: s.value || s.selector || '' });
          valInp.addEventListener('input', () => { s.value = valInp.value; s.selector = valInp.value; });
          const delBtn = create('button', { className: 'ehb-stbtn danger', textContent: '\u00d7' });
          delBtn.addEventListener('click', () => { branchSteps.splice(i, 1); renderRows(); });
          row.appendChild(actSel); row.appendChild(valInp); row.appendChild(delBtn);
          block.insertBefore(row, addBtn);
        });
      };
      const addBtn = create('button', { className: 'ehb-branch-add', textContent: '\uff0b 添加子步骤' });
      addBtn.addEventListener('click', () => { branchSteps.push(newStep()); renderRows(); });
      block.appendChild(addBtn); renderRows(); container.appendChild(block);
    }

    function renderStepFields(step, container) {
      container.innerHTML = '';
      const grid = create('div', { className: 'ehb-step-grid' });
      const a = step.action;
      const needsTarget = !['delayOnly','runJs'].includes(a)
        && !(a === 'extract' && ['url','title','cookie','timestamp'].includes(step.extractFrom))
        && !(a === 'ifThen' && ['urlContains','varEquals','varContains'].includes(step.condition));
      if (needsTarget) {
        const target = create('div', { className: 'ehb-step-target' });
        const inp = create('input', { type:'text', readOnly:true, className:'ehb-inp mono', placeholder:'目标元素\u2026',
          value: step.iframeSelector ? '\ud83d\uddbc ' + step.iframeSelector.slice(0,20) + ' \u2192 ' + (step.innerSelector||'').slice(0,20)
                                     : (step.selector || step.testid || (step.text ? 'text:'+step.text : '')) });
        const pick = create('button', { className: 'ehb-pick-btn' });
        pick.innerHTML = SVG.pick + '选择';
        pick.addEventListener('click', () => startPickingForStep(step.__idx));
        target.appendChild(inp); target.appendChild(pick); container.appendChild(target);
        container.appendChild(create('div', { className:'ehb-step-desc', textContent: step.desc ? '已选中：'+step.desc : '尚未选择元素' }));
      }
      const addField = (label, key, type, opts) => {
        const cell = create('div', { className:'ehb-mini'+(opts&&opts.full?' full':'') });
        cell.appendChild(create('label', { textContent: label }));
        let inp;
        if (type === 'select') {
          inp = create('select', { className: 'ehb-inp' });
          opts.options.forEach(o => { const op = create('option', { value:o.v, textContent:o.t }); if (step[key]===o.v) op.selected=true; inp.appendChild(op); });
        } else if (type === 'textarea') {
          inp = create('textarea', { className:'ehb-inp-ta', placeholder: opts&&opts.ph||'' });
          inp.value = step[key] || '';
        } else {
          inp = create('input', { type, className:'ehb-inp', placeholder:opts&&opts.ph||'', value:step[key]||'' });
        }
        inp.style.setProperty('height', type==='textarea'?'auto':'30px', 'important');
        inp.style.setProperty('font-size', '12px', 'important');
        inp.addEventListener('input',  () => { step[key] = type==='number'?(parseInt(inp.value,10)||0):inp.value; });
        inp.addEventListener('change', () => { step[key] = type==='number'?(parseInt(inp.value,10)||0):inp.value; if (type==='select') renderSteps(); });
        cell.appendChild(inp); grid.appendChild(cell);
      };
      if (a==='setValue')  addField('\u270f\ufe0f 填充值（支持 ${var}）','value','text',{full:true,ph:'内容或 ${varName} / ${_url}'});
      if (a==='keypress')  addField('\ud83d\udd11 按键','key','text',{ph:'Enter / Tab / a'});
      if (a==='dragdrop')  addField('\ud83c\udfaf 拖拽目标选择器','dropTarget','text',{full:true,ph:'CSS selector'});
      if (a==='waitFor')   addField('\u23f3 超时 (ms)','timeout','number',{ph:'5000'});
      if (a==='extract') {
        addField('\ud83d\udce6 变量名','varName','text',{ph:'orderId'});
        addField('\ud83d\udd0d 提取来源','extractFrom','select',{options:[{v:'text',t:'文本内容'},{v:'value',t:'输入框值'},{v:'attr',t:'属性'},{v:'html',t:'HTML'},{v:'url',t:'页面 URL'},{v:'title',t:'页面标题'},{v:'cookie',t:'Cookie'},{v:'localStorage',t:'localStorage'},{v:'count',t:'元素数量'},{v:'timestamp',t:'时间戳'}]});
        if (step.extractFrom==='attr')       addField('属性名','attrName','text',{ph:'href'});
        if (step.extractFrom==='cookie')     addField('Cookie 键名','attrName','text',{ph:'session_id'});
        if (step.extractFrom==='localStorage') addField('存储键名','attrName','text',{ph:'keyName'});
      }
      if (a==='ifThen') {
        addField('\ud83d\udc00 条件','condition','select',{options:[{v:'exists',t:'元素存在'},{v:'notExists',t:'元素不存在'},{v:'textEquals',t:'文本等于'},{v:'textContains',t:'文本包含'},{v:'textNotContains',t:'文本不包含'},{v:'urlContains',t:'URL 包含'},{v:'varEquals',t:'变量等于'},{v:'varContains',t:'变量包含'}]});
        if (['textEquals','textContains','textNotContains'].includes(step.condition)) addField('\ud83d\udcdc 对比值','conditionValue','text',{full:true,ph:'输入文本或 ${varName}'});
        if (['urlContains'].includes(step.condition)) addField('\ud83d\udd17 URL 包含','conditionValue','text',{full:true,ph:'路径片段'});
        if (['varEquals','varIncludes'].includes(step.condition)) { addField('\ud83d\udce6 变量名','varName','text',{ph:'变量名'}); addField('\ud83d\udcdc 对比值','conditionValue','text',{full:true,ph:'对比值'}); }
      }
      if (a==='runJs') {
        addField('\ud83d\udce6 返回值变量（可选）','varName','text',{ph:'myVar'});
        addField('\ud83d\udcbb JS 代码','code','textarea',{full:true,ph:'vars.x = document.title; return vars.x;'});
      }
      addField('\u23f1 延迟 (ms)','delay','number',{ph:'0'});
      container.appendChild(grid);
      if (a==='ifThen') {
        if (!step.thenSteps) step.thenSteps=[];
        if (!step.elseSteps) step.elseSteps=[];
        renderBranchSteps(step.thenSteps, container, '\u2705 条件成立时执行（Then）');
        renderBranchSteps(step.elseSteps, container, '\u274c 条件不成立时执行（Else）');
      }
    }

    function renderSteps() {
      const wrap = $('ehb-steps'); wrap.innerHTML = '';
      $('ehb-steps-count').textContent = draftSteps.length + ' 步';
      if (!draftSteps.length) {
        const e = create('div',{}); e.style.cssText='padding:14px;text-align:center;color:var(--text-tertiary);font-size:11px;background:var(--intensity-3);border-radius:10px;margin-bottom:10px;'; e.textContent='尚无步骤，点击下方按钮添加'; wrap.appendChild(e); return;
      }
      draftSteps.forEach((step, idx) => {
        step.__idx = idx;
        const box  = create('div', { className:'ehb-step' });
        const head = create('div', { className:'ehb-step-head' });
        const idxBox  = create('div', { className:'ehb-step-idx', textContent: idx+1 });
        const actSel  = create('select', { className:'ehb-step-action-sel' });
        Object.entries(ACTIONS).forEach(([v,t]) => { const op=create('option',{value:v,textContent:t}); if(step.action===v) op.selected=true; actSel.appendChild(op); });
        actSel.addEventListener('change', () => { step.action=actSel.value; renderSteps(); });
        const tools = create('div', { className:'ehb-step-tools' });
        const mk = (svg, danger, fn) => { const b=create('button',{className:'ehb-stbtn'+(danger?' danger':'')}); b.innerHTML=svg; b.addEventListener('click',fn); return b; };
        tools.appendChild(mk(SVG.up,   false, () => { if (idx>0)                   { [draftSteps[idx-1],draftSteps[idx]]=[draftSteps[idx],draftSteps[idx-1]]; renderSteps(); } }));
        tools.appendChild(mk(SVG.down, false, () => { if (idx<draftSteps.length-1) { [draftSteps[idx+1],draftSteps[idx]]=[draftSteps[idx],draftSteps[idx+1]]; renderSteps(); } }));
        tools.appendChild(mk(SVG.close, true, () => { draftSteps.splice(idx,1); renderSteps(); }));
        head.appendChild(idxBox); head.appendChild(actSel); head.appendChild(tools);
        box.appendChild(head);
        const fields = create('div'); renderStepFields(step, fields); box.appendChild(fields);
        wrap.appendChild(box);
      });
    }

    function render() {
      const list = $('ehb-list'); list.innerHTML = '';
      if (!bindings.length) {
        const _emptyDiv = create('div', { className:'ehb-empty' });
        _emptyDiv.innerHTML = '\u2328\ufe0f<br>暂无绑定<br><span style="font-size:10px;">点击底部「新增绑定」或录制按钮开始</span>';
        list.appendChild(_emptyDiv); return;
      }
      bindings.forEach(b => {
        const item = create('div', { className:'ehb-item' });
        const kbd  = create('span', { className:'ehb-kbd', textContent: b.key });
        const body = create('div', { className:'ehb-item-body' });
        const name = create('div', { className:'ehb-iname', textContent: b.name||'未命名绑定' });
        const flow = create('div', { className:'ehb-iflow' });
        flow.title = b.steps.map(s=>(ACTIONS[s.action]||s.action)+'\u00b7'+(s.desc||s.selector||'')).join(' \u2192 ');
        flow.textContent = b.steps.map(s=>ACTIONS[s.action]||s.action).join(' \u2192 ');
        const pill = create('span', { className:'ehb-pill' }); pill.textContent='\u26a1 '+b.steps.length+' 步';
        body.appendChild(name); body.appendChild(flow); body.appendChild(pill);
        const acts = create('div', { className:'ehb-racts' });
        const mkBtn = (svg, cls, fn) => { const bt=create('button',{className:'ehb-mini-btn '+cls}); bt.innerHTML=svg; bt.addEventListener('click',(e)=>{e.stopPropagation();fn();}); return bt; };
        acts.appendChild(mkBtn(SVG.run,  'run', () => executeBinding(b)));
        acts.appendChild(mkBtn(SVG.edit, '',    () => openEditModal(b)));
        acts.appendChild(mkBtn(SVG.del,  'del', () => { bindings.splice(bindings.indexOf(b),1); saveBindings(); render(); }));
        item.appendChild(kbd); item.appendChild(body); item.appendChild(acts);
        list.appendChild(item);
      });
    }

    function comboFromEvent(e) {
      const k=[];
      if(e.ctrlKey) k.push('Ctrl'); if(e.altKey) k.push('Alt'); if(e.shiftKey) k.push('Shift'); if(e.metaKey) k.push('Meta');
      if(e.code==='Space') k.push('Space');
      else if(!['Control','Alt','Shift','Meta'].includes(e.key)) k.push(e.key.length===1?e.key.toUpperCase():e.key);
      return k.join('+');
    }

    function highlightRuntime(el) {
      if (!el) { runtimeHl.style.display='none'; return; }
      const r = el.getBoundingClientRect();
      runtimeHl.style.cssText = 'position:fixed!important;z-index:2147483647!important;display:block!important;left:'+r.left+'px!important;top:'+r.top+'px!important;width:'+r.width+'px!important;height:'+r.height+'px!important;pointer-events:none!important;border:3px solid #34d399!important;border-radius:4px!important;box-shadow:0 0 0 9999px rgba(0,0,0,.12)!important;transition:all .2s!important;';
    }

    function progressShow(total) { progressEl.classList.add('show'); $('ehb-prog-count').textContent='0/'+total; $('ehb-prog-fill').style.width='0%'; }
    function progressUpdate(i,total,label) { $('ehb-prog-count').textContent=i+'/'+total; $('ehb-prog-fill').style.width=(i/total*100)+'%'; $('ehb-prog-step').textContent=label; }
    function progressHide() { setTimeout(()=>{ progressEl.classList.remove('show'); runtimeHl.style.display='none'; },800); }

    async function waitForElement(step, timeout) {
      const start=Date.now();
      while(Date.now()-start<timeout){ const el=smartQuery(step); if(el) return el; await new Promise(r=>setTimeout(r,200)); }
      return null;
    }
    function dispatchClick(el) {
      const opts={bubbles:true,cancelable:true,view:window,button:0};
      try{el.dispatchEvent(new PointerEvent('pointerdown',opts));}catch(e){}
      el.dispatchEvent(new MouseEvent('mousedown',opts));
      try{el.dispatchEvent(new PointerEvent('pointerup',opts));}catch(e){}
      el.dispatchEvent(new MouseEvent('mouseup',opts));
      el.dispatchEvent(new MouseEvent('click',opts));
      if(typeof el.click==='function') el.click();
    }
    function parseCookie(name) {
      const match=document.cookie.split(';').map(s=>s.trim()).find(s=>s.startsWith(name+'='));
      return match?decodeURIComponent(match.slice(name.length+1)):'';
    }

    async function runStep(step) {
      const a=step.action;
      if(a==='delayOnly'){await new Promise(r=>setTimeout(r,step.delay||0));return true;}
      if(a==='runJs'){
        try{const fn=new Function('vars','globals',step.code);const ret=await fn(runtimeVars,globals);if(ret!==undefined&&step.varName)runtimeVars[step.varName]=ret;return true;}
        catch(e){toast('JS 执行失败：'+e.message,'error');return false;}
      }
      if(a==='waitFor'){
        const el=await waitForElement(step,step.timeout||5000);
        if(!el){toast('等待超时：'+(step.desc||step.selector),'error');return false;}
        highlightRuntime(el);return true;
      }
      if(a==='extract'&&['url','title','cookie','timestamp'].includes(step.extractFrom)){
        let v='';
        if(step.extractFrom==='url')       v=location.href;
        else if(step.extractFrom==='title') v=document.title;
        else if(step.extractFrom==='cookie') v=step.attrName?parseCookie(step.attrName):document.cookie;
        else if(step.extractFrom==='timestamp') v=String(Date.now());
        if(step.varName) runtimeVars[step.varName]=v;
        toast('已提取 '+step.varName+' = '+String(v).slice(0,40));return true;
      }
      const el=smartQuery(step);
      if(!el){
        if(a==='ifThen'&&step.condition==='notExists'){
          for(const s of(step.thenSteps||[])){if(s.delay>0)await new Promise(r=>setTimeout(r,s.delay));if(!await runStep(s))return false;}return true;
        }
        if(a==='ifThen'&&['urlContains','varEquals','varContains'].includes(step.condition)){
          let pass=false;
          if(step.condition==='urlContains') pass=location.href.includes(interpolate(step.conditionValue));
          else if(step.condition==='varEquals') pass=String(runtimeVars[step.varName]!==undefined?runtimeVars[step.varName]:(globals[step.varName]||''))===interpolate(step.conditionValue);
          else if(step.condition==='varContains') pass=String(runtimeVars[step.varName]!==undefined?runtimeVars[step.varName]:(globals[step.varName]||'')).includes(interpolate(step.conditionValue));
          const branch=pass?(step.thenSteps||[]):(step.elseSteps||[]);
          for(const s of branch){if(s.delay>0)await new Promise(r=>setTimeout(r,s.delay));if(!await runStep(s))return false;}return true;
        }
        toast('未找到元素：'+(step.desc||step.selector),'error');return false;
      }
      highlightRuntime(el);
      try{
        const opts={bubbles:true,cancelable:true,view:window,button:0};
        switch(a){
          case 'click': dispatchClick(el); break;
          case 'dblclick': dispatchClick(el);await new Promise(r=>setTimeout(r,60));dispatchClick(el);el.dispatchEvent(new MouseEvent('dblclick',opts));break;
          case 'contextmenu': el.dispatchEvent(new MouseEvent('contextmenu',{...opts,button:2}));break;
          case 'focus': el.focus({preventScroll:false});break;
          case 'scrollIntoView': el.scrollIntoView({behavior:'smooth',block:'center'});break;
          case 'submit':{ const form=el.tagName==='FORM'?el:el.form||el.closest('form');if(form)(form.requestSubmit?form.requestSubmit():form.submit());else dispatchClick(el);break; }
          case 'setValue':{
            const proto=el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
            const desc=Object.getOwnPropertyDescriptor(proto,'value');const v=interpolate(step.value);
            if(desc&&desc.set)desc.set.call(el,v);else el.value=v;
            el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));break;
          }
          case 'keypress':{ const k=step.key||'Enter'; ['keydown','keypress','keyup'].forEach(t=>el.dispatchEvent(new KeyboardEvent(t,{key:k,code:k,bubbles:true,cancelable:true}))); break; }
          case 'dragdrop':{
            const target=deepQuery(document,interpolate(step.dropTarget));
            if(!target){toast('拖拽目标未找到','error');return false;}
            const dt=new DataTransfer();const dragOpts={bubbles:true,cancelable:true,dataTransfer:dt};
            el.dispatchEvent(new DragEvent('dragstart',dragOpts));target.dispatchEvent(new DragEvent('dragenter',dragOpts));
            target.dispatchEvent(new DragEvent('dragover',dragOpts));target.dispatchEvent(new DragEvent('drop',dragOpts));
            el.dispatchEvent(new DragEvent('dragend',dragOpts));break;
          }
          case 'extract':{
            let v='';
            if(step.extractFrom==='text') v=(el.textContent||'').trim();
            else if(step.extractFrom==='value') v=el.value||'';
            else if(step.extractFrom==='html') v=el.innerHTML||'';
            else if(step.extractFrom==='attr') v=el.getAttribute(step.attrName)||'';
            else if(step.extractFrom==='count'){const sel=step.selector||step.testid;if(!sel){toast('计数需选择元素','error');return false;}v=String(deepQueryAll(document,sel).length);}
            else if(step.extractFrom==='localStorage') v=localStorage.getItem(step.attrName)||'';
            if(step.varName) runtimeVars[step.varName]=v;
            toast('已提取 '+step.varName+' = '+String(v).slice(0,40));break;
          }
          case 'ifThen':{
            let pass=false;
            if(step.condition==='exists') pass=!!el;
            else if(step.condition==='textEquals') pass=(el.textContent||'').trim()===interpolate(step.conditionValue);
            else if(step.condition==='textContains') pass=(el.textContent||'').includes(interpolate(step.conditionValue));
            else if(step.condition==='textNotContains') pass=!(el.textContent||'').includes(interpolate(step.conditionValue));
            const branch=pass?(step.thenSteps||[]):(step.elseSteps||[]);
            for(const s of branch){if(s.delay>0)await new Promise(r=>setTimeout(r,s.delay));if(!await runStep(s))return false;}break;
          }
        }
        return true;
      }catch(err){toast('执行失败：'+err.message,'error');return false;}
    }

    async function executeBinding(b) {
      Object.keys(runtimeVars).forEach(k=>delete runtimeVars[k]);
      progressShow(b.steps.length); $('ehb-prog-title').textContent='执行：'+(b.name||b.key);
      for(let i=0;i<b.steps.length;i++){
        const step=b.steps[i];
        progressUpdate(i,b.steps.length,(ACTIONS[step.action]||step.action)+' \u00b7 '+(step.desc||step.selector||''));
        if(step.delay>0) await new Promise(r=>setTimeout(r,step.delay));
        if(!await runStep(step)){progressUpdate(i+1,b.steps.length,'已中止');progressHide();return;}
      }
      progressUpdate(b.steps.length,b.steps.length,'\u2705 已完成');progressHide();
      toast('\u2705 已执行 '+b.steps.length+' 步');
    }

    function buildModalBody() {
      const body = $('ehb-modal-body');
      body.innerHTML = `
        <div class="ehb-field">
          <div class="ehb-label">项目名称</div>
          <input class="ehb-inp" id="ehb-name" placeholder="为这个绑定起一个名字（如：一键登录）" maxlength="40">
          <div class="ehb-hint">便于识别与管理，可随时编辑</div>
        </div>
        <div class="ehb-field">
          <div class="ehb-label">触发快捷键</div>
          <div class="ehb-keycap" id="ehb-key" tabindex="0" title="点击后按下组合键">点击后按下组合键</div>
          <div class="ehb-hint">推荐 Alt 组合避免冲突</div>
        </div>
        <div class="ehb-field">
          <div class="ehb-steps-head">
            <div style="font-size:12px;font-weight:600;">动作序列</div>
            <span class="ehb-badge" id="ehb-steps-count">0 步</span>
          </div>
          <div id="ehb-steps"></div>
          <button class="ehb-add-step" id="ehb-add-step">＋ 添加动作步骤</button>
        </div>
      `;
      const keyEl = $('ehb-key');
      keyEl.addEventListener('click', () => { keyEl.textContent='按下组合键…'; keyEl.focus(); });
      keyEl.addEventListener('keydown', (e) => { e.preventDefault(); e.stopPropagation(); const c=comboFromEvent(e); if(c&&!['Ctrl','Alt','Shift','Meta'].includes(c)){keyEl.textContent=c;keyEl.dataset.combo=c;} });
      $('ehb-add-step').addEventListener('click', () => { draftSteps.push(newStep()); renderSteps(); });
    }

    function resetModal() {
      editingId=null; buildModalBody();
      $('ehb-modal-title').textContent='新增快捷键绑定'; $('ehb-modal-sub').textContent='';
      $('ehb-key').textContent='点击后按下组合键'; $('ehb-key').dataset.combo='';
      $('ehb-name').value='';
      draftSteps=[newStep()]; renderSteps();
    }

    function openEditModal(b) {
      editingId=b.id; buildModalBody();
      $('ehb-modal-title').textContent='编辑快捷键绑定';
      $('ehb-modal-sub').textContent='动作链 \u00b7 共 '+b.steps.length+' 步';
      $('ehb-key').textContent=b.key; $('ehb-key').dataset.combo=b.key;
      $('ehb-name').value=b.name||'';
      draftSteps=b.steps.map(s=>({...s,thenSteps:(s.thenSteps||[]).map(x=>({...x})),elseSteps:(s.elseSteps||[]).map(x=>({...x}))}));
      renderSteps(); showModal(true);
    }

    function openVarsModal() {
      editingId='__vars__';
      $('ehb-modal-title').textContent='变量管理';
      $('ehb-modal-sub').innerHTML='在任意输入框用 <code>${变量名}</code> 引用变量值';
      const body=$('ehb-modal-body');
      body.innerHTML=`
        <div class="ehb-field">
          <div class="ehb-label">自定义变量</div>
          <div id="ehb-vars-list"></div>
          <button class="ehb-add-step" id="ehb-add-var">＋ 添加变量</button>
        </div>
        <div class="ehb-field">
          <div class="ehb-label">内置变量（直接使用，无需定义）</div>
          <div class="ehb-builtins">
            <div class="ehb-bvar-row"><span class="ehb-chip">\${_url}</span><span class="ehb-bvar-desc">完整 URL</span></div>
            <div class="ehb-bvar-row"><span class="ehb-chip">\${_host}</span><span class="ehb-bvar-desc">域名（含端口）</span></div>
            <div class="ehb-bvar-row"><span class="ehb-chip">\${_path}</span><span class="ehb-bvar-desc">URL 路径</span></div>
            <div class="ehb-bvar-row"><span class="ehb-chip">\${_title}</span><span class="ehb-bvar-desc">页面标题</span></div>
            <div class="ehb-bvar-row"><span class="ehb-chip">\${_date}</span><span class="ehb-bvar-desc">当前日期</span></div>
            <div class="ehb-bvar-row"><span class="ehb-chip">\${_time}</span><span class="ehb-bvar-desc">当前时间</span></div>
            <div class="ehb-bvar-row"><span class="ehb-chip">\${_timestamp}</span><span class="ehb-bvar-desc">时间戳（毫秒）</span></div>
            <div class="ehb-bvar-row"><span class="ehb-chip">\${_random}</span><span class="ehb-bvar-desc">6 位随机数</span></div>
          </div>
        </div>
      `;
      const renderVars=()=>{
        const list=$('ehb-vars-list');list.innerHTML='';
        Object.entries(globals).forEach(([k,v])=>{
          const row=create('div',{className:'ehb-var-row'});
          const ki=create('input',{className:'ehb-inp mono',value:k,placeholder:'变量名'});
          const vi=create('input',{className:'ehb-inp',value:v,placeholder:'值'});
          const dl=create('button',{className:'ehb-varbtn'});dl.innerHTML=SVG.del;
          let currentKey=k;
          ki.style.setProperty('height','36px','important');vi.style.setProperty('height','36px','important');
          ki.addEventListener('change',()=>{delete globals[currentKey];currentKey=ki.value;globals[currentKey]=vi.value;});
          vi.addEventListener('input',()=>{globals[currentKey]=vi.value;});
          dl.addEventListener('click',()=>{delete globals[currentKey];renderVars();});
          row.appendChild(ki);row.appendChild(vi);row.appendChild(dl);list.appendChild(row);
        });
      };
      renderVars();
      $('ehb-add-var').addEventListener('click',()=>{const key='var'+Date.now();globals[key]='';renderVars();});
      showModal(true);
    }

    $('ehb-add').addEventListener('click', () => { resetModal(); showModal(true); });
    $('ehb-record').addEventListener('click', () => { if (recording) stopRecording(); else startRecording(); });
    $('ehb-imp').addEventListener('click', () => fileInput.click());
    $('ehb-exp').addEventListener('click', () => {
      const data={bindings,globals};
      const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');a.href=url;a.download='ehb-bindings-'+Date.now()+'.json';
      a.click();URL.revokeObjectURL(url);toast('\u2705 已导出');
    });

    $('ehb-intercept').addEventListener('click', () => {
      interceptMode = !interceptMode;
      const btn = $('ehb-intercept');
      if (interceptMode) {
        btn.classList.add('on');
        btn.title = '录制拦截：开启（点击关闭）';
        toast('🛡 拦截模式已开启：录制时将阻止实际操作', 'warn');
      } else {
        btn.classList.remove('on');
        btn.title = '录制拦截：关闭（点击开启）';
        toast('拦截模式已关闭：录制时允许实际操作');
      }
    });

    $('ehb-close-panel').addEventListener('click', () => showPanel(false));
    $('ehb-theme').addEventListener('click', () => { theme=theme==='dark'?'light':'dark'; applyTheme(); });
    $('ehb-vars').addEventListener('click', () => openVarsModal());

    fileInput.addEventListener('change', (e) => {
      const file=e.target.files[0]; if(!file) return;
      const reader=new FileReader();
      reader.onload=async(ev)=>{
        try{
          const data=JSON.parse(ev.target.result);
          const arr=Array.isArray(data)?data:data.bindings;
          if(!Array.isArray(arr)) throw new Error('格式错误');
          const r=await confirmDialog({title:'导入 '+arr.length+' 条绑定',message:'选择导入方式：合并将保留现有绑定并追加新的，覆盖将删除所有现有绑定。',okText:'合并',thirdText:'覆盖',cancelText:'取消'});
          if(r==='cancel') return;
          if(r==='ok'){arr.forEach(b=>{if(!bindings.find(x=>x.key===b.key))bindings.push(b);});}
          else{bindings.length=0;arr.forEach(b=>bindings.push(b));}
          if(data.globals) Object.assign(globals,data.globals);
          saveBindings();saveGlobals();render();toast('\u2705 导入完成');
        }catch(err){toast('导入失败：'+err.message,'error');}
      };
      reader.readAsText(file);fileInput.value='';
    });

    $('ehb-cancel').addEventListener('click', () => { editingId=null; showModal(false); });
    $('ehb-modal-x').addEventListener('click', () => { editingId=null; showModal(false); });
    $('ehb-save').addEventListener('click', () => {
      if(editingId==='__vars__'){saveGlobals();editingId=null;showModal(false);toast('\u2705 变量已保存');return;}
      const keyEl=$('ehb-key');
      const key=keyEl.dataset.combo||keyEl.textContent.trim();
      const name=($('ehb-name').value||'').trim();
      if(!key||key==='点击后按下组合键'||key==='按下组合键…'){toast('请设置快捷键','warn');return;}
      const conflict=bindings.find(b=>b.key===key&&b.id!==editingId);
      if(conflict){toast('⚠️ 快捷键冲突：'+key+' 已被占用','warn');return;}
      const validSteps=draftSteps.filter(s=>s.selector||s.testid||s.text||s.iframeSelector||['delayOnly','runJs'].includes(s.action)||(s.action==='extract'&&['url','title','cookie','timestamp'].includes(s.extractFrom))||(s.action==='ifThen'&&['urlContains','varEquals','varContains'].includes(s.condition)));
      if(!validSteps.length){toast('请至少添加一个有效步骤','warn');return;}
      if(editingId!==null){const b=bindings.find(x=>x.id===editingId);if(b){b.key=key;b.name=name;b.steps=validSteps;}}
      else bindings.push({id:Date.now(),name,key,steps:validSteps});
      editingId=null;saveBindings();showModal(false);render();
      toast('\u2705 已保存：'+(name||key));
    });

    function startPickingForStep(idx) {
      pickingStepIdx=idx; showModal(false); showPanel(false);
      setTimeout(()=>{
        picking=true; document.body.style.cursor='crosshair';
        blockIframes(); attachPickIframes();
        toast('\ud83c\udcaf 请点击页面元素（步骤 '+(idx+1)+'），ESC 取消');
      },60);
    }
    function stopPicking(canceled) {
      picking=false; document.body.style.cursor=''; cleanIframes();
      if(hoverEl){hoverEl.style.outline=savedOutline;hoverEl=null;}
      if(canceled){toast('已取消选择');showPanel(true);showModal(true);}
    }

    const inUI=(el)=>el&&(panel.contains(el)||mask.contains(el)||toastEl.contains(el)||progressEl.contains(el)||runtimeHl.contains(el));

    let _iframeCleanups=[];
    function eachIframe(fn){document.querySelectorAll('iframe').forEach(f=>{try{if(f.contentDocument)fn(f,f.contentDocument);}catch(e){}});}
    function iframePath(el,doc){
      const parts=[];let cur=el;
      while(cur&&cur.nodeType===1&&cur!==(doc.body||doc.documentElement)){
        let p=cur.tagName.toLowerCase();
        if(cur.id) p='#'+CSS.escape(cur.id);
        else if(cur.parentElement){const s=Array.from(cur.parentElement.children).filter(c=>c.tagName===cur.tagName);if(s.length>1)p+=':nth-of-type('+(s.indexOf(cur)+1)+')';}
        parts.unshift(p);cur=cur.parentElement;
      }
      return parts.join(' > ');
    }
    function handleIframePick(target,iframeEl,iframeDoc){
      if(hoverEl) hoverEl.style.outline=savedOutline;
      const step=draftSteps[pickingStepIdx];
      if(step){
        const iframeSel=buildSmartSelector(iframeEl);const innerSel=iframePath(target,iframeDoc);
        step.iframeSelector=iframeSel.selector;step.iframeTestid=iframeSel.testid||'';
        step.innerSelector=innerSel;step.selector='';step.testid='';step.text='';step.tag='';
        step.desc='iframe['+iframeSel.selector.slice(0,30)+'] \u2192 '+innerSel.slice(0,30);
        if(typeof WeakRef!=='undefined') step.elRef=new WeakRef(target);
      }
      pickingStepIdx=-1;picking=false;document.body.style.cursor='';hoverEl=null;
      cleanIframes();showPanel(true);showModal(true);renderSteps();
    }
    function handleIframeRecord(target,iframeEl,iframeDoc){
      const iframeSel=buildSmartSelector(iframeEl);const innerSel=iframePath(target,iframeDoc);
      const step={...newStep('click'),iframeSelector:iframeSel.selector,innerSelector:innerSel,selector:'',testid:'',text:'',tag:''};
      step.desc='iframe \u2192 '+innerSel.slice(0,30);recordedSteps.push(step);
    }
    function blockIframes(){
      eachIframe((f,doc)=>{
        const cbs={};
        ['mousedown','mouseup','pointerdown','pointerup','auxclick','contextmenu','dblclick','submit'].forEach(t=>{cbs[t]=(e)=>blockEvent(e);doc.addEventListener(t,cbs[t],true);});
        _iframeCleanups.push(()=>{Object.entries(cbs).forEach(([t,cb])=>{try{doc.removeEventListener(t,cb,true);}catch(e){}});});
      });
    }
    function cleanIframes(){_iframeCleanups.forEach(fn=>{try{fn();}catch(e){}});_iframeCleanups=[];}
    function attachPickIframes(){
      eachIframe((f,doc)=>{
        const onOver=(e)=>{if(hoverEl)hoverEl.style.outline=savedOutline;hoverEl=e.target;savedOutline=hoverEl.style.outline;hoverEl.style.outline='2px solid #0A84FF';};
        const onClick=(e)=>{e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();handleIframePick(e.target,f,doc);};
        doc.addEventListener('mouseover',onOver,true);doc.addEventListener('click',onClick,true);
        _iframeCleanups.push(()=>{try{doc.removeEventListener('mouseover',onOver,true);}catch(e){}try{doc.removeEventListener('click',onClick,true);}catch(e){}});
      });
    }
    function attachRecordIframes(){
      eachIframe((f,doc)=>{
        const onClick=(e)=>{
          if(interceptMode){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();}
          handleIframeRecord(e.target,f,doc);
        };
        const onInput=(e)=>{
          const tg=e.target;
          if(tg.tagName==='INPUT'||tg.tagName==='TEXTAREA'){
            const innerSel=iframePath(tg,doc);const last=recordedSteps[recordedSteps.length-1];
            if(last&&last.action==='setValue'&&last.innerSelector===innerSel){last.value=tg.value;}
            else{const iframeSel=buildSmartSelector(f);const step={...newStep('setValue'),iframeSelector:iframeSel.selector,innerSelector:innerSel,selector:'',testid:'',text:'',tag:'',value:tg.value};step.desc='iframe \u2192 '+innerSel.slice(0,30);recordedSteps.push(step);}
          }
        };
        doc.addEventListener('click',onClick,true);doc.addEventListener('input',onInput,true);
        _iframeCleanups.push(()=>{try{doc.removeEventListener('click',onClick,true);}catch(e){}try{doc.removeEventListener('input',onInput,true);}catch(e){}});
      });
    }
    const blockEvent=(e)=>{
      if(inUI(e.target)) return;
      if(picking){ e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();return; }
      if(recording&&interceptMode){ e.preventDefault();e.stopPropagation();e.stopImmediatePropagation(); }
    };
    ['mousedown','mouseup','pointerdown','pointerup','auxclick','contextmenu','dblclick','submit'].forEach(type=>document.addEventListener(type,blockEvent,true));

    document.addEventListener('mouseover',(e)=>{
      if(!picking||inUI(e.target)) return;
      if(hoverEl) hoverEl.style.outline=savedOutline;
      hoverEl=e.target;savedOutline=hoverEl.style.outline;hoverEl.style.outline='2px solid #0A84FF';
    },true);

    document.addEventListener('click',(e)=>{
      if(picking&&!inUI(e.target)){
        e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
        if(hoverEl) hoverEl.style.outline=savedOutline;
        const t=e.target;
        if(pickingStepIdx>=0&&draftSteps[pickingStepIdx]){
          const step=draftSteps[pickingStepIdx];const sm=buildSmartSelector(t);
          Object.assign(step,sm);step.desc=describeEl(t);
          if(typeof WeakRef!=='undefined') step.elRef=new WeakRef(t);
        }
        pickingStepIdx=-1;picking=false;document.body.style.cursor='';hoverEl=null;
        showPanel(true);showModal(true);renderSteps();
        return;
      }
      if(recording&&!inUI(e.target)){
        if(interceptMode){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();}
        const sm=buildSmartSelector(e.target);recordedSteps.push({...newStep('click'),...sm,desc:describeEl(e.target)});
      }
    },true);

    function startRecording() {
      recordedSteps=[];recording=true;
      const recBtn=$('ehb-record');
      recBtn.classList.add('active');recBtn.innerHTML=SVG.stop;
      panel.style.opacity='0.5';panel.style.pointerEvents='auto';
      const modeHint=interceptMode?'（拦截模式：实际操作被阻止）':'（透传模式：实际操作照常执行）';
      toast('\ud83d\udd34 录制中 '+modeHint+'，点击 ■ 停止或按 ESC 结束');

      const onInput=(e)=>{
        if(inUI(e.target)) return;
        const tg=e.target;
        if(tg.tagName==='INPUT'||tg.tagName==='TEXTAREA'){
          const last=recordedSteps[recordedSteps.length-1];const sm=buildSmartSelector(tg);
          if(last&&last.action==='setValue'&&last.selector===sm.selector) last.value=tg.value;
          else recordedSteps.push({...newStep('setValue'),...sm,desc:describeEl(tg),value:tg.value});
        }
      };
      const onKey=(e)=>{
        if(inUI(e.target)) return;
        if(['Enter','Tab','Escape'].includes(e.key)){
          e.preventDefault();e.stopPropagation();
          const sm=buildSmartSelector(e.target);recordedSteps.push({...newStep('keypress'),...sm,desc:describeEl(e.target),key:e.key});
        }
      };
      const onBeforeUnload=(e)=>{e.preventDefault();e.returnValue='';return '';};
      recordHandlers={onInput,onKey,onBeforeUnload};
      document.addEventListener('input',onInput,true);
      document.addEventListener('keydown',onKey,true);
      window.addEventListener('beforeunload',onBeforeUnload,true);
      blockIframes();attachRecordIframes();
    }

    function stopRecording() {
      recording=false;
      const recBtn=$('ehb-record');
      recBtn.classList.remove('active');recBtn.innerHTML=SVG.rec;
      panel.style.opacity='1';
      cleanIframes();
      if(recordHandlers){
        document.removeEventListener('input',recordHandlers.onInput,true);
        document.removeEventListener('keydown',recordHandlers.onKey,true);
        window.removeEventListener('beforeunload',recordHandlers.onBeforeUnload,true);
      }
      if(!recordedSteps.length){toast('未录制到任何动作');showPanel(true);return;}
      resetModal();draftSteps=recordedSteps.slice();renderSteps();
      showPanel(true);showModal(true);
      toast('已录制 '+recordedSteps.length+' 步，请设置名称与快捷键');
    }

    document.addEventListener('keydown',(e)=>{
      if(e.key==='Escape'){
        if(picking){stopPicking(true);return;}
        if(recording){stopRecording();return;}
        if(isVisible(mask)){editingId=null;showModal(false);return;}
      }
      if(isVisible(mask)||picking||recording) return;
      const t=e.target;const typingInPage=!inUI(t)&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.isContentEditable);
      if(typingInPage) return;
      const combo=comboFromEvent(e);
      if(!combo||['Ctrl','Alt','Shift','Meta'].includes(combo)) return;
      const b=bindings.find(x=>x.key===combo);
      if(!b) return;
      e.preventDefault();e.stopPropagation();executeBinding(b);
    },true);

    if(window.matchMedia){
      try{
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',(ev)=>{
          theme=ev.matches?'dark':'light';applyTheme();
        });
      }catch(e){}
    }

    render();

    window.__EHB__={
      destroy(){[panel,mask,toastEl,progressEl,runtimeHl,styleEl,fileInput].forEach(el=>el&&el.remove());delete window.__EHB__;},
      bindings,globals,runtimeVars,
      trigger(combo){const b=bindings.find(x=>x.key===combo);if(b)executeBinding(b);},
      test(idx=0){if(bindings[idx])executeBinding(bindings[idx]);},
      setTheme(t){theme=t;applyTheme();},
      record:{start:startRecording,stop:stopRecording},
      open:()=>showPanel(true),
      close:()=>showPanel(false),
      get intercept(){return interceptMode;},
      setIntercept(v){
        interceptMode=!!v;
        const btn=$('ehb-intercept');
        if(btn){btn.classList.toggle('on',interceptMode);btn.title=interceptMode?'录制拦截：开启（点击关闭）':'录制拦截：关闭（点击开启）';}
      },
    };
  });
})();