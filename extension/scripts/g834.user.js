(function() {
  'use strict';
  
  console.log('🚀 Notion 批量待办操作脚本已启动');
  
  // 创建操作面板
  function createControlPanel() {
    // 防止重复创建
    if (document.getElementById('notion-todo-batch-panel')) {
      return;
    }
    
    const panel = document.createElement('div');
    panel.id = 'notion-todo-batch-panel';
    panel.innerHTML = `
      <div style="
        position: fixed;
        bottom: 80px;
        right: 20px;
        z-index: 999999;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 16px;
        padding: 16px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.2);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        backdrop-filter: blur(10px);
      ">
        <div style="color: white; font-weight: 600; margin-bottom: 12px; font-size: 14px;">
          ⚡ 批量操作
        </div>
        <button id="check-all-btn" style="
          width: 100%;
          padding: 10px 16px;
          margin-bottom: 8px;
          background: white;
          color: #667eea;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 13px;
        ">✅ 全部勾选</button>
        <button id="uncheck-all-btn" style="
          width: 100%;
          padding: 10px 16px;
          margin-bottom: 8px;
          background: rgba(255,255,255,0.2);
          color: white;
          border: 1px solid white;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 13px;
        ">⬜ 全部取消</button>
        <div id="result-msg" style="
          color: rgba(255,255,255,0.9);
          font-size: 12px;
          text-align: center;
          margin-top: 8px;
          min-height: 18px;
        "></div>
      </div>
    `;
    
    document.body.appendChild(panel);
    
    // 添加悬停效果
    const checkBtn = document.getElementById('check-all-btn');
    const uncheckBtn = document.getElementById('uncheck-all-btn');
    
    checkBtn.addEventListener('mouseenter', () => {
      checkBtn.style.transform = 'scale(1.05)';
      checkBtn.style.boxShadow = '0 4px 12px rgba(102,126,234,0.3)';
    });
    checkBtn.addEventListener('mouseleave', () => {
      checkBtn.style.transform = 'scale(1)';
      checkBtn.style.boxShadow = 'none';
    });
    
    uncheckBtn.addEventListener('mouseenter', () => {
      uncheckBtn.style.transform = 'scale(1.05)';
      uncheckBtn.style.background = 'rgba(255,255,255,0.3)';
    });
    uncheckBtn.addEventListener('mouseleave', () => {
      uncheckBtn.style.transform = 'scale(1)';
      uncheckBtn.style.background = 'rgba(255,255,255,0.2)';
    });
    
    // 绑定点击事件
    checkBtn.addEventListener('click', () => batchToggleTodos(true));
    uncheckBtn.addEventListener('click', () => batchToggleTodos(false));
  }
  
  // 批量勾选/取消勾选
  function batchToggleTodos(shouldCheck) {
    const checkboxes = document.querySelectorAll('.notion-to_do-block input[type="checkbox"]');
    
    if (checkboxes.length === 0) {
      showMessage('❌ 未找到待办事项', 'error');
      return;
    }
    
    let count = 0;
    checkboxes.forEach(checkbox => {
      // 只操作需要改变状态的
      if (shouldCheck && !checkbox.checked) {
        checkbox.click();
        count++;
      } else if (!shouldCheck && checkbox.checked) {
        checkbox.click();
        count++;
      }
    });
    
    const action = shouldCheck ? '勾选' : '取消';
    if (count > 0) {
      showMessage(`✅ 已${action} ${count} 项`, 'success');
    } else {
      showMessage(`ℹ️ 无需${action}`, 'info');
    }
  }
  
  // 显示消息
  function showMessage(text, type = 'success') {
    const msgEl = document.getElementById('result-msg');
    if (!msgEl) return;
    
    msgEl.textContent = text;
    msgEl.style.opacity = '1';
    
    // 3秒后淡出
    setTimeout(() => {
      msgEl.style.opacity = '0.5';
    }, 3000);
  }
  
  // 初始化
  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', createControlPanel);
    } else {
      createControlPanel();
    }
    
    // 监听 SPA 路由变化（Notion 是单页应用）
    let lastUrl = location.href;
    new MutationObserver(() => {
      const url = location.href;
      if (url !== lastUrl) {
        lastUrl = url;
        setTimeout(createControlPanel, 1000); // 延迟确保 DOM 加载完成
      }
    }).observe(document.body, { childList: true, subtree: true });
  }
  
  init();
  console.log('✅ 批量操作面板已就绪');
})();