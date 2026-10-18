// == 二次元少女主题B站进度条美化 - 简洁稳定版 ==
// 使用方法：在B站视频页面按F12，粘贴到Console，按回车

(function() {
  'use strict';
  
  console.log('🌸 开始加载二次元少女主题进度条...');
  
  // 防止重复运行
  if (window.__animeGirlSimple) {
    console.log('⚠️ 脚本已在运行中');
    return;
  }
  window.__animeGirlSimple = true;
  
  // 配置
  const CONFIG = {
    colors: {
      pinkLight: '#FFB6C1',
      pinkDeep: '#FF69B4',
      purple: '#9370DB',
      nightBg: '#1a0b2e',
      nightFg: '#2d1b69'
    },
    sizes: {
      barHeight: 14,
      thumbSize: 36,
      iconSize: 20
    }
  };
  
  // 等待播放器加载
  function waitForPlayer() {
    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 20;
      
      function check() {
        attempts++;
        
        const video = document.querySelector('video');
        const progressWrap = document.querySelector('.bpx-player-progress-wrap');
        
        if (video && progressWrap) {
          console.log('✅ 找到播放器元素');
          resolve({ video, progressWrap });
          return;
        }
        
        if (attempts >= maxAttempts) {
          console.log('⚠️ 未找到播放器，请刷新页面重试');
          resolve(null);
          return;
        }
        
        setTimeout(check, 500);
      }
      
      check();
    });
  }
  
  // 注入样式
  function injectStyles() {
    const styleId = 'anime-girl-simple-style';
    const oldStyle = document.getElementById(styleId);
    if (oldStyle && oldStyle.parentNode) {
      oldStyle.parentNode.removeChild(oldStyle);
    }
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* 进度条轨道 */
      .bpx-player-progress-wrap.anime-girl-simple {
        background: linear-gradient(135deg, ${CONFIG.colors.nightBg} 0%, ${CONFIG.colors.nightFg} 100%) !important;
        border: 1px solid rgba(147, 112, 219, 0.3) !important;
        box-shadow: inset 0 1px 4px rgba(0,0,0,0.8), 0 0 8px rgba(255,182,193,0.2) !important;
        height: ${CONFIG.sizes.barHeight}px !important;
        border-radius: 7px !important;
        opacity: 0.9 !important;
        transition: opacity 0.3s !important;
      }
      
      /* 进度条 */
      .bpx-player-progress-schedule-current.anime-girl-simple {
        background: linear-gradient(90deg, 
          rgba(255,182,193,0.9) 0%, 
          rgba(255,105,180,0.9) 50%,
          rgba(147,112,219,0.9) 100%) !important;
        box-shadow: 0 0 8px rgba(255,182,193,0.8), 0 0 16px rgba(255,105,180,0.6) !important;
        border-radius: 7px !important;
      }
      
      /* 滑块 */
      .bpx-player-progress-thumb.anime-girl-simple-thumb {
        width: ${CONFIG.sizes.thumbSize}px !important;
        height: ${CONFIG.sizes.thumbSize}px !important;
        background: transparent !important;
        border: none !important;
        border-radius: 50% !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-size: ${CONFIG.sizes.iconSize}px !important;
        text-shadow: 0 0 8px rgba(255,182,193,0.9) !important;
        cursor: pointer !important;
        pointer-events: auto !important;
      }
      
      .bpx-player-progress-thumb.anime-girl-simple-thumb::before {
        content: '🌸' !important;
        display: block !important;
      }
      
      /* 时间显示 */
      .bpx-player-ctrl-time.anime-girl-simple,
      .bpx-player-ctrl-time-current.anime-girl-simple,
      .bpx-player-ctrl-time-duration.anime-girl-simple {
        color: ${CONFIG.colors.pinkLight} !important;
        font-weight: bold !important;
      }
    `;
    
    document.head.appendChild(style);
    console.log('✅ 样式注入成功');
  }
  
  // 增强元素
  function enhanceElements(progressWrap) {
    try {
      // 添加自定义类
      progressWrap.classList.add('anime-girl-simple');
      
      // 进度条
      const currentBar = progressWrap.querySelector('.bpx-player-progress-schedule-current');
      if (currentBar) {
        currentBar.classList.add('anime-girl-simple');
      }
      
      // 滑块
      const thumb = progressWrap.querySelector('.bpx-player-progress-thumb');
      if (thumb) {
        thumb.classList.add('anime-girl-simple-thumb');
      }
      
      // 时间显示
      const timeElements = document.querySelectorAll('.bpx-player-ctrl-time, .bpx-player-ctrl-time-current, .bpx-player-ctrl-time-duration');
      timeElements.forEach(el => {
        el.classList.add('anime-girl-simple');
      });
      
      console.log('✅ 元素增强成功');
      return { currentBar, thumb };
    } catch (error) {
      console.error('❌ 元素增强失败:', error);
      return null;
    }
  }
  
  // 设置进度更新
  function setupProgressUpdate(video, currentBar, thumb) {
    let animationId = null;
    
    function updateProgress() {
      if (!video || video.readyState < 2) {
        animationId = requestAnimationFrame(updateProgress);
        return;
      }
      
      try {
        const duration = video.duration;
        if (!duration || isNaN(duration) || duration <= 0) {
          animationId = requestAnimationFrame(updateProgress);
          return;
        }
        
        const percent = (video.currentTime / duration) * 100;
        
        // 更新进度条
        if (currentBar) {
          currentBar.style.width = percent + '%';
        }
        
        // 更新滑块位置
        if (thumb) {
          thumb.style.left = percent + '%';
        }
      } catch (error) {
        // 静默处理错误
      }
      
      animationId = requestAnimationFrame(updateProgress);
    }
    
    // 开始更新
    animationId = requestAnimationFrame(updateProgress);
    
    // 返回清理函数
    return function() {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }
  
  // 设置点击跳转
  function setupClickToSeek(progressWrap, video) {
    progressWrap.addEventListener('click', function(e) {
      if (!video || !video.duration) return;
      
      try {
        const rect = progressWrap.getBoundingClientRect();
        const percent = ((e.clientX - rect.left) / rect.width) * 100;
        const clampedPercent = Math.max(0, Math.min(100, percent));
        
        video.currentTime = (clampedPercent / 100) * video.duration;
      } catch (error) {
        // 静默处理错误
      }
    });
    
    console.log('✅ 点击跳转功能已启用');
  }
  
  // 主初始化函数
  async function init() {
    try {
      console.log('🚀 开始初始化...');
      
      // 等待播放器
      const elements = await waitForPlayer();
      if (!elements) {
        console.log('⚠️ 初始化失败：未找到播放器');
        return;
      }
      
      const { video, progressWrap } = elements;
      
      // 注入样式
      injectStyles();
      
      // 增强元素
      const enhanced = enhanceElements(progressWrap);
      if (!enhanced) {
        console.log('⚠️ 初始化失败：元素增强失败');
        return;
      }
      
      const { currentBar, thumb } = enhanced;
      
      // 设置进度更新
      const stopProgressUpdate = setupProgressUpdate(video, currentBar, thumb);
      
      // 设置点击跳转
      setupClickToSeek(progressWrap, video);
      
      // 提供清理函数
      window.__cleanupAnimeGirlSimple = function() {
        console.log('🧹 开始清理...');
        
        // 停止进度更新
        if (stopProgressUpdate) {
          stopProgressUpdate();
        }
        
        // 移除样式
        const style = document.getElementById('anime-girl-simple-style');
        if (style && style.parentNode) {
          style.parentNode.removeChild(style);
        }
        
        // 移除自定义类
        if (progressWrap) {
          progressWrap.classList.remove('anime-girl-simple');
        }
        
        if (currentBar) {
          currentBar.classList.remove('anime-girl-simple');
        }
        
        if (thumb) {
          thumb.classList.remove('anime-girl-simple-thumb');
        }
        
        // 移除时间显示类
        const timeElements = document.querySelectorAll('.anime-girl-simple');
        timeElements.forEach(el => {
          el.classList.remove('anime-girl-simple');
        });
        
        // 重置标志
        window.__animeGirlSimple = false;
        
        console.log('✅ 清理完成');
      };
      
      console.log('🎉 二次元少女主题加载成功！');
      console.log('✨ 功能：樱花主题进度条 + 点击跳转');
      console.log('💡 清理：运行 window.__cleanupAnimeGirlSimple()');
      
    } catch (error) {
      console.error('❌ 初始化失败:', error.message);
      window.__animeGirlSimple = false;
    }
  }
  
  // 安全启动
  try {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      setTimeout(init, 500); // 延迟确保页面完全加载
    }
  } catch (error) {
    console.error('❌ 启动失败:', error.message);
    window.__animeGirlSimple = false;
  }
  
})();