(function () {
  if (window.__zhihuEnhancerActive) return;
  window.__zhihuEnhancerActive = true;

  const PURE = '__zhihu-pure-mode__';
  const P    = '.' + PURE;   // body class 前缀

  /* ── 1. 清除登录弹窗（原有功能） ── */
  function removeLoginModal() {
    ['.Modal-wrapper', '.Modal-backdrop', '.signFlowModal'].forEach((s) =>
      document.querySelectorAll(s).forEach((el) => el.remove())
    );
    document.body.style.overflow     = '';
    document.body.style.paddingRight = '';
    document.documentElement.style.overflow = '';
  }

  removeLoginModal();
  new MutationObserver(() => {
    if (document.querySelector('.signFlowModal, .Modal-backdrop')) removeLoginModal();
  }).observe(document.body, { childList: true, subtree: true });

  /* ── 2. 纯净阅读 CSS ── */

  // 需要隐藏的选择器（纯净模式激活时）
  const HIDE_SELECTORS = [
    /* 文章页侧边栏 */
    '.Post-Row-Content-right',
    /* 问答页侧边栏（含内部所有卡片） */
    '.Question-sideColumn',
    /* 通用广告 */
    '.Pc-card',
    '.pc-article-answer-big-img',
    '.pc-article-answer-text-chain',
    '.RichText-ADLinkCardContainer',
    '.FeeConsultCard',
    /* 页面底部备案号 / footer */
    'footer[role="contentinfo"]',
  ];

  // 拼接 CSS：body.PURE 前缀 + 各选择器
  const hideRule = HIDE_SELECTORS.map((s) => P + ' ' + s).join(', ')
    + ' { display: none !important; }';

  // 布局居中规则
  const layoutRules = [
    /* 文章页：隐藏右栏后正文居中 */
    P + ' .Post-Row-Content { display: block !important; }',
    P + ' .Post-Row-Content-left { max-width: 860px; margin: 0 auto; width: 100%; box-sizing: border-box; }',
    /* 问答页：隐藏右栏后正文居中 */
    P + ' .Question-main { display: block !important; }',
    P + ' .Question-mainColumn { max-width: 860px; margin: 0 auto; width: 100%; box-sizing: border-box; }',
    /* 去掉因隐藏侧栏产生的空白间距 */
    P + ' .Question-main > .ListShortcut { padding-right: 0 !important; }',
  ].join(' ');

  const styleEl = document.createElement('style');
  styleEl.id    = '__zhihu-pure-style__';
  styleEl.textContent = hideRule + ' ' + layoutRules;
  document.head.appendChild(styleEl);

  /* ── 3. 浮动切换按钮 ── */
  const btn  = document.createElement('button');
  btn.id     = '__zhihu-pure-btn__';
  let isPure = false;

  function syncBtn() {
    btn.textContent      = isPure ? '📖 退出纯净' : '📖 纯净阅读';
    btn.title            = isPure ? '退出纯净阅读模式' : '开启纯净阅读模式';
    btn.style.background = isPure ? '#0084ff' : '#f5f5f5';
    btn.style.color      = isPure ? '#fff'    : '#333';
  }

  Object.assign(btn.style, {
    position: 'fixed', bottom: '80px', right: '20px',
    zIndex: '99999', padding: '8px 14px', borderRadius: '20px',
    border: '1px solid #ddd', fontSize: '13px', fontFamily: 'sans-serif',
    cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,.15)',
    transition: 'all .2s', lineHeight: '1.4',
  });

  syncBtn();

  btn.addEventListener('click', () => {
    isPure = !isPure;
    document.body.classList.toggle(PURE, isPure);
    syncBtn();
  });

  function mount() {
    if (!document.getElementById('__zhihu-pure-btn__')) {
      document.body.appendChild(btn);
    }
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', mount)
    : mount();
})();