(function() {
  if (document.getElementById('__logo-extractor-root__')) return;

  const STYLE = `
    #__logo-extractor-root__ * {
      margin: 0; padding: 0; box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    #__logo-extractor-root__ {
      position: fixed; top: 80px; right: 24px; z-index: 2147483647;
      width: 400px; max-height: 85vh;
      background: #1a1a2e; border: 1px solid #2a2a4a; border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5); color: #e0e0e0;
      display: flex; flex-direction: column; overflow: hidden;
      transition: transform 0.3s ease, opacity 0.3s ease;
    }
    #__logo-extractor-root__.le-collapsed {
      transform: translateX(calc(100% + 30px)); opacity: 0; pointer-events: none;
    }
    .le-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 20px; border-bottom: 1px solid #2a2a4a;
      background: linear-gradient(135deg, #16213e, #1a1a2e);
    }
    .le-header h3 {
      font-size: 15px; font-weight: 600; color: #fff;
      display: flex; align-items: center; gap: 8px;
    }
    .le-header h3 svg { width: 20px; height: 20px; }
    .le-close-btn, .le-toggle-btn {
      width: 32px; height: 32px; border: none; background: rgba(255,255,255,0.06);
      border-radius: 8px; cursor: pointer; display: flex; align-items: center;
      justify-content: center; color: #aaa; transition: all 0.2s;
    }
    .le-close-btn:hover, .le-toggle-btn:hover { background: rgba(255,255,255,0.12); color: #fff; }
    .le-body { padding: 16px 20px; overflow-y: auto; flex: 1; }
    .le-input-group {
      display: flex; gap: 8px; margin-bottom: 16px;
    }
    .le-input {
      flex: 1; height: 42px; padding: 0 14px; border: 1px solid #2a2a4a;
      border-radius: 10px; background: #0f0f23; color: #fff; font-size: 13px;
      outline: none; transition: border-color 0.2s;
    }
    .le-input:focus { border-color: #6c63ff; }
    .le-input::placeholder { color: #555; }
    .le-btn {
      height: 42px; padding: 0 20px; border: none; border-radius: 10px;
      background: linear-gradient(135deg, #6c63ff, #4834d4); color: #fff;
      font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s;
      white-space: nowrap;
    }
    .le-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 15px rgba(108,99,255,0.4); }
    .le-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }
    .le-status {
      font-size: 12px; color: #888; margin-bottom: 12px;
      display: flex; align-items: center; gap: 6px;
    }
    .le-spinner {
      width: 14px; height: 14px; border: 2px solid #333;
      border-top-color: #6c63ff; border-radius: 50%;
      animation: le-spin 0.8s linear infinite;
    }
    @keyframes le-spin { to { transform: rotate(360deg); } }
    .le-results { display: flex; flex-direction: column; gap: 12px; }
    .le-logo-card {
      background: #0f0f23; border: 1px solid #2a2a4a; border-radius: 12px;
      padding: 14px; transition: border-color 0.2s;
    }
    .le-logo-card:hover { border-color: #6c63ff; }
    .le-logo-card-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 10px;
    }
    .le-logo-type {
      font-size: 11px; font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.5px; color: #6c63ff;
      background: rgba(108,99,255,0.1); padding: 3px 8px; border-radius: 4px;
    }
    .le-logo-size { font-size: 11px; color: #666; }
    .le-logo-preview {
      display: flex; align-items: center; justify-content: center;
      min-height: 80px; max-height: 160px; background: #fff;
      border-radius: 8px; overflow: hidden; margin-bottom: 10px;
    }
    .le-logo-preview img {
      max-width: 100%; max-height: 150px; object-fit: contain;
    }
    .le-logo-url {
      font-size: 11px; color: #555; word-break: break-all;
      margin-bottom: 8px; line-height: 1.4;
    }
    .le-logo-actions { display: flex; gap: 6px; }
    .le-action-btn {
      flex: 1; height: 30px; border: 1px solid #2a2a4a; border-radius: 6px;
      background: transparent; color: #aaa; font-size: 11px; cursor: pointer;
      transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 4px;
    }
    .le-action-btn:hover { border-color: #6c63ff; color: #6c63ff; background: rgba(108,99,255,0.05); }
    .le-empty {
      text-align: center; padding: 30px 0; color: #555; font-size: 13px;
    }
    .le-empty svg { width: 48px; height: 48px; margin-bottom: 12px; opacity: 0.3; }
    .le-fab {
      position: fixed; bottom: 30px; right: 30px; z-index: 2147483646;
      width: 52px; height: 52px; border-radius: 16px; border: none;
      background: linear-gradient(135deg, #6c63ff, #4834d4); color: #fff;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      box-shadow: 0 8px 25px rgba(108,99,255,0.4); transition: all 0.3s;
    }
    .le-fab:hover { transform: translateY(-2px) scale(1.05); box-shadow: 0 12px 35px rgba(108,99,255,0.5); }
    .le-fab svg { width: 24px; height: 24px; }
    .le-badge {
      position: absolute; top: -4px; right: -4px; min-width: 18px; height: 18px;
      background: #ff6b6b; border-radius: 9px; font-size: 10px; font-weight: 700;
      color: #fff; display: flex; align-items: center; justify-content: center;
      padding: 0 4px;
    }
    .le-badge:empty { display: none; }
    .le-divider {
      height: 1px; background: #2a2a4a; margin: 8px 0;
    }
    .le-section-title {
      font-size: 11px; font-weight: 600; color: #555;
      text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;
    }
    .le-api-logos {
      display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
    }
    .le-api-card {
      background: #0f0f23; border: 1px solid #2a2a4a; border-radius: 10px;
      padding: 12px; text-align: center; transition: border-color 0.2s; cursor: pointer;
    }
    .le-api-card:hover { border-color: #6c63ff; }
    .le-api-card img {
      max-width: 64px; max-height: 64px; object-fit: contain; margin-bottom: 6px;
    }
    .le-api-card .le-api-label { font-size: 11px; color: #888; margin-bottom: 6px; }
    .le-api-card .le-api-dl {
      font-size: 10px; color: #6c63ff; text-decoration: none;
    }
  `;

  const ICON_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>`;
  const SEARCH_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;
  const DOWNLOAD_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;
  const COPY_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
  const CLOSE_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
  const EMPTY_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="8" y1="15" x2="16" y2="15"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>`;

  function createRoot() {
    const root = document.createElement('div');
    root.id = '__logo-extractor-root__';
    root.innerHTML = `
      <style>${STYLE}</style>
      <div class="le-header">
        <h3>${ICON_SVG} Logo 提取器</h3>
        <button class="le-close-btn" title="关闭">${CLOSE_SVG}</button>
      </div>
      <div class="le-body">
        <div class="le-input-group">
          <input class="le-input" type="text" placeholder="输入网址，如 https://github.com" />
          <button class="le-btn">${SEARCH_SVG} 提取</button>
        </div>
        <div class="le-status" style="display:none;"></div>
        <div class="le-results">
          <div class="le-empty">${EMPTY_SVG}<br/>输入网址后点击提取，即可获取网站 Logo</div>
        </div>
      </div>
    `;
    document.body.appendChild(root);

    const fab = document.createElement('button');
    fab.className = 'le-fab';
    fab.title = 'Logo 提取器';
    fab.innerHTML = ICON_SVG + '<span class="le-badge"></span>';
    document.body.appendChild(fab);

    return { root, fab };
  }

  function resolveUrl(base, relative) {
    try {
      return new URL(relative, base).href;
    } catch {
      return null;
    }
  }

  function getDomain(url) {
    try {
      return new URL(url).hostname;
    } catch {
      return null;
    }
  }

  function normalizeUrl(input) {
    let url = input.trim();
    if (!url) return null;
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    try {
      return new URL(url).href;
    } catch {
      return null;
    }
  }

  async function extractFromHtml(html, baseUrl) {
    const logos = [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const seen = new Set();
    function addLogo(type, url, size) {
      const resolved = resolveUrl(baseUrl, url);
      if (resolved && !seen.has(resolved)) {
        seen.add(resolved);
        logos.push({ type, url: resolved, size: size || '未知' });
      }
    }

    // 1. Apple Touch Icon (usually highest quality)
    doc.querySelectorAll('link[rel="apple-touch-icon"], link[rel="apple-touch-icon-precomposed"]').forEach(el => {
      const href = el.getAttribute('href');
      const sizes = el.getAttribute('sizes') || '未知';
      if (href) addLogo('Apple Touch Icon', href, sizes);
    });

    // 2. SVG Icon
    doc.querySelectorAll('link[rel="icon"][type="image/svg+xml"], link[rel="alternate icon"][type="image/svg+xml"]').forEach(el => {
      const href = el.getAttribute('href');
      if (href) addLogo('SVG Icon', href, '矢量');
    });

    // 3. Favicon (all types)
    doc.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"], link[rel="mask-icon"]').forEach(el => {
      const href = el.getAttribute('href');
      const sizes = el.getAttribute('sizes') || '未知';
      const type = el.getAttribute('type') || '';
      if (href && !type.includes('svg')) addLogo('Favicon', href, sizes);
    });

    // 4. OG Image
    doc.querySelectorAll('meta[property="og:image"], meta[property="og:image:url"], meta[name="twitter:image"]').forEach(el => {
      const content = el.getAttribute('content');
      if (content) addLogo('OG/Twitter Image', content, '社交分享');
    });

    // 5. Logo <img> elements
    doc.querySelectorAll('img').forEach(el => {
      const src = el.getAttribute('src');
      const cls = (el.getAttribute('class') || '').toLowerCase();
      const id = (el.getAttribute('id') || '').toLowerCase();
      const alt = (el.getAttribute('alt') || '').toLowerCase();
      const srcLower = (src || '').toLowerCase();
      if (src && (
        cls.includes('logo') || id.includes('logo') ||
        alt.includes('logo') || srcLower.includes('logo')
      )) {
        const w = el.getAttribute('width') || '';
        const h = el.getAttribute('height') || '';
        const sizeStr = w && h ? `${w}×${h}` : '未知';
        addLogo('Logo Image', src, sizeStr);
      }
    });

    // 6. SVG elements with logo class/id
    doc.querySelectorAll('svg').forEach(el => {
      const cls = (el.getAttribute('class') || '').toLowerCase();
      const id = (el.getAttribute('id') || '').toLowerCase();
      if (cls.includes('logo') || id.includes('logo')) {
        const svgStr = new XMLSerializer().serializeToString(el);
        const blob = new Blob([svgStr], { type: 'image/svg+xml' });
        const blobUrl = URL.createObjectURL(blob);
        logos.push({ type: 'Inline SVG Logo', url: blobUrl, size: '矢量', isBlob: true });
      }
    });

    // 7. Manifest
    const manifestLink = doc.querySelector('link[rel="manifest"]');
    if (manifestLink) {
      const manifestUrl = resolveUrl(baseUrl, manifestLink.getAttribute('href'));
      if (manifestUrl) {
        try {
          const resp = await fetch(manifestUrl, { mode: 'cors' });
          if (resp.ok) {
            const manifest = await resp.json();
            if (manifest.icons && Array.isArray(manifest.icons)) {
              manifest.icons.forEach(icon => {
                if (icon.src) {
                  const sizes = icon.sizes || '未知';
                  addLogo('PWA Manifest Icon', icon.src, sizes);
                }
              });
            }
          }
        } catch {}
      }
    }

    return logos;
  }

  async function extractLogos(url) {
    const domain = getDomain(url);
    const logos = [];

    // Strategy 1: Fetch and parse HTML
    let htmlLogos = [];
    try {
      const resp = await fetch(url, { mode: 'cors', credentials: 'omit' });
      if (resp.ok) {
        const html = await resp.text();
        htmlLogos = await extractFromHtml(html, url);
        logos.push(...htmlLogos);
      }
    } catch {
      // CORS blocked, skip HTML parsing
    }

    // Strategy 2: Common favicon paths
    const commonPaths = [
      { path: '/favicon.ico', type: 'Favicon (.ico)', size: '默认' },
      { path: '/favicon.png', type: 'Favicon (.png)', size: '默认' },
      { path: '/logo.png', type: 'Root Logo', size: '默认' },
      { path: '/assets/logo.svg', type: 'SVG Logo', size: '矢量' },
      { path: '/images/logo.png', type: 'Logo Image', size: '默认' },
      { path: '/img/logo.png', type: 'Logo Image', size: '默认' },
    ];
    const seenUrls = new Set(logos.map(l => l.url));
    for (const cp of commonPaths) {
      const fullUrl = resolveUrl(url, cp.path);
      if (fullUrl && !seenUrls.has(fullUrl)) {
        try {
          const resp = await fetch(fullUrl, { method: 'HEAD', mode: 'cors' });
          if (resp.ok && resp.headers.get('content-type')?.startsWith('image')) {
            seenUrls.add(fullUrl);
            logos.push({ type: cp.type, url: fullUrl, size: cp.size });
          }
        } catch {}
      }
    }

    // Strategy 3: Third-party APIs (always available, no CORS issues with <img>)
    const apiLogos = [];
    if (domain) {
      apiLogos.push({
        type: 'Google Favicon API',
        url: `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
        size: '128×128'
      });
      apiLogos.push({
        type: 'Clearbit Logo API',
        url: `https://logo.clearbit.com/${domain}`,
        size: '矢量'
      });
    }

    return { logos, apiLogos, domain };
  }

  function downloadImage(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'logo';
    a.target = '_blank';
    a.referrerPolicy = 'no-referrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function renderLogoCard(logo, index) {
    return `
      <div class="le-logo-card">
        <div class="le-logo-card-header">
          <span class="le-logo-type">${logo.type}</span>
          <span class="le-logo-size">${logo.size}</span>
        </div>
        <div class="le-logo-preview">
          <img src="${logo.url}" alt="Logo" onerror="this.parentElement.innerHTML='<span style=color:#555;font-size:12px>加载失败</span>'" referrerpolicy="no-referrer" />
        </div>
        <div class="le-logo-url" title="${logo.url}">${logo.url.length > 60 ? logo.url.substring(0, 60) + '…' : logo.url}</div>
        <div class="le-logo-actions">
          <button class="le-action-btn" data-action="download" data-url="${logo.url}" data-index="${index}">
            ${DOWNLOAD_SVG} 下载
          </button>
          <button class="le-action-btn" data-action="copy" data-url="${logo.url}">
            ${COPY_SVG} 复制链接
          </button>
          <button class="le-action-btn" data-action="open" data-url="${logo.url}">
            打开
          </button>
        </div>
      </div>
    `;
  }

  function renderApiCard(logo) {
    return `
      <div class="le-api-card" data-action="download" data-url="${logo.url}">
        <img src="${logo.url}" alt="${logo.type}" onerror="this.style.display='none'" referrerpolicy="no-referrer" />
        <div class="le-api-label">${logo.type}<br/>${logo.size}</div>
        <span class="le-api-dl">点击下载</span>
      </div>
    `;
  }

  function init() {
    const { root, fab } = createRoot();
    let panelVisible = true;

    const input = root.querySelector('.le-input');
    const btn = root.querySelector('.le-btn');
    const status = root.querySelector('.le-status');
    const results = root.querySelector('.le-results');
    const closeBtn = root.querySelector('.le-close-btn');
    const badge = fab.querySelector('.le-badge');

    fab.addEventListener('click', () => {
      panelVisible = !panelVisible;
      root.classList.toggle('le-collapsed', !panelVisible);
    });

    closeBtn.addEventListener('click', () => {
      panelVisible = false;
      root.classList.add('le-collapsed');
    });

    async function handleExtract() {
      const url = normalizeUrl(input.value);
      if (!url) {
        status.style.display = 'flex';
        status.innerHTML = '⚠️ 请输入有效的网址';
        return;
      }

      btn.disabled = true;
      btn.innerHTML = '<span class="le-spinner"></span> 提取中…';
      status.style.display = 'flex';
      status.innerHTML = '<span class="le-spinner"></span> 正在分析网站并提取 Logo…';
      results.innerHTML = '';

      try {
        const { logos, apiLogos, domain } = await extractLogos(url);

        if (logos.length === 0 && apiLogos.length === 0) {
          status.innerHTML = '❌ 未找到任何 Logo';
          results.innerHTML = '<div class="le-empty">未能提取到 Logo，请检查网址是否正确</div>';
          return;
        }

        status.innerHTML = `✅ 共找到 <strong>${logos.length + apiLogos.length}</strong> 个 Logo 资源`;

        let html = '';
        if (logos.length > 0) {
          html += '<div class="le-section-title">页面提取结果</div>';
          html += logos.map((l, i) => renderLogoCard(l, i)).join('');
        }

        if (apiLogos.length > 0) {
          html += '<div class="le-divider"></div>';
          html += '<div class="le-section-title">第三方 API</div>';
          html += '<div class="le-api-logos">' + apiLogos.map(l => renderApiCard(l)).join('') + '</div>';
        }

        results.innerHTML = html;
        badge.textContent = logos.length + apiLogos.length;

        // Bind actions
        results.querySelectorAll('[data-action]').forEach(el => {
          el.addEventListener('click', () => {
            const action = el.dataset.action;
            const url = el.dataset.url;
            if (action === 'download') {
              const ext = url.includes('.svg') ? 'svg' : url.includes('.png') ? 'png' : url.includes('.ico') ? 'ico' : 'png';
              downloadImage(url, `logo_${domain || 'site'}.${ext}`);
            } else if (action === 'copy') {
              navigator.clipboard.writeText(url).then(() => {
                const orig = el.innerHTML;
                el.innerHTML = '✓ 已复制';
                setTimeout(() => { el.innerHTML = orig; }, 1500);
              });
            } else if (action === 'open') {
              window.open(url, '_blank');
            }
          });
        });

      } catch (err) {
        status.innerHTML = '❌ 提取失败: ' + err.message;
        results.innerHTML = '<div class="le-empty">提取过程中发生错误</div>';
      } finally {
        btn.disabled = false;
        btn.innerHTML = SEARCH_SVG + ' 提取';
      }
    }

    btn.addEventListener('click', handleExtract);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !btn.disabled) handleExtract();
    });

    // Draggable header
    const header = root.querySelector('.le-header');
    let isDragging = false, startX, startY, origX, origY;
    header.style.cursor = 'move';
    header.addEventListener('mousedown', (e) => {
      if (e.target.closest('.le-close-btn')) return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = root.getBoundingClientRect();
      origX = rect.left;
      origY = rect.top;
      root.style.transition = 'none';
    });
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      root.style.left = (origX + dx) + 'px';
      root.style.top = (origY + dy) + 'px';
      root.style.right = 'auto';
    });
    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        root.style.transition = '';
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();