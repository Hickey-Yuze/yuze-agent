(function() {
  const APP_ID = '__immersive_reader_basic__';
  const STYLE_ID = APP_ID + '_style';
  const OVERLAY_ID = APP_ID + '_overlay';
  const PANEL_ID = APP_ID + '_panel';
  const TOPBAR_ID = APP_ID + '_topbar';
  const CONTENT_ID = APP_ID + '_content';
  const TOC_TOGGLE_ID = APP_ID + '_toc_toggle';
  const TOC_PANEL_ID = APP_ID + '_toc_panel';
  const TOP_BTN_ID = APP_ID + '_top_btn';
  const PROGRESS_ID = APP_ID + '_progress';

  if (document.getElementById(APP_ID) || document.getElementById(OVERLAY_ID)) {
    console.warn('Immersive reader already exists.');
    return;
  }

  const state = {
    theme: 'light',
    fontSize: 18,
    headings: [],
    activeHeadingId: '',
    originalBodyOverflow: document.body.style.overflow || '',
    originalDocumentOverflow: document.documentElement.style.overflow || '',
    cleanupFns: [],
    progressSyncTimer: null
  };

  function qs(selector, root) {
    return (root || document).querySelector(selector);
  }

  function qsa(selector, root) {
    return Array.from((root || document).querySelectorAll(selector));
  }

  function createEl(tag, attrs, html) {
    const el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function(key) {
        if (key === 'class') {
          el.className = attrs[key];
        } else if (key === 'style') {
          el.style.cssText = attrs[key];
        } else if (key === 'dataset') {
          Object.keys(attrs.dataset).forEach(function(k) {
            el.dataset[k] = attrs.dataset[k];
          });
        } else if (key === 'text') {
          el.textContent = attrs[key];
        } else {
          el.setAttribute(key, attrs[key]);
        }
      });
    }
    if (html != null) el.innerHTML = html;
    return el;
  }

  function removeNode(target) {
    const el = typeof target === 'string' ? document.getElementById(target) : target;
    if (el && el.parentNode) {
      el.parentNode.removeChild(el);
    }
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function slugify(text) {
    return String(text || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\u4e00-\u9fa5-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || ('section-' + Math.random().toString(36).slice(2, 8));
  }

  function isProbablyVisible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function getTextDensityScore(el) {
    if (!el || !isProbablyVisible(el)) return 0;

    const text = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
    const len = text.length;
    if (len < 80) return 0;

    const pCount = qsa('p', el).length;
    const headingCount = qsa('h1,h2,h3,h4,h5,h6', el).length;
    const imgCount = qsa('img', el).length;
    const linkCount = qsa('a', el).length;
    const articleBonus = /article|content|post|entry|main|body|reader/i.test(
      [el.id, el.className].join(' ')
    ) ? 400 : 0;

    return len + pCount * 80 + headingCount * 30 + imgCount * 20 - linkCount * 3 + articleBonus;
  }

  function findBestContentRoot() {
    const selectors = [
      'article',
      'main',
      '[role="main"]',
      '.article',
      '.post',
      '.content',
      '.entry-content',
      '.post-content',
      '.article-content',
      '.rich_media_content',
      '.markdown-body',
      '.doc-content'
    ];

    let best = null;
    let bestScore = 0;

    selectors.forEach(function(sel) {
      qsa(sel).forEach(function(el) {
        const score = getTextDensityScore(el);
        if (score > bestScore) {
          bestScore = score;
          best = el;
        }
      });
    });

    if (!best) {
      qsa('div, section, main').forEach(function(el) {
        const score = getTextDensityScore(el);
        if (score > bestScore) {
          bestScore = score;
          best = el;
        }
      });
    }

    return best || document.body;
  }

  function cleanContentClone(root) {
    const clone = root.cloneNode(true);

    qsa('script,style,noscript,iframe,canvas,svg,video,audio,form,button,input,select,textarea,nav,footer,aside', clone)
      .forEach(function(el) {
        el.remove();
      });

    qsa('*', clone).forEach(function(el) {
      const cls = (el.className || '').toString();
      const id = (el.id || '').toString();
      const mark = (cls + ' ' + id).toLowerCase();

      if (/comment|related|recommend|sidebar|share|toolbar|advert|ads|copyright|footer|header|breadcrumb|menu|nav|avatar|author-card/.test(mark)) {
        el.remove();
        return;
      }

      Array.from(el.attributes || []).forEach(function(attr) {
        if (/^on/i.test(attr.name)) {
          el.removeAttribute(attr.name);
        }
      });
    });

    qsa('a', clone).forEach(function(a) {
      const span = document.createElement('span');
      span.innerHTML = a.innerHTML;
      a.replaceWith(span);
    });

    qsa('img', clone).forEach(function(img) {
      img.removeAttribute('srcset');
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      img.loading = 'lazy';
      img.decoding = 'async';
    });

    return clone;
  }

  function buildReadableHtml() {
    const root = findBestContentRoot();
    const clone = cleanContentClone(root);
    return clone.innerHTML || '<p>未识别到可阅读正文。</p>';
  }

  function extractPageTitle() {
    const h1 = qs('h1');
    const title = (h1 && h1.innerText.trim()) || document.title || '沉浸式阅读';
    return title.trim();
  }

  function buildTocDataFromContent(contentRoot) {
    state.headings = [];
    const usedIds = new Set();

    qsa('h1,h2,h3', contentRoot).forEach(function(h, index) {
      const text = (h.textContent || '').replace(/\s+/g, ' ').trim();
      if (!text) return;

      let id = h.id || slugify(text);
      while (usedIds.has(id)) id = id + '-' + index;
      usedIds.add(id);
      h.id = id;

      state.headings.push({
        id: id,
        text: text,
        level: Number(h.tagName.replace('H', '')) || 2
      });
    });
  }

  function getThemeVars(theme) {
    if (theme === 'dark') {
      return {
        bg: '#0f1115',
        panel: '#151922',
        panelStrong: '#1b2130',
        panelBorder: 'rgba(255,255,255,.08)',
        panelBorderStrong: 'rgba(255,255,255,.14)',
        text: '#e8ecf3',
        textSoft: '#aeb8c7',
        heading: '#f7f9fc',
        accent: '#6ea8fe',
        accentStrong: '#4c8dff',
        accentSoft: 'rgba(110,168,254,.14)',
        btnText: '#eef4ff',
        progressTrack: 'rgba(255,255,255,.12)',
        shadow: '0 10px 30px rgba(0,0,0,.28)',
        shadowStrong: '0 18px 48px rgba(0,0,0,.38)',
        outline: '0 0 0 1px rgba(255,255,255,.04)'
      };
    }

    if (theme === 'sepia') {
      return {
        bg: '#f6efe3',
        panel: '#fbf6ee',
        panelStrong: '#f8f1e7',
        panelBorder: 'rgba(98,74,46,.12)',
        panelBorderStrong: 'rgba(98,74,46,.18)',
        text: '#4d3b28',
        textSoft: '#7a644c',
        heading: '#2f2418',
        accent: '#b7791f',
        accentStrong: '#975f12',
        accentSoft: 'rgba(183,121,31,.12)',
        btnText: '#fffaf2',
        progressTrack: 'rgba(98,74,46,.12)',
        shadow: '0 10px 30px rgba(90,64,36,.10)',
        shadowStrong: '0 18px 48px rgba(90,64,36,.14)',
        outline: '0 0 0 1px rgba(98,74,46,.04)'
      };
    }

    return {
      bg: '#f7f8fb',
      panel: '#ffffff',
      panelStrong: '#ffffff',
      panelBorder: 'rgba(15,23,42,.08)',
      panelBorderStrong: 'rgba(15,23,42,.12)',
      text: '#1f2937',
      textSoft: '#667085',
      heading: '#0f172a',
      accent: '#3b82f6',
      accentStrong: '#2563eb',
      accentSoft: 'rgba(59,130,246,.10)',
      btnText: '#ffffff',
      progressTrack: 'rgba(15,23,42,.10)',
      shadow: '0 10px 30px rgba(15,23,42,.08)',
      shadowStrong: '0 18px 48px rgba(15,23,42,.12)',
      outline: '0 0 0 1px rgba(15,23,42,.03)'
    };
  }

  function injectStyle() {
    removeNode(STYLE_ID);

    const vars = getThemeVars(state.theme);
    const style = createEl('style', { id: STYLE_ID });
    style.textContent = `
      :root{
        --ir-bg:${vars.bg};
        --ir-panel:${vars.panel};
        --ir-panel-strong:${vars.panelStrong};
        --ir-panel-border:${vars.panelBorder};
        --ir-panel-border-strong:${vars.panelBorderStrong};
        --ir-text:${vars.text};
        --ir-text-soft:${vars.textSoft};
        --ir-heading:${vars.heading};
        --ir-accent:${vars.accent};
        --ir-accent-strong:${vars.accentStrong};
        --ir-accent-soft:${vars.accentSoft};
        --ir-btn-text:${vars.btnText};
        --ir-progress-track:${vars.progressTrack};
        --ir-shadow:${vars.shadow};
        --ir-shadow-strong:${vars.shadowStrong};
        --ir-outline:${vars.outline};
      }

      #${OVERLAY_ID}{
        position:fixed;
        inset:0;
        z-index:2147483645;
        overflow:auto;
        background:var(--ir-bg);
        color:var(--ir-text);
        -webkit-font-smoothing:antialiased;
        text-rendering:optimizeLegibility;
        scroll-behavior:smooth;
      }

      #${APP_ID}{
        position:relative;
        min-height:100vh;
      }

      #${TOPBAR_ID}{
        position:sticky;
        top:0;
        z-index:5;
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:16px;
        padding:14px 20px;
        background:linear-gradient(
          180deg,
          color-mix(in srgb, var(--ir-panel-strong) 92%, transparent),
          color-mix(in srgb, var(--ir-panel) 78%, transparent)
        );
        border-bottom:1px solid var(--ir-panel-border-strong);
        box-shadow:var(--ir-shadow), var(--ir-outline);
        backdrop-filter:blur(18px) saturate(150%);
        -webkit-backdrop-filter:blur(18px) saturate(150%);
      }

      .ir-title-wrap{
        min-width:0;
        display:flex;
        align-items:center;
        gap:12px;
      }

      .ir-badge{
        display:inline-flex;
        align-items:center;
        justify-content:center;
        height:28px;
        padding:0 12px;
        border-radius:999px;
        background:var(--ir-accent-soft);
        color:var(--ir-accent-strong);
        font:700 12px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif;
        flex:none;
      }

      .ir-title{
        color:var(--ir-heading);
        font:700 18px/1.35 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif;
        white-space:nowrap;
        overflow:hidden;
        text-overflow:ellipsis;
      }

      .ir-actions{
        display:flex;
        align-items:center;
        gap:10px;
        flex-wrap:wrap;
        justify-content:flex-end;
      }

      .ir-btn{
        appearance:none;
        border:none;
        outline:none;
        cursor:pointer;
        height:36px;
        padding:0 14px;
        border-radius:12px;
        background:var(--ir-panel);
        color:var(--ir-text) !important;
        border:1px solid var(--ir-panel-border);
        box-shadow:var(--ir-outline);
        font:600 13px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif;
        transition:all .18s ease;
      }

      .ir-btn:hover{
        transform:translateY(-1px);
        border-color:var(--ir-panel-border-strong);
        box-shadow:var(--ir-shadow), var(--ir-outline);
      }

      .ir-btn[data-primary="1"]{
        background:linear-gradient(180deg, var(--ir-accent), var(--ir-accent-strong));
        color:var(--ir-btn-text) !important;
        border-color:transparent;
      }

      #${PANEL_ID}{
        width:min(920px, calc(100vw - 48px));
        margin:28px auto 56px;
        background:var(--ir-panel);
        border:1px solid var(--ir-panel-border);
        border-radius:24px;
        box-shadow:var(--ir-shadow-strong), var(--ir-outline);
        overflow:hidden;
      }

      .ir-cover{
        padding:34px 38px 20px;
        border-bottom:1px solid var(--ir-panel-border);
        background:
          radial-gradient(circle at top right, var(--ir-accent-soft), transparent 34%),
          linear-gradient(180deg, color-mix(in srgb, var(--ir-panel-strong) 98%, transparent), var(--ir-panel));
      }

      .ir-cover h1{
        margin:0;
        color:var(--ir-heading) !important;
        font:800 34px/1.28 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif;
        letter-spacing:-.02em;
      }

      .ir-cover p{
        margin:10px 0 0;
        color:var(--ir-text-soft) !important;
        font:500 14px/1.7 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif;
      }

      #${CONTENT_ID}{
        padding:34px 38px 44px;
      }

      #${CONTENT_ID},
      #${CONTENT_ID} *{
        color:var(--ir-text) !important;
      }

      #${CONTENT_ID} h1,
      #${CONTENT_ID} h2,
      #${CONTENT_ID} h3,
      #${CONTENT_ID} h4,
      #${CONTENT_ID} h5,
      #${CONTENT_ID} h6{
        color:var(--ir-heading) !important;
        line-height:1.4;
        margin:1.5em 0 .7em;
        font-weight:800;
      }

      #${CONTENT_ID} h1{ font-size:2em; }
      #${CONTENT_ID} h2{ font-size:1.6em; }
      #${CONTENT_ID} h3{ font-size:1.3em; }

      #${CONTENT_ID} p,
      #${CONTENT_ID} li,
      #${CONTENT_ID} blockquote{
        font-size:${state.fontSize}px;
        line-height:1.95;
        margin:0 0 1.1em;
      }

      #${CONTENT_ID} ul,
      #${CONTENT_ID} ol{
        padding-left:1.5em;
        margin:0 0 1.1em;
      }

      #${CONTENT_ID} img{
        display:block;
        max-width:100%;
        height:auto;
        margin:22px auto;
        border-radius:16px;
        box-shadow:var(--ir-shadow);
      }

      #${CONTENT_ID} pre,
      #${CONTENT_ID} code{
        font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;
      }

      #${CONTENT_ID} pre{
        overflow:auto;
        padding:16px;
        border-radius:14px;
        background:color-mix(in srgb, var(--ir-panel-strong) 92%, #000 8%);
        border:1px solid var(--ir-panel-border);
      }

      #${CONTENT_ID} blockquote{
        padding:12px 16px;
        border-left:4px solid var(--ir-accent);
        background:var(--ir-accent-soft);
        border-radius:0 12px 12px 0;
      }

      #${CONTENT_ID} table{
        width:100%;
        border-collapse:collapse;
        margin:18px 0;
        display:block;
        overflow:auto;
      }

      #${CONTENT_ID} th,
      #${CONTENT_ID} td{
        border:1px solid var(--ir-panel-border);
        padding:10px 12px;
      }

      #${TOC_TOGGLE_ID}{
        position:fixed;
        left:18px;
        top:88px;
        z-index:2147483646;
        display:flex;
        align-items:center;
        gap:8px;
        padding:0 14px;
        height:44px;
        border:none;
        border-radius:999px;
        cursor:pointer;
        background:linear-gradient(180deg, var(--ir-panel-strong), var(--ir-panel));
        color:var(--ir-text) !important;
        border:1px solid var(--ir-panel-border-strong);
        box-shadow:var(--ir-shadow-strong), var(--ir-outline);
        backdrop-filter:blur(14px) saturate(140%);
        -webkit-backdrop-filter:blur(14px) saturate(140%);
        font:700 13px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif;
      }

      #${TOC_PANEL_ID}{
        position:fixed;
        left:18px;
        top:142px;
        width:min(280px, calc(100vw - 36px));
        max-height:calc(100vh - 170px);
        overflow:auto;
        z-index:2147483646;
        background:linear-gradient(180deg, var(--ir-panel-strong), var(--ir-panel));
        border:1px solid var(--ir-panel-border-strong);
        border-radius:20px;
        box-shadow:var(--ir-shadow-strong), var(--ir-outline);
        backdrop-filter:blur(18px) saturate(145%);
        -webkit-backdrop-filter:blur(18px) saturate(145%);
        padding:14px;
        display:none;
      }

      #${TOC_PANEL_ID}[data-open="1"]{
        display:block;
      }

      .ir-toc-head{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:10px;
        margin-bottom:10px;
        padding-bottom:10px;
        border-bottom:1px solid var(--ir-panel-border);
      }

      .ir-toc-title{
        color:var(--ir-heading);
        font:800 14px/1.2 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif;
      }

      .ir-toc-badge{
        display:inline-flex;
        align-items:center;
        justify-content:center;
        min-width:22px;
        height:22px;
        padding:0 8px;
        border-radius:999px;
        background:var(--ir-accent-soft);
        color:var(--ir-accent-strong);
        font:700 11px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif;
      }

      .ir-toc-list{
        display:flex;
        flex-direction:column;
        gap:4px;
      }

      .ir-toc-item{
        display:block;
        width:100%;
        border:none;
        background:transparent;
        text-align:left;
        cursor:pointer;
        border-radius:12px;
        padding:10px 12px;
        color:var(--ir-text) !important;
        font:600 13px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif;
        transition:all .15s ease;
      }

      .ir-toc-item:hover{
        background:color-mix(in srgb, var(--ir-accent-soft) 70%, transparent);
      }

      .ir-toc-item[data-active="1"]{
        background:var(--ir-accent-soft);
        color:var(--ir-accent-strong) !important;
      }

      .ir-toc-item[data-level="2"]{ padding-left:20px; }
      .ir-toc-item[data-level="3"]{ padding-left:30px; }

      #${TOP_BTN_ID}{
        position:fixed;
        right:20px;
        bottom:22px;
        z-index:2147483646;
        width:48px;
        height:48px;
        border:none;
        border-radius:999px;
        cursor:pointer;
        background:linear-gradient(180deg, var(--ir-accent), var(--ir-accent-strong));
        color:var(--ir-btn-text) !important;
        box-shadow:var(--ir-shadow-strong);
        font:800 18px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
        opacity:0;
        transform:translateY(8px);
        pointer-events:none;
        transition:all .2s ease;
      }

      #${TOP_BTN_ID}[data-show="1"]{
        opacity:1;
        transform:translateY(0);
        pointer-events:auto;
      }

      #${PROGRESS_ID}{
        position:fixed;
        top:50%;
        right:10px;
        transform:translateY(-50%);
        z-index:2147483646;
        pointer-events:none;
      }

      #${PROGRESS_ID} .ir-progress-wrap{
        display:flex;
        flex-direction:column;
        align-items:center;
        gap:10px;
        padding:10px 8px;
        border-radius:18px;
        background:
          linear-gradient(180deg,
            color-mix(in srgb, var(--ir-panel-strong) 96%, transparent),
            color-mix(in srgb, var(--ir-panel) 96%, transparent)
          );
        border:1px solid var(--ir-panel-border-strong);
        box-shadow:var(--ir-shadow-strong), var(--ir-outline);
        backdrop-filter:blur(16px) saturate(145%);
        -webkit-backdrop-filter:blur(16px) saturate(145%);
        min-width:54px;
      }

      #${PROGRESS_ID} .ir-progress-value{
        font:700 12px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif;
        color:var(--ir-text) !important;
        letter-spacing:.02em;
        white-space:nowrap;
      }

      #${PROGRESS_ID} .ir-progress-track{
        position:relative;
        width:8px;
        height:140px;
        border-radius:999px;
        overflow:hidden;
        background:var(--ir-progress-track);
        box-shadow:
          inset 0 0 0 1px color-mix(in srgb, var(--ir-panel-border) 90%, transparent),
          inset 0 6px 10px rgba(0,0,0,.08);
      }

      #${PROGRESS_ID} .ir-progress-fill{
        position:absolute;
        left:0;
        bottom:0;
        width:100%;
        height:0%;
        border-radius:999px;
        background:linear-gradient(
          180deg,
          color-mix(in srgb, var(--ir-accent) 78%, #ffffff 22%),
          var(--ir-accent-strong)
        );
        box-shadow:
          0 0 18px color-mix(in srgb, var(--ir-accent) 34%, transparent),
          0 0 1px color-mix(in srgb, var(--ir-accent) 70%, transparent);
        transition:height .08s linear;
      }

      @media (max-width: 960px){
        #${PANEL_ID}{
          width:min(100vw - 24px, 920px);
          margin:18px auto 42px;
          border-radius:18px;
        }

        .ir-cover{
          padding:24px 22px 16px;
        }

        .ir-cover h1{
          font-size:28px;
        }

        #${CONTENT_ID}{
          padding:22px 22px 28px;
        }
      }

      @media (max-width: 768px){
        #${TOPBAR_ID}{
          padding:12px;
          align-items:flex-start;
          flex-direction:column;
        }

        .ir-actions{
          width:100%;
          justify-content:flex-start;
        }

        #${TOC_TOGGLE_ID}{
          left:10px;
          top:84px;
          height:40px;
          padding:0 12px;
        }

        #${TOC_PANEL_ID}{
          left:10px;
          top:132px;
          width:min(260px, calc(100vw - 20px));
        }

        #${PROGRESS_ID}{
          right:6px;
        }

        #${PROGRESS_ID} .ir-progress-wrap{
          min-width:48px;
          padding:8px 6px;
          border-radius:16px;
        }

        #${PROGRESS_ID} .ir-progress-track{
          height:112px;
        }

        #${PROGRESS_ID} .ir-progress-value{
          font-size:11px;
        }

        #${TOP_BTN_ID}{
          right:14px;
          bottom:14px;
          width:44px;
          height:44px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function createTopbar(title) {
    const topbar = createEl('div', { id: TOPBAR_ID });
    topbar.innerHTML = `
      <div class="ir-title-wrap">
        <span class="ir-badge">沉浸阅读</span>
        <div class="ir-title" title="${escapeHtml(title)}">${escapeHtml(title)}</div>
      </div>
      <div class="ir-actions">
        <button class="ir-btn" type="button" data-action="font-dec">A-</button>
        <button class="ir-btn" type="button" data-action="font-inc">A+</button>
        <button class="ir-btn" type="button" data-action="theme-light">浅色</button>
        <button class="ir-btn" type="button" data-action="theme-dark">深色</button>
        <button class="ir-btn" type="button" data-action="theme-sepia">护眼</button>
        <button class="ir-btn" type="button" data-primary="1" data-action="exit">退出</button>
      </div>
    `;

    topbar.addEventListener('click', function(e) {
      const btn = e.target.closest('.ir-btn');
      if (!btn) return;
      const action = btn.getAttribute('data-action');

      if (action === 'font-dec') {
        state.fontSize = clamp(state.fontSize - 1, 14, 26);
        applyFontSize();
        scheduleProgressSync();
      } else if (action === 'font-inc') {
        state.fontSize = clamp(state.fontSize + 1, 14, 26);
        applyFontSize();
        scheduleProgressSync();
      } else if (action === 'theme-light') {
        state.theme = 'light';
        rerenderTheme();
      } else if (action === 'theme-dark') {
        state.theme = 'dark';
        rerenderTheme();
      } else if (action === 'theme-sepia') {
        state.theme = 'sepia';
        rerenderTheme();
      } else if (action === 'exit') {
        destroy();
      }
    });

    return topbar;
  }

  function applyFontSize() {
    const content = qs('#' + CONTENT_ID);
    if (!content) return;
    qsa('p,li,blockquote', content).forEach(function(el) {
      el.style.fontSize = state.fontSize + 'px';
    });
  }

  function createPanel(title, html) {
    const panel = createEl('div', { id: PANEL_ID });
    panel.innerHTML = `
      <div class="ir-cover">
        <h1>${escapeHtml(title)}</h1>
        <p>已进入沉浸式阅读模式 · ${new Date().toLocaleString()}</p>
      </div>
      <div id="${CONTENT_ID}">${html}</div>
    `;
    return panel;
  }

  function createTocToggle() {
    removeNode(TOC_TOGGLE_ID);
    const btn = createEl('button', { id: TOC_TOGGLE_ID, type: 'button' });
    btn.innerHTML = `☰ <span>目录</span>`;
    btn.addEventListener('click', function() {
      const panel = qs('#' + TOC_PANEL_ID);
      if (!panel) return;
      panel.setAttribute('data-open', panel.getAttribute('data-open') === '1' ? '0' : '1');
    });
    document.body.appendChild(btn);
  }

  function createTocPanel() {
    removeNode(TOC_PANEL_ID);

    const panel = createEl('div', { id: TOC_PANEL_ID, 'data-open': '0' });
    const itemsHtml = state.headings.length
      ? state.headings.map(function(item) {
          return `
            <button class="ir-toc-item" type="button" data-id="${escapeHtml(item.id)}" data-level="${item.level}" data-active="0">
              ${escapeHtml(item.text)}
            </button>
          `;
        }).join('')
      : `<div style="padding:8px 10px;color:var(--ir-text-soft);font:600 13px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'PingFang SC','Microsoft YaHei',sans-serif;">未检测到目录标题</div>`;

    panel.innerHTML = `
      <div class="ir-toc-head">
        <div class="ir-toc-title">文章目录</div>
        <div class="ir-toc-badge">${state.headings.length}</div>
      </div>
      <div class="ir-toc-list">${itemsHtml}</div>
    `;

    panel.addEventListener('click', function(e) {
      const item = e.target.closest('.ir-toc-item');
      if (!item) return;

      const id = item.getAttribute('data-id');
      const overlay = qs('#' + OVERLAY_ID);
      const content = qs('#' + CONTENT_ID);
      const target = qs('#' + id, content);

      if (!id || !overlay || !target || !content) return;

      const top = target.offsetTop + content.offsetTop - 18;
      overlay.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      scheduleProgressSync();
    });

    document.body.appendChild(panel);
  }

  function createTopButton() {
    removeNode(TOP_BTN_ID);
    const btn = createEl('button', {
      id: TOP_BTN_ID,
      type: 'button',
      'data-show': '0',
      title: '回到顶部'
    }, '↑');

    btn.addEventListener('click', function() {
      const overlay = qs('#' + OVERLAY_ID);
      if (overlay) {
        overlay.scrollTo({ top: 0, behavior: 'smooth' });
        scheduleProgressSync();
      }
    });

    document.body.appendChild(btn);
  }

  function createProgressBar() {
    removeNode(PROGRESS_ID);

    const progress = createEl('div', { id: PROGRESS_ID });
    progress.innerHTML = `
      <div class="ir-progress-wrap" aria-hidden="true">
        <div class="ir-progress-value">0%</div>
        <div class="ir-progress-track">
          <div class="ir-progress-fill"></div>
        </div>
      </div>
    `;

    document.body.appendChild(progress);
  }

  function getReadingProgressPercent() {
    const overlay = qs('#' + OVERLAY_ID);
    const content = qs('#' + CONTENT_ID);

    if (!overlay || !content) return 0;

    const contentTop = content.offsetTop;
    const contentHeight = content.scrollHeight;
    const viewportHeight = overlay.clientHeight;
    const scrollTop = overlay.scrollTop;

    if (contentHeight <= viewportHeight) return 100;

    const maxScrollable = Math.max(1, contentHeight - viewportHeight);
    const contentScrolled = clamp(scrollTop - contentTop, 0, maxScrollable);
    return (contentScrolled / maxScrollable) * 100;
  }

  function updateProgress() {
    const progressRoot = qs('#' + PROGRESS_ID);
    const fill = qs('.ir-progress-fill', progressRoot);
    const value = qs('.ir-progress-value', progressRoot);
    const topBtn = qs('#' + TOP_BTN_ID);
    const overlay = qs('#' + OVERLAY_ID);

    if (!progressRoot || !fill || !value || !overlay) return;

    const percent = clamp(getReadingProgressPercent(), 0, 100);
    const displayPercent = Math.round(percent);

    fill.style.height = displayPercent + '%';
    value.textContent = displayPercent + '%';

    if (topBtn) {
      topBtn.setAttribute('data-show', overlay.scrollTop > 300 ? '1' : '0');
    }
  }

  function updateActiveHeading() {
    const overlay = qs('#' + OVERLAY_ID);
    const content = qs('#' + CONTENT_ID);

    if (!overlay || !content || !state.headings.length) return;

    const contentTop = content.offsetTop;
    let currentId = state.headings[0] ? state.headings[0].id : '';

    state.headings.forEach(function(item) {
      const el = qs('#' + item.id, content);
      if (!el) return;
      const top = contentTop + el.offsetTop;
      if (top - overlay.scrollTop <= 140) {
        currentId = item.id;
      }
    });

    if (currentId !== state.activeHeadingId) {
      state.activeHeadingId = currentId;
      qsa('.ir-toc-item').forEach(function(btn) {
        btn.setAttribute('data-active', btn.getAttribute('data-id') === currentId ? '1' : '0');
      });
    }
  }

  function syncUiState() {
    updateProgress();
    updateActiveHeading();
  }

  function scheduleProgressSync() {
    if (state.progressSyncTimer) {
      clearTimeout(state.progressSyncTimer);
      state.progressSyncTimer = null;
    }

    syncUiState();

    requestAnimationFrame(function() {
      syncUiState();
    });

    state.progressSyncTimer = setTimeout(function() {
      syncUiState();
      state.progressSyncTimer = null;
    }, 120);
  }

  function bindOverlayScroll() {
    const overlay = qs('#' + OVERLAY_ID);
    if (!overlay) return;

    let ticking = false;

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function() {
        syncUiState();
        ticking = false;
      });
    }

    overlay.addEventListener('scroll', onScroll, { passive: true });
    state.cleanupFns.push(function() {
      overlay.removeEventListener('scroll', onScroll);
    });
  }

  function bindResizeSync() {
    function onResize() {
      scheduleProgressSync();
    }

    window.addEventListener('resize', onResize, { passive: true });
    state.cleanupFns.push(function() {
      window.removeEventListener('resize', onResize);
    });
  }

  function bindImageLoadSync() {
    const content = qs('#' + CONTENT_ID);
    if (!content) return;

    qsa('img', content).forEach(function(img) {
      function onDone() {
        scheduleProgressSync();
      }

      if (!img.complete) {
        img.addEventListener('load', onDone, { passive: true });
        img.addEventListener('error', onDone, { passive: true });

        state.cleanupFns.push(function() {
          img.removeEventListener('load', onDone);
          img.removeEventListener('error', onDone);
        });
      }
    });
  }

  function rerenderTheme() {
    injectStyle();
    applyFontSize();
    scheduleProgressSync();
  }

  function buildApp() {
    const title = extractPageTitle();
    const readableHtml = buildReadableHtml();

    const overlay = createEl('div', { id: OVERLAY_ID });
    const app = createEl('div', { id: APP_ID });

    const topbar = createTopbar(title);
    const panel = createPanel(title, readableHtml);

    app.appendChild(topbar);
    app.appendChild(panel);
    overlay.appendChild(app);
    document.body.appendChild(overlay);

    const content = qs('#' + CONTENT_ID);
    if (content) {
      buildTocDataFromContent(content);
    }

    createTocToggle();
    createTocPanel();
    createTopButton();
    createProgressBar();

    bindOverlayScroll();
    bindResizeSync();
    bindImageLoadSync();

    syncUiState();

    requestAnimationFrame(function() {
      syncUiState();
    });

    setTimeout(function() {
      syncUiState();
    }, 80);

    setTimeout(function() {
      syncUiState();
    }, 240);
  }

  function lockPageScroll() {
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
  }

  function unlockPageScroll() {
    document.body.style.overflow = state.originalBodyOverflow;
    document.documentElement.style.overflow = state.originalDocumentOverflow;
  }

  function destroy() {
    if (state.progressSyncTimer) {
      clearTimeout(state.progressSyncTimer);
      state.progressSyncTimer = null;
    }

    state.cleanupFns.forEach(function(fn) {
      try {
        fn();
      } catch (err) {
        console.warn('Cleanup error:', err);
      }
    });
    state.cleanupFns = [];

    removeNode(OVERLAY_ID);
    removeNode(STYLE_ID);
    removeNode(TOC_TOGGLE_ID);
    removeNode(TOC_PANEL_ID);
    removeNode(TOP_BTN_ID);
    removeNode(PROGRESS_ID);

    unlockPageScroll();
  }

  function executeAutomation() {
    console.log('Executing immersive reader script...');
    lockPageScroll();
    injectStyle();
    buildApp();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', executeAutomation, { once: true });
  } else {
    executeAutomation();
  }
})();