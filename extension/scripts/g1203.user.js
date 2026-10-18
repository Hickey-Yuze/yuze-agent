(function() {
  // 防止重复注入
  if (window.bilibiliShortcutsInjected) return;
  window.bilibiliShortcutsInjected = true;

  // 状态管理
  let displayMode = 0; // 0=正常, 1=宽屏, 2=全屏
  let currentSpeed = 1.0;
  const speedPresets = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0, 4.0, 6.0];
  let speedIndex = speedPresets.indexOf(1.0);

  // 创建提示弹窗
  function createNotification() {
    const notification = document.createElement('div');
    notification.id = 'bilibili-shortcut-notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background-color: rgba(0, 0, 0, 0.85);
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: bold;
      z-index: 999999;
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(4px);
      border: 1px solid rgba(255, 255, 255, 0.1);
    `;
    document.body.appendChild(notification);
    return notification;
  }

  // 显示提示
  function showNotification(message) {
    let notification = document.getElementById('bilibili-shortcut-notification');
    if (!notification) {
      notification = createNotification();
    }
    
    notification.textContent = message;
    notification.style.opacity = '1';
    
    setTimeout(() => {
      notification.style.opacity = '0';
    }, 2000);
  }

  // 查找并点击元素（带重试机制）
  function clickElementWithSelectors(selectors, maxRetries = 3, delay = 200) {
    return new Promise((resolve) => {
      let retries = 0;
      
      function attemptClick() {
        for (const selector of selectors) {
          const element = document.querySelector(selector);
          if (element && element.offsetParent !== null) {
            try {
              element.click();
              console.log(`成功点击元素: ${selector}`);
              resolve(true);
              return;
            } catch (error) {
              console.warn(`点击元素失败 ${selector}:`, error);
            }
          }
        }
        
        retries++;
        if (retries < maxRetries) {
          console.log(`重试点击 (${retries}/${maxRetries})...`);
          setTimeout(attemptClick, delay);
        } else {
          console.warn(`所有选择器都失败:`, selectors);
          resolve(false);
        }
      }
      
      attemptClick();
    });
  }

  // 查找并点击确认按钮
  function clickConfirmButton() {
    console.log('查找确认按钮...');
    
    const confirmSelectors = [
      '.confirm-btn',
      '.coin-confirm',
      '.coin-submit',
      '.ok-btn',
      '.submit-btn',
      '.dialog-ok',
      '.popup-ok',
      '.bili-dialog__footer .bili-btn:last-child',
      '.bili-popup__footer .bili-btn:last-child',
      '.coin-popup .bili-btn-primary',
      '.coin-dialog .bili-btn-primary'
    ];
    
    // 文本匹配确认按钮
    const buttons = document.querySelectorAll('button, .btn, .bili-btn');
    for (const button of buttons) {
      if (button.textContent && 
          (button.textContent.includes('确认') || 
           button.textContent.includes('确定') || 
           button.textContent.includes('投币') ||
           button.textContent.includes('OK'))) {
        console.log('通过文本找到确认按钮:', button.textContent);
        button.click();
        return true;
      }
    }
    
    // 使用选择器查找
    for (const selector of confirmSelectors) {
      const element = document.querySelector(selector);
      if (element && element.offsetParent !== null) {
        console.log(`通过选择器找到确认按钮: ${selector}`);
        element.click();
        return true;
      }
    }
    
    return false;
  }

  // 执行一键三连（简化版投币流程）
  async function performTripleAction() {
    console.log('开始执行一键三连完整流程...');
    showNotification('开始一键三连...');
    
    try {
      // 步骤1: 点赞
      console.log('步骤1: 点击点赞按钮');
      const likeSuccess = await clickElementWithSelectors([
        '.video-like',
        '.bili-video-action__like',
        '.like-button',
        '.like-btn',
        '[data-name="like"]',
        '.video-toolbar-item.like',
        '.toolbar-like',
        '.bili-video-action-like',
        '.bili-video-action__btn.like'
      ]);
      
      if (!likeSuccess) {
        showNotification('点赞失败');
        return;
      }
      
      showNotification('✓ 点赞成功');
      await new Promise(resolve => setTimeout(resolve, 500)); // 等待动画
      
      // 步骤2: 投币（简化流程）
      console.log('步骤2: 点击投币按钮');
      const coinSuccess = await clickElementWithSelectors([
        '.video-coin', 
        '.bili-video-action__coin',
        '.coin-button',
        '.coin-btn',
        '[data-name="coin"]',
        '.video-toolbar-item.coin',
        '.toolbar-coin',
        '.bili-video-action-coin',
        '.bili-video-action__btn.coin'
      ]);
      
      if (!coinSuccess) {
        showNotification('点击投币按钮失败');
        return;
      }
      
      showNotification('✓ 投币按钮点击成功');
      
      // 等待弹窗出现
      console.log('等待投币弹窗出现...');
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // 直接点击确认按钮（跳过选择硬币数量）
      console.log('点击确认按钮...');
      const confirmSuccess = clickConfirmButton();
      
      if (!confirmSuccess) {
        // 如果找不到确认按钮，尝试找到弹窗并点击里面的主要按钮
        console.log('尝试查找弹窗主要按钮...');
        const popupButtons = document.querySelectorAll('.bili-dialog__footer button, .bili-popup__footer button');
        if (popupButtons.length > 0) {
          popupButtons[popupButtons.length - 1].click(); // 点击最后一个按钮（通常是确认）
          console.log('点击了弹窗按钮');
        } else {
          showNotification('无法确认投币');
          return;
        }
      }
      
      showNotification('✓ 投币确认成功');
      await new Promise(resolve => setTimeout(resolve, 800)); // 等待弹窗关闭
      
      // 步骤3: 收藏
      console.log('步骤3: 点击收藏按钮');
      const favSuccess = await clickElementWithSelectors([
        '.video-fav',
        '.bili-video-action__collect',
        '.collect-button',
        '.fav-btn',
        '[data-name="collect"]',
        '.video-toolbar-item.fav',
        '.toolbar-fav',
        '.bili-video-action-fav',
        '.bili-video-action__btn.collect'
      ]);
      
      if (favSuccess) {
        showNotification('🎉 一键三连完成！');
        console.log('一键三连完成！');
      } else {
        showNotification('收藏失败，但点赞和投币已完成');
      }
      
    } catch (error) {
      console.error('一键三连执行出错:', error);
      showNotification('执行出错，请手动操作');
    }
  }

  // 键盘事件监听
  function handleKeyDown(event) {
    // 确保不是在输入框中
    if (event.target.tagName === 'INPUT' || 
        event.target.tagName === 'TEXTAREA' ||
        event.target.isContentEditable) {
      return;
    }

    switch(event.key) {
      case '1':
        event.preventDefault();
        // 切换显示模式
        const wideBtn = document.querySelector('.bpx-player-ctrl-wide');
        const fullBtn = document.querySelector('.bpx-player-ctrl-full');
        
        if (!wideBtn || !fullBtn) {
          showNotification('视频控制按钮未找到');
          return;
        }

        displayMode = (displayMode + 1) % 3;
        let modeText = '';
        
        switch(displayMode) {
          case 0: // 正常模式
            if (document.fullscreenElement) {
              document.exitFullscreen();
            }
            if (wideBtn.classList.contains('bpx-state-wide')) {
              wideBtn.click();
            }
            modeText = '正常模式';
            break;
            
          case 1: // 宽屏模式
            if (!wideBtn.classList.contains('bpx-state-wide')) {
              wideBtn.click();
            }
            modeText = '宽屏模式';
            break;
            
          case 2: // 全屏模式
            if (!document.fullscreenElement) {
              fullBtn.click();
            }
            modeText = '全屏模式';
            break;
        }
        
        showNotification(modeText);
        break;
        
      case '3':
        event.preventDefault();
        performTripleAction();
        break;
        
      case '+':
      case '=':
        event.preventDefault();
        // 加速功能
        if (speedIndex < speedPresets.length - 1) {
          speedIndex++;
          const newSpeed = speedPresets[speedIndex];
          const video = document.querySelector('video');
          if (video) {
            video.playbackRate = newSpeed;
            currentSpeed = newSpeed;
            showNotification(`x${newSpeed}`);
          }
        }
        break;
        
      case '-':
      case '_':
        event.preventDefault();
        // 减速功能
        if (speedIndex > 0) {
          speedIndex--;
          const newSpeed = speedPresets[speedIndex];
          const video = document.querySelector('video');
          if (video) {
            video.playbackRate = newSpeed;
            currentSpeed = newSpeed;
            showNotification(`x${newSpeed}`);
          }
        }
        break;
        
      case '0':
        event.preventDefault();
        speedIndex = speedPresets.indexOf(1.0);
        const video = document.querySelector('video');
        if (video) {
          video.playbackRate = 1.0;
          currentSpeed = 1.0;
          showNotification('x1.0');
        }
        break;
    }
  }

  // 初始化
  function initializeShortcuts() {
    console.log('B站快捷键初始化...');
    
    // 添加键盘监听
    document.addEventListener('keydown', handleKeyDown);
    
    // 显示提示
    setTimeout(() => {
      showNotification('B站快捷键已启用');
      console.log('快捷键说明:');
      console.log('  1键: 切换显示模式 (宽屏/全屏/正常)');
      console.log('  3键: 一键三连 (点赞 → 投币 → 收藏)');
      console.log('  +键: 加速');
      console.log('  -键: 减速');
      console.log('  0键: 重置为1倍速');
    }, 1500);
  }

  // 页面加载完成后执行
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeShortcuts);
  } else {
    initializeShortcuts();
  }

  // 暴露API给控制台调试
  window.BilibiliShortcuts = {
    performTripleAction,
    showNotification,
    getCurrentState: () => ({
      displayMode: ['正常', '宽屏', '全屏'][displayMode],
      speed: currentSpeed + 'x'
    })
  };
})();