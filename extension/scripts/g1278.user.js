(function() {
  'use strict';

  if (window.bilibiliEnhancedMenu) return;
  window.bilibiliEnhancedMenu = true;

  const CONFIG = {
    menuId: 'bilibili-enhanced-menu',
    settingsId: 'bilibili-enhanced-settings',
    historyPanelId: 'bilibili-history-panel',
    collapsedClass: 'menu-collapsed',
    expandedClass: 'menu-expanded',
    updateInterval: 1000,
    titleRefreshInterval: 1000
  };

  const DEFAULT_SETTINGS = {
    playTimeEnabled: false,
    systemTimeEnabled: false,
    videoTitleEnabled: false,
    autoSaveEnabled: true,
    danmakuAvoid: false,
    playTimeOpacity: 100,
    videoTitleOpacity: 100,
    systemTimeOpacity: 100,
    playTimeColor: { r: 255, g: 255, b: 255 },
    videoTitleColor: { r: 255, g: 255, b: 255 },
    systemTimeColor: { r: 255, g: 255, b: 255 },
    playTimeGlass: false,
    videoTitleGlass: false,
    systemTimeGlass: false,
    themeMode: 'auto',
    refreshBacktrackEnabled: false,
    playTimePosX: 2, playTimePosY: 2, playTimeScale: 100,
    videoTitlePosX: 50, videoTitlePosY: 2, videoTitleScale: 100,
    systemTimePosX: 98, systemTimePosY: 2, systemTimeScale: 100
  };

  const state = {
    isMenuExpanded: false,
    showPlayTime: false,
    showSystemTime: false,
    showVideoTitle: false,
    playTimeElement: null,
    systemTimeElement: null,
    videoTitleElement: null,
    menuElement: null,
    settingsElement: null,
    historyPanel: null,
    updateInterval: null,
    titleUpdateInterval: null,
    animationFrameId: null,
    playerContainer: null,
    isLiveStream: false,
    lastPlayedTimeText: '',
    lastVideoTitle: '',
    settings: { ...DEFAULT_SETTINGS },
    refreshBacktrackEnabled: false,
    // 回溯相关
    backtrackPreviousData: null,   // 保存的上一次推荐数据（原始API响应对象）
    backtrackUndoData: null,       // 撤销用数据
    currentRecommendData: null,    // 当前显示的推荐数据
    pendingRestore: false,         // 是否正在执行恢复操作
    pendingUndo: false,            // 是否正在执行撤销操作
    homeClickHandler: null,
    originalFetch: window.fetch.bind(window),
    watchHistory: []
  };

  const isHomePage = () => /^https?:\/\/www\.bilibili\.com\/?(\?.*)?(#.*)?$/.test(location.href);
  const isVideoPage = () => /^https?:\/\/www\.bilibili\.com\/video\//.test(location.href);

  // ==================== 主题 ====================
  const applyTheme = (mode) => {
    const root = document.documentElement;
    const isDark = mode === 'dark' || (mode === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
    root.setAttribute('data-theme', isDark ? 'dark' : 'light');
  };
  const initTheme = () => {
    applyTheme(state.settings.themeMode || 'auto');
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (state.settings.themeMode === 'auto') applyTheme('auto');
    });
  };

  // ==================== 设置存取 ====================
  const loadSettings = () => {
    try {
      const raw = localStorage.getItem('bilibiliEnhancedSettings');
      if (raw) {
        const parsed = JSON.parse(raw);
        state.settings = { ...DEFAULT_SETTINGS, ...parsed };
        ['playTimeColor','videoTitleColor','systemTimeColor'].forEach(k => {
          if (typeof state.settings[k] !== 'object') state.settings[k] = DEFAULT_SETTINGS[k];
        });
        if (!['auto','dark','light'].includes(state.settings.themeMode)) state.settings.themeMode = 'auto';
        state.showPlayTime = state.settings.playTimeEnabled;
        state.showSystemTime = state.settings.systemTimeEnabled;
        state.showVideoTitle = state.settings.videoTitleEnabled;
        state.refreshBacktrackEnabled = state.settings.refreshBacktrackEnabled || false;
      }
      const history = localStorage.getItem('bilibiliWatchHistory');
      if (history) state.watchHistory = JSON.parse(history);
    } catch (e) { console.warn('加载设置失败', e); }
  };
  const saveSettings = () => {
    try {
      if (state.settings.autoSaveEnabled) {
        state.settings.playTimeEnabled = state.showPlayTime;
        state.settings.systemTimeEnabled = state.showSystemTime;
        state.settings.videoTitleEnabled = state.showVideoTitle;
        state.settings.refreshBacktrackEnabled = state.refreshBacktrackEnabled;
      }
      localStorage.setItem('bilibiliEnhancedSettings', JSON.stringify(state.settings));
    } catch (e) { console.warn('保存设置失败', e); }
  };
  const saveWatchHistory = () => {
    if (state.watchHistory.length > 50) state.watchHistory = state.watchHistory.slice(0, 50);
    localStorage.setItem('bilibiliWatchHistory', JSON.stringify(state.watchHistory));
  };

  // ==================== 播放器容器 ====================
  const getPlayerContainer = () => {
    const video = document.querySelector('video');
    if (!video) return null;
    let el = video.parentElement;
    for (let i = 0; i < 5 && el; i++) {
      if (el.classList?.contains('bpx-player-video-wrap') ||
          el.classList?.contains('bilibili-player-video-wrap') ||
          el.classList?.contains('bpx-player-video-area')) return el;
      el = el.parentElement;
    }
    return null;
  };

  // ==================== 样式 ====================
  const createStyles = () => {
    if (document.getElementById('bilibili-glass-style')) return;
    const style = document.createElement('style');
    style.id = 'bilibili-glass-style';
    style.textContent = `
      :root { --bg-primary: rgba(20,20,25,0.72); --bg-secondary: rgba(20,20,25,0.95); --border-light: rgba(255,255,255,0.12); --border-dim: rgba(255,255,255,0.05); --text-primary: #ffffff; --text-secondary: #e5e5e5; --accent-color: #00a1d6; --scrollbar-thumb: rgba(255,255,255,0.2); --scrollbar-track: rgba(0,0,0,0.1); --glass-blur: blur(16px) saturate(180%); }
      :root[data-theme="light"] { --bg-primary: rgba(245,245,250,0.85); --bg-secondary: rgba(245,245,250,0.95); --border-light: rgba(0,0,0,0.12); --border-dim: rgba(0,0,0,0.05); --text-primary: #1a1a1a; --text-secondary: #2c2c2c; --accent-color: #00668c; --scrollbar-thumb: rgba(0,0,0,0.2); --scrollbar-track: rgba(0,0,0,0.05); --glass-blur: blur(16px) saturate(180%); }
      #bilibili-enhanced-menu { position: fixed; top: 20px; left: 20px; z-index: 10000; background: var(--bg-primary); backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur); border: 1px solid var(--border-light); border-radius: 14px; overflow: hidden; transition: all 0.3s; box-shadow: 0 8px 32px rgba(0,0,0,0.25); color: var(--text-primary); font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; }
      #bilibili-enhanced-menu.menu-collapsed { width: 46px; height: 46px; border-radius: 23px; }
      #bilibili-enhanced-menu.menu-expanded { width: 280px; min-height: 260px; border-radius: 14px; }
      .menu-toggle { width: 100%; height: 46px; background: rgba(255,255,255,0.08); border: none; border-bottom: 1px solid var(--border-light); color: var(--text-primary); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 18px; outline: none; }
      .menu-toggle:hover { background: rgba(255,255,255,0.12); }
      .menu-content { padding: 18px; display: flex; flex-direction: column; gap: 16px; max-height: 500px; overflow-y: auto; scrollbar-width: thin; scrollbar-color: var(--scrollbar-thumb) var(--scrollbar-track); }
      .menu-item { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border-dim); }
      .menu-item.disabled { opacity: 0.4; pointer-events: none; }
      .menu-label { font-size: 14px; color: var(--text-secondary); font-weight: 500; }
      .speed-control { display: flex; align-items: center; gap: 8px; margin: 8px 0; padding: 8px 0; border-bottom: 1px solid var(--border-dim); }
      .speed-label { font-size: 14px; color: var(--text-secondary); font-weight: 500; flex-shrink: 0; width: 70px; }
      .speed-input { width: 70px; background: rgba(0,0,0,0.2); border: 1px solid var(--border-light); border-radius: 6px; padding: 6px 8px; color: var(--text-primary); font-size: 14px; outline: none; text-align: center; }
      .speed-button { flex: 1; background: rgba(0,161,214,0.3); border: 1px solid rgba(0,161,214,0.4); color: var(--text-primary); padding: 6px 8px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500; outline: none; white-space: nowrap; }
      .speed-button:hover { background: rgba(0,161,214,0.5); }
      .settings-button { background: rgba(0,161,214,0.2); border: 1px solid rgba(0,161,214,0.3); color: var(--text-primary); padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; outline: none; width: 100%; margin-top: 8px; }
      .settings-button:hover { background: rgba(0,161,214,0.3); }
      .toggle-switch { position: relative; width: 44px; height: 24px; flex-shrink: 0; }
      .toggle-checkbox { opacity: 0; width: 0; height: 0; }
      .toggle-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background: rgba(255,255,255,0.15); transition: .3s; border-radius: 24px; border: 1px solid var(--border-light); }
      .toggle-slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 2px; bottom: 2px; background: white; transition: .3s; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
      .toggle-checkbox:checked + .toggle-slider { background: rgba(0,161,214,0.3); border-color: rgba(0,161,214,0.4); }
      .toggle-checkbox:checked + .toggle-slider:before { transform: translateX(20px); }

      #bilibili-enhanced-settings { position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%); z-index: 10001; width: 400px; max-height: 80vh; background: var(--bg-secondary); backdrop-filter: blur(20px) saturate(180%); -webkit-backdrop-filter: blur(20px) saturate(180%); border: 1px solid var(--border-light); border-radius: 16px; color: var(--text-primary); font-family: inherit; box-shadow: 0 20px 60px rgba(0,0,0,0.5); display: none; overflow: hidden; flex-direction: column; }
      .settings-header { display: flex; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--border-light); flex-shrink: 0; }
      .settings-header h3 { margin: 0; font-size: 18px; font-weight: 600; flex: 1; text-align: center; color: var(--text-primary); }
      .back-button { background: none; border: none; color: var(--text-primary); font-size: 20px; cursor: pointer; padding: 4px 12px; border-radius: 6px; outline: none; }
      .back-button:hover { background: rgba(128,128,128,0.1); }
      .settings-content { padding: 20px; overflow-y: auto; overflow-x: hidden; flex: 1; scrollbar-width: thin; scrollbar-color: var(--scrollbar-thumb) var(--scrollbar-track); }
      .setting-group { margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid var(--border-dim); }
      .setting-group:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
      .setting-group-title { font-size: 14px; font-weight: 600; color: var(--accent-color); margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
      .setting-item { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
      .setting-item.opacity-item.disabled { opacity: 0.5; pointer-events: none; }
      .setting-label { font-size: 14px; color: var(--text-secondary); }
      .theme-selector { background: rgba(0,0,0,0.1); border: 1px solid var(--border-light); border-radius: 6px; padding: 6px 8px; color: var(--text-primary); font-size: 14px; outline: none; cursor: pointer; }
      .theme-selector option { background: var(--bg-secondary); color: var(--text-primary); }
      .slider-container { display: flex; align-items: center; gap: 12px; flex: 1; max-width: 200px; }
      .slider-container input[type="range"] { flex: 1; height: 4px; background: rgba(255,255,255,0.15); border-radius: 2px; -webkit-appearance: none; appearance: none; }
      .slider-container input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; background: var(--accent-color); border-radius: 50%; cursor: pointer; border: 2px solid white; }
      .slider-value { font-size: 12px; min-width: 40px; text-align: right; color: var(--text-secondary); }
      .color-preview { width: 30px; height: 30px; border-radius: 6px; border: 2px solid rgba(255,255,255,0.2); cursor: pointer; transition: border-color 0.2s; }
      .color-preview:hover { border-color: var(--accent-color); }

      .play-time-display, .system-time-display, .video-title-display { position: absolute; background: rgba(15,15,20,0.85); backdrop-filter: blur(12px) saturate(180%); -webkit-backdrop-filter: blur(12px) saturate(180%); color: #fff; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 4px 12px rgba(0,0,0,0.25); display: none; z-index: 9999; white-space: nowrap; user-select: none; cursor: default; }
      .play-time-display { transform-origin: top left; }
      .system-time-display { transform-origin: top right; }
      .video-title-display { transform-origin: top center; }
      .play-time-display.danmaku-dim, .system-time-display.danmaku-dim, .video-title-display.danmaku-dim { mix-blend-mode: multiply; background: rgba(30,30,35,0.6) !important; color: #fff !important; text-shadow: 0 1px 4px rgba(0,0,0,0.5); border-color: rgba(255,255,255,0.2) !important; }

      .backtrack-controls { display: flex; gap: 10px; margin-top: 8px; }
      .backtrack-btn { flex: 1; background: rgba(0,161,214,0.2); border: 1px solid rgba(0,161,214,0.3); color: var(--text-primary); padding: 8px 10px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 500; outline: none; text-align: center; }
      .backtrack-btn:hover { background: rgba(0,161,214,0.3); }
      .backtrack-btn:disabled { opacity: 0.4; cursor: not-allowed; background: rgba(128,128,128,0.2); }

      #bilibili-history-panel { position: fixed; top: 20px; right: 20px; z-index: 10002; width: 300px; max-height: 70vh; background: var(--bg-secondary); backdrop-filter: blur(20px) saturate(180%); -webkit-backdrop-filter: blur(20px) saturate(180%); border: 1px solid var(--border-light); border-radius: 16px; color: var(--text-primary); font-family: inherit; box-shadow: 0 8px 32px rgba(0,0,0,0.25); display: none; flex-direction: column; overflow: hidden; }
      .history-header { display: flex; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--border-light); flex-shrink: 0; }
      .history-header h3 { margin: 0; font-size: 16px; font-weight: 600; flex: 1; }
      .history-close { background: none; border: none; color: var(--text-primary); font-size: 20px; cursor: pointer; padding: 2px 8px; border-radius: 4px; }
      .history-list { flex: 1; overflow-y: auto; padding: 8px; scrollbar-width: thin; scrollbar-color: var(--scrollbar-thumb) var(--scrollbar-track); }
      .history-item { display: flex; align-items: center; gap: 10px; padding: 8px; border-bottom: 1px solid var(--border-dim); cursor: pointer; transition: background 0.2s; }
      .history-item:hover { background: rgba(255,255,255,0.05); }
      .history-cover { width: 80px; height: 45px; border-radius: 4px; object-fit: cover; flex-shrink: 0; }
      .history-info { flex: 1; overflow: hidden; }
      .history-title { font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .history-time { font-size: 11px; color: var(--text-secondary); margin-top: 2px; }
    `;
    document.head.appendChild(style);
  };

  // ==================== 设置面板 ====================
  const createDisplayGroup = (key, title, opacity, color, glass, posX, posY, scale) => `
    <div class="setting-group" id="group-${key}">
      <div class="setting-group-title">${title}</div>
      <div class="setting-item opacity-item" id="${key}-opacity-item">
        <span class="setting-label">透明度</span>
        <div class="slider-container"><input type="range" id="setting-${key}-opacity" min="0" max="100" value="${opacity}"><span class="slider-value" id="${key}-opacity-value">${opacity}%</span></div>
      </div>
      <div class="setting-item"><span class="setting-label">颜色</span><div class="color-preview" id="setting-${key}-color" style="background:rgb(${color.r},${color.g},${color.b});"></div></div>
      <div class="setting-item"><span class="setting-label">毛玻璃背景</span><label class="toggle-switch"><input type="checkbox" class="toggle-checkbox glass-toggle" data-target="${key}" id="setting-${key}-glass" ${glass?'checked':''}><span class="toggle-slider"></span></label></div>
      <div class="setting-item"><span class="setting-label">位置 X (%)</span><div class="slider-container"><input type="range" id="setting-${key}-posx" min="0" max="100" value="${posX}"><span class="slider-value" id="${key}-posx-value">${posX}%</span></div></div>
      <div class="setting-item"><span class="setting-label">位置 Y (%)</span><div class="slider-container"><input type="range" id="setting-${key}-posy" min="0" max="100" value="${posY}"><span class="slider-value" id="${key}-posy-value">${posY}%</span></div></div>
      <div class="setting-item"><span class="setting-label">缩放 (%)</span><div class="slider-container"><input type="range" id="setting-${key}-scale" min="50" max="200" value="${scale}"><span class="slider-value" id="${key}-scale-value">${scale}%</span></div></div>
    </div>
  `;

  const bindSlider = (id, settingKey, valueSpanId, suffix) => {
    const slider = document.getElementById(id);
    const valueSpan = document.getElementById(valueSpanId);
    if (!slider || !valueSpan) return;
    slider.oninput = () => {
      const val = parseInt(slider.value);
      state.settings[settingKey] = val;
      valueSpan.textContent = val + suffix;
      saveSettings();
      applyStyles();
    };
  };

  const createColorPicker = (elementId, colorKey) => {
    const preview = document.getElementById(elementId);
    if (!preview) return;
    preview.onclick = () => {
      const input = document.createElement('input');
      input.type = 'color';
      input.value = rgbToHex(state.settings[colorKey]);
      input.oninput = e => {
        const rgb = hexToRgb(e.target.value);
        state.settings[colorKey] = rgb;
        preview.style.background = e.target.value;
        saveSettings();
        applyStyles();
      };
      input.click();
    };
  };

  const rgbToHex = (rgb) => '#' + [rgb.r, rgb.g, rgb.b].map(x => x.toString(16).padStart(2,'0')).join('');
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? { r: parseInt(result[1],16), g: parseInt(result[2],16), b: parseInt(result[3],16) } : { r:255,g:255,b:255 };
  };

  const updateDisabledStates = () => {
    const play = document.getElementById('playtime-opacity-item');
    const title = document.getElementById('videotitle-opacity-item');
    const time = document.getElementById('systemtime-opacity-item');
    if (play) play.classList.toggle('disabled', state.settings.playTimeGlass);
    if (title) title.classList.toggle('disabled', state.settings.videoTitleGlass);
    if (time) time.classList.toggle('disabled', state.settings.systemTimeGlass);
  };

  const bindSettingsEvents = () => {
    document.getElementById('settings-back').onclick = () => {
      state.settingsElement.style.display = 'none';
      if (!state.isMenuExpanded) toggleMenu();
    };
    document.getElementById('setting-theme-mode').onchange = e => {
      state.settings.themeMode = e.target.value;
      applyTheme(state.settings.themeMode);
      saveSettings();
    };
    document.getElementById('setting-danmaku-avoid').onchange = e => {
      state.settings.danmakuAvoid = e.target.checked;
      saveSettings();
      applyDanmakuAvoid();
    };
    document.getElementById('setting-auto-save').onchange = e => {
      state.settings.autoSaveEnabled = e.target.checked;
      saveSettings();
    };
    ['playtime','videotitle','systemtime'].forEach(key => {
      const capKey = key === 'playtime' ? 'playTime' : key === 'videotitle' ? 'videoTitle' : 'systemTime';
      bindSlider(`setting-${key}-opacity`, `${capKey}Opacity`, `${key}-opacity-value`, '%');
      bindSlider(`setting-${key}-posx`, `${capKey}PosX`, `${key}-posx-value`, '%');
      bindSlider(`setting-${key}-posy`, `${capKey}PosY`, `${key}-posy-value`, '%');
      bindSlider(`setting-${key}-scale`, `${capKey}Scale`, `${key}-scale-value`, '%');
      createColorPicker(`setting-${key}-color`, `${capKey}Color`);
      const glassToggle = document.getElementById(`setting-${key}-glass`);
      if (glassToggle) glassToggle.onchange = e => {
        state.settings[`${capKey}Glass`] = e.target.checked;
        saveSettings();
        updateDisabledStates();
        applyStyles();
      };
    });
  };

  const createSettingsPanel = () => {
    const panel = document.createElement('div');
    panel.id = CONFIG.settingsId;
    panel.innerHTML = `
      <div class="settings-header">
        <button class="back-button" id="settings-back">← 返回</button>
        <h3>显示设置</h3>
        <div style="width:40px;"></div>
      </div>
      <div class="settings-content">
        <div class="setting-group">
          <div class="setting-group-title">通用</div>
          <div class="setting-item"><span class="setting-label">🌓 主题</span>
            <select class="theme-selector" id="setting-theme-mode">
              <option value="auto" ${state.settings.themeMode==='auto'?'selected':''}>跟随系统</option>
              <option value="dark" ${state.settings.themeMode==='dark'?'selected':''}>深色</option>
              <option value="light" ${state.settings.themeMode==='light'?'selected':''}>浅色</option>
            </select>
          </div>
          <div class="setting-item"><span class="setting-label">✨ 更好的毛玻璃</span>
            <label class="toggle-switch"><input type="checkbox" class="toggle-checkbox" id="setting-danmaku-avoid" ${state.settings.danmakuAvoid?'checked':''}><span class="toggle-slider"></span></label>
          </div>
          <div class="setting-item"><span class="setting-label">💾 自动保存功能配置</span>
            <label class="toggle-switch"><input type="checkbox" class="toggle-checkbox" id="setting-auto-save" ${state.settings.autoSaveEnabled?'checked':''}><span class="toggle-slider"></span></label>
          </div>
        </div>
        ${createDisplayGroup('playtime','播放时间',state.settings.playTimeOpacity,state.settings.playTimeColor,state.settings.playTimeGlass,state.settings.playTimePosX,state.settings.playTimePosY,state.settings.playTimeScale)}
        ${createDisplayGroup('videotitle','视频标题',state.settings.videoTitleOpacity,state.settings.videoTitleColor,state.settings.videoTitleGlass,state.settings.videoTitlePosX,state.settings.videoTitlePosY,state.settings.videoTitleScale)}
        ${createDisplayGroup('systemtime','系统时间',state.settings.systemTimeOpacity,state.settings.systemTimeColor,state.settings.systemTimeGlass,state.settings.systemTimePosX,state.settings.systemTimePosY,state.settings.systemTimeScale)}
      </div>
    `;
    document.body.appendChild(panel);
    state.settingsElement = panel;
    bindSettingsEvents();
    updateDisabledStates();
  };

  // ==================== 显示元素样式应用 ====================
  const applyStyles = () => {
    applyElement('playTimeElement', 'playTime');
    applyElement('videoTitleElement', 'videoTitle');
    applyElement('systemTimeElement', 'systemTime');
  };
  const applyElement = (type, capKey) => {
    const el = state[type];
    if (!el) return;
    const cfg = state.settings;
    const opacity = cfg[`${capKey}Opacity`] / 100;
    const color = cfg[`${capKey}Color`];
    const useGlass = cfg[`${capKey}Glass`];
    const posX = cfg[`${capKey}PosX`];
    const posY = cfg[`${capKey}PosY`];
    const scale = cfg[`${capKey}Scale`] / 100;

    el.style.color = `rgba(${color.r},${color.g},${color.b},${opacity})`;
    if (useGlass) {
      el.style.background = 'rgba(20,20,25,0.72)';
      el.style.backdropFilter = 'blur(16px) saturate(180%)';
      el.style.webkitBackdropFilter = 'blur(16px) saturate(180%)';
      el.style.border = '1px solid rgba(255,255,255,0.12)';
    } else {
      el.style.background = `rgba(15,15,20,${0.85 * opacity})`;
      el.style.backdropFilter = 'none';
      el.style.webkitBackdropFilter = 'none';
      el.style.border = '1px solid rgba(255,255,255,0.1)';
    }

    if (capKey === 'systemTime') {
      el.style.left = 'auto';
      el.style.right = `${100 - posX}%`;
      el.style.top = `${posY}%`;
      el.style.transform = `translateX(50%) scale(${scale})`;
    } else if (capKey === 'videoTitle') {
      el.style.left = `${posX}%`;
      el.style.top = `${posY}%`;
      el.style.transform = `translateX(-50%) scale(${scale})`;
    } else {
      el.style.left = `${posX}%`;
      el.style.top = `${posY}%`;
      el.style.transform = `scale(${scale})`;
    }
  };

  const applyDanmakuAvoid = () => {
    [state.playTimeElement, state.systemTimeElement, state.videoTitleElement].forEach(el => {
      if (!el) return;
      el.classList.toggle('danmaku-dim', state.settings.danmakuAvoid);
    });
  };

  // ==================== 观看历史 ====================
  const addToWatchHistory = (bv, title, cover) => {
    if (state.watchHistory.length > 0 && state.watchHistory[0].bv === bv) return;
    state.watchHistory.unshift({ bv, title, cover, time: Date.now() });
    saveWatchHistory();
  };
  const recordCurrentVideo = () => {
    if (!isVideoPage()) return;
    const bvMatch = location.pathname.match(/BV[A-Za-z0-9]+/);
    if (!bvMatch) return;
    const bv = bvMatch[0];
    const titleEl = document.querySelector('.video-title .tit, h1.video-title, .video-info-title');
    const title = titleEl ? titleEl.textContent.trim().replace(/_哔哩哔哩_bilibili/,'') : '未知视频';
    let cover = '';
    const metaCover = document.querySelector('meta[property="og:image"]');
    if (metaCover) cover = metaCover.getAttribute('content');
    else {
      const videoEl = document.querySelector('video');
      if (videoEl) cover = videoEl.poster;
    }
    addToWatchHistory(bv, title, cover);
  };
  const createHistoryPanel = () => {
    if (state.historyPanel) return;
    const panel = document.createElement('div');
    panel.id = CONFIG.historyPanelId;
    panel.innerHTML = `
      <div class="history-header">
        <h3>观看历史</h3>
        <button class="history-close" id="history-close-btn">✕</button>
      </div>
      <div class="history-list" id="history-list-container"></div>
    `;
    document.body.appendChild(panel);
    state.historyPanel = panel;
    document.getElementById('history-close-btn').onclick = () => panel.style.display = 'none';
    document.getElementById('history-list-container').addEventListener('click', e => {
      const item = e.target.closest('.history-item');
      if (item && item.dataset.bv) location.href = `https://www.bilibili.com/video/${item.dataset.bv}`;
    });
  };
  const renderHistoryList = () => {
    const container = document.getElementById('history-list-container');
    if (!container) return;
    if (state.watchHistory.length === 0) {
      container.innerHTML = '<p style="text-align:center;opacity:0.5;">暂无观看记录</p>';
      return;
    }
    container.innerHTML = state.watchHistory.slice(0, 20).map(item => `
      <div class="history-item" data-bv="${item.bv}">
        <img class="history-cover" src="${item.cover}" loading="lazy" onerror="this.src='data:image/svg+xml,...'">
        <div class="history-info">
          <div class="history-title">${item.title}</div>
          <div class="history-time">${new Date(item.time).toLocaleString()}</div>
        </div>
      </div>
    `).join('');
  };
  const toggleHistoryPanel = () => {
    if (!state.historyPanel) createHistoryPanel();
    state.historyPanel.style.display = state.historyPanel.style.display === 'flex' ? 'none' : 'flex';
    if (state.historyPanel.style.display === 'flex') renderHistoryList();
  };

  // ==================== 主菜单 ====================
  const setPlaybackRate = () => {
    const input = document.getElementById('speed-input');
    const video = document.querySelector('video');
    if (!video) return alert('未找到视频元素');
    let rate = parseFloat(input.value);
    if (isNaN(rate) || rate <= 0) { input.value = video.playbackRate; return alert('倍速必须大于0'); }
    if (rate > 16) rate = 16;
    video.playbackRate = rate;
    input.value = rate;
  };

  const createMenu = () => {
    const menu = document.createElement('div');
    menu.id = CONFIG.menuId;
    menu.className = CONFIG.collapsedClass;
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'menu-toggle';
    toggleBtn.innerHTML = '<span>▶</span>';
    toggleBtn.onclick = toggleMenu;

    const content = document.createElement('div');
    content.className = 'menu-content';
    content.style.display = 'none';

    content.appendChild(createMenuItem('播放时间显示', 'playTimeToggle', state.showPlayTime, togglePlayTimeDisplay));
    content.appendChild(createMenuItem('系统时间显示', 'systemTimeToggle', state.showSystemTime, toggleSystemTimeDisplay));
    content.appendChild(createMenuItem('视频标题显示', 'videoTitleToggle', state.showVideoTitle, toggleVideoTitleDisplay));
    content.appendChild(createMenuItem('刷新回溯', 'refreshBacktrackToggle', state.refreshBacktrackEnabled, toggleRefreshBacktrack));

    const backtrackDiv = document.createElement('div');
    backtrackDiv.className = 'backtrack-controls';
    backtrackDiv.style.display = state.refreshBacktrackEnabled ? 'flex' : 'none';
    backtrackDiv.innerHTML = `
      <button class="backtrack-btn" id="menu-restore-btn" disabled>恢复</button>
      <button class="backtrack-btn" id="menu-undo-btn" disabled>撤销</button>
    `;
    content.appendChild(backtrackDiv);

    const manualBtn = document.createElement('button');
    manualBtn.className = 'settings-button';
    manualBtn.textContent = '💾 手动保存当前列表';
    manualBtn.style.display = state.refreshBacktrackEnabled ? 'block' : 'none';
    manualBtn.id = 'manual-save-btn';
    manualBtn.onclick = saveCurrentListManually;
    content.appendChild(manualBtn);

    const speedDiv = document.createElement('div');
    speedDiv.className = 'speed-control';
    speedDiv.innerHTML = '<span class="speed-label">倍速播放</span><input type="number" class="speed-input" id="speed-input" min="0.01" step="0.1" value="1.0" placeholder="倍速"><button class="speed-button" id="speed-set-btn">设置</button>';
    content.appendChild(speedDiv);

    const historyBtn = document.createElement('button');
    historyBtn.className = 'settings-button';
    historyBtn.textContent = '📖 观看历史';
    historyBtn.onclick = toggleHistoryPanel;
    content.appendChild(historyBtn);

    const settingsBtn = document.createElement('button');
    settingsBtn.className = 'settings-button';
    settingsBtn.textContent = '⚙️ 设置';
    settingsBtn.onclick = () => {
      if (state.settingsElement) {
        state.settingsElement.style.display = 'flex';
        if (state.isMenuExpanded) toggleMenu();
      }
    };
    content.appendChild(settingsBtn);

    menu.appendChild(toggleBtn);
    menu.appendChild(content);
    document.body.appendChild(menu);
    state.menuElement = menu;

    document.getElementById('speed-set-btn').onclick = setPlaybackRate;
    document.getElementById('speed-input').onkeypress = e => { if (e.key==='Enter') setPlaybackRate(); };

    document.getElementById('menu-restore-btn').onclick = performRestore;
    document.getElementById('menu-undo-btn').onclick = performUndo;

    updateVideoSwitchesState();
  };

  const createMenuItem = (label, id, checked, onChange) => {
    const item = document.createElement('div');
    item.className = 'menu-item';
    item.innerHTML = `<span class="menu-label">${label}</span>`;
    const sw = document.createElement('label');
    sw.className = 'toggle-switch';
    const cb = document.createElement('input');
    cb.type = 'checkbox'; cb.className = 'toggle-checkbox'; cb.id = id; cb.checked = checked;
    cb.onchange = onChange;
    sw.appendChild(cb);
    sw.appendChild(document.createElement('span')).className = 'toggle-slider';
    item.appendChild(sw);
    return item;
  };

  const toggleMenu = () => {
    const menu = state.menuElement;
    const content = menu.querySelector('.menu-content');
    const span = menu.querySelector('.menu-toggle span');
    if (state.isMenuExpanded) {
      menu.classList.remove(CONFIG.expandedClass);
      menu.classList.add(CONFIG.collapsedClass);
      content.style.display = 'none';
      span.innerHTML = '▶';
    } else {
      menu.classList.remove(CONFIG.collapsedClass);
      menu.classList.add(CONFIG.expandedClass);
      content.style.display = 'flex';
      span.innerHTML = '◀';
    }
    state.isMenuExpanded = !state.isMenuExpanded;
  };

  const updateVideoSwitchesState = () => {
    const isVideo = isVideoPage();
    ['playTimeToggle','systemTimeToggle','videoTitleToggle'].forEach(id => {
      const cb = document.getElementById(id);
      if (!cb) return;
      const item = cb.closest('.menu-item');
      if (!item) return;
      if (!isVideo) {
        item.classList.add('disabled');
        cb.checked = false;
        if (id === 'playTimeToggle') { state.showPlayTime = false; hideElement('playTimeElement'); cancelAnimation(); }
        else if (id === 'systemTimeToggle') { state.showSystemTime = false; hideElement('systemTimeElement'); clearInterval(state.updateInterval); }
        else if (id === 'videoTitleToggle') { state.showVideoTitle = false; hideElement('videoTitleElement'); clearInterval(state.titleUpdateInterval); }
      } else {
        item.classList.remove('disabled');
        cb.checked = state.settings[id === 'playTimeToggle' ? 'playTimeEnabled' : id === 'systemTimeToggle' ? 'systemTimeEnabled' : 'videoTitleEnabled'];
      }
    });
  };

  const hideElement = (type) => { if (state[type]) state[type].style.display = 'none'; };
  const cancelAnimation = () => { if (state.animationFrameId) { cancelAnimationFrame(state.animationFrameId); state.animationFrameId = null; } };

  // ==================== 功能开关 ====================
  const togglePlayTimeDisplay = (e) => {
    if (!isVideoPage()) { e.target.checked = false; return; }
    state.showPlayTime = e.target.checked;
    const el = createOrGetDisplayElement('playTimeElement', 'play-time-display');
    if (state.showPlayTime) {
      el.style.display = 'block';
      applyStyles(); applyDanmakuAvoid();
      updatePlayTimeDisplay(); startUpdateLoop();
    } else { el.style.display = 'none'; cancelAnimation(); }
    saveSettingsIfAuto();
  };
  const toggleSystemTimeDisplay = (e) => {
    if (!isVideoPage()) { e.target.checked = false; return; }
    state.showSystemTime = e.target.checked;
    const el = createOrGetDisplayElement('systemTimeElement', 'system-time-display');
    clearInterval(state.updateInterval);
    if (state.showSystemTime) {
      el.style.display = 'block';
      applyStyles(); applyDanmakuAvoid();
      updateSystemTimeDisplay();
      state.updateInterval = setInterval(updateSystemTimeDisplay, CONFIG.updateInterval);
    } else el.style.display = 'none';
    saveSettingsIfAuto();
  };
  const toggleVideoTitleDisplay = (e) => {
    if (!isVideoPage()) { e.target.checked = false; return; }
    state.showVideoTitle = e.target.checked;
    const el = createOrGetDisplayElement('videoTitleElement', 'video-title-display');
    clearInterval(state.titleUpdateInterval);
    if (state.showVideoTitle) {
      el.style.display = 'block';
      applyStyles(); applyDanmakuAvoid();
      updateVideoTitleDisplay();
      state.titleUpdateInterval = setInterval(updateVideoTitleDisplay, CONFIG.titleRefreshInterval);
    } else el.style.display = 'none';
    saveSettingsIfAuto();
  };
  const saveSettingsIfAuto = () => {
    if (state.settings.autoSaveEnabled) {
      state.settings.playTimeEnabled = state.showPlayTime;
      state.settings.systemTimeEnabled = state.showSystemTime;
      state.settings.videoTitleEnabled = state.showVideoTitle;
      saveSettings();
    }
  };

  const toggleRefreshBacktrack = (e) => {
    state.refreshBacktrackEnabled = e.target.checked;
    if (state.settings.autoSaveEnabled) saveSettings();
    const backtrackDiv = state.menuElement.querySelector('.backtrack-controls');
    const manualBtn = document.getElementById('manual-save-btn');
    if (backtrackDiv) backtrackDiv.style.display = state.refreshBacktrackEnabled ? 'flex' : 'none';
    if (manualBtn) manualBtn.style.display = state.refreshBacktrackEnabled ? 'block' : 'none';
    if (state.refreshBacktrackEnabled) {
      enableBacktrack();
    } else {
      disableBacktrack();
    }
  };

  // ==================== 显示元素创建 ====================
  const createOrGetDisplayElement = (type, className) => {
    if (!state[type]) {
      const el = document.createElement('div');
      el.className = className;
      el.style.display = 'none';
      state[type] = el;
    }
    if (isVideoPage()) {
      const container = getPlayerContainer();
      if (container && state[type].parentNode !== container) {
        if (state[type].parentNode) state[type].parentNode.removeChild(state[type]);
        container.appendChild(state[type]);
      }
    }
    return state[type];
  };

  // ==================== 更新显示 ====================
  const updatePlayTimeDisplay = () => {
    if (!state.showPlayTime || !state.playTimeElement) return;
    const video = document.querySelector('video');
    if (!video) return;
    if (video.readyState < 1) { state.playTimeElement.textContent = '加载中...'; return; }
    const isLive = checkIfLiveStream(video);
    let text = isLive ? `直播中 ${formatTime(video.currentTime)}` : `${formatTime(video.currentTime)} / ${formatTime(video.duration)} [-${formatTime(video.duration - video.currentTime)}]`;
    if (text !== state.lastPlayedTimeText) { state.playTimeElement.textContent = text; state.lastPlayedTimeText = text; }
  };
  const updateSystemTimeDisplay = () => {
    if (!state.showSystemTime || !state.systemTimeElement) return;
    const now = new Date(Date.now() + 8*60*60*1000);
    state.systemTimeElement.textContent = `北京时间 ${now.getUTCHours().toString().padStart(2,'0')}:${now.getUTCMinutes().toString().padStart(2,'0')}:${now.getUTCSeconds().toString().padStart(2,'0')} (T:${Date.now()})`;
  };
  const updateVideoTitleDisplay = () => {
    if (!state.showVideoTitle || !state.videoTitleElement) return;
    const title = getVideoTitle();
    if (title !== state.lastVideoTitle) { state.videoTitleElement.textContent = title; state.lastVideoTitle = title; }
  };

  const formatTime = (s) => {
    if (!isFinite(s) || s < 0) return '00:00:00';
    const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = Math.floor(s%60);
    return h>0 ? `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}` : `${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`;
  };
  const checkIfLiveStream = (video) => {
    if (!video || !isFinite(video.duration)) return true;
    return document.querySelector('.live-room-app,.live-player,[data-area="live"],.bilibili-live-player') || location.pathname.includes('/live/');
  };
  const getVideoTitle = () => {
    const el = document.querySelector('.video-title .tit,.video-title,h1.video-title,.video-info-title,title');
    return el?.textContent?.trim().replace(/_哔哩哔哩_bilibili|-bilibili|_哔哩哔哩/g,'') || '未知视频';
  };

  const startUpdateLoop = () => {
    if (state.animationFrameId) cancelAnimationFrame(state.animationFrameId);
    const loop = () => { if (state.showPlayTime) updatePlayTimeDisplay(); state.animationFrameId = requestAnimationFrame(loop); };
    loop();
  };

  // ==================== 回溯核心（fetch 劫持方案） ====================
  const hookFetch = () => {
    window.fetch = async (input, init) => {
      const response = await state.originalFetch(input, init);
      // 仅在主页且开启回溯时处理
      if (!isHomePage() || !state.refreshBacktrackEnabled) return response;

      const url = typeof input === 'string' ? input : input.url;
      // 匹配推荐API（可根据实际情况调整）
      if (!url.includes('/x/web-interface/')) return response;

      // 克隆响应以便读取
      const cloned = response.clone();
      try {
        const json = await cloned.json();
        // 判断是否是视频列表数据（简单检查是否有 data 数组）
        if (!json.data || !Array.isArray(json.data)) return response;

        // 如果是恢复操作，用 previous 数据替换
        if (state.pendingRestore && state.backtrackPreviousData) {
          console.log('[回溯] 劫持响应，恢复旧数据');
          state.pendingRestore = false;
          // 将当前数据保存为 undo
          state.backtrackUndoData = json.data;
          const modified = new Response(JSON.stringify({
            ...json,
            data: state.backtrackPreviousData
          }), { status: 200, headers: response.headers });
          state.backtrackPreviousData = null;
          updateBacktrackButtons();
          return modified;
        }

        // 如果是撤销操作，用 undo 数据替换
        if (state.pendingUndo && state.backtrackUndoData) {
          console.log('[回溯] 劫持响应，撤销操作');
          state.pendingUndo = false;
          const modified = new Response(JSON.stringify({
            ...json,
            data: state.backtrackUndoData
          }), { status: 200, headers: response.headers });
          state.backtrackPreviousData = json.data;  // 当前数据成为新的 previous
          state.backtrackUndoData = null;
          updateBacktrackButtons();
          return modified;
        }

        // 正常保存当前数据作为 previous（自动或手动）
        // 但不要覆盖手动保存的 previous，如果 previous 存在且不是 pending 状态，则更新
        if (!state.pendingRestore && !state.pendingUndo) {
          state.backtrackPreviousData = json.data;
          state.backtrackUndoData = null;
          updateBacktrackButtons();
        }

      } catch (e) {
        // 非 JSON 响应或结构不符，忽略
      }
      return response;
    };
  };

  const updateBacktrackButtons = () => {
    const restoreBtn = document.getElementById('menu-restore-btn');
    const undoBtn = document.getElementById('menu-undo-btn');
    if (restoreBtn) restoreBtn.disabled = !state.backtrackPreviousData;
    if (undoBtn) undoBtn.disabled = !state.backtrackUndoData;
  };

  const triggerRefresh = () => {
    // 找到页面上的“换一换”按钮并点击
    const btn = document.querySelector('.roll-btn, .change-btn, .exchange-btn, .switch-btn, .feed-roll-btn');
    if (btn) btn.click();
    else console.warn('[回溯] 未找到换一换按钮，无法触发刷新');
  };

  const performRestore = () => {
    if (!state.backtrackPreviousData) return;
    console.log('[回溯] 恢复：触发换一换并替换数据');
    state.pendingRestore = true;
    triggerRefresh();
  };

  const performUndo = () => {
    if (!state.backtrackUndoData) return;
    console.log('[回溯] 撤销：触发换一换并替换数据');
    state.pendingUndo = true;
    triggerRefresh();
  };

  const saveCurrentListManually = () => {
    // 触发一次换一换，然后自动保存（正常逻辑会保存）
    console.log('[回溯] 手动保存：触发换一换来获取最新数据');
    triggerRefresh();
  };

  const enableBacktrack = () => {
    if (!isHomePage()) return;
    hookFetch();
    updateBacktrackButtons();
    console.log('[回溯] 劫持已启用');
  };

  const disableBacktrack = () => {
    window.fetch = state.originalFetch;  // 恢复原始 fetch
    state.backtrackPreviousData = null;
    state.backtrackUndoData = null;
    updateBacktrackButtons();
    console.log('[回溯] 已禁用');
  };

  // ==================== 视频监听 ====================
  const setupVideoListeners = () => {
    const video = document.querySelector('video');
    if (!video || video.dataset.enhancedListeners === 'true') return;
    video.dataset.enhancedListeners = 'true';
    video.addEventListener('loadedmetadata', () => {
      state.isLiveStream = checkIfLiveStream(video);
      if (state.showPlayTime) { state.lastPlayedTimeText = ''; updatePlayTimeDisplay(); }
      if (state.showVideoTitle) { state.lastVideoTitle = ''; updateVideoTitleDisplay(); }
    });
    video.addEventListener('timeupdate', () => { if (state.showPlayTime) updatePlayTimeDisplay(); });
    video.addEventListener('play', () => { if (state.showPlayTime && state.isLiveStream) startUpdateLoop(); });
    video.addEventListener('pause', () => { if (state.isLiveStream && state.animationFrameId) { cancelAnimationFrame(state.animationFrameId); state.animationFrameId = null; } });
  };

  const setupMutationObserver = () => {
    const observer = new MutationObserver(mutations => {
      let videoFound = false;
      for (const mut of mutations) {
        if (mut.type === 'childList') {
          for (const node of mut.addedNodes) {
            if (node.nodeType === 1 && (node.tagName === 'VIDEO' || node.querySelector('video'))) { videoFound = true; break; }
          }
        }
        if (videoFound) break;
      }
      if (videoFound) {
        setTimeout(() => {
          const video = document.querySelector('video');
          if (!video) return;
          delete video.dataset.enhancedListeners;
          setupVideoListeners();
          if (state.showPlayTime && state.playTimeElement) {
            state.playTimeElement.style.display = 'block';
            state.lastPlayedTimeText = '';
            applyStyles(); applyDanmakuAvoid();
          }
          if (state.showSystemTime && state.systemTimeElement) {
            state.systemTimeElement.style.display = 'block';
            applyStyles(); applyDanmakuAvoid();
          }
          if (state.showVideoTitle && state.videoTitleElement) {
            state.videoTitleElement.style.display = 'block';
            state.lastVideoTitle = '';
            applyStyles(); applyDanmakuAvoid();
          }
        }, 1000);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  };

  const setupFullscreenListener = () => {
    const handler = () => {
      const isFS = !!(document.fullscreenElement || document.webkitFullscreenElement);
      const z = isFS ? '2147483647' : '9999';
      if (state.menuElement) state.menuElement.style.zIndex = isFS ? '2147483646' : '10000';
      if (state.settingsElement) state.settingsElement.style.zIndex = isFS ? '2147483647' : '10001';
      [state.playTimeElement, state.systemTimeElement, state.videoTitleElement].forEach(el => { if (el) el.style.zIndex = z; });
    };
    document.addEventListener('fullscreenchange', handler);
    document.addEventListener('webkitfullscreenchange', handler);
  };

  const setupSPANavigationListener = () => {
    let lastType = isHomePage() ? 'home' : isVideoPage() ? 'video' : 'other';
    const check = () => {
      const cur = isHomePage() ? 'home' : isVideoPage() ? 'video' : 'other';
      if (cur !== lastType) {
        lastType = cur;
        updateVideoSwitchesState();
        if (state.refreshBacktrackEnabled) {
          if (cur === 'home') enableBacktrack();
          else disableBacktrack();
        }
        if (cur === 'video') setTimeout(recordCurrentVideo, 1000);
      }
    };
    const origPush = history.pushState;
    history.pushState = function(...args) { origPush.apply(this, args); setTimeout(check, 100); };
    const origReplace = history.replaceState;
    history.replaceState = function(...args) { origReplace.apply(this, args); setTimeout(check, 100); };
    window.addEventListener('popstate', () => setTimeout(check, 100));
    new MutationObserver(() => setTimeout(check, 100)).observe(document.querySelector('title') || document.head, { childList: true });
  };

  // ==================== 初始化 ====================
  const init = () => {
    console.log('Bilibili 增强菜单启动中...');
    loadSettings();
    initTheme();
    createStyles();
    createMenu();
    createSettingsPanel();
    setupMutationObserver();
    setupFullscreenListener();
    setupSPANavigationListener();

    if (isVideoPage()) {
      const tryInitVideo = () => {
        const container = getPlayerContainer();
        if (!container) { setTimeout(tryInitVideo, 2000); return; }
        state.playerContainer = container;
        if (state.showPlayTime) {
          const el = createOrGetDisplayElement('playTimeElement', 'play-time-display');
          el.style.display = 'block';
          applyStyles(); applyDanmakuAvoid();
          updatePlayTimeDisplay(); startUpdateLoop();
        }
        if (state.showSystemTime) {
          const el = createOrGetDisplayElement('systemTimeElement', 'system-time-display');
          el.style.display = 'block';
          applyStyles(); applyDanmakuAvoid();
          updateSystemTimeDisplay();
          state.updateInterval = setInterval(updateSystemTimeDisplay, CONFIG.updateInterval);
        }
        if (state.showVideoTitle) {
          const el = createOrGetDisplayElement('videoTitleElement', 'video-title-display');
          el.style.display = 'block';
          applyStyles(); applyDanmakuAvoid();
          updateVideoTitleDisplay();
          state.titleUpdateInterval = setInterval(updateVideoTitleDisplay, CONFIG.titleRefreshInterval);
        }
        setupVideoListeners();
        recordCurrentVideo();
        console.log('✅ 视频功能已启用');
      };
      setTimeout(tryInitVideo, 500);
    } else {
      updateVideoSwitchesState();
      if (isHomePage() && state.refreshBacktrackEnabled) enableBacktrack();
      console.log('✅ 非视频页初始化完成');
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 1000));
  } else {
    setTimeout(init, 1000);
  }
})();