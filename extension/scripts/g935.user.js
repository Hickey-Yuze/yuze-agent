// ==TabbitJiaZhao==
// @name         ✅ Raptor 日志美化脚本
// @namespace    https://km.sankuai.com/collabpage/2746617944
// @version      2.2.7-tab
// @description  Raptor 日志美化脚本 — Tabbit 妙招脚本版（日志美化 + 查询历史 + JSON 节点折叠 + 节点详情面板 + 双区域搜索 + JS 过滤；v2.2.7-tab 同步油猴版 v1.7.7：截断 JSON 自动补全闭合后格式化 + Java toString 行防碎片化）
// @author       jiacongqian
// @match        *://raptor.mws.sankuai.com/*
// @match        *://raptor.mws-test.sankuai.com/*
// @match        *://lion.mws.sankuai.com/*
// @match        *://lion.mws-test.sankuai.com/*
// @run-at       document-end
// ==/TabbitJiaZhao==

/**
 * Tabbit 妙招脚本版 (v2.2.4-tab)
 *
 * 功能与油猴版 v1.7.4 完全拉齐：
 *   1. JSON 节点折叠（左侧 gutter 悬浮小三角，点击折叠/展开，占位符显示元素数）
 *   2. JSON 节点选中 → 右侧详情面板（JSONPath 输入框 + 子 JSON 大文本域，可收起）
 *   3. 左右双区域各自支持 Cmd/Ctrl+F 搜索（互斥，光标不在区域内时放行浏览器原生搜索）
 *   4. 语法高亮 / 行距与油猴版完全一致（Consolas 13px / 1.6 行高）
 *
 * 本版相对旧版（v2.2.3-tab）的改进：
 *   - 同步油猴版 v1.7.4 修复：确认 isLogPage 用前缀匹配 /^\/log(\/|$)/，
 *     兼容新版 /log/topic/view/<topicName> 路由（旧版精确匹配只认 /log，
 *     新版路由下脚本永不启动）
 *
 * 本版相对旧版（v2.2.0-tab）的改进：
 *   - 修复「SPA 站内路由进入 /log 页时脚本完全不生效（连已加载日志都不打印），
 *     必须整页刷新才行」的问题：@match 从 /log/* 放宽到整个 raptor 域名，
 *     启动入口改为路由感知——非 /log 页面只挂路由监听，进入 /log 后再初始化
 *
 * v2.2.0-tab 相对旧版（v2.1.3-tab）的改进：
 *   - 移除埋点上报模块与强制更新检查（减小体积，去掉跨域 fetch 报错）
 *   - 渲染链路全容错：main 各子步骤独立 try-catch，单行美化失败不中断整体渲染，
 *     修复"只有右下角悬浮按钮、日志不渲染"的问题（旧版 injectHistoryUI 内
 *     任一异常会中断后续 executeRender / MutationObserver 启动）
 *   - 慢加载兜底：启动后 2s / 5s 追加渲染，容器观察重试 10 → 30 次
 *   - 折叠性能：行元素按下标缓存（root.__lineEls），折叠/展开不再逐行 querySelector
 */

(function () {
  "use strict";

  const SCRIPT_VERSION = "2.2.7-tab";
  console.log(
    `%c【Raptor 助手】Tabbit 脚本 v${SCRIPT_VERSION} 已加载`,
    "color:#10b981;font-weight:bold;",
  );

  // 防止重复注入
  const INJECT_FLAG = "__rla_injected_raptor-log__";
  if (window[INJECT_FLAG]) {
    console.warn("%c【Raptor 助手】模块已注入，跳过重复执行。", "color:#f59e0b;");
    return;
  }
  window[INJECT_FLAG] = true;

  function initRaptorLogModule() {
    // 记录当前正在观察的容器，用于检测容器变化后重新观察
    let _observedContainer = null;

    // 添加样式：美化日志展示的 CSS 样式表
    const style = document.createElement("style");
    style.textContent = `
      .beautified-log-container {
        background: linear-gradient(135deg, #f0f9ff 0%, #f5f9fc 100%) !important;
        border-radius: 8px !important;
        padding: 16px !important;
        margin: 8px 0 !important;
        box-shadow: 0 2px 12px rgba(59, 130, 246, 0.08) !important;
      }
      .log-field-table {
        width: 100% !important;
        border-collapse: separate !important;
        border-spacing: 0 !important;
        background: white !important;
        border-radius: 6px !important;
        overflow: hidden !important;
        box-shadow: 0 1px 3px rgba(0,0,0,0.08) !important;
      }
      .log-field-row {
        border-bottom: 1px solid #e0f2fe !important;
        transition: all 0.2s ease !important;
      }
      .log-field-row:hover {
        background: #f0f9ff !important;
      }
      .log-field-row.expanded {
        display: table-row !important;
      }
      .log-field-row.collapsed {
        display: none !important;
      }
      .log-field-row.important {
        background: #ecfdf5 !important;
      }
      .log-field-row.important:hover {
        background: #d1fae5 !important;
      }
      /* ERROR 级别日志：message 行红色高亮 */
      .log-field-row.error-level {
        background: #fff1f2 !important;
      }
      .log-field-row.error-level:hover {
        background: #ffe4e6 !important;
      }
      .log-field-row.error-level .log-field-key {
        color: #dc2626 !important;
        font-weight: 700 !important;
        background: linear-gradient(to right, #fff1f2 0%, #fff5f5 100%) !important;
        border-right-color: #fecaca !important;
      }
      /* ERROR 级别：整个容器左边框红色标记 */
      .beautified-log-container.error-log {
        background: linear-gradient(135deg, #fff5f5 0%, #fef2f2 100%) !important;
        box-shadow: 0 2px 12px rgba(220,38,38,0.10) !important;
        border-left: 3px solid #ef4444 !important;
      }
      .log-field-key {
        font-weight: 600 !important;
        padding: 8px 12px !important;
        color: #0891b2 !important;
        font-size: 13px !important;
        width: 180px !important;
        vertical-align: top !important;
        background: linear-gradient(to right, #f0f9ff 0%, #ffffff 100%) !important;
        font-family: 'SF Mono', 'Monaco', 'Consolas', monospace !important;
        border-right: 2px solid #e0f2fe !important;
      }
      .log-field-row.important .log-field-key {
        color: #059669 !important;
        font-weight: 700 !important;
        background: linear-gradient(to right, #ecfdf5 0%, #f0fdf4 100%) !important;
      }
      .log-field-value {
        padding: 8px 12px !important;
        word-break: break-word !important;
        font-size: 13px !important;
        color: #334155 !important;
        font-family: 'SF Mono', 'Monaco', 'Consolas', monospace !important;
        line-height: 1.5 !important;
      }
      .log-value-wrapper {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 8px !important;
      }
      .log-value-text {
        flex: 1 !important;
        color: #334155 !important;
        font-size: 13px !important;
      }
      .log-copy-btn {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 32px !important;
        height: 32px !important;
        padding: 0 !important;
        background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
        color: white !important;
        border: none !important;
        border-radius: 6px !important;
        cursor: pointer !important;
        transition: all 0.3s ease !important;
        box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3) !important;
        opacity: 0 !important;
        flex-shrink: 0 !important;
      }
      .log-field-row:hover .log-copy-btn,
      .log-value-wrapper:hover .log-copy-btn,
      .log-message-header:hover .log-copy-btn {
        opacity: 1 !important;
      }
      /* JSON header 内的复制按钮默认保持一定可见度，方便发现 */
      .log-message-header .log-copy-btn {
        opacity: 0.45 !important;
      }
      .log-copy-btn:hover {
        transform: translateY(-2px) scale(1.05) !important;
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.5) !important;
      }
      .log-copy-btn.copied {
        background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%) !important;
        opacity: 1 !important;
      }
      .log-expand-btn {
        background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%) !important;
        color: white !important;
        border: none !important;
        padding: 10px 20px !important;
        border-radius: 8px !important;
        cursor: pointer !important;
        font-size: 13px !important;
        font-weight: 600 !important;
        margin-top: 12px !important;
        transition: all 0.3s ease !important;
        box-shadow: 0 2px 8px rgba(6, 182, 212, 0.3) !important;
        display: inline-flex !important;
        align-items: center !important;
        gap: 8px !important;
        width: 100% !important;
        justify-content: center !important;
      }
      .log-expand-btn:hover {
        background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%) !important;
        transform: translateY(-2px) !important;
        box-shadow: 0 4px 12px rgba(6, 182, 212, 0.5) !important;
      }
      .log-json-container {
        background: #1e1e1e !important;
        border-radius: 8px !important;
        padding: 16px !important;
        margin: 8px 0 !important;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2) !important;
        border: 1px solid #3c3c3c !important;
      }
      .log-json-pre {
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace !important;
        font-size: 13px !important;
        line-height: 1.6 !important;
        margin: 0 !important;
        max-height: 500px !important;
        overflow: auto !important;
        white-space: pre-wrap !important;
        word-break: break-word !important;
        color: #d4d4d4 !important;
        outline: none !important;
      }
      /* 聚焦时加蓝色边框，提示用户当前 JSON 框已选中，按 Cmd/Ctrl+F 会走容器内搜索 */
      .log-json-pre:focus-visible {
        box-shadow: 0 0 0 2px #6366f1 inset !important;
      }
      .json-key { color: #9cdcfe !important; }
      .json-string { color: #ce9178 !important; }
      .json-number { color: #b5cea8 !important; }
      .json-boolean { color: #569cd6 !important; }
      .json-null { color: #569cd6 !important; }
      .json-punctuation { color: #d4d4d4 !important; }
      .log-json-pre::-webkit-scrollbar {
        width: 14px !important;
        height: 14px !important;
      }
      .log-json-pre::-webkit-scrollbar-track {
        background: #1e1e1e !important;
      }
      .log-json-pre::-webkit-scrollbar-thumb {
        background: #424242 !important;
        border: 3px solid #1e1e1e !important;
        border-radius: 7px !important;
      }
      .log-json-pre::-webkit-scrollbar-thumb:hover {
        background: #4e4e4e !important;
      }
      .log-message-header {
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        margin-bottom: 10px !important;
        padding-bottom: 8px !important;
        border-bottom: 2px solid #3c3c3c !important;
      }
      .log-message-label {
        color: #4fc3f7 !important;
        font-size: 12px !important;
        font-weight: 700 !important;
        text-transform: uppercase !important;
        letter-spacing: 1px !important;
        display: flex !important;
        align-items: center !important;
        gap: 6px !important;
      }
      /* ── 截断 JSON 修复标注（默认视图提示条 + 格式化视图头部徽标）── */
      .log-json-truncated-hint {
        margin-bottom: 6px !important;
        padding: 6px 10px !important;
        background: #fff7ed !important;
        border: 1px dashed #f59e0b !important;
        border-radius: 6px !important;
        color: #b45309 !important;
        font-size: 12px !important;
        font-weight: 500 !important;
        white-space: pre-wrap !important;
        word-break: break-all !important;
      }
      .log-json-truncated-badge {
        padding: 1px 8px !important;
        font-size: 11px !important;
        line-height: 18px !important;
        font-weight: 600 !important;
        color: #b45309 !important;
        background: #fff7ed !important;
        border: 1px solid #f59e0b !important;
        border-radius: 10px !important;
        white-space: nowrap !important;
        cursor: help !important;
      }
      /* ── JSON 转换按钮组（压缩转义/压缩/转义/去除转义）── */
      .rla-json-tool-group {
        display: flex !important;
        align-items: center !important;
        gap: 6px !important;
        margin-left: auto !important;
        margin-right: 8px !important;
      }
      .rla-json-tool-btn {
        padding: 2px 10px !important;
        font-size: 11px !important;
        line-height: 18px !important;
        font-weight: 500 !important;
        color: #2563eb !important;
        background: #ffffff !important;
        border: 1px solid #93c5fd !important;
        border-radius: 4px !important;
        cursor: pointer !important;
        transition: all 0.15s ease !important;
        white-space: nowrap !important;
        box-shadow: 0 1px 2px rgba(37, 99, 235, 0.12) !important;
      }
      .rla-json-tool-btn:hover {
        color: #ffffff !important;
        border-color: #2563eb !important;
        background: #2563eb !important;
        box-shadow: 0 2px 6px rgba(37, 99, 235, 0.35) !important;
      }
      .rla-json-tool-btn.copied {
        color: #ffffff !important;
        border-color: #10b981 !important;
        background: #10b981 !important;
        box-shadow: 0 2px 6px rgba(16, 185, 129, 0.35) !important;
      }
      .log-text-content {
        margin-bottom: 8px !important;
        padding: 10px !important;
        background: linear-gradient(135deg, #fef3c7 0%, #fef9e7 100%) !important;
        border-left: 4px solid #f59e0b !important;
        border-radius: 6px !important;
        color: #78350f !important;
        font-weight: 500 !important;
        font-size: 13px !important;
        box-shadow: 0 1px 3px rgba(245, 158, 11, 0.1) !important;
      }
      .log-mixed-content {
        display: flex !important;
        flex-direction: column !important;
        gap: 8px !important;
      }
      /* ── message / message1 内容限高 + 遮罩展开 ── */
      .log-collapsible-content {
        position: relative !important;
        max-height: 120px !important; /* 约 4-5 行高度 */
        overflow: hidden !important;
        transition: max-height 0.3s ease !important;
      }
      .log-collapsible-content.expanded {
        max-height: none !important;
      }
      .log-collapsible-mask {
        position: absolute !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        height: 80px !important;
        background: linear-gradient(
          to bottom,
          rgba(255, 255, 255, 0) 0%,
          rgba(249, 250, 251, 0.85) 60%,
          rgba(249, 250, 251, 0.98) 100%
        ) !important;
        display: flex !important;
        align-items: flex-end !important;
        justify-content: center !important;
        padding-bottom: 6px !important;
        pointer-events: none !important;
      }
      .log-collapsible-mask > .log-expand-rest-btn {
        pointer-events: auto !important;
      }
      .log-expand-rest-btn {
        display: inline-flex !important;
        align-items: center !important;
        gap: 4px !important;
        padding: 4px 12px !important;
        background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%) !important;
        color: white !important;
        border: none !important;
        border-radius: 16px !important;
        cursor: pointer !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        box-shadow: 0 2px 8px rgba(2, 132, 199, 0.35) !important;
        transition: all 0.2s ease !important;
        white-space: nowrap !important;
      }
      .log-expand-rest-btn:hover {
        background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%) !important;
        transform: translateY(-1px) !important;
        box-shadow: 0 4px 12px rgba(2, 132, 199, 0.5) !important;
      }
      /* 展开后的折叠按钮（脱离遮罩，固定在内容底部） */
      .log-collapse-btn {
        display: inline-flex !important;
        align-items: center !important;
        gap: 4px !important;
        padding: 4px 12px !important;
        background: linear-gradient(135deg, #64748b 0%, #475569 100%) !important;
        color: white !important;
        border: none !important;
        border-radius: 16px !important;
        cursor: pointer !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        box-shadow: 0 2px 8px rgba(71, 85, 105, 0.35) !important;
        transition: all 0.2s ease !important;
        white-space: nowrap !important;
        margin: 8px auto 0 !important;
      }
      .log-collapse-btn:hover {
        background: linear-gradient(135deg, #475569 0%, #334155 100%) !important;
        transform: translateY(-1px) !important;
        box-shadow: 0 4px 12px rgba(71, 85, 105, 0.5) !important;
      }
      /* Java 异常栈内容样式 - 红色背景 */
      .java-exception-content {
        margin-bottom: 8px !important;
        padding: 12px !important;
        background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%) !important;
        border-left: 4px solid #ef4444 !important;
        border-radius: 6px !important;
        color: #991b1b !important;
        font-weight: 500 !important;
        font-size: 13px !important;
        box-shadow: 0 1px 3px rgba(239, 68, 68, 0.1) !important;
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace !important;
        white-space: pre-wrap !important;
        word-break: break-word !important;
      }
      .java-exception-title {
        font-weight: 700 !important;
        font-size: 12px !important;
        color: #ef4444 !important;
        margin-bottom: 8px !important;
        text-transform: uppercase !important;
        letter-spacing: 0.5px !important;
        display: flex !important;
        align-items: center !important;
        gap: 6px !important;
      }
  
      /* ── 查询历史悬浮按钮 ── */
      #rla-history-fab {
        position: fixed !important;
        right: 24px !important;
        bottom: 24px !important;
        width: 48px !important;
        height: 48px !important;
        border-radius: 50% !important;
        background: linear-gradient(135deg, #1e293b 0%, #334155 60%, #475569 100%) !important;
        box-shadow: 0 4px 16px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08) !important;
        cursor: pointer !important;
        z-index: 99999 !important;
        border: none !important;
        padding: 0 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        transition: transform 0.2s ease, box-shadow 0.2s ease !important;
        animation: rla-spin 4s linear infinite !important;
      }
      #rla-history-fab:hover {
        transform: scale(1.1) !important;
        box-shadow: 0 6px 20px rgba(0,0,0,0.45) !important;
      }
      #rla-history-fab.paused {
        animation-play-state: paused !important;
      }
      @keyframes rla-spin {
        from { transform: rotate(0deg); }
        to   { transform: rotate(360deg); }
      }
      #rla-history-fab:hover {
        animation-play-state: running !important;
      }
      #rla-history-fab.paused:hover {
        animation-play-state: paused !important;
        transform: scale(1.1) !important;
      }
  
      /* ── 查询历史面板 ── */
      #rla-history-panel {
        position: fixed !important;
        right: 80px !important;
        bottom: 24px !important;
        width: 520px !important;
        max-height: 400px !important;
        background: #ffffff !important;
        border-radius: 12px !important;
        box-shadow: 0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08) !important;
        z-index: 99998 !important;
        display: none !important;
        flex-direction: column !important;
        overflow: hidden !important;
        border: 1px solid #e2e8f0 !important;
      }
      /* ── FAB 上方展开的置顶/置底子按钮 ── */
      #rla-fab-sub-group {
        position: fixed !important;
        right: 24px !important;
        bottom: 80px !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        gap: 8px !important;
        z-index: 99998 !important;
        pointer-events: none !important;
      }
      .rla-fab-sub-btn {
        position: relative !important;
        width: 40px !important;
        height: 40px !important;
        border-radius: 50% !important;
        background: linear-gradient(135deg, #334155 0%, #475569 100%) !important;
        box-shadow: 0 3px 12px rgba(0,0,0,0.3) !important;
        cursor: pointer !important;
        border: none !important;
        padding: 0 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        opacity: 0 !important;
        transform: scale(0.6) translateY(20px) !important;
        transition: opacity 0.2s ease, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
        pointer-events: none !important;
      }
      .rla-fab-sub-btn.visible {
        opacity: 1 !important;
        transform: scale(1) translateY(0) !important;
        pointer-events: auto !important;
      }
      .rla-fab-sub-btn:hover {
        transform: scale(1.1) !important;
        box-shadow: 0 4px 16px rgba(0,0,0,0.4) !important;
      }
      /* 悬浮提示文字（真实 DOM 元素，body 直下，最高层级） */
      .rla-fab-tip {
        position: fixed !important;
        background: #1e293b !important;
        color: #e2e8f0 !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        padding: 4px 10px !important;
        border-radius: 6px !important;
        white-space: nowrap !important;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3) !important;
        opacity: 0 !important;
        pointer-events: none !important;
        transition: opacity 0.15s ease !important;
        z-index: 2147483647 !important; /* 最大 z-index */
      }
      .rla-fab-tip.visible {
        opacity: 1 !important;
      }
      #rla-history-panel.visible {
        display: flex !important;
      }
      #rla-history-panel-header {
        position: relative !important;
        padding: 12px 16px !important;
        padding-right: 36px !important;
        background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%) !important;
        border-bottom: 1px solid #e2e8f0 !important;
        font-size: 13px !important;
        font-weight: 700 !important;
        color: #334155 !important;
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
        flex-shrink: 0 !important;
      }
      .rla-history-close-btn {
        position: absolute !important;
        right: 10px !important;
        top: 50% !important;
        transform: translateY(-50%) !important;
        width: 22px !important;
        height: 22px !important;
        border: none !important;
        background: transparent !important;
        color: #94a3b8 !important;
        font-size: 16px !important;
        line-height: 1 !important;
        cursor: pointer !important;
        border-radius: 4px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        transition: color 0.15s ease, background 0.15s ease !important;
      }
      .rla-history-close-btn:hover {
        background: #e2e8f0 !important;
        color: #1e293b !important;
      }
      #rla-history-panel-header span.rla-count {
        margin-left: auto !important;
        font-size: 11px !important;
        font-weight: 500 !important;
        color: #94a3b8 !important;
      }
      #rla-history-list {
        overflow-y: auto !important;
        flex: 1 !important;
      }
      #rla-history-list::-webkit-scrollbar {
        width: 6px !important;
      }
      #rla-history-list::-webkit-scrollbar-thumb {
        background: #cbd5e1 !important;
        border-radius: 3px !important;
      }
      .rla-history-item {
        display: flex !important;
        align-items: center !important;
        gap: 10px !important;
        padding: 9px 16px !important;
        border-bottom: 1px solid #f1f5f9 !important;
        cursor: pointer !important;
        transition: background 0.15s ease !important;
      }
      .rla-history-item:hover {
        background: #f0f9ff !important;
      }
      .rla-history-item:last-child {
        border-bottom: none !important;
      }
      .rla-history-time {
        font-size: 11px !important;
        color: #94a3b8 !important;
        white-space: nowrap !important;
        flex-shrink: 0 !important;
        font-family: 'SF Mono', 'Monaco', 'Consolas', monospace !important;
      }
      .rla-history-condition {
        flex: 1 !important;
        font-size: 12px !important;
        color: #334155 !important;
        font-family: 'SF Mono', 'Monaco', 'Consolas', monospace !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
      }
      .rla-history-fill-btn {
        flex-shrink: 0 !important;
        font-size: 11px !important;
        padding: 3px 8px !important;
        border-radius: 4px !important;
        border: 1px solid #bae6fd !important;
        background: #e0f2fe !important;
        color: #0284c7 !important;
        cursor: pointer !important;
        transition: all 0.15s ease !important;
        font-weight: 600 !important;
      }
      .rla-history-fill-btn:hover {
        background: #0284c7 !important;
        color: white !important;
      }
      #rla-history-empty {
        padding: 32px 16px !important;
        text-align: center !important;
        color: #94a3b8 !important;
        font-size: 13px !important;
      }
      #rla-quick-bar {
        padding: 8px 16px !important;
        display: flex !important;
        align-items: center !important;
        gap: 6px !important;
        border-bottom: 1px solid #e2e8f0 !important;
        background: #f8fafc !important;
        flex-wrap: wrap !important;
        flex-shrink: 0 !important;
      }
      #rla-quick-bar span {
        font-size: 11px !important;
        color: #94a3b8 !important;
        white-space: nowrap !important;
      }
      .rla-quick-btn {
        font-size: 11px !important;
        font-weight: 700 !important;
        padding: 3px 8px !important;
        border-radius: 4px !important;
        border: 1px solid !important;
        cursor: pointer !important;
        transition: all 0.15s ease !important;
        white-space: nowrap !important;
      }
      .rla-quick-btn.level-info  { border-color: #bae6fd !important; background: #e0f2fe !important; color: #0284c7 !important; }
      .rla-quick-btn.level-warn  { border-color: #fde68a !important; background: #fef9c3 !important; color: #b45309 !important; }
      .rla-quick-btn.level-error { border-color: #fca5a5 !important; background: #fee2e2 !important; color: #dc2626 !important; }
      .rla-quick-btn.level-debug { border-color: #d1d5db !important; background: #f3f4f6 !important; color: #6b7280 !important; }
      .rla-quick-btn.level-info:hover,  .rla-quick-btn.level-info.active  { background: #0284c7 !important; color: white !important; border-color: #0284c7 !important; }
      .rla-quick-btn.level-warn:hover,  .rla-quick-btn.level-warn.active  { background: #b45309 !important; color: white !important; border-color: #b45309 !important; }
      .rla-quick-btn.level-error:hover, .rla-quick-btn.level-error.active { background: #dc2626 !important; color: white !important; border-color: #dc2626 !important; }
      .rla-quick-btn.level-debug:hover, .rla-quick-btn.level-debug.active { background: #6b7280 !important; color: white !important; border-color: #6b7280 !important; }
      .rla-quick-btn.active { box-shadow: inset 0 2px 4px rgba(0,0,0,0.15) !important; }
  
      /* ── message 字段 key 列：支持竖向布局（文字 + 按钮） ── */
      .log-field-key.message-key {
        display: flex !important;
        flex-direction: column !important;
        align-items: flex-start !important;
        gap: 6px !important;
      }
      /* ── message 字段懒加载 JSON 格式化按钮 ── */
      .log-json-format-btn {
        display: inline-flex !important;
        align-items: center !important;
        gap: 4px !important;
        padding: 3px 7px !important;
        background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%) !important;
        color: white !important;
        border: none !important;
        border-radius: 4px !important;
        cursor: pointer !important;
        font-size: 11px !important;
        font-weight: 600 !important;
        transition: all 0.2s ease !important;
        box-shadow: 0 1px 4px rgba(99, 102, 241, 0.3) !important;
        white-space: nowrap !important;
      }
      .log-json-format-btn:hover {
        background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%) !important;
        box-shadow: 0 2px 8px rgba(99, 102, 241, 0.45) !important;
      }
      .log-json-format-btn.expanded {
        background: linear-gradient(135deg, #64748b 0%, #475569 100%) !important;
        box-shadow: 0 1px 4px rgba(100, 116, 139, 0.3) !important;
      }
      .log-json-format-btn.expanded:hover {
        background: linear-gradient(135deg, #475569 0%, #334155 100%) !important;
      }
  
      /* ── JSON 格式化搜索框 ── */
      .rla-json-search-box {
        position: absolute !important;
        top: 8px !important;
        right: 8px !important;
        display: flex !important;
        align-items: center !important;
        gap: 6px !important;
        background: #2d2d2d !important;
        border: 1px solid #6366f1 !important;
        border-radius: 6px !important;
        padding: 4px 8px !important;
        z-index: 100 !important;
        box-shadow: 0 2px 12px rgba(0,0,0,0.5) !important;
        animation: rla-search-fade-in 0.15s ease !important;
        /* 分栏后左侧 pane 可能很窄，搜索框不能溢出所在区域 */
        max-width: calc(100% - 16px) !important;
        box-sizing: border-box !important;
      }
      @keyframes rla-search-fade-in {
        from { opacity: 0; transform: translateY(-4px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .rla-json-search-box.shake {
        animation: rla-search-shake 0.4s ease !important;
        border-color: #ef4444 !important;
      }
      @keyframes rla-search-shake {
        0%, 100% { transform: translateX(0); }
        20%      { transform: translateX(-4px); }
        40%      { transform: translateX(4px); }
        60%      { transform: translateX(-3px); }
        80%      { transform: translateX(2px); }
      }
      .rla-json-search-input {
        background: #1e1e1e !important;
        border: 1px solid #444 !important;
        border-radius: 4px !important;
        color: #d4d4d4 !important;
        font-size: 12px !important;
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace !important;
        padding: 3px 6px !important;
        flex: 1 1 auto !important;
        width: auto !important;
        min-width: 80px !important;
        max-width: 180px !important;
        outline: none !important;
        transition: border-color 0.2s ease !important;
      }
      .rla-json-search-input:focus {
        border-color: #6366f1 !important;
      }
      /* 搜索命中计数（index/total） */
      .rla-json-search-count {
        color: #9ca3af !important;
        font-size: 11px !important;
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace !important;
        white-space: nowrap !important;
        min-width: 34px !important;
        text-align: center !important;
        user-select: none !important;
      }
      .rla-json-search-count.has-match {
        color: #4ec9b0 !important;
      }
      .rla-json-search-close {
        color: #d4d4d4 !important;
        cursor: pointer !important;
        font-size: 16px !important;
        line-height: 1 !important;
        padding: 0 2px !important;
        opacity: 0.7 !important;
        transition: opacity 0.15s ease !important;
      }
      .rla-json-search-close:hover {
        opacity: 1 !important;
      }
  
      /* ── JSON 搜索高亮 ── */
      .rla-json-highlight {
        background: #fbbf24 !important;
        color: #1e1e1e !important;
        border-radius: 2px !important;
      }
      .rla-json-highlight-active {
        background: #f97316 !important;
        color: #fff !important;
        border-radius: 2px !important;
        box-shadow: 0 0 0 1px #ea580c !important;
      }
  
      /* ── JSON 表达式过滤（分栏模式） ── */
      .rla-json-filter-bar {
        display: flex !important;
        align-items: center !important;
        border-top: 1px solid #3c3c3c !important;
        background: #1e1e1e !important;
        border-radius: 0 0 8px 8px !important;
      }
      .rla-json-filter-input {
        flex: 1 !important;
        background: transparent !important;
        border: none !important;
        border-radius: 0 0 8px 8px !important;
        color: #d4d4d4 !important;
        font-size: 12px !important;
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace !important;
        padding: 6px 12px !important;
        outline: none !important;
        min-width: 0 !important;
      }
      .rla-json-filter-input::placeholder {
        color: #6b7280 !important;
        font-style: italic !important;
      }
      .rla-json-filter-input.error {
        animation: rla-filter-shake 0.4s ease !important;
        box-shadow: inset 0 -2px 0 #ef4444 !important;
      }
      @keyframes rla-filter-shake {
        0%, 100% { transform: translateX(0); }
        20%      { transform: translateX(-3px); }
        40%      { transform: translateX(3px); }
        60%      { transform: translateX(-2px); }
        80%      { transform: translateX(2px); }
      }
      /* 分栏模式：原 JSON 左侧不变，过滤结果出现在右侧 */
      .rla-json-split-container {
        display: flex !important;
        flex-direction: row !important;
        height: 500px !important;
        max-height: 500px !important;
        gap: 0 !important;
      }
      .rla-json-pane {
        flex: 1 !important;
        min-width: 0 !important;
        overflow: auto !important;
        position: relative !important;
        display: flex !important;
        flex-direction: column !important;
      }
      .rla-json-pane pre {
        flex: 1 !important;
        max-height: none !important;
        height: auto !important;
        border-radius: 0 !important;
        overflow: auto !important;
      }
      .rla-json-pane::-webkit-scrollbar {
        width: 10px !important;
        height: 10px !important;
      }
      .rla-json-pane::-webkit-scrollbar-track {
        background: #1e1e1e !important;
      }
      .rla-json-pane::-webkit-scrollbar-thumb {
        background: #424242 !important;
        border-radius: 5px !important;
      }
      .rla-json-pane-original {
        border-right: 2px solid #4f46e5 !important;
      }
      .rla-json-pane-filtered {
        background: #1a1a2e !important;
        animation: rla-pane-slide-in 0.25s ease !important;
      }
      .rla-json-pane-label {
        position: absolute !important;
        top: 4px !important;
        right: 6px !important;
        font-size: 10px !important;
        font-weight: 600 !important;
        color: #6366f1 !important;
        background: rgba(0,0,0,0.6) !important;
        padding: 2px 6px !important;
        border-radius: 3px !important;
        pointer-events: none !important;
      }
      @keyframes rla-pane-slide-in {
        from { opacity: 0; flex: 0; }
        to   { opacity: 1; flex: 1; }
      }

      /* ── JSON 节点折叠 + 节点详情面板（v1.6.0） ── */
      .rla-json-root {
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace !important;
        font-size: 13px !important;
        line-height: 1.6 !important;
        white-space: pre-wrap !important;
        word-break: break-word !important;
        position: relative !important;
      }
      .rla-json-line {
        display: block !important;
        position: relative !important;
        padding-left: 0 !important;
      }
      /* 折叠隐藏行：必须同样带 !important，否则赢不过上面的 display:block !important
         （之前用内联 style.display='none' 被 CSS important 覆盖，导致折叠视觉上无效） */
      .rla-json-line.rla-folded {
        display: none !important;
      }
      /* 左侧折叠 gutter：平时不可见，hover root 时显示三角 */
      .rla-json-fold-gutter {
        display: inline-block !important;
        width: 14px !important;
        text-align: center !important;
        font-size: 10px !important;
        line-height: 1.6 !important;
        color: #6b7280 !important;
        cursor: pointer !important;
        user-select: none !important;
        flex-shrink: 0 !important;
        vertical-align: top !important;
        opacity: 0 !important;
        transition: opacity 0.15s ease, color 0.15s ease !important;
      }
      .rla-json-root:hover .rla-json-fold-gutter {
        opacity: 1 !important;
      }
      .rla-json-fold-gutter:hover {
        color: #a78bfa !important;
      }
      .rla-json-fold-gutter.collapsed {
        opacity: 1 !important;
        color: #f59e0b !important;
      }
      .rla-json-fold-gutter.collapsed:hover {
        color: #fbbf24 !important;
      }
      /* 折叠占位符：{…} N 个元素 */
      .rla-json-fold-placeholder {
        color: #6b7280 !important;
        font-style: italic !important;
        font-size: 12px !important;
        cursor: pointer !important;
        user-select: none !important;
        margin-left: 2px !important;
      }
      .rla-json-fold-placeholder:hover {
        color: #a78bfa !important;
        text-decoration: underline !important;
      }
      /* 被选中的 JSON 节点行高亮 */
      .rla-json-line.selected {
        background: rgba(99, 102, 241, 0.15) !important;
        border-radius: 3px !important;
        box-shadow: 0 0 0 1px rgba(99, 102, 241, 0.3) inset !important;
      }
      .rla-json-line.selected .json-key,
      .rla-json-line.selected .json-string {
        filter: brightness(1.1) !important;
      }

      /* ── 右侧节点详情面板（JSON-handle 风格） ── */
      .rla-json-detail-pane {
        flex: 0 0 42% !important;
        min-width: 280px !important;
        max-width: 600px !important;
        background: #1a1a2e !important;
        border-left: 2px solid #4f46e5 !important;
        display: flex !important;
        flex-direction: column !important;
        overflow: hidden !important;
        position: relative !important;
        animation: rla-detail-slide-in 0.2s ease !important;
      }
      /* 初始隐藏：选中节点后才显示。
         注意不能靠内联 style.display="none" —— 上面 display:flex !important
         会覆盖内联样式，导致面板一开始就占位显示（v1.6.0 的 bug）。 */
      .rla-json-detail-pane.rla-hidden {
        display: none !important;
      }
      @keyframes rla-detail-slide-in {
        from { opacity: 0; transform: translateX(12px); }
        to   { opacity: 1; transform: translateX(0); }
      }
      .rla-json-detail-pane.collapsed {
        flex: 0 0 28px !important;
        min-width: 28px !important;
        max-width: 28px !important;
      }
      .rla-json-detail-header {
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
        padding: 6px 8px !important;
        background: #16162a !important;
        border-bottom: 1px solid #3c3c3c !important;
        height: 32px !important;
        flex-shrink: 0 !important;
      }
      .rla-json-detail-toggle {
        cursor: pointer !important;
        color: #a78bfa !important;
        font-size: 14px !important;
        line-height: 1 !important;
        padding: 2px 4px !important;
        border-radius: 3px !important;
        transition: background 0.15s ease !important;
        flex-shrink: 0 !important;
      }
      .rla-json-detail-toggle:hover {
        background: rgba(167, 139, 250, 0.15) !important;
      }
      .rla-json-detail-pane.collapsed .rla-json-detail-toggle {
        transform: rotate(180deg) !important;
      }
      .rla-json-detail-title {
        color: #c4b5fd !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
      }
      .rla-json-detail-pane.collapsed .rla-json-detail-title,
      .rla-json-detail-pane.collapsed .rla-json-detail-body {
        display: none !important;
      }
      .rla-json-detail-body {
        display: flex !important;
        flex-direction: column !important;
        flex: 1 !important;
        overflow: hidden !important;
      }
      .rla-json-detail-path-row {
        display: flex !important;
        align-items: center !important;
        gap: 6px !important;
        padding: 4px 8px !important;
        background: #1e1e2e !important;
        border-bottom: 1px solid #2c2c3c !important;
        flex-shrink: 0 !important;
      }
      .rla-json-detail-path-label {
        color: #6b7280 !important;
        font-size: 11px !important;
        font-family: 'Consolas', 'Monaco', monospace !important;
        flex-shrink: 0 !important;
      }
      .rla-json-detail-path-input {
        flex: 1 !important;
        background: #0d0d1a !important;
        border: 1px solid #4f46e5 !important;
        border-radius: 4px !important;
        color: #a5b4fc !important;
        font-size: 12px !important;
        font-family: 'Consolas', 'Monaco', monospace !important;
        padding: 3px 8px !important;
        outline: none !important;
        min-width: 0 !important;
      }
      .rla-json-detail-path-input:focus {
        border-color: #818cf8 !important;
        box-shadow: 0 0 0 1px rgba(129, 140, 248, 0.3) !important;
      }
      .rla-json-detail-path-copy {
        cursor: pointer !important;
        color: #6b7280 !important;
        font-size: 12px !important;
        padding: 2px 6px !important;
        border-radius: 3px !important;
        transition: color 0.15s ease, background 0.15s ease !important;
        flex-shrink: 0 !important;
      }
      .rla-json-detail-path-copy:hover {
        color: #a78bfa !important;
        background: rgba(167, 139, 250, 0.1) !important;
      }
      .rla-json-detail-pre-wrap {
        flex: 1 !important;
        overflow: hidden !important;
        display: flex !important;
        flex-direction: column !important;
        position: relative !important;
      }
      .rla-json-detail-pre {
        flex: 1 !important;
        margin: 0 !important;
        padding: 12px !important;
        background: #1e1e1e !important;
        color: #d4d4d4 !important;
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace !important;
        font-size: 13px !important;
        line-height: 1.6 !important;
        white-space: pre-wrap !important;
        word-break: break-word !important;
        overflow: auto !important;
        outline: none !important;
        border: none !important;
      }
      .rla-json-detail-pre:focus-visible {
        box-shadow: 0 0 0 2px #6366f1 inset !important;
      }
      /* 详情面板内的搜索框：下移避开头部与 Path 行 */
      .rla-json-detail-pane .rla-json-search-box {
        top: 64px !important;
      }
      /* 左侧面板内的搜索框：下移避开「原始/过滤结果」角标，
         并保证搜索框落在左侧区域自身内（而不是整个容器右上角
         —— 那里会被右侧详情面板遮住） */
      .rla-json-pane > .rla-json-search-box {
        top: 30px !important;
      }
      /* 空 gutter（该行无可折叠节点）不显示手型光标 */
      .rla-json-fold-gutter:not([data-fold-start]) {
        cursor: default !important;
      }

    `;
    document.head.appendChild(style);

    // 重要字段列表：这些字段会默认展开并高亮显示
    const IMPORTANT_FIELDS = [
      "traceId__",
      "message",
      "message1",
      "es_datetime",
      "mt_datetime",
      "mt_level",
      "mt_appkey",
      "mt_logger_name",
      "mt_millisecond",
      "mt_servername",
      "mt_thread",
    ];

    // 高优先级字段：紧跟 traceId__（第一行）之后前置展示，默认展开不折叠。
    // 存在才渲染，对没有这些字段的 topic 无影响。
    const PRIORITY_FIELDS = [
      "url",
      "api_path",
      "http_params",
      "input_body",
      "output_body",
    ];

    // 重要字段的渲染顺序：traceId__ 置顶（第一行），高优先级字段紧随其后（第二行起），
    // 其余重要字段（message/时间/等级等）再后
    const buildOrderedImportantFields = () => [
      "traceId__",
      ...PRIORITY_FIELDS,
      ...IMPORTANT_FIELDS.filter(
        (k) => k !== "traceId__" && !PRIORITY_FIELDS.includes(k),
      ),
    ];

    /**
     * 递归展开嵌套转义 JSON 字符串
     * 若对象的某个字符串类型字段值本身是合法的 JSON（如 data:"{\"key\":1}"），
     * 则将其 parse 并递归展开，方便阅读。
     * @param {*} obj - 任意值
     * @returns {*} 展开后的值
     */
    const deepUnescapeJSON = (obj) => {
      if (typeof obj === "string") {
        try {
          const parsed = JSON.parse(obj);
          if (typeof parsed === "object" && parsed !== null) {
            return deepUnescapeJSON(parsed);
          }
        } catch {
          /* 不是 JSON 字符串，保留原值 */
        }
        return obj;
      }
      if (Array.isArray(obj)) return obj.map(deepUnescapeJSON);
      if (typeof obj === "object" && obj !== null) {
        const result = {};
        for (const [k, v] of Object.entries(obj))
          result[k] = deepUnescapeJSON(v);
        return result;
      }
      return obj;
    };

    /**
     * 尝试解析 JSON 字符串，并对嵌套转义 JSON 字符串做二次展开
     * @param {string} str - 待解析的字符串
     * @returns {{success: boolean, formatted: string}} 返回解析结果，成功则返回格式化的 JSON，失败则返回原字符串
     */
    const tryParseJSON = (str) => {
      try {
        return {
          success: true,
          formatted: JSON.stringify(deepUnescapeJSON(JSON.parse(str)), null, 2),
        };
      } catch {
        return { success: false, formatted: str };
      }
    };

    /**
     * 智能解析 JSON：先直接解析；失败且内容含 \" 转义时，
     * 按 JSON 字符串字面量去转义（\" → "、\\ → \ 等）后再解析。
     * 用于 key="{...}" 这类整体转义的 JSON 串（如 aiTagsJson="{...}"），
     * 去转义后走和 productData= 一样的格式化链路。
     * @param {string} str - 待解析的字符串（可能带整体转义）
     * @returns {{success: boolean, formatted: string}}
     */
    const tryParseJSONSmart = (str) => {
      const direct = tryParseJSON(str);
      if (direct.success) return direct;
      if (!str.includes('\\"')) return direct;
      try {
        // 包一层引号按 JSON 字符串字面量解析，完成去转义；
        // 字面换行/回车/制表符需先转义，否则 JSON.parse 报错
        const unescaped = JSON.parse(
          '"' +
            str
              .replace(/\n/g, "\\n")
              .replace(/\r/g, "\\r")
              .replace(/\t/g, "\\t") +
            '"',
        );
        return tryParseJSON(unescaped);
      } catch {
        return direct;
      }
    };

    /**
     * 计算每个可折叠节点（{ / [ 开括号行）的子元素数量。
     * 用于折叠占位符显示 "{…} N 个元素"。
     * @param {string[]} rawLines - 原始 JSON 按行分割
     * @param {number} startLine - 开括号所在行号
     * @param {number} endLine - 闭括号所在行号
     * @param {string} opener - 开括号字符（"{" 或 "["），节点类型以此为准。
     *   不能用 inner 首字符猜测：字符串数组 ["a","b"] 的 inner 以 " 开头，
     *   会被误判为对象分支，导致折叠占位符错误显示 0 个元素。
     * @returns {number} 子元素数量
     */
    const countJsonChildren = (rawLines, startLine, endLine, opener) => {
      var inner = rawLines.slice(startLine + 1, endLine).join("\n").trim();
      if (!inner) return 0;
      var count = 0;
      var depth = 0, inStr = false, esc = false;
      if (opener === "{") {
        // 对象：统计顶层 key 出现次数。
        // 注意必须在 key 的【闭合引号】处向后找 ":"（开引号处找会漏判），
        // 且只统计 depth === 0 的 key（嵌套对象内的 key 不算本层子元素）。
        for (var i = 0; i < inner.length; i++) {
          var ch = inner[i];
          if (esc) { esc = false; continue; }
          if (ch === "\\" && inStr) { esc = true; continue; }
          if (ch === '"') {
            if (inStr) {
              // 当前是闭合引号：跳过空白后若跟 ":" 则是一个顶层 key
              var j = i + 1;
              while (j < inner.length && (inner[j] === " " || inner[j] === "\t" || inner[j] === "\n" || inner[j] === "\r")) j++;
              if (inner[j] === ":" && depth === 0) count++;
            }
            inStr = !inStr;
            continue;
          }
          if (!inStr) {
            if (ch === "{" || ch === "[") depth++;
            else if (ch === "}" || ch === "]") depth--;
          }
        }
      } else {
        // 数组：统计逗号数 + 1
        if (inner[0] === "]" || inner[0] === "}") return 0;
        count = 1;
        for (var i = 0; i < inner.length; i++) {
          var ch = inner[i];
          if (esc) { esc = false; continue; }
          if (ch === "\\" && inStr) { esc = true; continue; }
          if (ch === '"') { inStr = !inStr; continue; }
          if (!inStr) {
            if (ch === "{" || ch === "[") depth++;
            else if (ch === "}" || ch === "]") depth--;
            else if (ch === "," && depth === 0) count++;
          }
        }
      }
      return count;
    };

    /**
     * 为 JSON 字符串添加语法高亮 + 折叠功能 + 节点选中
     *
     * 设计思路（v1.6.0 重写）：
     *   1. 先用 colorizeJSON 对 pretty-print JSON 做语法高亮 → 得到 HTML 字符串
     *   2. 结合原始 JSON 文本，分析括号配对关系，定位每个 { / [ 对应的折叠行号范围
     *   3. 每行用 <span class="rla-json-line"> 包裹，可折叠行行首插入
     *      <span class="rla-json-fold-gutter">▶</span> 三角（hover root 时显示）
     *   4. 折叠时隐藏 startLine+1 ~ endLine 的所有行，在开括号行尾部追加
     *      占位符 "{…} N 个元素" / "[…] N 个元素"
     *   5. 点击 JSON key/value 行选中节点，在右侧详情面板展示子 JSON
     *   6. 事件委托在 root 层处理折叠、选中
     *
     * @param {string} jsonStr - 已格式化的 JSON 字符串
     * @param {Function} [onSelectNode] - 节点选中回调(jsonPath, subJsonStr, value, parsedData)
     * @returns {HTMLDivElement} 根元素
     */
    const buildJSONTree = (jsonStr, onSelectNode) => {
      var rawLines = jsonStr.split("\n");

      // 分析括号配对
      var foldRanges = {};
      var stack = [];
      var inStr = false, esc = false;
      for (var li = 0; li < rawLines.length; li++) {
        var line = rawLines[li];
        for (var ci = 0; ci < line.length; ci++) {
          var ch = line[ci];
          if (esc) { esc = false; continue; }
          if (ch === "\\" && inStr) { esc = true; continue; }
          if (ch === '"') { inStr = !inStr; continue; }
          if (inStr) continue;
          if (ch === "{" || ch === "[") {
            stack.push({ lineNo: li, ch: ch });
          } else if (ch === "}" || ch === "]") {
            if (stack.length > 0) {
              var opener = stack.pop();
              // 单行 {} / []（开闭括号同行）没有可隐藏的行，不生成折叠范围
              if (li > opener.lineNo) {
                foldRanges[opener.lineNo] = {
                  start: opener.lineNo,
                  end: li,
                  opener: opener.ch,
                  childCount: countJsonChildren(rawLines, opener.lineNo, li, opener.ch)
                };
              }
            }
          }
        }
      }

      // 语法高亮
      var highlightedHtml = colorizeJSON(jsonStr);
      var htmlLines = highlightedHtml.split("\n");

      // 构建每行 HTML
      var linesHtml = htmlLines.map(function (lineContent, idx) {
        var range = foldRanges[idx];
        var gutterHtml;
        if (range) {
          gutterHtml = '<span class="rla-json-fold-gutter" data-fold-start="' + range.start + '" data-fold-end="' + range.end + '" data-child-count="' + range.childCount + '" data-opener="' + range.opener + '">\u25B6</span>';
        } else {
          gutterHtml = '<span class="rla-json-fold-gutter"></span>';
        }
        return '<span class="rla-json-line" data-line="' + idx + '">' + gutterHtml + lineContent + '</span>';
      });

      var root = document.createElement("div");
      root.className = "rla-json-root";
      // 注意 join("")：每行已是 display:block，若行间再拼 "\n"，
      // 在 white-space:pre-wrap 下每个 \n 会渲染成额外空行，行距翻倍
      root.innerHTML = linesHtml.join("");

      // 行元素下标缓存：折叠/展开高频按下标取行，
      // 避免每次逐行 querySelector（大 JSON 折叠一个节点需查询数百次 DOM）
      root.__lineEls = [];
      root.querySelectorAll(".rla-json-line").forEach(function (el) {
        root.__lineEls[parseInt(el.dataset.line, 10)] = el;
      });

      // 解析 JSON 对象，用于节点选中时提取子 JSON
      var parsedData = null;
      try { parsedData = JSON.parse(jsonStr); } catch (e) { /* ignore */ }

      // 事件委托：折叠 / 展开
      root.addEventListener("click", function (e) {
        var gutter = e.target.closest(".rla-json-fold-gutter");
        if (gutter && gutter.dataset.foldStart) {
          e.stopPropagation();
          toggleFold(root, gutter);
          return;
        }
        var placeholder = e.target.closest(".rla-json-fold-placeholder");
        if (placeholder) {
          e.stopPropagation();
          var startLine = parseInt(placeholder.dataset.foldStart);
          var g = root.querySelector('.rla-json-fold-gutter[data-fold-start="' + startLine + '"]');
          if (g) toggleFold(root, g);
          return;
        }
      }, false);

      // 事件委托：节点选中
      root.addEventListener("click", function (e) {
        if (e.target.closest(".rla-json-fold-gutter") || e.target.closest(".rla-json-fold-placeholder")) return;
        var lineEl = e.target.closest(".rla-json-line");
        if (!lineEl) return;
        e.stopPropagation();

        root.querySelectorAll(".rla-json-line.selected").forEach(function (el) {
          el.classList.remove("selected");
        });
        lineEl.classList.add("selected");

        var lineIdx = parseInt(lineEl.dataset.line);
        var pathInfo = computeJsonPath(rawLines, foldRanges, lineIdx, parsedData);
        if (onSelectNode && pathInfo) {
          onSelectNode(pathInfo.path, pathInfo.subJson, pathInfo.value, parsedData);
        }

      }, false);

      return root;
    };

    /**
     * 折叠/展开切换
     *
     * 折叠：隐藏 startLine+1 ~ endLine 的所有行，并在开括号行尾部追加占位符：
     *   "a": {   →   "a": {…}  // 共 N 个元素
     * （开括号 {/[ 已在行内，占位符只补 …} 与元素数注释，避免出现双括号）
     *
     * 展开：恢复行显示。注意嵌套折叠场景 —— 外层展开时不能把内部
     * 仍处于折叠状态的子节点行一并显示，需要重新应用子折叠的隐藏。
     */
    /**
     * 按行号取行元素（优先用 buildJSONTree 建好的下标缓存，避免逐行 querySelector）
     */
    const lineAt = (root, n) =>
      (root.__lineEls && root.__lineEls[n]) ||
      root.querySelector('.rla-json-line[data-line="' + n + '"]');

    /**
     * 折叠/展开切换
     *
     * 折叠：隐藏 startLine+1 ~ endLine 的所有行，并在开括号行尾部追加占位符：
     *   "a": {   →   "a": {…}  // 共 N 个元素
     * （开括号 {/[ 已在行内，占位符只补 …} 与元素数注释，避免出现双括号）
     *
     * 展开：恢复行显示。注意嵌套折叠场景 —— 外层展开时不能把内部
     * 仍处于折叠状态的子节点行一并显示，需要重新应用子折叠的隐藏。
     */
    const toggleFold = (root, gutter) => {
      var startLine = parseInt(gutter.dataset.foldStart);
      var endLine = parseInt(gutter.dataset.foldEnd);
      var isCollapsed = gutter.classList.contains("collapsed");
      var startLineEl = lineAt(root, startLine);

      if (!isCollapsed) {
        for (var i = startLine + 1; i <= endLine; i++) {
          var lineEl = lineAt(root, i);
          if (lineEl) lineEl.classList.add("rla-folded");
        }
        gutter.classList.add("collapsed");

        if (startLineEl && !startLineEl.querySelector(".rla-json-fold-placeholder")) {
          var opener = gutter.dataset.opener || "{";
          var closer = opener === "{" ? "}" : "]";
          var childCount = parseInt(gutter.dataset.childCount || "0");
          var ph = document.createElement("span");
          ph.className = "rla-json-fold-placeholder";
          ph.dataset.foldStart = startLine;
          ph.title = "点击展开";
          ph.textContent = "\u2026" + closer + "  // 共 " + childCount + " 个元素";
          startLineEl.appendChild(ph);
        }

      } else {
        for (var i = startLine + 1; i <= endLine; i++) {
          var lineEl = lineAt(root, i);
          if (lineEl) lineEl.classList.remove("rla-folded");
        }
        gutter.classList.remove("collapsed");

        if (startLineEl) {
          var ph = startLineEl.querySelector(".rla-json-fold-placeholder");
          if (ph) ph.remove();
        }

        // 重新应用内部仍处于折叠状态的子节点隐藏
        // （先折叠内层再折叠/展开外层时，内层折叠的行不能被误显示）
        root.querySelectorAll(".rla-json-fold-gutter.collapsed").forEach(function (g) {
          var gs = parseInt(g.dataset.foldStart);
          var ge = parseInt(g.dataset.foldEnd);
          if (gs > startLine && ge <= endLine) {
            for (var i = gs + 1; i <= ge; i++) {
              var l = lineAt(root, i);
              if (l) l.classList.add("rla-folded");
            }
          }
        });
      }
    };

    /**
     * 将带折叠/选中功能的 JSON 树挂载到 pre 元素，并记录搜索所需元信息：
     *   pre.__jsonText      - 原始格式化 JSON 文本（容器内搜索的语料）
     *   pre.__onSelectNode  - 节点选中回调（搜索恢复重建树时回传，避免详情面板失效）
     */
    const mountJsonTree = (pre, jsonStr, onSelectNode) => {
      pre.__jsonText = jsonStr;
      pre.__onSelectNode = onSelectNode || null;
      pre.innerHTML = "";
      pre.appendChild(buildJSONTree(jsonStr, onSelectNode));
    };

    /**
     * 根据点击的行号，计算 JSONPath 并提取子 JSON。
     * 返回 { path: "$.a.b[0]", subJson: "格式化字符串", value: any }
     */
    const computeJsonPath = (rawLines, foldRanges, clickLine, rootData) => {
      var pathParts = [];
      var currentData = rootData;

      // 收集所有 foldRange，按 startLine 排序
      var allRanges = Object.keys(foldRanges).map(function (k) {
        return foldRanges[k];
      }).sort(function (a, b) { return a.start - b.start; });

      // 找出所有包含 clickLine 的 range（start < clickLine <= end）
      var containingRanges = allRanges.filter(function (r) {
        return r.start < clickLine && clickLine <= r.end;
      });

      // 从外到内逐层确定 key/index
      for (var ci = 0; ci < containingRanges.length; ci++) {
        var range = containingRanges[ci];
        if (currentData == null) break;

        var childIdx = -1;
        var childKey = null;
        var foundInThisLayer = false;

        var depth = 0, inStr2 = false, esc2 = false;
        for (var li = range.start + 1; li < range.end; li++) {
          var line = rawLines[li];
          var trimmed = line.trimStart();

          if (depth === 0 && !inStr2) {
            // 对象：匹配 "key": 模式
            var keyMatch = trimmed.match(/^"([^"]+)":\s*/);
            if (keyMatch && currentData && typeof currentData === "object" && !Array.isArray(currentData)) {
              childIdx++;
              childKey = keyMatch[1];
              // 检查 clickLine 是否在此子节点的范围内
              if (li === clickLine || isLineInChildRange(rawLines, foldRanges, li, clickLine)) {
                pathParts.push("." + childKey);
                currentData = currentData ? currentData[childKey] : null;
                foundInThisLayer = true;
                break;
              }
            } else if (Array.isArray(currentData)) {
              // 数组元素：以 { [ " 数字 true false null 开头
              if (trimmed.match(/^[\{\[]/) || trimmed.match(/^[\-\d]/) || trimmed.match(/^"/) || trimmed === "true" || trimmed === "false" || trimmed === "null") {
                childIdx++;
                if (li === clickLine || isLineInChildRange(rawLines, foldRanges, li, clickLine)) {
                  pathParts.push("[" + childIdx + "]");
                  currentData = currentData ? currentData[childIdx] : null;
                  foundInThisLayer = true;
                  break;
                }
              }
            }
          }

          // 更新 depth
          for (var ci2 = 0; ci2 < line.length; ci2++) {
            var ch = line[ci2];
            if (esc2) { esc2 = false; continue; }
            if (ch === "\\" && inStr2) { esc2 = true; continue; }
            if (ch === '"') { inStr2 = !inStr2; continue; }
            if (inStr2) continue;
            if (ch === "{" || ch === "[") depth++;
            else if (ch === "}" || ch === "]") depth--;
          }
        }

        if (!foundInThisLayer) {
          // 点击的行可能就是该层的开括号行或闭括号行
          // 此时 path 取当前层
          break;
        }
      }

      // 如果点击行本身是一个 foldRange 的开括号行
      if (pathParts.length === 0 && foldRanges[clickLine] && containingRanges.length === 0) {
        // 点击根节点
      }

      var jsonPath = "$" + pathParts.join("");
      var subJson = "";
      var value = currentData;
      try {
        subJson = JSON.stringify(currentData, null, 2);
      } catch (e) {
        subJson = String(currentData);
      }

      return { path: jsonPath, subJson: subJson, value: value };
    };

    /**
     * 判断 clickLine 是否在 startLine 对应的子节点 foldRange 内
     */
    const isLineInChildRange = (rawLines, foldRanges, startLine, clickLine) => {
      if (foldRanges[startLine]) {
        var r = foldRanges[startLine];
        return clickLine > r.start && clickLine <= r.end;
      }
      return startLine === clickLine;
    };


    /**
     * 为 JSON 字符串添加语法高亮（与 master 保持一致的实现）
     *
     * 注意：只能内联转义 & < >，【不能】改用 escapeHtml ——
     * escapeHtml 会把双引号转成 &quot;，导致下面匹配引号的
     * json-key / json-string 正则全部失配，语法高亮整体丢失。
     *
     * @param {string} jsonStr - JSON 格式字符串
     * @returns {string} 带有 HTML span 标签的彩色 JSON 字符串
     */
    const colorizeJSON = (jsonStr) =>
      jsonStr
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"([^"]+)":/g, '<span class="json-key">"$1"</span>:')
        .replace(/: "([^"]*)"/g, ': <span class="json-string">"$1"</span>')
        .replace(/: (-?\d+\.?\d*)/g, ': <span class="json-number">$1</span>')
        .replace(/: (true|false)/g, ': <span class="json-boolean">$1</span>')
        .replace(/: null/g, ': <span class="json-null">null</span>')
        .replace(/([{[\],}])/g, '<span class="json-punctuation">$1</span>');

    /**
     * 复制文本到剪贴板（navigator.clipboard → execCommand 两级兜底，适配 Tabbit 无 GM API）
     * @param {string} text - 要复制的文本
     * @param {Function} onCopySuccess - 复制成功回调
     */
    const copyTextToClipboard = (text, onCopySuccess) => {
      // Tabbit 无油猴 GM API：navigator.clipboard 优先，execCommand 兜底
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard
          .writeText(text)
          .then(onCopySuccess)
          .catch(() => {
            // 最终兜底：document.execCommand
            try {
              const ta = document.createElement("textarea");
              ta.value = text;
              ta.style.cssText =
                "position:fixed;top:-9999px;left:-9999px;opacity:0";
              document.body.appendChild(ta);
              ta.focus();
              ta.select();
              document.execCommand("copy");
              document.body.removeChild(ta);
              onCopySuccess();
            } catch (_) {
              /* 静默失败 */
            }
          });
        return;
      }
      // 直接 execCommand 兜底
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.cssText = "position:fixed;top:-9999px;left:-9999px;opacity:0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        onCopySuccess();
      } catch (_) {
        /* 静默失败 */
      }
    };

    /**
     * 创建复制按钮
     * @param {string} text - 要复制的文本内容
     * @returns {HTMLButtonElement} 复制按钮元素，点击后复制文本并显示成功图标 1.5 秒
     */
    const createCopyButton = (text) => {
      const btn = document.createElement("button");
      btn.className = "log-copy-btn";
      const ICON_COPY =
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
      const ICON_CHECK =
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>';
      btn.innerHTML = ICON_COPY;

      const onCopySuccess = () => {
        btn.classList.add("copied");
        btn.innerHTML = ICON_CHECK;
        setTimeout(() => {
          btn.classList.remove("copied");
          btn.innerHTML = ICON_COPY;
        }, 1500);
      };

      btn.onclick = (e) => {
        e.stopPropagation();
        copyTextToClipboard(text, onCopySuccess);
      };
      return btn;
    };

    // ── JSON 文本转换（参考 json.cn/jsonzip）──────────────────────
    /** 压缩：去掉格式化空白，变成单行；解析失败则返回原文 */
    const minifyJsonText = (t) => {
      try {
        return JSON.stringify(JSON.parse(t));
      } catch {
        return t;
      }
    };
    /** 转义：整体转为 JSON 字符串字面量（加外层引号、内部加 \ 转义） */
    const escapeJsonText = (t) => JSON.stringify(t);
    /** 去除转义：若文本是转义的字符串字面量则还原内部内容，否则返回原文 */
    const unescapeJsonText = (t) => {
      try {
        const v = JSON.parse(t);
        return typeof v === "string" ? v : t;
      } catch {
        return t;
      }
    };
    const JSON_TEXT_TRANSFORMS = [
      { label: "压缩转义", fn: (t) => escapeJsonText(minifyJsonText(t)) },
      { label: "压缩", fn: (t) => minifyJsonText(t) },
      { label: "转义", fn: (t) => escapeJsonText(t) },
      { label: "去除转义", fn: (t) => unescapeJsonText(t) },
    ];

    /**
     * 创建 JSON 转换按钮组（压缩转义 / 压缩 / 转义 / 去除转义），
     * 挂在每段 JSON 的复制按钮旁，点击后把 JSON 文本做对应转换并复制到剪贴板。
     * @param {string} sourceText - 该段 JSON 的格式化文本
     * @returns {HTMLSpanElement} 按钮组元素
     */
    const createJsonTransformButtons = (sourceText) => {
      const group = document.createElement("span");
      group.className = "rla-json-tool-group";
      JSON_TEXT_TRANSFORMS.forEach(({ label, fn }) => {
        const btn = document.createElement("button");
        btn.className = "rla-json-tool-btn";
        btn.textContent = label;
        btn.title = `复制「${label}」后的 JSON`;
        btn.onclick = (e) => {
          e.stopPropagation();
          copyTextToClipboard(fn(sourceText), () => {
            btn.classList.add("copied");
            btn.textContent = "已复制";
            setTimeout(() => {
              btn.classList.remove("copied");
              btn.textContent = label;
            }, 1200);
          });
        };
        group.appendChild(btn);
      });
      return group;
    };

    /**
     * 解析混合内容（文本 + JSON + Java 异常栈）
     *
     * 采用逐行扫描架构：
     *   1. 将 text 按换行符拆成行数组；
     *   2. 逐行判断当前行是否为"Java 异常栈开始行"：
     *      - 异常栈开始行 = 行内含有 XxxException/XxxError 类名（支持 java.lang.Foo 完整包名），
     *        且后续第一个非空行以 "at " / "Caused by:" / "... N more" 开头（lookahead 校验）；
     *   3. 非异常栈行：在行内查找 { 或 [ 尝试解析 JSON；没有 JSON 则整行作为普通文本；
     *   4. 连续普通文本行合并为同一个 text part，减少碎片。
     *
     * @param {string} text - 可能包含 JSON 对象/数组和 Java 异常栈的文本内容
     * @returns {Array<{type: 'text'|'json'|'java-stack', content?: string, formatted?: string}>}
     */
    const parseMixedContent = (rawText) => {
      // 规范化：处理 textContent 中被平台压缩的换行
      const normalizeText = (s) =>
        s
          // 兜底：若仍有 <br> 标签，转为 \n
          .replace(/<br\s*\/?>/gi, "\n")
          // 兜底：去掉残余 HTML 标签
          .replace(/<[^>]+>/g, "")
          // 反转义 HTML 实体
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&nbsp;/g, " ")
          // 堆栈行拆分：Raptor 平台渲染 textContent 时，\t\n 被压缩成空格，
          // 导致多个 "at " 行挤在同一行里。
          // 规则：在 " at com." / " at java." / " at org." / " at sun." 等模式前插入 \n，
          // 同时处理 "Caused by:" 和 "... N more" 的分隔。
          .replace(/ (at (?:[a-z$_][a-zA-Z0-9$_.]*\.))/g, "\n\t$1")
          .replace(/ (Caused by:)/g, "\n$1")
          .replace(/ (\.{3} \d+ more)/g, "\n\t$1");

      const text = normalizeText(rawText);
      const parts = [];

      // 判断一行是否为 Java 异常栈的"异常声明行"
      // 支持：java.lang.ClassCastException（带包名全限定）、NullPointerException（裸类名）、
      //       com.meituan.SomeCustomError、Caused by: java.lang.RuntimeException 等形式
      // 也支持 Spring 的 nested exception 链："nested exception is org.springframework..."
      const isExceptionDeclarationLine = (line) =>
        /(?:^|[\s:])(?:[a-z][a-zA-Z0-9_]*\.)*([A-Z][a-zA-Z0-9]*(?:Exception|Error)|Throwable)(?::|$| )/.test(
          line,
        );

      // 判断一行是否为 Spring nested exception 链行
      // 格式："nested exception is org.springframework.beans.factory.XxxException: ..."
      const isNestedExceptionLine = (line) =>
        /nested exception is\s+(?:[a-z][a-zA-Z0-9_]*\.)*[A-Z][a-zA-Z0-9]*(?:Exception|Error)/.test(
          line,
        );

      // 判断一行是否为堆栈跟踪行（at / Caused by / ... N more / nested exception）
      const isStackTraceLine = (line) => {
        const t = line.trimStart();
        return (
          t.startsWith("at ") ||
          t.startsWith("Caused by:") ||
          t.startsWith("... ") ||
          isNestedExceptionLine(line)
        );
      };

      // 判断一行是否为 Java toString 风格输出：
      // 「类名(」且括号内紧跟 key= 形式字段（CamelCase 类名，支持内部类点号）。
      // 如 MerchantKeysGrayConfigDTO(graySwitch=true, blackList=[704845, 281032], ...)
      // 或 ServiceItem(sys_serviceItemUnits=[...])。这类行内部的数字数组是合法 JSON，
      // 会被逐个抠成独立 JSON 碎片（4 JSON + 5 文本），拆碎整行可读性差，
      // 识别到时整行按文本处理。
      // 与 kv 日志（msgId=xxx, body={...}）区分：后者无「类名(」前缀结构，不受影响。
      const isJavaToStringLine = (line) =>
        /(?:^|[\s:])(?:[a-z$_][\w$]*\.)?[A-Z]\w*(?:\.[A-Z]\w*)*\(\s*[A-Za-z_]\w*\s*=/.test(
          line,
        );

      // 在字符串中找到第一个完整 JSON（{ 或 [ 开始），返回 {start, end} 或 null
      const findFirstJSON = (str) => {
        // 确定搜索起始位置：如果字符串不以 { 或 [ 开头（如 key=... 或 , key=...），
        // 先找到第一个 = 号，跳过 = 后的空白/引号，从 { 或 [ 开始
        let searchStart = 0;
        if (str.length > 0 && str[0] !== "{" && str[0] !== "[") {
          const eqIdx = str.indexOf("=");
          if (eqIdx !== -1 && eqIdx + 1 < str.length) {
            // 从 = 之后跳过格和可能的开引号 "，查找有效的 { 或 [
            let p = eqIdx + 1;
            // 跳过空白
            while (p < str.length && (str[p] === " " || str[p] === "\t")) p++;
            // 跳过单个开引号（key="{..."} 模式）
            if (p < str.length && str[p] === '"') p++;
            // 如果跳过引号后遇到 { 则从这里开始搜索
            if (p < str.length && (str[p] === "{" || str[p] === "[")) {
              searchStart = p;
            }
          }
        }
        for (let i = searchStart; i < str.length; i++) {
          if (str[i] !== "{" && str[i] !== "[") continue;
          let stack = [str[i]],
            j = i + 1,
            inStr = false,
            esc = false;
          while (j < str.length && stack.length > 0) {
            if (esc) {
              esc = false;
              j++;
              continue;
            }
            if (str[j] === "\\") {
              esc = true;
              j++;
              continue;
            }
            if (str[j] === '"') inStr = !inStr;
            else if (!inStr) {
              if (str[j] === "{" || str[j] === "[") stack.push(str[j]);
              else if (str[j] === "}" || str[j] === "]") stack.pop();
            }
            j++;
          }
          if (stack.length === 0) {
            // 提取 { 到匹配 } 之间的原始字符串，处理被双引号包裹的 JSON 字符串
            let candidate = str.substring(i, j);
            if (
              candidate[0] === '"' &&
              candidate[candidate.length - 1] === '"'
            ) {
              // key="{...}" 模式：去除外层引号并反转义
              try {
                candidate = JSON.parse(candidate);
              } catch {
                /* 解析失败则保持原样 */
              }
            }
            const result = tryParseJSONSmart(candidate); // 支持整体转义的 JSON 串（先去转义再解析）
            if (result.success)
              return { start: i, end: j, formatted: result.formatted };
          }
        }
        return null;
      };

      // 在一行内查找"未闭合"的 { 或 [ 的起始下标（忽略字符串字面量内的括号）。
      // 返回最外层未闭合开括号的下标；若行内所有括号都闭合则返回 -1。
      const findUnclosedOpener = (line) => {
        const stack = [];
        let inStr = false,
          esc = false;
        for (let i = 0; i < line.length; i++) {
          const c = line[i];
          if (esc) {
            esc = false;
            continue;
          }
          if (c === "\\") {
            esc = true;
            continue;
          }
          if (c === '"') {
            inStr = !inStr;
            continue;
          }
          if (inStr) continue;
          if (c === "{" || c === "[") stack.push(i);
          else if (c === "}" || c === "]") stack.pop();
        }
        return stack.length > 0 ? stack[0] : -1;
      };

      /**
       * 去掉 JSON 文本中数组/对象的尾随逗号（trailing comma）。
       * 带字符串状态机：只在字符串字面量之外处理 ", }" / ", ]"，
       * 字符串内的同类字符序列不受影响。
       * 用于跨行合并后的 JSON 含尾随逗号导致 JSON.parse 失败的场景
       * （如 MThrift response 日志数组末元素后多打了逗号）。
       * @param {string} str - JSON 文本
       * @returns {string} 清洗后的文本
       */
      const stripTrailingCommas = (str) => {
        let out = "";
        let inStr = false,
          esc = false;
        for (let i = 0; i < str.length; i++) {
          const c = str[i];
          if (esc) {
            out += c;
            esc = false;
            continue;
          }
          if (c === "\\" && inStr) {
            out += c;
            esc = true;
            continue;
          }
          if (c === '"') {
            inStr = !inStr;
            out += c;
            continue;
          }
          if (!inStr && c === ",") {
            // 字符串外遇逗号：向后跳过空白，若紧邻 } / ] 则为尾随逗号，丢弃
            let j = i + 1;
            while (
              j < str.length &&
              (str[j] === " " ||
                str[j] === "\t" ||
                str[j] === "\n" ||
                str[j] === "\r")
            )
              j++;
            if (str[j] === "}" || str[j] === "]") continue;
          }
          out += c;
        }
        return out;
      };

      /**
       * 修复被截断的 JSON 文本（超长日志被平台截断，开括号到文本末尾未闭合）。
       * 策略：正向扫描记录「安全截断点」——字符串字面量之外的 { / [ 紧后位置
       * 与逗号紧后位置（即完整成员/元素的边界）。从最后一个安全点回退截断，
       * 去尾随逗号后按括号栈补全闭合符再解析；失败则逐级向前回退重试。
       * 例：{"a":1,"b":{"c":"hasSubPerm → {"a":1,"b":{}}（丢弃截断的末尾残缺成员）。
       * @param {string} str - 以 { 或 [ 开头的截断 JSON 文本
       * @returns {{success: boolean, formatted: string}|null} 修复成功返回解析结果，无法修复返回 null
       */
      const repairTruncatedJSON = (str) => {
        const MAX_CUTS = 8; // 最多保留的安全点数（即最大回退重试次数）
        const stack = []; // 字符串外的括号栈
        const cuts = []; // 最近 MAX_CUTS 个安全点：{pos, stack: 栈快照}
        let inStr = false,
          esc = false;
        for (let i = 0; i < str.length; i++) {
          const c = str[i];
          if (esc) {
            esc = false;
            continue;
          }
          if (c === "\\") {
            esc = true;
            continue;
          }
          if (c === '"') {
            inStr = !inStr;
            continue;
          }
          if (inStr) continue;
          if (c === "{" || c === "[") {
            stack.push(c);
            cuts.push({ pos: i + 1, stack: stack.slice() });
          } else if (c === "}" || c === "]") {
            stack.pop();
          } else if (c === ",") {
            cuts.push({ pos: i + 1, stack: stack.slice() });
          } else {
            continue; // 非边界字符，无需记录安全点
          }
          if (cuts.length > MAX_CUTS) cuts.shift();
        }
        // 从最后一个安全点逐级回退：截断 → 去末尾空白/逗号 → 补全闭合 → 解析
        for (let k = cuts.length - 1; k >= 0; k--) {
          const cut = cuts[k];
          // 空壳保护：回退到最外层 opener 紧后（pos<=1）意味着丢弃全部内容。
          // 原串 opener 后本就没有实质内容（如 "{"、"{"a"）时输出空容器合理；
          // 但有实质内容（如 Java Map toString 截断 "{a=1, b=2, c"）时内容全部
          // 无法修复成合法 JSON，输出空壳会丢内容 —— 放弃修复回退整体文本。
          if (cut.pos <= 1 && str.length > 4) continue;
          // 安全点在逗号紧后，body 末尾可能带逗号（截断特有：逗号后无任何字符，
          // stripTrailingCommas 的 ", }" 模式覆盖不到），需一并去掉末尾空白与逗号。
          // 末尾不会停在字符串字面量中间（安全点均在字符串外），此清理安全。
          const body = str.slice(0, cut.pos).replace(/[\s,]+$/, "");
          let closing = "";
          for (let j = cut.stack.length - 1; j >= 0; j--)
            closing += cut.stack[j] === "{" ? "}" : "]";
          const result = tryParseJSONSmart(body + closing);
          if (result.success) return result;
        }
        return null;
      };

      /**
       * 多行 JSON 检测：某些日志（如 Lion 配置打印）会把一个 JSON 对象跨多行输出，
       * 逐行解析会把 JSON 拆成若干碎片（每个 { "url": ... } 行被当成独立 JSON）。
       * 当 lines[startLi] 存在未闭合的 { 或 [ 时，向后逐行累积直到括号闭合，
       * 整体 JSON.parse 成功则返回解析结果，否则返回 null（走原有逐行逻辑兜底）。
       *
       * @param {string[]} lines - 全部行
       * @param {number} startLi - 当前行下标
       * @returns {{endLi:number, before:string, formatted:string, after:string}|null}
       *   endLi: JSON 闭合所在的行下标；before: 开括号之前的文本；after: 闭合符之后的残余文本
       */
      const tryParseMultilineJSON = (lines, startLi) => {
        const openerIdx = findUnclosedOpener(lines[startLi]);
        if (openerIdx === -1) return null;

        let merged = lines[startLi];
        let endLi = startLi;
        let closedPos = -1;
        const stack = [merged[openerIdx]];
        let inStr = false,
          esc = false,
          pos = openerIdx + 1;

        while (true) {
          while (pos < merged.length) {
            const c = merged[pos];
            if (esc) {
              esc = false;
              pos++;
              continue;
            }
            if (c === "\\") {
              esc = true;
              pos++;
              continue;
            }
            if (c === '"') {
              inStr = !inStr;
              pos++;
              continue;
            }
            if (!inStr) {
              if (c === "{" || c === "[") stack.push(c);
              else if (c === "}" || c === "]") {
                stack.pop();
                if (stack.length === 0) {
                  closedPos = pos;
                  break;
                }
              }
            }
            pos++;
          }
          if (closedPos !== -1) break;
          endLi++;
          if (endLi >= lines.length) {
            // 到末尾都没闭合：多为超长日志被平台截断（如 MThrift response 大 JSON）。
            // 先尝试修复（回退到最后一个完整成员 + 按括号栈补全闭合）后整体格式化；
            // 修复失败（如 Java Map toString 混合体、截断点过于畸形）才返回纯截断标记 ——
            // 此时若直接回退逐行逻辑，JSON 内每个完整闭合的子对象会被 findFirstJSON
            // 提取成独立 JSON 段，整条日志被拆成碎片，故调用方把开括号到末尾整体作为文本段。
            const repaired = repairTruncatedJSON(merged.substring(openerIdx));
            if (repaired) {
              return {
                endLi: lines.length - 1,
                openerIdx,
                before: merged.substring(0, openerIdx).trim(),
                formatted: repaired.formatted,
                after: "",
                truncated: true,
              };
            }
            return { truncated: true, openerIdx };
          }
          merged += "\n" + lines[endLi];
        }

        const candidate = merged.substring(openerIdx, closedPos + 1);
        let result = tryParseJSONSmart(candidate); // 支持整体转义的 JSON 串（先去转义再解析）
        // 尾随逗号重试：数组末元素后多打逗号（如 ..., false }\n,\n]）时 JSON.parse 失败，
        // 去掉字符串外的尾随逗号后再试一次；仍失败才回退逐行逻辑
        if (!result.success) {
          const cleaned = stripTrailingCommas(candidate);
          if (cleaned !== candidate) {
            result = tryParseJSONSmart(cleaned);
          }
        }
        if (!result.success) return null;
        return {
          endLi,
          before: merged.substring(0, openerIdx).trim(),
          formatted: result.formatted,
          after: merged.substring(closedPos + 1),
        };
      };

      // 将行内可能含有的 JSON 提取出来，返回 parts 数组
      const parseLineContent = (line) => {
        const lineParts = [];
        let rest = line;
        while (rest.length > 0) {
          const found = findFirstJSON(rest);
          if (!found) {
            const t = rest.trim();
            if (t) lineParts.push({ type: "text", content: t });
            break;
          }
          // found.start 之前的文本
          const before = rest.substring(0, found.start).trim();
          if (before) lineParts.push({ type: "text", content: before });
          lineParts.push({ type: "json", formatted: found.formatted });
          rest = rest.substring(found.end);
        }
        return lineParts;
      };

      // 按行拆分（保留空行信息）
      const lines = text.split("\n");
      let pendingText = ""; // 累积连续的普通文本行，最后合并输出

      const flushText = () => {
        const t = pendingText.trim();
        if (t) parts.push({ type: "text", content: t });
        pendingText = "";
      };

      let li = 0;
      while (li < lines.length) {
        const line = lines[li];

        // ── 判断是否是 Java 异常栈的开始行 ──────────────────────
        if (isExceptionDeclarationLine(line)) {
          // lookahead：扫描后续前若干个非空行，任一是堆栈行即认定。
          // 旧逻辑只看"下一个非空行"，当异常声明行与首个 at 堆栈行之间
          // 夹着 request:... 等非堆栈文本时（常见于 Pigeon 心跳超时栈），
          // 下一个非空行不是堆栈行 → 误判为非异常栈 → 漏识别。
          const hasStackAhead = (() => {
            let scanned = 0;
            for (let i = li + 1; i < lines.length && scanned < 8; i++) {
              if (lines[i].trim() === "") continue;
              scanned++;
              if (isStackTraceLine(lines[i])) return true;
            }
            return false;
          })();
          if (hasStackAhead) {
            // 确认是异常栈，先flush之前积累的文本
            flushText();
            const stackLines = [line];
            li++;
            // 收集后续行：异常声明行与首个堆栈行之间可能夹杂非堆栈文本（request:... 等），
            // 这些行也纳入异常栈保留上下文；遇到首个堆栈行后严格按堆栈行收集，
            // 连续遇到非堆栈非空行才结束。
            let seenStack = false;
            let nonStackStreak = 0;
            while (li < lines.length) {
              const sl = lines[li];
              if (sl.trim() === "") {
                stackLines.push(sl); // 空行保留（异常栈内可能有空行）
                li++;
                continue;
              }
              if (isStackTraceLine(sl) || isExceptionDeclarationLine(sl)) {
                stackLines.push(sl);
                seenStack = true;
                nonStackStreak = 0;
                li++;
              } else if (!seenStack) {
                // 还没遇到首个堆栈行：允许夹杂的非堆栈文本（如 request:... 上下文）纳入
                stackLines.push(sl);
                li++;
              } else {
                // 已进入堆栈区，遇到非堆栈行：连续 2 个非堆栈非空行才结束
                nonStackStreak++;
                if (nonStackStreak >= 2) break;
                stackLines.push(sl);
                li++;
              }
            }
            parts.push({ type: "java-stack", lines: stackLines });
            continue;
          }
          // 兜底：单行异常链（无 at 堆栈，但整行包含多个 nested exception）
          // 例如："Exception encountered...: org.springframework...Exception: ... nested exception is ..."
          if (line.includes("nested exception is")) {
            flushText();
            parts.push({ type: "java-stack", lines: [line] });
            li++;
            continue;
          }
        }

        // ── Java toString 行：整体保留为文本，防止内部小数组被抠成 JSON 碎片 ──
        if (isJavaToStringLine(line)) {
          const t = line.trim();
          if (t) pendingText += (pendingText ? "\n" : "") + t;
          li++;
          continue;
        }

        // ── 多行 JSON：当前行有未闭合的 { 或 [ 时，尝试跨行整体解析 ─────
        const multi = tryParseMultilineJSON(lines, li);
        if (multi && multi.truncated) {
          // 截断的多行 JSON（已到文本末尾）
          flushText();
          // 开括号之前的内容里可能还有已闭合的 JSON（如 a={x:1} b={...截断），
          // 继续按行内逻辑解析，避免遗漏
          const before = lines[li].substring(0, multi.openerIdx).trim();
          if (before) parseLineContent(before).forEach((p) => parts.push(p));
          if (multi.formatted) {
            // 修复成功：格式化输出（标注截断，便于识别被丢弃的尾部残缺成员）
            parts.push({
              type: "json",
              formatted: multi.formatted,
              truncated: true,
            });
          } else {
            // 修复失败：开括号到文本末尾整体作为文本段，不再逐行拆碎
            // （截断即日志末尾，后续不会再有其他内容）
            const bodyLines = lines.slice(li);
            bodyLines[0] = bodyLines[0].substring(multi.openerIdx);
            const body = bodyLines.join("\n").trim();
            if (body) parts.push({ type: "text", content: body });
          }
          li = lines.length;
          continue;
        }
        if (multi) {
          flushText();
          if (multi.before) parts.push({ type: "text", content: multi.before });
          parts.push({ type: "json", formatted: multi.formatted });
          // 闭合符之后同行的残余内容，按行内逻辑继续解析
          const rest = multi.after.trim();
          if (rest) parseLineContent(rest).forEach((p) => parts.push(p));
          li = multi.endLi + 1;
          continue;
        }

        // ── 普通行：尝试从中提取 JSON ─────────────────────────
        const lineParts = parseLineContent(line);
        if (lineParts.length === 0) {
          // 空行
          pendingText += "\n";
          li++;
          continue;
        }
        // 如果行内有 JSON，先 flush 之前的文本，再逐 part 输出
        const hasJSON = lineParts.some((p) => p.type === "json");
        if (hasJSON) {
          flushText();
          lineParts.forEach((p) => parts.push(p));
        } else {
          // 纯文本行，累积到 pendingText（相邻文本行合并）
          const lineText = lineParts.map((p) => p.content).join(" ");
          pendingText += (pendingText ? "\n" : "") + lineText;
        }
        li++;
      }

      flushText(); // 输出末尾剩余文本

      return parts;
    };

    /**
     * 递归获取元素及其子元素的完整文本内容
     * @param {Element} element - DOM 元素
     * @returns {string} 元素的所有文本内容（排除隐藏元素）
     */
    const getFullTextContent = (element) => {
      let text = "";
      [...element.childNodes].forEach((node) => {
        if (node.nodeType === 3) text += node.textContent;
        else if (
          node.nodeType === 1 &&
          node.style.display !== "none" &&
          // JSON 折叠隐藏行用 class（rla-folded）而非内联 display，
          // 与视觉保持一致：复制时同样跳过已折叠的行
          !node.classList.contains("rla-folded")
        )
          text += getFullTextContent(node);
      });
      return text;
    };

    /**
     * 创建日志字段行（表格行）
     * @param {string} key - 字段名
     * @param {string} value - 字段值
     * @param {boolean} isImportant - 是否为重要字段（影响默认展开状态和样式）
     * @returns {HTMLTableRowElement} 创建的表格行元素
     */
    // 判断字段是否需要走混合内容解析（文本 / java-stack / json）
    // message / message1 强制解析；其他字段（如 exception/stack/error/throwable 等）
    // 若值里同时包含异常声明行和堆栈跟踪行特征，也走解析，避免异常栈被当纯文本渲染。
    // 强制走混合解析的字段：
    //   - message / message1：文本 / java-stack / json 混合内容
    //   - input_body / output_body：网关类日志的请求/响应体，通常为 JSON
    //     （值里含完整 JSON 对象/数组时，parseMixedContent 会检测出 json part，
    //      并提供「格式化 JSON」按钮进入树状视图）
    const FORCE_PARSE_FIELDS = new Set([
      "message",
      "message1",
      "input_body",
      "output_body",
    ]);

    const shouldParseMixed = (k, v) => {
      if (FORCE_PARSE_FIELDS.has(k)) return true;
      if (!v || typeof v !== "string") return false;
      // 快速特征检测：含异常类名（XxxException/XxxError/Throwable）且含 "at " 堆栈行
      const hasExcDecl =
        /(?:[A-Z][a-zA-Z0-9]*(?:Exception|Error)|Throwable)/.test(v);
      const hasStackFrame =
        /\bat\s+[a-z][a-zA-Z0-9_$]*\.[a-zA-Z0-9_$./]*\(/.test(v);
      return hasExcDecl && hasStackFrame;
    };

    const createFieldRow = (key, value, isImportant, nativeNode) => {
      const tr = document.createElement("tr");
      tr.className =
        "log-field-row " + (isImportant ? "important expanded" : "collapsed");

      // 该字段是否走混合解析（文本/java-stack/json），决定 key 是否高亮为 message-key 样式
      const fieldParseMixed = shouldParseMixed(key, value);

      const keyTd = document.createElement("td");
      keyTd.className =
        "log-field-key" + (fieldParseMixed ? " message-key" : "");
      keyTd.textContent = key;

      const valueTd = document.createElement("td");
      valueTd.className = "log-field-value";

      // 有原生节点的字段（如 traceId__）：直接挂载原始节点，保留 Vue popover/click 事件
      if (nativeNode) {
        const wrapper = document.createElement("div");
        wrapper.className = "log-value-wrapper";
        wrapper.appendChild(nativeNode);
        wrapper.appendChild(createCopyButton(value));
        valueTd.appendChild(wrapper);
        tr.appendChild(keyTd);
        tr.appendChild(valueTd);
        return tr;
      }

      if (fieldParseMixed) {
        // ── 解析 message 内容（文本 / java-stack / json 混合）────
        const parts = parseMixedContent(value);
        const hasStack = parts.some((p) => p.type === "java-stack");
        const jsonParts = parts.filter((p) => p.type === "json");
        const hasJson = jsonParts.length > 0;

        // ── 右侧 value 列：默认视图 ───────────────────────────────
        // 规则：
        //   - 纯文本 part → 直接渲染
        //   - java-stack part → 直接渲染（不需要点按钮）
        //   - json part → 替换为占位符（点击格式化按钮后才渲染 JSON）
        const defaultView = document.createElement("div");
        defaultView.className = "log-mixed-content";

        // 复制整条 message 原始文本的按钮（始终放在最下方）
        const msgCopyBtn = createCopyButton(value);

        if (!hasStack && !hasJson) {
          // 纯文本，无特殊内容：直接显示原始文本 + 复制按钮
          const wrapper = document.createElement("div");
          wrapper.className = "log-value-wrapper";
          const span = document.createElement("span");
          span.className = "log-value-text";
          span.textContent = value;
          wrapper.appendChild(span);
          wrapper.appendChild(msgCopyBtn);
          defaultView.appendChild(wrapper);
        } else {
          // 有异常栈或 JSON：逐 part 渲染默认视图
          parts.forEach((part) => {
            if (part.type === "text") {
              const textDiv = document.createElement("div");
              textDiv.className = "log-text-content";
              textDiv.textContent = part.content;
              defaultView.appendChild(textDiv);
            } else if (part.type === "java-stack") {
              // 异常栈：直接渲染，不需要按钮
              const exceptionWrapper = document.createElement("div");
              const title = document.createElement("div");
              title.className = "java-exception-title";
              title.innerHTML =
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg> Java Exception Stack';
              exceptionWrapper.appendChild(title);
              const exceptionContent = document.createElement("div");
              exceptionContent.className = "java-exception-content";
              exceptionContent.textContent = part.lines.join("\n");
              exceptionWrapper.appendChild(exceptionContent);
              defaultView.appendChild(exceptionWrapper);
            } else {
              // JSON part：默认视图里显示原始文本占位（不格式化）
              if (part.truncated) {
                const truncHint = document.createElement("div");
                truncHint.className = "log-json-truncated-hint";
                truncHint.textContent =
                  "⚠ 日志被平台截断，已自动补全闭合括号（截断处的残缺成员已丢弃）";
                defaultView.appendChild(truncHint);
              }
              const rawJsonDiv = document.createElement("div");
              rawJsonDiv.className = "log-text-content";
              rawJsonDiv.textContent = part.formatted; // 先用格式化后的纯文本占位
              defaultView.appendChild(rawJsonDiv);
            }
          });
          defaultView.appendChild(msgCopyBtn);
        }

        let formattedNode = null; // 格式化视图（懒建，只构建一次）
        let collapsibleWrapRef = null; // 限高容器引用，供展开/收起时操作 defaultView

        /**
         * 应用内容限高 + 遮罩展开逻辑
         * 把 defaultView 包进限高容器，超过阈值高度时加遮罩 + 展开按钮
         */
        const applyCollapseIfNeeded = () => {
          // 先清空 valueTd，重新构建限高容器
          valueTd.innerHTML = "";
          const collapsibleWrap = document.createElement("div");
          collapsibleWrap.className = "log-collapsible-content";
          collapsibleWrap.appendChild(defaultView);
          collapsibleWrapRef = collapsibleWrap; // 保存引用，供展开时移除 defaultView 用
          valueTd.appendChild(collapsibleWrap);

          // 异步检测：内容是否超过限高
          requestAnimationFrame(() => {
            const contentHeight = defaultView.scrollHeight;
            const MAX_HEIGHT = 120; // 与 CSS max-height 一致，约 4-5 行
            if (contentHeight <= MAX_HEIGHT) return; // 未超限，无需遮罩

            // 遮罩层 + 展开按钮
            const mask = document.createElement("div");
            mask.className = "log-collapsible-mask";
            const expandBtn = document.createElement("button");
            expandBtn.className = "log-expand-rest-btn";
            expandBtn.innerHTML =
              '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg> 展开剩余部分';
            expandBtn.onclick = (e) => {
              e.stopPropagation();
              collapsibleWrap.classList.add("expanded");
              mask.remove();
              // 追加折叠按钮（脱离遮罩，固定在内容底部）
              const collapseBtn = document.createElement("button");
              collapseBtn.className = "log-collapse-btn";
              collapseBtn.innerHTML =
                '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"></polyline></svg> 折叠全文';
              collapseBtn.onclick = (ev) => {
                ev.stopPropagation();
                collapseBtn.remove();
                collapsibleWrap.classList.remove("expanded");
                // 恢复遮罩 + 展开按钮
                collapsibleWrap.appendChild(mask);
              };
              collapsibleWrap.appendChild(collapseBtn);
            };
            mask.appendChild(expandBtn);
            collapsibleWrap.appendChild(mask);
          });
        };

        applyCollapseIfNeeded();

        // ── 如果没有 JSON，直接结束，不加按钮 ────────────────────
        if (!hasJson) {
          tr.appendChild(keyTd);
          tr.appendChild(valueTd);
          return tr;
        }

        // ── 左侧 key 列：在 "message" 文字下方追加「格式化 JSON」按钮 ──
        const formatBtn = document.createElement("button");
        formatBtn.className = "log-json-format-btn";
        formatBtn.innerHTML =
          '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg> 格式化 JSON';

        /**
         * 构建完整格式化视图：文本/异常栈直接渲染，JSON 高亮展示
         */
        const buildFormattedView = () => {
          const mixedDiv = document.createElement("div");
          mixedDiv.className = "log-mixed-content";
          let jsonIdx = 0;
          parts.forEach((part) => {
            if (part.type === "text") {
              const textDiv = document.createElement("div");
              textDiv.className = "log-text-content";
              textDiv.textContent = part.content;
              mixedDiv.appendChild(textDiv);
            } else if (part.type === "java-stack") {
              const exceptionWrapper = document.createElement("div");
              const title = document.createElement("div");
              title.className = "java-exception-title";
              title.innerHTML =
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg> Java Exception Stack';
              exceptionWrapper.appendChild(title);
              const exceptionContent = document.createElement("div");
              exceptionContent.className = "java-exception-content";
              exceptionContent.textContent = part.lines.join("\n");
              exceptionWrapper.appendChild(exceptionContent);
              mixedDiv.appendChild(exceptionWrapper);
            } else {
              // JSON 类型：高亮展示
              jsonIdx++;
              const header = document.createElement("div");
              header.className = "log-message-header";
              const label = document.createElement("span");
              label.className = "log-message-label";
              label.innerHTML =
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg> JSON 数据' +
                (jsonParts.length > 1 ? " #" + jsonIdx : "");
              header.appendChild(label);
              // 截断修复标注：提示该 JSON 来自截断日志，末尾残缺成员已被丢弃
              if (part.truncated) {
                const truncBadge = document.createElement("span");
                truncBadge.className = "log-json-truncated-badge";
                truncBadge.textContent = "截断已补全";
                truncBadge.title =
                  "日志被平台截断，已自动补全闭合括号（截断处的残缺成员已丢弃）";
                header.appendChild(truncBadge);
              }
              // JSON 转换按钮组：压缩转义 / 压缩 / 转义 / 去除转义（点击即复制转换结果）
              header.appendChild(createJsonTransformButtons(part.formatted));
              header.appendChild(createCopyButton(part.formatted));
              const jsonContainer = document.createElement("div");
              jsonContainer.className = "log-json-container";

              // 分栏结构：左侧原 JSON（不变），右侧过滤结果（按需出现）
              const splitWrap = document.createElement("div");
              splitWrap.className = "rla-json-split-container";

              // 左：原始 JSON 面板
              const origPane = document.createElement("div");
              origPane.className = "rla-json-pane rla-json-pane-original";
              const origLabel = document.createElement("div");
              origLabel.className = "rla-json-pane-label";
              origLabel.textContent = "原始";
              origPane.appendChild(origLabel);
              const pre = document.createElement("pre");
              pre.className = "log-json-pre";
              // 加 tabindex 使 pre 可聚焦：用户点击 JSON 框后 activeElement 落在此处，
              // setupJsonSearch 据此判定是否拦截 Cmd/Ctrl+F 走容器内搜索。
              pre.setAttribute("tabindex", "0");
              // ── 右侧节点详情面板（JSON-handle 风格，初始隐藏） ──
              const detailPane = document.createElement("div");
              detailPane.className = "rla-json-detail-pane";
              // 初始隐藏：必须用 class（CSS !important 会覆盖内联 display:none，见样式表注释）
              detailPane.classList.add("rla-hidden");

              // 第一行：折叠箭头 + 标题
              const detailHeader = document.createElement("div");
              detailHeader.className = "rla-json-detail-header";
              const detailToggle = document.createElement("span");
              detailToggle.className = "rla-json-detail-toggle";
              detailToggle.innerHTML = "&#9654;"; // ▶
              detailToggle.title = "折叠/展开详情面板";
              const detailTitle = document.createElement("span");
              detailTitle.className = "rla-json-detail-title";
              detailTitle.textContent = "节点详情";
              detailHeader.appendChild(detailToggle);
              detailHeader.appendChild(detailTitle);
              detailPane.appendChild(detailHeader);

              // 第二行：JSONPath 输入框 + 复制按钮
              const detailBody = document.createElement("div");
              detailBody.className = "rla-json-detail-body";
              const pathRow = document.createElement("div");
              pathRow.className = "rla-json-detail-path-row";
              const pathLabel = document.createElement("span");
              pathLabel.className = "rla-json-detail-path-label";
              pathLabel.textContent = "Path:";
              const pathInput = document.createElement("input");
              pathInput.type = "text";
              pathInput.className = "rla-json-detail-path-input";
              pathInput.readOnly = true;
              const pathCopy = document.createElement("span");
              pathCopy.className = "rla-json-detail-path-copy";
              pathCopy.textContent = "复制";
              pathCopy.title = "复制 JSONPath";
              pathRow.appendChild(pathLabel);
              pathRow.appendChild(pathInput);
              pathRow.appendChild(pathCopy);
              detailBody.appendChild(pathRow);

              // 第三行：子 JSON 格式化文本域
              const detailPreWrap = document.createElement("div");
              detailPreWrap.className = "rla-json-detail-pre-wrap";
              const detailPre = document.createElement("pre");
              detailPre.className = "rla-json-detail-pre";
              detailPre.setAttribute("tabindex", "0");
              detailPreWrap.appendChild(detailPre);
              detailBody.appendChild(detailPreWrap);
              detailPane.appendChild(detailBody);

              // 折叠箭头点击：折叠/展开右侧面板
              detailToggle.addEventListener("click", (ev) => {
                ev.stopPropagation();
                detailPane.classList.toggle("collapsed");
                // 收起面板时关闭面板内搜索框并恢复内容
                if (detailPane.classList.contains("collapsed")) {
                  detailPane
                    .querySelectorAll(".rla-json-search-box")
                    .forEach((b) => closeJsonSearchBox(b));
                }
              });

              // 复制 JSONPath
              pathCopy.addEventListener("click", (ev) => {
                ev.stopPropagation();
                copyTextToClipboard(pathInput.value, () => {
                  pathCopy.textContent = "已复制";
                  setTimeout(() => (pathCopy.textContent = "复制"), 1500);
                });
              });

              // 节点选中回调：更新详情面板内容
              const onSelectNode = (jsonPath, subJson, value, parsedData) => {
                // 内容即将被替换：直接移除面板内旧搜索框（无需恢复旧内容）
                detailPane
                  .querySelectorAll(".rla-json-search-box")
                  .forEach((b) => b.remove());
                detailPane.classList.remove("rla-hidden");
                detailPane.classList.remove("collapsed");
                pathInput.value = jsonPath;
                // 记录子 JSON 文本，供详情面板内搜索（Cmd/Ctrl+F）使用
                detailPre.__jsonText = subJson;
                detailPre.innerHTML = colorizeJSON(subJson);
              };

              // 使用 buildJSONTree 构建带折叠功能的语法高亮 DOM
              // （mountJsonTree 同时记录搜索语料与选中回调，供搜索恢复使用）
              mountJsonTree(pre, part.formatted, onSelectNode);
              origPane.appendChild(pre);
              splitWrap.appendChild(origPane);
              splitWrap.appendChild(detailPane);

              jsonContainer.appendChild(splitWrap);
              jsonContainer.__detailPane = detailPane;

              // 缓存解析后的 JS 对象，供过滤表达式使用
              try {
                jsonContainer.__parsedData = JSON.parse(part.formatted);
              } catch {
                jsonContainer.__parsedData = null;
              }

              // 构建过滤输入框
              const filterBar = document.createElement("div");
              filterBar.className = "rla-json-filter-bar";
              const filterInput = document.createElement("input");
              filterInput.type = "text";
              filterInput.className = "rla-json-filter-input";
              filterInput.placeholder =
                'JS过滤，示例 ".key.subkey"  "[0][1]"  ".map(x=>key==\'1\')"';
              filterBar.appendChild(filterInput);
              jsonContainer.appendChild(filterBar);

              // 右：过滤结果面板（初始隐藏）
              let filteredPane = null;

              // 绑定过滤事件
              let filterTimer = null;
              filterInput.addEventListener("input", () => {
                clearTimeout(filterTimer);
                filterTimer = setTimeout(() => {
                  const expr = filterInput.value.trim();
                  if (!expr) {
                    // 清空：右侧面板消失
                    filterInput.classList.remove("error");
                    if (filteredPane) {
                      filteredPane.remove();
                      filteredPane = null;
                    }
                    jsonContainer.__filtered = false;
                    return;
                  }
                  const parsedData = jsonContainer.__parsedData;
                  if (parsedData == null) {
                    filterInput.classList.add("error");
                    setTimeout(
                      () => filterInput.classList.remove("error"),
                      600,
                    );
                    return;
                  }
                  try {
                    // 构造函数：data 为原始解析对象，表达式拼接为 data<expr>
                    const fn = new Function(
                      "data",
                      `"use strict"; return (data)${expr};`,
                    );
                    const result = fn(parsedData);
                    const resultStr = JSON.stringify(result, null, 2);

                    // 右侧面板：首次创建，后续仅更新内容
                    if (!filteredPane) {
                      filteredPane = document.createElement("div");
                      filteredPane.className =
                        "rla-json-pane rla-json-pane-filtered";
                      const filteredLabel = document.createElement("div");
                      filteredLabel.className = "rla-json-pane-label";
                      filteredLabel.textContent = "过滤结果";
                      filteredPane.appendChild(filteredLabel);
                      const filteredPre = document.createElement("pre");
                      filteredPre.className = "log-json-pre";
                      filteredPre.setAttribute("tabindex", "0");
                      filteredPane.appendChild(filteredPre);
                      splitWrap.appendChild(filteredPane);
                    }
                    const fp = filteredPane.querySelector("pre");
                    if (fp) {
                      mountJsonTree(fp, resultStr);
                    }
                    filterInput.classList.remove("error");
                    jsonContainer.__filtered = true;
                  } catch {
                    // 表达式错误：不创建或变更右侧面板，仅闪红提示
                    filterInput.classList.add("error");
                    setTimeout(
                      () => filterInput.classList.remove("error"),
                      600,
                    );
                  }
                }, 250);
              });

              mixedDiv.appendChild(header);
              mixedDiv.appendChild(jsonContainer);
            }
          });
          mixedDiv.appendChild(createCopyButton(value));
          return mixedDiv;
        };

        formatBtn.onclick = (e) => {
          e.stopPropagation();
          const isExpanded = formatBtn.classList.contains("expanded");
          if (isExpanded) {
            // 收起：恢复默认视图（重新应用限高 + 遮罩逻辑）
            applyCollapseIfNeeded();
            formatBtn.classList.remove("expanded");
            formatBtn.innerHTML =
              '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg> 格式化 JSON';
          } else {
            // 展开：右侧整体替换为格式化视图（每次重新构建，确保事件绑定完整）
            // 注意：先把 defaultView 从限高容器中移出（保留引用），
            // 否则 valueTd.innerHTML="" 会把 defaultView 一并删除，
            // 收起时无法恢复。
            if (
              collapsibleWrapRef &&
              defaultView.parentElement === collapsibleWrapRef
            ) {
              collapsibleWrapRef.removeChild(defaultView);
            }
            formattedNode = buildFormattedView();
            valueTd.innerHTML = "";
            valueTd.appendChild(formattedNode);
            formatBtn.classList.add("expanded");
            formatBtn.innerHTML =
              '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"></polyline></svg> 收起 JSON';
          }
        };

        // 按钮挂到左侧 key 列（keyTd 的 textContent 是 "message"，直接 append）
        keyTd.appendChild(formatBtn);
      } else {
        const wrapper = document.createElement("div");
        wrapper.className = "log-value-wrapper";
        const span = document.createElement("span");
        span.className = "log-value-text";
        span.textContent = value;
        wrapper.appendChild(span);
        wrapper.appendChild(createCopyButton(value));
        valueTd.appendChild(wrapper);
      }

      tr.appendChild(keyTd);
      tr.appendChild(valueTd);
      return tr;
    };

    // 防抖包装的渲染调用，避免 MutationObserver 触发过于频繁
    let _renderDebounceTimer = null;
    const debouncedExecuteRender = (delay = 150) => {
      clearTimeout(_renderDebounceTimer);
      _renderDebounceTimer = setTimeout(() => executeRender(), delay);
    };

    // ── 查询历史存储 ──────────────────────────────────────────

    /**
     * 获取当前 Raptor 页面的 topic 名称，用于 localStorage key 隔离。
     * URL 格式：raptor.mws.sankuai.com/log/<topicName>?condition=...
     * 取 pathname 最后一段作为 topic；无法解析时降级为 "default"。
     */
    const getCurrentTopic = () => {
      try {
        const segments = location.pathname.replace(/\/$/, "").split("/");
        return segments[segments.length - 1] || "default";
      } catch {
        return "default";
      }
    };

    const HISTORY_MAX = 50;
    // 每个 topic 单独存，key 格式：raptor_query_history:<topicName>
    const getHistoryKey = () => `raptor_query_history:${getCurrentTopic()}`;

    const loadHistory = () => {
      try {
        return JSON.parse(localStorage.getItem(getHistoryKey()) || "[]");
      } catch {
        return [];
      }
    };

    const saveHistory = (list) => {
      localStorage.setItem(getHistoryKey(), JSON.stringify(list));
    };

    const addHistoryEntry = (condition) => {
      if (!condition || !condition.trim()) return;
      const trimmed = condition.trim();
      const list = loadHistory();
      // 去重：已存在相同语句则先移除旧的，再插入到最前面（更新时间）
      const dedupedList = list.filter((e) => e.condition !== trimmed);
      dedupedList.unshift({
        time: new Date().toISOString(),
        condition: trimmed,
      });
      if (dedupedList.length > HISTORY_MAX) dedupedList.splice(HISTORY_MAX);
      saveHistory(dedupedList);
      renderHistoryList();
    };

    // ── 查询历史面板 UI ───────────────────────────────────────

    const formatTime = (iso) => {
      const d = new Date(iso);
      const pad = (n) => String(n).padStart(2, "0");
      return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    };

    const getMonacoEditor = () => {
      const editorEl = document
        .getElementById("__qiankun_microapp_wrapper_for_raptor_mls_static__")
        ?.querySelector(".log_editor");
      return editorEl?.__vue__?.$data?.monacoEditor ?? null;
    };

    // append=true 时追加到现有内容末尾，否则替换
    const fillCondition = (condition, append = true) => {
      const editor = getMonacoEditor();
      if (!editor) return;
      const model = editor.getModel();
      if (!model) return;
      const current = model.getValue().trim();
      const next =
        append && current ? `${current} AND ${condition}` : condition;
      model.setValue(next);
      editor.focus();
    };

    const renderHistoryList = () => {
      const listEl = document.getElementById("rla-history-list");
      const header = document.getElementById("rla-history-panel-header");
      if (!listEl || !header) return;

      const list = loadHistory();
      const countEl = header.querySelector(".rla-count");
      if (countEl) countEl.textContent = `共 ${list.length} 条`;

      if (list.length === 0) {
        listEl.innerHTML = '<div id="rla-history-empty">暂无查询历史</div>';
        return;
      }

      listEl.innerHTML = "";
      list.forEach((entry) => {
        const item = document.createElement("div");
        item.className = "rla-history-item";
        item.title = entry.condition;

        const timeEl = document.createElement("span");
        timeEl.className = "rla-history-time";
        timeEl.textContent = formatTime(entry.time);

        const condEl = document.createElement("span");
        condEl.className = "rla-history-condition";
        condEl.textContent = entry.condition;

        const fillBtn = document.createElement("button");
        fillBtn.className = "rla-history-fill-btn";
        fillBtn.textContent = "回填";
        fillBtn.onclick = (e) => {
          e.stopPropagation();
          fillCondition(entry.condition);
          toggleHistoryPanel(false);
        };

        item.appendChild(timeEl);
        item.appendChild(condEl);
        item.appendChild(fillBtn);
        item.onclick = () => {
          fillCondition(entry.condition);
          toggleHistoryPanel(false);
        };
        listEl.appendChild(item);
      });
    };

    const toggleHistoryPanel = (forceState) => {
      const panel = document.getElementById("rla-history-panel");
      const fab = document.getElementById("rla-history-fab");
      if (!panel || !fab) return;
      const willOpen =
        forceState !== undefined
          ? forceState
          : !panel.classList.contains("visible");
      if (willOpen) {
        renderHistoryList();
        panel.classList.add("visible");
        fab.classList.add("paused");
      } else {
        panel.classList.remove("visible");
        fab.classList.remove("paused");
      }
    };

    const injectHistoryUI = () => {
      // 悬浮按钮（CD 唱片机风格 SVG）
      const fab = document.createElement("button");
      fab.id = "rla-history-fab";
      fab.title = "查询历史";
      fab.innerHTML = `
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="14" cy="14" r="12" stroke="#94a3b8" stroke-width="1.5"/>
          <circle cx="14" cy="14" r="8"  stroke="#64748b" stroke-width="1"/>
          <circle cx="14" cy="14" r="4"  stroke="#7dd3fc" stroke-width="1"/>
          <circle cx="14" cy="14" r="1.5" fill="#7dd3fc"/>
          <line x1="14" y1="2"  x2="14" y2="5"  stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="14" y1="23" x2="14" y2="26" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="2"  y1="14" x2="5"  y2="14" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="23" y1="14" x2="26" y2="14" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round"/>
        </svg>`;
      // FAB 点击：切换查询历史面板 + 左侧置顶/置底子按钮
      fab.onclick = () => {
        toggleHistoryPanel();
        toggleSubFabs();
      };
      document.body.appendChild(fab);

      // ── FAB 左侧置顶/置底子按钮组 ────────────────────────
      const subGroup = document.createElement("div");
      subGroup.id = "rla-fab-sub-group";

      // 置顶按钮
      const topBtn = document.createElement("button");
      topBtn.className = "rla-fab-sub-btn";
      topBtn.setAttribute("data-tip", "回到顶部");
      topBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e2e8f0" stroke-width="2.5">
          <polyline points="18 15 12 9 6 15"></polyline>
        </svg>`;
      topBtn.onclick = (e) => {
        e.stopPropagation();
        toggleHistoryPanel(false);
        toggleSubFabs();
        scrollPageTo("top");
      };

      // 置底按钮
      const bottomBtn = document.createElement("button");
      bottomBtn.className = "rla-fab-sub-btn";
      bottomBtn.setAttribute("data-tip", "回到底部");
      bottomBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e2e8f0" stroke-width="2.5">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>`;
      bottomBtn.onclick = (e) => {
        e.stopPropagation();
        toggleHistoryPanel(false);
        toggleSubFabs();
        scrollPageTo("bottom");
      };

      subGroup.appendChild(topBtn);
      subGroup.appendChild(bottomBtn);
      document.body.appendChild(subGroup);

      // 悬浮提示（真实 DOM，body 直下，最高层级）
      const tipEl = document.createElement("div");
      tipEl.className = "rla-fab-tip";
      document.body.appendChild(tipEl);

      function showTip(btn) {
        const text = btn.getAttribute("data-tip");
        if (!text) return;
        const rect = btn.getBoundingClientRect();
        tipEl.textContent = text;
        // 先临时显示但透明，测量尺寸后再定位
        tipEl.style.visibility = "hidden";
        tipEl.classList.add("visible");
        const tipW = tipEl.offsetWidth;
        const tipH = tipEl.offsetHeight;
        tipEl.style.visibility = "";
        tipEl.style.left = rect.left - tipW - 8 + "px";
        tipEl.style.top = rect.top + rect.height / 2 - tipH / 2 + "px";
      }
      function hideTip() {
        tipEl.classList.remove("visible");
      }
      topBtn.addEventListener("mouseenter", () => showTip(topBtn));
      topBtn.addEventListener("mouseleave", hideTip);
      bottomBtn.addEventListener("mouseenter", () => showTip(bottomBtn));
      bottomBtn.addEventListener("mouseleave", hideTip);

      let subFabsVisible = false;
      function toggleSubFabs() {
        subFabsVisible = !subFabsVisible;
        if (subFabsVisible) {
          topBtn.classList.add("visible");
          bottomBtn.classList.add("visible");
        } else {
          topBtn.classList.remove("visible");
          bottomBtn.classList.remove("visible");
        }
      }

      // 历史面板
      const panel = document.createElement("div");
      panel.id = "rla-history-panel";
      panel.innerHTML = `
        <div id="rla-history-panel-header">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#334155" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          查询历史
          <span class="rla-count"></span>
          <button class="rla-history-close-btn" title="关闭">×</button>
        </div>
        <div id="rla-quick-bar">
          <span>快捷追加：</span>
          <button class="rla-quick-btn level-info"  data-level="INFO"  data-condition='mt_level:"INFO"'>INFO</button>
          <button class="rla-quick-btn level-warn"  data-level="WARN"  data-condition='mt_level:"WARN"'>WARN</button>
          <button class="rla-quick-btn level-error" data-level="ERROR" data-condition='mt_level:"ERROR"'>ERROR</button>
          <button class="rla-quick-btn level-debug" data-level="DEBUG" data-condition='mt_level:"DEBUG"'>DEBUG</button>
        </div>
        <div id="rla-history-list"></div>`;
      document.body.appendChild(panel);

      // 快捷按钮 toggle：选中追加条件，再点取消并从输入框移除
      panel.querySelectorAll(".rla-quick-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const condition = btn.dataset.condition;
          const isActive = btn.classList.contains("active");
          if (isActive) {
            // 取消选中：从输入框移除该条件（包括前后的 AND 连接）
            btn.classList.remove("active");
            const editor = getMonacoEditor();
            const model = editor?.getModel();
            if (model) {
              let val = model.getValue();
              // 移除 " AND mt_level:\"xxx\"" 或 "mt_level:\"xxx\" AND " 或单独存在的情况
              const escaped = condition.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
              val = val
                .replace(new RegExp(`\\s+AND\\s+${escaped}`, "gi"), "")
                .replace(new RegExp(`${escaped}\\s+AND\\s+`, "gi"), "")
                .replace(new RegExp(`^${escaped}$`, "gi"), "")
                .trim();
              model.setValue(val);
              editor.focus();
            }
          } else {
            // 选中：同一组里其他按钮先取消（mt_level 互斥，同时只能选一个）
            panel.querySelectorAll(".rla-quick-btn").forEach((b) => {
              if (b !== btn && b.classList.contains("active")) {
                b.dispatchEvent(new MouseEvent("click", { bubbles: false }));
              }
            });
            btn.classList.add("active");
            fillCondition(condition, true);
          }
        });
      });

      // 关闭按钮
      panel
        .querySelector(".rla-history-close-btn")
        .addEventListener("click", (e) => {
          e.stopPropagation();
          toggleHistoryPanel(false);
          if (subFabsVisible) toggleSubFabs();
        });

      // 点击面板外部收起
      document.addEventListener(
        "click",
        (e) => {
          const panel = document.getElementById("rla-history-panel");
          const fab = document.getElementById("rla-history-fab");
          const subGroup = document.getElementById("rla-fab-sub-group");
          const clickedOnSub = subGroup && subGroup.contains(e.target);
          if (
            panel &&
            panel.classList.contains("visible") &&
            !panel.contains(e.target) &&
            e.target !== fab &&
            !fab.contains(e.target) &&
            !clickedOnSub
          ) {
            toggleHistoryPanel(false);
            if (subFabsVisible) toggleSubFabs();
          }
        },
        true,
      );

      // ── JSON 格式化区域搜索功能 ──────────────────────────────
      setupJsonSearch();
    };

    // ── JSON 格式化区域搜索功能 ─────────────────────────────────
    /**
     * 记录用户最后一次点击落点所属的 JSON 搜索区域（左侧格式化区 / 右侧节点详情区）。
     * 不用 document.activeElement：点击非聚焦元素（普通 div）时 activeElement
     * 不会改变，仍停留在之前的搜索框 input 上，导致误判"焦点在 JSON 容器内"。
     * 改用 mousedown 捕获追踪真实点击位置：
     *   - 点击落在 .rla-json-detail-pane 内 → 记详情面板的 pre（搜索子 JSON）
     *   - 点击落在 .log-json-pre 上        → 记该 pre（搜索对应格式化 JSON）
     *   - 点击在搜索框自身上               → 保持关联的 pre（避免 Cmd+F 误放行）
     *   - 其余位置                         → 置 null，Cmd/Ctrl+F 走浏览器原生搜索
     */
    let _lastClickedJsonSearchPre = null;
    document.addEventListener(
      "mousedown",
      (e) => {
        const t = e.target;
        let pre = null;
        if (t && t.closest) {
          const searchBox = t.closest(".rla-json-search-box");
          if (searchBox && searchBox.__searchPre) {
            pre = searchBox.__searchPre;
          } else {
            const detailPane = t.closest(".rla-json-detail-pane");
            if (detailPane) {
              pre = detailPane.querySelector(".rla-json-detail-pre");
            }
            if (!pre) pre = t.closest(".log-json-pre");
          }
        }
        _lastClickedJsonSearchPre = pre;
      },
      true,
    );

    /**
     * 设置全局键盘监听：
     *   - 最后一次点击落在左侧格式化区（.log-json-pre）或右侧节点详情面板
     *     （.rla-json-detail-pre）内且仍可见时，拦截 Cmd/Ctrl+F 弹出对应
     *     区域的容器内搜索框；
     *   - 否则放行，让浏览器原生搜索正常工作。
     */
    const setupJsonSearch = () => {
      document.addEventListener(
        "keydown",
        (e) => {
          // Ctrl+F 或 Cmd+F
          if ((e.ctrlKey || e.metaKey) && e.key === "f") {
            let targetPre = null;
            const lastPre = _lastClickedJsonSearchPre;
            if (lastPre && document.body.contains(lastPre)) {
              // 进一步确认该 pre 仍可见（未随日志行被替换 / 面板未被隐藏）
              const rect = lastPre.getBoundingClientRect();
              const visible = rect && rect.width > 0 && rect.height > 0;
              targetPre = visible ? lastPre : null;
            }
            if (targetPre && typeof targetPre.__jsonText === "string") {
              e.preventDefault();
              e.stopPropagation();
              showJsonSearchBox(targetPre);
            }
            // 点击不在 JSON 区域内：不拦截，放行给浏览器原生搜索
          }
          // Escape 关闭搜索框
          if (e.key === "Escape") {
            hideAllJsonSearchBoxes();
          }
        },
        true,
      );
    };

    /**
     * 检测元素是否在视口内可见
     */
    const isElementInViewport = (el) => {
      const rect = el.getBoundingClientRect();
      return (
        rect.top < window.innerHeight &&
        rect.bottom > 0 &&
        rect.left < window.innerWidth &&
        rect.right > 0 &&
        rect.height > 0
      );
    };

    /**
     * 显示 JSON 搜索框（左侧格式化区 / 右侧节点详情面板通用）
     *
     * @param {HTMLPreElement} pre 搜索目标：
     *   - 左侧 .log-json-pre：内容为 buildJSONTree 树，__jsonText 为搜索语料，
     *     恢复时用 mountJsonTree 重建并回传 __onSelectNode，保证详情面板不失效
     *   - 右侧 .rla-json-detail-pre：内容为 colorizeJSON 高亮的子 JSON，
     *     恢复时直接 colorizeJSON(__jsonText)
     */
    const showJsonSearchBox = (pre) => {
      // 搜索语料：挂载时由 mountJsonTree / onSelectNode 记录在 pre.__jsonText
      const plainText = pre.__jsonText;
      if (typeof plainText !== "string") return;

      const isDetail = pre.classList.contains("rla-json-detail-pre");
      // 锚点：搜索框落在各自区域内 ——
      //   右侧详情面板 → 面板自身；左侧 → 所在 pane（避免落在容器右上角被右侧面板遮挡）
      const anchor = isDetail
        ? pre.closest(".rla-json-detail-pane")
        : pre.closest(".rla-json-pane") || pre.closest(".log-json-container");
      if (!anchor) return;

      // 恢复函数：清空关键词 / 关闭搜索框时重建原始内容
      const restoreContent = () => {
        if (isDetail) {
          pre.innerHTML = colorizeJSON(plainText);
        } else {
          mountJsonTree(pre, plainText, pre.__onSelectNode);
        }
      };

      // 如果该 pre 已有搜索框，直接 focus
      const existing = Array.from(
        anchor.querySelectorAll(".rla-json-search-box"),
      ).find((b) => b.__searchPre === pre);
      if (existing) {
        const input = existing.querySelector(".rla-json-search-input");
        input.focus();
        input.select();
        return;
      }
      // 关闭其他区域的 JSON 搜索框（左右两个搜索框互斥，避免互相遮挡），
      // 关闭时正常恢复各自 pre 的内容
      document
        .querySelectorAll(".rla-json-search-box")
        .forEach((b) => {
          if (b.__searchPre !== pre) closeJsonSearchBox(b);
        });

      const searchBox = document.createElement("div");
      searchBox.className = "rla-json-search-box";
      searchBox.innerHTML = `
        <input type="text" class="rla-json-search-input" placeholder="搜索..." />
        <span class="rla-json-search-count"></span>
        <span class="rla-json-search-close">×</span>
      `;

      searchBox.__searchPre = pre;
      searchBox.__restore = restoreContent;
      anchor.style.position = "relative";
      anchor.appendChild(searchBox);

      const input = searchBox.querySelector(".rla-json-search-input");
      const countEl = searchBox.querySelector(".rla-json-search-count");
      const closeBtn = searchBox.querySelector(".rla-json-search-close");
      let currentHighlightIdx = -1;
      let matchCount = 0;

      input.focus();

      // 更新命中计数显示：当前第几处 / 共几处；无关键词时清空
      const updateCount = () => {
        if (!input.value.trim()) {
          countEl.textContent = "";
          countEl.classList.remove("has-match");
          return;
        }
        countEl.textContent = `${matchCount > 0 ? currentHighlightIdx + 1 : 0}/${matchCount}`;
        countEl.classList.toggle("has-match", matchCount > 0);
      };

      const performSearch = () => {
        const keyword = input.value.trim();

        if (!keyword) {
          currentHighlightIdx = -1;
          matchCount = 0;
          updateCount();
          // 恢复原始内容（左侧为带折叠/选中的 JSON 树，右侧为高亮子 JSON）
          restoreContent();
          return;
        }

        // 在纯文本中搜索（大小写不敏感）
        const lowerText = plainText.toLowerCase();
        const lowerKeyword = keyword.toLowerCase();
        const positions = [];
        let pos = 0;
        while ((pos = lowerText.indexOf(lowerKeyword, pos)) !== -1) {
          positions.push(pos);
          pos += keyword.length;
        }

        matchCount = positions.length;

        if (matchCount === 0) {
          // 未匹配：闪红抖动
          searchBox.classList.remove("shake");
          void searchBox.offsetWidth; // 触发 reflow
          searchBox.classList.add("shake");
          // 恢复原始内容
          restoreContent();
          pre.scrollTop = 0;
          currentHighlightIdx = -1;
        } else {
          // 高亮所有匹配，第一个为 active
          highlightMatches(pre, plainText, positions, keyword.length, 0);
          currentHighlightIdx = 0;
          // 滚动到第一个匹配
          scrollToHighlight(pre, 0);
        }
        updateCount();
      };

      let debounceTimer = null;
      input.addEventListener("input", () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(performSearch, 150);
      });

      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          // Enter 跳到下一个匹配
          e.preventDefault();
          const keyword = input.value.trim();
          if (!keyword) return;
          const lowerText = plainText.toLowerCase();
          const lowerKeyword = keyword.toLowerCase();
          const positions = [];
          let pos = 0;
          while ((pos = lowerText.indexOf(lowerKeyword, pos)) !== -1) {
            positions.push(pos);
            pos += keyword.length;
          }
          if (positions.length > 0) {
            currentHighlightIdx = (currentHighlightIdx + 1) % positions.length;
            highlightMatches(
              pre,
              plainText,
              positions,
              keyword.length,
              currentHighlightIdx,
            );
            scrollToHighlight(pre, currentHighlightIdx);
            matchCount = positions.length;
            updateCount();
          }
        }
        if (e.key === "Escape") {
          closeJsonSearchBox(searchBox);
        }
      });

      closeBtn.addEventListener("click", () => {
        closeJsonSearchBox(searchBox);
      });
    };

    /**
     * 关闭单个 JSON 搜索框：移除搜索框并恢复 pre 原始内容
     * （左侧恢复为带折叠/选中的 JSON 树，右侧恢复为高亮子 JSON）
     */
    const closeJsonSearchBox = (searchBox) => {
      if (!searchBox || !searchBox.isConnected) return;
      if (typeof searchBox.__restore === "function") {
        searchBox.__restore();
      }
      searchBox.remove();
    };

    /**
     * 关闭所有 JSON 搜索框（Escape 全局快捷键）
     */
    const hideAllJsonSearchBoxes = () => {
      document
        .querySelectorAll(".rla-json-search-box")
        .forEach((box) => closeJsonSearchBox(box));
    };

    /**
     * 高亮匹配内容 - 直接重新构建 innerHTML
     * 将纯文本按搜索位置分段，匹配段包裹高亮 span，非匹配段走 colorizeJSON 保持语法着色
     */
    const highlightMatches = (
      pre,
      plainText,
      positions,
      keywordLength,
      activeIdx,
    ) => {
      if (!positions || positions.length === 0) return;

      // 按位置排序
      const sorted = [...positions].sort((a, b) => a - b);

      // 分段：0~pos[0], pos[0]~pos[0]+len, pos[0]+len~pos[1], ...
      const segments = [];
      let cursor = 0;
      sorted.forEach((pos, idx) => {
        if (pos > cursor) {
          // 非匹配段（普通 JSON 文本）
          segments.push({
            text: plainText.substring(cursor, pos),
            highlight: false,
            matchIdx: -1,
          });
        }
        // 匹配段
        segments.push({
          text: plainText.substring(pos, pos + keywordLength),
          highlight: true,
          matchIdx: idx,
        });
        cursor = pos + keywordLength;
      });
      if (cursor < plainText.length) {
        segments.push({
          text: plainText.substring(cursor),
          highlight: false,
          matchIdx: -1,
        });
      }

      // 构建 HTML：非匹配段走 colorizeJSON，匹配段额外套搜索高亮 span
      let html = "";
      for (const seg of segments) {
        if (seg.highlight) {
          const activeClass =
            seg.matchIdx === activeIdx
              ? "rla-json-highlight-active"
              : "rla-json-highlight";
          html += `<span class="${activeClass}">${escapeHtml(seg.text)}</span>`;
        } else {
          html += colorizeJSON(seg.text);
        }
      }
      pre.innerHTML = html;
    };

    /**
     * HTML 转义
     */
    const escapeHtml = (str) =>
      str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    /**
     * 滚动到指定索引的高亮元素
     */
    const scrollToHighlight = (pre, idx) => {
      const highlights = pre.querySelectorAll(
        ".rla-json-highlight, .rla-json-highlight-active",
      );
      if (highlights[idx]) {
        highlights[idx].scrollIntoView({ behavior: "smooth", block: "center" });
      }
    };

    /**
     * 滚动页面到顶部或底部
     * 优先使用 window.scrollTo，若 window 不可滚动则遍历所有可滚动元素
     */
    const scrollPageTo = (position) => {
      const targetTop =
        position === "top"
          ? 0
          : document.documentElement.scrollHeight || document.body.scrollHeight;

      // 尝试 window 滚动
      const scrollableOnWindow =
        document.documentElement.scrollHeight > window.innerHeight ||
        document.body.scrollHeight > window.innerHeight;

      if (scrollableOnWindow) {
        window.scrollTo({ top: targetTop, behavior: "smooth" });
      }

      // 同时遍历所有可滚动元素（微前端架构下可能有独立滚动容器）
      const allElements = document.querySelectorAll("*");
      for (const el of allElements) {
        const overflowY = getComputedStyle(el).overflowY;
        const isScrollable =
          (overflowY === "auto" || overflowY === "scroll") &&
          el.scrollHeight > el.clientHeight + 10;
        if (isScrollable) {
          el.scrollTo({
            top: position === "top" ? 0 : el.scrollHeight,
            behavior: "smooth",
          });
        }
      }
    };

    /**
     * 监听查询触发事件，记录历史并重新渲染。
     *
     * 页面是 qiankun 微前端架构，子应用运行在独立沙箱内，
     * 油猴脚本拦截主 window 的 XHR/fetch 对沙箱内的请求无效。
     * 改为监听两种用户操作：
     *   1. URL 变化（pushState/replaceState/popstate）—— condition 参数随查询写入 URL
     *   2. 查询按钮点击 / 输入框回车 —— 提前记录当前输入框内容
     */
    const interceptNetworkRequests = () => {
      const extractConditionFromPageUrl = () => {
        try {
          return new URLSearchParams(location.search).get("condition") || "";
        } catch {
          return "";
        }
      };

      // 从 Monaco Editor model 读取当前 DSL
      const extractConditionFromInput = () => {
        return getMonacoEditor()?.getModel()?.getValue().trim() ?? "";
      };

      const onQueryTriggered = () => {
        const condition =
          extractConditionFromInput() || extractConditionFromPageUrl();
        if (!condition) return;
        addHistoryEntry(condition);


        // 清理现有日志行的美化状态，防止 Vue 复用节点时旧容器残留导致内容不更新
        document
          .querySelectorAll(".mtd-table-row.search-table-row")
          .forEach((row) => {
            row.__beautified = false;
            // 移除旧的美化容器
            row
              .querySelectorAll(".beautified-log-container")
              .forEach((el) => el.remove());
            // 还原被隐藏的原始内容节点（供 Vue/DOM 继续管理）
            row
              .querySelectorAll("pre.raw_panel, .text_collapse")
              .forEach((el) => {
                el.style.display = "";
              });
          });

        // 600ms 等待数据到达后首次渲染
        debouncedExecuteRender(600);
        // 1500ms 兜底：覆盖网络较慢时数据晚于首次渲染到达的情形
        setTimeout(() => executeRender(), 1500);
        console.log("🔍 检测到查询触发，condition:", condition);
      };

      // ── 方式一：监听 URL 变化（SPA pushState 模式）────────────
      // 查询执行后页面会把 condition 等参数写入 URL
      const _origPushState = history.pushState.bind(history);
      const _origReplaceState = history.replaceState.bind(history);

      history.pushState = function (...args) {
        _origPushState(...args);
        // 新 URL 里有 condition 说明是查询触发
        const newSearch =
          typeof args[2] === "string"
            ? new URL(args[2], location.origin).search
            : "";
        if (newSearch.includes("condition=")) {
          setTimeout(onQueryTriggered, 0);
        }
      };

      history.replaceState = function (...args) {
        _origReplaceState(...args);
        const newSearch =
          typeof args[2] === "string"
            ? new URL(args[2], location.origin).search
            : "";
        if (newSearch.includes("condition=")) {
          setTimeout(onQueryTriggered, 0);
        }
      };

      window.addEventListener("popstate", () => {
        if (location.search.includes("condition=")) {
          onQueryTriggered();
        }
      });

      // ── 方式二：监听查询按钮点击 + 输入框回车 ────────────────
      // 用事件委托挂在 document 上，避免 Vue 重新渲染后元素引用失效
      document.addEventListener(
        "click",
        (e) => {
          // 查询按钮：.mtd-btn-primary 且文字含"查询"
          const btn = e.target.closest(".mtd-btn-primary");
          if (btn && btn.textContent.includes("查询")) {
            onQueryTriggered();
          }
        },
        true,
      );

      document.addEventListener(
        "keydown",
        (e) => {
          if (e.key !== "Enter") return;
          // 仅在输入框内回车触发
          const inInput =
            e.target.closest(".input-content") ||
            e.target.closest(".lc_search_input") ||
            e.target.closest(".log_editor");
          if (inInput) {
            onQueryTriggered();
          }
        },
        true,
      );

      console.log("✅ 查询监听已启动（URL变化 + 按钮点击 + 回车）");
    };

    /**
     * 读取某一行日志的当前展示模式。
     * 注意：Raptor 的 原始/json/kv 选项卡是【每行独立】的，位于
     * .original-log-column > .log-actions > .mtd-radio-group 内；
     * radio input 没有 name 和 checked 状态（display:none 仅作占位），
     * 选中态完全由 Vue 通过 mtd-radio-button-checked class 维护，
     * 因此只能读这个 class。找不到时默认按「原始」处理。
     * @param {Element} row - .mtd-table-row.search-table-row 行元素
     * @returns {string} "原始" | "json" | "kv"
     */
    const getRowMode = (row) => {
      const checked = row.querySelector(
        ".log-actions .mtd-radio-button-checked .mtd-radio-button-inner",
      );
      return checked?.textContent.trim() || "原始";
    };

    // 逐行渲染：每行根据自己的选项卡模式决定美化还是还原。
    // 逐行 try-catch：单行解析失败（DOM 时序/异常内容）只跳过该行，
    // 不中断其余行的渲染；置回 __beautified=false 允许下轮重试。
    const executeRender = () => {
      document
        .querySelectorAll(".mtd-table-row.search-table-row")
        .forEach((row) => {
          try {
            const mode = getRowMode(row);
            if (mode === "原始") {
              beautifyLogRow(row);
            } else {
              restoreLogRow(row);
            }
          } catch (err) {
            row.__beautified = false;
            console.warn("[Raptor 助手] 单行渲染失败，已跳过：", err);
          }
        });
    };

    // main 各子步骤独立 try-catch：任一步失败（如历史面板的 monaco
    // 依赖未就绪抛异常）不再中断后续 executeRender / startObserving，
    // 修复「只有右下角悬浮按钮、日志不渲染」的问题。
    const main = () => {
      try {
        injectHistoryUI();
      } catch (err) {
        console.warn("[Raptor 助手] 查询历史面板初始化失败（不影响日志美化）：", err);
      }
      try {
        executeRender();
      } catch (err) {
        console.warn("[Raptor 助手] 初始渲染失败：", err);
      }
      try {
        startObserving();
      } catch (err) {
        console.warn("[Raptor 助手] DOM 观察启动失败：", err);
      }

      // tab 切换监听（事件委托，挂在 document 上）：
      // 原始/json/kv 选项卡在每行的 .log-actions 内，由 Vue 重渲染管理，
      // 直接给 radio input 挂监听会随重渲染丢失；MutationObserver 只认
      // "新增日志行"，tab 原地 patch 也触发不到。因此用委托点击监听，
      // 等 Vue 应用完 DOM 更新（50ms）后按每行当前模式重新渲染。
      document.addEventListener(
        "click",
        (e) => {
          const btn = e.target.closest(".log-actions .mtd-radio-button");
          if (!btn) return;
          setTimeout(() => executeRender(), 50);
        },
        true,
      );
    };

    //渲染原始日志（遍历所有行，逐行美化）
    const renderRaw = () => {
      document
        .querySelectorAll(".mtd-table-row.search-table-row")
        .forEach((row) => beautifyLogRow(row));
    };

    /**
     * 美化单行日志（仅该行处于「原始」模式时调用）
     * @param {Element} logRow - .mtd-table-row.search-table-row 行元素
     */
    const beautifyLogRow = (logRow) => {
      {
        // 判断是否已经美化过，避免重复美化
        if (logRow.__beautified) return;
        logRow.__beautified = true;

        // 获取有日志的那一列
        const logCell = logRow.querySelector(".original-log-column");
        if (!logCell) return;

        // 清除上一次的美化容器，让 pre.raw_panel 重新可见，确保读到最新数据
        // 注意：traceId__ 等 native 节点在上次渲染时被移入了美化容器，
        // 删除容器前需先把它们移回 pre.raw_panel，避免原始节点被一并删除。
        const oldContainers = logCell.querySelectorAll(
          ".beautified-log-container",
        );
        if (oldContainers.length > 0) {
          oldContainers.forEach((container) => {
            // 把容器内所有 .lc_log_value 子节点（native 节点）移回 pre.raw_panel
            const pre = logCell.querySelector("pre.raw_panel");
            const nativeSpans = container.querySelectorAll(".lc_log_value");
            nativeSpans.forEach((ns) => {
              // 找到对应的 key 节点 b.lc_log_key，把 value 节点放回 key 后面
              const keyEl = ns.previousElementSibling; // 不准确，直接找父级
              // 简化：直接 append 到 pre，Vue 会自动 patch 回正确位置
              if (pre) pre.appendChild(ns);
            });
            container.remove();
          });
        }

        // 提取日志对象数据
        const { data: logData, nativeNodes } = extractLogObjDataByRaw(logRow);
        if (Object.keys(logData).length === 0) return;

        const container = document.createElement("div");
        container.className = "beautified-log-container";

        const table = document.createElement("table");
        table.className = "log-field-table";
        const rows = [];

        // 判断是否为 ERROR 级别日志
        const isErrorLevel =
          (logData["mt_level"] || "").toUpperCase() === "ERROR";
        if (isErrorLevel) container.classList.add("error-log");

        const orderedImportantFields = buildOrderedImportantFields();
        const importantSet = new Set(orderedImportantFields);

        orderedImportantFields.forEach((key) => {
          if (logData[key]) {
            const tr = createFieldRow(
              key,
              logData[key],
              true,
              nativeNodes[key],
            );
            // message 行 + ERROR 级别：加红色样式
            if (key === "message" && isErrorLevel) {
              tr.classList.add("error-level");
            }
            table.appendChild(tr);
            rows.push(tr);
          }
        });

        Object.entries(logData).forEach(([key, value]) => {
          if (!importantSet.has(key)) {
            const tr = createFieldRow(key, value, false, nativeNodes[key]);
            table.appendChild(tr);
            rows.push(tr);
          }
        });

        container.appendChild(table);

        const expandBtn = document.createElement("button");
        expandBtn.className = "log-expand-btn";
        expandBtn.innerHTML =
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg><span>展开其他字段</span>';
        expandBtn.onclick = () => {
          const isExpanded = expandBtn.dataset.expanded === "true";
          rows.forEach((row) => {
            if (!row.classList.contains("important")) {
              row.classList.toggle("collapsed");
              row.classList.toggle("expanded");
            }
          });
          expandBtn.dataset.expanded = !isExpanded;
          expandBtn.innerHTML = isExpanded
            ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg><span>展开其他字段</span>'
            : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"></polyline></svg><span>折叠其他字段</span>';
        };

        container.appendChild(expandBtn);
        // 隐藏原始 pre.raw_panel（保留节点供 Vue 继续管理），插入美化容器
        logCell
          .querySelectorAll("pre.raw_panel, .text_collapse")
          .forEach((el) => {
            el.style.display = "none";
          });
        // 移除旧的美化容器（如果有），再插入新的
        logCell
          .querySelectorAll(".beautified-log-container")
          .forEach((el) => el.remove());
        logCell.appendChild(container);
      }
    };

    /**
     * 清理 HTML 内容，移除 hl-search 高亮标签
     * @param {string} html - 原始 HTML 字符串
     * @returns {string} 清理后的 HTML 字符串
     */
    const cleanHighlightTags = (html) => {
      return html
        .replace(/<span\s+class="hl-search"[^>]*>/gi, "")
        .replace(/<\/span>/gi, "");
    };

    // 提取日志对象数据
    // 需要保留原生 DOM 节点（含 popover/click 行为）的字段
    const NATIVE_NODE_FIELDS = ["traceId__"];

    // extractLogObjDataByRaw 返回 { data: {key: string}, nativeNodes: {key: Element} }
    const extractLogObjDataByRaw = (searchTableRow) => {
      const logData = {};
      const nativeNodes = {};
      [...searchTableRow.querySelectorAll("pre.raw_panel")].forEach(
        (preElement) => {
          if (!preElement) return;
          const keyElements = preElement.querySelectorAll("b.lc_log_key");
          keyElements.forEach((keyEl) => {
            const key = keyEl.textContent.trim();
            const valueSpan = keyEl.nextElementSibling;
            if (!valueSpan || !valueSpan.classList.contains("lc_log_value"))
              return;

            if (NATIVE_NODE_FIELDS.includes(key)) {
              // 直接引用原始节点（不克隆），保留 Vue 绑定的 popover/click 事件。
              // 渲染时该节点会被移入美化容器，renderRaw 清理时会先移回 pre.raw_panel，
              // 避免 remove 美化容器时删掉原始节点。
              nativeNodes[key] = valueSpan;
              // 同时存文本值供复制按钮使用
              logData[key] = valueSpan.textContent.trim();
            } else if (key === "message" || key === "message1") {
              // message / message1：直接用 textContent，自动去掉所有 HTML 标签（含搜索高亮 span）
              // 和 HTML 实体，拿到真实纯文本（含 \n 换行），parseMixedContent 逐行解析不受 HTML 干扰。
              logData[key] = valueSpan.textContent;
            } else {
              // 其他字段默认 trim；但若值含异常栈特征（XxxException + at 堆栈行），
              // 用 textContent 保留换行，避免 trim 破坏多行异常栈结构影响 parseMixedContent。
              const raw = valueSpan.textContent;
              const hasExcDecl =
                /(?:[A-Z][a-zA-Z0-9]*(?:Exception|Error)|Throwable)/.test(raw);
              const hasStackFrame =
                /\bat\s+[a-z][a-zA-Z0-9_$]*\.[a-zA-Z0-9_$./]*\(/.test(raw);
              logData[key] = hasExcDecl && hasStackFrame ? raw : raw.trim();
            }
          });
        },
      );
      return { data: logData, nativeNodes };
    };

    /**
     * 恢复单行日志的 Raptor 原生视图（json / kv 模式）。
     * 美化只在「原始」模式生效；切到 json/kv 时需要还原现场：
     *   1. 把移入美化容器的原生节点（traceId__ 等，含 Vue popover/click 事件）放回 pre.raw_panel
     *      （json/kv 模式下 Vue 可能已不再渲染 pre.raw_panel，此时跳过即可）；
     *   2. 删除美化容器；
     *   3. 恢复被隐藏的 pre.raw_panel / .text_collapse 的显示（kv 面板在 .text_collapse 内）；
     *   4. 重置 __beautified 标记，切回「原始」模式时可重新美化。
     * @param {Element} row - .mtd-table-row.search-table-row 行元素
     */
    const restoreLogRow = (row) => {
      row.__beautified = false;
      const logCell = row.querySelector(".original-log-column");
      if (!logCell) return;
      const pre = logCell.querySelector("pre.raw_panel");
      logCell
        .querySelectorAll(".beautified-log-container")
        .forEach((container) => {
          // 原生节点先移回 pre.raw_panel，避免随容器一起被删除
          if (pre) {
            container
              .querySelectorAll(".lc_log_value")
              .forEach((ns) => pre.appendChild(ns));
          }
          container.remove();
        });
      // 恢复被美化时隐藏的原始内容
      logCell
        .querySelectorAll("pre.raw_panel, .text_collapse")
        .forEach((el) => {
          el.style.display = "";
        });
    };

    // 恢复所有行的原生视图
    const restoreOriginalView = () => {
      document
        .querySelectorAll(".mtd-table-row.search-table-row")
        .forEach((row) => restoreLogRow(row));
    };

    //渲染JSON日志：恢复 Raptor 原生 json 样式（本脚本只在「原始」模式美化）
    const renderJson = () => {
      restoreOriginalView();
    };

    // 渲染KV日志：恢复 Raptor 原生 kv 格式（本脚本只在「原始」模式美化）
    const renderKv = () => {
      restoreOriginalView();
    };

    // 防抖函数：避免频繁触发渲染
    const debounce = (fn, delay) => {
      let timerId = null;
      return (...args) => {
        clearTimeout(timerId);
        timerId = setTimeout(() => fn(...args), delay);
      };
    };

    // 获取日志表格容器（尝试多个可能的选择器）
    const getLogContainer = () => {
      return (
        document.querySelector(".mtd-table-body") ||
        document.querySelector(".log-table-body") ||
        document.querySelector(".ant-table-tbody") ||
        document.querySelector(".el-table__body-wrapper") ||
        document.querySelector(".search-table-body") ||
        document.querySelector(".mtd-table") ||
        document.querySelector(".log-content") ||
        document.querySelector(".table-container") ||
        document.body // 回退到 body
      );
    };

    // 监听 DOM 变化，当新增日志行时自动执行对应模式的渲染
    const mutationObserver = new MutationObserver((mutations) => {
      // 快速检查是否有日志行被添加
      const hasNewLogs = mutations.some((m) => {
        // 只检查新增节点
        if (m.type !== "childList" || !m.addedNodes.length) return false;

        // 检查新增的节点中是否包含日志行
        return Array.from(m.addedNodes).some(
          (n) =>
            n.nodeType === 1 &&
            (n.classList?.contains("mtd-table-row") ||
              n.classList?.contains("search-table-row") ||
              n.querySelector?.(".mtd-table-row") ||
              n.querySelector?.(".search-table-row")),
        );
      });

      // 检测 loading 状态消失（加载完成），此时数据已渲染完毕
      const hasLoadingFinished = mutations.some((m) => {
        if (m.type !== "attributes" || m.attributeName !== "class")
          return false;
        const oldValue = m.oldValue || "";
        const target = m.target;
        // loading class 从有到无，说明加载刚完成
        const wasLoading =
          oldValue.includes("mtd-table-loading") ||
          oldValue.includes("is-loading");
        const isLoading =
          target.classList?.contains("mtd-table-loading") ||
          target.classList?.contains("is-loading");
        return wasLoading && !isLoading;
      });

      // 兜底：只要 childList 有任何新增节点（即便中间包裹层不命中上面的精确匹配），
      // 且容器内当前确实存在尚未美化的日志行，就触发渲染。
      // Vue 表格渲染日志行时，addedNodes 常是中间包裹层（不含 mtd-table-row class，
      // 且渲染时序内 querySelector 可能也找不到），导致 hasNewLogs 误判为 false。
      // beautifyLogRow 内部有 __beautified 幂等保护，重复触发无副作用。
      const hasAnyChildListAdd = mutations.some(
        (m) => m.type === "childList" && m.addedNodes.length > 0,
      );
      const hasPendingBeautify = (() => {
        if (!hasAnyChildListAdd && !hasLoadingFinished) return false;
        const rows = document.querySelectorAll(
          ".mtd-table-row.search-table-row",
        );
        for (const r of rows) {
          if (!r.__beautified) return true;
        }
        return false;
      })();

      if (hasNewLogs) {
        // 新增日志行，稍作延迟等 DOM 稳定
        debouncedExecuteRender(100);
      } else if (hasLoadingFinished || hasPendingBeautify) {
        // loading 结束后稍等，确保 DOM 完全渲染；
        // 或存在未美化行（兜底路径），触发一次渲染
        debouncedExecuteRender(300);
      }
    });

    // 启动观察（带重试机制，等待容器出现后再精确观察）
    const startObserving = () => {
      const tryObserve = (retries = 30) => {
        const container = getLogContainer();

        if (container && container !== document.body) {
          // 容器没变化，不重复 observe
          if (_observedContainer === container) return;

          // 停止之前的观察
          mutationObserver.disconnect();
          _observedContainer = container;

          mutationObserver.observe(container, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["class"],
            attributeOldValue: true, // 需要 oldValue 来检测 loading class 变化方向
          });
          console.log(
            "🔍 MutationObserver 已启动，观察范围:",
            container.tagName,
            container.className,
          );
          // 容器出现时日志数据可能已渲染（Observer 启动前的存量行不会触发"新增"事件），
          // 立即做一次初始渲染兜底；beautifyLogRow 有 __beautified 幂等，重复调用无副作用。
          debouncedExecuteRender(100);
        } else if (retries > 0) {
          // 容器还未渲染，等待后重试（500ms × 30 次 = 最多 15s，覆盖慢加载）
          setTimeout(() => tryObserve(retries - 1), 500);
          console.log(`🔍 等待日志容器出现，剩余重试次数: ${retries}`);
        } else {
          // 重试耗尽，回退到 body
          mutationObserver.disconnect();
          _observedContainer = document.body;
          mutationObserver.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["class"],
            attributeOldValue: true,
          });
          console.log(
            "🔍 MutationObserver 已启动（回退），观察范围: document.body",
          );
        }
      };

      tryObserve();
    };

    // 立即拦截网络请求，不需要等 DOM 就绪
    // 这样即使用户在页面完全加载前就点击查询，也能捕获到
    interceptNetworkRequests();

    // 慢加载兑底：Tabbit document-end 注入时 Vue 表格可能尚未渲染完，
    // main() 那一次 executeRender 可能一行都看不到。追加 2s / 5s 两次
    // 兑底渲染（幂等，已美化的行直接跳过）。
    const scheduleRenderFallback = () => {
      [2000, 5000].forEach((delay) => {
        setTimeout(() => {
          try {
            executeRender();
          } catch (err) {
            console.warn(`[Raptor 助手] ${delay / 1000}s 兑底渲染失败：`, err);
          }
        }, delay);
      });
    };

    // 文档加载中时增加解析完成监听事件
    if (document.readyState === "loading") {
      // DOM 尚未加载完，等待 DOMContentLoaded 后再延迟启动（给 Vue/SPA 时间初始化）
      document.addEventListener("DOMContentLoaded", () => {
        setTimeout(() => {
          console.log("✅ Raptor 日志美化脚本已启动（DOMContentLoaded 路径）");
          main();
          scheduleRenderFallback();
        }, 800);
      });
    } else {
      // 页面已加载（SPA 路由切换或脚本延迟注入场景），直接延迟启动
      setTimeout(() => {
        console.log("✅ Raptor 日志美化脚本已启动（document-end 路径）");
        main();
        scheduleRenderFallback();
      }, 800);
    }
  } // end initRaptorLogModule

  // ── 启动入口（SPA 路由感知）────────────────────────────────
  // Tabbit 只在 document load 时按 URL 匹配注入脚本，而 Raptor 是 qiankun SPA：
  // 用户常从首页/其他入口经站内路由（pushState）跳到 /log/xxx，全程没有新的
  // document load，旧的 @match /log/* 永远命中不了 → 脚本根本不会被注入，
  // 必须整页刷新才生效。因此 @match 放宽到整个域名，这里再判断是否日志页，
  // 并劫持路由 API，在 SPA 跳转到 /log 时补启动。
  const isLogPage = () => {
    // lion（LogCenter）保持旧版全站行为；raptor 只在 /log 路径下启动
    if (location.hostname.startsWith("lion.")) return true;
    return /^\/log(\/|$)/.test(location.pathname);
  };

  let booted = false;
  const bootWhenLogPage = () => {
    if (booted || !isLogPage()) return;
    booted = true;
    console.log(
      "%c【Raptor 助手】命中 /log 路由，开始初始化",
      "color:#10b981;font-weight:bold;",
    );
    initRaptorLogModule();
  };

  // 首次执行：如果当前已经在 /log 页（整页刷新/直接打开的场景），立即启动
  bootWhenLogPage();

  // SPA 路由兜底一：劫持 pushState / replaceState + popstate，
  // 站内路由跳转到 /log 时补启动
  const _origPushState = history.pushState.bind(history);
  const _origReplaceState = history.replaceState.bind(history);
  history.pushState = function (...args) {
    const result = _origPushState(...args);
    setTimeout(bootWhenLogPage, 0);
    return result;
  };
  history.replaceState = function (...args) {
    const result = _origReplaceState(...args);
    setTimeout(bootWhenLogPage, 0);
    return result;
  };
  window.addEventListener("popstate", bootWhenLogPage);

  // SPA 路由兜底二：qiankun 子应用可能持有 history 的原始方法引用，
  // 绕过上面的劫持；用轻量轮询（500ms × 60 次 = 30s，启动后自动停止）保证
  // 进入 /log 后一定能启动
  let pollCount = 0;
  const pollTimer = setInterval(() => {
    if (booted || ++pollCount > 60) {
      clearInterval(pollTimer);
      return;
    }
    bootWhenLogPage();
  }, 500);
})();
