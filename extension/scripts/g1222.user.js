(function() {
  'use strict';

  // 防止重复执行
  if (window.myMemoryTranslator) return;
  window.myMemoryTranslator = true;

  // 配置
  const CONFIG = {
    apiEndpoint: 'https://api.mymemory.translated.net/get',
    targetLang: 'zh', // 默认翻译为中文
    showDelay: 300, // 显示延迟（毫秒）
    hideDelay: 1000, // 隐藏延迟（毫秒）
    maxTextLength: 500 // 最大翻译文本长度
  };

  // 创建翻译UI
  function createTranslationUI() {
    const container = document.createElement('div');
    container.id = 'my-memory-translator-container';
    container.style.cssText = `
      position: absolute;
      z-index: 999999;
      background: white;
      border: 1px solid #ddd;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      padding: 12px;
      max-width: 300px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      display: none;
      transition: opacity 0.2s ease;
    `;

    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      padding-bottom: 8px;
      border-bottom: 1px solid #eee;
    `;

    const title = document.createElement('span');
    title.textContent = '翻译结果';
    title.style.cssText = `
      font-weight: 600;
      color: #333;
    `;

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = `
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      color: #999;
      padding: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
    `;
    closeBtn.addEventListener('click', hideTranslation);

    const content = document.createElement('div');
    content.id = 'my-memory-translation-content';
    content.style.cssText = `
      color: #333;
      word-break: break-word;
    `;

    const footer = document.createElement('div');
    footer.style.cssText = `
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid #eee;
      font-size: 12px;
      color: #666;
      display: flex;
      justify-content: space-between;
    `;

    const sourceText = document.createElement('span');
    sourceText.id = 'my-memory-source-text';
    sourceText.style.cssText = `
      max-width: 60%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    `;

    const poweredBy = document.createElement('span');
    poweredBy.textContent = 'MyMemory';
    poweredBy.style.cssText = `
      color: #999;
    `;

    header.appendChild(title);
    header.appendChild(closeBtn);
    footer.appendChild(sourceText);
    footer.appendChild(poweredBy);
    container.appendChild(header);
    container.appendChild(content);
    container.appendChild(footer);

    document.body.appendChild(container);
    return container;
  }

  // 获取选中文本
  function getSelectedText() {
    return window.getSelection().toString().trim();
  }

  // 显示翻译框
  function showTranslation(text, translation, position) {
    const container = document.getElementById('my-memory-translator-container');
    const content = document.getElementById('my-memory-translation-content');
    const sourceText = document.getElementById('my-memory-source-text');

    if (!container || !content || !sourceText) return;

    content.textContent = translation;
    sourceText.textContent = text.length > 30 ? text.substring(0, 30) + '...' : text;

    // 设置位置
    container.style.left = position.x + 'px';
    container.style.top = position.y + 'px';
    container.style.display = 'block';
    container.style.opacity = '1';

    // 确保在视口内
    const rect = container.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      container.style.left = (position.x - rect.width) + 'px';
    }
    if (rect.bottom > window.innerHeight) {
      container.style.top = (position.y - rect.height) + 'px';
    }
  }

  // 隐藏翻译框
  function hideTranslation() {
    const container = document.getElementById('my-memory-translator-container');
    if (container) {
      container.style.opacity = '0';
      setTimeout(() => {
        container.style.display = 'none';
      }, 200);
    }
  }

  // 获取选中位置
  function getSelectionPosition() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return null;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    return {
      x: rect.left + window.scrollX,
      y: rect.bottom + window.scrollY + 5
    };
  }

  // 翻译文本
  async function translateText(text) {
    if (!text || text.length > CONFIG.maxTextLength) {
      return '文本过长，请选择较短的文本';
    }

    try {
      // 检测语言（简单检测，假设非中文字符为英文）
      const sourceLang = /[\u4e00-\u9fa5]/.test(text) ? 'zh' : 'en';
      
      const params = new URLSearchParams({
        q: text,
        langpair: `${sourceLang}|${CONFIG.targetLang}`
      });

      const response = await fetch(`${CONFIG.apiEndpoint}?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.responseStatus === 200 && data.responseData) {
        return data.responseData.translatedText;
      } else {
        return '翻译失败，请重试';
      }
    } catch (error) {
      console.error('翻译错误:', error);
      return '翻译服务暂时不可用';
    }
  }

  // 处理文本选择
  let selectionTimer;
  async function handleTextSelection() {
    const text = getSelectedText();
    if (!text) {
      hideTranslation();
      return;
    }

    const position = getSelectionPosition();
    if (!position) return;

    // 清除之前的计时器
    clearTimeout(selectionTimer);

    // 延迟显示，避免频繁请求
    selectionTimer = setTimeout(async () => {
      // 显示加载状态
      const container = document.getElementById('my-memory-translator-container');
      const content = document.getElementById('my-memory-translation-content');
      if (container && content) {
        content.textContent = '翻译中...';
        showTranslation(text, '翻译中...', position);
      }

      // 获取翻译
      const translation = await translateText(text);
      
      // 显示翻译结果
      if (container && content) {
        showTranslation(text, translation, position);
      }
    }, CONFIG.showDelay);
  }

  // 初始化
  function initTranslator() {
    // 创建UI
    createTranslationUI();

    // 监听文本选择
    document.addEventListener('mouseup', handleTextSelection);
    document.addEventListener('selectionchange', handleTextSelection);

    // 点击页面其他地方隐藏翻译框
    document.addEventListener('mousedown', (e) => {
      const container = document.getElementById('my-memory-translator-container');
      if (container && !container.contains(e.target)) {
        hideTranslation();
      }
    });

    // ESC键隐藏翻译框
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        hideTranslation();
      }
    });

    console.log('MyMemory 划词翻译工具已加载');
  }

  // 执行初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTranslator);
  } else {
    initTranslator();
  }
})();