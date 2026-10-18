(() => {
  const APP_ID = 'th-liquid-glass';
  const STYLE_ID = `${APP_ID}-style`;

  document.getElementById(APP_ID)?.remove();
  document.getElementById(STYLE_ID)?.remove();

  // ---------- Game constants ----------
  const STARTING_STACK = 1000;
  const SMALL_BLIND = 10;
  const BIG_BLIND = 20;
  const AI_NAMES = ['MIRA', 'NOAH', 'LUNE', 'KAI'];
  const STREETS = ['PREFLOP', 'FLOP', 'TURN', 'RIVER'];
  const SUITS = [
    { symbol: '♠', name: 'spades', color: '#121722' },
    { symbol: '♥', name: 'hearts', color: '#ef4f68' },
    { symbol: '♣', name: 'clubs', color: '#121722' },
    { symbol: '♦', name: 'diamonds', color: '#ef4f68' }
  ];
  const RANKS = [
    { label: '2', value: 2 }, { label: '3', value: 3 }, { label: '4', value: 4 },
    { label: '5', value: 5 }, { label: '6', value: 6 }, { label: '7', value: 7 },
    { label: '8', value: 8 }, { label: '9', value: 9 }, { label: '10', value: 10 },
    { label: 'J', value: 11 }, { label: 'Q', value: 12 }, { label: 'K', value: 13 },
    { label: 'A', value: 14 }
  ];

  let handNo = 0;
  let dealerIndex = 0;
  let street = 0;
  let deck = [];
  let community = [];
  let pot = 0;
  let currentBet = 0;
  let minRaise = BIG_BLIND;
  let actionQueue = [];
  let busy = false;
  let handEnded = false;
  let showdownMode = false;
  let lastWinnerText = '';

  const players = [
    { name: 'YOU', human: true, seat: 'bottom' },
    { name: AI_NAMES[0], human: false, seat: 'left' },
    { name: AI_NAMES[1], human: false, seat: 'top-left' },
    { name: AI_NAMES[2], human: false, seat: 'top-right' },
    { name: AI_NAMES[3], human: false, seat: 'right' }
  ].map((p, index) => ({
    ...p,
    index,
    chips: STARTING_STACK,
    streetBet: 0,
    totalBet: 0,
    cards: [],
    folded: false,
    acted: false,
    wins: 0
  }));

  // ---------- Styles ----------
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    :root {
      --th-bg: #07110e;
      --th-bg-2: #0c1715;
      --th-felt: #173d32;
      --th-felt-2: #0e2c24;
      --th-ink: #f6f8f7;
      --th-muted: rgba(241,246,244,.53);
      --th-line: rgba(255,255,255,.12);
      --th-glass: rgba(255,255,255,.075);
      --th-glass-2: rgba(255,255,255,.12);
      --th-gold: #d9ba78;
      --th-gold-soft: rgba(217,186,120,.32);
      --th-green: #8ce1b7;
      --th-red: #ff6c7c;
    }

    * { box-sizing: border-box; }
    html, body { margin: 0; width: 100%; min-height: 100%; }
    body { overflow-x: hidden; }

    #${APP_ID} {
      min-height: 100vh;
      width: 100%;
      position: relative;
      overflow: hidden;
      color: var(--th-ink);
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "PingFang SC", "Helvetica Neue", Arial, sans-serif;
      background:
        radial-gradient(circle at 50% -8%, rgba(90,147,129,.23), transparent 35%),
        radial-gradient(circle at 7% 23%, rgba(94,120,182,.12), transparent 28%),
        radial-gradient(circle at 91% 76%, rgba(184,139,88,.10), transparent 30%),
        linear-gradient(145deg, #06100d 0%, #0b1513 48%, #080d0d 100%);
      padding: 26px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    #${APP_ID}::before {
      content: "";
      position: absolute;
      inset: 0;
      pointer-events: none;
      opacity: .15;
      background-image:
        linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,.018) 1px, transparent 1px);
      background-size: 42px 42px;
      mask-image: linear-gradient(to bottom, rgba(0,0,0,.9), transparent 80%);
    }

    #${APP_ID} .ambient {
      position: absolute;
      border-radius: 999px;
      filter: blur(70px);
      pointer-events: none;
      opacity: .34;
    }
    #${APP_ID} .ambient.a1 { width: 420px; height: 420px; left: -180px; top: -120px; background: #315b52; }
    #${APP_ID} .ambient.a2 { width: 360px; height: 360px; right: -150px; top: 15%; background: #3b4c68; opacity: .22; }
    #${APP_ID} .ambient.a3 { width: 420px; height: 420px; right: 8%; bottom: -250px; background: #76552b; opacity: .18; }

    #${APP_ID} .app-shell {
      width: min(1380px, 100%);
      height: min(850px, calc(100vh - 52px));
      min-height: 690px;
      position: relative;
      z-index: 2;
      display: grid;
      grid-template-columns: 220px minmax(0, 1fr) 228px;
      gap: 14px;
      padding: 14px;
      border-radius: 34px;
      background: linear-gradient(135deg, rgba(255,255,255,.085), rgba(255,255,255,.035));
      border: 1px solid rgba(255,255,255,.12);
      box-shadow: 0 42px 110px rgba(0,0,0,.38), inset 0 1px rgba(255,255,255,.12);
      backdrop-filter: blur(36px) saturate(125%);
      -webkit-backdrop-filter: blur(36px) saturate(125%);
    }

    #${APP_ID} .glass {
      background: linear-gradient(145deg, rgba(255,255,255,.085), rgba(255,255,255,.035));
      border: 1px solid rgba(255,255,255,.10);
      box-shadow: inset 0 1px rgba(255,255,255,.08), 0 18px 50px rgba(0,0,0,.12);
      backdrop-filter: blur(26px) saturate(120%);
      -webkit-backdrop-filter: blur(26px) saturate(120%);
    }

    #${APP_ID} .sidebar,
    #${APP_ID} .inspector {
      border-radius: 28px;
      padding: 18px;
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    #${APP_ID} .eyebrow {
      color: var(--th-gold);
      font-size: 11px;
      font-weight: 760;
      letter-spacing: .19em;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      gap: 7px;
    }
    #${APP_ID} .eyebrow::before {
      content: "";
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--th-gold);
      box-shadow: 0 0 16px rgba(217,186,120,.38);
    }

    #${APP_ID} h1 {
      margin: 14px 0 8px;
      font-size: 36px;
      line-height: 1.02;
      letter-spacing: -.055em;
      font-weight: 760;
    }

    #${APP_ID} .intro {
      margin: 0;
      color: var(--th-muted);
      font-size: 12px;
      line-height: 1.62;
    }

    #${APP_ID} .stat-grid {
      margin-top: 18px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 9px;
    }

    #${APP_ID} .stat-card {
      padding: 11px 10px;
      border-radius: 17px;
      background: rgba(255,255,255,.045);
      border: 1px solid rgba(255,255,255,.075);
    }
    #${APP_ID} .stat-label { color: rgba(241,246,244,.38); font-size: 10px; font-weight: 650; letter-spacing: .08em; }
    #${APP_ID} .stat-value { margin-top: 5px; font-size: 20px; font-weight: 720; }

    #${APP_ID} .section-title {
      margin-top: 18px;
      margin-bottom: 11px;
      color: rgba(241,246,244,.42);
      font-size: 10px;
      font-weight: 760;
      letter-spacing: .15em;
    }

    #${APP_ID} .score-row,
    #${APP_ID} .log-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 0;
      border-bottom: 1px solid rgba(255,255,255,.06);
      font-size: 12px;
    }
    #${APP_ID} .score-row:last-child,
    #${APP_ID} .log-row:last-child { border-bottom: 0; }
    #${APP_ID} .score-initial {
      width: 30px; height: 30px; border-radius: 11px;
      display: grid; place-items: center;
      background: rgba(255,255,255,.065);
      border: 1px solid rgba(255,255,255,.08);
      font-size: 11px; font-weight: 760;
      color: rgba(255,255,255,.82);
    }
    #${APP_ID} .score-name { flex: 1; color: rgba(255,255,255,.72); font-weight: 650; }
    #${APP_ID} .score-win { color: var(--th-gold); font-weight: 760; }

    #${APP_ID} .new-hand {
      margin-top: auto;
      height: 50px;
      border: 1px solid rgba(217,186,120,.25);
      border-radius: 16px;
      color: #1a201d;
      background: linear-gradient(135deg, #e1c98f, #caa866);
      font-size: 13px;
      font-weight: 760;
      cursor: pointer;
      box-shadow: 0 13px 30px rgba(186,141,74,.13), inset 0 1px rgba(255,255,255,.45);
      transition: transform .18s ease, filter .18s ease;
    }
    #${APP_ID} .new-hand:hover { transform: translateY(-2px); filter: brightness(1.04); }

    /* Table */
    #${APP_ID} .table-stage {
      position: relative;
      min-width: 0;
      border-radius: 26px;
      overflow: hidden;
      background:
        radial-gradient(ellipse at 50% 44%, rgba(75,139,111,.14), transparent 47%),
        linear-gradient(180deg, rgba(255,255,255,.035), rgba(0,0,0,.06));
      border: 1px solid rgba(255,255,255,.07);
    }

    #${APP_ID} .table-stage::before {
      content: "";
      position: absolute;
      inset: 0;
      pointer-events: none;
      background: radial-gradient(circle at 50% 45%, rgba(255,255,255,.07), transparent 46%);
    }

    #${APP_ID} .table {
      width: min(900px, 94%);
      aspect-ratio: 1.72;
      position: absolute;
      left: 50%; top: 45%;
      transform: translate(-50%, -50%);
      border-radius: 50%;
      background:
        radial-gradient(ellipse at 49% 39%, rgba(76,133,108,.95), rgba(31,81,65,.98) 47%, #153d32 100%);
      border: 10px solid #17211e;
      outline: 1px solid rgba(217,186,120,.24);
      box-shadow:
        0 42px 90px rgba(0,0,0,.44),
        inset 0 1px 0 rgba(255,255,255,.10),
        inset 0 -30px 70px rgba(1,18,13,.34),
        0 0 0 7px rgba(255,255,255,.035);
    }
    #${APP_ID} .table::before {
      content: "";
      position: absolute;
      inset: 30px;
      border-radius: 50%;
      border: 1px solid rgba(224,202,150,.13);
      box-shadow: inset 0 0 55px rgba(0,0,0,.10);
    }

    #${APP_ID} .dealer-mark {
      position: absolute;
      width: 28px; height: 28px;
      border-radius: 50%;
      display: grid; place-items: center;
      color: #27241d;
      background: #e9ddbc;
      border: 1px solid rgba(255,255,255,.55);
      font-size: 10px; font-weight: 850;
      box-shadow: 0 6px 16px rgba(0,0,0,.18);
      z-index: 6;
      transition: all .3s ease;
    }

    #${APP_ID} .pot {
      position: absolute;
      left: 50%; top: 21%;
      transform: translate(-50%, -50%);
      z-index: 6;
      padding: 8px 14px;
      border-radius: 999px;
      color: rgba(255,255,255,.73);
      background: rgba(4,20,15,.24);
      border: 1px solid rgba(255,255,255,.12);
      backdrop-filter: blur(10px);
      font-size: 11px;
      font-weight: 720;
      letter-spacing: .06em;
    }

    #${APP_ID} .board {
      position: absolute;
      left: 50%; top: 48%;
      transform: translate(-50%, -50%);
      display: flex;
      gap: 8px;
      z-index: 5;
    }

    /* Seats */
    #${APP_ID} .seat { position: absolute; z-index: 8; min-width: 118px; text-align: center; }
    #${APP_ID} .seat.bottom { left: 50%; bottom: 7%; transform: translateX(-50%); }
    #${APP_ID} .seat.left { left: 3%; top: 55%; transform: translateY(-50%); }
    #${APP_ID} .seat.top-left { left: 27%; top: 6%; transform: translateX(-50%); }
    #${APP_ID} .seat.top-right { right: 27%; top: 6%; transform: translateX(50%); }
    #${APP_ID} .seat.right { right: 3%; top: 55%; transform: translateY(-50%); }

    #${APP_ID} .player-chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 9px;
      min-width: 104px;
      border-radius: 15px;
      background: rgba(9,18,16,.78);
      border: 1px solid rgba(255,255,255,.10);
      box-shadow: 0 12px 28px rgba(0,0,0,.22), inset 0 1px rgba(255,255,255,.05);
      backdrop-filter: blur(18px);
      transition: opacity .2s ease, transform .2s ease;
    }
    #${APP_ID} .seat.folded .player-chip { opacity: .38; filter: saturate(.4); }
    #${APP_ID} .player-avatar {
      width: 29px; height: 29px; border-radius: 10px;
      display: grid; place-items: center;
      color: #cfe4dc;
      background: linear-gradient(145deg, rgba(255,255,255,.10), rgba(255,255,255,.035));
      border: 1px solid rgba(255,255,255,.08);
      font-size: 10px; font-weight: 800; letter-spacing: .05em;
    }
    #${APP_ID} .player-meta { flex: 1; text-align: left; min-width: 0; }
    #${APP_ID} .player-name { font-size: 11px; font-weight: 740; letter-spacing: .04em; }
    #${APP_ID} .player-stack { margin-top: 2px; color: rgba(255,255,255,.42); font-size: 10px; font-weight: 600; }
    #${APP_ID} .street-bet { margin-top: 5px; color: rgba(236,223,190,.72); font-size: 10px; font-weight: 700; min-height: 12px; }
    #${APP_ID} .hole-cards { display: flex; justify-content: center; margin-top: 5px; }

    /* Cards */
    #${APP_ID} .card {
      width: 68px; height: 94px;
      position: relative;
      padding: 7px;
      border-radius: 13px;
      color: #121722;
      background: linear-gradient(145deg, #fff, #f1f3f6);
      border: 1px solid rgba(255,255,255,.8);
      box-shadow: 0 10px 23px rgba(0,0,0,.20), inset 0 1px #fff;
      user-select: none;
    }
    #${APP_ID} .card.board-card { width: 54px; height: 76px; border-radius: 11px; }
    #${APP_ID} .card.mini { width: 36px; height: 50px; border-radius: 8px; padding: 5px; margin-left: -8px; }
    #${APP_ID} .card.mini:first-child { margin-left: 0; }
    #${APP_ID} .card.back {
      background: linear-gradient(145deg, #1b302a, #0e201b);
      border-color: rgba(217,186,120,.28);
    }
    #${APP_ID} .card.back::before {
      content: "";
      position: absolute;
      inset: 5px;
      border-radius: 6px;
      border: 1px solid rgba(217,186,120,.24);
      background:
        linear-gradient(45deg, transparent 43%, rgba(217,186,120,.13) 44% 56%, transparent 57%),
        linear-gradient(-45deg, transparent 43%, rgba(217,186,120,.10) 44% 56%, transparent 57%);
      background-size: 13px 13px;
    }
    #${APP_ID} .rank { font-size: 21px; line-height: .95; font-weight: 780; }
    #${APP_ID} .suit { margin-top: 2px; font-size: 16px; line-height: 1; }
    #${APP_ID} .big-suit { position: absolute; right: 7px; bottom: 5px; font-size: 29px; opacity: .88; }
    #${APP_ID} .card.mini .rank { font-size: 13px; }
    #${APP_ID} .card.mini .suit { font-size: 11px; }
    #${APP_ID} .card.mini .big-suit { font-size: 16px; right: 4px; bottom: 3px; }
    #${APP_ID} .card.board-card .rank { font-size: 18px; }
    #${APP_ID} .card.board-card .big-suit { font-size: 24px; }

    #${APP_ID} .card-placeholder {
      width: 54px; height: 76px; border-radius: 11px;
      border: 1px solid rgba(255,255,255,.08);
      background: rgba(255,255,255,.018);
    }

    /* Bottom controls */
    #${APP_ID} .control-dock {
      position: absolute;
      z-index: 18;
      left: 50%; bottom: 16px;
      transform: translateX(-50%);
      width: min(680px, calc(100% - 42px));
      min-height: 76px;
      padding: 11px 13px;
      border-radius: 20px;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 12px;
      align-items: center;
      background: linear-gradient(145deg, rgba(9,19,17,.75), rgba(13,24,21,.62));
      border: 1px solid rgba(255,255,255,.11);
      box-shadow: 0 18px 48px rgba(0,0,0,.30), inset 0 1px rgba(255,255,255,.06);
      backdrop-filter: blur(28px) saturate(120%);
    }
    #${APP_ID} .control-copy { min-width: 0; }
    #${APP_ID} .control-status { font-size: 12px; font-weight: 720; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    #${APP_ID} .hand-name { margin-top: 5px; color: var(--th-muted); font-size: 11px; font-weight: 600; }
    #${APP_ID} .actions { display: flex; gap: 8px; }
    #${APP_ID} .action-btn {
      height: 40px;
      padding: 0 14px;
      border-radius: 14px;
      border: 1px solid rgba(255,255,255,.11);
      color: rgba(255,255,255,.88);
      background: rgba(255,255,255,.07);
      font-size: 12px;
      font-weight: 720;
      cursor: pointer;
      transition: transform .17s ease, background .17s ease, opacity .17s ease;
    }
    #${APP_ID} .action-btn:hover:not(:disabled) { transform: translateY(-2px); background: rgba(255,255,255,.11); }
    #${APP_ID} .action-btn:disabled { opacity: .27; cursor: default; }
    #${APP_ID} .action-btn.primary {
      color: #151a17;
      border-color: rgba(217,186,120,.22);
      background: linear-gradient(135deg, #e3ce9b, #c7a45f);
    }
    #${APP_ID} .action-btn.danger { color: #ff9aa6; }

    /* Inspector */
    #${APP_ID} .inspector h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 720;
      letter-spacing: -.03em;
    }
    #${APP_ID} .inspector-sub {
      margin-top: 6px;
      color: var(--th-muted);
      font-size: 11px;
      line-height: 1.55;
    }
    #${APP_ID} .hand-panel {
      margin-top: 18px;
      padding: 16px;
      border-radius: 20px;
      background: rgba(255,255,255,.045);
      border: 1px solid rgba(255,255,255,.075);
    }
    #${APP_ID} .hand-label { color: rgba(255,255,255,.38); font-size: 9px; font-weight: 760; letter-spacing: .12em; }
    #${APP_ID} .hand-value { margin-top: 5px; font-size: 20px; font-weight: 740; }
    #${APP_ID} .hand-detail { margin-top: 5px; color: var(--th-muted); font-size: 10px; line-height: 1.5; }
    #${APP_ID} .log { margin-top: 6px; overflow: auto; max-height: 340px; scrollbar-width: thin; }
    #${APP_ID} .log-row { align-items: flex-start; line-height: 1.45; color: rgba(255,255,255,.55); }
    #${APP_ID} .log-time { color: rgba(217,186,120,.58); font-size: 9px; min-width: 29px; padding-top: 2px; }

    #${APP_ID} .result-overlay {
      position: absolute;
      z-index: 40;
      inset: 0;
      display: grid;
      place-items: center;
      pointer-events: none;
      opacity: 0;
      transition: opacity .25s ease;
      background: rgba(3,10,8,.08);
      backdrop-filter: blur(0px);
    }
    #${APP_ID} .result-overlay.show { opacity: 1; backdrop-filter: blur(3px); }
    #${APP_ID} .result-card {
      min-width: 330px;
      max-width: 520px;
      padding: 25px;
      border-radius: 26px;
      text-align: center;
      background: linear-gradient(145deg, rgba(19,30,27,.88), rgba(9,17,15,.78));
      border: 1px solid rgba(217,186,120,.22);
      box-shadow: 0 30px 80px rgba(0,0,0,.40), inset 0 1px rgba(255,255,255,.08);
      transform: scale(.94) translateY(8px);
      transition: transform .28s cubic-bezier(.2,.8,.2,1);
    }
    #${APP_ID} .result-overlay.show .result-card { transform: scale(1) translateY(0); }
    #${APP_ID} .result-kicker { color: var(--th-gold); font-size: 10px; font-weight: 760; letter-spacing: .17em; }
    #${APP_ID} .result-title { margin-top: 8px; font-size: 28px; font-weight: 760; }
    #${APP_ID} .result-sub { margin-top: 8px; color: var(--th-muted); font-size: 12px; line-height: 1.6; }

    @media (max-width: 1120px) {
      #${APP_ID} .app-shell { grid-template-columns: 220px minmax(0, 1fr); }
      #${APP_ID} .inspector { display: none; }
    }
    @media (max-width: 820px) {
      #${APP_ID} { padding: 12px; }
      #${APP_ID} .app-shell { height: auto; min-height: 760px; grid-template-columns: 1fr; padding: 12px; border-radius: 28px; }
      #${APP_ID} .sidebar { display: none; }
      #${APP_ID} .table-stage { min-height: 730px; }
      #${APP_ID} .table { width: 92%; top: 43%; }
      #${APP_ID} .seat.left { left: 2%; }
      #${APP_ID} .seat.right { right: 2%; }
      #${APP_ID} .seat.top-left { left: 25%; top: 5%; }
      #${APP_ID} .seat.top-right { right: 25%; top: 5%; }
      #${APP_ID} .control-dock { width: calc(100% - 20px); bottom: 10px; grid-template-columns: 1fr; }
      #${APP_ID} .actions { justify-content: center; }
    }
    @media (max-width: 580px) {
      #${APP_ID} .table-stage { min-height: 680px; }
      #${APP_ID} .table { width: 94%; aspect-ratio: 1.50; }
      #${APP_ID} .seat { min-width: 96px; }
      #${APP_ID} .player-chip { min-width: 92px; padding: 6px 8px; }
      #${APP_ID} .seat.left { left: 1%; }
      #${APP_ID} .seat.right { right: 1%; }
      #${APP_ID} .card.board-card { width: 45px; height: 64px; }
      #${APP_ID} .card-placeholder { width: 45px; height: 64px; }
      #${APP_ID} .actions { gap: 5px; }
      #${APP_ID} .action-btn { padding: 0 11px; font-size: 11px; }
    }
  `;
  document.head.appendChild(style);

  // ---------- DOM ----------
  const root = document.createElement('main');
  root.id = APP_ID;
  root.innerHTML = `
    <div class="ambient a1"></div><div class="ambient a2"></div><div class="ambient a3"></div>
    <section class="app-shell">
      <aside class="sidebar glass">
        <div class="eyebrow">No-limit hold'em</div>
        <h1>德州扑克</h1>
        <p class="intro">5 人桌 · 虚拟筹码。完整翻牌、转牌、河牌流程，支持弃牌、跟注与加注。纯模拟娱乐，不涉及真实下注。</p>
        <div class="stat-grid">
          <div class="stat-card"><div class="stat-label">BLINDS</div><div class="stat-value">10 / 20</div></div>
          <div class="stat-card"><div class="stat-label">HAND</div><div class="stat-value" id="th-hand-no">#001</div></div>
          <div class="stat-card"><div class="stat-label">POT</div><div class="stat-value" id="th-side-pot">0</div></div>
          <div class="stat-card"><div class="stat-label">STREET</div><div class="stat-value" id="th-street">Pre</div></div>
        </div>
        <div class="section-title">SESSION WINS</div>
        <div id="th-scoreboard"></div>
        <button class="new-hand" id="th-new-hand">重新发牌</button>
      </aside>

      <section class="table-stage">
        <div class="table" id="th-table">
          <div class="pot" id="th-pot">POT · 0</div>
          <div class="board" id="th-board"></div>
          <div class="dealer-mark" id="th-dealer">D</div>
          ${players.map(p => `<div class="seat ${p.seat}" id="th-seat-${p.index}"></div>`).join('')}
        </div>

        <div class="control-dock">
          <div class="control-copy">
            <div class="control-status" id="th-status">准备发牌</div>
            <div class="hand-name" id="th-hand-strength">你的牌型将在翻牌后显示</div>
          </div>
          <div class="actions">
            <button class="action-btn danger" id="th-fold">弃牌</button>
            <button class="action-btn" id="th-call">过牌</button>
            <button class="action-btn primary" id="th-raise">加注 +40</button>
          </div>
        </div>

        <div class="result-overlay" id="th-result">
          <div class="result-card">
            <div class="result-kicker">SHOWDOWN</div>
            <div class="result-title" id="th-result-title"></div>
            <div class="result-sub" id="th-result-sub"></div>
          </div>
        </div>
      </section>

      <aside class="inspector glass">
        <h2>牌局信息</h2>
        <div class="inspector-sub">AI 使用简化策略：依据牌力、跟注成本和少量随机性行动。</div>
        <div class="hand-panel">
          <div class="hand-label">YOUR CURRENT HAND</div>
          <div class="hand-value" id="th-panel-hand">等待翻牌</div>
          <div class="hand-detail" id="th-panel-detail">底牌发出后，系统会实时计算你当前最好的 5 张牌组合。</div>
        </div>
        <div class="section-title">ACTION LOG</div>
        <div class="log" id="th-log"></div>
      </aside>
    </section>
  `;

  document.body.innerHTML = '';
  document.body.appendChild(root);

  const $ = (sel) => root.querySelector(sel);
  const els = {
    handNo: $('#th-hand-no'), sidePot: $('#th-side-pot'), street: $('#th-street'),
    scoreboard: $('#th-scoreboard'), pot: $('#th-pot'), board: $('#th-board'), dealer: $('#th-dealer'),
    status: $('#th-status'), handStrength: $('#th-hand-strength'), panelHand: $('#th-panel-hand'), panelDetail: $('#th-panel-detail'),
    fold: $('#th-fold'), call: $('#th-call'), raise: $('#th-raise'), newHand: $('#th-new-hand'),
    result: $('#th-result'), resultTitle: $('#th-result-title'), resultSub: $('#th-result-sub'), log: $('#th-log')
  };

  // ---------- Cards / hand evaluator ----------
  function makeDeck() {
    const d = [];
    for (const suit of SUITS) for (const rank of RANKS) d.push({ suit, rank, id: `${rank.label}${suit.symbol}` });
    return d;
  }
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  function combinations(arr, k) {
    const out = [];
    function rec(start, pick) {
      if (pick.length === k) return void out.push(pick.slice());
      for (let i = start; i <= arr.length - (k - pick.length); i++) {
        pick.push(arr[i]); rec(i + 1, pick); pick.pop();
      }
    }
    rec(0, []); return out;
  }
  function lexCompare(a, b) {
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      const av = a[i] || 0, bv = b[i] || 0;
      if (av !== bv) return av - bv;
    }
    return 0;
  }
  function evaluate5(cards) {
    const vals = cards.map(c => c.rank.value).sort((a,b) => b-a);
    const counts = new Map(); vals.forEach(v => counts.set(v, (counts.get(v) || 0) + 1));
    const groups = [...counts.entries()].sort((a,b) => b[1] - a[1] || b[0] - a[0]);
    const flush = cards.every(c => c.suit.symbol === cards[0].suit.symbol);
    let uniq = [...new Set(vals)].sort((a,b) => b-a);
    if (uniq[0] === 14) uniq.push(1);
    let straightHigh = 0;
    for (let i = 0; i <= uniq.length - 5; i++) {
      if (uniq[i] - uniq[i+4] === 4) { straightHigh = uniq[i]; break; }
    }
    if (flush && straightHigh) return { cat: 8, name: '同花顺', score: [8, straightHigh] };
    if (groups[0][1] === 4) return { cat: 7, name: '四条', score: [7, groups[0][0], groups[1][0]] };
    if (groups[0][1] === 3 && groups[1]?.[1] === 2) return { cat: 6, name: '葫芦', score: [6, groups[0][0], groups[1][0]] };
    if (flush) return { cat: 5, name: '同花', score: [5, ...vals] };
    if (straightHigh) return { cat: 4, name: '顺子', score: [4, straightHigh] };
    if (groups[0][1] === 3) {
      const kick = groups.filter(g => g[1] === 1).map(g => g[0]).sort((a,b) => b-a);
      return { cat: 3, name: '三条', score: [3, groups[0][0], ...kick] };
    }
    const pairs = groups.filter(g => g[1] === 2).map(g => g[0]).sort((a,b) => b-a);
    if (pairs.length >= 2) {
      const kicker = groups.filter(g => g[1] === 1).map(g => g[0]).sort((a,b) => b-a)[0] || 0;
      return { cat: 2, name: '两对', score: [2, pairs[0], pairs[1], kicker] };
    }
    if (pairs.length === 1) {
      const kick = groups.filter(g => g[1] === 1).map(g => g[0]).sort((a,b) => b-a);
      return { cat: 1, name: '一对', score: [1, pairs[0], ...kick] };
    }
    return { cat: 0, name: '高牌', score: [0, ...vals] };
  }
  function evaluate7(cards) {
    if (cards.length < 5) return null;
    let best = null;
    for (const combo of combinations(cards, 5)) {
      const e = evaluate5(combo);
      if (!best || lexCompare(e.score, best.score) > 0) best = { ...e, cards: combo };
    }
    return best;
  }

  function cardHTML(card, cls = '') {
    return `<div class="card ${cls}" style="color:${card.suit.color}">
      <div class="rank">${card.rank.label}</div><div class="suit">${card.suit.symbol}</div><div class="big-suit">${card.suit.symbol}</div>
    </div>`;
  }
  function cardBackHTML(cls = '') { return `<div class="card back ${cls}"></div>`; }

  // ---------- Core game ----------
  function resetPlayerForHand(p) {
    p.chips = STARTING_STACK; p.streetBet = 0; p.totalBet = 0; p.cards = []; p.folded = false; p.acted = false;
  }
  function addLog(text) {
    const row = document.createElement('div');
    row.className = 'log-row';
    row.innerHTML = `<span class="log-time">${STREETS[street]?.slice(0,3) || 'END'}</span><span>${text}</span>`;
    els.log.prepend(row);
    while (els.log.children.length > 12) els.log.lastElementChild.remove();
  }
  function activePlayers() { return players.filter(p => !p.folded); }
  function livePot() { return pot + players.reduce((s,p) => s + p.streetBet, 0); }
  function pay(p, amount) {
    const paid = Math.min(p.chips, Math.max(0, amount));
    p.chips -= paid; p.streetBet += paid; p.totalBet += paid;
    return paid;
  }
  function postBlind(p, amount, label) {
    pay(p, amount); currentBet = Math.max(currentBet, p.streetBet); addLog(`${p.name} ${label} ${amount}`);
  }
  function indexAfter(i) { return (i + 1) % players.length; }
  function orderFrom(start) {
    const out = [];
    for (let n = 0, i = start; n < players.length; n++, i = indexAfter(i)) out.push(i);
    return out;
  }
  function bettingEligible(i) { return !players[i].folded && players[i].chips > 0; }
  function buildQueue(start) { actionQueue = orderFrom(start).filter(bettingEligible); }
  function queueAfterRaiser(raiser) {
    actionQueue = orderFrom(indexAfter(raiser)).filter(i => bettingEligible(i) && i !== raiser);
  }

  function startHand() {
    if (busy) return;
    handNo++;
    dealerIndex = (handNo - 1) % players.length;
    street = 0; community = []; pot = 0; currentBet = 0; minRaise = BIG_BLIND; actionQueue = [];
    busy = false; handEnded = false; showdownMode = false; lastWinnerText = '';
    els.log.innerHTML = '';
    hideResult();
    players.forEach(resetPlayerForHand);
    deck = shuffle(makeDeck());
    for (let r = 0; r < 2; r++) for (const p of players) p.cards.push(deck.pop());

    const sb = indexAfter(dealerIndex);
    const bb = indexAfter(sb);
    postBlind(players[sb], SMALL_BLIND, '小盲');
    postBlind(players[bb], BIG_BLIND, '大盲');
    const first = indexAfter(bb);
    buildQueue(first);
    addLog(`第 ${handNo} 手开始`);
    renderAll();
    updateStatus();
    processTurns();
  }

  function settleStreet() {
    pot += players.reduce((s,p) => s + p.streetBet, 0);
    players.forEach(p => { p.streetBet = 0; p.acted = false; });
    currentBet = 0; minRaise = BIG_BLIND;
  }

  async function advanceStreet() {
    settleStreet();
    if (activePlayers().length <= 1) return finishByFold();
    if (street === 3) return showdown();
    street++;
    if (street === 1) { community.push(deck.pop(), deck.pop(), deck.pop()); addLog('翻牌'); }
    else if (street === 2) { community.push(deck.pop()); addLog('转牌'); }
    else if (street === 3) { community.push(deck.pop()); addLog('河牌'); }
    renderAll();
    const first = orderFrom(indexAfter(dealerIndex)).find(bettingEligible);
    buildQueue(first);
    updateStatus();
    await delay(450);
    processTurns();
  }

  async function processTurns() {
    if (handEnded || busy) return;
    if (activePlayers().length <= 1) return finishByFold();
    if (!actionQueue.length) return advanceStreet();

    const i = actionQueue[0];
    const p = players[i];
    if (!bettingEligible(i)) { actionQueue.shift(); return processTurns(); }

    renderAll(); updateStatus();
    if (p.human) { enableHumanActions(); return; }

    busy = true;
    disableActions();
    await delay(520 + Math.random() * 480);
    aiAct(i);
    busy = false;
    renderAll();
    await delay(240);
    processTurns();
  }

  function callAmount(p) { return Math.max(0, currentBet - p.streetBet); }
  function simpleStrength(p) {
    const all = [...p.cards, ...community];
    if (all.length >= 5) {
      const e = evaluate7(all);
      return (e.cat / 8) * .78 + (Math.max(...p.cards.map(c=>c.rank.value)) / 14) * .22;
    }
    const [a,b] = p.cards;
    const pair = a.rank.value === b.rank.value;
    const suited = a.suit.symbol === b.suit.symbol;
    const high = Math.max(a.rank.value, b.rank.value) / 14;
    const gap = Math.abs(a.rank.value - b.rank.value);
    return Math.min(1, high * .55 + (pair ? .30 : 0) + (suited ? .08 : 0) + (gap <= 2 ? .07 : 0));
  }
  function aiAct(i) {
    const p = players[i];
    const need = callAmount(p);
    const s = simpleStrength(p) + (Math.random() - .5) * .14;
    const pressure = need / Math.max(1, livePot());

    if (need > 0 && (s < .24 && pressure > .18 || need > p.chips * .45)) return doAction(i, 'fold');
    if (s > .70 && p.chips >= need + minRaise && Math.random() < .58) return doAction(i, 'raise', Math.max(minRaise, BIG_BLIND * 2));
    if (need === 0 && s > .62 && p.chips >= minRaise && Math.random() < .34) return doAction(i, 'raise', minRaise);
    return doAction(i, need > 0 ? 'call' : 'check');
  }

  function doAction(i, type, raiseBy = 0) {
    const p = players[i];
    if (actionQueue[0] === i) actionQueue.shift();

    if (type === 'fold') {
      p.folded = true; addLog(`${p.name} 弃牌`);
    } else if (type === 'check') {
      p.acted = true; addLog(`${p.name} 过牌`);
    } else if (type === 'call') {
      const need = callAmount(p);
      if (need > p.chips) { p.folded = true; addLog(`${p.name} 筹码不足，弃牌`); }
      else { pay(p, need); p.acted = true; addLog(`${p.name} 跟注 ${need}`); }
    } else if (type === 'raise') {
      const need = callAmount(p);
      const extra = Math.min(raiseBy, Math.max(0, p.chips - need));
      if (need + extra <= 0 || extra < minRaise) return doAction(i, need > 0 ? 'call' : 'check');
      pay(p, need + extra);
      currentBet = p.streetBet;
      minRaise = extra;
      p.acted = true;
      addLog(`${p.name} 加注至 ${currentBet}`);
      queueAfterRaiser(i);
    }

    if (activePlayers().length <= 1) { renderAll(); return finishByFold(); }
  }

  function humanAct(type) {
    if (busy || handEnded || !actionQueue.length || actionQueue[0] !== 0) return;
    disableActions();
    if (type === 'raise') doAction(0, 'raise', Math.max(minRaise, BIG_BLIND * 2));
    else doAction(0, type);
    renderAll();
    processTurns();
  }

  function finishByFold() {
    if (handEnded) return;
    handEnded = true; disableActions();
    settleStreet();
    const winner = activePlayers()[0];
    if (!winner) return;
    winner.chips += pot; winner.wins++;
    lastWinnerText = `${winner.name} 收下底池 ${pot}`;
    addLog(lastWinnerText);
    renderAll();
    showResult(winner.human ? '你赢下这一手' : `${winner.name} 赢下这一手`, `其余玩家均已弃牌 · 底池 ${pot}`);
  }

  function showdown() {
    if (handEnded) return;
    handEnded = true; showdownMode = true; disableActions();
    settleStreet();
    const alive = activePlayers();
    const evals = alive.map(p => ({ p, e: evaluate7([...p.cards, ...community]) }));
    let best = evals[0].e;
    for (const x of evals.slice(1)) if (lexCompare(x.e.score, best.score) > 0) best = x.e;
    const winners = evals.filter(x => lexCompare(x.e.score, best.score) === 0).map(x => x.p);
    const share = Math.floor(pot / winners.length);
    winners.forEach(w => { w.chips += share; w.wins++; });
    const title = winners.length === 1 ? (winners[0].human ? '你拿下摊牌' : `${winners[0].name} 拿下摊牌`) : '平分底池';
    const sub = `${winners.map(w=>w.name).join('、')} · ${best.name} · 底池 ${pot}`;
    lastWinnerText = sub; addLog(sub);
    renderAll(); showResult(title, sub);
  }

  // ---------- Rendering ----------
  function renderBoard() {
    els.board.innerHTML = '';
    for (let i = 0; i < 5; i++) {
      const wrap = document.createElement('div');
      if (community[i]) wrap.innerHTML = cardHTML(community[i], 'board-card');
      else wrap.innerHTML = `<div class="card-placeholder"></div>`;
      els.board.appendChild(wrap.firstElementChild);
    }
  }

  function renderSeats() {
    players.forEach(p => {
      const seat = $(`#th-seat-${p.index}`);
      seat.classList.toggle('folded', p.folded);
      let hole = '';
      if (p.human || showdownMode) hole = p.cards.map(c => cardHTML(c, 'mini')).join('');
      else hole = p.cards.map(() => cardBackHTML('mini')).join('');
      seat.innerHTML = `
        <div class="player-chip">
          <div class="player-avatar">${p.name.slice(0,2)}</div>
          <div class="player-meta"><div class="player-name">${p.name}</div><div class="player-stack">${p.chips} chips${p.folded ? ' · FOLD' : ''}</div></div>
        </div>
        <div class="hole-cards">${hole}</div>
        <div class="street-bet">${p.streetBet ? `BET ${p.streetBet}` : ''}</div>`;
    });
  }

  function renderDealer() {
    const pos = {
      0: { left: '59%', top: '76%' },
      1: { left: '16%', top: '56%' },
      2: { left: '35%', top: '14%' },
      3: { left: '65%', top: '14%' },
      4: { left: '84%', top: '56%' }
    }[dealerIndex];
    els.dealer.style.left = pos.left; els.dealer.style.top = pos.top;
  }

  function renderScoreboard() {
    els.scoreboard.innerHTML = players.map(p => `
      <div class="score-row"><div class="score-initial">${p.name.slice(0,2)}</div><div class="score-name">${p.name}</div><div class="score-win">${p.wins}</div></div>`).join('');
  }

  function updatePlayerHandInfo() {
    const e = community.length >= 3 ? evaluate7([...players[0].cards, ...community]) : null;
    if (!e) {
      const [a,b] = players[0].cards;
      const label = a && b ? `${a.rank.label}${a.suit.symbol} · ${b.rank.label}${b.suit.symbol}` : '等待发牌';
      els.handStrength.textContent = `底牌 ${label}`;
      els.panelHand.textContent = label;
      els.panelDetail.textContent = '翻牌后会实时计算当前最好的 5 张牌组合。';
    } else {
      els.handStrength.textContent = `当前牌型 · ${e.name}`;
      els.panelHand.textContent = e.name;
      els.panelDetail.textContent = `最佳组合：${e.cards.map(c=>c.id).join('  ')}`;
    }
  }

  function renderAll() {
    renderBoard(); renderSeats(); renderDealer(); renderScoreboard(); updatePlayerHandInfo();
    els.handNo.textContent = `#${String(handNo).padStart(3,'0')}`;
    els.sidePot.textContent = livePot();
    els.pot.textContent = `POT · ${livePot()}`;
    els.street.textContent = ['Pre', 'Flop', 'Turn', 'River'][street] || 'End';
    updateStatus();
  }

  function updateStatus() {
    if (handEnded) { els.status.textContent = lastWinnerText || '本手结束'; disableActions(); return; }
    if (!actionQueue.length) { els.status.textContent = '结算本轮下注…'; disableActions(); return; }
    const i = actionQueue[0];
    const p = players[i];
    const need = callAmount(p);
    if (p.human) {
      els.status.textContent = need > 0 ? `轮到你 · 跟注需要 ${need}` : '轮到你 · 可以过牌';
      enableHumanActions();
    } else {
      els.status.textContent = `${p.name} 思考中…`;
      disableActions();
    }
  }

  function enableHumanActions() {
    const p = players[0];
    const need = callAmount(p);
    els.fold.disabled = false;
    els.call.disabled = false;
    els.call.textContent = need > 0 ? `跟注 ${need}` : '过牌';
    const raiseBy = Math.max(minRaise, BIG_BLIND * 2);
    const canRaise = p.chips >= need + raiseBy;
    els.raise.disabled = !canRaise;
    els.raise.textContent = `加注 +${raiseBy}`;
  }
  function disableActions() { els.fold.disabled = els.call.disabled = els.raise.disabled = true; }

  function showResult(title, sub) {
    els.resultTitle.textContent = title; els.resultSub.textContent = sub;
    els.result.classList.add('show');
    setTimeout(() => els.result.classList.remove('show'), 2600);
  }
  function hideResult() { els.result.classList.remove('show'); }
  function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

  // ---------- Events ----------
  els.fold.addEventListener('click', () => humanAct('fold'));
  els.call.addEventListener('click', () => humanAct(callAmount(players[0]) > 0 ? 'call' : 'check'));
  els.raise.addEventListener('click', () => humanAct('raise'));
  els.newHand.addEventListener('click', startHand);

  startHand();
})();