(function() {
  if (window.__FOOD_BLIND_BOX_SCRIPT_RAN__) return;
  window.__FOOD_BLIND_BOX_SCRIPT_RAN__ = true;

  const API_URL = 'https://api.pearapi.ai/api/today/food.php';
  const MASK_ID = 'food-blind-box-mask';
  const MODAL_ID = 'food-blind-box-modal';
  const STYLE_ID = 'food-blind-box-style';

  const LOADING_SCHEDULE = [80, 80, 80, 90, 100, 120, 140, 170, 210, 260, 320];

  const ICON_GROUPS = {
    idle: ['🎁'],
    loading: [
      '🍽️', '🥢', '🍳', '🍲', '🥘', '🍛', '🍜', '🍣', '🍱', '🍕',
      '🍔', '🌮', '🌯', '🥟', '🥗', '🍤', '🍙', '🍝', '🍚', '🍖',
      '🍗', '🥩', '🥓', '🌭', '🥪', '🥙', '🥚', '🥞', '🧇', '🥐',
      '🍞', '🥖', '🥨', '🥯', '🧀', '🍄', '🥬', '🥦', '🌽', '🥕',
      '🥔', '🍠', '🍢', '🍡', '🍘', '🍥', '🥮', '🍱', '🍛', '🍲'
    ],
    success: [
      '🍜', '🍛', '🍣', '🍱', '🍕', '🍔', '🌯', '🌮', '🥗', '🥟',
      '🍲', '🍤', '🍙', '🍝', '🍚', '🍖', '🍗', '🥩', '🍳', '🥐',
      '🍞', '🧀', '🍄', '🥦', '🌽', '🥕', '🍠', '🍎', '🍊', '🍋',
      '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍',
      '🥥', '🍅', '🥑', '🍆', '🥔', '🥬', '🥨', '🥯'
    ],
    error: ['🙈', '😵', '🍽️', '🤷', '🥲', '😅', '🤦', '🙅', '❌', '⚠️']
  };

  const FOOD_ICON_RULES = [
    { icon: '🍜', keywords: ['面', '拉面', '面条', '米线', '粉', '粉丝', '螺蛳粉', '汤面', '汤粉', '麻辣烫', '米粉', '刀削面'] },
    { icon: '🍛', keywords: ['饭', '盖饭', '炒饭', '拌饭', '咖喱', '煲仔饭', '便当', '套餐饭', '盖浇'] },
    { icon: '🍣', keywords: ['寿司', '刺身', '三文鱼', '日料'] },
    { icon: '🍕', keywords: ['披萨', 'pizza', '比萨'] },
    { icon: '🍔', keywords: ['汉堡', 'burger'] },
    { icon: '🌮', keywords: ['塔可', 'taco', '墨西哥卷'] },
    { icon: '🌯', keywords: ['手卷', '鸡肉卷', '卷饼'] },
    { icon: '🥟', keywords: ['饺', '馄饨', '抄手', '锅贴', '云吞'] },
    { icon: '🥗', keywords: ['沙拉', '轻食', '蔬菜碗'] },
    { icon: '🍤', keywords: ['虾', '海鲜', '鱼', '蟹', '贝', '蛤蜊', '生蚝'] },
    { icon: '🍝', keywords: ['意面', '意大利面', 'pasta'] },
    { icon: '🍙', keywords: ['饭团', '寿司卷'] },
    { icon: '🍚', keywords: ['白饭', '米饭'] },
    { icon: '🍖', keywords: ['烤肉', '炸鸡', '鸡排', '牛排', '排骨', '肉', '烧烤'] },
    { icon: '🍲', keywords: ['火锅', '冒菜', '炖', '锅', '汤', '煲', '砂锅'] },
    { icon: '🍞', keywords: ['面包', '吐司', '三明治', '早餐'] },
    { icon: '🍎', keywords: ['水果', '苹果', '香蕉', '橙子', '葡萄', '西瓜', '草莓'] }
  ];

  let isOpening = false;
  let loadingTimer = null;
  let lastLoadingIcon = '';
  let currentOpenSession = 0;

  function pickRandom(list, excludeValue) {
    if (!Array.isArray(list) || !list.length) return '🍽️';
    if (list.length === 1) return list[0];

    let next = list[Math.floor(Math.random() * list.length)];
    let guard = 0;

    while (next === excludeValue && guard < 12) {
      next = list[Math.floor(Math.random() * list.length)];
      guard += 1;
    }

    return next;
  }

  function safeRemoveById(id) {
    const element = document.getElementById(id);
    if (element) element.remove();
  }

  function getModalElements() {
    const modal = document.getElementById(MODAL_ID);
    if (!modal) return null;

    const icon = modal.querySelector('.blind-box-icon');
    const status = modal.querySelector('.blind-box-status');
    const result = modal.querySelector('.blind-box-result');
    const tip = modal.querySelector('.blind-box-tip');
    const openBtn = modal.querySelector('[data-action="open"]');

    if (!icon || !status || !result || !tip || !openBtn) return null;

    return { modal, icon, status, result, tip, openBtn };
  }

  function stopLoadingAnimation() {
    if (loadingTimer) {
      clearTimeout(loadingTimer);
      loadingTimer = null;
    }
  }

  function resolveFoodIcon(food) {
    const text = typeof food === 'string' ? food.trim().toLowerCase() : '';
    if (!text) return '🍽️';

    if (text.includes('西北风')) return '🌬️';

    for (let i = 0; i < FOOD_ICON_RULES.length; i += 1) {
      const rule = FOOD_ICON_RULES[i];
      for (let j = 0; j < rule.keywords.length; j += 1) {
        const keyword = String(rule.keywords[j]).toLowerCase();
        if (text.includes(keyword)) {
          return rule.icon;
        }
      }
    }

    return '🍽️';
  }

  function runLoadingAnimation(sessionId) {
    stopLoadingAnimation();

    const elements = getModalElements();
    if (!elements) return;

    const icon = elements.icon;
    let stepIndex = 0;

    function tick() {
      if (sessionId !== currentOpenSession) return;

      const nextIcon = pickRandom(ICON_GROUPS.loading, lastLoadingIcon);
      lastLoadingIcon = nextIcon;
      icon.textContent = nextIcon;

      const delay = LOADING_SCHEDULE[Math.min(stepIndex, LOADING_SCHEDULE.length - 1)];
      stepIndex += 1;
      loadingTimer = setTimeout(tick, delay);
    }

    tick();
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #food-blind-box-mask {
        position: fixed;
        inset: 0;
        z-index: 2147483646;
        background: radial-gradient(circle at top, rgba(255, 190, 92, 0.18), rgba(15, 23, 42, 0.62));
        backdrop-filter: blur(8px);
      }

      #food-blind-box-modal {
        position: fixed;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        z-index: 2147483647;
        width: min(92vw, 430px);
        border-radius: 28px;
        overflow: hidden;
        background: linear-gradient(180deg, #fff7ed 0%, #ffffff 100%);
        box-shadow: 0 30px 80px rgba(0, 0, 0, 0.28);
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: #1f2937;
        animation: foodBlindBoxPopIn .28s ease-out;
      }

      #food-blind-box-modal .blind-box-header {
        padding: 22px 22px 8px;
      }

      #food-blind-box-modal .blind-box-title {
        font-size: 22px;
        font-weight: 900;
        text-align: center;
      }

      #food-blind-box-modal .blind-box-body {
        padding: 8px 22px 22px;
      }

      #food-blind-box-modal .blind-box-subtitle {
        font-size: 13px;
        color: #6b7280;
        margin-bottom: 16px;
        text-align: center;
      }

      #food-blind-box-modal .blind-box-card {
        position: relative;
        border-radius: 24px;
        padding: 24px 18px;
        min-height: 260px;
        background: linear-gradient(135deg, #f97316 0%, #fb7185 50%, #f59e0b 100%);
        color: #fff;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        overflow: hidden;
      }

      #food-blind-box-modal .blind-box-card::before,
      #food-blind-box-modal .blind-box-card::after {
        content: '';
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.14);
      }

      #food-blind-box-modal .blind-box-card::before {
        width: 200px;
        height: 200px;
        top: -70px;
        right: -60px;
      }

      #food-blind-box-modal .blind-box-card::after {
        width: 140px;
        height: 140px;
        bottom: -30px;
        left: -20px;
      }

      #food-blind-box-modal .blind-box-icon {
        position: relative;
        z-index: 1;
        font-size: 58px;
        margin-bottom: 12px;
        animation: foodBlindFloat 1.8s ease-in-out infinite;
        filter: drop-shadow(0 8px 18px rgba(0, 0, 0, 0.18));
        will-change: transform, opacity;
      }

      #food-blind-box-modal .blind-box-status {
        position: relative;
        z-index: 1;
        font-size: 14px;
        opacity: .95;
        margin-bottom: 8px;
        font-weight: 600;
      }

      #food-blind-box-modal .blind-box-result {
        position: relative;
        z-index: 1;
        font-size: 30px;
        font-weight: 900;
        line-height: 1.25;
        margin: 8px 0;
        word-break: break-word;
      }

      #food-blind-box-modal .blind-box-tip {
        position: relative;
        z-index: 1;
        font-size: 13px;
        opacity: .95;
      }

      #food-blind-box-modal .blind-box-actions {
        display: flex;
        gap: 12px;
        margin-top: 18px;
      }

      #food-blind-box-modal .blind-box-btn {
        flex: 1;
        border: none;
        border-radius: 14px;
        padding: 12px 14px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 700;
        transition: transform .15s ease, opacity .2s ease, box-shadow .2s ease;
      }

      #food-blind-box-modal .blind-box-btn:hover {
        transform: translateY(-1px);
      }

      #food-blind-box-modal .blind-box-btn:disabled {
        opacity: .6;
        cursor: not-allowed;
        transform: none;
      }

      #food-blind-box-modal .blind-box-btn-primary {
        background: #111827;
        color: #fff;
        box-shadow: 0 10px 20px rgba(17, 24, 39, 0.18);
      }

      #food-blind-box-modal .blind-box-btn-secondary {
        background: #fff;
        color: #111827;
        border: 1px solid rgba(17, 24, 39, 0.08);
      }

      #food-blind-box-modal.is-opening .blind-box-icon {
        animation: foodBlindShake .72s ease-in-out infinite;
      }

      @keyframes foodBlindBoxPopIn {
        from {
          opacity: 0;
          transform: translate(-50%, -48%) scale(0.96);
        }
        to {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1);
        }
      }

      @keyframes foodBlindFloat {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-6px); }
      }

      @keyframes foodBlindShake {
        0%, 100% { transform: rotate(0deg) scale(1); }
        20% { transform: rotate(-8deg) scale(1.04); }
        40% { transform: rotate(8deg) scale(1.08); }
        60% { transform: rotate(-6deg) scale(1.04); }
        80% { transform: rotate(6deg) scale(1.08); }
      }
    `;

    if (document.head) {
      document.head.appendChild(style);
    }
  }

  function createModal() {
    if (document.getElementById(MASK_ID) || document.getElementById(MODAL_ID)) return;

    const mask = document.createElement('div');
    mask.id = MASK_ID;

    const modal = document.createElement('div');
    modal.id = MODAL_ID;
    modal.innerHTML = `
      <div class="blind-box-header">
        <div class="blind-box-title">今日吃什么盲盒</div>
      </div>
      <div class="blind-box-body">
        <div class="blind-box-subtitle">别纠结了，点一下，今天的快乐晚饭马上揭晓。</div>
        <div class="blind-box-card">
          <div class="blind-box-icon">🎁</div>
          <div class="blind-box-status">准备开盒</div>
          <div class="blind-box-result">点击下方按钮试试手气</div>
          <div class="blind-box-tip">今日玄学推荐，仅供嘴巴参考</div>
        </div>
        <div class="blind-box-actions">
          <button class="blind-box-btn blind-box-btn-secondary" type="button" data-action="close">先不吃了</button>
          <button class="blind-box-btn blind-box-btn-primary" type="button" data-action="open">立即开盒</button>
        </div>
      </div>
    `;

    const actionCloseBtn = modal.querySelector('[data-action="close"]');
    const actionOpenBtn = modal.querySelector('[data-action="open"]');

    if (actionCloseBtn) actionCloseBtn.addEventListener('click', destroyScript);
    if (actionOpenBtn) actionOpenBtn.addEventListener('click', openBlindBox);

    if (document.body) {
      document.body.appendChild(mask);
      document.body.appendChild(modal);
      updateModalState({ type: 'idle' });
    }
  }

  function destroyScript() {
    if (isOpening) return;
    currentOpenSession += 1;
    stopLoadingAnimation();
    safeRemoveById(MASK_ID);
    safeRemoveById(MODAL_ID);
    safeRemoveById(STYLE_ID);
    window.__FOOD_BLIND_BOX_SCRIPT_RAN__ = false;
  }

  function updateModalState(state) {
    const elements = getModalElements();
    if (!elements) return;

    const modal = elements.modal;
    const icon = elements.icon;
    const status = elements.status;
    const result = elements.result;
    const tip = elements.tip;
    const openBtn = elements.openBtn;

    if (state.type === 'idle') {
      stopLoadingAnimation();
      modal.classList.remove('is-opening');
      icon.textContent = '🎁';
      status.textContent = '准备开盒';
      result.textContent = '点击下方按钮试试手气';
      tip.textContent = '今日玄学推荐，仅供嘴巴参考';
      openBtn.disabled = false;
      openBtn.textContent = '立即开盒';
    }

    if (state.type === 'loading') {
      modal.classList.add('is-opening');
      status.textContent = '盲盒开启中...';
      result.textContent = '正在摇出今天的命定美食';
      tip.textContent = '请稍等，正在为你抽取';
      openBtn.disabled = true;
      openBtn.textContent = '开盒中...';
    }

    if (state.type === 'success') {
      stopLoadingAnimation();
      modal.classList.remove('is-opening');
      icon.textContent = state.icon || resolveFoodIcon(state.food);
      status.textContent = '开盒成功';
      result.textContent = '今天吃：' + state.food;
      tip.textContent = '不满意就再开一次，但不一定更好';
      openBtn.disabled = false;
      openBtn.textContent = '再开一次';
    }

    if (state.type === 'error') {
      stopLoadingAnimation();
      modal.classList.remove('is-opening');
      icon.textContent = state.icon || pickRandom(ICON_GROUPS.error);
      status.textContent = '开盒失败';
      result.textContent = state.message || '今天的美食信号丢失了';
      tip.textContent = '稍后再试一次吧';
      openBtn.disabled = false;
      openBtn.textContent = '重新开盒';
    }
  }

  async function fetchWithTimeout(url, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(function() {
      controller.abort();
    }, timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal
      });
      return response;
    } finally {
      clearTimeout(timer);
    }
  }

  async function settleResultAfterAnimation(payload, sessionId) {
    if (sessionId !== currentOpenSession) return;

    stopLoadingAnimation();

    const finalIcon = payload.type === 'success'
      ? resolveFoodIcon(payload.food)
      : pickRandom(ICON_GROUPS.error);

    if (payload.type === 'success') {
      updateModalState({
        type: 'success',
        food: payload.food,
        icon: finalIcon
      });
    } else {
      updateModalState({
        type: 'error',
        message: payload.message,
        icon: finalIcon
      });
    }
  }

  async function openBlindBox() {
    if (isOpening) return;

    isOpening = true;
    currentOpenSession += 1;
    const sessionId = currentOpenSession;
    lastLoadingIcon = '';

    updateModalState({ type: 'loading' });
    runLoadingAnimation(sessionId);

    try {
      await new Promise(function(resolve) {
        setTimeout(resolve, 1200);
      });

      const response = await fetchWithTimeout(API_URL, 8000);
      if (!response || !response.ok) {
        throw new Error('接口请求失败');
      }

      const data = await response.json();
      const food = data && typeof data.food === 'string' ? data.food.trim() : '';

      if (!food) {
        throw new Error('未获取到推荐内容');
      }

      await settleResultAfterAnimation({
        type: 'success',
        food: food
      }, sessionId);
    } catch (error) {
      console.warn('盲盒接口请求失败:', error);

      await settleResultAfterAnimation({
        type: 'error',
        message: '没有抽到菜，换个时间再开'
      }, sessionId);
    } finally {
      if (sessionId === currentOpenSession) {
        isOpening = false;
      }
    }
  }

  function executeAutomation() {
    console.log('Executing automation script...');
    injectStyle();
    createModal();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', executeAutomation, { once: true });
  } else {
    executeAutomation();
  }
})();