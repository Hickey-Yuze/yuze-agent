(function() {
  'use strict';

  // 防止重复执行
  if (window.__markdownPreviewInjected) return;
  window.__markdownPreviewInjected = true;

  // 引入 marked.js 用于 Markdown 渲染
  function loadMarkedJS(callback) {
    if (window.marked) {
      callback();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/marked@11.1.1/marked.min.js';
    script.onload = callback;
    document.head.appendChild(script);
  }

  // 检查当前文件是否为 Markdown
  function isMarkdownFile() {
    const fileNameEl = document.querySelector('.file-name');
    if (!fileNameEl) return false;
    const fileName = fileNameEl.textContent.trim();
    return /\.md$/i.test(fileName);
  }

  // 提取 Markdown 源码 - 已优化
  function extractMarkdownContent() {
    const lineWrappers = document.querySelectorAll('.diff-line-view-wrapper');
    if (lineWrappers.length === 0) {
      console.warn('未找到 diff-line-view-wrapper 元素');
      return '';
    }

    // 逐行遍历，提取每行 pre 标签下的文本
    const lines = Array.from(lineWrappers).map(wrapper => {
      const preElement = wrapper.querySelector('pre');
      return preElement ? preElement.textContent : '';
    });
    
    return lines.join('\n');
  }

  // 创建预览按钮 - 样式已优化
  function createPreviewButton() {
    const button = document.createElement('button');
    button.className = 'md-preview-btn';
    button.textContent = '📄 预览 Markdown';
    button.style.cssText = `
      padding: 6px 12px;
      margin-left: 8px;
      background: transparent;
      color: #666;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.3s;
    `;
    
    button.onmouseover = () => {
      button.style.background = '#f5f5f5';
      button.style.color = '#333';
    };
    button.onmouseout = () => {
      button.style.background = 'transparent';
      button.style.color = '#666';
    };

    button.onclick = () => showMarkdownPreview();
    return button;
  }

  // 创建预览浮层
  function createPreviewModal(htmlContent) {
    const modal = document.createElement('div');
    modal.className = 'md-preview-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.3s;
    `;

    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: white;
      border-radius: 8px;
      width: 90%;
      max-width: 1200px;
      height: 85%;
      display: flex;
      flex-direction: column;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      animation: slideIn 0.3s;
    `;

    const header = document.createElement('div');
    header.style.cssText = `
      padding: 16px 20px;
      border-bottom: 1px solid #e8e8e8;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;
    
    const title = document.createElement('h3');
    title.textContent = 'Markdown 预览';
    title.style.margin = '0';
    title.style.fontSize = '18px';
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'md-close-btn';
    closeBtn.textContent = '×';
    closeBtn.style.cssText = `
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #999;
      padding: 0;
      width: 32px;
      height: 32px;
      line-height: 32px;
      border-radius: 4px;
      transition: all 0.3s;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    header.appendChild(title);
    header.appendChild(closeBtn);

    const body = document.createElement('div');
    body.className = 'md-preview-body';
    body.style.cssText = `
      flex: 1;
      overflow: auto;
      padding: 24px 32px;
    `;
    body.innerHTML = htmlContent;

    // 添加 Markdown 样式
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes slideIn {
        from { transform: translateY(-20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      .md-preview-modal .md-close-btn:hover {
        background: #f5f5f5;
        color: #333;
      }
      .md-preview-body h1 { font-size: 32px; margin: 24px 0 16px; border-bottom: 2px solid #eee; padding-bottom: 8px; }
      .md-preview-body h2 { font-size: 28px; margin: 20px 0 12px; border-bottom: 1px solid #eee; padding-bottom: 6px; }
      .md-preview-body h3 { font-size: 24px; margin: 16px 0 10px; }
      .md-preview-body h4 { font-size: 20px; margin: 14px 0 8px; }
      .md-preview-body p { line-height: 1.8; margin: 12px 0; }
      .md-preview-body code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-family: 'Courier New', monospace; }
      .md-preview-body pre { background: #f5f5f5; padding: 16px; border-radius: 4px; overflow-x: auto; }
      .md-preview-body pre code { background: none; padding: 0; }
      .md-preview-body ul, .md-preview-body ol { line-height: 1.8; padding-left: 24px; }
      .md-preview-body li { margin: 6px 0; }
      .md-preview-body blockquote { border-left: 4px solid #1890ff; padding-left: 16px; margin: 16px 0; color: #666; }
      .md-preview-body table { border-collapse: collapse; width: 100%; margin: 16px 0; }
      .md-preview-body table th, .md-preview-body table td { border: 1px solid #ddd; padding: 10px; text-align: left; }
      .md-preview-body table th { background: #f5f5f5; font-weight: bold; }
      .md-preview-body a { color: #1890ff; text-decoration: none; }
      .md-preview-body a:hover { text-decoration: underline; }
      .md-preview-body img { max-width: 100%; height: auto; }
      .md-preview-body hr { border: none; border-top: 1px solid #eee; margin: 24px 0; }
    `;
    document.head.appendChild(style);

    modalContent.appendChild(header);
    modalContent.appendChild(body);
    modal.appendChild(modalContent);

    // 关闭按钮事件 - 修复：使用正确的变量引用
    closeBtn.onclick = function() {
      modal.remove();
      document.head.removeChild(style);
    };
    
    // 点击背景关闭
    modal.onclick = function(e) {
      if (e.target === modal) {
        modal.remove();
        document.head.removeChild(style);
      }
    };

    return modal;
  }

  // 显示 Markdown 预览
  function showMarkdownPreview() {
    try {
      const markdownText = extractMarkdownContent();
      if (!markdownText || markdownText.trim().length === 0) {
        alert('无法提取 Markdown 内容，请确保当前页面包含有效的 Markdown 文件');
        return;
      }

      loadMarkedJS(() => {
        try {
          // 配置 marked 选项
          marked.setOptions({
            breaks: true,
            gfm: true,
            headerIds: true,
            mangle: false
          });

          const htmlContent = marked.parse(markdownText);
          const modal = createPreviewModal(htmlContent);
          document.body.appendChild(modal);
          
          console.log('Markdown 预览已打开，内容长度:', markdownText.length, '字符');
        } catch (error) {
          console.error('Markdown 渲染失败:', error);
          alert('Markdown 渲染失败，请查看控制台详细信息');
        }
      });
    } catch (error) {
      console.error('预览功能出错:', error);
      alert('预览功能出现异常: ' + error.message);
    }
  }

  // 注入预览按钮
  function injectPreviewButton() {
    if (!isMarkdownFile()) {
      console.log('当前文件不是 Markdown 文件');
      return;
    }

    // 查找正确的按钮插入位置
    const titleRight = document.querySelector('.code-path-title-right');
    if (!titleRight) {
      console.warn('按钮插入位置未找到，尝试其他选择器');
      
      // 尝试其他可能的选择器
      const possibleSelectors = [
        '.file-header-right',
        '.file-header .right',
        '.file-header .actions',
        '.file-header .toolbar'
      ];
      
      for (const selector of possibleSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          console.log('找到替代位置:', selector);
          if (element.querySelector('.md-preview-btn')) {
            return; // 避免重复添加
          }
          const button = createPreviewButton();
          element.appendChild(button);
          console.log('Markdown 预览按钮已添加到替代位置');
          return;
        }
      }
      
      console.warn('无法找到合适的按钮插入位置');
      return;
    }

    // 避免重复添加
    if (titleRight.querySelector('.md-preview-btn')) {
      return;
    }

    const button = createPreviewButton();
    titleRight.appendChild(button);
    console.log('Markdown 预览按钮已添加到标题栏右侧');
  }

  // 监听 DOM 变化以支持 SPA 页面
  function observePageChanges() {
    const observer = new MutationObserver(() => {
      // 延迟执行，等待页面完全加载
      setTimeout(() => {
        injectPreviewButton();
      }, 500);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // 初始化
  function init() {
    console.log('Markdown 预览插件已加载');
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
          injectPreviewButton();
          observePageChanges();
        }, 1000);
      });
    } else {
      setTimeout(() => {
        injectPreviewButton();
        observePageChanges();
      }, 1000);
    }
  }

  init();
})();