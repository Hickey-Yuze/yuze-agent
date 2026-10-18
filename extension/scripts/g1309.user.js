// ==UserScript==
// @name         智能网站导航 (Standalone版)
// @namespace    smart-site-navigator
// @version      2.2
// @description  统计访问频次，自动固定常用网站 (使用 localStorage，无需油猴)
// @match        *://*/*
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  if (window.__smartPinnerLoaded) return;
  window.__smartPinnerLoaded = true;

  // ══════════════════════════════════════════
  // 配置常量
  // ══════════════════════════════════════════
  const CONFIG = {
    TRACK_DAYS: 3,
    PIN_THRESHOLD: 3,
    REMOVE_DAYS: 10,
    STORAGE_KEY: 'smp_global_v2',
    SHORTCUT: { ctrl: true, alt: true, key: 'p' },
  };

  const BLACKLIST = [
    /^chrome:/, /^about:/, /^file:/,
    /alipay\.com/, /weixin\.qq\.com/, /bank/, /pay\.qq\.com/
  ];

  // ══════════════════════════════════════════
  // 工具函数
  // ══════════════════════════════════════════
  function isBlocked(url) { return BLACKLIST.some(r => r.test(url)); }
  function normalizeUrl(url) {
    try {
      const u = new URL(url);
      return `${u.protocol}//${u.hostname}${u.pathname}`.replace(/\/$/, '');
    } catch { return url; }
  }
  function daysAgoTs(days) { return Date.now() - days * 86400 * 1000; }
  function friendlyTime(ts) {
    if (!ts) return '-';
    const diff = Math.floor((Date.now() - ts) / 60000);
    if (diff < 1) return '刚刚';
    if (diff < 60) return `${diff}分钟前`;
    if (diff < 1440) return `${Math.floor(diff / 60)}小时前`;
    return `${Math.floor(diff / 1440)}天前`;
  }
  function getDomain(url) {
    try { return new URL(url).hostname; } catch { return url; }
  }
  function getFaviconUrl(url) {
    try {
      const domain = new URL(url).hostname;
      return `https://favicon.im/${domain}?larger=true`;
    } catch { return ''; }
  }

  // ══════════════════════════════════════════
  // 存储层（使用 localStorage 替代 GM_setValue）
  // ══════════════════════════════════════════
  const Store = {
    read() {
      try {
        const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
        return raw ? JSON.parse(raw) : { urls: {}, pinnedOrder: [] };
      } catch {
        return { urls: {}, pinnedOrder: [] };
      }
    },
    write(data) {
      try {
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(data));
      } catch (e) {
        console.warn('[SmartNav] 存储失败:', e);
      }
    },
    getUrl(url) {
      return this.read().urls[url] || null;
    },
    setUrl(url, entry) {
      const data = this.read();
      data.urls[url] = entry;
      this.write(data);
    },
    getAll() {
      return this.read().urls;
    },
    getPinnedOrder() {
      return this.read().pinnedOrder || [];
    },
    setPinnedOrder(order) {
      const data = this.read();
      data.pinnedOrder = order;
      this.write(data);
    }
  };

  // ══════════════════════════════════════════
  // 访问追踪器
  // ══════════════════════════════════════════
  const Tracker = {
    record(rawUrl) {
      if (isBlocked(rawUrl)) return null;

      const url = normalizeUrl(rawUrl);
      const now = Date.now();
      const windowStart = daysAgoTs(CONFIG.TRACK_DAYS);

      let entry = Store.getUrl(url) || {
        visits: [], pinned: false,
        title: document.title || url, lastVisit: now,
      };

      entry.visits.push(now);
      entry.visits = entry.visits.filter(t => t >= windowStart);
      entry.lastVisit = now;
      if (document.title) entry.title = document.title;

      Store.setUrl(url, entry);
      return { url, entry };
    },
    getCount(url) {
      const entry = Store.getUrl(normalizeUrl(url));
      if (!entry) return 0;
      return entry.visits.filter(t => t >= daysAgoTs(CONFIG.TRACK_DAYS)).length;
    },
  };

  // ══════════════════════════════════════════
  // 固定管理器
  // ══════════════════════════════════════════
  const Pinner = {
    pin(url, title) {
      const entry = Store.getUrl(url) || {
        visits: [], pinned: false,
        title: title || url, lastVisit: Date.now(),
      };
      if (entry.pinned) return false;

      entry.pinned = true;
      entry.pinnedAt = Date.now();
      entry.title = title || entry.title;
      Store.setUrl(url, entry);

      const order = Store.getPinnedOrder().filter(u => u !== url);
      order.unshift(url);
      Store.setPinnedOrder(order);
      return true;
    },
    unpin(url) {
      const entry = Store.getUrl(url);
      if (!entry || !entry.pinned) return false;

      entry.pinned = false;
      Store.setUrl(url, entry);
      Store.setPinnedOrder(Store.getPinnedOrder().filter(u => u !== url));
      return true;
    },
    autoEvaluate(url) {
      const count = Tracker.getCount(url);
      const entry = Store.getUrl(url);
      if (!entry) return;
      if (count >= CONFIG.PIN_THRESHOLD && !entry.pinned) {
        this.pin(url, entry.title);
        return 'auto-pinned';
      }
    },
    cleanup() {
      const data = Store.read();
      const threshold = daysAgoTs(CONFIG.REMOVE_DAYS);
      const trackThreshold = daysAgoTs(CONFIG.TRACK_DAYS);

      let changed = false;
      for (const [url, entry] of Object.entries(data.urls)) {
        const oldLen = entry.visits.length;
        entry.visits = entry.visits.filter(t => t >= trackThreshold);
        if (entry.visits.length !== oldLen) changed = true;

        if (entry.pinned && entry.lastVisit < threshold) {
          entry.pinned = false;
          data.pinnedOrder = data.pinnedOrder.filter(u => u !== url);
          changed = true;
        }

        if (!entry.pinned && entry.visits.length === 0) {
          delete data.urls[url];
          changed = true;
        }
      }
      if (changed) Store.write(data);
    },
  };

  // ══════════════════════════════════════════
  // UI 与 样式
  // ══════════════════════════════════════════
  const STYLES = `
    #smartNavSidebar {
      position: fixed;
      top: 0;
      right: -360px;
      width: 360px;
      height: 100vh;
      background: rgba(30, 30, 35, 0.98);
      backdrop-filter: blur(20px);
      border-left: 1px solid rgba(255, 255, 255, 0.1);
      z-index: 2147483647;
      transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #fff;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    #smartNavSidebar.visible { right: 0; }
    #smartNavSidebar .header {
      padding: 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    #smartNavSidebar .header h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    #smartNavSidebar .closeBtn {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      border: none;
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
      cursor: pointer;
      font-size: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;
    }
    #smartNavSidebar .closeBtn:hover { background: rgba(255, 255, 255, 0.2); }
    #smartNavSidebar .content {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
    }
    #smartNavSidebar .section {
      margin-bottom: 24px;
    }
    #smartNavSidebar .sectionTitle {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: rgba(255, 255, 255, 0.5);
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    #smartNavSidebar .siteItem {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.05);
      margin-bottom: 8px;
      cursor: pointer;
      transition: all 0.2s;
      border: 1px solid transparent;
    }
    #smartNavSidebar .siteItem:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(102, 126, 234, 0.5);
      transform: translateX(-4px);
    }
    #smartNavSidebar .siteItem.pinned {
      border-color: rgba(102, 126, 234, 0.8);
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%);
    }
    #smartNavSidebar .favicon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      object-fit: cover;
      background: rgba(255, 255, 255, 0.1);
    }
    #smartNavSidebar .siteInfo {
      flex: 1;
      min-width: 0;
    }
    #smartNavSidebar .siteTitle {
      font-size: 14px;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-bottom: 4px;
    }
    #smartNavSidebar .siteMeta {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.5);
      display: flex;
      gap: 8px;
    }
    #smartNavSidebar .pinBtn {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      border: none;
      background: transparent;
      color: rgba(255, 255, 255, 0.5);
      cursor: pointer;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }
    #smartNavSidebar .pinBtn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }
    #smartNavSidebar .pinBtn.pinned {
      color: #667eea;
    }
    #smartNavSidebar .emptyState {
      text-align: center;
      padding: 40px 20px;
      color: rgba(255, 255, 255, 0.4);
    }
    #smartNavSidebar .emptyStateIcon {
      font-size: 48px;
      margin-bottom: 16px;
      opacity: 0.5;
    }
    #smartNavToggle {
      position: fixed;
      top: 50%;
      right: 0;
      transform: translateY(-50%);
      width: 40px;
      height: 80px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      border-radius: 8px 0 0 8px;
      color: #fff;
      font-size: 20px;
      cursor: pointer;
      z-index: 2147483646;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: -4px 0 20px rgba(102, 126, 234, 0.4);
      transition: all 0.2s;
    }
    #smartNavToggle:hover {
      width: 48px;
      box-shadow: -6px 0 30px rgba(102, 126, 234, 0.6);
    }
    #smartNavToast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff;
      padding: 12px 20px;
      border-radius: 12px;
      font-size: 14px;
      z-index: 2147483648;
      transform: translateY(100px);
      opacity: 0;
      transition: all 0.3s;
      box-shadow: 0 8px 32px rgba(102, 126, 234, 0.4);
    }
    #smartNavToast.visible {
      transform: translateY(0);
      opacity: 1;
    }
  `;

  const SideBar = {
    visible: false,
    elements: {},

    mount() {
      if (document.getElementById('smartNavSidebar')) return;

      // 注入样式
      const style = document.createElement('style');
      style.textContent = STYLES;
      document.head.appendChild(style);

      // 创建侧边栏
      const sidebar = document.createElement('div');
      sidebar.id = 'smartNavSidebar';
      sidebar.innerHTML = `
        <div class="header">
          <h2>📌 智能导航</h2>
          <button class="closeBtn">&times;</button>
        </div>
        <div class="content">
          <div class="section">
            <div class="sectionTitle">📍 已固定</div>
            <div id="smartNavPinned"></div>
          </div>
          <div class="section">
            <div class="sectionTitle">🕐 最近访问</div>
            <div id="smartNavRecent"></div>
          </div>
        </div>
      `;
      document.body.appendChild(sidebar);

      // 创建切换按钮
      const toggle = document.createElement('button');
      toggle.id = 'smartNavToggle';
      toggle.innerHTML = '&#9776;';
      document.body.appendChild(toggle);

      // 创建 Toast
      const toast = document.createElement('div');
      toast.id = 'smartNavToast';
      document.body.appendChild(toast);

      // 绑定元素
      this.elements = {
        sidebar,
        toggle,
        toast,
        closeBtn: sidebar.querySelector('.closeBtn'),
        pinned: document.getElementById('smartNavPinned'),
        recent: document.getElementById('smartNavRecent'),
      };

      // 绑定事件
      this.elements.toggle.addEventListener('click', () => this.toggle());
      this.elements.closeBtn.addEventListener('click', () => this.hide());
      sidebar.addEventListener('click', (e) => {
        if (e.target === sidebar) this.hide();
      });

      this.refresh();
    },

    toggle() {
      if (this.visible) {
        this.hide();
      } else {
        this.show();
      }
    },

    show() {
      this.elements.sidebar.classList.add('visible');
      this.visible = true;
      this.refresh();
    },

    hide() {
      this.elements.sidebar.classList.remove('visible');
      this.visible = false;
    },

    refresh() {
      const data = Store.read();
      const urls = Object.entries(data.urls);

      // 分离固定和未固定
      const pinned = urls.filter(([, e]) => e.pinned).sort((a, b) => {
        const orderA = data.pinnedOrder.indexOf(a[0]);
        const orderB = data.pinnedOrder.indexOf(b[0]);
        return orderA - orderB;
      });

      const recent = urls
        .filter(([, e]) => !e.pinned)
        .sort((a, b) => b[1].lastVisit - a[1].lastVisit)
        .slice(0, 10);

      this.renderList(this.elements.pinned, pinned, true);
      this.renderList(this.elements.recent, recent, false);
    },

    renderList(container, items, isPinned) {
      if (items.length === 0) {
        container.innerHTML = `
          <div class="emptyState">
            <div class="emptyStateIcon">${isPinned ? '📌' : '🌐'}</div>
            <div>${isPinned ? '还没有固定任何网站' : '暂无访问记录'}</div>
          </div>
        `;
        return;
      }

      container.innerHTML = items.map(([url, entry]) => `
        <div class="siteItem ${entry.pinned ? 'pinned' : ''}" data-url="${url}">
          <img class="favicon" src="${getFaviconUrl(url)}" onerror="this.style.opacity=0.3">
          <div class="siteInfo">
            <div class="siteTitle">${entry.title || getDomain(url)}</div>
            <div class="siteMeta">
              <span>${getDomain(url)}</span>
              <span>&bull;</span>
              <span>${entry.visits?.length || 0}次访问</span>
              <span>&bull;</span>
              <span>${friendlyTime(entry.lastVisit)}</span>
            </div>
          </div>
          <button class="pinBtn ${entry.pinned ? 'pinned' : ''}" data-url="${url}">
            ${entry.pinned ? '&#9733;' : '&#9734;'}
          </button>
        </div>
      `).join('');

      // 绑定点击事件
      container.querySelectorAll('.siteItem').forEach(item => {
        item.addEventListener('click', (e) => {
          if (!e.target.closest('.pinBtn')) {
            window.open(item.dataset.url, '_blank');
          }
        });
      });

      container.querySelectorAll('.pinBtn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const url = btn.dataset.url;
          const entry = Store.getUrl(url);
          if (entry?.pinned) {
            Pinner.unpin(url);
            this.showToast('📌 已取消固定');
          } else {
            Pinner.pin(url, entry?.title);
            this.showToast('📌 已固定到导航');
          }
          this.refresh();
        });
      });
    },

    showToast(message) {
      this.elements.toast.textContent = message;
      this.elements.toast.classList.add('visible');
      setTimeout(() => {
        this.elements.toast.classList.remove('visible');
      }, 3000);
    },
  };

  // ══════════════════════════════════════════
  // 主流程
  // ══════════════════════════════════════════
  function main() {
    Pinner.cleanup();

    const result = Tracker.record(window.location.href);
    if (result) {
      const action = Pinner.autoEvaluate(result.url);
      if (action === 'auto-pinned') {
        setTimeout(() => {
          SideBar.showToast(`📌 已自动固定：${document.title || result.url}`);
        }, 1500);
      }
    }

    SideBar.mount();

    // 使用 storage 事件监听其他标签页的变化
    window.addEventListener('storage', (e) => {
      if (e.key === CONFIG.STORAGE_KEY && SideBar.visible) {
        SideBar.refresh();
      }
    });

    document.addEventListener('keydown', e => {
      if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        SideBar.toggle();
      }
    });

    ['pushState', 'replaceState'].forEach(method => {
      const orig = history[method].bind(history);
      history[method] = function (...args) {
        orig(...args);
        setTimeout(() => {
          Tracker.record(window.location.href);
          Pinner.autoEvaluate(normalizeUrl(window.location.href));
          if (SideBar.visible) SideBar.refresh();
        }, 300);
      };
    });

    window.addEventListener('popstate', () => {
      setTimeout(() => {
        Tracker.record(window.location.href);
        if (SideBar.visible) SideBar.refresh();
      }, 300);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
  } else {
    main();
  }

})();