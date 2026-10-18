(function() {
  if (document.getElementById('bili-dl-panel')) return;

  const PANEL_ID = 'bili-dl-panel';
  const STYLE_ID = 'bili-dl-style';

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${PANEL_ID} {
        position: fixed; top: 80px; right: 20px; z-index: 100000;
        width: 360px; background: #fff; border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,.18); font-family: -apple-system, "PingFang SC", "Helvetica Neue", sans-serif;
        overflow: hidden; transition: all .3s ease;
      }
      #${PANEL_ID}.collapsed { width: 56px; height: 56px !important; border-radius: 50%; cursor: pointer; }
      #${PANEL_ID}.collapsed .dl-panel-body,
      #${PANEL_ID}.collapsed .dl-panel-header span,
      #${PANEL_ID}.collapsed .dl-panel-header .dl-close { display: none; }
      .dl-panel-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 14px 16px; background: linear-gradient(135deg, #fb7299, #fc9db9);
        color: #fff; font-size: 15px; font-weight: 600;
      }
      .dl-panel-header .dl-toggle { cursor: pointer; font-size: 18px; margin-right: 8px; }
      .dl-panel-header .dl-close { cursor: pointer; font-size: 18px; opacity: .8; }
      .dl-panel-header .dl-close:hover { opacity: 1; }
      .dl-panel-body { padding: 16px; max-height: 460px; overflow-y: auto; }
      .dl-panel-body::-webkit-scrollbar { width: 4px; }
      .dl-panel-body::-webkit-scrollbar-thumb { background: #ddd; border-radius: 2px; }
      .dl-video-title {
        font-size: 13px; color: #333; margin-bottom: 12px;
        line-height: 1.5; word-break: break-all;
        display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
      }
      .dl-section-label { font-size: 12px; color: #999; margin-bottom: 8px; font-weight: 500; }
      .dl-stream-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
      .dl-stream-item {
        display: flex; align-items: center; justify-content: space-between;
        padding: 10px 12px; background: #f6f7f8; border-radius: 8px;
        transition: all .2s ease; cursor: default;
      }
      .dl-stream-item:hover { background: #eef0f2; }
      .dl-stream-info { flex: 1; min-width: 0; }
      .dl-stream-quality { font-size: 13px; color: #333; font-weight: 600; }
      .dl-stream-meta { font-size: 11px; color: #999; margin-top: 2px; }
      .dl-stream-badge {
        font-size: 10px; padding: 2px 6px; border-radius: 4px;
        background: #fb7299; color: #fff; margin-left: 6px; font-weight: 500;
      }
      .dl-btn {
        padding: 6px 14px; border: none; border-radius: 6px; font-size: 12px;
        cursor: pointer; font-weight: 500; transition: all .2s ease;
        flex-shrink: 0; margin-left: 10px;
      }
      .dl-btn-primary { background: #fb7299; color: #fff; }
      .dl-btn-primary:hover { background: #e85e86; }
      .dl-btn-secondary { background: #e3f2fd; color: #1976d2; }
      .dl-btn-secondary:hover { background: #bbdefb; }
      .dl-btn:disabled { opacity: .5; cursor: not-allowed; }
      .dl-status {
        font-size: 11px; color: #666; margin-top: 8px; text-align: center;
        padding: 8px; background: #f9f9f9; border-radius: 6px;
      }
      .dl-status.error { color: #e53935; background: #fce4ec; }
      .dl-status.success { color: #2e7d32; background: #e8f5e9; }
      .dl-actions { display: flex; gap: 8px; margin-top: 12px; }
      .dl-actions .dl-btn { flex: 1; text-align: center; }
      .dl-tip { font-size: 11px; color: #bbb; text-align: center; margin-top: 12px; line-height: 1.5; }
    `;
    document.head.appendChild(style);
  }

  function getVideoTitle() {
    const titleEl = document.querySelector('.video-title');
    return titleEl ? titleEl.textContent.trim() : 'bilibili_video';
  }

  function getPlayInfo() {
    try {
      const raw = document.querySelector('#__NEXT_DATA__')?.textContent;
      if (raw) {
        const data = JSON.parse(raw);
        const videoInfo = data?.props?.pageProps?.videoInfo;
        if (videoInfo) return videoInfo;
      }
    } catch(e) {}

    try {
      if (window.__playinfo__) return window.__playinfo__;
    } catch(e) {}

    try {
      const scripts = document.querySelectorAll('script');
      for (const script of scripts) {
        const text = script.textContent || '';
        const match = text.match(/window\.__playinfo__\s*=\s*(\{.*?\})\s*;?\s*(?:window\.__INITIAL_STATE__|$)/s);
        if (match) {
          return JSON.parse(match[1]);
        }
      }
    } catch(e) {}

    return null;
  }

  function extractStreams(playInfo) {
    const streams = [];
    if (!playInfo?.data) return streams;

    const { video: videoStreams, audio: audioStreams } = playInfo.data.dash || {};

    const qualityMap = {
      127: '8K 超高清', 126: '杜比视界', 125: 'HDR 真彩',
      120: '4K 超清', 116: '1080P 高帧率', 112: '1080P 高码率',
      80: '1080P 高清', 74: '720P 高帧率', 64: '720P 准高清',
      48: '720P 高清', 32: '480P 标清', 16: '360P 流畅'
    };

    const codecMap = {
      7: 'AV1', 12: 'HEVC', 13: 'AVC'
    };

    if (videoStreams && videoStreams.length) {
      const seen = new Set();
      videoStreams.forEach(v => {
        const key = `${v.id}-${v.codecid}`;
        if (seen.has(key)) return;
        seen.add(key);
        const quality = qualityMap[v.id] || `未知(${v.id})`;
        const codec = codecMap[v.codecid] || `Codec${v.codecid}`;
        const bandwidth = v.bandwidth ? `${(v.bandwidth / 1024 / 1024).toFixed(1)} Mbps` : '';
        streams.push({
          type: 'video',
          quality,
          codec,
          bandwidth,
          url: v.baseUrl || v.base_url,
          backupUrls: v.backupUrl || v.backup_url || [],
          id: v.id,
          codecid: v.codecid
        });
      });
    }

    if (audioStreams && audioStreams.length) {
      const seen = new Set();
      audioStreams.forEach(a => {
        const key = `${a.id}-${a.codecid}`;
        if (seen.has(key)) return;
        seen.add(key);
        const quality = a.id === 30250 ? 'Hi-Res无损' : a.id === 30251 ? '杜比全景声' : a.id === 30280 ? '320Kbps' : '128Kbps';
        const codec = codecMap[a.codecid] || `Codec${a.codecid}`;
        streams.push({
          type: 'audio',
          quality,
          codec,
          bandwidth: a.bandwidth ? `${(a.bandwidth / 1024 / 1024).toFixed(1)} Mbps` : '',
          url: a.baseUrl || a.base_url,
          backupUrls: a.backupUrl || a.backup_url || [],
          id: a.id,
          codecid: a.codecid
        });
      });
    }

    return streams;
  }

  function tryDirectDownload(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.target = '_blank';
    a.referrerPolicy = 'no-referrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function fetchAndDownload(url, filename, statusEl, btnEl) {
    statusEl.textContent = '正在获取视频流...';
    statusEl.className = 'dl-status';
    btnEl.disabled = true;

    const headers = {
      'Referer': window.location.origin
    };

    fetch(url, { mode: 'cors', headers })
      .then(resp => {
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return resp.blob();
      })
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
        statusEl.textContent = '✅ 下载已开始！';
        statusEl.className = 'dl-status success';
      })
      .catch(err => {
        console.warn('Fetch下载失败，尝试直接链接:', err);
        tryDirectDownload(url, filename);
        statusEl.textContent = '⚠️ 已尝试直接下载，如失败请使用IDM等工具';
        statusEl.className = 'dl-status';
      })
      .finally(() => {
        btnEl.disabled = false;
      });
  }

  function copyToClipboard(text, statusEl) {
    navigator.clipboard.writeText(text).then(() => {
      statusEl.textContent = '✅ 链接已复制到剪贴板！';
      statusEl.className = 'dl-status success';
    }).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;left:-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      statusEl.textContent = '✅ 链接已复制！';
      statusEl.className = 'dl-status success';
    });
  }

  function sanitizeFilename(name) {
    return name.replace(/[\\/:*?"<>|]/g, '_').substring(0, 100);
  }

  function createPanel() {
    const panel = document.createElement('div');
    panel.id = PANEL_ID;

    const title = getVideoTitle();
    const playInfo = getPlayInfo();
    const streams = playInfo ? extractStreams(playInfo) : [];

    const videoStreams = streams.filter(s => s.type === 'video');
    const audioStreams = streams.filter(s => s.type === 'audio');

    panel.innerHTML = `
      <div class="dl-panel-header">
        <span>📺 B站视频下载</span>
        <div>
          <span class="dl-toggle" title="最小化">ー</span>
          <span class="dl-close" title="关闭">✕</span>
        </div>
      </div>
      <div class="dl-panel-body">
        <div class="dl-video-title">${title}</div>
        ${streams.length === 0 ? `
          <div class="dl-status error">
            ❌ 未获取到视频流信息<br>
            <span style="font-size:10px">请确保已登录且视频已加载完成，然后刷新页面重试</span>
          </div>
        ` : `
          ${videoStreams.length > 0 ? `
            <div class="dl-section-label">🎬 视频流 (${videoStreams.length})</div>
            <div class="dl-stream-list">
              ${videoStreams.slice(0, 6).map((s, i) => `
                <div class="dl-stream-item">
                  <div class="dl-stream-info">
                    <span class="dl-stream-quality">${s.quality}</span>
                    <span class="dl-stream-badge">${s.codec}</span>
                    <div class="dl-stream-meta">${s.bandwidth}</div>
                  </div>
                  <button class="dl-btn dl-btn-primary dl-dl-btn" data-idx="${i}" data-type="video">下载</button>
                  <button class="dl-btn dl-btn-secondary dl-copy-btn" data-idx="${i}" data-type="video">复制</button>
                </div>
              `).join('')}
            </div>
          ` : ''}
          ${audioStreams.length > 0 ? `
            <div class="dl-section-label">🔊 音频流 (${audioStreams.length})</div>
            <div class="dl-stream-list">
              ${audioStreams.slice(0, 4).map((s, i) => `
                <div class="dl-stream-item">
                  <div class="dl-stream-info">
                    <span class="dl-stream-quality">${s.quality}</span>
                    <span class="dl-stream-badge">${s.codec}</span>
                    <div class="dl-stream-meta">${s.bandwidth}</div>
                  </div>
                  <button class="dl-btn dl-btn-primary dl-dl-btn" data-idx="${i}" data-type="audio">下载</button>
                  <button class="dl-btn dl-btn-secondary dl-copy-btn" data-idx="${i}" data-type="audio">复制</button>
                </div>
              `).join('')}
            </div>
          ` : ''}
          <div class="dl-status" id="dl-status-msg">选择清晰度后点击下载</div>
          <div class="dl-actions">
            <button class="dl-btn dl-btn-secondary" id="dl-copy-all">📋 复制全部链接</button>
            <button class="dl-btn dl-btn-secondary" id="dl-retry">🔄 重新检测</button>
          </div>
          <div class="dl-tip">💡 提示：B站音视频分离，需分别下载后用ffmpeg合并<br>复制链接后也可使用IDM/迅雷等工具下载</div>
        `}
      </div>
    `;

    document.body.appendChild(panel);

    const statusEl = panel.querySelector('#dl-status-msg');

    panel.querySelector('.dl-close').addEventListener('click', () => {
      panel.remove();
      const style = document.getElementById(STYLE_ID);
      if (style) style.remove();
    });

    panel.querySelector('.dl-toggle').addEventListener('click', () => {
      panel.classList.toggle('collapsed');
    });

    panel.addEventListener('click', (e) => {
      if (panel.classList.contains('collapsed') && e.target.closest('.dl-toggle')) return;
      if (panel.classList.contains('collapsed')) {
        panel.classList.remove('collapsed');
      }
    });

    panel.querySelectorAll('.dl-dl-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        const type = btn.dataset.type;
        const list = type === 'video' ? videoStreams : audioStreams;
        const stream = list[idx];
        if (!stream) return;

        const safeTitle = sanitizeFilename(title);
        const ext = type === 'video' ? 'mp4' : 'm4a';
        const filename = `${safeTitle}_${stream.quality}_${stream.codec}.${ext}`;

        if (stream.url) {
          fetchAndDownload(stream.url, filename, statusEl, btn);
        } else {
          statusEl.textContent = '❌ 该流无可用URL';
          statusEl.className = 'dl-status error';
        }
      });
    });

    panel.querySelectorAll('.dl-copy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        const type = btn.dataset.type;
        const list = type === 'video' ? videoStreams : audioStreams;
        const stream = list[idx];
        if (stream && stream.url) {
          copyToClipboard(stream.url, statusEl);
        }
      });
    });

    const copyAllBtn = panel.querySelector('#dl-copy-all');
    if (copyAllBtn) {
      copyAllBtn.addEventListener('click', () => {
        const allUrls = streams.map(s => `[${s.type}] ${s.quality} ${s.codec}: ${s.url}`).join('\n');
        copyToClipboard(allUrls, statusEl);
      });
    }

    const retryBtn = panel.querySelector('#dl-retry');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        panel.remove();
        setTimeout(createPanel, 500);
      });
    }

    makeDraggable(panel, panel.querySelector('.dl-panel-header'));
  }

  function makeDraggable(el, handle) {
    let isDragging = false, startX, startY, origX, origY;

    handle.addEventListener('mousedown', (e) => {
      if (e.target.closest('.dl-close') || e.target.closest('.dl-toggle')) return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = el.getBoundingClientRect();
      origX = rect.left;
      origY = rect.top;
      el.style.transition = 'none';
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      el.style.left = (origX + dx) + 'px';
      el.style.top = (origY + dy) + 'px';
      el.style.right = 'auto';
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
      el.style.transition = '';
    });
  }

  function init() {
    injectStyles();
    createPanel();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();