// ==UserScript==
// @name         QQ Music Lyric Translator
// @name:zh-CN   QQ 音乐歌词翻译按钮
// @namespace    skill-create
// @match        https://y.qq.com/n/ryqq_v2/player*
// @description  在 QQ 音乐播放器进度条旁添加玻璃质感“翻译”按钮，点击后通过 Tabbit LLMBridge 将歌词逐句翻译成中文，并展示在原歌词下方。
// ==/UserScript==
// 白名单：LLMbridge为官方插件，可以不审核

(function () {
  'use strict';

  const STATE_KEY = '__tabbitQqMusicLyricTranslator__';
  const STYLE_ID = 'tabbit-qq-lyric-translator-style';
  const BUTTON_ID = 'tabbit-qq-lyric-translator-button';
  const TOAST_ID = 'tabbit-qq-lyric-translator-toast';
  const TRANSLATION_CLASS = 'tabbit-qq-lyric-translation';
  const POLL_INTERVAL_MS = 700;

  if (window[STATE_KEY] && typeof window[STATE_KEY].destroy === 'function') {
    window[STATE_KEY].destroy();
  }

  const state = {
    observer: null,
    positionTimer: null,
    lyricTimer: null,
    lastLyricSignature: '',
    translatedSignature: '',
    isBusy: false,
    isVisible: true,
  };
  window[STATE_KEY] = state;

  function injectStyle() {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${BUTTON_ID} {
        position: fixed;
        z-index: 2147483000;
        width: 48px;
        height: 36px;
        border: 1px solid rgba(255, 255, 255, 0.32);
        border-radius: 999px;
        color: rgba(255, 255, 255, 0.94);
        background:
          linear-gradient(135deg, rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0.08)),
          rgba(255, 255, 255, 0.08);
        -webkit-backdrop-filter: saturate(180%) blur(18px);
        backdrop-filter: saturate(180%) blur(18px);
        box-shadow:
          0 10px 30px rgba(0, 0, 0, 0.28),
          inset 0 1px 0 rgba(255, 255, 255, 0.35),
          inset 0 -1px 0 rgba(255, 255, 255, 0.08);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 0 12px;
        box-sizing: border-box;
        overflow: hidden;
        cursor: pointer;
        font: 500 13px/1 -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Helvetica Neue", Arial, sans-serif;
        letter-spacing: 0;
        opacity: 0;
        transform: translate3d(0, 6px, 0) scale(0.98);
        transition:
          left 360ms cubic-bezier(0.22, 1, 0.36, 1),
          top 360ms cubic-bezier(0.22, 1, 0.36, 1),
          width 260ms cubic-bezier(0.22, 1, 0.36, 1),
          opacity 260ms ease,
          transform 260ms cubic-bezier(0.22, 1, 0.36, 1),
          border-color 220ms ease,
          background 220ms ease,
          box-shadow 220ms ease;
      }

      #${BUTTON_ID}.tabbit-ready {
        opacity: 1;
        transform: translate3d(0, 0, 0) scale(1);
      }

      #${BUTTON_ID}:hover,
      #${BUTTON_ID}:focus-visible {
        width: 78px;
        border-color: rgba(255, 255, 255, 0.5);
        background:
          linear-gradient(135deg, rgba(255, 255, 255, 0.36), rgba(255, 255, 255, 0.13)),
          rgba(255, 255, 255, 0.12);
        box-shadow:
          0 14px 36px rgba(0, 0, 0, 0.34),
          0 0 0 1px rgba(255, 255, 255, 0.08),
          inset 0 1px 0 rgba(255, 255, 255, 0.45);
        outline: none;
      }

      #${BUTTON_ID}:active {
        transform: translate3d(0, 1px, 0) scale(0.985);
      }

      #${BUTTON_ID} .tabbit-translator-icon {
        flex: 0 0 auto;
        font-size: 14px;
        font-weight: 650;
        text-shadow: 0 1px 8px rgba(0, 0, 0, 0.24);
      }

      #${BUTTON_ID} .tabbit-translator-label {
        max-width: 0;
        opacity: 0;
        white-space: nowrap;
        transform: translateX(-3px);
        transition:
          max-width 260ms cubic-bezier(0.22, 1, 0.36, 1),
          opacity 180ms ease,
          transform 260ms cubic-bezier(0.22, 1, 0.36, 1);
      }

      #${BUTTON_ID}:hover .tabbit-translator-label,
      #${BUTTON_ID}:focus-visible .tabbit-translator-label,
      #${BUTTON_ID}.tabbit-loading .tabbit-translator-label {
        max-width: 38px;
        opacity: 1;
        transform: translateX(0);
      }

      #${BUTTON_ID}.tabbit-loading {
        width: 78px;
        pointer-events: none;
      }

      #${BUTTON_ID}.tabbit-loading .tabbit-translator-icon {
        width: 13px;
        height: 13px;
        border-radius: 50%;
        border: 1.5px solid rgba(255, 255, 255, 0.38);
        border-top-color: rgba(255, 255, 255, 0.96);
        color: transparent;
        animation: tabbitTranslatorSpin 820ms linear infinite;
      }

      #${BUTTON_ID}.tabbit-done {
        border-color: rgba(91, 214, 162, 0.48);
        color: rgba(223, 255, 240, 0.98);
        background:
          linear-gradient(135deg, rgba(91, 214, 162, 0.34), rgba(255, 255, 255, 0.1)),
          rgba(40, 180, 126, 0.16);
      }

      @keyframes tabbitTranslatorSpin {
        to { transform: rotate(360deg); }
      }

      .${TRANSLATION_CLASS} {
        margin: -2px auto 16px;
        max-width: min(520px, 92%);
        color: rgba(232, 255, 244, 0.88);
        font: 400 13px/1.62 -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Helvetica Neue", Arial, sans-serif;
        text-align: center;
        letter-spacing: 0;
        text-shadow: 0 1px 14px rgba(0, 0, 0, 0.28);
        opacity: 0;
        transform: translate3d(0, -5px, 0);
        transition:
          opacity 380ms ease,
          transform 420ms cubic-bezier(0.22, 1, 0.36, 1),
          max-height 420ms cubic-bezier(0.22, 1, 0.36, 1),
          margin 420ms cubic-bezier(0.22, 1, 0.36, 1);
        max-height: 0;
        overflow: hidden;
        pointer-events: none;
      }

      .${TRANSLATION_CLASS}.tabbit-show {
        opacity: 1;
        transform: translate3d(0, 0, 0);
        max-height: 72px;
      }

      .${TRANSLATION_CLASS}.tabbit-hidden {
        opacity: 0;
        max-height: 0;
        margin-top: 0;
        margin-bottom: 0;
      }

      #${TOAST_ID} {
        position: fixed;
        z-index: 2147483001;
        min-width: 150px;
        max-width: 280px;
        padding: 10px 12px;
        border: 1px solid rgba(255, 255, 255, 0.24);
        border-radius: 14px;
        color: rgba(255, 255, 255, 0.92);
        background: rgba(28, 28, 30, 0.48);
        -webkit-backdrop-filter: saturate(180%) blur(18px);
        backdrop-filter: saturate(180%) blur(18px);
        box-shadow: 0 14px 34px rgba(0, 0, 0, 0.28);
        font: 400 13px/1.45 -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Helvetica Neue", Arial, sans-serif;
        letter-spacing: 0;
        opacity: 0;
        transform: translate3d(0, 6px, 0);
        transition: opacity 220ms ease, transform 260ms cubic-bezier(0.22, 1, 0.36, 1);
        pointer-events: none;
      }

      #${TOAST_ID}.tabbit-show {
        opacity: 1;
        transform: translate3d(0, 0, 0);
      }

      @media (max-width: 760px) {
        #${BUTTON_ID} {
          width: 44px;
          height: 34px;
        }

        #${BUTTON_ID}:hover,
        #${BUTTON_ID}:focus-visible,
        #${BUTTON_ID}.tabbit-loading {
          width: 70px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function createButton() {
    const button = document.createElement('button');
    button.id = BUTTON_ID;
    button.type = 'button';
    button.title = '翻译歌词';
    button.setAttribute('aria-label', '翻译歌词');
    button.innerHTML = [
      '<span class="tabbit-translator-icon" aria-hidden="true">译</span>',
      '<span class="tabbit-translator-label">翻译</span>',
    ].join('');
    button.addEventListener('click', handleTranslateClick);
    document.body.appendChild(button);
    requestAnimationFrame(() => button.classList.add('tabbit-ready'));
    return button;
  }

  function createToast() {
    const toast = document.createElement('div');
    toast.id = TOAST_ID;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
    return toast;
  }

  function getButton() {
    return document.getElementById(BUTTON_ID);
  }

  function getToast() {
    return document.getElementById(TOAST_ID);
  }

  function getMainProgress() {
    const candidates = Array.from(
      document.querySelectorAll('.player__ft .player_progress, .player_music .player_progress')
    );
    return candidates
      .map((element) => ({ element, rect: element.getBoundingClientRect() }))
      .filter(({ element, rect }) => {
        const className = element.className || '';
        return (
          rect.width >= 120 &&
          rect.height > 0 &&
          rect.top > window.innerHeight * 0.55 &&
          !String(className).includes('player_voice')
        );
      })
      .sort((a, b) => b.rect.width - a.rect.width)[0] || null;
  }

  function getFooterControlLeft(progressRight) {
    const footer = document.querySelector('.player__ft');
    if (!footer) return null;
    const controls = Array.from(footer.querySelectorAll('a, button'))
      .map((element) => element.getBoundingClientRect())
      .filter((rect) => rect.width > 0 && rect.height > 0 && rect.left > progressRight + 4)
      .sort((a, b) => a.left - b.left);
    return controls.length ? controls[0].left : null;
  }

  function positionFloatingUi() {
    const button = getButton();
    if (!button) return;

    const progress = getMainProgress();
    if (!progress) {
      button.style.opacity = '0';
      return;
    }

    const rect = progress.rect;
    const buttonWidth = button.classList.contains('tabbit-loading') ? 78 : 48;
    const buttonHeight = 36;
    const nextControlLeft = getFooterControlLeft(rect.right);
    const inlineLeft = rect.right + 14;
    const inlineTop = rect.top + rect.height / 2 - buttonHeight / 2;
    let left = inlineLeft;
    let top = inlineTop;

    if (nextControlLeft && inlineLeft + buttonWidth > nextControlLeft - 10) {
      const timeRect = document.querySelector('.player_music__time')?.getBoundingClientRect();
      const upperAnchorTop = timeRect && timeRect.width > 0 ? Math.min(rect.top, timeRect.top) : rect.top;
      left = rect.right - buttonWidth;
      top = upperAnchorTop - buttonHeight - 10;
    }

    left = Math.max(12, Math.min(left, window.innerWidth - buttonWidth - 12));
    top = Math.max(12, Math.min(top, window.innerHeight - buttonHeight - 12));

    button.style.left = `${Math.round(left)}px`;
    button.style.top = `${Math.round(top)}px`;
    button.style.opacity = '';

    const toast = getToast();
    if (toast) {
      const toastLeft = Math.max(12, Math.min(left - 70, window.innerWidth - 292));
      const toastTop = Math.max(12, top - 52);
      toast.style.left = `${Math.round(toastLeft)}px`;
      toast.style.top = `${Math.round(toastTop)}px`;
    }
  }

  function schedulePosition() {
    window.clearTimeout(state.positionTimer);
    state.positionTimer = window.setTimeout(positionFloatingUi, 80);
  }

  function showToast(message, timeout = 2400) {
    const toast = getToast();
    if (!toast) return;
    toast.textContent = message;
    positionFloatingUi();
    toast.classList.add('tabbit-show');
    window.clearTimeout(toast._tabbitTimer);
    toast._tabbitTimer = window.setTimeout(() => {
      toast.classList.remove('tabbit-show');
    }, timeout);
  }

  function setButtonState(nextState) {
    const button = getButton();
    if (!button) return;
    button.classList.toggle('tabbit-loading', nextState === 'loading');
    button.classList.toggle('tabbit-done', nextState === 'done');
    const label = button.querySelector('.tabbit-translator-label');
    if (label) {
      label.textContent = nextState === 'loading' ? '翻译中' : '翻译';
    }
    schedulePosition();
  }

  function normalizeText(text) {
    return String(text || '')
      .replace(/\u00a0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function isUsableLyricText(text) {
    if (!text) return false;
    if (/^\[\d{1,2}:\d{2}(?:\.\d{1,3})?\]$/.test(text)) return false;
    if (/^(作词|作曲|编曲|制作人|出品|发行|OP|SP)\s*[:：]/i.test(text)) return false;
    if (/^(暂无歌词|此歌曲为没有填词的纯音乐|歌词加载中)/.test(text)) return false;
    return text.length <= 180;
  }

  function findLyricRoot() {
    return (
      document.querySelector('#qrc_ctn') ||
      document.querySelector('.song_info__lyric_inner') ||
      document.querySelector('#js_lyric_box') ||
      document.querySelector('.song_info__lyric')
    );
  }

  function collectLyricLines() {
    const root = findLyricRoot();
    if (!root) return { root: null, lines: [] };

    const selector = [
      ':scope > p',
      ':scope > div:not(.' + TRANSLATION_CLASS + ')',
      'p',
      '[data-lyric]',
      '.lyric__item',
      '.js_lyric_line',
    ].join(',');
    const seenElements = new Set();
    const seenKey = new Set();
    const lines = [];

    Array.from(root.querySelectorAll(selector)).forEach((element) => {
      if (seenElements.has(element) || element.classList.contains(TRANSLATION_CLASS)) return;
      seenElements.add(element);

      const text = normalizeText(element.textContent);
      const key = text.toLowerCase();
      if (!isUsableLyricText(text) || seenKey.has(key)) return;
      seenKey.add(key);
      lines.push({ element, text });
    });

    if (!lines.length) {
      const textLines = String(root.textContent || '')
        .split(/\s{2,}|[\r\n]+/)
        .map(normalizeText)
        .filter(isUsableLyricText);

      textLines.forEach((text) => {
        const virtualLine = document.createElement('p');
        virtualLine.className = 'tabbit-qq-virtual-lyric-line';
        virtualLine.textContent = text;
        virtualLine.style.cssText = 'margin: 0 0 14px; color: rgba(255,255,255,.9); text-align: center;';
        root.appendChild(virtualLine);
        lines.push({ element: virtualLine, text });
      });
    }

    return { root, lines };
  }

  function getLyricSignature(lines) {
    return lines.map((line) => line.text).join('\n');
  }

  function removeTranslations() {
    document.querySelectorAll(`.${TRANSLATION_CLASS}`).forEach((element) => element.remove());
  }

  function setTranslationsVisible(visible) {
    state.isVisible = visible;
    document.querySelectorAll(`.${TRANSLATION_CLASS}`).forEach((element) => {
      element.classList.toggle('tabbit-hidden', !visible);
      element.classList.toggle('tabbit-show', visible);
    });
  }

  function renderTranslations(lines, translations) {
    removeTranslations();
    lines.forEach((line, index) => {
      const translated = normalizeText(translations[index]);
      if (!translated) return;

      const node = document.createElement('div');
      node.className = TRANSLATION_CLASS;
      node.textContent = translated;
      line.element.insertAdjacentElement('afterend', node);
      requestAnimationFrame(() => node.classList.add('tabbit-show'));
    });
  }

  function parseBridgeJson(raw) {
    if (!raw) return null;
    if (typeof raw === 'object') return raw;

    const text = String(raw).trim();
    try {
      return JSON.parse(text);
    } catch (_error) {
      const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
      if (fenced) {
        try {
          return JSON.parse(fenced[1].trim());
        } catch (_fencedError) {
          return null;
        }
      }

      const objectLike = text.match(/\{[\s\S]*\}/);
      if (objectLike) {
        try {
          return JSON.parse(objectLike[0]);
        } catch (_objectError) {
          return null;
        }
      }
    }
    return null;
  }

  function normalizeTranslations(payload, expectedLength) {
    const rawList = Array.isArray(payload)
      ? payload
      : Array.isArray(payload && payload.translations)
        ? payload.translations
        : [];
    const output = new Array(expectedLength).fill('');

    rawList.forEach((item, position) => {
      if (typeof item === 'string') {
        output[position] = item;
        return;
      }
      if (!item || typeof item !== 'object') return;
      const index = Number.isInteger(item.index) ? item.index : position;
      output[index] = item.zh || item.translation || item.text || '';
    });

    return output.map(normalizeText);
  }

  async function translateLyrics(lines) {
    if (!window.LLMBridge || typeof window.LLMBridge.chat !== 'function') {
      throw new Error('当前页面没有可用的 LLMBridge.chat，请在 Tabbit 的脚本执行环境中运行。');
    }

    const payload = lines.map((line, index) => ({
      index,
      text: line.text,
    }));
    const prompt = [
      '你是专业歌词翻译。请把下面歌词逐句将其发音用中文替换。不是翻译哦',
      '要求：',
      '1. 保持输入顺序和 index 不变。',
      '2. 每句只将其发音用中文替换。',
      '3. 如果原文已经是中文，可以做轻微润色或原样返回。',
      '4. 只返回 JSON，格式为 {"translations":[{"index":0,"zh":"中文译文"}]}。',
      '',
      JSON.stringify(payload),
    ].join('\n');

    const response = await window.LLMBridge.chat(prompt, { response_format: 'json' });
    const parsed = parseBridgeJson(response);
    const translations = normalizeTranslations(parsed, lines.length);

    if (!translations.some(Boolean)) {
      throw new Error('没有解析到有效译文。');
    }

    return translations;
  }

  async function handleTranslateClick() {
    if (state.isBusy) return;

    const { lines } = collectLyricLines();
    const signature = getLyricSignature(lines);

    if (!lines.length) {
      showToast('还没有识别到可翻译的歌词');
      return;
    }

    if (state.translatedSignature === signature && document.querySelector(`.${TRANSLATION_CLASS}`)) {
      setTranslationsVisible(!state.isVisible);
      showToast(state.isVisible ? '已显示中文翻译' : '已隐藏中文翻译', 1400);
      return;
    }

    state.isBusy = true;
    setButtonState('loading');
    showToast('正在翻译当前歌词...');

    try {
      const translations = await translateLyrics(lines);
      renderTranslations(lines, translations);
      state.lastLyricSignature = signature;
      state.translatedSignature = signature;
      state.isVisible = true;
      setButtonState('done');
      showToast('中文翻译已添加到歌词下方');
    } catch (error) {
      console.error('[Tabbit] QQ Music lyric translation failed:', error);
      setButtonState('idle');
      showToast(error && error.message ? error.message : '翻译失败，请稍后重试', 3600);
    } finally {
      state.isBusy = false;
    }
  }

  function watchLyricChanges() {
    const { lines } = collectLyricLines();
    const signature = getLyricSignature(lines);
    if (!signature) return;

    if (!state.lastLyricSignature) {
      state.lastLyricSignature = signature;
      return;
    }

    if (state.lastLyricSignature !== signature && state.translatedSignature !== signature) {
      state.lastLyricSignature = signature;
      state.translatedSignature = '';
      removeTranslations();
      setButtonState('idle');
    }
  }

  function startObservers() {
    state.observer = new MutationObserver(() => {
      schedulePosition();
      window.clearTimeout(state.lyricTimer);
      state.lyricTimer = window.setTimeout(watchLyricChanges, 180);
    });
    state.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style'],
    });

    window.addEventListener('resize', schedulePosition, { passive: true });
    window.addEventListener('scroll', schedulePosition, { passive: true });
    state.pollTimer = window.setInterval(schedulePosition, POLL_INTERVAL_MS);
  }

  state.destroy = function destroy() {
    if (state.observer) state.observer.disconnect();
    window.clearTimeout(state.positionTimer);
    window.clearTimeout(state.lyricTimer);
    window.clearInterval(state.pollTimer);
    window.removeEventListener('resize', schedulePosition);
    window.removeEventListener('scroll', schedulePosition);
    const button = document.getElementById(BUTTON_ID);
    const toast = document.getElementById(TOAST_ID);
    const style = document.getElementById(STYLE_ID);
    if (button) button.remove();
    if (toast) toast.remove();
    if (style) style.remove();
    removeTranslations();
    if (window[STATE_KEY] === state) {
      delete window[STATE_KEY];
    }
  };

  function init() {
    injectStyle();
    createButton();
    createToast();
    startObservers();
    schedulePosition();
    window.setTimeout(watchLyricChanges, 600);
    console.log('[Tabbit] QQ Music lyric translator is ready.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();