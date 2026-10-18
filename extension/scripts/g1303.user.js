(function () {
  if (window.__COPY_URL_CMD_SHIFT_C__) return;
  window.__COPY_URL_CMD_SHIFT_C__ = true;

  const TOAST_ID = '__copy_url_toast__';

  async function copy(text) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }

  function showToast(message) {
    let toast = document.getElementById(TOAST_ID);

    if (!toast) {
      toast = document.createElement('div');
      toast.id = TOAST_ID;
      toast.style.cssText = `
        position: fixed;
        top: 16px;
        right: 16px;
        z-index: 2147483647;
        padding: 10px 14px;
        background: rgba(0, 0, 0, 0.8);
        color: #fff;
        font-size: 13px;
        border-radius: 8px;
        box-shadow: 0 6px 20px rgba(0,0,0,0.2);
        opacity: 0;
        transform: translateY(-6px);
        transition: opacity .2s ease, transform .2s ease;
        pointer-events: none;
      `;
      document.body.appendChild(toast);
    }

    toast.textContent = message;

    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });

    clearTimeout(toast.__hideTimer__);
    toast.__hideTimer__ = setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-6px)';
    }, 1800);
  }

  function onKeydown(e) {
    // macOS: Command + Shift + C
    if (e.metaKey && e.shiftKey && e.key.toLowerCase() === 'c') {
      e.preventDefault();

      const title = document.title || '未命名页面';
      const url = location.href;
      const text = `${title} | ${url}`;

      copy(text)
        .then(() => {
          showToast('复制网址信息成功');
        })
        .catch(err => {
          console.error('复制失败', err);
        });
    }
  }

  window.addEventListener('keydown', onKeydown, true);
})();