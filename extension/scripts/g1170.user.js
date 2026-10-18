(function() {
  var WIDGET_ID = '__tab_ip_widget__';
  if (document.getElementById(WIDGET_ID)) return;

  async function fetchIP() {
    var apis = [
      'https://api.ipify.org?format=json',
      'https://api64.ipify.org?format=json',
      'https://api.ip.sb/ip',
      'https://ifconfig.me/ip',
    ];
    for (var i = 0; i < apis.length; i++) {
      try {
        var controller = new AbortController();
        var timer = setTimeout(function() { controller.abort(); }, 5000);
        var res = await fetch(apis[i], { signal: controller.signal });
        clearTimeout(timer);
        var text = await res.text();
        var ip = text.trim().replace(/["']/g, '');
        if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip) || /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/.test(ip)) return ip;
      } catch(e) {}
    }
    return null;
  }

  function detectIpType(ip) {
    if (!ip) return 'Unknown';
    if (ip.includes(':')) return 'IPv6';
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return 'IPv4';
    return 'Unknown';
  }

  function createWidget(ip) {
    var isDark = window.matchMedia('(prefers-color-scheme: dark)').matches ||
                 (function() {
                   var bg = getComputedStyle(document.body).backgroundColor;
                   var m = bg.match(/\d+/g);
                   if (m && m.length >= 3)
                     return (0.299 * Number(m[0]) + 0.587 * Number(m[1]) + 0.114 * Number(m[2])) <= 140;
                   return false;
                 })();

    var w = document.createElement('div');
    w.id = WIDGET_ID;
    w.setAttribute('style', [
      'position:fixed','bottom:24px','right:24px','z-index:2147483647',
      isDark ? 'background:rgba(20,20,22,0.95)' : 'background:rgba(255,255,255,0.96)',
      isDark ? 'color:#eee' : '#1a1a1a',
      isDark ? 'border:1px solid rgba(255,255,255,0.15)' : 'border:1px solid rgba(0,0,0,0.10)',
      'padding:14px 22px','border-radius:14px','font-size:15px',
      'font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
      'display:flex','align-items:center','gap:10px',
      'box-shadow:' + (isDark
        ? '0 12px 48px rgba(0,0,0,0.5),0 0 80px rgba(52,211,153,0.08)'
        : '0 12px 48px rgba(0,0,0,0.15),0 0 60px rgba(59,130,246,0.06)'),
      'backdrop-filter:blur(20px)','-webkit-backdrop-filter:blur(20px)',
      'cursor:default','user-select:none'
    ].join(';'));

    // 状态灯
    var dot = document.createElement('span');
    dot.setAttribute('style', [
      'width:10px','height:10px','border-radius:50%',
      'background:' + (ip ? '#34d399' : '#f87171'),
      'flex-shrink:0',
      'box-shadow:0 0 10px ' + (ip ? 'rgba(52,211,153,0.7)' : 'rgba(248,113,113,0.7)')
    ].join(';'));
    w.appendChild(dot);

    // 标签
    var lbl = document.createElement('span');
    lbl.textContent = '公网 IP'; lbl.style.opacity='0.5'; lbl.style.fontSize='12px';
    w.appendChild(lbl);

    // IP值（点击复制）
    var val = document.createElement('span');
    val.textContent = ip || '获取失败';
    val.style.fontWeight='700'; val.style.fontSize='16px';
    val.style.fontFamily='"SF Mono","Fira Code","Cascadia Code",monospace';
    val.style.letterSpacing='0.5px'; val.style.cursor='pointer';
    val.onclick = function() {
      if (!ip) return;
      navigator.clipboard.writeText(ip).then(function() {
        var t = val.textContent; val.textContent = '✓ 已复制'; val.style.color = '#34d399';
        setTimeout(function(){ val.textContent = t; val.style.color = ''; }, 2000);
      }).catch(function(){});
    };
    w.appendChild(val);

    // IPv4/IPv6 类型标签
    if (ip) {
      var type = detectIpType(ip), tc = type === 'IPv6' ? '#a78bfa' : '#60a5fa';
      var tag = document.createElement('span'); tag.textContent = type;
      tag.setAttribute('style', [
        'font-size:11px','padding:2px 8px','border-radius:6px',
        'background:' + tc + '22','color:' + tc,'font-weight:600',
        'border:1px solid ' + tc + '40','flex-shrink:0'
      ].join(';'));
      w.appendChild(tag);
    }

    // 刷新按钮 ↻
    var ref = document.createElement('span'); ref.innerHTML = '↻';
    ref.setAttribute('style', 'cursor:pointer;font-size:16px;opacity:0.45;transition:all 0.25s;flex-shrink:0;padding:4px;border-radius:6px;');
    ref.onmouseenter = function(){ ref.style.opacity='1'; ref.style.background=isDark?'rgba(255,255,255,0.12)':'rgba(0,0,0,0.06)'; };
    ref.onmouseleave = function(){ ref.style.opacity='0.45'; ref.style.background='transparent'; };
    ref.onclick = async function(){
      ref.style.transform='rotate(360deg)'; val.textContent='获取中...';
      dot.style.background='#fbbf24'; dot.style.boxShadow='0 0 10px rgba(251,191,36,0.7)';
      var newIp = await fetchIP();
      if (newIp) { val.textContent=newIp; dot.style.background='#34d399'; dot.style.boxShadow='0 0 10px rgba(52,211,153,0.7)'; ip = newIp; }
      else { val.textContent='获取失败'; dot.style.background='#f87171'; dot.style.boxShadow='0 0 10px rgba(248,113,113,0.7)'; }
      setTimeout(function(){ ref.style.transform=''; }, 450);
    };
    w.appendChild(ref);

    // 关闭按钮 ✕
    var cls = document.createElement('span'); cls.textContent = '✕';
    cls.setAttribute('style', 'margin-left:6px;opacity:0.35;cursor:pointer;font-size:13px;transition:all 0.2s;flex-shrink:0;padding:4px;border-radius:6px;');
    cls.onmouseenter = function(){ cls.style.opacity='0.8'; cls.style.background=isDark?'rgba(255,255,255,0.12)':'rgba(0,0,0,0.06)'; };
    cls.onmouseleave = function(){ cls.style.opacity='0.35'; cls.style.background='transparent'; };

    // 隐藏函数（关闭按钮 + 5秒定时器共用）
    function hideWidget() {
      w.style.transition='opacity 0.4s ease,transform 0.4s ease';
      w.style.opacity='0'; w.style.transform='translateY(12px) scale(0.95)';
      setTimeout(function(){ w.remove(); }, 400);
    }
    cls.onclick = hideWidget;
    w.appendChild(cls);
    document.body.appendChild(w);

    // 入场动画
    w.style.opacity='0'; w.style.transform='translateY(14px) scale(0.95)';
    requestAnimationFrame(function(){
      requestAnimationFrame(function(){
        w.style.transition='opacity 0.5s cubic-bezier(0.4,0,0.2,1),transform 0.5s cubic-bezier(0.34,1.56,0.64,1)';
        w.style.opacity='1'; w.style.transform='translateY(0) scale(1)';
      });
    });

    // ========== ⏱️ 5秒后自动隐藏 ==========
    setTimeout(hideWidget, 5000);

    // 拖拽支持
    var dg=false,sx,sy,ix,iy;
    w.addEventListener('mousedown', function(e){
      if (e.target===cls||e.target===val||e.target===ref||(tag&&e.target===tag)) return;
      dg=true; sx=e.clientX; sy=e.clientY; ix=w.offsetLeft; iy=w.offsetTop;
      w.style.cursor='grabbing'; w.style.transition='box-shadow 0.2s';
      w.style.boxShadow=isDark?'0 20px 56px rgba(0,0,0,0.65)':'0 20px 56px rgba(0,0,0,0.22)';
      e.preventDefault();
    });
    document.addEventListener('mousemove', function(e){
      if(!dg)return;
      w.style.left=Math.max(0,Math.min(window.innerWidth-w.offsetWidth,ix+e.clientX-sx))+'px';
      w.style.top=Math.max(0,Math.min(window.innerHeight-w.offsetHeight,iy+e.clientY-sy))+'px';
      w.style.right='auto';w.style.bottom='auto';
    });
    document.addEventListener('mouseup', function(){
      if(!dg)return; dg=false; w.style.cursor='default';
      w.style.transition='opacity 0.4s ease,transform 0.4s ease,box-shadow 0.3s ease';
      w.style.boxShadow=isDark?'0 12px 48px rgba(0,0,0,0.5),0 0 80px rgba(52,211,153,0.08)':'0 12px 48px rgba(0,0,0,0.15),0 0 60px rgba(59,130,246,0.06)';
    });
  }

  async function init() {
    var ip = await fetchIP();
    createWidget(ip);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();