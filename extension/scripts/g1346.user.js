(() => {
  // ============================================================
  // 今天吃什么 · Pure JS Injected Page
  // No dependencies / No external assets
  // ============================================================

  const ROOT_ID = "what-to-eat-app";

  // 防止重复注入
  document.getElementById(ROOT_ID)?.remove();
  document.getElementById(`${ROOT_ID}-style`)?.remove();

  // =========================
  // 1. 数据
  // =========================
  const foods = [
    "火锅",
    "烧烤",
    "日料",
    "韩餐",
    "川菜",
    "粤菜",
    "湘菜",
    "烤肉",
    "披萨",
    "汉堡",
    "麻辣烫",
    "拉面",
    "米线",
    "炸鸡",
    "泰餐",
    "咖喱",
    "轻食",
    "小龙虾"
  ];

  const foodEmoji = {
    火锅: "🍲",
    烧烤: "🍢",
    日料: "🍣",
    韩餐: "🥘",
    川菜: "🌶️",
    粤菜: "🥢",
    湘菜: "🔥",
    烤肉: "🥩",
    披萨: "🍕",
    汉堡: "🍔",
    麻辣烫: "🍜",
    拉面: "🍜",
    米线: "🥣",
    炸鸡: "🍗",
    泰餐: "🥭",
    咖喱: "🍛",
    轻食: "🥗",
    小龙虾: "🦞"
  };

  // =========================
  // 2. 注入样式
  // =========================
  const style = document.createElement("style");
  style.id = `${ROOT_ID}-style`;

  style.textContent = `
    :root {
      --eat-bg-1: #f6f8ff;
      --eat-bg-2: #edf2ff;
      --eat-ink: #172033;
      --eat-muted: rgba(23, 32, 51, .56);
      --eat-line: rgba(255, 255, 255, .64);
      --eat-glass: rgba(255, 255, 255, .54);
      --eat-glass-strong: rgba(255, 255, 255, .72);
      --eat-accent: #6d6bf7;
      --eat-accent-2: #8f6bf6;
    }

    * {
      box-sizing: border-box;
    }

    html,
    body {
      width: 100%;
      min-height: 100%;
      margin: 0;
    }

    body {
      overflow-x: hidden;
    }

    #${ROOT_ID} {
      min-height: 100vh;
      width: 100%;
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px 24px;
      color: var(--eat-ink);
      font-family:
        -apple-system,
        BlinkMacSystemFont,
        "SF Pro Display",
        "SF Pro Text",
        "PingFang SC",
        "Helvetica Neue",
        Arial,
        sans-serif;
      background:
        radial-gradient(
          circle at 12% 12%,
          rgba(131, 203, 255, .56),
          transparent 31%
        ),
        radial-gradient(
          circle at 87% 13%,
          rgba(192, 161, 255, .62),
          transparent 32%
        ),
        radial-gradient(
          circle at 71% 89%,
          rgba(255, 196, 220, .48),
          transparent 34%
        ),
        linear-gradient(
          145deg,
          #f9fbff 0%,
          #eef3ff 46%,
          #f7f2ff 100%
        );
    }

    #${ROOT_ID} .ambient {
      position: absolute;
      border-radius: 999px;
      pointer-events: none;
      filter: blur(4px);
      opacity: .78;
      animation: eat-float 10s ease-in-out infinite alternate;
    }

    #${ROOT_ID} .ambient.a1 {
      width: 250px;
      height: 250px;
      left: -70px;
      top: 20%;
      background:
        radial-gradient(circle at 32% 30%, #fff, rgba(112, 205, 255, .7) 28%, transparent 69%);
    }

    #${ROOT_ID} .ambient.a2 {
      width: 310px;
      height: 310px;
      right: -80px;
      top: 8%;
      background:
        radial-gradient(circle at 35% 32%, #fff, rgba(171, 130, 255, .68) 30%, transparent 70%);
      animation-delay: -3s;
    }

    #${ROOT_ID} .ambient.a3 {
      width: 220px;
      height: 220px;
      right: 10%;
      bottom: -70px;
      background:
        radial-gradient(circle at 40% 35%, #fff, rgba(255, 166, 211, .54) 30%, transparent 72%);
      animation-delay: -6s;
    }

    #${ROOT_ID} .shell {
      width: min(1180px, 100%);
      min-height: 690px;
      position: relative;
      z-index: 2;

      display: grid;
      grid-template-columns: minmax(310px, .9fr) minmax(460px, 1.1fr);
      align-items: center;
      gap: 36px;

      padding: clamp(28px, 4vw, 58px);

      background:
        linear-gradient(
          135deg,
          rgba(255, 255, 255, .72),
          rgba(255, 255, 255, .40)
        );

      border: 1px solid rgba(255, 255, 255, .82);
      border-radius: 46px;

      box-shadow:
        0 40px 110px rgba(60, 74, 130, .17),
        inset 0 1px 0 rgba(255, 255, 255, .9),
        inset 0 -1px 0 rgba(255, 255, 255, .28);

      backdrop-filter: blur(34px) saturate(145%);
      -webkit-backdrop-filter: blur(34px) saturate(145%);
    }

    #${ROOT_ID} .copy {
      position: relative;
      z-index: 4;
    }

    #${ROOT_ID} .eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      min-height: 34px;
      padding: 0 14px;

      border-radius: 999px;

      color: #5858da;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: .08em;

      background: rgba(255, 255, 255, .52);
      border: 1px solid rgba(255, 255, 255, .76);

      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, .82),
        0 8px 24px rgba(88, 88, 218, .08);
    }

    #${ROOT_ID} .eyebrow-dot {
      width: 7px;
      height: 7px;
      border-radius: 99px;
      background: #7171f7;
      box-shadow: 0 0 14px rgba(113, 113, 247, .8);
    }

    #${ROOT_ID} h1 {
      margin: 22px 0 12px;
      font-size: clamp(52px, 6vw, 82px);
      line-height: .98;
      letter-spacing: -.065em;
      font-weight: 780;

      background:
        linear-gradient(
          135deg,
          #14213b 0%,
          #26396e 48%,
          #765ed4 100%
        );

      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }

    #${ROOT_ID} .subtitle {
      max-width: 410px;
      margin: 0;

      font-size: 19px;
      line-height: 1.65;
      color: var(--eat-muted);
      font-weight: 500;
    }

    #${ROOT_ID} .result-box {
      margin-top: 34px;
      min-height: 126px;
      padding: 21px 22px;

      display: flex;
      align-items: center;
      gap: 17px;

      border-radius: 28px;

      background:
        linear-gradient(
          135deg,
          rgba(255,255,255,.72),
          rgba(255,255,255,.38)
        );

      border: 1px solid rgba(255,255,255,.82);

      box-shadow:
        0 16px 40px rgba(61, 75, 127, .10),
        inset 0 1px 0 rgba(255,255,255,.9);

      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);

      transition:
        transform .42s cubic-bezier(.2,.8,.2,1),
        box-shadow .42s ease;
    }

    #${ROOT_ID} .result-box.active {
      transform: translateY(-3px) scale(1.015);
      box-shadow:
        0 24px 56px rgba(82, 71, 180, .15),
        inset 0 1px 0 rgba(255,255,255,.9);
    }

    #${ROOT_ID} .result-icon {
      width: 68px;
      height: 68px;
      flex: 0 0 68px;

      display: grid;
      place-items: center;

      border-radius: 22px;

      font-size: 35px;

      background:
        linear-gradient(
          145deg,
          rgba(255,255,255,.95),
          rgba(227,230,255,.65)
        );

      box-shadow:
        inset 0 1px 1px white,
        0 12px 28px rgba(70, 70, 160, .12);
    }

    #${ROOT_ID} .result-label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: .1em;
      font-weight: 700;
      color: rgba(23,32,51,.44);
      margin-bottom: 5px;
    }

    #${ROOT_ID} .result-value {
      font-size: 30px;
      line-height: 1.2;
      letter-spacing: -.04em;
      font-weight: 760;
      color: #18233b;
    }

    #${ROOT_ID} .hint {
      margin-top: 17px;

      display: flex;
      align-items: center;
      gap: 8px;

      font-size: 13px;
      font-weight: 550;
      color: rgba(23,32,51,.42);
    }

    #${ROOT_ID} .wheel-area {
      position: relative;

      display: flex;
      align-items: center;
      justify-content: center;

      min-height: 570px;
    }

    #${ROOT_ID} .wheel-glow {
      position: absolute;
      width: min(550px, 90%);
      aspect-ratio: 1;
      border-radius: 999px;

      background:
        radial-gradient(
          circle,
          rgba(255,255,255,.42) 0%,
          rgba(113,112,247,.20) 45%,
          rgba(146,123,239,.06) 64%,
          transparent 72%
        );

      filter: blur(12px);
    }

    #${ROOT_ID} .wheel-wrap {
      width: min(520px, 90vw);
      aspect-ratio: 1;

      position: relative;
      z-index: 4;

      display: grid;
      place-items: center;

      border-radius: 50%;

      background:
        linear-gradient(
          145deg,
          rgba(255,255,255,.80),
          rgba(255,255,255,.34)
        );

      border: 1px solid rgba(255,255,255,.94);

      box-shadow:
        0 35px 75px rgba(66, 71, 140, .18),
        inset 0 2px 2px rgba(255,255,255,.9),
        inset 0 -2px 6px rgba(102, 105, 184, .08);

      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
    }

    #${ROOT_ID} canvas {
      width: calc(100% - 28px);
      height: calc(100% - 28px);
      display: block;
      border-radius: 50%;
      cursor: pointer;
      touch-action: manipulation;
    }

    #${ROOT_ID} .pointer {
      position: absolute;
      z-index: 10;
      left: 50%;
      top: -5px;
      transform: translateX(-50%);

      width: 48px;
      height: 60px;

      filter:
        drop-shadow(0 8px 16px rgba(53, 56, 125, .20));
    }

    #${ROOT_ID} .pointer::before {
      content: "";
      position: absolute;
      top: 4px;
      left: 50%;
      transform: translateX(-50%);

      width: 38px;
      height: 38px;
      border-radius: 14px 14px 19px 19px;

      background:
        linear-gradient(
          145deg,
          #ffffff 5%,
          #dedfff 100%
        );

      border: 1px solid rgba(255,255,255,.9);

      box-shadow:
        inset 0 1px 1px white,
        0 8px 18px rgba(54, 54, 130, .16);
    }

    #${ROOT_ID} .pointer::after {
      content: "";
      position: absolute;
      bottom: 0px;
      left: 50%;
      transform: translateX(-50%);

      width: 0;
      height: 0;

      border-left: 10px solid transparent;
      border-right: 10px solid transparent;
      border-top: 20px solid #e7e7ff;
    }

    #${ROOT_ID} .center {
      position: absolute;
      z-index: 8;

      width: 142px;
      height: 142px;

      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;

      border-radius: 50%;

      cursor: pointer;
      user-select: none;

      color: #2b3152;

      background:
        radial-gradient(
          circle at 30% 24%,
          #ffffff 0%,
          rgba(255,255,255,.96) 25%,
          rgba(232,232,255,.86) 68%,
          rgba(219,217,255,.86) 100%
        );

      border: 1px solid rgba(255,255,255,.96);

      box-shadow:
        0 18px 38px rgba(68, 66, 150, .18),
        inset 0 2px 2px rgba(255,255,255,1),
        inset 0 -5px 12px rgba(126,117,210,.10);

      transition:
        transform .22s ease,
        box-shadow .22s ease;
    }

    #${ROOT_ID} .center:hover {
      transform: scale(1.045);
      box-shadow:
        0 22px 42px rgba(68, 66, 150, .21),
        inset 0 2px 2px white;
    }

    #${ROOT_ID} .center:active {
      transform: scale(.97);
    }

    #${ROOT_ID} .center-title {
      font-size: 17px;
      font-weight: 760;
      letter-spacing: -.025em;
    }

    #${ROOT_ID} .center-sub {
      margin-top: 5px;
      font-size: 11px;
      font-weight: 600;
      color: rgba(43,49,82,.48);
    }

    #${ROOT_ID} .spin-btn {
      margin-top: 24px;

      width: min(390px, 100%);
      height: 58px;

      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 9px;

      border: 0;
      border-radius: 19px;

      color: white;

      font-size: 17px;
      font-weight: 680;

      cursor: pointer;

      background:
        linear-gradient(
          135deg,
          #6464ef 0%,
          #7b69f1 56%,
          #9a6feb 100%
        );

      box-shadow:
        0 15px 30px rgba(96, 90, 220, .24),
        inset 0 1px 1px rgba(255,255,255,.34);

      transition:
        transform .18s ease,
        box-shadow .18s ease,
        opacity .18s ease;
    }

    #${ROOT_ID} .spin-btn:hover {
      transform: translateY(-2px);
      box-shadow:
        0 19px 37px rgba(96, 90, 220, .30),
        inset 0 1px 1px rgba(255,255,255,.34);
    }

    #${ROOT_ID} .spin-btn:active {
      transform: scale(.985);
    }

    #${ROOT_ID} .spin-btn:disabled {
      cursor: default;
      opacity: .62;
      transform: none;
    }

    #${ROOT_ID} .spark {
      position: fixed;
      z-index: 99999;

      width: 9px;
      height: 9px;

      border-radius: 999px;

      pointer-events: none;

      animation:
        eat-spark 1.15s cubic-bezier(.18,.75,.28,1)
        forwards;
    }

    @keyframes eat-float {
      from { transform: translate3d(0, 0, 0) scale(1); }
      to { transform: translate3d(18px, -24px, 0) scale(1.08); }
    }

    @keyframes eat-spark {
      0% {
        opacity: 1;
        transform:
          translate(0, 0)
          scale(1);
      }
      100% {
        opacity: 0;
        transform:
          translate(var(--x), var(--y))
          scale(.15);
      }
    }

    @media (max-width: 900px) {
      #${ROOT_ID} {
        padding: 22px 14px;
      }

      #${ROOT_ID} .shell {
        grid-template-columns: 1fr;
        gap: 14px;

        padding: 28px 20px 24px;
        border-radius: 34px;
      }

      #${ROOT_ID} .copy {
        text-align: center;
      }

      #${ROOT_ID} .eyebrow {
        margin: 0 auto;
      }

      #${ROOT_ID} h1 {
        margin-top: 18px;
        font-size: clamp(48px, 14vw, 68px);
      }

      #${ROOT_ID} .subtitle {
        margin-left: auto;
        margin-right: auto;
      }

      #${ROOT_ID} .result-box {
        text-align: left;
      }

      #${ROOT_ID} .hint {
        justify-content: center;
      }

      #${ROOT_ID} .wheel-area {
        min-height: auto;
        margin-top: 8px;
      }

      #${ROOT_ID} .wheel-wrap {
        width: min(500px, 87vw);
      }

      #${ROOT_ID} .center {
        width: 120px;
        height: 120px;
      }

      #${ROOT_ID} .center-title {
        font-size: 15px;
      }
    }

    @media (max-width: 520px) {
      #${ROOT_ID} .result-box {
        min-height: 104px;
        margin-top: 22px;
      }

      #${ROOT_ID} .result-icon {
        width: 56px;
        height: 56px;
        flex-basis: 56px;
        font-size: 28px;
        border-radius: 18px;
      }

      #${ROOT_ID} .result-value {
        font-size: 25px;
      }

      #${ROOT_ID} .center {
        width: 102px;
        height: 102px;
      }

      #${ROOT_ID} .center-title {
        font-size: 14px;
      }

      #${ROOT_ID} .center-sub {
        display: none;
      }
    }
  `;

  document.head.appendChild(style);

  // =========================
  // 3. 构建 DOM
  // =========================
  const root = document.createElement("main");
  root.id = ROOT_ID;

  root.innerHTML = `
    <div class="ambient a1"></div>
    <div class="ambient a2"></div>
    <div class="ambient a3"></div>

    <section class="shell">

      <div class="copy">
        <div class="eyebrow">
          <span class="eyebrow-dot"></span>
          DAILY DECISION
        </div>

        <h1>今天吃什么</h1>

        <p class="subtitle">
          不想决定了？把选择交给转盘。
          <br>
          今天这一顿，就让随机替你做主。
        </p>

        <div class="result-box" id="eat-result-box">
          <div class="result-icon" id="eat-result-icon">✨</div>

          <div>
            <div class="result-label">TODAY'S PICK</div>
            <div class="result-value" id="eat-result">
              等待开奖
            </div>
          </div>
        </div>

        <button class="spin-btn" id="eat-spin-btn">
          <span>🎲</span>
          <span id="eat-spin-text">帮我决定</span>
        </button>

        <div class="hint">
          点击转盘或按钮开始 · （可以反悔hh）
        </div>
      </div>

      <div class="wheel-area">

        <div class="wheel-glow"></div>

        <div class="wheel-wrap">
          <div class="pointer"></div>

          <canvas id="eat-wheel"></canvas>

          <div class="center" id="eat-center">
            <div class="center-title">转一下</div>
            <div class="center-sub">SPIN</div>
          </div>
        </div>

      </div>

    </section>
  `;

  document.body.innerHTML = "";
  document.body.appendChild(root);

  // =========================
  // 4. Canvas
  // =========================
  const canvas = root.querySelector("#eat-wheel");
  const ctx = canvas.getContext("2d");

  const spinBtn = root.querySelector("#eat-spin-btn");
  const spinText = root.querySelector("#eat-spin-text");
  const centerBtn = root.querySelector("#eat-center");

  const resultBox = root.querySelector("#eat-result-box");
  const resultText = root.querySelector("#eat-result");
  const resultIcon = root.querySelector("#eat-result-icon");

  let rotation = 0;
  let spinning = false;

  const palette = [
    ["#f7b4ce", "#f5c3dd"],
    ["#b9c6ff", "#ccd4ff"],
    ["#a8dcff", "#c5e8ff"],
    ["#bdebd6", "#d1f3e4"],
    ["#ffe0ad", "#ffebcb"],
    ["#dac6ff", "#e8ddff"]
  ];

  const TAU = Math.PI * 2;

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    drawWheel();
  }

  function drawWheel() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    if (!w || !h) return;

    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;

    const radius = Math.min(w, h) / 2 - 8;

    const count = foods.length;
    const arc = TAU / count;

    ctx.save();

    // 外围柔光
    ctx.shadowColor = "rgba(99, 100, 210, .16)";
    ctx.shadowBlur = 24;

    for (let i = 0; i < count; i++) {
      const start =
        rotation +
        i * arc -
        Math.PI / 2;

      const end = start + arc;

      const [c1, c2] =
        palette[i % palette.length];

      const grad =
        ctx.createRadialGradient(
          cx,
          cy,
          radius * 0.2,
          cx,
          cy,
          radius
        );

      grad.addColorStop(0, "#fdfdff");
      grad.addColorStop(.38, c1);
      grad.addColorStop(1, c2);

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(
        cx,
        cy,
        radius,
        start,
        end
      );
      ctx.closePath();

      ctx.fillStyle = grad;
      ctx.fill();

      ctx.strokeStyle =
        "rgba(255,255,255,.72)";
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }

    ctx.restore();

    // 外圈
    ctx.beginPath();
    ctx.arc(
      cx,
      cy,
      radius,
      0,
      TAU
    );

    ctx.strokeStyle =
      "rgba(255,255,255,.92)";
    ctx.lineWidth = 3;
    ctx.stroke();

    // 食物文字
    for (let i = 0; i < count; i++) {
      const angle =
        rotation +
        (i + .5) * arc -
        Math.PI / 2;

      const textRadius =
        radius * .72;

      const x =
        cx +
        Math.cos(angle) *
          textRadius;

      const y =
        cy +
        Math.sin(angle) *
          textRadius;

      ctx.save();

      ctx.translate(x, y);

      // 文字始终朝向较易阅读方向
      let textAngle =
        angle + Math.PI / 2;

      if (
        textAngle >
          Math.PI / 2 &&
        textAngle <
          Math.PI * 1.5
      ) {
        textAngle += Math.PI;
      }

      ctx.rotate(textAngle);

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const fontSize =
        radius > 220
          ? 15
          : 12;

      ctx.font =
        `700 ${fontSize}px ` +
        `-apple-system, BlinkMacSystemFont, ` +
        `"PingFang SC", sans-serif`;

      ctx.fillStyle =
        "rgba(30, 39, 70, .88)";

      ctx.fillText(
        foods[i],
        0,
        0
      );

      ctx.restore();
    }

    // 中央半透明环
    ctx.beginPath();
    ctx.arc(
      cx,
      cy,
      radius * .30,
      0,
      TAU
    );

    ctx.fillStyle =
      "rgba(255,255,255,.28)";
    ctx.fill();

    ctx.strokeStyle =
      "rgba(255,255,255,.62)";
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  // =========================
  // 5. 转盘逻辑
  // =========================
  function normalizeAngle(angle) {
    return (
      ((angle % TAU) + TAU) %
      TAU
    );
  }

  function randomIndex() {
    return Math.floor(
      Math.random() * foods.length
    );
  }

  function spin() {
    if (spinning) return;

    spinning = true;

    spinBtn.disabled = true;
    spinText.textContent = "决定中…";

    resultBox.classList.remove(
      "active"
    );

    const selected =
      randomIndex();

    const arc =
      TAU / foods.length;

    // 让被选中的扇区中心最终停在顶部指针
    const desired =
      -(
        selected +
        0.5
      ) *
      arc;

    const start =
      rotation;

    const difference =
      normalizeAngle(
        desired -
        normalizeAngle(start)
      );

    const rounds =
      5 +
      Math.floor(
        Math.random() * 4
      );

    const delta =
      rounds * TAU +
      difference;

    const duration =
      4000 +
      Math.random() * 900;

    const startTime =
      performance.now();

    function easeOutQuint(t) {
      return (
        1 -
        Math.pow(
          1 - t,
          5
        )
      );
    }

    function frame(now) {
      const elapsed =
        now -
        startTime;

      const t =
        Math.min(
          elapsed /
            duration,
          1
        );

      const eased =
        easeOutQuint(t);

      rotation =
        start +
        delta * eased;

      drawWheel();

      if (t < 1) {
        requestAnimationFrame(
          frame
        );
      } else {
        rotation =
          normalizeAngle(
            desired
          );

        drawWheel();

        finishSpin(
          selected
        );
      }
    }

    requestAnimationFrame(frame);
  }

  function finishSpin(index) {
    const food =
      foods[index];

    resultText.textContent =
      `今天吃「${food}」`;

    resultIcon.textContent =
      foodEmoji[food] || "🍽️";

    resultBox.classList.add(
      "active"
    );

    spinBtn.disabled = false;
    spinText.textContent = "不满意？再来一次";

    spinning = false;

    celebrate();
  }

  // =========================
  // 6. 小粒子效果
  // =========================
  function celebrate() {
    const colors = [
      "#7c74f4",
      "#b886ef",
      "#75c8ff",
      "#ff9fc9",
      "#ffd48e",
      "#7edab2"
    ];

    const rect =
      resultBox.getBoundingClientRect();

    const originX =
      rect.left +
      rect.width / 2;

    const originY =
      rect.top +
      rect.height / 2;

    for (
      let i = 0;
      i < 26;
      i++
    ) {
      const spark =
        document.createElement(
          "span"
        );

      spark.className =
        "spark";

      spark.style.left =
        `${originX}px`;

      spark.style.top =
        `${originY}px`;

      spark.style.background =
        colors[
          Math.floor(
            Math.random() *
              colors.length
          )
        ];

      const angle =
        Math.random() *
        TAU;

      const distance =
        50 +
        Math.random() *
          140;

      spark.style.setProperty(
        "--x",
        `${Math.cos(angle) * distance}px`
      );

      spark.style.setProperty(
        "--y",
        `${Math.sin(angle) * distance}px`
      );

      document.body.appendChild(
        spark
      );

      setTimeout(
        () =>
          spark.remove(),
        1300
      );
    }
  }

  // =========================
  // 7. 事件
  // =========================
  spinBtn.addEventListener(
    "click",
    spin
  );

  centerBtn.addEventListener(
    "click",
    spin
  );

  canvas.addEventListener(
    "click",
    spin
  );

  window.addEventListener(
    "resize",
    resizeCanvas
  );

  // =========================
  // 8. 初始化
  // =========================
  requestAnimationFrame(
    resizeCanvas
  );
})();