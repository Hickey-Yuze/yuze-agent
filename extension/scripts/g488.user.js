(function () {
  if (window.__LECTOR_LOADED__) return;
  window.__LECTOR_LOADED__ = true;

  let isActive = false;
  let overlay = null;

  let settings = {
    fontSize: 18,
    lineHeight: 1.85,
    theme: 'paper',
    fontFamily: 'serif',
    contentWidth: 680
  };

  const saved = localStorage.getItem('__lector_settings__');
  if (saved) {
    try { settings = { ...settings, ...JSON.parse(saved) }; } catch (e) {}
  }

  function saveSettings() {
    localStorage.setItem('__lector_settings__', JSON.stringify(settings));
  }

  // ─── Content Extraction ─────────────────────────────────────────────────────
  function extractMainContent() {
    const selectors = [
      'article', 'main', '[role="main"]',
      '.post-content', '.article-content', '.entry-content',
      '.content', '.post-body', '.article-body',
      '.markdown-body', '.rich-text', '.story-body',
      '#content', '#article', '#main-content',
      '.container .row .col'
    ];
    let bestEl = null, bestScore = 0;
    for (const sel of selectors) {
      for (const el of document.querySelectorAll(sel)) {
        const score = (el.innerText || '').length;
        if (score > bestScore) { bestScore = score; bestEl = el; }
      }
    }
    if (!bestEl || bestScore < 200) {
      for (const div of document.querySelectorAll('div, section')) {
        if (div.querySelectorAll(':scope > p').length >= 3) {
          const score = (div.innerText || '').length;
          if (score > bestScore) { bestScore = score; bestEl = div; }
        }
      }
    }
    if (bestEl) {
      const clone = bestEl.cloneNode(true);
      clone.querySelectorAll(
        'script,style,nav,header,footer,aside,.ad,.ads,.sidebar,.social-share,.comments,iframe,[role="navigation"],[role="banner"],[role="complementary"]'
      ).forEach(el => el.remove());
      return clone.innerHTML;
    }
    const ps = document.querySelectorAll('p');
    if (ps.length) {
      let html = '';
      ps.forEach(p => { html += p.outerHTML; });
      return html;
    }
    return '<p>无法识别页面主要内容。</p>';
  }

  // ─── Theme System ─────────────────────────────────────────────────────────
  const THEMES = {
    paper: {
      bg: '#f7f4ef',
      pageColor: '#fffef9',
      text: '#1c1916',
      muted: '#7a756e',
      border: '#dedad3',
      panelBg: '#fffef9',
      accent: '#1c1916',
      accentFg: '#fffef9',
      codeBg: '#eeebe4',
      linkColor: '#2563a8',
      blockquoteLine: '#b8b3aa',
      shadow: '4px 0 24px rgba(0,0,0,0.06)',
      name: '纸白'
    },
    dusk: {
      bg: '#1a1814',
      pageColor: '#201e1a',
      text: '#d9d4ca',
      muted: '#7a7570',
      border: '#2e2b26',
      panelBg: '#201e1a',
      accent: '#d9d4ca',
      accentFg: '#1a1814',
      codeBg: '#2a2822',
      linkColor: '#7db8f0',
      blockquoteLine: '#3d3a34',
      shadow: '4px 0 24px rgba(0,0,0,0.4)',
      name: '暮色'
    },
    bone: {
      bg: '#edeae2',
      pageColor: '#f5f2ea',
      text: '#2e2a24',
      muted: '#8c8680',
      border: '#d8d4ca',
      panelBg: '#f5f2ea',
      accent: '#2e2a24',
      accentFg: '#f5f2ea',
      codeBg: '#e2ddd4',
      linkColor: '#7d4e1c',
      blockquoteLine: '#c4bfb4',
      shadow: '4px 0 24px rgba(0,0,0,0.07)',
      name: '骨灰'
    },
    slate: {
      bg: '#e8ecf0',
      pageColor: '#f2f5f8',
      text: '#1a2230',
      muted: '#7085a0',
      border: '#d0d8e2',
      panelBg: '#f2f5f8',
      accent: '#1a2230',
      accentFg: '#f2f5f8',
      codeBg: '#e0e6ee',
      linkColor: '#1a56c4',
      blockquoteLine: '#b0bfd0',
      shadow: '4px 0 24px rgba(26,34,48,0.08)',
      name: '石板'
    }
  };

  const FONTS = {
    serif: '"Noto Serif SC","Source Han Serif SC","Songti SC",Georgia,serif',
    sans: '"Noto Sans SC","PingFang SC","Microsoft YaHei",system-ui,sans-serif',
    mono: '"JetBrains Mono","Fira Code","Source Code Pro",Menlo,monospace'
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  function activate() {
    if (isActive) return;
    isActive = true;

    const content = extractMainContent();
    const s = THEMES[settings.theme] || THEMES.paper;

    overlay = document.createElement('div');
    overlay.id = '__lector_root__';
    overlay.style.cssText = `
      position:fixed;inset:0;z-index:2147483646;
      display:flex;flex-direction:row;
      background:${s.bg};
      font-family:${FONTS[settings.fontFamily]};
      transition:background 0.25s;
    `;

    overlay.innerHTML = `
      <div id="__lector_scroll__" style="
        flex:1;overflow-y:auto;overflow-x:hidden;
        display:flex;justify-content:center;
        background:${s.bg};
        transition:background 0.25s;
      ">
        <div id="__lector_page__" style="
          width:100%;max-width:${settings.contentWidth}px;
          padding:72px 40px 140px;
          color:${s.text};
          font-size:${settings.fontSize}px;
          line-height:${settings.lineHeight};
          transition:max-width 0.3s,font-size 0.2s,color 0.25s;
        ">
          <div id="__lector_content__">${content}</div>
        </div>
      </div>

      <nav id="__lector_panel__" style="
        width:52px;flex-shrink:0;
        background:${s.panelBg};
        border-left:1px solid ${s.border};
        display:flex;flex-direction:column;align-items:center;
        padding:16px 0 20px;gap:2px;
        box-shadow:${s.shadow};
        transition:background 0.25s,border-color 0.25s;
        z-index:2;
        position:relative;
      ">
        <button class="__lp_btn__" data-action="close" title="退出 (Esc)" style="margin-bottom:8px;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square"><line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/></svg>
        </button>

        <div class="__lp_sep__"></div>

        <button class="__lp_btn__" data-action="fontUp" title="增大字号 (+)">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"><text x="3" y="17" font-size="14" fill="currentColor" stroke="none" font-family="serif" font-weight="700">A</text><line x1="17" y1="12" x2="17" y2="22"/><line x1="13" y1="17" x2="21" y2="17"/></svg>
        </button>
        <span id="__lp_size_tag__" style="
          font-size:9px;font-weight:600;letter-spacing:0.08em;
          color:${s.muted};text-align:center;line-height:1;
          padding:3px 0;user-select:none;
        ">${settings.fontSize}</span>
        <button class="__lp_btn__" data-action="fontDown" title="减小字号 (-)">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"><text x="3" y="17" font-size="14" fill="currentColor" stroke="none" font-family="serif" font-weight="700">A</text><line x1="13" y1="17" x2="21" y2="17"/></svg>
        </button>

        <div class="__lp_sep__"></div>

        <button class="__lp_btn__" data-action="widthUp" title="加宽">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"><polyline points="15 18 21 12 15 6"/><polyline points="9 18 3 12 9 6"/></svg>
        </button>
        <button class="__lp_btn__" data-action="widthDown" title="收窄">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"><polyline points="9 18 3 12 9 6"/><polyline points="15 18 21 12 15 6"/></svg>
        </button>

        <div class="__lp_sep__"></div>

        <button class="__lp_btn__ __lp_font__ ${settings.fontFamily==='serif'?'__lp_on__':''}" data-action="fontSerif" title="衬线">
          <span style="font-family:Georgia,serif;font-size:13px;font-weight:700;letter-spacing:-0.02em;">Ss</span>
        </button>
        <button class="__lp_btn__ __lp_font__ ${settings.fontFamily==='sans'?'__lp_on__':''}" data-action="fontSans" title="黑体">
          <span style="font-family:system-ui,sans-serif;font-size:12px;font-weight:700;letter-spacing:-0.01em;">Ss</span>
        </button>
        <button class="__lp_btn__ __lp_font__ ${settings.fontFamily==='mono'?'__lp_on__':''}" data-action="fontMono" title="等宽">
          <span style="font-family:monospace;font-size:11px;font-weight:500;">Ss</span>
        </button>

        <div class="__lp_sep__"></div>

        ${['paper','dusk','bone','slate'].map(t => {
          const ts = THEMES[t];
          return `<button class="__lp_btn__ __lp_theme__ ${settings.theme===t?'__lp_on__':''}" data-action="theme_${t}" title="${ts.name}" style="position:relative;">
            <span class="__lp_dot__" style="
              width:14px;height:14px;border-radius:50%;
              background:${ts.pageColor};
              border:1px solid ${ts.border};
              display:block;position:relative;overflow:hidden;
            ">
              <span style="
                position:absolute;right:0;bottom:0;
                width:7px;height:14px;
                background:${ts.text};
              "></span>
            </span>
          </button>`;
        }).join('')}

        <div style="flex:1"></div>

        <button class="__lp_btn__" data-action="scrollTop" title="回顶部">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
        </button>
        <button class="__lp_btn__" data-action="print" title="打印">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
        </button>
      </nav>
    `;

    const style = document.createElement('style');
    style.id = '__lector_css__';
    style.textContent = buildCSS(s);
    document.head.appendChild(style);
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    overlay.addEventListener('click', e => {
      const btn = e.target.closest('.__lp_btn__');
      if (btn) handleAction(btn.dataset.action);
    });
    document.addEventListener('keydown', handleKey);
  }

  function buildCSS(s) {
    return `
      .__lp_btn__ {
        width:36px;height:36px;border:none;background:transparent;
        color:${s.muted};cursor:pointer;
        display:flex;align-items:center;justify-content:center;
        border-radius:0;transition:background 0.12s,color 0.12s;
        flex-shrink:0;
      }
      .__lp_btn__:hover { background:${s.border};color:${s.text}; }
      .__lp_btn__.__lp_on__ {
        color:${s.accent};
        background:${s.border};
        box-shadow:inset 2px 0 0 ${s.accent};
      }
      .__lp_sep__ {
        width:20px;height:1px;background:${s.border};
        margin:6px 0;flex-shrink:0;
      }
      .__lp_dot__ { pointer-events:none; }

      #__lector_content__ * { box-sizing:border-box; }
      #__lector_content__ h1,#__lector_content__ h2,#__lector_content__ h3,
      #__lector_content__ h4,#__lector_content__ h5,#__lector_content__ h6 {
        color:${s.text};font-weight:700;letter-spacing:-0.02em;
        margin:1.6em 0 0.5em;line-height:1.25;
      }
      #__lector_content__ h1 { font-size:2em;border-bottom:1px solid ${s.border};padding-bottom:0.4em; }
      #__lector_content__ h2 { font-size:1.5em; }
      #__lector_content__ h3 { font-size:1.2em; }
      #__lector_content__ h4,#__lector_content__ h5,#__lector_content__ h6 { font-size:1em; }
      #__lector_content__ p { margin:0 0 1.3em;word-break:break-word;text-align:justify; }
      #__lector_content__ a { color:${s.linkColor};text-decoration:underline;text-underline-offset:3px;text-decoration-thickness:1px; }
      #__lector_content__ a:hover { opacity:0.75; }
      #__lector_content__ img { max-width:100%;height:auto;display:block;margin:1.5em auto; }
      #__lector_content__ blockquote {
        margin:1.5em 0;padding:1em 1.5em;
        border-left:2px solid ${s.blockquoteLine};
        color:${s.muted};font-style:italic;
      }
      #__lector_content__ blockquote p:last-child { margin-bottom:0; }
      #__lector_content__ pre {
        background:${s.codeBg};padding:1.2em 1.4em;
        overflow-x:auto;font-size:0.88em;line-height:1.65;
        margin:1.2em 0;border:1px solid ${s.border};border-radius:2px;
      }
      #__lector_content__ code {
        background:${s.codeBg};padding:2px 5px;
        font-size:0.88em;border-radius:2px;
      }
      #__lector_content__ pre code { background:none;padding:0; }
      #__lector_content__ ul,#__lector_content__ ol { margin:0.8em 0;padding-left:1.8em; }
      #__lector_content__ li { margin:0.35em 0; }
      #__lector_content__ hr { border:none;border-top:1px solid ${s.border};margin:2.5em 0; }
      #__lector_content__ table { width:100%;border-collapse:collapse;margin:1.2em 0;font-size:0.93em; }
      #__lector_content__ th,#__lector_content__ td { border:1px solid ${s.border};padding:8px 14px;text-align:left; }
      #__lector_content__ th { background:${s.codeBg};font-weight:600; }
      #__lector_content__ figure { margin:1.5em 0;text-align:center; }
      #__lector_content__ figcaption { font-size:0.85em;color:${s.muted};margin-top:0.5em; }

      @keyframes __lp_in__ {
        from { opacity:0; transform:translateX(12px); }
        to   { opacity:1; transform:translateX(0); }
      }
      #__lector_page__ { animation: __lp_in__ 0.35s cubic-bezier(.16,1,.3,1); }
    `;
  }

  // ─── Actions ────────────────────────────────────────────────────────────────
  function handleKey(e) {
    if (!isActive) return;
    if (e.key === 'Escape') deactivate();
    if (e.key === '+' || e.key === '=') { e.preventDefault(); adjustFont(1); }
    if (e.key === '-') { e.preventDefault(); adjustFont(-1); }
  }

  function handleAction(action) {
    if (!action) return;
    if (action === 'close') return deactivate();
    if (action === 'fontUp') return adjustFont(1);
    if (action === 'fontDown') return adjustFont(-1);
    if (action === 'widthUp') return adjustWidth(60);
    if (action === 'widthDown') return adjustWidth(-60);
    if (action === 'fontSerif') return setFont('serif');
    if (action === 'fontSans') return setFont('sans');
    if (action === 'fontMono') return setFont('mono');
    if (action === 'scrollTop') {
      const s = document.getElementById('__lector_scroll__');
      if (s) s.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (action === 'print') return window.print();
    if (action.startsWith('theme_')) return setTheme(action.slice(6));
  }

  function adjustFont(d) {
    settings.fontSize = Math.max(12, Math.min(32, settings.fontSize + d));
    const page = document.getElementById('__lector_page__');
    const tag = document.getElementById('__lp_size_tag__');
    if (page) page.style.fontSize = settings.fontSize + 'px';
    if (tag) tag.textContent = settings.fontSize;
    saveSettings();
  }

  function adjustWidth(d) {
    settings.contentWidth = Math.max(440, Math.min(1100, settings.contentWidth + d));
    const page = document.getElementById('__lector_page__');
    if (page) page.style.maxWidth = settings.contentWidth + 'px';
    saveSettings();
  }

  function setFont(f) {
    settings.fontFamily = f;
    const root = document.getElementById('__lector_root__');
    if (root) root.style.fontFamily = FONTS[f];
    document.querySelectorAll('.__lp_font__').forEach(b => b.classList.remove('__lp_on__'));
    const map = { serif: 'fontSerif', sans: 'fontSans', mono: 'fontMono' };
    const btn = document.querySelector(`[data-action="${map[f]}"]`);
    if (btn) btn.classList.add('__lp_on__');
    saveSettings();
  }

  function setTheme(t) {
    if (!THEMES[t]) return;
    settings.theme = t;
    saveSettings();
    fullRefresh();
  }

  function fullRefresh() {
    const s = THEMES[settings.theme] || THEMES.paper;

    // update vars on elements
    const root = document.getElementById('__lector_root__');
    const scroll = document.getElementById('__lector_scroll__');
    const panel = document.getElementById('__lector_panel__');
    const page = document.getElementById('__lector_page__');
    if (root) root.style.background = s.bg;
    if (scroll) scroll.style.background = s.bg;
    if (panel) {
      panel.style.background = s.panelBg;
      panel.style.borderLeftColor = s.border;
    }
    if (page) page.style.color = s.text;

    // rebuild css
    const css = document.getElementById('__lector_css__');
    if (css) css.textContent = buildCSS(s);

    // update theme buttons
    document.querySelectorAll('.__lp_theme__').forEach(b => b.classList.remove('__lp_on__'));
    const active = document.querySelector(`[data-action="theme_${settings.theme}"]`);
    if (active) active.classList.add('__lp_on__');
  }

  function deactivate() {
    if (!isActive) return;
    isActive = false;
    document.removeEventListener('keydown', handleKey);
    if (overlay) {
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 0.25s';
      setTimeout(() => {
        overlay && overlay.parentNode && overlay.parentNode.removeChild(overlay);
        overlay = null;
      }, 260);
    }
    const css = document.getElementById('__lector_css__');
    if (css) css.remove();
    document.body.style.overflow = '';
  }

  // ─── Trigger Badge ───────────────────────────────────────────────────────────
  function createTrigger() {
    const btn = document.createElement('div');
    btn.id = '__lector_trigger__';
    btn.title = '沉浸阅读';
    btn.innerHTML = `
      <span style="
        display:flex;align-items:center;gap:6px;
        pointer-events:none;
      ">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
        </svg>
        <span style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">阅读</span>
      </span>
    `;
    btn.style.cssText = `
      position:fixed;z-index:2147483645;
      right:0;bottom:120px;
      padding:10px 12px;
      background:#1c1916;color:#f7f4ef;
      font-family:system-ui,sans-serif;
      cursor:pointer;
      border-radius:4px 0 0 4px;
      box-shadow:-2px 0 12px rgba(0,0,0,0.18);
      display:flex;align-items:center;
      transition:transform 0.2s cubic-bezier(.16,1,.3,1),box-shadow 0.2s,opacity 0.3s;
      transform:translateX(0);
      user-select:none;
    `;
    btn.addEventListener('mouseenter', () => {
      btn.style.transform = 'translateX(-3px)';
      btn.style.boxShadow = '-4px 0 18px rgba(0,0,0,0.25)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'translateX(0)';
      btn.style.boxShadow = '-2px 0 12px rgba(0,0,0,0.18)';
    });
    btn.addEventListener('click', () => { if (!isActive) activate(); });
    document.body.appendChild(btn);

    // fade to subtle after 6s
    setTimeout(() => {
      btn.style.opacity = '0.5';
      btn.addEventListener('mouseenter', () => { btn.style.opacity = '1'; });
      btn.addEventListener('mouseleave', () => { btn.style.opacity = '0.5'; });
    }, 6000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createTrigger);
  } else {
    createTrigger();
  }
})();