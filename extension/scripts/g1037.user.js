(function() {
  if (window.__subtitleGrabberLoaded) return;
  window.__subtitleGrabberLoaded = true;

  const STYLE_ID = 'subtitle-grabber-style';
  const BTN_ID = 'subtitle-grabber-btn';
  const PANEL_ID = 'subtitle-grabber-panel';

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${BTN_ID} {
        position: fixed;
        bottom: 80px;
        right: 24px;
        z-index: 99999;
        background: linear-gradient(135deg, #00a1d6, #0086b3);
        color: #fff;
        border: none;
        border-radius: 50%;
        width: 48px;
        height: 48px;
        font-size: 20px;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,161,214,0.4);
        transition: transform 0.2s, box-shadow 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        line-height: 1;
        user-select: none;
      }
      #${BTN_ID}:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 20px rgba(0,161,214,0.6);
      }
      #${PANEL_ID} {
        position: fixed;
        bottom: 140px;
        right: 24px;
        z-index: 99999;
        width: 420px;
        max-height: 520px;
        background: #1a1a2e;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif;
        color: #e0e0e0;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        animation: sg-fadeIn 0.25s ease-out;
      }
      @keyframes sg-fadeIn {
        from { opacity: 0; transform: translateY(12px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .sg-header {
        padding: 14px 18px;
        background: #16213e;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 1px solid #2a2a4a;
        flex-shrink: 0;
      }
      .sg-header-title {
        font-size: 15px;
        font-weight: 600;
        color: #00d4ff;
      }
      .sg-close {
        background: none;
        border: none;
        color: #888;
        font-size: 18px;
        cursor: pointer;
        padding: 0 4px;
        line-height: 1;
      }
      .sg-close:hover { color: #fff; }
      .sg-body {
        flex: 1;
        overflow-y: auto;
        padding: 16px 18px;
      }
      .sg-body::-webkit-scrollbar { width: 5px; }
      .sg-body::-webkit-scrollbar-thumb { background: #444; border-radius: 3px; }
      .sg-status {
        text-align: center;
        padding: 20px 0;
        color: #999;
        font-size: 13px;
      }
      .sg-status .sg-spinner {
        display: inline-block;
        width: 20px;
        height: 20px;
        border: 2px solid #333;
        border-top-color: #00d4ff;
        border-radius: 50%;
        animation: sg-spin 0.8s linear infinite;
        margin-bottom: 10px;
      }
      @keyframes sg-spin { to { transform: rotate(360deg); } }
      .sg-error {
        color: #ff6b6b;
        font-size: 13px;
        text-align: center;
        padding: 16px 0;
      }
      .sg-meta {
        font-size: 12px;
        color: #888;
        margin-bottom: 12px;
        padding-bottom: 10px;
        border-bottom: 1px solid #2a2a4a;
      }
      .sg-actions {
        display: flex;
        gap: 8px;
        margin-bottom: 14px;
        flex-wrap: wrap;
      }
      .sg-action-btn {
        padding: 6px 14px;
        border-radius: 6px;
        border: 1px solid #3a3a5a;
        background: #222244;
        color: #ccc;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.15s;
      }
      .sg-action-btn:hover {
        background: #00a1d6;
        border-color: #00a1d6;
        color: #fff;
      }
      .sg-action-btn.active {
        background: #00a1d6;
        border-color: #00a1d6;
        color: #fff;
      }
      .sg-content {
        font-size: 13px;
        line-height: 1.8;
        white-space: pre-wrap;
        word-break: break-all;
        max-height: 300px;
        overflow-y: auto;
        background: #0f0f23;
        border-radius: 8px;
        padding: 12px 14px;
        color: #ccc;
      }
      .sg-content::-webkit-scrollbar { width: 4px; }
      .sg-content::-webkit-scrollbar-thumb { background: #444; border-radius: 2px; }
      .sg-lang-select {
        padding: 6px 10px;
        border-radius: 6px;
        border: 1px solid #3a3a5a;
        background: #222244;
        color: #ccc;
        font-size: 12px;
        cursor: pointer;
        outline: none;
      }
      .sg-lang-select option { background: #1a1a2e; }
    `;
    document.head.appendChild(style);
  }

  function parseUrlInfo() {
    const url = new URL(window.location.href);
    const pathParts = url.pathname.split('/');
    const bvid = pathParts.find(p => p.startsWith('BV')) || '';
    const p = parseInt(url.searchParams.get('p')) || 1;
    return { bvid, p };
  }

  async function fetchJSON(url) {
    const resp = await fetch(url, { credentials: 'include' });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json();
    if (json.code !== 0) throw new Error(json.message || `API code ${json.code}`);
    return json.data;
  }

  async function getVideoInfo(bvid) {
    return fetchJSON(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`);
  }

  async function getSubtitleList(bvid, cid) {
    const data = await fetchJSON(
      `https://api.bilibili.com/x/player/wbi/v2?bvid=${bvid}&cid=${cid}`
    );
    return data?.subtitle?.subtitles || [];
  }

  async function fetchSubtitleContent(url) {
    const fullUrl = url.startsWith('http') ? url : `https:${url}`;
    const resp = await fetch(fullUrl);
    if (!resp.ok) throw new Error(`Subtitle fetch HTTP ${resp.status}`);
    return resp.json();
  }

  function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.round((seconds % 1) * 1000);
    const pad = (n, l) => String(n).padStart(l, '0');
    return h > 0
      ? `${pad(h,2)}:${pad(m,2)}:${pad(s,2)},${pad(ms,3)}`
      : `${pad(m,2)}:${pad(s,2)},${pad(ms,3)}`;
  }

  function toSRT(subtitleData) {
    return subtitleData.body.map((item, idx) => {
      const start = formatTime(item.from);
      const end = formatTime(item.to);
      return `${idx + 1}\n${start} --> ${end}\n${item.content}\n`;
    }).join('\n');
  }

  function toPlainText(subtitleData) {
    return subtitleData.body.map(item => item.content).join('\n');
  }

  function toTimestampedText(subtitleData) {
    return subtitleData.body.map(item => {
      const start = formatTime(item.from);
      return `[${start}] ${item.content}`;
    }).join('\n');
  }

  function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function createPanel() {
    if (document.getElementById(PANEL_ID)) {
      document.getElementById(PANEL_ID).remove();
      return;
    }

    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.innerHTML = `
      <div class="sg-header">
        <span class="sg-header-title">📜 字幕抓取</span>
        <button class="sg-close" title="关闭">✕</button>
      </div>
      <div class="sg-body">
        <div class="sg-status">
          <div class="sg-spinner"></div>
          <div>正在获取字幕信息...</div>
        </div>
      </div>
    `;
    document.body.appendChild(panel);

    panel.querySelector('.sg-close').addEventListener('click', () => panel.remove());

    return panel;
  }

  async function run() {
    const { bvid, p } = parseUrlInfo();
    if (!bvid) {
      alert('无法识别视频BV号，请在B站视频页面使用');
      return;
    }

    const panel = createPanel();
    if (!panel) return;
    const body = panel.querySelector('.sg-body');

    try {
      const videoInfo = await getVideoInfo(bvid);
      const pageData = videoInfo.pages.find(pg => pg.page === p) || videoInfo.pages[0];
      const cid = pageData.cid;
      const pageTitle = videoInfo.title;
      const pageName = pageData.part;

      const subtitles = await getSubtitleList(bvid, cid);

      if (!subtitles || subtitles.length === 0) {
        body.innerHTML = `
          <div class="sg-error">
            ⚠️ 该视频没有可用字幕<br>
            <span style="font-size:11px;color:#666;margin-top:6px;display:block">
              可能原因：未开启CC字幕 / 视频无AI字幕 / 需要登录
            </span>
          </div>
        `;
        return;
      }

      let currentFormat = 'timestamped';
      let currentSubtitleData = null;
      let currentLangIdx = 0;

      async function loadSubtitle(idx) {
        currentLangIdx = idx;
        const sub = subtitles[idx];
        body.innerHTML = `<div class="sg-status"><div class="sg-spinner"></div><div>正在下载字幕...</div></div>`;
        currentSubtitleData = await fetchSubtitleContent(sub.subtitle_url);
        renderContent();
      }

      function renderContent() {
        const sub = subtitles[currentLangIdx];
        const langLabel = sub.lan_doc || sub.lang;

        let textContent = '';
        let fileExt = 'txt';
        let mimeType = 'text/plain';

        if (currentFormat === 'srt') {
          textContent = toSRT(currentSubtitleData);
          fileExt = 'srt';
        } else if (currentFormat === 'plain') {
          textContent = toPlainText(currentSubtitleData);
        } else {
          textContent = toTimestampedText(currentSubtitleData);
        }

        const fileName = `${pageTitle} - ${pageName}.${fileExt}`;

        body.innerHTML = `
          <div class="sg-meta">
            📺 ${pageTitle}<br>
            📄 P${p}: ${pageName} | 字幕: ${langLabel}<br>
            📝 共 ${currentSubtitleData.body.length} 条
          </div>
          <div style="margin-bottom:10px;">
            <select class="sg-lang-select" id="sg-lang-sel">
              ${subtitles.map((s, i) => `<option value="${i}" ${i === currentLangIdx ? 'selected' : ''}>${s.lan_doc || s.lang}</option>`).join('')}
            </select>
          </div>
          <div class="sg-actions">
            <button class="sg-action-btn ${currentFormat === 'timestamped' ? 'active' : ''}" data-fmt="timestamped">带时间戳</button>
            <button class="sg-action-btn ${currentFormat === 'plain' ? 'active' : ''}" data-fmt="plain">纯文本</button>
            <button class="sg-action-btn ${currentFormat === 'srt' ? 'active' : ''}" data-fmt="srt">SRT格式</button>
            <button class="sg-action-btn" id="sg-download" style="margin-left:auto;background:#00a1d6;border-color:#00a1d6;color:#fff;">⬇ 下载</button>
          </div>
          <div class="sg-content">${escapeHtml(textContent)}</div>
        `;

        body.querySelector('#sg-lang-sel').addEventListener('change', (e) => {
          loadSubtitle(parseInt(e.target.value));
        });

        body.querySelectorAll('.sg-action-btn[data-fmt]').forEach(btn => {
          btn.addEventListener('click', () => {
            currentFormat = btn.dataset.fmt;
            renderContent();
          });
        });

        body.querySelector('#sg-download').addEventListener('click', () => {
          downloadFile(textContent, fileName, mimeType);
        });
      }

      await loadSubtitle(0);

    } catch (err) {
      body.innerHTML = `<div class="sg-error">❌ 获取失败: ${escapeHtml(err.message)}</div>`;
      console.error('[SubtitleGrabber]', err);
    }
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function init() {
    injectStyles();

    const btn = document.createElement('button');
    btn.id = BTN_ID;
    btn.title = '抓取视频字幕';
    btn.innerHTML = '📜';
    btn.addEventListener('click', run);
    document.body.appendChild(btn);

    console.log('[SubtitleGrabber] 字幕抓取脚本已加载，点击右下角按钮开始');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();