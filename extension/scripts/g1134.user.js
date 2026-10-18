(function() {
  const SCRIPT_ID = 'tabbit-xhs-sneaky-escape-video';
  const STYLE_ID = `${SCRIPT_ID}-style`;
  const READY_ATTR = 'data-tabbit-xhs-sneak-ready';
  const PREV_POSITION_ATTR = 'data-tabbit-xhs-sneak-prev-position';
  const HOST_CLASS = 'tabbit-xhs-sneak-host';
  const BADGE_CLASS = 'tabbit-xhs-sneak-badge';
  const STATUS_CLASS = 'tabbit-xhs-sneak-status';
  const VIDEO_CLASS = 'tabbit-xhs-sneak-video';
  const AURA_CLASS = 'tabbit-xhs-sneak-aura';

  if (window.__tabbitXhsSneakyEscapeCleanup) {
    window.__tabbitXhsSneakyEscapeCleanup();
  }

  const state = {
    observer: null,
    scanTimer: null,
    cards: new WeakMap()
  };

  const selectors = {
    card: [
      'section.note-item',
      '.note-item',
      '[data-note-id]',
      'section[class*="note"]',
      'div[class*="note-item"]'
    ].join(','),
    cover: [
      'a.cover',
      '.cover',
      '.note-cover',
      '[class*="cover"]'
    ].join(','),
    image: [
      'picture img',
      'img[src]',
      'img[data-src]',
      'img'
    ].join(',')
  };

  function injectStyle() {
    document.getElementById(STYLE_ID)?.remove();

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .${HOST_CLASS} {
        position: absolute !important;
        top: 10px !important;
        right: 10px !important;
        z-index: 72 !important;
        display: none !important;
        align-items: center !important;
        justify-content: flex-end !important;
        gap: 6px !important;
        pointer-events: none !important;
        opacity: 0.98 !important;
        transform: translateY(0) scale(0.99) !important;
        transition:
          opacity 180ms cubic-bezier(.2, .8, .2, 1),
          transform 180ms cubic-bezier(.2, .8, .2, 1) !important;
      }

      [${READY_ATTR}="true"]:hover .${HOST_CLASS},
      [${READY_ATTR}="true"]:focus-within .${HOST_CLASS},
      .${HOST_CLASS}.is-active {
        opacity: 1 !important;
        transform: translateY(-1px) scale(1) !important;
      }

      .${HOST_CLASS},
      [${READY_ATTR}="true"]:hover .${HOST_CLASS},
      [${READY_ATTR}="true"]:focus-within .${HOST_CLASS},
      .${HOST_CLASS}.is-active {
        display: none !important;
      }

      .${BADGE_CLASS} {
        position: relative !important;
        min-width: 32px !important;
        height: 32px !important;
        display: inline-grid !important;
        grid-template-columns: 14px auto !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 6px !important;
        padding: 0 10px !important;
        border: 0.5px solid rgba(255, 255, 255, 0.72) !important;
        border-radius: 999px !important;
        background:
          linear-gradient(135deg, rgba(255, 255, 255, 0.84), rgba(255, 255, 255, 0.38)),
          linear-gradient(135deg, rgba(0, 122, 255, 0.18), rgba(255, 45, 85, 0.18)) !important;
        color: rgba(18, 24, 34, 0.90) !important;
        box-shadow:
          0 12px 30px rgba(15, 23, 42, 0.18),
          0 2px 8px rgba(15, 23, 42, 0.08),
          inset 0 1px 0 rgba(255, 255, 255, 0.84),
          inset 0 -1px 0 rgba(255, 255, 255, 0.22) !important;
        backdrop-filter: blur(20px) saturate(1.62) !important;
        -webkit-backdrop-filter: blur(20px) saturate(1.62) !important;
        font: 720 12px/1 -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Segoe UI", sans-serif !important;
        letter-spacing: 0 !important;
        white-space: nowrap !important;
        user-select: none !important;
        -webkit-user-select: none !important;
        transform: translateZ(0) !important;
        transition:
          width 180ms cubic-bezier(.2, .8, .2, 1),
          transform 180ms cubic-bezier(.2, .8, .2, 1),
          background 180ms cubic-bezier(.2, .8, .2, 1),
          box-shadow 180ms cubic-bezier(.2, .8, .2, 1) !important;
      }

      [${READY_ATTR}="true"]:hover .${BADGE_CLASS} {
        transform: translateY(-1px) scale(1.018) !important;
        background:
          linear-gradient(135deg, rgba(255, 255, 255, 0.94), rgba(255, 255, 255, 0.50)),
          linear-gradient(135deg, rgba(0, 122, 255, 0.22), rgba(255, 45, 85, 0.22)) !important;
        box-shadow:
          0 15px 34px rgba(15, 23, 42, 0.22),
          0 3px 10px rgba(15, 23, 42, 0.10),
          inset 0 1px 0 rgba(255, 255, 255, 0.90) !important;
      }

      .tabbit-xhs-sneak-icon {
        position: relative !important;
        width: 14px !important;
        height: 14px !important;
        display: inline-grid !important;
        place-items: center !important;
        color: rgba(255, 45, 85, 0.92) !important;
        line-height: 1 !important;
      }

      .tabbit-xhs-sneak-icon svg {
        width: 14px !important;
        height: 14px !important;
        display: block !important;
      }

      .tabbit-xhs-sneak-label {
        max-width: 82px !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
      }

      .${BADGE_CLASS}.is-idle {
        grid-template-columns: 14px auto !important;
      }

      .${BADGE_CLASS}.is-generating .tabbit-xhs-sneak-icon {
        border-radius: 999px !important;
        border: 1.6px solid rgba(20, 24, 34, 0.16) !important;
        border-top-color: rgba(255, 45, 85, 0.94) !important;
        border-right-color: rgba(0, 122, 255, 0.82) !important;
        animation: tabbitXhsSneakSpin 820ms linear infinite !important;
      }

      .${BADGE_CLASS}.is-generating .tabbit-xhs-sneak-icon svg {
        opacity: 0 !important;
      }

      .${BADGE_CLASS}.is-ready {
        grid-template-columns: 8px auto !important;
        background:
          linear-gradient(135deg, rgba(255, 255, 255, 0.90), rgba(255, 255, 255, 0.44)),
          linear-gradient(135deg, rgba(52, 199, 89, 0.25), rgba(0, 122, 255, 0.14)) !important;
      }

      .${BADGE_CLASS}.is-ready .tabbit-xhs-sneak-icon {
        width: 8px !important;
        height: 8px !important;
        border-radius: 999px !important;
        background: #34c759 !important;
        box-shadow:
          0 0 0 3px rgba(52, 199, 89, 0.18),
          0 0 14px rgba(52, 199, 89, 0.52) !important;
      }

      .${BADGE_CLASS}.is-ready .tabbit-xhs-sneak-icon svg {
        display: none !important;
      }

      .${BADGE_CLASS}.is-playing {
        background:
          linear-gradient(135deg, rgba(255, 255, 255, 0.90), rgba(255, 255, 255, 0.42)),
          linear-gradient(135deg, rgba(88, 86, 214, 0.20), rgba(0, 122, 255, 0.22)) !important;
      }

      .${BADGE_CLASS}.is-open {
        opacity: 0.74 !important;
        background:
          linear-gradient(135deg, rgba(255, 255, 255, 0.78), rgba(255, 255, 255, 0.34)),
          linear-gradient(135deg, rgba(142, 142, 147, 0.14), rgba(0, 122, 255, 0.10)) !important;
      }

      .${BADGE_CLASS}.is-error {
        background:
          linear-gradient(135deg, rgba(255, 255, 255, 0.88), rgba(255, 255, 255, 0.46)),
          linear-gradient(135deg, rgba(255, 59, 48, 0.26), rgba(255, 149, 0, 0.16)) !important;
      }

      .${AURA_CLASS} {
        position: absolute !important;
        inset: 0 !important;
        z-index: 70 !important;
        pointer-events: none !important;
        border-radius: inherit !important;
        opacity: 0 !important;
        background:
          radial-gradient(circle at 78% 14%, rgba(255, 255, 255, 0.52), rgba(255, 255, 255, 0.04) 34%, transparent 56%),
          linear-gradient(135deg, rgba(0, 122, 255, 0.10), rgba(255, 45, 85, 0.08)) !important;
        backdrop-filter: blur(2px) saturate(1.10) !important;
        -webkit-backdrop-filter: blur(2px) saturate(1.10) !important;
        transition: opacity 260ms cubic-bezier(.2, .8, .2, 1) !important;
      }

      .${AURA_CLASS}.is-visible {
        opacity: 1 !important;
      }

      .${STATUS_CLASS} {
        position: absolute !important;
        left: 10px !important;
        right: 10px !important;
        bottom: 10px !important;
        z-index: 73 !important;
        min-height: 30px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 7px 11px !important;
        border: 0.5px solid rgba(255, 255, 255, 0.68) !important;
        border-radius: 15px !important;
        background: rgba(255, 255, 255, 0.66) !important;
        color: rgba(18, 24, 34, 0.82) !important;
        box-shadow:
          0 12px 28px rgba(15, 23, 42, 0.14),
          inset 0 1px 0 rgba(255, 255, 255, 0.78) !important;
        backdrop-filter: blur(18px) saturate(1.42) !important;
        -webkit-backdrop-filter: blur(18px) saturate(1.42) !important;
        font: 650 12px/1.28 -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Segoe UI", sans-serif !important;
        letter-spacing: 0 !important;
        text-align: center !important;
        pointer-events: none !important;
        opacity: 0 !important;
        transform: translateY(8px) scale(0.98) !important;
        transition:
          opacity 220ms cubic-bezier(.2, .8, .2, 1),
          transform 220ms cubic-bezier(.2, .8, .2, 1) !important;
      }

      .${STATUS_CLASS}.is-visible {
        opacity: 1 !important;
        transform: translateY(0) scale(1) !important;
      }

      .${VIDEO_CLASS} {
        position: absolute !important;
        inset: 0 !important;
        z-index: 71 !important;
        width: 100% !important;
        height: 100% !important;
        display: block !important;
        object-fit: cover !important;
        border-radius: inherit !important;
        background: transparent !important;
        opacity: 0 !important;
        transform: scale(1.012) !important;
        transition:
          opacity 180ms cubic-bezier(.2, .8, .2, 1),
          transform 360ms cubic-bezier(.2, .8, .2, 1) !important;
      }

      .${VIDEO_CLASS}.is-visible {
        opacity: 1 !important;
        transform: scale(1) !important;
      }

      .tabbit-xhs-sneak-fade-img {
        opacity: 0.0 !important;
        transform: scale(1.012) !important;
        transition:
          opacity 320ms cubic-bezier(.2, .8, .2, 1),
          transform 360ms cubic-bezier(.2, .8, .2, 1) !important;
      }

      @media (max-width: 520px) {
        .${HOST_CLASS} {
          top: 8px !important;
          right: 8px !important;
        }

        .${BADGE_CLASS} {
          height: 30px !important;
          min-width: 30px !important;
          padding: 0 9px !important;
        }

        .tabbit-xhs-sneak-label {
          max-width: 70px !important;
        }
      }

      @keyframes tabbitXhsSneakSpin {
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }

  function sleep(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  function findImage(card) {
    const images = Array.from(card.querySelectorAll(selectors.image));
    return images.find((img) => {
      const rect = img.getBoundingClientRect();
      const src = getImageSource(img);
      return src && rect.width >= 80 && rect.height >= 80;
    }) || images.find((img) => getImageSource(img)) || null;
  }

  function findCover(card, img) {
    return img?.closest(selectors.cover) || card.querySelector(selectors.cover) || img?.parentElement || card;
  }

  function getImageSource(img) {
    return img?.currentSrc || img?.src || img?.getAttribute('src') || img?.getAttribute('data-src') || '';
  }

  function toAbsoluteUrl(url) {
    if (!url) return '';
    try {
      return new URL(url, location.href).href;
    } catch (error) {
      return url;
    }
  }

  function isPublicUrl(url) {
    return /^https?:\/\//i.test(url || '');
  }

  function getAspectRatio(img) {
    const width = Number(img?.naturalWidth || img?.getBoundingClientRect().width || 1);
    const height = Number(img?.naturalHeight || img?.getBoundingClientRect().height || 1);
    const ratio = width / Math.max(height, 1);

    if (ratio >= 2.05) return '21:9';
    if (ratio >= 1.62) return '16:9';
    if (ratio >= 1.38) return '3:2';
    if (ratio >= 1.18) return '4:3';
    if (ratio <= 0.48) return '9:16';
    if (ratio <= 0.72) return '2:3';
    if (ratio <= 0.86) return '3:4';
    return '1:1';
  }

  function videoRatioFromAspect(aspect) {
    if (['16:9', '9:16', '4:3', '3:4', '1:1', '21:9'].includes(aspect)) {
      return aspect;
    }
    if (aspect === '3:2') return '4:3';
    if (aspect === '2:3') return '3:4';
    return 'adaptive';
  }

  function ensurePositioned(cover) {
    if (!cover) return;
    const position = getComputedStyle(cover).position;
    if (position === 'static') {
      cover.setAttribute(PREV_POSITION_ATTR, cover.style.position || '');
      cover.style.position = 'relative';
    }
    cover.style.overflow = cover.style.overflow || 'hidden';
  }

  function iconMarkup() {
    return [
      '<span class="tabbit-xhs-sneak-icon" aria-hidden="true">',
      '<svg viewBox="0 0 24 24" fill="none">',
      '<path d="M15.5 5.8c1.4.4 2.7 1.3 3.6 2.5M18.4 14.6c-.7 2.2-2.5 3.9-4.8 4.5M7.9 18.1c-2-1.2-3.2-3.3-3.2-5.7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
      '<path d="M9.2 7.7c1.9-1.6 4.8-1.3 6.3.7 1.5 1.9 1.2 4.7-.7 6.2-1.9 1.6-4.8 1.3-6.3-.7-1.5-1.9-1.2-4.7.7-6.2Z" stroke="currentColor" stroke-width="2"/>',
      '</svg>',
      '</span>'
    ].join('');
  }

  function setBadge(cardState, mode, label) {
    const badge = cardState.badge;
    if (!badge) return;
    badge.classList.toggle('is-idle', mode === 'idle');
    badge.classList.toggle('is-generating', mode === 'generating');
    badge.classList.toggle('is-ready', mode === 'ready');
    badge.classList.toggle('is-playing', mode === 'playing');
    badge.classList.toggle('is-open', mode === 'open');
    badge.classList.toggle('is-error', mode === 'error');
    badge.querySelector('.tabbit-xhs-sneak-label').textContent = label;
  }

  function showStatus(cardState, message, duration = 2200) {
    // Keep status text available for debugging without showing an extra floating prompt.
    cardState.status.textContent = message;
    cardState.status.classList.remove('is-visible');
    window.clearTimeout(cardState.statusTimer);
  }

  function hideStatus(cardState) {
    window.clearTimeout(cardState.statusTimer);
    cardState.status.classList.remove('is-visible');
  }

  function setAura(cardState, visible) {
    cardState.aura.classList.toggle('is-visible', Boolean(visible));
  }

  function setImageSmoothly(img, src) {
    if (!img || !src) return;
    img.classList.add('tabbit-xhs-sneak-fade-img');
    window.setTimeout(() => {
      img.src = src;
      img.removeAttribute('srcset');
      img.removeAttribute('data-src');
      img.onload = () => {
        requestAnimationFrame(() => img.classList.remove('tabbit-xhs-sneak-fade-img'));
      };
      window.setTimeout(() => img.classList.remove('tabbit-xhs-sneak-fade-img'), 520);
    }, 120);
  }

  function setImageImmediately(img, src) {
    if (!img || !src) return;
    img.classList.remove('tabbit-xhs-sneak-fade-img');
    img.src = src;
    img.removeAttribute('srcset');
    img.removeAttribute('data-src');
  }

  function preloadImage(src, timeoutMs = 1800) {
    return new Promise((resolve) => {
      if (!src) {
        resolve(false);
        return;
      }

      const image = new Image();
      let done = false;
      const finish = (ok) => {
        if (done) return;
        done = true;
        window.clearTimeout(timer);
        resolve(ok);
      };
      const timer = window.setTimeout(() => finish(false), timeoutMs);

      image.onload = async () => {
        try {
          if (typeof image.decode === 'function') {
            await image.decode();
          }
        } catch (error) {
          // The image is still usable after onload; decode can reject for SVG/data URLs.
        }
        finish(true);
      };
      image.onerror = () => finish(false);
      image.src = src;
    });
  }

  function ensureBridge(method) {
    if (!window.LLMBridge || typeof window.LLMBridge[method] !== 'function') {
      throw new Error(`当前页面未提供 LLMBridge.${method}`);
    }
  }

  function isLocalValidationPage() {
    return ['127.0.0.1', 'localhost', '::1'].includes(location.hostname) || location.protocol === 'file:';
  }

  function hasRequiredBridgeMethods() {
    const hasVideoBridge = Boolean(
      typeof window.LLMBridge?.generateVideo === 'function' ||
      typeof window.LLMBridge?.createVideoTask === 'function'
    );
    const hasVideoTaskBridge = Boolean(
      typeof window.LLMBridge?.getVideoGenerationTask === 'function' ||
      typeof window.LLMBridge?.getVideoTask === 'function'
    );

    return Boolean(
      window.LLMBridge &&
      typeof window.LLMBridge.generateImage === 'function' &&
      hasVideoBridge &&
      hasVideoTaskBridge
    );
  }

  function shouldUseMockBridge() {
    if (window.__TABBIT_XHS_SNEAK_TEST_MODE__ === true) return true;
    return isLocalValidationPage() && !hasRequiredBridgeMethods();
  }

  function collectReference(cardState) {
    const src = toAbsoluteUrl(cardState.originalSrc || getImageSource(cardState.img));
    if (isPublicUrl(src)) return { type: 'url', value: src };
    if (/^data:image\//i.test(src)) return { type: 'base64', value: src };
    return null;
  }

  function buildDisappearedPrompt() {
    return [
      '基于参考图生成同一张小红书封面照片的尾帧：保持原图构图、镜头、背景、光线、色彩、材质、景深和图片比例一致。',
      '让画面中的主要主体自然消失或已经悄悄离开，只保留合理的背景、遮挡关系、影子减弱后的痕迹和环境连续性。',
      '不要改变背景中的固定物体，不添加文字、水印、边框、贴纸或夸张特效。',
      '结果要像真实照片/真实封面，干净自然，高级，主体缺席但画面完整。'
    ].join('');
  }

  function buildVideoPrompt() {
    return [
      '生成一个 5 秒短视频，从第一帧原图平滑过渡到最后一帧主体消失图。',
      '主体像做了坏事一样鬼鬼祟祟、轻手轻脚地从画面里溜走，动作克制、有趣但不恐怖。',
      '保持原图构图、背景、光影和色彩连续，镜头轻微稳定推近或小幅视差，过渡丝滑自然。',
      '不要文字、不要水印、不要夸张卡通特效、不要改变背景主体关系。'
    ].join('');
  }

  function buildFallbackVideoPrompt() {
    return [
      '基于参考图生成一个 5 秒短视频。',
      '画面主体鬼鬼祟祟、轻手轻脚地从画面里溜走，最后画面接近空镜，只保留原背景。',
      '保持原图构图、背景、光影、色彩和真实封面质感，镜头轻微稳定推近，动作自然流畅。',
      '不要文字、不要水印、不要夸张卡通特效。'
    ].join('');
  }

  async function createVideoTask(prompt, options) {
    if (typeof window.LLMBridge?.generateVideo === 'function') {
      return window.LLMBridge.generateVideo(prompt, options);
    }
    if (typeof window.LLMBridge?.createVideoTask === 'function') {
      return window.LLMBridge.createVideoTask({ prompt, ...options });
    }
    throw new Error('当前页面未提供 LLMBridge.generateVideo/createVideoTask');
  }

  async function getVideoTask(taskId) {
    if (typeof window.LLMBridge?.getVideoGenerationTask === 'function') {
      return window.LLMBridge.getVideoGenerationTask(taskId);
    }
    if (typeof window.LLMBridge?.getVideoTask === 'function') {
      return window.LLMBridge.getVideoTask(taskId);
    }
    throw new Error('当前页面未提供 LLMBridge.getVideoGenerationTask/getVideoTask');
  }

  async function mockMedia(cardState) {
    await sleep(900);
    const width = Math.max(320, Math.round(cardState.img?.naturalWidth || cardState.img?.getBoundingClientRect().width || 640));
    const height = Math.max(320, Math.round(cardState.img?.naturalHeight || cardState.img?.getBoundingClientRect().height || 800));
    const svg = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
      '<defs>',
      '<linearGradient id="bg" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#f7f2ea"/><stop offset="0.55" stop-color="#d8e7ef"/><stop offset="1" stop-color="#f6cfd9"/></linearGradient>',
      '<radialGradient id="glow" cx="0.74" cy="0.30" r="0.52"><stop offset="0" stop-color="#ffffff" stop-opacity="0.70"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>',
      '</defs>',
      '<rect width="100%" height="100%" fill="url(#bg)"/>',
      '<rect width="100%" height="100%" fill="url(#glow)"/>',
      `<ellipse cx="${width * 0.50}" cy="${height * 0.72}" rx="${width * 0.22}" ry="${height * 0.035}" fill="#59606d" opacity="0.13"/>`,
      `<path d="M ${width * 0.34} ${height * 0.58} C ${width * 0.44} ${height * 0.48}, ${width * 0.60} ${height * 0.48}, ${width * 0.70} ${height * 0.58}" fill="none" stroke="#ffffff" stroke-width="${Math.max(3, width * 0.012)}" stroke-linecap="round" opacity="0.48"/>`,
      `<text x="${width * 0.50}" y="${height * 0.84}" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="${Math.max(18, width * 0.045)}" font-weight="700" fill="#263040" opacity="0.54">主体已悄悄溜走</text>`,
      '</svg>'
    ].join('');
    return {
      imageUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
      videoUrl: 'data:video/mp4;base64,',
      mock: true
    };
  }

  async function generateMedia(cardState) {
    if (shouldUseMockBridge()) {
      return mockMedia(cardState);
    }

    ensureBridge('generateImage');
    if (!hasRequiredBridgeMethods()) {
      throw new Error('当前页面未提供完整视频生成 Bridge：需要 generateImage，以及 generateVideo/getVideoGenerationTask 或 createVideoTask/getVideoTask');
    }

    const reference = collectReference(cardState);
    if (!reference) {
      throw new Error('当前封面图不是可用的 http(s) 或 Data URL，无法作为参考图');
    }

    const imageOptions = {
      aspect_ratio: cardState.aspectRatio,
      output_format: 'png',
      watermark: false
    };
    if (reference.type === 'url') {
      imageOptions.reference_image_url = reference.value;
    } else {
      imageOptions.reference_image_base64 = reference.value;
    }

    showStatus(cardState, '正在生成主体消失尾帧', 0);
    const imageResult = await window.LLMBridge.generateImage(buildDisappearedPrompt(), imageOptions);
    const imageUrl = imageResult?.image_url || imageResult?.image_urls?.[0];
    if (!imageResult?.success || !imageUrl) {
      throw new Error(imageResult?.error_message || '主体消失图生成失败');
    }

    const firstFrame = reference.type === 'url' ? reference.value : '';
    if (!firstFrame || !isPublicUrl(imageUrl)) {
      return { imageUrl, videoUrl: '', mock: false };
    }

    showStatus(cardState, '正在生成鬼鬼祟祟溜走短视频', 0);
    const commonVideoOptions = {
      ratio: videoRatioFromAspect(cardState.aspectRatio),
      duration: 5,
      resolution: '720p',
      generate_audio: false,
      watermark: false
    };

    let task = null;
    try {
      task = await createVideoTask(buildVideoPrompt(), {
        ...commonVideoOptions,
        reference_image_urls: [firstFrame, imageUrl],
        image_roles: ['first_frame', 'last_frame']
      });
      if (!task?.success || !task.task_id) {
        throw new Error(task?.error_message || '首尾帧视频任务创建失败');
      }
    } catch (error) {
      console.warn('[Tabbit XHS Sneaky Escape] 首尾帧视频创建失败，降级为单首帧图生视频', error);
      showStatus(cardState, '首尾帧视频不可用，改用单首帧生成', 0);
      task = await createVideoTask(buildFallbackVideoPrompt(), {
        ...commonVideoOptions,
        reference_image_url: firstFrame
      });
    }

    if (!task?.success || !task.task_id) {
      throw new Error(task?.error_message || '视频任务创建失败');
    }

    let videoResult = null;
    for (let i = 0; i < 30; i += 1) {
      showStatus(cardState, `视频生成中 ${i + 1}/30`, 0);
      await sleep(10000);
      videoResult = await getVideoTask(task.task_id);
      if (['succeeded', 'failed', 'expired'].includes(videoResult?.status)) break;
    }

    if (!videoResult?.success || videoResult.status !== 'succeeded' || !videoResult.video_url) {
      throw new Error(videoResult?.error_message || `视频任务未成功：${videoResult?.status || 'unknown'}`);
    }

    return {
      imageUrl,
      videoUrl: videoResult.video_url,
      mock: false
    };
  }

  async function startGeneration(cardState) {
    if (cardState.phase === 'generating') return;

    cardState.phase = 'generating';
    setBadge(cardState, 'generating', '生成中');
    setAura(cardState, true);
    showStatus(cardState, '正在准备原图与尾帧', 0);

    try {
      const result = await generateMedia(cardState);
      cardState.generatedImageUrl = result.imageUrl;
      cardState.videoUrl = result.videoUrl;
      cardState.phase = 'ready';
      setAura(cardState, false);
      setBadge(cardState, 'ready', result.videoUrl ? '可播放' : '已生成');
      hideStatus(cardState);
    } catch (error) {
      console.warn('[Tabbit XHS Sneaky Escape] 生成失败', error);
      cardState.phase = 'error';
      setAura(cardState, false);
      setBadge(cardState, 'error', '重试');
      showStatus(cardState, error?.message || '生成失败，可再次点击重试', 3600);
    }
  }

  function removeVideo(cardState) {
    cardState.video?.pause?.();
    cardState.video?.remove?.();
    cardState.video = null;
  }

  async function playGeneratedVideo(cardState) {
    if (!cardState.videoUrl) {
      void finishToOpenState(cardState);
      return;
    }

    removeVideo(cardState);
    hideStatus(cardState);
    cardState.phase = 'playing';
    setBadge(cardState, 'playing', '播放中');

    const video = document.createElement('video');
    video.className = VIDEO_CLASS;
    video.src = cardState.videoUrl;
    video.muted = true;
    video.playsInline = true;
    video.autoplay = false;
    video.preload = 'auto';
    video.controls = false;
    cardState.video = video;
    cardState.cover.appendChild(video);

    video.addEventListener('ended', () => {
      void finishToOpenState(cardState);
    }, { once: true });
    video.addEventListener('error', () => {
      void finishToOpenState(cardState);
    }, { once: true });

    try {
      if (video.readyState < 2) {
        await new Promise((resolve, reject) => {
          const timer = window.setTimeout(resolve, 1200);
          const cleanup = () => {
            window.clearTimeout(timer);
            video.removeEventListener('loadeddata', onReady);
            video.removeEventListener('canplay', onReady);
            video.removeEventListener('error', onError);
          };
          const onReady = () => {
            cleanup();
            resolve();
          };
          const onError = () => {
            cleanup();
            reject(new Error('视频加载失败'));
          };
          video.addEventListener('loadeddata', onReady, { once: true });
          video.addEventListener('canplay', onReady, { once: true });
          video.addEventListener('error', onError, { once: true });
          video.load();
        });
      }
      await video.play();
      requestAnimationFrame(() => video.classList.add('is-visible'));
    } catch (error) {
      void finishToOpenState(cardState);
    }
  }

  async function finishToOpenState(cardState) {
    if (cardState.phase === 'open' || cardState.phase === 'finishing') return;

    cardState.phase = 'finishing';
    const video = cardState.video;
    if (video) {
      try {
        video.pause?.();
        if (Number.isFinite(video.duration) && video.duration > 0) {
          const tailTime = Math.max(0, video.duration - 0.04);
          if (Math.abs(video.currentTime - tailTime) > 0.08) {
            video.currentTime = tailTime;
          }
        }
        video.classList.add('is-visible');
      } catch (error) {
        // Keep finishing visually stable even if the media element rejects seeking.
      }
    }

    if (cardState.generatedImageUrl) {
      await preloadImage(cardState.generatedImageUrl);
      setImageImmediately(cardState.img, cardState.generatedImageUrl);
    }

    if (video) {
      requestAnimationFrame(() => {
        video.classList.remove('is-visible');
      });
      window.setTimeout(() => {
        if (cardState.video === video) {
          video.remove();
          cardState.video = null;
        }
      }, 220);
    }
    cardState.phase = 'open';
    setBadge(cardState, 'open', '可打开');
    hideStatus(cardState);
  }

  function handleCoverClick(cardState, event) {
    if (cardState.phase === 'open') {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    if (cardState.phase === 'idle' || cardState.phase === 'error') {
      startGeneration(cardState);
      return;
    }

    if (cardState.phase === 'ready') {
      playGeneratedVideo(cardState);
    }
  }

  function restoreToReadyState(cardState) {
    removeVideo(cardState);
    if (cardState.originalSrc) {
      setImageImmediately(cardState.img, cardState.originalSrc);
    }
    cardState.phase = cardState.generatedImageUrl ? 'ready' : 'idle';
    setBadge(
      cardState,
      cardState.phase === 'ready' ? 'ready' : 'idle',
      cardState.phase === 'ready' ? '可播放' : '溜走'
    );
    hideStatus(cardState);
  }

  function handleCoverContextMenu(cardState, event) {
    if (cardState.phase !== 'open') return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    restoreToReadyState(cardState);
  }

  function createCardState(card, cover, img) {
    ensurePositioned(cover);

    const host = document.createElement('div');
    host.className = HOST_CLASS;
    host.setAttribute('aria-hidden', 'true');

    const badge = document.createElement('div');
    badge.className = `${BADGE_CLASS} is-idle`;
    badge.innerHTML = `${iconMarkup()}<span class="tabbit-xhs-sneak-label">溜走</span>`;
    host.appendChild(badge);

    const aura = document.createElement('div');
    aura.className = AURA_CLASS;

    const status = document.createElement('div');
    status.className = STATUS_CLASS;

    cover.appendChild(aura);
    cover.appendChild(host);
    cover.appendChild(status);

    const cardState = {
      card,
      cover,
      img,
      host,
      badge,
      aura,
      status,
      statusTimer: null,
      phase: 'idle',
      originalSrc: toAbsoluteUrl(getImageSource(img)),
      generatedImageUrl: '',
      videoUrl: '',
      video: null,
      aspectRatio: getAspectRatio(img),
      clickHandler: null,
      contextMenuHandler: null
    };

    cardState.clickHandler = (event) => handleCoverClick(cardState, event);
    cardState.contextMenuHandler = (event) => handleCoverContextMenu(cardState, event);
    cover.addEventListener('click', cardState.clickHandler, true);
    cover.addEventListener('contextmenu', cardState.contextMenuHandler, true);
    state.cards.set(card, cardState);
    card.setAttribute(READY_ATTR, 'true');
    return cardState;
  }

  function enhanceCard(card) {
    if (!card || card.getAttribute(READY_ATTR) === 'true') return;

    const img = findImage(card);
    if (!img) return;

    const cover = findCover(card, img);
    if (!cover) return;

    createCardState(card, cover, img);
  }

  function scanCards() {
    document.querySelectorAll(selectors.card).forEach(enhanceCard);
  }

  function cleanup() {
    document.getElementById(STYLE_ID)?.remove();
    window.clearTimeout(state.scanTimer);
    state.observer?.disconnect?.();

    document.querySelectorAll(`[${READY_ATTR}="true"]`).forEach((card) => {
      const cardState = state.cards.get(card);
      if (cardState?.cover && cardState.clickHandler) {
        cardState.cover.removeEventListener('click', cardState.clickHandler, true);
      }
      if (cardState?.cover && cardState.contextMenuHandler) {
        cardState.cover.removeEventListener('contextmenu', cardState.contextMenuHandler, true);
      }
      cardState?.video?.remove?.();
      cardState?.host?.remove?.();
      cardState?.aura?.remove?.();
      cardState?.status?.remove?.();
      const cover = cardState?.cover;
      if (cover?.hasAttribute(PREV_POSITION_ATTR)) {
        cover.style.position = cover.getAttribute(PREV_POSITION_ATTR) || '';
        cover.removeAttribute(PREV_POSITION_ATTR);
      }
      card.removeAttribute(READY_ATTR);
    });

    delete window.__tabbitXhsSneakyEscapeCleanup;
  }

  injectStyle();
  scanCards();

  state.observer = new MutationObserver(() => {
    window.clearTimeout(state.scanTimer);
    state.scanTimer = window.setTimeout(scanCards, 180);
  });
  state.observer.observe(document.documentElement, { childList: true, subtree: true });

  window.__tabbitXhsSneakyEscapeCleanup = cleanup;
  console.log('[Tabbit XHS Sneaky Escape] 已启用。本地验证页缺少 LLMBridge 时会自动 mock；真实页面可设置 window.__TABBIT_XHS_SNEAK_TEST_MODE__ = true 强制跳过生图和视频生成。');
})();