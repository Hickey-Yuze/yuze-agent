// ==UserScript==
// @name         百度搜索增强 (精简版)
// @namespace    http://tampermonkey.net/
// @version      2.4
// @description  去重定向、去广告、结果计数、自动翻页 (支持实时开关)
// @author       You
// @match        https://www.baidu.com/s?*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @connect      *
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  // ─── 配置项 ──────────────────────────────────────────────────────────────
  const DEFAULTS = {
    enableRedirect:  true,
    enableAdRemove:  true,
    enableCounter:   true,
    enableAutoPager: true,
  };

  function getCfg(key) {
    try { return GM_getValue(key, DEFAULTS[key]); } catch { return DEFAULTS[key]; }
  }
  function setCfg(key, val) {
    try { GM_setValue(key, val); } catch {}
  }

  const CFG = {};
  for (const k of Object.keys(DEFAULTS)) CFG[k] = getCfg(k);

  // ─── 引擎检测 ────────────────────────────────────────────────────────────
  const host = location.hostname;
  const ENGINE =
    host.includes('baidu.com')  ? 'baidu'  :
    host.includes('sogou.com')  ? 'sogou'  :
    host.includes('bing.com')   ? 'bing'   :
    host.includes('google.com') ? 'google' :
    host.includes('so.com')     ? 'haosou' : 'unknown';

  if (ENGINE === 'unknown') return;

  // ─── 1. 去重定向 (支持还原) ──────────────────────────────────────────────
  function getCleanUrl(a) {
    if (!a) return null;
    const href = a.getAttribute('href') || '';

    if (ENGINE === 'baidu') {
      const landurl = a.getAttribute('data-landurl');
      if (landurl && landurl.startsWith('http')) return landurl;
      const parent = a.closest('[data-lp], [mu]');
      if (parent) {
        const lp = parent.getAttribute('data-lp');
        if (lp) return decodeURIComponent(lp);
        const mu = parent.getAttribute('mu');
        if (mu && mu.startsWith('http')) return mu;
      }
      return null;
    }

    if (ENGINE === 'sogou') {
      if (href.includes('/link?url=') || href.includes('sogou.com/link')) return '__sogou_pending__';
      return null;
    }

    if (ENGINE === 'google') {
      if (href.includes('/url?')) {
        try {
          const u = new URL(href, location.origin);
          const q = u.searchParams.get('q') || u.searchParams.get('url');
          if (q && q.startsWith('http')) return q;
        } catch {}
      }
      return null;
    }

    if (ENGINE === 'haosou') {
      if (href.includes('so.com/link?m=')) return '__haosou_pending__';
      return null;
    }

    return null;
  }

  function resolveRedirect(a, redirectUrl) {
    try {
      if (typeof GM_xmlhttpRequest !== 'undefined') {
        GM_xmlhttpRequest({
          method: 'HEAD',
          url: redirectUrl,
          anonymous: true,
          onload(resp) {
            const final = resp.finalUrl || resp.responseURL;
            if (final && final.startsWith('http') && !final.includes('sogou.com') && !final.includes('so.com')) {
              if (!a.dataset.tabOrigHref) {
                a.dataset.tabOrigHref = a.href;
              }
              a.href = final;
              a.dataset.tabResolved = '1';
            }
          },
          onerror() {},
        });
      }
    } catch {}
  }

  function processRedirect() {
    const selectors = {
      baidu:  'h3 a, .t a, .c-title a',
      sogou:  'h3 a, .vr-title a',
      bing:   'h2 a',
      google: 'h3 a',
      haosou: 'h3 a',
    };
    const sel = selectors[ENGINE];
    const links = document.querySelectorAll(sel);
    
    links.forEach(a => {
      if (a.dataset.tabRedirect) {
        if (CFG.enableRedirect) {
          if (a.dataset.tabCleanUrl) {
            a.href = a.dataset.tabCleanUrl;
          }
        } else {
          if (a.dataset.tabOrigHref) {
            a.href = a.dataset.tabOrigHref;
          }
        }
        return;
      }

      a.dataset.tabRedirect = '1';
      a.dataset.tabOrigHref = a.href;

      if (!CFG.enableRedirect) return;

      const clean = getCleanUrl(a);
      if (!clean) return;

      if (clean === '__sogou_pending__') {
        const orig = new URL(a.href.startsWith('http') ? a.href : 'https://www.sogou.com' + a.getAttribute('href')).href;
        resolveRedirect(a, orig);
      } else if (clean === '__haosou_pending__') {
        resolveRedirect(a, a.href);
      } else {
        a.dataset.tabCleanUrl = clean;
        a.href = clean;
        a.dataset.tabResolved = '1';
      }
    });
  }

  // ─── 2. 移除广告 (✅ 修复：增强识别规则) ────────────────────────────────
  function removeBaiduAds() {
    if (ENGINE !== 'baidu') return;
    const contentLeft = document.getElementById('content_left');
    if (!contentLeft) return;

    // ✅ 多种广告标识选择器
    const adSelectors = [
      '.ec-tuiguang',           // 传统推广标识
      '[data-tuiguang]',        // 带有 data-tuiguang 属性
      '.c-container:has(.cos-clamp-ad)', // 包含广告类的容器
      '.result:has([class*="tuiguang"])', // 标题或内容包含推广字样
      '.result-op[tpl*="tuiguang"]', // 模板包含推广
      // ✅ 新增：通过右下角"广告"文本识别
      '.result:has(.c-color-gray):has([aria-hidden="true"])', 
    ];

    // ✅ 增强检测：通过文本内容识别（作为兜底方案）
    const allResults = contentLeft.querySelectorAll('.result, .c-container');
    allResults.forEach(el => {
      // 检查是否包含"广告"文本标识
      const textContent = el.textContent || '';
      const hasAdText = textContent.includes('广告') && el.querySelector('[class*="gray"]');
      
      // 检查是否已被标记
      if (el.dataset.tabAd) {
        // 根据开关状态切换显示
        if (CFG.enableAdRemove) {
          el.style.setProperty('display', 'none', 'important');
        } else {
          el.style.removeProperty('display');
          if (el.getAttribute('style') === '') {
            el.removeAttribute('style');
          }
        }
        return;
      }

      // ✅ 检测是否为广告
      let isAd = false;
      
      // 方式1：通过选择器检测
      for (const selector of adSelectors) {
        if (el.matches(selector) || el.querySelector(selector)) {
          isAd = true;
          break;
        }
      }

      // 方式2：通过 URL 特征检测（广告链接通常包含特定参数）
      if (!isAd) {
        const links = el.querySelectorAll('a[href]');
        for (const link of links) {
          const href = link.getAttribute('href') || '';
          if (href.includes('e.baidu.com') || 
              href.includes('tuiguang') || 
              href.includes('cm.baidu.com') ||
              href.includes('click.ecom.baidu')) {
            isAd = true;
            break;
          }
        }
      }

      // 方式3：通过文本内容识别
      if (!isAd && hasAdText) {
        isAd = true;
      }

      // 标记并处理
      if (isAd) {
        el.dataset.tabAd = '1';
        el.dataset.tabOrigDisplay = el.style.display || '';
        
        if (CFG.enableAdRemove) {
          el.style.setProperty('display', 'none', 'important');
        }
      }
    });
  }

  // ─── 3. 结果计数 ─────────────────────────────────────────────────────────
  function addCounter() {
    if (!CFG.enableCounter) return;
    if (document.getElementById('tab-se-counter')) return;
    const selectors = {
      baidu:  '#content_left .result, #content_left .c-container',
      sogou:  '.vrwrap',
      bing:   '#b_results li.b_algo',
      google: '#rso .g',
      haosou: '.res-list .res-item',
    };
    const count = document.querySelectorAll(selectors[ENGINE]).length;
    if (!count) return;
    const badge = document.createElement('div');
    badge.id = 'tab-se-counter';
    badge.textContent = `共 ${count} 条结果`;
    badge.style.cssText = [
      'position:fixed', 'bottom:20px', 'right:20px', 'z-index:99999',
      'background:rgba(0,0,0,.65)', 'color:#fff',
      'padding:5px 12px', 'border-radius:20px',
      'font-size:12px', 'pointer-events:none',
      'font-family:Arial,sans-serif',
    ].join(';');
    document.body.appendChild(badge);
    setTimeout(() => {
      badge.style.transition = 'opacity .5s';
      badge.style.opacity = '0';
      setTimeout(() => badge.remove(), 600);
    }, 3000);
  }

  // ─── 4. 控制面板 ─────────────────────────────────────────────────────────
  function buildPanel() {
    if (document.getElementById('tab-se-panel')) return;
    const toggle = document.createElement('div');
    toggle.id = 'tab-se-toggle';
    toggle.title = '搜索增强设置';
    toggle.textContent = '⚙';
    toggle.style.cssText = [
      'position:fixed', 'top:60px', 'right:8px', 'z-index:100000',
      'width:28px', 'height:28px', 'line-height:28px', 'text-align:center',
      'background:rgba(0,0,0,.5)', 'color:#fff',
      'border-radius:50%', 'cursor:pointer', 'font-size:16px',
      'user-select:none',
    ].join(';');

    const panel = document.createElement('div');
    panel.id = 'tab-se-panel';
    panel.style.cssText = [
      'position:fixed', 'top:95px', 'right:8px', 'z-index:100000',
      'background:#fff', 'border:1px solid #ddd', 'border-radius:10px',
      'padding:12px 14px', 'box-shadow:0 4px 20px rgba(0,0,0,.15)',
      'font-family:Arial,sans-serif', 'font-size:13px',
      'display:none', 'min-width:160px',
    ].join(';');

    const items = [
      ['enableRedirect',  '1. 去重定向'],
      ['enableAdRemove',  '2. 去广告 (百度)'],
      ['enableCounter',   '3. 结果计数'],
      ['enableAutoPager', '4. 自动翻页'],
    ];

    items.forEach(([key, label]) => {
      const row = document.createElement('label');
      row.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:7px;cursor:pointer;';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = CFG[key];
      cb.addEventListener('change', () => {
        CFG[key] = cb.checked;
        setCfg(key, cb.checked);
        
        if (key === 'enableAdRemove') {
          removeBaiduAds();
        }
        if (key === 'enableRedirect') {
          processRedirect();
        }
        if (key === 'enableCounter' && cb.checked) {
          addCounter();
        }
        if (key === 'enableAutoPager') {
          if (cb.checked) {
            initAutoPager();
          } else {
            stopAutoPager();
          }
        }
      });
      row.appendChild(cb);
      row.appendChild(document.createTextNode(label));
      panel.appendChild(row);
    });

    const hint = document.createElement('div');
    hint.style.cssText = 'font-size:11px;color:#999;margin-top:4px;';
    hint.textContent = '开关实时生效，无需刷新';
    panel.appendChild(hint);

    toggle.addEventListener('click', () => {
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    });

    document.body.appendChild(toggle);
    document.body.appendChild(panel);
  }

  // ─── 5. 自动翻页 ─────────────────────────────────────────────────────────
  let autoPagerRunning = false;
  let nextPageUrl = null;
  let pageNum = 1;
  let scrollHandler = null;

  function getNextPageUrl() {
    const sel = {
      baidu:  '#page .n, #page a[class~="n"]',
      sogou:  '#sogou_next, a[id="sogou_next"]',
      bing:   'a.sb_pagN, a.sb_pagN_bp',
      google: 'a#pnnext, a[aria-label="下一页"]',
      haosou: '.pg a[title="下一页"], .next',
    };
    const a = document.querySelector(sel[ENGINE]);
    return a?.href || null;
  }

  function loadNextPage(url) {
    if (autoPagerRunning || !CFG.enableAutoPager) return;
    autoPagerRunning = true;
    pageNum++;

    const loader = document.createElement('div');
    loader.id = 'tab-autopager-loader';
    loader.style.cssText = 'text-align:center;padding:24px;color:#999;font-size:13px;font-family:Arial;';
    loader.textContent = '正在加载下一页...';

    const appendTarget = {
      baidu:  '#content_left',
      sogou:  '#main',
      bing:   '#b_results',
      google: '#rso',
      haosou: '.res-list',
    };
    const container = document.querySelector(appendTarget[ENGINE]);
    if (!container) { autoPagerRunning = false; return; }

    container.appendChild(loader);

    fetch(url)
      .then(resp => resp.text())
      .then(html => {
        loader.remove();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const newItems = doc.querySelectorAll(
          ENGINE === 'baidu'  ? '#content_left .result, #content_left .c-container' :
          ENGINE === 'sogou'  ? '.vrwrap' :
          ENGINE === 'bing'   ? '#b_results li.b_algo' :
          ENGINE === 'google' ? '#rso .g' :
          '.res-list .res-item'
        );

        if (!newItems.length) { autoPagerRunning = false; return; }

        const divider = document.createElement('div');
        divider.style.cssText = 'border-top:2px dashed #e0e0e0;margin:16px 0;text-align:center;color:#aaa;font-size:12px;padding:4px 0;';
        divider.textContent = `── 第 ${pageNum} 页 ──`;
        container.appendChild(divider);

        newItems.forEach(item => {
          const clone = document.importNode(item, true);
          container.appendChild(clone);
        });

        setTimeout(() => {
          processRedirect();
          removeBaiduAds();
        }, 200);

        const nextSelMap = {
          baidu:  '#page .n',
          sogou:  '#sogou_next',
          bing:   'a.sb_pagN',
          google: 'a#pnnext',
          haosou: '.pg a[title="下一页"]',
        };
        const newNext = doc.querySelector(nextSelMap[ENGINE]);
        nextPageUrl = newNext?.href || null;

        autoPagerRunning = false;

        const oldHint = document.getElementById('tab-autopager-hint');
        if (oldHint) oldHint.remove();

        const hint = document.createElement('div');
        hint.id = 'tab-autopager-hint';
        hint.style.cssText = 'text-align:center;padding:12px;color:#aaa;font-size:12px;font-family:Arial;';
        hint.textContent = nextPageUrl ? '↓ 滚动到底部自动加载下一页' : '— 已到最后一页 —';
        container.appendChild(hint);
      })
      .catch(err => {
        console.error('自动翻页错误:', err);
        loader.remove();
        autoPagerRunning = false;
      });
  }

  function initAutoPager() {
    if (!CFG.enableAutoPager) return;
    
    if (scrollHandler) {
      window.removeEventListener('scroll', scrollHandler);
    }

    nextPageUrl = getNextPageUrl();

    function ensureFooterHint() {
      if (document.getElementById('tab-autopager-hint')) return;
      const hint = document.createElement('div');
      hint.id = 'tab-autopager-hint';
      hint.style.cssText = 'text-align:center;padding:12px;color:#aaa;font-size:12px;font-family:Arial;';
      hint.textContent = nextPageUrl ? '↓ 滚动到底部自动加载下一页' : '— 已到最后一页 —';
      const appendTarget = {
        baidu:  '#content_left',
        sogou:  '#main',
        bing:   '#b_results',
        google: '#rso',
        haosou: '.res-list',
      };
      const container = document.querySelector(appendTarget[ENGINE]);
      if (container) container.appendChild(hint);
    }

    ensureFooterHint();

    scrollHandler = () => {
      if (!nextPageUrl || autoPagerRunning || !CFG.enableAutoPager) return;
      const scrolledToBottom = window.innerHeight + window.scrollY >= document.body.scrollHeight - 600;
      if (scrolledToBottom) {
        document.getElementById('tab-autopager-hint')?.remove();
        loadNextPage(nextPageUrl);
      }
    };

    window.addEventListener('scroll', scrollHandler, { passive: true });
  }

  function stopAutoPager() {
    if (scrollHandler) {
      window.removeEventListener('scroll', scrollHandler);
      scrollHandler = null;
    }
    const hint = document.getElementById('tab-autopager-hint');
    if (hint) hint.remove();
  }

  // ─── MutationObserver ────────────────────────────────────────────────────
  function initObserver() {
    const targets = {
      baidu:  '#content_left',
      sogou:  '#main',
      bing:   '#b_results',
      google: '#rso, #search',
      haosou: '.res-list',
    };
    const el = document.querySelector(targets[ENGINE]);
    if (!el) return;
    const obs = new MutationObserver(() => {
      processRedirect();
      removeBaiduAds();
    });
    obs.observe(el, { childList: true, subtree: true });
  }

  // ─── 初始化 ──────────────────────────────────────────────────────────────
  function init() {
    removeBaiduAds();
    processRedirect();
    addCounter();
    buildPanel();
    initAutoPager();
    initObserver();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();