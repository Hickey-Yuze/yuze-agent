(function() {
  'use strict';
  
  console.log('[微博自动展开] 脚本已加载');
  
  // 防止重复执行标记
  if (window.__weiboAutoExpandLoaded) {
    console.log('[微博自动展开] 脚本已在运行中');
    return;
  }
  window.__weiboAutoExpandLoaded = true;
  
  // 展开所有可见的折叠内容
  function expandAllCollapsed() {
    // 查找所有"展开"按钮
    const expandButtons = document.querySelectorAll('.expand');
    
    let expandedCount = 0;
    expandButtons.forEach(button => {
      // 确保元素可见且可点击
      if (button && button.offsetParent !== null) {
        try {
          button.click();
          expandedCount++;
          console.log('[微博自动展开] 已展开一条内容');
        } catch (e) {
          console.warn('[微博自动展开] 展开失败:', e);
        }
      }
    });
    
    if (expandedCount > 0) {
      console.log(`[微博自动展开] 本次共展开 ${expandedCount} 条内容`);
    }
    
    return expandedCount;
  }
  
  // 初始执行
  function initialize() {
    console.log('[微博自动展开] 开始初始化...');
    
    // 延迟执行，确保页面加载完成
    setTimeout(() => {
      expandAllCollapsed();
    }, 1000);
  }
  
  // 监听 DOM 变化，处理动态加载的内容
  const observer = new MutationObserver((mutations) => {
    // 防抖处理，避免频繁触发
    clearTimeout(observer.timeoutId);
    observer.timeoutId = setTimeout(() => {
      expandAllCollapsed();
    }, 500);
  });
  
  // 观察微博内容容器的变化
  function startObserving() {
    const feedContainer = document.querySelector('._feed_gykin_2') || 
                         document.querySelector('.vue-recycle-scroller') ||
                         document.querySelector('#homeWrap');
    
    if (feedContainer) {
      observer.observe(feedContainer, {
        childList: true,
        subtree: true
      });
      console.log('[微博自动展开] 已开始监听内容变化');
    } else {
      console.warn('[微博自动展开] 未找到内容容器，将在 2 秒后重试');
      setTimeout(startObserving, 2000);
    }
  }
  
  // 页面加载完成后执行
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initialize();
      startObserving();
    });
  } else {
    initialize();
    startObserving();
  }
  
  // 监听滚动事件，处理懒加载内容
  let scrollTimeout;
  window.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      expandAllCollapsed();
    }, 1000);
  }, { passive: true });
  
  console.log('[微博自动展开] 脚本初始化完成');
})();