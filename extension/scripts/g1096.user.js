(function() {
  console.log('正在将网页背景改为浅绿色...');
  
  function changeBackgroundColor() {
    // 设置整个页面的背景颜色
    document.body.style.backgroundColor = '#e8f5e9';
    
    // 确保所有主要容器也使用透明背景
    const containers = document.querySelectorAll('.usage-guide-page, .usage-guide, .ug-section-container, .ug-items-list, .ug-image-area');
    containers.forEach(container => {
      if (container) {
        container.style.backgroundColor = 'transparent';
      }
    });
    
    // 设置文本容器的背景为浅色
    const textElements = document.querySelectorAll('.ug-item, .ug-section-header, .usage-guide-hero');
    textElements.forEach(element => {
      if (element) {
        element.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
        element.style.borderRadius = '8px';
        element.style.padding = '12px';
        element.style.marginBottom = '8px';
      }
    });
    
    console.log('背景颜色已成功更改为浅绿色');
  }

  // 页面加载完成后执行
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', changeBackgroundColor);
  } else {
    changeBackgroundColor();
  }

  // 添加样式以防止内容被覆盖
  const style = document.createElement('style');
  style.textContent = `
    body { 
      background-color: #e8f5e9 !important; 
      transition: background-color 0.3s ease;
    }
    .usage-guide-page, .usage-guide, .ug-section-container, .ug-items-list, .ug-image-area {
      background-color: transparent !important;
    }
    .ug-item, .ug-section-header, .usage-guide-hero {
      background-color: rgba(255, 255, 255, 0.9) !important;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 8px;
    }
  `;
  document.head.appendChild(style);
})();