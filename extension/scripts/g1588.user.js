(function() {
  // 防止重复执行
  if (document.getElementById('radish-tissue-game')) {
    return;
  }

  const state = {
    items: [
      {id:'radish', name:'萝卜', emoji:'🥕'},
      {id:'tissue', name:'纸巾', emoji:'🧻'},
      {id:'mickey', name:'米老鼠', emoji:'🐭'},
      {id:'fish', name:'小鱼干', emoji:'🐟'},
      {id:'ball', name:'毛线球', emoji:'🧶'},
      {id:'box', name:'纸箱', emoji:'📦'}
    ],
    selected: null,
    shuffled: [],
    guessing: false,
    correct: 0,
    wrong: 0,
    rounds: 0,
    snacks: 5,
    timer: null,
    minimized: false
  };

  // 创建悬浮游戏窗口
  const game = document.createElement('div');
  game.id = 'radish-tissue-game';
  
  // 添加拖拽功能
  let isDragging = false;
  let dragOffset = { x: 0, y: 0 };
  let windowPosition = { x: 20, y: 20 };
  
  game.innerHTML = `
<style>
#radish-tissue-game {
  position: fixed;
  top: 20px;
  left: 20px;
  width: 420px;
  height: 600px;
  background: linear-gradient(135deg, #ffecd2, #fcb69f);
  font-family: 'Microsoft YaHei', sans-serif;
  z-index: 10000;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.3);
  overflow: hidden;
  resize: both;
  min-width: 400px;
  min-height: 500px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  transition: all 0.3s ease;
}

#radish-tissue-game.minimized {
  height: 60px;
  overflow: hidden;
}

#radish-tissue-game.minimized .game-content {
  display: none;
}

#radish-tissue-game.minimized .window-header {
  border-radius: 16px;
}

.window-header {
  background: linear-gradient(90deg, #ff6b6b, #ffa500);
  color: #fff;
  padding: 12px 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: move;
  user-select: none;
  border-top-left-radius: 14px;
  border-top-right-radius: 14px;
}

.window-title {
  font-size: 16px;
  font-weight: bold;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.2);
  display: flex;
  align-items: center;
  gap: 8px;
}

.window-controls {
  display: flex;
  gap: 8px;
}

.window-btn {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.window-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

.close-btn {
  background: rgba(255, 100, 100, 0.8);
}

.game-content {
  height: calc(100% - 46px);
  overflow-y: auto;
  padding: 15px;
  display: flex;
  flex-direction: column;
}

.stats-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 15px;
  background: rgba(255, 255, 255, 0.9);
  padding: 10px 15px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.stat-item {
  text-align: center;
  flex: 1;
}

.stat-label {
  font-size: 11px;
  color: #666;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 16px;
  font-weight: bold;
  color: #ff6b6b;
}

.instruction {
  background: rgba(255, 255, 255, 0.9);
  padding: 12px 15px;
  border-radius: 12px;
  margin-bottom: 15px;
  font-size: 13px;
  line-height: 1.5;
  color: #666;
}

.section {
  margin-bottom: 15px;
}

.section-title {
  font-size: 14px;
  font-weight: bold;
  color: #333;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.items-row {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
}

.item-card {
  width: 70px;
  height: 85px;
  background: #fff;
  border: 2px solid #ddd;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 3px 8px rgba(0,0,0,0.1);
}

.item-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 5px 15px rgba(0,0,0,0.15);
}

.item-card.selected {
  border-color: #ff6b6b;
  background: linear-gradient(135deg, #fff5f5, #ffe8e8);
  box-shadow: 0 5px 20px rgba(255,107,107,0.3);
}

.item-emoji {
  font-size: 30px;
  margin-bottom: 4px;
}

.item-name {
  font-size: 11px;
  color: #666;
  font-weight: bold;
}

.cat-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 10px;
}

.cat-container {
  text-align: center;
  margin-bottom: 10px;
}

.cat-avatar {
  font-size: 60px;
  animation: breathe 3s ease-in-out infinite;
}

@keyframes breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.cat-thought {
  background: #fff;
  padding: 8px 15px;
  border-radius: 16px;
  font-size: 14px;
  color: #333;
  box-shadow: 0 3px 8px rgba(0,0,0,0.1);
  margin-top: 8px;
  min-height: 20px;
}

.cat-items {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
  margin: 10px 0;
  min-height: 100px;
}

.cat-card {
  width: 70px;
  height: 85px;
  background: #fff;
  border: 2px solid #ddd;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 3px 8px rgba(0,0,0,0.1);
  transition: all 0.2s;
}

.cat-card.highlight {
  border-color: #ffa500;
  box-shadow: 0 5px 20px rgba(255,165,0,0.4);
  transform: scale(1.05);
}

.cat-card.correct {
  border-color: #4CAF50;
  background: linear-gradient(135deg, #f1f8f4, #e8f5e9);
}

.cat-card.wrong {
  border-color: #f44336;
  background: linear-gradient(135deg, #ffebee, #ffcdd2);
}

.action-btns {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 10px;
}

.action-btn {
  width: 70px;
  height: 70px;
  border: none;
  border-radius: 50%;
  font-size: 12px;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(0,0,0,0.2);
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: #fff;
}

.action-btn:hover {
  transform: scale(1.05);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.zhenbang-btn {
  background: linear-gradient(135deg, #ff6b6b, #ff8e53);
}

.snack-btn {
  background: linear-gradient(135deg, #4CAF50, #66BB6A);
}

.btn-emoji {
  font-size: 20px;
}

.btn-text {
  font-size: 11px;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.2);
}

.btn-count {
  position: absolute;
  top: -5px;
  right: -5px;
  background: #ff6b6b;
  color: #fff;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: bold;
}

.start-btn {
  padding: 10px 25px;
  border: none;
  border-radius: 20px;
  background: linear-gradient(90deg, #ff6b6b, #ffa500);
  color: #fff;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(255,107,107,0.4);
  transition: all 0.2s;
  margin-top: 10px;
}

.start-btn:hover {
  transform: translateY(-2px);
}

.start-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(255,107,107,0.95);
  color: #fff;
  padding: 12px 25px;
  border-radius: 20px;
  font-size: 16px;
  font-weight: bold;
  opacity: 0;
  transition: all 0.2s;
  z-index: 50;
  pointer-events: none;
}

.indicator.show {
  opacity: 1;
}

.message {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0);
  background: #fff;
  padding: 20px 40px;
  border-radius: 16px;
  font-size: 20px;
  font-weight: bold;
  box-shadow: 0 8px 30px rgba(0,0,0,0.3);
  z-index: 60;
  transition: all 0.2s;
}

.message.show {
  transform: translate(-50%, -50%) scale(1);
}

.message.correct {
  color: #4CAF50;
}

.message.wrong {
  color: #f44336;
}

.resize-handle {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 20px;
  height: 20px;
  cursor: nwse-resize;
  background: linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.3) 50%);
  border-bottom-right-radius: 14px;
}
</style>

<div class="window-header">
  <div class="window-title">
    <span>🐱</span>
    <span>萝卜纸巾猫小游戏</span>
  </div>
  <div class="window-controls">
    <button class="window-btn minimize-btn" title="最小化">−</button>
    <button class="window-btn close-btn" title="关闭">×</button>
  </div>
</div>

<div class="game-content">
  <div class="stats-row">
    <div class="stat-item">
      <div class="stat-label">正确</div>
      <div class="stat-value" id="correct">0</div>
    </div>
    <div class="stat-item">
      <div class="stat-label">错误</div>
      <div class="stat-value" id="wrong">0</div>
    </div>
    <div class="stat-item">
      <div class="stat-label">总轮数</div>
      <div class="stat-value" id="rounds">0</div>
    </div>
    <div class="stat-item">
      <div class="stat-label">小零食</div>
      <div class="stat-value" id="snacks">5</div>
    </div>
  </div>

  <div class="instruction" id="instruction">
    第一步：从上方选择一个物品作为正确答案<br>
    第二步：点击"开始游戏"，观察猫咪猜测<br>
    第三步：猫咪选对后可以鼓励，选错可以安慰
  </div>

  <div class="section">
    <div class="section-title">
      <span>👤</span>
      <span>主人出题区</span>
    </div>
    <div class="items-row" id="userItems"></div>
  </div>

  <div class="cat-section">
    <div class="cat-container">
      <div class="cat-avatar" id="catAvatar">😺</div>
      <div class="cat-thought" id="catThought">等待主人出题...</div>
    </div>
    
    <div class="section-title">
      <span>🐱</span>
      <span>大开门的选择区</span>
    </div>
    <div class="cat-items" id="catItems">
      <div class="cat-card">
        <div class="item-emoji">❓</div>
        <div class="item-name">等待出题</div>
      </div>
    </div>
    
    <button class="start-btn" id="startBtn">🎯 开始游戏</button>
    
    <div class="action-btns">
      <button class="action-btn zhenbang-btn" id="zhenbangBtn">
        <span class="btn-emoji">👏</span>
        <span class="btn-text">蒸蚌！</span>
      </button>
      <button class="action-btn snack-btn" id="snackBtn">
        <span class="btn-emoji">🐟</span>
        <span class="btn-text">小零食</span>
        <span class="btn-count" id="snackBadge">5</span>
      </button>
    </div>
  </div>
</div>

<div class="indicator" id="indicator">大开门正在猜测...</div>
<div class="message" id="message"></div>
<div class="resize-handle"></div>
`;

  document.body.appendChild(game);

  // 获取元素
  const $ = id => document.getElementById(id);
  const userItems = $('userItems');
  const catItems = $('catItems');
  const startBtn = $('startBtn');
  const zhenbangBtn = $('zhenbangBtn');
  const snackBtn = $('snackBtn');
  const catAvatar = $('catAvatar');
  const catThought = $('catThought');
  const instruction = $('instruction');
  const indicator = $('indicator');
  const message = $('message');
  const minimizeBtn = document.querySelector('.minimize-btn');
  const closeBtn = document.querySelector('.close-btn');
  const windowHeader = document.querySelector('.window-header');

  // 拖拽功能
  function initDrag() {
    windowHeader.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDrag);
  }

  function startDrag(e) {
    if (e.target.closest('.window-btn')) return;
    isDragging = true;
    const rect = game.getBoundingClientRect();
    dragOffset.x = e.clientX - rect.left;
    dragOffset.y = e.clientY - rect.top;
    game.style.cursor = 'move';
  }

  function drag(e) {
    if (!isDragging) return;
    e.preventDefault();
    
    windowPosition.x = e.clientX - dragOffset.x;
    windowPosition.y = e.clientY - dragOffset.y;
    
    // 限制窗口在可视区域内
    const maxX = window.innerWidth - game.offsetWidth;
    const maxY = window.innerHeight - game.offsetHeight;
    
    windowPosition.x = Math.max(0, Math.min(windowPosition.x, maxX));
    windowPosition.y = Math.max(0, Math.min(windowPosition.y, maxY));
    
    game.style.left = windowPosition.x + 'px';
    game.style.top = windowPosition.y + 'px';
  }

  function stopDrag() {
    isDragging = false;
    game.style.cursor = 'default';
  }

  // 窗口控制
  minimizeBtn.addEventListener('click', () => {
    state.minimized = !state.minimized;
    game.classList.toggle('minimized', state.minimized);
    minimizeBtn.textContent = state.minimized ? '+' : '−';
  });

  closeBtn.addEventListener('click', () => {
    game.remove();
  });

  // 初始化用户选项
  function initItems() {
    userItems.innerHTML = '';
    state.items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'item-card';
      card.innerHTML = `<div class="item-emoji">${item.emoji}</div><div class="item-name">${item.name}</div>`;
      card.onclick = () => selectItem(item);
      userItems.appendChild(card);
    });
  }

  // 选择物品
  function selectItem(item) {
    if (state.guessing) return;
    document.querySelectorAll('#userItems .item-card').forEach(c => c.classList.remove('selected'));
    event.currentTarget.classList.add('selected');
    state.selected = item;
    instruction.innerHTML = `已选择：<strong>${item.name}</strong><br>点击"开始游戏"，看大开门能否猜对！`;
    startBtn.disabled = false;
    catThought.textContent = '主人选好了吗？';
  }

  // 开始游戏
  function startGame() {
    if (!state.selected || state.guessing) return;
    state.guessing = true;
    startBtn.disabled = true;
    document.querySelectorAll('#userItems .item-card').forEach(c => c.style.pointerEvents = 'none');

    state.shuffled = [...state.items].sort(() => Math.random() - 0.5);
    catItems.innerHTML = '';
    state.shuffled.forEach((item, i) => {
      const card = document.createElement('div');
      card.className = 'cat-card';
      card.id = 'catCard' + i;
      card.innerHTML = `<div class="item-emoji">${item.emoji}</div><div class="item-name">${item.name}</div>`;
      catItems.appendChild(card);
    });

    catAvatar.textContent = '🤔';
    catThought.textContent = '让我想想...';
    indicator.classList.add('show');

    setTimeout(() => guessAnimation(), 500);
  }

  // 猜测动画
  function guessAnimation() {
    const cards = document.querySelectorAll('.cat-card');
    let correctIdx = state.shuffled.findIndex(i => i.id === state.selected.id);
    let currentIdx = Math.floor(Math.random() * cards.length);
    let attempts = 0;
    const maxAttempts = Math.floor(Math.random() * 5) + 3;
    const willCorrect = Math.random() > 0.5;

    function move() {
      cards.forEach(c => c.classList.remove('highlight'));
      cards[currentIdx].classList.add('highlight');

      const thoughts = ['这个？', '还是这个？', '让我看看...', '嗯...', '这个看起来不错'];
      catThought.textContent = thoughts[Math.floor(Math.random() * thoughts.length)];
      attempts++;

      let stop = false;
      let final = currentIdx;

      if (willCorrect && currentIdx === correctIdx && attempts >= maxAttempts) {
        stop = true;
        final = correctIdx;
      } else if (!willCorrect && attempts >= maxAttempts) {
        stop = true;
        final = (currentIdx === correctIdx) ? (currentIdx + 1) % cards.length : currentIdx;
      }

      if (stop) {
        setTimeout(() => makeChoice(final, correctIdx), 600);
      } else {
        currentIdx = (currentIdx + 1) % cards.length;
        state.timer = setTimeout(move, 700);
      }
    }
    move();
  }

  // 做出选择
  function makeChoice(chosen, correct) {
    state.guessing = false;
    state.rounds++;
    clearTimeout(state.timer);
    indicator.classList.remove('show');

    const isCorrect = chosen === correct;
    const card = $('catCard' + chosen);

    if (isCorrect) {
      state.correct++;
      card.classList.remove('highlight');
      card.classList.add('correct');
      catAvatar.textContent = '😸';
      catThought.textContent = '我选对了吗？';
      showMessage('correct', '选对了！');
      instruction.innerHTML = '太棒了！大开门猜对了！<br>可以鼓励它或给它小零食！';
    } else {
      state.wrong++;
      card.classList.remove('highlight');
      card.classList.add('wrong');
      catAvatar.textContent = '😿';
      catThought.textContent = '啊，我选错了...';
      showMessage('wrong', '选错了！');
      instruction.innerHTML = '哎呀，大开门选错了！<br>可以安慰它或给它小零食！';
    }

    updateStats();
    zhenbangBtn.disabled = false;
    snackBtn.disabled = state.snacks <= 0;
  }

  // 显示消息
  function showMessage(type, text) {
    message.textContent = text;
    message.className = 'message ' + type + ' show';
    setTimeout(() => message.classList.remove('show'), 1500);
  }

  // 更新统计
  function updateStats() {
    $('correct').textContent = state.correct;
    $('wrong').textContent = state.wrong;
    $('rounds').textContent = state.rounds;
    $('snacks').textContent = state.snacks;
    $('snackBadge').textContent = state.snacks;
  }

  // 蒸蚌
  function zhenbang() {
    catAvatar.textContent = '😻';
    catThought.textContent = '真棒！！';
    zhenbangBtn.disabled = true;
    snackBtn.disabled = true;
    setTimeout(resetRound, 1500);
  }

  // 给零食
  function giveSnack() {
    if (state.snacks <= 0) return;
    state.snacks--;
    updateStats();
    catAvatar.textContent = '😋';
    catThought.textContent = '好好吃！谢谢主人！';
    zhenbangBtn.disabled = true;
    snackBtn.disabled = true;
    setTimeout(resetRound, 1500);
  }

  // 重置回合
  function resetRound() {
    state.selected = null;
    document.querySelectorAll('#userItems .item-card').forEach(c => {
      c.classList.remove('selected');
      c.style.pointerEvents = '';
    });
    catItems.innerHTML = '<div class="cat-card"><div class="item-emoji">❓</div><div class="item-name">等待出题</div></div>';
    catAvatar.textContent = '😺';
    catThought.textContent = '等待主人出题...';
    instruction.innerHTML = '第一步：从上方选择一个物品作为正确答案<br>第二步：点击"开始游戏"，观察猫咪猜测<br>第三步：猫咪选对后可以鼓励，选错可以安慰';
    startBtn.disabled = true;
    snackBtn.disabled = state.snacks <= 0;
  }

  // 绑定事件
  startBtn.onclick = startGame;
  zhenbangBtn.onclick = zhenbang;
  snackBtn.onclick = giveSnack;

  // 初始化
  startBtn.disabled = true;
  zhenbangBtn.disabled = true;
  snackBtn.disabled = true;
  initItems();
  initDrag();

  console.log('🐱 悬浮游戏窗口已启动！');
})();