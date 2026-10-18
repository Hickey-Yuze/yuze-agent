(function() {
  if (window.__huabanDownloaderInstalled) return;
  window.__huabanDownloaderInstalled = true;

  const STYLE_ID = 'huaban-dl-style';
  const PANEL_ID = 'huaban-dl-panel';

  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #huaban-dl-panel {
        position: fixed;
        right: 20px;
        bottom: 80px;
        z-index: 99999;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 13px;
        color: #333;
        user-select: none;
      }
      #huaban-dl-panel .dl-panel {
        background: #fff;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.18);
        padding: 16px;
        width: 300px;
        transition: all 0.3s ease;
        overflow: hidden;
      }
      #huaban-dl-panel .dl-panel.collapsed {
        width: auto;
        padding: 10px 14px;
      }
      #huaban-dl-panel .dl-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
      }
      #huaban-dl-panel .dl-panel.collapsed .dl-header {
        margin-bottom: 0;
      }
      #huaban-dl-panel .dl-title {
        font-weight: 600;
        font-size: 14px;
        color: #1a1a1a;
      }
      #huaban-dl-panel .dl-toggle {
        cursor: pointer;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background: #f0f0f0;
        border: none;
        font-size: 14px;
        color: #666;
        transition: background 0.2s;
      }
      #huaban-dl-panel .dl-toggle:hover {
        background: #e0e0e0;
      }
      #huaban-dl-panel .dl-body {
        transition: all 0.3s ease;
      }
      #huaban-dl-panel .dl-panel.collapsed .dl-body {
        display: none;
      }
      #huaban-dl-panel .dl-stats {
        background: #f7f8fa;
        border-radius: 8px;
        padding: 10px 12px;
        margin-bottom: 12px;
      }
      #huaban-dl-panel .dl-stats-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 4px;
      }
      #huaban-dl-panel .dl-stats-row:last-child { margin-bottom: 0; }
      #huaban-dl-panel .dl-stats-label { color: #888; }
      #huaban-dl-panel .dl-stats-value { font-weight: 600; color: #333; }
      #huaban-dl-panel .dl-progress-wrap {
        background: #eee;
        border-radius: 4px;
        height: 6px;
        margin-top: 10px;
        overflow: hidden;
      }
      #huaban-dl-panel .dl-progress-bar {
        height: 100%;
        background: linear-gradient(90deg, #4CAF50, #8BC34A);
        border-radius: 4px;
        width: 0%;
        transition: width 0.3s ease;
      }
      #huaban-dl-panel .dl-btn-group {
        display: flex;
        gap: 8px;
        margin-bottom: 10px;
      }
      #huaban-dl-panel .dl-btn {
        flex: 1;
        padding: 8px 0;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
      }
      #huaban-dl-panel .dl-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      #huaban-dl-panel .dl-btn-primary {
        background: linear-gradient(135deg, #4CAF50, #43A047);
        color: #fff;
      }
      #huaban-dl-panel .dl-btn-primary:hover:not(:disabled) {
        background: linear-gradient(135deg, #43A047, #388E3C);
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(76,175,80,0.3);
      }
      #huaban-dl-panel .dl-btn-secondary {
        background: #f0f0f0;
        color: #555;
      }
      #huaban-dl-panel .dl-btn-secondary:hover:not(:disabled) {
        background: #e0e0e0;
      }
      #huaban-dl-panel .dl-btn-scan {
        background: linear-gradient(135deg, #2196F3, #1E88E5);
        color: #fff;
      }
      #huaban-dl-panel .dl-btn-scan:hover:not(:disabled) {
        background: linear-gradient(135deg, #1E88E5, #1565C0);
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(33,150,243,0.3);
      }
      #huaban-dl-panel .dl-btn-stop {
        background: linear-gradient(135deg, #FF9800, #F57C00);
        color: #fff;
      }
      #huaban-dl-panel .dl-btn-stop:hover:not(:disabled) {
        background: linear-gradient(135deg, #F57C00, #E65100);
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(255,152,0,0.3);
      }
      #huaban-dl-panel .dl-btn-folder {
        background: linear-gradient(135deg, #9C27B0, #7B1FA2);
        color: #fff;
      }
      #huaban-dl-panel .dl-btn-folder:hover:not(:disabled) {
        background: linear-gradient(135deg, #7B1FA2, #6A1B9A);
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(156,39,176,0.3);
      }
      #huaban-dl-panel .dl-log {
        max-height: 120px;
        overflow-y: auto;
        background: #f7f8fa;
        border-radius: 8px;
        padding: 8px 10px;
        font-size: 11px;
        line-height: 1.6;
        color: #666;
      }
      #huaban-dl-panel .dl-log::-webkit-scrollbar { width: 4px; }
      #huaban-dl-panel .dl-log::-webkit-scrollbar-thumb { background: #ccc; border-radius: 2px; }
      #huaban-dl-panel .dl-log .log-success { color: #4CAF50; }
      #huaban-dl-panel .dl-log .log-error { color: #f44336; }
      #huaban-dl-panel .dl-log .log-info { color: #2196F3; }
      #huaban-dl-panel .dl-log .log-warn { color: #FF9800; }
      #huaban-dl-panel .dl-checkbox-row {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 10px;
        font-size: 12px;
        color: #666;
      }
      #huaban-dl-panel .dl-checkbox-row input[type="checkbox"] {
        accent-color: #4CAF50;
      }
      #huaban-dl-panel .dl-folder-path {
        background: #f7f8fa;
        border: 1px solid #e0e0e0;
        border-radius: 6px;
        padding: 6px 10px;
        font-size: 12px;
        color: #666;
        margin-bottom: 10px;
        word-break: break-all;
        max-height: 40px;
        overflow-y: auto;
      }
      #huaban-dl-panel .dl-folder-path.empty {
        color: #999;
        font-style: italic;
      }
      #huaban-dl-panel .dl-folder-path::-webkit-scrollbar { width: 3px; }
      #huaban-dl-panel .dl-folder-path::-webkit-scrollbar-thumb { background: #bbb; }
    `;
    document.head.appendChild(style);
  }

  const state = {
    images: [],
    downloading: false,
    progress: 0,
    total: 0,
    originalSize: false,
    autoScroll: false,
    collapsed: false,
    stopRequested: false,
    selectedFolder: null,
    maxConcurrent: 3,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    panelStartLeft: 0,
    panelStartTop: 0
  };

  // 修复字符串模板问题
  function formatMessage(template, ...args) {
    return template.replace(/{(\d+)}/g, (match, number) => {
      return typeof args[number] !== 'undefined' ? args[number] : match;
    });
  }

  function getOriginalUrl(src) {
    if (!src) return src;
    
    const patterns = [
      /_fw\d+/g,
      /_sq\d+/g,
      /_t\d+/g,
      /_\d+x\d+/g,
      /_min/g,
      /_small/g,
      /_medium/g,
      /_large/g,
      /\?.*$/g
    ];
    
    let url = src;
    patterns.forEach(pattern => {
      url = url.replace(pattern, '');
    });
    
    if (url.startsWith('//')) {
      url = 'https:' + url;
    } else if (url.startsWith('/')) {
      url = 'https://huaban.com' + url;
    }
    
    return url;
  }

  function scanImages() {
    console.log('开始扫描图片...');
    
    const selectors = [
      '.zjSSb8O3.brick',
      '.kgGJbqsa .brick',
      '[class*="brick"]',
      '.pin-item',
      '.material-item',
      'div[data-pin-id]'
    ];
    
    let bricks = [];
    for (const selector of selectors) {
      const found = document.querySelectorAll(selector);
      if (found.length > 0) {
        bricks = found;
        console.log(`使用选择器 "${selector}" 找到 ${found.length} 个元素`);
        break;
      }
    }
    
    if (bricks.length === 0) {
      console.log('未找到图片容器，尝试其他方法...');
      const imgs = document.querySelectorAll('img[src*="huaban"], img[src*="hbimg"]');
      bricks = Array.from(imgs).map(img => img.parentElement);
    }
    
    const found = [];
    
    bricks.forEach(brick => {
      if (!brick) return;
      
      const img = brick.querySelector('img');
      if (!img) return;
      
      const src = img.getAttribute('src') || img.getAttribute('data-src') || '';
      if (!src || src.startsWith('data:')) return;
      
      let title = '未命名';
      const titleSelectors = [
        'a[title]',
        '.pin-title',
        '[class*="title"]',
        '[class*="name"]',
        'a > span'
      ];
      
      for (const selector of titleSelectors) {
        const titleEl = brick.querySelector(selector);
        if (titleEl) {
          const text = titleEl.getAttribute('title') || titleEl.textContent || '';
          if (text.trim()) {
            title = text.trim();
            break;
          }
        }
      }
      
      const pinId = brick.getAttribute('data-pin-id') || 
                   (src.match(/pins\/(\d+)/) ? src.match(/pins\/(\d+)/)[1] : '') ||
                   (src.match(/(\d+)_/)?.[1] || '');
      
      found.push({
        src: src,
        originalUrl: getOriginalUrl(src),
        title: title.substring(0, 100),
        pinId: pinId,
        downloaded: false,
        timestamp: Date.now()
      });
    });
    
    // 去重
    const seen = new Set(state.images.map(i => i.pinId || i.src));
    const newImages = found.filter(img => {
      const key = img.pinId || img.src;
      return key && !seen.has(key);
    });
    
    state.images.push(...newImages);
    updateUI();
    
    const totalCount = state.images.length;
    const newCount = newImages.length;
    
    // 修复：使用正确的字符串格式化
    addLog(`扫描完成，新增 ${newCount} 张，累计 ${totalCount} 张`, 'info');
    console.log(`扫描结果: 新增 ${newCount} 张，总计 ${totalCount} 张`);
  }

  async function selectFolder() {
    try {
      if (window.showDirectoryPicker) {
        const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
        state.selectedFolder = handle;
        updateUI();
        addLog(`已选择文件夹: ${handle.name}`, 'success');
        return handle;
      } else {
        addLog('您的浏览器不支持文件夹选择功能', 'warn');
        return null;
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        addLog(`选择文件夹失败: ${err.message}`, 'error');
      }
      return null;
    }
  }

  async function downloadImageParallel(url, filename, index) {
    return new Promise(async (resolve) => {
      try {
        let finalUrl = state.originalSize ? getOriginalUrl(url) : url;
        
        if (!finalUrl.includes('?')) {
          finalUrl += '?t=' + Date.now();
        }
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        const response = await fetch(finalUrl, {
          signal: controller.signal,
          mode: 'cors',
          cache: 'no-cache'
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const blob = await response.blob();
        
        if (state.selectedFolder) {
          try {
            const fileHandle = await state.selectedFolder.getFileHandle(filename, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(blob);
            await writable.close();
            resolve({ success: true, index });
            return;
          } catch (fsError) {
            console.log('文件系统保存失败，使用传统下载:', fsError);
          }
        }
        
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        resolve({ success: true, index });
        
      } catch (err) {
        console.error(`下载失败 (${index}): ${err.message}`);
        resolve({ success: false, index, error: err.message });
      }
    });
  }

  async function startDownload() {
    if (state.downloading || state.images.length === 0) return;
    
    state.downloading = true;
    state.stopRequested = false;
    state.progress = 0;
    state.total = state.images.length;
    updateUI();
    
    addLog(`开始下载 ${state.images.length} 张图片（并行下载）...`, 'info');
    
    const pendingImages = state.images.filter(img => !img.downloaded);
    const total = pendingImages.length;
    let completed = 0;
    let failed = 0;
    
    const queue = [...pendingImages];
    const activeDownloads = new Set();
    
    async function processQueue() {
      while (!state.stopRequested && queue.length > 0) {
        if (activeDownloads.size >= state.maxConcurrent) {
          await new Promise(resolve => setTimeout(resolve, 100));
          continue;
        }
        
        const img = queue.shift();
        const index = state.images.findIndex(i => i.src === img.src);
        const ext = img.src.match(/\.(jpg|jpeg|png|gif|webp|bmp)/i)?.[1] || 'jpg';
        const filename = `${img.title}.${ext}`.replace(/[\/\\:*?"<>|]/g, '_');
        
        const downloadPromise = downloadImageParallel(img.src, filename, index)
          .then(result => {
            activeDownloads.delete(downloadPromise);
            
            if (result.success) {
              state.images[index].downloaded = true;
              state.progress++;
              addLog(`✓ [${index + 1}/${state.total}] ${img.title}`, 'success');
              completed++;
            } else {
              addLog(`✗ [${index + 1}/${state.total}] ${img.title}`, 'error');
              failed++;
            }
            
            updateUI();
          })
          .catch(err => {
            activeDownloads.delete(downloadPromise);
            console.error('下载异常:', err);
            failed++;
            updateUI();
          });
        
        activeDownloads.add(downloadPromise);
        
        await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
      }
    }
    
    const processors = [];
    for (let i = 0; i < state.maxConcurrent; i++) {
      processors.push(processQueue());
    }
    
    await Promise.all(processors);
    
    while (activeDownloads.size > 0 && !state.stopRequested) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    state.downloading = false;
    updateUI();
    
    if (state.stopRequested) {
      addLog(`下载已停止，成功 ${completed}/${total}，失败 ${failed}`, 'warn');
    } else {
      addLog(`下载完成！成功 ${completed}/${total}，失败 ${failed}`, 'info');
    }
  }

  function stopDownload() {
    if (state.downloading) {
      state.stopRequested = true;
      addLog('正在停止下载...', 'warn');
      updateUI();
    }
  }

  async function autoScrollAndScan() {
    if (state.downloading) return;
    
    state.autoScroll = true;
    updateUI();
    addLog('开始自动滚动加载...', 'info');
    
    const scrollContainer = document.querySelector('.infinite-scroll-component') || window;
    let lastCount = state.images.length;
    let stableCount = 0;
    let scrollAttempts = 0;
    const maxAttempts = 20;
    
    while (state.autoScroll && stableCount < 3 && scrollAttempts < maxAttempts) {
      scrollAttempts++;
      
      if (scrollContainer === window) {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      } else {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
      
      await new Promise(r => setTimeout(r, 1500));
      
      scanImages();
      
      if (state.images.length === lastCount) {
        stableCount++;
      } else {
        stableCount = 0;
        lastCount = state.images.length;
      }
      
      addLog(`滚动加载 (${scrollAttempts}/${maxAttempts})...`, 'info');
    }
    
    state.autoScroll = false;
    updateUI();
    
    if (scrollAttempts >= maxAttempts) {
      addLog(`滚动加载达到最大尝试次数 (${maxAttempts}次)`, 'warn');
    } else {
      addLog(`滚动加载完成，共发现 ${state.images.length} 张图片`, 'info');
    }
  }

  function addLog(message, type = 'info') {
    const logEl = document.querySelector('#huaban-dl-panel .dl-log');
    if (!logEl) return;
    
    const line = document.createElement('div');
    line.className = `log-${type}`;
    line.textContent = message;
    logEl.appendChild(line);
    logEl.scrollTop = logEl.scrollHeight;
  }

  function updateUI() {
    const statsEl = document.querySelector('#huaban-dl-panel .dl-stats-value-count');
    const progressEl = document.querySelector('#huaban-dl-panel .dl-progress-bar');
    const progressTextEl = document.querySelector('#huaban-dl-panel .dl-stats-value-progress');
    const folderPathEl = document.querySelector('#huaban-dl-panel .dl-folder-path');
    const scanBtn = document.querySelector('#huaban-dl-panel .dl-btn-scan');
    const downloadBtn = document.querySelector('#huaban-dl-panel .dl-btn-primary');
    const stopBtn = document.querySelector('#huaban-dl-panel .dl-btn-stop');
    const folderBtn = document.querySelector('#huaban-dl-panel .dl-btn-folder');
    const scrollBtn = document.querySelector('#huaban-dl-panel .dl-btn-secondary');
    const originalCheckbox = document.querySelector('#huaban-dl-panel #dl-original-size');
    
    const downloadedCount = state.images.filter(i => i.downloaded).length;
    
    if (statsEl) statsEl.textContent = state.images.length;
    if (progressEl) {
      const progressPercent = state.total > 0 ? (state.progress / state.total * 100) : 0;
      progressEl.style.width = `${progressPercent}%`;
    }
    if (progressTextEl) {
      progressTextEl.textContent = `${state.progress}/${state.total}`;
    }
    
    if (folderPathEl) {
      if (state.selectedFolder) {
        folderPathEl.textContent = state.selectedFolder.name;
        folderPathEl.classList.remove('empty');
      } else {
        folderPathEl.textContent = '未选择文件夹（将下载到默认下载目录）';
        folderPathEl.classList.add('empty');
      }
    }
    
    if (originalCheckbox) {
      originalCheckbox.checked = state.originalSize;
    }
    
    if (scanBtn) scanBtn.disabled = state.downloading;
    if (downloadBtn) {
      downloadBtn.disabled = state.downloading || state.images.length === 0;
      downloadBtn.textContent = state.downloading ? '⏳ 下载中...' : '📥 批量下载';
      downloadBtn.title = state.originalSize ? '批量下载（原图模式）' : '批量下载';
    }
    if (stopBtn) {
      stopBtn.disabled = !state.downloading;
      stopBtn.style.display = state.downloading ? 'flex' : 'none';
    }
    if (folderBtn) folderBtn.disabled = state.downloading;
    if (scrollBtn) {
      scrollBtn.disabled = state.downloading;
      scrollBtn.textContent = state.autoScroll ? '⏹ 停止滚动' : '🔄 滚动加载';
    }
  }

  function initDrag(panel) {
    panel.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON' || 
          e.target.tagName === 'INPUT' || 
          e.target.tagName === 'LABEL' ||
          e.target.closest('.dl-toggle')) return;
      
      state.isDragging = true;
      state.dragStartX = e.clientX;
      state.dragStartY = e.clientY;
      
      const rect = panel.getBoundingClientRect();
      state.panelStartLeft = rect.left;
      state.panelStartTop = rect.top;
      
      e.preventDefault();
      panel.style.cursor = 'grabbing';
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!state.isDragging) return;
      
      const dx = e.clientX - state.dragStartX;
      const dy = e.clientY - state.dragStartY;
      
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
      panel.style.left = (state.panelStartLeft + dx) + 'px';
      panel.style.top = (state.panelStartTop + dy) + 'px';
    });
    
    document.addEventListener('mouseup', () => {
      if (state.isDragging) {
        state.isDragging = false;
        panel.style.cursor = '';
      }
    });
  }

  function createPanel() {
    if (document.getElementById(PANEL_ID)) return;
    
    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.innerHTML = `
      <div class="dl-panel">
        <div class="dl-header">
          <span class="dl-title">🖼️ 花瓣图片下载器</span>
          <button class="dl-toggle" title="折叠/展开">−</button>
        </div>
        <div class="dl-body">
          <div class="dl-stats">
            <div class="dl-stats-row">
              <span class="dl-stats-label">已扫描图片</span>
              <span class="dl-stats-value dl-stats-value-count">0</span>
            </div>
            <div class="dl-stats-row">
              <span class="dl-stats-label">下载进度</span>
              <span class="dl-stats-value dl-stats-value-progress">0/0</span>
            </div>
            <div class="dl-progress-wrap">
              <div class="dl-progress-bar"></div>
            </div>
          </div>
          <div class="dl-checkbox-row">
            <input type="checkbox" id="dl-original-size" />
            <label for="dl-original-size">下载原图（去除缩略图后缀）</label>
          </div>
          <div class="dl-folder-path empty">未选择文件夹（将下载到默认下载目录）</div>
          <div class="dl-btn-group">
            <button class="dl-btn dl-btn-scan" title="扫描当前页面可见图片">🔍 扫描图片</button>
            <button class="dl-btn dl-btn-folder" title="选择下载文件夹">📁 选择文件夹</button>
          </div>
          <div class="dl-btn-group">
            <button class="dl-btn dl-btn-secondary" title="自动滚动加载更多图片">🔄 滚动加载</button>
            <button class="dl-btn dl-btn-stop" title="停止下载" style="display:none;">⏹ 停止下载</button>
          </div>
          <button class="dl-btn dl-btn-primary" disabled style="width:100%;margin-bottom:10px;">📥 批量下载</button>
          <div class="dl-log"></div>
        </div>
      </div>
    `;
    
    document.body.appendChild(panel);
    
    const toggleBtn = panel.querySelector('.dl-toggle');
    toggleBtn.addEventListener('click', () => {
      state.collapsed = !state.collapsed;
      const p = panel.querySelector('.dl-panel');
      p.classList.toggle('collapsed', state.collapsed);
      toggleBtn.textContent = state.collapsed ? '+' : '−';
    });
    
    panel.querySelector('.dl-btn-scan').addEventListener('click', scanImages);
    panel.querySelector('.dl-btn-folder').addEventListener('click', selectFolder);
    panel.querySelector('.dl-btn-secondary').addEventListener('click', () => {
      if (state.autoScroll) {
        state.autoScroll = false;
        updateUI();
      } else if (!state.downloading) {
        autoScrollAndScan();
      }
    });
    panel.querySelector('.dl-btn-primary').addEventListener('click', startDownload);
    panel.querySelector('.dl-btn-stop').addEventListener('click', stopDownload);
    
    const originalCheckbox = panel.querySelector('#dl-original-size');
    originalCheckbox.addEventListener('change', (e) => {
      state.originalSize = e.target.checked;
      updateUI();
    });
    
    initDrag(panel);
    
    setTimeout(() => {
      scanImages();
      console.log('花瓣图片下载器已加载，版本: 2026.04.30-fixed');
    }, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createPanel);
  } else {
    createPanel();
  }
})();