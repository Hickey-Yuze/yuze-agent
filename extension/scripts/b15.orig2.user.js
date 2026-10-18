(function () {
    'use strict';
  
    const ROOT_ID = 'rilakkuma-memo-root';
    const STYLE_ID = 'rilakkuma-memo-style';
    const STORAGE_KEY = 'rilakkuma-memo-v1';
  
    // 主题：Rilakkuma COFFEE & MILK TEA · 深咖墨水
    const COLOR_INK = '#4b3621';
    const COLOR_INK_SOFT = 'rgba(75, 54, 33, 0.7)';
    const COLOR_INK_PLACEHOLDER = 'rgba(75, 54, 33, 0.32)';
    // 字体栈：只用各系统自带的圆体 / 文楷 / 圆角风字体，不加载任何外部资源
    //   macOS:   Yuanti SC（圆体）、Hiragino Maru Gothic（圆体）
    //   iOS:     Hiragino Sans GB
    //   Windows: 幼圆、Microsoft YaHei UI / 微软雅黑
    //   兜底:    Comic Sans MS（英文 cute）、sans-serif
    const FONT_FAMILY =
      `"Yuanti SC", "STYuanti SC", "Hiragino Maru Gothic ProN", ` +
      `"Hiragino Sans GB", "PingFang SC", "Microsoft YaHei UI", ` +
      `"Microsoft YaHei", "\u5E7C\u5706", "Comic Sans MS", sans-serif`;
  
    // ---- 重复执行：清理上一轮注入的 DOM 与全局监听 ----
    const NS = window.__rilakkumaMemo || (window.__rilakkumaMemo = {});
    if (Array.isArray(NS.cleanups)) {
      NS.cleanups.forEach((fn) => {
        try { fn(); } catch (_) { /* noop */ }
      });
    }
    NS.cleanups = [];
    document.getElementById(ROOT_ID)?.remove();
    document.getElementById(STYLE_ID)?.remove();
    /** addEventListener + 收集 remove 句柄到清理队列 */
    function on(target, event, handler, opts) {
      target.addEventListener(event, handler, opts);
      NS.cleanups.push(() => target.removeEventListener(event, handler, opts));
    }
  
    // ---- 卡片显示尺寸 ----
    const CARD_W = 240;
    const CARD_H = 260;
    const FONT_SIZE = 13;       // px（约卡片宽度 5%）
    const LINE_HEIGHT = 28;     // px（约卡片高度 10%，对齐背景横线间距）
    const FAB_IMG =
      'https://p0.meituan.net/guangnian/2185f2bcd530acf09b32ce79a0f5c68791753.png';
  
    /**
     * Rilakkuma COFFEE & MILK TEA · WEEKLY MEMO（1:1 JPG）
     * note: 横线书写区位置（CSS 百分比，相对卡片宽高）
     */
    const TILES = {
      cover: {
        name: '封面',
        isCover: true,
        src: 'https://p0.meituan.net/guangnian/376a97d32b48fcb99c9e3c6b3d86d0ff135927.jpg',
      },
      mon: {
        name: '周一',
        src: 'https://p0.meituan.net/guangnian/f947a33b7791bd9f9d8e768aff11669b99628.jpg',
        note: { left: 12, top: 31, width: 76, height: 44 },
      },
      tue: {
        name: '周二',
        src: 'https://p0.meituan.net/guangnian/a9a139093cbb4f04bb794a9f60930abf115177.jpg',
        note: { left: 12, top: 31, width: 76, height: 44 },
      },
      wed: {
        name: '周三',
        src: 'https://p0.meituan.net/guangnian/10a78cf21ca72938e7f4ca0728c4a3ea113175.jpg',
        note: { left: 12, top: 31, width: 76, height: 44 },
      },
      thu: {
        name: '周四',
        src: 'https://p0.meituan.net/guangnian/c5158a7e93781cbed1ec3e9db78bac8b80850.jpg',
        note: { left: 12, top: 31, width: 76, height: 44 },
      },
      fri: {
        name: '周五',
        src: 'https://p0.meituan.net/guangnian/8dfc5f78ad13c8d58997c2bb625015e789005.jpg',
        note: { left: 12, top: 31, width: 76, height: 44 },
      },
      sat: {
        name: '周六',
        src: 'https://p0.meituan.net/guangnian/cdbbaadc5afda715958463bda0fd5a07126313.jpg',
        note: { left: 12, top: 31, width: 76, height: 44 },
      },
      sun: {
        name: '周日',
        src: 'https://p0.meituan.net/guangnian/77d85fcf78525bc9eb20015516fefaa293934.jpg',
        note: { left: 12, top: 31, width: 76, height: 44 },
      },
    };
  
    // getDay(): 0=日 1=一 ... 6=六
    const DAY_TO_KEY = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const todayKey = DAY_TO_KEY[new Date().getDay()];
  
    // ============== 持久化 ==============
    // 状态：{ notes: [{id, dayKey, text, left, top, rot, createdAt}], fab: {left, top} | null }
    let data;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      data = raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.warn('[轻松熊周记] 读取本地状态失败，将以空状态启动：', e);
      data = {};
    }
    if (!data || typeof data !== 'object') data = {};
    if (!Array.isArray(data.notes)) data.notes = [];
    if (!data.fab) data.fab = null;
  
    let persistTimer = 0;
    function persist() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (e) {
        console.warn('[轻松熊周记] 状态保存失败（localStorage 不可用 / 已满）：', e);
      }
    }
    /** 文字输入这种高频场景下尾部 120ms 落一次盘 */
    function persistDebounced() {
      if (persistTimer) return;
      persistTimer = setTimeout(() => {
        persistTimer = 0;
        persist();
      }, 120);
    }
  
    function uid() {
      return 'n_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    }
    function clamp(v, min, max) {
      return Math.max(min, Math.min(max, v));
    }
    function pickPoint(e) {
      const t = e.touches && e.touches[0];
      return t ? { x: t.clientX, y: t.clientY } : { x: e.clientX, y: e.clientY };
    }
  
    // ---- 预加载素材：避免点击「+」时素材现拉导致闪一下 ----
    Object.values(TILES).forEach((t) => {
      const img = new Image();
      img.src = t.src;
    });
    const fabPreload = new Image();
    fabPreload.src = FAB_IMG;
  
    // ============== 样式 ==============
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${ROOT_ID} {
        position: fixed; inset: 0;
        pointer-events: none;
        z-index: 2147483647;
        font-family: ${FONT_FAMILY};
        color: ${COLOR_INK};
      }
      #${ROOT_ID} *,
      #${ROOT_ID} *::before,
      #${ROOT_ID} *::after { box-sizing: border-box; }
  
      /* ---------- 入口按钮（贴纸图） ---------- */
      #${ROOT_ID} .blt-fab {
        position: fixed;
        pointer-events: auto;
        width: 72px; height: 72px;
        padding: 0;
        border: none;
        border-radius: 0;
        cursor: pointer;
        background: transparent;
        box-shadow: none;
        display: block;
        transition: transform 0.18s ease;
      }
      #${ROOT_ID} .blt-fab:hover {
        transform: scale(1.1);
      }
      #${ROOT_ID} .blt-fab-img {
        display: block;
        width: 100%; height: 100%;
        object-fit: contain;
        pointer-events: none;
        user-select: none;
        -webkit-user-drag: none;
      }
  
      /* ---------- 便利贴主体（不旋转） ---------- */
      #${ROOT_ID} .blt-note {
        position: fixed;
        pointer-events: auto;
        width: ${CARD_W}px; height: ${CARD_H}px;
        cursor: grab;
        transition: transform 0.18s ease, filter 0.18s ease, opacity 0.18s ease;
        filter: drop-shadow(0 8px 18px rgba(75, 54, 33, 0.2));
      }
      #${ROOT_ID} .blt-note.is-dragging {
        transition: none !important;
        cursor: grabbing;
        filter: drop-shadow(0 14px 26px rgba(75, 54, 33, 0.28));
      }
      #${ROOT_ID} .blt-note.is-editing {
        transform: scale(1.02);
        filter: drop-shadow(0 14px 28px rgba(75, 54, 33, 0.3));
      }
  
      /* ---------- 卡片 + 素材（PNG 透明背景，不再填充底色） ---------- */
      #${ROOT_ID} .blt-card {
        position: absolute; inset: 0;
        background: transparent;
      }
      #${ROOT_ID} .blt-tile {
        display: block;
        width: 100%; height: 100%;
        object-fit: contain;
        pointer-events: none;
        user-select: none;
        -webkit-user-drag: none;
      }
  
      /* ---------- 胶带（顶部居中，斜贴一条） ---------- */
      #${ROOT_ID} .blt-tape {
        position: absolute;
        top: -2px;
        left: 50%;
        width: 40px;
        height: 16px;
        transform: translateX(-50%) rotate(-40deg);
        transform-origin: center center;
        pointer-events: none;
        z-index: 3;
        background:
          repeating-linear-gradient(90deg,
            rgba(255,255,255,0.22) 0,
            rgba(255,255,255,0.22) 3px,
            rgba(255,255,255,0)    3px,
            rgba(255,255,255,0)    7px),
          linear-gradient(180deg,
            rgba(255, 249, 229, 0.72) 0%,
            rgba(210, 180, 140, 0.58) 50%,
            rgba(255, 249, 229, 0.72) 100%);
        box-shadow:
          0 2px 4px rgba(75, 54, 33, 0.1),
          inset 0 0 0 1px rgba(255, 255, 255, 0.3);
      }
  
      /* ---------- 控件 ---------- */
      #${ROOT_ID} .blt-ctrl {
        position: absolute;
        top: -2px; right: -6px;
        display: flex; gap: 3px;
        opacity: 0;
        transition: opacity 0.2s ease;
        z-index: 4;
      }
      #${ROOT_ID} .blt-note:hover .blt-ctrl,
      #${ROOT_ID} .blt-note.is-editing .blt-ctrl { opacity: 1; }
      #${ROOT_ID} .blt-iconbtn {
        width: 26px;
        height: 26px;
        padding: 0;
        border: none;
        border-radius: 50%;
        background: rgba(255, 249, 229, 0.94);
        color: #6f4e37;
        cursor: pointer;
        box-shadow: 0 1px 3px rgba(75, 54, 33, 0.14);
        display: inline-flex; align-items: center; justify-content: center;
      }
      #${ROOT_ID} .blt-iconbtn:hover { background: #fff; color: #4b3621; }
      #${ROOT_ID} .blt-iconbtn.danger:hover { color: #c44a3a; }
      #${ROOT_ID} .blt-iconbtn svg { width: 14px; height: 14px; display: block; }
  
      /* ---------- 编辑区（咖啡色文字） ---------- */
      #${ROOT_ID} .blt-textarea {
        position: absolute;
        box-sizing: border-box;
        border: none;
        outline: none;
        padding: 0;
        margin: 0;
        background: transparent;
        color: ${COLOR_INK};
        font-family: inherit;
        font-size: ${FONT_SIZE}px;
        line-height: ${LINE_HEIGHT}px;
        letter-spacing: 0.4px;
        resize: none;
        cursor: default;
        pointer-events: none;
        z-index: 2;
      }
      #${ROOT_ID} .blt-note.is-editing .blt-textarea {
        pointer-events: auto;
        cursor: text;
      }
      #${ROOT_ID} .blt-textarea::placeholder { color: ${COLOR_INK_PLACEHOLDER}; }
  
      /* ---------- 底部提示 ---------- */
      #${ROOT_ID} .blt-hint {
        position: absolute;
        bottom: -18px; left: 0; right: 0;
        text-align: center;
        font-size: 12px;
        color: ${COLOR_INK_SOFT};
        opacity: 0;
        transition: opacity 0.2s ease;
        pointer-events: none;
        text-shadow: 0 1px 2px rgba(255, 249, 229, 0.8);
      }
      #${ROOT_ID} .blt-note:hover .blt-hint { opacity: 1; }
      #${ROOT_ID} .blt-note.is-editing .blt-hint { opacity: 0; }
    `;
    document.head.appendChild(style);
  
    // ============== 容器 ==============
    const root = document.createElement('div');
    root.id = ROOT_ID;
    document.body.appendChild(root);
  
    // ============== 入口按钮 ==============
    const FAB_SIZE = 72;
    const fab = document