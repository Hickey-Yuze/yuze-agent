/**
 * 通用视频网站倍速播放脚本
 * 适用于：大多数使用 HTML5 <video> 的网站
 * 使用方式：由执行平台自动调用 run(args)
 */

async function run(args) {
  const DEFAULT_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];
  const MAX_CUSTOM_SPEED = 16;
  const MIN_SPEED = 0.1;
  const PANEL_ID = 'universal-video-speed-control-panel';

  function clampSpeed(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return NaN;
    return Math.max(MIN_SPEED, Math.min(MAX_CUSTOM_SPEED, n));
  }

  function safeQueryAll(root, selector) {
    try {
      return Array.from(root.querySelectorAll(selector));
    } catch {
      return [];
    }
  }

  function getVideoKey(video) {
    if (!video) return '';
    return [
      video.currentSrc,
      video.src,
      video.getAttribute?.('src'),
      video.dataset?.src,
      video.ownerDocument?.location?.href
    ].filter(Boolean).join('|');
  }

  function getVideoScore(video) {
    if (!video) return -1;

    const rect = video.getBoundingClientRect?.();
    const area = rect ? rect.width * rect.height : 0;

    let score = area;

    if (video.readyState > 0) score += 100000;
    if (!video.paused) score += 50000;
    if (video.currentSrc || video.src) score += 20000;
    if (video.controls) score += 5000;

    const style = video.ownerDocument?.defaultView?.getComputedStyle?.(video);
    if (style) {
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) {
        score -= 1000000;
      }
    }

    return score;
  }

  function collectVideosFromRoot(root, visitedRoots = new Set(), videos = []) {
    if (!root || visitedRoots.has(root)) return videos;
    visitedRoots.add(root);

    safeQueryAll(root, 'video').forEach(video => {
      if (!videos.includes(video)) {
        videos.push(video);
      }
    });

    safeQueryAll(root, '*').forEach(el => {
      if (el.shadowRoot) {
        collectVideosFromRoot(el.shadowRoot, visitedRoots, videos);
      }
    });

    safeQueryAll(root, 'iframe').forEach(iframe => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc) {
          collectVideosFromRoot(doc, visitedRoots, videos);
        }
      } catch {
        // 跨域 iframe 无法访问，这是浏览器安全限制
      }
    });

    return videos;
  }

  function findVideo() {
    const videos = collectVideosFromRoot(document);

    if (!videos.length) return null;

    return videos
      .filter(video => video instanceof HTMLVideoElement)
      .sort((a, b) => getVideoScore(b) - getVideoScore(a))[0] || null;
  }

  const existingPanel = document.getElementById(PANEL_ID);
  if (existingPanel) {
    existingPanel._cleanup?.();
    existingPanel.remove();
  }

  let activeVideo = findVideo();

  if (!activeVideo) {
    return {
      ok: false,
      summary: '未找到可控制的视频元素',
      warnings: [
        '请确认页面已加载完成',
        '该网站可能使用跨域 iframe、封闭 Shadow DOM、Canvas 渲染或非标准播放器'
      ]
    };
  }

  let desiredRate = clampSpeed(activeVideo.playbackRate || 1);
  let lastVideoKey = getVideoKey(activeVideo);
  let cleanupActiveVideoListeners = () => {};
  let scanInterval = null;
  let keepRateInterval = null;

  const panel = document.createElement('div');
  panel.id = PANEL_ID;

  Object.assign(panel.style, {
    position: 'fixed',
    top: '10px',
    right: '10px',
    zIndex: '2147483647',
    background: 'rgba(33, 33, 42, 0.95)',
    color: '#e0e0e0',
    padding: '14px 18px',
    borderRadius: '12px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: '13px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)',
    border: '1px solid rgba(100, 180, 255, 0.3)',
    minWidth: '250px',
    maxWidth: '300px',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)'
  });

  const header = document.createElement('div');
  Object.assign(header.style, {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    paddingBottom: '8px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    cursor: 'grab'
  });

  const title = document.createElement('span');
  title.textContent = '⚡ 视频倍速控制';
  Object.assign(title.style, {
    fontWeight: 'bold',
    fontSize: '15px',
    color: '#64b4ff'
  });

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  Object.assign(closeBtn.style, {
    background: 'none',
    border: 'none',
    color: '#999',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '2px 6px'
  });

  closeBtn.onclick = () => {
    panel._cleanup?.();
    panel.remove();
  };

  header.appendChild(title);
  header.appendChild(closeBtn);

  const currentSpeedEl = document.createElement('div');
  Object.assign(currentSpeedEl.style, {
    marginBottom: '6px',
    fontSize: '14px',
    color: '#ffd54f',
    fontWeight: '600'
  });

  const targetInfoEl = document.createElement('div');
  Object.assign(targetInfoEl.style, {
    marginBottom: '10px',
    fontSize: '11px',
    color: '#aaa',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  });

  const customDiv = document.createElement('div');
  Object.assign(customDiv.style, {
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  });

  const inputLabel = document.createElement('span');
  inputLabel.textContent = '自定义:';

  const speedInput = document.createElement('input');
  speedInput.type = 'number';
  speedInput.value = desiredRate.toFixed(2);
  speedInput.min = String(MIN_SPEED);
  speedInput.max = String(MAX_CUSTOM_SPEED);
  speedInput.step = '0.25';

  Object.assign(speedInput.style, {
    width: '70px',
    padding: '5px 8px',
    border: '1px solid rgba(100, 180, 255, 0.4)',
    borderRadius: '6px',
    background: 'rgba(255,255,255,0.08)',
    color: '#fff',
    fontSize: '13px',
    outline: 'none'
  });

  const applyBtn = document.createElement('button');
  applyBtn.textContent = '应用';

  Object.assign(applyBtn.style, {
    padding: '5px 12px',
    border: 'none',
    borderRadius: '6px',
    background: 'linear-gradient(135deg, #64b4ff, #4a9eff)',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600'
  });

  customDiv.appendChild(inputLabel);
  customDiv.appendChild(speedInput);
  customDiv.appendChild(applyBtn);

  const presetArea = document.createElement('div');
  Object.assign(presetArea.style, {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginBottom: '10px'
  });

  const presetButtons = [];

  function updateButtonStyle(btn, speed) {
    const isActive = activeVideo && Math.abs(activeVideo.playbackRate - speed) < 0.01;

    if (isActive) {
      Object.assign(btn.style, {
        background: 'rgba(100, 180, 255, 0.35)',
        borderColor: '#64b4ff',
        color: '#64b4ff',
        fontWeight: '700'
      });
    } else {
      Object.assign(btn.style, {
        background: 'rgba(255,255,255,0.06)',
        borderColor: 'rgba(255,255,255,0.15)',
        color: '#ccc',
        fontWeight: 'normal'
      });
    }
  }

  function updateButtonStates() {
    presetButtons.forEach(({ btn, speed }) => updateButtonStyle(btn, speed));
  }

  function syncUI() {
    if (!activeVideo) return;

    const rate = Number(activeVideo.playbackRate) || desiredRate;
    const docUrl = activeVideo.ownerDocument?.location?.hostname || location.hostname;

    currentSpeedEl.textContent = `当前：${rate.toFixed(2)}x`;
    targetInfoEl.textContent = `目标视频：${docUrl}`;
    speedInput.value = rate.toFixed(2);

    updateButtonStates();
  }

  function setSpeed(rate, options = {}) {
    const { updateDesired = true, showFeedback = false } = options;
    const nextRate = clampSpeed(rate);

    if (!Number.isFinite(nextRate)) return false;
    if (!activeVideo) return false;

    if (updateDesired) {
      desiredRate = nextRate;
    }

    try {
      activeVideo.playbackRate = nextRate;
    } catch {
      return false;
    }

    syncUI();

    if (showFeedback) {
      applyBtn.style.background = 'linear-gradient(135deg, #69f0ae, #00e676)';
      applyBtn.textContent = '✓ 已设置';

      setTimeout(() => {
        applyBtn.style.background = 'linear-gradient(135deg, #64b4ff, #4a9eff)';
        applyBtn.textContent = '应用';
      }, 800);
    }

    return true;
  }

  function flashInputError() {
    speedInput.style.borderColor = '#ff5252';

    setTimeout(() => {
      speedInput.style.borderColor = 'rgba(100, 180, 255, 0.4)';
    }, 800);
  }

  function applyCustomSpeed() {
    const val = parseFloat(speedInput.value);

    if (!Number.isFinite(val) || val < MIN_SPEED || val > MAX_CUSTOM_SPEED) {
      flashInputError();
      return;
    }

    setSpeed(val, {
      updateDesired: true,
      showFeedback: true
    });
  }

  applyBtn.onclick = applyCustomSpeed;

  speedInput.onkeydown = e => {
    if (e.key === 'Enter') {
      applyCustomSpeed();
    }
  };

  DEFAULT_SPEEDS.forEach(speed => {
    const btn = document.createElement('button');
    btn.textContent = `${speed}x`;
    btn.dataset.speed = String(speed);

    Object.assign(btn.style, {
      padding: '4px 10px',
      border: '1px solid rgba(255,255,255,0.15)',
      borderRadius: '6px',
      background: 'rgba(255,255,255,0.06)',
      color: '#ccc',
      cursor: 'pointer',
      fontSize: '12px',
      transition: 'all 0.2s ease'
    });

    btn.onmouseenter = () => {
      btn.style.background = 'rgba(100, 180, 255, 0.25)';
      btn.style.color = '#fff';
    };

    btn.onmouseleave = () => {
      updateButtonStyle(btn, speed);
    };

    btn.onclick = () => {
      setSpeed(speed, {
        updateDesired: true
      });
    };

    presetButtons.push({ btn, speed });
    presetArea.appendChild(btn);
  });

  const quickRow = document.createElement('div');
  Object.assign(quickRow.style, {
    display: 'flex',
    gap: '6px',
    paddingTop: '8px',
    borderTop: '1px solid rgba(255,255,255,0.08)'
  });

  const quickActions = [
    { label: '+0.25', type: 'plus' },
    { label: '-0.25', type: 'minus' },
    { label: '重置', type: 'reset' },
    { label: '重扫', type: 'rescan' }
  ];

  quickActions.forEach(action => {
    const qbtn = document.createElement('button');
    qbtn.textContent = action.label;

    Object.assign(qbtn.style, {
      flex: '1',
      padding: '5px 0',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: '5px',
      background: 'rgba(255,255,255,0.05)',
      color: '#aaa',
      cursor: 'pointer',
      fontSize: '11px'
    });

    qbtn.onmouseenter = () => {
      qbtn.style.background = 'rgba(255,255,255,0.12)';
      qbtn.style.color = '#ddd';
    };

    qbtn.onmouseleave = () => {
      qbtn.style.background = 'rgba(255,255,255,0.05)';
      qbtn.style.color = '#aaa';
    };

    qbtn.onclick = () => {
      if (action.type === 'reset') {
        setSpeed(1, {
          updateDesired: true
        });
      } else if (action.type === 'plus') {
        setSpeed((activeVideo?.playbackRate || desiredRate) + 0.25, {
          updateDesired: true
        });
      } else if (action.type === 'minus') {
        setSpeed((activeVideo?.playbackRate || desiredRate) - 0.25, {
          updateDesired: true
        });
      } else if (action.type === 'rescan') {
        const found = findVideo();

        if (found) {
          switchVideo(found);
          setSpeed(desiredRate, {
            updateDesired: false,
            showFeedback: true
          });
        }
      }
    };

    quickRow.appendChild(qbtn);
  });

  function reapplyDesiredSpeed() {
    if (!activeVideo) return;

    setTimeout(() => {
      if (activeVideo && Math.abs(activeVideo.playbackRate - desiredRate) > 0.01) {
        setSpeed(desiredRate, {
          updateDesired: false
        });
      }
    }, 80);

    setTimeout(() => {
      if (activeVideo && Math.abs(activeVideo.playbackRate - desiredRate) > 0.01) {
        setSpeed(desiredRate, {
          updateDesired: false
        });
      }
    }, 500);
  }

  function bindVideoEvents(video) {
    cleanupActiveVideoListeners();

    if (!video) return;

    const onLoadedMetadata = () => reapplyDesiredSpeed();
    const onCanPlay = () => reapplyDesiredSpeed();
    const onRateChange = () => syncUI();

    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('ratechange', onRateChange);

    cleanupActiveVideoListeners = () => {
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('ratechange', onRateChange);
    };
  }

  function switchVideo(video) {
    if (!video) return false;

    activeVideo = video;
    lastVideoKey = getVideoKey(video);

    bindVideoEvents(activeVideo);
    syncUI();

    return true;
  }

  panel.appendChild(header);
  panel.appendChild(currentSpeedEl);
  panel.appendChild(targetInfoEl);
  panel.appendChild(customDiv);
  panel.appendChild(presetArea);
  panel.appendChild(quickRow);
  document.body.appendChild(panel);

  switchVideo(activeVideo);
  setSpeed(desiredRate, {
    updateDesired: false
  });

  scanInterval = setInterval(() => {
    const found = findVideo();

    if (!found) return;

    const foundKey = getVideoKey(found);
    const isNewElement = found !== activeVideo;
    const isNewSource = foundKey && foundKey !== lastVideoKey;

    if (isNewElement || isNewSource) {
      switchVideo(found);
      reapplyDesiredSpeed();
    }
  }, 1000);

  keepRateInterval = setInterval(() => {
    if (!activeVideo) return;
    if (document.hidden) return;

    if (Math.abs(activeVideo.playbackRate - desiredRate) > 0.01) {
      setSpeed(desiredRate, {
        updateDesired: false
      });
    }
  }, 1500);

  let isDragging = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;

  function onHeaderMouseDown(e) {
    if (e.target === closeBtn) return;

    isDragging = true;
    dragOffsetX = e.clientX - panel.offsetLeft;
    dragOffsetY = e.clientY - panel.offsetTop;

    header.style.cursor = 'grabbing';
    e.preventDefault();
  }

  function onDocumentMouseMove(e) {
    if (!isDragging) return;

    const x = Math.max(
      0,
      Math.min(window.innerWidth - panel.offsetWidth, e.clientX - dragOffsetX)
    );

    const y = Math.max(
      0,
      Math.min(window.innerHeight - panel.offsetHeight, e.clientY - dragOffsetY)
    );

    panel.style.left = `${x}px`;
    panel.style.top = `${y}px`;
    panel.style.right = 'auto';
  }

  function onDocumentMouseUp() {
    isDragging = false;
    header.style.cursor = 'grab';
  }

  header.addEventListener('mousedown', onHeaderMouseDown);
  document.addEventListener('mousemove', onDocumentMouseMove);
  document.addEventListener('mouseup', onDocumentMouseUp);

  panel._cleanup = () => {
    if (scanInterval) {
      clearInterval(scanInterval);
      scanInterval = null;
    }

    if (keepRateInterval) {
      clearInterval(keepRateInterval);
      keepRateInterval = null;
    }

    cleanupActiveVideoListeners();

    header.removeEventListener('mousedown', onHeaderMouseDown);
    document.removeEventListener('mousemove', onDocumentMouseMove);
    document.removeEventListener('mouseup', onDocumentMouseUp);
  };

  return {
    ok: true,
    summary: `通用视频倍速控制面板已加载 | 当前倍速: ${activeVideo.playbackRate}x`,
    data: {
      video_found: !!activeVideo,
      current_rate: activeVideo.playbackRate,
      supported_range: `${MIN_SPEED}x ~ ${MAX_CUSTOM_SPEED}x`,
      preset_speeds: DEFAULT_SPEEDS,
      current_site: location.hostname,
      features: [
        '不限制视频网站域名',
        '自动寻找页面中的 HTML5 video 元素',
        '支持开放 Shadow DOM 内的视频',
        '支持同源 iframe 内的视频',
        '自定义倍速输入',
        '预设快捷按钮 0.5x ~ 4x',
        '±0.25 微调按钮',
        '一键重置为 1x',
        '手动重扫视频元素',
        '自动跟随视频切换',
        '自动尝试保持目标倍速',
        '重复运行时自动清理旧监听和旧定时器'
      ]
    },
    warnings: [
      '跨域 iframe 内的视频无法被当前页面脚本控制',
      '封闭 Shadow DOM 内的视频无法被普通脚本访问',
      '部分网站可能会主动重置 playbackRate，本脚本会定期尝试恢复'
    ]
  };
}
run();