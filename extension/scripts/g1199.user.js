/**
 * ✨ 万能橡皮擦 —— 真实质感 + 深度交互
 * 
 * 橡皮擦外观：圆角矩形、立体渐变、内阴影、噪点纹理、ERASER 标签
 * 交互状态：空闲(立体) → 按下(按压+加深) → 擦除中(自转+碎屑粒子)
 * 被擦元素：粒子化消散，碎裂飞散
 * 右键点击橡皮擦关闭
 */
;(function () {
  'use strict'

  // ============ 可配置样式 ============
  var eraserStyle = {
    width: 52,           // 橡皮擦宽度
    height: 78,          // 橡皮擦高度 (1:1.5 比例)
    borderRadius: 8,     // 圆角
    bodyColor: '#E8E0D8',// 主体颜色 (米灰)
    bodyColorDark: '#D0C8C0', // 按下时颜色
    bandColor: '#5B9BD5',// 条带颜色 (蓝色)
    bandHeight: 18,      // 条带高度
    labelColor: '#fff',  // 标签文字颜色
    labelBg: '#4A86C8',  // 标签背景色
    shadow: '0 4px 16px rgba(0,0,0,0.22), inset 2px 2px 4px rgba(0,0,0,0.1), inset -1px -1px 2px rgba(255,255,255,0.7)',
    shadowActive: '0 2px 8px rgba(0,0,0,0.3), inset 3px 3px 6px rgba(0,0,0,0.15), inset -1px -1px 2px rgba(255,255,255,0.5)',
    crumbColors: ['#D8D0C8', '#C8C0B8', '#B8B0A8', '#E0D8D0'], // 碎屑颜色
    particleColors: ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff922b', '#cc5de8'],
  }

  // ============ 运行时配置 ============
  var CFG = {
    size: 60,             // 擦除范围直径
    fadeDur: 0.45,        // 消失动画时长(s)
    maxParticles: 400,    // 粒子上限
    trailFade: 0.055,     // 擦除轨迹淡出（已禁用）
    viewportRatio: 0.6,   // 超过视口此比例不擦
    erasePerFrame: 2,     // 每帧最多擦除数
    pressAngle: 45,       // 按下时旋转角度
    crumbRate: 0.35,      // 每帧生成碎屑概率
  }

  var size = CFG.size
  var eraserX = 0, eraserY = 0
  var isDragging = false
  var dragOffX = 0, dragOffY = 0
  var prevEX = 0, prevEY = 0
  // spinAngle removed — 固定45°旋转
  var particles = []        // 消散粒子
  var crumbs = []           // 橡皮碎屑
  var erasing = []
  var erased = []
  var cv, ctx, raf
  var eraserEl = null
  var destroyed = false

  function rand(a, b) { return a + Math.random() * (b - a) }
  function pick(arr) { return arr[~~(Math.random() * arr.length)] }

  // ============ 智能音效引擎（Web Audio API）============
  var audioCtx = null
  var frictionSrc = null       // 循环摩擦 BufferSourceNode
  var frictionGain = null      // 摩擦音量 GainNode
  var frictionFilter = null   // 摩擦滤波器
  var frictionFilterHi = null // 摩擦高频滤波器（双段）
  var noiseBufCache = null    // 噪声缓冲区缓存
  var poofPool = []           // 消失音效实例池
  var poofPoolIdx = 0
  var poofPoolSize = 6        // 同时最多 6 个噗声不截断
  var lastEraseCount = 0      // 上一帧擦除数
  var smoothEraseRate = 0     // 平滑擦除速率
  var audioSuspended = false  // 标签页是否隐藏

  // 初始化 AudioContext（首次交互触发，符合自动播放策略）
  function ensureAudio() {
    if (audioCtx) {
      // 恢复被浏览器挂起的上下文
      if (audioCtx.state === 'suspended') audioCtx.resume()
      return
    }
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      // 预缓存噪声缓冲
      noiseBufCache = createNoiseBuf(2, audioCtx.sampleRate)
      // 初始化噗声池
      for (var i = 0; i < poofPoolSize; i++) poofPool.push(null)
      // 监听页面可见性，隐藏时静音
      document.addEventListener('visibilitychange', onVisibilityChange)
    } catch (e) { audioCtx = null }
  }

  function onVisibilityChange() {
    if (document.hidden) {
      audioSuspended = true
      stopFrictionSound()
    } else {
      audioSuspended = false
    }
  }

  // 创建噪声缓冲区（复用缓存）
  function createNoiseBuf(duration, sampleRate) {
    var len = ~~(duration * sampleRate)
    var buf = audioCtx.createBuffer(1, len, sampleRate)
    var data = buf.getChannelData(0)
    for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
    return buf
  }

  function getNoiseBuf() {
    if (!noiseBufCache && audioCtx) noiseBufCache = createNoiseBuf(2, audioCtx.sampleRate)
    return noiseBufCache
  }

  // ---- 音效1: 开始擦除 ---- 短促"嗒"声，模拟橡皮触纸
  function playStartSound() {
    if (!audioCtx || audioSuspended) return
    var now = audioCtx.currentTime
    // 高频短脉冲 + 低频冲击
    var osc = audioCtx.createOscillator()
    var oscGain = audioCtx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(1200, now)
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.06)
    oscGain.gain.setValueAtTime(0.18, now)
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08)
    osc.connect(oscGain); oscGain.connect(audioCtx.destination)
    osc.start(now); osc.stop(now + 0.08)
    // 叠加一个极短的低频"敲击"
    var kick = audioCtx.createOscillator()
    var kickGain = audioCtx.createGain()
    kick.type = 'sine'
    kick.frequency.setValueAtTime(200, now)
    kick.frequency.exponentialRampToValueAtTime(80, now + 0.04)
    kickGain.gain.setValueAtTime(0.1, now)
    kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04)
    kick.connect(kickGain); kickGain.connect(audioCtx.destination)
    kick.start(now); kick.stop(now + 0.04)
  }

  // ---- 音效2: 持续摩擦声 ---- 循环滤波噪声，音量/播放速率动态映射
  function startFrictionSound() {
    if (!audioCtx || audioSuspended || frictionSrc) return
    var buf = getNoiseBuf()
    if (!buf) return

    frictionSrc = audioCtx.createBufferSource()
    frictionSrc.buffer = buf
    frictionSrc.loop = true
    frictionSrc.playbackRate.value = 1.0

    // 双段带通滤波：模拟纸张摩擦质感
    frictionFilter = audioCtx.createBiquadFilter()
    frictionFilter.type = 'bandpass'
    frictionFilter.frequency.value = 2400
    frictionFilter.Q.value = 0.6

    frictionFilterHi = audioCtx.createBiquadFilter()
    frictionFilterHi.type = 'highshelf'
    frictionFilterHi.frequency.value = 3000
    frictionFilterHi.gain.value = -6

    frictionGain = audioCtx.createGain()
    frictionGain.gain.value = 0

    frictionSrc.connect(frictionFilter)
    frictionFilter.connect(frictionFilterHi)
    frictionFilterHi.connect(frictionGain)
    frictionGain.connect(audioCtx.destination)
    frictionSrc.start()
  }

  // 动态更新摩擦音：moveSpeed → 音量 & 播放速率, eraseRate → 音量增强
  function updateFrictionSound(moveSpeed, eraseCountThisFrame) {
    if (!frictionGain || !frictionSrc || audioSuspended) return
    var now = audioCtx.currentTime

    // 平滑擦除速率
    smoothEraseRate += (eraseCountThisFrame - smoothEraseRate) * 0.3

    // 音量 = 移动速度基础 + 擦除强度加成
    var baseVol = Math.min(0.08, moveSpeed * 0.002)
    var eraseBoost = Math.min(0.1, smoothEraseRate * 0.04)
    var vol = baseVol + eraseBoost
    frictionGain.gain.setTargetAtTime(vol, now, 0.06)

    // 播放速率映射：移动越快 → 速率越高 → 音调略升，模拟快速摩擦
    var rate = 0.85 + Math.min(0.5, moveSpeed * 0.012)
    frictionSrc.playbackRate.setTargetAtTime(rate, now, 0.08)

    // 滤波器频率随速度微调：快擦时更亮
    var freq = 1800 + Math.min(2000, moveSpeed * 40)
    frictionFilter.frequency.setTargetAtTime(freq, now, 0.1)

    lastEraseCount = eraseCountThisFrame
  }

  function stopFrictionSound() {
    if (frictionGain) {
      frictionGain.gain.setTargetAtTime(0, audioCtx ? audioCtx.currentTime : 0, 0.12)
    }
    if (frictionSrc) {
      try { frictionSrc.stop(audioCtx ? audioCtx.currentTime + 0.2 : 0) } catch (e) {}
      frictionSrc = null
    }
    frictionGain = null
    frictionFilter = null
    frictionFilterHi = null
    smoothEraseRate = 0
  }

  // ---- 音效3: 元素消失"噗"声 ---- 带空间感（PannerNode）
  function playEraseSound(elRect) {
    if (!audioCtx || audioSuspended) return
    var now = audioCtx.currentTime

    // 使用实例池避免重叠截断
    var slot = poofPoolIdx % poofPoolSize
    poofPoolIdx++

    // 白噪声短脉冲
    var buf = getNoiseBuf()
    if (!buf) return
    var src = audioCtx.createBufferSource()
    // 取一小段噪声
    var startOffset = Math.random() * 1.5
    src.buffer = buf

    // 低通滤波：闷响
    var filter = audioCtx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 1000 + Math.random() * 400
    filter.Q.value = 0.5

    // 空间感：PannerNode 根据元素左右位置调整声像
    var panner = audioCtx.createPanner()
    panner.panningModel = 'equalpower'
    // 将元素中心 X 映射到 -1 ~ 1
    var elCenterX = elRect ? (elRect.left + elRect.width / 2) : window.innerWidth / 2
    var panX = ((elCenterX / window.innerWidth) - 0.5) * 2
    panner.setPosition(panX, 0, 0)

    var gain = audioCtx.createGain()
    gain.gain.setValueAtTime(0.2, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)

    src.connect(filter)
    filter.connect(gain)
    gain.connect(panner)
    panner.connect(audioCtx.destination)
    src.start(now, startOffset, 0.15)
    src.stop(now + 0.15)

    // 叠加低频"噗"音
    var osc = audioCtx.createOscillator()
    var oscGain = audioCtx.createGain()
    osc.type = 'sine'
    var baseFreq = 120 + Math.random() * 40
    osc.frequency.setValueAtTime(baseFreq, now)
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, baseFreq * 0.4), now + 0.1)
    oscGain.gain.setValueAtTime(0.1, now)
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1)

    var oscPanner = audioCtx.createPanner()
    oscPanner.panningModel = 'equalpower'
    oscPanner.setPosition(panX, 0, 0)

    osc.connect(oscGain)
    oscGain.connect(oscPanner)
    oscPanner.connect(audioCtx.destination)
    osc.start(now); osc.stop(now + 0.1)

    poofPool[slot] = src
  }

  // ---- 音效4: 结束擦除 ---- 短促收尾音，音调下降
  function playEndSound() {
    if (!audioCtx || audioSuspended) return
    var now = audioCtx.currentTime
    // 柔和的下行音
    var osc = audioCtx.createOscillator()
    var gain = audioCtx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(500, now)
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.2)
    gain.gain.setValueAtTime(0.1, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22)
    osc.connect(gain); gain.connect(audioCtx.destination)
    osc.start(now); osc.stop(now + 0.22)
  }

  // ============ 生成噪点纹理 SVG ============
  function makeNoiseSVG() {
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">'
    svg += '<filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch"/></filter>'
    svg += '<rect width="100" height="100" filter="url(#n)" opacity="0.06"/></svg>'
    return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")'
  }

  // ============ Canvas ============
  function createCanvas() {
    cv = document.createElement('canvas')
    cv.id = '__erazer_cv__'
    cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:2147483640;pointer-events:none;'
    document.body.appendChild(cv)
    ctx = cv.getContext('2d')
    resize()
  }

  function resize() {
    if (!cv) return
    cv.width = window.innerWidth
    cv.height = window.innerHeight
  }

  // ============ 创建橡皮擦 DOM ============
  function createEraserWidget() {
    var S = eraserStyle

    // 外层容器
    eraserEl = document.createElement('div')
    eraserEl.id = '__erazer_widget__'
    eraserEl.style.cssText = [
      'position:fixed',
      'z-index:2147483647',
      'width:' + S.width + 'px',
      'height:' + S.height + 'px',
      'border-radius:' + S.borderRadius + 'px',
      'cursor:grab',
      'user-select:none',
      '-webkit-user-select:none',
      'touch-action:none',
      'overflow:hidden',
      'transition:box-shadow 0.18s ease, transform 0.18s cubic-bezier(.4,0,.2,1)',
    ].join(';')

    applyIdleStyle()

    // --- 主体（米灰橡皮部分）---
    var body = document.createElement('div')
    body.style.cssText = [
      'position:absolute',
      'inset:0',
      'border-radius:' + S.borderRadius + 'px',
      'background:linear-gradient(160deg, #F0EAE4 0%, ' + S.bodyColor + ' 35%, #D8D0C8 100%)',
      'border-top:1px solid rgba(255,255,255,0.8)',
      'box-shadow:' + S.shadow,
    ].join(';')
    eraserEl.appendChild(body)

    // --- 噪点纹理层 ---
    var noiseLayer = document.createElement('div')
    noiseLayer.style.cssText = [
      'position:absolute',
      'inset:0',
      'border-radius:' + S.borderRadius + 'px',
      'background-image:' + makeNoiseSVG(),
      'background-repeat:repeat',
      'pointer-events:none',
    ].join(';')
    eraserEl.appendChild(noiseLayer)

    // --- 蓝色条带（模拟真实橡皮擦的包装条）---
    var band = document.createElement('div')
    band.style.cssText = [
      'position:absolute',
      'top:6px',
      'left:0',
      'right:0',
      'height:' + S.bandHeight + 'px',
      'background:linear-gradient(180deg, #6BA8E0 0%, ' + S.bandColor + ' 40%, #4A8CC0 100%)',
      'border-top:1px solid rgba(255,255,255,0.3)',
      'border-bottom:1px solid rgba(0,0,0,0.1)',
      'display:flex',
      'align-items:center',
      'justify-content:center',
    ].join(';')
    eraserEl.appendChild(band)

    // --- ERASER 文字 ---
    var label = document.createElement('span')
    label.style.cssText = [
      'font-size:8px',
      'font-weight:900',
      'letter-spacing:2px',
      'color:' + S.labelColor,
      'text-shadow:0 1px 1px rgba(0,0,0,0.2)',
      'pointer-events:none',
      'font-family:Arial,Helvetica,sans-serif',
    ].join(';')
    label.textContent = 'ERASER'
    band.appendChild(label)

    // --- 底部磨损痕迹 ---
    var wear = document.createElement('div')
    wear.style.cssText = [
      'position:absolute',
      'bottom:0',
      'left:4px',
      'right:4px',
      'height:6px',
      'background:repeating-linear-gradient(90deg, transparent, transparent 3px, rgba(0,0,0,0.04) 3px, rgba(0,0,0,0.04) 5px)',
      'border-radius:0 0 ' + (S.borderRadius - 2) + 'px ' + (S.borderRadius - 2) + 'px',
      'pointer-events:none',
    ].join(';')
    eraserEl.appendChild(wear)

    // 初始位置：右上角
    eraserX = window.innerWidth - S.width / 2 - 30
    eraserY = S.height / 2 + 190
    updateEraserPos()

    eraserEl.addEventListener('mousedown', onEraserDown)
    eraserEl.addEventListener('touchstart', onEraserTouchDown, { passive: false })
    eraserEl.addEventListener('contextmenu', onEraserContextMenu)
    document.body.appendChild(eraserEl)
  }

  function applyIdleStyle() {
    var S = eraserStyle
    eraserEl.style.boxShadow = S.shadow
    eraserEl.style.transform = 'rotate(0deg)'
  }

  function applyActiveStyle() {
    var S = eraserStyle
    eraserEl.style.boxShadow = S.shadowActive
    eraserEl.style.transform = 'scale(0.95) translateY(2px) rotate(' + CFG.pressAngle + 'deg)'
    eraserEl.style.cursor = 'grabbing'
  }

  function applyErasingStyle() {
    var S = eraserStyle
    eraserEl.style.boxShadow = S.shadowActive
    // 保持45°旋转
    eraserEl.style.transform = 'scale(0.95) translateY(2px) rotate(' + CFG.pressAngle + 'deg)'
  }

  function updateEraserPos() {
    if (!eraserEl) return
    var S = eraserStyle
    eraserEl.style.left = (eraserX - S.width / 2) + 'px'
    eraserEl.style.top = (eraserY - S.height / 2) + 'px'
  }

  // ============ 拖拽事件 ============
  function onEraserContextMenu(e) {
    e.preventDefault(); e.stopPropagation()
    destroy()
  }

  function onEraserDown(e) {
    e.preventDefault(); e.stopPropagation()
    isDragging = true
    dragOffX = e.clientX - eraserX
    dragOffY = e.clientY - eraserY
    prevEX = eraserX; prevEY = eraserY
    applyActiveStyle()
    cacheDirty = true
    ensureAudio(); playStartSound(); startFrictionSound()
  }

  function onEraserTouchDown(e) {
    e.preventDefault(); e.stopPropagation()
    var t = e.touches[0]
    isDragging = true
    dragOffX = t.clientX - eraserX
    dragOffY = t.clientY - eraserY
    prevEX = eraserX; prevEY = eraserY
    applyActiveStyle()
    cacheDirty = true
    ensureAudio(); playStartSound(); startFrictionSound()
  }

  function onDocMouseMove(e) {
    if (!isDragging) return
    prevEX = eraserX; prevEY = eraserY
    eraserX = e.clientX - dragOffX
    eraserY = e.clientY - dragOffY
    clampPos()
    updateEraserPos()
  }

  function onDocTouchMove(e) {
    if (!isDragging) return
    e.preventDefault()
    var t = e.touches[0]
    prevEX = eraserX; prevEY = eraserY
    eraserX = t.clientX - dragOffX
    eraserY = t.clientY - dragOffY
    clampPos()
    updateEraserPos()
  }

  function clampPos() {
    var S = eraserStyle
    var hw = S.width / 2, hh = S.height / 2
    eraserX = Math.max(hw, Math.min(window.innerWidth - hw, eraserX))
    eraserY = Math.max(hh, Math.min(window.innerHeight - hh, eraserY))
  }

  function onDocUp() {
    if (!isDragging) return
    isDragging = false
    stopFrictionSound()
    playEndSound()
    if (eraserEl) {
      eraserEl.style.cursor = 'grab'
      eraserEl.style.transition = 'box-shadow 0.18s ease, transform 0.3s cubic-bezier(.4,0,.2,1)'
      applyIdleStyle()
      // 恢复 transition
      setTimeout(function () {
        if (eraserEl) eraserEl.style.transition = 'box-shadow 0.18s ease, transform 0.18s cubic-bezier(.4,0,.2,1)'
      }, 320)
    }
  }

  // ============ 元素选择器 ============
  var SMALL_SEL = 'p,h1,h2,h3,h4,h5,h6,img,video,svg,picture,button,a,input,textarea,select,label,li,dt,dd,td,th,figure,figcaption,blockquote,pre,code,span,strong,em,b,i,small'
  var LARGE_SEL = 'article,section,nav,header,footer,aside,form,table,ul,ol,dl,div'
  var ALL_SEL = SMALL_SEL + ',' + LARGE_SEL

  function isExcluded(el) {
    if (!el || !el.parentNode) return true
    if (el === document.body || el === document.documentElement) return true
    if (el.id && el.id.indexOf('__erazer') === 0) return true
    return false
  }

  // ============ 缓存可见元素 ============
  var cachedElements = []
  var cacheDirty = true
  var cacheTimer = null

  function markDirty() { cacheDirty = true }

  function isCustomElement(el) {
    return el.tagName && el.tagName.indexOf('-') !== -1
  }

  // 高效收集自定义元素：BFS 遍历 DOM 树，只检查直接 children
  function collectCustomElements() {
    var results = []
    var queue = [document.body]
    while (queue.length > 0) {
      var node = queue.shift()
      var kids = node.children
      for (var i = 0; i < kids.length; i++) {
        var child = kids[i]
        if (child.id && child.id.indexOf('__erazer') === 0) continue
        if (isCustomElement(child)) results.push(child)
        queue.push(child)
      }
    }
    return results
  }

  function refreshCache() {
    var vw = window.innerWidth, vh = window.innerHeight
    var maxArea = vw * vh * CFG.viewportRatio
    cachedElements = []

    // 标准选择器元素
    var nodes = document.querySelectorAll(ALL_SEL)
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i]
      if (el.__ez_gone || el.__ez_dying || isExcluded(el)) continue
      var anc = el.parentElement; var skip = false
      while (anc && anc !== document.body) { if (anc.__ez_dying) { skip = true; break } anc = anc.parentElement }
      if (skip) continue
      var rect = el.getBoundingClientRect()
      if (rect.width < 4 || rect.height < 4) continue
      if (rect.width * rect.height > maxArea) continue
      var hasErasableChild = false
      var children = el.querySelectorAll(ALL_SEL)
      for (var j = 0; j < children.length; j++) {
        var ch = children[j]
        if (ch.__ez_gone || ch.__ez_dying) continue
        // 只计尺寸足够大的子元素（小图标/文字等不算"可擦子块"）
        var cr = ch.getBoundingClientRect()
        if (cr.width >= size * 0.4 && cr.height >= size * 0.4) { hasErasableChild = true; break }
      }
      // 快速检查直接子元素中的自定义元素
      if (!hasErasableChild) {
        var dk = el.children
        for (var k = 0; k < dk.length; k++) {
          if (!isCustomElement(dk[k]) || dk[k].__ez_gone || dk[k].__ez_dying) continue
          var dkr = dk[k].getBoundingClientRect()
          if (dkr.width >= size * 0.4 && dkr.height >= size * 0.4) { hasErasableChild = true; break }
        }
      }
      if (hasErasableChild) continue
      cachedElements.push({ el: el, rect: rect })
    }

    // 自定义元素
    var customs = collectCustomElements()
    for (var m = 0; m < customs.length; m++) {
      var cel = customs[m]
      if (cel.__ez_gone || cel.__ez_dying || isExcluded(cel)) continue
      var pa = cel.parentElement; var skip2 = false
      while (pa && pa !== document.body) { if (pa.__ez_dying) { skip2 = true; break } pa = pa.parentElement }
      if (skip2) continue
      var crect = cel.getBoundingClientRect()
      if (crect.width < 4 || crect.height < 4) continue
      if (crect.width * crect.height > maxArea) continue
      cachedElements.push({ el: cel, rect: crect })
    }

    cacheDirty = false
  }

  function startCacheRefresh() {
    cacheTimer = setInterval(function () { cacheDirty = true }, 600)
  }

  // ============ 碰撞检测 ============
  function hitTest(rect) {
    var r = size / 2
    var nx = Math.max(rect.left, Math.min(eraserX, rect.right))
    var ny = Math.max(rect.top, Math.min(eraserY, rect.bottom))
    var dx = eraserX - nx, dy = eraserY - ny
    return (dx * dx + dy * dy) < (r * r)
  }

  // ============ 消散粒子（被擦元素飞散）============
  function spawnDissolveParticles(rect) {
    if (particles.length > CFG.maxParticles) return
    var count = Math.min(20, Math.max(6, ~~(rect.width * rect.height / 1000)))
    var dirX = eraserX - prevEX, dirY = eraserY - prevEY
    var baseAngle = Math.atan2(dirY, dirX)
    for (var i = 0; i < count; i++) {
      var sx = rect.left + Math.random() * rect.width
      var sy = rect.top + Math.random() * rect.height
      var angle = baseAngle + rand(-1.8, 1.8)
      var speed = rand(2, 6)
      particles.push({
        x: sx, y: sy,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        size: rand(2, 6), life: 1,
        decay: rand(0.012, 0.035),
        gravity: rand(0.02, 0.07),
        color: pick(eraserStyle.particleColors),
        rotation: rand(0, 6.28), rotSpeed: rand(-0.2, 0.2),
        type: 'shard',
      })
    }
  }

  // ============ 橡皮碎屑（擦除时从橡皮边缘飞出）============
  function spawnCrumbs() {
    if (crumbs.length > 100) return
    var S = eraserStyle
    var count = 1 + ~~(Math.random() * 2)
    var dirX = eraserX - prevEX, dirY = eraserY - prevEY
    var baseAngle = Math.atan2(dirY, dirX)
    for (var i = 0; i < count; i++) {
      // 从橡皮擦底边/边缘飞出
      var ex = eraserX + rand(-S.width * 0.4, S.width * 0.4)
      var ey = eraserY + S.height * 0.3 + rand(0, 4)
      var angle = baseAngle + Math.PI / 2 + rand(-0.8, 0.8)
      var speed = rand(0.8, 2.5)
      crumbs.push({
        x: ex, y: ey,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - rand(0.3, 1),
        size: rand(1.5, 4), life: 1,
        decay: rand(0.008, 0.02),
        gravity: rand(0.04, 0.1),
        color: pick(S.crumbColors),
        rotation: rand(0, 6.28), rotSpeed: rand(-0.15, 0.15),
      })
    }
  }

  // ============ 绘制粒子 ============
  function updateAndDrawParticles() {
    var alive = []
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i]
      p.x += p.vx; p.y += p.vy
      p.vy += p.gravity; p.vx *= 0.98
      p.life -= p.decay; p.rotation += p.rotSpeed
      if (p.life <= 0) continue
      alive.push(p)
      ctx.save()
      ctx.globalAlpha = p.life * 0.9
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rotation)
      ctx.fillStyle = p.color
      var s = Math.max(0.5, p.size * p.life)
      // 不规则碎片形状
      ctx.beginPath()
      ctx.moveTo(-s, -s * 0.5)
      ctx.lineTo(-s * 0.3, -s)
      ctx.lineTo(s * 0.5, -s * 0.7)
      ctx.lineTo(s, s * 0.2)
      ctx.lineTo(s * 0.3, s)
      ctx.lineTo(-s * 0.6, s * 0.5)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    }
    particles = alive

    // 碎屑
    var crumbAlive = []
    for (var j = 0; j < crumbs.length; j++) {
      var c = crumbs[j]
      c.x += c.vx; c.y += c.vy
      c.vy += c.gravity; c.vx *= 0.97
      c.life -= c.decay; c.rotation += c.rotSpeed
      if (c.life <= 0) continue
      crumbAlive.push(c)
      ctx.save()
      ctx.globalAlpha = c.life * 0.7
      ctx.translate(c.x, c.y)
      ctx.rotate(c.rotation)
      ctx.fillStyle = c.color
      var cs = Math.max(0.5, c.size * c.life)
      // 小圆屑
      ctx.beginPath()
      ctx.arc(0, 0, cs, 0, 6.2832)
      ctx.fill()
      ctx.restore()
    }
    crumbs = crumbAlive
    ctx.globalAlpha = 1
  }

  // ============ 擦除元素 ============
  function eraseElement(el, rect) {
    if (el.__ez_gone || el.__ez_dying) return
    el.__ez_dying = true
    el.style.pointerEvents = 'none'
    el.style.transition = 'opacity ' + CFG.fadeDur + 's ease, transform ' + CFG.fadeDur + 's cubic-bezier(.4,0,.2,1)'
    el.style.opacity = '0'
    el.style.transform = (el.style.transform || '') + ' scale(0.15) rotate(' + ~~rand(-30, 30) + 'deg)'
    spawnDissolveParticles(rect)
    playEraseSound(rect)
    erased.push({
      el: el, opacity: '', transform: '', transition: '', pointerEvents: '',
      parent: el.parentNode, nextSibling: el.nextSibling,
    })
    erasing.push({ el: el, progress: 0, duration: CFG.fadeDur })
    markDirty()
  }

  function updateErasing() {
    var alive = []
    for (var i = 0; i < erasing.length; i++) {
      var item = erasing[i]
      item.progress += (1 / 60) / item.duration
      if (item.progress >= 1) {
        if (item.el.parentNode) item.el.remove()
        item.el.__ez_gone = true
        continue
      }
      alive.push(item)
    }
    erasing = alive
  }

  // ============ 主渲染循环 ============
  function loop() {
    if (destroyed) return
    raf = requestAnimationFrame(loop)

    var W = window.innerWidth, H = window.innerHeight
    ctx.clearRect(0, 0, W, H)

    if (isDragging) {
      if (cacheDirty) refreshCache()

      var dx = eraserX - prevEX, dy = eraserY - prevEY
      var moveSpeed = Math.sqrt(dx * dx + dy * dy)

      var erasedThisFrame = 0
      for (var i = 0; i < cachedElements.length; i++) {
        if (erasedThisFrame >= CFG.erasePerFrame) break
        var item = cachedElements[i]
        if (item.el.__ez_gone || item.el.__ez_dying) continue
        if (hitTest(item.rect)) {
          eraseElement(item.el, item.rect)
          erasedThisFrame++
        }
      }

      // 动态更新摩擦音（音量 + 播放速率 + 滤波频率）
      updateFrictionSound(moveSpeed, erasedThisFrame)

      // 擦除中保持45°旋转状态
      applyErasingStyle()

      // 随机碎屑
      if (Math.random() < CFG.crumbRate) spawnCrumbs()
    }

    updateErasing()
    updateAndDrawParticles()
  }

  // ============ 键盘 ============
  function onKD(e) {
    if (e.key === 'Escape') destroy()
    if (e.key === '[') { size = Math.max(20, size - 10) }
    if (e.key === ']') { size = Math.min(200, size + 10) }
    if (e.key === 'r' || e.key === 'R') reset()
  }

  // ============ API ============
  function init() {
    if (cv) destroy()
    destroyed = false
    createCanvas()
    createEraserWidget()
    document.addEventListener('mousemove', onDocMouseMove)
    document.addEventListener('mouseup', onDocUp)
    document.addEventListener('touchmove', onDocTouchMove, { passive: false })
    document.addEventListener('touchend', onDocUp)
    document.addEventListener('keydown', onKD)
    window.addEventListener('resize', function () { resize(); markDirty() })
    startCacheRefresh()
    loop()
    console.log('%c✨ 万能橡皮擦已启动！长按右上角橡皮擦拖拽擦除 | [ ] 调整大小 | R 重置 | ESC 退出', 'color:#5B9BD5;font-size:14px;font-weight:bold')
  }

  function reset() {
    for (var i = erased.length - 1; i >= 0; i--) {
      var rec = erased[i]; var el = rec.el
      el.__ez_gone = false; el.__ez_dying = false
      el.style.opacity = ''; el.style.transform = ''
      el.style.transition = ''; el.style.pointerEvents = ''
      if (!el.parentNode && rec.parent) rec.parent.insertBefore(el, rec.nextSibling)
    }
    erased = []; erasing = []; particles = []; crumbs = []
    markDirty()
    console.log('%c🔄 已重置！', 'color:#6bcb77;font-size:14px;font-weight:bold')
  }

  function destroy() {
    destroyed = true
    if (raf) cancelAnimationFrame(raf)
    if (cacheTimer) clearInterval(cacheTimer)
    stopFrictionSound()
    if (audioCtx) {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      try { audioCtx.close() } catch (e) {}
      audioCtx = null; noiseBufCache = null
    }
    if (eraserEl) {
      eraserEl.removeEventListener('mousedown', onEraserDown)
      eraserEl.removeEventListener('touchstart', onEraserTouchDown)
      eraserEl.removeEventListener('contextmenu', onEraserContextMenu)
      eraserEl.remove(); eraserEl = null
    }
    document.removeEventListener('mousemove', onDocMouseMove)
    document.removeEventListener('mouseup', onDocUp)
    document.removeEventListener('touchmove', onDocTouchMove)
    document.removeEventListener('touchend', onDocUp)
    document.removeEventListener('keydown', onKD)
    if (cv && cv.parentNode) cv.remove()
    cv = ctx = null; particles = []; crumbs = []; erasing = []
  }

  window.initEraser = init
  window.resetEraser = reset
  window.destroyEraser = destroy
  window.setEraserSize = function (v) { size = v }

  init()
})()