(function() {
  // 防止脚本重复执行
  if (window._dragToOpenScriptLoadedV2) {
    console.log('拖拽脚本V2已加载，跳过重复执行');
    return;
  }
  window._dragToOpenScriptLoadedV2 = true;

  console.log('拖拽链接/文字搜索脚本V2加载成功');

  // 配置选项 - 已修改为百度搜索引擎
  const config = {
    searchEngine: 'https://www.baidu.com/s?wd=', // 改为百度搜索引擎
    // 可选搜索引擎：
    // Google: 'https://www.google.com/search?q='
    // Bing: 'https://www.bing.com/search?q='
    // DuckDuckGo: 'https://duckduckgo.com/?q='
    
    enableLinkDrag: true,     // 启用链接拖拽
    enableTextDrag: true,     // 启用文字拖拽
    showNotifications: true,  // 显示操作提示
    minTextLength: 2,         // 最小搜索文字长度
    dragDistanceThreshold: 50 // 最小拖拽距离（像素）
  };

  // 创建样式元素
  const style = document.createElement('style');
  style.textContent = `
    .drag-to-open-indicator {
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(0, 150, 255, 0.9);
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: bold;
      z-index: 999999;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      transition: opacity 0.3s ease;
      pointer-events: none;
      max-width: 300px;
      word-wrap: break-word;
    }
    
    .drag-to-open-link-hover {
      outline: 2px dashed #007bff !important;
      outline-offset: 2px !important;
      cursor: grab !important;
      background-color: rgba(0, 123, 255, 0.1) !important;
    }
    
    .drag-to-open-text-selected {
      background-color: rgba(255, 215, 0, 0.3) !important;
    }
    
    .drag-to-open-cursor {
      cursor: grab !important;
    }
  `;
  document.head.appendChild(style);

  // 创建提示元素
  const indicator = document.createElement('div');
  indicator.className = 'drag-to-open-indicator';
  indicator.style.display = 'none';
  document.body.appendChild(indicator);

  // 拖拽状态跟踪
  let dragState = {
    isDragging: false,
    startX: 0,
    startY: 0,
    dragType: null, // 'link' 或 'text'
    dragData: null
  };

  // 显示提示
  function showIndicator(text, duration = 2000) {
    if (!config.showNotifications) return;
    
    indicator.textContent = text;
    indicator.style.display = 'block';
    indicator.style.opacity = '1';
    
    setTimeout(() => {
      indicator.style.opacity = '0';
      setTimeout(() => {
        indicator.style.display = 'none';
      }, 300);
    }, duration);
  }

  // 检查是否是有效链接
  function isValidLink(element) {
    if (!element) return false;
    
    const tagName = element.tagName.toLowerCase();
    if (tagName === 'a' && element.href) {
      return element.href.startsWith('http://') || element.href.startsWith('https://');
    }
    
    // 检查是否有父链接
    const parentLink = element.closest('a');
    if (parentLink && parentLink.href) {
      return parentLink.href.startsWith('http://') || parentLink.href.startsWith('https://');
    }
    
    return false;
  }

  // 获取链接URL和标题
  function getLinkInfo(element) {
    if (!element) return null;
    
    let linkElement = element;
    if (element.tagName.toLowerCase() !== 'a') {
      linkElement = element.closest('a');
    }
    
    if (!linkElement || !linkElement.href) return null;
    
    return {
      url: linkElement.href,
      title: linkElement.textContent.trim() || 
             linkElement.title || 
             linkElement.getAttribute('aria-label') || 
             '链接'
    };
  }

  // 处理鼠标按下事件 - 开始拖拽
  function handleMouseDown(event) {
    if (!config.enableLinkDrag) return;
    
    const target = event.target;
    
    // 检查是否是链接
    if (isValidLink(target)) {
      const linkInfo = getLinkInfo(target);
      if (linkInfo) {
        dragState.isDragging = true;
        dragState.startX = event.clientX;
        dragState.startY = event.clientY;
        dragState.dragType = 'link';
        dragState.dragData = linkInfo;
        
        // 添加视觉反馈
        const linkElement = target.tagName.toLowerCase() === 'a' ? target : target.closest('a');
        linkElement.classList.add('drag-to-open-link-hover');
        
        // 显示初始提示
        showIndicator(`准备拖拽链接: ${linkInfo.title.substring(0, 30)}...`);
      }
    }
  }

  // 处理鼠标移动事件 - 检测拖拽距离
  function handleMouseMove(event) {
    if (!dragState.isDragging) return;
    
    const distanceX = Math.abs(event.clientX - dragState.startX);
    const distanceY = Math.abs(event.clientY - dragState.startY);
    const totalDistance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
    
    // 如果拖拽距离超过阈值，设置拖拽数据
    if (totalDistance > config.dragDistanceThreshold && dragState.dragData) {
      event.dataTransfer.setData('text/uri-list', dragState.dragData.url);
      event.dataTransfer.setData('text/plain', dragState.dragData.title);
      event.dataTransfer.effectAllowed = 'copy';
      
      // 更新提示
      showIndicator(`拖拽链接中: ${dragState.dragData.title.substring(0, 30)}...`, 1000);
    }
  }

  // 处理鼠标松开事件 - 结束拖拽
  function handleMouseUp(event) {
    if (dragState.isDragging) {
      // 移除链接高亮
      const allLinks = document.querySelectorAll('.drag-to-open-link-hover');
      allLinks.forEach(link => {
        link.classList.remove('drag-to-open-link-hover');
      });
      
      dragState.isDragging = false;
      dragState.dragType = null;
      dragState.dragData = null;
    }
  }

  // 处理拖放事件 - 核心功能
  function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    
    // 重置拖拽状态
    dragState.isDragging = false;
    
    // 获取拖拽数据
    const dataTransfer = event.dataTransfer;
    
    // 1. 首先检查是否是链接
    let url = dataTransfer.getData('text/uri-list') || 
              dataTransfer.getData('text/plain') || 
              dataTransfer.getData('URL');
    
    // 检查是否是有效的URL
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      // 在新标签页打开链接
      window.open(url, '_blank');
      showIndicator('已在新标签页打开链接');
      return;
    }
    
    // 2. 检查是否是选中的文字
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    if (selectedText && selectedText.length >= config.minTextLength) {
      // 在新标签页搜索文字
      const searchUrl = config.searchEngine + encodeURIComponent(selectedText);
      window.open(searchUrl, '_blank');
      showIndicator(`正在百度搜索: ${selectedText.substring(0, 30)}...`);
      
      // 清除选中状态
      selection.removeAllRanges();
      return;
    }
    
    // 3. 检查dataTransfer中的普通文字
    const text = dataTransfer.getData('text/plain') || dataTransfer.getData('text');
    if (text && text.trim().length >= config.minTextLength) {
      const searchUrl = config.searchEngine + encodeURIComponent(text.trim());
      window.open(searchUrl, '_blank');
      showIndicator(`正在百度搜索: ${text.trim().substring(0, 30)}...`);
    }
  }

  // 允许拖放
  function handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }

  // 处理文字选择
  function handleTextSelection() {
    if (!config.enableTextDrag) return;
    
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    if (selectedText.length >= config.minTextLength) {
      showIndicator(`已选中文字: ${selectedText.substring(0, 30)}... (可拖拽搜索)`, 1500);
    }
  }

  // 初始化
  function init() {
    try {
      // 移除可能存在的旧监听器
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('drop', handleDrop);
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('mouseup', handleTextSelection);
      
      // 添加事件监听器
      if (config.enableLinkDrag) {
        document.addEventListener('mousedown', handleMouseDown, true);
        document.addEventListener('mousemove', handleMouseMove, true);
        document.addEventListener('mouseup', handleMouseUp, true);
      }
      
      document.addEventListener('drop', handleDrop, true);
      document.addEventListener('dragover', handleDragOver, true);
      
      if (config.enableTextDrag) {
        document.addEventListener('mouseup', handleTextSelection, true);
      }
      
      console.log('拖拽脚本V2初始化完成');
      showIndicator('拖拽功能V2已启用 ✓ 拖拽链接或文字即可操作', 3000);
      
    } catch (error) {
      console.error('拖拽脚本V2初始化失败:', error);
    }
  }

  // 等待DOM加载完成
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 100);
  }

  // 提供配置接口
  window.dragToOpenConfig = config;
  
  // 重新初始化函数
  window.reinitDragToOpen = function() {
    init();
  };

  // 调试函数
  window.debugDragToOpen = function() {
    console.log('拖拽脚本状态:', dragState);
    console.log('配置:', config);
    
    // 测试链接检测
    const testLinks = document.querySelectorAll('a');
    console.log(`页面找到 ${testLinks.length} 个链接`);
    
    if (testLinks.length > 0) {
      const firstLink = testLinks[0];
      console.log('第一个链接信息:', {
        href: firstLink.href,
        text: firstLink.textContent,
        isValid: isValidLink(firstLink)
      });
    }
  };

})();