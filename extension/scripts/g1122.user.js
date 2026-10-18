(async function __tabEvaluateScriptBridge() {
  const __tabScriptArgs = null;
  const __tabOriginalFunction = (
    async function run(args) {
      // 网页录屏工具 - 增强版
      class WebPageRecorder {
        constructor() {
          this.recorder = null;
          this.chunks = [];
          this.isRecording = false;
          this.isPaused = false;
          this.stream = null;
          this.startTime = 0;
          this.elapsedTime = 0;
          this.pausedDuration = 0;
          this.pauseStart = 0;
          this.timerInterval = null;
        }
    
        async requestPermission(quality) {
          try {
            const qualityMap = {
              high: { width: 1920, height: 1080, frameRate: 60 },
              medium: { width: 1280, height: 720, frameRate: 30 },
              low: { width: 854, height: 480, frameRate: 15 }
            };
            const q = qualityMap[quality] || qualityMap.medium;
    
            const stream = await navigator.mediaDevices.getDisplayMedia({
              video: {
                cursor: "always",
                ...q
              },
              audio: false
            });
    
            // 监听用户停止共享
            stream.getVideoTracks()[0].addEventListener('ended', () => {
              if (this.isRecording) {
                this.stopRecording();
              }
            });
    
            return stream;
          } catch (error) {
            console.error('权限请求失败:', error);
            return null;
          }
        }
    
        async startRecording(quality) {
          if (this.isRecording) return false;
    
          const stream = await this.requestPermission(quality);
          if (!stream) {
            return false;
          }
    
          this.stream = stream;
    
          // 检测支持的 MIME 类型
          const mimeType = this.getSupportedMimeType();
          this.recorder = new MediaRecorder(stream, {
            mimeType: mimeType,
            videoBitsPerSecond: quality === 'high' ? 8000000 : quality === 'medium' ? 2500000 : 1000000
          });
          this.chunks = [];
    
          this.recorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
              this.chunks.push(event.data);
            }
          };
    
          this.recorder.onstop = () => {
            this.saveRecording();
            this.cleanup();
          };
    
          this.recorder.start(1000);
          this.isRecording = true;
          this.isPaused = false;
          this.startTime = Date.now();
          this.elapsedTime = 0;
          this.pausedDuration = 0;
          this.startTimer();
    
          return true;
        }
    
        getSupportedMimeType() {
          const types = [
            'video/webm;codecs=vp9',
            'video/webm;codecs=vp8',
            'video/webm',
            'video/mp4'
          ];
          for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
              return type;
            }
          }
          return 'video/webm';
        }
    
        pauseRecording() {
          if (this.recorder && this.isRecording && !this.isPaused) {
            this.recorder.pause();
            this.isPaused = true;
            this.pauseStart = Date.now();
            this.stopTimer();
            return true;
          }
          return false;
        }
    
        resumeRecording() {
          if (this.recorder && this.isRecording && this.isPaused) {
            this.recorder.resume();
            this.isPaused = false;
            this.pausedDuration += Date.now() - this.pauseStart;
            this.startTimer();
            return true;
          }
          return false;
        }
    
        stopRecording() {
          if (this.recorder && this.isRecording) {
            this.stopTimer();
            // 如果处于暂停状态，先恢复再停止
            if (this.isPaused) {
              this.recorder.resume();
              this.pausedDuration += Date.now() - this.pauseStart;
            }
            this.recorder.stop();
            this.isRecording = false;
            this.isPaused = false;
          }
        }
    
        startTimer() {
          this.timerInterval = setInterval(() => {
            this.elapsedTime = Date.now() - this.startTime - this.pausedDuration;
            if (this.onTick) this.onTick(this.elapsedTime);
          }, 100);
        }
    
        stopTimer() {
          if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
          }
        }
    
        cleanup() {
          if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
          }
        }
    
        saveRecording() {
          if (this.chunks.length === 0) {
            console.warn('没有录制数据');
            return;
          }
          const blob = new Blob(this.chunks, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
    
          const a = document.createElement('a');
          a.href = url;
          a.download = `recording_${new Date().toISOString().replace(/[:.]/g, '-')}.webm`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
    
        formatTime(ms) {
          const totalSeconds = Math.floor(ms / 1000);
          const hours = Math.floor(totalSeconds / 3600);
          const minutes = Math.floor((totalSeconds % 3600) / 60);
          const seconds = totalSeconds % 60;
          const centisecs = Math.floor((ms % 1000) / 10);
    
          if (hours > 0) {
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centisecs.toString().padStart(2, '0')}`;
          }
          return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centisecs.toString().padStart(2, '0')}`;
        }
      }
    
      function createRecorderUI() {
        const recorder = new WebPageRecorder();
    
        // ===== 主容器 =====
        const container = document.createElement('div');
        container.id = 'Yuze-recorder-panel';
        container.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border: 1px solid rgba(0, 123, 255, 0.3);
          border-radius: 12px;
          padding: 16px;
          z-index: 999999;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255,255,255,0.05) inset;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          min-width: 260px;
          user-select: none;
          transition: all 0.3s ease;
        `;
    
        // ===== 标题栏（可拖拽）=====
        const header = document.createElement('div');
        header.style.cssText = `
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
          cursor: move;
          padding-bottom: 10px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        `;
    
        const title = document.createElement('span');
        title.textContent = '🎬 Yuze 录屏';
        title.style.cssText = `
          font-size: 14px;
          font-weight: 600;
          color: #e0e6ed;
          letter-spacing: 0.5px;
        `;
    
        const headerBtns = document.createElement('div');
        headerBtns.style.display = 'flex';
        gap = '6px';
    
        // 折叠按钮
        const collapseBtn = document.createElement('button');
        collapseBtn.textContent = '−';
        collapseBtn.title = '折叠/展开';
        collapseBtn.style.cssText = makeHeaderBtnStyle();
        let isCollapsed = false;
    
        // 关闭按钮
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.title = '关闭';
        closeBtn.style.cssText = makeHeaderBtnStyle('#ff6b6b');
    
        headerBtns.appendChild(collapseBtn);
        headerBtns.appendChild(closeBtn);
        header.appendChild(title);
        header.appendChild(headerBtns);
    
        // ===== 内容区域 =====
        const body = document.createElement('div');
        body.id = 'Yuze-recorder-body';
    
        // 计时器显示
        const timerDisplay = document.createElement('div');
        timerDisplay.id = 'Yuze-timer';
        timerDisplay.textContent = '00:00.00';
        timerDisplay.style.cssText = `
          text-align: center;
          font-size: 28px;
          font-weight: 700;
          font-family: "SF Mono", "Consolas", monospace;
          color: #4ade80;
          margin: 12px 0;
          text-shadow: 0 0 20px rgba(74, 222, 128, 0.3);
          transition: color 0.3s, text-shadow 0.3s;
          letter-spacing: 2px;
        `;
    
        recorder.onTick = (ms) => {
          timerDisplay.textContent = recorder.formatTime(ms);
        };
    
        // 状态指示器
        const statusIndicator = document.createElement('div');
        statusIndicator.style.cssText = `
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-bottom: 12px;
          font-size: 13px;
          color: #8892a0;
        `;
        const dot = document.createElement('span');
        dot.style.cssText = `
          width: 8px; height: 8px; border-radius: 50%;
          background: #4ade80; transition: background 0.3s;
          box-shadow: 0 0 6px rgba(74,222,128,0.4);
        `;
        const statusText = document.createElement('span');
        statusText.textContent = '准备就绪';
        statusIndicator.appendChild(dot);
        statusIndicator.appendChild(statusText);
    
        // 画质选择
        const qualityRow = document.createElement('div');
        qualityRow.style.cssText = `
          display: flex;
          gap: 6px;
          margin-bottom: 12px;
        `;
        const qualities = [
          { key: 'low', label: '流畅' },
          { key: 'medium', label: '标清' },
          { key: 'high', label: '高清' }
        ];
        let selectedQuality = 'medium';
    
        qualities.forEach(q => {
          const btn = document.createElement('button');
          btn.textContent = q.label;
          btn.dataset.quality = q.key;
          btn.style.cssText = makeQualityBtnStyle(q.key === selectedQuality);
          btn.onclick = () => {
            selectedQuality = q.key;
            qualityRow.querySelectorAll('button').forEach(b => {
              b.style.cssText = makeQualityBtnStyle(b.dataset.quality === selectedQuality);
            });
          };
          qualityRow.appendChild(btn);
        });
    
        // 按钮行
        const btnRow = document.createElement('div');
        btnRow.style.cssText = `
          display: flex;
          gap: 8px;
          justify-content: center;
        `;
    
        const startBtn = document.createElement('button');
        startBtn.innerHTML = '⏺ 开始录制';
        startBtn.style.cssText = makeActionBtnStyle('#28a745', '#34ce57');
    
        const pauseBtn = document.createElement('button');
        pauseBtn.innerHTML = '⏸ 暂停';
        pauseBtn.disabled = true;
        pauseBtn.style.cssText = makeActionBtnStyle('#ffc107', '#ffda47', true);
    
        const stopBtn = document.createElement('button');
        stopBtn.innerHTML = '⏹ 停止';
        stopBtn.disabled = true;
        stopBtn.style.cssText = makeActionBtnStyle('#dc3545', '#e4606d', true);
    
        btnRow.appendChild(startBtn);
        btnRow.appendChild(pauseBtn);
        btnRow.appendChild(stopBtn);
    
        // 组装内容区
        body.appendChild(timerDisplay);
        body.appendChild(statusIndicator);
        body.appendChild(qualityRow);
        body.appendChild(btnRow);
    
        container.appendChild(header);
        container.appendChild(body);
    
        // ===== 拖拽逻辑 =====
        let isDragging = false;
        let dragOffsetX = 0;
        let dragOffsetY = 0;
    
        header.addEventListener('mousedown', (e) => {
          if (e.target.tagName === 'BUTTON') return;
          isDragging = true;
          dragOffsetX = e.clientX - container.offsetLeft;
          dragOffsetY = e.clientY - container.offsetTop;
          container.style.transition = 'none';
          container.style.opacity = '0.9';
        });
    
        document.addEventListener('mousemove', (e) => {
          if (!isDragging) return;
          const x = Math.max(0, Math.min(window.innerWidth - container.offsetWidth, e.clientX - dragOffsetX));
          const y = Math.max(0, Math.min(window.innerHeight - container.offsetHeight, e.clientY - dragOffsetY));
          container.style.left = x + 'px';
          container.style.top = y + 'px';
          container.style.right = 'auto';
        });
    
        document.addEventListener('mouseup', () => {
          if (isDragging) {
            isDragging = false;
            container.style.transition = 'all 0.3s ease';
            container.style.opacity = '1';
          }
        });
    
        // ===== 折叠逻辑 =====
        collapseBtn.onclick = () => {
          isCollapsed = !isCollapsed;
          body.style.display = isCollapsed ? 'none' : 'block';
          collapseBtn.textContent = isCollapsed ? '+' : '−';
          collapseBtn.title = isCollapsed ? '展开' : '折叠';
        };
    
        // ===== 关闭逻辑 =====
        closeBtn.onclick = () => {
          if (recorder.isRecording) {
            if (!confirm('正在录制中，确定要关闭吗？')) return;
            recorder.stopRecording();
          }
          document.body.removeChild(container);
        };
    
        // ===== 录制控制 =====
        startBtn.onclick = async () => {
          const success = await recorder.startRecording(selectedQuality);
          if (success) {
            startBtn.disabled = true;
            startBtn.style.cssText = makeActionBtnStyle('#28a745', '#34ce57', true);
            pauseBtn.disabled = false;
            pauseBtn.style.cssText = makeActionBtnStyle('#ffc107', '#ffda47');
            stopBtn.disabled = false;
            stopBtn.style.cssText = makeActionBtnStyle('#dc3545', '#e4606d');
    
            timerDisplay.style.color = '#f87171';
            timerDisplay.style.textShadow = '0 0 20px rgba(248, 113, 113, 0.4)';
            dot.style.background = '#f87171';
            dot.style.boxShadow = '0 0 8px rgba(248,113,113,0.5)';
            dot.style.animation = 'pulse-dot 1s infinite';
            statusText.textContent = '录制中...';
            statusText.color = '#f87171';
    
            // 添加脉冲动画样式
            addPulseAnimation();
          } else {
            alert('请授权屏幕捕获权限以开始录制');
          }
        };
    
        pauseBtn.onclick = () => {
          if (recorder.isPaused) {
            // 恢复
            recorder.resumeRecording();
            pauseBtn.innerHTML = '⏸ 暂停';
            timerDisplay.style.color = '#f87171';
            timerDisplay.style.textShadow = '0 0 20px rgba(248, 113, 113, 0.4)';
            dot.style.background = '#f87171';
            dot.style.animation = 'pulse-dot 1s infinite';
            statusText.textContent = '录制中...';
          } else {
            // 暂停
            recorder.pauseRecording();
            pauseBtn.innerHTML = '▶ 继续';
            timerDisplay.style.color = '#ffc107';
            timerDisplay.style.textShadow = '0 0 20px rgba(255, 193, 7, 0.4)';
            dot.style.background = '#ffc107';
            dot.style.boxShadow = '0 0 8px rgba(255,193,7,0.5)';
            dot.style.animation = 'none';
            statusText.textContent = '已暂停';
          }
        };
    
        stopBtn.onclick = () => {
          recorder.stopRecording();
          startBtn.disabled = false;
          startBtn.style.cssText = makeActionBtnStyle('#28a745', '#34ce57');
          pauseBtn.disabled = true;
          pauseBtn.style.cssText = makeActionBtnStyle('#ffc107', '#ffda47', true);
          pauseBtn.innerHTML = '⏸ 暂停';
          stopBtn.disabled = true;
          stopBtn.style.cssText = makeActionBtnStyle('#dc3545', '#e4606d', true);
    
          timerDisplay.style.color = '#4ade80';
          timerDisplay.style.textShadow = '0 0 20px rgba(74, 222, 128, 0.3)';
          dot.style.background = '#4ade80';
          dot.style.boxShadow = '0 0 6px rgba(74,222,128,0.4)';
          dot.style.animation = 'none';
          statusText.textContent = '✓ 录制完成，文件已下载';
          statusText.style.color = '#4ade80';
        };
    
        document.body.appendChild(container);
    
        return {
          ok: true,
          summary: 'Yuze 增强版网页录屏工具已启动',
          features: ['实时计时器', '暂停/恢复', '拖拽移动', '面板折叠', '三档画质选择', '深色UI主题'],
          warnings: []
        };
      }
    
      // ===== 辅助样式函数 =====
      function makeHeaderBtnStyle(color) {
        return `
          background: transparent;
          border: none;
          font-size: 16px;
          cursor: pointer;
          color: ${color || '#8892a0'};
          width: 22px; height: 22px;
          display: flex; align-items: center; justify-content: center;
          border-radius: 4px;
          transition: all 0.2s;
          line-height: 1;
        `;
      }
    
      function makeQualityBtnStyle(active) {
        return `
          flex: 1;
          padding: 5px 0;
          border: 1px solid ${active ? 'rgba(0,123,255,0.6)' : 'rgba(255,255,255,0.12)'};
          background: ${active ? 'rgba(0,123,255,0.15)' : 'rgba(255,255,255,0.04)'};
          color: ${active ? '#4dabf7' : '#8892a0'};
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          font-weight: ${active ? '600' : '400'};
          transition: all 0.2s;
          font-family: inherit;
        `;
      }
    
      function makeActionBtnStyle(bgColor, hoverBg, disabled) {
        const baseDisabled = disabled ? 'opacity: 0.45; cursor: not-allowed;' : 'cursor: pointer;';
        return `
          padding: 7px 14px;
          border: none;
          border-radius: 6px;
          background: ${bgColor};
          color: white;
          font-size: 12px;
          font-weight: 600;
          font-family: inherit;
          ${baseDisabled}
          transition: all 0.2s;
          white-space: nowrap;
        `;
      }
    
      function addPulseAnimation() {
        if (document.getElementById('Yuze-recorder-pulse-style')) return;
        const style = document.createElement('style');
        style.id = 'Yuze-recorder-pulse-style';
        style.textContent = `
          @keyframes pulse-dot {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(1.3); }
          }
        `;
        document.head.appendChild(style);
      }
    
      return createRecorderUI();
    }
  );
  if (typeof __tabOriginalFunction !== "function") {
    throw new Error("evaluate_script source must evaluate to a function");
  }
  return await __tabOriginalFunction();
})();