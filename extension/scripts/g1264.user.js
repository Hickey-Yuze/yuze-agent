// ==UserScript==
// @name         Youku HTML5 Video Control Menu
// @name:zh-CN   优酷视频增强（全功能菜单版）
// @namespace    skill-create
// @match        *://v.youku.com/*
// @match        *://youku.com/*
// @match        *://www.youku.com/*
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  /* ---------- 工具函数 ---------- */

  function getVideo() {
    const videos = document.querySelectorAll('video');
    if (!videos.length) return null;
    return [...videos].sort(
      (a, b) => b.videoWidth * b.videoHeight - a.videoWidth * a.videoHeight
    )[0];
  }

  function clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
  }

  /* ---------- 样式 ---------- */

  const style = document.createElement('style');
  style.textContent = `
    #yk-menu-toggle {
      position: fixed;
      right: 20px;
      bottom: 110px;
      z-index: 99999999;
      background: rgba(20,20,20,.9);
      color: #fff;
      border: none;
      border-radius: 10px;
      padding: 8px 14px;
      font-size: 13px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,.45);
    }

    #yk-menu {
      position: fixed;
      right: 20px;
      bottom: 160px;
      z-index: 99999999;
      background: rgba(15,15,15,.96);
      border-radius: 12px;
      padding: 10px;
      display: none;
      width: 160px;
      box-shadow: 0 6px 20px rgba(0,0,0,.5);
    }

    #yk-menu .group {
      margin-bottom: 8px;
    }

    #yk-menu .title {
      font-size: 11px;
      color: #aaa;
      margin: 4px 0;
    }

    #yk-menu button {
      width: 100%;
      margin: 3px 0;
      padding: 6px;
      background: #2a2a2a;
      color: #fff;
      border: 1px solid #444;
      border-radius: 6px;
      font-size: 12px;
      cursor: pointer;
    }

    #yk-menu button:hover {
      background: #444;
    }
  `;
  document.head.appendChild(style);

  /* ---------- DOM ---------- */

  const toggle = document.createElement('button');
  toggle.id = 'yk-menu-toggle';
  toggle.textContent = '工具';

  const menu = document.createElement('div');
  menu.id = 'yk-menu';

  function addGroup(title, buttons) {
    const g = document.createElement('div');
    g.className = 'group';

    const t = document.createElement('div');
    t.className = 'title';
    t.textContent = title;
    g.appendChild(t);

    buttons.forEach(b => g.appendChild(b));
    menu.appendChild(g);
  }

  function btn(text, fn) {
    const b = document.createElement('button');
    b.textContent = text;
    b.onclick = fn;
    return b;
  }

  /* ---------- 功能按钮 ---------- */

  addGroup('进度', [
    btn('快退 -5s', () => {
      const v = getVideo();
      if (v) v.currentTime = clamp(v.currentTime - 5, 0, v.duration);
    }),
    btn('快进 +5s', () => {
      const v = getVideo();
      if (v) v.currentTime = clamp(v.currentTime + 5, 0, v.duration);
    })
  ]);

  addGroup('音量', [
    btn('音量 -10%', () => {
      const v = getVideo();
      if (v) v.volume = clamp(v.volume - 0.1, 0, 1);
    }),
    btn('音量 +10%', () => {
      const v = getVideo();
      if (v) v.volume = clamp(v.volume + 0.1, 0, 1);
    })
  ]);

  addGroup('倍速', [0.75, 1, 1.25, 1.5, 2, 3].map(s =>
    btn(`×${s}`, () => {
      const v = getVideo();
      if (v) v.playbackRate = s;
    })
  ));

  addGroup('其他', [
    btn('画中画', () => {
      const v = getVideo();
      if (!v) return;
      document.pictureInPictureElement
        ? document.exitPictureInPicture()
        : v.requestPictureInPicture();
    }),
    btn('截图', () => {
      const v = getVideo();
      if (!v) return;
      const c = document.createElement('canvas');
      c.width = v.videoWidth;
      c.height = v.videoHeight;
      c.getContext('2d').drawImage(v, 0, 0);
      const a = document.createElement('a');
      a.href = c.toDataURL('image/png');
      a.download = 'youku.png';
      a.click();
    })
  ]);

  /* ---------- 挂载 ---------- */

  document.body.appendChild(toggle);
  document.body.appendChild(menu);

  toggle.onclick = () => {
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
  };

  document.addEventListener('click', e => {
    if (e.target !== toggle && !menu.contains(e.target)) {
      menu.style.display = 'none';
    }
  });

})();