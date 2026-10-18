(function() {
  if (window.__IMMERSIVE_READER_LOADED__) return;
  window.__IMMERSIVE_READER_LOADED__ = true;

  let isActive = false;
  let overlay = null;
  let readerPanel = null;
  let settings = {
    fontSize: 18,
    lineHeight: 1.8,
    theme: 'light',
    fontFamily: 'serif',
    contentWidth: 720
  };

  const saved = localStorage.getItem('__immersive_reader_settings__');
  if (saved) {
    try { settings = { ...settings, ...JSON.parse(saved) }; } catch(e) {}
  }

  function saveSettings() {
    localStorage.setItem('__immersive_reader_settings__', JSON.stringify(settings));
  }

  function extractMainContent() {
    const selectors = [
      'article', 'main', '[role="main"]',
      '.post-content', '.article-content', '.entry-content',
      '.content', '.post-body', '.article-body',
      '.markdown-body', '.rich-text', '.story-body',
      '#content', '#article', '#main-content',
      '.container .row .col'
    ];

    let bestEl = null;
    let bestScore = 0;

    for (const sel of selectors) {
      const els = document.querySelectorAll(sel);
      for (const el of els) {
        const text = el.innerText || '';
        const score = text.length;
        if (score > bestScore) {
          bestScore = score;
          bestEl = el;
        }
      }
    }

    if (!bestEl || bestScore < 200) {
      const allDivs = document.querySelectorAll('div, section');
      for (const div of allDivs) {
        const ps = div.querySelectorAll(':scope > p');
        if (ps.length >= 3) {
          const text = div.innerText || '';
          if (text.length > bestScore) {
            bestScore = text.length;
            bestEl = div;
          }
        }
      }
    }

    if (bestEl) {
      const clone = bestEl.cloneNode(true);
      clone.querySelectorAll('script, style, nav, header, footer, aside, .ad, .ads, .sidebar, .social-share, .comments, iframe, [role="navigation"], [role="banner"], [role="complementary"]').forEach(el => el.remove());
      return clone.innerHTML;
    }

    const fallback = document.querySelectorAll('p');
    if (fallback.length > 0) {
      let html = '';
      fallback.forEach(p => { html += p.outerHTML; });
      return html;
    }

    return '<p>无法识别页面主要内容，请尝试在其他页面使用此功能。</p>';
  }

  function getThemeStyles(theme) {
    const themes = {
      light: {
        bg: '#faf9f6',
        text: '#1a1a1a',
        secondary: '#666666',
        border: '#e5e5e5',
        toolbarBg: '#ffffff',
        btnHover: '#f0f0f0',
        btnActive: '#e0e0e0',
        shadow: '0 2px 12px rgba(0,0,0,0.08)',
        titleColor: '#111111',
        linkColor: '#0066cc',
        codeBg: '#f5f5f5',
        blockquoteBorder: '#cccccc',
        blockquoteBg: '#f9f9f9'
      },
      dark: {
        bg: '#1a1b1e',
        text: '#d1d1d1',
        secondary: '#999999',
        border: '#333333',
        toolbarBg: '#25262b',
        btnHover: '#2c2d32',
        btnActive: '#373840',
        shadow: '0 2px 12px rgba(0,0,0,0.3)',
        titleColor: '#e8e8e8',
        linkColor: '#6bb5ff',
        codeBg: '#2a2b2f',
        blockquoteBorder: '#444444',
        blockquoteBg: '#222326'
      },
      sepia: {
        bg: '#f4ecd8',
        text: '#5b4636',
        secondary: '#8c7764',
        border: '#d4c9b0',
        toolbarBg: '#f9f3e3',
        btnHover: '#efe6d1',
        btnActive: '#e5d9be',
        shadow: '0 2px 12px rgba(90,70,54,0.1)',
        titleColor: '#3c2f22',
        linkColor: '#8b5e3c',
        codeBg: '#ede4ce',
        blockquoteBorder: '#c4b898',
        blockquoteBg: '#efe6d1'
      },
      green: {
        bg: '#e8ede4',
        text: '#2d3a28',
        secondary: '#6b7a64',
        border: '#c5d1bc',
        toolbarBg: '#eff3eb',
        btnHover: '#dce5d6',
        btnActive: '#cfdcc6',
        shadow: '0 2px 12px rgba(45,58,40,0.08)',
        titleColor: '#1e2a1a',
        linkColor: '#4a7c3f',
        codeBg: '#dde4d6',
        blockquoteBorder: '#a8bca0',
        blockquoteBg: '#dce5d6'
      }
    };
    return themes[theme] || themes.light;
  }

  function getFontFamily(fontFamily) {
    const fonts = {
      serif: '"Noto Serif SC", "Source Han Serif SC", "Songti SC", Georgia, "Times New Roman", serif',
      sans: '"Noto Sans SC", "Source Han Sans SC", "PingFang SC", "Microsoft YaHei", -apple-system, sans-serif',
      mono: '"JetBrains Mono", "Fira Code", "Source Code Pro", Menlo, Monaco, Consolas, monospace'
    };
    return fonts[fontFamily] || fonts.serif;
  }

  function createSVG(pathD, size) {
    size = size || 20;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${pathD}</svg>`;
  }

  const ICONS = {
    book: createSVG('<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>'),
    close: createSVG('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>'),
    fontUp: createSVG('<line x1="4" y1="20" x2="14" y2="20"/><path d="M9 4l-5 16h2.5"/><path d="M9 4l5 16h-2.5"/><path d="M18 12v8"/><path d="M15 15h6"/>'),
    fontDown: createSVG('<line x1="4" y1="20" x2="14" y2="20"/><path d="M9 4l-5 16h2.5"/><path d="M9 4l5 16h-2.5"/><path d="M15 16h6"/><path d="M18 13v8"/>'),
    sun: createSVG('<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>'),
    moon: createSVG('<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>'),
    widthUp: createSVG('<polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/>'),
    widthDown: createSVG('<polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/>'),
    serif: '<span style="font-family:serif;font-size:16px;font-weight:600;">Aa</span>',
    sans: '<span style="font-family:sans-serif;font-size:16px;font-weight:600;">Aa</span>',
    mono: '<span style="font-family:monospace;font-size:15px;font-weight:600;">Aa</span>',
    print: createSVG('<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>'),
    scroll: createSVG('<path d="M12 20V4"/><path d="m6 10 6-6 6 6"/>')
  };

  function activate() {
    if (isActive) return;
    isActive = true;

    const content = extractMainContent();
    const s = getThemeStyles(settings.theme);

    overlay = document.createElement('div');
    overlay.id = '__immersive_reader_overlay__';
    overlay.style.cssText = `
      position:fixed; inset:0; z-index:2147483646;
      background:${s.bg}; overflow-y:auto; overflow-x:hidden;
      transition: opacity 0.3s ease;
      font-family: ${getFontFamily(settings.fontFamily)};
    `;

    overlay.innerHTML = `
      <div id="__ir_toolbar__" style="
        position:sticky; top:0; z-index:10;
        background:${s.toolbarBg}; border-bottom:1px solid ${s.border};
        padding:8px 16px; display:flex; align-items:center;
        justify-content:space-between; gap:8px;
        box-shadow:${s.shadow};
        transition: background 0.3s, border-color 0.3s;
      ">
        <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">
          <span style="font-size:13px;font-weight:600;color:${s.titleColor};margin-right:4px;">沉浸阅读</span>
        </div>
        <div style="display:flex;align-items:center;gap:2px;flex-wrap:wrap;justify-content:center;">
          <div class="__ir_btn_group__" style="display:flex;align-items:center;gap:1px;background:${s.border};border-radius:6px;padding:1px;">
            <button class="__ir_tool_btn__" data-action="fontDown" title="减小字号" style="border-radius:5px 0 0 5px;">
              ${ICONS.fontDown}
            </button>
            <span id="__ir_font_size_display__" style="font-size:11px;min-width:32px;text-align:center;color:${s.secondary};padding:0 4px;user-select:none;">
              ${settings.fontSize}px
            </span>
            <button class="__ir_tool_btn__" data-action="fontUp" title="增大字号" style="border-radius:0 5px 5px 0;">
              ${ICONS.fontUp}
            </button>
          </div>
          <div class="__ir_btn_group__" style="display:flex;align-items:center;gap:1px;background:${s.border};border-radius:6px;padding:1px;">
            <button class="__ir_tool_btn__" data-action="widthDown" title="收窄版面" style="border-radius:5px 0 0 5px;">
              ${ICONS.widthDown}
            </button>
            <button class="__ir_tool_btn__" data-action="widthUp" title="加宽版面" style="border-radius:0 5px 5px 0;">
              ${ICONS.widthUp}
            </button>
          </div>
          <div class="__ir_btn_group__" style="display:flex;align-items:center;gap:1px;background:${s.border};border-radius:6px;padding:1px;">
            <button class="__ir_tool_btn__ __ir_font_btn__ ${settings.fontFamily==='serif'?'__ir_active__':''}" data-action="fontSerif" title="衬线字体" style="border-radius:5px 0 0 5px;">
              ${ICONS.serif}
            </button>
            <button class="__ir_tool_btn__ __ir_font_btn__ ${settings.fontFamily==='sans'?'__ir_active__':''}" data-action="fontSans" title="无衬线字体">
              ${ICONS.sans}
            </button>
            <button class="__ir_tool_btn__ __ir_font_btn__ ${settings.fontFamily==='mono'?'__ir_active__':''}" data-action="fontMono" title="等宽字体" style="border-radius:0 5px 5px 0;">
              ${ICONS.mono}
            </button>
          </div>
          <div class="__ir_btn_group__" style="display:flex;align-items:center;gap:1px;background:${s.border};border-radius:6px;padding:1px;">
            <button class="__ir_tool_btn__ __ir_theme_btn__ ${settings.theme==='light'?'__ir_active__':''}" data-action="themeLight" title="亮色" style="border-radius:5px 0 0 5px;">
              ${ICONS.sun}
            </button>
            <button class="__ir_tool_btn__ __ir_theme_btn__ ${settings.theme==='sepia'?'__ir_active__':''}" data-action="themeSepia" title="护眼">
              🍂
            </button>
            <button class="__ir_tool_btn__ __ir_theme_btn__ ${settings.theme==='green'?'__ir_active__':''}" data-action="themeGreen" title="绿意">
              🌿
            </button>
            <button class="__ir_tool_btn__ __ir_theme_btn__ ${settings.theme==='dark'?'__ir_active__':''}" data-action="themeDark" title="暗色" style="border-radius:0 5px 5px 0;">
              ${ICONS.moon}
            </button>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:2px;flex-shrink:0;">
          <button class="__ir_tool_btn__" data-action="scrollTop" title="回到顶部">
            ${ICONS.scroll}
          </button>
          <button class="__ir_tool_btn__" data-action="print" title="打印">
            ${ICONS.print}
          </button>
          <button class="__ir_tool_btn__" data-action="close" title="退出阅读 (Esc)" style="color:#e74c3c;">
            ${ICONS.close}
          </button>
        </div>
      </div>
      <div id="__ir_content_wrap__" style="
        max-width:${settings.contentWidth}px; margin:0 auto;
        padding:48px 24px 120px; color:${s.text};
        line-height:${settings.lineHeight}; font-size:${settings.fontSize}px;
        transition: max-width 0.3s, color 0.3s, font-size 0.2s;
      ">
        <div id="__ir_content__">${content}</div>
      </div>
    `;

    const style = document.createElement('style');
    style.id = '__ir_styles__';
    style.textContent = `
      .__ir_tool_btn__ {
        display:inline-flex; align-items:center; justify-content:center;
        width:32px; height:28px; border:none; cursor:pointer;
        background:transparent; color:${s.secondary}; border-radius:5px;
        transition: all 0.15s ease;
      }
      .__ir_tool_btn__:hover { background:${s.btnHover}; color:${s.text}; }
      .__ir_tool_btn__.__ir_active__ { background:${s.btnActive}; color:${s.text}; font-weight:600; }
      .__ir_tool_btn__ svg { pointer-events:none; width:16px; height:16px; }

      #__ir_content__ h1 {
        font-size: 2em; font-weight: 700; color: ${s.titleColor};
        margin: 1.2em 0 0.6em; line-height: 1.3;
        border-bottom: 1px solid ${s.border}; padding-bottom: 0.3em;
      }
      #__ir_content__ h2 {
        font-size: 1.6em; font-weight: 600; color: ${s.titleColor};
        margin: 1em 0 0.5em; line-height: 1.35;
      }
      #__ir_content__ h3 {
        font-size: 1.3em; font-weight: 600; color: ${s.titleColor};
        margin: 0.8em 0 0.4em; line-height: 1.4;
      }
      #__ir_content__ h4, #__ir_content__ h5, #__ir_content__ h6 {
        font-size: 1.1em; font-weight: 600; color: ${s.titleColor};
        margin: 0.6em 0 0.3em;
      }
      #__ir_content__ p {
        margin: 0 0 1.2em; text-align: justify;
        word-break: break-word;
      }
      #__ir_content__ img {
        max-width: 100%; height: auto; border-radius: 8px;
        margin: 1em auto; display: block;
        box-shadow: ${s.shadow};
      }
      #__ir_content__ a { color: ${s.linkColor}; text-decoration: none; border-bottom: 1px solid transparent; transition: border-color 0.2s; }
      #__ir_content__ a:hover { border-bottom-color: ${s.linkColor}; }
      #__ir_content__ blockquote {
        margin: 1em 0; padding: 12px 20px;
        border-left: 4px solid ${s.blockquoteBorder};
        background: ${s.blockquoteBg}; border-radius: 0 6px 6px 0;
        color: ${s.secondary};
      }
      #__ir_content__ blockquote p:last-child { margin-bottom: 0; }
      #__ir_content__ pre {
        background: ${s.codeBg}; padding: 16px 20px;
        border-radius: 8px; overflow-x: auto;
        font-size: 0.9em; line-height: 1.6;
        margin: 1em 0;
      }
      #__ir_content__ code {
        background: ${s.codeBg}; padding: 2px 6px;
        border-radius: 3px; font-size: 0.88em;
      }
      #__ir_content__ pre code { background: transparent; padding: 0; }
      #__ir_content__ ul, #__ir_content__ ol {
        margin: 0.8em 0; padding-left: 2em;
      }
      #__ir_content__ li { margin: 0.3em 0; }
      #__ir_content__ hr {
        border: none; border-top: 1px solid ${s.border};
        margin: 2em 0;
      }
      #__ir_content__ table {
        width: 100%; border-collapse: collapse; margin: 1em 0;
        font-size: 0.95em;
      }
      #__ir_content__ th, #__ir_content__ td {
        border: 1px solid ${s.border}; padding: 8px 12px; text-align: left;
      }
      #__ir_content__ th { background: ${s.codeBg}; font-weight: 600; }
      #__ir_content__ figure { margin: 1em 0; text-align: center; }
      #__ir_content__ figcaption { font-size: 0.88em; color: ${s.secondary}; margin-top: 0.5em; }

      @keyframes __ir_fade_in__ {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
      }
      #__ir_content_wrap__ { animation: __ir_fade_in__ 0.4s ease; }

      @media (max-width: 768px) {
        #__ir_toolbar__ { padding: 6px 8px; gap: 4px; }
        .__ir_btn_group__ { display: none !important; }
        .__ir_btn_group__:first-of-type { display: flex !important; }
        .__ir_btn_group__:nth-of-type(3) { display: flex !important; }
        #__ir_content_wrap__ { padding: 24px 16px 80px; }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    overlay.addEventListener('click', function(e) {
      const btn = e.target.closest('.__ir_tool_btn__');
      if (!btn) return;
      const action = btn.dataset.action;
      handleAction(action);
    });

    document.addEventListener('keydown', handleKeydown);
  }

  function handleKeydown(e) {
    if (!isActive) return;
    if (e.key === 'Escape') deactivate();
    if (e.key === '+' || e.key === '=') { e.preventDefault(); adjustFontSize(1); }
    if (e.key === '-') { e.preventDefault(); adjustFontSize(-1); }
  }

  function handleAction(action) {
    switch(action) {
      case 'close': deactivate(); break;
      case 'fontUp': adjustFontSize(1); break;
      case 'fontDown': adjustFontSize(-1); break;
      case 'widthUp': adjustWidth(60); break;
      case 'widthDown': adjustWidth(-60); break;
      case 'fontSerif': setFont('serif'); break;
      case 'fontSans': setFont('sans'); break;
      case 'fontMono': setFont('mono'); break;
      case 'themeLight': setTheme('light'); break;
      case 'themeDark': setTheme('dark'); break;
      case 'themeSepia': setTheme('sepia'); break;
      case 'themeGreen': setTheme('green'); break;
      case 'scrollTop': overlay && overlay.scrollTo({ top: 0, behavior: 'smooth' }); break;
      case 'print': window.print(); break;
    }
  }

  function adjustFontSize(delta) {
    settings.fontSize = Math.max(12, Math.min(32, settings.fontSize + delta));
    const wrap = document.getElementById('__ir_content_wrap__');
    const display = document.getElementById('__ir_font_size_display__');
    if (wrap) wrap.style.fontSize = settings.fontSize + 'px';
    if (display) display.textContent = settings.fontSize + 'px';
    saveSettings();
  }

  function adjustWidth(delta) {
    settings.contentWidth = Math.max(480, Math.min(1200, settings.contentWidth + delta));
    const wrap = document.getElementById('__ir_content_wrap__');
    if (wrap) wrap.style.maxWidth = settings.contentWidth + 'px';
    saveSettings();
  }

  function setFont(font) {
    settings.fontFamily = font;
    const wrap = document.getElementById('__ir_content_wrap__');
    if (wrap) wrap.style.fontFamily = getFontFamily(font);
    document.querySelectorAll('.__ir_font_btn__').forEach(btn => btn.classList.remove('__ir_active__'));
    const map = { serif: 'fontSerif', sans: 'fontSans', mono: 'fontMono' };
    const activeBtn = document.querySelector(`[data-action="${map[font]}"]`);
    if (activeBtn) activeBtn.classList.add('__ir_active__');
    saveSettings();
  }

  function setTheme(theme) {
    settings.theme = theme;
    const s = getThemeStyles(theme);
    if (overlay) overlay.style.background = s.bg;
    const toolbar = document.getElementById('__ir_toolbar__');
    if (toolbar) {
      toolbar.style.background = s.toolbarBg;
      toolbar.style.borderColor = s.border;
      toolbar.style.boxShadow = s.shadow;
      toolbar.querySelector('span').style.color = s.titleColor;
    }
    const wrap = document.getElementById('__ir_content_wrap__');
    if (wrap) wrap.style.color = s.text;

    const style = document.getElementById('__ir_styles__');
    if (style) {
      style.textContent = style.textContent.replace(/__THEME_BG__/g, s.bg);
    }

    document.querySelectorAll('.__ir_theme_btn__').forEach(btn => btn.classList.remove('__ir_active__'));
    const map = { light: 'themeLight', dark: 'themeDark', sepia: 'themeSepia', green: 'themeGreen' };
    const activeBtn = document.querySelector(`[data-action="${map[theme]}"]`);
    if (activeBtn) activeBtn.classList.add('__ir_active__');
    saveSettings();

    fullThemeRefresh(s);
  }

  function fullThemeRefresh(s) {
    const style = document.getElementById('__ir_styles__');
    if (!style) return;
    style.textContent = `
      .__ir_tool_btn__ {
        display:inline-flex; align-items:center; justify-content:center;
        width:32px; height:28px; border:none; cursor:pointer;
        background:transparent; color:${s.secondary}; border-radius:5px;
        transition: all 0.15s ease;
      }
      .__ir_tool_btn__:hover { background:${s.btnHover}; color:${s.text}; }
      .__ir_tool_btn__.__ir_active__ { background:${s.btnActive}; color:${s.text}; font-weight:600; }
      .__ir_tool_btn__ svg { pointer-events:none; width:16px; height:16px; }
      #__ir_content__ h1 { font-size:2em; font-weight:700; color:${s.titleColor}; margin:1.2em 0 0.6em; line-height:1.3; border-bottom:1px solid ${s.border}; padding-bottom:0.3em; }
      #__ir_content__ h2 { font-size:1.6em; font-weight:600; color:${s.titleColor}; margin:1em 0 0.5em; line-height:1.35; }
      #__ir_content__ h3 { font-size:1.3em; font-weight:600; color:${s.titleColor}; margin:0.8em 0 0.4em; line-height:1.4; }
      #__ir_content__ h4, #__ir_content__ h5, #__ir_content__ h6 { font-size:1.1em; font-weight:600; color:${s.titleColor}; margin:0.6em 0 0.3em; }
      #__ir_content__ p { margin:0 0 1.2em; text-align:justify; word-break:break-word; }
      #__ir_content__ img { max-width:100%; height:auto; border-radius:8px; margin:1em auto; display:block; box-shadow:${s.shadow}; }
      #__ir_content__ a { color:${s.linkColor}; text-decoration:none; border-bottom:1px solid transparent; transition:border-color 0.2s; }
      #__ir_content__ a:hover { border-bottom-color:${s.linkColor}; }
      #__ir_content__ blockquote { margin:1em 0; padding:12px 20px; border-left:4px solid ${s.blockquoteBorder}; background:${s.blockquoteBg}; border-radius:0 6px 6px 0; color:${s.secondary}; }
      #__ir_content__ blockquote p:last-child { margin-bottom:0; }
      #__ir_content__ pre { background:${s.codeBg}; padding:16px 20px; border-radius:8px; overflow-x:auto; font-size:0.9em; line-height:1.6; margin:1em 0; }
      #__ir_content__ code { background:${s.codeBg}; padding:2px 6px; border-radius:3px; font-size:0.88em; }
      #__ir_content__ pre code { background:transparent; padding:0; }
      #__ir_content__ ul, #__ir_content__ ol { margin:0.8em 0; padding-left:2em; }
      #__ir_content__ li { margin:0.3em 0; }
      #__ir_content__ hr { border:none; border-top:1px solid ${s.border}; margin:2em 0; }
      #__ir_content__ table { width:100%; border-collapse:collapse; margin:1em 0; font-size:0.95em; }
      #__ir_content__ th, #__ir_content__ td { border:1px solid ${s.border}; padding:8px 12px; text-align:left; }
      #__ir_content__ th { background:${s.codeBg}; font-weight:600; }
      #__ir_content__ figure { margin:1em 0; text-align:center; }
      #__ir_content__ figcaption { font-size:0.88em; color:${s.secondary}; margin-top:0.5em; }
      @keyframes __ir_fade_in__ { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      #__ir_content_wrap__ { animation:__ir_fade_in__ 0.4s ease; }
      @media (max-width:768px) {
        #__ir_toolbar__ { padding:6px 8px; gap:4px; }
        .__ir_btn_group__ { display:none !important; }
        .__ir_btn_group__:first-of-type { display:flex !important; }
        .__ir_btn_group__:nth-of-type(3) { display:flex !important; }
        #__ir_content_wrap__ { padding:24px 16px 80px; }
      }
    `;
  }

  function deactivate() {
    if (!isActive) return;
    isActive = false;
    document.removeEventListener('keydown', handleKeydown);
    if (overlay) {
      overlay.style.opacity = '0';
      setTimeout(() => {
        if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
        overlay = null;
      }, 300);
    }
    const style = document.getElementById('__ir_styles__');
    if (style) style.remove();
    document.body.style.overflow = '';
  }

  // Floating trigger button
  function createTriggerButton() {
    const btn = document.createElement('div');
    btn.id = '__ir_trigger__';
    btn.title = '沉浸式阅读';
    btn.innerHTML = ICONS.book;
    btn.style.cssText = `
      position:fixed; z-index:2147483645;
      right:20px; bottom:80px;
      width:44px; height:44px;
      display:flex; align-items:center; justify-content:center;
      background:#fff; border-radius:50%;
      box-shadow:0 2px 12px rgba(0,0,0,0.15);
      cursor:pointer; transition:all 0.25s ease;
      color:#333; user-select:none;
    `;
    btn.addEventListener('mouseenter', () => {
      btn.style.transform = 'scale(1.1)';
      btn.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'scale(1)';
      btn.style.boxShadow = '0 2px 12px rgba(0,0,0,0.15)';
    });
    btn.addEventListener('click', () => {
      if (!isActive) activate();
    });
    document.body.appendChild(btn);

    setTimeout(() => {
      btn.style.opacity = '0.7';
      btn.addEventListener('mouseenter', () => { btn.style.opacity = '1'; });
      btn.addEventListener('mouseleave', () => { btn.style.opacity = '0.7'; });
    }, 5000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createTriggerButton);
  } else {
    createTriggerButton();
  }
})();