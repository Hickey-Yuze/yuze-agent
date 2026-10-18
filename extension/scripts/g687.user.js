/* ==========================================================================
 * JD Lens · 求职 JD 智能助手
 * 在任意招聘页面（Boss直聘/实习僧/公司官网）用 AI 提取 JD 结构化信息
 * 一键存入多维表格或复制到 Excel，追踪投递进度
 * 还支持简历适配度打分（粘贴简历文本，AI 分析匹配度）
 *
 * 核心原则：岗位职责、岗位要求、加分项 一律照搬原文，不做 AI 提炼概括
 *
 * 使用方式：
 *   1. 安装到 Tabbit 浏览器
 *   2. 终端启动本地服务：node proxy.js（默认端口 8788）
 *   3. 飞书开放平台创建自建应用，开通 bitable 和 wiki 权限
 *   4. 在多维表格右上角「...」→「...更多」→ 添加文档应用 → 搜索应用名 → 添加为可编辑
 *   5. 单击悬浮球 → 设置 → 填写应用 ID / 密钥 / 表格 Token / Table ID
 *      - 凭证保存在本地服务，不经过脚本代码
 *      - 已配置的凭证以掩码显示，留空不修改
 *   6. 打开任意 JD 页面，右下角出现悬浮球 🔍
 *   7. 单击悬浮球 → 打开侧边栏，点「分析 JD」提取信息
 *      - 可点「编辑」修改提取结果
 *      - 已配置凭证 → 点「存入飞书」写入多维表格
 *      - 未配置凭证 → 点「复制到 Excel」复制 TSV 格式，粘贴到 Excel 自动分列
 *      - 可点「适配度分析」粘贴简历文本，AI 输出匹配度分数 + 匹配点 + 缺失项
 *   8. 长按悬浮球 → 直接提取 + 存入/复制 Excel（不弹窗，FAB 颜色反馈）
 *      - 长按时进度环走完一圈松手才触发
 *      - 黄色 ⏳ = 处理中
 *      - 绿色 ✓ = 成功（附音效）
 *      - 红色 ✕ = 失败（附音效）
 *   9. 已存过的页面再次长按 → 闪绿提示已存，不重复提取
 *  10. 双击悬浮球 → 隐藏，页面右下角小半圆按钮点击恢复
 *  11. 设置页凭证状态自动检测
 *
 * 安全说明：凭证仅存在本地服务的配置文件中，不经过脚本代码
 *
 * 暗色主题：跟随系统自动切换，无需手动配置
 *
 * 表格列名：公司名称、岗位名称、岗位类型(多选)、行业(单选)、类型(单选)、
 *   薪资、base地(多选)、是否hc(单选)、投递链接、职位描述、职位要求、加分项、
 *   ddl(日期)、投递须知、投递状态(单选)、是否下线(单选)、更新时间(日期)
 * ==========================================================================
 */

(function () {
  'use strict';

  // ==================== 本地服务地址 ====================

  // 悬浮球图标（base64 内联）
  const FAB_ICONS = {
    normal: 'data:image/png;base64,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',
    collecting: 'data:image/png;base64,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',
    error: 'data:image/png;base64,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',
    success: 'data:image/png;base64,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',
  };

  const PROXY_URL = 'http://localhost:8788';
  let _configured = false;  //是否已配置凭证

  function getProxyUrl() {
    return PROXY_URL;
  }

  // 先试 fetch，失败则返回错误
  async function smartFetch(path, options = {}) {
    const resp = await fetch(getProxyUrl() + path, options);
    return await resp.json();
  }

  // 检查是否已配置（不暴露任何凭证）
  async function checkConfigured() {
    try {
      const data = await smartFetch('/config');
      if (data.code === 0 && data.data) {
        _configured = !!data.data.configured;
        return _configured;
      }
    } catch (e) {
      console.log('[JD Lens] 检查配置失败:', e.message);
    }
    return false;
  }

  function isFeishuConfigured() {
    return _configured;
  }

  async function isFeishuConfiguredAsync() {
    if (!_configured) await checkConfigured();
    return _configured;
  }

  // ==================== 平台检测 ====================

  function detectPlatform(url) {
    if (url.includes('zhipin.com')) return 'boss';
    if (url.includes('shixiseng.com')) return 'shixiseng';
    if (url.includes('zhaopin.meituan.com')) return 'meituan';
    return 'generic';
  }

  function detectPlatformLabel(url) {
    const p = detectPlatform(url);
    if (p === 'boss') return 'Boss直聘';
    if (p === 'shixiseng') return '实习僧';
    if (p === 'meituan') return '美团招聘官网';
    return '公司官网';
  }

  // SPA 页面等待动态内容渲染
  function waitForContent(maxWait = 8000) {
    return new Promise((resolve) => {
      const start = Date.now();
      function check() {
        const body = (document.body.textContent || '').replace(/\s/g, '');
        if (body.length > 200 || Date.now() - start > maxWait) {
          resolve();
        } else {
          setTimeout(check, 300);
        }
      }
      check();
    });
  }

  // ==================== 页面文本提取 ====================

  const PLATFORM_SELECTORS = {
    boss: {
      title: ['.job-name', '.name .job-title', '.job-detail .name h1'],
      company: ['.company-name', '.sider-company .name', '.company-info .name'],
      salary: ['.salary', '.job-detail .salary'],
      location: ['.job-area', '.job-detail .info-text'],
      description: ['.job-detail-section', '.job-sec-text', '.job-detail .job-sec'],
    },
    shixiseng: {
      title: ['.job_name', '.position-title', 'h1.title', '.job-title', '.pos-title', '.detail-title'],
      company: ['.company-name', '.com-name', '.company-name a', '.company-info .name', '.com-name a'],
      salary: ['.salary', '.job-mid .salary', '.job-salary', '.salary-text'],
      location: ['.job-city', '.job-mid .city', '.job-location', '.city-name'],
      description: ['.job-detail', '.pos-description', '.detail-content', '.job-item .item-text', '.responsibility', '.job-detail-content', '.detail-desc', '.job-content', '.position-detail'],
    },
    meituan: {
      title: ['.position-name', '.job-title', '.positin_detail_title', '.title'],
      company: [],
      salary: ['.salary', '.job-salary'],
      location: ['.work-location', '.job-location', '.position-location'],
      description: ['.positin_detail_info', '.position-description', '.job-detail'],
    },
  };

  function trySelector(selectors) {
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && (el.textContent || '').trim()) return el.textContent.trim();
    }
    return null;
  }

  function extractByDOM(platform) {
    const selectors = PLATFORM_SELECTORS[platform];
    if (!selectors) return null;
    return {
      title: trySelector(selectors.title),
      company: trySelector(selectors.company),
      salary: trySelector(selectors.salary),
      location: trySelector(selectors.location),
      description: trySelector(selectors.description),
    };
  }

  function extractPageText() {
    const url = window.location.href;
    const platform = detectPlatform(url);
    
    // 先提取全页可见文本（包含更新时间、校招标签等页面级信息）
    const fullClone = document.body.cloneNode(true);
    fullClone.querySelectorAll('script, style, noscript, iframe, svg').forEach(n => n.remove());
    let fullText = structuredText(fullClone).replace(/\n{3,}/g, '\n\n').trim();

    // 平台优先：用已知选择器提取 JD 描述区域，作为主文本
    if (platform !== 'generic') {
      const selectors = PLATFORM_SELECTORS[platform];
      if (selectors && selectors.description) {
        for (const sel of selectors.description) {
          const el = document.querySelector(sel);
          if (el && (el.textContent || '').trim().length > 100) {
            const clone = el.cloneNode(true);
            clone.querySelectorAll('script, style, noscript, iframe, svg').forEach(n => n.remove());
            const text = structuredText(clone).replace(/\n{3,}/g, '\n\n').trim();
            if (text.length > 50) {
              // 补充标题等其他字段
              const title = trySelector(selectors.title);
              const company = trySelector(selectors.company);
              const salary = trySelector(selectors.salary);
              const location = trySelector(selectors.location);
              let combined = '';
              if (title) combined += title + '\n\n';
              if (company) combined += company + '\n';
              if (salary) combined += salary + '\n';
              if (location) combined += location + '\n\n';
              combined += text;
              // 追加页面元信息区域（更新时间、工作地点、部门等）
              const metaSelectors = ['.split_line_box', '.job-meta', '.detail-meta', '.position-meta', '.job-info', '.detail-info', '.position-info'];
              for (const ms of metaSelectors) {
                const metaEl = document.querySelector(ms);
                if (metaEl) {
                  const metaText = structuredText(metaEl.cloneNode(true)).replace(/\n{3,}/g, '\n\n').trim();
                  if (metaText && metaText.length < 2000) {
                    combined += '\n\n--- 页面元信息 ---\n' + metaText;
                    break;
                  }
                }
              }
              // 只追加页面底部区域的小段文本（更新时间、校招标签等通常在此）
              // 不再追加全页文本，避免过多无关内容触发内容审核
              const pageFooter = document.querySelector('.job-detail-footer, .detail-footer, .job-meta, .job-info, .position-tag, .tags, .job-tags, .recruit-tag, .entry-meta, .post-meta, .job-extra, .position-extra, .detail-tag');
              if (pageFooter) {
                const footerText = structuredText(pageFooter.cloneNode(true)).replace(/\n{3,}/g, '\n\n').trim();
                if (footerText && footerText.length < 2000) {
                  combined += '\n\n--- 页面附加信息 ---\n' + footerText;
                }
              }
              // 补充页面标题（可能包含校招标签等信息）
              const dt = document.title;
              if (dt) combined += '\n\n--- 页面标题 ---\n' + dt;
              if (combined.length > 12000) {
                const cut = combined.lastIndexOf('\n\n', 12000);
                combined = combined.slice(0, cut > 8000 ? cut : 12000);
              }
              return combined;
            }
          }
        }
      }
    }
    
    // 通用 fallback
    const containers = document.querySelectorAll(
      '#app-container, main, article, #app, #root, #content, .content, .job-detail, .detail-content, .position-description, .position-content, [role="main"]'
    );
    let el = null;
    for (const c of containers) {
      if ((c.textContent || '').length > 200) { el = c; break; }
    }
    if (!el) el = document.body;

    const clone = el.cloneNode(true);
    clone.querySelectorAll('script, style, noscript, iframe, svg, nav, footer, header, .sidebar, .nav, .menu, .footer, .header-bar, .zp_header, .zp_footer').forEach(n => n.remove());

    let text = structuredText(clone).replace(/\n{3,}/g, '\n\n').trim();
    if (text.length > 12000) {
      const cut = text.lastIndexOf('\n\n', 12000);
      text = text.slice(0, cut > 8000 ? cut : 12000);
    }
    return text;
  }

  function structuredText(root) {
    const BLOCK_TAGS = new Set(['DIV', 'P', 'BR', 'LI', 'TR', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'SECTION', 'ARTICLE', 'DT', 'DD']);
    let result = '';

    function walk(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        const t = node.textContent.replace(/\s+/g, ' ').trim();
        if (t) result += t + ' ';
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;

      const tag = node.tagName;
      const isBlock = BLOCK_TAGS.has(tag);

      for (const child of node.childNodes) {
        walk(child);
      }

      if (isBlock) result += '\n';
    }

    walk(root);
    return result;
  }

  function getPageTitle() {
    return document.title || '';
  }

  // ==================== AI 提取（LLMBridge）====================

  const EXTRACT_PROMPT_TEMPLATE = `你是一个求职信息提取助手。请从以下招聘页面文本中提取结构化信息。

【重要原则】
- 岗位名称、岗位职责、岗位要求、加分项必须照搬原文，一字不改，不要概括、提炼或改写
- 只提取原文中已有的内容，不要自己生成

【页面标题】
{PAGE_TITLE}

【当前页面 URL】
{URL}

【页面文本内容】
{PAGE_TEXT}

请提取以下字段，返回 JSON 格式：
{
  "title": "岗位名称，照搬原文标题",
  "company": "公司名称",
  "location": "工作地点，照搬原文",
  "salary": "薪资范围，照搬原文，如 15-25K·13薪，无则 null",
  "position_category": "根据岗位职责内容判断岗位类型（描述工作内容，不是招聘性质）。从以下选项中选择最匹配的一个或多个：产品/运营/AI/用研/企平/研发/设计/数据/市场/销售/人力资源/财务/法务/其他。可以多选，用逗号分隔。例如：产品,AI。注意：不要返回实习/秋招/春招等招聘性质，只返回工作内容类型",
  "job_type": "从以下选项中选择一个：日常实习/暑期实习/秋招/秋招提前批/春招/社招。判断规则（按优先级）：1) 首先看JD内容：如果岗位标题或职责中明确提到实习、Intern，则判定为实习类，默认日常实习，如果JD中明确提到暑期则为暑期实习；2) 如果JD内容是正式员工招聘（非实习），再看URL：highlightType=campus通常是秋招或春招，highlightType=social通常是社招；3) 无法判断则 null",
  "update_time": "岗位更新时间，从页面中寻找更新/刷新时间相关的文本。常见表述：刷新于 2024-03-15、更新于 2024/03/15、2024.03.15 刷新、3天前刷新、刷新于今天等。提取出日期，格式统一为 YYYY/MM/DD。相对时间（如3天前）也转为具体日期。找不到则返回 null",
  "ddl": "投递截止日期，从JD中提取，如 2026/09/30 或 2026年9月30日。如果没有明确截止日期则返回 null",
  "industry": "根据岗位内容判断所属行业，如 互联网/金融/教育/快消/制造业等。返回一个简短的行业名称",
  "responsibilities": "岗位职责原文，完整照搬，多段用 \\n 分隔",
  "requirements": "岗位要求原文，完整照搬，多段用 \\n 分隔",
  "bonus": "加分项原文，完整照搬，多段用 \\n 分隔。没有加分项则返回 null",
  "is_jd_page": "当前页面是否是招聘JD页面，true 或 false",
  "has_applied": "判断用户是否已经投递过此岗位。看页面上是否有\"已投递\"\"已申请\"\"已沟通\"\"当前职位无法投递\"等状态标记，有则 true，没有或无法判断则 false",
  "confidence": "high/medium/low"
}

注意：
1. title/responsibilities/requirements/bonus：照搬原文，不要概括。如果原文有分点列举，保留每一条的原文。
2. is_jd_page：不是招聘信息页面返回 false。
3. has_applied：根据页面上的投递状态按钮/标记判断。
4. job_type：优先看JD内容是否实习（标题/职责含"实习""Intern"则是实习类），不要仅凭URL判断。

只返回 JSON，不要其他内容。`;

  // ========== 简历 AI 判断提示词（可修改） ==========
  // 如需调整匹配规则，修改下方 MATCH_PROMPT_TEMPLATE 即可
  const MATCH_PROMPT_TEMPLATE = `你是一个求职匹配度分析助手。请根据以下 JD（岗位描述）和候选人简历，进行结构化的匹配度分析。

【JD 信息】

岗位名称：{JD_TITLE}

公司：{JD_COMPANY}

岗位职责：

{JD_RESPONSIBILITIES}

岗位要求：

{JD_REQUIREMENTS}

加分项：

{JD_BONUS}

【候选人简历】

{RESUME_TEXT}

【分析步骤】

第一步：JD 拆解
从 JD 中提取以下结构化信息（内部使用，不输出）：
- 硬性要求：学历、专业、工作年限、必备技能、必备经验、证书等
- 软性要求：沟通能力、团队协作、抗压能力等
- 加分项：JD 中明确标注"优先""加分""preferred""plus"的条目
- 隐性信号：从岗位职责推断的隐性要求（如"负责多团队协作"隐含需要跨团队沟通能力）

第二步：简历信息提取
从简历中提取以下结构化信息（内部使用，不输出）：
- 学历信息：最高学历、毕业院校层次、专业
- 工作经验：总工作年限、相关领域年限、公司背景
- 技能清单：技术技能及相关工具，标注熟练度（精通/熟练/熟悉/了解）
- 项目经历：项目内容、个人角色、可量化的成果
- 证书与语言：各类证书、语言成绩
- 其他亮点：竞赛、开源、论文、专利等

第三步：逐项匹配
对第一步提取的每条要求，与第二步提取的简历信息逐项比对，判断为以下四种状态之一：
- 明确匹配：简历中有明确证据满足该要求
- 部分匹配：简历有相关经历但未完全满足（如 JD 要求 3 年经验，简历有 2 年；JD 要求精通 SQL，简历写"熟悉数据库"）
- 不匹配：JD 明确要求但简历中完全没有相关体现
- 无法判断：简历提供了相关信息但无法确认是否满足（如 JD 要求"有支付系统经验"，简历写了"金融行业实习"但未说明具体方向）

第四步：评分计算
score 基于"硬性要求"的匹配程度计算，满分 100 分：
- 硬性要求项共 N 条，每条权重 = 100/N
- 明确匹配：该条得满分
- 部分匹配：该条得 50% 分
- 不匹配：该条得 0 分
- 无法判断：该条得 30% 分（给一定的容错空间，但低于部分匹配）
- 加分项不参与扣分；如果加分项有明确匹配，每条额外加 2 分，总分不超过 100
- 软性要求和隐性信号不参与计分，但如果有不匹配或无法判断的情况，记入 risks
- 最终 score 四舍五入为整数

【层级覆盖规则】

在逐项匹配时，如果简历持有的资质在层级上高于 JD 要求，视为"明确匹配"：

⚠️ 前提条件（最高优先级）：以下层级覆盖规则仅在简历明确提及该资质时适用。如果简历未提及某项资质，不得通过学历、院校层次、专业等间接信息推断满足，必须归为"无法判断"并记入 risks。

例如：JD 要求英语四级，简历未提及任何英语成绩 → 不得因"985 硕士"推断满足 → 归为"无法判断"并记入 risks，注明"简历未体现英语成绩，需核实"

1. 学历层级：博士 > 硕士 > 本科 > 大专
2. 语言层级：六级 > 四级；雅思 7.0 > 雅思 6.0 > 雅思 5.5；托福 100 > 托福 80；专八 > 专四
3. 技能熟练度：精通 > 熟练 > 熟悉 > 了解（JD 要求"熟悉"而简历写"精通"→匹配；反之简历写"了解"而 JD 要求"精通"→部分匹配）
4. 经验年限：简历年限 ≥ JD 要求年限 → 明确匹配；简历年限 ≥ JD 要求年限的 60% → 部分匹配；否则 → 不匹配
5. 证书/职称层级：高级 > 中级 > 初级；CPA > 初级会计；PMP > 无项目管理证书
6. 管理规模：简历管理人数/团队规模 ≥ JD 要求 → 明确匹配；低于但有管理经验 → 部分匹配；无管理经验 → 不匹配或无法判断（视 JD 措辞而定）

【输出格式】

返回以下 JSON（只返回 JSON，不要 markdown 代码块，不要任何其他文字）：

{
  "score": 0-100 的整数，总体匹配度,
  "dimensions": {
    "education": "匹配 | 部分匹配 | 不匹配 | 无法判断 — 学历相关匹配情况",
    "experience": "匹配 | 部分匹配 | 不匹配 | 无法判断 — 工作经验相关匹配情况",
    "skills": "匹配 | 部分匹配 | 不匹配 | 无法判断 — 技能匹配情况",
    "projects": "匹配 | 部分匹配 | 不匹配 | 无法判断 — 项目经历匹配情况",
    "others": "匹配 | 部分匹配 | 不匹配 | 无法判断 — 证书、语言等其他要求匹配情况"
  },
  "matched": [
    "简历中明确满足 JD 要求的关键点，每条一句话，包含 JD 中的关键词和简历中的对应证据"
  ],
  "partial": [
    "简历有相关经历但未完全满足 JD 要求的点，每条一句话说明差在哪里",
    "格式：JD 要求 X — 简历有 Y — 差距说明 Z"
  ],
  "missing": [
    "JD 明确要求但简历中完全没有体现的点，每条一句话"
  ],
  "highlights": [
    "简历中的差异化亮点（不一定在 JD 要求中，但能让候选人在同批求职者中脱颖而出），每条一句话"
  ],
  "risks": [
    "简历提供了相关信息但无法确认是否满足 JD 要求的点，每条一句话说明不确定的原因",
    "格式：JD 要求 X — 简历提到 Y — 风险点 Z（说明为什么无法判断）"
  ],
  "bonus_matched": [
    "JD 加分项中简历明确满足的点，每条一句话"
  ],
  "summary": "一句话总结匹配情况，包含匹配度水平和最关键的优势或短板",
  "suggestion": "对该岗位的投递建议，三选一：推荐投递 / 谨慎投递 / 不建议投递，附一句话理由"
}

【注意事项】

1. 不要编造简历中没有的技能或经历
2. matched 仅包含简历中明确写明且确定满足的点。不得通过推理、间接证据或学历层次推断满足——如果简历没明确提及某项要求，即使可以从其他信息推断，也不能放入 matched
3. matched 和 partial 的区分标准：matched 是"确认满足"，partial 是"有相关但不完全满足"
4. risks 仅用于"无法判断"的情况，不要和 partial（部分匹配）混淆
5. 同一条目不得同时出现在 matched 和 risks 中。如果一个点不确定，只能放 risks，不能放 matched
6. 每个 dimension 的值必须与 matched/partial/missing/risks 中的条目逻辑一致
7. 如果 JD 的某个维度信息为空（如没有加分项），对应数组返回空数组
8. summary 中提及匹配度水平时参考：85+ 高度匹配，70-84 较匹配，55-69 一般匹配，40-54 弱匹配，40 以下不匹配
9. 只返回 JSON，不要其他内容。不要用 \`\`\`json 包裹。`;

  async function extractJDWithAI() {
    const url = window.location.href;
    const platform = detectPlatform(url);

    await waitForContent();

    const pageText = extractPageText();
    const pageTitle = getPageTitle();

    if (!pageText || pageText.length < 50) {
      throw new Error('这个页面文字太少了，可能不是招聘 JD 页面。请打开一个具体的岗位详情页再试。');
    }

    const prompt = EXTRACT_PROMPT_TEMPLATE
      .replace('{PAGE_TITLE}', pageTitle)
      .replace('{URL}', url)
      .replace('{PAGE_TEXT}', pageText);

    const result = await LLMBridge.chat(prompt, "json");
    console.log('[JD Lens] LLMBridge raw result:', result);

    let cleaned = result;
    if (typeof cleaned === 'string') {
      cleaned = cleaned.trim();
      const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (fenceMatch) cleaned = fenceMatch[1].trim();
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace > -1 && lastBrace > firstBrace) {
        cleaned = cleaned.slice(firstBrace, lastBrace + 1);
      }
    }
    let data;
    if (typeof cleaned === 'object') {
      data = cleaned;
    } else {
      data = JSON.parse(cleaned);
    }
    console.log('[JD Lens] parsed data:', JSON.stringify(data, null, 2));

    if (platform !== 'generic') {
      const domData = extractByDOM(platform);
      if (domData) {
        if (domData.title && (!data.title || data.title.length < 2)) data.title = domData.title;
        if (domData.company && (!data.company || data.company.length < 2)) data.company = domData.company;
        if (domData.salary && (!data.salary || data.salary.length < 2)) data.salary = domData.salary;
        if (domData.location && (!data.location || data.location.length < 2)) data.location = domData.location;
      }
    }

    // 实习僧校招图标检测：页面有 img.xz_icon 说明是校招岗位
    if (platform === 'shixiseng') {
      const xzIcon = document.querySelector('img.xz_icon');
      if (xzIcon) {
        // 有校招图标，强制设为秋招
        if (!data.job_type || data.job_type === '日常实习' || data.job_type === '暑期实习') {
          data.job_type = '秋招';
        }
      }
    }

    // （更新时间由 AI 语义识别，不使用正则补充）

    if (platform === 'meituan' && !data.company) {
      data.company = '美团';
    }

    return data;
  }

  // ==================== 适配度分析（LLMBridge）====================

  let _lastResume = '';  // 保留上次粘贴的简历文本

  // 简历持久化到 localStorage（同域名下跨页面复用）
  const RESUME_STORAGE_KEY = 'jd-lens-resume';

  function loadStoredResume() {
    try {
      _lastResume = localStorage.getItem(RESUME_STORAGE_KEY) || '';
    } catch (e) { _lastResume = ''; }
  }

  function saveResumeToStorage(text) {
    try {
      localStorage.setItem(RESUME_STORAGE_KEY, text);
    } catch (e) { /* localStorage 不可用时静默降级 */ }
  }

  function clearStoredResume() {
    try {
      localStorage.removeItem(RESUME_STORAGE_KEY);
    } catch (e) {}
    _lastResume = '';
  }

  // 页面加载时恢复简历
  loadStoredResume();

  async function matchJDWithAI(jdData, resumeText) {
    if (!resumeText || resumeText.trim().length < 20) {
      throw new Error('简历内容太少，请粘贴更完整的简历文本');
    }
    _lastResume = resumeText;  // 缓存到内存
    saveResumeToStorage(resumeText);  // 持久化到 localStorage

    const prompt = MATCH_PROMPT_TEMPLATE
      .replace('{JD_TITLE}', jdData.title || '')
      .replace('{JD_COMPANY}', jdData.company || '')
      .replace('{JD_RESPONSIBILITIES}', jdData.responsibilities || '无')
      .replace('{JD_REQUIREMENTS}', jdData.requirements || '无')
      .replace('{JD_BONUS}', jdData.bonus || '无')
      .replace('{RESUME_TEXT}', resumeText);

    const result = await LLMBridge.chat(prompt, "json");
    console.log('[JD Lens] match result:', result);

    let cleaned = result;
    if (typeof cleaned === 'string') {
      cleaned = cleaned.trim();
      const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (fenceMatch) cleaned = fenceMatch[1].trim();
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace > -1 && lastBrace > firstBrace) {
        cleaned = cleaned.slice(firstBrace, lastBrace + 1);
      }
    }
    let data;
    if (typeof cleaned === 'object') {
      data = cleaned;
    } else {
      data = JSON.parse(cleaned);
    }
    return data;
  }

  // ==================== 数据存入（通过本地服务，脚本不接触凭证）====================

  // 保存 JD 数据到表格（本地持有凭证，脚本只发业务数据）
  async function saveToFeishu(jdData) {
    // 补上当前页面 URL 作为投递链接
    const payload = { ...jdData, apply_link: jdData.apply_link || window.location.href };
    const data = await smartFetch('/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (data.code !== 0) {
      throw new Error(data.msg || '存入失败');
    }
    return data.data;
  }

  // 检查当前页面是否已存过（通过本地查询，不暴露凭证）
  // 轻量级 DOM 提取公司名（不用 AI，供静默查重使用）
  function quickExtractCompany() {
    const platform = detectPlatform(window.location.href);
    if (!platform || !PLATFORM_SELECTORS[platform]) return null;
    const selectors = PLATFORM_SELECTORS[platform];
    return trySelector(selectors.company || []);
  }

  async function checkIfAlreadySaved() {
    try {
      if (!await isFeishuConfiguredAsync()) return null;
      // 优先用已提取的 JD 数据，没有则从 DOM 快速提取公司名
      let company = null;
      if (currentJDData) {
        company = currentJDData.company;
      } else {
        company = quickExtractCompany();
      }
      const data = await smartFetch('/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applyLink: window.location.href,
          company: company,
        }),
      });
      if (data.code === 0 && data.data && data.data.exists) {
        return data.data.record || null;
      }
    } catch (e) {
      console.log('[JD Lens] check failed:', e.message);
    }
    return null;
  }

  // 将飞书表格字段映射回 JD Lens 内部数据格式
  function mapFeishuRecordToJD(fields) {
    function extractText(val) {
      if (!val) return null;
      if (typeof val === 'string') return val;
      if (Array.isArray(val)) return val.map(v => {
        if (typeof v === 'string') return v;
        if (v && v.text) return v.text;
        return String(v);
      }).join('、');
      if (val.text) return val.text;
      if (val.link) return val.link;
      return String(val);
    }

    return {
      title: extractText(fields['岗位名称']),
      company: extractText(fields['公司名称']),
      location: extractText(fields['base地']),
      salary: extractText(fields['薪资']),
      job_type: extractText(fields['类型']),
      position_category: extractText(fields['岗位类型']),
      industry: extractText(fields['行业']),
      responsibilities: extractText(fields['职位描述']),
      requirements: extractText(fields['职位要求']),
      bonus: extractText(fields['加分项']),
      ddl: extractText(fields['ddl']),
      apply_notice: extractText(fields['投递须知']),
      has_applied: extractText(fields['投递状态']) === '已投递',
      is_offline: extractText(fields['是否下线']) === '是',
      is_jd_page: true,
      confidence: 'high',
    };
  }

  // ==================== 侧边栏 UI（Shadow DOM 隔离）====================

  let panelHost = null;   // 外层宿主元素（挂在 body 上）
  let shadowRoot = null;  // Shadow Root（完全隔离页面 CSS）
  let fabEl = null;
  let currentJDData = null;
  let _panelMode = 'initial';  // 当前面板模式：initial/loading/result/error/empty/help/settings/edit/matchInput/matchResult
  let lastError = null;  // 长按失败时的错误信息，单击时展示

  // Shadow DOM 内部样式：不受页面 CSS 影响，也不需要 !important
  const SHADOW_STYLES = `
    :host {
      all: initial;
      --bg-panel: #ffffff;
      --bg-raw: #f9fafb;
      --bg-input: #ffffff;
      --bg-secondary: #F3F4F6;
      --text-primary: #1a1a1a;
      --text-secondary: #6b7280;
      --border-color: #E5E7EB;
      --border-light: #f0f0f0;
      --shadow: rgba(0,0,0,0.1);
      --accent: #1a1a1a;
      --accent-hover: #333333;
      --accent-text: #ffffff;
    }
    @media (prefers-color-scheme: dark) {
      :host {
        --bg-panel: #1e1e2e;
        --bg-raw: #2a2a3e;
        --bg-input: #2a2a3e;
        --bg-secondary: #3a3a4e;
        --text-primary: #e0e0e8;
        --text-secondary: #9999aa;
        --border-color: #3a3a4e;
        --border-light: #333344;
        --shadow: rgba(0,0,0,0.4);
        --accent: #e0e0e8;
        --accent-hover: #c0c0c8;
        --accent-text: #1e1e2e;
      }
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    #fab {
      position: fixed; right: 20px; bottom: 80px; z-index: 999998;
      width: 48px; height: 48px; border-radius: 50%;
      background: transparent; color: white; border: none; cursor: pointer;
      font-size: 20px; box-shadow: 0 4px 12px rgba(74,111,165,0.3);
      display: flex; align-items: center; justify-content: center;
      transition: transform 0.2s, box-shadow 0.2s;
      overflow: visible;
    }
    #fab .fab-icon {
      width: 48px; height: 48px; border-radius: 50%;
      object-fit: cover; display: block; pointer-events: none;
    }
    #fab:hover { transform: scale(1.1); box-shadow: 0 6px 16px rgba(74,111,165,0.4); }
    #fab.active { background: #10B981; }
    #fab.saved { background: #10B981; }
    #fab.saving { background: #F59E0B; }
    #fab.error { background: #EF4444; }
    #fab .progress-ring {
      position: absolute; top: -4px; left: -4px;
      width: 56px; height: 56px;
      opacity: 0; pointer-events: none;
    }
    #fab .progress-ring circle {
      fill: none; stroke: #F59E0B; stroke-width: 3;
      stroke-dasharray: 176; stroke-dashoffset: 176;
      transform: rotate(-90deg); transform-origin: center;
    }
    #fab.pressing .progress-ring { opacity: 1; }
    #fab.pressing .progress-ring circle {
      animation: ring-fill 0.8s linear forwards;
    }
    @keyframes ring-fill { to { stroke-dashoffset: 0; } }
    #fab.pressing { background: var(--accent); }
    #fab .fab-tip {
      position: absolute; right: 56px; top: 50%; transform: translateY(-50%);
      background: rgba(0,0,0,0.75); color: #fff; padding: 4px 10px;
      border-radius: 6px; font-size: 12px; white-space: nowrap;
      opacity: 0; pointer-events: none; transition: opacity 0.2s;
    }
    #fab:hover .fab-tip { opacity: 1; }

    #fab-show {
      position: fixed; right: 0; bottom: 80px; z-index: 999998;
      width: 20px; height: 40px; border-radius: 8px 0 0 8px;
      background: var(--accent); cursor: pointer; display: none;
      box-shadow: -2px 2px 8px var(--shadow); border: none; padding: 0;
      align-items: center; justify-content: center;
    }
    #fab-show.visible { display: flex; }
    #fab-show::after {
      content: '🔍'; font-size: 12px; opacity: 0.8;
    }

    #panel {
      position: fixed; z-index: 999999;
      width: 60vw; max-width: 400px; max-height: calc(100vh - 40px); overflow: hidden;
      background: var(--bg-panel); border-radius: 12px;
      box-shadow: 0 8px 32px var(--shadow);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px; color: var(--text-primary);
      display: none; flex-direction: column;
      border: none;
    }
    #panel.visible { display: flex; }

    #panel .header {
      flex-shrink: 0;
      padding: 10px 14px; background: var(--bg-panel); color: var(--text-primary);
      border-radius: 12px 12px 0 0; font-weight: 700; font-size: 15px;
      display: flex; justify-content: space-between; align-items: center;
      border-bottom: 1px solid var(--border-light);
    }
    #panel .header .close { cursor: pointer; font-size: 20px; opacity: 0.6; background: none; border: none; color: var(--text-primary); }
    #panel .header .close:hover { opacity: 1; }
    #panel .header .header-right { display: flex; align-items: center; gap: 6px; }
    #panel .header .help-btn {
      cursor: pointer; width: 20px; height: 20px; min-width: 20px;
      border: 1.5px solid var(--border-color); border-radius: 50%;
      background: none; color: var(--text-secondary); font-size: 11px; line-height: 1;
      display: flex; align-items: center; justify-content: center;
      opacity: 0.8; padding: 0; flex-shrink: 0;
    }
    #panel .header .help-btn:hover { opacity: 1; border-color: var(--text-secondary); color: var(--text-primary); }

    #panel .body { padding: 16px; overflow-y: auto; flex: 1 1 auto; min-height: 0; }
    #panel .field { margin: 0; padding: 0 0 12px 0; }
    #panel .field:last-child { padding-bottom: 0; }
    #panel .field-label {
      font-size: 12px; color: var(--text-secondary); margin: 0; font-weight: 500;
      padding: 0; line-height: 1.4; display: block;
    }
    #panel .field-value { font-size: 14px; line-height: 1.5; margin: 0; padding: 0; display: block; }
    #panel .field-value.raw {
      white-space: pre-wrap; word-break: break-word;
      background: var(--bg-raw); padding: 6px 8px; border-radius: 6px;
      font-size: 13px; line-height: 1.6; margin-top: 2px;
    }
    #panel .field-value.match-list {
      background: var(--bg-raw); padding: 6px 8px; border-radius: 6px;
      font-size: 13px; line-height: 1.8; margin-top: 2px;
      word-break: break-word;
    }
    #panel .tag {
      display: inline-block; padding: 2px 8px; border-radius: 4px;
      font-size: 12px; margin-right: 4px; margin-bottom: 2px;
    }
    #panel .tag.green { background: #D1FAE5; color: #065F46; }
    #panel .tag.blue { background: #DBEAFE; color: #1E40AF; }
    #panel .tag.gray { background: var(--bg-secondary); color: var(--text-secondary); }
    #panel .tag.orange { background: #FED7AA; color: #9A3412; }
    #panel .tag.purple { background: #E5E7EB; color: #374151; }

    #panel .actions {
      padding: 12px 16px 16px; display: flex; gap: 8px;
      flex-shrink: 0; border-top: 1px solid var(--border-light);
      background: var(--bg-panel); border-radius: 0 0 12px 12px;
      flex-wrap: wrap; justify-content: space-between;
    }
    #panel .btn {
      flex: 1 1 calc(50% - 4px); min-width: 0; padding: 8px 4px; border-radius: 8px; border: none; cursor: pointer;
      font-size: 12px; font-weight: 500; transition: opacity 0.2s; text-align: center;
      white-space: nowrap; letter-spacing: -0.3px;
    }
    #panel .btn-primary { background: var(--accent); color: var(--accent-text); }
    #panel .btn-secondary { background: var(--bg-secondary); color: var(--text-primary); }
    #panel .btn:hover { opacity: 0.9; }
    #panel .btn:disabled { opacity: 0.5; cursor: not-allowed; }

    #panel .loading { padding: 40px 16px; text-align: center; color: var(--text-secondary); }
    #panel .loading .spinner {
      width: 32px; height: 32px; border: 3px solid var(--border-color);
      border-top-color: var(--accent); border-radius: 50%;
      animation: spin 0.8s linear infinite; margin: 0 auto 12px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    #panel .error { padding: 16px; color: #EF4444; }
    #panel .success {
      padding: 12px 16px; background: #D1FAE5; color: #065F46;
      border-radius: 8px; margin: 8px 16px; font-size: 13px;
    }
    #panel .config-form { padding: 16px; }
    #panel .config-form input {
      width: 100%; padding: 8px; margin-bottom: 10px;
      border: 1px solid var(--border-color); border-radius: 6px; font-size: 13px;
      background: var(--bg-input); color: var(--text-primary);
    }
    #panel .edit-input {
      width: 100%; padding: 6px 8px; margin: 0;
      border: 1px solid var(--border-color); border-radius: 6px; font-size: 14px;
      line-height: 1.5; font-family: inherit; background: var(--bg-input); color: var(--text-primary);
    }
    #panel .edit-input:focus { border-color: #6366F1; outline: none; }
    #panel textarea.edit-input { resize: vertical; min-height: 80px; }
    #panel .config-form label {
      font-size: 12px; color: var(--text-secondary); margin-bottom: 4px; display: block;
    }
    #panel .empty { padding: 32px 16px; text-align: center; color: var(--text-secondary); }
  `;

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/\n/g, '<br>');
  }

  function createUI() {
    // 防重复创建
    if (document.getElementById('jd-lens-host')) return;
    document.getElementById('jd-lens-host')?.remove();

    // 创建宿主元素
    panelHost = document.createElement('div');
    panelHost.id = 'jd-lens-host';
    panelHost.style.cssText = 'all: initial; position: static; top: 0; left: 0; width: 0; height: 0; z-index: 999999;';
    document.body.appendChild(panelHost);

    // 创建 Shadow Root
    shadowRoot = panelHost.attachShadow({ mode: 'open' });

    // 注入样式
    const styleEl = document.createElement('style');
    styleEl.textContent = SHADOW_STYLES;
    shadowRoot.appendChild(styleEl);

    // 创建 FAB
    fabEl = document.createElement('button');
    fabEl.id = 'fab';
    fabEl.innerHTML = '<img class="fab-icon" src="' + FAB_ICONS.normal + '"><span class="fab-tip">单击查看 · 长按快存 · 双击隐藏</span><svg class="progress-ring"><circle cx="28" cy="28" r="28"></circle></svg>';
    fabEl.title = 'JD Lens - 单击查看，长按快存，双击隐藏';
    setupFabLongPress(fabEl);
    shadowRoot.appendChild(fabEl);

    // 创建隐藏后的呼出按钮
    const fabShow = document.createElement('button');
    fabShow.id = 'fab-show';
    fabShow.title = '点击恢复 JD Lens';
    fabShow.addEventListener('click', function() {
      fabEl.style.display = '';
      fabShow.classList.remove('visible');
    });
    shadowRoot.appendChild(fabShow);

    // 双击隐藏 FAB
    fabEl.addEventListener('dblclick', function(e) {
      e.preventDefault();
      e.stopPropagation();
      const panel = getPanel();
      if (panel) panel.classList.remove('visible');
      fabEl.style.display = 'none';
      fabShow.classList.add('visible');
    });

    // 创建面板容器
    const panel = document.createElement('div');
    panel.id = 'panel';
    shadowRoot.appendChild(panel);

    // 事件委托：关闭按钮 + 帮助按钮
    panel.addEventListener('click', function(e) {
      if (e.target.classList.contains('close')) {
        panel.classList.remove('visible');
      } else if (e.target.classList.contains('help-btn')) {
        renderHelp();
      }
    });

    renderInitial();

    // 页面加载后自动静默检查是否已存入飞书
    setTimeout(() => {
      checkIfAlreadySaved().then(record => {
        if (record) {
          currentJDData = mapFeishuRecordToJD(record);
          setFabState('saved');
        }
      }).catch(() => {});
    }, 1500);
  }

  function getPanel() {
    return shadowRoot.getElementById('panel');
  }

  function renderHelp(prevRenderer) {
    _panelMode = 'help';
    const panel = getPanel();
    panel.innerHTML = `
      <div class="header">
        <span>JD Lens 使用说明</span>
        <span class="header-right"><span class="help-btn" title="使用说明">?</span><span class="close">×</span></span>
      </div>
      <div class="body" style="font-size:13px;line-height:1.8;">
        <div style="font-weight:700;font-size:15px;margin-bottom:8px;">🚀 快速开始</div>
        <div style="margin-bottom:6px;color:#6b7280;">选择适合你的方式：</div>

        <div style="margin-bottom:14px;border:1px solid var(--border-color);border-radius:8px;padding:12px;">
          <div style="font-weight:600;margin-bottom:6px;">📦 方式一：不连飞书，直接用</div>
          <div style="margin-bottom:4px;">1. 安装脚本，打开任意招聘页面</div>
          <div style="margin-bottom:4px;">2. 单点悬浮球 → 打开侧边栏 → 点「分析 JD」</div>
          <div style="margin-bottom:4px;">3. 提取完成后点「复制到 Excel」</div>
          <div style="margin-bottom:4px;">4. 到 Excel 粘贴（横向一行，Tab 分隔）</div>
          <div style="margin-bottom:8px;">长按悬浮球可快速提取 + 自动复制</div>
          <div style="color:#6b7280;">无需启动任何服务，开箱即用</div>
        </div>

        <div style="margin-bottom:14px;border:1px solid var(--border-color);border-radius:8px;padding:12px;">
          <div style="font-weight:600;margin-bottom:6px;">🔗 方式二：连接飞书多维表格（推荐）</div>
          <div style="margin-bottom:4px;">1. 安装依赖妙招「JD Lens 本地服务」，复制代码保存为 <code style="background:rgba(0,0,0,0.08);padding:2px 6px;border-radius:4px;">proxy.js</code></div>
          <div style="margin-bottom:4px;">2. 终端运行 <code style="background:rgba(0,0,0,0.08);padding:2px 6px;border-radius:4px;">node proxy.js</code></div>
          <div style="color:#6b7280;margin-bottom:6px;">看到"服务已启动"即可</div>
          <div style="margin-bottom:4px;">3. 飞书开放平台创建自建应用，开通 bitable 和 wiki 权限</div>
          <div style="margin-bottom:4px;">4. 在多维表格右上角「...」→「...更多」→ 添加文档应用 → 搜索应用名 → 添加为可编辑</div>
          <div style="color:#6b7280;margin-bottom:6px;">未授权应用会导致写入失败</div>
          <div style="margin-bottom:4px;">5. 点「设置」→ 填写飞书凭证</div>
          <div style="color:#6b7280;margin-bottom:4px;">App ID、App Secret、表格 Token、Table ID</div>
          <div style="color:#6b7280;margin-bottom:6px;">凭证存在本地服务，不经过脚本代码</div>
          <div style="margin-bottom:4px;">6. 单点悬浮球 → 分析 JD → 点「存入飞书」</div>
          <div style="margin-bottom:8px;">长按悬浮球可快速提取 + 自动存入</div>
          <div style="color:#6b7280;">按投递链接查重，已有则更新，不会重复写入</div>
        </div>

        <div style="font-weight:700;font-size:15px;margin-bottom:8px;">📋 功能说明</div>
        <div style="margin-bottom:10px;">
          <b>提取 JD</b>：AI 自动提取岗位名、公司、地点、薪资、类型、岗位职责/要求/加分项、截止日期<br>
          <span style="color:#6b7280;">岗位职责、要求、加分项照搬原文，不做 AI 概括</span>
        </div>
        <div style="margin-bottom:10px;">
          <b>可编辑</b>：提取后点「编辑」修改，再存入
        </div>
        <div style="margin-bottom:10px;">
          <b>长按快存</b>：长按悬浮球 0.8s 进度环走完 → 自动提取 + 存入/复制<br>
          <span style="color:#6b7280;">黄色 = 处理中，绿色 = 成功（附音效），红色 = 失败</span>
        </div>
        <div style="margin-bottom:10px;">
          <b>适配度分析</b>：粘贴简历文本，AI 输出匹配分数 + 匹配点 + 缺失项 + 风险项
        </div>
        <div style="margin-bottom:10px;">
          <b>暗色主题</b>：跟随系统自动切换
        </div>
        <div style="margin-bottom:10px;">
          <b>隐藏悬浮球</b>：双击悬浮球隐藏，页面右下角出现小半圆按钮，点击恢复
        </div>

        <div style="font-weight:700;font-size:15px;margin-bottom:8px;">🔑 飞书凭证获取</div>
        <div style="margin-bottom:8px;">
          <b>App ID / App Secret</b>：飞书开放平台 → 创建自建应用<br>
          <b>表格 Token</b>：多维表格 URL 里 <code style="background:rgba(0,0,0,0.08);padding:2px 6px;border-radius:4px;">/wiki/</code> 后面那段<br>
          <b>Table ID</b>：URL 里 <code style="background:rgba(0,0,0,0.08);padding:2px 6px;border-radius:4px;">?table=</code> 后面那段<br>
          <b>开通权限</b>：应用需开通 bitable 和 wiki 权限<br>
          <b>授权表格</b>：在多维表格右上角「...」→「...更多」→ 添加文档应用 → 搜索你的应用名 → 添加为可编辑<br>
          <span style="color:#6b7280;">未授权应用会导致写入失败（PermissionDenied）</span>
        </div>

        <div style="font-weight:700;font-size:15px;margin-bottom:8px;">⚠️ 常见问题</div>
        <div style="margin-bottom:6px;">
          <b>"Failed to fetch"</b>：本地服务没启动，或端口被占用<br>
          <span style="color:#6b7280;">运行 node proxy.js，检查端口 8788</span>
        </div>
        <div style="margin-bottom:6px;">
          <b>"FieldNameNotFound"</b>：飞书表格列名不匹配<br>
          <span style="color:#6b7280;">检查表格列名是否和代码一致</span>
        </div>
        <div style="margin-bottom:6px;">
          <b>拼多多等页面存入失败</b>：页面 CSP 限制严格<br>
          <span style="color:#6b7280;">用「复制到 Excel」替代</span>
        </div>
      </div>
      <div class="actions">
        <button class="btn btn-secondary" id="help-back">返回</button>
      </div>
    `;
    shadowRoot.getElementById('help-back').onclick = () => {
      if (typeof prevRenderer === 'function') prevRenderer();
      else renderInitial();
    };
  }

  function renderInitial() {
    _panelMode = 'initial';
    const panel = getPanel();
    panel.innerHTML = `
      <div class="header">
        <span>JD Lens</span>
        <span class="header-right"><span class="help-btn" title="使用说明">?</span><span class="close">×</span></span>
      </div>
      <div class="body">
        <div class="empty">点击「分析 JD」提取当前页面的招聘信息</div>
      </div>
      <div class="actions">
        <button class="btn btn-primary" id="analyze">分析 JD</button>
        <button class="btn btn-secondary" id="settings">设置</button>
      </div>
    `;
    shadowRoot.getElementById('analyze').onclick = onAnalyzeClick;
    shadowRoot.getElementById('settings').onclick = renderSettings;
  }

  function renderLoading() {
    _panelMode = 'loading';
    const panel = getPanel();
    panel.innerHTML = `
      <div class="header">
        <span>JD Lens</span>
        <span class="header-right"><span class="help-btn" title="使用说明">?</span><span class="close">×</span></span>
      </div>
      <div class="loading">
        <div class="spinner"></div>
        AI 正在分析页面内容…
      </div>
    `;
  }

  function renderEmpty() {
    _panelMode = 'empty';
    const panel = getPanel();
    panel.innerHTML = `
      <div class="header">
        <span>JD Lens</span>
        <span class="header-right"><span class="help-btn" title="使用说明">?</span><span class="close">×</span></span>
      </div>
      <div class="body" style="padding:24px 16px;text-align:center;">
        <div style="font-size:36px;margin-bottom:8px;">📋</div>
        <div style="font-size:14px;color:var(--text-primary);margin-bottom:4px;">当前页面尚未提取</div>
        <div style="font-size:12px;color:var(--text-secondary);margin-bottom:16px;">点击下方按钮用 AI 提取 JD 信息</div>
      </div>
      <div class="actions">
        <button class="btn btn-primary" id="analyze">分析 JD</button>
        <button class="btn btn-secondary" id="settings">设置</button>
      </div>
    `;
    shadowRoot.getElementById('analyze').onclick = onAnalyzeClick;
    shadowRoot.getElementById('settings').onclick = renderSettings;
  }

  function renderSavedBadge() {
    // 在面板顶部插入一个"已存入飞书"提示条
    const badge = document.createElement('div');
    badge.style.cssText = 'padding:6px 14px;background:#D1FAE5;color:#065F46;font-size:12px;font-weight:500;display:flex;align-items:center;gap:4px;flex-shrink:0;';
    badge.innerHTML = '✅ 已存入飞书表格';
    const panel = getPanel();
    const header = panel.querySelector('.header');
    if (header && header.nextSibling !== badge) {
      panel.insertBefore(badge, header.nextSibling);
    }
  }

  function renderError(msg) {
    _panelMode = 'error';
    const panel = getPanel();
    panel.innerHTML = `
      <div class="header">
        <span>JD Lens</span>
        <span class="header-right"><span class="help-btn" title="使用说明">?</span><span class="close">×</span></span>
      </div>
      <div class="error">⚠️ ${escapeHtml(msg)}</div>
      <div class="actions">
        <button class="btn btn-primary" id="analyze">重试</button>
        <button class="btn btn-secondary" id="settings">设置</button>
      </div>
    `;
    const analyzeBtn = shadowRoot.getElementById('analyze');
    if (analyzeBtn) analyzeBtn.addEventListener('click', (e) => { e.preventDefault(); onAnalyzeClick(); });
    const settingsBtn = shadowRoot.getElementById('settings');
    if (settingsBtn) settingsBtn.addEventListener('click', (e) => { e.preventDefault(); renderSettings(); });
  }

  async function renderResult(data) {
    _panelMode = 'result';
    currentJDData = data;

    const tags = [];
    if (data.position_category) tags.push(`<span class="tag blue">${escapeHtml(data.position_category)}</span>`);
    if (data.job_type) tags.push(`<span class="tag purple">${escapeHtml(data.job_type)}</span>`);
    if (data.salary) tags.push(`<span class="tag green">${escapeHtml(data.salary)}</span>`);
    if (data.industry) tags.push(`<span class="tag gray">${escapeHtml(data.industry)}</span>`);
    if (data.location) tags.push(`<span class="tag gray">${escapeHtml(data.location)}</span>`);
    if (data.has_applied) tags.push(`<span class="tag orange">已投递</span>`);

    const feishuConfigured = await isFeishuConfiguredAsync();
    const saveBtnText = feishuConfigured ? '存入飞书' : '复制到 Excel';
    const saveBtnDisabled = feishuConfigured ? '' : '';  // 未配置时也能用（复制功能）

    const panel = getPanel();
    panel.innerHTML = `
      <div class="header">
        <span>JD Lens</span>
        <span class="header-right"><span class="help-btn" title="使用说明">?</span><span class="close">×</span></span>
      </div>
      <div class="body">
        <div class="field">
          <div class="field-label">岗位</div>
          <div class="field-value" style="font-weight:600;font-size:16px;">${escapeHtml(data.title) || '⚠️ 未提取到'}</div>
        </div>
        <div class="field">
          <div class="field-label">公司</div>
          <div class="field-value">${escapeHtml(data.company) || '⚠️ 未提取到'}</div>
        </div>
        <div class="field">
          <div class="field-label">更新时间</div>
          <div class="field-value">${escapeHtml(data.update_time) || '⚠️ 未提取到'}</div>
        </div>
        ${data.ddl ? `<div class="field">
          <div class="field-label">投递截止日期</div>
          <div class="field-value">${escapeHtml(data.ddl)}</div>
        </div>` : ''}
        ${tags.length ? `<div class="field"><div class="field-value">${tags.join('')}</div></div>` : ''}
        <div class="field">
          <div class="field-label">岗位职责（原文）</div>
          <div class="field-value raw">${escapeHtml(data.responsibilities) || '⚠️ 未提取到'}</div>
        </div>
        <div class="field">
          <div class="field-label">岗位要求（原文）</div>
          <div class="field-value raw">${escapeHtml(data.requirements) || '⚠️ 未提取到'}</div>
        </div>
        <div class="field">
          <div class="field-label">加分项（原文）</div>
          <div class="field-value raw">${escapeHtml(data.bonus) || '⚠️ 未提取到'}</div>
        </div>
        ${data.apply_notes ? `<div class="field">
          <div class="field-label">投递须知</div>
          <div class="field-value raw">${escapeHtml(data.apply_notes)}</div>
        </div>` : ''}
        ${data.confidence ? `
          <div class="field">
            <div class="field-label">提取置信度</div>
            <div class="field-value"><span class="tag ${data.confidence === 'high' ? 'green' : data.confidence === 'medium' ? 'blue' : 'gray'}">${escapeHtml(data.confidence)}</span></div>
          </div>` : ''}
      </div>
      <div class="actions">
        <button class="btn btn-primary" id="save" ${saveBtnDisabled}>${saveBtnText}</button>
        <button class="btn btn-secondary" id="edit">编辑</button>
        <button class="btn btn-secondary" id="match">适配度分析</button>
        <button class="btn btn-secondary" id="reanalyze">重新提取</button>
      </div>
    `;
    shadowRoot.getElementById('save').onclick = onSaveClick;
    shadowRoot.getElementById('match').onclick = () => renderMatchInput(data);
    shadowRoot.getElementById('edit').onclick = () => renderEdit(data);
    shadowRoot.getElementById('reanalyze').onclick = onAnalyzeClick;
  }

  // 适配度分析：简历输入页
  function renderMatchInput(data) {
    _panelMode = 'matchInput';
    const panel = getPanel();
    panel.innerHTML = `
      <div class="header">
        <span>JD Lens · 适配度分析</span>
        <span class="header-right"><span class="help-btn" title="使用说明">?</span><span class="close">×</span></span>
      </div>
      <div class="body">
        <div class="field">
          <div class="field-label">目标岗位</div>
          <div class="field-value" style="font-weight:600;">${escapeHtml(data.title) || '未知'} · ${escapeHtml(data.company) || '未知'}</div>
        </div>
        <div class="field">
          <div class="field-label">粘贴简历文本</div>
          <textarea id="resume-input" class="edit-input" style="width:100%;min-height:180px;border-radius:8px;padding:10px;font-size:13px;line-height:1.6;resize:vertical;" placeholder="把简历内容粘贴到这里（纯文本即可）…">${escapeHtml(_lastResume)}</textarea>
        </div>
        <div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
          <span>💡 简历会自动保留，同域名下切换岗位可直接复用（不同招聘网站间不共享）</span>
          ${_lastResume ? '<button id="clear-resume" style="font-size:11px;color:var(--text-secondary);background:none;border:none;cursor:pointer;text-decoration:underline;">清除已存简历</button>' : ''}
        </div>
      </div>
      <div class="actions">
        <button class="btn btn-primary" id="start-match">开始分析</button>
        <button class="btn btn-secondary" id="back-result">返回</button>
      </div>
    `;
    shadowRoot.getElementById('start-match').onclick = async () => {
      const resumeText = shadowRoot.getElementById('resume-input').value.trim();
      if (!resumeText || resumeText.length < 20) {
        renderError('简历内容太少，请粘贴更完整的简历文本（至少20字）');
        shadowRoot.getElementById('back-result')?.addEventListener('click', () => renderResult(data), { once: true });
        return;
      }
      renderLoading();
      const loadingEl = shadowRoot.querySelector('.loading');
      if (loadingEl) loadingEl.textContent = 'AI 正在分析简历匹配度…';
      try {
        const matchData = await matchJDWithAI(data, resumeText);
        renderMatchResult(data, matchData);
      } catch (err) {
        renderError(err.message || '匹配度分析失败，请稍后重试');
      }
    };
    shadowRoot.getElementById('back-result').onclick = () => renderResult(data);
    const clearBtn = shadowRoot.getElementById('clear-resume');
    if (clearBtn) {
      clearBtn.addEventListener('click', (e) => {
        e.preventDefault();
        clearStoredResume();
        const ta = shadowRoot.getElementById('resume-input');
        if (ta) ta.value = '';
        renderMatchInput(data);
      });
    }
  }

  // 适配度分析：结果展示
  function renderMatchResult(jdData, matchData) {
    _panelMode = 'matchResult';
    const score = matchData.score || 0;
    const matched = matchData.matched || [];
    const partial = matchData.partial || [];
    const missing = matchData.missing || [];
    const risks = matchData.risks || [];
    const highlights = matchData.highlights || [];
    const bonusMatched = matchData.bonus_matched || [];
    const summary = matchData.summary || '';
    const suggestion = matchData.suggestion || '';
    const dimensions = matchData.dimensions || {};

    // 分数颜色：>=80绿，>=60黄，<60红
    const scoreColor = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
    const scoreLabel = score >= 80 ? '高度匹配' : score >= 60 ? '基本匹配' : '匹配度较低';

    // 比例条：匹配 vs 部分匹配 vs 缺失 vs 风险
    const total = matched.length + partial.length + missing.length + risks.length;
    const matchPct = total > 0 ? Math.round(matched.length / total * 100) : 100;
    const partialPct = total > 0 ? Math.round(partial.length / total * 100) : 0;
    const riskPct = total > 0 ? Math.round(risks.length / total * 100) : 0;

    const panel = getPanel();
    panel.innerHTML = `
      <div class="header">
        <span>JD Lens · 适配度分析</span>
        <span class="header-right"><span class="help-btn" title="使用说明">?</span><span class="close">×</span></span>
      </div>
      <div class="body">
        <div class="field">
          <div class="field-label">目标岗位</div>
          <div class="field-value" style="font-weight:600;">${escapeHtml(jdData.title) || '未知'} · ${escapeHtml(jdData.company) || '未知'}</div>
        </div>

        <div style="margin:12px 0;padding:14px 16px;background:var(--bg);border-radius:10px;">
          <div style="display:flex;align-items:center;gap:14px;">
            <div style="width:56px;height:56px;border-radius:50%;border:4px solid ${scoreColor};display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;color:${scoreColor};flex-shrink:0;">${score}</div>
            <div style="flex:1;min-width:0;">
              <div style="font-size:15px;font-weight:600;color:${scoreColor};">${scoreLabel}</div>
              ${summary ? `<div style="font-size:12px;color:var(--text-secondary);margin-top:3px;line-height:1.4;">${escapeHtml(summary)}</div>` : ''}
            </div>
          </div>
          <div style="margin-top:12px;display:flex;align-items:center;gap:8px;">
            <div style="flex:1;height:8px;border-radius:4px;background:var(--bg-secondary);overflow:hidden;display:flex;">
              <div style="height:100%;width:${total > 0 ? matchPct : 100}%;background:#10b981;border-radius:4px;transition:width 0.3s;"></div>
              ${partial.length ? `<div style="height:100%;width:${partialPct}%;background:#3b82f6;border-radius:4px;transition:width 0.3s;"></div>` : ''}
              ${risks.length ? `<div style="height:100%;width:${riskPct}%;background:#f59e0b;border-radius:4px;transition:width 0.3s;"></div>` : ''}
            </div>
            <div style="font-size:11px;color:var(--text-secondary);white-space:nowrap;">
              <span style="color:#10b981;font-weight:600;">✅${matched.length}</span>${partial.length ? ` <span style="color:#3b82f6;font-weight:600;">🔵${partial.length}</span>` : ''} : <span style="color:#ef4444;font-weight:600;">❌${missing.length}</span>${risks.length ? ` : <span style="color:#f59e0b;font-weight:600;">⚠️${risks.length}</span>` : ''}
            </div>
          </div>
        </div>

        ${matched.length ? `
        <div class="field">
          <div class="field-label" style="color:#10b981;margin-bottom:6px;">✅ 匹配项（${matched.length}）</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            ${matched.map(m => `<span style="display:inline-block;padding:3px 8px;border-radius:6px;background:var(--bg-secondary);color:var(--text-primary);font-size:12px;line-height:1.4;">✅ ${escapeHtml(String(m).trim())}</span>`).join('')}
          </div>
        </div>` : ''}

        ${partial.length ? `
        <div class="field">
          <div class="field-label" style="color:#3b82f6;margin-bottom:6px;">🔵 部分匹配（${partial.length}）</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            ${partial.map(p => `<span style="display:inline-block;padding:3px 8px;border-radius:6px;background:var(--bg-secondary);color:var(--text-primary);font-size:12px;line-height:1.4;">🔵 ${escapeHtml(String(p).trim())}</span>`).join('')}
          </div>
        </div>` : ''}

        ${missing.length ? `
        <div class="field">
          <div class="field-label" style="color:#ef4444;margin-bottom:6px;">❌ 缺失项（${missing.length}）</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            ${missing.map(m => `<span style="display:inline-block;padding:3px 8px;border-radius:6px;background:var(--bg-secondary);color:var(--text-primary);font-size:12px;line-height:1.4;">❌ ${escapeHtml(String(m).trim())}</span>`).join('')}
          </div>
        </div>` : ''}

        ${risks.length ? `
        <div class="field">
          <div class="field-label" style="color:#f59e0b;margin-bottom:6px;">⚠️ 风险项（${risks.length}）</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            ${risks.map(r => `<span style="display:inline-block;padding:3px 8px;border-radius:6px;background:var(--bg-secondary);color:var(--text-primary);font-size:12px;line-height:1.4;">⚠️ ${escapeHtml(String(r).trim())}</span>`).join('')}
          </div>
        </div>` : ''}

        ${highlights.length ? `
        <div class="field">
          <div class="field-label" style="color:#8b5cf6;margin-bottom:6px;">✨ 亮点（${highlights.length}）</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            ${highlights.map(h => `<span style="display:inline-block;padding:3px 8px;border-radius:6px;background:var(--bg-secondary);color:var(--text-primary);font-size:12px;line-height:1.4;">✨ ${escapeHtml(String(h).trim())}</span>`).join('')}
          </div>
        </div>` : ''}

        ${bonusMatched.length ? `
        <div class="field">
          <div class="field-label" style="color:#10b981;margin-bottom:6px;">🎯 加分项匹配（${bonusMatched.length}）</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            ${bonusMatched.map(b => `<span style="display:inline-block;padding:3px 8px;border-radius:6px;background:var(--bg-secondary);color:var(--text-primary);font-size:12px;line-height:1.4;">🎯 ${escapeHtml(String(b).trim())}</span>`).join('')}
          </div>
        </div>` : ''}

        ${(() => {
          const dims = [
            { key: 'education', label: '学历' },
            { key: 'experience', label: '经验' },
            { key: 'skills', label: '技能' },
            { key: 'projects', label: '项目' },
            { key: 'others', label: '其他' }
          ];
          const hasDims = dims.some(d => dimensions[d.key]);
          if (!hasDims) return '';
          const iconMap = { '匹配': '✅', '部分匹配': '🔵', '不匹配': '❌', '无法判断': '⚠️' };
          const colorMap = { '匹配': '#10b981', '部分匹配': '#3b82f6', '不匹配': '#ef4444', '无法判断': '#f59e0b' };
          return `
        <div class="field">
          <div class="field-label" style="margin-bottom:6px;">维度评估</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            ${dims.map(d => {
              const v = dimensions[d.key];
              if (!v) return '';
              const icon = iconMap[v] || '•';
              const color = colorMap[v] || 'var(--text-secondary)';
              return `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:6px;background:var(--bg-secondary);color:var(--text-primary);font-size:12px;line-height:1.4;white-space:nowrap;">${icon} ${d.label}: <span style="color:${color};font-weight:600;">${String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</span></span>`;
            }).join('')}
          </div>
        </div>`;
        })()}

        ${suggestion ? `
        <div class="field">
          <div class="field-label" style="margin-bottom:4px;">💡 投递建议</div>
          <div style="font-size:13px;color:var(--text-primary);padding:8px 12px;background:var(--bg-secondary);border-radius:8px;line-height:1.5;">${escapeHtml(suggestion)}</div>
        </div>` : ''}
      </div>
      <div class="actions">
        <button class="btn btn-primary" id="back-result">返回卡片</button>
        <button class="btn btn-secondary" id="re-match">重新分析</button>
      </div>
    `;
    shadowRoot.getElementById('back-result').onclick = () => renderResult(jdData);
    shadowRoot.getElementById('re-match').onclick = () => renderMatchInput(jdData);
  }

  // 编辑页面：所有字段可修改，存入时用编辑后的值
  function renderEdit(data) {
    _panelMode = 'edit';
    currentJDData = data;

    const panel = getPanel();
    panel.innerHTML = `
      <div class="header">
        <span>JD Lens - 编辑</span>
        <span class="header-right"><span class="help-btn" title="使用说明">?</span><span class="close">×</span></span>
      </div>
      <div class="body">
        <div class="field">
          <div class="field-label">岗位</div>
          <input class="edit-input" id="edit-title" value="${escapeHtml(data.title) || ''}" placeholder="岗位名称">
        </div>
        <div class="field">
          <div class="field-label">公司</div>
          <input class="edit-input" id="edit-company" value="${escapeHtml(data.company) || ''}" placeholder="公司名称">
        </div>
        <div class="field">
          <div class="field-label">岗位类型（工作内容）</div>
          <input class="edit-input" id="edit-position-category" value="${escapeHtml(data.position_category) || ''}" placeholder="产品/运营/AI/研发等，逗号分隔">
        </div>
        <div class="field">
          <div class="field-label">类型（招聘性质）</div>
          <input class="edit-input" id="edit-job-type" value="${escapeHtml(data.job_type) || ''}" placeholder="日常实习/暑期实习/秋招等">
        </div>
        <div class="field">
          <div class="field-label">行业</div>
          <input class="edit-input" id="edit-industry" value="${escapeHtml(data.industry) || ''}" placeholder="互联网/金融等">
        </div>
        <div class="field">
          <div class="field-label">薪资</div>
          <input class="edit-input" id="edit-salary" value="${escapeHtml(data.salary) || ''}" placeholder="15-25K·13薪">
        </div>
        <div class="field">
          <div class="field-label">base地</div>
          <input class="edit-input" id="edit-location" value="${escapeHtml(data.location) || ''}" placeholder="成都市">
        </div>
        <div class="field">
          <div class="field-label">更新时间</div>
          <input class="edit-input" id="edit-update-time" value="${escapeHtml(data.update_time) || ''}" placeholder="2026/08/21">
        </div>
        <div class="field">
          <div class="field-label">岗位职责（原文）</div>
          <textarea class="edit-input" id="edit-responsibilities" placeholder="岗位职责">${escapeHtml(data.responsibilities) || ''}</textarea>
        </div>
        <div class="field">
          <div class="field-label">岗位要求（原文）</div>
          <textarea class="edit-input" id="edit-requirements" placeholder="岗位要求">${escapeHtml(data.requirements) || ''}</textarea>
        </div>
        <div class="field">
          <div class="field-label">加分项（原文）</div>
          <textarea class="edit-input" id="edit-bonus" placeholder="加分项">${escapeHtml(data.bonus) || ''}</textarea>
        </div>
        <div class="field">
          <div class="field-label">投递截止日期</div>
          <input class="edit-input" id="edit-ddl" value="${escapeHtml(data.ddl) || ''}" placeholder="2026/09/30，无则留空">
        </div>
        <div class="field">
          <div class="field-label">投递须知</div>
          <textarea class="edit-input" id="edit-apply-notes" placeholder="投递须知，如需要准备的材料、注意事项等">${escapeHtml(data.apply_notes) || ''}</textarea>
        </div>
      </div>
      <div class="actions">
        <button class="btn btn-primary" id="save">存入飞书 / 复制Excel</button>
        <button class="btn btn-secondary" id="back">返回</button>
      </div>
    `;
    shadowRoot.getElementById('save').onclick = onSaveClick;
    shadowRoot.getElementById('back').onclick = () => renderResult(currentJDData);
  }

  // 从输入框收集编辑后的数据，更新 currentJDData
  function collectEditedData() {
    if (!currentJDData) return;
    const getVal = (id) => {
      const el = shadowRoot.getElementById(id);
      // 输入框不存在（不在编辑页）时返回 null，跳过不覆盖原值
      return el ? el.value : null;
    };
    const setIfPresent = (key, id) => {
      const v = getVal(id);
      if (v !== null) currentJDData[key] = v;
    };
    setIfPresent('title', 'edit-title');
    setIfPresent('company', 'edit-company');
    setIfPresent('position_category', 'edit-position-category');
    setIfPresent('job_type', 'edit-job-type');
    setIfPresent('industry', 'edit-industry');
    setIfPresent('salary', 'edit-salary');
    setIfPresent('location', 'edit-location');
    setIfPresent('update_time', 'edit-update-time');
    setIfPresent('responsibilities', 'edit-responsibilities');
    setIfPresent('requirements', 'edit-requirements');
    setIfPresent('bonus', 'edit-bonus');
    setIfPresent('ddl', 'edit-ddl');
    setIfPresent('apply_notes', 'edit-apply-notes');
    console.log('[JD Lens] 收集编辑后的数据:', currentJDData);
  }

  async function renderSettings() {
    _panelMode = 'settings';
    const configured = await isFeishuConfiguredAsync();
    // 拉取掩码后的已配置凭证
    let maskedCfg = {};
    try {
      const data = await smartFetch('/config');
      if (data.code === 0 && data.data) maskedCfg = data.data;
    } catch (e) {}
    const panel = getPanel();
    panel.innerHTML = `
      <div class="header">
        <span>JD Lens 设置</span>
        <span class="header-right"><span class="help-btn" title="使用说明">?</span><span class="close">×</span></span>
      </div>
      <div class="config-form">
        <label>应用 ID</label>
        <input type="text" id="cfg-1" value="${escapeHtml(maskedCfg.appId || '')}" placeholder="cli_xxx">
        <label>应用密钥</label>
        <input type="password" id="cfg-2" value="${escapeHtml(maskedCfg.appSecret || '')}" placeholder="应用密钥">
        <label>表格 Token</label>
        <input type="text" id="cfg-3" value="${escapeHtml(maskedCfg.appToken || '')}" placeholder="知识库 URL 里 /wiki/ 后面那段">
        <label>Table ID</label>
        <input type="text" id="cfg-4" value="${escapeHtml(maskedCfg.tableId || '')}" placeholder="URL 里 ?table= 后面那段">
        <div style="font-size:12px;color:#6b7280;margin-bottom:12px;line-height:1.6;">
          本地服务地址固定为 http://localhost:8788，终端运行 node proxy.js 启动<br>
          应用配置：开放平台 → 创建自建应用 → 开通 bitable 和 wiki 权限<br>
          凭证保存在本地服务，不经过脚本代码<br>
          已配置的显示为掩码，留空不修改
        </div>
        <div style="font-size:13px;padding:8px 12px;border-radius:6px;margin-bottom:8px;">
          ${configured ? '✅ 已配置凭证，可正常存入' : '⚠️ 未配置凭证，仅支持复制到 Excel'}
        </div>
      </div>
      <div class="actions">
        <button class="btn btn-primary" id="save-config">保存</button>
        <button class="btn btn-secondary" id="back">返回</button>
      </div>
    `;
    shadowRoot.getElementById('save-config').onclick = async () => {
      const cfg = {};
      const v1 = shadowRoot.getElementById('cfg-1').value.trim();
      const v2 = shadowRoot.getElementById('cfg-2').value.trim();
      const v3 = shadowRoot.getElementById('cfg-3').value.trim();
      const v4 = shadowRoot.getElementById('cfg-4').value.trim();
      // 跳过掩码值（含 ****）和空值，只传用户实际修改的字段
      if (v1 && !v1.includes('****')) cfg.appId = v1;
      if (v2 && !v2.includes('****')) cfg.appSecret = v2;
      if (v3 && !v3.includes('****')) cfg.appToken = v3;
      if (v4 && !v4.includes('****')) cfg.tableId = v4;
      if (Object.keys(cfg).length > 0) {
        try {
          await smartFetch('/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cfg),
          });
        } catch (e) {
          console.log('[JD Lens] 保存凭证失败:', e.message);
        }
      }
      await checkConfigured();
      renderInitial();
      getPanel().classList.add('visible');
    };
    shadowRoot.getElementById('back').onclick = () => {
      renderInitial();
    };
  }

  function renderSuccess() {
    const panel = getPanel();
    const successEl = document.createElement('div');
    successEl.className = 'success';
    successEl.innerHTML = '✅ 已存入多维表格';
    panel.querySelector('.actions').insertAdjacentElement('beforebegin', successEl);
    const saveBtn = shadowRoot.getElementById('save');
    if (saveBtn) {
      saveBtn.textContent = '已存档 ✓';
      saveBtn.disabled = true;
    }
  }

  function renderCopySuccess() {
    const panel = getPanel();
    const successEl = document.createElement('div');
    successEl.className = 'success';
    successEl.innerHTML = '✅ 已复制到剪贴板！打开 Excel 按 Ctrl+V 即可粘贴';
    panel.querySelector('.actions').insertAdjacentElement('beforebegin', successEl);
    const saveBtn = shadowRoot.getElementById('save');
    if (saveBtn) {
      saveBtn.textContent = '已复制 ✓';
      saveBtn.disabled = true;
    }
  }

  // ==================== 事件处理 ====================

  // 长按检测 + 拖动支持：单击→打开面板，长按→直接提取+存入，拖动→移动位置
  function setupFabLongPress(el) {
    let pressTimer = null;
    let longPressed = false;
    let dragging = false;
    let dragStartX = 0, dragStartY = 0;
    let fabStartX = 0, fabStartY = 0;
    let hasMoved = false;

    // 从 localStorage 恢复位置
    const savedPos = localStorage.getItem('jd-lens-fab-pos');
    if (savedPos) {
      try {
        const pos = JSON.parse(savedPos);
        if (typeof pos.right === 'number' && typeof pos.bottom === 'number') {
          el.style.right = pos.right + 'px';
          el.style.bottom = pos.bottom + 'px';
        }
      } catch (e) {}
    }

    const startPress = (clientX, clientY) => {
      longPressed = false;
      dragging = false;
      hasMoved = false;
      dragStartX = clientX;
      dragStartY = clientY;
      fabStartX = el.offsetRight || el.getBoundingClientRect().right;
      fabStartY = el.offsetBottom || el.getBoundingClientRect().bottom;

      // 启动进度环动画
      el.classList.add('pressing');
      pressTimer = setTimeout(() => {
        if (!hasMoved) {
          longPressed = true;
        }
      }, 800);
    };

    const onMove = (clientX, clientY) => {
      const dx = clientX - dragStartX;
      const dy = clientY - dragStartY;
      if (!hasMoved && Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
      if (!hasMoved) {
        hasMoved = true;
        // 移动超过阈值，取消长按
        if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
        el.classList.remove('pressing');
        void el.offsetWidth;
        dragging = true;
      }
      if (dragging) {
        // 移动 FAB
        const rect = el.getBoundingClientRect();
        let newLeft = clientX - 24; // 半个宽度
        let newTop = clientY - 24;
        // 边界约束
        newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - 48));
        newTop = Math.max(0, Math.min(newTop, window.innerHeight - 48));
        el.style.right = 'auto';
        el.style.bottom = 'auto';
        el.style.left = newLeft + 'px';
        el.style.top = newTop + 'px';
        // 更新面板位置
        updatePanelPosition(newLeft, newTop);
      }
    };

    const endPress = () => {
      if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
      el.classList.remove('pressing');
      void el.offsetWidth;

      if (dragging) {
        // 拖动结束，保存位置
        const rect = el.getBoundingClientRect();
        const pos = {
          right: Math.round(window.innerWidth - rect.right),
          bottom: Math.round(window.innerHeight - rect.bottom)
        };
        // 如果拖到了左边，用 left 存
        if (rect.left < window.innerWidth / 2) {
          localStorage.setItem('jd-lens-fab-pos', JSON.stringify({ left: Math.round(rect.left), top: Math.round(rect.top) }));
        } else {
          localStorage.setItem('jd-lens-fab-pos', JSON.stringify({ right: pos.right, bottom: pos.bottom }));
        }
        dragging = false;
        return;
      }

      if (longPressed) {
        longPressed = false;
        onFabLongPress();
      } else {
        // 普通松手，click 事件会处理
      }
    };

    // 拖动结束时阻止 click 事件（避免拖动后误触发打开面板）
    const handleClick = (e) => {
      if (hasMoved || dragging) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (longPressed) {
        longPressed = false;
        e.preventDefault();
        return;
      }
      onFabClick();
    };

    el.addEventListener('mousedown', (e) => startPress(e.clientX, e.clientY));
    document.addEventListener('mousemove', (e) => {
      if (pressTimer !== null || dragging) onMove(e.clientX, e.clientY);
    });
    document.addEventListener('mouseup', () => {
      if (pressTimer !== null || dragging) endPress();
    });
    el.addEventListener('mouseleave', () => {
      if (!longPressed && !dragging) {
        if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
        el.classList.remove('pressing');
        void el.offsetWidth;
      }
    });
    el.addEventListener('click', handleClick);

    // 触摸支持
    el.addEventListener('touchstart', (e) => {
      const t = e.touches[0];
      startPress(t.clientX, t.clientY);
    }, { passive: true });
    el.addEventListener('touchmove', (e) => {
      const t = e.touches[0];
      onMove(t.clientX, t.clientY);
      if (dragging) e.preventDefault();
    }, { passive: false });
    el.addEventListener('touchend', (e) => {
      if (pressTimer !== null || dragging) {
        endPress();
        if (hasMoved) e.preventDefault();
      }
    });
    el.addEventListener('touchcancel', () => {
      if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
      el.classList.remove('pressing');
      void el.offsetWidth;
      dragging = false;
    });
  }

  // 根据FAB位置更新面板弹出方向
  // 规则：面板始终在FAB正上方或正下方，水平居中对齐FAB，超出视口则平移修正
  function updatePanelPosition(fabLeft, fabTop) {
    const panel = getPanel();
    if (!panel) return;
    const fabSize = 48;
    const gap = 12;
    const margin = 10;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // 临时显示面板获取实际宽高
    const wasVisible = panel.classList.contains('visible');
    if (!wasVisible) panel.classList.add('visible');
    const panelWidth = panel.offsetWidth || Math.min(400, vw * 0.6);
    const panelHeight = panel.offsetHeight || 500;
    if (!wasVisible) panel.classList.remove('visible');

    // 清除所有定位
    panel.style.left = 'auto';
    panel.style.right = 'auto';
    panel.style.top = 'auto';
    panel.style.bottom = 'auto';

    // ===== 水平：面板中心对齐FAB中心，超出视口则平移 =====
    const fabCenter = fabLeft + fabSize / 2;
    let left = fabCenter - panelWidth / 2;
    // 左边界
    if (left < margin) left = margin;
    // 右边界
    if (left + panelWidth > vw - margin) left = vw - panelWidth - margin;
    panel.style.left = left + 'px';

    // ===== 垂直：FAB在下半区→面板在上方，FAB在上半区→面板在下方 =====
    const maxH = vh - margin * 2;
    if (panelHeight > maxH) {
      panel.style.maxHeight = maxH + 'px';
    }

    const effectivePanelHeight = Math.min(panelHeight, maxH);

    // FAB下方可用空间
    const spaceBelow = vh - (fabTop + fabSize + gap + margin);
    // FAB上方可用空间
    const spaceAbove = fabTop - gap - margin;
    // 下方放得下且下方空间 >= 上方空间 → 下方弹出，否则上方弹出
    const showAbove = spaceBelow < effectivePanelHeight && spaceAbove >= spaceBelow;

    if (showAbove) {
      // 面板在FAB上方
      panel.style.top = 'auto';
      let bottomVal = vh - fabTop + gap;
      // 面板顶部不能超出视口
      if (bottomVal > vh - effectivePanelHeight - margin) {
        bottomVal = Math.max(margin, vh - effectivePanelHeight - margin);
      }
      panel.style.bottom = bottomVal + 'px';
    } else {
      // 面板在FAB下方
      panel.style.bottom = 'auto';
      let topVal = fabTop + fabSize + gap;
      // 面板底部不能超出视口
      if (topVal + effectivePanelHeight > vh - margin) {
        topVal = Math.max(margin, vh - effectivePanelHeight - margin);
      }
      panel.style.top = topVal + 'px';
    }
  }

  // 更新 FAB 视觉状态
  // 音效反馈：成功/失败
  function playSound(type) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      if (type === 'success') {
        // 成功：两个上升音 C5→E5→G5
        osc.frequency.setValueAtTime(523, ctx.currentTime);
        osc.frequency.setValueAtTime(659, ctx.currentTime + 0.12);
        osc.frequency.setValueAtTime(784, ctx.currentTime + 0.24);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
      } else if (type === 'error') {
        // 失败：一个下降音
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch (e) { /* 音效不可用就静默 */ }
  }

  function setFabState(state) {
    if (!fabEl) return;
    fabEl.classList.remove('saved', 'saving', 'error');
    if (state === 'saved') {
      fabEl.classList.add('saved');
      fabEl.innerHTML = '<img class="fab-icon" src="' + FAB_ICONS.success + '"><span class="fab-tip">已存入 · 单击查看</span>';
    } else if (state === 'saving') {
      fabEl.classList.add('saving');
      fabEl.innerHTML = '<img class="fab-icon" src="' + FAB_ICONS.collecting + '"><span class="fab-tip">正在提取并存入…</span>';
    } else if (state === 'error') {
      fabEl.classList.add('error');
      fabEl.innerHTML = '<img class="fab-icon" src="' + FAB_ICONS.error + '"><span class="fab-tip">存入失败 · 单击查看</span>';
    } else {
      fabEl.innerHTML = '<img class="fab-icon" src="' + FAB_ICONS.normal + '"><span class="fab-tip">单击查看 · 长按快存</span><svg class="progress-ring"><circle cx="28" cy="28" r="28"></circle></svg>';
    }
  }

  function onFabClick() {
    const panel = getPanel();
    if (panel.classList.contains('visible')) {
      panel.classList.remove('visible');
      return;
    }
    
    // 根据FAB当前位置计算面板弹出方向
    const rect = fabEl.getBoundingClientRect();
    updatePanelPosition(rect.left, rect.top);
    
    panel.classList.add('visible');
    _panelMode = 'initial';
    
    // 如果长按后有缓存的错误，优先展示错误
    if (lastError) {
      renderError(lastError);
      lastError = null;
      setTimeout(() => setFabState('default'), 100);
      return;
    }
    
    // 如果长按后已有缓存的提取结果，直接展示（不等异步检查）
    if (currentJDData) {
      renderResult(currentJDData);
      // 后台静默检查是否已存入，更新 FAB 状态
      checkIfAlreadySaved().then(record => {
        if (record) setFabState('saved');
      }).catch(() => {});
      return;
    }
    
    // 没有缓存数据，后台检查是否已存入
    checkIfAlreadySaved().then(record => {
      // 只在面板还处于初始/加载状态时才覆盖，用户已手动切换（如看帮助）则不覆盖
      if (_panelMode !== 'initial' && _panelMode !== 'loading') return;
      if (record) {
        // 已存入飞书，用表格数据回显
        const feishuData = mapFeishuRecordToJD(record);
        if (feishuData.title || feishuData.company) {
          currentJDData = feishuData;
          renderResult(feishuData);
          renderSavedBadge();
        }
        setFabState('saved');
      } else {
        // 未存入，展示空状态引导
        renderEmpty();
      }
    }).catch(() => {
      if (_panelMode !== 'initial' && _panelMode !== 'loading') return;
      renderEmpty();
    });
  }

  // 长按成功/失败后闪现提示气泡（1.5秒消失）
  function showFlashTip(text, type) {
    const tip = document.createElement('div');
    tip.style.cssText = `position:fixed;z-index:2147483647;padding:6px 14px;border-radius:20px;font-size:13px;font-weight:600;pointer-events:none;transition:opacity 0.3s;opacity:1;box-shadow:0 2px 8px rgba(0,0,0,0.15);white-space:nowrap;` +
      (type === 'success' ? 'background:#10b981;color:#fff;' : type === 'error' ? 'background:#ef4444;color:#fff;' : 'background:#1a1a1a;color:#fff;');
    tip.textContent = text;
    // 定位在 FAB 上方
    const rect = fabEl.getBoundingClientRect();
    tip.style.left = Math.max(10, rect.left + rect.width/2 - 60) + 'px';
    tip.style.top = Math.max(10, rect.top - 36) + 'px';
    document.body.appendChild(tip);
    setTimeout(() => { tip.style.opacity = '0'; }, 1200);
    setTimeout(() => { tip.remove(); }, 1600);
  }

  // 长按失败时自动弹窗展示错误（用 requestAnimationFrame 确保 DOM 已渲染）
  function showPanelWithError(msg) {
    const panel = getPanel();
    panel.classList.add('visible');
    renderError(msg);
    // 再次确保 visible 类不会被后续逻辑移除
    requestAnimationFrame(() => {
      panel.classList.add('visible');
    });
  }

  // 长按：直接提取 + 存入，不弹窗，纯FAB颜色反馈
  async function onFabLongPress() {
    // 立刻变为处理中状态，不等异步检查
    setFabState('saving');

    // 异步检查是否已存过（不阻塞 UI）
    const alreadySaved = await checkIfAlreadySaved();
    if (alreadySaved) {
      setFabState('saved');
      playSound('success');
      showFlashTip('该岗位已存入', 'success');
      currentJDData = mapFeishuRecordToJD(alreadySaved);
      return;
    }

    // 已确认未存过，保持 saving 状态继续提取
    setFabState('saving');

    try {
      const data = await extractJDWithAI();
      if (data.is_jd_page === false) {
        setFabState('error');
        playSound('error');
        // 失败后自动弹窗展示错误原因
        showPanelWithError('AI 判断当前页面不是招聘 JD 页面。请确认已经打开了岗位详情页。');
        setTimeout(() => setFabState('default'), 3000);
        return;
      }
      const feishuConfigured = await isFeishuConfiguredAsync();
      if (feishuConfigured) {
        // 已配置 → 存入表格
        await saveToFeishu(data);
      } else {
        // 没配置 → 复制 TSV 到剪贴板
        const tsv = generateTSV(data);
        await copyToClipboard(tsv);
      }
      setFabState('saved');
      playSound('success');
      showFlashTip(feishuConfigured ? '已存入飞书' : '已复制到 Excel', 'success');
      currentJDData = data;
    } catch (err) {
      setFabState('error');
      playSound('error');
      const errMsg = err.message || '存入失败，请检查本地服务是否启动（终端运行 node proxy.js）';
      showFlashTip('存入失败', 'error');
      // 失败后自动弹窗展示错误原因
      showPanelWithError(errMsg);
      setTimeout(() => setFabState('default'), 3000);
    }
  }

  async function onAnalyzeClick() {
    const btn = shadowRoot.getElementById('analyze');
    if (btn) { btn.disabled = true; btn.textContent = '分析中…'; }
    renderLoading();
    try {
      const data = await extractJDWithAI();
      if (data.is_jd_page === false) {
        renderError('AI 判断当前页面不是招聘 JD 页面。请确认已经打开了岗位详情页。');
        return;
      }
      renderResult(data);
    } catch (err) {
      console.error('[JD Lens] analyze error:', err);
      renderError(err.message || 'AI 分析失败，可能是网络问题或页面内容异常，请稍后重试');
    }
  }

  // 生成 TSV 格式文本（可直接粘贴到 Excel）
  function generateTSV(data) {
    const url = window.location.href;
    const applyStatus = data.has_applied ? '已投递' : '待投递';
    // 纯值，Tab 分隔，横向一行，不带表头
    // 列顺序与表格一致：公司名称、岗位名称、岗位类型、行业、类型、薪资、base地、是否hc、投递链接、职位描述、职位要求、加分项、ddl、投递须知、投递状态、是否下线、更新时间
    const values = [
      data.company || '',
      data.title || '',
      data.position_category || '',
      data.industry || '',
      data.job_type || '',
      data.salary || '未披露',
      data.location || '',
      (['秋招', '秋招提前批', '春招', '暑期实习'].includes(data.job_type)) ? '是' : '否',
      url,
      (data.responsibilities || '').replace(/\n/g, ' '),
      (data.requirements || '').replace(/\n/g, ' '),
      (data.bonus || '').replace(/\n/g, ' '),
      data.ddl || '',
      (data.apply_notes || '').replace(/\n/g, ' '),
      applyStatus,
      '否',
      data.update_time || new Date().toISOString().slice(0, 10).replace(/-/g, '/'),
    ];
    return values.join('\t');
  }

  // 复制文本到剪贴板（兼容多种浏览器）
  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      // fallback: 用 textarea + execCommand
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    }
  }

  async function onSaveClick() {
    if (!currentJDData) return;
    collectEditedData();  // 先收集编辑后的数据
    const btn = shadowRoot.getElementById('save');
    const feishuConfigured = await isFeishuConfiguredAsync();

    if (!feishuConfigured) {
      // 没配置 → 复制 TSV 到剪贴板
      if (btn) { btn.textContent = '复制中…'; btn.disabled = true; }
      try {
        const tsv = generateTSV(currentJDData);
        const ok = await copyToClipboard(tsv);
        if (ok) {
          renderCopySuccess();
        } else {
          renderError('复制失败，请手动复制');
        }
      } catch (err) {
        renderError('复制失败: ' + err.message);
      }
      if (btn) { btn.textContent = '复制到 Excel'; btn.disabled = false; }
      return;
    }

    // 已配置 → 存入表格
    if (btn) {
      btn.textContent = '保存中…';
      btn.disabled = true;
    }
    try {
      await saveToFeishu(currentJDData);
      renderSuccess();
    } catch (err) {
      renderError(err.message || '存入失败，请确认本地服务已启动（终端运行 node proxy.js）');
      if (btn) {
        btn.textContent = '存入飞书';
        btn.disabled = false;
      }
    }
  }

  // ==================== 启动 ====================

  function init() {
    // 后台静默检查配置状态（不阻塞 UI）
    checkConfigured().catch(() => {});

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', createUI);
    } else {
      createUI();
    }
  }

  init();
})();