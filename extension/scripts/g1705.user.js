(function() {
  'use strict';

  var FLAG = 'baidu-cleaner-v5';
  var STYLE_ID = 'bc-style';

  var currentState = document.documentElement.getAttribute('data-' + FLAG);

  if (currentState === '1') {
    disable();
    return;
  }

  enable();

  /* ========== 关闭美化 ========== */
  function disable() {
    document.documentElement.setAttribute('data-' + FLAG, '0');

    var style = document.getElementById(STYLE_ID);
    if (style && style.parentNode) style.parentNode.removeChild(style);

    var tags = document.querySelectorAll('.bc-ai-tag');
    for (var i = 0; i < tags.length; i++) {
      if (tags[i].parentNode) tags[i].parentNode.removeChild(tags[i]);
    }

    var cards = document.querySelectorAll('[data-bc-ai-tag]');
    for (var j = 0; j < cards.length; j++) {
      cards[j].removeAttribute('data-bc-ai-tag');
    }
  }

  /* ========== 开启美化 ========== */
  function enable() {
    document.documentElement.setAttribute('data-' + FLAG, '1');
    injectCSS();
    addAITag();
    cleanFormTracking();
    startObserver();
  }

  /* ========== CSS 注入（所有隐藏均用 CSS，不用 removeChild） ========== */
  function injectCSS() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = [
      /* ===== 广告屏蔽（纯 CSS） ===== */
      '.ec-tuiguang,.ec-vcion,.ec-no-wshadow,.m12mvnb,',
      '[class*="tuiguang"],.ec_youxuan,.ec_wise_ad,.ec_bdtg,',
      '.ec_ad_results,.ec_brightword,[cmatchid],',
      '.c-recomm-wrap,.gp2k11k,.ec_desc,.ec_d20_recomm_link,',
      '.ec-pc-huanxin-grid.EC_result,',
      '#content_right,',
      '.FYB_RD,#con-ar,#con-ceiling-wrapper,',
      '#rs_new,.list_1V4Yg,.title_Zinx-,',
      '.cosc-feedback-form,',
      '#result_tts_player,',
      '.search-quit-dialog-wrap,',
      '#bottom_layer,',
      '#chat-input-panel,',
      '.interact-container_440HL,.deep-search_6Huzl,',
      '.share-container_2sY3t,.download_3UXof,',
      '.copy_4oOrz,.feedback_2REFq,',
      '.cosd-search-header-brand-ai,',
      '#aging-tools-wrapper,',
      '.c-tools,',
      '.agent-wrapper_Ycxpf,',
      '.share-content-long-img_1kfCV,',
      '.pc-rg-upgrade_2X3zi{display:none!important}',

      /* ===== 文心智能体条目屏蔽 ===== */
      '#content_left .result-op:has(.cosc-source-text:not([href])):has(.card-title_6qPL6),',
      '#content_left .result-op:has(.agent-wrapper_Ycxpf){display:none!important}',

      /* ===== AI 卡片蓝线移除 ===== */
      '.wenda-general_72WpQ{border-left:none!important}',

      /* ===== AI 生成标签 ===== */
      '.bc-ai-tag{',
      'display:inline-flex!important;align-items:center!important;',
      'margin-bottom:10px!important;padding:3px 10px!important;',
      'border-radius:12px!important;font-size:12px!important;',
      'line-height:1.5!important;font-weight:500!important;',
      'background:#f0e6ff!important;color:#7c3aed!important;',
      'letter-spacing:.5px!important;user-select:none!important}',
      '.bc-ai-tag svg{width:14px!important;height:14px!important;',
      'margin-right:5px!important;flex-shrink:0!important}',

      /* ===== 结果区居中 (不动顶栏) ===== */
      '#wrapper_wrapper{max-width:840px!important;margin:0 auto!important}',
      '#content_left{width:100%!important;max-width:100%!important;padding:16px 0!important}',

      /* 卡片化 */
      '#content_left>.c-container,#content_left>.result,#content_left>.result-op{',
      'background:#fff!important;border-radius:10px!important;',
      'padding:18px 22px!important;margin-bottom:10px!important;',
      'box-shadow:0 1px 3px rgba(0,0,0,.05)!important;border:1px solid #eee!important;',
      'transition:box-shadow .2s ease!important}',
      '#content_left>.c-container:hover,#content_left>.result:hover,#content_left>.result-op:hover{',
      'box-shadow:0 3px 10px rgba(0,0,0,.09)!important}',

      /* 标题 */
      '#content_left h3 a,#content_left .t a{font-size:16px!important;line-height:1.5!important;color:#2440b3!important;text-decoration:none!important}',
      '#content_left h3 a:hover,#content_left .t a:hover{color:#3266cc!important}',

      /* 摘要 */
      '#content_left .c-abstract,#content_left .c-color-text{font-size:14px!important;line-height:1.7!important;color:#555!important}',
      '#content_left .c-showurl,#content_left .cosc-source-text{color:#999!important;font-size:13px!important}',

      /* AI摘要排版 */
      '.wenda-general_72WpQ .marklang{font-size:14px!important;line-height:1.8!important}',

      /* 全局字体 */
      'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Noto Sans SC",sans-serif!important;background:#f7f8fa!important}',

      /* 分页 */
      '#page{background:transparent!important;padding:14px 0!important}',
      '#page a,#page strong{border-radius:6px!important;min-width:34px!important;height:34px!important;line-height:34px!important}'
    ].join('');
    (document.head || document.documentElement).appendChild(s);
  }

  /* ========== AI 生成标签 ========== */
  function addAITag() {
    var cards = document.querySelectorAll('.wenda-general_72WpQ');
    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      if (card.getAttribute('data-bc-ai-tag')) continue;
      card.setAttribute('data-bc-ai-tag', '1');

      var container = card.querySelector('.content-container_6NKPM');
      if (!container) continue;

      var tag = document.createElement('div');
      tag.className = 'bc-ai-tag';
      tag.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a4 4 0 0 1 4 4v1a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z"/><path d="M16 11a4 4 0 0 1 0 8H8a4 4 0 0 1 0-8"/><circle cx="12" cy="15" r="1"/></svg>AI 生成';
      container.parentNode.insertBefore(tag, container);
    }
  }

  /* ========== 清理追踪参数（不可逆，但不影响视觉） ========== */
  function cleanFormTracking() {
    try {
      var params = ['rsv_pq','rsv_t','rsv_bp','rsv_idx','rsv_enter','rsv_dl','rsv_sug1','rsv_sug2','rsv_sug3','rsv_sug7','rsv_btype','rqlang','inputT'];
      var form = document.getElementById('form');
      if (!form) return;
      for (var i = 0; i < params.length; i++) {
        var inp = form.querySelector('input[name="' + params[i] + '"]');
        if (inp && inp.parentNode) inp.parentNode.removeChild(inp);
      }
    } catch (e) {}
  }

  /* ========== MutationObserver ========== */
  function startObserver() {
    var target = document.getElementById('content_left');
    if (!target) return;
    var timer = null;
    try {
      new MutationObserver(function() {
        if (document.documentElement.getAttribute('data-' + FLAG) !== '1') return;
        if (timer) clearTimeout(timer);
        timer = setTimeout(function() {
          timer = null;
          addAITag();
        }, 500);
      }).observe(target, { childList: true, subtree: true });
    } catch (e) {}
  }

})();