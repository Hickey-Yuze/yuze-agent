(function () {
  'use strict';

  if (window.__tbMasterLoaded) {
    if (typeof window.__tbOpenGamePanel === 'function') window.__tbOpenGamePanel();
    return;
  }
  window.__tbMasterLoaded = true;

  var NS = 'tb-';
  var _darkMQ = window.matchMedia && window.matchMedia('(prefers-color-scheme:dark)');
  function isDark() { return _darkMQ ? _darkMQ.matches : false; }
  function broadcastTheme() { window.dispatchEvent(new CustomEvent('tb-theme-change', { detail: { dark: isDark() } })); }
  if (_darkMQ && _darkMQ.addEventListener) { _darkMQ.addEventListener('change', broadcastTheme); }

  var styleEl = document.createElement('style');
  styleEl.id = NS + 'menu';
  styleEl.textContent = `
    #tb-overlay{position:fixed;inset:0;z-index:99990;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;}
    #tb-panel{width:860px;max-width:calc(100vw - 32px);height:600px;max-height:calc(100vh - 48px);background:#f4f4f6;border-radius:18px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.3);font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;color:rgba(0,0,0,.8);}
    @media(prefers-color-scheme:dark){
      #tb-panel{background:#232324;color:rgba(255,255,255,.8);}
      .tb-panel-bg{background:#1c1c1d!important;}
      .tb-card-bg{background:#2e2e2e!important;border-color:rgba(255,255,255,.08)!important;}
      .tb-card-body{background:#252526!important;}
      .tb-card-name{color:rgba(255,255,255,.85)!important;}
      .tb-card-desc{color:rgba(255,255,255,.35)!important;}
      .tb-card-hint{color:rgba(255,255,255,.22)!important;}
      .tb-sep-line{background:rgba(255,255,255,.08)!important;}
      .tb-sec-label{color:rgba(255,255,255,.35)!important;}
      .tb-search{background:rgba(255,255,255,.06)!important;border-color:rgba(255,255,255,.1)!important;color:rgba(255,255,255,.8)!important;}
      .tb-search::placeholder{color:rgba(255,255,255,.3);}
      .tb-btn-sec{background:rgba(255,255,255,.06)!important;border-color:rgba(255,255,255,.08)!important;color:rgba(255,255,255,.5)!important;}
      .tb-sidebar{background:#1c1c1d!important;border-color:rgba(255,255,255,.08)!important;}
      .tb-sitem:hover{background:rgba(255,255,255,.06)!important;}
      .tb-gamebody{background:#232324!important;}
      .tb-gamebar{background:#1c1c1d!important;border-color:rgba(255,255,255,.08)!important;}
      .tb-statusbar{background:#1c1c1d!important;border-color:rgba(255,255,255,.08)!important;}
      .tb-status-txt{color:rgba(255,255,255,.35)!important;}
      .tb-game-score{color:rgba(255,255,255,.4)!important;}
    }
    #tb-topbar{display:flex;align-items:center;gap:10px;padding:12px 16px 10px;border-bottom:.5px solid rgba(0,0,0,.08);background:#fefdfc;flex-shrink:0;}
    #tb-topbar .tb-title{font-size:15px;font-weight:600;flex:1;}
    .tb-search{height:30px;padding:0 10px;border:.5px solid rgba(0,0,0,.12);border-radius:8px;background:rgba(0,0,0,.04);font-size:12px;outline:none;width:140px;color:rgba(0,0,0,.8);}
    .tb-search::placeholder{color:rgba(0,0,0,.3);}
    .tb-btn-sec{height:30px;padding:0 12px;border:.5px solid rgba(0,0,0,.08);border-radius:8px;background:rgba(0,0,0,.06);font-size:12px;font-weight:500;color:rgba(0,0,0,.5);cursor:pointer;transition:background .12s;}
    .tb-btn-sec:hover{background:rgba(0,0,0,.1);}
    #tb-body{display:flex;flex:1;overflow:hidden;}
    #tb-sidebar{width:192px;flex-shrink:0;background:#fefdfc;border-right:.5px solid rgba(0,0,0,.08);padding:8px;overflow-y:auto;display:flex;flex-direction:column;gap:2px;}
    .tb-sec-label{font-size:10px;font-weight:600;letter-spacing:.06em;color:rgba(0,0,0,.35);padding:6px 8px 4px;text-transform:uppercase;}
    .tb-sitem{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:8px;cursor:pointer;font-size:12px;transition:background .12s;color:inherit;}
    .tb-sitem:hover{background:rgba(0,0,0,.06);}
    .tb-sitem.tb-active{background:color-mix(in srgb,#F3A04C 14%,transparent);color:#E58522;}
    .tb-sitem-thumb{width:28px;height:28px;border-radius:8px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:14px;}
    .tb-sitem-label{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
    .tb-ext-badge{font-size:9px;padding:1px 5px;border-radius:999px;flex-shrink:0;background:color-mix(in srgb,#E58522 18%,transparent);color:#E58522;border:.5px solid color-mix(in srgb,#E58522 25%,transparent);}
    .tb-sep-line{height:.5px;background:rgba(0,0,0,.08);margin:6px 4px;}
    #tb-right{flex:1;display:flex;flex-direction:column;min-width:0;min-height:0;overflow:hidden;}
    #tb-grid{padding:14px;flex:1;min-height:0;min-width:0;overflow-y:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:12px;align-content:start;}
    .tb-game-card{border-radius:16px;overflow:hidden;cursor:pointer;border:.5px solid rgba(0,0,0,.08);background:#fff;display:flex;flex-direction:column;min-height:130px;transition:transform .14s,box-shadow .14s;position:relative;box-shadow:0 2px 8px rgba(0,0,0,.06);}
    .tb-game-card:hover{transform:translateY(-3px);box-shadow:0 8px 24px rgba(0,0,0,.13);}
    .tb-game-card.tb-selected{border-color:#F3A04C;box-shadow:0 0 0 2.5px color-mix(in srgb,#F3A04C 35%,transparent);}
    .tb-card-thumb{height:88px;display:flex;align-items:center;justify-content:center;font-size:40px;position:relative;overflow:hidden;}
    .tb-card-thumb-overlay{position:absolute;inset:0;background:linear-gradient(180deg,transparent 40%,rgba(0,0,0,.07) 100%);pointer-events:none;}
    .tb-card-body{padding:8px 10px 7px;background:#fff;display:flex;flex-direction:column;gap:2px;}
    .tb-card-name{font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:rgba(0,0,0,.8);}
    .tb-card-desc{font-size:10px;color:rgba(0,0,0,.4);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .tb-card-hint{font-size:9.5px;color:rgba(0,0,0,.28);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px;}
    .tb-card-ext{position:absolute;top:7px;right:7px;font-size:9px;padding:1px 5px;border-radius:999px;background:color-mix(in srgb,#E58522 18%,transparent);color:#E58522;border:.5px solid color-mix(in srgb,#E58522 25%,transparent);}
    #tb-gameview{display:none;flex-direction:column;flex:1;overflow:hidden;}
    #tb-gamebar{display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:.5px solid rgba(0,0,0,.08);background:#fefdfc;flex-shrink:0;}
    #tb-gamebar .tb-game-title{font-size:13px;font-weight:600;flex:1;}
    #tb-gamebar .tb-game-score{font-size:12px;color:rgba(0,0,0,.45);}
    #tb-gamebody{flex:1;overflow:hidden;background:#f4f4f6;display:flex;align-items:stretch;justify-content:stretch;position:relative;}
    #tb-statusbar{display:flex;align-items:center;justify-content:space-between;padding:6px 16px;border-top:.5px solid rgba(0,0,0,.08);background:#fefdfc;flex-shrink:0;}
    .tb-status-txt{font-size:11px;color:rgba(0,0,0,.35);}
  `;
  document.head.appendChild(styleEl);

  var CONTROLS_HINT = {
    'game-2048':    '方向键 / WASD',
    'game-llk':     '点击配对消除',
    'game-flappy':  '点击 / 空格键起飞',
    'game-shooter': '鼠标瞄准 · ESC暂停',
    'game-mine':    '左键翻开 · 右键插旗',
    'ext-snake':    '方向键 / WASD',
    'ext-tetris':   '方向键 / 空格硬降',
    'ext-memory':   '点击翻牌配对',
  };

  var Runtime = (function () {
    var _defs = {}, _active = null, _readyResolve;
    var _ready = new Promise(function (res) { _readyResolve = res; });
    function _syncSidebar(name) { document.querySelectorAll('.tb-sitem').forEach(function (el) { el.classList.toggle('tb-active', el.dataset.game === name); }); }
    function _syncGrid(name) { document.querySelectorAll('.tb-game-card').forEach(function (el) { el.classList.toggle('tb-selected', el.dataset.game === name); }); }
    return {
      ready: _ready,
      register: function (name, opts) { if (!_defs[name]) _defs[name] = opts; },
      launch: function (name) {
        Runtime.stopCurrent();
        var def = _defs[name]; if (!def) return;
        var body = document.getElementById(NS + 'gamebody'); body.innerHTML = '';
        document.getElementById(NS + 'grid').style.display = 'none';
        document.getElementById(NS + 'gameview').style.display = 'flex';
        document.querySelector('#tb-gamebar .tb-game-title').textContent = (def.icon || '') + ' ' + def.label;
        document.querySelector('#tb-gamebar .tb-game-score').textContent = '';
        var inst = def.mount(body);
        _active = { name: name, inst: inst };
        _syncSidebar(name); _syncGrid(name);
      },
      stopCurrent: function () {
        if (_active && _active.inst && typeof _active.inst.destroy === 'function') { try { _active.inst.destroy(); } catch (e) {} }
        _active = null;
      },
      backToGrid: function () {
        Runtime.stopCurrent();
        document.getElementById(NS + 'gameview').style.display = 'none';
        document.getElementById(NS + 'grid').style.display = 'grid';
        _syncSidebar(null); _syncGrid(null);
      },
      setScore: function (text) { var el = document.querySelector('#tb-gamebar .tb-game-score'); if (el) el.textContent = text; },
      getContext: function () { return { dark: isDark(), lang: navigator.language || 'zh-CN' }; },
      getDefs: function () { return _defs; },
      _resolve: function () { _readyResolve(); },
    };
  })();

  window.__tbRuntime = Runtime;

  var overlay = document.createElement('div'); overlay.id = NS + 'overlay';
  var panel = document.createElement('div'); panel.id = NS + 'panel';
  var topbar = document.createElement('div'); topbar.id = NS + 'topbar'; topbar.className = 'tb-panel-bg';
  topbar.innerHTML = '<span class="tb-title">🎮 小游戏合集</span><input id="tb-search" class="tb-search" type="text" placeholder="搜索游戏…"><button id="tb-close-btn" class="tb-btn-sec">关闭</button>';
  panel.appendChild(topbar);
  var bodyEl = document.createElement('div'); bodyEl.id = NS + 'body';
  var sidebar = document.createElement('div'); sidebar.id = NS + 'sidebar'; sidebar.className = 'tb-sidebar tb-panel-bg';
  var sBuiltinLabel = document.createElement('div'); sBuiltinLabel.className = 'tb-sec-label'; sBuiltinLabel.textContent = '内置游戏'; sidebar.appendChild(sBuiltinLabel);
  var sBuiltinWrap = document.createElement('div'); sidebar.appendChild(sBuiltinWrap);
  var sExtContainer = document.createElement('div'); sExtContainer.id = NS + 'sidebar-ext'; sExtContainer.style.display = 'none';
  var sExtSep = document.createElement('div'); sExtSep.className = 'tb-sep-line';
  var sExtLabel = document.createElement('div'); sExtLabel.className = 'tb-sec-label'; sExtLabel.textContent = '扩展游戏';
  var sExtWrap = document.createElement('div');
  sExtContainer.appendChild(sExtSep); sExtContainer.appendChild(sExtLabel); sExtContainer.appendChild(sExtWrap);
  sidebar.appendChild(sExtContainer); bodyEl.appendChild(sidebar);
  var right = document.createElement('div'); right.id = NS + 'right';
  var grid = document.createElement('div'); grid.id = NS + 'grid';
  var gameview = document.createElement('div'); gameview.id = NS + 'gameview';
  gameview.innerHTML = '<div id="tb-gamebar" class="tb-gamebar tb-panel-bg"><button id="tb-back-btn" class="tb-btn-sec">← 返回</button><span class="tb-game-title"></span><span class="tb-game-score"></span></div><div id="tb-gamebody" class="tb-gamebody"></div>';
  right.appendChild(grid); right.appendChild(gameview); bodyEl.appendChild(right); panel.appendChild(bodyEl);
  var statusbar = document.createElement('div'); statusbar.id = NS + 'statusbar'; statusbar.className = 'tb-statusbar tb-panel-bg';
  statusbar.innerHTML = '<span id="tb-status-left" class="tb-status-txt">加载中…</span><span id="tb-status-right" class="tb-status-txt">扩展接口 v3.0</span>';
  panel.appendChild(statusbar); overlay.appendChild(panel); document.body.appendChild(overlay);

  function makeSidebarItem(name, def) {
    var item = document.createElement('div'); item.className = 'tb-sitem'; item.dataset.game = name;
    var thumb = document.createElement('span'); thumb.className = 'tb-sitem-thumb'; thumb.style.background = def.color || '#888'; thumb.textContent = def.icon || '🎮';
    var label = document.createElement('span'); label.className = 'tb-sitem-label'; label.textContent = def.label;
    item.appendChild(thumb); item.appendChild(label);
    if (!def.builtin) { var badge = document.createElement('span'); badge.className = 'tb-ext-badge'; badge.textContent = '扩展'; item.appendChild(badge); }
    item.addEventListener('click', function () { Runtime.launch(name); });
    return item;
  }

  function renderGrid(query) {
    var defs = Runtime.getDefs(), q = (query || '').trim().toLowerCase(); grid.innerHTML = '';
    var names = Object.keys(defs).filter(function (n) { if (!q) return true; var d = defs[n]; return (d.label || '').toLowerCase().indexOf(q) !== -1 || (d.desc || '').toLowerCase().indexOf(q) !== -1; });
    if (!names.length) { var empty = document.createElement('div'); empty.style.cssText = 'grid-column:1/-1;text-align:center;padding:40px 0;font-size:13px;color:rgba(0,0,0,.35);'; empty.textContent = '没有找到匹配的游戏'; grid.appendChild(empty); return; }
    names.forEach(function (name) {
      var def = defs[name]; var card = document.createElement('div'); card.className = 'tb-game-card tb-card-bg'; card.dataset.game = name;
      var thumbDiv = document.createElement('div'); thumbDiv.className = 'tb-card-thumb'; thumbDiv.style.background = 'linear-gradient(135deg,' + (def.color || '#888') + '44 0%,' + (def.color || '#888') + '18 100%)';
      if (def.thumb) { var img = document.createElement('img'); img.src = def.thumb; img.style.cssText = 'width:100%;height:100%;object-fit:cover;position:absolute;inset:0;'; thumbDiv.appendChild(img); } else { thumbDiv.style.fontSize = '40px'; thumbDiv.textContent = def.icon || '🎮'; }
      var ov2 = document.createElement('div'); ov2.className = 'tb-card-thumb-overlay'; thumbDiv.appendChild(ov2);
      var bodyDiv = document.createElement('div'); bodyDiv.className = 'tb-card-body';
      var nameEl = document.createElement('div'); nameEl.className = 'tb-card-name'; nameEl.textContent = def.label;
      var descEl = document.createElement('div'); descEl.className = 'tb-card-desc'; descEl.textContent = def.desc || '';
      var hint = CONTROLS_HINT[name] || def.controls || ''; bodyDiv.appendChild(nameEl); bodyDiv.appendChild(descEl);
      if (hint) { var hintEl = document.createElement('div'); hintEl.className = 'tb-card-hint'; hintEl.textContent = '🕹 ' + hint; bodyDiv.appendChild(hintEl); }
      card.appendChild(thumbDiv); card.appendChild(bodyDiv);
      if (!def.builtin) { var badge = document.createElement('span'); badge.className = 'tb-card-ext'; badge.textContent = '扩展'; card.appendChild(badge); }
      card.addEventListener('click', function () { Runtime.launch(name); }); grid.appendChild(card);
    });
  }

  function updateStatus() {
    var defs = Runtime.getDefs(), names = Object.keys(defs); var extCount = names.filter(function (n) { return !defs[n].builtin; }).length;
    var el = document.getElementById(NS + 'status-left'); if (el) el.textContent = names.length + ' 款游戏' + (extCount ? ' · ' + extCount + ' 个扩展已加载' : '');
  }

  function cssObj(el, s) { Object.assign(el.style, s); return el; }
  function div(s) { var d = document.createElement('div'); if (s) cssObj(d, s); return d; }

  window.__tbRegisterGame = function (name, opts) {
    Runtime.register(name, opts); var item = makeSidebarItem(name, opts);
    if (opts.builtin) { sBuiltinWrap.appendChild(item); } else { sExtContainer.style.display = 'block'; sExtWrap.appendChild(item); }
    var q = document.getElementById(NS + 'search'); renderGrid(q ? q.value : ''); updateStatus();
  };
  window.__tbOpenGamePanel = function () { overlay.style.display = 'flex'; };
  function closePanel() { overlay.style.display = 'none'; }
  window.__tbDestroyGamePanel = function () {
    window.dispatchEvent(new CustomEvent('tb-skill:destroy-all')); Runtime.stopCurrent();
    if (_darkMQ && _darkMQ.removeEventListener) _darkMQ.removeEventListener('change', broadcastTheme);
    if (styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    window.__tbMasterLoaded = false; window.__tbRuntime = null; window.__tbRegisterGame = null; window.__tbOpenGamePanel = null; window.__tbDestroyGamePanel = null;
    window.dispatchEvent(new CustomEvent('tb-skill:master-offline'));
  };
  document.getElementById(NS + 'close-btn').addEventListener('click', closePanel);
  overlay.addEventListener('click', function (e) { if (e.target === overlay) closePanel(); });
  document.getElementById(NS + 'back-btn').addEventListener('click', function () { Runtime.backToGrid(); });
  document.getElementById(NS + 'search').addEventListener('input', function (e) { renderGrid(e.target.value); });

  function mount2048(container) {
    cssObj(container, { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#faf8f5', padding: '12px', boxSizing: 'border-box', fontFamily: 'ui-sans-serif,system-ui,sans-serif', color: 'rgba(0,0,0,.8)' });
    var SIZE = 4, score = 0, best = 0, board;
    var TILE = { 0: { bg: '#cdc1b4', fg: '#776e65' }, 2: { bg: '#eee4da', fg: '#776e65' }, 4: { bg: '#ede0c8', fg: '#776e65' }, 8: { bg: '#f2b179', fg: '#f9f6f2' }, 16: { bg: '#f59563', fg: '#f9f6f2' }, 32: { bg: '#f67c5f', fg: '#f9f6f2' }, 64: { bg: '#f65e3b', fg: '#f9f6f2' }, 128: { bg: '#edcf72', fg: '#f9f6f2' }, 256: { bg: '#edcc61', fg: '#f9f6f2' }, 512: { bg: '#edc850', fg: '#f9f6f2' }, 1024: { bg: '#edc53f', fg: '#f9f6f2' }, 2048: { bg: '#edc22e', fg: '#f9f6f2' } };
    var hdr = div({ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', maxWidth: '320px' });
    var scoreEl = div({ fontSize: '13px', color: 'rgba(0,0,0,.5)' });
    var restBtn = document.createElement('button'); cssObj(restBtn, { height: '28px', padding: '0 12px', border: '.5px solid rgba(0,0,0,.12)', borderRadius: '8px', background: 'rgba(0,0,0,.06)', fontSize: '12px', cursor: 'pointer' }); restBtn.textContent = '重来';
    hdr.appendChild(scoreEl); hdr.appendChild(restBtn); container.appendChild(hdr);
    var boardEl = div({ display: 'grid', gridTemplateColumns: 'repeat(4,72px)', gap: '8px', background: '#bbada0', padding: '8px', borderRadius: '10px' }); container.appendChild(boardEl);
    var hint = div({ fontSize: '11px', color: 'rgba(0,0,0,.35)', marginTop: '8px', textAlign: 'center' }); hint.textContent = '方向键 / WASD 操控'; container.appendChild(hint);
    function newBoard() { board = Array.from({ length: SIZE }, function () { return Array(SIZE).fill(0); }); score = 0; addTile(); addTile(); render(); }
    function addTile() { var e = []; board.forEach(function (row, r) { row.forEach(function (v, c) { if (!v) e.push([r, c]); }); }); if (!e.length) return; var p = e[Math.floor(Math.random() * e.length)]; board[p[0]][p[1]] = Math.random() < .9 ? 2 : 4; }
    function slideRow(row) { var arr = row.filter(Boolean), out = [], gained = 0; for (var i = 0; i < arr.length; i++) { if (arr[i + 1] && arr[i] === arr[i + 1]) { out.push(arr[i] * 2); gained += arr[i] * 2; i++; } else out.push(arr[i]); } while (out.length < SIZE) out.push(0); return { row: out, gained: gained }; }
    function move(dir) {
      var moved = false, gained = 0, nb = board.map(function (r) { return r.slice(); });
      if (dir === 'left' || dir === 'right') { nb.forEach(function (row, r) { var line = dir === 'right' ? row.slice().reverse() : row.slice(); var res = slideRow(line); gained += res.gained; nb[r] = dir === 'right' ? res.row.reverse() : res.row; if (nb[r].join() !== board[r].join()) moved = true; }); }
      else { for (var c = 0; c < SIZE; c++) { var col = board.map(function (r) { return r[c]; }); if (dir === 'down') col.reverse(); var res = slideRow(col); gained += res.gained; if (dir === 'down') res.row.reverse(); res.row.forEach(function (v, r) { if (nb[r][c] !== v) moved = true; nb[r][c] = v; }); } }
      if (moved) { board = nb; score += gained; if (score > best) best = score; addTile(); render(); Runtime.setScore('分数 ' + score); }
    }
    function render() { scoreEl.textContent = '分数: ' + score + '   最高: ' + best; boardEl.innerHTML = ''; board.forEach(function (row) { row.forEach(function (v) { var t = TILE[v] || { bg: '#3c3a32', fg: '#f9f6f2' }; var cell = div({ width: '72px', height: '72px', borderRadius: '6px', background: t.bg, color: t.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: v >= 1000 ? '18px' : '26px', fontWeight: '700' }); cell.textContent = v || ''; boardEl.appendChild(cell); }); }); }
    var keyH = function (e) { var map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', a: 'left', d: 'right', w: 'up', s: 'down' }; if (map[e.key]) { e.preventDefault(); move(map[e.key]); } };
    window.addEventListener('keydown', keyH); restBtn.addEventListener('click', function () { newBoard(); }); newBoard();
    return { destroy: function () { window.removeEventListener('keydown', keyH); } };
  }

  function mountLLK(container) {
    cssObj(container, { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#eef2ff', padding: '10px', boxSizing: 'border-box', fontFamily: 'ui-sans-serif,system-ui,sans-serif', color: 'rgba(0,0,0,.8)', position: 'relative' });
    var COLS = 8, ROWS = 8;
    var ICONS = ['🍎', '🍊', '🍋', '🍇', '🍓', '🍑', '🍒', '🥝', '🍍', '🥭', '🫐', '🍌', '🍉', '🍈', '🍏', '🍐', '🫒', '🍅', '🥥', '🥑', '🌽', '🥦', '🫑', '🥕', '🍆', '🧅', '🧄', '🥔', '🌶', '🫚', '🫛', '🥜'];
    var board, selected, timeLeft, timerID, score;

    var hdr = div({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '8px', flexShrink: '0' });
    var scoreEl = div({ fontSize: '13px', color: 'rgba(0,0,0,.5)', minWidth: '70px' });
    var timeEl = div({ fontSize: '13px', color: '#e65c53', fontWeight: '600', textAlign: 'center', flex: '1' });
    var restBtn = document.createElement('button'); cssObj(restBtn, { height: '26px', padding: '0 12px', border: '.5px solid rgba(0,0,0,.12)', borderRadius: '8px', background: 'rgba(0,0,0,.06)', fontSize: '12px', cursor: 'pointer' }); restBtn.textContent = '重来';
    hdr.appendChild(scoreEl); hdr.appendChild(timeEl); hdr.appendChild(restBtn); container.appendChild(hdr);

    var boardWrap = div({ flex: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', minHeight: '0', position: 'relative' }); container.appendChild(boardWrap);
    var boardEl = div({ display: 'grid', gap: '3px', position: 'relative', zIndex: '1' }); boardWrap.appendChild(boardEl);

    var svgNS = 'http://www.w3.org/2000/svg';
    var lineSvg = document.createElementNS(svgNS, 'svg');
    lineSvg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:10;overflow:visible;';
    boardWrap.appendChild(lineSvg);

    function calcCellSize() { var ww = boardWrap.clientWidth || 600, wh = boardWrap.clientHeight || 480; var maxW = Math.floor((ww - (COLS - 1) * 3) / COLS), maxH = Math.floor((wh - (ROWS - 1) * 3) / ROWS); return Math.max(28, Math.min(maxW, maxH, 64)); }

    function cellCenter(r, c) {
      var cs = calcCellSize();
      var boardLeft = (boardWrap.clientWidth - (COLS * cs + (COLS - 1) * 3)) / 2;
      var boardTop = (boardWrap.clientHeight - (ROWS * cs + (ROWS - 1) * 3)) / 2;
      return { x: boardLeft + c * (cs + 3) + cs / 2, y: boardTop + r * (cs + 3) + cs / 2 };
    }

    function flashLine(path, color, onDone) {
      var pts = path.map(function (rc) { return cellCenter(rc[0], rc[1]); });
      if (pts.length < 2) { if (onDone) onDone(); return; }
      var polyline = document.createElementNS(svgNS, 'polyline');
      var pointsStr = pts.map(function (p) { return p.x + ',' + p.y; }).join(' ');
      polyline.setAttribute('points', pointsStr);
      polyline.setAttribute('stroke', color || '#F3A04C');
      polyline.setAttribute('stroke-width', '3.5');
      polyline.setAttribute('stroke-linecap', 'round');
      polyline.setAttribute('stroke-linejoin', 'round');
      polyline.setAttribute('fill', 'none');
      polyline.style.opacity = '1';
      lineSvg.appendChild(polyline);
      var start = null;
      var dur = 380;
      function animStep(ts) {
        if (!start) start = ts;
        var prog = (ts - start) / dur;
        if (prog >= 1) { if (polyline.parentNode) polyline.parentNode.removeChild(polyline); if (onDone) onDone(); return; }
        polyline.style.opacity = String(1 - prog * prog);
        requestAnimationFrame(animStep);
      }
      requestAnimationFrame(animStep);
    }

    function animateRemove(r1, c1, r2, c2, onDone) {
      var cells = boardEl.querySelectorAll('[data-rc]');
      var targets = [];
      cells.forEach(function (el) { var rc = el.dataset.rc; if (rc === r1 + ',' + c1 || rc === r2 + ',' + c2) targets.push(el); });
      var total = targets.length;
      if (!total) { if (onDone) onDone(); return; }
      var done = 0;
      targets.forEach(function (el) {
        el.style.transition = 'transform 0.22s ease-in, opacity 0.22s ease-in';
        el.style.transform = 'scale(0)';
        el.style.opacity = '0';
        setTimeout(function () { done++; if (done >= total && onDone) onDone(); }, 240);
      });
    }

    function lineEmpty(r1, c1, r2, c2) {
      if (r1 !== r2 && c1 !== c2) return false;
      if (r1 === r2) { var minC = Math.min(c1, c2) + 1, maxC = Math.max(c1, c2) - 1; for (var c = minC; c <= maxC; c++) if (board[r1] && board[r1][c]) return false; return true; }
      var minR = Math.min(r1, r2) + 1, maxR = Math.max(r1, r2) - 1; for (var r = minR; r <= maxR; r++) if (board[r] && board[r][c1]) return false; return true;
    }
    function cellEmpty(r, c) { if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return true; return !board[r][c]; }

    function buildPath(r1, c1, r2, c2) {
      if (r1 === r2 && c1 === c2) return null;
      if (board[r1][c1] !== board[r2][c2]) return null;
      if (r1 === r2 || c1 === c2) {
        if (lineEmpty(r1, c1, r2, c2)) return [[r1, c1], [r2, c2]];
      }
      if (cellEmpty(r1, c2) && lineEmpty(r1, c1, r1, c2) && lineEmpty(r1, c2, r2, c2)) return [[r1, c1], [r1, c2], [r2, c2]];
      if (cellEmpty(r2, c1) && lineEmpty(r1, c1, r2, c1) && lineEmpty(r2, c1, r2, c2)) return [[r1, c1], [r2, c1], [r2, c2]];
      for (var rc = -1; rc <= ROWS; rc++) {
        if (rc === r1 || rc === r2) continue;
        if (cellEmpty(rc, c1) && cellEmpty(rc, c2) && lineEmpty(r1, c1, rc, c1) && lineEmpty(rc, c1, rc, c2) && lineEmpty(rc, c2, r2, c2)) return [[r1, c1], [rc, c1], [rc, c2], [r2, c2]];
      }
      for (var cc = -1; cc <= COLS; cc++) {
        if (cc === c1 || cc === c2) continue;
        if (cellEmpty(r1, cc) && cellEmpty(r2, cc) && lineEmpty(r1, c1, r1, cc) && lineEmpty(r1, cc, r2, cc) && lineEmpty(r2, cc, r2, c2)) return [[r1, c1], [r1, cc], [r2, cc], [r2, c2]];
      }
      return null;
    }

    function hasSolvableMove() {
      for (var r1 = 0; r1 < ROWS; r1++) {
        for (var c1 = 0; c1 < COLS; c1++) {
          if (!board[r1][c1]) continue;
          for (var r2 = 0; r2 < ROWS; r2++) {
            for (var c2 = 0; c2 < COLS; c2++) {
              if (r1 === r2 && c1 === c2) continue;
              if (!board[r2][c2]) continue;
              if (buildPath(r1, c1, r2, c2)) return true;
            }
          }
        }
      }
      return false;
    }

    function shuffleBoard() {
      var cells = [];
      for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) if (board[r][c]) cells.push([r, c]);
      var icons = cells.map(function(rc) { return board[rc[0]][rc[1]]; });
      for (var i = icons.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = icons[i]; icons[i] = icons[j]; icons[j] = t; }
      cells.forEach(function(rc, idx) { board[rc[0]][rc[1]] = icons[idx]; });
    }

    function ensureSolvable() {
      var attempts = 0;
      while (!hasSolvableMove() && attempts < 20) { shuffleBoard(); attempts++; }
    }

    function generateSolvableBoard() {
      var total = COLS * ROWS;
      var pairCount = total / 2;
      var typeCount = Math.min(ICONS.length, pairCount);
      var types = ICONS.slice(0, typeCount);
      var pool = [];
      for (var i = 0; i < pairCount; i++) { var icon = types[i % typeCount]; pool.push(icon, icon); }
      for (var i = pool.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
      board = [];
      for (var r = 0; r < ROWS; r++) board.push(pool.slice(r * COLS, (r + 1) * COLS).slice());
      ensureSolvable();
    }

    function initGame() {
      clearInterval(timerID); score = 0; timeLeft = 120; selected = null;
      while (lineSvg.firstChild) lineSvg.removeChild(lineSvg.firstChild);
      generateSolvableBoard();
      render();
      timerID = setInterval(function () {
        timeLeft--;
        timeEl.textContent = '⏱ ' + timeLeft + 's';
        if (timeLeft <= 0) { clearInterval(timerID); setTimeout(function () { alert('⏰ 时间到！得分：' + score); initGame(); }, 50); }
        if (timeLeft % 15 === 0 && timeLeft > 0) { ensureSolvable(); }
      }, 1000);
    }

    var _clicking = false;

    function render() {
      scoreEl.textContent = '分数: ' + score; timeEl.textContent = '⏱ ' + timeLeft + 's';
      var cs = calcCellSize(); boardEl.style.gridTemplateColumns = 'repeat(' + COLS + ',' + cs + 'px)'; boardEl.style.gap = '3px'; boardEl.innerHTML = '';
      for (var r = 0; r < ROWS; r++) {
        for (var c = 0; c < COLS; c++) {
          (function (r, c) {
            var icon = board[r][c]; var isSel = selected && selected[0] === r && selected[1] === c;
            var cell = div({ width: cs + 'px', height: cs + 'px', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: Math.round(cs * .54) + 'px', cursor: icon ? 'pointer' : 'default', background: icon ? '#fff' : 'rgba(255,255,255,.25)', border: icon ? '.5px solid rgba(0,0,0,.07)' : '.5px solid rgba(0,0,0,.04)', outline: isSel ? '2.5px solid #F3A04C' : 'none', outlineOffset: '-1px', transition: 'transform .1s', boxSizing: 'border-box', userSelect: 'none' });
            cell.dataset.rc = r + ',' + c;
            cell.textContent = icon || '';
            if (icon) {
              cell.addEventListener('mouseenter', function () { cell.style.transform = 'scale(1.1)'; });
              cell.addEventListener('mouseleave', function () { cell.style.transform = ''; });
              cell.addEventListener('click', function () { if (!_clicking) onCellClick(r, c); });
            }
            boardEl.appendChild(cell);
          })(r, c);
        }
      }
    }

    function onCellClick(r, c) {
      if (!board[r][c]) return;
      if (!selected) { selected = [r, c]; render(); return; }
      var sr = selected[0], sc = selected[1];
      if (sr === r && sc === c) { selected = null; render(); return; }
      if (board[sr][sc] !== board[r][c]) { selected = [r, c]; render(); return; }
      var path = buildPath(sr, sc, r, c);
      if (path) {
        _clicking = true;
        selected = null;
        flashLine(path, '#F3A04C', function () {
          animateRemove(sr, sc, r, c, function () {
            board[sr][sc] = ''; board[r][c] = ''; score += 10;
            Runtime.setScore('分数 ' + score);
            _clicking = false;
            render();
            if (!board.some(function (row) { return row.some(Boolean); })) { clearInterval(timerID); setTimeout(function () { alert('🎉 通关！得分：' + score); initGame(); }, 50); }
            else { ensureSolvable(); }
          });
        });
      } else {
        selected = [r, c]; render();
      }
    }

    restBtn.addEventListener('click', initGame); initGame();
    return { destroy: function () { clearInterval(timerID); } };
  }

  function mountFlappy(container) {
    cssObj(container, { width: '100%', height: '100%', display: 'flex', alignItems: 'stretch', justifyContent: 'stretch', background: '#70c5ce', overflow: 'hidden', padding: '0' });
    var canvas = document.createElement('canvas'); cssObj(canvas, { display: 'block', cursor: 'pointer', width: '100%', height: '100%' }); container.appendChild(canvas);
    var ctx = canvas.getContext('2d');
    function W() { return canvas.width; } function H() { return canvas.height; }
    var ro = new ResizeObserver(function () { canvas.width = container.clientWidth || 360; canvas.height = container.clientHeight || 460; }); ro.observe(container);
    canvas.width = container.clientWidth || 360; canvas.height = container.clientHeight || 460;

    var GRAVITY = 0.15;
    var JUMP_V = -4.8;
    var MAX_FALL = 4.2;
    var BASE_SPD = 2.6;
    var MAX_SPD = 4.8;
    var PIPE_W = 52;
    var GAP = 158;
    var PIPE_INT = 108;
    var GROUND_H = 28;

    var bird, pipes, score, raf, state, frame, groundX, pipeSpd;

    function init() { bird = { x: W() * 0.22, y: H() * 0.42, vy: 0, r: 14 }; pipes = []; score = 0; frame = 0; state = 'idle'; groundX = 0; pipeSpd = BASE_SPD; }
    function flap() { if (state === 'dead') { init(); return; } state = 'playing'; bird.vy = JUMP_V; }
    function addPipe() { var minY = H() * 0.15, maxY = H() - GROUND_H - GAP - H() * 0.15; pipes.push({ x: W() + PIPE_W, gapY: minY + Math.random() * (maxY - minY), scored: false }); }

    function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath(); }
    function drawPipe(x, topH, botY) { var w = PIPE_W, cap = 10, capW = w + 8; var g = ctx.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, '#4caf50'); g.addColorStop(.45, '#81c784'); g.addColorStop(1, '#388e3c'); ctx.fillStyle = g; ctx.fillRect(x, 0, w, topH - cap); ctx.fillStyle = '#388e3c'; ctx.fillRect(x - 4, topH - cap, capW, cap); ctx.fillRect(x - 4, botY, capW, cap); ctx.fillStyle = g; ctx.fillRect(x, botY + cap, w, H() - botY - cap); }
    function drawBird() {
      var x = bird.x, y = bird.y, r = bird.r; var angle = Math.min(Math.max(bird.vy * 0.05, -0.45), 1.3);
      ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
      ctx.fillStyle = '#f6c90e'; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f9e04b'; ctx.beginPath(); ctx.ellipse(r * .15, r * .2, r * .6, r * .5, 0, 0, Math.PI * 2); ctx.fill();
      var wingY = Math.sin(frame * 0.3) * 3;
      ctx.fillStyle = '#e6a817'; ctx.beginPath(); ctx.ellipse(-r * .2, wingY, r * .55, r * .3, -0.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.moveTo(r * .65, -r * .1); ctx.lineTo(r * 1.35, r * .05); ctx.lineTo(r * .65, r * .35); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(r * .3, -r * .28, r * .32, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1a1a2e'; ctx.beginPath(); ctx.arc(r * .42, -r * .22, r * .16, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(r * .48, -r * .28, r * .07, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    function drawGround() { var w = W(), gh = GROUND_H; ctx.fillStyle = '#ded895'; ctx.fillRect(0, H() - gh, w, gh); ctx.fillStyle = '#78b159'; ctx.fillRect(0, H() - gh, w, 6); ctx.fillStyle = '#c8b560'; for (var i = 0; i < Math.ceil(w / 24) + 1; i++) { var tx = ((groundX + i * 24) % (w + 24)) - 12; ctx.fillRect(tx, H() - gh + 8, 16, 3); } }

    function update() {
      if (state !== 'playing') return;
      frame++;
      pipeSpd = Math.min(MAX_SPD, BASE_SPD + score * 0.05);
      groundX = (groundX + pipeSpd) % 24;
      bird.vy += GRAVITY; if (bird.vy > MAX_FALL) bird.vy = MAX_FALL;
      bird.y += bird.vy;
      if (frame % PIPE_INT === 0) addPipe();
      var pNext = []; for (var i = 0; i < pipes.length; i++) { pipes[i].x -= pipeSpd; if (pipes[i].x > -PIPE_W - 20) pNext.push(pipes[i]); } pipes = pNext;
      var hitR = bird.r * 0.72;
      for (var i = 0; i < pipes.length; i++) {
        var p = pipes[i];
        if (!p.scored && p.x + PIPE_W < bird.x) { p.scored = true; score++; Runtime.setScore('分数 ' + score); }
        var inX = bird.x + hitR > p.x && bird.x - hitR < p.x + PIPE_W;
        if (inX && (bird.y - hitR < p.gapY || bird.y + hitR > p.gapY + GAP)) state = 'dead';
      }
      if (bird.y + bird.r > H() - GROUND_H || bird.y - bird.r < 0) state = 'dead';
    }

    function draw() {
      var w = W(), h = H();
      var sky = ctx.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#70c5ce'); sky.addColorStop(1, '#a8d8ea'); ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(255,255,255,.75)'; [[w * .1, h * .18, 40, 18], [w * .42, h * .1, 55, 22], [w * .72, h * .22, 38, 16]].forEach(function (c) { ctx.beginPath(); ctx.ellipse(c[0], c[1], c[2], c[3], 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(c[0] + c[2] * .4, c[1] - c[3] * .3, c[2] * .6, c[3] * .7, 0, 0, Math.PI * 2); ctx.fill(); });
      for (var i = 0; i < pipes.length; i++) drawPipe(pipes[i].x, pipes[i].gapY, pipes[i].gapY + GAP);
      drawGround(); drawBird();
      ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 3; ctx.font = 'bold 28px ui-sans-serif'; ctx.textAlign = 'center'; ctx.strokeText(String(score), w / 2, 48); ctx.fillText(String(score), w / 2, 48); ctx.lineWidth = 1; ctx.textAlign = 'left';
      if (state === 'idle') { ctx.fillStyle = 'rgba(0,0,0,.32)'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = 'rgba(255,255,255,.93)'; roundRect(w / 2 - 115, h / 2 - 38, 230, 76, 14); ctx.fill(); ctx.fillStyle = '#333'; ctx.font = 'bold 17px ui-sans-serif'; ctx.textAlign = 'center'; ctx.fillText('🐦 Flappy Bird', w / 2, h / 2 - 10); ctx.fillStyle = '#888'; ctx.font = '13px ui-sans-serif'; ctx.fillText('点击 / 空格键 起飞', w / 2, h / 2 + 18); ctx.textAlign = 'left'; }
      if (state === 'dead') { ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = 'rgba(255,255,255,.95)'; roundRect(w / 2 - 120, h / 2 - 56, 240, 108, 16); ctx.fill(); ctx.fillStyle = '#e53e3e'; ctx.font = 'bold 22px ui-sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Game Over', w / 2, h / 2 - 24); ctx.fillStyle = '#333'; ctx.font = '15px ui-sans-serif'; ctx.fillText('分数: ' + score, w / 2, h / 2 + 4); ctx.fillStyle = '#888'; ctx.font = '13px ui-sans-serif'; ctx.fillText('点击重新开始', w / 2, h / 2 + 30); ctx.textAlign = 'left'; }
    }

    function loop() { update(); draw(); raf = requestAnimationFrame(loop); }
    init(); raf = requestAnimationFrame(loop);
    function onClick() { flap(); }
    var keyH = function (e) { if (e.code === 'Space') { e.preventDefault(); flap(); } };
    canvas.addEventListener('click', onClick); window.addEventListener('keydown', keyH);
    return { destroy: function () { cancelAnimationFrame(raf); ro.disconnect(); canvas.removeEventListener('click', onClick); window.removeEventListener('keydown', keyH); } };
  }

  function mountShooter(container) {
    cssObj(container, { width: '100%', height: '100%', display: 'flex', alignItems: 'stretch', justifyContent: 'stretch', background: '#0d0d1a', overflow: 'hidden', padding: '0' });
    var canvas = document.createElement('canvas'); cssObj(canvas, { display: 'block', cursor: 'crosshair', width: '100%', height: '100%' }); container.appendChild(canvas);
    var ctx = canvas.getContext('2d');
    var W = function () { return canvas.width; }; var H = function () { return canvas.height; };
    var ro = new ResizeObserver(function () { canvas.width = container.clientWidth || 340; canvas.height = container.clientHeight || 460; });
    canvas.width = container.clientWidth || 340; canvas.height = container.clientHeight || 460; ro.observe(container);

    var MAX_PARTICLES = 200, MAX_BULLETS = 64;

    var DROP_DEFS = {
      shield: { icon: '🛡', color: '#4FC3F7', dur: 300 },
      triple: { icon: '🔱', color: '#FFD700', dur: 400 },
      bomb:   { icon: '💣', color: '#FF7043', dur: 0 },
      slow:   { icon: '⏳', color: '#CE93D8', dur: 350 },
      laser:  { icon: '⚡', color: '#80DEEA', dur: 200 },
      hp:     { icon: '❤️', color: '#EF9A9A', dur: 0 },
      rapid:  { icon: '🔥', color: '#FF8A65', dur: 300 },
    };
    var DROP_POOL = ['shield', 'triple', 'bomb', 'slow', 'laser', 'hp', 'triple', 'rapid', 'bomb', 'shield'];

    var player, bullets, enemies, drops, particles, explosions;
    var score, dead, paused, level, combo, comboTimer;
    var shootCD, enemyCD;
    var pw, mouseX, mouseY, raf, frameCount;

    function resetState() {
      player = { x: W() / 2, y: H() - 70, w: 28, h: 32, hp: 5, inv: 0 };
      bullets = []; enemies = []; drops = []; particles = []; explosions = [];
      score = 0; dead = false; paused = false; level = 1; combo = 0; comboTimer = 0;
      shootCD = 0; enemyCD = 0; frameCount = 0;
      pw = { shield: 0, triple: 0, slow: 0, laser: 0, rapid: 0 };
      mouseX = W() / 2; mouseY = H() - 70;
    }

    function addParticle(x, y, vx, vy, color, life, r) { if (particles.length >= MAX_PARTICLES) return; particles.push({ x: x, y: y, vx: vx, vy: vy, color: color, life: life, maxLife: life, r: r || 2 }); }
    function addExplosion(x, y, size, color, n) { n = n || 8; explosions.push({ x: x, y: y, size: size, color: color, life: 24, maxLife: 24 }); for (var i = 0; i < n; i++) { var a = Math.PI * 2 * i / n + Math.random() * 0.4; var spd = 1.5 + Math.random() * 3.5; addParticle(x, y, Math.cos(a) * spd, Math.sin(a) * spd, color, 18 + Math.floor(Math.random() * 12), 1.5 + Math.random() * 2.5); } }

    function drawShip(x, y, w, h, color, dir, accent) { ctx.save(); ctx.translate(x, y); if (dir === -1) ctx.rotate(Math.PI); ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, -h / 2); ctx.lineTo(-w / 2, h / 2); ctx.lineTo(-w / 4, h / 3); ctx.lineTo(0, h / 2 - 4); ctx.lineTo(w / 4, h / 3); ctx.lineTo(w / 2, h / 2); ctx.closePath(); ctx.fill(); ctx.fillStyle = accent || 'rgba(255,255,255,.28)'; ctx.beginPath(); ctx.ellipse(0, -h * .1, w * .18, h * .18, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }

    function levelSpdMul() { return 1 + (level - 1) * 0.035; }
    function levelHpMul() { return 1 + Math.floor((level - 1) / 6); }

    function spawnNormal(w) { var spd = (1.0 + level * 0.05) * levelSpdMul(); var hp = levelHpMul(); enemies.push({ x: 20 + Math.random() * (w - 40), y: -36, w: 26, h: 22, hp: hp, maxHp: hp, color: '#EF5350', pts: 10, hit: 0, type: 'n', spd: spd, tick: function (e) { e.y += e.spd; } }); }
    function spawnBomber(w) { var d = Math.random() < .5 ? 1 : -1; var spd = (0.5 + level * 0.04) * levelSpdMul(); var hp = Math.round(4 * levelHpMul()); enemies.push({ x: 30 + Math.random() * (w - 60), y: -44, w: 38, h: 32, hp: hp, maxHp: hp, color: '#FFA726', pts: 40, hit: 0, type: 'b', vx: d * 0.8, bw: w, spd: spd, tick: function (e) { e.y += e.spd; e.x += e.vx; if (e.x < 20 || e.x > e.bw - 20) e.vx *= -1; } }); }
    function spawnScout(w) { var vx = (Math.random() - .5) * 3; var spd = (2.2 + level * 0.10) * levelSpdMul(); enemies.push({ x: 20 + Math.random() * (w - 40), y: -28, w: 20, h: 18, hp: 1, maxHp: 1, color: '#26C6DA', pts: 25, hit: 0, type: 's', vx: vx, bw: w, spd: spd, tick: function (e) { e.y += e.spd; e.x += e.vx; if (e.x < 10) e.vx = Math.abs(e.vx); if (e.x > e.bw - 10) e.vx = -Math.abs(e.vx); } }); }
    function spawnZigzag(w) { var spd = (1.1 + level * 0.06) * levelSpdMul(); var amp = 55 + Math.random() * 55; var freq = 0.035 + Math.random() * 0.025; var hp = Math.round(2 * levelHpMul()); enemies.push({ x: 40 + Math.random() * (w - 80), y: -32, w: 24, h: 20, hp: hp, maxHp: hp, color: '#AB47BC', pts: 35, hit: 0, type: 'z', spd: spd, baseX: 40 + Math.random() * (w - 80), amp: amp, freq: freq, age: 0, tick: function (e) { e.y += e.spd; e.age++; e.x = e.baseX + Math.sin(e.age * e.freq) * e.amp; } }); }
    function spawnDiver(w) { var spd = (0.28 + level * 0.03) * levelSpdMul(); var hp = Math.round(3 * levelHpMul()); var px = player.x; enemies.push({ x: 40 + Math.random() * (w - 80), y: -40, w: 30, h: 26, hp: hp, maxHp: hp, color: '#EF9A9A', pts: 50, hit: 0, type: 'd', spd: spd, phase: 0, tx: px, tick: function (e) { e.phase++; if (e.phase < 65) { e.y += e.spd; } else { var dy = player.y - e.y; var dx = e.tx - e.x; var dist = Math.sqrt(dx * dx + dy * dy); if (dist > 2) { e.x += dx / dist * 4.5; e.y += dy / dist * 4.5; } } } }); }
    function spawnFormation(w) { var baseX = 30 + Math.random() * (w - 100); var spd = (0.8 + level * 0.05) * levelSpdMul(); for (var fi = 0; fi < 3; fi++) { (function (i) { enemies.push({ x: baseX + i * 42, y: -30 - i * 16, w: 22, h: 18, hp: 1, maxHp: 1, color: '#66BB6A', pts: 15, hit: 0, type: 'f', spd: spd, tick: function (e) { e.y += e.spd; } }); })(fi); } }
    function spawnBoss(w) { var hp = Math.round((18 + level * 5) * levelHpMul()); enemies.push({ x: w / 2, y: -70, w: 64, h: 56, hp: hp, maxHp: hp, color: '#FF1744', pts: 200 + level * 12, hit: 0, type: 'boss', spd: 0.4, vx: 0.8, bw: w, tick: function (e) { e.y += Math.min(e.spd, 0.28); e.x += e.vx; if (e.x < e.w / 2 + 10 || e.x > e.bw - e.w / 2 - 10) e.vx *= -1; } }); }

    function spawnEnemy() {
      var w = W(); var roll = Math.random();
      if (level >= 15 && roll < 0.04) { spawnBoss(w); return; }
      if (level >= 10 && roll < 0.10) { spawnFormation(w); return; }
      if (level >= 7 && roll < 0.17) { spawnDiver(w); return; }
      if (level >= 4 && roll < 0.27) { spawnZigzag(w); return; }
      if (roll < 0.52) spawnNormal(w);
      else if (roll < 0.78) spawnBomber(w);
      else spawnScout(w);
    }

    function spawnDrop(x, y, forced) { if (!forced && Math.random() > 0.22) return; var type = DROP_POOL[Math.floor(Math.random() * DROP_POOL.length)]; drops.push({ x: x, y: y, type: type, vy: 1.4, r: 14, age: 0 }); }

    function collectDrop(d) {
      var def = DROP_DEFS[d.type];
      if (d.type === 'bomb') {
        var killed = 0;
        for (var i = 0; i < enemies.length; i++) { var e = enemies[i]; if (e.dead) continue; e.dead = true; score += e.pts; killed++; if (killed <= 6) addExplosion(e.x, e.y, e.w * 1.4, e.color, 6); }
        addExplosion(d.x, d.y, 52, '#FF7043', 10); Runtime.setScore('分数 ' + score + ' 💣');
      } else if (d.type === 'hp') {
        if (player.hp < 6) player.hp++; Runtime.setScore('分数 ' + score + ' ❤️');
      } else {
        pw[d.type] = def.dur;
      }
      for (var k = 0; k < 10; k++) { var a = Math.PI * 2 * k / 10; addParticle(d.x, d.y, Math.cos(a) * 3, Math.sin(a) * 3, def.color, 28, 2.5); }
    }

    function fireBullets() {
      if (bullets.length >= MAX_BULLETS) return;
      var px = player.x, py = player.y - player.h / 2;
      var isLaser = pw.laser > 0;
      var isTriple = pw.triple > 0;
      var isRapid = pw.rapid > 0;

      if (isLaser && isTriple) {
        if (bullets.length + 3 > MAX_BULLETS) return;
        bullets.push({ x: px - 11, y: py, w: 5, h: 20, spd: 16, color: '#B2EBF2', laser: true, hitSet: new Set(), vx: -0.5 });
        bullets.push({ x: px,      y: py, w: 6, h: 20, spd: 16, color: '#80DEEA', laser: true, hitSet: new Set(), vx: 0 });
        bullets.push({ x: px + 11, y: py, w: 5, h: 20, spd: 16, color: '#B2EBF2', laser: true, hitSet: new Set(), vx: 0.5 });
      } else if (isLaser) {
        bullets.push({ x: px, y: py, w: 6, h: 20, spd: 16, color: '#80DEEA', laser: true, hitSet: new Set(), vx: 0 });
      } else if (isTriple) {
        if (bullets.length + 3 > MAX_BULLETS) return;
        var spd = isRapid ? 15 : 13;
        bullets.push({ x: px - 10, y: py, w: 3, h: 12, spd: spd, color: '#FFD700', vx: -0.8 });
        bullets.push({ x: px,      y: py, w: 3, h: 12, spd: spd, color: '#FFD700', vx: 0 });
        bullets.push({ x: px + 10, y: py, w: 3, h: 12, spd: spd, color: '#FFD700', vx: 0.8 });
      } else {
        if (bullets.length + 2 > MAX_BULLETS) return;
        var spd2 = isRapid ? 15 : 13;
        bullets.push({ x: px - 7, y: py, w: 3, h: 12, spd: spd2, color: '#89CFF0' });
        bullets.push({ x: px + 7, y: py, w: 3, h: 12, spd: spd2, color: '#89CFF0' });
      }
    }

    function update() {
      if (dead || paused) return;
      frameCount++;
      var w = W(), h = H();
      player.x += (mouseX - player.x) * 0.18; player.y += (mouseY - player.y) * 0.18;
      player.x = Math.max(player.w / 2, Math.min(w - player.w / 2, player.x));
      player.y = Math.max(player.h / 2, Math.min(h - player.h / 2, player.y));
      if (player.inv > 0) player.inv--;
      if (pw.shield > 0) pw.shield--; if (pw.triple > 0) pw.triple--; if (pw.slow > 0) pw.slow--; if (pw.laser > 0) pw.laser--; if (pw.rapid > 0) pw.rapid--;
      if (comboTimer > 0) { comboTimer--; if (comboTimer === 0) combo = 0; }

      var fireRate = pw.laser > 0 ? (pw.rapid > 0 ? 2 : 4) : (pw.rapid > 0 ? 5 : 10);
      shootCD++;
      if (shootCD >= fireRate) { shootCD = 0; fireBullets(); }

      for (var i = 0; i < bullets.length; i++) { var b = bullets[i]; b.y -= b.spd; if (b.vx) b.x += b.vx; }
      var bNext = []; for (var i = 0; i < bullets.length; i++) { var b2 = bullets[i]; if (b2.y > -30 && b2.x > -20 && b2.x < w + 20) bNext.push(b2); } bullets = bNext;

      var lvlThresh = 600 + level * 400;
      if (score > lvlThresh) level++;
      var spawnRate = Math.max(38, 80 - level * 3);
      enemyCD++; if (enemyCD >= spawnRate) { enemyCD = 0; spawnEnemy(); }

      for (var i = 0; i < enemies.length; i++) { var en = enemies[i]; if (en.dead) continue; var os = en.spd; if (pw.slow > 0) en.spd *= 0.3; en.tick(en); en.spd = os; }

      for (var bi = 0; bi < bullets.length; bi++) {
        var bl = bullets[bi]; if (bl.y < -20) continue;
        for (var ei = 0; ei < enemies.length; ei++) {
          var en2 = enemies[ei]; if (en2.dead) continue;
          if (bl.laser && bl.hitSet.has(en2)) continue;
          var bLeft = bl.x - (bl.laser ? bl.w / 2 : 0); var bRight = bLeft + (bl.laser ? bl.w : bl.w);
          var hit = bLeft < en2.x + en2.w / 2 && bRight > en2.x - en2.w / 2 && bl.y < en2.y + en2.h / 2 && bl.y + bl.h > en2.y - en2.h / 2;
          if (!hit) continue;
          if (!bl.laser) { bl.y = -9999; } else { bl.hitSet.add(en2); }
          en2.hp--; en2.hit = 5;
          if (en2.hp <= 0) {
            en2.dead = true; combo++; comboTimer = 180;
            var mul = combo >= 8 ? 3 : combo >= 4 ? 2 : 1; score += en2.pts * mul;
            Runtime.setScore('分数 ' + score + (combo >= 4 ? ' 🔥×' + combo : ''));
            addExplosion(en2.x, en2.y, en2.w * 1.2, en2.color, en2.type === 'boss' ? 16 : 8);
            spawnDrop(en2.x, en2.y, en2.type === 'boss');
            if (en2.type === 'boss') spawnDrop(en2.x + 20, en2.y, true);
          }
        }
      }

      var dNext = [];
      for (var di = 0; di < drops.length; di++) { var dr = drops[di]; dr.y += dr.vy; dr.age++; if (dr.y > h + 20) continue; var ddx = dr.x - player.x, ddy = dr.y - player.y; if (ddx * ddx + ddy * ddy < (dr.r + player.w / 2) * (dr.r + player.w / 2)) { collectDrop(dr); continue; } dNext.push(dr); } drops = dNext;

      if (player.inv <= 0 && pw.shield <= 0) {
        for (var ei2 = 0; ei2 < enemies.length; ei2++) { var en3 = enemies[ei2]; if (en3.dead) continue; var cx = Math.abs(en3.x - player.x), cy = Math.abs(en3.y - player.y); if (cx < en3.w / 2 + player.w / 2 - 5 && cy < en3.h / 2 + player.h / 2 - 5) { en3.dead = true; player.hp--; player.inv = 120; combo = 0; comboTimer = 0; addExplosion(en3.x, en3.y, en3.w, en3.color, 6); if (player.hp <= 0) dead = true; break; } }
      }

      var eNext = []; for (var ei3 = 0; ei3 < enemies.length; ei3++) { var en4 = enemies[ei3]; if (!en4.dead && en4.y < h + 80) eNext.push(en4); } enemies = eNext;
      for (var pi = 0; pi < particles.length; pi++) { var p = particles[pi]; p.x += p.vx; p.y += p.vy; p.vx *= 0.93; p.vy *= 0.93; p.life--; } var pNext = []; for (var pi2 = 0; pi2 < particles.length; pi2++) { if (particles[pi2].life > 0) pNext.push(particles[pi2]); } particles = pNext;
      for (var xi = 0; xi < explosions.length; xi++) explosions[xi].life--; var xNext = []; for (var xi2 = 0; xi2 < explosions.length; xi2++) { if (explosions[xi2].life > 0) xNext.push(explosions[xi2]); } explosions = xNext;
    }

    function draw() {
      var w = W(), h = H();
      var bg = ctx.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#0d0d1a'); bg.addColorStop(1, '#1a1a3e'); ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(255,255,255,.18)'; for (var s = 0; s < 60; s++) { ctx.fillRect((s * 137.5) % w, ((s * 97.3) + Date.now() * (0.014 + (s % 5) * 0.007)) % h, 1.2, 1.2); }
      for (var xi = 0; xi < explosions.length; xi++) { var ex = explosions[xi]; var prog = ex.life / ex.maxLife; ctx.globalAlpha = prog * 0.8; var eg = ctx.createRadialGradient(ex.x, ex.y, 0, ex.x, ex.y, ex.size * (1 - prog * 0.3)); eg.addColorStop(0, '#fff'); eg.addColorStop(0.3, ex.color); eg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(ex.x, ex.y, ex.size * (1 - prog * 0.3), 0, Math.PI * 2); ctx.fill(); } ctx.globalAlpha = 1;
      for (var pi = 0; pi < particles.length; pi++) { var p = particles[pi]; ctx.globalAlpha = p.life / p.maxLife * 0.9; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); } ctx.globalAlpha = 1;
      for (var di = 0; di < drops.length; di++) { var dr = drops[di], dd = DROP_DEFS[dr.type]; ctx.save(); ctx.translate(dr.x, dr.y); var glow = ctx.createRadialGradient(0, 0, 0, 0, 0, dr.r + 7); glow.addColorStop(0, dd.color + '66'); glow.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, 0, dr.r + 7, 0, Math.PI * 2); ctx.fill(); ctx.rotate(dr.age * 0.04); ctx.strokeStyle = dd.color; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, dr.r, 0, Math.PI * 2); ctx.stroke(); ctx.rotate(-dr.age * 0.04); ctx.font = Math.round(dr.r * 1.1) + 'px ui-sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(dd.icon, 0, 1); ctx.restore(); }
      for (var bi = 0; bi < bullets.length; bi++) { var bl = bullets[bi]; ctx.shadowColor = bl.color; ctx.shadowBlur = bl.laser ? 14 : 5; ctx.fillStyle = bl.color; if (bl.laser) { ctx.fillRect(bl.x - bl.w / 2, bl.y, bl.w, bl.h); } else { ctx.fillRect(bl.x, bl.y, bl.w, bl.h); } } ctx.shadowBlur = 0;
      for (var ei = 0; ei < enemies.length; ei++) { var en = enemies[ei]; if (en.hit > 0) { ctx.globalAlpha = 0.6; drawShip(en.x, en.y, en.w, en.h, '#fff', -1); ctx.globalAlpha = 1; en.hit--; } else { if (en.type === 'boss') { ctx.shadowColor = en.color; ctx.shadowBlur = 18; drawShip(en.x, en.y, en.w, en.h, en.color, -1, 'rgba(255,255,100,.5)'); ctx.shadowBlur = 0; } else drawShip(en.x, en.y, en.w, en.h, en.color, -1); } if (en.maxHp > 1) { var bw2 = en.w + 8, bh = 3, bx = en.x - bw2 / 2, by = en.y - en.h / 2 - 7; ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(bx, by, bw2, bh); ctx.fillStyle = en.hp / en.maxHp > 0.5 ? '#66BB6A' : '#EF5350'; ctx.fillRect(bx, by, bw2 * (en.hp / en.maxHp), bh); } }
      var showPlayer = player.inv <= 0 || Math.floor(player.inv / 6) % 2 === 0;
      if (showPlayer) {
        if (pw.shield > 0) { ctx.strokeStyle = '#4FC3F7'; ctx.lineWidth = 2; ctx.globalAlpha = 0.55 + Math.sin(Date.now() * 0.01) * 0.25; ctx.beginPath(); ctx.arc(player.x, player.y, player.w + 2, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; ctx.lineWidth = 1; }
        var sc2 = pw.laser > 0 ? (pw.triple > 0 ? '#B2EBF2' : '#80DEEA') : (pw.triple > 0 ? '#FFD700' : (pw.rapid > 0 ? '#FF8A65' : '#89CFF0'));
        drawShip(player.x, player.y, player.w, player.h, sc2, 1);
        ctx.fillStyle = pw.triple > 0 ? '#FF6F00' : '#FFA500'; ctx.beginPath(); ctx.moveTo(player.x - 5, player.y + player.h / 2); ctx.lineTo(player.x, player.y + player.h / 2 + 8 + Math.random() * 5); ctx.lineTo(player.x + 5, player.y + player.h / 2); ctx.closePath(); ctx.fill();
      }
      for (var i = 0; i < 5; i++) { ctx.fillStyle = i < player.hp ? '#EF5350' : 'rgba(255,255,255,.14)'; ctx.fillRect(10 + i * 16, 10, 12, 12); ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 0.5; ctx.strokeRect(10 + i * 16, 10, 12, 12); }
      ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.font = '11px ui-sans-serif'; ctx.textAlign = 'left'; ctx.fillText('Lv.' + level, 10, 36);
      var iconSz = 22, px2 = w - 12; var pwKeys = ['shield', 'triple', 'slow', 'laser', 'rapid'];
      for (var ki = 0; ki < pwKeys.length; ki++) { var k = pwKeys[ki]; if (pw[k] > 0) { var kd = DROP_DEFS[k]; px2 -= iconSz + 4; ctx.strokeStyle = kd.color; ctx.lineWidth = 2; var pg = pw[k] / (kd.dur || 1); ctx.beginPath(); ctx.arc(px2 + iconSz / 2, 18, 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pg, false); ctx.stroke(); ctx.font = (iconSz - 4) + 'px ui-sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(kd.icon, px2 + iconSz / 2, 18); ctx.textBaseline = 'alphabetic'; } }
      if (combo >= 3) { ctx.fillStyle = '#FFD700'; ctx.font = 'bold 14px ui-sans-serif'; ctx.textAlign = 'right'; ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 8; ctx.fillText('🔥 COMBO ×' + combo, w - 10, 38); ctx.shadowBlur = 0; } ctx.textAlign = 'left';
      if (pw.slow > 0) { var sg = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.8); sg.addColorStop(0, 'rgba(0,0,0,0)'); sg.addColorStop(1, 'rgba(156,39,176,.22)'); ctx.fillStyle = sg; ctx.fillRect(0, 0, w, h); }
      for (var bwi = 0; bwi < enemies.length; bwi++) { var enb = enemies[bwi]; if (enb.type === 'boss' && enb.y < enb.h) { ctx.fillStyle = 'rgba(255,23,68,' + (Math.sin(frameCount * 0.15) * 0.3 + 0.5) + ')'; ctx.font = 'bold 13px ui-sans-serif'; ctx.textAlign = 'center'; ctx.fillText('⚠ BOSS 来袭 ⚠', w / 2, h - 18); ctx.textAlign = 'left'; } }
      if (paused) { ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = 'rgba(255,255,255,.96)'; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(w / 2 - 100, h / 2 - 48, 200, 96, 14); else { ctx.rect(w / 2 - 100, h / 2 - 48, 200, 96); } ctx.fill(); ctx.fillStyle = '#333'; ctx.font = 'bold 20px ui-sans-serif'; ctx.textAlign = 'center'; ctx.fillText('⏸ 已暂停', w / 2, h / 2 - 12); ctx.fillStyle = '#888'; ctx.font = '13px ui-sans-serif'; ctx.fillText('按 ESC 继续', w / 2, h / 2 + 18); ctx.textAlign = 'left'; }
      if (dead) { ctx.fillStyle = 'rgba(0,0,0,.72)'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#EF5350'; ctx.font = 'bold 26px ui-sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Game Over', w / 2, h / 2 - 28); ctx.fillStyle = '#fff'; ctx.font = '16px ui-sans-serif'; ctx.fillText('最终分数: ' + score, w / 2, h / 2 + 2); ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.font = '13px ui-sans-serif'; ctx.fillText('点击重新开始', w / 2, h / 2 + 30); ctx.textAlign = 'left'; }
    }

    function loop() { update(); draw(); raf = requestAnimationFrame(loop); }
    resetState(); raf = requestAnimationFrame(loop);
    function onMM(e) { var rect = canvas.getBoundingClientRect(); mouseX = (e.clientX - rect.left) * (W() / rect.width); mouseY = (e.clientY - rect.top) * (H() / rect.height); }
    function onCk() { if (dead) resetState(); }
    var onKey = function (e) { if (e.key === 'Escape') { if (dead) return; paused = !paused; e.preventDefault(); } };
    canvas.addEventListener('mousemove', onMM); canvas.addEventListener('click', onCk); window.addEventListener('keydown', onKey);
    return { destroy: function () { cancelAnimationFrame(raf); ro.disconnect(); canvas.removeEventListener('mousemove', onMM); canvas.removeEventListener('click', onCk); window.removeEventListener('keydown', onKey); } };
  }

  function mountMine(container) {
    cssObj(container, { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', overflow: 'hidden', background: '#f0f0f0', padding: '10px', boxSizing: 'border-box', fontFamily: 'ui-sans-serif,system-ui,sans-serif', color: 'rgba(0,0,0,.8)' });

    var LEVELS = {
      easy:   { rows: 9,  cols: 9,  mines: 10 },
      medium: { rows: 16, cols: 16, mines: 40 },
      hard:   { rows: 16, cols: 30, mines: 99 },
    };
    var cfg = LEVELS.easy;
    var board, revealed, flagged, gameState, timerVal, timerID, firstClick, minesLeft;

    var topBar = div({ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexShrink: '0', width: '100%', justifyContent: 'center' });

    var lvlBtns = {};
    ['easy', 'medium', 'hard'].forEach(function (lv) {
      var btn = document.createElement('button');
      btn.textContent = lv === 'easy' ? '初级' : lv === 'medium' ? '中级' : '高级';
      cssObj(btn, { height: '26px', padding: '0 10px', border: '.5px solid rgba(0,0,0,.15)', borderRadius: '7px', background: 'rgba(0,0,0,.06)', fontSize: '11px', cursor: 'pointer', transition: 'background .1s' });
      btn.addEventListener('click', function () { cfg = LEVELS[lv]; Object.keys(lvlBtns).forEach(function (k) { lvlBtns[k].style.background = 'rgba(0,0,0,.06)'; lvlBtns[k].style.color = ''; lvlBtns[k].style.fontWeight = '400'; }); btn.style.background = '#4a9eff'; btn.style.color = '#fff'; btn.style.fontWeight = '600'; newGame(); });
      lvlBtns[lv] = btn; topBar.appendChild(btn);
    });
    lvlBtns.easy.style.background = '#4a9eff'; lvlBtns.easy.style.color = '#fff'; lvlBtns.easy.style.fontWeight = '600';
    container.appendChild(topBar);

    var infoBar = div({ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px', flexShrink: '0', justifyContent: 'center' });
    var mineEl = div({ fontSize: '14px', fontWeight: '600', minWidth: '48px', textAlign: 'center' });
    var faceBtn = document.createElement('button'); cssObj(faceBtn, { fontSize: '20px', background: 'none', border: '.5px solid rgba(0,0,0,.15)', borderRadius: '8px', width: '34px', height: '34px', cursor: 'pointer', lineHeight: '1' }); faceBtn.textContent = '🙂';
    var timerEl = div({ fontSize: '14px', fontWeight: '600', fontVariantNumeric: 'tabular-nums', minWidth: '48px', textAlign: 'center' });
    infoBar.appendChild(mineEl); infoBar.appendChild(faceBtn); infoBar.appendChild(timerEl); container.appendChild(infoBar);

    var boardWrap = div({ flex: '1', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '0', width: '100%' }); container.appendChild(boardWrap);
    var boardEl = document.createElement('div'); cssObj(boardEl, { display: 'inline-grid', userSelect: 'none' }); boardWrap.appendChild(boardEl);

    var NUM_COLORS = ['', '#1565C0', '#2E7D32', '#C62828', '#6A1B9A', '#BF360C', '#00695C', '#000', '#555'];

    function calcCellSize() {
      var gap = 2;
      var ww = boardWrap.clientWidth || 600, wh = boardWrap.clientHeight || 400;
      var maxW = Math.floor((ww - (cfg.cols - 1) * gap) / cfg.cols);
      var maxH = Math.floor((wh - (cfg.rows - 1) * gap) / cfg.rows);
      return Math.max(18, Math.min(maxW, maxH, 38));
    }

    function newGame() {
      clearInterval(timerID); timerVal = 0; gameState = 'idle'; firstClick = true;
      board = []; revealed = []; flagged = []; minesLeft = cfg.mines;
      for (var r = 0; r < cfg.rows; r++) { board.push([]); revealed.push([]); flagged.push([]); for (var c = 0; c < cfg.cols; c++) { board[r].push(0); revealed[r].push(false); flagged[r].push(false); } }
      timerEl.textContent = '000'; mineEl.textContent = '💣 ' + String(minesLeft).padStart(3, '0'); faceBtn.textContent = '🙂'; render();
    }

    function placeMines(safeR, safeC) {
      var placed = 0;
      while (placed < cfg.mines) {
        var r = Math.floor(Math.random() * cfg.rows), c = Math.floor(Math.random() * cfg.cols);
        if (board[r][c] === -1) continue;
        if (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) continue;
        board[r][c] = -1; placed++;
      }
      for (var r = 0; r < cfg.rows; r++) { for (var c = 0; c < cfg.cols; c++) { if (board[r][c] !== -1) { var cnt = 0; forNeighbors(r, c, function (nr, nc) { if (board[nr][nc] === -1) cnt++; }); board[r][c] = cnt; } } }
    }

    function forNeighbors(r, c, fn) { for (var dr = -1; dr <= 1; dr++) { for (var dc = -1; dc <= 1; dc++) { if (dr === 0 && dc === 0) continue; var nr = r + dr, nc = c + dc; if (nr >= 0 && nr < cfg.rows && nc >= 0 && nc < cfg.cols) fn(nr, nc); } } }

    function reveal(r, c) {
      if (revealed[r][c] || flagged[r][c]) return;
      revealed[r][c] = true;
      if (board[r][c] === 0) forNeighbors(r, c, function (nr, nc) { reveal(nr, nc); });
    }

    function checkWin() { for (var r = 0; r < cfg.rows; r++) { for (var c = 0; c < cfg.cols; c++) { if (board[r][c] !== -1 && !revealed[r][c]) return false; } } return true; }

    function explodeAll() {
      for (var r = 0; r < cfg.rows; r++) { for (var c = 0; c < cfg.cols; c++) { if (board[r][c] === -1) revealed[r][c] = true; } }
    }

    function startTimer() {
      timerID = setInterval(function () {
        timerVal++;
        timerEl.textContent = String(Math.min(timerVal, 999)).padStart(3, '0');
        Runtime.setScore('用时 ' + timerVal + 's');
      }, 1000);
    }

    function render() {
      var cs = calcCellSize();
      var gap = 2;
      boardEl.style.gridTemplateColumns = 'repeat(' + cfg.cols + ',' + cs + 'px)';
      boardEl.style.gap = gap + 'px';
      boardEl.innerHTML = '';
      for (var r = 0; r < cfg.rows; r++) {
        for (var c = 0; c < cfg.cols; c++) {
          (function (r, c) {
            var cell = document.createElement('div');
            var rev = revealed[r][c], fl = flagged[r][c], val = board[r][c];
            var bg = rev ? (val === -1 ? '#FF5252' : '#d0d0d0') : '#bdbdbd';
            var fs = cs >= 28 ? Math.round(cs * 0.5) : Math.round(cs * 0.56);
            cssObj(cell, { width: cs + 'px', height: cs + 'px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: fs + 'px', fontWeight: '700', background: bg, border: rev ? '.5px solid rgba(0,0,0,.12)' : '.5px solid rgba(255,255,255,.6)', cursor: gameState === 'playing' || gameState === 'idle' ? 'pointer' : 'default', boxSizing: 'border-box', transition: 'background .08s', boxShadow: rev ? 'none' : 'inset 0 1px 0 rgba(255,255,255,.5),inset 0 -1px 0 rgba(0,0,0,.15)' });
            if (rev) {
              if (val === -1) cell.textContent = '💣';
              else if (val > 0) { cell.textContent = String(val); cell.style.color = NUM_COLORS[val]; }
            } else if (fl) { cell.textContent = '🚩'; }
            if (gameState !== 'dead' && gameState !== 'won') {
              cell.addEventListener('click', function () { onLeftClick(r, c); });
              cell.addEventListener('contextmenu', function (e) { e.preventDefault(); onRightClick(r, c); });
              cell.addEventListener('mousedown', function () { if (!revealed[r][c] && gameState !== 'dead' && gameState !== 'won') { faceBtn.textContent = '😮'; } });
              cell.addEventListener('mouseup', function () { if (gameState !== 'dead' && gameState !== 'won') faceBtn.textContent = '🙂'; });
            }
            boardEl.appendChild(cell);
          })(r, c);
        }
      }
    }

    function onLeftClick(r, c) {
      if (gameState === 'dead' || gameState === 'won') return;
      if (flagged[r][c]) return;
      if (firstClick) { firstClick = false; gameState = 'playing'; placeMines(r, c); startTimer(); }
      if (board[r][c] === -1) {
        revealed[r][c] = true; explodeAll(); gameState = 'dead'; clearInterval(timerID); faceBtn.textContent = '😵'; render(); return;
      }
      reveal(r, c);
      if (checkWin()) { gameState = 'won'; clearInterval(timerID); faceBtn.textContent = '😎'; Runtime.setScore('胜利！用时 ' + timerVal + 's'); }
      render();
    }

    function onRightClick(r, c) {
      if (gameState === 'dead' || gameState === 'won' || revealed[r][c]) return;
      if (firstClick) { firstClick = false; gameState = 'playing'; placeMines(r, c); startTimer(); }
      flagged[r][c] = !flagged[r][c]; minesLeft += flagged[r][c] ? -1 : 1;
      mineEl.textContent = '💣 ' + String(Math.max(0, minesLeft)).padStart(3, '0');
      render();
    }

    faceBtn.addEventListener('click', newGame);
    newGame();
    return { destroy: function () { clearInterval(timerID); } };
  }

  var BUILTIN = [
    { name: 'game-2048',    label: '2048',    icon: '🔢', color: '#B9887D', desc: '数字合并',  controls: '方向键 / WASD',       builtin: true, mount: mount2048    },
    { name: 'game-llk',     label: '连连看',  icon: '🍎', color: '#58B2DC', desc: '图案消除',  controls: '点击配对消除',          builtin: true, mount: mountLLK     },
    { name: 'game-flappy',  label: '像素鸟',  icon: '🐦', color: '#86C166', desc: '躲避障碍',  controls: '点击 / 空格起飞',       builtin: true, mount: mountFlappy  },
    { name: 'game-shooter', label: '星际突击', icon: '🚀', color: '#F17C67', desc: '弹幕射击',  controls: '鼠标瞄准 · ESC暂停',   builtin: true, mount: mountShooter },
    { name: 'game-mine',    label: '扫雷',    icon: '💣', color: '#78909C', desc: '排除地雷',  controls: '左键翻开 · 右键插旗',   builtin: true, mount: mountMine    },
  ];

  Runtime._resolve();
  BUILTIN.forEach(function (g) { Runtime.register(g.name, g); sBuiltinWrap.appendChild(makeSidebarItem(g.name, g)); });
  renderGrid(); updateStatus();
  window.dispatchEvent(new CustomEvent('tb-skill:master-online'));

})();