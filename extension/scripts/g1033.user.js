// ==UserScript==
// @name         GitHub High Speed Download
// @name:zh-CN   GitHub 高速下载增强
// @namespace    skill-create
// @match        *://github.com/*
// @description  GitHub 高速下载：为 Release 资源、Raw 文件、Code ZIP、Clone 地址添加镜像加速入口（使用 ghproxy/mirror 代理）。使用方法：在 Releases 页点击资源旁的「加速」按钮，或点击页面右上角「GH↑」菜单选择下载方式。
// ==/UserScript==

(function () {
  'use strict';

  const MIRRORS = [
    { label: 'ghfast.top', prefix: 'https://ghfast.top/' },
    { label: 'gh-proxy.com', prefix: 'https://gh-proxy.com/' },
    { label: 'moeyy.cn', prefix: 'https://github.moeyy.xyz/' },
  ];

  const STYLE = `
    .gh-speed-btn {
      display: inline-block; margin-left: 6px;
      padding: 2px 8px; font-size: 11px;
      background: #238636; color: #fff;
      border: none; border-radius: 4px; cursor: pointer;
      text-decoration: none; vertical-align: middle;
    }
    .gh-speed-btn:hover { background: #2ea043; }
    #gh-speed-toggle {
      position: fixed; top: 10px; right: 10px;
      background: #238636; color: #fff;
      border: none; border-radius: 6px;
      padding: 5px 10px; font-size: 12px;
      cursor: pointer; z-index: 99999;
    }
    #gh-speed-menu {
      position: fixed; top: 44px; right: 10px;
      background: #161b22; color: #c9d1d9;
      border: 1px solid #30363d; border-radius: 8px; padding: 8px;
      z-index: 99999; display: none; flex-direction: column; gap: 4px;
      min-width: 220px; font-size: 12px;
    }
    #gh-speed-menu a {
      display: block; padding: 5px 10px; color: #58a6ff;
      text-decoration: none; border-radius: 4px;
    }
    #gh-speed-menu a:hover { background: #21262d; }
    #gh-speed-menu .gh-sep { border-top: 1px solid #30363d; margin: 3px 0; }
    #gh-speed-menu .gh-label { color: #8b949e; font-size: 11px; padding: 2px 10px; }
  `;
  const styleEl = document.createElement('style');
  styleEl.textContent = STYLE;
  document.head.appendChild(styleEl);

  // ── Release 资源添加加速按钮 ─────────────────────────────────────────────
  function injectReleaseButtons() {
    document.querySelectorAll('a[href*="/releases/download/"]').forEach(link => {
      if (link.nextElementSibling?.classList.contains('gh-speed-btn')) return;
      const btn = document.createElement('a');
      btn.className = 'gh-speed-btn';
      btn.textContent = '⚡加速';
      btn.title = '通过镜像加速下载';
      btn.href = MIRRORS[0].prefix + link.href;
      btn.target = '_blank';
      link.parentNode.insertBefore(btn, link.nextSibling);
    });
  }

  // ── Raw 文件加速 ─────────────────────────────────────────────────────────
  function injectRawButton() {
    const rawBtn = document.querySelector('a[data-testid="raw-button"], a[id="raw-url"]');
    if (rawBtn && !rawBtn.dataset.ghSpeedDone) {
      rawBtn.dataset.ghSpeedDone = '1';
      const btn = document.createElement('a');
      btn.className = 'gh-speed-btn';
      btn.textContent = '⚡Raw 加速';
      btn.href = MIRRORS[0].prefix + rawBtn.href;
      btn.target = '_blank';
      rawBtn.parentNode.insertBefore(btn, rawBtn.nextSibling);
    }
  }

  // ── 右上角菜单（ZIP 下载 + Clone 加速） ──────────────────────────────────
  function buildMenu() {
    const repoMatch = location.pathname.match(/^\/([^/]+\/[^/]+)/);
    if (!repoMatch) return;
    const repo = repoMatch[1];

    const toggle = document.createElement('button');
    toggle.id = 'gh-speed-toggle';
    toggle.textContent = 'GH↑';
    document.body.appendChild(toggle);

    const menu = document.createElement('div');
    menu.id = 'gh-speed-menu';

    const branch = document.querySelector('span[data-menu-button]')?.textContent?.trim() || 'main';
    const zipUrl = `https://github.com/${repo}/archive/refs/heads/${branch}.zip`;

    const label = document.createElement('div');
    label.className = 'gh-label';
    label.textContent = `${repo} (${branch})`;
    menu.appendChild(label);

    const sep = document.createElement('div');
    sep.className = 'gh-sep';
    menu.appendChild(sep);

    MIRRORS.forEach(mirror => {
      const a = document.createElement('a');
      a.textContent = `⚡ ZIP via ${mirror.label}`;
      a.href = mirror.prefix + zipUrl;
      a.target = '_blank';
      menu.appendChild(a);
    });

    document.body.appendChild(menu);
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.style.display = menu.style.display === 'flex' ? 'none' : 'flex';
    });
    document.addEventListener('click', (e) => {
      if (e.target !== toggle && !menu.contains(e.target)) menu.style.display = 'none';
    });
  }

  const obs = new MutationObserver(() => {
    injectReleaseButtons();
    injectRawButton();
  });
  obs.observe(document.body, { childList: true, subtree: true });

  setTimeout(() => {
    injectReleaseButtons();
    injectRawButton();
    if (!document.getElementById('gh-speed-toggle')) buildMenu();
  }, 1500);
})();
