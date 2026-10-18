(function () {
  const GUARD = '__polaroid_v5__';
  if (document.getElementById(GUARD)) return;

  /* ─────────────────── STYLES ─────────────────── */
  const style = document.createElement('style');
  style.textContent = [
    '#__polaroid_v5__ *{box-sizing:border-box;margin:0;padding:0;font-family:system-ui,-apple-system,sans-serif}',
    '#__polaroid_v5__{position:fixed;inset:0;z-index:2147483647;background:rgba(20,12,4,.96);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;overflow-y:auto}',
    '#pc-scene{display:flex;flex-direction:column;align-items:center;gap:20px;padding:24px 0}',
    '#pc-camera{width:320px;background:linear-gradient(160deg,#2e2e2e,#1a1a1a);border-radius:18px 18px 26px 26px;box-shadow:0 20px 60px rgba(0,0,0,.8),inset 0 1px 0 rgba(255,255,255,.08);padding:16px 16px 28px}',
    '#pc-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}',
    '#pc-brand{font-size:10px;font-weight:800;letter-spacing:3px;color:rgba(255,255,255,.2);text-transform:uppercase}',
    '#pc-led{width:8px;height:8px;border-radius:50%;background:#333;transition:all .3s}',
    '#pc-led.on{background:#ffcc44;box-shadow:0 0 10px 4px rgba(255,200,50,.55)}',
    '#pc-vf{width:100%;aspect-ratio:1/1;background:#000;border-radius:8px;overflow:hidden;position:relative;box-shadow:inset 0 0 0 2px rgba(255,255,255,.07)}',
    '#pc-video{width:100%;height:100%;object-fit:cover;transform:scaleX(-1);display:block}',
    '#pc-vf-ui{position:absolute;inset:0;pointer-events:none}',
    '.pc-corner{position:absolute;width:16px;height:16px;border-color:rgba(255,220,80,.45);border-style:solid}',
    '.pc-corner.tl{top:8px;left:8px;border-width:2px 0 0 2px}',
    '.pc-corner.tr{top:8px;right:8px;border-width:2px 2px 0 0}',
    '.pc-corner.bl{bottom:8px;left:8px;border-width:0 0 2px 2px}',
    '.pc-corner.br{bottom:8px;right:8px;border-width:0 2px 2px 0}',
    '#pc-vf-tag{position:absolute;bottom:8px;right:10px;font-size:9px;color:rgba(255,220,80,.45);font-weight:700;letter-spacing:1px}',
    '#pc-status{margin-top:10px;text-align:center;font-size:11px;color:rgba(255,255,255,.3);height:15px}',
    '#pc-ctrl{display:flex;justify-content:space-between;align-items:center;margin-top:14px}',
    '#pc-count{font-size:10px;color:rgba(255,220,80,.4);letter-spacing:1px}',
    '#pc-shutter-wrap{display:flex;flex-direction:column;align-items:center;gap:4px}',
    '#pc-shutter{width:54px;height:54px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#f0f0f0,#b0b0b0);border:4px solid #d0d0d0;cursor:pointer;font-size:22px;box-shadow:0 4px 12px rgba(0,0,0,.6),inset 0 2px 4px rgba(255,255,255,.7);transition:transform .1s,box-shadow .1s;display:flex;align-items:center;justify-content:center}',
    '#pc-shutter:active:not(:disabled){transform:scale(.92)}',
    '#pc-shutter:disabled{opacity:.4;cursor:not-allowed;filter:grayscale(1)}',
    '#pc-shutter-lbl{font-size:9px;color:rgba(255,255,255,.2);letter-spacing:2px;font-weight:700}',
    '#pc-close{width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.13);color:rgba(255,255,255,.35);font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s}',
    '#pc-close:hover{background:rgba(255,255,255,.15);color:#fff}',
    '#pc-slot{width:240px;height:6px;background:linear-gradient(90deg,#111,#1e1e1e,#111);border-radius:0 0 4px 4px;margin:-2px auto 0;box-shadow:0 5px 16px rgba(0,0,0,.6)}',
    '#pc-flash{position:fixed;inset:0;z-index:2147483648;background:#fff;opacity:0;pointer-events:none;transition:opacity .05s}',
    '#pc-flash.on{opacity:.88}',
    '#pc-result-wrap{display:none;flex-direction:row;align-items:flex-start;gap:28px;background:rgba(0,0,0,.35);border-radius:16px;padding:24px}',
    '@keyframes pc-eject{from{transform:translateY(-36px) scale(.92);opacity:0}to{transform:translateY(0) scale(1);opacity:1}}',
    '@keyframes pc-develop{0%{filter:brightness(4.5) saturate(0) blur(4px)}45%{filter:brightness(1.8) saturate(.3) blur(.8px)}100%{filter:brightness(1) saturate(1) blur(0)}}',
    '@keyframes pc-scan{from{top:0}to{top:100%}}',
    '#pc-polaroid{width:220px;flex-shrink:0;background:#fff;padding:12px 12px 52px;box-shadow:0 12px 40px rgba(0,0,0,.55);border-radius:2px;position:relative;animation:pc-eject .55s cubic-bezier(.18,.89,.32,1.12)}',
    '#pc-photo{width:100%;aspect-ratio:1;object-fit:cover;display:block;animation:pc-develop 2.6s ease-out forwards}',
    '#pc-caption{position:absolute;bottom:0;left:0;right:0;height:52px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px}',
    '#pc-caption-text{font-size:13px;color:#3a2a14;font-weight:500}',
    '#pc-ts{font-size:10px;color:#8a6030;font-family:monospace;letter-spacing:.5px}',
    '#pc-scanline{position:absolute;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,rgba(80,220,255,.85),transparent);pointer-events:none;display:none;top:0;z-index:10}',
    '#pc-scanline.active{display:block;animation:pc-scan 1.4s ease-in-out forwards}',
    '#pc-report{width:240px;opacity:0;display:flex;flex-direction:column;gap:9px;transition:opacity .6s ease}',
    '#pc-report.show{opacity:1}',
    '#pc-report-title{font-size:13px;font-weight:800;color:#e8c060;letter-spacing:1px;display:flex;align-items:center;gap:6px}',
    '#pc-report-title::before{content:"";display:inline-block;width:3px;height:14px;background:#e8c060;border-radius:2px}',
    '.pm{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);border-radius:8px;padding:8px 10px}',
    '.pm-lbl{font-size:10px;color:rgba(255,255,255,.38);letter-spacing:.5px;margin-bottom:5px}',
    '.pm-bar-bg{height:6px;background:rgba(255,255,255,.08);border-radius:3px;overflow:hidden}',
    '.pm-bar{height:100%;border-radius:3px;width:0;transition:width 1s cubic-bezier(.22,1,.36,1)}',
    '.pm-val{font-size:10px;color:rgba(255,255,255,.4);text-align:right;margin-top:4px}',
    '#pc-total{background:rgba(232,192,96,.08);border:1px solid rgba(232,192,96,.22);border-radius:10px;padding:12px;text-align:center}',
    '#pc-total-lbl{font-size:9px;color:rgba(232,192,96,.5);letter-spacing:1px}',
    '#pc-total-num{font-size:36px;font-weight:800;color:#e8c060;line-height:1.15;margin:4px 0 3px}',
    '#pc-total-text{font-size:11px;color:rgba(255,255,255,.4)}',
    '#pc-save-btn{width:100%;padding:11px;background:linear-gradient(135deg,#e8c060,#c08820);border:none;border-radius:9px;font-size:13px;font-weight:800;color:#1a0e04;cursor:pointer;letter-spacing:.5px;display:none;transition:opacity .2s,transform .12s;box-shadow:0 4px 16px rgba(192,136,32,.4);margin-top:8px}',
    '#pc-save-btn:hover{opacity:.9}',
    '#pc-save-btn:active{transform:scale(.97)}',
    '#pc-save-btn:disabled{opacity:.5;cursor:not-allowed}'
  ].join('');
  document.head.appendChild(style);

  /* ─────────────────── DOM ─────────────────── */
  const root = document.createElement('div');
  root.id = GUARD;
  root.innerHTML = '<div id="pc-flash"></div>' +
    '<div id="pc-scene">' +
      '<div id="pc-camera">' +
        '<div id="pc-top"><span id="pc-brand">Yuze Cam</span><div id="pc-led"></div></div>' +
        '<div id="pc-vf">' +
          '<video id="pc-video" autoplay muted playsinline></video>' +
          '<div id="pc-vf-ui">' +
            '<div class="pc-corner tl"></div><div class="pc-corner tr"></div>' +
            '<div class="pc-corner bl"></div><div class="pc-corner br"></div>' +
            '<span id="pc-vf-tag">&#9679; LIVE</span>' +
          '</div>' +
        '</div>' +
        '<div id="pc-status">正在启动摄像头…</div>' +
        '<div id="pc-ctrl">' +
          '<button id="pc-close" title="关闭">&#10005;</button>' +
          '<div id="pc-shutter-wrap"><button id="pc-shutter" disabled>&#128247;</button><span id="pc-shutter-lbl">SHOOT</span></div>' +
          '<span id="pc-count">No.01</span>' +
        '</div>' +
      '</div>' +
      '<div id="pc-slot"></div>' +
      '<div id="pc-result-wrap">' +
        '<div id="pc-polaroid">' +
          '<img id="pc-photo" alt="" />' +
          '<div id="pc-scanline"></div>' +
          '<div id="pc-caption"><span id="pc-caption-text">每日打卡 &#9728;&#65039;</span><span id="pc-ts"></span></div>' +
        '</div>' +
        '<div id="pc-report">' +
          '<div id="pc-report-title">班味浓度检测报告</div>' +
          '<div class="pm" id="pm-dark"><div class="pm-lbl">&#127761; 黑眼圈指数</div><div class="pm-bar-bg"><div class="pm-bar" style="background:linear-gradient(90deg,#7c3aed,#c084fc)"></div></div><div class="pm-val"></div></div>' +
          '<div class="pm" id="pm-coffee"><div class="pm-lbl">&#9749; 咖啡依赖程度</div><div class="pm-bar-bg"><div class="pm-bar" style="background:linear-gradient(90deg,#92400e,#f59e0b)"></div></div><div class="pm-val"></div></div>' +
          '<div class="pm" id="pm-fish"><div class="pm-lbl">&#128031; 摸鱼潜力评分</div><div class="pm-bar-bg"><div class="pm-bar" style="background:linear-gradient(90deg,#065f46,#34d399)"></div></div><div class="pm-val"></div></div>' +
          '<div class="pm" id="pm-ot"><div class="pm-lbl">&#127769; 加班风险预测</div><div class="pm-bar-bg"><div class="pm-bar" style="background:linear-gradient(90deg,#7f1d1d,#f87171)"></div></div><div class="pm-val"></div></div>' +
          '<div class="pm" id="pm-meeting"><div class="pm-lbl">&#128202; 无效会议概率</div><div class="pm-bar-bg"><div class="pm-bar" style="background:linear-gradient(90deg,#1e3a8a,#60a5fa)"></div></div><div class="pm-val"></div></div>' +
          '<div id="pc-total"><div id="pc-total-lbl">综合班味浓度</div><div id="pc-total-num">--</div><div id="pc-total-text">检测中…</div></div>' +
          '<button id="pc-save-btn">&#128190; 保存到本地 (PNG)</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  document.body.appendChild(root);

  /* ─────────────────── REFS ─────────────────── */
  const Q          = function(id){ return root.querySelector('#' + id); };
  const video      = Q('pc-video');
  const flashEl    = Q('pc-flash');
  const ledEl      = Q('pc-led');
  const statusEl   = Q('pc-status');
  const shutterBtn = Q('pc-shutter');
  const closeBtn   = Q('pc-close');
  const cameraEl   = Q('pc-camera');
  const slotEl     = Q('pc-slot');
  const resultWrap = Q('pc-result-wrap');
  const photoEl    = Q('pc-photo');
  const scanline   = Q('pc-scanline');
  const tsEl       = Q('pc-ts');
  const countEl    = Q('pc-count');
  const report     = Q('pc-report');
  const totalNum   = Q('pc-total-num');
  const totalText  = Q('pc-total-text');
  const saveBtn    = Q('pc-save-btn');

  var stream          = null;
  var capturedDataUrl = null;
  var shotCount       = 0;
  var currentMetrics  = [];
  var capturedDate    = null;

  function pad2(n) { return n < 10 ? '0' + n : '' + n; }
  function rnd(a, b) { return Math.round(a + Math.random() * (b - a)); }
  function wait(ms) { return new Promise(function(r){ setTimeout(r, ms); }); }

  /* ── roundRect polyfill ── */
  function rrect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /* ─────────────────── CAMERA ─────────────────── */
  function startCamera() {
    navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 720 } },
      audio: false
    }).then(function(s) {
      stream = s;
      video.srcObject = s;
      video.play();
      ledEl.classList.add('on');
      statusEl.textContent = '就绪 · 按下快门开始打卡';
      shutterBtn.disabled = false;
    }).catch(function() {
      statusEl.textContent = '⚠️ 摄像头授权失败，请检查权限';
    });
  }

  function stopCamera() {
    if (stream) { stream.getTracks().forEach(function(t){ t.stop(); }); stream = null; }
  }

  /* ─────────────────── SHOOT ─────────────────── */
  function shoot() {
    shutterBtn.disabled = true;
    shutterBtn.textContent = '✨';
    flashEl.classList.add('on');
    setTimeout(function(){ flashEl.classList.remove('on'); }, 120);

    var vw   = video.videoWidth  || 640;
    var vh   = video.videoHeight || 480;
    var size = Math.min(vw, vh);
    var cx   = (vw - size) / 2;
    var cy   = (vh - size) / 2;

    var cvs = document.createElement('canvas');
    cvs.width = size; cvs.height = size;
    var ctx = cvs.getContext('2d');
    ctx.save();
    ctx.translate(size, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, cx, cy, size, size, 0, 0, size, size);
    ctx.restore();

    capturedDate    = new Date();
    capturedDataUrl = cvs.toDataURL('image/jpeg', 0.92);
    shotCount++;

    var Y  = capturedDate.getFullYear();
    var M  = pad2(capturedDate.getMonth() + 1);
    var D  = pad2(capturedDate.getDate());
    var HH = pad2(capturedDate.getHours());
    var mm = pad2(capturedDate.getMinutes());

    tsEl.textContent    = Y + '.' + M + '.' + D + '  ' + HH + ':' + mm;
    countEl.textContent = 'No.' + pad2(shotCount);
    photoEl.src         = capturedDataUrl;

    setTimeout(function() {
      cameraEl.style.display = 'none';
      slotEl.style.display   = 'none';
      resultWrap.style.display = 'flex';
      setTimeout(function() {
        scanline.classList.add('active');
        scanline.addEventListener('animationend', runDetection, { once: true });
      }, 600);
    }, 200);
  }

  /* ─────────────────── DETECTION ─────────────────── */
  var METRICS_CFG = [
    { id: 'pm-dark',    label: '黑眼圈指数',   min: 20, max: 95,  color: '#c084fc' },
    { id: 'pm-coffee',  label: '咖啡依赖程度', min: 30, max: 100, color: '#f59e0b' },
    { id: 'pm-fish',    label: '摸鱼潜力评分', min: 15, max: 90,  color: '#34d399' },
    { id: 'pm-ot',      label: '加班风险预测', min: 10, max: 95,  color: '#f87171' },
    { id: 'pm-meeting', label: '无效会议概率', min: 25, max: 100, color: '#60a5fa' }
  ];

  var VERDICTS = [
    [88, '打工魂已觉醒，班味浓郁如特浓咖啡'],
    [72, '资深社畜认证，班味入骨三分'],
    [55, '标准上班族，班味适中'],
    [38, '尚有生机，班味清淡如白开水'],
    [0,  '躺平高手，班味几近于零']
  ];

  function getVerdict(avg) {
    for (var i = 0; i < VERDICTS.length; i++) {
      if (avg >= VERDICTS[i][0]) return VERDICTS[i][1];
    }
    return VERDICTS[VERDICTS.length - 1][1];
  }

  async function runDetection() {
    currentMetrics = [];
    for (var i = 0; i < METRICS_CFG.length; i++) {
      await wait(260);
      var cfg = METRICS_CFG[i];
      var v   = rnd(cfg.min, cfg.max);
      currentMetrics.push({ label: cfg.label, value: v, color: cfg.color });
      var el = root.querySelector('#' + cfg.id);
      if (el) {
        el.querySelector('.pm-bar').style.width  = v + '%';
        el.querySelector('.pm-val').textContent  = v + '%';
      }
    }
    await wait(420);

    var sum = 0;
    for (var j = 0; j < currentMetrics.length; j++) { sum += currentMetrics[j].value; }
    var avg = Math.round(sum / currentMetrics.length);

    // Animate counter
    var startTs = null;
    var dur = 900;
    function animTick(ts) {
      if (!startTs) startTs = ts;
      var p = Math.min((ts - startTs) / dur, 1);
      var e = 1 - Math.pow(1 - p, 3);
      totalNum.textContent = Math.round(e * avg);
      if (p < 1) requestAnimationFrame(animTick);
    }
    requestAnimationFrame(animTick);

    totalText.textContent = getVerdict(avg);
    report.classList.add('show');
    await wait(900);
    saveBtn.style.display = 'block';
  }

  /* ─────────────────── SAVE (Canvas 合成) ─────────────────── */
  function savePolaroidImage() {
    saveBtn.disabled = true;
    saveBtn.textContent = '⏳ 生成中…';

    // ── 画布尺寸 ──
    var PHOTO  = 800;   // 照片正方形边长（px）
    var PL     = 44;    // 左右留白
    var PR     = 44;
    var PT     = 30;    // 顶部留白
    var CARD_W = PHOTO + PL + PR;

    // 每行报告区高度计算
    var ROW_LABEL_H = 18;   // 标签行
    var BAR_H       = 12;   // 进度条高度
    var BAR_GAP     = 6;    // 标签到进度条间距
    var ROW_BOTTOM  = 10;   // 进度条到下一行间距
    var ROW_H       = ROW_LABEL_H + BAR_GAP + BAR_H + ROW_BOTTOM; // 每条 = 46px

    var SECTION_TOP    = 24;  // 照片底部到报告区顶部
    var HEADER_H       = 62;  // 日期/标题区域高度
    var METRICS_H      = METRICS_CFG.length * ROW_H;   // 5条 = 230px
    var DIVIDER_H      = 20;
    var SCORE_H        = 70;  // 评分区高度
    var FOOTER_H       = 30;
    var BOTTOM_TOTAL   = SECTION_TOP + HEADER_H + METRICS_H + DIVIDER_H + SCORE_H + FOOTER_H;

    var CARD_H = PT + PHOTO + BOTTOM_TOTAL;

    var cvs = document.createElement('canvas');
    cvs.width  = CARD_W;
    cvs.height = CARD_H;
    var ctx = cvs.getContext('2d');

    // ── 1. 相纸底色 ──
    ctx.fillStyle = '#faf6ee';
    ctx.fillRect(0, 0, CARD_W, CARD_H);

    // ── 2. 纸纹 ──
    ctx.save();
    ctx.globalAlpha = 0.018;
    for (var i = 0; i < CARD_H; i += 4) {
      ctx.fillStyle = (i % 8 === 0) ? '#000' : '#fff';
      ctx.fillRect(0, i, CARD_W, 1);
    }
    ctx.restore();

    // ── 3. 加载照片 ──
    var img = new Image();
    img.onload = function() {
      ctx.save();
      ctx.shadowColor   = 'rgba(0,0,0,.22)';
      ctx.shadowBlur    = 14;
      ctx.shadowOffsetY = 5;
      ctx.drawImage(img, PL, PT, PHOTO, PHOTO);
      ctx.restore();

      drawReport(ctx, CARD_W, CARD_H, PL, PR, PT, PHOTO, SECTION_TOP,
                 HEADER_H, ROW_H, ROW_LABEL_H, BAR_GAP, BAR_H,
                 DIVIDER_H, SCORE_H, FOOTER_H);

      // ── 触发下载 ──
      var nd       = capturedDate;
      var filename = 'checkin_' + nd.getFullYear() + pad2(nd.getMonth()+1) + pad2(nd.getDate()) +
                     '_' + pad2(nd.getHours()) + pad2(nd.getMinutes()) + '.png';

      cvs.toBlob(function(blob) {
        var url = URL.createObjectURL(blob);
        var a   = document.createElement('a');
        a.href     = url;
        a.download = filename;
        a.click();
        setTimeout(function(){ URL.revokeObjectURL(url); }, 5000);
        saveBtn.textContent = '✅ 保存成功！';
        saveBtn.disabled    = false;
      }, 'image/png');
    };
    img.onerror = function() {
      saveBtn.textContent = '❌ 图片加载失败';
      saveBtn.disabled = false;
    };
    img.src = capturedDataUrl;
  }

  function drawReport(ctx, CARD_W, CARD_H, PL, PR, PT, PHOTO, SECTION_TOP,
                      HEADER_H, ROW_H, ROW_LABEL_H, BAR_GAP, BAR_H,
                      DIVIDER_H, SCORE_H, FOOTER_H) {

    var BAR_W  = CARD_W - PL - PR;
    var photoBottom = PT + PHOTO;

    // ── 分隔虚线 ──
    ctx.save();
    ctx.strokeStyle = 'rgba(160,120,60,.3)';
    ctx.lineWidth   = 1;
    ctx.setLineDash([5, 8]);
    ctx.beginPath();
    ctx.moveTo(PL, photoBottom + 14);
    ctx.lineTo(CARD_W - PR, photoBottom + 14);
    ctx.stroke();
    ctx.restore();

    // ── 报告区起始 Y ──
    var areaTop = photoBottom + SECTION_TOP;

    // ── 标题（左）+ 日期（右）──
    var nd  = capturedDate;
    var Y   = nd.getFullYear();
    var M   = pad2(nd.getMonth() + 1);
    var D   = pad2(nd.getDate());
    var HH  = pad2(nd.getHours());
    var mi  = pad2(nd.getMinutes());
    var WDS = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
    var WD  = WDS[nd.getDay()];

    ctx.save();
    ctx.textBaseline = 'top';
    ctx.textAlign    = 'left';
    ctx.fillStyle    = '#5a3e18';
    ctx.font         = 'bold 26px Georgia, serif';
    ctx.fillText('每日打卡', PL, areaTop);

    ctx.fillStyle = 'rgba(100,75,30,.5)';
    ctx.font      = '12px Courier New, monospace';
    ctx.fillText('DAILY  CHECK-IN', PL, areaTop + 32);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#7a5520';
    ctx.font      = 'bold 22px Courier New, monospace';
    ctx.fillText(Y + '.' + M + '.' + D, CARD_W - PR, areaTop);

    ctx.fillStyle = 'rgba(100,75,30,.55)';
    ctx.font      = '14px Courier New, monospace';
    ctx.fillText(HH + ':' + mi + '  ' + WD, CARD_W - PR, areaTop + 32);
    ctx.restore();

    // ── 5 条指标进度条 ──
    var barTop = areaTop + HEADER_H;   // 指标区开始 Y

    var COLOR_MAP = {
      '黑眼圈指数':   { start: '#9333ea', end: '#c084fc' },
      '咖啡依赖程度': { start: '#92400e', end: '#f59e0b' },
      '摸鱼潜力评分': { start: '#065f46', end: '#34d399' },
      '加班风险预测': { start: '#7f1d1d', end: '#f87171' },
      '无效会议概率': { start: '#1e3a8a', end: '#60a5fa' }
    };
    var ICON_MAP = {
      '黑眼圈指数':   'DARK CIRCLES',
      '咖啡依赖程度': 'COFFEE DEP.',
      '摸鱼潜力评分': 'SLACK SCORE',
      '加班风险预测': 'OT RISK',
      '无效会议概率': 'MTG WASTE'
    };

    for (var i = 0; i < currentMetrics.length; i++) {
      var m   = currentMetrics[i];
      var val = Math.round(Number(m.value));   // 确保是整数
      var pct = Math.max(0, Math.min(100, val));
      var col = COLOR_MAP[m.label] || { start: '#aaa', end: '#ccc' };
      var lbl = ICON_MAP[m.label]  || m.label;

      var rowY = barTop + i * ROW_H;

      // 标签文字（左）
      ctx.save();
      ctx.fillStyle    = 'rgba(70,50,15,.65)';
      ctx.font         = 'bold 11px Courier New, monospace';
      ctx.textAlign    = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(lbl, PL, rowY + 2);

      // 百分比数值（右）
      ctx.textAlign = 'right';
      ctx.fillText(pct + '%', CARD_W - PR, rowY + 2);
      ctx.restore();

      var bY = rowY + ROW_LABEL_H + BAR_GAP;

      // 底轨
      ctx.save();
      ctx.fillStyle = 'rgba(180,150,90,.15)';
      rrect(ctx, PL, bY, BAR_W, BAR_H, BAR_H / 2);
      ctx.fill();
      ctx.restore();

      // 填充条
      var fillW = Math.round(BAR_W * pct / 100);
      if (fillW > 0) {
        var grad = ctx.createLinearGradient(PL, 0, PL + BAR_W, 0);
        grad.addColorStop(0, col.start);
        grad.addColorStop(1, col.end);
        ctx.save();
        ctx.fillStyle = grad;
        rrect(ctx, PL, bY, fillW, BAR_H, BAR_H / 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // ── 综合评分 ──
    var sum = 0;
    for (var j = 0; j < currentMetrics.length; j++) { sum += currentMetrics[j].value; }
    var avg     = Math.round(sum / currentMetrics.length);
    var verdict = getVerdict(avg);

    var scoreTop = barTop + currentMetrics.length * ROW_H + DIVIDER_H;

    // 分隔线
    ctx.save();
    ctx.strokeStyle = 'rgba(160,120,60,.28)';
    ctx.lineWidth   = 1;
    ctx.setLineDash([4, 7]);
    ctx.beginPath();
    ctx.moveTo(PL, scoreTop - DIVIDER_H / 2);
    ctx.lineTo(CARD_W - PR, scoreTop - DIVIDER_H / 2);
    ctx.stroke();
    ctx.restore();

    // "综合班味浓度" 标签
    ctx.save();
    ctx.fillStyle    = 'rgba(140,100,20,.7)';
    ctx.font         = 'bold 14px system-ui, sans-serif';
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('综合班味浓度', PL, scoreTop);
    ctx.restore();

    // 大数字评分
    ctx.save();
    ctx.fillStyle    = '#c08820';
    ctx.font         = 'bold 48px Georgia, serif';
    ctx.textAlign    = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(avg + '%', CARD_W - PR, scoreTop - 6);
    ctx.restore();

    // 评语
    ctx.save();
    ctx.fillStyle    = 'rgba(80,55,15,.65)';
    ctx.font         = '13px system-ui, sans-serif';
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(verdict, PL, scoreTop + 36);
    ctx.restore();

    // ── 底部水印 ──
    ctx.save();
    ctx.fillStyle    = 'rgba(160,130,70,.25)';
    ctx.font         = '11px Courier New, monospace';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('Yuze Cam  ·  Daily Polaroid Check-in', CARD_W / 2, CARD_H - 10);
    ctx.restore();
  }

  /* ─────────────────── EVENTS ─────────────────── */
  function cleanup() {
    stopCamera();
    root.remove();
    style.remove();
  }

  shutterBtn.addEventListener('click', shoot);
  saveBtn   .addEventListener('click', savePolaroidImage);
  closeBtn  .addEventListener('click', cleanup);
  root      .addEventListener('click', function(e){ if (e.target === root) cleanup(); });

  startCamera();
})();