// ==TabbitScript==
// @name         直接下载当前网址
// @description  Direct Download Current URL 在当前页面添加下载按钮，点击后直接下载当前URL的文件；支持 GitHub 预览页自动获取 Raw 原始文件，解决想下载预览js、txt、md时拿到HTML而不是源文件的问题
// @author       mr-mihu
// @match        *://*/*.js
// @match        *://*/*.css
// @match        *://*/*.txt
// @match        *://*/*.json
// @match        *://*/*.sh
// @match        *://*/*.md
// @match        *://*/*.svg
// @match        *://github.com/*/*/blob/*
// @match        *://raw.githubusercontent.com/*
// @grant        none
// ==/TabbitScript==

(function () {
    'use strict';

    // 防止重复注入
    if (document.getElementById('tdcu-download-btn')) return;

    // 从 URL 中提取文件名
    function filenameFromUrl(url) {
        try {
            const p = new URL(url, location.href).pathname;
            let name = decodeURIComponent((p.split('/').filter(Boolean).pop()) || '');
            if (!name) name = 'download_' + Date.now();
            return name;
        } catch (e) {
            return 'download_' + Date.now();
        }
    }

    // 解析当前页面真正的“原始文件”下载地址
    // 返回 { url, filename, kind }
    function resolveTarget() {
        const host = location.hostname;

        // GitHub 文件预览页：正文在页面里的 /blob/ 路径下渲染，真正文件在 Raw 链接里
        if (host === 'github.com' || host === 'www.github.com') {
            const rawLink = document.querySelector(
                'a[data-testid="raw-button"], a#raw-url, a[href*="/raw/"]'
            );
            if (rawLink && rawLink.href) {
                return { url: rawLink.href, filename: filenameFromUrl(rawLink.href), kind: 'github-raw' };
            }
            // 兜底：直接把 /blob/ 换成 /raw/
            if (location.pathname.indexOf('/blob/') !== -1) {
                const u = location.href.replace('/blob/', '/raw/');
                return { url: u, filename: filenameFromUrl(u), kind: 'github-raw-fallback' };
            }
        }

        // GitHub 原始文件页：本身就是原始内容
        if (host === 'raw.githubusercontent.com') {
            return { url: location.href, filename: filenameFromUrl(location.href), kind: 'github-raw-direct' };
        }

        // 其它普通文件页：直接下载当前 URL
        return { url: location.href, filename: filenameFromUrl(location.href), kind: 'direct' };
    }

    // 触发浏览器下载
    async function triggerDownload() {
        const target = resolveTarget();

        // GitHub 场景：抓取 Raw 原始内容后以文件形式下载，避免拿到 HTML
        if (target.kind !== 'direct') {
            try {
                const resp = await fetch(target.url, { credentials: 'omit' });
                if (!resp.ok) throw new Error('HTTP ' + resp.status);
                const blob = await resp.blob();
                const objUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = objUrl;
                a.download = target.filename;
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();
                a.remove();
                setTimeout(function () { URL.revokeObjectURL(objUrl); }, 20000);
                return;
            } catch (e) {
                console.warn('[直接下载当前网址] 抓取原始文件失败，回退为直接下载当前 URL：', e);
            }
        }

        // 普通场景：直接以当前 URL 触发下载
        const a = document.createElement('a');
        a.href = target.url;
        a.download = target.filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        a.remove();
    }

    // 创建下载按钮
    const downloadBtn = document.createElement('button');
    downloadBtn.id = 'tdcu-download-btn';
    downloadBtn.textContent = '下载当前文件';
    downloadBtn.style.position = 'fixed';
    downloadBtn.style.top = '10px';
    downloadBtn.style.right = '10px';
    downloadBtn.style.zIndex = '99999';
    downloadBtn.style.padding = '8px 15px';
    downloadBtn.style.backgroundColor = '#4CAF50';
    downloadBtn.style.color = 'white';
    downloadBtn.style.border = 'none';
    downloadBtn.style.borderRadius = '4px';
    downloadBtn.style.cursor = 'pointer';
    downloadBtn.style.fontSize = '14px';
    downloadBtn.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    downloadBtn.style.transition = 'background-color 0.3s';

    downloadBtn.addEventListener('mouseover', function () {
        this.style.backgroundColor = '#45a049';
    });
    downloadBtn.addEventListener('mouseout', function () {
        this.style.backgroundColor = '#4CAF50';
    });

    downloadBtn.addEventListener('click', function () {
        this.textContent = '下载中…';
        this.disabled = true;
        Promise.resolve(triggerDownload()).finally(() => {
            this.textContent = '下载当前文件';
            this.disabled = false;
        });
    });

    function mount() {
        if (!document.body) return;
        if (!document.getElementById('tdcu-download-btn')) {
            document.body.appendChild(downloadBtn);
        }
    }

    if (document.body) {
        mount();
    } else {
        document.addEventListener('DOMContentLoaded', mount);
    }
})();