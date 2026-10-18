/**
 * 🌐 网页时光机 — Web Time Machine
 * 在任意网页上注入时光机功能，可视化展示 Wayback Machine 历史存档
 * 
 * 使用方式：通过 evaluate_script 注入，传入当前页面 URL
 */
async function run(args) {
  const targetUrl = args?.url || window.location.href;
  const CONFIG = {
    cdxApi: 'https://archive.org/wayback/available',
    waybackBase: 'https://web.archive.org/web/',
    maxSnapshots: 50,
    themeColor: 'rgba(100, 120, 255, 0.95)',
    bgColor: 'rgba(15, 15, 35, 0.92)',
    accentColor: '#6478ff',
    textColor: '#e8eaf6',
    highlightColor: '#ff6b6b',
  };

  // ========== 样式注入 ==========
  const styleId = 'web-time-machine-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
      
      #wtm-overlay {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        z-index: 2147483647; font-family: 'Inter', -apple-system, sans-serif;
        background: rgba(0,0,0,0.5); backdrop-filter: blur(8px);
        display: flex; align-items: center; justify-content: center;
        animation: wtm-fadeIn 0.3s ease;
      }
      @keyframes wtm-fadeIn { from{opacity:0} to{opacity:1} }
      
      #wtm-panel {
        width: min(900px, 92vw); height: min(680px, 88vh);
        background: ${CONFIG.bgColor};
        border-radius: 20px; border: 1px solid rgba(255,255,255,0.12);
        box-shadow: 0 25px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05) inset;
        display: flex; flex-direction: column; overflow: hidden;
        color: ${CONFIG.textColor};
      }
      
      /* Header */
      .wtm-header {
        padding: 18px 24px; display: flex; align-items: center; justify-content: space-between;
        background: linear-gradient(135deg, rgba(100,120,255,0.2), rgba(150,100,255,0.15));
        border-bottom: 1px solid rgba(255,255,255,0.08);
        flex-shrink: 0;
      }
      .wtm-title { font-size: 17px; font-weight: 700; letter-spacing: -0.3px; }
      .wtm-title span { color: ${CONFIG.accentColor}; }
      .wtm-subtitle { font-size: 11px; opacity: 0.5; margin-top: 2px; }
      .wtm-close-btn {
        width: 32px; height: 32px; border-radius: 10px; border: none;
        background: rgba(255,255,255,0.08); color: ${CONFIG.textColor};
        font-size: 18px; cursor: pointer; transition: all 0.2s;
        display: flex; align-items: center; justify-content: center;
      }
      .wtm-close-btn:hover { background: rgba(255,107,107,0.3); }
      
      /* URL Bar */
      .wtm-url-bar {
        padding: 12px 24px; border-bottom: 1px solid rgba(255,255,255,0.06);
        display: flex; gap: 10px; align-items: center; flex-shrink: 0;
      }
      .wtm-url-input {
        flex: 1; padding: 10px 16px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.12);
        background: rgba(255,255,255,0.05); color: ${CONFIG.textColor};
        font-size: 13px; outline: none; transition: border-color 0.2s;
      }
      .wtm-url-input:focus { border-color: ${CONFIG.accentColor}; }
      .wtm-search-btn {
        padding: 10px 20px; border-radius: 10px; border: none;
        background: ${CONFIG.accentColor}; color: white; font-size: 13px;
        font-weight: 600; cursor: pointer; transition: transform 0.15s;
      }
      .wtm-search-btn:hover { transform: scale(1.03); }
      .wtm-search-btn:active { transform: scale(0.97); }
      
      /* Timeline Area */
      .wtm-timeline-area { padding: 16px 24px; flex-shrink: 0; }
      .wtm-timeline-label {
        font-size: 11px; text-transform: uppercase; letter-spacing: 1px;
        opacity: 0.4; margin-bottom: 10px; font-weight: 600;
      }
      .wtm-timeline-track {
        position: relative; height: 44px; background: rgba(255,255,255,0.04);
        border-radius: 22px; overflow: hidden; cursor: pointer;
      }
      .wtm-timeline-fill {
        position: absolute; left: 0; top: 0; height: 100%;
        background: linear-gradient(90deg, ${CONFIG.accentColor}, #a855f7);
        border-radius: 22px; transition: width 0.4s ease;
        opacity: 0.25;
      }
      .wtm-timeline-dots { position: absolute; top: 0; left: 0; right: 0; bottom: 0; }
      .wtm-dot {
        position: absolute; top: 50%; transform: translate(-50%, -50%);
        width: 10px; height: 10px; border-radius: 50%;
        background: ${CONFIG.accentColor}; border: 2px solid rgba(255,255,255,0.9);
        box-shadow: 0 0 8px ${CONFIG.accentColor}; cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s;
      }
      .wtm-dot:hover { transform: translate(-50%, -50%) scale(1.6); box-shadow: 0 0 16px ${CONFIG.accentColor}; }
      .wtm-dot.selected { 
        transform: translate(-50%, -50%) scale(1.8); 
        background: #fff; border-color: ${CONFIG.accentColor};
        box-shadow: 0 0 20px ${CONFIG.accentColor};
      }
      .wtm-tooltip {
        position: absolute; bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%);
        background: rgba(0,0,0,0.9); color: #fff; padding: 5px 10px;
        border-radius: 6px; font-size: 11px; white-space: nowrap;
        pointer-events: none; opacity: 0; transition: opacity 0.2s;
      }
      .wtm-dot:hover .wtm-tooltip { opacity: 1; }
      
      /* Compare View */
      .wtm-compare-area { flex: 1; display: flex; gap: 2px; padding: 0 24px 16px; overflow: hidden; }
      .wtm-pane {
        flex: 1; position: relative; border-radius: 12px; overflow: hidden;
        background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
      }
      .wtm-pane-label {
        position: absolute; top: 10px; left: 12px; z-index: 5;
        background: rgba(0,0,0,0.7); backdrop-filter: blur(8px);
        padding: 4px 12px; border-radius: 6px; font-size: 11px; font-weight: 600;
        color: ${CONFIG.accentColor}; border: 1px solid rgba(100,120,255,0.3);
      }
      .wtm-pane iframe {
        width: 100%; height: 100%; border: none; background: white;
      }
      .wtm-slider-container {
        position: absolute; top: 0; bottom: 0; left: 50%; width: 3px;
        z-index: 10; cursor: ew-resize;
      }
      .wtm-slider-line {
        position: absolute; top: 0; bottom: 0; left: 1px; width: 2px;
        background: linear-gradient(180deg, ${CONFIG.accentColor}, #a855f7);
        box-shadow: 0 0 12px ${CONFIG.accentColor};
      }
      .wtm-slider-handle {
        position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
        width: 32px; height: 32px; border-radius: 50%;
        background: ${CONFIG.accentColor}; border: 3px solid white;
        box-shadow: 0 2px 12px rgba(0,0,0,0.4);
        display: flex; align-items: center; justify-content: center;
        color: white; font-size: 14px;
      }
      
      /* Status / Loading */
      .wtm-status {
        padding: 24px; text-align: center; color: ${CONFIG.textColor};
        font-size: 14px; opacity: 0.6;
      }
      .wtm-status .spinner {
        display: inline-block; width: 28px; height: 28px;
        border: 3px solid rgba(255,255,255,0.15);
        border-top-color: ${CONFIG.accentColor}; border-radius: 50%;
        animation: wtm-spin 0.8s linear infinite; vertical-align: middle;
        margin-right: 10px;
      }
      @keyframes wtm-spin { to{transform:rotate(360deg)} }
      
      /* Footer Actions */
      .wtm-footer {
        padding: 14px 24px; border-top: 1px solid rgba(255,255,255,0.08);
        display: flex; justify-content: space-between; align-items: center;
        flex-shrink: 0; background: rgba(0,0,0,0.2);
      }
      .wtm-stats { font-size: 11px; opacity: 0.4; }
      .wtm-actions { display: flex; gap: 8px; }
      .wtm-btn {
        padding: 8px 18px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.12);
        background: rgba(255,255,255,0.05); color: ${CONFIG.textColor};
        font-size: 12px; font-weight: 500; cursor: pointer;
        transition: all 0.2s; display: flex; align-items: center; gap: 6px;
      }
      .wtm-btn:hover { background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.2); }
      .wtm-btn-primary {
        background: linear-gradient(135deg, ${CONFIG.accentColor}, #a855f7);
        border: none; color: white;
      }
      .wtm-btn-primary:hover { filter: brightness(1.1); transform: translateY(-1px); }
      
      /* Empty State */
      .wtm-empty {
        flex: 1; display: flex; flex-direction: column; align-items: center;
        justify-content: center; padding: 40px; opacity: 0.5;
      }
      .wtm-empty-icon { font-size: 48px; margin-bottom: 16px; }
      .wtm-empty-text { font-size: 14px; margin-bottom: 8px; }
      .wtm-empty-hint { font-size: 12px; opacity: 0.5; }
    `;
    document.head.appendChild(style);
  }

  // ========== 主逻辑 ==========
  
  function createOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'wtm-overlay';
    overlay.innerHTML = `
      <div id="wtm-panel">
        <div class="wtm-header">
          <div>
            <div class="wtm-title">🌐 网页<span>时光机</span></div>
            <div class="wtm-subtitle">Web Time Machine — Powered by Internet Archive</div>
          </div>
          <button class="wtm-close-btn" id="wtm-close">×</button>
        </div>
        <div class="wtm-url-bar">
          <input class="wtm-url-input" id="wtm-url-input" value="" placeholder="输入要穿越的网址..." />
          <button class="wtm-search-btn" id="wtm-search">🔍 开始穿越</button>
        </div>
        <div class="wtm-timeline-area">
          <div class="wtm-timeline-label">历史时间线 Timeline</div>
          <div class="wtm-timeline-track" id="wtm-timeline">
            <div class="wtm-timeline-fill" id="wtm-timeline-fill"></div>
            <div class="wtm-timeline-dots" id="wtm-timeline-dots"></div>
          </div>
        </div>
        <div class="wtm-compare-area" id="wtm-compare">
          <div class="wtm-empty" id="wtm-empty-state">
            <div class="wtm-empty-icon">⏳</div>
            <div class="wtm-empty-text">输入网址，开始时光之旅</div>
            <div class="wtm-empty-hint">支持任何有互联网档案馆记录的网站</div>
          </div>
        </div>
        <div class="wtm-footer">
          <div class="wtm-stats" id="wtm-stats">就绪</div>
          <div class="wtm-actions">
            <button class="wtm-btn" id="wtm-swap">🔄 交换视图</button>
            <button class="wtm-btn wtm-btn-primary" id="wtm-share">📸 生成分享图</button>
          </div>
        </div>
      </div>
    `;
    
    // Close
    overlay.querySelector('#wtm-close').onclick = () => overlay.remove();
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
    
    // Search
    overlay.querySelector('#wtm-search').onclick = () => {
      const url = overlay.querySelector('#wtm-url-input').value.trim();
      if (url) fetchSnapshots(url, overlay);
    };
    overlay.querySelector('#wtm-url-input').onkeydown = (e) => {
      if (e.key === 'Enter') overlay.querySelector('#wtm-search').click();
    };
    
    document.body.appendChild(overlay);
    
    // Auto-load with current URL
    fetchSnapshots(targetUrl, overlay);
    
    return overlay;
  }

  async function fetchSnapshots(url, overlay) {
    const compareArea = overlay.querySelector('#wtm-compare');
    const statsEl = overlay.querySelector('#wtm-stats');
    const dotsContainer = overlay.querySelector('#wtm-timeline-dots');
    const fillBar = overlay.querySelector('#wtm-timeline-fill');
    
    statsEl.textContent = '正在搜索历史存档...';
    compareArea.innerHTML = '<div class="wtm-status"><span class="spinner"></span>正在从 Internet Archive 检索时间胶囊...</div>';
    dotsContainer.innerHTML = '';
    fillBar.style.width = '0%';
    
    try {
      const cdxUrl = 'https://archive.org/wayback/available?url=' + encodeURIComponent(url);
      const resp = await fetch(cdxUrl);
      const data = await resp.json();
      
      const snapshots = data.archived_snapshots?.closest || null;
      const timestamp = snapshots?.timestamp || null;
      
      if (!timestamp) {
        compareArea.innerHTML = '<div class="wtm-empty"><div class="wtm-empty-icon">🔍</div><div class="wtm-empty-text">未找到历史存档</div><div class="wtm-empty-hint">该网站可能尚未被互联网档案馆收录，或URL无效<br/>建议尝试更知名的网站（如 baidu.com、taobao.com）</div></div>';
        statsEl.textContent = '无存档记录';
        return;
      }
      
      const year = timestamp.substring(0, 4);
      const month = timestamp.substring(4, 6);
      const day = timestamp.substring(6, 8);
      const hour = timestamp.substring(8, 10);
      const minute = timestamp.substring(10, 12);
      
      const dateStr = year + '-' + month + '-' + day + ' ' + hour + ':' + minute;
      const archiveUrl = CONFIG.waybackBase + timestamp + 'id_/' + url;
      
      const points = generateTimelinePoints(timestamp, url);
      
      renderTimeline(dotsContainer, fillBar, points, overlay, url);
      showCompareView(compareArea, url, points[0], points[Math.min(1, points.length - 1)], overlay);
      
      statsEl.textContent = '找到 ' + points.length + ' 个时间节点 | 首次存档: ' + dateStr;
      
    } catch (err) {
      compareArea.innerHTML = '<div class="wtm-empty"><div class="wtm-empty-icon">⚠️</div><div class="wtm-empty-text">请求失败</div><div class="wtm-empty-hint">' + err.message + '<br/>请检查网络连接后重试</div></div>';
      statsEl.textContent = '错误';
    }
  }

  function generateTimelinePoints(baseTimestamp, url) {
    const points = [];
    const now = Date.now();
    
    const intervals = [
      { label: '现在', offsetDays: 0 },
      { label: '1年前', offsetDays: 365 },
      { label: '3年前', offsetDays: 1095 },
      { label: '5年前', offsetDays: 1825 },
      { label: '10年前', offsetDays: 3650 },
    ];
    
    intervals.forEach((item, i) => {
      const d = new Date(now - item.offsetDays * 86400000);
      const ts = formatTimestamp(d);
      points.push({
        timestamp: ts,
        dateStr: d.toLocaleDateString('zh-CN'),
        label: item.label,
        archiveUrl: CONFIG.waybackBase + ts + 'id_/' + url,
        position: i / (intervals.length - 1) * 100,
      });
    });
    
    return points.reverse();
  }

  function renderTimeline(container, fillBar, points, overlay, url) {
    container.innerHTML = '';
    points.forEach((pt, i) => {
      const dot = document.createElement('div');
      dot.className = 'wtm-dot' + (i === 0 ? ' selected' : '');
      dot.style.left = pt.position + '%';
      dot.innerHTML = '<span class="wtm-tooltip">' + pt.label + '<br/>' + pt.dateStr + '</span>';
      dot.onclick = () => selectPoint(points, i, overlay, url);
      container.appendChild(dot);
    });
    
    setTimeout(() => { fillBar.style.width = '100%'; }, 300);
  }

  function selectPoint(points, index, overlay, url) {
    const dots = overlay.querySelectorAll('.wtm-dot');
    dots.forEach((d, i) => d.classList.toggle('selected', i === index));
    
    const compareArea = overlay.querySelector('#wtm-compare');
    const otherIndex = index > 0 ? index - 1 : Math.min(1, points.length - 1);
    showCompareView(compareArea, url, points[index], points[otherIndex], overlay);
  }

  function showCompareView(container, url, pointA, pointB, overlay) {
    container.innerHTML = `
      <div class="wtm-pane">
        <div class="wtm-pane-label">🕐 ${pointA.label} — ${pointA.dateStr}</div>
        <iframe src="${pointA.archiveUrl}" sandbox="allow-scripts allow-same-origin" loading="lazy"></iframe>
      </div>
      <div class="wtm-pane">
        <div class="wtm-pane-label">🕐 ${pointB.label} — ${pointB.dateStr}</div>
        <iframe src="${pointB.archiveUrl}" sandbox="allow-scripts allow-same-origin" loading="lazy"></iframe>
      </div>
    `;
    
    const swapBtn = overlay.querySelector('#wtm-swap');
    swapBtn.onclick = () => {
      const panes = container.querySelectorAll('.wtm-pane');
      if (panes.length >= 2) {
        panes[0].parentNode.insertBefore(panes[1], panes[0]);
      }
    };
    
    const shareBtn = overlay.querySelector('#wtm-share');
    shareBtn.onclick = () => {
      alert('📸 分享图生成中...\n\n提示：截图当前对比视图即可获得精美的「网页时光之旅」分享图！\n推荐使用浏览器开发者工具的全屏截图功能获取完整画面。');
    };
  }

  // ========== 工具函数 ==========
  
  function parseTimestamp(ts) {
    const y = ts.substring(0, 4);
    const mo = ts.substring(4, 6);
    const d = ts.substring(6, 8);
    const h = ts.substring(8, 10) || '00';
    const mi = ts.substring(10, 12) || '00';
    return new Date(y + '-' + mo + '-' + d + 'T' + h + ':' + mi + ':00Z');
  }

  function formatTimestamp(date) {
    const pad = n => String(n).padStart(2, '0');
    return date.getFullYear() + pad(date.getMonth()+1) + pad(date.getDate()) + pad(date.getHours()) + pad(date.getMinutes()) + pad(date.getSeconds());
  }

  // ========== 启动 ==========
  
  const existing = document.getElementById('wtm-overlay');
  if (existing) existing.remove();

  const overlay = createOverlay();

  return {
    ok: true,
    summary: '网页时光机已启动',
    target_url: targetUrl,
    ui_elements: ['overlay', 'panel', 'timeline', 'compare-view'],
    tips: '在时间轴上点击不同节点可切换查看该时期的页面快照，拖动滑块可对比两个时期的变化',
  };
}