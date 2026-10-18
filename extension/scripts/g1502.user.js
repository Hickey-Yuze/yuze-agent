(function () {
  const APP_ID = "buy-calm-down-helper";

  if (document.getElementById(APP_ID)) {
    return;
  }

  function getSelectedText() {
    const text = window.getSelection ? window.getSelection().toString().trim() : "";
    return text;
  }

  function cleanText(text) {
    return (text || "")
      .replace(/\s+/g, " ")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .trim();
  }

  function getMetaContent(name) {
    const selectors = [
      `meta[name="${name}"]`,
      `meta[property="${name}"]`,
      `meta[property="og:${name}"]`
    ];

    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el && el.content) return cleanText(el.content);
    }

    return "";
  }

  function guessPrice() {
    const bodyText = cleanText(document.body.innerText || "");
    const patterns = [
      /(?:￥|¥)\s?\d+(?:\.\d{1,2})?/g,
      /\d+(?:\.\d{1,2})?\s?元/g,
      /\$\s?\d+(?:\.\d{1,2})?/g
    ];

    const prices = [];

    for (const pattern of patterns) {
      const matches = bodyText.match(pattern);
      if (matches) prices.push(...matches.slice(0, 10));
    }

    return Array.from(new Set(prices)).slice(0, 5).join(" / ");
  }

  function getPageText() {
    const selected = getSelectedText();
    if (selected.length > 30) {
      return selected.slice(0, 5000);
    }

    const mainCandidates = [
      "article",
      "main",
      "[role='main']",
      ".content",
      ".article",
      ".post",
      ".product",
      ".detail",
      ".description"
    ];

    for (const selector of mainCandidates) {
      const el = document.querySelector(selector);
      if (el) {
        const text = cleanText(el.innerText || "");
        if (text.length > 300) return text.slice(0, 5000);
      }
    }

    return cleanText(document.body.innerText || "").slice(0, 5000);
  }

  function buildPrompt(userInfo) {
    const title = cleanText(document.title || "");
    const url = location.href;
    const description = getMetaContent("description");
    const possiblePrice = guessPrice();
    const pageText = getPageText();

    return `你是一个“买前冷静器”，任务不是强行推荐商品，而是帮我在购买前做理性判断。

请根据我提供的商品信息、网页内容、价格、使用场景和个人偏好，判断这个商品是否值得购买。你需要把商家的宣传、参数和卖点翻译成人话，指出真实优势、潜在问题和我需要确认的风险。

请严格遵守以下规则：

1. 不要被商品宣传话术带节奏。
2. 不要默认贵的就是好的，也不要默认便宜的就是性价比高。
3. 如果信息不足，请明确写出“需要进一步确认”，不要编造事实。
4. 如果你无法判断真实评价、历史价格、售后情况，请不要假装知道。
5. 判断重点要围绕“我是否适合购买”，而不是泛泛介绍商品。
6. 输出要直接、清楚、可执行，避免空话。
7. 如果网页内容像是广告、种草文或软文，请指出哪些表述可能偏营销。
8. 如果当前信息不足以做购买判断，请优先列出我下单前必须补充的信息。

请按以下结构输出：

【一句话结论】
用一句话告诉我：建议买、谨慎买、不建议买，还是需要补充信息后再判断。

【适合购买的人】
列出这个商品适合哪些人群或使用场景。

【不适合购买的人】
列出哪些人买它容易后悔。

【卖点翻译成人话】
把商品宣传里的核心卖点翻译成普通人能理解的话。
请区分：
- 真有用的卖点
- 可能有用但要看场景的卖点
- 偏营销的话术

【参数/功能重点】
帮我判断哪些参数或功能最重要，哪些其实没那么重要。
如果有专业术语，请用简单语言解释。

【潜在坑点】
列出购买前最需要警惕的问题，例如性能缩水、兼容性、售后、耗材成本、噪音、重量、续航、维修、学习成本、闲置风险等。

【我需要再确认的 5 个问题】
列出我下单前应该去确认的 5 个具体问题。

【价格判断】
基于我提供的信息，判断这个价格是偏贵、合理、还是有风险。
如果缺少历史价格或同类对比，请明确说明无法判断。

【最终建议】
给出清晰建议：
- 现在可以买
- 降价再买
- 换同类产品
- 暂时别买
- 需要补充哪些信息后再决定

以下是我的个人购买信息：

我的预算：${userInfo.budget || "未填写"}
我的使用场景：${userInfo.scenario || "未填写"}
我最在意的点：${userInfo.care || "未填写"}
我不能接受的点：${userInfo.avoid || "未填写"}

以下是当前网页信息：

网页标题：${title}
网页链接：${url}
网页描述：${description || "未提取到"}
页面中可能出现的价格：${possiblePrice || "未提取到明确价格"}

网页正文或我选中的内容：
${pageText || "未提取到有效正文"}`;
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    return Promise.resolve();
  }

  function createPanel() {
    const overlay = document.createElement("div");
    overlay.id = APP_ID + "-overlay";
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.25);
      z-index: 2147483646;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, "Microsoft YaHei", sans-serif;
    `;

    const panel = document.createElement("div");
    panel.style.cssText = `
      width: min(720px, calc(100vw - 32px));
      max-height: min(780px, calc(100vh - 32px));
      overflow: auto;
      background: #fffaf3;
      border: 1px solid #f1d2a8;
      border-radius: 18px;
      box-shadow: 0 18px 60px rgba(0, 0, 0, 0.25);
      padding: 22px;
      color: #2b2b2b;
    `;

    panel.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:14px;">
        <div>
          <div style="font-size:22px; font-weight:800;">买前冷静器</div>
          <div style="font-size:13px; color:#7a6b5b; margin-top:4px;">把当前网页翻译成购物避坑提示词，下单前先冷静 30 秒。</div>
        </div>
        <button id="${APP_ID}-close" style="border:none; background:#f3e4d2; border-radius:999px; padding:8px 12px; cursor:pointer;">关闭</button>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
        <label style="font-size:13px; color:#5d5147;">我的预算
          <input id="${APP_ID}-budget" placeholder="例如：3000 元以内" style="margin-top:6px; width:100%; box-sizing:border-box; border:1px solid #ead7c0; border-radius:10px; padding:10px; background:#fff;">
        </label>
        <label style="font-size:13px; color:#5d5147;">我的使用场景
          <input id="${APP_ID}-scenario" placeholder="例如：通勤、学习、办公、旅行" style="margin-top:6px; width:100%; box-sizing:border-box; border:1px solid #ead7c0; border-radius:10px; padding:10px; background:#fff;">
        </label>
        <label style="font-size:13px; color:#5d5147;">我最在意的点
          <input id="${APP_ID}-care" placeholder="例如：续航、性能、轻便、售后" style="margin-top:6px; width:100%; box-sizing:border-box; border:1px solid #ead7c0; border-radius:10px; padding:10px; background:#fff;">
        </label>
        <label style="font-size:13px; color:#5d5147;">我不能接受的点
          <input id="${APP_ID}-avoid" placeholder="例如：太重、噪音大、维修贵" style="margin-top:6px; width:100%; box-sizing:border-box; border:1px solid #ead7c0; border-radius:10px; padding:10px; background:#fff;">
        </label>
      </div>

      <div style="font-size:13px; color:#7a6b5b; line-height:1.7; background:#fff; border:1px dashed #e9cda8; padding:12px; border-radius:12px; margin-bottom:12px;">
        小技巧：如果网页内容很杂，可以先用鼠标选中商品介绍、测评段落或评论摘要，再点击生成。脚本会优先使用你选中的文字。
      </div>

      <div style="display:flex; gap:10px; margin-bottom:12px;">
        <button id="${APP_ID}-generate" style="flex:1; border:none; background:#ff9f43; color:white; font-weight:700; border-radius:12px; padding:12px; cursor:pointer;">生成买前冷静提示词</button>
        <button id="${APP_ID}-copy" style="border:none; background:#2f3542; color:white; font-weight:700; border-radius:12px; padding:12px 18px; cursor:pointer;">复制</button>
      </div>

      <textarea id="${APP_ID}-output" placeholder="生成后的提示词会出现在这里。" style="width:100%; height:300px; box-sizing:border-box; border:1px solid #ead7c0; border-radius:12px; padding:12px; resize:vertical; background:#fff; line-height:1.6;"></textarea>

      <div id="${APP_ID}-status" style="font-size:13px; color:#8a6d3b; margin-top:10px;"></div>
    `;

    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    const closeBtn = document.getElementById(APP_ID + "-close");
    const generateBtn = document.getElementById(APP_ID + "-generate");
    const copyBtn = document.getElementById(APP_ID + "-copy");
    const output = document.getElementById(APP_ID + "-output");
    const status = document.getElementById(APP_ID + "-status");

    closeBtn.onclick = () => overlay.remove();

    overlay.addEventListener("click", function (event) {
      if (event.target === overlay) overlay.remove();
    });

    generateBtn.onclick = () => {
      const userInfo = {
        budget: document.getElementById(APP_ID + "-budget").value.trim(),
        scenario: document.getElementById(APP_ID + "-scenario").value.trim(),
        care: document.getElementById(APP_ID + "-care").value.trim(),
        avoid: document.getElementById(APP_ID + "-avoid").value.trim()
      };

      output.value = buildPrompt(userInfo);
      status.textContent = "已生成。复制后粘贴到 Chat，即可得到购买避坑分析。";
    };

    copyBtn.onclick = () => {
      const text = output.value.trim();

      if (!text) {
        status.textContent = "请先生成提示词。";
        return;
      }

      copyText(text).then(() => {
        status.textContent = "已复制到剪贴板。现在可以粘贴到 Chat 里分析。";
      }).catch(() => {
        status.textContent = "复制失败，请手动选中文本复制。";
      });
    };
  }

  const button = document.createElement("button");
  button.id = APP_ID;
  button.textContent = "买前冷静";
  button.style.cssText = `
    position: fixed;
    right: 22px;
    bottom: 22px;
    z-index: 2147483645;
    border: none;
    border-radius: 999px;
    padding: 13px 18px;
    background: linear-gradient(135deg, #ff9f43, #ff6b6b);
    color: white;
    font-size: 15px;
    font-weight: 800;
    cursor: pointer;
    box-shadow: 0 10px 28px rgba(255, 107, 107, 0.35);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, "Microsoft YaHei", sans-serif;
  `;

  button.onclick = createPanel;
  document.body.appendChild(button);
})();