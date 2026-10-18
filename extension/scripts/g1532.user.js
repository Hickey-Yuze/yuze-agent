(function() {
  if (document.getElementById('freecell-game-root')) {
    document.getElementById('freecell-game-root').remove();
  }

  const root = document.createElement('div');
  root.id = 'freecell-game-root';
  root.innerHTML = `
<style>
  #freecell-game-root {
    position: fixed; inset: 0; z-index: 999999;
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    background: linear-gradient(135deg, #1a472a 0%, #0d2818 50%, #1a472a 100%);
    display: flex; flex-direction: column; align-items: center;
    user-select: none; overflow: hidden;
  }
  #freecell-game-root * { box-sizing: border-box; margin: 0; padding: 0; }
  .fc-header {
    width: 100%; padding: 8px 16px;
    display: flex; align-items: center; justify-content: space-between;
    background: rgba(0,0,0,0.3); color: #e0d8c8;
  }
  .fc-header h1 { font-size: 18px; font-weight: 700; letter-spacing: 1px; }
  .fc-header-info { display: flex; gap: 20px; font-size: 13px; color: #b8c4a0; }
  .fc-header-info span { display: flex; align-items: center; gap: 4px; }
  .fc-header-actions { display: flex; gap: 8px; }
  .fc-btn {
    padding: 5px 14px; border: 1px solid rgba(255,255,255,0.25);
    border-radius: 6px; background: rgba(255,255,255,0.1);
    color: #e0d8c8; font-size: 12px; cursor: pointer;
    transition: all 0.2s;
  }
  .fc-btn:hover { background: rgba(255,255,255,0.2); border-color: rgba(255,255,255,0.4); }
  .fc-btn-close { background: rgba(200,50,50,0.4); border-color: rgba(200,50,50,0.5); }
  .fc-btn-close:hover { background: rgba(200,50,50,0.6); }
  .fc-board {
    flex: 1; width: 100%; max-width: 780px;
    padding: 12px 8px 0; display: flex; flex-direction: column;
  }
  .fc-top-row {
    display: flex; justify-content: space-between; margin-bottom: 12px; gap: 8px;
  }
  .fc-cell-group { display: flex; gap: 6px; }
  .fc-cell {
    width: 82px; height: 112px;
    border: 2px dashed rgba(255,255,255,0.2);
    border-radius: 8px; position: relative;
    display: flex; align-items: center; justify-content: center;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .fc-cell.highlight {
    border-color: #ffd700; box-shadow: 0 0 12px rgba(255,215,0,0.4);
  }
  .fc-cell .fc-label {
    position: absolute; bottom: 2px; font-size: 9px;
    color: rgba(255,255,255,0.2); text-transform: uppercase; letter-spacing: 1px;
  }
  .fc-tableau {
    flex: 1; display: flex; gap: 6px; justify-content: center;
  }
  .fc-column {
    width: 82px; position: relative; min-height: 112px;
    cursor: pointer;
  }
  .fc-card {
    width: 80px; height: 110px; border-radius: 7px;
    position: absolute; left: 0;
    background: #fff; border: 1px solid #ccc;
    box-shadow: 0 1px 3px rgba(0,0,0,0.25);
    display: flex; flex-direction: column;
    padding: 4px 6px; cursor: pointer;
    transition: transform 0.15s, box-shadow 0.15s;
  }
  .fc-card.selected {
    transform: translateY(-6px);
    box-shadow: 0 6px 20px rgba(255,215,0,0.5);
    border-color: #ffd700; z-index: 900 !important;
  }
  .fc-card:hover:not(.selected) { box-shadow: 0 2px 8px rgba(0,0,0,0.35); }
  .fc-card .fc-card-rank { font-size: 15px; font-weight: 700; line-height: 1; }
  .fc-card .fc-card-suit-top { font-size: 12px; line-height: 1; margin-top: 1px; }
  .fc-card .fc-card-suit-center { font-size: 28px; position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); opacity: 0.5; }
  .fc-card .fc-card-suit-bottom { font-size: 12px; line-height: 1; position: absolute; bottom: 4px; right: 6px; transform: rotate(180deg); }
  .fc-card.red { color: #c0392b; }
  .fc-card.black { color: #2c3e50; }
  .fc-card-back {
    background: linear-gradient(135deg, #2980b9 0%, #1a5276 100%);
    border-color: #1a5276;
  }
  .fc-card-back::after {
    content: '♠♥♦♣'; position: absolute; inset: 0;
    display: flex; align-items: center; justify-content: center;
    color: rgba(255,255,255,0.15); font-size: 20px; letter-spacing: 2px;
  }
  .fc-foundation-card { position: relative; }

  .fc-win-overlay {
    position: absolute; inset: 0; z-index: 1000;
    background: rgba(0,0,0,0.7);
    display: none; align-items: center; justify-content: center;
    flex-direction: column; gap: 20px;
  }
  .fc-win-overlay.show { display: flex; }
  .fc-win-text {
    font-size: 48px; font-weight: 900; color: #ffd700;
    text-shadow: 0 0 30px rgba(255,215,0,0.5);
    animation: fc-pulse 1.5s infinite;
  }
  @keyframes fc-pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }
  .fc-win-stats { color: #b8c4a0; font-size: 16px; text-align: center; line-height: 1.8; }

  .fc-cards-rain {
    position: absolute; inset: 0; pointer-events: none; overflow: hidden; z-index: 999;
  }
  .fc-rain-card {
    position: absolute; font-size: 30px;
    animation: fc-fall linear forwards;
    opacity: 0.8;
  }
  @keyframes fc-fall {
    0% { transform: translateY(-50px) rotate(0deg); opacity: 0.9; }
    100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
  }
</style>
<div class="fc-header">
  <h1>♠ 空当接龙</h1>
  <div class="fc-header-info">
    <span>步数: <b id="fc-moves">0</b></span>
    <span>时间: <b id="fc-timer">00:00</b></span>
  </div>
  <div class="fc-header-actions">
    <button class="fc-btn" id="fc-undo">↩ 撤销</button>
    <button class="fc-btn" id="fc-hint">💡 提示</button>
    <button class="fc-btn" id="fc-new">🔄 新游戏</button>
    <button class="fc-btn fc-btn-close" id="fc-close">✕ 关闭</button>
  </div>
</div>
<div class="fc-board">
  <div class="fc-top-row">
    <div class="fc-cell-group" id="fc-freecells"></div>
    <div class="fc-cell-group" id="fc-foundations"></div>
  </div>
  <div class="fc-tableau" id="fc-tableau"></div>
</div>
<div class="fc-win-overlay" id="fc-win-overlay">
  <div class="fc-win-text">🎉 恭喜通关！</div>
  <div class="fc-win-stats" id="fc-win-stats"></div>
  <button class="fc-btn" id="fc-win-new" style="font-size:16px;padding:10px 30px;">再来一局</button>
</div>
<div class="fc-cards-rain" id="fc-cards-rain"></div>
`;

  document.body.appendChild(root);

  // === Game Logic ===
  const SUITS = ['♠', '♥', '♦', '♣'];
  const SUIT_COLORS = { '♠': 'black', '♥': 'red', '♦': 'red', '♣': 'black' };
  const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const RANK_VALUES = {};
  RANKS.forEach((r, i) => RANK_VALUES[r] = i);

  let freeCells, foundations, tableau, selected, moveCount, history, timerInterval, seconds, gameWon;

  function createDeck() {
    const deck = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({ suit, rank, color: SUIT_COLORS[suit] });
      }
    }
    return deck;
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function initGame() {
    gameWon = false;
    moveCount = 0;
    seconds = 0;
    history = [];
    selected = null;
    clearInterval(timerInterval);
    timerInterval = null;

    freeCells = [null, null, null, null];
    foundations = [[], [], [], []];
    tableau = [[], [], [], [], [], [], [], []];

    const deck = shuffle(createDeck());
    let idx = 0;
    for (let i = 0; i < 52; i++) {
      tableau[i % 8].push(deck[i]);
    }

    document.getElementById('fc-moves').textContent = '0';
    document.getElementById('fc-timer').textContent = '00:00';
    document.getElementById('fc-win-overlay').classList.remove('show');
    document.getElementById('fc-cards-rain').innerHTML = '';

    render();
  }

  function startTimer() {
    if (timerInterval) return;
    timerInterval = setInterval(() => {
      seconds++;
      const m = String(Math.floor(seconds / 60)).padStart(2, '0');
      const s = String(seconds % 60).padStart(2, '0');
      document.getElementById('fc-timer').textContent = `${m}:${s}`;
    }, 1000);
  }

  function saveState() {
    history.push({
      freeCells: deepCopy(freeCells),
      foundations: deepCopy(foundations),
      tableau: deepCopy(tableau),
      moveCount
    });
    if (history.length > 200) history.shift();
  }

  function undo() {
    if (history.length === 0 || gameWon) return;
    const state = history.pop();
    freeCells = state.freeCells;
    foundations = state.foundations;
    tableau = state.tableau;
    moveCount = state.moveCount;
    selected = null;
    document.getElementById('fc-moves').textContent = moveCount;
    render();
  }

  function cardHTML(card, extraClass = '') {
    if (!card) return '';
    const colorClass = card.color;
    return `<div class="fc-card ${colorClass} ${extraClass}" data-rank="${card.rank}" data-suit="${card.suit}">
      <span class="fc-card-rank">${card.rank}</span>
      <span class="fc-card-suit-top">${card.suit}</span>
      <span class="fc-card-suit-center">${card.suit}</span>
      <span class="fc-card-suit-bottom">${card.suit}</span>
    </div>`;
  }

  function render() {
    // Free cells
    const fcEl = document.getElementById('fc-freecells');
    fcEl.innerHTML = '';
    for (let i = 0; i < 4; i++) {
      const cell = document.createElement('div');
      cell.className = 'fc-cell';
      cell.dataset.type = 'freecell';
      cell.dataset.index = i;
      cell.innerHTML = '<span class="fc-label">空闲</span>';
      if (freeCells[i]) {
        const isSelected = selected && selected.source === 'freecell' && selected.index === i;
        cell.innerHTML += cardHTML(freeCells[i], isSelected ? 'selected' : '');
      }
      if (selected && !freeCells[i]) cell.classList.add('highlight');
      fcEl.appendChild(cell);
    }

    // Foundations
    const fnEl = document.getElementById('fc-foundations');
    fnEl.innerHTML = '';
    for (let i = 0; i < 4; i++) {
      const cell = document.createElement('div');
      cell.className = 'fc-cell';
      cell.dataset.type = 'foundation';
      cell.dataset.index = i;
      cell.innerHTML = `<span class="fc-label">${SUITS[i]}</span>`;
      const pile = foundations[i];
      if (pile.length > 0) {
        const topCard = pile[pile.length - 1];
        const isSelected = selected && selected.source === 'foundation' && selected.index === i;
        cell.innerHTML += cardHTML(topCard, isSelected ? 'selected' : '');
      }
      fnEl.appendChild(cell);
    }

    // Tableau
    const tbEl = document.getElementById('fc-tableau');
    tbEl.innerHTML = '';
    for (let col = 0; col < 8; col++) {
      const colDiv = document.createElement('div');
      colDiv.className = 'fc-column';
      colDiv.dataset.type = 'tableau';
      colDiv.dataset.index = col;

      const cards = tableau[col];
      const offset = Math.min(28, cards.length > 0 ? Math.max(18, (400) / Math.max(cards.length, 1)) : 28);
      cards.forEach((card, row) => {
        const isSelected = selected && selected.source === 'tableau' && selected.index === col && row >= selected.cardIndex;
        const div = document.createElement('div');
        div.innerHTML = cardHTML(card, isSelected ? 'selected' : '');
        const cardEl = div.firstElementChild;
        cardEl.style.top = (row * offset) + 'px';
        cardEl.style.zIndex = row + 1;
        cardEl.dataset.row = row;
        colDiv.appendChild(cardEl);
      });

      colDiv.style.minHeight = cards.length > 0 ? (cards.length * offset + 110) + 'px' : '112px';
      if (selected && cards.length === 0) colDiv.style.border = '2px dashed rgba(255,215,0,0.4)';
      tbEl.appendChild(colDiv);
    }
  }

  function canMoveToFoundation(card, foundIdx) {
    const pile = foundations[foundIdx];
    if (pile.length === 0) {
      return card.rank === 'A' && SUITS[foundIdx] === card.suit;
    }
    const top = pile[pile.length - 1];
    return card.suit === top.suit && RANK_VALUES[card.rank] === RANK_VALUES[top.rank] + 1;
  }

  function canMoveToTableau(card, colIdx) {
    const col = tableau[colIdx];
    if (col.length === 0) return true;
    const top = col[col.length - 1];
    return card.color !== top.color && RANK_VALUES[card.rank] === RANK_VALUES[top.rank] - 1;
  }

  function maxMovable(targetEmpty) {
    let freeCount = freeCells.filter(c => c === null).length;
    let emptyCols = tableau.filter(c => c.length === 0).length;
    if (targetEmpty) emptyCols = Math.max(0, emptyCols - 1);
    return (1 + freeCount) * Math.pow(2, emptyCols);
  }

  function getMovableRun(colIdx) {
    const col = tableau[colIdx];
    if (col.length === 0) return [];
    let runStart = col.length - 1;
    while (runStart > 0) {
      const curr = col[runStart];
      const prev = col[runStart - 1];
      if (curr.color !== prev.color && RANK_VALUES[curr.rank] === RANK_VALUES[prev.rank] - 1) {
        runStart--;
      } else {
        break;
      }
    }
    return col.slice(runStart);
  }

  function autoMoveToFoundation(card) {
    for (let i = 0; i < 4; i++) {
      if (canMoveToFoundation(card, i)) {
        return i;
      }
    }
    return -1;
  }

  function safeAutoMove() {
    let moved = true;
    while (moved) {
      moved = false;
      // Check free cells
      for (let i = 0; i < 4; i++) {
        if (freeCells[i]) {
          const fi = autoMoveToFoundation(freeCells[i]);
          if (fi !== -1 && isSafeToAutoMove(freeCells[i])) {
            foundations[fi].push(freeCells[i]);
            freeCells[i] = null;
            moved = true;
          }
        }
      }
      // Check tableau tops
      for (let col = 0; col < 8; col++) {
        if (tableau[col].length > 0) {
          const card = tableau[col][tableau[col].length - 1];
          const fi = autoMoveToFoundation(card);
          if (fi !== -1 && isSafeToAutoMove(card)) {
            foundations[fi].push(card);
            tableau[col].pop();
            moved = true;
          }
        }
      }
    }
  }

  function isSafeToAutoMove(card) {
    if (card.rank === 'A' || card.rank === '2') return true;
    const val = RANK_VALUES[card.rank];
    // Safe if both opposite-color foundations have at least val-1
    for (const suit of SUITS) {
      if (SUIT_COLORS[suit] !== card.color) {
        const fIdx = SUITS.indexOf(suit);
        const pile = foundations[fIdx];
        const topVal = pile.length > 0 ? RANK_VALUES[pile[pile.length - 1].rank] : -1;
        if (topVal < val - 1) return false;
      }
    }
    return true;
  }

  function checkWin() {
    const total = foundations.reduce((s, p) => s + p.length, 0);
    if (total === 52) {
      gameWon = true;
      clearInterval(timerInterval);
      const m = String(Math.floor(seconds / 60)).padStart(2, '0');
      const s2 = String(seconds % 60).padStart(2, '0');
      document.getElementById('fc-win-stats').innerHTML =
        `用时: ${m}:${s2}<br>步数: ${moveCount}`;
      document.getElementById('fc-win-overlay').classList.add('show');
      celebrateWin();
    }
  }

  function celebrateWin() {
    const rain = document.getElementById('fc-cards-rain');
    const symbols = ['♠', '♥', '♦', '♣', '🂡', '🂱', '🃁', '🃑'];
    for (let i = 0; i < 40; i++) {
      const el = document.createElement('div');
      el.className = 'fc-rain-card';
      el.textContent = symbols[Math.floor(Math.random() * symbols.length)];
      el.style.left = Math.random() * 100 + '%';
      el.style.animationDuration = (2 + Math.random() * 3) + 's';
      el.style.animationDelay = (Math.random() * 2) + 's';
      el.style.color = ['#ffd700', '#ff6b6b', '#4ecdc4', '#fff'][Math.floor(Math.random() * 4)];
      el.style.fontSize = (20 + Math.random() * 30) + 'px';
      rain.appendChild(el);
    }
  }

  function findHint() {
    // Try to move to foundation
    for (let col = 0; col < 8; col++) {
      if (tableau[col].length > 0) {
        const card = tableau[col][tableau[col].length - 1];
        for (let f = 0; f < 4; f++) {
          if (canMoveToFoundation(card, f)) {
            return { source: 'tableau', index: col, cardIndex: tableau[col].length - 1, target: { type: 'foundation', index: f } };
          }
        }
      }
    }
    for (let i = 0; i < 4; i++) {
      if (freeCells[i]) {
        for (let f = 0; f < 4; f++) {
          if (canMoveToFoundation(freeCells[i], f)) {
            return { source: 'freecell', index: i, target: { type: 'foundation', index: f } };
          }
        }
      }
    }
    // Try tableau to tableau
    for (let col = 0; col < 8; col++) {
      const run = getMovableRun(col);
      if (run.length > 0) {
        for (let target = 0; target < 8; target++) {
          if (target === col) continue;
          if (canMoveToTableau(run[0], target)) {
            const isTargetEmpty = tableau[target].length === 0;
            if (run.length <= maxMovable(isTargetEmpty)) {
              // Don't suggest moving from one empty spot to another, or moving whole col to empty
              if (!(isTargetEmpty && run.length === tableau[col].length)) {
                return { source: 'tableau', index: col, cardIndex: tableau[col].length - run.length, target: { type: 'tableau', index: target } };
              }
            }
          }
        }
      }
    }
    // Free cell to tableau
    for (let i = 0; i < 4; i++) {
      if (freeCells[i]) {
        for (let col = 0; col < 8; col++) {
          if (canMoveToTableau(freeCells[i], col)) {
            return { source: 'freecell', index: i, target: { type: 'tableau', index: col } };
          }
        }
      }
    }
    // Tableau to free cell
    for (let col = 0; col < 8; col++) {
      if (tableau[col].length > 0) {
        for (let i = 0; i < 4; i++) {
          if (!freeCells[i]) {
            return { source: 'tableau', index: col, cardIndex: tableau[col].length - 1, target: { type: 'freecell', index: i } };
          }
        }
      }
    }
    return null;
  }

  function handleClick(e) {
    if (gameWon) return;

    const cardEl = e.target.closest('.fc-card');
    const cellEl = e.target.closest('.fc-cell');
    const colEl = e.target.closest('.fc-column');

    if (!cardEl && !cellEl && !colEl) return;

    let clickSource = null;

    // Determine what was clicked
    if (cardEl) {
      const col = cardEl.closest('.fc-column');
      const cell = cardEl.closest('.fc-cell');

      if (col) {
        const colIdx = parseInt(col.dataset.index);
        const row = parseInt(cardEl.dataset.row);
        clickSource = { type: 'tableau', index: colIdx, cardIndex: row };
      } else if (cell) {
        const cellType = cell.dataset.type;
        const cellIdx = parseInt(cell.dataset.index);
        clickSource = { type: cellType, index: cellIdx };
      }
    } else if (cellEl) {
      const cellType = cellEl.dataset.type;
      const cellIdx = parseInt(cellEl.dataset.index);
      clickSource = { type: cellType, index: cellIdx };
    } else if (colEl) {
      const colIdx = parseInt(colEl.dataset.index);
      if (tableau[colIdx].length === 0) {
        clickSource = { type: 'tableau', index: colIdx, isEmpty: true };
      }
    }

    if (!clickSource) return;

    // Double click auto-move to foundation
    if (e.detail === 2) {
      selected = null;
      let card = null;
      let sourceInfo = null;
      if (clickSource.type === 'tableau' && !clickSource.isEmpty) {
        const col = clickSource.index;
        if (tableau[col].length > 0) {
          card = tableau[col][tableau[col].length - 1];
          if (clickSource.cardIndex === tableau[col].length - 1) {
            sourceInfo = { type: 'tableau', index: col };
          }
        }
      } else if (clickSource.type === 'freecell') {
        card = freeCells[clickSource.index];
        sourceInfo = { type: 'freecell', index: clickSource.index };
      }

      if (card && sourceInfo) {
        for (let f = 0; f < 4; f++) {
          if (canMoveToFoundation(card, f)) {
            saveState();
            startTimer();
            if (sourceInfo.type === 'tableau') {
              tableau[sourceInfo.index].pop();
            } else {
              freeCells[sourceInfo.index] = null;
            }
            foundations[f].push(card);
            moveCount++;
            document.getElementById('fc-moves').textContent = moveCount;
            safeAutoMove();
            render();
            checkWin();
            return;
          }
        }
      }
      return;
    }

    // Handle selection / movement
    if (selected) {
      // Try to move to the clicked location
      const moved = tryMove(clickSource);
      if (!moved) {
        // Select new card instead
        selected = null;
        trySelect(clickSource);
      } else {
        selected = null;
        safeAutoMove();
        render();
        checkWin();
      }
    } else {
      trySelect(clickSource);
    }

    render();
  }

  function trySelect(clickSource) {
    if (clickSource.type === 'tableau' && !clickSource.isEmpty) {
      const col = clickSource.index;
      const row = clickSource.cardIndex;
      if (row === undefined) return;
      const run = getMovableRun(col);
      const runStart = tableau[col].length - run.length;
      if (row >= runStart) {
        selected = { source: 'tableau', index: col, cardIndex: row };
      }
    } else if (clickSource.type === 'freecell') {
      if (freeCells[clickSource.index]) {
        selected = { source: 'freecell', index: clickSource.index };
      }
    } else if (clickSource.type === 'foundation') {
      const pile = foundations[clickSource.index];
      if (pile.length > 0) {
        selected = { source: 'foundation', index: clickSource.index };
      }
    }
  }

  function tryMove(target) {
    if (!selected) return false;

    // Get the cards to move
    let cardsToMove = [];
    let sourceInfo = selected;

    if (sourceInfo.source === 'tableau') {
      cardsToMove = tableau[sourceInfo.index].slice(sourceInfo.cardIndex);
    } else if (sourceInfo.source === 'freecell') {
      const card = freeCells[sourceInfo.index];
      if (!card) return false;
      cardsToMove = [card];
    } else if (sourceInfo.source === 'foundation') {
      const pile = foundations[sourceInfo.index];
      if (pile.length === 0) return false;
      cardsToMove = [pile[pile.length - 1]];
    }

    if (cardsToMove.length === 0) return false;

    // Try to place at target
    if (target.type === 'foundation') {
      if (cardsToMove.length !== 1) return false;
      if (canMoveToFoundation(cardsToMove[0], target.index)) {
        saveState();
        startTimer();
        removeFromSource(sourceInfo);
        foundations[target.index].push(cardsToMove[0]);
        moveCount++;
        document.getElementById('fc-moves').textContent = moveCount;
        return true;
      }
    } else if (target.type === 'freecell') {
      if (cardsToMove.length !== 1) return false;
      if (freeCells[target.index] !== null) return false;
      saveState();
      startTimer();
      removeFromSource(sourceInfo);
      freeCells[target.index] = cardsToMove[0];
      moveCount++;
      document.getElementById('fc-moves').textContent = moveCount;
      return true;
    } else if (target.type === 'tableau') {
      const isTargetEmpty = tableau[target.index].length === 0;
      if (canMoveToTableau(cardsToMove[0], target.index)) {
        if (cardsToMove.length <= maxMovable(isTargetEmpty)) {
          saveState();
          startTimer();
          removeFromSource(sourceInfo);
          tableau[target.index].push(...cardsToMove);
          moveCount++;
          document.getElementById('fc-moves').textContent = moveCount;
          return true;
        }
      }
    }

    return false;
  }

  function removeFromSource(sourceInfo) {
    if (sourceInfo.source === 'tableau') {
      tableau[sourceInfo.index].splice(sourceInfo.cardIndex);
    } else if (sourceInfo.source === 'freecell') {
      freeCells[sourceInfo.index] = null;
    } else if (sourceInfo.source === 'foundation') {
      foundations[sourceInfo.index].pop();
    }
  }

  // Event listeners
  root.addEventListener('click', handleClick);

  document.getElementById('fc-undo').addEventListener('click', (e) => {
    e.stopPropagation();
    undo();
  });

  document.getElementById('fc-new').addEventListener('click', (e) => {
    e.stopPropagation();
    initGame();
  });

  document.getElementById('fc-close').addEventListener('click', (e) => {
    e.stopPropagation();
    clearInterval(timerInterval);
    root.remove();
  });

  document.getElementById('fc-hint').addEventListener('click', (e) => {
    e.stopPropagation();
    const hint = findHint();
    if (hint) {
      selected = null;
      if (hint.source === 'tableau') {
        selected = { source: 'tableau', index: hint.index, cardIndex: hint.cardIndex };
      } else if (hint.source === 'freecell') {
        selected = { source: 'freecell', index: hint.index };
      }
      render();
      // Highlight target
      setTimeout(() => {
        let targetEl;
        if (hint.target.type === 'foundation') {
          targetEl = root.querySelector(`.fc-cell[data-type="foundation"][data-index="${hint.target.index}"]`);
        } else if (hint.target.type === 'freecell') {
          targetEl = root.querySelector(`.fc-cell[data-type="freecell"][data-index="${hint.target.index}"]`);
        } else if (hint.target.type === 'tableau') {
          targetEl = root.querySelector(`.fc-column[data-index="${hint.target.index}"]`);
        }
        if (targetEl) {
          targetEl.style.boxShadow = '0 0 15px rgba(255,215,0,0.7)';
          targetEl.style.transition = 'box-shadow 0.3s';
          setTimeout(() => { targetEl.style.boxShadow = ''; }, 1500);
        }
      }, 100);
    } else {
      selected = null;
      render();
    }
  });

  document.getElementById('fc-win-new').addEventListener('click', (e) => {
    e.stopPropagation();
    initGame();
  });

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (!document.getElementById('freecell-game-root')) return;
    if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      undo();
    }
    if (e.key === 'Escape') {
      selected = null;
      render();
    }
  });

  // Start game
  initGame();
})();