(() => {
  const APP_ID = 'pool-lab-inject';
  const STYLE_ID = `${APP_ID}-style`;

  document.getElementById(APP_ID)?.remove();
  document.getElementById(STYLE_ID)?.remove();

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    :root {
      --pool-bg: #06110f;
      --pool-bg-2: #0b1916;
      --pool-glass: rgba(255,255,255,.075);
      --pool-line: rgba(255,255,255,.12);
      --pool-ink: #f5f8f7;
      --pool-muted: rgba(241,247,245,.52);
      --pool-gold: #d9ba78;
      --pool-green: #5cc69a;
    }

    * { box-sizing: border-box; }
    html, body { margin: 0; width: 100%; min-height: 100%; }
    body { overflow: hidden; }

    #${APP_ID} {
      min-height: 100vh;
      width: 100%;
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 22px;
      color: var(--pool-ink);
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "PingFang SC", "Helvetica Neue", Arial, sans-serif;
      background:
        radial-gradient(circle at 50% -12%, rgba(91,153,132,.22), transparent 34%),
        radial-gradient(circle at 8% 20%, rgba(91,118,176,.10), transparent 28%),
        radial-gradient(circle at 90% 82%, rgba(177,134,77,.09), transparent 30%),
        linear-gradient(145deg, #06100d 0%, #0b1513 46%, #070d0c 100%);
    }

    #${APP_ID}::before {
      content: "";
      position: absolute;
      inset: 0;
      pointer-events: none;
      opacity: .15;
      background-image:
        linear-gradient(rgba(255,255,255,.022) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,.018) 1px, transparent 1px);
      background-size: 42px 42px;
      mask-image: linear-gradient(to bottom, rgba(0,0,0,.8), transparent 82%);
    }

    #${APP_ID} .ambient {
      position: absolute;
      border-radius: 999px;
      filter: blur(78px);
      pointer-events: none;
      opacity: .26;
    }
    #${APP_ID} .ambient.a1 { width: 430px; height: 430px; left: -180px; top: -140px; background: #35665b; }
    #${APP_ID} .ambient.a2 { width: 340px; height: 340px; right: -130px; top: 16%; background: #3d506c; opacity: .17; }
    #${APP_ID} .ambient.a3 { width: 420px; height: 420px; right: 5%; bottom: -260px; background: #76562d; opacity: .13; }

    #${APP_ID} .shell {
      width: min(1320px, 100%);
      height: min(850px, calc(100vh - 44px));
      min-height: 690px;
      position: relative;
      z-index: 2;
      display: grid;
      grid-template-rows: auto minmax(0, 1fr) auto;
      gap: 14px;
      padding: 16px;
      border-radius: 38px;
      background: linear-gradient(135deg, rgba(255,255,255,.082), rgba(255,255,255,.034));
      border: 1px solid rgba(255,255,255,.12);
      box-shadow: 0 42px 110px rgba(0,0,0,.36), inset 0 1px rgba(255,255,255,.10);
      backdrop-filter: blur(34px) saturate(125%);
      -webkit-backdrop-filter: blur(34px) saturate(125%);
    }

    #${APP_ID} .glass {
      background: linear-gradient(145deg, rgba(255,255,255,.08), rgba(255,255,255,.035));
      border: 1px solid rgba(255,255,255,.10);
      box-shadow: inset 0 1px rgba(255,255,255,.08), 0 18px 48px rgba(0,0,0,.12);
      backdrop-filter: blur(24px) saturate(120%);
      -webkit-backdrop-filter: blur(24px) saturate(120%);
    }

    #${APP_ID} .topbar {
      min-height: 78px;
      display: flex;
      align-items: center;
      gap: 20px;
      padding: 12px 16px;
      border-radius: 24px;
    }

    #${APP_ID} .brand { min-width: 260px; }
    #${APP_ID} .eyebrow {
      color: var(--pool-gold);
      font-size: 10px;
      font-weight: 780;
      letter-spacing: .18em;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    #${APP_ID} .eyebrow::before {
      content: "";
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--pool-gold);
      box-shadow: 0 0 14px rgba(217,186,120,.34);
    }
    #${APP_ID} .title {
      margin-top: 6px;
      font-size: 27px;
      font-weight: 760;
      letter-spacing: -.045em;
    }
    #${APP_ID} .subtitle {
      margin-top: 2px;
      color: var(--pool-muted);
      font-size: 11px;
      font-weight: 560;
    }

    #${APP_ID} .stats {
      flex: 1;
      display: grid;
      grid-template-columns: repeat(4, minmax(100px, 1fr));
      gap: 9px;
    }
    #${APP_ID} .stat {
      min-height: 53px;
      padding: 10px 12px;
      border-radius: 16px;
      background: rgba(255,255,255,.042);
      border: 1px solid rgba(255,255,255,.072);
    }
    #${APP_ID} .stat-label { color: rgba(242,247,245,.36); font-size: 9px; font-weight: 720; letter-spacing: .12em; }
    #${APP_ID} .stat-value { margin-top: 4px; font-size: 18px; font-weight: 720; }

    #${APP_ID} .top-actions { display: flex; gap: 8px; }
    #${APP_ID} .icon-btn,
    #${APP_ID} .reset-btn {
      height: 44px;
      border-radius: 14px;
      border: 1px solid rgba(255,255,255,.10);
      color: rgba(255,255,255,.84);
      background: rgba(255,255,255,.06);
      font-size: 12px;
      font-weight: 680;
      cursor: pointer;
      transition: transform .17s ease, background .17s ease;
    }
    #${APP_ID} .icon-btn { width: 44px; padding: 0; font-size: 16px; }
    #${APP_ID} .reset-btn { padding: 0 16px; }
    #${APP_ID} .icon-btn:hover,
    #${APP_ID} .reset-btn:hover { transform: translateY(-2px); background: rgba(255,255,255,.10); }
    #${APP_ID} .icon-btn.active { color: #102018; background: linear-gradient(135deg, #d9c48d, #b89354); }

    #${APP_ID} .stage {
      min-height: 0;
      position: relative;
      overflow: hidden;
      border-radius: 28px;
      background:
        radial-gradient(ellipse at 50% 45%, rgba(76,142,116,.10), transparent 48%),
        linear-gradient(180deg, rgba(255,255,255,.028), rgba(0,0,0,.08));
      border: 1px solid rgba(255,255,255,.07);
    }

    #${APP_ID} .stage::after {
      content: "";
      position: absolute;
      inset: 0;
      pointer-events: none;
      background: radial-gradient(circle at 50% 45%, rgba(255,255,255,.045), transparent 50%);
    }

    #${APP_ID} .canvas-wrap {
      position: absolute;
      inset: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    #${APP_ID} canvas {
      width: 100%;
      height: 100%;
      display: block;
      touch-action: none;
      cursor: crosshair;
    }

    #${APP_ID} .floating-tip {
      position: absolute;
      left: 50%;
      top: 20px;
      transform: translateX(-50%);
      z-index: 8;
      padding: 9px 13px;
      border-radius: 999px;
      color: rgba(255,255,255,.70);
      background: rgba(4,18,14,.38);
      border: 1px solid rgba(255,255,255,.10);
      backdrop-filter: blur(14px);
      font-size: 11px;
      font-weight: 650;
      pointer-events: none;
      transition: opacity .2s ease;
    }

    #${APP_ID} .bottom {
      min-height: 72px;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      gap: 14px;
      padding: 10px 14px;
      border-radius: 22px;
    }

    #${APP_ID} .status-main { font-size: 13px; font-weight: 700; }
    #${APP_ID} .status-sub { margin-top: 4px; color: var(--pool-muted); font-size: 11px; line-height: 1.5; }

    #${APP_ID} .power-block {
      min-width: 320px;
      display: grid;
      grid-template-columns: auto 1fr auto;
      align-items: center;
      gap: 10px;
    }
    #${APP_ID} .power-label { color: rgba(255,255,255,.42); font-size: 9px; font-weight: 760; letter-spacing: .12em; }
    #${APP_ID} .power-track {
      height: 8px;
      border-radius: 999px;
      overflow: hidden;
      background: rgba(255,255,255,.075);
      border: 1px solid rgba(255,255,255,.06);
    }
    #${APP_ID} .power-fill {
      width: 0%;
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, #71c69e 0%, #d7bd7a 58%, #ed7b72 100%);
      transition: width .06s linear;
    }
    #${APP_ID} .power-value { min-width: 34px; text-align: right; color: rgba(255,255,255,.64); font-size: 11px; font-weight: 700; }

    #${APP_ID} .toast {
      position: absolute;
      z-index: 20;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%) scale(.94);
      min-width: 250px;
      padding: 18px 22px;
      border-radius: 22px;
      text-align: center;
      color: var(--pool-ink);
      background: linear-gradient(145deg, rgba(20,33,29,.88), rgba(8,17,14,.82));
      border: 1px solid rgba(217,186,120,.19);
      box-shadow: 0 24px 60px rgba(0,0,0,.36), inset 0 1px rgba(255,255,255,.08);
      backdrop-filter: blur(24px);
      opacity: 0;
      pointer-events: none;
      transition: opacity .22s ease, transform .22s ease;
    }
    #${APP_ID} .toast.show { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    #${APP_ID} .toast-kicker { color: var(--pool-gold); font-size: 9px; font-weight: 760; letter-spacing: .16em; }
    #${APP_ID} .toast-title { margin-top: 5px; font-size: 22px; font-weight: 760; }
    #${APP_ID} .toast-sub { margin-top: 4px; color: var(--pool-muted); font-size: 11px; }

    @media (max-width: 900px) {
      body { overflow: auto; }
      #${APP_ID} { padding: 10px; align-items: flex-start; }
      #${APP_ID} .shell { height: auto; min-height: 760px; border-radius: 28px; padding: 10px; }
      #${APP_ID} .topbar { flex-wrap: wrap; }
      #${APP_ID} .brand { min-width: 100%; }
      #${APP_ID} .stats { order: 3; width: 100%; grid-template-columns: repeat(4, 1fr); }
      #${APP_ID} .stage { min-height: 500px; }
      #${APP_ID} .bottom { grid-template-columns: 1fr; }
      #${APP_ID} .power-block { min-width: 0; width: 100%; }
    }

    @media (max-width: 560px) {
      #${APP_ID} .stats { grid-template-columns: repeat(2, 1fr); }
      #${APP_ID} .stage { min-height: 430px; }
      #${APP_ID} .title { font-size: 23px; }
      #${APP_ID} .subtitle { display: none; }
      #${APP_ID} .reset-btn { padding: 0 12px; }
    }
  `;
  document.head.appendChild(style);

  const root = document.createElement('main');
  root.id = APP_ID;
  root.innerHTML = `
    <div class="ambient a1"></div><div class="ambient a2"></div><div class="ambient a3"></div>
    <section class="shell">
      <header class="topbar glass">
        <div class="brand">
          <div class="eyebrow">Pool Lab · Practice Mode</div>
          <div class="title">台球模拟器</div>
          <div class="subtitle">拖动母球向后蓄力，松手击球。纯前端物理模拟。</div>
        </div>
        <div class="stats">
          <div class="stat"><div class="stat-label">POCKETED</div><div class="stat-value" id="pool-pocketed">0 / 15</div></div>
          <div class="stat"><div class="stat-label">SHOTS</div><div class="stat-value" id="pool-shots">0</div></div>
          <div class="stat"><div class="stat-label">STREAK</div><div class="stat-value" id="pool-streak">0</div></div>
          <div class="stat"><div class="stat-label">LAST</div><div class="stat-value" id="pool-last">—</div></div>
        </div>
        <div class="top-actions">
          <button class="icon-btn active" id="pool-guide" title="辅助线">◎</button>
          <button class="reset-btn" id="pool-reset">重新开球</button>
        </div>
      </header>

      <section class="stage">
        <div class="floating-tip" id="pool-tip">按住母球向后拖动 · 松手击球</div>
        <div class="canvas-wrap"><canvas id="pool-canvas"></canvas></div>
        <div class="toast" id="pool-toast">
          <div class="toast-kicker">POOL LAB</div>
          <div class="toast-title" id="pool-toast-title"></div>
          <div class="toast-sub" id="pool-toast-sub"></div>
        </div>
      </section>

      <footer class="bottom glass">
        <div>
          <div class="status-main" id="pool-status">准备击球</div>
          <div class="status-sub" id="pool-status-sub">点击并拖动白色母球，向后拉得越远，击球力量越大。</div>
        </div>
        <div class="power-block">
          <div class="power-label">POWER</div>
          <div class="power-track"><div class="power-fill" id="pool-power"></div></div>
          <div class="power-value" id="pool-power-value">0%</div>
        </div>
      </footer>
    </section>
  `;

  document.body.innerHTML = '';
  document.body.appendChild(root);

  const canvas = root.querySelector('#pool-canvas');
  const ctx = canvas.getContext('2d');
  const els = {
    pocketed: root.querySelector('#pool-pocketed'),
    shots: root.querySelector('#pool-shots'),
    streak: root.querySelector('#pool-streak'),
    last: root.querySelector('#pool-last'),
    guide: root.querySelector('#pool-guide'),
    reset: root.querySelector('#pool-reset'),
    tip: root.querySelector('#pool-tip'),
    status: root.querySelector('#pool-status'),
    statusSub: root.querySelector('#pool-status-sub'),
    power: root.querySelector('#pool-power'),
    powerValue: root.querySelector('#pool-power-value'),
    toast: root.querySelector('#pool-toast'),
    toastTitle: root.querySelector('#pool-toast-title'),
    toastSub: root.querySelector('#pool-toast-sub')
  };

  // ---------- World ----------
  const WORLD = { w: 1000, h: 540 };
  const PLAY = { left: 78, right: 922, top: 76, bottom: 464 };
  const BALL_R = 11.5;
  const POCKET_R = 27;
  const pockets = [
    { x: PLAY.left, y: PLAY.top },
    { x: (PLAY.left + PLAY.right) / 2, y: PLAY.top - 2 },
    { x: PLAY.right, y: PLAY.top },
    { x: PLAY.left, y: PLAY.bottom },
    { x: (PLAY.left + PLAY.right) / 2, y: PLAY.bottom + 2 },
    { x: PLAY.right, y: PLAY.bottom }
  ];

  const ballColors = {
    1: '#e7c64a', 2: '#356ac3', 3: '#d74949', 4: '#684aa5', 5: '#e68634', 6: '#3a9157', 7: '#7d2e36',
    8: '#161616', 9: '#e7c64a', 10: '#356ac3', 11: '#d74949', 12: '#684aa5', 13: '#e68634', 14: '#3a9157', 15: '#7d2e36'
  };

  let balls = [];
  let guideOn = true;
  let dragging = false;
  let dragPoint = null;
  let power = 0;
  let shots = 0;
  let streak = 0;
  let lastPocket = '—';
  let currentShotPocketed = 0;
  let shotInProgress = false;
  let scratchPending = false;
  let lastFrame = performance.now();
  let soundOn = true;
  let audioCtx = null;

  function makeBall(n, x, y) {
    return {
      n, x, y, vx: 0, vy: 0,
      r: BALL_R,
      cue: n === 0,
      stripe: n >= 9,
      color: n === 0 ? '#f7f7f5' : ballColors[n],
      pocketed: false
    };
  }

  function resetGame() {
    balls = [];
    const cue = makeBall(0, 280, 270);
    balls.push(cue);

    const order = [1, 10, 2, 11, 8, 3, 12, 4, 13, 5, 14, 6, 15, 7, 9];
    const rackX = 700;
    const rackY = 270;
    const dx = BALL_R * 1.78;
    const dy = BALL_R * 2.06;
    let k = 0;
    for (let row = 0; row < 5; row++) {
      for (let j = 0; j <= row; j++) {
        const x = rackX + row * dx;
        const y = rackY + (j - row / 2) * dy;
        balls.push(makeBall(order[k++], x, y));
      }
    }

    shots = 0;
    streak = 0;
    lastPocket = '—';
    currentShotPocketed = 0;
    shotInProgress = false;
    scratchPending = false;
    dragging = false;
    dragPoint = null;
    setPower(0);
    updateHUD();
    setStatus('准备击球', '按住白色母球向后拖动，松手完成击球。');
    showToast('新球局已摆好', '拖动母球开始第一杆');
  }

  function cueBall() { return balls.find(b => b.cue && !b.pocketed); }
  function activeBalls() { return balls.filter(b => !b.pocketed); }
  function objectPocketedCount() { return balls.filter(b => !b.cue && b.pocketed).length; }

  // ---------- Rendering ----------
  let cssW = 0, cssH = 0, scale = 1, offX = 0, offY = 0;

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    cssW = rect.width;
    cssH = rect.height;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    scale = Math.min(cssW / WORLD.w, cssH / WORLD.h);
    offX = (cssW - WORLD.w * scale) / 2;
    offY = (cssH - WORLD.h * scale) / 2;
  }

  function screenToWorld(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    return {
      x: (clientX - r.left - offX) / scale,
      y: (clientY - r.top - offY) / scale
    };
  }

  function draw() {
    ctx.clearRect(0, 0, cssW, cssH);
    ctx.save();
    ctx.translate(offX, offY);
    ctx.scale(scale, scale);

    drawTable();
    drawAim();
    for (const b of balls) if (!b.pocketed) drawBall(b);
    drawCueStick();

    ctx.restore();
  }

  function roundRectPath(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawTable() {
    // Outer frame
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.46)';
    ctx.shadowBlur = 34;
    ctx.shadowOffsetY = 18;
    roundRectPath(32, 28, 936, 484, 58);
    const wood = ctx.createLinearGradient(40, 30, 960, 510);
    wood.addColorStop(0, '#30291f');
    wood.addColorStop(.45, '#171b18');
    wood.addColorStop(1, '#3a3021');
    ctx.fillStyle = wood;
    ctx.fill();
    ctx.restore();

    // champagne inner trim
    roundRectPath(50, 46, 900, 448, 47);
    const trim = ctx.createLinearGradient(50, 50, 950, 494);
    trim.addColorStop(0, '#c8aa70');
    trim.addColorStop(.3, '#6e5b3a');
    trim.addColorStop(.7, '#b7985e');
    trim.addColorStop(1, '#493d2b');
    ctx.fillStyle = trim;
    ctx.fill();

    // dark rails
    roundRectPath(59, 55, 882, 430, 43);
    ctx.fillStyle = '#101a17';
    ctx.fill();

    // felt
    roundRectPath(PLAY.left - 2, PLAY.top - 2, PLAY.right - PLAY.left + 4, PLAY.bottom - PLAY.top + 4, 31);
    const felt = ctx.createRadialGradient(500, 240, 60, 500, 270, 500);
    felt.addColorStop(0, '#2f8267');
    felt.addColorStop(.52, '#1d654f');
    felt.addColorStop(1, '#124334');
    ctx.fillStyle = felt;
    ctx.fill();

    // fine felt grain
    ctx.save();
    ctx.globalAlpha = .08;
    for (let i = 0; i < 70; i++) {
      const y = PLAY.top + (i / 70) * (PLAY.bottom - PLAY.top);
      ctx.strokeStyle = i % 2 ? '#ffffff' : '#082a20';
      ctx.lineWidth = .45;
      ctx.beginPath();
      ctx.moveTo(PLAY.left + 10, y);
      ctx.lineTo(PLAY.right - 10, y + Math.sin(i) * 1.5);
      ctx.stroke();
    }
    ctx.restore();

    // head string + spot
    ctx.strokeStyle = 'rgba(255,255,255,.12)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 7]);
    ctx.beginPath();
    ctx.moveTo(315, PLAY.top + 18);
    ctx.lineTo(315, PLAY.bottom - 18);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(700, 270, 3.2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,.25)';
    ctx.fill();

    // pockets
    for (const p of pockets) {
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,.62)';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(p.x, p.y, POCKET_R + 4, 0, Math.PI * 2);
      ctx.fillStyle = '#080b0a';
      ctx.fill();
      ctx.restore();
      ctx.beginPath();
      ctx.arc(p.x, p.y, POCKET_R - 4, 0, Math.PI * 2);
      ctx.fillStyle = '#020504';
      ctx.fill();
    }

    // tiny branding
    ctx.fillStyle = 'rgba(255,255,255,.09)';
    ctx.font = '700 16px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('POOL LAB', 500, 280);
  }

  function drawBall(b) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.shadowColor = 'rgba(0,0,0,.35)';
    ctx.shadowBlur = 7;
    ctx.shadowOffsetY = 3;

    const grad = ctx.createRadialGradient(-4, -5, 1, 0, 0, b.r + 2);
    if (b.cue) {
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(.7, '#efefea');
      grad.addColorStop(1, '#cfcfc8');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(0, 0, b.r, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      return;
    }

    if (b.stripe) {
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(.72, '#eeeeea');
      grad.addColorStop(1, '#ccccca');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(0, 0, b.r, 0, Math.PI * 2); ctx.fill();
      ctx.save();
      ctx.beginPath(); ctx.arc(0, 0, b.r - 1, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = b.color;
      ctx.fillRect(-b.r, -4.7, b.r * 2, 9.4);
      ctx.restore();
    } else {
      grad.addColorStop(0, lighten(b.color, .32));
      grad.addColorStop(.72, b.color);
      grad.addColorStop(1, darken(b.color, .30));
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(0, 0, b.r, 0, Math.PI * 2); ctx.fill();
    }

    ctx.shadowColor = 'transparent';
    ctx.beginPath();
    ctx.arc(0, 0, 5.2, 0, Math.PI * 2);
    ctx.fillStyle = '#f4f4ef';
    ctx.fill();
    ctx.fillStyle = '#1b1d1c';
    ctx.font = '700 7px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(b.n), 0, .4);

    ctx.restore();
  }

  function drawAim() {
    const cue = cueBall();
    if (!cue || !dragging || !dragPoint) return;

    const dx = cue.x - dragPoint.x;
    const dy = cue.y - dragPoint.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;

    if (guideOn) {
      ctx.save();
      ctx.strokeStyle = 'rgba(238,230,201,.68)';
      ctx.lineWidth = 1.3;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(cue.x + ux * 18, cue.y + uy * 18);
      ctx.lineTo(cue.x + ux * 270, cue.y + uy * 270);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(cue.x + ux * 270, cue.y + uy * 270, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(238,230,201,.75)';
      ctx.fill();
      ctx.restore();
    }
  }

  function drawCueStick() {
    const cue = cueBall();
    if (!cue || !dragging || !dragPoint) return;

    const dx = cue.x - dragPoint.x;
    const dy = cue.y - dragPoint.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const pull = Math.min(170, len);

    // cue stick is behind the ball relative to shot direction
    const sx = cue.x - ux * (25 + pull * .6);
    const sy = cue.y - uy * (25 + pull * .6);
    const ex = cue.x - ux * (210 + pull * .6);
    const ey = cue.y - uy * (210 + pull * .6);

    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#c99c63';
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.strokeStyle = '#efe6d0';
    ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - ux * 24, sy - uy * 24); ctx.stroke();
    ctx.restore();
  }

  function lighten(hex, amount) { return shade(hex, Math.abs(amount)); }
  function darken(hex, amount) { return shade(hex, -Math.abs(amount)); }
  function shade(hex, amt) {
    const c = hex.replace('#','');
    const n = parseInt(c,16);
    let r=(n>>16)&255, g=(n>>8)&255, b=n&255;
    const target = amt >= 0 ? 255 : 0;
    const p = Math.abs(amt);
    r = Math.round(r + (target-r)*p); g = Math.round(g + (target-g)*p); b = Math.round(b + (target-b)*p);
    return `rgb(${r},${g},${b})`;
  }

  // ---------- Physics ----------
  function allStopped() {
    return activeBalls().every(b => Math.hypot(b.vx, b.vy) < 4);
  }

  function step(dt) {
    const subSteps = 3;
    const h = dt / subSteps;
    for (let s = 0; s < subSteps; s++) {
      for (const b of activeBalls()) {
        b.x += b.vx * h;
        b.y += b.vy * h;

        // pocket first
        const pocket = pockets.find(p => Math.hypot(b.x - p.x, b.y - p.y) < POCKET_R - 1);
        if (pocket) {
          pocketBall(b);
          continue;
        }

        // cushions
        const nearTopPocket = pockets.some(p => Math.abs(p.y - PLAY.top) < 6 && Math.abs(b.x - p.x) < POCKET_R + 9);
        const nearBottomPocket = pockets.some(p => Math.abs(p.y - PLAY.bottom) < 6 && Math.abs(b.x - p.x) < POCKET_R + 9);
        const nearLeftPocket = pockets.some(p => Math.abs(p.x - PLAY.left) < 6 && Math.abs(b.y - p.y) < POCKET_R + 9);
        const nearRightPocket = pockets.some(p => Math.abs(p.x - PLAY.right) < 6 && Math.abs(b.y - p.y) < POCKET_R + 9);

        if (b.y - b.r < PLAY.top && !nearTopPocket) {
          b.y = PLAY.top + b.r; b.vy = Math.abs(b.vy) * .91; playTick(.07);
        }
        if (b.y + b.r > PLAY.bottom && !nearBottomPocket) {
          b.y = PLAY.bottom - b.r; b.vy = -Math.abs(b.vy) * .91; playTick(.07);
        }
        if (b.x - b.r < PLAY.left && !nearLeftPocket) {
          b.x = PLAY.left + b.r; b.vx = Math.abs(b.vx) * .91; playTick(.07);
        }
        if (b.x + b.r > PLAY.right && !nearRightPocket) {
          b.x = PLAY.right - b.r; b.vx = -Math.abs(b.vx) * .91; playTick(.07);
        }

        const friction = Math.pow(.986, h * 60);
        b.vx *= friction;
        b.vy *= friction;
        if (Math.hypot(b.vx,b.vy) < 3.2) { b.vx = 0; b.vy = 0; }
      }

      const live = activeBalls();
      for (let i = 0; i < live.length; i++) {
        for (let j = i + 1; j < live.length; j++) resolveCollision(live[i], live[j]);
      }
    }
  }

  function resolveCollision(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy);
    const minDist = a.r + b.r;
    if (!dist || dist >= minDist) return;

    const nx = dx / dist, ny = dy / dist;
    const overlap = minDist - dist;
    a.x -= nx * overlap * .5; a.y -= ny * overlap * .5;
    b.x += nx * overlap * .5; b.y += ny * overlap * .5;

    const rvx = b.vx - a.vx;
    const rvy = b.vy - a.vy;
    const rel = rvx * nx + rvy * ny;
    if (rel > 0) return;

    const restitution = .975;
    const impulse = -(1 + restitution) * rel / 2;
    a.vx -= impulse * nx; a.vy -= impulse * ny;
    b.vx += impulse * nx; b.vy += impulse * ny;

    const impact = Math.min(1, Math.abs(rel) / 700);
    if (impact > .08) playTick(impact * .11);
  }

  function pocketBall(b) {
    if (b.pocketed) return;
    b.pocketed = true;
    b.vx = b.vy = 0;
    playPocket();

    if (b.cue) {
      scratchPending = true;
      lastPocket = '母球落袋';
      showToast('母球落袋', '球停稳后自动复位');
    } else {
      currentShotPocketed++;
      lastPocket = `${b.n} 号球`;
      showToast(`${b.n} 号球进袋`, currentShotPocketed > 1 ? `本杆已连续进 ${currentShotPocketed} 球` : '漂亮的一杆');
    }
    updateHUD();
  }

  function afterMotionStopped() {
    if (!shotInProgress) return;
    shotInProgress = false;

    if (currentShotPocketed > 0) streak += currentShotPocketed;
    else streak = 0;

    if (scratchPending) respawnCue();
    currentShotPocketed = 0;
    scratchPending = false;
    updateHUD();

    if (objectPocketedCount() >= 15) {
      setStatus('清台完成', `共用 ${shots} 杆完成全部 15 颗目标球。`);
      showToast('清台完成', `${shots} 杆 · 点击“重新开球”再来一局`);
    } else {
      setStatus('准备下一杆', '拖动母球向后蓄力，继续击球。');
    }
  }

  function respawnCue() {
    const cue = balls.find(b => b.cue);
    if (!cue) return;
    cue.pocketed = false;
    cue.vx = cue.vy = 0;
    const candidates = [
      {x: 270, y: 270}, {x: 250, y: 230}, {x: 250, y: 310}, {x: 220, y: 270}
    ];
    const pos = candidates.find(p => balls.filter(b => !b.pocketed && !b.cue).every(o => Math.hypot(o.x-p.x,o.y-p.y) > BALL_R*2.4)) || candidates[0];
    cue.x = pos.x; cue.y = pos.y;
  }

  // ---------- Interaction ----------
  function setPower(v) {
    power = Math.max(0, Math.min(100, v));
    els.power.style.width = `${power}%`;
    els.powerValue.textContent = `${Math.round(power)}%`;
  }

  function pointerDown(e) {
    if (!allStopped() || objectPocketedCount() >= 15) return;
    const cue = cueBall();
    if (!cue) return;
    const p = screenToWorld(e.clientX, e.clientY);
    if (Math.hypot(p.x - cue.x, p.y - cue.y) > 48) return;
    dragging = true;
    dragPoint = p;
    setPower(0);
    canvas.setPointerCapture?.(e.pointerId);
    els.tip.style.opacity = .35;
  }

  function pointerMove(e) {
    if (!dragging) return;
    const cue = cueBall();
    if (!cue) return;
    dragPoint = screenToWorld(e.clientX, e.clientY);
    const d = Math.min(180, Math.hypot(cue.x - dragPoint.x, cue.y - dragPoint.y));
    setPower(d / 180 * 100);
  }

  function pointerUp(e) {
    if (!dragging) return;
    dragging = false;
    els.tip.style.opacity = 1;
    const cue = cueBall();
    if (!cue || !dragPoint) { dragPoint = null; setPower(0); return; }

    const dx = cue.x - dragPoint.x;
    const dy = cue.y - dragPoint.y;
    const len = Math.hypot(dx, dy);
    if (len < 10) { dragPoint = null; setPower(0); return; }

    const shotPower = Math.min(1, len / 180);
    const speed = 280 + shotPower * 860;
    cue.vx = dx / len * speed;
    cue.vy = dy / len * speed;

    shots++;
    currentShotPocketed = 0;
    shotInProgress = true;
    setStatus('球正在运动', '等待所有球停稳后可进行下一杆。');
    playCue(shotPower);
    dragPoint = null;
    setPower(0);
    updateHUD();
  }

  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('pointercancel', pointerUp);

  els.guide.addEventListener('click', () => {
    guideOn = !guideOn;
    els.guide.classList.toggle('active', guideOn);
    els.guide.textContent = guideOn ? '◎' : '○';
  });
  els.reset.addEventListener('click', resetGame);
  window.addEventListener('resize', resizeCanvas);

  // ---------- Audio (generated, no assets) ----------
  function ensureAudio() {
    if (!soundOn) return null;
    if (!audioCtx) {
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) { return null; }
    }
    return audioCtx;
  }

  function playTick(volume=.05) {
    const ac = ensureAudio(); if (!ac) return;
    const osc = ac.createOscillator(); const gain = ac.createGain();
    osc.type = 'triangle'; osc.frequency.value = 720;
    gain.gain.setValueAtTime(volume, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(.0001, ac.currentTime + .045);
    osc.connect(gain); gain.connect(ac.destination); osc.start(); osc.stop(ac.currentTime + .05);
  }

  function playCue(p=.5) {
    const ac = ensureAudio(); if (!ac) return;
    const osc = ac.createOscillator(); const gain = ac.createGain();
    osc.type = 'sine'; osc.frequency.setValueAtTime(155 + p*50, ac.currentTime);
    gain.gain.setValueAtTime(.07 + p*.07, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(.0001, ac.currentTime + .08);
    osc.connect(gain); gain.connect(ac.destination); osc.start(); osc.stop(ac.currentTime + .09);
  }

  function playPocket() {
    const ac = ensureAudio(); if (!ac) return;
    const osc = ac.createOscillator(); const gain = ac.createGain();
    osc.type = 'sine'; osc.frequency.setValueAtTime(125, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(62, ac.currentTime + .18);
    gain.gain.setValueAtTime(.09, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(.0001, ac.currentTime + .20);
    osc.connect(gain); gain.connect(ac.destination); osc.start(); osc.stop(ac.currentTime + .22);
  }

  // ---------- UI ----------
  function updateHUD() {
    els.pocketed.textContent = `${objectPocketedCount()} / 15`;
    els.shots.textContent = shots;
    els.streak.textContent = streak;
    els.last.textContent = lastPocket;
  }

  function setStatus(main, sub) {
    els.status.textContent = main;
    els.statusSub.textContent = sub;
  }

  let toastTimer = null;
  function showToast(title, sub) {
    els.toastTitle.textContent = title;
    els.toastSub.textContent = sub;
    els.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove('show'), 1300);
  }

  // ---------- Loop ----------
  function loop(now) {
    const dt = Math.min(.033, (now - lastFrame) / 1000 || .016);
    lastFrame = now;
    if (!dragging) step(dt);
    if (shotInProgress && allStopped()) afterMotionStopped();
    draw();
    requestAnimationFrame(loop);
  }

  resizeCanvas();
  resetGame();
  requestAnimationFrame(loop);
})();