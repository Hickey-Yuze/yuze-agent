(function() {
  if (window.__modelscopeMdDownloaderInjected) return;
  window.__modelscopeMdDownloaderInjected = true;

  function getModelPathFromUrl() {
    const match = window.location.pathname.match(/^\/models\/([^/]+\/[^/]+)/);
    return match ? match[1] : null;
  }

  function createDownloadButton() {
    const existingBtn = document.getElementById('ms-md-download-btn');
    if (existingBtn) existingBtn.remove();

    const btn = document.createElement('div');
    btn.id = 'ms-md-download-btn';
    btn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;flex-shrink:0">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      <span>下载 Markdown</span>
    `;
    Object.assign(btn.style, {
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: '99999',
      display: 'flex',
      alignItems: 'center',
      padding: '10px 18px',
      backgroundColor: '#6f42c1',
      color: '#fff',
      borderRadius: '24px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
      boxShadow: '0 4px 14px rgba(111,66,193,0.4)',
      transition: 'all 0.25s ease',
      userSelect: 'none',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    });

    btn.addEventListener('mouseenter', () => {
      btn.style.backgroundColor = '#5a32a3';
      btn.style.transform = 'translateY(-2px)';
      btn.style.boxShadow = '0 6px 20px rgba(111,66,193,0.5)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.backgroundColor = '#6f42c1';
      btn.style.transform = 'translateY(0)';
      btn.style.boxShadow = '0 4px 14px rgba(111,66,193,0.4)';
    });

    btn.addEventListener('click', handleDownload);
    document.body.appendChild(btn);
    return btn;
  }

  async function handleDownload() {
    const btn = document.getElementById('ms-md-download-btn');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = `<span style="display:flex;align-items:center;">⏳ 下载中...</span>`;
    btn.style.pointerEvents = 'none';

    try {
      const modelPath = getModelPathFromUrl();
      if (!modelPath) {
        showToast('❌ 无法识别模型路径，请确认当前页面为模型详情页', 'error');
        return;
      }

      const apiUrl = `https://modelscope.cn/api/v1/models/${modelPath}`;
      const resp = await fetch(apiUrl);
      if (!resp.ok) throw new Error(`API 请求失败: ${resp.status}`);

      const json = await resp.json();
      if (!json.Success && json.Code !== 200) throw new Error(json.Message || 'API 返回异常');

      const data = json.Data;
      const mdContent = data.ReadMeContent || '';
      if (!mdContent.trim()) {
        showToast('⚠️ 该模型暂无 Markdown 介绍内容', 'warning');
        return;
      }

      const fileName = `${modelPath.replace(/\//g, '_')}.md`;
      downloadTextFile(mdContent, fileName);
      showToast(`✅ 已下载 ${fileName}`, 'success');
    } catch (err) {
      console.error('[ModelScope MD Downloader] Error:', err);
      showToast(`❌ 下载失败: ${err.message}`, 'error');
    } finally {
      btn.innerHTML = originalHTML;
      btn.style.pointerEvents = 'auto';
    }
  }

  function downloadTextFile(content, filename) {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 100);
  }

  function showToast(message, type) {
    const existingToast = document.getElementById('ms-md-toast');
    if (existingToast) existingToast.remove();

    const colors = {
      success: { bg: '#10b981', border: '#059669' },
      error:   { bg: '#ef4444', border: '#dc2626' },
      warning: { bg: '#f59e0b', border: '#d97706' }
    };
    const { bg, border } = colors[type] || colors.success;

    const toast = document.createElement('div');
    toast.id = 'ms-md-toast';
    toast.textContent = message;
    Object.assign(toast.style, {
      position: 'fixed',
      top: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: '100000',
      padding: '12px 24px',
      backgroundColor: bg,
      color: '#fff',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '500',
      boxShadow: `0 4px 12px ${bg}80`,
      border: `1px solid ${border}`,
      transition: 'opacity 0.3s ease',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    });
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  function init() {
    const modelPath = getModelPathFromUrl();
    if (!modelPath) return;
    createDownloadButton();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  let lastUrl = location.href;
  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(init, 500);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();