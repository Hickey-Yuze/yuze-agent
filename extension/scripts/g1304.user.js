(function() {
    // 防止重复注入
    if (document.getElementById('tab-screen-recorder-root')) {
        alert('录屏工具已在运行中');
        return;
    }

    // 配置
    const CONFIG = {
        gifWorkerUrl: 'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.worker.js',
        gifLibUrl: 'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js'
    };

    // 状态管理
    const state = {
        isSelecting: false,
        isRecording: false,
        selection: null, // {x, y, w, h}
        mediaStream: null,
        recorder: null,
        gifInstance: null,
        videoElement: null,
        canvasElement: null,
        timerId: null, // 替换 rafId
        startTime: 0,
        frames: []
    };

    // 创建 UI 根节点
    const root = document.createElement('div');
    root.id = 'tab-screen-recorder-root';
    root.style.cssText = `
        position: fixed; top: 0; left: 0; width: 0; height: 0; z-index: 2147483647;
        font-family: system-ui, -apple-system, sans-serif;
    `;
    document.body.appendChild(root);

    // 注入样式
    const style = document.createElement('style');
    style.textContent = `
        .tsr-panel {
            position: fixed; bottom: 20px; right: 20px; 
            background: #1e1e1e; color: #fff; padding: 12px; border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: flex; gap: 8px; align-items: center;
            font-size: 14px; border: 1px solid #333;
        }
        .tsr-btn {
            background: #3b82f6; border: none; color: white; padding: 6px 12px;
            border-radius: 4px; cursor: pointer; transition: background 0.2s;
            font-weight: 500;
        }
        .tsr-btn:hover { background: #2563eb; }
        .tsr-btn.danger { background: #ef4444; }
        .tsr-btn.danger:hover { background: #dc2626; }
        .tsr-btn:disabled { background: #555; cursor: not-allowed; opacity: 0.7; }
        .tsr-selection-layer {
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0,0,0,0.3); cursor: crosshair; display: none;
        }
        .tsr-box {
            position: fixed; border: 2px solid #3b82f6; background: rgba(59, 130, 246, 0.1);
            pointer-events: none; display: none;
        }
        .tsr-status { margin-right: 8px; font-variant-numeric: tabular-nums; }
        .tsr-checkbox { display: flex; align-items: center; gap: 4px; font-size: 12px; margin-right: 8px; }
    `;
    root.appendChild(style);

    // 创建 UI 元素
    const panel = document.createElement('div');
    panel.className = 'tsr-panel';
    panel.innerHTML = `
        <div class="tsr-status" id="tsr-status">准备就绪</div>
        <label class="tsr-checkbox">
            <input type="checkbox" id="tsr-gif-toggle"> 转GIF
        </label>
        <button class="tsr-btn" id="tsr-select-btn">选择区域</button>
        <button class="tsr-btn danger" id="tsr-record-btn" disabled>开始录制</button>
        <button class="tsr-btn" id="tsr-close-btn" style="background:#444;">×</button>
    `;
    root.appendChild(panel);

    const selectionLayer = document.createElement('div');
    selectionLayer.className = 'tsr-selection-layer';
    root.appendChild(selectionLayer);

    const selectionBox = document.createElement('div');
    selectionBox.className = 'tsr-box';
    root.appendChild(selectionBox);

    // 动态加载 GIF 库
    let gifLibLoaded = false;
    const script = document.createElement('script');
    script.src = CONFIG.gifLibUrl;
    script.onload = () => { gifLibLoaded = true; console.log('GIF库加载成功'); };
    script.onerror = () => { console.warn('GIF库加载失败，将仅支持WebM'); };
    document.head.appendChild(script);

    // 交互逻辑：选择区域
    const selectBtn = document.getElementById('tsr-select-btn');
    const recordBtn = document.getElementById('tsr-record-btn');
    const statusEl = document.getElementById('tsr-status');
    const closeBtn = document.getElementById('tsr-close-btn');
    const gifToggle = document.getElementById('tsr-gif-toggle');

    let startX, startY;

    selectBtn.onclick = () => {
        state.isSelecting = true;
        selectionLayer.style.display = 'block';
        selectionBox.style.display = 'none';
        statusEl.textContent = '请拖拽选择区域...';
    };

    selectionLayer.onmousedown = (e) => {
        startX = e.clientX;
        startY = e.clientY;
        selectionBox.style.display = 'block';
        selectionBox.style.left = startX + 'px';
        selectionBox.style.top = startY + 'px';
        selectionBox.style.width = '0px';
        selectionBox.style.height = '0px';

        const onMove = (em) => {
            const currentX = em.clientX;
            const currentY = em.clientY;
            const width = Math.abs(currentX - startX);
            const height = Math.abs(currentY - startY);
            const left = Math.min(currentX, startX);
            const top = Math.min(currentY, startY);

            selectionBox.style.left = left + 'px';
            selectionBox.style.top = top + 'px';
            selectionBox.style.width = width + 'px';
            selectionBox.style.height = height + 'px';
            
            state.selection = { x: left, y: top, w: width, h: height };
        };

        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            state.isSelecting = false;
            selectionLayer.style.display = 'none';
            if (state.selection && state.selection.w > 10 && state.selection.h > 10) {
                recordBtn.disabled = false;
                statusEl.textContent = `已选: ${Math.round(state.selection.w)}x${Math.round(state.selection.h)}`;
                selectionBox.style.display = 'block'; 
            } else {
                statusEl.textContent = '区域太小，请重选';
                selectionBox.style.display = 'none';
            }
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    };

    // 录制逻辑
    recordBtn.onclick = async () => {
        if (state.isRecording) {
            stopRecording();
            return;
        }

        try {
            alert('请在接下来的弹窗中选择【当前标签页】以进行精确裁剪录制。');

            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    displaySurface: 'browser',
                    frameRate: 30
                },
                audio: false,
                selfBrowserSurface: 'include'
            });

            state.mediaStream = stream;
            startRecordingProcess(stream);
        } catch (err) {
            console.error(err);
            statusEl.textContent = '获取权限失败';
        }
    };

    function startRecordingProcess(stream) {
        state.isRecording = true;
        recordBtn.textContent = '停止录制';
        recordBtn.classList.add('danger');
        selectBtn.disabled = true;
        gifToggle.disabled = true;

        const video = document.createElement('video');
        video.srcObject = stream;
        video.muted = true;
        video.play();
        state.videoElement = video;

        const canvas = document.createElement('canvas');
        canvas.width = state.selection.w;
        canvas.height = state.selection.h;
        state.canvasElement = canvas;
        const ctx = canvas.getContext('2d', { alpha: false });

        const isGifMode = gifToggle.checked && gifLibLoaded && window.GIF;
        
        if (isGifMode) {
            state.gifInstance = new window.GIF({
                workers: 2,
                quality: 10,
                width: state.selection.w,
                height: state.selection.h,
                workerScript: CONFIG.gifWorkerUrl
            });
            statusEl.textContent = '正在录制 GIF...';
        } else {
            const outputStream = canvas.captureStream(30);
            state.recorder = new MediaRecorder(outputStream, {
                mimeType: 'video/webm;codecs=vp9'
            });
            state.chunks = [];
            state.recorder.ondataavailable = e => {
                if (e.data.size > 0) state.chunks.push(e.data);
            };
            state.recorder.start();
            statusEl.textContent = '正在录制 Video...';
        }

        state.startTime = Date.now();

        // 【关键修改】将 requestAnimationFrame 替换为 setInterval
        // 33ms 约等于 30 FPS
        const draw = () => {
            if (!state.isRecording) return;

            const videoW = video.videoWidth;
            const windowW = window.innerWidth;
            const scale = videoW / windowW;

            if (videoW > 0) {
                ctx.drawImage(
                    video, 
                    state.selection.x * scale, 
                    state.selection.y * scale, 
                    state.selection.w * scale, 
                    state.selection.h * scale,
                    0, 0, state.selection.w, state.selection.h
                );

                if (isGifMode) {
                    const now = Date.now();
                    if (!state.lastFrameTime || now - state.lastFrameTime > 100) {
                        state.gifInstance.addFrame(ctx, {copy: true, delay: 100});
                        state.lastFrameTime = now;
                    }
                }
            }

            const duration = ((Date.now() - state.startTime) / 1000).toFixed(1);
            statusEl.textContent = `录制中: ${duration}s`;
        };

        // 启动定时器
        state.timerId = setInterval(draw, 33);

        stream.getVideoTracks()[0].onended = stopRecording;
    }

    function stopRecording() {
        if (!state.isRecording) return;
        state.isRecording = false;
        
        // 【关键修改】清理定时器
        if (state.timerId) {
            clearInterval(state.timerId);
            state.timerId = null;
        }

        if (state.mediaStream) {
            state.mediaStream.getTracks().forEach(track => track.stop());
        }

        statusEl.textContent = '处理中...';

        const isGifMode = gifToggle.checked && state.gifInstance;

        if (isGifMode) {
            statusEl.textContent = '正在生成 GIF (请稍候)...';
            state.gifInstance.on('finished', function(blob) {
                downloadFile(blob, 'recording.gif');
                resetUI();
            });
            state.gifInstance.render();
        } else {
            if (state.recorder && state.recorder.state !== 'inactive') {
                state.recorder.stop();
                setTimeout(() => {
                    const blob = new Blob(state.chunks, { type: 'video/webm' });
                    downloadFile(blob, 'recording.webm');
                    resetUI();
                }, 200);
            } else {
                resetUI();
            }
        }
    }

    function downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    }

    function resetUI() {
        recordBtn.textContent = '开始录制';
        recordBtn.classList.remove('danger');
        recordBtn.disabled = false;
        selectBtn.disabled = false;
        gifToggle.disabled = false;
        statusEl.textContent = '录制完成';
        state.gifInstance = null;
        state.recorder = null;
    }

    closeBtn.onclick = () => {
        if (state.isRecording) stopRecording();
        document.body.removeChild(root);
        if (script && script.parentNode) script.parentNode.removeChild(script);
    };

})();