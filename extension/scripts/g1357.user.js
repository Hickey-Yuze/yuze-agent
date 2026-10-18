function hitokotoNewTab(args) {
  (async function() {
    'use strict';

    var CONFIG = {
      apiUrl: 'https://v1.hitokoto.cn/',
      bingSearchUrl: 'https://cn.bing.com/search?q='
    };

    var container = null;
    var textEl = null;
    var btnBar = null;
    var currentQuote = '';
    var currentFrom = '';
    var currentUuid = '';
    var isLoading = false;

    /* 清理旧实例 */
    var existing = document.getElementById('hitokoto-limestart');
    if (existing) { existing.remove(); }

    /* SVG 图标 */
    var ICONS = {
      link: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>',
      copy: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>',
      search: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>'
    };

    /* 检测背景深浅 */
    function detectBgBrightness() {
      try {
        var el = document.body, cs = window.getComputedStyle(el), bg = cs.backgroundColor || '';
        var m = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (m) return (0.299*parseInt(m[1]) + 0.587*parseInt(m[2]) + 0.114*parseInt(m[3])) / 255 < 0.5;
        var h = document.documentElement, hc = window.getComputedStyle(h), hb = hc.backgroundColor;
        var m2 = hb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (m2) return (0.299*parseInt(m2[1]) + 0.587*parseInt(m2[2]) + 0.114*parseInt(m2[3])) / 255 < 0.5;
        return true;
      } catch(e) { return true; }
    }
    var isDark = detectBgBrightness();

    /* 主题色 */
    var t = isDark ? {
      tc: 'rgba(255,255,255,0.72)', thc: 'rgba(255,255,255,0.95)',
      bb: 'rgba(255,255,255,0.11)', bhb: 'rgba(255,255,255,0.24)',
      bs: 'rgba(255,255,255,0.16)', btc: '#fff', sh: 'rgba(0,0,0,0.3)',
      ts: '0 1px 3px rgba(0,0,0,0.3)'
    } : {
      tc: 'rgba(40,44,52,0.62)', thc: 'rgba(20,24,32,0.9)',
      bb: 'rgba(0,0,0,0.05)', bhb: 'rgba(0,0,0,0.12)',
      bs: 'rgba(0,0,0,0.08)', btc: '#333', sh: 'rgba(0,0,0,0.1)',
      ts: 'none'
    };

    /* 创建 DOM —— 默认非悬停样式 + pointer-events:none 屏蔽鼠标事件 */
    container = document.createElement('div');
    container.id = 'hitokoto-limestart';
    container.setAttribute('role', 'status');
    container.innerHTML =
      '<span id="hk-text">正在获取一言...</span>' +
      '<div id="hk-btns" style="display:none;margin-top:10px;gap:10px;justify-content:center;" class="hk-flex">' +
        '<a id="hk-bl" class="hk-b" target="_blank" rel="noopener" title="查看原文">' + ICONS.link + '</a>' +
        '<button id="hk-bc" class="hk-b" title="复制句子">' + ICONS.copy + '</button>' +
        '<a id="hk-bs" class="hk-b" target="_blank" rel="noopener" title="必应搜索">' + ICONS.search + '</a>' +
      '</div>';

    Object.assign(container.style, {
      position: 'fixed', top: '18px', left: '50%', transform: 'translateX(-50%)',
      zIndex: '2147483647',
      fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif',
      fontSize: '15px', lineHeight: '1.8', color: t.tc,
      textAlign: 'center', maxWidth: '680px', width: '90vw',
      padding: '10px 24px', cursor: 'default', letterSpacing: '0.5px',
      textShadow: t.ts, transition: 'color 0.35s ease',
      userSelect: 'none', webkitUserSelect: 'none',
      pointerEvents: 'none'   /* ★ v7 核心：初始屏蔽所有鼠标事件 */
    });

    document.body.appendChild(container);
    textEl = document.getElementById('hk-text');
    btnBar = document.getElementById('hk-btns');

    /* flex 样式 */
    var flexStyle = document.createElement('style');
    flexStyle.textContent = '.hk-flex{display:flex!important;}';
    document.head.appendChild(flexStyle);

    /* 按钮样式 */
    var baseBtnStyle = {
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: '34px', height: '34px', padding: '0',
      border: '1px solid ' + t.bs, borderRadius: '8px',
      background: t.bb, color: t.btc, cursor: 'pointer', textDecoration: 'none',
      backdropFilter: 'blur(14px) saturate(1.4)',
      WebkitBackdropFilter: 'blur(14px) saturate(1.4)',
      transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      transform: 'scale(1) translateY(0)', boxShadow: 'none', opacity: '1'
    };
    var allBtns = container.querySelectorAll('.hk-b');
    for (var bi = 0; bi < allBtns.length; bi++) {
      Object.assign(allBtns[bi].style, baseBtnStyle);
    }

    /* 悬停交互 */
    var hoverT = null;
    container.addEventListener('mouseenter', function() {
      container.style.color = t.thc;
      clearTimeout(hoverT);
      hoverT = setTimeout(function() {
        if (btnBar) {
          btnBar.style.display = 'flex';
          var b = btnBar.querySelectorAll('.hk-b');
          for (var i = 0; i < b.length; i++) {
            (function(idx, el) {
              el.style.opacity = '0'; el.style.transform = 'scale(0.6) translateY(8px)';
              requestAnimationFrame(function() {
                requestAnimationFrame(function() {
                  el.style.transitionDelay = (idx * 60) + 'ms';
                  el.style.opacity = '1'; el.style.transform = 'scale(1) translateY(0)';
                });
              });
            })(i, b[i]);
          }
        }
      }, 280);
    });

    container.addEventListener('mouseleave', function() {
      container.style.color = t.tc; clearTimeout(hoverT);
      if (btnBar) {
        var b = btnBar.querySelectorAll('.hk-b');
        for (var i = 0; i < b.length; i++) {
          b[i].style.transitionDelay = '0ms'; b[i].style.opacity = '0';
          b[i].style.transform = 'scale(0.6) translateY(-4px)';
        }
        setTimeout(function(){ if(btnBar) btnBar.style.display='none'; }, 200);
      }
    });

    container.addEventListener('mouseover', function(e) {
      if (e.target.classList && e.target.classList.contains('hk-b')) {
        e.target.style.background = t.bhb;
        e.target.style.transform = 'scale(1.1) translateY(-2px)';
        e.target.style.boxShadow = '0 4px 16px ' + t.sh;
        e.target.style.borderColor = t.bs;
      }
    });
    container.addEventListener('mouseout', function(e) {
      if (e.target.classList && e.target.classList.contains('hk-b')) {
        e.target.style.background = t.bb;
        e.target.style.transform = 'scale(1) translateY(0)';
        e.target.style.boxShadow = 'none';
      }
    });

    /* 按钮事件 */
    document.getElementById('hk-bc').addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation(); doCopy();
    });
    textEl.addEventListener('click', doFetch);

    /* 工具函数 */
    function randCat() {
      var c = ['a','b','c','d','e','f','g','h','i','k'];
      return c[Math.floor(Math.random()*c.length)];
    }
    function sl(ms) { return new Promise(function(r){setTimeout(r,ms);}); }

    async function doCopy() {
      if (!currentQuote) return;
      var copyText = '\u300C' + currentQuote + '\u300D';
      if (currentFrom) copyText += ' \u2014\u2014《' + currentFrom + '》';
      try {
        await navigator.clipboard.writeText(copyText);
        var btn = document.getElementById('hk-bc'), orig = btn.innerHTML;
        btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
        btn.style.color = '#4ade80'; btn.style.borderColor = 'rgba(74,222,128,0.4)';
        setTimeout(function(){ btn.innerHTML=orig; btn.style.color=t.btc; btn.style.borderColor=t.bs; }, 1400);
      } catch(x) {
        var ta=document.createElement('textarea'); ta.value=currentQuote;
        document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); document.body.removeChild(ta);
      }
    }

    function updateUrls() {
      var lb = document.getElementById('hk-bl');
      if (lb && currentUuid) lb.href = 'https://hitokoto.cn?uuid=' + currentUuid;
      else if (lb) lb.href = 'https://hitokoto.cn';
      var sb = document.getElementById('hk-bs');
      if (sb && currentQuote) sb.href = CONFIG.bingSearchUrl + encodeURIComponent(currentQuote);
    }

    async function doFetch() {
      if (isLoading) return; isLoading = true;
      if (textEl) { textEl.style.opacity='0.35'; textEl.textContent='加载中...'; }
      try {
        var r = await fetch(CONFIG.apiUrl+'?c='+randCat());
        if (!r.ok) throw new Error(''+r.status);
        var d = await r.json();
        currentQuote = d.hitokoto||''; currentFrom = d.from||''; currentUuid = d.uuid||'';
        var s = '\u300C'+currentQuote+'\u300D';
        if (currentFrom) s += ' \u2014\u2014《'+currentFrom+'》';
        if (textEl) { await sl(120); textEl.textContent=s; textEl.style.opacity='1'; }
        updateUrls();
      } catch(err) {
        console.error('[一言]',err);
        if (textEl){ textEl.textContent='一言走丢了 · 点击重试'; textEl.style.opacity='1'; }
      } finally { isLoading=false; }
    }

    /* 获取一言 */
    doFetch();

    /* ★★★ v7 核心：500ms 后恢复鼠标交互 ★★★ */
    setTimeout(function() {
      if (container) container.style.pointerEvents = 'auto';
    }, 500);

    /* 暴露控制接口 */
    window.__hitokotoInstance = {
      refresh: doFetch,
      getQuote: function(){ return{text:currentQuote,from:currentFrom,uuid:currentUuid}; },
      close: function(){ if(container){container.remove();container=null;} window.__hitokotoInstance=null; }
    };

  })();

  return { status:'ok', message:'一言 v7 已注入', control:'window.__hitokotoInstance' };
}

/* 自执行调用（技炉"使用"需要这行） */
hitokotoNewTab(typeof args !== 'undefined' ? args : {});