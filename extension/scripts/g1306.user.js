(function() {
  // --- 新增部分：创建悬浮按钮 ---
  const btn = document.createElement('button');
  btn.innerHTML = '🌙'; // 按钮图标
  // 设置按钮样式：固定在右上方
  Object.assign(btn.style, {
      position: 'fixed',
      top: '100px',       // 距离顶部高度
      right: '20px',      // 距离右侧距离
      zIndex: '99999',    // 保证在最上层
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      backgroundColor: '#333',
      color: '#fff',
      border: '2px solid #fff',
      cursor: 'pointer',
      fontSize: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
  });
  document.body.appendChild(btn);

  // --- 绑定点击事件：触发您原有的逻辑 ---
  btn.onclick = function() {
      // ↓↓↓ 下面是您原来的代码逻辑，完全没动 ↓↓↓
      console.log('执行一键夜间模式切换...');

      const darkModeBtn = document.querySelector('#universal-dark-mode-btn');

      if (darkModeBtn) {
        darkModeBtn.click();
        console.log('已触发暗黑模式切换按钮');
      } else {
        console.warn('未找到暗黑模式按钮，尝试注入自定义样式...');
        toggleCustomDarkMode();
      }
  };

  // ↓↓↓ 辅助函数也保留在作用域内供调用 ↓↓↓
  // 备用方案：自定义夜间模式
  function toggleCustomDarkMode() {
    const styleId = 'custom-dark-mode-style';
    let existingStyle = document.getElementById(styleId);
    
    if (existingStyle) {
      existingStyle.remove();
      console.log('已关闭自定义夜间模式');
    } else {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        body, #app {
          filter: invert(0.9) hue-rotate(180deg) !important;
          background-color: #1a1a1a !important;
        }
        img, video, [style*="background-image"] {
          filter: invert(1) hue-rotate(-180deg) !important;
        }
      `;
      document.head.appendChild(style);
      console.log('已启用自定义夜间模式');
    }
  }

})();