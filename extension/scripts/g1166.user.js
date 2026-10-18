javascript:void(function(){
  var BUTTON_ID = 'eye-care-toggle-v7';
  var SOLARIZED_ID = 'eye-care-solarized-v7';
  var GREEN_ID = 'eye-care-green-v7';
  var GRAY_ID = 'eye-care-gray-v7';
  var currentMode = 'off'; // 'off' | 'solarized' | 'green' | 'gray'

  // 排除表单控件及其容器（含自定义开关/单选等组件），保留原生外观
  var FORM_EXCLUDE = ':not([type="checkbox"]):not([type="radio"]):not([type="range"])' +
    ':not(progress):not(meter)' +
    ':not([role="checkbox"]):not([role="radio"]):not([role="switch"])' +
    ':not(:has(input[type="checkbox"])):not(:has(input[type="radio"]))';

  // ========== 1. 柔和模式 CSS（Solarized 暖色调） ==========
  var SOLARIZED_CSS = [
    'html,body{background:#fdf6e3 !important;color:#657b83 !important;}',
    'body *:not(img):not(video):not(canvas):not(svg):not(path)' + FORM_EXCLUDE + '{',
    '  background-color:transparent !important;',
    '  color:#657b83 !important;',
    '  border-color:#dcd3c1 !important;',
    '}',
    // 表单控件内部子元素也排除（自定义开关内的 span/div 等）
    'label:has(input[type="checkbox"]),label:has(input[type="radio"]),[role="switch"],[role="checkbox"],[role="radio"]{',
    '  background-color:revert !important;color:revert !important;border-color:revert !important;',
    '}',
    'input' + FORM_EXCLUDE + ',textarea,select,button{background-color:#eee8d5 !important;color:#657b83 !important;}',
    'th,thead{background-color:#eee8d5 !important;}',
    'a,a:link,a:visited{color:#268bd2 !important;}',
    'hr{border-color:#dcd3c1 !important;}'
  ].join('');

  // ========== 2. 绿色模式 CSS（豆沙绿，WPS 兼容） ==========
  var GREEN_CSS = [
    'html,body{background:#cce8cf !important;color:#1f3b24 !important;}',
    'body *:not(img):not(video):not(canvas):not(svg):not(path)' + FORM_EXCLUDE + '{',
    '  background-color:transparent !important;',
    '  color:#1f3b24 !important;',
    '  border-color:#7faf83 !important;',
    '}',
    'label:has(input[type="checkbox"]),label:has(input[type="radio"]),[role="switch"],[role="checkbox"],[role="radio"]{',
    '  background-color:revert !important;color:revert !important;border-color:revert !important;',
    '}',
    'input' + FORM_EXCLUDE + ',textarea,select,button{background-color:#e4f3e6 !important;color:#1f3b24 !important;}',
    'a{color:#145f2a !important;}'
  ].join('');

  // ========== 2.5 灰度模式 CSS（仿电子书灰度配色） ==========
  var GRAY_CSS = [
    'html,body{background:#f0efe8 !important;color:#333333 !important;}',
    'body *:not(img):not(video):not(canvas):not(svg):not(path)' + FORM_EXCLUDE + '{',
    '  background-color:transparent !important;',
    '  color:#333333 !important;',
    '  border-color:#c0bfba !important;',
    '}',
    'label:has(input[type="checkbox"]),label:has(input[type="radio"]),[role="switch"],[role="checkbox"],[role="radio"]{',
    '  background-color:revert !important;color:revert !important;border-color:revert !important;',
    '}',
    'input' + FORM_EXCLUDE + ',textarea,select,button{background-color:#e4e3dd !important;color:#333333 !important;}',
    'th,thead{background-color:#e4e3dd !important;}',
    'a,a:link,a:visited{color:#555555 !important;}',
    'hr{border-color:#c0bfba !important;}',
    // 提升对比度，模拟纸张阅读感
    '::selection{background:#c8c6be !important;color:#1a1a1a !important;}'
  ].join('');

  // ========== 3. 模式切换核心逻辑 ==========
  function applyStyle(id, css) {
    var existing = document.getElementById(id);
    if (existing) return;
    var st = document.createElement('style');
    st.id = id;
    st.textContent = css;
    document.head.appendChild(st);
  }

  function removeStyle(id) {
    var st = document.getElementById(id);
    if (st) st.parentNode.removeChild(st);
  }

  function disableAll() {
    removeStyle(SOLARIZED_ID);
    removeStyle(GREEN_ID);
    removeStyle(GRAY_ID);
    currentMode = 'off';
  }

  function switchMode(mode) {
    if (mode === currentMode) return;
    disableAll();
    if (mode === 'solarized') {
      applyStyle(SOLARIZED_ID, SOLARIZED_CSS);
      currentMode = 'solarized';
    } else if (mode === 'green') {
      applyStyle(GREEN_ID, GREEN_CSS);
      currentMode = 'green';
    } else if (mode === 'gray') {
      applyStyle(GRAY_ID, GRAY_CSS);
      currentMode = 'gray';
    }
    updateMenuUI();
  }

  // ========== 4. 更新菜单按钮高亮 ==========
  function updateMenuUI() {
    var root = document.getElementById(BUTTON_ID);
    if (!root) return;
    var buttons = root.querySelectorAll('[data-mode]');
    for (var i = 0; i < buttons.length; i++) {
      var b = buttons[i];
      if (b.getAttribute('data-mode') === currentMode) {
        b.style.background = '#e0e0e0 !important';
        b.style.fontWeight = 'bold';
      } else {
        b.style.background = '';
        b.style.fontWeight = '';
      }
    }
  }

  // ========== 5. 创建可拖拽悬浮菜单面板 ==========
  function createTogglePanel() {
    var root = document.getElementById(BUTTON_ID);
    if (root) root.parentNode.removeChild(root);

    root = document.createElement('div');
    root.id = BUTTON_ID;
    root.setAttribute('data-eye-btn', '1');

    // 注入面板专属样式
    var panelStyle = document.createElement('style');
    panelStyle.id = BUTTON_ID + '-style';
    panelStyle.textContent = [
      '#' + BUTTON_ID + '{position:fixed;right:20px;bottom:20px;z-index:2147483647;',
      '  font-family:system-ui,-apple-system,sans-serif;user-select:none;touch-action:none;}',
      '#' + BUTTON_ID + ' .eye-ball{',
      '  width:48px;height:48px;border-radius:50%;border:none;cursor:pointer;',
      '  background:#586e75 !important;color:#fdf6e3 !important;',
      '  font-size:24px;display:flex;align-items:center;justify-content:center;',
      '  box-shadow:0 4px 16px rgba(0,0,0,.25);transition:transform .15s;}',
      '#' + BUTTON_ID + ' .eye-ball:hover{transform:scale(1.1);}',
      '#' + BUTTON_ID + ' .eye-menu{',
      '  display:none;position:absolute;right:0;bottom:58px;',
      '  width:92px;padding:6px;background:#fff !important;',
      '  border:1px solid #d0d7de;box-shadow:0 8px 24px rgba(0,0,0,.18);',
      '  border-radius:10px;}',
      '#' + BUTTON_ID + '.open .eye-menu{display:grid;gap:4px;}',
      '#' + BUTTON_ID + ' .eye-menu button{',
      '  width:100%;padding:7px 8px;border:1px solid #d0d7de;border-radius:6px;',
      '  background:#f6f8fa !important;color:#24292f !important;',
      '  font-size:13px;cursor:pointer;transition:background .15s;}',
      '#' + BUTTON_ID + ' .eye-menu button:hover{background:#eef2f6 !important;}'
    ].join('');
    document.head.appendChild(panelStyle);

    // 构建 HTML
    root.innerHTML = [
      '<div class="eye-menu">',
      '  <button type="button" data-mode="green">\uD83C\uDF3F 绿色</button>',
      '  <button type="button" data-mode="solarized">\u2600\uFE0F 柔和</button>',
      '  <button type="button" data-mode="gray">\uD83D\uDCD6 灰度</button>',
      '  <button type="button" data-mode="off">\u2716 关闭</button>',
      '</div>',
      '<button type="button" class="eye-ball" title="护眼模式">\uD83D\uDC41</button>'
    ].join('');

    document.body.appendChild(root);

    // 菜单点击事件
    root.querySelector('.eye-menu').addEventListener('click', function(e) {
      e.stopPropagation();
      var btn = e.target.closest('[data-mode]');
      if (!btn) return;
      switchMode(btn.getAttribute('data-mode'));
    });

    // 拖拽逻辑
    var eyeBall = root.querySelector('.eye-ball');
    var isDragging = false;
    var hasMoved = false;
    var startX, startY, origX, origY;

    function onPointerDown(clientX, clientY) {
      isDragging = true;
      hasMoved = false;
      startX = clientX;
      startY = clientY;
      var rect = eyeBall.getBoundingClientRect();
      origX = rect.left;
      origY = rect.top;
    }

    function onPointerMove(clientX, clientY) {
      if (!isDragging) return;
      var dx = clientX - startX;
      var dy = clientY - startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasMoved = true;
      var newX = Math.max(0, Math.min(window.innerWidth - 48, origX + dx));
      var newY = Math.max(0, Math.min(window.innerHeight - 48, origY + dy));
      root.style.left = newX + 'px';
      root.style.top = newY + 'px';
      root.style.right = 'auto';
      root.style.bottom = 'auto';
    }

    function onPointerUp() {
      if (!isDragging) return;
      isDragging = false;
      if (!hasMoved) {
        root.classList.toggle('open');
      }
    }

    // 鼠标事件
    eyeBall.addEventListener('mousedown', function(e) {
      e.preventDefault();
      onPointerDown(e.clientX, e.clientY);
    });
    document.addEventListener('mousemove', function(e) { onPointerMove(e.clientX, e.clientY); });
    document.addEventListener('mouseup', function() { onPointerUp(); });

    // 触屏事件
    eyeBall.addEventListener('touchstart', function(e) {
      e.preventDefault();
      var t = e.touches[0];
      onPointerDown(t.clientX, t.clientY);
    }, { passive: false });
    document.addEventListener('touchmove', function(e) {
      if (!isDragging) return;
      var t = e.touches[0];
      onPointerMove(t.clientX, t.clientY);
    }, { passive: true });
    document.addEventListener('touchend', function() { onPointerUp(); });

    // 点击其他地方关闭菜单
    document.addEventListener('click', function(e) {
      if (!root.contains(e.target)) {
        root.classList.remove('open');
      }
    });

    updateMenuUI();
  }

  // ========== 6. 主入口 ==========
  function init() {
    if (!document.body) return;
    var existing = document.getElementById(BUTTON_ID);
    if (existing) {
      // 已存在面板，循环切换模式：绿色 → 柔和 → 灰度 → 关闭
      var modes = ['green', 'solarized', 'gray', 'off'];
      var idx = modes.indexOf(currentMode);
      switchMode(modes[(idx + 1) % modes.length]);
      return;
    }
    // 默认开启绿色护眼 + 创建面板
    switchMode('green');
    createTogglePanel();
  }

  // 等待 body 就绪后执行
  if (document.body) {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', function() {
      init();
    });
  }
})();