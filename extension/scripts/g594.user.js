(async function __tabEvaluateScriptBridge() {
  const __tabScriptArgs = null;
  const __tabOriginalFunction = (
    /**
     * iOS 26 Liquid Glass LITE - 执行版本
     */
    function applyIOS26LiquidGlassLite(args) {
      'use strict';
    
      var STYLE_ID = 'ios26-glass-lite';
      if (document.getElementById(STYLE_ID)) {
        window.removeIOS26GlassLite && window.removeIOS26GlassLite();
      }
    
      var css = [
        '.ios26-lite-active {',
        '  background: linear-gradient(135deg, #667eea, #764ba2, #f093fb, #4facfe, #00f2fe) !important;',
        '  background-size: 400% 400% !important;',
        '  animation: ios26-lite-bg 15s ease infinite !important;',
        '  min-height: 100vh !important;',
        '}',
        '@keyframes ios26-lite-bg { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }',
        '.ios26-lite-glass {',
        '  background: rgba(255,255,255,0.14) !important;',
        '  backdrop-filter: blur(20px) saturate(160%) !important;',
        '  -webkit-backdrop-filter: blur(20px) saturate(160%) !important;',
        '  border-radius: 16px !important;',
        '  border: 1px solid rgba(255,255,255,0.25) !important;',
        '  box-shadow: 0 6px 24px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.35) !important;',
        '  transition: transform 0.2s ease, box-shadow 0.2s ease !important;',
        '}',
        '.ios26-lite-glass::before { content:""; position:absolute; top:0; left:0; right:0; height:40%; background:linear-gradient(180deg,rgba(255,255,255,0.30),transparent); pointer-events:none; border-radius:16px 16px 0 0; }',
        '.ios26-lite-glass:hover { background:rgba(255,255,255,0.20)!important; box-shadow:0 8px 32px rgba(0,0,0,0.12),inset 0 1px 0 rgba(255,255,255,0.50)!important; transform:translateY(-1px); }',
        '.ios26-lite-glass,.ios26-lite-glass * { color:rgba(0,0,0,0.82)!important; text-shadow:0 1px 1px rgba(255,255,255,0.25)!important; }',
        '.ios26-lite-nav { background:rgba(255,255,255,0.10)!important; backdrop-filter:blur(24px)saturate(180%)!important; -webkit-backdrop-filter:blur(24px)saturate(180%)!important; border-bottom:1px solid rgba(255,255,255,0.15)!important; box-shadow:0 2px 16px rgba(0,0,0,0.06)!important; }',
        '.ios26-lite-glass button,.ios26-lite-glass [role="button"],.ios26-lite-glass input[type="submit"],.ios26-lite-glass input[type="button"] { background:rgba(255,255,255,0.22)!important; backdrop-filter:blur(8px)!important; -webkit-backdrop-filter:blur(8px)!important; border:1px solid rgba(255,255,255,0.30)!important; border-radius:10px!important; padding:8px 16px!important; cursor:pointer; }',
        '.ios26-lite-glass button:hover { background:rgba(255,255,255,0.32)!important; transform:scale(1.03); }',
        '.ios26-lite-glass input:not([type="submit"]):not([type="button"]),.ios26-lite-glass textarea,.ios26-lite-glass select { background:rgba(255,255,255,0.18)!important; border:1px solid rgba(255,255,255,0.28)!important; border-radius:8px!important; outline:none; }',
        '.ios26-lite-glass::-webkit-scrollbar{width:6px;height:6px} .ios26-lite-glass::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.28);border-radius:3px}',
        '@media(prefers-reduced-motion:reduce){.ios26-lite-active{animation:none!important}.ios26-lite-glass{transition:none!important}}'
      ].join('\n');
    
      var style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = css;
      document.head.appendChild(style);
    
      var SEL = 'main,article,section,aside,[class*="card"],[class*="panel"],[class*="modal"],[class*="container"],[class*="wrapper"],[class*="content"],[class*="box"],[class*="sidebar"],nav,header,[class*="nav"],[class*="header"],[class*="toolbar"],[class*="Card"],[class*="Panel"]';
      var NAV_SEL = 'nav,header,[role="navigation"],[role="banner"]';
      var count = 0;
    
      try {
        var nodes = document.querySelectorAll(SEL);
        for (var i = 0; i < nodes.length; i++) {
          if (nodes[i].offsetWidth < 40 || nodes[i].offsetHeight < 40) continue;
          if (nodes[i].closest('.ios26-lite-glass')) continue;
          nodes[i].classList.add('ios26-lite-glass');
          count++;
        }
      } catch(e){}
    
      try {
        var navs = document.querySelectorAll(NAV_SEL);
        for (var j = 0; j < navs.length; j++) {
          if (navs[j].offsetWidth < 40 || navs[j].offsetHeight < 40) continue;
          navs[j].classList.add('ios26-lite-nav');
          count++;
        }
      } catch(e){}
    
      document.body.classList.add('ios26-lite-active');
    
      window.removeIOS26GlassLite = function() {
        document.body.classList.remove('ios26-lite-active');
        document.querySelectorAll('.ios26-lite-glass,.ios26-lite-nav').forEach(function(el){
          el.classList.remove('ios26-lite-glass','ios26-lite-nav');
        });
        var s = document.getElementById(STYLE_ID); if(s) s.remove();
      };
    
      return { ok: true, summary: 'iOS 26 Glass Lite applied', convertedCount: count, mode: 'lite' };
    }
  );
  if (typeof __tabOriginalFunction !== "function") {
    throw new Error("evaluate_script source must evaluate to a function");
  }
  return await __tabOriginalFunction();
})();