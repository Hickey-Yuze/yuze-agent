(async function __tabEvaluateScriptBridge() {
  const __tabScriptArgs = null;
  const __tabOriginalFunction = (
    async function run(args) {
      // 梦幻音乐播放器 - 浅色系可拖动版本
      
      const containerId = 'dreamy-music-player-root';
      
      // 如果已存在则移除旧实例
      if (document.getElementById(containerId)) {
        document.getElementById(containerId).remove();
      }
    
      // 创建容器
      const container = document.createElement('div');
      container.id = containerId;
      container.innerHTML = `
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@300;400;500;600;700&display=swap');
          
          #${containerId} {
            --player-bg: rgba(255, 255, 255, 0.72);
            --player-border: rgba(255, 182, 213, 0.35);
            --accent-pink: #f5a6c3;
            --accent-lavender: #c8b6ff;
            --accent-mint: #a8e6cf;
            --accent-peach: #ffd3b6;
            --text-primary: #5a4a6a;
            --text-secondary: #9b8aa8;
            --shadow-soft: 0 8px 32px rgba(200, 182, 255, 0.2);
            
            position: fixed;
            top: 80px;
            right: 40px;
            width: 320px;
            font-family: 'Quicksand', -apple-system, sans-serif;
            z-index: 2147483647;
            user-select: none;
            cursor: default;
          }
          
          /* 玻璃态背景 */
          .dmp-wrapper {
            background: var(--player-bg);
            backdrop-filter: blur(20px) saturate(1.8);
            -webkit-backdrop-filter: blur(20px) saturate(1.8);
            border-radius: 24px;
            border: 1.5px solid var(--player-border);
            box-shadow: var(--shadow-soft), 
                        inset 0 1px 1px rgba(255,255,255,0.6);
            overflow: hidden;
            transition: box-shadow 0.4s ease, transform 0.3s ease;
          }
          
          .dmp-wrapper:hover {
            box-shadow: 0 12px 48px rgba(200, 182, 255, 0.32),
                        inset 0 1px 1px rgba(255,255,255,0.7);
            transform: translateY(-2px);
          }
          
          /* 拖动区域 */
          .dmp-header {
            padding: 16px 18px 10px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            cursor: grab;
            background: linear-gradient(135deg, 
              rgba(255, 230, 240, 0.35) 0%, 
              rgba(230, 240, 255, 0.25) 50%,
              rgba(245, 255, 250, 0.3) 100%);
            border-bottom: 1px solid rgba(255, 182, 213, 0.15);
            position: relative;
            overflow: hidden;
          }
          
          .dmp-header::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle at 30% 50%, 
              rgba(255, 182, 213, 0.08) 0%, transparent 60%);
            animation: dmp-shimmer 8s ease-in-out infinite;
            pointer-events: none;
          }
          
          .dmp-header:active { cursor: grabbing; }
          
          @keyframes dmp-shimmer {
            0%, 100% { transform: translate(0, 0) rotate(0deg); }
            33% { transform: translate(2%, 1%) rotate(1deg); }
            66% { transform: translate(-1%, 2%) rotate(-1deg); }
          }
          
          .dmp-title-area {
            display: flex;
            align-items: center;
            gap: 10px;
            position: relative;
            z-index: 1;
          }
          
          .dmp-icon {
            width: 36px;
            height: 36px;
            border-radius: 12px;
            background: linear-gradient(135deg, var(--accent-pink), var(--accent-lavender));
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 8px rgba(245, 166, 195, 0.35);
            animation: dmp-icon-pulse 3s ease-in-out infinite;
          }
          
          @keyframes dmp-icon-pulse {
            0%, 100% { transform: scale(1); box-shadow: 0 2px 8px rgba(245, 166, 195, 0.35); }
            50% { transform: scale(1.06); box-shadow: 0 4px 16px rgba(245, 166, 195, 0.5); }
          }
          
          .dmp-icon svg {
            width: 18px;
            height: 18px;
            fill: white;
          }
          
          .dmp-title-text h3 {
            margin: 0;
            font-size: 14px;
            font-weight: 700;
            color: var(--text-primary);
            letter-spacing: 0.3px;
          }
          
          .dmp-title-text p {
            margin: 2px 0 0;
            font-size: 11px;
            color: var(--text-secondary);
            font-weight: 400;
          }
          
          .dmp-close-btn {
            width: 26px;
            height: 26px;
            border-radius: 50%;
            border: none;
            background: rgba(255, 182, 213, 0.15);
            color: var(--text-secondary);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            transition: all 0.25s ease;
            position: relative;
            z-index: 1;
          }
          
          .dmp-close-btn:hover {
            background: rgba(255, 120, 150, 0.25);
            color: #e85a75;
            transform: rotate(90deg) scale(1.1);
          }
          
          /* 唱片区域 */
          .dmp-disc-area {
            padding: 18px 20px 14px;
            display: flex;
            align-items: center;
            gap: 16px;
            position: relative;
          }
          
          .dmp-disc {
            width: 76px;
            height: 76px;
            min-width: 76px;
            border-radius: 50%;
            background: 
              radial-gradient(circle at 50% 50%, 
                #fff 0%, #fff 16%, 
                transparent 17%, transparent 19%,
                var(--accent-lavender) 20%, var(--accent-pink) 45%,
                var(--accent-peach) 70%, var(--accent-mint) 90%,
                transparent 91%
              );
            box-shadow: 
              0 4px 20px rgba(200, 182, 255, 0.3),
              inset 0 2px 4px rgba(255,255,255,0.5),
              inset 0 -2px 4px rgba(0,0,0,0.05);
            position: relative;
            animation: dmp-disc-spin 12s linear infinite paused;
            transition: opacity 0.3s;
          }
          
          .dmp-disc.playing {
            animation-play-state: running;
          }
          
          .dmp-disc::before {
            content: '';
            position: absolute;
            top: 50%; left: 50%;
            width: 18px; height: 18px;
            margin: -9px 0 0 -9px;
            border-radius: 50%;
            background: linear-gradient(135deg, #fff, #f0e8fa);
            box-shadow: 0 1px 4px rgba(100, 80, 120, 0.2);
          }
          
          .dmp-disc::after {
            content: '';
            position: absolute;
            top: 50%; left: 50%;
            width: 6px; height: 6px;
            margin: -3px 0 0 -3px;
            border-radius: 50%;
            background: var(--accent-pink);
          }
          
          @keyframes dmp-disc-spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          
          /* 音波动画 */
          .dmp-wave-container {
            display: flex;
            align-items: flex-end;
            gap: 3px;
            height: 44px;
            padding-bottom: 2px;
          }
          
          .dmp-wave-bar {
            width: 4px;
            min-height: 4px;
            border-radius: 2px;
            background: linear-gradient(to top, var(--accent-pink), var(--accent-lavender));
            transition: height 0.15s ease;
            opacity: 0.4;
          }
          
          .dmp-wave-bar.active {
            animation: dmp-wave 0.8s ease-in-out infinite;
            opacity: 1;
          }
          
          .dmp-wave-bar:nth-child(odd).active { animation-duration: 0.65s; }
          .dmp-wave-bar:nth-child(3n).active { animation-duration: 0.95s; }
          .dmp-wave-bar:nth-child(4n).active { animation-duration: 0.55s; }
          
          @keyframes dmp-wave {
            0%, 100% { height: 6px; }
            50% { height: var(--wave-h, 28px); }
          }
          
          /* 歌曲信息 */
          .dmp-song-info {
            text-align: center;
            padding: 0 22px 10px;
          }
          
          .dmp-song-name {
            font-size: 15px;
            font-weight: 600;
            color: var(--text-primary);
            margin: 0 0 3px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          
          .dmp-artist-name {
            font-size: 12px;
            color: var(--text-secondary);
            margin: 0;
            font-weight: 400;
          }
          
          /* 进度条 */
          .dmp-progress-section {
            padding: 6px 22px 10px;
          }
          
          .dmp-progress-bar {
            width: 100%;
            height: 5px;
            background: rgba(200, 182, 255, 0.15);
            border-radius: 3px;
            cursor: pointer;
            position: relative;
            overflow: hidden;
          }
          
          .dmp-progress-fill {
            height: 100%;
            width: 0%;
            background: linear-gradient(90deg, var(--accent-pink), var(--accent-lavender), var(--accent-mint));
            border-radius: 3px;
            position: relative;
            transition: width 0.1s linear;
          }
          
          .dmp-progress-fill::after {
            content: '';
            position: absolute;
            right: -5px;
            top: -3px;
            width: 11px;
            height: 11px;
            border-radius: 50%;
            background: #fff;
            box-shadow: 0 1px 6px rgba(200, 182, 255, 0.5);
            opacity: 0;
            transform: scale(0.6);
            transition: all 0.2s ease;
          }
          
          .dmp-progress-bar:hover .dmp-progress-fill::after {
            opacity: 1;
            transform: scale(1);
          }
          
          .dmp-time-row {
            display: flex;
            justify-content: space-between;
            margin-top: 6px;
            font-size: 10.5px;
            color: var(--text-secondary);
            font-weight: 500;
          }
          
          /* 控制按钮 */
          .dmp-controls {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 14px;
            padding: 8px 22px 18px;
          }
          
          .dmp-btn {
            border: none;
            background: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
            border-radius: 50%;
            color: var(--text-primary);
          }
          
          .dmp-btn svg {
            width: 22px;
            height: 22px;
            fill: currentColor;
            transition: transform 0.25s ease;
          }
          
          .dmp-btn:hover {
            transform: scale(1.15);
          }
          
          .dmp-btn:hover svg {
            filter: drop-shadow(0 2px 4px rgba(200, 182, 255, 0.4));
          }
          
          .dmp-btn-small {
            width: 38px;
            height: 38px;
          }
          
          .dmp-btn-small svg { width: 18px; height: 18px; }
          
          .dmp-btn-play {
            width: 52px;
            height: 52px;
            background: linear-gradient(135deg, var(--accent-pink), var(--accent-lavender));
            color: white !important;
            box-shadow: 0 4px 16px rgba(245, 166, 195, 0.4);
          }
          
          .dmp-btn-play:hover {
            box-shadow: 0 6px 24px rgba(245, 166, 195, 0.55);
            transform: scale(1.08);
          }
          
          .dmp-btn-play svg {
            width: 24px;
            height: 24px;
            fill: white;
          }
          
          /* 音量控制 */
          .dmp-volume-row {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 0 22px 16px;
          }
          
          .dmp-volume-icon {
            width: 16px;
            height: 16px;
            min-width: 16px;
            fill: var(--text-secondary);
            cursor: pointer;
          }
          
          .dmp-volume-slider {
            flex: 1;
            height: 4px;
            -webkit-appearance: none;
            appearance: none;
            background: rgba(200, 182, 255, 0.15);
            border-radius: 2px;
            outline: none;
            cursor: pointer;
          }
          
          .dmp-volume-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 13px;
            height: 13px;
            border-radius: 50%;
            background: linear-gradient(135deg, var(--accent-pink), var(--accent-lavender));
            cursor: pointer;
            box-shadow: 0 1px 5px rgba(200, 182, 255, 0.4);
            transition: transform 0.2s ease;
          }
          
          .dmp-volume-slider::-webkit-slider-thumb:hover {
            transform: scale(1.2);
          }
          
          /* 星星装饰 */
          .dmp-stars {
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            pointer-events: none;
            overflow: hidden;
            border-radius: 24px;
          }
          
          .dmp-star {
            position: absolute;
            width: 4px;
            height: 4px;
            background: white;
            border-radius: 50%;
            opacity: 0;
            animation: dmp-twinkle 4s ease-in-out infinite;
          }
          
          @keyframes dmp-twinkle {
            0%, 100% { opacity: 0; transform: scale(0.5); }
            50% { opacity: 0.8; transform: scale(1); }
          }
          
          /* 隐藏的 audio 元素 */
          .dmp-audio-hidden { display: none; }
        </style>
        
        <div class="dmp-wrapper">
          <!-- 装饰星星 -->
          <div class="dmp-stars" id="dmpStars"></div>
          
          <!-- 头部拖动区 -->
          <div class="dmp-header" id="dmpHeader">
            <div class="dmp-title-area">
              <div class="dmp-icon">
                <svg viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
              </div>
              <div class="dmp-title-text">
                <h3>✨ Dreamy Player</h3>
                <p>梦幻音乐播放器</p>
              </div>
            </div>
            <button class="dmp-close-btn" id="dmpClose" title="关闭">✕</button>
          </div>
          
          <!-- 唱片 + 音波 -->
          <div class="dmp-disc-area">
            <div class="dmp-disc" id="dmpDisc"></div>
            <div class="dmp-wave-container" id="dmpWave"></div>
          </div>
          
          <!-- 歌曲信息 -->
          <div class="dmp-song-info">
            <div class="dmp-song-name" id="dmpSongName">🎵 选择音乐文件</div>
            <div class="dmp-artist-name" id="dmpArtistName">支持 MP3 / WAV / OGG</div>
          </div>
          
          <!-- 进度条 -->
          <div class="dmp-progress-section">
            <div class="dmp-progress-bar" id="dmpProgress">
              <div class="dmp-progress-fill" id="dmpProgressFill"></div>
            </div>
            <div class="dmp-time-row">
              <span id="dmpCurrentTime">0:00</span>
              <span id="dmpDuration">0:00</span>
            </div>
          </div>
          
          <!-- 控制按钮 -->
          <div class="dmp-controls">
            <button class="dmp-btn dmp-btn-small" id="dmpPrev" title="上一首">
              <svg viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
            </button>
            <button class="dmp-btn dmp-btn-play" id="dmpPlayBtn" title="播放/暂停">
              <svg viewBox="0 0 24 24" id="dmpPlayIcon"><path d="M8 5v14l11-7z"/></svg>
            </button>
            <button class="dmp-btn dmp-btn-small" id="dmpNext" title="下一首">
              <svg viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6z"/></svg>
            </button>
          </div>
          
          <!-- 文件选择 + 音量 -->
          <div style="padding: 0 22px 8px;">
            <label for="dmpFileInput" style="
              display: block;
              text-align: center;
              padding: 8px;
              background: linear-gradient(135deg, rgba(245,166,195,0.1), rgba(200,182,255,0.1));
              border: 1.5px dashed rgba(200,182,255,0.3);
              border-radius: 12px;
              cursor: pointer;
              font-size: 12px;
              color: var(--text-secondary);
              transition: all 0.3s ease;
              font-weight: 500;
            " id="dmpFileLabel">
              📂 点击选择音乐文件
            </label>
            <input type="file" accept="audio/*" class="dmp-audio-hidden" id="dmpFileInput" />
          </div>
          
          <div class="dmp-volume-row">
            <svg class="dmp-volume-icon" viewBox="0 0 24 24" id="dmpVolumeIcon">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
            </svg>
            <input type="range" class="dmp-volume-slider" id="dmpVolumeSlider" min="0" max="100" value="80" />
          </div>
          
          <!-- Audio 元素 -->
          <audio id="dmpAudio" preload="metadata"></audio>
        </div>
      `;
    
      document.body.appendChild(container);
    
      // ===== 初始化装饰星星 =====
      const starsContainer = container.querySelector('#dmpStars');
      for (let i = 0; i < 12; i++) {
        const star = document.createElement('div');
        star.className = 'dmp-star';
        star.style.left = Math.random() * 100 + '%';
        star.style.top = Math.random() * 100 + '%';
        star.style.animationDelay = Math.random() * 4 + 's';
        star.style.width = (2 + Math.random() * 3) + 'px';
        star.style.height = star.style.width;
        starsContainer.appendChild(star);
      }
    
      // ===== 初始化音波条 =====
      const waveContainer = container.querySelector('#dmpWave');
      const waveHeights = [12, 22, 16, 28, 20, 14, 26, 18, 24, 15, 21, 29, 17, 23];
      waveHeights.forEach((h, i) => {
        const bar = document.createElement('div');
        bar.className = 'dmp-wave-bar';
        bar.style.setProperty('--wave-h', h + 'px');
        bar.style.height = '4px';
        bar.style.animationDelay = (i * 0.07) + 's';
        waveContainer.appendChild(bar);
      });
    
      // ===== DOM 引用 =====
      const header = container.querySelector('#dmpHeader');
      const closeBtn = container.querySelector('#dmpClose');
      const disc = container.querySelector('#dmpDisc');
      const playBtn = container.querySelector('#dmpPlayBtn');
      const playIcon = container.querySelector('#dmpPlayIcon');
      const prevBtn = container.querySelector('#dmpPrev');
      const nextBtn = container.querySelector('#dmpNext');
      const progressBar = container.querySelector('#dmpProgress');
      const progressFill = container.querySelector('#dmpProgressFill');
      const currentTimeEl = container.querySelector('#dmpCurrentTime');
      const durationEl = container.querySelector('#dmpDuration');
      const songNameEl = container.querySelector('#dmpSongName');
      const artistNameEl = container.querySelector('#dmpArtistName');
      const fileInput = container.querySelector('#dmpFileInput');
      const fileLabel = container.querySelector('#dmpFileLabel');
      const volumeSlider = container.querySelector('#dmpVolumeSlider');
      const volumeIcon = container.querySelector('#dmpVolumeIcon');
      const audio = container.querySelector('#dmpAudio');
      const waveBars = waveContainer.querySelectorAll('.dmp-wave-bar');
    
      // ===== 工具函数 =====
      function formatTime(sec) {
        if (!isFinite(sec)) return '0:00';
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return m + ':' + (s < 10 ? '0' : '') + s;
      }
    
      // ===== 拖动功能 =====
      let isDragging = false;
      let dragOffsetX = 0;
      let dragOffsetY = 0;
    
      header.addEventListener('mousedown', (e) => {
        if (e.target === closeBtn || e.target.closest('#dmpClose')) return;
        isDragging = true;
        dragOffsetX = e.clientX - container.offsetLeft;
        dragOffsetY = e.clientY - container.offsetTop;
        header.style.cursor = 'grabbing';
        e.preventDefault();
      });
    
      document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        let newX = e.clientX - dragOffsetX;
        let newY = e.clientY - dragOffsetY;
        // 边界限制
        newX = Math.max(0, Math.min(newX, window.innerWidth - container.offsetWidth));
        newY = Math.max(0, Math.min(newY, window.innerHeight - container.offsetHeight));
        container.style.left = newX + 'px';
        container.style.top = newY + 'px';
        container.style.right = 'auto';
      });
    
      document.addEventListener('mouseup', () => {
        if (isDragging) {
          isDragging = false;
          header.style.cursor = 'grab';
        }
      });
    
      // 触摸支持
      header.addEventListener('touchstart', (e) => {
        if (e.target === closeBtn || e.target.closest('#dmpClose')) return;
        isDragging = true;
        const touch = e.touches[0];
        dragOffsetX = touch.clientX - container.offsetLeft;
        dragOffsetY = touch.clientY - container.offsetTop;
        e.preventDefault();
      }, { passive: false });
    
      document.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        const touch = e.touches[0];
        let newX = touch.clientX - dragOffsetX;
        let newY = touch.clientY - dragOffsetY;
        newX = Math.max(0, Math.min(newX, window.innerWidth - container.offsetWidth));
        newY = Math.max(0, Math.min(newY, window.innerHeight - container.offsetHeight));
        container.style.left = newX + 'px';
        container.style.top = newY + 'px';
        container.style.right = 'auto';
      }, { passive: false });
    
      document.addEventListener('touchend', () => {
        isDragging = false;
      });
    
      // ===== 关闭按钮 =====
      closeBtn.addEventListener('click', () => {
        container.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        container.style.opacity = '0';
        container.style.transform = 'scale(0.85)';
        setTimeout(() => container.remove(), 400);
        audio.pause();
      });
    
      // ===== 播放/暂停 =====
      let isPlaying = false;
    
      function updatePlayState(playing) {
        isPlaying = playing;
        if (playing) {
          disc.classList.add('playing');
          playIcon.innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
          waveBars.forEach(bar => bar.classList.add('active'));
        } else {
          disc.classList.remove('playing');
          playIcon.innerHTML = '<path d="M8 5v14l11-7z"/>';
          waveBars.forEach(bar => bar.classList.remove('active'));
        }
      }
    
      playBtn.addEventListener('click', () => {
        if (!audio.src && !audio.currentSrc) {
          // 提示选择文件
          fileLabel.style.background = 'linear-gradient(135deg, rgba(255,180,200,0.25), rgba(200,182,255,0.25))';
          setTimeout(() => {
            fileLabel.style.background = '';
          }, 800);
          return;
        }
        if (isPlaying) {
          audio.pause();
        } else {
          audio.play().catch(() => {});
        }
      });
    
      audio.addEventListener('play', () => updatePlayState(true));
      audio.addEventListener('pause', () => updatePlayState(false));
    
      // ===== 进度更新 =====
      audio.addEventListener('timeupdate', () => {
        if (audio.duration) {
          const pct = (audio.currentTime / audio.duration) * 100;
          progressFill.style.width = pct + '%';
          currentTimeEl.textContent = formatTime(audio.currentTime);
        }
      });
    
      audio.addEventListener('loadedmetadata', () => {
        durationEl.textContent = formatTime(audio.duration);
      });
    
      audio.addEventListener('ended', () => {
        updatePlayState(false);
        progressFill.style.width = '0%';
        currentTimeEl.textContent = '0:00';
      });
    
      // 点击进度条跳转
      progressBar.addEventListener('click', (e) => {
        if (!audio.duration) return;
        const rect = progressBar.getBoundingClientRect();
        const pct = (e.clientX - rect.left) / rect.width;
        audio.currentTime = pct * audio.duration;
      });
    
      // ===== 文件选择 =====
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const url = URL.createObjectURL(file);
        audio.src = url;
        
        // 更新显示名称
        let name = file.name.replace(/\.(mp3|wav|ogg|m4a|flac|aac)$/i, '');
        songNameEl.textContent = '🎶 ' + name;
        artistNameEl.textContent = file.type || '本地音频文件';
        fileLabel.textContent = '📁 已加载: ' + file.name.slice(0, 20) + (file.name.length > 20 ? '...' : '');
        fileLabel.style.borderColor = 'rgba(168, 230, 207, 0.5)';
        
        // 自动播放
        audio.play().then(() => {}).catch(() => {});
      });
    
      // ===== 音量控制 =====
      audio.volume = 0.8;
    
      volumeSlider.addEventListener('input', (e) => {
        const val = e.target.value / 100;
        audio.volume = val;
        updateVolumeIcon(val);
      });
    
      function updateVolumeIcon(val) {
        if (val === 0) {
          volumeIcon.innerHTML = '<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>';
        } else if (val < 0.5) {
          volumeIcon.innerHTML = '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>';
        } else {
          volumeIcon.innerHTML = '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>';
        }
      }
    
      // 点击音量图标静音切换
      let lastVolume = 0.8;
      volumeIcon.style.cursor = 'pointer';
      volumeIcon.addEventListener('click', () => {
        if (audio.volume > 0) {
          lastVolume = audio.volume;
          audio.volume = 0;
          volumeSlider.value = 0;
        } else {
          audio.volume = lastVolume;
          volumeSlider.value = lastVolume * 100;
        }
        updateVolumeIcon(audio.volume);
      });
    
      // ===== 上一首/下一首（演示用） =====
      prevBtn.addEventListener('click', () => {
        if (audio.currentTime > 3) {
          audio.currentTime = 0;
        }
      });
      
      nextBtn.addEventListener('click', () => {
        // 单文件模式下重播
        audio.currentTime = 0;
        if (!isPlaying) audio.play().catch(() => {});
      });
    
      return {
        ok: true,
        summary: '✨ 梦幻音乐播放器已创建！浅色系玻璃态设计，支持自由拖动和音乐播放。点击「选择音乐文件」即可开始播放。',
        features: [
          '🎨 梦幻浅色系玻璃态 UI',
          '🖱️ 自由拖动（支持触摸屏）',
          '💿 旋转唱片动画 + 音波可视化',
          '⭐ 闪烁星星装饰效果',
          '🔊 音量滑块 + 静音切换',
          '📁 支持本地音频文件上传'
        ]
      };
    }
  );
  if (typeof __tabOriginalFunction !== "function") {
    throw new Error("evaluate_script source must evaluate to a function");
  }
  return await __tabOriginalFunction();
})();