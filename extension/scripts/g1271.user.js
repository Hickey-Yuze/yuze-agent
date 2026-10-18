// 实时录制字幕模式
(function() {
  const capturedSubs = [];
  let isRecording = false;
  
  const btn = document.createElement('button');
  btn.innerHTML = '🔴 开始录制字幕';
  btn.style.cssText = 'position: fixed; top: 120px; right: 20px; z-index: 99999; padding: 12px 24px; background: #ff4444; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: bold;';
  
  btn.onclick = () => {
    if (!isRecording) {
      isRecording = true;
      btn.innerHTML = '⏹️ 停止录制';
      btn.style.background = '#00aa00';
      
      const interval = setInterval(() => {
        const subText = document.querySelector('.bili-subtitle-x-subtitle-panel-text');
        if (subText) {
          const text = subText.textContent.trim();
          const time = document.querySelector('video')?.currentTime || 0;
          if (text && !capturedSubs.some(s => s.text === text)) {
            capturedSubs.push({ time, text });
            console.log(`[${Math.floor(time)}s] ${text}`);
          }
        }
      }, 500);
      
      btn.dataset.interval = interval;
    } else {
      clearInterval(btn.dataset.interval);
      isRecording = false;
      btn.innerHTML = '📥 导出录制的字幕';
      btn.style.background = '#0088ff';
      
      btn.onclick = () => {
        const content = capturedSubs.map((s, i) => `[${i+1}] [${Math.floor(s.time)}s] ${s.text}`).join('\n');
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = '字幕_录制.txt';
        a.click();
        alert(`已导出 ${capturedSubs.length} 条字幕！`);
      };
    }
  };
  
  document.body.appendChild(btn);
})();