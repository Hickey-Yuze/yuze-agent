// ==UserScript==
// @name         TripReader 旅游攻略结构化助手
// @namespace    Yuze-hackathon-tripreader
// @version      0.3.0
// @description  手动触发，将任意网页的旅游攻略正文结构化为路线、玩法、热点、实用信息四类卡片，附带原文溯源高亮与 Markdown 导出
// @author       liangrui08
// @match        *://*/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==


// ==================== TripReader（lib 与主流程合并版） ====================
/**
 * 站点适配层 —— 按域名注册抽取器，未适配站点走通用 fallback（readability 思路）
 * 每个适配器返回：
 *   { site, url, title, content, images: [{src, alt}], publishTime?, author? }
 *
 * 设计原则：评委复测未知页面时走 fallback 路径，所以 fallback 的质量决定泛化能力。
 */

(function (global) {
  "use strict";

  // ---------- 工具 ----------
  const clean = (s) =>
    (s || "")
      .replace(/\s+/g, " ")
      .replace(/\u00a0/g, " ")
      .trim();

  const unique = (arr) => Array.from(new Set(arr));

  function isVisible(el) {
    if (!el || !el.isConnected) return false;
    const style = getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function firstVisible(doc, selector) {
    return [...doc.querySelectorAll(selector)].find(isVisible) || null;
  }

  function visibleTextLength(el) {
    return isVisible(el) ? clean(el.innerText || "").length : 0;
  }

  // 小红书详情是“正文 + 评论”同一弹层；评论里也会出现完整攻略，必须在发送给 AI 前剔除。
  function isXhsCommentNode(el) {
    if (!el) return false;
    const signature = `${el.id || ""} ${typeof el.className === "string" ? el.className : ""}`.toLowerCase();
    return /(comment|reply|comment-list|comment-container|note-comment)/.test(signature);
  }

  function xhsCommentAnchor(root) {
    return [...root.querySelectorAll("*")].find((node) => /^共\s*\d+\s*条评论$/.test(clean(node.textContent || ""))) || null;
  }

  function isAfterXhsCommentAnchor(node, anchor) {
    return Boolean(anchor && (anchor.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING));
  }

  function textOfXhsNote(root) {
    if (!root) return "";
    const clone = root.cloneNode(true);
    clone.querySelectorAll("[id], [class]").forEach((node) => {
      if (isXhsCommentNode(node)) node.remove();
    });
    // 没有稳定 class 时，以“共 N 条评论”为边界，直接截断该节点及其后的内容。
    // 比猜测评论容器层级可靠，也不会让评论里的路线污染正文。
    const commentAnchor = xhsCommentAnchor(clone);
    if (commentAnchor && clone.lastChild) {
      const range = clone.ownerDocument.createRange();
      range.setStartBefore(commentAnchor);
      range.setEndAfter(clone.lastChild);
      range.deleteContents();
    }
    return textOf(clone);
  }

  // 从容器里取正文文本（保留段落分隔）
  function textOf(root) {
    if (!root) return "";
    const blocks = [];
    root.querySelectorAll("p, li, h1, h2, h3, h4, blockquote, .title, .desc").forEach((el) => {
      const t = clean(el.innerText);
      if (t && t.length >= 2) blocks.push(t);
    });
    let out = unique(blocks).join("\n");
    const full = clean(root.innerText || "");
    // 标签收集的文本不足容器总文本的一半时（如正文是纯文本节点/JSON 块），
    // 说明标签选择器漏掉了主体，直接使用整容器文本。
    if (out.length < Math.max(30, full.length * 0.5)) out = full;
    return out;
  }

  // 从容器里取图片（过滤头像/表情/图标）
  function imagesOf(root) {
    if (!root) return [];
    const out = [];
    root.querySelectorAll("img").forEach((img) => {
      const src = img.currentSrc || img.src || "";
      const w = img.naturalWidth || img.width || 0;
      const h = img.naturalHeight || img.height || 0;
      if (!/^https?:/.test(src)) return; // 跳过 blob/data（后续可转 canvas）
      if (w > 0 && w < 100) return; // 小图标
      if (/(avatar|emoji|icon|logo|\.svg)/i.test(src)) return;
      out.push({ src, alt: clean(img.alt) });
    });
    return out.slice(0, 20); // 上限，遵守"仅发送必需媒体"规则
  }

  // ---------- 通用 fallback（关键：评委复测的新页面走这里） ----------
  // 详情页闸门：宁可不解析信息不足的页面，也不把搜索结果/推荐流误送给 LLM。
  function detailMetrics(el) {
    const totalText = clean(el.innerText || "").length;
    let linkTextLen = 0;
    el.querySelectorAll("a").forEach((a) => {
      linkTextLen += clean(a.innerText || "").length;
    });

    const blocks = [...el.querySelectorAll("p, blockquote, pre, li, h2, h3, h4")]
      .filter((node) => !node.closest("a, nav, header, footer, aside"))
      .map((node) => clean(node.innerText || ""));
    const longBlocks = blocks.filter((text) => text.length >= 80);
    const continuousText = longBlocks.reduce((sum, text) => sum + text.length, 0);
    // 图文资讯常将每个短句拆成独立 p；累计足量的中短段落也属于正文结构。
    const narrativeBlocks = blocks.filter((text) => text.length >= 18);
    const narrativeText = narrativeBlocks.reduce((sum, text) => sum + text.length, 0);

    // 一些 CMS 用 div + br 或 div + 图片切分段落，没有 p 标签。
    // 连续的文本型叶子节点同样可以构成详情正文，不能仅因缺少语义标签被拒绝。
    const textLeaves = [...el.querySelectorAll("div, span, pre, textarea, [contenteditable='true']")]
      .filter((node) => {
        if (node.closest("a, nav, header, footer, aside")) return false;
        const text = clean(node.innerText || "");
        return text.length >= 35 && node.querySelectorAll("div, p, li, article, section").length === 0;
      })
      .map((node) => clean(node.innerText || ""));
    // 容器内部几乎全是文本节点（如 JSON 字符串、pre 块）时，将自身 innerText 当作叶子评估。
    const elementCount = el.querySelectorAll("*").length;
    if (elementCount <= 3 && totalText > 500) {
      const lines = clean(el.innerText || "").split(/\n+/).filter((t) => t.length >= 35);
      lines.forEach((line) => textLeaves.push(line));
    }
    const maxTextLeafLength = textLeaves.reduce((max, text) => Math.max(max, text.length), 0);
    const leafTextTotal = textLeaves.reduce((sum, text) => sum + text.length, 0);

    // 推荐流通常由很多「带链接、字数相近」的同级卡片组成；文章正文不会这样重复。
    const childCards = [...el.children].filter((child) => {
      const textLen = clean(child.innerText || "").length;
      return textLen >= 40 && textLen <= 700 && child.querySelector("a[href]");
    });
    const cardText = childCards.reduce((sum, child) => sum + clean(child.innerText || "").length, 0);

    return {
      totalText,
      linkDensity: totalText ? linkTextLen / totalText : 1,
      longBlocks: longBlocks.length,
      maxBlockLength: longBlocks.reduce((max, text) => Math.max(max, text.length), 0),
      continuousText,
      narrativeBlockCount: narrativeBlocks.length,
      narrativeText,
      textLeafCount: textLeaves.length,
      maxTextLeafLength,
      leafTextTotal,
      elementCount,
      cardCount: childCards.length,
      cardTextRatio: totalText ? cardText / totalText : 1,
    };
  }

  function passesDetailGate(metrics) {
    // 详情正文必须包含足够的非链接连续文本；目录、瀑布流、搜索结果通常无法满足。
    if (metrics.totalText < 220 || metrics.linkDensity > 0.35) return false;
    // 详情页应至少有一段完整叙述；若无超长段落，则必须有多段连续正文。
    // 这会拦截每张卡片只有标题/摘要的搜索结果与推荐流。
    const hasSemanticNarrative =
      metrics.maxBlockLength >= 140 ||
      (metrics.longBlocks >= 3 && metrics.continuousText >= 500) ||
      (metrics.narrativeBlockCount >= 6 && metrics.narrativeText >= 500);
    const hasDivNarrative = metrics.maxTextLeafLength >= 140 || (metrics.textLeafCount >= 3 && metrics.leafTextTotal >= 500);
    // 极简结构化文本容器：如后台 JSON 字符串、pre 块，元素极少、低链接密度。
    // 100 字即可覆盖短攻略、单场活动与展览通知；其余结构与链接约束仍用于过滤噪音。
    const isMinimalTextBlob = metrics.elementCount <= 3 && metrics.totalText >= 100 && metrics.linkDensity < 0.15;
    if (!hasSemanticNarrative && !hasDivNarrative && !isMinimalTextBlob) return false;
    // 四张以上相似链接卡片占据大部分文本，按列表页处理。
    if (metrics.cardCount >= 4 && metrics.cardTextRatio >= 0.55) return false;
    return true;
  }

  // 基于统计特征自动定位正文区域，不依赖硬编码 class 名。
  // 思路：遍历语义标签与含长文本的 div，按「文本长度 + 段落密度 - 链接密度」评分。
  function genericFallback(doc, loc) {
    // 大型 SPA 往往包含数千个嵌套 div。收集阶段只做 textContent 的轻量估算，
    // 再让最有希望的少量候选进入高成本的 innerText/密度分析，避免卡死页面。
    const candidateMeta = [];
    const startedAt = performance.now();
    const all = doc.querySelectorAll("article, main, section, div");
    const scanBudgetMs = 80;

    for (const el of all) {
      if (performance.now() - startedAt > scanBudgetMs) break;
      if (el.closest('nav, header, footer, aside, [role="navigation"], [role="complementary"], script, style, noscript, button')) continue;
      const textLen = clean(el.textContent || "").length;
      if (textLen < 100) continue;
      // 只排除明显是小搜索/登录表单的候选；不读取 innerText，避免重复触发布局。
      const formParent = el.closest("form");
      if (formParent && clean(formParent.textContent || "").length < 500) continue;
      candidateMeta.push({ el, textLen, childCount: el.children.length });
    }

    if (candidateMeta.length === 0) return null;

    // 长文本优先，但同等文本量时优先更内层、子节点更少的容器（例如后台抽屉正文）。
    const candidates = candidateMeta
      .sort((a, b) => (b.textLen - a.textLen) || (a.childCount - b.childCount))
      .slice(0, 36)
      .map((item) => item.el);

    // 2. 计算深度（避免选中 body 的直接子 wrapper）
    const depthOf = (el) => {
      let d = 0;
      while (el) {
        d++;
        el = el.parentElement;
      }
      return d;
    };

    let best = null;
    let bestScore = -Infinity;

    for (const el of candidates) {
      const metrics = detailMetrics(el);
      if (!passesDetailGate(metrics)) continue;

      const { totalText, linkDensity } = metrics;
      const paragraphs = el.querySelectorAll(
        "p, h1, h2, h3, h4, h5, h6, blockquote, li, pre"
      ).length;
      const images = el.querySelectorAll("img").length;
      const children = el.children.length;

      // 3. 评分
      let score = 0;
      score += totalText * 1.0; // 文本长度基础分
      score += paragraphs * 60; // 段落奖励（游记必有段落）
      score += images * 25; // 图片奖励
      score -= linkDensity * totalText * 2; // 链接密度惩罚
      score -= Math.max(0, children - 20) * 3; // 过多子元素温和惩罚
      score -= metrics.cardCount * 100; // 卡片越多，越接近聚合/列表页

      // 段落密度奖励：每子元素平均段落数高 => 结构紧凑像文章
      const density = children > 0 ? paragraphs / children : paragraphs;
      score += density * 80;

      // 语义标签奖励
      const tag = el.tagName.toLowerCase();
      if (tag === "article") score += 200;
      if (tag === "main") score += 150;

      // 深度惩罚：太浅容易是整页 wrapper
      const depth = depthOf(el);
      if (depth < 4) score -= 250;

      if (score > bestScore) {
        bestScore = score;
        best = el;
      }
    }

    if (!best) return null;
    return {
      site: "generic",
      url: loc.href,
      title: clean(doc.title),
      content: textOf(best),
      images: imagesOf(best),
      container: best,
    };
  }

  // ---------- 站点适配器注册表 ----------
  // 仅保留需要专属元信息或图片逻辑的站点；其余页面全部由通用算法识别。
  const adapters = [
    {
      name: "xiaohongshu-note",
      match: (loc) => /www\.xiaohongshu\.com\/(explore|discovery\/item)\//.test(loc.href),
      extract(doc, loc) {
        // 小红书详情通常是覆盖在搜索页上的弹层。只读当前可见的笔记正文，
        // 绝不能在整个 document 中兜底，否则可能把背景搜索流或 AI 汇总送给模型。
        const modal =
          firstVisible(doc, '[class*="note-detail"]') ||
          firstVisible(doc, '[class*="detail-container"]') ||
          firstVisible(doc, '[class*="feed-detail"]') ||
          firstVisible(doc, '[role="dialog"]');
        const scope = modal || doc;
        const commentAnchor = xhsCommentAnchor(scope);
        const eligible = (el) =>
          isVisible(el) &&
          !isXhsCommentNode(el) &&
          !el.closest("[class*='comment'], [id*='comment'], [class*='reply'], [id*='reply']") &&
          !isAfterXhsCommentAnchor(el, commentAnchor);
        // #detail-desc 是笔记正文的优先锚点；仅在不存在时才用 note-text 兜底。
        // 不能按“文字最多”选，因为图片笔记的评论往往比笔记标题和描述更长。
        const detailCandidates = [...scope.querySelectorAll("#detail-desc")].filter(eligible);
        const fallbackCandidates = detailCandidates.length
          ? detailCandidates
          : [...scope.querySelectorAll("[class*='note-text']")].filter(eligible);
        const candidates = fallbackCandidates
          .map((el) => ({ el, length: visibleTextLength(el) }))
          .filter(({ length }) => length >= 50)
          .sort((a, b) => b.length - a.length);
        const container = candidates[0]?.el || null;
        if (!container) return null;

        const text = textOfXhsNote(container);
        if (text.length < 50) return null;
        if (/AI总结|智能摘要|ai.summary|summary.by.ai/i.test(text)) return null;

        // 作者：author-wrapper 文本按行拆分，去掉"关注"等按钮文案
        const authorRaw = doc.querySelector(".author-wrapper")?.innerText || "";
        const authorLine = authorRaw
          .split("\n")
          .map((s) => clean(s))
          .filter((s) => s && s !== "关注" && s !== "已关注" && s.length <= 20)[0];

        // 图片：小红书笔记大图不在 #detail-desc 内，全页过滤（width>=300 且非头像图标）
        const images = [];
        doc.querySelectorAll("img").forEach((img) => {
          const src = img.currentSrc || img.src || "";
          const w = img.naturalWidth || img.width || 0;
          if (!/^https?:/.test(src)) return;
          if (w < 300) return; // 只要正文大图，过滤头像/图标/表情
          if (/(avatar|emoji|icon|logo|\.svg)/i.test(src)) return;
          if (/xhscdn\.com/.test(src) && /\/avatar\//i.test(src)) return;
          images.push({ src, alt: clean(img.alt) });
        });

        return {
          site: "xiaohongshu",
          url: loc.href,
          title: clean(
            scope.querySelector("h1")?.innerText ||
            scope.querySelector('[id*="title"]')?.innerText ||
            scope.querySelector('[class*="note-title"]')?.innerText ||
            scope.querySelector('[class*="detail-title"]')?.innerText ||
            doc.title
          ),
          content: text,
          images: images.slice(0, 20),
          publishTime: clean(doc.querySelector('[class*="date"]')?.innerText),
          author: authorLine || null,
          container,
        };
      },
    },
  ];

  // ---------- 入口 ----------
  function extract(doc, loc) {
    // 小红书搜索页（含右侧「点点」AI 汇总）没有单篇原文正文，
    // 必须按列表页拒绝，不能把 AI 汇总或搜索卡片当成攻略详情。
    if (/www\.xiaohongshu\.com\/(?:search_result_ai|search_result|ai_chat_tab)/.test(loc.href)) {
      return null;
    }

    for (const a of adapters) {
      if (a.match(loc)) {
        const r = a.extract(doc, loc);
        if (r && r.content && r.content.length > 50) return r;
        // 小红书详情页会把搜索列表保留在弹层背后。适配器未拿到可见笔记正文时，
        // 宁可提示正文尚未出现，也不能退回全页通用扫描而误读背景列表或 AI 汇总。
        return null;
      }
    }
    return genericFallback(doc, loc);
  }

  global.Extractor = { extract };
})(window);
/** 网页攻略抽取：字段简洁，路线/玩法/热点判定沿用线上生产边界。 */
(function (global) {
  "use strict";
  function buildPrompt(page) {
    return `你是旅行攻略信息抽取专家。只根据原文返回严格JSON，不要输出其他文字。

【总规则】
1. 未明确提及填 null 或 []，禁止常识补全、猜测、把零散地点拼成路线。
2. 一篇文章可并行有 routes、plays、hotspots；没有就返回空数组。
3. isTravelGuide 只是对全文性质的客观标注：整体属于旅行攻略/游记/玩乐内容时为 true，纯广告、纯餐饮住宿推广或与旅行完全无关时为 false。它不影响提取——无论取值如何，都必须尽力提取 routes、plays、hotspots、practicalInfo，能提多少提多少，不得因判断为 false 就放弃提取。
4. **evidence 必须是输入正文中的连续原文，逐字摘抄 10-45 字，严禁改写、概括、增删标点、替换表情或用自己的话重述。** 输出前请逐字核对：evidence 中的每个字符必须在输入正文中以完全相同的顺序连续出现。若无法提供合格 evidence，就不要返回该 routes、plays 或 hotspots 卡片。优先摘取包含玩法名称或独有细节的句子，避免使用"可以在这里玩""建议早点去"等通用短句。
5. 纯广告、餐饮/住宿推广或纯情绪分享的文章同样照常提取其中可执行的游玩信息（具体项目、位置、时间、价格、注意事项），只忽略营销话术、电话号码、微信号和团购链接；isTravelGuide 标注为 false 即可，但提取照常进行。
6. practicalInfo 的每一项也必须是正文中可直接找到的原文短句，不能概括或补充。

【路线 routes】
仅当原文明确给出游览顺序、路线安排或时间分段才识别，如“A→B→C”“先A再B”“上午A下午B”“D1：A--B--C”。stops 必须按原文顺序；不得用文章零散出现的景点自行组成路线。description 是基于原文的40-80字路线介绍，不得编造。营销文中的明确日程同样有效，但不得把接送站、酒店推销、导游联系方式作为景点或路线节点。

【玩法 plays】
玩法必须是游客在原文明确地点能体验的具体吸引物、项目、活动、子景点、展馆/展品、动物互动、观景体验或具体打卡点，且名称具体简短。
直接过滤：没有对象的泛泛“游玩/拍照/一日游”、餐饮住宿、交通、讲解、门票优惠、团建、拼团、个人偶遇。注意：若拍照、亲子互动、观景、避暑等体验明确发生在具体地点/项目/设施中，且原文给出该对象的独特环境或细节，则可以识别为具体玩法。
briefDesc 是卡片标题之外的“一句话亮点”：严格10-17个汉字，资深导游口吻，最多一处逗号断句、结尾不用句号。卡片标题已展示玩法/POI名称，因此 briefDesc 中严禁出现、复述或以任何简称开头重复 name（例如 name 为“什刹海西段citywalk”，亮点不能写“什刹海西段原汁原味…”）；必须直接从名称之外的独有体验或亮点起笔，例如“原汁原味，避开商业区”。需覆盖玩法亮点、玩法优势、景区内打卡位置、爆火热信息中的2项及以上；禁止泛泛而谈（如“拍照效果极佳”不可用）、禁止运营时间、负面词汇（不好、不佳、但是、只是、然而等）、交通、入口路线、排队、安检、预约、价格等行程信息。超过17字必须在输出前自行删减信息；识别不到不重复名称的独特亮点时返回 null，宁缺毋滥。description 是60-150字详细介绍（网页侧边栏场景对线上90-300字的裁剪），基于原文适当扩写，禁止与亮点重复或无增量；描述主体必须是该玩法本身且占比70%以上，禁止“文章提到/作者提到/我们/我”等抓取痕迹与第一人称；原文描述过短无法扩写时返回 null。

【热点 hotspots】
仅识别有明确时效性和可游玩性的活动、展览、节庆、演出、赛事、季节性体验或突发景观。若文中使用“最后一批”“限时”“仅剩”“夏日限定”等表述，并同时给出具体可体验内容，也应作为季节性体验识别；无法确认具体截止日期时 time 可为 null。常驻景点、预约提醒、优惠/折扣日期、作者发文或打卡日期都不是热点。time 仅取活动本体明确时间；briefDesc 与玩法规则完全相同：严格10-17个汉字，不能重复或简称复述热点 name，必须从名称外的独有亮点起笔，超过17字须在输出前自行删减；description 是60-150字活动介绍，基于原文适当扩写，禁止与亮点重复且无增量，禁止抓取痕迹与第一人称。

【实用信息 practicalInfo】
booking/ticket/transport/time/tips/avoidPitfalls/checkInSpots 只抽原文明确内容，逐项去重；不要把玩法卡里已有信息重复堆入这里。

【JSON结构】
{"isTravelGuide":true,"summary":{"title":"标题","oneSentence":"20-40字总结","suitableFor":["适合人群"]},"routes":[{"name":"路线名","duration":"时长或null","stops":["地点"],"tips":"路线建议或null","description":"40-80字路线介绍或null","evidence":"原文"}],"plays":[{"name":"具体玩法","briefDesc":"10-17字亮点或null","description":"60-150字详细介绍或null","location":"文中明确位置或null","time":"适合/开放时间或null","latestEntry":"最晚入场或null","ticket":"票价或null","booking":"预约要求或null","tips":["注意事项"],"evidence":"原文"}],"hotspots":[{"name":"限时活动","briefDesc":"10-17字亮点或null","description":"60-150字活动介绍或null","location":"地点或null","time":"活动本体时间或null","ticket":"票价或null","evidence":"原文"}],"practicalInfo":{"booking":[],"ticket":[],"transport":[],"time":[],"tips":[],"avoidPitfalls":[],"checkInSpots":[]}}
注意：isTravelGuide=true 或 false 时都要输出完整 JSON 结构并尽可能填满可提取的字段。

标题：${page.title || ""}
正文：
${page.content || ""}`;
  }
  async function extractTrip(page) {
    console.log(`[TripReader] AI 调用：完整正文 ${page.content?.length || 0} 字`);
    const raw = await global.LLMBridge.chat(buildPrompt(page), { response_format: "json" });
    return typeof raw === "string" ? JSON.parse((raw.match(/\{[\s\S]*\}/) || [raw])[0]) : raw;
  }
  async function helloWorld() { return global.LLMBridge.chat(`只回复JSON：{"ok":true,"page_title":"${document.title.slice(0, 50)}"}`, "json"); }
  global.LLM = { extractTrip, helloWorld };
})(window);
/** 网页注入层：攻略总结侧边栏 */
(function (global) {
  "use strict";
  // 同一文档内若 Yuze 再次执行脚本，沿用已有 UI 对象和解析状态。
  if (global.__tripreaderUI) {
    global.UI = global.__tripreaderUI;
    return;
  }
  const STYLE = `
:host{all:initial}*{box-sizing:border-box;margin:0;padding:0;font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif}.tr-panel{position:fixed;top:10vh;right:0;width:390px;height:80vh;background:#fff;border:1px solid #eee;border-right:0;border-radius:14px 0 0 14px;box-shadow:-4px 5px 28px rgba(0,0,0,.13);display:flex;flex-direction:column;z-index:2147483646;overflow:hidden;transition:transform .2s}.tr-panel.collapsed{transform:translateX(100%)}.tr-toggle{position:fixed;top:12vh;right:0;width:46px;height:92px;border:0;border-radius:14px 0 0 14px;background:linear-gradient(135deg,#ff7e33,#ff4e6a);color:#fff;cursor:pointer;font-size:14px;font-weight:700;letter-spacing:2px;writing-mode:vertical-rl;z-index:2147483647;box-shadow:-3px 0 14px rgba(255,78,106,.35);transition:right .2s}.tr-panel:not(.collapsed)~.tr-toggle{right:390px;border-radius:14px 0 0 14px}header{padding:15px 18px;border-bottom:1px solid #f0f0f0;display:flex;justify-content:space-between;align-items:center}header .t{font-size:17px;font-weight:750;color:#222}header .s{margin-top:3px;font-size:12px;color:#999;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:270px}header .hint{font-size:11px;color:#bbb}.tr-body{flex:1;overflow-y:auto;padding:14px 16px}.tr-body::-webkit-scrollbar{width:5px}.tr-body::-webkit-scrollbar-thumb{background:#ddd;border-radius:4px}.loading,.err{padding:60px 18px;text-align:center;color:#888;font-size:13px;line-height:1.8}.spinner{width:30px;height:30px;margin:0 auto 12px;border:3px solid #ffe3d0;border-top-color:#ff7e33;border-radius:50%;animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}.summary{background:#fff8f3;border-radius:10px;padding:12px 13px;color:#57463d;font-size:13px;line-height:1.65}.tags{margin-top:8px;display:flex;flex-wrap:wrap;gap:5px}.tag{padding:2px 7px;border-radius:99px;background:#fff0e5;color:#d95b20;font-size:11px}.section{margin-top:17px}.section h3{font-size:14px;color:#ff5c2b;margin-bottom:8px}.card{border:1px solid #eee;border-radius:10px;padding:11px 12px;margin:8px 0;cursor:pointer;transition:.15s}.card:hover,.card.active{border-color:#ff934f;background:#fffaf6;box-shadow:0 0 0 2px rgba(255,126,51,.13)}.card-title{font-size:15px;font-weight:700;color:#222}.line{font-size:12px;color:#555;line-height:1.65;margin-top:4px}.line b{color:#333}.stops{color:#ff6b2c;font-size:12px;font-weight:600;margin-top:6px}.evidence{font-size:11px;color:#aaa;line-height:1.55;border-left:2px solid #eee;padding-left:7px;margin-top:7px}.list{background:#f7fafc;border-radius:9px;padding:8px 11px;font-size:12px;line-height:1.8;color:#52616b}.list .avoid{color:#b3541e}footer{padding:10px 16px;border-top:1px solid #eee;display:flex;gap:8px;flex-wrap:wrap}footer button{flex:1;padding:9px;border:1px solid #ffd3b6;background:#fff;border-radius:8px;color:#f26328;font-size:13px;font-weight:650;cursor:pointer}footer .tr-analyze{flex-basis:100%;background:#ff6b35;color:#fff;border-color:#ff6b35}footer button:disabled{opacity:.55;cursor:not-allowed}mark.tr-hl{background:linear-gradient(180deg,transparent 50%,#ffe08a 50%);padding:1px 0}`;
  let host, root, currentResult, currentPage, analyzeHandler;
  // 返回 true 代表复用了当前文档中已有的侧边栏。重复注入脚本时不能清空它正在展示的结果。
  function mount() {
    if (host && root?.querySelector(".tr-analyze") && host.isConnected) return true;
    const hosts=[...document.querySelectorAll("#tripreader-host")];
    if(hosts.length){
      host=hosts.pop();hosts.forEach(node=>node.remove());root=host.shadowRoot;
      if(root && !root.querySelector(".tr-analyze")){host.remove();host=null;root=null}
      else if(root)return true;
      else{host.remove();host=null}
    }
    host=document.createElement("div");host.id="tripreader-host";document.documentElement.appendChild(host);root=host.attachShadow({mode:"open"});
    const style=document.createElement("style");style.textContent=STYLE;root.appendChild(style);
    const panel=document.createElement("div");panel.className="tr-panel";panel.innerHTML=`<header><div><div class="t">TripReader 旅游攻略</div><div class="s tr-sub"></div></div><div class="hint">点击「攻略总结」收起</div></header><div class="tr-body"></div><footer><button class="tr-analyze">开始解析当前页</button><button class="tr-copy">复制 Markdown</button></footer>`;root.appendChild(panel);
    const toggle=document.createElement("button");toggle.className="tr-toggle";toggle.textContent="攻略总结";root.appendChild(toggle);
    toggle.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();panel.classList.toggle("collapsed")});
    document.addEventListener("keydown",e=>{if(e.key==="Escape")panel.classList.add("collapsed")});
    root.querySelector(".tr-analyze").onclick=()=>analyzeHandler?.();root.querySelector(".tr-copy").onclick=copySummary;panel.classList.add("collapsed");
    return false;
  }
  function renderReady(){if(!root)return;currentResult=null;currentPage=null;root.querySelector(".tr-sub").textContent="侧边栏已就绪，按需解析当前页面";root.querySelector(".tr-body").innerHTML=`<div class="err">页面内容加载完成后，点击下方「开始解析当前页」。</div>`;root.querySelector(".tr-analyze").disabled=false;root.querySelector(".tr-analyze").textContent="开始解析当前页"}
  function renderLoading(page){currentPage=page;root.querySelector(".tr-sub").textContent=page.title||page.site;root.querySelector(".tr-body").innerHTML=`<div class="loading"><div class="spinner"></div>正在阅读这篇攻略…<br>提取路线、玩法、热点和实用信息</div>`;root.querySelector(".tr-analyze").disabled=true;root.querySelector(".tr-analyze").textContent="解析中…"}
  function renderError(msg){root.querySelector(".tr-body").innerHTML=`<div class="err">解析失败：${esc(msg)}<br><br>确认页面内容已出现后，可再次点击「开始解析当前页」。</div>`;root.querySelector(".tr-analyze").disabled=false;root.querySelector(".tr-analyze").textContent="重新解析当前页"}
  function evidence(text){return text?`<div class="evidence">“${esc(text)}” · 点击定位原文</div>`:""}
  function card(title, lines, ev){return `<div class="card" data-evidence="${attr(ev||"")}"><div class="card-title">${esc(title)}</div>${lines.filter(Boolean).map(x=>`<div class="line">${x}</div>`).join("")}${evidence(ev)}</div>`}
  function renderTrip(data,page){currentResult=data;currentPage=page;const body=root.querySelector(".tr-body");root.querySelector(".tr-sub").textContent=page?.title||page?.site||"当前攻略";root.querySelector(".tr-analyze").disabled=false;root.querySelector(".tr-analyze").textContent="重新解析当前页";if(!data){body.innerHTML=`<div class="err">这篇内容未提取到路线、玩法或实用信息。</div>`;return}const s=data.summary||{};let html=`<div class="summary">${esc(s.oneSentence||"已为你整理攻略重点")}${s.suitableFor?.length?`<div class="tags">${s.suitableFor.map(v=>`<span class="tag">${esc(v)}</span>`).join("")}</div>`:""}</div>`;
    const routes=data.routes||[];if(routes.length){html+=`<section class="section"><h3>🗺 推荐路线</h3>`+routes.map(r=>card(r.name||"推荐路线",[r.duration?`<b>时长</b>　${esc(r.duration)}`:"",r.stops?.length?`<div class="stops">${r.stops.map(esc).join(" → ")}</div>`:"",r.tips?`<b>建议</b>　${esc(r.tips)}`:"",r.description?`<b>路线介绍</b>　${esc(r.description)}`:""],r.evidence)).join("")+`</section>`}
    const plays=data.plays||[];if(plays.length){html+=`<section class="section"><h3>✨ 值得玩</h3>`+plays.map(p=>card(p.name||"玩法",[p.briefDesc?`<b>亮点</b>　${esc(p.briefDesc)}`:"",p.description?`<b>介绍</b>　${esc(p.description)}`:"",p.location?`<b>位置</b>　${esc(p.location)}`:"",p.time?`<b>时间</b>　${esc(p.time)}`:"",p.latestEntry?`<b>最晚入场</b>　${esc(p.latestEntry)}`:"",p.ticket?`<b>门票</b>　${esc(p.ticket)}`:"",p.booking?`<b>预约</b>　${esc(p.booking)}`:"",p.tips?.length?`<b>提示</b>　${p.tips.map(esc).join("；")}`:""],p.evidence)).join("")+`</section>`}
    const hs=data.hotspots||[];if(hs.length){html+=`<section class="section"><h3>🔥 限时热点</h3>`+hs.map(h=>card(h.name||"限时活动",[h.briefDesc?`<b>亮点</b>　${esc(h.briefDesc)}`:"",h.description?`<b>介绍</b>　${esc(h.description)}`:"",h.location?`<b>地点</b>　${esc(h.location)}`:"",h.time?`<b>时间</b>　${esc(h.time)}`:"",h.ticket?`<b>票价</b>　${esc(h.ticket)}`:""],h.evidence)).join("")+`</section>`}
    const p=data.practicalInfo||{};const groups=[["预约",p.booking],["票务",p.ticket],["交通",p.transport],["时间",p.time],["注意事项",p.tips],["避坑",p.avoidPitfalls,"avoid"],["打卡点",p.checkInSpots]];const rows=groups.filter(([,a])=>a?.length).map(([n,a,cls])=>`<div class="${cls||""}"><b>${n}</b>　${a.map(esc).join("；")}</div>`);if(rows.length)html+=`<section class="section"><h3>📌 实用提醒</h3><div class="list">${rows.join("")}</div></section>`;body.innerHTML=html;
    body.querySelectorAll(".card[data-evidence]").forEach(el=>el.addEventListener("click",()=>{const ev=el.getAttribute("data-evidence");if(!ev)return;const container=liveContainer(page);if(el.classList.contains("active")){clearHighlight(container);el.classList.remove("active")}else{body.querySelectorAll(".card.active").forEach(x=>x.classList.remove("active"));if(highlight(container,ev))el.classList.add("active")}}));
  }
  function renderListPageHint(){
    if(!root)return;
    root.querySelector(".tr-sub").textContent="当前页面未发现可解析的单篇正文";
    root.querySelector(".tr-body").innerHTML=`<div class="err">当前页面未发现可解析的单篇正文。<br><br>请打开具体内容页后，再点击「开始解析当前页」。</div>`;
    root.querySelector(".tr-analyze").disabled=false;
    root.querySelector(".tr-analyze").textContent="开始解析当前页";
  }
  function liveContainer(page){if(page?.container?.isConnected)return page.container;const fresh=global.Extractor?.extract(document,location);if(fresh?.container?.isConnected){if(page)page.container=fresh.container;return fresh.container}return document.body}
  function clearHighlight(c){c.querySelectorAll("mark.tr-hl").forEach(m=>m.replaceWith(document.createTextNode(m.textContent)))}
  function highlight(c,text){clearHighlight(c);const ignored=/[\s\p{P}\p{S}]/u,target=Array.from(String(text||"")).filter(ch=>!ignored.test(ch)).join("");if(!target)return false;const nodes=[],chars=[];let joined="";const walker=document.createTreeWalker(c,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.parentElement?.closest("script,style,noscript")?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});let node;while(node=walker.nextNode()){const raw=node.textContent||"",start=joined.length;let used=false;for(let offset=0;offset<raw.length;offset++){if(!ignored.test(raw[offset])){joined+=raw[offset];chars.push({node,offset});used=true}}if(used)nodes.push({node,start,end:joined.length})}let index=joined.indexOf(target),matchLength=target.length;if(index<0){const max=Math.min(24,target.length);for(let length=max;length>=12&&index<0;length--){for(let start=0;start<=target.length-length;start++){const chunk=target.slice(start,start+length),found=joined.indexOf(chunk);if(found>=0&&found===joined.lastIndexOf(chunk)){index=found;matchLength=length;break}}}}if(index<0){console.warn("[TripReader] 未找到可定位的证据原文",text);return false}const end=index+matchLength,segments=[];for(const item of nodes){const from=Math.max(index,item.start),to=Math.min(end,item.end);if(from<to)segments.push({node:item.node,start:chars[from].offset,end:chars[to-1].offset+1})}const firstSegment=segments[0];let first;try{for(const segment of segments.reverse()){const n=segment.node;n.splitText(segment.end);const mid=n.splitText(segment.start),mark=document.createElement("mark");mark.className="tr-hl";mid.parentNode.insertBefore(mark,mid);mark.appendChild(mid);if(segment===firstSegment)first=mark}first?.scrollIntoView({behavior:"smooth",block:"center"});return Boolean(first)}catch(e){console.warn("[TripReader] 高亮失败",e);clearHighlight(c);return false}}
  function markdown(){
    const d=currentResult||{},s=d.summary||{};
    let out=`# ${s.title||currentPage?.title||"攻略总结"}\n\n${s.oneSentence||""}\n\n`;
    if(s.suitableFor?.length)out+=`适合：${s.suitableFor.join("、")}\n\n`;
    for(const r of d.routes||[])out+=`## 路线：${r.name||"推荐路线"}\n${r.duration?`时长：${r.duration}\n`:""}${r.stops?.length?`行程：${r.stops.join(" → ")}\n`:""}${r.tips?`建议：${r.tips}\n`:""}${r.description?`路线介绍：${r.description}\n`:""}${r.evidence?`原文：${r.evidence}\n`:""}\n`;
    for(const p of d.plays||[])out+=`## 值得玩：${p.name||"玩法"}\n${p.briefDesc?`亮点：${p.briefDesc}\n`:""}${p.description?`介绍：${p.description}\n`:""}${p.location?`位置：${p.location}\n`:""}${p.time?`时间：${p.time}\n`:""}${p.latestEntry?`最晚入场：${p.latestEntry}\n`:""}${p.ticket?`门票：${p.ticket}\n`:""}${p.booking?`预约：${p.booking}\n`:""}${p.tips?.length?`提示：${p.tips.join("；")}\n`:""}${p.evidence?`原文：${p.evidence}\n`:""}\n`;
    for(const h of d.hotspots||[])out+=`## 限时热点：${h.name||"限时活动"}\n${h.briefDesc?`亮点：${h.briefDesc}\n`:""}${h.description?`介绍：${h.description}\n`:""}${h.location?`地点：${h.location}\n`:""}${h.time?`时间：${h.time}\n`:""}${h.ticket?`票价：${h.ticket}\n`:""}${h.evidence?`原文：${h.evidence}\n`:""}\n`;
    const p=d.practicalInfo||{};
    const practical=[['预约',p.booking],['票务',p.ticket],['交通',p.transport],['时间',p.time],['注意事项',p.tips],['避坑',p.avoidPitfalls],['打卡点',p.checkInSpots]].filter(([,items])=>items?.length);
    if(practical.length){out+='## 实用提醒\n';for(const [name,items] of practical)out+=`- ${name}：${items.join("；")}\n`;out+='\n'}
    return out.trim()+"\n";
  }
  async function copySummary(){
    const b=root.querySelector(".tr-copy"),text=markdown();
    try{await navigator.clipboard?.writeText(text);b.textContent="已复制 ✓"}catch{b.textContent="复制失败"}
    setTimeout(()=>b.textContent="复制 Markdown",1500)
  }
  function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}function attr(s){return esc(s)}function setAnalyzeHandler(handler){analyzeHandler=handler}
  global.UI={mount,renderReady,renderLoading,renderError,renderTrip,renderListPageHint,setAnalyzeHandler};
  global.__tripreaderUI=global.UI;
})(window);
// ==================== 主流程 ====================
/*
 * TripReader 主流程
 * 侧边栏常驻；仅在用户点击后读取当前 DOM 并调用 AI。
 * 页面切换后回到就绪状态，不缓存解析结果。
 */
(function () {
  "use strict";

  // Yuze 可能在同一页面重复执行技炉。避免第二次初始化覆盖已有结果，
  // 同一 document 的运行实例只保留一份；真正刷新或 URL 切换仍会按正常逻辑重置。
  if (window.__tripreaderMainInitialized) return;
  window.__tripreaderMainInitialized = true;

  const log = (...args) => console.log("%c[TripReader]", "color:#ff7e33", ...args);
  let activeRequestUrl = null;

  function isXiaohongshuSearch(url) {
    return /www\.xiaohongshu\.com\/(?:search_result_ai|search_result|ai_chat_tab)/.test(url);
  }

  async function analyzeCurrentPage() {
    const requestUrl = location.href;
    if (activeRequestUrl === requestUrl) return;

    // 小红书搜索/点点 AI 页面没有单篇原文正文，不调用 AI。
    if (isXiaohongshuSearch(requestUrl)) {
      UI.renderListPageHint();
      return;
    }

    activeRequestUrl = requestUrl;
    log("手动解析当前页面:", requestUrl);

    document.querySelectorAll("mark.tr-hl").forEach((mark) => {
      mark.replaceWith(document.createTextNode(mark.textContent));
    });

    const page = Extractor.extract(document, location);
    if (!String(page?.content || "").trim()) {
      log("未读取到正文");
      activeRequestUrl = null;
      UI.renderError("未读取到可解析正文。该页面可能是列表页，或正文尚未出现。");
      return;
    }

    log(`抽取完成：${page.site} / ${page.title} / 正文 ${page.content.length} 字 / 图片 ${page.images.length} 张`);
    UI.renderLoading(page);

    try {
      const trip = await LLM.extractTrip(page);
      if (location.href !== requestUrl) {
        log("页面已切换，丢弃过期解析结果");
        return;
      }
      log("行程结构化完成:", trip);
      UI.renderTrip(trip, page);
    } catch (error) {
      if (location.href !== requestUrl) {
        log("页面已切换，丢弃过期解析错误");
        return;
      }
      log("AI 调用失败:", error);
      UI.renderError(error?.message || String(error));
    } finally {
      if (location.href === requestUrl) activeRequestUrl = null;
    }
  }

  let lastUrl = location.href;
  function onUrlChange() {
    if (location.href === lastUrl) return;
    lastUrl = location.href;
    activeRequestUrl = null;
    document.querySelectorAll("mark.tr-hl").forEach((mark) => {
      mark.replaceWith(document.createTextNode(mark.textContent));
    });
    UI.renderReady();
    log("URL 变化，侧边栏已重置，等待手动解析:", location.href);
  }

  // Yuze 可能在未刷新页面时重新注入脚本。复用已有侧边栏时保留已展示的结果，
  // 只有首次创建侧边栏才渲染就绪态。
  const reusedExistingPanel = UI.mount();
  UI.setAnalyzeHandler(analyzeCurrentPage);
  if (!reusedExistingPanel) UI.renderReady();

  // SPA 页面 URL 变化时重置状态；定时检查是部分站点不触发 history API 的兜底。
  setInterval(onUrlChange, 500);

  const pushState = history.pushState;
  history.pushState = function (...args) {
    pushState.apply(this, args);
    setTimeout(onUrlChange, 0);
  };
  const replaceState = history.replaceState;
  history.replaceState = function (...args) {
    replaceState.apply(this, args);
    setTimeout(onUrlChange, 0);
  };
  window.addEventListener("popstate", onUrlChange);
})();