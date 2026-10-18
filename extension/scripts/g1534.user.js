(function() {
  if (document.getElementById('__game_2048_root__')) return;

  const root = document.createElement('div');
  root.id = '__game_2048_root__';
  root.innerHTML = `
<style>
  #__game_2048_root__ {
    position: fixed; inset: 0; z-index: 99999;
    background: #faf8ef; font-family: 'Clear Sans', 'Helvetica Neue', Arial, sans-serif;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    user-select: none; -webkit-user-select: none; overflow: hidden;
  }
  #__game_2048_root__ * { box-sizing: border-box; }
  .game-header {
    display: flex; align-items: center; justify-content: space-between;
    width: 340px; margin-bottom: 16px;
  }
  .game-title {
    font-size: 48px; font-weight: 700; color: #776e65; margin: 0;
  }
  .score-container { display: flex; gap: 8px; }
  .score-box {
    background: #bbada0; border-radius: 6px; padding: 8px 16px;
    text-align: center; min-width: 70px; position: relative;
  }
  .score-label { color: #eee4da; font-size: 11px; font-weight: 600; text-transform: uppercase; }
  .score-value { color: #fff; font-size: 20px; font-weight: 700; }
  .game-subtitle { color: #776e65; font-size: 14px; width: 340px; margin-bottom: 12px; }
  .game-controls { display: flex; gap: 8px; width: 340px; margin-bottom: 16px; }
  .game-btn {
    background: #8f7a66; color: #f9f6f2; border: none; border-radius: 6px;
    padding: 10px 20px; font-size: 14px; font-weight: 700; cursor: pointer;
    transition: background 0.15s;
  }
  .game-btn:hover { background: #9f8b77; }
  .game-btn-close {
    background: #776e65; margin-left: auto;
  }
  .game-btn-close:hover { background: #8a7e74; }
  .grid-container {
    background: #bbada0; border-radius: 8px; padding: 10px;
    display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;
    width: 340px; height: 340px; position: relative;
  }
  .cell-bg {
    background: rgba(238, 228, 218, 0.35); border-radius: 4px;
    width: 75px; height: 75px;
  }
  .tiles-layer {
    position: absolute; inset: 10px;
    display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;
  }
  .tile {
    border-radius: 4px; width: 75px; height: 75px;
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 32px;
    transition: all 0.12s ease;
    animation: tileAppear 0.15s ease;
  }
  @keyframes tileAppear {
    0% { transform: scale(0); opacity: 0; }
    100% { transform: scale(1); opacity: 1; }
  }
  .tile-2    { background: #eee4da; color: #776e65; }
  .tile-4    { background: #ede0c8; color: #776e65; }
  .tile-8    { background: #f2b179; color: #f9f6f2; }
  .tile-16   { background: #f59563; color: #f9f6f2; }
  .tile-32   { background: #f67c5f; color: #f9f6f2; }
  .tile-64   { background: #f65e3b; color: #f9f6f2; }
  .tile-128  { background: #edcf72; color: #f9f6f2; font-size: 28px; }
  .tile-256  { background: #edcc61; color: #f9f6f2; font-size: 28px; }
  .tile-512  { background: #edc850; color: #f9f6f2; font-size: 28px; }
  .tile-1024 { background: #edc53f; color: #f9f6f2; font-size: 22px; }
  .tile-2048 { background: #edc22e; color: #f9f6f2; font-size: 22px; }
  .tile-super { background: #3c3a32; color: #f9f6f2; font-size: 18px; }
  .game-message {
    position: absolute; inset: 0; border-radius: 8px;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    background: rgba(238, 228, 218, 0.73); z-index: 10;
    opacity: 0; pointer-events: none; transition: opacity 0.3s;
  }
  .game-message.show { opacity: 1; pointer-events: auto; }
  .game-message p { font-size: 36px; font-weight: 700; color: #776e65; margin: 0 0 16px; }
  .game-message .game-btn { background: #8f7a66; }
  .help-text { color: #776e65; font-size: 12px; margin-top: 12px; width: 340px; text-align: center; opacity: 0.7; }
</style>
<div class="game-header">
  <h1 class="game-title">2048</h1>
  <div class="score-container">
    <div class="score-box"><div class="score-label">分数</div><div class="score-value" id="g-score">0</div></div>
    <div class="score-box"><div class="score-label">最高</div><div class="score-value" id="g-best">0</div></div>
  </div>
</div>
<div class="game-subtitle">合并数字，挑战 2048！</div>
<div class="game-controls">
  <button class="game-btn" id="g-new">新游戏</button>
  <button class="game-btn game-btn-close" id="g-close">✕ 关闭</button>
</div>
<div class="grid-container" id="g-grid">
  <div class="cell-bg"></div><div class="cell-bg"></div><div class="cell-bg"></div><div class="cell-bg"></div>
  <div class="cell-bg"></div><div class="cell-bg"></div><div class="cell-bg"></div><div class="cell-bg"></div>
  <div class="cell-bg"></div><div class="cell-bg"></div><div class="cell-bg"></div><div class="cell-bg"></div>
  <div class="cell-bg"></div><div class="cell-bg"></div><div class="cell-bg"></div><div class="cell-bg"></div>
  <div class="tiles-layer" id="g-tiles"></div>
  <div class="game-message" id="g-msg">
    <p id="g-msg-text">游戏结束！</p>
    <button class="game-btn" id="g-retry">再来一局</button>
  </div>
</div>
<div class="help-text">⌨️ 方向键 / 👆 滑动屏幕操作</div>
`;
  document.body.appendChild(root);

  let grid, score, bestScore, won, over;

  function init() {
    grid = Array.from({length: 4}, () => [0,0,0,0]);
    score = 0; won = false; over = false;
    bestScore = parseInt(localStorage.getItem('g2048_best') || '0');
    document.getElementById('g-best').textContent = bestScore;
    document.getElementById('g-msg').classList.remove('show');
    addRandom(); addRandom();
    render();
  }

  function addRandom() {
    const empty = [];
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 4; c++)
        if (grid[r][c] === 0) empty.push({r, c});
    if (!empty.length) return;
    const {r, c} = empty[Math.floor(Math.random() * empty.length)];
    grid[r][c] = Math.random() < 0.9 ? 2 : 4;
  }

  function render() {
    const el = document.getElementById('g-tiles');
    el.innerHTML = '';
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const v = grid[r][c];
        if (v === 0) { el.innerHTML += '<div></div>'; continue; }
        const cls = v <= 2048 ? 'tile-' + v : 'tile-super';
        el.innerHTML += `<div class="tile ${cls}">${v}</div>`;
      }
    }
    document.getElementById('g-score').textContent = score;
    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem('g2048_best', bestScore);
      document.getElementById('g-best').textContent = bestScore;
    }
  }

  function slide(row) {
    let arr = row.filter(v => v !== 0);
    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] === arr[i+1]) {
        arr[i] *= 2; score += arr[i]; arr.splice(i+1, 1);
        if (arr[i] === 2048 && !won) { won = true; showMessage('🎉 你赢了！'); }
      }
    }
    while (arr.length < 4) arr.push(0);
    return arr;
  }

  function move(dir) {
    if (over) return;
    const old = JSON.stringify(grid);
    if (dir === 'left')  grid = grid.map(r => slide(r));
    if (dir === 'right') grid = grid.map(r => slide([...r].reverse()).reverse());
    if (dir === 'up') {
      for (let c = 0; c < 4; c++) {
        let col = [grid[0][c], grid[1][c], grid[2][c], grid[3][c]];
        col = slide(col);
        for (let r = 0; r < 4; r++) grid[r][c] = col[r];
      }
    }
    if (dir === 'down') {
      for (let c = 0; c < 4; c++) {
        let col = [grid[3][c], grid[2][c], grid[1][c], grid[0][c]];
        col = slide(col);
        for (let r = 0; r < 4; r++) grid[3-r][c] = col[r];
      }
    }
    if (JSON.stringify(grid) !== old) { addRandom(); render(); }
    if (isGameOver()) { over = true; showMessage('游戏结束！'); }
  }

  function isGameOver() {
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 4; c++) {
        if (grid[r][c] === 0) return false;
        if (c < 3 && grid[r][c] === grid[r][c+1]) return false;
        if (r < 3 && grid[r][c] === grid[r+1][c]) return false;
      }
    return true;
  }

  function showMessage(text) {
    document.getElementById('g-msg-text').textContent = text;
    document.getElementById('g-msg').classList.add('show');
  }

  document.addEventListener('keydown', function handler(e) {
    if (!document.getElementById('__game_2048_root__')) { document.removeEventListener('keydown', handler); return; }
    const map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
                  a: 'left', d: 'right', w: 'up', s: 'down' };
    if (map[e.key]) { e.preventDefault(); move(map[e.key]); }
  });

  let tx, ty;
  const gGrid = document.getElementById('g-grid');
  gGrid.addEventListener('touchstart', e => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, {passive: true});
  gGrid.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - tx;
    const dy = e.changedTouches[0].clientY - ty;
    if (Math.abs(dx) < 30 && Math.abs(dy) < 30) return;
    if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 'right' : 'left');
    else move(dy > 0 ? 'down' : 'up');
  }, {passive: true});

  document.getElementById('g-new').onclick = init;
  document.getElementById('g-retry').onclick = init;
  document.getElementById('g-close').onclick = () => root.remove();

  init();
})();