(function() {
  if (window.__videoDownloaderMounted) return;
  window.__videoDownloaderMounted = true;

  const SITE = (() => {
    const h = location.hostname;
    if (h.includes('bilibili.com') || h.includes('b23.tv')) return 'bilibili';
    if (h.includes('douyin.com') || h.includes('iesdouyin.com')) return 'douyin';
    return null;
  })();

  if (!SITE) { console.log('[VDownloader] 不支持的网站'); return; }
  console.log('[VDownloader] 已加载 - ' + SITE);

  const BILI_QUALITY = {
    127: '8K 超高清', 126: '杜比视界', 125: 'HDR 真彩',
    120: '4K 超清', 116: '1080P 60帧', 112: '1080P 高码率',
    80: '1080P', 74: '720P 60帧', 64: '720P',
    48: '720P 高帧率', 32: '480P', 16: '360P'
  };

  const BILI_AUDIO_QUALITY = {
    30251: 'Hi-Res 无损', 30250: '杜比全景声',
    30280: '320kbps', 30232: '128kbps', 30216: '64kbps'
  };

  let config = {
    defaultQuality: 'highest',
    autoDetect: true,
    panelX: 20,
    panelY: 200,
    panelCollapsed: false
  };

  try {
    const saved = localStorage.getItem('vdl_config');
    if (saved) Object.assign(config, JSON.parse(saved));
  } catch(e) {}

  function saveConfig() {
    try { localStorage.setItem('vdl_config', JSON.stringify(config)); } catch(e) {}
  }

  function sanitizeFilename(name) {
    return name.replace(/[<>:"/\\|?*\n\r]/g, '_').substring(0, 180);
  }

  function formatSize(bytes) {
    if (!bytes) return '未知';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
    return (bytes / 1073741824).toFixed(2) + ' GB';
  }

  async function fetchWithProgress(url, onProgress) {
    const resp = await fetch(url, {
      headers: { Referer: location.href }
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const total = parseInt(resp.headers.get('content-length')) || 0;
    const reader = resp.body.getReader();
    const chunks = [];
    let received = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      if (onProgress && total) onProgress(received, total, received / total);
    }
    return new Blob(chunks);
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 3000);
  }

  const BilibiliModule = {
    videoStreams: [],
    audioStreams: [],
    title: '',

    extract() {
      try {
        const playinfo = window.__playinfo__;
        if (!playinfo?.data) {
          console.warn('[VDownloader] __playinfo__ 未找到');
          return false;
        }
        const data = playinfo.data;
        const dash = data.dash || {};

        this.videoStreams = (dash.video || []).map(v => ({
          id: v.id,
          quality: BILI_QUALITY[v.id] || (v.id + 'P'),
          width: v.width,
          height: v.height,
          bandwidth: v.bandwidth,
          codecs: v.codecs,
          baseUrl: v.baseUrl || (v.base_url),
          mimeType: v.mimeType || v.mime_type
        }));

        this.audioStreams = (dash.audio || []).map(a => ({
          id: a.id,
          quality: BILI_AUDIO_QUALITY[a.id] || (a.bandwidth ? Math.round(a.bandwidth / 1000) + 'kbps' : '未知'),
          bandwidth: a.bandwidth,
          codecs: a.codecs,
          baseUrl: a.baseUrl || (a.base_url),
          mimeType: a.mimeType || a.mime_type
        }));

        this.title = document.querySelector('h1.video-title, h1[class*="title"]')?.textContent?.trim()
          || document.title.replace(/_哔哩哔哩_bilibili/, '').trim();

        console.log('[VDownloader] 哔哩哔哩视频信息提取成功', this.videoStreams.length, '个视频流', this.audioStreams.length, '个音频流');
        return true;
      } catch(e) {
        console.error('[VDownloader] 哔哩哔哩提取失败', e);
        return false;
      }
    },

    getUniqueVideoStreams() {
      const seen = new Set();
      return this.videoStreams.filter(s => {
        const key = s.id;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }
  };

  const DouyinModule = {
    videoUrls: [],
    title: '',

    extract() {
      try {
        let videoUrl = '';
        const videoEl = document.querySelector('video source') || document.querySelector('video');
        if (videoEl) {
          videoUrl = videoEl.src || videoEl.currentSrc;
          if (videoUrl && videoUrl.startsWith('blob:')) videoUrl = '';
        }

        if (!videoUrl) {
          const routerData = window._ROUTER_DATA;
          if (routerData) {
            const findVideoDetail = (obj) => {
              if (!obj || typeof obj !== 'object') return null;
              if (obj.play_addr?.url_list) return obj.play_addr;
              for (const v of Object.values(obj)) {
                if (v?.play_addr?.url_list) return v.play_addr;
                if (v?.videoDetail?.play_addr?.url_list) return v.videoDetail.play_addr;
                const found = findVideoDetail(v);
                if (found) return found;
              }
              return null;
            };
            const playAddr = findVideoDetail(routerData);
            if (playAddr?.url_list) {
              videoUrl = playAddr.url_list[0]?.replace(/^\/\//, 'https://');
            }
          }
        }

        if (!videoUrl) {
          const scripts = document.querySelectorAll('script');
          for (const script of scripts) {
            const text = script.textContent || '';
            if (text.includes('playAddr') || text.includes('play_addr')) {
              const match = text.match(/"playAddr"\s*:\s*"([^"]+\.mp4[^"]*)"/);
              if (match) {
                videoUrl = match[1].replace(/\\u002F/g, '/').replace(/^\/\//, 'https://');
                break;
              }
            }
          }
        }

        if (!videoUrl) {
          const nextData = window.__NEXT_DATA__;
          if (nextData?.props?.pageProps) {
            const pp = nextData.props.pageProps;
            const playAddr = pp.videoDetail?.play_addr || pp.video?.play_addr;
            if (playAddr?.url_list) {
              videoUrl = playAddr.url_list[0]?.replace(/^\/\//, 'https://');
            }
          }
        }

        if (!videoUrl) {
          const allVideos = document.querySelectorAll('video');
          for (const v of allVideos) {
            const src = v.src || v.currentSrc;
            if (src && !src.startsWith('blob:')) {
              videoUrl = src;
              break;
            }
          }
        }

        this.videoUrls = [];
        if (videoUrl) {
          this.videoUrls.push({ url: videoUrl, quality: '默认', label: '默认画质' });
        }

        this.title = document.querySelector('[class*="title"]')?.textContent?.trim()
          || document.title.replace(/ - 抖音$/, '').trim();

        console.log('[VDownloader] 抖音视频信息提取', videoUrl ? '成功' : '失败');
        return this.videoUrls.length > 0;
      } catch(e) {
        console.error('[VDownloader] 抖音提取失败', e);
        return false;
      }
    }
  };

  function createUI() {
    const container = document.createElement('div');
    container.id = 'vdl-root';
    const shadow = container.attachShadow({ mode: 'closed' });

    shadow.innerHTML = `
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        :host { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }

        .panel {
          position: fixed;
          z-index: 2147483647;
          width: 360px;
          max-height: 80vh;
          background: #1a1a2e;
          border: 1px solid #333;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5);
          color: #e0e0e0;
          font-size: 13px;
          overflow: hidden;
          transition: max-height 0.3s ease;
          user-select: none;
        }
        .panel.collapsed { max-height: 42px; }
        .panel.collapsed .panel-body { display: none; }

        .panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          background: linear-gradient(135deg, #16213e, #0f3460);
          cursor: move;
          border-radius: 12px 12px 0 0;
        }
        .panel.collapsed .panel-header { border-radius: 12px; }
        .panel-header h3 {
          font-size: 13px;
          font-weight: 600;
          color: #fff;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .panel-header h3 span { font-size: 16px; }
        .header-btns { display: flex; gap: 4px; }
        .header-btns button {
          width: 24px; height: 24px;
          border: none; border-radius: 50%;
          background: rgba(255,255,255,0.1);
          color: #ccc; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; line-height: 1;
          transition: background 0.2s;
        }
        .header-btns button:hover { background: rgba(255,255,255,0.25); color: #fff; }

        .panel-body { padding: 10px 14px; overflow-y: auto; max-height: calc(80vh - 42px); }

        .video-title {
          font-size: 12px;
          color: #aaa;
          margin-bottom: 10px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          padding: 6px 10px;
          background: rgba(255,255,255,0.05);
          border-radius: 6px;
        }

        .section { margin-bottom: 12px; }
        .section-title {
          font-size: 11px;
          color: #8892b0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
          font-weight: 600;
        }

        .stream-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 10px;
          background: rgba(255,255,255,0.05);
          border-radius: 8px;
          margin-bottom: 4px;
          transition: background 0.2s;
        }
        .stream-item:hover { background: rgba(255,255,255,0.1); }
        .stream-info { flex: 1; min-width: 0; }
        .stream-quality {
          font-weight: 600;
          color: #64ffda;
          font-size: 13px;
        }
        .stream-detail {
          font-size: 11px;
          color: #8892b0;
          margin-top: 2px;
        }
        .stream-btn {
          padding: 5px 12px;
          border: none;
          border-radius: 6px;
          background: #0f3460;
          color: #64ffda;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
          margin-left: 8px;
        }
        .stream-btn:hover { background: #1a4a8a; transform: translateY(-1px); }
        .stream-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .stream-btn.downloading { background: #e94560; color: #fff; }
        .stream-btn.combined { background: #533483; color: #fff; }

        .progress-bar {
          width: 100%;
          height: 4px;
          background: rgba(255,255,255,0.1);
          border-radius: 2px;
          margin-top: 6px;
          display: none;
          overflow: hidden;
        }
        .progress-bar.active { display: block; }
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #64ffda, #0f3460);
          border-radius: 2px;
          transition: width 0.3s;
          width: 0%;
        }
        .progress-text {
          font-size: 11px;
          color: #8892b0;
          margin-top: 2px;
          display: none;
        }
        .progress-text.active { display: block; }

        .no-video {
          text-align: center;
          padding: 20px;
          color: #8892b0;
        }
        .no-video p { margin-bottom: 8px; }
        .retry-btn {
          padding: 6px 16px;
          border: 1px solid #0f3460;
          border-radius: 6px;
          background: transparent;
          color: #64ffda;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s;
        }
        .retry-btn:hover { background: #0f3460; }

        .settings-group { margin-bottom: 10px; }
        .settings-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 0;
        }
        .settings-label { font-size: 12px; color: #ccc; }
        .settings-select {
          padding: 4px 8px;
          border: 1px solid #333;
          border-radius: 4px;
          background: #16213e;
          color: #e0e0e0;
          font-size: 12px;
          outline: none;
        }
        .settings-select:focus { border-color: #64ffda; }

        .toggle {
          position: relative;
          width: 36px; height: 20px;
          background: #333;
          border-radius: 10px;
          cursor: pointer;
          transition: background 0.3s;
        }
        .toggle.active { background: #0f3460; }
        .toggle::after {
          content: '';
          position: absolute;
          top: 2px; left: 2px;
          width: 16px; height: 16px;
          background: #fff;
          border-radius: 50%;
          transition: transform 0.3s;
        }
        .toggle.active::after { transform: translateX(16px); }

        .tabs {
          display: flex;
          border-bottom: 1px solid #333;
          margin-bottom: 10px;
        }
        .tab {
          flex: 1;
          padding: 8px;
          text-align: center;
          font-size: 12px;
          color: #8892b0;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: all 0.2s;
        }
        .tab:hover { color: #ccc; }
        .tab.active { color: #64ffda; border-bottom-color: #64ffda; }

        .tip {
          font-size: 11px;
          color: #e94560;
          padding: 8px;
          background: rgba(233,69,96,0.1);
          border-radius: 6px;
          margin-top: 8px;
          line-height: 1.5;
        }
        .tip code {
          background: rgba(255,255,255,0.1);
          padding: 1px 4px;
          border-radius: 3px;
          font-size: 10px;
        }

        .site-badge {
          display: inline-block;
          padding: 1px 6px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 600;
          margin-left: 6px;
        }
        .site-badge.bilibili { background: #fb7299; color: #fff; }
        .site-badge.douyin { background: #161823; color: #fe2c55; border: 1px solid #fe2c55; }
      </style>

      <div class="panel" id="panel">
        <div class="panel-header" id="dragHandle">
          <h3><span>⬇</span> 视频下载 <span class="site-badge ${SITE}">${SITE === 'bilibili' ? 'B站' : '抖音'}</span></h3>
          <div class="header-btns">
            <button id="btnMin" title="最小化">−</button>
            <button id="btnClose" title="关闭">×</button>
          </div>
        </div>
        <div class="panel-body" id="panelBody">
          <div class="tabs">
            <div class="tab active" data-tab="download">下载</div>
            <div class="tab" data-tab="settings">设置</div>
          </div>
          <div id="tabDownload">
            <div id="videoInfo"></div>
          </div>
          <div id="tabSettings" style="display:none">
            <div class="settings-group">
              <div class="settings-row">
                <span class="settings-label">默认画质</span>
                <select class="settings-select" id="defaultQuality">
                  <option value="highest">最高画质</option>
                  <option value="1080">1080P</option>
                  <option value="720">720P</option>
                  <option value="480">480P</option>
                </select>
              </div>
              <div class="settings-row">
                <span class="settings-label">自动检测</span>
                <div class="toggle ${config.autoDetect ? 'active' : ''}" id="toggleAutoDetect"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(container);

    const panel = shadow.getElementById('panel');
    const dragHandle = shadow.getElementById('dragHandle');
    const btnMin = shadow.getElementById('btnMin');
    const btnClose = shadow.getElementById('btnClose');
    const videoInfo = shadow.getElementById('videoInfo');
    const panelBody = shadow.getElementById('panelBody');
    const tabs = shadow.querySelectorAll('.tab');
    const tabDownload = shadow.getElementById('tabDownload');
    const tabSettings = shadow.getElementById('tabSettings');
    const defaultQualitySel = shadow.getElementById('defaultQuality');
    const toggleAutoDetect = shadow.getElementById('toggleAutoDetect');

    panel.style.left = config.panelX + 'px';
    panel.style.top = config.panelY + 'px';
    if (config.panelCollapsed) panel.classList.add('collapsed');

    defaultQualitySel.value = config.defaultQuality;

    let isDragging = false, dragOffX = 0, dragOffY = 0;
    dragHandle.addEventListener('mousedown', e => {
      if (e.target.closest('.header-btns')) return;
      isDragging = true;
      dragOffX = e.clientX - panel.offsetLeft;
      dragOffY = e.clientY - panel.offsetTop;
      e.preventDefault();
    });
    document.addEventListener('mousemove', e => {
      if (!isDragging) return;
      const x = Math.max(0, Math.min(window.innerWidth - 100, e.clientX - dragOffX));
      const y = Math.max(0, Math.min(window.innerHeight - 50, e.clientY - dragOffY));
      panel.style.left = x + 'px';
      panel.style.top = y + 'px';
      config.panelX = x;
      config.panelY = y;
    });
    document.addEventListener('mouseup', () => {
      if (isDragging) { isDragging = false; saveConfig(); }
    });

    btnMin.addEventListener('click', () => {
      panel.classList.toggle('collapsed');
      config.panelCollapsed = panel.classList.contains('collapsed');
      saveConfig();
    });

    btnClose.addEventListener('click', () => {
      container.remove();
      window.__videoDownloaderMounted = false;
    });

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const target = tab.dataset.tab;
        tabDownload.style.display = target === 'download' ? '' : 'none';
        tabSettings.style.display = target === 'settings' ? '' : 'none';
      });
    });

    defaultQualitySel.addEventListener('change', () => {
      config.defaultQuality = defaultQualitySel.value;
      saveConfig();
    });

    toggleAutoDetect.addEventListener('click', () => {
      config.autoDetect = !config.autoDetect;
      toggleAutoDetect.classList.toggle('active', config.autoDetect);
      saveConfig();
    });

    function updateBilibiliUI() {
      const uniqueVideo = BilibiliModule.getUniqueVideoStreams();
      const bestAudio = BilibiliModule.audioStreams.length > 0
        ? BilibiliModule.audioStreams.reduce((a, b) => (a.bandwidth || 0) > (b.bandwidth || 0) ? a : b)
        : null;

      let html = `<div class="video-title" title="${BilibiliModule.title}">${BilibiliModule.title}</div>`;

      html += `<div class="section"><div class="section-title">🎬 视频流 + 音频（推荐）</div>`;
      uniqueVideo.forEach((v, i) => {
        html += `
          <div class="stream-item">
            <div class="stream-info">
              <div class="stream-quality">${v.quality}</div>
              <div class="stream-detail">${v.width}×${v.height} · ${formatSize(v.bandwidth * 300 / 8)}(约3分钟)</div>
            </div>
            <button class="stream-btn combined" data-action="bili-combined" data-index="${i}">下载含音频</button>
          </div>
          <div class="progress-bar" id="pb-combined-${i}"><div class="progress-fill"></div></div>
          <div class="progress-text" id="pt-combined-${i}"></div>
        `;
      });
      html += `</div>`;

      html += `<div class="section"><div class="section-title">📹 仅视频流</div>`;
      uniqueVideo.forEach((v, i) => {
        html += `
          <div class="stream-item">
            <div class="stream-info">
              <div class="stream-quality">${v.quality}</div>
              <div class="stream-detail">${v.width}×${v.height} · ${v.codecs || ''}</div>
            </div>
            <button class="stream-btn" data-action="bili-video" data-index="${i}">下载视频</button>
          </div>
          <div class="progress-bar" id="pb-video-${i}"><div class="progress-fill"></div></div>
          <div class="progress-text" id="pt-video-${i}"></div>
        `;
      });
      html += `</div>`;

      if (BilibiliModule.audioStreams.length > 0) {
        html += `<div class="section"><div class="section-title">🔊 音频流</div>`;
        BilibiliModule.audioStreams.forEach((a, i) => {
          html += `
            <div class="stream-item">
              <div class="stream-info">
                <div class="stream-quality">${a.quality}</div>
                <div class="stream-detail">${formatSize(a.bandwidth * 300 / 8)}(约3分钟)</div>
              </div>
              <button class="stream-btn" data-action="bili-audio" data-index="${i}">下载音频</button>
            </div>
            <div class="progress-bar" id="pb-audio-${i}"><div class="progress-fill"></div></div>
            <div class="progress-text" id="pt-audio-${i}"></div>
          `;
        });
        html += `</div>`;
      }

      html += `<div class="tip">💡 B站高画质视频音画分离，"下载含音频"会同时下载视频和音频两个文件。<br>合并命令：<code>ffmpeg -i video.m4s -i audio.m4s -c copy out.mp4</code></div>`;

      videoInfo.innerHTML = html;
    }

    function updateDouyinUI() {
      let html = `<div class="video-title" title="${DouyinModule.title}">${DouyinModule.title}</div>`;

      if (DouyinModule.videoUrls.length === 0) {
        html += `<div class="no-video"><p>未检测到视频</p><p>请播放视频后点击重试</p><button class="retry-btn" data-action="retry">重新检测</button></div>`;
      } else {
        html += `<div class="section"><div class="section-title">🎬 视频</div>`;
        DouyinModule.videoUrls.forEach((v, i) => {
          html += `
            <div class="stream-item">
              <div class="stream-info">
                <div class="stream-quality">${v.quality || '默认'}</div>
                <div class="stream-detail">MP4 含音频</div>
              </div>
              <button class="stream-btn" data-action="douyin-download" data-index="${i}">下载视频</button>
            </div>
            <div class="progress-bar" id="pb-dy-${i}"><div class="progress-fill"></div></div>
            <div class="progress-text" id="pt-dy-${i}"></div>
          `;
        });
        html += `</div>`;
        html += `<div class="tip">💡 抖音视频为MP4格式，已包含音频，可直接播放。</div>`;
      }

      videoInfo.innerHTML = html;
    }

    function showProgress(id, received, total, ratio) {
      const pb = shadow.getElementById('pb-' + id);
      const pt = shadow.getElementById('pt-' + id);
      if (pb) {
        pb.classList.add('active');
        pb.querySelector('.progress-fill').style.width = (ratio * 100).toFixed(1) + '%';
      }
      if (pt) {
        pt.classList.add('active');
        pt.textContent = `${formatSize(received)} / ${formatSize(total)} (${(ratio * 100).toFixed(1)}%)`;
      }
    }

    function hideProgress(id) {
      const pb = shadow.getElementById('pb-' + id);
      const pt = shadow.getElementById('pt-' + id);
      if (pb) pb.classList.remove('active');
      if (pt) pt.classList.remove('active');
    }

    videoInfo.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn || btn.disabled) return;

      const action = btn.dataset.action;
      const index = parseInt(btn.dataset.index);

      if (action === 'retry') {
        detectVideo();
        return;
      }

      btn.disabled = true;
      btn.classList.add('downloading');
      const origText = btn.textContent;
      btn.textContent = '下载中...';

      try {
        if (action === 'bili-video') {
          const stream = BilibiliModule.getUniqueVideoStreams()[index];
          if (!stream?.baseUrl) throw new Error('无视频URL');
          const blob = await fetchWithProgress(stream.baseUrl, (r, t, ratio) => {
            showProgress('video-' + index, r, t, ratio);
          });
          const name = sanitizeFilename(BilibiliModule.title) + '_video.m4s';
          downloadBlob(blob, name);
          btn.textContent = '✓ 完成';
        }

        else if (action === 'bili-audio') {
          const stream = BilibiliModule.audioStreams[index];
          if (!stream?.baseUrl) throw new Error('无音频URL');
          const blob = await fetchWithProgress(stream.baseUrl, (r, t, ratio) => {
            showProgress('audio-' + index, r, t, ratio);
          });
          const name = sanitizeFilename(BilibiliModule.title) + '_audio.m4s';
          downloadBlob(blob, name);
          btn.textContent = '✓ 完成';
        }

        else if (action === 'bili-combined') {
          const stream = BilibiliModule.getUniqueVideoStreams()[index];
          const bestAudio = BilibiliModule.audioStreams.length > 0
            ? BilibiliModule.audioStreams.reduce((a, b) => (a.bandwidth || 0) > (b.bandwidth || 0) ? a : b)
            : null;

          if (!stream?.baseUrl) throw new Error('无视频URL');

          btn.textContent = '下载视频中...';
          const videoBlob = await fetchWithProgress(stream.baseUrl, (r, t, ratio) => {
            showProgress('combined-' + index, r, t * (bestAudio ? 2 : 1), ratio / (bestAudio ? 2 : 1));
          });

          if (bestAudio?.baseUrl) {
            btn.textContent = '下载音频中...';
            const audioBlob = await fetchWithProgress(bestAudio.baseUrl, (r, t, ratio) => {
              showProgress('combined-' + index, videoBlob.size + r, videoBlob.size + t, (0.5 + ratio / 2));
            });
            const baseName = sanitizeFilename(BilibiliModule.title);
            downloadBlob(videoBlob, baseName + `_${stream.quality}_video.m4s`);
            downloadBlob(audioBlob, baseName + `_${bestAudio.quality}_audio.m4s`);
          } else {
            downloadBlob(videoBlob, sanitizeFilename(BilibiliModule.title) + '_video.m4s');
          }

          btn.textContent = '✓ 完成';
          hideProgress('combined-' + index);
        }

        else if (action === 'douyin-download') {
          const vInfo = DouyinModule.videoUrls[index];
          if (!vInfo?.url) throw new Error('无视频URL');
          const blob = await fetchWithProgress(vInfo.url, (r, t, ratio) => {
            showProgress('dy-' + index, r, t, ratio);
          });
          const name = sanitizeFilename(DouyinModule.title) + '.mp4';
          downloadBlob(blob, name);
          btn.textContent = '✓ 完成';
        }

      } catch(err) {
        console.error('[VDownloader] 下载失败', err);
        btn.textContent = '✗ 失败';
        btn.style.background = '#e94560';
        btn.style.color = '#fff';
        setTimeout(() => {
          btn.textContent = origText;
          btn.style.background = '';
          btn.style.color = '';
        }, 2000);
      }

      setTimeout(() => {
        btn.disabled = false;
        btn.classList.remove('downloading');
        btn.textContent = origText;
      }, 2000);
    });

    function detectVideo() {
      videoInfo.innerHTML = '<div class="no-video"><p>正在检测视频...</p></div>';

      setTimeout(() => {
        if (SITE === 'bilibili') {
          if (BilibiliModule.extract()) {
            updateBilibiliUI();
          } else {
            videoInfo.innerHTML = '<div class="no-video"><p>未检测到视频信息</p><p>请确保视频已开始播放</p><button class="retry-btn" data-action="retry">重新检测</button></div>';
          }
        } else if (SITE === 'douyin') {
          if (DouyinModule.extract()) {
            updateDouyinUI();
          } else {
            videoInfo.innerHTML = '<div class="no-video"><p>未检测到视频</p><p>请播放视频后点击重试</p><button class="retry-btn" data-action="retry">重新检测</button></div>';
          }
        }
      }, 500);
    }

    detectVideo();

    let lastUrl = location.href;
    setInterval(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        detectVideo();
      }
    }, 2000);

    if (config.autoDetect) {
      let playinfoCheckCount = 0;
      const playinfoInterval = setInterval(() => {
        if (SITE === 'bilibili' && !BilibiliModule.videoStreams.length) {
          if (BilibiliModule.extract()) {
            updateBilibiliUI();
            clearInterval(playinfoInterval);
          }
          if (++playinfoCheckCount > 30) clearInterval(playinfoInterval);
        } else {
          clearInterval(playinfoInterval);
        }
      }, 2000);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(createUI, 1000));
  } else {
    setTimeout(createUI, 1000);
  }
})();