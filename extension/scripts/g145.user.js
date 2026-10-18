/* ============================================================
 * 妙招名称：六级单词网页高亮（修复版）
 * 修复说明：所有换行/回车/BOM 字符均改用 String.fromCharCode 生成，
 *           避免复制粘贴时特殊字符损坏导致脚本无法解析。
 * 功能：高亮六级词汇（含词形变化）→ 点击查看释义例句；
 *       ⚙ 按钮管理词库（增删 / 导入 CSV / 导出 / 恢复默认），
 *       修改后自动重新标记；再次运行脚本 = 清除全部。
 * 词库与打卡脚本共用 localStorage 键 cet6_custom_words_v1。
 * ============================================================ */
(function () {
  'use strict';

  /* ---------- 1. 开关逻辑：已激活则清除并退出 ---------- */
  if (typeof window.__cet6_hl_cleanup__ === 'function') {
    window.__cet6_hl_cleanup__();
    window.__cet6_hl_cleanup__ = null;
    return;
  }
  if (!document.body) return;

  /* ---------- 2. 特殊字符常量（避免代码中出现不可见字符） ---------- */
  var NL  = String.fromCharCode(10);     // 换行符
  var CR  = String.fromCharCode(13);     // 回车符
  var BOM = String.fromCharCode(65279);  // UTF-8 BOM

  /* ---------- 3. 内置默认词库（自定义词库为空时兜底） ---------- */
  var DEFAULT_WORDS = [
    { w: 'accumulate',  p: '/əˈkjuːmjəleɪt/', m: 'v. 积累；堆积',        e: 'Reading accumulates knowledge bit by bit.',     t: '阅读一点一滴地积累知识。' },
    { w: 'alleviate',   p: '/əˈliːvieɪt/',    m: 'v. 减轻；缓和',        e: 'The new policy alleviated traffic congestion.', t: '新政策缓解了交通拥堵。' },
    { w: 'ambitious',   p: '/æmˈbɪʃəs/',      m: 'adj. 有雄心的；宏大的', e: 'She set an ambitious goal for this semester.',  t: '她为这学期定下了宏大的目标。' },
    { w: 'consensus',   p: '/kənˈsensəs/',    m: 'n. 共识；一致意见',     e: 'The two sides finally reached a consensus.',    t: '双方最终达成了共识。' },
    { w: 'controversy', p: '/ˈkɒntrəvɜːsi/',  m: 'n. 争议；争论',        e: 'The plan has sparked heated controversy.',      t: '该计划引发了激烈的争议。' },
    { w: 'crucial',     p: '/ˈkruːʃl/',       m: 'adj. 至关重要的',      e: 'Sleep is crucial to memory consolidation.',     t: '睡眠对巩固记忆至关重要。' },
    { w: 'deteriorate', p: '/dɪˈtɪəriəreɪt/', m: 'v. 恶化；变坏',        e: 'His eyesight began to deteriorate.',            t: '他的视力开始下降。' },
    { w: 'dilemma',     p: '/dɪˈlemə/',       m: 'n. 两难境地',          e: 'Graduates often face the dilemma of choice.',   t: '毕业生常面临选择的两难。' },
    { w: 'eliminate',   p: '/ɪˈlɪmɪneɪt/',    m: 'v. 消除；淘汰',        e: 'Exercise helps eliminate stress.',              t: '运动有助于消除压力。' },
    { w: 'feasible',    p: '/ˈfiːzəbl/',      m: 'adj. 可行的',          e: 'The proposal sounds feasible in practice.',     t: '这个提议在实践中听起来可行。' },
    { w: 'inevitable',  p: '/ɪnˈevɪtəbl/',    m: 'adj. 不可避免的',      e: 'Change is inevitable in the digital age.',      t: '在数字时代，变化不可避免。' },
    { w: 'integrity',   p: '/ɪnˈteɡrəti/',    m: 'n. 正直；完整',        e: 'Academic integrity matters at college.',        t: '学术诚信在大学里很重要。' },
    { w: 'jeopardize',  p: '/ˈdʒepədaɪz/',    m: 'v. 危及；损害',        e: 'Staying up late may jeopardize your health.',   t: '熬夜可能损害你的健康。' },
    { w: 'legitimate',  p: '/lɪˈdʒɪtɪmət/',   m: 'adj. 合法的；合理的',   e: 'Online learning is a legitimate option.',      t: '在线学习是一种合理的选择。' },
    { w: 'obstacle',    p: '/ˈɒbstəkl/',      m: 'n. 障碍',              e: 'Lack of practice is a major obstacle.',         t: '缺乏练习是一大障碍。' },
    { w: 'profound',    p: '/prəˈfaʊnd/',     m: 'adj. 深刻的；深远的',   e: 'The book had a profound influence on me.',     t: '这本书对我影响深远。' },
    { w: 'reluctant',   p: '/rɪˈlʌktənt/',    m: 'adj. 不情愿的',        e: 'He was reluctant to speak in public.',          t: '他不愿在公众场合发言。' },
    { w: 'skeptical',   p: '/ˈskeptɪkl/',     m: 'adj. 怀疑的',          e: 'Consumers are skeptical of advertisements.',    t: '消费者对广告持怀疑态度。' },
    { w: 'substantial', p: '/səbˈstænʃl/',    m: 'adj. 大量的；实质性的', e: 'She made substantial progress this month.',    t: '这个月她取得了实质性的进步。' },
    { w: 'tackle',      p: '/ˈtækl/',         m: 'v. 处理；应对',        e: 'We must tackle the problem step by step.',      t: '我们必须一步步解决这个问题。' },
    { w: 'versatile',   p: '/ˈvɜːsətaɪl/',    m: 'adj. 多用途的',        e: 'English is a versatile tool at work.',          t: '英语是工作中的多用途工具。' },
    { w: 'abandon',     p: '/əˈbændən/',      m: 'v. 放弃；抛弃',        e: 'He never abandons his dream.',                  t: '他从不放弃自己的梦想。' },
    { w: 'absorb',      p: '/əbˈzɔːb/',       m: 'v. 吸收；使专注',      e: 'Plants absorb carbon dioxide.',                 t: '植物吸收二氧化碳。' },
    { w: 'access',      p: '/ˈækses/',        m: 'n. 使用权；通道',      e: 'Students have free access to the library.',     t: '学生可以免费使用图书馆。' },
    { w: 'achieve',     p: '/əˈtʃiːv/',       m: 'v. 实现；取得',        e: 'She achieved her goal through hard work.',      t: '她通过努力实现了目标。' },
    { w: 'adapt',       p: '/əˈdæpt/',        m: 'v. 适应；改编',        e: 'He quickly adapted to college life.',           t: '他很快适应了大学生活。' },
    { w: 'approach',    p: '/əˈprəʊtʃ/',      m: 'n. 方法；v. 接近',     e: 'We need a new approach to learning.',           t: '我们需要一种新的学习方法。' },
    { w: 'assume',      p: '/əˈsjuːm/',       m: 'v. 假定；承担',        e: 'Do not assume that he knows the truth.',        t: '别想当然地以为他知道真相。' },
    { w: 'benefit',     p: '/ˈbenɪfɪt/',      m: 'n. 益处；v. 受益',     e: 'Everyone benefits from a good education.',      t: '人人都受益于良好的教育。' },
    { w: 'concern',     p: '/kənˈsɜːn/',      m: 'n. 担忧；v. 涉及',     e: 'Pollution is a major public concern.',          t: '污染是公众关注的重大问题。' },
    { w: 'conduct',     p: '/kənˈdʌkt/',      m: 'v. 实施；进行',        e: 'They conducted a survey on campus.',            t: '他们在校园里进行了一项调查。' },
    { w: 'consume',     p: '/kənˈsjuːm/',     m: 'v. 消耗；消费',        e: 'Old cars consume more fuel.',                   t: '旧车消耗更多燃油。' },
    { w: 'contribute',  p: '/kənˈtrɪbjuːt/',  m: 'v. 贡献；促成',        e: 'Exercise contributes to good health.',          t: '运动有助于身体健康。' },
    { w: 'decline',     p: '/dɪˈklaɪn/',      m: 'v./n. 下降；衰退',     e: 'The birth rate is on the decline.',             t: '出生率正在下降。' },
    { w: 'demand',      p: '/dɪˈmɑːnd/',      m: 'n./v. 需求；要求',     e: 'The demand for nurses is rising.',              t: '对护士的需求正在上升。' },
    { w: 'despite',     p: '/dɪˈspaɪt/',      m: 'prep. 尽管',           e: 'Despite the rain, the match continued.',        t: '尽管下雨，比赛仍继续进行。' },
    { w: 'efficient',   p: '/ɪˈfɪʃnt/',       m: 'adj. 高效的',          e: 'We need a more efficient way to work.',         t: '我们需要更高效的工作方式。' },
    { w: 'emphasis',    p: '/ˈemfəsɪs/',      m: 'n. 强调；重视',        e: 'The school places emphasis on practice.',       t: '这所学校重视实践。' },
    { w: 'enhance',     p: '/ɪnˈhɑːns/',      m: 'v. 增强；提升',        e: 'Reading enhances your vocabulary.',             t: '阅读能扩大你的词汇量。' },
    { w: 'establish',   p: '/ɪˈstæblɪʃ/',     m: 'v. 建立；确立',        e: 'They established a new rule.',                  t: '他们制定了一条新规则。' },
    { w: 'evidence',    p: '/ˈevɪdəns/',      m: 'n. 证据；迹象',        e: 'There is no evidence to support it.',           t: '没有证据支持这一点。' },
    { w: 'factor',      p: '/ˈfæktə/',        m: 'n. 因素；要素',        e: 'Cost is a key factor.',                         t: '成本是一个关键因素。' },
    { w: 'impact',      p: '/ˈɪmpækt/',       m: 'n. 影响；冲击',        e: 'The Internet has a huge impact on daily life.', t: '互联网对日常生活影响巨大。' },
    { w: 'individual',  p: '/ˌɪndɪˈvɪdʒuəl/', m: 'adj. 个人的；n. 个体', e: 'Every individual learns differently.',          t: '每个人的学习方式都不同。' },
    { w: 'innovation',  p: '/ˌɪnəˈveɪʃn/',    m: 'n. 创新',              e: 'Innovation drives progress.',                   t: '创新推动进步。' },
    { w: 'involve',     p: '/ɪnˈvɒlv/',       m: 'v. 涉及；包含',        e: 'The job involves a lot of travel.',             t: '这份工作需要经常出差。' },
    { w: 'maintain',    p: '/meɪnˈteɪn/',     m: 'v. 维持；保养',        e: 'It is hard to maintain a good habit.',          t: '保持一个好习惯并不容易。' },
    { w: 'obtain',      p: '/əbˈteɪn/',       m: 'v. 获得；得到',        e: 'He obtained useful information online.',        t: '他在网上获得了有用的信息。' },
    { w: 'potential',   p: '/pəˈtenʃl/',      m: 'adj. 潜在的；n. 潜力', e: 'Everyone has great potential.',                 t: '每个人都有巨大的潜力。' },
    { w: 'pressure',    p: '/ˈpreʃə/',        m: 'n. 压力',              e: 'She works well under pressure.',                t: '她在压力下工作表现出色。' },
    { w: 'promote',     p: '/prəˈməʊt/',      m: 'v. 促进；推广',        e: 'The policy promotes green energy.',             t: '这项政策促进绿色能源发展。' },
    { w: 'reduce',      p: '/rɪˈdjuːs/',      m: 'v. 减少；降低',        e: 'We should reduce plastic waste.',               t: '我们应该减少塑料垃圾。' },
    { w: 'require',     p: '/rɪˈkwaɪə/',      m: 'v. 需要；要求',        e: 'Success requires patience and effort.',         t: '成功需要耐心和努力。' },
    { w: 'resource',    p: '/rɪˈsɔːs/',       m: 'n. 资源',              e: 'Water is a precious resource.',                 t: '水是宝贵的资源。' },
    { w: 'significant', p: '/sɪɡˈnɪfɪkənt/',  m: 'adj. 显著的；重要的',  e: 'She made significant progress.',                t: '她取得了显著的进步。' },
    { w: 'solve',       p: '/sɒlv/',          m: 'v. 解决',              e: 'We must solve the problem together.',           t: '我们必须共同解决这个问题。' },
    { w: 'strategy',    p: '/ˈstrætədʒi/',    m: 'n. 策略；战略',        e: 'Good strategies save time.',                    t: '好的策略能节省时间。' },
    { w: 'survey',      p: '/ˈsɜːveɪ/',       m: 'n. 调查；民意测验',    e: 'A recent survey shows the trend.',              t: '最近的一项调查显示了这一趋势。' },
    { w: 'tend',        p: '/tend/',          m: 'v. 倾向于；往往会',    e: 'People tend to stay up late.',                  t: '人们往往会熬夜。' },
    { w: 'various',     p: '/ˈveəriəs/',      m: 'adj. 各种各样的',      e: 'There are various reasons for it.',             t: '这其中有各种各样的原因。' }
  ];

  /* ---------- 4. 词库存储（与打卡脚本共用同一键） ---------- */
  var WORDS_KEY = 'cet6_custom_words_v1';

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

  /* ---------- 5. 词形变化与匹配器 ---------- */
  function escapeRegExp(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  function variantsOf(w) {
    var vs = [w];
    if (!/^[A-Za-z][A-Za-z-]*$/.test(w)) return vs; // 短语不做变形
    var lw = w.toLowerCase();
    vs.push(w + 's');
    if (/(s|x|z|ch|sh)$/.test(lw)) vs.push(w + 'es');
    if (/[^aeiou]y$/.test(lw)) { var stemY = w.slice(0, -1); vs.push(stemY + 'ies', stemY + 'ied'); }
    if (/e$/.test(lw)) { var stemE = w.slice(0, -1); vs.push(stemE + 'ing', w + 'd'); }
    vs.push(w + 'ed', w + 'ing');
    if (lw.length <= 7 && /[^aeiou][aeiou][^aeiouwxy]$/.test(lw)) {
      var dbl = w + w.slice(-1);
      vs.push(dbl + 'ing', dbl + 'ed');
    }
    return vs;
  }

  var MAP = {}, REGEX = null;
  function buildMatcher() {
    MAP = {};
    var seen = {}, parts = [];
    getWordBank().forEach(function (entry) {
      if (!entry || !entry.w) return;
      variantsOf(entry.w).forEach(function (v) {
        var key = v.toLowerCase();
        if (!MAP[key]) MAP[key] = entry;
        if (!seen[key]) { seen[key] = true; parts.push(escapeRegExp(v)); }
      });
    });
    parts.sort(function (a, b) { return b.length - a.length; });
    REGEX = parts.length ? new RegExp('\\b(' + parts.join('|') + ')\\b', 'gi') : null;
  }

  /* ---------- 6. CSV 解析 / 导入 / 导出（特殊字符均用常量表示） ---------- */
  function parseCSV(text) {
    var rows = [], row = [], field = '', inQ = false;
    text = String(text || '');
    if (text.charCodeAt(0) === 65279) text = text.slice(1); // 去掉 BOM
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
        else if (c === NL) { row.push(field); field = ''; rows.push(row); row = []; }
        else if (c === CR) {
          if (text.charAt(i + 1) === NL) { i++; }  // 兼容 Windows 换行
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
    if (rows.length && /^word$/i.test((rows[0][0] || '').trim())) rows.shift(); // 跳过表头
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
    var needQuote = s.indexOf('"') !== -1 || s.indexOf(',') !== -1 ||
                    s.indexOf(NL) !== -1 || s.indexOf(CR) !== -1;
    if (needQuote) { return '"' + s.split('"').join('""') + '"'; }
    return s;
  }
  function exportCSV() {
    var lines = ['word,phonetic,meaning,example,translation'];
    getWordBank().forEach(function (w) {
      lines.push([w.w, w.p, w.m, w.e, w.t].map(csvEscape).join(','));
    });
    var blob = new Blob([BOM + lines.join(CR + NL)], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'cet6_words.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  /* ---------- 7. 高亮样式 ---------- */
  var style = document.createElement('style');
  style.id = '__cet6_hl_style__';
  style.textContent =
    '.cet6-hl-word{background:#fff1b8 !important;color:#7a4a00 !important;' +
    'border-bottom:2px solid #f0b429 !important;border-radius:2px !important;' +
    'padding:0 1px !important;cursor:pointer !important;transition:background .15s;}' +
    '.cet6-hl-word:hover{background:#ffe08a !important;}';
  (document.head || document.documentElement).appendChild(style);

  /* ---------- 8. 扫描正文并高亮 ---------- */
  var SKIP = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1, INPUT: 1, SELECT: 1, OPTION: 1, IFRAME: 1, CODE: 1, PRE: 1, KBD: 1, SAMP: 1, BUTTON: 1 };
  var MAX_NODES = 4000;
  var MAX_HL = 2000;
  var hlCount = 0;

  function shouldSkip(node) {
    var el = node.parentNode;
    while (el && el !== document.body) {
      if (SKIP[el.tagName]) return true;
      if (el.isContentEditable) return true;
      if (el.classList && el.classList.contains('cet6-hl-word')) return true;
      el = el.parentNode;
    }
    return false;
  }

  function scanPage() {
    hlCount = 0;
    if (!REGEX) return;
    var textNodes = [];
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        return shouldSkip(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    });
    while (walker.nextNode() && textNodes.length < MAX_NODES) {
      textNodes.push(walker.currentNode);
    }

    outer:
    for (var i = 0; i < textNodes.length; i++) {
      var textNode = textNodes[i];
      var text = textNode.nodeValue;
      REGEX.lastIndex = 0;
      if (!REGEX.test(text)) continue;
      REGEX.lastIndex = 0;

      var frag = document.createDocumentFragment();
      var last = 0, match;
      while ((match = REGEX.exec(text)) !== null) {
        if (match.index > last) frag.appendChild(document.createTextNode(text.slice(last, match.index)));
        var span = document.createElement('span');
        span.className = 'cet6-hl-word';
        span.textContent = match[0];
        span.setAttribute('data-cet6-key', match[0].toLowerCase());
        frag.appendChild(span);
        last = match.index + match[0].length;
        hlCount++;
        if (hlCount >= MAX_HL) break;
      }
      if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
      if (textNode.parentNode) textNode.parentNode.replaceChild(frag, textNode);
      if (hlCount >= MAX_HL) break outer;
    }
  }

  function unwrapHighlights() {
    Array.prototype.slice.call(document.querySelectorAll('.cet6-hl-word')).forEach(function (span) {
      var parent = span.parentNode;
      if (!parent) return;
      parent.replaceChild(document.createTextNode(span.textContent), span);
      parent.normalize();
    });
    hlCount = 0;
  }

  /* ---------- 9. 注入 UI：气泡 + 提示条 + 词库管理 ---------- */
  var host = document.createElement('div');
  host.id = '__cet6_tooltip_host__';
  document.documentElement.appendChild(host);
  var root = host.attachShadow({ mode: 'open' });

  root.innerHTML =
    '<style>' +
    ':host{all:initial;}' +
    '*{box-sizing:border-box;margin:0;padding:0;font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;}' +
    '.tip{position:fixed;z-index:2147483647;width:280px;background:#fff;color:#1f2329;border-radius:12px;' +
      'box-shadow:0 8px 32px rgba(0,0,0,.22);padding:12px 14px;display:none;}' +
    '.tip.show{display:block;}' +
    '.tw{font-size:17px;font-weight:700;color:#b25e00;}' +
    '.tp{font-size:11px;color:#8a8f99;margin:3px 0 6px;}' +
    '.tm{font-size:13px;line-height:1.5;margin-bottom:6px;}' +
    '.te{font-size:12px;color:#555;line-height:1.6;border-top:1px dashed #eee;padding-top:6px;}' +
    '.te i{color:#8a8f99;font-style:normal;display:block;margin-top:2px;}' +
    '.orig{font-size:11px;color:#8a8f99;margin-top:6px;}' +
    '.toast{position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:2147483647;' +
      'background:rgba(30,34,40,.92);color:#fff;font-size:12px;padding:8px 16px;border-radius:20px;' +
      'box-shadow:0 4px 16px rgba(0,0,0,.25);display:none;white-space:nowrap;}' +
    '.toast.show{display:block;}' +
    '.gear{position:fixed;right:20px;top:150px;z-index:2147483647;width:42px;height:42px;border-radius:50%;' +
      'background:#fff;color:#d98200;border:1px solid #f3dcae;display:flex;align-items:center;justify-content:center;' +
      'cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.15);font-size:16px;user-select:none;transition:transform .15s;}' +
    '.gear:hover{transform:scale(1.1);}' +
    '.mgr{position:fixed;right:20px;top:202px;z-index:2147483647;width:300px;background:#fff;color:#1f2329;' +
      'border-radius:14px;box-shadow:0 10px 40px rgba(0,0,0,.22);display:none;overflow:hidden;}' +
    '.mgr.show{display:block;}' +
    '.mhead{background:linear-gradient(135deg,#f5a623,#f07b1a);color:#fff;padding:11px 14px;display:flex;justify-content:space-between;align-items:center;}' +
    '.mhead .t{font-size:13px;font-weight:700;}' +
    '.mhead .n{font-size:11px;opacity:.9;margin-top:2px;}' +
    '.mhead .x{cursor:pointer;font-size:13px;opacity:.85;padding:2px 5px;line-height:1;}' +
    '.mhead .x:hover{opacity:1;}' +
    '.mbody{padding:12px 14px;max-height:56vh;overflow-y:auto;}' +
    '.word-list{max-height:140px;overflow-y:auto;border:1px solid #f2e8d5;border-radius:10px;margin-bottom:10px;}' +
    '.wi{display:flex;align-items:center;justify-content:space-between;padding:7px 10px;border-bottom:1px solid #faf3e7;font-size:12px;}' +
    '.wi:last-child{border-bottom:none;}' +
    '.wi .ww{font-weight:700;color:#b25e00;margin-right:8px;}' +
    '.wi .wm{color:#555;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
    '.wi .del{cursor:pointer;color:#c0c4cc;font-size:12px;padding:2px 4px;}' +
    '.wi .del:hover{color:#f56c6c;}' +
    '.add-row{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px;}' +
    '.add-row input{border:1px solid #e4e7ed;border-radius:8px;padding:7px 9px;font-size:12px;width:100%;outline:none;}' +
    '.add-row input:focus{border-color:#f5a623;}' +
    '.add-row .full{grid-column:1 / -1;}' +
    '.lib-btns{display:flex;gap:6px;}' +
    '.lib-btn{flex:1;border:1px solid #dcdfe6;background:#fff;color:#555;border-radius:8px;padding:8px 0;' +
      'font-size:12px;cursor:pointer;text-align:center;}' +
    '.lib-btn:hover{border-color:#f5a623;color:#d98200;}' +
    '.lib-btn.primary{background:linear-gradient(135deg,#f5a623,#f07b1a);color:#fff;border:none;font-weight:700;}' +
    '.msg{margin-top:10px;font-size:12px;color:#d98200;text-align:center;min-height:16px;line-height:1.5;}' +
    '</style>' +
    '<div class="tip" id="tip">' +
      '<div class="tw" id="tWord"></div>' +
      '<div class="tp" id="tPhon"></div>' +
      '<div class="tm" id="tMean"></div>' +
      '<div class="te"><span id="tEx"></span><i id="tExCn"></i></div>' +
      '<div class="orig" id="tOrig"></div>' +
    '</div>' +
    '<div class="toast" id="toast"></div>' +
    '<div class="gear" id="gear" title="高亮词库管理">⚙</div>' +
    '<div class="mgr" id="mgr">' +
      '<div class="mhead">' +
        '<div><div class="t">高亮词库管理</div><div class="n" id="libCount"></div></div>' +
        '<div class="x" id="mgrClose">✕</div>' +
      '</div>' +
      '<div class="mbody">' +
        '<div class="word-list" id="wordList"></div>' +
        '<div class="add-row">' +
          '<input id="inW" placeholder="单词/表达 *" maxlength="80">' +
          '<input id="inP" placeholder="音标（可空）">' +
          '<input id="inM" class="full" placeholder="释义 *" maxlength="120">' +
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

  var tip = root.getElementById('tip');
  var toast = root.getElementById('toast');
  var mgr = root.getElementById('mgr');

  function showTip(span, entry, matchedForm) {
    root.getElementById('tWord').textContent = entry.w || matchedForm;
    root.getElementById('tPhon').textContent = entry.p || '';
    root.getElementById('tMean').textContent = entry.m || '暂无释义';
    root.getElementById('tEx').textContent = entry.e || '';
    root.getElementById('tExCn').textContent = entry.t || '';
    root.getElementById('tOrig').textContent =
      (matchedForm.toLowerCase() !== String(entry.w).toLowerCase())
        ? '页面词形：' + matchedForm + '（原形：' + entry.w + '）' : '';

    tip.classList.add('show');
    tip.style.visibility = 'hidden';
    var rect = span.getBoundingClientRect();
    var tw = tip.offsetWidth, th = tip.offsetHeight;
    var left = rect.left + rect.width / 2 - tw / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - tw - 8));
    var top = rect.bottom + 8;
    if (top + th > window.innerHeight - 8) top = rect.top - th - 8;
    if (top < 8) top = 8;
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
    tip.style.visibility = 'visible';
  }
  function hideTip() { tip.classList.remove('show'); }

  function showToast(text) {
    toast.textContent = text;
    toast.classList.add('show');
    setTimeout(function () { toast.classList.remove('show'); }, 2800);
  }

  /* ---------- 10. 词库管理：渲染、增删、导入导出 ---------- */
  function renderLib() {
    var bank = getWordBank();
    root.getElementById('libCount').textContent = '共 ' + bank.length + ' 个，本页已标记 ' + hlCount + ' 处';
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
        refreshAfterLibChange('已删除「' + w.w + '」');
      });
      item.appendChild(lw); item.appendChild(lm); item.appendChild(del);
      list.appendChild(item);
    });
  }

  function refreshAfterLibChange(msg) {
    hideTip();
    unwrapHighlights();
    buildMatcher();
    scanPage();
    renderLib();
    showToast(msg + '，本页重新标记 ' + hlCount + ' 处');
  }

  root.getElementById('gear').addEventListener('click', function () {
    mgr.classList.toggle('show');
    if (mgr.classList.contains('show')) renderLib();
  });
  root.getElementById('mgrClose').addEventListener('click', function () {
    mgr.classList.remove('show');
  });

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
    libMsg.textContent = '已添加「' + w + '」。';
    refreshAfterLibChange('已添加「' + w + '」');
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
        var msg = '导入完成：新增 ' + res.added + ' 个' + (res.skipped ? '，跳过重复 ' + res.skipped + ' 个' : '');
        root.getElementById('libMsg').textContent = msg + '。';
        refreshAfterLibChange(msg);
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
    refreshAfterLibChange('已恢复默认词库');
  });

  /* ---------- 11. 全局事件 ---------- */
  function onDocClick(e) {
    if (e.target === host) return;
    var span = (e.target && e.target.closest) ? e.target.closest('.cet6-hl-word') : null;
    if (span) {
      var entry = MAP[span.getAttribute('data-cet6-key')];
      if (entry) {
        showTip(span, entry, span.textContent);
        e.stopPropagation();
        return;
      }
    }
    hideTip();
  }
  function onKeyDown(e) {
    if (e.key === 'Escape') { hideTip(); mgr.classList.remove('show'); }
  }
  function onScroll() { hideTip(); }

  document.addEventListener('click', onDocClick, true);
  document.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('scroll', onScroll, true);
  window.addEventListener('resize', onScroll);

  /* ---------- 12. 清除函数：再次运行时完整还原页面 ---------- */
  window.__cet6_hl_cleanup__ = function () {
    document.removeEventListener('click', onDocClick, true);
    document.removeEventListener('keydown', onKeyDown, true);
    window.removeEventListener('scroll', onScroll, true);
    window.removeEventListener('resize', onScroll);
    unwrapHighlights();
    if (style.parentNode) style.parentNode.removeChild(style);
    if (host.parentNode) host.parentNode.removeChild(host);
  };

  /* ---------- 13. 初始化 ---------- */
  buildMatcher();
  scanPage();
  if (hlCount > 0) {
    showToast('已标记 ' + hlCount + ' 处六级词汇（词库 ' + getWordBank().length + ' 词），点 ⚙ 可管理词库；再次运行脚本清除');
  } else {
    showToast('本页未找到词库中的词汇，可点 ⚙ 导入 CSV 扩充；再次运行脚本关闭');
  }
})();