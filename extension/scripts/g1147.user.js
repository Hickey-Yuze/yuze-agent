// ==UserScript==
// @name         High Speed Download Enhancement
// @name:zh-CN   高速下载增强
// @namespace    skill-create
// @match        *://github.com/*
// @match        *://gitlab.com/*
// @match        *://bitbucket.org/*
// @match        *://sourceforge.net/*
// @match        *://npmjs.com/*
// @match        *://pypi.org/*
// @match        *://*.docker.com/*
// @match        *://chrome.google.com/*
// @match        *://microsoftedge.microsoft.com/*
// @match        *://addons.mozilla.org/*
// @match        *://*.jetbrains.com/*
// @match        *://*.apache.org/*
// @match        *://*.gnu.org/*
// @description  高速下载增强：为各类国外软件/资源下载链接添加镜像加速入口，支持 GitHub/GitLab/BitBucket/SourceForge/npm/PyPI/Docker/浏览器扩展等多种站点。使用方法：点击页面右上角「HS↓」菜单选择加速下载方式。
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  // ── 国际通用加速镜像（仅国外可用通道）──────────────────────────────────────
  const MIRRORS = [
    { label: 'ghproxy.com', prefix: 'https://ghproxy.com/', domains: ['github.com', 'gitlab.com', 'bitbucket.org'] },
    { label: 'mirror.ghproxy.com', prefix: 'https://mirror.ghproxy.com/', domains: ['github.com'] },
    { label: 'corsproxy.io', prefix: 'https://corsproxy.io/?', domains: ['*'] },
    { label: 'allorigins.win', prefix: 'https://api.allorigins.win/raw?url=', domains: ['*'] },
  ];

  const STYLE = `
    .hs-download-btn {
      display: inline-block; margin-left: 8px;
      padding: 4px 10px; font-size: 12px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff; border: none; border-radius: 6px;
      cursor: pointer; text-decoration: none; vertical-align: middle;
      font-weight: 500; box-shadow: 0 2px 8px rgba(102,126,234,0.3);
      transition: all 0.2s ease;
    }
    .hs-download-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102,126,234,0.4);
    }
    #hs-speed-toggle {
      position: fixed; top: 12px; right: 12px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff; border: none; border-radius: 8px;
      padding: 8px 14px; font-size: 13px; font-weight: 600;
      cursor: pointer; z-index: 999999;
      box-shadow: 0 4px 15px rgba(102,126,234,0.4);
      transition: all 0.2s ease;
    }
    #hs-speed-toggle:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(102,126,234,0.5);
    }
    #hs-speed-menu {
      position: fixed; top: 52px; right: 12px;
      background: #1a1a2e; color: #e0e0e0;
      border: 1px solid #3a3a5c; border-radius: 10px;
      padding: 10px; z-index: 999999;
      display: none; flex-direction: column; gap: 6px;
      min-width: 260px; font-size: 13px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.4);
      backdrop-filter: blur(10px);
    }
    #hs-speed-menu a {
      display: block; padding: 8px 12px; color: #7fbbff;
      text-decoration: none; border-radius: 6px;
      transition: background 0.2s;
    }
    #hs-speed-menu a:hover { background: #2d2d4a; }
    #hs-speed-menu .hs-sep { border-top: 1px solid #3a3a5c; margin: 6px 0; }
    #hs-speed-menu .hs-label {
      color: #a0a0b0; font-size: 12px; padding: 4px 12px;
      font-weight: 500;
    }
    #hs-speed-menu .hs-site-label {
      color: #ffd700; font-size: 11px; padding: 2px 12px;
      font-style: italic;
    }
    .hs-badge {
      display: inline-block; padding: 1px 6px;
      font-size: 10px; background: #ffd700; color: #000;
      border-radius: 3px; margin-left: 4px; font-weight: 600;
    }
  `;
  const styleEl = document.createElement('style');
  styleEl.textContent = STYLE;
  document.head.appendChild(styleEl);

  // ── 获取当前域名 ────────────────────────────────────────────────────────
  function getCurrentDomain() {
    return window.location.hostname.replace(/^www\./, '');
  }

  // ── 通用链接加速按钮注入 ────────────────────────────────────────────────
  function injectGenericDownloadButtons(selector, linkAttr = 'href') {
    const domain = getCurrentDomain();
    document.querySelectorAll(selector).forEach(link => {
      if (link.nextElementSibling?.classList.contains('hs-download-btn')) return;
      
      const href = link.getAttribute(linkAttr);
      if (!href || !href.startsWith('http')) return;

      const btn = document.createElement('a');
      btn.className = 'hs-download-btn';
      btn.textContent = '⚡ 加速下载';
      btn.title = '通过国际镜像加速下载';
      btn.href = MIRRORS[0].prefix + href;
      btn.target = '_blank';
      btn.rel = 'noopener noreferrer';
      link.parentNode.insertBefore(btn, link.nextSibling);
    });
  }

  // ── GitHub 特定处理 ────────────────────────────────────────────────────
  function handleGitHub() {
    // Release 资源
    document.querySelectorAll('a[href*="/releases/download/"]').forEach(link => {
      if (link.nextElementSibling?.classList.contains('hs-download-btn')) return;
      const btn = document.createElement('a');
      btn.className = 'hs-download-btn';
      btn.textContent = '⚡ 加速';
      btn.title = '通过镜像加速下载';
      btn.href = MIRRORS[0].prefix + link.href;
      btn.target = '_blank';
      btn.rel = 'noopener noreferrer';
      link.parentNode.insertBefore(btn, link.nextSibling);
    });

    // Raw 文件
    const rawBtn = document.querySelector('a[data-testid="raw-button"], a[id="raw-url"]');
    if (rawBtn && !rawBtn.dataset.hsSpeedDone) {
      rawBtn.dataset.hsSpeedDone = '1';
      const btn = document.createElement('a');
      btn.className = 'hs-download-btn';
      btn.textContent = '⚡ Raw 加速';
      btn.href = MIRRORS[0].prefix + rawBtn.href;
      btn.target = '_blank';
      btn.rel = 'noopener noreferrer';
      rawBtn.parentNode.insertBefore(btn, rawBtn.nextSibling);
    }
  }

  // ── GitLab 处理 ────────────────────────────────────────────────────────
  function handleGitLab() {
    document.querySelectorAll('a[href*="/-/blob/"], a[href*="/-/archive/"], a[href*="/releases/download/"]').forEach(link => {
      if (link.nextElementSibling?.classList.contains('hs-download-btn')) return;
      const btn = document.createElement('a');
      btn.className = 'hs-download-btn';
      btn.textContent = '⚡ 加速';
      btn.href = MIRRORS[0].prefix + link.href;
      btn.target = '_blank';
      btn.rel = 'noopener noreferrer';
      link.parentNode.insertBefore(btn, link.nextSibling);
    });
  }

  // ── SourceForge 处理 ──────────────────────────────────────────────────
  function handleSourceForge() {
    document.querySelectorAll('a[href*="/download"]').forEach(link => {
      if (link.nextElementSibling?.classList.contains('hs-download-btn')) return;
      const btn = document.createElement('a');
      btn.className = 'hs-download-btn';
      btn.textContent = '⚡ 直达';
      btn.href = link.href;
      btn.target = '_blank';
      btn.rel = 'noopener noreferrer';
      link.parentNode.insertBefore(btn, link.nextSibling);
    });
  }

  // ── npm 处理 ──────────────────────────────────────────────────────────
  function handleNpm() {
    document.querySelectorAll('a[href*="/package/"]').forEach(link => {
      if (link.nextElementSibling?.classList.contains('hs-download-btn')) return;
      const btn = document.createElement('span');
      btn.className = 'hs-badge';
      btn.textContent = '加速';
      btn.style.cursor = 'pointer';
      btn.title = '点击复制加速后的 npm install 命令';
      btn.addEventListener('click', () => {
        const pkgName = link.href.split('/package/')[1]?.split('/')[0];
        if (pkgName) {
          navigator.clipboard.writeText(`npm install ${pkgName} --registry=https://registry.npmmirror.com`);
          btn.textContent = '✓ 已复制';
          setTimeout(() => btn.textContent = '加速', 2000);
        }
      });
      link.parentNode.insertBefore(btn, link.nextSibling);
    });
  }

  // ── PyPI 处理 ─────────────────────────────────────────────────────────
  function handlePyPI() {
    document.querySelectorAll('a[href*="/pypi/"]').forEach(link => {
      if (link.nextElementSibling?.classList.contains('hs-download-btn')) return;
      const btn = document.createElement('span');
      btn.className = 'hs-badge';
      btn.textContent = '加速';
      btn.style.cursor = 'pointer';
      btn.title = '点击复制加速后的 pip install 命令';
      btn.addEventListener('click', () => {
        const pkgName = link.href.split('/pypi/')[1]?.split('/')[0];
        if (pkgName) {
          navigator.clipboard.writeText(`pip install ${pkgName} -i https://pypi.tuna.tsinghua.edu.cn/simple`);
          btn.textContent = '✓ 已复制';
          setTimeout(() => btn.textContent = '加速', 2000);
        }
      });
      link.parentNode.insertBefore(btn, link.nextSibling);
    });
  }

  // ── 右上角全局菜单 ─────────────────────────────────────────────────────
  function buildMenu() {
    const domain = getCurrentDomain();
    const currentUrl = encodeURIComponent(window.location.href);

    const toggle = document.createElement('button');
    toggle.id = 'hs-speed-toggle';
    toggle.textContent = 'HS↓';
    toggle.title = '高速下载增强菜单';
    document.body.appendChild(toggle);

    const menu = document.createElement('div');
    menu.id = 'hs-speed-menu';

    const siteLabel = document.createElement('div');
    siteLabel.className = 'hs-site-label';
    siteLabel.textContent = `🌐 ${domain}`;
    menu.appendChild(siteLabel);

    const sep1 = document.createElement('div');
    sep1.className = 'hs-sep';
    menu.appendChild(sep1);

    const label = document.createElement('div');
    label.className = 'hs-label';
    label.textContent = '📥 当前页加速选项';
    menu.appendChild(label);

    // 为当前 URL 生成各镜像链接
    MIRRORS.forEach(mirror => {
      if (mirror.domains.includes('*') || mirror.domains.includes(domain)) {
        const a = document.createElement('a');
        a.textContent = `⚡ ${mirror.label}`;
        a.href = mirror.prefix + decodeURIComponent(currentUrl);
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        menu.appendChild(a);
      }
    });

    const sep2 = document.createElement('div');
    sep2.className = 'hs-sep';
    menu.appendChild(sep2);

    const tipsLabel = document.createElement('div');
    tipsLabel.className = 'hs-label';
    tipsLabel.textContent = '💡 使用提示';
    menu.appendChild(tipsLabel);

    const tip1 = document.createElement('div');
    tip1.style.cssText = 'padding: 4px 12px; font-size: 11px; color: #888;';
    tip1.textContent = '• 点击下载按钮旁的「加速」按钮';
    menu.appendChild(tip1);

    const tip2 = document.createElement('div');
    tip2.style.cssText = 'padding: 4px 12px; font-size: 11px; color: #888;';
    tip2.textContent = '• 或从此菜单选择镜像加速';
    menu.appendChild(tip2);

    document.body.appendChild(menu);

    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.style.display = menu.style.display === 'flex' ? 'none' : 'flex';
    });

    document.addEventListener('click', (e) => {
      if (e.target !== toggle && !menu.contains(e.target)) {
        menu.style.display = 'none';
      }
    });
  }

  // ── 站点分发处理 ──────────────────────────────────────────────────────
  function handleCurrentSite() {
    const domain = getCurrentDomain();
    
    switch (true) {
      case domain.includes('github.com'):
        handleGitHub();
        break;
      case domain.includes('gitlab.com'):
        handleGitLab();
        break;
      case domain.includes('bitbucket.org'):
        injectGenericDownloadButtons('a[href*="/downloads/"]');
        break;
      case domain.includes('sourceforge.net'):
        handleSourceForge();
        break;
      case domain.includes('npmjs.com'):
        handleNpm();
        break;
      case domain.includes('pypi.org'):
        handlePyPI();
        break;
      default:
        // 通用处理：查找常见下载链接
        injectGenericDownloadButtons('a[href*="/download"], a[href*=".zip"], a[href*=".tar.gz"], a[href*=".exe"], a[href*=".dmg"], a[href*=".pkg"]');
    }
  }

  // ── 初始化 ────────────────────────────────────────────────────────────
  const obs = new MutationObserver(() => {
    handleCurrentSite();
  });
  
  obs.observe(document.body, { childList: true, subtree: true });

  setTimeout(() => {
    handleCurrentSite();
    if (!document.getElementById('hs-speed-toggle')) {
      buildMenu();
    }
  }, 1000);
})();