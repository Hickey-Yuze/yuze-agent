(function() {
  const SCRIPT_ID = 'bili-ad-highlighter-v2';
  if (document.getElementById(SCRIPT_ID)) return;

  const style = document.createElement('style');
  style.id = SCRIPT_ID;
  style.textContent = `
    span.bili-video-card__stats--text.__bili_ad_highlighted__ {
      font-size: 14px !important;
      font-weight: 600 !important;
      color: #ffffff !important;
      -webkit-text-stroke: 0 !important;
      text-shadow: none !important;
      background: linear-gradient(135deg, #FB7299, #fc8bab) !important;
      padding: 3px 10px 3px 8px !important;
      border-radius: 12px !important;
      z-index: 1 !important;
      position: relative !important;
      letter-spacing: 2px !important;
      line-height: 1.4 !important;
      box-shadow: 0 1px 6px rgba(251, 114, 153, 0.45) !important;
      animation: __bili_ad_pulse__ 2.5s ease-in-out infinite !important;
    }
    span.bili-video-card__stats--text.__bili_ad_highlighted__::before {
      content: '';
      display: inline-block;
      width: 20px;
      height: 20px;
      margin-right: 4px;
      vertical-align: middle;
      background-image: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><line x1='8' y1='2' x2='10' y2='6' stroke='white' stroke-width='1.5' stroke-linecap='round'/><line x1='16' y1='2' x2='14' y2='6' stroke='white' stroke-width='1.5' stroke-linecap='round'/><rect x='4' y='6' width='16' height='12' rx='2' fill='white'/><polygon points='10,9 10,15 15,12' fill='%23FB7299'/></svg>");
      background-size: contain;
      background-repeat: no-repeat;
      background-position: center;
    }
    @keyframes __bili_ad_pulse__ {
      0%, 100% { box-shadow: 0 1px 6px rgba(251, 114, 153, 0.45); }
      50% { box-shadow: 0 2px 12px rgba(251, 114, 153, 0.7); }
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