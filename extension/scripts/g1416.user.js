;(function () {
  'use strict'
  if (window.__wcScoreCardMounted) return
  window.__wcScoreCardMounted = true

  var CONFIG = {
    apiUrl: 'https://matchs.qiumibao.com/live/all.htm',
    pollLive: 30000, pollIdle: 300000, pollError: 15000,
    cardWidth: 340, cardMaxHeight: 480, escDoubleThreshold: 400,
    goalAlertDuration: 120000,
    dragThreshold: 5, visibleMargin: 30
  }

  var shadow, hostEl, listEl, statusEl, refreshBtn
  var prevMatches = [], isExpanded = true, pollTimer = null, countdownTimer = null, isLoading = false
  var workingStrategy = null, errorCount = 0, escFirstPress = 0, isHidden = false
  var activeGoalAlerts = {}, goalAlertTimers = {}, audioCtx = null

  /* ===== 拖拽状态 ===== */
  var isDragging = false, dragMoved = false, dragHandleEl = null
  var dragStartX = 0, dragStartY = 0, hostStartLeft = 0, hostStartTop = 0
  var POS_KEY = 'wcScoreCardPos_v1'

  /* ===== 数据层 ===== */
  function isToday(ts) {
    if (!ts) return false
    var d = new Date(ts * 1000), now = new Date()
    return d.getFullYear() === now.getFullYear() &&
           d.getMonth() === now.getMonth() &&
           d.getDate() === now.getDate()
  }

  function parseMatches(json) {
    if (!json || !Array.isArray(json.matches)) return []
    var now = Math.floor(Date.now() / 1000)
    return json.matches
      .filter(function (m) { return m[1] === 4 })
      .map(function (m) {
        var home = m[5] || [], away = m[6] || []
        var code = m[2], kickoff = m[3] || 0, actualStart = m[4] || 0
        var liveText = String(m[26] || '').trim()
        var roundInfo = String(m[28] || '')
        var description = String(m[8] || '')
        var status, minute
        if (code === 1) { status = 'upcoming'; minute = null }
        else if (code === 2 || code === 4) {
          status = 'live'
          var st = actualStart || kickoff
          minute = st > 0 ? Math.max(1, Math.min(95, Math.floor((now - st) / 60))) : (code === 2 ? 1 : 46)
        }
        else if (code === 3) { status = 'live'; minute = 'HT' }
        else if (code === 5) { status = 'live'; minute = liveText || '加时赛' }
        else if (code === 7) { status = 'live'; minute = liveText || '点球大战' }
        else if (code === 8) { status = 'finished'; minute = null }
        else if (code === 9 || code === 12) { status = 'postponed'; minute = null }
        else if (code === 13) { status = 'cancelled'; minute = null }
        else { status = kickoff > now ? 'upcoming' : 'finished'; minute = null }

        var liveKw = /加时|点球|进行中|下半场|上半场|中场/i
        if (status === 'finished' && liveText && liveKw.test(liveText)) {
          status = 'live'
          minute = liveText
        }

        var isPenalty = false, homePenalty = null, awayPenalty = null
        if (liveText) {
          var penMatch = liveText.match(/现在比分\[(\d+)-(\d+)\]/)
          if (penMatch && /点球/.test(liveText)) {
            isPenalty = true
            homePenalty = parseInt(penMatch[1], 10)
            awayPenalty = parseInt(penMatch[2], 10)
          }
        }
        var sortLayer
        if (status === 'live') sortLayer = 0
        else if (status === 'upcoming') sortLayer = isToday(kickoff) ? 1 : 4
        else if (status === 'finished') sortLayer = 2
        else sortLayer = 3
        return {
          id: m[0], homeTeam: home[1] || '未知', awayTeam: away[1] || '未知',
          homeScore: home[2] || 0, awayScore: away[2] || 0,
          homeHalf: home[3] != null ? home[3] : null, awayHalf: away[3] != null ? away[3] : null,
          homeYellow: home[4] || 0, awayYellow: away[4] || 0,
          homeRed: home[5] || 0, awayRed: away[5] || 0,
          homeRank: home[7] || '', awayRank: away[7] || '',
          status: status, minute: minute, liveText: liveText,
          isPenalty: isPenalty, homePenalty: homePenalty, awayPenalty: awayPenalty,
          kickoffTs: kickoff, roundInfo: roundInfo, description: description,
          sortLayer: sortLayer
        }
      })
      .sort(function (a, b) {
        if (a.sortLayer !== b.sortLayer) return a.sortLayer - b.sortLayer
        if (a.status === 'finished') return b.kickoffTs - a.kickoffTs
        return a.kickoffTs - b.kickoffTs
      })
  }

  function fetchMatches() {
    var strategies = [
      { name: '直连', url: CONFIG.apiUrl, parse: function (t) { return JSON.parse(t) } },
      { name: 'allorigins-get', url: 'https://api.allorigins.win/get?url=' + encodeURIComponent(CONFIG.apiUrl),
        parse: function (t) { return JSON.parse(JSON.parse(t).contents) } },
      { name: 'allorigins-raw', url: 'https://api.allorigins.win/raw?url=' + encodeURIComponent(CONFIG.apiUrl),
        parse: function (t) { return JSON.parse(t) } },
      { name: 'corsproxy', url: 'https://corsproxy.io/?url=' + encodeURIComponent(CONFIG.apiUrl),
        parse: function (t) { return JSON.parse(t) } },
      { name: 'codetabs', url: 'https://api.codetabs.com/v1/proxy/?quest=' + encodeURIComponent(CONFIG.apiUrl),
        parse: function (t) { return JSON.parse(t) } }
    ]
    if (workingStrategy) {
      var idx = strategies.findIndex(function (s) { return s.name === workingStrategy })
      if (idx > 0) { var tmp = strategies[0]; strategies[0] = strategies[idx]; strategies[idx] = tmp }
    }
    function tryNext(i) {
      if (i >= strategies.length) throw new Error('所有策略均失败')
      var s = strategies[i]
      return fetch(s.url, { mode: 'cors' })
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text() })
        .then(function (t) { workingStrategy = s.name; return parseMatches(s.parse(t)) })
        .catch(function (e) { console.log('[摸鱼看球] ' + s.name + '失败:' + e.message); return tryNext(i + 1) })
    }
    return tryNext(0)
  }

  /* ===== 进球检测（含点球大战） ===== */
  function detectGoals(oldList, newList) {
    var goals = [], oldMap = {}
    oldList.forEach(function (m) { oldMap[m.id] = m })
    newList.forEach(function (m) {
      var old = oldMap[m.id]
      if (!old) return
      if (m.homeScore > old.homeScore) goals.push({ team: m.homeTeam, match: m })
      if (m.awayScore > old.awayScore) goals.push({ team: m.awayTeam, match: m })
      if (m.isPenalty && old.isPenalty) {
        if (m.homePenalty != null && old.homePenalty != null && m.homePenalty > old.homePenalty) {
          goals.push({ team: m.homeTeam + ' ⚽点球', match: m })
        }
        if (m.awayPenalty != null && old.awayPenalty != null && m.awayPenalty > old.awayPenalty) {
          goals.push({ team: m.awayTeam + ' ⚽点球', match: m })
        }
      }
    })
    return goals
  }

  /* ===== 进球口哨声 ===== */
  function playCheer() {
    try {
      if (!audioCtx) {
        var AC = window.AudioContext || window.webkitAudioContext
        if (!AC) return
        audioCtx = new AC()
      }
      if (audioCtx.state === 'suspended') audioCtx.resume()
      var ctx = audioCtx, now = ctx.currentTime
      var blasts = [
        { start: 0, dur: 0.18, freq: 2350 },
        { start: 0.28, dur: 0.18, freq: 2350 },
        { start: 0.56, dur: 0.55, freq: 2400 }
      ]
      blasts.forEach(function (b) {
        var t = now + b.start
        var osc = ctx.createOscillator()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(b.freq, t)
        var vib = ctx.createOscillator()
        vib.type = 'sine'
        vib.frequency.value = 28
        var vibGain = ctx.createGain()
        vibGain.gain.value = 35
        vib.connect(vibGain)
        vibGain.connect(osc.frequency)
        var g = ctx.createGain()
        g.gain.setValueAtTime(0, t)
        g.gain.linearRampToValueAtTime(0.35, t + 0.015)
        g.gain.setValueAtTime(0.35, t + b.dur * 0.6)
        g.gain.exponentialRampToValueAtTime(0.001, t + b.dur)
        osc.connect(g)
        g.connect(ctx.destination)
        osc.start(t)
        osc.stop(t + b.dur)
        vib.start(t)
        vib.stop(t + b.dur)
      })
      console.log('[摸鱼看球] 🔊 进球口哨声')
    } catch (e) {
      console.log('[摸鱼看球] 音频播放失败: ' + e.message)
    }
  }

  /* ===== 120秒进球提醒 ===== */
  function triggerGoalAlert(matchId) {
    activeGoalAlerts[matchId] = Date.now()
    applyGoalAlerts()
    if (goalAlertTimers[matchId]) clearTimeout(goalAlertTimers[matchId])
    goalAlertTimers[matchId] = setTimeout(function () {
      delete activeGoalAlerts[matchId]
      delete goalAlertTimers[matchId]
      applyGoalAlerts()
    }, CONFIG.goalAlertDuration)
  }

  function applyGoalAlerts() {
    if (!shadow) return
    var ids = Object.keys(activeGoalAlerts)
    ids.forEach(function (id) {
      var el = listEl.querySelector('.match[data-id="' + id + '"]')
      if (el) el.classList.add('goal-alert')
    })
    var mini = shadow.getElementById('miniIndicator')
    if (mini) mini.classList.toggle('goal-alert', ids.length > 0)
  }

  /* ===== 工具 ===== */
  function esc(str) {
    if (str == null) return ''
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  }
  function formatKickoff(ts) {
    if (!ts) return '待定'
    var d = new Date(ts * 1000), now = new Date()
    var hh = String(d.getHours()).padStart(2, '0'), mm = String(d.getMinutes()).padStart(2, '0')
    var md = (d.getMonth() + 1) + '/' + d.getDate()
    var today = (now.getMonth() + 1) + '/' + now.getDate()
    var tom = new Date(now.getTime() + 86400000)
    var tomMd = (tom.getMonth() + 1) + '/' + tom.getDate()
    if (md === today) return '今天 ' + hh + ':' + mm
    if (md === tomMd) return '明天 ' + hh + ':' + mm
    return md + ' ' + hh + ':' + mm
  }
  function formatCountdown(kickoffTs) {
    var now = Math.floor(Date.now() / 1000)
    var diff = kickoffTs - now
    if (diff <= 0) return '即将开始'
    var days = Math.floor(diff / 86400)
    var hours = Math.floor((diff % 86400) / 3600)
    var mins = Math.floor((diff % 3600) / 60)
    if (days > 0) return days + '天' + hours + '小时后'
    if (hours > 0) return hours + '小时' + mins + '分后'
    if (mins > 0) return mins + '分钟后'
    return '即将开始'
  }

  /* ===== 位置记忆 ===== */
  function savePosition(x, y) {
    try { localStorage.setItem(POS_KEY, x + ',' + y) } catch (e) {}
  }
  function loadPosition() {
    try {
      var s = localStorage.getItem(POS_KEY)
      if (!s) return null
      var p = s.split(',')
      return { x: parseFloat(p[0]), y: parseFloat(p[1]) }
    } catch (e) { return null }
  }
  /* 水平方向：允许部分超出左右边缘，至少保留 visibleMargin 像素可见 */
  function clampX(x) {
    var w = hostEl.offsetWidth || CONFIG.cardWidth
    return Math.max(CONFIG.visibleMargin - w, Math.min(x, window.innerWidth - CONFIG.visibleMargin))
  }
  /* 垂直方向：顶部不允许超出视口（避免被浏览器工具栏遮挡），底部至少保留 visibleMargin 可见 */
  function clampY(y) {
    return Math.max(0, Math.min(y, window.innerHeight - CONFIG.visibleMargin))
  }
  function applySavedPosition() {
    var saved = loadPosition()
    if (!saved) return
    var x = clampX(saved.x), y = clampY(saved.y)
    hostEl.style.left = x + 'px'
    hostEl.style.top = y + 'px'
    hostEl.style.right = 'auto'
  }

  /* ===== 拖拽移动（卡片头部 + 迷你指示器共用） ===== */
  function onDragStart(e) {
    if (e.target.closest && e.target.closest('#refreshBtn')) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    dragHandleEl = e.currentTarget
    isDragging = true
    dragMoved = false
    dragStartX = e.clientX
    dragStartY = e.clientY
    var rect = hostEl.getBoundingClientRect()
    hostStartLeft = rect.left
    hostStartTop = rect.top
    hostEl.style.left = rect.left + 'px'
    hostEl.style.top = rect.top + 'px'
    hostEl.style.right = 'auto'
    document.addEventListener('pointermove', onDragMove)
    document.addEventListener('pointerup', onDragEnd)
    document.addEventListener('pointercancel', onDragEnd)
    e.preventDefault()
  }

  function onDragMove(e) {
    if (!isDragging) return
    var dx = e.clientX - dragStartX
    var dy = e.clientY - dragStartY
    if (!dragMoved && (Math.abs(dx) > CONFIG.dragThreshold || Math.abs(dy) > CONFIG.dragThreshold)) {
      dragMoved = true
      if (dragHandleEl) dragHandleEl.classList.add('dragging')
    }
    if (!dragMoved) return
    var x = clampX(hostStartLeft + dx)
    var y = clampY(hostStartTop + dy)
    hostEl.style.left = x + 'px'
    hostEl.style.top = y + 'px'
  }

  function onDragEnd() {
    if (!isDragging) return
    isDragging = false
    document.removeEventListener('pointermove', onDragMove)
    document.removeEventListener('pointerup', onDragEnd)
    document.removeEventListener('pointercancel', onDragEnd)
    if (dragHandleEl) { dragHandleEl.classList.remove('dragging'); dragHandleEl = null }
    if (dragMoved) {
      savePosition(parseFloat(hostEl.style.left), parseFloat(hostEl.style.top))
      console.log('[摸鱼看球] 悬浮卡已移动并保存位置')
    }
  }

  /* ===== 渲染层 ===== */
  function createCard() {
    hostEl = document.createElement('div')
    hostEl.id = 'wc-score-host'
    hostEl.style.cssText = 'position:fixed;top:16px;right:16px;z-index:2147483647;'
    shadow = hostEl.attachShadow({ mode: 'open' })
    var css =
      '*{box-sizing:border-box;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}' +
      '.card{width:' + CONFIG.cardWidth + 'px;background:rgba(18,18,26,0.96);border-radius:14px;box-shadow:0 8px 32px rgba(0,0,0,0.45),0 0 0 1px rgba(255,255,255,0.06);backdrop-filter:blur(12px);overflow:hidden;color:#e8e8ec;font-size:13px;transition:box-shadow .3s,opacity .2s}' +
      '.card:hover{box-shadow:0 12px 40px rgba(0,0,0,0.55),0 0 0 1px rgba(255,255,255,0.1)}' +
      '.card.collapsed .body{max-height:0;overflow:hidden}.card.collapsed .toggle-icon{transform:rotate(-90deg)}' +
      '.card.hidden{display:none}' +
      '.header{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;cursor:grab;user-select:none;background:linear-gradient(135deg,rgba(76,175,80,0.12),rgba(33,150,243,0.12));border-bottom:1px solid rgba(255,255,255,0.06)}' +
      '.header.dragging{cursor:grabbing}' +
      '.header-left{display:flex;align-items:center;gap:8px}' +
      '.ball-icon{font-size:16px;display:inline-block;animation:wcspin 3s linear infinite}' +
      '@keyframes wcspin{from{transform:rotate(0)}to{transform:rotate(360deg)}}' +
      '.title{font-size:14px;font-weight:700;letter-spacing:.5px;background:linear-gradient(90deg,#4CAF50,#2196F3);-webkit-background-clip:text;-webkit-text-fill-color:transparent}' +
      '.header-right{display:flex;align-items:center;gap:6px}' +
      '.live-dot{width:8px;height:8px;border-radius:50%;background:#ff4444;animation:wcpulse 1.5s ease-in-out infinite;display:none}' +
      '.live-dot.active{display:inline-block}' +
      '@keyframes wcpulse{0%,100%{opacity:1;box-shadow:0 0 6px #ff4444}50%{opacity:.3;box-shadow:0 0 0 #ff4444}}' +
      '.icon-btn{width:26px;height:26px;border:none;border-radius:7px;background:rgba(255,255,255,0.08);color:#aaa;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .2s}' +
      '.icon-btn:hover{background:rgba(255,255,255,0.18);color:#fff}.icon-btn.loading svg{animation:wcspin 1s linear infinite}' +
      '.toggle-icon{display:inline-block;transition:transform .3s;font-size:10px;color:#888}' +
      '.body{max-height:' + CONFIG.cardMaxHeight + 'px;overflow-y:auto;transition:max-height .3s ease}' +
      '.body::-webkit-scrollbar{width:5px}.body::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.12);border-radius:3px}' +
      '.status-bar{padding:6px 14px;font-size:11px;color:#666;text-align:center;border-bottom:1px solid rgba(255,255,255,0.04)}.status-bar.error{color:#ff6b6b}' +
      '.match-list{padding:4px 0}' +
      '.match{padding:10px 14px;border-bottom:1px solid rgba(255,255,255,0.04);transition:background .2s}.match:last-child{border-bottom:none}.match:hover{background:rgba(255,255,255,0.03)}' +
      '.match.goal-flash .score{animation:wcScorePulse 2s ease-out}' +
      '@keyframes wcScorePulse{0%{transform:scale(1.5);color:#4CAF50}100%{transform:scale(1);color:#e8e8ec}}' +
      '.match.goal-alert{animation:wcGoalAlert 3s ease-in-out infinite;border-left:3px solid rgba(76,175,80,0.6);padding-left:11px}' +
      '.match.penalty-phase{animation:wcPenaltyPhase 2s ease-in-out infinite;border-left:3px solid #FFD700;background:linear-gradient(90deg,rgba(255,215,0,0.08),rgba(255,215,0,0.02))}' +
      '@keyframes wcPenaltyPhase{0%,100%{background:rgba(255,215,0,0.06)}50%{background:rgba(255,215,0,0.14)}}' +
      '@keyframes wcGoalAlert{0%,100%{background:rgba(76,175,80,0.06)}50%{background:rgba(76,175,80,0.2)}}' +
      '.match-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}' +
      '.round-info{font-size:10px;color:#555}' +
      '.status-badge{font-size:10px;padding:2px 7px;border-radius:10px;font-weight:600;white-space:nowrap}' +
      '.status-badge.live{background:rgba(255,68,68,0.15);color:#ff6b6b}.status-badge.penalty{background:linear-gradient(135deg,rgba(255,215,0,0.25),rgba(255,152,0,0.2));color:#FFD700;font-weight:800;animation:wcPenBadge 1.5s ease-in-out infinite;letter-spacing:.5px}' +
      '@keyframes wcPenBadge{0%,100%{box-shadow:0 0 4px rgba(255,215,0,0.4)}50%{box-shadow:0 0 10px rgba(255,215,0,0.7)}}' +
      '.status-badge.upcoming{background:rgba(33,150,243,0.15);color:#64b5f6}.status-badge.finished{background:rgba(255,255,255,0.06);color:#777}.status-badge.postponed{background:rgba(255,152,0,0.15);color:#ffb74d}.status-badge.cancelled{background:rgba(255,255,255,0.04);color:#555}' +
      '.score-row{display:flex;align-items:center;gap:8px}' +
      '.team{flex:1;font-size:13px;font-weight:600;color:#ddd;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.team.home{text-align:right}' +
      '.score-box{display:flex;align-items:center;gap:4px;min-width:64px;justify-content:center}' +
      '.score{font-size:18px;font-weight:800;font-variant-numeric:tabular-nums;min-width:20px;text-align:center;color:#e8e8ec;transition:transform .3s,color .3s}.score.home{text-align:right}.score-sep{color:#555;font-size:16px}.score-vs{font-size:12px;color:#666;font-weight:600}' +
      '.rank{font-size:10px;color:#555;margin:0 2px}' +
      '.red-card{display:inline-block;width:13px;height:15px;background:#e53935;border-radius:2px;font-size:9px;color:#fff;text-align:center;line-height:15px;font-weight:700;margin:0 2px;vertical-align:middle}' +
      '.yellow-card{display:inline-block;width:13px;height:15px;background:#ffd600;border-radius:2px;font-size:9px;color:#333;text-align:center;line-height:15px;font-weight:700;margin:0 2px;vertical-align:middle}' +
      '.minute-text{font-size:10px;color:#ff6b6b;font-weight:600;margin-top:4px;text-align:center}' +
      '.minute-text.penalty{font-size:13px;color:#FFD700;font-weight:800;text-shadow:0 0 8px rgba(255,215,0,0.5)}' +
      '.penalty-score-row{display:flex;align-items:center;justify-content:center;gap:6px;margin-top:4px;padding:4px 0;border-top:1px solid rgba(255,215,0,0.15);border-bottom:1px solid rgba(255,215,0,0.15)}' +
      '.penalty-label{font-size:9px;color:#aaa;font-weight:500}' +
      '.penalty-num{font-size:20px;font-weight:900;color:#FFD700;font-variant-numeric:tabular-nums;text-shadow:0 0 10px rgba(255,215,0,0.6);min-width:18px;text-align:center}' +
      '.penalty-sep{color:#FFD700;font-size:14px;font-weight:700}' +
      '.countdown-text{font-size:10px;color:#64b5f6;font-weight:600;margin-top:4px;text-align:center}' +
      '.desc-text{font-size:10px;color:#555;margin-top:3px;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '.empty{padding:30px 14px;text-align:center;color:#666;font-size:12px}' +
      '.mini-indicator{display:none;cursor:grab;width:38px;height:38px;border-radius:50%;background:rgba(18,18,26,0.92);box-shadow:0 4px 14px rgba(0,0,0,0.35),0 0 0 1px rgba(255,255,255,0.06);align-items:center;justify-content:center;font-size:18px;transition:transform .2s,box-shadow .2s;position:relative}' +
      '.mini-indicator.dragging{cursor:grabbing}' +
      '.mini-indicator:hover{transform:scale(1.1);box-shadow:0 6px 20px rgba(0,0,0,0.45),0 0 0 1px rgba(255,255,255,0.12)}.mini-indicator.visible{display:flex}' +
      '.mini-dot{position:absolute;top:3px;right:3px;width:8px;height:8px;border-radius:50%;background:#ff4444;display:none;animation:wcpulse 1.5s ease-in-out infinite}' +
      '.mini-indicator.goal-alert{animation:wcMiniGoalAlert 2s ease-in-out infinite}' +
      '@keyframes wcMiniGoalAlert{0%,100%{box-shadow:0 4px 14px rgba(0,0,0,0.35),0 0 0 1px rgba(255,255,255,0.06),0 0 6px rgba(76,175,80,0.3)}50%{box-shadow:0 4px 14px rgba(0,0,0,0.35),0 0 0 1px rgba(255,255,255,0.06),0 0 22px rgba(76,175,80,0.9)}}'

    shadow.innerHTML =
      '<style>' + css + '</style>' +
      '<div class="card" id="card">' +
        '<div class="header" id="header">' +
          '<div class="header-left"><span class="ball-icon">⚽</span><span class="title">摸鱼看球 · 实时比分</span></div>' +
          '<div class="header-right">' +
            '<span class="live-dot" id="liveDot"></span>' +
            '<button class="icon-btn" id="refreshBtn" title="刷新"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg></button>' +
            '<span class="toggle-icon">▼</span>' +
          '</div>' +
        '</div>' +
        '<div class="body" id="body">' +
          '<div class="status-bar" id="statusBar">正在加载比赛数据...</div>' +
          '<div class="match-list" id="matchList"></div>' +
        '</div>' +
      '</div>' +
      '<div class="mini-indicator" id="miniIndicator" title="拖动移动 · 点击恢复">⚽<div class="mini-dot" id="miniDot"></div></div>'

    document.body.appendChild(hostEl)
    listEl = shadow.getElementById('matchList')
    statusEl = shadow.getElementById('statusBar')
    refreshBtn = shadow.getElementById('refreshBtn')

    shadow.getElementById('header').addEventListener('click', function (e) {
      if (e.target.closest('#refreshBtn')) return
      if (dragMoved) { dragMoved = false; return }
      isExpanded = !isExpanded
      shadow.getElementById('card').classList.toggle('collapsed', !isExpanded)
    })
    shadow.getElementById('header').addEventListener('pointerdown', onDragStart)

    shadow.getElementById('miniIndicator').addEventListener('pointerdown', onDragStart)
    shadow.getElementById('miniIndicator').addEventListener('click', function () {
      if (dragMoved) { dragMoved = false; return }
      toggleVisibility()
    })

    refreshBtn.addEventListener('click', function (e) {
      e.stopPropagation()
      if (!isLoading) poll(true)
    })

    applySavedPosition()
  }

  function renderMatches(matches, goalMatchIds) {
    var liveDot = shadow.getElementById('liveDot')
    liveDot.classList.toggle('active', matches.some(function (m) { return m.status === 'live' }))
    if (matches.length === 0) { listEl.innerHTML = '<div class="empty">暂无比赛数据</div>'; return }
    listEl.innerHTML = matches.map(function (m) {
      var badgeMap = {
        live: '<span class="status-badge live">进行中</span>',
        penalty: '<span class="status-badge penalty">⚽ 点球大战</span>',
        upcoming: '<span class="status-badge upcoming">' + formatKickoff(m.kickoffTs) + '</span>',
        finished: '<span class="status-badge finished">已结束</span>',
        postponed: '<span class="status-badge postponed">延期</span>',
        cancelled: '<span class="status-badge cancelled">取消</span>'
      }
      var scoreArea = m.status === 'upcoming'
        ? '<div class="score-box"><span class="score-vs">VS</span></div>'
        : '<div class="score-box"><span class="score home">' + m.homeScore + '</span><span class="score-sep">-</span><span class="score away">' + m.awayScore + '</span></div>'
      var homeRed = m.homeRed > 0 ? '<span class="red-card">' + m.homeRed + '</span>' : ''
      var awayRed = m.awayRed > 0 ? '<span class="red-card">' + m.awayRed + '</span>' : ''
      var homeYellow = m.homeYellow > 0 ? '<span class="yellow-card">' + m.homeYellow + '</span>' : ''
      var awayYellow = m.awayYellow > 0 ? '<span class="yellow-card">' + m.awayYellow + '</span>' : ''
      var homeRank = m.homeRank ? '<span class="rank">#' + esc(m.homeRank) + '</span>' : ''
      var awayRank = m.awayRank ? '<span class="rank">#' + esc(m.awayRank) + '</span>' : ''
      var minuteText = ''
      if (m.status === 'live' && m.minute != null) {
        var mtClass = m.isPenalty ? ' minute-text penalty' : ' minute-text'
        if (m.minute === 'HT') minuteText = '<div class="' + mtClass + '">中场休息</div>'
        else if (m.liveText) minuteText = '<div class="' + mtClass + '">' + esc(m.liveText) + '</div>'
        else minuteText = '<div class="' + mtClass + '">' + m.minute + "'</div>"
      }
      var penaltyScoreRow = ''
      if (m.isPenalty && m.homePenalty != null && m.awayPenalty != null) {
        penaltyScoreRow = '<div class="penalty-score-row">' +
          '<span class="penalty-label">点球</span>' +
          '<span class="penalty-num">' + m.homePenalty + '</span>' +
          '<span class="penalty-sep">-</span>' +
          '<span class="penalty-num">' + m.awayPenalty + '</span>' +
          '</div>'
      }
      var countdownText = ''
      if (m.status === 'upcoming' && m.kickoffTs) {
        countdownText = '<div class="countdown-text">' + formatCountdown(m.kickoffTs) + '</div>'
      }
      var descText = m.description ? '<div class="desc-text" title="' + esc(m.description) + '">' + esc(m.description) + '</div>' : ''
      var goalClass = (goalMatchIds && goalMatchIds.indexOf(m.id) !== -1) ? ' goal-flash' : ''
      if (m.isPenalty) goalClass += ' penalty-phase'
      var statusBadge = (m.isPenalty && badgeMap.penalty) ? badgeMap.penalty : (badgeMap[m.status] || '')
      return '<div class="match' + goalClass + '" data-id="' + m.id + '">' +
        '<div class="match-header"><span class="round-info">' + esc(m.roundInfo) + '</span>' + statusBadge + '</div>' +
        '<div class="score-row">' +
          '<div class="team home">' + esc(m.homeTeam) + homeRank + homeYellow + homeRed + '</div>' +
          scoreArea +
          '<div class="team away">' + awayRed + awayYellow + awayRank + esc(m.awayTeam) + '</div>' +
        '</div>' + minuteText + penaltyScoreRow + countdownText + descText + '</div>'
    }).join('')
    applyGoalAlerts()
  }

  function startCountdownUpdater() {
    if (countdownTimer) clearInterval(countdownTimer)
    countdownTimer = setInterval(function () {
      if (isHidden || !isExpanded) return
      var els = listEl.querySelectorAll('.match')
      els.forEach(function (el) {
        var id = el.getAttribute('data-id')
        var match = null
        for (var i = 0; i < prevMatches.length; i++) {
          if (String(prevMatches[i].id) === id) { match = prevMatches[i]; break }
        }
        if (match && match.status === 'upcoming' && match.kickoffTs) {
          var cdEl = el.querySelector('.countdown-text')
          if (cdEl) cdEl.textContent = formatCountdown(match.kickoffTs)
        }
      })
    }, 60000)
  }

  /* ===== ESC 双击 + 迷你指示器 ===== */
  function setupEscToggle() {
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return
      var now = Date.now()
      if (now - escFirstPress < CONFIG.escDoubleThreshold) { toggleVisibility(); escFirstPress = 0 }
      else { escFirstPress = now }
    }, true)
  }

  function toggleVisibility() {
    if (!shadow) return
    isHidden = !isHidden
    var card = shadow.getElementById('card'), mini = shadow.getElementById('miniIndicator')
    if (isHidden) { card.classList.add('hidden'); mini.classList.add('visible') }
    else { card.classList.remove('hidden'); mini.classList.remove('visible') }
    /* 切换状态后高度变化，重新约束位置确保完全在可见区域内 */
    var rect = hostEl.getBoundingClientRect()
    hostEl.style.left = clampX(rect.left) + 'px'
    hostEl.style.top = clampY(rect.top) + 'px'
    hostEl.style.right = 'auto'
    applyGoalAlerts()
    console.log('[摸鱼看球] 悬浮卡已' + (isHidden ? '隐藏' : '显示'))
  }

  function updateMiniIndicator(hasLive) {
    var dot = shadow.getElementById('miniDot')
    if (dot) dot.style.display = hasLive ? 'block' : 'none'
  }

  /* ===== 轮询层 ===== */
  function scheduleNext(interval) {
    if (pollTimer) clearTimeout(pollTimer)
    pollTimer = setTimeout(function () { poll() }, interval)
  }

  function poll(isManual) {
    if (isLoading) return
    isLoading = true
    refreshBtn.classList.add('loading')
    if (isManual) statusEl.textContent = '手动刷新中...'
    fetchMatches()
      .then(function (matches) {
        errorCount = 0
        var goals = detectGoals(prevMatches, matches)
        var goalMatchIds = goals.map(function (g) { return g.match.id })
        renderMatches(matches, goalMatchIds)
        var liveCount = matches.filter(function (m) { return m.status === 'live' }).length
        var upCount = matches.filter(function (m) { return m.status === 'upcoming' }).length
        statusEl.textContent = '共 ' + matches.length + ' 场 · 进行中 ' + liveCount + ' · 待开赛 ' + upCount + ' · ' + (workingStrategy || '直连')
        statusEl.classList.remove('error')
        updateMiniIndicator(liveCount > 0)
        goals.forEach(function (g) {
          triggerGoalAlert(g.match.id)
          console.log('[摸鱼看球] ⚽ 进球！' + g.team + ' — ' + g.match.homeTeam + ' ' + g.match.homeScore + ':' + g.match.awayScore + ' ' + g.match.awayTeam)
        })
        if (goals.length > 0) playCheer()
        prevMatches = matches
        var interval = liveCount > 0 ? CONFIG.pollLive : CONFIG.pollIdle
        scheduleNext(interval)
      })
      .catch(function (err) {
        errorCount++
        statusEl.textContent = '加载失败(' + errorCount + ')：' + err.message
        statusEl.classList.add('error')
        scheduleNext(CONFIG.pollError)
      })
      .then(function () {
        isLoading = false
        refreshBtn.classList.remove('loading')
      })
  }

  /* ===== 启动 ===== */
  function init() {
    createCard()
    setupEscToggle()
    startCountdownUpdater()
    poll()
  }

  // 确保 DOM 就绪后再启动
  if (document.body) init()
  else document.addEventListener('DOMContentLoaded', init)

})()