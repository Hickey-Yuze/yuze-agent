(function() {
  'use strict';
  
  if (window.__PAGE_TRANSLATOR_INITIALIZED__) return;
  window.__PAGE_TRANSLATOR_INITIALIZED__ = true;

  const DEFAULT_CONFIG = {
    batchSize: 10,  // 降低批次大小，减少请求压力
    shortTextLimit: 50,
    pageHeightThreshold: 3,
    translationDelay: 300  // 增加延迟，避免被限流
  };

  let CONFIG = { ...DEFAULT_CONFIG };
  
  function loadConfig() {
    try {
      const saved = localStorage.getItem('pageTranslatorConfig');
      if (saved) {
        CONFIG = { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('配置加载失败:', e);
    }
  }

  function saveConfig() {
    try {
      localStorage.setItem('pageTranslatorConfig', JSON.stringify(CONFIG));
    } catch (e) {
      console.warn('配置保存失败:', e);
    }
  }

  loadConfig();

  let translationEnabled = false;
  let translatedNodes = new WeakSet();
  let observer = null;
  let translationCount = 0;  // 添加计数器

  // ✅ 增强版翻译函数 - 添加详细日志
  async function translateText(text) {
    try {
      console.log(`[翻译] 正在翻译第 ${++translationCount} 条:`, text.substring(0, 30) + '...');
      
      const encodedText = encodeURIComponent(text);
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=zh-CN&dt=t&q=${encodedText}`;
      
      console.log('[翻译] 请求 URL:', url.substring(0, 100) + '...');
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      });
      
      console.log('[翻译] 响应状态:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log('[翻译] 响应数据:', data);
      
      if (!data || !data[0] || !Array.isArray(data[0])) {
        throw new Error('响应格式无效');
      }
      
      const translated = data[0].map(item => item[0]).join('');
      console.log('[翻译] ✅ 成功:', text.substring(0, 20), '→', translated.substring(0, 20));
      
      return translated;
    } catch (error) {
      console.error('[翻译] ❌ 失败:', error.message, '原文:', text.substring(0, 50));
      return text;
    }
  }

  function containsEnglish(text) {
    return /[a-zA-Z]{2,}/.test(text);
  }

  function isVisible(element) {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0';
  }

  function getTextType(text) {
    const trimmed = text.trim();
    if (trimmed.length <= CONFIG.shortTextLimit) {
      return 'short';
    }
    return 'long';
  }

  function createTranslationWrapper(originalText, translatedText, textType) {
    const wrapper = document.createElement('span');
    wrapper.className = 'page-translator-wrapper';
    wrapper.style.cssText = 'position: relative; display: inline;';

    const original = document.createElement('span');
    original.className = 'original-text';
    original.textContent = originalText;

    if (textType === 'short') {
      const translation = document.createElement('span');
      translation.className = 'translation-inline';
      translation.style.cssText = 'color: #1976d2; margin-left: 6px; font-size: 0.95em;';
      translation.textContent = `(${translatedText})`;
      
      wrapper.appendChild(original);
      wrapper.appendChild(translation);
    } else {
      const translation = document.createElement('span');
      translation.className = 'translation-tooltip';
      translation.style.cssText = `
        position: absolute;
        left: 0;
        top: 100%;
        background: rgba(25, 118, 210, 0.95);
        color: white;
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 0.9em;
        max-width: 400px;
        width: max-content;
        z-index: 10000;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.2s;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        margin-top: 4px;
      `;
      translation.textContent = translatedText;

      wrapper.appendChild(original);
      wrapper.appendChild(translation);

      wrapper.addEventListener('mouseenter', () => {
        translation.style.opacity = '1';
      });

      wrapper.addEventListener('mouseleave', () => {
        translation.style.opacity = '0';
      });
    }

    return wrapper;
  }

  async function processTextNode(node) {
    if (!node.parentElement || translatedNodes.has(node)) return;
    if (!isVisible(node.parentElement)) return;

    const text = node.textContent.trim();
    if (!text || !containsEnglish(text)) return;

    console.log('[处理] 开始处理文本节点:', text.substring(0, 30));

    translatedNodes.add(node);
    const translated = await translateText(text);
    
    if (translated === text) {
      console.warn('[处理] ⚠️ 翻译无变化，跳过');
      return;
    }
    
    const textType = getTextType(text);
    const wrapper = createTranslationWrapper(text, translated, textType);

    try {
      node.parentElement.replaceChild(wrapper, node);
      console.log('[处理] ✅ 成功替换节点');
    } catch (e) {
      console.error('[处理] ❌ 替换节点失败:', e);
    }
  }

  function getTextNodes(root) {
    console.log('[扫描] 开始扫描文本节点...');
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          const text = node.textContent.trim();
          if (!text || !containsEnglish(text)) return NodeFilter.FILTER_REJECT;
          if (node.parentElement.closest('script, style, noscript, iframe, .page-translator-wrapper')) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const nodes = [];
    let currentNode;
    while (currentNode = walker.nextNode()) {
      nodes.push(currentNode);
    }
    console.log('[扫描] ✅ 找到', nodes.length, '个文本节点');
    return nodes;
  }

  async function translateBatch(nodes, startIndex) {
    const batch = nodes.slice(startIndex, startIndex + CONFIG.batchSize);
    console.log(`[批处理] 处理批次 ${Math.floor(startIndex / CONFIG.batchSize) + 1}, 共 ${batch.length} 个节点`);
    
    for (const node of batch) {
      await processTextNode(node);
    }
  }

  function isLongPage() {
    const viewportHeight = window.innerHeight;
    const pageHeight = document.documentElement.scrollHeight;
    return pageHeight > viewportHeight * CONFIG.pageHeightThreshold;
  }

  function setupLazyTranslation() {
    if (observer) observer.disconnect();

    observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && translationEnabled) {
          const nodes = getTextNodes(entry.target);
          nodes.forEach(node => processTextNode(node));
        }
      });
    }, {
      rootMargin: '200px'
    });

    const sections = document.querySelectorAll('section, article, main, div[class*="content"]');
    sections.forEach(section => observer.observe(section));
  }

  async function startTranslation() {
    console.log('[启动] 🚀 开始翻译流程...');
    translationCount = 0;
    
    const nodes = getTextNodes(document.body);
    
    if (nodes.length === 0) {
      console.warn('[启动] ⚠️ 没有找到可翻译的文本节点');
      alert('未找到可翻译的英文文本！');
      return;
    }
    
    if (isLongPage()) {
      console.log('[启动] 检测到长页面，使用渐进式翻译');
      setupLazyTranslation();
      
      const visibleNodes = nodes.filter(node => {
        const rect = node.parentElement.getBoundingClientRect();
        return rect.top < window.innerHeight && rect.bottom > 0;
      });
      
      console.log('[启动] 可见节点数:', visibleNodes.length);
      
      for (let i = 0; i < visibleNodes.length; i += CONFIG.batchSize) {
        await translateBatch(visibleNodes, i);
        await new Promise(resolve => setTimeout(resolve, CONFIG.translationDelay));
      }
    } else {
      for (let i = 0; i < nodes.length; i += CONFIG.batchSize) {
        await translateBatch(nodes, i);
        await new Promise(resolve => setTimeout(resolve, CONFIG.translationDelay));
      }
    }
    
    console.log('[启动] ✅ 翻译流程完成，共处理', translationCount, '条文本');
  }

  function stopTranslation() {
    console.log('[停止] 停止翻译...');
    if (observer) {
      observer.disconnect();
      observer = null;
    }

    document.querySelectorAll('.page-translator-wrapper').forEach(wrapper => {
      const originalText = wrapper.querySelector('.original-text');
      if (originalText) {
        const textNode = document.createTextNode(originalText.textContent);
        wrapper.parentElement.replaceChild(textNode, wrapper);
      }
    });

    translatedNodes = new WeakSet();
    translationCount = 0;
    console.log('[停止] ✅ 已恢复原文');
  }

  function createConfigPanel() {
    const panel = document.createElement('div');
    panel.id = 'translator-config-panel';
    panel.style.cssText = `
      position: fixed;
      top: 70px;
      right: 20px;
      width: 300px;
      background: white;
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      z-index: 999998;
      font-family: system-ui, -apple-system, sans-serif;
      display: none;
    `;

    const configs = [
      { key: 'batchSize', label: '每批翻译数', min: 5, max: 50, step: 5, unit: '个' },
      { key: 'shortTextLimit', label: '短文本阈值', min: 20, max: 200, step: 10, unit: '字符' },
      { key: 'pageHeightThreshold', label: '长页面倍数', min: 2, max: 10, step: 1, unit: '倍' },
      { key: 'translationDelay', label: '批次延迟', min: 100, max: 1000, step: 100, unit: 'ms' }
    ];

    configs.forEach(config => {
      const item = document.createElement('div');
      item.style.cssText = 'margin-bottom: 16px;';

      const labelRow = document.createElement('div');
      labelRow.style.cssText = 'display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px;';
      
      const label = document.createElement('span');
      label.textContent = config.label;
      label.style.color = '#333';
      
      const value = document.createElement('span');
      value.style.cssText = 'color: #1976d2; font-weight: 500;';
      value.textContent = `${CONFIG[config.key]}${config.unit}`;
      
      labelRow.appendChild(label);
      labelRow.appendChild(value);

      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = config.min;
      slider.max = config.max;
      slider.step = config.step;
      slider.value = CONFIG[config.key];
      slider.style.cssText = 'width: 100%; cursor: pointer;';

      slider.addEventListener('input', (e) => {
        const newValue = parseInt(e.target.value);
        CONFIG[config.key] = newValue;
        value.textContent = `${newValue}${config.unit}`;
        saveConfig();
      });

      item.appendChild(labelRow);
      item.appendChild(slider);
      panel.appendChild(item);
    });

    const resetBtn = document.createElement('button');
    resetBtn.textContent = '恢复默认';
    resetBtn.style.cssText = `
      width: 100%;
      padding: 8px;
      background: #f5f5f5;
      border: none;
      border-radius: 6px;
      color: #666;
      font-size: 13px;
      cursor: pointer;
      margin-top: 8px;
      transition: background 0.2s;
    `;
    resetBtn.addEventListener('mouseenter', () => {
      resetBtn.style.background = '#e0e0e0';
    });
    resetBtn.addEventListener('mouseleave', () => {
      resetBtn.style.background = '#f5f5f5';
    });
    resetBtn.addEventListener('click', () => {
      CONFIG = { ...DEFAULT_CONFIG };
      saveConfig();
      document.body.removeChild(panel);
      document.body.removeChild(document.getElementById('page-translator-toggle'));
      createToggleSwitch();
    });

    panel.appendChild(resetBtn);
    document.body.appendChild(panel);
    return panel;
  }

  function createToggleSwitch() {
    const container = document.createElement('div');
    container.id = 'page-translator-toggle';
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 999999;
      background: white;
      border: 2px solid #1976d2;
      border-radius: 24px;
      padding: 8px 16px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.15);
      display: flex;
      align-items: center;
      gap: 10px;
      font-family: system-ui, -apple-system, sans-serif;
      user-select: none;
      transition: all 0.3s;
    `;

    const label = document.createElement('span');
    label.textContent = '网页翻译';
    label.style.cssText = 'font-size: 14px; color: #333; font-weight: 500;';

    const switchEl = document.createElement('div');
    switchEl.style.cssText = `
      width: 44px;
      height: 24px;
      background: #ccc;
      border-radius: 12px;
      position: relative;
      transition: background 0.3s;
      cursor: pointer;
    `;

    const knob = document.createElement('div');
    knob.style.cssText = `
      width: 20px;
      height: 20px;
      background: white;
      border-radius: 50%;
      position: absolute;
      top: 2px;
      left: 2px;
      transition: transform 0.3s;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    `;

    const settingsBtn = document.createElement('button');
    settingsBtn.innerHTML = '⚙️';
    settingsBtn.style.cssText = `
      background: none;
      border: none;
      font-size: 16px;
      cursor: pointer;
      padding: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: background 0.2s;
    `;
    settingsBtn.addEventListener('mouseenter', () => {
      settingsBtn.style.background = '#f0f0f0';
    });
    settingsBtn.addEventListener('mouseleave', () => {
      settingsBtn.style.background = 'none';
    });

    let configPanel = null;
    settingsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (configPanel && configPanel.parentElement) {
        configPanel.style.display = configPanel.style.display === 'none' ? 'block' : 'none';
      } else {
        configPanel = createConfigPanel();
        configPanel.style.display = 'block';
      }
    });

    switchEl.appendChild(knob);
    container.appendChild(label);
    container.appendChild(switchEl);
    container.appendChild(settingsBtn);

    switchEl.addEventListener('click', () => {
      translationEnabled = !translationEnabled;
      
      if (translationEnabled) {
        switchEl.style.background = '#1976d2';
        knob.style.transform = 'translateX(20px)';
        container.style.borderColor = '#1976d2';
        console.log('[控制] 🔛 启用翻译');
        startTranslation();
      } else {
        switchEl.style.background = '#ccc';
        knob.style.transform = 'translateX(0)';
        container.style.borderColor = '#ccc';
        console.log('[控制] ⏸️ 禁用翻译');
        stopTranslation();
      }
    });

    document.body.appendChild(container);
  }

  function initialize() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(createToggleSwitch, 500);
      });
    } else {
      setTimeout(createToggleSwitch, 500);
    }
  }

  initialize();
  console.log('✅ 页面翻译器已初始化（调试增强版）');
  console.log('💡 提示：打开控制台可查看详细翻译日志');
})();