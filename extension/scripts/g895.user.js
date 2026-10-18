(async () => {
  const title = document.title || "未识别标题";
  const url = location.href;
  const now = new Date().toISOString();
  const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();
  const moneyLike = /(?:人民币|RMB|HKD|USD|US\$|￥|¥|\$)?\s*-?\d[\d,]*(?:\.\d+)?\s*(?:亿元|亿|万元|万|元|港元|美元|%|百分点|股|万股|亿股)?/gi;

  const groups = [
    {
      category: "财务摘要",
      terms: [
        "营业收入",
        "营收",
        "毛利",
        "毛利率",
        "净利润",
        "扣非净利润",
        "经营活动产生的现金流量净额",
        "经营现金流",
        "研发费用",
        "销售费用",
        "现金及现金等价物",
        "负债合计",
        "资产负债率"
      ]
    },
    {
      category: "股权与融资",
      terms: [
        "股东",
        "持股比例",
        "持股",
        "股权变动",
        "募集资金",
        "募资",
        "发行价格",
        "发行价",
        "估值",
        "投后估值",
        "隐含估值"
      ]
    },
    {
      category: "关键条款",
      terms: [
        "关联交易",
        "对赌",
        "回购",
        "优先权",
        "锁定期",
        "重大客户",
        "主要客户",
        "供应商依赖",
        "诉讼",
        "仲裁",
        "监管问询"
      ]
    },
    {
      category: "风险提示",
      terms: [
        "风险",
        "不确定性",
        "依赖",
        "亏损",
        "监管",
        "合规",
        "诉讼",
        "仲裁",
        "客户集中",
        "供应商集中"
      ]
    }
  ];

  const rows = [];
  const seen = new Set();
  const addRow = (row) => {
    const key = [row.category, row.indicator, row.rawValue, row.location, row.excerpt].map(clean).join("|");
    if (seen.has(key)) return;
    seen.add(key);
    rows.push(row);
  };

  const valueNearTerm = (text, term) => {
    const idx = text.indexOf(term);
    const windowText = idx >= 0 ? text.slice(Math.max(0, idx - 60), idx + term.length + 140) : text;
    const matches = windowText.match(moneyLike) || [];
    return matches.slice(0, 4).map(clean).join("; ");
  };

  const confidenceFor = (text, rawValue, fromTable) => {
    if (fromTable && rawValue) return "高";
    if (rawValue && /第?\s*\d+\s*(页|章|节)|单位[:：]|截至|报告期|年度|年|月/.test(text)) return "中";
    return rawValue ? "中" : "低";
  };

  const classify = (text) => {
    const hits = [];
    for (const group of groups) {
      for (const term of group.terms) {
        if (text.includes(term)) hits.push({ category: group.category, term });
      }
    }
    return hits;
  };

  const bodyText = clean(document.body?.innerText || "");
  const lines = (document.body?.innerText || "")
    .split(/\n+/)
    .map(clean)
    .filter((line) => line.length >= 8 && line.length <= 500);

  lines.forEach((line, index) => {
    for (const hit of classify(line)) {
      const rawValue = valueNearTerm(line, hit.term);
      addRow({
        category: hit.category,
        indicator: hit.term,
        rawValue: rawValue || "未识别",
        normalizedValue: "",
        periodOrObject: "",
        unitCurrency: "",
        location: `页面文本第 ${index + 1} 行附近`,
        excerpt: line.slice(0, 180),
        confidence: confidenceFor(line, rawValue, false),
        note: rawValue ? "" : "建议人工复核原文附近数字"
      });
    }
  });

  Array.from(document.querySelectorAll("table")).forEach((table, tableIndex) => {
    Array.from(table.rows || []).forEach((tr, rowIndex) => {
      const cells = Array.from(tr.cells || []).map((cell) => clean(cell.innerText));
      const text = cells.join(" | ");
      if (!text) return;
      for (const hit of classify(text)) {
        const rawValue = valueNearTerm(text, hit.term) || cells.filter((cell) => /\d/.test(cell)).slice(0, 4).join("; ");
        addRow({
          category: hit.category,
          indicator: hit.term,
          rawValue: rawValue || "未识别",
          normalizedValue: "",
          periodOrObject: cells.slice(0, 2).join(" / "),
          unitCurrency: /亿元|万元|元|港元|美元|%/.exec(text)?.[0] || "",
          location: `表格 ${tableIndex + 1} 第 ${rowIndex + 1} 行`,
          excerpt: text.slice(0, 180),
          confidence: confidenceFor(text, rawValue, true),
          note: ""
        });
      }
    });
  });

  const meta = [
    ["文档标题", title],
    ["页面 URL", url],
    ["抽取时间", now],
    ["页面字符数", String(bodyText.length)]
  ];

  const headers = ["类别", "指标/条款", "原始值", "标准化值", "期间/对象", "单位/币种", "原文位置", "原文短摘", "置信度", "人工核验备注"];
  const escapeCell = (value) => clean(value).replace(/\|/g, "\\|");
  const markdownRows = rows.map((row) => [
    row.category,
    row.indicator,
    row.rawValue,
    row.normalizedValue,
    row.periodOrObject,
    row.unitCurrency,
    row.location,
    row.excerpt,
    row.confidence,
    row.note
  ].map(escapeCell));

  const markdown = [
    "# 公告/招股书关键数据抽取结果",
    "",
    ...meta.map(([key, value]) => `- ${key}：${value}`),
    "",
    rows.length ? `共识别 ${rows.length} 条候选记录。请以原文位置为准进行人工复核。` : "未识别到明显候选记录，请确认当前页面是否已加载正文或 PDF 文本层。",
    "",
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...markdownRows.map((row) => `| ${row.join(" | ")} |`),
    "",
    "CSV 字段顺序：",
    headers.join(",")
  ].join("\n");

  const csvEscape = (value) => `"${clean(value).replace(/"/g, '""')}"`;
  const csv = [
    headers.map(csvEscape).join(","),
    ...markdownRows.map((row) => row.map(csvEscape).join(","))
  ].join("\n");

  const panel = document.createElement("div");
  panel.style.cssText = [
    "position:fixed",
    "right:24px",
    "bottom:24px",
    "width:min(720px,calc(100vw - 48px))",
    "height:min(560px,calc(100vh - 48px))",
    "z-index:2147483647",
    "background:#fff",
    "color:#111",
    "border:1px solid rgba(0,0,0,.18)",
    "box-shadow:0 20px 60px rgba(0,0,0,.28)",
    "border-radius:12px",
    "font:13px/1.5 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
    "display:flex",
    "flex-direction:column",
    "overflow:hidden"
  ].join(";");

  panel.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;padding:12px 14px;border-bottom:1px solid rgba(0,0,0,.1);">
      <strong style="font-size:14px;flex:1;">公告/招股书关键数据抽取台</strong>
      <button data-action="copy-md">复制 Markdown</button>
      <button data-action="download-csv">下载 CSV</button>
      <button data-action="close">关闭</button>
    </div>
    <textarea style="flex:1;width:100%;box-sizing:border-box;border:0;padding:14px;font:12px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace;resize:none;outline:none;"></textarea>
  `;
  panel.querySelector("textarea").value = markdown;
  panel.addEventListener("click", async (event) => {
    const action = event.target?.dataset?.action;
    if (!action) return;
    if (action === "close") panel.remove();
    if (action === "copy-md") {
      await navigator.clipboard.writeText(markdown);
      event.target.textContent = "已复制";
      setTimeout(() => (event.target.textContent = "复制 Markdown"), 1200);
    }
    if (action === "download-csv") {
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "filing-extraction.csv";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }
  });
  document.body.appendChild(panel);
  console.log(markdown);
  return { rows, markdown, csv };
})();