(async function () {
  const OLD_ID = '__pinterest_downloader_panel__';
  document.getElementById(OLD_ID)?.remove();

  const IMAGE_SELECTOR = 'a[href*="/pin/"] img[src*="pinimg.com"]';
  const MIN_WIDTH = 120;
  const MAX_IMAGES = 50;
  const DELAY = 300;

  function normalizeImageUrl(url) {
    if (!url) return null;
    return url.replace(/\/(75x75_RS|140x140_RS|170x|236x|474x|564x|736x)\//, '/originals/');
  }

  function isVisible(el) {
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return rect.width > 0 &&
      rect.height > 0 &&
      style.display !== 'none' &&
      style.visibility !== 'hidden';
  }

  function sanitizeFilename(name) {
    return (name || 'pinterest_image')
      .replace(/[\\/:*?"<>|]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 60);
  }

  function getExt(url, contentType) {
    if (contentType) {
      if (contentType.includes('png')) return 'png';
      if (contentType.includes('webp')) return 'webp';
      if (contentType.includes('gif')) return 'gif';
      if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg';
    }
    try {
      const pathname = new URL(url).pathname;
      const m = pathname.match(/\.([a-zA-Z0-9]+)$/);
      return m ? m[1].toLowerCase() : 'jpg';
    } catch {
      return 'jpg';
    }
  }

  function buildFilename(item, index, ext = 'jpg') {
    const base = sanitizeFilename(item.alt || `image_${index}`);
    return `pinterest_${String(index).padStart(3, '0')}_${base}.${ext}`;
  }

  function saveBlob(blob, filename) {
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);
  }

  function exportTextFile(text, filename) {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    saveBlob(blob, filename);
  }

  function createPanel() {
    const panel = document.createElement('div');
    panel.id = OLD_ID;
    panel.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 420px;
      max-height: 80vh;
      overflow: auto;
      z-index: 999999;
      background: #fff;
      color: #111;
      border: 1px solid #ddd;
      border-radius: 12px;
      box-shadow: 0 12px 40px rgba(0,0,0,.2);
      padding: 14px;
      font: 14px/1.45 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;
    `;
    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <strong>Pinterest 批量下载</strong>
        <button id="__pd_close__" style="border:none;background:#eee;border-radius:8px;padding:6px 10px;cursor:pointer;">关闭</button>
      </div>
      <div id="__pd_status__" style="margin-bottom:10px;">正在收集图片...</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
        <button id="__pd_start__" style="border:none;background:#e60023;color:#fff;border-radius:8px;padding:8px 10px;cursor:pointer;">开始下载</button>
        <button id="__pd_export__" style="border:none;background:#111;color:#fff;border-radius:8px;padding:8px 10px;cursor:pointer;">导出全部链接</button>
      </div>
      <div id="__pd_list__"></div>
    `;
    document.body.appendChild(panel);
    panel.querySelector('#__pd_close__').onclick = () => panel.remove();
    return panel;
  }

  const seen = new Set();
  const images = [...document.querySelectorAll(IMAGE_SELECTOR)]
    .filter(img => isVisible(img))
    .map((img, i) => ({
      alt: (img.alt || '').trim(),
      url: normalizeImageUrl(img.currentSrc || img.src || ''),
      width: img.naturalWidth || img.width || 0,
      index: i + 1
    }))
    .filter(x => x.url && x.width >= MIN_WIDTH && !seen.has(x.url) && seen.add(x.url))
    .slice(0, MAX_IMAGES);

  const panel = createPanel();
  const statusEl = panel.querySelector('#__pd_status__');
  const listEl = panel.querySelector('#__pd_list__');

  if (!images.length) {
    statusEl.textContent = '没有找到可下载图片，请先滚动页面加载更多内容。';
    return;
  }

  statusEl.textContent = `已找到 ${images.length} 张当前页面可见图片。`;
  listEl.innerHTML = images.map((item, i) => `
    <div style="padding:8px 0;border-top:1px solid #eee;">
      <div style="font-weight:600;">#${i + 1} ${(item.alt || '未命名图片').slice(0, 50)}</div>
      <div style="font-size:12px;word-break:break-all;color:#555;">${item.url}</div>
    </div>
  `).join('');

  panel.querySelector('#__pd_export__').onclick = () => {
    const text = images.map((x, i) => `#${i + 1}\n${x.alt || '未命名图片'}\n${x.url}\n`).join('\n');
    exportTextFile(text, 'pinterest_links.txt');
  };

  panel.querySelector('#__pd_start__').onclick = async () => {
    const failed = [];
    let success = 0;

    statusEl.textContent = `开始下载，共 ${images.length} 张...`;

    for (let i = 0; i < images.length; i++) {
      const item = images[i];
      statusEl.textContent = `下载中 ${i + 1}/${images.length}: ${(item.alt || '未命名图片').slice(0, 40)}`;

      try {
        const res = await fetch(item.url, {
          mode: 'cors',
          credentials: 'omit'
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const blob = await res.blob();
        const ext = getExt(item.url, res.headers.get('content-type') || '');
        const filename = buildFilename(item, i + 1, ext);

        saveBlob(blob, filename);
        success++;
      } catch (err) {
        failed.push({
          ...item,
          error: String(err)
        });
      }

      await new Promise(r => setTimeout(r, DELAY));
    }

    if (failed.length) {
      const failText = failed.map((x, i) =>
        `#${i + 1}\n标题: ${x.alt || '未命名图片'}\n链接: ${x.url}\n错误: ${x.error}\n`
      ).join('\n');

      exportTextFile(failText, 'pinterest_failed_links.txt');
    }

    statusEl.textContent = `完成：成功 ${success} 张，失败 ${failed.length} 张。${failed.length ? '失败清单已导出。' : ''}`;
    alert(`下载完成。\n成功：${success} 张\n失败：${failed.length} 张`);
  };
})();