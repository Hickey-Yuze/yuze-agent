(function () {
  'use strict';

  if (window.__tbPagePackLoaded) return;
  window.__tbPagePackLoaded = true;

  var NS = 'tb-';

  var networkCount = 90, networkConnect = 140;
  var fallCount = 80, fallSymbol = '❄';
  var starLayers = 3, starSpeed = 0.4;
  var sphereCount = 320, sphereSpeed = 0.4;
  var threeBodyG = 0.5;
  var cubeSpeed = 1.0;

  var ITEMS = [
    { cls: 'ext-geo',       sub: 'geo',       label: '🔷 几何折叠 ',   desc: '低多边形三角网格在背景持续缓慢变形，顶点随机游走。',                            hasSettings: false },
    { cls: 'ext-star',      sub: 'star',      label: '🌌 星空漂移 ',   desc: '随机星点多层视差缓慢移动，鼠标偏移产生深度感。可在⚙设置层数与速度。',           hasSettings: true  },
    { cls: 'ext-fluid',     sub: 'fluid',     label: '🌊 流体噪声 ',   desc: 'Perlin 噪声驱动彩色流场缓慢涌动，类 Lava Lamp 效果。',                        hasSettings: false },
    { cls: 'ext-fall',      sub: 'fall',      label: '🕊 飘落粒子 ',   desc: '符号从顶部随机飘落，受重力与风力影响。可在⚙设置数量与符号。',                  hasSettings: true  },
    { cls: 'ext-sphere',    sub: 'sphere',    label: '🌐 球形粒子 ',   desc: '粒子分布于旋转球面，鼠标控制旋转轴，伪3D投影渲染。可在⚙设置粒子数与速度。',     hasSettings: true  },
    { cls: 'ext-network',   sub: 'network',   label: '🕸 粒子网络 ',   desc: '全屏漂浮粒子自动连线，鼠标作为超级节点参与连接。可在⚙设置粒子数量与连线距离。', hasSettings: true  },
    { cls: 'ext-threebody', sub: 'threebody', label: '🌑 三体运动 ',   desc: '三个天体在万有引力下混沌运动，拖出彩色轨迹。可在⚙设置引力强度。',             hasSettings: true  },
    { cls: 'ext-cube',      sub: 'cube',      label: '⬛ 旋转立方体 ', desc: '线框立方体在屏幕中心旋转，鼠标拖动改变视角。可在⚙设置旋转速度。',              hasSettings: true  },
    { cls: 'ext-blackhole', sub: 'blackhole', label: '⚫  黑洞吞噬 ',   desc: '⚠️ 被吞噬的元素将从页面移除，关闭效果后不会恢复，刷新页面还原。黑洞居中缓慢扩大，由近及远逐步吞噬页面元素。。。', hasSettings: false }
  ];

  var settingsPanels = {};
  var settingsOpen = {};

  function buildSettingsPanel(sub) {
    var el = document.createElement('div');
    el.id = NS + 'pg-settings-' + sub;
    el.style.cssText = 'display:none;padding:4px 12px 10px;margin-bottom:4px;background:rgba(59,130,246,0.04);border-radius:10px;';
    if (sub === 'star') {
      el.innerHTML =
        '<div class="' + NS + 'setting-row"><span>视差层数</span><span class="' + NS + 'val" id="' + NS + 'pg-star-l-val">' + starLayers + '</span></div>' +
        '<input class="' + NS + 'slider" type="range" min="1" max="5" value="' + starLayers + '" step="1" data-pg="star-l">' +
        '<div class="' + NS + 'setting-row"><span>漂移速度</span><span class="' + NS + 'val" id="' + NS + 'pg-star-s-val">' + starSpeed + '</span></div>' +
        '<input class="' + NS + 'slider" type="range" min="0.1" max="1.5" value="' + starSpeed + '" step="0.1" data-pg="star-s">';
    } else if (sub === 'fall') {
      el.innerHTML =
        '<div class="' + NS + 'setting-row"><span>粒子数量</span><span class="' + NS + 'val" id="' + NS + 'pg-fall-c-val">' + fallCount + '</span></div>' +
        '<input class="' + NS + 'slider" type="range" min="20" max="200" value="' + fallCount + '" step="10" data-pg="fall-c">' +
        '<div class="' + NS + 'setting-row"><span>符号</span></div>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px;" id="' + NS + 'pg-fall-syms">' +
        ['❄','✦','○','★'].map(function(s){ return '<span data-sym="' + s + '" style="cursor:pointer;font-size:16px;padding:2px 4px;border-radius:6px;' + (s === fallSymbol ? 'background:rgba(99,102,241,0.2);' : '') + '">' + s + '</span>'; }).join('') +
        '</div>';
    } else if (sub === 'sphere') {
      el.innerHTML =
        '<div class="' + NS + 'setting-row"><span>粒子数量</span><span class="' + NS + 'val" id="' + NS + 'pg-sphere-c-val">' + sphereCount + '</span></div>' +
        '<input class="' + NS + 'slider" type="range" min="80" max="600" value="' + sphereCount + '" step="20" data-pg="sphere-c">' +
        '<div class="' + NS + 'setting-row"><span>旋转速度</span><span class="' + NS + 'val" id="' + NS + 'pg-sphere-s-val">' + sphereSpeed + '</span></div>' +
        '<input class="' + NS + 'slider" type="range" min="0.1" max="2.0" value="' + sphereSpeed + '" step="0.1" data-pg="sphere-s">';
    } else if (sub === 'network') {
      el.innerHTML =
        '<div class="' + NS + 'setting-row"><span>粒子数量</span><span class="' + NS + 'val" id="' + NS + 'pg-network-c-val">' + networkCount + '</span></div>' +
        '<input class="' + NS + 'slider" type="range" min="20" max="200" value="' + networkCount + '" step="10" data-pg="network-c">' +
        '<div class="' + NS + 'setting-row"><span>连线距离</span><span class="' + NS + 'val" id="' + NS + 'pg-network-d-val">' + networkConnect + 'px</span></div>' +
        '<input class="' + NS + 'slider" type="range" min="60" max="250" value="' + networkConnect + '" step="10" data-pg="network-d">';
    } else if (sub === 'threebody') {
      el.innerHTML =
        '<div class="' + NS + 'setting-row"><span>引力强度</span><span class="' + NS + 'val" id="' + NS + 'pg-tb-g-val">' + threeBodyG + '</span></div>' +
        '<input class="' + NS + 'slider" type="range" min="0.1" max="2.0" value="' + threeBodyG + '" step="0.1" data-pg="tb-g">';
    } else if (sub === 'cube') {
      el.innerHTML =
        '<div class="' + NS + 'setting-row"><span>旋转速度</span><span class="' + NS + 'val" id="' + NS + 'pg-cube-s-val">' + cubeSpeed + '</span></div>' +
        '<input class="' + NS + 'slider" type="range" min="0.1" max="4.0" value="' + cubeSpeed + '" step="0.1" data-pg="cube-s">';
    }
    el.addEventListener('input', function (e) {
      var t = e.target; if (!t.dataset.pg) return;
      var key = t.dataset.pg, val = parseFloat(t.value);
      if (key === 'star-l')    { starLayers = val;     document.getElementById(NS + 'pg-star-l-val').textContent = val; }
      if (key === 'star-s')    { starSpeed = val;       document.getElementById(NS + 'pg-star-s-val').textContent = val; }
      if (key === 'fall-c')    { fallCount = val;       document.getElementById(NS + 'pg-fall-c-val').textContent = val; }
      if (key === 'sphere-c')  { sphereCount = val;     document.getElementById(NS + 'pg-sphere-c-val').textContent = val; }
      if (key === 'sphere-s')  { sphereSpeed = val;     document.getElementById(NS + 'pg-sphere-s-val').textContent = val; }
      if (key === 'network-c') { networkCount = val;    document.getElementById(NS + 'pg-network-c-val').textContent = val; }
      if (key === 'network-d') { networkConnect = val;  document.getElementById(NS + 'pg-network-d-val').textContent = val + 'px'; }
      if (key === 'tb-g')      { threeBodyG = val;      document.getElementById(NS + 'pg-tb-g-val').textContent = val; }
      if (key === 'cube-s')    { cubeSpeed = val;       document.getElementById(NS + 'pg-cube-s-val').textContent = val; }
    });
    if (sub === 'fall') {
      el.addEventListener('click', function (e) {
        var t = e.target; if (!t.dataset.sym) return;
        fallSymbol = t.dataset.sym;
        el.querySelectorAll('[data-sym]').forEach(function (s) {
          s.style.background = s.dataset.sym === fallSymbol ? 'rgba(99,102,241,0.2)' : '';
        });
      });
    }
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
        gear.className = NS + 'gear';
        gear.title = '设置';
        gear.textContent = '⚙';
        item.appendChild(gear);
        var panelEl = buildSettingsPanel(cfg.sub);
        settingsPanels[cfg.sub] = panelEl;
        settingsOpen[cfg.sub] = false;
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

    rt.register('geo', {
      mount: function () {
        var cv = rt.createCanvas(NS + 'geo-canvas', 2147483630);
        var pts = [], tris = [], W, H;
        function buildMesh() {
          W = window.innerWidth; H = window.innerHeight;
          pts = [];
          var cols = 14, rows = 9, cw = W / cols, ch = H / rows;
          for (var r = 0; r <= rows; r++) {
            for (var c = 0; c <= cols; c++) {
              pts.push({ bx: c*cw, by: r*ch, x: c*cw+(Math.random()-0.5)*cw*0.6, y: r*ch+(Math.random()-0.5)*ch*0.6, vx:(Math.random()-0.5)*0.25, vy:(Math.random()-0.5)*0.25 });
            }
          }
          tris = [];
          for (var row = 0; row < rows; row++) {
            for (var col = 0; col < cols; col++) {
              var i0 = row*(cols+1)+col, i1=i0+1, i2=i0+(cols+1), i3=i2+1;
              tris.push([i0,i1,i3]); tris.push([i0,i3,i2]);
            }
          }
        }
        buildMesh();
        var resizeFn2 = function () { buildMesh(); };
        window.addEventListener('resize', resizeFn2);
        function hue(p0,p1,p2) {
          var cx=(p0.x+p1.x+p2.x)/3/W, cy=(p0.y+p1.y+p2.y)/3/H;
          return Math.round((cx*0.5+cy*0.5)*260+180)%360;
        }
        var rafId;
        function loop() {
          var ctx = cv.ctx;
          W = window.innerWidth; H = window.innerHeight;
          ctx.clearRect(0,0,W,H);
          pts.forEach(function(p){
            p.x+=p.vx; p.y+=p.vy;
            if(Math.abs(p.x-p.bx)>60) p.vx*=-1;
            if(Math.abs(p.y-p.by)>60) p.vy*=-1;
          });
          tris.forEach(function(tri){
            var p0=pts[tri[0]],p1=pts[tri[1]],p2=pts[tri[2]];
            var h=hue(p0,p1,p2);
            ctx.beginPath(); ctx.moveTo(p0.x,p0.y); ctx.lineTo(p1.x,p1.y); ctx.lineTo(p2.x,p2.y); ctx.closePath();
            ctx.fillStyle='hsla('+h+',55%,62%,0.12)'; ctx.strokeStyle='hsla('+h+',50%,70%,0.18)'; ctx.lineWidth=0.5;
            ctx.fill(); ctx.stroke();
          });
          rafId = requestAnimationFrame(loop);
        }
        rafId = requestAnimationFrame(loop);
        return {
          destroy: function () {
            cancelAnimationFrame(rafId);
            window.removeEventListener('resize', resizeFn2);
            cv.destroy();
          }
        };
      }
    });

    rt.register('star', {
      mount: function () {
        var cv = rt.createCanvas(NS + 'star-canvas', 2147483629);
        var starLayersData = [];
        var mouseX = 0, mouseY = 0;
        var mouseFn = function(e){ mouseX=e.clientX; mouseY=e.clientY; };
        document.addEventListener('mousemove', mouseFn, { passive: true });
        function buildStars() {
          starLayersData = [];
          var W=window.innerWidth, H=window.innerHeight;
          for(var l=0;l<starLayers;l++){
            var stars=[],count=60+l*40;
            for(var i=0;i<count;i++) stars.push({x:Math.random()*W,y:Math.random()*H,r:0.4+Math.random()*(l+1)*0.6});
            starLayersData.push({stars:stars,speed:starSpeed*(l+1)*0.4,parallax:(l+1)*0.012});
          }
        }
        buildStars();
        var resizeFn2 = function(){ buildStars(); };
        window.addEventListener('resize', resizeFn2);
        var rafId;
        function loop() {
          var ctx=cv.ctx, W=window.innerWidth, H=window.innerHeight;
          ctx.clearRect(0,0,W,H);
          var cx=W/2, cy=H/2;
          starLayersData.forEach(function(layer,li){
            var px=(mouseX-cx)*layer.parallax, py=(mouseY-cy)*layer.parallax;
            layer.stars.forEach(function(s){
              s.x+=layer.speed*0.15;
              if(s.x>W+2) s.x=-2;
              ctx.beginPath(); ctx.arc(s.x+px,s.y+py,s.r,0,Math.PI*2);
              ctx.fillStyle='rgba(200,220,255,'+(0.4+li*0.2)+')'; ctx.fill();
            });
          });
          rafId = requestAnimationFrame(loop);
        }
        rafId = requestAnimationFrame(loop);
        return {
          destroy: function () {
            cancelAnimationFrame(rafId);
            document.removeEventListener('mousemove', mouseFn);
            window.removeEventListener('resize', resizeFn2);
            cv.destroy();
          }
        };
      }
    });

    rt.register('fluid', {
      mount: function () {
        var cv = rt.createCanvas(NS + 'fluid-canvas', 2147483628);
        function fade(t){return t*t*t*(t*(t*6-15)+10);}
        function lerp(a,b,t){return a+t*(b-a);}
        function grad(h,x,y){var v=h&3,u=v<2?x:y,w=v<2?y:x;return((v&1)?-u:u)+((v&2)?-w:w);}
        var perm=[];
        for(var i=0;i<256;i++) perm[i]=i;
        for(var i=255;i>0;i--){var j=Math.floor(Math.random()*(i+1)),tmp=perm[i];perm[i]=perm[j];perm[j]=tmp;}
        perm=perm.concat(perm);
        function noise(x,y){
          var X=Math.floor(x)&255,Y=Math.floor(y)&255;
          x-=Math.floor(x); y-=Math.floor(y);
          var u=fade(x),v=fade(y),a=perm[X]+Y,b=perm[X+1]+Y;
          return lerp(lerp(grad(perm[a],x,y),grad(perm[b],x-1,y),u),lerp(grad(perm[a+1],x,y-1),grad(perm[b+1],x-1,y-1),u),v);
        }
        var CELL=28, fluidT=0, rafId;
        function loop() {
          var ctx=cv.ctx, W=window.innerWidth, H=window.innerHeight;
          ctx.clearRect(0,0,W,H);
          fluidT+=0.004;
          var cols=Math.ceil(W/CELL)+1, rows=Math.ceil(H/CELL)+1;
          for(var r=0;r<rows;r++){
            for(var c=0;c<cols;c++){
              var nx=c*0.12+fluidT, ny=r*0.12+fluidT*0.7;
              var n=(noise(nx,ny)+1)/2;
              var hue=Math.round(n*280+fluidT*40)%360;
              ctx.fillStyle='hsla('+hue+',65%,60%,'+(n*0.13+0.03)+')';
              ctx.fillRect(c*CELL,r*CELL,CELL+1,CELL+1);
            }
          }
          rafId = requestAnimationFrame(loop);
        }
        rafId = requestAnimationFrame(loop);
        return {
          destroy: function () { cancelAnimationFrame(rafId); cv.destroy(); }
        };
      }
    });

    rt.register('fall', {
      mount: function () {
        var cv = rt.createCanvas(NS + 'fall-canvas', 2147483627);
        var particles = [];
        function spawnParticle() {
          return {x:Math.random()*window.innerWidth,y:-20,vx:(Math.random()-0.5)*0.6,vy:0.5+Math.random()*1.2,rot:Math.random()*Math.PI*2,vrot:(Math.random()-0.5)*0.04,size:10+Math.random()*14,alpha:0.5+Math.random()*0.5};
        }
        for(var i=0;i<fallCount;i++){var p=spawnParticle();p.y=Math.random()*window.innerHeight;particles.push(p);}
        var windT=0, rafId;
        function loop() {
          var ctx=cv.ctx, W=window.innerWidth, H=window.innerHeight;
          ctx.clearRect(0,0,W,H);
          windT+=0.008;
          var wind=Math.sin(windT)*0.3;
          while(particles.length<fallCount) particles.push(spawnParticle());
          particles.forEach(function(p,idx){
            p.x+=p.vx+wind; p.y+=p.vy; p.rot+=p.vrot;
            if(p.y>H+30){particles[idx]=spawnParticle();return;}
            ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot); ctx.globalAlpha=p.alpha;
            ctx.font=p.size+'px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
            ctx.fillText(fallSymbol,0,0); ctx.restore();
          });
          rafId = requestAnimationFrame(loop);
        }
        rafId = requestAnimationFrame(loop);
        return {
          destroy: function () { cancelAnimationFrame(rafId); cv.destroy(); particles = []; }
        };
      }
    });

    rt.register('sphere', {
      mount: function () {
        var cv = rt.createCanvas(NS + 'sphere-canvas', 2147483626);
        var rotX=0,rotY=0,targetX=0,targetY=0,spherePts=[];
        var mouseFn=function(e){
          targetX=(e.clientY/window.innerHeight-0.5)*0.8;
          targetY=(e.clientX/window.innerWidth-0.5)*0.8;
        };
        document.addEventListener('mousemove', mouseFn, { passive: true });
        function buildSphere() {
          spherePts=[];
          for(var i=0;i<sphereCount;i++){
            var theta=Math.acos(1-2*(i+0.5)/sphereCount), phi=Math.PI*(1+Math.sqrt(5))*i;
            spherePts.push({x:Math.sin(theta)*Math.cos(phi),y:Math.sin(theta)*Math.sin(phi),z:Math.cos(theta)});
          }
        }
        buildSphere();
        var rafId;
        function loop() {
          rotX+=(targetX-rotX)*0.04; rotY+=(targetY-rotY)*0.04+sphereSpeed*0.003;
          var ctx=cv.ctx, W=window.innerWidth, H=window.innerHeight;
          ctx.clearRect(0,0,W,H);
          var cx=W/2,cy=H/2,R=Math.min(W,H)*0.32;
          var cosX=Math.cos(rotX),sinX=Math.sin(rotX),cosY=Math.cos(rotY),sinY=Math.sin(rotY);
          var projected=spherePts.map(function(p){
            var y1=p.y*cosX-p.z*sinX, z1=p.y*sinX+p.z*cosX;
            var x2=p.x*cosY+z1*sinY, z2=-p.x*sinY+z1*cosY;
            var scale=1.8/(2.2-z2);
            return {sx:cx+x2*R*scale,sy:cy+y1*R*scale,z:z2};
          });
          projected.sort(function(a,b){return a.z-b.z;});
          var base=window.matchMedia('(prefers-color-scheme:dark)').matches?'180,210,255':'60,90,200';
          projected.forEach(function(p){
            var brightness=(p.z+1)/2, r=1.2+brightness*2.2;
            ctx.beginPath(); ctx.arc(p.sx,p.sy,r,0,Math.PI*2);
            ctx.fillStyle='rgba('+base+','+(0.15+brightness*0.75)+')'; ctx.fill();
          });
          rafId = requestAnimationFrame(loop);
        }
        rafId = requestAnimationFrame(loop);
        return {
          destroy: function () {
            cancelAnimationFrame(rafId);
            document.removeEventListener('mousemove', mouseFn);
            cv.destroy();
          }
        };
      }
    });

    rt.register('network', {
      mount: function () {
        var cv = rt.createCanvas(NS + 'network-canvas', 2147483625);
        var particles=[], mouse={x:-9999,y:-9999}, MOUSE_R=160;
        for(var i=0;i<networkCount;i++){
          var a=Math.random()*Math.PI*2, spd=0.2+Math.random()*0.5;
          particles.push({x:Math.random()*window.innerWidth,y:Math.random()*window.innerHeight,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,r:1.5+Math.random()*2});
        }
        var mouseFn=function(e){mouse.x=e.clientX;mouse.y=e.clientY;};
        document.addEventListener('mousemove', mouseFn, { passive: true });
        var rafId;
        function loop() {
          var ctx=cv.ctx, W=window.innerWidth, H=window.innerHeight;
          ctx.clearRect(0,0,W,H);
          var base=window.matchMedia('(prefers-color-scheme:dark)').matches?'180,200,255':'60,80,180';
          particles.forEach(function(p){
            var mdx=mouse.x-p.x,mdy=mouse.y-p.y,md=Math.sqrt(mdx*mdx+mdy*mdy);
            if(md<MOUSE_R&&md>0){var f=(1-md/MOUSE_R)*0.018;p.vx+=mdx/md*f;p.vy+=mdy/md*f;}
            p.vx*=0.98;p.vy*=0.98;
            var spd2=Math.sqrt(p.vx*p.vx+p.vy*p.vy);
            if(spd2>1.8){p.vx=p.vx/spd2*1.8;p.vy=p.vy/spd2*1.8;}
            p.x+=p.vx;p.y+=p.vy;
            if(p.x<0)p.x=W;if(p.x>W)p.x=0;if(p.y<0)p.y=H;if(p.y>H)p.y=0;
          });
          for(var i=0;i<particles.length;i++){
            var pi=particles[i];
            for(var j=i+1;j<particles.length;j++){
              var pj=particles[j],dx=pi.x-pj.x,dy=pi.y-pj.y,dist=Math.sqrt(dx*dx+dy*dy);
              if(dist<networkConnect){
                ctx.beginPath();ctx.moveTo(pi.x,pi.y);ctx.lineTo(pj.x,pj.y);
                ctx.strokeStyle='rgba('+base+','+(1-dist/networkConnect)*0.55+')';
                ctx.lineWidth=(1-dist/networkConnect)*1.2;ctx.stroke();
              }
            }
            var mx2=pi.x-mouse.x,my2=pi.y-mouse.y,md2=Math.sqrt(mx2*mx2+my2*my2);
            if(md2<MOUSE_R){
              ctx.beginPath();ctx.moveTo(pi.x,pi.y);ctx.lineTo(mouse.x,mouse.y);
              ctx.strokeStyle='rgba('+base+','+(1-md2/MOUSE_R)*0.75+')';
              ctx.lineWidth=(1-md2/MOUSE_R)*1.5;ctx.stroke();
            }
            ctx.beginPath();ctx.arc(pi.x,pi.y,pi.r,0,Math.PI*2);
            ctx.fillStyle='rgba('+base+',0.85)';ctx.fill();
          }
          if(mouse.x>0){ctx.beginPath();ctx.arc(mouse.x,mouse.y,3.5,0,Math.PI*2);ctx.fillStyle='rgba('+base+',0.95)';ctx.fill();}
          rafId = requestAnimationFrame(loop);
        }
        rafId = requestAnimationFrame(loop);
        return {
          destroy: function () {
            cancelAnimationFrame(rafId);
            document.removeEventListener('mousemove', mouseFn);
            cv.destroy();
          }
        };
      }
    });

    rt.register('threebody', {
      mount: function () {
        var cv = rt.createCanvas(NS + 'threebody-canvas', 2147483623);
        var W = window.innerWidth, H = window.innerHeight;
        var bodies = [
          { x: W*0.35, y: H*0.4,  vx:  0.6, vy:  0.3, m: 2.0, hue: 0   },
          { x: W*0.65, y: H*0.4,  vx: -0.5, vy:  0.4, m: 1.8, hue: 120 },
          { x: W*0.50, y: H*0.65, vx:  0.1, vy: -0.7, m: 1.6, hue: 240 }
        ];
        var trails = [[], [], []];
        var MAX_TRAIL = 320;
        var resizeFn = function () { W = window.innerWidth; H = window.innerHeight; };
        window.addEventListener('resize', resizeFn);
        var rafId;
        function step() {
          var dt = 0.8;
          var ax = [0,0,0], ay = [0,0,0];
          for (var i = 0; i < 3; i++) {
            for (var j = 0; j < 3; j++) {
              if (i === j) continue;
              var dx = bodies[j].x - bodies[i].x;
              var dy = bodies[j].y - bodies[i].y;
              var dist2 = dx*dx + dy*dy;
              var dist = Math.sqrt(dist2) + 8;
              var f = threeBodyG * bodies[i].m * bodies[j].m / (dist2 + 100);
              ax[i] += f * dx / dist;
              ay[i] += f * dy / dist;
            }
          }
          for (var i = 0; i < 3; i++) {
            bodies[i].vx += ax[i] / bodies[i].m * dt;
            bodies[i].vy += ay[i] / bodies[i].m * dt;
            bodies[i].x += bodies[i].vx * dt;
            bodies[i].y += bodies[i].vy * dt;
            if (bodies[i].x < 0)  { bodies[i].x = 0;  bodies[i].vx *= -0.85; }
            if (bodies[i].x > W)  { bodies[i].x = W;  bodies[i].vx *= -0.85; }
            if (bodies[i].y < 0)  { bodies[i].y = 0;  bodies[i].vy *= -0.85; }
            if (bodies[i].y > H)  { bodies[i].y = H;  bodies[i].vy *= -0.85; }
            trails[i].push({ x: bodies[i].x, y: bodies[i].y });
            if (trails[i].length > MAX_TRAIL) trails[i].shift();
          }
        }
        function loop() {
          step();
          var ctx = cv.ctx;
          ctx.clearRect(0, 0, W, H);
          for (var i = 0; i < 3; i++) {
            var trail = trails[i];
            for (var k = 1; k < trail.length; k++) {
              var alpha = k / trail.length * 0.7;
              ctx.beginPath();
              ctx.moveTo(trail[k-1].x, trail[k-1].y);
              ctx.lineTo(trail[k].x, trail[k].y);
              ctx.strokeStyle = 'hsla(' + bodies[i].hue + ',90%,65%,' + alpha + ')';
              ctx.lineWidth = 1.2 * (k / trail.length);
              ctx.stroke();
            }
            var b = bodies[i];
            var grd = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, 10 + b.m * 3);
            grd.addColorStop(0, 'hsla(' + b.hue + ',100%,90%,1)');
            grd.addColorStop(0.4, 'hsla(' + b.hue + ',90%,65%,0.9)');
            grd.addColorStop(1, 'hsla(' + b.hue + ',80%,50%,0)');
            ctx.beginPath();
            ctx.arc(b.x, b.y, 8 + b.m * 2, 0, Math.PI * 2);
            ctx.fillStyle = grd;
            ctx.fill();
          }
          rafId = requestAnimationFrame(loop);
        }
        rafId = requestAnimationFrame(loop);
        return {
          destroy: function () {
            cancelAnimationFrame(rafId);
            window.removeEventListener('resize', resizeFn);
            cv.destroy();
          }
        };
      }
    });

    rt.register('cube', {
      mount: function () {
        var cv = rt.createCanvas(NS + 'cube-canvas', 2147483622);
        var angleX = 0.4, angleY = 0.3, targetX = 0.4, targetY = 0.3;
        var dragging = false, autoSpin = true, lastMX = 0, lastMY = 0;
        var verts = [
          [-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],
          [-1,-1, 1],[1,-1, 1],[1,1, 1],[-1,1, 1]
        ];
        var edges = [
          [0,1],[1,2],[2,3],[3,0],
          [4,5],[5,6],[6,7],[7,4],
          [0,4],[1,5],[2,6],[3,7]
        ];
        var faces = [
          [0,1,2,3],[4,5,6,7],[0,1,5,4],
          [2,3,7,6],[0,3,7,4],[1,2,6,5]
        ];
        var faceHues = [210,260,180,320,30,150];
        function rotX(p,a){ return [p[0], p[1]*Math.cos(a)-p[2]*Math.sin(a), p[1]*Math.sin(a)+p[2]*Math.cos(a)]; }
        function rotY(p,a){ return [p[0]*Math.cos(a)+p[2]*Math.sin(a), p[1], -p[0]*Math.sin(a)+p[2]*Math.cos(a)]; }
        function project(p,W,H){
          var fov=3.5, z=p[2]+fov, scale=Math.min(W,H)*0.22;
          return [W/2+p[0]/z*scale, H/2+p[1]/z*scale, p[2]];
        }
        var mouseDownFn = function(e){ dragging=true; autoSpin=false; lastMX=e.clientX; lastMY=e.clientY; };
        var mouseMoveFn = function(e){ if(!dragging)return; targetY+=(e.clientX-lastMX)*0.008; targetX+=(e.clientY-lastMY)*0.008; lastMX=e.clientX; lastMY=e.clientY; };
        var mouseUpFn = function(){ dragging=false; };
        cv.canvas.style.pointerEvents = 'auto';
        cv.canvas.style.cursor = 'grab';
        cv.canvas.addEventListener('mousedown', mouseDownFn);
        document.addEventListener('mousemove', mouseMoveFn);
        document.addEventListener('mouseup', mouseUpFn);
        var rafId;
        function loop() {
          if (autoSpin) { targetY += cubeSpeed*0.008; targetX += cubeSpeed*0.003; }
          angleX += (targetX-angleX)*0.08;
          angleY += (targetY-angleY)*0.08;
          var ctx = cv.ctx, W = window.innerWidth, H = window.innerHeight;
          ctx.clearRect(0,0,W,H);
          var transformed = verts.map(function(v){ var p=rotX(v,angleX); return rotY(p,angleY); });
          var projected = transformed.map(function(p){ return project(p,W,H); });
          var faceData = faces.map(function(f,fi){
            var avgZ=(transformed[f[0]][2]+transformed[f[1]][2]+transformed[f[2]][2]+transformed[f[3]][2])/4;
            var v0=transformed[f[0]],v1=transformed[f[1]],v2=transformed[f[2]];
            var nz=(v1[0]-v0[0])*(v2[1]-v0[1])-(v1[1]-v0[1])*(v2[0]-v0[0]);
            var nx=(v1[1]-v0[1])*(v2[2]-v0[2])-(v1[2]-v0[2])*(v2[1]-v0[1]);
            var ny=(v1[2]-v0[2])*(v2[0]-v0[0])-(v1[0]-v0[0])*(v2[2]-v0[2]);
            var nl=Math.sqrt(nx*nx+ny*ny+nz*nz);
            var dot=nl>0?nz/nl:0;
            return {fi:fi,f:f,avgZ:avgZ,dot:dot};
          });
          faceData.sort(function(a,b){return a.avgZ-b.avgZ;});
          faceData.forEach(function(fd){
            if(fd.dot>=0)return;
            var pts=fd.f.map(function(vi){return projected[vi];});
            var brightness=Math.round(40+(-fd.dot)*40);
            var alpha=0.18+(-fd.dot)*0.22;
            ctx.beginPath();
            ctx.moveTo(pts[0][0],pts[0][1]);
            for(var k=1;k<pts.length;k++) ctx.lineTo(pts[k][0],pts[k][1]);
            ctx.closePath();
            ctx.fillStyle='hsla('+faceHues[fd.fi]+',70%,'+brightness+'%,'+alpha+')';
            ctx.fill();
          });
          edges.forEach(function(e){
            var a=projected[e[0]],b=projected[e[1]];
            var avgZ=(transformed[e[0]][2]+transformed[e[1]][2])/2;
            var bright=Math.round(55+avgZ*15);
            ctx.beginPath();
            ctx.moveTo(a[0],a[1]);
            ctx.lineTo(b[0],b[1]);
            ctx.strokeStyle='hsla(210,80%,'+bright+'%,0.85)';
            ctx.lineWidth=1.5;
            ctx.stroke();
          });
          projected.forEach(function(p){
            ctx.beginPath();
            ctx.arc(p[0],p[1],3,0,Math.PI*2);
            ctx.fillStyle='rgba(160,200,255,0.9)';
            ctx.fill();
          });
          rafId = requestAnimationFrame(loop);
        }
        rafId = requestAnimationFrame(loop);
        return {
          destroy: function () {
            cancelAnimationFrame(rafId);
            cv.canvas.removeEventListener('mousedown', mouseDownFn);
            document.removeEventListener('mousemove', mouseMoveFn);
            document.removeEventListener('mouseup', mouseUpFn);
            cv.canvas.style.pointerEvents = 'none';
            cv.canvas.style.cursor = '';
            cv.destroy();
          }
        };
      }
    });

    rt.register('blackhole', {
      mount: function () {
        var BH_SMALL_SEL=['p','h1','h2','h3','h4','h5','h6','img','video','svg','picture','button','a','input','textarea','select','label','li','dt','dd','td','th','figure','figcaption','blockquote','pre','code','span','strong','em','b','i','small'].join(',');
        var BH_LARGE_SEL=['article','section','nav','header','footer','aside','form','table','ul','ol','dl','div'].join(',');
        var bhRadius=18,bhGrowRate=0.008;
        var bhParticles=[],bhAbsorbed=[],bhDriftParts=[],bhNovaParticles=[];
        var bhNovaState=null,bhTotalAbsorbed=0,bhEmptyChecks=0;
        var bhScanTimer=null,bhCurrentInterval=1400;
        var cv=rt.createCanvas(NS+'blackhole-canvas',2147483624);
        var rafId;
        var voidScreen=document.getElementById(NS+'void-screen');
        if(voidScreen) voidScreen.remove();
        function bhIsExcluded(el){
          if(!el)return true;
          if(el.id&&el.id.indexOf(NS)===0)return true;
          if(el.classList){for(var c=0;c<el.classList.length;c++){if(el.classList[c].indexOf(NS)===0)return true;}}
          return false;
        }
        function bhHasAbsorbingAncestor(el){
          var cur=el.parentElement;
          while(cur&&cur!==document.body){if(cur.__bhAbsorbing)return true;cur=cur.parentElement;}
          return false;
        }
        function bhIsVisible(el){
          var rect=el.getBoundingClientRect();
          if(rect.width<4||rect.height<4)return false;
          if(rect.right<0||rect.bottom<0)return false;
          if(rect.left>window.innerWidth||rect.top>window.innerHeight)return false;
          var style=window.getComputedStyle(el);
          if(style.display==='none'||style.visibility==='hidden'||parseFloat(style.opacity)<0.05)return false;
          return true;
        }
        function spawnDiskParticles(){
          bhParticles=[];
          for(var i=0;i<60;i++){
            bhParticles.push({angle:Math.random()*Math.PI*2,speed:(Math.random()-0.5)*0.012+0.008,orbit:Math.random(),size:0.8+Math.random()*1.6,alpha:0.4+Math.random()*0.5,hue:Math.round(Math.random()*60+20)});
          }
        }
        spawnDiskParticles();
        function bhSpawnDriftParticles(rect, cx, cy) {
          var count = 6 + Math.floor(Math.random() * 8);
          var now = performance.now();
          for (var i = 0; i < count; i++) {
            var sx = rect.left + Math.random() * rect.width;
            var sy = rect.top + Math.random() * rect.height;
            var dx = cx - sx, dy = cy - sy;
            var dist = Math.sqrt(dx * dx + dy * dy) || 1;
            bhDriftParts.push({
              startX: sx,
              startY: sy,
              x: sx,
              y: sy,
              tx: cx,
              ty: cy,
              startT: now,
              duration: 1100 + Math.random() * 900,
              spiral: (Math.random() - 0.5) * 0.9,
              swirlR: 30 + Math.random() * 70,
              size: 1.8 + Math.random() * 3.5,
              alpha: 0.75 + Math.random() * 0.25,
              hue: Math.round(Math.random() * 80 + 10)
            });
          }
        }

        function updateDrift(ctx) {
          var cx = window.innerWidth / 2, cy = window.innerHeight / 2;
          var now = performance.now();
          bhDriftParts = bhDriftParts.filter(function (p) {
            var t = (now - p.startT) / p.duration;
            if (t >= 1) return false;
            var ease = t * t * (3 - 2 * t);
            var baseX = p.startX + (cx - p.startX) * ease;
            var baseY = p.startY + (cy - p.startY) * ease;
            var ndx = cx - baseX, ndy = cy - baseY;
            var nlen = Math.sqrt(ndx * ndx + ndy * ndy) || 1;
            var perpX = -ndy / nlen, perpY = ndx / nlen;
            var swirl = Math.sin(t * Math.PI) * p.swirlR * p.spiral;
            p.x = baseX + perpX * swirl;
            p.y = baseY + perpY * swirl;
            var distNow = Math.sqrt((cx - p.x) * (cx - p.x) + (cy - p.y) * (cy - p.y));
            if (distNow < bhRadius * 0.55) return false;
            var alpha = p.alpha * (1 - t * 0.85);
            var size = p.size * (1 - t * 0.55);
            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(0.4, size), 0, Math.PI * 2);
            ctx.fillStyle = 'hsla(' + p.hue + ',90%,68%,' + alpha + ')';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(1, size * 2.2), 0, Math.PI * 2);
            ctx.fillStyle = 'hsla(' + p.hue + ',95%,72%,' + (alpha * 0.18) + ')';
            ctx.fill();
            return true;
          });
        }
        function bhGetBatchSize(){
          var bhMaxR=Math.min(window.innerWidth,window.innerHeight)*0.38,progress=Math.min(1,bhRadius/bhMaxR);
          if(progress<0.2)return 1;if(progress<0.4)return 2;if(progress<0.6)return 4;if(progress<0.8)return 6;return 10;
        }
        function bhGetInterval(){
          var bhMaxR=Math.min(window.innerWidth,window.innerHeight)*0.38,progress=Math.min(1,bhRadius/bhMaxR);
          if(progress<0.2)return 1400;if(progress<0.4)return 1000;if(progress<0.6)return 700;if(progress<0.8)return 450;return 250;
        }
        function bhRestartTimer(){
          if(bhScanTimer)clearInterval(bhScanTimer);
          bhCurrentInterval=bhGetInterval();
          bhScanTimer=setInterval(function(){
            bhPickNextVictim();
            var newInterval=bhGetInterval();
            if(newInterval!==bhCurrentInterval)bhRestartTimer();
          },bhCurrentInterval);
        }
        function bhPickNextVictim(){
          if(!cv.canvas)return;if(bhNovaState)return;
          var bhMaxR=Math.min(window.innerWidth,window.innerHeight)*0.38,progress=Math.min(1,bhRadius/bhMaxR);
          var sel=progress<0.45?BH_SMALL_SEL:BH_SMALL_SEL+','+BH_LARGE_SEL;
          var cx=window.innerWidth/2,cy=window.innerHeight/2,attractR=bhRadius*9.0;
          var nodes=document.querySelectorAll(sel),candidates=[];
          for(var i=0;i<nodes.length;i++){
            var el=nodes[i];
            if(el.__bhAbsorbing||bhIsExcluded(el)||bhHasAbsorbingAncestor(el)||!bhIsVisible(el))continue;
            var rect=el.getBoundingClientRect(),ex=rect.left+rect.width/2,ey=rect.top+rect.height/2;
            var dist=Math.sqrt((ex-cx)*(ex-cx)+(ey-cy)*(ey-cy));
            if(dist<attractR)candidates.push({el:el,dist:dist,rect:rect});
          }
          if(candidates.length===0){
            bhEmptyChecks++;
            if(bhEmptyChecks>=3&&bhAbsorbed.length===0&&bhDriftParts.length===0)bhTriggerNova();
            return;
          }
          bhEmptyChecks=0;
          candidates.sort(function(a,b){return a.dist-b.dist;});
          var batch=bhGetBatchSize();
          for(var k=0;k<Math.min(batch,candidates.length);k++)bhEnqueue(candidates[k]);
        }
        function bhEnqueue(pick){
          var el=pick.el,rect=pick.rect,cx=window.innerWidth/2,cy=window.innerHeight/2;
          el.__bhAbsorbing=true;el.style.pointerEvents='none';
          el.style.transition='opacity 1.4s ease, transform 1.4s ease';
          el.style.opacity='0';el.style.transform=(el.style.transform||'')+' scale(0.85)';
          bhSpawnDriftParticles(rect,cx,cy);
          bhTotalAbsorbed++;bhAbsorbed.push({el:el,progress:0,duration:1.6});
        }
        function updateAbsorbed(){
          bhAbsorbed=bhAbsorbed.filter(function(item){
            item.progress+=(1/60)/item.duration;
            if(item.progress>=1){if(item.el.parentNode)item.el.parentNode.removeChild(item.el);return false;}
            return true;
          });
        }
        function bhTriggerNova(){
          if(bhNovaState)return;
          if(bhScanTimer){clearInterval(bhScanTimer);bhScanTimer=null;}
          bhNovaState={phase:'swell',t:0,bhR:bhRadius,expandR:bhRadius,singularR:0};
          bhNovaParticles=[];
        }
        function updateNova(ctx,W,H){
          if(!bhNovaState)return;
          var cx=W/2,cy=H/2;
          bhNovaState.t+=1/60;
          var t=bhNovaState.t;
          if(bhNovaState.phase==='swell'){
            var swellDur=6.0,swellRatio=Math.min(1,t/swellDur);
            var eased=swellRatio<0.5?2*swellRatio*swellRatio:1-Math.pow(-2*swellRatio+2,2)/2;
            var diskFade=Math.max(0,1-swellRatio);
            bhParticles.forEach(function(p){
              p.angle+=p.speed*(1+swellRatio*2);
              var r=bhNovaState.bhR*(1.3+p.orbit*1.2)*(1-swellRatio*0.85);
              var px=cx+Math.cos(p.angle)*r,py=cy+Math.sin(p.angle)*r*0.36;
              ctx.beginPath();ctx.arc(px,py,p.size*(bhNovaState.bhR/55+0.45),0,Math.PI*2);
              ctx.fillStyle='hsla('+p.hue+',92%,66%,'+(p.alpha*diskFade)+')';ctx.fill();
            });
            bhNovaState.expandR=bhNovaState.bhR*(1+eased*0.55);
            var bodyGrd=ctx.createRadialGradient(cx,cy,0,cx,cy,bhNovaState.expandR);
            bodyGrd.addColorStop(0,'hsl(0,0%,8%)');bodyGrd.addColorStop(0.55,'hsl(0,0%,3%)');bodyGrd.addColorStop(1,'rgba(0,0,0,0.96)');
            ctx.beginPath();ctx.arc(cx,cy,bhNovaState.expandR,0,Math.PI*2);ctx.fillStyle=bodyGrd;ctx.fill();
            var haloA=0.15+eased*0.35;
            var haloGrd=ctx.createRadialGradient(cx,cy,bhNovaState.expandR*0.78,cx,cy,bhNovaState.expandR*1.7);
            haloGrd.addColorStop(0,'hsla(0,0%,60%,'+haloA+')');haloGrd.addColorStop(0.5,'hsla(0,0%,30%,'+(haloA*0.3)+')');haloGrd.addColorStop(1,'rgba(0,0,0,0)');
            ctx.beginPath();ctx.arc(cx,cy,bhNovaState.expandR*1.7,0,Math.PI*2);ctx.fillStyle=haloGrd;ctx.fill();
            if(t>=swellDur){bhNovaState.phase='collapse';bhNovaState.t=0;bhNovaState.peakR=bhNovaState.expandR;bhNovaState.swellHaloA=haloA;}
            return;
          }
          if(bhNovaState.phase==='collapse'){
            var collapseDur=4.5,collapseRatio=Math.min(1,t/collapseDur);
            var colEase=collapseRatio<0.4?collapseRatio*collapseRatio*1.5625:1-Math.pow(1-collapseRatio,2.2);
            var curR=bhNovaState.peakR*(1-colEase)+1.5*colEase;
            bhNovaState.singularR=curR;
            var whiteness=Math.max(0,(collapseRatio-0.5)*2);
            var bodyL0=Math.round(8+whiteness*87),bodyL1=Math.round(3+whiteness*57);
            var bodyGrd2=ctx.createRadialGradient(cx,cy,0,cx,cy,curR);
            bodyGrd2.addColorStop(0,'hsl(0,0%,'+bodyL0+'%)');bodyGrd2.addColorStop(0.4,'hsl(0,0%,'+bodyL1+'%)');bodyGrd2.addColorStop(1,'rgba(0,0,0,0.98)');
            ctx.beginPath();ctx.arc(cx,cy,curR,0,Math.PI*2);ctx.fillStyle=bodyGrd2;ctx.fill();
            var baseHaloA=bhNovaState.swellHaloA||0.5,glowA=baseHaloA+collapseRatio*0.45;
            var glowR=curR*(3+(1-collapseRatio)*8);
            var glowGrd=ctx.createRadialGradient(cx,cy,curR,cx,cy,glowR);
            glowGrd.addColorStop(0,'hsla(0,0%,80%,'+glowA+')');glowGrd.addColorStop(0.6,'hsla(0,0%,50%,'+(glowA*0.3)+')');glowGrd.addColorStop(1,'rgba(0,0,0,0)');
            ctx.beginPath();ctx.arc(cx,cy,glowR,0,Math.PI*2);ctx.fillStyle=glowGrd;ctx.fill();
            if(t>=collapseDur){bhNovaState.phase='singularity';bhNovaState.t=0;}
            return;
          }
          if(bhNovaState.phase==='singularity'){
            var singDur=0.8,singRatio=Math.min(1,t/singDur),pulse=Math.sin(t*Math.PI*12)*0.5+0.5;
            ctx.beginPath();ctx.arc(cx,cy,1.5+pulse*3,0,Math.PI*2);ctx.fillStyle='rgba(255,255,255,'+(0.7+pulse*0.3)+')';ctx.fill();
            var glowR2=8+pulse*20,gg=ctx.createRadialGradient(cx,cy,0,cx,cy,glowR2);
            gg.addColorStop(0,'rgba(255,255,255,0.9)');gg.addColorStop(0.4,'rgba(200,160,255,0.4)');gg.addColorStop(1,'rgba(0,0,0,0)');
            ctx.beginPath();ctx.arc(cx,cy,glowR2,0,Math.PI*2);ctx.fillStyle=gg;ctx.fill();
            if(t>=singDur){
              bhNovaState.phase='explode';bhNovaState.t=0;
              for(var i=0;i<520;i++){
                var angle=Math.random()*Math.PI*2,speed=4.0+Math.random()*13.0;
                bhNovaParticles.push({x:cx,y:cy,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,size:1.0+Math.random()*4.5,hue:Math.round(Math.random()*80+10),alpha:1.0,life:0.9+Math.random()*0.9});
              }
            }
            return;
          }
          if(bhNovaState.phase==='explode'){
            var flashA=Math.max(0,1-t*3.5);
            if(flashA>0){ctx.fillStyle='rgba(255,245,210,'+flashA+')';ctx.fillRect(0,0,W,H);}
            bhNovaParticles=bhNovaParticles.filter(function(p){
              p.x+=p.vx;p.y+=p.vy;p.vx*=0.970;p.vy*=0.970;p.alpha-=(1/60)/p.life;
              if(p.alpha<=0)return false;
              ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fillStyle='hsla('+p.hue+',100%,72%,'+p.alpha+')';ctx.fill();
              return true;
            });
            var shockR=t*W*1.4;
            if(shockR>0&&shockR<W*2.2){
              var sg=ctx.createRadialGradient(cx,cy,shockR*0.86,cx,cy,shockR);
              sg.addColorStop(0,'rgba(255,180,60,0)');sg.addColorStop(0.5,'rgba(255,110,20,'+Math.max(0,0.6-t*0.4)+')');sg.addColorStop(1,'rgba(255,40,0,0)');
              ctx.beginPath();ctx.arc(cx,cy,shockR,0,Math.PI*2);ctx.fillStyle=sg;ctx.fill();
            }
            if(t>0.8&&!bhNovaState.voidStartT)bhNovaState.voidStartT=t;
            if(bhNovaState.voidStartT){
              var voidElapsed=t-bhNovaState.voidStartT,voidDur=1.2,voidRatio=Math.min(1,voidElapsed/voidDur);
              var maxR=Math.sqrt(cx*cx+cy*cy)*1.42,voidR=voidRatio*voidRatio*maxR;
              var voidGrd=ctx.createRadialGradient(cx,cy,Math.max(0,voidR-60),cx,cy,voidR);
              voidGrd.addColorStop(0,'rgba(0,0,0,1)');voidGrd.addColorStop(1,'rgba(0,0,0,0)');
              ctx.beginPath();ctx.arc(cx,cy,voidR,0,Math.PI*2);ctx.fillStyle=voidGrd;ctx.fill();
              if(voidRatio>=1){bhNovaState.phase='void';bhNovaState.t=0;}
            }
            return;
          }
          if(bhNovaState.phase==='void'){
            ctx.fillStyle='rgba(0,0,0,1)';ctx.fillRect(0,0,W,H);
            bhNovaState=null;
            cancelAnimationFrame(rafId);rafId=null;
            cv.destroy();
            var vd=document.createElement('div');
            vd.id=NS+'void-screen';
            vd.style.cssText='position:fixed;inset:0;background:#000;z-index:2147483647;display:flex;align-items:center;justify-content:center;';
            vd.innerHTML='<span style="color:rgba(255,255,255,0.07);font-size:13px;font-family:monospace;letter-spacing:0.25em;">void</span>';
            document.body.appendChild(vd);
          }
        }
        function bhLoop(){
          if(!cv.canvas)return;
          var ctx=cv.ctx,W=window.innerWidth,H=window.innerHeight,cx=W/2,cy=H/2;
          var bhMaxR=Math.min(W,H)*0.38;
          ctx.clearRect(0,0,W,H);
          if(bhNovaState){updateNova(ctx,W,H);rafId=requestAnimationFrame(bhLoop);return;}
          if(bhRadius<bhMaxR)bhRadius+=bhGrowRate*(1+bhRadius/bhMaxR*0.5);
          var attractR=bhRadius*9.0;
          for(var ring=4;ring>=1;ring--){
            var ringR=attractR*(ring/4);
            var grd=ctx.createRadialGradient(cx,cy,ringR*0.55,cx,cy,ringR);
            grd.addColorStop(0,'rgba(0,0,0,0)');grd.addColorStop(0.5,'rgba(20,20,20,'+(0.016*(5-ring))+')');grd.addColorStop(1,'rgba(0,0,0,0)');
            ctx.beginPath();ctx.arc(cx,cy,ringR,0,Math.PI*2);ctx.fillStyle=grd;ctx.fill();
          }
          bhParticles.forEach(function(p){
            p.angle+=p.speed;
            var r=bhRadius*(1.3+p.orbit*1.2+Math.sin(p.angle*0.4)*0.25);
            var px=cx+Math.cos(p.angle)*r,py=cy+Math.sin(p.angle)*r*0.36;
            ctx.beginPath();ctx.arc(px,py,p.size*(bhRadius/55+0.45),0,Math.PI*2);
            ctx.fillStyle='hsla('+p.hue+',92%,66%,'+p.alpha+')';ctx.fill();
          });
          var bodyGrd=ctx.createRadialGradient(cx-bhRadius*0.22,cy-bhRadius*0.18,0,cx,cy,bhRadius);
          bodyGrd.addColorStop(0,'rgba(18,18,18,1)');bodyGrd.addColorStop(0.5,'rgba(6,6,6,1)');bodyGrd.addColorStop(0.88,'rgba(2,2,2,0.97)');bodyGrd.addColorStop(1,'rgba(0,0,0,0.93)');
          ctx.beginPath();ctx.arc(cx,cy,bhRadius,0,Math.PI*2);ctx.fillStyle=bodyGrd;ctx.fill();
          var haloGrd=ctx.createRadialGradient(cx,cy,bhRadius*0.82,cx,cy,bhRadius*1.4);
          haloGrd.addColorStop(0,'rgba(160,160,160,0.38)');haloGrd.addColorStop(0.5,'rgba(80,80,80,0.12)');haloGrd.addColorStop(1,'rgba(0,0,0,0)');
          ctx.beginPath();ctx.arc(cx,cy,bhRadius*1.4,0,Math.PI*2);ctx.fillStyle=haloGrd;ctx.fill();
          updateAbsorbed();updateDrift(ctx);
          rafId=requestAnimationFrame(bhLoop);
        }
        bhRestartTimer();
        rafId=requestAnimationFrame(bhLoop);
        return {
          destroy: function () {
            if(rafId){cancelAnimationFrame(rafId);rafId=null;}
            if(bhScanTimer){clearInterval(bhScanTimer);bhScanTimer=null;}
            cv.destroy();
            bhDriftParts=[];bhAbsorbed=[];bhParticles=[];bhNovaParticles=[];bhNovaState=null;
            bhRadius=18;bhTotalAbsorbed=0;bhEmptyChecks=0;
            var voidScreen=document.getElementById(NS+'void-screen');
            if(voidScreen)voidScreen.remove();
          }
        };
      }
    });
  }

  function onDestroyAll() {
    window.removeEventListener('tb-skill:destroy-all', onDestroyAll);
    window.__tbPagePackLoaded = false;
  }

  window.addEventListener('tb-skill:destroy-all', onDestroyAll);
  waitForRuntimeThenInject();

})();