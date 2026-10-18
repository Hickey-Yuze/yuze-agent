(function() {
  'use strict';
  
  // 防止重复执行
  if (window.__BILI_SUBTITLE_EXTRACTOR__) return;
  window.__BILI_SUBTITLE_EXTRACTOR__ = true;

  const STYLE = `
    #bili-subtitle-panel {
      position: fixed;
      top: 80px;
      right: 20px;
      width: 380px;
      max-height: 80vh;
      background: rgba(30,30,35,0.95);
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      color: #fff;
      overflow: hidden;
      backdrop-filter: blur(10px);
    }
    #bili-subtitle-panel .header {
      padding: 16px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    #bili-subtitle-panel .header h3 {
      margin: 0;
      font-size: 15px;
      font-weight: 600;
    }
    #bili-subtitle-panel .header .close {
      cursor: pointer;
      opacity: 0.6;
      transition: opacity 0.2s;
    }
    #bili-subtitle-panel .header .close:hover { opacity: 1; }
    #bili-subtitle-panel .content {
      padding: 16px;
      max-height: 60vh;
      overflow-y: auto;
    }
    #bili-subtitle-panel .btn {
      background: #00aeec;
      color: #fff;
      border: none;
      padding: 10px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s;
      margin-right: 8px;
      margin-bottom: 8px;
    }
    #bili-subtitle-panel .btn:hover { background: #00b5f0; }
    #bili-subtitle-panel .btn:disabled {
      background: #444;
      cursor: not-allowed;
    }
    #bili-subtitle-panel .btn.secondary {
      background: rgba(255,255,255,0.1);
    }
    #bili-subtitle-panel .btn.secondary:hover { background: rgba(255,255,255,0.15); }
    #bili-subtitle-panel .status {
      font-size: 12px;
      color: #aaa;
      margin-top: 12px;
      line-height: 1.6;
    }
    #bili-subtitle-panel .status.success { color: #67c23a; }
    #bili-subtitle-panel .status.error { color: #f56c6c; }
    #bili-subtitle-panel .subtitle-info {
      background: rgba(255,255,255,0.05);
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 12px;
      font-size: 12px;
    }
    #bili-subtitle-panel .subtitle-info div {
      margin: 4px 0;
      color: #ccc;
    }
    #bili-subtitle-panel .subtitle-info span {
      color: #00aeec;
      font-weight: 500;
    }
    #bili-subtitle-panel textarea {
      width: 100%;
      min-height: 150px;
      background: rgba(0,0,0,0.3);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 6px;
      color: #fff;
      padding: 10px;
      font-size: 13px;
      line-height: 1.6;
      resize: vertical;
      box-sizing: border-box;
      margin-top: 12px;
    }
    #bili-subtitle-panel .checkbox-group {
      margin: 12px 0;
      font-size: 12px;
    }
    #bili-subtitle-panel .checkbox-group label {
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      color: #ccc;
    }
  `;

  function createPanel() {
    const existing = document.getElementById('bili-subtitle-panel');
    if (existing) existing.remove();

    const panel = document.createElement('div');
    panel.id = 'bili-subtitle-panel';
    panel.innerHTML = `
      <div class="header">
        <h3>📝 B站字幕提取器</h3>
        <span class="close">✕</span>
      </div>
      <div class="content">
        <div class="subtitle-info" id="subtitle-info" style="display:none"></div>
        <div>
          <button class="btn" id="extract-btn">🔍 获取字幕</button>
          <button class="btn secondary" id="copy-btn" disabled>📋 复制文字稿</button>
          <button class="btn secondary" id="download-btn" disabled>💾 下载TXT</button>
        </div>
        <div class="checkbox-group">
          <label><input type="checkbox" id="include-timestamp" checked> 保留时间戳</label>
        </div>
        <div class="status" id="status">点击「获取字幕」开始...</div>
        <textarea id="result-text" placeholder="字幕文字稿将显示在这里..." readonly></textarea>
      </div>
    `;
    document.body.appendChild(panel);

    // 样式
    if (!document.getElementById('bili-subtitle-style')) {
      const style = document.createElement('style');
      style.id = 'bili-subtitle-style';
      style.textContent = STYLE;
      document.head.appendChild(style);
    }

    // 事件绑定
    panel.querySelector('.close').onclick = () => panel.remove();
    document.getElementById('extract-btn').onclick = extractSubtitles;
    document.getElementById('copy-btn').onclick = copyToClipboard;
    document.getElementById('download-btn').onclick = downloadTranscript;
  }

  function getVideoInfo() {
    // 从页面状态获取视频信息
    let cid = null, bvid = null;
    
    try {
      const state = window.__INITIAL_STATE__;
      if (state?.videoData) {
        bvid = state.videoData.bvid;
        cid = state.videoData.cid || state.videoData.pages?.[0]?.cid;
      }
    } catch(e) {}

    // 从URL获取
    if (!bvid) {
      const match = location.pathname.match(/\/video\/(BV\w+)/);
      if (match) bvid = match[1];
    }

    // 从iframe或播放器获取cid
    if (!cid) {
      const player = document.querySelector('iframe[src*="cid="]');
      if (player) {
        const match = player.src.match(/cid=(\d+)/);
        if (match) cid = match[1];
      }
    }

    return { bvid, cid };
  }

  async function fetchSubtitles(cid, bvid) {
    // 尝试多种方式获取字幕
    
    // 方式1: 通过player API
    try {
      const url = `https://api.bilibili.com/x/player/wbi/v2?cid=${cid}&bvid=${bvid}`;
      const res = await fetch(url, { credentials: 'include' });
      const data = await res.json();
      
      if (data?.data?.subtitle?.subtitles?.length > 0) {
        return data.data.subtitle.subtitles;
      }
    } catch(e) {}

    // 方式2: 尝试旧的subtitle API
    try {
      const url = `https://api.bilibili.com/x/player/v2?cid=${cid}&bvid=${bvid}`;
      const res = await fetch(url, { credentials: 'include' });
      const data = await res.json();
      
      if (data?.data?.subtitle?.subtitles?.length > 0) {
        return data.data.subtitle.subtitles;
      }
    } catch(e) {}

    return [];
  }

  async function fetchSubtitleContent(subtitleUrl) {
    try {
      // 补全URL
      const url = subtitleUrl.startsWith('http') ? subtitleUrl : `https:${subtitleUrl}`;
      const res = await fetch(url);
      const data = await res.json();
      return data.body || [];
    } catch(e) {
      return [];
    }
  }

  function formatTranscript(subtitles, includeTimestamp) {
    if (!subtitles || subtitles.length === 0) return '';
    
    return subtitles.map((item, index) => {
      const text = item.content || item.text || '';
      if (!includeTimestamp) return text;
      
      const from = formatTime(item.from);
      const to = formatTime(item.to);
      return `[${from}-${to}] ${text}`;
    }).join('\n');
  }

  function formatTime(seconds) {
    if (!seconds && seconds !== 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}.${ms.toString().padStart(2,'0')}`;
  }

  async function extractSubtitles() {
    const statusEl = document.getElementById('status');
    const infoEl = document.getElementById('subtitle-info');
    const resultEl = document.getElementById('result-text');
    const extractBtn = document.getElementById('extract-btn');
    
    statusEl.className = 'status';
    statusEl.textContent = '正在获取视频信息...';
    extractBtn.disabled = true;

    const { bvid, cid } = getVideoInfo();
    
    if (!cid || !bvid) {
      statusEl.className = 'status error';
      statusEl.textContent = '❌ 无法获取视频信息，请确保在B站视频页面';
      extractBtn.disabled = false;
      return;
    }

    statusEl.textContent = `正在获取字幕列表... (CID: ${cid})`;

    const subtitles = await fetchSubtitles(cid, bvid);
    
    if (subtitles.length === 0) {
      statusEl.className = 'status error';
      statusEl.textContent = '❌ 该视频没有可用的字幕（可能是UP主未上传或AI字幕未生成）';
      extractBtn.disabled = false;
      return;
    }

    // 显示字幕信息
    infoEl.style.display = 'block';
    infoEl.innerHTML = subtitles.map((sub, i) => `
      <div>字幕${i+1}: <span>${sub.lan_doc || sub.language || '未知语言'}</span> 
      ${sub.is_ai ? '(AI生成)' : ''}
      ${sub.subtitle_url?.includes('ai') ? '(AI)' : ''}</div>
    `).join('');

    // 优先选择AI字幕或中文/英文
    const preferred = subtitles.find(s => 
      s.subtitle_url?.includes('ai') || 
      s.lan?.includes('zh') || 
      s.lan?.includes('en')
    ) || subtitles[0];

    statusEl.textContent = `正在下载字幕内容: ${preferred.lan_doc}...`;

    const content = await fetchSubtitleContent(preferred.subtitle_url);
    
    if (content.length === 0) {
      statusEl.className = 'status error';
      statusEl.textContent = '❌ 字幕内容获取失败';
      extractBtn.disabled = false;
      return;
    }

    const includeTimestamp = document.getElementById('include-timestamp').checked;
    const transcript = formatTranscript(content, includeTimestamp);
    
    // 保存到全局供下载使用
    window.__bili_transcript = transcript;
    window.__bili_transcript_data = content;

    resultEl.value = transcript;
    
    statusEl.className = 'status success';
    statusEl.innerHTML = `✅ 成功提取 <strong>${content.length}</strong> 条字幕<br>总计约 <strong>${Math.floor(content.reduce((a,b) => a + (b.to-b.from), 0)/60)}</strong> 分钟内容`;
    
    document.getElementById('copy-btn').disabled = false;
    document.getElementById('download-btn').disabled = false;
    extractBtn.disabled = false;
  }

  function copyToClipboard() {
    const text = document.getElementById('result-text').value;
    if (!text) return;
    
    navigator.clipboard.writeText(text).then(() => {
      const btn = document.getElementById('copy-btn');
      const original = btn.textContent;
      btn.textContent = '✓ 已复制';
      setTimeout(() => btn.textContent = original, 2000);
    });
  }

  function downloadTranscript() {
    const text = document.getElementById('result-text').value;
    if (!text) return;

    const videoTitle = document.querySelector('h1.video-title, h1.title')?.textContent?.trim() || 'bilibili_subtitle';
    const filename = `${videoTitle.replace(/[<>:"/\\|?*]/g, '_')}_transcript.txt`;
    
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    const btn = document.getElementById('download-btn');
    const original = btn.textContent;
    btn.textContent = '✓ 已下载';
    setTimeout(() => btn.textContent = original, 2000);
  }

  // 初始化
  createPanel();
})();