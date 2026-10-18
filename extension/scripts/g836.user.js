// ==UserScript==
// @name         待办事项
// @description  右键悬浮球打开菜单
// @include      *
// @icon         data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='%232563eb'%3E%3Cpath d='M14.5 3a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5zm-13-1A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 2z'/%3E%3Cpath d='M7 5.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5m-1.496-.854a.5.5 0 0 1 0 .708l-1.5 1.5a.5.5 0 0 1-.708 0l-.5-.5a.5.5 0 1 1 .708-.708l.146.147 1.146-1.147a.5.5 0 0 1 .708 0M7 9.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5m-1.496-.854a.5.5 0 0 1 0 .708l-1.5 1.5a.5.5 0 0 1-.708 0l-.5-.5a.5.5 0 1 1 .708-.708l.146.147 1.146-1.147a.5.5 0 0 1 .708 0'/%3E%3C/svg%3E
// @run-at       document-end
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// @grant        GM_addValueChangeListener
// @grant        GM_removeValueChangeListener
// @grant        GM_xmlhttpRequest
// @connect      *
// @noframes
// @connect      api.github.com
// @connect      gist.githubusercontent.com
// ==/UserScript==

(function () {
  const W = "tab-todo-widget",
    T = "tab-todo-toggle",
    S = "tab-todo-widget-style",
    M = "tab-todo-menu",
    K = "tab-todo-widget-data-v5",
    P = "tab-todo-widget-position-v5",
    U = "tab-todo-widget-ui-state-v6",
    O = "tab-todo-widget-open-v6",
    SOUND_KEY = "tab-todo-sound-v1",
    FIRED_KEY = "tab-todo-fired-v1",
    BALL_SIZE_KEY = "tab-todo-ball-size-v1",
    REMIND_PANEL_ID = "tab-todo-remind-panel",
    SOUND_PANEL_ID = "tab-todo-sound-panel",
    WEBDAV_CFG_KEY = "tab-todo-webdav-cfg-v1",
    WEBDAV_LAST_KEY = "tab-todo-webdav-last-v1",
    WEBDAV_PANEL_ID = "tab-todo-webdav-panel",
    GITHUB_CFG_KEY  = "tab-todo-github-cfg-v1",
    GITHUB_LAST_KEY = "tab-todo-github-last-v1",
    GITHUB_PANEL_ID = "tab-todo-github-panel";

  const GITHUB_TOKEN   = "";
  const GITHUB_GIST_ID = "";

  if (document.getElementById(W) || document.getElementById(T)) return;

  const isUserscript = typeof GM_getValue === "function" ||
    (typeof GM !== "undefined" && GM && typeof GM.getValue === "function");

  const jp = (v, d) => {
    try { return v == null ? d : (v = JSON.parse(v)) == null ? d : v; }
    catch { return d; }
  };
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

  function createStorage() {
    const hasSync = typeof GM_getValue === "function" && typeof GM_setValue === "function";
    const hasAsync = typeof GM !== "undefined" && GM &&
      typeof GM.getValue === "function" && typeof GM.setValue === "function";
    return {
      async get(k, d) {
        try {
          if (hasSync) return jp(GM_getValue(k, null), d);
          if (hasAsync) return jp(await GM.getValue(k, null), d);
          return jp(localStorage.getItem(k), d);
        } catch { return d; }
      },
      async set(k, v) {
        try {
          const p = JSON.stringify(v);
          if (hasSync) GM_setValue(k, p);
          else if (hasAsync) await GM.setValue(k, p);
          else localStorage.setItem(k, p);
        } catch {}
      },
    };
  }

  const store = createStorage();
  let dead = false, td = [], ui = { filter: "all", open: false }, pos = { right: 20, bottom: 20 };
  let currentSound = 0;
  let ballSize = 44;
  let remindTimers = {};
  let _syncListener = null;
  let wdvCfg = null, ghCfg = null, lpTimer = null, lpFired = false, _syncing = false, _autoSync = null;

  const SOUNDS = [
    { name: "双音", fn: (ctx) => {
      [[660,0],[880,0.15]].forEach(([f,t]) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = "sine"; o.frequency.value = f;
        g.gain.setValueAtTime(0, ctx.currentTime + t);
        g.gain.linearRampToValueAtTime(0.45, ctx.currentTime + t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.35);
        o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.35);
      });
    }},
    { name: "叮咚", fn: (ctx) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = "sine"; o.frequency.setValueAtTime(880, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
      g.gain.setValueAtTime(0.5, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      o.start(); o.stop(ctx.currentTime + 0.5);
    }},
    { name: "清脆", fn: (ctx) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = "triangle"; o.frequency.setValueAtTime(1200, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.15);
      g.gain.setValueAtTime(0.6, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      o.start(); o.stop(ctx.currentTime + 0.25);
    }},
    { name: "提示", fn: (ctx) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = "square"; o.frequency.setValueAtTime(520, ctx.currentTime);
      g.gain.setValueAtTime(0.15, ctx.currentTime);
      g.gain.setValueAtTime(0.15, ctx.currentTime + 0.1);
      g.gain.setValueAtTime(0, ctx.currentTime + 0.12);
      g.gain.setValueAtTime(0.15, ctx.currentTime + 0.22);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      o.start(); o.stop(ctx.currentTime + 0.4);
    }},
    { name: "上升", fn: (ctx) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = "sine";
      o.frequency.setValueAtTime(330, ctx.currentTime);
      o.frequency.linearRampToValueAtTime(990, ctx.currentTime + 0.4);
      g.gain.setValueAtTime(0.4, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
      o.start(); o.stop(ctx.currentTime + 0.45);
    }},
  ];

  let _actx = null;
  function getACtx() {
    if (!_actx || _actx.state === "closed") _actx = new (window.AudioContext || window.webkitAudioContext)();
    if (_actx.state === "suspended") _actx.resume();
    return _actx;
  }
  function playSound(idx) {
    try { SOUNDS[idx >= 0 && idx < SOUNDS.length ? idx : 0].fn(getACtx()); } catch {}
  }

  const CSS_TEXT = `
:root{--bg:rgba(255,255,255,.82);--panel:rgba(255,255,255,.9);--bd:rgba(15,23,42,.08);--tx:#0f172a;--ts:#475569;--tf:#94a3b8;--ac:#2563eb;--ac2:#1d4ed8;--er:#ef4444;--ok:#10b981;--sd:0 18px 50px rgba(15,23,42,.18);--sd2:0 10px 30px rgba(15,23,42,.12);--item:rgba(248,250,252,.92);--inp:rgba(255,255,255,.92);--tb:linear-gradient(135deg,#3b82f6,#2563eb);--tsd:0 12px 30px rgba(37,99,235,.35)}
@media(prefers-color-scheme:dark){:root{--bg:rgba(15,23,42,.86);--panel:rgba(17,24,39,.92);--bd:rgba(255,255,255,.08);--tx:#e5eefb;--ts:#cbd5e1;--tf:#94a3b8;--ac:#60a5fa;--ac2:#3b82f6;--er:#f87171;--ok:#34d399;--sd:0 18px 50px rgba(0,0,0,.45);--sd2:0 10px 30px rgba(0,0,0,.28);--item:rgba(30,41,59,.92);--inp:rgba(15,23,42,.9);--tb:linear-gradient(135deg,#60a5fa,#2563eb);--tsd:0 12px 30px rgba(37,99,235,.42)}}
#tab-todo-toggle{position:fixed;right:20px;bottom:20px;width:44px;height:44px;border:1px solid rgba(255,255,255,.18);border-radius:50%;background:var(--tb);color:#fff;display:flex;align-items:center;justify-content:center;cursor:grab;z-index:2147483648;box-shadow:var(--tsd);user-select:none;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);transition:transform .18s ease,opacity .18s ease,box-shadow .5s ease;font-size:18px;touch-action:none}
#tab-todo-toggle:hover{transform:translateY(-2px) scale(1.03)}
#tab-todo-toggle.dragging{cursor:grabbing;transform:scale(1.05);transition:none}
#tab-todo-toggle .i{pointer-events:none;line-height:1;transform:translateY(-1px)}
#tab-todo-widget{position:fixed;left:20px;top:20px;width:360px;max-width:calc(100vw - 24px);max-height:min(568px,calc(100vh - 24px));color:var(--tx);background:var(--bg);border:1px solid var(--bd);border-radius:22px;box-shadow:var(--sd);backdrop-filter:blur(20px) saturate(140%);-webkit-backdrop-filter:blur(20px) saturate(140%);overflow:hidden;z-index:2147483646;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;transition:opacity .18s ease,transform .18s ease}
#tab-todo-widget.hidden{opacity:0;transform:translateY(10px) scale(.98);pointer-events:none;visibility:hidden}
#tab-todo-widget .sh{display:flex;flex-direction:column;max-height:inherit;background:var(--panel)}
#tab-todo-widget .hd{display:flex;align-items:center;justify-content:space-between;padding:16px 16px 12px;border-bottom:1px solid var(--bd)}
#tab-todo-widget .tw{display:flex;align-items:center;gap:10px;min-width:0}
#tab-todo-widget .badge{width:34px;height:34px;border-radius:12px;display:inline-flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--ac),var(--ac2));color:#fff;box-shadow:var(--sd2);flex-shrink:0}
#tab-todo-widget .ttl{font-size:16px;font-weight:700;line-height:1.2}
#tab-todo-widget .sub{font-size:12px;color:var(--tf);margin-top:2px}
#tab-todo-widget .ib,#tab-todo-widget .fb,#tab-todo-widget .add,#tab-todo-widget .clr,#tab-todo-widget .edit-btn{border:1px solid transparent;outline:none;transition:all .16s ease}
#tab-todo-widget .ib{width:34px;height:34px;border-radius:10px;background:transparent;color:var(--ts);cursor:pointer}
#tab-todo-widget .ib:hover{background:rgba(148,163,184,.12);color:var(--tx)}
#tab-todo-widget .bd{padding:14px;overflow:auto}
#tab-todo-widget .fm{display:grid;grid-template-columns:1fr auto;gap:10px;margin-bottom:14px}
#tab-todo-widget .in,#tab-todo-widget .edit{width:100%;min-width:0;height:44px;border-radius:14px;border:1px solid var(--bd);background:var(--inp);color:var(--tx);padding:0 14px;font-size:14px;box-sizing:border-box;outline:none}
#tab-todo-widget .edit{height:38px;padding:0 12px}
#tab-todo-widget .in::placeholder,#tab-todo-widget .edit::placeholder{color:var(--tf)}
#tab-todo-widget .in:focus,#tab-todo-widget .edit:focus{border-color:rgba(59,130,246,.45);box-shadow:0 0 0 4px rgba(59,130,246,.14)}
#tab-todo-widget .add{height:44px;padding:0 16px;border-radius:14px;border-color:rgba(59,130,246,.15);background:linear-gradient(135deg,var(--ac),var(--ac2));color:#fff;cursor:pointer;font-weight:600;box-shadow:0 8px 20px rgba(37,99,235,.22)}
#tab-todo-widget .tb{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px;flex-wrap:wrap}
#tab-todo-widget .fs{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
#tab-todo-widget .fb{padding:7px 12px;border-radius:999px;background:transparent;border-color:var(--bd);color:var(--ts);cursor:pointer;font-size:12px}
#tab-todo-widget .fb.active{background:rgba(59,130,246,.14);color:var(--ac);border-color:rgba(59,130,246,.24)}
#tab-todo-widget .sum,#tab-todo-widget .cnt,#tab-todo-widget .meta{font-size:12px;color:var(--tf)}
#tab-todo-widget .list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px}
#tab-todo-widget .it{display:grid;grid-template-columns:auto 1fr auto auto;gap:8px;align-items:center;padding:12px;border-radius:16px;background:var(--item);border:1px solid var(--bd);box-shadow:var(--sd2);position:relative;cursor:grab;transition:transform .15s ease,background .15s ease}
#tab-todo-widget .it:hover{background:rgba(148,163,184,.08);transform:translateY(-1px)}
#tab-todo-widget .list.sorting,#tab-todo-widget .list.sorting .it,#tab-todo-widget .list.sorting .txt{cursor:grabbing!important}
#tab-todo-widget .it.c .txt{color:var(--tf);text-decoration:line-through}
#tab-todo-widget .it.sorting{opacity:.45}
#tab-todo-widget .it.drag-over-top::before,#tab-todo-widget .it.drag-over-bottom::after{content:'';position:absolute;left:10px;right:10px;height:3px;border-radius:999px;background:linear-gradient(90deg,var(--ac),var(--ac2))}
#tab-todo-widget .it.drag-over-top::before{top:-6px}
#tab-todo-widget .it.drag-over-bottom::after{bottom:-6px}
#tab-todo-widget .ck{-webkit-appearance:none;appearance:none;width:20px;height:20px;border-radius:50%;border:2px solid rgba(59,130,246,.45);cursor:pointer;position:relative;margin:0;flex-shrink:0}
#tab-todo-widget .ck:checked{background:linear-gradient(135deg,var(--ok),#22c55e);border-color:transparent}
#tab-todo-widget .ck:checked:after{content:'';width:7px;height:4px;border-left:2px solid #fff;border-bottom:2px solid #fff;transform:translate(-50%,-60%) rotate(-45deg);display:block;position:absolute;left:50%;top:50%}
#tab-todo-widget .ct{min-width:0}
#tab-todo-widget .txt{font-size:14px;line-height:1.45;color:var(--tx);word-break:break-word;user-select:none}
#tab-todo-widget .meta{margin-top:4px;font-size:11px}
#tab-todo-widget .remind-tag{display:inline-block;margin-top:3px;font-size:10px;padding:1px 6px;border-radius:6px;background:rgba(37,99,235,.1);color:var(--ac);font-weight:500}
#tab-todo-widget .remind-tag.fired{background:rgba(16,185,129,.1);color:var(--ok)}
#tab-todo-widget .edit-btn,#tab-todo-widget .remind-btn{width:30px;height:30px;border-radius:10px;border:1px solid transparent;background:transparent;cursor:pointer;font-size:15px;outline:none;transition:all .16s ease;flex-shrink:0}
#tab-todo-widget .edit-btn{color:var(--ac)}
#tab-todo-widget .edit-btn:hover{background:rgba(37,99,235,.1)}
#tab-todo-widget .remind-btn{color:var(--ts)}
#tab-todo-widget .remind-btn:hover{background:rgba(148,163,184,.12);color:var(--ac)}
#tab-todo-widget .remind-btn.has-remind{color:#f59e0b}
#tab-todo-widget .del{width:30px;height:30px;border-radius:10px;border:none;background:transparent;color:var(--er);cursor:pointer;font-size:15px;flex-shrink:0}
#tab-todo-widget .del:hover{background:rgba(239,68,68,.1)}
#tab-todo-widget .emp{display:none;padding:24px 12px;text-align:center;color:var(--tf)}
#tab-todo-widget .empi{font-size:28px;margin-bottom:8px}
#tab-todo-widget .ft{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:14px;padding-top:12px;border-top:1px solid var(--bd);flex-wrap:wrap}
#tab-todo-widget .clr{height:34px;padding:0 12px;border-radius:10px;background:transparent;border:1px solid rgba(239,68,68,.16);color:var(--er);cursor:pointer;font-size:12px;font-weight:600;outline:none;transition:all .16s ease}
#tab-todo-widget .clr[disabled]{opacity:.45;cursor:not-allowed}
#tab-todo-menu{position:fixed;min-width:180px;padding:8px;background:var(--panel);border:1px solid var(--bd);border-radius:14px;box-shadow:var(--sd2);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);z-index:2147483649;display:none}
#tab-todo-menu.show{display:block}
#tab-todo-menu .mi{display:flex;align-items:center;gap:8px;width:100%;height:36px;padding:0 10px;border:none;background:transparent;border-radius:10px;color:var(--tx);cursor:pointer;text-align:left;font-size:13px}
#tab-todo-menu .mi:hover{background:rgba(148,163,184,.12)}
#tab-todo-menu .mi.danger{color:var(--er)}
#tab-todo-menu .sep{height:1px;background:var(--bd);margin:6px 2px}
#tab-todo-menu .size-row{padding:6px 10px 8px;display:flex;flex-direction:column;gap:5px}
#tab-todo-menu .size-row-hd{display:flex;align-items:center;justify-content:space-between;font-size:12px;color:var(--ts);user-select:none}
#tab-todo-menu .size-row-hd span{font-weight:600;color:var(--ac);font-size:12px}
#tab-todo-menu .size-slider{-webkit-appearance:none;appearance:none;width:100%;height:4px;border-radius:999px;outline:none;cursor:pointer;border:none;padding:0;margin:0}
#tab-todo-menu .size-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:16px;height:16px;border-radius:50%;background:var(--ac);border:2px solid #fff;box-shadow:0 2px 6px rgba(37,99,235,.35);cursor:pointer;transition:transform .12s ease}
#tab-todo-menu .size-slider::-moz-range-thumb{width:16px;height:16px;border-radius:50%;background:var(--ac);border:2px solid #fff;box-shadow:0 2px 6px rgba(37,99,235,.35);cursor:pointer}
#tab-todo-menu .size-slider:hover::-webkit-slider-thumb{transform:scale(1.2)}
#tab-todo-remind-panel,#tab-todo-sound-panel{position:fixed;z-index:2147483649;background:var(--panel);border:1px solid var(--bd);border-radius:18px;box-shadow:var(--sd);backdrop-filter:blur(20px) saturate(140%);-webkit-backdrop-filter:blur(20px) saturate(140%);padding:18px;min-width:280px;max-width:calc(100vw - 32px);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;color:var(--tx);display:none}
#tab-todo-remind-panel.show,#tab-todo-sound-panel.show{display:block}
#tab-todo-remind-panel .rp-title,#tab-todo-sound-panel .sp-title{font-size:15px;font-weight:700;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between}
#tab-todo-remind-panel .rp-close,#tab-todo-sound-panel .sp-close{width:28px;height:28px;border:none;background:transparent;color:var(--ts);cursor:pointer;border-radius:8px;font-size:16px;display:flex;align-items:center;justify-content:center}
#tab-todo-remind-panel .rp-close:hover,#tab-todo-sound-panel .sp-close:hover{background:rgba(148,163,184,.12)}
#tab-todo-remind-panel .rp-label{font-size:12px;color:var(--tf);margin-bottom:6px}
#tab-todo-remind-panel .rp-dt{width:100%;height:40px;border-radius:10px;border:1px solid var(--bd);background:var(--inp);color:var(--tx);padding:0 10px;font-size:13px;box-sizing:border-box;outline:none;margin-bottom:12px}
#tab-todo-remind-panel .rp-dt:focus{border-color:rgba(59,130,246,.45);box-shadow:0 0 0 3px rgba(59,130,246,.14)}
#tab-todo-remind-panel .rp-btns{display:flex;gap:8px;justify-content:flex-end}
#tab-todo-remind-panel .rp-save{height:34px;padding:0 16px;border-radius:10px;border:none;background:linear-gradient(135deg,var(--ac),var(--ac2));color:#fff;cursor:pointer;font-size:13px;font-weight:600}
#tab-todo-remind-panel .rp-del{height:34px;padding:0 12px;border-radius:10px;border:1px solid rgba(239,68,68,.2);background:transparent;color:var(--er);cursor:pointer;font-size:13px}
#tab-todo-sound-panel .sp-list{display:flex;flex-direction:column;gap:8px}
#tab-todo-sound-panel .sp-item{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;border:1px solid var(--bd);background:var(--item);cursor:pointer;transition:all .15s ease}
#tab-todo-sound-panel .sp-item:hover{background:rgba(148,163,184,.08)}
#tab-todo-sound-panel .sp-item.active{border-color:rgba(59,130,246,.4);background:rgba(59,130,246,.08)}
#tab-todo-sound-panel .sp-name{flex:1;font-size:13px;font-weight:500}
#tab-todo-sound-panel .sp-play{width:30px;height:30px;border-radius:8px;border:1px solid var(--bd);background:transparent;color:var(--ac);cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center}
#tab-todo-sound-panel .sp-play:hover{background:rgba(37,99,235,.1)}
#tab-todo-sound-panel .sp-check{width:18px;height:18px;border-radius:50%;border:2px solid var(--bd);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:10px;color:transparent}
#tab-todo-sound-panel .sp-item.active .sp-check{background:var(--ac);border-color:var(--ac);color:#fff}
.tab-todo-toast{position:fixed;bottom:80px;left:50%;transform:translateX(-50%);padding:10px 20px;border-radius:12px;background:var(--panel,#fff);border:1px solid var(--bd,rgba(0,0,0,.08));box-shadow:0 8px 24px rgba(0,0,0,.15);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);font-size:13px;color:var(--tx,#0f172a);z-index:2147483649;transition:opacity .3s ease,transform .3s ease;pointer-events:none;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;white-space:nowrap}
.tab-todo-toast.fade-out{opacity:0;transform:translateX(-50%) translateY(10px)}
#tab-todo-webdav-panel{position:fixed;z-index:2147483649;background:var(--panel);border:1px solid var(--bd);border-radius:18px;box-shadow:var(--sd);backdrop-filter:blur(20px) saturate(140%);-webkit-backdrop-filter:blur(20px) saturate(140%);padding:18px;width:300px;max-width:calc(100vw - 32px);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;color:var(--tx);display:none}
#tab-todo-webdav-panel.show{display:block}
#tab-todo-webdav-panel .wp-title{font-size:15px;font-weight:700;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between}
#tab-todo-webdav-panel .wp-close{width:28px;height:28px;border:none;background:transparent;color:var(--ts);cursor:pointer;border-radius:8px;font-size:16px;display:flex;align-items:center;justify-content:center}
#tab-todo-webdav-panel .wp-close:hover{background:rgba(148,163,184,.12)}
#tab-todo-webdav-panel .wp-toggle{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;font-size:13px}
#tab-todo-webdav-panel .wp-switch{position:relative;width:40px;height:22px;background:rgba(148,163,184,.3);border-radius:11px;cursor:pointer;transition:background .2s;flex-shrink:0;border:none;padding:0}
#tab-todo-webdav-panel .wp-switch::after{content:'';position:absolute;left:2px;top:2px;width:18px;height:18px;border-radius:50%;background:#fff;transition:transform .2s;box-shadow:0 1px 3px rgba(0,0,0,.2)}
#tab-todo-webdav-panel .wp-switch.on{background:var(--ac)}
#tab-todo-webdav-panel .wp-switch.on::after{transform:translateX(18px)}
#tab-todo-webdav-panel .wp-field{margin-bottom:10px}
#tab-todo-webdav-panel .wp-label{font-size:11px;color:var(--tf);margin-bottom:4px;display:block}
#tab-todo-webdav-panel .wp-input{width:100%;height:36px;border-radius:10px;border:1px solid var(--bd);background:var(--inp);color:var(--tx);padding:0 10px;font-size:13px;box-sizing:border-box;outline:none}
#tab-todo-webdav-panel .wp-input:focus{border-color:rgba(59,130,246,.45);box-shadow:0 0 0 3px rgba(59,130,246,.14)}
#tab-todo-webdav-panel .wp-btns{display:flex;gap:8px;justify-content:flex-end;margin-top:14px}
#tab-todo-webdav-panel .wp-save{height:34px;padding:0 16px;border-radius:10px;border:none;background:linear-gradient(135deg,var(--ac),var(--ac2));color:#fff;cursor:pointer;font-size:13px;font-weight:600}
#tab-todo-webdav-panel .wp-sync-now{height:34px;padding:0 12px;border-radius:10px;border:1px solid rgba(59,130,246,.2);background:transparent;color:var(--ac);cursor:pointer;font-size:13px}
@keyframes ttlp-charge{0%,100%{box-shadow:var(--tsd)}50%{box-shadow:var(--tsd),0 0 0 8px rgba(37,99,235,.22)}}
@keyframes ttlp-ok{0%,100%{box-shadow:var(--tsd)}50%{box-shadow:var(--tsd),0 0 0 8px rgba(16,185,129,.4)}}
@keyframes ttlp-err{0%,100%{box-shadow:var(--tsd)}50%{box-shadow:var(--tsd),0 0 0 8px rgba(239,68,68,.4)}}
@keyframes ttlp-warn{0%,100%{box-shadow:var(--tsd)}50%{box-shadow:var(--tsd),0 0 0 8px rgba(245,158,11,.4)}}
#tab-todo-toggle.lp-charging{animation:ttlp-charge .9s ease-in-out infinite;cursor:progress!important;transition:none}
#tab-todo-toggle.lp-ok{animation:ttlp-ok .9s ease-in-out;transition:none}
#tab-todo-toggle.lp-err{animation:ttlp-err .9s ease-in-out;transition:none}
#tab-todo-toggle.lp-warn{animation:ttlp-warn .9s ease-in-out;transition:none}
#tab-todo-widget .more-btn{width:30px;height:30px;border-radius:10px;border:1px solid transparent;background:transparent;cursor:pointer;font-size:18px;letter-spacing:-2px;outline:none;transition:all .16s ease;flex-shrink:0;color:var(--ts);display:flex;align-items:center;justify-content:center}
#tab-todo-widget .more-btn:hover{background:rgba(148,163,184,.12);color:var(--tx)}
#tab-todo-imenu{position:fixed;min-width:108px;padding:5px;background:var(--panel);border:1px solid var(--bd);border-radius:12px;box-shadow:var(--sd2);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);z-index:2147483649;display:none}
#tab-todo-imenu.show{display:block}
#tab-todo-imenu .imi{display:flex;align-items:center;gap:7px;width:100%;height:32px;padding:0 10px;border:none;background:transparent;border-radius:8px;color:var(--tx);cursor:pointer;text-align:left;font-size:13px;white-space:nowrap}
#tab-todo-imenu .imi:hover{background:rgba(148,163,184,.12)}
.wp-tabs{display:flex;gap:0;margin:8px 0 10px;border-radius:10px;overflow:hidden;border:1px solid var(--bd)}
.wp-tab{flex:1;height:32px;border:none;background:transparent;color:var(--tx2);cursor:pointer;font-size:13px;font-weight:500;transition:background .15s,color .15s}
.wp-tab.active{background:var(--ac);color:#fff}
.wp-tab:not(.active):hover{background:rgba(148,163,184,.1)}
#tab-todo-widget .sync-cloud{font-size:10px;opacity:0.55;margin-right:3px;line-height:1;vertical-align:middle;pointer-events:none;user-select:none}`;

  function css() {
    if (document.getElementById(S)) return;
    if (typeof GM_addStyle === "function") {
      try {
        const el = GM_addStyle(CSS_TEXT);
        if (el) el.id = S;
        return;
      } catch {}
    }
    const s = document.createElement("style");
    s.id = S;
    s.textContent = CSS_TEXT;
    (document.head || document.documentElement).appendChild(s);
  }

  function el(tag, props = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === "cls") node.className = v;
      else if (k === "txt") node.textContent = v;
      else if (k === "type") node.type = v;
      else if (k === "id") node.id = v;
      else if (k.startsWith("data-")) node.dataset[k.slice(5)] = v;
      else node.setAttribute(k, v);
    }
    for (const c of children) {
      if (c == null) continue;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }
    return node;
  }

  function sliderBg(val, min, max) {
    const pct = Math.round((val - min) / (max - min) * 100);
    return "linear-gradient(to right,var(--ac) 0%,var(--ac) " + pct + "%,rgba(148,163,184,.3) " + pct + "%,rgba(148,163,184,.3) 100%)";
  }

  function showToast(msg, dur) {
    dur = dur || 2500;
    const old = document.querySelector(".tab-todo-toast");
    if (old) old.remove();
    const t = el("div", { cls: "tab-todo-toast" }, msg);
    document.documentElement.appendChild(t);
    setTimeout(() => { t.classList.add("fade-out"); setTimeout(() => t.remove(), 350); }, dur);
  }

  function validateWdvUrl(url) {
    if (!url) return false;
    try {
      const u = new URL(url);
      return u.protocol === "https:";  
    } catch { return false; }
  }

  function safeB64(str) {
    try {
      const bytes = new TextEncoder().encode(str);
      let bin = "";
      bytes.forEach(b => bin += String.fromCharCode(b));
      return btoa(bin);
    } catch { return ""; }
  }

  function davReq(method, url, headers, body) {
    return new Promise((resolve, reject) => {
      const opt = { method: method, url: url, headers: headers || {}, onload: resolve, onerror: reject, anonymous: !wdvCfg.user };
      if (wdvCfg.user) {
        opt.headers["Authorization"] = "Basic " + safeB64(wdvCfg.user + ":" + (wdvCfg.pass || ""));
      }
      if (body != null) opt.data = body;
      try { GM_xmlhttpRequest(opt); } catch (e) { reject(e); }
    });
  }

  async function davEnsureDir(url) {
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    const origin = new URL(url).origin;
    let path = "";
    for (const seg of parts) {
      path += "/" + seg;
      const dirUrl = origin + path + "/";
      try {
        const res = await davReq("PROPFIND", dirUrl, { Depth: "0" },
          '<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:resourcetype/></d:prop></d:propfind>');
        if (res.status >= 200 && res.status < 400) continue;
      } catch {}
      try { await davReq("MKCOL", dirUrl, {}); } catch {}
    }
  }

  async function davGet(url) {
    const res = await davReq("GET", url, { Accept: "application/json" });
    if (res.status === 200) return res.responseText;
    if (res.status === 404) return null;
    throw new Error("GET " + res.status);
  }

  async function davPut(url, data) {
    await davReq("PUT", url, { "Content-Type": "application/json" }, data);
  }

  function ghReq(method, url, token, body) {
    return new Promise((resolve, reject) => {
      const headers = {
        "Authorization": "token " + token,
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      };
      if (typeof GM_xmlhttpRequest === "function") {
        const opt = { method, url, headers, onload: resolve, onerror: reject };
        if (body != null) opt.data = body;
        try { GM_xmlhttpRequest(opt); } catch (e) { reject(e); }
      } else {
        const init = { method, headers, credentials: "omit" };
        if (body != null) init.body = body;
        fetch(url, init)
          .then(async r => resolve({ status: r.status, responseText: await r.text() }))
          .catch(reject);
      }
    });
  }

  async function ghGetGist(gistId, token, fname) {
    const res = await ghReq("GET", "https://api.github.com/gists/" + gistId, token);
    if (res.status === 404) return null;
    if (res.status < 200 || res.status >= 300)
      throw new Error("GET gist " + res.status);
    const data = JSON.parse(res.responseText);
    const file = data.files && data.files[fname];
    if (!file) return [];
    if (file.truncated && file.raw_url) {
      const raw = await ghReq("GET", file.raw_url, token);
      return JSON.parse(raw.responseText);
    }
    return JSON.parse(file.content || "[]");
  }

  async function ghPatchGist(gistId, token, fname, content) {
    const body = JSON.stringify({ files: { [fname]: { content } } });
    const res = await ghReq("PATCH", "https://api.github.com/gists/" + gistId, token, body);
    if (res.status < 200 || res.status >= 300)
      throw new Error("PATCH gist " + res.status);
  }

  async function ghCreateGist(token, fname, content) {
    const body = JSON.stringify({
      description: "\u5F85\u529E\u4E8B\u9879\u540C\u6B65\u6570\u636E\uFF08\u7531\u811A\u672C\u81EA\u52A8\u521B\u5EFA\uFF09",
      public: false,
      files: { [fname]: { content } },
    });
    const res = await ghReq("POST", "https://api.github.com/gists", token, body);
    if (res.status !== 201) throw new Error("CREATE gist " + res.status);
    return JSON.parse(res.responseText);
  }

  async function davCleanOrphans(dirUrl, keepFname) {
    try {
      const normDir = dirUrl.replace(/\/$/, "") + "/";
      const res = await davReq("PROPFIND", normDir, { "Depth": "1" },
        '<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:resourcetype/></d:prop></d:propfind>');
      if (!res || res.status < 200 || res.status >= 400) return;
      const base = new URL(normDir);
      const re = /<[^>]*href[^>]*>([^<]+)<\/[^>]*href>/gi;
      let mx;
      while ((mx = re.exec(res.responseText)) !== null) {
        let href = mx[1].trim();
        try { href = decodeURIComponent(href); } catch {}
        if (href.endsWith("/")) continue;
        const fname2 = href.split("/").pop();
        if (!fname2 || !fname2.toLowerCase().endsWith(".json") || fname2 === keepFname) continue;
        try {
          const fullUrl = /^https?:\/\//i.test(href)
            ? href
            : base.origin + (href.startsWith("/") ? href : "/" + href);
          await davReq("DELETE", fullUrl, {});
        } catch {}
      }
    } catch {}
  }

  function mergeTodos(local, remote, lastSyncTs) {
    if (!Array.isArray(remote)) return { merged: local.slice(), changed: false };
    const localMap  = new Map(local.map(v => [v.id, v]));
    const resultMap = new Map(localMap);

    remote.forEach(v => {
      const l = localMap.get(v.id);
      if (l) {
        if      (l.deletedAt && !v.deletedAt)              resultMap.set(v.id, l);
        else if (!l.deletedAt && v.deletedAt)              resultMap.set(v.id, v);
        else if ((v.updatedAt || 0) > (l.updatedAt || 0)) resultMap.set(v.id, v);
      } else {
        if (!lastSyncTs) {
          resultMap.set(v.id, v);
        } else {
          const act = Math.max(v.createdAt || 0, v.updatedAt || 0);
          if (act > lastSyncTs) resultMap.set(v.id, v);
        }
      }
    });

    const GC = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const merged = [...resultMap.values()].filter(v => !v.deletedAt || v.deletedAt > GC);
    merged.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    const localSig = new Set(local.map(v => v.id + "|" + (v.updatedAt || 0)));
    const changed  = merged.some(v => !localSig.has(v.id + "|" + (v.updatedAt || 0)));
    return { merged, changed };
  }

  function mk(open) {
    const iSpan = el("span", { cls: "i" }, "✓");
    const t = el("button", { id: T, type: "button", title: "待办事项(右键打开菜单)", "aria-label": "待办事项，右键菜单" }, iSpan);
    const badge = el("div", { cls: "badge" }, "✓");
    const ttl = el("div", { cls: "ttl" }, "待办事项");
    const sub = el("div", { cls: "sub" }, "轻量记录 · 自动保存");
    const titleInfo = el("div", {}, ttl, sub);
    const tw = el("div", { cls: "tw" }, badge, titleInfo);
    const xBtn = el("button", { type: "button", cls: "ib x", "aria-label": "关闭" }, "×");
    const hd = el("div", { cls: "hd" }, tw, xBtn);
    const inp = el("input", { cls: "in", type: "text", placeholder: "输入待办事项...", maxlength: "200" });
    const addBtn = el("button", { cls: "add", type: "submit" }, "添加");
    const fm = el("form", { cls: "fm" }, inp, addBtn);
    const fbAll = el("button", { type: "button", cls: "fb active", "data-f": "all" }, "全部");
    const fbActive = el("button", { type: "button", cls: "fb", "data-f": "active" }, "未完成");
    const fbDone = el("button", { type: "button", cls: "fb", "data-f": "completed" }, "已完成");
    const fs = el("div", { cls: "fs" }, fbAll, fbActive, fbDone);
    const sum = el("div", { cls: "sum" }, "保持专注，逐项完成");
    const tb = el("div", { cls: "tb" }, fs, sum);
    const list = el("ul", { cls: "list" });
    const empi = el("div", { cls: "empi" }, "📝");
    const empTxt = el("div", {}, "还没有待办事项");
    const emp = el("div", { cls: "emp" }, empi, empTxt);
    const cnt = el("span", { cls: "cnt" }, "共 0 项");
    const clrBtn = el("button", { type: "button", cls: "clr" }, "清除已完成");
    const ft = el("div", { cls: "ft" }, cnt, clrBtn);
    const bd = el("div", { cls: "bd" }, fm, tb, list, emp, ft);
    const sh = el("div", { cls: "sh" }, hd, bd);
    const w = el("div", { id: W, cls: open ? "" : "hidden" }, sh);

    const miClose = el("button", { type: "button", cls: "mi", "data-act": "close" }, "🚫 关闭");
    const miSound = isUserscript
      ? el("button", { type: "button", cls: "mi", "data-act": "sound" }, "🔔 更换提示音")
      : null;
    const miSync = isUserscript
      ? el("button", { type: "button", cls: "mi", "data-act": "sync" }, "☁ 同步")
      : null;
    const miExport = el("button", { type: "button", cls: "mi", "data-act": "export" }, "\uD83D\uDCE4 导出数据");
    const miImport = el("button", { type: "button", cls: "mi", "data-act": "import" }, "\uD83D\uDCE5 导入数据");
    const fileInp = el("input", { type: "file", cls: "file-inp" });
    fileInp.accept = ".json";
    fileInp.style.display = "none";

    let sizeRow = null, sepSize = null, sizeSlider = null, sizeVal = null;
    if (isUserscript) {
      const sizeLabel = el("div", { cls: "size-row-hd" });
      sizeLabel.appendChild(document.createTextNode("⚙️ 悬浮球大小"));
      sizeVal = el("span", {}, ballSize + "px");
      sizeLabel.appendChild(sizeVal);
      sizeSlider = el("input", { type: "range", cls: "size-slider", min: "32", max: "80", step: "2" });
      sizeSlider.value = String(ballSize);
      sizeSlider.style.background = sliderBg(ballSize, 32, 80);
      sizeRow = el("div", { cls: "size-row" }, sizeLabel, sizeSlider);
      sepSize = el("div", { cls: "sep" });
    }

    const sep2 = el("div", { cls: "sep" });
    const sep = el("div", { cls: "sep" });
    const miClear = el("button", { type: "button", cls: "mi danger", "data-act": "clear" }, "🗑 清空数据");
    const m = el("div", { id: M }, ...[miClose, miSound, miSync, sep2, miExport, miImport, sepSize, sizeRow, sep, miClear].filter(Boolean));

    const rpTitle = el("div", { cls: "rp-title" });
    rpTitle.appendChild(document.createTextNode("⏰ 设置提醒"));
    const rpClose = el("button", { type: "button", cls: "rp-close" }, "×");
    rpTitle.appendChild(rpClose);
    const rpLabel = el("div", { cls: "rp-label" }, "选择提醒时间");
    const rpDt = el("input", { cls: "rp-dt", type: "datetime-local" });
    const rpSave = el("button", { type: "button", cls: "rp-save" }, "保存");
    const rpDel = el("button", { type: "button", cls: "rp-del" }, "取消提醒");
    const rpBtns = el("div", { cls: "rp-btns" }, rpDel, rpSave);
    const rp = el("div", { id: REMIND_PANEL_ID }, rpTitle, rpLabel, rpDt, rpBtns);

    const spTitle = el("div", { cls: "sp-title" });
    spTitle.appendChild(document.createTextNode("🔔 更换提示音"));
    const spClose = el("button", { type: "button", cls: "sp-close" }, "×");
    spTitle.appendChild(spClose);
    const spList = el("div", { cls: "sp-list" });
    SOUNDS.forEach((s, idx) => {
      const check = el("div", { cls: "sp-check" }, "✓");
      const name = el("div", { cls: "sp-name" }, s.name);
      const playBtn = el("button", { type: "button", cls: "sp-play", "data-idx": String(idx) }, "▶");
      const item = el("div", { cls: "sp-item" + (idx === currentSound ? " active" : ""), "data-idx": String(idx) }, check, name, playBtn);
      spList.appendChild(item);
    });
    const sp = el("div", { id: SOUND_PANEL_ID }, spTitle, spList);

    const wpTitle = el("div", { cls: "wp-title" });
    wpTitle.appendChild(document.createTextNode("☁ 同步"));
    const wpClose = el("button", { type: "button", cls: "wp-close" }, "×");
    wpTitle.appendChild(wpClose);
    const wpToggleRow = el("div", { cls: "wp-toggle" });
    wpToggleRow.appendChild(document.createTextNode("启用同步"));
    const wpSwitch = el("button", { type: "button", cls: "wp-switch" });
    wpToggleRow.appendChild(wpSwitch);
    const wpAutoRow = el("div", { cls: "wp-toggle" });
    wpAutoRow.setAttribute("title", "\u5F00\u542F\u540E\u6BCF\u6B21\u65B0\u589E\u3001\u4FEE\u6539\u3001\u5220\u9664\u90FD\u4F1A\u81EA\u52A8\u540C\u6B65\uFF0C\u65E0\u63D0\u793A");
    wpAutoRow.appendChild(document.createTextNode("\u81EA\u52A8\u540C\u6B65"));
    const wpAutoSwitch = el("button", { type: "button", cls: "wp-switch" });
    wpAutoRow.appendChild(wpAutoSwitch);

    const wpTabWdv = el("button", { type: "button", cls: "wp-tab active", "data-tab": "webdav" }, "WebDAV");
    const wpTabGh  = el("button", { type: "button", cls: "wp-tab", "data-tab": "github" }, "GitHub Gist");
    const wpTabs   = el("div", { cls: "wp-tabs" }, wpTabWdv, wpTabGh);

    const wpCredGroup = el("div", { cls: "wp-cred" });
    const wpUrlField = el("div", { cls: "wp-field" });
    wpUrlField.appendChild(el("label", { cls: "wp-label" }, "服务器地址"));
    const wpUrl = el("input", { cls: "wp-input", type: "text", placeholder: "https://dav.example.com/folder/" });
    wpUrlField.appendChild(wpUrl);
    wpCredGroup.appendChild(wpUrlField);
    const wpRemotePathField = el("div", { cls: "wp-field" });
    wpRemotePathField.appendChild(el("label", { cls: "wp-label" }, "目录"));
    const wpRemotePath = el("input", { cls: "wp-input", type: "text", placeholder: "/dav/\u5B50\u76EE\u5F55/\u5F85\u529E.json \u6216 \u5F85\u529E.json" });
    wpRemotePathField.appendChild(wpRemotePath);
    wpCredGroup.appendChild(wpRemotePathField);
    const wpUserField = el("div", { cls: "wp-field" });
    wpUserField.appendChild(el("label", { cls: "wp-label" }, "用户名"));
    const wpUser = el("input", { cls: "wp-input", type: "text", placeholder: "用户名(可选)" });
    wpUserField.appendChild(wpUser);
    wpCredGroup.appendChild(wpUserField);
    const wpPassField = el("div", { cls: "wp-field" });
    wpPassField.appendChild(el("label", { cls: "wp-label" }, "密码"));
    const wpPass = el("input", { cls: "wp-input", type: "password", placeholder: "密码(可选)" });
    wpPassField.appendChild(wpPass);
    wpCredGroup.appendChild(wpPassField);

    const ghCred = el("div", { cls: "wp-cred" });
    ghCred.style.display = "none";
    const ghTokField = el("div", { cls: "wp-field" });
    ghTokField.appendChild(el("label", { cls: "wp-label" }, "Personal Access Token（需 gist 权限）"));
    const ghTok = el("input", { cls: "wp-input", type: "password",
      placeholder: "ghp_xxxxxxxxxxxx（代码中已预填则可留空）" });
    ghTokField.appendChild(ghTok);
    ghCred.appendChild(ghTokField);
    const ghGidField = el("div", { cls: "wp-field" });
    ghGidField.appendChild(el("label", { cls: "wp-label" }, "Gist ID（留空则首次同步自动创建）"));
    const ghGid = el("input", { cls: "wp-input", type: "text",
      placeholder: "32 位十六进制字符串，留空自动创建" });
    ghGidField.appendChild(ghGid);
    ghCred.appendChild(ghGidField);

    const ghFnameField = el("div", { cls: "wp-field" });
    ghFnameField.appendChild(el("label", { cls: "wp-label" }, "\u6587\u4EF6\u540D"));
    const ghFname = el("input", { cls: "wp-input", type: "text", placeholder: "todo.json" });
    ghFnameField.appendChild(ghFname);
    ghCred.appendChild(ghFnameField);

    const wpBtns = el("div", { cls: "wp-btns" });
    const wpSyncNow = el("button", { type: "button", cls: "wp-sync-now" }, "立即同步");
    const wpSave = el("button", { type: "button", cls: "wp-save" }, "保存");
    wpBtns.appendChild(wpSyncNow);
    wpBtns.appendChild(wpSave);
    const dv = el("div", { id: WEBDAV_PANEL_ID }, wpTitle, wpToggleRow, wpAutoRow, wpTabs, wpCredGroup, ghCred, wpBtns);

    const imEditBtn = el("button", { type: "button", cls: "imi", "data-iact": "edit" }, "\u270E  \u7F16\u8F91");
    const imRemindBtn = el("button", { type: "button", cls: "imi", "data-iact": "remind" }, "\u23F0  \u63D0\u9192");
    const im = el("div", { id: "tab-todo-imenu" }, imEditBtn, imRemindBtn);

    const root = document.documentElement;
    root.appendChild(t);
    root.appendChild(w);
    root.appendChild(m);
    root.appendChild(rp);
    root.appendChild(sp);
    root.appendChild(dv);
    root.appendChild(im);
    root.appendChild(fileInp);

    return {
      t, w, m, rp, sp, dv, im, fileInp,
      inp, addBtn, fm, list, emp, cnt, xBtn, clrBtn,
      bs: [fbAll, fbActive, fbDone],
      rpDt, rpSave, rpDel, rpClose,
      spClose, spList,
      sizeSlider, sizeVal,
      wpUrl, wpRemotePath, wpUser, wpPass, wpSwitch, wpAutoSwitch, wpAutoRow, wpSave, wpSyncNow, wpClose, wpCredGroup,
      wpTabs, wpTabWdv, wpTabGh, ghCred, ghTok, ghGid, ghFname,
    };
  }

  function setupSPAGuard() {
    ["yt-navigate-finish", "yt-page-data-updated"].forEach(evt => {
      window.addEventListener(evt, () => { if (!document.getElementById(S)) css(); });
    });
    const _push = history.pushState.bind(history);
    const _replace = history.replaceState.bind(history);
    const onNav = () => { if (!document.getElementById(S)) css(); };
    history.pushState = (...args) => { _push(...args); onNav(); };
    history.replaceState = (...args) => { _replace(...args); onNav(); };
    window.addEventListener("popstate", onNav);
  }

  function requestNotifyPerm(cb) {
    if (!("Notification" in window)) return cb(false);
    if (Notification.permission === "granted") return cb(true);
    if (Notification.permission === "denied") return cb(false);
    Notification.requestPermission().then(p => cb(p === "granted"));
  }

  function fireRemind(item) {
    playSound(currentSound);
    requestNotifyPerm(ok => {
      if (ok) {
        try {
          new Notification("⏰ 待办提醒", {
            body: item.text,
            icon: "https://icons.getbootstrap.com/assets/icons/check-lg.svg",
          });
        } catch {}
      }
    });
  }

  async function markFired(firedKey) {
    const fired = await store.get(FIRED_KEY, []);
    if (fired.includes(firedKey)) return true;
    const next = [...fired, firedKey].slice(-200);
    await store.set(FIRED_KEY, next);
    return false;
  }

  async function scheduleRemind(item) {
    if (remindTimers[item.id]) {
      clearTimeout(remindTimers[item.id]);
      delete remindTimers[item.id];
    }
    if (!item.remindAt || item.completed) return;

    const firedKey = item.id + ":" + item.remindAt;
    const fired = await store.get(FIRED_KEY, []);
    if (fired.includes(firedKey)) return;

    const delta = item.remindAt - Date.now();
    if (delta <= 0) {
      const alreadyFired = await markFired(firedKey);
      if (alreadyFired) return;
      fireRemind(item);
      td = td.map(v => v.id === item.id ? { ...v, remindAt: null } : v);
      store.set(K, td);
      return;
    }

    remindTimers[item.id] = setTimeout(async () => {
      delete remindTimers[item.id];
      const cur = td.find(v => v.id === item.id);
      if (!cur || cur.completed) return;
      const alreadyFired = await markFired(firedKey);
      if (alreadyFired) return;
      fireRemind(cur);
      td = td.map(v => v.id === cur.id ? { ...v, remindAt: null } : v);
      store.set(K, td);
    }, delta);
  }

  function scheduleAll() {
    Object.values(remindTimers).forEach(clearTimeout);
    remindTimers = {};
    td.forEach(item => scheduleRemind(item));
  }

  async function run() {
    if (!document.documentElement) return;

    const [rawTd, rawUi, rawPos, rawOpen, rawSound, rawBallSize, rawWdvCfg, rawGhCfg] = await Promise.all([
      store.get(K, []),
      store.get(U, { filter: "all" }),
      store.get(P, { right: 20, bottom: 20 }),
      store.get(O, false),
      store.get(SOUND_KEY, 0),
      store.get(BALL_SIZE_KEY, 44),
      store.get(WEBDAV_CFG_KEY, null),
      store.get(GITHUB_CFG_KEY, null),
    ]);

    td = Array.isArray(rawTd) ? rawTd : [];
    const su = rawUi, sp2 = rawPos, so = !!rawOpen;
    ui = su && typeof su.filter === "string"
      ? { filter: su.filter, open: so }
      : { filter: "all", open: so };
    pos = sp2 && typeof sp2.right === "number" && typeof sp2.bottom === "number"
      ? sp2 : { right: 20, bottom: 20 };
    currentSound = (typeof rawSound === "number" && rawSound >= 0 && rawSound < SOUNDS.length) ? rawSound : 0;
    ballSize = (typeof rawBallSize === "number" && rawBallSize >= 32 && rawBallSize <= 80)
      ? rawBallSize : 44;
    wdvCfg = rawWdvCfg && typeof rawWdvCfg.url === "string" ? rawWdvCfg : { url: "", user: "", pass: "", remotePath: "", autoSync: false, autoTrigger: false };

    ghCfg = (rawGhCfg && typeof rawGhCfg === "object")
      ? rawGhCfg
      : { token: "", gistId: "", fname: "", autoSync: false, autoTrigger: false };
    if (!ghCfg.token   && GITHUB_TOKEN)    ghCfg.token   = GITHUB_TOKEN;
    if (!ghCfg.gistId  && GITHUB_GIST_ID)  ghCfg.gistId  = GITHUB_GIST_ID;
    if (!isUserscript && ghCfg.token && !rawGhCfg) {
      ghCfg.autoSync    = true;
      ghCfg.autoTrigger = true;
    }

    css();
    setupSPAGuard();
    scheduleAll();

    if (typeof GM_addValueChangeListener === "function") {
      _syncListener = GM_addValueChangeListener(K, async (_key, _oldVal, newVal, remote) => {
        if (!remote || dead) return;
        const newTd = jp(newVal, null);
        if (!Array.isArray(newTd)) return;
        td = newTd;
        scheduleAll();
        render();
      });
    }

    const { t, w, m, rp, sp, dv, im, fileInp, inp: i, fm: f, list: l, emp: e, cnt: c, xBtn: x, clrBtn: clr, bs,
            rpDt, rpSave, rpDel, rpClose,
            spClose, spList,
            sizeSlider, sizeVal,
            wpUrl, wpRemotePath, wpUser, wpPass, wpSwitch, wpAutoSwitch, wpAutoRow, wpSave, wpSyncNow, wpClose, wpCredGroup,
            wpTabs, wpTabWdv, wpTabGh, ghCred, ghTok, ghGid, ghFname,
          } = mk(ui.open);

    function applyBallSize(size) {
      const s = clamp(size, 32, 80);
      t.style.width = s + "px";
      t.style.height = s + "px";
      t.style.fontSize = Math.round(s * 18 / 44) + "px";
    }

    applyBallSize(ballSize);

    if (isUserscript && sizeSlider) {
      sizeSlider.addEventListener("input", () => {
        const v = parseInt(sizeSlider.value, 10);
        ballSize = v;
        sizeVal.textContent = v + "px";
        sizeSlider.style.background = sliderBg(v, 32, 80);
        applyBallSize(v);
        store.set(BALL_SIZE_KEY, v);
      });
      sizeSlider.addEventListener("pointerdown", ev => ev.stopPropagation());
      sizeSlider.addEventListener("click", ev => ev.stopPropagation());
    }

    const hideWdv = () => { dv.classList.remove("show"); };

    function showWdvPanel() {
      hideMenu(); hideRp(); hideSp();
      wpUrl.value = wdvCfg.url || "";
      wpRemotePath.value = wdvCfg.remotePath || wdvCfg.subDir || "";
      wpUser.value = wdvCfg.user || "";
      wpPass.value = wdvCfg.pass || "";
      wpSwitch.classList.toggle("on", !!wdvCfg.autoSync);
      wpAutoSwitch.classList.toggle("on", !!wdvCfg.autoTrigger);
      wpAutoRow.style.display = wdvCfg.autoSync ? "" : "none";
      wpTabs.style.display = wdvCfg.autoSync ? "" : "none";
      ghTok.value  = (ghCfg.token && ghCfg.token !== GITHUB_TOKEN) ? ghCfg.token : "";
      ghGid.value  = ghCfg.gistId || "";
      ghFname.value = ghCfg.fname || "";
      const activeTab = (ghCfg.token || GITHUB_TOKEN) && !wdvCfg.url ? "github" : "webdav";
      switchSyncTab(activeTab);
      dv.classList.add("show");
      const pad2 = 10, pw = 300, ph = 410;
      const left = clamp(window.innerWidth / 2 - pw / 2, pad2, Math.max(pad2, window.innerWidth - pw - pad2));
      const top = clamp(window.innerHeight / 2 - ph / 2, pad2, Math.max(pad2, window.innerHeight - ph - pad2));
      dv.style.left = left + "px";
      dv.style.top = top + "px";
    }

    function switchSyncTab(tab) {
      wpTabWdv.classList.toggle("active", tab === "webdav");
      wpTabGh.classList.toggle("active", tab === "github");
      const showCred = wpSwitch.classList.contains("on");
      wpCredGroup.style.display = (tab === "webdav" && showCred) ? "" : "none";
      ghCred.style.display      = (tab === "github" && showCred) ? "" : "none";
      dv.dataset.syncTab = tab;
    }

    function startSyncAnim() {
      t.classList.remove("lp-ok", "lp-err", "lp-warn");
      t.classList.add("lp-charging");
    }

    function stopSyncAnim(state) {
      const cls = state === "ok" ? "lp-ok" : state === "err" ? "lp-err" : state === "warn" ? "lp-warn" : null;
      const done = () => {
        t.classList.remove("lp-charging");
        if (cls) {
          requestAnimationFrame(() => {
            t.classList.add(cls);
            let cleared = false;
            const onResultEnd = () => { if (cleared) return; cleared = true; t.classList.remove(cls); };
            t.addEventListener("animationend", onResultEnd, { once: true });
            setTimeout(() => { if (!cleared) { cleared = true; t.classList.remove(cls); } }, 1200);
          });
        }
      };
      if (t.classList.contains("lp-charging")) {
        let handled = false;
        const onEnd = () => { if (handled) return; handled = true; done(); };
        t.addEventListener("animationend", onEnd, { once: true });
        setTimeout(() => { if (!handled) { handled = true; done(); } }, 1200);
      } else {
        done();
      }
    }

    async function doSync(silent) {
      if (_syncing) return;
      if (!wdvCfg || !wdvCfg.autoSync || !validateWdvUrl(wdvCfg.url)) {
        if (!silent) showToast("\u672A\u542F\u7528\u540C\u6B65");
        return;
      }
      _syncing = true;
      const lastSyncTs = await store.get(WEBDAV_LAST_KEY, 0);
      startSyncAnim();
      if (!silent) showToast("☁ 同步中...");
      try {
        const baseUrl = wdvCfg.url.replace(/\/$/, "");
        const rp = (wdvCfg.remotePath || "").replace(/^\/+|\/+$/g, "");
        const lastSlash = rp.lastIndexOf("/");
        const dir = lastSlash >= 0 ? rp.slice(0, lastSlash) : "";
        const fname = (lastSlash >= 0 ? rp.slice(lastSlash + 1) : rp) || "todo.json";
        const syncDir = dir ? baseUrl + "/" + dir : baseUrl;
        const fileUrl = syncDir + "/" + fname;
        await davEnsureDir(syncDir);
        const remoteRaw = await davGet(fileUrl);
        let remoteTodos = [];
        if (remoteRaw) {
          try { remoteTodos = JSON.parse(remoteRaw); } catch {}
        }
        if (!Array.isArray(remoteTodos)) remoteTodos = [];
        const result = mergeTodos(td, remoteTodos, lastSyncTs);
        td = result.merged;
        scheduleAll();
        const _uploadData = td.map(({ synced: _s, ...rest }) => rest);
        await davPut(fileUrl, JSON.stringify(_uploadData));
        td = td.map(v => ({ ...v, synced: true }));
        await store.set(WEBDAV_LAST_KEY, Date.now());
        render();
        davCleanOrphans(syncDir, fname).catch(() => {});
        if (!silent) showToast("☁ 同步完成");
        stopSyncAnim("ok");
      } catch (err) {
        console.error("[todo-webdav]", err);
        stopSyncAnim("err");
        if (!silent) showToast("\u26a0 同步失败，请检查 WebDAV 配置");
      } finally {
        _syncing = false;
      }
    }

    function triggerAutoSync() {
      if (!isUserscript) return;
      if (wdvCfg && wdvCfg.autoSync && wdvCfg.autoTrigger && wdvCfg.url) {
        if (_autoSync) clearTimeout(_autoSync);
        _autoSync = setTimeout(() => { _autoSync = null; doSync(true); }, 3000);
        return;
      }
      if (ghCfg && ghCfg.autoSync && ghCfg.autoTrigger && (ghCfg.token || GITHUB_TOKEN)) {
        if (_autoSync) clearTimeout(_autoSync);
        _autoSync = setTimeout(() => { _autoSync = null; doGithubSync(true); }, 3000);
      }
    }

    async function doGithubSync(silent) {
      if (_syncing) return;
      const token = ghCfg.token || GITHUB_TOKEN;
      if (!token) {
        if (!silent) showToast("未配置 GitHub Token");
        return;
      }
      const fname = ghCfg.fname || "todo.json";
      _syncing = true;
      const lastSyncTs = await store.get(GITHUB_LAST_KEY, 0);
      startSyncAnim();
      if (!silent) showToast("🐙 GitHub 同步中...");
      try {
        let gistId    = ghCfg.gistId || GITHUB_GIST_ID;
        let remoteTodos = [];
        let needCreate  = !gistId;

        if (gistId) {
          const remote = await ghGetGist(gistId, token, fname);
          if (remote === null) {
            needCreate = true; gistId = "";
          } else {
            remoteTodos = Array.isArray(remote) ? remote : [];
          }
        }

        if (needCreate) {
          const upload = td.map(({ synced: _s, ...rest }) => rest);
          const created = await ghCreateGist(token, fname, JSON.stringify(upload));
          gistId = created.id;
          ghCfg  = { ...ghCfg, gistId };
          store.set(GITHUB_CFG_KEY, ghCfg);
          if (!silent) showToast("🐙 已创建 Gist：" + gistId.slice(0, 8) + "...");
        } else {
          const result = mergeTodos(td, remoteTodos, lastSyncTs);
          td = result.merged;
          scheduleAll();
          const upload = td.map(({ synced: _s, ...rest }) => rest);
          await ghPatchGist(gistId, token, fname, JSON.stringify(upload));
        }

        td = td.map(v => ({ ...v, synced: true }));
        await store.set(GITHUB_LAST_KEY, Date.now());
        render();
        stopSyncAnim("ok");
        if (!silent) showToast("🐙 GitHub 同步完成");
      } catch (err) {
        console.error("[todo-github]", err);
        stopSyncAnim("err");
        if (!silent) showToast("⚠ GitHub 同步失败：" + (err.message || "请检查 Token / 网络"));
      } finally {
        _syncing = false;
      }
    }

    const d = { on: 0, drag: 0, moved: 0, id: null, x: 0, y: 0, r: 20, b: 20 };
    const sd = { on: 0, id: null, sx: 0, sy: 0, dragId: null, overId: null, place: "after", moved: 0 };
    let editingId = null;
    let remindTargetId = null;
    let imMenuTargetId = null;

    const saveState = () => { store.set(K, td); store.set(U, { filter: ui.filter }); store.set(O, !!ui.open); if (!_syncing) triggerAutoSync(); };
    const savePos = (r, b) => store.set(P, { right: r, bottom: b });
    const flt = () =>
      ui.filter === "active" ? td.filter(v => !v.completed) :
      ui.filter === "completed" ? td.filter(v => v.completed) : td.slice();
    const rfb = () => bs.forEach(b => b.classList.toggle("active", b.dataset.f === ui.filter));
    const clearSort = () => l.querySelectorAll(".drag-over-top,.drag-over-bottom,.sorting")
      .forEach(n => n.classList.remove("drag-over-top", "drag-over-bottom", "sorting"));
    const hideMenu = () => m.classList.remove("show");
    const hideRp = () => { rp.classList.remove("show"); remindTargetId = null; };
    const hideSp = () => sp.classList.remove("show");
    const hideImMenu = () => { im.classList.remove("show"); imMenuTargetId = null; };
    const sync = () => ap({ right: parseFloat(t.style.right) || 20, bottom: parseFloat(t.style.bottom) || 20 });
    const onResize = () => { if (!dead) { sync(); hideMenu(); hideRp(); hideSp(); hideWdv(); } };

    function kill() {
      if (dead) return;
      dead = true;
      if (_syncListener !== null && typeof GM_removeValueChangeListener === "function") {
        try { GM_removeValueChangeListener(_syncListener); } catch {}
        _syncListener = null;
      }
      if (lpTimer) { clearTimeout(lpTimer); lpTimer = null; }
      if (_autoSync) { clearTimeout(_autoSync); _autoSync = null; }
      hideMenu(); hideRp(); hideSp(); hideWdv(); hideImMenu();
      Object.values(remindTimers).forEach(clearTimeout);
      remindTimers = {};
      window.removeEventListener("resize", onResize);
      document.removeEventListener("pointerdown", onDocDown, true);
      t.remove(); w.remove(); m.remove(); rp.remove(); sp.remove(); dv.remove(); im.remove(); fileInp.remove();
      const toastEl = document.querySelector(".tab-todo-toast");
      if (toastEl) toastEl.remove();
      const s = document.getElementById(S);
      if (s) s.remove();
    }

    function clearAllData() {
      td = []; ui.filter = "all";
      scheduleAll();
      saveState(); render(); sync();
    }

    function fmtRemind(ts) {
      if (!ts) return "";
      const d = new Date(ts);
      return d.toLocaleString([], { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
    }

    function render() {
      if (dead) return;
      const arr = flt();
      const done = td.filter(v => v.completed).length;
      l.textContent = "";
      e.style.display = arr.length ? "none" : "block";

      arr.forEach(v => {
        const ck = el("input", { type: "checkbox", cls: "ck" });
        ck.checked = !!v.completed;

        const txt = el("div", { cls: "txt" });
        txt.textContent = v.text;

        const meta = el("div", { cls: "meta" });
        if (v.synced) meta.appendChild(el("span", { cls: "sync-cloud" }, "\u2601"));
        if (v.createdAt) meta.appendChild(document.createTextNode("\u521B\u5EFA\u4E8E " + new Date(v.createdAt).toLocaleString()));

        if (v.remindAt) {
          const tag = el("span", { cls: "remind-tag" + (v.remindAt < Date.now() ? " fired" : "") });
          tag.textContent = "⏰ " + fmtRemind(v.remindAt);
          meta.appendChild(document.createTextNode(" "));
          meta.appendChild(tag);
        }

        const ct = el("div", { cls: "ct" }, txt, meta);
        const moreBtn = el("button", { type: "button", cls: "more-btn", "aria-label": "更多" }, "\u22EF");
        const delBtn = el("button", { type: "button", cls: "del", "aria-label": "删除" }, "\u2715");

        const li = el("li", { cls: "it" + (v.completed ? " c" : "") });
        li.dataset.id = v.id;
        li.appendChild(ck);
        li.appendChild(ct);
        li.appendChild(moreBtn);
        li.appendChild(delBtn);
        l.appendChild(li);
      });

      c.textContent = "共 " + td.length + " 项 · 未完成 " + td.filter(v => !v.completed).length + " · 已完成 " + done;
      clr.disabled = !done;
      rfb();
      saveState();
    }

    function getWidgetHeight() {
      return ui.open && !w.classList.contains("hidden")
        ? Math.min(Math.max(w.getBoundingClientRect().height || 420, 260), window.innerHeight - 24)
        : 420;
    }

    function ap(p) {
      if (dead) return;
      const ts = ballSize, gap = 14, mgn = 12, maxW = 360, minW = 280;
      const ww = Math.min(maxW, Math.max(minW, window.innerWidth - 24));
      const wh = getWidgetHeight();
      const right = clamp(p.right, mgn, Math.max(mgn, window.innerWidth - ts - mgn));
      const bottom = clamp(p.bottom, mgn, Math.max(mgn, window.innerHeight - ts - mgn));
      t.style.right = right + "px"; t.style.bottom = bottom + "px";
      t.style.left = "auto"; t.style.top = "auto";
      const btnLeft = window.innerWidth - right - ts;
      const btnTop = window.innerHeight - bottom - ts;
      const btnRight = btnLeft + ts, btnBottom = btnTop + ts;
      const cx = btnLeft + ts / 2;
      const wl = clamp(cx - ww / 2, mgn, Math.max(mgn, window.innerWidth - ww - mgn));
      const topC = clamp(btnTop - wh - gap, mgn, Math.max(mgn, window.innerHeight - wh - mgn));
      const botC = clamp(btnBottom + gap, mgn, Math.max(mgn, window.innerHeight - wh - mgn));
      const canTop = btnTop - gap - wh >= mgn;
      const canBot = btnBottom + gap + wh <= window.innerHeight - mgn;
      let wt = canTop ? topC : canBot ? botC : botC;
      if (!(wl >= btnRight + gap || wl + ww <= btnLeft - gap) &&
          !(wt >= btnBottom + gap || wt + wh <= btnTop - gap)) {
        if (canTop) wt = topC; else if (canBot) wt = botC;
      }
      w.style.width = ww + "px"; w.style.left = wl + "px";
      w.style.top = wt + "px"; w.style.right = "auto"; w.style.bottom = "auto";
      savePos(right, bottom);
    }

    function open() {
      hideMenu(); ui.open = true; saveState();
      w.classList.remove("hidden");
      requestAnimationFrame(() => { sync(); i.focus(); });
    }

    function close() {
      ui.open = false; saveState();
      w.classList.add("hidden");
      hideImMenu();
    }

    function add(v) {
      v = String(v || "").trim();
      if (!v) return;
      td.unshift({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        text: v, completed: false, createdAt: Date.now(), updatedAt: Date.now(), remindAt: null,
      });
      render();
    }

    function saveEdit(id, val) {
      val = String(val || "").trim();
      editingId = null;
      if (id && val) { td = td.map(v => v.id === id ? { ...v, text: val, updatedAt: Date.now(), synced: false } : v); render(); sync(); }
      else render();
    }

    function startEdit(id) {
      if (!id || editingId === id || sd.on) return;
      editingId = id;
      render();
      const li = l.querySelector(".it[data-id=\"" + id + "\"]");
      const txtEl = li && li.querySelector(".txt");
      const item = td.find(v => v.id === id);
      if (!li || !txtEl || !item) return void render();
      const editInp = el("input", { cls: "edit", type: "text", maxlength: "200" });
      editInp.value = item.text;
      txtEl.textContent = "";
      txtEl.appendChild(editInp);
      editInp.focus();
      editInp.select();

      let done = false;
      const finish = ok => {
        if (done) return;
        done = true;
        ok ? saveEdit(id, editInp.value) : (editingId = null, render());
      };
      editInp.addEventListener("keydown", ev => {
        if (ev.key === "Enter") { ev.preventDefault(); finish(true); }
        else if (ev.key === "Escape") { ev.preventDefault(); finish(false); }
      });
      editInp.addEventListener("blur", () => finish(true), { once: true });
    }

    function showRemindPanel(id) {
      hideMenu(); hideSp();
      remindTargetId = id;
      const item = td.find(v => v.id === id);
      if (!item) return;
      const pad = n => String(n).padStart(2, "0");
      if (item.remindAt) {
        const d = new Date(item.remindAt);
        rpDt.value = d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes());
      } else {
        const now = new Date(Date.now() + 5 * 60000);
        rpDt.value = now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate()) + "T" + pad(now.getHours()) + ":" + pad(now.getMinutes());
      }
      rp.classList.add("show");
      const btn = l.querySelector(".it[data-id=\"" + id + "\"] .more-btn");
      if (btn) {
        const r = btn.getBoundingClientRect();
        const pw = 280, ph = 160, pad2 = 10;
        let left = clamp(r.left, pad2, Math.max(pad2, window.innerWidth - pw - pad2));
        let top = r.top - ph - 8;
        if (top < pad2) top = r.bottom + 8;
        top = clamp(top, pad2, Math.max(pad2, window.innerHeight - ph - pad2));
        rp.style.left = left + "px";
        rp.style.top = top + "px";
      } else {
        rp.style.left = "50%";
        rp.style.top = "50%";
        rp.style.transform = "translate(-50%,-50%)";
      }
    }

    function showSoundPanel() {
      if (!isUserscript) return;
      hideMenu(); hideRp();
      spList.querySelectorAll(".sp-item").forEach((item, idx) => {
        item.classList.toggle("active", idx === currentSound);
        const chk = item.querySelector(".sp-check");
        if (chk) chk.textContent = idx === currentSound ? "✓" : "";
      });
      sp.classList.add("show");
      const pad2 = 10, pw = 300, ph = 320;
      const left = clamp(window.innerWidth / 2 - pw / 2, pad2, Math.max(pad2, window.innerWidth - pw - pad2));
      const top = clamp(window.innerHeight / 2 - ph / 2, pad2, Math.max(pad2, window.innerHeight - ph - pad2));
      sp.style.left = left + "px";
      sp.style.top = top + "px";
    }

    function moveItem(fromId, toId, place) {
      if (!fromId || !toId || fromId === toId) return;
      const from = td.findIndex(v => v.id === fromId);
      const to = td.findIndex(v => v.id === toId);
      if (from < 0 || to < 0) return;
      const arr = td.slice();
      const item = arr.splice(from, 1)[0];
      let idx = arr.findIndex(v => v.id === toId);
      if (idx >= 0) {
        if (place === "after") idx++;
        arr.splice(idx, 0, item);
        td = arr;
        render();
      }
    }

    function showMenu(x, y) {
      hideRp(); hideSp();
      if (isUserscript && sizeSlider) {
        sizeSlider.value = String(ballSize);
        sizeVal.textContent = ballSize + "px";
        sizeSlider.style.background = sliderBg(ballSize, 32, 80);
      }
      m.classList.add("show");
      m.style.left = "0px"; m.style.top = "0px";
      const r = m.getBoundingClientRect();
      const pad = 8;
      const ml = clamp(x, pad, Math.max(pad, window.innerWidth - r.width - pad));
      const mt = clamp(y, pad, Math.max(pad, window.innerHeight - r.height - pad));
      m.style.left = ml + "px"; m.style.top = mt + "px";
    }

    function showImMenu(id, btn) {
      hideMenu(); hideRp(); hideSp(); hideWdv();
      imMenuTargetId = id;
      im.classList.add("show");
      im.style.left = "0px"; im.style.top = "0px";
      const ir = im.getBoundingClientRect();
      const br = btn.getBoundingClientRect();
      const pad = 6;
      let left = clamp(br.left, pad, Math.max(pad, window.innerWidth - ir.width - pad));
      let top = br.bottom + 4;
      if (top + ir.height > window.innerHeight - pad) top = br.top - ir.height - 4;
      top = clamp(top, pad, Math.max(pad, window.innerHeight - ir.height - pad));
      im.style.left = left + "px"; im.style.top = top + "px";
    }

    function onDocDown(ev) {
      if (m.classList.contains("show") && !m.contains(ev.target) && ev.target !== t) hideMenu();
      if (rp.classList.contains("show") && !rp.contains(ev.target)) hideRp();
      if (sp.classList.contains("show") && !sp.contains(ev.target)) hideSp();
      if (dv.classList.contains("show") && !dv.contains(ev.target)) hideWdv();
      if (im.classList.contains("show") && !im.contains(ev.target)) hideImMenu();
    }

    ap(pos);
    render();
    if (!ui.open) w.classList.add("hidden");
    document.addEventListener("pointerdown", onDocDown, true);

    t.addEventListener("click", ev => {
      if (dead) return;
      if (lpFired) { lpFired = false; ev.preventDefault(); ev.stopPropagation(); return; }
      hideMenu();
      if (d.moved || d.drag) { ev.preventDefault(); ev.stopPropagation(); }
      else { w.classList.contains("hidden") ? open() : close(); }
    });

    t.addEventListener("contextmenu", ev => {
      ev.preventDefault(); ev.stopPropagation();
      showMenu(ev.clientX, ev.clientY);
    });

    m.addEventListener("click", ev => {
      const btn = ev.target && ev.target.closest(".mi");
      if (!btn || !btn.dataset.act) return;
      const act = btn.dataset.act;
      hideMenu();
      if (act === "close") kill();
      else if (act === "clear") clearAllData();
      else if (act === "sound") showSoundPanel();
      else if (act === "sync") showWdvPanel();
      else if (act === "export") {
        const blob = new Blob([JSON.stringify(td, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "todo-backup-" + new Date().toISOString().slice(0, 10) + ".json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast("\uD83D\uDCE4 导出成功");
      }
      else if (act === "import") fileInp.click();
    });

    fileInp.addEventListener("change", () => {
      const file = fileInp.files && fileInp.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const imported = JSON.parse(reader.result);
          if (!Array.isArray(imported)) { showToast("\u26A0 文件格式错误"); return; }
          const validItems = imported.filter(v => v && typeof v === "object" && v.id);
          if (!validItems.length) { showToast("\u26A0 未找到有效数据"); return; }
          const existingIds = new Set(td.map(v => v.id));
          let added = 0, skipped = 0;
          validItems.forEach(v => {
            if (existingIds.has(v.id)) { skipped++; }
            else { td.push(v); added++; }
          });
          td.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          scheduleAll();
          render(); sync();
          showToast("\uD83D\uDCE5 导入完成：新增 " + added + " 条，跳过 " + skipped + " 条");
        } catch (err) {
          console.error("[todo-import]", err);
          showToast("\u26A0 导入失败，请检查文件格式");
        }
      };
      reader.readAsText(file);
      fileInp.value = "";
    });

    rpSave.addEventListener("click", () => {
      if (!remindTargetId || !rpDt.value) return;
      const ts = new Date(rpDt.value).getTime();
      if (!ts || isNaN(ts)) return;
      td = td.map(v => v.id === remindTargetId ? { ...v, remindAt: ts, synced: false } : v);
      scheduleAll();
      render(); sync(); hideRp();
      requestNotifyPerm(() => {});
    });

    rpDel.addEventListener("click", () => {
      if (!remindTargetId) return;
      td = td.map(v => v.id === remindTargetId ? { ...v, remindAt: null, synced: false } : v);
      scheduleAll();
      render(); sync(); hideRp();
    });

    rpClose.addEventListener("click", hideRp);

    spClose.addEventListener("click", hideSp);

    spList.addEventListener("click", ev => {
      const playBtn = ev.target.closest(".sp-play");
      const item = ev.target.closest(".sp-item");
      if (playBtn) {
        const idx = parseInt(playBtn.dataset.idx, 10);
        if (!isNaN(idx)) playSound(idx);
        return;
      }
      if (item) {
        const idx = parseInt(item.dataset.idx, 10);
        if (!isNaN(idx) && idx >= 0 && idx < SOUNDS.length) {
          currentSound = idx;
          store.set(SOUND_KEY, idx);
          spList.querySelectorAll(".sp-item").forEach((it, i) => {
            it.classList.toggle("active", i === idx);
            const chk = it.querySelector(".sp-check");
            if (chk) chk.textContent = i === idx ? "✓" : "";
          });
          playSound(idx);
        }
      }
    });

    wpClose.addEventListener("click", hideWdv);

    wpTabs.addEventListener("click", ev => {
      const tab = ev.target && ev.target.closest(".wp-tab");
      if (!tab || !tab.dataset.tab) return;
      switchSyncTab(tab.dataset.tab);
    });

    wpSwitch.addEventListener("click", () => {
      const on = !wpSwitch.classList.contains("on");
      wpSwitch.classList.toggle("on", on);
      wpAutoRow.style.display = on ? "" : "none";
      wpTabs.style.display = on ? "" : "none";
      const curTab = dv.dataset.syncTab || "webdav";
      wpCredGroup.style.display = (curTab === "webdav" && on) ? "" : "none";
      ghCred.style.display      = (curTab === "github" && on) ? "" : "none";
    });

    wpAutoSwitch.addEventListener("click", () => {
      wpAutoSwitch.classList.toggle("on");
    });

    wpSave.addEventListener("click", () => {
      const tab = dv.dataset.syncTab || "webdav";
      if (tab === "webdav") {
        const url = wpUrl.value.trim();
        if (url) {
          let u = null;
          try { u = new URL(url); } catch {}
          if (!u) {
            showToast("服务器地址无效");
            return;
          }
          if (u.protocol !== "https:") {
            showToast("仅支持 https，请使用 https:// 开头的地址");
            return;
          }
        }
        wdvCfg = {
          url, remotePath: wpRemotePath.value.trim(),
          user: wpUser.value.trim(), pass: wpPass.value,
          autoSync: wpSwitch.classList.contains("on"),
          autoTrigger: wpAutoSwitch.classList.contains("on"),
        };
        store.set(WEBDAV_CFG_KEY, wdvCfg);
      } else {
        const tok = ghTok.value.trim() || GITHUB_TOKEN;
        if (!tok) { showToast("Token 不能为空"); return; }
        ghCfg = {
          token: tok, gistId: ghGid.value.trim() || (ghCfg && ghCfg.gistId) || "",
          fname: ghFname.value.trim() || "todo.json",
          autoSync: wpSwitch.classList.contains("on"),
          autoTrigger: wpAutoSwitch.classList.contains("on"),
        };
        store.set(GITHUB_CFG_KEY, ghCfg);
      }
      hideWdv();
      showToast("同步设置已保存");
    });

    wpSyncNow.addEventListener("click", () => {
      const tab = dv.dataset.syncTab || "webdav";
      if (tab === "webdav") {
        const url = wpUrl.value.trim();
        if (!url || !validateWdvUrl(url)) { showToast("请先填写有效的服务器地址"); return; }
        wdvCfg = {
          url, remotePath: wpRemotePath.value.trim(),
          user: wpUser.value.trim(), pass: wpPass.value,
          autoSync: wpSwitch.classList.contains("on"),
          autoTrigger: wpAutoSwitch.classList.contains("on"),
        };
        store.set(WEBDAV_CFG_KEY, wdvCfg);
        hideWdv();
        doSync();
      } else {
        const tok = ghTok.value.trim() || GITHUB_TOKEN;
        if (!tok) { showToast("请先填写 Token"); return; }
        ghCfg = {
          token: tok, gistId: ghGid.value.trim() || (ghCfg && ghCfg.gistId) || "",
          fname: ghFname.value.trim() || "todo.json",
          autoSync: wpSwitch.classList.contains("on"),
          autoTrigger: wpAutoSwitch.classList.contains("on"),
        };
        store.set(GITHUB_CFG_KEY, ghCfg);
        hideWdv();
        doGithubSync();
      }
    });

    x.addEventListener("click", close);

    f.addEventListener("submit", ev => {
      ev.preventDefault();
      add(i.value);
      i.value = "";
      i.focus();
      sync();
    });

    l.addEventListener("click", ev => {
      const n = ev.target;
      const it = n && n.closest(".it");
      if (!it || !it.dataset.id || sd.on) return;
      if (n.classList.contains("more-btn")) showImMenu(it.dataset.id, n);
      else if (n.classList.contains("del")) {
        td = td.filter(v => v.id !== it.dataset.id);
        scheduleAll();
        render(); sync();
      }
    });

    im.addEventListener("click", ev => {
      const btn = ev.target && ev.target.closest(".imi");
      if (!btn || !btn.dataset.iact) return;
      const act = btn.dataset.iact;
      const tid = imMenuTargetId;
      hideImMenu();
      if (act === "edit" && tid) startEdit(tid);
      else if (act === "remind" && tid) showRemindPanel(tid);
    });

    l.addEventListener("change", ev => {
      const n = ev.target;
      const it = n && n.closest(".it");
      if (!it || !n.classList.contains("ck") || !it.dataset.id || sd.on) return;
      td = td.map(v => v.id === it.dataset.id ? { ...v, completed: n.checked, updatedAt: Date.now(), synced: false } : v);
      scheduleAll();
      render(); sync();
    });

    clr.addEventListener("click", () => {
      const len = td.length;
      td = td.filter(v => !v.completed);
      if (td.length !== len) { scheduleAll(); render(); sync(); }
    });

    bs.forEach(b => b.addEventListener("click", () => {
      if (b.dataset.f) { ui.filter = b.dataset.f; render(); sync(); }
    }));

    l.addEventListener("pointerdown", ev => {
      hideMenu(); hideRp(); hideSp(); hideImMenu();
      const it = ev.target && ev.target.closest(".it");
      const isInput = ev.target && (
        ev.target.closest(".edit") || ev.target.closest(".ck") ||
        ev.target.closest(".del") || ev.target.closest(".more-btn")
      );
      if (!it || !it.dataset.id || isInput) return;
      sd.on = 1; sd.moved = 0; sd.id = ev.pointerId;
      sd.sx = ev.clientX; sd.sy = ev.clientY;
      sd.dragId = it.dataset.id; sd.overId = null; sd.place = "after";
      l.classList.add("sorting");
      it.classList.add("sorting");
      try { it.setPointerCapture && it.setPointerCapture(ev.pointerId); } catch {}
    });

    l.addEventListener("pointermove", ev => {
      if (!sd.on || sd.id !== ev.pointerId || !sd.dragId) return;
      const dx = ev.clientX - sd.sx, dy = ev.clientY - sd.sy;
      if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
      sd.moved = 1;
      clearSort();
      const dragEl = l.querySelector(".it[data-id=\"" + sd.dragId + "\"]");
      if (dragEl) dragEl.classList.add("sorting");
      const items = [...l.querySelectorAll(".it")].filter(n => n.dataset.id !== sd.dragId);
      let target = null, place = "after";
      for (const item of items) {
        const r = item.getBoundingClientRect();
        if (ev.clientY >= r.top && ev.clientY <= r.bottom) {
          target = item;
          place = ev.clientY < r.top + r.height / 2 ? "before" : "after";
          break;
        }
      }
      if (!target && items.length) {
        const first = items[0].getBoundingClientRect();
        const last = items[items.length - 1].getBoundingClientRect();
        if (ev.clientY < first.top) { target = items[0]; place = "before"; }
        else if (ev.clientY > last.bottom) { target = items[items.length - 1]; place = "after"; }
      }
      if (target) {
        sd.overId = target.dataset.id;
        sd.place = place;
        target.classList.add(place === "before" ? "drag-over-top" : "drag-over-bottom");
      }
    });

    function endSort(ev) {
      if (!sd.on || sd.id !== ev.pointerId) return;
      const { dragId, overId, place, moved } = sd;
      sd.on = 0; sd.id = null; sd.dragId = null; sd.overId = null; sd.place = "after";
      l.classList.remove("sorting");
      clearSort();
      if (moved && dragId && overId && dragId !== overId) { moveItem(dragId, overId, place); sync(); }
      setTimeout(() => { sd.moved = 0; }, 0);
    }

    l.addEventListener("pointerup", endSort);
    l.addEventListener("pointercancel", endSort);

    t.addEventListener("pointerdown", ev => {
      hideMenu();
      if (dead || (ev.button !== 0 && ev.pointerType !== "touch")) return;
      lpFired = false;
      if (lpTimer) { clearTimeout(lpTimer); lpTimer = null; }
      d.on = 1; d.drag = 0; d.id = ev.pointerId;
      d.x = ev.clientX; d.y = ev.clientY;
      d.r = parseFloat(t.style.right) || 20;
      d.b = parseFloat(t.style.bottom) || 20;
      try { t.setPointerCapture && t.setPointerCapture(ev.pointerId); } catch {}
      if (isUserscript) {
        lpTimer = setTimeout(() => {
          lpTimer = null;
          if (!d.on || d.drag) return;
          lpFired = true;
          if (wdvCfg && wdvCfg.autoSync && validateWdvUrl(wdvCfg.url)) {
            doSync();
          } else {
            doGithubSync();
          }
        }, 600);
      }
    });

    t.addEventListener("pointermove", ev => {
      if (!d.on || d.id !== ev.pointerId || dead) return;
      const dx = ev.clientX - d.x, dy = ev.clientY - d.y;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        if (lpTimer) { clearTimeout(lpTimer); lpTimer = null; }
        d.drag = 1; d.moved = 1;
        t.classList.add("dragging");
      }
      if (d.drag) ap({ right: d.r - dx, bottom: d.b - dy });
    });

    function up(ev) {
      if (!d.on) return;
      if (typeof ev.pointerId === "number" && d.id !== ev.pointerId) return;
      if (lpTimer) { clearTimeout(lpTimer); lpTimer = null; }
      const was = d.drag;
      d.on = 0; d.drag = 0; d.id = null;
      t.classList.remove("dragging");
      try {
        if (t.releasePointerCapture && typeof ev.pointerId === "number")
          t.releasePointerCapture(ev.pointerId);
      } catch {}
      if (was || d.moved) setTimeout(() => { d.moved = 0; }, 0);
    }

    t.addEventListener("pointerup", up);
    t.addEventListener("pointercancel", up);
    window.addEventListener("resize", onResize);

    if (ui.open) requestAnimationFrame(() => { sync(); i.focus(); });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => run(), { once: true });
  } else {
    run();
  }
})();