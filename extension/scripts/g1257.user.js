(function () {
  if (document.getElementById('__tabbit_img_picker')) return;

  // ========== 收集图片 ==========
  const images = [...document.querySelectorAll('img')].filter(img => {
    const src = img.src || img.dataset.src;
    if (!src || src.startsWith('data:image/svg+xml')) return false;
    if (img.naturalWidth < 50 || img.naturalHeight < 50) return false;
    return true;
  }).map((img, idx) => ({
    src: img.src || img.dataset.src,
    w: img.naturalWidth,
    h: img.naturalHeight,
    alt: img.alt || '',
    idx
  }));

  const selected = new Set();
  const PAGE_SIZE = 30;
  let page = 1;
  let filterText = '';

  // ========== 面板 ==========
  const panel = document.createElement('div');
  panel.id = '__tabbit_img_picker';
  panel.style.cssText = `
    position:fixed;top:0;right:0;width:420px;height:100vh;z-index:99999;
    background:#1a1a2e;color:#eee;font:13px -apple-system,sans-serif;
    box-shadow:-4px 0 24px rgba(0,0,0,.5);display:flex;flex-direction:column;
  `;
  panel.innerHTML = `
    <div style="padding:14px 16px;border-bottom:1px solid #333;flex-shrink:0;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <span style="font-size:15px;font-weight:600;">📷 图片下载器</span>
        <button id="__btn_close" style="width:28px;height:28px;border:1px solid #555;background:transparent;color:#aaa;border-radius:6px;cursor:pointer;font-size:14px;line-height:1;">✕</button>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <input id="__filter" placeholder="按文件名或 alt 筛选..." style="flex:1;padding:6px 10px;border:1px solid #444;border-radius:6px;background:#2a2a3e;color:#eee;font-size:12px;outline:none;">
        <span id="__count" style="font-size:11px;color:#888;white-space:nowrap;">0 张</span>
      </div>
    </div>
    <div id="__img_list" style="flex:1;overflow-y:auto;padding:4px 12px;"></div>
    <div style="padding:10px 12px;border-top:1px solid #333;display:flex;gap:6px;align-items:center;flex-shrink:0;font-size:12px;">
      <button id="__btn_prev" style="padding:5px 10px;border:1px solid #555;background:transparent;color:#ccc;border-radius:6px;cursor:pointer;" disabled>‹</button>
      <span id="__page_info" style="color:#888;min-width:60px;text-align:center;">1/1</span>
      <button id="__btn_next" style="padding:5px 10px;border:1px solid #555;background:transparent;color:#ccc;border-radius:6px;cursor:pointer;">›</button>
      <div style="flex:1;"></div>
      <button id="__btn_sel_all" style="padding:5px 10px;border:1px solid #555;background:transparent;color:#ccc;border-radius:6px;cursor:pointer;">全选本页</button>
      <button id="__btn_sel_none" style="padding:5px 10px;border:1px solid #555;background:transparent;color:#ccc;border-radius:6px;cursor:pointer;">取消全选</button>
      <button id="__btn_download" style="padding:6px 14px;border:none;background:#4f46e5;color:#fff;border-radius:6px;cursor:pointer;font-weight:500;">下载 (0)</button>
    </div>
  `;
  document.body.appendChild(panel);

  const listEl = document.getElementById('__img_list');
  const countEl = document.getElementById('__count');
  const pageInfo = document.getElementById('__page_info');
  const dlBtn = document.getElementById('__btn_download');
  const filterInput = document.getElementById('__filter');

  function filtered() {
    if (!filterText) return images;
    const q = filterText.toLowerCase();
    return images.filter(img => {
      const name = (img.src.split('/').pop() || '').split('?')[0].toLowerCase();
      return name.includes(q) || img.alt.toLowerCase().includes(q);
    });
  }

  function updateCounts() {
    const matches = filtered();
    countEl.textContent = `共 ${matches.length} 张`;
    dlBtn.textContent = `下载 (${selected.size})`;
    const totalPages = Math.ceil(matches.length / PAGE_SIZE) || 1;
    pageInfo.textContent = `${page}/${totalPages}`;
    document.getElementById('__btn_prev').disabled = page <= 1;
    document.getElementById('__btn_next').disabled = page >= totalPages;
  }

  function render() {
    const matches = filtered();
    const start = (page - 1) * PAGE_SIZE;
    const slice = matches.slice(start, start + PAGE_SIZE);

    listEl.innerHTML = '';
    if (slice.length === 0) {
      listEl.innerHTML = '<div style="text-align:center;color:#555;padding:60px 0;">没有匹配的图片</div>';
      updateCounts();
      return;
    }

    slice.forEach(img => {
      const isSel = selected.has(img.idx);
      const name = img.src.split('/').pop().split('?')[0] || 'image';
      const dims = `${img.w}×${img.h}`;

      const row = document.createElement('div');
      row.style.cssText = `
        display:flex;align-items:center;gap:10px;padding:6px 8px;margin:2px 0;
        border-radius:8px;cursor:pointer;transition:background .12s;
        background:${isSel ? 'rgba(79,70,229,0.25)' : 'transparent'};
        border:1px solid ${isSel ? 'rgba(79,70,229,0.5)' : 'transparent'};
      `;
      row.onmouseenter = () => { if (!isSel) row.style.background = 'rgba(255,255,255,0.04)'; };
      row.onmouseleave = () => { if (!isSel) row.style.background = 'transparent'; };
      row.onclick = () => {
        isSel ? selected.delete(img.idx) : selected.add(img.idx);
        render();
      };

      row.innerHTML = `
        <div style="width:48px;height:48px;flex-shrink:0;border-radius:6px;overflow:hidden;background:#2a2a3e;display:flex;align-items:center;justify-content:center;">
          <img src="${img.src.replace(/"/g, '&quot;')}" style="max-width:100%;max-height:100%;object-fit:contain;"
            onerror="this.style.display='none';this.parentElement.textContent='🖼'">
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:12px;color:#ddd;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${name}">${name}</div>
          <div style="font-size:10px;color:#666;margin-top:2px;">${dims}${img.alt ? ' · ' + img.alt.substring(0, 30) : ''}</div>
        </div>
        <div style="width:20px;height:20px;flex-shrink:0;border-radius:4px;border:2px solid ${isSel ? '#4f46e5' : '#555'};background:${isSel ? '#4f46e5' : 'transparent'};display:flex;align-items:center;justify-content:center;font-size:12px;color:#fff;">
          ${isSel ? '✓' : ''}
        </div>
      `;
      listEl.appendChild(row);
    });

    updateCounts();
  }

  updateCounts();
  render();

  // ========== 事件 ==========
  document.getElementById('__btn_close').onclick = () => panel.remove();

  filterInput.oninput = () => {
    filterText = filterInput.value;
    page = 1;
    render();
  };

  document.getElementById('__btn_prev').onclick = () => { if (page > 1) { page--; render(); } };
  document.getElementById('__btn_next').onclick = () => {
    if (page < Math.ceil(filtered().length / PAGE_SIZE)) { page++; render(); }
  };

  document.getElementById('__btn_sel_all').onclick = () => {
    const matches = filtered();
    const start = (page - 1) * PAGE_SIZE;
    matches.slice(start, start + PAGE_SIZE).forEach(img => selected.add(img.idx));
    render();
  };

  document.getElementById('__btn_sel_none').onclick = () => {
    const matches = filtered();
    const start = (page - 1) * PAGE_SIZE;
    matches.slice(start, start + PAGE_SIZE).forEach(img => selected.delete(img.idx));
    render();
  };

  document.getElementById('__btn_download').onclick = async () => {
    if (selected.size === 0) return alert('请先选择要下载的图片');
    dlBtn.textContent = '下载中...';
    dlBtn.disabled = true;
    let count = 0;
    try {
      for (const idx of selected) {
        const img = images[idx];
        const name = img.src.split('/').pop().split('?')[0] || `image_${idx}`;
        const ext = name.includes('.') ? '' : '.jpg';
        try {
          const res = await fetch(img.src);
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = name + ext;
          a.click();
          URL.revokeObjectURL(url);
          count++;
          await new Promise(r => setTimeout(r, 250));
        } catch (e) {
          window.open(img.src, '_blank');
          count++;
        }
      }
      dlBtn.textContent = `完成 ${count} 张`;
      setTimeout(() => { dlBtn.textContent = `下载 (${selected.size})`; dlBtn.disabled = false; }, 2000);
    } catch (e) {
      dlBtn.textContent = '下载失败';
      dlBtn.disabled = false;
    }
  };

  panel.addEventListener('wheel', e => e.stopPropagation(), { passive: false });
})();