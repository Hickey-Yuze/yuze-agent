(() => {
  const APP_ID = 'breakout-random-lab';
  const STYLE_ID = `${APP_ID}-style`;

  document.getElementById(APP_ID)?.remove();
  document.getElementById(STYLE_ID)?.remove();

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    :root {
      --bo-ink: #f8fbff;
      --bo-muted: rgba(235,244,255,.56);
      --bo-line: rgba(255,255,255,.10);
      --bo-glass: rgba(255,255,255,.07);
      --bo-glass-strong: rgba(255,255,255,.11);
      --bo-cyan: #70e7ff;
      --bo-violet: #8a76ff;
      --bo-pink: #ff83d8;
      --bo-gold: #ffd486;
      --bo-green: #7ef0b8;
    }

    * { box-sizing: border-box; }
    html, body { margin: 0; width: 100%; min-height: 100%; }
    body { overflow-x: hidden; }

    #${APP_ID} {
      min-height: 100vh;
      width: 100%;
      position: relative;
      overflow: hidden;
      padding: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--bo-ink);
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "PingFang SC", "Helvetica Neue", Arial, sans-serif;
      background:
        radial-gradient(circle at 12% 8%, rgba(84,176,255,.20), transparent 28%),
        radial-gradient(circle at 88% 15%, rgba(157,112,255,.18), transparent 30%),
        radial-gradient(circle at 70% 96%, rgba(255,120,199,.12), transparent 34%),
        linear-gradient(145deg, #071020 0%, #0b1022 45%, #120d25 100%);
    }

    #${APP_ID}::before {
      content: "";
      position: absolute;
      inset: 0;
      pointer-events: none;
      opacity: .24;
      background-image:
        linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,.018) 1px, transparent 1px);
      background-size: 44px 44px;
      mask-image: linear-gradient(to bottom, rgba(0,0,0,.85), transparent 86%);
    }

    #${APP_ID} .orb {
      position: absolute;
      border-radius: 999px;
      pointer-events: none;
      filter: blur(80px);
      opacity: .24;
      animation: bo-float 10s ease-in-out infinite alternate;
    }
    #${APP_ID} .orb.o1 { width: 380px; height: 380px; left: -160px; top: 6%; background: #2e8de4; }
    #${APP_ID} .orb.o2 { width: 440px; height: 440px; right: -190px; top: 14%; background: #7955da; animation-delay: -3s; }
    #${APP_ID} .orb.o3 { width: 360px; height: 360px; left: 42%; bottom: -230px; background: #b73d97; animation-delay: -6s; }

    #${APP_ID} .shell {
      width: min(1320px, 100%);
      min-height: min(830px, calc(100vh - 48px));
      position: relative;
      z-index: 2;
      display: grid;
      grid-template-columns: 250px minmax(0, 1fr) 230px;
      gap: 16px;
      padding: 16px;
      border-radius: 38px;
      background: linear-gradient(135deg, rgba(255,255,255,.075), rgba(255,255,255,.028));
      border: 1px solid rgba(255,255,255,.11);
      box-shadow: 0 42px 110px rgba(0,0,0,.35), inset 0 1px rgba(255,255,255,.10);
      backdrop-filter: blur(36px) saturate(130%);
      -webkit-backdrop-filter: blur(36px) saturate(130%);
    }

    #${APP_ID} .glass {
      background: linear-gradient(145deg, rgba(255,255,255,.075), rgba(255,255,255,.030));
      border: 1px solid rgba(255,255,255,.095);
      box-shadow: inset 0 1px rgba(255,255,255,.08), 0 16px 42px rgba(0,0,0,.11);
      backdrop-filter: blur(24px) saturate(125%);
      -webkit-backdrop-filter: blur(24px) saturate(125%);
    }

    #${APP_ID} .side,
    #${APP_ID} .right {
      border-radius: 26px;
      padding: 21px;
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    #${APP_ID} .eyebrow {
      color: var(--bo-cyan);
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
      background: var(--bo-cyan);
      box-shadow: 0 0 16px rgba(112,231,255,.65);
    }

    #${APP_ID} h1 {
      margin: 16px 0 9px;
      font-size: 38px;
      line-height: 1.04;
      letter-spacing: -.055em;
      font-weight: 780;
    }

    #${APP_ID} .intro {
      margin: 0;
      color: var(--bo-muted);
      font-size: 13px;
      line-height: 1.7;
      font-weight: 500;
    }

    #${APP_ID} .stats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-top: 22px;
    }
    #${APP_ID} .stat {
      padding: 12px;
      border-radius: 16px;
      background: rgba(255,255,255,.042);
      border: 1px solid rgba(255,255,255,.07);
    }
    #${APP_ID} .stat-label { color: rgba(235,244,255,.36); font-size: 9px; font-weight: 720; letter-spacing: .09em; }
    #${APP_ID} .stat-value { margin-top: 5px; font-size: 19px; font-weight: 760; }

    #${APP_ID} .section-title {
      margin: 24px 0 10px;
      color: rgba(235,244,255,.38);
      font-size: 10px;
      font-weight: 760;
      letter-spacing: .14em;
    }

    #${APP_ID} .legend-item {
      display: grid;
      grid-template-columns: 34px 1fr;
      align-items: center;
      gap: 9px;
      padding: 8px 0;
      border-bottom: 1px solid rgba(255,255,255,.055);
    }
    #${APP_ID} .legend-item:last-child { border-bottom: 0; }
    #${APP_ID} .legend-icon {
      width: 31px;
      height: 31px;
      border-radius: 10px;
      display: grid;
      place-items: center;
      background: rgba(255,255,255,.055);
      border: 1px solid rgba(255,255,255,.075);
      font-size: 15px;
    }
    #${APP_ID} .legend-name { font-size: 12px; font-weight: 700; }
    #${APP_ID} .legend-desc { margin-top: 2px; color: var(--bo-muted); font-size: 10px; line-height: 1.4; }

    #${APP_ID} .side-actions {
      margin-top: auto;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    #${APP_ID} button {
      font: inherit;
    }
    #${APP_ID} .ghost-btn,
    #${APP_ID} .primary-btn {
      min-height: 46px;
      border-radius: 15px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 720;
      transition: transform .17s ease, filter .17s ease, background .17s ease;
    }
    #${APP_ID} .ghost-btn {
      color: rgba(255,255,255,.78);
      border: 1px solid rgba(255,255,255,.10);
      background: rgba(255,255,255,.055);
    }
    #${APP_ID} .primary-btn {
      color: #0a1020;
      border: 1px solid rgba(255,255,255,.2);
      background: linear-gradient(135deg, #96eeff, #998cff 56%, #ff9ee3);
      box-shadow: 0 13px 28px rgba(106,118,255,.18);
    }
    #${APP_ID} .ghost-btn:hover,
    #${APP_ID} .primary-btn:hover { transform: translateY(-2px); filter: brightness(1.04); }

    #${APP_ID} .stage {
      position: relative;
      min-width: 0;
      min-height: 710px;
      border-radius: 28px;
      overflow: hidden;
      background:
        radial-gradient(circle at 50% 28%, rgba(93,116,255,.10), transparent 45%),
        linear-gradient(180deg, rgba(255,255,255,.028), rgba(0,0,0,.055));
      border: 1px solid rgba(255,255,255,.07);
    }

    #${APP_ID} .stage::after {
      content: "";
      position: absolute;
      inset: 0;
      pointer-events: none;
      background: linear-gradient(180deg, rgba(255,255,255,.018), transparent 23%, transparent 75%, rgba(0,0,0,.08));
    }

    #${APP_ID} .canvas-wrap {
      position: absolute;
      inset: 18px 18px 112px;
      border-radius: 24px;
      overflow: hidden;
      border: 1px solid rgba(255,255,255,.075);
      background: rgba(5,9,20,.46);
      box-shadow: 0 24px 60px rgba(0,0,0,.25), inset 0 1px rgba(255,255,255,.05);
    }

    #${APP_ID} canvas {
      width: 100%;
      height: 100%;
      display: block;
      cursor: crosshair;
      touch-action: none;
    }

    #${APP_ID} .level-bar {
      position: absolute;
      z-index: 5;
      top: 31px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 7px 11px;
      border-radius: 999px;
      color: rgba(255,255,255,.67);
      background: rgba(7,12,28,.40);
      border: 1px solid rgba(255,255,255,.09);
      backdrop-filter: blur(12px);
      font-size: 10px;
      font-weight: 650;
      letter-spacing: .05em;
    }
    #${APP_ID} .seed-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--bo-green);
      box-shadow: 0 0 12px rgba(126,240,184,.55);
    }

    #${APP_ID} .dock {
      position: absolute;
      z-index: 10;
      left: 50%;
      bottom: 18px;
      transform: translateX(-50%);
      width: calc(100% - 36px);
      min-height: 78px;
      padding: 12px 14px;
      border-radius: 22px;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 12px;
      align-items: center;
      background: linear-gradient(145deg, rgba(8,13,30,.78), rgba(12,17,34,.64));
      border: 1px solid rgba(255,255,255,.10);
      box-shadow: 0 16px 42px rgba(0,0,0,.30), inset 0 1px rgba(255,255,255,.055);
      backdrop-filter: blur(26px) saturate(120%);
    }
    #${APP_ID} .status { font-size: 13px; font-weight: 720; }
    #${APP_ID} .substatus { margin-top: 4px; color: var(--bo-muted); font-size: 10px; line-height: 1.45; }
    #${APP_ID} .dock-actions { display: flex; gap: 7px; }
    #${APP_ID} .dock button { padding: 0 13px; min-height: 40px; }

    #${APP_ID} .right h2 { margin: 0; font-size: 17px; letter-spacing: -.03em; }
    #${APP_ID} .right-sub { margin-top: 6px; color: var(--bo-muted); font-size: 10px; line-height: 1.55; }

    #${APP_ID} .active-powerups {
      display: flex;
      flex-wrap: wrap;
      gap: 7px;
      min-height: 36px;
    }
    #${APP_ID} .power-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 9px;
      border-radius: 12px;
      background: rgba(255,255,255,.05);
      border: 1px solid rgba(255,255,255,.075);
      color: rgba(255,255,255,.78);
      font-size: 10px;
      font-weight: 680;
    }
    #${APP_ID} .power-chip b { color: #fff; }

    #${APP_ID} .tips {
      margin-top: auto;
      padding: 14px;
      border-radius: 18px;
      background: rgba(255,255,255,.035);
      border: 1px solid rgba(255,255,255,.065);
      color: var(--bo-muted);
      font-size: 10px;
      line-height: 1.65;
    }
    #${APP_ID} .tips strong { color: rgba(255,255,255,.76); }

    #${APP_ID} .overlay {
      position: absolute;
      z-index: 30;
      inset: 0;
      display: grid;
      place-items: center;
      pointer-events: none;
      opacity: 0;
      transition: opacity .24s ease;
      background: rgba(3,6,17,.15);
      backdrop-filter: blur(0px);
    }
    #${APP_ID} .overlay.show { opacity: 1; backdrop-filter: blur(4px); }
    #${APP_ID} .overlay-card {
      min-width: 320px;
      max-width: 500px;
      padding: 24px;
      border-radius: 24px;
      text-align: center;
      background: linear-gradient(145deg, rgba(18,24,49,.90), rgba(9,13,29,.82));
      border: 1px solid rgba(255,255,255,.11);
      box-shadow: 0 30px 80px rgba(0,0,0,.42), inset 0 1px rgba(255,255,255,.075);
      transform: scale(.95) translateY(8px);
      transition: transform .26s cubic-bezier(.2,.8,.2,1);
    }
    #${APP_ID} .overlay.show .overlay-card { transform: scale(1) translateY(0); }
    #${APP_ID} .overlay-kicker { color: var(--bo-cyan); font-size: 9px; font-weight: 760; letter-spacing: .16em; }
    #${APP_ID} .overlay-title { margin-top: 8px; font-size: 26px; font-weight: 780; }
    #${APP_ID} .overlay-sub { margin-top: 7px; color: var(--bo-muted); font-size: 11px; line-height: 1.6; }

    @keyframes bo-float {
      from { transform: translate3d(0,0,0) scale(1); }
      to { transform: translate3d(18px,-20px,0) scale(1.07); }
    }

    @media (max-width: 1080px) {
      #${APP_ID} .shell { grid-template-columns: 220px minmax(0,1fr); }
      #${APP_ID} .right { display: none; }
    }
    @media (max-width: 760px) {
      #${APP_ID} { padding: 10px; }
      #${APP_ID} .shell { min-height: 760px; grid-template-columns: 1fr; padding: 10px; border-radius: 28px; }
      #${APP_ID} .side { display: none; }
      #${APP_ID} .stage { min-height: 740px; }
      #${APP_ID} .canvas-wrap { inset: 12px 12px 118px; }
      #${APP_ID} .dock { width: calc(100% - 24px); grid-template-columns: 1fr; }
      #${APP_ID} .dock-actions { justify-content: center; }
    }
  `;
  document.head.appendChild(style);

  const root = document.createElement('main');
  root.id = APP_ID;
  root.innerHTML = `
    <div class="orb o1"></div><div class="orb o2"></div><div class="orb o3"></div>
    <section class="shell">
      <aside class="side glass">
        <div class="eyebrow">Random Breakout Lab</div>
        <h1>随机打砖块</h1>
        <p class="intro">每次打开都会生成不同砖墙。收集随机道具，让球越打越疯。</p>
        <div class="stats">
          <div class="stat"><div class="stat-label">SCORE</div><div class="stat-value" id="bo-score">0</div></div>
          <div class="stat"><div class="stat-label">LIVES</div><div class="stat-value" id="bo-lives">3</div></div>
          <div class="stat"><div class="stat-label">LEVEL</div><div class="stat-value" id="bo-level">1</div></div>
          <div class="stat"><div class="stat-label">COMBO</div><div class="stat-value" id="bo-combo">x1</div></div>
        </div>
        <div class="section-title">随机道具</div>
        <div class="legend" id="bo-legend"></div>
        <div class="side-actions">
          <button class="ghost-btn" id="bo-pause">暂停</button>
          <button class="primary-btn" id="bo-new">随机新关</button>
        </div>
      </aside>

      <section class="stage">
        <div class="canvas-wrap"><canvas id="bo-canvas"></canvas></div>
        <div class="level-bar"><span class="seed-dot"></span><span id="bo-layout">RANDOM LEVEL</span><span>·</span><span id="bo-seed">SEED</span></div>
        <div class="dock">
          <div>
            <div class="status" id="bo-status">移动挡板，点击发球</div>
            <div class="substatus" id="bo-substatus">鼠标 / 触控移动挡板 · ← → 键也可以控制</div>
          </div>
          <div class="dock-actions">
            <button class="ghost-btn" id="bo-launch">发球</button>
            <button class="primary-btn" id="bo-next">下一随机关</button>
          </div>
        </div>
        <div class="overlay" id="bo-overlay"><div class="overlay-card"><div class="overlay-kicker">BREAKOUT</div><div class="overlay-title" id="bo-overlay-title"></div><div class="overlay-sub" id="bo-overlay-sub"></div></div></div>
      </section>

      <aside class="right glass">
        <h2>当前增益</h2>
        <div class="right-sub">道具从砖块随机掉落。不同增益可以叠加，但持续时间各自计算。</div>
        <div class="section-title">ACTIVE POWER-UPS</div>
        <div class="active-powerups" id="bo-active"></div>
        <div class="section-title">BRICK TYPES</div>
        <div class="legend-item"><div class="legend-icon">◻</div><div><div class="legend-name">普通砖</div><div class="legend-desc">1 次击碎</div></div></div>
        <div class="legend-item"><div class="legend-icon">▣</div><div><div class="legend-name">装甲砖</div><div class="legend-desc">需要 2–3 次碰撞</div></div></div>
        <div class="legend-item"><div class="legend-icon">✦</div><div><div class="legend-name">水晶砖</div><div class="legend-desc">高概率掉落道具</div></div></div>
        <div class="legend-item"><div class="legend-icon">✹</div><div><div class="legend-name">爆破砖</div><div class="legend-desc">炸伤周围砖块</div></div></div>
        <div class="tips"><strong>操作：</strong><br>鼠标、触控或 ← → 移动挡板。<br>点击 / 空格发球，P 键暂停。<br><br><strong>目标：</strong><br>清空所有可破坏砖块即可进入下一张随机地图。</div>
      </aside>
    </section>`;

  document.body.innerHTML = '';
  document.body.appendChild(root);

  const $ = (s) => root.querySelector(s);
  const els = {
    canvas: $('#bo-canvas'), score: $('#bo-score'), lives: $('#bo-lives'), level: $('#bo-level'), combo: $('#bo-combo'),
    layout: $('#bo-layout'), seed: $('#bo-seed'), status: $('#bo-status'), substatus: $('#bo-substatus'), active: $('#bo-active'),
    pause: $('#bo-pause'), newLevel: $('#bo-new'), launch: $('#bo-launch'), next: $('#bo-next'), legend: $('#bo-legend'),
    overlay: $('#bo-overlay'), overlayTitle: $('#bo-overlay-title'), overlaySub: $('#bo-overlay-sub')
  };

  const WORLD_W = 1000;
  const WORLD_H = 650;
  const PADDLE_Y = 600;
  const BALL_R = 8;
  const BASE_SPEED = 410;
  const MAX_BALLS = 14;
  const MAX_PARTICLES = 170;
  const UI_REFRESH_MS = 90;

  const POWERUPS = [
    { id: 'expand', icon: '↔', name: '延长挡板', desc: '挡板变宽 12 秒', color: '#70e7ff' },
    { id: 'multi', icon: '✣', name: '小球裂变', desc: '额外分裂小球，最多 14 球', color: '#a08cff' },
    { id: 'slow', icon: '◷', name: '减速力场', desc: '所有球减速 9 秒', color: '#7ef0b8' },
    { id: 'fire', icon: '✦', name: '穿透火球', desc: '8 秒内击砖不反弹', color: '#ff91da' },
    { id: 'shield', icon: '⌄', name: '底部护盾', desc: '挡住一次坠球', color: '#ffd486' },
    { id: 'life', icon: '+1', name: '额外生命', desc: '直接增加 1 条命', color: '#ff9fae' }
  ];

  els.legend.innerHTML = POWERUPS.map(p => `<div class="legend-item"><div class="legend-icon" style="color:${p.color}">${p.icon}</div><div><div class="legend-name">${p.name}</div><div class="legend-desc">${p.desc}</div></div></div>`).join('');

  let ctx;
  let game = null;
  let lastTime = performance.now();
  let paused = false;
  let running = true;
  let keys = { left: false, right: false };
  let pointerWorldX = WORLD_W / 2;
  let lastUIRefresh = 0;

  function randomSeed() {
    if (crypto?.getRandomValues) {
      const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] >>> 0;
    }
    return ((Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0);
  }
  function rngFromSeed(seed) {
    let s = seed >>> 0;
    return () => {
      s += 0x6D2B79F5;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const THEMES = [
    ['#6fe7ff','#8978ff','#ff84d8','#7cf0b7','#ffd282'],
    ['#77a8ff','#60e3db','#9f7cff','#ff8da8','#ffc669'],
    ['#9b85ff','#6edcff','#ff78bd','#69e8a5','#ffe08a'],
    ['#4ee0ff','#66a2ff','#bd7dff','#ff7b9e','#82efc8']
  ];
  const LAYOUT_NAMES = ['星云阵列','棋盘迷宫','波浪走廊','倒金字塔','双岛结构','随机矩阵'];

  function buildLevel(level = 1) {
    const seed = randomSeed();
    const rnd = rngFromSeed(seed);
    const layout = Math.floor(rnd() * 6);
    // Keep V1's comfortable brick scale, but extend the wall downward with 7–10 rows.
    const rows = 7 + Math.floor(rnd() * 3) + Math.min(1, Math.floor((level - 1) / 4));
    const cols = 10 + Math.floor(rnd() * 4);
    const gap = 7;
    const margin = 54;
    const top = 68;
    const bw = (WORLD_W - margin * 2 - gap * (cols - 1)) / cols;
    const bh = 27;
    const rowStep = bh + gap;
    const theme = THEMES[Math.floor(rnd() * THEMES.length)];
    const bricks = [];
    const brickRows = Array.from({ length: rows }, () => []);

    function activeFor(r, c) {
      const nx = (c - (cols - 1) / 2) / (cols / 2);
      const ny = r / Math.max(1, rows - 1);
      if (layout === 0) return rnd() > .18 && !(r === rows - 1 && rnd() < .22);
      if (layout === 1) return ((r + c) % 2 === 0) || rnd() > .55;
      if (layout === 2) return Math.sin(c * .88 + r * .9) > -.48 || rnd() > .72;
      if (layout === 3) return Math.abs(nx) < (.25 + ny * .78) || rnd() > .86;
      if (layout === 4) return (c < cols * .38 || c > cols * .62) && rnd() > .12;
      return rnd() > .26;
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!activeFor(r, c)) continue;
        const roll = rnd();
        let type = 'normal', hp = 1;
        // More power-up bricks, while keeping V1 effects only.
        if (roll < .085 + level * .004) { type = 'armor'; hp = rnd() < .22 ? 3 : 2; }
        else if (roll < .135) { type = 'explosive'; hp = 1; }
        else if (roll < .245) { type = 'crystal'; hp = 1; }
        else if (roll < .305) { type = 'multiCrystal'; hp = 1; }
        const brick = {
          x: margin + c * (bw + gap), y: top + r * rowStep, w: bw, h: bh,
          row: r, type, hp, maxHp: hp, alive: true, color: theme[(r + c) % theme.length], flash: 0
        };
        bricks.push(brick);
        brickRows[r].push(brick);
      }
    }

    // ensure a healthy amount of bricks
    if (bricks.length < 55) return buildLevel(level);
    return { seed, rnd, layout, layoutName: LAYOUT_NAMES[layout], bricks, brickRows, gridTop: top, rowStep, theme };
  }

  function createBall(x, y, angle = -Math.PI / 2, speed = BASE_SPEED) {
    return { x, y, px: x, py: y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r: BALL_R, stuck: false, trail: [] };
  }

  function newGame(level = 1, keepScore = false) {
    const lv = buildLevel(level);
    game = {
      level,
      score: keepScore && game ? game.score : 0,
      lives: keepScore && game ? game.lives : 3,
      combo: 1,
      paddle: { x: WORLD_W / 2 - 72, y: PADDLE_Y, w: 144, baseW: 144, h: 16 },
      balls: [], powerups: [], particles: [], bricks: lv.bricks, brickRows: lv.brickRows, gridTop: lv.gridTop, rowStep: lv.rowStep,
      seed: lv.seed, layout: lv.layoutName, theme: lv.theme,
      active: { expandUntil: 0, slowUntil: 0, fireUntil: 0, shield: 0 },
      levelComplete: false, waitingLaunch: true
    };
    spawnStuckBall();
    pointerWorldX = WORLD_W / 2;
    paused = false;
    hideOverlay();
    updateUI();
  }

  function spawnStuckBall() {
    const p = game.paddle;
    game.balls = [{ x: p.x + p.w / 2, y: p.y - BALL_R - 3, px: 0, py: 0, vx: 0, vy: 0, r: BALL_R, stuck: true, trail: [] }];
    game.waitingLaunch = true;
  }

  function launchBalls() {
    if (!game || paused || game.levelComplete) return;
    const stuck = game.balls.filter(b => b.stuck);
    if (!stuck.length) return;
    stuck.forEach((b, i) => {
      b.stuck = false;
      const angle = -Math.PI / 2 + (Math.random() - .5) * .65 + i * .08;
      b.vx = Math.cos(angle) * BASE_SPEED;
      b.vy = Math.sin(angle) * BASE_SPEED;
    });
    game.waitingLaunch = false;
    els.status.textContent = '击碎所有砖块';
    els.substatus.textContent = '接住掉落道具，尝试叠加更夸张的效果';
  }

  function update(dt, now) {
    if (!game || paused || game.levelComplete) return;

    // keyboard paddle motion
    const keyboardSpeed = 700;
    if (keys.left) game.paddle.x -= keyboardSpeed * dt;
    if (keys.right) game.paddle.x += keyboardSpeed * dt;
    if (!keys.left && !keys.right) {
      const target = pointerWorldX - game.paddle.w / 2;
      game.paddle.x += (target - game.paddle.x) * Math.min(1, dt * 13);
    }

    // active effects
    const expand = now < game.active.expandUntil;
    const targetW = expand ? game.paddle.baseW * 1.58 : game.paddle.baseW;
    game.paddle.w += (targetW - game.paddle.w) * Math.min(1, dt * 10);
    game.paddle.x = Math.max(8, Math.min(WORLD_W - game.paddle.w - 8, game.paddle.x));

    for (const b of game.balls) {
      if (b.stuck) {
        b.x = game.paddle.x + game.paddle.w / 2;
        b.y = game.paddle.y - b.r - 3;
        continue;
      }
      b.px = b.x; b.py = b.y;
      b.x += b.vx * dt; b.y += b.vy * dt;

      b._trailTick = (b._trailTick || 0) + 1;
      if ((b._trailTick & 1) === 0) {
        b.trail.unshift([b.x, b.y]);
        if (b.trail.length > 6) b.trail.pop();
      }

      if (b.x - b.r < 0) { b.x = b.r; b.vx = Math.abs(b.vx); }
      if (b.x + b.r > WORLD_W) { b.x = WORLD_W - b.r; b.vx = -Math.abs(b.vx); }
      if (b.y - b.r < 0) { b.y = b.r; b.vy = Math.abs(b.vy); }

      // paddle collision
      const p = game.paddle;
      if (b.vy > 0 && b.y + b.r >= p.y && b.py + b.r <= p.y + 6 && b.x >= p.x - b.r && b.x <= p.x + p.w + b.r) {
        b.y = p.y - b.r - 1;
        const rel = Math.max(-1, Math.min(1, (b.x - (p.x + p.w / 2)) / (p.w / 2)));
        const speed = Math.max(BASE_SPEED * .78, Math.hypot(b.vx, b.vy));
        const angle = -Math.PI / 2 + rel * .98;
        b.vx = Math.cos(angle) * speed;
        b.vy = Math.sin(angle) * speed;
        game.combo = 1;
        burst(b.x, b.y, '#ffffff', 5);
      }

      // Brick collision: only inspect nearby rows instead of the entire wall.
      const rowMin = Math.max(0, Math.floor((b.y - b.r - game.gridTop) / game.rowStep) - 1);
      const rowMax = Math.min(game.brickRows.length - 1, Math.floor((b.y + b.r - game.gridTop) / game.rowStep) + 1);
      let brickHit = false;
      for (let rr = rowMin; rr <= rowMax && !brickHit; rr++) {
        const bucket = game.brickRows[rr];
        for (const brick of bucket) {
          if (!brick.alive) continue;
          if (b.x + b.r < brick.x || b.x - b.r > brick.x + brick.w || b.y + b.r < brick.y || b.y - b.r > brick.y + brick.h) continue;
          if (!circleRect(b, brick)) continue;
          const fire = now < game.active.fireUntil;
          if (!fire) reflectFromRect(b, brick);
          hitBrick(brick, now);
          if (!fire) brickHit = true;
        }
      }
    }

    // remove fallen balls or use shield
    game.balls = game.balls.filter(b => {
      if (b.y - b.r <= WORLD_H + 24) return true;
      if (game.active.shield > 0) {
        game.active.shield--;
        b.y = WORLD_H - 24;
        b.vy = -Math.abs(b.vy);
        burst(b.x, WORLD_H - 10, '#ffd486', 16);
        return true;
      }
      return false;
    });

    if (!game.balls.length && !game.levelComplete) loseLife();

    // falling powerups
    for (const p of game.powerups) {
      if (!p.alive) continue;
      p.y += p.vy * dt;
      if (p.y + p.r >= game.paddle.y && p.y - p.r <= game.paddle.y + game.paddle.h && p.x >= game.paddle.x && p.x <= game.paddle.x + game.paddle.w) {
        p.alive = false; activatePowerup(p.type, now); burst(p.x, p.y, p.color, 18);
      }
      if (p.y > WORLD_H + 40) p.alive = false;
    }
    game.powerups = game.powerups.filter(p => p.alive);

    // particles
    for (const p of game.particles) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 80 * dt; p.life -= dt;
    }
    game.particles = game.particles.filter(p => p.life > 0);
    game.bricks.forEach(b => b.flash = Math.max(0, b.flash - dt * 5));

    // expire slow effect while preserving velocity direction
    if (game._slowWasActive && now >= game.active.slowUntil) {
      game.balls.forEach(b => scaleBallSpeed(b, 1 / .68));
      game._slowWasActive = false;
    }

    // level complete
    if (!game.levelComplete && game.bricks.every(b => !b.alive)) {
      game.levelComplete = true;
      game.score += 1200 * game.level;
      updateUI();
      showOverlay('关卡清空', `LEVEL ${game.level} 完成 · 点击“下一随机关”生成全新的砖墙`);
    }

    if (now - lastUIRefresh >= UI_REFRESH_MS) {
      updateUI(false);
      lastUIRefresh = now;
    }
  }

  function circleRect(ball, r) {
    const cx = Math.max(r.x, Math.min(ball.x, r.x + r.w));
    const cy = Math.max(r.y, Math.min(ball.y, r.y + r.h));
    const dx = ball.x - cx, dy = ball.y - cy;
    return dx * dx + dy * dy <= ball.r * ball.r;
  }

  function reflectFromRect(ball, r) {
    const prevInsideX = ball.px >= r.x - ball.r && ball.px <= r.x + r.w + ball.r;
    const prevInsideY = ball.py >= r.y - ball.r && ball.py <= r.y + r.h + ball.r;
    if (!prevInsideX && prevInsideY) ball.vx *= -1;
    else if (prevInsideX && !prevInsideY) ball.vy *= -1;
    else {
      const left = Math.abs(ball.x - r.x), right = Math.abs(ball.x - (r.x + r.w));
      const top = Math.abs(ball.y - r.y), bottom = Math.abs(ball.y - (r.y + r.h));
      if (Math.min(left, right) < Math.min(top, bottom)) ball.vx *= -1; else ball.vy *= -1;
    }
  }

  function hitBrick(brick, now, explosion = false) {
    if (!brick.alive) return;
    brick.hp--;
    brick.flash = 1;
    game.score += Math.round(35 * game.combo * (brick.type === 'armor' ? 1.25 : 1));
    game.combo = Math.min(9, game.combo + .18);
    burst(brick.x + brick.w / 2, brick.y + brick.h / 2, brick.color, brick.hp <= 0 ? 9 : 4);

    if (brick.hp <= 0) {
      brick.alive = false;
      game.score += (brick.type === 'crystal' || brick.type === 'multiCrystal') ? 150 : brick.type === 'explosive' ? 100 : 60;
      if (brick.type === 'explosive' && !explosion) explodeBrick(brick, now);
      if (brick.type === 'multiCrystal') {
        spawnPowerup(brick.x + brick.w / 2, brick.y + brick.h / 2, 'multi');
      } else {
        const chance = brick.type === 'crystal' ? .96 : .20;
        if (Math.random() < chance) spawnPowerup(brick.x + brick.w / 2, brick.y + brick.h / 2);
      }
    }
  }

  function explodeBrick(source, now) {
    const sx = source.x + source.w / 2, sy = source.y + source.h / 2;
    const radius = Math.max(source.w * 1.7, 88);
    game.bricks.forEach(b => {
      if (!b.alive || b === source) return;
      const bx = b.x + b.w / 2, by = b.y + b.h / 2;
      if (Math.hypot(bx - sx, by - sy) < radius) hitBrick(b, now, true);
    });
    burst(sx, sy, '#ff9a72', 30);
  }

  function spawnPowerup(x, y, forcedId = null) {
    // Weighted toward multiball for a little more chaos without V2's overload.
    const bag = ['multi','multi','multi','expand','expand','slow','fire','shield','life'];
    const id = forcedId || bag[Math.floor(Math.random() * bag.length)];
    const type = POWERUPS.find(p => p.id === id) || POWERUPS[0];
    game.powerups.push({ x, y, vy: 118, r: 15, type: type.id, icon: type.icon, color: type.color, alive: true });
  }

  function activatePowerup(id, now) {
    if (id === 'expand') game.active.expandUntil = Math.max(game.active.expandUntil, now + 12000);
    if (id === 'multi') multiball();
    if (id === 'slow') {
      game.active.slowUntil = Math.max(game.active.slowUntil, now + 9000);
      if (!game._slowWasActive) { game.balls.forEach(b => scaleBallSpeed(b, .68)); game._slowWasActive = true; }
    }
    if (id === 'fire') game.active.fireUntil = Math.max(game.active.fireUntil, now + 8000);
    if (id === 'shield') game.active.shield = Math.min(3, game.active.shield + 1);
    if (id === 'life') game.lives = Math.min(9, game.lives + 1);
    const p = POWERUPS.find(x => x.id === id);
    els.status.textContent = `${p.icon} 获得：${p.name}`;
    updateUI();
  }

  function multiball() {
    const originals = game.balls.filter(b => !b.stuck).slice(0, 5);
    if (!originals.length) return launchBalls();
    const clones = [];
    originals.forEach(b => {
      const speed = Math.hypot(b.vx, b.vy);
      const a = Math.atan2(b.vy, b.vx);
      [-.38, .38].forEach(off => clones.push(createBall(b.x, b.y, a + off, speed)));
    });
    const room = Math.max(0, MAX_BALLS - game.balls.length);
    game.balls.push(...clones.slice(0, room));
  }

  function scaleBallSpeed(b, factor) {
    if (b.stuck) return;
    b.vx *= factor; b.vy *= factor;
    const sp = Math.hypot(b.vx, b.vy);
    const max = 760, min = 230;
    if (sp > max || sp < min) {
      const t = Math.max(min, Math.min(max, sp));
      b.vx = b.vx / sp * t; b.vy = b.vy / sp * t;
    }
  }

  function loseLife() {
    game.lives--;
    game.combo = 1;
    if (game.lives <= 0) {
      game.lives = 0;
      paused = true;
      showOverlay('本局结束', `最终得分 ${game.score.toLocaleString()} · 点击“随机新关”重新开始`);
      els.status.textContent = 'GAME OVER';
    } else {
      spawnStuckBall();
      els.status.textContent = '掉球了，再来一发';
      els.substatus.textContent = `还剩 ${game.lives} 条命 · 点击发球继续`;
    }
  }

  function burst(x, y, color, count = 8) {
    const available = Math.max(0, MAX_PARTICLES - game.particles.length);
    const n = Math.min(count, available);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 45 + Math.random() * 145;
      game.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: .32 + Math.random() * .48, maxLife: .8, color, r: 1.3 + Math.random() * 2.9 });
    }
  }

  function resizeCanvas() {
    const rect = els.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    els.canvas.width = Math.max(1, Math.round(rect.width * dpr));
    els.canvas.height = Math.max(1, Math.round(rect.height * dpr));
    ctx = els.canvas.getContext('2d');
    ctx.setTransform(1,0,0,1,0,0);
    draw();
  }

  function draw() {
    if (!ctx || !game) return;
    const cw = els.canvas.width, ch = els.canvas.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const cssW = cw / dpr, cssH = ch / dpr;
    const scale = Math.min(cssW / WORLD_W, cssH / WORLD_H);
    const ox = (cssW - WORLD_W * scale) / 2;
    const oy = (cssH - WORLD_H * scale) / 2;
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * ox, dpr * oy);
    ctx.clearRect(-ox/scale, -oy/scale, cssW/scale, cssH/scale);

    // world background
    const bg = ctx.createLinearGradient(0,0,0,WORLD_H);
    bg.addColorStop(0,'#090d1c'); bg.addColorStop(1,'#080a16');
    ctx.fillStyle = bg; ctx.fillRect(0,0,WORLD_W,WORLD_H);

    // subtle glow and grid
    const g = ctx.createRadialGradient(WORLD_W/2,170,40,WORLD_W/2,190,520);
    g.addColorStop(0,'rgba(92,112,255,.12)'); g.addColorStop(1,'rgba(92,112,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0,0,WORLD_W,WORLD_H);
    ctx.strokeStyle = 'rgba(255,255,255,.025)'; ctx.lineWidth = 1;
    for (let x=0;x<=WORLD_W;x+=50){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,WORLD_H);ctx.stroke();}
    for (let y=0;y<=WORLD_H;y+=50){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(WORLD_W,y);ctx.stroke();}

    // bricks
    for (const b of game.bricks) {
      if (!b.alive) continue;
      const alpha = .70 + b.flash * .3;
      roundRect(ctx, b.x, b.y, b.w, b.h, 7);
      const grad = ctx.createLinearGradient(b.x,b.y,b.x,b.y+b.h);
      grad.addColorStop(0, hexAlpha(b.color, .96)); grad.addColorStop(1, hexAlpha(b.color, .58));
      ctx.fillStyle = grad;
      if (b.flash > .02 || b.type !== 'normal') {
        ctx.shadowColor = hexAlpha(b.color, .32 + b.flash*.28); ctx.shadowBlur = 5 + b.flash*9;
      }
      ctx.fill(); ctx.shadowBlur = 0;
      ctx.strokeStyle = `rgba(255,255,255,${.16 + b.flash*.32})`; ctx.lineWidth = 1; ctx.stroke();

      if (b.type === 'armor') {
        ctx.fillStyle = 'rgba(6,9,22,.42)'; roundRect(ctx, b.x+4,b.y+4,b.w-8,b.h-8,5); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.globalAlpha = .72; ctx.font='700 10px -apple-system'; ctx.textAlign='center'; ctx.fillText(`×${b.hp}`, b.x+b.w/2,b.y+b.h/2+3);ctx.globalAlpha=1;
      } else if (b.type === 'crystal') {
        ctx.fillStyle='rgba(255,255,255,.82)'; ctx.font='700 13px -apple-system'; ctx.textAlign='center'; ctx.fillText('✦',b.x+b.w/2,b.y+b.h/2+4);
      } else if (b.type === 'multiCrystal') {
        ctx.fillStyle='rgba(255,255,255,.92)'; ctx.font='800 14px -apple-system'; ctx.textAlign='center'; ctx.fillText('✣',b.x+b.w/2,b.y+b.h/2+4);
      } else if (b.type === 'explosive') {
        ctx.fillStyle='rgba(255,255,255,.86)'; ctx.font='700 13px -apple-system'; ctx.textAlign='center'; ctx.fillText('✹',b.x+b.w/2,b.y+b.h/2+4);
      }
      ctx.globalAlpha = alpha;
      ctx.globalAlpha = 1;
    }

    // powerups
    for (const p of game.powerups) {
      ctx.save();
      ctx.shadowColor = p.color; ctx.shadowBlur = 10;
      ctx.fillStyle = hexAlpha(p.color,.86); ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0; ctx.strokeStyle='rgba(255,255,255,.55)';ctx.lineWidth=1;ctx.stroke();
      ctx.fillStyle='#0a1020';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='800 12px -apple-system';ctx.fillText(p.icon,p.x,p.y+.5);
      ctx.restore();
    }

    // shield line
    if (game.active.shield > 0) {
      ctx.strokeStyle='rgba(255,212,134,.72)';ctx.lineWidth=3;ctx.shadowColor='#ffd486';ctx.shadowBlur=14;
      ctx.beginPath();ctx.moveTo(80,WORLD_H-16);ctx.lineTo(WORLD_W-80,WORLD_H-16);ctx.stroke();ctx.shadowBlur=0;
    }

    // paddle
    const p = game.paddle;
    const pg = ctx.createLinearGradient(p.x,p.y,p.x+p.w,p.y);
    pg.addColorStop(0,'#70e7ff');pg.addColorStop(.5,'#9f89ff');pg.addColorStop(1,'#ff83d8');
    roundRect(ctx,p.x,p.y,p.w,p.h,8);ctx.fillStyle=pg;ctx.shadowColor='rgba(126,132,255,.62)';ctx.shadowBlur=20;ctx.fill();ctx.shadowBlur=0;
    ctx.strokeStyle='rgba(255,255,255,.55)';ctx.lineWidth=1;ctx.stroke();

    // balls and trails
    for (const b of game.balls) {
      b.trail.forEach((pt,i)=>{ctx.beginPath();ctx.arc(pt[0],pt[1],Math.max(1,b.r*(1-i/b.trail.length)*.55),0,Math.PI*2);ctx.fillStyle=`rgba(142,229,255,${.12*(1-i/b.trail.length)})`;ctx.fill();});
      const ballGrad=ctx.createRadialGradient(b.x-3,b.y-3,1,b.x,b.y,b.r*1.4);ballGrad.addColorStop(0,'#ffffff');ballGrad.addColorStop(.48,'#dff8ff');ballGrad.addColorStop(1,'#8f9dff');
      ctx.fillStyle=ballGrad;ctx.shadowColor=nowFire()? '#ff83d8':'#73ddff';ctx.shadowBlur=nowFire()?14:8;ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
    }

    // particles
    for (const q of game.particles) {
      ctx.globalAlpha = Math.max(0, q.life/q.maxLife); ctx.fillStyle=q.color;ctx.beginPath();ctx.arc(q.x,q.y,q.r,0,Math.PI*2);ctx.fill();
    }
    ctx.globalAlpha=1;
  }

  function nowFire(){ return performance.now() < game.active.fireUntil; }
  function roundRect(ctx,x,y,w,h,r){const rr=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath();}
  function hexAlpha(hex,a){const h=hex.replace('#','');const v=parseInt(h.length===3?h.split('').map(c=>c+c).join(''):h,16);return `rgba(${(v>>16)&255},${(v>>8)&255},${v&255},${a})`;}

  function updateUI(full = true) {
    if (!game) return;
    els.score.textContent = Math.floor(game.score).toLocaleString();
    els.lives.textContent = game.lives;
    els.level.textContent = game.level;
    els.combo.textContent = `x${game.combo.toFixed(1)}`;
    els.layout.textContent = game.layout.toUpperCase();
    els.seed.textContent = `#${game.seed.toString(16).toUpperCase().slice(-6)}`;
    els.launch.textContent = game.waitingLaunch ? '发球' : '球已在场';
    els.launch.disabled = !game.waitingLaunch;
    els.pause.textContent = paused ? '继续' : '暂停';

    const now = performance.now();
    const chips = [];
    if (now < game.active.expandUntil) chips.push(['↔','延长挡板',game.active.expandUntil-now]);
    if (now < game.active.slowUntil) chips.push(['◷','减速力场',game.active.slowUntil-now]);
    if (now < game.active.fireUntil) chips.push(['✦','穿透火球',game.active.fireUntil-now]);
    if (game.active.shield) chips.push(['⌄',`护盾 ×${game.active.shield}`,Infinity]);
    if (game.balls.length > 1) chips.push(['✣',`多球 ×${game.balls.length}`,Infinity]);
    els.active.innerHTML = chips.length ? chips.map(c=>`<div class="power-chip"><span>${c[0]}</span><b>${c[1]}</b>${Number.isFinite(c[2])?`<span>${Math.ceil(c[2]/1000)}s</span>`:''}</div>`).join('') : '<div class="power-chip">暂无增益</div>';
  }

  function showOverlay(title, sub) { els.overlayTitle.textContent=title;els.overlaySub.textContent=sub;els.overlay.classList.add('show'); }
  function hideOverlay(){els.overlay.classList.remove('show');}

  function togglePause(){
    if (!game || game.lives<=0) return;
    paused=!paused;
    els.status.textContent=paused?'已暂停':'继续击球';
    updateUI();
  }

  function pointerToWorld(clientX) {
    const rect=els.canvas.getBoundingClientRect();
    const scale=Math.min(rect.width/WORLD_W,rect.height/WORLD_H);
    const ox=(rect.width-WORLD_W*scale)/2;
    return Math.max(0,Math.min(WORLD_W,(clientX-rect.left-ox)/scale));
  }

  els.canvas.addEventListener('pointermove', e=>{ pointerWorldX=pointerToWorld(e.clientX); });
  els.canvas.addEventListener('pointerdown', e=>{ pointerWorldX=pointerToWorld(e.clientX); launchBalls(); });
  window.addEventListener('keydown', e=>{
    if (e.key==='ArrowLeft'||e.key==='a'||e.key==='A') keys.left=true;
    if (e.key==='ArrowRight'||e.key==='d'||e.key==='D') keys.right=true;
    if (e.key===' '){e.preventDefault();launchBalls();}
    if (e.key==='p'||e.key==='P') togglePause();
  });
  window.addEventListener('keyup', e=>{
    if (e.key==='ArrowLeft'||e.key==='a'||e.key==='A') keys.left=false;
    if (e.key==='ArrowRight'||e.key==='d'||e.key==='D') keys.right=false;
  });
  els.pause.addEventListener('click',togglePause);
  els.launch.addEventListener('click',launchBalls);
  els.newLevel.addEventListener('click',()=>newGame(1,false));
  els.next.addEventListener('click',()=>newGame(game.level+1,true));
  window.addEventListener('resize',resizeCanvas);

  function frame(t) {
    if (!running) return;
    const dt=Math.min(.025,(t-lastTime)/1000 || 0);lastTime=t;
    if (!paused) update(dt,t);
    draw();
    requestAnimationFrame(frame);
  }

  newGame(1,false);
  requestAnimationFrame(()=>{resizeCanvas(); lastTime=performance.now(); requestAnimationFrame(frame);});
})();