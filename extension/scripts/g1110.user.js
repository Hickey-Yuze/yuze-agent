/**
 * 一键提取器 — 网页内容一键提取脚本
 * 版本: 1.0.0
 *
 * 功能: 注入到任意网页中，自动提取页面的核心内容（标题、正文、作者、发布时间），
 *       以浮动面板展示并支持复制到剪贴板。
 *
 * 用法:
 *   1. 在浏览器控制台粘贴运行
 *   2. 通过 Tampermonkey / Violentmonkey 注入
 *   3. 打包为 Bookmarklet 书签
 *
 * 兼容: Chrome 90+, Edge 90+, Firefox 90+, Safari 15+
 */

(function () {
  "use strict";

  // ===================== 0. 前置检测 =====================

  // 防止重复注入
  if (window.__TWEX_INJECTED__) return;
  window.__TWEX_INJECTED__ = true;

  var PREFIX = "twex-"; // CSS 前缀，避免与页面样式冲突

  // ===================== 1. 工具函数 =====================

  /**
   * 创建带前缀的 DOM 元素
   */
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "className") {
          node.className = attrs[k];
        } else if (k === "text") {
          node.textContent = attrs[k];
        } else {
          node.setAttribute(k, attrs[k]);
        }
      });
    }
    if (children) {
      if (Array.isArray(children)) {
        children.forEach(function (c) {
          if (c) node.appendChild(c);
        });
      } else {
        node.appendChild(children);
      }
    }
    return node;
  }

  /**
   * 安全转义 HTML 实体，防止 XSS
   */
  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /**
   * 清理 HTML 标签，提取纯文本
   */
  function stripHtml(html) {
    var tmp = document.createElement("div");
    tmp.innerHTML = html;
    // 移除 script/style/link/iframe/nav/aside/footer/header
    tmp.querySelectorAll("script,style,link,iframe,nav,aside,footer,header").forEach(function (n) {
      n.parentNode.removeChild(n);
    });
    return tmp.textContent || "";
  }

  /**
   * 清理 HTML：移除危险标签（script/style），保留安全标签用于富文本渲染
   */
  function sanitizeHtml(html) {
    var tmp = document.createElement("div");
    tmp.innerHTML = html;
    // 移除所有 script 和 style 标签
    tmp.querySelectorAll("script,style").forEach(function (n) {
      n.parentNode.removeChild(n);
    });
    return tmp.innerHTML;
  }

  /**
   * 清理正文 HTML：移除无用标签，保留段落、列表、引用、图片、代码块
   */
  function cleanContent(html) {
    var tmp = document.createElement("div");
    tmp.innerHTML = html;
    // 只移除标签选择器（querySelectorAll 不支持类名前缀）
    var tagSelectors = "script,style,link,iframe,nav,aside,footer,header,a,img,button,input,select,textarea";
    tmp.querySelectorAll(tagSelectors).forEach(function (n) {
      n.parentNode.removeChild(n);
    });
    // 类名选择器单独处理：遍历所有子元素检查 className
    var noiseClassPatterns = [
      "comment", "advertisement", "ad", "social-share", "related-post",
      "tag-cloud", "breadcrumb", "pagination", "share", "sidebar", "widget"
    ];
    var allElements = tmp.querySelectorAll("*");
    for (var i = 0; i < allElements.length; i++) {
      var cls = String(allElements[i].className || "").toLowerCase();
      for (var j = 0; j < noiseClassPatterns.length; j++) {
        if (cls.indexOf(noiseClassPatterns[j]) !== -1) {
          allElements[i].parentNode.removeChild(allElements[i]);
          break;
        }
      }
    }
    // 移除空元素
    (function trimEmpty(node) {
      if (node.nodeType !== 1) return; // 非元素节点跳过
      var children = Array.from(node.childNodes);
      children.forEach(function (child) {
        if (child.nodeType === 1) {
          trimEmpty(child);
          // 移除空块级元素
          if (
            child.textContent.trim() === "" &&
            child.children.length === 0 &&
            ["DIV", "P", "SPAN", "SECTION", "ARTICLE"].indexOf(child.tagName) !== -1
          ) {
            node.removeChild(child);
          }
        }
      });
    })(tmp);
    return tmp.innerHTML;
  }

  /**
   * HTML 转 Markdown 简易转换
   */
  function htmlToMarkdown(html) {
    var text = html;
    // 标题
    text = text.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "# $1\n\n");
    text = text.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "## $1\n\n");
    text = text.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "### $1\n\n");
    text = text.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, "#### $1\n\n");
    // 粗体和斜体
    text = text.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, "**$1**");
    text = text.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, "**$1**");
    text = text.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, "*$1*");
    text = text.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, "*$1*");
    // 引用
    text = text.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, "> $1\n\n");
    // 代码
    text = text.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, "```\n$1\n```\n\n");
    text = text.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, "`$1`");
    // 换行和段落
    text = text.replace(/<br\s*\/?>/gi, "\n");
    text = text.replace(/<\/p>/gi, "\n\n");
    text = text.replace(/<p[^>]*>/gi, "");
    // 移除剩余标签
    text = text.replace(/<[^>]+>/g, "");
    // 清理多余空白
    text = text
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]+/g, " ")
      .trim();
    return text;
  }

  /**
   * 计算字符串的字数
   */
  function wordCount(str) {
    if (!str) return 0;
    var text = str.replace(/\s/g, "");
    return text.length;
  }

  /**
   * 格式化日期
   */
  function formatDate(dateStr) {
    if (!dateStr) return "";
    try {
      var d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      var y = d.getFullYear();
      var m = String(d.getMonth() + 1).padStart(2, "0");
      var day = String(d.getDate()).padStart(2, "0");
      return y + "-" + m + "-" + day;
    } catch (e) {
      return dateStr;
    }
  }

  /**
   * 获取当前页面域名
   */
  function getDomain() {
    return location.hostname || "";
  }

  // ===================== 2. 元数据提取器 =====================

  /**
   * 提取页面元数据
   * 返回 { title, author, date, source }
   */
  function extractMetadata() {
    var meta = {};

    // --- 标题 ---
    meta.title = extractTitle();

    // --- 作者 ---
    meta.author = extractAuthor();

    // --- 发布时间 ---
    meta.date = extractDate();

    // --- 来源 ---
    meta.source = extractSource();

    return meta;
  }

  /**
   * 提取标题：og:title > h1 > title
   */
  function extractTitle() {
    // 1. og:title
    var og = document.querySelector('meta[property="og:title"]');
    if (og && og.getAttribute("content")) return og.getAttribute("content").trim();

    // 2. h1（排除导航栏中的 h1）
    var h1 = document.querySelector("article h1, main h1, [role='article'] h1, .post-content h1, .article-body h1, .entry-content h1");
    if (h1 && h1.textContent.trim()) return h1.textContent.trim();

    // 3. 第一个不在 nav 里的 h1
    var allH1 = document.querySelectorAll("h1");
    for (var i = 0; i < allH1.length; i++) {
      var parent = allH1[i].parentNode;
      var isNav = false;
      while (parent) {
        if (parent.tagName === "NAV" || (parent.className && typeof parent.className === "string" && parent.className.indexOf("nav") !== -1)) {
          isNav = true;
          break;
        }
        parent = parent.parentNode;
        if (!parent || parent === document.body) break;
      }
      if (!isNav && allH1[i].textContent.trim()) {
        return allH1[i].textContent.trim();
      }
    }

    // 4. title 标签
    if (document.title) return document.title.trim();

    return "";
  }

  /**
   * 提取作者
   */
  function extractAuthor() {
    // 1. <meta name="author">
    var m = document.querySelector('meta[name="author"]');
    if (m && m.getAttribute("content")) return m.getAttribute("content").trim();

    // 2. article:author
    m = document.querySelector('meta[property="article:author"]');
    if (m && m.getAttribute("content")) return m.getAttribute("content").trim();

    // 3. schema.org JSON-LD
    var ldScripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (var i = 0; i < ldScripts.length; i++) {
      try {
        var data = JSON.parse(ldScripts[i].textContent);
        var author = extractAuthorFromSchema(data);
        if (author) return author;
      } catch (e) {
        // ignore
      }
    }

    // 4. 类名匹配
    var selectors = [".author", ".byline", "[class*='author']", "[class*='byline']", ".post-author", ".article-author"];
    for (var j = 0; j < selectors.length; j++) {
      var node = document.querySelector(selectors[j]);
      if (node && node.textContent.trim()) {
        var txt = node.textContent.trim();
        // 去掉常见的"作者："前缀
        txt = txt.replace(/^作者[:：]\s*/, "").replace(/^By\s*/i, "");
        if (txt.length > 0 && txt.length < 50) return txt;
      }
    }

    return "";
  }

  /**
   * 从 schema.org 数据中递归提取作者
   */
  function extractAuthorFromSchema(data) {
    if (!data) return "";
    if (data.author) {
      if (typeof data.author === "string") return data.author;
      if (data.author.name) return data.author.name;
      if (Array.isArray(data.author)) {
        for (var i = 0; i < data.author.length; i++) {
          if (data.author[i].name) return data.author[i].name;
        }
      }
    }
    if (data.about && data.about.author) {
      if (typeof data.about.author === "string") return data.about.author;
      if (data.about.author.name) return data.about.author.name;
    }
    // 递归子对象
    var keys = Object.keys(data);
    for (var k = 0; k < keys.length; k++) {
      var result = extractAuthorFromSchema(data[keys[k]]);
      if (result) return result;
    }
    return "";
  }

  /**
   * 提取发布时间
   */
  function extractDate() {
    // 1. article:published_time
    var m = document.querySelector('meta[property="article:published_time"]');
    if (m && m.getAttribute("content")) return formatDate(m.getAttribute("content").trim());

    // 2. article:published_date
    m = document.querySelector('meta[property="article:published_date"]');
    if (m && m.getAttribute("content")) return formatDate(m.getAttribute("content").trim());

    // 3. <time datetime="...">
    var timeEl = document.querySelector('time[datetime]');
    if (timeEl && timeEl.getAttribute("datetime")) return formatDate(timeEl.getAttribute("datetime").trim());

    // 4. schema.org JSON-LD
    var ldScripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (var i = 0; i < ldScripts.length; i++) {
      try {
        var data = JSON.parse(ldScripts[i].textContent);
        var dateVal = extractDateFromSchema(data);
        if (dateVal) return formatDate(dateVal);
      } catch (e) {
        // ignore
      }
    }

    // 5. 类名匹配
    var dateSelectors = [
      ".publish-date",
      ".post-date",
      ".article-date",
      "[class*='publish']",
      "[class*='post-date']",
      "time:not([datetime])",
    ];
    for (var j = 0; j < dateSelectors.length; j++) {
      var node = document.querySelector(dateSelectors[j]);
      if (node && node.textContent.trim()) {
        var txt = node.textContent.trim();
        // 尝试提取日期部分
        var dateMatch = txt.match(/(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/);
        if (dateMatch) return formatDate(dateMatch[1]);
      }
    }

    // 6. 全局日期正则（在正文附近查找）
    var article = document.querySelector("article, main, [role='article']");
    if (article) {
      var textContent = article.textContent;
      var dateRegex = /(\d{4}[-\/年]\d{1,2}[-\/月]\d{1,2}[日号]?)/;
      var match = dateRegex.exec(textContent);
      if (match) {
        var cleaned = match[1].replace(/年|月/g, "-").replace(/日|号/, "");
        return formatDate(cleaned);
      }
    }

    return "";
  }

  /**
   * 从 schema.org 数据中提取日期
   */
  function extractDateFromSchema(data) {
    if (!data) return "";
    if (data.datePublished) return data.datePublished;
    if (data.dateCreated) return data.dateCreated;
    if (data.publishDate) return data.publishDate;
    if (data.eventDate) return data.eventDate;
    if (data.about && data.about.datePublished) return data.about.datePublished;
    // 递归
    var keys = Object.keys(data);
    for (var i = 0; i < keys.length; i++) {
      var result = extractDateFromSchema(data[keys[i]]);
      if (result) return result;
    }
    return "";
  }

  /**
   * 提取来源域名
   */
  function extractSource() {
    // 1. og:site_name
    var m = document.querySelector('meta[property="og:site_name"]');
    if (m && m.getAttribute("content")) return m.getAttribute("content").trim();
    // 2. 域名
    return getDomain();
  }

  // ===================== 3. 正文内容识别器 =====================

  /**
   * 提取正文内容
   * 返回 { html: 清理后的 HTML, text: 纯文本, confidence: 置信度 0-1 }
   */
  function extractContent() {
    // 第一层：语义标签优先
    var semanticResult = extractBySemantics();
    if (semanticResult && semanticResult.score > 0.5) {
      return semanticResult;
    }

    // 第二层：文本密度分析
    var densityResult = extractByTextDensity();
    if (densityResult && densityResult.score > 0.3) {
      return densityResult;
    }

    // 第三层：启发式回退 — 取最大连续文本块
    var fallbackResult = extractByFallback();
    return fallbackResult || { html: "", text: "", score: 0 };
  }

  /**
   * 第一层：通过语义化标签和常见类名查找正文
   */
  function extractBySemantics() {
    // 常见正文元素的类名/标签
    var selectors = [
      "article",
      "main",
      "[role='article']",
      ".post-content",
      ".article-body",
      ".entry-content",
      ".entry-body",
      ".post_body",
      ".article_content",
      ".content-article",
      ".blog-content",
      ".markdown-content",
      ".rich_content",
      "#articleContent",
      "#article_content",
      "#post_content",
      "#content",
      ".post",
      ".article",
      ".entry",
      ".story-body",
      ".article-body-inner",
      ".post-body",
      ".post-body-inner",
      ".article__body",
      ".content__body",
      ".blog-post-body",
      ".news-body",
      ".text-body",
    ];

    // 特定网站的特殊选择器
    var siteSelectors = {
      zhihu: ["#post-content", ".rst-content", ".md-editor-preview-wrapper"],
      weixin: ["#js_content", "#content"],
      juejin: [".article-content", ".markdown-viewer"],
      csdn: ["#content_views", ".article_content"],
      cnblogs: ["#cnblogs_post_body", ".post_body"],
      segmentfault: [".article_content", ".post-content"],
      jianshu: [".show-content", ".article"],
      infoq: [".article-content", ".ContentArea"],
      "_36kr": [".article-box", ".main-content", ".original-conent"],
      thdpaper: [".article-detail", ".detail-content"],
      douyin: [".content-default", ".text-default"],
      toutiao: [".area-main", ".article-content", ".indexPageContent"],
      sina: [".articalMain", ".article", ".artical_main"],
      qq: [".p-detail", ".context-wrap", ".article", ".ep-content"],
      netease: [".ep-content", ".post_content", ".mod-content"],
      hujiang: [".page-article-text", ".article-detail"],
      guokr: [".article-content", ".content-area"],
      ifanr: [".article-content", ".post-content"],
      mpweixin: ["#js_content"],
    };

    // 尝试网站特定选择器
    var host = location.hostname || "";
    Object.keys(siteSelectors).forEach(function (key) {
      var pattern = key.replace("_", "");
      if (host === pattern || host.endsWith("." + pattern)) {
        selectors = selectors.concat(siteSelectors[key]);
      }
    });

    var bestNode = null;
    var bestScore = 0;

    selectors.forEach(function (sel) {
      var nodes = document.querySelectorAll(sel);
      nodes.forEach(function (node) {
        // 排除导航、侧边栏、页脚等
        if (isNoiseElement(node)) return;

        var text = node.textContent || "";
        var cleanText = text.replace(/\s+/g, "").replace(/[^\w一-鿿]/g, "");
        if (cleanText.length < 100) return; // 太短跳过

        var score = calculateSemanticScore(node, cleanText.length);
        if (score > bestScore) {
          bestScore = score;
          bestNode = node;
        }
      });
    });

    if (bestNode) {
      var html = bestNode.innerHTML;
      var text = stripHtml(html);
      return { html: html, text: text, score: bestScore };
    }

    return null;
  }

  /**
   * 判断是否为噪声元素（导航、侧边栏、广告等）
   */
  function isNoiseElement(node) {
    if (!node || !node.tagName) return true;
    var tagName = node.tagName.toLowerCase();
    if (["nav", "aside", "footer", "header", "script", "style", "noscript", "form"].indexOf(tagName) !== -1) {
      return true;
    }
    var className = String(node.className || "").toLowerCase();
    var noiseClasses = [
      "nav",
      "menu",
      "sidebar",
      "ad",
      "advertisement",
      "comment",
      "comments",
      "share",
      "social",
      "footer",
      "header",
      "banner",
      "widget",
      "related",
      "recommend",
      "tags",
      "tag",
      "breadcrumb",
      "pagination",
      "pager",
      "toolbar",
      "tool-bar",
      "bottom-bar",
      "top-bar",
      "fixed",
      "popup",
      "modal",
    ];
    for (var i = 0; i < noiseClasses.length; i++) {
      if (className.indexOf(noiseClasses[i]) !== -1) return true;
    }
    return false;
  }

  /**
   * 计算语义标签的得分
   */
  function calculateSemanticScore(node, textLen) {
    var score = 0;
    // 标签权重
    var tagName = node.tagName.toLowerCase();
    if (tagName === "article") score += 3;
    else if (tagName === "main") score += 2;
    else if (node.getAttribute("role") === "article") score += 2;

    // 类名权重
    var className = (node.className || "").toLowerCase();
    if (className.indexOf("content") !== -1) score += 2;
    if (className.indexOf("article") !== -1) score += 2;
    if (className.indexOf("post") !== -1) score += 1;
    if (className.indexOf("entry") !== -1) score += 1;

    // 文本长度加分
    if (textLen > 500) score += 1;
    if (textLen > 2000) score += 1;
    if (textLen > 5000) score += 1;

    // 段落数量加分
    var pCount = node.querySelectorAll("p").length;
    if (pCount > 3) score += 1;

    // 排除噪声
    if (isNoiseElement(node)) score = 0;

    return Math.min(score / 15, 1); // 归一化到 0-1
  }

  /**
   * 第二层：文本密度分析（改良版 Readability）
   */
  function extractByTextDensity() {
    var candidates = [];
    var body = document.body;
    if (!body) return null;

    // 遍历所有块级元素
    var allNodes = body.querySelectorAll("div, section, article, main, aside, header, footer, figure, blockquote, pre, table, details");

    for (var i = 0; i < allNodes.length; i++) {
      var node = allNodes[i];

      // 跳过噪声元素
      if (isNoiseElement(node)) continue;

      // 跳过太小或太短的元素
      var text = node.textContent || "";
      var cleanText = text.replace(/\s+/g, "");
      if (cleanText.length < 100) continue;

      // 计算文本密度
      var charCount = cleanText.length;
      var linkCount = 0;
      var linkTextTotal = 0;
      var links = node.querySelectorAll("a");
      for (var j = 0; j < links.length; j++) {
        linkTextTotal += (links[j].textContent || "").replace(/\s+/g, "").length;
      }
      linkCount = links.length;

      // 链接稀疏度：正文中链接占比不应过高
      var linkRatio = charCount > 0 ? linkTextTotal / charCount : 0;
      if (linkRatio > 0.5) continue; // 链接太多，可能是导航或推荐

      // 计算段落数量
      var pCount = node.querySelectorAll("p").length;
      var liCount = node.querySelectorAll("li").length;
      var paragraphCount = pCount + Math.floor(liCount / 3);

      // 综合评分：文本长度 + 段落数 - 链接密度惩罚
      var score =
        Math.log(charCount + 1) *
        Math.log(paragraphCount + 1) *
        (1 - linkRatio);

      // 对 article/main 给予额外加分
      if (node.tagName === "ARTICLE" || node.tagName === "MAIN") {
        score *= 1.5;
      }

      candidates.push({
        node: node,
        score: score,
        text: text,
        charCount: charCount,
        paragraphCount: paragraphCount,
      });
    }

    if (candidates.length === 0) return null;

    // 按分数排序，取最高分
    candidates.sort(function (a, b) {
      return b.score - a.score;
    });

    var best = candidates[0];

    // 如果最佳候选的段落数太少，可能不是正文
    if (best.paragraphCount < 2) return null;

    // 计算置信度
    var confidence = Math.min(best.score / 30, 1);

    return {
      html: best.node.innerHTML,
      text: best.text,
      score: confidence,
    };
  }

  /**
   * 第三层：启发式回退 — 取页面中最大的连续文本块
   */
  function extractByFallback() {
    var body = document.body;
    if (!body) return null;

    // 获取 body 下所有一级子元素
    var children = Array.from(body.children);
    var bestNode = null;
    var bestLen = 0;

    children.forEach(function (child) {
      if (isNoiseElement(child)) return;
      var text = child.textContent || "";
      var cleanText = text.replace(/\s+/g, "");
      if (cleanText.length > bestLen && cleanText.length > 200) {
        bestLen = cleanText.length;
        bestNode = child;
      }
    });

    if (bestNode) {
      return {
        html: bestNode.innerHTML,
        text: stripHtml(bestNode.innerHTML),
        score: Math.min(bestLen / 5000, 0.8),
      };
    }

    // 终极回退：直接从 body 提取
    var bodyText = body.textContent || "";
    var cleanBodyText = bodyText.replace(/\s+/g, "").replace(/[^\w一-鿿]/g, "");
    if (cleanBodyText.length > 200) {
      return {
        html: body.innerHTML,
        text: bodyText,
        score: 0.2,
      };
    }

    return null;
  }

  // ===================== 4. 格式转换器 =====================

  /**
   * 格式化输出
   * @param {Object} metadata - { title, author, date, source }
   * @param {string} contentHtml - 正文 HTML
   * @param {string} contentText - 正文纯文本
   * @param {string} format - "markdown" | "text" | "json"
   */
  function formatOutput(metadata, contentHtml, contentText, format) {
    var title = escapeHtml(metadata.title || "");
    var author = escapeHtml(metadata.author || "");
    var date = escapeHtml(metadata.date || "");
    var source = escapeHtml(metadata.source || "");
    var wc = wordCount(contentText);

    if (format === "json") {
      var obj = {
        title: metadata.title || "",
        author: metadata.author || "",
        publishedDate: metadata.date || "",
        source: metadata.source || "",
        content: contentText || "",
        wordCount: wc,
      };
      return JSON.stringify(obj, null, 2);
    }

    if (format === "text") {
      var lines = [];
      lines.push("标题：" + title);
      if (author) lines.push("作者：" + author);
      if (date) lines.push("时间：" + date);
      if (source) lines.push("来源：" + source);
      lines.push("");
      lines.push(contentText || "(未能提取到正文内容)");
      lines.push("");
      lines.push("---");
      lines.push("由「一键提取器」提取 · " + wc + " 字");
      return lines.join("\n");
    }

    // 默认：Markdown 格式
    var lines = [];
    lines.push("# " + title);
    lines.push("");
    var metaParts = [];
    if (author) metaParts.push("作者：" + author);
    if (date) metaParts.push("发布于：" + date);
    if (source) metaParts.push("来源：" + source);
    if (metaParts.length > 0) {
      lines.push("> " + metaParts.join(" | "));
      lines.push("");
    }

    // 将 HTML 转为 Markdown
    var mdContent = htmlToMarkdown(contentHtml);
    if (mdContent) {
      lines.push(mdContent);
    } else {
      lines.push(contentText || "(未能提取到正文内容)");
    }

    lines.push("");
    lines.push("---");
    lines.push("_由「一键提取器」提取 · " + wc + " 字_");
    return lines.join("\n");
  }

  // ===================== 5. 面板管理器 =====================

  var panelState = {
    visible: false,
    collapsed: false,
    format: "markdown",
    extractedData: null,
    container: null,
  };

  /**
   * 创建浮动面板
   */
  function createPanel() {
    // 移除旧面板（如果有）
    removePanel();

    var container = el("div", {
      className: PREFIX + "container",
    });

    // --- 标题栏 ---
    var header = el("div", {
      className: PREFIX + "header",
    });
    var headerLeft = el("span", {
      className: PREFIX + "header-title",
      text: "📄 一键提取器",
    });
    var headerRight = el("div", { className: PREFIX + "header-actions" });
    var collapseBtn = el("button", {
      className: PREFIX + "btn-collapse",
      text: "◀",
      title: "收起面板",
    });
    var closeBtn = el("button", {
      className: PREFIX + "btn-close",
      text: "×",
      title: "关闭面板",
    });
    headerRight.appendChild(collapseBtn);
    headerRight.appendChild(closeBtn);
    header.appendChild(headerLeft);
    header.appendChild(headerRight);
    container.appendChild(header);

    // --- 格式切换 Tabs ---
    var tabsBar = el("div", {
      className: PREFIX + "tabs",
    });
    var formats = [
      { key: "markdown", label: "Markdown" },
      { key: "text", label: "纯文本" },
      { key: "json", label: "JSON" },
    ];
    formats.forEach(function (f) {
      var btn = el("button", {
        className: PREFIX + "tab-btn" + (panelState.format === f.key ? " " + PREFIX + "tab-active" : ""),
        text: f.label,
        "data-format": f.key,
      });
      tabsBar.appendChild(btn);
    });
    container.appendChild(tabsBar);

    // --- 元数据区 ---
    var metaSection = el("div", {
      className: PREFIX + "meta-section",
    });
    var titleInput = el("input", {
      className: PREFIX + "title-input",
      type: "text",
      placeholder: "文章标题",
    });
    var metaRow = el("div", {
      className: PREFIX + "meta-row",
    });
    var metaText = el("span", {
      className: PREFIX + "meta-text",
      text: "作者：-- | 时间：-- | 来源：--",
    });
    metaSection.appendChild(titleInput);
    metaSection.appendChild(metaRow);
    metaRow.appendChild(metaText);
    container.appendChild(metaSection);

    // --- 正文预览区 ---
    var contentSection = el("div", {
      className: PREFIX + "content-section",
    });
    var contentPreview = el("div", {
      className: PREFIX + "content-preview",
    });
    contentSection.appendChild(contentPreview);
    container.appendChild(contentSection);

    // --- 操作栏 ---
    var footer = el("div", {
      className: PREFIX + "footer",
    });
    var copyBtn = el("button", {
      className: PREFIX + "btn-copy",
      text: "📋 复制到剪贴板",
    });
    var wordCountLabel = el("span", {
      className: PREFIX + "word-count",
      text: "字数：--",
    });
    footer.appendChild(copyBtn);
    footer.appendChild(wordCountLabel);
    container.appendChild(footer);

    // --- 拖拽手柄 ---
    var dragHandle = el("div", {
      className: PREFIX + "drag-handle",
    });
    container.appendChild(dragHandle);

    document.body.appendChild(container);
    panelState.container = container;

    // 绑定事件
    bindPanelEvents(container, titleInput, metaText, contentPreview, copyBtn, wordCountLabel);

    return container;
  }

  /**
   * 绑定面板事件
   */
  function bindPanelEvents(container, titleInput, metaText, contentPreview, copyBtn, wordCountLabel) {
    // 关闭按钮
    container.querySelector("." + PREFIX + "btn-close").addEventListener("click", function () {
      hidePanel();
    });

    // 收起/展开
    container.querySelector("." + PREFIX + "btn-collapse").addEventListener("click", function () {
      toggleCollapse();
    });

    // 格式切换
    container.querySelectorAll("." + PREFIX + "tab-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var fmt = btn.getAttribute("data-format");
        if (fmt === panelState.format) return;
        panelState.format = fmt;
        // 更新 tab 样式
        container.querySelectorAll("." + PREFIX + "tab-btn").forEach(function (b) {
          b.classList.remove(PREFIX + "tab-active");
        });
        btn.classList.add(PREFIX + "tab-active");
        // 重新渲染
        refreshPanel();
      });
    });

    // 复制按钮
    copyBtn.addEventListener("click", function () {
      doCopy(copyBtn, wordCountLabel);
    });

    // 拖拽功能
    makeDraggable(container, container.querySelector("." + PREFIX + "drag-handle"));
  }

  /**
   * 使元素可拖拽
   */
  function makeDraggable(node, handle) {
    var isDragging = false;
    var startX, startY, origLeft, origTop;
    var onMouseMove, onMouseUp;

    onMouseMove = function (e) {
      if (!isDragging) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      node.style.left = origLeft + dx + "px";
      node.style.top = origTop + dy + "px";
      node.style.right = "auto";
    };

    onMouseUp = function () {
      if (isDragging) {
        isDragging = false;
        handle.style.cursor = "grab";
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      }
    };

    handle.addEventListener("mousedown", function (e) {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      var rect = node.getBoundingClientRect();
      origLeft = rect.left;
      origTop = rect.top;
      handle.style.cursor = "grabbing";
      e.preventDefault();
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });
  }

  /**
   * 刷新面板内容
   */
  function refreshPanel() {
    if (!panelState.extractedData) return;

    var data = panelState.extractedData;
    var container = panelState.container;
    if (!container) return;

    var titleInput = container.querySelector("." + PREFIX + "title-input");
    var metaText = container.querySelector("." + PREFIX + "meta-text");
    var contentPreview = container.querySelector("." + PREFIX + "content-preview");
    var wordCountLabel = container.querySelector("." + PREFIX + "word-count");
    var copyBtn = container.querySelector("." + PREFIX + "btn-copy");

    // 标题
    titleInput.value = data.metadata.title || "";

    // 元数据
    var metaParts = [];
    if (data.metadata.author) metaParts.push("作者：" + data.metadata.author);
    if (data.metadata.date) metaParts.push("时间：" + data.metadata.date);
    if (data.metadata.source) metaParts.push("来源：" + data.metadata.source);
    metaText.textContent = metaParts.length > 0 ? metaParts.join(" | ") : "暂无元数据";

    // 格式化输出
    var formatted = formatOutput(data.metadata, data.contentHtml, data.contentText, panelState.format);
    // Markdown 格式使用 innerHTML 渲染富文本（先 sanitization）
    if (panelState.format === "markdown") {
      contentPreview.innerHTML = sanitizeHtml(formatted);
    } else {
      contentPreview.textContent = formatted;
    }

    // 字数
    var wc = wordCount(data.contentText);
    wordCountLabel.textContent = "字数：" + wc.toLocaleString();

    // 重置复制按钮
    copyBtn.innerHTML = "📋 复制到剪贴板";
    copyBtn.disabled = false;

    // 低置信度警告
    var warningEl = container.querySelector("." + PREFIX + "warning");
    if (warningEl) warningEl.parentNode.removeChild(warningEl);
    if (data.confidence < 0.5) {
      var warning = el("div", {
        className: PREFIX + "warning",
        text: "⚠️ 识别可能不完整，建议对照原文检查",
      });
      warning.style.cssText = "padding:6px 12px;background:#FFF3CD;color:#856404;font-size:12px;border-bottom:1px solid #FFE69D;";
      container.insertBefore(warning, container.firstChild.nextSibling);
    }
  }

  /**
   * 执行复制
   */
  function doCopy(btn, wordCountLabel) {
    if (!panelState.extractedData) return;

    var data = panelState.extractedData;
    var titleVal = data.container
      ? data.container.querySelector("." + PREFIX + "title-input").value
      : data.metadata.title || "";

    // 用编辑后的标题重新格式化
    var metadata = Object.assign({}, data.metadata, { title: titleVal });
    var formatted = formatOutput(metadata, data.contentHtml, data.contentText, panelState.format);

    copyToClipboard(formatted).then(function () {
      btn.innerHTML = "✓ 已复制";
      btn.disabled = true;
      var origWordCount = wordCountLabel ? wordCountLabel.textContent : "";
      if (wordCountLabel) {
        wordCountLabel.textContent = "已复制到剪贴板";
      }
      setTimeout(function () {
        btn.innerHTML = "📋 复制到剪贴板";
        btn.disabled = false;
        if (wordCountLabel) wordCountLabel.textContent = origWordCount;
      }, 1500);
    }).catch(function () {
      btn.innerHTML = "✗ 复制失败";
      setTimeout(function () {
        btn.innerHTML = "📋 复制到剪贴板";
      }, 2000);
    });
  }

  /**
   * 复制到剪贴板（兼容 Clipboard API 和 execCommand fallback）
   */
  function copyToClipboard(text) {
    return new Promise(function (resolve, reject) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(resolve).catch(reject);
      } else {
        // fallback: 创建一个临时 textarea
        var textarea = document.createElement("textarea");
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        textarea.style.top = "-9999px";
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        try {
          var success = document.execCommand("copy");
          document.body.removeChild(textarea);
          if (success) resolve();
          else reject(new Error("execCommand copy failed"));
        } catch (e) {
          document.body.removeChild(textarea);
          reject(e);
        }
      }
    });
  }

  /**
   * 收起/展开面板
   */
  function toggleCollapse() {
    var container = panelState.container;
    if (!container) return;

    panelState.collapsed = !panelState.collapsed;

    if (panelState.collapsed) {
      container.classList.add(PREFIX + "collapsed");
      container.querySelector("." + PREFIX + "btn-collapse").textContent = "▶";
    } else {
      container.classList.remove(PREFIX + "collapsed");
      container.querySelector("." + PREFIX + "btn-collapse").textContent = "◀";
    }
  }

  /**
   * 显示面板
   */
  function showPanel() {
    if (panelState.visible) return;

    // 如果还没有提取过数据，先提取
    if (!panelState.extractedData) {
      performExtraction();
    }

    var container = createPanel();
    panelState.visible = true;
    panelState.container = container;
    refreshPanel();
  }

  /**
   * 隐藏面板
   */
  function hidePanel() {
    removePanel();
    panelState.visible = false;
    panelState.collapsed = false;
  }

  /**
   * 移除面板（完全清理，不留痕迹）
   */
  function removePanel() {
    if (panelState.container && panelState.container.parentNode) {
      panelState.container.parentNode.removeChild(panelState.container);
    }
    panelState.container = null;
    panelState.visible = false;
    panelState.collapsed = false;
    // 清理悬浮按钮
    removeFloatingButton();
    // 清理快捷键监听器
    unbindKeyboardShortcut();
    // 清理预提取定时器
    if (panelState.preloadTimer) {
      clearTimeout(panelState.preloadTimer);
      panelState.preloadTimer = null;
    }
  }

  /**
   * 执行内容提取
   */
  function performExtraction() {
    // 提取元数据
    var metadata = extractMetadata();

    // 提取正文
    var content = extractContent();

    panelState.extractedData = {
      metadata: metadata,
      contentHtml: content.html || "",
      contentText: content.text || "",
      confidence: content.score || 0,
    };
  }

  // ===================== 6. 悬浮按钮 =====================

  var floatingBtn = null;

  /**
   * 创建悬浮按钮
   */
  function createFloatingButton() {
    var btn = el("button", {
      className: PREFIX + "fab",
      title: "一键提取页面内容",
      text: "📄",
    });

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      if (panelState.visible) {
        hidePanel();
      } else {
        showPanel();
      }
    });

    document.body.appendChild(btn);
    floatingBtn = btn;
  }

  /**
   * 移除悬浮按钮
   */
  function removeFloatingButton() {
    if (floatingBtn && floatingBtn.parentNode) {
      floatingBtn.parentNode.removeChild(floatingBtn);
    }
    floatingBtn = null;
  }

  // ===================== 7. 键盘快捷键 =====================

  var shortcutHandler = null;

  /**
   * 绑定键盘快捷键：Alt+E 切换面板
   */
  function bindKeyboardShortcut() {
    shortcutHandler = function (e) {
      // Alt + E
      if (e.altKey && (e.key === "e" || e.key === "E")) {
        e.preventDefault();
        if (panelState.visible) {
          hidePanel();
        } else {
          showPanel();
        }
      }
      // Esc 关闭面板
      if (e.key === "Escape" && panelState.visible) {
        hidePanel();
      }
    };
    document.addEventListener("keydown", shortcutHandler);
  }

  /**
   * 解绑键盘快捷键
   */
  function unbindKeyboardShortcut() {
    if (shortcutHandler) {
      document.removeEventListener("keydown", shortcutHandler);
      shortcutHandler = null;
    }
  }

  // ===================== 8. CSS 样式 =====================

  var STYLES =
    /* */
    "." +
    PREFIX +
    "container {" +
    "position: fixed;" +
    "top: 60px;" +
    "right: 20px;" +
    "bottom: 80px;" +
    "width: 480px;" +
    "max-width: calc(100vw - 40px);" +
    "z-index: 2147483647;" +
    "background: rgba(255, 255, 255, 0.97);" +
    "backdrop-filter: blur(10px);" +
    "-webkit-backdrop-filter: blur(10px);" +
    "border-radius: 12px;" +
    "box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06);" +
    "display: flex;" +
    "flex-direction: column;" +
    "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;" +
    "font-size: 14px;" +
    "color: #1a1a1a;" +
    "transition: transform 0.3s ease, opacity 0.3s ease;" +
    "overflow: hidden;" +
    "user-select: text;" +
    "}" +
    /* 收起状态 */
    "." +
    PREFIX +
    "container." +
    PREFIX +
    "collapsed ." +
    PREFIX +
    "header {" +
    "border-radius: 12px;" +
    "}" +
    "." +
    PREFIX +
    "container." +
    PREFIX +
    "collapsed ." +
    PREFIX +
    "tabs," +
    "." +
    PREFIX +
    "container." +
    PREFIX +
    "collapsed ." +
    PREFIX +
    "meta-section," +
    "." +
    PREFIX +
    "container." +
    PREFIX +
    "collapsed ." +
    PREFIX +
    "content-section," +
    "." +
    PREFIX +
    "container." +
    PREFIX +
    "collapsed ." +
    PREFIX +
    "footer {" +
    "display: none;" +
    "}" +
    /* 标题栏 */
    "." +
    PREFIX +
    "header {" +
    "display: flex;" +
    "align-items: center;" +
    "justify-content: space-between;" +
    "padding: 12px 16px;" +
    "background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);" +
    "color: white;" +
    "border-radius: 12px 12px 0 0;"
    + "flex-shrink: 0;" +
    "}" +
    "." +
    PREFIX +
    "header-title {" +
    "font-size: 15px;" +
    "font-weight: 600;" +
    "letter-spacing: 0.3px;" +
    "}" +
    "." +
    PREFIX +
    "header-actions {" +
    "display: flex;" +
    "gap: 6px;" +
    "}" +
    "." +
    PREFIX +
    "btn-collapse," +
    "." +
    PREFIX +
    "btn-close {" +
    "background: rgba(255, 255, 255, 0.2);" +
    "border: none;" +
    "color: white;" +
    "width: 28px;" +
    "height: 28px;" +
    "border-radius: 6px;" +
    "cursor: pointer;" +
    "font-size: 14px;" +
    "display: flex;" +
    "align-items: center;" +
    "justify-content: center;" +
    "transition: background 0.2s;" +
    "}" +
    "." +
    PREFIX +
    "btn-collapse:hover," +
    "." +
    PREFIX +
    "btn-close:hover {" +
    "background: rgba(255, 255, 255, 0.35);" +
    "}" +
    /* 格式切换 Tabs */
    "." +
    PREFIX +
    "tabs {" +
    "display: flex;" +
    "border-bottom: 1px solid #eee;" +
    "padding: 0 16px;" +
    "background: #fafafa;" +
    "flex-shrink: 0;" +
    "}" +
    "." +
    PREFIX +
    "tab-btn {" +
    "background: none;" +
    "border: none;" +
    "padding: 10px 16px;" +
    "cursor: pointer;" +
    "font-size: 13px;" +
    "color: #666;" +
    "border-bottom: 2px solid transparent;" +
    "transition: all 0.2s;" +
    "font-family: inherit;" +
    "}" +
    "." +
    PREFIX +
    "tab-btn:hover {" +
    "color: #333;" +
    "}" +
    "." +
    PREFIX +
    "tab-btn." +
    PREFIX +
    "tab-active {" +
    "color: #667eea;" +
    "border-bottom-color: #667eea;" +
    "font-weight: 600;" +
    "}" +
    /* 元数据区 */
    "." +
    PREFIX +
    "meta-section {" +
    "padding: 12px 16px;" +
    "border-bottom: 1px solid #f0f0f0;" +
    "flex-shrink: 0;" +
    "}" +
    "." +
    PREFIX +
    "title-input {" +
    "width: 100%;" +
    "padding: 8px 12px;" +
    "border: 1px solid #e0e0e0;" +
    "border-radius: 6px;" +
    "font-size: 15px;" +
    "font-weight: 600;" +
    "margin-bottom: 8px;" +
    "outline: none;" +
    "transition: border-color 0.2s;" +
    "font-family: inherit;" +
    "box-sizing: border-box;" +
    "}" +
    "." +
    PREFIX +
    "title-input:focus {" +
    "border-color: #667eea;" +
    "}" +
    "." +
    PREFIX +
    "meta-row {"
    + "font-size: 12px;" +
    "color: #888;" +
    "}" +
    /* 正文预览区 */
    "." +
    PREFIX +
    "content-section {"
    + "flex: 1;" +
    "overflow-y: auto;" +
    "padding: 16px;" +
    "min-height: 0;" +
    "}" +
    "." +
    PREFIX +
    "content-preview {" +
    "line-height: 1.8;" +
    "white-space: pre-wrap;" +
    "word-break: break-word;" +
    "font-size: 14px;" +
    "color: #333;" +
    "}" +
    "." +
    PREFIX +
    "content-preview ::selection {" +
    "background: rgba(102, 126, 234, 0.3);" +
    "}" +
    /* 操作栏 */
    "." +
    PREFIX +
    "footer {"
    + "display: flex;" +
    "align-items: center;" +
    "justify-content: space-between;" +
    "padding: 12px 16px;" +
    "border-top: 1px solid #eee;" +
    "background: #fafafa;" +
    "flex-shrink: 0;" +
    "}" +
    "." +
    PREFIX +
    "btn-copy {"
    + "background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);" +
    "color: white;" +
    "border: none;" +
    "padding: 8px 20px;" +
    "border-radius: 6px;" +
    "cursor: pointer;" +
    "font-size: 13px;" +
    "font-weight: 500;" +
    "transition: opacity 0.2s, transform 0.1s;" +
    "font-family: inherit;" +
    "}" +
    "." +
    PREFIX +
    "btn-copy:hover {" +
    "opacity: 0.9;" +
    "}" +
    "." +
    PREFIX +
    "btn-copy:active {" +
    "transform: scale(0.97);" +
    "}" +
    "." +
    PREFIX +
    "btn-copy:disabled {" +
    "opacity: 0.6;" +
    "cursor: not-allowed;" +
    "}" +
    "." +
    PREFIX +
    "word-count {"
    + "font-size: 12px;" +
    "color: #999;" +
    "}" +
    /* 拖拽手柄 */
    "." +
    PREFIX +
    "drag-handle {"
    + "position: absolute;" +
    "left: 0;" +
    "top: 0;" +
    "right: 0;" +
    "height: 48px;" +
    "cursor: grab;" +
    "z-index: 1;" +
    "}" +
    /* 悬浮按钮 */
    "." +
    PREFIX +
    "fab {"
    + "position: fixed;" +
    "bottom: 24px;" +
    "right: 24px;" +
    "width: 52px;" +
    "height: 52px;" +
    "border-radius: 50%;" +
    "background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);" +
    "color: white;" +
    "border: none;" +
    "font-size: 22px;" +
    "cursor: pointer;" +
    "box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);" +
    "z-index: 2147483646;" +
    "transition: transform 0.2s, box-shadow 0.2s;" +
    "display: flex;" +
    "align-items: center;" +
    "justify-content: center;" +
    "padding: 0;" +
    "}" +
    "." +
    PREFIX +
    "fab:hover {" +
    "transform: scale(1.08);" +
    "box-shadow: 0 6px 24px rgba(102, 126, 234, 0.5);" +
    "}" +
    "." +
    PREFIX +
    "fab:active {" +
    "transform: scale(0.95);" +
    "}" +
    /* 滚动条美化 */
    "." +
    PREFIX +
    "content-section::-webkit-scrollbar {"
    + "width: 6px;" +
    "}" +
    "." +
    PREFIX +
    "content-section::-webkit-scrollbar-track {"
    + "background: transparent;" +
    "}" +
    "." +
    PREFIX +
    "content-section::-webkit-scrollbar-thumb {"
    + "background: #d0d0d0;" +
    "border-radius: 3px;" +
    "}" +
    "." +
    PREFIX +
    "content-section::-webkit-scrollbar-thumb:hover {"
    + "background: #b0b0b0;" +
    "}" +
    "";

  /**
   * 注入 CSS 样式
   */
  function injectStyles() {
    var styleId = PREFIX + "styles";
    if (document.getElementById(styleId)) return;

    var style = el("style", {
      id: styleId,
      type: "text/css",
    });
    style.textContent = STYLES;
    document.head.appendChild(style);
  }

  /**
   * 移除 CSS 样式
   */
  function removeStyles() {
    var style = document.getElementById(PREFIX + "styles");
    if (style) style.parentNode.removeChild(style);
  }

  // ===================== 9. 初始化入口 =====================

  /**
   * 初始化脚本
   */
  function init() {
    // 注入样式
    injectStyles();

    // 绑定快捷键
    bindKeyboardShortcut();

    // 创建悬浮按钮
    createFloatingButton();

    // 如果页面已经加载完毕，立即执行提取
    if (document.readyState === "complete" || document.readyState === "interactive") {
      // 延迟一点让 UI 先渲染
      setTimeout(function () {
        // 静默预提取，用户点击时面板直接展示
        performExtractionSilently();
      }, 800);
    } else {
      // 监听页面加载
      document.addEventListener("DOMContentLoaded", function () {
        setTimeout(function () {
          performExtractionSilently();
        }, 1000);
      });
      window.addEventListener("load", function () {
        setTimeout(function () {
          performExtractionSilently();
        }, 500);
      });
    }

    // 监听页面可见性变化，切换回来时重新提取
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden && panelState.visible) {
        performExtraction();
        refreshPanel();
      }
    });
  }

  /**
   * 静默预提取（用户未打开面板时）
   */
  function performExtractionSilently() {
    try {
      performExtraction();
    } catch (e) {
      // 静默失败，不影响页面正常使用
      console.warn("[一键提取器] 预提取失败:", e.message);
    }
  }

  // ===================== 启动 =====================

  // 页面已加载
  if (document.readyState === "complete" || document.readyState === "interactive") {
    init();
  } else {
    // 等待 DOM 就绪
    document.addEventListener("DOMContentLoaded", init);
    // 兜底：window load
    window.addEventListener("load", init);
  }

  // 暴露全局 API，方便 Tampermonkey 等调用
  window.__TWEX_API__ = {
    extract: performExtraction,
    showPanel: showPanel,
    hidePanel: hidePanel,
    setFormat: function (fmt) {
      panelState.format = fmt;
      if (panelState.visible) refreshPanel();
    },
    getFormat: function () {
      return panelState.format;
    },
    destroy: function () {
      hidePanel();
      removeFloatingButton();
      removeStyles();
      delete window.__TWEX_API__;
      delete window.__TWEX_INJECTED__;
    },
  };
})();