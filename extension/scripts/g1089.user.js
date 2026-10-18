// ==UserScript==
// @name         直播视频录制
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  自动识别网页中的直播视频并开始录制（iOS黑白现代风格 / 支持拖动）
// @author       Tabbit
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // ========== iOS 黑白现代风格主题 ==========
    const THEME = {
        bg:              '#ffffff',
        surface:         '#f5f5f7',
        textPrimary:     '#1d1d1f',
        textSecondary:   '#86868b',
        border:          '#d2d2d7',
        accent:          '#007aff',      // iOS 蓝
        accentHover:     '#0056b3',
        danger:          '#ff3b30',
        warning:         '#ff9500',
        success:         '#34c759',
        radius:          '12px',
        shadow:          '0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
        font:            '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
    };

    // ========== 创建控制面板 ==========
    const panel = document.createElement('div');
    panel.id = 'live-recorder-panel';
    Object.assign(panel.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        width: '320px',
        background: THEME.bg,
        borderRadius: THEME.radius,
        boxShadow: THEME.shadow,
        zIndex: '999999',
        fontFamily: THEME.font,
        overflow: 'hidden',
        // 拖动相关
        transition: 'box-shadow .2s ease, opacity .2s ease',
        userSelect: 'none',
    });

    panel.innerHTML = `
        <!-- 标题栏（可拖动区域） -->
        <div id="panel-header" style="
            background: #000;
            color: #fff;
            padding: 14px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: grab;
            -webkit-app-region: drag;
        ">
            <span style="
                font-weight: 600;
                font-size: 14px;
                letter-spacing: -0.2px;
                display: flex;
                align-items: center;
                gap: 8px;
            ">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <circle cx="12" cy="12" r="3"/>
                </svg>
                直播录制器
            </span>
            <button id="recorder-close" style="
                background: rgba(255,255,255,0.15);
                border: none;
                color: rgba(255,255,255,0.8);
                cursor: pointer;
                font-size: 18px;
                width: 26px;
                height: 26px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all .15s ease;
                line-height: 1;
                padding: 0;
            ">×</button>
        </div>

        <!-- 内容区 -->
        <div style="padding: 16px;">
            <!-- 视频源选择 -->
            <div style="margin-bottom: 16px;">
                <label style="
                    display: block;
                    font-size: 12px;
                    font-weight: 500;
                    color: ${THEME.textSecondary};
                    margin-bottom: 6px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                ">视频源</label>
                <select id="video-source" style="
                    width: 100%;
                    padding: 10px 12px;
                    border: 1px solid ${THEME.border};
                    border-radius: 10px;
                    font-size: 14px;
                    color: ${THEME.textPrimary};
                    background: ${THEME.surface};
                    outline: none;
                    appearance: none;
                    -webkit-appearance: none;
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2386868b' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
                    background-repeat: no-repeat;
                    background-position: right 12px center;
                    cursor: pointer;
                    transition: border-color .15s ease;
                ">
                    <option value="">-- 正在检测 --</option>
                </select>
            </div>

            <!-- 录制控制按钮组 -->
            <div style="margin-bottom: 16px;">
                <label style="
                    display: block;
                    font-size: 12px;
                    font-weight: 500;
                    color: ${THEME.textSecondary};
                    margin-bottom: 6px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                ">控制</label>
                <div style="display: flex; gap: 8px;">
                    <button id="btn-start" style="
                        flex: 1;
                        padding: 10px;
                        background: ${THEME.textPrimary};
                        color: #fff;
                        border: none;
                        border-radius: 10px;
                        cursor: pointer;
                        font-size: 13px;
                        font-weight: 500;
                        transition: all .15s ease;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 4px;
                    ">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
                        开始
                    </button>
                    <button id="btn-pause" style="
                        flex: 1;
                        padding: 10px;
                        background: ${THEME.surface};
                        color: ${THEME.textPrimary};
                        border: 1px solid ${THEME.border};
                        border-radius: 10px;
                        cursor: not-allowed;
                        font-size: 13px;
                        font-weight: 500;
                        opacity: .45;
                        transition: all .15s ease;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 4px;
                    " disabled>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                        暂停
                    </button>
                    <button id="btn-stop" style="
                        flex: 1;
                        padding: 10px;
                        background: ${THEME.surface};
                        color: ${THEME.textPrimary};
                        border: 1px solid ${THEME.border};
                        border-radius: 10px;
                        cursor: not-allowed;
                        font-size: 13px;
                        font-weight: 500;
                        opacity: .45;
                        transition: all .15s ease;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 4px;
                    " disabled>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
                        停止
                    </button>
                </div>
            </div>

            <!-- 保存按钮 -->
            <div style="margin-bottom: 16px;">
                <button id="btn-save" style="
                    width: 100%;
                    padding: 11px;
                    background: ${THEME.accent};
                    color: #fff;
                    border: none;
                    border-radius: 10px;
                    cursor: not-allowed;
                    font-size: 14px;
                    font-weight: 500;
                    opacity: .45;
                    transition: all .15s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                " disabled>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    保存到本地
                </button>
            </div>

            <!-- 状态信息卡片 -->
            <div style="
                background: ${THEME.surface};
                padding: 12px 14px;
                border-radius: 10px;
                font-size: 13px;
                color: ${THEME.textPrimary};
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 8px;
            ">
                <div>
                    <div style="font-size: 11px; color: ${THEME.textSecondary}; margin-bottom: 2px;">时长</div>
                    <div id="rec-duration" style="font-variant-numeric: tabular-nums; font-weight: 600;">00:00:00</div>
                </div>
                <div>
                    <div style="font-size: 11px; color: ${THEME.textSecondary}; margin-bottom: 2px;">大小</div>
                    <div id="rec-size" style="font-variant-numeric: tabular-nums; font-weight: 600;">0 B</div>
                </div>
            </div>

            <!-- 状态指示条 -->
            <div id="status-bar" style="
                margin-top: 12px;
                padding: 8px 12px;
                background: transparent;
                border-radius: 8px;
                font-size: 12px;
                color: ${THEME.textSecondary};
                text-align: center;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                transition: all .2s ease;
            ">
                <span id="status-dot" style="
                    width: 6px; height: 6px;
                    border-radius: 50%;
                    background: ${THEME.textSecondary};
                    display: inline-block;
                    transition: background .2s ease;
                "></span>
                <span id="status-text">就绪</span>
            </div>

            <!-- 提示文字 -->
            <div style="
                margin-top: 10px;
                font-size: 11px;
                color: ${THEME.textSecondary};
                text-align: center;
                opacity: .7;
                line-height: 1.5;
            ">
                跨域视频将使用 Canvas 模式 · 最大 500 MB<br>
                <span style="opacity: .6;">拖动标题栏可移动面板</span>
            </div>
        </div>
    `;

    document.body.appendChild(panel);

    // ========== 拖动功能实现 ==========
    (function initDrag() {
        const header = document.getElementById('panel-header');
        let isDragging = false;
        let startX, startY, initialLeft, initialTop;

        function onMouseDown(e) {
            if (e.target.closest('#recorder-close')) return;
            isDragging = true;
            header.style.cursor = 'grabbing';

            const rect = panel.getBoundingClientRect();
            startX = e.clientX;
            startY = e.clientY;
            initialLeft = rect.left;
            initialTop = rect.top;

            // 切换为 left/top 定位，保持当前位置
            panel.style.right = 'auto';
            panel.style.left = initialLeft + 'px';
            panel.style.top = initialTop + 'px';

            panel.style.boxShadow = '0 8px 32px rgba(0,0,0,0.16), 0 2px 8px rgba(0,0,0,0.08)';
            panel.style.opacity = '0.95';

            e.preventDefault();
        }

        function onMouseMove(e) {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            let newLeft = initialLeft + dx;
            let newTop = initialTop + dy;

            // 边界约束
            const maxLeft = window.innerWidth - panel.offsetWidth;
            const maxTop = window.innerHeight - panel.offsetHeight;
            newLeft = Math.max(0, Math.min(newLeft, maxLeft));
            newTop = Math.max(0, Math.min(newTop, maxTop));

            panel.style.left = newLeft + 'px';
            panel.style.top = newTop + 'px';
        }

        function onMouseUp() {
            if (!isDragging) return;
            isDragging = false;
            header.style.cursor = 'grab';
            panel.style.boxShadow = THEME.shadow;
            panel.style.opacity = '1';
        }

        // Mouse events
        header.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);

        // Touch events for mobile
        header.addEventListener('touchstart', (e) => {
            if (e.target.closest('#recorder-close')) return;
            const touch = e.touches[0];
            onMouseDown({ clientX: touch.clientX, clientY: touch.clientY, target: e.target, preventDefault: () => e.preventDefault() });
        }, { passive: false });

        document.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            const touch = e.touches[0];
            onMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
        }, { passive: false });

        document.addEventListener('touchend', onMouseUp);

        // 双击标题栏复位
        let lastClickTime = 0;
        header.addEventListener('click', (e) => {
            if (e.target.closest('#recorder-close')) return;
            const now = Date.now();
            if (now - lastClickTime < 300) {
                // 双击：回到右上角默认位置
                panel.style.right = '20px';
                panel.style.top = '20px';
                panel.style.left = 'auto';
                lastClickTime = 0;
            } else {
                lastClickTime = now;
            }
        });
    })();

    // ========== 状态变量 ==========
    let mediaRecorder = null;
    let recordedChunks = [];
    let startTime = null;
    let durationInterval = null;
    let currentStream = null;
    let videoSources = [];
    let canvasAnimFrame = null;
    let isPaused = false;

    // ========== 视频源检测 ==========
    function detectVideoSources() {
        const videos = document.querySelectorAll('video');
        const sources = [];

        videos.forEach((video, index) => {
            if (video.src || video.srcObject || video.currentSrc) {
                sources.push({
                    element: video,
                    name: `视频 ${index + 1} (${video.videoWidth || '?'}×${video.videoHeight || '?'})`,
                    src: video.src || video.currentSrc,
                    isLive: video.srcObject !== null || video.duration === Infinity
                });
            }
        });

        document.querySelectorAll('iframe').forEach((iframe, index) => {
            try {
                const iframeVideos = iframe.contentDocument?.querySelectorAll('video');
                if (iframeVideos) {
                    iframeVideos.forEach((video, vIndex) => {
                        if (video.src || video.srcObject) {
                            sources.push({
                                element: video,
                                name: `iframe 视频 ${index + 1}-${vIndex + 1}`,
                                src: video.src,
                                isLive: true
                            });
                        }
                    });
                }
            } catch (e) { /* 跨域 */ }
        });

        return sources;
    }

    function updateSourceSelect() {
        videoSources = detectVideoSources();
        const select = document.getElementById('video-source');

        if (videoSources.length === 0) {
            select.innerHTML = '<option value="">-- 未检测到视频 --</option>';
            return;
        }

        select.innerHTML = '';
        videoSources.forEach((source, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = source.isLive ? `● ${source.name}` : source.name;
            select.appendChild(option);
        });
    }

    // ========== 工具函数 ==========
    function formatDuration(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
        const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
        const s = String(totalSeconds % 60).padStart(2, '0');
        return `${h}:${m}:${s}`;
    }

    function formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    function setStatus(text, color) {
        const dot = document.getElementById('status-dot');
        const txt = document.getElementById('status-text');
        txt.textContent = text;
        dot.style.background = color || THEME.textSecondary;
    }

    function updateUIState(state) {
        const btnStart = document.getElementById('btn-start');
        const btnPause = document.getElementById('btn-pause');
        const btnStop = document.getElementById('btn-stop');
        const btnSave = document.getElementById('btn-save');

        const activeBtnStyle = `
            background: ${THEME.textPrimary}; color: #fff; border: none;
            cursor: pointer; opacity: 1;
        `;
        const inactiveBtnStyle = `
            background: ${THEME.surface}; color: ${THEME.textPrimary};
            border: 1px solid ${THEME.border}; cursor: not-allowed; opacity: .45;
        `;

        switch (state) {
            case 'idle':
                btnStart.style.cssText = activeBtnStyle;
                btnStart.disabled = false;
                btnPause.style.cssText = inactiveBtnStyle;
                btnPause.disabled = true;
                btnStop.style.cssText = inactiveBtnStyle;
                btnStop.disabled = true;
                btnSave.style.cssText = `background: ${THEME.accent}; color: #fff; border: none; cursor: not-allowed; opacity: .45;`;
                btnSave.disabled = true;
                break;
            case 'recording':
                btnStart.style.cssText = inactiveBtnStyle;
                btnStart.disabled = true;
                btnPause.style.cssText = activeBtnStyle;
                btnPause.disabled = false;
                btnStop.style.cssText = activeBtnStyle;
                btnStop.disabled = false;
                btnSave.style.cssText = `background: ${THEME.accent}; color: #fff; border: none; cursor: not-allowed; opacity: .45;`;
                btnSave.disabled = true;
                break;
            case 'paused':
                btnStart.style.cssText = activeBtnStyle;
                btnStart.disabled = false;
                btnPause.style.cssText = inactiveBtnStyle;
                btnPause.disabled = true;
                btnStop.style.cssText = activeBtnStyle;
                btnStop.disabled = false;
                btnSave.style.cssText = `background: ${THEME.accent}; color: #fff; border: none; cursor: not-allowed; opacity: .45;`;
                btnSave.disabled = true;
                break;
            case 'stopped':
                btnStart.style.cssText = activeBtnStyle;
                btnStart.disabled = false;
                btnPause.style.cssText = inactiveBtnStyle;
                btnPause.disabled = true;
                btnStop.style.cssText = inactiveBtnStyle;
                btnStop.disabled = true;
                btnSave.style.cssText = `background: ${THEME.accent}; color: #fff; border: none; cursor: pointer; opacity: 1;`;
                btnSave.disabled = false;
                break;
        }
    }

    function startDurationTimer() {
        durationInterval = setInterval(() => {
            if (!isPaused && startTime) {
                document.getElementById('rec-duration').textContent = formatDuration(Date.now() - startTime);
            }
        }, 1000);
    }

    function stopDurationTimer() {
        if (durationInterval) {
            clearInterval(durationInterval);
            durationInterval = null;
        }
    }

    function updateSizeDisplay() {
        let totalBytes = 0;
        recordedChunks.forEach(chunk => totalBytes += chunk.size);
        document.getElementById('rec-size').textContent = formatSize(totalBytes);
    }

    // ========== 录制核心逻辑 ==========
    async function startRecording() {
        const select = document.getElementById('video-source');
        const sourceIndex = select.value;

        if (sourceIndex === '' || !videoSources[sourceIndex]) {
            alert('请先选择视频源');
            return;
        }

        const source = videoSources[sourceIndex];
        recordedChunks = [];
        startTime = Date.now();
        isPaused = false;

        try {
            if (source.element.srcObject) {
                currentStream = source.element.srcObject;
            } else {
                currentStream = source.element.captureStream?.() || source.element.mozCaptureStream?.();
            }

            if (!currentStream) {
                await startCanvasRecording(source.element);
                return;
            }

            const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
                ? 'video/webm;codecs=vp9'
                : MediaRecorder.isTypeSupported('video/webm')
                    ? 'video/webm'
                    : '';

            mediaRecorder = new MediaRecorder(currentStream, mimeType ? { mimeType } : {});

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    recordedChunks.push(event.data);
                    updateSizeDisplay();
                }
            };

            mediaRecorder.onerror = (e) => {
                console.error('MediaRecorder error:', e);
                setStatus('录制出错', THEME.danger);
            };

            mediaRecorder.start(1000);
            updateUIState('recording');
            setStatus('正在录制…', THEME.danger); // 红点闪烁感
            startDurationTimer();

        } catch (error) {
            console.error('录制失败:', error);
            alert('录制失败: ' + error.message);
        }
    }

    // Canvas 录制模式（跨域视频）
    async function startCanvasRecording(videoElement) {
        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth || 1280;
        canvas.height = videoElement.videoHeight || 720;
        const ctx = canvas.getContext('2d');

        const stream = canvas.captureStream(30);

        const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
            ? 'video/webm;codecs=vp9'
            : 'video/webm';

        mediaRecorder = new MediaRecorder(stream, { mimeType: mimeType });

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
                updateSizeDisplay();
            }
        };

        mediaRecorder.start(1000);
        updateUIState('recording');
        setStatus('Canvas模式·录制中', THEME.danger);
        startDurationTimer();

        function drawFrame() {
            if (!mediaRecorder || mediaRecorder.state === 'inactive') return;
            if (!isPaused) {
                ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
            }
            canvasAnimFrame = requestAnimationFrame(drawFrame);
        }
        drawFrame();

        // 清理引用以便停止时取消动画
        mediaRecorder._canvas = canvas;
        mediaRecorder._animFrame = canvasAnimFrame;
    }

    function pauseRecording() {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.pause();
            isPaused = true;
            updateUIState('paused');
            setStatus('已暂停', THEME.warning);
        }
    }

    function resumeRecording() {
        if (mediaRecorder && mediaRecorder.state === 'paused') {
            mediaRecorder.resume();
            isPaused = false;
            updateUIState('recording');
            setStatus('正在录制…', THEME.danger);
        }
    }

    function stopRecording() {
        if (mediaRecorder && (mediaRecorder.state === 'recording' || mediaRecorder.state === 'paused')) {
            // 停止 Canvas 动画
            if (canvasAnimFrame) {
                cancelAnimationFrame(canvasAnimFrame);
                canvasAnimFrame = null;
            }

            mediaRecorder.stop();
            if (currentStream) {
                currentStream.getTracks().forEach(t => t.stop());
                currentStream = null;
            }

            stopDurationTimer();
            updateUIState('stopped');
            setStatus('录制完成', THEME.success);
        }
    }

    function saveRecording() {
        if (recordedChunks.length === 0) {
            alert('没有录制的数据');
            return;
        }

        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        if (blob.size > 500 * 1024 * 1024) {
            alert('文件超过 500MB 限制');
            return;
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const now = new Date();
        const ts = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}${String(now.getSeconds()).padStart(2,'0')}`;
        a.download = `录制_${ts}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);

        setStatus('已保存', THEME.accent);
    }

    // ========== 事件绑定 ==========
    document.getElementById('btn-start').addEventListener('click', () => {
        if (mediaRecorder && mediaRecorder.state === 'paused') {
            resumeRecording();
        } else {
            startRecording();
        }
    });

    document.getElementById('btn-pause').addEventListener('click', pauseRecording);
    document.getElementById('btn-stop').addEventListener('click', stopRecording);
    document.getElementById('btn-save').addEventListener('click', saveRecording);

    document.getElementById('recorder-close').addEventListener('click', () => {
        if (mediaRecorder && (mediaRecorder.state === 'recording' || mediaRecorder.state === 'paused')) {
            if (!confirm('正在录制中，确定关闭面板？')) return;
            stopRecording();
        }
        panel.remove();
    });

    // Hover 效果增强
    ['btn-start', 'btn-pause', 'btn-stop', 'btn-save'].forEach(id => {
        const el = document.getElementById(id);
        el.addEventListener('mouseenter', () => {
            if (!el.disabled) el.style.transform = 'scale(1.02)';
        });
        el.addEventListener('mouseleave', () => {
            el.style.transform = 'scale(1)';
        });
    });

    document.getElementById('recorder-close').addEventListener('mouseenter', function() {
        this.style.background = 'rgba(255,255,255,0.3)';
        this.style.color = '#fff';
    });
    document.getElementById('recorder-close').addEventListener('mouseleave', function() {
        this.style.background = 'rgba(255,255,255,0.15)';
        this.style.color = 'rgba(255,255,255,0.8)';
    });

    // Select focus 样式
    document.getElementById('video-source').addEventListener('focus', function() {
        this.style.borderColor = THEME.accent;
        this.style.boxShadow = `0 0 0 3px rgba(0,122,255,0.15)`;
    });
    document.getElementById('video-source').addEventListener('blur', function() {
        this.style.borderColor = THEME.border;
        this.style.boxShadow = 'none';
    });

    // ========== 初始化：检测视频源 ==========
    updateSourceSelect();
    setInterval(updateSourceSelect, 3000); // 定期刷新

})();