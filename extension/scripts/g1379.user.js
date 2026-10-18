async function run(args) {
  var C = { gap: 400, w: 40 };
  var S = {
    bg:'rgba(15,23,42,0.6)', sf:'rgba(255,255,255,0.95)',
    bd:'rgba(148,163,184,0.25)', p:'#6366f1', ph:'#4f46e5',
    pl:'#e0e7ff', t:'#1e293b', t2:'#64748b', tm:'#94a3b8',
    ok:'#10b981', er:'#ef4444', pb:'#e2e8f0',
    sp:'0 25px 50px -12px rgba(0,0,0,0.25),0 0 0 1px rgba(148,163,184,0.12)',
    sb:'0 2px 8px rgba(99,102,241,0.25)',
    si:'inset 0 1px 3px rgba(0,0,0,0.08)'
  };
  var chs = [];
  var dl = false;
  var ac = null;
  var pnl = null;

  function findChapters() {
    var r = [];
    var as = document.querySelectorAll('a[href]');
    for (var i = 0; i < as.length; i++) {
      var h = as[i].getAttribute('href');
      var t = as[i].textContent.trim();
      if (!h || !t || t.length < 2) continue;
      if (t.indexOf('\u4E0A\u4E00\u7AE0') >= 0) continue;
      if (t.indexOf('\u4E0B\u4E00\u7AE0') >= 0) continue;
      if (t.indexOf('\u66F4\u65B0\u5217\u8868') >= 0) continue;
      if (t.indexOf('SoDu') >= 0) continue;
      if (t.indexOf('\u70B9\u51FB\u6392\u884C') >= 0) continue;
      if (t.indexOf('\u6700\u8FD1\u66F4\u65B0') >= 0) continue;
      if (t.indexOf('\u770B\u8FC7\u7684\u4E66') >= 0) continue;
      if (t.indexOf('\u767B\u9646') >= 0) continue;
      if (t.indexOf('\u6CE8\u518C') >= 0) continue;
      if (t.indexOf('\u8BBE\u4E3A\u684C\u9762') >= 0) continue;
      if (t.indexOf('\u52A0\u5165\u6536\u85CF') >= 0) continue;
      if (t.indexOf('\u5185\u5BB9\u7B80\u4ECB') >= 0) continue;
      if (!/\u7B2C.*\u7AE0|\u7B2C[\u4E00\u4E8C\u4E09\u56DB\u4E95\u516D\u4E03\u516B\u4E5D\u5341\u767E\u5343\u96F6\d]+\u7AE0/.test(t)) continue;
      var u = h.indexOf('http') === 0 ? h : new URL(h, location.origin).href;
      r.push({ n: r.length + 1, t: t, u: u });
    }
    return r;
  }

  async function getChapter(url, sig, knownTitle) {
    var m = url.match(/mulu_(\d+)\/(\d+)\.html/);
    if (!m) throw new Error('bad url: ' + url);
    var bid = m[1], cid = m[2];
    var api = location.origin + '/novelsearch/chapter/transcode.html';
    var body = 'bid=' + encodeURIComponent(bid) + '&cid=' + encodeURIComponent(cid) + '&siteid=0&url=';
    var rs = await fetch(api, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body,
      credentials: 'include',
      signal: sig
    });
    if (!rs.ok) throw new Error('http ' + rs.status);
    var j = await rs.json();
    if (!j || !j.info) throw new Error('api returned no info');
    var d = document.createElement('div');
    d.innerHTML = j.info;

    // FIX: Use directory page chapter name as primary title.
    // Transcode API returns only <br>+text, NO heading elements at all.
    var title = knownTitle || '';
    if (!title) {
      var ts = d.querySelectorAll('h1,h2,h3,[class*="title"],.bookname');
      for (var x = 0; x < ts.length; x++) {
        var v = ts[x].textContent.trim();
        if (v.length > 5 && v.length < 100) { title = v; break; }
      }
    }

    var ps = [];
    var ce = d.querySelector('#chaptercontent,#content,.content,[class*="content"]');
    if (ce) ps = getTxt(ce);
    if (ps.length < 3) ps = getTxt(d);

    var skip = [
      '\u4E0A\u4E00\u7AE0','\u4E0B\u4E00\u7AE0','\u52A0\u5165\u4E66\u7B7E',
      '\u66F4\u65B0\u5217\u8868','\u5207\u6362\u6E90','\u5173\u4E8E\u6211\u4EEC',
      '\u514D\u8D23\u58F0\u660E','\u9690\u79C1\u6761\u6B3E','\u8718\u86DB\u534F\u8BAE',
      '\u7533\u8BF7\u6536\u5F55','\u8054\u7CFB\u6211\u4EEC','Sitemap','Copyright',
      '\u672C\uAD6D\u5185\u5BB9\u7CFB','\u6B63\u5728\u8F6C\u7801',
      'so()','read2()','read3()','read4()','lastre','tj()',
      '$.post','$.get','$function'
    ];
    ps = ps.filter(function(p) {
      if (p.length < 4) return false;
      for (var k = 0; k < skip.length; k++) {
        if (p.indexOf(skip[k]) >= 0) return false;
      }
      return true;
    });
    return { ti: title, ps: ps, u: url };
  }

  function getTxt(root) {
    var r = [];
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    while (w.nextNode()) {
      var t = w.currentNode.textContent.trim();
      if (t.length > 2) r.push(t);
    }
    return r;
  }

  function mkTxt(arr) {
    var ls = [
      '======================================================',
      '  Novel Chapter Downloader',
      '  Generated: ' + new Date().toLocaleString('zh-CN'),
      '======================================================',
      ''
    ];
    for (var di = 0; di < arr.length; di++) {
      var ch = arr[di];
      ls.push('');
      ls.push('[ ' + ch.ti + ' ]');
      ls.push('------------------------------------------------------');
      ls.push('');
      for (var pi = 0; pi < ch.ps.length; pi++) {
        var p = ch.ps[pi];
        if (p.length <= C.w) {
          ls.push(p);
        } else {
          var rest = p;
          while (rest.length > 0) {
            if (rest.length <= C.w) { ls.push(rest); break; }
            var bp = C.w;
            for (var ci = C.w; ci >= Math.max(C.w - 10, 0); ci--) {
              var c2 = rest.charAt(ci);
              if (/[, \uff0c\u3002\uff01\uff1f\u3001\uff1b\uff1a\u201c\u201d\u2018\u2019\uff08\uff09\u3010\u3011]/.test(c2)) {
                bp = ci + 1;
                break;
              }
            }
            ls.push(rest.substring(0, bp));
            rest = rest.substring(bp);
          }
        }
        ls.push('');
      }
    }
    return ls.join('\n');
  }

  function dlFile(txt, fn) {
    var b = new Blob(['\uFEFF' + txt], { type: 'text/plain;charset=utf-8' });
    var u = URL.createObjectURL(b);
    var a = document.createElement('a');
    a.href = u;
    a.download = fn;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(function() { URL.revokeObjectURL(u); a.remove(); }, 1000);
  }

  function ss(el, s) {
    for (var k in s) el.style[k] = s[k];
  }

  function buildUI() {
    var old = document.getElementById('_ndl_');
    if (old) old.remove();
    var ob = document.getElementById('_ndb_');
    if (ob) ob.remove();

    var bg = document.createElement('div');
    bg.id = '_ndb_';
    ss(bg, {
      position:'fixed', inset:'0', zIndex:'999998',
      background:S.bg, backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)',
      opacity:'0', transition:'opacity 250ms ease'
    });

    pnl = document.createElement('div');
    pnl.id = '_ndl_';
    ss(pnl, {
      position:'fixed', top:'50%', left:'50%',
      transform:'translate(-50%,-50%) scale(0.96)', zIndex:'999999',
      width:'min(520px,92vw)', maxHeight:'85vh',
      background:S.sf, borderRadius:'16px', boxShadow:S.sp,
      border:'1px solid '+S.bd,
      fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif',
      overflow:'hidden', display:'flex', flexDirection:'column',
      opacity:'0', transition:'opacity 250ms ease,transform 350ms ease'
    });

    var h = '';
    h += '<div style="padding:20px 24px 16px;border-bottom:1px solid '+S.bd+';display:flex;align-items:center;justify-content:space-between;">';
    h += '<div><span style="font-size:22px;">&#128214;</span>';
    h += '<strong style="margin-left:10px;font-size:17px;color:'+S.t+';">Novel Downloader</strong></div>';
    h += '<button id="_ndc_" style="width:32px;height:32px;border:none;background:transparent;border-radius:50%;cursor:pointer;font-size:18px;color:'+S.tm+';">&#10005;</button></div>';

    h += '<div style="padding:20px 24px;flex:1;overflow-y:auto;">';

    h += '<div style="padding:14px 16px;background:'+S.pl+';border-radius:12px;margin-bottom:18px;">';
    h += '<div style="font-size:12px;color:'+S.p+';font-weight:600;">DETECTED NOVEL</div>';
    h += '<div id="_ndbt_" style="font-size:14px;font-weight:600;color:'+S.t+';">...</div>';
    h += '<div id="_ndcc_" style="font-size:12px;color:'+S.t2+';"></div></div>';

    h += '<div style="margin-bottom:18px;"><label style="display:block;font-size:13px;font-weight:600;color:'+S.t+';margin-bottom:8px;">Chapter Range</label>';
    h += '<div style="display:flex;gap:10px;"><div style="flex:1;"><div style="font-size:11px;color:'+S.tm+';margin-bottom:4px;">From</div>';
    h += '<select id="_nds_" style="width:100%;padding:9px 12px;border:1px solid '+S.bd+';border-radius:8px;background:#fff;color:'+S.t+';font-size:13px;box-shadow:'+S.si+';outline:none;"></select></div>';
    h += '<span style="color:'+S.tm+';padding-top:18px;">&rarr;</span>';
    h += '<div style="flex:1;"><div style="font-size:11px;color:'+S.tm+';margin-bottom:4px;">To</div>';
    h += '<select id="_nde_" style="width:100%;padding:9px 12px;border:1px solid '+S.bd+';border-radius:8px;background:#fff;color:'+S.t+';font-size:13px;box-shadow:'+S.si+';outline:none;"></select></div></div></div>';

    h += '<div id="_ndp_" style="display:none;margin-bottom:18px;">';
    h += '<div style="display:flex;justify-content:space-between;margin-bottom:6px;">';
    h += '<span id="_nds_t" style="font-size:12px;color:'+S.t2+';">Ready</span>';
    h += '<span id="_ndpct" style="font-size:12px;font-weight:700;color:'+S.p+';">0%</span></div>';
    h += '<div style="height:6px;background:'+S.pb+';border-radius:3px;overflow:hidden;">';
    h += '<div id="_ndbar" style="height:100%;width:0%;background:linear-gradient(90deg,'+S.p+',#818cf8);border-radius:3px;transition:width 250ms ease;"></div></div>';
    h += '<div id="_ndcur" style="font-size:11px;color:'+S.tm+';margin-top:4px;"></div></div>';

    h += '<div style="display:flex;gap:10px;">';
    h += '<button id="_nddl" style="flex:1;padding:12px 20px;border:none;border-radius:10px;background:'+S.p+';color:#fff;font-size:14px;font-weight:600;cursor:pointer;box-shadow:'+S.sb+';">&#11015; Download</button>';
    h += '<button id="_ndx" style="display:none;padding:12px 20px;border:1px solid '+S.er+';border-radius:10px;background:transparent;color:'+S.er+';font-size:14px;font-weight:600;cursor:pointer;">Cancel</button></div></div>';

    h += '<div style="padding:12px 24px;border-top:1px solid '+S.bd+';font-size:11px;color:'+S.tm+';text-align:center;">Transcode API extraction &middot; Yuze v5</div>';

    pnl.innerHTML = h;
    document.body.appendChild(bg);
    document.body.appendChild(pnl);

    pnl.querySelector('#_ndc_').onclick = closeUI;
    bg.onclick = closeUI;

    requestAnimationFrame(function() {
      bg.style.opacity = '1';
      pnl.style.opacity = '1';
      pnl.style.transform = 'translate(-50%,-50%) scale(1)';
    });

    return pnl;
  }

  function fillUI() {
    var bn = document.title.replace(/ - .*$/, '').replace(/^\u6700\u4F73\u6765\u6E90 /, '').trim();
    pnl.querySelector('#_ndbt_').textContent = bn || 'Novel';
    pnl.querySelector('#_ndcc_').textContent = chs.length + ' chapters found';

    var ss1 = pnl.querySelector('#_nds_');
    var es1 = pnl.querySelector('#_nde_');
    for (var i = 0; i < chs.length; i++) {
      var lb = chs[i].n + '. ' + chs[i].t.substring(0, 30);
      if (chs[i].t.length > 30) lb += '..';
      ss1.options.add(new Option(lb, i));
      es1.options.add(new Option(lb, i));
    }
    if (chs.length > 10) {
      ss1.value = chs.length - 10;
      es1.value = chs.length - 1;
    } else {
      es1.value = chs.length - 1;
    }

    pnl.querySelector('#_nddl').onclick = doDL;
    pnl.querySelector('#_ndx').onclick = doCancel;

    [ss1, es1].forEach(function(sel) {
      sel.addEventListener('focus', function() {
        sel.style.borderColor = S.p;
        sel.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15),' + S.si;
      });
      sel.addEventListener('blur', function() {
        sel.style.borderColor = S.bd;
        sel.style.boxShadow = S.si;
      });
    });
  }

  function closeUI() {
    if (ac) { ac.abort(); ac = null; }
    dl = false;
    var p = document.getElementById('_ndl_');
    var b = document.getElementById('_ndb_');
    if (p) { p.style.opacity = '0'; setTimeout(function() { if (p.parentNode) p.parentNode.removeChild(p); }, 250); }
    if (b) { b.style.opacity = '0'; setTimeout(function() { if (b.parentNode) b.parentNode.removeChild(b); }, 250); }
  }

  async function doDL() {
    if (dl) return;
    dl = true;
    ac = new AbortController();

    var si = parseInt(pnl.querySelector('#_nds_').value);
    var ei = parseInt(pnl.querySelector('#_nde_').value);
    var sel = chs.slice(Math.min(si, ei), Math.max(si, ei) + 1);

    if (sel.length === 0) {
      alert('Select chapters');
      dl = false;
      return;
    }

    pnl.querySelector('#_ndp_').style.display = 'block';
    pnl.querySelector('#_nddl').style.display = 'none';
    pnl.querySelector('#_ndx').style.display = 'block';

    var stEl = pnl.querySelector('#_nds_t');
    var pc = pnl.querySelector('#_ndpct');
    var bar = pnl.querySelector('#_ndbar');
    var cur = pnl.querySelector('#_ndcur');

    var res = [];
    var ok = 0;
    var err = 0;

    for (var i = 0; i < sel.length; i++) {
      if (ac.signal.aborted) break;
      var c = sel[i];
      var pct = Math.round((i / sel.length) * 100);
      stEl.textContent = 'Downloading (' + (i + 1) + '/' + sel.length + ')...';
      pc.textContent = pct + '%';
      bar.style.width = pct + '%';
      cur.textContent = c.t;

      try {
        // FIX: Pass c.t (directory page chapter name) as 3rd argument
        var d = await getChapter(c.u, ac.signal, c.t);
        res.push(d);
        ok++;
        var np = Math.round(((i + 1) / sel.length) * 100);
        pc.textContent = np + '%';
        bar.style.width = np + '%';
        if (i < sel.length - 1) {
          await new Promise(function(r) { setTimeout(r, C.gap); });
        }
      } catch (e) {
        console.warn('[FAIL] ' + c.t + ': ' + e.message);
        res.push({ ti: c.t, ps: ['[Error: ' + e.message + ']'], u: c.u });
        err++;
      }
    }

    if (res.length > 0) {
      stEl.textContent = 'Generating...';
      pc.textContent = '100%';
      bar.style.width = '100%';

      var txt = mkTxt(res);
      var sn = (document.title.match(/^(.+?)(?:[\(\uFF08]|$)/) || ['Novel'])[1]
        .replace(/[<>:"/\\|?*]/g, '_').substring(0, 30);
      dlFile(txt, sn + '_Ch' + sel[0].n + '-' + sel[sel.length - 1].n + '.txt');

      stEl.textContent = 'Done! ' + ok + ' OK' + (err > 0 ? ', ' + err + ' fail' : '');
      stEl.style.color = S.ok;
    } else {
      stEl.textContent = 'No content downloaded';
      stEl.style.color = S.er;
    }

    dl = false;
    ac = null;
    pnl.querySelector('#_nddl').style.display = 'flex';
    pnl.querySelector('#_ndx').style.display = 'none';
  }

  function doCancel() {
    if (ac) ac.abort();
    dl = false;
    pnl.querySelector('#_nds_t').textContent = 'Cancelled';
    pnl.querySelector('#_nddl').style.display = 'flex';
    pnl.querySelector('#_ndx').style.display = 'none';
  }

  /* MAIN */
  chs = findChapters();
  if (chs.length === 0) {
    alert('No chapters found on this page.');
    return { ok: false, summary: 'no chapters', data: { n: 0 } };
  }

  buildUI();
  fillUI();

  return {
    ok: true,
    summary: 'Downloader v5 ready - ' + chs.length + ' chapters (FIXED: titles from dir page)',
    data: {
      n: chs.length,
      fst: chs[0] ? chs[0].t : '',
      lst: chs[chs.length - 1] ? chs[chs.length - 1].t : ''
    }
  };
}