(function() {
  function enablePictureInPicture() {
    console.log('尝试开启画中画模式...');
    
    // 方法1: 查找播放器容器中的video元素
    const playerContainer = document.querySelector('#player-ctnr');
    if (playerContainer) {
      const videoElement = playerContainer.querySelector('video');
      if (videoElement) {
        // 检查是否支持画中画
        if (document.pictureInPictureEnabled && !videoElement.disablePictureInPicture) {
          videoElement.requestPictureInPicture()
            .then(() => {
              console.log('✓ 画中画模式已成功开启！');
            })
            .catch(error => {
              console.warn('画中画请求失败:', error.message);
              // 尝试备用方案
              tryAlternativeMethods();
            });
        } else {
          console.warn('当前视频不支持画中画API');
          tryAlternativeMethods();
        }
      } else {
        console.warn('未找到video元素，尝试备用方案');
        tryAlternativeMethods();
      }
    } else {
      console.warn('播放器容器未找到');
      tryAlternativeMethods();
    }
  }
  
  function tryAlternativeMethods() {
    // 方法2: 全页查找所有video元素
    const allVideos = document.querySelectorAll('video');
    for (const video of allVideos) {
      if (video.src && document.pictureInPictureEnabled) {
        video.requestPictureInPicture()
          .then(() => {
            console.log('✓ 通过备用方案开启画中画成功！');
            return;
          })
          .catch(err => console.log('备用方案失败:', err));
      }
    }
    
    // 方法3: 模拟点击B站播放器控制栏的画中画按钮
    const controlBar = document.querySelector('.live-player-handle-bar, .bilibili-player-video-btn-pip');
    if (controlBar) {
      const pipButton = controlBar.querySelector('[class*="pip"], [data-title*="画中画"]');
      if (pipButton) {
        pipButton.click();
        console.log('已点击B站画中画按钮');
      }
    }
    
    // 方法4: 尝试右键菜单方式提示
    if (allVideos.length > 0) {
      console.log('💡 提示：您也可以右键点击视频画面，选择"画中画"选项');
    }
  }
  
  // 等待播放器完全加载
  function waitForPlayer() {
    const video = document.querySelector('#player-ctnr video');
    if (video && video.readyState >= 1) {
      enablePictureInPicture();
    } else {
      console.log('等待播放器加载...');
      setTimeout(waitForPlayer, 500);
    }
  }
  
  // 执行时机：确保页面和播放器都已加载
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(waitForPlayer, 1000);
    });
  } else {
    setTimeout(waitForPlayer, 500);
  }
})();