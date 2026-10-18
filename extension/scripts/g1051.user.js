(function() {
  'use strict';
  
  if (window.__componentSelectorInstalled) {
    console.warn('组件选择器已安装');
    return;
  }
  window.__componentSelectorInstalled = true;

  let isActive = false;
  let currentTarget = null;
  let infoPanel = null;
  let highlightOverlay = null;

  // 创建样式
  const style = document.createElement('style');
  style.textContent = `
    .cs-floating-btn {
      position: fixed;
      right: 20px;
      top: 50%;
      transform: translateY(-50%);
      width: 50px;
      height: 50px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 50%;
      cursor: pointer;
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transition: all 0.3s ease;
      user-select: none;
    }
    .cs-floating-btn:hover {
      transform: translateY(-50%) scale(1.1);
      box-shadow: 0 6px 16px rgba(0,0,0,0.2);
    }
    .cs-floating-btn.active {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    }
    .cs-floating-btn svg {
      width: 28px;
      height: 28px;
      fill: white;
    }
    .cs-highlight {
      outline: 2px solid #667eea !important;
      outline-offset: 2px;
      cursor: crosshair !important;
    }
    .cs-info-panel {
      position: fixed;
      background: rgba(0, 0, 0, 0.9);
      color: #fff;
      padding: 12px 16px;
      border-radius: 8px;
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 12px;
      z-index: 1000000;
      max-width: 400px;
      pointer-events: none;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      line-height: 1.6;
    }
    .cs-info-panel .cs-label {
      color: #ffd700;
      font-weight: bold;
      margin-top: 8px;
      display: block;
    }
    .cs-info-panel .cs-label:first-child {
      margin-top: 0;
    }
    .cs-info-panel .cs-value {
      color: #87ceeb;
      word-break: break-all;
    }
    .cs-toast {
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #10b981;
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 1000001;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
      animation: cs-slide-in 0.3s ease;
    }
    @keyframes cs-slide-in {
      from {
        opacity: 0;
        transform: translateX(-50%) translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
    }
  `;
  document.head.appendChild(style);

  // 创建浮动按钮
  const floatingBtn = document.createElement('div');
  floatingBtn.className = 'cs-floating-btn';
  floatingBtn.innerHTML = `
    <svg viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
    </svg>
  `;
  floatingBtn.title = '点击开启/关闭组件选择器';
  document.body.appendChild(floatingBtn);

  // 创建信息面板
  function createInfoPanel() {
    if (infoPanel) return;
    infoPanel = document.createElement('div');
    infoPanel.className = 'cs-info-panel';
    document.body.appendChild(infoPanel);
  }

  // 获取元素的CSS选择器路径
  function getCSSSelector(element) {
    if (element.id) return `#${element.id}`;
    
    const path = [];
    let current = element;
    
    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();
      
      if (current.className) {
        const classes = Array.from(current.classList)
          .filter(c => !c.startsWith('cs-'))
          .join('.');
        if (classes) selector += `.${classes}`;
      }
      
      // 添加nth-child以确保唯一性
      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(
          el => el.tagName === current.tagName
        );
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1;
          selector += `:nth-child(${index})`;
        }
      }
      
      path.unshift(selector);
      current = current.parentElement;
    }
    
    return path.join(' > ');
  }

  // 获取元素的计算样式
  function getRelevantStyles(element) {
    const computed = window.getComputedStyle(element);
    const styles = {
      display: computed.display,
      position: computed.position,
      width: computed.width,
      height: computed.height,
      margin: computed.margin,
      padding: computed.padding,
      'background-color': computed.backgroundColor,
      color: computed.color,
      'font-size': computed.fontSize
    };
    
    return Object.entries(styles)
      .map(([key, value]) => `${key}: ${value}`)
      .join('; ');
  }

  // 获取元素信息
  function getElementInfo(element) {
    const tagName = element.tagName.toLowerCase();
    const id = element.id ? `id="${element.id}"` : '';
    const classes = element.className ? `class="${element.className}"` : '';
    const selector = getCSSSelector(element);
    const styles = getRelevantStyles(element);
    
    return {
      html: `<${tagName} ${id} ${classes}>`.trim(),
      selector: selector,
      styles: styles,
      outerHTML: element.outerHTML.substring(0, 200) + (element.outerHTML.length > 200 ? '...' : '')
    };
  }

  // 显示信息面板
  function showInfoPanel(element, x, y) {
    if (!infoPanel) createInfoPanel();
    
    const info = getElementInfo(element);
    
    infoPanel.innerHTML = `
      <span class="cs-label">标签:</span>
      <div class="cs-value">${info.html}</div>
      <span class="cs-label">选择器:</span>
      <div class="cs-value">${info.selector}</div>
      <span class="cs-label">样式:</span>
      <div class="cs-value">${info.styles}</div>
    `;
    
    // 定位面板（避免超出视口）
    infoPanel.style.display = 'block';
    const panelRect = infoPanel.getBoundingClientRect();
    let left = x + 15;
    let top = y + 15;
    
    if (left + panelRect.width > window.innerWidth) {
      left = x - panelRect.width - 15;
    }
    if (top + panelRect.height > window.innerHeight) {
      top = y - panelRect.height - 15;
    }
    
    infoPanel.style.left = `${left}px`;
    infoPanel.style.top = `${top}px`;
  }

  // 隐藏信息面板
  function hideInfoPanel() {
    if (infoPanel) {
      infoPanel.style.display = 'none';
    }
  }

  // 复制到剪贴板
  async function copyToClipboard(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // 降级方案
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-999999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      return true;
    } catch (err) {
      console.error('复制失败:', err);
      return false;
    }
  }

  // 显示toast提示
  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'cs-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'cs-slide-in 0.3s ease reverse';
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

  // 鼠标移动事件
  function handleMouseMove(e) {
    if (!isActive) return;
    
    const target = e.target;
    
    // 忽略工具自身的元素
    if (target.closest('.cs-floating-btn') || 
        target.closest('.cs-info-panel') || 
        target.closest('.cs-toast')) {
      return;
    }
    
    if (currentTarget !== target) {
      if (currentTarget) {
        currentTarget.classList.remove('cs-highlight');
      }
      currentTarget = target;
      currentTarget.classList.add('cs-highlight');
    }
    
    showInfoPanel(target, e.clientX, e.clientY);
  }

  // 点击事件 - 复制格式：【已选择组件:选择器】
  async function handleClick(e) {
    if (!isActive) return;
    
    const target = e.target;
    
    // 忽略工具自身的元素
    if (target.closest('.cs-floating-btn') || 
        target.closest('.cs-info-panel') || 
        target.closest('.cs-toast')) {
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    
    const selector = getCSSSelector(target);
    const copyText = `【已选择组件:${selector}】`;
    
    const success = await copyToClipboard(copyText);
    if (success) {
      showToast('✓ 已复制');
    } else {
      showToast('✗ 复制失败');
    }
  }

  // 切换激活状态
  function toggleActive() {
    isActive = !isActive;
    
    if (isActive) {
      floatingBtn.classList.add('active');
      floatingBtn.title = '点击关闭组件选择器';
      createInfoPanel();
      document.addEventListener('mousemove', handleMouseMove, true);
      document.addEventListener('click', handleClick, true);
      document.body.style.cursor = 'crosshair';
    } else {
      floatingBtn.classList.remove('active');
      floatingBtn.title = '点击开启组件选择器';
      document.removeEventListener('mousemove', handleMouseMove, true);
      document.removeEventListener('click', handleClick, true);
      document.body.style.cursor = '';
      
      if (currentTarget) {
        currentTarget.classList.remove('cs-highlight');
        currentTarget = null;
      }
      hideInfoPanel();
    }
  }

  // 按钮点击事件
  floatingBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleActive();
  });

  // ESC键关闭
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isActive) {
      toggleActive();
    }
  });

  console.log('✓ 组件选择器已加载 - 点击右侧按钮开启');
})();