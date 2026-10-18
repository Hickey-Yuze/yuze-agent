(function() {
  const imageSet = new Set();
  const results = [];

  function addImage(url, source, alt) {
    if (!url || url === '' || url === 'none' || imageSet.has(url)) return;
    imageSet.add(url);
    results.push({ url, source, alt: alt || '' });
  }

  // 1. Collect all <img> elements
  document.querySelectorAll('img').forEach(img => {
    if (img.src) addImage(img.src, 'img', img.alt || '');
    if (img.dataset.src) addImage(img.dataset.src, 'img-lazy', img.alt || '');
  });

  // 2. Collect all elements with background-image
  document.querySelectorAll('*').forEach(el => {
    const style = window.getComputedStyle(el);
    const bg = style.backgroundImage;
    if (bg && bg !== 'none') {
      const match = bg.match(/url$["']?(.*?)["']?$/);
      if (match) addImage(match[1], 'background-image', '');
    }
  });

  // 3. Collect picture <source> elements
  document.querySelectorAll('source').forEach(source => {
    if (source.srcset) {
      source.srcset.split(',').forEach(entry => {
        const url = entry.trim().split(' ')[0];
        addImage(url, 'source', '');
      });
    }
  });

  // Output results
  console.log(`=== Found ${results.length} images on Bilibili ===`);
  results.forEach((item, i) => {
    console.log(`[${i + 1}] [${item.source}] ${item.alt ? `(${item.alt}) ` : ''}${item.url}`);
  });

  // Also create a visual summary panel
  const panel = document.createElement('div');
  panel.id = 'bilibili-image-extractor';
  panel.style.cssText = `
    position: fixed; top: 60px; right: 20px; z-index: 999999;
    background: #fff; border-radius: 12px; padding: 16px;
    max-height: 80vh; overflow-y: auto; width: 360px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.2); font-family: sans-serif;
  `;

  const header = document.createElement('div');
  header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;';
  header.innerHTML = `
    <h3 style="margin:0;color:#333;font-size:16px;">📷 图片提取结果 (${results.length})</h3>
    <button id="close-img-panel" style="border:none;background:#f1f1f1;border-radius:50%;width:28px;height:28px;cursor:pointer;font-size:14px;">✕</button>
  `;
  panel.appendChild(header);

  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;';

  results.forEach((item, i) => {
    const card = document.createElement('div');
    card.style.cssText = `
      border: 1px solid #eee; border-radius: 8px; overflow: hidden;
      cursor: pointer; position: relative;
    `;
    card.innerHTML = `
      <img src="${item.url}" style="width:100%;height:80px;object-fit:cover;" 
           onerror="this.style.display='none'" loading="lazy">
      <div style="padding:4px;font-size:10px;color:#666;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
        ${item.alt || `[${item.source}] #${i + 1}`}
      </div>
    `;
    card.addEventListener('click', () => {
      navigator.clipboard.writeText(item.url).then(() => {
        const tip = document.createElement('div');
        tip.textContent = '✅ 已复制链接';
        tip.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;';
        card.appendChild(tip);
        setTimeout(() => tip.remove(), 1000);
      });
    });
    grid.appendChild(card);
  });

  panel.appendChild(grid);
  document.body.appendChild(panel);

  document.getElementById('close-img-panel').addEventListener('click', () => {
    panel.remove();
  });
})();