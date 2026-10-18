(function() {
  if (window.__bilibiliShortcutInjected) return;
  window.__bilibiliShortcutInjected = true;

  const SPEED_MAP = { '1': 1, '2': 2, '3': 3 };

  function setPlaybackRate(rate) {
    const video = document.querySelector('video');
    if (!video) {
      console.warn('[B站快捷键] 未找到视频元素');
      return;
    }
    video.playbackRate = rate;

    // 尝试同步B站UI上的倍速按钮状态
    const speedBtn = document.querySelector('.bpx-player-ctrl-playbackrate');
    if (speedBtn) {
      speedBtn.click();
      setTimeout(() => {
        const menuItems = document.querySelectorAll('.bpx-player-ctrl-playbackrate-menu-item');
        menuItems.forEach(item => {
          if (parseFloat(item.textContent) === rate) {
            item.click();
          }
        });
      }, 50);
    }
  }

  function toggleFullscreen() {
    const video = document.querySelector('video');
    if (!video) return;

    // 尝试点击B站自带的全屏按钮
    const fullscreenBtn = document.querySelector('.bpx-player-ctrl-full') ||
                          document.querySelector('.bilibili-player-video-btn-fullscreen');
    if (fullscreenBtn) {
      fullscreenBtn.click();
      return;
    }

    // 回退：使用 Fullscreen API
    const container = document.querySelector('.bpx-player-container') ||
                      document.querySelector('#bilibili-player') ||
                      video;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else if (container) {
      container.requestFullscreen().catch(() => {});
    }
  }

  function isInputFocused() {
    const el = document.activeElement;
    if (!el) return false;
    const tag = el.tagName.toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
  }

  document.addEventListener('keydown', function(e) {
    // 排除输入框内的按键
    if (isInputFocused()) return;

    const key = e.key;

    // 回车键 → 全屏切换
    if (key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      toggleFullscreen();
      return;
    }

    // 数字键 1/2/3 → 倍速控制
    if (SPEED_MAP.hasOwnProperty(key)) {
      e.preventDefault();
      e.stopPropagation();
      setPlaybackRate(SPEED_MAP[key]);
      return;
    }
  }, true);

  console.log('[B站快捷键] 脚本已加载：Enter=全屏, 1=1x, 2=2x, 3=3x');
})();