// 错误日志专用版：所有关键失败都会弹出可复制的结构化日志。
(function() {
  'use strict';

  const SCRIPT_ID = 'Yuze-img-prompt-studio';
  const STYLE_ID = `${SCRIPT_ID}-style`;
  const PANEL_ID = `${SCRIPT_ID}-panel`;
  const RESULT_PANEL_ID = `${SCRIPT_ID}-result-panel`;
  const LAUNCHER_ID = `${SCRIPT_ID}-launcher`;
  const ERROR_DIALOG_ID = `${SCRIPT_ID}-error-dialog`;
  const PROCESSED_ATTR = 'data-Yuze-img-prompt-studio-ready';
  const HOST_CLASS = 'Yuze-img-prompt-host';
  const BUTTON_CLASS = 'Yuze-img-prompt-button';
  const STATUS_CLASS = 'Yuze-img-prompt-status';
  const STORAGE_KEY = 'Yuze:image-prompt-studio:history:v1';
  const OUTPUT_STORAGE_KEY = 'Yuze:image-prompt-studio:outputs:v1';
  const CLEANUP_KEY = '__YuzeImagePromptStudioCleanup';

  if (window[CLEANUP_KEY]) window[CLEANUP_KEY]();

  const selectors = {
    card: [
      '[data-test-id="pin"]',
      '[data-test-id="pinWrapper"]',
      '[data-test-id="pin-closeup-image"]',
      '[data-test-id="closeup-container"]',
      '[data-test-id="CloseupMainPin"]',
      '[data-test-id="visual-content-container"]',
      '[data-test-id="non-story-pin-image"]',
      '[data-test-id="pinrep-image"]',
      '[data-test-id="pincard-image-without-link"]',
      '[data-grid-item]',
      'article',
      'figure',
      'picture',
      'a[href*="/pin/"]',
      '[role="listitem"]',
      'img[src]',
      'img[srcset]'
    ].join(','),
    cover: [
      '[data-test-id="pin"]',
      '[data-test-id="pinWrapper"]',
      '[data-test-id="pin-closeup-image"]',
      '[data-test-id="closeup-container"]',
      '[data-test-id="CloseupMainPin"]',
      '[data-test-id="visual-content-container"]',
      '[data-test-id="non-story-pin-image"]',
      '[data-test-id="pinrep-image"]',
      '[data-test-id="pincard-image-without-link"]',
      'figure',
      'a[href*="/pin/"]',
      'a[href]',
      'div'
    ].join(','),
    image: [
      'picture img',
      'img[src]',
      'img[srcset]',
      'img'
    ].join(',')
  };

  const state = {
    observer: null,
    scanTimer: null,
    panel: null,
    selectedId: '',
    activeTab: 'prompt',
    history: [],
    outputs: [],
    outputBranches: {},
    selectedHistoryIds: [],
    historyUploadDisabledIds: [],
    selectedHistoryViewMode: 'grid',
    fusionPromptCollapsed: false,
    historyCollapsed: false,
    resultCollapsed: false,
    resultViewMode: 'list',
    resultFocusIndex: 0,
    resultWheelLocked: false,
    historyRibbonMotion: '',
    resultRibbonMotion: '',
    ribbonTimers: {},
    uploadedDataUrl: '',
    promptDrafts: {},
    promptKindByTab: {
      prompt: 'recreate',
      t2i: 'style',
      i2i: 'style',
      multiT2i: 'style',
      multiI2i: 'style'
    },
    analysisQueue: [],
    analysisRunning: false,
    generating: null,
    refining: null,
    preview: null,
    floatingHosts: new Map(),
    panelPosition: null,
    panelHeight: null,
    dragging: null,
    resizing: null,
    errorLogs: [],
    reportedErrors: new WeakSet()
  };

  const config = {
    maxHistory: 50,
    maxOutputs: 50,
    analysisTimeoutMs: 90000,
    generationTimeoutMs: 180000,
    mockAnalysisDelayMs: Math.max(0, Number(window.__YuzeImagePromptStudioConfig?.mockAnalysisDelayMs) || 520),
    mockGenerationDelayMs: Math.max(0, Number(window.__YuzeImagePromptStudioConfig?.mockGenerationDelayMs) || 620),
    mockBridge: Boolean(window.__YuzeImagePromptStudioConfig?.mockBridge)
  };

  function cleanText(value) {
    return String(value || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function sleep(ms) {
    return new Promise(resolve => window.setTimeout(resolve, ms));
  }

  function withTimeout(promise, ms, label) {
    let timer = 0;
    const timeout = new Promise((_, reject) => {
      timer = window.setTimeout(() => reject(new Error(`${label}超时`)), ms);
    });
    return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timer));
  }

  function getErrorText(error) {
    return cleanText([
      error?.message,
      error?.error_message,
      error?.response?.message,
      error?.response?.data?.message,
      typeof error === 'string' ? error : ''
    ].filter(Boolean).join(' '));
  }

  function sanitizeErrorLogValue(value, depth = 0, seen = new WeakSet()) {
    if (value === null || value === undefined) return value;
    if (typeof value === 'string') {
      if (/^data:image\//i.test(value)) return `[图片 Data URL，长度 ${value.length}]`;
      return value.length > 2400 ? `${value.slice(0, 2400)}…（已截断 ${value.length - 2400} 字符）` : value;
    }
    if (typeof value === 'number' || typeof value === 'boolean') return value;
    if (typeof value === 'bigint') return String(value);
    if (typeof value === 'function') return `[Function ${value.name || 'anonymous'}]`;
    if (depth >= 4) return '[已省略深层数据]';
    if (typeof value !== 'object') return String(value);
    if (seen.has(value)) return '[循环引用]';
    seen.add(value);

    if (value instanceof Error) {
      return {
        name: value.name,
        message: value.message,
        stack: value.stack || '',
        code: value.code,
        status: value.status,
        error_message: value.error_message,
        cause: sanitizeErrorLogValue(value.cause, depth + 1, seen)
      };
    }

    if (Array.isArray(value)) {
      return value.slice(0, 20).map(item => sanitizeErrorLogValue(item, depth + 1, seen));
    }

    const result = {};
    Object.keys(value).slice(0, 40).forEach(key => {
      try {
        result[key] = sanitizeErrorLogValue(value[key], depth + 1, seen);
      } catch (readError) {
        result[key] = `[读取失败: ${getErrorText(readError) || '未知错误'}]`;
      }
    });
    return result;
  }

  function formatErrorLog(entry) {
    const details = sanitizeErrorLogValue(entry.rawError);
    const context = sanitizeErrorLogValue(entry.context || {});
    return [
      'Yuze 图片 Prompt 工作室错误日志（日志专用版）',
      `时间: ${entry.timestamp}`,
      `步骤: ${entry.step}`,
      `页面: ${location.href}`,
      `错误类型: ${entry.error?.name || typeof entry.error || 'Error'}`,
      `错误消息: ${entry.message || '未知错误'}`,
      '',
      '上下文:',
      JSON.stringify(context, null, 2),
      '',
      '错误详情:',
      JSON.stringify(details, null, 2),
      '',
      '堆栈:',
      entry.error?.stack || '无可用堆栈'
    ].join('\n');
  }

  async function copyErrorLog(textarea, button, status) {
    try {
      let copied = false;
      let clipboardError = null;
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(textarea.value);
          copied = true;
        } catch (error) {
          clipboardError = error;
        }
      }
      if (!copied) {
        textarea.focus();
        textarea.select();
        if (!document.execCommand?.('copy')) throw clipboardError || new Error('浏览器拒绝复制');
      }
      button.textContent = '已复制';
      status.textContent = '错误日志已复制到剪贴板。';
      window.setTimeout(() => { button.textContent = '复制日志'; }, 1200);
    } catch (copyError) {
      textarea.focus();
      textarea.select();
      status.textContent = `自动复制失败，请按 Ctrl/Cmd+C 手动复制：${getErrorText(copyError) || '未知错误'}`;
    }
  }

  function showErrorLogDialog(entry) {
    try {
      document.getElementById(ERROR_DIALOG_ID)?.remove();
      const overlay = document.createElement('div');
      overlay.id = ERROR_DIALOG_ID;
      overlay.className = 'Yuze-img-error-overlay';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-label', '错误日志');
      overlay.innerHTML = `
        <section class="Yuze-img-error-dialog">
          <div class="Yuze-img-error-head">
            <div>
              <strong>操作失败 · ${escapeHtml(entry.step)}</strong>
              <span>日志专用版已捕获完整错误信息</span>
            </div>
            <button type="button" class="Yuze-img-error-close" data-action="close-error-log" aria-label="关闭">×</button>
          </div>
          <textarea class="Yuze-img-error-log" readonly spellcheck="false" aria-label="可复制的错误日志"></textarea>
          <div class="Yuze-img-error-foot">
            <span class="Yuze-img-error-status">可直接选择文本，或点击复制日志。</span>
            <div>
              <button type="button" class="Yuze-img-error-secondary" data-action="close-error-log">关闭</button>
              <button type="button" class="Yuze-img-error-primary" data-action="copy-error-log">复制日志</button>
            </div>
          </div>
        </section>
      `;
      const textarea = overlay.querySelector('.Yuze-img-error-log');
      const status = overlay.querySelector('.Yuze-img-error-status');
      const copyButton = overlay.querySelector('[data-action="copy-error-log"]');
      textarea.value = entry.logText;
      overlay.querySelectorAll('[data-action="close-error-log"]').forEach(button => {
        button.addEventListener('click', () => overlay.remove());
      });
      copyButton.addEventListener('click', () => copyErrorLog(textarea, copyButton, status));
      overlay.addEventListener('click', event => {
        if (event.target === overlay) overlay.remove();
      });
      (document.body || document.documentElement).appendChild(overlay);
      window.setTimeout(() => textarea.focus(), 0);
    } catch (dialogError) {
      console.error('[Yuze][错误日志弹窗创建失败]', dialogError, entry.logText);
      window.alert?.(`操作失败：${entry.step}\n\n${entry.logText}`);
    }
  }

  function reportStudioError(step, error, context = {}) {
    const normalizedError = error instanceof Error ? error : new Error(getErrorText(error) || String(error || '未知错误'));
    if (error && typeof error === 'object') state.reportedErrors.add(error);
    state.reportedErrors.add(normalizedError);
    const entry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      timestamp: new Date().toISOString(),
      step: cleanText(step || '未知步骤') || '未知步骤',
      message: getErrorText(error) || normalizedError.message || '未知错误',
      error: normalizedError,
      rawError: error,
      context
    };
    entry.logText = formatErrorLog(entry);
    state.errorLogs = [entry, ...state.errorLogs].slice(0, 20);
    console.error(`[Yuze][${entry.step}]`, error, context);
    showErrorLogDialog(entry);
    return entry;
  }

  function isBridgeAuthWarmupError(error) {
    return /(请先登录|未登录|unauthorized|unauthenticated|login required|401|403)/i.test(getErrorText(error));
  }

  async function callBridgeWithAuthRetry(factory, label, timeoutMs) {
    try {
      return await withTimeout(factory(), timeoutMs, label);
    } catch (error) {
      if (!isBridgeAuthWarmupError(error)) throw error;
      console.warn(`[Yuze] ${label} 首次鉴权未就绪，自动重试一次:`, error);
      await sleep(700);
      return withTimeout(factory(), timeoutMs, label);
    }
  }

  function visible(el) {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
  }

  function toAbsoluteUrl(url) {
    const text = String(url || '').trim();
    if (!text || /^javascript:/i.test(text)) return '';
    try {
      return new URL(text, location.href).href;
    } catch (error) {
      return text;
    }
  }

  function getImageSource(img) {
    return toAbsoluteUrl(img?.currentSrc || img?.src || img?.getAttribute('src') || '');
  }

  function getReferenceFromSource(source) {
    if (/^https?:\/\//i.test(source)) return { type: 'url', value: source };
    if (/^data:image\//i.test(source)) return { type: 'base64', value: source };
    return null;
  }

  function buildReferenceOptions(references) {
    const urls = references.filter(item => item?.type === 'url' && item.value).map(item => item.value);
    const base64s = references.filter(item => item?.type === 'base64' && item.value).map(item => item.value);
    const options = {};

    if (urls.length === 1 && base64s.length === 0) options.reference_image_url = urls[0];
    if (urls.length > 1 || (urls.length > 0 && base64s.length > 0)) options.reference_image_urls = urls;
    if (base64s.length === 1 && urls.length === 0) options.reference_image_base64 = base64s[0];
    if (base64s.length > 1 || (base64s.length > 0 && urls.length > 0)) options.reference_image_base64s = base64s;
    return options;
  }

  function getAspectRatioFromImage(img) {
    const width = Number(img?.naturalWidth || img?.getBoundingClientRect().width || 1);
    const height = Number(img?.naturalHeight || img?.getBoundingClientRect().height || 1);
    return getAspectRatioFromSize(width, height);
  }

  function getAspectRatioFromSize(width, height) {
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

  function getSelectedItem() {
    return state.history.find(item => item.id === state.selectedId) || state.history[0] || null;
  }

  function isFusionTab(tab = state.activeTab) {
    return tab === 'multiT2i' || tab === 'multiI2i';
  }

  function isGenerationTab(tab = state.activeTab) {
    return tab !== 'prompt';
  }

  function getReadyHistory() {
    return state.history.filter(item => item?.status !== 'analyzing' && item?.status !== 'error' && item?.image);
  }

  function getSelectedHistoryItems() {
    const ready = getReadyHistory();
    const selected = state.selectedHistoryIds
      .map(id => ready.find(item => item.id === id))
      .filter(Boolean);
    if (selected.length) return selected;
    const item = getSelectedItem();
    return item && ready.some(readyItem => readyItem.id === item.id) ? [item] : [];
  }

  function getPromptKind(tab = state.activeTab) {
    return state.promptKindByTab[tab] || 'style';
  }

  function getPromptDraftKey(tab = state.activeTab, kind = getPromptKind(tab)) {
    return `${tab}:${kind}`;
  }

  function getPromptText(item, kind = getPromptKind()) {
    if (!item) return '';
    if (kind === 'style') return item.stylePrompt || item.prompt || '';
    return item.prompt || item.stylePrompt || '';
  }

  function getOutputKey(output) {
    return output?.id || `${output?.createdAt || ''}::${output?.url || ''}`;
  }

  function getOutputDisplayBranch(output) {
    const key = getOutputKey(output);
    if (!key || !output?.displayBranchId) return null;
    return (state.outputBranches[key] || []).find(branch => branch.id === output.displayBranchId) || null;
  }

  function getOutputDisplay(output) {
    const branch = getOutputDisplayBranch(output);
    if (!branch) return output;
    return {
      ...output,
      url: branch.url,
      title: branch.title || '微调结果',
      prompt: branch.prompt || output.prompt || '',
      displayBranchId: branch.id
    };
  }

  function toggleOutputDisplayBranch(outputId, branchId) {
    const output = getOutputById(outputId);
    if (!output) return;
    const branches = state.outputBranches[getOutputKey(output)] || [];
    const branch = branches.find(item => item.id === branchId);
    if (!branch) return;
    output.displayBranchId = output.displayBranchId === branch.id ? '' : branch.id;
    if (state.preview?.outputId === getOutputKey(output)) {
      const display = getOutputDisplay(output);
      state.preview.activeUrl = display.url || output.url;
      state.preview.activeTitle = display.title || output.title;
    }
    saveOutputs();
    renderPanel();
    applyPanelPosition();
    renderImagePreviewOverlay();
  }

  function getActivePromptTextarea() {
    const activePane = state.panel?.querySelector(`.Yuze-img-studio-pane[data-pane="${state.activeTab}"]`);
    return activePane?.querySelector('.Yuze-img-studio-prompt-textarea[data-role="main-prompt"]')
      || activePane?.querySelector('.Yuze-img-studio-prompt-textarea')
      || state.panel?.querySelector('.Yuze-img-studio-prompt-textarea')
      || null;
  }

  function hasPromptDraft(tab) {
    return Object.prototype.hasOwnProperty.call(state.promptDrafts, tab);
  }

  function getPromptDraft(tab, fallback) {
    return hasPromptDraft(tab) ? state.promptDrafts[tab] : fallback;
  }

  function rememberActivePromptDraft() {
    const textarea = getActivePromptTextarea();
    if (!textarea) return;
    state.promptDrafts[textarea.dataset.draftKey || getPromptDraftKey()] = textarea.value;
  }

  function resetPromptDrafts() {
    state.promptDrafts = {};
  }

  function clearTabDrafts(tab) {
    Object.keys(state.promptDrafts).forEach(key => {
      if (key === tab || key.startsWith(`${tab}:`)) delete state.promptDrafts[key];
    });
  }

  function getSelectedPrompt() {
    const textarea = getActivePromptTextarea();
    if (textarea) {
      state.promptDrafts[textarea.dataset.draftKey || getPromptDraftKey()] = textarea.value;
      return cleanText(textarea.value);
    }
    return cleanText(getPromptDraft(getPromptDraftKey(), getPromptText(getSelectedItem())));
  }

  function findHistoryItem(id) {
    return state.history.find(item => item.id === id) || null;
  }

  function updateHistoryItem(id, patch, options = {}) {
    const index = state.history.findIndex(item => item.id === id);
    if (index < 0) return null;
    state.history[index] = { ...state.history[index], ...patch };
    const item = state.history[index];
    if (options.persist) saveHistory();
    if (options.render) {
      renderPanel();
      applyPanelPosition();
    } else if (options.sync !== false) {
      syncSelectedPromptDom(item);
    }
    return item;
  }

  function syncSelectedPromptDom(item) {
    if (!state.panel || !item || item.id !== state.selectedId) return;
    const promptTextarea = state.panel.querySelector('.Yuze-img-studio-prompt-textarea[data-prompt-kind="recreate"]') || getActivePromptTextarea();
    if (promptTextarea && promptTextarea.dataset.role !== 'negative' && promptTextarea.dataset.role !== 'main-prompt') {
      promptTextarea.value = item.prompt || '';
      promptTextarea.scrollTop = promptTextarea.scrollHeight;
    }
    const mainPromptTextarea = getActivePromptTextarea();
    if (mainPromptTextarea?.classList.contains('is-streaming')) {
      mainPromptTextarea.value = item.prompt || '';
      mainPromptTextarea.scrollTop = mainPromptTextarea.scrollHeight;
    }
    const negativeTextarea = state.panel.querySelector('.Yuze-img-studio-small-textarea[data-role="negative"]');
    if (negativeTextarea) negativeTextarea.value = item.negativePrompt || '';
    const statusText = state.panel.querySelector('.Yuze-img-studio-streaming-copy');
    if (statusText && item.status === 'analyzing') {
      statusText.textContent = item.prompt ? 'Prompt 正在流式输出' : '正在读取图片风格';
    }
  }

  function extractChunkText(chunk) {
    if (!chunk) return '';
    if (typeof chunk === 'string') return chunk;
    if (typeof chunk?.content === 'string') return chunk.content;
    if (typeof chunk?.delta === 'string') return chunk.delta;
    if (typeof chunk?.text === 'string') return chunk.text;
    if (typeof chunk?.data?.content === 'string') return chunk.data.content;
    if (typeof chunk?.data?.delta === 'string') return chunk.data.delta;
    return '';
  }

  function decodeJsonStringFragment(value) {
    return String(value || '')
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');
  }

  function extractPromptFromJsonFragment(text) {
    const match = String(text || '').match(/"prompt"\s*:\s*"((?:\\.|[^"\\])*)/);
    return match ? decodeJsonStringFragment(match[1]) : '';
  }

  function buildFallbackStylePrompt(prompt) {
    const text = cleanText(prompt);
    if (!text) return '保留原图的视觉风格、构图节奏、光影层次、配色气质、材质质感和图片感，不限定具体主体。';
    return [
      '提取并沿用参考图的纯视觉风格：',
      text,
      '不要复刻具体人物身份、具体产品、文字、水印或独特场景，只迁移构图、镜头语言、光影、色彩、材质、排版留白、质感和后期氛围。'
    ].join('');
  }

  async function streamPromptText(itemId, text, options = {}) {
    const target = String(text || '').trim();
    if (!target) return;
    const currentItem = findHistoryItem(itemId);
    const current = String(currentItem?.prompt || '');
    const shouldAppend = current && target.startsWith(current);
    let next = shouldAppend ? current : '';
    const start = shouldAppend ? current.length : 0;
    const duration = Number(options.duration || 0);
    const delay = duration > 0
      ? Math.max(4, Math.min(18, Math.floor(duration / Math.max(target.length - start, 1))))
      : Math.max(4, Number(options.delay || 7));

    for (let index = start; index < target.length; index += 1) {
      next += target[index];
      updateHistoryItem(itemId, { prompt: next, status: 'analyzing' }, { sync: true });
      await sleep(delay);
    }
  }

  function iconSvg(name) {
    const common = 'width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"';
    const icons = {
      scan: `<svg ${common}><path d="M7 3H5a2 2 0 0 0-2 2v2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="12" r="3"/><path d="m16 16 4 4"/></svg>`,
      sparkle: `<svg ${common}><path d="M12 3l1.7 5.1L19 10l-5.3 1.9L12 17l-1.7-5.1L5 10l5.3-1.9L12 3Z"/><path d="M5 17l.8 2.2L8 20l-2.2.8L5 23l-.8-2.2L2 20l2.2-.8L5 17Z"/></svg>`,
      image: `<svg ${common}><rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="8.5" cy="10" r="1.5"/><path d="m21 15-4.5-4.5L9 18"/></svg>`,
      copy: `<svg ${common}><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V6a2 2 0 0 1 2-2h10"/></svg>`,
      close: `<svg ${common}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,
      check: `<svg ${common}><path d="m20 6-11 11-5-5"/></svg>`,
      chevronLeft: `<svg ${common}><path d="m15 18-6-6 6-6"/></svg>`,
      chevronRight: `<svg ${common}><path d="m9 18 6-6-6-6"/></svg>`,
      layoutList: `<svg ${common}><rect x="4" y="5" width="16" height="4" rx="1.2"/><rect x="4" y="10" width="16" height="4" rx="1.2"/><rect x="4" y="15" width="16" height="4" rx="1.2"/></svg>`,
      focusImage: `<svg ${common}><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 15l2.5-3 2 2.2 1.8-2.2L18 17"/><circle cx="9" cy="9" r="1.2"/></svg>`,
      plus: `<svg ${common}><path d="M12 5v14"/><path d="M5 12h14"/></svg>`
    };
    return icons[name] || icons.sparkle;
  }

  function injectStyle() {
    document.getElementById(STYLE_ID)?.remove();
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .${HOST_CLASS} {
        position: absolute !important;
        top: 10px !important;
        right: 10px !important;
        z-index: 58 !important;
        display: inline-flex !important;
        pointer-events: none !important;
      }

      .${HOST_CLASS}.is-pinterest {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: auto !important;
        bottom: auto !important;
        z-index: 120 !important;
        display: block !important;
        isolation: isolate !important;
      }

      .${HOST_CLASS}.is-pinterest .${BUTTON_CLASS} {
        position: absolute !important;
        top: auto !important;
        left: 12px !important;
        bottom: 12px !important;
        z-index: 121 !important;
        min-width: 74px !important;
        height: 32px !important;
        padding: 0 10px !important;
        background:
          linear-gradient(145deg, rgba(255,255,255,0.92), rgba(255,255,255,0.58)),
          linear-gradient(135deg, rgba(230,0,35,0.20), rgba(0,122,255,0.14)) !important;
      }

      .${BUTTON_CLASS} {
        appearance: none !important;
        -webkit-appearance: none !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 5px !important;
        height: 30px !important;
        min-width: 88px !important;
        padding: 0 11px !important;
        border: 0.5px solid rgba(255, 255, 255, 0.72) !important;
        border-radius: 999px !important;
        background:
          linear-gradient(145deg, rgba(255,255,255,0.86), rgba(255,255,255,0.42)),
          linear-gradient(135deg, rgba(255,45,85,0.24), rgba(0,122,255,0.18) 58%, rgba(52,199,89,0.12)) !important;
        color: rgba(18, 24, 34, 0.90) !important;
        box-shadow:
          0 12px 30px rgba(20, 24, 32, 0.18),
          0 2px 8px rgba(20, 24, 32, 0.10),
          inset 0 1px 0 rgba(255,255,255,0.84),
          inset 0 -1px 0 rgba(255,255,255,0.22) !important;
        backdrop-filter: blur(20px) saturate(1.65) !important;
        -webkit-backdrop-filter: blur(20px) saturate(1.65) !important;
        font: 680 12px/1 -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Segoe UI", sans-serif !important;
        letter-spacing: 0 !important;
        white-space: nowrap !important;
        cursor: pointer !important;
        pointer-events: auto !important;
        user-select: none !important;
        transform: translateZ(0) scale(1) !important;
        transition:
          opacity 180ms cubic-bezier(.2,.8,.2,1),
          transform 180ms cubic-bezier(.2,.8,.2,1),
          box-shadow 180ms cubic-bezier(.2,.8,.2,1),
          background 180ms cubic-bezier(.2,.8,.2,1) !important;
      }

      .${BUTTON_CLASS}:hover {
        transform: translateY(-1px) scale(1.024) !important;
        background:
          linear-gradient(145deg, rgba(255,255,255,0.96), rgba(255,255,255,0.54)),
          linear-gradient(135deg, rgba(255,45,85,0.30), rgba(0,122,255,0.22) 58%, rgba(52,199,89,0.16)) !important;
        box-shadow:
          0 16px 38px rgba(20, 24, 32, 0.22),
          0 3px 10px rgba(20, 24, 32, 0.12),
          inset 0 1px 0 rgba(255,255,255,0.90) !important;
      }

      .${BUTTON_CLASS}:active {
        transform: translateY(0) scale(0.972) !important;
        transition-duration: 90ms !important;
      }

      .${BUTTON_CLASS}[disabled] {
        cursor: default !important;
        opacity: 0.75 !important;
      }

      .${BUTTON_CLASS}.is-loading svg {
        animation: YuzeImagePromptSpin 820ms linear infinite !important;
      }

      .${BUTTON_CLASS}.is-queued {
        background:
          linear-gradient(145deg, rgba(255,255,255,0.84), rgba(255,255,255,0.40)),
          linear-gradient(135deg, rgba(255,149,0,0.24), rgba(0,122,255,0.14)) !important;
      }

      #${LAUNCHER_ID} {
        position: fixed !important;
        right: 22px !important;
        bottom: 24px !important;
        z-index: 999998 !important;
        width: 48px !important;
        height: 48px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        border: 0.5px solid rgba(255,255,255,0.76) !important;
        border-radius: 999px !important;
        background:
          linear-gradient(145deg, rgba(255,255,255,0.88), rgba(255,255,255,0.46)),
          linear-gradient(135deg, rgba(255,45,85,0.24), rgba(0,122,255,0.22)) !important;
        color: rgba(18,24,34,0.90) !important;
        box-shadow:
          0 16px 42px rgba(20,24,32,0.20),
          0 4px 12px rgba(20,24,32,0.10),
          inset 0 1px 0 rgba(255,255,255,0.84) !important;
        backdrop-filter: blur(20px) saturate(1.65) !important;
        -webkit-backdrop-filter: blur(20px) saturate(1.65) !important;
        cursor: pointer !important;
        user-select: none !important;
        -webkit-user-select: none !important;
        transition:
          transform 180ms cubic-bezier(.2,.8,.2,1),
          opacity 180ms cubic-bezier(.2,.8,.2,1),
          box-shadow 180ms cubic-bezier(.2,.8,.2,1) !important;
      }

      #${LAUNCHER_ID}:hover {
        transform: translateY(-1px) scale(1.035) !important;
        box-shadow:
          0 20px 48px rgba(20,24,32,0.24),
          0 5px 14px rgba(20,24,32,0.12),
          inset 0 1px 0 rgba(255,255,255,0.90) !important;
      }

      #${LAUNCHER_ID}.is-active {
        opacity: 0.88 !important;
      }

      #${LAUNCHER_ID} .Yuze-img-launcher-badge {
        position: absolute !important;
        top: -4px !important;
        right: -4px !important;
        min-width: 18px !important;
        height: 18px !important;
        padding: 0 5px !important;
        display: none !important;
        align-items: center !important;
        justify-content: center !important;
        box-sizing: border-box !important;
        border: 1px solid rgba(255,255,255,0.86) !important;
        border-radius: 999px !important;
        background: rgba(255,45,85,0.92) !important;
        color: white !important;
        font: 760 10px/1 -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Segoe UI", sans-serif !important;
        box-shadow: 0 8px 18px rgba(255,45,85,0.24) !important;
      }

      #${LAUNCHER_ID}.has-work .Yuze-img-launcher-badge {
        display: inline-flex !important;
      }

      #${LAUNCHER_ID}.is-receiving {
        animation: YuzeImageDockReceive 720ms cubic-bezier(.16,1,.3,1) both !important;
      }

      .Yuze-img-dock-sprite {
        position: fixed !important;
        z-index: 1000002 !important;
        left: 0 !important;
        top: 0 !important;
        width: 84px !important;
        height: 84px !important;
        pointer-events: none !important;
        border-radius: 22px !important;
        overflow: hidden !important;
        background: rgba(255,255,255,0.42) !important;
        box-shadow:
          0 22px 58px rgba(20,24,32,0.24),
          0 8px 20px rgba(20,24,32,0.12),
          inset 0 1px 0 rgba(255,255,255,0.72) !important;
        backdrop-filter: blur(10px) saturate(1.35) !important;
        -webkit-backdrop-filter: blur(10px) saturate(1.35) !important;
        will-change: transform, opacity, filter !important;
      }

      .Yuze-img-dock-sprite img {
        width: 100% !important;
        height: 100% !important;
        display: block !important;
        object-fit: cover !important;
      }

      .Yuze-img-dock-sprite::after {
        content: "" !important;
        position: absolute !important;
        inset: 0 !important;
        border-radius: inherit !important;
        background:
          linear-gradient(135deg, rgba(255,255,255,0.36), transparent 46%),
          radial-gradient(circle at 72% 18%, rgba(255,255,255,0.68), transparent 18%) !important;
        mix-blend-mode: screen !important;
      }

      .Yuze-img-dock-particle {
        position: fixed !important;
        z-index: 1000001 !important;
        width: 8px !important;
        height: 8px !important;
        border-radius: 999px !important;
        pointer-events: none !important;
        background: rgba(255,255,255,0.92) !important;
        box-shadow:
          0 0 18px rgba(255,255,255,0.78),
          0 0 28px rgba(0,122,255,0.26) !important;
        will-change: transform, opacity !important;
      }

      .${STATUS_CLASS} {
        position: absolute !important;
        left: 10px !important;
        right: 10px !important;
        bottom: 10px !important;
        z-index: 59 !important;
        display: block !important;
        box-sizing: border-box !important;
        padding: 9px 11px !important;
        border: 0.5px solid rgba(255,255,255,0.62) !important;
        border-radius: 14px !important;
        background: rgba(255,255,255,0.70) !important;
        color: rgba(18,24,34,0.86) !important;
        box-shadow: 0 12px 28px rgba(20,24,32,0.16), inset 0 1px 0 rgba(255,255,255,0.72) !important;
        backdrop-filter: blur(16px) saturate(1.45) !important;
        -webkit-backdrop-filter: blur(16px) saturate(1.45) !important;
        font: 650 12px/1.25 -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Segoe UI", sans-serif !important;
        opacity: 0 !important;
        transform: translateY(8px) scale(0.985) !important;
        pointer-events: none !important;
        transition: opacity 180ms cubic-bezier(.2,.8,.2,1), transform 180ms cubic-bezier(.2,.8,.2,1) !important;
      }

      .${STATUS_CLASS}.is-visible {
        opacity: 1 !important;
        transform: translateY(0) scale(1) !important;
      }

      #${PANEL_ID} {
        position: fixed !important;
        top: 18px !important;
        right: 20px !important;
        z-index: 999999 !important;
        width: min(560px, calc(100vw - 28px)) !important;
        height: min(760px, calc(100vh - 36px)) !important;
        display: grid !important;
        grid-template-rows: auto 1fr !important;
        overflow: hidden !important;
        overscroll-behavior: contain !important;
        border: 0.5px solid rgba(255, 255, 255, 0.70) !important;
        border-radius: 24px !important;
        background:
          linear-gradient(145deg, rgba(255,255,255,0.84), rgba(255,255,255,0.58)),
          radial-gradient(circle at 18% 0%, rgba(255,45,85,0.12), transparent 28%),
          radial-gradient(circle at 88% 16%, rgba(0,122,255,0.12), transparent 30%),
          linear-gradient(135deg, rgba(52,199,89,0.07), rgba(255,149,0,0.05)) !important;
        box-shadow:
          0 30px 90px rgba(20, 24, 32, 0.26),
          0 10px 30px rgba(20, 24, 32, 0.14),
          inset 0 1px 0 rgba(255,255,255,0.88) !important;
        backdrop-filter: blur(32px) saturate(1.75) !important;
        -webkit-backdrop-filter: blur(32px) saturate(1.75) !important;
        color: rgba(18,24,34,0.92) !important;
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Segoe UI", sans-serif !important;
        letter-spacing: 0 !important;
        opacity: 0 !important;
        pointer-events: none !important;
        visibility: hidden !important;
        transform: translate3d(26px, 34px, 0) scale(0.86) !important;
        transform-origin: calc(100% - 38px) calc(100% - 38px) !important;
        filter: blur(10px) saturate(1.08) !important;
        transition:
          opacity 260ms cubic-bezier(.16,1,.3,1),
          transform 360ms cubic-bezier(.16,1,.3,1),
          filter 280ms cubic-bezier(.16,1,.3,1),
          width 240ms cubic-bezier(.2,.8,.2,1),
          height 180ms cubic-bezier(.2,.8,.2,1),
          right 240ms cubic-bezier(.2,.8,.2,1),
          visibility 0s linear 260ms !important;
      }

      #${PANEL_ID}.is-history-collapsed {
        width: min(444px, calc(100vw - 28px)) !important;
      }

      #${PANEL_ID}.is-visible {
        opacity: 1 !important;
        pointer-events: auto !important;
        visibility: visible !important;
        transform: translate3d(0, 0, 0) scale(1) !important;
        filter: blur(0) saturate(1) !important;
        animation: YuzeMacWindowOpen 420ms cubic-bezier(.16,1,.3,1) both !important;
        transition:
          opacity 260ms cubic-bezier(.16,1,.3,1),
          transform 360ms cubic-bezier(.16,1,.3,1),
          filter 280ms cubic-bezier(.16,1,.3,1),
          width 240ms cubic-bezier(.2,.8,.2,1),
          height 180ms cubic-bezier(.2,.8,.2,1),
          right 240ms cubic-bezier(.2,.8,.2,1),
          visibility 0s linear 0s !important;
      }

      #${RESULT_PANEL_ID} {
        position: fixed !important;
        top: 18px !important;
        right: 20px !important;
        z-index: 999998 !important;
        width: 190px !important;
        height: min(760px, calc(100vh - 36px)) !important;
        display: grid !important;
        min-height: 0 !important;
        overflow: hidden !important;
        border: 0.5px solid rgba(255,255,255,0.70) !important;
        border-radius: 22px !important;
        background:
          linear-gradient(145deg, rgba(255,255,255,0.80), rgba(255,255,255,0.54)),
          radial-gradient(circle at 70% 4%, rgba(0,122,255,0.10), transparent 34%),
          rgba(246,248,250,0.48) !important;
        box-shadow:
          0 24px 70px rgba(20,24,32,0.20),
          0 8px 24px rgba(20,24,32,0.12),
          inset 0 1px 0 rgba(255,255,255,0.82) !important;
        backdrop-filter: blur(28px) saturate(1.55) !important;
        -webkit-backdrop-filter: blur(28px) saturate(1.55) !important;
        opacity: 0 !important;
        pointer-events: none !important;
        visibility: hidden !important;
        transform: translateX(14px) scale(0.985) !important;
        transition:
          opacity 220ms cubic-bezier(.2,.8,.2,1),
          transform 220ms cubic-bezier(.2,.8,.2,1),
          width 360ms cubic-bezier(.16,1,.3,1),
          left 360ms cubic-bezier(.16,1,.3,1),
          top 220ms cubic-bezier(.2,.8,.2,1),
          visibility 0s linear 220ms !important;
      }

      #${RESULT_PANEL_ID}.is-visible {
        opacity: 1 !important;
        pointer-events: auto !important;
        visibility: visible !important;
        transform: translateX(0) scale(1) !important;
        transition:
          opacity 220ms cubic-bezier(.2,.8,.2,1),
          transform 220ms cubic-bezier(.2,.8,.2,1),
          width 360ms cubic-bezier(.16,1,.3,1),
          left 360ms cubic-bezier(.16,1,.3,1),
          top 220ms cubic-bezier(.2,.8,.2,1),
          visibility 0s linear 0s !important;
      }

      #${RESULT_PANEL_ID}.is-collapsed {
        width: 44px !important;
      }

      #${RESULT_PANEL_ID}.is-result-expanding .Yuze-img-studio-result-column {
        transform-origin: left center !important;
        animation: YuzeRibbonUnfoldRight 420ms cubic-bezier(.16,1,.3,1) both !important;
      }

      #${RESULT_PANEL_ID}.is-result-collapsing .Yuze-img-studio-result-column {
        transform-origin: left center !important;
        animation: YuzeRibbonFoldRight 340ms cubic-bezier(.4,0,.2,1) both !important;
      }

      #${RESULT_PANEL_ID} .Yuze-img-studio-result-column {
        position: relative !important;
        height: 100% !important;
        box-sizing: border-box !important;
        padding: 12px !important;
      }

      #${RESULT_PANEL_ID} .Yuze-img-studio-result-column::before,
      #${RESULT_PANEL_ID} .Yuze-img-studio-result-column::after {
        content: "" !important;
        position: absolute !important;
        pointer-events: none !important;
        z-index: 1 !important;
      }

      #${RESULT_PANEL_ID} .Yuze-img-studio-result-column::before {
        left: 0 !important;
        top: 12px !important;
        bottom: 12px !important;
        width: 18px !important;
        border-radius: 999px !important;
        background:
          radial-gradient(ellipse at right center, rgba(255,255,255,0.52), rgba(255,255,255,0.10) 62%, transparent 74%) !important;
        filter: blur(0.2px) !important;
        opacity: 0.68 !important;
        transform: scaleX(0.72) !important;
        transform-origin: right center !important;
      }

      #${RESULT_PANEL_ID} .Yuze-img-studio-result-column::after {
        left: 8px !important;
        top: 14px !important;
        bottom: 14px !important;
        width: 26px !important;
        border-radius: 999px !important;
        background: linear-gradient(90deg, rgba(255,255,255,0.34), transparent) !important;
        opacity: 0 !important;
        transform: translateX(-10px) scaleX(0.46) !important;
      }

      #${RESULT_PANEL_ID}.is-result-expanding .Yuze-img-studio-result-column::after {
        animation: YuzeRibbonSheenRight 420ms cubic-bezier(.16,1,.3,1) both !important;
      }

      #${RESULT_PANEL_ID}.is-result-collapsing .Yuze-img-studio-result-column::before {
        animation: YuzeRibbonEdgePullRight 340ms cubic-bezier(.4,0,.2,1) both !important;
      }

      #${RESULT_PANEL_ID}.is-collapsed .Yuze-img-studio-result-column {
        padding: 8px !important;
      }

      .Yuze-img-studio-header {
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) auto !important;
        align-items: center !important;
        gap: 14px !important;
        padding: 13px 14px 11px !important;
        border-bottom: 0.5px solid rgba(255,255,255,0.56) !important;
        cursor: grab !important;
        user-select: none !important;
        -webkit-user-select: none !important;
        touch-action: none !important;
      }

      #${PANEL_ID}.is-dragging .Yuze-img-studio-header {
        cursor: grabbing !important;
      }

      #${PANEL_ID}.is-resizing {
        transition: none !important;
      }

      .Yuze-img-studio-resize-handle {
        position: absolute !important;
        right: 8px !important;
        bottom: 8px !important;
        z-index: 4 !important;
        width: 28px !important;
        height: 28px !important;
        border: 0 !important;
        border-radius: 12px !important;
        background: transparent !important;
        color: rgba(74,84,102,0.46) !important;
        cursor: ns-resize !important;
        pointer-events: auto !important;
      }

      .Yuze-img-studio-resize-handle::before,
      .Yuze-img-studio-resize-handle::after {
        content: "" !important;
        position: absolute !important;
        right: 7px !important;
        bottom: 8px !important;
        height: 1.5px !important;
        border-radius: 999px !important;
        background: currentColor !important;
        transform: rotate(-45deg) !important;
        transform-origin: right center !important;
      }

      .Yuze-img-studio-resize-handle::before {
        width: 15px !important;
      }

      .Yuze-img-studio-resize-handle::after {
        width: 9px !important;
        bottom: 13px !important;
      }

      .Yuze-img-studio-resize-handle:hover,
      #${PANEL_ID}.is-resizing .Yuze-img-studio-resize-handle {
        color: rgba(18,24,34,0.64) !important;
        background: rgba(255,255,255,0.32) !important;
      }

      .Yuze-img-studio-title {
        margin: 0 !important;
        font-size: 15px !important;
        line-height: 1.22 !important;
        font-weight: 760 !important;
        color: rgba(18,24,34,0.94) !important;
      }

      .Yuze-img-studio-subtitle {
        margin-top: 3px !important;
        font-size: 12px !important;
        line-height: 1.3 !important;
        font-weight: 520 !important;
        color: rgba(74,84,102,0.72) !important;
      }

      .Yuze-img-studio-close,
      .Yuze-img-studio-icon-button {
        appearance: none !important;
        -webkit-appearance: none !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 32px !important;
        height: 32px !important;
        border: 0.5px solid rgba(255,255,255,0.70) !important;
        border-radius: 999px !important;
        background: rgba(255,255,255,0.52) !important;
        color: rgba(18,24,34,0.72) !important;
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.74) !important;
        cursor: pointer !important;
        transition: transform 160ms cubic-bezier(.2,.8,.2,1), background 160ms cubic-bezier(.2,.8,.2,1) !important;
      }

      .Yuze-img-studio-close:hover,
      .Yuze-img-studio-icon-button:hover {
        transform: scale(1.04) !important;
        background: rgba(255,255,255,0.76) !important;
      }

      .Yuze-img-studio-shell {
        min-height: 0 !important;
        display: grid !important;
        grid-template-columns: 160px minmax(0, 1fr) !important;
        gap: 0 !important;
        transition: grid-template-columns 380ms cubic-bezier(.16,1,.3,1) !important;
      }

      .Yuze-img-studio-shell.is-history-collapsed {
        grid-template-columns: 44px minmax(0, 1fr) !important;
      }

      .Yuze-img-studio-history {
        position: relative !important;
        min-height: 0 !important;
        display: grid !important;
        grid-template-rows: auto 1fr !important;
        border-right: 0.5px solid rgba(255,255,255,0.54) !important;
        background: rgba(255,255,255,0.20) !important;
        overflow: visible !important;
        transform-origin: left center !important;
      }

      .Yuze-img-studio-history::before,
      .Yuze-img-studio-history::after {
        content: "" !important;
        position: absolute !important;
        pointer-events: none !important;
        z-index: 2 !important;
      }

      .Yuze-img-studio-history::before {
        right: -12px !important;
        top: 12px !important;
        bottom: 12px !important;
        width: 24px !important;
        border-radius: 0 999px 999px 0 !important;
        background:
          radial-gradient(ellipse at left center, rgba(255,255,255,0.50), rgba(255,255,255,0.10) 62%, transparent 74%) !important;
        filter: blur(0.2px) !important;
        opacity: 0.62 !important;
        transform: scaleX(0.74) !important;
        transform-origin: left center !important;
      }

      .Yuze-img-studio-history::after {
        right: 8px !important;
        top: 14px !important;
        bottom: 14px !important;
        width: 28px !important;
        border-radius: 999px !important;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.36)) !important;
        opacity: 0 !important;
        transform: translateX(12px) scaleX(0.42) !important;
      }

      .Yuze-img-studio-shell.is-history-expanding .Yuze-img-studio-history {
        animation: YuzeRibbonUnfoldLeft 680ms cubic-bezier(.16,1,.3,1) both !important;
      }

      .Yuze-img-studio-shell.is-history-collapsing .Yuze-img-studio-history {
        animation: YuzeRibbonFoldLeft 560ms cubic-bezier(.4,0,.2,1) both !important;
      }

      .Yuze-img-studio-shell.is-history-expanding .Yuze-img-studio-history::after {
        animation: YuzeRibbonSheenLeft 680ms cubic-bezier(.16,1,.3,1) both !important;
      }

      .Yuze-img-studio-shell.is-history-collapsing .Yuze-img-studio-history::before {
        animation: YuzeRibbonEdgePullLeft 560ms cubic-bezier(.4,0,.2,1) both !important;
      }

      .Yuze-img-studio-history-head {
        padding: 12px 9px 9px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 10px !important;
      }

      .Yuze-img-studio-history-title {
        font-size: 12px !important;
        line-height: 1 !important;
        font-weight: 760 !important;
        color: rgba(74,84,102,0.78) !important;
      }

      .Yuze-img-studio-history-collapse {
        flex: 0 0 auto !important;
      }

      .Yuze-img-studio-history-side-toggle {
        appearance: none !important;
        -webkit-appearance: none !important;
        position: absolute !important;
        right: -9px !important;
        top: 50% !important;
        z-index: 4 !important;
        width: 18px !important;
        height: 46px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        border: 0.5px solid rgba(255,255,255,0.48) !important;
        border-radius: 999px !important;
        background:
          linear-gradient(180deg, rgba(255,255,255,0.52), rgba(255,255,255,0.26)),
          rgba(255,255,255,0.24) !important;
        color: rgba(74,84,102,0.56) !important;
        box-shadow:
          0 6px 16px rgba(20,24,32,0.08),
          inset 0 1px 0 rgba(255,255,255,0.62) !important;
        backdrop-filter: blur(14px) saturate(1.20) !important;
        -webkit-backdrop-filter: blur(14px) saturate(1.20) !important;
        cursor: pointer !important;
        opacity: 0.72 !important;
        transform: translateY(-50%) !important;
        transition:
          opacity 160ms cubic-bezier(.2,.8,.2,1),
          background 160ms cubic-bezier(.2,.8,.2,1),
          color 160ms cubic-bezier(.2,.8,.2,1),
          transform 160ms cubic-bezier(.2,.8,.2,1) !important;
      }

      .Yuze-img-studio-history-side-toggle:hover {
        opacity: 1 !important;
        color: rgba(18,24,34,0.72) !important;
        background:
          linear-gradient(180deg, rgba(255,255,255,0.72), rgba(255,255,255,0.38)),
          rgba(255,255,255,0.34) !important;
        transform: translateY(-50%) scale(1.03) !important;
      }

      .Yuze-img-studio-history-side-toggle svg {
        width: 15px !important;
        height: 15px !important;
        stroke-width: 2.5 !important;
      }

      .Yuze-img-studio-shell.is-history-collapsed .Yuze-img-studio-history-head {
        padding: 12px 5px 8px !important;
        justify-content: center !important;
      }

      .Yuze-img-studio-shell.is-history-collapsed .Yuze-img-studio-history-title,
      .Yuze-img-studio-shell.is-history-collapsed [data-action="clear-history"],
      .Yuze-img-studio-shell.is-history-collapsed .Yuze-img-studio-history-head,
      .Yuze-img-studio-shell.is-history-collapsed .Yuze-img-studio-history-list {
        display: none !important;
      }

      .Yuze-img-studio-history-rail {
        display: none !important;
      }

      .Yuze-img-studio-shell.is-history-collapsed .Yuze-img-studio-history-rail {
        min-height: 0 !important;
        display: grid !important;
        place-items: start center !important;
        padding: 8px 0 !important;
        color: rgba(74,84,102,0.66) !important;
        font: 760 11px/1 -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Segoe UI", sans-serif !important;
        writing-mode: vertical-rl !important;
        text-orientation: mixed !important;
      }

      .Yuze-img-studio-history-list {
        min-height: 0 !important;
        overflow: auto !important;
        overscroll-behavior: contain !important;
        -webkit-overflow-scrolling: touch !important;
        padding: 0 9px 12px !important;
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) !important;
        grid-auto-rows: max-content !important;
        align-content: start !important;
        align-items: start !important;
        gap: 10px !important;
      }

      .Yuze-img-studio-history-item {
        appearance: none !important;
        -webkit-appearance: none !important;
        position: relative !important;
        display: grid !important;
        grid-template-rows: auto auto !important;
        gap: 6px !important;
        width: 100% !important;
        height: auto !important;
        min-height: 0 !important;
        max-height: none !important;
        box-sizing: border-box !important;
        padding: 6px !important;
        border: 0.5px solid rgba(255,255,255,0.52) !important;
        border-radius: 15px !important;
        background: rgba(255,255,255,0.40) !important;
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.58) !important;
        cursor: pointer !important;
        text-align: left !important;
        transition: transform 170ms cubic-bezier(.2,.8,.2,1), background 170ms cubic-bezier(.2,.8,.2,1), box-shadow 170ms cubic-bezier(.2,.8,.2,1) !important;
      }

      .Yuze-img-studio-history-item:hover {
        transform: translateY(-1px) !important;
        background: rgba(255,255,255,0.58) !important;
      }

      .Yuze-img-studio-history-item.is-active {
        background:
          linear-gradient(145deg, rgba(255,255,255,0.78), rgba(255,255,255,0.42)),
          linear-gradient(135deg, rgba(255,45,85,0.16), rgba(0,122,255,0.13)) !important;
        box-shadow: 0 12px 26px rgba(20,24,32,0.12), inset 0 1px 0 rgba(255,255,255,0.78) !important;
      }

      .Yuze-img-studio-history-item.is-selected {
        border-color: rgba(0,122,255,0.38) !important;
        background:
          linear-gradient(145deg, rgba(255,255,255,0.82), rgba(255,255,255,0.46)),
          linear-gradient(135deg, rgba(0,122,255,0.18), rgba(52,199,89,0.12)) !important;
      }

      .Yuze-img-studio-history-item.is-analyzing img {
        filter: saturate(0.86) brightness(1.04) !important;
      }

      .Yuze-img-studio-history-thumb {
        display: block !important;
        width: 100% !important;
        aspect-ratio: 3 / 4 !important;
        min-height: 0 !important;
        overflow: hidden !important;
        border-radius: 13px !important;
        background: rgba(48,48,52,0.08) !important;
      }

      .Yuze-img-studio-history-thumb img {
        width: 100% !important;
        height: 100% !important;
        min-height: 0 !important;
        max-height: none !important;
        object-fit: cover !important;
        object-position: center center !important;
        border-radius: 0 !important;
        background: transparent !important;
        display: block !important;
      }

      .Yuze-img-studio-history-caption {
        display: block !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
        font: 660 11px/1.2 -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Segoe UI", sans-serif !important;
        color: rgba(40,48,62,0.76) !important;
      }

      .Yuze-img-studio-history-state {
        position: absolute !important;
        left: 10px !important;
        top: 10px !important;
        z-index: 2 !important;
        display: inline-flex !important;
        align-items: center !important;
        gap: 4px !important;
        max-width: calc(100% - 20px) !important;
        height: 22px !important;
        padding: 0 7px !important;
        box-sizing: border-box !important;
        border: 0.5px solid rgba(255,255,255,0.72) !important;
        border-radius: 999px !important;
        background: rgba(255,255,255,0.72) !important;
        color: rgba(18,24,34,0.76) !important;
        box-shadow: 0 8px 18px rgba(20,24,32,0.12), inset 0 1px 0 rgba(255,255,255,0.74) !important;
        backdrop-filter: blur(14px) saturate(1.35) !important;
        -webkit-backdrop-filter: blur(14px) saturate(1.35) !important;
        font: 740 10px/1 -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Segoe UI", sans-serif !important;
        white-space: nowrap !important;
      }

      .Yuze-img-studio-history-state svg {
        width: 11px !important;
        height: 11px !important;
        animation: YuzeImagePromptSpin 900ms linear infinite !important;
      }

      .Yuze-img-studio-history-retry {
        position: absolute !important;
        left: 10px !important;
        bottom: 32px !important;
        z-index: 4 !important;
        height: 24px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 4px !important;
        padding: 0 8px !important;
        box-sizing: border-box !important;
        border: 0.5px solid rgba(255,255,255,0.74) !important;
        border-radius: 999px !important;
        background: rgba(255,255,255,0.78) !important;
        color: rgba(18,24,34,0.78) !important;
        box-shadow: 0 8px 18px rgba(20,24,32,0.14), inset 0 1px 0 rgba(255,255,255,0.78) !important;
        backdrop-filter: blur(14px) saturate(1.35) !important;
        -webkit-backdrop-filter: blur(14px) saturate(1.35) !important;
        cursor: pointer !important;
        font: 740 10px/1 -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Segoe UI", sans-serif !important;
        white-space: nowrap !important;
      }

      .Yuze-img-studio-history-retry:hover {
        background: rgba(255,255,255,0.92) !important;
        color: rgba(0,122,255,0.88) !important;
      }

      .Yuze-img-studio-history-retry svg {
        width: 11px !important;
        height: 11px !important;
      }

      .Yuze-img-studio-history-check {
        position: absolute !important;
        left: 9px !important;
        top: 9px !important;
        z-index: 4 !important;
        width: 24px !important;
        height: 24px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        border: 0.5px solid rgba(255,255,255,0.76) !important;
        border-radius: 999px !important;
        background: rgba(255,255,255,0.72) !important;
        color: rgba(46,56,70,0.72) !important;
        box-shadow: 0 8px 18px rgba(20,24,32,0.12), inset 0 1px 0 rgba(255,255,255,0.78) !important;
      }

      .Yuze-img-studio-history-item.is-selected .Yuze-img-studio-history-check {
        background: rgba(0,122,255,0.92) !important;
        color: white !important;
      }

      .Yuze-img-studio-history-check svg {
        width: 13px !important;
        height: 13px !important;
      }

      .Yuze-img-studio-empty {
        padding: 16px 12px !important;
        border-radius: 16px !important;
        background: rgba(255,255,255,0.34) !important;
        color: rgba(74,84,102,0.70) !important;
        font-size: 12px !important;
        line-height: 1.45 !important;
      }

      .Yuze-img-studio-main {
        min-width: 0 !important;
        min-height: 0 !important;
        display: grid !important;
        grid-template-rows: auto 1fr !important;
      }

      .Yuze-img-studio-tabs {
        padding: 10px 12px 8px !important;
        display: inline-flex !important;
        gap: 6px !important;
        flex-wrap: wrap !important;
        border-bottom: 0.5px solid rgba(255,255,255,0.48) !important;
      }

      .Yuze-img-studio-tab {
        appearance: none !important;
        -webkit-appearance: none !important;
        height: 30px !important;
        padding: 0 11px !important;
        border: 0.5px solid transparent !important;
        border-radius: 999px !important;
        background: transparent !important;
        color: rgba(74,84,102,0.72) !important;
        cursor: pointer !important;
        font: 700 12px/1 -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Segoe UI", sans-serif !important;
        transition: background 170ms cubic-bezier(.2,.8,.2,1), color 170ms cubic-bezier(.2,.8,.2,1), transform 170ms cubic-bezier(.2,.8,.2,1) !important;
      }

      .Yuze-img-studio-tab:hover {
        transform: translateY(-1px) !important;
        background: rgba(255,255,255,0.38) !important;
      }

      .Yuze-img-studio-tab.is-active {
        color: rgba(18,24,34,0.92) !important;
        border-color: rgba(255,255,255,0.66) !important;
        background: rgba(255,255,255,0.62) !important;
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.74), 0 8px 20px rgba(20,24,32,0.08) !important;
      }

      .Yuze-img-studio-content {
        min-height: 0 !important;
        overflow: hidden !important;
        overscroll-behavior: contain !important;
        padding: 0 !important;
      }

      .Yuze-img-studio-pane {
        height: 100% !important;
        min-height: 0 !important;
        display: none !important;
        overflow: hidden !important;
        overscroll-behavior: contain !important;
        -webkit-overflow-scrolling: touch !important;
        opacity: 0 !important;
        transform: translateY(8px) !important;
        transition: opacity 210ms cubic-bezier(.2,.8,.2,1), transform 210ms cubic-bezier(.2,.8,.2,1) !important;
      }

      .Yuze-img-studio-pane.is-active {
        display: grid !important;
        opacity: 1 !important;
        transform: translateY(0) !important;
      }

      .Yuze-img-studio-pane-grid {
        min-height: 0 !important;
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) !important;
        gap: 10px !important;
        padding: 12px !important;
        overflow: hidden !important;
        overscroll-behavior: contain !important;
        transition: grid-template-columns 260ms cubic-bezier(.2,.8,.2,1) !important;
      }

      .Yuze-img-studio-section {
        min-width: 0 !important;
        min-height: 0 !important;
        display: grid !important;
        align-content: start !important;
        gap: 10px !important;
        overflow: auto !important;
        overscroll-behavior: contain !important;
        -webkit-overflow-scrolling: touch !important;
        padding-right: 2px !important;
      }

      .Yuze-img-studio-pane-grid[data-pane="prompt"] .Yuze-img-studio-section {
        align-content: start !important;
        max-width: 560px !important;
      }

      .Yuze-img-studio-pane-grid[data-pane="prompt"] .Yuze-img-studio-prompt-textarea {
        min-height: 126px !important;
      }

      .Yuze-img-studio-pane-grid[data-pane="prompt"] .Yuze-img-studio-small-textarea {
        min-height: 46px !important;
      }

      .Yuze-img-studio-preview-row {
        position: relative !important;
        display: grid !important;
        grid-template-columns: 72px minmax(0, 1fr) !important;
        gap: 10px !important;
        align-items: center !important;
        padding: 10px 42px 10px 10px !important;
        border: 0.5px solid rgba(255,255,255,0.56) !important;
        border-radius: 18px !important;
        background: rgba(255,255,255,0.38) !important;
      }

      .Yuze-img-studio-preview-row img {
        width: 72px !important;
        aspect-ratio: 1 / 1.12 !important;
        object-fit: cover !important;
        border-radius: 14px !important;
        background: rgba(48,48,52,0.08) !important;
      }

      .Yuze-img-studio-meta-title {
        margin: 0 0 5px !important;
        font-size: 13px !important;
        line-height: 1.28 !important;
        font-weight: 760 !important;
        color: rgba(18,24,34,0.88) !important;
      }

      .Yuze-img-studio-meta-text {
        margin: 0 !important;
        font-size: 12px !important;
        line-height: 1.45 !important;
        color: rgba(74,84,102,0.74) !important;
      }

      .Yuze-img-studio-history-upload-toggle {
        position: absolute !important;
        top: 8px !important;
        right: 8px !important;
        z-index: 3 !important;
        width: 26px !important;
        height: 26px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        border: 0.5px solid rgba(255,255,255,0.66) !important;
        border-radius: 999px !important;
        background: rgba(255,255,255,0.72) !important;
        color: rgba(0,122,255,0.88) !important;
        box-shadow: 0 8px 18px rgba(20,24,32,0.12), inset 0 1px 0 rgba(255,255,255,0.82) !important;
        cursor: pointer !important;
        transition: transform 160ms cubic-bezier(.2,.8,.2,1), background 160ms cubic-bezier(.2,.8,.2,1), color 160ms cubic-bezier(.2,.8,.2,1) !important;
      }

      .Yuze-img-studio-history-upload-toggle:hover {
        transform: translateY(-1px) !important;
        background: rgba(255,255,255,0.92) !important;
      }

      .Yuze-img-studio-history-upload-toggle.is-off {
        color: rgba(142,142,147,0.94) !important;
        background: rgba(255,255,255,0.46) !important;
      }

      .Yuze-img-studio-history-upload-toggle svg {
        width: 14px !important;
        height: 14px !important;
      }

      .Yuze-img-studio-field {
        display: grid !important;
        gap: 8px !important;
      }

      .Yuze-img-studio-field label {
        font-size: 12px !important;
        line-height: 1.2 !important;
        font-weight: 740 !important;
        color: rgba(74,84,102,0.82) !important;
      }

      .Yuze-img-studio-field-head {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 10px !important;
      }

      .Yuze-img-studio-field-tools {
        display: inline-flex !important;
        align-items: center !important;
        gap: 6px !important;
        min-width: 0 !important;
        flex: 0 0 auto !important;
      }

      .Yuze-img-studio-prompt-kind {
        display: inline-flex !important;
        align-items: center !important;
        gap: 4px !important;
        padding: 3px !important;
        border: 0.5px solid rgba(255,255,255,0.58) !important;
        border-radius: 999px !important;
        background: rgba(255,255,255,0.34) !important;
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.62) !important;
      }

      .Yuze-img-studio-kind-button {
        appearance: none !important;
        -webkit-appearance: none !important;
        height: 24px !important;
        padding: 0 9px !important;
        border: 0 !important;
        border-radius: 999px !important;
        background: transparent !important;
        color: rgba(74,84,102,0.72) !important;
        cursor: pointer !important;
        font: 720 11px/1 -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Segoe UI", sans-serif !important;
        white-space: nowrap !important;
      }

      .Yuze-img-studio-kind-button.is-active {
        background: rgba(255,255,255,0.78) !important;
        color: rgba(18,24,34,0.90) !important;
        box-shadow: 0 6px 14px rgba(20,24,32,0.08), inset 0 1px 0 rgba(255,255,255,0.82) !important;
      }

      .Yuze-img-studio-selection-note {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 10px !important;
        padding: 9px 10px !important;
        border-radius: 16px !important;
        background: rgba(255,255,255,0.38) !important;
        color: rgba(74,84,102,0.74) !important;
        font: 650 12px/1.35 -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Segoe UI", sans-serif !important;
      }

      .Yuze-img-studio-selected-grid {
        display: grid !important;
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        gap: 10px !important;
      }

      .Yuze-img-studio-fusion-selection {
        display: grid !important;
        gap: 9px !important;
        padding: 10px !important;
        border: 0.5px solid rgba(255,255,255,0.64) !important;
        border-radius: 22px !important;
        background:
          linear-gradient(145deg, rgba(255,255,255,0.56), rgba(255,255,255,0.28)),
          linear-gradient(135deg, rgba(255,132,188,0.16), rgba(77,213,255,0.14) 52%, rgba(255,221,102,0.12)) !important;
        box-shadow:
          0 18px 38px rgba(255,132,188,0.12),
          inset 0 1px 0 rgba(255,255,255,0.72) !important;
      }

      .Yuze-img-studio-fusion-selection-head {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 10px !important;
      }

      .Yuze-img-studio-fusion-selection-title {
        min-width: 0 !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
        color: rgba(40,48,62,0.76) !important;
        font: 760 12px/1.2 -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Segoe UI", sans-serif !important;
      }

      .Yuze-img-studio-mini-toggle {
        appearance: none !important;
        -webkit-appearance: none !important;
        height: 28px !important;
        width: 28px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        flex: 0 0 auto !important;
        border: 0.5px solid rgba(255,255,255,0.66) !important;
        border-radius: 999px !important;
        background: rgba(255,255,255,0.58) !important;
        color: rgba(74,84,102,0.72) !important;
        box-shadow: 0 8px 18px rgba(20,24,32,0.08), inset 0 1px 0 rgba(255,255,255,0.78) !important;
        cursor: pointer !important;
        transition: transform 160ms cubic-bezier(.2,.8,.2,1), background 160ms cubic-bezier(.2,.8,.2,1), color 160ms cubic-bezier(.2,.8,.2,1) !important;
      }

      .Yuze-img-studio-mini-toggle:hover,
      .Yuze-img-studio-mini-toggle.is-active {
        transform: translateY(-1px) !important;
        color: rgba(0,122,255,0.86) !important;
        background: rgba(255,255,255,0.82) !important;
      }

      .Yuze-img-studio-mini-toggle svg {
        width: 14px !important;
        height: 14px !important;
      }

      .Yuze-img-studio-selected-card {
        appearance: none !important;
        -webkit-appearance: none !important;
        width: 100% !important;
        min-width: 0 !important;
        text-align: left !important;
        cursor: zoom-in !important;
        border-color: rgba(255,255,255,0.68) !important;
        background:
          linear-gradient(145deg, rgba(255,255,255,0.62), rgba(255,255,255,0.34)),
          linear-gradient(135deg, rgba(255,132,188,0.10), rgba(77,213,255,0.08)) !important;
        box-shadow:
          0 12px 26px rgba(20,24,32,0.09),
          inset 0 1px 0 rgba(255,255,255,0.76) !important;
      }

      .Yuze-img-studio-selected-card .Yuze-img-studio-meta-title {
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
      }

      .Yuze-img-studio-selected-card .Yuze-img-studio-meta-text {
        overflow: hidden !important;
        display: -webkit-box !important;
        -webkit-line-clamp: 2 !important;
        -webkit-box-orient: vertical !important;
      }

      .Yuze-img-studio-selected-grid.is-hero {
        grid-template-columns: minmax(0, 1fr) !important;
        gap: 12px !important;
      }

      .Yuze-img-studio-selected-grid.is-hero .Yuze-img-studio-selected-card {
        min-height: 138px !important;
        grid-template-columns: minmax(0, 1fr) !important;
        padding: 0 !important;
        overflow: hidden !important;
        border-radius: 24px !important;
        background: rgba(255,255,255,0.22) !important;
        box-shadow: 0 18px 38px rgba(255,132,188,0.16), inset 0 1px 0 rgba(255,255,255,0.68) !important;
      }

      .Yuze-img-studio-selected-grid.is-hero .Yuze-img-studio-selected-card > img {
        width: 100% !important;
        height: 138px !important;
        min-height: 138px !important;
        aspect-ratio: auto !important;
        object-fit: cover !important;
        object-position: center center !important;
        border-radius: 24px !important;
      }

      .Yuze-img-studio-selected-grid.is-hero .Yuze-img-studio-selected-card > div {
        position: absolute !important;
        left: 12px !important;
        right: 44px !important;
        bottom: 10px !important;
        z-index: 2 !important;
        min-width: 0 !important;
        padding: 8px 10px !important;
        border-radius: 14px !important;
        border: 0.5px solid rgba(255,255,255,0.68) !important;
        background:
          linear-gradient(90deg, rgba(255,255,255,0.78), rgba(255,255,255,0.38)),
          linear-gradient(135deg, rgba(255,185,216,0.22), rgba(137,225,255,0.16)) !important;
        box-shadow:
          0 10px 24px rgba(255,132,188,0.12),
          inset 0 1px 0 rgba(255,255,255,0.78) !important;
        backdrop-filter: blur(14px) saturate(1.32) !important;
        -webkit-backdrop-filter: blur(14px) saturate(1.32) !important;
      }

      .Yuze-img-studio-selected-grid.is-hero .Yuze-img-studio-meta-title {
        margin: 0 !important;
        color: rgba(32,38,50,0.84) !important;
        text-shadow: 0 1px 0 rgba(255,255,255,0.72) !important;
      }

      .Yuze-img-studio-selected-grid.is-hero .Yuze-img-studio-meta-text {
        display: none !important;
      }

      .Yuze-img-studio-fusion-prompt.is-collapsed {
        gap: 0 !important;
      }

      .Yuze-img-studio-fusion-prompt.is-collapsed textarea {
        display: none !important;
      }

      .Yuze-img-studio-selection-strip {
        display: flex !important;
        flex-wrap: wrap !important;
        gap: 7px !important;
      }

      .Yuze-img-studio-selected-thumb {
        width: 42px !important;
        height: 42px !important;
        border-radius: 12px !important;
        object-fit: cover !important;
        border: 1px solid rgba(255,255,255,0.72) !important;
        box-shadow: 0 8px 18px rgba(20,24,32,0.10) !important;
      }

      .Yuze-img-studio-streaming-status {
        display: inline-flex !important;
        align-items: center !important;
        gap: 6px !important;
        min-width: 0 !important;
        height: 24px !important;
        padding: 0 9px !important;
        border: 0.5px solid rgba(255,255,255,0.64) !important;
        border-radius: 999px !important;
        background: rgba(255,255,255,0.48) !important;
        color: rgba(46,56,70,0.72) !important;
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.72) !important;
        font: 700 11px/1 -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Segoe UI", sans-serif !important;
        white-space: nowrap !important;
      }

      .Yuze-img-studio-streaming-status svg {
        width: 12px !important;
        height: 12px !important;
        animation: YuzeImagePromptSpin 860ms linear infinite !important;
      }

      .Yuze-img-studio-streaming-dots {
        display: inline-flex !important;
        gap: 3px !important;
      }

      .Yuze-img-studio-streaming-dots i {
        width: 3px !important;
        height: 3px !important;
        border-radius: 999px !important;
        background: currentColor !important;
        opacity: 0.34 !important;
        animation: YuzeImagePromptDot 1100ms ease-in-out infinite !important;
      }

      .Yuze-img-studio-streaming-dots i:nth-child(2) {
        animation-delay: 150ms !important;
      }

      .Yuze-img-studio-streaming-dots i:nth-child(3) {
        animation-delay: 300ms !important;
      }

      .Yuze-img-studio-prompt-textarea,
      .Yuze-img-studio-small-textarea {
        width: 100% !important;
        box-sizing: border-box !important;
        resize: vertical !important;
        border: 0.5px solid rgba(255,255,255,0.64) !important;
        border-radius: 18px !important;
        background: rgba(255,255,255,0.58) !important;
        color: rgba(18,24,34,0.92) !important;
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.76) !important;
        outline: none !important;
        font: 500 13px/1.52 -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Segoe UI", sans-serif !important;
        letter-spacing: 0 !important;
        transition: background 160ms cubic-bezier(.2,.8,.2,1), border-color 160ms cubic-bezier(.2,.8,.2,1) !important;
      }

      .Yuze-img-studio-prompt-textarea {
        min-height: 152px !important;
        padding: 11px 12px !important;
      }

      .Yuze-img-studio-prompt-textarea.is-streaming {
        border-color: rgba(0,122,255,0.36) !important;
        background:
          linear-gradient(90deg, rgba(255,255,255,0.58), rgba(255,255,255,0.76), rgba(255,255,255,0.58)) !important;
        background-size: 220% 100% !important;
        animation: YuzeImagePromptTextShimmer 1600ms ease-in-out infinite !important;
      }

      .Yuze-img-studio-small-textarea {
        min-height: 56px !important;
        padding: 11px 12px !important;
      }

      .Yuze-img-studio-prompt-textarea:focus,
      .Yuze-img-studio-small-textarea:focus {
        background: rgba(255,255,255,0.76) !important;
        border-color: rgba(0,122,255,0.42) !important;
      }

      .Yuze-img-studio-actions {
        display: flex !important;
        align-items: center !important;
        justify-content: flex-end !important;
        gap: 9px !important;
        flex-wrap: wrap !important;
      }

      .Yuze-img-studio-primary,
      .Yuze-img-studio-secondary {
        appearance: none !important;
        -webkit-appearance: none !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 6px !important;
        height: 34px !important;
        padding: 0 13px !important;
        border-radius: 999px !important;
        cursor: pointer !important;
        white-space: nowrap !important;
        font: 700 12px/1 -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Segoe UI", sans-serif !important;
        letter-spacing: 0 !important;
        transition: transform 160ms cubic-bezier(.2,.8,.2,1), opacity 160ms cubic-bezier(.2,.8,.2,1), background 160ms cubic-bezier(.2,.8,.2,1) !important;
      }

      .Yuze-img-studio-primary {
        border: 0.5px solid rgba(255,255,255,0.74) !important;
        background:
          linear-gradient(145deg, rgba(255,255,255,0.86), rgba(255,255,255,0.42)),
          linear-gradient(135deg, rgba(255,45,85,0.32), rgba(0,122,255,0.26)) !important;
        color: rgba(18,24,34,0.92) !important;
        box-shadow: 0 12px 26px rgba(20,24,32,0.13), inset 0 1px 0 rgba(255,255,255,0.78) !important;
      }

      .Yuze-img-studio-secondary {
        border: 0.5px solid rgba(255,255,255,0.62) !important;
        background: rgba(255,255,255,0.46) !important;
        color: rgba(46,56,70,0.76) !important;
      }

      .Yuze-img-studio-primary:hover,
      .Yuze-img-studio-secondary:hover {
        transform: translateY(-1px) !important;
      }

      .Yuze-img-studio-primary[disabled],
      .Yuze-img-studio-secondary[disabled] {
        cursor: default !important;
        opacity: 0.64 !important;
        transform: none !important;
      }

      .Yuze-img-studio-primary.is-loading svg,
      .Yuze-img-studio-secondary.is-loading svg {
        animation: YuzeImagePromptSpin 900ms linear infinite !important;
      }

      .Yuze-img-studio-result-column {
        min-width: 0 !important;
        min-height: 0 !important;
        display: grid !important;
        grid-template-rows: auto 1fr !important;
        gap: 10px !important;
        overflow: hidden !important;
        overscroll-behavior: contain !important;
      }

      .Yuze-img-studio-result-column.is-collapsed {
        grid-template-rows: 1fr !important;
        gap: 0 !important;
      }

      .Yuze-img-studio-result-column.has-generating {
        grid-template-rows: auto auto minmax(0, 1fr) !important;
      }

      .Yuze-img-studio-result-column.is-collapsed.has-generating {
        grid-template-rows: 1fr !important;
      }

      .Yuze-img-studio-result-head {
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        gap: 8px !important;
        font-size: 12px !important;
        font-weight: 760 !important;
        color: rgba(74,84,102,0.78) !important;
      }

      .Yuze-img-studio-result-title {
        min-width: 0 !important;
        flex: 1 1 auto !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
      }

      .Yuze-img-studio-result-tools {
        display: inline-flex !important;
        align-items: center !important;
        gap: 5px !important;
        flex: 0 0 auto !important;
      }

      .Yuze-img-studio-result-collapse,
      .Yuze-img-studio-history-collapse,
      .Yuze-img-studio-result-view-toggle {
        width: 28px !important;
        height: 28px !important;
      }

      .Yuze-img-studio-result-column.is-collapsed .Yuze-img-studio-result-head {
        height: 100% !important;
        min-height: 0 !important;
        display: grid !important;
        grid-template-rows: auto 1fr auto !important;
        justify-items: center !important;
        align-items: start !important;
        padding: 0 !important;
      }

      .Yuze-img-studio-result-column.is-collapsed .Yuze-img-studio-result-title {
        writing-mode: vertical-rl !important;
        text-orientation: mixed !important;
        margin-top: 8px !important;
      }

      .Yuze-img-studio-result-column.is-collapsed .Yuze-img-studio-result-count {
        align-self: end !important;
        margin-bottom: 4px !important;
      }

      .Yuze-img-studio-result-column.is-collapsed .Yuze-img-studio-result-view-toggle {
        display: none !important;
      }

      .Yuze-img-studio-result-column.is-collapsed .Yuze-img-studio-output-list,
      .Yuze-img-studio-result-column.is-collapsed .Yuze-img-studio-output-focus,
      .Yuze-img-studio-result-column.is-collapsed .Yuze-img-studio-generating-card {
        display: none !important;
      }

      .Yuze-img-studio-output-list {
        min-height: 0 !important;
        overflow: auto !important;
        overscroll-behavior: contain !important;
        -webkit-overflow-scrolling: touch !important;
        display: grid !important;
        align-content: start !important;
        gap: 10px !important;
      }

      .Yuze-img-studio-result-column.is-focus-mode .Yuze-img-studio-output-list {
        overflow: hidden !important;
        align-content: stretch !important;
        grid-template-rows: minmax(0, 1fr) !important;
      }

      .Yuze-img-studio-output {
        appearance: none !important;
        -webkit-appearance: none !important;
        position: relative !important;
        width: 100% !important;
        border: 0.5px solid rgba(255,255,255,0.58) !important;
        border-radius: 18px !important;
        padding: 8px !important;
        background: rgba(255,255,255,0.40) !important;
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.66) !important;
        cursor: zoom-in !important;
        text-align: left !important;
        transition:
          transform 160ms cubic-bezier(.2,.8,.2,1),
          background 160ms cubic-bezier(.2,.8,.2,1),
          box-shadow 160ms cubic-bezier(.2,.8,.2,1) !important;
      }

      .Yuze-img-studio-output:hover {
        transform: translateY(-1px) !important;
        background: rgba(255,255,255,0.58) !important;
        box-shadow:
          0 12px 26px rgba(20,24,32,0.12),
          inset 0 1px 0 rgba(255,255,255,0.74) !important;
      }

      .Yuze-img-studio-output img {
        display: block !important;
        width: 100% !important;
        aspect-ratio: 3 / 4 !important;
        object-fit: cover !important;
        border-radius: 13px !important;
        background: rgba(48,48,52,0.08) !important;
      }

      .Yuze-img-studio-output.is-refined-display {
        border-color: rgba(0,122,255,0.24) !important;
        background: rgba(255,255,255,0.52) !important;
      }

      .Yuze-img-studio-output-badge {
        position: absolute !important;
        left: 14px !important;
        top: 14px !important;
        z-index: 2 !important;
        height: 22px !important;
        display: inline-flex !important;
        align-items: center !important;
        padding: 0 8px !important;
        border: 0.5px solid rgba(255,255,255,0.72) !important;
        border-radius: 999px !important;
        background: rgba(255,255,255,0.72) !important;
        color: rgba(18,24,34,0.70) !important;
        box-shadow: 0 8px 18px rgba(20,24,32,0.12), inset 0 1px 0 rgba(255,255,255,0.76) !important;
        font: 720 10px/1 -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Segoe UI", sans-serif !important;
        font-style: normal !important;
        pointer-events: none !important;
      }

      .Yuze-img-studio-output span {
        display: block !important;
        margin-top: 7px !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
        font-size: 11px !important;
        color: rgba(74,84,102,0.72) !important;
      }

      .Yuze-img-studio-output .Yuze-img-studio-delete {
        top: 12px !important;
        right: 12px !important;
        width: 28px !important;
        height: 28px !important;
        margin-top: 0 !important;
        box-sizing: border-box !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        overflow: visible !important;
        white-space: normal !important;
        line-height: 1 !important;
        background: rgba(255,255,255,0.78) !important;
      }

      .Yuze-img-studio-output .Yuze-img-studio-delete svg {
        width: 14px !important;
        height: 14px !important;
        display: block !important;
      }

      .Yuze-img-studio-output-focus {
        min-height: 0 !important;
        height: 100% !important;
        display: grid !important;
        grid-template-rows: minmax(0, 1fr) auto !important;
        gap: 10px !important;
        overflow: hidden !important;
        overscroll-behavior: contain !important;
      }

      .Yuze-img-studio-focus-card {
        appearance: none !important;
        -webkit-appearance: none !important;
        position: relative !important;
        min-width: 0 !important;
        min-height: 0 !important;
        width: 100% !important;
        height: 100% !important;
        display: grid !important;
        padding: 8px !important;
        border: 0.5px solid rgba(255,255,255,0.62) !important;
        border-radius: 20px !important;
        background: rgba(255,255,255,0.42) !important;
        box-shadow:
          0 16px 34px rgba(20,24,32,0.12),
          inset 0 1px 0 rgba(255,255,255,0.70) !important;
        cursor: zoom-in !important;
        overflow: hidden !important;
      }

      .Yuze-img-studio-focus-card img {
        width: 100% !important;
        height: 100% !important;
        min-height: 0 !important;
        display: block !important;
        object-fit: cover !important;
        border-radius: 15px !important;
        background: rgba(48,48,52,0.08) !important;
      }

      .Yuze-img-studio-focus-card .Yuze-img-studio-delete {
        top: 14px !important;
        right: 14px !important;
      }

      .Yuze-img-studio-focus-meta {
        min-height: 0 !important;
        display: grid !important;
        gap: 7px !important;
      }

      .Yuze-img-studio-focus-title-row {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 8px !important;
        color: rgba(74,84,102,0.74) !important;
        font: 680 11px/1.25 -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Segoe UI", sans-serif !important;
      }

      .Yuze-img-studio-focus-title-row span:first-child {
        min-width: 0 !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
      }

      .Yuze-img-studio-focus-dots {
        display: flex !important;
        justify-content: center !important;
        gap: 5px !important;
        min-width: 0 !important;
        overflow: hidden !important;
      }

      .Yuze-img-studio-focus-dot {
        width: 6px !important;
        height: 6px !important;
        flex: 0 0 auto !important;
        border-radius: 999px !important;
        border: 0 !important;
        padding: 0 !important;
        background: rgba(74,84,102,0.24) !important;
        cursor: pointer !important;
        transition: width 160ms cubic-bezier(.2,.8,.2,1), background 160ms cubic-bezier(.2,.8,.2,1) !important;
      }

      .Yuze-img-studio-focus-dot.is-active {
        width: 16px !important;
        background: rgba(0,122,255,0.52) !important;
      }

      .Yuze-img-studio-generating-card {
        position: relative !important;
        overflow: hidden !important;
        display: grid !important;
        gap: 9px !important;
        padding: 9px !important;
        border: 0.5px solid rgba(255,255,255,0.70) !important;
        border-radius: 20px !important;
        background:
          linear-gradient(180deg, rgba(255,255,255,0.70), rgba(255,255,255,0.40)),
          linear-gradient(135deg, rgba(255,45,85,0.16), rgba(0,122,255,0.14) 58%, rgba(52,199,89,0.08)) !important;
        box-shadow:
          0 16px 34px rgba(20,24,32,0.13),
          inset 0 1px 0 rgba(255,255,255,0.82),
          inset 0 -1px 0 rgba(255,255,255,0.20) !important;
        backdrop-filter: blur(22px) saturate(1.45) !important;
        -webkit-backdrop-filter: blur(22px) saturate(1.45) !important;
      }

      .Yuze-img-studio-generating-card::before {
        content: "" !important;
        position: absolute !important;
        inset: -42% !important;
        background:
          conic-gradient(from 120deg, transparent, rgba(255,255,255,0.60), transparent 34%),
          radial-gradient(circle at 48% 52%, rgba(0,122,255,0.18), transparent 34%) !important;
        opacity: 0.58 !important;
        animation: YuzeImageGeneratingAura 3600ms linear infinite !important;
        pointer-events: none !important;
      }

      .Yuze-img-studio-generating-frame {
        position: relative !important;
        aspect-ratio: 1 / 1 !important;
        overflow: hidden !important;
        border-radius: 15px !important;
        background:
          radial-gradient(circle at 34% 30%, rgba(255,255,255,0.92), rgba(255,255,255,0.18) 24%, transparent 42%),
          radial-gradient(circle at 70% 68%, rgba(0,122,255,0.24), transparent 38%),
          linear-gradient(145deg, rgba(255,45,85,0.16), rgba(0,122,255,0.15) 54%, rgba(52,199,89,0.10)) !important;
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.70), inset 0 -18px 42px rgba(18,24,34,0.08) !important;
      }

      .Yuze-img-studio-generating-frame::before {
        content: "" !important;
        position: absolute !important;
        inset: 0 !important;
        background:
          linear-gradient(105deg, transparent 0%, rgba(255,255,255,0.14) 34%, rgba(255,255,255,0.74) 48%, rgba(255,255,255,0.14) 62%, transparent 100%),
          repeating-linear-gradient(180deg, rgba(255,255,255,0.16) 0 1px, transparent 1px 8px) !important;
        transform: translateX(-78%) !important;
        animation: YuzeImageGeneratingSweep 2100ms cubic-bezier(.2,.8,.2,1) infinite !important;
      }

      .Yuze-img-studio-generating-frame::after {
        content: "" !important;
        position: absolute !important;
        inset: 12% !important;
        border: 0.5px solid rgba(255,255,255,0.54) !important;
        border-radius: 999px !important;
        background:
          radial-gradient(circle, rgba(255,255,255,0.88) 0 2px, transparent 3px),
          radial-gradient(circle at 72% 24%, rgba(255,255,255,0.70) 0 1px, transparent 2px),
          radial-gradient(circle at 26% 76%, rgba(255,255,255,0.64) 0 1px, transparent 2px) !important;
        box-shadow: 0 0 34px rgba(255,255,255,0.38), inset 0 0 30px rgba(255,255,255,0.18) !important;
        animation: YuzeImageGeneratingPulse 1800ms ease-in-out infinite !important;
      }

      .Yuze-img-studio-generating-caption {
        position: relative !important;
        z-index: 1 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 8px !important;
        color: rgba(74,84,102,0.76) !important;
        font: 700 11px/1.2 -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Segoe UI", sans-serif !important;
      }

      .Yuze-img-studio-generating-progress {
        position: relative !important;
        z-index: 1 !important;
        height: 4px !important;
        overflow: hidden !important;
        border-radius: 999px !important;
        background: rgba(255,255,255,0.42) !important;
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.62) !important;
      }

      .Yuze-img-studio-generating-progress span {
        display: block !important;
        width: 46% !important;
        height: 100% !important;
        border-radius: inherit !important;
        background: linear-gradient(90deg, rgba(255,45,85,0.28), rgba(0,122,255,0.42), rgba(255,255,255,0.74)) !important;
        box-shadow: 0 0 14px rgba(0,122,255,0.20) !important;
        animation: YuzeImageGeneratingProgress 1700ms cubic-bezier(.2,.8,.2,1) infinite !important;
      }

      .Yuze-img-studio-delete {
        position: absolute !important;
        top: 7px !important;
        right: 7px !important;
        z-index: 3 !important;
        width: 22px !important;
        height: 22px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        border: 0.5px solid rgba(255,255,255,0.78) !important;
        border-radius: 999px !important;
        background: rgba(255,255,255,0.72) !important;
        color: rgba(18,24,34,0.68) !important;
        box-shadow:
          0 8px 18px rgba(20,24,32,0.15),
          inset 0 1px 0 rgba(255,255,255,0.82) !important;
        backdrop-filter: blur(14px) saturate(1.35) !important;
        -webkit-backdrop-filter: blur(14px) saturate(1.35) !important;
        cursor: pointer !important;
        opacity: 0.88 !important;
        transition:
          opacity 140ms cubic-bezier(.2,.8,.2,1),
          transform 140ms cubic-bezier(.2,.8,.2,1),
          background 140ms cubic-bezier(.2,.8,.2,1) !important;
      }

      .Yuze-img-studio-delete svg {
        width: 12px !important;
        height: 12px !important;
      }

      .Yuze-img-studio-delete:hover {
        opacity: 1 !important;
        transform: scale(1.06) !important;
        background: rgba(255,255,255,0.90) !important;
        color: rgba(255,45,85,0.92) !important;
      }

      .Yuze-img-preview-overlay {
        position: fixed !important;
        inset: 0 !important;
        z-index: 1000000 !important;
        display: grid !important;
        place-items: center !important;
        padding: 28px !important;
        box-sizing: border-box !important;
        background: rgba(18,24,34,0.28) !important;
        backdrop-filter: blur(26px) saturate(1.25) !important;
        -webkit-backdrop-filter: blur(26px) saturate(1.25) !important;
        opacity: 0 !important;
        transition: opacity 180ms cubic-bezier(.2,.8,.2,1) !important;
      }

      .Yuze-img-preview-overlay.is-visible {
        opacity: 1 !important;
      }

      .Yuze-img-preview-card {
        position: relative !important;
        width: min(94vw, 1120px) !important;
        max-height: min(90vh, 860px) !important;
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) 300px !important;
        gap: 16px !important;
        align-items: stretch !important;
      }

      .Yuze-img-preview-card.is-readonly {
        width: min(90vw, 860px) !important;
        grid-template-columns: minmax(0, 1fr) !important;
      }

      .Yuze-img-preview-card img {
        display: block !important;
        max-width: 100% !important;
        max-height: calc(90vh - 54px) !important;
        object-fit: contain !important;
        border-radius: 20px !important;
        background: rgba(255,255,255,0.18) !important;
        box-shadow: 0 28px 80px rgba(0,0,0,0.28) !important;
      }

      .Yuze-img-preview-main {
        min-width: 0 !important;
        display: grid !important;
        align-content: center !important;
        gap: 10px !important;
      }

      .Yuze-img-preview-card.is-readonly .Yuze-img-preview-main {
        justify-items: center !important;
      }

      .Yuze-img-preview-side {
        min-width: 0 !important;
        max-height: min(90vh, 820px) !important;
        display: grid !important;
        grid-template-rows: auto minmax(0, 1fr) auto !important;
        gap: 12px !important;
        padding: 14px !important;
        border: 0.5px solid rgba(255,255,255,0.72) !important;
        border-radius: 24px !important;
        background:
          linear-gradient(180deg, rgba(255,255,255,0.74), rgba(255,255,255,0.52)),
          rgba(246,248,250,0.56) !important;
        box-shadow:
          0 28px 70px rgba(20,24,32,0.18),
          inset 0 1px 0 rgba(255,255,255,0.84) !important;
        backdrop-filter: blur(28px) saturate(1.45) !important;
        -webkit-backdrop-filter: blur(28px) saturate(1.45) !important;
      }

      .Yuze-img-preview-side-title {
        margin: 0 !important;
        font: 780 14px/1.25 -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Segoe UI", sans-serif !important;
        color: rgba(18,24,34,0.88) !important;
      }

      .Yuze-img-preview-side-subtitle {
        margin: 4px 0 0 !important;
        color: rgba(74,84,102,0.66) !important;
        font: 600 11px/1.35 -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Segoe UI", sans-serif !important;
      }

      .Yuze-img-preview-composer {
        display: grid !important;
        gap: 8px !important;
        padding: 10px !important;
        border: 0.5px solid rgba(255,255,255,0.70) !important;
        border-radius: 20px !important;
        background: rgba(255,255,255,0.54) !important;
        box-shadow:
          0 14px 32px rgba(20,24,32,0.10),
          inset 0 1px 0 rgba(255,255,255,0.78) !important;
      }

      .Yuze-img-preview-refine-textarea {
        width: 100% !important;
        min-height: 76px !important;
        box-sizing: border-box !important;
        resize: none !important;
        padding: 11px 12px !important;
        border: 0.5px solid rgba(74,84,102,0.10) !important;
        border-radius: 16px !important;
        background: rgba(255,255,255,0.72) !important;
        color: rgba(18,24,34,0.90) !important;
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.86) !important;
        font: 560 12px/1.45 -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Segoe UI", sans-serif !important;
        outline: none !important;
      }

      .Yuze-img-preview-refine-textarea:focus {
        border-color: rgba(0,122,255,0.28) !important;
        background: rgba(255,255,255,0.86) !important;
      }

      .Yuze-img-preview-composer-actions {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 10px !important;
      }

      .Yuze-img-preview-composer-hint {
        min-width: 0 !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
        color: rgba(74,84,102,0.58) !important;
        font: 650 11px/1 -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Segoe UI", sans-serif !important;
      }

      .Yuze-img-preview-history {
        min-height: 0 !important;
        overflow: auto !important;
        display: grid !important;
        align-content: start !important;
        gap: 10px !important;
        padding-right: 2px !important;
      }

      .Yuze-img-preview-history-head {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        color: rgba(74,84,102,0.68) !important;
        font: 740 11px/1 -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Segoe UI", sans-serif !important;
      }

      .Yuze-img-preview-history-count {
        height: 20px !important;
        min-width: 20px !important;
        padding: 0 7px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        border-radius: 999px !important;
        background: rgba(255,255,255,0.60) !important;
        color: rgba(74,84,102,0.70) !important;
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.74) !important;
      }

      .Yuze-img-preview-branch-card {
        display: grid !important;
        gap: 8px !important;
      }

      .Yuze-img-preview-branch {
        appearance: none !important;
        -webkit-appearance: none !important;
        position: relative !important;
        display: grid !important;
        gap: 7px !important;
        width: 100% !important;
        padding: 8px !important;
        border: 0.5px solid rgba(255,255,255,0.68) !important;
        border-radius: 20px !important;
        background: rgba(255,255,255,0.54) !important;
        box-shadow: 0 12px 30px rgba(20,24,32,0.10), inset 0 1px 0 rgba(255,255,255,0.76) !important;
        cursor: pointer !important;
        text-align: left !important;
        transition: transform 160ms cubic-bezier(.2,.8,.2,1), background 160ms cubic-bezier(.2,.8,.2,1) !important;
      }

      .Yuze-img-preview-branch:hover {
        transform: translateY(-1px) !important;
        background: rgba(255,255,255,0.68) !important;
      }

      .Yuze-img-preview-branch.is-active {
        border-color: rgba(0,122,255,0.32) !important;
        background:
          linear-gradient(145deg, rgba(255,255,255,0.74), rgba(255,255,255,0.50)),
          linear-gradient(135deg, rgba(0,122,255,0.14), rgba(52,199,89,0.08)) !important;
      }

      .Yuze-img-preview-branch img {
        width: 100% !important;
        aspect-ratio: 1 / 0.82 !important;
        height: auto !important;
        max-height: none !important;
        object-fit: cover !important;
        border-radius: 15px !important;
        background: rgba(48,48,52,0.08) !important;
        box-shadow: none !important;
      }

      .Yuze-img-preview-branch span {
        display: block !important;
        overflow: hidden !important;
        display: -webkit-box !important;
        -webkit-line-clamp: 2 !important;
        -webkit-box-orient: vertical !important;
        color: rgba(74,84,102,0.76) !important;
        font: 650 11px/1.35 -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Segoe UI", sans-serif !important;
      }

      .Yuze-img-preview-branch-action {
        appearance: none !important;
        -webkit-appearance: none !important;
        width: 100% !important;
        height: 30px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 6px !important;
        border: 0.5px solid rgba(255,255,255,0.64) !important;
        border-radius: 999px !important;
        background: rgba(255,255,255,0.42) !important;
        color: rgba(74,84,102,0.74) !important;
        cursor: pointer !important;
        font: 720 11px/1 -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Segoe UI", sans-serif !important;
        transition: transform 160ms cubic-bezier(.2,.8,.2,1), background 160ms cubic-bezier(.2,.8,.2,1), color 160ms cubic-bezier(.2,.8,.2,1) !important;
      }

      .Yuze-img-preview-branch-action:hover {
        transform: translateY(-1px) !important;
        background: rgba(255,255,255,0.64) !important;
      }

      .Yuze-img-preview-branch-action.is-active {
        border-color: rgba(0,122,255,0.30) !important;
        background:
          linear-gradient(145deg, rgba(255,255,255,0.82), rgba(255,255,255,0.48)),
          linear-gradient(135deg, rgba(0,122,255,0.24), rgba(52,199,89,0.12)) !important;
        color: rgba(18,24,34,0.86) !important;
      }

      .Yuze-img-preview-branch-action svg {
        width: 13px !important;
        height: 13px !important;
      }

      .Yuze-img-preview-empty {
        min-height: 190px !important;
        display: grid !important;
        place-items: center !important;
        padding: 18px !important;
        border: 0.5px dashed rgba(74,84,102,0.18) !important;
        border-radius: 20px !important;
        background: rgba(255,255,255,0.34) !important;
        color: rgba(74,84,102,0.58) !important;
        text-align: center !important;
        font: 650 12px/1.45 -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Segoe UI", sans-serif !important;
      }

      .Yuze-img-preview-caption {
        justify-self: center !important;
        max-width: min(86vw, 720px) !important;
        padding: 8px 12px !important;
        border-radius: 999px !important;
        background: rgba(255,255,255,0.62) !important;
        color: rgba(18,24,34,0.82) !important;
        font: 650 12px/1.25 -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Segoe UI", sans-serif !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
        backdrop-filter: blur(16px) saturate(1.45) !important;
        -webkit-backdrop-filter: blur(16px) saturate(1.45) !important;
      }

      .Yuze-img-preview-close {
        position: absolute !important;
        top: -18px !important;
        right: -18px !important;
        width: 36px !important;
        height: 36px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        border: 0.5px solid rgba(255,255,255,0.76) !important;
        border-radius: 999px !important;
        background: rgba(255,255,255,0.70) !important;
        color: rgba(18,24,34,0.76) !important;
        box-shadow: 0 12px 30px rgba(20,24,32,0.18), inset 0 1px 0 rgba(255,255,255,0.76) !important;
        cursor: pointer !important;
      }

      .Yuze-img-studio-upload {
        position: relative !important;
        display: grid !important;
        place-items: center !important;
        min-height: 104px !important;
        border: 1px dashed rgba(74,84,102,0.26) !important;
        border-radius: 18px !important;
        background: rgba(255,255,255,0.38) !important;
        overflow: hidden !important;
        cursor: pointer !important;
      }

      .Yuze-img-studio-upload img {
        width: 100% !important;
        height: 100% !important;
        min-height: 104px !important;
        object-fit: cover !important;
        display: block !important;
      }

      .Yuze-img-studio-upload span {
        padding: 0 14px !important;
        text-align: center !important;
        font-size: 12px !important;
        line-height: 1.45 !important;
        color: rgba(74,84,102,0.72) !important;
      }

      .Yuze-img-studio-prompt-upload {
        min-height: 0 !important;
        width: max-content !important;
        max-width: 100% !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 7px !important;
        justify-self: start !important;
        padding: 8px 12px !important;
        border-style: solid !important;
        border-radius: 999px !important;
        background: rgba(255,255,255,0.58) !important;
        box-shadow: 0 8px 18px rgba(20,24,32,0.08), inset 0 1px 0 rgba(255,255,255,0.76) !important;
      }

      .Yuze-img-studio-prompt-upload svg {
        width: 14px !important;
        height: 14px !important;
        color: rgba(0,122,255,0.82) !important;
      }

      .Yuze-img-studio-prompt-upload span {
        padding: 0 !important;
        font-weight: 740 !important;
        color: rgba(40,48,62,0.78) !important;
        white-space: nowrap !important;
      }

      @media (max-width: 720px) {
        #${PANEL_ID} {
          top: 12px !important;
          right: 10px !important;
          left: 10px !important;
          width: auto !important;
          height: min(620px, calc(100vh - 24px)) !important;
        }

        .Yuze-img-studio-shell {
          grid-template-columns: 136px minmax(0, 1fr) !important;
        }

        .Yuze-img-studio-shell.is-history-collapsed {
          grid-template-columns: 44px minmax(0, 1fr) !important;
        }

        .Yuze-img-studio-pane-grid {
          grid-template-columns: 1fr !important;
          overflow: auto !important;
        }

        .Yuze-img-studio-section {
          overflow: visible !important;
          padding-right: 0 !important;
        }

        .Yuze-img-preview-card {
          grid-template-columns: 1fr !important;
          overflow: auto !important;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        #${PANEL_ID},
        .Yuze-img-studio-shell,
        #${RESULT_PANEL_ID},
        .Yuze-img-studio-history,
        #${RESULT_PANEL_ID} .Yuze-img-studio-result-column,
        .Yuze-img-studio-history::before,
        .Yuze-img-studio-history::after,
        #${RESULT_PANEL_ID} .Yuze-img-studio-result-column::before,
        #${RESULT_PANEL_ID} .Yuze-img-studio-result-column::after {
          animation: none !important;
          transition-duration: 1ms !important;
        }
      }

      @keyframes YuzeImagePromptSpin {
        to { transform: rotate(360deg); }
      }

      @keyframes YuzeImagePromptDot {
        0%, 100% { opacity: 0.30; transform: translateY(0); }
        45% { opacity: 0.92; transform: translateY(-2px); }
      }

      @keyframes YuzeImagePromptTextShimmer {
        0% { background-position: 120% 0; }
        100% { background-position: -120% 0; }
      }

      @keyframes YuzeImageGeneratingAura {
        to { transform: rotate(360deg); }
      }

      @keyframes YuzeImageGeneratingSweep {
        0% { transform: translateX(-78%); opacity: 0; }
        18% { opacity: 1; }
        72% { opacity: 1; }
        100% { transform: translateX(78%); opacity: 0; }
      }

      @keyframes YuzeImageGeneratingPulse {
        0%, 100% { transform: scale(0.88); opacity: 0.42; }
        50% { transform: scale(1.04); opacity: 0.88; }
      }

      @keyframes YuzeImageGeneratingProgress {
        0% { transform: translateX(-104%); }
        100% { transform: translateX(224%); }
      }

      @keyframes YuzeImageDockReceive {
        0% { transform: translateY(0) scale(1); box-shadow: 0 16px 42px rgba(20,24,32,0.20), 0 4px 12px rgba(20,24,32,0.10), inset 0 1px 0 rgba(255,255,255,0.84); }
        42% { transform: translateY(-2px) scale(1.13); box-shadow: 0 22px 52px rgba(20,24,32,0.25), 0 0 0 9px rgba(0,122,255,0.08), inset 0 1px 0 rgba(255,255,255,0.92); }
        100% { transform: translateY(0) scale(1); box-shadow: 0 16px 42px rgba(20,24,32,0.20), 0 4px 12px rgba(20,24,32,0.10), inset 0 1px 0 rgba(255,255,255,0.84); }
      }

      @keyframes YuzeMacWindowOpen {
        0% {
          opacity: 0;
          transform: translate3d(28px, 36px, 0) scale(0.84);
          filter: blur(12px) saturate(1.08);
        }
        58% {
          opacity: 1;
          transform: translate3d(-2px, -2px, 0) scale(1.018);
          filter: blur(0) saturate(1.04);
        }
        78% {
          transform: translate3d(0, 0, 0) scale(0.995);
        }
        100% {
          opacity: 1;
          transform: translate3d(0, 0, 0) scale(1);
          filter: blur(0) saturate(1);
        }
      }

      @keyframes YuzeRibbonUnfoldLeft {
        0% { transform: scaleX(0.88) skewY(-1.6deg); filter: saturate(1.04); }
        54% { transform: scaleX(1.045) skewY(0.9deg); filter: saturate(1.18); }
        76% { transform: scaleX(0.985) skewY(-0.35deg); }
        100% { transform: scaleX(1) skewY(0deg); filter: saturate(1); }
      }

      @keyframes YuzeRibbonFoldLeft {
        0% { transform: scaleX(1) skewY(0deg); filter: saturate(1); }
        42% { transform: scaleX(1.055) skewY(0.9deg); filter: saturate(1.12); }
        100% { transform: scaleX(0.90) skewY(-1.2deg); filter: saturate(0.96); }
      }

      @keyframes YuzeRibbonSheenLeft {
        0% { opacity: 0; transform: translateX(16px) scaleX(0.25); }
        34% { opacity: 0.72; transform: translateX(4px) scaleX(1.08); }
        100% { opacity: 0; transform: translateX(-18px) scaleX(0.34); }
      }

      @keyframes YuzeRibbonEdgePullLeft {
        0% { opacity: 0.62; transform: scaleX(0.74); }
        48% { opacity: 0.82; transform: scaleX(1.32); }
        100% { opacity: 0.36; transform: scaleX(0.48); }
      }

      @keyframes YuzeRibbonUnfoldRight {
        0% { transform: translateX(-8px) scaleX(0.88) skewY(1.5deg); filter: saturate(1.04); }
        54% { transform: translateX(0) scaleX(1.045) skewY(-0.8deg); filter: saturate(1.18); }
        76% { transform: translateX(0) scaleX(0.985) skewY(0.32deg); }
        100% { transform: translateX(0) scaleX(1) skewY(0deg); filter: saturate(1); }
      }

      @keyframes YuzeRibbonFoldRight {
        0% { transform: translateX(0) scaleX(1) skewY(0deg); filter: saturate(1); }
        42% { transform: translateX(-2px) scaleX(1.055) skewY(-0.9deg); filter: saturate(1.12); }
        100% { transform: translateX(-8px) scaleX(0.90) skewY(1.2deg); filter: saturate(0.96); }
      }

      @keyframes YuzeRibbonSheenRight {
        0% { opacity: 0; transform: translateX(-16px) scaleX(0.25); }
        34% { opacity: 0.72; transform: translateX(-2px) scaleX(1.08); }
        100% { opacity: 0; transform: translateX(20px) scaleX(0.34); }
      }

      @keyframes YuzeRibbonEdgePullRight {
        0% { opacity: 0.68; transform: scaleX(0.72); }
        48% { opacity: 0.86; transform: scaleX(1.32); }
        100% { opacity: 0.38; transform: scaleX(0.48); }
      }

      .Yuze-img-error-overlay {
        position: fixed !important;
        inset: 0 !important;
        z-index: 2147483647 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 24px !important;
        box-sizing: border-box !important;
        background: rgba(15, 18, 26, 0.48) !important;
        backdrop-filter: blur(8px) !important;
        -webkit-backdrop-filter: blur(8px) !important;
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Segoe UI", sans-serif !important;
      }

      .Yuze-img-error-dialog {
        width: min(760px, calc(100vw - 32px)) !important;
        max-height: min(760px, calc(100vh - 32px)) !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 14px !important;
        padding: 18px !important;
        box-sizing: border-box !important;
        border: 1px solid rgba(255, 255, 255, 0.82) !important;
        border-radius: 20px !important;
        background: rgba(255, 255, 255, 0.96) !important;
        color: #172033 !important;
        box-shadow: 0 28px 90px rgba(15, 20, 35, 0.34), inset 0 1px 0 #fff !important;
      }

      .Yuze-img-error-head,
      .Yuze-img-error-foot {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 14px !important;
      }

      .Yuze-img-error-head > div {
        display: flex !important;
        flex-direction: column !important;
        gap: 4px !important;
      }

      .Yuze-img-error-head strong {
        color: #b42318 !important;
        font-size: 17px !important;
        line-height: 1.3 !important;
      }

      .Yuze-img-error-head span,
      .Yuze-img-error-status {
        color: #667085 !important;
        font-size: 12px !important;
        line-height: 1.4 !important;
      }

      .Yuze-img-error-close {
        width: 32px !important;
        height: 32px !important;
        flex: 0 0 auto !important;
        border: 0 !important;
        border-radius: 999px !important;
        background: #f2f4f7 !important;
        color: #344054 !important;
        font: 400 24px/30px sans-serif !important;
        cursor: pointer !important;
      }

      .Yuze-img-error-log {
        width: 100% !important;
        min-height: 320px !important;
        max-height: 56vh !important;
        resize: vertical !important;
        box-sizing: border-box !important;
        padding: 14px !important;
        border: 1px solid #d0d5dd !important;
        border-radius: 12px !important;
        outline: none !important;
        background: #101828 !important;
        color: #f2f4f7 !important;
        font: 12px/1.55 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
        white-space: pre !important;
      }

      .Yuze-img-error-foot > div {
        display: flex !important;
        gap: 8px !important;
        flex: 0 0 auto !important;
      }

      .Yuze-img-error-secondary,
      .Yuze-img-error-primary {
        min-height: 34px !important;
        padding: 0 14px !important;
        border-radius: 10px !important;
        font: 650 13px/1 -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif !important;
        cursor: pointer !important;
      }

      .Yuze-img-error-secondary {
        border: 1px solid #d0d5dd !important;
        background: #fff !important;
        color: #344054 !important;
      }

      .Yuze-img-error-primary {
        border: 1px solid #b42318 !important;
        background: #b42318 !important;
        color: #fff !important;
      }

      @media (max-width: 620px) {
        .Yuze-img-error-overlay { padding: 10px !important; }
        .Yuze-img-error-dialog { padding: 14px !important; }
        .Yuze-img-error-log { min-height: 260px !important; }
        .Yuze-img-error-foot { align-items: stretch !important; flex-direction: column !important; }
        .Yuze-img-error-foot > div { justify-content: flex-end !important; }
      }

    `;
    document.head.appendChild(style);
  }

  function loadHistory() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (Array.isArray(parsed)) {
        state.history = parsed
          .filter(item => item?.image && (item?.prompt || item?.status))
          .map(item => item.status === 'analyzing'
            ? { ...item, status: 'error', prompt: item.prompt || '', title: item.title || '提取未完成' }
            : { ...item, stylePrompt: item.stylePrompt || item.style_prompt || buildFallbackStylePrompt(item.prompt) })
          .slice(0, config.maxHistory);
      }
      state.selectedId = state.history[0]?.id || '';
    } catch (error) {
      state.history = [];
      reportStudioError('读取 Prompt 历史', error, { storageKey: STORAGE_KEY });
    }
  }

  function saveHistory() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.history.slice(0, config.maxHistory)));
    } catch (error) {
      reportStudioError('保存 Prompt 历史', error, {
        storageKey: STORAGE_KEY,
        historyCount: state.history.length
      });
    }
  }

  function normalizeStoredOutput(output) {
    const url = String(output?.url || '').trim();
    if (!url) return null;
    return {
      id: String(output?.id || `${output?.createdAt || Date.now()}-${Math.random().toString(16).slice(2)}`),
      url,
      title: cleanText(output?.title || '生成结果').slice(0, 24),
      prompt: cleanText(output?.prompt || ''),
      createdAt: String(output?.createdAt || new Date().toISOString()),
      displayBranchId: String(output?.displayBranchId || '')
    };
  }

  function normalizeStoredBranch(branch) {
    const url = String(branch?.url || '').trim();
    if (!url) return null;
    return {
      id: String(branch?.id || `${branch?.createdAt || Date.now()}-${Math.random().toString(16).slice(2)}`),
      url,
      title: cleanText(branch?.title || '微调结果').slice(0, 24),
      prompt: cleanText(branch?.prompt || ''),
      createdAt: String(branch?.createdAt || new Date().toISOString())
    };
  }

  function pruneOutputBranches(outputs, branches) {
    const validKeys = new Set(outputs.map(getOutputKey).filter(Boolean));
    const nextBranches = {};
    outputs.forEach(output => {
      const key = getOutputKey(output);
      const items = Array.isArray(branches?.[key]) ? branches[key] : [];
      nextBranches[key] = items.map(normalizeStoredBranch).filter(Boolean).slice(0, 12);
      if (output.displayBranchId && !nextBranches[key].some(branch => branch.id === output.displayBranchId)) {
        output.displayBranchId = '';
      }
    });
    Object.keys(branches || {}).forEach(key => {
      if (!validKeys.has(key)) delete branches[key];
    });
    return nextBranches;
  }

  function loadOutputs() {
    try {
      const parsed = JSON.parse(localStorage.getItem(OUTPUT_STORAGE_KEY) || '{}');
      const outputsSource = Array.isArray(parsed) ? parsed : parsed.outputs;
      const branchesSource = Array.isArray(parsed) ? {} : parsed.outputBranches;
      state.outputs = (Array.isArray(outputsSource) ? outputsSource : [])
        .map(normalizeStoredOutput)
        .filter(Boolean)
        .slice(0, config.maxOutputs);
      state.outputBranches = pruneOutputBranches(state.outputs, branchesSource || {});
    } catch (error) {
      state.outputs = [];
      state.outputBranches = {};
      reportStudioError('读取生成结果历史', error, { storageKey: OUTPUT_STORAGE_KEY });
    }
  }

  function saveOutputs() {
    try {
      const outputs = state.outputs.slice(0, config.maxOutputs);
      const outputBranches = pruneOutputBranches(outputs, state.outputBranches);
      state.outputs = outputs;
      state.outputBranches = outputBranches;
      localStorage.setItem(OUTPUT_STORAGE_KEY, JSON.stringify({ outputs, outputBranches }));
    } catch (error) {
      reportStudioError('保存生成结果历史', error, {
        storageKey: OUTPUT_STORAGE_KEY,
        outputCount: state.outputs.length
      });
    }
  }

  function isPinterestPage() {
    return /(^|\.)pinterest\./i.test(location.hostname);
  }

  function pinterestImageContainerSelector() {
    return [
      '[data-test-id="pin-closeup-image"]',
      '[data-test-id="closeup-container"]',
      '[data-test-id="CloseupMainPin"]',
      '[data-test-id="visual-content-container"]',
      '[data-test-id="non-story-pin-image"]',
      '[data-test-id="pinrep-image"]',
      '[data-test-id="pincard-image-without-link"]',
      '[data-test-id="pinWrapper"]',
      '[data-test-id="pin"]'
    ].join(',');
  }

  function isStudioOwnedElement(element) {
    if (!(element instanceof Element)) return false;
    return Boolean(element.closest([
      `#${PANEL_ID}`,
      `#${RESULT_PANEL_ID}`,
      `#${LAUNCHER_ID}`,
      `.${HOST_CLASS}`,
      `.${STATUS_CLASS}`,
      '.Yuze-img-preview-overlay',
      '.Yuze-img-dock-sprite',
      '.Yuze-img-dock-particle'
    ].join(',')));
  }

  function collectImages(scope) {
    if (!scope || isStudioOwnedElement(scope)) return [];
    const images = [];
    if (scope.tagName === 'IMG') images.push(scope);
    if (scope.querySelectorAll) images.push(...scope.querySelectorAll(selectors.image));
    return Array.from(new Set(images)).filter(img => !isStudioOwnedElement(img));
  }

  function imageScore(img) {
    if (isStudioOwnedElement(img)) return 0;
    const src = getImageSource(img);
    if (!src || /(^data:image\/svg|\.svg(?:$|\?))/i.test(src)) return 0;
    const rect = img.getBoundingClientRect();
    if (!visible(img) || rect.width < 86 || rect.height < 86) return 0;
    const naturalWidth = Number(img.naturalWidth || 0);
    const naturalHeight = Number(img.naturalHeight || 0);
    if (naturalWidth && naturalHeight && naturalWidth < 120 && naturalHeight < 120) return 0;
    const alt = cleanText(img.alt || img.getAttribute('aria-label') || '');
    if (/avatar|icon|logo|profile|emoji|badge|sprite/i.test(`${src} ${alt}`)) return 0;
    const area = rect.width * rect.height;
    const pinterestBonus = isPinterestPage() && img.closest(pinterestImageContainerSelector()) ? 1.25 : 1;
    return area * pinterestBonus;
  }

  function findImage(card) {
    return collectImages(card)
      .map(img => ({ img, score: imageScore(img) }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)[0]?.img || null;
  }

  function findCover(card, img) {
    if (!img) return null;
    if (isPinterestPage()) {
      const pinterestCover = img.closest(pinterestImageContainerSelector());
      if (pinterestCover && !isStudioOwnedElement(pinterestCover)) return pinterestCover;
    }
    const explicitCover = img.closest(selectors.cover);
    if (explicitCover && explicitCover.tagName !== 'PICTURE' && !isStudioOwnedElement(explicitCover)) return explicitCover;
    const fallback = img.parentElement || card;
    return isStudioOwnedElement(fallback) ? null : fallback;
  }

  function getCardTitle(card) {
    const img = findImage(card);
    const candidates = [
      img?.alt,
      img?.getAttribute('aria-label'),
      card?.getAttribute?.('aria-label'),
      card?.querySelector?.('[data-test-id="pinTitle"]')?.textContent,
      card?.querySelector?.('h1,h2,h3,[class*="title"],[class*="Title"]')?.textContent,
      document.querySelector('meta[property="og:title"]')?.content,
      document.title
    ];
    const text = cleanText(candidates.find(Boolean) || card?.textContent || '');
    return text ? text.slice(0, 42) : '网页图片';
  }

  function showStatus(card, message, duration = 1800) {
    if (!card) return;
    const img = findImage(card);
    const cover = findCover(card, img);
    if (!cover) return;
    if (getComputedStyle(cover).position === 'static') cover.style.position = 'relative';

    let status = cover.querySelector(`.${STATUS_CLASS}`);
    if (!status) {
      status = document.createElement('div');
      status.className = STATUS_CLASS;
      cover.appendChild(status);
    }
    status.textContent = message;
    status.classList.add('is-visible');
    window.clearTimeout(status.__YuzeTimer);
    status.__YuzeTimer = window.setTimeout(() => status.classList.remove('is-visible'), duration);
  }

  function setButtonState(button, type, label) {
    button.disabled = type === 'loading';
    button.classList.toggle('is-loading', type === 'loading');
    button.classList.toggle('is-queued', type === 'queued');
    button.querySelector('.Yuze-img-prompt-label').textContent = label;
  }

  function blockCardNavigation(event) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }

  function getDockTargetRect() {
    const launcher = document.getElementById(LAUNCHER_ID);
    if (launcher) return launcher.getBoundingClientRect();
    return {
      left: window.innerWidth - 70,
      top: window.innerHeight - 72,
      width: 48,
      height: 48
    };
  }

  function playLauncherReceivePulse() {
    const launcher = document.getElementById(LAUNCHER_ID);
    if (!launcher) return;
    launcher.classList.remove('is-receiving');
    void launcher.offsetWidth;
    launcher.classList.add('is-receiving');
    window.setTimeout(() => launcher.classList.remove('is-receiving'), 760);
  }

  function playExtractDockAnimation(card, img) {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const sourceImg = img || findImage(card);
    if (!sourceImg) return;
    const source = getImageSource(sourceImg);
    const fromRect = sourceImg.getBoundingClientRect();
    if (!source || fromRect.width < 24 || fromRect.height < 24) return;

    const targetRect = getDockTargetRect();
    const startSize = Math.max(52, Math.min(112, Math.min(fromRect.width, fromRect.height) * 0.52));
    const startX = fromRect.left + (fromRect.width - startSize) / 2;
    const startY = fromRect.top + (fromRect.height - startSize) / 2;
    const targetSize = Math.max(28, Math.min(42, targetRect.width * 0.72));
    const endX = targetRect.left + (targetRect.width - targetSize) / 2;
    const endY = targetRect.top + (targetRect.height - targetSize) / 2;

    const sprite = document.createElement('div');
    sprite.className = 'Yuze-img-dock-sprite';
    sprite.style.setProperty('width', `${Math.round(startSize)}px`, 'important');
    sprite.style.setProperty('height', `${Math.round(startSize)}px`, 'important');
    sprite.style.setProperty('border-radius', `${Math.round(Math.min(24, startSize * 0.24))}px`, 'important');
    sprite.style.transform = `translate3d(${Math.round(startX)}px, ${Math.round(startY)}px, 0) scale(1)`;
    sprite.innerHTML = `<img alt="" src="${escapeHtml(source)}">`;
    document.body.appendChild(sprite);

    const centerX = startX + startSize / 2;
    const centerY = startY + startSize / 2;
    const endCenterX = endX + targetSize / 2;
    const endCenterY = endY + targetSize / 2;
    const particles = Array.from({ length: 7 }, (_, index) => {
      const particle = document.createElement('span');
      particle.className = 'Yuze-img-dock-particle';
      const angle = (-120 + index * 34) * Math.PI / 180;
      const drift = 18 + (index % 3) * 8;
      const size = index % 2 ? 6 : 8;
      particle.style.setProperty('width', `${size}px`, 'important');
      particle.style.setProperty('height', `${size}px`, 'important');
      particle.style.transform = `translate3d(${Math.round(centerX)}px, ${Math.round(centerY)}px, 0) scale(0.8)`;
      document.body.appendChild(particle);
      particle.animate([
        { transform: `translate3d(${centerX}px, ${centerY}px, 0) scale(0.6)`, opacity: 0 },
        { transform: `translate3d(${centerX + Math.cos(angle) * drift}px, ${centerY + Math.sin(angle) * drift}px, 0) scale(1)`, opacity: 0.88, offset: 0.34 },
        { transform: `translate3d(${endCenterX}px, ${endCenterY}px, 0) scale(0.18)`, opacity: 0 }
      ], {
        duration: 1050 + index * 42,
        easing: 'cubic-bezier(.16,1,.3,1)',
        fill: 'forwards'
      }).finished.catch(() => {}).finally(() => particle.remove());
      return particle;
    });

    const curveY = Math.min(startY, endY) - Math.min(120, Math.abs(endY - startY) * 0.32 + 44);
    sprite.animate([
      {
        transform: `translate3d(${startX}px, ${startY}px, 0) scale(1) rotate(0deg)`,
        opacity: 0,
        filter: 'blur(2px) saturate(1.1)'
      },
      {
        transform: `translate3d(${startX}px, ${startY}px, 0) scale(1.06) rotate(-1deg)`,
        opacity: 1,
        filter: 'blur(0) saturate(1.2)',
        offset: 0.12
      },
      {
        transform: `translate3d(${(startX + endX) / 2}px, ${curveY}px, 0) scale(0.72) rotate(4deg)`,
        opacity: 0.92,
        filter: 'blur(0) saturate(1.35)',
        offset: 0.62
      },
      {
        transform: `translate3d(${endX}px, ${endY}px, 0) scale(${targetSize / startSize}) rotate(0deg)`,
        opacity: 0,
        filter: 'blur(2px) saturate(1.45)'
      }
    ], {
      duration: 1250,
      easing: 'cubic-bezier(.16,1,.3,1)',
      fill: 'forwards'
    }).finished.catch(() => {}).finally(() => {
      sprite.remove();
      particles.forEach(particle => particle.remove());
      playLauncherReceivePulse();
    });
  }

  function createButton(card) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = BUTTON_CLASS;
    button.innerHTML = `${iconSvg('scan')}<span class="Yuze-img-prompt-label">提取Prompt</span>`;
    button.title = '分析这张图片，提取可复用的生成 Prompt';
    button.addEventListener('pointerdown', blockCardNavigation, true);
    button.addEventListener('pointerup', blockCardNavigation, true);
    button.addEventListener('mousedown', blockCardNavigation, true);
    button.addEventListener('mouseup', blockCardNavigation, true);
    button.addEventListener('touchstart', blockCardNavigation, true);
    button.addEventListener('touchend', blockCardNavigation, true);
    button.addEventListener('click', (event) => {
      blockCardNavigation(event);
      enqueueAnalysis(card, button);
    }, true);
    return button;
  }

  function syncPinterestFloatingHost(entry) {
    const rect = entry.cover.getBoundingClientRect();
    const hidden = rect.width < 90
      || rect.height < 90
      || rect.bottom < 0
      || rect.right < 0
      || rect.top > window.innerHeight
      || rect.left > window.innerWidth;

    entry.host.style.setProperty('display', hidden ? 'none' : 'block', 'important');
    if (hidden) return;
    entry.host.style.setProperty('left', `${Math.round(rect.left)}px`, 'important');
    entry.host.style.setProperty('top', `${Math.round(rect.top)}px`, 'important');
    entry.host.style.setProperty('width', `${Math.round(rect.width)}px`, 'important');
    entry.host.style.setProperty('height', `${Math.round(rect.height)}px`, 'important');
  }

  function syncPinterestFloatingHosts() {
    state.floatingHosts.forEach((entry, cover) => {
      if (
        !document.documentElement.contains(cover)
        || !document.documentElement.contains(entry.card)
        || isStudioOwnedElement(cover)
        || isStudioOwnedElement(entry.card)
      ) {
        entry.host.remove();
        state.floatingHosts.delete(cover);
        return;
      }
      syncPinterestFloatingHost(entry);
    });
  }

  function createPinterestFloatingHost(card, cover) {
    if (isStudioOwnedElement(card) || isStudioOwnedElement(cover)) return false;
    const existing = state.floatingHosts.get(cover);
    if (existing) {
      syncPinterestFloatingHost(existing);
      return false;
    }

    const host = document.createElement('div');
    host.className = `${HOST_CLASS} is-pinterest`;
    host.appendChild(createButton(card));
    document.body.appendChild(host);
    const entry = { card, cover, host };
    state.floatingHosts.set(cover, entry);
    syncPinterestFloatingHost(entry);
    return true;
  }

  function enhanceCard(card) {
    if (!(card instanceof Element) || isStudioOwnedElement(card) || card.getAttribute(PROCESSED_ATTR) === 'true') return false;

    const img = findImage(card);
    const source = getImageSource(img);
    if (!img || !source || isStudioOwnedElement(img)) return false;

    const cover = findCover(card, img);
    if (!(cover instanceof Element) || isStudioOwnedElement(cover)) return false;
    if (cover.getAttribute(PROCESSED_ATTR) === 'true' && cover.querySelector(`.${HOST_CLASS}`)) return false;
    const rect = cover.getBoundingClientRect();
    if (rect.width < 90 || rect.height < 90) return false;

    if (isPinterestPage()) {
      const created = createPinterestFloatingHost(card, cover);
      card.setAttribute(PROCESSED_ATTR, 'true');
      cover.setAttribute(PROCESSED_ATTR, 'true');
      return created;
    }

    if (getComputedStyle(cover).position === 'static') cover.style.position = 'relative';
    if (!cover.querySelector(`.${HOST_CLASS}`)) {
      const host = document.createElement('div');
      host.className = HOST_CLASS;
      host.appendChild(createButton(card));
      cover.appendChild(host);
    }
    card.setAttribute(PROCESSED_ATTR, 'true');
    cover.setAttribute(PROCESSED_ATTR, 'true');
    return true;
  }

  function scanCards() {
    const cards = Array.from(document.querySelectorAll(selectors.card)).filter(card => !isStudioOwnedElement(card));
    let enhanced = 0;
    cards.forEach(card => {
      if (enhanceCard(card)) enhanced += 1;
    });
    syncPinterestFloatingHosts();
    return enhanced;
  }

  function scheduleScan() {
    window.clearTimeout(state.scanTimer);
    state.scanTimer = window.setTimeout(scanCards, 220);
  }

  function buildAnalysisPrompt(title) {
    return [
      '你是资深视觉提示词设计师。请只基于随附图片，提取两类可用于生成图片的中文 Prompt。目标是让生成模型能尽量复现画面，而不是只给抽象风格词。',
      '输出必须是 JSON，不要 Markdown，不要代码块。',
      '先判断图片类型：摄影/商品图/插画/海报/杂志封面/拼贴/界面截图等。不同类型要保留不同关键点。',
      '完整复现 Prompt 必须具体、可生成，尤其不能漏掉：主体是什么、主体数量和相对大小、前中后景、构图方向、画幅、镜头或视角、版式网格、显著文字及其位置、字体气质、装饰元素、色彩命名、光照、材质/笔触/印刷/颗粒/后期质感。',
      '如果是海报、封面、拼贴或平面设计：必须描述标题层级、横幅/色块/边框/留白、文字方向、可读文字内容（只写画面里能看见的，不要编品牌）、图形元素的上下左右位置，以及插画媒介和印刷质感。',
      '纯风格 Prompt 不是短标签。它要去掉具体可识别主体、人物身份、品牌、水印和唯一文本，但保留可迁移的视觉语法：版式结构、主体占比关系、图形层叠方式、色彩组合、字体/排版气质、光影、材质、颗粒、媒介和情绪。',
      '避免泛化成“高级感、干净、梦幻、可爱”这类空词；每个形容词后面都要有具体视觉依据，例如“高明度粉青黄配色、半透明叠印图形、丝网印刷颗粒、竖版杂志封面构图”。',
      '参考质量目标：如果图片类似“梦幻日系可爱游乐园海报”，完整复现应能写出粉色摩天轮、旋转木马、城堡、云朵、星星、横向青色横幅、奶油黄背景、巨大标题字、透明叠字、水彩和丝网印刷颗粒等具体元素；纯风格则保留竖版封面、粉青黄高明度拼贴、童话游乐园图形语言、装饰 serif 字体和半透明层叠排版，但不强制复刻具体标题。',
      'prompt 建议 120-220 个中文字符，可包含少量英文设计术语；style_prompt 建议 90-170 个中文字符。',
      '字段：',
      '{',
      '  "title": "不超过16字的风格名",',
      '  "prompt": "完整复现 Prompt：一段完整中文生成提示词，按重要性写清主体、画幅比例、构图层级、版式/文字、颜色、光影、材质、媒介和后期质感；海报封面必须写出可见文字和文字位置；不要要求复刻具体人物身份、品牌或水印",',
      '  "style_prompt": "纯风格 Prompt：一段可迁移的中文风格提示词，去掉具体主体、品牌、水印和唯一文字，但保留版式结构、主体占比、图形层叠、色彩组合、字体排版气质、光影、材质、媒介和颗粒质感",',
      '  "negative_prompt": "避免项，用逗号分隔",',
      '  "style_tags": ["3到6个风格标签"],',
      '  "ratio": "1:1/3:4/4:3/9:16/16:9 等最接近比例"',
      '}',
      `页面标题线索：${title || '无'}`
    ].join('\n');
  }

  function normalizeAnalysis(raw, fallbackTitle) {
    let value = raw;
    if (typeof raw === 'string') {
      const text = raw.trim().replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
      try {
        value = JSON.parse(text);
      } catch (error) {
        value = { prompt: text };
      }
    }
    const prompt = cleanText(value?.prompt || value?.description || value?.text || raw || '');
    const stylePrompt = cleanText(value?.style_prompt || value?.stylePrompt || value?.pure_style_prompt || '');
    return {
      title: cleanText(value?.title || fallbackTitle || '图片风格').slice(0, 18),
      prompt: prompt || '请生成同款网页图片风格，保持原图构图、色彩、光影和质感。',
      stylePrompt: stylePrompt || buildFallbackStylePrompt(prompt),
      negativePrompt: cleanText(value?.negative_prompt || value?.negativePrompt || '低清晰度, 变形, 乱码文字, 水印, 多余边框'),
      tags: Array.isArray(value?.style_tags) ? value.style_tags.slice(0, 6).map(cleanText).filter(Boolean) : [],
      ratio: cleanText(value?.ratio || '')
    };
  }

  function mockAnalysis(title) {
    return {
      title: '轻盈商业感',
      prompt: '图片风格，主体清晰居中，轻微俯拍视角，干净背景，柔和自然光，细腻高亮质感，低饱和高级配色，画面留白充足，适合生活方式分享，真实摄影质感，清晰边缘，优雅排版空间。',
      stylePrompt: '干净图片风格，主体明确但不限定具体对象，轻微俯拍视角，充足留白，柔和自然光，细腻高亮质感，低饱和高级配色，真实摄影质感，边缘清晰，画面适合替换任意生活方式主体。',
      negativePrompt: '低清晰度, 过曝, 文字乱码, 水印, 杂乱背景',
      tags: ['图片', '高级感', '自然光', '干净构图'],
      ratio: '3:4',
      titleFromPage: title
    };
  }

  function isDataImage(source) {
    return /^data:image\//i.test(String(source || '').trim());
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error || new Error('图片读取失败'));
      reader.readAsDataURL(blob);
    });
  }

  async function fetchImageAsDataUrl(source) {
    if (!source || isDataImage(source) || typeof window.fetch !== 'function') return '';
    const response = await window.fetch(source, {
      mode: 'cors',
      credentials: 'omit',
      cache: 'force-cache',
      referrerPolicy: 'no-referrer'
    });
    if (!response?.ok) throw new Error(`图片下载失败: HTTP ${response?.status || 0}`);
    const blob = await response.blob();
    if (!/^image\//i.test(blob.type || '')) throw new Error('下载内容不是图片');
    return blobToDataUrl(blob);
  }

  function canvasImageAsDataUrl(img) {
    if (!img) return '';
    const width = Math.max(1, Number(img.naturalWidth || img.getBoundingClientRect().width || 0));
    const height = Math.max(1, Number(img.naturalHeight || img.getBoundingClientRect().height || 0));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return '';
    context.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', 0.92);
  }

  async function resolveAnalysisImage(job) {
    const img = job.imgElement || findImage(job.card);
    const source = getImageSource(img) || job.image || '';
    if (!source || isDataImage(source)) return source;

    try {
      const dataUrl = await fetchImageAsDataUrl(source);
      if (dataUrl) {
        updateHistoryItem(job.itemId, { image: dataUrl, sourceImageUrl: source }, { persist: true, sync: false });
        return dataUrl;
      }
    } catch (error) {
      console.warn('[Yuze] 图片 fetch 转 base64 失败，尝试 canvas:', error);
    }

    try {
      const dataUrl = canvasImageAsDataUrl(img);
      if (dataUrl) {
        updateHistoryItem(job.itemId, { image: dataUrl, sourceImageUrl: source }, { persist: true, sync: false });
        return dataUrl;
      }
    } catch (error) {
      console.warn('[Yuze] 图片 canvas 转 base64 失败，回退 URL:', error);
    }

    return source;
  }

  function createAnalysisHistoryItem(image, title, aspectRatio) {
    const item = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      image,
      title: 'Prompt 提取中',
      pageTitle: title,
      prompt: '',
      stylePrompt: '',
      negativePrompt: '',
      tags: [],
      ratio: aspectRatio,
      status: 'analyzing',
      createdAt: new Date().toISOString()
    };
    state.history = [item, ...state.history.filter(old => old.image !== image)].slice(0, config.maxHistory);
    state.selectedId = item.id;
    state.activeTab = 'prompt';
    state.uploadedDataUrl = '';
    resetPromptDrafts();
    saveHistory();
    return item;
  }

  function enqueueAnalysis(card, button) {
    if (button?.dataset.YuzeAnalysisState === 'queued' || button?.dataset.YuzeAnalysisState === 'loading') return;

    const img = findImage(card);
    const image = getImageSource(img);
    if (!img || !image) {
      const error = new Error('未找到可分析图片');
      showStatus(card, error.message);
      reportStudioError('准备提取图片 Prompt', error, {
        hasImageElement: Boolean(img),
        hasImageSource: Boolean(image),
        pageTitle: document.title || ''
      });
      return;
    }

    playExtractDockAnimation(card, img);
    const title = getCardTitle(card);
    const aspectRatio = getAspectRatioFromImage(img);
    const item = createAnalysisHistoryItem(image, title, aspectRatio);
    const job = {
      card,
      button,
      image,
      imgElement: img,
      title,
      aspectRatio,
      itemId: item.id
    };

    button.dataset.YuzeAnalysisState = 'queued';
    state.analysisQueue.push(job);
    updateQueuedButtons();
    showPanel();
    renderPanel();
    applyPanelPosition();
    setPanelMessage(queueMessage());
    updateLauncher();
    processAnalysisQueue();
  }

  function getImageDataUrlAspectRatio(dataUrl) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(getAspectRatioFromSize(img.naturalWidth || 1, img.naturalHeight || 1));
      img.onerror = () => resolve('3:4');
      img.src = dataUrl;
    });
  }

  async function enqueueUploadedPromptAnalysis(file) {
    if (!file || !/^image\//i.test(file.type || '')) {
      const error = new Error('请选择一张图片文件');
      setPanelMessage(`${error.message}。`);
      reportStudioError('校验待提取 Prompt 的上传图片', error, {
        hasFile: Boolean(file),
        fileName: file?.name || '',
        fileType: file?.type || '',
        fileSize: file?.size || 0
      });
      return;
    }

    try {
      const image = await readFileAsDataUrl(file);
      const aspectRatio = await getImageDataUrlAspectRatio(image);
      const title = cleanText(file.name || '上传图片');
      const item = createAnalysisHistoryItem(image, title, aspectRatio);
      state.analysisQueue.push({
        card: null,
        button: null,
        image,
        title,
        aspectRatio,
        itemId: item.id
      });
      showPanel();
      renderPanel();
      applyPanelPosition();
      setPanelMessage(queueMessage());
      updateLauncher();
      processAnalysisQueue();
    } catch (error) {
      reportStudioError('读取待提取 Prompt 的上传图片', error, {
        fileName: file?.name || '',
        fileType: file?.type || '',
        fileSize: file?.size || 0
      });
      setPanelMessage(error?.message || '上传图片读取失败。');
    }
  }

  function retryHistoryAnalysis(id) {
    const item = findHistoryItem(id);
    if (!item?.image || item.status === 'analyzing') return;
    if (state.analysisQueue.some(job => job.itemId === item.id)) return;

    updateHistoryItem(item.id, {
      title: 'Prompt 提取中',
      prompt: '',
      stylePrompt: '',
      negativePrompt: '',
      tags: [],
      status: 'analyzing',
      updatedAt: new Date().toISOString()
    }, { persist: true, render: false });

    state.selectedId = item.id;
    state.activeTab = 'prompt';
    resetPromptDrafts();
    state.analysisQueue.push({
      card: null,
      button: null,
      image: item.image,
      title: item.pageTitle || item.title || '网页图片',
      aspectRatio: item.ratio || '3:4',
      itemId: item.id
    });
    showPanel();
    renderPanel();
    applyPanelPosition();
    setPanelMessage(queueMessage());
    updateLauncher();
    processAnalysisQueue();
  }

  function queueMessage() {
    const pending = state.analysisQueue.length;
    if (state.analysisRunning && pending > 0) return `正在分析 1 张图片，另有 ${pending} 张等待中...`;
    if (state.analysisRunning) return '正在提取图片风格 Prompt...';
    if (pending > 0) return `${pending} 张图片已加入分析队列...`;
    return '等待图片分析任务...';
  }

  function updateQueuedButtons() {
    state.analysisQueue.forEach((job, index) => {
      if (!job.button) return;
      setButtonState(job.button, 'queued', index === 0 && !state.analysisRunning ? '即将分析' : `排队 ${index + 1}`);
    });
  }

  async function processAnalysisQueue() {
    if (state.analysisRunning) return;
    const job = state.analysisQueue.shift();
    if (!job) {
      updateLauncher();
      return;
    }

    state.analysisRunning = true;
    updateQueuedButtons();
    updateLauncher();
    try {
      await analyzeJob(job);
    } catch (error) {
      reportStudioError('调度 Prompt 提取任务', error, {
        itemId: job.itemId,
        pageTitle: job.title || '',
        queuedCount: state.analysisQueue.length
      });
    } finally {
      state.analysisRunning = false;
      updateQueuedButtons();
      updateLauncher();
      processAnalysisQueue();
    }
  }

  async function analyzeJob(job) {
    const { card, button, image, title, aspectRatio, itemId } = job;
    if (button) {
      button.dataset.YuzeAnalysisState = 'loading';
      setButtonState(button, 'loading', '分析中');
    }
    setPanelMessage(queueMessage());

    try {
      let analysis;
      if (config.mockBridge) {
        analysis = mockAnalysis(title);
        await streamPromptText(itemId, analysis.prompt, { duration: Math.min(config.mockAnalysisDelayMs, 1400) });
      } else {
        if (!window.LLMBridge || typeof window.LLMBridge.chat !== 'function') {
          throw new Error('当前页面未检测到 LLMBridge.chat，请在 Yuze 脚本环境运行');
        }
        let streamedRaw = '';
        const handleChunk = (chunk) => {
          streamedRaw += extractChunkText(chunk);
          const partialPrompt = extractPromptFromJsonFragment(streamedRaw);
          if (partialPrompt) {
            updateHistoryItem(itemId, { prompt: partialPrompt, status: 'analyzing' }, { sync: true });
          }
        };
        const analysisImage = await resolveAnalysisImage(job);
        const raw = await callBridgeWithAuthRetry(() => window.LLMBridge.chat(buildAnalysisPrompt(title), {
          response_format: 'json',
          images: [analysisImage],
          onChunk: handleChunk,
          onDelta: handleChunk,
          onMessage: handleChunk
        }), '图片分析', config.analysisTimeoutMs);
        analysis = normalizeAnalysis(raw, title);
        if (!findHistoryItem(itemId)?.prompt || !analysis.prompt.startsWith(findHistoryItem(itemId)?.prompt || '')) {
          updateHistoryItem(itemId, { prompt: '' }, { sync: true });
        }
        await streamPromptText(itemId, analysis.prompt, { delay: 6 });
      }

      updateHistoryItem(itemId, {
        title: analysis.title || title,
        pageTitle: title,
        prompt: analysis.prompt,
        stylePrompt: analysis.stylePrompt || buildFallbackStylePrompt(analysis.prompt),
        negativePrompt: analysis.negativePrompt,
        tags: analysis.tags || [],
        ratio: analysis.ratio || aspectRatio,
        status: 'ready',
        updatedAt: new Date().toISOString()
      }, { persist: true, render: true });
      state.selectedId = itemId;
      resetPromptDrafts();
      applyPanelPosition();
      showStatus(card, 'Prompt 已加入浮窗历史');
      if (button) {
        button.dataset.YuzeAnalysisState = 'done';
        setButtonState(button, 'done', '已提取');
        window.setTimeout(() => {
          button.dataset.YuzeAnalysisState = 'idle';
          setButtonState(button, 'idle', '提取Prompt');
        }, 1200);
      }
    } catch (error) {
      reportStudioError('提取图片 Prompt', error, {
        itemId,
        pageTitle: title || '',
        aspectRatio,
        imageKind: isDataImage(image) ? 'base64' : 'url',
        hasChatBridge: Boolean(window.LLMBridge && typeof window.LLMBridge.chat === 'function'),
        timeoutMs: config.analysisTimeoutMs
      });
      showStatus(card, error?.message || '分析失败', 2600);
      updateHistoryItem(itemId, {
        title: '提取失败',
        status: 'error',
        prompt: findHistoryItem(itemId)?.prompt || '',
        stylePrompt: findHistoryItem(itemId)?.stylePrompt || '',
        negativePrompt: '',
        updatedAt: new Date().toISOString()
      }, { persist: true, render: true });
      setPanelMessage(error?.message || '分析失败，请稍后再试');
      if (button) {
        button.dataset.YuzeAnalysisState = 'error';
        setButtonState(button, 'error', '失败');
        window.setTimeout(() => {
          button.dataset.YuzeAnalysisState = 'idle';
          setButtonState(button, 'idle', '提取Prompt');
        }, 1500);
      }
    }
  }

  function showPanel() {
    if (!state.panel) {
      createPanel();
      updateLauncher();
      return;
    }
    state.panel.classList.add('is-visible');
    renderDetachedResultPanel();
    applyPanelPosition();
    updateLauncher();
  }

  function closePanel() {
    if (!state.panel) return;
    state.panel.classList.remove('is-visible');
    syncDetachedResultPanelPosition();
    updateLauncher();
  }

  function togglePanel() {
    if (state.panel?.classList.contains('is-visible')) {
      closePanel();
      return;
    }
    showPanel();
  }

  function createLauncher() {
    document.getElementById(LAUNCHER_ID)?.remove();
    const launcher = document.createElement('button');
    launcher.id = LAUNCHER_ID;
    launcher.type = 'button';
    launcher.title = '打开图片 Prompt Studio（错误日志专用版）';
    launcher.innerHTML = `${iconSvg('sparkle')}<span class="Yuze-img-launcher-badge"></span>`;
    launcher.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      togglePanel();
    });
    document.body.appendChild(launcher);
    updateLauncher();
  }

  function updateLauncher() {
    const launcher = document.getElementById(LAUNCHER_ID);
    if (!launcher) return;
    const workCount = state.analysisQueue.length + (state.analysisRunning ? 1 : 0);
    const badge = launcher.querySelector('.Yuze-img-launcher-badge');
    launcher.classList.toggle('is-active', Boolean(state.panel?.classList.contains('is-visible')));
    launcher.classList.toggle('has-work', workCount > 0);
    if (badge) badge.textContent = workCount > 9 ? '9+' : String(workCount || '');
  }

  function createPanel() {
    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', '通用图片 Prompt 工作台');
    document.body.appendChild(panel);
    state.panel = panel;
    renderPanel();
    applyPanelPosition();
    requestAnimationFrame(() => {
      panel.classList.add('is-visible');
      renderDetachedResultPanel();
      applyPanelPosition();
      updateLauncher();
    });
  }

  function clampPanelPosition(left, top) {
    const panel = state.panel;
    const rect = panel?.getBoundingClientRect();
    const width = rect?.width || 640;
    const height = rect?.height || 560;
    const margin = 10;
    return {
      left: Math.max(margin, Math.min(left, window.innerWidth - width - margin)),
      top: Math.max(margin, Math.min(top, window.innerHeight - height - margin))
    };
  }

  function clampPanelHeight(height) {
    const panel = state.panel;
    const rect = panel?.getBoundingClientRect();
    const top = rect?.top ?? 18;
    const minHeight = window.innerWidth <= 720 ? 420 : 520;
    const maxHeight = Math.max(minHeight, window.innerHeight - top - 10);
    return Math.round(Math.max(minHeight, Math.min(height, maxHeight)));
  }

  function applyPanelSize() {
    const panel = state.panel;
    if (!panel) return;
    if (!state.panelHeight) {
      panel.style.removeProperty('height');
      syncDetachedResultPanelPosition();
      return;
    }
    state.panelHeight = clampPanelHeight(state.panelHeight);
    panel.style.setProperty('height', `${state.panelHeight}px`, 'important');
    syncDetachedResultPanelPosition();
  }

  function applyPanelPosition() {
    const panel = state.panel;
    if (!panel) return;
    applyPanelSize();
    if (!state.panelPosition) {
      syncDetachedResultPanelPosition();
      return;
    }
    const next = clampPanelPosition(state.panelPosition.left, state.panelPosition.top);
    state.panelPosition = next;
    panel.style.setProperty('left', `${Math.round(next.left)}px`, 'important');
    panel.style.setProperty('top', `${Math.round(next.top)}px`, 'important');
    panel.style.setProperty('right', 'auto', 'important');
    syncDetachedResultPanelPosition();
  }

  function startPanelDrag(event) {
    if (!state.panel || event.button !== 0 || event.target.closest('button, textarea, input, label, select, a')) return;
    const rect = state.panel.getBoundingClientRect();
    state.dragging = {
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top
    };
    state.panel.classList.add('is-dragging');
    event.preventDefault();

    const onMove = (moveEvent) => {
      if (!state.dragging) return;
      state.panelPosition = clampPanelPosition(
        moveEvent.clientX - state.dragging.offsetX,
        moveEvent.clientY - state.dragging.offsetY
      );
      applyPanelPosition();
    };
    const onUp = () => {
      state.dragging = null;
      state.panel?.classList.remove('is-dragging');
      document.removeEventListener('mousemove', onMove, true);
      document.removeEventListener('mouseup', onUp, true);
    };

    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('mouseup', onUp, true);
  }

  function startPanelResize(event) {
    if (!state.panel || event.button !== 0) return;
    const rect = state.panel.getBoundingClientRect();
    state.resizing = {
      startY: event.clientY,
      startHeight: rect.height
    };
    state.panel.classList.add('is-resizing');
    event.preventDefault();
    event.stopPropagation();

    const onMove = (moveEvent) => {
      if (!state.resizing) return;
      const nextHeight = state.resizing.startHeight + moveEvent.clientY - state.resizing.startY;
      state.panelHeight = clampPanelHeight(nextHeight);
      applyPanelSize();
    };
    const onUp = () => {
      state.resizing = null;
      state.panel?.classList.remove('is-resizing');
      document.removeEventListener('mousemove', onMove, true);
      document.removeEventListener('mouseup', onUp, true);
      applyPanelPosition();
    };

    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('mouseup', onUp, true);
  }

  function isScrollableElement(element) {
    if (!(element instanceof Element)) return false;
    const style = window.getComputedStyle(element);
    const canOverflowY = /(auto|scroll|overlay)/.test(style.overflowY || '');
    return canOverflowY && element.scrollHeight > element.clientHeight + 1;
  }

  function getScrollableAncestor(target, root) {
    let node = target instanceof Element ? target : target?.parentElement;
    while (node && node !== root) {
      if (isScrollableElement(node)) return node;
      node = node.parentElement;
    }
    const activePane = root.querySelector('.Yuze-img-studio-pane.is-active');
    if (isScrollableElement(activePane)) return activePane;
    const activeGrid = root.querySelector('.Yuze-img-studio-pane-grid.is-active');
    if (isScrollableElement(activeGrid)) return activeGrid;
    return null;
  }

  function canScrollElement(element, deltaY) {
    if (!element || !deltaY) return false;
    if (deltaY < 0) return element.scrollTop > 0;
    return element.scrollTop + element.clientHeight < element.scrollHeight - 1;
  }

  function stopPageScroll(event, root, deltaY) {
    if (!root.contains(event.target)) return;
    const scroller = getScrollableAncestor(event.target, root);
    event.stopPropagation();
    if (!scroller || !canScrollElement(scroller, deltaY)) {
      event.preventDefault();
    }
  }

  function bindScrollGuards(root) {
    if (!root || root.dataset.YuzeScrollGuardBound === '1') return;
    root.dataset.YuzeScrollGuardBound = '1';
    let lastTouchY = null;
    root.addEventListener('wheel', (event) => {
      if (event.ctrlKey) return;
      if (state.resultViewMode === 'focus' && event.target?.closest?.('.Yuze-img-studio-output-focus')) return;
      stopPageScroll(event, root, event.deltaY);
    }, { capture: true, passive: false });
    root.addEventListener('touchstart', (event) => {
      lastTouchY = event.touches?.[0]?.clientY ?? null;
    }, { capture: true, passive: true });
    root.addEventListener('touchmove', (event) => {
      const currentY = event.touches?.[0]?.clientY ?? null;
      if (currentY == null || lastTouchY == null) return;
      const deltaY = lastTouchY - currentY;
      lastTouchY = currentY;
      stopPageScroll(event, root, deltaY);
    }, { capture: true, passive: false });
    root.addEventListener('touchend', () => {
      lastTouchY = null;
    }, { capture: true, passive: true });
  }

  function setPanelMessage(message) {
    if (!state.panel) return;
    if (state.generating) return;
    const target = document.getElementById(RESULT_PANEL_ID)?.querySelector('.Yuze-img-studio-output-list')
      || state.panel.querySelector('.Yuze-img-studio-output-list');
    if (target && !state.outputs.length) {
      target.innerHTML = `<div class="Yuze-img-studio-empty">${escapeHtml(message)}</div>`;
    }
  }

  function markRibbonMotion(kind, direction) {
    const key = kind === 'result' ? 'resultRibbonMotion' : 'historyRibbonMotion';
    state[key] = direction;
    window.clearTimeout(state.ribbonTimers[kind]);
    state.ribbonTimers[kind] = window.setTimeout(() => {
      state[key] = '';
      if (kind === 'result') {
        renderDetachedResultPanel();
        return;
      }
      renderPanel();
      applyPanelPosition();
    }, kind === 'history' ? (direction === 'expand' ? 720 : 600) : (direction === 'expand' ? 460 : 370));
  }

  function toggleHistorySelection(id) {
    const targetId = String(id || '');
    if (!targetId) return;
    const selected = new Set(state.selectedHistoryIds);
    if (selected.has(targetId)) selected.delete(targetId);
    else selected.add(targetId);
    const readyIds = new Set(getReadyHistory().map(item => item.id));
    state.selectedHistoryIds = Array.from(selected).filter(itemId => readyIds.has(itemId)).slice(0, 8);
    clearTabDrafts('multiT2i');
    clearTabDrafts('multiI2i');
    renderPanel({ preserveHistoryScroll: true });
    applyPanelPosition();
  }

  function isHistoryUploadEnabled(id) {
    const targetId = String(id || '');
    return Boolean(targetId) && !state.historyUploadDisabledIds.includes(targetId);
  }

  function getUploadEnabledHistoryItems(items) {
    return items.filter(item => item?.id && isHistoryUploadEnabled(item.id));
  }

  function renderHistoryUploadToggle(item) {
    if (!item?.id) return '';
    const enabled = isHistoryUploadEnabled(item.id);
    return `
      <span
        role="button"
        tabindex="0"
        class="Yuze-img-studio-history-upload-toggle ${enabled ? '' : 'is-off'}"
        data-toggle-history-upload-id="${escapeHtml(item.id)}"
        title="${enabled ? '生图时上传这张历史图' : '生图时不上传这张历史图'}"
        aria-label="${enabled ? '生图时上传这张历史图' : '生图时不上传这张历史图'}"
      >${iconSvg(enabled ? 'image' : 'close')}</span>
    `;
  }

  function toggleSelectedHistoryViewMode() {
    state.selectedHistoryViewMode = state.selectedHistoryViewMode === 'hero' ? 'grid' : 'hero';
    renderPanel({ preserveHistoryScroll: true });
    applyPanelPosition();
  }

  function toggleFusionPromptCollapsed() {
    rememberActivePromptDraft();
    state.fusionPromptCollapsed = !state.fusionPromptCollapsed;
    renderPanel({ preserveHistoryScroll: true });
    applyPanelPosition();
  }

  function toggleHistoryUpload(id) {
    const targetId = String(id || '');
    if (!targetId) return;
    const disabled = new Set(state.historyUploadDisabledIds);
    if (disabled.has(targetId)) disabled.delete(targetId);
    else disabled.add(targetId);
    const historyIds = new Set(state.history.map(item => item.id));
    state.historyUploadDisabledIds = Array.from(disabled).filter(itemId => historyIds.has(itemId));
    renderPanel({ preserveHistoryScroll: true });
    applyPanelPosition();
  }

  function ensureFusionSelection() {
    if (!isFusionTab()) return;
    const readyIds = new Set(getReadyHistory().map(item => item.id));
    state.selectedHistoryIds = state.selectedHistoryIds.filter(id => readyIds.has(id));
    const item = getSelectedItem();
    if (!state.selectedHistoryIds.length && item && readyIds.has(item.id)) {
      state.selectedHistoryIds = [item.id];
    }
  }

  function renderPromptKindControl(tab = state.activeTab) {
    const kind = getPromptKind(tab);
    return `
      <div class="Yuze-img-studio-prompt-kind" role="group" aria-label="Prompt 类型">
        <button type="button" class="Yuze-img-studio-kind-button ${kind === 'recreate' ? 'is-active' : ''}" data-action="prompt-kind" data-kind="recreate">完整复现</button>
        <button type="button" class="Yuze-img-studio-kind-button ${kind === 'style' ? 'is-active' : ''}" data-action="prompt-kind" data-kind="style">纯风格</button>
      </div>
    `;
  }

  function renderSelectedHistoryStrip(items) {
    if (!items.length) {
      return '<div class="Yuze-img-studio-selection-note"><span>在左侧历史中选择 2 张以上图片融合风格。</span></div>';
    }
    const isHero = state.selectedHistoryViewMode === 'hero';
    const renderSelectedCard = (item) => {
      const tags = item.status === 'analyzing'
        ? '正在提取 Prompt'
        : item.status === 'error'
          ? '提取失败，可删除后重试'
          : item.tags?.length ? item.tags.join(' · ') : '已提取风格';
      return `
        <button type="button" class="Yuze-img-studio-preview-row Yuze-img-studio-selected-card" data-preview-history-id="${escapeHtml(item.id)}" title="${escapeHtml(item.title)}">
          <img alt="${escapeHtml(item.title)}" src="${escapeHtml(item.image)}">
          <div>
            <p class="Yuze-img-studio-meta-title">${escapeHtml(item.title)}</p>
            <p class="Yuze-img-studio-meta-text">${escapeHtml(tags)}${item.ratio ? ` · ${escapeHtml(item.ratio)}` : ''}</p>
          </div>
          ${renderHistoryUploadToggle(item)}
        </button>
      `;
    };
    return `
      <div class="Yuze-img-studio-fusion-selection">
        <div class="Yuze-img-studio-fusion-selection-head">
          <span class="Yuze-img-studio-fusion-selection-title">已选择 ${items.length} 张历史图</span>
          <button type="button" class="Yuze-img-studio-mini-toggle ${isHero ? 'is-active' : ''}" data-action="toggle-selected-history-view" title="${isHero ? '切换为两列' : '切换为一列大图'}">${iconSvg(isHero ? 'layoutList' : 'focusImage')}</button>
        </div>
        <div class="Yuze-img-studio-selected-grid ${isHero ? 'is-hero' : ''}">
          ${items.map(renderSelectedCard).join('')}
        </div>
      </div>
    `;
  }

  function buildFusionPrompt(items, kind, mode, hasUpload) {
    const promptParts = items.map((item, index) => {
      const label = `${index + 1}. ${item.title || '历史图'}`;
      return `${label}：${getPromptText(item, kind)}`;
    }).filter(Boolean);
    const heading = mode === 'multiI2i'
      ? hasUpload
        ? '参考已选择历史图的共同视觉风格，并将上传图片中的主体自然带入该融合风格。'
        : '参考已选择历史图的共同视觉风格，并基于第一张历史图进行风格融合图生图。'
      : '融合已选择历史图的共同视觉风格，生成一张新的网页图片。';
    return [
      heading,
      kind === 'style'
        ? '只迁移风格，不复刻具体人物身份、品牌、文字、水印或唯一场景。'
        : '综合主体表达、构图、光影、色彩、质感和版式，不复刻具体人物身份或水印。',
      promptParts.join('\n')
    ].filter(Boolean).join('\n');
  }

  function getGenerationFallbackPrompt(tab, item) {
    const kind = getPromptKind(tab);
    if (tab === 'multiT2i' || tab === 'multiI2i') {
      return buildFusionPrompt(getSelectedHistoryItems(), kind, tab, Boolean(state.uploadedDataUrl));
    }
    if (tab === 'i2i') return buildImageToImagePrompt(getPromptText(item, kind), Boolean(state.uploadedDataUrl));
    return getPromptText(item, kind);
  }

  function renderHistoryList() {
    if (!state.history.length) {
      return '<div class="Yuze-img-studio-empty">点击图片上的“提取Prompt”按钮后，识别过的图片会在这里按单列保存。</div>';
    }
    const selectable = isFusionTab();
    return state.history.map(item => {
      const isAnalyzing = item.status === 'analyzing';
      const statusLabel = isAnalyzing ? '提取中' : item.status === 'error' ? '失败' : '';
      const selected = state.selectedHistoryIds.includes(item.id);
      return `
      <button type="button" class="Yuze-img-studio-history-item ${item.id === state.selectedId ? 'is-active' : ''} ${selected ? 'is-selected' : ''} ${isAnalyzing ? 'is-analyzing' : ''}" data-history-id="${escapeHtml(item.id)}" title="${escapeHtml(item.title)}">
        <span role="button" tabindex="0" class="Yuze-img-studio-delete" data-delete-history-id="${escapeHtml(item.id)}" title="删除这条历史">${iconSvg('close')}</span>
        ${selectable ? `<span class="Yuze-img-studio-history-check">${selected ? iconSvg('check') : ''}</span>` : ''}
        ${statusLabel ? `<span class="Yuze-img-studio-history-state">${isAnalyzing ? iconSvg('sparkle') : ''}${escapeHtml(statusLabel)}</span>` : ''}
        ${item.status === 'error' ? `<span role="button" tabindex="0" class="Yuze-img-studio-history-retry" data-retry-history-id="${escapeHtml(item.id)}" title="重新提取 Prompt">${iconSvg('sparkle')}重试</span>` : ''}
        <span class="Yuze-img-studio-history-thumb"><img alt="${escapeHtml(item.title)}" src="${escapeHtml(item.image)}"></span>
        <span class="Yuze-img-studio-history-caption">${escapeHtml(item.title)}</span>
      </button>
    `;
    }).join('');
  }

  function renderPreview(item) {
    if (!item) {
      return '<div class="Yuze-img-studio-empty">先在图片上点击“提取Prompt”。</div>';
    }
    const tags = item.status === 'analyzing'
      ? '正在提取 Prompt'
      : item.status === 'error'
        ? '提取失败，可删除后重试'
        : item.tags?.length ? item.tags.join(' · ') : '已提取风格';
    return `
      <div class="Yuze-img-studio-preview-row">
        <img alt="${escapeHtml(item.title)}" src="${escapeHtml(item.image)}">
        <div>
          <p class="Yuze-img-studio-meta-title">${escapeHtml(item.title)}</p>
          <p class="Yuze-img-studio-meta-text">${escapeHtml(tags)}${item.ratio ? ` · ${escapeHtml(item.ratio)}` : ''}</p>
        </div>
        ${renderHistoryUploadToggle(item)}
      </div>
    `;
  }

  function renderGeneratingCard() {
    if (!state.generating) return '';
    return `
      <div class="Yuze-img-studio-generating-card" aria-live="polite">
        <div class="Yuze-img-studio-generating-frame"></div>
        <div class="Yuze-img-studio-generating-caption">
          <span>生成中</span>
          <span class="Yuze-img-studio-streaming-dots"><i></i><i></i><i></i></span>
        </div>
        <div class="Yuze-img-studio-generating-progress"><span></span></div>
      </div>
    `;
  }

  function renderOutputList() {
    if (!state.outputs.length) {
      if (state.generating) return '';
      return '<div class="Yuze-img-studio-empty">生成结果会显示在这里。验证脚本布局时不需要真的调用生图。</div>';
    }
    return state.outputs.map(output => {
      const display = getOutputDisplay(output);
      const isRefinedDisplay = Boolean(display.displayBranchId);
      return `
      <button type="button" class="Yuze-img-studio-output ${isRefinedDisplay ? 'is-refined-display' : ''}" data-preview-url="${escapeHtml(display.url)}" data-preview-title="${escapeHtml(display.title)}" data-output-id="${escapeHtml(getOutputKey(output))}" data-output-key="${escapeHtml(getOutputKey(output))}">
        <span role="button" tabindex="0" class="Yuze-img-studio-delete" data-delete-output-key="${escapeHtml(getOutputKey(output))}" title="删除这张结果">${iconSvg('close')}</span>
        <img alt="${escapeHtml(display.title)}" src="${escapeHtml(display.url)}">
        ${isRefinedDisplay ? '<em class="Yuze-img-studio-output-badge">微调展示</em>' : ''}
        <span>${escapeHtml(display.title)}</span>
      </button>
    `;
    }).join('');
  }

  function clampResultFocusIndex() {
    const maxIndex = Math.max(0, state.outputs.length - 1);
    state.resultFocusIndex = Math.max(0, Math.min(Number(state.resultFocusIndex) || 0, maxIndex));
    return state.resultFocusIndex;
  }

  function renderOutputFocus() {
    if (!state.outputs.length) {
      if (state.generating) return '';
      return '<div class="Yuze-img-studio-empty">生成结果会显示在这里。验证脚本布局时不需要真的调用生图。</div>';
    }
    const index = clampResultFocusIndex();
    const output = state.outputs[index] || state.outputs[0];
    const display = getOutputDisplay(output);
    const outputKey = getOutputKey(output);
    const isRefinedDisplay = Boolean(display.displayBranchId);
    return `
      <div class="Yuze-img-studio-output-focus" data-focus-output-index="${index}">
        <button type="button" class="Yuze-img-studio-focus-card ${isRefinedDisplay ? 'is-refined-display' : ''}" data-preview-url="${escapeHtml(display.url)}" data-preview-title="${escapeHtml(display.title)}" data-output-id="${escapeHtml(outputKey)}" data-output-key="${escapeHtml(outputKey)}">
          <span role="button" tabindex="0" class="Yuze-img-studio-delete" data-delete-output-key="${escapeHtml(outputKey)}" title="删除这张结果">${iconSvg('close')}</span>
          <img alt="${escapeHtml(display.title)}" src="${escapeHtml(display.url)}">
          ${isRefinedDisplay ? '<em class="Yuze-img-studio-output-badge">微调展示</em>' : ''}
        </button>
        <div class="Yuze-img-studio-focus-meta">
          <div class="Yuze-img-studio-focus-title-row">
            <span>${escapeHtml(display.title)}</span>
            <span>${index + 1}/${state.outputs.length}</span>
          </div>
          <div class="Yuze-img-studio-focus-dots">
            ${state.outputs.map((item, itemIndex) => `<button type="button" class="Yuze-img-studio-focus-dot ${itemIndex === index ? 'is-active' : ''}" data-focus-output-index="${itemIndex}" title="显示第 ${itemIndex + 1} 张结果"></button>`).join('')}
          </div>
        </div>
      </div>
    `;
  }

  function renderResultBody() {
    return state.resultViewMode === 'focus' ? renderOutputFocus() : renderOutputList();
  }

  function renderResultColumn(title) {
    const isFocusMode = state.resultViewMode === 'focus';
    return `
      <div class="Yuze-img-studio-result-column ${state.generating ? 'has-generating' : ''} ${state.resultCollapsed ? 'is-collapsed' : ''} is-${escapeHtml(state.resultViewMode)}-mode">
        <div class="Yuze-img-studio-result-head">
          <button type="button" class="Yuze-img-studio-icon-button Yuze-img-studio-result-collapse" data-action="toggle-result" title="${state.resultCollapsed ? '展开结果列' : '收起结果列'}">${iconSvg(state.resultCollapsed ? 'chevronLeft' : 'chevronRight')}</button>
          <span class="Yuze-img-studio-result-title">${escapeHtml(title)}</span>
          <span class="Yuze-img-studio-result-tools">
            <button type="button" class="Yuze-img-studio-icon-button Yuze-img-studio-result-view-toggle" data-action="toggle-result-view" title="${isFocusMode ? '切换为列表模式' : '切换为大图模式'}">${iconSvg(isFocusMode ? 'layoutList' : 'focusImage')}</button>
            <span class="Yuze-img-studio-result-count">${state.outputs.length}</span>
          </span>
        </div>
        ${renderGeneratingCard()}
        <div class="Yuze-img-studio-output-list">${renderResultBody()}</div>
      </div>
    `;
  }

  function getDetachedResultWidth() {
    if (state.resultCollapsed) return 44;
    return state.resultViewMode === 'focus' ? 400 : 190;
  }

  function setResultFocusIndex(index) {
    if (!state.outputs.length) {
      state.resultFocusIndex = 0;
      return;
    }
    state.resultFocusIndex = Math.max(0, Math.min(Number(index) || 0, state.outputs.length - 1));
  }

  function stepResultFocus(delta) {
    if (!state.outputs.length || state.resultWheelLocked) return;
    const next = state.resultFocusIndex + (delta > 0 ? 1 : -1);
    const clamped = Math.max(0, Math.min(next, state.outputs.length - 1));
    if (clamped === state.resultFocusIndex) return;
    state.resultWheelLocked = true;
    setResultFocusIndex(clamped);
    renderDetachedResultPanel();
    window.setTimeout(() => {
      state.resultWheelLocked = false;
    }, 180);
  }

  function syncDetachedResultPanelPosition() {
    if (!state.panel) return;
    const resultPanel = document.getElementById(RESULT_PANEL_ID);
    const shouldShow = isGenerationTab() && state.panel.classList.contains('is-visible');
    const gap = 10;
    const margin = 20;
    const resultWidth = getDetachedResultWidth();

    if (!state.panelPosition) {
      state.panel.style.setProperty('right', shouldShow ? `${margin + resultWidth + gap}px` : `${margin}px`, 'important');
      state.panel.style.removeProperty('left');
    }

    if (!resultPanel) return;
    resultPanel.classList.toggle('is-visible', shouldShow);
    resultPanel.classList.toggle('is-collapsed', state.resultCollapsed);
    resultPanel.classList.toggle('is-result-expanding', state.resultRibbonMotion === 'expand');
    resultPanel.classList.toggle('is-result-collapsing', state.resultRibbonMotion === 'collapse');
    resultPanel.style.setProperty('width', `${resultWidth}px`, 'important');

    if (!shouldShow) return;
    const panelRect = state.panel.getBoundingClientRect();
    let left = panelRect.right + gap;
    if (left + resultWidth > window.innerWidth - 8) left = Math.max(8, panelRect.left - resultWidth - gap);
    resultPanel.style.setProperty('left', `${Math.round(left)}px`, 'important');
    resultPanel.style.setProperty('top', `${Math.round(panelRect.top)}px`, 'important');
    resultPanel.style.setProperty('height', `${Math.round(panelRect.height)}px`, 'important');
    resultPanel.style.setProperty('right', 'auto', 'important');
  }

  function bindResultPanelEvents(root) {
    if (!root) return;
    bindScrollGuards(root);
    root.querySelector('[data-action="toggle-result"]')?.addEventListener('click', () => {
      markRibbonMotion('result', state.resultCollapsed ? 'expand' : 'collapse');
      state.resultCollapsed = !state.resultCollapsed;
      renderDetachedResultPanel();
      syncDetachedResultPanelPosition();
    });
    root.querySelector('[data-action="toggle-result-view"]')?.addEventListener('click', () => {
      state.resultViewMode = state.resultViewMode === 'focus' ? 'list' : 'focus';
      clampResultFocusIndex();
      renderDetachedResultPanel();
      applyPanelPosition();
    });
    root.querySelector('.Yuze-img-studio-output-focus')?.addEventListener('wheel', (event) => {
      if (Math.abs(event.deltaY) < 8) return;
      event.preventDefault();
      event.stopPropagation();
      stepResultFocus(event.deltaY);
    }, { passive: false });
    root.querySelectorAll('[data-focus-output-index]').forEach(button => {
      button.addEventListener('click', (event) => {
        if (!button.classList.contains('Yuze-img-studio-focus-dot')) return;
        event.preventDefault();
        event.stopPropagation();
        setResultFocusIndex(Number(button.dataset.focusOutputIndex));
        renderDetachedResultPanel();
      });
    });
    root.querySelectorAll('[data-preview-url]').forEach(button => {
      button.addEventListener('click', () => openImagePreview(button.dataset.outputId));
    });
    root.querySelectorAll('[data-delete-output-key]').forEach(button => {
      const stop = (event) => {
        event.preventDefault();
        event.stopPropagation();
      };
      button.addEventListener('mousedown', stop, true);
      button.addEventListener('click', (event) => {
        stop(event);
        deleteOutputItem(button.dataset.deleteOutputKey);
      }, true);
      button.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        stop(event);
        deleteOutputItem(button.dataset.deleteOutputKey);
      }, true);
    });
  }

  function renderDetachedResultPanel() {
    if (!state.panel) return;
    let resultPanel = document.getElementById(RESULT_PANEL_ID);
    if (!resultPanel) {
      resultPanel = document.createElement('div');
      resultPanel.id = RESULT_PANEL_ID;
      resultPanel.setAttribute('role', 'complementary');
      resultPanel.setAttribute('aria-label', '生成结果');
      document.body.appendChild(resultPanel);
    }
    resultPanel.innerHTML = renderResultColumn('生成结果');
    bindResultPanelEvents(resultPanel);
    syncDetachedResultPanelPosition();
  }

  function deleteHistoryItem(id) {
    const targetId = String(id || '');
    if (!targetId) return;
    const wasSelected = state.selectedId === targetId;
    state.history = state.history.filter(item => item.id !== targetId);
    state.selectedHistoryIds = state.selectedHistoryIds.filter(itemId => itemId !== targetId);
    state.historyUploadDisabledIds = state.historyUploadDisabledIds.filter(itemId => itemId !== targetId);
    if (wasSelected) {
      state.selectedId = state.history[0]?.id || '';
      state.uploadedDataUrl = '';
      resetPromptDrafts();
    }
    saveHistory();
    renderPanel();
    applyPanelPosition();
  }

  function deleteOutputItem(key) {
    const targetKey = String(key || '');
    if (!targetKey) return;
    state.outputs = state.outputs.filter(output => getOutputKey(output) !== targetKey);
    delete state.outputBranches[targetKey];
    clampResultFocusIndex();
    saveOutputs();
    renderPanel();
    applyPanelPosition();
  }

  function getOutputById(outputId) {
    return state.outputs.find(output => getOutputKey(output) === outputId) || null;
  }

  function openImagePreview(outputId) {
    const output = getOutputById(String(outputId || ''));
    if (!output?.url) return;
    const display = getOutputDisplay(output);
    closeImagePreview();
    state.preview = {
      outputId: getOutputKey(output),
      activeUrl: display.url || output.url,
      activeTitle: display.title || output.title,
      prompt: ''
    };
    renderImagePreviewOverlay();
  }

  function openHistoryImagePreview(historyId) {
    const item = findHistoryItem(historyId);
    if (!item?.image) return;
    closeImagePreview();
    state.preview = {
      outputId: '',
      activeUrl: item.image,
      activeTitle: item.title || '历史图',
      prompt: '',
      readonly: true
    };
    renderImagePreviewOverlay();
  }

  function renderImagePreviewOverlay() {
    const preview = state.preview;
    if (!preview) return;
    const output = preview.outputId ? getOutputById(preview.outputId) : null;
    if (preview.outputId && !output) return;
    const imageUrl = preview.activeUrl || output?.url || '';
    if (!imageUrl) return;
    const title = preview.activeTitle || output?.title || '图片预览';
    const branches = output ? (state.outputBranches[preview.outputId] || []) : [];
    const isReadonly = Boolean(preview.readonly || !output);
    const existing = document.querySelector('.Yuze-img-preview-overlay');

    const overlay = existing || document.createElement('div');
    overlay.className = `Yuze-img-preview-overlay${existing ? ' is-visible' : ''}`;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', isReadonly ? '历史图片预览' : '生成结果预览');
    overlay.innerHTML = `
      <div class="Yuze-img-preview-card ${isReadonly ? 'is-readonly' : ''}">
        <button type="button" class="Yuze-img-preview-close" aria-label="关闭预览">${iconSvg('close')}</button>
        <div class="Yuze-img-preview-main">
          <img alt="${escapeHtml(title)}" src="${escapeHtml(imageUrl)}">
          <div class="Yuze-img-preview-caption">${escapeHtml(title)}</div>
        </div>
        ${isReadonly ? '' : `
        <aside class="Yuze-img-preview-side">
          <div>
            <p class="Yuze-img-preview-side-title">基于此图微调</p>
            <p class="Yuze-img-preview-side-subtitle">输入修改意图，结果只保存在当前图片右侧。</p>
          </div>
          <div class="Yuze-img-preview-history">
            <div class="Yuze-img-preview-history-head">
              <span>微调结果</span>
              <span class="Yuze-img-preview-history-count">${branches.length}</span>
            </div>
            ${state.refining === preview.outputId ? `
              <div class="Yuze-img-studio-generating-card" aria-live="polite">
                <div class="Yuze-img-studio-generating-frame"></div>
                <div class="Yuze-img-studio-generating-caption">
                  <span>微调生成中</span>
                  <span class="Yuze-img-studio-streaming-dots"><i></i><i></i><i></i></span>
                </div>
              </div>
            ` : ''}
            ${branches.length ? branches.map(item => {
              const isDisplayed = output?.displayBranchId === item.id;
              return `
              <div class="Yuze-img-preview-branch-card">
                <button type="button" class="Yuze-img-preview-branch ${isDisplayed ? 'is-active' : ''}" data-preview-branch-id="${escapeHtml(item.id)}">
                <img alt="${escapeHtml(item.title)}" src="${escapeHtml(item.url)}">
                <span>${escapeHtml(item.prompt || item.title)}</span>
                </button>
                <button type="button" class="Yuze-img-preview-branch-action ${isDisplayed ? 'is-active' : ''}" data-toggle-result-branch-id="${escapeHtml(item.id)}">
                  ${isDisplayed ? iconSvg('check') : iconSvg('image')}${isDisplayed ? '取消结果列展示' : '展示到结果列'}
                </button>
              </div>
            `;
            }).join('') : '<div class="Yuze-img-preview-empty">微调生成的图片会出现在这里。</div>'}
          </div>
          <div class="Yuze-img-preview-composer">
            <textarea class="Yuze-img-preview-refine-textarea" data-action="preview-refine-prompt" placeholder="描述这次要改哪里，例如：中间变成一个房子，背景更干净，光线更柔和">${escapeHtml(preview.prompt || '')}</textarea>
            <div class="Yuze-img-preview-composer-actions">
              <span class="Yuze-img-preview-composer-hint">文本微调</span>
              <button type="button" class="Yuze-img-studio-primary ${state.refining === preview.outputId ? 'is-loading' : ''}" data-action="preview-generate" ${state.refining ? 'disabled' : ''}>${iconSvg('sparkle')}${state.refining === preview.outputId ? '生成中...' : '生成'}</button>
            </div>
          </div>
        </aside>
        `}
      </div>
    `;

    const onKeydown = (event) => {
      if (event.key === 'Escape') closeImagePreview();
    };
    if (!existing) {
      overlay.__YuzeKeydown = onKeydown;
      overlay.addEventListener('click', (event) => {
        if (event.target === overlay) closeImagePreview();
      });
      document.addEventListener('keydown', onKeydown, true);
      document.body.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add('is-visible'));
    }
    bindPreviewEvents(overlay);
  }

  function closeImagePreview() {
    const overlay = document.querySelector('.Yuze-img-preview-overlay');
    if (!overlay) return;
    if (overlay.__YuzeKeydown) document.removeEventListener('keydown', overlay.__YuzeKeydown, true);
    state.preview = null;
    state.refining = null;
    overlay.classList.remove('is-visible');
    window.setTimeout(() => overlay.remove(), 180);
  }

  function bindPreviewEvents(overlay) {
    bindScrollGuards(overlay);
    overlay.querySelector('.Yuze-img-preview-close')?.addEventListener('click', closeImagePreview);
    overlay.querySelector('[data-action="preview-refine-prompt"]')?.addEventListener('input', (event) => {
      if (state.preview) state.preview.prompt = event.target.value;
    });
    overlay.querySelector('[data-action="preview-generate"]')?.addEventListener('click', generateRefineFromPreview);
    overlay.querySelectorAll('[data-preview-branch-id]').forEach(button => {
      button.addEventListener('click', () => {
        const branches = state.outputBranches[state.preview?.outputId] || [];
        const item = branches.find(branch => branch.id === button.dataset.previewBranchId);
        if (!item || !state.preview) return;
        state.preview.activeUrl = item.url;
        state.preview.activeTitle = item.title;
        renderImagePreviewOverlay();
      });
    });
    overlay.querySelectorAll('[data-toggle-result-branch-id]').forEach(button => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!state.preview?.outputId) return;
        toggleOutputDisplayBranch(state.preview.outputId, button.dataset.toggleResultBranchId);
      });
    });
  }

  function renderPromptPane(item) {
    const prompt = item?.prompt || '';
    const stylePrompt = item?.stylePrompt || buildFallbackStylePrompt(prompt);
    const negative = item?.negativePrompt || '';
    const isAnalyzing = item?.status === 'analyzing';
    const disableActions = !item || isAnalyzing || item.status === 'error';
    return `
      <div class="Yuze-img-studio-pane Yuze-img-studio-pane-grid ${state.activeTab === 'prompt' ? 'is-active' : ''}" data-pane="prompt">
        <div class="Yuze-img-studio-section">
          ${renderPreview(item)}
          <label class="Yuze-img-studio-upload Yuze-img-studio-prompt-upload">
            <input type="file" accept="image/*" hidden data-action="upload-prompt-image">
            ${iconSvg('image')}
            <span>上传图片提取 Prompt</span>
          </label>
          <div class="Yuze-img-studio-field">
            <div class="Yuze-img-studio-field-head">
              <label>完整复现 Prompt</label>
              ${isAnalyzing ? `<span class="Yuze-img-studio-streaming-status">${iconSvg('sparkle')}<span class="Yuze-img-studio-streaming-copy">${prompt ? 'Prompt 正在流式输出' : '正在读取图片风格'}</span><span class="Yuze-img-studio-streaming-dots"><i></i><i></i><i></i></span></span>` : ''}
            </div>
            <textarea class="Yuze-img-studio-prompt-textarea ${isAnalyzing ? 'is-streaming' : ''}" data-prompt-kind="recreate" placeholder="识别后的完整复现 Prompt 会出现在这里" ${isAnalyzing ? 'readonly' : ''}>${escapeHtml(prompt)}</textarea>
          </div>
          <div class="Yuze-img-studio-field">
            <label>纯风格 Prompt</label>
            <textarea class="Yuze-img-studio-small-textarea" data-prompt-kind="style" placeholder="只保留风格，不限定具体主体" ${isAnalyzing ? 'readonly' : ''}>${escapeHtml(stylePrompt)}</textarea>
          </div>
          <div class="Yuze-img-studio-field">
            <label>避免项</label>
            <textarea class="Yuze-img-studio-small-textarea" data-role="negative" placeholder="低清晰度, 水印, 杂乱背景" ${isAnalyzing ? 'readonly' : ''}>${escapeHtml(negative)}</textarea>
          </div>
          <div class="Yuze-img-studio-actions">
            <button type="button" class="Yuze-img-studio-secondary" data-action="copy-prompt" data-copy-kind="recreate" ${disableActions ? 'disabled' : ''}>${iconSvg('copy')}复制完整</button>
            <button type="button" class="Yuze-img-studio-secondary" data-action="copy-prompt" data-copy-kind="style" ${disableActions ? 'disabled' : ''}>${iconSvg('copy')}复制风格</button>
            <button type="button" class="Yuze-img-studio-primary" data-action="tab-t2i" ${disableActions ? 'disabled' : ''}>${iconSvg('sparkle')}去文生图</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderTextToImagePane(item) {
    const kind = getPromptKind('t2i');
    const draftKey = getPromptDraftKey('t2i', kind);
    const prompt = getPromptDraft(draftKey, getGenerationFallbackPrompt('t2i', item));
    const isGenerating = state.generating?.mode === 't2i';
    const disableGenerate = isGenerating || !item || item.status === 'analyzing' || item.status === 'error';
    return `
      <div class="Yuze-img-studio-pane Yuze-img-studio-pane-grid ${state.activeTab === 't2i' ? 'is-active' : ''}" data-pane="t2i">
        <div class="Yuze-img-studio-section">
          ${renderPreview(item)}
          <div class="Yuze-img-studio-field">
            <div class="Yuze-img-studio-field-head">
              <label>文生图 Prompt</label>
              ${renderPromptKindControl('t2i')}
            </div>
            <textarea class="Yuze-img-studio-prompt-textarea" data-role="main-prompt" data-draft-key="${escapeHtml(draftKey)}" placeholder="使用识别出的 Prompt，或直接改成你的创作描述">${escapeHtml(prompt)}</textarea>
          </div>
          <div class="Yuze-img-studio-actions">
            <button type="button" class="Yuze-img-studio-secondary" data-action="copy-prompt">${iconSvg('copy')}复制</button>
            <button type="button" class="Yuze-img-studio-primary ${isGenerating ? 'is-loading' : ''}" data-action="generate-t2i" ${disableGenerate ? 'disabled' : ''}>${iconSvg('sparkle')}${isGenerating ? '生成中...' : '生成同风格图'}</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderImageToImagePane(item) {
    const kind = getPromptKind('i2i');
    const draftKey = getPromptDraftKey('i2i', kind);
    const prompt = getPromptDraft(draftKey, getGenerationFallbackPrompt('i2i', item));
    const isGenerating = state.generating?.mode === 'i2i';
    const disableGenerate = isGenerating || !item || item.status === 'analyzing' || item.status === 'error';
    return `
      <div class="Yuze-img-studio-pane Yuze-img-studio-pane-grid ${state.activeTab === 'i2i' ? 'is-active' : ''}" data-pane="i2i">
        <div class="Yuze-img-studio-section">
          ${renderPreview(item)}
          <label class="Yuze-img-studio-upload">
            <input type="file" accept="image/*" hidden data-action="upload-reference">
            ${state.uploadedDataUrl
              ? `<img alt="上传参考图" src="${escapeHtml(state.uploadedDataUrl)}">`
              : '<span>上传自己的图片，可把人物/产品带入已识别风格；不上传则基于左侧历史图做图生图。</span>'}
          </label>
          <div class="Yuze-img-studio-field">
            <div class="Yuze-img-studio-field-head">
              <label>图生图 Prompt</label>
              ${renderPromptKindControl('i2i')}
            </div>
            <textarea class="Yuze-img-studio-prompt-textarea" data-role="main-prompt" data-draft-key="${escapeHtml(draftKey)}" placeholder="描述你希望如何迁移风格或保留主体">${escapeHtml(prompt)}</textarea>
          </div>
          <div class="Yuze-img-studio-actions">
            <button type="button" class="Yuze-img-studio-secondary" data-action="clear-upload">${iconSvg('close')}清除上传</button>
            <button type="button" class="Yuze-img-studio-primary ${isGenerating ? 'is-loading' : ''}" data-action="generate-i2i" ${disableGenerate ? 'disabled' : ''}>${iconSvg('image')}${isGenerating ? '生成中...' : '图生图'}</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderFusionPromptField(tab, label, draftKey, prompt) {
    const collapsed = state.fusionPromptCollapsed;
    return `
      <div class="Yuze-img-studio-field Yuze-img-studio-fusion-prompt ${collapsed ? 'is-collapsed' : ''}">
        <div class="Yuze-img-studio-field-head">
          <label>${escapeHtml(label)}</label>
          <div class="Yuze-img-studio-field-tools">
            ${renderPromptKindControl(tab)}
            <button type="button" class="Yuze-img-studio-mini-toggle ${collapsed ? 'is-active' : ''}" data-action="toggle-fusion-prompt" title="${collapsed ? '展开 Prompt' : '收起 Prompt'}">${iconSvg(collapsed ? 'chevronRight' : 'chevronLeft')}</button>
          </div>
        </div>
        <textarea class="Yuze-img-studio-prompt-textarea" data-role="main-prompt" data-draft-key="${escapeHtml(draftKey)}" placeholder="选择多张历史图后自动组合风格 Prompt">${escapeHtml(prompt)}</textarea>
      </div>
    `;
  }

  function renderMultiTextToImagePane() {
    const selected = getSelectedHistoryItems();
    const kind = getPromptKind('multiT2i');
    const draftKey = getPromptDraftKey('multiT2i', kind);
    const prompt = getPromptDraft(draftKey, getGenerationFallbackPrompt('multiT2i'));
    const isGenerating = state.generating?.mode === 'multiT2i';
    const disableGenerate = isGenerating || selected.length < 2;
    return `
      <div class="Yuze-img-studio-pane Yuze-img-studio-pane-grid ${state.activeTab === 'multiT2i' ? 'is-active' : ''}" data-pane="multiT2i">
        <div class="Yuze-img-studio-section">
          ${renderSelectedHistoryStrip(selected)}
          ${renderFusionPromptField('multiT2i', '融合文生图 Prompt', draftKey, prompt)}
          <div class="Yuze-img-studio-actions">
            <button type="button" class="Yuze-img-studio-secondary" data-action="copy-prompt" ${selected.length < 2 ? 'disabled' : ''}>${iconSvg('copy')}复制</button>
            <button type="button" class="Yuze-img-studio-primary ${isGenerating ? 'is-loading' : ''}" data-action="generate-multi-t2i" ${disableGenerate ? 'disabled' : ''}>${iconSvg('sparkle')}${isGenerating ? '生成中...' : '融合文生图'}</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderMultiImageToImagePane() {
    const selected = getSelectedHistoryItems();
    const kind = getPromptKind('multiI2i');
    const draftKey = getPromptDraftKey('multiI2i', kind);
    const prompt = getPromptDraft(draftKey, getGenerationFallbackPrompt('multiI2i'));
    const isGenerating = state.generating?.mode === 'multiI2i';
    const disableGenerate = isGenerating || selected.length < 2;
    return `
      <div class="Yuze-img-studio-pane Yuze-img-studio-pane-grid ${state.activeTab === 'multiI2i' ? 'is-active' : ''}" data-pane="multiI2i">
        <div class="Yuze-img-studio-section">
          ${renderSelectedHistoryStrip(selected)}
          <label class="Yuze-img-studio-upload">
            <input type="file" accept="image/*" hidden data-action="upload-reference">
            ${state.uploadedDataUrl
              ? `<img alt="上传参考图" src="${escapeHtml(state.uploadedDataUrl)}">`
              : '<span>可上传主体图；不上传则以已选历史图中的第一张作为图生图基底，并融合其余历史风格。</span>'}
          </label>
          ${renderFusionPromptField('multiI2i', '融合图生图 Prompt', draftKey, prompt)}
          <div class="Yuze-img-studio-actions">
            <button type="button" class="Yuze-img-studio-secondary" data-action="clear-upload">${iconSvg('close')}清除上传</button>
            <button type="button" class="Yuze-img-studio-primary ${isGenerating ? 'is-loading' : ''}" data-action="generate-multi-i2i" ${disableGenerate ? 'disabled' : ''}>${iconSvg('image')}${isGenerating ? '生成中...' : '融合图生图'}</button>
          </div>
        </div>
      </div>
    `;
  }

  function buildImageToImagePrompt(basePrompt, hasUpload) {
    if (hasUpload) {
      return [
        '参考第一张图的画面风格、光影、色彩、构图节奏和图片质感。',
        '将第二张上传图片中的主体自然融入同样视觉风格，保持主体身份和关键细节。',
        basePrompt
      ].filter(Boolean).join('\n');
    }
    return [
      '基于当前历史图片进行图生图，保留原图风格、构图、光影和色彩气质。',
      basePrompt
    ].filter(Boolean).join('\n');
  }

  function renderActivePane(item) {
    if (state.activeTab === 't2i') return renderTextToImagePane(item);
    if (state.activeTab === 'i2i') return renderImageToImagePane(item);
    if (state.activeTab === 'multiT2i') return renderMultiTextToImagePane();
    if (state.activeTab === 'multiI2i') return renderMultiImageToImagePane();
    return renderPromptPane(item);
  }

  function getHistoryScrollTop() {
    return state.panel?.querySelector('.Yuze-img-studio-history-list')?.scrollTop || 0;
  }

  function restoreHistoryScrollTop(scrollTop) {
    if (scrollTop == null) return;
    const restore = () => {
      const list = state.panel?.querySelector('.Yuze-img-studio-history-list');
      if (list) list.scrollTop = scrollTop;
    };
    restore();
    window.requestAnimationFrame(restore);
  }

  function renderPanel(options = {}) {
    if (!state.panel) return;
    const historyScrollTop = options.preserveHistoryScroll ? getHistoryScrollTop() : null;
    ensureFusionSelection();
    const item = getSelectedItem();
    const isPromptMode = state.activeTab === 'prompt';
    state.panel.classList.toggle('is-prompt-mode', isPromptMode);
    state.panel.classList.toggle('is-history-collapsed', state.historyCollapsed);
    const shellClasses = [
      'Yuze-img-studio-shell',
      state.historyCollapsed ? 'is-history-collapsed' : '',
      state.historyRibbonMotion ? `is-history-${state.historyRibbonMotion === 'expand' ? 'expanding' : 'collapsing'}` : ''
    ].filter(Boolean).join(' ');
    state.panel.innerHTML = `
      <div class="Yuze-img-studio-header">
        <div>
          <h2 class="Yuze-img-studio-title">图片 Prompt Studio · 日志版</h2>
        </div>
        <button type="button" class="Yuze-img-studio-close" data-action="close" aria-label="关闭">${iconSvg('close')}</button>
      </div>
      <div class="${shellClasses}">
        <aside class="Yuze-img-studio-history">
          <div class="Yuze-img-studio-history-head">
            <span class="Yuze-img-studio-history-title">历史</span>
            <button type="button" class="Yuze-img-studio-icon-button" data-action="clear-history" title="清空历史">${iconSvg('close')}</button>
          </div>
          <button type="button" class="Yuze-img-studio-history-side-toggle" data-action="toggle-history" title="${state.historyCollapsed ? '展开历史列' : '收起历史列'}">${iconSvg(state.historyCollapsed ? 'chevronRight' : 'chevronLeft')}</button>
          <div class="Yuze-img-studio-history-rail">历史 ${state.history.length}</div>
          <div class="Yuze-img-studio-history-list">${renderHistoryList()}</div>
        </aside>
        <main class="Yuze-img-studio-main">
          <div class="Yuze-img-studio-tabs">
            <button type="button" class="Yuze-img-studio-tab ${state.activeTab === 'prompt' ? 'is-active' : ''}" data-tab="prompt">Prompt</button>
            <button type="button" class="Yuze-img-studio-tab ${state.activeTab === 't2i' ? 'is-active' : ''}" data-tab="t2i">文生图</button>
            <button type="button" class="Yuze-img-studio-tab ${state.activeTab === 'i2i' ? 'is-active' : ''}" data-tab="i2i">图生图</button>
            <button type="button" class="Yuze-img-studio-tab ${state.activeTab === 'multiT2i' ? 'is-active' : ''}" data-tab="multiT2i">融合文生图</button>
            <button type="button" class="Yuze-img-studio-tab ${state.activeTab === 'multiI2i' ? 'is-active' : ''}" data-tab="multiI2i">融合图生图</button>
          </div>
          <div class="Yuze-img-studio-content">
            ${renderActivePane(item)}
          </div>
        </main>
      </div>
      <button type="button" class="Yuze-img-studio-resize-handle" data-action="resize-panel" aria-label="调整浮窗高度" title="拖动调整浮窗高度"></button>
    `;
    bindPanelEvents();
    renderDetachedResultPanel();
    restoreHistoryScrollTop(historyScrollTop);
  }

  function switchTab(tab) {
    if (tab !== state.activeTab) resetPromptDrafts();
    state.activeTab = tab;
    ensureFusionSelection();
    renderPanel();
    applyPanelPosition();
  }

  function bindPanelEvents() {
    const panel = state.panel;
    if (!panel) return;
    bindScrollGuards(panel);
    panel.querySelector('.Yuze-img-studio-header')?.addEventListener('mousedown', startPanelDrag);
    panel.querySelector('[data-action="resize-panel"]')?.addEventListener('mousedown', startPanelResize);
    panel.querySelectorAll('.Yuze-img-studio-prompt-textarea').forEach(textarea => {
      textarea.addEventListener('input', () => {
        state.promptDrafts[textarea.dataset.draftKey || getPromptDraftKey()] = textarea.value;
      });
    });
    panel.querySelectorAll('[data-prompt-kind]').forEach(textarea => {
      textarea.addEventListener('input', () => {
        const kind = textarea.dataset.promptKind;
        if (!state.selectedId || (kind !== 'recreate' && kind !== 'style')) return;
        updateHistoryItem(
          state.selectedId,
          kind === 'style' ? { stylePrompt: textarea.value } : { prompt: textarea.value },
          { persist: true, sync: false }
        );
      });
    });
    panel.querySelectorAll('[data-action="prompt-kind"]').forEach(button => {
      button.addEventListener('click', () => {
        rememberActivePromptDraft();
        const kind = button.dataset.kind === 'recreate' ? 'recreate' : 'style';
        state.promptKindByTab[state.activeTab] = kind;
        clearTabDrafts(state.activeTab);
        renderPanel({ preserveHistoryScroll: true });
        applyPanelPosition();
      });
    });
    panel.querySelector('[data-action="toggle-selected-history-view"]')?.addEventListener('click', toggleSelectedHistoryViewMode);
    panel.querySelector('[data-action="toggle-fusion-prompt"]')?.addEventListener('click', toggleFusionPromptCollapsed);
    panel.querySelectorAll('[data-tab]').forEach(button => {
      button.addEventListener('click', () => switchTab(button.dataset.tab));
    });
    panel.querySelector('[data-action="toggle-history"]')?.addEventListener('click', () => {
      markRibbonMotion('history', state.historyCollapsed ? 'expand' : 'collapse');
      state.historyCollapsed = !state.historyCollapsed;
      renderPanel();
      applyPanelPosition();
    });
    panel.querySelectorAll('[data-history-id]').forEach(button => {
      button.addEventListener('click', () => {
        if (isFusionTab()) {
          toggleHistorySelection(button.dataset.historyId);
          return;
        }
        state.selectedId = button.dataset.historyId || '';
        state.uploadedDataUrl = '';
        resetPromptDrafts();
        renderPanel({ preserveHistoryScroll: true });
        applyPanelPosition();
      });
    });
    panel.querySelectorAll('[data-preview-history-id]').forEach(button => {
      button.addEventListener('click', () => openHistoryImagePreview(button.dataset.previewHistoryId));
    });
    panel.querySelectorAll('[data-toggle-history-upload-id]').forEach(button => {
      const stop = (event) => {
        event.preventDefault();
        event.stopPropagation();
      };
      button.addEventListener('mousedown', stop, true);
      button.addEventListener('click', (event) => {
        stop(event);
        toggleHistoryUpload(button.dataset.toggleHistoryUploadId);
      }, true);
      button.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        stop(event);
        toggleHistoryUpload(button.dataset.toggleHistoryUploadId);
      }, true);
    });
    panel.querySelectorAll('[data-delete-history-id]').forEach(button => {
      const stop = (event) => {
        event.preventDefault();
        event.stopPropagation();
      };
      button.addEventListener('mousedown', stop, true);
      button.addEventListener('click', (event) => {
        stop(event);
        deleteHistoryItem(button.dataset.deleteHistoryId);
      }, true);
      button.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        stop(event);
        deleteHistoryItem(button.dataset.deleteHistoryId);
      }, true);
    });
    panel.querySelectorAll('[data-retry-history-id]').forEach(button => {
      const stop = (event) => {
        event.preventDefault();
        event.stopPropagation();
      };
      button.addEventListener('mousedown', stop, true);
      button.addEventListener('click', (event) => {
        stop(event);
        retryHistoryAnalysis(button.dataset.retryHistoryId);
      }, true);
      button.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        stop(event);
        retryHistoryAnalysis(button.dataset.retryHistoryId);
      }, true);
    });
    panel.querySelector('[data-action="close"]')?.addEventListener('click', closePanel);
    panel.querySelector('[data-action="clear-history"]')?.addEventListener('click', () => {
      state.history = [];
      state.selectedId = '';
      state.selectedHistoryIds = [];
      state.historyUploadDisabledIds = [];
      state.uploadedDataUrl = '';
      resetPromptDrafts();
      saveHistory();
      renderPanel();
      applyPanelPosition();
    });
    panel.querySelectorAll('[data-action="copy-prompt"]').forEach(button => {
      button.addEventListener('click', async () => {
        const copyKind = button.dataset.copyKind;
        const item = getSelectedItem();
        const prompt = copyKind
          ? (state.panel?.querySelector(`[data-prompt-kind="${copyKind}"]`)?.value || getPromptText(item, copyKind))
          : getSelectedPrompt();
        if (!prompt) return;
        try {
          if (!navigator.clipboard?.writeText) throw new Error('当前页面不支持 Clipboard API');
          await navigator.clipboard.writeText(prompt);
          button.textContent = '已复制';
          window.setTimeout(() => {
            renderPanel();
            applyPanelPosition();
          }, 700);
        } catch (error) {
          reportStudioError('复制 Prompt', error, {
            copyKind: copyKind || 'current',
            promptLength: prompt.length,
            itemId: item?.id || ''
          });
        }
      });
    });
    panel.querySelector('[data-action="tab-t2i"]')?.addEventListener('click', () => switchTab('t2i'));
    panel.querySelector('[data-action="generate-t2i"]')?.addEventListener('click', () => generateImageFromPanel('t2i'));
    panel.querySelector('[data-action="generate-i2i"]')?.addEventListener('click', () => generateImageFromPanel('i2i'));
    panel.querySelector('[data-action="generate-multi-t2i"]')?.addEventListener('click', () => generateImageFromPanel('multiT2i'));
    panel.querySelector('[data-action="generate-multi-i2i"]')?.addEventListener('click', () => generateImageFromPanel('multiI2i'));
    panel.querySelector('[data-action="clear-upload"]')?.addEventListener('click', () => {
      state.uploadedDataUrl = '';
      delete state.promptDrafts.i2i;
      clearTabDrafts('multiI2i');
      renderPanel();
      applyPanelPosition();
    });
    panel.querySelector('[data-action="upload-prompt-image"]')?.addEventListener('change', async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      await enqueueUploadedPromptAnalysis(file);
      event.target.value = '';
    });
    panel.querySelector('[data-action="upload-reference"]')?.addEventListener('change', async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        state.uploadedDataUrl = await readFileAsDataUrl(file);
        delete state.promptDrafts.i2i;
        clearTabDrafts('multiI2i');
      } catch (error) {
        reportStudioError('读取生成参考图', error, {
          fileName: file?.name || '',
          fileType: file?.type || '',
          fileSize: file?.size || 0
        });
        state.uploadedDataUrl = '';
        delete state.promptDrafts.i2i;
        clearTabDrafts('multiI2i');
      }
      renderPanel();
      applyPanelPosition();
    });
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error || new Error('图片读取失败'));
      reader.readAsDataURL(file);
    });
  }

  function pushOutputs(urls, title) {
    const newOutputs = urls.filter(Boolean).slice(0, 1).map(url => ({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      url,
      title,
      createdAt: new Date().toISOString()
    }));
    state.outputs = [...newOutputs, ...state.outputs].slice(0, config.maxOutputs);
    state.resultFocusIndex = 0;
    newOutputs.forEach(output => {
      const key = getOutputKey(output);
      if (!state.outputBranches[key]) state.outputBranches[key] = [];
    });
    saveOutputs();
    renderPanel();
    applyPanelPosition();
  }

  async function generateRefineFromPreview() {
    const preview = state.preview;
    if (!preview || state.refining) return;
    const prompt = cleanText(preview.prompt);
    if (!prompt) return;
    if (!config.mockBridge && (!window.LLMBridge || typeof window.LLMBridge.generateImage !== 'function')) {
      reportStudioError('微调生成图片', new Error('当前页面未检测到 LLMBridge.generateImage，请在 Yuze 脚本环境运行'), {
        outputId: preview.outputId,
        hasGenerateBridge: false
      });
      return;
    }

    state.refining = preview.outputId;
    renderImagePreviewOverlay();

    let result = null;
    try {
      if (config.mockBridge) {
        await sleep(Math.min(config.mockGenerationDelayMs, 1800));
        result = { success: true, image_urls: [preview.activeUrl] };
      } else {
        const reference = getReferenceFromSource(preview.activeUrl);
        result = await callBridgeWithAuthRetry(() => window.LLMBridge.generateImage(prompt, {
          ...buildReferenceOptions(reference ? [reference] : []),
          aspect_ratio: getSelectedItem()?.ratio || '3:4',
          output_format: 'png',
          watermark: false
        }), '图片微调', config.generationTimeoutMs);
      }

      if (!result?.success) throw new Error(result?.error_message || '生成失败');
      const url = result.image_urls?.[0] || result.image_url || '';
      if (!url) throw new Error('生成成功但没有返回图片 URL');
      const branch = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        url,
        title: '微调结果',
        prompt,
        createdAt: new Date().toISOString()
      };
      state.outputBranches[preview.outputId] = [branch, ...(state.outputBranches[preview.outputId] || [])].slice(0, 12);
      saveOutputs();
      state.preview = {
        ...preview,
        activeUrl: url,
        activeTitle: branch.title,
        prompt: ''
      };
    } catch (error) {
      reportStudioError('微调生成图片', error, {
        outputId: preview.outputId,
        promptLength: prompt.length,
        hasReferenceImage: Boolean(preview.activeUrl),
        timeoutMs: config.generationTimeoutMs,
        bridgeResponse: result
      });
    } finally {
      state.refining = null;
      renderImagePreviewOverlay();
    }
  }

  async function generateImageFromPanel(mode) {
    const item = getSelectedItem();
    const selectedItems = mode === 'multiT2i' || mode === 'multiI2i' ? getSelectedHistoryItems() : [];
    const prompt = getSelectedPrompt();
    if (!prompt) {
      setPanelMessage('没有可用 Prompt，请先分析一张图片。');
      return;
    }
    if ((mode === 'multiT2i' || mode === 'multiI2i') && selectedItems.length < 2) {
      setPanelMessage('请至少选择 2 张历史图再融合生成。');
      return;
    }
    if (state.generating) return;
    if (!config.mockBridge && (!window.LLMBridge || typeof window.LLMBridge.generateImage !== 'function')) {
      const error = new Error('当前页面未检测到 LLMBridge.generateImage，请在 Yuze 脚本环境运行');
      setPanelMessage(`${error.message}。`);
      reportStudioError('生成图片', error, {
        mode,
        itemId: item?.id || '',
        selectedItemCount: selectedItems.length,
        hasGenerateBridge: false
      });
      return;
    }

    state.generating = { mode, startedAt: Date.now() };
    renderPanel();
    applyPanelPosition();

    let result = null;
    try {
      if (config.mockBridge) {
        await sleep(config.mockGenerationDelayMs);
        const sourceItems = mode === 'i2i' ? (item ? [item] : []) : selectedItems;
        const image = state.uploadedDataUrl || getUploadEnabledHistoryItems(sourceItems)[0]?.image || 'https://picsum.photos/512/512';
        result = { success: true, image_urls: [image] };
      } else if (mode === 'i2i' || mode === 'multiI2i' || mode === 'multiT2i') {
        const refs = [];
        const sourceItems = mode === 'i2i' ? [item] : selectedItems;
        getUploadEnabledHistoryItems(sourceItems).forEach(sourceItem => {
          const itemRef = getReferenceFromSource(sourceItem?.image || '');
          if (itemRef) refs.push(itemRef);
        });
        const uploadRef = getReferenceFromSource(state.uploadedDataUrl);
        if (uploadRef) refs.push(uploadRef);
        const options = buildReferenceOptions(refs);
        result = await callBridgeWithAuthRetry(() => window.LLMBridge.generateImage(prompt, {
          ...options,
          aspect_ratio: sourceItems[0]?.ratio || item?.ratio || '3:4',
          output_format: 'png',
          watermark: false
        }), '图片生成', config.generationTimeoutMs);
      } else {
        result = await callBridgeWithAuthRetry(() => window.LLMBridge.generateImage(prompt, {
          aspect_ratio: item?.ratio || '3:4',
          output_format: 'png',
          watermark: false
        }), '图片生成', config.generationTimeoutMs);
      }

      if (!result?.success) throw new Error(result?.error_message || '生成失败');
      const urls = result.image_urls || (result.image_url ? [result.image_url] : []);
      if (!urls.length) throw new Error('生成成功但没有返回图片 URL');
      const titleMap = {
        i2i: '图生图结果',
        multiT2i: '融合文生图结果',
        multiI2i: '融合图生图结果'
      };
      pushOutputs(urls, titleMap[mode] || '文生图结果');
    } catch (error) {
      reportStudioError('生成图片', error, {
        mode,
        itemId: item?.id || '',
        selectedItemCount: selectedItems.length,
        promptLength: prompt.length,
        hasUploadedReference: Boolean(state.uploadedDataUrl),
        timeoutMs: config.generationTimeoutMs,
        bridgeResponse: result
      });
      setPanelMessage(error?.message || '生成失败，请稍后再试。');
      renderPanel();
    } finally {
      state.generating = null;
      renderPanel();
      applyPanelPosition();
    }
  }

  function isStudioUnexpectedError(error, filename = '') {
    if (error && typeof error === 'object' && state.reportedErrors.has(error)) return false;
    const stack = String(error?.stack || '');
    const source = `${filename}\n${stack}`;
    if (/universal_image_prompt_studio(?:_log)?_button(?:\.min)?\.js/i.test(source)) return true;
    if (/(analyzeJob|processAnalysisQueue|generateImageFromPanel|generateRefineFromPreview|renderPanel|enqueueUploadedPromptAnalysis)/.test(stack)) return true;
    return Boolean(state.analysisRunning || state.generating || state.refining);
  }

  function handleStudioWindowError(event) {
    const error = event?.error || new Error(event?.message || '未捕获的脚本错误');
    if (!isStudioUnexpectedError(error, event?.filename || '')) return;
    reportStudioError('脚本未捕获异常', error, {
      filename: event?.filename || '',
      line: event?.lineno || 0,
      column: event?.colno || 0
    });
  }

  function handleStudioUnhandledRejection(event) {
    const error = event?.reason instanceof Error
      ? event.reason
      : new Error(getErrorText(event?.reason) || '未处理的 Promise 拒绝');
    if (!isStudioUnexpectedError(error)) return;
    reportStudioError('未处理的异步异常', error, {
      reason: event?.reason
    });
  }

  function startObserver() {
    state.observer = new MutationObserver(scheduleScan);
    state.observer.observe(document.documentElement || document.body, {
      childList: true,
      subtree: true
    });
    window.addEventListener('scroll', syncPinterestFloatingHosts, true);
    window.addEventListener('resize', syncPinterestFloatingHosts, true);
    window.addEventListener('resize', applyPanelPosition, true);
    window.addEventListener('error', handleStudioWindowError);
    window.addEventListener('unhandledrejection', handleStudioUnhandledRejection);
  }

  function cleanup() {
    window.clearTimeout(state.scanTimer);
    state.observer?.disconnect();
    window.removeEventListener('scroll', syncPinterestFloatingHosts, true);
    window.removeEventListener('resize', syncPinterestFloatingHosts, true);
    window.removeEventListener('resize', applyPanelPosition, true);
    window.removeEventListener('error', handleStudioWindowError);
    window.removeEventListener('unhandledrejection', handleStudioUnhandledRejection);
    state.analysisQueue = [];
    state.analysisRunning = false;
    state.generating = null;
    state.refining = null;
    state.preview = null;
    Object.values(state.ribbonTimers).forEach(timer => window.clearTimeout(timer));
    state.ribbonTimers = {};
    state.floatingHosts.forEach(entry => entry.host.remove());
    state.floatingHosts.clear();
    closeImagePreview();
    document.getElementById(STYLE_ID)?.remove();
    document.getElementById(PANEL_ID)?.remove();
    document.getElementById(RESULT_PANEL_ID)?.remove();
    document.getElementById(LAUNCHER_ID)?.remove();
    document.getElementById(ERROR_DIALOG_ID)?.remove();
    document.querySelectorAll(`.${HOST_CLASS}`).forEach(el => el.remove());
    document.querySelectorAll(`.${STATUS_CLASS}`).forEach(el => el.remove());
    document.querySelectorAll('.Yuze-img-dock-sprite,.Yuze-img-dock-particle').forEach(el => el.remove());
    document.querySelectorAll(`[${PROCESSED_ATTR}]`).forEach(el => el.removeAttribute(PROCESSED_ATTR));
    delete window[CLEANUP_KEY];
  }

  function init() {
    window[CLEANUP_KEY] = cleanup;
    injectStyle();
    loadHistory();
    loadOutputs();
    createLauncher();
    scanCards();
    startObserver();
  }

  try {
    init();
  } catch (error) {
    reportStudioError('初始化日志专用版', error, {
      readyState: document.readyState,
      hasBody: Boolean(document.body)
    });
  }
})();