// ==UserScript==
// @name         ice-study · 学到冰块融化
// @namespace    https://ice-study.example.com
// @version      0.7.18
// @description  学习追踪工具：AI 根据你正在学习的网页/视频内容生成知识检查题，并把学习进度同步到你自建的 ice-study 服务（默认 https://ice-study-d2gvakbp10a2e49e5-1477840052.ap-shanghai.app.tcloudbase.com/api，可在页面里用 window.ICE_STUDY_API 覆盖为任意自建地址）。数据流向与用途：1) 仅向该服务发送「当前页面正文/标题/URL、视频字幕、你的作答与阅读/观看进度」，用于 AI 出题与学习进度记录；2) 客户端标识为本地随机生成的 ID（不读取任何设备/浏览器信息，无指纹采集，跨会话仅用于区分同一使用者）；3) 视频字幕仅通过 B 站/YouTube 官方字幕接口获取，用于识别学习内容。所有数据只发往你指定的服务，不经任何第三方。
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_addValueChangeListener
// @run-at       document-idle
// @noframes
// ==/UserScript==

(() => {
  "use strict";

  if (window.__ICE_STUDY_RUNNING__) return;
  window.__ICE_STUDY_RUNNING__ = true;

  // 客户端标识：本地随机生成一个 ID 并持久化（优先 GM 存储，降级 localStorage）。
  // 不读取任何设备/浏览器信息（无 userAgent / 无屏幕参数 / 无硬件参数 / 无触控信息），
  // 因此不存在指纹采集；跨会话保持一致，仅用于让 ice-study 服务区分「同一使用者」。
  function newClientId() {
    const bytes = new Uint8Array(12);
    try { crypto.getRandomValues(bytes); } catch (_) { for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256); }
    return `ice-${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
  }
  const CLIENT_ID_KEY = "ice-study-client-id-v1";
  function stableClientId() {
    if (window.ICE_STUDY_CLIENT_ID) return String(window.ICE_STUDY_CLIENT_ID);
    let id = "";
    if (typeof GM_getValue === "function" && typeof GM_setValue === "function") {
      try { id = GM_getValue(CLIENT_ID_KEY, ""); if (!id) { id = newClientId(); GM_setValue(CLIENT_ID_KEY, id); } } catch (_) { id = ""; }
    }
    if (!id) {
      try {
        id = localStorage.getItem(CLIENT_ID_KEY) || "";
        if (!id) { id = newClientId(); localStorage.setItem(CLIENT_ID_KEY, id); }
      } catch (_) { id = newClientId(); }
    }
    window.ICE_STUDY_CLIENT_ID = id;
    return id;
  }

  const CONFIG = {
    // 默认走 CloudBase（PostgreSQL 版存储）；临时切换可用 window.ICE_STUDY_API 覆盖
    api: window.ICE_STUDY_API || "https://ice-study-d2gvakbp10a2e49e5-1477840052.ap-shanghai.app.tcloudbase.com/api",
    clientId: stableClientId(),
    z: 2147483600,
    confidence: 0.85,
    // Tab 装饰（接管 favicon / 给标题加状态前缀）。用户觉得意义不大，默认关掉；
    // 想重新启用就把这两项改回 true 再覆盖粘贴一次脚本。
    iceFavicon: false,
    tabTitlePrefix: false,
    // 每次知识检查出几道题：最少 2 道、最多 5 道，具体几道由模型按当前页面
    // 内容能拆出多少个独立知识点来定（内容薄就少出，内容厚就多出）。
    // 必须全部答对才算通过。想固定题数就把两个值写成一样。
    quizMinCount: 2,
    quizMaxCount: 5,
    // 黑客松/演示模式：执行 localStorage.setItem("ice-study-demo-mode","1") 后刷新，
    // 知识检查会使用易通过的演示题，并额外提供「演示通过」按钮。
    demoMode: window.ICE_STUDY_DEMO === true || (() => { try { return localStorage.getItem("ice-study-demo-mode") === "1"; } catch (_) { return false; } })(),
    // 右上角的浮动按钮（启动按钮 / 融化进度徽标）能不能拖。
    // 拖动后的位置会记住，双击可以回到右上角默认位置。不想让它动就改成 false。
    floatDraggable: true,
    // 冰封策略：
    //   true  = 严格模式（默认）：学习模式开启后，除「学习源页面」以外的所有 Tab 一律冰封，
    //           新打开的 / 开启前就已打开的 Tab 都会在收到广播后立刻被冻住，不做内容相关性放行。
    //   false = 宽松模式：其他 Tab 先冻结，若后端判定其内容与学习主题「直接相关」才放行
    //           （适合一边看文档一边看视频的多 Tab 学习，但放行依赖模型判断，偶尔会误放）。
    strictFreeze: true
  };

  const state = { session: null, progress: 0, lastVisualProgress: -1, quiz: null, quizPreparing: null, blocked: false, lastUrl: location.href, readingSeen: 0, videoSeen: 0, renderer: null, frozenSync: 0, sessionSyncing: null, lastSessionSync: 0, sessionWatch: 0, quizSet: null, quizSetPreparing: null, quizExclude: [], quizSetError: "", sourceGuardActive: false, generatedQuote: null, relaxedPass: "", attachInFlight: null };
  // 冻结遮罩的挂载幂等锁：SPA 频繁触发 attachLearningMode 时防止遮罩被重复 mount
  let freezeMounting = false;
  // 遮罩持久化守卫：SPA 页面（React/Vue 路由切换、重新渲染）会把 body 里的未知节点连同遮罩一起删掉。
  // 旧版遮罩被删后 sync 轮询直接退出、页面裸奔解锁，要等下一次广播/轮询才重建遮罩 → 「弹了又消失、
  // 消失又弹」。现在持有 frozenRoot 引用，被删立刻原样补回同一节点（不重建、无闪烁、进度/名言保留）。
  let frozenRoot = null;
  let freezeGuardObserver = null;
  let freezeGuardTimer = 0;

  function reattachFrozenRoot() {
    if (!frozenRoot || frozenRoot.isConnected) return;
    // 遮罩挂到 documentElement（<html>）而不是 body：SPA 路由切换/重渲染通常只替换 body 内部，
    // 极少替换整个 html 根元素。这样即使 body 被整段清空或替换，遮罩仍然健在。
    try { document.documentElement.append(frozenRoot); } catch (_) { return; }
    state.blocked = true;
    document.documentElement.style.overflow = "hidden";
  }

  function startFreezeGuard() {
    if (freezeGuardObserver) return;
    try {
      freezeGuardObserver = new MutationObserver(reattachFrozenRoot);
      freezeGuardObserver.observe(document.documentElement, { childList: true, subtree: true });
    } catch (_) { freezeGuardObserver = null; }
    // 兜底定时器：observer 被页面反注册/绕过时也能秒级补回。
    // CSDN 等激进 SPA 会高频清空 body，1200ms 太长用户会看到"闪了一下又没了"，缩到 300ms。
    freezeGuardTimer = setInterval(reattachFrozenRoot, 300);
  }

  function stopFreezeGuard() {
    if (freezeGuardObserver) { try { freezeGuardObserver.disconnect(); } catch (_) {} freezeGuardObserver = null; }
    clearInterval(freezeGuardTimer); freezeGuardTimer = 0;
  }

  // 「会话已结束」连续确认计数：单次 inactive 可能是服务端写入间隙 / 网络抖动的假阴性，
  // 连续 2 次确认才解锁 —— 防止「解锁→广播又冻结→再解锁」的反复弹窗循环
  let inactiveStreak = 0;
  const DEFAULT_QUOTES = [
    { text: "学而不思则罔，思而不学则殆。", author: "孔子" },
    { text: "知之为知之，不知为不知，是知也。", author: "孔子" },
    { text: "纸上得来终觉浅，绝知此事要躬行。", author: "陆游" }
  ];
  const originalOverflow = document.documentElement.style.overflow;

  const api = async (route, options = {}) => {
    const attempts = options.attempts || 3;
    let lastError;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), options.timeout || 12000);
      try {
        const response = await fetch(`${CONFIG.api}${route}`, {
          method: options.method || "GET",
          headers: { "content-type": "application/json", "x-ice-client-id": CONFIG.clientId },
          body: options.body ? JSON.stringify(options.body) : undefined,
          signal: controller.signal
        });
        // 非 JSON 响应（如 SSO 网关把跨域 fetch 重定向到 HTML 登录页）：抛错让上层走失败路径，
        // 不能静默返回 {} —— 之前这样会让 sync 把空对象当成"会话已结束"误触发解锁。
        let data;
        try { data = await response.json(); }
        catch (_) { throw new Error(`非 JSON 响应（HTTP ${response.status}，可能被网关重定向）`); }
        if (!response.ok) {
          const error = new Error(data.error || `HTTP ${response.status}`);
          error.retryable = response.status >= 500 || response.status === 408 || response.status === 429;
          throw error;
        }
        return data;
      } catch (error) {
        lastError = error;
        const retryable = error.name === "AbortError" || error instanceof TypeError || error.retryable;
        if (!retryable || attempt === attempts - 1) break;
        await wait(600 * 2 ** attempt + Math.random() * 250);
      } finally { clearTimeout(timeout); }
    }
    const message = lastError?.name === "AbortError" ? "连接超时，请检查网络后重试" : (lastError?.message || "网络连接失败");
    throw new Error(message);
  };

  const el = (tag, attrs = {}, children = []) => {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([key, value]) => key === "class" ? node.className = value : node.setAttribute(key, value));
    (Array.isArray(children) ? children : [children]).forEach((child) => node.append(child?.nodeType ? child : document.createTextNode(child || "")));
    return node;
  };

  function mountStyles() {
    if (document.getElementById("ice-study-styles")) return;
    const style = el("style", { id: "ice-study-styles" });
    style.textContent = `
      :root { --ice-ink:#07131b; --ice-muted:#47616f; --ice-line:rgba(166,221,240,.38); --ice-accent:#68d7ef; }
      .ice-ui,.ice-ui *{box-sizing:border-box}.ice-ui{font-family:"Microsoft YaHei UI","PingFang SC",Arial,sans-serif;color:#eaf8fb}
      .ice-fab{position:fixed;right:18px;top:18px;z-index:${CONFIG.z};display:flex;align-items:center;gap:8px;border:1.5px solid rgba(166,221,240,.75);border-radius:14px;background:linear-gradient(150deg,rgba(224,246,252,.99) 0%,rgba(163,219,239,.96) 50%,rgba(120,196,229,.92) 100%);color:#0d3548;padding:11px 16px 11px 14px;font-weight:800;letter-spacing:.02em;text-shadow:0 1px 0 rgba(255,255,255,.55);box-shadow:0 14px 34px rgba(43,124,155,.34),inset 0 2px 0 rgba(255,255,255,.95),inset 0 -2px 0 rgba(110,180,210,.22),inset 0 0 0 1px rgba(255,255,255,.5);backdrop-filter:blur(12px) saturate(1.4);-webkit-backdrop-filter:blur(12px) saturate(1.4);cursor:pointer;overflow:hidden;transition:transform .25s ease,box-shadow .25s ease,background .25s ease;user-select:none;-webkit-user-select:none;touch-action:none;transform:scale(var(--ice-fab-scale,1))}
      .ice-fab:hover{transform:translateY(-3px) scale(var(--ice-fab-scale,1));background:linear-gradient(150deg,rgba(232,249,253,1) 0%,rgba(176,225,242,.98) 50%,rgba(135,204,234,.96) 100%);box-shadow:0 22px 44px rgba(43,124,155,.42),inset 0 2px 0 rgba(255,255,255,1),inset 0 -2px 0 rgba(110,180,210,.3),inset 0 0 0 1px rgba(255,255,255,.65)}
      .ice-fab.is-candle{background:linear-gradient(150deg,rgba(255,245,230,.92),rgba(252,222,186,.82));box-shadow:0 2px 10px rgba(160,90,20,.12),0 0 0 1px rgba(220,160,80,.3);color:#4a2a08}
      .ice-fab.is-candle:hover{background:linear-gradient(150deg,rgba(255,248,236,1) 0%,rgba(252,228,196,.98) 50%,rgba(248,206,148,.96) 100%);box-shadow:0 22px 44px rgba(180,100,25,.38),inset 0 2px 0 rgba(255,255,255,1),inset 0 -2px 0 rgba(220,160,80,.3),inset 0 0 0 1px rgba(255,255,255,.65)}
      .ice-fab.is-candle.is-dragging{box-shadow:0 26px 54px rgba(180,100,25,.46),inset 0 2px 0 rgba(255,255,255,1),inset 0 -2px 0 rgba(220,160,80,.34),inset 0 0 0 1px rgba(255,255,255,.78)}
      .ice-fab.is-candle .ice-fab-flame{color:#b45a0a;filter:drop-shadow(0 1px 0 rgba(255,255,255,.5))}
      .ice-fab:active{transform:translateY(0) scale(calc(var(--ice-fab-scale,1) * .98))}
      .ice-fab.is-dragging{transition:none;transform:scale(calc(var(--ice-fab-scale,1) * 1.04));box-shadow:0 26px 54px rgba(43,124,155,.5),inset 0 2px 0 rgba(255,255,255,1),inset 0 -2px 0 rgba(110,180,210,.34),inset 0 0 0 1px rgba(255,255,255,.78)}
      .ice-fab .ice-fab-snow{flex:0 0 18px;width:18px;height:18px;color:#0d3548;filter:drop-shadow(0 1px 0 rgba(255,255,255,.85))}
      .ice-fab .ice-fab-flame{flex:0 0 18px;width:18px;height:18px;color:#c06a0e;filter:drop-shadow(0 1px 0 rgba(255,255,255,.6))}
      .ice-fab .ice-status-text{white-space:nowrap}
      .ice-fab::after{content:"";position:absolute;top:-10%;left:-130%;width:55%;height:130%;background:linear-gradient(115deg,transparent 0%,rgba(255,255,255,.7) 45%,rgba(255,255,255,.85) 55%,transparent 100%);transform:skewX(-22deg);animation:ice-fab-shine 4s ease-in-out infinite;pointer-events:none}
      @keyframes ice-fab-shine{0%{left:-130%}55%{left:140%}100%{left:140%}}
      .ice-fab .ice-close{position:absolute;top:3px;right:5px;z-index:2;width:16px;height:16px;border-radius:50%;background:rgba(163,55,31,.9);color:#fff;font:800 11px/16px "Microsoft YaHei UI",sans-serif;text-align:center;cursor:pointer;opacity:0;transform:scale(.4);transition:opacity .16s ease,transform .16s ease;box-shadow:0 2px 7px rgba(122,42,28,.35);pointer-events:auto}
      .ice-fab .ice-zoom{position:absolute;top:3px;right:24px;z-index:2;width:16px;height:16px;border-radius:50%;background:rgba(13,83,108,.9);color:#fff;font:800 10px/16px "Microsoft YaHei UI",sans-serif;text-align:center;cursor:pointer;opacity:0;transform:scale(.4);transition:opacity .16s ease,transform .16s ease;box-shadow:0 2px 7px rgba(22,82,104,.35);pointer-events:auto}
      .ice-fab:hover .ice-close,.ice-fab:focus-within .ice-close,.ice-fab:hover .ice-zoom,.ice-fab:focus-within .ice-zoom{opacity:1;transform:scale(1)}
      .ice-fab .ice-close:hover{background:#a3371f}
      .ice-fab .ice-zoom:hover{background:#0c6f8e}
      .ice-status-bar{position:absolute;left:0;bottom:0;height:3px;width:0;border-radius:0 0 12px 12px;background:linear-gradient(90deg,rgba(126,214,238,.95),rgba(52,172,207,.95));box-shadow:0 0 9px rgba(52,172,207,.45);transition:width .55s cubic-bezier(.2,.8,.2,1),background .4s ease;pointer-events:none}
      .ice-status-bar.is-candle{background:linear-gradient(90deg,rgba(248,190,110,.95),rgba(218,130,40,.95));box-shadow:0 0 9px rgba(218,130,40,.45)}
      .ice-status-bar.is-full{background:linear-gradient(90deg,rgba(255,205,140,.98),rgba(244,133,104,.98));box-shadow:0 0 9px rgba(244,133,104,.45)}
      .ice-dialog-backdrop{position:fixed;inset:0;z-index:${CONFIG.z};display:grid;place-items:center;padding:20px;background:rgba(3,14,20,.68);backdrop-filter:blur(14px) saturate(1.15)}
      .ice-dialog{width:min(540px,100%);max-height:calc(100vh - 40px);overflow-y:auto;overscroll-behavior:contain;border:1.5px solid rgba(166,221,240,.8);border-radius:16px;background:linear-gradient(150deg,rgba(224,246,252,.98) 0%,rgba(163,219,239,.96) 50%,rgba(120,196,229,.93) 100%);padding:30px;color:#0d3548;text-shadow:0 1px 0 rgba(255,255,255,.45);box-shadow:0 30px 100px rgba(28,96,126,.42),inset 0 2px 0 rgba(255,255,255,.95),inset 0 -2px 0 rgba(110,180,210,.28),inset 0 0 0 1px rgba(255,255,255,.5);backdrop-filter:blur(18px) saturate(1.35);-webkit-backdrop-filter:blur(18px) saturate(1.35);scrollbar-width:thin;scrollbar-color:rgba(20,100,130,.4) transparent}
.ice-dialog::-webkit-scrollbar{width:8px}.ice-dialog::-webkit-scrollbar-thumb{background:rgba(20,100,130,.35);border-radius:4px}.ice-dialog::-webkit-scrollbar-track{background:transparent}
      .ice-kicker{font-size:11px;font-weight:800;letter-spacing:.18em;color:#9bddec;text-transform:uppercase}.ice-dialog .ice-kicker{color:#0c7d99}.ice-dialog h2{font-size:31px;line-height:1.12;margin:12px 0 10px;letter-spacing:-.04em;color:#0b1f29}.ice-dialog p{margin:0 0 22px;color:#315765;line-height:1.7}
      .ice-field{display:grid;gap:8px;margin-bottom:18px}.ice-field label{font-size:13px;font-weight:700;color:#0b1f29}.ice-field input,.ice-field textarea{width:100%;border:1px solid rgba(20,100,130,.3);border-radius:12px;background:rgba(255,255,255,.74);color:#0b1f29;padding:14px;font:inherit;line-height:1.5;outline:none;box-shadow:inset 0 1px 2px rgba(20,100,130,.08)}.ice-field textarea{min-height:108px;resize:vertical}.ice-field input::placeholder,.ice-field textarea::placeholder{color:rgba(11,31,41,.42)}.ice-field input:focus,.ice-field textarea:focus{border-color:#0c7d99;box-shadow:0 0 0 3px rgba(12,125,153,.16),inset 0 1px 2px rgba(20,100,130,.06)}.ice-sizes{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-bottom:18px}.ice-size{border:1px solid rgba(20,100,130,.22);border-radius:12px;background:rgba(255,255,255,.52);color:#0b1f29;padding:10px 8px 13px;cursor:pointer;text-align:center;box-shadow:inset 0 1px 0 rgba(255,255,255,.72),0 2px 6px rgba(28,96,126,.08);transition:background .2s,border-color .2s,box-shadow .2s}.ice-size:hover{background:rgba(255,255,255,.7)}.ice-size strong,.ice-size span{display:block}.ice-size .ice-size-icon{display:block;margin:0 auto 5px;width:46px;height:46px;color:#0c7d99}.ice-size span{margin-top:5px;font-size:11px;color:#47616f}.ice-size.is-selected{border-color:#0c7d99;background:rgba(255,255,255,.86);box-shadow:0 0 0 2px rgba(12,125,153,.14),inset 0 1px 0 rgba(255,255,255,.82)}
      .ice-themes{display:grid;grid-template-columns:1.08fr .92fr;gap:9px;margin:-4px 0 18px}.ice-theme{display:flex;align-items:center;gap:10px;text-align:left;border:1px solid rgba(20,100,130,.22);border-radius:12px;background:rgba(255,255,255,.52);color:#0b1f29;padding:11px 13px;cursor:pointer;box-shadow:inset 0 1px 0 rgba(255,255,255,.72),0 2px 6px rgba(28,96,126,.08);transition:background .2s,border-color .2s,box-shadow .2s}.ice-theme:hover{background:rgba(255,255,255,.7)}.ice-theme i{width:12px;height:24px;border-radius:7px;background:#9fe2f4;box-shadow:0 0 12px rgba(63,169,202,.4)}.ice-theme[data-theme="candle"] i{background:#e6b957;box-shadow:0 -7px 15px rgba(247,141,54,.7)}.ice-theme strong,.ice-theme span{display:block}.ice-theme span{margin-top:3px;font-size:11px;color:#47616f}.ice-theme.is-selected{border-color:#0c7d99;background:rgba(255,255,255,.86);box-shadow:0 0 0 2px rgba(12,125,153,.14),inset 0 1px 0 rgba(255,255,255,.82)}.ice-theme[data-theme="candle"].is-selected{border-color:#d4880f;background:rgba(255,245,224,.9);box-shadow:0 0 0 2px rgba(212,136,15,.16),inset 0 1px 0 rgba(255,255,255,.86)}
      .ice-activity{margin:0 0 18px;padding:13px 14px;border:1px solid rgba(20,100,130,.2);border-radius:12px;background:rgba(255,255,255,.4);box-shadow:inset 0 1px 0 rgba(255,255,255,.72)}.ice-activity-head{display:flex;justify-content:space-between;gap:12px;margin-bottom:10px;color:#315765;font-size:11px;font-weight:700}.ice-activity-months{display:grid;grid-template-columns:repeat(12,1fr);gap:4px;margin-bottom:6px;font-size:10px;font-weight:800;color:#47616f;letter-spacing:.02em}.ice-activity-months span{white-space:nowrap;overflow:visible}.ice-activity-grid{display:grid;grid-auto-flow:column;grid-template-rows:repeat(7,13px);grid-template-columns:repeat(12,1fr);gap:4px}.ice-day{width:100%;height:100%;border-radius:3px;background:rgba(20,100,130,.12)}.ice-day[data-level="1"]{background:#7fbcd0}.ice-day[data-level="2"]{background:#45a0a9}.ice-day[data-level="3"]{background:#1e8ba8}.ice-day[data-level="4"]{background:#0c7d99}
      .ice-workspaces{margin:0 0 18px;padding:13px 14px;border:1px solid rgba(20,100,130,.2);border-radius:12px;background:rgba(255,255,255,.4);box-shadow:inset 0 1px 0 rgba(255,255,255,.72)}.ice-workspaces-head{display:flex;justify-content:space-between;gap:12px;margin-bottom:10px;color:#315765;font-size:11px;font-weight:700}.ice-ws-chips{display:flex;flex-wrap:wrap;gap:7px}.ice-ws-chip{display:inline-flex;align-items:center;gap:6px;border:1px solid rgba(20,100,130,.24);border-radius:999px;background:rgba(255,255,255,.66);color:#0b1f29;padding:6px 11px;font-size:12px;font-weight:700;cursor:pointer;transition:background .2s,border-color .2s}.ice-ws-chip:hover{background:rgba(255,255,255,.86)}.ice-ws-chip.is-active{border-color:#0c7d99;background:rgba(255,255,255,.9);box-shadow:0 0 0 2px rgba(12,125,153,.14)}.ice-ws-chip b{color:#0c7d99}.ice-ws-empty{color:#47616f;font-size:12px;font-weight:600;line-height:1.5}.ice-ws-detail{margin-top:11px;padding-top:11px;border-top:1px solid rgba(20,100,130,.16)}.ice-ws-list{display:grid;gap:7px;margin-bottom:10px;max-height:200px;overflow:auto}.ice-ws-item{display:flex;justify-content:space-between;gap:10px;align-items:baseline;padding:7px 9px;border-radius:9px;background:rgba(255,255,255,.5);font-size:12px}.ice-ws-item a{color:#0c7d99;text-decoration:none;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ice-ws-item a:hover{text-decoration:underline}.ice-ws-item span{color:#47616f;font-size:11px;white-space:nowrap}.ice-ws-fb{margin-top:6px;padding:10px 11px;border-radius:10px;background:rgba(239,252,255,.55);border:1px solid rgba(17,61,76,.16);font-size:12px;color:#0b1f29;line-height:1.55}.ice-ws-fb b{color:#0c7d99}.ice-ws-fb ul{margin:4px 0 0;padding-left:16px}.ice-ws-fb li{margin-top:2px}.ice-ws-detail .ice-btn{display:inline-flex;align-items:center;width:fit-content;max-width:100%}
      .ice-actions{display:flex;justify-content:flex-end;gap:10px}.ice-btn{border:1px solid rgba(164,218,233,.4);border-radius:12px;padding:11px 16px;font:700 14px/1 inherit;cursor:pointer;white-space:nowrap}.ice-btn:active{transform:scale(.98)}.ice-dialog .ice-btn{border-color:rgba(20,100,130,.28)}.ice-dialog .ice-btn-primary{background:linear-gradient(150deg,#0e7490,#0b6f8e);color:#f2fdff;border-color:rgba(9,60,76,.5);box-shadow:0 8px 20px rgba(12,125,153,.28),inset 0 1px 0 rgba(255,255,255,.35);text-shadow:0 1px 1px rgba(0,30,40,.25)}.ice-dialog .ice-btn-primary:hover{background:linear-gradient(150deg,#0f86a6,#0c7d99);box-shadow:0 10px 24px rgba(12,125,153,.36),inset 0 1px 0 rgba(255,255,255,.4)}.ice-dialog .ice-btn-ghost{background:rgba(255,255,255,.44);color:#0b1f29}
      .ice-error{min-height:18px;color:#a3371f;font-size:13px;margin:0 0 8px}.ice-status{padding:9px 14px 11px 12px;border-radius:13px;font-size:12.5px}.ice-status .ice-fab-snow{flex:0 0 16px;width:16px;height:16px}.ice-status .ice-fab-flame{flex:0 0 16px;width:16px;height:16px;color:#c06a0e}
      .ice-freeze{position:fixed;inset:0;z-index:${CONFIG.z};overflow:hidden;background:rgba(188,225,235,.15);isolation:isolate;touch-action:none}
      .ice-freeze::before{content:"";position:absolute;inset:-30px;pointer-events:none;background:linear-gradient(145deg,rgba(225,247,251,.22),rgba(105,169,190,.14));backdrop-filter:blur(var(--ice-blur,18px)) saturate(.28) contrast(.84);-webkit-backdrop-filter:blur(var(--ice-blur,18px)) saturate(.28) contrast(.84)}
      .ice-freeze::after{content:"";position:absolute;inset:0;pointer-events:none;opacity:.48;background:radial-gradient(ellipse at 50% 52%,transparent 22%,rgba(220,246,251,.28) 58%,rgba(235,251,253,.54) 100%),repeating-linear-gradient(112deg,transparent 0 92px,rgba(255,255,255,.13) 94px,transparent 98px);mix-blend-mode:screen}
      .ice-progress{margin:24px auto 0;font:800 12px/1.2 "Microsoft YaHei UI",sans-serif;letter-spacing:.04em;color:#0b4256}
      .ice-canvas{position:absolute;inset:0;z-index:1;width:100%;height:100%;pointer-events:none}.ice-message{position:absolute;z-index:3;left:50%;top:7vh;width:min(560px,calc(100vw - 32px));transform:translateX(-50%);padding:18px 22px 17px;border:1px solid rgba(226,249,253,.68);border-radius:16px;background:linear-gradient(145deg,rgba(236,250,252,.76),rgba(192,229,237,.48));box-shadow:0 20px 58px rgba(10,64,82,.16),inset 0 1px 0 rgba(255,255,255,.82);backdrop-filter:blur(22px) saturate(1.15);color:#082632;text-align:left}.ice-message-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px}.ice-message h1{margin:3px 0 5px;font-size:clamp(21px,2.4vw,29px);line-height:1.12;letter-spacing:-.035em}.ice-message p{margin:0;color:#315765;font-size:13px;font-weight:650;line-height:1.55}.ice-message strong{color:#061f29}.ice-return{display:inline-block;margin-top:9px;border:1px solid rgba(17,61,76,.2);border-radius:10px;background:rgba(239,252,255,.52);color:#0a5269;padding:8px 11px;text-decoration:none;font-weight:800}.ice-return:hover{background:rgba(239,252,255,.82)}.ice-return-hint{margin-top:8px;padding:8px 11px;border:1px solid rgba(17,61,76,.18);border-radius:10px;background:rgba(255,240,208,.55);color:#6b4a12;font-size:12px;font-weight:700;line-height:1.45}.ice-quote{margin-top:13px;padding-top:12px;border-top:1px solid rgba(30,93,113,.15);color:#355e6c;font-size:12px;line-height:1.5}.ice-quote span{color:#173e4c;font-weight:750}.ice-progress{position:absolute;z-index:3;left:50%;bottom:5.5vh;transform:translateX(-50%);margin:0!important;padding:10px 14px;border:1px solid rgba(230,250,253,.62);border-radius:12px;background:rgba(218,243,247,.62);box-shadow:0 12px 36px rgba(10,64,82,.13),inset 0 1px rgba(255,255,255,.75);backdrop-filter:blur(16px);white-space:nowrap}.ice-freeze.is-final .ice-menu,.ice-freeze.is-final .ice-return,.ice-freeze.is-final .ice-return-hint,.ice-freeze.is-final .ice-quote{display:none!important}.ice-freeze.is-final .ice-progress{opacity:0;transform:translateX(-50%) translateY(-8px);transition:opacity .35s ease,transform .45s ease}.ice-freeze.is-final .ice-message{opacity:1!important;transform:translateX(-50%)!important;transition:none!important;animation:ice-final-card .55s cubic-bezier(.2,.8,.2,1)}@keyframes ice-final-card{0%{transform:translateX(-50%) scale(.92)!important;opacity:0}100%{transform:translateX(-50%) scale(1)!important;opacity:1}}
      .ice-progress.is-changing{animation:ice-progress-bump .62s cubic-bezier(.2,.8,.2,1)}@keyframes ice-progress-bump{0%{transform:translateX(-50%) scale(1)}38%{transform:translateX(-50%) scale(1.1);background:rgba(236,252,254,.92);box-shadow:0 16px 48px rgba(16,119,149,.28),inset 0 1px rgba(255,255,255,.92)}100%{transform:translateX(-50%) scale(1)}}
      .ice-menu{position:absolute;top:18px;right:18px;z-index:5}.ice-menu button{border:1px solid rgba(178,68,52,.44);border-radius:10px;background:linear-gradient(150deg,rgba(255,216,207,.84),rgba(246,180,168,.68));color:#7e2517;padding:8px 13px;font-weight:750;letter-spacing:.01em;cursor:pointer;box-shadow:0 2px 10px rgba(122,42,28,.16),inset 0 1px rgba(255,255,255,.52);transition:background .22s,box-shadow .22s,transform .12s}.ice-menu button:hover{background:linear-gradient(150deg,rgba(255,199,187,.94),rgba(243,160,146,.8));box-shadow:0 5px 17px rgba(122,42,28,.27),inset 0 1px rgba(255,255,255,.64);transform:translateY(-1px)}.ice-menu button:active{transform:translateY(0) scale(.98)}.ice-menu button b{display:inline-block;margin-right:5px;font-size:10px;transform:translateY(-1px);color:#9c3524}
      .ice-quiz{position:fixed;z-index:${CONFIG.z + 1};inset:0;display:grid;place-items:center;padding:20px;pointer-events:auto;background:rgba(4,22,30,.7);backdrop-filter:blur(10px)}.ice-quiz-card{width:min(600px,100%);border:1px solid rgba(205,244,251,.4);border-radius:16px;background:#0a222d;color:#e9f9fc;padding:26px;box-shadow:0 28px 90px rgba(1,14,20,.55);pointer-events:auto}.ice-quiz-card h2{margin:10px 0 20px;font-size:24px;line-height:1.35}.ice-options{display:grid;gap:9px}.ice-option{display:flex;gap:12px;text-align:left;border:1px solid rgba(157,215,230,.25);border-radius:12px;background:rgba(255,255,255,.035);color:#dff3f7;padding:13px;cursor:pointer}.ice-option:hover{border-color:#68d7ef}.ice-option:disabled{opacity:.55;cursor:wait}.ice-option b{color:#82d8e9}.ice-feedback{min-height:22px;margin:15px 0 0;color:#b8d7de}.ice-degraded{margin:0 0 14px;padding:10px 12px;border:1px solid rgba(255,199,111,.38);border-radius:10px;background:rgba(255,171,64,.1);color:#ffd9a0;font-size:12px;line-height:1.5}.ice-melting{animation:ice-final 1.55s cubic-bezier(.2,.8,.2,1) forwards}@keyframes ice-final{0%{transform:scale(var(--ice-scale,1));opacity:1}35%{transform:scale(calc(var(--ice-scale,1) * 1.045));opacity:.9}100%{transform:translateY(12vh) scale(.14,.04);opacity:0}}
      .ice-quiz{background:rgba(2,14,20,.74)}.ice-quiz .ice-quiz-card{background:linear-gradient(150deg,#ffffff,#eef6fb);color:#0b1f29;border-color:rgba(20,100,130,.22);box-shadow:0 30px 90px rgba(2,18,28,.42),inset 0 1px rgba(255,255,255,.7)}.ice-quiz .ice-quiz-card h2{color:#0b1f29}.ice-quiz .ice-kicker{color:#0c7d99}.ice-quiz .ice-option{background:#f4fafc;border-color:rgba(20,100,130,.18);color:#0b1f29}.ice-quiz .ice-option:hover{background:#e2f0f4;border-color:#0c7d99}.ice-quiz .ice-option b{color:#0c7d99}.ice-quiz .ice-feedback{color:#47616f}.ice-quiz .ice-degraded{background:rgba(255,171,64,.12);color:#7a4a0d;border-color:rgba(255,170,60,.45)}.ice-quiz .ice-btn-ghost{color:#0b1f29;border-color:rgba(20,100,130,.3)}.ice-quiz .ice-btn-ghost:hover{background:rgba(20,100,130,.06)}.ice-quiz .ice-loading{display:flex;align-items:center;gap:12px;margin:-6px 0 4px}.ice-quiz .ice-loading-cube{width:11px;height:11px;border-radius:3px;background:linear-gradient(135deg,#9fe2f4,#3fa9ca);box-shadow:0 0 9px rgba(63,169,202,.5),inset 0 1px rgba(255,255,255,.6);animation:ice-bounce 1.15s ease-in-out infinite}.ice-quiz .ice-loading-cube:nth-child(2){animation-delay:.16s}.ice-quiz .ice-loading-cube:nth-child(3){animation-delay:.32s}@keyframes ice-bounce{0%,55%,100%{transform:translateY(0) scale(1);opacity:.5}28%{transform:translateY(-9px) scale(1.08);opacity:1}}.ice-quiz .ice-loading-step{font-size:14px;font-weight:750;color:#0c7d99;letter-spacing:.01em}.ice-quiz .ice-loading-dots{display:inline-block;min-width:1.4em;text-align:left;letter-spacing:.05em}.ice-quiz .ice-fill-row{display:flex;gap:10px;margin-bottom:6px}.ice-quiz .ice-fill-input{flex:1;border:1px solid rgba(20,100,130,.32);border-radius:12px;background:#fff;color:#0b1f29;padding:13px 14px;font:inherit;outline:none}.ice-quiz .ice-fill-input:focus{border-color:#0c7d99;box-shadow:0 0 0 3px rgba(12,125,153,.15)}.ice-quiz .ice-fill-input::placeholder{color:rgba(11,31,41,.35)}.ice-quiz .ice-paper{max-height:54vh;overflow:auto;overscroll-behavior:contain;margin:0 -4px;padding:0 4px}.ice-quiz .ice-q{padding:15px 0;border-top:1px solid rgba(20,100,130,.14)}.ice-quiz .ice-q:first-child{border-top:0;padding-top:2px}.ice-quiz .ice-q-title{display:flex;align-items:center;gap:8px;font-weight:800;color:#0c7d99;font-size:14px;margin-bottom:7px}.ice-quiz .ice-q-type{font-size:11px;font-weight:800;letter-spacing:.06em;padding:2px 8px;border-radius:999px;background:rgba(12,125,153,.1);color:#0c7d99}.ice-quiz .ice-q-text{margin:0 0 10px;font-size:15px;line-height:1.55;color:#0b1f29}.ice-quiz .ice-q-note{margin-top:9px;font-size:12.5px;line-height:1.5;color:#47616f}.ice-quiz .ice-q.is-right .ice-q-note{color:#0c7d99}.ice-quiz .ice-q.is-wrong .ice-q-note{color:#a3371f;font-weight:800}.ice-quiz .ice-option.is-picked{background:#dff1f6;border-color:#0c7d99;box-shadow:inset 0 0 0 1px rgba(12,125,153,.3)}.ice-quiz .ice-option.is-right{background:#e6f7ec;border-color:#2f9e63;color:#14532d}.ice-quiz .ice-option.is-right b{color:#2f9e63}.ice-quiz .ice-option.is-wrong{background:#fdeceb;border-color:#d9534f;color:#8a1c13}.ice-quiz .ice-option.is-wrong b{color:#c0392b}.ice-quiz .ice-fill-input.is-right{background:#e6f7ec;border-color:#2f9e63;color:#14532d}.ice-quiz .ice-fill-input.is-wrong{background:#fdeceb;border-color:#d9534f;color:#8a1c13}.ice-quiz .ice-fill-input:disabled{opacity:1}
      @media(max-width:767px){.ice-fab,.ice-status{right:12px;top:12px}.ice-message{top:5.5vh;padding:15px 16px}.ice-message h1{font-size:20px}.ice-quote{display:none}.ice-dialog{padding:22px}.ice-progress{bottom:4vh;font-size:11px}}
      @media(prefers-reduced-motion:reduce){.ice-ui *{animation-duration:.01ms!important;transition-duration:.01ms!important}}
      @media(prefers-reduced-transparency:reduce){.ice-dialog{backdrop-filter:none;background:linear-gradient(150deg,#e2f4fa,#a9dcee)}.ice-fab,.ice-status{backdrop-filter:none;-webkit-backdrop-filter:none;background:linear-gradient(150deg,#e6f7fc,#a9dcee)}.ice-fab.is-candle,.ice-status.is-candle{background:linear-gradient(150deg,#fff3e0,#f5d9a8)}.ice-freeze::before{backdrop-filter:none;background:rgba(207,235,241,.96)}}
      .ice-result-deco{position:relative;border-radius:12px;background-image:linear-gradient(150deg,rgba(198,233,244,.34),rgba(152,206,226,.15));box-shadow:0 0 0 1.5px rgba(140,215,238,.58),0 6px 20px rgba(18,78,102,.10);transition:background-image .3s,box-shadow .3s}
      .ice-result-deco:hover{background-image:linear-gradient(150deg,rgba(210,240,249,.46),rgba(162,214,232,.22));box-shadow:0 0 0 1.5px rgba(88,178,206,.82),0 8px 24px rgba(18,78,102,.16)}
      .ice-badge-iced{border-radius:6px;box-shadow:0 0 0 1.5px rgba(152,220,240,.92),0 0 11px 2px rgba(140,215,238,.42);filter:saturate(.72) brightness(1.05) drop-shadow(0 0 3px rgba(160,226,246,.55))}
      .ice-result-deco.is-candle{background-image:linear-gradient(150deg,rgba(255,226,180,.42),rgba(228,172,88,.18));box-shadow:0 0 0 1.5px rgba(240,181,82,.62),0 6px 20px rgba(139,74,18,.12)}
      .ice-result-deco.is-candle:hover{background-image:linear-gradient(150deg,rgba(255,236,200,.5),rgba(236,188,110,.24));box-shadow:0 0 0 1.5px rgba(216,142,32,.86),0 8px 24px rgba(139,74,18,.18)}
      .ice-badge-iced.is-candle{border-radius:6px;box-shadow:0 0 0 1.5px rgba(243,190,96,.95),0 0 11px 2px rgba(247,160,60,.48);filter:saturate(.9) brightness(1.02) drop-shadow(0 0 3px rgba(255,180,80,.6))}
      .ice-candle-stage{display:none;position:absolute;z-index:2;left:50%;top:58%;width:180px;height:360px;transform:translate(-50%,-50%);filter:drop-shadow(0 28px 30px rgba(0,0,0,.45))}.ice-candle{position:absolute;left:45px;bottom:0;width:90px;height:270px;min-height:270px;border-radius:16px 16px 9px 9px;background:linear-gradient(90deg,#c88e35,#f1c96e 42%,#d49b3e)}.ice-candle::after{content:"";position:absolute;inset:8px 12px auto;height:8px;border-radius:50%;background:rgba(104,57,19,.38)}.ice-wick{position:absolute;left:87px;bottom:265px;width:5px;height:18px;border-radius:4px;background:#292018}.ice-flame{position:absolute;left:67px;bottom:278px;width:44px;height:70px;border-radius:48% 52% 48% 52% / 68% 68% 32% 32%;background:radial-gradient(ellipse at 50% 72%,#fff4b0 0 13%,#f6b43e 35%,#ef6b2d 68%,transparent 70%);filter:drop-shadow(0 0 22px rgba(247,141,54,.85));transform-origin:50% 100%;animation:candle-flame 1.1s ease-in-out infinite alternate;transition:opacity .35s}.ice-freeze.is-candle{background:rgba(25,17,12,.62)}.ice-freeze.is-candle::before{background:radial-gradient(circle at 50% 58%,rgba(244,163,73,.22),rgba(24,15,11,.82) 62%);backdrop-filter:blur(var(--ice-blur,18px)) saturate(.55)}.ice-freeze.is-candle::after{opacity:.18;background:repeating-linear-gradient(100deg,transparent 0 100px,rgba(255,196,111,.08) 102px,transparent 106px)}.ice-freeze.is-candle .ice-canvas{display:none}.ice-freeze.is-candle .ice-candle-stage{display:block}.ice-freeze.is-candle .ice-message{background:linear-gradient(145deg,rgba(47,34,24,.9),rgba(24,17,13,.82));border-color:rgba(243,197,117,.35);color:#fff1d5}.ice-freeze.is-candle .ice-message p,.ice-freeze.is-candle .ice-quote{color:#d8bea0}.ice-freeze.is-candle .ice-message strong{color:#fff4d9}.ice-freeze.is-candle .ice-kicker{color:#edbf68}.ice-freeze.is-candle .ice-return{color:#7a4318;background:#f2d69e}.ice-freeze.is-candle .ice-progress{color:#653b18;background:rgba(245,212,154,.82);border-color:rgba(255,231,181,.72)}@keyframes candle-flame{from{transform:rotate(-2deg) scale(.96,1.02)}to{transform:rotate(3deg) scale(1.04,.96)}}
      .ice-freeze.is-candle.is-final .ice-candle{height:270px!important;min-height:270px}
      .ice-freeze.is-candle.is-final .ice-wick{height:18px;bottom:265px!important}
      .ice-freeze.is-candle.is-final .ice-flame{animation:ice-flame-out 1.35s ease .18s forwards}
      .ice-freeze.is-candle.is-final .ice-candle::before{content:"";position:absolute;left:38px;top:-8px;width:16px;height:44px;border-radius:50%;border-left:3px solid rgba(232,226,214,.85);transform:rotate(-16deg);animation:ice-smoke 1.15s ease-out .35s both}
      @keyframes ice-flame-out{0%{transform:scale(1);opacity:1}22%{transform:scale(1.14,.86)}48%{transform:scale(.72,.5);opacity:.62}70%{transform:translateY(2px) scale(.42,.24);opacity:.28}100%{transform:translateY(5px) scale(.16,.08);opacity:0}}
      .ice-freeze.is-interrupted::after{opacity:.72;background:radial-gradient(circle at 50% 48%,rgba(206,72,49,.28),rgba(38,10,8,.82));animation:ice-interrupt-flash .72s ease both}.ice-freeze.is-interrupted .ice-message{animation:ice-interrupt-card .72s cubic-bezier(.2,.8,.2,1) both}.ice-freeze.is-interrupted .ice-progress{opacity:0;transition:opacity .2s}.ice-freeze.is-interrupted .ice-flame{opacity:0;animation:none}      .ice-freeze.is-interrupted .ice-candle::before{content:"";position:absolute;left:38px;top:-48px;width:16px;height:42px;border-radius:50%;border-left:3px solid rgba(215,215,205,.65);transform:rotate(-18deg);animation:ice-smoke .8s ease-out both}@keyframes ice-interrupt-flash{0%{opacity:0}28%{opacity:.9}100%{opacity:.55}}@keyframes ice-interrupt-card{0%{transform:translateX(-50%)}25%{transform:translateX(calc(-50% - 8px))}45%{transform:translateX(calc(-50% + 7px))}100%{transform:translateX(-50%) translateY(-6px)}}@keyframes ice-smoke{to{transform:translate(14px,-30px) rotate(22deg);opacity:0}}
      .ice-celebrate{position:fixed;inset:0;z-index:${CONFIG.z};overflow:hidden;background:rgba(8,16,22,.74);isolation:isolate;touch-action:none}
      .ice-celebrate::before{content:"";position:absolute;inset:-30px;pointer-events:none;background:radial-gradient(circle at 50% 50%,rgba(120,170,200,.18),rgba(8,16,22,.82) 70%);backdrop-filter:blur(var(--ice-blur,18px)) saturate(.55);-webkit-backdrop-filter:blur(var(--ice-blur,18px)) saturate(.55)}
      .ice-celebrate.is-candle{background:rgba(25,17,12,.74)}
      .ice-celebrate.is-candle::before{background:radial-gradient(circle at 50% 58%,rgba(244,163,73,.26),rgba(24,15,11,.86) 65%);backdrop-filter:blur(var(--ice-blur,18px)) saturate(.55);-webkit-backdrop-filter:blur(var(--ice-blur,18px)) saturate(.55)}
      .ice-celebrate-card{position:absolute;z-index:4;left:50%;top:14vh;width:min(520px,calc(100vw - 32px));transform:translateX(-50%) translateY(10px);opacity:0;padding:22px 26px 21px;border-radius:18px;background:linear-gradient(145deg,rgba(238,250,253,.92),rgba(196,228,238,.7));border:1px solid rgba(226,249,253,.75);box-shadow:0 24px 72px rgba(10,64,82,.22),inset 0 1px 0 rgba(255,255,255,.85);backdrop-filter:blur(22px) saturate(1.15);-webkit-backdrop-filter:blur(22px) saturate(1.15);color:#082632;transition:opacity .6s ease,transform .65s cubic-bezier(.2,.8,.2,1)}
      .ice-celebrate.is-final .ice-celebrate-card{opacity:1;transform:translateX(-50%) translateY(0)}
      .ice-celebrate.is-candle .ice-celebrate-card{background:linear-gradient(145deg,rgba(58,42,30,.88),rgba(28,20,14,.82));color:#fff1d5;border-color:rgba(243,197,117,.35)}
      .ice-celebrate .ice-kicker{font-size:11px;font-weight:800;letter-spacing:.18em;color:#0c7d99;text-transform:uppercase;margin-bottom:6px}
      .ice-celebrate.is-candle .ice-kicker{color:#f5b95a}
      .ice-celebrate h1{margin:4px 0 9px;font-size:clamp(24px,2.8vw,34px);line-height:1.15;letter-spacing:-.04em;color:#082632}
      .ice-celebrate.is-candle h1{color:#fff4d9}
      .ice-celebrate p{margin:0;color:#315765;font-size:14px;line-height:1.6;font-weight:650}
      .ice-celebrate.is-candle p{color:#d8bea0}
      .ice-celebrate-close{position:fixed;right:18px;top:18px;z-index:6;display:inline-flex;align-items:center;gap:6px;animation:ice-celebrate-pop .4s cubic-bezier(.2,.8,.2,1) both}
      @keyframes ice-celebrate-pop{0%{transform:scale(.85);opacity:0}100%{transform:scale(1);opacity:1}}
      .ice-celebrate.is-candle{--candle-progress:0}
      .ice-celebrate.is-candle .ice-candle-stage{display:block;position:absolute;z-index:3;left:50%;top:64%;width:200px;height:380px;transform:translate(-50%,-50%);filter:drop-shadow(0 28px 30px rgba(0,0,0,.45))}
      .ice-celebrate.is-candle .ice-canvas{display:none}
      .ice-celebrate.is-candle.is-final .ice-flame{animation:ice-flame-out 1.35s ease .18s forwards}
      .ice-celebrate.is-candle.is-final .ice-candle{height:270px!important;min-height:270px}
      .ice-celebrate.is-candle.is-final .ice-wick{height:18px;bottom:265px!important}
      .ice-celebrate.is-candle.is-final .ice-candle::before{content:"";position:absolute;left:38px;top:-44px;width:16px;height:54px;border-radius:50%;border-left:3px solid rgba(232,226,214,.85);transform:rotate(-16deg);animation:ice-smoke 1.3s ease-out .35s both}
      .ice-rec-toast{position:fixed;z-index:${CONFIG.z + 2};right:18px;bottom:22px;max-width:min(380px,calc(100vw - 36px));border-radius:14px;background:linear-gradient(150deg,rgba(224,246,252,.98),rgba(163,219,239,.96));border:1.5px solid rgba(166,221,240,.8);box-shadow:0 20px 60px rgba(28,96,126,.35),inset 0 1px rgba(255,255,255,.85);padding:16px 18px;color:#0b1f29;font-size:13px;line-height:1.6;transform:translateY(24px);opacity:0;transition:transform .45s cubic-bezier(.2,.8,.2,1),opacity .4s ease;cursor:pointer}
      .ice-rec-toast.is-visible{transform:translateY(0);opacity:1}
      .ice-rec-toast .ice-rec-head{font-weight:800;font-size:12px;letter-spacing:.04em;color:#0c7d99;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid rgba(20,100,130,.12)}
      .ice-rec-toast .ice-rec-item{margin:8px 0;display:flex;flex-direction:column;gap:2px}
      .ice-rec-toast .ice-rec-item b{font-weight:750;color:#0b1f29;font-size:13.5px}
      .ice-rec-toast .ice-rec-item span{color:#315765;font-size:12.5px}
      .ice-rec-toast:hover{transform:translateY(-2px);box-shadow:0 24px 68px rgba(28,96,126,.42),inset 0 1px rgba(255,255,255,.9)}
      .ice-sel-bubble{position:fixed;z-index:${CONFIG.z};border:1px solid rgba(12,125,153,.4);border-radius:999px;background:linear-gradient(150deg,#e8f8fc,#bde6f2);color:#0b4256;padding:8px 14px;font:750 12.5px/1 inherit;cursor:pointer;box-shadow:0 8px 22px rgba(12,125,153,.28),inset 0 1px 0 rgba(255,255,255,.85);white-space:nowrap}
      .ice-sel-bubble:hover{background:linear-gradient(150deg,#f0fbfe,#a9dcee);box-shadow:0 10px 26px rgba(12,125,153,.36),inset 0 1px 0 rgba(255,255,255,.9)}
      .ice-sel-bubble:active{transform:scale(.97)}
      .ice-sel-card{position:fixed;z-index:${CONFIG.z};width:min(420px,calc(100vw - 24px));border:1px solid rgba(12,125,153,.32);border-radius:14px;background:linear-gradient(150deg,rgba(241,250,253,.98),rgba(206,235,243,.96));box-shadow:0 24px 60px rgba(10,64,82,.3),inset 0 1px 0 rgba(255,255,255,.85);color:#0b1f29;font-size:13px;line-height:1.65}
      .ice-sel-card .ice-sel-head{display:flex;justify-content:space-between;align-items:center;font-weight:800;font-size:12px;letter-spacing:.04em;color:#0c7d99;padding:10px 14px;border-bottom:1px solid rgba(20,100,130,.12)}
      .ice-sel-card .ice-sel-close{cursor:pointer;color:#47616f;font:800 15px/1 inherit;padding:2px 6px;border-radius:6px}
      .ice-sel-card .ice-sel-close:hover{background:rgba(20,100,130,.1);color:#0b1f29}
      .ice-sel-card .ice-sel-body{padding:12px 14px 14px;color:#173e4c;white-space:pre-wrap;max-height:42vh;overflow:auto}
      .ice-dialog.is-candle{background:linear-gradient(150deg,rgba(255,248,232,.98) 0%,rgba(245,217,168,.96) 50%,rgba(232,185,122,.93) 100%);border-color:rgba(212,136,15,.8);color:#3d2208;text-shadow:0 1px 0 rgba(255,255,255,.4);box-shadow:0 30px 100px rgba(139,74,18,.38),inset 0 2px 0 rgba(255,255,255,.95),inset 0 -2px 0 rgba(192,106,14,.28),inset 0 0 0 1px rgba(255,255,255,.5)}
      .ice-dialog.is-candle .ice-kicker{color:#b87a1a}
      .ice-dialog.is-candle h2{color:#2d1a05}
      .ice-dialog.is-candle p{color:#5c3d1a}
      .ice-dialog.is-candle .ice-field label{color:#2d1a05}
      .ice-dialog.is-candle .ice-field input,.ice-dialog.is-candle .ice-field textarea{border-color:rgba(160,90,20,.3);background:rgba(255,255,255,.74);color:#2d1a05}
      .ice-dialog.is-candle .ice-field input::placeholder,.ice-dialog.is-candle .ice-field textarea::placeholder{color:rgba(45,26,5,.42)}
      .ice-dialog.is-candle .ice-field input:focus,.ice-dialog.is-candle .ice-field textarea:focus{border-color:#c06a0e;box-shadow:0 0 0 3px rgba(192,106,14,.16),inset 0 1px 2px rgba(160,90,20,.06)}
      .ice-dialog.is-candle .ice-size{border-color:rgba(160,90,20,.22);background:rgba(255,255,255,.52);color:#2d1a05}
      .ice-dialog.is-candle .ice-size .ice-size-icon{color:#c06a0e}
      .ice-dialog.is-candle .ice-size:hover{background:rgba(255,255,255,.7)}
      .ice-dialog.is-candle .ice-size span{color:#6b4a1a}
      .ice-dialog.is-candle .ice-size.is-selected{border-color:#c06a0e;background:rgba(255,255,255,.86);box-shadow:0 0 0 2px rgba(192,106,14,.14),inset 0 1px 0 rgba(255,255,255,.82)}
      .ice-dialog.is-candle .ice-theme{border-color:rgba(160,90,20,.22);background:rgba(255,255,255,.52);color:#2d1a05}
      .ice-dialog.is-candle .ice-theme:hover{background:rgba(255,255,255,.7)}
      .ice-dialog.is-candle .ice-theme span{color:#6b4a1a}
      .ice-dialog.is-candle .ice-theme.is-selected{border-color:#c06a0e;background:rgba(255,255,255,.86);box-shadow:0 0 0 2px rgba(192,106,14,.14),inset 0 1px 0 rgba(255,255,255,.82)}
      .ice-dialog.is-candle .ice-theme[data-theme="candle"].is-selected{border-color:#d4880f;background:rgba(255,245,224,.9);box-shadow:0 0 0 2px rgba(212,136,15,.16),inset 0 1px 0 rgba(255,255,255,.86)}
      .ice-dialog.is-candle .ice-btn-primary{background:linear-gradient(150deg,#c06a0e,#a05200);color:#fff8ee;border-color:rgba(120,60,10,.5);box-shadow:0 8px 20px rgba(192,106,14,.28),inset 0 1px 0 rgba(255,255,255,.35);text-shadow:0 1px 1px rgba(60,30,0,.25)}
      .ice-dialog.is-candle .ice-btn-primary:hover{background:linear-gradient(150deg,#d67a12,#b86200);box-shadow:0 10px 24px rgba(192,106,14,.36),inset 0 1px 0 rgba(255,255,255,.4)}
      .ice-dialog.is-candle .ice-btn-ghost{background:rgba(255,255,255,.44);color:#2d1a05}
      .ice-dialog.is-candle .ice-activity{border-color:rgba(160,90,20,.2);background:rgba(255,255,255,.4)}
      .ice-dialog.is-candle .ice-workspaces{border-color:rgba(160,90,20,.2);background:rgba(255,255,255,.4)}
      .ice-dialog.is-candle .ice-workspaces-head{color:#6b4a1a}
      .ice-dialog.is-candle .ice-ws-chip{border-color:rgba(160,90,20,.24);background:rgba(255,250,238,.66);color:#2d1a05}.ice-dialog.is-candle .ice-ws-chip b{color:#b06d1e}.ice-dialog.is-candle .ice-ws-chip.is-active{border-color:#d4880f;background:rgba(255,247,228,.92);box-shadow:0 0 0 2px rgba(212,136,15,.18)}
      .ice-dialog.is-candle .ice-ws-item a{color:#b06d1e}
      .ice-dialog.is-candle .ice-ws-fb{background:rgba(255,247,228,.55);border-color:rgba(160,90,20,.18)}.ice-dialog.is-candle .ice-ws-fb b{color:#b06d1e}
      .ice-dialog.is-candle .ice-activity-head{color:#6b4a1a}
      .ice-dialog.is-candle .ice-day[data-level="1"]{background:#d4a86a}
      .ice-dialog.is-candle .ice-day[data-level="2"]{background:#c48a3f}
      .ice-dialog.is-candle .ice-day[data-level="3"]{background:#b06d1e}
      .ice-dialog.is-candle .ice-day[data-level="4"]{background:#8f520d}
      @media(prefers-reduced-transparency:reduce){.ice-dialog.is-candle{backdrop-filter:none;background:linear-gradient(150deg,#fae8d2,#e8c898)}}
      /* —— 冰杯 stage：冻结页/庆祝页的「杯中冰融化」，由 --ice-progress 驱动，与启动弹窗的冰杯概念统一 —— */
      .ice-freeze .ice-canvas{display:none}
      .ice-cup-stage{display:none;position:absolute;z-index:2;left:50%;top:60%;width:280px;height:400px;transform:translate(-50%,-50%);pointer-events:none;filter:drop-shadow(0 24px 34px rgba(6,44,62,.32))}
      .ice-freeze .ice-cup-stage{display:block}
      .ice-freeze.is-candle .ice-cup-stage{display:none}
      .ice-cup{position:absolute;left:50%;bottom:6px;width:216px;height:372px;transform:translateX(-50%);border:4px solid rgba(207,241,249,.68);border-top:8px solid rgba(226,249,253,.8);border-radius:18px 18px 38px 38px;background:linear-gradient(105deg,rgba(255,255,255,.3) 0 8%,rgba(255,255,255,.04) 22% 72%,rgba(133,204,224,.18));overflow:hidden;box-shadow:inset 12px 0 18px rgba(255,255,255,.22),inset -13px 0 20px rgba(64,150,181,.14),inset 0 -18px 30px rgba(31,119,151,.15),0 0 0 1px rgba(112,190,216,.2)}
      .ice-cup::before{content:"";position:absolute;z-index:5;inset:8px auto 26px 14px;width:12px;border-radius:50%;background:linear-gradient(180deg,rgba(255,255,255,.72),rgba(255,255,255,.06));opacity:.8}.ice-cup::after{content:"";position:absolute;z-index:6;left:8px;right:8px;top:8px;height:18px;border-radius:50%;border-top:3px solid rgba(245,254,255,.76);box-shadow:0 -2px 8px rgba(255,255,255,.5);pointer-events:none}
      .ice-cup-water{position:absolute;z-index:1;left:-4%;right:-4%;bottom:-2px;height:calc(9% + var(--ice-progress,0) * 68%);background:linear-gradient(180deg,rgba(159,226,241,.48),rgba(44,145,178,.68) 72%,rgba(20,99,136,.76));box-shadow:inset 0 10px 18px rgba(226,250,254,.18);transition:height 1.1s cubic-bezier(.2,.75,.2,1)}
      .ice-cup-water::before{content:"";position:absolute;top:-8px;left:-3%;right:-3%;height:17px;border-radius:50%;background:rgba(209,243,250,.72);border:1px solid rgba(244,254,255,.8);box-shadow:0 4px 12px rgba(23,110,140,.25);animation:ice-water-sway 3.4s ease-in-out infinite alternate}.ice-cup-water::after{content:"";position:absolute;inset:18% 14% auto;height:4px;border-radius:50%;background:rgba(255,255,255,.25);box-shadow:40px 42px 0 rgba(255,255,255,.18),-20px 76px 0 rgba(255,255,255,.16)}
      @keyframes ice-water-sway{from{transform:translateX(-2%) rotate(-1deg)}to{transform:translateX(2%) rotate(1deg)}}
      .ice-cube{display:block;position:absolute;z-index:2;background:linear-gradient(135deg,rgba(255,255,255,.95) 0 18%,rgba(184,231,243,.72) 42%,rgba(92,179,207,.55));border:1.5px solid rgba(255,255,255,.82);border-radius:10px 7px 12px 8px;box-shadow:0 7px 15px rgba(15,96,129,.22),inset 8px 7px 12px rgba(255,255,255,.4),inset -6px -7px 12px rgba(41,132,164,.2);transform-origin:50% 65%;transform:translateY(calc(var(--ice-progress,0) * 48px)) rotate(var(--r,0deg)) scale(calc(1 - var(--ice-progress,0) * .72));opacity:calc(1 - var(--ice-progress,0) * .92);transition:transform 1.15s cubic-bezier(.2,.75,.2,1),opacity 1s ease;filter:blur(calc(var(--ice-progress,0) * .45px))}
      .ice-cube::after{content:"";position:absolute;inset:7px 8px auto;height:30%;border-radius:5px;background:linear-gradient(120deg,rgba(255,255,255,.68),rgba(255,255,255,0));transform:skewX(-12deg)}
      .ice-cube:nth-of-type(1){left:16%;bottom:12%;width:52px;height:50px;--r:-9deg;--turn:-20deg}.ice-cube:nth-of-type(2){left:46%;bottom:16%;width:60px;height:58px;--r:7deg;--turn:16deg}.ice-cube:nth-of-type(3){left:26%;bottom:34%;width:46px;height:44px;--r:14deg;--turn:-14deg}.ice-cube:nth-of-type(4){left:56%;bottom:38%;width:44px;height:42px;--r:-13deg;--turn:22deg}.ice-cube:nth-of-type(5){left:38%;bottom:54%;width:38px;height:36px;--r:5deg;--turn:-18deg}
      .ice-cup-drop{display:block;position:absolute;z-index:7;top:24%;width:7px;height:12px;border-radius:50% 50% 62% 62%;background:linear-gradient(160deg,rgba(255,255,255,.9),rgba(121,202,225,.55));opacity:calc(var(--ice-progress,0) * .82);transform:translateY(calc(var(--ice-progress,0) * 72px));transition:opacity .9s ease,transform 1.3s ease;filter:drop-shadow(0 2px 2px rgba(23,110,140,.25))}.ice-cup-drop:nth-of-type(6){left:10%}.ice-cup-drop:nth-of-type(7){left:84%;transition-delay:.18s}.ice-cup-drop:nth-of-type(8){left:22%;transition-delay:.35s}
      /* 庆祝页：冰主题也用冰杯（进度从当前值到 1：冰块消失只剩水与冷凝），canvas 不再使用 */
      .ice-celebrate .ice-canvas{display:none}
      .ice-celebrate .ice-cup-stage{display:block;position:absolute;z-index:3;left:50%;top:62%;width:300px;height:420px;--ice-progress:.55;transform:translate(-50%,-50%);pointer-events:none;filter:drop-shadow(0 26px 38px rgba(4,38,56,.4))}
      .ice-celebrate.is-candle .ice-cup-stage{display:none}
      .ice-celebrate.is-final .ice-cup-stage{--ice-progress:1}
      .ice-celebrate.is-final .ice-cup{animation:ice-cup-reward 1.8s cubic-bezier(.2,.8,.2,1) both}.ice-celebrate.is-final:not(.is-candle)::after{content:"✓";position:absolute;z-index:5;left:50%;top:55%;width:82px;height:82px;margin:-41px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(145deg,#effcff,#83d7eb);border:2px solid rgba(255,255,255,.9);color:#08708d;font:900 45px/1 Arial;box-shadow:0 0 0 10px rgba(139,222,240,.16),0 18px 45px rgba(4,60,83,.3);animation:ice-reward-check .7s cubic-bezier(.16,1.35,.4,1) 1.45s both}@keyframes ice-cup-reward{0%{transform:translateX(-50%) scale(1)}45%{transform:translateX(-50%) scale(1.045)}100%{transform:translateX(-50%) scale(.94);filter:saturate(1.25) brightness(1.08)}}@keyframes ice-reward-check{0%{transform:scale(.25) rotate(-18deg);opacity:0}100%{transform:scale(1) rotate(0);opacity:1}}
    `;
    document.head.append(style);
  }

  function showStart() {
    document.getElementById("ice-start")?.remove();
    const localTopic = (document.querySelector("article h1,main h1,h1")?.textContent || document.title || document.querySelector('meta[name="description"]')?.content || "当前学习内容").replace(/\s+/g, " ").trim();
    const input = el("input", { id: "ice-goal", type: "text", value: localTopic, "aria-label": "自动识别的学习主题" });
    const lastWorkspace = (() => { try { return localStorage.getItem("ice-workspace-last") || ""; } catch (_) { return ""; } })();
    const workspaceInput = el("input", { id: "ice-workspace", type: "text", list: "ice-workspace-list", value: lastWorkspace, placeholder: "如：AI、唐诗、操作系统（留空归入默认）", "aria-label": "学习空间" });
    const workspaceList = el("datalist", { id: "ice-workspace-list" });
    const error = el("div", { class: "ice-error", role: "alert" });
    const cancel = el("button", { class: "ice-btn ice-btn-ghost", type: "button" }, "取消");
    const lastTheme = readLastTheme();
    const start = el("button", { class: "ice-btn ice-btn-primary", type: "button" }, lastTheme === "candle" ? "点亮蜡烛，开始学习" : "锁定并开始学习");
    const dialog = el("div", { class: "ice-dialog", role: "dialog", "aria-modal": "true", "aria-labelledby": "ice-start-title" }, [
      el("div", { class: "ice-kicker" }, lastTheme === "candle" ? "学到蜡烛熄灭" : "学到冰块融化"),
      el("h2", { id: "ice-start-title" }, lastTheme === "candle" ? "选择这次的蜡烛" : "选择这次的冰块"),
      el("p", {}, lastTheme === "candle" ? "时间点亮它，学会以后让风把火吹灭。系统已经从当前页面识别学习主题。" : "时间让它变化，学会让它加速。系统已经从当前页面识别学习主题。"),
      el("div", { class: "ice-field" }, [el("label", { for: "ice-goal" }, "学习主题（识别错误时可修改）"), input]),
      el("div", { class: "ice-field" }, [el("label", { for: "ice-workspace" }, "归入学习空间（完成后 URL 自动收进该空间收藏）"), workspaceInput, workspaceList]),
      el("div", { class: "ice-themes", role: "radiogroup", "aria-label": "专注主题" }, [
        el("button", { class: `ice-theme${lastTheme === "ice" ? " is-selected" : ""}`, type: "button", role: "radio", "aria-checked": String(lastTheme === "ice"), "data-theme": "ice" }, [el("i", { "aria-hidden": "true" }), el("div", {}, [el("strong", {}, "冰块"), el("span", {}, "学习让冰层加速消融")])]),
        el("button", { class: `ice-theme${lastTheme === "candle" ? " is-selected" : ""}`, type: "button", role: "radio", "aria-checked": String(lastTheme === "candle"), "data-theme": "candle" }, [el("i", { "aria-hidden": "true" }), el("div", {}, [el("strong", {}, "蜡烛"), el("span", {}, "学会以后让风吹灭")])])
      ]),
      el("div", { class: "ice-sizes", role: "radiogroup", "aria-label": "Session 大小" }, [
        el("button", { class: "ice-size", type: "button", role: "radio", "aria-checked": "false", "data-size": "small" }, [iceSizeIcon(lastTheme === "candle" ? "candle" : "cup", ICE_SIZE_SCALES.small), el("strong", {}, lastTheme === "candle" ? "小烛" : "小杯"), el("span", {}, "约 20–40 min")]),
        el("button", { class: "ice-size is-selected", type: "button", role: "radio", "aria-checked": "true", "data-size": "medium" }, [iceSizeIcon(lastTheme === "candle" ? "candle" : "cup", ICE_SIZE_SCALES.medium), el("strong", {}, lastTheme === "candle" ? "中烛" : "中杯"), el("span", {}, "约 40–80 min")]),
        el("button", { class: "ice-size", type: "button", role: "radio", "aria-checked": "false", "data-size": "large" }, [iceSizeIcon(lastTheme === "candle" ? "candle" : "cup", ICE_SIZE_SCALES.large), el("strong", {}, lastTheme === "candle" ? "大烛" : "大杯"), el("span", {}, "约 80–120 min")])
      ]),
      el("div", { class: "ice-activity", "aria-live": "polite" }, [el("div", { class: "ice-activity-head" }, [el("span", {}, "近 12 周学习标记"), el("b", {}, "正在读取…")]), el("div", { class: "ice-activity-months" }), el("div", { class: "ice-activity-grid" })]),
      el("div", { class: "ice-workspaces", "aria-live": "polite" }, [el("div", { class: "ice-workspaces-head" }, [el("span", {}, "学习空间（点击查看收藏与反馈）"), el("b", {}, "正在读取…")]), el("div", { class: "ice-ws-chips" }), el("div", { class: "ice-ws-detail" })]),
      error,
      el("div", { class: "ice-actions" }, [cancel, start])
    ]);
    dialog.classList.toggle("is-candle", lastTheme === "candle");
    const backdrop = el("div", { id: "ice-start", class: "ice-ui ice-dialog-backdrop" }, dialog);
    let selectedSize = "medium"; let selectedTheme = lastTheme;
    backdrop.querySelector(".ice-sizes").addEventListener("click", (event) => {
      const choice = event.target.closest("[data-size]"); if (!choice) return;
      selectedSize = choice.dataset.size;
      backdrop.querySelectorAll("[data-size]").forEach((node) => { const selected = node === choice; node.classList.toggle("is-selected", selected); node.setAttribute("aria-checked", String(selected)); });
    });
    backdrop.querySelector(".ice-themes").addEventListener("click", (event) => {
      const choice = event.target.closest("[data-theme]"); if (!choice) return;
      selectedTheme = choice.dataset.theme;
      backdrop.querySelectorAll("[data-theme]").forEach((node) => { const selected = node === choice; node.classList.toggle("is-selected", selected); node.setAttribute("aria-checked", String(selected)); });
      dialog.classList.toggle("is-candle", selectedTheme === "candle");
      const kicker = dialog.querySelector(".ice-kicker");
      const title = dialog.querySelector("h2");
      const desc = dialog.querySelector("p");
      const startBtn = backdrop.querySelector(".ice-btn-primary");
      const sizeNames = ["小杯", "中杯", "大杯"];
      const candleSizeNames = ["小烛", "中烛", "大烛"];
      saveLastTheme(selectedTheme);
      if (kicker) kicker.textContent = selectedTheme === "candle" ? "学到蜡烛熄灭" : "学到冰块融化";
      if (title) title.textContent = selectedTheme === "candle" ? "选择这次的蜡烛" : "选择这次的冰块";
      if (desc) desc.textContent = selectedTheme === "candle" ? "时间点亮它，学会以后让风把火吹灭。系统已经从当前页面识别学习主题。" : "时间让它变化，学会让它加速。系统已经从当前页面识别学习主题。";
      if (startBtn) startBtn.textContent = selectedTheme === "candle" ? "点亮蜡烛，开始学习" : "锁定并开始学习";
      backdrop.querySelectorAll(".ice-size strong").forEach((node, index) => { node.textContent = (selectedTheme === "candle" ? candleSizeNames : sizeNames)[index] || ""; });
      // 尺寸参考图跟着主题换：冰杯 ↔ 蜡烛
      backdrop.querySelectorAll(".ice-size").forEach((node) => {
        const scale = ICE_SIZE_SCALES[node.dataset.size] || 1;
        node.querySelector("svg")?.replaceWith(iceSizeIcon(selectedTheme === "candle" ? "candle" : "cup", scale));
      });
    });
    cancel.onclick = () => backdrop.remove();
    start.onclick = async () => {
      const goal = input.value.trim();
      if (goal.length < 4) { error.textContent = "请写下一个明确的学习目标。"; return; }
      start.disabled = true; start.textContent = "正在建立学习任务...";
      try {
      saveLastTheme(selectedTheme);
      state.session = await api("/session/start", { method: "POST", body: { goal, workspace: workspaceInput.value.trim(), size: selectedSize, theme: selectedTheme, sourceUrl: location.href, sourceTitle: document.title } });
      try { localStorage.setItem("ice-workspace-last", workspaceInput.value.trim()); } catch (_) {}
      backdrop.remove(); document.getElementById("ice-fab")?.remove(); attachLearningMode();
      } catch (err) { error.textContent = `无法连接 Session 服务：${err.message}`; start.disabled = false; start.textContent = selectedTheme === "candle" ? "点亮蜡烛，开始学习" : "锁定并开始学习"; }
    };
    document.body.append(backdrop); input.focus(); input.select();
    const renderActivity = (activity) => {
      state.activity = activity;
      const grid = backdrop.querySelector(".ice-activity-grid"); const months = backdrop.querySelector(".ice-activity-months"); const today = new Date();
      const days = [];
      for (let offset = 83; offset >= 0; offset -= 1) {
        const date = new Date(today); date.setDate(today.getDate() - offset);
        const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        const count = Number(activity.days?.[dateKey]?.count || 0);
        days.push({ date, dateKey, count });
      }
      grid.replaceChildren();
      days.forEach(({ dateKey, count }) => {
        grid.append(el("i", { class: "ice-day", "data-level": String(count ? Math.min(4, count) : 0), title: `${dateKey}：${count} 次完成` }));
      });
      // 月份标签：12 个周列，每列占一份宽度；某一列里出现新月份时在该列标出月份名
      if (months && !months.children.length) {
        let lastMonth = -1;
        for (let week = 0; week < 12; week += 1) {
          const weekDays = days.slice(week * 7, week * 7 + 7);
          const label = weekDays.find((day) => day.date.getMonth() !== lastMonth);
          months.append(el("span", {}, label ? `${label.date.getMonth() + 1}月` : ""));
          lastMonth = weekDays.length ? weekDays[weekDays.length - 1].date.getMonth() : lastMonth;
        }
      }
      backdrop.querySelector(".ice-activity-head b").textContent = `连续 ${activity.streak || 0} 天 · 共 ${activity.total || 0} 次`;
    };
    api("/activity", { attempts: 2, timeout: 12000 }).then(renderActivity).catch(() => renderUnavailable(backdrop.querySelector(".ice-activity-head b"), "/activity", renderActivity));
    api("/topic/infer", { method: "POST", timeout: 8000, attempts: 2, body: { title: document.title, meta: document.querySelector('meta[name="description"]')?.content || "", content: structuredPageContent() } })
      .then((result) => { if (result.topic && input.value === localTopic) input.value = result.topic; }).catch(() => {});
    // 学习空间：拉取已完成任务的空间归档，渲染 chips；点击展开收藏列表 + 学习反馈
    api("/workspaces", { attempts: 1, timeout: 5000 }).then((result) => {
      renderWorkspaces(backdrop, result.workspaces || [], workspaceList);
    }).catch(() => renderUnavailable(backdrop.querySelector(".ice-workspaces-head b"), "/workspaces", (result) => {
      renderWorkspaces(backdrop, result.workspaces || [], workspaceList);
    }));
  }

  // 加载失败的统一兜底：显示「记录暂不可用 · 重试」按钮，最多 2 次重试；都用完了改成
  // 「跨域受限，可在普通页面查看」并附检测到的 CSP/SSO 提示。`success(activity)` 用于重试成功后回填 UI。
  function renderUnavailable(headEl, route, success) {
    if (!headEl) return;
    const csp = detectCsp();
    const hint = csp ? "（页面 CSP 限制了跨域请求）" : "（当前网络不可达，可到普通页面查看完整记录）";
    let attempts = 0;
    const render = (msg, button) => {
      headEl.replaceChildren(msg + (button ? " · " : ""));
      if (button) headEl.append(button);
    };
    const retryBtn = el("button", { class: "ice-btn ice-btn-ghost", type: "button", style: "padding:3px 9px;font-size:11px;margin-left:6px" }, "重试");
    retryBtn.onclick = () => {
      attempts += 1;
      retryBtn.disabled = true; retryBtn.textContent = "重试中…";
      api(route, { attempts: 1, timeout: 12000 }).then(success).catch(() => {
        retryBtn.disabled = false; retryBtn.textContent = "再试一次";
        if (attempts >= 2) {
          // 重试两次都失败：给出更明确的兜底提示，不再放重试按钮
          retryBtn.remove();
          render("记录暂不可用", null);
          headEl.append(el("span", { style: "font-weight:600;color:#7a5a1a;margin-left:6px" }, hint));
        }
      });
    };
    render("记录暂不可用", retryBtn);
  }

  // 检测当前页面是否有 CSP（meta/http header）会限制跨域 fetch：命中常见拦截关键词即视为受限
  function detectCsp() {
    try {
      const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
      const policy = (meta?.getAttribute("content") || "").toLowerCase();
      if (policy && !/https?:/.test(policy) && policy.includes("connect-src")) return true;
      // SSO/网关常见的拦截信号：页面 URL 含 SSO 路径或网关标记
      if (/\/(sso|auth|login|gateway|portal)(\/|\?|#|$)/i.test(location.pathname)) return true;
    } catch (_) {}
    return false;
  }

  // 渲染学习空间 chips 与详情：点击某空间展开它的收藏列表 + 「生成学习反馈」按钮
  function renderWorkspaces(backdrop, workspaces, datalist) {
    const head = backdrop.querySelector(".ice-workspaces-head b");
    const chipsBox = backdrop.querySelector(".ice-ws-chips");
    const detail = backdrop.querySelector(".ice-ws-detail");
    chipsBox.replaceChildren(); datalist.replaceChildren();
    if (!workspaces.length) {
      head.textContent = "还没有空间，完成后会自动建立";
      detail.replaceChildren(el("div", { class: "ice-ws-empty" }, "完成一次学习后，源页 URL 会按你填写的「学习空间」自动归档到这里，便于回顾与定期反馈。"));
      return;
    }
    head.textContent = `共 ${workspaces.length} 个空间 · ${workspaces.reduce((s, w) => s + w.count, 0)} 次学习`;
    for (const ws of workspaces) {
      const chip = el("button", { class: "ice-ws-chip", type: "button", "data-workspace": ws.name }, [el("span", {}, ws.name), el("b", {}, String(ws.count))]);
      const opt = el("option", { value: ws.name });
      datalist.append(opt);
      chip.onclick = () => {
        const isActive = chip.classList.toggle("is-active");
        chipsBox.querySelectorAll(".ice-ws-chip").forEach((c) => { if (c !== chip) c.classList.remove("is-active"); });
        if (!isActive) { detail.replaceChildren(); return; }
        renderWorkspaceDetail(detail, ws);
      };
      chipsBox.append(chip);
    }
  }

  function renderWorkspaceDetail(detail, ws) {
    const list = el("div", { class: "ice-ws-list" }, (ws.items || []).map((item) => el("div", { class: "ice-ws-item" }, [
      el("a", { href: item.sourceUrl || "#", target: "_blank", rel: "noopener", title: item.sourceTitle && item.sourceTitle !== item.goal ? `${item.goal} — ${item.sourceTitle}` : (item.goal || "") }, [document.createTextNode(item.goal || item.sourceTitle || item.sourceUrl)]),
      el("span", {}, `${item.minutes || 0} min`)
    ])));
    const fbBox = el("div", { class: "ice-ws-fb" });
    const btn = el("button", { class: "ice-btn ice-btn-ghost", type: "button", style: "margin-bottom:8px" }, "生成学习反馈");
    btn.onclick = async () => {
      btn.disabled = true; btn.textContent = "正在生成…"; fbBox.replaceChildren(el("div", {}, "AI 正在回顾这个空间的学习记录…"));
      try {
        const fb = await generateWorkspaceFeedback(ws.name, ws.items || []);
        if (!fb) { fbBox.replaceChildren(el("div", {}, "反馈生成失败，可稍后重试。")); }
        else {
          const highlights = fb.highlights?.length ? el("ul", {}, fb.highlights.map((h) => el("li", {}, [document.createTextNode(String(h))]))) : null;
          const suggestions = fb.suggestions?.length ? el("ul", {}, fb.suggestions.map((s) => el("li", {}, [document.createTextNode(String(s))]))) : null;
          fbBox.replaceChildren(
            el("div", {}, [el("b", {}, "总评："), document.createTextNode(fb.summary || "")]),
            highlights ? el("div", { style: "margin-top:6px" }, [el("b", {}, "已覆盖："), highlights]) : null,
            suggestions ? el("div", { style: "margin-top:4px" }, [el("b", {}, "建议："), suggestions]) : null
          );
        }
      } catch (err) {
        fbBox.replaceChildren(el("div", {}, `反馈生成失败：${err?.message || err}`));
      } finally {
        btn.disabled = false; btn.textContent = "生成学习反馈";
      }
    };
    detail.replaceChildren(list, btn, fbBox);
  }

  // 学习空间反馈：优先用 Tabbit 内置 AI（LLMBridge）本地生成，省云上额度；
  // 没有 LLMBridge 或本地失败时降级调云上 /api/workspace/feedback。
  async function generateWorkspaceFeedback(workspace, items) {
    if (typeof LLMBridge !== "undefined" && typeof LLMBridge.chat === "function") {
      try {
        const history = items.slice(0, 30).map((i) => `- ${i.sourceTitle || i.goal || i.sourceUrl}（${i.minutes || "?"} 分钟）`).join("\n");
        const prompt = [
          `以下是我在学习空间「${workspace}」里已完成的学习任务（${items.length} 条，仅展示最近部分）：`,
          history,
          "",
          "请给出阶段性学习反馈，只输出 JSON：",
          '{"summary":"80字以内的总体评价","highlights":["2-3条已掌握/覆盖的方向"],"suggestions":["2-3条下一步学习建议"]}',
          "全部用中文，口吻鼓励但诚实。"
        ].join("\n");
        const text = await LLMBridge.chat(prompt, "json");
        const parsed = parseLooseJson(text);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && (parsed.summary || parsed.highlights || parsed.suggestions)) {
          return { summary: String(parsed.summary || ""), highlights: (Array.isArray(parsed.highlights) ? parsed.highlights : []).map((h) => String(h)).slice(0, 3), suggestions: (Array.isArray(parsed.suggestions) ? parsed.suggestions : []).map((s) => String(s)).slice(0, 3) };
        }
        // LLM 返回的是数组时按单题对象兜底
        if (parsed && Array.isArray(parsed) && parsed[0]?.summary) {
          const row = parsed[0];
          return { summary: String(row.summary || ""), highlights: (Array.isArray(row.highlights) ? row.highlights : []).map((h) => String(h)).slice(0, 3), suggestions: (Array.isArray(row.suggestions) ? row.suggestions : []).map((s) => String(s)).slice(0, 3) };
        }
      } catch (_) { /* 降级云上 */ }
    }
    const result = await api("/workspace/feedback", { method: "POST", body: { workspace } });
    return result;
  }

  // 启动按钮上的六瓣雪花（自然雪花都是六重对称）：用 DOM API 构造 SVG，不依赖 emoji 字体，也不会被页面 CSP 拦
  const ICE_SNOW_PATHS = [
    "M12 2v20", "M3.5 6.5l17 11", "M3.5 17.5l17-11",
    "M12 2l-2 2", "M12 2l2 2", "M12 22l-2-2", "M12 22l2-2",
    "M3.5 6.5l1.3-2", "M3.5 6.5l-2-1.3", "M20.5 17.5l-1.3 2", "M20.5 17.5l2 1.3",
    "M3.5 17.5l-2 1.3", "M3.5 17.5l1.3 2", "M20.5 6.5l2-1.3", "M20.5 6.5l-1.3-2"
  ];
  function iceSnowIcon() {
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "ice-fab-snow");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("aria-hidden", "true");
    const group = document.createElementNS(NS, "g");
    group.setAttribute("stroke", "currentColor");
    group.setAttribute("stroke-width", "1.7");
    group.setAttribute("stroke-linecap", "round");
    ICE_SNOW_PATHS.forEach((d) => {
      const path = document.createElementNS(NS, "path");
      path.setAttribute("d", d);
      group.append(path);
    });
    svg.append(group);
    return svg;
  }

  // 蜡烛主题用的火焰图标（fab / 学习徽标）：结构与雪花一致，纯 DOM SVG，暖橙配色
  const ICE_FLAME_PATHS = [
    "M12 3c2.1 2.2 4.6 4.6 4.6 8a4.6 4.6 0 1 1-9.2 0c0-1.8.7-3.3 1.8-4.6C10.2 7.9 11 5.9 12 3z",
    "M12 21a2.4 2.4 0 0 0 2.4-2.4c0-1.1-.7-2-1.7-2.6.6-.4 1-.8 1.2-1.3",
    "M12 3c-.4 1.6-1 3.3-2 4.7"
  ];
  function iceFlameIcon() {
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "ice-fab-flame");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("aria-hidden", "true");
    const group = document.createElementNS(NS, "g");
    group.setAttribute("stroke", "currentColor");
    group.setAttribute("stroke-width", "1.7");
    group.setAttribute("stroke-linecap", "round");
    group.setAttribute("stroke-linejoin", "round");
    ICE_FLAME_PATHS.forEach((d) => {
      const path = document.createElementNS(NS, "path");
      path.setAttribute("d", d);
      group.append(path);
    });
    svg.append(group);
    return svg;
  }

  // —— 尺寸参考图：S/M/L 冰杯（冰块主题）与 S/M/L 蜡烛（蜡烛主题） ——
  // 用 48x48 的可读小插画替代 tiny icon：冰杯展示透明杯口、杯壁和冰块数量差异。
  const ICE_CANDLE_SIZE_PATHS = [
    "M9 10.5h6V20a1.2 1.2 0 0 1-1.2 1.2h-3.6A1.2 1.2 0 0 1 9 20z",
    "M12 10.5V8.4",
    "M12 2.6c1.25 1.35 2.7 2.7 2.7 4.7a2.7 2.7 0 1 1-5.4 0c0-2 1.45-3.35 2.7-4.7z"
  ];
  function iceSizeIcon(kind, scale) {
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "ice-size-icon");
    svg.setAttribute("viewBox", "0 0 48 48");
    svg.setAttribute("fill", "none");
    svg.setAttribute("aria-hidden", "true");
    const group = document.createElementNS(NS, "g");
    group.setAttribute("transform", `translate(${(24 * (1 - scale)).toFixed(2)} ${(44 * (1 - scale)).toFixed(2)}) scale(${scale})`);
    group.setAttribute("stroke", "currentColor");
    group.setAttribute("stroke-width", kind === "candle" ? "2.7" : "2.1");
    group.setAttribute("stroke-linecap", "round");
    group.setAttribute("stroke-linejoin", "round");
    if (kind === "candle") {
      group.setAttribute("transform", `translate(${(24 * (1 - scale)).toFixed(2)} ${(46 * (1 - scale)).toFixed(2)}) scale(${scale * 2})`);
      ICE_CANDLE_SIZE_PATHS.forEach((d) => {
        const path = document.createElementNS(NS, "path");
        path.setAttribute("d", d);
        group.append(path);
      });
    } else {
      const body = document.createElementNS(NS, "path");
      body.setAttribute("d", "M12 12.5C13.2 22 14.4 32 15.5 39.4C15.9 42.1 18.2 44 20.9 44H27.1C29.8 44 32.1 42.1 32.5 39.4C33.6 32 34.8 22 36 12.5");
      body.setAttribute("fill", "rgba(235,252,255,.32)");
      group.append(body);
      const rim = document.createElementNS(NS, "ellipse");
      rim.setAttribute("cx", "24"); rim.setAttribute("cy", "12.5"); rim.setAttribute("rx", "12.8"); rim.setAttribute("ry", "4.8");
      rim.setAttribute("fill", "rgba(255,255,255,.5)");
      group.append(rim);
      const cubes = [
        ["18", "17", "6.8", "-12"],
        ["25", "16", "7.2", "10"],
        ["21", "25", "7.8", "8"],
        ["28", "28", "6.5", "-8"]
      ];
      const count = scale < .86 ? 2 : scale < 1.08 ? 3 : 4;
      cubes.slice(0, count).forEach(([x, y, size, rotate]) => {
        const cube = document.createElementNS(NS, "rect");
        cube.setAttribute("x", x); cube.setAttribute("y", y); cube.setAttribute("width", size); cube.setAttribute("height", size);
        cube.setAttribute("rx", "1.8");
        cube.setAttribute("fill", "rgba(215,249,255,.78)");
        cube.setAttribute("transform", `rotate(${rotate} ${Number(x) + Number(size) / 2} ${Number(y) + Number(size) / 2})`);
        group.append(cube);
      });
      const front = document.createElementNS(NS, "path");
      front.setAttribute("d", "M12.4 12.7C14 15.5 18.6 17.4 24 17.4S34 15.5 35.6 12.7");
      group.append(front);
      const shine = document.createElementNS(NS, "path");
      shine.setAttribute("d", "M17.4 20.2c.6 5.2 1.2 10.6 1.9 16.8");
      shine.setAttribute("stroke", "rgba(255,255,255,.95)");
      shine.setAttribute("stroke-width", "2.6");
      group.append(shine);
    }
    svg.append(group);
    return svg;
  }
  const ICE_SIZE_SCALES = { small: 0.62, medium: 0.82, large: 1 };

  // 浮动按钮（启动按钮 / 融化进度徽标）的拖动支持。
  // 两者共用同一个存档位置，所以从「学到冰块融化」拖到某处后，开始学习变成进度徽标时还在原地。
  const FLOAT_POS_KEY = "ice-study-float-pos";
  const FLOAT_EDGE = 8;

  function readFloatPos() {
    try {
      const saved = JSON.parse(localStorage.getItem(FLOAT_POS_KEY) || "null");
      if (saved && Number.isFinite(saved.left) && Number.isFinite(saved.top)) return saved;
    } catch (_) { /* 存储被禁用或数据坏了就当没存过 */ }
    return null;
  }

  function clampFloat(node, left, top) {
    const rect = node.getBoundingClientRect();
    const maxX = Math.max(FLOAT_EDGE, window.innerWidth - rect.width - FLOAT_EDGE);
    const maxY = Math.max(FLOAT_EDGE, window.innerHeight - rect.height - FLOAT_EDGE);
    return { left: Math.min(Math.max(FLOAT_EDGE, left), maxX), top: Math.min(Math.max(FLOAT_EDGE, top), maxY) };
  }

  function placeFloat(node, left, top) {
    const next = clampFloat(node, left, top);
    node.style.left = `${Math.round(next.left)}px`;
    node.style.top = `${Math.round(next.top)}px`;
    node.style.right = "auto";
    return next;
  }

  function saveFloatPos(left, top) {
    try { localStorage.setItem(FLOAT_POS_KEY, JSON.stringify({ left: Math.round(left), top: Math.round(top) })); } catch (_) { /* 忽略 */ }
  }

  function resetFloatPos() {
    try { localStorage.removeItem(FLOAT_POS_KEY); } catch (_) { /* 忽略 */ }
  }

  function watchFloatResize() {
    if (window.__ICE_FLOAT_RESIZE__) return;
    window.__ICE_FLOAT_RESIZE__ = true;
    window.addEventListener("resize", () => {
      const node = document.getElementById("ice-fab") || document.getElementById("ice-status");
      if (!node || !node.style.left) return;
      placeFloat(node, parseFloat(node.style.left) || 0, parseFloat(node.style.top) || 0);
    });
  }

  // —— 悬浮按钮缩放：在按钮上滚动滚轮循环切换大小档位（0.85 / 1 / 1.2 / 1.45），刷新后记住 ——
  const FLOAT_ZOOM_KEY = "ice-study-fab-zoom";
  const FLOAT_ZOOM_LEVELS = [0.85, 1, 1.2, 1.45];
  function readFloatZoom() {
    try {
      const raw = localStorage.getItem(FLOAT_ZOOM_KEY);
      if (raw === null || raw === "") return 1; // 没存过 → 默认档（Number(null) 是 0，不能直接 Number()）
      const index = Number(raw);
      return Number.isInteger(index) && index >= 0 && index < FLOAT_ZOOM_LEVELS.length ? index : 1;
    } catch (_) { return 1; }
  }
  function applyFloatZoom(node) {
    node.style.setProperty("--ice-fab-scale", String(FLOAT_ZOOM_LEVELS[readFloatZoom()]));
  }
  function stepFloatZoom(node, direction = 1) {
    const next = (readFloatZoom() + direction + FLOAT_ZOOM_LEVELS.length) % FLOAT_ZOOM_LEVELS.length;
    try { localStorage.setItem(FLOAT_ZOOM_KEY, String(next)); } catch (_) { /* 存储禁用就只本次生效 */ }
    applyFloatZoom(node);
  }
  function enableFloatZoom(node) {
    applyFloatZoom(node);
    node.addEventListener("wheel", (event) => {
      event.preventDefault();
      const step = event.deltaY > 0 ? 1 : -1;
      stepFloatZoom(node, step);
    }, { passive: false });
  }

  // 给节点装拖拽：按下拖动超过 5px 才算拖动（否则仍算点击），松手记住位置，双击回到右上角默认位。
  function enableFloatDrag(node) {
    const saved = readFloatPos();
    if (saved) placeFloat(node, saved.left, saved.top);
    watchFloatResize();
    let pointerId = null; let startX = 0; let startY = 0; let originX = 0; let originY = 0; let moved = false; let lastPos = null;

    node.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      if (event.target.closest("input,textarea,a,select,.ice-close")) return;
      const rect = node.getBoundingClientRect();
      pointerId = event.pointerId;
      startX = event.clientX; startY = event.clientY;
      originX = rect.left; originY = rect.top;
      moved = false; lastPos = null;
      try { node.setPointerCapture(event.pointerId); } catch (_) { /* 老浏览器没有就算了 */ }
      node.classList.add("is-dragging");
    });

    node.addEventListener("pointermove", (event) => {
      if (pointerId === null || event.pointerId !== pointerId) return;
      const dx = event.clientX - startX; const dy = event.clientY - startY;
      if (!moved && Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
      moved = true;
      lastPos = placeFloat(node, originX + dx, originY + dy);
    });

    const finish = (event) => {
      if (pointerId === null || (event && event.pointerId !== pointerId)) return;
      try { node.releasePointerCapture(pointerId); } catch (_) { /* 忽略 */ }
      pointerId = null;
      node.classList.remove("is-dragging");
      if (!moved) return;
      node.dataset.iceMoved = "1";
      if (lastPos) saveFloatPos(lastPos.left, lastPos.top);
      // 浏览器会紧跟着补一个 click，这里留给点击处理函数读；拖到元素外松手不会触发 click，所以兜底清掉
      setTimeout(() => { node.dataset.iceMoved = ""; }, 320);
    };

    node.addEventListener("pointerup", finish);
    node.addEventListener("pointercancel", finish);
    node.addEventListener("dblclick", () => { resetFloatPos(); node.style.left = ""; node.style.top = ""; node.style.right = ""; });
    return node;
  }

  // 拖动刚结束时那一下 click 要吃掉，不能当成点击
  function wasFloatDragged(node) {
    if (node.dataset.iceMoved !== "1") return false;
    node.dataset.iceMoved = "";
    return true;
  }

  // —— 悬浮关闭角标：悬浮时出现在右上角，点击只是把悬浮按钮藏起来（刷新页面即恢复） ——
  // 只藏 UI，不动学习进度：学习中的 session、冻结广播、进度徽标逻辑都照常在后台跑。
  function attachFloatClose(node) {
    if (node.querySelector(".ice-close")) return;
    const zoom = el("span", { class: "ice-zoom", role: "button", tabindex: "0", "aria-label": "切换悬浮按钮大小", title: "切换大小" }, "A");
    const close = el("span", { class: "ice-close", role: "button", tabindex: "0", "aria-label": "暂时隐藏悬浮按钮（刷新页面后恢复）", title: "暂时隐藏，刷新页面后恢复" }, "×");
    const resize = (event) => {
      event.stopPropagation();
      event.preventDefault();
      stepFloatZoom(node, 1);
    };
    const dismiss = (event) => {
      event.stopPropagation();
      event.preventDefault();
      node.remove();
    };
    zoom.onclick = resize;
    zoom.onkeydown = (event) => { if (event.key === "Enter" || event.key === " ") resize(event); };
    close.onclick = dismiss;
    close.onkeydown = (event) => { if (event.key === "Enter" || event.key === " ") dismiss(event); };
    node.append(zoom);
    node.append(close);
  }

  function showFab() {
    if (document.getElementById("ice-celebrate")) return;
    if (document.getElementById("ice-fab")) return;
    const theme = readLastTheme();
    const button = el("button", { id: "ice-fab", class: `ice-ui ice-fab${theme === "candle" ? " is-candle" : ""}`, type: "button", "aria-label": `开始${theme === "candle" ? "学到蜡烛熄灭" : "学到冰块融化"}（可拖动，双击回到右上角）` }, [theme === "candle" ? iceFlameIcon() : iceSnowIcon(), theme === "candle" ? "学到蜡烛熄灭" : "学到冰块融化"]);
    button.onclick = () => { if (!wasFloatDragged(button)) showStart(); };
    document.body.append(button);
    attachFloatClose(button);
    enableFloatZoom(button);
    if (CONFIG.floatDraggable) enableFloatDrag(button);
  }

  function structuredPageContent() {
    const source = document.querySelector("article,main,[role='main']") || document.body;
    const clone = source.cloneNode(true);
    clone.querySelectorAll("nav,footer,aside,script,style,noscript,form,button,input,select,textarea,.ice-ui,[aria-hidden='true']").forEach((node) => node.remove());
    const lines = [`# ${document.title}`];
    const description = document.querySelector('meta[name="description"]')?.content?.trim();
    if (description) lines.push(`> ${description}`);
    clone.querySelectorAll("h1,h2,h3,h4,p,li,blockquote,pre,table").forEach((node) => {
      if (node.matches("p") && node.closest("li,blockquote")) return;
      if (node.matches("li") && node.parentElement?.closest("li")) return;
      const text = (node.innerText || node.textContent || "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
      if (!text) return;
      if (/^H[1-4]$/.test(node.tagName)) lines.push(`${"#".repeat(Number(node.tagName[1]))} ${text}`);
      else if (node.matches("li")) lines.push(`- ${text}`);
      else if (node.matches("blockquote")) lines.push(`> ${text}`);
      else if (node.matches("pre")) lines.push(`\`\`\`\n${text}\n\`\`\``);
      else if (node.matches("table")) lines.push(`[表格]\n${text}`);
      else lines.push(text);
    });
    return lines.join("\n\n");
  }

  function searchTerms(value) {
    const lower = String(value || "").toLowerCase();
    const latin = lower.match(/[a-z][a-z0-9_.+-]{1,}/g) || [];
    const chinese = lower.match(/[\u3400-\u9fff]+/g) || [];
    const pairs = chinese.flatMap((word) => word.length < 3 ? [word] : [...word].slice(0, -1).map((char, index) => char + word[index + 1]));
    return [...new Set([...latin, ...pairs])];
  }

  function semanticUnits(value, target = 1500) {
    const blocks = String(value || "").split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
    const units = [];
    blocks.forEach((block) => {
      if (block.length <= target) { units.push(block); return; }
      const pieces = block.match(/[^。！？.!?\n]+[。！？.!?]?|[^\n]+/g) || [block];
      let current = "";
      pieces.forEach((piece) => {
        if (current && current.length + piece.length > target) { units.push(current.trim()); current = ""; }
        current += `${current ? " " : ""}${piece.trim()}`;
      });
      if (current) units.push(current.trim());
    });
    return units;
  }

  function selectRelevantMaterial(value) {
    return semanticUnits(value).join("\n\n");
  }

  function pageExcerpt() {
    return structuredPageContent();
  }

  function cleanTranscript(value) {
    const seen = new Set();
    return String(value || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .split(/\r?\n/)
      .map((line) => line.replace(/^\s*(?:WEBVTT|NOTE|\d+|\d{1,2}:\d{2}(?::\d{2})?[.,]\d+\s*-->.*)$/i, "").replace(/\s+/g, " ").trim())
      .filter((line) => line && !seen.has(line) && seen.add(line))
      .join("\n");
  }

  // 选项文本清洗：剥掉模型可能自带的 A. / B、/ (C) / 【D】/ ① 等编号前缀（界面会自己加 A-D 标签）
  const OPTION_LABEL_RES = [
    /^\s*(?:[（(\[【]\s*)?[A-Da-d]\s*(?:[)）\]】]\s*)?[.、:：,，)）\]】]\s*[-—–·]?\s*/,
    /^\s*[（(\[【]\s*[A-Da-d]\s*[)）\]】]\s*[-—–·]?\s*/,
    /^\s*[①②③④]\s*[-—–·]?\s*/,
    /^\s*(?:[（(\[【]\s*)?[一二三四]\s*(?:[)）\]】]\s*)?[.、:：]\s*[-—–·]?\s*/
  ];
  function stripOptionLabel(text) {
    let out = String(text ?? "").trim();
    for (let round = 0; round < 3; round += 1) {
      let changed = false;
      for (const re of OPTION_LABEL_RES) {
        const next = out.replace(re, "");
        if (next !== out) { out = next.trim(); changed = true; }
      }
      if (!changed) break;
    }
    return out;
  }

  const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
  const LAST_THEME_KEY = "ice-study-last-theme-v1";
  function readLastTheme() {
    try { return localStorage.getItem(LAST_THEME_KEY) === "candle" ? "candle" : "ice"; } catch (_) { return "ice"; }
  }
  function saveLastTheme(theme) {
    try { localStorage.setItem(LAST_THEME_KEY, theme === "candle" ? "candle" : "ice"); } catch (_) {}
  }

  // —— 跨 Tab 共享状态：让「一个 Tab 在学习，所有 Tab 一起冰封」 ——
  // 优先用篡改猴的 GM_*（跨站点、整个浏览器所有 Tab 共享；需要脚本头部 @grant GM_setValue / GM_getValue / GM_addValueChangeListener）
  // 没有 GM 权限时自动降级到 localStorage（同一站点内跨 Tab 共享，跨站点无效）
  const ICE_SHARE_KEY = "ice-study-share-v1";
  const share = {
    mode: (typeof GM_setValue === "function" && typeof GM_getValue === "function") ? "gm"
      : (() => { try { localStorage.setItem("__ice_probe__", "1"); localStorage.removeItem("__ice_probe__"); return "local"; } catch (_) { return "none"; } })(),
    read() {
      if (this.mode === "none") return null;
      try {
        const raw = this.mode === "gm" ? GM_getValue(ICE_SHARE_KEY, "") : localStorage.getItem(ICE_SHARE_KEY);
        if (!raw) return null;
        const value = JSON.parse(raw);
        return value && typeof value === "object" ? value : null;
      } catch (_) { return null; }
    },
    write(value) {
      if (this.mode === "none") return;
      try {
        const raw = JSON.stringify(value);
        if (this.mode === "gm") GM_setValue(ICE_SHARE_KEY, raw); else localStorage.setItem(ICE_SHARE_KEY, raw);
      } catch (_) { /* 存储不可用时静默忽略，不影响主流程 */ }
    },
    clear() {
      if (this.mode === "none") return;
      try {
        if (this.mode === "gm") { if (typeof GM_deleteValue === "function") GM_deleteValue(ICE_SHARE_KEY); else GM_setValue(ICE_SHARE_KEY, ""); }
        else localStorage.removeItem(ICE_SHARE_KEY);
      } catch (_) {}
    },
    listen(handler) {
      if (this.mode === "gm" && typeof GM_addValueChangeListener === "function") {
        try { GM_addValueChangeListener(ICE_SHARE_KEY, (_name, _oldValue, newValue) => handler(newValue)); return; } catch (_) {}
      }
      if (this.mode === "local") addEventListener("storage", (event) => { if (event.key === ICE_SHARE_KEY) handler(event.newValue); });
    }
  };
  function readSharedSession() {
    const value = share.read();
    if (!value || typeof value.updatedAt !== "number") return null;
    // 活跃锁不再因心跳过期而失效：浏览器可能将后台学习 Tab 暂停数分钟。
    // 只有源页明确写入 active:false 才表示结束。这样新开/刷新的无关 Tab 也不会漏锁。
    if (value.active === false) return null;
    return value;
  }

  // —— Tab 标题状态前缀 ——
  // 浏览器 Tab 标签条的样式（背景/圆角/描边）改不了，但标签上显示的「标题文字」= document.title，这个能改。
  // 于是在标题前面挂状态前缀，扫一眼标签栏就知道每个页面什么状态。
  let _iceBaseTitle = null;     // 原始标题（不含前缀）
  let _iceAppliedPrefix = "";   // 本次已加上的前缀，用于识别「是不是我们自己改的」

  function iceTitlePrefix() {
    const local = state.session;
    if (state.blocked) return "🔒 ";                                    // 本 Tab 被锁（不在学的东西）
    if (local?.unlocked) return "✓ ";                                   // 学完了
    if (local?.active) return `${local.theme === "candle" ? "🔥" : "❄"} ${Math.round(local.melt || 0)}% · `;   // 本 Tab 正在学
    const shared = readSharedSession();                                 // 别的 Tab 在学 → 跟着显示
    if (shared) return `${shared.theme === "candle" ? "🔥" : "❄"} ${Math.round(Number(shared.melt) || 0)}% · `;
    return "";
  }

  function syncIceTitle() {
    if (!CONFIG.tabTitlePrefix) { releaseIceTitle(); return; }
    if (_iceBaseTitle === null) _iceBaseTitle = document.title;
    const prefix = iceTitlePrefix();
    _iceAppliedPrefix = prefix;
    const next = prefix + _iceBaseTitle;
    if (document.title !== next) document.title = next;
  }

  function releaseIceTitle() {
    if (_iceBaseTitle === null) return;
    if (document.title !== _iceBaseTitle) document.title = _iceBaseTitle;
    _iceBaseTitle = null; _iceAppliedPrefix = "";
  }

  // 很多网站会自己动态改 title（视频换标题、聊天未读数、音乐播放状态）。
  // 守卫负责分辨：是我们改的（带前缀）就放行，是网站改的就以新值为基准重新加前缀，
  // 避免把人家刚更新的标题覆盖回旧值。
  function setupTitleGuard() {
    const titleEl = document.querySelector("title");
    if (!titleEl) return;
    new MutationObserver(() => {
      if (_iceBaseTitle === null) return;
      if (_iceAppliedPrefix && document.title.startsWith(_iceAppliedPrefix)) return; // 我们自己改的
      _iceBaseTitle = document.title;                                                // 网站改的 → 换基准
      syncIceTitle();
    }).observe(titleEl, { subtree: true, characterData: true, childList: true });
  }

  // 点「返回学习页面」：优先用 Tabbit 妙招的 tab API 直接切回学习源 tab（不新开页面）。
  // 普通网页 JS 不能任意激活已有 tab（浏览器安全限制），所以 API 不存在时依次降级：
  //   1) Tabbit.tabs.activate（需记录/查询到源 tab id）
  //   2) window.opener.focus()（本 tab 是从学习页 window.open 出来的才能聚焦回去）
  //   3) 就地提示手动切换标签，不再 window.open 堆积重复的学习页 tab
  function tabbitTabs() {
    try { return (window.Tabbit || window.tabbit)?.tabs || null; } catch (_) { return null; }
  }

  // 读当前 tab 的 id（供学习源页广播给其它 tab，切回时用）；读不到返回 null
  function readTabbitTabId() {
    if (state._tabbitTabId !== undefined) return state._tabbitTabId;
    let id = null;
    try {
      const tabs = tabbitTabs();
      const current = tabs?.current?.() ?? tabs?.getCurrent?.();
      if (current != null) id = typeof current === "object" ? (current.id ?? null) : current;
    } catch (_) { id = null; }
    state._tabbitTabId = id;
    return id;
  }

  function backToSourceTab() {
    const url = state.session?.sourceUrl;
    if (!url) return;
    // 直接在当前标签页导航回学习源页面：不再尝试 Tabbit API / opener.focus / 提示手动找标签
    window.location.href = url;
  }

  // —— Tab 冰封 favicon：把浏览器 Tab 标签上的小图标换成「杯子+冰+水」随学习进度变化的版本 ——
  // 脚本装上后，每个 Tab 的 favicon 都会被接管：
  //   idle（没在学习）    → 满冰
  //   melting（有 session）→ 冰量随 melt 进度减少，水量增加
  //   frozen（被锁住）    → 满冰 + 强调
  //   done（学习任务完成）→ 水
  function iceFaviconDataUrl(progress, mode) {
    const fill = Math.max(0, Math.min(1, Number(progress) || 0));
    const top = 2.4;      // 杯口
    const bottom = 15.3;  // 杯底内沿
    const innerH = bottom - top;
    const waterH = +(innerH * fill).toFixed(2);
    const iceH = +(innerH - waterH).toFixed(2);
    const waterY = +top.toFixed(2);
    const iceY = +(top + waterH).toFixed(2);
    const iceOpacity = +(0.95 - fill * 0.55).toFixed(2);
    const waterOpacity = +(0.30 + fill * 0.45).toFixed(2);
    // 满冰或 frozen 时杯子轮廓加粗
    const cupStroke = (mode === "frozen" || fill < 0.05) ? 1.05 : 0.8;
    const crackOpacity = +(0.65 - fill * 0.45).toFixed(2);
    return "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">`
      + `<defs>`
      +   `<linearGradient id="ice" x1="0" y1="0" x2="0" y2="1">`
      +     `<stop offset="0" stop-color="#eaf8fd"/><stop offset=".55" stop-color="#a8d8ec"/><stop offset="1" stop-color="#5fa9c6"/>`
      +   `</linearGradient>`
      +   `<linearGradient id="water" x1="0" y1="0" x2="0" y2="1">`
      +     `<stop offset="0" stop-color="#6dbcd6"/><stop offset="1" stop-color="#1d4e63"/>`
      +   `</linearGradient>`
      + `</defs>`
      + `<path d="M3 2.4 h10 l-1 11 a2 2 0 0 1 -2 1.8 h-4 a2 2 0 0 1 -2 -1.8 z" fill="rgba(255,255,255,.06)" stroke="#0a4256" stroke-width="${cupStroke}" stroke-linejoin="round"/>`
      + `<rect x="3.5" y="${waterY}" width="9" height="${waterH}" fill="url(#water)" opacity="${waterOpacity}"/>`
      + `<rect x="3.5" y="${iceY}" width="9" height="${iceH}" fill="url(#ice)" opacity="${iceOpacity}"/>`
      + `<path d="M5 ${(top + waterH * 0.4).toFixed(2)} l1.6 -0.9 l-0.5 1.4 l2 -0.4" stroke="#ffffff" stroke-width="0.4" fill="none" opacity="${crackOpacity}" stroke-linecap="round"/>`
      + `</svg>`);
  }
  const ICE_BLANK_HREF = "data:image/x-icon;base64,AAAA"; // 1x1 透明占位

  // 蜡烛主题 favicon：用烛火表达专注进度；完成时是风吹灭火焰，不让主蜡烛缩短。
  function iceCandleFaviconDataUrl(progress, mode) {
    const fill = Math.max(0, Math.min(1, Number(progress) || 0));
    const bodyTop = +(14.8 - 5.2 * fill).toFixed(2);          // 烛身高度随进度变矮
    const flameH = +(3.6 * (1 - fill * 0.82) + 0.5).toFixed(2);
    const flameW = +(2.05 * (1 - fill * 0.55) + 0.45).toFixed(2);
    const flameBottom = +(bodyTop + 0.6).toFixed(2);
    const flameTop = +(flameBottom - flameH).toFixed(2);
    const wickY = +(flameBottom - 0.5).toFixed(2);
    const flameOpacity = +(1 - fill * 0.45).toFixed(2);
    const glowR = +(2.9 + (1 - fill) * 1.4).toFixed(2);
    const smokeOpacity = fill > 0.72 ? ((fill - 0.72) / 0.28).toFixed(2) : 0;
    const stem = (mode === "frozen" || fill < 0.05) ? 0.7 : 0.55;
    return "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">`
      + `<defs>`
      +   `<linearGradient id="cbody" x1="0" y1="0" x2="0" y2="1">`
      +     `<stop offset="0" stop-color="#f3cf7a"/><stop offset="1" stop-color="#c07a24"/>`
      +   `</linearGradient>`
      +   `<radialGradient id="cflame" cx="0.5" cy="0.72" r="0.75">`
      +     `<stop offset="0" stop-color="#fff6c8"/><stop offset=".55" stop-color="#f6b43e"/><stop offset="1" stop-color="#e4581f"/>`
      +   `</radialGradient>`
      + `</defs>`
      + `<circle cx="8" cy="${(flameBottom - flameH * 0.35).toFixed(2)}" r="${glowR}" fill="rgba(247,141,54,.16)"/>`
      + `<rect x="5.6" y="${bodyTop}" width="4.8" height="${(15 - bodyTop).toFixed(2)}" rx="1.1" fill="url(#cbody)" stroke="#7a3d0a" stroke-width="${stem}"/>`
      + `<rect x="6.2" y="${(+bodyTop + 1.1).toFixed(2)}" width="3.6" height="0.9" rx="0.45" fill="rgba(96,52,14,.4)"/>`
      + `<rect x="7.75" y="${wickY}" width="0.5" height="${(flameBottom - wickY + 0.7).toFixed(2)}" rx="0.25" fill="#2a1608"/>`
      + `<path d="M8 ${flameTop} C ${(8 + flameW).toFixed(2)} ${(flameTop + flameH * 0.32).toFixed(2)}, ${(8 + flameW * 0.86).toFixed(2)} ${(flameBottom - 0.35).toFixed(2)}, ${(8 + flameW * 0.86).toFixed(2)} ${(flameBottom - 0.35).toFixed(2)} A ${(flameW * 0.86).toFixed(2)} ${(flameH * 0.28).toFixed(2)} 0 0 1 ${(8 - flameW * 0.86).toFixed(2)} ${(flameBottom - 0.35).toFixed(2)} C ${(8 - flameW * 0.86).toFixed(2)} ${(flameTop + flameH * 0.32).toFixed(2)}, ${(8 - flameW).toFixed(2)} ${(flameTop + flameH * 0.32).toFixed(2)}, 8 ${flameTop} Z" fill="url(#cflame)" opacity="${flameOpacity}"/>`
      + (smokeOpacity > 0 ? `<path d="M8 ${(flameTop - 0.5).toFixed(2)} q0.8 -0.8 0.1 -1.4 M8.3 ${(flameTop - 0.9).toFixed(2)} q0.9 -1 0.1 -1.6" stroke="rgba(210,205,195,.8)" stroke-width="0.5" fill="none" stroke-linecap="round" opacity="${smokeOpacity}"/>` : "")
      + `</svg>`);
  }

  function applyIceFavicon(progress, opts = {}) {
    if (!CONFIG.iceFavicon) { releaseFaviconShield(); return; }
    const mode = opts.mode || "melting";
    if (!document.head) return;
    if (!window.__iceFaviconShielded) {
      document.querySelectorAll('link[rel*="icon"]').forEach((link) => {
        if (link.dataset.iceFavicon === "1" || link.dataset.iceShielded === "1") return;
        link.dataset.iceOriginalHref = link.getAttribute("href") || "";
        link.dataset.iceShielded = "1";
        link.setAttribute("href", ICE_BLANK_HREF);
      });
      window.__iceFaviconShielded = true;
    }
    document.querySelectorAll('link[data-ice-favicon="1"]').forEach((link) => link.remove());
    const url = opts.theme === "candle" ? iceCandleFaviconDataUrl(progress, mode) : iceFaviconDataUrl(progress, mode);
    const link = el("link", { rel: "icon", type: "image/svg+xml", href: url, "data-ice-favicon": "1" });
    document.head.append(link);
  }
  function releaseFaviconShield() {
    if (!window.__iceFaviconShielded) return;
    document.querySelectorAll('link[data-ice-favicon="1"]').forEach((link) => link.remove());
    document.querySelectorAll('link[data-ice-shielded="1"]').forEach((link) => {
      const original = link.dataset.iceOriginalHref;
      if (original) link.setAttribute("href", original);
      else link.removeAttribute("href");
      delete link.dataset.iceShielded;
      delete link.dataset.iceOriginalHref;
    });
    window.__iceFaviconShielded = false;
  }
  function setupFaviconGuard() {
    if (!document.head || window.__iceFaviconGuard) return;
    window.__iceFaviconGuard = true;
    new MutationObserver(() => {
      if (!window.__iceFaviconShielded) return;
      document.querySelectorAll('link[rel*="icon"]').forEach((link) => {
        if (link.dataset.iceFavicon === "1") return;
        const current = link.getAttribute("href") || "";
        if (link.dataset.iceShielded === "1") {
          if (current !== ICE_BLANK_HREF) link.setAttribute("href", ICE_BLANK_HREF);
        } else {
          link.dataset.iceOriginalHref = current;
          link.dataset.iceShielded = "1";
          link.setAttribute("href", ICE_BLANK_HREF);
        }
      });
    }).observe(document.head, { childList: true, subtree: true, attributes: true, attributeFilter: ["href"] });
  }

  async function fetchText(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6500);
    try {
      const response = await fetch(url, { credentials: "include", ...options, signal: controller.signal });
      return response.ok ? response.text() : "";
    } catch (_) { return ""; } finally { clearTimeout(timeout); }
  }

  async function fetchJson(url, options = {}) {
    const text = await fetchText(url, options);
    try { return text ? JSON.parse(text) : null; } catch (_) { return null; }
  }

  function parseYouTubeCaption(value) {
    try {
      const json = JSON.parse(value);
      return (json.events || []).flatMap((event) => event.segs || []).map((segment) => segment.utf8 || "").join("\n");
    } catch (_) {
      const xml = new DOMParser().parseFromString(value, "text/xml");
      return [...xml.querySelectorAll("text")].map((node) => node.textContent || "").join("\n");
    }
  }

  function youtubePlayerResponse() {
    if (window.ytInitialPlayerResponse) return window.ytInitialPlayerResponse;
    try {
      const configured = window.ytplayer?.config?.args?.player_response;
      if (configured) return typeof configured === "string" ? JSON.parse(configured) : configured;
    } catch (_) { /* continue with inline page data */ }
    for (const script of document.scripts) {
      const text = script.textContent || "";
      const marker = "ytInitialPlayerResponse";
      const markerAt = text.indexOf(marker);
      if (markerAt < 0) continue;
      const start = text.indexOf("{", markerAt + marker.length);
      if (start < 0) continue;
      let depth = 0; let quoted = false; let escaped = false;
      for (let index = start; index < text.length; index += 1) {
        const char = text[index];
        if (quoted) {
          if (escaped) escaped = false;
          else if (char === "\\") escaped = true;
          else if (char === '"') quoted = false;
        } else if (char === '"') quoted = true;
        else if (char === "{") depth += 1;
        else if (char === "}" && --depth === 0) {
          try { return JSON.parse(text.slice(start, index + 1)); } catch (_) { break; }
        }
      }
    }
    return null;
  }

  async function youtubeTranscript() {
    if (!/(^|\.)youtube\.com$/.test(location.hostname)) return "";
    const tracks = youtubePlayerResponse()?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!Array.isArray(tracks) || !tracks.length) return "";
    const preferred = tracks.find((track) => /^(zh|en)/i.test(track.languageCode || "")) || tracks[0];
    const separator = preferred.baseUrl.includes("?") ? "&" : "?";
    let raw = await fetchText(`${preferred.baseUrl}${separator}fmt=json3`);
    if (!raw) raw = await fetchText(preferred.baseUrl);
    return parseYouTubeCaption(raw);
  }

  // B 站：视频内容在页面里没有文字，唯一能读到的就是字幕（口播原文），所以视频内容 = 字幕
  async function bilibiliTranscript() {
    if (!/(^|\.)bilibili\.com$/.test(location.hostname)) return "";
    const initial = window.__INITIAL_STATE__ || {};
    const bvid = location.href.match(/BV[0-9A-Za-z]{10}/)?.[0] || initial.bvid || initial.videoData?.bvid;
    if (!bvid) return "";
    let cid = initial.cid || initial.videoData?.cid;
    if (!cid) {
      const view = await fetchJson(`https://api.bilibili.com/x/web-interface/view?bvid=${encodeURIComponent(bvid)}`);
      cid = view?.data?.cid || view?.data?.pages?.[0]?.cid;
    }
    if (!cid) return "";
    const player = await fetchJson(`https://api.bilibili.com/x/player/v2?bvid=${encodeURIComponent(bvid)}&cid=${encodeURIComponent(cid)}`);
    const subtitles = player?.data?.subtitle?.subtitles;
    if (!Array.isArray(subtitles) || !subtitles.length) return "";
    const preferred = subtitles.find((subtitle) => /^(zh|ai-zh)/i.test(subtitle.lan || "")) || subtitles[0];
    const subtitleUrl = String(preferred.subtitle_url || "").replace(/^\/\//, "https://");
    const subtitle = subtitleUrl ? await fetchJson(subtitleUrl, { credentials: "omit" }) : null;
    return (subtitle?.body || []).map((item) => item.content || "").join("\n");
  }

  async function standardTrackTranscript(videos) {
    const previousModes = [];
    videos.forEach((video) => [...video.textTracks].forEach((track) => {
      previousModes.push([track, track.mode]);
      if (track.mode === "disabled") track.mode = "hidden";
    }));
    await wait(350);
    const parts = [];
    videos.forEach((video) => [...video.textTracks].forEach((track) => {
      if (track.cues) parts.push([...track.cues].map((cue) => cue.text || "").join("\n"));
    }));
    previousModes.forEach(([track, mode]) => { track.mode = mode; });
    const trackUrls = [...document.querySelectorAll('video track[kind="captions"],video track[kind="subtitles"]')]
      .map((track) => track.src).filter(Boolean).slice(0, 3);
    parts.push(...await Promise.all(trackUrls.map((url) => fetchText(url))));
    return parts.join("\n");
  }

  async function videoContent() {
    const videos = [...document.querySelectorAll("video")];
    if (!videos.length) return "";
    const details = videos.map((video, index) => {
      const duration = Number.isFinite(video.duration) ? Math.round(video.duration) : 0;
      const poster = video.poster ? `，封面 ${video.poster}` : "";
      return `视频 ${index + 1}：${duration ? `时长 ${duration} 秒` : "时长未知"}${poster}`;
    });
    const transcriptParts = await Promise.all([
      standardTrackTranscript(videos),
      youtubeTranscript(),
      bilibiliTranscript()
    ]);
    const transcriptSelectors = [
      ".ytp-caption-segment", "ytd-transcript-segment-renderer", "ytd-transcript-segment-list-renderer",
      ".bpx-player-subtitle-panel-text", ".bilibili-player-video-subtitle", "[class*='transcript']", "[aria-label*='字幕']"
    ];
    transcriptSelectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((node) => {
        if (!node.closest(".ice-ui") && node.innerText) transcriptParts.push(node.innerText);
      });
    });
    const transcript = cleanTranscript(transcriptParts.join("\n"));
    state.videoPageNoTranscript = !transcript;
    return `[视频信息]\n${details.join("\n")}${transcript ? `\n[视频内容]\n${transcript}` : "\n[视频内容]\n当前页面未提供可读取的视频内容。"}`;
  }

  async function learningMaterial() {
    const page = structuredPageContent();
    const video = await videoContent();
    const complete = `${page ? `[页面正文]\n${page}` : ""}${video ? `${page ? "\n\n" : ""}${video}` : ""}`;
    return complete;
  }

  function isSourcePage() {
    // 「学习源页面」= 开始学习时的那一页。判定必须严格：
    // 旧的「同源 + 同目录前缀」判定会把单层路径站点（B 站 /video/xxx、YouTube /watch、
    // 知乎 /question/xxx 等）的整站无关页面都误认成源页，导致新开的无关 Tab 不被冻结。
    // 现在只允许 hash 锚点变化，origin / pathname / query 有任何不同都算别的页面。
    const sourceUrl = state.session?.sourceUrl;
    if (!sourceUrl) return false;
    const current = new URL(location.href);
    const source = new URL(sourceUrl);
    current.hash = ""; source.hash = "";
    return current.href === source.href;
  }

  async function classify() {
    if (isSourcePage() || location.origin === new URL(CONFIG.api).origin) return true;
    const meta = document.querySelector('meta[name="description"]')?.content || "";
    const result = await api("/relevance", { method: "POST", body: { url: location.href, title: document.title, meta, excerpt: await learningMaterial() } });
    return result.relevant === true && result.confidence >= CONFIG.confidence && Boolean(result.direct_relation);
  }


  function syncFavicon() {
    const local = state.session;
    let melt = local?.melt ?? 0;
    let mode;
    let theme = local?.theme || "ice";
    if (state.blocked) mode = "frozen";             // 本 Tab 被锁（不在学的东西）
    else if (local?.unlocked) mode = "done";        // 本 Tab 学完了
    else if (local?.active) mode = "melting";       // 本 Tab 正在学
    else {
      // 本 Tab 没在学习 → 看看别的 Tab 有没有在学（跨 Tab 共享），有就跟着一起冰封
      const shared = readSharedSession();
      if (shared) { melt = Number(shared.melt) || 0; theme = shared.theme || "ice"; mode = "melting"; }
      else { releaseFaviconShield(); releaseIceTitle(); return; }  // 全局都没在学 → 还原 favicon 与标题
    }
    applyIceFavicon(Math.max(0, Math.min(1, melt / 100)), { mode, theme });
    syncIceTitle();
    // 本 Tab 正在学 → 广播进度，其它 Tab 的 favicon / 标题会同步成同样的冰量
    if (local?.active && isSourcePage()) {
      // 只有学习源页面自己广播进度；被共享冻结的 Tab 即使临时持有 session 也不广播，
      // 避免无关页面的 URL / 标题污染共享状态，导致「返回学习页面」指错地方。
      // tabId 一并广播：冻结 Tab 点「返回学习页面」时优先用 Tabbit tab API 直接切回本 tab。
      share.write({ melt: Math.round(melt), title: local.sourceTitle || "", url: location.href, theme: local.theme || "ice", tabId: readTabbitTabId(), updatedAt: Date.now() });
    }
  }

  function updateIce(progress) {
    state.progress = Math.max(0, Math.min(100, progress));
    const p = state.progress / 100;
    syncFavicon();
    const root = document.getElementById("ice-freeze");
    if (!root) return;
    root.style.setProperty("--ice-blur", `${18 - 15 * p}px`);
    root.style.setProperty("--ice-progress", String(p)); // 驱动冰杯 stage：冰块缩小/变透明，水位上升
    root.style.setProperty("--candle-progress", String(p));
    const progressLabel = root.querySelector(".ice-progress");
    progressLabel.textContent = state.session?.theme === "candle" ? `烛火已点亮 ${Math.round(state.progress)}%　完成学习任务才能吹灭` : `正在消融 ${Math.round(state.progress)}%　完成学习任务才能解锁`;
    if (state.lastVisualProgress >= 0 && Math.abs(state.progress - state.lastVisualProgress) >= 1) {
      progressLabel.classList.remove("is-changing");
      void progressLabel.offsetWidth;
      progressLabel.classList.add("is-changing");
    }
    state.lastVisualProgress = state.progress;
    state.renderer?.setProgress(state.progress);
  }

  function quoteForPage() {
    // 兑底名言：从候选里随机取一句（旧版按 URL seed 固定，导致同一个无关页一直命中同一句）
    const source = Array.isArray(window.ICE_STUDY_QUOTES) && window.ICE_STUDY_QUOTES.length ? window.ICE_STUDY_QUOTES : DEFAULT_QUOTES;
    const quote = source[Math.floor(Math.random() * source.length)] || DEFAULT_QUOTES[0];
    return typeof quote === "string" ? { text: quote, author: "" } : quote;
  }

  // —— 名言会话级缓存：key = ice-study-quote-${sessionId || goal}，同一轮学习保持一致，不同轮变化 ——
  function quoteCacheKey(session) {
    const key = session?.id || session?.sessionId || session?.goal || "";
    return key ? `ice-study-quote-${String(key).slice(0, 60)}` : "";
  }
  function readCachedQuote(session) {
    const key = quoteCacheKey(session);
    if (!key) return null;
    try {
      const quote = JSON.parse(localStorage.getItem(key) || "null");
      if (quote && typeof quote.text === "string" && quote.text.length >= 4) return quote;
    } catch (_) { /* 存储不可用或数据坏了当没有缓存 */ }
    return null;
  }
  function writeCachedQuote(session, quote) {
    const key = quoteCacheKey(session);
    if (!key || !quote?.text) return;
    try { localStorage.setItem(key, JSON.stringify({ text: quote.text, author: quote.author || "" })); } catch (_) {}
  }

  async function generateMotivationalQuote(goal) {
    if (typeof LLMBridge === "undefined" || typeof LLMBridge.chat !== "function") return null;
    if (state.generatedQuote) return state.generatedQuote;
    const cached = readCachedQuote(state.session);
    if (cached) { state.generatedQuote = cached; return cached; }
    try {
      const prompt = `学习者正在专注学习"${goal}"。请生成一句简短有力的中文激励话语（15-40字），风格可以是古人名言、现代金句或励志格言。只输出话语本身，不要任何解释、引号或作者名。`;
      const text = await LLMBridge.chat(prompt);
      const quote = String(text || "").trim().replace(/^[""''「」]|[""''」」]$/g, "").replace(/\n.*/s, "");
      if (quote.length >= 10 && quote.length <= 60) {
        state.generatedQuote = { text: quote, author: "" };
        return state.generatedQuote;
      }
    } catch (_) { /* LLM 不可用或生成失败时静默回退 */ }
    return null;
  }

  // —— 选中即问：选中页面上的一段文字 → 选区上方浮出「让 AI 帮你理解」→ 调 Tabbit 内置 AI 解释 ——
  // 只在妙招环境（LLMBridge 存在）里生效；普通浏览器里选字不会出现任何额外 UI。
  function currentTextSelection() {
    const selection = window.getSelection ? window.getSelection() : null;
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null;
    const text = String(selection.toString() || "").trim();
    if (text.length < 6 || text.length > 2000) return null;
    let container = selection.getRangeAt(0).commonAncestorContainer;
    if (container.nodeType === 3) container = container.parentElement;
    if (container && container.closest && container.closest(".ice-ui")) return null; // 我们自己的界面里选字不算
    try { return { text, rect: selection.getRangeAt(0).getBoundingClientRect() }; } catch (_) { return null; }
  }

  async function explainSelection(text, anchorRect) {
    document.querySelectorAll(".ice-sel-card").forEach((node) => node.remove());
    const card = el("div", { class: "ice-ui ice-sel-card", role: "dialog", "aria-label": "AI 解读" });
    card.innerHTML = '<div class="ice-sel-head">AI 解读<span class="ice-sel-close" role="button" tabindex="0" aria-label="关闭">×</span></div><div class="ice-sel-body">正在思考…</div>';
    const body = card.querySelector(".ice-sel-body");
    const close = card.querySelector(".ice-sel-close");
    const dismiss = () => card.remove();
    close.onclick = dismiss;
    close.onkeydown = (event) => { if (event.key === "Enter" || event.key === " ") dismiss(); };
    document.body.append(card);
    // 优先显示在选区下方，空间不够再放到选区上方
    const cardRect = card.getBoundingClientRect();
    const left = Math.max(10, Math.min(window.innerWidth - cardRect.width - 10, anchorRect.left + anchorRect.width / 2 - cardRect.width / 2));
    const belowTop = anchorRect.bottom + 10;
    const top = belowTop + cardRect.height < window.innerHeight - 10 ? belowTop : Math.max(10, anchorRect.top - cardRect.height - 10);
    card.style.left = `${Math.round(left)}px`;
    card.style.top = `${Math.round(top)}px`;
    try {
      const prompt = [
        "你是一个阅读助手。用户正在阅读网页《" + document.title + "》，选中了其中一段文字，请你解释这段文字：",
        "1) 用 2-4 句通俗的话讲清楚它的意思；",
        "2) 里面如有专业术语或典故，顺带一句话解释；",
        "3) 不要复述原文，直接给解释，控制在 150 字以内，用中文。"
      ].join("\n") + "\n\n选中的文字：\n" + text;
      const answer = await LLMBridge.chat(prompt);
      body.textContent = String(answer || "").trim() || "（AI 没有返回内容，可以再试一次）";
    } catch (err) {
      body.textContent = `解释失败：${err && err.message ? err.message : "AI 暂时不可用"}`;
    }
  }

  function setupSelectionExplain() {
    if (window.__ICE_SELECTION_EXPLAIN__) return;
    window.__ICE_SELECTION_EXPLAIN__ = true;
    let bubble = null;
    const removeBubble = () => { bubble?.remove(); bubble = null; };
    document.addEventListener("selectionchange", () => {
      // 选区变了：旧气泡撤掉。不要在选区清空时关闭解读卡片：
      // 点击气泡后会主动 removeAllRanges()，其异步 selectionchange
      // 可能发生在卡片创建之后，导致卡片刚显示就被删掉。
      // 卡片由关闭按钮或下方的外部点击监听负责关闭。
      removeBubble();
    });
    document.addEventListener("mouseup", (event) => {
      if (event.target.closest && event.target.closest(".ice-ui")) {
        // 点的是我们自己的 UI：气泡本身不撤（否则 click 还没来得及触发），其它（卡片/弹窗内）撤掉气泡
        if (!event.target.closest(".ice-sel-bubble")) removeBubble();
        return;
      }
      // 等选区落定（mouseup 时部分浏览器 selection 尚未更新完）
      setTimeout(() => {
        removeBubble();
        if (document.querySelector(".ice-sel-card")) return;   // 已展示解读卡片，不重复气泡
        const found = currentTextSelection();
        if (!found) return;
        if (typeof LLMBridge === "undefined" || typeof LLMBridge.chat !== "function") return; // 没有 Tabbit AI 就不打扰
        bubble = el("button", { class: "ice-ui ice-sel-bubble", type: "button" }, "让 AI 帮你理解");
        bubble.onclick = (clickEvent) => {
          clickEvent.stopPropagation();
          clickEvent.preventDefault();
          removeBubble();
          window.getSelection()?.removeAllRanges();   // 清掉选区：避免后续 mouseup 又把气泡拉出来
          explainSelection(found.text, found.rect);
        };
        document.body.append(bubble);
        const bubbleRect = bubble.getBoundingClientRect();
        const left = Math.max(10, Math.min(window.innerWidth - bubbleRect.width - 10, found.rect.left + found.rect.width / 2 - bubbleRect.width / 2));
        const aboveTop = found.rect.top - bubbleRect.height - 8;
        const top = aboveTop > 8 ? aboveTop : found.rect.bottom + 8;
        bubble.style.left = `${Math.round(left)}px`;
        bubble.style.top = `${Math.round(top)}px`;
      }, 160);
    });
    // 点到解读卡片以外的地方 → 关掉卡片
    document.addEventListener("mousedown", (event) => {
      const card = document.querySelector(".ice-sel-card");
      if (!card) return;
      if (event.target.closest && event.target.closest(".ice-sel-card")) return;
      if (event.target.closest && event.target.closest(".ice-sel-bubble")) return;
      card.remove();
    }, true);
  }

  function stopFrozenSync() {
    clearTimeout(state.frozenSync); state.frozenSync = 0;
  }

  function startFrozenSync() {
    stopFrozenSync();
    const sync = () => {
      // 冻结 Tab 的权威状态是学习源 Tab 的共享心跳，不是本 Tab 的 /session。
      // 每个域名的 clientId 可能不同，调用 /session/global 也可能受 SSO/CORS/网关影响；
      // 把这些响应当成 inactive 会造成「冻结 → 解锁 → 广播又冻结」的弹窗循环。
      const shared = readSharedSession();
      if (shared && shared.active !== false) {
        inactiveStreak = 0;
        if (!document.getElementById("ice-freeze")) {
          if (!frozenRoot || !state.session?._shared) return;
          reattachFrozenRoot(); startFreezeGuard();
        }
        if (state.session?._shared) {
          state.session = Object.assign({}, state.session, {
            melt: Number(shared.melt) || 0,
            sourceUrl: shared.url || state.session.sourceUrl,
            sourceTitle: shared.title || state.session.sourceTitle,
            theme: shared.theme === "candle" ? "candle" : "ice",
            _sourceTabId: shared.tabId ?? state.session._sourceTabId
          });
          updateIce(state.session.melt);
        }
      } else if (share.read()?.active === false) {
        // 只接受明确的结束信号。后台标签页会被浏览器节流，不能把心跳超时、
        // 暂时读不到共享存储或异常值解释成结束，否则遮罩会周期性解锁再弹出。
        handleSharedEnd();
        return;
      }
      const delay = document.visibilityState === "visible" ? 1500 : 12000;
      state.frozenSync = setTimeout(sync, delay);
    };
    // 首次轮询从 800ms 缩短到 200ms：新标签页被冻结后几乎立刻开始确认状态
    state.frozenSync = setTimeout(sync, 200);
  }

  function freeze() {
    // 幂等锁：挂载过程中（innerHTML 同步事件/SPA 反复触发）不允许重入；已存在遮罩直接返回
    if (freezeMounting || document.getElementById("ice-freeze")) return;
    if (!state.session) return;
    // 之前冻结过但被 SPA 删掉：直接补回原节点（不重建、进度/名言/主题都保留），这才是「长期封锁」
    if (frozenRoot) { reattachFrozenRoot(); startFreezeGuard(); startFrozenSync(); return; }
    freezeMounting = true;
    try {
      state.blocked = true; document.documentElement.style.overflow = "hidden";
      document.querySelectorAll("video,audio").forEach((media) => media.pause());
      const candle = state.session?.theme === "candle";
      const root = el("div", { id: "ice-freeze", class: `ice-ui ice-freeze${candle ? " is-candle" : ""}` });
      // 名言：先取本轮会话缓存 → 没有且 LLM 可用时先显示“正在生成”占位 → 失败再随机兑底
      const llmAvailable = typeof LLMBridge !== "undefined" && typeof LLMBridge.chat === "function";
      const cachedQuote = state.generatedQuote || readCachedQuote(state.session);
      let quote = cachedQuote;
      if (!quote) quote = llmAvailable ? { text: "正在为你生成一句话…", author: "" } : quoteForPage();
      // 冻结遮罩按钮统一叫“结束学习会话”，不随主题变化语义
      const endLabel = "结束学习会话";
      const endTitle = "中断会丢弃当前进度，且不计入学习任务";
      root.innerHTML = `
        <div class="ice-menu"><button type="button" id="ice-end" title="${endTitle}"><b>■</b>${endLabel}</button></div>
        <canvas class="ice-canvas" aria-hidden="true"></canvas><div class="ice-candle-stage" aria-hidden="true"><div class="ice-candle"></div><div class="ice-wick"></div><div class="ice-flame"></div></div>
        <div class="ice-cup-stage" aria-hidden="true"><div class="ice-cup"><div class="ice-cup-water"></div><i class="ice-cube"></i><i class="ice-cube"></i><i class="ice-cube"></i><i class="ice-cube"></i><i class="ice-cube"></i><i class="ice-cup-drop"></i><i class="ice-cup-drop"></i><i class="ice-cup-drop"></i></div></div>
        <div class="ice-message"><div class="ice-message-head"><div><div class="ice-kicker">${candle ? "学到蜡烛熄灭" : "学到冰块融化"}</div><h1>先完成正在学的内容</h1><p>你的学习材料是 <strong>${escapeHtml(state.session.sourceTitle)}</strong></p><a class="ice-return" href="${escapeHtml(state.session.sourceUrl)}">返回学习页面 →</a><div class="ice-return-hint" id="ice-return-hint" hidden>学习页在其它标签页中：请点击标签栏里带 ${candle ? "🔥" : "❄"} 前缀的标签切回去</div></div></div><div class="ice-quote">“${escapeHtml(quote.text)}”${quote.author ? ` <span>${escapeHtml(quote.author)}</span>` : ""}</div></div><div class="ice-progress"></div>`;
      root.addEventListener("wheel", (event) => event.preventDefault(), { passive: false });
      root.addEventListener("touchmove", (event) => event.preventDefault(), { passive: false });
      root.querySelector("#ice-end").onclick = confirmEnd;
      const backLink = root.querySelector(".ice-return");
      if (backLink) backLink.onclick = (event) => { event.preventDefault(); backToSourceTab(); };
      // 遮罩挂到 documentElement 而不是 body：body 被 SPA 整段替换时遮罩不会被一起清掉
      document.documentElement.append(root);
      // 冻结页视觉统一为「杯中冰融化」：冰杯/蜡烛都由 CSS stage 驱动（--ice-progress），
      // 不再用 canvas 画单块大冰，与启动弹窗的冰杯概念保持一致。
      state.renderer?.destroy();
      state.renderer = null;
      updateIce(state.session.melt || 0); startFrozenSync();
      frozenRoot = root; startFreezeGuard(); // 持有引用并开启持久化守卫：被页面删除时立即原样补回
      // 后台异步生成个性化激励言语：成功则替换，失败则从 DEFAULT_QUOTES 随机取一句兑底，并写入本轮缓存
      if (!cachedQuote && state.session?.goal) {
        generateMotivationalQuote(state.session.goal).then((generated) => {
          if (!root.isConnected) return; // 遮罩已卸载就不必再改
          const finalQuote = generated || quoteForPage();
          state.generatedQuote = finalQuote;
          writeCachedQuote(state.session, finalQuote);
          const quoteEl = root.querySelector(".ice-quote");
          if (quoteEl) quoteEl.innerHTML = `“${escapeHtml(finalQuote.text)}”${finalQuote.author ? ` <span>${escapeHtml(finalQuote.author)}</span>` : ""}`;
        });
      }
    } finally {
      freezeMounting = false;
    }
  }

  function escapeHtml(value) {
    const node = document.createElement("div"); node.textContent = String(value || "学习页面"); return node.innerHTML;
  }

  function unfreeze() {
    stopFrozenSync(); stopFreezeGuard();
    frozenRoot = null; inactiveStreak = 0;
    state.renderer?.destroy(); state.renderer = null;
    document.getElementById("ice-freeze")?.remove(); state.blocked = false; document.documentElement.style.overflow = originalOverflow;
    syncFavicon();
  }

  async function confirmEnd() {
    if (!confirm("结束本轮学习？当前进度会被丢弃。")) return;
    const goal = state.session?.goal;
    // 用广播信号替代 share.clear()：写入 active:false，同域其它 Tab 通过 share.listen 毫秒级感知解锁
    share.write({ active: false, updatedAt: Date.now() });
    // 清理本地状态并移除遮罩：点一下就消失，不用跳转
    state.session = null; state.sourceGuardActive = false; state.generatedQuote = null; state.relaxedPass = "";
    unfreeze(); document.getElementById("ice-status")?.remove(); showFab();
    // 后台异步通知服务端结束会话：短超时、不重试，失败也不阻塞用户
    try { await api("/session/end", { method: "POST", timeout: 4000, attempts: 1 }); } catch (_) { /* 网络失败时本地已结束，不影响体验 */ }
    if (goal) { generateRecommendations(goal).then((recs) => { if (recs?.length) showRecommendationToast(recs, goal); }); }
  }

  async function endSessionAndNavigate(url) {
    // 先立即本地结束并跳转：不能等 API 返回才放行，网络慢时用户会被卡死
    // 广播结束信号让同域其它 Tab 即时解锁，而不是 share.clear()（clear 后其它 Tab 收不到事件）
    share.write({ active: false, updatedAt: Date.now() });
    state.session = null; state.sourceGuardActive = false; state.generatedQuote = null; state.relaxedPass = "";
    unfreeze(); document.getElementById("ice-status")?.remove(); showFab();
    window.location.href = url;
    // 后台异步通知服务端：短超时、不重试
    try { await api("/session/end", { method: "POST", timeout: 4000, attempts: 1 }); } catch (_) { /* 网络失败不影响已发生的跳转 */ }
  }

  function setupSourcePageGuard() {
    if (!state.session?.active || state.sourceGuardActive || !isSourcePage()) return;
    state.sourceGuardActive = true;

    // 拦截页面内所有 <a> 标签点击（排除锚点、新标签页、javascript 伪协议）。
    // 监听只绑定一次（用 window 标记）：旧版每轮会话都重新 addEventListener，
    // 多轮会话后一次点击会弹多个 confirm（“不断弹窗”的真凶之一）。
    if (!window.__ICE_SOURCE_GUARD_CLICK__) {
      window.__ICE_SOURCE_GUARD_CLICK__ = true;
      document.addEventListener("click", (event) => {
        if (!state.session?.active || state.session?._shared || !isSourcePage()) return;
        const link = event.target.closest("a[href]");
        if (!link) return;
        const href = link.getAttribute("href") || "";
        if (href.startsWith("#")) return;
        if (href.startsWith("javascript:")) return;
        if (link.target === "_blank" || link.getAttribute("data-ice-guard-skip") === "1") return;
        event.preventDefault();
        event.stopPropagation();
        const candle = state.session?.theme === "candle";
        const title = link.textContent?.trim().slice(0, 30) || "该页面";
        const msg = candle
          ? `蜡烛还没熄灭。跳转至「${title}」会中断当前学习，确定要离开吗？`
          : `冰块正在融化中。跳转至「${title}」会中断当前学习，确定要离开吗？`;
        if (confirm(msg)) endSessionAndNavigate(link.href);
      }, true);
    }

    // 拦截 SPA 的 history.pushState（pathname 变化 = 页面导航）。
    // 同样只 patch 一次：重复 patch 会嵌套多层包装，一次 pushState 弹多个 confirm。
    if (!window.__ICE_SOURCE_PUSHSTATE_PATCHED__) {
      window.__ICE_SOURCE_PUSHSTATE_PATCHED__ = true;
      const originalPushState = history.pushState;
      history.pushState = function(...args) {
        const url = args[2];
        if (state.session?.active && !state.session?._shared && isSourcePage() && url) {
          const newUrl = new URL(url, location.href);
          if (newUrl.pathname !== location.pathname) {
            const candle = state.session?.theme === "candle";
            const msg = candle
              ? "蜡烛还没熄灭。离开当前页面会中断学习，确定要继续吗？"
              : "冰块正在融化中。离开当前页面会中断学习，确定要继续吗？";
            if (confirm(msg)) { endSessionAndNavigate(newUrl.href); return; }
            return; // 用户取消，阻止导航
          }
        }
        return originalPushState.apply(this, args);
      };
    }
  }

  async function generateRecommendations(goal) {
    if (typeof LLMBridge === "undefined" || typeof LLMBridge.chat !== "function") return null;
    try {
      const prompt = `学习者刚刚完成了"${goal}"的学习。请推荐 2-3 个相关的延伸学习方向或关联主题。每个推荐包含：标题（≤12字）和一句话描述（≤30字）。只输出 JSON：{"recommendations":[{"title":"...","description":"..."}]}`;
      const text = await LLMBridge.chat(prompt, "json");
      const data = parseLooseJson(text);
      const list = Array.isArray(data) ? data : (data?.recommendations || []);
      return list.filter((r) => r && typeof r.title === "string" && typeof r.description === "string").slice(0, 3);
    } catch (_) { return null; }
  }

  function showRecommendationToast(recs, goal, theme) {
    if (!recs?.length) return;
    const candle = theme === "candle";
    const toast = el("div", { class: "ice-ui ice-rec-toast" });
    const items = recs.map((r) => `<div class="ice-rec-item"><b>${escapeHtml(r.title)}</b><span>${escapeHtml(r.description)}</span></div>`).join("");
    toast.innerHTML = `<div class="ice-rec-head">${candle ? "🔥" : "❄"} 学完「${escapeHtml(goal.slice(0, 20))}」，为你推荐</div>${items}`;
    document.body.append(toast);
    requestAnimationFrame(() => toast.classList.add("is-visible"));
    const remove = () => { toast.classList.remove("is-visible"); setTimeout(() => toast.remove(), 400); };
    toast.addEventListener("click", remove);
    setTimeout(remove, 10000);
  }

  function statusBadge() {
    let badge = document.getElementById("ice-status");
    if (!badge) {
      badge = el("button", { id: "ice-status", class: "ice-ui ice-fab ice-status", type: "button", title: "打开知识检查（可拖动，双击回到右上角）" });
      badge.append(state.session?.theme === "candle" ? iceFlameIcon() : iceSnowIcon(), el("span", { class: "ice-status-text" }), el("span", { class: "ice-status-bar" }));
      badge.onclick = () => { if (!wasFloatDragged(badge)) showQuiz(); };
      document.body.append(badge);
      attachFloatClose(badge);
      enableFloatZoom(badge);
      if (CONFIG.floatDraggable) enableFloatDrag(badge);
    }
    const melt = Math.max(0, Math.min(100, Math.round(state.session.melt || 0)));
    badge.querySelector(".ice-status-text").textContent = state.quizPreparing ? "正在生成知识检查…" : state.session?.theme === "candle" ? `已点亮 ${melt}%　要来试下吹灭不？` : `已融化 ${melt}%　要来试下加速不？`;
    badge.classList.toggle("is-candle", state.session?.theme === "candle");
    const bar = badge.querySelector(".ice-status-bar");
    bar.classList.toggle("is-candle", state.session?.theme === "candle");
    bar.style.width = `${melt}%`;
    bar.classList.toggle("is-full", melt >= 67);
  }

  async function syncReading(completion = state.readingSeen) {
    if (!state.session?.active || !isSourcePage()) return;
    if (completion <= (state.session.completion || 0) + 4) return;
    state.session = await api("/session/progress", { method: "POST", body: { completion, mastery: state.session.mastery || 0 } });
    statusBadge();
    if (completion >= 40 && !state.quizSet) prepareQuizSet();
  }

  function observeReading() {
    const chunks = [...document.querySelectorAll("main h1, main h2, main p, main pre, article h1, article h2, article p, article pre")].filter((node) => !node.closest(".ice-ui"));
    if (!chunks.length || !window.IntersectionObserver) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const index = chunks.indexOf(entry.target) + 1;
        state.readingSeen = Math.max(state.readingSeen, Math.round(index / chunks.length * 100));
      });
      syncReading();
    }, { rootMargin: "0px 0px -18% 0px", threshold: .55 });
    chunks.forEach((chunk) => observer.observe(chunk));
  }

  function observeVideo() {
    const attach = (video) => {
      if (video.dataset.iceStudyObserved) return;
      video.dataset.iceStudyObserved = "1";
      const update = () => {
        if (!Number.isFinite(video.duration) || video.duration <= 0) return;
        state.videoSeen = Math.max(state.videoSeen, Math.round(video.currentTime / video.duration * 100));
        syncReading(Math.max(state.readingSeen, state.videoSeen)).catch(() => {});
      };
      video.addEventListener("timeupdate", update, { passive: true });
      video.addEventListener("seeked", update, { passive: true });
    };
    document.querySelectorAll("video").forEach(attach);
    new MutationObserver(() => document.querySelectorAll("video").forEach(attach))
      .observe(document.documentElement, { subtree: true, childList: true });
  }

  // —— 冰封装饰 · 搜索结果卡片：给页面里每条搜索结果的标题加冰蓝边框 + 雪花角标 ——
  // 仅在学习任务生效（active 且未完成 unlock）时挂上，解除学习时自动卸掉。
  // 不能改标题文字本身（改了用户就点不到搜索结果了），只装饰外观。
  // 各家搜索引擎「一条结果」的容器类名，用于从标题往上找整条卡片
  const ICE_RESULT_CONTAINERS = [
    ".c-container", ".result-op", ".c-result", ".result",
    ".tF2Cxc", ".Ww4FFb", ".MjjYud", ".g",
    ".b_algo", ".b_result",
    "[data-testid*='result']", "[class*='result']", "[class*='Result']"
  ];

  // 从标题往上找最近的「结果卡片」容器（最多爬 8 层，避免爬到整个页面）
  function iceFindResultCard(title) {
    let node = title.parentElement;
    for (let depth = 0; node && depth < 8; depth += 1) {
      if (node === document.body || node === document.documentElement) break;
      const rect = node.getBoundingClientRect();
      // 容器太矮说明不是卡片（比如只包标题的 span）
      if (rect.height < 40) { node = node.parentElement; continue; }
      if (ICE_RESULT_CONTAINERS.some((selector) => {
        try { return node.matches(selector); } catch (_) { return false; }
      })) return node;
      node = node.parentElement;
    }
    return title.parentElement;
  }

  // 给卡片里「原有的角标」（favicon / 来源小图标）套一层冰封描边，不换图、不加新图标
  function iceIceBadges(card) {
    const candidates = card.querySelectorAll("img, svg, [class*='favicon'], [class*='icon'], [class*='logo'], [class*='source']");
    let iced = 0;
    for (const badge of candidates) {
      if (iced >= 2) break;
      if (badge.closest(".ice-ui")) continue;
      const rect = badge.getBoundingClientRect();
      // 只挑真正的小角标（6~44px），大图/截图/视频封面不碰
      if (rect.width < 6 || rect.width > 44 || rect.height < 6 || rect.height > 44) continue;
      if (badge.dataset.iceBadge) continue;
      badge.dataset.iceBadge = "1";
      badge.classList.add("ice-badge-iced");
      badge.classList.toggle("is-candle", state.session?.theme === "candle");
      iced += 1;
    }
  }

  function iceScanResultDecos() {
    const titles = document.querySelectorAll("a h2, a h3");
    let added = 0;
    for (const title of titles) {
      if (added > 40) break;
      if (title.closest(".ice-ui")) continue;
      // 排除导航栏、页脚等位置的标题
      if (title.closest("nav, header, aside, footer, [role='navigation'], [role='search']")) continue;
      // 搜索结果的标题一般在页面中段，跳过页面顶部 240px 内的（让顶部功能区保持原样）
      const rect = title.getBoundingClientRect();
      if (rect.top < 240 && rect.bottom < 240) continue;
      const link = title.closest("a");
      if (!link || !link.isConnected) continue;
      // 装饰整条结果卡片（而不是只描标题），找不到容器时退回标题所在层
      const card = iceFindResultCard(title);
      if (!card || !card.isConnected || card.dataset.iceDeco) continue;
      card.dataset.iceDeco = "1";
      card.classList.add("ice-result-deco");
      card.classList.toggle("is-candle", state.session?.theme === "candle");
      iceIceBadges(card);
      added += 1;
    }
  }

  function iceClearResultDecos() {
    const cards = document.querySelectorAll(".ice-result-deco");
    if (!cards.length) return;
    cards.forEach((card) => {
      card.classList.remove("ice-result-deco", "is-candle");
      delete card.dataset.iceDeco;
    });
    const badges = document.querySelectorAll(".ice-badge-iced");
    badges.forEach((badge) => {
      badge.classList.remove("ice-badge-iced", "is-candle");
      delete badge.dataset.iceBadge;
    });
  }

  function mountResultDeco() {
    const shouldShow = !!(state.session?.active && !state.session?.unlocked);
    if (!shouldShow) { iceClearResultDecos(); return; }
    iceScanResultDecos();
  }

  let _iceDecoScanTimer = null;
  function iceScheduleDecoScan() {
    if (_iceDecoScanTimer) return;
    _iceDecoScanTimer = setTimeout(() => {
      _iceDecoScanTimer = null;
      // 只在可视窗口做了滚动的近 1.5 秒后再扫描一次，避免无谓开销
      if (document.visibilityState === "visible") mountResultDeco();
    }, 280);
  }

  function observeResultDeco() {
    new MutationObserver(iceScheduleDecoScan).observe(document.documentElement, { subtree: true, childList: true });
  }

  // —— Tabbit 内置 AI（LLMBridge）本地出题 ——
  // 在妙招环境里 LLMBridge 是浏览器注入的全局对象，走本地推理，不依赖云上 LLM 配置。
  // 只负责「生成」，答案校验/判卷仍由后端做；后端 generate-set 收到 source=local 时
  // 直接走与云上出题一致的出口复核（evidence 原文比对 + 格式校验 + 去重），不调云端模型。
  // 模型返回可能是纯 JSON 字符串 / 已解析对象 / markdown code fence / 单题对象，统一兜底。
  function parseLooseJson(text) {
    if (text == null) return null;
    if (typeof text === "object") {
      if (Array.isArray(text)) return text;
      if (Array.isArray(text.questions)) return text.questions;
      if (Array.isArray(text.quizzes)) return text.quizzes;
      return [text];
    }
    let source = String(text).trim();
    const fence = source.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) source = fence[1].trim();
    const first = source.search(/[[{]/);
    const last = Math.max(source.lastIndexOf("]"), source.lastIndexOf("}"));
    if (first < 0 || last <= first) return null;
    try {
      const data = JSON.parse(source.slice(first, last + 1));
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.questions)) return data.questions;
      if (data && Array.isArray(data.quizzes)) return data.quizzes;
      if (data && typeof data === "object") return [data];
    } catch (_) { /* fallthrough */ }
    return null;
  }

  // 用 LLMBridge 生成一组题。返回 { quizzes: [...] } 或 null（LLMBridge 不可用 / 生成失败）。
  // 提示词规则与后端 quizSetSystemPrompt 对齐：题量区间、三种题型、evidence 逐字复制原文、
  // options 不带编号前缀、answer 填字母/标准答案字符串。
  async function generateQuizzesLocally(material, goal, min, max) {
    if (typeof LLMBridge === "undefined" || typeof LLMBridge.chat !== "function") return null;
    const prompt = [
      "根据完整材料生成一组中文学习题，题型自由搭配（每题都要填 type 字段）。",
      `题量由你判断：最少 ${min} 道、最多 ${max} 道，具体几道取决于材料能拆出多少个互相独立的知识点。`,
      "材料短、知识点少就出 2 道；信息密集就出到上限。宁可少出，不要凑数。",
      "只输出 JSON，格式：{\"questions\":[...]}，数组里每题字段：type、question、options、answer、concept、evidence、difficulty。",
      "三种题型：",
      "1) type=\"mcq\"：options 2-4 个，answer 是对应正确选项的字母 A/B/C/D。所有选项必须严格互斥（不能有包含、重叠或子集关系）。",
      "2) type=\"truefalse\"：options 固定为 [\"正确\",\"错误\"]，answer 是 A（正确）或 B（错误）。",
      "3) type=\"fill\"：answer 是 1-20 个字符的标准答案（用户填写会归一化后精确匹配）。",
      "硬性要求：",
      "- options 里只写选项内容本身，绝对不要带 A. / B、/ (C) / ① 这类编号前缀，界面会自动加编号",
      "- 每题答案必须唯一、由该题的 evidence 直接支持，不得使用材料外知识",
      "- evidence 必须是材料里一段连续的原文（≥ 5 字符），逐字复制，不要改写、不要增删字、不要用自己的话概括",
      "- 每题考不同的知识点，question 不要重复 evidence，不要给出答案线索",
      "- 严禁出题干或选项里包含开玩笑、活跃气氛、无实质考查价值的内容；每道题必须针对一个明确的知识点，question 和 options 都要严肃、有考查意义",
      `学习目标：${goal}`,
      `材料：\n${material}`
    ].join("\n");
    try {
      const text = await LLMBridge.chat(prompt, "json");
      const list = parseLooseJson(text);
      if (!Array.isArray(list) || !list.length) return null;
      const quizzes = list
        .filter((item) => item && typeof item === "object" && item.question)
        .map((item) => ({
          type: ["mcq", "truefalse", "fill"].includes(item.type) ? item.type : "mcq",
          question: String(item.question || "").trim(),
          options: Array.isArray(item.options) ? item.options.map((o) => String(o).trim()) : [],
          answer: String(item.answer ?? "").trim(),
          concept: String(item.concept || "").trim(),
          evidence: String(item.evidence || "").trim(),
          difficulty: String(item.difficulty || "").trim()
        }))
        .slice(0, max);
      return quizzes.length ? { quizzes } : null;
    } catch (_) {
      return null; // LLMBridge 报错 → 回退云上出题
    }
  }

  // 一次准备一组题（默认 4 道）：先整组生成，再整组独立校验，只保留通过校验的题
  async function prepareQuizSet() {
    if (state.quizSet) return state.quizSet;
    if (state.quizSetPreparing) return state.quizSetPreparing;
    state.quizSetPreparing = (async () => {
      statusBadge();
      if (CONFIG.demoMode) {
        state.quizSet = {
          setId: "demo-set",
          verifiedBy: "demo",
          quizzes: [
            { quizId: "demo-1", type: "mcq", question: "这是黑客松演示题：ice-study 主要帮你做什么？", options: ["专注学习并检查掌握", "随机播放音乐", "自动购物"], answer: "A" }
          ]
        };
        state.quiz = { ...state.quizSet.quizzes[0] };
        state.quizSetError = "";
        return state.quizSet;
      }
      const material = await learningMaterial();
      let lastError = "";
      for (let attempt = 0; attempt < 2 && !state.quizSet; attempt += 1) {
        // 题目全部由 AI 出。AI 出不来就记下原因让界面显示，不再用本地题顶上。
        try {
          // 优先用 Tabbit 内置 AI（LLMBridge）在本地出题，不依赖云上 LLM 配置；
          // LLMBridge 不存在或出题失败时回退云上路径（旧行为不变）。
          const local = await generateQuizzesLocally(material, state.session.goal, CONFIG.quizMinCount, CONFIG.quizMaxCount);
          const body = local
            ? { material, goal: state.session.goal, min: CONFIG.quizMinCount, max: CONFIG.quizMaxCount, source: "local", quizzes: local.quizzes }
            : { material, goal: state.session.goal, min: CONFIG.quizMinCount, max: CONFIG.quizMaxCount, exclude: state.quizExclude };
          const generated = await api("/quiz/generate-set", {
            method: "POST", attempts: 2, timeout: 30000,
            body
          });
          const verified = await api("/quiz/verify-set", { method: "POST", attempts: 2, timeout: 30000, body: { setId: generated.setId } });
          const allowed = new Set(verified.quizIds || []);
          const quizzes = (generated.quizzes || []).filter((quiz) => allowed.has(quiz.quizId));
          if (!quizzes.length) { lastError = "AI 出的题没有通过复核"; continue; }
          state.quizSet = {
            setId: generated.setId,
            verifiedBy: verified.verifiedBy,
            quizzes: quizzes.map((quiz) => ({
              ...quiz,
              options: Array.isArray(quiz.options) ? quiz.options.map(stripOptionLabel) : quiz.options
            }))
          };
          // 状态徽标仍复用旧的 state.quiz 字段，指向本组第一题
          state.quiz = { ...state.quizSet.quizzes[0] };
        } catch (error) {
          lastError = String(error?.message || "");
        }
      }
      state.quizSetError = state.quizSet ? "" : (lastError || "AI 出题服务暂时不可用");
      return state.quizSet;
    })().catch(() => null).finally(() => { state.quizSetPreparing = null; statusBadge(); });
    return state.quizSetPreparing;
  }

  async function showQuiz() {
    document.getElementById("ice-quiz")?.remove();
    const modal = el("div", { id: "ice-quiz", class: "ice-ui ice-quiz" });
    let quizLoadingTimer = null;   // 出题等待动画的定时器，所有渲染分支都要清理它
    const renderLoading = () => {
      clearInterval(quizLoadingTimer);
      // 「…」逐点增长 + 阶段文案轮换，让用户明确看到出题在推进而不是卡死
      const dots = el("span", { class: "ice-loading-dots" }, "…");
      const step = el("span", { class: "ice-loading-step" }, "AI 正在阅读学习材料");
      const steps = ["AI 正在阅读学习材料", "正在生成题目", "正在复核题目", "正在校验格式"];
      let stepIndex = 0, dotCount = 1;
      quizLoadingTimer = setInterval(() => {
        if (!modal.isConnected) { clearInterval(quizLoadingTimer); return; }
        dotCount = dotCount >= 4 ? 0 : dotCount + 1;
        if (dotCount === 0) { stepIndex = (stepIndex + 1) % steps.length; step.textContent = steps[stepIndex]; }
        dots.textContent = "…".repeat(dotCount || 1);
      }, 400);
      modal.replaceChildren(el("div", { class: "ice-quiz-card", role: "dialog", "aria-modal": "true", "aria-live": "polite" }, [
        el("div", { class: "ice-kicker" }, "知识检查"),
        el("h2", {}, ["正在生成并校验题目", dots]),
        el("div", { class: "ice-loading" }, [
          el("span", { class: "ice-loading-cube" }), el("span", { class: "ice-loading-cube" }), el("span", { class: "ice-loading-cube" }),
          step
        ]),
        el("div", { class: "ice-feedback" }, "题目只会基于你已经学习的材料。"),
        el("div", { class: "ice-actions" }, el("button", { class: "ice-btn ice-btn-ghost", type: "button", "data-ice-action": "close-quiz" }, "继续学习"))
      ]));
    };
    const renderError = () => {
      clearInterval(quizLoadingTimer);
      modal.replaceChildren(el("div", { class: "ice-quiz-card", role: "dialog", "aria-modal": "true" }, [
      el("div", { class: "ice-kicker" }, "知识检查"), el("h2", {}, "这次没能出出题"),
      el("div", { class: "ice-feedback", role: "status" }, state.quizSetError || "AI 出题服务暂时不可用。"),
      el("div", { class: "ice-feedback", role: "status" }, "题目只由 AI 根据材料生成，不会用凑数的本地题代替。稍等一会儿重试通常就能好。"),
      el("div", { class: "ice-actions" }, [el("button", { class: "ice-btn ice-btn-ghost", type: "button", "data-ice-action": "close-quiz" }, "继续学习"), el("button", { class: "ice-btn ice-btn-primary", type: "button", "data-ice-action": "retry-quiz" }, "重试")])
    ]));
    };
    const typeOf = (quiz) => (quiz?.type === "truefalse" ? "truefalse" : quiz?.type === "fill" ? "fill" : "mcq");
    const typeKicker = (type) => (type === "truefalse" ? "判断题" : type === "fill" ? "填空题" : "选择题");

    // 一屏列出整组题，全部答完再一起提交；必须全对才算通过
    const renderPaper = (set) => {
      clearInterval(quizLoadingTimer);
      const children = [el("div", { class: "ice-kicker" }, `知识检查　共 ${set.quizzes.length} 题`)];
      children.push(el("h2", {}, "全部答对才算通过"));
      if (state.videoPageNoTranscript) children.push(el("div", { class: "ice-degraded", role: "status" }, "没读到这个视频的内容（该视频没有可用字幕），题目只能基于页面标题和简介生成。换一个带字幕的视频会更准。"));
      const paper = el("div", { class: "ice-paper" });
      set.quizzes.forEach((quiz, index) => {
        const type = typeOf(quiz);
        const item = el("div", { class: "ice-q", "data-quiz-id": quiz.quizId, "data-type": type });
        item.append(el("div", { class: "ice-q-title" }, [`${index + 1}.`, el("span", { class: "ice-q-type" }, typeKicker(type))]));
        item.append(el("p", { class: "ice-q-text" }, quiz.question));
        if (type === "fill") {
          item.append(el("div", { class: "ice-fill-row" }, el("input", { type: "text", class: "ice-fill-input", placeholder: "在此输入答案…", "aria-label": `第 ${index + 1} 题答案`, autocomplete: "off" })));
        } else {
          const options = el("div", { class: "ice-options" });
          (quiz.options || []).forEach((raw, position) => {
            const letter = String.fromCharCode(65 + position);
            options.append(el("button", { class: "ice-option", type: "button", "data-ice-action": "pick", "data-answer": letter }, [el("b", {}, letter), el("span", {}, stripOptionLabel(raw))]));
          });
          item.append(options);
        }
        item.append(el("div", { class: "ice-q-note", role: "status" }));
        paper.append(item);
      });
      children.push(paper);
      children.push(el("div", { class: "ice-feedback", role: "status" }));
      const actions = [
        el("button", { class: "ice-btn ice-btn-ghost", type: "button", "data-ice-action": "close-quiz" }, "继续学习"),
        el("button", { class: "ice-btn ice-btn-primary", type: "button", "data-ice-action": "submit-set" }, "提交答案")
      ];
      if (CONFIG.demoMode) actions.push(el("button", { class: "ice-btn ice-btn-primary", type: "button", "data-ice-action": "demo-pass" }, "演示通过"));
      children.push(el("div", { class: "ice-actions" }, actions));
      modal.replaceChildren(el("div", { class: "ice-quiz-card", role: "dialog", "aria-modal": "true" }, children));
      const firstInput = modal.querySelector(".ice-fill-input");
      if (firstInput) firstInput.focus();
    };

    const collectAnswers = () => {
      const answers = [];
      let unanswered = 0;
      modal.querySelectorAll(".ice-q").forEach((item) => {
        const quizId = item.dataset.quizId;
        if (item.dataset.type === "fill") {
          const value = (item.querySelector(".ice-fill-input")?.value || "").trim();
          if (!value) unanswered += 1;
          answers.push({ quizId, answer: value });
        } else {
          const picked = item.querySelector(".ice-option.is-picked");
          if (!picked) unanswered += 1;
          answers.push({ quizId, answer: picked?.dataset.answer || "" });
        }
      });
      return { answers, unanswered };
    };

    const renderResult = (grade) => {
      const byId = new Map(grade.results.map((row) => [row.quizId, row]));
      modal.querySelectorAll(".ice-q").forEach((item) => {
        const row = byId.get(item.dataset.quizId);
        if (!row) return;
        item.classList.toggle("is-right", row.correct);
        item.classList.toggle("is-wrong", !row.correct);
        const note = item.querySelector(".ice-q-note");
        if (row.type === "fill") {
          const input = item.querySelector(".ice-fill-input");
          if (input) { input.disabled = true; input.classList.add(row.correct ? "is-right" : "is-wrong"); }
          if (note) {
            note.textContent = row.correct
              ? "答对了。"
              : `你填的是「${row.userLabel || "空"}」，正确答案是「${row.correctLabel}」。`;
          }
        } else {
          item.querySelectorAll(".ice-option").forEach((button) => {
            button.disabled = true;
            if (button.dataset.answer === row.correctAnswer) button.classList.add("is-right");
            else if (button.dataset.answer === row.userAnswer) button.classList.add("is-wrong");
          });
          if (note) {
            note.textContent = row.correct
              ? "答对了。"
              : `你选了 ${row.userAnswer || "—"}（${row.userLabel}），正确答案是 ${row.correctAnswer}（${row.correctLabel}）。`;
          }
        }
      });
      const feedback = modal.querySelector(".ice-feedback");
      const actions = modal.querySelector(".ice-actions");
      if (actions) {
        actions.replaceChildren(el("button", { class: "ice-btn ice-btn-ghost", type: "button", "data-ice-action": "close-quiz" }, "继续学习"));
        if (!grade.allCorrect) actions.append(el("button", { class: "ice-btn ice-btn-primary", type: "button", "data-ice-action": "new-set" }, "换一组新题重来"));
      }
      if (!grade.allCorrect) {
        if (feedback) feedback.textContent = `答对 ${grade.correctCount}/${grade.total} 题，需要全部答对。这一组作废，换一组新题重来。`;
        return;
      }
      if (feedback) feedback.textContent = state.session?.theme === "candle" ? "全部答对。烛火越烧越旺。" : "全部答对。冰层正在加速融化。";
    };
    modal.addEventListener("click", async (event) => {
      const target = event.target.closest("[data-ice-action]");
      if (!target || !modal.contains(target)) return;
      const action = target.dataset.iceAction;
      if (action === "close-quiz") {
        // 关闭检查点 = 放弃本次检查：把已出的题记入排除列表并清掉缓存，
        // 下次再打开检查点会重新出题，而不是复用同一组原题。
        if (state.quizSet) {
          state.quizExclude = [...state.quizExclude, ...state.quizSet.quizzes.map((quiz) => quiz.question)].slice(-15);
          state.quizSet = null; state.quiz = null;
        }
        modal.remove(); clearInterval(quizLoadingTimer); return;
      }
      if (action === "retry-quiz") {
        state.quizSet = null; state.quiz = null; renderLoading();
        const set = await prepareQuizSet();
        if (set) renderPaper(set); else renderError();
        return;
      }
      // 换一组：把这一组的题干记下来，下一组不会再出重复的
      if (action === "new-set") {
        if (state.quizSet) {
          state.quizExclude = [...state.quizExclude, ...state.quizSet.quizzes.map((quiz) => quiz.question)].slice(-15);
          state.quizSet = null; state.quiz = null;
        }
        renderLoading();
        const set = await prepareQuizSet();
        if (set) renderPaper(set); else renderError();
        return;
      }
      if (action === "pick") {
        const item = target.closest(".ice-q");
        if (!item || target.disabled) return;
        item.querySelectorAll(".ice-option").forEach((button) => button.classList.remove("is-picked"));
        target.classList.add("is-picked");
        return;
      }
      if (action === "demo-pass" && CONFIG.demoMode) {
        const feedback = modal.querySelector(".ice-feedback");
        if (feedback) feedback.textContent = state.session?.theme === "candle" ? "演示模式：风吹灭烛火，本轮学习提前完成！" : "演示模式：冰块完全融化，本轮学习提前完成！";
        state.session = Object.assign({}, state.session, { completion: 100, mastery: 100, melt: 100 });
        statusBadge();
        setTimeout(() => finalMelt(modal), 700);
        return;
      }
      if (action !== "submit-set" || target.disabled || !state.quizSet) return;
      const feedback = modal.querySelector(".ice-feedback");
      const { answers, unanswered } = collectAnswers();
      if (unanswered > 0) { if (feedback) feedback.textContent = `还有 ${unanswered} 题没有作答。`; return; }
      modal.querySelectorAll(".ice-option, .ice-fill-input, [data-ice-action='submit-set']").forEach((node) => { node.disabled = true; });
      if (feedback) feedback.textContent = "正在判卷…";
      try {
        const grade = await api("/quiz/grade-set", { method: "POST", attempts: 2, timeout: 30000, body: { setId: state.quizSet.setId, answers } });
        renderResult(grade);
        if (!grade.allCorrect) return;
        state.session = await api("/session/progress", { method: "POST", body: { completion: Math.max(85, state.session.completion), mastery: 100 } });
        statusBadge();
        // 答对题 = 提前完成：不再等待自然时间，直接进入完成动画
        if (modal.querySelector(".ice-feedback")) modal.querySelector(".ice-feedback").textContent = state.session?.theme === "candle" ? "全部答对。风吹灭烛火，本轮学习提前完成！" : "全部答对。冰块完全融化，本轮学习提前完成！";
        setTimeout(() => finalMelt(modal), 1500);
      } catch (error) {
        if (feedback) feedback.textContent = `${error.message}。请重试。`;
        modal.querySelectorAll(".ice-option, .ice-fill-input, [data-ice-action='submit-set']").forEach((node) => { node.disabled = false; });
      }
    });
    modal.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      const input = event.target.closest(".ice-fill-input");
      if (!input) return;
      event.preventDefault();
      modal.querySelector("[data-ice-action='submit-set']")?.click();
    });
    document.body.append(modal); renderLoading();
    const ready = state.quizSet || await prepareQuizSet();
    if (ready) renderPaper(ready); else renderError();
  }

  // 学习完成庆祝层（专用覆盖层，不复用 freeze 的跨 Tab 界面，避免「结束学习会话」/「返回学习页面」按钮露出）。
// 节奏：modal 移除 → 庆祝层淡入（600ms） → 文案入场动画 + 蜡烛熄灭/冰块融化 → 动画播完（3500ms）→ 显示「完成 ✓」按钮 +
// 整个遮罩可点击关闭，等用户主动点击。
async function finalMelt(modal) {
    modal.remove();
    document.getElementById("ice-fab")?.remove();
    document.getElementById("ice-status")?.remove();
    const goal = state.session?.goal;
    const theme = state.session?.theme;
    const candle = theme === "candle";
    const overlay = el("div", { id: "ice-celebrate", class: `ice-ui ice-celebrate${candle ? " is-candle" : ""}` });
    overlay.innerHTML = `
      <canvas class="ice-canvas" aria-hidden="true"></canvas>
      <div class="ice-candle-stage" aria-hidden="true"><div class="ice-candle"></div><div class="ice-wick"></div><div class="ice-flame"></div></div>
      <div class="ice-cup-stage" aria-hidden="true"><div class="ice-cup"><div class="ice-cup-water"></div><i class="ice-cube"></i><i class="ice-cube"></i><i class="ice-cube"></i><i class="ice-cube"></i><i class="ice-cube"></i><i class="ice-cup-drop"></i><i class="ice-cup-drop"></i><i class="ice-cup-drop"></i></div></div>
      <button type="button" class="ice-ui ice-fab ice-celebrate-close${candle ? " is-candle" : ""}" hidden>${candle ? "🔥" : "❄"} 完成 ✓</button>
      <div class="ice-celebrate-card">
        <div class="ice-kicker">${candle ? "学到蜡烛熄灭" : "学到冰块融化"}</div>
        <h1>你学会了</h1>
        <p>${candle ? "风吹灭烛火，本轮专注已经留下标记。" : "杯中的冰完全融化，本轮学习已经留下标记。"}</p>
      </div>`;
    // 庆祝页 overlay 同样挂到 documentElement，避免被 SPA 清理 body 时连带删除
    document.documentElement.append(overlay);
    state.blocked = true;
    // 冰杯/蜡烛均由 CSS stage 呈现（--ice-progress → 1：冰块消失、水位升满），不再用 canvas 渲染器
    const renderer = null;
    // 等一会儿再点燃熄灭：让用户先看清「全部答对」反馈，再缓缓进庆祝层
    await wait(600);
    overlay.classList.add("is-final");
    renderer?.complete?.();
    try { await api("/session/complete", { method: "POST" }); } catch (_) { /* 网络失败也不阻塞庆祝结束 */ }
    // 完成任务也发送明确结束信号。冻结页不再把「记录被清空」或心跳超时当作解锁依据。
    share.write({ active: false, updatedAt: Date.now() });
    // 庆祝展示 3.5s（覆盖 1.35s 熄灭/融化动画 + 烟雾飘散），然后显示关闭按钮，整个覆盖层也支持点击关闭
    await wait(3500);
    document.getElementById("ice-fab")?.remove();
    document.getElementById("ice-status")?.remove();
    const closeBtn = overlay.querySelector(".ice-celebrate-close");
    let dismissed = false;
    const dismiss = () => {
      if (dismissed) return; dismissed = true;
      state.session = null;
      overlay.remove();
      renderer?.destroy?.();
      state.blocked = false;
      document.getElementById("ice-status")?.remove();
      showFab();
      if (goal) generateRecommendations(goal).then((recs) => { if (recs?.length) showRecommendationToast(recs, goal, theme); });
    };
    if (closeBtn) { closeBtn.hidden = false; closeBtn.onclick = (e) => { e.stopPropagation(); dismiss(); }; }
    overlay.style.cursor = "default";
    overlay.tabIndex = -1;
    overlay.onkeydown = (event) => { if (event.key === "Enter" || event.key === "Escape" || event.key === " ") dismiss(); };
    overlay.focus();
  }

  // 收到「别的 Tab 在学习」的共享广播后立即冻结（不依赖网络轮询）。
  // 解决：后台 Tab 的定时器会被浏览器节流，轮询可能迟迟不跑，
  // 导致「学习模式开启前就打开的 Tab」永远不会被冰封。
  // 源标签页广播了结束信号（active:false）或共享被清除 → 本冻结 Tab 立即清理解锁
  function handleSharedEnd() {
    if (!state.session?._shared) return;
    stopFrozenSync(); stopFreezeGuard();
    frozenRoot = null; inactiveStreak = 0;
    state.session = null; state.sourceGuardActive = false; state.generatedQuote = null; state.relaxedPass = "";
    unfreeze(); document.getElementById("ice-status")?.remove(); showFab();
  }

  function applySharedFreeze(shared) {
    if (isSourcePage() || location.origin === new URL(CONFIG.api).origin) return;  // 学习源 / API 页不冻
    if (shared && shared.active === false) { handleSharedEnd(); return; }          // 收到明确的结束信号
    if (document.getElementById("ice-freeze")) return;                             // 已冻，跳过
    if (state.session?.active) return;                                            // 本 Tab 自己正在学
    if (state.relaxedPass === location.href) return;                              // 宽松模式已判定本页相关，不反复冻结
    // 用共享会话数据构造一个只读 session；_shared 标记防止它被当成学习源页广播
    // （遮罩已被 SPA 删除且未被守卫补回时，这里重新 freeze 会走「补回原节点」分支，不重建）
    state.session = {
      active: true,
      melt: Number(shared.melt) || 0,
      sourceUrl: shared.url || location.href,
      sourceTitle: shared.title || "正在学习的页面",
      theme: shared.theme === "candle" ? "candle" : "ice",
      _shared: true,
      _sourceTabId: shared.tabId ?? null
    };
    freeze();
    if (!CONFIG.strictFreeze) {
      // 宽松模式：异步判断内容是否与学习主题直接相关，相关才放行；严格模式保持冻结
      classify().catch(() => false).then((relevant) => {
        if (relevant && document.getElementById("ice-freeze")) { unfreeze(); statusBadge(); state.relaxedPass = location.href; }
      });
    }
  }

  async function attachLearningMode() {
    // 并发去重：SPA 高频触发时共用同一次执行，避免遮罩被反复 mount/unmount
    if (state.attachInFlight) return state.attachInFlight;
    state.attachInFlight = (async () => {
      if (isSourcePage() || location.origin === new URL(CONFIG.api).origin) {
        unfreeze(); setupSourcePageGuard(); statusBadge(); await syncReading(); return;
      }
      freeze();
      if (!CONFIG.strictFreeze) {
        // 宽松模式才做内容相关性放行；严格模式下除学习源页面外一律冻结
        const relevant = await classify().catch(() => false);
        if (relevant && document.getElementById("ice-freeze")) { unfreeze(); statusBadge(); state.relaxedPass = location.href; }
      }
    })();
    try { return await state.attachInFlight; } finally { state.attachInFlight = null; }
  }

  async function syncSession(force = false) {
    // 共享冻结页只服从源标签页的共享心跳。若继续读取当前域名的 /session，
    // 会形成「inactive 解锁 → 源页心跳再冻结」的遮罩开关循环。
    if (state.session?._shared) {
      const shared = readSharedSession();
      if (shared && shared.active !== false) {
        state.session = Object.assign({}, state.session, shared, {
          active: true, _shared: true,
          melt: Number(shared.melt) || 0,
          sourceUrl: shared.url || state.session.sourceUrl,
          sourceTitle: shared.title || state.session.sourceTitle,
          _sourceTabId: shared.tabId ?? state.session._sourceTabId
        });
        if (!document.getElementById("ice-freeze")) reattachFrozenRoot();
        updateIce(state.session.melt);
      }
      return state.session;
    }
    const now = Date.now();
    if (!force && now - state.lastSessionSync < 800) return state.session;
    if (state.sessionSyncing) return state.sessionSyncing;
    state.lastSessionSync = now;
    state.sessionSyncing = (async () => {
      const wasActive = Boolean(state.session?.active);
      let latest = await api("/session");
      // 合法性检查：非 boolean active 的响应不能当成「会话已结束」，保持现状等下轮
      if (!latest || typeof latest.active !== "boolean") latest = state.session;
      else if (!latest.active && !isSourcePage() && location.origin !== new URL(CONFIG.api).origin) {
        // Tabbit 妙招环境没有 GM_*，localStorage 又按站点隔离，跨域 Tab 之间唯一可靠的信号通道是云端：
        // 自己的会话不在，且本页不是学习源页 → 查「全局活跃会话」，别的 Tab 在学习就直接跟随冻结。
        // 全局查询失败时保持现状：旧版 catch 成 {active:false}，一次网络抖动就解锁 → 广播又冻结 → 反复弹窗。
        const global = await api("/session/global").catch(() => null);
        if (global && typeof global.active === "boolean") {
          if (global.active) latest = Object.assign({}, state.session, global, { _shared: true });
          else latest = { active: false };
        } else latest = state.session;
      }
      if (latest?.active) inactiveStreak = 0;
      else if (latest && wasActive && (inactiveStreak += 1) < 2) {
        // 单次 inactive 不解锁（防假阴性抖动），保持冻结等下一轮再确认
        mountResultDeco();
        return state.session;
      }
      state.session = latest;
      if (latest?.active) {
        document.getElementById("ice-fab")?.remove();
        if (!wasActive) await attachLearningMode();
        else if (document.getElementById("ice-freeze")) updateIce(latest.melt || 0);
        else statusBadge();
      } else if (wasActive) {
        // 连续两次确认会话已结束：整组题作废，连「出过的题」一起清空，下次开新会话重新出题
        state.quiz = null; state.quizSet = null; state.quizExclude = []; state.generatedQuote = null; state.sourceGuardActive = false; state.relaxedPass = "";
        inactiveStreak = 0;
        unfreeze();
        document.getElementById("ice-status")?.remove();
        showFab();
      }
      mountResultDeco();
      return latest;
    })().finally(() => { state.sessionSyncing = null; });
    return state.sessionSyncing;
  }

  function watchActivation() {
    const sync = () => syncSession().catch(() => {});
    addEventListener("focus", sync, { passive: true });
    addEventListener("pageshow", sync, { passive: true });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") sync();
      // 切到后台前把最新进度写进共享广播：后台 Tab 的定时器会被浏览器节流（8 秒可能退化成 1 分钟
      // 一次），提前广播一次能保证其它 Tab 读到的广播始终新鲜，不会因 90 秒 TTL 过期而漏冻。
      else if (state.session?.active && isSourcePage()) syncFavicon();
    });
  }

  function startSessionWatch() {
    clearTimeout(state.sessionWatch);
    const tick = async () => {
      try { await syncSession(); } catch (_) { /* Keep watching while the cloud reconnects. */ }
      const delay = document.visibilityState !== "visible" ? 15000 : document.getElementById("ice-freeze") ? 12000 : state.session?.active ? 5000 : 12000;
      state.sessionWatch = setTimeout(tick, delay);
    };
    state.sessionWatch = setTimeout(tick, 2000);
  }

  function watchNavigation() {
    const check = () => {
      if (location.href === state.lastUrl) return;
      state.lastUrl = location.href;
      if (state.session?.active) setTimeout(attachLearningMode, 0);
      setTimeout(mountResultDeco, 80);
    };
    // 节流：SPA 页面会高频触发 pushState / DOM mutation，不能每次都直接检查，
    // 否则 attachLearningMode 反复跑、冻结遮罩被反复重建。250ms 合并一次。
    let navTimer = 0;
    const schedule = () => {
      clearTimeout(navTimer);
      navTimer = setTimeout(check, 250);
    };
    const observer = new MutationObserver((mutations) => {
      // 只有「页面自身的 DOM 变化」才重新检查导航；我们自己的 UI（遮罩/弹窗/冰杯）内部变化不算，
      // 避免自己触发自己（旧版只要任一 mutation 在 .ice-ui 内就整体忽略，页面自身变化会被误屏蔽）
      for (const mutation of mutations) {
        const node = mutation.target;
        if (!node || node.nodeType !== 1 || typeof node.closest !== "function" || !node.closest(".ice-ui")) { schedule(); return; }
      }
    });
    observer.observe(document.documentElement, { subtree: true, childList: true });
    addEventListener("popstate", schedule);
    ["pushState", "replaceState"].forEach((name) => {
      const original = history[name];
      history[name] = function (...args) { const result = original.apply(this, args); schedule(); return result; };
    });
  }

  async function boot() {
    mountStyles(); watchNavigation(); watchActivation();
    startSessionWatch();
    setupFaviconGuard();
    setupTitleGuard();
    setupSelectionExplain();
    // 共享状态广播：别的 Tab 在学习 → 立即冰封（不等轮询，后台 Tab 的定时器会被浏览器节流）
    share.listen((raw) => {
      let value = null;
      try { value = typeof raw === "string" ? JSON.parse(raw) : raw; } catch (_) { /* 广播内容异常时忽略 */ }
      if (value && typeof value.updatedAt === "number") {
        if (value.active === false) handleSharedEnd(); else applySharedFreeze(value);
      }
      syncFavicon();
    });
    // 启动时先看本地共享状态：学习模式已开启时，本 Tab（含刷新/恢复）立即冻结，不等网络返回
    const sharedAtBoot = readSharedSession();
    if (sharedAtBoot) applySharedFreeze(sharedAtBoot);
    showFab();
    try { await syncSession(true); } catch (_) { /* The local entry remains usable while the cloud reconnects. */ }
    observeReading(); observeVideo();
    syncFavicon();
    mountResultDeco(); observeResultDeco();
    // 每 8 秒同步一次：别的 Tab 关掉/会话结束后，本 Tab 能自己从冰封状态退出来
    setInterval(syncFavicon, 8000);
    // 每 6 秒跟一次会话状态，状态切换时（开始/结束/完成）及时挂卸搜索结果装饰
    setInterval(mountResultDeco, 6000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true }); else boot();
})();