(function() {
  if (window.__brightnessControllerLoaded) return;
  window.__brightnessControllerLoaded = true;

  const STORAGE_KEY = '__brightness_ctrl_settings';
  const MODES = {
    normal:   { brightness: 100, sepia: 0,  saturate: 100 },
    eyecare:  { brightness: 70,  sepia: 30, saturate: 90  },
    superEye: { brightness: 50,  sepia: 50, saturate: 80  }
  };

  function loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch(e) {}
    return { mode: 'normal', brightness: 100, sepia: 0, saturate: 100 };
  }

  function saveSettings(settings) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch(e) {}
  }

  function applyFilter(settings) {
    let el = document.getElementById('__brightness_overlay');
    if (!el) {
      el = document.createElement('div');
      el.id = '__brightness_overlay';
      el.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:2147483646;transition:all .3s ease;';
      document.documentElement.appendChild(el);
    }
    const darkness = Math.max(0, 1 - settings.brightness / 100);
    const s = settings.saturate / 100;
    const sepia = settings.sepia / 100;
    el.style.background = `rgba(0,0,0,${darkness})`;
    el.style.filter = `saturate(${s}) sepia(${sepia})`;
  }

  let panelVisible = false;
  let panel = null;

  function createPanel() {
    const settings = loadSettings();

    panel = document.createElement('div');
    panel.id = '__brightness_panel';
    panel.classList.add('minimized');

    panel.innerHTML = `
      <style>
        #__brightness_panel {
          position: fixed; top: 80px; right: 20px; z-index: 2147483647;
          width: 260px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background: rgba(30, 30, 40, 0.95); backdrop-filter: blur(12px);
          border-radius: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.4);
          color: #e0e0e0; font-size: 13px; user-select: none;
          transition: transform .3s ease, opacity .3s ease;
        }
        #__brightness_panel.minimized {
          transform: scale(0.1); opacity: 0; pointer-events: none;
        }
        #__brightness_panel * { box-sizing: border-box; margin: 0; padding: 0; }
        .bp-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.08);
          cursor: move;
        }
        .bp-header span { font-weight: 600; font-size: 14px; letter-spacing: .3px; }
        .bp-header-btns { display: flex; gap: 6px; }
        .bp-header-btns button {
          width: 26px; height: 26px; border: none; border-radius: 8px;
          background: rgba(255,255,255,0.08); color: #ccc; cursor: pointer;
          font-size: 14px; display: flex; align-items: center; justify-content: center;
          transition: background .2s;
        }
        .bp-header-btns button:hover { background: rgba(255,255,255,0.15); }
        .bp-body { padding: 14px 16px; display: flex; flex-direction: column; gap: 14px; }
        .bp-section-label {
          font-size: 11px; color: #999; text-transform: uppercase;
          letter-spacing: .8px; margin-bottom: -6px;
        }
        .bp-slider-row { display: flex; align-items: center; gap: 10px; }
        .bp-slider-row input[type=range] {
          flex: 1; -webkit-appearance: none; height: 6px; border-radius: 3px;
          background: rgba(255,255,255,0.15); outline: none;
        }
        .bp-slider-row input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%;
          background: #6c9fff; cursor: pointer; box-shadow: 0 2px 6px rgba(108,159,255,0.4);
          transition: transform .15s;
        }
        .bp-slider-row input[type=range]::-webkit-slider-thumb:hover { transform: scale(1.15); }
        .bp-slider-val {
          min-width: 38px; text-align: center; font-weight: 600;
          font-size: 13px; color: #6c9fff;
        }
        .bp-mode-btns { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .bp-mode-btn {
          padding: 10px 8px; border: 1px solid rgba(255,255,255,0.1); border-radius: 10px;
          background: rgba(255,255,255,0.04); color: #ccc; cursor: pointer;
          font-size: 12px; font-weight: 500; text-align: center;
          transition: all .2s; line-height: 1.4;
        }
        .bp-mode-btn:hover {
          background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.18);
        }
        .bp-mode-btn.active {
          background: rgba(108,159,255,0.15); border-color: rgba(108,159,255,0.4);
          color: #6c9fff;
        }
        .bp-mode-btn.full-width { grid-column: 1 / -1; }
        .bp-status {
          text-align: center; font-size: 11px; color: #666;
          padding: 8px 0 4px; border-top: 1px solid rgba(255,255,255,0.05);
        }
        .bp-shortcut {
          display: inline-block; background: rgba(108,159,255,0.15);
          color: #6c9fff; padding: 1px 6px; border-radius: 4px;
          font-size: 10px; font-weight: 600; margin-left: 4px;
        }
      </style>
      <div class="bp-header">
        <span>🔆 亮度控制</span>
        <div class="bp-header-btns">
          <button id="bp_close" title="关闭面板（+键）">✕</button>
        </div>
      </div>
      <div class="bp-body">
        <div class="bp-section-label">亮度调节</div>
        <div class="bp-slider-row">
          <input type="range" id="bp_brightness" min="20" max="100" value="${settings.brightness}">
          <span class="bp-slider-val" id="bp_bval">${settings.brightness}%</span>
        </div>

        <div class="bp-section-label">色温调节</div>
        <div class="bp-slider-row">
          <input type="range" id="bp_sepia" min="0" max="80" value="${settings.sepia}">
          <span class="bp-slider-val" id="bp_sval">${settings.sepia}%</span>
        </div>

        <div class="bp-section-label">饱和度</div>
        <div class="bp-slider-row">
          <input type="range" id="bp_saturate" min="20" max="100" value="${settings.saturate}">
          <span class="bp-slider-val" id="bp_satval">${settings.saturate}%</span>
        </div>

        <div class="bp-section-label">快捷模式</div>
        <div class="bp-mode-btns">
          <button class="bp-mode-btn${settings.mode === 'normal' ? ' active' : ''}" data-mode="normal">☀️ 正常</button>
          <button class="bp-mode-btn${settings.mode === 'eyecare' ? ' active' : ''}" data-mode="eyecare">🌿 护眼</button>
          <button class="bp-mode-btn full-width${settings.mode === 'superEye' ? ' active' : ''}" data-mode="superEye">🌙 超级护眼</button>
        </div>
      </div>
      <div class="bp-status">
        设置自动保存 · 所有页面生效<br>
        按 <span class="bp-shortcut">+</span> 键打开/关闭
      </div>
    `;

    document.documentElement.appendChild(panel);

    // 仍然自动应用上次的亮度滤镜（只是面板不显示）
    applyFilter(settings);

    // --- Bindings ---
    const $ = id => document.getElementById(id);
    const brightnessSlider = $('bp_brightness');
    const sepiaSlider = $('bp_sepia');
    const saturateSlider = $('bp_saturate');
    const bvalEl = $('bp_bval');
    const svalEl = $('bp_sval');
    const satvalEl = $('bp_satval');
    const modeBtns = panel.querySelectorAll('.bp-mode-btn');

    function getCurrentSettings() {
      return {
        mode: panel.querySelector('.bp-mode-btn.active')?.dataset.mode || 'custom',
        brightness: parseInt(brightnessSlider.value),
        sepia: parseInt(sepiaSlider.value),
        saturate: parseInt(saturateSlider.value)
      };
    }

    function updateAndSave() {
      const s = getCurrentSettings();
      applyFilter(s);
      saveSettings(s);
    }

    function activateMode(mode) {
      const preset = MODES[mode];
      if (!preset) return;
      brightnessSlider.value = preset.brightness;
      sepiaSlider.value = preset.sepia;
      saturateSlider.value = preset.saturate;
      bvalEl.textContent = preset.brightness + '%';
      svalEl.textContent = preset.sepia + '%';
      satvalEl.textContent = preset.saturate + '%';
      modeBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
      });
      updateAndSave();
    }

    function setCustomMode() {
      modeBtns.forEach(btn => btn.classList.remove('active'));
    }

    brightnessSlider.addEventListener('input', () => {
      bvalEl.textContent = brightnessSlider.value + '%';
      setCustomMode();
      updateAndSave();
    });
    sepiaSlider.addEventListener('input', () => {
      svalEl.textContent = sepiaSlider.value + '%';
      setCustomMode();
      updateAndSave();
    });
    saturateSlider.addEventListener('input', () => {
      satvalEl.textContent = saturateSlider.value + '%';
      setCustomMode();
      updateAndSave();
    });

    modeBtns.forEach(btn => {
      btn.addEventListener('click', () => activateMode(btn.dataset.mode));
    });

    // Close button
    $('bp_close').addEventListener('click', hidePanel);

    // Drag support
    let dragging = false, dragX = 0, dragY = 0;
    const header = panel.querySelector('.bp-header');
    header.addEventListener('mousedown', e => {
      if (e.target.tagName === 'BUTTON') return;
      dragging = true;
      dragX = e.clientX - panel.offsetLeft;
      dragY = e.clientY - panel.offsetTop;
      e.preventDefault();
    });
    document.addEventListener('mousemove', e => {
      if (!dragging) return;
      panel.style.left = (e.clientX - dragX) + 'px';
      panel.style.top = (e.clientY - dragY) + 'px';
      panel.style.right = 'auto';
    });
    document.addEventListener('mouseup', () => { dragging = false; });
  }

  function showPanel() {
    if (!panel) createPanel();
    panel.classList.remove('minimized');
    panelVisible = true;
  }

  function hidePanel() {
    if (!panel) return;
    panel.classList.add('minimized');
    panelVisible = false;
  }

  function togglePanel() {
    if (panelVisible) { hidePanel(); } else { showPanel(); }
  }

  // 页面加载时：仅应用滤镜，不显示面板
  const initialSettings = loadSettings();
  applyFilter(initialSettings);

  // + 键监听：唯一的面板开关方式
  document.addEventListener('keydown', (e) => {
    if (e.key === '+' || e.key === '=' || e.code === 'NumpadAdd') {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable) return;
      e.preventDefault();
      togglePanel();
    }
  });

  // 暴露全局接口
  window.__brightnessToggle = togglePanel;
})();