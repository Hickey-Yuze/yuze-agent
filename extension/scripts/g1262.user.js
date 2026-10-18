(function () {
  if (window.__NEWTAB_INSTALLED__) return;
  window.__NEWTAB_INSTALLED__ = true;

  var SK = {
    shortcuts: 'nt_s', bgType: 'nt_bt', bgColor: 'nt_bc',
    bgImage: 'nt_bi', engine: 'nt_se', mode: 'nt_sm', recent: 'nt_rt'
  };

  var ENGINES = {
    bing: { n: 'Bing', u: 'https://www.bing.com/search?q=', i: '🔍' },
    google: { n: 'Google', u: 'https://www.google.com/search?q=', i: '🌐' },
    baidu: { n: '百度', u: 'https://www.baidu.com/s?wd=', i: '📘' },
    duckduckgo: { n: 'DuckDuckGo', u: 'https://duckduckgo.com/?q=', i: '🦆' }
  };

  var DEF_SHORTCUTS = [
    { t: 'YouTube', u: 'https://youtube.com', i: '▶️' },
    { t: 'GitHub', u: 'https://github.com', i: '🐙' },
    { t: 'Twitter', u: 'https://twitter.com', i: '🐦' },
    { t: 'Reddit', u: 'https://reddit.com', i: '🤖' },
    { t: 'Wikipedia', u: 'https://wikipedia.org', i: '📖' },
    { t: 'Stack Overflow', u: 'https://stackoverflow.com', i: '📚' },
    { t: 'Gmail', u: 'https://mail.google.com', i: '📧' },
    { t: 'Netflix', u: 'https://netflix.com', i: '🎬' },
    { t: 'Amazon', u: 'https://amazon.com', i: '📦' },
    { t: 'Bilibili', u: 'https://bilibili.com', i: '📺' },
    { t: '知乎', u: 'https://zhihu.com', i: '💡' },
    { t: '微博', u: 'https://weibo.com', i: '🔴' }
  ];

  var GALLERY = [
    { n: '山脉晨曦', u: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80' },
    { n: '海洋日落', u: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&q=80' },
    { n: '森林幽径', u: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&q=80' },
    { n: '星空银河', u: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1920&q=80' },
    { n: '樱花烂漫', u: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=1920&q=80' },
    { n: '雪山湖泊', u: 'https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=1920&q=80' }
  ];

  var COLORS = ['#1a1a2e','#0f3460','#16213e','#1b262c','#2d132c','#462255','#f0f2f5','#e8d5b7','#fdf6e3','#d4edda','#cce5ff','#f8d7da'];

  function ld(k, f) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : f; } catch(e) { return f; } }
  function sv(k, d) { try { localStorage.setItem(k, JSON.stringify(d)); } catch(e) {} }

  function isDark() {
    var s = ld(SK.bgType, null);
    if (s === 'dark') return true;
    if (s === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function favicon(url) {
    try { return 'https://www.google.com/s2/favicons?domain=' + new URL(url).hostname + '&sz=64'; }
    catch(e) { return ''; }
  }

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  function buildPage() {
    var dark = isDark();
    var eng = ld(SK.engine, 'bing');
    var bgImg = ld(SK.bgImage, '');
    var bgColor = ld(SK.bgColor, dark ? '#1a1a2e' : '#f0f2f5');
    var mode = ld(SK.mode, 'auto');
    var shortcuts = ld(SK.shortcuts, DEF_SHORTCUTS);

    var D = dark ? 1 : 0;
    var txtC = dark ? '#e8eaed' : '#202124';
    var txt2 = dark ? '#9aa0a6' : '#5f6368';
    var cardBg = dark ? 'rgba(32,33,36,0.85)' : 'rgba(255,255,255,0.85)';
    var cardBd = dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)';
    var sBg = dark ? 'rgba(32,33,36,0.95)' : 'rgba(255,255,255,0.95)';
    var sBd = dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)';
    var sBdF = dark ? 'rgba(138,180,248,0.5)' : 'rgba(26,115,232,0.5)';
    var sSh = dark ? '0.08' : '0.04';
    var iconBg = dark ? 'rgba(255,255,255,0.1)' : 'rgba(241,243,244,1)';
    var hovBg = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
    var optHov = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
    var optAct = dark ? 'rgba(138,180,248,0.2)' : 'rgba(26,115,232,0.1)';
    var optActC = dark ? '#8ab4f8' : '#1a73e8';
    var setBtnBg = dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)';
    var setBtnC = dark ? '#e8eaed' : '#5f6368';
    var panelBg = dark ? '#2d2e30' : '#ffffff';
    var panelBd = dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)';
    var labelC = dark ? '#9aa0a6' : '#5f6368';
    var tBg = dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)';
    var tActBg = dark ? '#8ab4f8' : '#1a73e8';
    var dashC = dark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)';
    var modalBg = dark ? '#2d2e30' : '#ffffff';
    var inputBd = dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)';
    var inputBg = dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
    var confBg = dark ? '#8ab4f8' : '#1a73e8';
    var canBg = dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)';
    var overlayBg = dark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)';

    document.head.innerHTML = '<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>新标签页</title>';
    document.body.innerHTML = '';

    var bgStyle = bgImg
      ? 'background-image:url(' + bgImg + ');background-size:cover;background-position:center;'
      : 'background-color:' + bgColor + ';';

    var css = ''
      + '*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}'
      + 'html,body{width:100%;height:100%;overflow:hidden}'
      + 'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans SC",sans-serif;' + bgStyle + 'color:' + txtC + ';transition:background .4s,color .4s}'
      + 'body::before{content:"";position:fixed;inset:0;background:' + (bgImg ? 'rgba(0,0,0,' + (dark ? '0.4' : '0.15') + ')' : 'none') + ';z-index:0;pointer-events:none}'
      + '.c{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;min-height:100vh;padding:15vh 20px 40px}'
      + '.ck{font-size:72px;font-weight:300;letter-spacing:-2px;margin-bottom:8px;color:' + txtC + ';text-shadow:' + (bgImg ? '0 2px 8px rgba(0,0,0,0.3)' : 'none') + '}'
      + '.dt{font-size:16px;color:' + txt2 + ';margin-bottom:36px;text-shadow:' + (bgImg ? '0 1px 4px rgba(0,0,0,0.3)' : 'none') + '}'
      + '.sw{position:relative;width:100%;max-width:584px;margin-bottom:32px}'
      + '.sb{display:flex;align-items:center;width:100%;height:48px;border-radius:24px;background:' + sBg + ';border:1px solid ' + sBd + ';box-shadow:0 2px 8px rgba(0,0,0,' + sSh + ');overflow:hidden;transition:box-shadow .2s,border-color .2s}'
      + '.sb:focus-within{box-shadow:0 4px 16px rgba(0,0,0,' + (dark ? '0.16' : '0.08') + ');border-color:' + sBdF + '}'
      + '.eb{display:flex;align-items:center;gap:6px;padding:0 12px 0 16px;height:100%;border:none;background:transparent;color:' + txt2 + ';cursor:pointer;font-size:13px;font-family:inherit;white-space:nowrap;border-right:1px solid ' + sBd + '}'
      + '.eb:hover{color:' + txtC + '}'
      + '.si{flex:1;height:100%;border:none;outline:none;background:transparent;padding:0 16px;font-size:16px;font-family:inherit;color:' + txtC + '}'
      + '.si::placeholder{color:' + txt2 + '}'
      + '.ss{display:flex;align-items:center;justify-content:center;width:48px;height:100%;border:none;background:transparent;cursor:pointer;color:' + txt2 + ';transition:color .2s}'
      + '.ss:hover{color:' + txtC + '}'
      + '.ed{position:absolute;top:56px;left:0;min-width:180px;background:' + panelBg + ';border:1px solid ' + panelBd + ';border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,' + (dark ? '0.4' : '0.15') + ');padding:6px;display:none;z-index:100}'
      + '.ed.show{display:block}'
      + '.eo{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:8px;cursor:pointer;color:' + txtC + ';font-size:14px;transition:background .15s}'
      + '.eo:hover{background:' + optHov + '}'
      + '.eo.act{background:' + optAct + ';color:' + optActC + '}'
      + '.ms{display:flex;gap:4px;background:' + hovBg + ';border-radius:10px;padding:3px;margin-bottom:16px}'
      + '.mb{flex:1;padding:7px 12px;border:none;border-radius:8px;font-size:13px;font-family:inherit;cursor:pointer;background:transparent;color:' + txt2 + ';transition:all .2s}'
      + '.mb.act{background:' + panelBg + ';color:' + txtC + ';box-shadow:0 1px 3px rgba(0,0,0,0.1)}'
      + '.sg{display:grid;grid-template-columns:repeat(6,96px);gap:16px 12px;margin-bottom:32px}'
      + '.sc{display:flex;flex-direction:column;align-items:center;gap:8px;cursor:pointer;text-decoration:none;color:inherit;border-radius:12px;padding:12px 8px;transition:background .2s;position:relative}'
      + '.sc:hover{background:' + hovBg + '}'
      + '.si2{width:48px;height:48px;border-radius:50%;background:' + iconBg + ';display:flex;align-items:center;justify-content:center;overflow:hidden;font-size:22px;box-shadow:0 1px 4px rgba(0,0,0,0.1)}'
      + '.si2 img{width:32px;height:32px;object-fit:contain}'
      + '.st{font-size:12px;color:' + txt2 + ';text-align:center;max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-shadow:' + (bgImg ? '0 1px 3px rgba(0,0,0,0.2)' : 'none') + '}'
      + '.sr{position:absolute;top:4px;right:4px;width:20px;height:20px;border-radius:50%;border:none;background:rgba(0,0,0,0.5);color:#fff;font-size:11px;cursor:pointer;display:none;align-items:center;justify-content:center;line-height:1}'
      + '.sc:hover .sr{display:flex}'
      + '.add .si2{border:2px dashed ' + dashC + ';background:transparent;font-size:18px;color:' + dashC + '}'
      + '.cards{display:flex;gap:12px;margin-bottom:24px;flex-wrap:wrap;justify-content:center}'
      + '.card{background:' + cardBg + ';border:1px solid ' + cardBd + ';border-radius:16px;padding:16px 20px;min-width:220px;max-width:280px;backdrop-filter:blur(12px);cursor:pointer;transition:transform .2s,box-shadow .2s}'
      + '.card:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(0,0,0,' + (dark ? '0.3' : '0.1') + ')}'
      + '.ch{display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:13px;font-weight:500;color:' + txtC + '}'
      + '.cb{font-size:13px;color:' + txt2 + ';line-height:1.5;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
      + '.setb{position:fixed;bottom:24px;right:24px;width:48px;height:48px;border-radius:50%;border:none;background:' + setBtnBg + ';color:' + setBtnC + ';font-size:20px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.15);transition:transform .2s,box-shadow .2s;z-index:50;backdrop-filter:blur(8px)}'
      + '.setb:hover{transform:scale(1.08);box-shadow:0 4px 16px rgba(0,0,0,0.2)}'
      + '.sp{position:fixed;bottom:82px;right:24px;width:340px;max-height:80vh;overflow-y:auto;background:' + panelBg + ';border:1px solid ' + panelBd + ';border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,' + (dark ? '0.5' : '0.15') + ');padding:20px;display:none;z-index:50}'
      + '.sp.show{display:block}'
      + '.spt{font-size:16px;font-weight:600;margin-bottom:20px;color:' + txtC + '}'
      + '.sps{margin-bottom:18px}'
      + '.spl{font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:' + labelC + ';margin-bottom:10px}'
      + '.cw{width:36px;height:36px;border-radius:50%;border:2px solid transparent;cursor:pointer;transition:border-color .2s,transform .15s;display:inline-block;margin:0 4px 4px 0}'
      + '.cw:hover{transform:scale(1.1)}'
      + '.cw.act{border-color:' + optActC + '}'
      + '.gg{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}'
      + '.gi{aspect-ratio:16/9;border-radius:8px;background-size:cover;background-position:center;cursor:pointer;border:2px solid transparent;transition:border-color .2s,transform .15s;overflow:hidden;position:relative}'
      + '.gi:hover{transform:scale(1.04)}'
      + '.gi.act{border-color:' + optActC + '}'
      + '.gn{position:absolute;bottom:0;left:0;right:0;padding:4px 6px;font-size:10px;color:#fff;background:linear-gradient(transparent,rgba(0,0,0,0.6))}'
      + '.ub{display:flex;align-items:center;justify-content:center;gap:6px;width:100%;padding:10px;border-radius:10px;border:1px dashed ' + dashC + ';background:transparent;color:' + txt2 + ';font-size:13px;cursor:pointer;transition:background .2s;font-family:inherit}'
      + '.ub:hover{background:' + hovBg + '}'
      + '.tg{width:44px;height:24px;border-radius:12px;background:' + tBg + ';position:relative;cursor:pointer;transition:background .3s;display:inline-block}'
      + '.tg.on{background:' + tActBg + '}'
      + '.tg::after{content:"";position:absolute;width:20px;height:20px;border-radius:50%;background:white;top:2px;left:2px;transition:transform .3s;box-shadow:0 1px 3px rgba(0,0,0,0.2)}'
      + '.tg.on::after{transform:translateX(20px)}'
      + '.trow{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}'
      + '.tlbl{font-size:14px;color:' + txtC + '}'
      + '.mo{position:fixed;inset:0;background:' + overlayBg + ';z-index:200;display:none;align-items:center;justify-content:center}'
      + '.mo.show{display:flex}'
      + '.md{background:' + modalBg + ';border-radius:16px;padding:28px;width:380px;box-shadow:0 16px 48px rgba(0,0,0,0.3)}'
      + '.md h3{font-size:18px;font-weight:600;margin-bottom:20px;color:' + txtC + '}'
      + '.mi{width:100%;padding:12px 14px;border:1px solid ' + inputBd + ';border-radius:10px;background:' + inputBg + ';color:' + txtC + ';font-size:14px;font-family:inherit;margin-bottom:14px;outline:none;transition:border-color .2s}'
      + '.mi:focus{border-color:' + sBdF + '}'
      + '.mbtns{display:flex;justify-content:flex-end;gap:10px;margin-top:6px}'
      + '.mbtn{padding:10px 20px;border-radius:10px;border:none;font-size:14px;font-family:inherit;cursor:pointer;transition:background .2s}'
      + '.mcan{background:' + canBg + ';color:' + txtC + '}'
      + '.mcon{background:' + confBg + ';color:white}'
      + '@media(max-width:700px){.sg{grid-template-columns:repeat(4,80px);gap:12px 8px}.ck{font-size:48px}.c{padding:10vh 16px 24px}.sp{width:calc(100vw - 32px);right:16px}}';

    document.head.appendChild(el('style', '', css));

    var container = el('div', 'c');
    var clock = el('div', 'ck');
    var dateEl = el('div', 'dt');

    function tick() {
      var n = new Date();
      clock.textContent = String(n.getHours()).padStart(2, '0') + ':' + String(n.getMinutes()).padStart(2, '0');
      var ds = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];
      dateEl.textContent = n.getFullYear() + '年' + (n.getMonth() + 1) + '月' + n.getDate() + '日 ' + ds[n.getDay()];
    }
    tick();
    setInterval(tick, 10000);
    container.appendChild(clock);
    container.appendChild(dateEl);

    // Search
    var sw = el('div', 'sw');
    var sb = el('div', 'sb');
    var curEng = ENGINES[eng] || ENGINES.bing;
    var eb = el('button', 'eb', curEng.i + ' ' + curEng.n);
    var input = el('input', 'si');
    input.type = 'text'; input.placeholder = '搜索网页...'; input.autocomplete = 'off';
    var submitBtn = el('button', 'ss', '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>');

    var ed = el('div', 'ed');
    Object.keys(ENGINES).forEach(function(k) {
      var e = ENGINES[k];
      var o = el('div', 'eo' + (k === eng ? ' act' : ''), e.i + ' ' + e.n);
      o.addEventListener('click', function(ev) {
        ev.stopPropagation();
        sv(SK.engine, k);
        eb.innerHTML = e.i + ' ' + e.n;
        ed.querySelectorAll('.eo').forEach(function(x) { x.classList.remove('act'); });
        o.classList.add('act');
        ed.classList.remove('show');
        input.focus();
      });
      ed.appendChild(o);
    });

    eb.addEventListener('click', function(ev) { ev.stopPropagation(); ed.classList.toggle('show'); });

    function doSearch() {
      var q = input.value.trim();
      if (q) {
        var se = ld(SK.engine, 'bing');
        window.location.href = (ENGINES[se] || ENGINES.bing).u + encodeURIComponent(q);
      }
    }
    input.addEventListener('keydown', function(ev) { if (ev.key === 'Enter') doSearch(); });
    submitBtn.addEventListener('click', doSearch);
    document.addEventListener('click', function() { ed.classList.remove('show'); });

    sb.appendChild(eb); sb.appendChild(input); sb.appendChild(submitBtn);
    sw.appendChild(sb); sw.appendChild(ed);
    container.appendChild(sw);

    // Mode switch
    var ms = el('div', 'ms');
    var ab = el('button', 'mb' + (mode === 'auto' ? ' act' : ''), '最常访问');
    var mb2 = el('button', 'mb' + (mode === 'manual' ? ' act' : ''), '手动管理');
    function setMode(m) {
      sv(SK.mode, m);
      ab.classList.toggle('act', m === 'auto');
      mb2.classList.toggle('act', m === 'manual');
      buildShortcuts();
    }
    ab.addEventListener('click', function() { setMode('auto'); });
    mb2.addEventListener('click', function() { setMode('manual'); });
    ms.appendChild(ab); ms.appendChild(mb2);
    container.appendChild(ms);

    // Shortcuts
    var sg = el('div', 'sg');

    function showAddModal() {
      var ov = el('div', 'mo show');
      var md = el('div', 'md');
      md.innerHTML = '<h3>添加快捷方式</h3>';
      var iName = el('input', 'mi'); iName.placeholder = '名称'; iName.type = 'text';
      var iUrl = el('input', 'mi'); iUrl.placeholder = '网址 (https://...)'; iUrl.type = 'url';
      var btns = el('div', 'mbtns');
      var cancel = el('button', 'mbtn mcan', '取消');
      var confirm = el('button', 'mbtn mcon', '添加');
      cancel.addEventListener('click', function() { ov.remove(); });
      confirm.addEventListener('click', function() {
        var n = iName.value.trim(), u = iUrl.value.trim();
        if (n && u) {
          var all = ld(SK.shortcuts, DEF_SHORTCUTS);
          all.push({ t: n, u: u, i: '' });
          sv(SK.shortcuts, all);
          buildShortcuts();
        }
        ov.remove();
      });
      btns.appendChild(cancel); btns.appendChild(confirm);
      md.appendChild(iName); md.appendChild(iUrl); md.appendChild(btns);
      ov.appendChild(md);
      ov.addEventListener('click', function(ev) { if (ev.target === ov) ov.remove(); });
      document.body.appendChild(ov);
      iName.focus();
    }

    function buildShortcuts() {
      sg.innerHTML = '';
      var cm = ld(SK.mode, 'auto');
      var cs = ld(SK.shortcuts, DEF_SHORTCUTS);
      var isMan = cm === 'manual';

      cs.forEach(function(s, i) {
        var sc = el('a', 'sc');
        sc.href = s.u;
        var icon = el('div', 'si2');
        if (s.i && s.i.length <= 2) {
          icon.textContent = s.i;
        } else {
          var img = el('img');
          img.src = favicon(s.u); img.alt = s.t; img.loading = 'lazy';
          img.onerror = function() { this.style.display = 'none'; icon.textContent = s.t.charAt(0).toUpperCase(); };
          icon.appendChild(img);
        }
        var title = el('div', 'st', s.t);

        if (isMan) {
          var rm = el('button', 'sr', '✕');
          rm.addEventListener('click', function(ev) {
            ev.preventDefault(); ev.stopPropagation();
            var all = ld(SK.shortcuts, DEF_SHORTCUTS);
            all.splice(i, 1);
            sv(SK.shortcuts, all);
            buildShortcuts();
          });
          sc.appendChild(rm);
        }

        sc.appendChild(icon); sc.appendChild(title);
        sg.appendChild(sc);
      });

      if (isMan) {
        var add = el('div', 'sc add');
        var addIcon = el('div', 'si2', '+');
        var addTitle = el('div', 'st', '添加快捷方式');
        add.appendChild(addIcon); add.appendChild(addTitle);
        add.addEventListener('click', showAddModal);
        sg.appendChild(add);
      }
    }

    buildShortcuts();
    container.appendChild(sg);

    // Cards
    var cardsEl = el('div', 'cards');
    var tabs = ld(SK.recent, []);
    if (tabs.length === 0) {
      [{ t: '继续浏览', i: '🕐', b: '登录后可查看最近浏览记录' }, { t: '发现更多', i: '✨', b: '根据你的偏好推荐内容' }].forEach(function(c) {
        var card = el('div', 'card', '<div class="ch">' + c.i + ' ' + c.t + '</div><div class="cb">' + c.b + '</div>');
        cardsEl.appendChild(card);
      });
    } else {
      tabs.slice(0, 3).forEach(function(t) {
        var card = el('div', 'card', '<div class="ch">🕐 ' + (t.t || '继续浏览') + '</div><div class="cb">' + (t.u || '') + '</div>');
        card.addEventListener('click', function() { window.location.href = t.u; });
        cardsEl.appendChild(card);
      });
    }
    container.appendChild(cardsEl);

    document.body.appendChild(container);

    // Settings button
    var setBtn = el('button', 'setb', '⚙');
    var panel = el('div', 'sp');

    // Theme toggle
    var panelContent = '<div class="spt">自定义</div>';
    panelContent += '<div class="sps"><div class="spl">外观</div>';
    panelContent += '<div class="trow"><span class="tlbl">深色模式</span><div class="tg' + (dark ? ' on' : '') + '" id="ntDarkToggle"></div></div>';
    panelContent += '</div>';

    // Background color
    panelContent += '<div class="sps"><div class="spl">背景颜色</div><div id="ntColorWrap">';
    COLORS.forEach(function(c) {
      panelContent += '<div class="cw' + (c === bgColor && !bgImg ? ' act' : '') + '" style="background:' + c + '" data-color="' + c + '"></div>';
    });
    panelContent += '</div></div>';

    // Gallery
    panelContent += '<div class="sps"><div class="spl">图库背景</div><div class="gg" id="ntGallery">';
    GALLERY.forEach(function(g) {
      panelContent += '<div class="gi' + (g.u === bgImg ? ' act' : '') + '" style="background-image:url(' + g.u + ')" data-url="' + g.u + '"><div class="gn">' + g.n + '</div></div>';
    });
    panelContent += '</div></div>';

    // Upload
    panelContent += '<div class="sps"><button class="ub" id="ntUploadBtn">📁 上传自定义图片</button><input type="file" accept="image/*" id="ntFileInput" style="display:none"></div>';

    panel.innerHTML = panelContent;
    document.body.appendChild(setBtn);
    document.body.appendChild(panel);

    setBtn.addEventListener('click', function() { panel.classList.toggle('show'); });

    // Dark toggle
    var darkToggle = document.getElementById('ntDarkToggle');
    if (darkToggle) {
      darkToggle.addEventListener('click', function() {
        var isOn = darkToggle.classList.toggle('on');
        sv(SK.bgType, isOn ? 'dark' : 'light');
        sv(SK.bgImage, '');
        buildPage();
      });
    }

    // Color swatches
    document.getElementById('ntColorWrap').addEventListener('click', function(ev) {
      var swatch = ev.target.closest('.cw');
      if (!swatch) return;
      sv(SK.bgColor, swatch.dataset.color);
      sv(SK.bgImage, '');
      buildPage();
    });

    // Gallery
    document.getElementById('ntGallery').addEventListener('click', function(ev) {
      var item = ev.target.closest('.gi');
      if (!item) return;
      sv(SK.bgImage, item.dataset.url);
      buildPage();
    });

    // Upload
    var fileInput = document.getElementById('ntFileInput');
    document.getElementById('ntUploadBtn').addEventListener('click', function() { fileInput.click(); });
    fileInput.addEventListener('change', function() {
      var file = fileInput.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(e) {
        sv(SK.bgImage, e.target.result);
        buildPage();
      };
      reader.readAsDataURL(file);
    });

    // Close panel on outside click
    document.addEventListener('click', function(ev) {
      if (!panel.contains(ev.target) && ev.target !== setBtn) {
        panel.classList.remove('show');
      }
    });

    input.focus();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildPage);
  } else {
    buildPage();
  }
})();