(() => {
  "use strict";

  const HOST_ID = "kaoyan-study-toolkit-host";
  const STORAGE_KEY = "kaoyan-study-toolkit:v1";
  const FALLBACK_SEARCH = "https://www.baidu.com/s?wd=";
  const ENTERTAINMENT_DOMAINS = [
    "douyin.com",
    "xiaohongshu.com",
    "bilibili.com",
    "tieba.baidu.com",
    "bbs.hupu.com",
    "douban.com",
    "iqiyi.com",
    "v.qq.com",
    "youku.com"
  ];

  const existingHost = document.getElementById(HOST_ID);
  if (existingHost) {
    existingHost.dispatchEvent(new CustomEvent("kaoyan-study-toolkit:open"));
    return;
  }

  const adapter = window.TabbitStudyAdapter || {};
  const defaultState = () => ({
    version: 1,
    timer: {
      mode: "stopwatch",
      stopwatch: { running: false, elapsedMs: 0, startedAt: null },
      pomodoro: { running: false, durationMin: 25, remainingMs: 25 * 60_000, endsAt: null }
    },
    focus: { active: false, startedAt: null, allowlist: [] },
    exam: { active: false, endsAt: null, durationMin: 120 },
    checkin: { date: "", minutes: "", achievement: "" }
  });

  let state = defaultState();
  let tickHandle = null;
  let savePulse = 0;
  let examLockInstalled = false;
  let focusGuardInstalled = false;
  let focusNavigationPermitUntil = 0;
  let focusHiddenAt = null;

  const host = document.createElement("div");
  host.id = HOST_ID;
  host.style.cssText = "position:fixed;inset:0;z-index:2147483647;pointer-events:none;";
  const shadow = host.attachShadow({ mode: "closed" });
  document.documentElement.appendChild(host);

  shadow.innerHTML = `
    <style>
      :host { color-scheme: light; }
      *, *::before, *::after { box-sizing: border-box; }
      button, input, textarea { font: inherit; }
      button { color: inherit; }
      [hidden] { display: none !important; }
      .pixel-ui {
        --ink: #24323d;
        --paper: #fffdf4;
        --mint: #9be8ca;
        --mint-deep: #44bd91;
        --sky: #a9d9ff;
        --yellow: #ffe780;
        --pink: #ffb8ca;
        --muted: #6f7d86;
        font-family: ui-monospace, "SFMono-Regular", "Cascadia Mono", "Microsoft YaHei", monospace;
        color: var(--ink);
        line-height: 1.5;
        -webkit-font-smoothing: none;
      }
      .pixel-button {
        border: 2px solid var(--ink);
        border-radius: 2px;
        background: #fff;
        padding: 9px 13px;
        min-height: 40px;
        box-shadow: 3px 3px 0 var(--ink);
        cursor: pointer;
        transition: transform 80ms ease, box-shadow 80ms ease, background 120ms ease;
      }
      .pixel-button:hover { background: var(--yellow); }
      .pixel-button:active { transform: translate(3px, 3px); box-shadow: 0 0 0 var(--ink); }
      .pixel-button:focus-visible, input:focus-visible, textarea:focus-visible {
        outline: 3px solid #548fff;
        outline-offset: 3px;
      }
      .pixel-button.primary { background: var(--mint); font-weight: 800; }
      .pixel-button.danger { background: var(--pink); }
      .pixel-button.ghost { box-shadow: none; background: transparent; }
      #launcher {
        pointer-events: auto;
        position: fixed;
        right: max(18px, env(safe-area-inset-right));
        bottom: max(18px, env(safe-area-inset-bottom));
        width: 58px;
        height: 58px;
        padding: 0;
        width: auto;
        min-width: 112px;
        height: 48px;
        padding: 0 16px;
        display: grid;
        place-items: center;
        background: var(--yellow);
        font-size: 27px;
        font-size: 15px;
        font-weight: 900;
        letter-spacing: .08em;
        white-space: nowrap;
        border-width: 3px;
        box-shadow: 5px 5px 0 var(--ink);
      }
      #panel-backdrop {
        pointer-events: auto;
        position: fixed;
        inset: 0;
        display: grid;
        place-items: center;
        padding: 20px;
        background: rgb(36 50 61 / 36%);
        backdrop-filter: blur(3px);
      }
      #panel {
        width: min(720px, 100%);
        max-height: min(760px, calc(100vh - 40px));
        overflow: auto;
        border: 3px solid var(--ink);
        border-radius: 4px;
        background: var(--paper);
        box-shadow: 9px 9px 0 rgb(36 50 61 / 90%);
      }
      .panel-head {
        position: sticky;
        top: 0;
        z-index: 3;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 15px 18px;
        border-bottom: 3px solid var(--ink);
        background: var(--mint);
      }
      .panel-title { font-weight: 900; font-size: 18px; letter-spacing: .04em; }
      .tiny { font-size: 12px; color: var(--muted); }
      .tabs {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        border-bottom: 2px solid var(--ink);
        background: #fff;
      }
      .tab {
        border: 0;
        border-right: 2px solid var(--ink);
        background: #fff;
        padding: 12px 8px;
        cursor: pointer;
        font-weight: 700;
      }
      .tab:last-child { border-right: 0; }
      .tab[aria-selected="true"] { background: var(--yellow); box-shadow: inset 0 -4px 0 var(--ink); }
      .tab-panel { padding: 24px; }
      .section-title { margin: 0 0 8px; font-size: 21px; }
      .timer-mode { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 18px; }
      .timer-mode .pixel-button[aria-pressed="true"] { background: var(--sky); }
      .timer-face {
        margin: 16px 0 22px;
        padding: 22px 12px;
        border: 3px solid var(--ink);
        background: #fff;
        box-shadow: inset 0 -8px 0 #edf5f2;
        text-align: center;
        font-size: clamp(42px, 11vw, 78px);
        font-weight: 900;
        letter-spacing: .04em;
        font-variant-numeric: tabular-nums;
      }
      .row { display: flex; align-items: center; flex-wrap: wrap; gap: 11px; }
      .field { display: grid; gap: 7px; margin-bottom: 16px; }
      .field label { font-size: 13px; font-weight: 800; }
      .field input, .field textarea, .focus-search input, .portal-input {
        width: 100%;
        border: 2px solid var(--ink);
        border-radius: 2px;
        background: #fff;
        color: var(--ink);
        padding: 11px 12px;
        box-shadow: inset 3px 3px 0 #e8f0ed;
      }
      .field textarea { min-height: 130px; resize: vertical; }
      .duration-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; align-items: end; }
      .status-box {
        border: 2px solid var(--ink);
        background: #fff;
        padding: 14px;
        margin: 14px 0;
      }
      .status-box.active { background: #e6fff4; box-shadow: 4px 4px 0 var(--mint-deep); }
      #focus-dock {
        pointer-events: auto;
        position: fixed;
        top: max(14px, env(safe-area-inset-top));
        left: 50%;
        transform: translateX(-50%);
        width: min(780px, calc(100vw - 28px));
        border: 3px solid var(--ink);
        background: var(--paper);
        box-shadow: 7px 7px 0 rgb(36 50 61 / 85%);
        padding: 12px;
      }
      .focus-dock-head { display: flex; justify-content: space-between; gap: 12px; align-items: center; margin-bottom: 9px; }
      .focus-label { font-weight: 900; }
      .focus-search { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 9px; }
      .focus-actions { display: flex; flex-wrap: wrap; gap: 9px; margin-top: 10px; }
      .focus-actions .pixel-button { min-height: 34px; padding: 6px 10px; font-size: 12px; }
      #exam-overlay {
        pointer-events: auto;
        position: fixed;
        inset: 0;
        z-index: 20;
        display: grid;
        place-items: center;
        padding: 24px;
        background: #effff9;
        background-image: linear-gradient(#d8f7eb 2px, transparent 2px), linear-gradient(90deg, #d8f7eb 2px, transparent 2px);
        background-size: 32px 32px;
        cursor: not-allowed;
        user-select: none;
      }
      .exam-card {
        width: min(760px, 100%);
        border: 4px solid var(--ink);
        background: var(--paper);
        padding: clamp(28px, 7vw, 68px) 24px;
        text-align: center;
        box-shadow: 12px 12px 0 var(--ink);
      }
      .exam-title { margin: 0 0 20px; font-size: clamp(32px, 8vw, 72px); }
      .exam-time { font-size: clamp(52px, 14vw, 112px); font-weight: 900; font-variant-numeric: tabular-nums; }
      #dialog-backdrop {
        pointer-events: auto;
        position: fixed;
        inset: 0;
        z-index: 30;
        display: grid;
        place-items: center;
        padding: 22px;
        background: rgb(36 50 61 / 55%);
      }
      .dialog {
        width: min(500px, 100%);
        border: 3px solid var(--ink);
        background: var(--paper);
        box-shadow: 8px 8px 0 var(--ink);
        padding: 22px;
      }
      .dialog h3 { margin: 0 0 12px; font-size: 20px; }
      .dialog p { margin: 0 0 18px; white-space: pre-wrap; }
      .portal-list { display: grid; gap: 9px; margin: 16px 0; max-height: 220px; overflow: auto; }
      .portal-item { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 8px; align-items: center; }
      .portal-host { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; border: 2px solid var(--ink); background: #fff; padding: 8px; }
      #toast {
        pointer-events: none;
        position: fixed;
        left: 50%;
        bottom: 28px;
        z-index: 40;
        transform: translateX(-50%);
        max-width: min(520px, calc(100vw - 32px));
        border: 2px solid var(--ink);
        background: var(--yellow);
        box-shadow: 4px 4px 0 var(--ink);
        padding: 10px 14px;
        font-weight: 800;
        text-align: center;
      }
      .checkin-card {
        position: relative;
        overflow: hidden;
        margin: 18px 0;
        min-height: 270px;
        border: 3px solid var(--ink);
        background: #fffdf4;
        box-shadow: 7px 7px 0 var(--sky);
        padding: 24px;
      }
      .checkin-card::before { content: ""; position: absolute; inset: 0 0 auto; height: 13px; background: linear-gradient(90deg, var(--mint) 0 34%, var(--yellow) 34% 67%, var(--sky) 67%); border-bottom: 2px solid var(--ink); }
      .card-kicker { margin-top: 10px; font-size: 12px; font-weight: 900; letter-spacing: .18em; }
      .card-date { margin: 10px 0 4px; font-size: 24px; font-weight: 900; }
      .card-minutes { display: inline-block; margin: 8px 0 16px; background: var(--mint); border: 2px solid var(--ink); padding: 5px 9px; }
      .card-copy { white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.8; }
      .empty-copy { color: var(--muted); }
      @media (max-width: 560px) {
        .tabs { grid-template-columns: repeat(2, 1fr); }
        .tabs .tab:nth-child(2) { border-right: 0; }
        .tabs .tab:nth-child(-n+2) { border-bottom: 2px solid var(--ink); }
        .tab-panel { padding: 19px 16px 24px; }
        .focus-search, .duration-row { grid-template-columns: 1fr; }
        .portal-item { grid-template-columns: 1fr auto; }
        .portal-host { grid-column: 1 / -1; }
      }
      @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
    </style>
    <div class="pixel-ui">
      <button id="launcher" class="pixel-button" type="button" aria-label="打开考研自习工具箱" title="考研自习工具箱">▣</button>
      <button id="launcher" class="pixel-button" type="button" aria-label="打开专注工具" title="专注工具">专注工具</button>

      <div id="panel-backdrop" hidden>
        <section id="panel" role="dialog" aria-modal="true" aria-labelledby="panel-title">
          <header class="panel-head">
            <div>
              <div id="panel-title" class="panel-title">考研自习工具箱</div>
              <div class="tiny">今天也稳稳上岸</div>
            </div>
            <button id="close-panel" class="pixel-button ghost" type="button" aria-label="关闭">关闭 ×</button>
          </header>
          <nav class="tabs" aria-label="工具">
            <button class="tab" data-tab="timer" type="button" aria-selected="true">时钟</button>
            <button class="tab" data-tab="focus" type="button" aria-selected="false">专注</button>
            <button class="tab" data-tab="exam" type="button" aria-selected="false">考试</button>
            <button class="tab" data-tab="checkin" type="button" aria-selected="false">打卡</button>
          </nav>

          <section class="tab-panel" data-panel="timer">
            <h2 class="section-title">自习时钟</h2>
            <div class="timer-mode">
              <button id="mode-stopwatch" class="pixel-button" type="button" aria-pressed="true">正计时</button>
              <button id="mode-pomodoro" class="pixel-button" type="button" aria-pressed="false">番茄倒计时</button>
            </div>
            <div id="pomodoro-setting" class="field" hidden>
              <label for="pomodoro-minutes">本轮分钟数（1–180）</label>
              <input id="pomodoro-minutes" type="number" min="1" max="180" step="1" value="25" />
            </div>
            <div id="timer-face" class="timer-face" aria-live="polite">00:00:00</div>
            <div class="row">
              <button id="timer-toggle" class="pixel-button primary" type="button">开始</button>
              <button id="timer-reset" class="pixel-button" type="button">归零</button>
            </div>
          </section>

          <section class="tab-panel" data-panel="focus" hidden>
            <h2 class="section-title">专注模式</h2>
            <div id="focus-status" class="status-box">尚未开始专注</div>
            <div class="row">
              <button id="focus-toggle" class="pixel-button primary" type="button">开始专注</button>
              <button id="manage-portals" class="pixel-button" type="button">添加白名单传送门</button>
            </div>
          </section>

          <section class="tab-panel" data-panel="exam" hidden>
            <h2 class="section-title">考试模式</h2>
            <div class="duration-row">
              <div class="field">
                <label for="exam-minutes">考试时间（分钟，最多 360）</label>
                <input id="exam-minutes" type="number" min="1" max="360" step="1" value="120" />
              </div>
              <button id="start-exam" class="pixel-button danger" type="button">开始考试</button>
            </div>
          </section>

          <section class="tab-panel" data-panel="checkin" hidden>
            <h2 class="section-title">今日打卡</h2>
            <div class="field">
              <label for="checkin-minutes">今日学习时长（分钟）</label>
              <input id="checkin-minutes" type="number" min="0" max="1440" step="1" placeholder="例如：360" />
            </div>
            <div class="field">
              <label for="checkin-copy">今天完成了什么？</label>
              <textarea id="checkin-copy" maxlength="500" placeholder="例如：背完两章单词；做完英语一阅读 2018 Text 1–2；复盘错题 12 道。"></textarea>
              <span id="copy-count" class="tiny">0 / 500</span>
            </div>
            <div class="row">
              <button id="generate-card" class="pixel-button primary" type="button">生成今日成果卡</button>
              <button id="save-card" class="pixel-button" type="button">保存图片</button>
            </div>
            <article class="checkin-card" aria-label="今日成果卡预览">
              <div class="card-kicker">KAOYAN · DAILY WIN</div>
              <div id="card-date" class="card-date">今日成果</div>
              <div id="card-minutes" class="card-minutes">学习时长待填写</div>
              <div id="card-copy" class="card-copy empty-copy">把今天的努力写在这里吧。</div>
            </article>
          </section>
        </section>
      </div>

      <aside id="focus-dock" aria-label="专注模式搜索栏" hidden>
        <div class="focus-dock-head">
          <span class="focus-label">专注中 · 只搜需要的</span>
          <span id="focus-elapsed" class="tiny">00:00:00</span>
        </div>
        <form id="focus-search-form" class="focus-search">
          <input id="focus-query" type="search" autocomplete="off" placeholder="搜索知识点、真题、院校信息……" aria-label="搜索" />
          <button class="pixel-button primary" type="submit">搜索</button>
        </form>
        <div class="focus-actions">
          <button id="dock-portals" class="pixel-button" type="button">＋ 添加白名单传送门</button>
          <button id="dock-end-focus" class="pixel-button danger" type="button">结束专注</button>
        </div>
      </aside>

      <section id="exam-overlay" aria-live="assertive" hidden>
        <div class="exam-card">
          <h1 class="exam-title">考试中，别看我</h1>
          <div id="exam-countdown" class="exam-time">00:00:00</div>
        </div>
      </section>

      <div id="dialog-backdrop" hidden>
        <section class="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
          <h3 id="dialog-title"></h3>
          <p id="dialog-message"></p>
          <div id="portal-editor" hidden>
            <div class="field">
              <label for="portal-domain">允许主动打开的域名</label>
              <input id="portal-domain" class="portal-input" type="text" placeholder="例如：yz.chsi.com.cn" />
            </div>
            <button id="add-portal" class="pixel-button primary" type="button">添加</button>
            <div id="portal-list" class="portal-list"></div>
          </div>
          <div id="dialog-actions" class="row"></div>
        </section>
      </div>

      <div id="toast" role="status" aria-live="polite" hidden></div>
    </div>
  `;

  const $ = (selector) => shadow.querySelector(selector);
  const $$ = (selector) => [...shadow.querySelectorAll(selector)];
  const ui = {
    launcher: $("#launcher"),
    panelBackdrop: $("#panel-backdrop"),
    panel: $("#panel"),
    closePanel: $("#close-panel"),
    timerFace: $("#timer-face"),
    timerToggle: $("#timer-toggle"),
    timerReset: $("#timer-reset"),
    modeStopwatch: $("#mode-stopwatch"),
    modePomodoro: $("#mode-pomodoro"),
    pomodoroSetting: $("#pomodoro-setting"),
    pomodoroMinutes: $("#pomodoro-minutes"),
    focusStatus: $("#focus-status"),
    focusToggle: $("#focus-toggle"),
    managePortals: $("#manage-portals"),
    focusDock: $("#focus-dock"),
    focusElapsed: $("#focus-elapsed"),
    focusSearchForm: $("#focus-search-form"),
    focusQuery: $("#focus-query"),
    dockPortals: $("#dock-portals"),
    dockEndFocus: $("#dock-end-focus"),
    examMinutes: $("#exam-minutes"),
    startExam: $("#start-exam"),
    examOverlay: $("#exam-overlay"),
    examCountdown: $("#exam-countdown"),
    checkinMinutes: $("#checkin-minutes"),
    checkinCopy: $("#checkin-copy"),
    copyCount: $("#copy-count"),
    generateCard: $("#generate-card"),
    saveCard: $("#save-card"),
    cardDate: $("#card-date"),
    cardMinutes: $("#card-minutes"),
    cardCopy: $("#card-copy"),
    dialogBackdrop: $("#dialog-backdrop"),
    dialogTitle: $("#dialog-title"),
    dialogMessage: $("#dialog-message"),
    dialogActions: $("#dialog-actions"),
    portalEditor: $("#portal-editor"),
    portalDomain: $("#portal-domain"),
    addPortal: $("#add-portal"),
    portalList: $("#portal-list"),
    toast: $("#toast")
  };

  function mergeState(saved) {
    const base = defaultState();
    if (!saved || typeof saved !== "object") return base;
    return {
      ...base,
      ...saved,
      timer: {
        ...base.timer,
        ...(saved.timer || {}),
        stopwatch: { ...base.timer.stopwatch, ...(saved.timer?.stopwatch || {}) },
        pomodoro: { ...base.timer.pomodoro, ...(saved.timer?.pomodoro || {}) }
      },
      focus: { ...base.focus, ...(saved.focus || {}), allowlist: Array.isArray(saved.focus?.allowlist) ? saved.focus.allowlist : [] },
      exam: { ...base.exam, ...(saved.exam || {}) },
      checkin: { ...base.checkin, ...(saved.checkin || {}) }
    };
  }

  async function callAdapter(name, ...args) {
    if (typeof adapter[name] !== "function") return { available: false, value: undefined };
    try {
      return { available: true, value: await adapter[name](...args) };
    } catch (error) {
      console.warn(`[考研自习工具箱] ${name} 调用失败`, error);
      toast(error?.message || "浏览器能力暂时不可用，已使用网页模式");
      return { available: true, error };
    }
  }

  async function loadState() {
    const external = await callAdapter("storageGet", STORAGE_KEY);
    if (external.available && !external.error && external.value != null) {
      try {
        const parsed = typeof external.value === "string" ? JSON.parse(external.value) : external.value;
        return mergeState(parsed);
      } catch (error) {
        console.warn("[考研自习工具箱] 浏览器状态格式无效，已回退", error);
      }
    }
    try {
      return mergeState(JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"));
    } catch (error) {
      console.warn("[考研自习工具箱] 本地状态读取失败", error);
      return defaultState();
    }
  }

  async function persist() {
    const serialized = JSON.stringify(state);
    const external = await callAdapter("storageSet", STORAGE_KEY, serialized);
    if (!external.available || external.error) {
      try {
        localStorage.setItem(STORAGE_KEY, serialized);
      } catch (error) {
        console.warn("[考研自习工具箱] 本地状态保存失败", error);
      }
    }
  }

  function toast(message) {
    ui.toast.textContent = message;
    ui.toast.hidden = false;
    clearTimeout(toast.handle);
    toast.handle = setTimeout(() => { ui.toast.hidden = true; }, 2600);
  }

  function formatDuration(ms) {
    const seconds = Math.max(0, Math.ceil(ms / 1000));
    const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  }

  function stopwatchMs() {
    const watch = state.timer.stopwatch;
    return watch.elapsedMs + (watch.running && watch.startedAt ? Date.now() - watch.startedAt : 0);
  }

  function pomodoroMs() {
    const pomodoro = state.timer.pomodoro;
    return pomodoro.running && pomodoro.endsAt ? Math.max(0, pomodoro.endsAt - Date.now()) : pomodoro.remainingMs;
  }

  function renderTimer() {
    const isStopwatch = state.timer.mode === "stopwatch";
    ui.modeStopwatch.setAttribute("aria-pressed", String(isStopwatch));
    ui.modePomodoro.setAttribute("aria-pressed", String(!isStopwatch));
    ui.pomodoroSetting.hidden = isStopwatch;
    ui.pomodoroMinutes.value = String(state.timer.pomodoro.durationMin);
    const running = isStopwatch ? state.timer.stopwatch.running : state.timer.pomodoro.running;
    ui.timerToggle.textContent = running ? "暂停" : "开始";
    ui.timerFace.textContent = formatDuration(isStopwatch ? stopwatchMs() : pomodoroMs());
  }

  function switchTimerMode(mode) {
    state.timer.mode = mode;
    renderTimer();
    void persist();
  }

  function toggleTimer() {
    const now = Date.now();
    if (state.timer.mode === "stopwatch") {
      const watch = state.timer.stopwatch;
      if (watch.running) {
        watch.elapsedMs += now - watch.startedAt;
        watch.running = false;
        watch.startedAt = null;
      } else {
        watch.running = true;
        watch.startedAt = now;
      }
    } else {
      const pomodoro = state.timer.pomodoro;
      if (pomodoro.running) {
        pomodoro.remainingMs = Math.max(0, pomodoro.endsAt - now);
        pomodoro.running = false;
        pomodoro.endsAt = null;
      } else {
        if (pomodoro.remainingMs <= 0) pomodoro.remainingMs = pomodoro.durationMin * 60_000;
        pomodoro.running = true;
        pomodoro.endsAt = now + pomodoro.remainingMs;
      }
    }
    renderTimer();
    void persist();
  }

  function resetTimer() {
    if (state.timer.mode === "stopwatch") {
      state.timer.stopwatch = { running: false, elapsedMs: 0, startedAt: null };
    } else {
      const durationMin = clampInt(ui.pomodoroMinutes.value, 1, 180, 25);
      state.timer.pomodoro = { running: false, durationMin, remainingMs: durationMin * 60_000, endsAt: null };
    }
    renderTimer();
    void persist();
  }

  function setPomodoroDuration() {
    const pomodoro = state.timer.pomodoro;
    const durationMin = clampInt(ui.pomodoroMinutes.value, 1, 180, 25);
    ui.pomodoroMinutes.value = String(durationMin);
    if (!pomodoro.running) {
      pomodoro.durationMin = durationMin;
      pomodoro.remainingMs = durationMin * 60_000;
      renderTimer();
      void persist();
    } else {
      ui.pomodoroMinutes.value = String(pomodoro.durationMin);
      toast("进行中的番茄钟不能改时长");
    }
  }

  function clampInt(value, min, max, fallback) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, parsed));
  }

  function renderFocus() {
    const active = state.focus.active;
    ui.focusDock.hidden = !active || state.exam.active;
    ui.focusStatus.classList.toggle("active", active);
    ui.focusStatus.textContent = active ? `正在专注 · 已坚持 ${formatDuration(Date.now() - state.focus.startedAt)}` : "尚未开始专注";
    ui.focusToggle.textContent = active ? "结束专注" : "开始专注";
    ui.focusToggle.classList.toggle("danger", active);
    ui.focusToggle.classList.toggle("primary", !active);
    if (active) ui.focusElapsed.textContent = formatDuration(Date.now() - state.focus.startedAt);
  }

  function permitFocusNavigation(durationMs = 10_000) {
    focusNavigationPermitUntil = Date.now() + durationMs;
  }

  function focusBeforeUnload(event) {
    if (!state.focus.active || Date.now() <= focusNavigationPermitUntil) return;
    event.preventDefault();
    event.returnValue = "";
  }

  function focusLinkGuard(event) {
    if (!state.focus.active) return;
    const path = typeof event.composedPath === "function" ? event.composedPath() : [];
    const anchor = path.find((node) => node?.tagName === "A" && node.href);
    if (!anchor) return;
    try {
      const url = new URL(anchor.href, window.location.href);
      if (url.protocol === "http:" || url.protocol === "https:") permitFocusNavigation();
    } catch {
      // Ignore malformed links and let the browser handle them normally.
    }
  }

  function focusShortcutGuard(event) {
    if (!state.focus.active) return;
    const key = event.key.toLowerCase();
    const browserShortcut = (event.metaKey || event.ctrlKey) && ["l", "n", "r", "t", "w"].includes(key);
    const historyShortcut = event.altKey && ["arrowleft", "arrowright"].includes(key);
    if (!browserShortcut && !historyShortcut) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    toast("专注期间请使用搜索框或白名单传送门");
  }

  function focusVisibilityGuard() {
    if (!state.focus.active) return;
    if (document.hidden) {
      focusHiddenAt = Date.now();
      return;
    }
    if (focusHiddenAt) {
      const awaySeconds = Math.max(1, Math.round((Date.now() - focusHiddenAt) / 1000));
      focusHiddenAt = null;
      toast(`刚刚离开了 ${awaySeconds} 秒，继续专注吧`);
    }
  }

  function installFocusGuard() {
    if (focusGuardInstalled) return;
    focusGuardInstalled = true;
    document.addEventListener("click", focusLinkGuard, true);
    document.addEventListener("visibilitychange", focusVisibilityGuard);
    window.addEventListener("keydown", focusShortcutGuard, { capture: true });
    window.addEventListener("beforeunload", focusBeforeUnload);
  }

  function removeFocusGuard() {
    if (!focusGuardInstalled) return;
    focusGuardInstalled = false;
    focusNavigationPermitUntil = 0;
    focusHiddenAt = null;
    document.removeEventListener("click", focusLinkGuard, true);
    document.removeEventListener("visibilitychange", focusVisibilityGuard);
    window.removeEventListener("keydown", focusShortcutGuard, { capture: true });
    window.removeEventListener("beforeunload", focusBeforeUnload);
  }

  async function requestFullscreen() {
    const external = await callAdapter("requestFullscreen");
    if (external.available && !external.error) return;
    try {
      await document.documentElement.requestFullscreen?.();
    } catch (error) {
      console.info("[考研自习工具箱] 网页全屏未启用", error);
    }
  }

  async function exitFullscreen() {
    const external = await callAdapter("exitFullscreen");
    if (external.available && !external.error) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen?.();
    } catch (error) {
      console.info("[考研自习工具箱] 退出网页全屏失败", error);
    }
  }

  async function startFocus() {
    if (state.exam.active) return;
    state.focus.active = true;
    state.focus.startedAt = Date.now();
    installFocusGuard();
    await persist();
    renderFocus();
    closePanel();
    await Promise.all([
      callAdapter("enterFocusPolicy", { allowedDomains: state.focus.allowlist, entertainmentDomains: ENTERTAINMENT_DOMAINS }),
      callAdapter("enterSystemLock", { mode: "focus" }),
      callAdapter("enterDoNotDisturb"),
      requestFullscreen()
    ]);
    setTimeout(() => ui.focusQuery.focus(), 50);
  }

  async function endFocus({ keepFullscreen = false } = {}) {
    state.focus.active = false;
    state.focus.startedAt = null;
    removeFocusGuard();
    await persist();
    renderFocus();
    await Promise.all([
      callAdapter("exitFocusPolicy"),
      callAdapter("exitSystemLock", { mode: "focus" }),
      callAdapter("exitDoNotDisturb")
    ]);
    if (!keepFullscreen) await exitFullscreen();
    toast("专注结束，辛苦啦");
  }

  async function performSearch(query) {
    const cleanQuery = query.trim();
    if (!cleanQuery) return toast("先输入想查的内容吧");
    await persist();
    permitFocusNavigation(30_000);
    const external = await callAdapter("search", cleanQuery);
    if (!external.available || external.error) window.location.assign(`${FALLBACK_SEARCH}${encodeURIComponent(cleanQuery)}`);
  }

  function normalizeDomain(raw) {
    let value = raw.trim().toLowerCase();
    if (!value) throw new Error("请输入域名");
    if (!/^[a-z][a-z\d+.-]*:\/\//i.test(value)) value = `https://${value}`;
    const url = new URL(value);
    const hostname = url.hostname.replace(/\.$/, "");
    if (!hostname || hostname.includes(" ")) throw new Error("域名格式不正确");
    return hostname;
  }

  function matchesDomain(hostname, base) {
    return hostname === base || hostname.endsWith(`.${base}`);
  }

  function isEntertainmentDomain(hostname) {
    return ENTERTAINMENT_DOMAINS.some((base) => matchesDomain(hostname, base));
  }

  function clearNode(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function button(label, className, onClick) {
    const element = document.createElement("button");
    element.type = "button";
    element.className = `pixel-button ${className || ""}`.trim();
    element.textContent = label;
    element.addEventListener("click", onClick, { once: true });
    return element;
  }

  function openMessageDialog({ title, message, confirmLabel = "知道了", cancelLabel = "", tone = "primary" }) {
    return new Promise((resolve) => {
      ui.dialogTitle.textContent = title;
      ui.dialogMessage.textContent = message;
      ui.dialogMessage.hidden = !message;
      ui.portalEditor.hidden = true;
      clearNode(ui.dialogActions);
      if (cancelLabel) {
        ui.dialogActions.appendChild(button(cancelLabel, "", () => {
          closeDialog();
          resolve(false);
        }));
      }
      ui.dialogActions.appendChild(button(confirmLabel, tone, () => {
        closeDialog();
        resolve(true);
      }));
      ui.dialogBackdrop.hidden = false;
    });
  }

  function closeDialog() {
    ui.dialogBackdrop.hidden = true;
    ui.portalEditor.hidden = true;
    ui.dialogMessage.hidden = false;
    clearNode(ui.dialogActions);
  }

  function renderPortals() {
    clearNode(ui.portalList);
    if (!state.focus.allowlist.length) {
      const empty = document.createElement("div");
      empty.className = "tiny";
      empty.textContent = "还没有传送门。建议只添加学习需要的网站。";
      ui.portalList.appendChild(empty);
      return;
    }
    state.focus.allowlist.forEach((hostname) => {
      const item = document.createElement("div");
      item.className = "portal-item";
      const hostLabel = document.createElement("div");
      hostLabel.className = "portal-host";
      hostLabel.textContent = hostname;
      const open = button("打开", "primary", async () => {
        await persist();
        const url = `https://${hostname}`;
        permitFocusNavigation(30_000);
        const external = await callAdapter("openAllowedDomain", url);
        if (!external.available || external.error) window.location.assign(url);
      });
      const remove = button("删除", "", async () => {
        state.focus.allowlist = state.focus.allowlist.filter((itemHost) => itemHost !== hostname);
        await persist();
        await callAdapter("updateFocusPolicy", { allowedDomains: state.focus.allowlist });
        renderPortals();
      });
      item.append(hostLabel, open, remove);
      ui.portalList.appendChild(item);
    });
  }

  function openPortalEditor() {
    ui.dialogTitle.textContent = "白名单传送门";
    ui.dialogMessage.textContent = "添加后，你可以在专注模式里主动打开这个域名。";
    ui.dialogMessage.hidden = false;
    ui.portalEditor.hidden = false;
    clearNode(ui.dialogActions);
    ui.dialogActions.appendChild(button("完成", "", closeDialog));
    renderPortals();
    ui.dialogBackdrop.hidden = false;
    setTimeout(() => ui.portalDomain.focus(), 30);
  }

  async function addPortal() {
    let hostname;
    try {
      hostname = normalizeDomain(ui.portalDomain.value);
    } catch (error) {
      return toast(error.message);
    }
    if (state.focus.allowlist.includes(hostname)) return toast("这个传送门已经添加过啦");
    if (isEntertainmentDomain(hostname)) {
      closeDialog();
      const confirmed = await openMessageDialog({
        title: "等等——",
        message: "我怀疑你在摸鱼哦，你确定吗～",
        confirmLabel: "确定添加",
        cancelLabel: "不加了",
        tone: "danger"
      });
      if (!confirmed) return openPortalEditor();
    }
    state.focus.allowlist.push(hostname);
    state.focus.allowlist.sort((a, b) => a.localeCompare(b));
    ui.portalDomain.value = "";
    await persist();
    await callAdapter("updateFocusPolicy", { allowedDomains: state.focus.allowlist });
    openPortalEditor();
    toast("传送门添加成功");
  }

  const lockEvent = (event) => {
    if (!state.exam.active) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  };
  const beforeUnload = (event) => {
    if (!state.exam.active) return;
    event.preventDefault();
    event.returnValue = "";
  };

  function installExamLock() {
    if (examLockInstalled) return;
    examLockInstalled = true;
    ["keydown", "keyup", "keypress", "beforeinput", "input", "paste", "copy", "cut", "contextmenu", "dragstart", "drop", "wheel", "touchmove", "pointerdown", "mousedown"].forEach((type) => {
      window.addEventListener(type, lockEvent, { capture: true, passive: false });
    });
    window.addEventListener("beforeunload", beforeUnload);
  }

  function removeExamLock() {
    if (!examLockInstalled) return;
    examLockInstalled = false;
    ["keydown", "keyup", "keypress", "beforeinput", "input", "paste", "copy", "cut", "contextmenu", "dragstart", "drop", "wheel", "touchmove", "pointerdown", "mousedown"].forEach((type) => {
      window.removeEventListener(type, lockEvent, { capture: true });
    });
    window.removeEventListener("beforeunload", beforeUnload);
  }

  function renderExam() {
    const active = state.exam.active;
    ui.examOverlay.hidden = !active;
    ui.examMinutes.value = String(state.exam.durationMin);
    if (active) {
      ui.examCountdown.textContent = formatDuration(Math.max(0, state.exam.endsAt - Date.now()));
      installExamLock();
    } else {
      removeExamLock();
    }
  }

  async function startExam() {
    const durationMin = clampInt(ui.examMinutes.value, 1, 360, 120);
    ui.examMinutes.value = String(durationMin);
    const confirmed = await openMessageDialog({
      title: "确认开始考试？",
      message: `考试将持续 ${durationMin} 分钟。开始后，倒计时结束前不提供退出按钮。`,
      confirmLabel: "开始考试",
      cancelLabel: "再准备一下",
      tone: "danger"
    });
    if (!confirmed) return;
    if (state.focus.active) await endFocus({ keepFullscreen: true });
    state.exam = { active: true, durationMin, endsAt: Date.now() + durationMin * 60_000 };
    await persist();
    closePanel();
    renderExam();
    await Promise.all([
      callAdapter("enterExamPolicy", { endsAt: state.exam.endsAt }),
      callAdapter("enterSystemLock", { mode: "exam", endsAt: state.exam.endsAt }),
      callAdapter("enterDoNotDisturb"),
      requestFullscreen()
    ]);
  }

  async function finishExam() {
    state.exam.active = false;
    state.exam.endsAt = null;
    await persist();
    renderExam();
    await Promise.all([
      callAdapter("exitExamPolicy"),
      callAdapter("exitSystemLock", { mode: "exam" }),
      callAdapter("exitDoNotDisturb"),
      exitFullscreen()
    ]);
    await openMessageDialog({
      title: "考完啦！",
      message: "接下来休息一下吧",
      confirmLabel: "好耶",
      tone: "primary"
    });
  }

  function todayLabel() {
    return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "short" }).format(new Date());
  }

  function localDateStamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function renderCheckin() {
    ui.checkinMinutes.value = state.checkin.minutes;
    ui.checkinCopy.value = state.checkin.achievement;
    ui.copyCount.textContent = `${ui.checkinCopy.value.length} / 500`;
    ui.cardDate.textContent = state.checkin.date || todayLabel();
    ui.cardMinutes.textContent = state.checkin.minutes ? `今日学习 ${state.checkin.minutes} 分钟` : "学习时长待填写";
    ui.cardCopy.textContent = state.checkin.achievement || "把今天的努力写在这里吧。";
    ui.cardCopy.classList.toggle("empty-copy", !state.checkin.achievement);
  }

  function captureCheckin() {
    const minutesRaw = ui.checkinMinutes.value.trim();
    const minutes = minutesRaw ? String(clampInt(minutesRaw, 0, 1440, 0)) : "";
    const achievement = ui.checkinCopy.value.trim();
    state.checkin = { date: todayLabel(), minutes, achievement };
    renderCheckin();
    void persist();
    return Boolean(achievement);
  }

  function generateCard() {
    const hasContent = captureCheckin();
    if (!hasContent) return toast("先写下今天完成的事吧");
    toast("今日成果卡生成啦");
  }

  function wrapCanvasText(ctx, text, maxWidth, maxLines) {
    const paragraphs = text.split(/\n/);
    const lines = [];
    for (const paragraph of paragraphs) {
      let line = "";
      for (const character of [...paragraph]) {
        const candidate = line + character;
        if (ctx.measureText(candidate).width > maxWidth && line) {
          lines.push(line);
          line = character;
          if (lines.length >= maxLines) break;
        } else {
          line = candidate;
        }
      }
      if (lines.length >= maxLines) break;
      lines.push(line || " ");
      if (lines.length >= maxLines) break;
    }
    if (lines.length === maxLines && paragraphs.join("").length > lines.join("").length) {
      lines[maxLines - 1] = `${lines[maxLines - 1].slice(0, -1)}…`;
    }
    return lines;
  }

  function drawPixelRect(ctx, x, y, width, height, fill, shadow = true) {
    if (shadow) {
      ctx.fillStyle = "#24323d";
      ctx.fillRect(x + 12, y + 12, width, height);
    }
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = "#24323d";
    ctx.lineWidth = 6;
    ctx.strokeRect(x, y, width, height);
  }

  function createCardCanvas() {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fffdf4";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "#dff5ec";
    ctx.lineWidth = 2;
    for (let x = 0; x <= canvas.width; x += 36) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += 36) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    ctx.fillStyle = "#9be8ca"; ctx.fillRect(0, 0, 360, 34);
    ctx.fillStyle = "#ffe780"; ctx.fillRect(360, 0, 360, 34);
    ctx.fillStyle = "#a9d9ff"; ctx.fillRect(720, 0, 360, 34);
    ctx.fillStyle = "#24323d"; ctx.fillRect(0, 34, 1080, 6);

    ctx.fillStyle = "#24323d";
    ctx.font = '900 34px ui-monospace, "Microsoft YaHei", monospace';
    ctx.fillText("KAOYAN · DAILY WIN", 82, 128);
    ctx.font = '900 62px ui-monospace, "Microsoft YaHei", monospace';
    ctx.fillText(state.checkin.date || todayLabel(), 82, 222);

    drawPixelRect(ctx, 82, 278, 916, 108, "#9be8ca");
    ctx.font = '900 40px ui-monospace, "Microsoft YaHei", monospace';
    ctx.fillStyle = "#24323d";
    const timeText = state.checkin.minutes ? `今日学习 ${state.checkin.minutes} 分钟` : "今日学习 · 稳稳推进";
    ctx.fillText(timeText, 118, 347);

    drawPixelRect(ctx, 82, 438, 916, 682, "#ffffff");
    ctx.fillStyle = "#24323d";
    ctx.font = '900 36px ui-monospace, "Microsoft YaHei", monospace';
    ctx.fillText("今天完成了：", 124, 516);
    ctx.font = '32px ui-monospace, "Microsoft YaHei", monospace';
    const lines = wrapCanvasText(ctx, state.checkin.achievement, 820, 12);
    lines.forEach((line, index) => ctx.fillText(line, 124, 584 + index * 54));

    ctx.fillStyle = "#24323d";
    ctx.font = '900 28px ui-monospace, "Microsoft YaHei", monospace';
    ctx.fillText("一步一步，答案会越来越清楚。", 82, 1225);
    ctx.fillStyle = "#6f7d86";
    ctx.font = '24px ui-monospace, "Microsoft YaHei", monospace';
    ctx.fillText("考研自习工具箱 · 本地生成", 82, 1274);
    ctx.fillStyle = "#ffe780";
    ctx.fillRect(900, 1198, 38, 38);
    ctx.fillStyle = "#a9d9ff";
    ctx.fillRect(948, 1246, 38, 38);
    ctx.fillStyle = "#ffb8ca";
    ctx.fillRect(900, 1294, 38, 38);
    return canvas;
  }

  function saveCard() {
    if (!captureCheckin()) return toast("先写下今天完成的事吧");
    const canvas = createCardCanvas();
    const filenameDate = localDateStamp();
    canvas.toBlob((blob) => {
      if (!blob) return toast("图片生成失败，请再试一次");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `考研今日成果-${filenameDate}.png`;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast("成果卡已保存");
    }, "image/png");
  }

  function showTab(name) {
    $$(".tab").forEach((tab) => tab.setAttribute("aria-selected", String(tab.dataset.tab === name)));
    $$(".tab-panel").forEach((panel) => { panel.hidden = panel.dataset.panel !== name; });
  }

  function openPanel(tab = "timer") {
    if (state.exam.active) return;
    showTab(tab);
    ui.panelBackdrop.hidden = false;
    setTimeout(() => ui.closePanel.focus(), 20);
  }

  function closePanel() {
    ui.panelBackdrop.hidden = true;
    ui.launcher.focus();
  }

  function tick() {
    renderTimer();
    renderFocus();
    if (state.timer.pomodoro.running && pomodoroMs() <= 0) {
      state.timer.pomodoro.running = false;
      state.timer.pomodoro.endsAt = null;
      state.timer.pomodoro.remainingMs = 0;
      void persist();
      toast("这一轮番茄钟完成啦，起来活动一下吧");
    }
    if (state.exam.active) {
      const remaining = state.exam.endsAt - Date.now();
      ui.examCountdown.textContent = formatDuration(remaining);
      if (remaining <= 0) void finishExam();
    }
    savePulse += 1;
    if (savePulse >= 15) {
      savePulse = 0;
      if (state.timer.stopwatch.running || state.timer.pomodoro.running) void persist();
    }
  }

  function bindEvents() {
    host.addEventListener("kaoyan-study-toolkit:open", () => openPanel());
    ui.launcher.addEventListener("click", () => openPanel());
    ui.closePanel.addEventListener("click", closePanel);
    ui.panelBackdrop.addEventListener("click", (event) => { if (event.target === ui.panelBackdrop) closePanel(); });
    $$(".tab").forEach((tab) => tab.addEventListener("click", () => showTab(tab.dataset.tab)));
    ui.modeStopwatch.addEventListener("click", () => switchTimerMode("stopwatch"));
    ui.modePomodoro.addEventListener("click", () => switchTimerMode("pomodoro"));
    ui.timerToggle.addEventListener("click", toggleTimer);
    ui.timerReset.addEventListener("click", resetTimer);
    ui.pomodoroMinutes.addEventListener("change", setPomodoroDuration);
    ui.focusToggle.addEventListener("click", () => state.focus.active ? void endFocus() : void startFocus());
    ui.managePortals.addEventListener("click", openPortalEditor);
    ui.dockPortals.addEventListener("click", openPortalEditor);
    ui.dockEndFocus.addEventListener("click", () => void endFocus());
    ui.focusSearchForm.addEventListener("submit", (event) => { event.preventDefault(); void performSearch(ui.focusQuery.value); });
    ui.addPortal.addEventListener("click", () => void addPortal());
    ui.portalDomain.addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); void addPortal(); } });
    ui.startExam.addEventListener("click", () => void startExam());
    ui.checkinCopy.addEventListener("input", () => { ui.copyCount.textContent = `${ui.checkinCopy.value.length} / 500`; });
    ui.generateCard.addEventListener("click", generateCard);
    ui.saveCard.addEventListener("click", saveCard);
    shadow.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !state.exam.active) {
        if (!ui.dialogBackdrop.hidden) closeDialog();
        else if (!ui.panelBackdrop.hidden) closePanel();
      }
    });
  }

  async function restorePrivilegedModes() {
    if (state.exam.active) {
      if (state.exam.endsAt <= Date.now()) return finishExam();
      await Promise.all([
        callAdapter("enterExamPolicy", { endsAt: state.exam.endsAt }),
        callAdapter("enterSystemLock", { mode: "exam", endsAt: state.exam.endsAt }),
        callAdapter("enterDoNotDisturb")
      ]);
    } else if (state.focus.active) {
      installFocusGuard();
      await Promise.all([
        callAdapter("enterFocusPolicy", { allowedDomains: state.focus.allowlist, entertainmentDomains: ENTERTAINMENT_DOMAINS }),
        callAdapter("enterSystemLock", { mode: "focus" }),
        callAdapter("enterDoNotDisturb")
      ]);
    }
  }

  async function init() {
    bindEvents();
    state = await loadState();
    if (state.timer.pomodoro.running && state.timer.pomodoro.endsAt <= Date.now()) {
      state.timer.pomodoro = { ...state.timer.pomodoro, running: false, remainingMs: 0, endsAt: null };
    }
    const currentDate = todayLabel();
    if (state.checkin.date && state.checkin.date !== currentDate) state.checkin = { date: "", minutes: "", achievement: "" };
    renderTimer();
    renderFocus();
    renderExam();
    renderCheckin();
    tickHandle = window.setInterval(tick, 1000);
    await restorePrivilegedModes();
    window.addEventListener("pagehide", () => { void persist(); }, { once: true });
  }

  void init();
})();