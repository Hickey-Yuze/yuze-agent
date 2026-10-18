(function() {
  const ROOT_ID = 'page-helper-floating-ball';
  const STYLE_ID = 'page-helper-floating-style';
  const EYE_STYLE_ID = 'page-helper-eye-style';

  const existing = document.getElementById(ROOT_ID);
  if (existing) {
    existing.remove();
    const oldStyle = document.getElementById(STYLE_ID);
    if (oldStyle) oldStyle.remove();
  }

  let fontScale = Number(document.documentElement.getAttribute('data-page-helper-font-scale') || '1');

  const applyFontScale = () => {
    document.documentElement.style.fontSize = `${fontScale * 100}%`;
    document.documentElement.setAttribute('data-page-helper-font-scale', String(fontScale));
  };

  const enableEyeCare = () => {
    let eyeStyle = document.getElementById(EYE_STYLE_ID);
    if (!eyeStyle) {
      eyeStyle = document.createElement('style');
      eyeStyle.id = EYE_STYLE_ID;
      eyeStyle.textContent = `
        html,
        body {
          background: #cce8cf !important;
          color: #1f3b24 !important;
        }

        body *:not(img):not(video):not(canvas):not(svg):not(path) {
          background-color: transparent !important;
          color: #1f3b24 !important;
          border-color: #7faf83 !important;
        }

        input,
        textarea,
        select,
        button {
          background-color: #e4f3e6 !important;
          color: #1f3b24 !important;
        }

        a {
          color: #145f2a !important;
        }
      `;
      document.head.appendChild(eyeStyle);
    }
  };

  const disableEyeCare = () => {
    const eyeStyle = document.getElementById(EYE_STYLE_ID);
    if (eyeStyle) eyeStyle.remove();
  };

  const restorePage = () => {
    fontScale = 1;
    document.documentElement.style.fontSize = '';
    document.documentElement.removeAttribute('data-page-helper-font-scale');
    disableEyeCare();
  };

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${ROOT_ID} {
      position: fixed;
      right: 24px;
      bottom: 96px;
      z-index: 2147483647;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    #${ROOT_ID} .helper-ball {
      width: 54px;
      height: 54px;
      border-radius: 50%;
      border: none;
      background: #1677ff;
      color: #fff;
      font-size: 24px;
      cursor: pointer;
      box-shadow: 0 8px 24px rgba(0,0,0,.24);
    }

    #${ROOT_ID} .helper-menu {
      display: none;
      position: absolute;
      right: 0;
      bottom: 66px;
      width: 96px;
      padding: 8px;
      background: #fff;
      border: 1px solid #d0d7de;
      box-shadow: 0 10px 30px rgba(0,0,0,.18);
      border-radius: 8px;
    }

    #${ROOT_ID}.open .helper-menu {
      display: grid;
      gap: 6px;
    }

    #${ROOT_ID} .helper-menu button {
      width: 100%;
      padding: 8px 10px;
      border: 1px solid #d0d7de;
      border-radius: 6px;
      background: #f6f8fa;
      color: #24292f;
      font-size: 14px;
      cursor: pointer;
    }

    #${ROOT_ID} .helper-menu button:hover {
      background: #eef2f6;
    }
  `;
  document.head.appendChild(style);

  const root = document.createElement('div');
  root.id = ROOT_ID;
  root.innerHTML = `
    <div class="helper-menu">
      <button type="button" data-action="increase">增大</button>
      <button type="button" data-action="decrease">减小</button>
      <button type="button" data-action="eye">护眼</button>
      <button type="button" data-action="restore">恢复</button>
    </div>
    <button type="button" class="helper-ball" title="页面助手">☰</button>
  `;

  document.body.appendChild(root);

  root.querySelector('.helper-ball').addEventListener('click', function(event) {
    event.stopPropagation();
    root.classList.toggle('open');
  });

  root.querySelector('.helper-menu').addEventListener('click', function(event) {
    event.stopPropagation();

    const button = event.target.closest('button[data-action]');
    if (!button) return;

    const action = button.getAttribute('data-action');

    if (action === 'increase') {
      fontScale = Math.min(fontScale + 0.1, 2);
      applyFontScale();
    }

    if (action === 'decrease') {
      fontScale = Math.max(fontScale - 0.1, 0.6);
      applyFontScale();
    }

    if (action === 'eye') {
      enableEyeCare();
    }

    if (action === 'restore') {
      restorePage();
    }
  });

  document.addEventListener('click', function() {
    root.classList.remove('open');
  });

  applyFontScale();
})();