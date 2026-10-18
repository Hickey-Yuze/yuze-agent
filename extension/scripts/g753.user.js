async function run(args) {
  // ══════════════════════════════════════════════════════════════════════════
  // 🍅 番茄专注钟 v2 — 精确计时 + 沉浸遮罩 + 番茄数持久化
  // Tabbit 妙招大赛 · 脚本赛道参赛作品
  // ══════════════════════════════════════════════════════════════════════════

  // ── Toggle: re-run closes the widget ──────────────────────────────────────
  if (document.getElementById('tabbit-pomodoro')) {
    cleanup();
    return { ok: true, summary: '番茄钟已关闭' };
  }

  // ── Constants ─────────────────────────────────────────────────────────────
  const SESSION_KEY = 'tabbit_pomodoro_sessions_' + (() => {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  })();
  const POS_KEY = 'tabbit_pomodo_pos';

  const PHASES = [
    { id:'work',  label:'专注时间', dur:25*60, color:'#f87171', glow:'rgba(248,113,113,.35)', emoji:'🍅' },
    { id:'short', label:'短暂休息', dur:5*60,  color:'#4ade80', glow:'rgba(74,222,128,.35)',  emoji:'🌿' },
    { id:'work',  label:'专注时间', dur:25*60, color:'#f87171', glow:'rgba(248,113,113,.35)', emoji:'🍅' },
    { id:'long',  label:'长休息',   dur:15*60, color:'#60a5fa', glow:'rgba(96,165,250,.35)',  emoji:'☕' },
  ];

  const R    = 52;
  const CIRC = +(2 * Math.PI * R).toFixed(2);
  const CX   = 68;
  const CY   = 68;

  // ── State ─────────────────────────────────────────────────────────────────
  let phaseIdx  = 0;
  let remaining = PHASES[0].dur;
  let running   = false;
  let sessions  = 0;
  let focusMode = false;
  let pausedAt  = null;
  let tickInterval = null;

  // Load persisted sessions
  try { sessions = parseInt(localStorage.getItem(SESSION_KEY) || '0', 10) || 0; } catch {}

  // ── Styles ────────────────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.id = 'tabbit-pomodoro-style';
  style.textContent = `
    @keyframes pmIn  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
    @keyframes pmBeat{ 0%,100%{filter:drop-shadow(0 0 6px var(--pm-glow))} 50%{filter:drop-shadow(0 0 18px var(--pm-glow))} }
    @keyframes pmPop { 0%{transform:translate(-50%,-50%) scale(.8)} 50%{transform:translate(-50%,-50%) scale(1.15)} 100%{transform:translate(-50%,-50%) scale(1)} }
    #tabbit-pomodoro { animation:pmIn .3s ease; }
    #tabbit-pomodoro.running #pm-svg-ring { animation:pmBeat 2s ease-in-out infinite; }
    #pm-progress { transition: stroke-dasharray .95s ease; }
    #tabbit-pomodoro button { transition: all .15s ease; cursor:pointer; }
    #tabbit-pomodoro button:hover { filter:brightness(1.18); }
    #tabbit-focus-overlay {
      position:fixed;top:0;left:0;right:0;bottom:0;
      background:rgba(0,0,0,.78);backdrop-filter:blur(10px);
      z-index:2147483640;
      animation:pmIn .3s ease;
    }
    #pm-phase-complete {
      animation: pmPop .4s ease;
    }
  `;
  document.head.appendChild(style);

  // ── Widget ────────────────────────────────────────────────────────────────
  const widget = document.createElement('div');
  widget.id = 'tabbit-pomodoro';

  // Restore saved position
  let savedPos = null;
  try { savedPos = JSON.parse(localStorage.getItem(POS_KEY) || 'null'); } catch {}
  const posStyle = savedPos
    ? `left:${savedPos.left}px;top:${savedPos.top}px;`
    : 'bottom:24px;right:24px;';

  widget.style.cssText = `
    --pm-glow:rgba(248,113,113,.35);
    position:fixed;${posStyle}width:190px;
    background:rgba(10,18,38,.92);backdrop-filter:blur(28px);-webkit-backdrop-filter:blur(28px);
    border:1px solid rgba(255,255,255,.14);border-radius:20px;padding:18px 16px 14px;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#f1f5f9;
    box-shadow:0 24px 64px rgba(0,0,0,.55);z-index:2147483647;user-select:none;text-align:center;
  `;
  document.body.appendChild(widget);

  // ── Build DOM once ────────────────────────────────────────────────────────
  widget.innerHTML = `
    <div id="pm-drag" style="font-size:10px;color:#475569;letter-spacing:.8px;text-transform:uppercase;margin-bottom:10px;cursor:move">专注时间</div>

    <div style="position:relative;width:136px;height:136px;margin:0 auto 14px">
      <svg id="pm-svg-ring" width="136" height="136" viewBox="0 0 136 136" style="transform:rotate(-90deg)">
        <circle cx="${CX}" cy="${CY}" r="${R}" fill="none"
          stroke="rgba(255,255,255,.08)" stroke-width="9"/>
        <circle id="pm-progress" cx="${CX}" cy="${CY}" r="${R}" fill="none"
          stroke="#f87171" stroke-width="9" stroke-linecap="round"
          stroke-dasharray="0 ${CIRC}"/>
      </svg>
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none">
        <div id="pm-time" style="font-size:30px;font-weight:800;letter-spacing:-1px;line-height:1;color:#f87171">25:00</div>
        <div id="pm-emoji" style="font-size:22px;margin-top:5px">🍅</div>
      </div>
    </div>

    <div style="display:flex;gap:7px;justify-content:center;margin-bottom:10px">
      <button id="pm-toggle" style="background:#f87171;border:none;color:#fff;border-radius:10px;padding:8px 18px;font-size:13px;font-weight:700">▶</button>
      <button id="pm-skip" style="background:rgba(255,255,255,.1);border:none;color:#94a3b8;border-radius:10px;padding:8px 10px;font-size:13px">⏭</button>
      <button id="pm-reset" style="background:rgba(255,255,255,.1);border:none;color:#94a3b8;border-radius:10px;padding:8px 10px;font-size:13px">↺</button>
    </div>

    <div style="display:flex;justify-content:space-between;align-items:center">
      <button id="pm-focus" style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:#64748b;border-radius:8px;padding:4px 7px;font-size:10px">🎯 专注模式</button>
      <span id="pm-sessions" style="font-size:11px;color:#334155">🍅 ×${sessions}</span>
      <button id="pm-close" style="background:none;border:none;color:#334155;font-size:13px;padding:4px 6px">✕</button>
    </div>
  `;

  // ── Incremental render (no innerHTML rebuild) ─────────────────────────────
  const elTime   = document.getElementById('pm-time');
  const elEmoji  = document.getElementById('pm-emoji');
  const elDrag   = document.getElementById('pm-drag');
  const elProg   = document.getElementById('pm-progress');
  const elToggle = document.getElementById('pm-toggle');
  const elFocus  = document.getElementById('pm-focus');
  const elSess   = document.getElementById('pm-sessions');

  const render = () => {
    const ph   = PHASES[phaseIdx];
    const mins = String(Math.floor(remaining / 60)).padStart(2, '0');
    const secs = String(remaining % 60).padStart(2, '0');
    const pct  = 1 - remaining / ph.dur;
    const dash = +(CIRC * pct).toFixed(2);
    const gap  = +(CIRC - dash).toFixed(2);

    widget.style.setProperty('--pm-glow', ph.glow);
    widget.classList.toggle('running', running);

    // Update only changed elements
    elTime.textContent  = mins + ':' + secs;
    elTime.style.color  = ph.color;
    elEmoji.textContent = ph.emoji;
    elDrag.textContent  = ph.label;
    elToggle.textContent = running ? '⏸' : '▶';
    elToggle.style.background = ph.color;
    elProg.setAttribute('stroke', ph.color);
    elProg.setAttribute('stroke-dasharray', dash + ' ' + gap);
    elSess.textContent  = '🍅 ×' + sessions;

    // Focus button state
    elFocus.textContent = focusMode ? '🔕 专注中' : '🎯 专注模式';
    elFocus.style.background = focusMode ? 'rgba(248,113,113,.2)' : 'rgba(255,255,255,.06)';
    elFocus.style.borderColor = focusMode ? 'rgba(248,113,113,.4)' : 'rgba(255,255,255,.1)';
    elFocus.style.color = focusMode ? '#f87171' : '#64748b';
  };

  // ── Phase transition ──────────────────────────────────────────────────────
  const advance = () => {
    if (PHASES[phaseIdx].id === 'work') {
      sessions++;
      try { localStorage.setItem(SESSION_KEY, String(sessions)); } catch {}
    }
    phaseIdx  = (phaseIdx + 1) % PHASES.length;
    remaining = PHASES[phaseIdx].dur;
    running   = false;
    render();

    // Visual feedback: brief pulse on the timer
    elTime.id = 'pm-phase-complete';
    setTimeout(() => { elTime.id = 'pm-time'; }, 500);

    // Browser notification
    try {
      new Notification('Tabbit 番茄钟 · ' + PHASES[phaseIdx].label, {
        body: PHASES[phaseIdx].id === 'work' ? '休息结束，准备专注！' : '完成一个番茄，好好休息 🌿',
        silent: false,
      });
    } catch {}

    // Vibration on mobile (if supported)
    try { if (navigator.vibrate) navigator.vibrate([200, 100, 200]); } catch {}
  };

  // ── Visibility API: accurate timing ───────────────────────────────────────
  const onVisibilityChange = () => {
    if (document.hidden) {
      if (running && pausedAt === null) pausedAt = Date.now();
    } else {
      if (pausedAt !== null && running) {
        const gap = Math.floor((Date.now() - pausedAt) / 1000);
        if (gap > 0) {
          remaining = Math.max(0, remaining - gap);
          if (remaining <= 0) {
            advance();
          } else {
            render();
          }
        }
        pausedAt = null;
      }
    }
  };
  document.addEventListener('visibilitychange', onVisibilityChange);

  // ── Ticker ────────────────────────────────────────────────────────────────
  const startTicker = () => {
    if (tickInterval) return;
    tickInterval = setInterval(() => {
      if (!running || document.hidden) return;
      if (remaining > 0) { remaining--; render(); }
      else advance();
    }, 1000);
  };
  startTicker();

  // ── Notification permission (request early) ──────────────────────────────
  try {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  } catch {}

  // ── Cleanup ───────────────────────────────────────────────────────────────
  function cleanup() {
    clearInterval(tickInterval);
    tickInterval = null;
    document.removeEventListener('visibilitychange', onVisibilityChange);
    document.removeEventListener('mousemove', onDragMove);
    document.removeEventListener('mouseup', onDragEnd);
    document.removeEventListener('touchmove', onTouchMove);
    document.removeEventListener('touchend', onTouchEnd);
    document.removeEventListener('keydown', onKeydown);
    document.removeEventListener('scroll', preventScroll);
    document.removeEventListener('wheel', preventScroll);
    ['tabbit-pomodoro','tabbit-pomodoro-style','tabbit-focus-overlay'].forEach(id =>
      document.getElementById(id)?.remove()
    );
  }

  // ── Close button ──────────────────────────────────────────────────────────
  document.getElementById('pm-close').onclick = cleanup;

  // ── Escape key ────────────────────────────────────────────────────────────
  const onKeydown = (e) => { if (e.key === 'Escape') cleanup(); };
  document.addEventListener('keydown', onKeydown);

  // ── Toggle play/pause ─────────────────────────────────────────────────────
  document.getElementById('pm-toggle').onclick = () => {
    running = !running;
    if (running) pausedAt = null; // reset pause tracker
    render();
  };

  // ── Reset current phase ───────────────────────────────────────────────────
  document.getElementById('pm-reset').onclick = () => {
    running = false;
    remaining = PHASES[phaseIdx].dur;
    render();
  };

  // ── Skip to next phase ────────────────────────────────────────────────────
  document.getElementById('pm-skip').onclick = () => advance();

  // ── Focus mode ────────────────────────────────────────────────────────────
  // Block scroll when overlay is active
  const preventScroll = (e) => { if (focusMode) e.preventDefault(); };

  document.getElementById('pm-focus').onclick = () => {
    focusMode = !focusMode;
    if (focusMode) {
      const ov = document.createElement('div');
      ov.id = 'tabbit-focus-overlay';
      // Click on overlay dismisses focus mode (instead of穿透)
      ov.onclick = () => {
        focusMode = false;
        ov.remove();
        document.removeEventListener('scroll', preventScroll);
        document.removeEventListener('wheel', preventScroll);
        render();
      };
      document.body.insertBefore(ov, widget);
      // Prevent underlying page scrolling
      document.addEventListener('scroll', preventScroll, { passive: false });
      document.addEventListener('wheel', preventScroll, { passive: false });
    } else {
      document.getElementById('tabbit-focus-overlay')?.remove();
      document.removeEventListener('scroll', preventScroll);
      document.removeEventListener('wheel', preventScroll);
    }
    render();
  };

  // ── Drag (mouse + touch) ──────────────────────────────────────────────────
  let dragActive = false, dragOx = 0, dragOy = 0;

  const savePos = () => {
    try {
      localStorage.setItem(POS_KEY, JSON.stringify({
        left: widget.offsetLeft,
        top: widget.offsetTop
      }));
    } catch {}
  };

  // Mouse
  document.getElementById('pm-drag').onmousedown = e => {
    dragActive = true;
    dragOx = e.clientX - widget.offsetLeft;
    dragOy = e.clientY - widget.offsetTop;
    e.preventDefault();
  };
  const onDragMove = e => {
    if (!dragActive) return;
    widget.style.right  = 'auto';
    widget.style.bottom = 'auto';
    widget.style.left   = (e.clientX - dragOx) + 'px';
    widget.style.top    = (e.clientY - dragOy) + 'px';
  };
  const onDragEnd = () => { if (dragActive) { dragActive = false; savePos(); } };
  document.addEventListener('mousemove', onDragMove);
  document.addEventListener('mouseup', onDragEnd);

  // Touch
  document.getElementById('pm-drag').ontouchstart = e => {
    dragActive = true;
    const t = e.touches[0];
    dragOx = t.clientX - widget.offsetLeft;
    dragOy = t.clientY - widget.offsetTop;
    e.preventDefault();
  };
  const onTouchMove = e => {
    if (!dragActive) return;
    const t = e.touches[0];
    widget.style.right  = 'auto';
    widget.style.bottom = 'auto';
    widget.style.left   = (t.clientX - dragOx) + 'px';
    widget.style.top    = (t.clientY - dragOy) + 'px';
  };
  const onTouchEnd = () => { if (dragActive) { dragActive = false; savePos(); } };
  document.addEventListener('touchmove', onTouchMove, { passive: false });
  document.addEventListener('touchend', onTouchEnd);

  render();
  return { ok: true, summary: '番茄专注钟 v2 已启动 — 精确计时 · 沉浸遮罩 · 番茄数持久化 · 可拖拽 · 通知+震动' };
}