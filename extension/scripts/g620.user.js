(function() {
  // 防止重复执行
  if (window.windowsTimeWatermarkAdded) return;
  window.windowsTimeWatermarkAdded = true;

  function createTimeWatermark() {
    console.log('正在添加Windows时间水印...');
    
    // 移除可能已存在的水印
    const existingWatermark = document.getElementById('windows-time-watermark');
    if (existingWatermark) existingWatermark.remove();
    
    // 创建水印容器
    const watermark = document.createElement('div');
    watermark.id = 'windows-time-watermark';
    watermark.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 99999;
      font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif;
      font-size: 14px;
      color: #ffffff;
      background-color: rgba(30, 30, 30, 0.7);
      padding: 8px 12px;
      border-radius: 4px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(5px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      user-select: none;
      pointer-events: none;
      transition: opacity 0.3s;
    `;
    
    // 更新时间显示的函数
    function updateTime() {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const year = now.getFullYear();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const day = now.getDate().toString().padStart(2, '0');
      
      // 星期几
      const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      const weekday = weekdays[now.getDay()];
      
      // Windows风格格式：时间 | 日期 星期
      watermark.textContent = `${hours}:${minutes} | ${year}/${month}/${day} ${weekday}`;
    }
    
    // 初始更新
    updateTime();
    
    // 每分钟更新一次
    const updateInterval = setInterval(updateTime, 60000);
    
    // 监听页面卸载时清理定时器
    window.addEventListener('beforeunload', () => {
      clearInterval(updateInterval);
    });
    
    // 添加到页面
    document.body.appendChild(watermark);
    
    // 添加鼠标悬停效果（可选）
    watermark.style.pointerEvents = 'auto';
    watermark.addEventListener('mouseenter', () => {
      watermark.style.opacity = '0.7';
    });
    watermark.addEventListener('mouseleave', () => {
      watermark.style.opacity = '1';
    });
    
    // 点击可临时隐藏
    watermark.addEventListener('click', () => {
      watermark.style.opacity = '0.3';
      setTimeout(() => {
        watermark.style.opacity = '1';
      }, 2000);
    });
    
    console.log('Windows时间水印添加完成');
  }

  // 等待DOM加载完成后执行
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createTimeWatermark);
  } else {
    createTimeWatermark();
  }
})();