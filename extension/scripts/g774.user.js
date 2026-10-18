(async function __tabEvaluateScriptBridge() {
  const __tabScriptArgs = null;
  const __tabOriginalFunction = (
    async function run(args) {
      var SK = 'secretary_schedule_v2';
      var schedules = [];
      try { schedules = JSON.parse(localStorage.getItem(SK) || '[]'); } catch(e) { schedules = []; }
      function saveData() { localStorage.setItem(SK, JSON.stringify(schedules)); }
    
      function todayStr() { return new Date().toISOString().split('T')[0]; }
      function fmtFull(d) { return new Date(d+'T00:00:00').toLocaleDateString('zh-CN',{year:'numeric',month:'long',day:'numeric',weekday:'long'}); }
      function fmtShort(d) { return new Date(d+'T00:00:00').toLocaleDateString('zh-CN',{month:'long',day:'numeric',weekday:'short'}); }
      function nLabel(m) { if(!m||m===0)return '\u65e0\u63d0\u9192';if(m<60)return'\u63d0\u524d'+m+'\u5206\u949f';if(m<1440)return'\u63d0\u524d'+m/60+'\u5c0f\u65f6';return'\u63d0\u524d1\u5929'; }
      var COLORS = ['#4f46e5','#7c3aed','#2563eb','#0891b2','#059669','#d97706','#dc2626','#db2777','#9333ea'];
      function evColor(t) { var h=0;for(var i=0;i<t.length;i++)h=t.charCodeAt(i)+((h<<5)-h);return COLORS[Math.abs(h)%COLORS.length]; }
    
      function eventDates() { var s=new Set();for(var i=0;i<schedules.length;i++)s.add(schedules[i].date);return s; }
    
      var cY, cM, selDate = null;
    
      /* ========= HTML TEMPLATE ========= */
      var html = '<style>\
    *{margin:0;padding:0;box-sizing:border-box;}\
    body{margin:0;padding:0;overflow:hidden;background:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;}\
    .app{position:fixed;top:0;left:0;width:100%;height:100vh;display:flex;flex-direction:column;z-index:99999;}\
    .top{background:linear-gradient(135deg,#4f46e5,#7c3aed,#a855f7);color:#fff;padding:14px 28px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;}\
    .top-l{display:flex;align-items:center;gap:16px;}\
    .logo{font-size:1.5em;font-weight:700;}\
    .dt-bdg{background:rgba(255,255,255,.18);padding:7px 16px;border-radius:20px;font-size:.88em;}\
    .top-r{display:flex;gap:8px;}\
    .btn-t{padding:8px 16px;border:2px solid rgba(255,255,255,.4);background:rgba(255,255,255,.12);color:#fff;border-radius:10px;cursor:pointer;font-size:.85em;font-weight:600;}\
    .btn-t:hover{background:rgba(255,255,255,.28);}\
    .btn-tp{background:#fff;color:#4f46e5;border-color:#fff;}\
    .main{flex:1;display:grid;grid-template-columns:1fr 400px;overflow:hidden;}\
    @media(max-width:1024px){.main{grid-template-columns:1fr;}}\
    .cal-area{padding:24px;overflow-y:auto;}\
    .cal-hd{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;}\
    .cal-nav{display:flex;gap:6px;}\
    .nb{width:36px;height:36px;border:none;border-radius:10px;background:#fff;color:#4f46e5;font-size:1.2em;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,.08);display:flex;align-items:center;justify-content:center;}\
    .nb:hover{background:#4f46e5;color:#fff;}\
    .m-title{font-size:1.4em;font-weight:700;color:#1e293b;text-align:center;min-width:160px;}\
    .btn-tod{padding:8px 16px;border:none;border-radius:10px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;font-weight:600;cursor:pointer;font-size:.85em;}\
    .wds{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:4px;}\
    .wd{text-align:center;font-weight:700;font-size:.8em;color:#64748b;padding:8px 0;text-transform:uppercase;}\
    .wd.we{color:#ef4444;}\
    .grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;}\
    /* cell styles */\
    .cell{min-height:84px;background:#fff;border-radius:11px;padding:5px 7px;cursor:pointer;transition:all .2s;border:2px solid transparent;position:relative;overflow:hidden;display:flex;flex-direction:column;}\
    .cell:hover{border-color:#a78bfa;box-shadow:0 4px 12px rgba(79,70,229,.12);transform:translateY(-2px);z-index:2;}\
    .cell.om{opacity:.35;background:#fafafa;}\
    .cell.today{border-color:#4f46e5;background:linear-gradient(135deg,#eef2ff,#ede9fe);}\
    .cell.today .d-num{background:#4f46e5;color:#fff;width:24px;height:24px;font-size:.88em;}\
    .cell.sel{border-color:#7c3aed;background:linear-gradient(135deg,#ddd6fe,#c4b5fd);}\
    /* RED HIGHLIGHT for dates with events */\
    .cell.has-ev{background:linear-gradient(135deg,#fef2f2,#fee2e2)!important;border-color:#fca5a5!important;border-width:2px!important;}\
    .cell.has-ev:hover{border-color:#ef4444!important;box-shadow:0 4px 15px rgba(239,68,68,.25)!important;}\
    .cell.has-ev .d-num{color:#dc2626!important;font-weight:700!important;}\
    .cell.has-ev.today{background:linear-gradient(135deg,#fecaca,#fca5a5)!important;border-color:#ef4444!important;}\
    .cell.has-ev.sel{background:linear-gradient(135deg,#f87171,#dc2626)!important;border-color:#b91c1c!important;}\
    .cell.has-ev.sel .d-num{background:#fff!important;color:#dc2626!important;font-weight:800!important;}\
    .d-num{font-size:.88em;font-weight:700;color:#334155;width:24px;height:24px;display:flex;align-items:center;justify-content:center;border-radius:50%;}\
    .cell.we-d .d-num{color:#ef4444;}\
    .cell.has-ev.we-d .d-num{color:#991b1b!important;font-weight:800!important;}\
    .evs{flex:1;overflow:hidden;display:flex;flex-direction:column;gap:2px;}\
    .ev-dot{font-size:.66em;padding:2px 5px;border-radius:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#fff;font-weight:500;line-height:1.3;}\
    /* sidebar */\
    .side{background:#fff;border-left:1px solid #e2e8f0;display:flex;flex-direction:column;overflow:hidden;}\
    .tabs{display:flex;border-bottom:2px solid #f1f5f9;}\
    .tab{flex:1;padding:13px;text-align:center;font-weight:600;font-size:.88em;color:#64748b;cursor:pointer;border-bottom:3px solid transparent;margin-bottom:-2px;background:none;border-top:none;border-left:none;border-right:none;}\
    .tab:hover{color:#4f46e5;background:#f8fafc;}\
    .tab.on{color:#4f46e5;border-bottom-color:#4f46e5;background:#fff;}\
    .pnl{flex:1;overflow-y:auto;padding:18px;display:none;}\
    .pnl.on{display:block;}\
    .dthd{margin-bottom:18px;}\
    .dtt{font-size:1.3em;font-weight:700;color:#1e293b;margin-bottom:4px;}\
    .dts{font-size:.85em;color:#94a3b8;}\
    .de{list-style:none;}\
    .dc{background:#f8fafc;border-left:4px solid #4f46e5;border-radius:10px;padding:14px;margin-bottom:10px;transition:all .2s;}\
    .dc:hover{box-shadow:0 3px 10px rgba(0,0,0,.08);transform:translateX(3px);}\
    .dc.done{opacity:.55;border-left-color:#22c55e;}\
    .dbg{display:inline-block;background:#4f46e5;color:#fff;padding:3px 9px;border-radius:6px;font-size:.78em;font-weight:600;margin-bottom:6px;}\
    .dbg.allday{background:#7c3aed;}\
    .dct{font-size:1em;font-weight:700;color:#1e293b;margin-bottom:5px;}\
    .dcm{font-size:.8em;color:#64748b;line-height:1.55;margin-bottom:6px;}\
    .dca{display:flex;gap:5px;flex-wrap:wrap;}\
    .db{padding:4px 10px;border:none;border-radius:6px;font-size:.75em;font-weight:600;cursor:pointer;}\
    .db-ok{background:#dcfce7;color:#166534;}\
    .db-ed{background:#dbeafe;color:#1e40af;}\
    .db-dl{background:#fee2e2;color:#991b1b;}\
    .qa{background:linear-gradient(135deg,#eef2ff,#ede9fe);border-radius:12px;padding:16px;margin-bottom:18px;border:2px dashed #c7d2fe;}\
    .qal{font-size:.8em;font-weight:700;color:#4f46e5;margin-bottom:8px;}\
    .qar{display:flex;gap:6px;}\
    .qai{flex:1;padding:9px 12px;border:2px solid #c7d2de;border-radius:9px;font-size:.88em;background:#fff;font-family:inherit;}\
    .qai:focus{outline:none;border-color:#4f46e5;}\
    .qab{padding:9px 16px;border:none;border-radius:9px;background:#4f46e5;color:#fff;font-weight:700;cursor:pointer;font-size:.85em;white-space:nowrap;}\
    .fg{margin-bottom:14px;}\
    .fl{display:block;font-size:.8em;font-weight:700;color:#475569;margin-bottom:5px;text-transform:uppercase;}\
    .fi,.ft,.fs{width:100%;padding:10px 12px;border:2px solid #e2e8f0;border-radius:9px;font-size:.9em;font-family:inherit;background:#f8fafc;}\
    .fi:focus,.ft:focus,.fs:focus{outline:none;border-color:#4f46e5;background:#fff;box-shadow:0 0 0 3px rgba(79,70,229,.1);}\
    .bsub{width:100%;padding:12px;border:none;border-radius:10px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;font-size:.95em;font-weight:700;cursor:pointer;margin-top:6px;}\
    .bsub:hover{transform:translateY(-2px);box-shadow:0 5px 18px rgba(79,70,229,.35);}\
    .nc{position:fixed;top:76px;right:16px;z-index:999999;max-width:360px;width:calc(100% - 32px);}\
    .nd{background:#fff;border-radius:12px;padding:14px 18px;margin-bottom:8px;box-shadow:0 6px 25px rgba(0,0,0,.14);border-left:5px solid #f59e0b;animation:nIn .3s ease-out;position:relative;}\
    .nd.al{border-left-color:#ef4444;}\
    .nd.ok{border-left-color:#22c55e;}\
    @keyframes nIn{from{transform:translateX(120%);opacity:0;}to{transform:translateX(0);opacity:1;}}\
    .nx{position:absolute;top:6px;right:8px;background:none;border:none;font-size:1.1em;cursor:pointer;color:#94a3b8;}\
    .mo{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,.6);backdrop-filter:blur(5px);z-index:999998;display:none;justify-content:center;align-items:center;}\
    .mo.show{display:flex;}\
    .mb{background:#fff;border-radius:18px;padding:28px;width:90%;max-width:480px;max-height:80vh;overflow-y:auto;box-shadow:0 20px 50px rgba(0,0,0,.3);}\
    .mh{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;padding-bottom:12px;border-bottom:2px solid #f1f5f9;}\
    .mh h3{font-size:1.2em;color:#1e293b;}\
    .mc{background:none;border:none;font-size:1.5em;cursor:pointer;color:#94a3b8;line-height:1;}\
    ::-webkit-scrollbar{width:5px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:3px;}\
    </style>';
    
    html += '<div class="app">';
    /* TOP BAR */
    html += '<div class="top"><div class="top-l"><span class="logo">\ud83d\udcc5 \u79d8\u4e66\u65e5\u7a0b</span><span class="dt-bdg" id="_dt"></span></div>';
    html += '<div class="top-r">';
    html += '<button class="btn-t" onclick="doExp()">\ud83d\ucee4 \u5bfc\u51fa</button>';
    html += '<button class="btn-t" onclick="doImp()">\ud83d\udce1 \u5bfc\u5165</button>';
    html += '<button class="btn-t btn-tp" onclick="swTab(\'add\');document.getElementById(\'_iT\').focus()">\u2795 \u65b0\u5efa\u65e5\u7a0b</button>';
    html += '</div></div>';
    
    /* MAIN */
    html += '<div class="main">';
    /* LEFT: CALENDAR */
    html += '<div class="cal-area">';
    html += '<div class="cal-hd">';
    html += '<div class="cal-nav"><button class="nb" onclick="goPrevM()">\u25c0</button><button class="nb" onclick="goPrevY()">\u23ea</button></div>';
    html += '<h2 class="m-title" id="_mt"></h2>';
    html += '<div class="cal-nav"><button class="nb" onclick="goNextY()">\u23e9</button><button class="nb" onclick="goNextM()\u25b6</button><button class="btn-tod" onclick="goToday()">\u4eca\u5929</button></div>';
    html += '</div>';
    html += '<div class="wds" id="_wd"></div>';
    html += '<div class="grid" id="_grid"></div>';
    html += '</div>';
    
    /* RIGHT: SIDEBAR */
    html += '<div class="side">';
    html += '<div class="tabs">';
    html += '<button class="tab on" onclick="swTab(\'detail\')">\ud83d\udccb \u5f53\u65e5\u8be6\u60c5</button>';
    html += '<button class="tab" onclick="swTab(\'add\')">\u2795 \u6dfb\u52a0\u65e5\u7a0b</button>';
    html += '<button class="tab" onclick="swTab(\'files\')">\ud83d\udcce \u6587\u4ef6</button>';
    html += '</div>';
    
    /* DETAIL PANEL */
    html += '<div class="pnl on" id="_pd">';
    html += '<div class="dthd"><div class="dtt" id="_dtt">\u9009\u62e9\u4e00\u4e2a\u65e5\u671f</div><div class="dts" id="_dts">\u70b9\u51fb\u65e5\u5386\u4e0a\u7684\u65e5\u671f\u67e5\u770b\u8be6\u60c5</div></div>';
    html += '<ul class="de" id="_dl"><li style="text-align:center;padding:40px 16px;color:#94a3b8;">\ud83d\udcc5 \u70b9\u51fb\u5de6\u4fa7\u65e5\u5386\u67e5\u770b\u8be6\u60c5</li></ul>';
    html += '</div>';
    
    /* ADD PANEL */
    html += '<div class="pnl" id="_pa">';
    html += '<div class="qa"><div class="qal">\u26a1 \u5feb\u901f\u6dfb\u52a0\uff08\u667a\u80fd\u89e3\u6790\uff09</div>';
    html += '<div class="qar"><input type="text" class="qai" id="_qi" placeholder="\u4f8b\uff1a\u660e\u5929\u4e0b\u53483\u70b9\u5f00\u4f1a..."><button class="qab" onclick="doQuick()">\u89e3\u6790\u6dfb\u52a0</button></div></div>';
    html += '<div class="fg"><label class="fl">\u65e5\u7a0b\u6807\u9898 *</label><input type="text" class="fi" id="_iT" placeholder="\u8f93\u5165\u65e5\u7a0b\u6807\u9898"></div>';
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">';
    html += '<div class="fg" style="margin-bottom:0"><label class="fl">\u65e5\u671f *</label><input type="date" class="fi" id="_iD"></div>';
    html += '<div class="fg" style="margin-bottom:0"><label class="fl">\u65f6\u95f4</label><input type="time" class="fi" id="_iTm"></div>';
    html += '</div>';
    html += '<div class="fg"><label class="fl">\u63d0\u524d\u901a\u77e5</label><select class="fs" id="_iN"><option value="0">\u4e0d\u63d0\u9192</option><option value="5">\u63d0\u524d5\u5206\u949f</option><option value="15" selected>\u63d0\u524d15\u5206\u949f</option><option value="30">\u63d0\u524d30\u5206\u949f</option><option value="60">\u63d0\u524d1\u5c0f\u65f6</option><option value="1440">\u63d0\u524d1\u5929</option></select></div>';
    html += '<div class="fg"><label class="fl">\u8be6\u7ec6\u63cf\u8ff0 / \u5730\u70b9</label><textarea class="ft" id="_iDc" placeholder="\u6dfb\u52a0\u8be6\u7ec6\u63cf\u8ff0..."></textarea></div>';
    html += '<button class="bsub" onclick="doSub()">\u2728 \u6dfb\u52a0\u65e5\u7a0b</button>';
    html += '</div>';
    
    /* FILES PANEL */
    html += '<div class="pnl" id="_pf"><p style="color:#94a3b8;text-align:center;padding:30px;">\ud83d\udcc1 \u6587\u4ef6\u7ba1\u7406\u529f\u80fd</p></div>';
    
    html += '</div>'; /* end side */
    html += '</div>'; /* end main */
    
    /* NOTIFICATIONS */
    html += '<div class="nc" id="_nc"></div>';
    
    /* EDIT MODAL */
    html += '<div class="mo" id="_mo">';
    html += '<div class="mb"><div class="mh"><h3>\u270f\ufe0f \u7f16\u8f91\u65e5\u7a0b</h3><button class="mc" onclick="clsEd()">&times;</button></div>';
    html += '<input type="hidden" id="_eid">';
    html += '<div class="fg"><label class="fl">\u6807\u9898</label><input type="text" class="fi" id="_eT"></div>';
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;"><div class="fg" style="margin-bottom:0"><label class="fl">\u65e5\u671f</label><input type="date" class="fi" id="_eD"></div><div class="fg" style="margin-bottom:0"><label class="fl">\u65f6\u95f4</label><input type="time" class="fi" id="_eTm"></div></div>';
    html += '<div class="fg"><label class="fl">\u901a\u77e5</label><select class="fs" id="_eN"><option value="0">\u4e0d\u63d0\u9192</option><option value="5">5\u5206\u949f</option><option value="15" selected>15\u5206\u949f</option><option value="30">30\u5206\u949f</option><option value="60">1\u5c0f\u65f6</option><option value="1440">1\u5929</option></select></div>';
    html += '<div class="fg"><label class="fl">\u63cf\u8ff0</label><textarea class="ft" id="_eDc"></textarea></div>';
    html += '<button class="bsub" onclick="savEd()">\ud83d\udcbe \u4fdd\u5b58\u4fee\u6539</button>';
    html += '</div></div>';
    
    html += '</div>'; /* end app */
    
      document.body.innerHTML = html;
    
      /* ========== RENDER FUNCTIONS ========== */
      var WD = ['\u5468\u65e5','\u5468\u4e00','\u5468\u4e8c','\u5468\u4e09','\u5468\u56db','\u5468\u4e94','\u5468\u516d'];
    
      function $(id) { return document.getElementById(id); }
    
      function renderCal(y, m) {
        cY = y;
        cM = m;
        $('_mt').textContent = y + '\u5e74' + (m+1) + '\u6708';
        
        var wdh = '';
        for (var wi = 0; wi < 7; wi++) {
          wdh += '<div class="wd' + (wi === 0 || wi === 6 ? ' we' : '') + '">' + WD[wi] + '</div>';
        }
        $('_wd').innerHTML = wdh;
    
        var fd = new Date(y, m, 1).getDay();
        var dim = new Date(y, m+1, 0).getDate();
        var pdim = new Date(y, m, 0).getDate();
        var grid = $('_grid');
        if (!grid) return;
        grid.innerHTML = '';
    
        // ★ Get event dates set ONCE before building cells ★
        var eds = eventDates();
    
        // Previous month
        for (var i = fd - 1; i >= 0; i--) {
          var d = pdim - i;
          var pm = m === 0 ? 11 : m - 1;
          var py = m === 0 ? y - 1 : y;
          var ds = py + '-' + String(pm+1).padStart(2,'0') + '-' + String(d).padStart(2,'0');
          grid.appendChild(makeCell(ds, d, true, y, m, eds));
        }
        // Current month
        for (var d = 1; d <= dim; d++) {
          var ds = y + '-' + String(m+1).padStart(2,'0') + '-' + String(d).padStart(2,'0');
          grid.appendChild(makeCell(ds, d, false, y, m, eds));
        }
        // Next month
        var rem = (fd + dim) % 7;
        var left = rem ? 7 - rem : 0;
        for (var d = 1; d <= left; d++) {
          var nm = m === 11 ? 0 : m + 1;
          var ny = m === 11 ? y + 1 : y;
          var ds = ny + '-' + String(nm+1).padStart(2,'0') + '-' + String(d).padStart(2,'0');
          grid.appendChild(makeCell(ds, d, true, y, m, eds));
        }
      }
    
      // ★ Core: build each cell with red highlight check built-in ★
      function makeCell(ds, dn, isOm, cy, cm, evSet) {
        var cell = document.createElement('div');
        cell.className = 'cell';
        if (isOm) cell.className += ' om';
    
        var ts = todayStr();
        if (ds === ts) cell.className += ' today';
        if (ds === selDate) cell.className += ' sel';
    
        // ★ RED HIGHLIGHT: check if date has events ★
        if (evSet && evSet.has(ds)) {
          cell.className += ' has-ev';
        }
    
        var dow = new Date(ds + 'T00:00:00').getDay();
        if (dow === 0 || dow === 6) cell.className += ' we-d';
    
        var num = document.createElement('div');
        num.className = 'd-num';
        num.textContent = dn;
        cell.appendChild(num);
    
        // Event dots
        var dayEvts = [];
        for (var ei = 0; ei < schedules.length; ei++) {
          if (schedules[ei].date === ds) dayEvts.push(schedules[ei]);
        }
        var el = document.createElement('div');
        el.className = 'evs';
        var shown = dayEvts.slice(0, 3);
        for (var si = 0; si < shown.length; si++) {
          var dot = document.createElement('div');
          dot.className = 'ev-dot';
          dot.style.background = evColor(shown[si].title);
          dot.textContent = (shown[si].time ? shown[si].time.slice(0,5) + ' ' : '') + shown[si].title;
          el.appendChild(dot);
        }
        if (dayEvts.length > 3) {
          var more = document.createElement('div');
          more.className = 'ev-dot';
          more.style.background = '#94a3b8';
          more.textContent = '+' + (dayEvts.length - 3) + ' \u66f4\u591a';
          el.appendChild(more);
        }
        cell.appendChild(el);
    
        // Click handler using closure to capture ds
        cell.addEventListener('click', (function(dateStr) {
          return function() { selectDate(dateStr); };
        })(ds));
    
        return cell;
      }
    
      function selectDate(ds) {
        selDate = ds;
        renderCal(cY, cM);
        renderDetail(ds);
        swTab('detail');
      }
    
      function renderDetail(ds) {
        $('_dtt').textContent = fmtFull(ds);
        var dayCount = 0;
        for (var i = 0; i < schedules.length; i++) {
          if (schedules[i].date === ds) dayCount++;
        }
        $('_dts').textContent = '\u5171 ' + dayCount + ' \u4e2a\u65e5\u7a0b';
    
        var el = $('_dl');
        var evts = [];
        for (var i = 0; i < schedules.length; i++) {
          if (schedules[i].date === ds) evts.push(schedules[i]);
        }
        // Sort by time
        evts.sort(function(a, b) { return (a.time || '').localeCompare(b.time || ''); });
    
        if (evts.length === 0) {
          el.innerHTML = '<li style="text-align:center;padding:40px 16px;color:#94a3b8;">\ud83c\udf3f \u8be5\u65e5\u671f\u6682\u65e0\u65e5\u7a0b</li>';
          return;
        }
    
        var h = '';
        for (var i = 0; i < evts.length; i++) {
          var e = evts[i];
          var cls = '';
          if (e.completed) cls += ' done';
          h += '<div class="dc' + cls + '">';
          h += e.time ? '<span class="dbg">' + e.time + '</span>' : '<span class="dbg allday">\u5168\u5929</span>';
          h += '<div class="dct">' + e.title + (e.completed ? ' \u2705' : '') + '</div>';
          h += '<div class="dcm">\ud83d\udd14 ' + nLabel(e.notifyMinutes);
          if (e.desc) h += '<br>\ud83d\udcdc ' + e.desc.replace(/\n/g, '<br>');
          h += '</div>';
          h += '<div class="dca">';
          h += '<button class="db db-ok" onclick="togOk(' + e.id + ')">' + (e.completed ? '\u21a9\ufe0f \u53d6\u6d88\u5b8c\u6210' : '\u2705 \u5b8c\u6210') + '</button>';
          h += '<button class="db db-ed" onclick="opEd(' + e.id + ')">\u270f\ufe0f \u7f16\u8f91</button>';
          h += '<button class="db db-dl" onclick="delEv(' + e.id + ')">\ud83d\uddd1\ufe0f \u5220\u9664</button>';
          h += '</div></div>';
        }
        el.innerHTML = h;
      }
    
      /* TAB SWITCHING */
      window.swTab = function(t) {
        var tabs = document.querySelectorAll('.tab');
        for (var i = 0; i < tabs.length; i++) tabs[i].className = 'tab';
        var pnls = document.querySelectorAll('.pnl');
        for (var i = 0; i < pnls.length; i++) pnls[i].className = 'pnl';
        // Find tab by text content matching
        var tabMap = {'detail': 0, 'add': 1, 'files': 2};
        if (tabMap[t] !== undefined) tabs[tabMap[t]].className = 'tab on';
        var pnlMap = {'detail': '_pd', 'add': '_pa', 'files': '_pf'};
        if (pnlMap[t]) $(pnlMap[t]).className = 'pnl on';
      };
    
      /* NAVIGATION - all use inline onclick, no getElementById needed */
      window.goPrevM = function() {
        var m = cM - 1, y = cY;
        if (m < 0) { m = 11; y--; }
        renderCal(y, m);
      };
      window.goNextM = function() {
        var m = cM + 1, y = cY;
        if (m > 11) { m = 0; y++; }
        renderCal(y, m);
      };
      window.goPrevY = function() { renderCal(cY - 1, cM); };
      window.goNextY = function() { renderCal(cY + 1, cM); };
      window.goToday = function() {
        var n = new Date();
        selectDate(todayStr());
        renderCal(n.getFullYear(), n.getMonth());
      };
    
      /* FORM SUBMIT */
      $('_iD').value = todayStr();
    
      window.doSub = function() {
        var t = $('_iT').value.trim();
        var d = $('_iD').value;
        var tm = $('_iTm').value;
        var n = parseInt($('_iN').value);
        var dc = $('_iDc').value.trim();
        if (!t) { showN('\u8bf7\u8f93\u5165\u6807\u9898', 'al'); return; }
        if (!d) { showN('\u8bf7\u9009\u62e9\u65e5\u671f', 'al'); return; }
        schedules.push({ id: Date.now(), title: t, date: d, time: tm, notifyMinutes: n, desc: dc, completed: false });
        saveData();
        renderCal(cY, cM);
        if (selDate === d) renderDetail(d);
        $('_iT').value = ''; $('_iTm').value = ''; $('_iDc').value = ''; $('_iN').value = '15';
        showN('\u2705 \u300c' + t + '\u300d\u5df2\u6dfb\u52a0\u5230 ' + fmtShort(d), 'ok');
        swTab('detail');
      };
    
      /* QUICK ADD - natural language parse */
      window.doQuick = function() {
        var raw = $('_qi').value.trim();
        if (!raw) return;
        var title = raw.replace(/明天|后天|大后天|今天|下周|这周|本周|上周|上午|下午|晚上|早上|中午|凌晨|\d+[点时:：]\d*\s*(分|分钟)?|\d+\s*(分钟|小时|天)/g, ' ').replace(/\s+/g, ' ').trim() || raw.split(/[，,。；;\s]+/)[0] || raw;
        var date = '', time = '';
        var now = new Date();
    
        // Parse date
        if (/明天/.test(raw)) { var td = new Date(now); td.setDate(td.getDate()+1); date = td.toISOString().split('T')[0]; }
        else if (/后天/.test(raw)) { var td = new Date(now); td.setDate(td.getDate()+2); date = td.toISOString().split('T')[0]; }
        else if (/今天/.test(raw)) date = now.toISOString().split('T')[0];
        else {
          var sd = raw.match(/(\d{1,2})[月\-\/](\d{1,2})/);
          if (sd) {
            var sm = parseInt(sd[1]), sdd = parseInt(sd[2]), sy = now.getFullYear();
            var tt = new Date(sy, sm-1, sdd);
            if (tt < new Date(now.getFullYear(), now.getMonth(), now.getDate())) sy++;
            date = sy + '-' + String(sm).padStart(2,'0') + '-' + String(sdd).padStart(2,'0');
          } else {
            date = now.toISOString().split('T')[0];
          }
        }
    
        // Parse time
        var tmMatch = raw.match(/(\d{1,2})[点时:：](\d{0,2})/);
        if (tmMatch) {
          var h = parseInt(tmMatch[1]), mm = tmMatch[2] ? parseInt(tmMatch[2]) : 0;
          if (/下午|晚上|傍晚|夜里/.test(raw) && h < 12) h += 12;
          if (/上午|早上|凌晨/.test(raw) && h === 12) h = 0;
          time = String(h).padStart(2,'0') + ':' + String(mm).padStart(2,'0');
        } else if (/上午|早上/.test(raw)) time = '09:00';
        else if (/下午/.test(raw)) time = '14:00';
        else if (/晚上/.test(raw)) time = '19:00';
        else if (/中午/.test(raw)) time = '12:00';
    
        schedules.push({ id: Date.now(), title: title, date: date, time: time, notifyMinutes: 15, desc: '', completed: false });
        saveData();
        renderCal(cY, cM);
        $('_qi').value = '';
        showN('\u2705 \u5df2\u521b\u5efa\u300c' + title + '\u300d \ud83d\udcc5 ' + fmtFull(date) + (time ? ' @' + time : ''), 'ok');
        swTab('detail');
        selectDate(date);
      };
    
      /* ACTIONS */
      window.togOk = function(id) {
        for (var i = 0; i < schedules.length; i++) {
          if (schedules[i].id === id) { schedules[i].completed = !schedules[i].completed; break; }
        }
        saveData(); renderCal(cY, cM);
        if (selDate) renderDetail(selDate);
      };
      window.delEv = function(id) {
        var e = null;
        for (var i = 0; i < schedules.length; i++) { if (schedules[i].id === id) { e = schedules[i]; break; } }
        if (e && confirm('\u5220\u9664\u300c' + e.title + '\u300d\uff1f')) {
          schedules = schedules.filter(function(s){ return s.id !== id; });
          saveData(); renderCal(cY, cM);
          if (selDate) renderDetail(selDate);
        }
      };
      window.opEd = function(id) {
        var e = null;
        for (var i = 0; i < schedules.length; i++) { if (schedules[i].id === id) { e = schedules[i]; break; } }
        if (!e) return;
        $('_eid').value = id;
        $('_eT').value = e.title;
        $('_eD').value = e.date;
        $('_eTm').value = e.time || '';
        $('_eN').value = e.notifyMinutes || 0;
        $('_eDc').value = e.desc || '';
        $('_mo').className = 'mo show';
      };
      window.clsEd = function() { $('_mo').className = 'mo'; };
      window.savEd = function() {
        var id = parseInt($('_eid').value);
        var e = null;
        for (var i = 0; i < schedules.length; i++) { if (schedules[i].id === id) { e = schedules[i]; break; } }
        if (!e) return;
        e.title = $('_eT').value.trim();
        e.date = $('_eD').value;
        e.time = $('_eTm').value;
        e.notifyMinutes = parseInt($('_eN').value);
        e.desc = $('_eDc').value.trim();
        saveData(); clsEd(); renderCal(cY, cM);
        if (selDate) renderDetail(selDate);
        showN('\u2705 \u300c' + e.title + '\u300d\u5df2\u66f4\u65b0', 'ok');
      };
    
      /* NOTIFICATIONS */
      window.showN = function(msg, tp) {
        var c = $('_nc');
        var card = document.createElement('div');
        card.className = 'nd ' + (tp || '');
        card.innerHTML = '<button class="nx" onclick="this.parentElement.remove()">&times;</button><strong>' + (tp === 'al' ? '\u26a0\ufe0f \u63d0\u9192' : tp === 'ok' ? '\u2705 \u6210\u529f' : '\u2139\ufe0f \u4fe1\u606f') + '</strong><br>' + msg;
        c.appendChild(card);
        setTimeout(function() { if (card.parentElement) card.remove(); }, 5000);
      };
    
      /* EXPORT / IMPORT */
      window.doExp = function() {
        var b = new Blob([JSON.stringify({schedules: schedules, version: 'v4'}, null, 2)], {type: 'application/json'});
        var a = document.createElement('a');
        a.href = URL.createObjectURL(b);
        a.download = '\u65e7\u7a0b\u5907\u4efd_' + todayStr() + '.json';
        a.click();
      };
      window.doImp = function() {
        var inp = document.createElement('input');
        inp.type = 'file'; inp.accept = '.json';
        inp.onload = function(ev) {
          try {
            var d = JSON.parse(ev.target.result);
            if (d.schedules && confirm('\u5408\u5e76\u6570\u636e\uff1f')) {
              schedules = schedules.concat(d.schedules);
              saveData(); renderCal(cY, cM);
              showN('\u5bfc\u5165\u6210\u529f', 'ok');
            }
          } catch(er) { showN('\u65e0\u6548\u6587\u4ef6', 'al'); }
        };
        inp.onchange = function(ev) {
          var r = new FileReader();
          r.onload = inp.onload;
          r.readAsText(ev.target.files[0]);
        };
        inp.click();
      };
    
      /* TIME UPDATE */
      function updDT() {
        var el = $('_dt');
        if (el) el.textContent = '\ud83d\udd70 ' + new Date().toLocaleDateString('zh-CN', {year:'numeric',month:'long',day:'numeric',weekday:'long',hour:'2-digit',minute:'2-digit'});
      }
      updDT();
      setInterval(updDT, 30000);
    
      /* KEYBOARD SHORTCUTS */
      $('_qi').addEventListener('keydown', function(e) { if (e.key === 'Enter') doQuick(); });
      $('_iT').addEventListener('keydown', function(e) { if (e.key === 'Enter') doSub(); });
    
      /* INIT */
      var initNow = new Date();
      renderCal(initNow.getFullYear(), initNow.getMonth());
      selectDate(todayStr());
    
      return {
        ok: true,
        summary: '\u79d8\u4e66\u65e5\u7a0b v4.0 \u2014 \u7ea2\u8272\u9ad8\u4eae\u5185\u7f6e\u7248\u5df2\u90e8\u7f72',
        total: schedules.length,
        event_dates: Array.from(eventDates())
      };
    }
  );
  if (typeof __tabOriginalFunction !== "function") {
    throw new Error("evaluate_script source must evaluate to a function");
  }
  return await __tabOriginalFunction();
})();