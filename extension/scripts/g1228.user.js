(function() {
  if (window.__faviconExtractorInjected) return;
  window.__faviconExtractorInjected = true;

  const FORMAT_OPTIONS = [
    { label: 'PNG', mime: 'image/png', ext: 'png' },
    { label: 'JPEG', mime: 'image/jpeg', ext: 'jpg' },
    { label: 'WebP', mime: 'image/webp', ext: 'webp' },
    { label: 'BMP', mime: 'image/bmp', ext: 'bmp' },
    { label: 'ICO', mime: 'image/x-icon', ext: 'ico' },
    { label: 'SVG', mime: 'image/svg+xml', ext: 'svg' }
  ];

  function resolveUrl(href) {
    try { return new URL(href, location.href).href; } catch { return href; }
  }

  function getDomain() {
    return location.hostname.replace(/^www\./, '');
  }

  async function collectFavicons() {
    const icons = [];
    const seen = new Set();

    function addIcon(url, source, sizes, type) {
      const resolved = resolveUrl(url);
      if (seen.has(resolved)) return;
      seen.add(resolved);
      icons.push({ url: resolved, source, sizes: sizes || 'unknown', type: type || '' });
    }

    // 1. <link rel="icon"> / "shortcut icon" / "apple-touch-icon" / "apple-touch-icon-precomposed"
    const rels = ['icon', 'shortcut icon', 'apple-touch-icon', 'apple-touch-icon-precomposed', 'mask-icon'];
    document.querySelectorAll('link[rel]').forEach(link => {
      const rel = link.getAttribute('rel')?.toLowerCase() || '';
      if (rels.some(r => rel === r || rel.includes(r))) {
        const href = link.getAttribute('href');
        if (href) {
          addIcon(href, `<link rel="${rel}">`, link.getAttribute('sizes') || '', link.getAttribute('type') || '');
        }
      }
    });

    // 2. <meta property="og:image">
    document.querySelectorAll('meta[property="og:image"], meta[name="og:image"]').forEach(meta => {
      const content = meta.getAttribute('content');
      if (content) addIcon(content, '<meta og:image>', 'large', '');
    });

    // 3. Manifest
    const manifestLink = document.querySelector('link[rel="manifest"]');
    if (manifestLink) {
      const manifestUrl = resolveUrl(manifestLink.getAttribute('href'));
      try {
        const resp = await fetch(manifestUrl, { credentials: 'omit' });
        const json = await resp.json();
        if (json.icons && Array.isArray(json.icons)) {
          json.icons.forEach(icon => {
            if (icon.src) {
              addIcon(icon.src, 'manifest', icon.sizes || '', icon.type || '');
            }
          });
        }
      } catch (e) { /* ignore */ }
    }

    // 4. Default /favicon.ico
    addIcon('/favicon.ico', '默认路径 /favicon.ico', '', 'image/x-icon');

    // 5. Google Favicon API as fallback (high-res)
    const domain = getDomain();
    addIcon(`https://www.google.com/s2/favicons?domain=${domain}&sz=128`, 'Google Favicon API', '128', 'image/png');

    return icons;
  }

  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => {
        // Retry without crossOrigin for CORS-blocked images
        const img2 = new Image();
        img2.onload = () => resolve(img2);
        img2.onerror = () => reject(new Error('无法加载图片'));
        img2.src = url;
      };
      img.src = url;
    });
  }

  async function convertImage(imageUrl, format) {
    if (format.ext === 'svg') {
      // Try to fetch as SVG text
      try {
        const resp = await fetch(imageUrl);
        const text = await resp.text();
        if (text.trim().startsWith('<')) return { blob: new Blob([text], { type: 'image/svg+xml' }), ext: 'svg' };
      } catch {}
      // Fallback: wrap in SVG with embedded image
      const img = await loadImage(imageUrl);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || 64;
      canvas.height = img.naturalHeight || 64;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const dataUrl = canvas.toDataURL('image/png');
      const svgWrap = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}"><image href="${dataUrl}" width="${canvas.width}" height="${canvas.height}"/></svg>`;
      return { blob: new Blob([svgWrap], { type: 'image/svg+xml' }), ext: 'svg' };
    }

    const img = await loadImage(imageUrl);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || 64;
    canvas.height = img.naturalHeight || 64;
    const ctx = canvas.getContext('2d');

    // JPEG/BMP need white background (no alpha)
    if (format.ext === 'jpg' || format.ext === 'bmp') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.drawImage(img, 0, 0);

    if (format.ext === 'ico') {
      // Build ICO file from PNG data
      const pngBlob = await new Promise(r => canvas.toBlob(r, 'image/png'));
      const pngArray = new Uint8Array(await pngBlob.arrayBuffer());
      const ico = buildIco(pngArray, canvas.width, canvas.height);
      return { blob: new Blob([ico], { type: 'image/x-icon' }), ext: 'ico' };
    }

    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (blob) resolve({ blob, ext: format.ext });
        else reject(new Error('格式转换失败'));
      }, format.mime, 0.95);
    });
  }

  function buildIco(pngData, width, height) {
    // ICO format: header + directory entry + image data
    const headerSize = 6;
    const entrySize = 16;
    const dataSize = pngData.length;
    const totalSize = headerSize + entrySize + dataSize;
    const buf = new ArrayBuffer(totalSize);
    const view = new DataView(buf);

    // ICO Header
    view.setUint16(0, 0, true);       // Reserved
    view.setUint16(2, 1, true);       // Type: 1 = ICO
    view.setUint16(4, 1, true);       // Number of images

    // Directory entry
    view.setUint8(6, width >= 256 ? 0 : width);    // Width (0 = 256)
    view.setUint8(7, height >= 256 ? 0 : height);   // Height (0 = 256)
    view.setUint8(8, 0);              // Color palette
    view.setUint8(9, 0);              // Reserved
    view.setUint16(10, 1, true);      // Color planes
    view.setUint16(12, 32, true);     // Bits per pixel
    view.setUint32(14, dataSize, true);  // Size of image data
    view.setUint32(18, headerSize + entrySize, true); // Offset

    // Image data (raw PNG)
    new Uint8Array(buf).set(pngData, headerSize + entrySize);

    return buf;
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 200);
  }

  // ─── UI ────────────────────────────────────────────

  function createStyles() {
    const style = document.createElement('style');
    style.textContent = `
      #fe-trigger {
        position: fixed; bottom: 24px; right: 24px; z-index: 99999;
        width: 50px; height: 50px; border-radius: 50%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: #fff; border: none; cursor: pointer;
        box-shadow: 0 4px 16px rgba(102,126,234,0.45);
        display: flex; align-items: center; justify-content: center;
        transition: all 0.25s ease;
      }
      #fe-trigger:hover { transform: translateY(-2px) scale(1.05); box-shadow: 0 6px 24px rgba(102,126,234,0.55); }

      #fe-panel {
        position: fixed; bottom: 84px; right: 24px; z-index: 99999;
        width: 380px; max-height: 520px; overflow-y: auto;
        background: #fff; border-radius: 16px;
        box-shadow: 0 12px 48px rgba(0,0,0,0.18);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        display: none; flex-direction: column;
      }
      #fe-panel.open { display: flex; }
      #fe-panel * { box-sizing: border-box; }

      .fe-header {
        padding: 16px 20px 12px; border-bottom: 1px solid #f0f0f0;
        font-size: 15px; font-weight: 600; color: #1a1a2e;
        display: flex; align-items: center; justify-content: space-between;
      }
      .fe-close { cursor: pointer; font-size: 20px; color: #999; background: none; border: none; padding: 0 4px; }
      .fe-close:hover { color: #333; }

      .fe-icon-item {
        display: flex; align-items: center; gap: 12px;
        padding: 12px 20px; border-bottom: 1px solid #f7f7f7;
        transition: background 0.15s;
      }
      .fe-icon-item:hover { background: #f8f7ff; }

      .fe-icon-img {
        width: 40px; height: 40px; object-fit: contain; border-radius: 6px;
        background: #f5f5f5; padding: 4px; flex-shrink: 0;
        border: 1px solid #eee;
      }

      .fe-icon-info { flex: 1; min-width: 0; }
      .fe-icon-source { font-size: 12px; color: #888; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .fe-icon-size { font-size: 11px; color: #aaa; margin-top: 2px; }

      .fe-dl-btns { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
      .fe-dl-btn {
        padding: 3px 8px; font-size: 11px; border-radius: 4px; cursor: pointer;
        border: 1px solid #ddd; background: #fff; color: #555;
        transition: all 0.15s;
      }
      .fe-dl-btn:hover { background: #667eea; color: #fff; border-color: #667eea; }
      .fe-dl-btn.loading { opacity: 0.5; pointer-events: none; }

      .fe-loading { padding: 40px; text-align: center; color: #888; font-size: 14px; }
      .fe-empty { padding: 30px; text-align: center; color: #aaa; font-size: 13px; }

      .fe-footer { padding: 10px 20px; font-size: 11px; color: #bbb; text-align: center; border-top: 1px solid #f0f0f0; }

      #fe-panel::-webkit-scrollbar { width: 5px; }
      #fe-panel::-webkit-scrollbar-thumb { background: #ddd; border-radius: 3px; }
    `;
    document.head.appendChild(style);
  }

  function createUI() {
    // Trigger button
    const trigger = document.createElement('button');
    trigger.id = 'fe-trigger';
    trigger.title = '提取网页图标';
    trigger.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>`;
    document.body.appendChild(trigger);

    // Panel
    const panel = document.createElement('div');
    panel.id = 'fe-panel';
    panel.innerHTML = `
      <div class="fe-header">
        <span>🖼️ 网页图标提取</span>
        <button class="fe-close">×</button>
      </div>
      <div class="fe-loading">🔍 正在搜索图标...</div>
      <div class="fe-footer">${getDomain()}</div>
    `;
    document.body.appendChild(panel);

    trigger.addEventListener('click', () => {
      const isOpen = panel.classList.toggle('open');
      if (isOpen) loadIcons(panel);
    });

    panel.querySelector('.fe-close').addEventListener('click', () => {
      panel.classList.remove('open');
    });
  }

  async function loadIcons(panel) {
    const container = panel.querySelector('.fe-loading') || panel.querySelector('.fe-empty');
    if (!container) return;
    container.className = 'fe-loading';
    container.textContent = '🔍 正在搜索图标...';

    let icons;
    try {
      icons = await collectFavicons();
    } catch (e) {
      container.className = 'fe-empty';
      container.textContent = '❌ 搜索图标失败';
      return;
    }

    // Remove loading/empty, build icon list
    container.remove();

    const header = panel.querySelector('.fe-header');
    const footer = panel.querySelector('.fe-footer');

    if (icons.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'fe-empty';
      empty.textContent = '未找到任何图标';
      panel.insertBefore(empty, footer);
      return;
    }

    for (const icon of icons) {
      const item = document.createElement('div');
      item.className = 'fe-icon-item';

      const imgHtml = `<img class="fe-icon-img" src="${escapeHtml(icon.url)}" alt="icon" onerror="this.style.opacity='0.3'">`;
      const sourceText = icon.source.length > 40 ? icon.source.slice(0, 38) + '…' : icon.source;

      let btnsHtml = '';
      for (const fmt of FORMAT_OPTIONS) {
        btnsHtml += `<button class="fe-dl-btn" data-url="${escapeHtml(icon.url)}" data-ext="${fmt.ext}" data-mime="${fmt.mime}">${fmt.label}</button>`;
      }

      item.innerHTML = `
        ${imgHtml}
        <div class="fe-icon-info">
          <div class="fe-icon-source" title="${escapeHtml(icon.source)}">${escapeHtml(sourceText)}</div>
          <div class="fe-icon-size">${escapeHtml(icon.sizes)}${icon.type ? ' · ' + escapeHtml(icon.type) : ''}</div>
          <div class="fe-dl-btns">${btnsHtml}</div>
        </div>
      `;

      panel.insertBefore(item, footer);
    }

    // Bind download buttons
    panel.querySelectorAll('.fe-dl-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const url = btn.dataset.url;
        const ext = btn.dataset.ext;
        const fmt = FORMAT_OPTIONS.find(f => f.ext === ext);

        btn.classList.add('loading');
        btn.textContent = '...';

        try {
          const result = await convertImage(url, fmt);
          const domain = getDomain();
          const filename = `favicon_${domain}.${result.ext}`;
          downloadBlob(result.blob, filename);

          btn.textContent = '✓';
          setTimeout(() => { btn.textContent = fmt.label; }, 1500);
        } catch (e) {
          btn.textContent = '✗';
          console.warn('[FaviconExtractor] Convert failed:', e);
          setTimeout(() => { btn.textContent = fmt.label; }, 1500);
        } finally {
          btn.classList.remove('loading');
        }
      });
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function init() {
    createStyles();
    createUI();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();