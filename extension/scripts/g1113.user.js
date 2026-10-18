async function run(args) {
  var PID = 'vsp_2024';
  if (document.getElementById(PID)) {
    document.getElementById(PID).remove();
    document.getElementById(PID + '_s') && document.getElementById(PID + '_s').remove();
    return { ok: true, summary: '视频变速面板已关闭', action: 'removed' };
  }

  /* ===== 样式 ===== */
  var css = '';
  css += '#' + PID + '{position:fixed;bottom:24px;right:24px;z-index:2147483647;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;user-select:none;}';
  css += '#' + PID + ' .vp{width:320px;background:rgba(15,12,41,.92);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-radius:16px;border:1px solid rgba(255,255,255,.1);box-shadow:0 20px 60px rgba(0,0,0,.55),0 0 1px rgba(102,126,234,.3);overflow:hidden;color:#fff;}';
  css += '#' + PID + ' .vh{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;cursor:grab;background:linear-gradient(135deg,rgba(102,126,234,.15),rgba(118,75,162,.15));border-bottom:1px solid rgba(255,255,255,.06);}';
  css += '#' + PID + ' .vh:active{cursor:grabbing;}';
  css += '#' + PID + ' .vt{font-size:14px;font-weight:600;background:linear-gradient(90deg,#667eea,#764ba2);-webkit-background-clip:text;-webkit-text-fill-color:transparent;display:flex;align-items:center;gap:6px;}';
  css += '#' + PID + ' .vb{display:flex;gap:6px;}';
  css += '#' + PID + ' .vbtn{width:28px;height:28px;border:none;border-radius:8px;background:rgba(255,255,255,.08);color:#aaa;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s;}';
  css += '#' + PID + ' .vbtn:hover{background:rgba(255,255,255,.15);color:#fff;}';
  css += '#' + PID + ' .vc{padding:16px;}';
  css += '#' + PID + ' select.vsel{width:100%;padding:8px 12px;margin-bottom:14px;border-radius:10px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);color:#ddd;font-size:13px;outline:none;cursor:pointer;appearance:none;-webkit-appearance:none;}';
  css += '#' + PID + ' select.vsel:focus{border-color:#667eea;}';
  css += '#' + PID + ' select.vsel option{background:#1a1830;color:#ddd;}';
  css += '#' + PID + ' .vsd{text-align:center;margin-bottom:14px;}';
  css += '#' + PID + ' .vsv{font-size:36px;font-weight:700;background:linear-gradient(90deg,#00ff88,#00ccff);-webkit-background-clip:text;-webkit-text-fill-color:transparent;line-height:1;}';
  css += '#' + PID + ' .vsl{font-size:11px;color:#666;margin-top:4px;letter-spacing:2px;text-transform:uppercase;}';
  css += '#' + PID + ' .vsw{margin-bottom:14px;}';
  css += '#' + PID + ' .vswl{display:flex;justify-content:space-between;margin-bottom:8px;}';
  css += '#' + PID + ' .vswl span{font-size:11px;color:#777;}';
  css += '#' + PID + ' input[type=range].vslr{width:100%;height:6px;border-radius:3px;-webkit-appearance:none;appearance:none;background:linear-gradient(90deg,#667eea,#764ba2);outline:none;cursor:pointer;}';
  css += '#' + PID + ' input[type=range].vslr::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 2px 10px rgba(102,126,234,.5);cursor:pointer;transition:transform .15s;}';
  css += '#' + PID + ' input[type=range].vslr::-webkit-slider-thumb:hover{transform:scale(1.2);}';
  css += '#' + PID + ' input[type=range].vslr::-moz-range-thumb{width:22px;height:22px;border-radius:50%;background:#fff;border:none;box-shadow:0 2px 10px rgba(102,126,234,.5);cursor:pointer;}';
  css += '#' + PID + ' .vpres{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px;}';
  css += '#' + PID + ' .vpb{padding:7px 14px;border:1px solid rgba(255,255,255,.15);border-radius:20px;background:rgba(255,255,255,.05);color:#ccc;font-size:13px;cursor:pointer;transition:all .2s;min-width:52px;text-align:center;}';
  css += '#' + PID + ' .vpb:hover{background:rgba(102,126,234,.25);border-color:#667eea;transform:translateY(-1px);color:#fff;}';
  css += '#' + PID + ' .vpb.active{background:linear-gradient(135deg,#667eea,#764ba2);border-color:transparent;color:#fff;box-shadow:0 3px 12px rgba(102,126,234,.35);}';
  css += '#' + PID + ' .vcr{display:flex;align-items:center;gap:8px;padding-top:12px;border-top:1px solid rgba(255,255,255,.08);}';
  css += '#' + PID + ' .vcr label{font-size:12px;color:#999;white-space:nowrap;}';
  css += '#' + PID + ' .vci{width:72px;padding:7px 10px;border:1px solid rgba(255,255,255,.15);border-radius:8px;background:rgba(255,255,255,.06);color:#fff;font-size:13px;text-align:center;outline:none;}';
  css += '#' + PID + ' .vci:focus{border-color:#667eea;}';
  css += '#' + PID + ' .vca{padding:7px 16px;border:none;border-radius:8px;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;font-size:12px;cursor:pointer;transition:all .2s;white-space:nowrap;}';
  css += '#' + PID + ' .vca:hover{transform:translateY(-1px);box-shadow:0 4px 14px rgba(102,126,234,.4);}';
  css += '#' + PID + ' .vks{margin-top:14px;padding:10px 12px;background:rgba(255,255,255,.03);border-radius:10px;border:1px solid rgba(255,255,255,.05);}';
  css += '#' + PID + ' .vks h4{font-size:11px;color:#666;margin-bottom:8px;font-weight:500;}';
  css += '#' + PID + ' .vkl{display:grid;grid-template-columns:repeat(2,1fr);gap:5px;}';
  css += '#' + PID + ' .vki{display:flex;align-items:center;gap:6px;font-size:11px;color:#777;}';
  css += '#' + PID + ' .vki kbd{background:rgba(255,255,255,.08);padding:2px 6px;border-radius:4px;color:#aaa;font-family:monospace;font-size:10px;border:1px solid rgba(255,255,255,.1);}';
  css += '#' + PID + ' .vnv{text-align:center;padding:30px 20px;color:#666;font-size:14px;}';
  css += '#' + PID + ' .vnvi{font-size:36px;margin-bottom:10px;opacity:.4;}';
  css += '#' + PID + ' .vbadge{position:fixed;top:60px;right:24px;z-index:2147483646;background:rgba(0,0,0,.75);color:#00ff88;padding:8px 18px;border-radius:24px;font-size:18px;font-weight:700;pointer-events:none;opacity:0;transition:opacity .3s;backdrop-filter:blur(10px);border:1px solid rgba(0,255,136,.2);}';
  css += '#' + PID + ' .vbadge.show{opacity:1;}';

  var sEl = document.createElement('style');
  sEl.id = PID + '_s';
  sEl.textContent = css;
  document.head.appendChild(sEl);

  /* ===== 面板 DOM ===== */
  var panel = document.createElement('div');
  panel.id = PID;
  panel.innerHTML =
    '<div class="vp">' +
      '<div class="vh">' +
        '<div class="vt"><span>&#127916;</span> 视频变速</div>' +
        '<div class="vb">' +
          '<button class="vbtn" id="' + PID + '_tg" title="收起/展开">&#8722;</button>' +
          '<button class="vbtn" id="' + PID + '_cl" title="关闭">&#10005;</button>' +
        '</div>' +
      '</div>' +
      '<div class="vc" id="' + PID + '_body"></div>' +
    '</div>' +
    '<div class="vbadge" id="' + PID + '_badge"></div>';
  document.body.appendChild(panel);

  /* ===== 状态 ===== */
  var cVideo = null;
  var cSpeed = 1.0;
  var badgeTimer = null;

  function getVideos() { return Array.from(document.querySelectorAll('video')); }

  function setSpeed(v, sp) {
    if (!v) return;
    var s = Math.max(0.1, Math.min(16, parseFloat(sp) || 1));
    v.playbackRate = s;
    cSpeed = s;
    updateDisp(s);
    showBadge(s);
  }

  function updateDisp(sp) {
    var sv = document.querySelector('#' + PID + ' .vsv');
    if (sv) sv.textContent = sp.toFixed(2) + 'x';
    var sl = document.querySelector('#' + PID + ' .vslr');
    if (sl) sl.value = Math.log2(sp);
    document.querySelectorAll('#' + PID + ' .vpb').forEach(function(b) {
      var bv = parseFloat(b.getAttribute('data-sp'));
      b.classList.toggle('active', Math.abs(bv - sp) < 0.01);
    });
  }

  function showBadge(sp) {
    var bd = document.getElementById(PID + '_badge');
    if (!bd) return;
    bd.textContent = sp.toFixed(2) + ' \u00d7';
    bd.classList.add('show');
    clearTimeout(badgeTimer);
    badgeTimer = setTimeout(function() { bd.classList.remove('show'); }, 1200);
  }

  /* ===== 渲染内容 ===== */
  function renderBody() {
    var body = document.getElementById(PID + '_body');
    var videos = getVideos();

    if (videos.length === 0) {
      body.innerHTML = '<div class="vnv"><div class="vnvi">&#127917;</div><div>当前页面未检测到视频</div><div style="font-size:12px;color:#555;margin-top:6px;">打开含视频的页面后自动更新</div></div>';
      return;
    }

    cVideo = videos[0];
    var presets = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];
    var pBtns = '';
    for (var i = 0; i < presets.length; i++) {
      pBtns += '<button class="vpb" data-sp="' + presets[i] + '">' + presets[i] + 'x</button>';
    }

    var vOpts = '';
    for (var j = 0; j < videos.length; j++) {
      var src = videos[j].currentSrc || videos[j].src || ('视频 ' + (j + 1));
      var lbl = src.length > 40 ? src.substring(0, 37) + '...' : src;
      vOpts += '<option value="' + j + '">&#128249; 视频 ' + (j + 1) + ': ' + lbl.replace(/"/g, '&quot;') + '</option>';
    }

    body.innerHTML =
      '<select class="vsel" id="' + PID + '_sel">' + vOpts + '</select>' +
      '<div class="vsd"><div class="vsv" id="' + PID + '_sv">1.00x</div><div class="vsl">Playback Rate</div></div>' +
      '<div class="vsw">' +
        '<div class="vswl"><span>0.25\u00d7</span><span>慢速</span><span>正常</span><span>快速</span><span>16\u00d7</span></div>' +
        '<input type="range" class="vslr" id="' + PID + '_sr" min="-2" max="4" step="0.05" value="0">' +
      '</div>' +
      '<div class="vpres" id="' + PID + '_pres">' + pBtns + '</div>' +
      '<div class="vcr">' +
        '<label>自定义:</label>' +
        '<input type="number" class="vci" id="' + PID + '_ci" min="0.1" max="16" step="0.05" placeholder="倍速">' +
        '<button class="vca" id="' + PID + '_ca">应用</button>' +
      '</div>' +
      '<div class="vks">' +
        '<h4>\u2328\uFE0F 快捷键（聚焦视频时）</h4>' +
        '<div class="vkl">' +
          '<div class="vki"><kbd>[</kbd> 减速 0.1\u00d7</div>' +
          '<div class="vki"><kbd>]</kbd> 加速 0.1\u00d7</div>' +
          '<div class="vki"><kbd>{</kbd> 减速 0.5\u00d7</div>' +
          '<div class="vki"><kbd>}</kbd> 加速 0.5\u00d7</div>' +
          '<div class="vki"><kbd>1</kbd> 重置 1\u00d7</div>' +
          '<div class="vki"><kbd>\u2190</kbd> 后退 5s</div>' +
          '<div class="vki"><kbd>\u2192</kbd> 前进 5s</div>' +
          '<div class="vki"><kbd>Space</kbd> 暂停/播放</div>' +
        '</div>' +
      '</div>';

    bindEvents();
    updateDisp(cVideo.playbackRate || 1);
  }

  /* ===== 事件绑定 ===== */
  function bindEvents() {
    var sel = document.getElementById(PID + '_sel');
    if (sel) sel.addEventListener('change', function() {
      var vs = getVideos();
      cVideo = vs[this.value] || vs[0];
      if (cVideo) updateDisp(cVideo.playbackRate || 1);
    });

    var sr = document.getElementById(PID + '_sr');
    if (sr) sr.addEventListener('input', function() {
      setSpeed(cVideo, Math.pow(2, parseFloat(this.value)));
    });

    document.querySelectorAll('#' + PID + ' .vpb').forEach(function(btn) {
      btn.addEventListener('click', function() {
        setSpeed(cVideo, parseFloat(this.getAttribute('data-sp')));
      });
    });

    var ca = document.getElementById(PID + '_ca');
    var ci = document.getElementById(PID + '_ci');
    if (ca && ci) {
      ca.addEventListener('click', function() {
        var val = parseFloat(ci.value);
        if (!isNaN(val)) setSpeed(cVideo, val);
      });
      ci.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          var val = parseFloat(ci.value);
          if (!isNaN(val)) setSpeed(cVideo, val);
        }
      });
    }
  }

  /* ===== 拖拽 ===== */
  (function() {
    var hdr = panel.querySelector('.vh');
    var dragging = false, sx, sy, ol, ot;

    hdr.addEventListener('mousedown', function(e) {
      if (e.target.closest('.vbtn')) return;
      dragging = true;
      var r = panel.getBoundingClientRect();
      sx = e.clientX; sy = e.clientY; ol = r.left; ot = r.top;
      panel.style.left = ol + 'px';
      panel.style.top = ot + 'px';
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
      e.preventDefault();
    });
    document.addEventListener('mousemove', function(e) {
      if (!dragging) return;
      panel.style.left = (ol + e.clientX - sx) + 'px';
      panel.style.top = (ot + e.clientY - sy) + 'px';
    });
    document.addEventListener('mouseup', function() { dragging = false; });

    hdr.addEventListener('touchstart', function(e) {
      if (e.target.closest('.vbtn')) return;
      dragging = true;
      var t = e.touches[0], r = panel.getBoundingClientRect();
      sx = t.clientX; sy = t.clientY; ol = r.left; ot = r.top;
      panel.style.left = ol + 'px';
      panel.style.top = ot + 'px';
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
    }, { passive: true });
    document.addEventListener('touchmove', function(e) {
      if (!dragging) return;
      var t = e.touches[0];
      panel.style.left = (ol + t.clientX - sx) + 'px';
      panel.style.top = (ot + t.clientY - sy) + 'px';
    }, { passive: true });
    document.addEventListener('touchend', function() { dragging = false; });
  })();

  /* ===== 收起/展开/关闭 ===== */
  document.getElementById(PID + '_tg').addEventListener('click', function() {
    var body = document.getElementById(PID + '_body');
    this.collapsed = !this.collapsed;
    body.style.display = this.collapsed ? 'none' : 'block';
    this.innerHTML = this.collapsed ? '&#43;' : '&#8722;';
  });
  document.getElementById(PID + '_cl').addEventListener('click', function() {
    panel.remove(); sEl.remove();
  });

  /* ===== 全局快捷键 ===== */
  document.addEventListener('keydown', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
    var v = cVideo || getVideos()[0];
    if (!v) return;
    switch (e.key) {
      case '[': setSpeed(v, v.playbackRate - 0.1); break;
      case ']': setSpeed(v, v.playbackRate + 0.1); break;
      case '{': setSpeed(v, v.playbackRate - 0.5); break;
      case '}': setSpeed(v, v.playbackRate + 0.5); break;
      case '1': setSpeed(v, 1); break;
      case 'ArrowLeft': v.currentTime = Math.max(0, v.currentTime - 5); break;
      case 'ArrowRight': v.currentTime = v.currentTime + 5; break;
      case ' ': e.preventDefault(); v.paused ? v.play() : v.pause(); break;
    }
  });

  /* ===== MutationObserver 监控新视频 ===== */
  var lastCount = 0;
  new MutationObserver(function() {
    var cnt = getVideos().length;
    if (cnt !== lastCount) { lastCount = cnt; renderBody(); }
  }).observe(document.body, { childList: true, subtree: true });

  renderBody();

  return {
    ok: true,
    summary: '\u89c6\u9891\u53d8\u901f\u63a7\u5236\u9762\u677f\u5df2\u6253\u5f00',
    features: [
      '\u81ea\u52a8\u68c0\u6d4b\u9875\u9762\u6240\u6709 video \u5143\u7d20',
      '\u53ef\u62d6\u62fd\u6d6e\u5c42\u63a7\u5236\u9762\u677f',
      '\u5bf9\u6570\u6ed1\u5757\uff1a0.25\u00d7 ~ 16\u00d7',
      '\u9884\u8bbe\u500d\u901f\u6309\u94ae',
      '\u81ea\u5b9a\u4e49\u500d\u901f\u8f93\u5165',
      '\u952e\u76d8\u5feb\u6377\u952e [ ] { } 1 \u2190 \u2192 Space',
      '\u65b0\u89c6\u9891\u81ea\u52a8\u68c0\u6d4b\uff08MutationObserver\uff09',
      '\u901f\u5ea6\u53d8\u5316\u65f6\u53f3\u4e0a\u89d2\u6d6e\u6807\u63d0\u793a'
    ],
    videos_found: getVideos().length
  };
}