async function run(args) {
  // ══════════════════════════════════════════════════════════════════════════
  // 🃏 划词制卡 v2 — 选中文字秒变精美知识卡片 + 多尺寸 + 竞赛标识
  // Tabbit 妙招大赛 · 脚本赛道参赛作品
  // ══════════════════════════════════════════════════════════════════════════

  // ── Cleanup previous instance ─────────────────────────────────────────────
  if (document.getElementById('tabbit-cardmaker-modal')) {
    cleanup();
    return { ok: true, summary: '划词制卡已关闭' };
  }

  // ── State ─────────────────────────────────────────────────────────────────
  let currentTheme = 'ocean';
  let activeText   = '';
  let fab = null;
  let noiseCanvas = null; // cached noise texture

  // ── Themes ────────────────────────────────────────────────────────────────
  const THEMES = {
    ocean:  { stops:['#0f2027','#203a43','#2c5364'], accent:'#4fc3f7', text:'#e2f4ff', name:'深海' },
    sunset: { stops:['#c94b4b','#4b134f'],           accent:'#ffd200', text:'#fff8e1', name:'日落' },
    forest: { stops:['#0f4c3a','#1a7a4a','#52b788'], accent:'#95e1a8', text:'#f0fff4', name:'森林' },
    aurora: { stops:['#2d0057','#4776e6','#8e54e9'], accent:'#c084fc', text:'#f5f0ff', name:'极光' },
    ink:    { stops:['#0d0d0d','#1a1a2e','#16213e'], accent:'#e94560', text:'#f0f0f5', name:'墨染' },
  };

  // Card sizes: [width, height, label]
  const SIZES = {
    wide:   [800,  460, '宽屏 800×460'],
    square: [1080, 1080, '方图 1080×1080'],
    cover:  [1200, 628, '封面 1200×628'],
  };
  let currentSize = 'wide';

  // ── Styles ────────────────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.id = 'tabbit-cardmaker-style';
  style.textContent = `
    @keyframes cmFadeIn  { from{opacity:0;transform:scale(.94)} to{opacity:1;transform:scale(1)} }
    @keyframes cmSlideUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
    @keyframes cmPulse   { 0%,100%{opacity:1} 50%{opacity:.5} }
    #tabbit-cardmaker-modal { animation: cmFadeIn .22s ease; }
    #tabbit-cardmaker-fab   { animation: cmSlideUp .18s ease; }
    .cm-theme-dot {
      width:22px;height:22px;border-radius:50%;border:2px solid transparent;
      cursor:pointer;transition:transform .18s,border-color .18s;outline:none;
    }
    .cm-theme-dot:hover { transform:scale(1.25); }
    .cm-theme-dot:focus-visible { border-color:#60a5fa; box-shadow:0 0 0 2px rgba(96,165,250,.4); }
    .cm-theme-dot.active { border-color:#fff; box-shadow:0 0 0 2px rgba(255,255,255,.3); }
    #cm-dl-btn, #cm-cp-btn { transition: all .15s ease; }
    #cm-dl-btn:hover, #cm-cp-btn:hover { opacity:.85 !important; transform:translateY(-1px); }
    .cm-size-btn {
      background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);
      color:#64748b;border-radius:6px;padding:3px 8px;font-size:10px;cursor:pointer;
      transition:all .15s ease;outline:none;
    }
    .cm-size-btn:hover { background:rgba(255,255,255,.12);color:#94a3b8; }
    .cm-size-btn:focus-visible { border-color:#60a5fa; }
    .cm-size-btn.active { background:rgba(96,165,250,.2);border-color:rgba(96,165,250,.4);color:#60a5fa; }
    #cm-loading { display:none;position:absolute;top:0;left:0;right:0;bottom:0;
      background:rgba(0,0,0,.5);border-radius:12px;
      display:flex;align-items:center;justify-content:center;
      font-size:12px;color:#94a3b8;animation:cmPulse 1.2s ease infinite;
    }
  `;
  document.head.appendChild(style);

  // ── Generate noise texture (cached) ──────────────────────────────────────
  const getNoiseCanvas = (w, h) => {
    if (noiseCanvas && noiseCanvas.width === w && noiseCanvas.height === h) return noiseCanvas;
    noiseCanvas = document.createElement('canvas');
    noiseCanvas.width = w; noiseCanvas.height = h;
    const nctx = noiseCanvas.getContext('2d');
    nctx.save(); nctx.globalAlpha = .03;
    for (let i = 0; i < 4000; i++) {
      nctx.fillStyle = '#fff';
      nctx.fillRect(Math.random()*w, Math.random()*h, 1, 1);
    }
    nctx.restore();
    return noiseCanvas;
  };

  // ── Canvas text wrapping (fixed) ─────────────────────────────────────────
  const wrapText = (ctx, text, x, y, maxW, lineH, maxLines) => {
    const chars = Array.from(text);
    let line = '', lines = [];
    for (const ch of chars) {
      const test = line + ch;
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = ch; }
      else line = test;
    }
    if (line) lines.push(line);
    // Truncate if too many lines
    if (lines.length > maxLines) {
      lines = lines.slice(0, maxLines);
      const last = lines[lines.length - 1] || '';
      lines[lines.length - 1] = last.length > 1 ? last.slice(0, -1) + '…' : '…';
    }
    lines.forEach((l, i) => ctx.fillText(l, x, y + i * lineH));
    return lines.length;
  };

  // ── Canvas card generator ─────────────────────────────────────────────────
  const buildCanvas = (text, themeName, sizeKey) => {
    const t = THEMES[themeName];
    const [W, H] = SIZES[sizeKey];
    const scale = W / 800; // scale factor from base 800px width
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, W * .7, H);
    t.stops.forEach((col, i) => grad.addColorStop(i / (t.stops.length - 1 || 1), col));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Decorative blobs (scaled)
    const drawBlob = (cx, cy, r, alpha) => {
      ctx.save(); ctx.globalAlpha = alpha;
      const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      rg.addColorStop(0, t.accent); rg.addColorStop(1, 'transparent');
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fill(); ctx.restore();
    };
    drawBlob(W*.88, H*.15, 130*scale, .18);
    drawBlob(W*.08, H*.85, 90*scale,  .12);

    // Noise texture (cached)
    ctx.drawImage(getNoiseCanvas(W, H), 0, 0);

    // Left accent bar
    ctx.save(); ctx.globalAlpha = .75;
    const barGrad = ctx.createLinearGradient(0, 50*scale, 0, 120*scale);
    barGrad.addColorStop(0, t.accent); barGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = barGrad; ctx.fillRect(52*scale, 50*scale, 4*scale, 70*scale); ctx.restore();

    // Source label
    ctx.save(); ctx.globalAlpha = .6;
    ctx.fillStyle = t.accent;
    ctx.font = `bold ${11*scale}px -apple-system,sans-serif`;
    ctx.fillText('KNOWLEDGE CARD  ·  Tabbit', 64*scale, 46*scale);
    ctx.restore();

    // Main quote text
    ctx.fillStyle = t.text;
    const fontSize = Math.round(24 * scale);
    ctx.font = `600 ${fontSize}px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif`;
    const lineH = Math.round(38 * scale);
    const maxLines = sizeKey === 'square' ? 12 : 7;
    const linesUsed = wrapText(ctx, text, 64*scale, 95*scale, W - 128*scale, lineH, maxLines);

    // Big quotation mark
    ctx.save(); ctx.globalAlpha = .1;
    ctx.font = `bold ${Math.round(100*scale)}px Georgia,serif`;
    ctx.fillStyle = t.accent;
    ctx.fillText('\u201C', W - 160*scale, H - 40*scale);
    ctx.restore();

    // Divider
    const divY = Math.min(100*scale + linesUsed * lineH + 30*scale, H - 60*scale);
    ctx.save(); ctx.globalAlpha = .2;
    ctx.fillStyle = '#fff'; ctx.fillRect(64*scale, divY, W - 128*scale, 1); ctx.restore();

    // Footer
    ctx.save(); ctx.globalAlpha = .5;
    ctx.fillStyle = t.text;
    ctx.font = `${12*scale}px -apple-system,sans-serif`;
    ctx.fillText('\uD83D\uDCCD ' + (location.hostname || '网页'), 64*scale, divY + 22*scale);
    const dateStr = new Date().toLocaleDateString('zh-CN', { month:'short', day:'numeric' });
    ctx.textAlign = 'right';
    ctx.fillText(dateStr + '  #Tabbit\u5999\u62DB\u5927\u8D5B', W - 64*scale, divY + 22*scale);
    ctx.textAlign = 'left';
    ctx.restore();

    return c;
  };

  // ── Modal ─────────────────────────────────────────────────────────────────
  let modalOverlay = null;

  const showModal = (text) => {
    document.getElementById('tabbit-cardmaker-modal')?.remove();
    activeText = text;

    const overlay = document.createElement('div');
    overlay.id = 'tabbit-cardmaker-modal';
    overlay.style.cssText = `
      position:fixed;top:0;left:0;right:0;bottom:0;
      background:rgba(0,0,0,.72);backdrop-filter:blur(6px);
      display:flex;align-items:center;justify-content:center;
      z-index:2147483647;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    `;
    modalOverlay = overlay;

    const box = document.createElement('div');
    box.style.cssText = `
      background:rgba(12,20,40,.96);border:1px solid rgba(255,255,255,.15);
      border-radius:20px;padding:22px;width:500px;max-width:90vw;max-height:90vh;overflow-y:auto;
      box-shadow:0 32px 80px rgba(0,0,0,.6);color:#f1f5f9;
    `;

    // Theme dots
    const dotHTML = Object.entries(THEMES).map(([key, t]) => `
      <button class="cm-theme-dot ${key===currentTheme?'active':''}" data-theme="${key}" tabindex="0"
        style="background:linear-gradient(135deg,${t.stops[0]},${t.stops[t.stops.length-1]})"
        title="${t.name}" aria-label="主题: ${t.name}"></button>
    `).join('');

    // Size buttons
    const sizeHTML = Object.entries(SIZES).map(([key, [, , label]]) => `
      <button class="cm-size-btn ${key===currentSize?'active':''}" data-size="${key}" tabindex="0">${label}</button>
    `).join('');

    // Character count
    const charCount = Array.from(text).length;

    box.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:22px">🃏</span>
          <div>
            <div style="font-weight:700;font-size:15px">划词制卡</div>
            <div style="font-size:10px;color:#475569">选中文字 → 精美知识卡片</div>
          </div>
        </div>
        <button id="cm-close" style="background:rgba(255,255,255,.1);border:none;color:#64748b;border-radius:8px;width:28px;height:28px;cursor:pointer;font-size:13px" aria-label="关闭">✕</button>
      </div>

      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
        <span style="font-size:11px;color:#475569;flex-shrink:0">主题</span>
        <div id="cm-dots" style="display:flex;gap:7px">${dotHTML}</div>
        <span id="cm-theme-name" style="font-size:11px;color:#64748b;margin-left:4px">${THEMES[currentTheme].name}</span>
      </div>

      <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">
        <span style="font-size:11px;color:#475569;flex-shrink:0">尺寸</span>
        <div style="display:flex;gap:5px">${sizeHTML}</div>
      </div>

      <div id="cm-preview-wrap" style="position:relative;border-radius:12px;overflow:hidden;background:#000;margin-bottom:10px;line-height:0">
        <div id="cm-loading" style="position:absolute;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:12px;color:#94a3b8;z-index:1">渲染中…</div>
        <div id="cm-preview"></div>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <span style="font-size:11px;color:#334155;line-height:1.5;max-height:32px;overflow:hidden;flex:1;margin-right:10px">
          ${text.slice(0,100)}${text.length>100?'…':''}
        </span>
        <span style="font-size:10px;color:${charCount > 1200 ? '#f87171' : '#475569'};flex-shrink:0">${charCount}/1200字</span>
      </div>

      <div style="display:flex;gap:10px">
        <button id="cm-dl-btn" style="flex:1;background:linear-gradient(135deg,#4776e6,#8e54e9);border:none;color:#fff;border-radius:11px;padding:11px;font-size:13px;font-weight:700;cursor:pointer">⬇ 下载 PNG</button>
        <button id="cm-cp-btn" style="flex:1;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);color:#e2e8f0;border-radius:11px;padding:11px;font-size:13px;cursor:pointer">📋 复制图片</button>
      </div>
    `;

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    // Preview render
    const refreshPreview = () => {
      const loading = document.getElementById('cm-loading');
      if (loading) loading.style.display = 'flex';
      // Use requestAnimationFrame to allow UI to update before heavy Canvas work
      requestAnimationFrame(() => {
        const canvas = buildCanvas(activeText, currentTheme, currentSize);
        canvas.style.cssText = 'width:100%;height:auto;display:block';
        const prev = document.getElementById('cm-preview');
        if (prev) { prev.innerHTML = ''; prev.appendChild(canvas); }
        if (loading) loading.style.display = 'none';
      });
    };
    refreshPreview();

    // Theme switching
    box.querySelectorAll('.cm-theme-dot').forEach(btn => {
      btn.onclick = () => {
        currentTheme = btn.dataset.theme;
        box.querySelectorAll('.cm-theme-dot').forEach(b => b.classList.toggle('active', b.dataset.theme === currentTheme));
        const nameEl = document.getElementById('cm-theme-name');
        if (nameEl) nameEl.textContent = THEMES[currentTheme].name;
        refreshPreview();
      };
      // Keyboard: Enter/Space to activate
      btn.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); btn.click(); } };
    });

    // Size switching
    box.querySelectorAll('.cm-size-btn').forEach(btn => {
      btn.onclick = () => {
        currentSize = btn.dataset.size;
        box.querySelectorAll('.cm-size-btn').forEach(b => b.classList.toggle('active', b.dataset.size === currentSize));
        refreshPreview();
      };
    });

    // Close handlers
    document.getElementById('cm-close').onclick = () => { modalOverlay = null; overlay.remove(); };
    overlay.onclick = e => { if (e.target === overlay) { modalOverlay = null; overlay.remove(); } };

    // Download
    document.getElementById('cm-dl-btn').onclick = () => {
      const canvas = buildCanvas(activeText, currentTheme, currentSize);
      try {
        const a = document.createElement('a');
        a.download = '知识卡片_' + Date.now() + '.png';
        a.href = canvas.toDataURL('image/png', 1.0);
        a.click();
        const btn = document.getElementById('cm-dl-btn');
        if (btn) { btn.textContent = '✓ 已下载！'; setTimeout(() => { if(btn) btn.textContent = '⬇ 下载 PNG'; }, 2200); }
      } catch {
        const btn = document.getElementById('cm-dl-btn');
        if (btn) { btn.textContent = '❌ 下载失败'; setTimeout(() => { if(btn) btn.textContent = '⬇ 下载 PNG'; }, 2200); }
      }
    };

    // Copy to clipboard
    document.getElementById('cm-cp-btn').onclick = async () => {
      const btn = document.getElementById('cm-cp-btn');
      try {
        const canvas = buildCanvas(activeText, currentTheme, currentSize);
        const blob = await new Promise((resolve, reject) => {
          canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png', 1.0);
        });
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        if (btn) { btn.textContent = '✓ 已复制！'; setTimeout(() => { if(btn) btn.textContent = '📋 复制图片'; }, 2200); }
      } catch (err) {
        // Fallback: try execCommand
        try {
          const canvas = buildCanvas(activeText, currentTheme, currentSize);
          const dataUrl = canvas.toDataURL('image/png', 1.0);
          const textarea = document.createElement('textarea');
          textarea.value = dataUrl;
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
          if (btn) { btn.textContent = '✓ 已复制链接！'; setTimeout(() => { if(btn) btn.textContent = '📋 复制图片'; }, 2200); }
        } catch {
          if (btn) { btn.textContent = '请用下载按钮'; setTimeout(() => { if(btn) btn.textContent = '📋 复制图片'; }, 2200); }
        }
      }
    };
  };

  // ── Floating button on text selection (mouse + touch) ─────────────────────
  const removeFab = () => { fab?.remove(); fab = null; };

  const showFabAtRect = (rect, text) => {
    removeFab();
    fab = document.createElement('button');
    fab.id = 'tabbit-cardmaker-fab';
    fab.textContent = '🃏 制成卡片';
    fab.style.cssText = `
      position:fixed;
      top:${Math.max(rect.top - 44, 8)}px;
      left:${Math.min(rect.left + rect.width/2 - 44, window.innerWidth - 100)}px;
      background:linear-gradient(135deg,#4776e6,#8e54e9);color:#fff;
      border:none;border-radius:20px;padding:6px 14px;font-size:12px;font-weight:700;
      cursor:pointer;z-index:2147483646;box-shadow:0 6px 20px rgba(71,118,230,.5);
      font-family:-apple-system,sans-serif;white-space:nowrap;
    `;
    fab.onclick = e => { e.stopPropagation(); showModal(text); removeFab(); };
    document.body.appendChild(fab);
  };

  // Mouse selection
  const onMouseUp = () => {
    setTimeout(() => {
      removeFab();
      const sel  = window.getSelection();
      const text = sel?.toString().trim();
      if (!text || text.length < 10 || text.length > 1200) return;
      const range = sel.getRangeAt(0);
      showFabAtRect(range.getBoundingClientRect(), text);
    }, 10);
  };

  const onMouseDown = (e) => { if (fab && !fab.contains(e.target)) removeFab(); };

  // Touch selection (for mobile)
  const onSelectChange = () => {
    setTimeout(() => {
      removeFab();
      const sel  = window.getSelection();
      const text = sel?.toString().trim();
      if (!text || text.length < 10 || text.length > 1200) return;
      const range = sel.getRangeAt(0);
      showFabAtRect(range.getBoundingClientRect(), text);
    }, 200); // delay to let touch selection settle
  };

  document.addEventListener('mouseup', onMouseUp);
  document.addEventListener('mousedown', onMouseDown);
  document.addEventListener('selectionchange', onSelectChange);

  // ── Escape key to close modal ─────────────────────────────────────────────
  const onKeydown = (e) => {
    if (e.key === 'Escape' && modalOverlay) {
      modalOverlay.remove();
      modalOverlay = null;
    }
  };
  document.addEventListener('keydown', onKeydown);

  // ── Full cleanup ──────────────────────────────────────────────────────────
  function cleanup() {
    document.removeEventListener('mouseup', onMouseUp);
    document.removeEventListener('mousedown', onMouseDown);
    document.removeEventListener('selectionchange', onSelectChange);
    document.removeEventListener('keydown', onKeydown);
    ['tabbit-cardmaker-modal','tabbit-cardmaker-fab','tabbit-cardmaker-style'].forEach(id =>
      document.getElementById(id)?.remove()
    );
    modalOverlay = null;
    fab = null;
  }

  // ── Show demo only on first activation ────────────────────────────────────
  const HAS_RUN_KEY = 'tabbit_cardmaker_has_run';
  const hasRun = (() => { try { return localStorage.getItem(HAS_RUN_KEY) === '1'; } catch { return false; } })();

  if (!hasRun) {
    const curSel = window.getSelection()?.toString().trim();
    const demoText = curSel && curSel.length >= 10
      ? curSel
      : '知识是人类进步的阶梯。选中任意网页文字，点击「制成卡片」按钮，即可将精彩内容转化为精美知识卡片，支持五种视觉主题和三种卡片尺寸，可直接下载 PNG 或复制到剪贴板分享。';
    showModal(demoText);
    try { localStorage.setItem(HAS_RUN_KEY, '1'); } catch {}
  }

  return { ok: true, summary: '划词制卡 v2 已激活 — 选中文字即可见浮动按钮 · 5主题 · 3尺寸 · 首次引导' };
}