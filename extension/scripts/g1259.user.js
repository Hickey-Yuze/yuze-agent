// ==UserScript==
// @name         搜索结果净化工具
// @version      3.0.0
// @description  百度、必应、Google 搜索结果中过滤影响浏览体验的无效内容
// @author       脾气
// @match        *://www.baidu.com/*
// @match        *://www.bing.com/*
// @match        *://cn.bing.com/*
// @match        *://www.google.com/*
// @match        *://www.google.com.hk/*
// @match        *://www.google.co.jp/*
// @match        *://www.google.com.tw/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
  "use strict";

  // ========== 配置 ==========
  const CONFIG = {
    DEBUG: false,
    DEBOUNCE_MS: 150,
    ROUTE_DELAY_MS: 250,
    MAX_IFRAME_DEPTH: 2,
    OBSERVER_THROTTLE_MIN_MS: 50,
  };

  const log = (...args) => CONFIG.DEBUG && console.log("[去广告]", ...args);
  const warn = (...args) => console.warn("[去广告]", ...args);

  // ========== 多引擎广告配置 ==========
  const ENGINE_CONFIG = {
    baidu: {
      domainPattern: /baidu\.com/,
      // 广告标识选择器（优先级从高到低）
      adMarkers: [
        /* 品牌推广/商业推广标签 */
        ".ec-tuiguang",
        ".ecfc-tuiguang",
        /* 推荐广告卡片 */
        ".c-recomm-wrap",
        ".ec_d20_recomm_link",
        ".ec-figcaption",
        /* 百度热搜/推广 */
        "[data-tuijian]",
        "[data-url*='baidu.com/baidu.php?']",
        /* 广告标识文字匹配（通过 data 属性或 class） */
        "[class*='tuiguang']",
        "[class*='ec_'][class*='ad']",
        /* 带有广告标识的容器 */
        ".ec_wide_ad",
        ".EC_result",
        "[data-click*='tuiguang']",
      ],
      // 搜索结果容器：通过 closest 定位到广告所在的整条结果进行隐藏
      containerSelectors: ".c-container, .result-op, .result, [class*='c-container']",
      // 侧边栏/底部等位置
      adSidebarScopes: ["#con-right-bottom", "#content_right", "#con-right-top"],
      sidebarAdMarkers: [
        ".ad-block",
        ".ec-tuiguang",
        "[class*='tuijian']",
        "[data-tuiguang]",
      ],
      observeTargets: ["#content_left", "#results", "#container", "body"],
    },

    bing: {
      domainPattern: /bing\.com/,
      adMarkers: [
        /* 主要广告标识 */
        ".b_ad",
        ".b_adTop",
        ".sb_ad",
        '[data-adcode]',
        /* Bing 广告相关 */
        "[class*='b_ad']",
        ".b_algo[data-adurl]",
        /* 主结果中的广告 */
        "li.b_ad",
        '.b_caption + p[class*="ad"]',
      ],
      // Bing 的广告结果本身就是 li.b_ad 或含广告属性
      containerSelectors: "li.b_ad, .b_ad, [data-adcode]",
      adSidebarScopes: ["#b_context", ".b_sideBleed"],
      sidebarAdMarkers: [".sb_ad", ".b_ad", "[data-adcode]"],
      observeTargets: ["#b_results", "#b_context", "body"],
    },

    google: {
      domainPattern: /google\.(com|com\.hk|co\.jp|com\.tw)/,
      adMarkers: [
        /* 文字广告 */
        '[data-text-ad]',
        '[data-rw="推荐"]',
        /* 购物广告 */
        ".pla-unit",
        ".pla-link",
        /* 商业单元 */
        ".commercial-unit-desktop-top",
        ".commercial-unit-desktop-rhs",
        ".commercial-unit-desktop-bottom",
        /* Google Ads 容器 */
        "#tads > div",
        "#tadsb > div",
        ".cu-container",
        /* 含 Ad 标签的元素（通过文本内容检测） */
        '[aria-label*="Sponsored"]',
        '[aria-label*="广告"]',
      ],
      containerSelectors: '[data-text-ad], #tads > div, #tadsb > div, .cu-container, .pla-unit, [aria-label*="Sponsored"], [aria-label*="广告"]',
      adSidebarScopes: ["#taw", "#rhs", ".commercial-unit-desktop-rhs", "#bottomads"],
      sidebarAdMarkers: [
        ".pla-unit",
        ".commercial-unit-desktop-top",
        '[data-text-ad]',
        '[aria-label*="Sponsored"]',
      ],
      observeTargets: ["#search", "#rso", "#tads", "#rhs", "body"],
    },
  };

  // ========== 状态管理 ==========
  const state = {
    observer: null,
    lastRunTime: 0,
    removeCount: 0,
    initialized: false,
  };

  // ========== 工具函数 ==========
  function detectEngine() {
    const host = location.hostname;
    for (const [name, config] of Object.entries(ENGINE_CONFIG)) {
      if (config.domainPattern.test(host)) return { name, config };
    }
    return null;
  }

  /**
   * 安全地查询选择器，忽略无效选择器异常
   */
  function safeQuerySelectorAll(root, selector) {
    try {
      return root.querySelectorAll(selector);
    } catch (e) {
      warn(`无效选择器: ${selector}`, e.message);
      return [];
    }
  }

  /**
   * 安全地执行 closest，支持多选择器
   */
  function safeClosest(element, selectors) {
    if (!element || !selectors) return null;
    // 如果是字符串，直接使用
    if (typeof selectors === "string") {
      try { return element.closest(selectors); }
      catch { return null; }
    }
    // 如果是数组/逗号分隔的字符串，逐个尝试
    const selList = typeof selectors === "string" ? selectors.split(",").map(s => s.trim()) : selectors;
    for (const sel of selList) {
      try {
        const found = element.closest(sel);
        if (found) return found;
      } catch { /* 忽略无效选择器 */ }
    }
    return null;
  }

  /**
   * 检查元素是否包含指定文本（用于 :contains 替代方案）
   */
  function elementContainsText(el, text) {
    return el && el.textContent.includes(text);
  }

  /**
   * 通过文本内容查找包含"Ad"/"广告"/"Sponsored"的父容器
   */
  function findAdsByTextLabel(scope, containerSelector) {
    const results = [];
    const adKeywords = ["Ad", "广告", "Sponsored", "推广"];
    
    try {
      // 在指定范围内查找带有广告关键词的元素
      const candidates = scope.querySelectorAll(containerSelector.split(",")[0]);
      for (const candidate of candidates) {
        if (candidate.hasAttribute("data-ad-removed")) continue;
        
        // 检查是否含有广告标识文本
        const text = candidate.textContent || "";
        for (const keyword of adKeywords) {
          // 更精确的匹配：检查是否有独立的广告标签
          const labelEls = candidate.querySelectorAll(
            'span, div, label, [role="text"], [class*="ad-label"], [class*="sponsored"]'
          );
          for (const label of labelEls) {
            if (label.children.length === 0 && label.textContent.trim() === keyword) {
              results.push(candidate);
              break;
            }
          }
          if (results.includes(candidate)) break;
        }
      }
    } catch (e) {
      warn("文本标签检测异常:", e.message);
    }
    return results;
  }

  // ========== 广告移除核心逻辑 ==========
  function removeAds(config) {
    let removedThisRound = 0;

    try {
      // 1. 根据 adMarkers 定位广告 → 找到搜索结果容器 → 隐藏整条结果
      config.adMarkers.forEach((selector) => {
        safeQuerySelectorAll(document, selector).forEach((el) => {
          const container = safeClosest(el, config.containerSelectors);
          if (container && !container.hasAttribute("data-ad-removed")) {
            hideElement(container);
            removedThisRound++;
            log("已移除广告:", container.tagName, container.className);
          }
        });
      });

      // 2. Google 特殊处理：通过文本标签检测广告（替代无效的 :contains 选择器）
      if (detectEngine()?.name === "google") {
        const textLabelAds = findAdsByTextLabel(
          document.querySelector("#rso") || document,
          config.containerSelectors
        );
        textLabelAds.forEach((ad) => {
          if (!ad.hasAttribute("data-ad-removed")) {
            hideElement(ad);
            removedThisRound++;
            log("已移除(文本标签检测):", ad.tagName, ad.className);
          }
        });
      }

      // 3. 处理侧边栏/底部等辅助区域的广告
      config.adSidebarScopes.forEach((scopeSel) => {
        const scope = document.querySelector(scopeSel);
        if (!scope) return;
        config.sidebarAdMarkers.forEach((marker) => {
          safeQuerySelectorAll(scope, marker).forEach((ad) => {
            if (!ad.hasAttribute("data-ad-removed")) {
              hideElement(ad);
              removedThisRound++;
              log("已移除侧栏广告:", ad.tagName, ad.className);
            }
          });
        });
      });

      state.removeCount += removedThisRound;
      
      if (removedThisRound > 0) {
        log(`本轮清理完成，移除 ${removedThisRound} 个广告元素（累计 ${state.removeCount}）`);
      }
    } catch (e) {
      warn("执行异常:", e.message, e.stack);
    }

    return removedThisRound;
  }

  /**
   * 统一的隐藏元素方法
   */
  function hideElement(el) {
    el.style.setProperty("display", "none", "important");
    el.setAttribute("data-ad-removed", timestamp());
    el.setAttribute("data-ad-remover", "v3");
  }

  function timestamp() {
    return Date.now().toString(36);
  }

  // ========== 同源 iframe 处理 ==========
  function removeAdsInIframes(config, depth = 0) {
    if (depth >= CONFIG.MAX_IFRAME_DEPTH) return;

    document.querySelectorAll("iframe").forEach((iframe) => {
      try {
        const iframeDoc = iframe.contentDocument;
        if (!iframeDoc) return;

        // 对 iframe 内部执行相同的广告移除逻辑
        config.adMarkers.forEach((selector) => {
          safeQuerySelectorAll(iframeDoc, selector).forEach((el) => {
            const container = safeClosest(el, config.containerSelectors);
            if (container && !container.hasAttribute("data-ad-removed")) {
              hideElement(container);
              log(`已移除 iframe(depth=${depth})内广告`);
            }
          });
        });

        // 递归处理嵌套 iframe
        if (depth < CONFIG.MAX_IFRAME_DEPTH - 1) {
          try {
            iframeDoc.querySelectorAll("iframe").forEach((nestedIframe) => {
              const nestedDoc = nestedIframe.contentDocument;
              if (nestedDoc) {
                config.adMarkers.forEach((selector) => {
                  safeQuerySelectorAll(nestedDoc, selector).forEach((el) => {
                    const container = safeClosest(el, config.containerSelectors);
                    if (container && !container.hasAttribute("data-ad-removed")) {
                      hideElement(container);
                    }
                  });
                });
              }
            });
          } catch (_) {
            // 跨域嵌套 iframe 静默跳过
          }
        }
      } catch (_) {
        // 跨域 iframe 静默跳过
      }
    });
  }

  // ========== Google 专用额外清理 ==========
  function googleExtraCleanup(config) {
    const extraSelectors = [
      ".commercial-unit-desktop-top",
      ".commercial-unit-desktop-rhs",
      ".commercial-unit-desktop-bottom",
      "#taw .commercial-unit",
      "#bottomads",
    ];

    extraSelectors.forEach((sel) => {
      safeQuerySelectorAll(document, sel).forEach((ad) => {
        if (!ad.hasAttribute("data-ad-removed")) {
          hideElement(ad);
          log("已移除 Google 附加广告:", sel);
        }
      });
    });
  }

  // ========== 主入口执行 ==========
  function executeAdRemoval(engine) {
    removeAds(engine.config);
    removeAdsInIframes(engine.config);
    if (engine.name === "google") googleExtraCleanup(engine.config);
  }

  // ========== 样式注入 ==========
  function injectStyle() {
    if (document.getElementById("search-ad-remover-style")) return;
    const style = document.createElement("style");
    style.id = "search-ad-remover-style";
    style.textContent = `
      /* 搜索引擎去广告 - 全局隐藏规则 */
      [data-ad-removed="true"] { display: none !important; }
      
      /* 预防性规则：针对已知广告模式 */
      .ec-tuiguang,
      .ecfc-tuiguang,
      .c-recomm-wrap,
      .ec_d20_recomm_link,
      .b_ad,
      .b_adTop,
      .sb_ad,
      [data-text-ad],
      #tads,
      #tadsb {
        /* 不直接隐藏，仅标记；由 JS 控制精确移除 */
      }
    `;
    document.head.appendChild(style);
    log("样式已注入");
  }

  // ========== DOM 变化监听（带防抖 + 节流） ==========
  let debounceTimer = null;

  function setupMutationObserver(config) {
    // 智能选择观察目标：优先选择最具体的容器
    let target = null;
    for (const sel of config.observeTargets) {
      const el = document.querySelector(sel);
      if (el) {
        target = el;
        log("观察目标:", sel);
        break;
      }
    }
    if (!target) {
      target = document.body;
      log("观察目标: body（回退）");
    }

    // 清理旧 observer
    if (state.observer) {
      state.observer.disconnect();
    }

    state.observer = new MutationObserver((mutations) => {
      // 快速检查：只在实际有节点变化时才触发
      const hasRelevantChange = mutations.some((m) =>
        m.addedNodes.length > 0 || (m.type === "attributes" && m.attributeName === "class")
      );

      if (!hasRelevantChange) return;

      // 节流检查
      const now = Date.now();
      if (now - state.lastRunTime < CONFIG.OBSERVER_THROTTLE_MIN_MS) return;

      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        state.lastRunTime = Date.now();
        executeAdRemoval({ name: detectEngine()?.name, config });
      }, CONFIG.DEBOUNCE_MS);
    });

    state.observer.observe(target, {
      childList: true,
      subtree: true,
      attributes: false, // 减少不必要的触发
    });

    log("MutationObserver 已启动");
    return state.observer;
  }

  // ========== 路由变化监听（SPA 兼容） ==========
  function setupRouteListener(config) {
    const schedule = () => {
      setTimeout(() => executeAdRemoval({ name: detectEngine()?.name, config }), CONFIG.ROUTE_DELAY_MS);
      // 同时重新扫描 iframe（SPA 导航后可能新增）
      setTimeout(() => removeAdsInIframes(config), CONFIG.ROUTE_DELAY_MS + 100);
    };

    // 使用事件监听而非重写原生方法（减少冲突）
    window.addEventListener("popstate", schedule, { passive: true });
    window.addEventListener("hashchange", schedule, { passive: true });

    // 防御性地包装 pushState/replaceState（保留原有行为）
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
      const result = originalPushState.apply(this, args);
      schedule();
      return result;
    };

    history.replaceState = function (...args) {
      const result = originalReplaceState.apply(this, args);
      schedule();
      return result;
    };

    // 监听 URL 变化（覆盖更多 SPA 场景）
    let lastUrl = location.href;
    const urlObserver = new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        schedule();
      }
    });
    urlObserver.observe(document, { subtree: true, childList: true });

    log("路由监听已设置（含 URL 变化检测）");
  }

  // ========== 初始化 ==========
  function init() {
    // 防止重复初始化
    if (state.initialized) {
      log("脚本已初始化，跳过重复执行");
      return;
    }

    const engine = detectEngine();
    if (!engine) {
      log("当前域名不在支持列表中，脚本跳过");
      return;
    }

    state.initialized = true;
    log(`检测到搜索引擎: ${engine.name} (v3.0.0)`);

    injectStyle();

    // 首次执行（延迟一小段时间确保 DOM 就绪）
    const initialDelay = document.readyState === "complete" ? 50 : 200;
    setTimeout(() => {
      executeAdRemoval(engine);
      setupMutationObserver(engine.config);
      setupRouteListener(engine.config);

      // 页面完全加载后再次扫描（捕获延迟加载的广告）
      window.addEventListener("load", () => {
        setTimeout(() => {
          executeAdRemoval(engine);
          removeAdsInIframes(engine.config);
          log("页面加载后补充扫描完成");
        }, 500);
      }, { once: true });

      log("初始化完成 ✓");
    }, initialDelay);
  }

  // ========== 启动 ==========
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();