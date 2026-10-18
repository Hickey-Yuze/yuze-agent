(function() {
  // 防止重复执行
  if (window.fortuneGameLoaded) return;
  window.fortuneGameLoaded = true;

  // 游戏状态
  const gameState = {
    dailyLimit: 3,
    usedToday: 0,
    history: [],
    date: new Date().toDateString()
  };

  // 签文数据（添加可爱emoji）
  const fortunes = [
    {
      id: 1,
      type: '上上签 🎉',
      poem: '春风得意🐎马蹄疾，一日看尽🌸长安花',
      interpretation: '运势如虹✨，好事连连🥳',
      do: ['表白💘', '投资💰', '谈合作🤝', '旅行✈️'],
      avoid: ['争吵😠', '熬夜😴', '暴饮暴食🍔'],
      color: '#FF6B6B'
    },
    {
      id: 2,
      type: '中上签 🥰',
      poem: '山重水复🌿疑无路，柳暗花明🌺又一村',
      interpretation: '好事多磨😜，但磨多了就秃了👩‍🦲',
      do: ['点奶茶🥤', '追剧📺', '睡懒觉🛌', '买零食🍟'],
      avoid: ['做重大决定🤔', '回老板消息💼', '称体重⚖️'],
      color: '#4ECDC4'
    },
    {
      id: 3,
      type: '中平签 ☕',
      poem: '采菊🌼东篱下，悠然见南山⛰️',
      interpretation: '平平淡淡🥧才是真',
      do: ['整理房间🧹', '看书📖', '散步🚶', '冥想🧘'],
      avoid: ['冒险🪂', '冲动消费🛍️', '改变发型💇'],
      color: '#FFD166'
    },
    {
      id: 4,
      type: '中下签 🛋️',
      poem: '月落🌙乌啼霜满天，江枫🍁渔火对愁眠',
      interpretation: '今日宜躺平🛌',
      do: ['点外卖🍱', '刷短视频📱', '打游戏🎮', '发呆😶'],
      avoid: ['健身🏋️', '学习📚', '社交👥', '加班💻'],
      color: '#A78BFA'
    },
    {
      id: 5,
      type: '下下签 🥺',
      poem: '黑云☁️压城城欲摧，甲光☀️向日金鳞开',
      interpretation: '否极泰来🍀，触底反弹💪',
      do: ['求安慰🫂', '吃甜食🍰', '看喜剧😂', '求抱抱🤗'],
      avoid: ['开车🚗', '重要会议📝', '签合同📜', '相亲💑'],
      color: '#6D6875'
    }
  ];

  // 加载保存的状态
  function loadState() {
    const saved = localStorage.getItem('fortuneGame_final');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.date === new Date().toDateString()) {
          gameState.usedToday = parsed.usedToday || 0;
          gameState.history = parsed.history || [];
        }
      } catch (e) {
        console.warn('加载保存数据失败:', e);
      }
    }
  }

  // 保存状态
  function saveState() {
    const data = {
      date: new Date().toDateString(),
      usedToday: gameState.usedToday,
      history: gameState.history
    };
    localStorage.setItem('fortuneGame_final', JSON.stringify(data));
  }

  // 显示消息
  function showMessage(text, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `fortune-message fortune-${type}`;
    messageDiv.textContent = text;
    messageDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 24px;
      background: ${type === 'warning' ? '#FF6B6B' : '#4ECDC4'};
      color: white;
      border-radius: 8px;
      z-index: 10000;
      animation: slideIn 0.3s ease;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      font-weight: 500;
    `;

    document.body.appendChild(messageDiv);
    setTimeout(() => {
      messageDiv.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => messageDiv.remove(), 300);
    }, 3000);
  }

  // 添加样式（核心修改：调亮背景+优化白色框）
  function addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      #fortune-container {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        /* 核心修改1：调浅整体渐变背景，从深橙红改为浅橙粉，更明亮 */
        background: linear-gradient(135deg, #FF8A80 0%, #FFAB91 100%);
        border-radius: 24px;
        padding: 30px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        z-index: 9999;
        min-width: 420px;
        min-height: 800px;
        display: flex;
        flex-direction: column;
        align-items: center;
        font-family: 'Microsoft YaHei', sans-serif;
        border: 8px solid rgba(255,255,255,0.4); /* 同步调亮边框透明度 */
      }

      .fortune-close-btn {
        position: absolute;
        top: 20px;
        right: 20px;
        width: 36px;
        height: 36px;
        background: rgba(255,255,255,0.9);
        border: none;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        color: #FF3B30;
        transition: all 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        z-index: 10;
      }

      .fortune-close-btn:hover {
        background: white;
        transform: rotate(90deg) scale(1.1);
        box-shadow: 0 6px 20px rgba(0,0,0,0.2);
      }

      .fortune-header {
        text-align: center;
        margin-bottom: 30px;
        color: #333;
        width: 100%;
      }

      .fortune-title {
        font-size: 42px;
        font-weight: 900;
        margin-bottom: 8px;
        color: #FFFFFF; /* 绝对纯白 */
        text-shadow: 2px 2px 4px rgba(0,0,0,0.2); /* 降低阴影浓度，适配浅色背景 */
        letter-spacing: 2px;
        -webkit-text-fill-color: #FFFFFF !important;
        -webkit-background-clip: text !important;
        background: none !important;
      }

      .fortune-subtitle {
        font-size: 16px;
        color: #FFF;
        margin-bottom: 20px;
        text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
      }

      .fortune-counter {
        background: rgba(255,255,255,0.95); /* 调亮计数器背景 */
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 14px;
        color: #555; /* 加深文字色，提高对比度 */
        display: inline-block;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }

      #fortune-drop-area {
        width: 100%;
        min-height: 400px;
        /* 核心修改2：调亮掉落区域背景，提高白色透明度，让白色更纯净 */
        background: rgba(255,255,255,0.25);
        border-radius: 16px;
        /* 核心修改3：白色虚线框调亮，透明度从0.6提至0.8，更白更清晰 */
        border: 3px dashed rgba(255,255,255,0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 30px;
        position: relative;
        overflow: hidden;
        backdrop-filter: blur(10px);
      }

      /* 掉落区域提示文字优化 */
      #fortune-drop-area > div {
        color: rgba(255,255,255,0.95) !important; /* 文字更白 */
        text-shadow: 1px 1px 3px rgba(0,0,0,0.1) !important;
      }

      .fortune-stick {
        position: absolute;
        width: 50px;
        height: 220px;
        background: linear-gradient(to bottom, #8B4513, #A0522D);
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        box-shadow: 0 8px 20px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 20px;
        user-select: none;
        z-index: 1;
        writing-mode: vertical-rl;
        text-orientation: upright;
        padding: 10px 0;
      }

      .fortune-stick::before {
        content: '';
        position: absolute;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        width: 24px;
        height: 24px;
        background: gold;
        border-radius: 50%;
        box-shadow: 0 0 10px gold;
      }

      .fortune-stick:hover {
        transform: scale(1.05) rotate(5deg);
        box-shadow: 0 12px 30px rgba(0,0,0,0.4);
      }

      .fortune-button {
        background: linear-gradient(45deg, #FF6E40, #FFAB91); /* 适配浅色背景的按钮渐变 */
        color: white;
        border: 3px solid rgba(255, 255, 255, 0.7);
        padding: 16px 40px;
        font-size: 18px;
        border-radius: 50px;
        cursor: pointer;
        transition: all 0.3s ease;
        font-weight: bold;
        letter-spacing: 1px;
        box-shadow: 0 8px 20px rgba(255,110,64,0.4); /* 适配新按钮色的阴影 */
        margin-top: 10px;
        box-sizing: border-box;
      }

      .fortune-button:hover {
        transform: translateY(-3px);
        box-shadow: 0 12px 30px rgba(255,110,64,0.6);
        border-color: rgba(255, 255, 255, 0.9);
        background: linear-gradient(45deg, #FF5722, #FF9800); /* 悬浮略加深 */
      }

      .fortune-button:disabled {
        background: #CCCCCC;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
        border-color: rgba(255, 255, 255, 0.4);
      }

      /* 详情框默认居中样式 */
      .fortune-details {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        border-radius: 20px;
        padding: 25px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        z-index: 100;
        width: 380px;
        max-height: 700px;
        animation: fadeInUp 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        border: 3px solid rgba(255,255,255,0.9); /* 调亮详情框边框 */
        overflow-y: auto;
      }

      .fortune-details-header {
        text-align: center;
        margin-bottom: 20px;
        padding-bottom: 15px;
        border-bottom: 2px solid #f0f0f0;
      }

      .fortune-type {
        font-size: 28px;
        font-weight: bold;
        margin-bottom: 10px;
      }

      .fortune-poem {
        font-size: 18px;
        color: #333;
        font-style: italic;
        margin-bottom: 15px;
        line-height: 1.6;
      }

      .fortune-interpretation {
        font-size: 16px;
        color: #666;
        margin-bottom: 25px;
        line-height: 1.5;
      }

      .fortune-section {
        margin-bottom: 20px;
      }

      .fortune-section-title {
        font-size: 16px;
        font-weight: bold;
        color: #333;
        margin-bottom: 10px;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .fortune-section-title::before {
        content: '';
        width: 6px;
        height: 6px;
        background: currentColor;
        border-radius: 50%;
      }

      .fortune-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .fortune-tag {
        padding: 6px 12px;
        background: #f8f9fa;
        border-radius: 20px;
        font-size: 14px;
        color: #666;
        transition: all 0.3s ease;
      }

      .fortune-tag:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      }

      .fortune-do .fortune-tag {
        background: #E8F5E9;
        color: #2E7D32;
      }

      .fortune-avoid .fortune-tag {
        background: #FFEBEE;
        color: #C62828;
      }

      .fortune-share {
        background: linear-gradient(45deg, #4ECDC4, #44A08D);
        color: white;
        border: none;
        padding: 12px 30px;
        font-size: 16px;
        border-radius: 25px;
        cursor: pointer;
        transition: all 0.3s ease;
        font-weight: bold;
        width: 100%;
        margin-top: 20px;
      }

      .fortune-share:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(78,205,196,0.4);
      }

      .fortune-date {
        text-align: center;
        margin-top: 15px;
        font-size: 14px;
        color: #999;
      }

      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }

      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }

      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translate(-50%, -50%) translateY(20px);
        }
        to {
          opacity: 1;
          transform: translate(-50%, -50%) translateY(0);
        }
      }

      @keyframes drop {
        0% {
          transform: translateY(-100px) rotate(0deg);
          opacity: 0;
        }
        100% {
          transform: translateY(0) rotate(var(--rotate-end));
          opacity: 1;
        }
      }

      .fortune-history {
        margin-top: 20px;
        width: 100%;
      }

      .history-title {
        font-size: 16px;
        font-weight: bold;
        color: #FFF;
        margin-bottom: 10px;
        text-shadow: 1px 1px 2px rgba(0,0,0,0.15); /* 加深阴影，适配浅色背景 */
      }

      .history-list {
        max-height: 120px;
        overflow-y: auto;
        background: rgba(255,255,255,0.95); /* 调亮历史记录背景 */
        border-radius: 12px;
        padding: 10px;
      }

      .history-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        background: white;
        border-radius: 8px;
        margin-bottom: 6px;
        font-size: 14px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.05);
      }

      .history-type {
        font-weight: bold;
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 12px;
      }

      .history-poem {
        flex: 1;
        margin: 0 12px;
        color: #666;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .history-date {
        font-size: 12px;
        color: #999;
      }

      @keyframes fadeOut {
        from {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1);
        }
        to {
          opacity: 0;
          transform: translate(-50%, -50%) scale(0.9);
        }
      }
    `;
    document.head.appendChild(style);
  }

  // 关闭游戏界面
  function closeGame() {
    const container = document.getElementById('fortune-container');
    if (container) {
      container.style.animation = 'fadeOut 0.3s ease';
      setTimeout(() => {
        container.remove();
        window.fortuneGameLoaded = false;
        showMessage('求签筒已关闭，随时可以重新打开！✨', 'info');
      }, 300);
    }
  }

  // 初始化UI
  function initUI() {
    const container = document.createElement('div');
    container.id = 'fortune-container';
    container.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      /* 同步修改容器内联样式的背景，和CSS保持一致 */
      background: linear-gradient(135deg, #FF8A80 0%, #FFAB91 100%);
      border-radius: 24px;
      padding: 30px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      z-index: 9999;
      min-width: 420px;
      min-height: 800px;
      display: flex;
      flex-direction: column;
      align-items: center;
      font-family: 'Microsoft YaHei', sans-serif;
      border: 8px solid rgba(255,255,255,0.4);
    `;

    container.innerHTML = `
      <button class="fortune-close-btn" title="关闭求签筒">×</button>
      
      <div class="fortune-header">
        <div class="fortune-title">求签筒</div>
        <div class="fortune-subtitle">心诚则灵🥰，每日可求三次</div>
        <div class="fortune-counter" id="fortune-counter">
          今日已求 <span id="used-count"></span> 次 | 剩余 <span id="remaining-count"></span> 次
        </div>
      </div>
      
      <div id="fortune-drop-area">
        <div style="color: rgba(255,255,255,0.95); font-size: 16px; text-align: center; padding: 20px;">
          点击下方按钮👇，签文将在此处掉落<br>
          <span style="font-size: 14px;">点击签文查看详细解读📖</span>
        </div>
      </div>
      
      <button class="fortune-button" id="fortune-button">
        🎋 开始求签 🎋
      </button>
      
      <div class="fortune-history">
        <div class="history-title">📜 今日签文记录</div>
        <div class="history-list" id="history-list">
          暂无记录🥺，快来求第一签吧！
        </div>
      </div>
    `;

    document.body.appendChild(container);

    // 添加关闭按钮事件监听
    const closeBtn = container.querySelector('.fortune-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeGame);
    }

    // 添加求签按钮事件监听
    document.getElementById('fortune-button').addEventListener('click', startFortune);
  }

  // 开始求签
  function startFortune() {
    if (gameState.usedToday >= gameState.dailyLimit) {
      showMessage('今日次数已用完！明天请早 🌙', 'warning');
      return;
    }

    const button = document.getElementById('fortune-button');
    const originalText = button.textContent;
    button.textContent = '摇签中...✨';
    button.disabled = true;

    // 清空之前的签文
    const dropArea = document.getElementById('fortune-drop-area');
    const existingSticks = dropArea.querySelectorAll('.fortune-stick');
    existingSticks.forEach(stick => stick.remove());

    // 随机选择签文
    const fortune = fortunes[Math.floor(Math.random() * fortunes.length)];
    
    // 创建签文
    const stick = document.createElement('div');
    stick.className = 'fortune-stick';
    // 移除emoji，只保留签型文字（竖排显示更美观）
    stick.textContent = fortune.type.replace(/[^中上上下签]/g, '');
    stick.style.background = `linear-gradient(to bottom, ${fortune.color}99, ${fortune.color})`;
    stick.style.setProperty('--rotate-end', `${Math.random() * 30 - 15}deg`);

    // 设置初始位置（顶部）
    stick.style.top = '-100px';
    stick.style.left = `${Math.random() * 70 + 15}%`;

    dropArea.appendChild(stick);

    // 动画：掉落
    setTimeout(() => {
      stick.style.animation = `drop 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards`;
      stick.style.top = `${Math.random() * 50 + 25}%`;
      stick.style.left = `${Math.random() * 60 + 20}%`;

      // 添加点击事件查看详情
      stick.addEventListener('click', () => flipFortune(fortune, stick));

      // 更新状态
      gameState.usedToday++;
      gameState.history.unshift({
        type: fortune.type,
        poem: fortune.poem,
        color: fortune.color,
        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
      });

      // 保持历史记录不超过5条
      if (gameState.history.length > 5) {
        gameState.history = gameState.history.slice(0, 5);
      }

      updateCounter();
      saveState();
      updateHistory();

      button.textContent = originalText;
      button.disabled = false;

      showMessage(`获得【${fortune.type}】！点击签文查看解读 ✨`, 'info');
    }, 300);
  }

  // 翻转签文显示详情（依赖CSS居中）
  function flipFortune(fortune, stick) {
    // 移除之前的详情
    const existingDetails = document.querySelector('.fortune-details');
    if (existingDetails) existingDetails.remove();

    // 创建详情卡片
    const details = document.createElement('div');
    details.className = 'fortune-details';

    details.innerHTML = `
      <div class="fortune-details-header">
        <div class="fortune-type" style="color: ${fortune.color};">${fortune.type}</div>
        <div class="fortune-poem">${fortune.poem}</div>
        <div class="fortune-interpretation">${fortune.interpretation}</div>
      </div>
      
      <div class="fortune-section fortune-do">
        <div class="fortune-section-title">✅ 宜做</div>
        <div class="fortune-tags">
          ${fortune.do.map(item => `<span class="fortune-tag">${item}</span>`).join('')}
        </div>
      </div>
      
      <div class="fortune-section fortune-avoid">
        <div class="fortune-section-title">❌ 忌做</div>
        <div class="fortune-tags">
          ${fortune.avoid.map(item => `<span class="fortune-tag">${item}</span>`).join('')}
        </div>
      </div>
      
      <button class="fortune-share" onclick="shareFortune('${fortune.type}', '${fortune.poem}')">
        📤 分享好运
      </button>
      
      <div class="fortune-date">${new Date().toLocaleDateString()}</div>
    `;

    document.querySelector('#fortune-container').appendChild(details);

    // 点击其他地方关闭详情
    setTimeout(() => {
      const closeHandler = (e) => {
        if (!details.contains(e.target) && e.target !== stick) {
          details.remove();
          document.removeEventListener('click', closeHandler);
        }
      };
      document.addEventListener('click', closeHandler);
    }, 100);
  }

  // 更新计数器
  function updateCounter() {
    const usedCount = document.getElementById('used-count');
    const remainingCount = document.getElementById('remaining-count');
    if (usedCount && remainingCount) {
      usedCount.textContent = gameState.usedToday;
      remainingCount.textContent = gameState.dailyLimit - gameState.usedToday;
    }
  }

  // 更新历史记录
  function updateHistory() {
    const historyList = document.getElementById('history-list');
    if (historyList) {
      if (gameState.history.length === 0) {
        historyList.innerHTML = '<div style="color: #999; text-align: center; padding: 20px;">暂无记录🥺，快来求第一签吧！</div>';
      } else {
        historyList.innerHTML = gameState.history.map(item => `
          <div class="history-item">
            <span class="history-type" style="background: ${item.color}20; color: ${item.color};">${item.type}</span>
            <span class="history-poem">${item.poem}</span>
            <span class="history-date">${item.time}</span>
          </div>
        `).join('');
      }
    }
  }

  // 分享功能
  window.shareFortune = function(type, poem) {
    const text = `✨ 今日签运：${type} ✨
${poem}

来自「求签筒」🥳
`;
    
    if (navigator.share) {
      navigator.share({
        title: '我的今日签运',
        text: text,
        url: window.location.href
      }).catch(console.error);
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        showMessage('签文已复制到剪贴板！快去分享吧 📋', 'info');
      }).catch(console.error);
    } else {
      prompt('复制以下文本分享给朋友：', text);
    }
  };

  // 初始化
  function init() {
    loadState();
    addStyles();
    initUI();
    updateCounter();
    updateHistory();
    
    console.log('求签筒 v4.3 已加载');
    console.log('今日已求签次数:', gameState.usedToday);
    console.log('历史记录:', gameState.history);
  }

  // 页面加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();