/**
 * 网页媒体抓取器 — 在 Chrome 控制台粘贴运行，或保存为书签。
 *
 * 用法：
 *   1. 打开目标网页
 *   2. F12 → Console，粘贴本文件全部内容并回车
 *   3. 右侧浮窗列出所有媒体，点击「下载」或缩略图
 *
 * 也可拖入书签栏（需压缩为一行）：
 *   javascript:(function(){ ... })();
 */
(function mediaScraper() {
  'use strict';

  const PANEL_ID = '__media_scraper_panel__';
  const STYLE_ID = '__media_scraper_style__';

  if (document.getElementById(PANEL_ID)) {
    document.getElementById(PANEL_ID).remove();
    return;
  }

  const IMAGE_EXT = /\.(jpe?g|png|gif|webp|svg|bmp|ico|avif)(\?|$)/i;
  const VIDEO_EXT = /\.(mp4|webm|ogg|mov|m4v|mkv)(\?|$)/i;
  const AUDIO_EXT = /\.(mp3|wav|ogg|m4a|aac|flac)(\?|$)/i;

  function absUrl(raw) {
    if (!raw || typeof raw !== 'string') return null;
    const s = raw.trim().replace(/^['"]|['"]$/g, '');
    if (!s || s.startsWith('data:') || s.startsWith('blob:') || s.startsWith('javascript:')) {
      return s.startsWith('data:') || s.startsWith('blob:') ? s : null;
    }
    try {
      return new URL(s, location.href).href;
    } catch {
      return null;
    }
  }

  function pickFromSrcset(srcset) {
    if (!srcset) return null;
    const parts = srcset.split(',').map((p) => p.trim().split(/\s+/)[0]).filter(Boolean);
    return parts.length ? absUrl(parts[parts.length - 1]) : null;
  }

  function urlsFromCssBackground(value) {
    if (!value || value === 'none') return [];
    const out = [];
    const re = /url\(\s*(['"]?)(.*?)\1\s*\)/gi;
    let m;
    while ((m = re.exec(value))) {
      const u = absUrl(m[2]);
      if (u) out.push(u);
    }
    return out;
  }

  function guessType(url) {
    if (!url) return 'other';
    if (url.startsWith('data:image') || IMAGE_EXT.test(url)) return 'image';
    if (url.startsWith('data:video') || VIDEO_EXT.test(url)) return 'video';
    if (url.startsWith('data:audio') || AUDIO_EXT.test(url)) return 'audio';
    if (/\.(mp4|webm|ogg)/i.test(url)) return 'video';
    return 'other';
  }

  function filenameFromUrl(url, fallback = 'media') {
    try {
      if (url.startsWith('data:')) {
        const mime = url.slice(5, url.indexOf(';')) || 'application/octet-stream';
        const ext = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp', 'video/mp4': 'mp4', 'audio/mpeg': 'mp3' }[mime] || 'bin';
        return `${fallback}.${ext}`;
      }
      const path = new URL(url).pathname;
      const base = decodeURIComponent(path.split('/').pop() || fallback);
      return base.includes('.') ? base : `${base}.bin`;
    } catch {
      return `${fallback}.bin`;
    }
  }

  function collectMedia() {
    const map = new Map();

    function add(url, meta = {}) {
      const u = absUrl(url);
      if (!u) return;
      const type = meta.type || guessType(u);
      const key = u;
      if (!map.has(key)) {
        map.set(key, {
          url: u,
          type,
          source: meta.source || 'unknown',
          label: meta.label || filenameFromUrl(u),
        });
      }
    }

    document.querySelectorAll('img').forEach((el, i) => {
      ['src', 'data-src', 'data-original', 'data-lazy-src', 'data-url'].forEach((attr) => add(el.getAttribute(attr), { type: 'image', source: `img[${attr}]`, label: el.alt || `img-${i + 1}` }));
      add(pickFromSrcset(el.getAttribute('srcset')), { type: 'image', source: 'img[srcset]' });
      add(pickFromSrcset(el.getAttribute('data-srcset')), { type: 'image', source: 'img[data-srcset]' });
    });

    document.querySelectorAll('picture source, video source, audio source').forEach((el) => {
      add(el.getAttribute('src'), { source: el.tagName.toLowerCase() + '[src]' });
      add(pickFromSrcset(el.getAttribute('srcset')), { source: el.tagName.toLowerCase() + '[srcset]' });
    });

    document.querySelectorAll('video, audio').forEach((el, i) => {
      const type = el.tagName.toLowerCase();
      add(el.getAttribute('src'), { type, source: `${type}[src]`, label: `${type}-${i + 1}` });
      if (el.poster) add(el.poster, { type: 'image', source: `${type}[poster]` });
    });

    document.querySelectorAll('a[href]').forEach((el) => {
      const href = el.getAttribute('href');
      const t = guessType(href);
      if (t !== 'other') add(href, { type: t, source: 'a[href]', label: el.textContent.trim().slice(0, 40) || href });
    });

    document.querySelectorAll('link[rel*="icon"], link[as="image"], link[type^="image/"]').forEach((el) => {
      add(el.href, { type: 'image', source: 'link' });
    });

    document.querySelectorAll('meta[property="og:image"], meta[name="twitter:image"], meta[itemprop="image"]').forEach((el) => {
      add(el.content, { type: 'image', source: 'meta' });
    });

    document.querySelectorAll('[style*="background"]').forEach((el) => {
      urlsFromCssBackground(el.style.backgroundImage).forEach((u) => add(u, { type: 'image', source: 'inline-style' }));
    });

    try {
      for (const sheet of document.styleSheets) {
        let rules;
        try {
          rules = sheet.cssRules;
        } catch {
          continue;
        }
        if (!rules) continue;
        for (const rule of rules) {
          if (rule.style && rule.style.backgroundImage) {
            urlsFromCssBackground(rule.style.backgroundImage).forEach((u) =>
              add(u, { type: 'image', source: 'stylesheet' })
            );
          }
        }
      }
    } catch {
      /* cross-origin stylesheets */
    }

    document.querySelectorAll('canvas').forEach((canvas, i) => {
      try {
        const data = canvas.toDataURL('image/png');
        if (data && data.length > 100) {
          add(data, { type: 'image', source: 'canvas', label: `canvas-${i + 1}.png` });
        }
      } catch {
        /* tainted canvas */
      }
    });

    return [...map.values()].sort((a, b) => {
      const order = { image: 0, video: 1, audio: 2, other: 3 };
      return (order[a.type] ?? 9) - (order[b.type] ?? 9);
    });
  }

  async function downloadItem(item) {
    const name = filenameFromUrl(item.url, item.label.replace(/[^\w.-]+/g, '_'));

    const trigger = (href, downloadName) => {
      const a = document.createElement('a');
      a.href = href;
      a.download = downloadName;
      a.rel = 'noopener';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      a.remove();
    };

    if (item.url.startsWith('data:') || item.url.startsWith('blob:')) {
      trigger(item.url, name);
      return;
    }

    try {
      const res = await fetch(item.url, { mode: 'cors', credentials: 'omit' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      trigger(blobUrl, name);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
    } catch {
      window.open(item.url, '_blank', 'noopener,noreferrer');
    }
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${PANEL_ID} {
        position: fixed; top: 16px; right: 16px; z-index: 2147483647;
        width: min(420px, calc(100vw - 32px)); max-height: min(80vh, 720px);
        background: #111827; color: #f3f4f6; border-radius: 12px;
        box-shadow: 0 20px 50px rgba(0,0,0,.45); font: 13px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
        display: flex; flex-direction: column; overflow: hidden;
        border: 1px solid rgba(255,255,255,.08);
      }
      #${PANEL_ID} * { box-sizing: border-box; }
      #${PANEL_ID} .ms-header {
        display: flex; align-items: center; gap: 8px; padding: 12px 14px;
        border-bottom: 1px solid rgba(255,255,255,.08); background: #0f172a;
      }
      #${PANEL_ID} .ms-title { flex: 1; font-weight: 600; font-size: 14px; }
      #${PANEL_ID} .ms-btn {
        border: 0; border-radius: 8px; padding: 6px 10px; cursor: pointer;
        background: #374151; color: #fff; font-size: 12px;
      }
      #${PANEL_ID} .ms-btn:hover { background: #4b5563; }
      #${PANEL_ID} .ms-btn-primary { background: #2563eb; }
      #${PANEL_ID} .ms-btn-primary:hover { background: #1d4ed8; }
      #${PANEL_ID} .ms-toolbar {
        display: flex; gap: 6px; flex-wrap: wrap; padding: 10px 14px;
        border-bottom: 1px solid rgba(255,255,255,.06);
      }
      #${PANEL_ID} .ms-filter.active { background: #2563eb; }
      #${PANEL_ID} .ms-search {
        flex: 1; min-width: 120px; border: 1px solid #374151; border-radius: 8px;
        background: #1f2937; color: #f3f4f6; padding: 6px 10px; outline: none;
      }
      #${PANEL_ID} .ms-list { overflow: auto; padding: 8px; flex: 1; }
      #${PANEL_ID} .ms-item {
        display: grid; grid-template-columns: 72px 1fr auto; gap: 10px; align-items: center;
        padding: 8px; border-radius: 10px; margin-bottom: 6px; background: #1f2937;
      }
      #${PANEL_ID} .ms-item:hover { background: #273449; }
      #${PANEL_ID} .ms-thumb {
        width: 72px; height: 54px; object-fit: cover; border-radius: 6px; background: #0b1220;
        display: flex; align-items: center; justify-content: center; color: #9ca3af; font-size: 11px;
        overflow: hidden;
      }
      #${PANEL_ID} .ms-meta { min-width: 0; }
      #${PANEL_ID} .ms-name {
        font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      #${PANEL_ID} .ms-sub { color: #9ca3af; font-size: 11px; margin-top: 2px; word-break: break-all; }
      #${PANEL_ID} .ms-badge {
        display: inline-block; padding: 1px 6px; border-radius: 999px; font-size: 10px;
        background: #374151; margin-right: 4px;
      }
      #${PANEL_ID} .ms-empty { padding: 24px; text-align: center; color: #9ca3af; }
    `;
    document.head.appendChild(style);
  }

  function renderPanel(items) {
    injectStyles();

    const panel = document.createElement('div');
    panel.id = PANEL_ID;

    let filter = 'all';
    let query = '';

    const counts = items.reduce((acc, it) => {
      acc.all = (acc.all || 0) + 1;
      acc[it.type] = (acc[it.type] || 0) + 1;
      return acc;
    }, {});

    panel.innerHTML = `
      <div class="ms-header">
        <div class="ms-title">媒体抓取 (${items.length})</div>
        <button class="ms-btn ms-btn-primary" data-action="download-all">全部下载</button>
        <button class="ms-btn" data-action="refresh">刷新</button>
        <button class="ms-btn" data-action="close">关闭</button>
      </div>
      <div class="ms-toolbar">
        <button class="ms-btn ms-filter active" data-filter="all">全部 ${counts.all || 0}</button>
        <button class="ms-btn ms-filter" data-filter="image">图片 ${counts.image || 0}</button>
        <button class="ms-btn ms-filter" data-filter="video">视频 ${counts.video || 0}</button>
        <button class="ms-btn ms-filter" data-filter="audio">音频 ${counts.audio || 0}</button>
        <input class="ms-search" placeholder="搜索 URL / 名称..." />
      </div>
      <div class="ms-list"></div>
    `;

    const listEl = panel.querySelector('.ms-list');
    const searchEl = panel.querySelector('.ms-search');

    function filtered() {
      return items.filter((it) => {
        if (filter !== 'all' && it.type !== filter) return false;
        if (!query) return true;
        const q = query.toLowerCase();
        return it.url.toLowerCase().includes(q) || (it.label || '').toLowerCase().includes(q) || (it.source || '').toLowerCase().includes(q);
      });
    }

    function renderList() {
      const rows = filtered();
      if (!rows.length) {
        listEl.innerHTML = '<div class="ms-empty">没有匹配的媒体</div>';
        return;
      }

      listEl.innerHTML = rows
        .map((it, idx) => {
          const thumb =
            it.type === 'image'
              ? `<img class="ms-thumb" src="${it.url.replace(/"/g, '&quot;')}" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'ms-thumb',textContent:'加载失败'}))" />`
              : `<div class="ms-thumb">${it.type === 'video' ? '▶ 视频' : it.type === 'audio' ? '♪ 音频' : '文件'}</div>`;
          return `
            <div class="ms-item" data-index="${idx}">
              ${thumb}
              <div class="ms-meta">
                <div class="ms-name" title="${(it.label || '').replace(/"/g, '&quot;')}">${it.label || '未命名'}</div>
                <div class="ms-sub"><span class="ms-badge">${it.type}</span><span class="ms-badge">${it.source}</span></div>
                <div class="ms-sub">${it.url.slice(0, 120)}${it.url.length > 120 ? '…' : ''}</div>
              </div>
              <button class="ms-btn ms-btn-primary" data-action="download">下载</button>
            </div>`;
        })
        .join('');

      listEl.querySelectorAll('[data-action="download"]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const row = e.target.closest('.ms-item');
          const item = rows[Number(row.dataset.index)];
          downloadItem(item);
        });
      });

      listEl.querySelectorAll('img.ms-thumb').forEach((img) => {
        img.addEventListener('click', () => {
          const row = img.closest('.ms-item');
          const item = rows[Number(row.dataset.index)];
          downloadItem(item);
        });
        img.style.cursor = 'pointer';
        img.title = '点击下载';
      });
    }

    panel.querySelector('[data-action="close"]').addEventListener('click', () => panel.remove());
    panel.querySelector('[data-action="refresh"]').addEventListener('click', () => {
      panel.remove();
      mediaScraper();
    });
    panel.querySelector('[data-action="download-all"]').addEventListener('click', async () => {
      for (const it of filtered()) {
        await downloadItem(it);
        await new Promise((r) => setTimeout(r, 300));
      }
    });

    panel.querySelectorAll('.ms-filter').forEach((btn) => {
      btn.addEventListener('click', () => {
        filter = btn.dataset.filter;
        panel.querySelectorAll('.ms-filter').forEach((b) => b.classList.toggle('active', b === btn));
        renderList();
      });
    });

    searchEl.addEventListener('input', () => {
      query = searchEl.value.trim();
      renderList();
    });

    document.body.appendChild(panel);
    renderList();
  }

  const items = collectMedia();
  if (!items.length) {
    alert('未在当前页面发现媒体资源');
    return;
  }
  renderPanel(items);
  console.log('[MediaScraper] 发现', items.length, '个媒体:', items);
})();