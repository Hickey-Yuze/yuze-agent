(function() {
  'use strict';
  
  // 防止脚本重复执行
  if (window.__bilibiliShortcutScriptExecuted) {
    return;
  }
  window.__bilibiliShortcutScriptExecuted = true;
  
  console.log('B站快捷键脚本已加载');
  
  /**
   * 获取视频元素
   * @returns {HTMLVideoElement|null}
   */
  function getVideoElement() {
    // B站视频元素的选择器
    const selectors = [
      'video',
      '.bilibili-player-video video',
      '#bilibili-player video',
      '.bpx-player-video-wrap video'
    ];
    
    for (const selector of selectors) {
      const video = document.querySelector(selector);
      if (video) {
        return video;
      }
    }
    return null;
  }
  
  /**
   * 获取播放器容器元素
   * @returns {HTMLElement|null}
   */
  function getPlayerContainer() {
    const selectors = [
      '.bilibili-player',
      '#bilibili-player',
      '.bpx-player-container',
      '.bpx-player'
    ];
    
    for (const selector of selectors) {
      const container = document.querySelector(selector);
      if (container) {
        return container;
      }
    }
    return null;
  }
  
  /**
   * 切换全屏状态
   */
  function toggleFullscreen() {
    const video = getVideoElement();
    if (!video) {
      console.warn('未找到视频元素');
      return;
    }
    
    // 检查当前全屏状态
    const isFullscreen = document.fullscreenElement || 
                         document.webkitFullscreenElement || 
                         document.mozFullScreenElement;
    
    if (isFullscreen) {
      // 退出全屏
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      }
      console.log('退出全屏');
    } else {
      // 进入全屏
      const playerContainer = getPlayerContainer() || video.parentElement;
      
      if (playerContainer.requestFullscreen) {
        playerContainer.requestFullscreen();
      } else if (playerContainer.webkitRequestFullscreen) {
        playerContainer.webkitRequestFullscreen();
      } else if (playerContainer.mozRequestFullScreen) {
        playerContainer.mozRequestFullScreen();
      } else if (playerContainer.msRequestFullscreen) {
        playerContainer.msRequestFullscreen();
      }
      console.log('进入全屏');
    }
  }
  
  /**
   * 设置播放速度
   * @param {number} speed - 播放速度
   */
  function setPlaybackSpeed(speed) {
    const video = getVideoElement();
    if (!video) {
      console.warn('未找到视频元素');
      return;
    }
    
    video.playbackRate = speed;
    console.log(`播放速度已设置为: ${speed}x`);
    
    // 显示速度提示
    showSpeedToast(speed);
  }
  
  /**
   * 显示速度提示（临时提示框）
   * @param {number} speed - 播放速度
   */
  function showSpeedToast(speed) {
    // 移除已存在的提示
    const existingToast = document.getElementById('__speed-toast__');
    if (existingToast) {
      existingToast.remove();
    }
    
    // 创建提示元素
    const toast = document.createElement('div');
    toast.id = '__speed-toast__';
    toast.textContent = `${speed}x 倍速`;
    toast.style.cssText = `
      position: fixed;
      top: 20%;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.7);
      color: #fff;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 18px;
      font-weight: bold;
      z-index: 999999;
      pointer-events: none;
      transition: opacity 0.3s;
    `;
    
    document.body.appendChild(toast);
    
    // 1.5秒后自动消失
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 1500);
  }
  
  /**
   * 键盘事件处理
   * @param {KeyboardEvent} event
   */
  function handleKeyboard(event) {
    // 如果正在输入文字，不拦截按键
    const activeElement = document.activeElement;
    if (activeElement && (
      activeElement.tagName === 'INPUT' || 
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.isContentEditable
    )) {
      return;
    }
    
    const key = event.key;
    
    // 回车键：切换全屏
    if (key === 'Enter') {
      event.preventDefault();
      toggleFullscreen();
      return;
    }
    
    // 数字键 1：恢复原速
    if (key === '1') {
      event.preventDefault();
      setPlaybackSpeed(1);
      return;
    }
    
    // 数字键 2：2倍速
    if (key === '2') {
      event.preventDefault();
      setPlaybackSpeed(2);
      return;
    }
    
    // 数字键 3：3倍速
    if (key === '3') {
      event.preventDefault();
      setPlaybackSpeed(3);
      return;
    }
  }
  
  // 监听键盘事件
  document.addEventListener('keydown', handleKeyboard, true);
  
  console.log('B站快捷键脚本已启用：Enter=全屏切换, 1/2/3=倍速切换');
})();