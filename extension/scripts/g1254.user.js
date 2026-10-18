(function() {
  const SCRIPT_ID = 'bili-ad-highlighter-v2';
  if (document.getElementById(SCRIPT_ID)) return;

  const style = document.createElement('style');
  style.id = SCRIPT_ID;
  style.textContent = `
    span.bili-video-card__stats--text.__bili_ad_highlighted__ {
      font-size: 150px !important;
      font-weight: 900 !important;
      color: #ff0000 !important;
      -webkit-text-stroke: 5.5px #ffffff !important;
      paint-order: stroke fill !important;
      text-shadow:
        -1px -1px 0 #fff,
         1px -1px 0 #fff,
        -1px  1px 0 #fff,
         1px  1px 0 #fff,
         0px  2px 0 #fff,
         0px -2px 0 #fff,
         2px  0px 0 #fff,
        -2px  0px 0 #fff !important;
      background: rgba(255, 0, 0, 0.15) !important;
      padding: 1px 4px !important;
      border-radius: 2px !important;
      z-index: 9999 !important;
      position: relative !important;
    }
  `;
  document.head.appendChild(style);

  const SELECTOR = 'span.bili-video-card__stats--text';

  function highlightElement(el) {
    if (!el || el.classList.contains('__bili_ad_highlighted__')) return;
    if (el.textContent.trim() === '广告') {
      el.classList.add('__bili_ad_highlighted__');
    }
  }

  function scan() {
    if (!document.body) return;
    document.querySelectorAll(SELECTOR).forEach(highlightElement);
  }

  function execute() {
    scan();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', execute);
  } else {
    execute();
  }

  let timer = null;
  const observer = new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(execute, 300);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  let scrollTimer = null;
  window.addEventListener('scroll', () => {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(execute, 500);
  }, { passive: true });
})();