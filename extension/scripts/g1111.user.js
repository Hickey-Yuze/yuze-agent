(async function __tabEvaluateScriptBridge() {
  const __tabScriptArgs = null;
  const __tabOriginalFunction = (
    async function run(args) {
      // ============================================
      // Yuze 录屏工具 v3.2 — 小球界面重设计版
      // 基于 v3.1，重构悬浮小球 UI：
      //   - 72px 球体 + 动态渐变光环边框
      //   - 脉冲动画圆环替代静态红点
      //   - 环形放射状弹出菜单（围绕小球展开）
      //   - 每个操作按钮带图标+微交互动画
      //   - 状态指示外环（录制中=红色呼吸，暂停=黄色静止）
      //
      // v3.2.1 修改：导出文件名改为「录屏_年月日_时分秒」中文格式
      // ============================================
    
      class EnhancedRecorder {
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
          this.currentMode = 'screen';
          this.quality = 'original';
          this.audioSource = 'none';
          this.onTick = null;
          this.audioCtx = null;
          this.micStream = null;
          this.destinationNode = null;
          this.countdownSeconds = 3;
          this.isCountingDown = false;
          this.countdownInterval = null;
          this.onCountdownTick = null;
          this.onStop = null;
          this._actualMode = '';
          this._mimeType = '';
        }
    
        getSupportedMimeType() {
          var types = [
            'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
            'video/mp4;codecs=avc1.42E01E',
            'video/mp4',
            'video/webm;codecs=vp9',
            'video/webm;codecs=vp8',
            'video/webm'
          ];
          for (var i = 0; i < types.length; i++) {
            if (MediaRecorder.isTypeSupported(types[i])) return types[i];
          }
          return 'video/webm';
        }
    
        getQualityParams() {
          var map = {
            original: { width: null, height: null, frameRate: 60, bitrate: 0 },
            high: { width: 1920, height: 1080, frameRate: 60, bitrate: 8000000 },
            medium: { width: 1280, height: 720, frameRate: 30, bitrate: 2500000 }
          };
          return map[this.quality] || map.high;
        }
    
        async startTabRecording() {
          return await this.startDisplayRecording('browser');
        }
    
        async startDisplayRecording(preferredType) {
          try {
            var q = this.getQualityParams();
            var stream = await navigator.mediaDevices.getDisplayMedia({
              video: { cursor: "always", displaySurface: preferredType, width: q.width, height: q.height, frameRate: q.frameRate },
              audio: true
            });
            var track = stream.getVideoTracks()[0];
            stream._actualSurface = track.getSettings().displaySurface || 'monitor';
            var self = this;
            track.addEventListener('ended', function() {
              if (self.isRecording) self.stopRecording();
            });
            return stream;
          } catch(e) {
            if (e.name === 'NotAllowedError') return { error: 'PERMISSION_DENIED' };
            console.error('显示设备访问失败:', e);
            return null;
          }
        }
    
        async requestMicrophone() {
          try {
            return await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
          } catch(e) {
            console.error('麦克风访问失败:', e);
            return null;
          }
        }
    
        mixAudioStreams(displayStream, micStream) {
          this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          var dest = this.audioCtx.createMediaStreamDestination();
          this.destinationNode = dest;
          var audioTracks = displayStream.getAudioTracks();
          if (audioTracks.length > 0) {
            this.audioCtx.createMediaStreamSource(new MediaStream([audioTracks[0]])).connect(dest);
          }
          if (micStream) {
            var micTracks = micStream.getAudioTracks();
            if (micTracks.length > 0) {
              this.audioCtx.createMediaStreamSource(new MediaStream([micTracks[0]])).connect(dest);
            }
          }
          return dest.stream;
        }
    
        startCountdown(seconds) {
          var self = this;
          return new Promise(function(resolve) {
            if (self.isRecording || self.isCountingDown) { resolve(false); return; }
            var remaining = seconds;
            self.isCountingDown = true;
    
            self.countdownInterval = setInterval(function() {
              remaining--;
              if (self.onCountdownTick) self.onCountdownTick(remaining);
              if (remaining <= 0) {
                clearInterval(self.countdownInterval);
                self.countdownInterval = null;
                self.isCountingDown = false;
                resolve(true);
              }
            }, 1000);
    
            if (self.onCountdownTick) self.onCountdownTick(remaining);
          });
        }
    
        cancelCountdown() {
          if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
          }
          this.isCountingDown = false;
        }
    
        async prepareStream(mode, quality, audioSrc) {
          if (this.isRecording) return { ok: false, error: '正在录制中' };
          this.currentMode = mode;
          this.quality = quality || 'original';
          this.audioSource = audioSrc || 'none';
    
          var stream = null;
          if (mode === 'tab') {
            stream = await this.startTabRecording();
            if (!stream) return { ok: false, error: '标签页录制初始化失败' };
            if (stream.error) return { ok: false, error: '用户拒绝了权限' };
          } else if (mode === 'screen') {
            stream = await this.startDisplayRecording('monitor');
            if (!stream) return { ok: false, error: '屏幕录制初始化失败' };
            if (stream.error) return { ok: false, error: '用户拒绝了权限' };
          } else if (mode === 'window') {
            stream = await this.startDisplayRecording('window');
            if (!stream) return { ok: false, error: '窗口录制初始化失败' };
            if (stream.error) return { ok: false, error: '用户拒绝了权限' };
          }
    
          this._actualMode = stream._actualSurface || mode;
          var finalVideoTracks = stream.getVideoTracks();
    
          if (this.audioSource === 'none') {
            this.stream = new MediaStream(finalVideoTracks);
          } else if (this.audioSource === 'system') {
            this.stream = stream;
          } else if (this.audioSource === 'mic') {
            this.micStream = await this.requestMicrophone();
            if (!this.micStream) {
              stream.getTracks().forEach(function(t) { t.stop(); });
              return { ok: false, error: '麦克风初始化失败，请授予麦克风权限' };
            }
            this.stream = new MediaStream(finalVideoTracks.concat(this.micStream.getAudioTracks()));
          } else if (this.audioSource === 'both') {
            this.micStream = await this.requestMicrophone();
            if (!this.micStream) {
              stream.getTracks().forEach(function(t) { t.stop(); });
              return { ok: false, error: '麦克风初始化失败，请授予麦克风权限' };
            }
            var mixedAudioStream = this.mixAudioStreams(stream, this.micStream);
            this.stream = new MediaStream(finalVideoTracks.concat(mixedAudioStream.getAudioTracks()));
          }
    
          this._mimeType = this.getSupportedMimeType();
          return {
            ok: true,
            mode: this.currentMode,
            actualMode: this._actualMode,
            quality: this.quality,
            audio: this.audioSource,
            mimeType: this._mimeType
          };
        }
    
        beginRecording() {
          if (!this.stream) return { ok: false, error: '未准备好录制流' };
          var q = this.getQualityParams();
          this.recorder = new MediaRecorder(this.stream, { mimeType: this._mimeType, videoBitsPerSecond: q.bitrate });
          this.chunks = [];
    
          var recorderInstance = this.recorder;
          var chunksRef = this.chunks;
          var self = this;
    
          recorderInstance.ondataavailable = function(e) {
            if (e.data && e.data.size > 0) chunksRef.push(e.data);
          };
    
          recorderInstance.onstop = function() {
            self.saveRecording();
            self.cleanup();
            if (self.onStop) self.onStop();
          };
    
          recorderInstance.start(1000);
          this.isRecording = true;
          this.isPaused = false;
          this.startTime = Date.now();
          this.elapsedTime = 0;
          this.pausedDuration = 0;
          this.startTimer();
    
          return {
            ok: true,
            mode: this.currentMode,
            actualMode: this._actualMode,
            quality: this.quality,
            audio: this.audioSource,
            mimeType: this._mimeType
          };
        }
    
        pauseRecording() {
          if (this.recorder && this.isRecording && !this.isPaused) {
            this.recorder.pause();
            this.isPaused = true;
            this.pauseStart = Date.now();
            this.stopTimer();
            if (this.audioCtx && this.audioCtx.state === 'running') this.audioCtx.suspend();
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
            if (this.audioCtx && this.audioCtx.state === 'suspended') this.audioCtx.resume();
            return true;
          }
          return false;
        }
    
        stopRecording() {
          if (this.recorder && this.isRecording) {
            this.stopTimer();
            if (this.isPaused) {
              this.recorder.resume();
              this.pausedDuration += Date.now() - this.pauseStart;
            }
            this.recorder.stop();
            this.isRecording = false;
            this.isPaused = false;
            return true;
          }
          return false;
        }
    
        startTimer() {
          var self = this;
          this.timerInterval = setInterval(function() {
            self.elapsedTime = Date.now() - self.startTime - self.pausedDuration;
            if (self.onTick) self.onTick(self.elapsedTime);
          }, 100);
        }
    
        stopTimer() {
          if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
          }
        }
    
        cleanup() {
          if (this.audioCtx) {
            this.audioCtx.close().catch(function(){});
            this.audioCtx = null;
          }
          if (this.micStream) {
            this.micStream.getTracks().forEach(function(t) { t.stop(); });
            this.micStream = null;
          }
          if (this.stream) {
            this.stream.getTracks().forEach(function(t) { t.stop(); });
            this.stream = null;
          }
        }
    
        // ★ v3.2.1 修改：导出文件名改为「录屏_年月日_时分秒」中文格式
        saveRecording() {
          if (!this.chunks.length) return null;
          var outputMime = this.getSupportedMimeType().indexOf('video/mp4') === 0 ? 'video/mp4' : 'video/webm';
          var outputExt = outputMime === 'video/mp4' ? '.mp4' : '.webm';
          var blob = new Blob(this.chunks, { type: outputMime });
          var url = URL.createObjectURL(blob);
          // 文件名格式：录屏_2026年07月02日_15时50分19秒.mp4
          var now = new Date();
          function p(n) { return n < 10 ? '0' + n : '' + n; }
          var Y = now.getFullYear();
          var M = p(now.getMonth() + 1);
          var D = p(now.getDate());
          var h = p(now.getHours());
          var m = p(now.getMinutes());
          var s = p(now.getSeconds());
          var fn = '录屏_' + Y + '年' + M + '月' + D + '日_' + h + '时' + m + '分' + s + '秒' + outputExt;
          var a = document.createElement('a');
          a.href = url;
          a.download = fn;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          return { filename: fn, size: blob.size, duration: this.elapsedTime };
        }
    
        formatTime(ms) {
          var s = Math.floor(ms / 1000);
          var h = Math.floor(s / 3600);
          var m = Math.floor((s % 3600) / 60);
          var c = Math.floor((ms % 1000) / 10);
          if (h > 0) {
            return pad(h) + ':' + pad(m) + ':' + pad(s % 60) + '.' + pad(c);
          }
          return pad(m) + ':' + pad(s % 60) + '.' + pad(c);
    
          function pad(n) { return n < 10 ? '0' + n : '' + n; }
        }
    
        getState() {
          return {
            isRecording: this.isRecording,
            isPaused: this.isPaused,
            isCountingDown: this.isCountingDown,
            currentMode: this.currentMode,
            quality: this.quality,
            audioSource: this.audioSource,
            elapsedTime: this.elapsedTime,
            formattedTime: this.formatTime(this.elapsedTime)
          };
        }
      }
    
      // ============================================
      // 🍎 iOS 26 Liquid Glass 样式系统（保留主面板）
      // ============================================
    
      var styleId = 'Yuze-recorder-lg-styles-v32';
      if (!document.getElementById(styleId)) {
        var lgStyle = document.createElement('style');
        lgStyle.id = styleId;
        lgStyle.textContent = [
          /* ---- 原有 Liquid Glass 动画 ---- */
          '@keyframes lg-shimmer {',
          '  0% { background-position: -200% center; }',
          '  100% { background-position: 200% center; }',
          '}',
          '@keyframes lg-pulse-glow {',
          '  0%, 100% { box-shadow: 0 0 20px rgba(0,122,255,0.15), 0 0 60px rgba(0,122,255,0.05); }',
          '  50% { box-shadow: 0 0 30px rgba(0,122,255,0.25), 0 0 80px rgba(0,122,255,0.1); }',
          '}',
          '@keyframes lg-rec-pulse {',
          '  0%, 100% { box-shadow: 0 0 20px rgba(255,59,48,0.4), 0 0 60px rgba(255,59,48,0.15), inset 0 1px 0 rgba(255,255,255,0.2); }',
          '  50% { box-shadow: 0 0 35px rgba(255,59,48,0.6), 0 0 80px rgba(255,59,48,0.2), inset 0 1px 0 rgba(255,255,255,0.3); }',
          '}',
          '@keyframes lg-countdown-pop {',
          '  0% { transform: scale(0.5); opacity: 0; }',
          '  50% { transform: scale(1.15); opacity: 1; }',
          '  100% { transform: scale(1); opacity: 1; }',
          '}',
          '@keyframes lg-float {',
          '  0%, 100% { transform: translateY(0px); }',
          '  50% { transform: translateY(-2px); }',
          '}',
    
          /* ===== v3.2 新增：悬浮小球专用动画 ===== */
    
          /* 外环呼吸脉冲 — 录制中红色 */
          '@keyframes ball-ring-breath-red {',
          '  0%, 100% {',
          '    box-shadow:',
          '      0 0 0 3px rgba(255,59,48,0.35),',
          '      0 0 20px rgba(255,59,48,0.25),',
          '      0 0 40px rgba(255,59,48,0.12);',
          '  }',
          '  50% {',
          '    box-shadow:',
          '      0 0 0 5px rgba(255,59,48,0.5),',
          '      0 0 30px rgba(255,59,48,0.35),',
          '      0 0 60px rgba(255,59,48,0.18);',
          '  }',
          '}',
    
          /* 外环静止 — 暂停黄色 */
          '@keyframes ball-ring-static-yellow {',
          '  0%, 100% {',
          '    box-shadow:',
          '      0 0 0 3px rgba(255,149,0,0.45),',
          '      0 0 16px rgba(255,149,0,0.2);',
          '  }',
          '}',
    
          /* 内核圆点脉冲 */
          '@keyframes ball-dot-pulse {',
          '  0%, 100% { transform: scale(1); opacity: 1; }',
          '  50% { transform: scale(1.3); opacity: 0.7; }',
          '}',
    
          /* 渐变边框旋转 */
          '@keyframes ball-border-spin {',
          '  0% { transform: rotate(0deg); }',
          '  100% { transform: rotate(360deg); }',
          '}',
    
          /* 放射菜单项入场 */
          '@keyframes radial-item-in {',
          '  0% { opacity: 0; transform: translate(-50%, -50%) scale(0.3); }',
          '  100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }',
          '}',
    
          /* 按钮涟漪 */
          '@keyframes btn-ripple {',
          '  0% { transform: scale(0.8); opacity: 0.6; }',
          '  100% { transform: scale(2.2); opacity: 0; }',
          '}',
    
          /* 光环扫描 */
          '@keyframes ball-scan-line {',
          '  0% { top: -10%; opacity: 0; }',
          '  15% { opacity: 0.5; }',
          '  85% { opacity: 0.5; }',
          '  100% { top: 110%; opacity: 0; }',
          '}',
    
          '.lg-range {',
          '  -webkit-appearance: none; appearance: none;',
          '  background: transparent;',
          '}',
          '.lg-range::-webkit-slider-runnable-track {',
          '  height: 6px;',
          '  border-radius: 6px;',
          '  background: linear-gradient(90deg, rgba(120,140,180,0.18), rgba(140,160,200,0.25));',
          '  border: none;',
          '  box-shadow: inset 0 1px 3px rgba(0,0,0,0.06), 0 0 0 0.5px rgba(255,255,255,0.12);',
          '}',
          '.lg-range::-webkit-slider-thumb {',
          '  -webkit-appearance: none;',
          '  display: none !important;',
          '  visibility: hidden;',
          '  opacity: 0;',
          '  width: 0; height: 0;',
          '  border: none; background: transparent;',
          '  pointer-events: none;',
          '}',
          '.lg-select {',
          '  appearance: none;',
          '  -webkit-appearance: none;',
          '  background-image: url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'6\' viewBox=\'0 0 10 6\'%3E%3Cpath d=\'M1 1l4 4 4-4\' stroke=\'%23007AFF\' stroke-width=\'1.5\' fill=\'none\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E");',
          '  background-repeat: no-repeat;',
          '  background-position: right 12px center;',
          '  background-size: 10px auto;',
          '  padding-right: 32px !important;',
          '}',
        ].join('\n');
        document.head.appendChild(lgStyle);
      }
    
      // ====== Liquid Glass 样式工厂函数 ======
    
      function makeHeaderBtn(color) {
        return [
          'width:26px;height:26px;border-radius:8px;border:none;',
          'background:linear-gradient(145deg, rgba(255,255,255,0.25), rgba(255,255,255,0.08));',
          'backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);',
          'color:' + color + ';font-size:13px;font-weight:600;cursor:pointer;',
          'display:flex;align-items:center;justify-content:center;',
          'box-shadow:0 1px 4px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.3), 0 0 0 0.5px rgba(255,255,255,0.15);',
          'transition:all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);'
        ].join('');
      }
    
      function makeModeBtn(active, color) {
        if (active) {
          return [
            'padding:9px 8px;border-radius:12px;border:none;',
            'background:linear-gradient(145deg, ' + color + '35, ' + color + '15);',
            'color:' + color + ';font-size:11.5px;font-weight:600;cursor:pointer;',
            'text-align:center;line-height:1.4;letter-spacing:0.2px;',
            'backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);',
            'box-shadow:0 2px 12px ' + color + '25, inset 0 1px 0 rgba(255,255,255,0.25), 0 0 0 1px ' + color + '40;',
            'transition:all 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94);',
            'position:relative;overflow:hidden;'
          ].join('');
        }
        return [
          'padding:9px 8px;border-radius:12px;border:none;',
          'background:linear-gradient(145deg, rgba(255,255,255,0.16), rgba(255,255,255,0.04));',
          'color:rgba(255,255,255,0.65);font-size:11.5px;font-weight:500;cursor:pointer;',
          'text-align:center;line-height:1.4;letter-spacing:0.2px;',
          'backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);',
          'box-shadow:0 1px 4px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.18), 0 0 0 0.5px rgba(255,255,255,0.1);',
          'transition:all 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94);'
        ].join('');
      }
    
      function makeRecBtn(disabled, recording) {
        var base = [
          'flex:2;padding:11px 18px;border-radius:14px;border:none;',
          'font-size:13px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;',
          'letter-spacing:0.3px;',
          'transition:transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;',
          'position:relative;overflow:hidden;'
        ].join('');
    
        if (disabled && !recording) {
          return base + [
            'background:linear-gradient(145deg, rgba(0,122,255,0.08), rgba(0,122,255,0.03));',
            'color:rgba(0,122,255,0.35);cursor:not-allowed;',
            'box-shadow:inset 0 1px 0 rgba(255,255,255,0.15), 0 0 0 0.5px rgba(0,122,255,0.1);'
          ].join('');
        }
        if (recording) {
          return base + [
            'background:linear-gradient(135deg, #FF3B30, #D62828);',
            'color:#fff;',
            'animation:lg-rec-pulse 2s ease-in-out infinite;',
            'box-shadow:0 4px 20px rgba(255,59,48,0.4), 0 0 60px rgba(255,59,48,0.12), inset 0 1px 0 rgba(255,255,255,0.2), 0 0 0 0.5px rgba(255,255,255,0.15);'
          ].join('');
        }
        return base + [
          'background:linear-gradient(145deg, rgba(0,122,255,0.22), rgba(0,122,255,0.08));',
          'color:#007AFF;',
          'text-shadow:0 1px 2px rgba(0,122,255,0.15);',
          'backdrop-filter:blur(16px) saturate(180%);-webkit-backdrop-filter:blur(16px) saturate(180%);',
          'box-shadow:',
          '  0 4px 16px rgba(0,122,255,0.2),',
          '  0 0 0 1px rgba(0,122,255,0.3),',
          '  inset 0 1px 0 rgba(255,255,255,0.4);'
        ].join('');
      }
    
      function makePauseBtn(disabled) {
        var base = [
          'flex:1;padding:10px 14px;border-radius:12px;border:none;',
          'font-size:13px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:5px;',
          'transition:transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;',
          'letter-spacing:0.3px;'
        ].join('');
    
        if (disabled) {
          return base + [
            'background:linear-gradient(145deg, rgba(255,149,0,0.38), rgba(255,149,0,0.18));',
            'color:#E08600;cursor:not-allowed;',
            'text-shadow:0 1px 3px rgba(200,120,0,0.25);',
            'backdrop-filter:blur(16px) saturate(180%);-webkit-backdrop-filter:blur(16px) saturate(180%);',
            'box-shadow:',
            '  0 4px 20px rgba(255,149,0,0.35),',
            '  0 0 0 1.5px rgba(255,149,0,0.5),',
            '  inset 0 1px 0 rgba(255,255,255,0.35);'
          ].join('');
        }
        return base + [
          'background:linear-gradient(145deg, rgba(255,149,0,0.38), rgba(255,149,0,0.18));',
          'color:#E08600;',
          'text-shadow:0 1px 3px rgba(200,120,0,0.25);',
          'backdrop-filter:blur(16px) saturate(180%);-webkit-backdrop-filter:blur(16px) saturate(180%);',
          'box-shadow:',
          '  0 4px 20px rgba(255,149,0,0.35),',
          '  0 0 0 1.5px rgba(255,149,0,0.5),',
          '  inset 0 1px 0 rgba(255,255,255,0.35);'
        ].join('');
      }
    
      function makeStopBtn(disabled) {
        var base = [
          'flex:1;padding:10px 14px;border-radius:12px;border:none;',
          'font-size:13px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:5px;',
          'transition:transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;',
          'letter-spacing:0.3px;'
        ].join('');
    
        if (disabled) {
          return base + [
            'background:linear-gradient(145deg, rgba(255,59,48,0.38), rgba(255,59,48,0.18));',
            'color:#D62820;cursor:not-allowed;',
            'text-shadow:0 1px 3px rgba(200,40,30,0.25);',
            'backdrop-filter:blur(16px) saturate(180%);-webkit-backdrop-filter:blur(16px) saturate(180%);',
            'box-shadow:',
            '  0 4px 20px rgba(255,59,48,0.35),',
            '  0 0 0 1.5px rgba(255,59,48,0.5),',
            '  inset 0 1px 0 rgba(255,255,255,0.35);'
          ].join('');
        }
        return base + [
          'background:linear-gradient(145deg, rgba(255,59,48,0.38), rgba(255,59,48,0.18));',
          'color:#D62820;',
          'text-shadow:0 1px 3px rgba(200,40,30,0.25);',
          'backdrop-filter:blur(16px) saturate(180%);-webkit-backdrop-filter:blur(16px) saturate(180%);',
          'box-shadow:',
          '  0 4px 20px rgba(255,59,48,0.35),',
          '  0 0 0 1.5px rgba(255,59,48,0.5),',
          '  inset 0 1px 0 rgba(255,255,255,0.35);'
        ].join('');
      }
    
      function makeCancelBtn() {
        return [
          'flex:1;padding:10px 12px;border-radius:12px;border:none;',
          'font-size:11.5px;font-weight:600;cursor:pointer;',
          'transition:all 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94);',
          'letter-spacing:0.2px;',
          'background:linear-gradient(145deg, rgba(255,149,0,0.18), rgba(255,149,0,0.06));',
          'color:#FF9500;',
          'box-shadow:0 2px 10px rgba(255,149,0,0.15), inset 0 1px 0 rgba(255,255,255,0.15), 0 0 0 1px rgba(255,149,0,0.25);'
        ].join('');
      }
    
      function getMN(mode) {
        var names = { tab: '标签页', screen: '全屏', window: '窗口' };
        return names[mode] || mode;
      }
    
      function getQN(q) {
        var names = { original: '原画', high: '高清', medium: '标清' };
        return names[q] || q;
      }
    
      function fSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(1) + ' MB';
      }
    
      // ============================================
      // 🎨 UI 创建函数
      // ============================================
    
      function createRecorderUI() {
        var R = new EnhancedRecorder();
        var oldPanel = document.getElementById('Yuze-recorder-panel');
        if (oldPanel) oldPanel.remove();
    
        var C = document.createElement('div');
        C.id = 'Yuze-recorder-panel';
        C.style.cssText = [
          'position:fixed;top:24px;right:24px;',
          'min-width:300px;max-width:340px;',
          'border-radius:22px;',
          'z-index:999999;',
          'user-select:none;',
          'font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text","Helvetica Neue",sans-serif;',
          'overflow:hidden;',
          'background:linear-gradient(165deg,',
          '  rgba(255,255,255,0.55) 0%,',
          '  rgba(255,255,255,0.28) 25%,',
          '  rgba(240,245,255,0.18) 50%,',
          '  rgba(225,235,250,0.22) 75%,',
          '  rgba(255,255,255,0.35) 100%);',
          'backdrop-filter:saturate(180%) blur(40px) brightness(1.1);',
          '-webkit-backdrop-filter:saturate(180%) blur(40px) brightness(1.1);',
          'box-shadow:',
          '  0 0 0 0.5px rgba(255,255,255,0.6),',
          '  0 0 0 1px rgba(255,255,255,0.3),',
          '  0 8px 32px rgba(0,0,0,0.12),',
          '  0 20px 60px rgba(0,40,120,0.08),',
          '  inset 0 1px 0 rgba(255,255,255,0.7),',
          '  inset 0 -1px 0 rgba(0,0,0,0.05);',
          'animation:lg-float 6s ease-in-out infinite;',
          'transition:all 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);'
        ].join(';');
    
        var glossOverlay = document.createElement('div');
        glossOverlay.style.cssText = [
          'position:absolute;top:0;left:0;right:0;height:50%;',
          'background:linear-gradient(180deg,',
          '  rgba(255,255,255,0.35) 0%,',
          '  rgba(255,255,255,0.08) 50%,',
          '  transparent 100%);',
          'pointer-events:none;border-radius:22px 22px 0 0;'
        ].join(';');
        C.appendChild(glossOverlay);
    
        var H = document.createElement('div');
        H.style.cssText = [
          'display:flex;align-items:center;justify-content:space-between;',
          'padding:14px 16px 12px 16px;',
          'cursor:move;',
          'position:relative;z-index:2;'
        ].join(';');
    
        var T = document.createElement('span');
        T.textContent = 'Yuze 录屏工具';
        T.style.cssText = [
          'font-size:14px;font-weight:700;',
          'background:linear-gradient(135deg, #1a1a2e 0%, #007AFF 50%, #5856D6 100%);',
          '-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;',
          'letter-spacing:0.3px;'
        ].join(';');
    
        var HB = document.createElement('div');
        HB.style.cssText = 'display:flex;gap:7px;';
    
        var colBtn = document.createElement('button');
        colBtn.textContent = '−';
        colBtn.title = '折叠';
        colBtn.style.cssText = makeHeaderBtn('#8E8E93');
    
        var clsBtn = document.createElement('button');
        clsBtn.textContent = '×';
        clsBtn.title = '关闭';
        clsBtn.style.cssText = makeHeaderBtn('#FF3B30');
    
        HB.appendChild(colBtn);
        HB.appendChild(clsBtn);
        H.appendChild(T);
        H.appendChild(HB);
        C.appendChild(H);
    
        var divider = document.createElement('div');
        divider.style.cssText = [
          'height:0.5px;margin:0 16px;',
          'background:linear-gradient(90deg, transparent, rgba(0,0,0,0.06), rgba(0,0,0,0.08), transparent);'
        ].join(';');
        C.appendChild(divider);
    
        var CA = document.createElement('div');
        CA.id = 'recorder-content';
        CA.style.cssText = 'padding:14px 16px 16px 16px;position:relative;z-index:2;';
    
        var ms = document.createElement('div');
        ms.style.cssText = 'margin-bottom:14px;';
        var ml = document.createElement('div');
        ml.textContent = '录制模式';
        ml.style.cssText = [
          'font-size:13px;color:#1d1d1f;margin-bottom:8px;font-weight:700;letter-spacing:1px;text-shadow:none;',
          'font-weight:700;text-transform:uppercase;letter-spacing:1.8px;'
        ].join(';');
        ms.appendChild(ml);
    
        var mb = document.createElement('div');
        mb.style.cssText = 'display:flex;gap:7px;';
    
        var modes = [
          { id: 'tab', label: '标签页', icon: '🏷️', color: '#5AC8FA' },
          { id: 'screen', label: '全屏幕', icon: '🖥️', color: '#34C759' },
          { id: 'window', label: '窗口', icon: '🪟', color: '#FF9500' }
        ];
        var selMode = 'screen';
    
        for (var mi = 0; mi < modes.length; mi++) {
          (function(m){
            var b = document.createElement('button');
            b.dataset.mode = m.id;
            b.textContent = m.icon + ' ' + m.label;
            b.style.cssText = makeModeBtn(m.id === selMode, m.color);
            b.onclick = function() {
              selMode = m.id;
              var children = mb.children;
              for (var ci = 0; ci < children.length; ci++) {
                var child = children[ci];
                var isActive = child.dataset.mode === selMode;
                var mc = null;
                for (var fi = 0; fi < modes.length; fi++) {
                  if (modes[fi].id === child.dataset.mode) { mc = modes[fi]; break; }
                }
                child.style.cssText = makeModeBtn(isActive, mc.color);
              }
            };
            mb.appendChild(b);
          })(modes[mi]);
        }
        ms.appendChild(mb);
        CA.appendChild(ms);
    
        var qs = document.createElement('div');
        qs.style.cssText = 'margin-bottom:14px;';
        var ql = document.createElement('div');
        ql.textContent = '画质设置';
        ql.style.cssText = [
          'font-size:13px;color:#1d1d1f;margin-bottom:8px;font-weight:700;letter-spacing:1px;text-shadow:none;',
          'font-weight:700;text-transform:uppercase;letter-spacing:1.8px;'
        ].join(';');
        qs.appendChild(ql);
    
        var qSel = document.createElement('select');
        qSel.className = 'lg-select';
    
        var qualityOptions = [
          { v: 'original', t: '原画 · 无损原始分辨率' },
          { v: 'high', t: '高清 · 1080p / 60fps' },
          { v: 'medium', t: '标清 · 720p / 30fps' }
        ];
    
        for (var qi = 0; qi < qualityOptions.length; qi++) {
          var opt = document.createElement('option');
          opt.value = qualityOptions[qi].v;
          opt.textContent = qualityOptions[qi].t;
          if (qualityOptions[qi].v === 'original') opt.selected = true;
          qSel.appendChild(opt);
        }
    
        qSel.style.cssText = [
          'width:100%;padding:10px 14px;border-radius:13px;border:none;',
          'background:linear-gradient(145deg, rgba(255,255,255,0.5), rgba(255,255,255,0.15));',
          'backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);',
          'color:#1d1d1f;font-size:12.5px;font-weight:600;outline:none;cursor:pointer;',
          'box-shadow:0 1px 6px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.5), 0 0 0 0.5px rgba(0,0,0,0.06);',
          'transition:all 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94);',
          'letter-spacing:0.2px;'
        ].join(';');
    
        qSel.addEventListener('focus', function() {
          qSel.style.boxShadow = '0 0 0 3px rgba(0,122,255,0.25), 0 1px 8px rgba(0,122,255,0.15), inset 0 1px 0 rgba(255,255,255,0.5), 0 0 0 0.5px rgba(0,122,255,0.3)';
        });
        qSel.addEventListener('blur', function() {
          qSel.style.boxShadow = '0 1px 6px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.5), 0 0 0 0.5px rgba(0,0,0,0.06)';
        });
        qs.appendChild(qSel);
        CA.appendChild(qs);
    
        var as = document.createElement('div');
        as.style.cssText = 'margin-bottom:14px;';
        var al = document.createElement('div');
        al.textContent = '音源设置';
        al.style.cssText = [
          'font-size:13px;color:#1d1d1f;margin-bottom:8px;font-weight:700;letter-spacing:1px;text-shadow:none;',
          'font-weight:700;text-transform:uppercase;letter-spacing:1.8px;'
        ].join(';');
        as.appendChild(al);
    
        var ab = document.createElement('div');
        ab.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:7px;';
    
        var audios = [
          { id: 'none', label: '静音', icon: '🔇', color: '#8E8E93' },
          { id: 'system', label: '系统声音', icon: '🔊', color: '#007AFF' },
          { id: 'mic', label: '麦克风', icon: '🎤', color: '#5AC8FA' },
          { id: 'both', label: '混合', icon: '🔊🎤', color: '#AF52DE' }
        ];
        var selAudio = 'system';
    
        for (var ai = 0; ai < audios.length; ai++) {
          (function(a){
            var b = document.createElement('button');
            b.dataset.audio = a.id;
            b.textContent = a.icon + ' ' + a.label;
            b.style.cssText = makeModeBtn(a.id === selAudio, a.color);
            b.onclick = function() {
              selAudio = a.id;
              var children = ab.children;
              for (var ci2 = 0; ci2 < children.length; ci2++) {
                var child2 = children[ci2];
                var isActive2 = child2.dataset.audio === selAudio;
                var mc2 = null;
                for (var fi2 = 0; fi2 < audios.length; fi2++) {
                  if (audios[fi2].id === child2.dataset.audio) { mc2 = audios[fi2]; break; }
                }
                child2.style.cssText = makeModeBtn(isActive2, mc2.color);
              }
            };
            ab.appendChild(b);
          })(audios[ai]);
        }
        as.appendChild(ab);
        CA.appendChild(as);
    
        var cdSec = document.createElement('div');
        cdSec.style.cssText = 'margin-bottom:14px;';
        var cdl = document.createElement('div');
        cdl.textContent = '录制倒计时';
        cdl.style.cssText = [
          'font-size:13px;color:#1d1d1f;margin-bottom:10px;font-weight:700;letter-spacing:1px;text-shadow:none;',
          'font-weight:700;text-transform:uppercase;letter-spacing:1.8px;'
        ].join(';');
        cdSec.appendChild(cdl);
    
        var cdRow = document.createElement('div');
        cdRow.style.cssText = 'display:flex;align-items:center;gap:14px;';
    
        var cdValLabel = document.createElement('span');
        cdValLabel.textContent = '3 秒';
        cdValLabel.style.cssText = [
          'font-size:13px;font-weight:700;color:#007AFF;',
          'min-width:38px;text-align:center;',
          'background:linear-gradient(145deg, rgba(0,122,255,0.1), transparent);',
          'padding:4px 10px;border-radius:10px;'
        ].join(';');
    
        var cdSliderWrap = document.createElement('div');
        cdSliderWrap.style.cssText = [
          'flex:1;height:22px;position:relative;cursor:pointer;',
          'display:flex;align-items:center;'
        ].join(';');
    
        var cdTrack = document.createElement('div');
        cdTrack.style.cssText = [
          'position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);',
          'height:6px;border-radius:6px;background:rgba(140,170,230,0.2);',
          'box-shadow:inset 0 1px 3px rgba(0,0,0,0.06), 0 0 0 0.5px rgba(255,255,255,0.12);'
        ].join(';');
    
        var cdFill = document.createElement('div');
        cdFill.style.cssText = [
          'position:absolute;left:0;top:0;height:100%;border-radius:6px;',
          'background:#007AFF;width:0%;transition:width 0.05s;'
        ].join('');
        cdTrack.appendChild(cdFill);
    
        var cdThumb = document.createElement('div');
        cdThumb.style.cssText = [
          'position:absolute;width:22px;height:22px;border-radius:50%;top:50%;',
          "background-image:url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2222%22 height=%2222%22 viewBox=%220 0 22 22%22%3E%3Ccircle cx=%2211%22 cy=%2211%22 r=%229.5%22 fill=%22white%22 stroke=%22rgba(0,90,200,0.45)%22 stroke-width=%222.5%22/%3E%3Cline x1=%2211%22 y1=%225%22 x2=%2211%22 y2=%2217%22 stroke=%22%230055cc%22 stroke-width=%223%22 stroke-linecap=%22round%22/%3E%3C/svg%3E');",
          'background-size:cover;',
          'box-shadow:0 2px 8px rgba(0,60,160,0.25);',
          'transform:translate(-50%,-50%);z-index:10;cursor:grab;',
          'transition:left 0.08s ease;'
        ].join(';');
    
        cdSliderWrap.appendChild(cdTrack);
        cdSliderWrap.appendChild(cdThumb);
    
        R.countdownSeconds = 3;
        function updateSliderUI() {
          var pct = ((R.countdownSeconds - 3) / (10 - 3)) * 100;
          cdFill.style.width = pct + '%';
          cdThumb.style.left = pct + '%';
          cdValLabel.textContent = R.countdownSeconds + ' 秒';
        }
        updateSliderUI();
    
        var draggingSlider = false;
        function setSliderFromX(clientX) {
          var rect = cdTrack.getBoundingClientRect();
          var x = Math.max(0, Math.min(rect.width, clientX - rect.left));
          var pct = x / rect.width;
          var v = Math.round(3 + pct * (10 - 3));
          v = Math.max(3, Math.min(10, v));
          R.countdownSeconds = v;
          updateSliderUI();
        }
    
        cdSliderWrap.addEventListener('mousedown', function(e) {
          draggingSlider = true;
          cdThumb.style.cursor = 'grabbing';
          cdThumb.style.transition = 'none';
          setSliderFromX(e.clientX);
          e.preventDefault();
        });
    
        document.addEventListener('mousemove', function(e) {
          if (!draggingSlider) return;
          setSliderFromX(e.clientX);
        });
    
        document.addEventListener('mouseup', function() {
          if (draggingSlider) {
            draggingSlider = false;
            cdThumb.style.cursor = 'grab';
            cdThumb.style.transition = 'left 0.08s ease';
          }
        });
    
        cdRow.appendChild(cdSliderWrap);
        cdRow.appendChild(cdValLabel);
        cdSec.appendChild(cdRow);
        CA.appendChild(cdSec);
    
        var sb = document.createElement('div');
        sb.id = 'recorder-status';
        sb.style.cssText = [
          'background:linear-gradient(145deg, rgba(255,255,255,0.35), rgba(255,255,255,0.1));',
          'border-radius:16px;padding:16px;text-align:center;margin-bottom:14px;',
          'backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);',
          'box-shadow:',
          '  0 2px 12px rgba(0,0,0,0.05),',
          '  inset 0 1px 0 rgba(255,255,255,0.5),',
          '  0 0 0 0.5px rgba(255,255,255,0.2);',
          'position:relative;overflow:hidden;'
        ].join(';');
    
        var sbGloss = document.createElement('div');
        sbGloss.style.cssText = [
          'position:absolute;top:0;left:0;right:0;height:45%;',
          'background:linear-gradient(180deg, rgba(255,255,255,0.3), transparent);',
          'pointer-events:none;border-radius:16px 16px 0 0;'
        ].join(';');
        sb.appendChild(sbGloss);
    
        var si = document.createElement('div');
        si.id = 'si';
        si.textContent = '●';
        si.style.cssText = [
          'font-size:28px;margin-bottom:6px;',
          'filter:grayscale(0.8);opacity:0.4;',
          'transition:all 0.3s ease;'
        ].join(';');
    
        var st = document.createElement('div');
        st.id = 'st';
        st.textContent = '就绪';
        st.style.cssText = [
          'font-size:12.5px;color:rgba(60,60,80,0.4);font-weight:600;',
          'transition:all 0.3s ease;'
        ].join(';');
    
        var td = document.createElement('div');
        td.id = 'td';
        td.style.cssText = [
          'font-size:24px;font-weight:700;',
          'font-family:"SF Mono","SF Mono Regular",Monaco,Consolas,monospace;',
          'color:#1d1d1f;margin-top:8px;display:none;',
          'letter-spacing:-0.5px;'
        ].join(';');
    
        var mi = document.createElement('div');
        mi.id = 'mi';
        mi.style.cssText = [
          'font-size:10.5px;color:#007AFF;margin-top:8px;display:none;',
          'font-weight:500;letter-spacing:0.3px;'
        ].join(';');
    
        sb.appendChild(si);
        sb.appendChild(st);
        sb.appendChild(td);
        sb.appendChild(mi);
        CA.appendChild(sb);
    
        var ctrls = document.createElement('div');
        ctrls.style.cssText = 'display:flex;gap:8px;';
    
        var rBtn = document.createElement('button');
        rBtn.id = 'br';
        rBtn.textContent = '开始录制';
        rBtn.style.cssText = makeRecBtn(false);
    
        var pBtn = document.createElement('button');
        pBtn.id = 'bp';
        pBtn.textContent = '暂停';
        pBtn.disabled = true;
        pBtn.style.cssText = makePauseBtn(true);
    
        var sBtn = document.createElement('button');
        sBtn.id = 'bs';
        sBtn.textContent = '停止';
        sBtn.disabled = true;
        sBtn.style.cssText = makeStopBtn(true);
    
        ctrls.appendChild(rBtn);
        ctrls.appendChild(pBtn);
        ctrls.appendChild(sBtn);
        CA.appendChild(ctrls);
        C.appendChild(CA);
    
        var floatBall = null;
        var floatTimeEl = null;
        var floatStatusRing = null;
        var isMinimized = false;
        var floatMenuVisible = false;
    
        function showFloatingBall() {
          var oldBall = document.getElementById('Yuze-recorder-float-ball');
          if (oldBall) { oldBall.remove(); }
          var oldMenu = document.getElementById('float-radial-menu');
          if (oldMenu) { oldMenu.remove(); }
          floatBall = null;
          isMinimized = true;
          C.style.display = 'none';
    
          floatBall = document.createElement('div');
          floatBall.id = 'Yuze-recorder-float-ball';
          floatBall.style.cssText = [
            'position:fixed;top:24px;right:24px;',
            'width:72px;height:72px;border-radius:50%;',
            'z-index:999999;',
            'user-select:none;',
            'cursor:pointer;display:flex;flex-direction:column;',
            'align-items:center;justify-content:center;',
            'background:linear-gradient(165deg,',
            '  rgba(255,255,255,0.62) 0%,',
            '  rgba(255,255,255,0.35) 25%,',
            '  rgba(240,248,255,0.22) 50%,',
            '  rgba(230,240,255,0.28) 75%,',
            '  rgba(255,255,255,0.42) 100%);',
            'backdrop-filter:saturate(200%) blur(44px) brightness(1.08);',
            '-webkit-backdrop-filter:saturate(200%) blur(44px) brightness(1.08);',
            'box-shadow:',
            '  0 0 0 0.5px rgba(255,255,255,0.7),',
            '  0 0 0 1.5px rgba(255,255,255,0.35),',
            '  0 8px 32px rgba(0,0,0,0.1),',
            '  0 24px 64px rgba(0,30,100,0.08),',
            '  inset 0 1px 0 rgba(255,255,255,0.8),',
            '  inset 0 -1px 0 rgba(0,0,0,0.04);',
            'animation:lg-float 6s ease-in-out infinite, ball-ring-breath-red 2s ease-in-out infinite;',
            'transition:transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease;'
          ].join(';');
    
          var scanLine = document.createElement('div');
          scanLine.style.cssText = [
            'position:absolute;left:5%;right:5%;top:-10%;height:20%;',
            'background:linear-gradient(180deg,',
            '  transparent 0%,',
            '  rgba(255,255,255,0.5) 40%,',
            '  rgba(255,255,255,0.7) 50%,',
            '  rgba(255,255,255,0.5) 60%,',
            '  transparent 100%);',
            'border-radius:50%;pointer-events:none;',
            'animation:ball-scan-line 3s ease-in-out infinite;'
          ].join(';');
          floatBall.appendChild(scanLine);
    
          var dotIcon = document.createElement('div');
          dotIcon.id = 'float-dot-icon';
          dotIcon.textContent = '●';
          dotIcon.style.cssText = [
            'font-size:18px;color:#FF3B30;line-height:1;margin-bottom:1px;',
            'text-shadow:0 0 12px rgba(255,59,48,0.7), 0 0 24px rgba(255,59,48,0.3);',
            'animation:ball-dot-pulse 1.5s ease-in-out infinite;',
            'position:relative;z-index:2;'
          ].join('');
          floatBall.appendChild(dotIcon);
    
          floatTimeEl = document.createElement('div');
          floatTimeEl.id = 'float-time-el';
          floatTimeEl.textContent = '00:00';
          floatTimeEl.style.cssText = [
            'font-size:12px;font-weight:700;color:#1d1d1f;',
            'font-family:"SF Mono","SF Mono Regular",Monaco,Consolas,monospace;',
            'letter-spacing:-0.3px;position:relative;z-index:2;',
            'text-shadow:0 1px 2px rgba(255,255,255,0.6);'
          ].join('');
          floatBall.appendChild(floatTimeEl);
    
          var radialMenu = document.createElement('div');
          radialMenu.id = 'float-radial-menu';
          radialMenu.style.cssText = [
            'position:absolute;',
            'pointer-events:auto;',
            'z-index:999998;display:none;'
          ].join('');
    
          var menuItems = [
            {
              angle: -150,
              label: '暂停',
              icon: '⏸',
              color: '#FF9500',
              bgColor: 'rgba(255,149,0,0.15)',
              borderColor: 'rgba(255,149,0,0.3)',
              shadowColor: 'rgba(255,149,0,0.2)',
              action: function(e) {
                e.stopPropagation();
                if (R.isPaused) {
                  R.resumeRecording();
                } else {
                  R.pauseRecording();
                }
                updUI(R.getState());
                updateFloatBallState(R.getState());
                toggleRadialMenu(false);
              }
            },
            {
              angle: -90,
              label: '停止',
              icon: '⏹',
              color: '#FF3B30',
              bgColor: 'rgba(255,59,48,0.15)',
              borderColor: 'rgba(255,59,48,0.3)',
              shadowColor: 'rgba(255,59,48,0.2)',
              action: function(e) {
                e.stopPropagation();
                var sv = R.stopRecording();
                restoreFromFloat();
                if (sv) {
                  si.textContent = '✓';
                  si.style.cssText = ['font-size:28px;margin-bottom:6px;','color:#34C759;filter:none;opacity:1;'].join(';');
                  st.textContent = '已保存 ' + fSize(sv.size);
                  st.style.color = '#34C759';
                  setTimeout(function() {
                    si.textContent = '●';
                    si.style.cssText = ['font-size:28px;margin-bottom:6px;','filter:grayscale(0.8);opacity:0.4;transition:all 0.3s ease;'].join(';');
                    st.textContent = '就绪';
                    st.style.color = 'rgba(255,255,255,0.85)';
                  }, 3500);
                }
              }
            },
            {
              angle: -30,
              label: '界面',
              icon: '🖼',
              color: '#007AFF',
              bgColor: 'rgba(0,122,255,0.15)',
              borderColor: 'rgba(0,122,255,0.3)',
              shadowColor: 'rgba(0,122,255,0.2)',
              action: function(e) {
                e.stopPropagation();
                restoreFromFloat();
              }
            }
          ];
    
          var itemRadius = 90;
          for (var ii = 0; ii < menuItems.length; ii++) {
            (function(item, idx) {
              var btn = document.createElement('button');
              btn.innerHTML = '<div style="font-size:15px;margin-bottom:2px;">' + item.icon + '</div><div style="font-size:9px;font-weight:600;">' + item.label + '</div>';
              btn.style.cssText = [
                'position:absolute;',
                'width:52px;height:52px;border-radius:50%;',
                'border:none;cursor:pointer;',
                'display:flex;flex-direction:column;align-items:center;justify-content:center;',
                'background:linear-gradient(145deg, ' + item.bgColor + ', rgba(255,255,255,0.06));',
                'backdrop-filter:blur(16px) saturate(180%);',
                '-webkit-backdrop-filter:blur(16px) saturate(180%);',
                'color:' + item.color + ';',
                'box-shadow:',
                '  0 4px 16px ' + item.shadowColor + ',',
                '  0 0 0 1px ' + item.borderColor + ',',
                '  inset 0 1px 0 rgba(255,255,255,0.4);',
                'transition:transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s ease, opacity 0.2s ease;',
                'opacity:0;',
                'transform:translate(-50%,-50%) scale(0.3);',
                'animation:radial-item-in 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards;',
                'animation-delay:' + (idx * 0.06) + 's;'
              ].join(';');
    
              btn.addEventListener('mouseenter', function() {
                btn.style.transform = 'translate(-50%,-50%) scale(1.12)';
                btn.style.boxShadow =
                  '  0 6px 24px ' + item.shadowColor + ',' +
                  '  0 0 0 1.5px ' + item.borderColor + ',' +
                  '  inset 0 1px 0 rgba(255,255,255,0.5)';
              });
              btn.addEventListener('mouseleave', function() {
                btn.style.transform = 'translate(-50%,-50%) scale(1)';
                btn.style.boxShadow =
                  '  0 4px 16px ' + item.shadowColor + ',' +
                  '  0 0 0 1px ' + item.borderColor + ',' +
                  '  inset 0 1px 0 rgba(255,255,255,0.4)';
              });
    
              btn.addEventListener('click', function(evt) {
                var ripple = document.createElement('div');
                ripple.style.cssText = [
                  'position:absolute;width:20px;height:20px;border-radius:50%;',
                  'background:' + item.color + ';opacity:0.4;',
                  'left:50%;top:50%;transform:translate(-50%,-50%);',
                  'pointer-events:none;',
                  'animation:btn-ripple 0.5s ease-out forwards;'
                ].join(';');
                btn.appendChild(ripple);
                setTimeout(function() { ripple.remove(); }, 500);
                item.action(evt);
              });
    
              btn.dataset.angle = item.angle;
              btn.dataset.radius = itemRadius;
              radialMenu.appendChild(btn);
            })(menuItems[ii], ii);
          }
    
          document.body.appendChild(radialMenu);
    
          function positionRadialMenu() {
            if (!floatBall || !radialMenu) return;
            var ballRect = floatBall.getBoundingClientRect();
            var cx = ballRect.left + ballRect.width / 2;
            var cy = ballRect.top + ballRect.height / 2;
    
            radialMenu.style.left = '0';
            radialMenu.style.top = '0';
            radialMenu.style.width = window.innerWidth + 'px';
            radialMenu.style.height = window.innerHeight + 'px';
    
            var children = radialMenu.children;
            for (var ri = 0; ri < children.length; ri++) {
              var child = children[ri];
              if (child.dataset.angle !== undefined) {
                var ang = parseFloat(child.dataset.angle) * Math.PI / 180;
                var rad = parseFloat(child.dataset.radius) || itemRadius;
                var px = cx + Math.cos(ang) * rad;
                var py = cy + Math.sin(ang) * rad;
                child.style.left = px + 'px';
                child.style.top = py + 'px';
              }
            }
          }
    
          function toggleRadialMenu(show) {
            floatMenuVisible = show;
            if (show) {
              radialMenu.style.display = 'block';
              var items = radialMenu.querySelectorAll('button');
              for (var ai = 0; ai < items.length; ai++) {
                items[ai].style.opacity = '0';
                items[ai].style.transform = 'translate(-50%,-50%) scale(0.3)';
                items[ai].style.animation = 'none';
                void items[ai].offsetWidth;
                items[ai].style.animation = 'radial-item-in 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards';
                items[ai].style.animationDelay = (ai * 0.06) + 's';
              }
              setTimeout(positionRadialMenu, 10);
            } else {
              radialMenu.style.display = 'none';
            }
          }
    
          floatBall.addEventListener('click', function(e) {
            if (!floatMenuVisible && !fDragging) {
              toggleRadialMenu(true);
            } else {
              toggleRadialMenu(false);
            }
          });
    
          document.addEventListener('mousedown', function(e) {
            if (isMinimized && floatBall && !floatBall.contains(e.target) && (!radialMenu || !radialMenu.contains(e.target))) {
              toggleRadialMenu(false);
            }
          });
    
          var origOnTick = R.onTick;
          R.onTick = function(elapsed) {
            if (origOnTick) origOnTick(elapsed);
            if (floatTimeEl && isMinimized) {
              floatTimeEl.textContent = R.formatTime(elapsed);
            }
          };
    
          function updateFloatBallState(state) {
            if (!floatBall || !dotIcon) return;
            if (state.isPaused) {
              floatBall.style.animation = 'lg-float 6s ease-in-out infinite, ball-ring-static-yellow 2s ease-in-out infinite';
              dotIcon.textContent = '⏸';
              dotIcon.style.color = '#FF9500';
              dotIcon.style.textShadow = '0 0 12px rgba(255,149,0,0.7), 0 0 24px rgba(255,149,0,0.3)';
              dotIcon.style.animation = 'none';
            } else if (state.isRecording) {
              floatBall.style.animation = 'lg-float 6s ease-in-out infinite, ball-ring-breath-red 2s ease-in-out infinite';
              dotIcon.textContent = '●';
              dotIcon.style.color = '#FF3B30';
              dotIcon.style.textShadow = '0 0 12px rgba(255,59,48,0.7), 0 0 24px rgba(255,59,48,0.3)';
              dotIcon.style.animation = 'ball-dot-pulse 1.5s ease-in-out infinite';
            }
          }
    
          R.onStop = function() {
            if (isMinimized && floatBall) {
              floatBall.remove();
              if (radialMenu && radialMenu.parentNode) radialMenu.remove();
              floatBall = null;
              isMinimized = false;
              C.style.display = '';
            }
            updUI(R.getState());
            si.textContent = '✓';
            si.style.cssText = ['font-size:28px;margin-bottom:6px;','color:#34C759;filter:none;opacity:1;'].join(';');
            st.textContent = '已停止';
            st.style.color = '#34C759';
            setTimeout(function() {
              if (!R.isRecording && !R.isCountingDown) {
                si.textContent = '●';
                si.style.cssText = ['font-size:28px;margin-bottom:6px;','filter:grayscale(0.8);opacity:0.4;transition:all 0.3s ease;'].join(';');
                st.textContent = '就绪';
                st.style.color = 'rgba(255,255,255,0.85)';
              }
            }, 3000);
          };
    
          var fDragging = false;
          var fOffsetX = 0, fOffsetY = 0;
          floatBall.addEventListener('mousedown', function(e) {
            fDragging = true;
            fOffsetX = e.clientX - floatBall.offsetLeft;
            fOffsetY = e.clientY - floatBall.offsetTop;
            floatBall.style.transition = 'none';
            floatBall.style.animation = 'none';
            toggleRadialMenu(false);
            e.preventDefault();
          });
          document.addEventListener('mousemove', function(e) {
            if (!fDragging) return;
            floatBall.style.left = (e.clientX - fOffsetX) + 'px';
            floatBall.style.top = (e.clientY - fOffsetY) + 'px';
            floatBall.style.right = 'auto';
            if (floatMenuVisible) positionRadialMenu();
          });
          document.addEventListener('mouseup', function() {
            if (!fDragging) return;
            fDragging = false;
            floatBall.style.transition = 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease';
            floatBall.style.animation = 'lg-float 6s ease-in-out infinite, ball-ring-breath-red 2s ease-in-out infinite';
          });
    
          document.body.appendChild(floatBall);
        }
    
        function restoreFromFloat() {
          if (!isMinimized || !floatBall) return;
          isMinimized = false;
          collapsed = false;
          floatMenuVisible = false;
          var radialMenu = document.getElementById('float-radial-menu');
          if (floatBall) { floatBall.remove(); floatBall = null; }
          if (radialMenu && radialMenu.parentNode) radialMenu.remove();
          C.style.display = '';
          colBtn.textContent = '−';
          updUI(R.getState());
        }
    
    
        R.onTick = function(elapsed) {
          td.textContent = R.formatTime(elapsed);
        };
    
        R.onCountdownTick = function(remaining) {
          if (remaining > 0) {
            si.textContent = remaining.toString();
            si.style.cssText = [
              'font-size:56px;margin-bottom:6px;',
              'background:linear-gradient(135deg, #FF9500, #FF6B00);',
              '-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;',
              'font-weight:800;animation:lg-countdown-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);',
              'filter:none;opacity:1;'
            ].join(';');
            st.textContent = '即将开始录制…';
            st.style.color = '#FF9500';
            td.style.display = 'none';
            mi.style.display = 'none';
          } else {
            si.textContent = '●';
            si.style.cssText = [
              'font-size:28px;margin-bottom:6px;',
              'color:#FF3B30;filter:none;opacity:1;',
              'transition:all 0.3s ease;'
            ].join(';');
            st.textContent = '录制中…';
            st.style.color = '#FF3B30';
            td.style.fontSize = '24px';
            td.style.color = '#1d1d1f';
            td.style.animation = '';
          }
        };
    
        function updUI(state) {
          var rec = state.isRecording;
          var pau = state.isPaused;
          var counting = state.isCountingDown;
    
          rBtn.disabled = rec || counting;
          pBtn.disabled = !rec || counting;
          sBtn.disabled = !rec || counting;
    
          if (counting) {
            rBtn.style.cssText = makeRecBtn(true, false);
            rBtn.textContent = '倒计中';
            pBtn.style.cssText = makePauseBtn(true);
            sBtn.style.cssText = makeCancelBtn();
            sBtn.textContent = '取消';
          } else if (rec) {
            rBtn.style.cssText = makeRecBtn(true, true);
            pBtn.style.cssText = makePauseBtn(pau);
            pBtn.textContent = pau ? '继续' : '暂停';
            sBtn.style.cssText = makeStopBtn(false);
            si.textContent = pau ? '⏸' : '●';
            si.style.cssText = [
              'font-size:28px;margin-bottom:6px;',
              'color:' + (pau ? '#FF9500' : '#FF3B30') + ';',
              'filter:none;opacity:1;transition:all 0.3s ease;'
            ].join(';');
            st.textContent = pau ? '已暂停' : '录制中…';
            st.style.color = pau ? '#FF9500' : '#FF3B30';
            td.style.display = 'block';
            td.style.fontSize = '24px';
            td.style.color = '#1d1d1f';
            mi.style.display = 'block';
            var an = { none: '静音', system: '系统声音', mic: '麦克风', both: '混合' };
            var am = an[state.audioSource] || state.audioSource;
            var mn = getMN(state.currentMode);
            var qn = getQN(state.quality);
            mi.textContent = mn + ' · ' + qn + ' · ' + am;
            mi.style.color = '#007AFF';
          } else {
            rBtn.style.cssText = makeRecBtn(false);
            rBtn.textContent = '开始录制';
            pBtn.style.cssText = makePauseBtn(true);
            pBtn.textContent = '暂停';
            sBtn.style.cssText = makeStopBtn(true);
            sBtn.textContent = '停止';
            si.textContent = '●';
            si.style.cssText = [
              'font-size:28px;margin-bottom:6px;',
              'filter:grayscale(0.8);opacity:0.4;transition:all 0.3s ease;'
            ].join(';');
            st.textContent = '就绪';
            st.style.color = 'rgba(255,255,255,0.85)';
            td.style.display = 'none';
            mi.style.display = 'none';
          }
        }
    
        rBtn.addEventListener('click', async function() {
          si.textContent = '⏳';
          si.style.cssText = [
            'font-size:28px;margin-bottom:6px;',
            'color:#007AFF;filter:none;opacity:1;transition:all 0.3s ease;'
          ].join(';');
          st.textContent = '等待系统授权…';
          st.style.color = '#007AFF';
          td.style.display = 'none';
          mi.style.display = 'none';
          rBtn.disabled = true;
          rBtn.style.cssText = makeRecBtn(true, false);
          rBtn.textContent = '授权中';
    
          var prep = await R.prepareStream(selMode, qSel.value, selAudio);
    
          if (!prep.ok) {
            si.textContent = '✕';
            si.style.cssText = [
              'font-size:28px;margin-bottom:6px;',
              'color:#FF3B30;filter:none;opacity:1;'
            ].join(';');
            st.textContent = prep.error || '启动失败';
            st.style.color = '#FF3B30';
            setTimeout(function() {
              if (!R.isRecording && !R.isCountingDown) {
                updUI(R.getState());
              }
            }, 3000);
            return;
          }
    
          var started = await R.startCountdown(R.countdownSeconds);
          if (!started) {
            R.cleanup();
            si.textContent = '●';
            si.style.cssText = [
              'font-size:28px;margin-bottom:6px;',
              'filter:grayscale(0.8);opacity:0.4;transition:all 0.3s ease;'
            ].join(';');
            st.textContent = '已取消';
            st.style.color = 'rgba(255,255,255,0.85)';
            td.style.display = 'none';
            mi.style.display = 'none';
            updUI(R.getState());
            setTimeout(function() {
              if (!R.isRecording && !R.isCountingDown) {
                st.textContent = '就绪';
                updUI(R.getState());
              }
            }, 1500);
            return;
          }
    
          var res = R.beginRecording();
          if (res.ok) {
            updUI(R.getState());
            setTimeout(function() { showFloatingBall(); }, 300);
          } else {
            si.textContent = '✕';
            si.style.cssText = [
              'font-size:28px;margin-bottom:6px;',
              'color:#FF3B30;filter:none;opacity:1;'
            ].join(';');
            st.textContent = res.error || '录制启动失败';
            st.style.color = '#FF3B30';
            setTimeout(function() { updUI(R.getState()); }, 3000);
          }
        });
    
        pBtn.addEventListener('click', function() {
          if (R.isPaused) {
            R.resumeRecording();
          } else {
            R.pauseRecording();
          }
          updUI(R.getState());
        });
    
        sBtn.addEventListener('click', function() {
          if (R.isCountingDown) {
            R.cancelCountdown();
          } else {
            var sv = R.stopRecording();
            updUI(R.getState());
            if (sv) {
              si.textContent = '✓';
              si.style.cssText = [
                'font-size:28px;margin-bottom:6px;',
                'color:#34C759;filter:none;opacity:1;'
              ].join(';');
              var extTag = sv.filename.indexOf('.mp4') !== -1 ? 'MP4' : 'WebM';
              st.textContent = '已保存 ' + fSize(sv.size) + ' · ' + extTag;
              st.style.color = '#34C759';
              setTimeout(function() {
                si.textContent = '●';
                si.style.cssText = [
                  'font-size:28px;margin-bottom:6px;',
                  'filter:grayscale(0.8);opacity:0.4;transition:all 0.3s ease;'
                ].join(';');
                st.textContent = '就绪';
                st.style.color = 'rgba(255,255,255,0.85)';
              }, 3500);
            }
          }
        });
    
        var collapsed = false;
        colBtn.addEventListener('click', function() {
          if (!collapsed) {
            collapsed = true;
            showFloatingBall();
            colBtn.textContent = '+';
          } else {
            collapsed = false;
            restoreFromFloat();
            colBtn.textContent = '−';
          }
        });
    
        clsBtn.addEventListener('click', function() {
          if (R.isCountingDown) R.cancelCountdown();
          if (R.isRecording) R.stopRecording();
          C.remove();
        });
    
        var dragging = false;
        var dragOffsetX = 0;
        var dragOffsetY = 0;
    
        H.addEventListener('mousedown', function(e) {
          if (e.target.tagName === 'BUTTON') return;
          dragging = true;
          dragOffsetX = e.clientX - C.offsetLeft;
          dragOffsetY = e.clientY - C.offsetTop;
          C.style.transition = 'none';
        });
    
        document.addEventListener('mousemove', function(e) {
          if (!dragging) return;
          C.style.left = (e.clientX - dragOffsetX) + 'px';
          C.style.top = (e.clientY - dragOffsetY) + 'px';
          C.style.right = 'auto';
        });
    
        document.addEventListener('mouseup', function() {
          dragging = false;
          C.style.transition = 'all 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        });
    
        document.body.appendChild(C);
    
        return {
          ok: true,
          summary: 'Yuze 录屏工具 v3.2.1 (文件名中文版) 已启动 — 导出视频文件名格式：录屏_年月日_时分秒',
          features: [
            'iOS 26 液态玻璃设计系统',
            '标签页/全屏/窗口录制',
            '原画/高清/标清画质',
            '静音/系统声音/麦克风/混合音频',
            '3-10秒可调倒计时（授权后触发）',
            'MP4优先输出',
            '★ v3.2 小球重设计 ★',
            '  - 72px 大球体 + 动态渐变光环边框',
            '  - 脉冲动画圆环替代静态红点',
            '  - 环形放射状弹出菜单（围绕小球展开）',
            '  - 每个操作按钮带图标+微交互动画',
            '  - 状态指示外环（录制中=红色呼吸，暂停=黄色静止）',
            '  - 扫描光泽线动效',
            '  - 点击涟漪反馈',
            '★ v3.2.1 文件名优化 ★',
            '  - 导出视频自动命名为「录屏_YYYY年MM月DD日_HH时MM分SS秒」'
          ],
          panelId: 'Yuze-recorder-panel',
          designSystem: 'Apple iOS 26 Liquid Glass + Custom Ball Redesign',
          version: '3.2.1',
          changelog: 'v3.2.1: 导出文件名改为中文时间格式「录屏_年月日_时分秒」，更直观易读'
        };
      }
    
      return createRecorderUI();
    }
  );
  if (typeof __tabOriginalFunction !== "function") {
    throw new Error("evaluate_script source must evaluate to a function");
  }
  return await __tabOriginalFunction();
})();