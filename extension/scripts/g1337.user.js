(async function __tabEvaluateScriptBridge() {
  const __tabScriptArgs = null;
  const __tabOriginalFunction = (
    /**
     * B站音乐播放器 v2 - 迭代修复版
     * 修复：
     * 1. 进度条支持拖动
     * 2. 退出播放器模式后可正常恢复播放
     * 3. 上一个/下一个按钮绑定播放列表 + 新增选集UI
     */
    function createBilibiliMusicPlayer() {
      'use strict';
    
      // 如果已存在旧版本，先销毁
      var old = document.getElementById('bilibili-music-player');
      if (old) { old.remove(); }
    
      // ========== 获取页面信息 ==========
      var videoTitle = '';
      var h1 = document.querySelector('h1');
      if (h1) videoTitle = h1.textContent.trim();
      if (!videoTitle) videoTitle = '未知视频';
    
      var coverImage = '';
      var ogImage = document.querySelector('meta[property="og:image"]');
      if (ogImage && ogImage.content) {
        coverImage = ogImage.content;
      } else {
        var coverEl = document.querySelector('.video-cover-img') ||
                       document.querySelector('.bpx-player-video-wrap img') ||
                       document.querySelector('.item_img img');
        if (coverEl) {
          coverImage = coverEl.src || '';
          if (!coverImage && coverEl.dataset) coverImage = coverEl.dataset.src || '';
        }
      }
      if (!coverImage) {
        coverImage = 'https://i0.hdslb.com/bfs/static/jinkela/long/image/default_video_cover.png';
      }
    
      // ========== 解析播放列表 ==========
      var playlist = [];
      var currentP = 1;
      
      // 从URL获取当前p值
      var urlMatch = location.search.match(/[?&]p=(\d+)/);
      if (urlMatch) currentP = parseInt(urlMatch[1], 10) || 1;
    
      // 尝试从页面的选集列表解析
      try {
        var listItems = document.querySelectorAll('.cur-page .list-box li, .playlist-list .list-box li, .video-pod__list .list-box li, [class*="playlist"] li');
        if (listItems.length === 0) {
          // 备用选择器
          listItems = document.querySelectorAll('.video-episode-card__content, .list-item, [class*="episode"] li');
        }
        
        // 再尝试更通用的方式：查找包含视频标题+时长的列表项
        if (listItems.length === 0) {
          var allLi = document.querySelectorAll('li');
          for (var i = 0; i < allLi.length; i++) {
            var li = allLi[i];
            var text = li.textContent || '';
            // 匹配类似 "【...】xxx  01:37" 的格式
            if (/[\u4e00-\u9fa5].{2,}\s+\d{1,2}:\d{2}/.test(text) && text.length < 80) {
              // 可能是选集项
              var anchor = li.querySelector('a') || li;
              var title = (anchor.getAttribute('title') || anchor.textContent || '').trim();
              var duration = '';
              var durEl = li.querySelector('.length, [class*="duration"], [class*="time"]');
              if (durEl) duration = durEl.textContent.trim();
              
              if (title) {
                playlist.push({
                  index: playlist.length + 1,
                  title: title,
                  duration: duration,
                  element: anchor
                });
              }
            }
          }
        } else {
          for (var j = 0; j < listItems.length; j++) {
            var item = listItems[j];
            var anc = item.querySelector('a') || item;
            var t = (anc.getAttribute('title') || anc.textContent || '').trim();
            var d = '';
            var de = item.querySelector('.length, [class*="duration"], [class*="time"]');
            if (de) d = de.textContent.trim();
            if (t) {
              playlist.push({ index: playlist.length + 1, title: t, duration: d, element: anc });
            }
          }
        }
      } catch (e) {
        console.warn('[BMP] 解析播放列表失败', e);
      }
    
      // 如果解析不到，至少创建一个当前项
      if (playlist.length === 0) {
        playlist.push({ index: 1, title: videoTitle, duration: '', element: null });
      }
    
      // ========== 获取原始播放器引用 ==========
      var originalVideo = null;
      var originalPlayer = null;
    
      try {
        originalVideo = document.querySelector('video');
        originalPlayer = document.querySelector('.bpx-player-container') || 
                         document.querySelector('#bilibili-player');
      } catch (e) {
        console.warn('[BMP] 获取视频元素失败', e);
      }
    
      // 记录原始播放器的父节点和兄弟位置，用于恢复
      var savedPlayerParent = null;
      var savedPlayerNextSibling = null;
      var savedPlayerDisplay = '';
      if (originalPlayer) {
        savedPlayerParent = originalPlayer.parentNode;
        savedPlayerNextSibling = originalPlayer.nextSibling;
        savedPlayerDisplay = originalPlayer.style.display || getComputedStyle(originalPlayer).display;
      }
    
      // ========== CSS样式 ==========
      var css =
        '#bilibili-music-player{position:fixed;top:0;left:0;width:100vw;height:100vh;background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%);z-index:999999;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;overflow:hidden}' +
        '.vinyl-container{position:relative;width:min(65vw,60vh);height:min(65vw,60vh);max-width:420px;max-height:420px;margin-bottom:20px;transition:all .5s ease;flex-shrink:0}' +
        '.vinyl-container.hidden{opacity:0;transform:scale(.8);pointer-events:none;position:absolute}' +
        '.vinyl-record{width:100%;height:100%;border-radius:50%;position:relative;box-shadow:0 0 0 10px rgba(255,255,255,.1),0 20px 60px rgba(0,0,0,.5),inset 0 0 20px rgba(0,0,0,.5);animation:bmpRotate 20s linear infinite paused;overflow:hidden;cursor:pointer}' +
        '.vinyl-record.playing{animation-play-state:running}' +
        '.vinyl-surface{position:absolute;top:0;left:0;width:100%;height:100%;border-radius:50%;background:radial-gradient(circle at center,transparent 25%,rgba(0,0,0,.3) 26%,transparent 27%),radial-gradient(circle at center,transparent 35%,rgba(0,0,0,.2) 36%,transparent 37%),radial-gradient(circle at center,transparent 45%,rgba(0,0,0,.15) 46%,transparent 47%),radial-gradient(circle at center,transparent 55%,rgba(0,0,0,.1) 56%,transparent 57%),radial-gradient(circle at center,transparent 65%,rgba(0,0,0,.08) 66%,transparent 67%),#111}' +
        '.vinyl-cover{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:40%;height:40%;border-radius:50%;background-size:cover;background-position:center;box-shadow:0 0 0 8px #333,0 0 0 12px rgba(255,255,255,.1),0 4px 15px rgba(0,0,0,.3);overflow:hidden}' +
        '.vinyl-center{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:8%;height:8%;border-radius:50%;background:radial-gradient(circle,#444 0%,#222 100%);box-shadow:0 0 10px rgba(0,0,0,.5)}' +
        '.video-container{display:none;width:82vw;max-width:900px;aspect-ratio:16/9;margin-bottom:16px;border-radius:12px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.5);background:#000;flex-shrink:0}' +
        '.video-container.visible{display:block}' +
        '.music-controls{display:flex;flex-direction:column;align-items:center;gap:14px;padding:18px;width:92%;max-width:600px;flex-shrink:0;overflow-y:auto;max-height:calc(100vh - 500px)}' +
        '.track-info{text-align:center;color:white;width:100%}' +
        '.track-title{font-size:clamp(15px,3.5vw,24px);font-weight:bold;margin-bottom:4px;text-shadow:0 2px 10px rgba(0,0,0,.5);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;line-height:1.3}' +
        '.track-time{font-size:clamp(12px,2.2vw,14px);color:rgba(255,255,255,.7);font-family:monospace}' +
        '.progress-container{width:100%;display:flex;align-items:center;gap:10px}' +
        '.time-current,.time-total{color:rgba(255,255,255,.7);font-family:monospace;font-size:clamp(11px,1.8vw,13px);min-width:38px;text-align:center;flex-shrink:0}' +
        '.progress-bar{flex:1;height:7px;background:rgba(255,255,255,.2);border-radius:4px;cursor:pointer;position:relative;transition:none;user-select:none;-webkit-user-select:none;touch-action:none}' +
        '.progress-bar:hover{height:9px}' +
        '.progress-fill{height:100%;background:linear-gradient(90deg,#667eea 0%,#764ba2 100%);border-radius:4px;width:0%;transition:none;position:relative;pointer-events:none}' +
        '.progress-fill::after{content:"";position:absolute;right:-7px;top:50%;transform:translateY(-50%) translateX(50%);width:16px;height:16px;background:white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,.3);opacity:0;transition:opacity .2s ease;pointer-events:none}' +
        '.progress-bar:hover .progress-fill::after{opacity:1}' +
        '.progress-bar.dragging{height:10px}' +
        '.progress-bar.dragging .progress-fill::after{opacity:1;transform:translateY(-50%) translateX(50%) scale(1.2)}' +
        '.control-buttons{display:flex;align-items:center;justify-content:center;gap:22px;flex-wrap:wrap}' +
        '.ctrl-btn{background:rgba(255,255,255,.1);border:none;color:white;cursor:pointer;padding:13px;border-radius:50%;transition:all .25s ease;backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;-webkit-tap-highlight-color:transparent}' +
        '.ctrl-btn:hover{background:rgba(255,255,255,.2);transform:scale(1.1)}' +
        '.ctrl-btn:active{transform:scale(.95)}' +
        '.ctrl-btn.play-pause{width:64px;height:64px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);box-shadow:0 4px 25px rgba(102,126,234,.4)}' +
        '.ctrl-btn.play-pause:hover{box-shadow:0 6px 35px rgba(102,126,234,.6)}' +
        '.ctrl-btn svg{width:24px;height:24px;fill:currentColor;pointer-events:none}' +
        '.ctrl-btn.play-pause svg{width:32px;height:32px}' +
        '.toggle-buttons{display:flex;gap:10px;margin-top:6px;flex-wrap:wrap;justify-content:center}' +
        '.toggle-btn{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.18);color:rgba(255,255,255,.85);padding:8px 16px;border-radius:20px;cursor:pointer;font-size:12px;transition:all .25s ease;backdrop-filter:blur(10px);-webkit-tap-highlight-color:transparent;font-family:inherit}' +
        '.toggle-btn:hover{background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.35)}' +
        '.toggle-btn.active{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-color:transparent;color:white;font-weight:500}' +
        '.close-btn{position:absolute;top:14px;right:14px;background:rgba(255,255,255,.1);border:none;color:white;cursor:pointer;padding:10px;border-radius:50%;z-index:1000000;transition:all .3s ease;backdrop-filter:blur(10px);-webkit-tap-highlight-color:transparent}' +
        '.close-btn:hover{background:rgba(255,69,58,.8);transform:rotate(90deg)}' +
        '.close-btn svg{width:20px;height:20px;fill:currentColor;pointer-events:none}' +
        '.volume-control{display:flex;align-items:center;gap:8px;margin-top:2px}' +
        '.volume-icon{color:rgba(255,255,255,.8);cursor:pointer;display:flex;align-items:center}' +
        '.volume-slider{width:100px;height:5px;-webkit-appearance:none;appearance:none;background:rgba(255,255,255,.2);border-radius:3px;outline:none;cursor:pointer;flex-shrink:0}' +
        '.volume-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:16px;height:16px;background:white;border-radius:50%;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.3);transition:transform .15s ease}' +
        '.volume-slider::-webkit-slider-thumb:hover{transform:scale(1.2)}' +
        '.volume-slider::-moz-range-thumb{width:16px;height:16px;background:white;border-radius:50%;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.3);border:none}' +
        /* 选集面板 */
        '.playlist-panel{width:100%;max-height:180px;overflow-y:auto;margin-top:8px;border-radius:10px;background:rgba(0,0,0,.2);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.08);display:none}' +
        '.playlist-panel.visible{display:block}' +
        '.playlist-toggle{background:none;border:none;color:rgba(255,255,255,.7);cursor:pointer;font-size:12px;padding:4px 10px;border-radius:12px;transition:all .2s;display:flex;align-items:center;gap:4px;margin-top:4px;-webkit-tap-highlight-color:transparent}' +
        '.playlist-toggle:hover{color:white;background:rgba(255,255,255,.1)}' +
        '.playlist-toggle svg{width:14px;height:14px;fill:currentColor;transition:transform .3s}' +
        '.playlist-toggle.open svg{transform:rotate(180deg)}' +
        '.playlist-item{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;cursor:pointer;color:rgba(255,255,255,.75);font-size:13px;transition:all .15s;border-bottom:1px solid rgba(255,255,255,.05);-webkit-tap-highlight-color:transparent}' +
        '.playlist-item:last-child{border-bottom:none}' +
        '.playlist-item:hover{background:rgba(255,255,255,.08);color:white}' +
        '.playlist-item.active{background:rgba(102,126,234,.2);color:#a8b4ff;font-weight:500}' +
        '.playlist-item-num{width:24px;text-align:center;flex-shrink:0;font-size:12px;color:rgba(255,255,255,.4)}' +
        '.playlist-item.active .playlist-item-num{color:#a8b4ff}' +
        '.playlist-item-title{flex:1;margin:0 10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
        '.playlist-item-dur{font-size:11px;color:rgba(255,255,255,.4);flex-shrink:0;font-family:monospace}' +
        '@keyframes bmpRotate{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}' +
        '@keyframes bmpPulse{0%,100%{opacity:1}50%{opacity:.6}}' +
        '.bg-decoration{position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:hidden;z-index:0}' +
        '.bg-circle{position:absolute;border-radius:50%;background:radial-gradient(circle,rgba(102,126,234,.08) 0%,transparent 70%);animation:bmpPulse 5s ease-in-out infinite}' +
        '.bg-circle:nth-child(1){width:450px;height:450px;top:-120px;right:-120px;animation-delay:0s}' +
        '.bg-circle:nth-child(2){width:320px;height:320px;bottom:-80px;left:-80px;animation-delay:2.5s}' +
        '.bg-circle:nth-child(3){width:220px;height:220px;top:48%;left:52%;transform:translate(-50%,-50%);animation-delay:1.2s}' +
        /* 响应式 */
        '@media(max-width:768px){.vinyl-container{width:min(78vw,48vh);height:min(78vw,48vh);max-width:300px;max-height:300px;margin-bottom:14px}.video-container{width:94vw}.music-controls{padding:12px;gap:10px}.control-buttons{gap:14px}.ctrl-btn{padding:10px}.ctrl-btn.play-pause{width:56px;height:56px}.toggle-btn{padding:6px 12px;font-size:11px}.playlist-panel{max-height:140px}}' +
        '@media(max-height:650px){.vinyl-container{width:min(55vw,35vh);height:min(55vw,35vh);max-width:240px;max-height:240px;margin-bottom:10px}.music-controls{padding:10px;gap:8px}.toggle-buttons{margin-top:2px}.track-title{margin-bottom:2px}.playlist-panel{max-height:100px}}' +
        '@media(max-height:480px){.vinyl-container{max-width:180px;max-height:180px}.music-controls{padding:6px;gap:4px}.ctrl-btn.play-pause{width:44px;height:44px}.ctrl-btn{padding:6px}.playlist-panel{max-height:70px}}';
    
      // ========== 构建HTML ==========
      var html = '';
    
      // 背景装饰
      html += '<div class="bg-decoration">';
      html += '<div class="bg-circle"></div><div class="bg-circle"></div><div class="bg-circle"></div>';
      html += '</div>';
    
      // 关闭按钮
      html += '<button class="close-btn" id="bmp-close" title="退出音乐播放器模式" aria-label="关闭音乐播放器">';
      html += '<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
      html += '</button>';
    
      // 唱片区域
      html += '<div class="vinyl-container" id="bmp-vinyl">';
      html += '<div class="vinyl-record" id="bmp-vinyl-record" role="button" aria-label="播放/暂停" tabindex="0">';
      html += '<div class="vinyl-surface"></div>';
      html += '<div class="vinyl-cover" id="bmp-cover" style="background-image:url(\'' + coverImage.replace(/'/g, "\\'") + '\')"></div>';
      html += '<div class="vinyl-center"></div></div></div>';
    
      // 视频区域
      html += '<div class="video-container" id="bmp-video"></div>';
    
      // 控制区
      html += '<div class="music-controls">';
    
      // 歌曲信息
      html += '<div class="track-info">';
      html += '<div class="track-title" id="bmp-title">' + videoTitle + '</div>';
      html += '<div class="track-time"><span id="bmp-current-time">00:00</span> / <span id="bmp-duration">00:00</span></div></div>';
    
      // 进度条
      html += '<div class="progress-container">';
      html += '<span class="time-current" id="bmp-time-current">0:00</span>';
      html += '<div class="progress-bar" id="bmp-progress"><div class="progress-fill" id="bmp-progress-fill"></div></div>';
      html += '<span class="time-total" id="bmp-time-total">0:00</span></div>';
    
      // 播放控制
      html += '<div class="control-buttons">';
      html += '<button class="ctrl-btn" id="bmp-prev" title="上一首(P' + Math.max(1, currentP - 1) + ')" aria-label="上一首"><svg viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg></button>';
      html += '<button class="ctrl-btn play-pause" id="bmp-play-pause" title="播放/暂停" aria-label="播放暂停"><svg viewBox="0 0 24 24" id="bmp-play-icon"><path d="M8 5v14l11-7z"/></svg></button>';
      html += '<button class="ctrl-btn" id="bmp-next" title="下一首(P' + Math.min(playlist.length, currentP + 1) + ')" aria-label="下一首"><svg viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6z"/></svg></button>';
      html += '</div>';
    
      // 音量
      html += '<div class="volume-control">';
      html += '<span class="volume-icon" id="bmp-volume-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg></span>';
      html += '<input type="range" class="volume-slider" id="bmp-volume" min="0" max="100" value="80" aria-label="音量"></div>';
    
      // 选集切换按钮
      html += '<button class="playlist-toggle" id="bmp-pl-toggle" title="展开/收起选集列表">';
      html += '<svg viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg>';
      html += '<span>选集 (' + currentP + '/' + playlist.length + ')</span></button>';
    
      // 选集面板
      html += '<div class="playlist-panel" id="bmp-pl-panel">';
      for (var pi = 0; pi < playlist.length; pi++) {
        var pItem = playlist[pi];
        var isActive = (pItem.index === currentP) ? ' active' : '';
        html += '<div class="playlist-item' + isActive + '" data-p="' + pItem.index + '" role="button" tabindex="0">';
        html += '<span class="playlist-item-num">' + pItem.index + '</span>';
        html += '<span class="playlist-item-title">' + pItem.title + '</span>';
        if (pItem.duration) {
          html += '<span class="playlist-item-dur">' + pItem.duration + '</span>';
        }
        html += '</div>';
      }
      html += '</div>'; // playlist-panel
    
      // 模式切换
      html += '<div class="toggle-buttons">';
      html += '<button class="toggle-btn active" id="bmp-toggle-vinyl">🎵 唱片模式</button>';
      html += '<button class="toggle-btn" id="bmp-toggle-video">📺 视频模式</button></div>';
    
      html += '</div>'; // music-controls
    
      // ========== 创建DOM并插入 ==========
      var playerContainer = document.createElement('div');
      playerContainer.id = 'bilibili-music-player';
      playerContainer.innerHTML = '<style>' + css + '</style>' + html;
      document.body.appendChild(playerContainer);
    
      // ========== 状态变量 ==========
      var showVideo = false;
      var isPlaying = false;
    
      // DOM 引用
      var vinylContainer = document.getElementById('bmp-vinyl');
      var vinylRecord = document.getElementById('bmp-vinyl-record');
      var videoContainer = document.getElementById('bmp-video');
      var playPauseBtn = document.getElementById('bmp-play-pause');
      var playIcon = document.getElementById('bmp-play-icon');
      var progressBar = document.getElementById('bmp-progress');
      var progressFill = document.getElementById('bmp-progress-fill');
      var currentTimeEl = document.getElementById('bmp-current-time');
      var durationEl = document.getElementById('bmp-duration');
      var timeCurrentEl = document.getElementById('bmp-time-current');
      var timeTotalEl = document.getElementById('bmp-time-total');
      var volumeSlider = document.getElementById('bmp-volume');
      var toggleVinylBtn = document.getElementById('bmp-toggle-vinyl');
      var toggleVideoBtn = document.getElementById('bmp-toggle-video');
      var closeBtn = document.getElementById('bmp-close');
      var prevBtn = document.getElementById('bmp-prev');
      var nextBtn = document.getElementById('bmp-next');
      var plToggleBtn = document.getElementById('bmp-pl-toggle');
      var plPanel = document.getElementById('bmp-pl-panel');
    
      // ========== 工具函数 ==========
      function fmt(s) {
        if (!s || isNaN(s)) return '00:00';
        var m = Math.floor(s / 60);
        var sec = Math.floor(s % 60);
        return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
      }
    
      function updateProgress() {
        if (!originalVideo) return;
        var cur = originalVideo.currentTime || 0;
        var dur = originalVideo.duration || 0;
        var pct = dur > 0 ? (cur / dur) * 100 : 0;
        progressFill.style.width = pct + '%';
        currentTimeEl.textContent = fmt(cur);
        durationEl.textContent = fmt(dur);
        timeCurrentEl.textContent = fmt(cur);
        timeTotalEl.textContent = fmt(dur);
      }
    
      function setPlaying(play) {
        isPlaying = play;
        if (play) {
          playIcon.innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
          vinylRecord.classList.add('playing');
        } else {
          playIcon.innerHTML = '<path d="M8 5v14l11-7z"/>';
          vinylRecord.classList.remove('playing');
        }
      }
    
      function togglePlayPause() {
        if (!originalVideo) return;
        if (isPlaying) {
          originalVideo.pause();
          setPlaying(false);
        } else {
          originalVideo.play().catch(function(e) { console.warn('[BMP] 播放失败:', e); });
          setPlaying(true);
        }
      }
    
      function switchToVinylMode() {
        showVideo = false;
        vinylContainer.classList.remove('hidden');
        videoContainer.classList.remove('visible');
        toggleVinylBtn.classList.add('active');
        toggleVideoBtn.classList.remove('active');
        // 不移动播放器，只隐藏它
        if (originalPlayer && !videoContainer.contains(originalPlayer)) {
          originalPlayer.style.visibility = 'hidden';
          originalPlayer.style.pointerEvents = 'none';
        }
      }
    
      function switchToVideoMode() {
        showVideo = true;
        vinylContainer.classList.add('hidden');
        videoContainer.classList.add('visible');
        toggleVideoBtn.classList.add('active');
        toggleVinylBtn.classList.remove('active');
        if (originalPlayer && !videoContainer.contains(originalPlayer)) {
          videoContainer.appendChild(originalPlayer);
          originalPlayer.style.cssText = 'width:100%!important;height:100%!important;position:relative!important;visibility:visible!important;pointer-events:auto!important;';
        }
      }
    
      // 切换到指定集数
      function switchToEpisode(p) {
        p = parseInt(p, 10);
        if (isNaN(p) || p < 1 || p > playlist.length) return;
        
        // 更新URL的p参数
        var url = new URL(location.href);
        url.searchParams.set('p', p);
        
        // 使用B站的内部API或直接导航
        // 方案1：尝试点击对应的选集元素
        var targetItem = null;
        for (var ei = 0; ei < playlist.length; ei++) {
          if (playlist[ei].index === p && playlist[ei].element) {
            targetItem = playlist[ei].element;
            break;
          }
        }
        
        if (targetItem) {
          targetItem.click();
        } else {
          // 方案2：直接修改URL触发B站播放器的p参数变更
          history.pushState(null, '', url.toString());
          
          // 触发B站播放器切换分P的事件
          // B站使用 __playinfo__ 或 window.player 等全局对象
          if (typeof window.changeP === 'function') {
            window.changeP(p);
          } else if (window.player && typeof window.player.switchVideo === 'function') {
            // 尝试调用player API
            var targetPl = playlist[p - 1];
            if (targetPl && targetPl.element) {
              var href = targetPl.element.getAttribute('href') || '';
              if (href) {
                // 从链接提取aid/cid等信息
                var aidMatch = href.match(/[?&]aid=(\d+)/);
                var cidMatch = href.match(/[?&]cid=(\d+)/);
                if (aidMatch && cidMatch) {
                  window.player.switchVideo({ aid: parseInt(aidMatch[1]), cid: parseInt(cidMatch[1]) });
                }
              }
            }
          } else {
            // 最终方案：直接刷新页面到新p值
            location.href = url.toString();
          }
        }
    
        // 更新UI高亮
        var items = plPanel.querySelectorAll('.playlist-item');
        for (var ii = 0; ii < items.length; ii++) {
          items[ii].classList.toggle('active', parseInt(items[ii].getAttribute('data-p'), 10) === p);
        }
        currentP = p;
        plToggleBtn.querySelector('span').textContent = '选集 (' + p + '/' + playlist.length + ')';
      }
    
      // 正确销毁播放器，恢复原状
      function destroy() {
        // 先移除事件监听
        document.removeEventListener('keydown', onKeyDown);
    
        // 如果播放器在我们的容器中，移回原位
        if (originalPlayer && videoContainer.contains(originalPlayer)) {
          if (savedPlayerParent) {
            savedPlayerParent.insertBefore(originalPlayer, savedPlayerNextSibling);
          } else {
            document.body.insertBefore(originalPlayer, playerContainer);
          }
          // 清除我们加的内联样式，恢复原始显示
          originalPlayer.style.cssText = '';
          originalPlayer.style.display = savedPlayerDisplay || '';
          originalPlayer.style.visibility = '';
          originalPlayer.style.pointerEvents = '';
        } else if (originalPlayer) {
          // 播器没被移动过，只是隐藏了，恢复可见性
          originalPlayer.style.visibility = '';
          originalPlayer.style.pointerEvents = '';
          originalPlayer.style.display = savedPlayerDisplay || '';
        }
    
        // 移除覆盖层
        playerContainer.remove();
    
        // 恢复body滚动
        document.body.style.overflow = '';
    
        // 重新获取视频引用（因为DOM可能变化）
        // 视频应该能正常播放了
      }
    
      // ========== 进度条拖动实现 ==========
      var isDragging = false;
    
      function getProgressFromEvent(e) {
        var rect = progressBar.getBoundingClientRect();
        var clientX = e.clientX;
        if (e.touches && e.touches.length > 0) {
          clientX = e.touches[0].clientX;
        }
        var pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        return pct;
      }
    
      function handleProgressStart(e) {
        if (!originalVideo || !originalVideo.duration) return;
        e.preventDefault();
        isDragging = true;
        progressBar.classList.add('dragging');
        var pct = getProgressFromEvent(e);
        progressFill.style.width = (pct * 100) + '%';
        originalVideo.currentTime = pct * originalVideo.duration;
      }
    
      function handleProgressMove(e) {
        if (!isDragging) return;
        e.preventDefault();
        var pct = getProgressFromEvent(e);
        progressFill.style.width = (pct * 100) + '%';
        // 实时更新时间显示但不seek（减少性能开销）
        if (originalVideo && originalVideo.duration) {
          var seekTime = pct * originalVideo.duration;
          currentTimeEl.textContent = fmt(seekTime);
          timeCurrentEl.textContent = fmt(seekTime);
        }
      }
    
      function handleProgressEnd(e) {
        if (!isDragging) return;
        isDragging = false;
        progressBar.classList.remove('dragging');
        var pct = getProgressFromEvent(e);
        if (originalVideo && originalVideo.duration) {
          originalVideo.currentTime = pct * originalVideo.duration;
        }
      }
    
      // 鼠标事件
      progressBar.addEventListener('mousedown', handleProgressStart);
      document.addEventListener('mousemove', handleProgressMove);
      document.addEventListener('mouseup', handleProgressEnd);
    
      // 触摸事件
      progressBar.addEventListener('touchstart', handleProgressStart, { passive: false });
      document.addEventListener('touchmove', handleProgressMove, { passive: false });
      document.addEventListener('touchend', handleProgressEnd);
    
      // 点击跳转（非拖动时）
      progressBar.addEventListener('click', function(e) {
        if (isDragging) return; // 拖动结束会由mouseup/touchend处理
        if (!originalVideo || !originalVideo.duration) return;
        var rect = progressBar.getBoundingClientRect();
        var pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        originalVideo.currentTime = pct * originalVideo.duration;
      });
    
      // ========== 绑定事件 ==========
      playPauseBtn.addEventListener('click', togglePlayPause);
      vinylRecord.addEventListener('click', togglePlayPause);
      vinylRecord.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); togglePlayPause(); }
      });
    
      volumeSlider.addEventListener('input', function(e) {
        if (!originalVideo) return;
        originalVideo.volume = e.target.value / 100;
      });
    
      if (originalVideo) { originalVideo.volume = 0.8; }
    
      toggleVinylBtn.addEventListener('click', switchToVinylMode);
      toggleVideoBtn.addEventListener('click', switchToVideoMode);
    
      // 上一个/下一个
      prevBtn.addEventListener('click', function() {
        if (currentP > 1) {
          switchToEpisode(currentP - 1);
        } else {
          // 也尝试点击B站原生上一个按钮
          var nativePrev = document.querySelector('.bpx-player-ctrl-prev');
          if (nativePrev) nativePrev.click();
        }
      });
    
      nextBtn.addEventListener('click', function() {
        if (currentP < playlist.length) {
          switchToEpisode(currentP + 1);
        } else {
          var nativeNext = document.querySelector('.bpx-player-ctrl-next');
          if (nativeNext) nativeNext.click();
        }
      });
    
      closeBtn.addEventListener('click', destroy);
    
      // 选集面板展开/收起
      plToggleBtn.addEventListener('click', function() {
        var isOpen = plPanel.classList.toggle('visible');
        plToggleBtn.classList.toggle('open', isOpen);
      });
    
      // 选集项点击
      var plItems = plPanel.querySelectorAll('.playlist-item');
      for (var pii = 0; pii < plItems.length; pii++) {
        (function(item) {
          item.addEventListener('click', function() {
            var p = parseInt(item.getAttribute('data-p'), 10);
            switchToEpisode(p);
          });
          item.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              var p = parseInt(item.getAttribute('data-p'), 10);
              switchToEpisode(p);
            }
          });
        })(plItems[pii]);
      }
    
      // 视频事件监听
      if (originalVideo) {
        originalVideo.addEventListener('timeupdate', updateProgress);
        originalVideo.addEventListener('loadedmetadata', function() {
          updateProgress();
          durationEl.textContent = fmt(originalVideo.duration);
          timeTotalEl.textContent = fmt(originalVideo.duration);
        });
        originalVideo.addEventListener('play', function() { setPlaying(true); });
        originalVideo.addEventListener('pause', function() { setPlaying(false); });
        originalVideo.addEventListener('ended', function() { setPlaying(false); });
      }
    
      // 键盘快捷键
      function onKeyDown(e) {
        if (!document.getElementById('bilibili-music-player')) {
          document.removeEventListener('keydown', onKeyDown);
          return;
        }
        switch (e.code) {
          case 'Space': e.preventDefault(); togglePlayPause(); break;
          case 'ArrowLeft': if (originalVideo) originalVideo.currentTime -= 5; break;
          case 'ArrowRight': if (originalVideo) originalVideo.currentTime += 5; break;
          case 'ArrowUp':
            e.preventDefault();
            if (originalVideo) { originalVideo.volume = Math.min(1, originalVideo.volume + 0.1); volumeSlider.value = originalVideo.volume * 100; }
            break;
          case 'ArrowDown':
            e.preventDefault();
            if (originalVideo) { originalVideo.volume = Math.max(0, originalVideo.volume - 0.1); volumeSlider.value = originalVideo.volume * 100; }
            break;
          case 'Escape': destroy(); break;
        }
      }
      document.addEventListener('keydown', onKeyDown);
    
      // 初始化进度显示
      setTimeout(updateProgress, 150);
    
      // 默认隐藏原播放器（唱片模式下）
      if (originalPlayer && !videoContainer.contains(originalPlayer)) {
        originalPlayer.style.visibility = 'hidden';
        originalPlayer.style.pointerEvents = 'none';
      }
    
      return {
        ok: true,
        message: 'B站音乐播放器 v2 已激活',
        version: 2,
        hasVideo: !!originalVideo,
        coverImage: coverImage,
        title: videoTitle,
        playlistCount: playlist.length,
        currentP: currentP,
        fixes: ['draggable_progress_bar', 'proper_restore_on_exit', 'playlist_integration']
      };
    }
  );
  if (typeof __tabOriginalFunction !== "function") {
    throw new Error("evaluate_script source must evaluate to a function");
  }
  return await __tabOriginalFunction();
})();