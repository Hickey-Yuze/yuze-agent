(function () {
  'use strict';

  /********************
   * 0. 配置区
   ********************/
  const SELECTOR_CELL = '.mtd-table-cell span.pointer';
  const PROCESSED_ATTR = 'data-lion-img-processed';
  const MONACO_PROCESSED_ATTR = 'data-lion-monaco-processed';

  // 重要：test 不要用带 g 的正则
  const IMG_TEST_RE = /https?:\/\/\S+\.(?:jpg|jpeg|png|gif)(?:\?\S*)?/i;
  const IMG_MATCH_RE = /https?:\/\/\S+?\.(?:jpg|jpeg|png|gif)(?:\?\S*)?/gi;

  // 表格缩略图最多渲染几个（避免一个 cell 贴很多 url 时爆炸）
  const MAX_IMAGES_PER_CELL = 6;

  // Monaco 处理节流
  const MONACO_DEBOUNCE_MS = 1200;

  // 总体增量处理节流（只针对新增 node 的聚合）
  const BATCH_DEBOUNCE_MS = 120;

  let paused = false;
  let disposed = false;

  /********************
   * 1. 样式注入（沿用你的等比缩放版）
   ********************/
  function injectStyles() {
    if (document.getElementById('lion-image-preview-styles')) return;

    const style = document.createElement('style');
    style.id = 'lion-image-preview-styles';
    style.textContent = `
      .lion-img-thumbnail {
        display: inline-block;
        max-width: 120px;
        max-height: 80px;
        width: auto;
        height: auto;
        object-fit: contain;
        border-radius: 4px;
        border: 1px solid #e0e0e0;
        cursor: pointer;
        transition: all 0.2s;
        vertical-align: middle;
        margin: 4px 8px 4px 0;
        background: #fafafa;
      }
      .lion-img-thumbnail:hover {
        transform: scale(1.05);
        border-color: #1890ff;
        box-shadow: 0 2px 8px rgba(24, 144, 255, 0.3);
      }
      .lion-img-preview-container {
        position: relative;
        display: inline-block;
        vertical-align: middle;
      }
      .lion-img-url-text {
        color: #1890ff;
        font-size: 12px;
        margin-left: 8px;
        vertical-align: middle;
        max-width: 300px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        display: inline-block;
      }

      /* 全局 hover 大图（单例） */
      .lion-hover-preview {
        display: none;
        position: fixed;
        z-index: 10000;
        max-width: 600px;
        max-height: 500px;
        border-radius: 8px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        border: 2px solid #1890ff;
        background: white;
        padding: 4px;
        pointer-events: none;
        object-fit: contain;
      }

      /* Monaco 预览 */
      .lion-monaco-img-preview-wrapper {
        position: relative;
        margin-top: 8px;
        padding: 12px;
        background: #f5f5f5;
        border-radius: 4px;
        border: 1px solid #e0e0e0;
      }
      .lion-monaco-img-preview-title {
        font-size: 12px;
        color: #666;
        margin-bottom: 8px;
        font-weight: 500;
      }
      .lion-monaco-img-preview-container {
        display: flex;
        gap: 16px;
        flex-wrap: wrap;
      }
      .lion-monaco-img-item {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .lion-monaco-img-label {
        font-size: 12px;
        color: #999;
        font-weight: 500;
      }
      .lion-monaco-img {
        max-width: 200px;
        max-height: 150px;
        width: auto;
        height: auto;
        border-radius: 4px;
        border: 1px solid #d9d9d9;
        cursor: pointer;
        transition: all 0.2s;
        object-fit: contain;
        background: white;
        padding: 4px;
      }
      .lion-monaco-img:hover {
        transform: scale(1.05);
        border-color: #1890ff;
        box-shadow: 0 2px 8px rgba(24, 144, 255, 0.3);
      }

      /* 全屏浮层 */
      .lion-fullscreen-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.9);
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: lion-fade-in 0.2s ease-out;
        cursor: zoom-out;
      }
      @keyframes lion-fade-in { from { opacity: 0; } to { opacity: 1; } }
      .lion-fullscreen-image {
        max-width: 95vw;
        max-height: 95vh;
        object-fit: contain;
        border-radius: 4px;
        box-shadow: 0 0 50px rgba(255,255,255,0.2);
        animation: lion-zoom-in 0.3s ease-out;
      }
      @keyframes lion-zoom-in { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      .lion-fullscreen-close {
        position: absolute;
        top: 20px;
        right: 20px;
        width: 40px;
        height: 40px;
        background: rgba(255,255,255,0.2);
        border: 2px solid rgba(255,255,255,0.5);
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        z-index: 100000;
      }
      .lion-fullscreen-close:hover {
        background: rgba(255,255,255,0.3);
        border-color: rgba(255,255,255,0.8);
        transform: rotate(90deg);
      }
      .lion-fullscreen-close::before,
      .lion-fullscreen-close::after {
        content: '';
        position: absolute;
        width: 20px;
        height: 2px;
        background: white;
      }
      .lion-fullscreen-close::before { transform: rotate(45deg); }
      .lion-fullscreen-close::after  { transform: rotate(-45deg); }
      .lion-fullscreen-info {
        position: absolute;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0,0,0,0.7);
        color: white;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 12px;
        max-width: 80vw;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    `;
    document.head.appendChild(style);
  }

  /********************
   * 2. 全局 hover 预览（单例）
   ********************/
  let hoverPreviewEl = null;
  function ensureHoverPreview() {
    if (hoverPreviewEl) return hoverPreviewEl;
    const img = document.createElement('img');
    img.className = 'lion-hover-preview';
    img.alt = '预览';
    img.loading = 'lazy';
    document.body.appendChild(img);
    hoverPreviewEl = img;
    return img;
  }

  function showHoverPreview(url, x, y) {
    const img = ensureHoverPreview();
    if (img.dataset.url !== url) {
      img.dataset.url = url;
      img.src = url;
    }
    // 轻量定位：靠近鼠标但不遮挡
    const offset = 18;
    img.style.left = `${Math.min(x + offset, window.innerWidth - 40)}px`;
    img.style.top = `${Math.min(y + offset, window.innerHeight - 40)}px`;
    img.style.display = 'block';
  }

  function hideHoverPreview() {
    if (!hoverPreviewEl) return;
    hoverPreviewEl.style.display = 'none';
  }

  /********************
   * 3. 全屏预览（沿用）
   ********************/
  function createFullscreenOverlay(imageUrl) {
    const existingOverlay = document.querySelector('.lion-fullscreen-overlay');
    if (existingOverlay) existingOverlay.remove();

    const overlay = document.createElement('div');
    overlay.className = 'lion-fullscreen-overlay';

    const closeBtn = document.createElement('div');
    closeBtn.className = 'lion-fullscreen-close';
    closeBtn.title = '关闭 (ESC)';

    const img = document.createElement('img');
    img.className = 'lion-fullscreen-image';
    img.src = imageUrl;
    img.alt = '全屏预览';

    const info = document.createElement('div');
    info.className = 'lion-fullscreen-info';
    info.textContent = imageUrl;

    overlay.appendChild(closeBtn);
    overlay.appendChild(img);
    overlay.appendChild(info);
    document.body.appendChild(overlay);

    const closeOverlay = () => {
      overlay.style.animation = 'lion-fade-in 0.2s ease-out reverse';
      setTimeout(() => overlay.remove(), 200);
    };

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay || e.target === closeBtn) closeOverlay();
    });

    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        closeOverlay();
        document.removeEventListener('keydown', handleEsc);
      }
    };
    document.addEventListener('keydown', handleEsc);

    img.onerror = () => {
      info.textContent = '图片加载失败';
      info.style.background = 'rgba(255,0,0,0.7)';
    };
  }

  /********************
   * 4. 增量渲染：只处理给定 cells（不再全局扫）
   ********************/
  function extractImageUrls(text) {
    if (!text) return [];
    if (!IMG_TEST_RE.test(text)) return [];
    const matches = text.match(IMG_MATCH_RE) || [];
    // 去重 + 限制数量
    const uniq = [];
    const seen = new Set();
    for (const u of matches) {
      if (seen.has(u)) continue;
      seen.add(u);
      uniq.push(u);
      if (uniq.length >= MAX_IMAGES_PER_CELL) break;
    }
    return uniq;
  }

  function renderCell(cell) {
    if (!cell || cell.nodeType !== 1) return;
    if (cell.hasAttribute(PROCESSED_ATTR)) return;

    const text = cell.textContent || '';
    const urls = extractImageUrls(text);
    if (!urls.length) return;

    cell.setAttribute(PROCESSED_ATTR, 'true');

    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.flexWrap = 'wrap';

    for (const url of urls) {
      const wrap = document.createElement('div');
      wrap.className = 'lion-img-preview-container';
      wrap.dataset.imageUrl = url;

      const thumb = document.createElement('img');
      thumb.src = url;
      thumb.className = 'lion-img-thumbnail';
      thumb.alt = '配置图片';
      thumb.title = '点击查看大图 | 悬浮快速预览';
      thumb.loading = 'lazy';
      thumb.decoding = 'async';

      thumb.onerror = () => { thumb.style.display = 'none'; };

      wrap.appendChild(thumb);
      container.appendChild(wrap);
    }

    const urlText = document.createElement('span');
    urlText.className = 'lion-img-url-text';
    urlText.textContent = urls[0];
    urlText.title = urls[0];
    container.appendChild(urlText);

    // 一次性替换，减少重排
    cell.replaceChildren(container);
  }

  function processCells(cells) {
    for (const c of cells) renderCell(c);
  }

  /********************
   * 5. Monaco diff：仅在需要时触发 + 单独节流
   ********************/
  let monacoTimer = null;

  function scheduleMonacoProcess() {
    if (monacoTimer) clearTimeout(monacoTimer);
    monacoTimer = setTimeout(() => {
      if (paused || disposed) return;
      processMonacoDiff();
    }, MONACO_DEBOUNCE_MS);
  }

  function processMonacoDiff() {
    const monacos = document.querySelectorAll(`.monaco-editor:not([${MONACO_PROCESSED_ATTR}])`);
    monacos.forEach(container => {
      // 粗过滤：没有 view-line 就不处理
      const lines = container.querySelectorAll('.view-line');
      if (!lines.length) return;

      // 只做一次整体拼接（保持原逻辑，但降低触发频率）
      let textContent = '';
      for (const line of lines) textContent += (line.textContent || '') + '\n';

      const urls = extractImageUrls(textContent);
      if (!urls.length) return;

      container.setAttribute(MONACO_PROCESSED_ATTR, 'true');

      const previewWrapper = document.createElement('div');
      previewWrapper.className = 'lion-monaco-img-preview-wrapper';

      const title = document.createElement('div');
      title.className = 'lion-monaco-img-preview-title';
      title.textContent = '图片预览';
      previewWrapper.appendChild(title);

      const previewContainer = document.createElement('div');
      previewContainer.className = 'lion-monaco-img-preview-container';

      const leftSide = container.querySelector('.original-in-monaco-diff-editor');
      const rightSide = container.querySelector('.modified-in-monaco-diff-editor');

      let oldUrls = [];
      let newUrls = [];

      if (leftSide && rightSide) {
        oldUrls = extractImageUrls(leftSide.textContent || '');
        newUrls = extractImageUrls(rightSide.textContent || '');
      } else {
        newUrls = urls;
      }

      if (oldUrls.length) {
        const oldItem = document.createElement('div');
        oldItem.className = 'lion-monaco-img-item';
        const oldLabel = document.createElement('div');
        oldLabel.className = 'lion-monaco-img-label';
        oldLabel.textContent = '变更前';
        oldItem.appendChild(oldLabel);

        oldUrls.forEach(url => {
          const img = document.createElement('img');
          img.src = url;
          img.className = 'lion-monaco-img';
          img.dataset.imageUrl = url;
          img.loading = 'lazy';
          img.decoding = 'async';
          img.onerror = () => { img.style.display = 'none'; };
          oldItem.appendChild(img);
        });
        previewContainer.appendChild(oldItem);
      }

      if (newUrls.length) {
        const newItem = document.createElement('div');
        newItem.className = 'lion-monaco-img-item';
        const newLabel = document.createElement('div');
        newLabel.className = 'lion-monaco-img-label';
        newLabel.textContent = oldUrls.length ? '变更后' : '图片';
        newItem.appendChild(newLabel);

        newUrls.forEach(url => {
          const img = document.createElement('img');
          img.src = url;
          img.className = 'lion-monaco-img';
          img.dataset.imageUrl = url;
          img.loading = 'lazy';
          img.decoding = 'async';
          img.onerror = () => { img.style.display = 'none'; };
          newItem.appendChild(img);
        });
        previewContainer.appendChild(newItem);
      }

      previewWrapper.appendChild(previewContainer);

      const parent = container.parentElement;
      if (parent && !parent.querySelector('.lion-monaco-img-preview-wrapper')) {
        parent.appendChild(previewWrapper);
      }
    });
  }

  /********************
   * 6. 事件委托：click + hover（hover 用单例预览）
   ********************/
  function onDocClick(e) {
    const el = e.target?.closest?.('.lion-img-thumbnail, .lion-monaco-img');
    if (!el) return;

    const url = el.dataset.imageUrl || el.closest('.lion-img-preview-container')?.dataset.imageUrl;
    if (!url) return;

    e.preventDefault();
    e.stopPropagation();
    createFullscreenOverlay(url);
  }

  function onDocMouseMove(e) {
    // 仅当 hover 在缩略图上才显示
    const wrap = e.target?.closest?.('.lion-img-preview-container');
    if (!wrap) return;
    const url = wrap.dataset.imageUrl;
    if (!url) return;
    showHoverPreview(url, e.clientX, e.clientY);
  }

  function onDocMouseOut(e) {
    // 移出缩略图容器则隐藏
    const related = e.relatedTarget;
    const fromWrap = e.target?.closest?.('.lion-img-preview-container');
    if (!fromWrap) return;
    if (related && related.closest && related.closest('.lion-img-preview-container') === fromWrap) return;
    hideHoverPreview();
  }

  function setupEvents() {
    document.addEventListener('click', onDocClick, true);
    document.addEventListener('mousemove', onDocMouseMove, true);
    document.addEventListener('mouseout', onDocMouseOut, true);

    // 页面不在前台就暂停处理（节能）
    document.addEventListener('visibilitychange', () => {
      paused = document.hidden;
      if (paused) hideHoverPreview();
    });
  }

  /********************
   * 7. Observer：增量收集 cells + 触发 monaco（降噪）
   ********************/
  let batchTimer = null;
  const pendingCells = new Set();

  function enqueueCells(cells) {
    for (const c of cells) pendingCells.add(c);
    if (batchTimer) clearTimeout(batchTimer);
    batchTimer = setTimeout(() => {
      if (paused || disposed) return;
      const arr = Array.from(pendingCells);
      pendingCells.clear();
      processCells(arr);
    }, BATCH_DEBOUNCE_MS);
  }

  function collectCellsFromAddedNode(node) {
    const out = [];
    if (!node || node.nodeType !== 1) return out;

    // 过滤掉明显无关的大类节点
    const tag = node.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'IFRAME') return out;

    if (node.matches?.(SELECTOR_CELL)) out.push(node);
    node.querySelectorAll?.(SELECTOR_CELL).forEach(x => out.push(x));
    return out;
  }

  function shouldScheduleMonacoFromNode(node) {
    if (!node || node.nodeType !== 1) return false;
    if (node.classList?.contains('monaco-editor')) return true;
    if (node.classList?.contains('mtd-modal')) return true;
    // 有些场景 monaco 是 modal 内部深层新增
    if (node.querySelector?.('.monaco-editor')) return true;
    return false;
  }

  function observeDOM() {
    const observer = new MutationObserver((mutations) => {
      if (paused || disposed) return;

      let monacoHint = false;
      const cells = [];

      for (const m of mutations) {
        if (!m.addedNodes || !m.addedNodes.length) continue;

        for (const n of m.addedNodes) {
          // 收集新增行里的 cell
          const got = collectCellsFromAddedNode(n);
          if (got.length) cells.push(...got);

          // Monaco 触发提示
          if (!monacoHint && shouldScheduleMonacoFromNode(n)) monacoHint = true;
        }
      }

      if (cells.length) enqueueCells(cells);
      if (monacoHint) scheduleMonacoProcess();
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return observer;
  }

  /********************
   * 8. 初始化：只做一次全量（可选），之后全靠增量
   ********************/
  function initialScanOnce() {
    // 首次进入页面还是扫一次，把首屏渲染出来；后面只增量
    const cells = document.querySelectorAll(`${SELECTOR_CELL}:not([${PROCESSED_ATTR}])`);
    enqueueCells(cells);
    scheduleMonacoProcess();
  }

  function init() {
    injectStyles();
    ensureHoverPreview();
    setupEvents();

    initialScanOnce();
    observeDOM();

    console.log('🦁 Lion 图片渲染脚本 v6（性能版）已启动');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

})();