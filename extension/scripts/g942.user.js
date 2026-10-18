(function () {
'use strict';
const GLOBAL_KEY = '__REPOLENS_INSTALLED__';
if (window[GLOBAL_KEY]) { console.log('[RepoLens] 已安装，跳过。'); return; }
window[GLOBAL_KEY] = true;

/**
 * llm.js — Tabbit 内置 AI 调用封装（LLMBridge）
 *
 * 基于官方《LLMBridge 对话指南》（llm-bridge-chat-guidance）：
 *
 *   LLMBridge.chat(prompt)                       // 文本推理
 *   LLMBridge.chat(prompt, "json")               // JSON 结构化输出
 *   LLMBridge.chat(prompt, { response_format })  // 对象写法
 *   LLMBridge.chat(prompt, { images: [...] })    // 图片理解
 *   LLMBridge.chat(prompt, { videos: [...] })    // 视频理解
 *   LLMBridge.chat(prompt, { audios: [...] })    // 音频理解
 *
 * 约定：
 *   - prompt 为单个字符串（合并 system + user，而非 messages 数组）
 *   - 返回 Promise<string>
 *   - 不支持流式（一次性返回完整文本）
 *   - 遵守限流：合并请求，避免在循环中调用
 */

// ---------------------------------------------------------------------------
// Bridge 获取
// ---------------------------------------------------------------------------

/**
 * 获取可用的 LLMBridge 调用入口。
 * 优先官方全局对象 LLMBridge；测试环境兜底 window.__TABBIT_LLM__。
 */
function getBridge() {
  if (typeof LLMBridge === 'object' && typeof LLMBridge.chat === 'function') {
    return LLMBridge.chat.bind(LLMBridge);
  }
  // 测试 mock 兜底：兼容旧的 messages 数组形态
  const mock = window.__TABBIT_LLM__?.llm?.chat;
  if (typeof mock === 'function') {
    return async (prompt, options) => {
      const messages = [
        { role: 'user', content: prompt },
      ];
      return await mock({ messages, ...(options || {}) });
    };
  }
  return null;
}

let cachedBridge;
let cachedBridgeResolved = false;

function resolveBridge() {
  if (cachedBridgeResolved) return cachedBridge;
  cachedBridgeResolved = true;
  cachedBridge = getBridge();
  return cachedBridge;
}

// ---------------------------------------------------------------------------
// 统一封装
// ---------------------------------------------------------------------------

/**
 * 调用 Tabbit 内置 AI。
 *
 * @param {Object}   opts
 * @param {string}   opts.system          系统提示词（角色与任务定义）
 * @param {string}   opts.user            用户输入（网页内容 / 代码片段等）
 * @param {string}   [opts.responseFormat] 设为 "json" 时返回结构化 JSON
 * @param {string[]} [opts.images]        图片 URL / Data URL
 * @param {Object[]} [opts.videos]        视频 { url, fps }
 * @param {Object[]} [opts.audios]        音频 { url, format }
 * @param {Function} [opts.onDelta]       流式增量回调（LLMBridge 不支持流式，
 *                                        会在拿到完整结果后一次性回调）
 * @returns {Promise<string>} AI 返回的文本
 */
async function askLLM({
  system,
  user,
  responseFormat,
  images,
  videos,
  audios,
  onDelta,
}) {
  const prompt = system ? `${system}\n\n${user}` : user;

  const options = {};
  if (responseFormat === 'json') options.response_format = 'json';
  if (images && images.length) options.images = images;
  if (videos && videos.length) options.videos = videos;
  if (audios && audios.length) options.audios = audios;

  const bridge = resolveBridge();
  if (!bridge) {
    throw new Error('未检测到 LLMBridge，请在 Tabbit 浏览器中运行本脚本。');
  }

  const hasOptions = Object.keys(options).length > 0;
  const text = await bridge(prompt, hasOptions ? options : undefined);

  // LLMBridge 不支持流式，一次性回调完整结果
  if (typeof onDelta === 'function' && typeof text === 'string' && text) {
    onDelta(text);
  }

  return text;
}

/**
 * 判断当前环境是否具备 AI 调用能力（用于 UI 提示）。
 */
function isLLMAvailable() {
  return Boolean(resolveBridge());
}

// ---------------------------------------------------------------------------
// JSON 容错解析
// ---------------------------------------------------------------------------

/**
 * 从 LLM 返回文本中稳健地解析 JSON。
 *
 * 兼容以下常见情况：
 *   - 直接返回 JSON 对象字符串
 *   - 被 ```json ... ``` 代码块包裹
 *   - 前后夹杂说明文字（截取第一个 { 到最后一个 }）
 *
 * @param {string} text LLM 返回的原始文本
 * @returns {any|null} 解析成功返回对象/数组，失败返回 null
 */
function parseJSON(text) {
  if (!text) return null;
  let s = String(text).trim();

  // 1. 去掉可能的 ```json / ``` 代码块包裹
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();

  // 2. 直接解析
  try {
    return JSON.parse(s);
  } catch (_) {
    /* 继续尝试截取 */
  }

  // 3. 截取第一个 { 到最后一个 } 再解析
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(s.slice(start, end + 1));
    } catch (_) {
      /* 放弃 */
    }
  }

  return null;
}


// ===== module boundary =====

/**
 * parser.js — GitHub 页面解析
 *
 * 负责从 GitHub 的 DOM 中提取「仓库首页 / 代码文件页 / PR 页」的关键内容。
 * GitHub 是 React SPA，DOM 结构会随版本变化，因此所有选择器都采用
 * 「多候选 + 兜底」策略，优先用语义化 data-testid，其次用通用 class。
 */

// ---------------------------------------------------------------------------
// 工具函数
// ---------------------------------------------------------------------------

/** 在多个选择器中取第一个命中的元素 */
function pick(...selectors) {
  for (const sel of selectors) {
    try {
      const el = document.querySelector(sel);
      if (el) return el;
    } catch (_) {
      /* 非法选择器跳过 */
    }
  }
  return null;
}

/** 取元素可见文本，裁剪空白 */
function text(el) {
  if (!el) return '';
  return (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
}

/** 截断长文本，保留头部与尾部（中间省略） */
function clamp(str, max = 12000) {
  if (!str) return '';
  if (str.length <= max) return str;
  const half = Math.floor(max / 2);
  return (
    str.slice(0, half) +
    '\n\n……（内容过长，已截断）……\n\n' +
    str.slice(-half)
  );
}

// ---------------------------------------------------------------------------
// 页面类型识别
// ---------------------------------------------------------------------------

/** 判定当前 GitHub 页面类型 */
function detectPageType() {
  // 测试环境钩子：允许 mock 页面强制指定页面类型
  if (window.__REPOLENS_TEST__ && window.__REPOLENS_TEST_TYPE__) {
    return window.__REPOLENS_TEST_TYPE__;
  }
  const { pathname } = location;
  // /owner/repo
  if (/^\/[^/]+\/[^/]+\/?$/.test(pathname)) return 'repo';
  // /owner/repo/blob/...
  if (/^\/[^/]+\/[^/]+\/blob\//.test(pathname)) return 'blob';
  // /owner/repo/pull/123
  if (/^\/[^/]+\/[^/]+\/pull\/\d+/.test(pathname)) return 'pull';
  // /owner/repo/issues/123（PR 页已在上方匹配，这里只处理普通 issue）
  if (/^\/[^/]+\/[^/]+\/issues\/\d+/.test(pathname)) return 'issue';
  return 'other';
}

// ---------------------------------------------------------------------------
// 仓库首页
// ---------------------------------------------------------------------------

/** 提取仓库 README 正文 */
function extractReadme() {
  const el =
    pick('article.markdown-body', '[data-testid="readme"]', '#readme article') ||
    document.querySelector('.Box-body .markdown-body');
  return clamp(text(el));
}

/** 提取仓库文件树（顶层目录名列表） */
function extractFileTree() {
  const tree =
    pick('[role="tree"]', '[aria-label="File tree"]', '.react-directory-truncate') ||
    document;
  // 取所有树节点文本
  const items = [];
  const nodes = tree.querySelectorAll(
    '[role="treeitem"], [data-testid="tree-item"], .ActionList-item, a[href*="/tree/"], a[href*="/blob/"]'
  );
  nodes.forEach((n) => {
    const t = text(n);
    if (t && t.length < 200 && !items.includes(t)) items.push(t);
  });
  return items.slice(0, 120);
}

/** 提取仓库基本信息（描述 / 语言 / star 等） */
function extractRepoAbout() {
  const desc = text(pick('[data-testid="repository-description"]', 'p.f4'));
  const lang = text(pick('[itemprop="programmingLanguage"]', '.Layout-sidebar [aria-label]'));
  const stars = text(pick('#repo-stars-counter-star', 'a[href$="/stargazers"] strong'));
  return { desc, lang, stars };
}

/** 提取仓库首页完整上下文（供 AI 使用） */
function extractRepoContext() {
  const { desc, lang, stars } = extractRepoAbout();
  const readme = extractReadme();
  const tree = extractFileTree();
  return {
    repo: parseRepoName(),
    desc,
    lang,
    stars,
    readme,
    fileTree: tree,
  };
}

/**
 * 提取「深度文件树」—— 带完整相对路径的文件/目录列表。
 *
 * 架构分析比「仓库速览」需要更细的目录结构，因此这里从文件树链接的 href
 * 中解析出完整路径（如 src/core/index.ts），而不只是顶层目录名。
 */
function extractDeepFileTree() {
  const items = [];
  const seen = new Set();

  // 在文件树容器内找所有指向 tree/blob 的链接
  const root =
    pick('[role="tree"]', '[aria-label="File tree"]', '.react-directory-truncate') ||
    document;

  root.querySelectorAll('a[href*="/tree/"], a[href*="/blob/"]').forEach((a) => {
    const href = a.getAttribute('href') || '';
    // /owner/repo/tree/<branch>/<path> 或 /owner/repo/blob/<branch>/<path>
    const m = href.match(/\/(?:tree|blob)\/[^/]+\/(.+)$/);
    if (m) {
      const p = decodeURIComponent(m[1]);
      if (p && !seen.has(p) && p.length < 300) {
        seen.add(p);
        items.push(p);
      }
    }
  });

  // 兜底：若链接未解析出路径，回退到树节点文本
  if (!items.length) {
    return extractFileTree();
  }

  return items.slice(0, 200);
}

// ---------------------------------------------------------------------------
// 代码文件页
// ---------------------------------------------------------------------------

/** 解析 owner/repo */
function parseRepoName() {
  const m = location.pathname.match(/^\/([^/]+)\/([^/]+)/);
  if (!m) return '';
  return `${m[1]}/${m[2]}`;
}

/** 提取当前文件路径 */
function extractFilePath() {
  const m = location.pathname.match(/\/blob\/[^/]+\/(.+)$/);
  if (m) return decodeURIComponent(m[1]);
  const bc = pick('[data-testid="breadcrumbs"]', '.react-blob-header .react-directory-truncate');
  return text(bc) || '';
}

/** 提取代码文件正文 */
function extractCode() {
  const el = pick('.react-code-text', 'table.highlight', '.js-file-line-container');
  if (!el) return '';
  // GitHub 代码用 table + 行号 + 代码列，取 textContent 可能混入行号；
  // 优先取纯代码单元格
  const lines = el.querySelectorAll('.react-code-text, .blob-code, td.blob-code-inner');
  if (lines.length) {
    return clamp(
      Array.from(lines)
        .map((l) => text(l))
        .join('\n')
    );
  }
  return clamp(text(el));
}

/** 提取当前页选中的代码（用户划选） */
function getSelectionText() {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return '';
  return sel.toString().trim();
}

/** 提取代码页完整上下文 */
function extractCodeContext() {
  return {
    repo: parseRepoName(),
    path: extractFilePath(),
    code: extractCode(),
  };
}

// ---------------------------------------------------------------------------
// PR 页
// ---------------------------------------------------------------------------

/** 提取 PR 标题 */
function extractPRTitle() {
  return (
    text(pick('[data-testid="issue-title"]', 'h1 .js-issue-title', 'h1.bdi')) ||
    document.title
  );
}

/** 提取 PR 描述正文 */
function extractPRBody() {
  return clamp(
    text(pick('[data-testid="issue-body"]', '.comment-body', '.js-comment-body'))
  );
}

/** 提取 PR 变更文件列表 */
function extractPRFiles() {
  const items = [];
  document
    .querySelectorAll(
      '[data-testid="file-header"], .file-info, .diff-tree-item, a.Link--primary[href*="#diff-"]'
    )
    .forEach((n) => {
      const t = text(n);
      if (t && t.length < 400 && !items.includes(t)) items.push(t);
    });
  return items.slice(0, 60);
}

/** 提取 PR diff 的统计信息（增删行数） */
function extractPRStats() {
  const additions = text(pick('[id*="diffstat"] .color-fg-success', '.diffstat .text-green'));
  const deletions = text(pick('[id*="diffstat"] .color-fg-danger', '.diffstat .text-red'));
  return { additions, deletions };
}

/** 提取 PR 页完整上下文 */
function extractPRContext() {
  return {
    repo: parseRepoName(),
    title: extractPRTitle(),
    body: extractPRBody(),
    files: extractPRFiles(),
    stats: extractPRStats(),
  };
}

// ---------------------------------------------------------------------------
// Issue 页
// ---------------------------------------------------------------------------

/** 提取 Issue 的标签列表（bug/enhancement 等） */
function extractIssueLabels() {
  const labels = [];
  document
    .querySelectorAll(
      '[data-testid="sidebar-labels"] a, .js-issue-labels a, a[href*="/labels/"]'
    )
    .forEach((n) => {
      const t = text(n);
      if (t && t.length < 50 && !labels.includes(t)) labels.push(t);
    });
  return labels.slice(0, 20);
}

/** 提取 Issue 的评论（回复）内容 */
function extractIssueComments() {
  const comments = [];
  document
    .querySelectorAll('.comment-body, [data-testid="comment-body"]')
    .forEach((n) => {
      const t = clamp(text(n), 4000);
      if (t) comments.push(t);
    });
  return comments.slice(0, 5);
}

/** 提取 Issue 页完整上下文 */
function extractIssueContext() {
  return {
    repo: parseRepoName(),
    title: extractPRTitle(), // Issue 与 PR 标题选择器一致
    body: extractPRBody(),
    labels: extractIssueLabels(),
    comments: extractIssueComments(),
  };
}


// ===== module boundary =====

/**
 * ui.js — RepoLens 侧边栏 UI（Shadow DOM 隔离）
 *
 * 提供：悬浮触发按钮 + 可拖动侧边栏面板 + Markdown 轻量渲染 + 打字机效果。
 * 所有样式封装在 Shadow DOM 内，避免与 GitHub 页面样式互相污染。
 */

// ---------------------------------------------------------------------------
// 轻量 Markdown 渲染（仅支持常用子集，够用且安全）
// ---------------------------------------------------------------------------

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** 把 AI 返回的 Markdown 渲染为安全 HTML（不引入第三方依赖） */
function renderMarkdown(md) {
  if (!md) return '';
  const lines = String(md).split('\n');
  const out = [];
  let inCode = false;
  let codeBuf = [];
  let inList = false;

  const flushList = () => {
    if (inList) {
      out.push('</ul>');
      inList = false;
    }
  };

  for (const raw of lines) {
    const line = raw.replace(/\r$/, '');

    // 代码块
    if (line.trimStart().startsWith('```')) {
      flushList();
      if (inCode) {
        out.push(
          '<pre><code>' + escapeHtml(codeBuf.join('\n')) + '</code></pre>'
        );
        codeBuf = [];
        inCode = false;
      } else {
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      codeBuf.push(line);
      continue;
    }

    // 标题
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      flushList();
      const level = Math.min(h[1].length + 2, 6);
      out.push(`<h${level}>${inline(h[2])}</h${level}>`);
      continue;
    }

    // 无序列表
    const li = line.match(/^\s*[-*]\s+(.*)$/);
    if (li) {
      if (!inList) {
        out.push('<ul>');
        inList = true;
      }
      out.push(`<li>${inline(li[1])}</li>`);
      continue;
    }

    // 分隔线
    if (/^\s*[-*_]{3,}\s*$/.test(line)) {
      flushList();
      out.push('<hr/>');
      continue;
    }

    // 普通段落
    flushList();
    if (line.trim()) out.push(`<p>${inline(line)}</p>`);
  }
  flushList();
  if (inCode) out.push('<pre><code>' + escapeHtml(codeBuf.join('\n')) + '</code></pre>');
  return out.join('');
}

/** 行内标记：加粗 / 斜体 / 行内代码 / 链接 */
function inline(s) {
  let t = escapeHtml(s);
  t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  return t;
}

// ---------------------------------------------------------------------------
// 样式（Shadow DOM 内部）
// ---------------------------------------------------------------------------

const CSS = `
:host { all: initial; }
* { box-sizing: border-box; }

.rl-fab {
  position: fixed;
  right: 24px;
  bottom: 24px;
  width: 52px;
  height: 52px;
  border-radius: 16px;
  background: linear-gradient(135deg, #7c3aed 0%, #2563eb 100%);
  color: #fff;
  border: none;
  cursor: pointer;
  z-index: 2147483000;
  box-shadow: 0 8px 24px rgba(37, 99, 235, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  font-size: 22px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
.rl-fab:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px rgba(37, 99, 235, 0.45);
}
.rl-fab:active { transform: translateY(0); }

.rl-panel {
  position: fixed;
  top: 0;
  right: 0;
  width: 420px;
  max-width: 92vw;
  height: 100vh;
  background: #ffffff;
  z-index: 2147483000;
  box-shadow: -12px 0 40px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC",
    "Microsoft YaHei", sans-serif;
  color: #1f2328;
  animation: rl-slide-in 0.22s ease;
}
@keyframes rl-slide-in {
  from { transform: translateX(40px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

.rl-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid #eaecef;
  background: #fafbfc;
}
.rl-logo {
  width: 26px;
  height: 26px;
  border-radius: 8px;
  background: linear-gradient(135deg, #7c3aed 0%, #2563eb 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 13px;
  flex: none;
}
.rl-title { flex: 1; font-size: 14px; font-weight: 600; }
.rl-subtitle { font-size: 12px; color: #6e7781; margin-top: 1px; }
.rl-close {
  border: none;
  background: transparent;
  color: #6e7781;
  cursor: pointer;
  font-size: 18px;
  padding: 4px 8px;
  border-radius: 6px;
  line-height: 1;
}
.rl-close:hover { background: #eaecef; color: #1f2328; }

.rl-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  font-size: 13.5px;
  line-height: 1.65;
}
.rl-body h3 {
  font-size: 14px;
  margin: 14px 0 6px;
  color: #1f2328;
}
.rl-body h3:first-child { margin-top: 0; }
.rl-body h4 { font-size: 13px; margin: 12px 0 4px; color: #24292f; }
.rl-body p { margin: 6px 0; }
.rl-body ul { margin: 6px 0; padding-left: 20px; }
.rl-body li { margin: 3px 0; }
.rl-body code {
  background: #f0f1f3;
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 12px;
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
  color: #c7254e;
}
.rl-body pre {
  background: #0d1117;
  color: #e6edf3;
  padding: 12px;
  border-radius: 8px;
  overflow-x: auto;
  font-size: 12px;
  line-height: 1.5;
}
.rl-body pre code {
  background: transparent;
  color: inherit;
  padding: 0;
  font-size: 12px;
}
.rl-body strong { font-weight: 600; }
.rl-body hr { border: none; border-top: 1px solid #eaecef; margin: 12px 0; }

.rl-empty {
  color: #6e7781;
  text-align: center;
  padding: 40px 16px;
  font-size: 13px;
}
.rl-loading {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #57606a;
  padding: 20px 0;
  font-size: 13px;
}
.rl-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid #e5e7eb;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: rl-spin 0.8s linear infinite;
  flex: none;
}
@keyframes rl-spin { to { transform: rotate(360deg); } }

.rl-error {
  background: #fff5f5;
  border: 1px solid #fecaca;
  color: #b91c1c;
  padding: 12px 14px;
  border-radius: 8px;
  font-size: 13px;
  margin: 8px 0;
}

.rl-actions {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid #eaecef;
  background: #fafbfc;
  flex-wrap: wrap;
}
.rl-btn {
  flex: 1;
  min-width: 0;
  border: 1px solid #d0d7de;
  background: #fff;
  color: #24292f;
  border-radius: 8px;
  padding: 8px 10px;
  cursor: pointer;
  font-size: 12.5px;
  font-family: inherit;
  white-space: nowrap;
}
.rl-btn:hover { background: #f3f4f6; }
.rl-btn.primary {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
  font-weight: 600;
}
.rl-btn.primary:hover { background: #1d4ed8; }
.rl-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* ===== 结构化 JSON 卡片渲染 ===== */
.rl-card {
  border: 1px solid #eaecef;
  border-radius: 10px;
  padding: 12px 14px;
  margin: 8px 0;
  background: #fafbfc;
}
.rl-card-title {
  font-size: 12px;
  font-weight: 600;
  color: #6e7781;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.rl-summary {
  background: linear-gradient(135deg, #7c3aed 0%, #2563eb 100%);
  color: #fff;
  border-radius: 10px;
  padding: 14px 16px;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.6;
  margin: 4px 0 8px;
}
.rl-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.rl-tag {
  background: #eef2ff;
  color: #4338ca;
  border: 1px solid #e0e7ff;
  border-radius: 999px;
  padding: 3px 12px;
  font-size: 12px;
}
.rl-tag.issue-bug { background: #fef2f2; color: #b91c1c; border-color: #fecaca; }
.rl-tag.issue-feature { background: #f0fdf4; color: #15803d; border-color: #bbf7d0; }
.rl-tag.issue-question { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }
.rl-tag.issue-other { background: #f5f5f4; color: #57534e; border-color: #e7e5e4; }
.rl-dir-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px dashed #eaecef;
  font-size: 12.5px;
}
.rl-dir-item:last-child { border-bottom: none; }
.rl-dir-name {
  flex: none;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  color: #4338ca;
  background: #eef2ff;
  padding: 1px 6px;
  border-radius: 4px;
}
.rl-dir-role { color: #57606a; }
.rl-list { margin: 4px 0; padding-left: 18px; }
.rl-list li { margin: 4px 0; color: #24292f; }

/* 架构分析：模块卡片 */
.rl-module {
  border: 1px solid #eaecef;
  border-left: 3px solid #7c3aed;
  border-radius: 8px;
  padding: 10px 12px;
  margin: 6px 0;
  background: #fff;
}
.rl-module-name {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12.5px;
  font-weight: 600;
  color: #4338ca;
  display: block;
  margin-bottom: 2px;
}
.rl-module-resp { font-size: 12px; color: #24292f; }
.rl-module-deps { font-size: 11.5px; color: #6e7781; margin-top: 4px; }
.rl-flow {
  background: #f6f8fa;
  border: 1px solid #eaecef;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 12.5px;
  color: #24292f;
  line-height: 1.6;
  margin: 4px 0;
}

/* 复制按钮 */
.rl-copy {
  position: absolute;
  top: 14px;
  right: 46px;
  border: 1px solid #d0d7de;
  background: #fff;
  color: #57606a;
  border-radius: 6px;
  padding: 3px 10px;
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
}
.rl-copy:hover { background: #f3f4f6; color: #1f2328; }

/* ===== 对话式问答 ===== */
.rl-chat {
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid #eaecef;
  background: #fafbfc;
}
.rl-chat-input {
  flex: 1;
  border: 1px solid #d0d7de;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 13px;
  font-family: inherit;
  color: #1f2328;
  outline: none;
  resize: none;
  min-height: 20px;
  max-height: 96px;
}
.rl-chat-input:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12); }
.rl-chat-send {
  border: none;
  background: #2563eb;
  color: #fff;
  border-radius: 8px;
  padding: 0 14px;
  cursor: pointer;
  font-size: 13px;
  font-family: inherit;
  font-weight: 600;
  white-space: nowrap;
}
.rl-chat-send:hover { background: #1d4ed8; }
.rl-chat-send:disabled { opacity: 0.5; cursor: not-allowed; }
.rl-chat-hint {
  font-size: 11px;
  color: #8b949e;
  padding: 0 12px 8px;
  background: #fafbfc;
  border-top: 1px solid #eaecef;
}

/* 对话气泡 */
.rl-msg { margin: 8px 0; display: flex; flex-direction: column; }
.rl-msg-user { align-items: flex-end; }
.rl-msg-ai { align-items: flex-start; }
.rl-bubble {
  max-width: 88%;
  padding: 8px 12px;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.6;
  word-break: break-word;
}
.rl-msg-user .rl-bubble {
  background: #2563eb;
  color: #fff;
  border-bottom-right-radius: 4px;
}
.rl-msg-ai .rl-bubble {
  background: #f3f4f6;
  color: #1f2328;
  border-bottom-left-radius: 4px;
}
.rl-msg-ai .rl-bubble code {
  background: rgba(0,0,0,0.06);
  color: #c7254e;
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
.rl-msg-ai .rl-bubble pre {
  background: #0d1117;
  color: #e6edf3;
  padding: 10px;
  border-radius: 8px;
  overflow-x: auto;
  font-size: 12px;
  margin: 6px 0;
}
.rl-msg-ai .rl-bubble pre code {
  background: transparent;
  color: inherit;
  padding: 0;
}
.rl-msg-ai .rl-bubble strong { font-weight: 600; }
.rl-thinking {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #57606a;
  font-size: 12.5px;
  padding: 8px 12px;
}
.rl-divider {
  border: none;
  border-top: 1px solid #eaecef;
  margin: 16px 0 8px;
}
.rl-chat-title {
  font-size: 12px;
  font-weight: 600;
  color: #6e7781;
  margin: 8px 0 4px;
}

/* 一键追问推荐问题 */
.rl-suggest {
  margin: 12px 0 4px;
  padding-top: 10px;
  border-top: 1px dashed #eaecef;
}
.rl-suggest-title {
  font-size: 12px;
  font-weight: 600;
  color: #6e7781;
  margin-bottom: 6px;
}
.rl-suggest-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.rl-suggest-btn {
  border: 1px solid #d0d7de;
  background: #fff;
  color: #2563eb;
  border-radius: 999px;
  padding: 4px 12px;
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.12s ease, border-color 0.12s ease;
}
.rl-suggest-btn:hover {
  background: #eef2ff;
  border-color: #93b4f8;
}

/* Mermaid 架构图 */
.rl-mermaid-wrap {
  margin: 8px 0;
  padding: 12px;
  background: #fff;
  border: 1px solid #eaecef;
  border-radius: 10px;
  overflow-x: auto;
}
.rl-mermaid-wrap svg { max-width: 100%; height: auto; }
.rl-mermaid-fallback {
  background: #0d1117;
  color: #e6edf3;
  padding: 12px;
  border-radius: 8px;
  font-size: 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  overflow-x: auto;
  white-space: pre;
  margin: 4px 0;
}
.rl-mermaid-copy {
  margin-left: 8px;
  font-size: 11px;
  color: #2563eb;
  cursor: pointer;
  border: 1px solid #d0d7de;
  background: #fff;
  border-radius: 6px;
  padding: 2px 8px;
}
.rl-mermaid-copy:hover { background: #f3f4f6; }
`;

// ---------------------------------------------------------------------------
// 结构化 JSON 渲染
// ---------------------------------------------------------------------------

/** 渲染「仓库速览」JSON 为结构化卡片 */
function renderRepoJSON(data) {
  const parts = [];

  if (data.summary) {
    parts.push(`<div class="rl-summary">${escapeHtml(data.summary)}</div>`);
  }

  if (Array.isArray(data.techStack) && data.techStack.length) {
    const tags = data.techStack
      .map((t) => `<span class="rl-tag">${escapeHtml(String(t))}</span>`)
      .join('');
    parts.push(
      `<div class="rl-card"><div class="rl-card-title">🛠️ 技术栈</div><div class="rl-tags">${tags}</div></div>`
    );
  }

  if (Array.isArray(data.directory) && data.directory.length) {
    const items = data.directory
      .map(
        (d) =>
          `<div class="rl-dir-item"><span class="rl-dir-name">${escapeHtml(
            String(d?.name || '')
          )}</span><span class="rl-dir-role">${escapeHtml(
            String(d?.role || '')
          )}</span></div>`
      )
      .join('');
    parts.push(
      `<div class="rl-card"><div class="rl-card-title">📂 目录导航</div>${items}</div>`
    );
  }

  if (Array.isArray(data.quickStart) && data.quickStart.length) {
    const lis = data.quickStart
      .map((s) => `<li>${escapeHtml(String(s))}</li>`)
      .join('');
    parts.push(
      `<div class="rl-card"><div class="rl-card-title">🚀 快速上手</div><ul class="rl-list">${lis}</ul></div>`
    );
  }

  if (Array.isArray(data.highlights) && data.highlights.length) {
    const lis = data.highlights
      .map((s) => `<li>${escapeHtml(String(s))}</li>`)
      .join('');
    parts.push(
      `<div class="rl-card"><div class="rl-card-title">✨ 亮点</div><ul class="rl-list">${lis}</ul></div>`
    );
  }

  return parts.join('') || '<div class="rl-empty">AI 返回了空结果，请重试。</div>';
}

/** 渲染「Issue 解读」JSON 为结构化卡片 */
function renderIssueJSON(data) {
  const parts = [];

  if (data.summary) {
    parts.push(`<div class="rl-summary">${escapeHtml(data.summary)}</div>`);
  }

  const typeMap = {
    bug: 'issue-bug',
    feature: 'issue-feature',
    question: 'issue-question',
    other: 'issue-other',
  };
  const type = String(data.type || 'other').toLowerCase();
  const typeCls = typeMap[type] || 'issue-other';
  const typeLabel = { bug: '🐛 Bug', feature: '✨ Feature', question: '❓ 提问', other: '📌 其他' }[type] || String(data.type || '其他');
  parts.push(
    `<div class="rl-card"><div class="rl-card-title">🏷️ 类型</div><div class="rl-tags"><span class="rl-tag ${typeCls}">${escapeHtml(typeLabel)}</span></div></div>`
  );

  if (data.impact) {
    parts.push(
      `<div class="rl-card"><div class="rl-card-title">⚡ 影响与紧急度</div><p style="margin:0;color:#24292f">${escapeHtml(
        String(data.impact)
      )}</p></div>`
    );
  }

  if (Array.isArray(data.actionItems) && data.actionItems.length) {
    const lis = data.actionItems
      .map((s) => `<li>${escapeHtml(String(s))}</li>`)
      .join('');
    parts.push(
      `<div class="rl-card"><div class="rl-card-title">✅ 建议处理</div><ul class="rl-list">${lis}</ul></div>`
    );
  }

  return parts.join('') || '<div class="rl-empty">AI 返回了空结果，请重试。</div>';
}

// ---------------------------------------------------------------------------
// Mermaid 架构图渲染（自绘 SVG，零外部依赖，不依赖 CDN）
// ---------------------------------------------------------------------------

const FC_NODE_W = 150;
const FC_NODE_H = 44;
const FC_GAP_X = 34;
const FC_GAP_Y = 72;
const FC_PAD = 18;
const FC_COLORS = {
  nodeFill: '#eef2ff',
  nodeStroke: '#7c3aed',
  edge: '#8b949e',
  text: '#1f2328',
  subFill: '#f6f8fa',
  subStroke: '#d0d7de',
  subText: '#57606a',
};

/** 解析 flowchart 代码为结构化数据（兼容节点定义同行、链式箭头、subgraph、带标签边） */
function parseFlowchart(code) {
  const nodes = [];
  const edges = [];
  const subgraphs = [];
  const nodeMap = new Map();
  const subOf = new Map(); // id -> subgraphId

  const lines = String(code).split('\n');

  // 第一遍：确定每个节点所属 subgraph（按 subgraph/end 区间）
  let currentSub = null;
  const subById = new Map();
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    let m = line.match(/^subgraph\s+([A-Za-z_][A-Za-z0-9_]*)\s*\[(.+)\]\s*$/i);
    if (m) {
      currentSub = { id: m[1], title: m[2].trim(), nodeIds: [] };
      subgraphs.push(currentSub);
      subById.set(currentSub.id, currentSub);
      continue;
    }
    m = line.match(/^subgraph\s+(.+)$/i);
    if (m) {
      const title = m[1].trim();
      currentSub = { id: 'sg' + subgraphs.length, title, nodeIds: [] };
      subgraphs.push(currentSub);
      subById.set(currentSub.id, currentSub);
      continue;
    }
    if (/^end$/i.test(line)) {
      currentSub = null;
      continue;
    }
    // 在 subgraph 区间内出现的节点 ID 归属当前 subgraph
    if (currentSub) {
      const ids = extractIds(line);
      ids.forEach((id) => subOf.set(id, currentSub.id));
    }
  }

  const ensureNode = (id, label) => {
    if (nodeMap.has(id)) return nodeMap.get(id);
    const sgId = subOf.get(id) || null;
    const node = {
      id,
      label: label != null ? label : id,
      subgraphId: sgId,
    };
    nodeMap.set(id, node);
    nodes.push(node);
    if (sgId) {
      const sg = subById.get(sgId);
      if (sg) sg.nodeIds.push(id);
    }
    return node;
  };

  // 第二遍：提取节点定义与边（同一行可能同时存在）
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    // 跳过声明/方向/配置行与 subgraph 结构行
    if (/^(flowchart|graph)\s+(TD|TB|LR|RL|BT)\b/i.test(line)) continue;
    if (/^(TD|TB|LR|RL|BT)$/i.test(line)) continue;
    if (/^(classDef|style|click|linkStyle)\b/i.test(line)) continue;
    if (/^subgraph\b/i.test(line)) continue;
    if (/^end$/i.test(line)) continue;

    // 去掉边标签 |...|（保留箭头与节点）
    const cleaned = line.replace(/\|[^|]*\|/g, '').trim();

    // 提取节点定义 ID[标签] / ID(标签) / ID{标签}
    const defRe = /([A-Za-z_][A-Za-z0-9_]*)\s*[\[\(\{]([^\]\)\}]*)[\]\)\}]/g;
    let dm;
    while ((dm = defRe.exec(cleaned)) !== null) {
      ensureNode(dm[1], dm[2].trim() || dm[1]);
    }

    // 提取链式边：ID (-->|...|==>) ID (--> ... ) ...
    const ids = cleaned.match(/[A-Za-z_][A-Za-z0-9_]*/g) || [];
    // 仅当行内含箭头时才解析边
    if (!/-->|---|-\.->|==>/.test(cleaned)) {
      // 无箭头：裸节点/定义行，补充未定义节点
      ids.forEach((id) => ensureNode(id, id));
      continue;
    }

    // 有箭头：按节点序列连边（链式 A --> B --> C 解析为 A->B, B->C）
    // 先去节点定义内容（[...]/(...)/{...}），只留下节点 ID 与箭头
    const edgesOnly = cleaned.replace(/[\[\(\{][^\]\)\}]*[\]\)\}]/g, '').trim();
    const tokens = [];
    const tokenRe = /([A-Za-z_][A-Za-z0-9_]*)/g;
    let tm;
    while ((tm = tokenRe.exec(edgesOnly)) !== null) {
      tokens.push(tm[1]);
    }
    for (let i = 0; i + 1 < tokens.length; i++) {
      ensureNode(tokens[i], tokens[i]);
      ensureNode(tokens[i + 1], tokens[i + 1]);
      edges.push({ from: tokens[i], to: tokens[i + 1] });
    }
  }

  return { nodes, edges, subgraphs };
}

/** 从一行中提取所有合法节点 ID（用于 subgraph 归属判断） */
function extractIds(line) {
  const ids = [];
  const re = /[A-Za-z_][A-Za-z0-9_]*/g;
  let m;
  while ((m = re.exec(line)) !== null) {
    // 排除方向关键字
    if (/^(TD|TB|LR|RL|BT|flowchart|graph|subgraph|end)$/i.test(m[0])) continue;
    ids.push(m[0]);
  }
  return ids;
}

/** 分层布局（简化 Sugiyama：无入边为第 0 层，BFS 逐层展开，环内节点兜底） */
function layoutFlowchart(data) {
  const { nodes, edges } = data;
  const out = new Map();
  const indegree = new Map();
  const rank = new Map();

  nodes.forEach((n) => {
    out.set(n.id, []);
    indegree.set(n.id, 0);
  });
  edges.forEach((e) => {
    if (!out.has(e.from)) out.set(e.from, []);
    if (!out.has(e.to)) out.set(e.to, []);
    out.get(e.from).push(e.to);
    indegree.set(e.to, (indegree.get(e.to) || 0) + 1);
  });

  // BFS 分层
  const queue = [];
  nodes.forEach((n) => {
    if ((indegree.get(n.id) || 0) === 0) {
      rank.set(n.id, 0);
      queue.push(n.id);
    }
  });

  const remaining = new Map(indegree);
  while (queue.length) {
    const id = queue.shift();
    (out.get(id) || []).forEach((to) => {
      const nr = (rank.get(id) || 0) + 1;
      if (!rank.has(to) || rank.get(to) < nr) rank.set(to, nr);
      remaining.set(to, (remaining.get(to) || 1) - 1);
      if (remaining.get(to) === 0) queue.push(to);
    });
  }

  // 环内未分配节点兜底
  nodes.forEach((n) => {
    if (!rank.has(n.id)) rank.set(n.id, 0);
  });

  // 按层分组
  const layerMap = new Map();
  nodes.forEach((n) => {
    const r = rank.get(n.id);
    if (!layerMap.has(r)) layerMap.set(r, []);
    layerMap.get(r).push(n);
  });
  const ranks = Array.from(layerMap.keys()).sort((a, b) => a - b);

  // 计算坐标
  const pos = new Map();
  let maxLayerW = 0;
  ranks.forEach((r) => {
    let x = FC_PAD;
    const layerNodes = layerMap.get(r);
    layerNodes.forEach((n) => {
      pos.set(n.id, { x, y: FC_PAD + r * (FC_NODE_H + FC_GAP_Y) });
      x += FC_NODE_W + FC_GAP_X;
    });
    const layerW =
      layerNodes.length * FC_NODE_W + (layerNodes.length - 1) * FC_GAP_X;
    maxLayerW = Math.max(maxLayerW, layerW);
  });

  const width = maxLayerW + FC_PAD * 2;
  const maxRank = ranks.length ? ranks[ranks.length - 1] : 0;
  const height = FC_PAD + maxRank * (FC_NODE_H + FC_GAP_Y) + FC_NODE_H + FC_PAD;

  return { pos, width, height };
}

/** 计算 subgraph 外框 */
function computeSubgraphRects(data, pos) {
  const rects = [];
  data.subgraphs.forEach((sg) => {
    if (!sg.nodeIds.length) return;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    sg.nodeIds.forEach((id) => {
      const p = pos.get(id);
      if (!p) return;
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x + FC_NODE_W);
      maxY = Math.max(maxY, p.y + FC_NODE_H);
    });
    if (minX === Infinity) return;
    rects.push({
      title: sg.title,
      x: minX - FC_PAD,
      y: minY - FC_PAD - 16,
      w: maxX - minX + FC_PAD * 2,
      h: maxY - minY + FC_PAD * 2 + 16,
    });
  });
  return rects;
}

/** 把 flowchart 代码渲染为 SVG 字符串；解析失败返回 null */
function renderFlowchartSVG(code) {
  if (code == null) return null;
  const text = String(code).trim();
  if (!text) return null;
  const data = parseFlowchart(text);
  if (!data.nodes.length) return null;

  const { pos, width, height } = layoutFlowchart(data);
  const subRects = computeSubgraphRects(data, pos);

  const out = [];
  out.push(
    `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block">`
  );

  // subgraph 外框
  subRects.forEach((r) => {
    out.push(
      `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="10" fill="${FC_COLORS.subFill}" stroke="${FC_COLORS.subStroke}" stroke-width="1.5" stroke-dasharray="5 3"/>`
    );
    out.push(
      `<text x="${r.x + 10}" y="${r.y + 15}" font-size="12" font-weight="600" fill="${FC_COLORS.subText}">${escapeHtml(r.title)}</text>`
    );
  });

  // 边
  data.edges.forEach((e) => {
    const a = pos.get(e.from);
    const b = pos.get(e.to);
    if (!a || !b) return;
    const x1 = a.x + FC_NODE_W / 2;
    const x2 = b.x + FC_NODE_W / 2;
    let y1, y2, arrowDown;
    if (b.y >= a.y) {
      y1 = a.y + FC_NODE_H;
      y2 = b.y;
      arrowDown = true;
    } else {
      y1 = a.y;
      y2 = b.y + FC_NODE_H;
      arrowDown = false;
    }
    const midY = (y1 + y2) / 2;
    out.push(
      `<path d="M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}" fill="none" stroke="${FC_COLORS.edge}" stroke-width="1.5"/>`
    );
    // 箭头
    if (arrowDown) {
      out.push(
        `<path d="M ${x2} ${y2} L ${x2 - 5} ${y2 - 8} L ${x2 + 5} ${y2 - 8} Z" fill="${FC_COLORS.edge}"/>`
      );
    } else {
      out.push(
        `<path d="M ${x2} ${y2} L ${x2 - 5} ${y2 + 8} L ${x2 + 5} ${y2 + 8} Z" fill="${FC_COLORS.edge}"/>`
      );
    }
  });

  // 节点
  data.nodes.forEach((n) => {
    const p = pos.get(n.id);
    if (!p) return;
    out.push(
      `<rect x="${p.x}" y="${p.y}" width="${FC_NODE_W}" height="${FC_NODE_H}" rx="8" fill="${FC_COLORS.nodeFill}" stroke="${FC_COLORS.nodeStroke}" stroke-width="1.5"/>`
    );
    out.push(
      `<text x="${p.x + FC_NODE_W / 2}" y="${p.y + FC_NODE_H / 2}" text-anchor="middle" dominant-baseline="central" font-size="12.5" fill="${FC_COLORS.text}" font-family="ui-monospace,SFMono-Regular,Menlo,Consolas,monospace">${escapeHtml(n.label)}</text>`
    );
  });

  out.push('</svg>');
  return out.join('');
}

/** 渲染架构图：优先自绘 SVG，失败回退为代码块 */
function renderMermaidBlock(code) {
  const clean = String(code).trim();
  const svg = renderFlowchartSVG(clean);

  if (svg) {
    return `<div class="rl-card"><div class="rl-card-title">🧩 架构图</div><div class="rl-mermaid-wrap">${svg}</div></div>`;
  }

  // 兜底：显示原始代码
  return `<div class="rl-card"><div class="rl-card-title">🧩 架构图</div><div class="rl-mermaid-fallback">${escapeHtml(clean)}</div></div>`;
}

/** 渲染「架构分析」JSON 为结构化卡片 */
function renderArchJSON(data) {
  const parts = [];

  if (data.overview) {
    parts.push(
      `<div class="rl-card"><div class="rl-card-title">🧭 架构概览</div><p style="margin:0;color:#24292f;line-height:1.7">${escapeHtml(
        String(data.overview)
      )}</p></div>`
    );
  }

  // Mermaid 架构图（优先展示，视觉冲击最强）
  if (data.mermaid && typeof data.mermaid === 'string' && data.mermaid.trim()) {
    parts.push(renderMermaidBlock(data.mermaid));
  }

  if (Array.isArray(data.modules) && data.modules.length) {
    const mods = data.modules
      .map((m) => {
        const deps = Array.isArray(m?.deps) && m.deps.length
          ? `<div class="rl-module-deps">依赖：${m.deps.map((d) => escapeHtml(String(d))).join('、')}</div>`
          : '';
        return `<div class="rl-module"><span class="rl-module-name">${escapeHtml(
          String(m?.name || '')
        )}</span><div class="rl-module-resp">${escapeHtml(
          String(m?.responsibility || '')
        )}</div>${deps}</div>`;
      })
      .join('');
    parts.push(
      `<div class="rl-card"><div class="rl-card-title">🧩 核心模块</div>${mods}</div>`
    );
  }

  if (data.dataFlow) {
    parts.push(
      `<div class="rl-card"><div class="rl-card-title">🔀 数据/调用流转</div><div class="rl-flow">${escapeHtml(
        String(data.dataFlow)
      )}</div></div>`
    );
  }

  if (Array.isArray(data.patterns) && data.patterns.length) {
    const tags = data.patterns
      .map((p) => `<span class="rl-tag">${escapeHtml(String(p))}</span>`)
      .join('');
    parts.push(
      `<div class="rl-card"><div class="rl-card-title">📐 设计模式</div><div class="rl-tags">${tags}</div></div>`
    );
  }

  if (Array.isArray(data.suggestions) && data.suggestions.length) {
    const lis = data.suggestions
      .map((s) => `<li>${escapeHtml(String(s))}</li>`)
      .join('');
    parts.push(
      `<div class="rl-card"><div class="rl-card-title">💡 改进建议</div><ul class="rl-list">${lis}</ul></div>`
    );
  }

  return parts.join('') || '<div class="rl-empty">AI 返回了空结果，请重试。</div>';
}

// ---------------------------------------------------------------------------
// JSON → Markdown 转换（用于「复制为 Markdown」）
// ---------------------------------------------------------------------------

/** 仓库速览 → Markdown */
function repoToMarkdown(data) {
  const lines = [];
  if (data.summary) lines.push(`> ${data.summary}`, '');
  if (Array.isArray(data.techStack) && data.techStack.length) {
    lines.push('## 技术栈', '', ...data.techStack.map((t) => `- ${t}`), '');
  }
  if (Array.isArray(data.directory) && data.directory.length) {
    lines.push('## 目录导航', '');
    data.directory.forEach((d) => lines.push(`- \`${d?.name || ''}\` — ${d?.role || ''}`));
    lines.push('');
  }
  if (Array.isArray(data.quickStart) && data.quickStart.length) {
    lines.push('## 快速上手', '');
    data.quickStart.forEach((s) => lines.push(`1. ${s}`));
    lines.push('');
  }
  if (Array.isArray(data.highlights) && data.highlights.length) {
    lines.push('## 亮点', '', ...data.highlights.map((s) => `- ${s}`), '');
  }
  return lines.join('\n').trim();
}

/** Issue 解读 → Markdown */
function issueToMarkdown(data) {
  const lines = [];
  if (data.summary) lines.push(`> ${data.summary}`, '');
  const typeLabel = { bug: '🐛 Bug', feature: '✨ Feature', question: '❓ 提问', other: '📌 其他' }[String(data.type || 'other').toLowerCase()] || String(data.type || '其他');
  lines.push('## 类型', '', typeLabel, '');
  if (data.impact) lines.push('## 影响与紧急度', '', String(data.impact), '');
  if (Array.isArray(data.actionItems) && data.actionItems.length) {
    lines.push('## 建议处理', '', ...data.actionItems.map((s) => `- ${s}`), '');
  }
  return lines.join('\n').trim();
}

/** 架构分析 → Markdown */
function archToMarkdown(data) {
  const lines = [];
  if (data.overview) lines.push('## 架构概览', '', String(data.overview), '');
  if (data.mermaid && typeof data.mermaid === 'string' && data.mermaid.trim()) {
    lines.push('## 架构图', '', '```mermaid', data.mermaid.trim(), '```', '');
  }
  if (Array.isArray(data.modules) && data.modules.length) {
    lines.push('## 核心模块', '');
    data.modules.forEach((m) => {
      lines.push(`- **${m?.name || ''}**：${m?.responsibility || ''}`);
      if (Array.isArray(m?.deps) && m.deps.length) lines.push(`  - 依赖：${m.deps.join('、')}`);
    });
    lines.push('');
  }
  if (data.dataFlow) lines.push('## 数据/调用流转', '', String(data.dataFlow), '');
  if (Array.isArray(data.patterns) && data.patterns.length) {
    lines.push('## 设计模式', '', ...data.patterns.map((p) => `- ${p}`), '');
  }
  if (Array.isArray(data.suggestions) && data.suggestions.length) {
    lines.push('## 改进建议', '', ...data.suggestions.map((s) => `- ${s}`), '');
  }
  return lines.join('\n').trim();
}

/** 按视图生成可复制的 Markdown 文本 */
function jsonToMarkdown(view, data) {
  if (view === 'issue') return issueToMarkdown(data);
  if (view === 'arch') return archToMarkdown(data);
  return repoToMarkdown(data);
}

// ---------------------------------------------------------------------------
// 一键追问推荐问题
// ---------------------------------------------------------------------------

/** 每个页面类型的推荐追问问题 */
const SUGGESTIONS = {
  repo: [
    '这个项目怎么跑起来？',
    '核心模块之间是如何调用的？',
    '有哪些容易踩坑的地方？',
  ],
  blob: [
    '这个文件的核心逻辑是什么？',
    '它依赖了哪些其他文件或模块？',
    '有哪些潜在的性能或安全问题？',
  ],
  pull: [
    '这次改动的主要风险是什么？',
    '有没有遗漏的边界情况？',
    '哪些文件需要重点 review？',
  ],
  issue: [
    '这个 Issue 的根因可能是什么？',
    '有没有推荐的修复方案？',
    '影响范围有多大？',
  ],
};

// ---------------------------------------------------------------------------
// UI 控制器
// ---------------------------------------------------------------------------

function initUI({ onOpen } = {}) {
  const host = document.createElement('div');
  host.id = 'repolens-host';
  host.style.cssText = 'all:initial;';
  document.body.appendChild(host);

  // delegatesFocus: true 让 Shadow DOM 内部的输入框获得焦点时，
  // document.activeElement 正确指向 host（可聚焦宿主），
  // 避免 Tabbit 误判「用户没在输入框打字」而把焦点抢到地址栏。
  const root = host.attachShadow({ mode: 'open', delegatesFocus: true });
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  root.appendChild(styleEl);

  const fab = document.createElement('button');
  fab.className = 'rl-fab';
  fab.title = 'RepoLens';
  fab.innerHTML = '🔍';
  root.appendChild(fab);

  let panel = null;
  let lastText = ''; // 最近一次结果文本，用于复制

  function close() {
    if (panel) {
      panel.remove();
      panel = null;
    }
    fab.style.display = 'flex';
  }

  function ensurePanel() {
    if (panel) return panel;
    panel = document.createElement('div');
    panel.className = 'rl-panel';

    const header = document.createElement('div');
    header.className = 'rl-header';
    header.innerHTML = `
      <div class="rl-logo">R</div>
      <div>
        <div class="rl-title">RepoLens 仓库透镜</div>
        <div class="rl-subtitle" id="rl-sub">GitHub 代码理解助手</div>
      </div>
    `;
    const copyBtn = document.createElement('button');
    copyBtn.className = 'rl-copy';
    copyBtn.textContent = '复制';
    copyBtn.title = '复制当前结果';
    copyBtn.addEventListener('click', () => {
      if (!lastText) return;
      navigator.clipboard
        ?.writeText(lastText)
        .then(() => {
          copyBtn.textContent = '已复制';
          setTimeout(() => (copyBtn.textContent = '复制'), 1200);
        })
        .catch(() => {
          copyBtn.textContent = '复制失败';
          setTimeout(() => (copyBtn.textContent = '复制'), 1200);
        });
    });
    header.appendChild(copyBtn);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'rl-close';
    closeBtn.innerHTML = '✕';
    closeBtn.addEventListener('click', close);
    header.appendChild(closeBtn);
    panel.appendChild(header);

    const body = document.createElement('div');
    body.className = 'rl-body';
    body.id = 'rl-body';
    panel.appendChild(body);

    // 一键追问推荐问题（独立于 body，避免被 setBody 覆盖）
    const suggest = document.createElement('div');
    suggest.className = 'rl-suggest';
    suggest.id = 'rl-suggest';
    suggest.style.display = 'none';
    panel.appendChild(suggest);

    const actions = document.createElement('div');
    actions.className = 'rl-actions';
    actions.id = 'rl-actions';
    panel.appendChild(actions);

    // 对话输入区（默认隐藏，切换页面类型时按需显示）
    const chat = document.createElement('div');
    chat.className = 'rl-chat';
    chat.id = 'rl-chat';
    chat.style.display = 'none';
    chat.innerHTML = `
      <textarea class="rl-chat-input" id="rl-chat-input" rows="1"
        placeholder="追问仓库相关问题，例如：鉴权是怎么实现的？"></textarea>
      <button class="rl-chat-send" id="rl-chat-send" type="button">发送</button>
    `;
    panel.appendChild(chat);

    const hint = document.createElement('div');
    hint.className = 'rl-chat-hint';
    hint.id = 'rl-chat-hint';
    hint.style.display = 'none';
    hint.textContent = '基于当前仓库上下文回答，Enter 发送，Shift+Enter 换行';
    panel.appendChild(hint);

    root.appendChild(panel);
    fab.style.display = 'none';
    // 面板及其输入框已创建，此时绑定聊天事件
    bindChatEvents();
    return panel;
  }

  function body() {
    return ensurePanel().querySelector('#rl-body');
  }
  function actionsEl() {
    return ensurePanel().querySelector('#rl-actions');
  }
  function subEl() {
    return ensurePanel().querySelector('#rl-sub');
  }

  function setBody(html) {
    body().innerHTML = html;
  }

  function showLoading(msg) {
    setBody(
      `<div class="rl-loading"><span class="rl-spinner"></span><span>${escapeHtml(msg)}</span></div>`
    );
    lastText = '';
  }

  function showError(msg) {
    setBody(`<div class="rl-error">${escapeHtml(msg)}</div>`);
    lastText = '';
  }

  function showMarkdown(md) {
    setBody(renderMarkdown(md));
    lastText = md;
  }

  /** 结构化 JSON 渲染（repo / issue / arch） */
  function showJSON(view, data) {
    let html;
    if (view === 'issue') html = renderIssueJSON(data);
    else if (view === 'arch') html = renderArchJSON(data);
    else html = renderRepoJSON(data);
    setBody(html);
    // 复制内容改为 Markdown（而非 JSON 原文），更符合用户粘贴到文档的习惯
    lastText = jsonToMarkdown(view, data);
  }

  /** 打字机式追加 Markdown 渲染 */
  function appendMarkdownStream(md) {
    body().innerHTML = renderMarkdown(md);
    body().scrollTop = body().scrollHeight;
  }

  function setActions(buttons) {
    const el = actionsEl();
    el.innerHTML = '';
    buttons.forEach((b) => {
      const btn = document.createElement('button');
      btn.className = 'rl-btn' + (b.primary ? ' primary' : '');
      btn.textContent = b.label;
      if (b.disabled) btn.disabled = true;
      btn.addEventListener('click', b.onClick);
      el.appendChild(btn);
    });
  }

  function setSubtitle(t) {
    if (subEl()) subEl().textContent = t;
  }

  // -------------------------------------------------------------------------
  // 对话式问答
  // -------------------------------------------------------------------------

  let onChatSend = null; // 由 index.js 注入的回调

  // 注意：面板未创建时（用户尚未点击悬浮按钮），这些元素都不存在。
  // 为避免在启动阶段提前建面板、破坏交互时序，这里一律从 panel 惰性查询。
  function chatEl() {
    return panel ? panel.querySelector('#rl-chat') : null;
  }
  function chatInputEl() {
    return panel ? panel.querySelector('#rl-chat-input') : null;
  }
  function chatSendEl() {
    return panel ? panel.querySelector('#rl-chat-send') : null;
  }
  function chatHintEl() {
    return panel ? panel.querySelector('#rl-chat-hint') : null;
  }

  function showChat() {
    const el = chatEl();
    if (el) el.style.display = 'flex';
    const h = chatHintEl();
    if (h) h.style.display = 'block';
  }
  function hideChat() {
    const el = chatEl();
    if (el) el.style.display = 'none';
    const h = chatHintEl();
    if (h) h.style.display = 'none';
  }

  /** 追加一条聊天气泡（role: user / ai，isMarkdown 控制是否渲染 Markdown） */
  function appendChatMessage(role, content, isMarkdown = false) {
    const el = ensurePanel().querySelector('#rl-body');
    const msg = document.createElement('div');
    msg.className = `rl-msg rl-msg-${role}`;
    const bubble = document.createElement('div');
    bubble.className = 'rl-bubble';
    if (role === 'ai' && isMarkdown) {
      bubble.innerHTML = renderMarkdown(content);
    } else {
      bubble.textContent = content;
    }
    msg.appendChild(bubble);
    el.appendChild(msg);
    el.scrollTop = el.scrollHeight;
    return msg;
  }

  /** 显示 AI 思考中状态 */
  function appendThinking() {
    const el = ensurePanel().querySelector('#rl-body');
    const t = document.createElement('div');
    t.className = 'rl-thinking';
    t.innerHTML = '<span class="rl-spinner"></span><span>思考中…</span>';
    el.appendChild(t);
    el.scrollTop = el.scrollHeight;
    return t;
  }

  function setChatBusy(busy) {
    const send = chatSendEl();
    const input = chatInputEl();
    if (send) send.disabled = busy;
    if (input) input.disabled = busy;
  }

  /** 绑定对话发送回调（只保存回调，元素创建后再绑事件，避免启动阶段建面板） */
  function initChat(callback) {
    onChatSend = callback;
    bindChatEvents();
  }

  /** 在面板创建后绑定输入框与发送按钮事件 */
  function bindChatEvents() {
    const input = chatInputEl();
    const send = chatSendEl();
    if (!input || !send) return;
    if (input.dataset.rlBound) return; // 防止重复绑定
    input.dataset.rlBound = '1';

    const doSend = () => {
      const text = input.value.trim();
      if (!text) {
        input.focus();
        return;
      }
      if (onChatSend) onChatSend(text);
    };

    send.addEventListener('click', (e) => {
      // 阻止默认行为与事件继续冒泡，避免 Tabbit 全局监听器抢焦点
      e.preventDefault();
      e.stopPropagation();
      doSend();
    });

    input.addEventListener('keydown', (e) => {
      // 屏蔽 Tabbit「任意按键聚焦地址栏」等全局快捷键的干扰
      e.stopPropagation();
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        doSend();
      }
    });

    // 输入/点击输入框时都阻止事件穿透 Shadow DOM，防止焦点被宿主页面/Tabbit 抢走
    input.addEventListener('keyup', (e) => e.stopPropagation());
    input.addEventListener('keypress', (e) => e.stopPropagation());
    input.addEventListener('input', (e) => e.stopPropagation());
    input.addEventListener('mousedown', (e) => e.stopPropagation());
    input.addEventListener('focus', (e) => e.stopPropagation());
  }

  function clearChatInput() {
    const input = chatInputEl();
    if (!input) return;
    input.value = '';
    input.style.height = 'auto';
  }

  /** 推荐问题容器 */
  function suggestEl() {
    return panel ? panel.querySelector('#rl-suggest') : null;
  }

  /** 按页面类型显示「一键追问」推荐问题，点击后触发 onChatSend */
  function showSuggestions(pageType) {
    const el = suggestEl();
    if (!el) return;
    const items = SUGGESTIONS[pageType];
    if (!items || !items.length) {
      el.style.display = 'none';
      el.innerHTML = '';
      return;
    }

    el.innerHTML = `
      <div class="rl-suggest-title">💬 继续追问</div>
      <div class="rl-suggest-list">
        ${items
          .map((q) => `<button class="rl-suggest-btn" type="button">${escapeHtml(q)}</button>`)
          .join('')}
      </div>
    `;
    el.style.display = 'block';

    el.querySelectorAll('.rl-suggest-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const q = btn.textContent.trim();
        if (q && typeof onChatSend === 'function') onChatSend(q);
      });
    });
  }

  function hideSuggestions() {
    const el = suggestEl();
    if (!el) return;
    el.style.display = 'none';
    el.innerHTML = '';
  }

  fab.addEventListener('click', () => {
    ensurePanel();
    if (typeof onOpen === 'function') onOpen();
  });

  return {
    open: ensurePanel,
    close,
    isOpen: () => Boolean(panel),
    toggle() {
      if (panel) close();
      else fab.click();
    },
    showLoading,
    showError,
    showMarkdown,
    showJSON,
    appendMarkdownStream,
    setActions,
    setSubtitle,
    // 对话
    initChat,
    showChat,
    hideChat,
    appendChatMessage,
    appendThinking,
    setChatBusy,
    clearChatInput,
    showSuggestions,
    hideSuggestions,
  };
}


// ===== module boundary =====

/**
 * index.js — RepoLens 主入口
 *
 * 业务编排：识别页面类型 → 解析内容 → 调用 AI → 渲染结果。
 * 支持三种场景：
 *   1. 仓库首页：仓库速览（简介 / 技术栈 / 目录导航 / 快速上手）
 *   2. 代码文件页：代码解释（选中代码或整个文件）
 *   3. PR 页：Review 摘要（变更摘要 / review 要点 / 风险）
 */




// ---------------------------------------------------------------------------
// Prompt 模板
// ---------------------------------------------------------------------------

const PROMPTS = {
  repo: {
    jsonView: 'repo',
    system:
      '你是一名资深软件工程师，正在快速评估一个 GitHub 仓库。请严格输出 JSON（不要输出 Markdown，不要代码块围栏，不要多余文字），使用简洁、专业的中文。',
    buildUser: (ctx) => `请基于以下仓库信息，输出一份「仓库速览」，严格按下面的 JSON 结构返回（字段固定，不要增删）：

{
  "summary": "一句话说明这个仓库是做什么的",
  "techStack": ["语言/框架/关键依赖，逐个列出"],
  "directory": [
    { "name": "核心目录或文件名", "role": "该目录职责简述" }
  ],
  "quickStart": ["安装/运行步骤，逐条列出"],
  "highlights": ["这个仓库值得关注的点，可选"]
}

仓库：${ctx.repo}
描述：${ctx.desc || '（无）'}
语言：${ctx.lang || '（未知）'}
Star：${ctx.stars || '（未知）'}

README 正文（可能截断）：
${ctx.readme || '（无 README）'}

文件树（顶层）：
${ctx.fileTree.join('\n') || '（未获取到）'}`,
  },

  code: {
    system:
      '你是一名资深工程师，擅长用通俗易懂的中文讲解代码。请简洁、结构化地输出，使用 Markdown。',
    buildUser: (ctx, snippet) => {
      const code = snippet || ctx.code;
      const isSnippet = Boolean(snippet);
      const scope = isSnippet ? '这段代码' : '这个文件';
      return `请解释${scope}：

## 作用
用一句话说明${scope}做了什么。

## 逻辑拆解
分步骤拆解关键逻辑。

## 注意点
指出潜在问题、易错点或优化建议（如有）。

文件路径：${ctx.path || '（未知）'}
仓库：${ctx.repo}

代码：
\`\`\`
${code}
\`\`\``;
    },
  },

  pull: {
    system:
      '你是一名资深 code reviewer，正在审查一个 GitHub Pull Request。请用中文输出结构化 review 摘要，使用 Markdown。',
    buildUser: (ctx) => `请基于以下 PR 信息，输出 review 摘要：

## 变更摘要
说明这个 PR 做了什么改动。

## Review 要点
列出需要重点关注的方面。

## 潜在风险
指出可能的风险或需要注意的问题（如有）。

仓库：${ctx.repo}
PR 标题：${ctx.title}
PR 描述：${ctx.body || '（无描述）'}
变更文件：
${ctx.files.join('\n') || '（未获取到）'}
增删统计：+${ctx.stats.additions || '?'} / -${ctx.stats.deletions || '?'}`,
  },

  issue: {
    jsonView: 'issue',
    system:
      '你是一名资深开源项目维护者，正在快速理解一个 GitHub Issue。请严格输出 JSON（不要输出 Markdown，不要代码块围栏，不要多余文字），使用简洁、专业的中文。',
    buildUser: (ctx) => `请基于以下 Issue 信息，输出一份「Issue 解读」，严格按下面的 JSON 结构返回：

{
  "summary": "用一句话说明这个 Issue 反馈了什么问题或需求",
  "type": "bug / feature / question / other 中的一个",
  "impact": "影响范围或紧急程度判断（可简要）",
  "actionItems": ["建议的处理步骤或需要进一步确认的信息"]
}

仓库：${ctx.repo}
Issue 标题：${ctx.title}
Issue 描述：${ctx.body || '（无描述）'}
标签：${ctx.labels.join(', ') || '（无）'}
评论（前几条）：
${ctx.comments.join('\n\n') || '（无评论）'}`,
  },

  arch: {
    jsonView: 'arch',
    system:
      '你是一名资深软件架构师，正在分析一个 GitHub 仓库的架构设计。请严格输出 JSON（不要输出 Markdown，不要代码块围栏，不要多余文字），使用简洁、专业的中文。',
    buildUser: (ctx) => `请基于以下仓库信息，输出一份「架构分析」，严格按下面的 JSON 结构返回：

{
  "overview": "用 2-3 句话概括整体架构风格（如分层/模块化/微服务/事件驱动等）",
  "modules": [
    { "name": "核心模块/目录名", "responsibility": "职责", "deps": ["依赖的其他模块（可选）"] }
  ],
  "dataFlow": "数据或请求在模块间如何流转（用文字简述关键链路）",
  "patterns": ["识别出的设计模式或架构模式"],
  "suggestions": ["架构层面的改进或风险建议（可选）"],
  "mermaid": "一段 Mermaid 图代码（flowchart TD），用图形化展示核心模块及其依赖关系，节点用模块名，不要包含 Markdown 代码块围栏"
}

仓库：${ctx.repo}
描述：${ctx.desc || '（无）'}
语言：${ctx.lang || '（未知）'}

README 正文（可能截断）：
${ctx.readme || '（无 README）'}

文件树（完整相对路径）：
${ctx.fileTree.join('\n') || '（未获取到）'}`,
  },
};

// ---------------------------------------------------------------------------
// 主控制器
// ---------------------------------------------------------------------------

// ui 延迟到 DOM 就绪后再初始化（避免脚本注入时 document.body 尚不存在）
let ui = null;

// 对话会话状态：记录当前页面的上下文快照 + 历史对话
let chatState = {
  pageType: '',
  context: null, // 当前页面的解析上下文（repo/blob/pull/issue）
  history: [], // [{ role: 'user' | 'assistant', content }]
};

const CHAT_SYSTEM =
  '你是 RepoLens，一个嵌入在 GitHub 页面中的代码理解助手。请基于提供的仓库/代码上下文，用简洁、专业的中文回答用户问题，使用 Markdown 格式（代码用代码块）。若问题超出已知上下文，请说明你不确定，不要编造。';

/** 把页面上下文压缩为可复用的文本快照 */
function buildContextSnapshot() {
  const type = detectPageType();
  if (type === 'repo') {
    const ctx = extractRepoContext();
    chatState.context = ctx;
    return `[仓库首页]
仓库：${ctx.repo}
描述：${ctx.desc || '（无）'}
语言：${ctx.lang || '（未知）'}
README（截断）：
${ctx.readme || '（无）'}
文件树：
${ctx.fileTree.join('\n') || '（未获取到）'}`;
  }
  if (type === 'blob') {
    const ctx = extractCodeContext();
    chatState.context = ctx;
    return `[代码文件页]
仓库：${ctx.repo}
文件路径：${ctx.path || '（未知）'}
代码：
\`\`\`
${ctx.code || '（未获取到）'}
\`\`\``;
  }
  if (type === 'pull') {
    const ctx = extractPRContext();
    chatState.context = ctx;
    return `[PR 页]
仓库：${ctx.repo}
PR 标题：${ctx.title}
PR 描述：${ctx.body || '（无）'}
变更文件：
${ctx.files.join('\n') || '（未获取到）'}`;
  }
  if (type === 'issue') {
    const ctx = extractIssueContext();
    chatState.context = ctx;
    return `[Issue 页]
仓库：${ctx.repo}
Issue 标题：${ctx.title}
描述：${ctx.body || '（无）'}
标签：${ctx.labels.join(', ') || '（无）'}`;
  }
  return '';
}

/** 处理用户追问 */
async function runChat(question) {
  if (!question) return;

  // 开始对话后隐藏推荐问题，避免遮挡对话流
  ui.hideSuggestions();

  // 用户气泡
  ui.appendChatMessage('user', question);
  ui.clearChatInput();

  const thinking = ui.appendThinking();
  ui.setChatBusy(true);

  try {
    // 首次对话或页面切换时，重建上下文快照
    const pageType = detectPageType();
    if (chatState.pageType !== pageType || !chatState.history.length) {
      chatState.pageType = pageType;
      chatState.history = [];
    }

    const snapshot = buildContextSnapshot();
    const historyBlock = chatState.history
      .slice(-6) // 只保留最近 6 条，控制 token
      .map((m) => `${m.role === 'user' ? '用户' : '助手'}：${m.content}`)
      .join('\n\n');

    const user = `以下是当前 GitHub 页面的上下文：

${snapshot || '（无上下文）'}

${historyBlock ? `对话历史：\n${historyBlock}\n\n` : ''}用户新问题：${question}`;

    const answer = await askLLM({ system: CHAT_SYSTEM, user });

    // 移除思考中占位
    thinking.remove();

    chatState.history.push({ role: 'user', content: question });
    chatState.history.push({ role: 'assistant', content: answer });

    ui.appendChatMessage('ai', answer, true);
  } catch (err) {
    thinking.remove();
    ui.appendChatMessage(
      'ai',
      `回答失败：${err?.message || err}`
    );
  } finally {
    ui.setChatBusy(false);
  }
}

/** 针对当前页面执行分析 */
async function runCurrentPage() {
  const type = detectPageType();

  if (type === 'repo') {
    ui.showChat();
    ui.showSuggestions('repo');
    return runRepo();
  }
  if (type === 'blob') {
    ui.showChat();
    ui.showSuggestions('blob');
    return runCode();
  }
  if (type === 'pull') {
    ui.showChat();
    ui.showSuggestions('pull');
    return runPR();
  }
  if (type === 'issue') {
    ui.showChat();
    ui.showSuggestions('issue');
    return runIssue();
  }

  ui.hideChat();
  ui.hideSuggestions();
  ui.showError(
    'RepoLens 支持在 GitHub 仓库首页、代码文件页、PR 页和 Issue 页使用。\n当前页面类型不支持。'
  );
  ui.setActions([]);
}

async function runRepo() {
  const ctx = extractRepoContext();
  ui.setSubtitle(ctx.repo || '仓库速览');
  ui.setActions([
    { label: '重新分析', primary: true, onClick: runRepo },
    { label: '🏛️ 架构分析', onClick: () => runArch(ctx) },
  ]);
  await run(ctx, PROMPTS.repo, undefined, { json: true });
}

async function runArch(ctx) {
  const full = { ...ctx, fileTree: extractDeepFileTree() };
  ui.setSubtitle(`${full.repo || ''} · 架构分析`.trim());
  ui.setActions([
    { label: '📊 仓库速览', primary: true, onClick: runRepo },
    { label: '重新架构分析', onClick: () => runArch(ctx) },
  ]);
  await run(full, PROMPTS.arch, undefined, { json: true });
}

async function runCode() {
  const ctx = extractCodeContext();
  const snippet = getSelectionText();

  ui.setSubtitle(ctx.path || ctx.repo || '代码解释');
  ui.setActions([
    { label: '解释整个文件', primary: true, onClick: () => runCodeFull(ctx) },
    ...(snippet ? [{ label: '解释选中代码', onClick: () => runCodeSnippet(ctx) }] : []),
  ]);
  // 有选中代码时优先解释选中部分，否则解释整个文件
  await run(ctx, PROMPTS.code, snippet);
}

function runCodeFull(ctx) {
  return run(ctx, PROMPTS.code, '');
}
function runCodeSnippet(ctx, text) {
  const snippet = text || getSelectionText();
  if (!snippet) {
    ui.showError('请先选中要解释的代码片段。');
    return Promise.resolve();
  }
  return run(ctx, PROMPTS.code, snippet);
}

async function runPR() {
  const ctx = extractPRContext();
  ui.setSubtitle(ctx.repo || 'PR Review');
  ui.setActions([{ label: '重新分析', primary: true, onClick: runPR }]);
  await run(ctx, PROMPTS.pull);
}

async function runIssue() {
  const ctx = extractIssueContext();
  ui.setSubtitle(ctx.repo || 'Issue 解读');
  ui.setActions([{ label: '重新分析', primary: true, onClick: runIssue }]);
  await run(ctx, PROMPTS.issue, undefined, { json: true });
}

/** 通用执行：loading → 调用 AI → 渲染 */
async function run(ctx, promptDef, snippet, opts = {}) {
  const user = promptDef.buildUser(ctx, snippet);

  ui.showLoading('RepoLens 正在分析…');
  try {
    // JSON 模式：请求结构化输出，拿到整体结果后解析渲染（不走流式）
    // Markdown 模式：优先流式渲染（若 bridge 支持 onDelta，则打字机输出）
    let acc = '';
    const text = await askLLM({
      system: promptDef.system,
      user,
      responseFormat: opts.json ? 'json' : undefined,
      onDelta: opts.json
        ? undefined
        : (chunk) => {
            acc += chunk;
            ui.appendMarkdownStream(acc);
          },
    });

    if (typeof text === 'string' && text.trim()) {
      // JSON 模式：优先结构化渲染，解析失败自动降级为 Markdown
      if (opts.json) {
        const data = parseJSON(text);
        if (data) {
          ui.showJSON(promptDef.jsonView || 'repo', data);
          return;
        }
        // 降级：按普通 Markdown 渲染
        ui.showMarkdown(text);
        return;
      }

      // Markdown 模式：若 onDelta 未触发（bridge 不支持流式），用整体渲染兜底
      if (!acc.trim()) {
        ui.showMarkdown(text);
      }
    } else {
      ui.showError('AI 返回为空，请重试。');
    }
  } catch (err) {
    ui.showError(
      `分析失败：${err?.message || err}\n\n请确认：\n1. 已安装最新版 Tabbit 浏览器；\n2. 已登录并具备 AI 调用权限。`
    );
  }
}

// ---------------------------------------------------------------------------
// 代码页「选中即解释」浮动按钮
// ---------------------------------------------------------------------------

function initSelectionButton() {
  const btn = document.createElement('button');
  btn.textContent = '🔍 解释';
  btn.style.cssText = `
    position: fixed; z-index: 2147483000; display: none;
    background: #2563eb; color: #fff; border: none; border-radius: 8px;
    padding: 6px 12px; font-size: 13px; cursor: pointer;
    box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  `;
  document.body.appendChild(btn);

  // 缓存选中文本：点击按钮的瞬间浏览器会清空 selection，
  // 因此必须在选中时缓存，点击时读取缓存。
  let cachedSelection = '';

  function hide() {
    btn.style.display = 'none';
    cachedSelection = '';
  }

  btn.addEventListener('click', () => {
    const t = cachedSelection || getSelectionText();
    if (!t) return;
    ui.open();
    runCodeSnippet(extractCodeContext(), t);
    hide();
  });

  // 用鼠标松开坐标定位按钮（GitHub 代码页的 selection rect 因虚拟滚动不可靠）
  document.addEventListener('mouseup', (e) => {
    if (e.target === btn) return; // 点击按钮本身，交给 click 处理
    if (detectPageType() !== 'blob') {
      hide();
      return;
    }
    // 延迟到 selection 稳定后再读取选中文本
    setTimeout(() => {
      const t = getSelectionText();
      if (t.length < 3) {
        hide();
        return;
      }
      cachedSelection = t;
      btn.style.display = 'block';
      btn.style.top = `${Math.max(8, e.clientY - 40)}px`;
      btn.style.left = `${Math.max(8, e.clientX - 20)}px`;
    }, 0);
  });

  // 点击页面别处时隐藏按钮
  document.addEventListener('mousedown', (e) => {
    if (e.target !== btn) hide();
  }, true);

  // 滚动时隐藏（避免按钮停留在错误位置）
  document.addEventListener('scroll', hide, true);
}

// ---------------------------------------------------------------------------
// SPA 导航监听（GitHub 使用 history API 切换页面）
// ---------------------------------------------------------------------------

function initNavigationWatcher() {
  let last = location.href;
  const check = () => {
    if (location.href !== last) {
      last = location.href;
      // 页面切换后，若面板开着，自动按新页面重新分析
      if (ui.isOpen && ui.isOpen()) runCurrentPage();
    }
  };
  // 轮询兜底（GitHub 的 SPA 路由不总是触发 popstate）
  // 测试环境下跳过轮询，避免占用事件循环
  if (!window.__REPOLENS_TEST__) {
    setInterval(check, 1200);
  }
  window.addEventListener('popstate', () => setTimeout(check, 200));
}

// ---------------------------------------------------------------------------
// 启动
// ---------------------------------------------------------------------------

function boot() {
  const isTest = window.__REPOLENS_TEST__ === true;
  if (!isTest && !location.hostname.endsWith('github.com')) return;

  // 确保 body 存在后再初始化 UI（防止脚本注入早于 DOM 构建）
  if (!document.body) {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
    return;
  }

  ui = initUI({ onOpen: () => runCurrentPage() });
  ui.initChat((q) => runChat(q));
  initSelectionButton();
  initNavigationWatcher();
  console.log('[RepoLens] 已就绪。点击右下角 🔍 开始分析当前仓库/代码/PR，并可追问对话。');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}


})();