(function () {
  const APP_ID = '__Yuze_image_batch_downloader__';
  const STYLE_ID = '__Yuze_image_batch_downloader_style__';
  const GLOBAL_KEY = '__Yuze_IMAGE_BATCH_DOWNLOADER__';

  const oldApp = document.getElementById(APP_ID);
  if (oldApp) oldApp.remove();

  const oldStyle = document.getElementById(STYLE_ID);
  if (oldStyle) oldStyle.remove();

  if (window[GLOBAL_KEY] && typeof window[GLOBAL_KEY].destroy === 'function') {
    try {
      window[GLOBAL_KEY].destroy();
    } catch (e) {}
  }

  function executeAutomation() {
    const state = {
      images: [],
      downloading: false,
      destroyed: false,
      observer: null,
      scanTimer: null
    };

    const config = {
      minWidth: 160,
      minHeight: 140,
      minArea: 28000,
      maxImages: 500,
      downloadDelay: 800
    };

    function sanitizeFileName(name) {
      return (name || 'page')
        .replace(/[\\/:*?"<>|]+/g, '_')
        .replace(/\s+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 80) || 'page';
    }

    function pad(num, len) {
      return String(num).padStart(len, '0');
    }

    function sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    function absoluteUrl(url) {
      if (!url || typeof url !== 'string') return '';
      const cleaned = url.trim().replace(/^url$(['"]?)(.*?)\1$$/i, '$2');
      if (!cleaned || cleaned.startsWith('data:')) return '';
      if (cleaned.startsWith('blob:')) return cleaned;
      try {
        return new URL(cleaned, location.href).href;
      } catch (e) {
        return '';
      }
    }

    function parseSrcset(srcset) {
      if (!srcset || typeof srcset !== 'string') return '';
      const candidates = srcset
        .split(',')
        .map(item => item.trim())
        .map(item => {
          const parts = item.split(/\s+/);
          return {
            url: absoluteUrl(parts[0] || ''),
            width: parseInt((parts[1] || '').replace(/[^\d]/g, ''), 10) || 0
          };
        })
        .filter(item => item.url);

      if (!candidates.length) return '';
      candidates.sort((a, b) => b.width - a.width);
      return candidates[0].url;
    }

    function getComputedBackgroundImageUrl(el) {
      if (!el) return '';
      const style = window.getComputedStyle(el);
      const bg = style.getPropertyValue('background-image');
      if (!bg || bg === 'none') return '';
      const match = bg.match(/url$(['"]?)(.*?)\1$/i);
      return match ? absoluteUrl(match[2]) : '';
    }

    function getLazyImageUrl(el) {
      if (!el || !el.getAttributeNames) return '';
      const attrs = el.getAttributeNames();

      const priorityKeys = [
        'src',
        'data-src',
        'data-original',
        'data-origin',
        'data-image',
        'data-url',
        'data-lazy-src',
        'data-lazyload',
        'data-actualsrc',
        'data-defer-src',
        'data-srcset',
        'data-background',
        'data-bg',
        'data-pin-media',
        'data-hires',
        'data-big',
        'data-media',
        'data-full',
        'data-large'
      ];

      if (el.currentSrc) {
        const current = absoluteUrl(el.currentSrc);
        if (current) return current;
      }

      for (const key of priorityKeys) {
        const value = el.getAttribute && el.getAttribute(key);
        if (!value) continue;
        if (/srcset/i.test(key)) {
          const parsed = parseSrcset(value);
          if (parsed) return parsed;
        }
        const url = absoluteUrl(value);
        if (url) return url;
      }

      for (const attr of attrs) {
        const value = el.getAttribute(attr);
        if (!value) continue;

        if (/srcset/i.test(attr)) {
          const parsed = parseSrcset(value);
          if (parsed) return parsed;
        }

        if (/src|image|img|photo|media|lazy|origin|large|full|background|cover/i.test(attr)) {
          const url = absoluteUrl(value);
          if (url) return url;
        }
      }

      return '';
    }

    function getCandidateUrl(el) {
      if (!el) return '';

      if (el.tagName === 'IMG') {
        return (
          parseSrcset(el.getAttribute('srcset') || el.getAttribute('data-srcset') || '') ||
          absoluteUrl(el.currentSrc || el.src || '') ||
          getLazyImageUrl(el) ||
          ''
        );
      }

      return getLazyImageUrl(el) || getComputedBackgroundImageUrl(el) || '';
    }

    function isVisible(el) {
      if (!el || !document.documentElement.contains(el)) return false;
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity || '1') === 0) return false;
      const rect = el.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return false;
      return true;
    }

    function getElementSize(el) {
      const rect = el.getBoundingClientRect();
      const width = Math.round(rect.width || el.naturalWidth || el.clientWidth || 0);
      const height = Math.round(rect.height || el.naturalHeight || el.clientHeight || 0);
      return { width, height, area: width * height, rect };
    }

    function getHintText(el) {
      return [
        el.getAttribute && el.getAttribute('alt'),
        el.getAttribute && el.getAttribute('title'),
        el.getAttribute && el.getAttribute('aria-label'),
        typeof el.className === 'string' ? el.className : '',
        el.id || '',
        el.getAttribute && el.getAttribute('role')
      ].filter(Boolean).join(' ').toLowerCase();
    }

    function hasBadSemanticHint(el) {
      const strongBadWords = [
        'logo', 'icon', 'emoji', 'badge', 'sprite', 'loading',
        'placeholder', 'qr', 'advert', 'ads', 'banner'
      ];

      let cur = el;
      let depth = 0;
      while (cur && depth < 5) {
        const hint = getHintText(cur);
        if (strongBadWords.some(word => hint.includes(word))) return true;
        cur = cur.parentElement;
        depth++;
      }
      return false;
    }

    function isVeryWideOrVeryThin(width, height) {
      const ratio = width / Math.max(height, 1);
      return ratio > 6 || ratio < 0.12;
    }

    function inLikelyMainContent(el) {
      const selectors = [
        'main',
        '[role="main"]',
        'article',
        '.main',
        '.content',
        '.container',
        '.grid',
        '.gallery',
        '.results',
        '.search-results',
        '.photos',
        '.images',
        '.list',
        '[class*="grid"]',
        '[class*="gallery"]',
        '[class*="result"]',
        '[class*="search"]',
        '[class*="photo"]',
        '[class*="image"]',
        '[class*="content"]'
      ];
      return !!el.closest(selectors.join(','));
    }

    function inLikelyCard(el) {
      const selectors = [
        'a',
        'figure',
        'article',
        'li',
        '.card',
        '.item',
        '.cell',
        '.tile',
        '.photo',
        '.image',
        '.result',
        '.gallery-item',
        '[class*="card"]',
        '[class*="item"]',
        '[class*="tile"]',
        '[class*="photo"]',
        '[class*="image"]',
        '[class*="result"]',
        '[data-id]',
        '[data-index]'
      ];
      return !!el.closest(selectors.join(','));
    }

    function isLikelyAvatarOrDecorative(el) {
      const { width, height } = getElementSize(el);
      const hint = getHintText(el);

      if (width <= 96 || height <= 96) return true;
      if (width <= 140 && height <= 140 && /avatar|user|profile|head|face/i.test(hint)) return true;

      const parentLink = el.closest('a');
      if (parentLink) {
        const linkText = (
          parentLink.getAttribute('href') ||
          parentLink.getAttribute('title') ||
          parentLink.className ||
          ''
        ).toLowerCase();

        if (/login|signup|profile|member|account|setting|message|author/i.test(linkText)) return true;
      }

      return false;
    }

    function getBestTargetContainer() {
      const selectors = [
        'main',
        '[role="main"]',
        '.content',
        '.grid',
        '.gallery',
        '.results',
        '.search-results',
        '.photos',
        '.images',
        '[class*="grid"]',
        '[class*="gallery"]',
        '[class*="result"]',
        '[class*="photo"]',
        '[class*="image"]'
      ];

      let best = null;
      let bestScore = -Infinity;

      for (const selector of selectors) {
        const nodes = document.querySelectorAll(selector);
        nodes.forEach(node => {
          const rect = node.getBoundingClientRect();
          const visibleArea = Math.max(0, rect.width) * Math.max(0, rect.height);
          const imgCount = node.querySelectorAll('img').length;
          const score = visibleArea + imgCount * 24000;
          if (score > bestScore) {
            best = node;
            bestScore = score;
          }
        });
      }

      return best || document.body;
    }

    function normalizeUrl(url) {
      try {
        const u = new URL(url, location.href);
        u.hash = '';
        return u.href;
      } catch (e) {
        return url;
      }
    }

    function getPageScopedElements() {
      const container = getBestTargetContainer();
      const nodes = new Set();

      container.querySelectorAll('img').forEach(el => nodes.add(el));
      container.querySelectorAll('[style*="background-image"]').forEach(el => nodes.add(el));
      container.querySelectorAll([
        '[data-src]',
        '[data-original]',
        '[data-image]',
        '[data-lazy-src]',
        '[data-bg]',
        '[data-background]',
        '[data-srcset]',
        '[data-media]',
        '[data-full]',
        '[data-large]'
      ].join(',')).forEach(el => nodes.add(el));

      return Array.from(nodes);
    }

    function scoreCandidate(el, url) {
      const { width, height, area, rect } = getElementSize(el);
      if (!url) return -Infinity;
      if (width < config.minWidth || height < config.minHeight || area < config.minArea) return -Infinity;
      if (hasBadSemanticHint(el)) return -Infinity;
      if (isLikelyAvatarOrDecorative(el)) return -Infinity;
      if (isVeryWideOrVeryThin(width, height)) return -15;

      let score = 0;
      score += Math.min(area / 10000, 60);
      score += Math.min(width / 120, 12);
      score += Math.min(height / 120, 12);

      if (inLikelyMainContent(el)) score += 22;
      if (inLikelyCard(el)) score += 20;

      if (rect.top > -300 && rect.top < window.innerHeight * 6) score += 8;
      if (rect.left >= -80 && rect.left < window.innerWidth + 80) score += 5;

      const hint = getHintText(el);
      if (/photo|image|picture|pic|media|gallery|result|preview|item|card|cell|tile/i.test(hint)) score += 10;

      const parentLink = el.closest('a');
      if (parentLink) {
        const href = (parentLink.getAttribute('href') || '').toLowerCase();
        if (/photo|image|images|picture|pic|gallery|media|result|detail/i.test(href)) score += 12;
      }

      if (el.tagName === 'IMG') score += 4;
      return score;
    }

    function scanImages() {
      const elements = getPageScopedElements();
      const map = new Map();

      for (const el of elements) {
        if (!isVisible(el)) continue;

        const url = getCandidateUrl(el);
        if (!url) continue;

        const normalized = normalizeUrl(url);
        const score = scoreCandidate(el, normalized);
        if (score === -Infinity || score < 0) continue;

        const { width, height, rect } = getElementSize(el);
        const item = {
          url: normalized,
          width,
          height,
          score,
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          area: width * height
        };

        const existed = map.get(normalized);
        if (!existed || item.score > existed.score || item.area > existed.area) {
          map.set(normalized, item);
        }
      }

      const items = Array.from(map.values())
        .sort((a, b) => {
          if (Math.abs(a.top - b.top) > 30) return a.top - b.top;
          if (Math.abs(a.left - b.left) > 30) return a.left - b.left;
          if (b.score !== a.score) return b.score - a.score;
          return b.area - a.area;
        })
        .slice(0, config.maxImages);

      state.images = items;
      updatePanel();
      return items;
    }

    function guessExtension(url, blob) {
      let ext = '';
      try {
        const pathname = new URL(url, location.href).pathname;
        const match = pathname.match(/\.([a-zA-Z0-9]{2,5})(?:$|\?)/);
        if (match) ext = match[1].toLowerCase();
      } catch (e) {}

      if (!ext && blob && blob.type) {
        const mimeMap = {
          'image/jpeg': 'jpg',
          'image/jpg': 'jpg',
          'image/png': 'png',
          'image/webp': 'webp',
          'image/gif': 'gif',
          'image/bmp': 'bmp',
          'image/svg+xml': 'svg',
          'image/avif': 'avif'
        };
        ext = mimeMap[blob.type.toLowerCase()] || '';
      }

      if (ext === 'jpeg') ext = 'jpg';
      if (!/^(jpg|jpeg|png|webp|gif|bmp|svg|avif)$/i.test(ext)) ext = 'jpg';
      return ext;
    }

    async function downloadImageWithBlob(url, filenameBase) {
      let blobUrl = '';
      try {
        const response = await fetch(url, {
          method: 'GET',
          mode: 'cors',
          credentials: 'omit',
          cache: 'force-cache'
        });

        if (!response.ok) {
          throw new Error('HTTP_ERROR');
        }

        const blob = await response.blob();
        if (!blob || !blob.size) {
          throw new Error('EMPTY_BLOB');
        }

        const ext = guessExtension(url, blob);
        const filename = `${filenameBase}.${ext}`;

        blobUrl = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        a.rel = 'noopener noreferrer';
        a.style.display = 'none';

        document.body.appendChild(a);
        a.click();
        a.remove();

        await sleep(120);

        try {
          URL.revokeObjectURL(blobUrl);
        } catch (e) {}

        return { success: true, error: null };
      } catch (error) {
        if (blobUrl) {
          try {
            URL.revokeObjectURL(blobUrl);
          } catch (e) {}
        }
        return {
          success: false,
          error: error && error.message ? error.message : 'download_failed'
        };
      }
    }

    async function downloadAll() {
      if (state.downloading || !state.images.length) return;

      state.downloading = true;
      updatePanel();

      const baseName = sanitizeFileName(document.title || '图片');
      const total = state.images.length;
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < total; i++) {
        if (state.destroyed) break;

        const item = state.images[i];
        const index = pad(i + 1, 3);
        const filenameBase = `${baseName}_${index}`;

        setStatus(`下载中 ${i + 1}/${total}，成功 ${successCount}，失败 ${failCount}`);

        const result = await downloadImageWithBlob(item.url, filenameBase);
        if (result.success) {
          successCount++;
        } else {
          failCount++;
        }

        setStatus(`下载中 ${Math.min(i + 1, total)}/${total}，成功 ${successCount}，失败 ${failCount}`);
        await sleep(config.downloadDelay);
      }

      state.downloading = false;
      updatePanel();

      if (failCount > 0) {
        setStatus(`下载完成：成功 ${successCount} 张，失败 ${failCount} 张`);
      } else {
        setStatus(`下载完成，共 ${successCount} 张`);
      }
    }

    function injectStyle() {
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = `
        #${APP_ID} {
          position: fixed;
          right: 20px;
          top: 80px;
          z-index: 2147483647;
          font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif;
        }
        #${APP_ID} * {
          box-sizing: border-box;
        }
        #${APP_ID} .tbid-panel {
          width: 280px;
          background: rgba(24, 24, 28, 0.94);
          color: #fff;
          border-radius: 14px;
          box-shadow: 0 12px 36px rgba(0,0,0,.25);
          border: 1px solid rgba(255,255,255,.08);
          overflow: hidden;
          backdrop-filter: blur(8px);
        }
        #${APP_ID} .tbid-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px 10px;
          border-bottom: 1px solid rgba(255,255,255,.08);
          font-size: 14px;
          font-weight: 600;
        }
        #${APP_ID} .tbid-close {
          border: 0;
          background: transparent;
          color: rgba(255,255,255,.72);
          cursor: pointer;
          font-size: 18px;
          line-height: 1;
          padding: 0 2px;
        }
        #${APP_ID} .tbid-body {
          padding: 12px 14px;
        }
        #${APP_ID} .tbid-count {
          font-size: 28px;
          font-weight: 700;
          line-height: 1.1;
          margin-bottom: 6px;
        }
        #${APP_ID} .tbid-sub {
          font-size: 12px;
          color: rgba(255,255,255,.68);
          line-height: 1.5;
        }
        #${APP_ID} .tbid-status {
          margin-top: 10px;
          min-height: 18px;
          font-size: 12px;
          color: #9fd3ff;
        }
        #${APP_ID} .tbid-actions {
          display: flex;
          gap: 8px;
          padding: 0 14px 14px;
        }
        #${APP_ID} .tbid-btn {
          flex: 1;
          appearance: none;
          border: 0;
          border-radius: 10px;
          cursor: pointer;
          padding: 10px 12px;
          font-size: 13px;
          font-weight: 600;
          transition: transform .15s ease, opacity .15s ease, background .15s ease;
        }
        #${APP_ID} .tbid-btn:hover {
          transform: translateY(-1px);
        }
        #${APP_ID} .tbid-btn:disabled {
          opacity: .5;
          cursor: not-allowed;
          transform: none;
        }
        #${APP_ID} .tbid-btn-primary {
          background: #4f8cff;
          color: #fff;
        }
        #${APP_ID} .tbid-btn-secondary {
          background: rgba(255,255,255,.1);
          color: #fff;
        }
      `;
      document.head.appendChild(style);
    }

    let app = null;
    let countEl = null;
    let statusEl = null;
    let rescanBtn = null;
    let downloadBtn = null;

    function setStatus(text) {
      if (statusEl) statusEl.textContent = text || '';
    }

    function updatePanel() {
      if (!app) return;
      if (countEl) countEl.textContent = String(state.images.length);
      if (downloadBtn) {
        downloadBtn.disabled = state.downloading || !state.images.length;
        downloadBtn.textContent = state.downloading ? '下载中...' : '批量下载';
      }
      if (rescanBtn) {
        rescanBtn.disabled = state.downloading;
      }
    }

    function destroy() {
      state.destroyed = true;
      clearTimeout(state.scanTimer);

      if (state.observer) {
        try {
          state.observer.disconnect();
        } catch (e) {}
      }

      if (app) app.remove();

      const style = document.getElementById(STYLE_ID);
      if (style) style.remove();

      if (window[GLOBAL_KEY]) {
        delete window[GLOBAL_KEY];
      }
    }

    function createPanel() {
      app = document.createElement('div');
      app.id = APP_ID;
      app.innerHTML = `
        <div class="tbid-panel">
          <div class="tbid-header">
            <span>图片批量下载</span>
            <button class="tbid-close" title="关闭">×</button>
          </div>
          <div class="tbid-body">
            <div class="tbid-count">0</div>
            <div class="tbid-sub">优先识别页面主图区图片，过滤头像/图标/装饰图</div>
            <div class="tbid-status"></div>
          </div>
          <div class="tbid-actions">
            <button class="tbid-btn tbid-btn-secondary" data-action="rescan">重新识别</button>
            <button class="tbid-btn tbid-btn-primary" data-action="download">批量下载</button>
          </div>
        </div>
      `;

      document.body.appendChild(app);

      countEl = app.querySelector('.tbid-count');
      statusEl = app.querySelector('.tbid-status');
      rescanBtn = app.querySelector('[data-action="rescan"]');
      downloadBtn = app.querySelector('[data-action="download"]');

      const closeBtn = app.querySelector('.tbid-close');
      if (closeBtn) closeBtn.addEventListener('click', destroy);

      if (rescanBtn) {
        rescanBtn.addEventListener('click', function () {
          const count = scanImages().length;
          setStatus(`重新识别完成，共 ${count} 张`);
        });
      }

      if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadAll);
      }

      updatePanel();
    }

    function scheduleRescan(message) {
      clearTimeout(state.scanTimer);
      state.scanTimer = setTimeout(function () {
        if (state.destroyed || state.downloading) return;
        const prevCount = state.images.length;
        const count = scanImages().length;
        if (count !== prevCount && message) {
          setStatus(`${message}，当前 ${count} 张`);
        }
      }, 1200);
    }

    function initObserver() {
      if (!window.MutationObserver || !document.body) return;

      state.observer = new MutationObserver(function (mutations) {
        if (state.destroyed || state.downloading) return;

        let shouldScan = false;
        for (const mutation of mutations) {
          if (mutation.type === 'childList' && (mutation.addedNodes.length || mutation.removedNodes.length)) {
            shouldScan = true;
            break;
          }
          if (mutation.type === 'attributes') {
            shouldScan = true;
            break;
          }
        }

        if (shouldScan) {
          scheduleRescan('页面内容已更新');
        }
      });

      state.observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['src', 'srcset', 'style', 'data-src', 'data-original', 'data-image', 'data-background', 'data-srcset']
      });
    }

    injectStyle();
    createPanel();

    const firstCount = scanImages().length;
    if (firstCount) {
      setStatus(`识别完成，共 ${firstCount} 张`);
    } else {
      setStatus('未识别到合适图片，可先滚动页面后再点“重新识别”');
    }

    initObserver();

    window[GLOBAL_KEY] = {
      destroy,
      rescan: scanImages,
      getImages: function () {
        return state.images.slice();
      }
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', executeAutomation, { once: true });
  } else {
    executeAutomation();
  }
})();