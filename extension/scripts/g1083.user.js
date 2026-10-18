// 小红书网页端「收藏 → 专辑」批量删除按钮。
// 默认不选择任何专辑；执行前必须二次勾选并输入精确确认短语。
// 可在注入脚本前通过 window.__YuzeXhsAlbumBatchDeleteConfig 覆盖节流配置。
(function() {
  const SCRIPT_ID = 'Yuze-xhs-album-batch-delete';
  const STYLE_ID = `${SCRIPT_ID}-style`;
  const HOST_ID = `${SCRIPT_ID}-host`;
  const BUTTON_ID = `${SCRIPT_ID}-button`;
  const OVERLAY_ID = `${SCRIPT_ID}-overlay`;
  const READY_ATTR = 'data-Yuze-xhs-album-batch-delete-ready';
  const CLEANUP_KEY = '__YuzeXhsAlbumBatchDeleteCleanup';

  if (window[CLEANUP_KEY]) {
    window[CLEANUP_KEY]();
  }

  const state = {
    observer: null,
    scanTimer: null,
    running: false,
    stopRequested: false,
    albums: [],
    selectedIds: new Set(),
    albumListUrl: '',
  };

  const defaultConfig = {
    maxScrollRounds: 30,
    stableRoundsToStop: 4,
    scrollStepRatio: 0.82,
    scrollDelay: 560,
    pageTimeout: 9000,
    actionDelay: 900,
  };
  const configOverrides = window.__YuzeXhsAlbumBatchDeleteConfig || {};
  const config = {
    ...defaultConfig,
    ...configOverrides,
    maxScrollRounds: Math.max(
      1,
      Math.floor(
        Number(configOverrides.maxScrollRounds || defaultConfig.maxScrollRounds),
      ),
    ),
    stableRoundsToStop: Math.max(
      1,
      Math.floor(
        Number(
          configOverrides.stableRoundsToStop ||
            defaultConfig.stableRoundsToStop,
        ),
      ),
    ),
    scrollStepRatio: Math.max(
      0.2,
      Number(configOverrides.scrollStepRatio || defaultConfig.scrollStepRatio),
    ),
    scrollDelay: Math.max(
      200,
      Number(configOverrides.scrollDelay || defaultConfig.scrollDelay),
    ),
    pageTimeout: Math.max(
      3000,
      Number(configOverrides.pageTimeout || defaultConfig.pageTimeout),
    ),
    actionDelay: Math.max(
      350,
      Number(configOverrides.actionDelay || defaultConfig.actionDelay),
    ),
  };

  function cleanText(value) {
    return String(value || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function normalizeConfirmationText(value) {
    return String(value || '')
      .replace(/[\s\u00a0\u3000:：,，。.!！?？、_'“”‘’"-]+/g, '')
      .trim();
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function visible(element) {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.display !== 'none' &&
      style.visibility !== 'hidden'
    );
  }

  function clickElement(element) {
    if (!element) return false;
    element.scrollIntoView?.({ block: 'center', inline: 'center' });
    const rect = element.getBoundingClientRect();
    const eventInit = {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: Math.max(0, Math.floor(rect.left + rect.width / 2)),
      clientY: Math.max(0, Math.floor(rect.top + rect.height / 2)),
      buttons: 1,
    };
    if (window.PointerEvent) {
      element.dispatchEvent(
        new PointerEvent('pointerdown', {
          ...eventInit,
          pointerId: 1,
          pointerType: 'mouse',
          isPrimary: true,
        }),
      );
    }
    element.dispatchEvent(new MouseEvent('mousedown', eventInit));
    if (window.PointerEvent) {
      element.dispatchEvent(
        new PointerEvent('pointerup', {
          ...eventInit,
          pointerId: 1,
          pointerType: 'mouse',
          isPrimary: true,
        }),
      );
    }
    element.dispatchEvent(new MouseEvent('mouseup', eventInit));
    element.click();
    return true;
  }

  function waitFor(predicate, timeout = config.pageTimeout, interval = 120) {
    const startedAt = Date.now();
    return new Promise((resolve, reject) => {
      const tick = () => {
        let value = null;
        try {
          value = predicate();
        } catch (error) {
          reject(error);
          return;
        }
        if (value) {
          resolve(value);
          return;
        }
        if (Date.now() - startedAt > timeout) {
          reject(new Error('等待小红书页面响应超时'));
          return;
        }
        setTimeout(tick, interval);
      };
      tick();
    });
  }

  function getVisibleByExactText(root, selector, text) {
    return Array.from((root || document).querySelectorAll(selector))
      .filter(
        element =>
          visible(element) && cleanText(element.textContent) === cleanText(text),
      )
      .sort(
        (left, right) =>
          left.querySelectorAll('*').length - right.querySelectorAll('*').length,
      )[0];
  }

  function albumIdFromHref(href) {
    const match = String(href || '').match(/\/board\/([A-Za-z0-9]+)/);
    return match ? match[1] : '';
  }

  function albumListUrlFromCurrentPage() {
    const url = new URL(location.href);
    const profileMatch = url.pathname.match(/^(\/user\/profile\/[^/]+)/);
    if (profileMatch) url.pathname = profileMatch[1];
    url.searchParams.set('tab', 'fav');
    url.searchParams.set('subTab', 'board');
    return url.toString();
  }

  function isFavoriteAlbumPage() {
    const url = new URL(location.href);
    return (
      /\/user\/profile\//.test(url.pathname) &&
      url.searchParams.get('tab') === 'fav' &&
      url.searchParams.get('subTab') === 'board'
    );
  }

  function findAlbumSubtabBar() {
    const selectors = [
      '.tab-content-item .sub-tab-list',
      '.tab-content-item .reds-tabs-list',
      '.feeds-tab-container .sub-tab-list',
    ];
    return Array.from(document.querySelectorAll(selectors.join(', '))).find(
      element => {
        const text = cleanText(element.textContent);
        return visible(element) && /笔记\s*・?\s*\d*/.test(text) && /专辑\s*・?\s*\d*/.test(text);
      },
    );
  }

  function isAlbumSubtabActive() {
    const bar = findAlbumSubtabBar();
    const activeText = cleanText(
      bar?.querySelector('.reds-tab-item.active')?.textContent,
    );
    return /专辑/.test(activeText) || isFavoriteAlbumPage();
  }

  function trashIconSvg() {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 7h16M9 7V4.8c0-.45.35-.8.8-.8h4.4c.45 0 .8.35.8.8V7m-8.7 0 .72 12.05c.03.54.47.95 1 .95h7.96c.53 0 .97-.41 1-.95L17.7 7M10 10.5v6M14 10.5v6" />
      </svg>
    `;
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${HOST_ID} {
        position: absolute !important;
        top: 9px !important;
        right: 2px !important;
        z-index: 43 !important;
        display: flex !important;
        align-items: center !important;
      }
      #${BUTTON_ID} {
        height: 34px !important;
        display: inline-flex !important;
        align-items: center !important;
        gap: 7px !important;
        padding: 0 14px !important;
        border: 1px solid rgba(255, 36, 66, .18) !important;
        border-radius: 999px !important;
        color: #d91535 !important;
        background: rgba(255, 255, 255, .82) !important;
        box-shadow: 0 10px 28px rgba(30, 24, 28, .10) !important;
        backdrop-filter: blur(16px) saturate(1.5) !important;
        -webkit-backdrop-filter: blur(16px) saturate(1.5) !important;
        cursor: pointer !important;
        font: 650 13px/1 -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif !important;
      }
      #${BUTTON_ID}:hover {
        color: #fff !important;
        background: #ff2442 !important;
      }
      #${BUTTON_ID}:disabled {
        opacity: .55 !important;
        cursor: wait !important;
      }
      #${BUTTON_ID} svg {
        width: 16px !important;
        height: 16px !important;
        fill: none !important;
        stroke: currentColor !important;
        stroke-width: 1.8 !important;
        stroke-linecap: round !important;
        stroke-linejoin: round !important;
      }
      #${OVERLAY_ID}, #${OVERLAY_ID} * { box-sizing: border-box !important; }
      #${OVERLAY_ID} {
        position: fixed !important;
        inset: 0 !important;
        z-index: 1000008 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 24px !important;
        color: #1d1d1f !important;
        background: rgba(18, 18, 22, .35) !important;
        backdrop-filter: blur(12px) !important;
        -webkit-backdrop-filter: blur(12px) !important;
        font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif !important;
      }
      .Yuze-xhs-delete-sheet {
        width: min(680px, 94vw) !important;
        max-height: min(760px, 90vh) !important;
        overflow: hidden !important;
        border: 1px solid rgba(255, 255, 255, .72) !important;
        border-radius: 24px !important;
        background: rgba(252, 252, 253, .96) !important;
        box-shadow: 0 30px 100px rgba(0, 0, 0, .24) !important;
      }
      .Yuze-xhs-delete-head {
        display: flex !important;
        align-items: flex-start !important;
        justify-content: space-between !important;
        gap: 18px !important;
        padding: 24px 24px 16px !important;
      }
      .Yuze-xhs-delete-title {
        margin: 0 !important;
        font-size: 22px !important;
        line-height: 1.25 !important;
        font-weight: 760 !important;
      }
      .Yuze-xhs-delete-subtitle {
        margin: 7px 0 0 !important;
        color: rgba(60, 60, 67, .68) !important;
        font-size: 13px !important;
        line-height: 1.55 !important;
      }
      .Yuze-xhs-delete-close {
        width: 34px !important;
        height: 34px !important;
        flex: 0 0 auto !important;
        border: 0 !important;
        border-radius: 999px !important;
        color: rgba(60, 60, 67, .72) !important;
        background: rgba(118, 118, 128, .10) !important;
        cursor: pointer !important;
        font-size: 20px !important;
      }
      .Yuze-xhs-delete-toolbar {
        display: flex !important;
        flex-wrap: wrap !important;
        align-items: center !important;
        gap: 8px !important;
        padding: 0 24px 14px !important;
      }
      .Yuze-xhs-delete-search {
        min-width: 190px !important;
        height: 36px !important;
        flex: 1 1 220px !important;
        padding: 0 12px !important;
        border: 1px solid rgba(60, 60, 67, .14) !important;
        border-radius: 10px !important;
        outline: none !important;
        background: #fff !important;
        font-size: 13px !important;
      }
      .Yuze-xhs-delete-chip {
        height: 34px !important;
        padding: 0 12px !important;
        border: 1px solid rgba(60, 60, 67, .12) !important;
        border-radius: 999px !important;
        color: #343438 !important;
        background: #fff !important;
        cursor: pointer !important;
        font-size: 12px !important;
        font-weight: 650 !important;
      }
      .Yuze-xhs-delete-chip:hover { background: #f2f2f7 !important; }
      .Yuze-xhs-delete-list {
        max-height: 390px !important;
        overflow: auto !important;
        padding: 0 18px !important;
        border-top: 1px solid rgba(60, 60, 67, .08) !important;
        border-bottom: 1px solid rgba(60, 60, 67, .08) !important;
      }
      .Yuze-xhs-delete-row {
        position: relative !important;
        display: grid !important;
        grid-template-columns: 28px minmax(0, 1fr) auto !important;
        align-items: center !important;
        gap: 10px !important;
        min-height: 56px !important;
        padding: 8px 6px !important;
        border-bottom: 1px solid rgba(60, 60, 67, .07) !important;
        border-radius: 12px !important;
        cursor: pointer !important;
        transition: background .16s ease, box-shadow .16s ease !important;
      }
      .Yuze-xhs-delete-row:last-child { border-bottom: 0 !important; }
      .Yuze-xhs-delete-row.is-hidden { display: none !important; }
      .Yuze-xhs-delete-row input {
        position: absolute !important;
        width: 1px !important;
        height: 1px !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }
      .Yuze-xhs-delete-row.is-selected {
        background: rgba(255, 36, 66, .075) !important;
        box-shadow: inset 0 0 0 1px rgba(255, 36, 66, .16) !important;
      }
      .Yuze-xhs-delete-check {
        width: 22px !important;
        height: 22px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        border: 1.5px solid rgba(60, 60, 67, .28) !important;
        border-radius: 999px !important;
        color: transparent !important;
        background: #fff !important;
        font-size: 14px !important;
        font-weight: 800 !important;
        line-height: 1 !important;
        transition: all .16s ease !important;
      }
      .Yuze-xhs-delete-row.is-selected .Yuze-xhs-delete-check {
        border-color: #ff2442 !important;
        color: #fff !important;
        background: #ff2442 !important;
        box-shadow: 0 4px 12px rgba(255, 36, 66, .24) !important;
      }
      .Yuze-xhs-delete-name {
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
        font-size: 14px !important;
        font-weight: 650 !important;
      }
      .Yuze-xhs-delete-count {
        padding: 4px 8px !important;
        border-radius: 999px !important;
        color: rgba(60, 60, 67, .68) !important;
        background: rgba(118, 118, 128, .09) !important;
        font-size: 12px !important;
      }
      .Yuze-xhs-delete-foot {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 14px !important;
        padding: 16px 24px 22px !important;
      }
      .Yuze-xhs-delete-summary {
        color: rgba(60, 60, 67, .70) !important;
        font-size: 13px !important;
      }
      .Yuze-xhs-delete-actions {
        display: flex !important;
        gap: 9px !important;
      }
      .Yuze-xhs-delete-action {
        min-width: 94px !important;
        height: 38px !important;
        padding: 0 16px !important;
        border: 0 !important;
        border-radius: 999px !important;
        cursor: pointer !important;
        font-size: 13px !important;
        font-weight: 700 !important;
      }
      .Yuze-xhs-delete-action.secondary {
        color: #343438 !important;
        background: rgba(118, 118, 128, .12) !important;
      }
      .Yuze-xhs-delete-action.danger {
        color: #fff !important;
        background: #ff2442 !important;
      }
      .Yuze-xhs-delete-action:disabled {
        opacity: .4 !important;
        cursor: not-allowed !important;
      }
      .Yuze-xhs-delete-confirm {
        padding: 0 24px 22px !important;
      }
      .Yuze-xhs-delete-warning {
        margin: 0 0 14px !important;
        padding: 13px 14px !important;
        border: 1px solid rgba(255, 36, 66, .16) !important;
        border-radius: 12px !important;
        color: #9e1730 !important;
        background: rgba(255, 36, 66, .07) !important;
        font-size: 13px !important;
        line-height: 1.55 !important;
      }
      .Yuze-xhs-delete-selected-names {
        max-height: 170px !important;
        overflow: auto !important;
        margin: 0 0 14px !important;
        padding: 10px 14px !important;
        border-radius: 12px !important;
        background: rgba(118, 118, 128, .07) !important;
        color: rgba(60, 60, 67, .82) !important;
        font-size: 12px !important;
        line-height: 1.65 !important;
      }
      .Yuze-xhs-delete-ack {
        position: relative !important;
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
        margin: 0 0 12px !important;
        font-size: 13px !important;
        cursor: pointer !important;
      }
      .Yuze-xhs-delete-ack input {
        position: absolute !important;
        width: 1px !important;
        height: 1px !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }
      .Yuze-xhs-delete-ack-check {
        width: 20px !important;
        height: 20px !important;
        display: inline-flex !important;
        flex: 0 0 auto !important;
        align-items: center !important;
        justify-content: center !important;
        border: 1.5px solid rgba(60, 60, 67, .28) !important;
        border-radius: 6px !important;
        color: transparent !important;
        background: #fff !important;
        font-size: 13px !important;
        font-weight: 800 !important;
        line-height: 1 !important;
        transition: all .16s ease !important;
      }
      .Yuze-xhs-delete-ack input:checked + .Yuze-xhs-delete-ack-check {
        border-color: #ff2442 !important;
        color: #fff !important;
        background: #ff2442 !important;
      }
      .Yuze-xhs-delete-phrase {
        width: 100% !important;
        height: 40px !important;
        padding: 0 12px !important;
        border: 1px solid rgba(60, 60, 67, .16) !important;
        border-radius: 10px !important;
        outline: none !important;
        background: #fff !important;
        font-size: 13px !important;
      }
      .Yuze-xhs-delete-progress-wrap { padding: 4px 24px 24px !important; }
      .Yuze-xhs-delete-progress {
        height: 8px !important;
        overflow: hidden !important;
        border-radius: 999px !important;
        background: rgba(118, 118, 128, .12) !important;
      }
      .Yuze-xhs-delete-progress > span {
        display: block !important;
        width: 0;
        height: 100% !important;
        border-radius: inherit !important;
        background: linear-gradient(90deg, #ff2442, #ff6b81) !important;
        transition: width .25s ease !important;
      }
      .Yuze-xhs-delete-log {
        max-height: 300px !important;
        overflow: auto !important;
        margin-top: 16px !important;
        padding: 12px 14px !important;
        border-radius: 12px !important;
        background: #f5f5f7 !important;
        font: 12px/1.7 ui-monospace, SFMono-Regular, Menlo, monospace !important;
      }
      .Yuze-xhs-delete-log div { margin: 0 0 4px !important; }
      .Yuze-xhs-delete-log .success { color: #18783a !important; }
      .Yuze-xhs-delete-log .failed { color: #b01932 !important; }
      @media (max-width: 640px) {
        #${OVERLAY_ID} { padding: 10px !important; }
        .Yuze-xhs-delete-sheet { border-radius: 18px !important; }
        .Yuze-xhs-delete-head { padding: 19px 18px 13px !important; }
        .Yuze-xhs-delete-toolbar { padding: 0 18px 12px !important; }
        .Yuze-xhs-delete-list { padding: 0 12px !important; }
        .Yuze-xhs-delete-foot {
          align-items: stretch !important;
          flex-direction: column !important;
          padding: 14px 18px 18px !important;
        }
        .Yuze-xhs-delete-actions { width: 100% !important; }
        .Yuze-xhs-delete-action { flex: 1 !important; }
        .Yuze-xhs-delete-confirm { padding: 0 18px 18px !important; }
      }
    `;
    document.head.appendChild(style);
  }

  function mountButton() {
    injectStyle();
    const bar = findAlbumSubtabBar();
    const oldHost = document.getElementById(HOST_ID);
    if (!bar) {
      if (oldHost) oldHost.style.display = 'none';
      return;
    }

    if (window.getComputedStyle(bar).position === 'static') {
      bar.dataset.YuzeBatchDeletePrevPosition = 'static';
      bar.style.position = 'relative';
    }

    let host = oldHost;
    if (!host) {
      host = document.createElement('div');
      host.id = HOST_ID;
      const button = document.createElement('button');
      button.id = BUTTON_ID;
      button.type = 'button';
      button.setAttribute('aria-label', '批量删除小红书专辑');
      button.innerHTML = `${trashIconSvg()}<span>批量删除专辑</span>`;
      button.addEventListener('click', handleButtonClick);
      host.appendChild(button);
    }

    if (host.parentElement !== bar) bar.appendChild(host);
    host.style.display = isAlbumSubtabActive() ? 'flex' : 'none';
    bar.setAttribute(READY_ATTR, 'true');
  }

  function setButtonLoading(loading, label = '') {
    const button = document.getElementById(BUTTON_ID);
    if (!button) return;
    button.disabled = !!loading;
    const text = button.querySelector('span');
    if (text) text.textContent = label || '批量删除专辑';
  }

  function collectVisibleAlbums(targetMap) {
    const albumMap = targetMap || new Map();
    const links = Array.from(
      document.querySelectorAll(
        '.board-card[href*="/board/"], a[href^="/board/"], a[href*="xiaohongshu.com/board/"]',
      ),
    );
    for (const link of links) {
      const href = link.getAttribute('href') || link.href;
      const id = albumIdFromHref(href);
      if (!id) continue;
      const titleElement = link.querySelector(
        '.board-name .title, .board-name, [class*="board-name"] .title',
      );
      const rawText = cleanText(link.textContent);
      const noteMatch = rawText.match(/笔记\s*・?\s*(\d+)/i);
      const count = noteMatch ? Number(noteMatch[1]) : null;
      let name = cleanText(titleElement?.textContent || rawText);
      name = name.replace(/\s*笔记\s*・?\s*\d+.*$/i, '').trim();
      if (!name) name = `未命名专辑 ${id.slice(-5)}`;
      albumMap.set(id, {
        id,
        name,
        count,
        href: new URL(href, location.origin).toString(),
      });
    }
    return albumMap;
  }

  function getAlbumScrollTarget() {
    const candidates = Array.from(
      document.querySelectorAll(
        '.tab-content-item.static-layout, .board-container, main',
      ),
    ).filter(element => visible(element));
    return (
      candidates.find(
        element => element.scrollHeight > element.clientHeight + 80,
      ) ||
      document.scrollingElement ||
      document.documentElement
    );
  }

  async function scanAlbums() {
    const albumMap = new Map();
    const scrollTarget = getAlbumScrollTarget();
    const isDocumentTarget =
      scrollTarget === document.scrollingElement ||
      scrollTarget === document.documentElement ||
      scrollTarget === document.body;
    const originalTop = isDocumentTarget ? window.scrollY : scrollTarget.scrollTop;
    let lastCount = -1;
    let stableRounds = 0;

    for (let round = 0; round < config.maxScrollRounds; round += 1) {
      collectVisibleAlbums(albumMap);
      setButtonLoading(true, `扫描中 ${albumMap.size}`);
      if (albumMap.size === lastCount) stableRounds += 1;
      else stableRounds = 0;
      lastCount = albumMap.size;

      const currentTop = isDocumentTarget ? window.scrollY : scrollTarget.scrollTop;
      const viewportHeight = isDocumentTarget
        ? window.innerHeight
        : scrollTarget.clientHeight;
      const fullHeight = isDocumentTarget
        ? document.documentElement.scrollHeight
        : scrollTarget.scrollHeight;
      const nearBottom = currentTop + viewportHeight >= fullHeight - 96;
      if (
        (nearBottom && stableRounds >= 1) ||
        stableRounds >= config.stableRoundsToStop
      ) {
        break;
      }

      const step = Math.max(480, Math.floor(viewportHeight * config.scrollStepRatio));
      if (isDocumentTarget) window.scrollBy({ top: step, behavior: 'smooth' });
      else scrollTarget.scrollTo({ top: currentTop + step, behavior: 'smooth' });
      await sleep(config.scrollDelay);
    }

    collectVisibleAlbums(albumMap);
    if (isDocumentTarget) window.scrollTo({ top: originalTop, behavior: 'smooth' });
    else scrollTarget.scrollTo({ top: originalTop, behavior: 'smooth' });
    await sleep(320);
    return Array.from(albumMap.values());
  }

  function createOverlay(content) {
    let overlay = document.getElementById(OVERLAY_ID);
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = OVERLAY_ID;
      document.body.appendChild(overlay);
    }
    overlay.innerHTML = content;
    return overlay;
  }

  function closeOverlay() {
    if (state.running) return;
    document.getElementById(OVERLAY_ID)?.remove();
  }

  function selectedAlbums() {
    return state.albums.filter(album => state.selectedIds.has(album.id));
  }

  function updateSelectionSummary() {
    const overlay = document.getElementById(OVERLAY_ID);
    if (!overlay) return;
    const selected = selectedAlbums();
    const totalNotes = selected.reduce(
      (sum, album) => sum + (Number.isFinite(album.count) ? album.count : 0),
      0,
    );
    const summary = overlay.querySelector('.Yuze-xhs-delete-summary');
    if (summary) {
      summary.textContent = `已选 ${selected.length}/${state.albums.length} 个专辑 · 含 ${totalNotes} 篇笔记`;
    }
    const next = overlay.querySelector('[data-action="confirm"]');
    if (next) next.disabled = selected.length < 1;
  }

  function setAlbumSelection(ids, selected) {
    const idSet = new Set(ids);
    for (const album of state.albums) {
      if (!idSet.has(album.id)) continue;
      if (selected) state.selectedIds.add(album.id);
      else state.selectedIds.delete(album.id);
    }
    const overlay = document.getElementById(OVERLAY_ID);
    overlay?.querySelectorAll('input[data-album-id]').forEach(input => {
      input.checked = state.selectedIds.has(input.dataset.albumId);
      input
        .closest('.Yuze-xhs-delete-row')
        ?.classList.toggle('is-selected', input.checked);
    });
    updateSelectionSummary();
  }

  function renderAlbumPicker() {
    state.selectedIds.clear();
    const rows = state.albums
      .map(
        album => `
          <label class="Yuze-xhs-delete-row" data-search="${escapeHtml(album.name.toLowerCase())}">
            <input type="checkbox" data-album-id="${escapeHtml(album.id)}">
            <span class="Yuze-xhs-delete-check" aria-hidden="true">✓</span>
            <span class="Yuze-xhs-delete-name" title="${escapeHtml(album.name)}">${escapeHtml(album.name)}</span>
            <span class="Yuze-xhs-delete-count">${Number.isFinite(album.count) ? `笔记・${album.count}` : '数量未知'}</span>
          </label>
        `,
      )
      .join('');
    const overlay = createOverlay(`
      <section class="Yuze-xhs-delete-sheet" role="dialog" aria-modal="true" aria-label="批量删除专辑">
        <header class="Yuze-xhs-delete-head">
          <div>
            <h2 class="Yuze-xhs-delete-title">选择要删除的专辑</h2>
            <p class="Yuze-xhs-delete-subtitle">删除专辑不会取消收藏其中的笔记。默认不勾选，选好后还需进行二次确认。</p>
          </div>
          <button class="Yuze-xhs-delete-close" type="button" aria-label="关闭">×</button>
        </header>
        <div class="Yuze-xhs-delete-toolbar">
          <input class="Yuze-xhs-delete-search" type="search" placeholder="搜索专辑名称">
          <button class="Yuze-xhs-delete-chip" type="button" data-select="empty">选择空专辑</button>
          <button class="Yuze-xhs-delete-chip" type="button" data-select="visible">选择当前筛选</button>
          <button class="Yuze-xhs-delete-chip" type="button" data-select="clear">清空</button>
        </div>
        <div class="Yuze-xhs-delete-list">${rows}</div>
        <footer class="Yuze-xhs-delete-foot">
          <div class="Yuze-xhs-delete-summary">已选 0/${state.albums.length} 个专辑 · 含 0 篇笔记</div>
          <div class="Yuze-xhs-delete-actions">
            <button class="Yuze-xhs-delete-action secondary" type="button" data-action="cancel">取消</button>
            <button class="Yuze-xhs-delete-action danger" type="button" data-action="confirm" disabled>下一步</button>
          </div>
        </footer>
      </section>
    `);

    overlay
      .querySelector('.Yuze-xhs-delete-close')
      ?.addEventListener('click', closeOverlay);
    overlay
      .querySelector('[data-action="cancel"]')
      ?.addEventListener('click', closeOverlay);
    overlay
      .querySelector('[data-action="confirm"]')
      ?.addEventListener('click', renderDeleteConfirmation);
    overlay.querySelectorAll('input[data-album-id]').forEach(input => {
      input.addEventListener('change', () => {
        if (input.checked) state.selectedIds.add(input.dataset.albumId);
        else state.selectedIds.delete(input.dataset.albumId);
        input
          .closest('.Yuze-xhs-delete-row')
          ?.classList.toggle('is-selected', input.checked);
        updateSelectionSummary();
      });
    });
    overlay
      .querySelector('.Yuze-xhs-delete-search')
      ?.addEventListener('input', event => {
        const keyword = cleanText(event.target.value).toLowerCase();
        overlay.querySelectorAll('.Yuze-xhs-delete-row').forEach(row => {
          row.classList.toggle(
            'is-hidden',
            !!keyword && !row.dataset.search.includes(keyword),
          );
        });
      });
    overlay.querySelector('[data-select="empty"]')?.addEventListener('click', () => {
      setAlbumSelection(
        state.albums.filter(album => album.count === 0).map(album => album.id),
        true,
      );
    });
    overlay
      .querySelector('[data-select="visible"]')
      ?.addEventListener('click', () => {
        const ids = Array.from(
          overlay.querySelectorAll('.Yuze-xhs-delete-row:not(.is-hidden)'),
        ).map(row => row.querySelector('input').dataset.albumId);
        setAlbumSelection(ids, true);
      });
    overlay.querySelector('[data-select="clear"]')?.addEventListener('click', () => {
      setAlbumSelection(
        state.albums.map(album => album.id),
        false,
      );
    });
  }

  function renderDeleteConfirmation() {
    const selected = selectedAlbums();
    if (!selected.length) return;
    const phrase = `删除 ${selected.length} 个专辑`;
    const names = selected.map(album => escapeHtml(album.name)).join('、');
    const overlay = createOverlay(`
      <section class="Yuze-xhs-delete-sheet" role="dialog" aria-modal="true" aria-label="确认批量删除专辑">
        <header class="Yuze-xhs-delete-head">
          <div>
            <h2 class="Yuze-xhs-delete-title">最后确认</h2>
            <p class="Yuze-xhs-delete-subtitle">将按顺序删除 ${selected.length} 个专辑。</p>
          </div>
          <button class="Yuze-xhs-delete-close" type="button" aria-label="返回">×</button>
        </header>
        <div class="Yuze-xhs-delete-confirm">
          <p class="Yuze-xhs-delete-warning"><strong>此操作无法恢复。</strong>专辑中的笔记会继续保持收藏，不会被删除或取消收藏。</p>
          <div class="Yuze-xhs-delete-selected-names">${names}</div>
          <label class="Yuze-xhs-delete-ack">
            <input type="checkbox" data-confirm-ack>
            <span class="Yuze-xhs-delete-ack-check" aria-hidden="true">✓</span>
            <span>我已核对以上专辑，并了解删除不可恢复</span>
          </label>
          <input class="Yuze-xhs-delete-phrase" type="text" autocomplete="off" placeholder="请输入：删除${selected.length}个专辑（空格可省略）">
        </div>
        <footer class="Yuze-xhs-delete-foot">
          <div class="Yuze-xhs-delete-summary">还需勾选确认并输入指定文字</div>
          <div class="Yuze-xhs-delete-actions">
            <button class="Yuze-xhs-delete-action secondary" type="button" data-action="back">返回选择</button>
            <button class="Yuze-xhs-delete-action danger" type="button" data-action="delete" disabled>开始删除</button>
          </div>
        </footer>
      </section>
    `);
    const ack = overlay.querySelector('[data-confirm-ack]');
    const input = overlay.querySelector('.Yuze-xhs-delete-phrase');
    const deleteButton = overlay.querySelector('[data-action="delete"]');
    const confirmationSummary = overlay.querySelector(
      '.Yuze-xhs-delete-summary',
    );
    const refreshDeleteState = () => {
      const phraseMatches =
        normalizeConfirmationText(input.value) ===
        normalizeConfirmationText(phrase);
      deleteButton.disabled = !ack.checked || !phraseMatches;
      if (!ack.checked) {
        confirmationSummary.textContent = '请先勾选不可恢复确认';
      } else if (!phraseMatches) {
        confirmationSummary.textContent = `请输入“删除${selected.length}个专辑”，空格可省略`;
      } else {
        confirmationSummary.textContent = '确认完成，可以开始删除';
      }
    };
    ack.addEventListener('change', refreshDeleteState);
    input.addEventListener('input', refreshDeleteState);
    overlay
      .querySelector('.Yuze-xhs-delete-close')
      ?.addEventListener('click', renderAlbumPickerPreservingSelection);
    overlay
      .querySelector('[data-action="back"]')
      ?.addEventListener('click', renderAlbumPickerPreservingSelection);
    deleteButton.addEventListener('click', runBatchDelete);
  }

  function renderAlbumPickerPreservingSelection() {
    const selectedIds = new Set(state.selectedIds);
    renderAlbumPicker();
    setAlbumSelection(Array.from(selectedIds), true);
  }

  function navigateSpa(url) {
    const target = new URL(url, location.href);
    history.pushState(null, '', target.toString());
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  async function navigateToAlbum(album) {
    navigateSpa(album.href);
    await waitFor(
      () =>
        location.pathname.includes(`/board/${album.id}`) &&
        getVisibleByExactText(document, 'button, div, span', '编辑专辑'),
    );
    await sleep(250);
  }

  async function openEditAlbumModal() {
    const editButton = getVisibleByExactText(
      document,
      'button, div, span',
      '编辑专辑',
    );
    if (!editButton) throw new Error('没有找到“编辑专辑”入口');
    clickElement(editButton);
    return waitFor(() => {
      const modal = document.querySelector('.reds-modal-open .modal');
      return modal && visible(modal) ? modal : null;
    });
  }

  async function triggerAlbumDelete(modal) {
    const deleteEntry =
      modal.querySelector('.delete-btn') ||
      getVisibleByExactText(modal, 'button, div, span', '删除专辑');
    if (!deleteEntry) throw new Error('没有找到“删除专辑”按钮');
    clickElement(deleteEntry);

    const alert = await waitFor(() => {
      return Array.from(
        document.querySelectorAll('.reds-alert-wrapper, [class*="alert-wrapper"]'),
      ).find(element => {
        const text = cleanText(element.textContent);
        return (
          visible(element) &&
          /删除专辑/.test(text) &&
          /无法恢复/.test(text) &&
          /删除/.test(text)
        );
      });
    });
    const confirmDelete =
      alert.querySelector('.foot-btn.strong') ||
      getVisibleByExactText(alert, 'button, div, span', '删除');
    if (!confirmDelete) throw new Error('没有找到小红书的删除确认按钮');
    clickElement(confirmDelete);

    await waitFor(
      () =>
        !document.contains(alert) ||
        !visible(alert) ||
        !location.pathname.includes('/board/'),
      config.pageTimeout + 3000,
    );
    await sleep(config.actionDelay);
  }

  async function returnToAlbumList() {
    navigateSpa(state.albumListUrl);
    await waitFor(
      () =>
        isFavoriteAlbumPage() &&
        (document.querySelector('.board-container') || findAlbumSubtabBar()),
      config.pageTimeout + 2000,
    );
    await sleep(500);
  }

  function renderProgress(selected) {
    return createOverlay(`
      <section class="Yuze-xhs-delete-sheet" role="dialog" aria-modal="true" aria-label="正在批量删除专辑">
        <header class="Yuze-xhs-delete-head">
          <div>
            <h2 class="Yuze-xhs-delete-title">正在删除专辑</h2>
            <p class="Yuze-xhs-delete-subtitle" data-progress-message>准备处理 ${selected.length} 个专辑</p>
          </div>
        </header>
        <div class="Yuze-xhs-delete-progress-wrap">
          <div class="Yuze-xhs-delete-progress"><span></span></div>
          <div class="Yuze-xhs-delete-log" aria-live="polite"></div>
        </div>
        <footer class="Yuze-xhs-delete-foot">
          <div class="Yuze-xhs-delete-summary">删除期间请不要刷新或关闭当前页面</div>
          <div class="Yuze-xhs-delete-actions">
            <button class="Yuze-xhs-delete-action secondary" type="button" data-action="stop">处理完当前专辑后停止</button>
          </div>
        </footer>
      </section>
    `);
  }

  function updateDeleteProgress(index, total, message, logItem) {
    const overlay = document.getElementById(OVERLAY_ID);
    if (!overlay) return;
    const bar = overlay.querySelector('.Yuze-xhs-delete-progress > span');
    if (bar) bar.style.width = `${Math.round((index / Math.max(1, total)) * 100)}%`;
    const messageElement = overlay.querySelector('[data-progress-message]');
    if (messageElement) messageElement.textContent = message;
    if (logItem) {
      const log = overlay.querySelector('.Yuze-xhs-delete-log');
      const row = document.createElement('div');
      row.className = logItem.type;
      row.textContent = logItem.text;
      log.appendChild(row);
      log.scrollTop = log.scrollHeight;
    }
  }

  async function deleteOneAlbum(album) {
    await navigateToAlbum(album);
    const modal = await openEditAlbumModal();
    await triggerAlbumDelete(modal);
  }

  async function runBatchDelete() {
    if (state.running) return;
    const selected = selectedAlbums();
    if (!selected.length) return;
    state.running = true;
    state.stopRequested = false;
    setButtonLoading(true, '删除中');
    const overlay = renderProgress(selected);
    const result = { deleted: [], failed: [], unprocessed: [] };

    overlay.querySelector('[data-action="stop"]')?.addEventListener('click', event => {
      state.stopRequested = true;
      event.currentTarget.disabled = true;
      event.currentTarget.textContent = '将在本项完成后停止';
    });

    try {
      for (let index = 0; index < selected.length; index += 1) {
        const album = selected[index];
        if (state.stopRequested) {
          result.unprocessed.push(...selected.slice(index));
          break;
        }
        updateDeleteProgress(
          index,
          selected.length,
          `正在处理 ${index + 1}/${selected.length}：${album.name}`,
        );
        try {
          await deleteOneAlbum(album);
          result.deleted.push(album);
          updateDeleteProgress(index + 1, selected.length, `已删除：${album.name}`, {
            type: 'success',
            text: `✓ ${album.name}`,
          });
        } catch (error) {
          result.failed.push({
            album,
            error: error.message || String(error),
          });
          updateDeleteProgress(index + 1, selected.length, `删除失败：${album.name}`, {
            type: 'failed',
            text: `× ${album.name}：${error.message || String(error)}`,
          });
        }

        if (index < selected.length - 1 && !state.stopRequested) {
          try {
            await returnToAlbumList();
          } catch (error) {
            console.warn('[Yuze] 返回小红书专辑列表失败:', error);
          }
          await sleep(config.actionDelay);
        }
      }
    } finally {
      try {
        if (!isFavoriteAlbumPage()) await returnToAlbumList();
      } catch (error) {
        console.warn('[Yuze] 删除完成后返回专辑列表失败:', error);
      }
      state.running = false;
      setButtonLoading(false);
      renderDeleteResult(result);
    }
  }

  function renderDeleteResult(result) {
    const failedRows = result.failed
      .map(
        item =>
          `<div class="failed">× ${escapeHtml(item.album.name)}：${escapeHtml(item.error)}</div>`,
      )
      .join('');
    const deletedRows = result.deleted
      .map(album => `<div class="success">✓ ${escapeHtml(album.name)}</div>`)
      .join('');
    const unprocessedText = result.unprocessed.length
      ? `，未处理 ${result.unprocessed.length} 个`
      : '';
    const overlay = createOverlay(`
      <section class="Yuze-xhs-delete-sheet" role="dialog" aria-modal="true" aria-label="批量删除完成">
        <header class="Yuze-xhs-delete-head">
          <div>
            <h2 class="Yuze-xhs-delete-title">批量删除已结束</h2>
            <p class="Yuze-xhs-delete-subtitle">成功 ${result.deleted.length} 个，失败 ${result.failed.length} 个${unprocessedText}。</p>
          </div>
          <button class="Yuze-xhs-delete-close" type="button" aria-label="关闭">×</button>
        </header>
        <div class="Yuze-xhs-delete-progress-wrap">
          <div class="Yuze-xhs-delete-log">${deletedRows}${failedRows || ''}</div>
        </div>
        <footer class="Yuze-xhs-delete-foot">
          <div class="Yuze-xhs-delete-summary">笔记仍保持收藏状态</div>
          <div class="Yuze-xhs-delete-actions">
            <button class="Yuze-xhs-delete-action secondary" type="button" data-action="close">关闭</button>
          </div>
        </footer>
      </section>
    `);
    overlay
      .querySelector('.Yuze-xhs-delete-close')
      ?.addEventListener('click', closeOverlay);
    overlay
      .querySelector('[data-action="close"]')
      ?.addEventListener('click', closeOverlay);
  }

  function renderError(error) {
    const overlay = createOverlay(`
      <section class="Yuze-xhs-delete-sheet" role="alertdialog" aria-modal="true" aria-label="批量删除专辑出错">
        <header class="Yuze-xhs-delete-head">
          <div>
            <h2 class="Yuze-xhs-delete-title">暂时无法开始</h2>
            <p class="Yuze-xhs-delete-subtitle">${escapeHtml(error.message || String(error))}</p>
          </div>
          <button class="Yuze-xhs-delete-close" type="button" aria-label="关闭">×</button>
        </header>
        <footer class="Yuze-xhs-delete-foot">
          <div class="Yuze-xhs-delete-summary">请确认已登录，并停留在“收藏 → 专辑”页面</div>
          <div class="Yuze-xhs-delete-actions">
            <button class="Yuze-xhs-delete-action secondary" type="button" data-action="close">关闭</button>
          </div>
        </footer>
      </section>
    `);
    overlay
      .querySelector('.Yuze-xhs-delete-close')
      ?.addEventListener('click', closeOverlay);
    overlay
      .querySelector('[data-action="close"]')
      ?.addEventListener('click', closeOverlay);
  }

  async function handleButtonClick() {
    if (state.running) return;
    state.running = true;
    setButtonLoading(true, '扫描中');
    try {
      if (!isAlbumSubtabActive()) {
        throw new Error('请先切换到收藏页的“专辑”子分类后再运行。');
      }
      state.albumListUrl = albumListUrlFromCurrentPage();
      state.albums = await scanAlbums();
      if (!state.albums.length) {
        throw new Error('当前页面没有读取到可删除的专辑。');
      }
      state.albums.sort((left, right) => {
        if (left.count === 0 && right.count !== 0) return -1;
        if (left.count !== 0 && right.count === 0) return 1;
        return left.name.localeCompare(right.name, 'zh-CN');
      });
      renderAlbumPicker();
    } catch (error) {
      console.error('[Yuze] 小红书批量删除专辑初始化失败:', error);
      renderError(error);
    } finally {
      state.running = false;
      setButtonLoading(false);
    }
  }

  function start() {
    mountButton();
    state.observer = new MutationObserver(() => {
      clearTimeout(state.scanTimer);
      state.scanTimer = setTimeout(mountButton, 180);
    });
    state.observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('popstate', mountButton);
    window.addEventListener('hashchange', mountButton);
    console.log('[Yuze] 小红书批量删除专辑按钮已启用');
  }

  window[CLEANUP_KEY] = function cleanup() {
    state.stopRequested = true;
    state.observer?.disconnect();
    clearTimeout(state.scanTimer);
    document.getElementById(HOST_ID)?.remove();
    document.getElementById(OVERLAY_ID)?.remove();
    document.getElementById(STYLE_ID)?.remove();
    window.removeEventListener('popstate', mountButton);
    window.removeEventListener('hashchange', mountButton);
    document.querySelectorAll(`[${READY_ATTR}]`).forEach(element => {
      element.removeAttribute(READY_ATTR);
      if (element.dataset.YuzeBatchDeletePrevPosition === 'static') {
        element.style.position = '';
        delete element.dataset.YuzeBatchDeletePrevPosition;
      }
    });
    delete window[CLEANUP_KEY];
  };

  start();
})();