(function () {

    const AD_BLOCKER_ID = '__tab_ad_blocker__';
    if (document.getElementById(AD_BLOCKER_ID)) return;
    console.log('[SimpleAdBlocker] 正在初始化');

    const style = document.createElement('style');
    style.id = AD_BLOCKER_ID;
    style.textContent = `
    /* 通用广告选择器 - 直接隐藏 */
    [id^="google_ads"],
    [id^="div-gpt-ad"],
    [id*="AdSlot"],
    [id*="ad_banner"],
    [id*="ad-container"],
    [id*="ad-wrapper"],
    [id*="ad-wrapper"],
    [class*="ad-banner"],
    [class*="ad-container"],
    [class*="ad-wrapper"],
    [class*="ad-slot"],
    [class*="ad-slot"],
    [class*="adsbox"],
    [class*="adsense"],
    [class*="ad-placement"],
    [class*="sponsored"],
    [class*="sponsor-banner"],
    [class*="promotion-banner"],
    [class*="popup-ad"],
    [class*="modal-ad"],
    [class*="interstitial"],
    [class*="sticky-ad"],
    [class*="floating-ad"],
    [class*="video-ad"],
    [class*="preroll"],
    [class*="in-feed-ad"],
    [class*="native-ad"],
    ins.adsbygoogle,
    iframe[src*="doubleclick.net"],
    iframe[src*="googlesyndication"],
    iframe[src*="googleadservices"],
    iframe[src*="adnxs"],
    iframe[src*="amazon-adsystem"],
    iframe[src*="facebook.com/plugins"],
    iframe[src*="taboola"],
    iframe[src*="outbrain"],
    div[id^="taboola"],
    div[class^="taboola"],
    div[id^="outbrain"],
    div[class^="OUTBRAIN"],
    [class*="recommendation-box"],
    [aria-label*="Advertisement"],
    [aria-label*="Sponsored"],
    [data-ad],
    [data-ad-slot],
    [data-adunit],
    [data-ad-client] {
      display: none !important;
      visibility: hidden !important;
      height: 0 !important;
      overflow: hidden !important;
      pointer-events: none !important;
    }
  `;
    (document.head || document.documentElement).appendChild(style);

    const AD_DOMAINS = [
        'doubleclick.net', 'googlesyndication.com', 'googleadservices.com',
        'google-analytics.com', 'adnxs.com', 'amazon-adsystem.com',
        'taboola.com', 'outbrain.com', 'criteo.com', 'moatads.com',
        'scorecardresearch.com', 'adbrite.com', 'exoclick.com',
        'popads.net', 'adroll.com', 'hotjar.com', 'quantserve.com'
    ];

    function isAdIframe(iframe) {
        const src = (iframe.src || '').toLowerCase();
        return AD_DOMAINS.some(domain => src.includes(domain));
    }

    function removeAds() {
        document.querySelectorAll('iframe').forEach(iframe => {
            if (isAdIframe(iframe)) {
                iframe.remove();
            }
        });

        const popupSelectors = [
            '[class*="popup"]',
            '[class*="overlay-ad"]',
            '[class*="modal-ad"]',
            '[id*="popup"]'
        ];
        popupSelectors.forEach(sel => {
            document.querySelectorAll(sel).forEach(el => {
                const text = (el.textContent || '').toLowerCase();
                const isAd =
                    text.includes('广告') || text.includes('ad') ||
                    text.includes('sponsor') || text.includes('推广') ||
                    text.includes('sponsor') || text.includes('promotion');
                const hasCloseBtn = el.querySelector('[class*="close"], [class*="dismiss"]');
                if (isAd || hasCloseBtn) {
                    const realClose = el.querySelector(
                        '[class*="close"]:not([class*="download"]):not([class*="install"]), ' +
                        '[class*="dismiss"], [aria-label="Close"], [aria-label="关闭"]'
                    );
                    if (realClose && isAd) {
                        realClose.click();
                    } else if (isAd) {
                        el.remove();
                    }
                }
            });
        });
    }

    removeAds();

    let debounceTimer = null;
    const observer = new MutationObserver(() => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(removeAds, 300);
    });
    observer.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true
    });

    console.log('[SimpleAdBlocker] 简易广告屏蔽器已启动');
    console.log('[SimpleAdBlocker] 建议反馈: admin@apakp.top');
})();