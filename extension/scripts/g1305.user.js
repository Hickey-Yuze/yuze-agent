(function() {
  // 添加全局控制变量
  let isFilterEnabled = true;
  let monitorInterval = null;
  let mutationObserver = null;
  let isFirstFilter = true;
  let currentNotification = null;
  let totalFilteredCount = 0;
  
  // 从 localStorage 读取用户自定义的关键字
  function getKeywordsFromStorage() {
    try {
      const saved = localStorage.getItem('jd_filter_keywords');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('读取关键字失败:', e);
    }
    // 默认关键字
    return ['新年', '礼盒', '新春', '福袋'];
  }
  
  // 保存关键字到 localStorage
  function saveKeywordsToStorage(keywords) {
    try {
      localStorage.setItem('jd_filter_keywords', JSON.stringify(keywords));
      return true;
    } catch (e) {
      console.error('保存关键字失败:', e);
      return false;
    }
  }
  
  // 当前使用的关键字
  let keywordsToFilter = getKeywordsFromStorage();
  
  // 显示关键字设置弹窗
  function showKeywordSettings() {
    // 移除已存在的设置窗口
    const existing = document.getElementById('keywordSettingsModal');
    if (existing) {
      existing.remove();
    }
    
    const modal = document.createElement('div');
    modal.id = 'keywordSettingsModal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(5px);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.2s ease;
    `;
    
    const settingsBox = document.createElement('div');
    settingsBox.style.cssText = `
      background: white;
      border-radius: 16px;
      padding: 24px;
      max-width: 480px;
      width: 90%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      animation: scaleIn 0.3s ease;
    `;
    
    settingsBox.innerHTML = `
      <div style="margin-bottom: 20px;">
        <h2 style="margin: 0 0 8px 0; font-size: 20px; color: #333; display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 24px;">⚙️</span>
          <span>过滤关键字设置</span>
        </h2>
        <p style="margin: 0; font-size: 13px; color: #666;">设置要过滤的关键字，每行一个</p>
      </div>
      
      <div style="margin-bottom: 16px;">
        <textarea id="keywordsInput" 
          placeholder="每行输入一个关键字&#10;例如：&#10;新年&#10;礼盒&#10;新春&#10;福袋"
          style="
            width: 100%;
            min-height: 200px;
            padding: 12px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 14px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            resize: vertical;
            box-sizing: border-box;
            transition: border-color 0.2s;
          "
          onfocus="this.style.borderColor='#667eea'"
          onblur="this.style.borderColor='#e0e0e0'"
        >${keywordsToFilter.join('\n')}</textarea>
        <div style="font-size: 12px; color: #999; margin-top: 8px;">
          💡 提示：每行输入一个关键字，包含该关键字的帖子将被隐藏
        </div>
      </div>
      
      <div style="display: flex; gap: 12px;">
        <button id="saveKeywordsBtn" style="
          flex: 1;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 12px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(102, 126, 234, 0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(102, 126, 234, 0.3)'">
          💾 保存并应用
        </button>
        
        <button id="cancelKeywordsBtn" style="
          flex: 0.5;
          background: #f5f5f5;
          color: #666;
          border: none;
          border-radius: 8px;
          padding: 12px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        " onmouseover="this.style.background='#e0e0e0'" onmouseout="this.style.background='#f5f5f5'">
          取消
        </button>
      </div>
    `;
    
    modal.appendChild(settingsBox);
    
    // 添加动画样式
    const styleTag = document.getElementById('modalAnimationStyles') || document.createElement('style');
    styleTag.id = 'modalAnimationStyles';
    styleTag.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      @keyframes scaleIn {
        from {
          opacity: 0;
          transform: scale(0.9) translateY(20px);
        }
        to {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }
    `;
    if (!document.getElementById('modalAnimationStyles')) {
      document.head.appendChild(styleTag);
    }
    
    document.body.appendChild(modal);
    
    // 保存按钮事件
    document.getElementById('saveKeywordsBtn').addEventListener('click', function() {
      const textarea = document.getElementById('keywordsInput');
      const input = textarea.value.trim();
      
      if (!input) {
        alert('请至少输入一个关键字');
        return;
      }
      
      // 解析关键字（按行分割，去除空白）
      const newKeywords = input.split('\n')
        .map(k => k.trim())
        .filter(k => k.length > 0);
      
      if (newKeywords.length === 0) {
        alert('请至少输入一个有效的关键字');
        return;
      }
      
      // 保存关键字
      keywordsToFilter = newKeywords;
      saveKeywordsToStorage(newKeywords);
      
      // 关闭弹窗
      modal.style.opacity = '0';
      setTimeout(() => modal.remove(), 200);
      
      // 重新应用过滤
      resetAndRefilter();
      
      console.log('关键字已更新:', keywordsToFilter);
    });
    
    // 取消按钮事件
    document.getElementById('cancelKeywordsBtn').addEventListener('click', function() {
      modal.style.opacity = '0';
      setTimeout(() => modal.remove(), 200);
    });
    
    // 点击背景关闭
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        modal.style.opacity = '0';
        setTimeout(() => modal.remove(), 200);
      }
    });
  }
  
  // 重置并重新过滤
  function resetAndRefilter() {
    // 先显示所有帖子
    const allContainers = document.querySelectorAll('.container___WTz2y');
    allContainers.forEach(container => {
      container.style.display = '';
    });
    
    // 重置计数
    totalFilteredCount = 0;
    
    // 移除旧通知
    if (currentNotification && currentNotification.parentNode) {
      currentNotification.remove();
      currentNotification = null;
    }
    
    // 重新过滤
    isFirstFilter = true;
    filterPostsByKeywords();
  }
  
  // 过滤包含关键字的帖子
  function filterPostsByKeywords(silent = false) {
    if (!isFilterEnabled) return;
    
    console.log('开始过滤话题页面帖子...');
    
    // 获取所有帖子容器
    const postContainers = document.querySelectorAll('.container___WTz2y');
    console.log(`找到 ${postContainers.length} 个帖子`);
    
    let filteredCount = 0;
    
    // 遍历每个帖子
    postContainers.forEach(container => {
      // 查找帖子标题元素
      const titleElement = container.querySelector('.title___WELDF');
      
      if (titleElement) {
        const titleText = titleElement.textContent || titleElement.innerText;
        let shouldHide = false;
        
        // 检查标题是否包含任何过滤关键字
        for (const keyword of keywordsToFilter) {
          if (titleText.includes(keyword)) {
            shouldHide = true;
            console.log(`过滤帖子: "${titleText}" (包含关键字: "${keyword}")`);
            break;
          }
        }
        
        // 如果需要隐藏，则隐藏整个帖子容器
        if (shouldHide && container.style.display !== 'none') {
          container.style.display = 'none';
          filteredCount++;
        }
      }
    });
    
    // 更新总计数
    if (filteredCount > 0) {
      totalFilteredCount += filteredCount;
    }
    
    console.log(`本次过滤: ${filteredCount} 个，累计过滤: ${totalFilteredCount} 个帖子`);
    
    // 只在第一次过滤或非静默模式下显示/更新提示
    if (isFirstFilter && !silent) {
      showFilterResult(totalFilteredCount, keywordsToFilter);
      isFirstFilter = false;
    } else if (filteredCount > 0 && currentNotification) {
      updateNotificationCount(totalFilteredCount);
    }
  }
  
  // 更新通知中的过滤数量
  function updateNotificationCount(count) {
    if (!currentNotification) return;
    
    const countElement = currentNotification.querySelector('#filteredCountDisplay');
    if (countElement) {
      countElement.textContent = count;
      countElement.style.animation = 'pulse 0.3s ease';
      setTimeout(() => {
        countElement.style.animation = '';
      }, 300);
    }
  }
  
  // 显示过滤结果提示
  function showFilterResult(filteredCount, keywords) {
    // 如果已经存在通知，不要重新创建
    if (currentNotification && currentNotification.parentNode) {
      updateNotificationCount(filteredCount);
      return;
    }
    
    // 创建提示元素
    const resultDiv = document.createElement('div');
    resultDiv.id = 'filterResultNotification';
    currentNotification = resultDiv;
    
    resultDiv.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      border-radius: 12px;
      padding: 16px 20px;
      z-index: 9999;
      box-shadow: 0 10px 40px rgba(102, 126, 234, 0.3), 0 2px 8px rgba(0, 0, 0, 0.1);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 320px;
      color: white;
      backdrop-filter: blur(10px);
      transition: all 0.3s ease;
      animation: slideIn 0.3s ease-out;
    `;
    
    // 限制显示的关键字数量
    const displayKeywords = keywords.length > 5 
      ? keywords.slice(0, 5).join(', ') + ` 等${keywords.length}个`
      : keywords.join(', ');
    
    resultDiv.innerHTML = `
      <div style="font-weight: 600; font-size: 16px; margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 20px;">🎯</span>
          <span>帖子过滤完成</span>
        </div>
        <button id="editKeywordsBtn" style="
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 6px;
          padding: 4px 8px;
          font-size: 12px;
          cursor: pointer;
          color: white;
          transition: all 0.2s;
        " onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">⚙️ 编辑</button>
      </div>
      <div style="font-size: 14px; margin-bottom: 6px; opacity: 0.95;">
        已隐藏 <strong id="filteredCountDisplay" style="background: rgba(255,255,255,0.2); padding: 2px 6px; border-radius: 4px; display: inline-block; min-width: 20px; text-align: center;">${filteredCount}</strong> 个帖子
      </div>
      <div style="font-size: 12px; opacity: 0.85; margin-bottom: 12px; line-height: 1.5;">
        过滤关键字: ${displayKeywords}
      </div>
      <div style="margin-top: 12px;">
        <button id="resetFilterBtn" style="
          background: rgba(255, 255, 255, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 8px;
          padding: 8px 16px;
          font-size: 13px;
          cursor: pointer;
          color: white;
          font-weight: 500;
          transition: all 0.2s ease;
          width: 100%;
          backdrop-filter: blur(5px);
        " onmouseover="this.style.background='rgba(255,255,255,0.35)'; this.style.transform='translateY(-1px)'" onmouseout="this.style.background='rgba(255,255,255,0.25)'; this.style.transform='translateY(0)'">✨ 显示所有帖子</button>
      </div>
    `;
    
    // 添加动画CSS
    const styleTag = document.getElementById('filterAnimationStyles') || document.createElement('style');
    styleTag.id = 'filterAnimationStyles';
    styleTag.textContent = `
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateX(100px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      
      @keyframes pulse {
        0%, 100% {
          transform: scale(1);
        }
        50% {
          transform: scale(1.15);
        }
      }
      
      #filterResultNotification:hover {
        box-shadow: 0 15px 50px rgba(102, 126, 234, 0.4), 0 5px 15px rgba(0, 0, 0, 0.15);
        transform: translateY(-2px);
      }
    `;
    if (!document.getElementById('filterAnimationStyles')) {
      document.head.appendChild(styleTag);
    }
    
    document.body.appendChild(resultDiv);
    
    // 编辑按钮事件
    document.getElementById('editKeywordsBtn').addEventListener('click', function(e) {
      e.stopPropagation();
      showKeywordSettings();
    });
    
    // 重置按钮事件
    document.getElementById('resetFilterBtn').addEventListener('click', function() {
      isFilterEnabled = false;
      
      if (monitorInterval) {
        clearInterval(monitorInterval);
        monitorInterval = null;
      }
      
      if (mutationObserver) {
        mutationObserver.disconnect();
        mutationObserver = null;
      }
      
      const allContainers = document.querySelectorAll('.container___WTz2y');
      allContainers.forEach(container => {
        container.style.display = '';
      });
      
      resultDiv.style.opacity = '0';
      resultDiv.style.transform = 'translateX(100px)';
      setTimeout(() => {
        if (resultDiv.parentNode) {
          resultDiv.remove();
          currentNotification = null;
        }
      }, 300);
      
      console.log('已重置所有帖子显示，过滤功能已停用');
      
      showSuccessMessage();
    });
  }
  
  // 显示成功提示
  function showSuccessMessage() {
    const successDiv = document.createElement('div');
    successDiv.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
      border: none;
      border-radius: 12px;
      padding: 16px 20px;
      z-index: 9999;
      box-shadow: 0 10px 40px rgba(17, 153, 142, 0.3), 0 2px 8px rgba(0, 0, 0, 0.1);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: white;
      animation: slideIn 0.3s ease-out;
    `;
    
    successDiv.innerHTML = `
      <div style="font-weight: 600; font-size: 15px; display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 20px;">✅</span>
        <span>已显示所有帖子</span>
      </div>
    `;
    
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
      successDiv.style.opacity = '0';
      successDiv.style.transform = 'translateX(100px)';
      setTimeout(() => {
        if (successDiv.parentNode) {
          successDiv.remove();
        }
      }, 300);
    }, 3000);
  }
  
  // 监听页面滚动，动态过滤新加载的帖子
  let lastPostCount = 0;
  let filterDebounceTimer = null;
  
  function monitorNewPosts() {
    if (!isFilterEnabled) return;
    
    const currentPostCount = document.querySelectorAll('.container___WTz2y').length;
    
    if (currentPostCount > lastPostCount) {
      console.log(`检测到新帖子，当前总数: ${currentPostCount}，上次: ${lastPostCount}`);
      lastPostCount = currentPostCount;
      
      if (filterDebounceTimer) {
        clearTimeout(filterDebounceTimer);
      }
      
      filterDebounceTimer = setTimeout(() => {
        filterPostsByKeywords(true);
      }, 500);
    }
  }
  
  // 主执行函数
  function executeFilter() {
    filterPostsByKeywords();
    
    monitorInterval = setInterval(monitorNewPosts, 2000);
    
    let mutationDebounceTimer = null;
    
    mutationObserver = new MutationObserver(function(mutations) {
      if (!isFilterEnabled) return;
      
      const hasNewNodes = mutations.some(mutation => mutation.addedNodes.length > 0);
      
      if (hasNewNodes) {
        if (mutationDebounceTimer) {
          clearTimeout(mutationDebounceTimer);
        }
        
        mutationDebounceTimer = setTimeout(() => {
          filterPostsByKeywords(true);
        }, 500);
      }
    });
    
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  // 页面加载完成后执行
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', executeFilter);
  } else {
    executeFilter();
  }
  
  console.log('帖子过滤器脚本已加载，当前关键字:', keywordsToFilter);
})();