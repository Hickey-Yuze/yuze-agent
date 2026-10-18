(function() {
  console.log('正在修复专注统计累计字数负数bug...');
  
  function fixFocusTimerBug() {
    // 查找专注统计面板
    const focusPanel = document.getElementById('__tab-focus-timer-panel__');
    if (!focusPanel) {
      console.warn('专注统计面板未找到');
      return;
    }
    
    console.log('找到专注统计面板:', focusPanel);
    
    // 查找累计字数元素
    const wordCountElements = focusPanel.querySelectorAll('div');
    let wordCountElement = null;
    
    for (const element of wordCountElements) {
      if (element.textContent && element.textContent.includes('累计字数:')) {
        wordCountElement = element;
        break;
      }
    }
    
    if (wordCountElement) {
      console.log('找到累计字数元素:', wordCountElement);
      
      // 检查当前值
      const currentText = wordCountElement.textContent;
      console.log('当前累计字数文本:', currentText);
      
      // 提取数字部分
      const match = currentText.match(/累计字数:\s*(-?\d+)/);
      if (match) {
        const currentCount = parseInt(match[1], 10);
        console.log('当前累计字数:', currentCount);
        
        // 如果是负数，修复为0
        if (currentCount0) {
          wordCountElement.innerHTML = wordCountElement.innerHTML.replace(
            /累计字数:\s*-?\d+/,
            '累计字数: 0'
          );
          console.log('已修复累计字数: 负数 -> 0');
          
          // 尝试查找并点击重置按钮
          const resetButtons = focusPanel.querySelectorAll('button');
          for (const button of resetButtons) {
            if (button.textContent === '重置') {
              console.log('找到重置按钮，模拟点击...');
              button.click();
              break;
            }
          }
        } else {
          console.log('累计字数正常，无需修复');
        }
      }
    } else {
      console.warn('未找到累计字数元素');
    }
    
    // 同时修复可能的初始化逻辑问题
    setTimeout(() => {
      // 再次检查确保修复生效
      const updatedElements = focusPanel.querySelectorAll('div');
      for (const element of updatedElements) {
        if (element.textContent && element.textContent.includes('累计字数:')) {
          const text = element.textContent;
          if (text.includes('-')) {
            element.innerHTML = element.innerHTML.replace(
              /累计字数:\s*-?\d+/,
              '累计字数: 0'
            );
            console.log('二次检查修复完成');
          }
        }
      }
    }, 1000);
  }
  
  // 执行修复
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fixFocusTimerBug);
  } else {
    fixFocusTimerBug();
  }
  
  // 监听页面变化，防止SPA导致问题重现
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      setTimeout(fixFocusTimerBug, 500);
    }
  }).observe(document, { subtree: true, childList: true });
})();