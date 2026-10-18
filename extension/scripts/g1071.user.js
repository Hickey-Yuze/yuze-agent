/**
 * 【B 站听声模式】精简视频页 · 只听声音不看画面
 * 建议生效范围：https://www.bilibili.com/video/*
 *
 * 功能：隐藏视频画面（声音照常播放），用音频卡片替代播放器；
 *       屏蔽评论区、右侧推荐、工具栏、简介、标签、页脚等无关模块；
 *       支持播放/暂停、上一P/下一P、进度拖动、倍速、音量、定时暂停（助眠）。
 * 退出：点击右下角悬浮按钮，或再次运行本脚本即可恢复原页面。
 */
(() => {
  'use strict';

  /* ===== 再次运行 = 退出听声模式 ===== */
  if (window.__BILI_AUDIO_MODE__) {
    window.__BILI_AUDIO_MODE__.off();
    return;
  }

  /* ===== 工具函数 ===== */
  const $ = (s, r) => (r || document).querySelector(s);
  const fmt = t => {
    t = Math.max(0, Math.floor(t || 0));
    const h = (t / 3600) | 0, m = ((t % 3600) / 60) | 0, s = t % 60;
    const p = n => (n < 10 ? '0' : '') + n;
    return h ? h + ':' + p(m) + ':' + p(s) : p(m) + ':' + p(s);
  };
  const initState = () => {
    try { return window.__INITIAL_STATE__ || null; } catch (e) { return null; }
  };
  const curP = () => {
    const p = parseInt(new URL(location.href).searchParams.get('p') || '1', 10);
    return isFinite(p) && p > 0 ? p : 1;
  };
  const pageCount = () => {
    const s = initState();
    return ((s && s.videoData && s.videoData.pages) || []).length;
  };

  /* ===== 图标（内联 SVG） ===== */
  const I_PLAY  = '<svg viewBox="0 0 24 24"><path d="M8 5.1v13.8L19 12z"/></svg>';
  const I_PAUSE = '<svg viewBox="0 0 24 24"><path d="M6.5 5h3.6v14H6.5zM13.9 5h3.6v14h-3.6z"/></svg>';
  const I_PREV  = '<svg viewBox="0 0 24 24"><path d="M6.5 6h2.4v12H6.5zM19.5 6.4v11.2L11.4 12z"/></svg>';
  const I_NEXT  = '<svg viewBox="0 0 24 24"><path d="M15.1 6h2.4v12h-2.4zM4.5 6.4v11.2L12.6 12z"/></svg>';
  const I_HEAD  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.5V12a8 8 0 0 1 16 0v2.5"/><rect x="3" y="13.5" width="4.6" height="6.5" rx="2.2"/><rect x="16.4" y="13.5" width="4.6" height="6.5" rx="2.2"/></svg>';
  const I_VOL   = '<svg viewBox="0 0 24 24"><path d="M3.5 9v6h4l5 4.5v-15l-5 4.5h-4z"/><path d="M15.8 8.8a4.6 4.6 0 0 1 0 6.4M18.2 6.2a8.2 8.2 0 0 1 0 11.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

  /* ===== 样式 ===== */
  const CSS = `
  /* ---------- 页面精简：屏蔽评论区、推荐、工具栏、简介、标签、页脚 ---------- */
  #commentapp, #comment, .comment-container, .reply-warp,
  .right-container, #reco_list,
  #biliMainFooter, .international-footer,
  .video-toolbar-container, .video-toolbar-left, .video-toolbar-right,
  .video-desc-container, .video-info-detail, .video-data,
  .tag-container, .video-tag-container { display: none !important; }

  /* 左栏拉满整行 */
  .left-container { width: 100% !important; max-width: 100% !important; flex: 1 1 auto !important; }

  /* 原播放器整体透明（仍在后台正常运行、正常出声） */
  #bilibili-player, .bpx-player-container {
    opacity: 0 !important;
    pointer-events: none !important;
  }

  /* ---------- 音频卡片 ---------- */
  #bili-audio-card {
    position: absolute; inset: 0; z-index: 999;
    display: flex; align-items: center; justify-content: center;
    border-radius: 12px; overflow: hidden; cursor: pointer;
    background: linear-gradient(150deg, #1d2033 0%, #141625 60%, #0e101b 100%);
    color: #fff;
    font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  /* 封面模糊做背景，营造音乐播放器氛围 */
  .bac-bg {
    position: absolute; inset: -40px;
    background-size: cover; background-position: center;
    filter: blur(36px) brightness(.45) saturate(1.2);
    opacity: .9;
  }
  .bac-bg::after {
    content: ''; position: absolute; inset: 0;
    background: linear-gradient(160deg, rgba(20,22,37,.5), rgba(10,12,20,.85));
  }
  .bac-inner {
    position: relative; z-index: 1;
    display: flex; align-items: center; gap: 40px;
    padding: 24px 40px; width: 100%; max-width: 900px; box-sizing: border-box;
  }

  /* 旋转唱片 */
  .bac-disc {
    position: relative; flex-shrink: 0;
    width: clamp(120px, 22vh, 210px); aspect-ratio: 1; border-radius: 50%;
    background:
      radial-gradient(circle at 35% 30%, rgba(255,255,255,.12), transparent 45%),
      conic-gradient(#262a40, #343a5c, #262a40, #443055, #262a40);
    box-shadow: 0 14px 44px rgba(0,0,0,.55), inset 0 0 0 5px rgba(0,0,0,.4), inset 0 0 30px rgba(0,0,0,.5);
    display: flex; align-items: center; justify-content: center;
    animation: bac-spin 14s linear infinite; animation-play-state: paused;
  }
  #bili-audio-card.playing .bac-disc { animation-play-state: running; }
  .bac-cover { width: 70%; aspect-ratio: 1; border-radius: 50%; object-fit: cover; box-shadow: 0 4px 18px rgba(0,0,0,.5); }
  .bac-center { position: absolute; width: 11%; aspect-ratio: 1; border-radius: 50%; background: #e8e9ef; box-shadow: 0 0 0 4px rgba(0,0,0,.35); }
  @keyframes bac-spin { to { transform: rotate(360deg); } }

  /* 信息区 */
  .bac-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 10px; }
  .bac-badge {
    display: inline-flex; align-items: center; gap: 7px; align-self: flex-start;
    font-size: 12px; letter-spacing: .06em; color: #ffb3c8;
    background: rgba(251,114,153,.14); border: 1px solid rgba(251,114,153,.35);
    padding: 3px 10px; border-radius: 999px;
  }
  .bac-badge i { width: 6px; height: 6px; border-radius: 50%; background: #fb7299; box-shadow: 0 0 8px #fb7299; animation: bac-pulse 1.6s ease-in-out infinite; }
  @keyframes bac-pulse { 50% { opacity: .35; } }
  .bac-title {
    font-size: clamp(17px, 2.2vw, 24px); font-weight: 700; line-height: 1.35;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    text-shadow: 0 2px 12px rgba(0,0,0,.5);
  }
  .bac-sub { font-size: 13px; color: rgba(255,255,255,.55); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  /* 进度条 */
  .bac-progress { display: flex; align-items: center; gap: 12px; margin-top: 6px; }
  .bac-time { font-size: 12px; color: rgba(255,255,255,.6); font-variant-numeric: tabular-nums; width: 46px; text-align: center; flex-shrink: 0; }
  .bac-bar { position: relative; flex: 1; height: 16px; cursor: pointer; }
  .bac-bar::before { content: ''; position: absolute; left: 0; right: 0; top: 50%; margin-top: -2px; height: 4px; border-radius: 99px; background: rgba(255,255,255,.16); }
  .bac-buffered, .bac-played { position: absolute; left: 0; top: 50%; margin-top: -2px; height: 4px; border-radius: 99px; }
  .bac-buffered { background: rgba(255,255,255,.28); width: 0; }
  .bac-played { background: linear-gradient(90deg, #fb7299, #a78bfa); width: 0; }
  .bac-thumb {
    position: absolute; right: -5px; top: 50%; transform: translateY(-50%) scale(.85);
    width: 10px; height: 10px; border-radius: 50%; background: #fff;
    box-shadow: 0 1px 6px rgba(0,0,0,.5); transition: transform .15s;
  }
  .bac-bar:hover .bac-thumb { transform: translateY(-50%) scale(1.15); }

  /* 控制区 */
  .bac-ctrls { display: flex; align-items: center; gap: 10px; margin-top: 4px; flex-wrap: wrap; }
  .bac-btn {
    display: inline-flex; align-items: center; justify-content: center;
    border: none; cursor: pointer; background: rgba(255,255,255,.1);
    color: #fff; border-radius: 50%; width: 38px; height: 38px; padding: 0;
    transition: background .18s, transform .12s;
  }
  .bac-btn:hover { background: rgba(255,255,255,.2); }
  .bac-btn:active { transform: scale(.92); }
  .bac-btn svg { width: 17px; height: 17px; fill: currentColor; }
  .bac-main-btn {
    width: 52px; height: 52px;
    background: linear-gradient(135deg, #fb7299, #a78bfa);
    box-shadow: 0 6px 20px rgba(251,114,153,.4);
  }
  .bac-main-btn:hover { background: linear-gradient(135deg, #fc85a9, #b79bff); }
  .bac-main-btn svg { width: 22px; height: 22px; }
  .bac-text { width: auto; height: 30px; padding: 0 12px; border-radius: 999px; font-size: 12px; background: rgba(255,255,255,.08); font-variant-numeric: tabular-nums; }
  .bac-text.on { background: rgba(251,114,153,.28); color: #ffd6e2; }
  .bac-sep { width: 1px; height: 18px; background: rgba(255,255,255,.18); margin: 0 4px; }
  .bac-vol { display: flex; align-items: center; gap: 8px; color: rgba(255,255,255,.75); }
  .bac-vol svg { width: 16px; height: 16px; fill: currentColor; flex-shrink: 0; }
  .bac-vol-range {
    -webkit-appearance: none; appearance: none;
    width: 84px; height: 4px; border-radius: 99px; outline: none; cursor: pointer;
    background: linear-gradient(90deg, #fb7299 var(--v, 100%), rgba(255,255,255,.2) var(--v, 100%));
  }
  .bac-vol-range::-webkit-slider-thumb {
    -webkit-appearance: none; appearance: none;
    width: 11px; height: 11px; border-radius: 50%; background: #fff;
    box-shadow: 0 1px 4px rgba(0,0,0,.4);
  }

  /* 右下角悬浮退出按钮 */
  #bili-audio-fab {
    position: fixed; right: 22px; bottom: 84px; z-index: 2147483000;
    width: 46px; height: 46px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    background: linear-gradient(135deg, #fb7299, #7b6cf6);
    color: #fff; cursor: pointer;
    box-shadow: 0 6px 22px rgba(251,114,153,.5);
    transition: transform .2s;
  }
  #bili-audio-fab:hover { transform: scale(1.1) rotate(8deg); }
  #bili-audio-fab svg { width: 21px; height: 21px; }

  /* 轻提示 */
  #bili-audio-toast {
    position: fixed; left: 50%; bottom: 150px; transform: translateX(-50%) translateY(16px);
    z-index: 2147483000;
    background: rgba(20,22,35,.92); color: #fff;
    border: 1px solid rgba(255,255,255,.12);
    padding: 9px 18px; border-radius: 10px;
    font-size: 13px; opacity: 0; pointer-events: none;
    transition: opacity .25s, transform .25s;
    box-shadow: 0 8px 30px rgba(0,0,0,.35);
  }
  #bili-audio-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }

  /* 小屏适配 */
  @media (max-width: 760px) {
    .bac-inner { flex-direction: column; text-align: center; gap: 18px; padding: 18px; }
    .bac-badge { align-self: center; }
    .bac-main { align-items: center; }
    .bac-progress { width: 100%; }
    .bac-ctrls { justify-content: center; }
  }`;

  /* ===== 搭建界面 ===== */
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  document.head.appendChild(styleEl);

  const card = document.createElement('div');
  card.id = 'bili-audio-card';
  card.innerHTML = `
    <div class="bac-bg"></div>
    <div class="bac-inner">
      <div class="bac-disc" title="点击播放 / 暂停">
        <img class="bac-cover" alt="">
        <div class="bac-center"></div>
      </div>
      <div class="bac-main">
        <div class="bac-badge"><i></i>听声模式 · 只放声音</div>
        <div class="bac-title">正在加载…</div>
        <div class="bac-sub"></div>
        <div class="bac-progress">
          <span class="bac-time bac-cur">00:00</span>
          <div class="bac-bar">
            <div class="bac-buffered"></div>
            <div class="bac-played"><span class="bac-thumb"></span></div>
          </div>
          <span class="bac-time bac-dur">00:00</span>
        </div>
        <div class="bac-ctrls">
          <button class="bac-btn" data-act="prev" title="上一P">${I_PREV}</button>
          <button class="bac-btn bac-main-btn" data-act="toggle" title="播放 / 暂停">${I_PLAY}</button>
          <button class="bac-btn" data-act="next" title="下一P">${I_NEXT}</button>
          <span class="bac-sep"></span>
          <button class="bac-btn bac-text" data-act="rate" title="切换倍速">1x</button>
          <button class="bac-btn bac-text" data-act="sleep" title="定时暂停（助眠）">定时</button>
          <span class="bac-sep"></span>
          <div class="bac-vol" title="音量">${I_VOL}<input class="bac-vol-range" type="range" min="0" max="100" value="100"></div>
        </div>
      </div>
    </div>`;

  const fab = document.createElement('div');
  fab.id = 'bili-audio-fab';
  fab.title = '退出听声模式，恢复原页面';
  fab.innerHTML = I_HEAD;

  /* 元素引用 */
  const coverEl = $('.bac-cover', card), bgEl = $('.bac-bg', card);
  const titleEl = $('.bac-title', card), subEl = $('.bac-sub', card);
  const curEl = $('.bac-cur', card), durEl = $('.bac-dur', card);
  const bar = $('.bac-bar', card);
  const bufferedEl = $('.bac-buffered', card), playedEl = $('.bac-played', card);
  const playBtn = $('[data-act="toggle"]', card);
  const prevBtn = $('[data-act="prev"]', card), nextBtn = $('[data-act="next"]', card);
  const rateBtn = $('[data-act="rate"]', card), sleepBtn = $('[data-act="sleep"]', card);
  const volRange = $('.bac-vol-range', card);

  /* 轻提示 */
  let toastTimer = null;
  const toast = msg => {
    let el = $('#bili-audio-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'bili-audio-toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  };

  /* 挂载卡片：覆盖在原播放器位置（播放器本身保持运行，只是不可见） */
  function mountCard() {
    const player = $('#bilibili-player') || $('.bpx-player-container');
    const host = player && player.parentElement;
    if (host) {
      if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
      host.appendChild(card);
    } else {
      Object.assign(card.style, { position: 'fixed', top: '64px', left: '14px', right: '14px', height: '42vh' });
      document.body.appendChild(card);
    }
  }

  /* ===== 与 video 元素对接（只借声音，不动画面） ===== */
  let video = null;
  const syncState = () => {
    if (!video) return;
    card.classList.toggle('playing', !video.paused);
    playBtn.innerHTML = video.paused ? I_PLAY : I_PAUSE;
  };
  const syncTime = () => {
    if (!video) return;
    const d = video.duration || 0, c = video.currentTime || 0;
    curEl.textContent = fmt(c);
    durEl.textContent = d ? fmt(d) : '--:--';
    playedEl.style.width = (d ? (c / d) * 100 : 0) + '%';
    try {
      if (video.buffered.length) {
        bufferedEl.style.width = Math.min(100, (video.buffered.end(video.buffered.length - 1) / (d || 1)) * 100) + '%';
      }
    } catch (e) {}
  };
  const onVideoEvt = () => { syncState(); syncTime(); };
  function bindVideo(v) {
    if (!v || v === video) return;
    if (video && video._bacOn) {
      ['play', 'pause', 'ended', 'timeupdate', 'loadedmetadata'].forEach(ev => video.removeEventListener(ev, onVideoEvt));
    }
    video = v;
    ['play', 'pause', 'ended', 'timeupdate', 'loadedmetadata'].forEach(ev => video.addEventListener(ev, onVideoEvt));
    video._bacOn = true;
    volRange.value = Math.round((video.muted ? 0 : video.volume) * 100);
    setVolFill();
    if (rateIdx) { try { video.playbackRate = RATES[rateIdx]; } catch (e) {} }
    syncState(); syncTime();
  }

  /* 进度条拖动 */
  let dragging = false;
  const seekAt = e => {
    if (!video || !video.duration) return;
    const rect = bar.getBoundingClientRect();
    video.currentTime = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)) * video.duration;
  };
  bar.addEventListener('pointerdown', e => { dragging = true; bar.setPointerCapture(e.pointerId); seekAt(e); });
  bar.addEventListener('pointermove', e => { if (dragging) seekAt(e); });
  ['pointerup', 'pointercancel'].forEach(ev => bar.addEventListener(ev, () => { dragging = false; }));

  /* 音量 */
  const setVolFill = () => volRange.style.setProperty('--v', volRange.value + '%');
  volRange.addEventListener('input', () => {
    if (!video) return;
    video.muted = false;
    video.volume = volRange.value / 100;
    setVolFill();
  });

  /* 控制按钮 */
  const RATES = [1, 1.25, 1.5, 2, 0.75];
  let rateIdx = 0;
  const SLEEPS = [15, 30, 60, 0];
  let sleepIdx = 3, sleepLeft = 0;
  const updateSleepBtn = () => {
    sleepBtn.textContent = sleepLeft > 0 ? fmt(sleepLeft) : '定时';
    sleepBtn.classList.toggle('on', sleepLeft > 0);
  };
  function goP(n) {
    /* 优先模拟点击页面分P列表（SPA 无刷新切换），失败则跳转 URL */
    const items = document.querySelectorAll('.video-pod__item, #multi_page .list-box li a');
    if (items[n - 1]) { items[n - 1].click(); return; }
    const u = new URL(location.href);
    u.searchParams.set('p', n);
    location.href = u.toString();
  }
  card.addEventListener('click', e => {
    const btn = e.target.closest('[data-act]');
    if (btn) {
      const act = btn.dataset.act;
      if (act === 'toggle') {
        if (video) video.paused ? video.play().catch(() => {}) : video.pause();
      } else if (act === 'prev') {
        if (curP() <= 1) return toast('已经是第一个了');
        goP(curP() - 1);
      } else if (act === 'next') {
        const total = pageCount();
        if (total && curP() >= total) return toast('已经是最后一个了');
        goP(curP() + 1);
      } else if (act === 'rate') {
        rateIdx = (rateIdx + 1) % RATES.length;
        if (video) { try { video.playbackRate = RATES[rateIdx]; } catch (err) {} }
        rateBtn.textContent = RATES[rateIdx] + 'x';
        toast('播放倍速：' + RATES[rateIdx] + 'x');
      } else if (act === 'sleep') {
        sleepIdx = (sleepIdx + 1) % SLEEPS.length;
        sleepLeft = SLEEPS[sleepIdx] * 60;
        updateSleepBtn();
        toast(SLEEPS[sleepIdx] ? SLEEPS[sleepIdx] + ' 分钟后自动暂停' : '已取消定时暂停');
      }
      return;
    }
    /* 点击唱片或空白处切换播放 */
    if (!e.target.closest('.bac-progress, .bac-vol') && video) {
      video.paused ? video.play().catch(() => {}) : video.pause();
    }
  });

  /* 标题 / 分P / 封面 实时刷新（兼容站内无刷新切P） */
  let lastPic = '';
  function updateInfo() {
    const s = initState();
    const vd = s && s.videoData;
    let title = '';
    const h1 = $('.video-info-title h1, h1.video-title, .video-title');
    if (h1) title = (h1.textContent || '').trim();
    if (!title && vd && vd.title) title = vd.title;
    if (title && titleEl.textContent !== title) titleEl.textContent = title;

    const p = curP(), total = (vd && vd.pages || []).length;
    const sub = total > 1 && vd.pages[p - 1] ? 'P' + p + ' · ' + (vd.pages[p - 1].part || '') : '';
    let up = (vd && vd.owner && vd.owner.name) || '';
    if (!up) { const el = $('.up-name'); up = el ? el.textContent.trim() : ''; }
    subEl.textContent = [sub, up ? 'UP：' + up : ''].filter(Boolean).join('  |  ');

    const multi = total > 1;
    prevBtn.style.display = nextBtn.style.display = multi ? '' : 'none';

    const pic = (vd && vd.pic) || '';
    if (pic && pic !== lastPic) {
      lastPic = pic;
      coverEl.src = pic;
      bgEl.style.backgroundImage = 'url("' + pic + '")';
    }
  }

  /* 每秒自检：重绑 video、恢复倍速、倒计时、刷新信息 */
  const timer = setInterval(() => {
    if (!card.isConnected) mountCard();
    const v = $('#bilibili-player video') || $('#bilibili-player-wrap video') || $('video');
    if (v) bindVideo(v);
    if (video && rateIdx && Math.abs(video.playbackRate - RATES[rateIdx]) > 0.01) {
      try { video.playbackRate = RATES[rateIdx]; } catch (e) {}
    }
    if (sleepLeft > 0) {
      sleepLeft--;
      if (sleepLeft <= 0) {
        sleepIdx = 3;
        if (video) video.pause();
        toast('定时时间到，已自动暂停');
      }
      updateSleepBtn();
    }
    updateInfo();
    syncTime();
  }, 1000);

  /* ===== 退出并恢复原页面 ===== */
  function off() {
    clearInterval(timer);
    if (video && video._bacOn) {
      ['play', 'pause', 'ended', 'timeupdate', 'loadedmetadata'].forEach(ev => video.removeEventListener(ev, onVideoEvt));
      video._bacOn = false;
    }
    card.remove();
    fab.remove();
    styleEl.remove();
    delete window.__BILI_AUDIO_MODE__;
    toast('已退出听声模式，页面样式已恢复');
  }
  fab.addEventListener('click', off);

  /* ===== 启动 ===== */
  mountCard();
  document.documentElement.appendChild(fab);
  bindVideo($('#bilibili-player video') || $('#bilibili-player-wrap video') || $('video'));
  updateInfo();
  syncState();
  syncTime();
  updateSleepBtn();
  setVolFill();
  window.__BILI_AUDIO_MODE__ = { off };
  toast('已进入听声模式：画面已隐藏，只播放声音');
})();