(function() {
  'use strict';
  
  // 防止重复执行
  if (window.kangarooPetInitialized) {
    console.log('袋鼠小宠物已经在运行中...');
    return;
  }
  window.kangarooPetInitialized = true;

  // 🎯 扩充的鼓励词库 - 按类型分类
  const encouragementLibrary = {
    // 效率类
    efficiency: [
      "哇塞！这手速，键盘都要冒烟了！🔥",
      "打字如飞！袋鼠都跟不上你的节奏！⚡",
      "这效率！老板看了都要给你加薪！💰",
      "效率MAX！今天又是元气满满的一天！💪",
      "这速度，袋鼠都要系上安全带了！🎢",
      "光速打字！爱因斯坦都要重新定义相对论了！⚡",
      "效率爆表！这就是传说中的打工之神！👑",
      "键盘：我这辈子没这么快乐过！💨",
    ],
    
    // 专注类
    focus: [
      "这专注度，爱因斯坦都要点赞！👍",
      "这专注力，袋鼠甘拜下风！🙇",
      "摸鱼？不存在的！你是认真的！🐟",
      "全神贯注！这就是职业选手的状态！🎯",
      "专注力拉满！周围的一切都黯然失色！✨",
      "心无旁骛！这才是真正的打工人！💼",
      "沉浸式工作！袋鼠都不敢打扰你！🤫",
    ],
    
    // 才华类
    talent: [
      "太强了！这是要敲出诗来的节奏啊！📝",
      "你是打字界的闪电侠吗？💨",
      "键盘侠本侠！敲得太帅了！😎",
      "打字打出了艺术的感觉！🎨",
      "你是被打字耽误的钢琴家吧！🎹",
      "这节奏感，可以去参加打字比赛了！🎵",
      "打字声如同交响乐般动听！🎼",
      "你的手指在跳舞吗？太优雅了！💃",
      "天才！这是天赋异禀啊！🌟",
      "文思泉涌！灵感女神附体了吗？💫",
    ],
    
    // 鼓励类
    motivation: [
      "打工人之光就是你！✨",
      "袋鼠表示：我愿称你为最强！🏆",
      "你是来拯救KPI的超人吧！🦸",
      "打工人的楷模就是你！🎖️",
      "加油！你是最棒的！💪",
      "继续保持！胜利就在前方！🎯",
      "太厉害了！袋鼠为你骄傲！🦘",
      "不愧是你！永远可以相信你！⭐",
      "今天的你闪闪发光！✨",
      "冲鸭！没有什么能阻挡你！🚀",
    ],
    
    // 幽默类
    humor: [
      "键盘：我从未被如此温柔地对待过！💕",
      "键盘：今天又是被宠爱的一天～💝",
      "老板：这才是我要的员工！👔",
      "键盘：遇见你是我的荣幸！🌟",
      "键盘表示：终于遇到懂我的人了！😭",
      "电脑：主人好厉害，我要过热了！🔥",
      "袋鼠：我学会了，但我不敢用！😂",
      "路人：这就是传说中的大神吗？👀",
      "同事：请收下我的膝盖！🙏",
    ],
    
    // 时间段问候
    timeGreeting: [
      "早安！新的一天，新的开始！☀️",
      "午安！工作到一半，来点能量！🌤️",
      "下午好！继续加油鸭！🌅",
      "晚上好！夜深了，注意休息哦！🌙",
      "深夜了！打工人辛苦啦！⭐",
    ]
  };

  // 互动语录（点击时）
  const interactionPhrases = [
    "嘿嘿，摸我干嘛～😊",
    "我在这里陪你呢！💛",
    "要休息一下吗？🤗",
    "袋鼠跳跳～蹦蹦！🦘",
    "摸摸头，继续加油！✨",
    "我是你的专属打工伙伴！🎉",
    "点我干嘛，快去工作啦！😄",
    "嘿！注意到我了吗？👀",
    "哎呀～好痒～😆",
    "再摸我就要害羞啦！😳",
    "袋鼠牌情绪充电器，已上线！⚡",
    "累了吧？让我给你加个油！⛽",
  ];

  // 获取随机鼓励语
  function getRandomEncouragement() {
    const categories = Object.keys(encouragementLibrary).filter(k => k !== 'timeGreeting');
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    const phrases = encouragementLibrary[randomCategory];
    return phrases[Math.floor(Math.random() * phrases.length)];
  }

  // 创建袋鼠宠物容器
  const petContainer = document.createElement('div');
  petContainer.id = 'kangaroo-pet-container';
  petContainer.innerHTML = `
    <div class="praise-bubble"></div>
    <div class="kangaroo-wrapper">
      <div class="kangaroo-body">
        <div class="kangaroo-head">
          <div class="ear ear-left"></div>
          <div class="ear ear-right"></div>
          <div class="face">
            <div class="eye eye-left">
              <div class="pupil"></div>
              <div class="shine"></div>
            </div>
            <div class="eye eye-right">
              <div class="pupil"></div>
              <div class="shine"></div>
            </div>
            <div class="blush blush-left"></div>
            <div class="blush blush-right"></div>
            <div class="nose"></div>
            <div class="mouth"></div>
            <div class="whisker whisker-left"></div>
            <div class="whisker whisker-right"></div>
          </div>
        </div>
        <div class="kangaroo-torso">
          <div class="chest-mark"></div>
          <div class="pouch"></div>
          <div class="arm arm-left"></div>
          <div class="arm arm-right"></div>
        </div>
        <div class="kangaroo-legs">
          <div class="leg leg-left">
            <div class="foot"></div>
          </div>
          <div class="leg leg-right">
            <div class="foot"></div>
          </div>
          <div class="tail"></div>
        </div>
      </div>
    </div>
    <div class="drag-hint">💛 拖动我</div>
  `;

  // 添加样式
  const style = document.createElement('style');
  style.textContent = `
    #kangaroo-pet-container {
      position: fixed;
      bottom: 30px;
      right: 30px;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      cursor: move;
      user-select: none;
    }

    #kangaroo-pet-container.dragging {
      cursor: grabbing;
    }

    .kangaroo-wrapper {
      display: flex;
      align-items: flex-end;
      pointer-events: auto;
    }

    .kangaroo-body {
      position: relative;
      width: 90px;
      height: 110px;
      animation: idle-float 3s ease-in-out infinite;
      transition: transform 0.3s ease;
      filter: drop-shadow(0 6px 16px rgba(255, 215, 0, 0.3));
    }

    .kangaroo-body:hover {
      transform: scale(1.08);
    }

    .kangaroo-body.jumping {
      animation: jump 0.6s ease-out;
    }

    /* ===== 头部 ===== */
    .kangaroo-head {
      position: absolute;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 55px;
      height: 50px;
    }

    /* 耳朵 */
    .ear {
      position: absolute;
      width: 14px;
      height: 28px;
      background: linear-gradient(to bottom, #FFD700 0%, #FFC700 70%, #FFB700 100%);
      border-radius: 14px 14px 0 0;
      top: -8px;
      box-shadow: inset 0 2px 4px rgba(255, 255, 255, 0.5),
                  inset 0 -2px 4px rgba(0, 0, 0, 0.1);
    }

    .ear::after {
      content: '';
      position: absolute;
      width: 8px;
      height: 18px;
      background: #FFB700;
      border-radius: 8px 8px 0 0;
      top: 3px;
      left: 3px;
    }

    .ear-left {
      left: 6px;
      transform: rotate(-20deg);
    }

    .ear-right {
      right: 6px;
      transform: rotate(20deg);
    }

    /* 脸部 */
    .face {
      position: absolute;
      width: 55px;
      height: 50px;
      background: linear-gradient(135deg, #FFD700 0%, #FFC700 50%, #FFB700 100%);
      border-radius: 50% 50% 48% 48%;
      box-shadow: 0 4px 16px rgba(255, 215, 0, 0.4),
                  inset 0 2px 8px rgba(255, 255, 255, 0.3);
    }

    /* 眼睛 */
    .eye {
      position: absolute;
      width: 12px;
      height: 12px;
      background: white;
      border-radius: 50%;
      top: 18px;
      box-shadow: inset 0 -2px 4px rgba(0,0,0,0.1);
    }

    .eye-left { left: 11px; }
    .eye-right { right: 11px; }

    .pupil {
      position: absolute;
      width: 7px;
      height: 7px;
      background: #2c3e50;
      border-radius: 50%;
      top: 3px;
      left: 3px;
      transition: all 0.2s ease;
    }

    .shine {
      position: absolute;
      width: 3px;
      height: 3px;
      background: white;
      border-radius: 50%;
      top: 2px;
      left: 2px;
      opacity: 0.9;
    }

    .kangaroo-body.blink .eye {
      height: 2px;
      top: 22px;
      transition: all 0.1s ease;
    }

    /* 腮红 */
    .blush {
      position: absolute;
      width: 8px;
      height: 6px;
      background: #FFB6C1;
      border-radius: 50%;
      top: 26px;
      opacity: 0.6;
    }

    .blush-left { left: 6px; }
    .blush-right { right: 6px; }

    .kangaroo-body.happy .blush {
      opacity: 0.9;
      animation: blush-pulse 0.5s ease;
    }

    /* 鼻子 */
    .nose {
      position: absolute;
      width: 7px;
      height: 6px;
      background: linear-gradient(135deg, #FF6B9D 0%, #FF8FAB 100%);
      border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
      bottom: 14px;
      left: 50%;
      transform: translateX(-50%);
      box-shadow: 0 1px 2px rgba(0,0,0,0.2);
    }

    /* 嘴巴 */
    .mouth {
      position: absolute;
      width: 18px;
      height: 9px;
      border: 2px solid #FF6B9D;
      border-top: none;
      border-radius: 0 0 18px 18px;
      bottom: 7px;
      left: 50%;
      transform: translateX(-50%);
    }

    .kangaroo-body.happy .mouth {
      height: 14px;
      width: 22px;
      animation: smile 0.3s ease;
    }

    /* 胡须 */
    .whisker {
      position: absolute;
      width: 12px;
      height: 1px;
      background: rgba(0, 0, 0, 0.2);
      top: 24px;
    }

    .whisker::before,
    .whisker::after {
      content: '';
      position: absolute;
      width: 12px;
      height: 1px;
      background: rgba(0, 0, 0, 0.2);
    }

    .whisker::before { top: -4px; }
    .whisker::after { top: 4px; }

    .whisker-left {
      left: -10px;
      transform: rotate(-15deg);
    }

    .whisker-right {
      right: -10px;
      transform: rotate(15deg);
    }

    /* ===== 身体 ===== */
    .kangaroo-torso {
      position: absolute;
      top: 45px;
      left: 50%;
      transform: translateX(-50%);
      width: 50px;
      height: 45px;
      background: linear-gradient(135deg, #FFD700 0%, #FFC700 50%, #FFB700 100%);
      border-radius: 48% 48% 40% 40%;
      box-shadow: 0 4px 16px rgba(255, 215, 0, 0.4),
                  inset 0 2px 8px rgba(255, 255, 255, 0.3);
    }

    /* 胸部标记 */
    .chest-mark {
      position: absolute;
      width: 20px;
      height: 12px;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      top: 8px;
      left: 50%;
      transform: translateX(-50%);
    }

    /* 育儿袋 */
    .pouch {
      position: absolute;
      width: 32px;
      height: 26px;
      background: linear-gradient(to bottom, #FFB700 0%, #FFA500 100%);
      border-radius: 0 0 50% 50%;
      bottom: 6px;
      left: 50%;
      transform: translateX(-50%);
      border-top: 2px solid #FF9500;
      box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.2);
    }

    .pouch::after {
      content: '';
      position: absolute;
      width: 20px;
      height: 16px;
      background: rgba(0, 0, 0, 0.1);
      border-radius: 0 0 50% 50%;
      top: 2px;
      left: 50%;
      transform: translateX(-50%);
    }

    /* 手臂 */
    .arm {
      position: absolute;
      width: 12px;
      height: 34px;
      background: linear-gradient(to bottom, #FFD700 0%, #FFC700 70%, #FFB700 100%);
      border-radius: 12px;
      top: 8px;
      box-shadow: inset 0 2px 4px rgba(255, 255, 255, 0.3);
    }

    .arm::after {
      content: '';
      position: absolute;
      width: 14px;
      height: 10px;
      background: #FFB700;
      border-radius: 50%;
      bottom: -2px;
      left: -1px;
    }

    .arm-left {
      left: -10px;
      transform: rotate(-25deg);
    }

    .arm-right {
      right: -10px;
      transform: rotate(25deg);
    }

    .kangaroo-body.waving .arm-right {
      animation: wave 0.5s ease infinite;
    }

    /* ===== 腿部 ===== */
    .kangaroo-legs {
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 70px;
      height: 35px;
    }

    .leg {
      position: absolute;
      width: 24px;
      height: 32px;
      background: linear-gradient(to bottom, #FFD700 0%, #FFC700 60%, #FFB700 100%);
      border-radius: 10px 10px 4px 4px;
      bottom: 0;
      box-shadow: inset 0 2px 4px rgba(255, 255, 255, 0.3);
    }

    .leg-left { left: 8px; }
    .leg-right { right: 8px; }

    .foot {
      position: absolute;
      width: 30px;
      height: 12px;
      background: linear-gradient(to right, #FFB700 0%, #FFA500 100%);
      border-radius: 50% 50% 40% 40%;
      bottom: -4px;
      left: -3px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }

    /* 尾巴 */
    .tail {
      position: absolute;
      width: 35px;
      height: 10px;
      background: linear-gradient(to right, #FFD700 0%, #FFC700 50%, #FFB700 100%);
      border-radius: 10px;
      bottom: 12px;
      right: -28px;
      transform: rotate(-35deg);
      box-shadow: inset 0 2px 4px rgba(255, 255, 255, 0.3);
    }

    .tail::after {
      content: '';
      position: absolute;
      width: 15px;
      height: 8px;
      background: #FFB700;
      border-radius: 50%;
      right: -5px;
      top: 1px;
    }

    /* ===== 对话气泡 - 上方 ===== */
    .praise-bubble {
      position: absolute;
      bottom: 125px;
      left: 50%;
      transform: translateX(-50%) translateY(10px) scale(0.9);
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 14px 22px;
      border-radius: 18px;
      font-size: 15px;
      font-weight: 600;
      line-height: 1.6;
      opacity: 0;
      transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
      box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
      max-width: 320px;
      min-width: 200px;
      white-space: normal;
      word-wrap: break-word;
      text-align: center;
      pointer-events: none;
    }

    .praise-bubble::after {
      content: '';
      position: absolute;
      bottom: -10px;
      left: 50%;
      transform: translateX(-50%);
      width: 0;
      height: 0;
      border-left: 12px solid transparent;
      border-right: 12px solid transparent;
      border-top: 12px solid #764ba2;
    }

    .praise-bubble.show {
      opacity: 1;
      transform: translateX(-50%) translateY(0) scale(1);
    }

    /* 拖拽提示 */
    .drag-hint {
      position: absolute;
      top: -35px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 500;
      white-space: nowrap;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    #kangaroo-pet-container:hover .drag-hint {
      opacity: 1;
    }

    #kangaroo-pet-container.dragging .drag-hint,
    #kangaroo-pet-container.interacted .drag-hint {
      opacity: 0;
    }

    /* ===== 动画 ===== */
    @keyframes idle-float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-10px); }
    }

    @keyframes jump {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-50px); }
    }

    @keyframes wave {
      0%, 100% { transform: rotate(25deg); }
      50% { transform: rotate(-15deg); }
    }

    @keyframes smile {
      0%, 100% { height: 14px; width: 22px; }
      50% { height: 16px; width: 24px; }
    }

    @keyframes blush-pulse {
      0%, 100% { opacity: 0.9; transform: scale(1); }
      50% { opacity: 1; transform: scale(1.2); }
    }

    /* 响应式 */
    @media (max-width: 768px) {
      #kangaroo-pet-container {
        bottom: 20px;
        right: 20px;
      }
      
      .kangaroo-body {
        width: 70px;
        height: 90px;
      }
      
      .praise-bubble {
        font-size: 13px;
        padding: 10px 16px;
        max-width: 240px;
        bottom: 105px;
      }
    }

    /* 暗色模式 */
    @media (prefers-color-scheme: dark) {
      .praise-bubble {
        background: linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%);
        box-shadow: 0 8px 24px rgba(90, 103, 216, 0.5);
      }
      
      .praise-bubble::after {
        border-top-color: #6b46c1;
      }
    }
  `;

  // 插入到页面
  document.head.appendChild(style);
  document.body.appendChild(petContainer);

  // 状态管理
  let keyPressCount = 0;
  let lastPraiseTime = 0;
  const minInterval = 2500;
  const triggerCount = 15;
  let hasInteracted = false;

  // DOM 元素
  const kangarooBody = petContainer.querySelector('.kangaroo-body');
  const wrapper = petContainer.querySelector('.kangaroo-wrapper');
  const bubble = petContainer.querySelector('.praise-bubble');

  // 拖拽变量
  let isDragging = false;
  let currentX, currentY, initialX, initialY;
  let xOffset = 0, yOffset = 0;

  // 显示消息
  function showMessage(message, duration = 3000) {
    const now = Date.now();
    if (now - lastPraiseTime < 1000) return;
    
    lastPraiseTime = now;
    bubble.textContent = message;
    bubble.classList.add('show');
    kangarooBody.classList.add('happy');
    
    setTimeout(() => {
      bubble.classList.remove('show');
      kangarooBody.classList.remove('happy');
    }, duration);
  }

  // 点击互动
  kangarooBody.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isDragging) return;
    
    hasInteracted = true;
    petContainer.classList.add('interacted');
    
    // 随机互动效果
    const actions = ['blink', 'jumping', 'waving', 'happy'];
    const randomAction = actions[Math.floor(Math.random() * actions.length)];
    
    kangarooBody.classList.add(randomAction);
    setTimeout(() => kangarooBody.classList.remove(randomAction), 600);
    
    // 显示互动语录
    const randomPhrase = interactionPhrases[Math.floor(Math.random() * interactionPhrases.length)];
    showMessage(randomPhrase, 2500);
  });

  // 拖拽功能
  petContainer.addEventListener('mousedown', dragStart);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', dragEnd);

  function dragStart(e) {
    if (e.target.closest('.praise-bubble')) return;
    
    initialX = e.clientX - xOffset;
    initialY = e.clientY - yOffset;

    if (e.target === petContainer || e.target.closest('.kangaroo-body')) {
      isDragging = true;
      petContainer.classList.add('dragging');
      hasInteracted = true;
      petContainer.classList.add('interacted');
    }
  }

  function drag(e) {
    if (isDragging) {
      e.preventDefault();
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;
      xOffset = currentX;
      yOffset = currentY;
      petContainer.style.transform = `translate(${currentX}px, ${currentY}px)`;
    }
  }

  function dragEnd(e) {
    if (isDragging) {
      initialX = currentX;
      initialY = currentY;
      isDragging = false;
      petContainer.classList.remove('dragging');
      
      kangarooBody.classList.add('blink');
      setTimeout(() => kangarooBody.classList.remove('blink'), 200);
    }
  }

  // 键盘事件监听
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.key === 'Shift' || e.key === 'Tab') return;
    
    keyPressCount++;
    
    if (keyPressCount >= triggerCount) {
      keyPressCount = 0;
      showMessage(getRandomEncouragement(), 3500);
      
      kangarooBody.classList.add('jumping');
      setTimeout(() => kangarooBody.classList.remove('jumping'), 600);
    }
  });

  // 随机眨眼
  setInterval(() => {
    if (!isDragging && Math.random() > 0.65) {
      kangarooBody.classList.add('blink');
      setTimeout(() => kangarooBody.classList.remove('blink'), 150);
    }
  }, 3500);

  // 随机挥手
  setInterval(() => {
    if (!isDragging && Math.random() > 0.75) {
      kangarooBody.classList.add('waving');
      setTimeout(() => kangarooBody.classList.remove('waving'), 2000);
    }
  }, 10000);

  // 初始化欢迎
  setTimeout(() => {
    const hour = new Date().getHours();
    let greeting;
    if (hour < 6) greeting = encouragementLibrary.timeGreeting[4];
    else if (hour < 12) greeting = encouragementLibrary.timeGreeting[0];
    else if (hour < 14) greeting = encouragementLibrary.timeGreeting[1];
    else if (hour < 18) greeting = encouragementLibrary.timeGreeting[2];
    else if (hour < 22) greeting = encouragementLibrary.timeGreeting[3];
    else greeting = encouragementLibrary.timeGreeting[4];
    
    showMessage(greeting + " 我是你的专属袋鼠伙伴！💛", 4000);
    kangarooBody.classList.add('waving');
    setTimeout(() => kangarooBody.classList.remove('waving'), 2000);
  }, 1000);

  console.log('🦘 升级版袋鼠小宠物已就位！拥有50+鼓励词库，支持拖拽和互动～');

})();