// ==UserScript==
// @name         待办事项
// @description  右键悬浮球打开菜单
// @match        *://*/*
// @icon         data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='%232563eb'%3E%3Cpath d='M14.5 3a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5zm-13-1A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 2z'/%3E%3Cpath d='M7 5.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5m-1.496-.854a.5.5 0 0 1 0 .708l-1.5 1.5a.5.5 0 0 1-.708 0l-.5-.5a.5.5 0 1 1 .708-.708l.146.147 1.146-1.147a.5.5 0 0 1 .708 0M7 9.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5m-1.496-.854a.5.5 0 0 1 0 .708l-1.5 1.5a.5.5 0 0 1-.708 0l-.5-.5a.5.5 0 1 1 .708-.708l.146.147 1.146-1.147a.5.5 0 0 1 .708 0'/%3E%3C/svg%3E
// @run-at       document-end
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// ==/UserScript==

(function () {
  const W = "tab-todo-widget",
    T = "tab-todo-toggle",
    S = "tab-todo-widget-style",
    M = "tab-todo-menu",
    K = "tab-todo-widget-data-v5",
    P = "tab-todo-widget-position-v5",
    U = "tab-todo-widget-ui-state-v6",
    O = "tab-todo-widget-open-v6";

  if (document.getElementById(W) || document.getElementById(T)) return;

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
  const CSS_TEXT = `
:root{--bg:rgba(255,255,255,.82);--panel:rgba(255,255,255,.9);--bd:rgba(15,23,42,.08);--tx:#0f172a;--ts:#475569;--tf:#94a3b8;--ac:#2563eb;--ac2:#1d4ed8;--er:#ef4444;--ok:#10b981;--sd:0 18px 50px rgba(15,23,42,.18);--sd2:0 10px 30px rgba(15,23,42,.12);--item:rgba(248,250,252,.92);--inp:rgba(255,255,255,.92);--tb:linear-gradient(135deg,#3b82f6,#2563eb);--tsd:0 12px 30px rgba(37,99,235,.35)}
@media(prefers-color-scheme:dark){:root{--bg:rgba(15,23,42,.86);--panel:rgba(17,24,39,.92);--bd:rgba(255,255,255,.08);--tx:#e5eefb;--ts:#cbd5e1;--tf:#94a3b8;--ac:#60a5fa;--ac2:#3b82f6;--er:#f87171;--ok:#34d399;--sd:0 18px 50px rgba(0,0,0,.45);--sd2:0 10px 30px rgba(0,0,0,.28);--item:rgba(30,41,59,.92);--inp:rgba(15,23,42,.9);--tb:linear-gradient(135deg,#60a5fa,#2563eb);--tsd:0 12px 30px rgba(37,99,235,.42)}}
#tab-todo-toggle{position:fixed;right:20px;bottom:20px;width:52px;height:52px;border:1px solid rgba(255,255,255,.18);border-radius:50%;background:var(--tb);color:#fff;display:flex;align-items:center;justify-content:center;cursor:grab;z-index:2147483646;box-shadow:var(--tsd);user-select:none;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);transition:transform .18s ease,opacity .18s ease;font-size:22px;touch-action:none}
#tab-todo-toggle:hover{transform:translateY(-2px) scale(1.03)}
#tab-todo-toggle.dragging{cursor:grabbing;transform:scale(1.05);transition:none}
#tab-todo-toggle .i{pointer-events:none;line-height:1;transform:translateY(-1px)}
#tab-todo-widget{position:fixed;left:20px;top:20px;width:360px;max-width:calc(100vw - 24px);max-height:min(568px,calc(100vh - 24px));color:var(--tx);background:var(--bg);border:1px solid var(--bd);border-radius:22px;box-shadow:var(--sd);backdrop-filter:blur(20px) saturate(140%);-webkit-backdrop-filter:blur(20px) saturate(140%);overflow:hidden;z-index:2147483647;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;transition:opacity .18s ease,transform .18s ease}
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
#tab-todo-widget .it{display:grid;grid-template-columns:auto 1fr auto auto;gap:10px;align-items:center;padding:12px;border-radius:16px;background:var(--item);border:1px solid var(--bd);box-shadow:var(--sd2);position:relative;cursor:grab;transition:transform .15s ease,background .15s ease}
#tab-todo-widget .it:hover{background:rgba(148,163,184,.08);transform:translateY(-1px)}
#tab-todo-widget .list.sorting,#tab-todo-widget .list.sorting .it,#tab-todo-widget .list.sorting .txt{cursor:grabbing!important}
#tab-todo-widget .it.c .txt{color:var(--tf);text-decoration:line-through}
#tab-todo-widget .it.sorting{opacity:.45}
#tab-todo-widget .it.drag-over-top::before,#tab-todo-widget .it.drag-over-bottom::after{content:'';position:absolute;left:10px;right:10px;height:3px;border-radius:999px;background:linear-gradient(90deg,var(--ac),var(--ac2))}
#tab-todo-widget .it.drag-over-top::before{top:-6px}
#tab-todo-widget .it.drag-over-bottom::after{bottom:-6px}
#tab-todo-widget .ck{-webkit-appearance:none;appearance:none;width:20px;height:20px;border-radius:50%;border:2px solid rgba(59,130,246,.45);cursor:pointer;position:relative;margin:0}
#tab-todo-widget .ck:checked{background:linear-gradient(135deg,var(--ok),#22c55e);border-color:transparent}
#tab-todo-widget .ck:checked:after{content:'';width:7px;height:4px;border-left:2px solid #fff;border-bottom:2px solid #fff;transform:rotate(-45deg) translateY(-1px);display:block;position:absolute;left:4px;top:5px}
#tab-todo-widget .ct{min-width:0}
#tab-todo-widget .txt{font-size:14px;line-height:1.45;color:var(--tx);word-break:break-word;user-select:none}
#tab-todo-widget .meta{margin-top:4px;font-size:11px}
#tab-todo-widget .edit-btn{width:34px;height:34px;border-radius:10px;background:transparent;color:var(--ac);cursor:pointer;font-size:16px}
#tab-todo-widget .edit-btn:hover{background:rgba(37,99,235,.1)}
#tab-todo-widget .del{width:34px;height:34px;border-radius:10px;border:none;background:transparent;color:var(--er);cursor:pointer;font-size:16px}
#tab-todo-widget .del:hover{background:rgba(239,68,68,.1)}
#tab-todo-widget .emp{display:none;padding:24px 12px;text-align:center;color:var(--tf)}
#tab-todo-widget .empi{font-size:28px;margin-bottom:8px}
#tab-todo-widget .ft{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:14px;padding-top:12px;border-top:1px solid var(--bd);flex-wrap:wrap}
#tab-todo-widget .clr{height:34px;padding:0 12px;border-radius:10px;background:transparent;border-color:rgba(239,68,68,.16);color:var(--er);cursor:pointer;font-size:12px;font-weight:600}
#tab-todo-widget .clr[disabled]{opacity:.45;cursor:not-allowed}
#tab-todo-menu{position:fixed;min-width:148px;padding:8px;background:var(--panel);border:1px solid var(--bd);border-radius:14px;box-shadow:var(--sd2);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);z-index:2147483648;display:none}
#tab-todo-menu.show{display:block}
#tab-todo-menu .mi{display:flex;align-items:center;gap:8px;width:100%;height:36px;padding:0 10px;border:none;background:transparent;border-radius:10px;color:var(--tx);cursor:pointer;text-align:left;font-size:13px}
#tab-todo-menu .mi:hover{background:rgba(148,163,184,.12)}
#tab-todo-menu .mi.danger{color:var(--er)}
#tab-todo-menu .sep{height:1px;background:var(--bd);margin:6px 2px}`;

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
  function mk(open) {
    const iSpan = el("span", { cls: "i" }, "✓");
    const t = el("button", {
      id: T, type: "button",
      title: "待办事项(右键打开菜单)",
      "aria-label": "待办事项，右键菜单"
    }, iSpan);
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
    const miClose = el("button", { type: "button", cls: "mi", "data-act": "close" }, "关闭");
    const sep = el("div", { cls: "sep" });
    const miClear = el("button", { type: "button", cls: "mi danger", "data-act": "clear" }, "清空数据");
    const m = el("div", { id: M }, miClose, sep, miClear);
    const root = document.documentElement;
    root.appendChild(t);
    root.appendChild(w);
    root.appendChild(m);

    return {
      t, w, m,
      inp, addBtn, fm, list, emp, cnt, xBtn, clrBtn,
      bs: [fbAll, fbActive, fbDone]
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

  async function run() {
    if (!document.documentElement) return;

    const [rawTd, rawUi, rawPos, rawOpen] = await Promise.all([
      store.get(K, []),
      store.get(U, { filter: "all" }),
      store.get(P, { right: 20, bottom: 20 }),
      store.get(O, false),
    ]);

    td = Array.isArray(rawTd) ? rawTd : [];
    const su = rawUi, sp = rawPos, so = !!rawOpen;
    ui = su && typeof su.filter === "string"
      ? { filter: su.filter, open: so }
      : { filter: "all", open: so };
    pos = sp && typeof sp.right === "number" && typeof sp.bottom === "number"
      ? sp : { right: 20, bottom: 20 };

    css();
    setupSPAGuard();

    const { t, w, m, inp: i, fm: f, list: l, emp: e, cnt: c, xBtn: x, clrBtn: clr, bs } = mk(ui.open);

    const d = { on: 0, drag: 0, moved: 0, id: null, x: 0, y: 0, r: 20, b: 20 };
    const sd = { on: 0, id: null, sx: 0, sy: 0, dragId: null, overId: null, place: "after", moved: 0 };
    let editingId = null;

    const saveState = () => { store.set(K, td); store.set(U, { filter: ui.filter }); store.set(O, !!ui.open); };
    const savePos = (r, b) => store.set(P, { right: r, bottom: b });
    const flt = () =>
      ui.filter === "active" ? td.filter(v => !v.completed) :
      ui.filter === "completed" ? td.filter(v => v.completed) : td.slice();
    const rfb = () => bs.forEach(b => b.classList.toggle("active", b.dataset.f === ui.filter));
    const clearSort = () => l.querySelectorAll(".drag-over-top,.drag-over-bottom,.sorting")
      .forEach(n => n.classList.remove("drag-over-top", "drag-over-bottom", "sorting"));
    const hideMenu = () => m.classList.remove("show");
    const sync = () => ap({ right: parseFloat(t.style.right) || 20, bottom: parseFloat(t.style.bottom) || 20 });
    const onResize = () => { if (!dead) { sync(); hideMenu(); } };

    function kill() {
      if (dead) return;
      dead = true;
      hideMenu();
      window.removeEventListener("resize", onResize);
      document.removeEventListener("pointerdown", onDocDown, true);
      t.remove(); w.remove(); m.remove();
      const s = document.getElementById(S);
      if (s) s.remove();
    }

    function clearAllData() {
      td = []; ui.filter = "all";
      saveState(); render(); sync();
    }

    function render() {
      if (dead) return;
      const arr = flt();
      const done = td.filter(v => v.completed).length;
      const act = td.length - done;
      l.textContent = "";
      e.style.display = arr.length ? "none" : "block";

      arr.forEach(v => {
        const ck = el("input", { type: "checkbox", cls: "ck" });
        ck.checked = !!v.completed;

        const txt = el("div", { cls: "txt" });
        txt.textContent = v.text;

        const meta = el("div", { cls: "meta" });
        meta.textContent = v.createdAt ? "创建于 " + new Date(v.createdAt).toLocaleString() : "";

        const ct = el("div", { cls: "ct" }, txt, meta);
        const editBtn = el("button", { type: "button", cls: "edit-btn", "aria-label": "编辑", title: "编辑" }, "✎");
        const delBtn = el("button", { type: "button", cls: "del", "aria-label": "删除" }, "✕");

        const li = el("li", { cls: "it" + (v.completed ? " c" : "") });
        li.dataset.id = v.id;
        li.appendChild(ck);
        li.appendChild(ct);
        li.appendChild(editBtn);
        li.appendChild(delBtn);
        l.appendChild(li);
      });

      c.textContent = `共 ${td.length} 项 · 未完成 ${act} · 已完成 ${done}`;
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
      const ts = 52, gap = 14, mgn = 12, maxW = 360, minW = 280;
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
    }

    function add(v) {
      v = String(v || "").trim();
      if (!v) return;
      td.unshift({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        text: v, completed: false, createdAt: Date.now()
      });
      render();
    }

    function saveEdit(id, val) {
      val = String(val || "").trim();
      editingId = null;
      if (id && val) { td = td.map(v => v.id === id ? { ...v, text: val } : v); render(); sync(); }
      else render();
    }

    function startEdit(id) {
      if (!id || editingId === id || sd.on) return;
      editingId = id;
      render();
      const li = l.querySelector(`.it[data-id="${id}"]`);
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
      hideMenu();
      const pad = 8;
      m.classList.add("show");
      m.style.left = "0px";
      m.style.top = "0px";
      const r = m.getBoundingClientRect();
      const ml = clamp(x, pad, Math.max(pad, window.innerWidth - r.width - pad));
      const mt = clamp(y, pad, Math.max(pad, window.innerHeight - r.height - pad));
      m.style.left = ml + "px";
      m.style.top = mt + "px";
    }

    function onDocDown(ev) {
      if (m.classList.contains("show") && !m.contains(ev.target) && ev.target !== t) {
        hideMenu();
      }
    }

    ap(pos);
    render();
    if (!ui.open) w.classList.add("hidden");
    document.addEventListener("pointerdown", onDocDown, true);
    t.addEventListener("click", ev => {
      if (dead) return;
      hideMenu();
      if (d.moved || d.drag) {
        ev.preventDefault();
        ev.stopPropagation();
      } else {
        w.classList.contains("hidden") ? open() : close();
      }
    });

    t.addEventListener("contextmenu", ev => {
      ev.preventDefault();
      ev.stopPropagation();
      showMenu(ev.clientX, ev.clientY);
    });
    m.addEventListener("click", ev => {
      const btn = ev.target && ev.target.closest(".mi");
      if (!btn || !btn.dataset.act) return;
      const act = btn.dataset.act;
      hideMenu();
      if (act === "close") kill();
      else if (act === "clear") clearAllData();
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
      if (n.classList.contains("edit-btn")) startEdit(it.dataset.id);
      else if (n.classList.contains("del")) {
        td = td.filter(v => v.id !== it.dataset.id);
        render(); sync();
      }
    });
    l.addEventListener("change", ev => {
      const n = ev.target;
      const it = n && n.closest(".it");
      if (!it || !n.classList.contains("ck") || !it.dataset.id || sd.on) return;
      td = td.map(v => v.id === it.dataset.id ? { ...v, completed: n.checked } : v);
      render(); sync();
    });
    clr.addEventListener("click", () => {
      const len = td.length;
      td = td.filter(v => !v.completed);
      if (td.length !== len) { render(); sync(); }
    });
    bs.forEach(b => b.addEventListener("click", () => {
      if (b.dataset.f) { ui.filter = b.dataset.f; render(); sync(); }
    }));
    l.addEventListener("pointerdown", ev => {
      hideMenu();
      const it = ev.target && ev.target.closest(".it");
      const isInput = ev.target && (
        ev.target.closest(".edit") || ev.target.closest(".ck") ||
        ev.target.closest(".del") || ev.target.closest(".edit-btn")
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
      const dragEl = l.querySelector(`.it[data-id="${sd.dragId}"]`);
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
      d.on = 1; d.drag = 0; d.id = ev.pointerId;
      d.x = ev.clientX; d.y = ev.clientY;
      d.r = parseFloat(t.style.right) || 20;
      d.b = parseFloat(t.style.bottom) || 20;
      try { t.setPointerCapture && t.setPointerCapture(ev.pointerId); } catch {}
    });

    t.addEventListener("pointermove", ev => {
      if (!d.on || d.id !== ev.pointerId || dead) return;
      const dx = ev.clientX - d.x, dy = ev.clientY - d.y;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        d.drag = 1; d.moved = 1;
        t.classList.add("dragging");
      }
      if (d.drag) ap({ right: d.r - dx, bottom: d.b - dy });
    });

    function up(ev) {
      if (!d.on) return;
      if (typeof ev.pointerId === "number" && d.id !== ev.pointerId) return;
      const was = d.drag;
      d.on = 0; d.drag = 0; d.id = null;
      t.classList.remove("dragging");
      try {
        if (t.releasePointerCapture && typeof ev.pointerId === "number") {
          t.releasePointerCapture(ev.pointerId);
        }
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