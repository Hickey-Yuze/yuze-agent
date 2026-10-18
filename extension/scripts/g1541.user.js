(function() {
  // 防止重复执行
  if (window.__retroTVComplete) {
    console.log('Retro TV Complete Mode already active.');
    return;
  }
  window.__retroTVComplete = true;

  console.log('🍺 Initializing Retro TV Complete Mode with Beer Theme...');

  // === 颜色配置 ===
  const COLOR_CONFIG = {
    lightBeer: { r: 255, g: 204, b: 102 },  // #FFCC66 - 浅啤酒色（0% 进度）
    darkBeer: { r: 139, g: 69, b: 19 }      // #8B4513 - 深啤酒色（100% 进度）
  };

  // === 颜色插值函数 ===
  function calculateColor(percent) {
    const factor = Math.max(0, Math.min(1, percent / 100));
    
    const r = Math.round(COLOR_CONFIG.lightBeer.r + 
      (COLOR_CONFIG.darkBeer.r - COLOR_CONFIG.lightBeer.r) * factor);
    const g = Math.round(COLOR_CONFIG.lightBeer.g + 
      (COLOR_CONFIG.darkBeer.g - COLOR_CONFIG.lightBeer.g) * factor);
    const b = Math.round(COLOR_CONFIG.lightBeer.b + 
      (COLOR_CONFIG.darkBeer.b - COLOR_CONFIG.lightBeer.b) * factor);
    
    return `rgb(${r}, ${g}, ${b})`;  // 修复：正确插入变量值
  }

  // === 第 1 部分：样式注入 ===
  const style = document.createElement('style');
  style.id = 'retro-tv-complete-style';
  style.textContent = `
    /* === 啤酒主题样式 === */
    /* 1. 轨道背景 */
    .bpx-player-progress-wrap,
    .bpx-player-shadow-progress-area {
      background: #1a1a1a !important;
      border: 1px solid #333 !important;
      box-shadow: inset 0 1px 4px #000 !important;
      height: 10px !important;
      border-radius: 2px !important;
      opacity: 0.85 !important;
      transition: opacity 0.2s, height 0.2s !important;
      cursor: pointer !important;
      z-index: 100 !important;
    }

    .bpx-player-progress-wrap:hover,
    .bpx-player-shadow-progress-area:hover {
      opacity: 1 !important;
      height: 12px !important;
    }

    /* 2. 进度条容器 */
    .bpx-player-progress {
      background: #000 !important;
      height: 100% !important;
      position: relative !important;
    }

    /* 3. 啤酒色光条 */
    .bpx-player-progress-schedule-current {
      background: linear-gradient(90deg, rgb(255, 204, 102) 0%, rgb(255, 204, 102) 100%) !important;
      height: 100% !important;
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      bottom: 0 !important;
      width: 0% !important;
      transition: none !important;
      will-change: width, background !important;
      box-shadow: 0 0 6px rgb(255, 204, 102), 0 0 12px rgb(255, 180, 50) !important;
      border-radius: 1px 0 0 1px !important;
      z-index: 5 !important;
      pointer-events: none !important;
    }

    .bpx-player-progress-schedule-current::after {
      content: '' !important;
      position: absolute !important;
      top: 0; left: 0; right: 0; bottom: 0;
      background: repeating-linear-gradient(0deg, rgba(0,0,0,0.3) 0px, rgba(0,0,0,0.3) 1px, transparent 1px, transparent 3px);
      pointer-events: none !important;
    }

    /* 4. 🍺啤酒图标 - 改为真实的emoji样式 - 关键修改：允许鼠标事件 */
    .bpx-player-progress-thumb {
      width: 28px !important;
      height: 28px !important;
      margin-top: -4px !important;
      background: transparent !important;
      border: none !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      position: absolute !important;
      top: 50% !important;
      transform: translate(-50%, -50%) scale(1) !important;
      z-index: 15 !important;  /* 提高z-index确保在顶层 */
      transition: transform 0.2s, left 0.05s linear !important;  /* 添加left过渡 */
      pointer-events: auto !important;  /* 关键：允许鼠标事件 */
      overflow: visible !important;
      font-size: 24px !important;
      line-height: 1 !important;
      text-align: center !important;
      text-shadow: 
        0 0 8px rgba(255, 204, 102, 0.9),
        0 0 16px rgba(255, 165, 0, 0.6),
        0 0 24px rgba(255, 140, 0, 0.4) !important;
      cursor: grab !important;  /* 添加抓取光标 */
    }

    .bpx-player-progress-thumb:active {
      cursor: grabbing !important;  /* 拖动时的光标 */
      transform: translate(-50%, -50%) scale(1.2) !important;  /* 拖动时放大 */
    }

    /* 🍺emoji本身 */
    .bpx-player-progress-thumb::before {
      content: '🍺' !important;
      position: absolute !important;
      top: 0 !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
      font-size: 24px !important;
      line-height: 1 !important;
      pointer-events: none !important;
      z-index: 2 !important;
    }

    /* "干杯"文字 */
    .bpx-player-progress-thumb::after {
      content: '干杯' !important;
      position: absolute !important;
      top: -20px !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
      font-family: 'Arial Rounded MT Bold', 'Arial', sans-serif !important;
      font-size: 10px !important;
      color: #FFD700 !important;
      text-shadow: 
        0 0 3px #8B4513, 
        0 0 5px #FFA500,
        0 0 7px rgba(255, 165, 0, 0.6) !important;
      font-weight: bold !important;
      white-space: nowrap !important;
      opacity: 0 !important;
      transition: opacity 0.3s, top 0.3s !important;
      pointer-events: none !important;
      background: rgba(0, 0, 0, 0.5) !important;
      padding: 1px 4px !important;
      border-radius: 3px !important;
      border: 1px solid rgba(255, 215, 0, 0.3) !important;
      z-index: 3 !important;
    }

    .bpx-player-progress-wrap:hover .bpx-player-progress-thumb {
      transform: translate(-50%, -50%) scale(1.3) !important;
    }

    .bpx-player-progress-wrap:hover .bpx-player-progress-thumb::after {
      opacity: 1 !important;
      top: -24px !important;
    }

    /* 5. 时间显示 - 啤酒色 */
    .bpx-player-ctrl-time, .bpx-player-ctrl-time-current, .bpx-player-ctrl-time-duration {
      font-family: 'Courier New', monospace !important;
      color: #FFD700 !important;
      text-shadow: 0 0 4px rgba(255, 165, 0, 0.5) !important;
      font-weight: bold !important;
      font-size: 12px !important;
    }

    /* 6. 防止 B 站隐藏进度条的关键 CSS */
    .bpx-player-control-wrap.bpx-player-control-mini .bpx-player-progress-wrap {
      display: block !important;
      visibility: visible !important;
      opacity: 0.3 !important;
    }

    .bpx-player-control-mini .bpx-player-progress-wrap {
      opacity: 0.3 !important;
      transition: opacity 0.3s !important;
    }

    .bpx-player-control-mini .bpx-player-progress-wrap:hover {
      opacity: 0.85 !important;
    }

    /* 7. 啤酒emoji发光动画 */
    @keyframes beerGlow {
      0%, 100% { filter: drop-shadow(0 0 4px rgba(255, 204, 102, 0.8)); }
      50% { filter: drop-shadow(0 0 8px rgba(255, 204, 102, 0.9)) drop-shadow(0 0 12px rgba(255, 165, 0, 0.6)); }
    }

    .bpx-player-progress-thumb::before {
      animation: beerGlow 2s ease-in-out infinite !important;
    }

    .bpx-player-progress-wrap:hover .bpx-player-progress-thumb::before {
      animation: beerGlow 1s ease-in-out infinite !important;
    }

    /* 8. 新增：拖动时的样式 */
    .bpx-player-progress-thumb.dragging {
      filter: brightness(1.3) !important;
      animation: beerGlow 0.5s ease-in-out infinite !important;
    }
  `;

  const oldStyle = document.getElementById('retro-tv-complete-style');
  if (oldStyle) oldStyle.remove();

  if (!document.getElementById(style.id)) {
    document.head.appendChild(style);
  }

  // === 第 2 部分：创建极简进度指示器 ===
  function createMinimalProgressIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'retro-tv-minimal-progress';
    indicator.style.cssText = `
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 6px;
      background: rgba(0, 0, 0, 0.3);
      z-index: 99999;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    `;

    const progressBar = document.createElement('div');
    progressBar.id = 'retro-tv-minimal-progress-bar';
    progressBar.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 0%;
      height: 100%;
      background: rgb(255, 204, 102);
      box-shadow: 0 0 8px rgb(255, 204, 102);
      pointer-events: none;
      border-radius: 1px;
    `;

    indicator.appendChild(progressBar);
    return { indicator, progressBar };
  }

  // === 第 3 部分：智能显示逻辑 ===
  function initDynamicDisplay(videoPlayer, minimalProgress) {
    let isMouseOverVideo = false;

    videoPlayer.addEventListener('mouseenter', () => {
      isMouseOverVideo = true;
      
      const progressWrap = document.querySelector('.bpx-player-progress-wrap');
      if (progressWrap) {
        progressWrap.style.opacity = '0.85';
      }
      
      minimalProgress.indicator.style.opacity = '0';
    });

    videoPlayer.addEventListener('mouseleave', () => {
      isMouseOverVideo = false;
      
      setTimeout(() => {
        if (!isMouseOverVideo) {
          minimalProgress.indicator.style.opacity = '1';
          
          const progressWrap = document.querySelector('.bpx-player-progress-wrap');
          if (progressWrap) {
            progressWrap.style.opacity = '0.3';
          }
        }
      }, 200);
    });

    function observeBilibiliControls() {
      const controlBar = document.querySelector('.bpx-player-control-wrap');
      if (controlBar) {
        const observer = new MutationObserver(() => {
          const hasMiniClass = controlBar.classList.contains('bpx-player-control-mini');
          
          if (hasMiniClass) {
            if (!isMouseOverVideo) {
              minimalProgress.indicator.style.opacity = '1';
            }
            
            const progressWrap = document.querySelector('.bpx-player-progress-wrap');
            if (progressWrap) {
              progressWrap.style.opacity = '0.3';
            }
          } else {
            if (isMouseOverVideo) {
              minimalProgress.indicator.style.opacity = '0';
            }
          }
        });
        
        observer.observe(controlBar, {
          attributes: true,
          attributeFilter: ['style', 'class']
        });
      }
    }

    observeBilibiliControls();
  }

  // === 新增：拖动进度条指针功能 ===
  function initDraggingBehavior(video, progressWrap) {
    let isDragging = false;
    let thumb = null;
    let currentBar = null;

    function setupDragging() {
      thumb = document.querySelector('.bpx-player-progress-thumb');
      currentBar = document.querySelector('.bpx-player-progress-schedule-current');
      
      if (!thumb || !progressWrap || !video) return;

      // 鼠标按下事件
      thumb.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        isDragging = true;
        thumb.classList.add('dragging');
        document.body.style.cursor = 'grabbing';
        
        // 添加拖动类
        thumb.style.transition = 'none !important'; // 拖动时禁用过渡
      });

      // 鼠标移动事件（在document上监听，确保拖动时即使离开thumb也能继续）
      document.addEventListener('mousemove', (e) => {
        if (!isDragging || !progressWrap || !thumb || !currentBar) return;
        
        const rect = progressWrap.getBoundingClientRect();
        let percent = ((e.clientX - rect.left) / rect.width) * 100;
        
        // 限制在0-100%范围内
        percent = Math.max(0, Math.min(100, percent));
        
        // 更新指针位置
        thumb.style.left = percent + '%';
        
        // 更新进度条
        currentBar.style.width = percent + '%';
        
        // 计算并更新颜色
        const currentColor = calculateColor(percent);
        const lighterColor = adjustColor(currentColor, 20);
        currentBar.style.background = `linear-gradient(90deg, ${currentColor} 0%, ${lighterColor} 100%)`;
        currentBar.style.boxShadow = `0 0 6px ${currentColor}, 0 0 12px ${lighterColor}`;
        
        // 更新视频时间（可选，如果需要即时预览）
        if (video.duration && !isNaN(video.duration)) {
          video.currentTime = (percent / 100) * video.duration;
        }
      });

      // 鼠标松开事件
      document.addEventListener('mouseup', () => {
        if (isDragging) {
          isDragging = false;
          thumb.classList.remove('dragging');
          document.body.style.cursor = '';
          thumb.style.transition = 'transform 0.2s, left 0.05s linear !important'; // 恢复过渡
        }
      });

      // 确保鼠标离开窗口时也停止拖动
      document.addEventListener('mouseleave', () => {
        if (isDragging) {
          isDragging = false;
          thumb.classList.remove('dragging');
          document.body.style.cursor = '';
          thumb.style.transition = 'transform 0.2s, left 0.05s linear !important';
        }
      });

      console.log('✅ 进度条指针拖动功能已启用');
    }

    // 延迟设置以确保元素已加载
    setTimeout(setupDragging, 1000);
  }

  // === 进度同步函数 ===
  function syncProgress(video, minimalProgress) {
    const updateProgress = () => {
      if (video && !isNaN(video.duration) && video.duration > 0) {
        const percent = (video.currentTime / video.duration) * 100;
        
        // 计算当前颜色
        const currentColor = calculateColor(percent);
        
        // 更新极简进度线
        minimalProgress.progressBar.style.width = percent + '%';
        minimalProgress.progressBar.style.background = currentColor;
        minimalProgress.progressBar.style.boxShadow = `0 0 8px ${currentColor}`;
        
        // 更新个性化进度条（如果不是正在拖动）
        const currentBar = document.querySelector('.bpx-player-progress-schedule-current');
        const thumb = document.querySelector('.bpx-player-progress-thumb');
        
        if (currentBar && thumb && !thumb.classList.contains('dragging')) {
          currentBar.style.width = percent + '%';
          const lighterColor = adjustColor(currentColor, 20);
          currentBar.style.background = `linear-gradient(90deg, ${currentColor} 0%, ${lighterColor} 100%)`;
          currentBar.style.boxShadow = `0 0 6px ${currentColor}, 0 0 12px ${lighterColor}`;
          thumb.style.left = percent + '%';
        }
      }
      requestAnimationFrame(updateProgress);
    };
    
    return updateProgress;
  }

  // === 辅助函数：调整颜色亮度 ===
  function adjustColor(colorStr, brightness) {
    const match = colorStr.match(/rgb$(\d+),\s*(\d+),\s*(\d+)$/);
    if (!match) return colorStr;
    
    const r = Math.max(0, Math.min(255, parseInt(match[1]) + brightness));
    const g = Math.max(0, Math.min(255, parseInt(match[2]) + brightness));
    const b = Math.max(0, Math.min(255, parseInt(match[3]) + brightness));
    
    return `rgb(${r}, ${g}, ${b})`;
  }

  // === 第 5 部分：主初始化 ===
  function init() {
    const checkInterval = setInterval(() => {
      const videoPlayer = document.querySelector('.bpx-player-video-wrap, .bilibili-player-video, video');
      const video = document.querySelector('video');
      const progressWrap = document.querySelector('.bpx-player-progress-wrap');
      
      if (videoPlayer && video && progressWrap) {
        clearInterval(checkInterval);
        console.log('✅ Video player found. Initializing Retro TV Complete Mode with Beer Theme...');
        
        const minimalProgress = createMinimalProgressIndicator();
        videoPlayer.appendChild(minimalProgress.indicator);
        
        initDynamicDisplay(videoPlayer, minimalProgress);
        initDraggingBehavior(video, progressWrap);
        
        const syncFunction = syncProgress(video, minimalProgress);
        syncFunction();
        
        setTimeout(() => {
          if (progressWrap) {
            progressWrap.style.display = 'block';
            progressWrap.style.visibility = 'visible';
            progressWrap.style.opacity = '0.85';
          }
        }, 1000);
        
        console.log('✨ Retro TV Complete Mode with Beer Theme initialized successfully.');
      }
    }, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  console.log('🚀 Retro TV Complete Mode Ready - Beer Theme Activated!');
})();