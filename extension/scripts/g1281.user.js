(function() {
  // 防止重复执行
  if (window.elementDownloadMenu) {
    console.log('元素下载菜单已存在');
    return;
  }

  // 创建样式
  const style = document.createElement('style');
  style.textContent = `
    .element-download-container {
      position: fixed;
      z-index: 999999;
      bottom: 100px;
      right: 100px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      user-select: none;
    }
    
    .element-download-toggle {
      width: 180px;
      height: 50px;
      background: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20px;
      cursor: move;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
      transition: all 0.3s ease;
      color: #333;
      font-size: 14px;
      font-weight: 500;
    }
    
    .element-download-toggle:hover {
      background: rgba(255, 255, 255, 0.25);
      transform: translateY(-2px);
    }
    
    .element-download-arrow {
      transition: transform 0.3s ease;
      font-size: 16px;
    }
    
    .element-download-arrow.expanded {
      transform: rotate(180deg);
    }
    
    .element-download-panel {
      position: absolute;
      bottom: 60px;
      right: 0;
      width: 400px;
      max-height: 500px;
      background: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
      overflow: hidden;
      opacity: 0;
      transform: translateY(20px);
      transition: all 0.3s ease;
      pointer-events: none;
    }
    
    .element-download-panel.expanded {
      opacity: 1;
      transform: translateY(0);
      pointer-events: all;
    }
    
    .element-download-header {
      padding: 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      font-size: 16px;
      font-weight: 600;
      color: #333;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    
    .element-download-content {
      display: flex;
      flex-direction: column;
      height: 420px;
    }
    
    .element-list-container {
      flex: 1;
      overflow-y: auto;
      padding: 15px;
      max-height: 200px;
    }
    
    .element-list-container::-webkit-scrollbar {
      width: 6px;
    }
    
    .element-list-container::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 3px;
    }
    
    .element-list-container::-webkit-scrollbar-thumb {
      background: rgba(0, 0, 0, 0.2);
      border-radius: 3px;
    }
    
    .element-item {
      display: flex;
      align-items: center;
      padding: 12px;
      margin-bottom: 8px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
      border: 2px solid transparent;
    }
    
    .element-item:hover {
      background: rgba(255, 255, 255, 0.2);
      transform: translateX(4px);
    }
    
    .element-item.selected {
      background: rgba(255, 255, 255, 0.25);
      border-color: #ff6b35;
    }
    
    .element-icon {
      width: 24px;
      height: 24px;
      margin-right: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
    }
    
    .element-info {
      flex: 1;
      min-width: 0;
    }
    
    .element-title {
      font-size: 14px;
      font-weight: 500;
      color: #333;
      margin-bottom: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .element-url {
      font-size: 12px;
      color: #666;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .preview-container {
      padding: 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      min-height: 200px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .preview-placeholder {
      color: #999;
      font-size: 14px;
      text-align: center;
    }
    
    .preview-image {
      max-width: 100%;
      max-height: 180px;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    }
    
    .preview-video {
      max-width: 100%;
      max-height: 180px;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    }
    
    .button-container {
      padding: 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      gap: 12px;
    }
    
    .action-button {
      flex: 1;
      height: 44px;
      border: none;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    
    .action-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .preview-button {
      background: white;
      color: #333;
    }
    
    .preview-button:hover:not(:disabled) {
      background: #f5f5f5;
      transform: translateY(-2px);
    }
    
    .download-button {
      background: #ff6b35;
      color: white;
    }
    
    .download-button:hover:not(:disabled) {
      background: #ff5722;
      transform: translateY(-2px);
    }
  `;
  document.head.appendChild(style);

  // 创建容器
  const container = document.createElement('div');
  container.className = 'element-download-container';
  container.innerHTML = `
    <div class="element-download-panel">
      <div class="element-download-header">
        <span>网页元素下载 △</span>
      </div>
      <div class="element-download-content">
        <div class="element-list-container" id="elementList"></div>
        <div class="preview-container" id="previewContainer">
          <div class="preview-placeholder">请选择一个元素进行预览</div>
        </div>
        <div class="button-container">
          <button class="action-button preview-button" id="previewBtn" disabled>
            <span>预览视频</span>
          </button>
          <button class="action-button download-button" id="downloadBtn" disabled>
            <span>下载此元素</span>
          </button>
        </div>
      </div>
    </div>
    <div class="element-download-toggle">
      <span>网页元素下载 ▽</span>
      <span class="element-download-arrow">▽</span>
    </div>
  `;

  document.body.appendChild(container);
  window.elementDownloadMenu = container;

  // 获取DOM元素
  const toggleBtn = container.querySelector('.element-download-toggle');
  const arrow = container.querySelector('.element-download-arrow');
  const panel = container.querySelector('.element-download-panel');
  const elementList = document.getElementById('elementList');
  const previewContainer = document.getElementById('previewContainer');
  const previewBtn = document.getElementById('previewBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const headerText = container.querySelector('.element-download-header span');

  // 状态管理
  let isExpanded = false;
  let selectedElement = null;
  let elements = [];
  let isDragging = false;
  let dragOffset = { x: 0, y: 0 };

  // 收集页面元素
  function collectElements() {
    elements = [];
    
    // 收集图片
    document.querySelectorAll('img').forEach((img, index) => {
      if (img.src && !img.src.includes('data:') && img.width > 50 && img.height > 50) {
        elements.push({
          type: 'image',
          element: img,
          src: img.src,
          alt: img.alt || `图片 ${index + 1}`,
          title: img.title || `图片 ${index + 1}`
        });
      }
    });
    
    // 收集视频
    document.querySelectorAll('video').forEach((video, index) => {
      if (video.src || video.querySelector('source')) {
        const src = video.src || (video.querySelector('source')?.src);
        if (src) {
          elements.push({
            type: 'video',
            element: video,
            src: src,
            alt: video.title || `视频 ${index + 1}`,
            title: video.title || `视频 ${index + 1}`
          });
        }
      }
    });
    
    // 收集带背景图片的元素
    document.querySelectorAll('*').forEach((el, index) => {
      const style = window.getComputedStyle(el);
      const bgImage = style.backgroundImage;
      if (bgImage && bgImage !== 'none' && !bgImage.includes('data:')) {
        const match = bgImage.match(/url$["']?(.*?)["']?$/);
        if (match && match[1]) {
          elements.push({
            type: 'background',
            element: el,
            src: match[1],
            alt: `背景图片 ${index + 1}`,
            title: `背景图片 ${index + 1}`
          });
        }
      }
    });
    
    updateElementList();
  }

  // 更新元素列表
  function updateElementList() {
    elementList.innerHTML = '';
    
    if (elements.length === 0) {
      elementList.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">未找到可下载的元素</div>';
      return;
    }
    
    elements.forEach((element, index) => {
      const item = document.createElement('div');
      item.className = 'element-item';
      item.dataset.index = index;
      
      const icon = element.type === 'image' || element.type === 'background' ? '🖼️' : '🎬';
      
      item.innerHTML = `
        <div class="element-icon">${icon}</div>
        <div class="element-info">
          <div class="element-title">${element.title}</div>
          <div class="element-url">${element.src.substring(0, 50)}${element.src.length > 50 ? '...' : ''}</div>
        </div>
      `;
      
      item.addEventListener('click', () => selectElement(index));
      elementList.appendChild(item);
    });
  }

  // 选择元素
  function selectElement(index) {
    // 移除之前的选择
    elementList.querySelectorAll('.element-item').forEach(item => {
      item.classList.remove('selected');
    });
    
    // 添加新选择
    const selectedItem = elementList.querySelector(`[data-index="${index}"]`);
    if (selectedItem) {
      selectedItem.classList.add('selected');
    }
    
    selectedElement = elements[index];
    updatePreview();
    updateButtons();
  }

  // 更新预览
  function updatePreview() {
    previewContainer.innerHTML = '';
    
    if (!selectedElement) {
      previewContainer.innerHTML = '<div class="preview-placeholder">请选择一个元素进行预览</div>';
      return;
    }
    
    if (selectedElement.type === 'image' || selectedElement.type === 'background') {
      const img = document.createElement('img');
      img.className = 'preview-image';
      img.src = selectedElement.src;
      img.onerror = () => {
        previewContainer.innerHTML = '<div class="preview-placeholder">图片加载失败</div>';
      };
      previewContainer.appendChild(img);
    } else if (selectedElement.type === 'video') {
      const video = document.createElement('video');
      video.className = 'preview-video';
      video.src = selectedElement.src;
      video.controls = false;
      video.muted = true;
      video.autoplay = false;
      
      // 尝试获取第一帧
      video.addEventListener('loadeddata', () => {
        video.currentTime = 0;
      });
      
      video.addEventListener('seeked', () => {
        // 视频已定位到第一帧
      });
      
      video.onerror = () => {
        previewContainer.innerHTML = '<div class="preview-placeholder">视频加载失败</div>';
      };
      
      previewContainer.appendChild(video);
    }
  }

  // 更新按钮状态
  function updateButtons() {
    if (!selectedElement) {
      previewBtn.disabled = true;
      downloadBtn.disabled = true;
      return;
    }
    
    // 预览按钮：仅视频可用
    previewBtn.disabled = selectedElement.type !== 'video';
    
    // 下载按钮：所有选中的元素都可用
    downloadBtn.disabled = false;
  }

  // 切换展开/收缩
  function togglePanel() {
    isExpanded = !isExpanded;
    
    if (isExpanded) {
      panel.classList.add('expanded');
      arrow.classList.add('expanded');
      arrow.textContent = '△';
      toggleBtn.querySelector('span:first-child').textContent = '网页元素下载 △';
      headerText.textContent = '网页元素下载 △';
      
      // 展开时收集元素
      collectElements();
    } else {
      panel.classList.remove('expanded');
      arrow.classList.remove('expanded');
      arrow.textContent = '▽';
      toggleBtn.querySelector('span:first-child').textContent = '网页元素下载 ▽';
    }
  }

  // 预览视频
  function previewVideo() {
    if (!selectedElement || selectedElement.type !== 'video') return;
    
    // 在新标签页打开视频
    window.open(selectedElement.src, '_blank');
  }

  // 下载元素
  async function downloadElement() {
    if (!selectedElement) return;
    
    try {
      // 使用Tabbit API下载文件
      const response = await fetch(selectedElement.src);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      
      // 生成文件名
      const filename = selectedElement.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() + 
        (selectedElement.type === 'image' ? '.jpg' : '.mp4');
      a.download = filename;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      window.URL.revokeObjectURL(url);
      
      // 显示下载成功提示
      showNotification('下载开始', '文件已开始下载到您的设备');
    } catch (error) {
      console.error('下载失败:', error);
      showNotification('下载失败', '无法下载该文件，请检查网络连接');
    }
  }

  // 显示通知
  function showNotification(title, message) {
    // 创建简单的通知
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      border-radius: 12px;
      padding: 16px 20px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
      z-index: 1000000;
      max-width: 300px;
      animation: slideIn 0.3s ease;
      border: 1px solid rgba(255, 255, 255, 0.2);
    `;
    
    notification.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 4px; color: #333;">${title}</div>
      <div style="font-size: 14px; color: #666;">${message}</div>
    `;
    
    document.body.appendChild(notification);
    
    // 3秒后移除
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => {
        if (notification.parentNode) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  // 添加动画样式
  const animationStyle = document.createElement('style');
  animationStyle.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(animationStyle);

  // 拖拽功能
  toggleBtn.addEventListener('mousedown', startDrag);
  
  function startDrag(e) {
    if (e.target !== toggleBtn && e.target !== arrow && !e.target.classList.contains('element-download-arrow')) {
      return;
    }
    
    isDragging = true;
    const rect = container.getBoundingClientRect();
    dragOffset.x = e.clientX - rect.left;
    dragOffset.y = e.clientY - rect.top;
    
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDrag);
    
    e.preventDefault();
  }
  
  function drag(e) {
    if (!isDragging) return;
    
    const x = e.clientX - dragOffset.x;
    const y = e.clientY - dragOffset.y;
    
    // 限制在窗口内
    const maxX = window.innerWidth - container.offsetWidth;
    const maxY = window.innerHeight - container.offsetHeight;
    
    container.style.left = Math.max(0, Math.min(x, maxX)) + 'px';
    container.style.top = Math.max(0, Math.min(y, maxY)) + 'px';
    container.style.right = 'auto';
    container.style.bottom = 'auto';
  }
  
  function stopDrag() {
    isDragging = false;
    document.removeEventListener('mousemove', drag);
    document.removeEventListener('mouseup', stopDrag);
  }

  // 事件监听
  toggleBtn.addEventListener('click', (e) => {
    if (!isDragging) {
      togglePanel();
    }
  });
  
  previewBtn.addEventListener('click', previewVideo);
  downloadBtn.addEventListener('click', downloadElement);

  // 初始位置
  container.style.bottom = '100px';
  container.style.right = '100px';

  console.log('网页元素下载菜单已加载');
})();