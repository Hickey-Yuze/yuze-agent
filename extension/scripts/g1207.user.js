(function () {
  'use strict';

  if (window.__tbCursorPackLoaded) return;
  window.__tbCursorPackLoaded = true;

  var NS = 'tb-';

  function cssIn(css, id) {
    var old = document.getElementById(id); if (old) old.remove();
    var s = document.createElement('style'); s.id = id; s.textContent = css;
    document.head.appendChild(s);
  }
  function cssOut(id) { var el = document.getElementById(id); if (el) el.remove(); }

  var rippleMaxR = 120, rippleDuration = 1100;
  var magnetRadius = 80, magnetStrength = 0.38;
  var lightningDepth = 4, lightningDuration = 240;
  var ringCount = 3, ringBaseRadius = 28, ringSpeed = 1.2;

  var ITEMS = [
    { cls: 'ext-ripple',    sub: 'ripple',    label: '🌊 流体涟漪 ',  desc: '点击时产生多圈彩色水波纹扩散。可在⚙设置波纹大小与持续时间。',                    hasSettings: true  },
    { cls: 'ext-magnet',    sub: 'magnet',    label: '🔮 磁场光标 ',  desc: '隐藏系统光标，注入自定义光标，靠近可交互元素时产生磁场吸附效果。可在⚙设置吸附范围与强度。', hasSettings: true  },
    { cls: 'ext-lightning', sub: 'lightning', label: '⚡ 电弧闪电 ',  desc: '点击时从光标位置生成分形闪电向下延伸。可在⚙设置分支复杂度与持续时间。',             hasSettings: true  },
    { cls: 'ext-dissolve',  sub: 'dissolve',  label: '🌿 文字溶解 ',  desc: '鼠标悬停文字元素时，字符缓慢飞散，离开时缓慢归位。仅对纯文字段落生效。',             hasSettings: false },
    { cls: 'ext-diffusion', sub: 'diffusion', label: '🎨 色彩渗透 ',  desc: '鼠标移动时在光标处产生彩色光晕渐变，颜色随时间缓慢变化。',                        hasSettings: false },
    { cls: 'ext-ring',      sub: 'ring',      label: '🌀 螺旋光环 ',  desc: '光标周围多圈旋转光环，每圈速度与半径不同，点击时爆炸扩散。可在⚙设置圈数与速度。',      hasSettings: true  }
  ];

  var settingsPanels = {};
  var settingsOpen = {};

  function buildSettingsPanel(sub) {
    var el = document.createElement('div');
    el.id = NS + 'cu-settings-' + sub;
    el.style.cssText = 'display:none;padding:4px 12px 10px;margin-bottom:4px;background:rgba(59,130,246,0.04);border-radius:10px;';
    if (sub === 'ripple') {
      el.innerHTML =
        '<div class="' + NS + 'setting-row"><span>波纹大小</span><span class="' + NS + 'val" id="' + NS + 'cu-ripple-r-val">' + rippleMaxR + 'px</span></div>' +
        '<input class="' + NS + 'slider" type="range" min="40" max="250" value="' + rippleMaxR + '" step="5" data-cu="ripple-r">' +
        '<div class="' + NS + 'setting-row"><span>持续时间</span><span class="' + NS + 'val" id="' + NS + 'cu-ripple-d-val">' + rippleDuration + 'ms</span></div>' +
        '<input class="' + NS + 'slider" type="range" min="400" max="2000" value="' + rippleDuration + '" step="100" data-cu="ripple-d">';
    } else if (sub === 'magnet') {
      el.innerHTML =
        '<div class="' + NS + 'setting-row"><span>吸附范围</span><span class="' + NS + 'val" id="' + NS + 'cu-magnet-r-val">' + magnetRadius + 'px</span></div>' +
        '<input class="' + NS + 'slider" type="range" min="30" max="200" value="' + magnetRadius + '" step="5" data-cu="magnet-r">' +
        '<div class="' + NS + 'setting-row"><span>吸附强度</span><span class="' + NS + 'val" id="' + NS + 'cu-magnet-s-val">' + Math.round(magnetStrength * 100) + '%</span></div>' +
        '<input class="' + NS + 'slider" type="range" min="5" max="80" value="' + Math.round(magnetStrength * 100) + '" step="1" data-cu="magnet-s">';
    } else if (sub === 'lightning') {
      el.innerHTML =
        '<div class="' + NS + 'setting-row"><span>分支复杂度</span><span class="' + NS + 'val" id="' + NS + 'cu-lightning-d-val">' + lightningDepth + '</span></div>' +
        '<input class="' + NS + 'slider" type="range" min="2" max="6" value="' + lightningDepth + '" step="1" data-cu="lightning-d">' +
        '<div class="' + NS + 'setting-row"><span>持续时间</span><span class="' + NS + 'val" id="' + NS + 'cu-lightning-t-val">' + lightningDuration + 'ms</span></div>' +
        '<input class="' + NS + 'slider" type="range" min="80" max="800" value="' + lightningDuration + '" step="20" data-cu="lightning-t">';
    } else if (sub === 'ring') {
      el.innerHTML =
        '<div class="' + NS + 'setting-row"><span>光环圈数</span><span class="' + NS + 'val" id="' + NS + 'cu-ring-c-val">' + ringCount + '</span></div>' +
        '<input class="' + NS + 'slider" type="range" min="1" max="6" value="' + ringCount + '" step="1" data-cu="ring-c">' +
        '<div class="' + NS + 'setting-row"><span>旋转速度</span><span class="' + NS + 'val" id="' + NS + 'cu-ring-s-val">' + ringSpeed + '</span></div>' +
        '<input class="' + NS + 'slider" type="range" min="0.3" max="4.0" value="' + ringSpeed + '" step="0.1" data-cu="ring-s">';
    }
    el.addEventListener('input', function (e) {
      var t = e.target; if (!t.dataset.cu) return;
      var key = t.dataset.cu, val = parseFloat(t.value);
      if (key === 'ripple-r')    { rippleMaxR = val;        document.getElementById(NS + 'cu-ripple-r-val').textContent = val + 'px'; }
      if (key === 'ripple-d')    { rippleDuration = val;    document.getElementById(NS + 'cu-ripple-d-val').textContent = val + 'ms'; }
      if (key === 'magnet-r')    { magnetRadius = val;      document.getElementById(NS + 'cu-magnet-r-val').textContent = val + 'px'; }
      if (key === 'magnet-s')    { magnetStrength = val / 100; document.getElementById(NS + 'cu-magnet-s-val').textContent = val + '%'; }
      if (key === 'lightning-d') { lightningDepth = val;    document.getElementById(NS + 'cu-lightning-d-val').textContent = val; }
      if (key === 'lightning-t') { lightningDuration = val; document.getElementById(NS + 'cu-lightning-t-val').textContent = val + 'ms'; }
      if (key === 'ring-c')      { ringCount = val;         document.getElementById(NS + 'cu-ring-c-val').textContent = val; }
      if (key === 'ring-s')      { ringSpeed = val;         document.getElementById(NS + 'cu-ring-s-val').textContent = val; }
    });
    return el;
  }

  function showDesc(label, desc, anchorEl) {
    var existing = document.getElementById(NS + 'desc-popup'); if (existing) existing.remove();
    var popup = document.createElement('div');
    popup.id = NS + 'desc-popup';
    popup.innerHTML = '<div class="' + NS + 'desc-title">' + label + '</div><div class="' + NS + 'desc-text">' + desc + '</div>';
    document.body.appendChild(popup);
    var rect = anchorEl.getBoundingClientRect(), popupW = 228, popupGap = 10;
    var pLeft = rect.right + popupGap;
    if (pLeft + popupW > window.innerWidth - 8) pLeft = rect.left - popupW - popupGap;
    if (pLeft < 8) pLeft = 8;
    var pTop = rect.top; if (pTop < 8) pTop = 8;
    popup.style.left = pLeft + 'px'; popup.style.top = pTop + 'px';
    function onLeave(e) { var r = e.relatedTarget; if (r && (r === popup || popup.contains(r))) return; cleanup(); }
    function onPopupLeave(e) { var r = e.relatedTarget; if (r && r === anchorEl) return; cleanup(); }
    function cleanup() { if (popup.parentNode) popup.remove(); anchorEl.removeEventListener('mouseleave', onLeave); popup.removeEventListener('mouseleave', onPopupLeave); }
    anchorEl.addEventListener('mouseleave', onLeave);
    popup.addEventListener('mouseleave', onPopupLeave);
  }

  function injectMenuItems() {
    var panel = document.getElementById(NS + 'panel');
    if (!panel) return;
    var sep = panel.querySelector('.' + NS + 'sep');
    if (!sep) return;
    ITEMS.forEach(function (cfg) {
      if (panel.querySelector('.' + NS + 'item-' + cfg.cls)) return;
      var item = document.createElement('div');
      item.className = NS + 'item ' + NS + 'item-' + cfg.cls;
      item.style.cssText = 'display:flex;align-items:center;justify-content:space-between;';
      var labelEl = document.createElement('span');
      labelEl.className = NS + 'label';
      labelEl.textContent = cfg.label;
      labelEl.title = '右键查看功能说明';
      item.appendChild(labelEl);
      if (cfg.hasSettings) {
        var gear = document.createElement('span');
        gear.className = NS + 'gear'; gear.title = '设置'; gear.textContent = '⚙';
        item.appendChild(gear);
        var panelEl = buildSettingsPanel(cfg.sub);
        settingsPanels[cfg.sub] = panelEl; settingsOpen[cfg.sub] = false;
        sep.parentNode.insertBefore(item, sep);
        sep.parentNode.insertBefore(panelEl, sep);
        gear.addEventListener('click', function (e) {
          e.stopPropagation();
          settingsOpen[cfg.sub] = !settingsOpen[cfg.sub];
          panelEl.style.display = settingsOpen[cfg.sub] ? 'block' : 'none';
        });
      } else {
        sep.parentNode.insertBefore(item, sep);
      }
      labelEl.addEventListener('click', function (e) {
        e.stopPropagation();
        var rt = window.__tbRuntime;
        if (!rt) return;
        rt.toggle(cfg.sub);
        var isActive = rt.isActive(cfg.sub);
        item.classList.toggle(NS + 'active', isActive);
        labelEl.title = isActive ? '再次点击关闭效果' : '右键查看功能说明';
      });
      labelEl.addEventListener('contextmenu', function (e) {
        e.preventDefault(); e.stopPropagation();
        showDesc(cfg.label, cfg.desc, labelEl);
      });
    });
  }

  function waitForRuntimeThenInject() {
    var rt = window.__tbRuntime;
    if (rt && rt.ready) {
      rt.ready.then(function () {
        registerEffects();
        injectMenuItems();
      });
      return;
    }
    window.addEventListener('tb-skill:master-online', function wake() {
      window.removeEventListener('tb-skill:master-online', wake);
      waitForRuntimeThenInject();
    });
  }

  function registerEffects() {
    var rt = window.__tbRuntime;

    rt.register('ripple', {
      mount: function () {
        var dpr = window.devicePixelRatio || 1;
        var canvas = document.createElement('canvas');
        canvas.id = NS + 'ripple-canvas';
        canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:2147483640;';
        canvas.width = window.innerWidth * dpr; canvas.height = window.innerHeight * dpr;
        document.body.appendChild(canvas);
        var ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
        var onResize = function () {
          var d = window.devicePixelRatio || 1;
          canvas.width = window.innerWidth * d; canvas.height = window.innerHeight * d;
          ctx = canvas.getContext('2d'); ctx.scale(d, d);
        };
        window.addEventListener('resize', onResize);
        var ripples = [], rafId;
        function loop(ts) {
          ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
          for (var i = ripples.length - 1; i >= 0; i--) {
            var rp = ripples[i], progress = (ts - rp.start) / rp.duration;
            if (progress >= 1) { ripples.splice(i, 1); continue; }
            for (var w = 0; w < 3; w++) {
              var wp = Math.max(0, progress - w * 0.12); if (wp <= 0) continue;
              ctx.beginPath();
              ctx.arc(rp.x, rp.y, wp * rp.maxR, 0, Math.PI * 2);
              ctx.strokeStyle = 'hsla(' + rp.hue + ',70%,65%,' + ((1 - wp) * 0.55 * rp.alpha) + ')';
              ctx.lineWidth = (1 - wp) * 3 + 0.5; ctx.stroke();
            }
          }
          rafId = requestAnimationFrame(loop);
        }
        rafId = requestAnimationFrame(loop);
        var clickFn = function (e) {
          if (ripples.length >= 20) ripples.shift();
          ripples.push({ x: e.clientX, y: e.clientY, start: performance.now(), duration: rippleDuration, maxR: rippleMaxR * (0.7 + Math.random() * 0.6), hue: Math.random() * 360, alpha: 0.7 + Math.random() * 0.3 });
        };
        document.addEventListener('click', clickFn);
        return {
          destroy: function () {
            cancelAnimationFrame(rafId);
            document.removeEventListener('click', clickFn);
            window.removeEventListener('resize', onResize);
            canvas.remove();
            ripples = [];
          }
        };
      }
    });

    rt.register('magnet', {
      mount: function () {
        cssIn('* { cursor: none !important; }', NS + 'magnet-hide');
        var magnetOriginals = new WeakMap();
        var cursor = document.createElement('div');
        cursor.id = NS + 'magnet-cursor';
        cursor.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483647;width:18px;height:18px;border-radius:50%;background:rgba(99,102,241,0.85);box-shadow:0 0 0 3px rgba(99,102,241,0.25);transform:translate(-50%,-50%);transition:width .15s,height .15s,border-radius .15s,background .15s;will-change:transform;left:0;top:0;';
        document.body.appendChild(cursor);
        var magnetX = -999, magnetY = -999, curX = 0, curY = 0;
        var mouseFn = function (e) { magnetX = e.clientX; magnetY = e.clientY; };
        document.addEventListener('mousemove', mouseFn, { passive: true });
        var targets = [];
        function collectTargets() { targets = Array.from(document.querySelectorAll('a,button,[role="button"],input[type="submit"]')); }
        collectTargets();
        var interval = setInterval(collectTargets, 2000);
        var rafId;
        function loop() {
          curX += (magnetX - curX) * 0.18; curY += (magnetY - curY) * 0.18;
          cursor.style.left = curX + 'px'; cursor.style.top = curY + 'px';
          var nearAny = false;
          targets.forEach(function (el) {
            if (!document.body.contains(el)) return;
            var rect = el.getBoundingClientRect();
            var cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
            var dx = magnetX - cx, dy = magnetY - cy, dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < magnetRadius) {
              nearAny = true;
              var strength = (1 - dist / magnetRadius) * magnetStrength;
              if (!magnetOriginals.has(el)) magnetOriginals.set(el, el.style.transform || '');
              el.style.transform = magnetOriginals.get(el) + ' translate(' + (dx * strength) + 'px,' + (dy * strength) + 'px)';
              el.style.transition = 'transform .12s ease';
            } else if (magnetOriginals.has(el)) {
              el.style.transform = magnetOriginals.get(el);
              el.style.transition = 'transform .35s ease';
              magnetOriginals.delete(el);
            }
          });
          if (nearAny) { cursor.style.width = '36px'; cursor.style.height = '36px'; cursor.style.borderRadius = '30%'; cursor.style.background = 'rgba(99,102,241,0.5)'; }
          else { cursor.style.width = '18px'; cursor.style.height = '18px'; cursor.style.borderRadius = '50%'; cursor.style.background = 'rgba(99,102,241,0.85)'; }
          rafId = requestAnimationFrame(loop);
        }
        rafId = requestAnimationFrame(loop);
        return {
          destroy: function () {
            cssOut(NS + 'magnet-hide');
            cancelAnimationFrame(rafId);
            clearInterval(interval);
            document.removeEventListener('mousemove', mouseFn);
            cursor.remove();
            targets.forEach(function (el) {
              if (magnetOriginals.has(el)) { el.style.transform = magnetOriginals.get(el); el.style.transition = ''; magnetOriginals.delete(el); }
            });
            targets = [];
          }
        };
      }
    });

    rt.register('lightning', {
      mount: function () {
        function buildLightningPoints(x1, y1, x2, y2, depth) {
          if (depth === 0) return [[x1, y1], [x2, y2]];
          var spread = (Math.abs(x2 - x1) + Math.abs(y2 - y1)) * 0.45;
          var mx = (x1 + x2) / 2 + (Math.random() - 0.5) * spread;
          var my = (y1 + y2) / 2 + (Math.random() - 0.5) * spread;
          var result = buildLightningPoints(x1, y1, mx, my, depth - 1).concat(buildLightningPoints(mx, my, x2, y2, depth - 1).slice(1));
          if (depth >= 2 && Math.random() < 0.4)
            result = result.concat(buildLightningPoints(mx, my, mx + (Math.random() - 0.5) * 120, my + Math.random() * 100 + 30, depth - 2).slice(1));
          return result;
        }
        function spawnLightning(x, y) {
          var svgNS = 'http://www.w3.org/2000/svg';
          var svg = document.createElementNS(svgNS, 'svg');
          svg.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:2147483641;overflow:visible;';
          svg.setAttribute('width', '100%'); svg.setAttribute('height', '100%');
          var defs = document.createElementNS(svgNS, 'defs');
          var filterId = NS + 'lglow-' + Date.now();
          var filter = document.createElementNS(svgNS, 'filter');
          filter.id = filterId; filter.setAttribute('x', '-50%'); filter.setAttribute('y', '-50%'); filter.setAttribute('width', '200%'); filter.setAttribute('height', '200%');
          var blur = document.createElementNS(svgNS, 'feGaussianBlur'); blur.setAttribute('stdDeviation', '3'); blur.setAttribute('result', 'blur');
          var comp = document.createElementNS(svgNS, 'feComposite'); comp.setAttribute('in', 'SourceGraphic'); comp.setAttribute('in2', 'blur'); comp.setAttribute('operator', 'over');
          filter.appendChild(blur); filter.appendChild(comp); defs.appendChild(filter); svg.appendChild(defs);
          var boltCount = 1 + Math.floor(Math.random() * 2);
          for (var b = 0; b < boltCount; b++) {
            var pts = buildLightningPoints(x, y, x + (Math.random() - 0.5) * 200, y + 120 + Math.random() * 180, lightningDepth);
            var ptStr = pts.map(function (p) { return p[0] + ',' + p[1]; }).join(' ');
            var glow = document.createElementNS(svgNS, 'polyline');
            glow.setAttribute('points', ptStr); glow.setAttribute('fill', 'none'); glow.setAttribute('stroke', b === 0 ? '#a78bfa' : '#818cf8');
            glow.setAttribute('stroke-width', b === 0 ? '4' : '2.5'); glow.setAttribute('stroke-linecap', 'round'); glow.setAttribute('stroke-linejoin', 'round');
            glow.setAttribute('filter', 'url(#' + filterId + ')'); glow.setAttribute('opacity', '0.7');
            var core = document.createElementNS(svgNS, 'polyline');
            core.setAttribute('points', ptStr); core.setAttribute('fill', 'none'); core.setAttribute('stroke', '#e0e7ff');
            core.setAttribute('stroke-width', b === 0 ? '1.5' : '1'); core.setAttribute('stroke-linecap', 'round'); core.setAttribute('stroke-linejoin', 'round');
            svg.appendChild(glow); svg.appendChild(core);
          }
          document.body.appendChild(svg);
          return { el: svg, start: performance.now(), duration: lightningDuration + Math.random() * 60 };
        }
        var lightnings = [], rafId;
        var clickFn = function (e) {
          if (lightnings.length >= 8) lightnings.shift().el.remove();
          lightnings.push(spawnLightning(e.clientX, e.clientY));
        };
        document.addEventListener('click', clickFn);
        function loop(ts) {
          for (var i = lightnings.length - 1; i >= 0; i--) {
            var lt = lightnings[i], progress = Math.min(1, (ts - lt.start) / lt.duration);
            lt.el.style.opacity = 1 - Math.pow(progress, 2);
            if (progress >= 1) { lt.el.remove(); lightnings.splice(i, 1); }
          }
          rafId = requestAnimationFrame(loop);
        }
        rafId = requestAnimationFrame(loop);
        return {
          destroy: function () {
            cancelAnimationFrame(rafId);
            document.removeEventListener('click', clickFn);
            lightnings.forEach(function (lt) { lt.el.remove(); });
            lightnings = [];
          }
        };
      }
    });

    rt.register('dissolve', {
      mount: function () {
        function isTextOnlyElement(el) {
          var forbidden = ['IMG', 'VIDEO', 'CANVAS', 'SVG', 'INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'IFRAME'];
          var children = el.querySelectorAll('*');
          for (var i = 0; i < children.length; i++) { if (forbidden.indexOf(children[i].tagName) !== -1) return false; }
          return el.textContent.trim().length > 0;
        }
        var enterFn = function (e) {
          var el = e.target.closest('h1,h2,h3,h4,h5,h6,p,li,td,th,label,a');
          if (!el || el.dataset.tbDisActive) return;
          if (!isTextOnlyElement(el)) return;
          el.dataset.tbDisActive = '1';
          if (!el.dataset.tbDisOriginal) el.dataset.tbDisOriginal = el.textContent;
          var originalText = el.dataset.tbDisOriginal;
          el.innerHTML = '';
          originalText.split('').forEach(function (ch) {
            var s = document.createElement('span');
            s.textContent = ch;
            s.style.cssText = 'display:inline-block;transition:none;will-change:transform,opacity;';
            el.appendChild(s);
          });
          requestAnimationFrame(function () {
            requestAnimationFrame(function () {
              el.querySelectorAll('span').forEach(function (s) {
                s.style.transition = 'transform 0.7s cubic-bezier(0.25,0.46,0.45,0.94),opacity 0.7s ease';
                s.style.transform = 'translate(' + ((Math.random() - 0.5) * 140) + 'px,' + ((Math.random() - 0.5) * 90) + 'px) rotate(' + ((Math.random() - 0.5) * 70) + 'deg)';
                s.style.opacity = '0';
              });
            });
          });
          el.addEventListener('mouseleave', function onLeave() {
            el.querySelectorAll('span').forEach(function (s) {
              s.style.transition = 'transform 0.7s cubic-bezier(0.25,0.46,0.45,0.94),opacity 0.7s ease';
              s.style.transform = 'translate(0,0) rotate(0deg)';
              s.style.opacity = '1';
            });
            setTimeout(function () { if (!el.dataset.tbDisActive) el.textContent = el.dataset.tbDisOriginal; }, 720);
            delete el.dataset.tbDisActive;
            el.removeEventListener('mouseleave', onLeave);
          });
        };
        document.addEventListener('mouseenter', enterFn, true);
        return {
          destroy: function () {
            document.removeEventListener('mouseenter', enterFn, true);
            document.querySelectorAll('[data-tb-dis-original]').forEach(function (el) {
              el.textContent = el.dataset.tbDisOriginal;
              delete el.dataset.tbDisOriginal;
              delete el.dataset.tbDisActive;
            });
          }
        };
      }
    });

    rt.register('diffusion', {
      mount: function () {
        var div = document.createElement('div');
        div.id = NS + 'diffusion';
        div.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483638;';
        document.body.appendChild(div);
        var diffHue = 0;
        var mouseFn = function (e) {
          diffHue = (diffHue + 0.8) % 360;
          div.style.background =
            'radial-gradient(circle at ' + e.clientX + 'px ' + e.clientY + 'px,' +
            'hsla(' + diffHue + ',90%,55%,0.22),' +
            'hsla(' + ((diffHue + 40) % 360) + ',80%,60%,0.10) 120px,' +
            'transparent 260px)';
        };
        document.addEventListener('mousemove', mouseFn, { passive: true });
        return {
          destroy: function () {
            document.removeEventListener('mousemove', mouseFn);
            div.remove();
          }
        };
      }
    });

    rt.register('ring', {
      mount: function () {
        var dpr = window.devicePixelRatio || 1;
        var canvas = document.createElement('canvas');
        canvas.id = NS + 'ring-canvas';
        canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:2147483642;';
        canvas.width = window.innerWidth * dpr; canvas.height = window.innerHeight * dpr;
        document.body.appendChild(canvas);
        var ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
        var onResize = function () {
          var d = window.devicePixelRatio || 1;
          canvas.width = window.innerWidth * d; canvas.height = window.innerHeight * d;
          ctx = canvas.getContext('2d'); ctx.scale(d, d);
        };
        window.addEventListener('resize', onResize);
        var mouseX = -999, mouseY = -999, ringAngle = 0, ringBursts = [], rafId;
        var mouseFn = function (e) { mouseX = e.clientX; mouseY = e.clientY; };
        document.addEventListener('mousemove', mouseFn, { passive: true });
        var clickFn = function (e) {
          for (var b = 0; b < ringCount; b++) {
            ringBursts.push({ x: e.clientX, y: e.clientY, r: ringBaseRadius + b * 18, alpha: 0.9, start: performance.now(), duration: 500 + b * 80 });
          }
        };
        document.addEventListener('click', clickFn);
        function loop(ts) {
          ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
          ringAngle += ringSpeed * 0.03;
          if (mouseX > 0) {
            for (var i = 0; i < ringCount; i++) {
              var radius = ringBaseRadius + i * 18;
              var speed = ringSpeed * (1 + i * 0.5);
              var angle = ringAngle * speed + (i * Math.PI * 2 / ringCount);
              var hue = (angle * 30 + i * 60) % 360;
              var arcLen = Math.PI * 0.7 - i * 0.08;
              ctx.beginPath(); ctx.arc(mouseX, mouseY, radius, angle, angle + arcLen);
              ctx.strokeStyle = 'hsla(' + hue + ',80%,65%,' + (0.7 - i * 0.08) + ')';
              ctx.lineWidth = 2.5 - i * 0.3; ctx.lineCap = 'round'; ctx.stroke();
              ctx.beginPath(); ctx.arc(mouseX, mouseY, radius, angle + Math.PI, angle + Math.PI + arcLen * 0.5);
              ctx.strokeStyle = 'hsla(' + ((hue + 180) % 360) + ',70%,70%,' + (0.4 - i * 0.05) + ')';
              ctx.lineWidth = 1.2; ctx.stroke();
            }
          }
          for (var j = ringBursts.length - 1; j >= 0; j--) {
            var burst = ringBursts[j];
            var progress = Math.min(1, (ts - burst.start) / burst.duration);
            var eased = 1 - Math.pow(1 - progress, 3);
            var br = burst.r + eased * 60, ba = (1 - progress) * 0.85;
            if (ba <= 0 || progress >= 1) { ringBursts.splice(j, 1); continue; }
            ctx.beginPath(); ctx.arc(burst.x, burst.y, br, 0, Math.PI * 2);
            ctx.strokeStyle = 'hsla(' + (burst.r * 4 % 360) + ',80%,70%,' + ba + ')';
            ctx.lineWidth = (1 - progress) * 3; ctx.stroke();
          }
          rafId = requestAnimationFrame(loop);
        }
        rafId = requestAnimationFrame(loop);
        return {
          destroy: function () {
            cancelAnimationFrame(rafId);
            document.removeEventListener('mousemove', mouseFn);
            document.removeEventListener('click', clickFn);
            window.removeEventListener('resize', onResize);
            canvas.remove();
            ringBursts = []; ringAngle = 0; mouseX = -999; mouseY = -999;
          }
        };
      }
    });
  }

  function onDestroyAll() {
    window.removeEventListener('tb-skill:destroy-all', onDestroyAll);
    window.__tbCursorPackLoaded = false;
  }

  window.addEventListener('tb-skill:destroy-all', onDestroyAll);
  waitForRuntimeThenInject();

})();