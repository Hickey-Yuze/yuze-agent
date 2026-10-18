"use strict";
(() => {
  // src/core/constants.ts
  var K = {
    state: "shizhi.state",
    goals: "shizhi.goals",
    records: "shizhi.records",
    queue: "shizhi.queue",
    settings: "shizhi.settings",
    theme: "shizhi.theme",
    themeColor: "shizhi.themeColor",
    profile: "shizhi.profile",
    profileWorkPageCount: "shizhi.profileWorkPageCount",
    recSort: "shizhi.recSort",
    fabPos: "shizhi.fabPos",
    panelSize: "shizhi.panelSize"
  };
  var DSH_URL = "http://127.0.0.1:3080";
  var DEFAULT_SETTINGS = {
    dwellMs: 3e3,
    // 停留闸：可见且连续停留 >= 3s 才记录
    settleMs: 1500,
    // 页面/路由变化后等待渲染的时间
    queueGapMs: 2e3,
    // 两次 LLM 调用的最小间隔
    contentMaxChars: 3e3,
    // 正文摘录截断
    dedupeWindowMs: 30 * 60 * 1e3,
    recordCap: 500,
    excludedSites: [],
    // 子串匹配 URL，命中不记录
    linkedUrl: "",
    // 关联网址
    analysisPrompt: "",
    // 分析提示词（空 = 预设）
    askDsh: true,
    // 右键「问问 DeepSeek Harness」默认开启
    autocomplete: true,
    // Yuze 首页提示词自动补全默认开启
    dshUrl: DSH_URL
    // DeepSeek Harness 服务地址
  };
  var DSH_ASK_HASH = "sz-dsh-ask";

  // src/store.ts
  var Store = {
    get(k) {
      return localStorage.getItem(k);
    },
    set(k, v) {
      return localStorage.setItem(k, v);
    },
    del(k) {
      return localStorage.removeItem(k);
    },
    read(k, fallback) {
      try {
        const raw = this.get(k);
        return raw == null ? fallback : JSON.parse(raw);
      } catch (e) {
        return fallback;
      }
    },
    write(k, v) {
      this.set(k, JSON.stringify(v));
    },
    driverLabel() {
      return "localStorage\uFF08\u672C\u7AD9\u70B9\uFF09";
    }
  };
  function settings() {
    return Object.assign({}, DEFAULT_SETTINGS, Store.read(K.settings, {}));
  }
  function getState() {
    const saved = Store.read(K.state, {});
    const panelMode = saved.panelMode === "slacking" || !saved.panelMode && saved.workMode === false ? "slacking" : "work";
    return { workMode: true, activeSince: saved.activeSince || 0, panelMode };
  }

  // src/panel/panel.css
  var panel_default = ':host { all: initial; }\n\n/* ---- \u6D45\u8272\u8272\u677F ---- */\n.sz-dock {\n  --bg-panel: #fff; --bg-card: #f9fafb; --bg-note: #fff; --bg-hover: #f3f4f6; --bg-input: #fff;\n  --bg-tab-act: #f3f4f6; --bg-badge: #f3f4f6; --bg-badge-on: #dcfce7; --bg-del-hover: #fef2f2;\n  --bg-retry: #fff; --bg-retry-hover: #fef2f2;\n  --bg-warn: #fff8e1; --bd-warn: #f0d98c; --tx-warn: #7a6a1f;\n  --bd-panel: #e2e4e9; --bd-light: #eef0f3; --bd-dash: #f0f1f3; --bd-input: #e5e7eb; --bd-note: #eef0f3; --bd-retry: #fecaca;\n  --tx-primary: #1f2328; --tx-secondary: #6b7280; --tx-tertiary: #4b5563; --tx-muted: #9ca3af;\n  --tx-link: #2563eb; --tx-danger: #dc2626; --tx-inverse: #f9fafb;\n  --accent: #5f8f55; --accent-soft: #c8ddc2; --fab-color: #5f8f55;\n  --rel-high: #8ba888; --rel-mid: #9ba5b4; --rel-low: #c4a59a; --rel-none: #d6d3d1;\n  --shadow-panel: 0 10px 32px rgba(0,0,0,.16); --shadow-fab: 0 4px 14px rgba(0,0,0,.14); --fab-glow: 0 10px 22px -4px rgba(95,143,85,.4);\n}\n/* ---- \u6DF1\u8272\u8272\u677F ---- */\n.sz-dock.dark {\n  --bg-panel: #1a1b1e; --bg-card: #25262b; --bg-note: #2a2b30; --bg-hover: #33343a; --bg-input: #25262b;\n  --bg-tab-act: #33343a; --bg-badge: #33343a; --bg-badge-on: #1a3a2a; --bg-del-hover: #3a1e1e;\n  --bg-retry: #25262b; --bg-retry-hover: #3a1e1e;\n  --bg-warn: #2b2413; --bd-warn: #57481f; --tx-warn: #d8ba6b;\n  --bd-panel: #3a3b40; --bd-light: #33343a; --bd-dash: #2e2f35; --bd-input: #3a3b40; --bd-note: #3a3b40; --bd-retry: #5a2a2a;\n  --tx-primary: #e0e0e4; --tx-secondary: #9ca3af; --tx-tertiary: #b0b3ba; --tx-muted: #6b7280;\n  --tx-link: #6ea8fe; --tx-danger: #f87171; --tx-inverse: #1a1b1e;\n  --accent: #76a86c; --accent-soft: #31502f; --fab-color: #76a86c;\n  --rel-high: #9bc4a8; --rel-mid: #a8b2c0; --rel-low: #d0aea3; --rel-none: #4a4744;\n  --shadow-panel: 0 10px 32px rgba(0,0,0,.5); --shadow-fab: 0 4px 14px rgba(0,0,0,.4); --fab-glow: 0 10px 22px -4px rgba(118,168,108,.45);\n}\n\n/* ---- \u4E3B\u9898\u5207\u6362\u8FC7\u6E21 ---- */\n/* \u515C\u5E95\uFF1AShadow DOM \u5185\u6240\u6709\u5143\u7D20\uFF08\u542B ::before/::after \u4F2A\u5143\u7D20\uFF09\u7684\u989C\u8272\u7C7B\u5C5E\u6027\u968F\u4E3B\u9898\u6E10\u53D8\uFF1B\u7EC4\u4EF6\u81EA\u5DF1\u5B9A\u4E49\u7684 transition\uFF08\u5982 hover\u3001transform\uFF09\n   \u4E66\u5199\u4F4D\u7F6E\u9760\u540E\uFF0C\u4F18\u5148\u7EA7\u4E0E\u672C\u89C4\u5219\u76F8\u540C\u3001\u6B21\u5E8F\u5728\u540E\uFF0C\u4E0D\u53D7\u5F71\u54CD\uFF0C\u4F46\u9700\u81EA\u884C\u8865\u9F50\u989C\u8272\u5C5E\u6027 */\n:host, :host *, :host *::before, :host *::after {\n  transition: background-color .45s ease-in-out, color .45s ease-in-out, border-color .45s ease-in-out, box-shadow .45s ease-in-out;\n}\n\n* { box-sizing: border-box; font-family: -apple-system, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif; }\n/* \u6EDA\u52A8\u6761\uFF1A\u80CC\u666F\u900F\u660E\uFF0Cthumb \u8DDF\u968F\u4E3B\u9898\u8272 */\n.sz-body::-webkit-scrollbar,\n.sz-todo-pop::-webkit-scrollbar { width: 5px; }\n.sz-body::-webkit-scrollbar-track,\n.sz-todo-pop::-webkit-scrollbar-track { background: transparent; }\n.sz-body::-webkit-scrollbar-thumb,\n.sz-todo-pop::-webkit-scrollbar-thumb { background: var(--tx-muted); border-radius: 3px; }\n.sz-body::-webkit-scrollbar-thumb:hover,\n.sz-todo-pop::-webkit-scrollbar-thumb:hover { background: var(--tx-secondary); }\n.sz-dock { position: fixed; left: 0; top: 0; width: 40px; height: 40px; z-index: 2147483000; }\n.sz-fab { position: absolute; left: 0; top: 0; width: 40px; height: 40px; border-radius: 50%; background: var(--bg-panel); border: 1px solid var(--bd-panel); box-shadow: var(--shadow-fab); display: flex; align-items: center; justify-content: center; cursor: grab; color: var(--fab-color); padding: 0; }\n.sz-fab.dragging { cursor: grabbing; }\n.sz-fab:hover { background: var(--bg-hover); box-shadow: var(--shadow-fab), var(--fab-glow); }\n.sz-fab.on { color: var(--accent); border-color: var(--accent-soft); }\n.sz-fab-logo { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: block; pointer-events: none; transition: transform .2s ease-out; }\n.sz-fab:hover .sz-fab-logo { transform: scale(1.08); }\n.sz-pending { position: absolute; left: 50%; bottom: 46px; transform: translateX(-50%); display: none; padding: 2px 8px; border-radius: 999px; background: var(--bg-panel); border: 1px solid var(--bd-panel); box-shadow: 0 2px 8px rgba(0,0,0,.1); color: var(--tx-secondary); font-size: 11px; pointer-events: none; white-space: nowrap; }\n.sz-pending.on { display: inline-block; animation: sz-breathe 1.6s ease-in-out infinite; }\n@keyframes sz-breathe { 0%, 100% { opacity: 1; } 50% { opacity: .45; } }\n.sz-panel { position: absolute; right: 0; bottom: 48px; width: 360px; max-height: 70vh; background: var(--bg-panel); border: 1px solid var(--bd-panel); border-radius: 8px; box-shadow: var(--shadow-panel); display: none; flex-direction: column; color: var(--tx-primary); font-size: 13px; overflow: hidden; }\n.sz-panel.open { display: flex; }\n.sz-resize { position: absolute; top: 0; left: 0; width: 16px; height: 16px; cursor: nwse-resize; z-index: 2; }\n.sz-resize svg { position: absolute; top: 3px; left: 3px; }\n.sz-head { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-bottom: 1px solid var(--bd-light); }\n.sz-title { font-size: 17px; font-weight: 700; letter-spacing: .5px; flex: 1; }\n.sz-mode-switch { display: inline-flex; align-items: center; padding: 2px; border-radius: 7px; background: var(--bg-badge); flex: none; }\n.sz-mode-option { min-width: 52px; height: 24px; padding: 0 7px; border: none; border-radius: 5px; background: transparent; color: var(--tx-muted); font-size: 11px; line-height: 1; cursor: pointer; white-space: nowrap; transition: transform .1s ease, background-color .45s ease-in-out, color .45s ease-in-out, border-color .45s ease-in-out, box-shadow .45s ease-in-out; }\n.sz-mode-option:hover { color: var(--tx-primary); }\n.sz-mode-option:active { transform: scale(.97); }\n.sz-mode-option:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }\n.sz-mode-option.act { background: var(--bg-panel); color: var(--tx-primary); font-weight: 600; box-shadow: 0 1px 4px rgba(0,0,0,.12); }\n.sz-theme-color-wrap { position: relative; flex: none; }\n.sz-theme-color-btn { width: 26px; height: 26px; display: inline-flex; align-items: center; justify-content: center; border: none; background: transparent; border-radius: 6px; color: var(--accent); cursor: pointer; padding: 0; flex: none; }\n.sz-theme-color-btn:hover { background: var(--bg-hover); color: var(--accent); }\n.sz-theme-color-btn:focus-visible, .sz-theme-reset:focus-visible, .sz-theme-swatch:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }\n.sz-theme-color-pop { position: absolute; z-index: 20; top: 33px; right: -4px; width: 190px; padding: 12px; border: 1px solid var(--bd-panel); border-radius: 12px; background: var(--bg-panel); box-shadow: 0 10px 28px rgba(0,0,0,.16); display: none; }\n.sz-theme-color-pop.open { display: block; }\n.sz-theme-color-head, .sz-theme-color-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; }\n.sz-theme-color-head { margin-bottom: 10px; color: var(--tx-primary); font-size: 12px; }\n.sz-theme-color-head span, .sz-theme-color-foot span { color: var(--tx-muted); font-size: 10px; }\n.sz-theme-color-swatches { display: grid; grid-template-columns: repeat(4, 30px); gap: 8px; }\n.sz-theme-swatch { width: 30px; height: 30px; padding: 0; border: none; border-radius: 9px; background: var(--swatch); cursor: pointer; transition: transform .15s ease, box-shadow .15s ease; }\n.sz-theme-swatch:hover { transform: translateY(-1px); box-shadow: 0 3px 8px color-mix(in srgb, var(--swatch) 34%, transparent); }\n.sz-theme-swatch.selected { box-shadow: 0 0 0 2px var(--bg-panel), 0 0 0 4px var(--accent); }\n.sz-theme-custom { position: relative; overflow: hidden; background: conic-gradient(#ef4444, #f59e0b, #eab308, #22c55e, #06b6d4, #3b82f6, #8b5cf6, #ef4444); }\n.sz-theme-custom input { position: absolute; inset: 0; width: 100%; height: 100%; padding: 0; border: 0; opacity: 0; cursor: pointer; }\n.sz-theme-color-foot { margin-top: 10px; }\n.sz-theme-reset { padding: 2px 0; border: none; background: transparent; color: var(--tx-secondary); cursor: pointer; font-size: 10px; }\n.sz-theme-reset:hover { color: var(--accent); }\n.sz-theme-btn { width: 26px; height: 26px; display: inline-flex; align-items: center; justify-content: center; border: none; background: transparent; border-radius: 6px; color: var(--tx-secondary); cursor: pointer; padding: 0; flex: none; }\n.sz-theme-btn:hover { background: var(--bg-hover); color: var(--tx-primary); }\n.sz-tabs { display: flex; gap: 4px; padding: 8px 12px 0; }\n.sz-tabs[hidden] { display: none; }\n.sz-tab { flex: 1; padding: 6px 0; text-align: center; border-radius: 6px; cursor: pointer; color: var(--tx-secondary); background: transparent; border: none; font-size: 13px; }\n.sz-tab.act { background: var(--bg-tab-act); color: var(--tx-primary); font-weight: 600; }\n.sz-body { padding: 10px 12px; overflow-y: auto; flex: 1; min-height: 120px; }\n.sz-body.sz-animH { flex: none; overflow: hidden; transition: height .2s ease; }\n.sz-foot { padding: 8px 12px; border-top: 1px solid var(--bd-light); display: flex; gap: 6px; align-items: center; }\n.sz-add { display: flex; gap: 6px; margin-bottom: 8px; }\n.sz-input { flex: 1; padding: 6px 8px; border: 1px solid var(--bd-input); border-radius: 6px; font-size: 13px; outline: none; min-width: 0; background: var(--bg-input); color: var(--tx-primary); }\n.sz-input:focus { border-color: var(--accent); }\n.sz-input::placeholder, .sz-textarea::placeholder { color: var(--tx-muted); opacity: .7; }\n.sz-rec-toolbar { display: none; gap: 6px; padding: 8px 12px 0; align-items: center; }\n.sz-rec-toolbar.on { display: flex; }\n.sz-rectools { display: none; gap: 6px; padding: 8px 12px 0; }\n.sz-rectools.on { display: flex; }\n.sz-sortbtn { flex: none; padding: 0 10px; border: 1px solid var(--bd-input); border-radius: 6px; background: var(--bg-input); color: var(--tx-secondary); font-size: 12px; cursor: pointer; white-space: nowrap; }\n.sz-sortbtn:hover { color: var(--tx-primary); background: var(--bg-hover); }\n.sz-sort-tabs { display: flex; gap: 2px; }\n.sz-sort-tab { padding: 4px 10px; border-radius: 6px; border: none; background: transparent; color: var(--tx-secondary); font-size: 12px; cursor: pointer; white-space: nowrap; }\n.sz-sort-tab:hover { background: var(--bg-hover); color: var(--tx-primary); }\n.sz-sort-tab.act { background: var(--bg-tab-act); color: var(--tx-primary); font-weight: 600; }\n.sz-sec-link { border-radius: 6px; padding: 2px 4px; margin-left: -4px; margin-right: -4px; }\n.sz-sec-link:hover { background: var(--bg-hover); }\n.sz-sec-link:has(> .sz-rec-caret:hover) { background: transparent; }\n.sz-back { display: inline-flex; align-items: center; gap: 2px; border: none; background: transparent; color: var(--tx-secondary); font-size: 12px; cursor: pointer; padding: 2px 6px; border-radius: 6px; flex: none; }\n.sz-back:hover { background: var(--bg-hover); color: var(--tx-primary); }\n.sz-ibtn { width: 26px; height: 26px; display: inline-flex; align-items: center; justify-content: center; border: none; background: transparent; border-radius: 6px; color: var(--tx-secondary); cursor: pointer; padding: 0; flex: none; }\n.sz-ibtn:hover { background: var(--bg-hover); color: var(--tx-primary); }\n.sz-cat-btn { display: inline-flex; align-items: center; gap: 4px; height: 20px; padding: 0 7px; border: none; background: transparent; border-radius: 4px; color: var(--tx-muted); font-size: 10.5px; cursor: pointer; flex: none; white-space: nowrap; transition: background-color .15s ease, color .15s ease; }\n.sz-cat-btn:hover { background: var(--bg-hover); color: var(--tx-primary); }\n.sz-cat-btn.empty { color: var(--tx-muted); opacity: .6; }\n.sz-cat-btn.empty:hover { opacity: 1; color: var(--accent); }\n.sz-cat-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--accent); flex: none; opacity: .7; }\n.sz-cat-btn:hover .sz-cat-dot { opacity: 1; }\n.sz-rec-caret { width: 22px; height: 22px; transform: rotate(-90deg); transition: transform .15s ease, background-color .45s ease-in-out, color .45s ease-in-out, border-color .45s ease-in-out, box-shadow .45s ease-in-out; }\n.sz-rec-caret.open { transform: rotate(0deg); }\n.sz-row .sz-rec-caret:hover { background: var(--bg-hover); border-radius: 8px; box-shadow: 0 1px 4px rgba(0,0,0,.14); color: var(--tx-primary); }\n.sz-group-title { cursor: pointer; border-radius: 4px; padding: 2px 4px; margin-left: -4px; }\n.sz-group-title:hover { background: var(--bg-hover); color: var(--tx-link); }\n.sz-expand svg { transition: transform .15s ease; }\n.sz-rec.expanded .sz-expand svg { transform: rotate(180deg); }\n.sz-rec .sz-expand:hover { background: var(--bg-hover); border-radius: 8px; box-shadow: 0 1px 4px rgba(0,0,0,.14); color: var(--tx-primary); }\n.sz-rec:has(.sz-expand:hover) { background: transparent; }\n.sz-rec:has(.sz-rec-actions > .sz-expand:hover) { background: transparent; }\n.sz-grow { display: flex; align-items: center; gap: 6px; padding: 6px 0; border-bottom: 1px dashed var(--bd-dash); }\n.sz-gtitle { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--tx-primary); font-size: 14px; font-weight: 650; }\n.sz-badge { font-size: 11px; padding: 1px 6px; border-radius: 999px; background: var(--bg-badge); color: var(--tx-secondary); flex: none; }\n.sz-badge.on { background: var(--bg-badge-on); color: var(--accent); }\n.sz-empty { color: var(--tx-muted); text-align: center; padding: 24px 0; }\n.sz-empty-card { display: flex; flex-direction: column; align-items: center; margin-top: 18px; padding: 28px 22px; border: 1px solid var(--bd-panel); border-radius: 12px; background: var(--bg-panel); text-align: center; box-shadow: 0 1px 4px rgba(0,0,0,.06); }\n.sz-empty-card-icon { display: inline-flex; align-items: center; justify-content: center; width: 42px; height: 42px; margin-bottom: 12px; border-radius: 13px; background: var(--bg-badge-on); color: var(--accent); }\n.sz-empty-card-icon svg { width: 21px; height: 21px; }\n.sz-empty-card-title { margin-bottom: 7px; color: var(--tx-primary); font-size: 14px; font-weight: 650; }\n.sz-empty-card-desc { max-width: 320px; color: var(--tx-secondary); font-size: 12px; line-height: 1.75; }\n.sz-empty-card-desc strong { color: var(--accent); font-weight: 650; }\n/* ---- \u6478\u9C7C\u6C60\u5858\uFF08\u56FA\u5B9A\u5206\u7C7B\u5165\u53E3\uFF09 ---- */\n.sz-slacking { display: flex; align-items: center; gap: 10px; margin-top: 8px; padding: 10px 12px; border: 1px dashed var(--bd-input); border-radius: 12px; background: var(--bg-card); cursor: pointer; }\n.sz-slacking:hover { border-color: #d97706; background: var(--bg-hover); }\n.sz-slacking-fish { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; flex: none; border-radius: 9px; color: #d97706; background: color-mix(in srgb, #d97706 12%, transparent); }\n.sz-slacking-body { display: flex; flex-direction: column; gap: 1px; min-width: 0; }\n.sz-slacking-title { color: var(--tx-primary); font-size: 12.5px; font-weight: 650; }\n.sz-slacking-desc { color: var(--tx-muted); font-size: 11px; }\n.sz-sec { display: flex; align-items: center; gap: 6px; font-weight: 600; margin: 10px 0 4px; color: var(--tx-primary); }\n.sz-sec:first-child { margin-top: 0; }\n.sz-dot { width: 8px; height: 8px; border-radius: 50%; flex: none; }\n.sz-count { color: var(--tx-muted); font-weight: 400; font-size: 12px; }\n.sz-rec { padding: 6px 0; border-bottom: 1px dashed var(--bd-dash); }\n.sz-rec:hover { background: var(--bg-hover); border-radius: 6px; }\n.sz-rec-list { margin: 2px 0 8px 18px; padding-left: 12px; border-left: 1px solid var(--bd-light); }\n.sz-rec-list .sz-rec { padding: 8px 0 9px; }\n.sz-rec-list .sz-rec:first-child { padding-top: 5px; }\n.sz-rec-list .sz-rec:last-child { border-bottom: none; padding-bottom: 5px; }\n.sz-rec-head { display: flex; align-items: flex-start; gap: 4px; }\n.sz-rec-main { flex: 1; min-width: 0; }\n.sz-rec-actions { display: flex; gap: 4px; flex: none; align-items: center; }\n.sz-rel-badge { font-size: 10px; padding: 1px 6px; border-radius: 999px; background: var(--bg-badge); color: var(--tx-secondary); flex: none; }\n.sz-rec.expanded .sz-rmeta { -webkit-line-clamp: unset; overflow: visible; }\n.sz-rec-detail { max-height: 0; margin-top: 0; padding: 0 8px; overflow: hidden; opacity: 0; background: var(--bg-card); border-radius: 6px; font-size: 12px; color: var(--tx-tertiary); line-height: 1.6; word-break: break-word; transition: max-height .22s cubic-bezier(.2,0,0,1), margin-top .22s ease, padding .22s ease, opacity .16s ease, background-color .45s ease-in-out, color .45s ease-in-out, border-color .45s ease-in-out, box-shadow .45s ease-in-out; }\n.sz-rec.expanded .sz-rec-detail { margin-top: 6px; padding: 8px; opacity: 1; }\n.sz-detail-sec { margin-top: 8px; }\n.sz-detail-sec:first-child { margin-top: 0; }\n.sz-detail-sec-title { font-size: 12px; font-weight: 600; color: var(--tx-primary); margin-bottom: 4px; }\n.sz-detail-finding { display: flex; gap: 4px; padding: 2px 0; color: var(--tx-tertiary); }\n.sz-detail-finding::before { content: "\u2022"; color: var(--tx-muted); flex: none; }\n.sz-detail-note { padding: 6px 8px; background: var(--bg-note); border-radius: 4px; border: 1px solid var(--bd-note); margin-top: 4px; }\n.sz-detail-note-head { display: flex; align-items: center; gap: 6px; margin-bottom: 2px; }\n.sz-detail-note-topic { font-weight: 600; color: var(--tx-primary); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n.sz-detail-note-rel { font-size: 10px; padding: 1px 6px; border-radius: 999px; flex: none; color: var(--tx-secondary); background: var(--bg-badge); }\n.sz-detail-note-content { color: var(--tx-tertiary); font-size: 12px; }\n.sz-rel { width: 8px; height: 8px; border-radius: 50%; flex: none; margin-top: 5px; }\n.sz-rel-high { background: var(--rel-high); }\n.sz-rel-mid { background: var(--rel-mid); }\n.sz-rel-low { background: var(--rel-low); }\n.sz-rel-none { background: var(--rel-none); }\n.sz-rtitle { display: block; color: var(--tx-primary); text-decoration: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\n.sz-rtitle:hover { text-decoration: underline; color: var(--tx-link); }\n.sz-rmeta { color: var(--tx-secondary); font-size: 12px; margin-top: 2px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }\n.sz-select { margin-top: 4px; font-size: 11px; color: var(--tx-secondary); border: 1px solid var(--bd-input); border-radius: 4px; max-width: 140px; background: var(--bg-input); }\n.sz-retry { margin-top: 4px; font-size: 11px; color: var(--tx-danger); border: 1px solid var(--bd-retry); border-radius: 4px; background: var(--bg-retry); cursor: pointer; padding: 1px 8px; }\n.sz-retry:hover { background: var(--bg-retry-hover); }\n.sz-toasts { position: absolute; right: 0; bottom: 46px; width: max-content; display: flex; flex-direction: column; align-items: flex-end; gap: 8px; z-index: 3; pointer-events: none; }\n.sz-toast { position: relative; display: flex; align-items: center; gap: 6px; background: var(--bg-panel); border: 1px solid var(--bd-panel); border-radius: 14px; box-shadow: var(--shadow-fab); padding: 8px 12px; color: var(--tx-primary); font-size: 12px; max-width: 300px; opacity: 0; transform: translateY(10px) scale(.92); transform-origin: bottom right; transition: transform .25s ease-out, opacity .25s ease-out, background-color .45s ease-in-out, color .45s ease-in-out, border-color .45s ease-in-out, box-shadow .45s ease-in-out; }\n.sz-toast::after { content: ""; position: absolute; right: 16px; bottom: -5px; width: 9px; height: 9px; background: inherit; border-right: 1px solid var(--bd-panel); border-bottom: 1px solid var(--bd-panel); transform: rotate(45deg); }\n.sz-toast .txt { min-width: 0; line-height: 1.55; overflow-wrap: break-word; }\n.sz-toast.show { opacity: 1; transform: translateY(0) scale(1); }\n.sz-toast.hide { opacity: 0; transform: translateY(10px) scale(.92); transition-timing-function: ease-in; }\n.sz-dock.flip-v .sz-panel { bottom: auto; top: 48px; }\n.sz-dock.flip-v .sz-toasts { bottom: auto; top: 46px; align-items: flex-end; }\n.sz-dock.flip-v .sz-toast { transform: translateY(-10px) scale(.92); transform-origin: top right; }\n.sz-dock.flip-v .sz-toast::after { top: -5px; bottom: auto; border: none; border-left: 1px solid var(--bd-panel); border-top: 1px solid var(--bd-panel); }\n.sz-dock.flip-v .sz-toast.show { transform: translateY(0) scale(1); }\n.sz-dock.flip-v .sz-toast.hide { transform: translateY(-10px) scale(.92); }\n.sz-dock.flip-h .sz-panel { right: auto; left: 0; }\n.sz-dock.flip-h .sz-toasts { right: auto; left: 0; align-items: flex-start; }\n.sz-dock.flip-h .sz-toast { transform-origin: bottom left; }\n.sz-dock.flip-h .sz-toast::after { right: auto; left: 16px; }\n.sz-dock.flip-h.flip-v .sz-toast { transform-origin: top left; }\n.sz-dock.flip-v .sz-resize { top: auto; bottom: 0; cursor: nesw-resize; }\n.sz-dock.flip-h .sz-resize { left: auto; right: 0; cursor: nesw-resize; }\n.sz-dock.flip-v.flip-h .sz-resize { cursor: nwse-resize; }\n.sz-dock.flip-h .sz-resize svg { left: auto; right: 3px; transform: scaleX(-1); }\n.sz-dock.flip-v .sz-resize svg { top: auto; bottom: 3px; transform: scaleY(-1); }\n.sz-dock.flip-v.flip-h .sz-resize svg { transform: scale(-1, -1); }\n\n/* ---- todo \u72EC\u7ACB\u6C14\u6CE1 ---- */\n.sz-todo { position: absolute; right: 48px; top: 0; height: 40px; display: flex; align-items: center; }\n.sz-dock.flip-h .sz-todo { right: auto; left: 48px; }\n.sz-todo-bar { display: flex; align-items: center; gap: 6px; max-width: 220px; background: var(--bg-panel); border: 1px solid var(--bd-panel); border-radius: 999px; box-shadow: var(--shadow-fab); padding: 7px 12px; cursor: pointer; color: var(--tx-primary); font-size: 12px; }\n.sz-todo-bar:hover { border-color: var(--accent); }\n.sz-todo-bar .sz-dot { width: 7px; height: 7px; background: var(--accent); }\n.sz-todo-bar .txt { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\n.sz-todo:has(.sz-todo-pop.open) { z-index: 5; }\n.sz-todo-pop { position: absolute; right: 0; bottom: calc(100% + 4px); z-index: 4; width: 320px; max-height: 320px; overflow-y: auto; background: var(--bg-panel); border: 1px solid var(--bd-panel); border-radius: 12px; box-shadow: var(--shadow-panel); display: none; color: var(--tx-primary); font-size: 13px; }\n.sz-todo-pop.open { display: block; }\n.sz-dock.flip-v .sz-todo-pop { bottom: auto; top: calc(100% + 4px); }\n.sz-dock.flip-h .sz-todo-pop { right: auto; left: 0; }\n.sz-todo-head { display: flex; align-items: center; gap: 6px; padding: 10px 12px; border-bottom: 1px solid var(--bd-light); font-size: 12px; color: var(--tx-secondary); }\n.sz-todo-title { color: var(--tx-primary); font-weight: 650; }\n.sz-todo-head .sz-ibtn { margin-left: auto; }\n.sz-todo-list { padding: 6px 12px 10px; }\n.sz-todo-item { padding: 8px 0; border-bottom: 1px dashed var(--bd-dash); }\n.sz-todo-item:last-child { border-bottom: none; }\n.sz-todo-text { display: flex; align-items: center; gap: 6px; font-size: 12px; margin-bottom: 4px; }\n.sz-todo-text .t { flex: 1; min-width: 0; }\n.sz-todo-goal { display: flex; align-items: center; gap: 6px; margin-top: 8px; font-size: 11px; font-weight: 650; color: var(--tx-secondary); }\n.sz-todo-goal:first-child { margin-top: 2px; }\n.sz-todo-goal-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n.sz-todo-row { display: flex; align-items: center; gap: 6px; font-size: 12px; margin-bottom: 4px; }\n.sz-todo-row .t { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n.sz-todo-pct { flex: none; font-size: 11px; color: var(--tx-muted); }\n.sz-bar { height: 4px; background: var(--bg-badge); border-radius: 2px; overflow: hidden; }\n.sz-bar > i { display: block; height: 100%; background: var(--accent); border-radius: 2px; }\n.sz-term-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }\n.sz-term-chip { display: inline-flex; align-items: stretch; max-width: 100%; border: 1px solid var(--bd-input); border-radius: 999px; background: var(--bg-card); overflow: hidden; }\n.sz-term-chip:hover { border-color: var(--accent); }\n.sz-term-go { border: none; background: transparent; color: var(--tx-secondary); font-size: 11px; padding: 3px 4px 3px 9px; cursor: pointer; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n.sz-term-chip:hover .sz-term-go { color: var(--accent); }\n.sz-term-copy { display: inline-flex; align-items: center; border: none; background: transparent; color: var(--tx-muted); padding: 0 7px 0 4px; cursor: pointer; }\n.sz-term-copy:hover { color: var(--accent); }\n\n/* ---- \u53F3\u952E\u83DC\u5355 ---- */\n.sz-ctxmenu { position: fixed; z-index: 2147483002; display: none; font-size: 12px; }\n.sz-ctxmenu.open { display: block; }\n.sz-ctxmenu-item { display: flex; align-items: center; gap: 6px; text-align: left; background: var(--bg-panel); border: 1px solid var(--bd-panel); border-radius: 999px; box-shadow: var(--shadow-fab); padding: 7px 12px; font-size: 12px; color: var(--tx-primary); cursor: pointer; }\n.sz-ctxmenu-item:hover { border-color: var(--accent); }\n\n/* ---- \u5BFC\u51FA\u6D6E\u5C42 ---- */\n.sz-export-wrap { position: relative; flex: none; display: inline-flex; }\n.sz-pop { position: absolute; right: 0; top: calc(100% + 6px); background: var(--bg-panel); border: 1px solid var(--bd-panel); border-radius: 6px; box-shadow: var(--shadow-panel); z-index: 10; min-width: 250px; padding: 8px; }\n.sz-export-row { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }\n\n/* ---- \u76EE\u6807\u4E09\u7EA7\u6811 ---- */\n.sz-goal-toolbar { display: flex; gap: 6px; margin-bottom: 8px; flex-wrap: wrap; }\n.sz-node { position: relative; margin-bottom: 10px; padding-bottom: 8px; }\n.sz-node::after { content: ""; position: absolute; left: 4px; right: 4px; bottom: 0; height: 1px; background: var(--bd-light); }\n.sz-node:last-child { margin-bottom: 0; }\n.sz-node:last-child::after { display: none; }\n.sz-row { display: flex; align-items: center; gap: 5px; min-height: 28px; padding: 3px 2px; border-radius: 6px; }\n.sz-row:hover { background: var(--bg-hover); }\n.sz-row:has(> .sz-rec-caret:hover) { background: transparent; }\n.sz-add-node-row:hover { background: transparent; }\n.sz-row-goal { margin-top: 1px; padding-top: 5px; padding-bottom: 5px; }\n.sz-row-task { padding-top: 4px; padding-bottom: 3px; }\n.sz-row-subtask { min-height: 25px; padding-top: 2px; padding-bottom: 2px; }\n.sz-row.dragover { outline: 1px dashed var(--accent); outline-offset: -1px; }\n.sz-grip { color: var(--tx-muted); cursor: grab; display: flex; flex: none; opacity: 0; transition: opacity .15s ease, background-color .45s ease-in-out, color .45s ease-in-out, border-color .45s ease-in-out, box-shadow .45s ease-in-out; }\n.sz-row:hover .sz-grip { opacity: .7; }\n.sz-grip:active { cursor: grabbing; }\n.sz-level { display: block; flex: none; padding: 0; background: transparent; }\n.sz-goal-color { width: 18px; height: 24px; display: inline-flex; align-items: center; justify-content: center; padding: 0; border: none; background: transparent; color: var(--goal-color); cursor: pointer; flex: none; transition: color .15s ease, transform .15s ease; }\n.sz-goal-color svg { width: 17px; height: 17px; display: block; }\n.sz-goal-color:hover { transform: scale(1.08); }\n.sz-goal-color:focus-visible { outline: 1px solid var(--tx-muted); outline-offset: 1px; border-radius: 4px; }\n.sz-level-task { width: 5px; height: 5px; margin: 0 1px; border-radius: 2px; background: var(--tx-secondary); opacity: .65; }\n.sz-level-subtask { width: 4px; height: 4px; margin: 0 2px; border-radius: 50%; background: var(--tx-muted); opacity: .8; }\n.sz-goal-palette { position: absolute; z-index: 6; top: 35px; left: 38px; display: grid; grid-template-columns: repeat(4, 30px); gap: 8px; width: max-content; padding: 9px; border: 1px solid var(--bd-panel); border-radius: 8px; background: var(--bg-panel); box-shadow: 0 8px 24px rgba(0,0,0,.18); }\n.sz-color-swatch { position: relative; width: 30px; height: 30px; padding: 0; border: none; border-radius: 7px; background: var(--swatch); cursor: pointer; transition: transform .15s ease, box-shadow .15s ease; }\n.sz-color-swatch:hover { transform: translateY(-1px); }\n.sz-color-swatch:focus-visible { outline: 2px solid var(--tx-primary); outline-offset: 2px; }\n.sz-color-swatch.selected { box-shadow: 0 0 0 2px var(--bg-panel), 0 0 0 4px var(--accent-soft); }\n.sz-color-custom { overflow: hidden; background: conic-gradient(#ef4444, #f59e0b, #eab308, #22c55e, #06b6d4, #3b82f6, #8b5cf6, #ef4444); }\n.sz-color-custom input { position: absolute; inset: 0; width: 100%; height: 100%; padding: 0; border: 0; opacity: 0; cursor: pointer; }\n.sz-title-wrap { flex: 1; min-width: 0; display: flex; align-items: center; gap: 5px; }\n.sz-title-wrap .sz-ntitle { flex: 0 1 auto; }\n.sz-goal-title-edit { flex: 1; min-width: 0; display: flex; align-items: center; gap: 2px; }\n.sz-goal-title-input { flex: 1; min-width: 0; height: 26px; padding: 3px 6px; font-size: 14px; font-weight: 650; }\n.sz-ntitle { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--tx-primary); letter-spacing: .01em; }\n.sz-ntitle-goal { font-size: 14px; font-weight: 650; }\n.sz-ntitle-task { font-size: 12px; font-weight: 600; }\n.sz-ntitle-subtask { font-size: 12px; font-weight: 400; color: var(--tx-primary); }\n.sz-ntitle.done { color: var(--tx-muted); text-decoration: line-through; }\n.sz-ntitle.clickable { cursor: pointer; }\n.sz-ntitle.clickable:hover { color: var(--accent); }\n.sz-children { margin-left: 8px; padding-left: 8px; border-left: 1px solid var(--bd-light); }\n.sz-children, .sz-rec-list { transform-origin: top; }\n.sz-expand-enter { overflow: hidden; animation: sz-expand-in .22s cubic-bezier(.2,0,0,1) both; }\n.sz-collapse-leave { overflow: hidden; animation: sz-collapse-out .2s cubic-bezier(.4,0,1,1) both; pointer-events: none; }\n@keyframes sz-expand-in { from { height: 0; opacity: 0; transform: translateY(-4px) scaleY(.96); } to { height: var(--collapse-size); opacity: 1; transform: translateY(0) scaleY(1); } }\n@keyframes sz-collapse-out { from { height: var(--collapse-size); opacity: 1; transform: translateY(0) scaleY(1); } to { height: 0; opacity: 0; transform: translateY(-3px) scaleY(.96); } }\n@media (prefers-reduced-motion: reduce) { .sz-expand-enter, .sz-collapse-leave { animation: none; } .sz-rec-detail { transition: none; } }\n.sz-task-input { flex: 0 0 82px; width: 82px; }\n.sz-sub-input { flex: 0 0 96px; width: 96px; margin-left: 24px; margin-right: 24px; }\n.sz-caret-spacer { width: 22px; flex: none; }\n.sz-prompt { display: flex; align-items: center; gap: 6px; margin: -1px 0 4px 16px; padding: 1px 6px 2px; font-size: 11px; line-height: 1.5; color: var(--tx-secondary); cursor: pointer; border-radius: 4px; }\n.sz-prompt:not(.empty)::before { content: ""; width: 8px; height: 1px; flex: none; background: var(--bd-input); }\n.sz-prompt:hover { background: var(--bg-hover); color: var(--tx-primary); }\n.sz-prompt:hover::before { background: var(--accent); }\n.sz-prompt-fixed { cursor: default; }\n.sz-prompt-fixed:hover { background: transparent; color: var(--tx-secondary); }\n.sz-prompt-fixed:hover::before { background: var(--bd-input); }\n.sz-prompt-goal { color: var(--tx-tertiary); }\n.sz-prompt-subtask { color: var(--tx-muted); }\n.sz-prompt.empty { color: var(--tx-muted); font-style: italic; opacity: .75; }\n.sz-prompt.empty:hover { opacity: 1; color: var(--accent); }\n.sz-prompt-text { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\n.sz-prompt-edit { margin: 1px 0 7px 16px; }\n.sz-textarea.sz-prompt-input { height: 38px; min-height: 38px; max-height: 120px; padding: 8px 10px; line-height: 20px; resize: vertical; overflow-y: hidden; }\n.sz-goal-status { width: 22px; height: 22px; margin-left: 1px; opacity: 0; transition: opacity .15s ease, background-color .15s ease, color .15s ease; }\n.sz-row [data-act^="edit-"], .sz-row [data-act^="del-"] { width: 22px; height: 22px; opacity: 0; transition: opacity .15s ease, background-color .15s ease, color .15s ease; }\n.sz-row:hover .sz-goal-status, .sz-row:hover [data-act^="edit-"], .sz-row:hover [data-act^="del-"], .sz-row:focus-within .sz-goal-status, .sz-row:focus-within [data-act^="edit-"], .sz-row:focus-within [data-act^="del-"] { opacity: .72; }\n.sz-row .sz-goal-status:hover, .sz-row [data-act^="edit-"]:hover, .sz-row [data-act^="del-"]:hover { opacity: 1; }\n.sz-prompt-actions { display: flex; gap: 6px; margin-top: 4px; }\n.sz-inline-confirm { display: flex; align-items: center; gap: 6px; margin: 2px 0 6px 16px; padding: 5px 7px; border: 1px solid var(--bd-retry); border-radius: 6px; background: var(--bg-retry); color: var(--tx-secondary); font-size: 11px; line-height: 1.4; }\n.sz-inline-confirm span { flex: 1; min-width: 0; }\n.sz-inline-confirm .sz-btn { padding: 3px 8px; font-size: 11px; }\n\n/* ---- AI \u62C6\u89E3\u786E\u8BA4\u5361\u7247 ---- */\n.sz-ai-confirm { border: 1px solid var(--accent); background: var(--bg-badge-on); border-radius: 10px; padding: 10px; margin-bottom: 10px; }\n.sz-ai-head { font-size: 13px; font-weight: 600; color: var(--accent); margin-bottom: 8px; }\n.sz-ai-confirm .sz-input, .sz-ai-confirm .sz-textarea { margin-bottom: 6px; }\n.sz-ai-questions { background: var(--bg-warn); border: 1px solid var(--bd-warn); border-radius: 6px; padding: 8px 10px; margin: 8px 0; font-size: 12px; color: var(--tx-warn); }\n.sz-ai-tasks { margin-top: 8px; }\n.sz-ai-task { border: 1px solid var(--bd-light); background: var(--bg-panel); border-radius: 8px; padding: 8px; margin-bottom: 6px; }\n.sz-ai-task-head { margin-bottom: 4px; }\n.sz-ai-num { font-size: 11px; font-weight: 600; color: var(--tx-secondary); }\n.sz-ai-ta { min-height: 44px; }\n.sz-ai-sub { display: flex; align-items: center; gap: 4px; margin-top: 4px; }\n.sz-ai-sub-dot { color: var(--accent); flex: none; }\n.sz-ai-actions { display: flex; gap: 8px; margin-top: 8px; }\n\n/* ---- \u8BBE\u7F6E / \u753B\u50CF ---- */\n.sz-field { margin-bottom: 14px; }\n.sz-label { display: block; font-size: 12px; color: var(--tx-secondary); margin-bottom: 4px; }\n.sz-textarea { width: 100%; min-height: 90px; padding: 8px; border: 1px solid var(--bd-input); border-radius: 6px; font-size: 12px; font-family: inherit; resize: vertical; outline: none; color: var(--tx-primary); background: var(--bg-input); }\n.sz-textarea:focus { border-color: var(--accent); }\n.sz-btn { display: inline-flex; align-items: center; gap: 4px; border: 1px solid var(--bd-input); background: var(--bg-input); border-radius: 6px; padding: 5px 12px; font-size: 12px; color: var(--tx-primary); cursor: pointer; white-space: nowrap; }\n.sz-btn:hover { background: var(--bg-hover); }\n.sz-btn.primary { background: var(--accent); border-color: var(--accent); color: #fff; }\n.sz-profile-empty { display: flex; flex-direction: column; align-items: center; margin-top: 18px; padding: 28px 22px; border: 1px solid var(--bd-panel); border-radius: 12px; background: var(--bg-panel); text-align: center; box-shadow: 0 1px 4px rgba(0,0,0,.06); }\n.sz-profile-empty-icon { display: inline-flex; align-items: center; justify-content: center; width: 42px; height: 42px; margin-bottom: 12px; border-radius: 13px; background: var(--bg-badge-on); color: var(--accent); }\n.sz-profile-empty-icon svg { width: 21px; height: 21px; }\n.sz-profile-empty-title { margin-bottom: 7px; color: var(--tx-primary); font-size: 14px; font-weight: 650; }\n.sz-profile-empty-desc { max-width: 320px; color: var(--tx-secondary); font-size: 12px; line-height: 1.75; }\n.sz-profile-empty-desc strong { color: var(--accent); font-weight: 650; }\n.sz-btn.danger { color: var(--tx-danger); }\n.sz-btn.danger:hover { background: var(--bg-del-hover); border-color: var(--bd-retry); }\n.sz-note { font-size: 11px; color: var(--tx-muted); line-height: 1.6; }\n.sz-priority-note span { display: block; margin-top: -2px; text-align: right; font-size: 9.5px; line-height: 1.4; opacity: .7; }\n.sz-accent { color: var(--accent); }\n.sz-project-footer { margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--bd-light); }\n.sz-project-meta { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; color: var(--tx-secondary); font-size: 12px; }\n.sz-project-meta span { display: inline-flex; align-items: center; gap: 6px; }\n.sz-project-meta strong { color: var(--tx-primary); font-weight: 600; }\n.sz-project-meta b { color: var(--accent); font-weight: 650; }\n.sz-doc-placeholder { color: var(--tx-muted); cursor: default; }\n.sz-issue-link { display: flex; align-items: center; gap: 9px; padding: 11px 12px; border: 1px solid var(--bd-panel); border-radius: 8px; background: var(--bg-panel); color: var(--tx-tertiary); text-decoration: none; font-size: 12px; line-height: 1.55; box-shadow: 0 1px 4px rgba(0,0,0,.08); transition: border-color .18s ease, box-shadow .18s ease, color .18s ease, background-color .45s ease-in-out; }\n.sz-issue-link > span:nth-child(2) { flex: 1; min-width: 0; }\n.sz-issue-link > svg { flex: none; color: var(--accent); }\n.sz-issue-link:hover { border-color: var(--accent-soft); color: var(--tx-primary); box-shadow: 0 3px 10px rgba(0,0,0,.1); }\n.sz-issue-link:focus-visible, .sz-star-project:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }\n.sz-issue-star { flex: none; font-size: 18px; line-height: 1; }\n.sz-star-project { display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 36px; margin: 10px 8px 0; padding: 6px 14px; border-radius: 8px; background: var(--accent); color: #fff; text-decoration: none; font-size: 13px; font-weight: 650; box-shadow: 0 3px 10px color-mix(in srgb, var(--accent) 20%, transparent); transition: transform .18s ease, box-shadow .18s ease, filter .18s ease, background-color .45s ease-in-out; }\n.sz-star-project:hover { transform: scale(1.02); filter: brightness(1.06); box-shadow: 0 8px 20px color-mix(in srgb, var(--accent) 36%, transparent), 0 0 12px color-mix(in srgb, var(--accent) 20%, transparent); }\n.sz-star-project:active { transform: scale(.99); box-shadow: 0 3px 10px color-mix(in srgb, var(--accent) 22%, transparent); }\n\n/* ---- \u5B58\u50A8\u7A7A\u95F4 ---- */\n.sz-storage-card { margin: 0 0 12px; border: 1px solid var(--bd-panel); border-radius: 8px; background: var(--bg-panel); box-shadow: 0 1px 4px rgba(0,0,0,.07); overflow: hidden; }\n.sz-storage-card-main { padding: 12px; }\n.sz-storage-card-head, .sz-storage-manager-head, .sz-storage-overview-top, .sz-storage-section-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }\n.sz-storage-card-head { margin-bottom: 12px; }\n.sz-storage-heading { display: inline-flex; align-items: center; gap: 9px; min-width: 0; color: var(--tx-primary); }\n.sz-storage-heading strong { font-size: 17px; font-weight: 700; letter-spacing: 0; }\n.sz-storage-icon { width: 34px; height: 34px; display: inline-flex; align-items: center; justify-content: center; flex: none; border-radius: 10px; color: var(--accent); background: var(--bg-badge-on); }\n.sz-storage-card .sz-storage-heading { gap: 8px; }\n.sz-storage-card .sz-storage-heading strong { font-size: 14px; font-weight: 650; }\n.sz-storage-card .sz-storage-icon { width: 28px; height: 28px; border-radius: 8px; }\n.sz-storage-card .sz-storage-icon svg { width: 15px; height: 15px; }\n.sz-storage-card-actions { display: inline-flex; align-items: center; gap: 5px; flex: none; }\n.sz-storage-status { display: inline-flex; align-items: center; gap: 4px; padding: 6px 9px; border-radius: 999px; font-size: 12px; line-height: 1; font-weight: 650; white-space: nowrap; }\n.sz-storage-status svg { width: 14px; height: 14px; }\n.sz-storage-card .sz-storage-status { padding: 5px 7px; font-size: 11px; }\n.sz-storage-card .sz-storage-status svg { width: 12px; height: 12px; }\n.sz-storage-status.normal { color: #4f8f4c; background: #edf6ee; }\n.sz-storage-status.warning { color: #a16207; background: #fef3c7; }\n.sz-storage-status.critical { color: #b91c1c; background: #fee2e2; }\n.dark .sz-storage-status.normal { color: #9bcf9b; background: #1a3a2a; }\n.dark .sz-storage-status.warning { color: #facc15; background: #4a3511; }\n.dark .sz-storage-status.critical { color: #fca5a5; background: #4b2020; }\n.sz-storage-row { display: flex; align-items: baseline; gap: 8px; min-width: 0; }\n.sz-storage-row-label { flex: 1; min-width: 0; color: var(--tx-secondary); font-size: 12px; font-weight: 650; }\n.sz-storage-row strong { color: var(--tx-primary); font-size: 17px; font-weight: 700; letter-spacing: 0; white-space: nowrap; }\n.sz-storage-percent { color: var(--tx-secondary); font-size: 12px; font-weight: 650; white-space: nowrap; }\n.sz-storage-card .sz-storage-row-label { font-size: 11px; }\n.sz-storage-card .sz-storage-row strong { font-size: 14px; font-weight: 650; }\n.sz-storage-card .sz-storage-percent { font-size: 11px; }\n.sz-storage-progress { height: 7px; margin-top: 8px; overflow: hidden; border-radius: 999px; background: var(--bg-badge); }\n.sz-storage-progress > i { display: block; height: 100%; min-width: 2px; border-radius: inherit; background: var(--accent); transition: width .25s ease, background-color .25s ease; }\n.sz-storage-card .sz-storage-progress { height: 6px; margin-top: 6px; }\n.sz-storage-progress > i.warning { background: #d97706; }\n.sz-storage-progress > i.critical { background: #dc2626; }\n.sz-storage-origin { margin-top: 7px; color: var(--tx-muted); font-size: 10px; line-height: 1.5; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n.sz-storage-card-foot { display: flex; align-items: center; justify-content: flex-end; padding: 8px 12px; border-top: 1px solid var(--bd-light); background: color-mix(in srgb, var(--bg-card) 70%, transparent); }\n.sz-storage-card-foot .sz-btn { min-height: 30px; padding: 4px 11px; font-size: 12px; font-weight: 650; box-shadow: 0 1px 3px rgba(0,0,0,.08); }\n.sz-setting-card { margin: 0 0 12px; padding: 12px; border: 1px solid var(--bd-panel); border-radius: 8px; background: var(--bg-panel); box-shadow: 0 1px 4px rgba(0,0,0,.07); }\n.sz-setting-card.sz-field { margin-bottom: 12px; }\n.sz-setting-card .sz-label { margin-bottom: 8px; color: var(--tx-secondary); font-size: 11px; font-weight: 650; }\n.sz-setting-card .sz-textarea { min-height: 82px; }\n.sz-setting-card .sz-btn { min-height: 30px; padding: 4px 11px; font-size: 12px; }\n.sz-setting-card .sz-btn.primary { min-height: 30px; }\n.sz-setting-card.sz-project-footer { margin-top: 0; padding-top: 12px; }\n.sz-card-heading { display: flex; align-items: center; gap: 8px; min-width: 0; color: var(--tx-primary); }\n.sz-card-heading strong { font-size: 14px; font-weight: 650; }\n.sz-card-icon { width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center; flex: none; border-radius: 8px; color: var(--accent); background: var(--bg-badge-on); }\n.sz-card-icon svg { width: 15px; height: 15px; display: block; }\n.sz-card-icon .sz-icon-brand { transform: translate(1px, 1px); }\n.sz-setting-card > .sz-card-heading { margin-bottom: 6px; }\n.sz-project-footer > .sz-card-heading { margin-bottom: 8px; }\n.sz-setting-card .sz-todo-item:first-child { padding-top: 2px; }\n.sz-setting-card .sz-todo-item:last-child { border-bottom: none; padding-bottom: 2px; }\n.sz-switch-card .sz-switch-desc { padding-left: 36px; }\n.sz-setting-card .sz-issue-link { border: 0; border-radius: 6px; background: var(--bg-card); box-shadow: none; }\n.sz-setting-card .sz-issue-link:hover { border-color: transparent; box-shadow: none; }\n.sz-switch-card { display: flex; align-items: center; gap: 12px; }\n.sz-switch-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }\n.sz-switch-title { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 650; color: var(--tx-primary); }\n.sz-switch-title svg { flex: none; }\n.sz-switch-desc { font-size: 12px; color: var(--tx-secondary); line-height: 1.5; }\n.sz-switch { flex: none; width: 40px; height: 24px; border-radius: 999px; border: none; padding: 2px; cursor: pointer; background: var(--bd-panel); transition: background .3s cubic-bezier(.4, 0, .2, 1); }\n.sz-switch.on { background: var(--accent); }\n.sz-switch-knob { display: block; width: 20px; height: 20px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.25); transition: transform .3s cubic-bezier(.34, 1.4, .64, 1); }\n.sz-switch.on .sz-switch-knob { transform: translateX(16px); }\n.sz-storage-manager-open .sz-head, .sz-storage-manager-open .sz-tabs, .sz-storage-manager-open .sz-rec-toolbar, .sz-storage-manager-open .sz-rectools, .sz-storage-manager-open .sz-foot, .sz-storage-manager-open .sz-resize { display: none; }\n.sz-storage-manager-open .sz-body { padding: 0; }\n.sz-storage-manager { min-height: 100%; background: var(--bg-panel); color: var(--tx-primary); }\n.sz-storage-manager-head { min-height: 58px; padding: 11px 14px; border-bottom: 1px solid var(--bd-light); }\n.sz-storage-manager-content { padding: 14px; }\n.sz-storage-overview { padding: 14px; border: 1px solid var(--bd-panel); border-radius: 10px; background: var(--bg-card); box-shadow: 0 2px 7px rgba(0,0,0,.07); }\n.sz-storage-overview-top { margin-bottom: 18px; }\n.sz-storage-limit, .sz-storage-breakdown { margin-top: 18px; }\n.sz-storage-section-head { margin-bottom: 9px; }\n.sz-storage-section-head strong { color: var(--tx-secondary); font-size: 13px; font-weight: 750; letter-spacing: .06em; text-transform: uppercase; }\n.sz-storage-section-head span { color: var(--tx-secondary); font-size: 12px; }\n.sz-storage-segmented { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 3px; padding: 4px; border-radius: 10px; background: var(--bg-card); }\n.sz-storage-segmented button { min-height: 36px; border: 0; border-radius: 8px; background: transparent; color: var(--tx-secondary); cursor: pointer; font-size: 13px; font-weight: 700; }\n.sz-storage-segmented button:hover { color: var(--tx-primary); background: var(--bg-hover); }\n.sz-storage-segmented button.selected { color: var(--tx-primary); background: var(--bg-panel); box-shadow: 0 1px 4px rgba(0,0,0,.14); }\n.sz-storage-note { margin: 8px 0 0; color: var(--tx-muted); font-size: 10px; line-height: 1.55; }\n.sz-storage-detail-list { border: 1px solid var(--bd-panel); border-radius: 10px; background: var(--bg-panel); overflow: hidden; box-shadow: 0 2px 7px rgba(0,0,0,.06); }\n.sz-storage-detail-row { display: flex; align-items: center; gap: 8px; min-height: 42px; padding: 8px 12px; border-bottom: 1px solid var(--bd-light); }\n.sz-storage-detail-row:last-child { border-bottom: 0; }\n.sz-storage-detail-name { flex: 1; min-width: 0; color: var(--tx-primary); font-size: 12px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n.sz-storage-detail-size { flex: none; color: var(--tx-secondary); font-size: 12px; font-weight: 650; white-space: nowrap; }\n.sz-storage-link { flex: none; padding: 3px 4px; border: 0; border-radius: 4px; background: transparent; color: var(--accent); cursor: pointer; font-size: 11px; font-weight: 650; }\n.sz-storage-link:hover { background: var(--bg-badge-on); }\n.sz-storage-link.danger { color: var(--tx-danger); }\n.sz-storage-link.danger:hover { background: var(--bg-del-hover); }\n\n/* ---- \u8BB0\u5F55\u8865\u5145\uFF1A\u5173\u952E\u8BCD / \u641C\u7D22\u9AD8\u4EAE ---- */\n.sz-kw { display: inline-block; font-size: 11px; color: var(--tx-secondary); background: var(--bg-badge); border-radius: 4px; padding: 1px 6px; margin: 6px 4px 0 0; }\n.sz-hl { background: #fde68a; color: #92400e; padding: 0 1px; border-radius: 2px; }\n.sz-rlink { display: inline-flex; align-items: center; gap: 3px; color: var(--accent); font-size: 12px; text-decoration: none; cursor: pointer; background: none; border: none; padding: 0; }\n.sz-rlink:hover { text-decoration: underline; }\n';

  // src/panel/panel.html
  var panel_default2 = '<div class="sz-dock">\n<div class="sz-toasts"></div>\n<button class="sz-fab" data-act="fab" title="\u62FE\u77E5">{{logo}}</button>\n<span class="sz-pending" data-role="pending">\u5206\u6790\u4E2D</span>\n<div class="sz-todo">\n  <button class="sz-todo-bar" data-act="todo-bar" title="\u5F85\u529E\u5EFA\u8BAE">\n    <span class="sz-dot"></span>\n    <span class="txt" data-role="todo-txt">\u5F85\u529E</span>\n  </button>\n  <div class="sz-todo-pop" data-role="todo-pop">\n    <div class="sz-todo-head"><span class="sz-todo-title">\u5F85\u529E\u5EFA\u8BAE</span><span class="sz-count" data-role="todo-count"></span><button class="sz-ibtn" data-act="todo-close" title="\u5173\u95ED">{{close}}</button></div>\n    <div class="sz-todo-list" data-role="todo-list"></div>\n  </div>\n</div>\n<div class="sz-panel">\n  <div class="sz-resize" data-role="resize" title="\u62D6\u62FD\u8C03\u6574\u5927\u5C0F \xB7 \u53CC\u51FB\u6062\u590D\u9ED8\u8BA4"><svg viewBox="0 0 10 10" width="10" height="10" fill="none"><path d="M1 9 9 1M4 9 9 4M7 9 9 7" stroke="#d1d5db" stroke-width="1.2" stroke-linecap="round"/></svg></div>\n  <div class="sz-head">\n    <span class="sz-title">\u62FE\u77E5</span>\n    <div class="sz-mode-switch" role="group" aria-label="\u6D4F\u89C8\u6A21\u5F0F">\n      <button class="sz-mode-option" data-act="panel-mode" data-mode="work" aria-pressed="true">\u5DE5\u4F5C\u6A21\u5F0F</button>\n      <button class="sz-mode-option" data-act="panel-mode" data-mode="slacking" aria-pressed="false">\u6478\u9C7C\u6A21\u5F0F</button>\n    </div>\n    <div class="sz-export-wrap">\n      <button class="sz-ibtn" data-act="export" title="\u5BFC\u51FA\u8BB0\u5F55">{{download}}</button>\n      <div class="sz-pop" data-role="export-pop" style="display:none"></div>\n    </div>\n    <div class="sz-theme-color-wrap">\n      <button class="sz-theme-color-btn" data-act="theme-color" title="\u66F4\u6539\u4E3B\u9898\u8272" aria-label="\u66F4\u6539\u4E3B\u9898\u8272">{{palette}}</button>\n      <div class="sz-theme-color-pop" data-role="theme-color-pop" aria-label="\u4E3B\u9898\u8272\u9009\u62E9">\n        <div class="sz-theme-color-head"><strong>\u4E3B\u9898\u8272</strong><span data-role="theme-color-label">\u62B9\u8336\u7EFF</span></div>\n        <div class="sz-theme-color-swatches">\n          <button class="sz-theme-swatch" data-act="set-theme-color" data-color="#5f8f55" style="--swatch:#5f8f55" title="\u62B9\u8336\u7EFF"></button>\n          <button class="sz-theme-swatch" data-act="set-theme-color" data-color="#3b82f6" style="--swatch:#3b82f6" title="\u6674\u7A7A\u84DD"></button>\n          <button class="sz-theme-swatch" data-act="set-theme-color" data-color="#8b5cf6" style="--swatch:#8b5cf6" title="\u96FE\u7D2B"></button>\n          <button class="sz-theme-swatch" data-act="set-theme-color" data-color="#e76f51" style="--swatch:#e76f51" title="\u73CA\u745A\u6A59"></button>\n          <button class="sz-theme-swatch" data-act="set-theme-color" data-color="#d97706" style="--swatch:#d97706" title="\u6696\u7425\u73C0"></button>\n          <button class="sz-theme-swatch" data-act="set-theme-color" data-color="#64748b" style="--swatch:#64748b" title="\u77F3\u58A8\u7070"></button>\n          <label class="sz-theme-swatch sz-theme-custom" title="\u81EA\u5B9A\u4E49\u989C\u8272">\n            <input type="color" data-role="theme-color-input" value="#5f8f55" aria-label="\u81EA\u5B9A\u4E49\u4E3B\u9898\u8272">\n          </label>\n        </div>\n        <div class="sz-theme-color-foot"><span data-role="theme-color-hex">#5F8F55</span><button class="sz-theme-reset" data-act="reset-theme-color">\u6062\u590D\u9ED8\u8BA4</button></div>\n      </div>\n    </div>\n    <button class="sz-theme-btn" data-act="theme" title="\u5207\u6362\u4E3B\u9898"></button>\n    <button class="sz-ibtn" data-act="close" title="\u5173\u95ED">{{close}}</button>\n  </div>\n  <div class="sz-tabs">\n    <button class="sz-tab act" data-act="tab" data-tab="goals">\u76EE\u6807</button>\n    <button class="sz-tab" data-act="tab" data-tab="records">\u8BB0\u5F55</button>\n    <button class="sz-tab" data-act="tab" data-tab="profile">\u753B\u50CF</button>\n    <button class="sz-tab" data-act="tab" data-tab="settings">\u8BBE\u7F6E</button>\n  </div>\n  <div class="sz-rec-toolbar" data-role="rec-toolbar">\n    <div class="sz-sort-tabs">\n      <button class="sz-sort-tab act" data-act="rec-sort" data-sort="time" title="\u6309\u65F6\u95F4\u6392\u5E8F">\u65F6\u95F4 \u2193</button>\n      <button class="sz-sort-tab" data-act="rec-sort" data-sort="rel" title="\u6309\u76F8\u5173\u6027\u6392\u5E8F">\u76F8\u5173\u6027 \u2193</button>\n    </div>\n  </div>\n  <div class="sz-rectools">\n    <input class="sz-input" data-role="rec-search" placeholder="\u641C\u7D22\u76EE\u6807\u5206\u7EC4\u5185\u7684\u8BB0\u5F55" maxlength="50" aria-label="\u641C\u7D22\u5F53\u524D\u76EE\u6807\u5206\u7EC4\u8BB0\u5F55">\n  </div>\n  <div class="sz-body"></div>\n  <div class="sz-foot">\n    <input class="sz-input" data-role="linked-url" placeholder="\u7AD9\u70B9\u540D\u6216\u7F51\u5740\uFF0C\u2726 \u914D\u597D\u76F4\u8FBE" aria-label="\u5173\u8054\u7F51\u5740">\n    <button class="sz-ibtn sz-accent" data-act="ai-linked" title="AI \u8865\u5168\u641C\u7D22\u53C2\u6570" style="font-size:14px;line-height:1">\u2726</button>\n  </div>\n</div>\n<div class="sz-ctxmenu" data-role="ctxmenu"></div>\n</div>\n';

  // src/panel/fab-logo.jpg
  var fab_logo_default = "data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAIAAABt+uBvAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAAGYktHRAD/AP8A/6C9p5MAAAAHdElNRQfqCBkJNy28YwZeAAAR6klEQVR42u2ce3BVdX7Av9/f7zzu+948ICS8EhAwICACIrAqgqDouLP4qGLXjjNt7eh2um6n05nuTqudduq0M+5u67Tddme71XW6VXd1HV/4QkYbEcFH5B0CJgQCMYSQ5L7P+f2+/eN3zrnnBvCSmwTC7v3OJHNzOefc8/vc7+/7PqCUEipyfmHjdF281Asbo1XgeAGiS722MVoFjReg3xqpACohFUAl5GIDuuyM95gBusCVX3bGe8wAXXYrv0Cp2KASUgFUQiqASkgFUAmpACohFUAl5Hca0IXEbr/TgL4+dlP4xg/QZZdUDBeFb/wA/ZaE1tqlvoExEyLvK1EvHBVGHJUuX66AiIiAgAgQGSAy9jUgiIhIEhEyhiPc+5cZICIiIkRkrMg4WHY+k0tl82nbzgtpAwHnnHPd1IMBIxQwQsi4cwUpYSQ6dXkAUlwYYx6XofSZk31Hu3uP9PQd6x/sGUr3Z3Ipy84JKYAIEBgyRKZrhqEHw8FYIlpbVzN99aLbQ4EokbxwH4ITvO2j0HDufP/dvV8e7PzsyLE93ac6kukzUtoEwBlnjHPGERkUGx0CklJKKYhkzs4+uvlHM6fMk1LgBXcrJq4GEREQMc4BYCDZt7t9++72D7t7j2RzacY0XTMCZlApgjJGBABEAOi9QAQE5EzTuM4QGePZXGqktzEhARFJV2tOnOrYvnvLnvbtg6l+XdMNLRAOxgiU1ZVASl8IAMHzYs4Lx60hAhERMltYuXxW/fuFW6EJB0iS5IxzgJ7TXe/tenFP+4d5K6vsiLvhJEHBlRMRIAARIiIyIkmkVj8sEEMAFCSclxcsEwoQERFnPJvPvPvxcx/t3pLNZ4JmOBSMSimJpLM2QqUDqJQEnT8lScvK6FqAufaFqBAMeR8x0nuaKICU4iDC3iM7Xnn/56fOHA+aEeVxpHLMhTjQMcPKzBARAAphh4PRuTOWHD3ZlsklNa4TASI5uubwIc40KHrnMgEkpeBcs4X1yvs/2757i8b1cDAuSUgpHBwF++LTgULsTJxp99/6F00NzW2drc+8/oT3L0hAqOwTIaKhBwAuty2m6PSc7vrlmz883nM4FIwRkUIDakuoH4RCEOwzv4gohB0OxafXzQGA6VOuMPVg3soiY0pTUCEh4lwLBaIj5HOpARFJzrW9Rz5+/q1/zltZpTj+A9ClBI4ueOYZHXJEnOtDqf7fbPuP5fNvbml9NZ0dMvQAgfQQK2tl6MFIMF646oXJpQwUVXDc0vr6y9t+augm55qUAtELZArL890vui6qyLUjYt7KSSkY56YeIN/pQIAMhbATsUnfvfdJQzdHFEmPQoOIJJDnX8s4nzH27s4X3mj5RSgQRURFxwPht8q+kwCwsHX8R5hGUNlsx9+5NwkACEwIqyo6aaR0RgUImZv/ASirgcgusLagdOftHc+9uf3ZcDBOQETSO9erU5Ab0nifieg7QL0iAEfpZAEpghddKxHSnpSYCgBSSt+Njw8gRLRt6/l3njJ0s7Fh/oy6OZOrp3GuAYAQAhG/HpPy6Nt2vbjlw2cjobj7hePZQYrrxQtovNAGPfvtflbRZiy6EgIAIptWd0UZiy1Tgwjo2FeHTp46umP3WwEzPHVSU/Os5QuvWFUdm/z1mJTP2rn3nddang4HY5IkOMa3yOgU4pdz7TX0rRvOE9Z48QAiEEnTCE2bPLtAelwBEZGuGZFgImj26ZoppN1xYn/7sd3v7fx186zl1y/5ZkNtIwAIYQ9TZkmSc+3Isb0vbfvPoBlRF0NEBCxELv4kCqAQNHurLUKF4NuGHqlCLgKIgHk7N6W2cVJiKhGN1FyWCQgRo+GEJSxNMwDR0IOmgULau/a++0Vby5Ir12y47r5YuEpKAeCokkojevu7f/7K32ezSdMMca5rXCMg8nnSQiRYqKB6yaXKu/yxsS9sBBdtkYoQMGbZ+aaG+YwxIcSwSltJ4Y899lgZgBhjPX3HDnft1nXTXZIXqmLH8X2fH/wgHIxNnTwbEZUBRgBEzORSk6um1dfORGTp7GAqM0BAumZAIdDxmWCfU0MABPW7yFzhWS/8rBEQESXJ9SvurU3Uq692RIstz0gDADQ2XKkqEv4FEUlECIdiWSv9v2/9+PDx3Xev/Q7nmtpuRFSbmFKbmKIOPz3Qc6Dj088Obus4cdDUTc51SeLcPvisCoW3EwkRfI7Px46AEAAs26qJ1zc2NAMAG3kBv5y2j9rGjfXNNYkG27Y8767cCwFIKTnXIqHYx3ve+bdf/VUyPaCCQBWXCimEFESyOl63avHG79zzj/etfzRoRvNWliF3Vu9XnUI07SdWVP0h9wBn9xEBAQIwxnP57NyZS0w9IIQYUTW6fEAAIIQwdHPRFavydpa5hU7Htrrfr5QyGk509bT/+69/MJDs8wJlhowhc2AJm4CWzl/z8N3/UJuYatk5ppBQARM6e8tZP/nLh+67/p1J/gYQSV0zrp57PUAZcEYBiDEEgJULb42Fq21hnS82FVKEzMip/uM//c3j6WySc+4PcxGdYNO2rer45Afv+L6ph4STwYODyScuFfcHHYtesFQuUnSvn8tnZ9bPa6yfV4b/GhUgABRCxCLVa5bemc2nGTIicr9g3wYgENIOBiK9/cd+8fo/AYCziYpF1Tpq4nVrlm7KW1lE5tso4F64sM3QIVhw6udMSwBQSHv5gpsBwCsPXDRAwBgjouuX3NHcuCyZHlC1KFVpd+C40Z6UImhGDx39/LWWpwFB0jnSYwVu8dzV4UCssBj08Li8h6sq+j/J/z4is+x8XfXMxXNWq7u92IDAVZT7bvlefW1TOjvEGC+ou5cKIRCRkHY4GHv/05fbj+3mjJ/NSFXF4pHa6nid2rPnUQpyfb1zmg+l7xOBEFnezl236BZdM4Swyx6mGBUgRBRChAKRP970eEPtrFRm0G1OeWlAIX1SN/1ay9NExM+10SQRIkZCVUIKdBm7q1dRkNpb7o+ThXgm3CuuESLLW9nJVdNWLFgPAFiu+owWEACo8DQaTjxyzxNL5t2YTA/YwuKMI0MnHVO/CUhKUw92nWjbtX8rIJyrDkUAwJGTG/W4pswtmBVrTFHcTK6NIodZ3sqtWbrJ0E0h7JH248cSkGIkpdB14/5b/3zzhu9FQ1XJzIAQNiJXIZITaiMSSU3TW754XUrJGR+edCMCQCaXVNbNe8dj5Ll6zywp9AU7RUQADDGbS82adtWKq9YT0YiKG+MCCAAQmZRSSrl0/k2P3v/D21b9QSxck8km83YOARkw15iSqQe7vzpyqKsVEGSRmSFEZtlWKjvIGffnq0Te6olUeKziQLcE4l7AOwqQsY2rvg1wbodwCQCBSkkRhbCDZnjttXc/uvnJe27+0+mT52Rz6ZyVYcjRsUVIJPce2eFfmre6wWTfYKqfM80tdDiUfDvEM0xKbcirq6jfnGup7NCqRRtnTZ0vhM1G/cTgGBftVcIlpTCN4PIF65YvWNfW+fm2T15q7/rCNFVJVOqacfRkm5SCM+7l7urFyb7OdHYwaEYkSZ+F9lfJiqG6KqaOZIzl87n62saNqx4AgNHTgXEawVOYhBBENHfm1Q/d+bd3rX0YCISwEZEzbSB56kzylNM4dgkBwKGuVifUHj4uRoCABEXK5Bhq8nIN9cfd6x4xdLO8zOsiAQLXw0gpLDtvC2vFwg0P3vEDnRtCCoY8l88Mpvr96+ec561c29FWXQtIr8tcAAH+7AycIpObiyAAAUeeyg5tWLm5qaFZCLvsyHDcARFJIskY45xzrumaoXEdAGZPW3DX2kdskVfuzLYt7xQpCQDau1r7+rs1rqtOia/kOpz7MK9NBJxpyczANfNuXLvszpGW5b9extIGKSfDmZroOd154sDJvs50NhkNJxbPWV2baFg4Z+WCQyv2HP5I1wzDML0T1VbYsfcdp93uvOm6dVTFOHDQ+DcaIhBxpqWzyWmT59y74c/GcDljDEhKqepnx7463NL62sGOT4dS/ZKk6kxs3fnCtzf+ZXPTsiXzbvjiUItphOLhWgBAQCLJGO880dbW+VnADPn7VgXjXNzoKRT2nYpPJhapffCb39c1o4yi6sUAJElyzjO59BsfPvPJvq2WnTf0QDAQUQ1iBiyVGdyy/dnmpmUNtU2apk9KNMQj1eQb29j2yYtC2gaaqhdWqPe4RcLhsx2KDnLLzgXM8B99668TkZqz2wQTAhCR5Ix/2b3v+bef6u0/HgpENc2QJAmk6o/bIE0zeGaobyB5OhyMAWBz03IAkETg9OZ37j38UTAQKYrrho28UCGaVkkX5zyXz5pG6KFNj0+pmTEedMYAkOoCfnpg26/e/VcAiITiUgo10YOAKupFt3nDkOXymXi0Zsm8GxQBxjTLzr3x4TOc61QcWDsdDC9CVphc5eJcy2RTsXD1H37rb8aPDozSiyk6u/Zv/eWbP2KM65ophO2lmuB1+JDZwoqFqqPhROfJtmvm3RgLVwkh1Mpf/eC/e/qOGobqmvuqgoi+EaiiyiHnWjI9WF/b+Mg9T4wrHRiNBqke6YGOT59/6ynTCKnpA/DWQQU8iGhLq3nWUgDIWZmVC28DAAKpcf2TA9s+2vNmKBCVQnj+C3zhc7FSATJEgsHUmcVzVm++5VFDD4wfHfXp5baeiTjXziRPPf/2v3CmIZzdICZvBkNIOxKsWrXodklyzvTF0VDcsi1d0ztPHHxp608M3fTceMFneVfzQVIOi4huW/3Azdf+HgAIIcZPd5SUCUgpx4tbfzKU6g+aEUmi0KApIAIC4lwbTA7eue6BeKRaShGPVNu2pWt6z+mup199gkhyNIgcd0buYNSwOoiqeacyA1NqGjfd9NDsaVepMZex9ejDhMoGpEzPZwc/2Hfk43AgKmQhcvHFvUhAGtMGk/3XXnXzNxbfTlIqY6Rp+olTHf/18t9lcyldN6WUxQ1UULGhukWGDAEzubSmaTctu2vDdZtVCZW5c/XjLeUA4oxbtrV15wu6ZtKw6UEvc0LgyIfSZxbNWXXv+u8CgARCAo3rh462/s+WJ3NWRtdNKYWa7sGi3qm6IjLEbD4jhZg7c8mtK39/Wt1sONdMxPgJlgFIRcyf7H+vu/fLSDAupDg7Z0ZkQliZfHLV4tvuWvswAFh2XjXgW1pfe/3/nmaMGXpAyMLGJCC3TI+qopi3skKKGXVz1yy786rZKxQaRHbR6EB5RpozTgA7972ta4Yk6Wt5Kr/MiGQqMxgNV2266U+WNa9V3VRdMwaSp1/54Ge721sCRlgdNlzvkCGAlCKdTTPkM+uvXLV4o2raSCkBRls8LU9GBohIIuPtXV8c++qwqQdV3uSU8xBtYeWtlGmErlt4y/oV98UjNSqxJqKP9rz5zo7nhtL9ITMq1WMW4O9WoCSZz2dsYUVCiWtmrVg2f90V0xeCGu4jydxOyYQHBAAAe9q3SykYY2p2SUqRt7K2bcXCVUvm3bBy4capk2d5p7Qeann/s5c7uw8GzKBKJhAR3QDVFrYt8kLYphGaWX/lgtkrFs6+rio2WX0Zksht5F8yGRkgzrgt7I4T+znjuXzGFhYCRsLxmQ1XzptxzdVzvxENV6kj+wd793fs3LXvveO9hzWuxyJVkqR6LlJIYQtLSsGQR0KJKTXNc2Ysnjvj6vramepcd8CelTGtcikBEUlEfqL3y97+49FwdSJS2zCpqbG+eda0BfFIDQDkrVxH94HOk23tXa0dJ/YPpc5oXNN1wxaWlckjIGfc0APxaE1NvL5+UtOMurlTJzXFItXe9aWUiOzi+O8LlBEMkqvBssFU/5mh3upYXSSkptbh9GBvR/eBntOdx3sO9w325K0cZ8zUg4YR1DXDNELRUDwaSiSik6rjdYlIbTxS7TwzAQAAUkqiQnNioslIJ+0LQyTeI21C2pIkkERk3nORqmN3vkjXebzJbbxeaghjCUitndA3QXC+FbpjTtIb8/D1ryY0FGdd7mzKmD6r4QTEZ89YjtkdX2QZ66d9CrX1sZdL8p9dTCB/MTGlAqiEVACVkAqgElIBVEIqgEpIBVAJqQAqIRVAJaQCqIRUAJWQCqASUgFUQiqASkgFUAmpACohFUAlpAKohPw/3PBE/4eWPgsAAAAldEVYdGRhdGU6Y3JlYXRlADIwMjYtMDgtMjVUMDk6NTU6MzkrMDA6MDDSVUP4AAAAJXRFWHRkYXRlOm1vZGlmeQAyMDI2LTA4LTI1VDA5OjU1OjM5KzAwOjAwowj7RAAAACh0RVh0ZGF0ZTp0aW1lc3RhbXAAMjAyNi0wOC0yNVQwOTo1NTo0NSswMDowMDl4ufYAAAAASUVORK5CYII=";

  // src/panel/icons.ts
  var DEEPSEEK_PATH = "M23.748 4.482c-.254-.124-.364.113-.512.234-.051.039-.094.09-.137.136-.372.397-.806.657-1.373.626-.829-.046-1.537.214-2.163.848-.133-.782-.575-1.248-1.247-1.548-.352-.156-.708-.311-.955-.65-.172-.241-.219-.51-.305-.774-.055-.16-.11-.323-.293-.35-.2-.031-.278.136-.356.276-.313.572-.434 1.202-.422 1.84.027 1.436.633 2.58 1.838 3.393.137.093.172.187.129.323-.082.28-.18.552-.266.833-.055.179-.137.217-.329.14a5.526 5.526 0 0 1-1.736-1.18c-.857-.828-1.631-1.742-2.597-2.458a11.365 11.365 0 0 0-.689-.471c-.985-.957.13-1.743.388-1.836.27-.098.093-.432-.779-.428-.872.004-1.67.295-2.687.684a3.055 3.055 0 0 1-.465.137 9.597 9.597 0 0 0-2.883-.102c-1.885.21-3.39 1.102-4.497 2.623C.082 8.606-.231 10.684.152 12.85c.403 2.284 1.569 4.175 3.36 5.653 1.858 1.533 3.997 2.284 6.438 2.14 1.482-.085 3.133-.284 4.994-1.86.47.234.962.327 1.78.397.63.059 1.236-.03 1.705-.128.735-.156.684-.837.419-.961-2.155-1.004-1.682-.595-2.113-.926 1.096-1.296 2.746-2.642 3.392-7.003.05-.347.007-.565 0-.845-.004-.17.035-.237.23-.256a4.173 4.173 0 0 0 1.545-.475c1.396-.763 1.96-2.015 2.093-3.517.02-.23-.004-.467-.247-.588zM11.581 18c-2.089-1.642-3.102-2.183-3.52-2.16-.392.024-.321.471-.235.763.09.288.207.486.371.739.114.167.192.416-.113.603-.673.416-1.842-.14-1.897-.167-1.361-.802-2.5-1.86-3.301-3.307-.774-1.393-1.224-2.887-1.298-4.482-.02-.386.093-.522.477-.592a4.696 4.696 0 0 1 1.529-.039c2.132.312 3.946 1.265 5.468 2.774.868.86 1.525 1.887 2.202 2.891.72 1.066 1.494 2.082 2.48 2.914.348.292.625.514.891.677-.802.09-2.14.11-3.054-.614zm1-6.44a.306.306 0 0 1 .415-.287.302.302 0 0 1 .2.288.306.306 0 0 1-.31.307.303.303 0 0 1-.304-.308zm3.11 1.596c-.2.081-.399.151-.59.16a1.245 1.245 0 0 1-.798-.254c-.274-.23-.47-.358-.552-.758a1.73 1.73 0 0 1 .016-.588c.07-.327-.008-.537-.239-.727-.187-.156-.426-.199-.688-.199a.559.559 0 0 1-.254-.078c-.11-.054-.2-.19-.114-.358.028-.054.16-.186.192-.21.356-.202.767-.136 1.146.016.352.144.618.408 1.001.782.391.451.462.576.685.914.176.265.336.537.445.848.067.195-.019.354-.25.452z";
  var ICONS = {
    // ---- 线性图标（stroke 风格） ----
    bulb: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.4 1 2.3h6c0-.9.4-1.8 1-2.3A7 7 0 0 0 12 2z"/></svg>',
    database: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7"/></svg>',
    refresh: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8.1 8.1 0 0 0-14.8-3L3 11"/><path d="M3 4v7h7"/><path d="M4 13a8.1 8.1 0 0 0 14.8 3L21 13"/><path d="M21 20v-7h-7"/></svg>',
    statusCheck: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></svg>',
    statusAlert: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.7 2.5 17.2A2 2 0 0 0 4.2 20h15.6a2 2 0 0 0 1.7-2.8L13.7 3.7a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></svg>',
    x: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    plus: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    trash: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
    check: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    back: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>',
    sun: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    moon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
    edit: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
    target: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
    drag: '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>',
    download: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>',
    copy: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>',
    github: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3.3-.4 6.8-1.6 6.8-7A5.4 5.4 0 0 0 19.4 4 5 5 0 0 0 19.3.5S18.2.1 15 1.8a13.4 13.4 0 0 0-6 0C5.8.1 4.7.5 4.7.5A5 5 0 0 0 4.6 4a5.4 5.4 0 0 0-1.4 3.7c0 5.4 3.5 6.6 6.8 7A4.8 4.8 0 0 0 9 18v4"/><path d="M9 18c-4.5 2-5-2-7-2"/></svg>',
    globe: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 0 20M12 2a15.3 15.3 0 0 0 0 20"/></svg>',
    ext: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>',
    sparkle: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/></svg>',
    palette: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a9 9 0 1 0 0 18h1.2a1.8 1.8 0 0 0 1.2-3.1 1.8 1.8 0 0 1 1.2-3.1H18A3 3 0 0 0 21 12a9 9 0 0 0-9-9Z"/><circle cx="7.5" cy="11" r=".8" fill="currentColor"/><circle cx="9.5" cy="7.5" r=".8" fill="currentColor"/><circle cx="14" cy="7" r=".8" fill="currentColor"/><circle cx="17" cy="10" r=".8" fill="currentColor"/></svg>',
    fish: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5.5 12c1.8-3.2 5-5 8.5-5 3.6 0 6.3 2.2 7.5 5-1.2 2.8-3.9 5-7.5 5-3.5 0-6.7-1.8-8.5-5Z"/><path d="M5.5 12 2 9.4c.7 1.6.7 3.6 0 5.2L5.5 12Z"/><circle cx="16.3" cy="10.8" r=".4" fill="currentColor" stroke="none"/></svg>',
    fingerprint: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"/><path d="M14 13.12c0 2.38 0 6.38-1 8.88"/><path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/><path d="M2 12a10 10 0 0 1 18-6"/><path d="M2 16h.01"/><path d="M21.8 16c.2-2 .131-5.354 0-6"/><path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2"/><path d="M8.65 22c.21-.66.45-1.32.57-2"/><path d="M9 6.8a6 6 0 0 1 9 5.2v2"/></svg>',
    heart: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>',
    // ---- 品牌图标（官方填充路径） ----
    deepseek: `<svg class="sz-icon-brand" viewBox="0 0 28 28" width="16" height="16" fill="currentColor"><path d="${DEEPSEEK_PATH}"/></svg>`
  };

  // src/core/utils.ts
  function fnv1a(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(36);
  }
  function clamp(n, lo, hi) {
    return Math.min(hi, Math.max(lo, n));
  }
  function truncate(s, n) {
    const str = String(s == null ? "" : s);
    return str.length > n ? str.slice(0, n) : str;
  }
  function esc(s) {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => map[c]);
  }
  function uid(prefix) {
    return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }
  function backoffMs(retries) {
    return [5e3, 15e3, 6e4][clamp(retries, 1, 3) - 1];
  }
  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }
  function parseJsonLoose(raw) {
    if (raw && typeof raw === "object") return raw;
    let s = String(raw == null ? "" : raw).trim();
    s = s.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    const a = s.indexOf("{");
    const b = s.lastIndexOf("}");
    if (a >= 0 && b > a) s = s.slice(a, b + 1);
    return JSON.parse(s);
  }
  function normalizeSearchTerm(term) {
    if (typeof term === "string") {
      const s = term.trim();
      return { display: s, query: s };
    }
    const display = String(term.display || "").trim();
    const query = String(term.query || "").trim();
    return { display: display || query, query: query || display };
  }
  function enrichSearchTerm(term) {
    const display = (term.display || "").trim();
    const query = (term.query || "").trim();
    const fallback = display || query;
    if (query && (/[\"']/.test(query) || /\b(AND|OR|NOT)\b/i.test(query) || /[()]/.test(query) || /site:/i.test(query) || /(?:^|\s)-\S+/.test(query))) {
      return { display: display || query, query };
    }
    if (query && display && query !== display && query.length > display.length + 3) {
      return { display, query };
    }
    const core = fallback.replace(/["']/g, "").trim();
    if (!core) return { display: fallback, query: fallback };
    const quoted = `"${core}"`;
    const words = core.split(/\s+/).filter(Boolean);
    if (words.length >= 2 && /^[\x00-\x7F\s]+$/.test(core)) {
      return { display: fallback, query: `${quoted} OR (${words.join(" AND ")})` };
    }
    return { display: fallback, query: quoted };
  }

  // src/dsh.ts
  var MAX_ASK_CHARS = 5e3;
  var INPUT_POLL_MS = 300;
  var INPUT_WAIT_MAX_MS = 15e3;
  function composeDshAsk(sel, title, url) {
    const body = sel.length > MAX_ASK_CHARS ? sel.slice(0, MAX_ASK_CHARS) + "\n\u2026\uFF08\u5185\u5BB9\u8FC7\u957F\u5DF2\u622A\u65AD\uFF09" : sel;
    return "\u8BF7\u5206\u6790\u4EE5\u4E0B\u7F51\u9875\u9009\u4E2D\u5185\u5BB9\uFF1A\n\n" + body + "\n\n\uFF08\u6765\u6E90\uFF1A" + title + "\n" + url + "\uFF09";
  }
  function askDsh(message, dshUrl = DSH_URL) {
    const payload = encodeURIComponent(JSON.stringify({ text: message, ts: Date.now() }));
    window.open(dshUrl + "#" + DSH_ASK_HASH + "=" + payload, "shizhi-dsh");
  }
  function initDshAskReceiver() {
    const tryFill = () => {
      const text = consumeAskHash();
      if (text === null) return;
      waitForDshInput().then((el) => {
        if (el) fillDshInput(el, text);
      });
    };
    tryFill();
    addEventListener("hashchange", tryFill);
  }
  function consumeAskHash() {
    const prefix = "#" + DSH_ASK_HASH + "=";
    if (!location.hash.startsWith(prefix)) return null;
    const raw = location.hash.slice(prefix.length);
    history.replaceState(null, "", location.pathname + location.search);
    try {
      const obj = JSON.parse(decodeURIComponent(raw));
      if (obj && typeof obj.text === "string") return obj.text;
    } catch {
    }
    return null;
  }
  function waitForDshInput() {
    return new Promise((resolve) => {
      const started = Date.now();
      const tick = () => {
        const el = findDshInput();
        if (el) {
          resolve(el);
          return;
        }
        if (Date.now() - started >= INPUT_WAIT_MAX_MS) {
          resolve(null);
          return;
        }
        setTimeout(tick, INPUT_POLL_MS);
      };
      tick();
    });
  }
  function findDshInput() {
    return document.querySelector('textarea[placeholder*="\u63CF\u8FF0\u4F60\u60F3\u8981\u6784\u5EFA\u7684\u5185\u5BB9"]') || document.querySelector("textarea");
  }
  function fillDshInput(el, text) {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
    if (setter) setter.call(el, text);
    else el.value = text;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.focus();
  }

  // src/extract.ts
  function extractPage() {
    const title = document.title || "";
    const h1 = ((document.querySelector("h1") || {}).textContent || "").trim();
    const metaEl = document.querySelector('meta[name="description"]');
    const meta = (metaEl?.getAttribute("content") || "").trim();
    const text = extractMainText();
    return { url: location.href, origin: location.origin, title, h1, meta, text };
  }
  function extractMainText() {
    const max = settings().contentMaxChars;
    const clone = document.body.cloneNode(true);
    clone.querySelectorAll(
      'script,style,noscript,iframe,svg,form,button,select,textarea,input,nav,aside,header,footer,[aria-hidden="true"],[class*="comment"],[id*="comment"],[class*="sidebar"],[id*="sidebar"]'
    ).forEach((el) => el.remove());
    const norm = (s) => truncate(
      String(s || "").replace(/ /g, " ").replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim(),
      max
    );
    const cands = ["article", "main", '[role="main"]', "#content", ".content", ".article", ".post", ".entry-content", ".markdown-body"];
    for (const sel of cands) {
      const el = clone.querySelector(sel);
      if (el && (el.textContent || "").trim().length > 200) return norm(el.textContent);
    }
    let best = clone;
    let bestScore = 0;
    const divs = clone.querySelectorAll("div, section");
    const n = Math.min(divs.length, 800);
    for (let i = 0; i < n; i++) {
      const d = divs[i];
      const t = (d.textContent || "").replace(/\s+/g, " ").trim();
      if (t.length < 200) continue;
      let lt = 0;
      d.querySelectorAll("a").forEach((a) => {
        lt += (a.textContent || "").length;
      });
      const score = t.length - lt * 1.5;
      if (score > bestScore) {
        bestScore = score;
        best = d;
      }
    }
    return norm(best.textContent);
  }

  // src/core/matches.ts
  function isMoreSpecific(match) {
    if (match.subtaskId) return 2;
    if (match.taskId) return 1;
    return 0;
  }
  function shouldReplace(current, candidate) {
    const currentHasTask = !!current.taskId;
    const candidateHasTask = !!candidate.taskId;
    if (currentHasTask !== candidateHasTask) return candidateHasTask;
    if (candidate.relevance !== current.relevance) return candidate.relevance > current.relevance;
    return isMoreSpecific(candidate) > isMoreSpecific(current);
  }
  function normalizeMatches(matches) {
    const byGoal = /* @__PURE__ */ new Map();
    for (const match of matches) {
      if (!match || typeof match.goalId !== "string" || !match.goalId) continue;
      const current = byGoal.get(match.goalId);
      if (!current || shouldReplace(current, match)) byGoal.set(match.goalId, match);
    }
    return [...byGoal.values()].sort((a, b) => b.relevance - a.relevance);
  }
  function syncRecordPrimaryMatch(record) {
    const matches = normalizeMatches(record.matches || []);
    record.matches = matches;
    const main = matches[0];
    if (!main) return;
    record.category = "goal:" + main.goalId;
    record.relevance = main.relevance;
    record.findings = main.findings;
    record.notes = main.notes;
  }

  // src/core/prompt.ts
  var PRESET_ANALYSIS_PROMPT = `\u4F60\u662F"\u62FE\u77E5"\u5206\u6790\u5668\u3002\u4E0B\u9762\u6709\u4E00\u4EFD\u7F51\u9875\u5185\u5BB9\u548C\u7528\u6237\u7684\u5DE5\u4F5C\u76EE\u6807\u6E05\u5355\uFF08\u76EE\u6807\u2192\u4EFB\u52A1\u2192\u5B50\u4EFB\u52A1\u4E09\u7EA7\uFF0C\u6BCF\u7EA7\u90FD\u5E26\u8BF4\u660E\uFF09\u3002\u4F60\u7684\u4EFB\u52A1\u662F\u5224\u65AD\u7F51\u9875\u4E0E\u54EA\u4E9B\u4E00\u7EA7\u76EE\u6807\u76F8\u5173\uFF0C\u5E76\u4E3A\u6BCF\u4E2A\u76F8\u5173\u4E00\u7EA7\u76EE\u6807\u53EA\u9009\u62E9\u4E00\u6761\u6700\u5177\u4F53\u7684\u4EFB\u52A1\u8DEF\u5F84\u8FDB\u884C\u6DF1\u5EA6\u5206\u6790\u3002\u53EA\u8F93\u51FA JSON\u3002

[\u5DE5\u4F5C\u76EE\u6807\u6E05\u5355]
{{GOALS}}

[\u7F51\u9875]
URL: {{URL}}
\u6807\u9898: {{TITLE}}
{{H1}}
{{META}}
\u6B63\u6587\u6458\u5F55:
{{EXCERPT}}

[\u5206\u6790\u6D41\u7A0B\u2014\u2014\u5FC5\u987B\u4E25\u683C\u6267\u884C]
\u6B65\u9AA41\uFF1A\u9010\u4E2A\u4E00\u7EA7\u76EE\u6807\u5224\u65AD\u7F51\u9875\u662F\u5426\u76F8\u5173\uFF1B\u4E0D\u540C\u4E00\u7EA7\u76EE\u6807\u53EF\u4EE5\u540C\u65F6\u76F8\u5173\u3002
\u6B65\u9AA42\uFF1A\u5BF9\u6BCF\u4E2A\u76F8\u5173\u4E00\u7EA7\u76EE\u6807\uFF0C\u6BD4\u8F83\u5B83\u4E0B\u9762\u7684\u6240\u6709\u4EFB\u52A1\uFF0C\u53EA\u9009\u62E9\u6700\u76F8\u5173\u7684\u4E00\u4E2A\u4EFB\u52A1\uFF1B\u5982\u679C\u8BE5\u4EFB\u52A1\u8FD8\u6709\u5B50\u4EFB\u52A1\uFF0C\u518D\u6700\u591A\u9009\u62E9\u4E00\u4E2A\u6700\u76F8\u5173\u7684\u5B50\u4EFB\u52A1\u3002\u7981\u6B62\u5728\u540C\u4E00\u4E2A\u4E00\u7EA7\u76EE\u6807\u4E0B\u8F93\u51FA\u4E24\u6761\u8DEF\u5F84\u3002
\u6B65\u9AA43\uFF1A\u4E3A\u6BCF\u4E2A\u76F8\u5173\u4E00\u7EA7\u76EE\u6807\uFF0C\u4ECE\u5934\u5199\u4E00\u5957\u5168\u65B0\u7684 title / findings / notes / keyQuotes\uFF0C\u53EA\u5173\u6CE8\u6240\u9009\u8DEF\u5F84\u7684\u5206\u7C7B\u8BF4\u660E\u3002\u4E0D\u540C\u4E00\u7EA7\u76EE\u6807\u7684\u5206\u6790\u4E4B\u95F4\u4E0D\u5141\u8BB8\u5171\u4EAB\u4EFB\u4F55 finding\u3001note \u6216 quote\u3002
\u6B65\u9AA44\uFF1A\u8F93\u51FA\u524D\u81EA\u68C0\u2014\u2014matches \u4E2D goalId \u4E0D\u5F97\u91CD\u590D\uFF1B\u5982\u679C\u67D0\u6761 finding \u6216 note \u8D34\u5230\u53E6\u4E00\u4E2A\u4E00\u7EA7\u76EE\u6807\u7684 match \u91CC\u4E5F\u6210\u7ACB\uFF0C\u5FC5\u987B\u91CD\u5199\u3002

[\u8F93\u51FA\u683C\u5F0F]
\u53EA\u8F93\u51FA JSON\uFF08\u4E0D\u8981\u8F93\u51FA\u4EFB\u4F55\u5176\u4ED6\u5185\u5BB9\uFF09\uFF1A
{"summary":"80\u5B57\u4EE5\u5185\u9875\u9762\u6458\u8981\uFF08\u901A\u7528\uFF0C\u4E0D\u504F\u5411\u4EFB\u4F55\u5206\u7C7B\uFF09","keywords":["\u5173\u952E\u8BCD"],"findings":["\u901A\u7528\u5173\u952E\u53D1\u73B01","\u901A\u7528\u5173\u952E\u53D1\u73B02"],"notes":[{"topic":"\u901A\u7528\u4E3B\u9898","content":"\u8BE6\u7EC6\u7B14\u8BB0"}],"keyQuotes":[{"quote":"\u539F\u6587\u5173\u952E\u53E5","context":"\u4E0A\u4E0B\u6587"}],"matches":[{"goalId":"g_xxx","taskId":"t_xxx\u6216null","subtaskId":"s_xxx\u6216null","title":"\u6839\u636E\u8BE5\u5206\u7C7B\u4E3B\u9898\u91CD\u5199\u7684\u6807\u9898\uFF0815\u5B57\u4EE5\u5185\uFF09","relevance":0,"reasoning":"\u4E3A\u4EC0\u4E48\u4E0E\u8BE5\u5206\u7C7B\u76F8\u5173","findings":["\u5206\u7C7B\u89C6\u89D2\u53D1\u73B01","\u5206\u7C7B\u89C6\u89D2\u53D1\u73B02"],"notes":[{"topic":"\u5206\u7C7B\u4E3B\u9898","content":"\u5206\u7C7B\u89C6\u89D2\u7B14\u8BB0"}],"keyQuotes":[{"quote":"\u539F\u6587\u5173\u952E\u53E5","context":"\u4E0A\u4E0B\u6587"}]}]}

[\u89C4\u5219]
1. \u4E00\u4E2A\u7F51\u9875\u53EF\u4EE5\u5339\u914D 0 \u4E2A\u30011 \u4E2A\u6216\u591A\u4E2A\u4E00\u7EA7\u76EE\u6807\uFF1B\u4E0E\u6240\u6709\u76EE\u6807\u90FD\u65E0\u5173\u65F6 matches \u8FD4\u56DE\u7A7A\u6570\u7EC4 []\u3002
2. \u540C\u4E00\u4E2A goalId \u5728 matches \u4E2D\u6700\u591A\u51FA\u73B0\u4E00\u6B21\u3002\u4E00\u4E2A\u4E00\u7EA7\u76EE\u6807\u4E0B\u5373\u4F7F\u591A\u4E2A\u4EFB\u52A1\u90FD\u76F8\u5173\uFF0C\u4E5F\u5FC5\u987B\u6BD4\u8F83\u540E\u53EA\u9009\u62E9\u6700\u76F8\u5173\u7684\u4E00\u6761\u8DEF\u5F84\u3002
3. \u5C3D\u91CF\u5F52\u5230\u6700\u7EC6\u5C42\u7EA7\uFF1A\u80FD\u786E\u5B9A\u5230\u5B50\u4EFB\u52A1\u5C31\u586B subtaskId\uFF08\u540C\u65F6\u586B taskId\u3001goalId\uFF09\uFF0C\u80FD\u786E\u5B9A\u5230\u4EFB\u52A1\u5C31\u586B taskId\uFF08\u540C\u65F6\u586B goalId\uFF09\uFF1B\u4E00\u7EA7\u76EE\u6807\u5B58\u5728\u4EFB\u52A1\u65F6\u4E0D\u8981\u53EA\u586B goalId\u3002
4. relevance \u8868\u793A\u7F51\u9875\u4E0E\u6240\u9009\u8DEF\u5F84\u7684\u76F8\u5173\u7A0B\u5EA6\uFF0C0=\u5B8C\u5168\u65E0\u5173\uFF0C100=\u9AD8\u5EA6\u76F8\u5173\uFF1B\u4F4E\u4E8E 50 \u7684\u4E0D\u8981\u653E\u8FDB matches\u3002
5. \u3010\u6700\u5173\u952E\u3011\u6BCF\u4E2A match \u7684 title / findings / notes / keyQuotes \u5FC5\u987B\u5B8C\u5168\u4E0D\u540C\u3002\u4E0D\u540C\u4E00\u7EA7\u76EE\u6807\u7684\u5173\u6CE8\u89D2\u5EA6\u7531\u5404\u81EA\u7684\u8BF4\u660E\u5B9A\u4E49\uFF0C\u4F60\u5E94\u4ECE\u6240\u9009\u8DEF\u5F84\u7684\u89C6\u89D2\u5BA1\u89C6\u7F51\u9875\u3002
6. title \u5FC5\u987B\u6839\u636E\u6240\u9009\u8DEF\u5F84\u7684\u4E3B\u9898\u91CD\u65B0\u63D0\u70BC\uFF0C\u4E0D\u8981\u76F4\u63A5\u590D\u5236\u7F51\u9875\u539F\u6807\u9898\u3002\u6807\u9898\u8981\u7CBE\u51C6\u6982\u62EC\u201C\u8FD9\u4E2A\u7F51\u9875\u5BF9\u8BE5\u76EE\u6807\u6709\u4EC0\u4E48\u4EF7\u503C\u201D\uFF0C15\u5B57\u4EE5\u5185\uFF0C\u8D85\u51FA\u7528\u7701\u7565\u53F7\u3002
7. \u5224\u65AD\u201C\u4EC0\u4E48\u662F\u6709\u4EF7\u503C\u7684\u4FE1\u606F\u201D\u65F6\uFF0C\u4EE5\u6240\u9009\u8DEF\u5F84\u7684\u8BF4\u660E\u4E3A\u51C6\u3002\u4E0D\u8981\u5199\u4E00\u4E2A\u901A\u7528\u7248\u7136\u540E\u590D\u5236\u7ED9\u591A\u4E2A\u4E00\u7EA7\u76EE\u6807\u3002
8. match \u91CC\u7684 findings \u5199\u6240\u9009\u8DEF\u5F84\u89C6\u89D2\u4E0B\u7684\u5173\u952E\u4FE1\u606F\u70B9\u3002\u5141\u8BB8\u8BE6\u7EC6\u5C55\u5F00\uFF0C\u4FE1\u606F\u91CF\u5927\u7684\u9875\u9762\u53EF\u4EE5\u5199\u5230 8-10 \u6761\uFF0C\u7981\u6B62\u7A7A\u8BDD\u3002
9. match \u91CC\u7684 notes \u6309\u4E3B\u9898\u62C6\u5206\uFF0C\u6BCF\u4E2A\u4E3B\u9898\u4E00\u6761\u3002content \u5148\u5F15\u7528\u539F\u6587\u5173\u952E\u53E5\uFF0C\u7D27\u63A5\u7740\u5199\u8FD9\u4E2A\u4FE1\u606F\u5728\u6240\u9009\u8DEF\u5F84\u89C6\u89D2\u4E0B\u4E3A\u4EC0\u4E48\u6709\u4EF7\u503C\u3002
10. match \u91CC\u7684 keyQuotes \u5C3D\u91CF\u591A\u63D0\u4F9B\uFF0C\u6700\u591A 6 \u6761\u3002quote \u5FC5\u987B\u9010\u5B57\u6765\u81EA\u7F51\u9875\u6B63\u6587\uFF0C\u4E0D\u5F97\u6539\u5199\u3002
11. reasoning \u5FC5\u987B\u5F15\u7528\u7F51\u9875\u91CC\u7684\u5177\u4F53\u5185\u5BB9\u8BF4\u660E\u4E3A\u4EC0\u4E48\u4E0E\u6240\u9009\u8DEF\u5F84\u76F8\u5173\u3002
12. \u3010\u6478\u9C7C\u573A\u666F\u901A\u7528\u5206\u6790\u3011\u5F53 matches \u4E3A\u7A7A\u65F6\uFF0C\u5FC5\u987B\u5728\u9876\u5C42\u8F93\u51FA findings / notes / keyQuotes\uFF1B\u5F53 matches \u4E0D\u4E3A\u7A7A\u65F6\uFF0C\u4EE5 match \u91CC\u7684\u5185\u5BB9\u4E3A\u51C6\u3002
13. \u5185\u5BB9\u4E30\u5BCC\u7684\u7F51\u9875\uFF0C\u8BF7\u5145\u5206\u5229\u7528\u8F93\u51FA\u7A7A\u95F4\uFF0C\u4E0D\u8981\u523B\u610F\u7CBE\u7B80\u3002
14. \u62FF\u4E0D\u51C6\u662F\u5426\u76F8\u5173\u65F6\uFF0C\u5B81\u53EF\u5224\u5B9A\u4E3A\u4E0D\u76F8\u5173\u3002

[\u9519\u8BEF\u793A\u4F8B\u2014\u2014\u7EDD\u5BF9\u7981\u6B62]
\u4E0B\u9762\u7684\u8F93\u51FA\u662F\u9519\u8BEF\u7684\uFF0C\u56E0\u4E3A\u540C\u4E00\u4E2A\u4E00\u7EA7\u76EE\u6807 g1 \u51FA\u73B0\u4E86\u4E24\u6B21\uFF1A
{"matches":[
  {"goalId":"g1","taskId":"t1","subtaskId":null,"relevance":85},
  {"goalId":"g1","taskId":"t2","subtaskId":"s2","relevance":80}
]}

[\u6B63\u786E\u793A\u4F8B]
\u5982\u679C\u7F51\u9875\u540C\u65F6\u4E0E g1\u3001g2 \u76F8\u5173\uFF0C\u53EF\u4EE5\u5404\u8F93\u51FA\u4E00\u6761\uFF1B\u4F46\u6BCF\u4E2A\u4E00\u7EA7\u76EE\u6807\u5185\u90E8\u53EA\u80FD\u9009\u62E9\u4E00\u4E2A\u6700\u76F8\u5173\u4EFB\u52A1\u8DEF\u5F84\uFF1A
{"matches":[
  {"goalId":"g1","taskId":"t1","subtaskId":null,"relevance":85},
  {"goalId":"g2","taskId":"t8","subtaskId":"s9","relevance":80}
]}`;
  function buildPagePrompt(page, goals, customPrompt) {
    const goalLines = goals.map((g, gi) => {
      const lines = [`${gi + 1}. \u76EE\u6807 ${g.id}\uFF1A${g.title}`];
      if (g.prompt) lines.push(`   \u76EE\u6807\u8BF4\u660E\uFF1A${g.prompt}`);
      (g.tasks || []).forEach((t, ti) => {
        lines.push(`   ${gi + 1}.${ti + 1} \u4EFB\u52A1 ${t.id}\uFF1A${t.title}`);
        if (t.prompt) lines.push(`      \u4EFB\u52A1\u8BF4\u660E\uFF1A${t.prompt}`);
        (t.subtasks || []).forEach((s, si) => {
          lines.push(`      ${gi + 1}.${ti + 1}.${si + 1} \u5B50\u4EFB\u52A1 ${s.id}\uFF1A${s.title}`);
          if (s.prompt) lines.push(`         \u5B50\u4EFB\u52A1\u8BF4\u660E\uFF1A${s.prompt}`);
        });
      });
      return lines.join("\n");
    }).join("\n");
    const template = (customPrompt || PRESET_ANALYSIS_PROMPT).trim();
    return template.replace(/{{GOALS}}/g, () => goalLines || "\uFF08\u65E0\u76EE\u6807\uFF09").replace(/{{URL}}/g, () => page.url).replace(/{{TITLE}}/g, () => page.title).replace(/{{H1}}/g, () => page.h1 ? `\u7AE0\u8282: ${page.h1}` : "").replace(/{{META}}/g, () => page.meta ? `\u7B80\u4ECB: ${page.meta}` : "").replace(/{{EXCERPT}}/g, () => page.excerpt);
  }
  function validateAnalysis(json, goals) {
    if (!json || typeof json !== "object" || Array.isArray(json)) throw new Error("bad analysis json");
    const obj = json;
    const goalById = new Map(goals.map((g) => [g.id, g]));
    const rawMatches = Array.isArray(obj.matches) ? obj.matches : [];
    const parsedMatches = [];
    for (const m of rawMatches) {
      const mo = m ?? {};
      const goalId = typeof mo.goalId === "string" && goalById.has(mo.goalId) ? mo.goalId : null;
      if (!goalId) continue;
      const goal = goalById.get(goalId);
      const taskId = typeof mo.taskId === "string" && (goal.tasks || []).some((t) => t.id === mo.taskId) ? mo.taskId : null;
      if ((goal.tasks || []).length > 0 && !taskId) continue;
      const task = taskId ? (goal.tasks || []).find((t) => t.id === taskId) : void 0;
      const subtaskId = task && typeof mo.subtaskId === "string" && (task.subtasks || []).some((s) => s.id === mo.subtaskId) ? mo.subtaskId : null;
      const relevanceRaw = Number(mo.relevance);
      const relevance = Number.isFinite(relevanceRaw) ? Math.max(0, Math.min(100, Math.round(relevanceRaw))) : 0;
      if (relevance < 50) continue;
      const findings = Array.isArray(mo.findings) ? mo.findings.slice(0, 12).map((f) => truncate(String(f), 600)) : [];
      const notes = Array.isArray(mo.notes) ? mo.notes.slice(0, 10).map((n) => {
        const no = n ?? {};
        return {
          topic: truncate(typeof no.topic === "string" ? no.topic : "", 60),
          content: truncate(typeof no.content === "string" ? no.content : "", 2e3),
          relevance
        };
      }).filter((n) => n.topic && n.content) : [];
      const keyQuotes = Array.isArray(mo.keyQuotes) ? mo.keyQuotes.slice(0, 6).map((q) => {
        const qo = q ?? {};
        return {
          quote: truncate(typeof qo.quote === "string" ? qo.quote : "", 800),
          context: truncate(typeof qo.context === "string" ? qo.context : "", 300)
        };
      }).filter((q) => q.quote) : [];
      parsedMatches.push({
        goalId,
        taskId,
        subtaskId,
        title: truncate(typeof mo.title === "string" ? mo.title : "", 30) || void 0,
        relevance,
        reasoning: truncate(typeof mo.reasoning === "string" ? mo.reasoning : "", 200),
        findings,
        notes,
        keyQuotes
      });
    }
    const matches = normalizeMatches(parsedMatches);
    const main = matches[0] || null;
    const generalFindings = Array.isArray(obj.findings) ? obj.findings.slice(0, 12).map((f) => truncate(String(f), 600)) : [];
    const generalNotes = Array.isArray(obj.notes) ? obj.notes.slice(0, 10).map((n) => {
      const no = n ?? {};
      return {
        topic: truncate(typeof no.topic === "string" ? no.topic : "", 60),
        content: truncate(typeof no.content === "string" ? no.content : "", 2e3),
        relevance: 0
      };
    }).filter((n) => n.topic && n.content) : [];
    return {
      relevant: matches.length > 0,
      goalId: main ? main.goalId : null,
      summary: truncate(typeof obj.summary === "string" ? obj.summary : "", 200),
      keywords: Array.isArray(obj.keywords) ? obj.keywords.slice(0, 8).map(String) : [],
      relevance: main ? main.relevance : 0,
      findings: main ? main.findings : generalFindings,
      notes: main ? main.notes : generalNotes,
      matches
    };
  }

  // src/profile.ts
  var PROFILE_UPDATE_EVERY_WORK_PAGES = 5;
  function recordWorkPage() {
    const saved = Store.read(K.profileWorkPageCount, 0);
    const current = Number.isFinite(saved) && saved >= 0 ? Math.floor(saved) : 0;
    const next = current + 1;
    Store.write(K.profileWorkPageCount, next);
    return next % PROFILE_UPDATE_EVERY_WORK_PAGES === 0;
  }
  async function updateProfileFromWorkRecords() {
    const bridge = window.LLMBridge;
    if (!bridge) throw new Error("\u672A\u68C0\u6D4B\u5230 LLMBridge");
    const records = Store.read(K.records, []).filter((record) => record.summary && record.category.startsWith("goal:"));
    if (!records.length) throw new Error("\u6682\u65E0\u5DF2\u5F52\u6863\u7684\u5DE5\u4F5C\u8BB0\u5F55");
    const sample = records.slice(0, 20).map((record) => record.summary).join("\n---\n");
    const raw = await bridge.chat(
      '\u6839\u636E\u4EE5\u4E0B\u5DE5\u4F5C\u7F51\u9875\u6D4F\u89C8\u8BB0\u5F55\u6458\u8981\uFF0C\u5F52\u7EB3\u7528\u6237\u7684\u753B\u50CF\u3002\u8F93\u51FA JSON\uFF08\u4E0D\u8981\u8F93\u51FA\u5176\u4ED6\u5185\u5BB9\uFF09\uFF1A{"facts":["\u5173\u4E8E\u7528\u6237\u7684\u4E8B\u5B9E","..."],"preferences":["\u7528\u6237\u7684\u504F\u597D","..."]}\u89C4\u5219\uFF1Afacts \u548C preferences \u5404 1-5 \u6761\uFF0C\u6BCF\u6761\u4E00\u53E5\u8BDD\u3001\u5177\u4F53\u3001\u907F\u514D\u7A7A\u6CDB\u3002\n\n' + sample.slice(0, 4e3),
      "json"
    );
    const parsed = parseJsonLoose(raw);
    const obj = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    const facts = normalizeProfileItems(obj.facts);
    const preferences = normalizeProfileItems(obj.preferences);
    if (!facts.length && !preferences.length) throw new Error("AI \u672A\u4EA7\u51FA\u6709\u6548\u753B\u50CF");
    const profile = Store.read(K.profile, { updatedAt: 0, facts: [], preferences: [] });
    profile.facts = Array.from(/* @__PURE__ */ new Set([...facts, ...profile.facts || []])).slice(0, 20);
    profile.preferences = Array.from(/* @__PURE__ */ new Set([...preferences, ...profile.preferences || []])).slice(0, 20);
    profile.updatedAt = Date.now();
    Store.write(K.profile, profile);
    return { facts: facts.length, preferences: preferences.length };
  }
  function normalizeProfileItems(value) {
    return (Array.isArray(value) ? value : []).slice(0, 8).map((item) => String(item).trim()).filter(Boolean);
  }

  // src/queue.ts
  var pumping = false;
  async function pumpQueue() {
    if (pumping) return;
    pumping = true;
    try {
      for (; ; ) {
        const q = Store.read(K.queue, []);
        const now = Date.now();
        const item = q.find((i) => (i.nextAt || 0) <= now);
        if (!item) break;
        const recs = Store.read(K.records, []);
        const rec = recs.find((r) => r.id === item.recordId);
        if (!rec) {
          Store.write(K.queue, q.filter((i) => i.recordId !== item.recordId));
          continue;
        }
        try {
          const isWorkPage = await analyze(rec, item);
          Store.write(K.records, recs);
          Store.write(K.queue, Store.read(K.queue, []).filter((i) => i.recordId !== item.recordId));
          Panel.render();
          if (isWorkPage && recordWorkPage()) {
            await sleep(settings().queueGapMs);
            Panel.toast("\u5DF2\u6D4F\u89C8 " + PROFILE_UPDATE_EVERY_WORK_PAGES + " \u4E2A\u5DE5\u4F5C\u7F51\u9875\uFF0CAI \u6B63\u5728\u66F4\u65B0\u7528\u6237\u753B\u50CF\u2026", "idle");
            try {
              const result = await updateProfileFromWorkRecords();
              Panel.render();
              Panel.toast("\u753B\u50CF\u5DF2\u81EA\u52A8\u66F4\u65B0\uFF1A" + result.facts + " \u6761\u4E8B\u5B9E\u3001" + result.preferences + " \u6761\u504F\u597D", "ok");
            } catch (profileError) {
              Panel.toast("\u753B\u50CF\u81EA\u52A8\u66F4\u65B0\u5931\u8D25\uFF1A" + String(profileError), "err");
            }
          }
          await sleep(settings().queueGapMs);
        } catch (e) {
          item.retries = (item.retries || 0) + 1;
          if (item.retries > 3) {
            rec.category = "error";
            rec.excerpt = item.excerpt;
            Store.write(K.records, recs);
            Store.write(K.queue, Store.read(K.queue, []).filter((i) => i.recordId !== item.recordId));
            Panel.render();
          } else {
            item.nextAt = Date.now() + backoffMs(item.retries);
            Store.write(K.queue, q);
            break;
          }
        }
      }
    } finally {
      pumping = false;
    }
  }
  async function analyze(rec, item) {
    const allGoals = Store.read(K.goals, []);
    const goals = allGoals.filter((g2) => g2.status === "active");
    const prompt2 = buildPagePrompt(
      { url: rec.url, title: rec.title, h1: rec.h1, meta: rec.meta, excerpt: item.excerpt },
      goals,
      settings().analysisPrompt || void 0
    );
    const raw = await LLMBridge.chat(prompt2, "json");
    const res = validateAnalysis(parseJsonLoose(raw), goals);
    rec.summary = res.summary;
    rec.keywords = res.keywords;
    rec.relevance = res.relevance;
    rec.findings = res.findings;
    rec.notes = res.notes;
    rec.matches = res.matches;
    rec.category = res.relevant && res.goalId ? "goal:" + res.goalId : "slacking";
    const g = goals.find((x) => x.id === res.goalId);
    if (res.relevant && g) {
      const extra = res.matches.length > 1 ? "\uFF08\u5171\u5173\u8054 " + res.matches.length + " \u4E2A\u76EE\u6807\uFF09" : "";
      Panel.toast("\u5DF2\u5F52\u6863\u81F3\uFF1A" + g.title + extra, "ok");
      const matchedGoalIds = [...new Set(res.matches.map((m) => m.goalId).filter(Boolean))];
      for (const goalId of matchedGoalIds) {
        const goal = goals.find((x) => x.id === goalId);
        if (!goal) continue;
        syncTodos(goal);
        updateTodoCoverage(goal, rec);
        updateSearchTerms(goal, rec);
      }
      Store.write(K.goals, allGoals);
      return true;
    } else {
      Panel.toast("\u5DF2\u5F52\u5165\u6478\u9C7C", "idle");
      return false;
    }
  }
  function updateSearchTerms(goal, rec) {
    const todos = goal.todos || [];
    if (!todos.length) return;
    const newTerms = (rec.keywords || []).map((k) => {
      const q = String(k).trim();
      return { display: q, query: q };
    }).filter((t) => t.query);
    const openTodos = todos.filter((t) => t.status === "open");
    if (!openTodos.length) return;
    for (const todo of openTodos) {
      const arr2 = (todo.searchTerms || []).filter((s) => normalizeSearchTerm(s).query);
      if (!arr2.length) {
        const base = newTerms[0] && newTerms[0].query || todo.text || goal.title || "\u641C\u7D22";
        arr2.push({ display: base, query: base });
      }
      todo.searchTerms = arr2;
    }
    if (!newTerms.length) return;
    openTodos.sort((a, b) => (a.coverage || 0) - (b.coverage || 0));
    const target = openTodos[0];
    const existing = new Set((target.searchTerms || []).map((s) => normalizeSearchTerm(s).query));
    const arr = target.searchTerms || [];
    for (const term of newTerms) {
      if (!existing.has(term.query)) {
        arr.push(term);
        existing.add(term.query);
      }
    }
    target.searchTerms = arr.length > 6 ? arr.slice(-6) : arr;
  }
  function syncTodos(goal) {
    if (!goal.tasks?.length) return;
    const existing = new Set((goal.todos || []).map((t) => t.taskId).filter(Boolean));
    for (const task of goal.tasks) {
      if (existing.has(task.id)) continue;
      goal.todos = goal.todos || [];
      const todo = {
        id: uid("todo"),
        text: task.title,
        taskId: task.id,
        contrib: {},
        coverage: 0,
        status: "open",
        manual: false,
        searchTerms: (task.searchTerms || []).slice(0, 3)
      };
      goal.todos.push(todo);
    }
    for (const todo of goal.todos || []) {
      const validTerms = (todo.searchTerms || []).filter((s) => normalizeSearchTerm(s).query);
      todo.searchTerms = validTerms;
      if (todo.status === "open" && !validTerms.length) {
        const task = goal.tasks.find((t) => t.id === todo.taskId);
        const taskTerms = (task?.searchTerms || []).filter((s) => normalizeSearchTerm(s).query);
        if (taskTerms.length) {
          todo.searchTerms = taskTerms.slice(0, 3);
        } else {
          const base = todo.text || goal.title || "\u641C\u7D22";
          todo.searchTerms = [{ display: base, query: base }];
        }
      }
    }
  }
  function updateTodoCoverage(goal, rec) {
    const match = rec.matches?.find((m) => m.goalId === goal.id);
    if (!match?.taskId) return;
    const todo = goal.todos?.find((t) => t.taskId === match.taskId);
    if (todo) {
      const inc = match.relevance / 100 * 0.15;
      todo.coverage = Math.min(1, (todo.coverage || 0) + inc);
      if (todo.coverage >= 0.9) todo.status = "done";
    }
    for (const t of goal.todos || []) {
      if (t.status === "open" && t.coverage >= 0.9) t.status = "done";
    }
  }

  // src/watcher.ts
  var settleTimer = 0;
  var dwellTimer = 0;
  var visListener = null;
  function onLocationChange() {
    clearTimeout(settleTimer);
    clearTimeout(dwellTimer);
    settleTimer = setTimeout(armDwell, settings().settleMs);
  }
  function armDwell() {
    if (document.visibilityState !== "visible") {
      if (!visListener) {
        const cb = () => {
          if (document.visibilityState === "visible") {
            document.removeEventListener("visibilitychange", cb);
            visListener = null;
            dwellTimer = setTimeout(capture, settings().dwellMs);
          }
        };
        visListener = cb;
        document.addEventListener("visibilitychange", cb);
      }
      return;
    }
    dwellTimer = setTimeout(capture, settings().dwellMs);
  }
  function capture() {
    const st = getState();
    if (!st.workMode) return;
    const goals = Store.read(K.goals, []).filter((g) => g.status === "active");
    if (!goals.length) return;
    if (settings().excludedSites.some((x) => location.href.includes(x))) return;
    if (document.visibilityState !== "visible") return;
    const page = extractPage();
    if (!page.text || page.text.length < 100) return;
    const hash = fnv1a(page.url.split("#")[0] + "|" + page.text.slice(0, 500));
    const recs = Store.read(K.records, []);
    const now = Date.now();
    if (recs.some((r) => r.url === page.url)) return;
    const rec = {
      id: uid("r"),
      url: page.url,
      origin: page.origin,
      title: page.title,
      h1: page.h1,
      meta: page.meta,
      capturedAt: now,
      excerptHash: hash,
      preview: truncate(page.text.replace(/\s+/g, " "), 160),
      category: "pending",
      summary: "",
      keywords: []
    };
    recs.unshift(rec);
    Store.write(K.records, recs.slice(0, settings().recordCap));
    const q = Store.read(K.queue, []);
    q.push({ recordId: rec.id, excerpt: page.text, retries: 0, nextAt: 0 });
    Store.write(K.queue, q);
    Panel.render();
    pumpQueue();
  }
  function hookHistory() {
    try {
      for (const m of ["pushState", "replaceState"]) {
        const orig = history[m];
        history[m] = function(...args) {
          const r = orig.apply(this, args);
          onLocationChange();
          return r;
        };
      }
      addEventListener("popstate", onLocationChange);
      addEventListener("hashchange", onLocationChange);
      const t = document.querySelector("title");
      if (t) new MutationObserver(() => onLocationChange()).observe(t, { childList: true });
    } catch (e) {
    }
  }

  // src/storageQuota.ts
  var STORAGE_SOFT_CAP_OPTIONS_MB = [25, 50, 100];
  var DEFAULT_STORAGE_SOFT_CAP_MB = 25;
  var STORAGE_SOFT_CAP_KEY = "shizhi.storageSoftCapMb";
  var STORAGE_QUOTA_WARNING_RATIO = 0.8;
  var STORAGE_QUOTA_CRITICAL_RATIO = 0.95;
  var CATEGORY_KEYS = {
    goals: [K.goals],
    records: [K.records],
    profile: [K.profile, K.profileWorkPageCount],
    queue: [K.queue],
    settings: [K.settings, K.state, STORAGE_SOFT_CAP_KEY],
    ui: [K.theme, K.recSort, K.fabPos, K.panelSize]
  };
  var CATEGORY_META = {
    goals: { clearable: false },
    records: { clearable: false },
    profile: { clearable: false },
    queue: { clearable: true },
    settings: { clearable: false },
    ui: { clearable: false },
    other: { clearable: false }
  };
  function bytesFor(key, value) {
    if (value == null) return 0;
    try {
      return new TextEncoder().encode(key + value).byteLength;
    } catch {
      return (key.length + value.length) * 2;
    }
  }
  function normalizeSoftCap(value) {
    const parsed = typeof value === "string" ? Number(value) : value;
    return STORAGE_SOFT_CAP_OPTIONS_MB.includes(parsed) ? parsed : DEFAULT_STORAGE_SOFT_CAP_MB;
  }
  function getKeys(storage) {
    const keys = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key !== null && key.startsWith("shizhi.")) keys.push(key);
    }
    return keys;
  }
  function getStorageQuotaSnapshot(storage = localStorage, origin = typeof location === "undefined" ? "\u5F53\u524D\u6E90" : location.origin) {
    const keys = getKeys(storage);
    const known = new Set(Object.values(CATEGORY_KEYS).flat());
    const categories = Object.keys(CATEGORY_KEYS).map((id) => {
      const categoryKeys = keys.filter((key) => CATEGORY_KEYS[id].includes(key));
      return {
        id,
        bytesInUse: categoryKeys.reduce((sum, key) => sum + bytesFor(key, storage.getItem(key)), 0),
        keys: categoryKeys,
        clearable: CATEGORY_META[id].clearable
      };
    });
    const otherKeys = keys.filter((key) => !known.has(key));
    categories.push({
      id: "other",
      bytesInUse: otherKeys.reduce((sum, key) => sum + bytesFor(key, storage.getItem(key)), 0),
      keys: otherKeys,
      clearable: false
    });
    const bytesInUse = keys.reduce((sum, key) => sum + bytesFor(key, storage.getItem(key)), 0);
    const rawCap = storage.getItem(STORAGE_SOFT_CAP_KEY);
    const softCapMb = normalizeSoftCap(rawCap);
    const softCapBytes = softCapMb * 1024 * 1024;
    return {
      measuredAt: Date.now(),
      origin,
      bytesInUse,
      softCapMb,
      softCapBytes,
      usageRatio: Math.max(0, bytesInUse / softCapBytes),
      categories
    };
  }
  function saveStorageSoftCapMb(value, storage = localStorage) {
    if (!STORAGE_SOFT_CAP_OPTIONS_MB.includes(value)) throw new RangeError("\u5B58\u50A8\u8F6F\u4E0A\u9650\u53EA\u80FD\u8BBE\u7F6E\u4E3A 25\u300150 \u6216 100 MB");
    storage.setItem(STORAGE_SOFT_CAP_KEY, String(value));
  }
  function formatStorageBytes(bytes) {
    const safe = Number.isFinite(bytes) && bytes > 0 ? bytes : 0;
    if (safe < 1024) return `${Math.round(safe)} B`;
    if (safe < 1024 * 1024) return `${(safe / 1024).toFixed(safe < 10 * 1024 ? 1 : 0)} KB`;
    if (safe < 1024 * 1024 * 1024) return `${(safe / (1024 * 1024)).toFixed(safe < 10 * 1024 * 1024 ? 1 : 0)} MB`;
    return `${(safe / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
  function storageQuotaStatus(ratio) {
    if (ratio >= STORAGE_QUOTA_CRITICAL_RATIO) return "critical";
    if (ratio >= STORAGE_QUOTA_WARNING_RATIO) return "warning";
    return "normal";
  }

  // src/panel/panel.ts
  var PRESET_PROMPT = PRESET_ANALYSIS_PROMPT;
  var APP_VERSION = "0.1.0";
  var DEFAULT_THEME_COLOR = "#5f8f55";
  var THEME_COLORS = {
    "#5f8f55": { name: "\u62B9\u8336\u7EFF", light: "#5f8f55", dark: "#76a86c", soft: "#c8ddc2", darkSoft: "#31502f", hover: "#eef4ec", darkHover: "#2b382d", badge: "#e4f0e1", darkBadge: "#203422" },
    "#3b82f6": { name: "\u6674\u7A7A\u84DD", light: "#3b82f6", dark: "#6ea8fe", soft: "#bfdbfe", darkSoft: "#244a7a", hover: "#eff6ff", darkHover: "#27364a", badge: "#dbeafe", darkBadge: "#1e3048" },
    "#8b5cf6": { name: "\u96FE\u7D2B", light: "#8b5cf6", dark: "#b18cff", soft: "#ddd6fe", darkSoft: "#49327c", hover: "#f5f3ff", darkHover: "#332b45", badge: "#ede9fe", darkBadge: "#34234f" },
    "#e76f51": { name: "\u73CA\u745A\u6A59", light: "#e76f51", dark: "#ff9277", soft: "#fed0c6", darkSoft: "#7c3b2d", hover: "#fff3f0", darkHover: "#482d29", badge: "#ffe4de", darkBadge: "#4a2822" },
    "#d97706": { name: "\u6696\u7425\u73C0", light: "#d97706", dark: "#f5a623", soft: "#fed7aa", darkSoft: "#754b13", hover: "#fff8ed", darkHover: "#493722", badge: "#ffedd5", darkBadge: "#4b3216" },
    "#64748b": { name: "\u77F3\u58A8\u7070", light: "#64748b", dark: "#aab6c6", soft: "#cbd5e1", darkSoft: "#4a5565", hover: "#f1f5f9", darkHover: "#303740", badge: "#e2e8f0", darkBadge: "#29313b" }
  };
  var GOAL_COLORS = ["#9ca3af", "#fb7185", "#fb923c", "#fbbf24", "#4ade80", "#60a5fa", "#c084fc"];
  var DEFAULT_GOAL_COLOR = "#4ade80";
  function goalColor(goal) {
    return goal?.color && /^#[0-9a-f]{6}$/i.test(goal.color) ? goal.color.toLowerCase() : DEFAULT_GOAL_COLOR;
  }
  var SEARCH_TEMPLATES = [
    { hosts: ["zhihu.com", "www.zhihu.com"], template: "https://www.zhihu.com/search?type=content&q={q}" },
    { hosts: ["wikipedia.org", "zh.wikipedia.org", "en.wikipedia.org"], template: "https://zh.wikipedia.org/w/index.php?search={q}" },
    { hosts: ["csdn.net", "so.csdn.net"], template: "https://so.csdn.net/so/search?q={q}" },
    { hosts: ["juejin.cn"], template: "https://juejin.cn/search?query={q}" },
    { hosts: ["read.douban.com"], template: "https://read.douban.com/search?q={q}" },
    { hosts: ["medium.com"], template: "https://medium.com/search?q={q}" },
    { hosts: ["weixin.sogou.com"], template: "https://weixin.sogou.com/weixin?type=2&query={q}" }
  ];
  function resolveLinkedUrl(raw) {
    let url = (raw || "").trim();
    if (url && !/^https?:\/\//i.test(url)) url = "https://" + url;
    if (!url) return { url: "", usedTemplate: false };
    if (url.includes("{q}")) return { url, usedTemplate: false };
    let host = "";
    try {
      host = new URL(url).hostname.toLowerCase();
    } catch {
      return { url, usedTemplate: false };
    }
    const hasPath = new URL(url).pathname !== "/";
    if (!hasPath) {
      const tpl = SEARCH_TEMPLATES.find((t) => t.hosts.includes(host));
      if (tpl) return { url: tpl.template, usedTemplate: true };
    }
    return { url, usedTemplate: false };
  }
  function fmtDate(ts) {
    const d = new Date(ts);
    const now = /* @__PURE__ */ new Date();
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    if (d.toDateString() === now.toDateString()) return hh + ":" + mm;
    return d.getMonth() + 1 + "/" + d.getDate() + " " + hh + ":" + mm;
  }
  function highlightText(text, query) {
    if (!text || !query) return esc(text);
    const q = query.toLowerCase();
    const str = String(text);
    let result = "";
    let last = 0;
    for (let i = 0; i <= str.length - q.length; i++) {
      if (str.substring(i, i + q.length).toLowerCase() === q) {
        result += esc(str.substring(last, i)) + '<span class="sz-hl">' + esc(str.substring(i, i + q.length)) + "</span>";
        last = i + q.length;
        i = last - 1;
      }
    }
    result += esc(str.substring(last));
    return result;
  }
  function currentSuggestion(goals) {
    for (const g of goals) {
      if (g.status !== "active") continue;
      const todos = g.todos || [];
      for (const t of todos) {
        if (t.status === "open" && (t.coverage || 0) < 0.9) return { text: t.text, goal: g };
      }
      if (!todos.length) {
        const firstTask = g.tasks?.[0];
        return { text: firstTask ? firstTask.title : g.title, goal: g };
      }
    }
    return null;
  }
  function reorder(arr, fromId, toId) {
    const from = arr.findIndex((x) => x.id === fromId);
    const to = arr.findIndex((x) => x.id === toId);
    if (from < 0 || to < 0 || from === to) return;
    const [item] = arr.splice(from, 1);
    arr.splice(to, 0, item);
  }
  function saveSettings(patch) {
    Store.write(K.settings, Object.assign({}, settings(), patch));
  }
  var STORAGE_CATEGORY_LABELS = {
    goals: "\u76EE\u6807",
    records: "\u8BB0\u5F55",
    profile: "\u753B\u50CF",
    queue: "\u5206\u6790\u961F\u5217",
    settings: "\u8BBE\u7F6E",
    ui: "\u754C\u9762\u72B6\u6001",
    other: "\u5176\u4ED6\u62FE\u77E5\u6570\u636E"
  };
  function storageCategoryLabel(id) {
    return STORAGE_CATEGORY_LABELS[id];
  }
  function storageStatusLabel(status) {
    return status === "critical" ? "\u63A5\u8FD1\u4E0A\u9650" : status === "warning" ? "\u9700\u8981\u6CE8\u610F" : "\u7A7A\u95F4\u5145\u8DB3";
  }
  function storageStatusIcon(status) {
    return status === "normal" ? ICONS.statusCheck : ICONS.statusAlert;
  }
  function storagePercent(snapshot) {
    return Math.round(Math.min(1, snapshot.usageRatio) * 100);
  }
  var Panel = {
    tab: "goals",
    recQuery: "",
    recSort: "time",
    recGroup: null,
    // 组内视图：当前选中分组的 key，null 为总览
    recReturnTab: null,
    // 从目标树进入记录分组时，返回目标标签页
    recCollapsed: /* @__PURE__ */ new Set(),
    // 记录标签页折叠的分组 key
    collapsed: /* @__PURE__ */ new Set(),
    // 折叠的分类节点（"g:{id}" | "t:{id}"）
    expandAnimTimer: 0,
    expandAnim: null,
    editingGoal: null,
    // 正在内联编辑的目标 id
    editingPrompt: null,
    // 正在编辑分类提示词的节点 id
    colorGoalId: null,
    // 正在选择标识色的目标 id
    pendingDelete: null,
    aiDraft: null,
    // AI 拆解待确认结果
    todoOpen: false,
    exportOpen: false,
    themeColorOpen: false,
    storageManagerOpen: false,
    drag: null,
    root: null,
    pos: { x: 0, y: 0 },
    suppressFabClick: false,
    animTimer: 0,
    panelSize: null,
    cloneTab: "https",
    els: {},
    mount() {
      const host = document.createElement("div");
      host.id = "shizhi-host";
      const shadow = host.attachShadow({ mode: "open" });
      shadow.innerHTML = `<style>${panel_default}</style>${panel_default2.replace(/\{\{logo\}\}/g, `<img class="sz-fab-logo" src="${fab_logo_default}" alt="\u62FE\u77E5" draggable="false">`).replace(/\{\{bulb\}\}/g, ICONS.bulb).replace(/\{\{close\}\}/g, ICONS.x).replace(/\{\{download\}\}/g, ICONS.download).replace(/\{\{palette\}\}/g, ICONS.palette).replace(/\{\{sparkle\}\}/g, ICONS.sparkle)}`;
      document.documentElement.appendChild(host);
      this.root = shadow;
      this.els = {
        dock: shadow.querySelector(".sz-dock"),
        fab: shadow.querySelector(".sz-fab"),
        resize: shadow.querySelector(".sz-resize"),
        pending: shadow.querySelector('[data-role="pending"]'),
        panel: shadow.querySelector(".sz-panel"),
        body: shadow.querySelector(".sz-body"),
        toasts: shadow.querySelector(".sz-toasts"),
        toolbar: shadow.querySelector('[data-role="rec-toolbar"]'),
        rectools: shadow.querySelector(".sz-rectools"),
        sortBtn: shadow.querySelector('[data-act="rec-sort"]'),
        searchInput: shadow.querySelector('[data-role="rec-search"]'),
        modeButtons: Array.from(shadow.querySelectorAll('[data-act="panel-mode"]')),
        themeColorBtn: shadow.querySelector('[data-act="theme-color"]'),
        themeColorPop: shadow.querySelector('[data-role="theme-color-pop"]'),
        todoPop: shadow.querySelector('[data-role="todo-pop"]'),
        ctxmenu: shadow.querySelector('[data-role="ctxmenu"]'),
        tabBar: shadow.querySelector(".sz-tabs"),
        tabs: Array.from(shadow.querySelectorAll(".sz-tab")),
        themeBtn: shadow.querySelector('[data-act="theme"]')
      };
      const saved = Store.read(K.fabPos, null);
      if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) this.placeDock(saved.x, saved.y);
      else this.placeDock(window.innerWidth - 56, window.innerHeight - 56);
      addEventListener("resize", () => this.placeDock(this.pos.x, this.pos.y));
      const psz = Store.read(K.panelSize, null);
      if (psz && Number.isFinite(psz.w) && Number.isFinite(psz.h)) {
        this.panelSize = {
          w: clamp(psz.w, 280, Math.round(window.innerWidth * 0.9)),
          h: clamp(psz.h, 240, Math.round(window.innerHeight * 0.8))
        };
        this.applyPanelSize();
      }
      this.initDrag();
      this.initResize();
      this.initTheme();
      this.initThemeColor();
      this.recSort = Store.read(K.recSort, "time") === "rel" ? "rel" : "time";
      shadow.addEventListener("click", (e) => this.onClick(e));
      shadow.addEventListener("input", (e) => this.onInput(e));
      shadow.addEventListener("change", (e) => this.onChange(e));
      shadow.addEventListener("keydown", (e) => this.onKeydown(e));
      document.addEventListener("contextmenu", (e) => this.onContextMenu(e));
      document.addEventListener("click", (e) => {
        if (this.els.ctxmenu && this.els.ctxmenu.classList.contains("open")) this.hideCtxMenu();
        if (this.todoOpen && this.els.dock && !(e.composedPath && e.composedPath().includes(this.els.dock))) {
          this.todoOpen = false;
          this.renderTodo();
        }
      });
      shadow.addEventListener("dragstart", (e) => this.onDragStart(e));
      shadow.addEventListener("dragover", (e) => this.onDragOver(e));
      shadow.addEventListener("drop", (e) => this.onDrop(e));
      shadow.addEventListener("dragend", () => {
        this.drag = null;
        this.clearDragOver();
      });
      this.render();
    },
    onClick(e) {
      const target = e.target;
      const btn = target.closest("[data-act]");
      if (!btn) {
        if (this.exportOpen && !target.closest('[data-role="export-pop"]')) {
          this.exportOpen = false;
          this.renderExportPop();
        }
        if (this.colorGoalId && !target.closest('[data-role="goal-palette"]')) {
          this.colorGoalId = null;
          this.render();
        }
        if (this.themeColorOpen && !target.closest('[data-role="theme-color-pop"]')) {
          this.themeColorOpen = false;
          this.els.themeColorPop.classList.remove("open");
        }
        return;
      }
      const act = btn.dataset.act;
      if (this.colorGoalId && act !== "toggle-goal-color" && act !== "set-goal-color") {
        this.colorGoalId = null;
        this.root?.querySelector('[data-role="goal-palette"]')?.remove();
      }
      if (act === "fab") {
        if (!this.suppressFabClick) {
          this.els.panel.classList.toggle("open");
          if (this.todoOpen) {
            this.todoOpen = false;
            this.renderTodo();
          }
        }
      } else if (act === "close") this.els.panel.classList.remove("open");
      else if (act === "tab") {
        this.recReturnTab = null;
        this.switchTab(btn.dataset.tab);
      } else if (act === "export") {
        this.exportOpen = !this.exportOpen;
        this.renderExportPop();
      } else if (act === "export-selected") this.exportSelected();
      else if (act === "export-cancel") this.exportCancel();
      else if (act === "todo-bar") {
        this.todoOpen = !this.todoOpen;
        this.renderTodo();
        if (this.todoOpen) this.els.panel.classList.remove("open");
      } else if (act === "todo-close") {
        this.todoOpen = false;
        this.renderTodo();
      } else if (act === "copy-term") {
        this.copyText(btn.dataset.term || "");
        this.todoOpen = false;
        this.renderTodo();
      } else if (act === "search-term") {
        this.searchTerm(btn.dataset.term || "");
        this.todoOpen = false;
        this.renderTodo();
      } else if (act === "add-goal") this.addNode("goal", "");
      else if (act === "ai-parse-goal") this.parseGoalWithAI();
      else if (act === "edit-goal") this.editGoal(btn.dataset.id || "");
      else if (act === "save-goal-title") this.saveGoalTitle(btn.dataset.id || "");
      else if (act === "cancel-goal-title") {
        this.editingGoal = null;
        this.render();
      } else if (act === "edit-task") this.editTask(btn.dataset.id || "", btn.dataset.pid || "");
      else if (act === "edit-sub") this.editSub(btn.dataset.id || "", btn.dataset.pid || "");
      else if (act === "del-goal") this.askDelete("goal", btn.dataset.id || "", void 0, "\u5220\u9664\u8FD9\u4E2A\u76EE\u6807\uFF1F\u5DF2\u5F52\u6863\u7684\u8BB0\u5F55\u4F1A\u4FDD\u7559\u3002");
      else if (act === "del-task") this.askDelete("task", btn.dataset.id || "", btn.dataset.pid || "", "\u5220\u9664\u8FD9\u4E2A\u4EFB\u52A1\u53CA\u5176\u5B50\u4EFB\u52A1\uFF1F");
      else if (act === "del-sub") this.askDelete("subtask", btn.dataset.id || "", btn.dataset.pid || "", "\u5220\u9664\u8FD9\u4E2A\u5B50\u4EFB\u52A1\uFF1F");
      else if (act === "confirm-delete") this.confirmDelete();
      else if (act === "cancel-delete") {
        this.pendingDelete = null;
        this.render();
      } else if (act === "toggle-goal") this.toggleGoal(btn.dataset.id || "");
      else if (act === "toggle-node") this.toggleNode(btn.dataset.id || "");
      else if (act === "toggle-goal-color") {
        const id = btn.dataset.id || "";
        this.colorGoalId = this.colorGoalId === id ? null : id;
        this.render();
      } else if (act === "set-goal-color") this.setGoalColor(btn.dataset.id || "", btn.dataset.color || "");
      else if (act === "edit-prompt") {
        const id = btn.dataset.id || "";
        this.editingPrompt = id;
        this.render();
        this.resizePromptInput(id);
      } else if (act === "prompt-save") this.savePrompt(btn.dataset.pkind, btn.dataset.id || "");
      else if (act === "prompt-cancel") {
        this.editingPrompt = null;
        this.render();
      } else if (act === "ai-confirm") this.confirmAiDraft();
      else if (act === "ai-cancel") this.cancelAiDraft();
      else if (act === "ai-reparse") this.reparseGoalWithAI();
      else if (act === "goto-rec") this.gotoGroup(btn.dataset.id || "", btn.dataset.kind || "");
      else if (act === "retry") this.retryRecord(btn.dataset.rid || "");
      else if (act === "rec-sort") {
        const sort = btn.dataset.sort;
        if (sort && sort !== this.recSort) {
          this.recSort = sort;
          Store.write(K.recSort, this.recSort);
          this.render();
        }
      } else if (act === "enter-group") this.enterGroup(btn.dataset.key);
      else if (act === "leave-group") this.leaveGroup();
      else if (act === "expand") this.toggleRecordDetail(btn);
      else if (act === "toggle-rec-group") this.toggleRecGroup(btn.dataset.key);
      else if (act === "del-record") this.askDelete("record", btn.dataset.key || "", void 0, "\u786E\u5B9A\u5220\u9664\u8FD9\u6761\u8BB0\u5F55\uFF1F\u6B64\u64CD\u4F5C\u4E0D\u53EF\u6062\u590D\u3002");
      else if (act === "theme") this.toggleTheme();
      else if (act === "theme-color") {
        this.themeColorOpen = !this.themeColorOpen;
        this.els.themeColorPop.classList.toggle("open", this.themeColorOpen);
      } else if (act === "set-theme-color") this.setThemeColor(btn.dataset.color || DEFAULT_THEME_COLOR);
      else if (act === "reset-theme-color") this.setThemeColor(DEFAULT_THEME_COLOR);
      else if (act === "panel-mode") this.setPanelMode(btn.dataset.mode === "slacking" ? "slacking" : "work");
      else if (act === "storage-manage") this.openStorageManager();
      else if (act === "storage-close") this.closeStorageManager();
      else if (act === "storage-refresh") this.render();
      else if (act === "storage-limit") this.saveStorageLimit(btn.dataset.value || "");
      else if (act === "storage-category") this.manageStorageCategory(btn.dataset.category);
      else if (act === "reset-prompt") this.resetPrompt();
      else if (act === "clear-selected") this.clearSelected();
      else if (act === "ai-linked") this.aiFillLinkedUrl();
      else if (act === "save-settings") this.saveSettings();
      else if (act === "clone-tab") {
        this.cloneTab = btn.dataset.tab || "https";
        this.renderSettings();
      } else if (act === "copy-clone") this.copyText(btn.dataset.cmd || "");
      else if (act === "help") this.showHelp();
      else if (act === "add-profile") this.addProfile();
      else if (act === "del-profile") {
        const kind = btn.dataset.kind;
        const id = kind + ":" + (btn.dataset.idx || "0");
        this.askDelete("profile", id, void 0, "\u5220\u9664\u8FD9\u6761\u753B\u50CF\u4FE1\u606F\uFF1F");
      } else if (act === "ask-dsh") this.askSelectionToDsh();
      else if (act === "toggle-ask-dsh") {
        const askDsh2 = !settings().askDsh;
        saveSettings({ askDsh: askDsh2 });
        btn.classList.toggle("on", askDsh2);
        btn.setAttribute("aria-checked", String(askDsh2));
      } else if (act === "toggle-autocomplete") {
        const autocomplete = !settings().autocomplete;
        saveSettings({ autocomplete });
        btn.classList.toggle("on", autocomplete);
        btn.setAttribute("aria-checked", String(autocomplete));
        window.dispatchEvent(new Event("shizhi-settings-changed"));
      }
    },
    onInput(e) {
      const t = e.target;
      if (t.matches('[data-role="rec-search"]')) {
        this.recQuery = t.value;
        this.renderRecords();
      } else if (t.matches(".sz-prompt-input")) this.resizePromptInput(void 0, t);
    },
    onChange(e) {
      const t = e.target;
      if (t.matches('[data-role="dsh-url"]')) {
        const v = t.value.trim();
        try {
          const url = new URL(v || DSH_URL);
          if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("invalid protocol");
          const normalized = v || DSH_URL;
          t.value = normalized;
          saveSettings({ dshUrl: normalized });
        } catch {
          t.value = settings().dshUrl;
          this.toast("DeepSeek Harness \u670D\u52A1\u5730\u5740\u9700\u4E3A http(s) URL\u3002", "err");
        }
      } else if (t.matches('[data-role="linked-url"]')) {
        const v = t.value.trim();
        saveSettings({ linkedUrl: v });
        if (v) this.linkedUrlNotice(v);
      } else if (t.matches('[data-role="goal-color-input"]')) {
        this.setGoalColor(t.dataset.id || "", t.value);
      } else if (t.matches('[data-role="theme-color-input"]')) {
        this.setThemeColor(t.value);
      }
    },
    onKeydown(e) {
      const t = e.target;
      if (e.key === "Enter") {
        if (t.matches('[data-role="goal-input"]')) {
          if (typeof window.LLMBridge !== "undefined") this.parseGoalWithAI();
          else this.addNode("goal", "");
        } else if (t.matches('[data-role="goal-title-input"]')) this.saveGoalTitle(t.dataset.id || "");
        else if (t.matches('[data-role="task-input"]')) this.addNode("task", t.dataset.pid || "");
        else if (t.matches('[data-role="sub-input"]')) this.addNode("subtask", t.dataset.pid || "");
      } else if (e.key === "Escape") {
        if (this.exportOpen) {
          this.exportOpen = false;
          this.renderExportPop();
        }
        if (this.todoOpen) {
          this.todoOpen = false;
          this.renderTodo();
        }
        if (this.colorGoalId) {
          this.colorGoalId = null;
          this.render();
        }
        if (this.editingGoal) {
          this.editingGoal = null;
          this.render();
        }
      }
    },
    resizePromptInput(id, target) {
      const fields = target ? [target] : Array.from(this.root?.querySelectorAll(id ? `[data-role="prompt-input"][data-id="${id}"]` : ".sz-prompt-input") || []);
      for (const field of fields) {
        field.style.height = "auto";
        const height = Math.min(Math.max(field.scrollHeight, 38), 120);
        field.style.height = height + "px";
        field.style.overflowY = height >= 120 ? "auto" : "hidden";
      }
    },
    // ---- 目标三级树 ----
    addNode(kind, parentId) {
      const goals = Store.read(K.goals, []);
      if (kind === "goal") {
        const input = this.root.querySelector('[data-role="goal-input"]');
        const title = (input?.value || "").trim();
        if (!title) return;
        goals.unshift({ id: uid("g"), title, status: "active", createdAt: Date.now(), prompt: "", tasks: [], todos: [] });
        Store.write(K.goals, goals);
        if (input) input.value = "";
      } else if (kind === "task") {
        const g = goals.find((x) => x.id === parentId);
        const input = this.root.querySelector(`[data-role="task-input"][data-pid="${parentId}"]`);
        const title = (input?.value || "").trim();
        if (!g || !title) return;
        g.tasks = g.tasks || [];
        const taskId = uid("t");
        g.tasks.push({ id: taskId, title, prompt: "", subtasks: [] });
        g.todos = g.todos || [];
        g.todos.push({ id: uid("todo"), text: title, taskId, contrib: {}, coverage: 0, status: "open", manual: false });
        Store.write(K.goals, goals);
        if (input) input.value = "";
      } else {
        const g = goals.find((x) => x.id === parentId);
        const input = this.root.querySelector(`[data-role="sub-input"][data-pid="${parentId}"]`);
        const title = (input?.value || "").trim();
        if (!g || !title) return;
        const task = (g.tasks || []).find((t) => t.id === input?.dataset.task);
        if (!task) return;
        task.subtasks = task.subtasks || [];
        task.subtasks.push({ id: uid("s"), title, prompt: "" });
        Store.write(K.goals, goals);
        if (input) input.value = "";
      }
      this.render();
      onLocationChange();
    },
    async parseGoalWithAI() {
      const input = this.root.querySelector('[data-role="goal-input"]');
      const text = (input?.value || "").trim();
      if (!text) {
        this.toast("\u8BF7\u5148\u8F93\u5165\u76EE\u6807\u9700\u6C42", "idle");
        return;
      }
      const bridge = window.LLMBridge;
      if (!bridge) {
        this.toast("AI \u6682\u4E0D\u53EF\u7528\uFF08\u672A\u68C0\u6D4B\u5230 LLMBridge\uFF09\u3002\u8BF7\u624B\u52A8\u586B\u5199\u76EE\u6807\u540D\u79F0\u540E\u56DE\u8F66\u521B\u5EFA\u3002", "err");
        return;
      }
      this.toast("AI \u6B63\u5728\u62C6\u89E3\u9700\u6C42\u2026", "idle");
      try {
        const raw = await bridge.chat(
          '\u4F60\u662F\u76EE\u6807\u62C6\u89E3\u4E13\u5BB6\u3002\u7528\u6237\u4F1A\u7ED9\u4F60\u4E00\u53E5\u6A21\u7CCA\u7684\u5DE5\u4F5C\u9700\u6C42\uFF0C\u4F60\u8981\u628A\u5B83\u62C6\u6210\u4E00\u4E2A\u6E05\u6670\u76EE\u6807\uFF0C\u5E76\u62C6\u6210\u51E0\u6761\u660E\u786E\u7684"\u4EFB\u52A1"\uFF08\u5FC5\u8981\u65F6\u518D\u62C6"\u5B50\u4EFB\u52A1"\uFF09\uFF0C\u540C\u65F6\u4E3A\u6BCF\u4E2A\u5C42\u7EA7\u5199\u4E00\u6BB5\u7CBE\u51C6\u7684\u5B9A\u4E49\u63D0\u793A\u8BCD\uFF0C\u4F9B\u5206\u7C7B AI \u636E\u6B64\u5224\u65AD"\u4E00\u6761\u7F51\u9875\u8BB0\u5F55\u662F\u5426\u5C5E\u4E8E\u8FD9\u4E2A\u5206\u7C7B"\u3002\n\n[\u4EFB\u52A1\u7684\u5B9A\u4E49]\n\u4EFB\u52A1\u662F\u660E\u786E\u3001\u53EF\u6301\u7EED\u6267\u884C\u7684\u6536\u96C6\u65B9\u5411\uFF0C\u50CF\u5DE5\u4F5C\u6D41\u91CC\u7684\u4E00\u4E2A\u6B65\u9AA4\u3002\u547D\u540D\u7528"\u52A8\u4F5C+\u5BF9\u8C61+\u76EE\u7684"\uFF0C\u52A8\u8BCD\u5F00\u5934\uFF0C\u4F8B\u5982\uFF1A"\u67E5\u770B\u6700\u8FD1 AI \u65B0\u95FB\u4E86\u89E3\u65B0\u6280\u672F/\u4EA7\u54C1"\u3001"\u68C0\u67E5\u6700\u65B0\u8BBA\u6587\u4E86\u89E3\u6280\u672F\u7EC6\u8282"\u3001"\u6D4F\u89C8\u65B0\u4EA7\u54C1\u76F8\u5173\u793E\u533A\u5E16\u5B50"\u3002\n\u4E0B\u9762\u8FD9\u4E9B\u4E0D\u8981\u5F53\u6210\u4EFB\u52A1\uFF1A\u5143\u4EFB\u52A1\u6216\u5F85\u786E\u8BA4\u9879\uFF08\u5982"\u786E\u5B9A\u6536\u96C6\u65B9\u5411""\u68B3\u7406\u601D\u8DEF""\u8865\u5145\u4FE1\u606F"\uFF09\uFF0C\u8FD9\u4E9B\u5C5E\u4E8E\u9700\u8981\u5411\u7528\u6237\u8FFD\u95EE\u6F84\u6E05\u7684\u95EE\u9898\uFF0C\u5E94\u5199\u8FDB questions\uFF1B\u4E0E\u4FE1\u606F\u6536\u96C6\u65E0\u5173\u7684\u884C\u653F\u52A8\u4F5C\u3002\n\n[\u5B9A\u4E49\u63D0\u793A\u8BCD\uFF08prompt\uFF09\u7684\u5199\u6CD5]\n\u6BCF\u4E00\u5C42 prompt \u90FD\u8981\u5177\u4F53\u5230\u80FD\u8BA9\u5206\u7C7B AI \u4E00\u773C\u5224\u65AD"\u67D0\u6761\u7F51\u9875\u8BB0\u5F55\u662F\u5426\u5C5E\u4E8E\u5B83"\uFF1A\u5199\u6E05\u695A\u5173\u6CE8\u4EC0\u4E48\u4E3B\u9898\u3001\u542B\u54EA\u4E9B\u5173\u952E\u8BCD\u3001\u4EC0\u4E48\u7B97\u76F8\u5173\u3001\u4EC0\u4E48\u4E0D\u7B97\uFF08\u8FB9\u754C\uFF09\u3001\u5178\u578B\u6765\u6E90\u3002\u76EE\u6807\u7EA7\u5199\u6574\u4F53\u8303\u56F4\uFF0C\u4EFB\u52A1\u7EA7\u5199\u8BE5\u65B9\u5411\u7684\u7EC6\u5206\u8303\u56F4\uFF0C\u5B50\u4EFB\u52A1\u7EA7\u5199\u6700\u7EC6\u8FB9\u754C\u548C\u5173\u952E\u8BCD\u3002\u7981\u6B62\u7A7A\u8BDD\uFF08\u5982"\u6536\u96C6\u76F8\u5173\u4FE1\u606F"\uFF09\u3002\n\n[\u8F93\u51FA\u683C\u5F0F]\n\u53EA\u8F93\u51FA JSON\uFF08\u4E0D\u8981\u5176\u4ED6\u5185\u5BB9\uFF09\uFF1A\n{"title":"\u76EE\u6807\u540D\u79F0(<=20\u5B57)","prompt":"\u76EE\u6807\u7EA7\u5B9A\u4E49\u63D0\u793A\u8BCD","questions":["\u9700\u8981\u5411\u7528\u6237\u6F84\u6E05\u7684\u95EE\u9898"],"tasks":[{"title":"\u4EFB\u52A1\u540D","prompt":"\u4EFB\u52A1\u7EA7\u5B9A\u4E49\u63D0\u793A\u8BCD","searchTerms":[{"display":"\u663E\u793A\u6807\u7B7E","query":"\u5B8C\u6574\u641C\u7D22\u8868\u8FBE\u5F0F"}],"subtasks":[{"title":"\u5B50\u4EFB\u52A1\u540D","prompt":"\u5B50\u4EFB\u52A1\u7EA7\u5B9A\u4E49\u63D0\u793A\u8BCD"}]}]}\n\n[\u89C4\u5219]\n1. \u4EFB\u52A1\u6700\u591A 4 \u4E2A\uFF0C\u6BCF\u4E2A\u4EFB\u52A1\u5B50\u4EFB\u52A1\u6700\u591A 3 \u4E2A\u3002\n2. \u9700\u6C42\u8DB3\u591F\u660E\u786E\u65F6 questions \u8FD4\u56DE\u7A7A\u6570\u7EC4 []\u3002\n3. \u9700\u6C42\u6A21\u7CCA\u65F6\u628A"\u8BE5\u95EE\u7528\u6237\u4EC0\u4E48"\u5199\u8FDB questions\uFF0C\u4E0D\u8981\u786C\u62C6\u6210\u4EFB\u52A1\u3002\n4. \u540D\u79F0\u7B80\u6D01\uFF0Cprompt \u5177\u4F53\uFF0C\u4E0D\u5199\u7A7A\u8BDD\u3002\n5. \u6BCF\u4E2A\u4EFB\u52A1\u751F\u6210 1-3 \u4E2A\u641C\u7D22\u8BCD\uFF08searchTerms\uFF09\uFF0C\u6BCF\u4E2A\u641C\u7D22\u8BCD\u5305\u542B\u4E24\u5C42\uFF1A\n   - display\uFF1AUI \u663E\u793A\u6807\u7B7E\uFF0C8 \u5B57\u4EE5\u5185\uFF0C\u7B80\u6D01\u660E\u4E86\uFF08\u5982"AI\u5E94\u7528\u6848\u4F8B"\uFF09\u3002\n   - query\uFF1A\u5B9E\u9645\u590D\u5236/\u641C\u7D22\u65F6\u4F7F\u7528\u7684\u5B8C\u6574\u8868\u8FBE\u5F0F\u3002\u5B66\u672F\u573A\u666F\u7528\u5E03\u5C14\u8FD0\u7B97\u7B26\uFF08\u5F15\u53F7\u7CBE\u786E\u5339\u914D\u3001AND/OR \u7EC4\u5408\u3001\u51CF\u53F7\u6392\u9664\uFF09\uFF1B\u901A\u7528\u641C\u7D22\u7528\u81EA\u7136\u8BED\u8A00\u5B8C\u6574\u95EE\u53E5\u3002\n   \u641C\u7D22\u8BCD\u8981\u8D34\u5408\u4EFB\u52A1\u5185\u5BB9\uFF0C\u4E0D\u540C\u4EFB\u52A1\u5E94\u6709\u5DEE\u5F02\u3002\n\n\u9700\u6C42\uFF1A' + text,
          "json"
        );
        const obj = JSON.parse(raw);
        const title = String(obj.title || text).trim().slice(0, 40) || text.slice(0, 40);
        const questions = (Array.isArray(obj.questions) ? obj.questions : []).map((q) => String(q).trim()).filter(Boolean).slice(0, 5);
        const tasks = (Array.isArray(obj.tasks) ? obj.tasks : []).slice(0, 4).map((t) => ({
          id: uid("t"),
          title: String(t.title || "").trim().slice(0, 40) || "\u672A\u547D\u540D\u4EFB\u52A1",
          prompt: typeof t.prompt === "string" ? t.prompt : "",
          searchTerms: (Array.isArray(t.searchTerms) ? t.searchTerms : []).map((s) => {
            if (s && typeof s === "object" && !Array.isArray(s)) {
              const so = s;
              return { display: String(so.display || "").trim(), query: String(so.query || "").trim() };
            }
            return String(s).trim();
          }).filter((s) => typeof s === "string" ? s : s.display || s.query).slice(0, 3).map((s) => enrichSearchTerm(normalizeSearchTerm(s))),
          subtasks: (Array.isArray(t.subtasks) ? t.subtasks : []).slice(0, 3).map((s) => ({
            id: uid("s"),
            title: String(s.title || "").trim().slice(0, 40) || "\u672A\u547D\u540D\u5B50\u4EFB\u52A1",
            prompt: typeof s.prompt === "string" ? s.prompt : ""
          }))
        }));
        this.aiDraft = {
          title,
          prompt: typeof obj.prompt === "string" ? obj.prompt : "",
          tasks,
          questions,
          originalText: text
        };
        if (input) input.value = "";
        this.render();
        this.toast("AI \u5DF2\u62C6\u89E3\uFF0C\u8BF7\u786E\u8BA4\u6216\u4FEE\u6539\u540E\u521B\u5EFA", "idle");
      } catch (err) {
        this.toast("AI \u62C6\u89E3\u5931\u8D25\uFF1A" + String(err), "err");
      }
    },
    async reparseGoalWithAI() {
      const d = this.aiDraft;
      if (!d || !d.questions.length) return;
      const bridge = window.LLMBridge;
      if (!bridge) {
        this.toast("AI \u6682\u4E0D\u53EF\u7528\uFF08\u672A\u68C0\u6D4B\u5230 LLMBridge\uFF09\u3002", "err");
        return;
      }
      const answers = [];
      for (let i = 0; i < d.questions.length; i++) {
        const el = this.root.querySelector(`[data-ai-answer="${i}"]`);
        answers.push((el?.value || "").trim());
      }
      const context = d.questions.map((q, i) => `Q: ${q}
A: ${answers[i] || "\u672A\u56DE\u7B54"}`).join("\n\n");
      this.toast("AI \u6B63\u5728\u91CD\u65B0\u62C6\u89E3\u2026", "idle");
      try {
        const raw = await bridge.chat(
          '\u4F60\u662F\u76EE\u6807\u62C6\u89E3\u4E13\u5BB6\u3002\u7528\u6237\u4E4B\u524D\u6709\u9700\u6C42\uFF0C\u4F60\u63D0\u51FA\u4E86\u4E00\u4E9B\u6F84\u6E05\u95EE\u9898\uFF0C\u7528\u6237\u5DF2\u56DE\u7B54\u3002\u8BF7\u7ED3\u5408\u539F\u59CB\u9700\u6C42\u548C\u7528\u6237\u56DE\u7B54\uFF0C\u91CD\u65B0\u62C6\u89E3\u6210\u76EE\u6807\u3001\u4EFB\u52A1\u3001\u5B50\u4EFB\u52A1\uFF0C\u5E76\u4E3A\u6BCF\u4E2A\u5C42\u7EA7\u751F\u6210\u7CBE\u51C6\u7684\u5B9A\u4E49\u63D0\u793A\u8BCD\uFF0C\u4F9B\u5206\u7C7B AI \u636E\u6B64\u5224\u65AD"\u4E00\u6761\u7F51\u9875\u8BB0\u5F55\u662F\u5426\u5C5E\u4E8E\u8FD9\u4E2A\u5206\u7C7B"\u3002\n\n[\u539F\u59CB\u9700\u6C42]\n' + d.originalText + "\n\n[\u7528\u6237\u56DE\u7B54]\n" + context + '\n\n[\u4EFB\u52A1\u7684\u5B9A\u4E49]\n\u4EFB\u52A1\u662F\u660E\u786E\u3001\u53EF\u6301\u7EED\u6267\u884C\u7684\u6536\u96C6\u65B9\u5411\uFF0C\u50CF\u5DE5\u4F5C\u6D41\u91CC\u7684\u4E00\u4E2A\u6B65\u9AA4\u3002\u547D\u540D\u7528"\u52A8\u4F5C+\u5BF9\u8C61+\u76EE\u7684"\uFF0C\u52A8\u8BCD\u5F00\u5934\uFF0C\u4F8B\u5982\uFF1A"\u67E5\u770B\u6700\u8FD1 AI \u65B0\u95FB\u4E86\u89E3\u65B0\u6280\u672F/\u4EA7\u54C1"\u3001"\u68C0\u67E5\u6700\u65B0\u8BBA\u6587\u4E86\u89E3\u6280\u672F\u7EC6\u8282"\u3001"\u6D4F\u89C8\u65B0\u4EA7\u54C1\u76F8\u5173\u793E\u533A\u5E16\u5B50"\u3002\n\u4E0B\u9762\u8FD9\u4E9B\u4E0D\u8981\u5F53\u6210\u4EFB\u52A1\uFF1A\u5143\u4EFB\u52A1\u6216\u5F85\u786E\u8BA4\u9879\uFF08\u5982"\u786E\u5B9A\u6536\u96C6\u65B9\u5411""\u68B3\u7406\u601D\u8DEF""\u8865\u5145\u4FE1\u606F"\uFF09\uFF0C\u8FD9\u4E9B\u5C5E\u4E8E\u9700\u8981\u5411\u7528\u6237\u8FFD\u95EE\u6F84\u6E05\u7684\u95EE\u9898\uFF0C\u5E94\u5199\u8FDB questions\uFF1B\u4E0E\u4FE1\u606F\u6536\u96C6\u65E0\u5173\u7684\u884C\u653F\u52A8\u4F5C\u3002\n\n[\u5B9A\u4E49\u63D0\u793A\u8BCD\uFF08prompt\uFF09\u7684\u5199\u6CD5]\n\u6BCF\u4E00\u5C42 prompt \u90FD\u8981\u5177\u4F53\u5230\u80FD\u8BA9\u5206\u7C7B AI \u4E00\u773C\u5224\u65AD"\u67D0\u6761\u7F51\u9875\u8BB0\u5F55\u662F\u5426\u5C5E\u4E8E\u5B83"\uFF1A\u5199\u6E05\u695A\u5173\u6CE8\u4EC0\u4E48\u4E3B\u9898\u3001\u542B\u54EA\u4E9B\u5173\u952E\u8BCD\u3001\u4EC0\u4E48\u7B97\u76F8\u5173\u3001\u4EC0\u4E48\u4E0D\u7B97\uFF08\u8FB9\u754C\uFF09\u3001\u5178\u578B\u6765\u6E90\u3002\u76EE\u6807\u7EA7\u5199\u6574\u4F53\u8303\u56F4\uFF0C\u4EFB\u52A1\u7EA7\u5199\u8BE5\u65B9\u5411\u7684\u7EC6\u5206\u8303\u56F4\uFF0C\u5B50\u4EFB\u52A1\u7EA7\u5199\u6700\u7EC6\u8FB9\u754C\u548C\u5173\u952E\u8BCD\u3002\u7981\u6B62\u7A7A\u8BDD\uFF08\u5982"\u6536\u96C6\u76F8\u5173\u4FE1\u606F"\uFF09\u3002\n\n[\u8F93\u51FA\u683C\u5F0F]\n\u53EA\u8F93\u51FA JSON\uFF08\u4E0D\u8981\u5176\u4ED6\u5185\u5BB9\uFF09\uFF1A\n{"title":"\u76EE\u6807\u540D\u79F0(<=20\u5B57)","prompt":"\u76EE\u6807\u7EA7\u5B9A\u4E49\u63D0\u793A\u8BCD","questions":["\u9700\u8981\u5411\u7528\u6237\u6F84\u6E05\u7684\u95EE\u9898"],"tasks":[{"title":"\u4EFB\u52A1\u540D","prompt":"\u4EFB\u52A1\u7EA7\u5B9A\u4E49\u63D0\u793A\u8BCD","searchTerms":[{"display":"\u663E\u793A\u6807\u7B7E","query":"\u5B8C\u6574\u641C\u7D22\u8868\u8FBE\u5F0F"}],"subtasks":[{"title":"\u5B50\u4EFB\u52A1\u540D","prompt":"\u5B50\u4EFB\u52A1\u7EA7\u5B9A\u4E49\u63D0\u793A\u8BCD"}]}]}\n\n[\u89C4\u5219]\n1. \u4EFB\u52A1\u6700\u591A 4 \u4E2A\uFF0C\u6BCF\u4E2A\u4EFB\u52A1\u5B50\u4EFB\u52A1\u6700\u591A 3 \u4E2A\u3002\n2. \u9700\u6C42\u8DB3\u591F\u660E\u786E\u65F6 questions \u8FD4\u56DE\u7A7A\u6570\u7EC4 []\u3002\n3. \u9700\u6C42\u6A21\u7CCA\u65F6\u628A"\u8BE5\u95EE\u7528\u6237\u4EC0\u4E48"\u5199\u8FDB questions\uFF0C\u4E0D\u8981\u786C\u62C6\u6210\u4EFB\u52A1\u3002\n4. \u540D\u79F0\u7B80\u6D01\uFF0Cprompt \u5177\u4F53\uFF0C\u4E0D\u5199\u7A7A\u8BDD\u3002\n5. \u6BCF\u4E2A\u4EFB\u52A1\u751F\u6210 1-3 \u4E2A\u641C\u7D22\u8BCD\uFF08searchTerms\uFF09\uFF0C\u6BCF\u4E2A\u641C\u7D22\u8BCD\u5305\u542B\u4E24\u5C42\uFF1A\n   - display\uFF1AUI \u663E\u793A\u6807\u7B7E\uFF0C8 \u5B57\u4EE5\u5185\uFF0C\u7B80\u6D01\u660E\u4E86\u3002\n   - query\uFF1A\u5B9E\u9645\u590D\u5236/\u641C\u7D22\u65F6\u4F7F\u7528\u7684\u5B8C\u6574\u8868\u8FBE\u5F0F\u3002\u5B66\u672F\u573A\u666F\u7528\u5E03\u5C14\u8FD0\u7B97\u7B26\uFF08\u5F15\u53F7\u7CBE\u786E\u5339\u914D\u3001AND/OR \u7EC4\u5408\u3001\u51CF\u53F7\u6392\u9664\uFF09\uFF1B\u901A\u7528\u641C\u7D22\u7528\u81EA\u7136\u8BED\u8A00\u5B8C\u6574\u95EE\u53E5\u3002\n   \u641C\u7D22\u8BCD\u8981\u8D34\u5408\u4EFB\u52A1\u5185\u5BB9\uFF0C\u4E0D\u540C\u4EFB\u52A1\u5E94\u6709\u5DEE\u5F02\u3002',
          "json"
        );
        const obj = JSON.parse(raw);
        const title = String(obj.title || d.originalText).trim().slice(0, 40) || d.originalText.slice(0, 40);
        const questions = (Array.isArray(obj.questions) ? obj.questions : []).map((q) => String(q).trim()).filter(Boolean).slice(0, 5);
        const tasks = (Array.isArray(obj.tasks) ? obj.tasks : []).slice(0, 4).map((t) => ({
          id: uid("t"),
          title: String(t.title || "").trim().slice(0, 40) || "\u672A\u547D\u540D\u4EFB\u52A1",
          prompt: typeof t.prompt === "string" ? t.prompt : "",
          searchTerms: (Array.isArray(t.searchTerms) ? t.searchTerms : []).map((s) => {
            if (s && typeof s === "object" && !Array.isArray(s)) {
              const so = s;
              return { display: String(so.display || "").trim(), query: String(so.query || "").trim() };
            }
            return String(s).trim();
          }).filter((s) => typeof s === "string" ? s : s.display || s.query).slice(0, 3).map((s) => enrichSearchTerm(normalizeSearchTerm(s))),
          subtasks: (Array.isArray(t.subtasks) ? t.subtasks : []).slice(0, 3).map((s) => ({
            id: uid("s"),
            title: String(s.title || "").trim().slice(0, 40) || "\u672A\u547D\u540D\u5B50\u4EFB\u52A1",
            prompt: typeof s.prompt === "string" ? s.prompt : ""
          }))
        }));
        this.aiDraft = {
          title,
          prompt: typeof obj.prompt === "string" ? obj.prompt : "",
          tasks,
          questions,
          originalText: d.originalText
        };
        this.render();
        this.toast("AI \u5DF2\u91CD\u65B0\u62C6\u89E3\uFF0C\u8BF7\u786E\u8BA4\u6216\u4FEE\u6539\u540E\u521B\u5EFA", "idle");
      } catch (err) {
        this.toast("AI \u91CD\u65B0\u62C6\u89E3\u5931\u8D25\uFF1A" + String(err), "err");
      }
    },
    editGoal(id) {
      if (!Store.read(K.goals, []).some((g) => g.id === id)) return;
      this.editingGoal = id;
      this.render();
      const input = this.root?.querySelector(`[data-role="goal-title-input"][data-id="${id}"]`);
      input?.focus();
      input?.select();
    },
    saveGoalTitle(id) {
      const input = this.root?.querySelector(`[data-role="goal-title-input"][data-id="${id}"]`);
      const title = (input?.value || "").trim();
      if (!title) return;
      const goals = Store.read(K.goals, []);
      const g = goals.find((x) => x.id === id);
      if (!g) return;
      g.title = title;
      Store.write(K.goals, goals);
      this.editingGoal = null;
      this.render();
    },
    editTask(id, goalId) {
      const goals = Store.read(K.goals, []);
      const g = goals.find((x) => x.id === goalId);
      const task = g?.tasks?.find((x) => x.id === id);
      if (!task) return;
      const title = prompt("\u4EFB\u52A1\u540D\u79F0", task.title);
      if (title == null) return;
      const t = title.trim();
      if (!t) return;
      task.title = t;
      Store.write(K.goals, goals);
      this.render();
    },
    editSub(id, goalId) {
      const goals = Store.read(K.goals, []);
      const g = goals.find((x) => x.id === goalId);
      let found = null;
      for (const task of g?.tasks || []) found = task.subtasks?.find((x) => x.id === id) || found;
      if (!found) return;
      const title = prompt("\u5B50\u4EFB\u52A1\u540D\u79F0", found.title);
      if (title == null) return;
      const t = title.trim();
      if (!t) return;
      found.title = t;
      Store.write(K.goals, goals);
      this.render();
    },
    toggleGoal(id) {
      const goals = Store.read(K.goals, []);
      const g = goals.find((x) => x.id === id);
      if (!g) return;
      g.status = g.status === "active" ? "done" : "active";
      Store.write(K.goals, goals);
      this.render();
    },
    setGoalColor(id, color) {
      if (!/^#[0-9a-f]{6}$/i.test(color)) return;
      const goals = Store.read(K.goals, []);
      const g = goals.find((x) => x.id === id);
      if (!g) return;
      g.color = color.toLowerCase();
      Store.write(K.goals, goals);
      this.colorGoalId = null;
      this.render();
    },
    // 折叠/展开分类节点（key = "g:{id}" | "t:{id}"）
    prefersReducedMotion() {
      return !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    },
    prepareCollapse(element) {
      element.classList.remove("sz-expand-enter");
      element.style.setProperty("--collapse-size", `${element.scrollHeight}px`);
      element.classList.add("sz-collapse-leave");
    },
    prepareExpandAnimations() {
      this.root?.querySelectorAll(".sz-expand-enter").forEach((element) => {
        element.style.setProperty("--collapse-size", `${element.scrollHeight}px`);
        const finish = () => {
          element.classList.remove("sz-expand-enter");
          element.style.removeProperty("--collapse-size");
        };
        if (this.prefersReducedMotion()) finish();
        else element.addEventListener("animationend", finish, { once: true });
      });
    },
    toggleNode(key) {
      if (this.collapsed.has(key)) {
        this.collapsed.delete(key);
        this.expandAnim = key;
        this.render();
        window.clearTimeout(this.expandAnimTimer);
        this.expandAnimTimer = window.setTimeout(() => {
          this.expandAnim = null;
        }, 260);
        return;
      }
      const [, id] = key.split(":");
      const row = this.root?.querySelector(`.sz-row[data-id="${id}"]`);
      const children = row?.nextElementSibling?.classList.contains("sz-children") ? row.nextElementSibling : null;
      if (!children) {
        this.collapsed.add(key);
        this.render();
        return;
      }
      this.prepareCollapse(children);
      window.setTimeout(() => {
        this.collapsed.add(key);
        this.render();
      }, this.prefersReducedMotion() ? 0 : 210);
    },
    // 保存分类提示词（分类定义）
    savePrompt(kind, id) {
      const ta = this.root.querySelector(`[data-role="prompt-input"][data-id="${id}"]`);
      const value = (ta?.value || "").trim();
      const goals = Store.read(K.goals, []);
      if (kind === "goal") {
        const g = goals.find((x) => x.id === id);
        if (g) g.prompt = value;
      } else if (kind === "task") {
        for (const g of goals) {
          const t = (g.tasks || []).find((x) => x.id === id);
          if (t) {
            t.prompt = value;
            break;
          }
        }
      } else {
        for (const g of goals) {
          for (const t of g.tasks || []) {
            const s = (t.subtasks || []).find((x) => x.id === id);
            if (s) {
              s.prompt = value;
              break;
            }
          }
        }
      }
      Store.write(K.goals, goals);
      this.editingPrompt = null;
      this.render();
    },
    // 确认 AI 拆解结果并创建目标
    confirmAiDraft() {
      const d = this.aiDraft;
      if (!d) return;
      const root = this.root;
      const title = root.querySelector("[data-ai-title]")?.value?.trim() || "\u672A\u547D\u540D\u76EE\u6807";
      const prompt2 = root.querySelector("[data-ai-prompt]")?.value?.trim() || "";
      const tasks = d.tasks.map((t, i) => {
        const tEl = root.querySelector(`[data-ai-task-title="${i}"]`);
        const pEl = root.querySelector(`[data-ai-task-prompt="${i}"]`);
        const subtasks = (t.subtasks || []).map((s, j) => {
          const sEl = root.querySelector(`[data-ai-sub="${i}-${j}"]`);
          const spEl = root.querySelector(`[data-ai-sub-prompt="${i}-${j}"]`);
          const st = (sEl?.value || "").trim();
          return { id: s.id, title: st, prompt: (spEl?.value || "").trim() || s.prompt || "" };
        }).filter((s) => s.title);
        return {
          id: t.id,
          title: (tEl?.value || "").trim() || "\u672A\u547D\u540D\u4EFB\u52A1",
          prompt: pEl?.value?.trim() || "",
          searchTerms: (t.searchTerms || []).slice(0, 3),
          subtasks
        };
      });
      const todos = tasks.slice(0, 5).map((t, i) => ({
        id: uid("todo"),
        text: t.title,
        taskId: t.id,
        contrib: {},
        coverage: 0,
        status: "open",
        manual: false,
        searchTerms: (d.tasks[i]?.searchTerms || []).slice(0, 3)
      }));
      const goals = Store.read(K.goals, []);
      goals.unshift({ id: uid("g"), title, status: "active", createdAt: Date.now(), prompt: prompt2, tasks, todos });
      Store.write(K.goals, goals);
      this.aiDraft = null;
      this.render();
      onLocationChange();
      this.toast("\u5DF2\u521B\u5EFA\u76EE\u6807\uFF1A" + title + "\uFF08" + tasks.length + " \u4E2A\u4EFB\u52A1\uFF09", "ok");
    },
    cancelAiDraft() {
      this.aiDraft = null;
      this.render();
    },
    askDelete(kind, id, parentId, message) {
      this.pendingDelete = { kind, id, parentId, message };
      this.render();
    },
    confirmDelete() {
      const pending = this.pendingDelete;
      if (!pending) return;
      this.pendingDelete = null;
      if (pending.kind === "goal") this.delGoal(pending.id);
      else if (pending.kind === "task") this.delTask(pending.id, pending.parentId || "");
      else if (pending.kind === "subtask") this.delSub(pending.id, pending.parentId || "");
      else if (pending.kind === "record") this.delRecord(pending.id);
      else {
        const [kind, index] = pending.id.split(":");
        this.delProfile(kind, Number(index));
      }
    },
    deleteConfirm(kind, id, parentId) {
      const p = this.pendingDelete;
      if (!p || p.kind !== kind || p.id !== id || (p.parentId || "") !== (parentId || "")) return "";
      return `<div class="sz-inline-confirm">
      <span>${esc(p.message)}</span>
      <button class="sz-btn danger" data-act="confirm-delete">\u786E\u8BA4\u5220\u9664</button>
      <button class="sz-btn" data-act="cancel-delete">\u53D6\u6D88</button>
    </div>`;
    },
    delGoal(id) {
      Store.write(K.goals, Store.read(K.goals, []).filter((x) => x.id !== id));
      this.render();
    },
    delTask(id, goalId) {
      const goals = Store.read(K.goals, []);
      const g = goals.find((x) => x.id === goalId);
      if (!g) return;
      g.tasks = (g.tasks || []).filter((x) => x.id !== id);
      Store.write(K.goals, goals);
      this.render();
    },
    delSub(id, goalId) {
      const goals = Store.read(K.goals, []);
      const g = goals.find((x) => x.id === goalId);
      if (!g) return;
      for (const task of g.tasks || []) task.subtasks = (task.subtasks || []).filter((x) => x.id !== id);
      Store.write(K.goals, goals);
      this.render();
    },
    // ---- 记录操作 ----
    toggleRecordDetail(button) {
      const record = button.closest(".sz-rec");
      const detail = record?.querySelector(".sz-rec-detail");
      if (!record || !detail) return;
      if (record.classList.contains("expanded")) {
        detail.style.maxHeight = `${detail.scrollHeight}px`;
        detail.getBoundingClientRect();
        record.classList.remove("expanded");
        detail.style.maxHeight = "0px";
        return;
      }
      record.classList.add("expanded");
      if (this.prefersReducedMotion()) {
        detail.style.maxHeight = "none";
        return;
      }
      detail.style.maxHeight = "0px";
      detail.getBoundingClientRect();
      detail.style.maxHeight = `${detail.scrollHeight}px`;
      const finish = (event) => {
        if (event.propertyName === "max-height" && record.classList.contains("expanded")) {
          detail.style.maxHeight = "none";
          detail.removeEventListener("transitionend", finish);
        }
      };
      detail.addEventListener("transitionend", finish);
    },
    toggleRecGroup(key) {
      if (this.recCollapsed.has(key)) {
        this.recCollapsed.delete(key);
        this.expandAnim = "rec:" + key;
        this.render();
        window.clearTimeout(this.expandAnimTimer);
        this.expandAnimTimer = window.setTimeout(() => {
          this.expandAnim = null;
        }, 260);
        return;
      }
      const button = this.root?.querySelector(`[data-act="toggle-rec-group"][data-key="${key}"]`);
      const list = button?.closest(".sz-sec")?.nextElementSibling?.classList.contains("sz-rec-list") ? button.closest(".sz-sec").nextElementSibling : null;
      if (!list) {
        this.recCollapsed.add(key);
        this.render();
        return;
      }
      this.prepareCollapse(list);
      window.setTimeout(() => {
        this.recCollapsed.add(key);
        this.render();
      }, this.prefersReducedMotion() ? 0 : 210);
    },
    delRecord(key) {
      const recs = Store.read(K.records, []);
      const queue = Store.read(K.queue, []);
      const isMatch = key.includes(":");
      const [rid, gid] = isMatch ? key.split(":") : [key, ""];
      const rec = recs.find((r) => r.id === rid);
      if (!rec) return;
      let deletedWhole = false;
      if (isMatch) {
        if (!rec.matches) return;
        rec.matches = rec.matches.filter((m) => m.goalId !== gid);
        if (rec.matches.length) {
          syncRecordPrimaryMatch(rec);
        } else {
          deletedWhole = true;
        }
      } else {
        deletedWhole = true;
      }
      if (deletedWhole) {
        const idx = recs.findIndex((r) => r.id === rid);
        if (idx >= 0) recs.splice(idx, 1);
        const qi = queue.findIndex((q) => q.recordId === rid);
        if (qi >= 0) queue.splice(qi, 1);
      }
      Store.write(K.records, recs);
      Store.write(K.queue, queue);
      this.render();
      this.toast(isMatch && !deletedWhole ? "\u5DF2\u4ECE\u8BE5\u5206\u7C7B\u79FB\u9664\u8BB0\u5F55" : "\u5DF2\u5220\u9664\u8BB0\u5F55", "ok");
    },
    retryRecord(rid) {
      const recs = Store.read(K.records, []);
      const rec = recs.find((r) => r.id === rid);
      if (!rec || !rec.excerpt) return;
      rec.category = "pending";
      const q = Store.read(K.queue, []);
      q.push({ recordId: rec.id, excerpt: rec.excerpt, retries: 0, nextAt: 0 });
      delete rec.excerpt;
      Store.write(K.records, recs);
      Store.write(K.queue, q);
      this.render();
      pumpQueue();
    },
    // ---- 导出 / 清空 ----
    exportSelected() {
      const sel = this.root.querySelector('[data-role="export-select"]');
      const value = sel?.value || "";
      if (!value) {
        this.toast("\u8BF7\u5148\u5728\u5BFC\u51FA\u83DC\u5355\u91CC\u9009\u62E9\u76EE\u6807", "idle");
        return;
      }
      this.exportRecords(value === "all" ? null : value);
    },
    exportCancel() {
      this.exportOpen = false;
      this.renderExportPop();
    },
    exportRecords(goalId) {
      const recs = Store.read(K.records, []);
      const goals = Store.read(K.goals, []);
      let picked = recs;
      if (goalId) {
        picked = recs.flatMap((r) => {
          const match = r.matches?.find((m) => m.goalId === goalId);
          if (match) {
            return [{
              ...r,
              category: "goal:" + goalId,
              relevance: match.relevance,
              findings: match.findings,
              notes: match.notes,
              matches: [match]
            }];
          }
          return r.category === "goal:" + goalId ? [r] : [];
        });
      }
      const groups = {};
      for (const r of picked) {
        const key = r.category || "other";
        (groups[key] = groups[key] || []).push(r);
      }
      const payload = { exportedAt: Date.now(), goals, records: groups };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = goalId ? "glean-" + goalId + ".json" : "glean-export.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1e3);
      this.exportOpen = false;
      this.renderExportPop();
      this.toast("\u5DF2\u5BFC\u51FA " + picked.length + " \u6761\u8BB0\u5F55\u3002\u53EF\u4E0B\u8F7D skill \u8F85\u52A9\u672C\u5730 Agent \u5206\u6790\u3002", "ok");
    },
    clearByTarget(goalId) {
      const label = goalId ? "\u8BE5\u76EE\u6807\u4E0B\u7684\u8BB0\u5F55" : "\u5168\u90E8\u6570\u636E\uFF08\u76EE\u6807\u3001\u8BB0\u5F55\u3001\u961F\u5217\uFF09";
      if (!confirm("\u6E05\u7A7A" + label + "\uFF1F\u6B64\u64CD\u4F5C\u4E0D\u53EF\u6062\u590D\u3002")) return;
      if (goalId) {
        const kept = [];
        for (const record of Store.read(K.records, [])) {
          if (record.matches?.some((match) => match.goalId === goalId)) {
            record.matches = record.matches.filter((match) => match.goalId !== goalId);
            if (!record.matches.length) continue;
            syncRecordPrimaryMatch(record);
            kept.push(record);
          } else if (record.category !== "goal:" + goalId) {
            kept.push(record);
          }
        }
        Store.write(K.records, kept);
      } else {
        Object.values(K).forEach((k) => Store.del(k));
      }
      this.render();
    },
    clearSelected() {
      const sel = this.root.querySelector('[data-role="clear-select"]');
      const value = sel?.value || "";
      if (!value) {
        this.toast("\u8BF7\u5148\u5728\u4E0B\u62C9\u83DC\u5355\u91CC\u9009\u62E9\u8981\u6E05\u7A7A\u7684\u5185\u5BB9", "idle");
        return;
      }
      if (value === "all") {
        this.clearByTarget(null);
      } else if (value === "slacking") {
        if (!confirm("\u6E05\u7A7A\u6478\u9C7C\u8BB0\u5F55\uFF1F\u6B64\u64CD\u4F5C\u4E0D\u53EF\u6062\u590D\u3002")) return;
        Store.write(K.records, Store.read(K.records, []).filter((r) => r.category !== "slacking"));
        this.render();
      } else {
        this.clearByTarget(value);
      }
      if (sel) sel.value = "";
    },
    // ---- 设置 ----
    saveSettings() {
      const ta = this.root.querySelector('[data-role="prompt-input"]');
      saveSettings({ analysisPrompt: (ta?.value || "").trim() });
      this.toast("\u8BBE\u7F6E\u5DF2\u4FDD\u5B58", "ok");
      this.render();
    },
    resetPrompt() {
      saveSettings({ analysisPrompt: "" });
      this.toast("\u5206\u6790\u63D0\u793A\u8BCD\u5DF2\u91CD\u7F6E\u4E3A\u9884\u8BBE", "ok");
      this.render();
    },
    copyText(text) {
      navigator.clipboard?.writeText(text).then(() => this.toast("\u5DF2\u590D\u5236\uFF1A" + text, "ok"));
    },
    searchTerm(term) {
      const s = settings();
      navigator.clipboard?.writeText(term);
      const resolved = resolveLinkedUrl(s.linkedUrl || "");
      if (resolved.url) {
        const finalUrl = resolved.url.replace(/\{q\}/g, encodeURIComponent(term));
        window.open(finalUrl, "_blank", "noopener");
        if (resolved.usedTemplate) {
          this.toast("\u5DF2\u8BC6\u522B\u7AD9\u70B9\u5E76\u8DF3\u8F6C\u5230\u641C\u7D22\u7ED3\u679C\u9875\u3002", "ok");
        } else if (resolved.url.includes("{q}")) {
          this.toast("\u5DF2\u8DF3\u8F6C\u5230\u641C\u7D22\u7ED3\u679C\u9875\u3002", "ok");
        } else {
          this.toast("\u5DF2\u590D\u5236\u641C\u7D22\u8BCD\u5E76\u8DF3\u8F6C\u5230\u5173\u8054\u7F51\u5740\u3002\u63D0\u793A\uFF1A\u5728\u5173\u8054\u7F51\u5740\u4E2D\u52A0\u5165 {q} \u53EF\u76F4\u8FBE\u641C\u7D22\u7ED3\u679C\u9875\u3002", "ok");
        }
      } else {
        this.toast("\u5DF2\u590D\u5236\u641C\u7D22\u8BCD\u3002\u5EFA\u8BAE\u5148\u586B\u5199\u5173\u8054\u7F51\u5740\uFF0C\u4EE5\u4FBF\u4E00\u952E\u8DF3\u8F6C\u3002", "ok");
      }
    },
    async aiFillLinkedUrl() {
      const input = this.root.querySelector('[data-role="linked-url"]');
      const raw = (input?.value || "").trim();
      if (!raw) {
        this.toast("\u8BF7\u5148\u5728\u8F93\u5165\u6846\u586B\u7AD9\u70B9\u540D\u6216\u7F51\u5740", "idle");
        return;
      }
      const bridge = window.LLMBridge;
      if (!bridge) {
        this.toast("AI \u6682\u4E0D\u53EF\u7528\uFF08\u672A\u68C0\u6D4B\u5230 LLMBridge\uFF09\u3002\u53EF\u624B\u52A8\u586B\u5199\u5E26 {q} \u7684\u641C\u7D22\u7F51\u5740\u3002", "err");
        return;
      }
      this.toast("AI \u6B63\u5728\u8BC6\u522B\u7AD9\u70B9\u5E76\u8865\u5168\u641C\u7D22\u53C2\u6570\u2026", "idle");
      try {
        const rawAns = await bridge.chat(
          '\u7528\u6237\u8981\u5728\u4E00\u4E2A\u6D4F\u89C8\u5668\u6269\u5C55\u91CC\u8BBE\u7F6E\u4E00\u4E2A\u201C\u5173\u8054\u7F51\u5740\u201D\uFF0C\u7528\u6765\u4E00\u952E\u8DF3\u8F6C\u641C\u7D22\u3002\u8BF7\u6839\u636E\u7528\u6237\u7ED9\u51FA\u7684\u7AD9\u70B9\uFF0C\u8FD4\u56DE\u8BE5\u7AD9\u70B9\u7684\u641C\u7D22\u7ED3\u679C\u9875 URL \u6A21\u677F\u3002\u6A21\u677F\u4E2D\u628A\u641C\u7D22\u5173\u952E\u8BCD\u7684\u4F4D\u7F6E\u5199\u6210 {q} \u5360\u4F4D\u7B26\u3002\u53EA\u8F93\u51FA\u4E00\u4E2A JSON\uFF08\u4E0D\u8981\u4EE3\u7801\u5757\u3001\u4E0D\u8981\u89E3\u91CA\uFF09\uFF1A{"template":"\u5B8C\u6574\u7684\u641C\u7D22URL\u6A21\u677F\uFF0C\u542B {q}"}\u89C4\u5219\uFF1A1) \u82E5\u8BE5\u7AD9\u70B9\u4E0D\u652F\u6301 URL \u53C2\u6570\u641C\u7D22\uFF0Ctemplate \u8FD4\u56DE\u7A7A\u5B57\u7B26\u4E32\uFF1B2) \u82E5\u5DF2\u77E5\u8BE5\u7AD9\u70B9\u6709\u53CD\u722C/\u9700\u767B\u5F55\uFF0C\u4ECD\u8FD4\u56DE\u7406\u8BBA\u4E0A\u6B63\u786E\u7684\u6A21\u677F\uFF1B3) URL \u5FC5\u987B\u5B8C\u6574\uFF0C\u4EE5 http(s) \u5F00\u5934\u3002\n\n\u7AD9\u70B9\uFF1A' + raw,
          "json"
        );
        const obj = JSON.parse(rawAns);
        const tpl = String(obj.template || "").trim();
        if (!tpl) {
          this.toast("\u672A\u80FD\u8BC6\u522B\u8BE5\u7AD9\u70B9\u7684\u641C\u7D22\u65B9\u5F0F\uFF0C\u8BF7\u624B\u52A8\u586B\u5199\u5E26 {q} \u7684\u7F51\u5740\u3002", "err");
          return;
        }
        if (input) input.value = tpl;
        saveSettings({ linkedUrl: tpl });
        this.toast("\u5DF2\u8865\u5168\uFF1A" + tpl, "ok");
      } catch (err) {
        this.toast("AI \u8865\u5168\u5931\u8D25\uFF1A" + String(err), "err");
      }
    },
    linkedUrlNotice(v) {
      const resolved = resolveLinkedUrl(v);
      confirm(
        "\u5DF2\u8BBE\u7F6E\u5173\u8054\u7F51\u5740\uFF1A" + (resolved.url || v) + "\n\n\u8BF4\u660E\uFF1A\u62FE\u77E5\u7684\u8BB0\u5F55\u6309\u6D4F\u89C8\u5668\u540C\u6E90\u7B56\u7565\u9694\u79BB\u5B58\u50A8\uFF0C\u6BCF\u4E2A\u7AD9\u70B9\u53EA\u80FD\u67E5\u770B\u81EA\u5DF1\u57DF\u4E0B\u6293\u5230\u7684\u8BB0\u5F55\uFF0C\u65E0\u6CD5\u8DE8\u6E90\u6C47\u603B\u3002\n\n\u5173\u8054\u7F51\u5740\u4EC5\u4F5C\u4E3A\u201C\u641C\u7D22\u201D\u6309\u94AE\u7684\u9ED8\u8BA4\u8DF3\u8F6C\u76EE\u6807\uFF0C\u4E0D\u4F1A\u628A\u8BB0\u5F55\u540C\u6B65\u5230\u8BE5\u7AD9\u70B9\u3002\n\n\u5C0F\u6280\u5DE7\uFF1A\u5728\u7F51\u5740\u4E2D\u52A0\u5165 {q} \u5360\u4F4D\u7B26\uFF08\u4F8B\u5982 https://www.zhihu.com/search?type=content&q={q}\uFF09\uFF0C\u70B9\u51FB\u641C\u7D22\u8BCD\u540E\u4F1A\u76F4\u63A5\u8DF3\u8F6C\u5230\u8BE5\u7AD9\u70B9\u7684\u641C\u7D22\u7ED3\u679C\u9875\uFF0C\u65E0\u9700\u624B\u52A8\u7C98\u8D34\u3002\n\n\u4E5F\u53EF\u4EE5\u53EA\u586B\u88F8\u57DF\u540D\uFF08\u5982 zhihu.com\u3001juejin.cn\u3001csdn.net\u3001read.douban.com\u3001medium.com\u3001\u7EF4\u57FA\u767E\u79D1\u7B49\uFF09\uFF0C\u62FE\u77E5\u4F1A\u81EA\u52A8\u8BC6\u522B\u5E76\u76F4\u8FBE\u641C\u7D22\u7ED3\u679C\u9875\u3002\n\n\u5982\u9700\u8DE8\u6E90\u6C47\u603B\uFF0C\u53EF\u5728\u5404\u6E90\u5BFC\u51FA\u8BB0\u5F55\u540E\uFF0C\u4E0B\u8F7D skill \u4EA4\u7ED9\u672C\u5730 Agent \u5206\u6790\u3002"
      );
      const normalized = resolveLinkedUrl(v).url || v;
      if (normalized !== v) saveSettings({ linkedUrl: normalized });
    },
    showHelp() {
      confirm(
        "\u62FE\u77E5 \xB7 \u4F7F\u7528\u8BF4\u660E\n\n1. \u5F00\u542F\u53F3\u4E0A\u89D2\u300C\u5DE5\u4F5C\u6A21\u5F0F\u300D\u5F00\u5173\uFF0C\u62FE\u77E5\u4F1A\u81EA\u52A8\u8BB0\u5F55\u4F60\u6D4F\u89C8\u7684\u7F51\u9875\u3002\n2. \u5728\u300C\u76EE\u6807\u300D\u91CC\u521B\u5EFA\u76EE\u6807\uFF0C\u5E76\u62C6\u89E3\u4E3A\u4EFB\u52A1/\u5B50\u4EFB\u52A1\uFF0C\u8BA9\u8BB0\u5F55\u6709\u5904\u53EF\u5F52\u3002\n3. \u6BCF\u6253\u5F00\u4E00\u4E2A\u7F51\u9875\uFF0C\u62FE\u77E5\u4F1A\u81EA\u52A8\u5206\u6790\u5E76\u5F52\u6863\u5230\u6700\u76F8\u5173\u7684\u76EE\u6807\uFF0C\u65E0\u5173\u5185\u5BB9\u5F52\u5165\u6478\u9C7C\u3002\n4. \u53F3\u4E0B\u89D2\u5F85\u529E\u6C14\u6CE1\u4F1A\u7ED9\u51FA\u4E0B\u4E00\u6B65\u5EFA\u8BAE\uFF0C\u70B9\u51FB\u641C\u7D22\u8BCD\u53EF\u4E00\u952E\u8DF3\u8F6C\u5230\u5173\u8054\u7F51\u5740\u641C\u7D22\u3002\n5. \u70B9\u51FB\u76EE\u6807\u91CC\u7684\u4EFB\u610F\u5206\u7C7B\uFF0C\u53EF\u8DF3\u8F6C\u5230\u8BE5\u5206\u7C7B\u4E0B\u7684\u8BB0\u5F55\u3002\n6. \u5728\u300C\u8BBE\u7F6E\u300D\u91CC\u53EF\u7F16\u8F91\u5206\u6790\u63D0\u793A\u8BCD\u3001\u6E05\u7A7A\u8BB0\u5F55\u3001\u586B\u5199\u5173\u8054\u7F51\u5740\u3002\n   \u63D0\u793A\u8BCD\u7F16\u8F91\u987B\u77E5\uFF1A\u81EA\u5B9A\u4E49\u63D0\u793A\u8BCD\u5FC5\u987B\u4FDD\u7559 {{GOALS}}\u3001{{URL}}\u3001{{TITLE}}\u3001{{EXCERPT}} \u7B49\u5360\u4F4D\u7B26\uFF0C\u4EE5\u53CA\u300C\u53EA\u8F93\u51FA JSON + matches \u6570\u7EC4\uFF08\u6BCF\u4E2A\u4E00\u7EA7\u76EE\u6807\u6700\u591A\u4E00\u6761\uFF0C\u6BCF\u4E2A\u5143\u7D20\u542B goalId/taskId/subtaskId/relevance/findings/notes/keyQuotes\uFF09\u300D\u7684\u683C\u5F0F\u7EA6\u5B9A\uFF0C\u5426\u5219\u5206\u6790\u4F1A\u5931\u8D25\u3002\n7. \u5E95\u90E8\u300C\u5173\u8054\u7F51\u5740\u300D\u6846\u53EA\u9700\u586B\u7AD9\u70B9\u540D\u6216\u7F51\u5740\uFF0C\u70B9\u65C1\u8FB9\u7684 \u2726 \u56FE\u6807\uFF0CAI \u4F1A\u81EA\u52A8\u8865\u5168\u8BE5\u7AD9\u70B9\u7684\u641C\u7D22\u53C2\u6570\uFF0C\u4E4B\u540E\u70B9\u641C\u7D22\u8BCD\u5373\u53EF\u76F4\u8FBE\u7ED3\u679C\u9875\u3002\n\n\u6570\u636E\u8BF4\u660E\uFF1A\u62FE\u77E5\u7684\u8BB0\u5F55\u4FDD\u5B58\u5728\u6D4F\u89C8\u5668\u672C\u5730\uFF0C\u6309\u540C\u6E90\u7B56\u7565\u9694\u79BB\uFF0C\u6BCF\u4E2A\u7AD9\u70B9\u53EA\u80FD\u67E5\u770B\u81EA\u5DF1\u57DF\u4E0B\u7684\u8BB0\u5F55\u3002\u5982\u9700\u8DE8\u6E90\u6C47\u603B\uFF0C\u8BF7\u5206\u522B\u5728\u5404\u7AD9\u70B9\u5BFC\u51FA\u8BB0\u5F55\u540E\uFF0C\u4E0B\u8F7D\u914D\u5957 skill \u8F85\u52A9\u672C\u5730 Agent \u5206\u6790\u3002\n\n\u6E29\u99A8\u63D0\u793A\uFF1AAI \u5206\u6790\u53EF\u80FD\u5B58\u5728\u504F\u5DEE\uFF0C\u91CD\u8981\u7ED3\u8BBA\u8BF7\u81EA\u884C\u6838\u5BF9\u539F\u59CB\u7F51\u9875\u3002\u62FE\u77E5\u7684\u6240\u6709\u8BB0\u5F55\u90FD\u4FDD\u5B58\u5728\u672C\u5730\u6D4F\u89C8\u5668\uFF0C\u4E0D\u4F1A\u4E0A\u4F20\u3002"
      );
    },
    // ---- 用户画像 ----
    addProfile() {
      const input = this.root.querySelector('[data-role="profile-input"]');
      const kind = "preferences";
      const text = (input?.value || "").trim();
      if (!text) return;
      const profile = Store.read(K.profile, { updatedAt: 0, facts: [], preferences: [] });
      (profile[kind] = profile[kind] || []).unshift(text);
      profile.updatedAt = Date.now();
      Store.write(K.profile, profile);
      if (input) input.value = "";
      this.renderProfile();
      this.toast("\u5DF2\u6DFB\u52A0\u753B\u50CF\u6761\u76EE", "ok");
    },
    delProfile(kind, idx) {
      const profile = Store.read(K.profile, { updatedAt: 0, facts: [], preferences: [] });
      profile[kind] = (profile[kind] || []).filter((_, i) => i !== idx);
      profile.updatedAt = Date.now();
      Store.write(K.profile, profile);
      this.renderProfile();
    },
    // ---- 右键「问问 DeepSeek Harness」 ----
    onContextMenu(e) {
      if (!settings().askDsh) {
        this.hideCtxMenu();
        return;
      }
      const sel = window.getSelection()?.toString().trim() || "";
      if (!sel) {
        this.hideCtxMenu();
        return;
      }
      if (e.composedPath().some((n) => n === this.root)) {
        this.hideCtxMenu();
        return;
      }
      e.preventDefault();
      const m = this.els.ctxmenu;
      m.innerHTML = `
      <button class="sz-ctxmenu-item" data-act="ask-dsh">${ICONS.deepseek} \u95EE\u95EE DeepSeek Harness</button>`;
      m.classList.add("open");
      m.style.left = e.clientX + "px";
      m.style.top = e.clientY + "px";
    },
    hideCtxMenu() {
      this.els.ctxmenu.classList.remove("open");
    },
    askSelectionToDsh() {
      const sel = window.getSelection()?.toString().trim() || "";
      if (!sel) {
        this.hideCtxMenu();
        return;
      }
      this.hideCtxMenu();
      askDsh(composeDshAsk(sel, document.title, location.href), settings().dshUrl || DSH_URL);
      this.toast("\u5DF2\u6253\u5F00 DeepSeek Harness \u5E76\u586B\u5165\u9009\u4E2D\u5185\u5BB9\uFF0C\u786E\u8BA4\u540E\u53EF\u76F4\u63A5\u53D1\u9001\u3002", "ok");
    },
    // ---- 目标树拖拽排序 ----
    onDragStart(e) {
      const row = e.target.closest("[draggable='true'][data-kind]");
      if (!row) return;
      this.drag = {
        kind: row.dataset.kind,
        id: row.dataset.id || "",
        parent: row.dataset.parent || ""
      };
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", row.dataset.id || "");
    },
    onDragOver(e) {
      if (!this.drag) return;
      const row = e.target.closest("[draggable='true'][data-kind]");
      if (!row || row.dataset.kind !== this.drag.kind) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      this.clearDragOver();
      row.classList.add("dragover");
    },
    onDrop(e) {
      e.preventDefault();
      const row = e.target.closest("[draggable='true'][data-kind]");
      this.clearDragOver();
      if (!this.drag || !row || row.dataset.kind !== this.drag.kind) {
        this.drag = null;
        return;
      }
      const targetId = row.dataset.id || "";
      const kind = this.drag.kind;
      const goals = Store.read(K.goals, []);
      if (kind === "goal") {
        reorder(goals, this.drag.id, targetId);
        Store.write(K.goals, goals);
      } else if (kind === "task") {
        const g = goals.find((x) => x.id === this.drag.parent);
        if (g) {
          reorder(g.tasks || [], this.drag.id, targetId);
          Store.write(K.goals, goals);
        }
      } else if (kind === "subtask") {
        const g = goals.find((x) => x.id === this.drag.parent);
        const task = g?.tasks?.find((t) => (t.subtasks || []).some((s) => s.id === this.drag.id));
        if (task) {
          reorder(task.subtasks || [], this.drag.id, targetId);
          Store.write(K.goals, goals);
        }
      }
      this.drag = null;
      this.render();
    },
    clearDragOver() {
      this.root.querySelectorAll(".dragover").forEach((el) => el.classList.remove("dragover"));
    },
    // ---- 组内视图 ----
    enterGroup(key) {
      this.recReturnTab = null;
      this.recGroup = key;
      this.recQuery = "";
      this.els.searchInput.value = "";
      this.render();
    },
    leaveGroup() {
      const returnTab = this.recReturnTab;
      this.recReturnTab = null;
      this.recGroup = null;
      this.recQuery = "";
      this.els.searchInput.value = "";
      if (returnTab === "goals") this.switchTab("goals");
      else this.render();
    },
    // 从目标树点击分类跳转：切到记录 Tab 并进入对应分组
    gotoGroup(id, kind) {
      this.recReturnTab = this.tab === "goals" ? "goals" : null;
      if (id === "slacking") this.recGroup = "slacking";
      else if (kind === "task") this.recGroup = "task:" + id;
      else if (kind === "subtask") this.recGroup = "subtask:" + id;
      else this.recGroup = "goal:" + id;
      this.recQuery = "";
      this.els.searchInput.value = "";
      if (this.tab !== "records") this.switchTab("records");
      else this.render();
    },
    switchTab(tab) {
      if (tab === this.tab) return;
      this.tab = tab;
      clearTimeout(this.animTimer);
      this.els.body.classList.remove("sz-animH");
      this.els.body.style.height = "";
      this.render();
    },
    setPanelMode(mode) {
      const st = getState();
      st.panelMode = mode;
      if (!st.activeSince) st.activeSince = Date.now();
      Store.write(K.state, st);
      this.recGroup = null;
      this.recReturnTab = null;
      this.recQuery = "";
      this.els.searchInput.value = "";
      this.render();
    },
    openStorageManager() {
      this.storageManagerOpen = true;
      this.render();
    },
    closeStorageManager() {
      this.storageManagerOpen = false;
      this.render();
    },
    saveStorageLimit(value) {
      const parsed = Number(value);
      if (!STORAGE_SOFT_CAP_OPTIONS_MB.includes(parsed)) return;
      try {
        saveStorageSoftCapMb(parsed);
        this.toast("\u5B58\u50A8\u8F6F\u4E0A\u9650\u5DF2\u66F4\u65B0", "ok");
        this.render();
      } catch (error) {
        this.toast(String(error), "err");
      }
    },
    clearStorageQueue() {
      const queue = Store.read(K.queue, []);
      if (!queue.length) return;
      if (!confirm("\u6E05\u7A7A\u5206\u6790\u961F\u5217\uFF1F\u5C1A\u672A\u5206\u6790\u7684\u8BB0\u5F55\u5C06\u4E0D\u4F1A\u7EE7\u7EED\u5904\u7406\u3002")) return;
      const recs = Store.read(K.records, []);
      for (const item of queue) {
        const rec = recs.find((candidate) => candidate.id === item.recordId);
        if (!rec || rec.category !== "pending") continue;
        rec.category = "error";
        rec.excerpt = item.excerpt;
      }
      Store.write(K.records, recs);
      Store.del(K.queue);
      this.toast("\u5206\u6790\u961F\u5217\u5DF2\u6E05\u7A7A\uFF0C\u672A\u5B8C\u6210\u8BB0\u5F55\u53EF\u624B\u52A8\u91CD\u8BD5", "ok");
      this.render();
    },
    manageStorageCategory(id) {
      if (id === "queue") {
        this.clearStorageQueue();
        return;
      }
      if (id === "goals" || id === "records" || id === "profile") {
        this.storageManagerOpen = false;
        this.switchTab(id === "goals" ? "goals" : id === "records" ? "records" : "profile");
      }
    },
    renderStorageCard(snapshot) {
      const status = storageQuotaStatus(snapshot.usageRatio);
      const percent = storagePercent(snapshot);
      return `
      <section class="sz-storage-card" aria-label="\u5B58\u50A8\u7A7A\u95F4">
        <div class="sz-storage-card-main">
          <div class="sz-storage-card-head">
            <div class="sz-storage-heading"><span class="sz-storage-icon">${ICONS.database}</span><strong>\u5B58\u50A8\u7A7A\u95F4</strong></div>
            <div class="sz-storage-card-actions">
              <span class="sz-storage-status ${status}">${storageStatusIcon(status)}<span>${storageStatusLabel(status)}</span></span>
              <button class="sz-ibtn" data-act="storage-refresh" title="\u5237\u65B0\u5B58\u50A8\u7528\u91CF" aria-label="\u5237\u65B0\u5B58\u50A8\u7528\u91CF">${ICONS.refresh}</button>
            </div>
          </div>
          <div class="sz-storage-row">
            <span class="sz-storage-row-label">\u5F53\u524D\u6E90\u6570\u636E</span>
            <strong>${formatStorageBytes(snapshot.bytesInUse)} / ${formatStorageBytes(snapshot.softCapBytes)}</strong>
            <span class="sz-storage-percent">${percent}%</span>
          </div>
          <div class="sz-storage-progress" role="progressbar" aria-label="\u5F53\u524D\u6E90\u6570\u636E" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"><i class="${status}" style="width:${percent}%"></i></div>
        </div>
        <div class="sz-storage-card-foot"><button class="sz-btn" data-act="storage-manage">\u7BA1\u7406\u5B58\u50A8</button></div>
      </section>`;
    },
    renderStorageManager(snapshot) {
      const status = storageQuotaStatus(snapshot.usageRatio);
      const percent = storagePercent(snapshot);
      const categoryRows = snapshot.categories.filter((category) => category.id === "goals" || category.id === "records" || category.id === "profile").map((category) => {
        return `<div class="sz-storage-detail-row">
          <span class="sz-storage-detail-name">${storageCategoryLabel(category.id)}</span>
          <span class="sz-storage-detail-size">${formatStorageBytes(category.bytesInUse)}</span>
          <button class="sz-storage-link" data-act="storage-category" data-category="${category.id}">\u7BA1\u7406</button>
        </div>`;
      }).join("");
      this.els.body.innerHTML = `
      <div class="sz-storage-manager">
        <div class="sz-storage-manager-head">
          <div class="sz-storage-heading"><span class="sz-storage-icon">${ICONS.database}</span><strong>\u5B58\u50A8\u7A7A\u95F4</strong></div>
          <button class="sz-ibtn" data-act="storage-close" title="\u5173\u95ED\u5B58\u50A8\u7BA1\u7406" aria-label="\u5173\u95ED\u5B58\u50A8\u7BA1\u7406">${ICONS.x}</button>
        </div>
        <div class="sz-storage-manager-content">
          <section class="sz-storage-overview">
            <div class="sz-storage-overview-top">
              <span class="sz-storage-status ${status}">${storageStatusIcon(status)}<span>${storageStatusLabel(status)}</span></span>
              <button class="sz-ibtn" data-act="storage-refresh" title="\u5237\u65B0\u5B58\u50A8\u7528\u91CF" aria-label="\u5237\u65B0\u5B58\u50A8\u7528\u91CF">${ICONS.refresh}</button>
            </div>
            <div class="sz-storage-row"><span class="sz-storage-row-label">\u5F53\u524D\u6E90\u6570\u636E</span><strong>${formatStorageBytes(snapshot.bytesInUse)} / ${formatStorageBytes(snapshot.softCapBytes)}</strong><span class="sz-storage-percent">${percent}%</span></div>
            <div class="sz-storage-progress" role="progressbar" aria-label="\u5F53\u524D\u6E90\u6570\u636E" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"><i class="${status}" style="width:${percent}%"></i></div>
            <div class="sz-storage-origin">\u4EC5\u7EDF\u8BA1\u5F53\u524D\u6E90\uFF0C\u5176\u4ED6\u7F51\u7AD9\u7684 localStorage \u4E0D\u4F1A\u5171\u4EAB\u6216\u6C47\u603B\u3002</div>
          </section>
          <section class="sz-storage-limit">
            <div class="sz-storage-section-head"><strong>\u62FE\u77E5\u8F6F\u4E0A\u9650</strong><span>${formatStorageBytes(snapshot.softCapBytes)}</span></div>
            <div class="sz-storage-segmented" role="group" aria-label="\u62FE\u77E5\u8F6F\u4E0A\u9650">
              ${STORAGE_SOFT_CAP_OPTIONS_MB.map((value) => `<button class="${snapshot.softCapMb === value ? "selected" : ""}" data-act="storage-limit" data-value="${value}" aria-pressed="${snapshot.softCapMb === value}">${value} MB</button>`).join("")}
            </div>
            <p class="sz-storage-note">\u8F6F\u4E0A\u9650\u7528\u4E8E\u63D0\u9192\u548C\u8FDB\u5EA6\u5C55\u793A\uFF0C\u4E0D\u4F1A\u6539\u53D8\u6D4F\u89C8\u5668\u5BF9\u5F53\u524D\u6E90\u7684\u786C\u6027 localStorage \u9650\u5236\u3002</p>
          </section>
          <section class="sz-storage-breakdown">
            <div class="sz-storage-section-head"><strong>\u5B58\u50A8\u660E\u7EC6</strong></div>
            <div class="sz-storage-detail-list">${categoryRows}</div>
          </section>
        </div>
      </div>`;
    },
    // ---- 渲染 ----
    render() {
      if (!this.root) return;
      const st = getState();
      const panelMode = st.panelMode === "slacking" ? "slacking" : "work";
      this.els.modeButtons.forEach((button) => {
        const active = button.dataset.mode === panelMode;
        button.classList.toggle("act", active);
        button.setAttribute("aria-pressed", String(active));
      });
      this.els.fab.classList.toggle("on", !!st.workMode);
      this.els.pending.classList.toggle("on", Store.read(K.queue, []).length > 0);
      this.els.tabs.forEach((t) => t.classList.toggle("act", t.dataset.tab === this.tab));
      const goals = Store.read(K.goals, []);
      if (this.recGroup) {
        if (this.recGroup.startsWith("goal:")) {
          const gid = this.recGroup.slice(5);
          if (!goals.some((g) => g.id === gid)) {
            this.recGroup = null;
            this.recQuery = "";
            this.els.searchInput.value = "";
          }
        } else if (this.recGroup.startsWith("task:")) {
          const tid = this.recGroup.slice(5);
          const hasTask = goals.some((g) => g.tasks?.some((t) => t.id === tid));
          if (!hasTask) {
            this.recGroup = null;
            this.recQuery = "";
            this.els.searchInput.value = "";
          }
        } else if (this.recGroup.startsWith("subtask:")) {
          const sid = this.recGroup.slice(8);
          const hasSub = goals.some((g) => g.tasks?.some((t) => t.subtasks?.some((s) => s.id === sid)));
          if (!hasSub) {
            this.recGroup = null;
            this.recQuery = "";
            this.els.searchInput.value = "";
          }
        }
      }
      this.els.panel.classList.toggle("storage-manager-open", this.storageManagerOpen);
      this.els.tabBar.hidden = this.storageManagerOpen;
      this.els.toolbar.classList.toggle("on", this.tab === "records" && !this.storageManagerOpen);
      this.els.rectools.classList.toggle("on", this.tab === "records" && !!this.recGroup && !this.storageManagerOpen);
      if (this.storageManagerOpen) {
        this.renderStorageManager(getStorageQuotaSnapshot());
        return;
      }
      if (this.tab === "goals") this.renderGoals();
      else if (this.tab === "records") this.renderRecords();
      else if (this.tab === "profile") this.renderProfile();
      else this.renderSettings();
      this.prepareExpandAnimations();
      this.renderTodo();
      this.els.toolbar.classList.toggle("on", this.tab === "records");
      this.els.rectools.classList.toggle("on", this.tab === "records" && !!this.recGroup);
      this.root.querySelectorAll('[data-act="rec-sort"]').forEach((btn) => {
        btn.classList.toggle("act", btn.dataset.sort === this.recSort);
      });
      const linked = this.root.querySelector('[data-role="linked-url"]');
      if (linked && linked !== this.root.activeElement) linked.value = settings().linkedUrl || "";
    },
    renderGoals() {
      const goals = Store.read(K.goals, []);
      const slackingOnly = getState().panelMode === "slacking";
      const slackingNode = `<div class="sz-slacking" data-act="goto-rec" data-id="slacking" data-kind="slacking" title="\u70B9\u51FB\u67E5\u770B\u6478\u9C7C\u8BB0\u5F55">
      <span class="sz-slacking-fish">${ICONS.fish}</span>
      <span class="sz-slacking-body">
        <span class="sz-slacking-title">\u6478\u9C7C\u6C60\u5858</span>
        <span class="sz-slacking-desc">\u4E0D\u5C5E\u4E8E\u4EFB\u4F55\u76EE\u6807\u7684\u8BB0\u5F55\uFF0C\u90FD\u4F1A\u6E38\u5230\u8FD9\u91CC</span>
      </span>
    </div>`;
      if (slackingOnly) {
        this.els.body.innerHTML = slackingNode;
        return;
      }
      const promptEditor = (kind, id, prompt2) => `<div class="sz-prompt-edit sz-prompt-edit-${kind}">
        <textarea class="sz-textarea sz-prompt-input" data-role="prompt-input" data-id="${esc(id)}" rows="1" placeholder="\u544A\u8BC9 AI\uFF0C\u8FD9\u91CC\u6536\u4EC0\u4E48">${esc(prompt2)}</textarea>
        <div class="sz-prompt-actions">
          <button class="sz-btn primary" data-act="prompt-save" data-id="${esc(id)}" data-pkind="${kind}">${ICONS.check} \u4FDD\u5B58</button>
          <button class="sz-btn" data-act="prompt-cancel">\u53D6\u6D88</button>
        </div>
      </div>`;
      const promptChip = (kind, id, prompt2) => `<button class="sz-cat-btn ${prompt2 ? "" : "empty"}" data-act="edit-prompt" data-id="${esc(id)}" data-pkind="${kind}" title="${prompt2 ? "\u70B9\u51FB\u7F16\u8F91\u5206\u7C7B\u5B9A\u4E49" : "\u70B9\u51FB\u6DFB\u52A0\u5206\u7C7B\u5B9A\u4E49"}">${prompt2 ? "<span class='sz-cat-dot'></span>\u5206\u7C7B\u5B9A\u4E49" : "\uFF0B \u5206\u7C7B\u5B9A\u4E49"}</button>`;
      const colorPalette = (g) => {
        const current = goalColor(g);
        const customSelected = !GOAL_COLORS.some((color) => color === current);
        return `<div class="sz-goal-palette" data-role="goal-palette" aria-label="\u9009\u62E9\u76EE\u6807\u989C\u8272">
        ${GOAL_COLORS.map((color) => `<button class="sz-color-swatch ${current === color ? "selected" : ""}" data-act="set-goal-color" data-id="${esc(g.id)}" data-color="${color}" style="--swatch:${color}" title="\u9009\u62E9\u989C\u8272"></button>`).join("")}
        <label class="sz-color-swatch sz-color-custom ${customSelected ? "selected" : ""}" title="\u81EA\u5B9A\u4E49\u989C\u8272">
          <input type="color" data-role="goal-color-input" data-id="${esc(g.id)}" value="${current}" aria-label="\u81EA\u5B9A\u4E49\u76EE\u6807\u989C\u8272">
        </label>
      </div>`;
      };
      const caret = (key, hasChild) => {
        if (!hasChild) return `<span class="sz-caret-spacer"></span>`;
        const collapsed = this.collapsed.has(key);
        return `<button class="sz-ibtn sz-rec-caret ${collapsed ? "" : "open"}" data-act="toggle-node" data-id="${esc(key)}" title="${collapsed ? "\u5C55\u5F00\u4E0B\u7EA7" : "\u6298\u53E0\u4E0B\u7EA7"}">${ICONS.chevron}</button>`;
      };
      const subtaskRow = (g, s) => `
      <div class="sz-row sz-row-subtask" draggable="true" data-kind="subtask" data-id="${esc(s.id)}" data-parent="${esc(g.id)}">
        <span class="sz-grip" title="\u62D6\u62FD\u6392\u5E8F">${ICONS.drag}</span>
        <span class="sz-caret-spacer"></span>
        <span class="sz-level sz-level-subtask" aria-hidden="true"></span>
        <span class="sz-title-wrap">
          <span class="sz-ntitle sz-ntitle-subtask clickable" data-act="goto-rec" data-id="${esc(s.id)}" data-kind="subtask" title="\u70B9\u51FB\u67E5\u770B\u8BE5\u5B50\u4EFB\u52A1\u4E0B\u7684\u8BB0\u5F55">${esc(s.title)}</span>
          ${promptChip("subtask", s.id, s.prompt || "")}
        </span>
        <button class="sz-ibtn" data-act="edit-sub" data-id="${esc(s.id)}" data-pid="${esc(g.id)}" title="\u7F16\u8F91">${ICONS.edit}</button>
        <button class="sz-ibtn" data-act="del-sub" data-id="${esc(s.id)}" data-pid="${esc(g.id)}" title="\u5220\u9664">${ICONS.trash}</button>
      </div>
      ${this.deleteConfirm("subtask", s.id, g.id)}
      ${this.editingPrompt === s.id ? promptEditor("subtask", s.id, s.prompt || "") : ""}`;
      const taskRow = (g, t) => {
        const collapsed = this.collapsed.has("t:" + t.id);
        return `
      <div class="sz-row sz-row-task" draggable="true" data-kind="task" data-id="${esc(t.id)}" data-parent="${esc(g.id)}">
        <span class="sz-grip" title="\u62D6\u62FD\u6392\u5E8F">${ICONS.drag}</span>
        ${caret("t:" + t.id, true)}
        <span class="sz-level sz-level-task" aria-hidden="true"></span>
        <span class="sz-title-wrap">
          <span class="sz-ntitle sz-ntitle-task clickable" data-act="goto-rec" data-id="${esc(t.id)}" data-kind="task" title="\u70B9\u51FB\u67E5\u770B\u8BE5\u4EFB\u52A1\u4E0B\u7684\u8BB0\u5F55">${esc(t.title)}</span>
          ${promptChip("task", t.id, t.prompt || "")}
        </span>
        <button class="sz-ibtn" data-act="edit-task" data-id="${esc(t.id)}" data-pid="${esc(g.id)}" title="\u7F16\u8F91">${ICONS.edit}</button>
        <button class="sz-ibtn" data-act="del-task" data-id="${esc(t.id)}" data-pid="${esc(g.id)}" title="\u5220\u9664">${ICONS.trash}</button>
      </div>
      ${this.deleteConfirm("task", t.id, g.id)}
      ${this.editingPrompt === t.id ? promptEditor("task", t.id, t.prompt || "") : ""}
      ${collapsed ? "" : `
      <div class="sz-children ${this.expandAnim === "t:" + t.id ? "sz-expand-enter" : ""}">
        ${(t.subtasks || []).map((s) => subtaskRow(g, s)).join("")}
        <div class="sz-row sz-add-node-row">
          <span class="sz-caret-spacer"></span>
          <input class="sz-input sz-sub-input" data-role="sub-input" data-pid="${esc(g.id)}" data-task="${esc(t.id)}" placeholder="\u6DFB\u52A0\u5B50\u4EFB\u52A1" style="font-size:12px;padding:3px 6px">
        </div>
      </div>`}`;
      };
      const goalRow = (g) => {
        const collapsed = this.collapsed.has("g:" + g.id);
        return `
    <div class="sz-node">
      <div class="sz-row sz-row-goal" draggable="true" data-kind="goal" data-id="${esc(g.id)}">
        <span class="sz-grip" title="\u62D6\u62FD\u6392\u5E8F">${ICONS.drag}</span>
        ${caret("g:" + g.id, true)}
        <button class="sz-goal-color" data-act="toggle-goal-color" data-id="${esc(g.id)}" style="--goal-color:${goalColor(g)}" title="\u66F4\u6539\u76EE\u6807\u989C\u8272" aria-label="\u66F4\u6539\u76EE\u6807\u989C\u8272">${ICONS.target}</button>
        ${this.editingGoal === g.id ? `
        <span class="sz-goal-title-edit">
          <input class="sz-input sz-goal-title-input" data-role="goal-title-input" data-id="${esc(g.id)}" value="${esc(g.title)}" aria-label="\u76EE\u6807\u540D\u79F0">
          <button class="sz-ibtn" data-act="save-goal-title" data-id="${esc(g.id)}" title="\u4FDD\u5B58\u76EE\u6807\u540D\u79F0">${ICONS.check}</button>
          <button class="sz-ibtn" data-act="cancel-goal-title" title="\u53D6\u6D88\u7F16\u8F91">${ICONS.x}</button>
        </span>` : `
        <span class="sz-title-wrap">
          <span class="sz-ntitle sz-ntitle-goal clickable ${g.status !== "active" ? "done" : ""}" data-act="goto-rec" data-id="${esc(g.id)}" data-kind="goal" title="\u70B9\u51FB\u67E5\u770B\u8BE5\u76EE\u6807\u4E0B\u7684\u8BB0\u5F55">${esc(g.title)}</span>
          ${promptChip("goal", g.id, g.prompt || "")}
        </span>
        <button class="sz-ibtn sz-goal-status" data-act="toggle-goal" data-id="${esc(g.id)}" title="${g.status === "active" ? "\u6807\u8BB0\u5B8C\u6210" : "\u91CD\u65B0\u5F00\u542F"}">${ICONS.check}</button>
        <button class="sz-ibtn" data-act="edit-goal" data-id="${esc(g.id)}" title="\u7F16\u8F91">${ICONS.edit}</button>
        <button class="sz-ibtn" data-act="del-goal" data-id="${esc(g.id)}" title="\u5220\u9664">${ICONS.trash}</button>`}
      </div>
      ${this.deleteConfirm("goal", g.id)}
      ${this.colorGoalId === g.id ? colorPalette(g) : ""}
      ${this.editingPrompt === g.id ? promptEditor("goal", g.id, g.prompt || "") : ""}
      ${collapsed ? "" : `
      <div class="sz-children ${this.expandAnim === "g:" + g.id ? "sz-expand-enter" : ""}">
        ${(g.tasks || []).map((t) => taskRow(g, t)).join("")}
        <div class="sz-row sz-add-node-row">
          <span class="sz-caret-spacer"></span>
          <input class="sz-input sz-task-input" data-role="task-input" data-pid="${esc(g.id)}" placeholder="\u6DFB\u52A0\u4EFB\u52A1" style="font-size:12px;padding:3px 6px">
        </div>
      </div>`}
    </div>`;
      };
      this.els.body.innerHTML = `
<div class="sz-goal-toolbar">
<input class="sz-input" data-role="goal-input" placeholder="\u968F\u5FC3\u8F93\u5165\uFF0C\u667A\u80FD\u62C6\u89E3" style="flex:1">
<button class="sz-btn" data-act="ai-parse-goal" title="\u7528 AI \u628A\u9700\u6C42\u89E3\u6790\u6210\u76EE\u6807\u5E76\u62C6\u89E3\u4EFB\u52A1/\u5B50\u4EFB\u52A1">${ICONS.bulb} AI \u62C6\u89E3</button>
</div>
    ${this.renderAiDraft()}
    ${goals.length ? '<div class="sz-note sz-priority-note" style="margin-bottom:8px">\u62D6\u52A8\u6392\u5E8F\uFF0C\u5F85\u529E\u4F18\u5148\u63D0\u793A\u9760\u524D\u4EFB\u52A1\u3002<span>\u2014\u2014 P0\uFF01\u5168\u90FD\u662FP0\uFF01</span></div>' : ""}
    ${goals.map(goalRow).join("") || `<div class="sz-empty-card">
      <div class="sz-empty-card-icon">${ICONS.target}</div>
      <div class="sz-empty-card-title">\u8FD8\u6CA1\u6709\u76EE\u6807</div>
      <div class="sz-empty-card-desc">\u6DFB\u52A0\u4E00\u4E2A\u76EE\u6807\uFF0C\u62FE\u77E5\u4F1A\u5E2E\u4F60\u62C6\u89E3\u6210\u4EFB\u52A1\u548C\u5F85\u529E\u3002<br>\u4E4B\u540E\u6D4F\u89C8\u7684\u7F51\u9875\uFF0C\u4F1A<strong>\u81EA\u52A8\u5F52\u6863</strong>\u5230\u5339\u914D\u7684\u76EE\u6807\u4E0B\u3002</div>
    </div>`}
    ${slackingNode}`;
    },
    // AI 拆解结果确认卡片（可编辑后创建）
    renderAiDraft() {
      const d = this.aiDraft;
      if (!d) return "";
      const taskBlocks = d.tasks.map((t, i) => `
      <div class="sz-ai-task">
        <div class="sz-ai-task-head"><span class="sz-ai-num">\u4EFB\u52A1 ${i + 1}</span></div>
        <input class="sz-input" data-ai-task-title="${i}" value="${esc(t.title)}" placeholder="\u4EFB\u52A1\u540D\u79F0">
        <textarea class="sz-textarea sz-ai-ta" data-ai-task-prompt="${i}" rows="2" placeholder="\u4EFB\u52A1\u7EA7\u5206\u7C7B\u63D0\u793A\u8BCD\uFF08\u53EF\u9009\uFF09">${esc(t.prompt || "")}</textarea>
        ${(t.subtasks || []).map((s, j) => `
        <div class="sz-ai-sub" style="display:block">
          <div style="display:flex;align-items:center;gap:4px;margin-bottom:4px">
            <span class="sz-ai-sub-dot" style="position:static">\xB7</span>
            <input class="sz-input" data-ai-sub="${i}-${j}" value="${esc(s.title)}" placeholder="\u5B50\u4EFB\u52A1\u540D\u79F0" style="flex:1">
          </div>
          <textarea class="sz-textarea sz-ai-ta" data-ai-sub-prompt="${i}-${j}" rows="1" placeholder="\u5B50\u4EFB\u52A1\u7EA7\u5206\u7C7B\u63D0\u793A\u8BCD\uFF08\u53EF\u9009\uFF09">${esc(s.prompt || "")}</textarea>
        </div>`).join("")}
      </div>`).join("");
      return `
    <div class="sz-ai-confirm">
      <div class="sz-ai-head">AI \u62C6\u89E3\u7ED3\u679C \u2014\u2014 \u8BF7\u786E\u8BA4\u6216\u4FEE\u6539\u540E\u518D\u521B\u5EFA</div>
      ${d.questions && d.questions.length ? `<div class="sz-ai-questions">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <div style="font-weight:600">AI \u9700\u8981\u4F60\u786E\u8BA4\u8FD9\u4E9B\u70B9\uFF0C\u56DE\u7B54\u540E\u70B9\u51FB\u53F3\u4FA7\u6309\u94AE\u91CD\u65B0\u62C6\u89E3\uFF1A</div>
          <button class="sz-btn primary" data-act="ai-reparse" style="font-size:11px;padding:4px 12px;white-space:nowrap">\u91CD\u65B0\u62C6\u89E3</button>
        </div>
        ${d.questions.map((q, i) => `<div style="margin-bottom:6px"><div>\xB7 ${esc(q)}</div><input class="sz-input" data-ai-answer="${i}" placeholder="\u4F60\u7684\u56DE\u7B54" style="margin-top:4px;font-size:12px;padding:4px 6px" value=""></div>`).join("")}
      </div>` : ""}
      <label class="sz-label">\u76EE\u6807\u540D\u79F0</label>
      <input class="sz-input" data-ai-title value="${esc(d.title)}" placeholder="\u76EE\u6807\u540D\u79F0">
      <label class="sz-label">\u76EE\u6807\u7EA7\u5206\u7C7B\u63D0\u793A\u8BCD\uFF08\u544A\u8BC9 AI \u8FD9\u4E2A\u76EE\u6807\u6DB5\u76D6\u54EA\u4E9B\u5185\u5BB9\uFF0C\u7528\u4E8E\u81EA\u52A8\u5F52\u6863\u5224\u65AD\uFF09</label>
      <textarea class="sz-textarea" data-ai-prompt rows="2" placeholder="\u4F8B\u5982\uFF1A\u4E0E\u300C\u589E\u957F\u6570\u636E\u770B\u677F\u300D\u76F8\u5173\u7684\u4EA7\u54C1\u9700\u6C42\u3001\u57CB\u70B9\u65B9\u6848\u3001\u6570\u636E\u5206\u6790\u7B49">${esc(d.prompt || "")}</textarea>
      <div class="sz-ai-tasks">${taskBlocks || '<div class="sz-empty" style="padding:10px">\u65E0\u4EFB\u52A1</div>'}</div>
      <div class="sz-ai-actions">
        <button class="sz-btn primary" data-act="ai-confirm">${ICONS.check} \u786E\u8BA4\u521B\u5EFA</button>
        <button class="sz-btn" data-act="ai-cancel">\u53D6\u6D88</button>
      </div>
    </div>`;
    },
    renderRecords() {
      const recs = Store.read(K.records, []);
      const goals = Store.read(K.goals, []);
      const slackingOnly = getState().panelMode === "slacking";
      const groups = goals.map((g) => ({
        key: "goal:" + g.id,
        name: g.title,
        color: g.status === "active" ? goalColor(g) : "#9ca3af",
        items: []
      }));
      groups.push(
        { key: "slacking", name: "\u6478\u9C7C", color: "#d97706", items: [] },
        { key: "pending", name: "\u5206\u6790\u4E2D", color: "#6b7280", items: [] },
        { key: "error", name: "\u5206\u6790\u5931\u8D25", color: "#dc2626", items: [] },
        { key: "orphan", name: "\u5DF2\u79FB\u9664\u76EE\u6807", color: "#9ca3af", items: [] }
      );
      for (const r of recs) {
        if (r.matches && r.matches.length > 0 && r.category !== "pending" && r.category !== "error") {
          for (const m of r.matches) {
            const g = groups.find((x) => x.key === "goal:" + m.goalId);
            if (g) g.items.push({ record: r, match: m });
          }
        } else {
          let g = groups.find((x) => x.key === r.category);
          if (!g) {
            g = groups.find((x) => x.key === (String(r.category).startsWith("goal:") ? "orphan" : "pending"));
          }
          g.items.push({ record: r });
        }
      }
      const recHtml = (item, q) => {
        const r = item.record;
        const m = item.match;
        const keywords = m ? [] : r.keywords || [];
        const findings = m ? m.findings : r.findings || [];
        const notes = m ? m.notes : r.notes || [];
        const relevance = m ? m.relevance : r.relevance;
        const relTitle = m ? `\u76F8\u5173\u5EA6 ${relevance}/100\uFF08${m.reasoning ? m.reasoning.slice(0, 60) : ""}\uFF09` : relevance == null ? "\u672A\u5206\u6790" : `\u76F8\u5173\u5EA6 ${relevance}/100`;
        const displayTitle = m?.title || r.title || r.url;
        const truncatedTitle = displayTitle.length > 28 ? displayTitle.slice(0, 28) + "\u2026" : displayTitle;
        const kwHtml = keywords.length ? `<div class="sz-detail-sec">${keywords.slice(0, 8).map((k) => `<span class="sz-kw">${highlightText(k, q)}</span>`).join("")}</div>` : "";
        const findingsHtml = findings.length ? `<div class="sz-detail-sec"><div class="sz-detail-sec-title">\u{1F4A1} \u5173\u952E\u53D1\u73B0</div>${findings.map((f) => `<div class="sz-detail-finding">${highlightText(f, q)}</div>`).join("")}</div>` : "";
        const notesHtml = notes.length ? `<div class="sz-detail-sec"><div class="sz-detail-sec-title">\u{1F4D2} \u63D0\u53D6\u7B14\u8BB0</div>${notes.map((n) => `<div class="sz-detail-note"><div class="sz-detail-note-head"><span class="sz-detail-note-topic">${esc(n.topic)}</span><span class="sz-detail-note-rel">\u76F8\u5173\u5EA6 ${n.relevance}%</span></div><div class="sz-detail-note-content">${highlightText(n.content, q)}</div></div>`).join("")}</div>` : "";
        const keyQuotesHtml = m && m.keyQuotes?.length ? `<div class="sz-detail-sec"><div class="sz-detail-sec-title">\u{1F4CC} \u539F\u6587\u5F15\u7528</div>${m.keyQuotes.map((kq) => `<blockquote class="sz-detail-quote">${esc(kq.quote)}<cite>${esc(kq.context)}</cite></blockquote>`).join("")}</div>` : "";
        const hasDetail = keywords.length > 0 || findings.length > 0 || notes.length > 0 || m && (m.keyQuotes || []).length > 0 || r.category === "pending";
        const relCls = relevance == null ? "sz-rel-none" : relevance >= 60 ? "sz-rel-high" : relevance >= 30 ? "sz-rel-mid" : "sz-rel-low";
        const relBadge = relevance != null ? `<span class="sz-rel-badge">${relevance}%</span>` : "";
        const itemKey = m ? `${r.id}:${m.goalId}:${m.taskId || ""}:${m.subtaskId || ""}` : r.id;
        return `
      <div class="sz-rec" data-id="${esc(r.id)}" ${m ? `data-match-goal="${esc(m.goalId)}"` : ""}>
        <div class="sz-rec-head">
          <span class="sz-rel ${relCls}" title="${esc(relTitle)}"></span>
          <div class="sz-rec-main">
            <a class="sz-rtitle" href="${esc(r.url)}" target="_blank" rel="noopener" title="${esc(displayTitle)}">${highlightText(truncatedTitle, q)}</a>
            <div class="sz-rmeta">${fmtDate(r.capturedAt)}</div>
          </div>
          <div class="sz-rec-actions">
            ${relBadge}
            ${r.category === "pending" ? '<span class="sz-badge">\u5206\u6790\u4E2D</span>' : ""}
            ${hasDetail ? `<button class="sz-ibtn sz-expand" data-act="expand" title="\u5C55\u5F00\u5173\u952E\u53D1\u73B0">${ICONS.chevron}</button>` : ""}
            <button class="sz-ibtn" data-act="del-record" data-key="${esc(itemKey)}" title="\u5220\u9664\u8BB0\u5F55">${ICONS.trash}</button>
          </div>
        </div>
        <div class="sz-rec-detail">${kwHtml}${findingsHtml}${notesHtml}${keyQuotesHtml}${r.category === "pending" ? "\u6B63\u5728\u5206\u6790\u4E2D\uFF0C\u8BF7\u7A0D\u7B49\u7247\u523B~" : ""}</div>
        ${this.deleteConfirm("record", itemKey)}
        ${r.category === "error" && r.excerpt ? `<button class="sz-retry" data-act="retry" data-rid="${esc(r.id)}">\u91CD\u8BD5</button>` : ""}
      </div>`;
      };
      const byTime = (a, b) => b.record.capturedAt - a.record.capturedAt;
      const byRel = (a, b) => {
        const ra = a.match ? a.match.relevance : a.record.relevance;
        const rb = b.match ? b.match.relevance : b.record.relevance;
        return (rb ?? -1) - (ra ?? -1) || b.record.capturedAt - a.record.capturedAt;
      };
      if (this.recGroup) {
        let items = [];
        let groupName = "";
        let groupColor = "";
        let isSearchable = false;
        if (this.recGroup.startsWith("goal:")) {
          const gid = this.recGroup.slice(5);
          const g = goals.find((x) => x.id === gid);
          groupName = g?.title || "\u672A\u77E5\u76EE\u6807";
          groupColor = g?.status === "active" ? goalColor(g) : "#9ca3af";
          isSearchable = true;
          items = recs.flatMap((r) => {
            if (r.category === "pending" || r.category === "error") return [];
            if (r.matches?.length) return r.matches.filter((m) => m.goalId === gid).map((m) => ({ record: r, match: m }));
            if (r.category === "goal:" + gid) return [{ record: r }];
            return [];
          });
        } else if (this.recGroup.startsWith("task:")) {
          const tid = this.recGroup.slice(5);
          for (const g of goals) {
            const t = g.tasks?.find((x) => x.id === tid);
            if (t) {
              groupName = t.title;
              break;
            }
          }
          groupName = groupName || "\u672A\u77E5\u4EFB\u52A1";
          groupColor = "#2563eb";
          isSearchable = true;
          items = recs.flatMap((r) => {
            if (r.category === "pending" || r.category === "error") return [];
            if (r.matches?.length) return r.matches.filter((m) => m.taskId === tid).map((m) => ({ record: r, match: m }));
            return [];
          });
        } else if (this.recGroup.startsWith("subtask:")) {
          const sid = this.recGroup.slice(8);
          for (const g of goals) {
            for (const t of g.tasks || []) {
              const s = t.subtasks?.find((x) => x.id === sid);
              if (s) {
                groupName = s.title;
                break;
              }
            }
            if (groupName) break;
          }
          groupName = groupName || "\u672A\u77E5\u5B50\u4EFB\u52A1";
          groupColor = "#9333ea";
          isSearchable = true;
          items = recs.flatMap((r) => {
            if (r.category === "pending" || r.category === "error") return [];
            if (r.matches?.length) return r.matches.filter((m) => m.subtaskId === sid).map((m) => ({ record: r, match: m }));
            return [];
          });
        } else {
          const g = groups.find((x) => x.key === this.recGroup);
          groupName = g.name;
          groupColor = g.color;
          isSearchable = g.key.startsWith("goal:");
          items = g.items;
        }
        this.els.searchInput.style.display = isSearchable ? "" : "none";
        this.els.searchInput.placeholder = "\u641C\u7D22\uFF1A" + groupName;
        if (this.els.searchInput.value !== this.recQuery) this.els.searchInput.value = this.recQuery;
        const q = isSearchable ? this.recQuery.trim().toLowerCase() : "";
        const filtered = (q ? items.filter((item) => [item.record.title, item.record.url, item.record.summary, item.record.preview, (item.record.keywords || []).join(" "), item.match?.reasoning].some((s) => s && String(s).toLowerCase().includes(q))) : items).sort(this.recSort === "rel" ? byRel : byTime);
        let html2 = `<div class="sz-sec"><button class="sz-back" data-act="leave-group" title="\u8FD4\u56DE\u5168\u90E8\u5206\u7EC4">${ICONS.back}\u8FD4\u56DE</button><span class="sz-dot" style="background:${groupColor}"></span><span class="sz-gtitle">${esc(groupName)}</span><span class="sz-count">${filtered.length}</span></div>`;
        if (q) html2 += `<div class="sz-note" style="margin-bottom:6px">\u641C\u7D22"${esc(q)}"\uFF0C\u5339\u914D ${filtered.length} \u6761\u8BB0\u5F55</div>`;
        html2 += `<div class="sz-rec-list">${filtered.slice(0, 50).map((item) => recHtml(item, q)).join("") || (q ? '<div class="sz-empty">\u672A\u627E\u5230\u5339\u914D\u7684\u8BB0\u5F55</div>' : '<div class="sz-empty">\u8BE5\u5206\u7EC4\u6682\u65E0\u8BB0\u5F55</div>')}</div>`;
        this.els.body.innerHTML = html2;
        return;
      }
      let html = "";
      for (const g of slackingOnly ? groups.filter((group) => group.key === "slacking") : groups) {
        if (!g.items.length) continue;
        const collapsed = this.recCollapsed.has(g.key);
        html += `<div class="sz-sec sz-sec-link">
        <button class="sz-ibtn sz-rec-caret ${collapsed ? "" : "open"}" data-act="toggle-rec-group" data-key="${esc(g.key)}" title="${collapsed ? "\u5C55\u5F00\u8BB0\u5F55" : "\u6536\u8D77\u8BB0\u5F55"}">${ICONS.chevron}</button>
        <span class="sz-dot" style="background:${g.color}"></span>
        <span class="sz-gtitle sz-group-title" data-act="enter-group" data-key="${esc(g.key)}" title="\u8FDB\u5165\u8BE5\u5206\u7EC4">${esc(g.name)}</span>
        <span class="sz-count">${g.items.length}</span>
      </div>`;
        if (!collapsed) html += `<div class="sz-rec-list ${this.expandAnim === "rec:" + g.key ? "sz-expand-enter" : ""}">${g.items.sort(this.recSort === "rel" ? byRel : byTime).slice(0, 50).map((item) => recHtml(item, "")).join("")}</div>`;
      }
      this.els.body.innerHTML = (html ? `<div class="sz-note sz-priority-note" style="margin-bottom:8px">\u70B9\u51FB\u7EC4\u540D\u8FDB\u5165\u7B5B\u9009\u89C6\u56FE\uFF0C\u53EF\u6309\u76F8\u5173\u5EA6\u6216\u65F6\u95F4\u6392\u5E8F\u3002<span>\u2014\u2014 \u8DB3\u5370\u4E0D\u4F1A\u9A97\u4EBA\u3002</span></div>` + html : "") || `<div class="sz-empty-card">
      <div class="sz-empty-card-icon">${ICONS.globe}</div>
      <div class="sz-empty-card-title">\u8FD8\u6CA1\u6709\u8BB0\u5F55</div>
      <div class="sz-empty-card-desc">\u5F00\u59CB\u6D4F\u89C8\uFF0C\u8FD9\u91CC\u5C31\u4F1A\u957F\u51FA\u4F60\u7684\u8DB3\u8FF9\u3002<br>\u5DE5\u4F5C\u7F51\u9875\u6309<strong>\u76EE\u6807</strong>\u5206\u7EC4\uFF0C\u6478\u9C7C\u7F51\u9875\u5355\u72EC\u7B97\u8D26\u3002</div>
    </div>`;
    },
    renderProfile() {
      const profile = Store.read(K.profile, { updatedAt: 0, facts: [], preferences: [] });
      const has = profile.facts.length || profile.preferences.length;
      const list = (items, kind) => items.map((x, i) => `
      <div class="sz-todo-item">
        <div class="sz-todo-text">
          <span class="t">${esc(x)}</span>
          <button class="sz-ibtn" data-act="del-profile" data-kind="${kind}" data-idx="${i}" title="\u5220\u9664">${ICONS.trash}</button>
        </div>
        ${this.deleteConfirm("profile", kind + ":" + i)}
      </div>`).join("");
      this.els.body.innerHTML = `
    <div class="sz-field">
      <span class="sz-label">\u6DFB\u52A0\u753B\u50CF\u6761\u76EE</span>
      <div style="display:flex;gap:6px">
        <input class="sz-input" data-role="profile-input" placeholder="\u4F8B\u5982\uFF1A\u504F\u597D\u7528 Python \u5199\u811A\u672C" style="flex:1">
        <button class="sz-btn primary" data-act="add-profile">\u6DFB\u52A0</button>
      </div>
    </div>
    ${has ? `<div class="sz-note sz-priority-note" style="margin-bottom:8px">\u753B\u50CF\u4ECE\u6D4F\u89C8\u8BB0\u5F55\u81EA\u52A8\u63D0\u53D6\uFF0C\u4E5F\u53EF\u624B\u52A8\u8865\u5145\u3002<span>\u2014\u2014 \u8BA4\u8BC6\u4F60\u81EA\u5DF1\u3002</span></div>${profile.facts.length ? `<section class="sz-field sz-setting-card"><div class="sz-card-heading"><span class="sz-card-icon">${ICONS.fingerprint}</span><strong>\u5173\u4E8E\u4F60</strong></div>${list(profile.facts, "facts")}</section>` : ""}${profile.preferences.length ? `<section class="sz-field sz-setting-card"><div class="sz-card-heading"><span class="sz-card-icon">${ICONS.heart}</span><strong>\u504F\u597D</strong></div>${list(profile.preferences, "preferences")}</section>` : ""}` : `<div class="sz-profile-empty">
          <div class="sz-profile-empty-icon">${ICONS.sparkle}</div>
          <div class="sz-profile-empty-title">\u8FD8\u6CA1\u6709\u7528\u6237\u753B\u50CF</div>
          <div class="sz-profile-empty-desc">\u62FE\u77E5\u4F1A\u4ECE\u4F60\u7684\u5DE5\u4F5C\u6D4F\u89C8\u8BB0\u5F55\u4E2D\u4E86\u89E3\u4F60\u7684\u5173\u6CE8\u65B9\u5411\u548C\u504F\u597D\u3002<br>\u6BCF\u6D4F\u89C8 <strong>5</strong> \u4E2A\u5DE5\u4F5C\u7F51\u9875\uFF0C\u753B\u50CF\u4F1A\u81EA\u52A8\u66F4\u65B0\u3002</div>
        </div>`}`;
    },
    renderSettings() {
      const s = settings();
      const storageSnapshot = getStorageQuotaSnapshot();
      const promptVal = s.analysisPrompt || PRESET_PROMPT;
      const cloneTabs = [
        { key: "https", label: "HTTPS", cmd: "https://github.com/SkillRatLab/research-pilot.git" },
        { key: "ssh", label: "SSH", cmd: "git@github.com:SkillRatLab/research-pilot.git" },
        { key: "ghcli", label: "GitHub CLI", cmd: "gh repo clone SkillRatLab/research-pilot" }
      ];
      const activeClone = cloneTabs.find((t) => t.key === this.cloneTab) || cloneTabs[0];
      this.els.body.innerHTML = `
    ${this.renderStorageCard(storageSnapshot)}
    <section class="sz-field sz-setting-card sz-switch-card">
      <div class="sz-switch-text">
        <div class="sz-card-heading"><span class="sz-card-icon">${ICONS.deepseek}</span><strong>\u95EE\u95EE DeepSeek Harness</strong></div>
        <span class="sz-switch-desc">\u9009\u4E2D\u7F51\u9875\u6587\u5B57\u540E\u53F3\u952E\uFF0C\u628A\u5185\u5BB9\u76F4\u63A5\u5E26\u8FDB\u672C\u5730 DeepSeek Harness \u7EE7\u7EED\u63D0\u95EE\u3002</span>
        <span class="sz-label">DeepSeek Harness \u670D\u52A1\u5730\u5740</span>
        <input class="sz-input" data-role="dsh-url" value="${esc(s.dshUrl)}" placeholder="${esc(DSH_URL)}" aria-label="DeepSeek Harness \u670D\u52A1\u5730\u5740">
      </div>
      <button class="sz-switch ${s.askDsh ? "on" : ""}" data-act="toggle-ask-dsh" role="switch" aria-checked="${s.askDsh}" aria-label="\u95EE\u95EE DeepSeek Harness"><span class="sz-switch-knob"></span></button>
    </section>
    <section class="sz-field sz-setting-card sz-switch-card">
      <div class="sz-switch-text">
        <div class="sz-card-heading"><span class="sz-card-icon">${ICONS.sparkle}</span><strong>\u63D0\u793A\u8BCD\u81EA\u52A8\u8865\u5168</strong></div>
        <span class="sz-switch-desc">\u5728 Yuze \u9996\u9875\u8F93\u5165\u63D0\u793A\u8BCD\u65F6\uFF0CAI \u4F1A\u5728\u672B\u5C3E\u663E\u793A\u53EF\u63A5\u53D7\u7684\u8865\u5168\u6587\u5B57\u3002</span>
      </div>
      <button class="sz-switch ${s.autocomplete ? "on" : ""}" data-act="toggle-autocomplete" role="switch" aria-checked="${s.autocomplete}" aria-label="\u63D0\u793A\u8BCD\u81EA\u52A8\u8865\u5168"><span class="sz-switch-knob"></span></button>
    </section>
    <section class="sz-field sz-setting-card">
      <div class="sz-card-heading"><span class="sz-card-icon">${ICONS.sparkle}</span><strong>\u8BB0\u5F55\u5206\u6790\u63D0\u793A\u8BCD</strong></div>
      <span class="sz-label" style="padding-left:36px">\u7559\u7A7A\u5219\u4F7F\u7528\u9884\u8BBE</span>
      <textarea class="sz-textarea" data-role="prompt-input" placeholder="${esc(PRESET_PROMPT)}">${esc(promptVal)}</textarea>
      <div style="display:flex;gap:6px;margin-top:6px">
        <button class="sz-btn primary" data-act="save-settings">\u4FDD\u5B58</button>
        <button class="sz-btn" data-act="reset-prompt">\u91CD\u7F6E\u4E3A\u9884\u8BBE</button>
      </div>
    </section>
    <section class="sz-field sz-setting-card">
      <div class="sz-card-heading"><span class="sz-card-icon">${ICONS.download}</span><strong>\u914D\u5957 Skill \u4E0B\u8F7D</strong></div>
      <div style="display:flex;gap:2px;margin-bottom:8px">
        ${cloneTabs.map((t) => `<button class="sz-btn" data-act="clone-tab" data-tab="${t.key}" style="border-bottom:${t.key === activeClone.key ? "2px solid transparent" : "2px solid var(--accent)"};border-radius:4px 4px 0 0;background:${t.key === activeClone.key ? "var(--bg-hover)" : "transparent"};padding:4px 10px;font-size:13px">${esc(t.label)}</button>`).join("")}
      </div>
      <div style="display:flex;align-items:center;gap:6px;padding:8px 10px;background:var(--bg-card);border:1px solid var(--bd-panel);border-radius:6px;font-family:ui-monospace,SFMono-Regular,SF Mono,Menlo,Consolas,Liberation Mono,monospace;font-size:12px;color:var(--tx-primary)">
        <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(activeClone.cmd)}</span>
        <button class="sz-btn" data-act="copy-clone" data-cmd="${esc(activeClone.cmd)}" style="padding:2px 8px;font-size:12px;flex-shrink:0">\u590D\u5236</button>
      </div>
    </section>
    <section class="sz-project-footer sz-setting-card">
      <div class="sz-project-meta">
        <span><strong>\u7248\u672C</strong><b>${APP_VERSION}</b></span>
        <span class="sz-doc-placeholder" aria-disabled="true">${ICONS.globe} \u5B98\u65B9\u6587\u6863</span>
      </div>
      <a class="sz-issue-link" href="https://github.com/Winddfall/Glean/issues" target="_blank" rel="noopener noreferrer">
        <span class="sz-issue-star" aria-hidden="true">\u2B50</span>
        <span>\u89C9\u5F97\u62FE\u77E5\u597D\u7528\u5417\uFF1F\u5728 Github \u63D0\u51FA Issue\uFF0C\u80FD\u5E2E\u52A9\u6211\u4EEC\u66F4\u597D\u5730\u6539\u8FDB\u5B83\uFF01</span>
        ${ICONS.ext}
      </a>
      <a class="sz-star-project" href="https://github.com/Winddfall/Glean" target="_blank" rel="noopener noreferrer">
        ${ICONS.github}<span>\u4E3A\u9879\u76EE\u70B9\u4EAE\u2B50</span>
      </a>
    </section>`;
    },
    renderExportPop() {
      const pop = this.root.querySelector('[data-role="export-pop"]');
      if (!pop) return;
      if (!this.exportOpen) {
        pop.style.display = "none";
        return;
      }
      const goals = Store.read(K.goals, []);
      pop.innerHTML = `
      <div class="sz-export-row">
        <select class="sz-input" data-role="export-select" style="flex:1;min-width:140px">
          <option value="">\u2014 \u9009\u62E9\u8981\u5BFC\u51FA\u7684\u8BB0\u5F55 \u2014</option>
          <option value="all">\u5BFC\u51FA\u5168\u90E8\u8BB0\u5F55</option>
          ${goals.map((g) => `<option value="${esc(g.id)}">\u5BFC\u51FA\u300C${esc(g.title)}\u300D</option>`).join("")}
        </select>
        <button class="sz-btn" data-act="export-cancel">\u53D6\u6D88</button>
        <button class="sz-btn primary" data-act="export-selected">\u5BFC\u51FA</button>
      </div>`;
      pop.style.display = "block";
    },
    renderTodo() {
      const pop = this.els.todoPop;
      const txt = this.root.querySelector('[data-role="todo-txt"]');
      const goals = Store.read(K.goals, []);
      const sug = currentSuggestion(goals);
      txt.textContent = sug ? "\u5F53\u524D\u5EFA\u8BAE\uFF1A" + sug.text : "\u5F85\u529E";
      pop.classList.toggle("open", this.todoOpen);
      if (!this.todoOpen) return;
      let dataModified = false;
      for (const g of goals) {
        if (g.status !== "active") continue;
        if (g.tasks?.length) {
          const existing = new Set((g.todos || []).map((t) => t.taskId).filter(Boolean));
          for (const task of g.tasks) {
            if (existing.has(task.id)) continue;
            g.todos = g.todos || [];
            g.todos.push({
              id: uid("todo"),
              text: task.title,
              taskId: task.id,
              contrib: {},
              coverage: 0,
              status: "open",
              manual: false,
              searchTerms: (task.searchTerms || []).slice(0, 3)
            });
            dataModified = true;
          }
        }
        for (const todo of g.todos || []) {
          const todoTerms = (todo.searchTerms || []).filter((s) => normalizeSearchTerm(s).query);
          if (todo.status === "open" && !todoTerms.length) {
            const task = g.tasks?.find((t) => t.id === todo.taskId);
            const taskTerms = (task?.searchTerms || []).filter((s) => normalizeSearchTerm(s).query);
            if (taskTerms.length) {
              todo.searchTerms = taskTerms.slice(0, 3);
            } else {
              const base = todo.text || g.title || "\u641C\u7D22";
              todo.searchTerms = [{ display: base, query: base }];
            }
            dataModified = true;
          }
        }
      }
      if (dataModified) {
        Store.write(K.goals, goals);
      }
      const list = this.root.querySelector('[data-role="todo-list"]');
      const countEl = this.root.querySelector('[data-role="todo-count"]');
      const activeGoals = goals.filter((g) => g.status === "active");
      if (countEl) {
        const openCount = activeGoals.reduce((n, g) => n + (g.todos || []).filter((t) => t.status === "open").length, 0);
        countEl.textContent = openCount ? String(openCount) : "";
      }
      if (!activeGoals.length) {
        list.innerHTML = '<div class="sz-empty">\u6682\u65E0\u76EE\u6807</div>';
        return;
      }
      let html = "";
      for (const g of activeGoals) {
        const todos = g.todos || [];
        const tasks = g.tasks || [];
        html += `<div class="sz-todo-goal"><span class="sz-dot" style="background:${goalColor(g)}"></span><span class="sz-todo-goal-name">${esc(g.title)}</span></div>`;
        const items = todos.length ? todos : tasks.map((task) => ({
          id: task.id,
          text: task.title,
          status: "open",
          coverage: 0,
          searchTerms: []
        }));
        if (!items.length) {
          html += `<div class="sz-empty" style="font-size:12px;padding:8px 0">\u6682\u65E0\u5F85\u529E\uFF0C\u6DFB\u52A0\u4EFB\u52A1\u540E\u81EA\u52A8\u751F\u6210</div>`;
          continue;
        }
        html += items.map((t) => {
          const pct = Math.round(Math.min(1, t.coverage || 0) * 100);
          let rawTerms = (t.searchTerms || []).filter((s) => normalizeSearchTerm(s).query);
          if (t.status === "open" && !rawTerms.length) {
            const base = t.text || g.title || "\u641C\u7D22";
            rawTerms = [{ display: base, query: base }];
          }
          const terms = rawTerms.slice(0, 3).map((s) => enrichSearchTerm(normalizeSearchTerm(s)));
          const termChips = terms.length ? `<div class="sz-term-chips">${terms.map((st) => `<span class="sz-term-chip"><button class="sz-term-go" data-act="search-term" data-term="${esc(st.query)}" title="\u8DF3\u8F6C\u641C\u7D22">${esc(st.display)}</button><button class="sz-term-copy" data-act="copy-term" data-term="${esc(st.query)}" title="\u590D\u5236\u641C\u7D22\u8BCD">${ICONS.copy}</button></span>`).join("")}</div>` : `<div style="color:var(--tx-muted);font-size:11px;margin-top:3px">\u6D4F\u89C8\u76F8\u5173\u9875\u9762\u540E\u641C\u7D22\u8BCD\u4F1A\u81EA\u52A8\u8865\u5145</div>`;
          return `
        <div class="sz-todo-item">
          <div class="sz-todo-row">
            <span class="sz-dot" style="background:${t.status === "done" ? "#16a34a" : "var(--accent)"}"></span>
            <span class="t">${esc(t.text)}</span>
            <span class="sz-todo-pct">${pct}%</span>
          </div>
          <div class="sz-bar"><i style="width:${pct}%"></i></div>
          ${termChips}
        </div>`;
        }).join("");
      }
      list.innerHTML = html || '<div class="sz-empty">\u6682\u65E0\u5F85\u529E\u5EFA\u8BAE\u3002\u76EE\u6807\u4E0B\u6DFB\u52A0\u4EFB\u52A1/\u5B50\u4EFB\u52A1\u540E\uFF0CAI \u4F1A\u751F\u6210\u5F85\u529E\u3002</div>';
    },
    applyPanelSize() {
      const p = this.els.panel;
      if (this.panelSize) {
        p.style.width = this.panelSize.w + "px";
        p.style.height = this.panelSize.h + "px";
        p.style.maxHeight = "80vh";
      } else {
        p.style.width = "";
        p.style.height = "";
        p.style.maxHeight = "";
      }
    },
    initTheme() {
      const dark = Store.read(K.theme, "light") === "dark";
      this.applyTheme(dark);
    },
    initThemeColor() {
      this.applyThemeColor(Store.read(K.themeColor, DEFAULT_THEME_COLOR));
    },
    setThemeColor(value) {
      const color = /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : DEFAULT_THEME_COLOR;
      Store.write(K.themeColor, color);
      this.applyThemeColor(color);
      this.themeColorOpen = false;
      this.els.themeColorPop.classList.remove("open");
    },
    applyThemeColor(value) {
      const color = /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : DEFAULT_THEME_COLOR;
      const preset = THEME_COLORS[color];
      const dark = this.els.dock.classList.contains("dark");
      const accent = preset ? dark ? preset.dark : preset.light : color;
      const soft = preset ? dark ? preset.darkSoft : preset.soft : `color-mix(in srgb, ${color} 32%, ${dark ? "#1a1b1e" : "#ffffff"})`;
      const hover = preset ? dark ? preset.darkHover : preset.hover : `color-mix(in srgb, ${color} 8%, ${dark ? "#1a1b1e" : "#ffffff"})`;
      const badge = preset ? dark ? preset.darkBadge : preset.badge : `color-mix(in srgb, ${color} 16%, ${dark ? "#1a1b1e" : "#ffffff"})`;
      this.els.dock.style.setProperty("--accent", accent);
      this.els.dock.style.setProperty("--accent-soft", soft);
      this.els.dock.style.setProperty("--bg-hover", hover);
      this.els.dock.style.setProperty("--bg-tab-act", hover);
      this.els.dock.style.setProperty("--bg-badge-on", badge);
      this.els.dock.style.setProperty("--fab-color", accent);
      this.updateThemeColorPalette(color, preset?.name || "\u81EA\u5B9A\u4E49");
    },
    updateThemeColorPalette(color, name) {
      if (!this.root) return;
      this.root.querySelectorAll(".sz-theme-swatch[data-color]").forEach((button) => {
        button.classList.toggle("selected", button.dataset.color?.toLowerCase() === color.toLowerCase());
      });
      const input = this.root.querySelector('[data-role="theme-color-input"]');
      if (input) input.value = color;
      const label = this.root.querySelector('[data-role="theme-color-label"]');
      if (label) label.textContent = name || "\u81EA\u5B9A\u4E49";
      const hex = this.root.querySelector('[data-role="theme-color-hex"]');
      if (hex) hex.textContent = color.toUpperCase();
    },
    applyTheme(dark) {
      this.els.dock.classList.toggle("dark", dark);
      this.els.themeBtn.innerHTML = dark ? ICONS.sun : ICONS.moon;
      this.applyThemeColor(Store.read(K.themeColor, DEFAULT_THEME_COLOR));
    },
    toggleTheme() {
      const dark = !this.els.dock.classList.contains("dark");
      this.applyTheme(dark);
      Store.write(K.theme, dark ? "dark" : "light");
    },
    initResize() {
      this.els.resize.addEventListener("mousedown", (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        const sx = e.clientX, sy = e.clientY;
        const rect = this.els.panel.getBoundingClientRect();
        const sw = rect.width, sh = rect.height;
        const dirX = this.els.dock.classList.contains("flip-h") ? 1 : -1;
        const dirY = this.els.dock.classList.contains("flip-v") ? 1 : -1;
        const onMove = (ev) => {
          const w = clamp(Math.round(sw + (ev.clientX - sx) * dirX), 280, Math.round(window.innerWidth * 0.9));
          const h = clamp(Math.round(sh + (ev.clientY - sy) * dirY), 240, Math.round(window.innerHeight * 0.8));
          this.panelSize = { w, h };
          this.applyPanelSize();
        };
        const onUp = () => {
          document.removeEventListener("mousemove", onMove);
          document.removeEventListener("mouseup", onUp);
          if (this.panelSize) Store.write(K.panelSize, this.panelSize);
        };
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
      });
      this.els.resize.addEventListener("dblclick", () => {
        this.panelSize = null;
        Store.del(K.panelSize);
        this.applyPanelSize();
      });
    },
    placeDock(x, y) {
      const vw = window.innerWidth, vh = window.innerHeight;
      x = clamp(x, 0, Math.max(0, vw - 40));
      y = clamp(y, 0, Math.max(0, vh - 40));
      this.pos = { x, y };
      const dock = this.els.dock;
      dock.style.left = x + "px";
      dock.style.top = y + "px";
      dock.classList.toggle("flip-v", y + 20 < vh / 2);
      dock.classList.toggle("flip-h", x + 40 < 360);
    },
    initDrag() {
      this.els.fab.addEventListener("mousedown", (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        const sx = e.clientX, sy = e.clientY;
        const ox = this.pos.x, oy = this.pos.y;
        let moved = false;
        const onMove = (ev) => {
          const dx = ev.clientX - sx, dy = ev.clientY - sy;
          if (!moved && Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
          moved = true;
          this.els.fab.classList.add("dragging");
          this.placeDock(ox + dx, oy + dy);
        };
        const onUp = () => {
          document.removeEventListener("mousemove", onMove);
          document.removeEventListener("mouseup", onUp);
          this.els.fab.classList.remove("dragging");
          if (!moved) return;
          Store.write(K.fabPos, this.pos);
          this.suppressFabClick = true;
          setTimeout(() => {
            this.suppressFabClick = false;
          }, 0);
        };
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
      });
    },
    toast(text, kind) {
      if (!this.root) return;
      const t = document.createElement("div");
      t.className = "sz-toast " + (kind || "ok");
      const txt = document.createElement("span");
      txt.className = "txt";
      txt.textContent = text;
      t.appendChild(txt);
      this.els.toasts.appendChild(t);
      void t.offsetWidth;
      t.classList.add("show");
      setTimeout(() => {
        t.classList.remove("show");
        t.classList.add("hide");
        setTimeout(() => t.remove(), 300);
      }, 3e3);
    }
  };

  // src/autocomplete/engine.ts
  function cleanOutput(raw, maxChars = 24) {
    let s = String(raw == null ? "" : raw).trim();
    if (s.startsWith('"') && s.endsWith('"') || s.startsWith("'") && s.endsWith("'")) {
      s = s.slice(1, -1).trim();
    }
    if (/^(?:当然|好的|你好|我可以(?:帮|为)|作为(?:一个)?AI|我能(?:帮|为)|很高兴)/.test(s)) {
      return "";
    }
    if (s.length > maxChars) {
      const end = s.search(/[。！？.!?]/);
      s = end > 0 ? s.slice(0, end + 1) : s.slice(0, maxChars);
    }
    return s;
  }
  function normalizeCompletionBoundary(input, completion) {
    let result = completion.trimStart();
    const lastChar = input.trimEnd().slice(-1);
    if (/[，。！？；：、,.!?;:]/.test(lastChar)) {
      result = result.replace(/^[，。！？；：、,.!?;:]+\s*/, "");
    }
    return result;
  }
  function buildPrompt(input, profile) {
    const profileLine = profile ? `
[\u7528\u6237\u753B\u50CF]
${profile}` : "";
    return `\u4F60\u662F\u7528\u6237\u6B63\u5728\u4F7F\u7528\u7684\u201C\u63D0\u95EE\u7EED\u5199\u5668\u201D\uFF0C\u4E0D\u662F\u56DE\u7B54\u95EE\u9898\u7684\u804A\u5929\u52A9\u624B\u3002\u4F60\u7684\u4EFB\u52A1\u662F\u7AD9\u5728\u7528\u6237\u4E00\u4FA7\uFF0C\u9884\u6D4B\u7528\u6237\u63A5\u4E0B\u6765\u60F3\u600E\u6837\u63D0\u95EE\u6216\u63D0\u51FA\u8BF7\u6C42\uFF0C\u628A\u6700\u81EA\u7136\u3001\u6700\u6709\u5E2E\u52A9\u7684\u540E\u534A\u53E5\u76F4\u63A5\u63A5\u5728\u5DF2\u6709\u6587\u672C\u540E\u9762\u3002\u8F93\u51FA\u5FC5\u987B\u50CF\u7528\u6237\u672C\u4EBA\u6B63\u5728\u8F93\u5165\u7684\u5185\u5BB9\uFF0C\u4F53\u73B0\u660E\u786E\u7684\u63D0\u95EE\u8005\u8BED\u6C14\u3002${profileLine}

\u786C\u6027\u89C4\u5219\uFF1A
1. \u53EA\u8F93\u51FA\u8981\u8FFD\u52A0\u7684\u6587\u5B57\uFF0C\u7EDD\u4E0D\u590D\u8FF0\u5DF2\u6709\u6587\u672C\u3001\u89E3\u91CA\u89C4\u5219\u3001\u52A0\u5F15\u53F7\u3001\u52A0\u6807\u9898\u6216\u52A0\u201C\u7B54\u6848\uFF1A\u201D\u7B49\u524D\u7F00
2. \u628A\u5DF2\u6709\u6587\u672C\u5F53\u4F5C\u7528\u6237\u8F93\u5165\u7684\u5F00\u5934\uFF1A\u7406\u89E3\u7528\u6237\u771F\u6B63\u60F3\u95EE\u7684\u5BF9\u8C61\u3001\u76EE\u7684\u548C\u4E0A\u4E0B\u6587\uFF0C\u518D\u8865\u51FA\u81EA\u7136\u7684\u540E\u534A\u53E5\uFF1B\u4E0D\u8981\u673A\u68B0\u8865\u8BCD
3. \u59CB\u7EC8\u4EE5\u63D0\u95EE\u8005/\u8BF7\u6C42\u8005\u7684\u7ACB\u573A\u7EE7\u7EED\u8BF4\u8BDD\uFF1A\u53EF\u4EE5\u81EA\u7136\u4F7F\u7528\u201C\u600E\u4E48\u3001\u4E3A\u4EC0\u4E48\u3001\u80FD\u5426\u3001\u8BF7\u89E3\u91CA\u3001\u5E2E\u6211\u6BD4\u8F83\u3001\u6709\u54EA\u4E9B\u201D\u7B49\u8868\u8FBE\uFF0C\u4F46\u4E0D\u8981\u66FF\u7528\u6237\u56DE\u7B54\u3001\u603B\u7ED3\u7ED3\u8BBA\u6216\u5047\u88C5\u5DF2\u7ECF\u5B8C\u6210\u4EFB\u52A1
4. \u5982\u679C\u5DF2\u6709\u6587\u672C\u5DF2\u7ECF\u5305\u542B\u95EE\u9898\u5F00\u5934\uFF0C\u5C31\u8865\u5145\u7F3A\u5931\u7684\u5BF9\u8C61\u3001\u6761\u4EF6\u6216\u5173\u6CE8\u70B9\uFF0C\u8BA9\u95EE\u9898\u66F4\u5177\u4F53\uFF1B\u4E0D\u8981\u51ED\u7A7A\u7F16\u9020\u4E8B\u5B9E\u3001\u6570\u5B57\u3001\u7ACB\u573A\u6216\u7528\u6237\u6CA1\u6709\u63D0\u5230\u7684\u9650\u5236
5. \u4FDD\u6301\u539F\u6587\u7684\u8BED\u8A00\u3001\u8BED\u6C14\u3001\u6807\u70B9\u548C\u4EBA\u79F0\uFF1B\u4E2D\u6587\u4F18\u5148\u4F7F\u7528\u81EA\u7136\u53E3\u8BED\uFF0C\u82F1\u6587\u4FDD\u6301\u81EA\u7136\u7684\u63D0\u95EE\u6216\u8BF7\u6C42\u8868\u8FBE
6. \u53EA\u8865\u4E00\u4E2A\u77ED\u800C\u5B8C\u6574\u7684\u7247\u6BB5\uFF0C\u4E2D\u6587\u901A\u5E38\u4E0D\u8D85\u8FC7 24 \u4E2A\u5B57\uFF1B\u4F18\u5148\u63D0\u4F9B\u6709\u4FE1\u606F\u91CF\u7684\u7EED\u5199\uFF0C\u4E0D\u8981\u4E3A\u4E86\u51D1\u957F\u5EA6\u6269\u5199\uFF1B\u62FF\u4E0D\u51C6\u5C31\u8F93\u51FA\u7A7A\u5B57\u7B26\u4E32
7. \u5982\u679C\u8FD9\u6B21\u8865\u5168\u8BA9\u6574\u53E5\u8BDD\u81EA\u7136\u7ED3\u675F\uFF0C\u5FC5\u987B\u8865\u4E0A\u53E5\u672B\u6807\u70B9\uFF0C\u4E0D\u80FD\u4E3A\u4E86\u7B80\u77ED\u800C\u7701\u7565\uFF1A\u7591\u95EE\u53E5\u7528\u201C\uFF1F\u201D\uFF0C\u9648\u8FF0\u53E5\u6216\u8BF7\u6C42\u53E5\u7528\u201C\u3002\u201D\uFF0C\u611F\u53F9\u8BED\u6C14\u7528\u201C\uFF01\u201D\uFF1B\u82F1\u6587\u5206\u522B\u4F7F\u7528 \u201C?\u201D, \u201C.\u201D, \u201C!\u201D
8. \u7EDD\u4E0D\u4EE5 AI\u3001\u52A9\u624B\u3001\u5BA2\u670D\u6216\u641C\u7D22\u5DE5\u5177\u8EAB\u4EFD\u8BF4\u8BDD\uFF1B\u4E0D\u8981\u51FA\u73B0\u201C\u5F53\u7136\u201D\u201C\u597D\u7684\u201D\u201C\u4F5C\u4E3A AI\u201D\u201C\u6211\u53EF\u4EE5\u5E2E\u4F60\u201D\u7B49\u52A9\u624B\u8154

\u793A\u4F8B\uFF1A
\u5DF2\u6709\u6587\u672C\uFF1A\u201C\u5E2E\u6211\u5199\u4E00\u7BC7\u201D
\u53EA\u8F93\u51FA\u5149\u6807\u540E\u7EED\u5199\uFF1A\u5173\u4E8E AI \u53D1\u5C55\u7684\u6587\u7AE0\uFF0C\u5E76\u8BF4\u660E\u672A\u6765\u8D8B\u52BF\u3002
\u5DF2\u6709\u6587\u672C\uFF1A\u201C\u4E3A\u4EC0\u4E48\u6211\u7684\u4EE3\u7801\u201D
\u53EA\u8F93\u51FA\u5149\u6807\u540E\u7EED\u5199\uFF1A\u8FD0\u884C\u901F\u5EA6\u8FD9\u4E48\u6162\uFF1F
\u5DF2\u6709\u6587\u672C\uFF1A\u201C\u6BD4\u8F83\u4E00\u4E0B React \u548C Vue\u201D
\u53EA\u8F93\u51FA\u5149\u6807\u540E\u7EED\u5199\uFF1A\u5728\u5927\u578B\u9879\u76EE\u4E2D\u7684\u4F18\u7F3A\u70B9\uFF1F
\u5DF2\u6709\u6587\u672C\uFF1A\u201C\u6211\u60F3\u4E86\u89E3\u91CF\u5B50\u8BA1\u7B97\uFF0C\u5E94\u8BE5\u201D
\u53EA\u8F93\u51FA\u5149\u6807\u540E\u7EED\u5199\uFF1A\u4ECE\u54EA\u4E9B\u57FA\u7840\u6982\u5FF5\u5F00\u59CB\uFF1F
\u5DF2\u6709\u6587\u672C\uFF1A\u201CExplain\u201D
\u53EA\u8F93\u51FA\u5149\u6807\u540E\u7EED\u5199\uFF1A how machine learning works

\u5DF2\u6709\u6587\u672C\uFF1A\u201C${input}\u201D
\u53EA\u8F93\u51FA\u5149\u6807\u540E\u7EED\u5199\uFF1A`;
  }
  var CompletionEngine = class {
    chat;
    maxChars;
    cache = /* @__PURE__ */ new Map();
    constructor(options = {}) {
      this.chat = options.chat ?? defaultChat;
      this.maxChars = options.maxChars ?? 24;
    }
    async complete(input, profile = "") {
      const key = profile + "\0" + input;
      const hit = this.cache.get(key);
      if (hit !== void 0) return hit;
      const raw = await this.chat(buildPrompt(input, profile));
      const completion = cleanOutput(raw, this.maxChars);
      if (completion) this.cache.set(key, completion);
      return completion;
    }
  };
  function defaultChat(prompt2) {
    const bridge = window.LLMBridge;
    if (!bridge) throw new Error("\u672A\u68C0\u6D4B\u5230 LLMBridge");
    return bridge.chat(prompt2);
  }

  // src/autocomplete/homeInput.ts
  var INPUT_SELECTORS = [
    '[data-chip-editor="true"]',
    '[contenteditable="plaintext-only"][role="textbox"]'
  ];
  var MIN_CHARS = 3;
  var DEBOUNCE_MS = 600;
  var GHOST_CLASS = "shizhi-ghost-text";
  function isYuzeHome() {
    return /(^|\.)Yuze\.com$/i.test(location.hostname);
  }
  function findEditor() {
    for (const selector of INPUT_SELECTORS) {
      const el = document.querySelector(selector);
      if (el && el.isContentEditable) return el;
    }
    return null;
  }
  function readEditorText(el) {
    return (el.innerText || el.textContent || "").replace(/\u00a0/g, " ").trim();
  }
  function buildProfileContext() {
    const profile = Store.read(K.profile, { updatedAt: 0, facts: [], preferences: [] });
    const facts = (profile.facts || []).map((s) => String(s).trim()).filter(Boolean).slice(0, 5);
    const preferences = (profile.preferences || []).map((s) => String(s).trim()).filter(Boolean).slice(0, 5);
    const lines = [];
    if (facts.length) lines.push("\u7528\u6237\u4E8B\u5B9E\uFF1A" + facts.join("\uFF1B"));
    if (preferences.length) lines.push("\u7528\u6237\u504F\u597D\uFF1A" + preferences.join("\uFF1B"));
    return lines.join("\n");
  }
  function insertTextAtEnd(el, text) {
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    let inserted = false;
    try {
      inserted = document.execCommand("insertText", false, text);
    } catch {
      inserted = false;
    }
    if (!inserted) {
      el.textContent = (el.textContent || "") + text;
      el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
    }
  }
  var HomeInputAutocomplete = class {
    engine = new CompletionEngine();
    inputElement = null;
    ghostElement = null;
    currentCompletion = "";
    ghostInputText = "";
    debounceTimer = null;
    pollTimer = null;
    mutationObserver = null;
    generation = 0;
    inFlight = false;
    retries = 0;
    cooldownUntil = 0;
    pending = null;
    start() {
      const initial = findEditor();
      if (initial) this.setInputElement(initial);
      document.addEventListener("input", this.handleGlobalInput, true);
      window.addEventListener("shizhi-settings-changed", this.handleSettingsChanged);
      this.observeInputDom();
      this.pollTimer = window.setInterval(() => {
        const live = findEditor();
        if (live && live !== this.inputElement) this.setInputElement(live);
      }, 2e3);
    }
    setInputElement(el) {
      if (el === this.inputElement) return;
      this.inputElement = el;
      el.addEventListener("keydown", this.handleKeydown);
      el.addEventListener("blur", this.handleBlur);
      el.addEventListener("scroll", this.handleScroll);
      this.setupGhostElement(el);
      console.log("[\u62FE\u77E5] Yuze \u9996\u9875\u63D0\u793A\u8BCD\u8865\u5168\u5DF2\u542F\u7528");
    }
    setupGhostElement(inputEl) {
      const parent = inputEl.parentElement;
      if (!parent) return;
      if (getComputedStyle(parent).position === "static") {
        parent.style.position = "relative";
      }
      if (!this.ghostElement) {
        this.ghostElement = document.createElement("span");
        this.ghostElement.className = GHOST_CLASS;
        this.ghostElement.setAttribute("aria-hidden", "true");
        this.ghostElement.style.cssText = "position:absolute;top:0;left:0;pointer-events:none;color:rgba(148,148,148,.55);white-space:pre-wrap;word-break:break-word;overflow-wrap:break-word;z-index:10;display:none;background:transparent;";
      }
      if (this.ghostElement.parentElement !== parent) {
        parent.appendChild(this.ghostElement);
      }
    }
    observeInputDom() {
      this.mutationObserver?.disconnect();
      this.mutationObserver = new MutationObserver(() => {
        const live = findEditor();
        if (!live) {
          this.detach();
          return;
        }
        if (live !== this.inputElement) {
          this.setInputElement(live);
          return;
        }
        if (this.ghostElement && !this.ghostElement.isConnected) {
          this.setupGhostElement(live);
          this.hideGhost();
          return;
        }
        if (this.ghostInputText && readEditorText(live) !== this.ghostInputText) {
          this.invalidateGhost();
        }
      });
      this.mutationObserver.observe(document.body, { childList: true, subtree: true, characterData: true });
    }
    detach() {
      this.hideGhost();
      this.clearDebounce();
      this.generation++;
      if (this.ghostElement) {
        this.ghostElement.remove();
        this.ghostElement = null;
      }
      this.inputElement = null;
    }
    handleSettingsChanged = () => {
      if (!settings().autocomplete) {
        this.generation++;
        this.clearDebounce();
        this.pending = null;
        this.hideGhost();
      }
    };
    handleGlobalInput = (event) => {
      if (!settings().autocomplete) return;
      const live = findEditor();
      if (!live || !(event.target instanceof Node) || !live.contains(event.target)) return;
      if (live !== this.inputElement) this.setInputElement(live);
      const text = readEditorText(live);
      this.generation++;
      this.hideGhost();
      if (text.length < MIN_CHARS) {
        this.clearDebounce();
        return;
      }
      this.clearDebounce();
      const generation = this.generation;
      this.debounceTimer = window.setTimeout(() => {
        this.requestCompletion(text, generation);
      }, DEBOUNCE_MS);
    };
    handleKeydown = (event) => {
      if (!settings().autocomplete) return;
      if (event.key === "Tab" && this.currentCompletion) {
        event.preventDefault();
        this.acceptCompletion();
        return;
      }
      if (event.key === "Escape" || event.key.startsWith("Arrow") || event.key === "Enter") {
        this.hideGhost();
      }
    };
    handleBlur = () => {
      this.hideGhost();
    };
    handleScroll = () => {
      if (!this.ghostElement || !this.inputElement) return;
      this.ghostElement.style.transform = `translate(${-this.inputElement.scrollLeft}px, ${-this.inputElement.scrollTop}px)`;
    };
    async requestCompletion(text, generation) {
      if (!settings().autocomplete || generation !== this.generation) return;
      if (this.inFlight) {
        this.pending = { text, generation };
        return;
      }
      if (Date.now() < this.cooldownUntil) return;
      this.inFlight = true;
      try {
        const completion = await this.engine.complete(text, buildProfileContext());
        if (generation !== this.generation || !this.isLiveInput(text)) {
          this.hideGhost();
          return;
        }
        this.retries = 0;
        const normalized = normalizeCompletionBoundary(text, completion);
        if (normalized) this.showGhost(text, normalized);
      } catch {
        this.retries = Math.min(this.retries + 1, 3);
        this.cooldownUntil = Date.now() + backoffMs(this.retries);
      } finally {
        this.inFlight = false;
        const next = this.pending;
        if (next && next.generation === this.generation) {
          this.pending = null;
          this.requestCompletion(next.text, next.generation);
        }
      }
    }
    /** 只信任此刻仍在 DOM 中、且文本未变化的编辑器。 */
    isLiveInput(expectedText) {
      const live = findEditor();
      return !!live && live === this.inputElement && live.isConnected && readEditorText(live).length >= MIN_CHARS && readEditorText(live) === expectedText;
    }
    showGhost(inputText, completion) {
      if (!settings().autocomplete || !this.ghostElement || !this.inputElement || !completion || !this.isLiveInput(inputText)) {
        this.hideGhost();
        return;
      }
      this.currentCompletion = completion;
      this.ghostInputText = inputText;
      const inputEl = this.inputElement;
      const styles = getComputedStyle(inputEl);
      const ghost = this.ghostElement.style;
      const copy = [
        "font-family",
        "font-size",
        "font-style",
        "font-weight",
        "font-variant",
        "line-height",
        "letter-spacing",
        "word-spacing",
        "text-indent",
        "text-transform",
        "text-rendering",
        "font-kerning",
        "font-feature-settings",
        "font-optical-sizing",
        "text-align",
        "white-space",
        "word-break",
        "overflow-wrap",
        "padding-top",
        "padding-right",
        "padding-bottom",
        "padding-left",
        "border-top-width",
        "border-right-width",
        "border-bottom-width",
        "border-left-width",
        "box-sizing"
      ];
      for (const prop of copy) {
        ghost.setProperty(prop, styles.getPropertyValue(prop));
      }
      ghost.top = inputEl.offsetTop + "px";
      ghost.left = inputEl.offsetLeft + "px";
      ghost.width = inputEl.offsetWidth + "px";
      ghost.height = inputEl.offsetHeight + "px";
      ghost.transform = `translate(${-inputEl.scrollLeft}px, ${-inputEl.scrollTop}px)`;
      ghost.display = "block";
      this.ghostElement.innerHTML = `<span style="color:transparent">${esc(inputText)}</span>${esc(completion)}`;
    }
    hideGhost() {
      if (this.ghostElement) this.ghostElement.style.display = "none";
      this.currentCompletion = "";
      this.ghostInputText = "";
    }
    invalidateGhost() {
      if (!this.ghostInputText) return;
      this.generation++;
      this.hideGhost();
    }
    acceptCompletion() {
      const el = this.inputElement;
      const completion = this.currentCompletion;
      if (!el || !completion) return;
      this.generation++;
      this.hideGhost();
      insertTextAtEnd(el, completion);
    }
    clearDebounce() {
      if (this.debounceTimer != null) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }
    }
  };
  function initYuzeAutocomplete() {
    if (!isYuzeHome()) return;
    new HomeInputAutocomplete().start();
  }

  // src/index.ts
  function migrateStoredRecordMatches() {
    const records = Store.read(K.records, []);
    let changed = false;
    for (const record of records) {
      if (!record.matches?.length) continue;
      const previous = record.matches;
      const normalized = normalizeMatches(previous);
      const same = normalized.length === previous.length && normalized.every((match, index) => match === previous[index]);
      if (same) continue;
      record.matches = normalized;
      if (record.category !== "pending" && record.category !== "error") syncRecordPrimaryMatch(record);
      changed = true;
    }
    if (changed) Store.write(K.records, records);
  }
  function boot() {
    migrateStoredRecordMatches();
    hookHistory();
    Panel.mount();
    addEventListener("storage", (e) => {
      if (e.key && e.key.indexOf("shizhi.") === 0) Panel.render();
    });
    onLocationChange();
    pumpQueue();
    setInterval(pumpQueue, 1e4);
  }
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    if (!window.__shizhiLoaded) {
      window.__shizhiLoaded = true;
      initDshAskReceiver();
      if (typeof LLMBridge !== "undefined") {
        const start = () => {
          boot();
          initYuzeAutocomplete();
        };
        if (document.readyState === "loading") {
          document.addEventListener("DOMContentLoaded", start, { once: true });
        } else {
          start();
        }
      }
    }
  }
})();