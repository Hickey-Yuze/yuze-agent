(function() {
  if (window.__downloadAcceleratorLoaded) return;
  window.__downloadAcceleratorLoaded = true;

  const DEFAULT_CONFIG = {
    maxThreads: 8,
    speedMultiplier: 4,
    minFileSize: 1024 * 1024,       // 1MB
    maxFileSize: 1024 * 1024 * 1024 * 5, // 5GB
    chunkSize: 1024 * 512            // 512KB
  };

  let currentDownload = null;
  let isAccelerating = false;
  let modalEl = null;

  function createStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .da-overlay {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); z-index: 2147483647;
        display: flex; align-items: center; justify-content: center;
        backdrop-filter: blur(4px); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        animation: daFadeIn 0.2s ease;
      }
      @keyframes daFadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes daSlideIn { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      .da-modal {
        background: #1a1b2e; border-radius: 16px; width: 480px;
        box-shadow: 0 24px 80px rgba(0,0,0,0.5); color: #e0e0e0;
        animation: daSlideIn 0.3s ease; overflow: hidden;
        border: 1px solid rgba(99,102,241,0.3);
      }
      .da-header {
        padding: 20px 24px 16px; display: flex; align-items: center; justify-content: space-between;
        border-bottom: 1px solid rgba(255,255,255,0.08);
      }
      .da-header h2 {
        margin: 0; font-size: 18px; font-weight: 600;
        background: linear-gradient(135deg, #818cf8, #6366f1);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      }
      .da-close {
        width: 32px; height: 32px; border: none; background: rgba(255,255,255,0.06);
        border-radius: 8px; color: #999; font-size: 18px; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        transition: all 0.2s;
      }
      .da-close:hover { background: rgba(255,255,255,0.12); color: #fff; }
      .da-tabs {
        display: flex; padding: 16px 24px 0; gap: 8px;
      }
      .da-tab {
        flex: 1; padding: 10px; border: 1px solid rgba(255,255,255,0.1);
        border-radius: 10px; background: transparent; color: #999;
        cursor: pointer; font-size: 14px; font-weight: 500;
        transition: all 0.25s; text-align: center;
      }
      .da-tab.active {
        background: linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.15));
        border-color: rgba(99,102,241,0.5); color: #a5b4fc;
      }
      .da-tab:hover:not(.active) { background: rgba(255,255,255,0.04); color: #ccc; }
      .da-body { padding: 20px 24px; }
      .da-default-info {
        background: rgba(99,102,241,0.08); border-radius: 12px;
        padding: 20px; border: 1px solid rgba(99,102,241,0.15);
      }
      .da-default-info h3 { margin: 0 0 12px; font-size: 15px; color: #a5b4fc; }
      .da-config-row {
        display: flex; justify-content: space-between; padding: 6px 0;
        font-size: 13px; color: #bbb;
      }
      .da-config-row span:last-child { color: #e0e0e0; font-weight: 500; }
      .da-form { display: flex; flex-direction: column; gap: 14px; }
      .da-field label {
        display: block; font-size: 13px; color: #999;
        margin-bottom: 6px; font-weight: 500;
      }
      .da-field input, .da-field select {
        width: 100%; padding: 10px 14px; border-radius: 10px;
        border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04);
        color: #e0e0e0; font-size: 14px; outline: none;
        transition: border-color 0.2s; box-sizing: border-box;
      }
      .da-field input:focus, .da-field select:focus {
        border-color: rgba(99,102,241,0.6);
      }
      .da-field .da-hint { font-size: 11px; color: #666; margin-top: 4px; }
      .da-footer {
        padding: 16px 24px 20px; display: flex; gap: 10px;
        border-top: 1px solid rgba(255,255,255,0.06);
      }
      .da-btn {
        flex: 1; padding: 11px; border-radius: 10px; border: none;
        font-size: 14px; font-weight: 600; cursor: pointer;
        transition: all 0.25s;
      }
      .da-btn-cancel {
        background: rgba(255,255,255,0.06); color: #999;
      }
      .da-btn-cancel:hover { background: rgba(255,255,255,0.1); color: #ccc; }
      .da-btn-accel {
        background: linear-gradient(135deg, #6366f1, #8b5cf6);
        color: #fff; box-shadow: 0 4px 16px rgba(99,102,241,0.3);
      }
      .da-btn-accel:hover { transform: translateY(-1px); box-shadow: 0 6px 24px rgba(99,102,241,0.4); }
      .da-btn-accel:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
      .da-progress-area {
        padding: 0 24px 20px;
      }
      .da-progress-bar-bg {
        height: 8px; background: rgba(255,255,255,0.08); border-radius: 4px;
        overflow: hidden; margin-bottom: 10px;
      }
      .da-progress-bar-fill {
        height: 100%; border-radius: 4px;
        background: linear-gradient(90deg, #6366f1, #8b5cf6, #a78bfa);
        transition: width 0.3s ease; width: 0%;
      }
      .da-progress-stats {
        display: flex; justify-content: space-between; font-size: 12px; color: #888;
      }
      .da-thread-grid {
        display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;
        margin-top: 10px;
      }
      .da-thread-dot {
        height: 6px; border-radius: 3px; background: rgba(255,255,255,0.06);
        transition: background 0.3s;
      }
      .da-thread-dot.active { background: #6366f1; }
      .da-thread-dot.done { background: #22c55e; }
      .da-toast {
        position: fixed; top: 24px; right: 24px; z-index: 2147483647;
        background: #1a1b2e; border: 1px solid rgba(99,102,241,0.3);
        padding: 14px 20px; border-radius: 12px; color: #e0e0e0;
        font-size: 13px; font-weight: 500; box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        animation: daSlideIn 0.3s ease;
        display: flex; align-items: center; gap: 10px;
      }
      .da-toast-icon {
        width: 24px; height: 24px; border-radius: 6px;
        display: flex; align-items: center; justify-content: center;
        font-size: 14px;
      }
      .da-toast-icon.success { background: rgba(34,197,94,0.2); color: #22c55e; }
      .da-toast-icon.info { background: rgba(99,102,241,0.2); color: #818cf8; }
      .da-toast-icon.warn { background: rgba(245,158,11,0.2); color: #f59e0b; }
      .da-url-input-area { margin-bottom: 16px; }
      .da-url-input-area input {
        width: 100%; padding: 10px 14px; border-radius: 10px;
        border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04);
        color: #e0e0e0; font-size: 13px; outline: none;
        transition: border-color 0.2s; box-sizing: border-box;
      }
      .da-url-input-area input:focus { border-color: rgba(99,102,241,0.6); }
      .da-url-input-area label { display: block; font-size: 12px; color: #888; margin-bottom: 6px; }
      .da-speed-badge {
        display: inline-flex; align-items: center; gap: 4px;
        background: linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.15));
        padding: 3px 10px; border-radius: 6px; font-size: 12px;
        color: #a5b4fc; font-weight: 600;
      }
      .da-shortcut-hint {
        text-align: center; font-size: 11px; color: #555;
        padding-bottom: 4px;
      }
      .da-shortcut-hint kbd {
        background: rgba(255,255,255,0.06); padding: 2px 6px;
        border-radius: 4px; font-size: 11px; border: 1px solid rgba(255,255,255,0.1);
      }
    `;
    document.head.appendChild(style);
    return style;
  }

  function showToast(message, type = 'info') {
    const icons = { success: '✓', info: '⚡', warn: '⚠' };
    const toast = document.createElement('div');
    toast.className = 'da-toast';
    toast.innerHTML = `
      <span class="da-toast-icon ${type}">${icons[type]}</span>
      <span>${message}</span>
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.transition = 'opacity 0.3s, transform 0.3s';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  function formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0) + ' ' + units[i];
  }

  function formatSpeed(bytesPerSec) {
    return formatSize(bytesPerSec) + '/s';
  }

  function getActiveTab() {
    const tabs = modalEl.querySelectorAll('.da-tab');
    if (tabs[0] && tabs[0].classList.contains('active')) return 'default';
    return 'custom';
  }

  function getCustomConfig() {
    const parseSize = (val) => {
      val = val.trim();
      const match = val.match(/^([\d.]+)\s*(B|KB|MB|GB|TB)?$/i);
      if (!match) return null;
      const num = parseFloat(match[1]);
      const unit = (match[2] || 'MB').toUpperCase();
      const multipliers = { B: 1, KB: 1024, MB: 1024**2, GB: 1024**3, TB: 1024**4 };
      return num * (multipliers[unit] || 1024**2);
    };
    return {
      maxThreads: parseInt(modalEl.querySelector('#da-threads')?.value) || DEFAULT_CONFIG.maxThreads,
      speedMultiplier: parseFloat(modalEl.querySelector('#da-speed')?.value) || DEFAULT_CONFIG.speedMultiplier,
      minFileSize: parseSize(modalEl.querySelector('#da-min-size')?.value) || DEFAULT_CONFIG.minFileSize,
      maxFileSize: parseSize(modalEl.querySelector('#da-max-size')?.value) || DEFAULT_CONFIG.maxFileSize,
      chunkSize: parseSize(modalEl.querySelector('#da-chunk-size')?.value) || DEFAULT_CONFIG.chunkSize
    };
  }

  function validateCustomConfig(config) {
    if (config.maxThreads < 1 || config.maxThreads > 64) {
      showToast('线程数应在 1-64 之间', 'warn');
      return false;
    }
    if (config.speedMultiplier < 1 || config.speedMultiplier > 100) {
      showToast('加速倍速应在 1-100 之间', 'warn');
      return false;
    }
    if (config.minFileSize < 0) {
      showToast('最小文件大小不能为负', 'warn');
      return false;
    }
    if (config.minFileSize >= config.maxFileSize) {
      showToast('最小文件大小必须小于最大文件大小', 'warn');
      return false;
    }
    if (config.chunkSize < 1024) {
      showToast('分片大小不能小于 1KB', 'warn');
      return false;
    }
    return true;
  }

  async function accelerateDownload(url, config) {
    if (isAccelerating) {
      showToast('已有下载任务正在加速中', 'warn');
      return;
    }
    isAccelerating = true;
    updateAccelButton(true);

    try {
      showToast('正在获取文件信息...', 'info');

      const headResp = await fetch(url, { method: 'HEAD', mode: 'cors' });
      if (!headResp.ok) throw new Error('无法访问该资源');

      const contentLength = parseInt(headResp.headers.get('Content-Length') || '0');
      const contentType = headResp.headers.get('Content-Type') || 'application/octet-stream';
      const acceptRanges = headResp.headers.get('Accept-Ranges');

      if (!contentLength || contentLength === 0) {
        throw new Error('无法获取文件大小，不支持加速下载');
      }

      if (contentLength < config.minFileSize) {
        throw new Error(`文件大小 ${formatSize(contentLength)} 小于最小加速限制 ${formatSize(config.minFileSize)}`);
      }
      if (contentLength > config.maxFileSize) {
        throw new Error(`文件大小 ${formatSize(contentLength)} 超过最大加速限制 ${formatSize(config.maxFileSize)}`);
      }

      const supportsRange = acceptRanges && acceptRanges.includes('bytes');
      const effectiveThreads = supportsRange ? Math.min(config.maxThreads, Math.ceil(contentLength / config.chunkSize)) : 1;
      const effectiveChunkSize = supportsRange ? Math.ceil(contentLength / effectiveThreads) : contentLength;

      if (!supportsRange) {
        showToast('服务器不支持分片下载，将使用单线程加速', 'warn');
      }

      const filename = getFilenameFromUrl(url, headResp);
      showProgressUI(effectiveThreads);

      const startTime = Date.now();
      let completedBytes = 0;
      const threadStates = new Array(effectiveThreads).fill('idle');

      const chunks = [];
      const promises = [];

      for (let i = 0; i < effectiveThreads; i++) {
        const start = i * effectiveChunkSize;
        const end = Math.min(start + effectiveChunkSize - 1, contentLength - 1);

        threadStates[i] = 'active';
        updateThreadDots(threadStates);

        const promise = fetchRange(url, start, end).then(async (response) => {
          const reader = response.body.getReader();
          const chunks_local = [];
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks_local.push(value);
            completedBytes += value.length;
            updateProgress(completedBytes, contentLength, startTime, effectiveThreads);
          }
          threadStates[i] = 'done';
          updateThreadDots(threadStates);
          return concatUint8Arrays(chunks_local);
        });

        promises.push(promise);
      }

      const results = await Promise.all(promises);
      const blob = new Blob(results, { type: contentType });

      updateProgress(contentLength, contentLength, startTime, effectiveThreads);

      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 5000);

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      showToast(`加速下载完成！用时 ${elapsed}s，平均速度 ${formatSpeed(contentLength / (Date.now() - startTime) * 1000)}`, 'success');

    } catch (err) {
      showToast(`加速失败: ${err.message}`, 'warn');
      console.error('[DownloadAccelerator]', err);
      fallbackDownload(url);
    } finally {
      isAccelerating = false;
      updateAccelButton(false);
    }
  }

  async function fetchRange(url, start, end) {
    const headers = { Range: `bytes=${start}-${end}` };
    const resp = await fetch(url, { headers, mode: 'cors' });
    if (!resp.ok && resp.status !== 206) throw new Error(`HTTP ${resp.status}`);
    return resp;
  }

  function concatUint8Arrays(arrays) {
    const totalLength = arrays.reduce((acc, arr) => acc + arr.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const arr of arrays) {
      result.set(arr, offset);
      offset += arr.length;
    }
    return result;
  }

  function getFilenameFromUrl(url, resp) {
    const disposition = resp.headers.get('Content-Disposition');
    if (disposition) {
      const match = disposition.match(/filename[^;=\n]*=(['"]?)(.*?)\1(;|$)/);
      if (match && match[2]) return decodeURIComponent(match[2]);
    }
    try {
      const pathname = new URL(url).pathname;
      const parts = pathname.split('/');
      return parts[parts.length - 1] || 'download';
    } catch {
      return 'download';
    }
  }

  function fallbackDownload(url) {
    showToast('回退到普通下载方式', 'info');
    const a = document.createElement('a');
    a.href = url;
    a.download = '';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function showProgressUI(threads) {
    let area = modalEl.querySelector('.da-progress-area');
    if (!area) {
      area = document.createElement('div');
      area.className = 'da-progress-area';
      const body = modalEl.querySelector('.da-body');
      body.appendChild(area);
    }
    area.innerHTML = `
      <div class="da-progress-bar-bg">
        <div class="da-progress-bar-fill" id="da-progress-fill"></div>
      </div>
      <div class="da-progress-stats">
        <span id="da-progress-pct">0%</span>
        <span id="da-progress-speed">0 B/s</span>
        <span id="da-progress-size">0 B / 0 B</span>
      </div>
      <div class="da-thread-grid" id="da-thread-grid">
        ${Array(threads).fill('<div class="da-thread-dot active"></div>').join('')}
      </div>
    `;
  }

  function updateProgress(completed, total, startTime, threads) {
    const pct = Math.min((completed / total) * 100, 100);
    const elapsed = (Date.now() - startTime) / 1000;
    const speed = elapsed > 0 ? completed / elapsed : 0;
    const fill = modalEl.querySelector('#da-progress-fill');
    const pctEl = modalEl.querySelector('#da-progress-pct');
    const speedEl = modalEl.querySelector('#da-progress-speed');
    const sizeEl = modalEl.querySelector('#da-progress-size');
    if (fill) fill.style.width = pct.toFixed(1) + '%';
    if (pctEl) pctEl.textContent = pct.toFixed(1) + '%';
    if (speedEl) speedEl.textContent = formatSpeed(speed);
    if (sizeEl) sizeEl.textContent = `${formatSize(completed)} / ${formatSize(total)}`;
  }

  function updateThreadDots(states) {
    const dots = modalEl.querySelectorAll('.da-thread-dot');
    states.forEach((state, i) => {
      if (dots[i]) {
        dots[i].className = 'da-thread-dot';
        if (state === 'active') dots[i].classList.add('active');
        else if (state === 'done') dots[i].classList.add('done');
      }
    });
  }

  function updateAccelButton(disabled) {
    const btn = modalEl.querySelector('.da-btn-accel');
    if (btn) btn.disabled = disabled;
  }

  function createModal() {
    if (modalEl) { modalEl.remove(); modalEl = null; }

    const overlay = document.createElement('div');
    overlay.className = 'da-overlay';
    overlay.id = 'da-overlay';

    overlay.innerHTML = `
      <div class="da-modal">
        <div class="da-header">
          <h2>⚡ 下载加速器</h2>
          <button class="da-close" id="da-close-btn">✕</button>
        </div>
        <div class="da-tabs">
          <button class="da-tab active" data-tab="default">🚀 默认加速</button>
          <button class="da-tab" data-tab="custom">⚙️ 自定义加速</button>
        </div>
        <div class="da-body">
          <div class="da-url-input-area">
            <label>下载链接</label>
            <input type="text" id="da-url-input" placeholder="输入或粘贴下载链接..." />
          </div>
          <div id="da-tab-content">
            <div class="da-default-info" id="da-default-panel">
              <h3>默认加速配置</h3>
              <div class="da-config-row"><span>最大线程数</span><span>${DEFAULT_CONFIG.maxThreads}</span></div>
              <div class="da-config-row"><span>加速倍速</span><span>${DEFAULT_CONFIG.speedMultiplier}x</span></div>
              <div class="da-config-row"><span>最小文件大小</span><span>${formatSize(DEFAULT_CONFIG.minFileSize)}</span></div>
              <div class="da-config-row"><span>最大文件大小</span><span>${formatSize(DEFAULT_CONFIG.maxFileSize)}</span></div>
              <div class="da-config-row"><span>分片大小</span><span>${formatSize(DEFAULT_CONFIG.chunkSize)}</span></div>
            </div>
            <div class="da-form" id="da-custom-panel" style="display:none">
              <div class="da-field">
                <label>最大线程数</label>
                <input type="number" id="da-threads" value="${DEFAULT_CONFIG.maxThreads}" min="1" max="64" />
                <div class="da-hint">建议 4-32，过高可能导致服务器拒绝</div>
              </div>
              <div class="da-field">
                <label>加速倍速</label>
                <input type="number" id="da-speed" value="${DEFAULT_CONFIG.speedMultiplier}" min="1" max="100" step="0.5" />
                <div class="da-hint">通过多线程并行实现，实际效果取决于服务器和带宽</div>
              </div>
              <div class="da-field">
                <label>最小加速文件大小</label>
                <input type="text" id="da-min-size" value="${formatSize(DEFAULT_CONFIG.minFileSize).replace(' ', '')}" placeholder="例如: 1MB" />
                <div class="da-hint">低于此大小的文件不启用加速（支持 B/KB/MB/GB/TB）</div>
              </div>
              <div class="da-field">
                <label>最大加速文件大小</label>
                <input type="text" id="da-max-size" value="${formatSize(DEFAULT_CONFIG.maxFileSize).replace(' ', '')}" placeholder="例如: 5GB" />
                <div class="da-hint">超过此大小的文件不启用加速</div>
              </div>
              <div class="da-field">
                <label>每个分片大小</label>
                <input type="text" id="da-chunk-size" value="${formatSize(DEFAULT_CONFIG.chunkSize).replace(' ', '')}" placeholder="例如: 512KB" />
                <div class="da-hint">每个线程下载的分片大小，影响线程数分配</div>
              </div>
            </div>
          </div>
        </div>
        <div class="da-footer">
          <button class="da-btn da-btn-cancel" id="da-cancel-btn">取消</button>
          <button class="da-btn da-btn-accel" id="da-accel-btn">🚀 确定加速</button>
        </div>
        <div class="da-shortcut-hint">
          <kbd>Ctrl+B</kbd> 打开面板 &nbsp; <kbd>Ctrl+M</kbd> 快速默认加速
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    modalEl = overlay;

    overlay.querySelector('#da-close-btn').addEventListener('click', closeModal);
    overlay.querySelector('#da-cancel-btn').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    overlay.querySelectorAll('.da-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        overlay.querySelectorAll('.da-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const isDefault = tab.dataset.tab === 'default';
        document.getElementById('da-default-panel').style.display = isDefault ? 'block' : 'none';
        document.getElementById('da-custom-panel').style.display = isDefault ? 'none' : 'flex';
      });
    });

    overlay.querySelector('#da-accel-btn').addEventListener('click', () => {
      const url = document.getElementById('da-url-input').value.trim();
      if (!url) {
        showToast('请输入下载链接', 'warn');
        return;
      }
      const isDefault = getActiveTab() === 'default';
      const config = isDefault ? { ...DEFAULT_CONFIG } : getCustomConfig();
      if (!isDefault && !validateCustomConfig(config)) return;
      accelerateDownload(url, config);
    });

    const urlInput = document.getElementById('da-url-input');
    urlInput.focus();
    urlInput.value = currentDownload || '';
  }

  function closeModal() {
    if (modalEl) {
      modalEl.remove();
      modalEl = null;
    }
  }

  function interceptDownloads() {
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href]');
      if (!link) return;
      const href = link.getAttribute('href');
      if (!href) return;

      const isDownloadable = link.hasAttribute('download') ||
        /\.(zip|rar|7z|tar|gz|bz2|xz|iso|dmg|exe|msi|deb|rpm|apk|pdf|mp4|mkv|avi|mov|mp3|flac|wav|ogg|doc|docx|xls|xlsx|ppt|pptx|img|bin|dat)$/i.test(href);

      if (isDownloadable) {
        try {
          const absoluteUrl = new URL(href, window.location.href).href;
          currentDownload = absoluteUrl;
        } catch {
          currentDownload = href;
        }
      }
    }, true);
  }

  function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        e.stopPropagation();
        if (modalEl) {
          closeModal();
        } else {
          createStyles();
          createModal();
        }
      }

      if (e.ctrlKey && e.key === 'm') {
        e.preventDefault();
        e.stopPropagation();
        const url = currentDownload || (modalEl && document.getElementById('da-url-input')?.value.trim());
        if (!url) {
          showToast('未检测到下载链接，请先点击下载按钮或手动输入', 'warn');
          return;
        }
        closeModal();
        createStyles();
        accelerateDownload(url, { ...DEFAULT_CONFIG });
      }
    }, true);
  }

  function init() {
    interceptDownloads();
    initKeyboardShortcuts();
    console.log('[DownloadAccelerator] 脚本已加载 | Ctrl+B 打开面板 | Ctrl+M 快速默认加速');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();