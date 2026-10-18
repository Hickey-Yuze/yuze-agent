(function() {
  if (window.__winTimeWatermarkV3) return;
  window.__winTimeWatermarkV3 = true;

  function createWatermark() {
    const old = document.getElementById('windows-time-watermark');
    if (old) old.remove();

    const container = document.createElement('div');
    container.id = 'windows-time-watermark';
    container.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 99999;
      font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif;
      font-size: 13px;
      color: #ffffff;
      background: linear-gradient(135deg, rgba(24,24,32,0.66), rgba(36,36,48,0.66));
      padding: 10px 14px;
      border-radius: 6px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.08);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      user-select: none;
      pointer-events: none;
      line-height: 1.6;
      letter-spacing: 0.3px;
    `;

    const urlRow = document.createElement('div');
    urlRow.id = 'url-info-row';
    urlRow.style.cssText = `
      font-size: 11.5px;
      color: rgba(255,255,255,0.65);
      margin-bottom: 4px;
      padding-bottom: 5px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 320px;
    `;

    const host = location.hostname.replace('www.', '');
    const title = document.title || location.pathname;
    urlRow.textContent = '🌐 ' + host + ' | ' + title;
    urlRow.title = '完整标题：' + document.title + '\n完整URL：' + location.href;

    const timeRow = document.createElement('div');
    timeRow.id = 'time-info-row';
    timeRow.style.cssText = `
      font-size: 14px;
      color: #ffffff;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 8px;
    `;

    const clockSpan = document.createElement('span');
    clockSpan.style.cssText = 'font-variant-numeric: tabular-nums; min-width: 42px;';
    const sepSpan = document.createElement('span');
    sepSpan.style.cssText = 'color: rgba(255,255,255,0.35);';
    sepSpan.textContent = '|';
    const dateSpan = document.createElement('span');
    const weekdaySpan = document.createElement('span');
    weekdaySpan.style.cssText = 'color: rgba(255,255,255,0.6); font-size: 12px;';

    timeRow.appendChild(clockSpan);
    timeRow.appendChild(sepSpan);
    timeRow.appendChild(dateSpan);
    timeRow.appendChild(weekdaySpan);

    container.appendChild(urlRow);
    container.appendChild(timeRow);
    document.body.appendChild(container);

    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

    function updateTime() {
      const now = new Date();
      const h = now.getHours().toString().padStart(2, '0');
      const m = now.getMinutes().toString().padStart(2, '0');
      const y = now.getFullYear();
      const mon = (now.getMonth() + 1).toString().padStart(2, '0');
      const d = now.getDate().toString().padStart(2, '0');
      clockSpan.textContent = h + ':' + m;
      dateSpan.textContent = y + '/' + mon + '/' + d;
      weekdaySpan.textContent = weekdays[now.getDay()];
    }

    updateTime();

    const now = new Date();
    const msToNextMin = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
    setTimeout(() => {
      updateTime();
      setInterval(updateTime, 60000);
    }, msToNextMin);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createWatermark);
  } else {
    createWatermark();
  }
})();