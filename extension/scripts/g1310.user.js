(function() {
  if (window.__xhsRedirectAndUnmaskExecuted__) return;
  window.__xhsRedirectAndUnmaskExecuted__ = true;

  function restoreScroll() {
    [document.documentElement, document.body].forEach(el => {
      if (!el) return;
      el.style.setProperty('overflow', 'auto', 'important');
      el.style.setProperty('position', 'static', 'important');
      el.style.setProperty('height', 'auto', 'important');
      el.style.setProperty('touch-action', 'auto', 'important');
    });
  }

  function hideElement(el) {
    if (!el) return;
    el.style.setProperty('display', 'none', 'important');
    el.style.setProperty('visibility', 'hidden', 'important');
    el.style.setProperty('opacity', '0', 'important');
    el.style.setProperty('pointer-events', 'none', 'important');
    el.setAttribute('aria-hidden', 'true');
  }

  function removeLoginLayers() {
    const selectors = [
      '.login-modal',
      '.login-container',
      '.reds-modal',
      '.reds-mask',
      '.reds-alert',
      '.reds-alert-mask'
    ];

    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(hideElement);
    });

    restoreScroll();
  }

  function getRedirectUrl() {
    const url = new URL(window.location.href);
    const redirectPath = url.searchParams.get('redirectPath');
    if (!redirectPath) return null;

    try {
      if (/^https?:\/\//i.test(redirectPath)) {
        return redirectPath;
      }
      return new URL(redirectPath, window.location.origin).toString();
    } catch (err) {
      console.warn('Failed to parse redirectPath:', err);
      return null;
    }
  }

  function isLoginPage() {
    return location.pathname === '/login' || !!document.querySelector('.login-modal, .login-container');
  }

  function executeAutomation() {
    console.log('Executing automation script...');

    if (isLoginPage()) {
      const targetUrl = getRedirectUrl();
      if (targetUrl && targetUrl !== window.location.href) {
        console.log('Redirecting to real content page:', targetUrl);
        window.location.replace(targetUrl);
        return;
      }
    }

    removeLoginLayers();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', executeAutomation, { once: true });
  } else {
    executeAutomation();
  }

  let retryCount = 0;
  const maxRetries = 20;
  const timer = setInterval(() => {
    retryCount += 1;
    removeLoginLayers();

    if (
      document.querySelector('#detail-desc, .note-content, .interaction-container, main') ||
      retryCount >= maxRetries
    ) {
      clearInterval(timer);
    }
  }, 500);
})();