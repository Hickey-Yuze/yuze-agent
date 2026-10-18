(function() {
  'use strict';

  // ==================== 获取视频元素 ====================
  function getVideo() {
    const wrap = document.querySelector('.bpx-player-video-wrap');
    if (wrap) { const v = wrap.querySelector('video'); if (v) return v; }
    return document.querySelector('video');
  }

  // ==================== 核心：劫持 playbackRate ====================
  let targetRate = 1;
  let hijackedVideo = null;
  let origDescriptor = null;

  function hijackPlaybackRate(video) {
    if (!video || video.__hijacked) return;
    video.__hijacked = true;
    hijackedVideo = video;

    const od = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'playbackRate');
    origDescriptor = od;
    const origSet = od && od.set, origGet = od && od.get;
    Object.defineProperty(video, 'playbackRate', {
      get: function() { return origGet ? origGet.call(this) : 1; },
      set: function(val) {
        if (targetRate > 4 && val <= 4 && val >= 0.5) {
          if (origSet) origSet.call(this, targetRate);
          return;
        }
        if (origSet) origSet.call(this, val);
      },
      configurable: true, enumerable: true
    });
  }

  function unhijackPlaybackRate(video) {
    video = video || hijackedVideo;
    if (!video || !video.__hijacked) return;
    video.__hijacked = false;
    delete video.playbackRate;
    if (origDescriptor) {
      const current = Object.getOwnPropertyDescriptor(video, 'playbackRate');
      if (current) {
        if (origDescriptor.get || origDescriptor.set) {
          Object.defineProperty(video, 'playbackRate', origDescriptor);
        }
      }
    }
    hijackedVideo = null;
    stopGuard();
  }

  function setSpeed(rate, video) {
    video = video || getVideo();
    if (!video) return false;
    rate = Math.min(16, Math.max(0.25, parseFloat(rate) || 1));
    targetRate = rate;
    hijackPlaybackRate(video);
    video.playbackRate = rate;
    try { if (window.player && typeof window.player.setPlaybackRate === 'function') window.player.setPlaybackRate(rate); } catch(e) {}
    if (rate > 4) startGuard(rate, video); else stopGuard();
    return rate;
  }

  let guardTimer = null, guardRate = null, guardVideo = null;
  function startGuard(rate, video) {
    guardRate = rate; guardVideo = video;
    if (guardTimer) return;
    guardTimer = setInterval(() => {
      if (!guardVideo) { stopGuard(); return; }
      if (Math.abs(guardVideo.playbackRate - guardRate) > 0.01) guardVideo.playbackRate = guardRate;
    }, 200);
  }
  function stopGuard() {
    if (guardTimer) { clearInterval(guardTimer); guardTimer = null; }
    guardRate = null; guardVideo = null;
  }

  let videoWatchTimer = null, lastVideoEl = null;
  function watchVideoSwap() {
    if (videoWatchTimer) return;
    videoWatchTimer = setInterval(() => {
      const v = getVideo();
      if (v && v !== lastVideoEl) {
        lastVideoEl = v;
        hijackPlaybackRate(v);
        if (targetRate > 0) v.playbackRate = targetRate;
        if (targetRate > 4) startGuard(targetRate, v);
      }
    }, 1000);
  }
  watchVideoSwap();

  // ==================== 构建 macOS 窗口 ====================
  const presetsList = [1, 1.5, 2, 3, 4, 8, 12, 16];

  function buildMacWindow() {
    const win = document.createElement('div');
    win.id = '__bili_speed_mac';
    // ✅✅✅ 用字符串拼接代替模板字符串，彻底避免 ${r} 被转义
    var presetBtnsHTML = '';
    for (var i = 0; i < presetsList.length; i++) {
      var r = presetsList[i];
      var label = (r % 1 === 0 ? r.toFixed(0) : r.toFixed(1)) + 'x';
      presetBtnsHTML += '<button class="preset" data-rate="' + r + '">' + label + '</button>';
    }
    win.innerHTML = `
      <style>
        #__bili_speed_mac {
          position: fixed; z-index: 99999; top: 100px; right: 24px;
          width: 240px;
          background: rgba(30,30,30,0.84);
          backdrop-filter: saturate(180%) blur(20px);
          -webkit-backdrop-filter: saturate(180%) blur(20px);
          border-radius: 10px;
          box-shadow:
            0 0 0 0.5px rgba(255,255,255,0.10),
            0 10px 36px rgba(0,0,0,0.55),
            0 0 0 1px rgba(0,0,0,0.25);
          color: #f5f5f7;
          font-family: -apple-system, "SF Pro Display", "SF Pro Text", "PingFang SC", "Microsoft YaHei", sans-serif;
          user-select: none; cursor: default;
          transition: border-radius 0.22s ease;
          overflow: hidden;
        }

        /* ===== 折叠态 ===== */
        #__bili_speed_mac.collapsed {
          width: auto !important; height: auto !important;
          border-radius: 24px;
        }
        #__bili_speed_mac.collapsed .mac-body,
        #__bili_speed_mac.collapsed .mac-footer,
        #__bili_speed_mac.collapsed .resize-handle { display: none; }
        #__bili_speed_mac.collapsed .mac-titlebar {
          border-radius: 24px;
          padding: 5px 12px;
          height: auto;
          gap: 8px;
          justify-content: flex-start;
        }
        #__bili_speed_mac.collapsed .mac-titlebar .mac-title-text { display: none; }
        #__bili_speed_mac.collapsed .mac-titlebar .traffic-lights {
          position: static; transform: none; gap: 7px;
        }
        #__bili_speed_mac.collapsed .mac-titlebar .light { width: 11px; height: 11px; }
        #__bili_speed_mac.collapsed .mini-speed-row { display: flex; }

        /* ===== 标题栏 ===== */
        .mac-titlebar {
          height: 40px;
          background: rgba(44,44,46,0.55);
          display: flex; align-items: center; justify-content: center;
          padding: 0 14px; cursor: grab; position: relative;
        }
        .mac-titlebar:active { cursor: grabbing; }
        .mac-titlebar .traffic-lights {
          display: flex; gap: 9px;
          position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
          z-index: 2;
        }
        .mac-titlebar .light {
          width: 14px; height: 14px; border-radius: 50%;
          cursor: pointer; transition: all 0.15s; position: relative;
        }
        .mac-titlebar .light:hover  { filter: brightness(0.78); transform: scale(1.14); }
        .mac-titlebar .light:active { filter: brightness(0.52); transform: scale(0.90); }
        .mac-titlebar .light.red    { background: #ff5f57; }
        .mac-titlebar .light.yellow { background: #febc2e; }
        .mac-titlebar .light.green  { background: #28c840; }
        .mac-titlebar .mac-title-text {
          font-size: 12px; font-weight: 600;
          color: #c7c7cc; letter-spacing: 0.3px;
        }

        /* ===== 折叠态胶囊条里的速度行 ===== */
        .mini-speed-row {
          display: none;
          align-items: center; gap: 6px;
          margin-left: 8px;
        }
        .mini-speed-row .mini-speed {
          font-size: 14px; font-weight: 700; letter-spacing: -0.4px;
          min-width: 36px; text-align: center;
          background: linear-gradient(180deg, #fff 0%, #c2c2c8 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .mini-speed-row .mini-btn {
          width: 22px; height: 22px; border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.14);
          background: rgba(255,255,255,0.06);
          color: #e5e5ea; font-size: 13px; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.12s; font-family: inherit; line-height: 1;
        }
        .mini-speed-row .mini-btn:hover { background: rgba(255,255,255,0.14); color: #fff; }
        .mini-speed-row .mini-btn:active { transform: scale(0.90); }

        /* ===== 主体 ===== */
        .mac-body { padding: 14px 16px 16px; }
        .mac-body .speed-row {
          display: flex; align-items: center; justify-content: center;
          gap: 14px; margin-bottom: 14px;
        }
        .mac-body .speed-btn {
          width: 34px; height: 34px; border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.14);
          background: rgba(255,255,255,0.06);
          color: #e5e5ea; font-size: 17px; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.12s; font-family: inherit; line-height: 1;
        }
        .mac-body .speed-btn:hover  { background: rgba(255,255,255,0.14); color: #fff; }
        .mac-body .speed-btn:active { transform: scale(0.90); background: rgba(255,255,255,0.08); }
        .mac-body .speed-value {
          font-size: 38px; font-weight: 600; letter-spacing: -1.5px;
          min-width: 72px; text-align: center; line-height: 1;
          background: linear-gradient(180deg, #ffffff 0%, #c2c2c8 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .mac-body .presets {
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;
        }
        .mac-body .preset {
          padding: 8px 0; border-radius: 6px; border: none;
          background: rgba(255,255,255,0.06);
          color: #c9c9ce; font-size: 12px; font-weight: 500;
          cursor: pointer; text-align: center;
          transition: all 0.12s; font-family: inherit; letter-spacing: 0.2px;
        }
        .mac-body .preset:hover {
          background: rgba(255,255,255,0.12); color: #fff;
          transform: translateY(-1px);
        }
        .mac-body .preset:active { transform: scale(0.95); }
        .mac-body .preset.active {
          background: rgba(10,132,255,0.28); color: #0a84ff; font-weight: 600;
        }

        .mac-footer {
          padding: 9px 16px 11px;
          border-top: 1px solid rgba(255,255,255,0.06);
          font-size: 10px; color: #636366; text-align: center;
          letter-spacing: 0.3px;
        }
        .mac-footer kbd {
          display: inline-block; padding: 1px 5px; margin: 0 2px;
          background: rgba(255,255,255,0.07); border-radius: 4px;
          font-family: "SF Mono", "Monaco", "Menlo", monospace;
          font-size: 10px; color: #8e8e93;
        }

        /* ===== 拉伸手柄 ===== */
        .resize-handle { position: absolute; z-index: 10; }
        .resize-handle.n  { top: 0;    left: 12px; right: 12px; height: 5px; cursor: n-resize;  }
        .resize-handle.s  { bottom: 0; left: 12px; right: 12px; height: 5px; cursor: s-resize;  }
        .resize-handle.w  { left: 0;   top: 12px; bottom: 12px; width: 5px; cursor: w-resize;  }
        .resize-handle.e  { right: 0;  top: 12px; bottom: 12px; width: 5px; cursor: e-resize;  }
        .resize-handle.nw { top: 0;    left: 0;    width: 10px; height: 10px; cursor: nw-resize; }
        .resize-handle.ne { top: 0;    right: 0;   width: 10px; height: 10px; cursor: ne-resize; }
        .resize-handle.sw { bottom: 0; left: 0;    width: 10px; height: 10px; cursor: sw-resize; }
        .resize-handle.se { bottom: 0; right: 0;   width: 10px; height: 10px; cursor: se-resize; }
      </style>

      <div class="mac-titlebar" id="mac-drag">
        <div class="traffic-lights">
          <span class="light red" id="mac-red" title="关闭"></span>
          <span class="light yellow" id="mac-yellow" title="收起"></span>
          <span class="light green" id="mac-green" title="展开"></span>
        </div>
        <span class="mac-title-text">速度控制</span>
        <span class="mini-speed-row" id="mini-speed-row">
          <button class="mini-btn" id="mini-down" title="减速">&minus;</button>
          <span class="mini-speed" id="mini-label">1.0x</span>
          <button class="mini-btn" id="mini-up" title="加速">+</button>
        </span>
      </div>

      <div class="mac-body">
        <div class="speed-row">
          <button class="speed-btn" id="mac-down" title="减速 (&minus;)">&minus;</button>
          <span class="speed-value" id="mac-label">1.0x</span>
          <button class="speed-btn" id="mac-up" title="加速 (=)">+</button>
        </div>
        <div class="presets" id="mac-presets">` + presetBtnsHTML + `</div>
      </div>
      <div class="mac-footer">
        键盘 <kbd>=</kbd> 加速 &middot; <kbd>&minus;</kbd> 减速 &middot; <kbd>0</kbd> 重置 &middot; <kbd>1-9</kbd> 切换
      </div>

      <div class="resize-handle n" id="rh-n"></div>
      <div class="resize-handle s" id="rh-s"></div>
      <div class="resize-handle w" id="rh-w"></div>
      <div class="resize-handle e" id="rh-e"></div>
      <div class="resize-handle nw" id="rh-nw"></div>
      <div class="resize-handle ne" id="rh-ne"></div>
      <div class="resize-handle sw" id="rh-sw"></div>
      <div class="resize-handle se" id="rh-se"></div>
    `;
    document.body.appendChild(win);
    return win;
  }

  // ==================== 窗口逻辑 ====================
  let collapsed = false;
  let closed = false;
  let lastSpeed = null;
  let updateTimer = null;
  const win = buildMacWindow();

  const el = {
    root:    win,
    drag:    win.querySelector('#mac-drag'),
    label:   win.querySelector('#mac-label'),
    miniLabel: win.querySelector('#mini-label'),
    downBtn: win.querySelector('#mac-down'),
    upBtn:   win.querySelector('#mac-up'),
    miniDown: win.querySelector('#mini-down'),
    miniUp:   win.querySelector('#mini-up'),
    redLight:    win.querySelector('#mac-red'),
    yellowLight: win.querySelector('#mac-yellow'),
    greenLight:  win.querySelector('#mac-green'),
    presetsContainer: win.querySelector('#mac-presets'),
    rh: {
      n:  win.querySelector('#rh-n'),
      s:  win.querySelector('#rh-s'),
      w:  win.querySelector('#rh-w'),
      e:  win.querySelector('#rh-e'),
      nw: win.querySelector('#rh-nw'),
      ne: win.querySelector('#rh-ne'),
      sw: win.querySelector('#rh-sw'),
      se: win.querySelector('#rh-se'),
    }
  };

  const MIN_W = 180, MIN_H = 140;
  const DEFAULT_W = 240;

  function doAdjust(dir, step) {
    step = step || 0.5;
    const v = getVideo();
    if (!v) return;
    const r = setSpeed(dir === 'up'
      ? Math.min(16, v.playbackRate + step)
      : Math.max(0.25, v.playbackRate - step), v);
    updateUI(r);
  }

  el.presetsContainer.addEventListener('click', function(e) {
    const btn = e.target.closest('.preset');
    if (!btn) return;
    const rate = parseFloat(btn.dataset.rate);
    if (!isNaN(rate)) { setSpeed(rate); updateUI(rate); }
    e.stopPropagation();
  });

  el.downBtn.addEventListener('click', e => { e.stopPropagation(); doAdjust('down'); });
  el.upBtn.addEventListener('click',   e => { e.stopPropagation(); doAdjust('up'); });
  el.miniDown.addEventListener('click', e => { e.stopPropagation(); doAdjust('down'); });
  el.miniUp.addEventListener('click',   e => { e.stopPropagation(); doAdjust('up'); });

  el.redLight.addEventListener('click', e => {
    e.stopPropagation();
    const v = getVideo();
    if (v) {
      targetRate = 1;
      unhijackPlaybackRate(v);
      v.playbackRate = 1;
      try { if (window.player && typeof window.player.setPlaybackRate === 'function') window.player.setPlaybackRate(1); } catch(e) {}
    }
    closed = true;
    el.root.style.display = 'none';
    console.log('🔴 面板已关闭，倍速已恢复为 1x。输入 __bili_speed_show() 重新打开');
  });

  el.yellowLight.addEventListener('click', e => {
    e.stopPropagation();
    collapsed = !collapsed;
    el.root.classList.toggle('collapsed', collapsed);
  });

  el.greenLight.addEventListener('click', e => {
    e.stopPropagation();
    if (closed) {
      closed = false;
      el.root.style.display = '';
      const v = getVideo();
      if (v) {
        hijackPlaybackRate(v);
        targetRate = 1;
        v.playbackRate = 1;
      }
    }
    if (collapsed) { collapsed = false; el.root.classList.remove('collapsed'); }
    el.root.style.width = DEFAULT_W + 'px';
    el.root.style.height = 'auto';
    constrainToViewport();
  });

  // ==================== 拖拽 ====================
  let dragging = false, dsx, dsy, dil, dit;
  el.drag.addEventListener('mousedown', function(e) {
    if (e.target.closest('.light') || e.target.closest('.mini-btn')) return;
    dragging = true; dsx = e.clientX; dsy = e.clientY;
    const r = el.root.getBoundingClientRect();
    dil = r.left; dit = r.top;
    el.root.style.transition = 'none';
    e.preventDefault();
  });
  document.addEventListener('mousemove', function(e) {
    if (!dragging) return;
    let l = dil + (e.clientX - dsx), t = dit + (e.clientY - dsy);
    l = Math.max(0, Math.min(window.innerWidth - el.root.offsetWidth, l));
    t = Math.max(0, Math.min(window.innerHeight - el.root.offsetHeight, t));
    el.root.style.left = l + 'px';
    el.root.style.top  = t + 'px';
    el.root.style.right = 'auto';
  });
  document.addEventListener('mouseup', function() {
    if (dragging) { dragging = false; el.root.style.transition = ''; }
  });

  // ==================== 拉伸 ====================
  let resizing = false, rd = '', rsx, rsy, rw, rh, rl, rt;

  function startResize(dir, e) {
    if (collapsed) return;
    resizing = true; rd = dir;
    rsx = e.clientX; rsy = e.clientY;
    const rect = el.root.getBoundingClientRect();
    rw = rect.width; rh = rect.height; rl = rect.left; rt = rect.top;
    el.root.style.transition = 'none';
    e.preventDefault(); e.stopPropagation();
  }

  const dirs = ['n','s','w','e','nw','ne','sw','se'];
  dirs.forEach(d => {
    el.rh[d].addEventListener('mousedown', e => startResize(d, e));
  });

  document.addEventListener('mousemove', function(e) {
    if (!resizing) return;
    const dx = e.clientX - rsx, dy = e.clientY - rsy;
    let nw = rw, nh = rh, nl = rl, nt = rt;

    if (rd.includes('e')) nw = Math.max(MIN_W, rw + dx);
    if (rd.includes('w')) { nw = Math.max(MIN_W, rw - dx); nl = rl + (rw - nw); }
    if (rd.includes('s')) nh = Math.max(MIN_H, rh + dy);
    if (rd.includes('n')) { nh = Math.max(MIN_H, rh - dy); nt = rt + (rh - nh); }

    nl = Math.max(0, Math.min(window.innerWidth - nw, nl));
    nt = Math.max(0, Math.min(window.innerHeight - nh, nt));

    el.root.style.width  = nw + 'px';
    el.root.style.height = nh + 'px';
    el.root.style.left   = nl + 'px';
    el.root.style.top    = nt + 'px';
    el.root.style.right  = 'auto';
  });

  document.addEventListener('mouseup', function() {
    if (resizing) { resizing = false; el.root.style.transition = ''; }
  });

  function constrainToViewport() {
    const rect = el.root.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      el.root.style.right = '24px';
      el.root.style.left = 'auto';
    }
    if (rect.bottom > window.innerHeight) {
      el.root.style.top = Math.max(0, window.innerHeight - rect.height - 24) + 'px';
    }
    if (rect.top < 0) el.root.style.top = '0px';
  }

  // ==================== UI 更新 ====================
  function updateUI(speed) {
    speed = speed || (getVideo() && getVideo().playbackRate) || 1;
    if (Math.abs(speed - lastSpeed) < 0.005) return;
    lastSpeed = speed;
    const txt = (speed % 1 === 0 ? speed.toFixed(0) : speed.toFixed(1)) + 'x';
    el.label.textContent = txt;
    el.miniLabel.textContent = txt;
    const presets = el.presetsContainer.querySelectorAll('.preset');
    presets.forEach(b => {
      const r = parseFloat(b.dataset.rate);
      b.classList.toggle('active', Math.abs(r - speed) < 0.05);
    });
  }

  function startUpdateLoop() {
    if (updateTimer) return;
    updateTimer = setInterval(() => {
      if (closed) return;
      const v = getVideo();
      if (v && !v.__hijacked) hijackPlaybackRate(v);
      if (v) updateUI(v.playbackRate);
    }, 500);
  }
  startUpdateLoop();
  setTimeout(() => {
    const v = getVideo();
    if (v) { hijackPlaybackRate(v); updateUI(v.playbackRate); }
  }, 800);

  // ==================== 键盘快捷键 ====================
  function isEditing() {
    const tag = document.activeElement && document.activeElement.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || (document.activeElement && document.activeElement.isContentEditable);
  }
  document.addEventListener('keydown', function(e) {
    if (isEditing() || e.ctrlKey || e.altKey || e.metaKey) return;
    const v = getVideo();
    if (!v) return;
    if (e.key === '=' || e.key === '+') {
      e.preventDefault();
      const r = setSpeed(Math.min(16, v.playbackRate + 0.5), v); updateUI(r);
    }
    if (e.key === '-' && !e.shiftKey) {
      e.preventDefault();
      const r = setSpeed(Math.max(0.25, v.playbackRate - 0.5), v); updateUI(r);
    }
    if (e.key === '0' && !e.shiftKey) {
      e.preventDefault(); const r = setSpeed(1, v); updateUI(r);
    }
    const num = parseInt(e.key);
    if (num >= 1 && num <= 9 && !e.shiftKey) {
      e.preventDefault(); const r = setSpeed(num, v); updateUI(r);
    }
  });

  // ==================== 全局接口 ====================
  window.__bili_speed_show = () => {
    closed = false;
    el.root.style.display = '';
    const v = getVideo();
    if (v) {
      hijackPlaybackRate(v);
      targetRate = 1;
      v.playbackRate = 1;
      updateUI(1);
    }
  };
  window.__bili_speed_hide = () => {
    const v = getVideo();
    if (v) {
      targetRate = 1;
      unhijackPlaybackRate(v);
      v.playbackRate = 1;
    }
    closed = true;
    el.root.style.display = 'none';
  };
  window.__bili_speed_set = r => { const v=getVideo(); if(v) { const rt=setSpeed(r,v); updateUI(rt); } };

  window.speed = {
    set:    r  => { const v=getVideo(); if(v) { const rt=setSpeed(r,v); updateUI(rt); } },
    get:    () => getVideo() ? getVideo().playbackRate : null,
    show:   () => { const v=getVideo(); console.log(v ? '🎬 当前速度：' + v.playbackRate + 'x' : '⚠️ 无法找到视频'); },
    up:     s  => { const v=getVideo(); if(v) { const rt=setSpeed(Math.min(16, v.playbackRate+(s||0.5)), v); updateUI(rt); } },
    down:   s  => { const v=getVideo(); if(v) { const rt=setSpeed(Math.max(0.25, v.playbackRate-(s||0.5)), v); updateUI(rt); } },
    reset:  () => { const v=getVideo(); if(v) { const rt=setSpeed(1, v); updateUI(rt); } },
  };

  console.log('🖥️  macOS 速度控制器 v3.2 已就绪');
  console.log('  🔴 关闭 → 恢复 1x 并取消劫持');
  console.log('  🟡 收起  |  🟢 展开');
  console.log('  📐 拖拽四边/四角可自由拉伸窗口');
  console.log('  💊 收起后保留速度显示和 +/- 按钮');
  console.log('  ⌨️  = 加速 · - 减速 · 0 重置 · 1-9 切换');
})();