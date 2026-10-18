(() => {
  "use strict";
  const HOST_ID = "nusmods-plan-workbench-host";
  const existing = document.getElementById(HOST_ID);
  if (existing) {
    existing.shadowRoot?.getElementById("npw-panel")?.classList.add("open");
    return { ok: true, summary: "NUSMods 选课方案工作台已打开。", alreadyMounted: true };
  }
  if (!/(^|\.)nusmods\.com$/i.test(location.hostname)) {
    throw new Error("请在 NUSMods 页面触发此 Skill。");
  }

  const state = {
    plans: [],
    selected: new Set(),
    agentPrompt: "",
    lastImport: null,
    observer: null,
    panelPosition: null,
    drag: null,
  };
  const host = document.createElement("div");
  host.id = HOST_ID;
  const shadow = host.attachShadow({ mode: "open" });
  document.documentElement.appendChild(host);

  window.__NUSMODS_PLAN_WORKBENCH__ = {
    getAgentPrompt: () => state.agentPrompt || buildAgentPrompt(),
    getPlans: () => structuredClone(state.plans),
    clearTimetable: () => clearCurrentTimetable(),
    applyPlan: (id) => applyPlanToTimetable(id),
    remove: cleanup,
  };

  render();
  state.observer = new MutationObserver(() => {
    const locationLabel = shadow.getElementById("npw-location");
    if (locationLabel) locationLabel.textContent = readableLocation();
  });
  state.observer.observe(document.documentElement, { childList: true, subtree: true });

  function render() {
    const compared = selectedPlans().slice(0, 2);
    shadow.innerHTML = `${styles()}
      <button id="npw-toggle" data-action="toggle" aria-label="打开选课方案工作台">方案<br>对比</button>
      <aside id="npw-panel" class="open" aria-label="NUSMods 选课方案工作台">
        <header id="npw-drag-handle"><div><strong>选课方案工作台</strong><small id="npw-location">${escapeHtml(readableLocation())}</small></div><button id="npw-close" data-action="close" aria-label="隐藏工作台">×</button></header>
        <section class="actions">
          <button data-action="import" class="primary">导入当前 timetable</button>
          <button data-action="new">新建空方案</button>
          <button data-action="clear-timetable" class="danger">清空 NUSMods 当前学期</button>
        </section>
        <section>
          <div class="section-head"><strong>我的方案</strong><span>${state.plans.length} 个</span></div>
          <div id="npw-plans">${renderPlans()}</div>
        </section>
        <section>
          <div class="section-head"><strong>对比</strong><span>勾选任意两套</span></div>
          <div id="npw-compare">${renderComparison(compared)}</div>
        </section>
        <section>
          <div class="section-head"><strong>生成 Agent 分析提示词</strong><span>选择两套方案</span></div>
          <button data-action="generate-prompt" class="primary" ${compared.length === 2 ? "" : "disabled"}>生成可发送的提示词</button>
          ${state.agentPrompt ? `<textarea id="npw-agent-prompt" readonly aria-label="Agent analysis prompt">${escapeHtml(state.agentPrompt)}</textarea><button data-action="copy-prompt" class="copy-prompt">复制提示词</button><p class="ok">复制后直接粘贴到当前 Agent 对话中即可。</p>` : ""}
        </section>
      </aside>`;
    bind();
    applyPanelPosition();
  }

  function bind() {
    if (shadow.__npwBound) return;
    shadow.__npwBound = true;
    shadow.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button || button.disabled) return;
      const id = button.dataset.id;
      if (button.dataset.action === "toggle") shadow.getElementById("npw-panel")?.classList.add("open");
      if (button.dataset.action === "close") closePanel();
      if (button.dataset.action === "import") importCurrent();
      if (button.dataset.action === "new") createEmptyPlan();
      if (button.dataset.action === "remove-plan") removePlan(id);
      if (button.dataset.action === "apply-plan") applyPlanToTimetable(id);
      if (button.dataset.action === "clear-timetable") clearCurrentTimetable();
      if (button.dataset.action === "generate-prompt") generateAgentPrompt();
      if (button.dataset.action === "copy-prompt") copyAgentPrompt();
    });
    shadow.addEventListener("change", (event) => {
      const input = event.target;
      if (!input.matches("input[data-plan]")) return;
      const id = input.dataset.plan;
      if (input.checked && state.selected.size < 2) state.selected.add(id);
      else if (input.checked) input.checked = false;
      else state.selected.delete(id);
      state.agentPrompt = "";
      render();
    });
    shadow.addEventListener("pointerdown", startDrag);
    shadow.addEventListener("pointermove", moveDrag);
    shadow.addEventListener("pointerup", endDrag);
    shadow.addEventListener("pointercancel", endDrag);
  }

  function startDrag(event) {
    const handle = event.target.closest("#npw-drag-handle");
    if (!handle || event.target.closest("button")) return;
    const panel = shadow.getElementById("npw-panel");
    if (!panel?.classList.contains("open")) return;
    const rect = panel.getBoundingClientRect();
    state.drag = { pointerId: event.pointerId, offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top };
    state.panelPosition = { left: rect.left, top: rect.top };
    handle.setPointerCapture?.(event.pointerId);
    panel.classList.add("dragging");
    event.preventDefault();
  }

  function moveDrag(event) {
    if (!state.drag || event.pointerId !== state.drag.pointerId) return;
    const panel = shadow.getElementById("npw-panel");
    if (!panel) return;
    const maxLeft = Math.max(8, window.innerWidth - panel.offsetWidth - 8);
    const maxTop = Math.max(8, window.innerHeight - Math.min(panel.offsetHeight, window.innerHeight - 16) - 8);
    state.panelPosition = {
      left: clamp(event.clientX - state.drag.offsetX, 8, maxLeft),
      top: clamp(event.clientY - state.drag.offsetY, 8, maxTop),
    };
    applyPanelPosition();
  }

  function endDrag(event) {
    if (!state.drag || event.pointerId !== state.drag.pointerId) return;
    state.drag = null;
    shadow.getElementById("npw-panel")?.classList.remove("dragging");
  }

  function closePanel() {
    state.drag = null;
    const panel = shadow.getElementById("npw-panel");
    panel?.classList.remove("dragging", "open");
  }

  function applyPanelPosition() {
    if (!state.panelPosition) return;
    const panel = shadow.getElementById("npw-panel");
    if (!panel) return;
    panel.style.right = "auto";
    panel.style.left = `${state.panelPosition.left}px`;
    panel.style.top = `${state.panelPosition.top}px`;
  }

  function importCurrent() {
    const imported = readCurrentTimetable();
    if (!imported.modules.length) {
      state.lastImport = "没有读取到课程。请先在 NUSMods timetable 中加入课程，或打开包含课程的 share 链接后重试。";
      render();
      return;
    }
    const plan = {
      id: makeId(),
      name: `当前 timetable · ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
      source: imported.source,
      semester: imported.semester,
      modules: imported.modules,
      createdAt: new Date().toISOString(),
    };
    state.plans.push(plan);
    state.lastImport = `已导入 ${plan.modules.length} 门课（${sourceLabel(plan.source)}）。`;
    state.agentPrompt = "";
    render();
  }

  function createEmptyPlan() {
    const name = window.prompt("方案名称（例如：轻松学期 / 主选方案）", `方案 ${state.plans.length + 1}`);
    if (!name) return;
    const codes = window.prompt("可选：输入课程代码，以逗号分隔。之后仍可从 timetable 再导入快照。", "");
    const modules = String(codes || "").toUpperCase().match(/\b[A-Z]{2,4}[0-9]{4}[A-Z]{0,3}\b/g) || [];
    state.plans.push({
      id: makeId(),
      name: name.trim(),
      source: "manual",
      semester: semesterFromPath() || null,
      modules: [...new Set(modules)].map((code) => ({ code, lessons: {}, detail: "手动录入；未包含班次配置" })),
      createdAt: new Date().toISOString(),
    });
    state.agentPrompt = "";
    render();
  }

  function removePlan(id) {
    state.plans = state.plans.filter((plan) => plan.id !== id);
    state.selected.delete(id);
    state.agentPrompt = "";
    render();
  }

  function clearCurrentTimetable() {
    const semester = semesterFromPath();
    if (!semester) {
      showStatus("请先打开 NUSMods timetable 的具体学期页面。", "error");
      return false;
    }
    if (!window.confirm(`确认清空 NUSMods 的 Semester ${semester} timetable？工作台里的方案会保留。`)) return false;
    try {
      const store = findNusmodsStore();
      store.dispatch({ type: "RESET_TIMETABLE", payload: { semester } });
      showStatus(`已清空 NUSMods Semester ${semester} timetable；工作台方案已保留。`);
      return true;
    } catch (error) {
      showStatus(`清空失败：${error.message}`, "error");
      return false;
    }
  }

  function applyPlanToTimetable(id) {
    const plan = state.plans.find((item) => item.id === id);
    if (!plan) return false;
    const semester = semesterFromPath() || plan.semester;
    if (!semester) {
      showStatus("无法判断目标学期。请先打开 NUSMods timetable 的具体学期页面。", "error");
      return false;
    }
    if (!plan.modules.length) {
      showStatus("空方案不能写入 timetable。", "error");
      return false;
    }
    const incomplete = plan.modules.filter((module) => !module.lessons || !Object.keys(module.lessons).length);
    const suffix = incomplete.length ? `\n\n${incomplete.map((module) => module.code).join("、")} 没有班次配置，写入后可能需要在 NUSMods 中手动选择班次。` : "";
    if (!window.confirm(`将“${plan.name}”应用到 Semester ${semester}，并替换当前 timetable？${suffix}`)) return false;
    try {
      const timetable = Object.fromEntries(plan.modules.map((module) => [module.code, normalizeLessonConfig(module.lessons)]));
      const store = findNusmodsStore();
      const currentColors = store.getState()?.timetables?.colors?.[semester] || {};
      const colors = Object.fromEntries(Object.keys(timetable).map((code, index) => [code, currentColors[code] ?? index % 8]));
      store.dispatch({ type: "SET_TIMETABLE", payload: { semester, timetable, colors, hiddenModules: [], taModules: [] } });
      showStatus(`已将“${plan.name}”应用到 NUSMods Semester ${semester}；工作台方案已保留。`);
      return true;
    } catch (error) {
      showStatus(`写入失败：${error.message}`, "error");
      return false;
    }
  }

  function findNusmodsStore() {
    const app = document.getElementById("app");
    if (!app) throw new Error("没有找到 NUSMods 应用根节点");
    const fiberKeys = Object.keys(app).filter((key) => key.startsWith("__reactContainer$") || key.startsWith("__reactFiber$"));
    const queue = fiberKeys.map((key) => app[key]).filter(Boolean);
    const seen = new Set();
    while (queue.length) {
      const fiber = queue.shift();
      if (!fiber || seen.has(fiber)) continue;
      seen.add(fiber);
      const candidates = [fiber.memoizedProps?.store, fiber.pendingProps?.store];
      const store = candidates.find((candidate) => candidate && typeof candidate.dispatch === "function" && typeof candidate.getState === "function");
      if (store?.getState()?.timetables) return store;
      if (fiber.child) queue.push(fiber.child);
      if (fiber.sibling) queue.push(fiber.sibling);
    }
    throw new Error("无法连接 NUSMods timetable 状态；页面版本可能已更新");
  }

  function showStatus(message, kind = "status") {
    state.lastImport = message;
    render();
    setTimeout(() => shadow.querySelector(".status")?.classList.toggle("error", kind === "error"), 0);
  }

  function selectedPlans() {
    return state.plans.filter((plan) => state.selected.has(plan.id));
  }

  function generateAgentPrompt() {
    if (selectedPlans().length !== 2) return;
    state.agentPrompt = buildAgentPrompt();
    render();
  }

  async function copyAgentPrompt() {
    if (!state.agentPrompt) return;
    try {
      await navigator.clipboard.writeText(state.agentPrompt);
      showStatus("提示词已复制，可以直接粘贴给 Agent。");
    } catch (_) {
      const textarea = shadow.getElementById("npw-agent-prompt");
      textarea?.select();
      const copied = textarea && document.execCommand("copy");
      showStatus(copied ? "提示词已复制，可以直接粘贴给 Agent。" : "自动复制失败，请手动选择并复制提示词。", copied ? "status" : "error");
    }
  }

  function buildAgentPrompt() {
    const plans = selectedPlans();
    if (plans.length !== 2) return "";
    const comparison = comparePlans(plans[0], plans[1]);
    return [
      "你是一名熟悉 NUS 课程与选课规划的顾问。请根据下面两套选课方案进行对比分析。",
      "",
      "请重点分析：",
      "1. 课程数量、可能的学习负担与难度分布；",
      "2. 共同课程的班次差异，以及可能的时间冲突或不合理间隔；",
      "3. 两套方案分别适合什么目标、偏好或风险承受程度；",
      "4. 每套方案的优点、缺点、风险和仍需确认的信息；",
      "5. 最后给出有条件的建议，但不要虚构 CourseReg 资格、优先级、空位、课程评价或未提供的课程事实。",
      "",
      "请先列出事实，再给出推断；如果班次信息不足，请明确说明。输出使用中文。",
      "",
      formatPlanForPrompt(plans[0], "方案 A"),
      "",
      formatPlanForPrompt(plans[1], "方案 B"),
      "",
      "已知差异：",
      `- 仅方案 A：${comparison.onlyInA.join("、") || "无"}`,
      `- 仅方案 B：${comparison.onlyInB.join("、") || "无"}`,
      `- 共同课程但班次不同：${comparison.lessonDifferences.join("；") || "未发现或信息不足"}`,
      "",
      "请按“核心差异—方案 A 优缺点—方案 B 优缺点—适用人群—待确认问题—建议”的结构回答。",
    ].join("\n");
  }

  function formatPlanForPrompt(plan, label) {
    const modules = plan.modules.length
      ? plan.modules.map((module) => `- ${module.code}｜班次：${stableStringify(module.lessons) || "未记录"}${module.detail ? `｜备注：${module.detail}` : ""}`).join("\n")
      : "- 无课程";
    return `${label}：${plan.name}\n来源：${sourceLabel(plan.source)}\n学期：${plan.semester ? `Semester ${plan.semester}` : "未知"}\n课程：\n${modules}`;
  }

  function readCurrentTimetable() {
    const live = readLiveTimetable();
    if (live.available) return live;
    const persisted = readPersistedTimetable();
    if (persisted.modules.length) return persisted;
    const shared = readShareUrl();
    if (shared.modules.length) return shared;
    return readVisibleCourses();
  }

  function readLiveTimetable() {
    try {
      const timetableState = findNusmodsStore().getState().timetables;
      const semester = semesterFromPath() || firstNonEmptySemester(timetableState.lessons || {});
      const timetable = timetableState.lessons?.[semester] || {};
      return {
        available: true,
        source: "live-store",
        semester: Number(semester) || null,
        modules: Object.entries(timetable).map(([code, config]) => ({
          code: String(code).toUpperCase(),
          lessons: normalizeLessonConfig(config),
          detail: "来自 NUSMods 当前页面 timetable",
        })),
      };
    } catch (_) {
      return { available: false, source: "live-store", semester: null, modules: [] };
    }
  }

  function readPersistedTimetable() {
    try {
      const wrapper = JSON.parse(localStorage.getItem("persist:timetables") || "{}");
      const lessons = decodePersistValue(wrapper.lessons);
      if (!lessons || typeof lessons !== "object") return { source: "persisted", semester: null, modules: [] };
      const semester = semesterFromPath() || firstNonEmptySemester(lessons);
      const timetable = lessons[semester] || {};
      return {
        source: "persisted",
        semester: Number(semester) || null,
        modules: Object.entries(timetable).map(([code, config]) => ({
          code: String(code).toUpperCase(),
          lessons: normalizeLessonConfig(config),
          detail: "来自 NUSMods 已保存的 timetable",
        })),
      };
    } catch (_) {
      return { source: "persisted", semester: null, modules: [] };
    }
  }

  function readShareUrl() {
    const params = new URLSearchParams(location.search);
    const modules = [];
    for (const [key, value] of params.entries()) {
      if (/^[A-Z]{2,4}[0-9]{4}[A-Z]{0,3}$/i.test(key)) {
        modules.push({ code: key.toUpperCase(), lessons: parseSharedLessons(value), detail: "来自 NUSMods share 链接" });
      }
    }
    return { source: "share-url", semester: semesterFromPath(), modules };
  }

  function readVisibleCourses() {
    const codes = new Set();
    document.querySelectorAll('a[href*="/courses/"]').forEach((link) => {
      const match = (link.textContent || "").toUpperCase().match(/\b[A-Z]{2,4}[0-9]{4}[A-Z]{0,3}\b/);
      if (match) codes.add(match[0]);
    });
    return {
      source: "visible-page",
      semester: semesterFromPath(),
      modules: [...codes].map((code) => ({ code, lessons: {}, detail: "从当前可见课程链接读取；未包含班次配置" })),
    };
  }

  function renderPlans() {
    if (state.lastImport) {
      const message = state.lastImport;
      state.lastImport = null;
      setTimeout(() => {
        const target = shadow.getElementById("npw-plans");
        if (target) target.insertAdjacentHTML("afterbegin", `<p class="status">${escapeHtml(message)}</p>`);
      }, 0);
    }
    if (!state.plans.length) return '<p class="muted">尚无方案。先导入当前 timetable，或创建空方案。</p>';
    return state.plans.map((plan, index) => `
      <article class="plan" style="--plan-accent: ${planAccent(index)}">
        <span class="plan-color" aria-hidden="true"></span>
        <div class="plan-content">
          <div class="plan-topline"><label><input type="checkbox" data-plan="${plan.id}" ${state.selected.has(plan.id) ? "checked" : ""} /> <span>用于对比</span></label><button data-action="remove-plan" data-id="${plan.id}" aria-label="删除方案">删除</button></div>
          <strong>${escapeHtml(plan.name)}</strong>
          <small>${escapeHtml(sourceLabel(plan.source))} · ${plan.semester ? `Semester ${plan.semester}` : "学期未知"} · ${plan.modules.length} 门</small>
          <p>${plan.modules.length ? plan.modules.map((item) => escapeHtml(item.code)).join(" · ") : "尚未添加课程"}</p>
          <button class="apply-plan" data-action="apply-plan" data-id="${plan.id}" ${plan.modules.length ? "" : "disabled"}>应用到 timetable</button>
        </div>
      </article>`).join("");
  }

  function renderComparison(plans) {
    if (plans.length < 2) return "";
    const comparison = comparePlans(plans[0], plans[1]);
    return `
      <div class="compare-title"><span class="plan-tag a">A</span><strong>${escapeHtml(plans[0].name)}</strong><span class="vs">vs</span><span class="plan-tag b">B</span><strong>${escapeHtml(plans[1].name)}</strong></div>
      ${differenceBlock("仅在前者", comparison.onlyInA)}${differenceBlock("仅在后者", comparison.onlyInB)}
      <div class="diff"><strong>共同课程但班次不同</strong><p>${comparison.lessonDifferences.length ? comparison.lessonDifferences.map(escapeHtml).join("<br>") : "未发现或没有可比较的班次配置"}</p></div>`;
  }

  function comparePlans(a, b) {
    const aMap = new Map(a.modules.map((module) => [module.code, module]));
    const bMap = new Map(b.modules.map((module) => [module.code, module]));
    const onlyInA = [...aMap.keys()].filter((code) => !bMap.has(code));
    const onlyInB = [...bMap.keys()].filter((code) => !aMap.has(code));
    const lessonDifferences = [...aMap.keys()].filter((code) => bMap.has(code)).flatMap((code) => {
      const left = stableStringify(aMap.get(code).lessons);
      const right = stableStringify(bMap.get(code).lessons);
      return left !== right ? [`${code}: ${left || "未记录"} ↔ ${right || "未记录"}`] : [];
    });
    return { planA: a.name, planB: b.name, onlyInA, onlyInB, lessonDifferences };
  }

  function differenceBlock(label, codes) {
    return `<div class="diff"><strong>${label}</strong><p>${codes.length ? codes.map(escapeHtml).join(" · ") : "无"}</p></div>`;
  }

  function decodePersistValue(value) {
    if (typeof value !== "string") return value;
    try { return JSON.parse(value); } catch (_) { return null; }
  }
  function normalizeLessonConfig(value) {
    if (!value || typeof value !== "object") return {};
    return Object.fromEntries(Object.entries(value).map(([type, ids]) => [type, Array.isArray(ids) ? ids.map(String) : [String(ids)]]));
  }
  function parseSharedLessons(value) {
    if (!value) return {};
    return Object.fromEntries(value.split(",").map((part) => {
      const [type, ids] = part.split(":");
      return [type || "Unknown", ids ? ids.replace(/[()]/g, "").split(/[;,]/).filter(Boolean) : []];
    }));
  }
  function semesterFromPath() {
    const path = location.pathname.toLowerCase();
    const match = path.match(/(?:sem(?:ester)?-?)([1-4])/) || path.match(/special-term-?([1-2])/);
    if (!match) return null;
    return path.includes("special-term") ? Number(match[1]) + 2 : Number(match[1]);
  }
  function firstNonEmptySemester(lessons) {
    return Object.keys(lessons).find((key) => lessons[key] && Object.keys(lessons[key]).length) || null;
  }
  function sourceLabel(source) {
    return ({ "live-store": "NUSMods 当前 timetable", persisted: "NUSMods 已保存 timetable", "share-url": "NUSMods share 链接", "visible-page": "当前可见页面", manual: "手动录入" })[source] || source;
  }
  function readableLocation() {
    return location.pathname.includes("/timetable/") ? "NUSMods timetable 页面" : "NUSMods 页面";
  }
  function stableStringify(value) {
    if (!value || !Object.keys(value).length) return "";
    return Object.keys(value).sort().map((key) => `${key}:${(value[key] || []).join("/")}`).join(", ");
  }
  function planAccent(index) {
    return ["#ff5138", "#ff8c00", "#28a745", "#0078a8", "#7d5bbe"][index % 5];
  }
  function makeId() { return `plan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }
  function clamp(value, min, max) { return Math.min(Math.max(value, min), max); }
  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
  }
  function cleanup() {
    state.observer?.disconnect();
    delete window.__NUSMODS_PLAN_WORKBENCH__;
    host.remove();
  }
  function styles() {
    return `<style>
      :host { all: initial; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: var(--body-color, #69707a); } * { box-sizing: border-box; }
      #npw-toggle { position: fixed; z-index: 2147483646; right: 0; top: 43%; width: 52px; padding: 10px 4px; border: 0; border-radius: 3px 0 0 3px; color: #fff; background: #ff5138; font-size: 12px; font-weight: 700; line-height: 1.2; cursor: pointer; box-shadow: 0 4px 12px var(--navtab-shadow, rgba(0,0,0,.1)); }
      #npw-panel { position: fixed; z-index: 2147483647; top: 84px; right: 16px; width: min(400px, calc(100vw - 32px)); max-height: min(720px, calc(100dvh - 108px)); overflow-y: auto; visibility: hidden; opacity: 0; pointer-events: none; background: var(--body-bg, #fff); border: 1px solid var(--gray-lighter, #d3d6db); border-radius: 4px; box-shadow: -8px 8px 20px var(--navtab-shadow, rgba(0,0,0,.1)); transform: translateX(20px); } #npw-panel.open { visibility: visible; opacity: 1; pointer-events: auto; transform: translateX(0); transition: transform .2s ease, opacity .16s ease; }
      header { position: sticky; top: 0; z-index: 2; display: flex; justify-content: space-between; align-items: center; padding: 14px 16px 12px; border-bottom: 1px solid var(--gray-lighter, #d3d6db); background: var(--body-bg, #fff); box-shadow: 0 2px 6px var(--body-bg-70, rgba(255,255,255,.7)); cursor: grab; touch-action: none; user-select: none; } #npw-panel.dragging header { cursor: grabbing; } header > div { padding-left: 9px; border-left: 3px solid #ff5138; } header strong { display: block; color: var(--gray-dark, #222324); font-size: 16px; line-height: 1.2; } header small { display: block; margin-top: 3px; color: var(--gray, #69707a); font-size: 11px; } header button { border: 0; color: var(--gray, #69707a); background: transparent; font-size: 25px; line-height: 1; cursor: pointer; }
      section { padding: 14px 16px; border-bottom: 1px solid var(--gray-lighter, #d3d6db); } .actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }.actions button, .primary { min-height: 34px; padding: 7px 10px; border: 1px solid var(--gray-lighter, #d3d6db); border-radius: 3px; color: var(--body-color, #69707a); background: var(--body-bg, #fff); font-size: 13px; font-weight: 600; cursor: pointer; }.primary { color: #fff; border-color: #ff5138; background: #ff5138; }.primary:disabled, button:disabled { opacity: .55; cursor: not-allowed; }.actions .danger { grid-column: 1 / -1; color: #b71c1c; border-color: #b71c1c; }
      button:focus-visible, input:focus-visible { outline: 2px solid #ff5138; outline-offset: 2px; }.section-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 9px; }.section-head strong { color: var(--gray-dark, #222324); font-size: 13px; }.section-head span, small, .muted { color: var(--gray, #69707a); font-size: 12px; }.muted { margin: 0; line-height: 1.5; }
      .plan { display: flex; gap: 9px; margin-top: 10px; padding-bottom: 10px; border-bottom: 1px solid var(--gray-lighter, #d3d6db); font-size: 13px; }.plan:last-child { padding-bottom: 0; border-bottom: 0; }.plan-color { width: 4px; min-width: 4px; align-self: stretch; border-radius: 3px; background: var(--plan-accent); }.plan-content { min-width: 0; flex: 1; }.plan-topline { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 4px; }.plan label { color: var(--gray, #69707a); font-size: 11px; }.plan strong { display: block; color: var(--gray-dark, #222324); line-height: 1.35; }.plan small { display: block; margin-top: 2px; }.plan button { padding: 0; border: 0; color: #b71c1c; background: transparent; cursor: pointer; font-size: 11px; }.plan p { margin: 5px 0 0; color: var(--body-color, #69707a); font-size: 12px; line-height: 1.45; overflow-wrap: anywhere; }.plan .apply-plan { margin-top: 7px; padding: 5px 8px; border: 1px solid var(--gray-lighter, #d3d6db); border-radius: 3px; color: #ff5138; font-weight: 600; }
      .compare-title { display: flex; flex-wrap: wrap; gap: 5px; align-items: center; padding: 7px 8px; border-radius: 3px; background: var(--gray-lightest, #f3f5f8); color: var(--gray-dark, #222324); font-size: 12px; }.compare-title .vs { color: var(--gray, #69707a); }.plan-tag { display: inline-grid; width: 17px; height: 17px; place-items: center; border-radius: 50%; color: #fff; font-size: 10px; font-weight: 700; }.plan-tag.a { background: #ff5138; }.plan-tag.b { background: #0078a8; }.diff { margin-top: 8px; padding: 8px 9px; border-left: 3px solid var(--gray-lighter, #d3d6db); background: var(--gray-lightest, #f3f5f8); font-size: 12px; }.diff strong { color: var(--gray-dark, #222324); }.diff p { margin: 4px 0 0; line-height: 1.5; overflow-wrap: anywhere; }
      textarea { width: 100%; min-height: 220px; margin-top: 9px; padding: 8px; border: 1px solid var(--gray-lighter, #d3d6db); border-radius: 3px; color: var(--body-color, #69707a); background: var(--body-bg, #fff); resize: vertical; font: 10px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace; }.copy-prompt { width: 100%; margin-top: 7px; padding: 7px 10px; border: 1px solid #ff5138; border-radius: 3px; color: #ff5138; background: var(--body-bg, #fff); font-size: 12px; font-weight: 600; cursor: pointer; }.ok, .status { color: #218838; font-size: 12px; }.status { margin: 0 0 8px; }.status.error { color: #b71c1c; }
      @media (max-width: 520px) { #npw-panel { top: 16px; right: 16px; max-height: calc(100dvh - 32px); } }
    </style>`;
  }
  return {
      ok: true,
      summary: "NUSMods 选课方案工作台已注入。",
      alreadyMounted: false,
      promptApi: "window.__NUSMODS_PLAN_WORKBENCH__.getAgentPrompt()",
  };
})();