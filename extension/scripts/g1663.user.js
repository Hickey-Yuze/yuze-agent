/**
 * Tabbit 脚本妙招：媒体矿工 Pro
 * 功能：图片/视频/m3u8流 一键提取、预览、下载
 * 新增：m3u8 自动嗅探（正则匹配 + XHR/fetch 拦截）
 */

(function() {
    'use strict';

    const CONFIG = {
        minImageWidth: 50,
        minImageHeight: 50,
        minVideoWidth: 120,
        minVideoHeight: 90,
        deduplicate: true,
        interceptNetwork: true,   // 是否拦截XHR/fetch捕获m3u8
    };

    let mediaItems = { images: [], videos: [], m3u8s: [] };
    let networkInterceptorActive = false;

    // ---------- 工具函数 ----------
    function normalizeUrl(url, base = window.location.href) {
        try { return new URL(url, base).href; } catch(e) { return url; }
    }

    function formatFileSize(bytes) {
        if (!bytes) return '?';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(1) + ' MB';
    }

    async function getBlobFromUrl(url) {
        try {
            const res = await fetch(url, { mode: 'cors' });
            if (!res.ok) return null;
            return await res.blob();
        } catch(e) { return null; }
    }

    // ---------- 图片提取（同前，略作优化）----------
    function extractImages() {
        const images = [];
        const urlsSet = new Set();
        document.querySelectorAll('img').forEach(img => {
            let src = img.src || img.getAttribute('data-src') || img.getAttribute('data-original');
            if (src && !src.startsWith('data:')) {
                const url = normalizeUrl(src);
                if (!urlsSet.has(url)) {
                    urlsSet.add(url);
                    const rect = img.getBoundingClientRect();
                    images.push({ url, type: 'img', width: rect.width || img.naturalWidth, height: rect.height || img.naturalHeight });
                }
            }
        });
        document.querySelectorAll('*').forEach(el => {
            const bg = getComputedStyle(el).backgroundImage;
            if (bg && bg !== 'none') {
                const m = bg.match(/url\(["']?([^"')]+)["']?\)/);
                if (m && m[1] && !m[1].startsWith('data:')) {
                    const url = normalizeUrl(m[1]);
                    if (!urlsSet.has(url)) {
                        urlsSet.add(url);
                        const rect = el.getBoundingClientRect();
                        images.push({ url, type: 'bg', width: rect.width, height: rect.height });
                    }
                }
            }
        });
        return Array.from(images);
    }

    // ---------- 视频提取 ----------
    function extractVideos() {
        const videos = [];
        const urlsSet = new Set();
        document.querySelectorAll('video').forEach(video => {
            if (video.src && !urlsSet.has(video.src)) {
                urlsSet.add(video.src);
                videos.push({ url: normalizeUrl(video.src), type: 'video', width: video.videoWidth, height: video.videoHeight });
            }
            video.querySelectorAll('source').forEach(src => {
                if (src.src && !urlsSet.has(src.src)) {
                    urlsSet.add(src.src);
                    videos.push({ url: normalizeUrl(src.src), type: 'video', width: video.videoWidth, height: video.videoHeight });
                }
            });
        });
        document.querySelectorAll('a[href]').forEach(link => {
            if (/\.(mp4|webm|mov|avi|mkv)(\?|$)/i.test(link.href)) {
                const url = normalizeUrl(link.href);
                if (!urlsSet.has(url)) {
                    urlsSet.add(url);
                    videos.push({ url, type: 'link', width: 0, height: 0 });
                }
            }
        });
        return videos;
    }

    // ---------- m3u8 嗅探器核心 ----------
    function sniffM3u8FromDOM() {
        const m3u8Urls = new Set();
        // 1. 扫描所有 script 标签内容
        document.querySelectorAll('script').forEach(script => {
            const content = script.textContent || script.innerText;
            if (content) {
                const matches = content.matchAll(/https?:\/\/[^\s"']+\.m3u8[^\s"']*/gi);
                for (const m of matches) m3u8Urls.add(normalizeUrl(m[0]));
            }
        });
        // 2. 扫描 video 标签 src 及 source
        document.querySelectorAll('video source[src], video[src]').forEach(el => {
            let src = el.src || el.getAttribute('src');
            if (src && src.includes('.m3u8')) m3u8Urls.add(normalizeUrl(src));
        });
        // 3. 扫描页面中所有链接
        document.querySelectorAll('a[href]').forEach(a => {
            if (a.href.includes('.m3u8')) m3u8Urls.add(normalizeUrl(a.href));
        });
        // 4. 扫描 iframe 的 src (可能嵌入播放器)
        document.querySelectorAll('iframe[src]').forEach(iframe => {
            if (iframe.src.includes('.m3u8')) m3u8Urls.add(normalizeUrl(iframe.src));
        });
        // 5. 常见全局变量模式
        if (window.playerConfig) {
            const configStr = JSON.stringify(window.playerConfig);
            const matches = configStr.matchAll(/https?:\/\/[^\s"']+\.m3u8[^\s"']*/gi);
            for (const m of matches) m3u8Urls.add(normalizeUrl(m[0]));
        }
        return Array.from(m3u8Urls).map(url => ({ url, type: 'm3u8' }));
    }

    // 网络请求拦截器（捕获动态加载的 m3u8）
    function enableNetworkInterceptor() {
        if (networkInterceptorActive) return;
        networkInterceptorActive = true;

        const originalFetch = window.fetch;
        window.fetch = function(...args) {
            const url = args[0];
            if (typeof url === 'string' && url.includes('.m3u8')) {
                addM3u8Url(url);
            } else if (url && url.url && url.url.includes('.m3u8')) {
                addM3u8Url(url.url);
            }
            return originalFetch.apply(this, args);
        };

        const originalXHROpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method, url, ...rest) {
            this._url = url;
            if (url && url.includes('.m3u8')) addM3u8Url(url);
            return originalXHROpen.call(this, method, url, ...rest);
        };
        const originalXHRSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.send = function(body) {
            if (this._url && this._url.includes('.m3u8')) addM3u8Url(this._url);
            return originalXHRSend.call(this, body);
        };
    }

    function addM3u8Url(url) {
        const normalized = normalizeUrl(url);
        if (!mediaItems.m3u8s.some(item => item.url === normalized)) {
            mediaItems.m3u8s.push({ url: normalized, type: 'm3u8' });
            renderMediaGrid(); // 实时刷新
        }
    }

    // ---------- UI 构建 (标签页切换) ----------
    let currentTab = 'images';

    function createModal() {
        const existing = document.getElementById('media-miner-modal');
        if (existing) existing.remove();
        const modal = document.createElement('div');
        modal.id = 'media-miner-modal';
        modal.style.cssText = `position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:999999; overflow-y:auto; font-family:system-ui;`;
        const container = document.createElement('div');
        container.style.cssText = `max-width:1400px; margin:2rem auto; background:#1e1e2f; border-radius:20px; color:#eee; padding:1.5rem;`;
        container.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                <h2 style="margin:0;">🖼️ 媒体矿工 Pro</h2>
                <button id="mm-close" style="background:#ff5f5f; border:none; color:white; padding:0.3rem 1rem; border-radius:30px; cursor:pointer;">✕ 关闭</button>
            </div>
            <div style="display:flex; gap:1rem; border-bottom:1px solid #444; margin-bottom:1rem;">
                <button class="tab-btn" data-tab="images">📷 图片 (<span id="img-count">0</span>)</button>
                <button class="tab-btn" data-tab="videos">🎬 视频 (<span id="vid-count">0</span>)</button>
                <button class="tab-btn" data-tab="m3u8">📡 M3U8流 (<span id="m3u8-count">0</span>)</button>
            </div>
            <div style="display:flex; gap:1rem; flex-wrap:wrap; margin-bottom:1rem;">
                <label><input type="checkbox" id="filter-small"> 过滤小图标 (≥${CONFIG.minImageWidth}px)</label>
                <label><input type="checkbox" id="filter-duplicate" checked> 去重URL</label>
                <button id="download-all" style="background:#2d8cff; border:none; color:white; padding:0.3rem 1rem; border-radius:20px;">⬇️ 下载全部(ZIP)</button>
                <button id="copy-all-urls" style="background:#444; border:none; color:white; padding:0.3rem 1rem; border-radius:20px;">📋 复制所有链接</button>
            </div>
            <div id="media-grid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(200px,1fr)); gap:1rem; margin-top:1rem;"></div>
        `;
        modal.appendChild(container);
        document.body.appendChild(modal);

        document.getElementById('mm-close').onclick = () => modal.remove();
        document.getElementById('filter-small').onchange = () => renderMediaGrid();
        document.getElementById('filter-duplicate').onchange = () => renderMediaGrid();
        document.getElementById('download-all').onclick = () => downloadAllAsZip();
        document.getElementById('copy-all-urls').onclick = () => copyAllUrls();
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.onclick = () => {
                currentTab = btn.dataset.tab;
                renderMediaGrid();
                document.querySelectorAll('.tab-btn').forEach(b => b.style.background = 'transparent');
                btn.style.background = '#2d8cff';
            };
        });
        document.querySelector('.tab-btn').style.background = '#2d8cff';
        return modal;
    }

    async function renderMediaGrid() {
        const filterSmall = document.getElementById('filter-small').checked;
        const filterDuplicate = document.getElementById('filter-duplicate').checked;
        let items = [];
        if (currentTab === 'images') items = [...mediaItems.images];
        else if (currentTab === 'videos') items = [...mediaItems.videos];
        else items = [...mediaItems.m3u8s];

        if (filterDuplicate) {
            const unique = new Map();
            items = items.filter(it => { if(unique.has(it.url)) return false; unique.set(it.url,true); return true; });
        }
        if (filterSmall && currentTab === 'images') {
            items = items.filter(img => (img.width || 0) >= CONFIG.minImageWidth && (img.height || 0) >= CONFIG.minImageHeight);
        }
        document.getElementById('img-count').innerText = mediaItems.images.length;
        document.getElementById('vid-count').innerText = mediaItems.videos.length;
        document.getElementById('m3u8-count').innerText = mediaItems.m3u8s.length;

        const grid = document.getElementById('media-grid');
        grid.innerHTML = '';
        for (const item of items) {
            const card = document.createElement('div');
            card.style.cssText = 'background:#2a2a3a; border-radius:12px; overflow:hidden; padding:0.5rem;';
            if (currentTab === 'images') {
                card.innerHTML = `
                    <img src="${item.url}" style="width:100%; aspect-ratio:16/9; object-fit:cover;" loading="lazy" onerror="this.src='data:image/svg+xml,%3Csvg...%3E'">
                    <div style="padding:0.3rem; font-size:0.8rem;">📐 ${item.width||'?'}x${item.height||'?'}<br>
                    <button class="copy-url" data-url="${item.url}">复制链接</button>
                    <button class="download-single" data-url="${item.url}" data-type="image">下载</button></div>
                `;
            } else if (currentTab === 'videos') {
                card.innerHTML = `
                    <video src="${item.url}" style="width:100%; aspect-ratio:16/9; object-fit:cover;" controls preload="metadata"></video>
                    <div style="padding:0.3rem;"><button class="copy-url" data-url="${item.url}">复制链接</button>
                    <button class="download-single" data-url="${item.url}" data-type="video">下载</button></div>
                `;
            } else {
                card.innerHTML = `
                    <div style="background:#111; text-align:center; padding:1rem;">📡 M3U8 流</div>
                    <div style="padding:0.3rem; word-break:break-all;">${item.url.substring(0,60)}...</div>
                    <div><button class="copy-url" data-url="${item.url}">复制链接</button>
                    <button class="play-m3u8" data-url="${item.url}">▶ 播放</button></div>
                `;
            }
            grid.appendChild(card);
        }
        if (items.length===0) grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:3rem;">未发现资源</div>';
        document.querySelectorAll('.copy-url').forEach(btn => btn.onclick = (e) => { navigator.clipboard.writeText(btn.dataset.url); alert('已复制'); e.stopPropagation(); });
        document.querySelectorAll('.download-single').forEach(btn => btn.onclick = (e) => { downloadFile(btn.dataset.url, btn.dataset.type); e.stopPropagation(); });
        document.querySelectorAll('.play-m3u8').forEach(btn => btn.onclick = (e) => { playM3u8(btn.dataset.url); e.stopPropagation(); });
    }

    function playM3u8(url) {
        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:1000000; display:flex; align-items:center; justify-content:center;';
        const player = document.createElement('video');
        player.controls = true;
        player.style.maxWidth = '90%';
        player.style.maxHeight = '90%';
        if (Hls && Hls.isSupported()) {
            const hls = new Hls();
            hls.loadSource(url);
            hls.attachMedia(player);
        } else if (player.canPlayType('application/vnd.apple.mpegurl')) {
            player.src = url;
        } else {
            alert('当前浏览器不支持 HLS 原生播放，已复制链接，请使用 VLC 等播放器打开');
            navigator.clipboard.writeText(url);
            modal.remove();
            return;
        }
        modal.appendChild(player);
        const closeBtn = document.createElement('button');
        closeBtn.innerText = '关闭';
        closeBtn.style.cssText = 'position:absolute; top:20px; right:20px; background:red; color:white; border:none; padding:8px 16px; border-radius:30px; cursor:pointer;';
        closeBtn.onclick = () => modal.remove();
        modal.appendChild(closeBtn);
        document.body.appendChild(modal);
        player.play().catch(e=>console.warn);
    }

    async function downloadFile(url, type) {
        const a = document.createElement('a');
        a.href = url;
        a.download = url.split('/').pop() || (type==='image'?'image.jpg':'video.mp4');
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    async function downloadAllAsZip() {
        if (typeof JSZip === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
            document.head.appendChild(script);
            await new Promise(resolve => script.onload = resolve);
        }
        const zip = new JSZip();
        let items = (currentTab === 'images' ? mediaItems.images : (currentTab === 'videos' ? mediaItems.videos : mediaItems.m3u8s));
        const filterDup = document.getElementById('filter-duplicate').checked;
        if (filterDup) {
            const unique = new Map();
            items = items.filter(it => { if(unique.has(it.url)) return false; unique.set(it.url,true); return true; });
        }
        let added = 0;
        for (const item of items) {
            const blob = await getBlobFromUrl(item.url);
            if (blob) {
                let filename = item.url.split('/').pop().split('?')[0];
                if (!filename) filename = `media_${Date.now()}_${added}.${blob.type.split('/')[1]||'bin'}`;
                zip.file(filename, blob);
                added++;
            }
        }
        if (added===0) { alert('无可打包资源'); return; }
        const content = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = 'media_export.zip';
        link.click();
        URL.revokeObjectURL(link.href);
        alert(`打包 ${added} 个文件`);
    }

    function copyAllUrls() {
        let items = (currentTab === 'images' ? mediaItems.images : (currentTab === 'videos' ? mediaItems.videos : mediaItems.m3u8s));
        const urls = items.map(i => i.url);
        navigator.clipboard.writeText(urls.join('\n'));
        alert(`已复制 ${urls.length} 个链接`);
    }

    async function enrichImageInfo(img) {
        return new Promise(resolve => {
            const i = new Image();
            i.onload = () => { img.realWidth = i.width; img.realHeight = i.height; resolve(img); };
            i.onerror = () => resolve(img);
            i.src = img.url;
        });
    }

    async function runMiner() {
        createModal();
        if (CONFIG.interceptNetwork) enableNetworkInterceptor();
        mediaItems.images = extractImages();
        mediaItems.videos = extractVideos();
        mediaItems.m3u8s = sniffM3u8FromDOM();
        for (let img of mediaItems.images) await enrichImageInfo(img);
        renderMediaGrid();
    }

    // 动态加载 HLS.js (用于播放 m3u8)
    if (typeof Hls === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
        document.head.appendChild(script);
    }
    runMiner().catch(console.error);
})();