(function() {
  const STYLE_ID = '__xhs_hide_feed__';
  const LOGO_ID = '__xhs_search_only_logo__';
  const BTN_ID = '__xhs_restore_btn__';

  window.__xhsSearchOnly = true;

  const oldStyle = document.getElementById(STYLE_ID);
  if (oldStyle) oldStyle.remove();

  const oldLogo = document.getElementById(LOGO_ID);
  if (oldLogo) oldLogo.remove();

  const oldBtn = document.getElementById(BTN_ID);
  if (oldBtn) oldBtn.remove();

  document.querySelectorAll('[data-xhs-hidden]').forEach(el => {
    el.style.removeProperty('display');
    el.removeAttribute('data-xhs-hidden');
  });

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .side-bar.side-bar-ai {
      display: none !important;
    }

    .main-content.with-side-bar {
      margin-left: 0 !important;
      padding-left: 0 !important;
      width: 100% !important;
    }

    body:not([data-xhs-search-result="1"]) .ai-header-container .search-area-in-header {
      display: none !important;
    }

    body[data-xhs-search-result="1"] .ai-header-container,
    body[data-xhs-search-result="1"] .ai-header-container .search-area-in-header {
      display: flex !important;
      visibility: visible !important;
      opacity: 1 !important;
      pointer-events: auto !important;
    }

    body[data-xhs-search-result="1"] .ai-header-container .search-box-in-header,
    body[data-xhs-search-result="1"] .ai-header-container .input-box,
    body[data-xhs-search-result="1"] .ai-header-container .wendian-wrapper {
      display: flex !important;
      visibility: visible !important;
      opacity: 1 !important;
      pointer-events: auto !important;
    }

    body[data-xhs-search-result="1"] .ai-header-container {
      width: 100% !important;
    }

    body[data-xhs-search-result="1"] .ai-header-container .search-area-in-header {
      width: calc(100vw - 120px) !important;
      max-width: 1840px !important;
      margin-left: auto !important;
      margin-right: auto !important;
    }

    body[data-xhs-search-result="1"] .ai-header-container .search-box-in-header,
    body[data-xhs-search-result="1"] .ai-header-container .input-box,
    body[data-xhs-search-result="1"] .ai-header-container .wendian-wrapper,
    body[data-xhs-search-result="1"] .ai-header-container .textarea-container {
      width: 100% !important;
      max-width: none !important;
    }

    .channel-container {
      display: none !important;
    }

    #exploreFeeds,
    #feeds-replace-loading,
    .feeds-loading {
      display: none !important;
    }

    .floating-btn-sets {
      display: none !important;
    }

    .bottom-menu-ai {
      display: none !important;
    }

    .reds-alert {
      display: none !important;
    }

    .container.out.right {
      display: none !important;
    }

    .ad-wrap {
      display: none !important;
    }

    #__xhs_search_only_logo__ {
      position: fixed !important;
      top: 22px !important;
      left: 28px !important;
      transform: none !important;
      z-index: 100000 !important;
      display: block !important;
      color: #ff2442 !important;
      font-size: 22px !important;
      font-weight: 800 !important;
      line-height: 1 !important;
      letter-spacing: 0 !important;
      text-decoration: none !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC",
        "Microsoft YaHei", sans-serif !important;
    }

    #__xhs_search_only_logo__ svg,
    #__xhs_search_only_logo__ img {
      display: block !important;
      width: auto !important;
      max-width: 92px !important;
      height: 32px !important;
      object-fit: contain !important;
    }

    .search-area.search-area-opacity {
      display: flex !important;
      justify-content: center !important;
      align-items: center !important;
      position: fixed !important;
      top: 50% !important;
      left: 50% !important;
      transform: translate(-50%, -50%) !important;
      width: calc(100vw - 120px) !important;
      max-width: 1840px !important;
      padding: 0 !important;
      margin: 0 !important;
      opacity: 1 !important;
      z-index: 99999 !important;
    }

    body[data-xhs-search-result="1"] .search-area.search-area-opacity {
      display: none !important;
    }

    .search-area .search-box-in-content {
      width: 100% !important;
      max-width: none !important;
    }

    .search-area .input-box {
      width: 100% !important;
    }

    .search-area .wendian-wrapper {
      width: 100% !important;
    }

    .search-area .textarea-container {
      width: 100% !important;
      min-height: 52px !important;
    }

    .search-area .textarea {
      font-size: 16px !important;
    }

    .layout.ai-layout {
      justify-content: center !important;
    }

    #mfContainer.feeds-page {
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      min-height: 100vh !important;
    }

    body:not([data-xhs-search-result="1"]) {
      overflow: hidden !important;
      background: #fff !important;
    }

    html[data-xhs-search-result="1"],
    body[data-xhs-search-result="1"] {
      overflow: auto !important;
      background: #fff !important;
    }
  `;
  document.head.appendChild(style);

  function ensureLogo() {
    let logo = document.getElementById(LOGO_ID);
    if (logo) return logo;

    const nativeLogo = document.querySelector(
      '.side-bar.side-bar-ai a[href*="/explore"], .side-bar.side-bar-ai [class*="logo"], a[href="/explore"] [class*="logo"], a[href*="/explore"] [class*="logo"]'
    );

    logo = document.createElement('a');
    logo.id = LOGO_ID;
    logo.href = 'https://www.xiaohongshu.com/explore';
    logo.setAttribute('aria-label', '小红书首页');

    if (nativeLogo) {
      const clone = nativeLogo.cloneNode(true);
      clone.removeAttribute('id');
      logo.appendChild(clone);
    } else {
      logo.textContent = '小红书';
    }

    document.body.appendChild(logo);
    return logo;
  }

  function syncPageMode() {
    const isResultPage = location.pathname.indexOf('/search_result') === 0;
    document.documentElement.setAttribute('data-xhs-search-result', isResultPage ? '1' : '0');
    document.body.setAttribute('data-xhs-search-result', isResultPage ? '1' : '0');
    ensureLogo();
  }

  function dismissAlerts() {
    document.querySelectorAll('.reds-alert').forEach(alert => {
      const btn = alert.querySelector('.reds-alert-footer__right');
      if (btn) btn.click();
    });
  }

  function boot() {
    syncPageMode();
    dismissAlerts();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  setTimeout(boot, 1000);
  setTimeout(boot, 2500);
  setInterval(syncPageMode, 500);

  console.log('[xhs] 已切换为只保留 logo 和搜索框');
})();