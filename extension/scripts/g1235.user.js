(function() {
  'use strict';

  if (window.__biliFPS) return;
  window.__biliFPS = true;

  // ============ 样式 ============
  const style = document.createElement('style');
  style.textContent = `
    .bili-fps-box {
      position: absolute; top: 10px; right: 10px; z-index: 99999;
      pointer-events: none; font-family: monospace;
      display: flex; flex-direction: column; align-items: flex-end; gap: 6px;
    }
    .bili-fps-badge {
      font-size: 14px; font-weight: bold; color: #fff;
      background: rgba(0,0,0,0.75); padding: 6px 12px;
      border-radius: 6px; border: 1px solid rgba(255,255,255,0.2);
      min-width: 105px; 
      text-align: center;
      backdrop-filter: blur(4px);
      transition: all 0.3s;
    }
    .bili-speed-badge {
      font-size: 12px; color: #fff;
      background: rgba(0,0,0,0.75); padding: 4px 10px;
      border-radius: 4px; border: 1px solid rgba(255,255,255,0.2);
      backdrop-filter: blur(4px);
      transition: opacity 0.3s ease-in-out, background 0.3s;
      opacity: 0; 
    }
    .bili-warning-badge {
      font-size: 12px; color: #fff; font-weight: bold;
      background: rgba(231, 76, 60, 0.9); padding: 4px 10px;
      border-radius: 4px; border: 1px solid rgba(255,255,255,0.3);
      backdrop-filter: blur(4px);
      transition: opacity 0.3s ease-in-out;
      opacity: 0; 
    }
    .speed-tip-style {
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.85); color: #fff;
      font-size: 48px; font-weight: bold; padding: 16px 32px;
      border-radius: 12px; z-index: 2147483647;
      pointer-events: none; transition: opacity 0.3s;
      font-family: Arial, sans-serif;
      text-shadow: 0 2px 4px rgba(0,0,0,0.5);
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      opacity: 0;
    }
    .bili-fps-badge.s0 { color: #999; }
    .bili-fps-badge.s1 { color: #ff6b6b; }
    .bili-fps-badge.s2 { color: #feca57; }
    .bili-fps-badge.s3 { color: #1dd1a1; }
  `;
  document.head.appendChild(style);

  // ============ 核心监控类 ============
  function FPSMonitor(video) {
    this.v = video;
    this.running = false;
    this.rafId = null;

    this.display = null;
    this.speedDisplay = null;
    this.warningDisplay = null;
    this.centerTip = null;
    this.speedTimeout = null;

    // 暗线与明线
    this.fps = 0; 
    this.sampleStart = 0;     
    this.lastTotalFrames = 0; 
    this.SAMPLE_MS = 250;     

    this.uiFps = 0;
    this.uiSampleStart = 0;
    this.uiLastTotalFrames = 0;
    this.UI_SAMPLE_MS = 1000; 

    this.startupSamples = []; 
    this.baselineA = null;    
    this.stutterHistory = []; 
    this.skipSamples = 0; 

    // 【天花板锁定与降级回升状态】
    this.initialQualityIndex = -1;  
    this.hasAutoDowngraded = false; 
    this.speedAtDowngrade = 1.0;    
    
    this.ascendStartTime = 0; 
    this.warningStartTime = 0;      
    this.freezeDowngrade = false;       

    this.pendingRestoreSpeed = null; 
    this.expectedRateChange = null; 
    this.isAutoClicking = false; 
    this.isWaitingForQuality = false;
    this.qualityWaitEndTime = 0;

    this.isBuffering = false;
    this.bufferingWaitEndTime = 0;

    this.createUI();
    this.bindEvents();
    this.setupKeyboard(); 
    
    if (!video.paused) this.start();
  }

  FPSMonitor.prototype.createUI = function() {
    var c = this.v.parentElement;
    for (var i = 0; i < 8; i++) {
      if (!c) break;
      if (/bpx-player-video-wrap|bilibili-player-video-wrap|bpx-player-container/i.test(c.className||'')) break;
      c = c.parentElement;
    }
    if (!c) c = this.v.parentElement;
    if (c) {
      var cs = getComputedStyle(c);
      if (cs.position === 'static') c.style.position = 'relative';
    }

    var box = document.createElement('div');
    box.className = 'bili-fps-box';
    
    this.display = document.createElement('div');
    this.display.className = 'bili-fps-badge s0';
    this.display.textContent = 'FPS: --';
    
    this.speedDisplay = document.createElement('div');
    this.speedDisplay.className = 'bili-speed-badge';
    
    this.warningDisplay = document.createElement('div');
    this.warningDisplay.className = 'bili-warning-badge';
    this.warningDisplay.textContent = '视频卡顿，请降低画质或降速';

    box.appendChild(this.display);
    box.appendChild(this.speedDisplay);
    box.appendChild(this.warningDisplay);
    if (c) c.appendChild(box);

    this.centerTip = document.createElement('div');
    this.centerTip.className = 'speed-tip-style';
    document.body.appendChild(this.centerTip);
  };

  FPSMonitor.prototype.showSystemMsg = function(msg, bgColor, isKeyboard = false) {
    if (isKeyboard) {
      this.centerTip.textContent = msg.replace('已开启 ', '').replace('倍速', 'x');
      this.centerTip.style.opacity = '1';
    } else {
      this.speedDisplay.textContent = msg;
      this.speedDisplay.style.background = bgColor || 'rgba(0,0,0,0.75)';
      this.speedDisplay.style.opacity = '1'; 
    }

    if (this.speedTimeout) clearTimeout(this.speedTimeout);
    var self = this;
    this.speedTimeout = setTimeout(function() {
      if (self.centerTip) self.centerTip.style.opacity = '0';
      if (self.speedDisplay) self.speedDisplay.style.opacity = '0';
      setTimeout(function(){ 
          if (self.speedDisplay) self.speedDisplay.style.background = 'rgba(0,0,0,0.75)'; 
      }, 300);
    }, isKeyboard ? 800 : 2500);
  };

  FPSMonitor.prototype.resetMonitorState = function(reason) {
    this.baselineA = null;
    this.startupSamples = [];
    this.stutterHistory = [];
    this.skipSamples = 2; 
    this.isBuffering = false; 
    this.sampleStart = 0; 
    this.uiSampleStart = 0; 
    this.uiFps = 0;
    this.ascendStartTime = 0; 
    this.warningStartTime = 0; 
    if (reason) console.log(`[B站帧探] 由于${reason}，测算基准重新开始`);
  };

  FPSMonitor.prototype.getCurrentQualityIndex = function() {
    var items = document.querySelectorAll('.bpx-player-ctrl-quality-menu .bpx-player-ctrl-quality-menu-item');
    if (!items || items.length === 0) return -1;
    for (var i = 0; i < items.length; i++) {
        if (items[i].classList.contains('bpx-state-active')) return i;
    }
    return -1;
  };

  // ============ 【倍速统一接管中枢】 ============
  FPSMonitor.prototype.requestSpeedChange = function(targetSpeed, isKeyboard) {
    targetSpeed = Math.round(targetSpeed * 100) / 100;
    targetSpeed = Math.max(0.1, Math.min(16, targetSpeed));
    var isRestartingFlow = false;

    // 清空卡顿历史，防止上一档速度的卡顿拖累新速度
    this.stutterHistory = [];
    this.warningStartTime = 0;

    // 豁免权破冰
    if (this.freezeDowngrade && targetSpeed === 1.0) {
        this.freezeDowngrade = false;
        isRestartingFlow = true;
        this.resetMonitorState("破冰重启");
    }

    // 【秒速回升机制】：只要主观降速达标，瞬间拉满回升计时器，消灭 7 秒等待
    if (this.hasAutoDowngraded && (this.speedAtDowngrade - targetSpeed >= 0.15)) {
        // 将计时器推前 8 秒，下一次循环必定越过 7 秒判定线触发回升
        this.ascendStartTime = performance.now() - 8000; 
    } else {
        this.ascendStartTime = 0; 
    }

    if (!this.baselineA) {
        this.pendingRestoreSpeed = targetSpeed;
        
        // 发放内部调整防伪令牌
        if (this.v.playbackRate !== 1.0) {
            this.expectedRateChange = 1.0;
            this.v.playbackRate = 1.0;
        }

        if (isRestartingFlow) {
            this.showSystemMsg('重置1倍速，重启自动降级', 'rgba(52, 152, 219, 0.9)', isKeyboard);
        } else {
            if (targetSpeed === 1.0) {
                this.showSystemMsg('缓冲测算中，保持 1.0x', 'rgba(231, 76, 60, 0.9)', isKeyboard);
            } else {
                this.showSystemMsg('缓冲测算中，已记录 ' + targetSpeed + 'x', 'rgba(231, 76, 60, 0.9)', isKeyboard);
            }
        }
    } else {
        if (this.v.playbackRate !== targetSpeed) {
            this.expectedRateChange = targetSpeed;
            this.v.playbackRate = targetSpeed;
        }

        if (isRestartingFlow) {
            this.showSystemMsg('重置1倍速，重启自动降级', 'rgba(52, 152, 219, 0.9)', isKeyboard);
        } else {
            this.showSystemMsg('已开启 ' + targetSpeed + ' 倍速', null, isKeyboard);
        }
    }
  };

  FPSMonitor.prototype.ensureOneSpeed = function() {
    if (this.v.playbackRate !== 1.0) {
      this.pendingRestoreSpeed = this.v.playbackRate;
      this.expectedRateChange = 1.0; 
      this.v.playbackRate = 1.0;
    }
  };

  FPSMonitor.prototype.setupKeyboard = function() {
    const self = this;
    document.addEventListener('keydown', function(e) {
      const tag = e.target.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return;

      const key = e.key;
      const isNumpad = e.location === 3; 
      let targetSpeed = null;

      if (/^[1-9]$/.test(key) && !isNumpad) targetSpeed = parseInt(key);
      else if (key === '0' && !isNumpad) targetSpeed = 10;
      else if (key === '+' || key === '=' || key === 'Add') {
        targetSpeed = Math.round((self.v.playbackRate + 0.1) * 10) / 10;
      }
      else if (key === '-' || key === 'Subtract') {
        targetSpeed = Math.round((self.v.playbackRate - 0.1) * 10) / 10;
      }

      if (targetSpeed !== null) {
        e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
        self.requestSpeedChange(targetSpeed, true);
      }
    }, true); 
  };

  FPSMonitor.prototype.biliLowerQuality = function() {
    var items = document.querySelectorAll('.bpx-player-ctrl-quality-menu .bpx-player-ctrl-quality-menu-item');
    if (!items || items.length === 0) return -1;
    for (var i = 0; i < items.length; i++) {
      if (items[i].classList.contains('bpx-state-active')) {
        if (i + 1 < items.length) {
          this.isAutoClicking = true; 
          items[i + 1].click(); 
          var self = this; setTimeout(function(){ self.isAutoClicking = false; }, 100);
          return i;             
        }
        return -1; 
      }
    }
    return -1;
  };

  FPSMonitor.prototype.biliStepUpQuality = function() {
    var items = document.querySelectorAll('.bpx-player-ctrl-quality-menu .bpx-player-ctrl-quality-menu-item');
    if (!items || items.length === 0) return -1;
    for (var i = 0; i < items.length; i++) {
      if (items[i].classList.contains('bpx-state-active')) {
        if (i > 0) { 
          this.isAutoClicking = true; 
          items[i - 1].click();
          var self = this; setTimeout(function(){ self.isAutoClicking = false; }, 100);
          return i - 1; 
        }
        return -1;
      }
    }
    return -1;
  };

  FPSMonitor.prototype.startAscend = function() {
    var newIdx = this.biliStepUpQuality();
    if (newIdx !== -1) {
      this.resetMonitorState("画质自动回升");
      this.isWaitingForQuality = true;
      this.qualityWaitEndTime = performance.now() + 10000;
      this.warningStartTime = 0;
      this.warningDisplay.style.opacity = '0';
      this.ascendStartTime = 0;
      
      this.ensureOneSpeed(); 

      if (newIdx <= this.initialQualityIndex) {
        var currentActiveSpeed = (this.pendingRestoreSpeed !== null) ? this.pendingRestoreSpeed : this.v.playbackRate;
        if (currentActiveSpeed !== 1.0) {
            this.freezeDowngrade = true;
            this.showSystemMsg('已回升至初始画质，锁定不降级', 'rgba(155, 89, 182, 0.9)');
        } else {
            this.showSystemMsg('已回升至初始画质，等待重测', 'rgba(29, 209, 161, 0.9)');
        }
        this.hasAutoDowngraded = false; 
      } else {
        this.showSystemMsg('回升一档画质，等待10秒再测', 'rgba(29, 209, 161, 0.9)');
      }
    }
  };

  FPSMonitor.prototype.bindEvents = function() {
    var self = this;
    this.v.addEventListener('play',  function(){ self.start(); });
    
    this.v.addEventListener('pause', function(){ 
      self.stop(); 
      if (!self.baselineA) {
        self.resetMonitorState("视频暂停");
      }
    });

    this.v.addEventListener('seeking', function() {
      if (!self.baselineA) {
        self.resetMonitorState("拖动进度条");
        self.isBuffering = true;
        self.bufferingWaitEndTime = performance.now() + 3000;
        self.ensureOneSpeed(); 
      }
    });

    this.v.addEventListener('ended', function(){ self.stop(); });
    
    this.v.addEventListener('ratechange', function(){ 
      var newSpeed = self.v.playbackRate;
      // 过滤脚本自己发出的防伪令牌，彻底阻断延迟带来的幽灵重置事件
      if (self.expectedRateChange !== null && Math.abs(self.expectedRateChange - newSpeed) < 0.05) {
          self.expectedRateChange = null;
          return;
      }
      self.requestSpeedChange(newSpeed, false);
    });

    // 【新增逻辑：全屏/取消全屏打断测算】
    var onFullscreenChange = function() {
      if (!self.baselineA) {
        self.resetMonitorState("全屏状态切换");
        // 给予 3 秒的缓冲期来稳定因重绘导致的瞬时掉帧
        self.isBuffering = true;
        self.bufferingWaitEndTime = performance.now() + 3000;
        self.ensureOneSpeed(); 
      }
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);

    document.addEventListener('click', function(e) {
      var target = e.target;
      while (target && target.classList) {
        if (target.classList.contains('bpx-player-ctrl-quality-menu-item')) {
          if (self.isAutoClicking) return; 

          self.resetMonitorState("手动切换画质");
          self.warningStartTime = 0;
          self.warningDisplay.style.opacity = '0';
          
          self.hasAutoDowngraded = false; 
          self.ascendStartTime = 0;

          setTimeout(function() {
              self.initialQualityIndex = self.getCurrentQualityIndex();
          }, 500);

          var currentActiveSpeed = (self.pendingRestoreSpeed !== null) ? self.pendingRestoreSpeed : self.v.playbackRate;

          if (currentActiveSpeed !== 1.0) {
              self.freezeDowngrade = true;
              self.showSystemMsg('倍速手动切画质，已锁定不自动降级', 'rgba(155, 89, 182, 0.9)');
          } else {
              self.freezeDowngrade = false; 
              self.showSystemMsg('手动切换画质，等待10秒重测', 'rgba(52, 152, 219, 0.9)');
          }

          self.ensureOneSpeed(); 
          self.isWaitingForQuality = true;
          self.qualityWaitEndTime = performance.now() + 10000;
          break;
        }
        target = target.parentElement;
      }
    }, true); 
  };

  FPSMonitor.prototype.start = function() {
    if (this.running) return;
    this.running = true;
    
    if (!this.baselineA) {
        this.skipSamples = 2; 
        this.ensureOneSpeed(); 
    }
    
    this.sampleStart = 0; 
    this.uiSampleStart = 0;
    
    if (this.v.requestVideoFrameCallback) {
        this.rafId = this.v.requestVideoFrameCallback(this.loop.bind(this));
    } else {
        this.rafId = requestAnimationFrame(this.loop.bind(this));
    }
  };

  FPSMonitor.prototype.stop = function() {
    if (!this.running) return;
    this.running = false;
    if (this.rafId) { 
        if (this.v.cancelVideoFrameCallback) {
            this.v.cancelVideoFrameCallback(this.rafId);
        } else {
            cancelAnimationFrame(this.rafId); 
        }
        this.rafId = null; 
    }
    this.display.textContent = !this.baselineA ? '测算暂停' : 'FPS: --';
    this.display.className = 'bili-fps-badge s0';
  };

  FPSMonitor.prototype.loop = function(now, metadata) {
    if (!this.running || this.v.paused) {
      this.rafId = null;
      return;
    }

    var currentFrames = 0;
    var currentTime = performance.now(); 

    if (this.initialQualityIndex === -1) {
        this.initialQualityIndex = this.getCurrentQualityIndex();
    }

    if (this.v.getVideoPlaybackQuality) {
        currentFrames = this.v.getVideoPlaybackQuality().totalVideoFrames;
    } else if (metadata) {
        currentFrames = metadata.presentedFrames;
    }

    if (metadata && metadata.expectedDisplayTime) {
        currentTime = metadata.expectedDisplayTime;
    }

    if (this.sampleStart === 0) {
        this.sampleStart = currentTime;
        this.lastTotalFrames = currentFrames;
    }
    if (this.uiSampleStart === 0) {
        this.uiSampleStart = currentTime;
        this.uiLastTotalFrames = currentFrames;
    }

    var elapsed = currentTime - this.sampleStart;
    var uiElapsed = currentTime - this.uiSampleStart;

    if (uiElapsed >= this.UI_SAMPLE_MS) {
        var uiFramesSinceLast = currentFrames - this.uiLastTotalFrames;
        if (uiFramesSinceLast < 0) uiFramesSinceLast = 0;
        
        if (uiElapsed > 0) {
            this.uiFps = Math.round((uiFramesSinceLast / (uiElapsed / 1000)) * 100) / 100;
        }
        
        this.uiSampleStart = currentTime;
        this.uiLastTotalFrames = currentFrames;
    }
    
    if (elapsed >= this.SAMPLE_MS) {
      var framesSinceLast = currentFrames - this.lastTotalFrames;
      if (framesSinceLast < 0) framesSinceLast = 0;

      if (elapsed > 0) {
          this.fps = (framesSinceLast / (elapsed / 1000));
      } else {
          this.fps = 0;
      }
      
      this.sampleStart = currentTime;
      this.lastTotalFrames = currentFrames;

      // ================= 阶段 1：基准测算 =================
      if (!this.baselineA) {
        if (this.isWaitingForQuality) {
          var waitLeftQ = Math.ceil((this.qualityWaitEndTime - currentTime) / 1000);
          if (waitLeftQ > 0) {
            this.display.textContent = '切换中 ' + waitLeftQ + 's';
            this.display.className = 'bili-fps-badge s2'; 
          } else {
            this.isWaitingForQuality = false;
          }
        } 
        else if (this.isBuffering) {
          var waitLeftB = Math.ceil((this.bufferingWaitEndTime - currentTime) / 1000);
          if (waitLeftB > 0) {
            this.display.textContent = '缓冲中 ' + waitLeftB + 's';
            this.display.className = 'bili-fps-badge s0';
          } else {
            this.isBuffering = false;
          }
        }
        else {
          if (this.skipSamples > 0) {
            this.skipSamples--;
            this.display.textContent = '稳定流...';
            this.display.className = 'bili-fps-badge s0';
          } else if (this.fps >= 10) {
            this.startupSamples.push(this.fps);
            this.display.textContent = '测算中 ' + this.startupSamples.length + '/10';
            this.display.className = 'bili-fps-badge s2'; 

            if (this.startupSamples.length >= 10) {
              var sum = 0;
              for(var i=0; i<10; i++) sum += this.startupSamples[i];
              this.baselineA = sum / 10; 
              this.display.textContent = '基准就绪';

              if (this.pendingRestoreSpeed !== null) {
                if (this.pendingRestoreSpeed !== 1.0) {
                    var targetSpeed = this.pendingRestoreSpeed;
                    this.pendingRestoreSpeed = null; 
                    
                    this.expectedRateChange = targetSpeed;
                    this.v.playbackRate = targetSpeed;
                    
                    this.showSystemMsg('测算完成，自动恢复 ' + targetSpeed + ' 倍速', 'rgba(29, 209, 161, 0.9)');
                } else {
                    this.pendingRestoreSpeed = null; 
                }
              }
            }
          } else {
            this.display.textContent = '等待载入...';
            this.display.className = 'bili-fps-badge s0';
          }
        }
      } 
      // ================= 阶段 2：诊断与画质管理 =================
      else {
        var rateB = this.v.playbackRate;
        var targetT = this.baselineA * rateB; 

        var displayFps = this.uiFps > 0 ? this.uiFps : this.fps;

        if (displayFps > 0) {
          if (displayFps < 24) this.display.className = 'bili-fps-badge s1';
          else if (displayFps < 45) this.display.className = 'bili-fps-badge s2';
          else this.display.className = 'bili-fps-badge s3';
        } else {
          this.display.className = 'bili-fps-badge s1';
        }
        
        this.display.textContent = 'FPS: ' + displayFps.toFixed(2);

        if (this.fps < targetT - 5 && this.fps >= 10) {
          this.stutterHistory.push(1); 
        } else {
          this.stutterHistory.push(0); 
        }

        if (this.stutterHistory.length > 20) {
          this.stutterHistory.shift();
        }

        var stutterCount = 0;
        for (var j = 0; j < this.stutterHistory.length; j++) {
          stutterCount += this.stutterHistory[j];
        }

        var isWarning = stutterCount >= 6; 
        var currentActiveSpeed = (this.pendingRestoreSpeed !== null) ? this.pendingRestoreSpeed : this.v.playbackRate;

        if (isWarning) {
          this.ascendStartTime = 0; 
          this.warningDisplay.style.opacity = '1';
          
          if (this.warningStartTime === 0) {
            this.warningStartTime = currentTime;
          } else if (currentTime - this.warningStartTime >= 7000) {
            if (!this.freezeDowngrade) {
              var prevIdx = this.biliLowerQuality();
              if (prevIdx !== -1) {
                this.hasAutoDowngraded = true; 
                this.speedAtDowngrade = currentActiveSpeed;
                
                this.resetMonitorState("持续卡顿自动降级");
                this.warningStartTime = 0;
                this.warningDisplay.style.opacity = '0';
                
                this.ensureOneSpeed(); 
                this.isWaitingForQuality = true;
                this.qualityWaitEndTime = performance.now() + 10000;
                this.showSystemMsg('持续卡顿，降画质并等待10秒', 'rgba(231, 76, 60, 0.9)');
              } else {
                this.warningStartTime = currentTime; 
              }
            }
          }
        } else {
          this.warningDisplay.style.opacity = '0';
          this.warningStartTime = 0; 
          
          var isSpeedReducedEnough = this.hasAutoDowngraded && ((this.speedAtDowngrade - currentActiveSpeed) >= 0.15);

          if (this.initialQualityIndex !== -1 && this.getCurrentQualityIndex() > this.initialQualityIndex && isSpeedReducedEnough) {
              if (this.ascendStartTime === 0) {
                  this.ascendStartTime = currentTime;
              } else if (currentTime - this.ascendStartTime >= 7000) {
                  if (!this.isWaitingForQuality && !this.isBuffering) {
                      this.startAscend();
                  }
              }
          } else {
              this.ascendStartTime = 0;
          }
        }
      }
    }

    if (this.v.requestVideoFrameCallback) {
        this.rafId = this.v.requestVideoFrameCallback(this.loop.bind(this));
    } else {
        this.rafId = requestAnimationFrame(this.loop.bind(this));
    }
  };

  FPSMonitor.prototype.updateUI = function(cls) {
    this.display.className = 'bili-fps-badge ' + cls;
  };

  function findAndStart() {
    var selectors = ['.bpx-player-video-wrap video', '#bilibiliPlayer video', 'video'];
    for (var i = 0; i < selectors.length; i++) {
      var v = document.querySelector(selectors[i]);
      if (v && v.tagName === 'VIDEO') { window.__fpsMonitor = new FPSMonitor(v); return; }
    }
    setTimeout(findAndStart, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function(){ setTimeout(findAndStart, 500); });
  } else {
    setTimeout(findAndStart, 500);
  }
})();