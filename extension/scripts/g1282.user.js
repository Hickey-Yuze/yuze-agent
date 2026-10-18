(function() {
  const BEAN_GREEN = '#C7EDCC';

  const AD_SELECTORS = [
    '.godR', '.godA', '.god-article-bottom',
    '._0u4o3bh76zbp', '.left-bottom-float-fullScreenSleepContainer',
    '.left-bottom-float', '#god_bottom_banner',
    '#right-side-bar', '#hot-news-container', '#recommend-writer',
    '#topScrollPic', '.hot-atlas', '#bottomPicList',
    '#articleAllsee', '.allsee-list', '.bottom-relate-wrap',
    '#sohu-play-content', '#articleTransfer', '#bannedNotice',
    '#float-btn', '.float-links',
    '#god_1', '#god_1_2', '#god_2', '#god_2_2',
    '#god_3', '#god_3_2', '#god_4', '#god_4_2',
    '#god_5', '#god_6_2', '#god_fix_1',
    '#nav_button', '#top_push', '#articleReport',
    '#article-like', '.read-wrap', '.user-god',
    '#discuss', '#groomRead', '#commentList',
    '#meComment', '.phone-scan-c',
    '.share-icons-c', '#qrcode', '.share-interaction-c.fixed',
    '#browseInPhone', '.comment-submit',
    '#left-bottom-god', '.left-bottom-float-fullScreenSleep'
  ];

  const adRule = AD_SELECTORS.join(',') + '{display:none!important;visibility:hidden!important;height:0!important;overflow:hidden!important;margin:0!important;padding:0!important;}';

  const style = document.createElement('style');
  style.id = 'tabbit-sohu-clean';
  style.textContent = adRule + `
    body, .wrapper-box {
      background-color: ${BEAN_GREEN} !important;
    }
    #article-container {
      background-color: ${BEAN_GREEN} !important;
    }
    .area.clearfix,
    .column.left,
    .left.main {
      background-color: ${BEAN_GREEN} !important;
    }
    article.article,
    #mp-editor,
    .text {
      background-color: ${BEAN_GREEN} !important;
    }
    #main-header,
    .head-container {
      background-color: ${BEAN_GREEN} !important;
    }
    .user-info,
    #user-info {
      background-color: ${BEAN_GREEN} !important;
    }
    .statement {
      background-color: ${BEAN_GREEN} !important;
      color: #666 !important;
    }
    .text-title h1 {
      color: #2c3e50 !important;
    }
    article.article p {
      color: #333 !important;
      line-height: 1.9 !important;
    }
    .share-interaction {
      background-color: ${BEAN_GREEN} !important;
    }
  `;

  if (!document.getElementById('tabbit-sohu-clean')) {
    document.head.appendChild(style);
  }

  function removeAds() {
    AD_SELECTORS.forEach(function(selector) {
      var els = document.querySelectorAll(selector);
      els.forEach(function(el) {
        el.style.display = 'none';
        el.style.visibility = 'hidden';
        el.style.height = '0';
        el.style.overflow = 'hidden';
      });
    });

    document.querySelectorAll('iframe').forEach(function(el) {
      el.style.display = 'none';
      el.style.height = '0';
    });

    document.querySelectorAll('[id^="god_"]').forEach(function(el) {
      if (!el.closest('article') && !el.closest('.text-title')) {
        el.style.display = 'none';
        el.style.height = '0';
        el.style.overflow = 'hidden';
      }
    });
  }

  function applyBackground() {
    var bgSelectors = [
      'body', '.wrapper-box', '#article-container',
      '.area', '.column.left', '.left.main',
      'article.article', '#mp-editor', '.text',
      '#main-header', '.head-container',
      '.user-info', '#user-info',
      '.statement', '.share-interaction'
    ];
    bgSelectors.forEach(function(sel) {
      document.querySelectorAll(sel).forEach(function(el) {
        el.style.backgroundColor = BEAN_GREEN;
      });
    });
  }

  function execute() {
    removeAds();
    applyBackground();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', execute);
  } else {
    execute();
  }

  var observer = new MutationObserver(function() {
    removeAds();
    applyBackground();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  setTimeout(function() { observer.disconnect(); }, 15000);
})();