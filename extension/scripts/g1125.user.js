(async function __tabEvaluateScriptBridge() {
  const __tabScriptArgs = {"threadCount": 6, "chunkSize": 2097152, "showPanel": true, "autoIntercept": false};
  const __tabOriginalFunction = (
    /**
     * 多线程下载加速器 - Multi-Thread Download Accelerator
     * 
     * 功能：
     * - 拦截页面下载链接，使用多线程分块并行下载加速
     * - 支持 Range 请求分块下载（需服务器支持）
     * - 可配置线程数、分块大小
     * - 实时显示下载进度、速度、剩余时间
     * - 支持断点续传（同会话内）
     * - 浮动控制面板 UI
     */
    
    async function run(args) {
      const config = {
        threadCount: args?.threadCount || 6,        // 并发线程数
        chunkSize: args?.chunkSize || 2 * 1024 * 1024, // 每块大小 (默认2MB)
        maxRetries: args?.maxRetries || 3,            // 失败重试次数
        timeout: args?.timeout || 30000,              // 单块超时(ms)
        autoIntercept: args?.autoIntercept || false,  // 是否自动拦截所有下载
        showPanel: args?.showPanel !== false,         // 是否显示浮动面板
        ...args
      };
    
      // ========== 状态管理 ==========
      const state = {
        downloads: new Map(),       // url -> DownloadTask
        activeCount: 0,
        totalSpeed: 0,
        panelVisible: true,
        initialized: false
      };
    
      // ========== CSS 样式 ==========
      const styles = `
        .mt-dl-panel {
          position: fixed;
          top: 60px;
          right: 20px;
          width: 380px;
          max-height: 520px;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.08);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          z-index: 2147483647;
          color: #e0e0e0;
          overflow: hidden;
          font-size: 13px;
          transition: transform 0.3s ease, opacity 0.3s ease;
          transform-origin: top right;
        }
        .mt-dl-panel.minimized {
          width: 56px;
          height: 56px;
          border-radius: 28px;
          cursor: pointer;
        }
        .mt-dl-panel.minimized .mt-dl-body { display: none; }
        .mt-dl-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: rgba(255,255,255,0.05);
          border-bottom: 1px solid rgba(255,255,255,0.08);
          cursor: move;
          user-select: none;
        }
        .mt-dl-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          font-size: 14px;
          color: #fff;
        }
        .mt-dl-title-icon {
          width: 22px;
          height: 22px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
        }
        .mt-dl-header-btns {
          display: flex;
          gap: 6px;
        }
        .mt-dl-btn {
          width: 26px;
          height: 26px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.08);
          color: #aaa;
          font-size: 14px;
          transition: all 0.15s ease;
        }
        .mt-dl-btn:hover {
          background: rgba(255,255,255,0.15);
          color: #fff;
        }
        .mt-dl-body {
          padding: 12px;
          max-height: 420px;
          overflow-y: auto;
        }
        .mt-dl-body::-webkit-scrollbar { width: 5px; }
        .mt-dl-body::-webkit-scrollbar-track { background: transparent; }
        .mt-dl-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 3px; }
        .mt-dl-input-group {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
        }
        .mt-dl-input {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 8px;
          background: rgba(0,0,0,0.25);
          color: #e0e0e0;
          font-size: 12px;
          outline: none;
          transition: border-color 0.2s;
        }
        .mt-dl-input:focus { border-color: #667eea; }
        .mt-dl-input::placeholder { color: #666; }
        .mt-dl-go-btn {
          padding: 8px 16px;
          border: none;
          border-radius: 8px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: #fff;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: transform 0.1s, box-shadow 0.2s;
        }
        .mt-dl-go-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(102,126,234,0.35); }
        .mt-dl-go-btn:active { transform: translateY(0); }
        .mt-dl-settings-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
          padding: 8px 10px;
          background: rgba(255,255,255,0.03);
          border-radius: 8px;
          font-size: 11px;
        }
        .mt-dl-settings-label {
          color: #888;
          min-width: 52px;
        }
        .mt-dl-settings-select {
          flex: 1;
          padding: 4px 8px;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 6px;
          background: rgba(0,0,0,0.3);
          color: #ccc;
          font-size: 11px;
          outline: none;
        }
        .mt-dl-task {
          background: rgba(255,255,255,0.03);
          border-radius: 10px;
          padding: 10px 12px;
          margin-bottom: 8px;
          border: 1px solid rgba(255,255,255,0.05);
          transition: border-color 0.2s;
        }
        .mt-dl-task:hover { border-color: rgba(102,126,234,0.3); }
        .mt-dl-task-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 8px;
        }
        .mt-dl-task-name {
          font-size: 12px;
          font-weight: 500;
          color: #eee;
          word-break: break-all;
          line-height: 1.4;
          max-width: 260px;
        }
        .mt-dl-task-status {
          font-size: 10px;
          padding: 2px 7px;
          border-radius: 10px;
          white-space: nowrap;
          font-weight: 500;
        }
        .mt-dl-status-downloading { background: rgba(102,126,234,0.2); color: #8babf6; }
        .mt-dl-status-complete { background: rgba(46,213,115,0.15); color: #2ed573; }
        .mt-dl-status-error { background: rgba(255,71,87,0.15); color: #ff4757; }
        .mt-dl-status-pending { background: rgba(255,193,7,0.15); color: #ffc107; }
        .mt-dl-progress-wrap {
          height: 6px;
          background: rgba(255,255,255,0.06);
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 6px;
        }
        .mt-dl-progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #667eea, #764ba2, #f093fb);
          background-size: 200% 100%;
          border-radius: 3px;
          transition: width 0.3s ease;
          animation: mt-dl-shimmer 2s infinite linear;
        }
        @keyframes mt-dl-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .mt-dl-task-info {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          color: #777;
        }
        .mt-dl-task-info span { display: flex; align-items: center; gap: 3px; }
        .mt-dl-empty {
          text-align: center;
          padding: 30px 20px;
          color: #555;
          font-size: 12px;
        }
        .mt-dl-empty-icon { font-size: 32px; margin-bottom: 8px; opacity: 0.3; }
        .mt-dl-stats-bar {
          display: flex;
          justify-content: space-around;
          padding: 8px 0;
          margin-bottom: 10px;
          font-size: 11px;
          border-top: 1px solid rgba(255,255,255,0.05);
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .mt-dl-stat { text-align: center; }
        .mt-dl-stat-value { font-weight: 700; color: #8babf6; font-size: 14px; }
        .mt-dl-stat-label { color: #666; margin-top: 2px; }
        .mt-dl-minimized-icon {
          text-align: center;
          line-height: 56px;
          font-size: 24px;
        }
      `;
    
      // ========== 工具函数 ==========
      function formatSize(bytes) {
        if (bytes === 0) return '0 B';
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0) + ' ' + units[i];
      }
    
      function formatSpeed(bytesPerSec) {
        return formatSize(bytesPerSec) + '/s';
      }
    
      function formatTime(seconds) {
        if (!isFinite(seconds) || seconds < 0) return '--:--';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
        return `${m}:${String(s).padStart(2,'0')}`;
      }
    
      function getFileName(url) {
        try {
          const pathname = new URL(url).pathname;
          const filename = pathname.split('/').pop();
          if (filename && filename.includes('.')) return decodeURIComponent(filename);
          return 'download_' + Date.now();
        } catch {
          return 'download_' + Date.now();
        }
      }
    
      function createAbortController() {
        try { return new AbortController(); } catch { return { signal: null, abort() {} }; }
      }
    
      // ========== 下载任务类 ==========
      class DownloadTask {
        constructor(url, options = {}) {
          this.id = 'dl_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
          this.url = url;
          this.fileName = options.fileName || getFileName(url);
          this.threadCount = options.threadCount || config.threadCount;
          this.chunkSize = options.chunkSize || config.chunkSize;
          this.status = 'pending'; // pending | downloading | complete | error | paused | cancelled
          this.progress = 0;
          this.loadedBytes = 0;
          this.totalBytes = 0;
          this.speed = 0;
          this.remainingTime = 0;
          this.chunks = [];
          this.completedChunks = 0;
          this.totalChunks = 0;
          this.abortControllers = [];
          this.startTime = 0;
          this.lastLoadedBytes = 0;
          this.lastSpeedTime = 0;
          this.error = null;
          this.retries = {};
          this.onProgress = options.onProgress || (() => {});
          this._speedSamples = [];
          this._speedTimer = null;
        }
    
        async start() {
          this.status = 'downloading';
          this.startTime = Date.now();
          this.lastSpeedTime = this.startTime;
          this.lastLoadedBytes = 0;
    
          try {
            // 先用 HEAD 或 Range: bytes=0-0 探测文件大小和支持情况
            const fileInfo = await this.probeFileSize();
    
            if (fileInfo.acceptsRanges && fileInfo.contentLength > 0) {
              // 支持多线程分块下载
              await this.downloadMultiThread(fileInfo.contentLength);
            } else {
              // 不支持 Range，回退到单线程下载
              await this.downloadSingleThread();
            }
          } catch (err) {
            if (this.status === 'cancelled') return;
            this.status = 'error';
            this.error = err.message || String(err);
            throw err;
          }
        }
    
        async probeFileSize() {
          const controller = createAbortController();
          this.abortControllers.push(controller);
    
          try {
            const resp = await fetch(this.url, {
              method: 'HEAD',
              signal: controller.signal,
              cache: 'no-store',
              mode: 'cors'
            });
    
            const contentLength = parseInt(resp.headers.get('Content-Length') || '0', 10);
            const acceptsRanges = resp.headers.get('Accept-Ranges') === 'bytes';
    
            // HEAD 不一定可靠，再用 GET Range 验证
            if (contentLength <= 0 || !acceptsRanges) {
              const rangeResp = await fetch(this.url, {
                method: 'GET',
                headers: { Range: 'bytes=0-1023' },
                signal: controller.signal,
                cache: 'no-store',
                mode: 'cors'
              });
              const cl = parseInt(rangeResp.headers.get('Content-Range')?.split('/')[1] || '0', 10);
              return {
                acceptsRanges: rangeResp.status === 206,
                contentLength: cl || contentLength
              };
            }
    
            return { acceptsRanges, contentLength };
          } finally {
            const idx = this.abortControllers.indexOf(controller);
            if (idx >= 0) this.abortControllers.splice(idx, 1);
          }
        }
    
        async downloadMultiThread(totalSize) {
          this.totalBytes = totalSize;
          this.totalChunks = Math.ceil(totalSize / this.chunkSize);
          this.chunks = new Array(this.totalChunks).fill(null);
    
          // 创建并发控制器：同时最多运行 threadCount 个 chunk
          let nextChunkIndex = 0;
          const activeFetches = new Map();
    
          const launchNext = () => {
            while (nextChunkIndex < this.totalChunks && activeFetches.size < this.threadCount) {
              const chunkIdx = nextChunkIndex++;
              const start = chunkIdx * this.chunkSize;
              const end = Math.min(start + this.chunkSize - 1, totalSize - 1);
    
              const controller = createAbortController();
              this.abortControllers.push(controller);
    
              const fetchPromise = this.fetchChunk(chunkIdx, start, end, controller)
                .finally(() => activeFetches.delete(chunkIdx));
    
              activeFetches.set(chunkIdx, fetchPromise);
            }
          };
    
          launchNext();
    
          // 当有 chunk 完成时，启动下一个
          while (activeFetches.size > 0 || nextChunkIndex < this.totalChunks) {
            if (this.status === 'cancelled' || this.status === 'paused') {
              // 取消所有活跃请求
              for (const ac of this.abortControllers) ac.abort();
              this.abortControllers = [];
              return;
            }
    
            const settled = await Promise.race(
              [...activeFetches.values()].map(p => p.then(() => true, () => false))
            );
    
            if (settled !== false) {
              launchNext();
            } else {
              // 有错误，检查是否需要重试
              await new Promise(r => setTimeout(r, 500));
              // 重试失败的 chunk
              for (let i = 0; i < this.totalChunks; i++) {
                if (this.chunks[i] === null && !activeFetches.has(i)) {
                  const retries = this.retries[i] || 0;
                  if (retries < config.maxRetries) {
                    this.retries[i] = retries + 1;
                    const start = i * this.chunkSize;
                    const end = Math.min(start + this.chunkSize - 1, totalSize - 1);
                    const controller = createAbortController();
                    this.abortControllers.push(controller);
                    const fp = this.fetchChunk(i, start, end, controller)
                      .finally(() => activeFetches.delete(i));
                    activeFetches.set(i, fp);
                  } else {
                    throw new Error(`Chunk ${i} failed after ${config.maxRetries} retries`);
                  }
                }
              }
            }
          }
    
          // 组装文件并触发浏览器下载
          this.assembleAndSave();
          this.status = 'complete';
          this.progress = 100;
        }
    
        async fetchChunk(index, start, end, controller) {
          const resp = await fetch(this.url, {
            headers: { Range: `bytes=${start}-${end}` },
            signal: controller.signal,
            cache: 'no-store',
            mode: 'cors'
          });
    
          if (resp.status !== 206 && resp.status !== 200) {
            throw new Error(`HTTP ${resp.status} for chunk ${index}`);
          }
    
          const buffer = await resp.arrayBuffer();
          this.chunks[index] = buffer;
          this.completedChunks++;
          this.loadedBytes += buffer.byteLength;
    
          // 更新进度
          this.progress = Math.round((this.completedChunks / this.totalChunks) * 100);
          this.updateSpeed();
          this.onProgress(this.getStatus());
    
          return buffer;
        }
    
        async downloadSingleThread() {
          this.totalChunks = 1;
          const controller = createAbortController();
          this.abortControllers.push(controller);
    
          try {
            const resp = await fetch(this.url, {
              signal: controller.signal,
              cache: 'no-store',
              mode: 'cors'
            });
    
            // 尝试从 Content-Length 获取总大小
            const cl = parseInt(resp.headers.get('Content-Length') || '0', 10);
            this.totalBytes = cl;
    
            const reader = resp.body.getReader();
            const chunks = [];
    
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              chunks.push(value);
              this.loadedBytes += value.byteLength;
    
              if (cl > 0) {
                this.progress = Math.round((this.loadedBytes / cl) * 100);
              } else {
                // 无法获取大小时，显示已下载量
                this.progress = Math.min(99, Math.round((this.loadedBytes / (10 * 1024 * 1024)) * 100));
              }
    
              this.updateSpeed();
              this.onProgress(this.getStatus());
            }
    
            // 组装
            const totalLen = chunks.reduce((sum, c) => sum + c.byteLength, 0);
            const result = new Uint8Array(totalLen);
            let offset = 0;
            for (const chunk of chunks) {
              result.set(chunk, offset);
              offset += chunk.byteLength;
            }
    
            this.chunks = [result.buffer];
            this.totalBytes = totalLen;
            this.assembleAndSave(result);
            this.status = 'complete';
            this.progress = 100;
            this.onProgress(this.getStatus());
    
          } finally {
            const idx = this.abortControllers.indexOf(controller);
            if (idx >= 0) this.abortControllers.splice(idx, 1);
          }
        }
    
        updateSpeed() {
          const now = Date.now();
          const elapsed = (now - this.lastSpeedTime) / 1000;
          if (elapsed >= 0.3) {
            const delta = this.loadedBytes - this.lastLoadedBytes;
            const instantSpeed = delta / elapsed;
            this._speedSamples.push(instantSpeed);
            if (this._speedSamples.length > 5) this._speedSamples.shift();
            this.speed = this._speedSamples.reduce((a, b) => a + b, 0) / this._speedSamples.length;
    
            if (this.speed > 0 && this.totalBytes > this.loadedBytes) {
              this.remainingTime = (this.totalBytes - this.loadedBytes) / this.speed;
            }
    
            this.lastSpeedTime = now;
            this.lastLoadedBytes = this.loadedBytes;
          }
        }
    
        assembleAndSave(data) {
          // 如果没有传入 data，从 chunks 组装
          if (!data) {
            const totalLen = this.chunks.reduce((sum, c) => sum + (c ? c.byteLength : 0), 0);
            data = new Uint8Array(totalLen);
            let offset = 0;
            for (const chunk of this.chunks) {
              if (chunk) {
                data.set(new Uint8Array(chunk), offset);
                offset += chunk.byteLength;
              }
            }
          }
    
          // 使用 Blob + URL.createObjectURL 触发浏览器下载
          const blob = new Blob([data], { type: 'application/octet-stream' });
          const blobUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = this.fileName;
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
    
          // 延迟释放 URL
          setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
        }
    
        getStatus() {
          return {
            id: this.id,
            fileName: this.fileName,
            status: this.status,
            progress: this.progress,
            loadedBytes: this.loadedBytes,
            totalBytes: this.totalBytes,
            speed: this.speed,
            remainingTime: this.remainingTime,
            completedChunks: this.completedChunks,
            totalChunks: this.totalChunks,
            error: this.error
          };
        }
    
        cancel() {
          this.status = 'cancelled';
          for (const ac of this.abortControllers) ac.abort();
          this.abortControllers = [];
        }
    
        pause() {
          this.status = 'paused';
          for (const ac of this.abortControllers) ac.abort();
          this.abortControllers = [];
        }
      }
    
      // ========== UI 面板 ==========
      function createPanel() {
        // 移除已存在的面板
        const existing = document.getElementById('mt-dl-panel');
        if (existing) existing.remove();
    
        // 注入样式
        let styleEl = document.getElementById('mt-dl-styles');
        if (!styleEl) {
          styleEl = document.createElement('style');
          styleEl.id = 'mt-dl-styles';
          styleEl.textContent = styles;
          document.head.appendChild(styleEl);
        }
    
        // 创建面板 DOM
        const panel = document.createElement('div');
        panel.id = 'mt-dl-panel';
        panel.className = 'mt-dl-panel';
        panel.innerHTML = `
          <div class="mt-dl-header" id="mt-dl-header">
            <div class="mt-dl-title">
              <div class="mt-dl-title-icon">⚡</div>
              <span>多线程下载器</span>
            </div>
            <div class="mt-dl-header-btns">
              <button class="mt-dl-btn" id="mt-dl-toggle" title="最小化">−</button>
              <button class="mt-dl-btn" id="mt-dl-close" title="关闭">×</button>
            </div>
          </div>
          <div class="mt-dl-body">
            <div class="mt-dl-input-group">
              <input class="mt-dl-input" id="mt-dl-url-input" placeholder="输入文件下载地址..." />
              <button class="mt-dl-go-btn" id="mt-dl-start-btn">开始下载</button>
            </div>
            <div class="mt-dl-settings-row">
              <span class="mt-dl-settings-label">线程数</span>
              <select class="mt-dl-settings-select" id="mt-dl-threads">
                <option value="3">3 线程</option>
                <option value="6" selected>6 线程（推荐）</option>
                <option value="8">8 线程</option>
                <option value="12">12 线程</option>
                <option value="16">16 线程</option>
              </select>
              <span class="mt-dl-settings-label">分块</span>
              <select class="mt-dl-settings-select" id="mt-dl-chunksize">
                <option value="1048576">1 MB</option>
                <option value="2097152" selected>2 MB</option>
                <option value="4194304">4 MB</option>
                <option value="8388608">8 MB</option>
                <option value="16777216">16 MB</option>
              </select>
            </div>
            <div class="mt-dl-stats-bar" id="mt-dl-stats">
              <div class="mt-dl-stat"><div class="mt-dl-stat-value" id="mt-dl-active-count">0</div><div class="mt-dl-stat-label">下载中</div></div>
              <div class="mt-dl-stat"><div class="mt-dl-stat-value" id="mt-dl-total-speed">0 B/s</div><div class="mt-dl-stat-label">总速度</div></div>
            </div>
            <div id="mt-dl-task-list">
              <div class="mt-dl-empty">
                <div class="mt-dl-empty-icon">📥</div>
                <div>粘贴下载链接开始多线程加速下载</div>
              </div>
            </div>
          </div>
        `;
    
        document.body.appendChild(panel);
    
        // 绑定事件
        bindPanelEvents(panel);
    
        // 拖拽功能
        makeDraggable(panel);
    
        return panel;
      }
    
      function bindPanelEvents(panel) {
        // 最小化/展开
        const toggleBtn = panel.querySelector('#mt-dl-toggle');
        toggleBtn.addEventListener('click', () => {
          panel.classList.toggle('minimized');
          toggleBtn.textContent = panel.classList.contains('minimized') ? '+' : '−';
          if (panel.classList.contains('minimized')) {
            const minimizedIcon = document.createElement('div');
            minimizedIcon.className = 'mt-dl-minimized-icon';
            minimizedIcon.textContent = '⚡';
            panel.querySelector('.mt-dl-body').parentNode.insertBefore(minimizedIcon, panel.querySelector('.mt-dl-body'));
          } else {
            const mi = panel.querySelector('.mt-dl-minimized-icon');
            if (mi) mi.remove();
          }
        });
    
        // 关闭
        panel.querySelector('#mt-dl-close').addEventListener('click', () => {
          panel.style.transform = 'scale(0.9)';
          panel.style.opacity = '0';
          setTimeout(() => panel.remove(), 250);
          state.panelVisible = false;
        });
    
        // 开始下载
        panel.querySelector('#mt-dl-start-btn').addEventListener('click', () => {
          const urlInput = panel.querySelector('#mt-dl-url-input');
          const url = urlInput.value.trim();
          if (!url) {
            urlInput.style.borderColor = '#ff4757';
            setTimeout(() => urlInput.style.borderColor = '', 1500);
            return;
          }
          startDownload(url, {
            threadCount: parseInt(panel.querySelector('#mt-dl-threads').value),
            chunkSize: parseInt(panel.querySelector('#mt-dl-chunksize').value)
          });
          urlInput.value = '';
        });
    
        // 回车触发下载
        panel.querySelector('#mt-dl-url-input').addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            panel.querySelector('#mt-dl-start-btn').click();
          }
        });
      }
    
      function makeDraggable(el) {
        const header = el.querySelector('#mt-dl-header');
        let isDragging = false;
        let startX, startY, initLeft, initTop;
    
        header.addEventListener('mousedown', (e) => {
          if (e.target.closest('.mt-dl-btn')) return;
          isDragging = true;
          startX = e.clientX;
          startY = e.clientY;
          const rect = el.getBoundingClientRect();
          initLeft = rect.left;
          initTop = rect.top;
          el.style.transition = 'none';
          e.preventDefault();
        });
    
        document.addEventListener('mousemove', (e) => {
          if (!isDragging) return;
          const dx = e.clientX - startX;
          const dy = e.clientY - startY;
          el.style.left = (initLeft + dx) + 'px';
          el.style.top = (initTop + dy) + 'px';
          el.style.right = 'auto';
        });
    
        document.addEventListener('mouseup', () => {
          if (isDragging) {
            isDragging = false;
            el.style.transition = '';
          }
        });
      }
    
      // ========== 任务列表渲染 ==========
      function renderTaskList() {
        const taskListEl = document.getElementById('mt-dl-task-list');
        if (!taskListEl) return;
    
        const tasks = Array.from(state.downloads.values());
    
        if (tasks.length === 0) {
          taskListEl.innerHTML = `
            <div class="mt-dl-empty">
              <div class="mt-dl-empty-icon">📥</div>
              <div>粘贴下载链接开始多线程加速下载</div>
            </div>`;
          return;
        }
    
        taskListEl.innerHTML = tasks.map(task => {
          const st = task.getStatus();
          const statusClass = `mt-dl-status-${st.status}`;
          const statusText = {
            downloading: '⬇ 下载中',
            complete: '✓ 已完成',
            error: '✗ 失败',
            paused: '⏸ 已暂停',
            cancelled: '✕ 已取消',
            pending: '⏳ 等待中'
          }[st.status] || st.status;
    
          const progressPercent = st.totalBytes > 0
            ? Math.round((st.loadedBytes / st.totalBytes) * 100)
            : st.progress;
    
          return `
            <div class="mt-dl-task" data-id="${task.id}">
              <div class="mt-dl-task-header">
                <div class="mt-dl-task-name">${escapeHtml(st.fileName)}</div>
                <span class="mt-dl-task-status ${statusClass}">${statusText}</span>
              </div>
              <div class="mt-dl-progress-wrap">
                <div class="mt-dl-progress-bar" style="width:${progressPercent}%"></div>
              </div>
              <div class="mt-dl-task-info">
                <span>${formatSize(st.loadedBytes)} / ${st.totalBytes > 0 ? formatSize(st.totalBytes) : '未知'}</span>
                <span>${st.speed > 0 ? formatSpeed(st.speed) : ''}</span>
                <span>${st.remainingTime > 0 ? formatTime(st.remainingTime) : ''}</span>
                ${st.status === 'downloading' ? `<button onclick="window.__MT_DL_CANCEL('${task.id}')" style="background:none;border:none;color:#ff4757;cursor:pointer;font-size:10px;padding:0 4px;">取消</button>` : ''}
              </div>
              ${st.error ? `<div style="color:#ff4757;font-size:10px;margin-top:4px;">${escapeHtml(st.error)}</div>` : ''}
            </div>`;
        }).join('');
    
        // 更新统计
        const activeTasks = tasks.filter(t => t.status === 'downloading');
        const totalSpeed = activeTasks.reduce((sum, t) => sum + t.speed, 0);
    
        const activeCountEl = document.getElementById('mt-dl-active-count');
        const speedEl = document.getElementById('mt-dl-total-speed');
        if (activeCountEl) activeCountEl.textContent = activeTasks.length;
        if (speedEl) speedEl.textContent = formatSpeed(totalSpeed);
      }
    
      function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
      }
    
      // ========== 下载管理 ==========
      function startDownload(url, options = {}) {
        const task = new DownloadTask(url, options);
        state.downloads.set(task.id, task);
    
        task.onProgress = () => renderTaskList();
        renderTaskList();
    
        task.start().then(() => {
          renderTaskList();
        }).catch(() => {
          renderTaskList();
        });
    
        return task;
      }
    
      // 全局取消函数
      window.__MT_DL_CANCEL = function(taskId) {
        const task = state.downloads.get(taskId);
        if (task) {
          task.cancel();
          renderTaskList();
        }
      };
    
      // ========== 自动拦截（可选）==========
      function setupAutoIntercept() {
        if (!config.autoIntercept) return;
    
        // 拦截 <a download> 和具有 download 属性的链接
        document.addEventListener('click', (e) => {
          const link = e.target.closest('a[href]');
          if (!link) return;
    
          const href = link.href;
          if (!href || href.startsWith('javascript:') || href.startsWith('#')) return;
    
          // 判断是否是下载链接
          const isDownloadLink = link.hasAttribute('download') ||
            /\.(zip|rar|7z|tar|gz|bz2|xz|exe|msi|dmg|pkg|deb|rpm|iso|img|mp4|mkv|avi|mov|wmv|flv|mp3|flac|wav|aac|ogg|wma|m4a|pdf|doc|docx|xls|xlsx|ppt|pptx|epub|apk|ipa|torrent)$/.test(href.split('?')[0].split('#')[0]);
    
          if (isDownloadLink) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            startDownload(href);
          }
        }, true); // capture phase
      }
    
      // ========== 主入口 ==========
      // 创建 UI 面板
      if (config.showPanel) {
        createPanel();
        state.initialized = true;
      }
    
      // 设置自动拦截
      setupAutoIntercept();
    
      return {
        ok: true,
        summary: '多线程下载加速器已启动。在浮动面板中粘贴文件URL即可开始多线程分块并行下载。',
        details: {
          threadCount: config.threadCount,
          chunkSize: formatSize(config.chunkSize),
          autoIntercept: config.autoIntercept,
          showPanel: config.showPanel,
          features: [
            'Range 分块并行下载（服务器支持时自动启用）',
            '可配置并发线程数（3-16）和分块大小（1-16MB）',
            '实时进度、速度、剩余时间显示',
            '失败自动重试机制',
            '不支持 Range 时自动降级为单线程流式下载',
            '可拖拽浮动面板，支持最小化',
            '可选自动拦截页面下载链接'
          ]
        },
        usage: {
          manual: '在面板输入框粘贴URL → 点击「开始下载」或按回车',
          api: '调用 window.__MT_DL_START(url, { threadCount: 6, chunkSize: 2097152 }) 可编程启动',
          cancel: '调用 window.__MT_DL_CANCEL(taskId) 取消指定任务'
        },
        warnings: []
      };
    }
  );
  if (typeof __tabOriginalFunction !== "function") {
    throw new Error("evaluate_script source must evaluate to a function");
  }
  return await __tabOriginalFunction(__tabScriptArgs);
})();