/* ============================================================
 * 妙招名称：六级冲550打卡助手（任务清单版）
 * 功能说明：
 *   1. 每日单词卡 + 分阶段任务清单，全部任务完成才能打卡；
 *   2. 任务按备考阶段（基础期/强化期/冲刺期）自动切换，显示考试倒计时；
 *   3. 词库支持手动增删、CSV 导入/导出、恢复默认；
 *   4. 统计连续/累计打卡、最近 7 天记录；数据仅存 localStorage。
 * 升级说明：沿用旧版打卡记录存储键，之前的连续天数不会丢失。
 * CSV 格式（UTF-8，表头可选）：word,phonetic,meaning,example,translation
 * ============================================================ */
(function () {
  'use strict';

  /* ---------- 1. 防止重复注入 ---------- */
  var HOST_ID = '__cet6_checkin_host__';
  if (document.getElementById(HOST_ID)) return;

  /* ---------- 2. 可自定义区域：考试日期 + 分阶段任务 ---------- */
  var EXAM_DATE = '2026-12-19'; // 考试日期（以准考证为准，可自行修改）

  var PHASES = [
    {
      name: '基础期', from: '2026-01-01', to: '2026-09-30',
      tasks: [
        '词汇：新学+复习 20 个（结合上方单词卡）',
        '听力：精听 20 分钟（真题音频，听写+跟读）',
        '写译：背 2 个高分句型，各仿写 1 句',
        '复盘：整理今日生词与错因'
      ]
    },
    {
      name: '强化期', from: '2026-10-01', to: '2026-11-15',
      tasks: [
        '词汇：复习 20 个 + 今日单词卡',
        '听力：真题 1 个 Section（限时+精听复盘）',
        '写译：翻译 1 段或写作 1 篇（限时）',
        '阅读：真题 2 篇（限时 20 分钟，逐题定位）',
        '复盘：记录错题原因并归类'
      ]
    },
    {
      name: '冲刺期', from: '2026-11-16', to: '2026-12-31',
      tasks: [
        '套题：真题 1 套或半套（严格限时）',
        '听力：精听 20 分钟保持题感',
        '写译：写作 1 篇 + 翻译 1 段（套用模板）',
        '复习：错题本 + 高频词过一遍'
      ]
    }
  ];

  /* ---------- 3. 内置默认词库（词库为空时兜底） ---------- */
  var DEFAULT_WORDS = [
    { w: 'accumulate',  p: '/əˈkjuːmjəleɪt/', m: 'v. 积累；堆积',            e: 'Reading accumulates knowledge bit by bit.',     t: '阅读一点一滴地积累知识。' },
    { w: 'alleviate',   p: '/əˈliːvieɪt/',    m: 'v. 减轻；缓和',            e: 'The new policy alleviated traffic congestion.', t: '新政策缓解了交通拥堵。' },
    { w: 'ambitious',   p: '/æmˈbɪʃəs/',      m: 'adj. 有雄心的；宏大的',     e: 'She set an ambitious goal for this semester.',  t: '她为这学期定下了宏大的目标。' },
    { w: 'consensus',   p: '/kənˈsensəs/',    m: 'n. 共识；一致意见',         e: 'The two sides finally reached a consensus.',    t: '双方最终达成了共识。' },
    { w: 'controversy', p: '/ˈkɒntrəvɜːsi/',  m: 'n. 争议；争论',            e: 'The plan has sparked heated controversy.',      t: '该计划引发了激烈的争议。' },
    { w: 'crucial',     p: '/ˈkruːʃl/',       m: 'adj. 至关重要的',          e: 'Sleep is crucial to memory consolidation.',     t: '睡眠对巩固记忆至关重要。' },
    { w: 'deteriorate', p: '/dɪˈtɪəriəreɪt/', m: 'v. 恶化；变坏',            e: 'His eyesight began to deteriorate.',            t: '他的视力开始下降。' },
    { w: 'dilemma',     p: '/dɪˈlemə/',       m: 'n. 两难境地',              e: 'Graduates often face the dilemma of choice.',   t: '毕业生常面临选择的两难。' },
    { w: 'eliminate',   p: '/ɪˈlɪmɪneɪt/',    m: 'v. 消除；淘汰',            e: 'Exercise helps eliminate stress.',              t: '运动有助于消除压力。' },
    { w: 'feasible',    p: '/ˈfiːzəbl/',      m: 'adj. 可行的',              e: 'The proposal sounds feasible in practice.',     t: '这个提议在实践中听起来可行。' },
    { w: 'inevitable',  p: '/ɪnˈevɪtəbl/',    m: 'adj. 不可避免的',          e: 'Change is inevitable in the digital age.',      t: '在数字时代，变化不可避免。' },
    { w: 'integrity',   p: '/ɪnˈteɡrəti/',    m: 'n. 正直；完整',            e: 'Academic integrity matters at college.',        t: '学术诚信在大学里很重要。' },
    { w: 'jeopardize',  p: '/ˈdʒepədaɪz/',    m: 'v. 危及；损害',            e: 'Staying up late may jeopardize your health.',   t: '熬夜可能损害你的健康。' },
    { w: 'legitimate',  p: '/lɪˈdʒɪtɪmət/',   m: 'adj. 合法的；合理的',       e: 'Online learning is a legitimate option.',      t: '在线学习是一种合理的选择。' },
    { w: 'obstacle',    p: '/ˈɒbstəkl/',      m: 'n. 障碍',                  e: 'Lack of practice is a major obstacle.',         t: '缺乏练习是一大障碍。' },
    { w: 'profound',    p: '/prəˈfaʊnd/',     m: 'adj. 深刻的；深远的',       e: 'The book had a profound influence on me.',     t: '这本书对我影响深远。' },
    { w: 'reluctant',   p: '/rɪˈlʌktənt/',    m: 'adj. 不情愿的',            e: 'He was reluctant to speak in public.',          t: '他不愿在公众场合发言。' },
    { w: 'skeptical',   p: '/ˈskeptɪkl/',     m: 'adj. 怀疑的',              e: 'Consumers are skeptical of advertisements.',    t: '消费者对广告持怀疑态度。' },
    { w: 'substantial', p: '/səbˈstænʃl/',    m: 'adj. 大量的；实质性的',     e: 'She made substantial progress this month.',    t: '这个月她取得了实质性的进步。' },
    { w: 'tackle',      p: '/ˈtækl/',         m: 'v. 处理；应对',            e: 'We must tackle the problem step by step.',      t: '我们必须一步步解决这个问题。' },
    { w: 'versatile',   p: '/ˈvɜːsətaɪl/',    m: 'adj. 多用途的；多才多艺的', e: 'English is a versatile tool at work.',         t: '英语是工作中的多用途工具。' }
  ];

  /* ---------- 4. 存储与工具函数 ---------- */
  var CHECKIN_KEY = 'cet6_checkin_records_v1'; // 与旧版一致，记录不丢
  var WORDS_KEY   = 'cet6_custom_words_v1';
  var TASKS_KEY   = 'cet6_task_states_v1';

  function pad(n) { return String(n).padStart(2, '0'); }
  function dateStr(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function todayStr() { return dateStr(new Date()); }

  function loadRecords() {
    try {
      var arr = JSON.parse(window.localStorage.getItem(CHECKIN_KEY) || '[]');
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }
  function saveRecords(days) {
    try { window.localStorage.setItem(CHECKIN_KEY, JSON.stringify(days)); } catch (e) {}
  }

  function getWordBank() {
    try {
      var arr = JSON.parse(window.localStorage.getItem(WORDS_KEY) || 'null');
      if (Array.isArray(arr) && arr.length > 0) return arr;
    } catch (e) {}
    return DEFAULT_WORDS.slice();
  }
  function saveWordBank(list) {
    try { window.localStorage.setItem(WORDS_KEY, JSON.stringify(list)); } catch (e) {}
  }

  /* 任务完成状态：按日期存储布尔数组 */
  function loadTaskStates() {
    try {
      var o = JSON.parse(window.localStorage.getItem(TASKS_KEY) || '{}');
      return (o && typeof o === 'object') ? o : {};
    } catch (e) { return {}; }
  }

  /* 连续打卡天数 */
  function calcStreak(set) {
    var streak = 0, cursor = new Date();
    if (!set.has(dateStr(cursor))) cursor.setDate(cursor.getDate() - 1);
    while (set.has(dateStr(cursor))) { streak++; cursor.setDate(cursor.getDate() - 1); }
    return streak;
  }

  /* 当前所处备考阶段（ISO 日期字符串可直接比较大小） */
  function getTodayPhase() {
    var t = todayStr();
    for (var i = 0; i < PHASES.length; i++) {
      if (t >= PHASES[i].from && t <= PHASES[i].to) return PHASES[i];
    }
    return { name: '备考期', tasks: ['复习错题与高频词', '保持听力题感 20 分钟'] };
  }

  /* 今日任务完成状态（与当前任务数对齐） */
  function getTodayTasks() {
    var phase = getTodayPhase();
    var arr = loadTaskStates()[todayStr()] || [];
    var res = [];
    for (var i = 0; i < phase.tasks.length; i++) res.push(!!arr[i]);
    return res;
  }
  function toggleTask(idx) {
    var all = loadTaskStates();
    var cur = getTodayTasks();
    cur[idx] = !cur[idx];
    all[todayStr()] = cur;
    try { window.localStorage.setItem(TASKS_KEY, JSON.stringify(all)); } catch (e) {}
  }

  /* 距考试天数 */
  function daysToExam() {
    var exam = new Date(EXAM_DATE + 'T00:00:00');
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.max(0, Math.round((exam - today) / 86400000));
  }

  /* 今日单词（按天轮换） */
  function getTodayWord() {
    var bank = getWordBank();
    var now = new Date();
    var dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
    return bank[dayOfYear % bank.length];
  }

  function encourage(streak) {
    if (streak === 1)  return '好的开始！明天继续，别断档。';
    if (streak === 7)  return '连续 7 天！550 的路上你已超过大多数人。';
    if (streak === 21) return '21 天！习惯已成型，继续冲。';
    if (streak === 50) return '连续 50 天！这个执行力就是 550 的底气。';
    if (streak === 100) return '连续 100 天！考场见真章。';
    if (streak % 10 === 0) return '连续 ' + streak + ' 天，状态很稳！';
    return '打卡成功，已连续 ' + streak + ' 天，继续保持！';
  }

  /* ---------- 5. CSV 解析与生成 ---------- */
  function parseCSV(text) {
    var rows = [], row = [], field = '', inQ = false;
    text = String(text || '').replace(/^﻿/, ''); // 去掉 BOM
    for (var i = 0; i < text.length; i++) {
      var c = text.charAt(i);
      if (inQ) {
        if (c === '"') {
          if (text.charAt(i + 1) === '"') { field += '"'; i++; }
          else { inQ = false; }
        } else { field += c; }
      } else {
        if (c === '"') { inQ = true; }
        else if (c === ',') { row.push(field); field = ''; }
        else if (c === '\n') { row.push(field); field = ''; rows.push(row); row = []; }
        else if (c === '\r') {
          if (text.charAt(i + 1) === '\n') { i++; }
          row.push(field); field = ''; rows.push(row); row = [];
        }
        else { field += c; }
      }
    }
    if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
    return rows;
  }

  function importCSV(text) {
    var rows = parseCSV(text);
    if (rows.length && /^word$/i.test((rows[0][0] || '').trim())) rows.shift();
    var bank = getWordBank(), existing = {};
    bank.forEach(function (w) { existing[String(w.w).toLowerCase()] = true; });
    var added = 0, skipped = 0;
    rows.forEach(function (r) {
      var w = (r[0] || '').trim();
      if (!w) return;
      var key = w.toLowerCase();
      if (existing[key]) { skipped++; return; }
      existing[key] = true;
      bank.push({ w: w, p: (r[1] || '').trim(), m: (r[2] || '').trim(), e: (r[3] || '').trim(), t: (r[4] || '').trim() });
      added++;
    });
    saveWordBank(bank);
    return { added: added, skipped: skipped };
  }

  function csvEscape(s) {
    s = String(s == null ? '' : s);
    if (/[",\n\r]/.test(s)) { return '"' + s.replace(/"/g, '""') + '"'; }
    return s;
  }
  function exportCSV() {
    var lines = ['word,phonetic,meaning,example,translation'];
    getWordBank().forEach(function (w) {
      lines.push([w.w, w.p, w.m, w.e, w.t].map(csvEscape).join(','));
    });
    var blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'cet6_words.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  /* ---------- 6. 注入浮窗（Shadow DOM 隔离样式） ---------- */
  var host = document.createElement('div');
  host.id = HOST_ID;
  document.documentElement.appendChild(host);
  var root = host.attachShadow({ mode: 'open' });

  root.innerHTML =
    '<style>' +
    ':host{all:initial;}' +
    '*{box-sizing:border-box;margin:0;padding:0;font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;}' +
    '.badge{position:fixed;right:20px;bottom:20px;z-index:2147483647;width:54px;height:54px;border-radius:50%;' +
      'background:linear-gradient(135deg,#4f7cff,#7a5cff);color:#fff;display:flex;flex-direction:column;' +
      'align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 16px rgba(79,124,255,.4);' +
      'user-select:none;transition:transform .2s;}' +
    '.badge:hover{transform:scale(1.08);}' +
    '.badge .num{font-size:17px;font-weight:700;line-height:1;}' +
    '.badge .lbl{font-size:10px;opacity:.85;margin-top:3px;}' +
    '.badge.pulse{animation:cet6pulse 1.6s infinite;}' +
    '@keyframes cet6pulse{0%,100%{box-shadow:0 4px 16px rgba(79,124,255,.4);}50%{box-shadow:0 4px 24px rgba(122,92,255,.9);}}' +
    '.panel{position:fixed;right:20px;bottom:86px;z-index:2147483647;width:324px;border-radius:14px;background:#fff;' +
      'color:#1f2329;box-shadow:0 10px 40px rgba(0,0,0,.18);overflow:hidden;display:none;}' +
    '.panel.show{display:block;}' +
    '.head{background:linear-gradient(135deg,#4f7cff,#7a5cff);color:#fff;padding:12px 14px;display:flex;justify-content:space-between;align-items:center;}' +
    '.head .title{font-size:14px;font-weight:700;}' +
    '.head .date{font-size:11px;opacity:.85;margin-top:3px;}' +
    '.head .icons{display:flex;gap:4px;}' +
    '.head .ic{cursor:pointer;font-size:13px;opacity:.8;line-height:1;padding:3px 5px;border-radius:5px;}' +
    '.head .ic:hover{opacity:1;background:rgba(255,255,255,.15);}' +
    '.body{padding:14px;max-height:62vh;overflow-y:auto;}' +
    '.word-card{background:#f5f7ff;border-radius:10px;padding:12px;margin-bottom:10px;}' +
    '.word-card .w{font-size:20px;font-weight:700;color:#3b5bff;}' +
    '.word-card .p{font-size:12px;color:#8a8f99;margin:3px 0 6px;}' +
    '.word-card .m{font-size:13px;margin-bottom:6px;line-height:1.5;}' +
    '.word-card .e{font-size:12px;color:#555;line-height:1.6;}' +
    '.word-card .e i{color:#8a8f99;font-style:normal;display:block;}' +
    '.tasks-title{font-size:12px;font-weight:700;color:#3b5bff;margin:4px 0 8px;}' +
    '.task{display:flex;align-items:flex-start;gap:8px;padding:8px 10px;border:1px solid #eef0f3;' +
      'border-radius:8px;margin-bottom:6px;cursor:pointer;font-size:12px;line-height:1.5;color:#555;background:#fafbfc;user-select:none;}' +
    '.task .cb{width:16px;height:16px;border:1.5px solid #c9d4ff;border-radius:4px;flex-shrink:0;margin-top:1px;' +
      'display:flex;align-items:center;justify-content:center;font-size:11px;color:#fff;}' +
    '.task.on{background:#f5f7ff;border-color:#c9d4ff;color:#1f2329;}' +
    '.task.on .cb{background:linear-gradient(135deg,#4f7cff,#7a5cff);border-color:#4f7cff;}' +
    '.stats{display:flex;gap:10px;margin:10px 0;}' +
    '.stat{flex:1;text-align:center;background:#fafbfc;border:1px solid #eef0f3;border-radius:10px;padding:8px 0;}' +
    '.stat .n{font-size:18px;font-weight:700;color:#3b5bff;}' +
    '.stat .t{font-size:11px;color:#8a8f99;margin-top:2px;}' +
    '.week{display:flex;justify-content:space-between;margin-bottom:12px;}' +
    '.day{text-align:center;font-size:10px;color:#8a8f99;width:32px;}' +
    '.day .dot{width:22px;height:22px;border-radius:50%;background:#eceff3;margin:4px auto 0;' +
      'display:flex;align-items:center;justify-content:center;font-size:12px;color:#fff;}' +
    '.day.on .dot{background:linear-gradient(135deg,#4f7cff,#7a5cff);}' +
    '.day.today .dot{outline:2px solid #c9d4ff;}' +
    '.btn{width:100%;border:none;border-radius:10px;padding:11px 0;font-size:14px;font-weight:700;cursor:pointer;' +
      'background:linear-gradient(135deg,#4f7cff,#7a5cff);color:#fff;transition:opacity .2s;}' +
    '.btn:hover{opacity:.92;}' +
    '.btn.done{background:#eceff3;color:#8a8f99;cursor:default;}' +
    '.msg{margin-top:10px;font-size:12px;color:#3b5bff;text-align:center;min-height:16px;line-height:1.5;}' +
    '.lib-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;}' +
    '.lib-head .t{font-size:13px;font-weight:700;}' +
    '.lib-head .n{font-size:11px;color:#8a8f99;}' +
    '.word-list{max-height:150px;overflow-y:auto;border:1px solid #eef0f3;border-radius:10px;margin-bottom:10px;}' +
    '.wi{display:flex;align-items:center;justify-content:space-between;padding:7px 10px;border-bottom:1px solid #f2f4f7;font-size:12px;}' +
    '.wi:last-child{border-bottom:none;}' +
    '.wi .ww{font-weight:700;color:#3b5bff;margin-right:8px;}' +
    '.wi .wm{color:#555;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
    '.wi .del{cursor:pointer;color:#c0c4cc;font-size:12px;padding:2px 4px;}' +
    '.wi .del:hover{color:#f56c6c;}' +
    '.add-row{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px;}' +
    '.add-row input{border:1px solid #e4e7ed;border-radius:8px;padding:7px 9px;font-size:12px;width:100%;outline:none;}' +
    '.add-row input:focus{border-color:#4f7cff;}' +
    '.add-row .full{grid-column:1 / -1;}' +
    '.lib-btns{display:flex;gap:6px;}' +
    '.lib-btn{flex:1;border:1px solid #dcdfe6;background:#fff;color:#555;border-radius:8px;padding:8px 0;' +
      'font-size:12px;cursor:pointer;text-align:center;}' +
    '.lib-btn:hover{border-color:#4f7cff;color:#3b5bff;}' +
    '.lib-btn.primary{background:linear-gradient(135deg,#4f7cff,#7a5cff);color:#fff;border:none;font-weight:700;}' +
    '.back{font-size:12px;color:#3b5bff;cursor:pointer;margin-bottom:10px;display:inline-block;}' +
    '.back:hover{text-decoration:underline;}' +
    '</style>' +
    '<div class="badge" id="badge" title="六级冲550打卡">' +
      '<div class="num" id="badgeNum">0</div><div class="lbl">天连击</div>' +
    '</div>' +
    '<div class="panel" id="panel">' +
      '<div class="head">' +
        '<div><div class="title">六级冲550打卡</div><div class="date" id="todayDate"></div></div>' +
        '<div class="icons">' +
          '<div class="ic" id="libBtn" title="词库管理">⚙</div>' +
          '<div class="ic" id="closeBtn" title="关闭">✕</div>' +
        '</div>' +
      '</div>' +
      '<div class="body" id="viewMain">' +
        '<div class="word-card">' +
          '<div class="w" id="wWord"></div>' +
          '<div class="p" id="wPhon"></div>' +
          '<div class="m" id="wMean"></div>' +
          '<div class="e"><span id="wEx"></span><i id="wExCn"></i></div>' +
        '</div>' +
        '<div class="tasks-title" id="tasksTitle"></div>' +
        '<div id="taskList"></div>' +
        '<div class="stats">' +
          '<div class="stat"><div class="n" id="streakNum">0</div><div class="t">连续打卡</div></div>' +
          '<div class="stat"><div class="n" id="totalNum">0</div><div class="t">累计打卡</div></div>' +
        '</div>' +
        '<div class="week" id="weekRow"></div>' +
        '<button class="btn" id="checkBtn" type="button">今日打卡</button>' +
        '<div class="msg" id="msg"></div>' +
      '</div>' +
      '<div class="body" id="viewLib" style="display:none;">' +
        '<div class="back" id="backBtn">‹ 返回打卡</div>' +
        '<div class="lib-head"><div class="t">我的词库</div><div class="n" id="libCount"></div></div>' +
        '<div class="word-list" id="wordList"></div>' +
        '<div class="add-row">' +
          '<input id="inW" placeholder="单词/表达 *" maxlength="80">' +
          '<input id="inP" placeholder="音标（可空）">' +
          '<input id="inM" class="full" placeholder="释义/用法 *" maxlength="120">' +
          '<input id="inE" class="full" placeholder="英文例句" maxlength="200">' +
          '<input id="inT" class="full" placeholder="例句翻译" maxlength="200">' +
        '</div>' +
        '<div class="lib-btns">' +
          '<button class="lib-btn primary" id="addBtn" type="button">添加</button>' +
        '</div>' +
        '<div class="lib-btns" style="margin-top:8px;">' +
          '<button class="lib-btn" id="importBtn" type="button">导入 CSV</button>' +
          '<button class="lib-btn" id="exportBtn" type="button">导出 CSV</button>' +
          '<button class="lib-btn" id="resetBtn" type="button">恢复默认</button>' +
        '</div>' +
        '<div class="msg" id="libMsg"></div>' +
        '<input type="file" id="fileInput" accept=".csv,text/csv" style="display:none;">' +
      '</div>' +
    '</div>';

  /* ---------- 7. 渲染函数 ---------- */
  var WEEK_NAMES = ['日', '一', '二', '三', '四', '五', '六'];

  function renderWord() {
    var word = getTodayWord();
    root.getElementById('wWord').textContent = word.w || '-';
    root.getElementById('wPhon').textContent = word.p || '';
    root.getElementById('wMean').textContent = word.m || '';
    root.getElementById('wEx').textContent = word.e || '';
    root.getElementById('wExCn').textContent = word.t || '';
  }

  function render() {
    var records = loadRecords(), set = new Set(records);
    var today = todayStr(), checked = set.has(today);
    var streak = calcStreak(set), now = new Date();
    var phase = getTodayPhase();
    var states = getTodayTasks();
    var doneCount = states.filter(function (s) { return s; }).length;
    var allDone = doneCount === phase.tasks.length;

    /* 标题栏：日期 + 阶段 + 倒计时 */
    root.getElementById('todayDate').textContent =
      today + ' 星期' + WEEK_NAMES[now.getDay()] + ' · ' + phase.name + ' · 距考试 ' + daysToExam() + ' 天';
    root.getElementById('tasksTitle').textContent =
      '今日任务（' + doneCount + '/' + phase.tasks.length + '）';

    /* 任务清单 */
    var list = root.getElementById('taskList');
    list.innerHTML = '';
    phase.tasks.forEach(function (text, idx) {
      var item = document.createElement('div');
      item.className = 'task' + (states[idx] ? ' on' : '');
      var cb = document.createElement('span');
      cb.className = 'cb';
      cb.textContent = states[idx] ? '✓' : '';
      var label = document.createElement('span');
      label.textContent = text;
      item.appendChild(cb);
      item.appendChild(label);
      item.addEventListener('click', function () {
        toggleTask(idx);
        render(); // 重绘以更新进度与按钮状态
      });
      list.appendChild(item);
    });

    /* 统计与 7 天圆点 */
    root.getElementById('badgeNum').textContent = streak;
    root.getElementById('streakNum').textContent = streak;
    root.getElementById('totalNum').textContent = set.size;

    var weekRow = root.getElementById('weekRow');
    weekRow.innerHTML = '';
    for (var i = 6; i >= 0; i--) {
      var d = new Date();
      d.setDate(d.getDate() - i);
      var ds = dateStr(d);
      var cell = document.createElement('div');
      cell.className = 'day' + (set.has(ds) ? ' on' : '') + (ds === today ? ' today' : '');
      cell.innerHTML = '<div>' + WEEK_NAMES[d.getDay()] + '</div><div class="dot">' + (set.has(ds) ? '✓' : '') + '</div>';
      weekRow.appendChild(cell);
    }

    /* 打卡按钮：任务未完成时显示缺口 */
    var btn = root.getElementById('checkBtn');
    if (checked) {
      btn.textContent = '今日已打卡 ✓';
      btn.classList.add('done');
    } else if (allDone) {
      btn.textContent = '今日打卡';
      btn.classList.remove('done');
    } else {
      btn.textContent = '还差 ' + (phase.tasks.length - doneCount) + ' 项任务';
      btn.classList.remove('done');
    }
    root.getElementById('badge').classList.toggle('pulse', !checked);
  }

  function renderLib() {
    var bank = getWordBank();
    root.getElementById('libCount').textContent = '共 ' + bank.length + ' 个';
    var list = root.getElementById('wordList');
    list.innerHTML = '';
    bank.forEach(function (w, idx) {
      var item = document.createElement('div');
      item.className = 'wi';
      var lw = document.createElement('span'); lw.className = 'ww'; lw.textContent = w.w;
      var lm = document.createElement('span'); lm.className = 'wm'; lm.textContent = w.m || '';
      var del = document.createElement('span'); del.className = 'del'; del.textContent = '✕'; del.title = '删除';
      del.addEventListener('click', function () {
        var cur = getWordBank();
        cur.splice(idx, 1);
        saveWordBank(cur);
        renderLib(); renderWord();
      });
      item.appendChild(lw); item.appendChild(lm); item.appendChild(del);
      list.appendChild(item);
    });
  }

  /* ---------- 8. 视图切换与事件绑定 ---------- */
  var viewMain = root.getElementById('viewMain');
  var viewLib = root.getElementById('viewLib');
  var panel = root.getElementById('panel');

  root.getElementById('badge').addEventListener('click', function () { panel.classList.toggle('show'); });
  root.getElementById('closeBtn').addEventListener('click', function () { panel.classList.remove('show'); });
  root.getElementById('libBtn').addEventListener('click', function () { viewMain.style.display = 'none'; viewLib.style.display = ''; renderLib(); });
  root.getElementById('backBtn').addEventListener('click', function () { viewMain.style.display = ''; viewLib.style.display = 'none'; });

  /* 打卡：任务未全部完成则拒绝并提示 */
  root.getElementById('checkBtn').addEventListener('click', function () {
    var records = loadRecords(), t = todayStr();
    if (records.indexOf(t) !== -1) return;
    var phase = getTodayPhase();
    var doneCount = getTodayTasks().filter(function (s) { return s; }).length;
    var msg = root.getElementById('msg');
    if (doneCount < phase.tasks.length) {
      msg.textContent = '先完成剩余任务再打卡，每一项都算数！';
      return;
    }
    records.push(t);
    saveRecords(records);
    render();
    msg.textContent = encourage(calcStreak(new Set(records)));
  });

  /* 词库管理事件 */
  root.getElementById('addBtn').addEventListener('click', function () {
    var w = root.getElementById('inW').value.trim();
    var m = root.getElementById('inM').value.trim();
    var libMsg = root.getElementById('libMsg');
    if (!w || !m) { libMsg.textContent = '请至少填写单词/表达和释义。'; return; }
    var bank = getWordBank();
    var dup = bank.some(function (x) { return String(x.w).toLowerCase() === w.toLowerCase(); });
    if (dup) { libMsg.textContent = '「' + w + '」已在词库中。'; return; }
    bank.push({ w: w, m: m, p: root.getElementById('inP').value.trim(), e: root.getElementById('inE').value.trim(), t: root.getElementById('inT').value.trim() });
    saveWordBank(bank);
    ['inW', 'inP', 'inM', 'inE', 'inT'].forEach(function (id) { root.getElementById(id).value = ''; });
    libMsg.textContent = '已添加「' + w + '」，当前词库共 ' + bank.length + ' 个。';
    renderLib(); renderWord();
  });

  var fileInput = root.getElementById('fileInput');
  root.getElementById('importBtn').addEventListener('click', function () { fileInput.click(); });
  fileInput.addEventListener('change', function () {
    var file = fileInput.files && fileInput.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var res = importCSV(String(reader.result || ''));
        root.getElementById('libMsg').textContent =
          '导入完成：新增 ' + res.added + ' 个' + (res.skipped ? '，跳过重复 ' + res.skipped + ' 个' : '') + '。';
        renderLib(); renderWord();
      } catch (e) {
        root.getElementById('libMsg').textContent = 'CSV 解析失败，请检查文件格式。';
      }
      fileInput.value = '';
    };
    reader.onerror = function () { root.getElementById('libMsg').textContent = '文件读取失败，请重试。'; };
    reader.readAsText(file, 'UTF-8');
  });

  root.getElementById('exportBtn').addEventListener('click', function () {
    exportCSV();
    root.getElementById('libMsg').textContent = '已导出当前词库（cet6_words.csv）。';
  });
  root.getElementById('resetBtn').addEventListener('click', function () {
    try { window.localStorage.removeItem(WORDS_KEY); } catch (e) {}
    root.getElementById('libMsg').textContent = '已恢复为内置默认词库。';
    renderLib(); renderWord();
  });

  /* ---------- 9. 初始化：未打卡自动展开提醒 ---------- */
  renderWord();
  render();
  if (loadRecords().indexOf(todayStr()) === -1) panel.classList.add('show');
})();