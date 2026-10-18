(function () {
  'use strict';

  if (window.__mhvd_xhs_download_v2__) return;
  window.__mhvd_xhs_download_v2__ = true;

  const BTN_ID = 'mhvd-fixed-btn';
  const STYLE_ID = 'mhvd-style';

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #mhvd-fixed-btn {
        position: fixed;
        right: 20px;
        bottom: 20px;
        z-index: 999999;
        padding: 10px 14px;
        font-size: 14px;
        border: none;
        border-radius: 8px;
        background: rgba(255, 0, 0, 0.9);
        color: #fff;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,.2);
      }
      #mhvd-fixed-btn:disabled {
        opacity: 0.7;
        cursor: wait;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function getFilename() {
    const title =
      document.querySelector('#detail-title')?.innerText ||
      document.querySelector('h1')?.innerText ||
      document.title ||
      'xiaohongshu_video';

    return (title || 'xiaohongshu_video')
      .replace(/[\\/:*?"<>|]+/g, '')
      .replace(/\s+/g, '_')
      .slice(0, 80);
  }

  function collectUrls() {
    const urls = new Set();

    document.querySelectorAll('video').forEach(video => {
      if (video.currentSrc) urls.add(video.currentSrc);
      if (video.src) urls.add(video.src);

      video.querySelectorAll('source').forEach(source => {
        if (source.src) urls.add(source.src);
      });
    });

    document.querySelectorAll('*').forEach(el => {
      if (!el.attributes) return;
      for (const attr of el.attributes) {
        const value = attr.value || '';
        if (
          /^https?:\/\//i.test(value) ||
          /\.(mp4|webm|m3u8)(\?|#|$)/i.test(value)
        ) {
          urls.add(value);
        }
      }
    });

    return Array.from(urls);
  }

  function findBestVideoUrl() {
    const urls = collectUrls();

    return (
      urls.find(url => /sns-video.*\.mp4(\?|#|$)/i.test(url)) ||
      urls.find(url => /\.mp4(\?|#|$)/i.test(url)) ||
      ''
    );
  }

  function saveBlob(blob, filename) {
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename + '.mp4';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
  }

  async function downloadByFetch(url, filename) {
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'omit',
      mode: 'cors'
    });

    if (!response.ok) {
      throw new Error('HTTP ' + response.status);
    }

    const blob = await response.blob();
    if (!blob || !blob.size) {
      throw new Error('Empty blob');
    }

    saveBlob(blob, filename);
  }

  function openFallback(url) {
    window.open(url, '_blank', 'noopener');
  }

  function setBtnState(text, disabled) {
    const btn = document.getElementById(BTN_ID);
    if (!btn) return;
    btn.textContent = text;
    btn.disabled = !!disabled;
  }

  async function handleDownload() {
    const url = findBestVideoUrl();

    if (!url) {
      alert('没有找到 mp4 地址，请先播放几秒后再试。');
      return;
    }

    const filename = getFilename();

    try {
      setBtnState('下载中...', true);
      await downloadByFetch(url, filename);
      setBtnState('下载完成', false);

      setTimeout(() => {
        setBtnState('下载当前视频', false);
      }, 1500);
    } catch (error) {
      console.warn('fetch 下载失败，回退为打开链接:', error);
      setBtnState('打开视频链接...', true);
      openFallback(url);

      setTimeout(() => {
        setBtnState('下载当前视频', false);
      }, 1500);
    }
  }

  function ensureButton() {
    if (document.getElementById(BTN_ID)) return;

    const btn = document.createElement('button');
    btn.id = BTN_ID;
    btn.textContent = '下载当前视频';
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      handleDownload();
    });

    if (document.body) {
      document.body.appendChild(btn);
    }
  }

  function executeAutomation() {
    injectStyle();
    ensureButton();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', executeAutomation);
  } else {
    executeAutomation();
  }

  const observer = new MutationObserver(() => {
    ensureButton();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();