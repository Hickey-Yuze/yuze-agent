(function() {
  if (window.__bilibiliRollbackV7) return;
  window.__bilibiliRollbackV7 = true;
  
  const historyStack = [];
  const MAX_HISTORY = 15;
  
  // 样式注入
  const style = document.createElement('style');
  style.textContent = `
    /* 按钮容器 - 竖向排列 */
    .feed-roll-btn {
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      gap: 10px !important;
      padding: 0 !important;
    }
    
    /* 回退按钮 */
    .rollback-btn {
      position: relative !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 38px !important;
      min-height: 85px !important;
      height: auto !important;
      padding: 10px 4px 24px 4px !important;
      border-radius: 4px !important;
      background: #fff !important;
      color: #222 !important;
      font-size: 12px !important;
      font-weight: 500 !important;
      cursor: pointer !important;
      transition: all 0.15s ease !important;
      user-select: none !important;
      border: none !important;
      box-sizing: border-box !important;
      outline: none !important;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08) !important;
    }
    
    .rollback-btn:hover {
      background: #f4f4f4 !important;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12) !important;
    }
    
    .rollback-btn:active {
      background: #e8e8e8 !important;
    }
    
    .rollback-btn.disabled {
      opacity: 0.4 !important;
      cursor: not-allowed !important;
    }
    
    /* 文字容器 - 竖向排列 */
    .text-vertical {
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 1px !important;
    }
    
    /* 每个字符 */
    .text-vertical span {
      display: block !important;
      text-align: center !important;
      line-height: 1 !important;
      height: 14px !important;
      font-size: 12px !important;
      font-weight: 500 !important;
      color: #222 !important;
    }
    
    .rollback-btn.disabled .text-vertical span {
      color: #999 !important;
    }
    
    /* 数字徽章 */
    .badge {
      position: absolute !important;
      bottom: 8px !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
      min-width: 16px !important;
      height: 16px !important;
      padding: 0 4px !important;
      background: #fb7299 !important;
      color: #fff !important;
      border-radius: 8px !important;
      font-size: 10px !important;
      font-weight: 600 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
    }
    
    /* Toast提示 */
    .rollback-toast {
      position: fixed !important;
      top: 100px !important;
      left: 50% !important;
      transform: translateX(-50%) translateY(-10px) !important;
      padding: 12px 24px !important;
      background: rgba(251, 114, 153, 0.95) !important;
      color: #fff !important;
      border-radius: 8px !important;
      font-size: 14px !important;
      z-index: 99999 !important;
      opacity: 0 !important;
      transition: all 0.3s ease !important;
      pointer-events: none !important;
    }
    .rollback-toast.show {
      opacity: 1 !important;
      transform: translateX(-50%) translateY(0) !important;
    }
    
    /* 恢复动画 */
    .feed-card.rollback-restored,
    .floor-single-card.rollback-restored:not(.floor-skeleton) {
      animation: restoreFadeIn 0.35s ease-out !important;
    }
    @keyframes restoreFadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);
  
  // 显示提示
  function showToast(message, duration) {
    duration = duration || 2000;
    let toast = document.querySelector('.rollback-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'rollback-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(function() { toast.classList.remove('show'); }, duration);
  }
  
  // 保存当前状态
  function saveCurrentState() {
    const container = document.querySelector('.container.is-version8');
    if (!container) return null;
    
    const cards = [];
    container.querySelectorAll('.feed-card:not(.bili-feed-card), .floor-single-card:not(.floor-skeleton)').forEach(function(card) {
      if (!card.querySelector('.bili-video-card__skeleton') && 
          !card.querySelector('.bili-login-card')) {
        cards.push({
          html: card.outerHTML,
          type: card.classList.contains('floor-single-card') ? 'floor' : 'feed'
        });
      }
    });
    
    if (cards.length === 0) return null;
    
    return {
      cards: cards,
      scrollY: window.scrollY,
      timestamp: Date.now()
    };
  }
  
  // 恢复状态
  function restoreState(state) {
    if (!state || !state.cards.length) return false;
    
    const container = document.querySelector('.container.is-version8');
    if (!container) return false;
    
    // 清除骨架屏
    container.querySelectorAll('.bili-video-card__skeleton').forEach(function(s) {
      const parent = s.closest('.bili-video-card');
      if (parent) parent.remove();
    });
    
    // 清除现有卡片
    container.querySelectorAll('.feed-card:not(.bili-feed-card), .floor-single-card:not(.floor-skeleton)').forEach(function(card) {
      if (!card.querySelector('.bili-video-card__skeleton') && 
          !card.querySelector('.bili-login-card')) {
        card.remove();
      }
    });
    
    const loadMoreAnchor = container.querySelector('.load-more-anchor');
    const insertPoint = loadMoreAnchor || container.querySelector('.feed-roll-btn');
    
    if (insertPoint) {
      state.cards.forEach(function(cardData) {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = cardData.html;
        const restoredCard = wrapper.firstElementChild;
        restoredCard.classList.add('rollback-restored');
        insertPoint.parentElement.insertBefore(restoredCard, insertPoint);
      });
    }
    
    setTimeout(function() {
      window.scrollTo({ top: state.scrollY, behavior: 'smooth' });
    }, 100);
    
    return true;
  }
  
  // 更新按钮状态
  function updateButtonState(btn) {
    const badge = btn.querySelector('.badge');
    if (badge) {
      badge.textContent = historyStack.length;
    }
    btn.classList.toggle('disabled', historyStack.length === 0);
  }
  
  // 创建回退按钮 - 直接在innerHTML中写入字符
  function createRollbackButton() {
    const rollBtn = document.querySelector('.roll-btn');
    if (!rollBtn) return null;
    
    // 移除已存在的按钮
    const existingBtn = document.querySelector('.rollback-btn');
    if (existingBtn) existingBtn.remove();
    
    const btn = document.createElement('button');
    btn.className = 'rollback-btn disabled';
    
    // 【关键修复】直接在innerHTML中写入每个字符
    btn.innerHTML = 
      '<span class="text-vertical">' +
        '<span>撤</span>' +
        '<span>销</span>' +
        '<span>换</span>' +
        '<span>一</span>' +
        '<span>换</span>' +
      '</span>' +
      '<span class="badge">0</span>';
    
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      if (historyStack.length === 0) {
        showToast('没有可回退的记录');
        return;
      }
      
      const prevState = historyStack.pop();
      if (restoreState(prevState)) {
        showToast('已回退，还剩 ' + historyStack.length + ' 条记录');
        updateButtonState(btn);
      }
    });
    
    rollBtn.parentElement.appendChild(btn);
    return btn;
  }
  
  // 监听换一换按钮
  function watchRollButton(btn) {
    const rollBtn = document.querySelector('.roll-btn');
    if (!rollBtn) return;
    
    rollBtn.addEventListener('click', function(e) {
      const state = saveCurrentState();
      if (state) {
        historyStack.push(state);
        if (historyStack.length > MAX_HISTORY) {
          historyStack.shift();
        }
        updateButtonState(btn);
        console.log('[换一换回退] 已保存，共 ' + historyStack.length + ' 条记录');
      }
    }, true);
  }
  
  // 初始化
  function init() {
    console.log('[换一换回退 V7] 初始化...');
    
    const checkAndInit = setInterval(function() {
      const container = document.querySelector('.container.is-version8');
      const rollBtn = document.querySelector('.roll-btn');
      
      if (container && rollBtn && !document.querySelector('.rollback-btn')) {
        clearInterval(checkAndInit);
        
        const initial = saveCurrentState();
        if (initial) historyStack.push(initial);
        
        const btn = createRollbackButton();
        if (btn) {
          watchRollButton(btn);
          updateButtonState(btn);
          console.log('[换一换回退 V7] 初始化完成');
        }
      }
    }, 500);
    
    setTimeout(function() { clearInterval(checkAndInit); }, 15000);
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();