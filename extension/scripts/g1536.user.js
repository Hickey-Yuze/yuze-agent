(function() {
  if (document.getElementById('__minesweeper_disguise__')) return;

  const ROWS = 16;
  const COLS = 30;
  const MINES = 99;
  const CELL_SIZE = 26;

  let board = [];
  let revealed = [];
  let flagged = [];
  let gameOver = false;
  let gameWon = false;
  let firstClick = true;
  let flagCount = 0;
  let timerInterval = null;
  let seconds = 0;
  let bossMode = false;

  const numberColors = ['', '#0000FF', '#008000', '#FF0000', '#000080', '#800000', '#008080', '#000000', '#808080'];

  // Fake spreadsheet data for boss mode
  const fakeHeaders = ['项目编号', '部门', 'Q1预算(万)', 'Q1实际(万)', 'Q2预算(万)', 'Q2实际(万)', 'Q3预算(万)', 'Q3实际(万)', 'Q4预算(万)', 'Q4实际(万)', '年度合计(万)', '同比增速', '执行率', '备注'];
  const fakeDepts = ['市场部', '技术部', '运营部', '人事部', '财务部', '产品部', '设计部', '法务部', '行政部', '采购部', '客服部', '研发部', '战略部', '质检部', '物流部'];
  const fakeProjects = ['PRJ-2024-', 'OPS-', 'DEV-', 'MKT-', 'HR-', 'FIN-', 'PRD-', 'DSN-', 'LEG-', 'ADM-', 'PUR-', 'CSR-', 'RND-', 'STG-', 'QC-', 'LOG-'];

  function generateFakeData() {
    let html = '<table class="fake-table"><thead><tr><th></th>';
    for (let i = 0; i < fakeHeaders.length; i++) {
      html += `<th>${fakeHeaders[i]}</th>`;
    }
    html += '</tr></thead><tbody>';
    for (let r = 0; r < 30; r++) {
      html += `<tr><td class="row-num">${r + 1}</td>`;
      for (let c = 0; c < fakeHeaders.length; c++) {
        let val;
        if (c === 0) val = fakeProjects[r % fakeProjects.length] + String(1000 + r * 7).slice(1);
        else if (c === 1) val = fakeDepts[r % fakeDepts.length];
        else if (c === 11) val = (Math.random() * 30 - 5).toFixed(1) + '%';
        else if (c === 12) val = (0.7 + Math.random() * 0.35).toFixed(2);
        else if (c === 13) val = ['待审核', '已批准', '进行中', '已结项', '需调整'][Math.floor(Math.random() * 5)];
        else val = (Math.random() * 500 + 50).toFixed(1);
        html += `<td>${val}</td>`;
      }
      html += '</tr>';
    }
    html += '</tbody></table>';
    return html;
  }

  function initBoard() {
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    revealed = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
    flagged = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
    gameOver = false;
    gameWon = false;
    firstClick = true;
    flagCount = 0;
    seconds = 0;
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
  }

  function placeMines(safeR, safeC) {
    let placed = 0;
    while (placed < MINES) {
      const r = Math.floor(Math.random() * ROWS);
      const c = Math.floor(Math.random() * COLS);
      if (board[r][c] === -1) continue;
      if (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) continue;
      board[r][c] = -1;
      placed++;
    }
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (board[r][c] === -1) continue;
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && board[nr][nc] === -1) count++;
          }
        }
        board[r][c] = count;
      }
    }
  }

  function reveal(r, c) {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
    if (revealed[r][c] || flagged[r][c]) return;
    revealed[r][c] = true;
    if (board[r][c] === 0) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          reveal(r + dr, c + dc);
        }
      }
    }
  }

  function checkWin() {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (board[r][c] !== -1 && !revealed[r][c]) return false;
      }
    }
    return true;
  }

  function renderBoard() {
    const grid = document.getElementById('ms-grid');
    if (!grid) return;
    grid.innerHTML = '';
    for (let r = 0; r < ROWS; r++) {
      const row = document.createElement('div');
      row.className = 'ms-row';
      for (let c = 0; c < COLS; c++) {
        const cell = document.createElement('div');
        cell.className = 'ms-cell';
        cell.dataset.r = r;
        cell.dataset.c = c;

        if (revealed[r][c]) {
          cell.classList.add('revealed');
          if (board[r][c] === -1) {
            cell.classList.add('mine');
            cell.textContent = '💣';
          } else if (board[r][c] > 0) {
            cell.textContent = board[r][c];
            cell.style.color = numberColors[board[r][c]];
            cell.style.fontWeight = '700';
          }
        } else if (flagged[r][c]) {
          cell.classList.add('flagged');
          cell.textContent = '🚩';
        }

        if (gameOver && board[r][c] === -1 && !revealed[r][c] && !flagged[r][c]) {
          cell.classList.add('revealed', 'mine-show');
          cell.textContent = '💣';
        }

        row.appendChild(cell);
      }
      grid.appendChild(row);
    }
    document.getElementById('ms-mines').textContent = String(MINES - flagCount).padStart(3, '0');
    document.getElementById('ms-timer').textContent = String(Math.min(seconds, 999)).padStart(3, '0');

    if (gameOver || gameWon) {
      const face = document.getElementById('ms-face');
      if (face) face.textContent = gameWon ? '😎' : '😵';
    }
  }

  function handleCellClick(r, c) {
    if (gameOver || gameWon) return;
    if (flagged[r][c]) return;

    if (firstClick) {
      firstClick = false;
      placeMines(r, c);
      timerInterval = setInterval(() => {
        seconds++;
        document.getElementById('ms-timer').textContent = String(Math.min(seconds, 999)).padStart(3, '0');
      }, 1000);
    }

    if (board[r][c] === -1) {
      revealed[r][c] = true;
      gameOver = true;
      if (timerInterval) clearInterval(timerInterval);
      renderBoard();
      showGameMsg('💥 踩雷了！点击笑脸重来');
      return;
    }

    reveal(r, c);
    if (checkWin()) {
      gameWon = true;
      if (timerInterval) clearInterval(timerInterval);
      renderBoard();
      showGameMsg('🎉 你赢了！点击笑脸再来');
      return;
    }
    renderBoard();
  }

  function handleCellRightClick(r, c) {
    if (gameOver || gameWon) return;
    if (revealed[r][c]) return;
    flagged[r][c] = !flagged[r][c];
    flagCount += flagged[r][c] ? 1 : -1;
    renderBoard();
  }

  function handleChord(r, c) {
    if (!revealed[r][c] || board[r][c] <= 0) return;
    let adjFlags = 0;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && flagged[nr][nc]) adjFlags++;
      }
    }
    if (adjFlags === board[r][c]) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !flagged[nr][nc] && !revealed[nr][nc]) {
            if (board[nr][nc] === -1) {
              revealed[nr][nc] = true;
              gameOver = true;
              if (timerInterval) clearInterval(timerInterval);
              renderBoard();
              showGameMsg('💥 踩雷了！点击笑脸重来');
              return;
            }
            reveal(nr, nc);
          }
        }
      }
      if (checkWin()) {
        gameWon = true;
        if (timerInterval) clearInterval(timerInterval);
        renderBoard();
        showGameMsg('🎉 你赢了！点击笑脸再来');
        return;
      }
      renderBoard();
    }
  }

  function showGameMsg(msg) {
    const el = document.getElementById('ms-game-msg');
    if (el) {
      el.textContent = msg;
      el.style.opacity = '1';
    }
  }

  function hideGameMsg() {
    const el = document.getElementById('ms-game-msg');
    if (el) el.style.opacity = '0';
  }

  function newGame() {
    initBoard();
    hideGameMsg();
    renderBoard();
    const face = document.getElementById('ms-face');
    if (face) face.textContent = '🙂';
  }

  function toggleBossMode() {
    bossMode = !bossMode;
    const gameView = document.getElementById('ms-game-view');
    const fakeView = document.getElementById('ms-fake-view');
    if (bossMode) {
      gameView.style.display = 'none';
      fakeView.style.display = 'block';
    } else {
      gameView.style.display = 'block';
      fakeView.style.display = 'none';
    }
  }

  function createUI() {
    const container = document.createElement('div');
    container.id = '__minesweeper_disguise__';
    container.innerHTML = `
      <style>
        #__minesweeper_disguise__ {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          z-index: 999999;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: #f3f2f1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .ms-titlebar {
          height: 32px;
          background: #217346;
          display: flex;
          align-items: center;
          padding: 0 8px;
          color: white;
          font-size: 12px;
          gap: 8px;
          flex-shrink: 0;
        }
        .ms-titlebar-icon {
          width: 16px; height: 16px;
          background: #217346;
          border: 1.5px solid white;
          border-radius: 2px;
          display: flex; align-items: center; justify-content: center;
          font-size: 9px; font-weight: bold;
        }
        .ms-titlebar-title {
          flex: 1;
          text-align: center;
          font-size: 12px;
        }
        .ms-titlebar-btn {
          width: 32px; height: 24px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          font-size: 11px;
          border-radius: 2px;
          transition: background 0.1s;
        }
        .ms-titlebar-btn:hover { background: rgba(255,255,255,0.15); }
        .ms-toolbar {
          height: 34px;
          background: #f3f2f1;
          border-bottom: 1px solid #d1d1d1;
          display: flex;
          align-items: center;
          padding: 0 8px;
          gap: 4px;
          font-size: 12px;
          color: #333;
          flex-shrink: 0;
        }
        .ms-toolbar-item {
          padding: 3px 10px;
          border-radius: 3px;
          cursor: pointer;
          transition: background 0.1s;
          white-space: nowrap;
        }
        .ms-toolbar-item:hover { background: #e1e1e1; }
        .ms-toolbar-item.active { background: #d1d1d1; font-weight: 600; }
        .ms-toolbar-sep {
          width: 1px; height: 18px; background: #d1d1d1; margin: 0 4px;
        }
        .ms-formula-bar {
          height: 26px;
          background: white;
          border-bottom: 1px solid #d1d1d1;
          display: flex;
          align-items: center;
          font-size: 12px;
          color: #333;
          flex-shrink: 0;
        }
        .ms-formula-cell {
          width: 80px;
          height: 100%;
          border-right: 1px solid #d1d1d1;
          display: flex;
          align-items: center;
          padding: 0 6px;
          font-weight: 500;
          background: #f9f9f9;
        }
        .ms-formula-input {
          flex: 1;
          height: 100%;
          border: none;
          outline: none;
          padding: 0 6px;
          font-size: 12px;
          font-family: inherit;
          color: #333;
        }
        .ms-main {
          flex: 1;
          display: flex;
          overflow: hidden;
        }
        .ms-game-view, .ms-fake-view {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          overflow: auto;
        }
        .ms-fake-view { display: none; }
        .ms-status-section {
          background: #e7e6e5;
          border: 1px solid #b4b4b4;
          border-radius: 2px;
          margin: 6px auto 2px;
          padding: 6px 16px;
          display: flex;
          align-items: center;
          gap: 20px;
          box-shadow: inset 0 1px 0 #fff;
        }
        .ms-counter {
          background: #300;
          color: #f00;
          font-family: 'Consolas', 'Courier New', monospace;
          font-size: 22px;
          font-weight: 700;
          padding: 2px 6px;
          min-width: 52px;
          text-align: center;
          border: 1px inset #666;
          letter-spacing: 3px;
        }
        .ms-face-btn {
          width: 32px; height: 32px;
          background: #e7e6e5;
          border: 2px outset #fff;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          font-size: 18px;
          user-select: none;
          border-radius: 2px;
        }
        .ms-face-btn:active { border-style: inset; }
        .ms-grid {
          border: 3px inset #b4b4b4;
          display: inline-block;
          background: #c0c0c0;
          line-height: 0;
        }
        .ms-row {
          display: flex;
          line-height: 0;
        }
        .ms-cell {
          width: ${CELL_SIZE}px;
          height: ${CELL_SIZE}px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          user-select: none;
          border: 2px outset #fff;
          background: #c0c0c0;
          font-family: 'Consolas', 'Arial', sans-serif;
          line-height: 1;
          transition: none;
        }
        .ms-cell.revealed {
          border: 1px solid #808080;
          background: #d4d4d4;
          cursor: default;
        }
        .ms-cell.mine {
          background: #ff0000 !important;
        }
        .ms-cell.mine-show {
          background: #d4d4d4;
        }
        .ms-cell.flagged {
          font-size: 13px;
        }
        .ms-cell:not(.revealed):not(.flagged):active {
          border-style: inset;
        }
        .ms-game-msg {
          font-size: 13px;
          color: #333;
          text-align: center;
          padding: 4px;
          opacity: 0;
          transition: opacity 0.3s;
          font-weight: 500;
        }
        .ms-sheet-tabs {
          height: 26px;
          background: #e7e6e5;
          border-top: 1px solid #d1d1d1;
          display: flex;
          align-items: flex-end;
          padding: 0 40px;
          gap: 0;
          flex-shrink: 0;
        }
        .ms-sheet-tab {
          padding: 3px 16px;
          font-size: 11px;
          color: #333;
          background: #e7e6e5;
          border: 1px solid #d1d1d1;
          border-bottom: none;
          cursor: pointer;
          border-radius: 2px 2px 0 0;
          margin-bottom: -1px;
          position: relative;
        }
        .ms-sheet-tab.active {
          background: white;
          font-weight: 500;
        }
        .ms-statusbar {
          height: 22px;
          background: #217346;
          color: white;
          font-size: 11px;
          display: flex;
          align-items: center;
          padding: 0 8px;
          gap: 20px;
          flex-shrink: 0;
        }
        .ms-statusbar-item {
          padding: 0 4px;
        }
        .ms-boss-hint {
          position: fixed;
          bottom: 30px;
          right: 10px;
          font-size: 10px;
          color: #999;
          z-index: 1000000;
          opacity: 0.5;
          pointer-events: none;
        }
        /* Fake table styles */
        .fake-table {
          border-collapse: collapse;
          font-size: 12px;
          width: 100%;
        }
        .fake-table th {
          background: #e7e6e5;
          border: 1px solid #d1d1d1;
          padding: 3px 8px;
          font-weight: 500;
          text-align: left;
          white-space: nowrap;
        }
        .fake-table td {
          border: 1px solid #d1d1d1;
          padding: 2px 8px;
          white-space: nowrap;
        }
        .fake-table .row-num {
          background: #f3f2f1;
          text-align: center;
          color: #666;
          width: 30px;
          font-size: 11px;
        }
        .fake-table tr:hover td { background: #f0f7ff; }
      </style>

      <div class="ms-titlebar">
        <div class="ms-titlebar-icon">X</div>
        <div class="ms-titlebar-title">年度预算汇总_2024.xlsx - Excel</div>
        <div class="ms-titlebar-btn">—</div>
        <div class="ms-titlebar-btn">☐</div>
        <div class="ms-titlebar-btn">✕</div>
      </div>

      <div class="ms-toolbar">
        <div class="ms-toolbar-item">文件</div>
        <div class="ms-toolbar-item">开始</div>
        <div class="ms-toolbar-item active">插入</div>
        <div class="ms-toolbar-item">页面布局</div>
        <div class="ms-toolbar-item">公式</div>
        <div class="ms-toolbar-item">数据</div>
        <div class="ms-toolbar-item">审阅</div>
        <div class="ms-toolbar-item">视图</div>
        <div class="ms-toolbar-sep"></div>
        <div style="flex:1"></div>
        <div style="font-size:11px;color:#888;">按 Esc 切换伪装</div>
      </div>

      <div class="ms-formula-bar">
        <div class="ms-formula-cell">A1</div>
        <div style="padding:0 6px;color:#888;font-size:11px;">ƒx</div>
        <input class="ms-formula-input" type="text" value="" readonly>
      </div>

      <div class="ms-main">
        <div id="ms-game-view" class="ms-game-view">
          <div class="ms-status-section">
            <div id="ms-mines" class="ms-counter">099</div>
            <div id="ms-face" class="ms-face-btn">🙂</div>
            <div id="ms-timer" class="ms-counter">000</div>
          </div>
          <div id="ms-grid" class="ms-grid"></div>
          <div id="ms-game-msg" class="ms-game-msg"></div>
        </div>
        <div id="ms-fake-view" class="ms-fake-view" style="padding:0;overflow:auto;">
          ${generateFakeData()}
        </div>
      </div>

      <div class="ms-sheet-tabs">
        <div class="ms-sheet-tab active">Sheet1 - 扫雷</div>
        <div class="ms-sheet-tab">Sheet2 - 数据</div>
        <div class="ms-sheet-tab">Sheet3</div>
      </div>

      <div class="ms-statusbar">
        <span class="ms-statusbar-item">就绪</span>
        <span style="flex:1"></span>
        <span class="ms-statusbar-item">求和: —</span>
        <span class="ms-statusbar-item">平均值: —</span>
        <span class="ms-statusbar-item">计数: —</span>
        <span class="ms-statusbar-item">缩放 100%</span>
      </div>

      <div class="ms-boss-hint">Esc = 老板键</div>
    `;
    document.body.appendChild(container);

    // Event delegation for grid
    document.getElementById('ms-grid').addEventListener('click', (e) => {
      const cell = e.target.closest('.ms-cell');
      if (!cell) return;
      const r = parseInt(cell.dataset.r);
      const c = parseInt(cell.dataset.c);
      handleCellClick(r, c);
    });

    document.getElementById('ms-grid').addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const cell = e.target.closest('.ms-cell');
      if (!cell) return;
      const r = parseInt(cell.dataset.r);
      const c = parseInt(cell.dataset.c);
      handleCellRightClick(r, c);
    });

    document.getElementById('ms-grid').addEventListener('dblclick', (e) => {
      const cell = e.target.closest('.ms-cell');
      if (!cell) return;
      const r = parseInt(cell.dataset.r);
      const c = parseInt(cell.dataset.c);
      handleChord(r, c);
    });

    document.getElementById('ms-face').addEventListener('click', newGame);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        toggleBossMode();
      }
    });

    initBoard();
    renderBoard();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createUI);
  } else {
    createUI();
  }
})();