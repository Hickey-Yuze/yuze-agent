(function () {
  'use strict';

  const PANEL_ID = 'lzit-notice-radar-panel';
  const STYLE_ID = 'lzit-notice-radar-style';
  const MARK_CLASS = 'lzit-notice-radar-date';

  /* ========== 工具函数 ========== */

  function unique(items) {
    return [...new Set(items.map((item) => String(item).trim()).filter(Boolean))];
  }

  function normalizeText(text) {
    return String(text || '').replace(/\s+/g, ' ').trim();
  }

  /* ========== 日期提取 ========== */

  function extractDates(text) {
    const patterns = [
      /(?:20\d{2}\s*[年./-]\s*)?\d{1,2}\s*月\s*\d{1,2}\s*日/g,
      /20\d{2}\s*[-/.]\s*\d{1,2}\s*[-/.]\s*\d{1,2}/g,
    ];
    const matches = [];
    for (const pattern of patterns) {
      for (const match of String(text || '').matchAll(pattern)) {
        matches.push({ value: match[0].replace(/\s+/g, ''), index: match.index });
      }
    }
    matches.sort((a, b) => a.index - b.index);
    return unique(matches.map((match) => match.value));
  }

  function extractDateEvents(text) {
    const clauses = String(text || '')
      .split(/[，,；;。！？\n]+/)
      .map(normalizeText)
      .filter(Boolean);
    const events = [];
    const seen = new Set();

    clauses.forEach((clause) => {
      extractDates(clause).forEach((date) => {
        if (seen.has(date)) return;
        seen.add(date);
        events.push({
          date,
          context: clause.replace(/^[（(]?\d+[）)、.．]\s*/, '').trim(),
        });
      });
    });
    return events;
  }

  /* ========== 联系方式提取 ========== */

  function extractContacts(text) {
    const source = String(text || '');
    const phones = unique([
      ...(source.match(/0\d{2,3}[-—\s]?\d{7,8}/g) || []),
      ...(source.match(/(?<!\d)1[3-9]\d{9}(?!\d)/g) || []),
    ]).map((value) => `电话：${value.replace(/[—\s]/g, '-')}`);
    const emails = unique(
      source.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []
    ).map((value) => `邮箱：${value}`);
    const qqGroups = unique(
      [...source.matchAll(/(?:QQ群|QQ\s*群)[号：:\s]*([1-9]\d{5,11})/gi)].map((match) => match[1])
    ).map((value) => `QQ群：${value}`);
    return unique([...phones, ...emails, ...qqGroups]);
  }

  function nearestClause(text, index) {
    const source = String(text || '');
    const leftBoundary = Math.max(
      source.lastIndexOf('。', index - 1),
      source.lastIndexOf('；', index - 1),
      source.lastIndexOf('\n', index - 1)
    );
    const nextBoundaries = ['。', '；', '\n']
      .map((separator) => source.indexOf(separator, index))
      .filter((position) => position >= 0);
    const rightBoundary = nextBoundaries.length ? Math.min(...nextBoundaries) : source.length;
    return normalizeText(source.slice(leftBoundary + 1, rightBoundary));
  }

  function extractContactDetails(text) {
    const source = String(text || '');
    const details = [];
    const seen = new Set();

    // 电话
    const phonePattern = /0\d{2,3}[-—\s]?\d{7,8}|(?<!\d)1[3-9]\d{9}(?!\d)/g;
    for (const match of source.matchAll(phonePattern)) {
      const value = match[0].replace(/[—\s]/g, '-');
      if (seen.has(`电话:${value}`)) continue;
      seen.add(`电话:${value}`);
      const prefix = source.slice(Math.max(0, match.index - 120), match.index);
      const names = [...prefix.matchAll(/联系人\s*[：:]\s*([\u4e00-\u9fa5·]{2,10})/g)];
      const context = names.length
        ? `${names[names.length - 1][1]}（联系人）`
        : nearestClause(source, match.index).replace(new RegExp(value.replace('-', '[-—\\s]?')), '').replace(/(?:电话|手机号|联系电话)\s*[：:]?\s*/g, '').trim() || '通知咨询';
      details.push({ type: '电话', value, context });
    }

    // 邮箱
    const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
    for (const match of source.matchAll(emailPattern)) {
      const value = match[0];
      if (seen.has(`邮箱:${value}`)) continue;
      seen.add(`邮箱:${value}`);
      details.push({
        type: '邮箱',
        value,
        context: nearestClause(source, match.index).replace(value, '').replace(/(?:邮箱|电子邮箱)\s*[：:]?\s*/g, '').trim() || '材料提交或通知咨询',
      });
    }

    // QQ群
    const qqPattern = /(?:QQ群|QQ\s*群)[号：:\s]*([1-9]\d{5,11})/gi;
    for (const match of source.matchAll(qqPattern)) {
      const value = match[1];
      if (seen.has(`QQ群:${value}`)) continue;
      seen.add(`QQ群:${value}`);
      const clause = nearestClause(source, match.index);
      let context = '通知沟通群';
      if (/申报项目.*负责人/.test(clause) && /指导教师/.test(clause)) {
        context = '申报项目负责人和指导教师的竞赛组织与临时通知群';
      } else if (/竞赛|大赛/.test(clause)) {
        context = '竞赛组织与临时通知群';
      }
      details.push({ type: 'QQ群', value, context });
    }
    return details;
  }

  /* ========== 概览构建 ========== */

  function buildOverview(title, paragraphs) {
    const cleanTitle = normalizeText(title)
      .replace(/\s*[-_|｜]\s*兰州工业学院.*$/i, '')
      .trim();
    const candidates = (paragraphs || [])
      .map(normalizeText)
      .filter((paragraph) => paragraph.length >= 20)
      .filter((paragraph) => paragraph !== cleanTitle)
      .filter((paragraph) => !/^[一二三四五六七八九十\d]+[、.．]/.test(paragraph));
    const summary = candidates.find((paragraph) => /为|根据|旨在|决定|举办|开展|现将/.test(paragraph)) || candidates[0] || '请阅读通知正文并核对具体要求。';
    return {
      title: cleanTitle || '兰州工业学院通知',
      summary: summary.length > 180 ? `${summary.slice(0, 180)}…` : summary,
    };
  }

  /* ========== 链接分类 ========== */

  function classifyLinks(links) {
    const attachments = [];
    const related = [];
    const seen = new Set();
    const attachmentPattern = /附件|下载|download|\.(?:pdf|docx?|xlsx?|pptx?|zip|rar)(?:$|[?#])/i;

    for (const rawLink of links || []) {
      const text = String(rawLink.text || '').trim() || '未命名链接';
      const href = String(rawLink.href || '').trim();
      if (!href || seen.has(href) || /^(?:javascript:|#)/i.test(href)) continue;
      seen.add(href);
      const link = { text, href };
      if (attachmentPattern.test(`${text} ${href}`)) attachments.push(link);
      else related.push(link);
    }
    return { attachments, related };
  }

  /* ========== 导出 API ========== */

  const api = {
    extractDates,
    extractDateEvents,
    extractContacts,
    extractContactDetails,
    classifyLinks,
    buildOverview,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof document === 'undefined' || typeof window === 'undefined') return;

  /* ========== 页面 UI 部分 ========== */

  function removeExisting() {
    document.getElementById(PANEL_ID)?.remove();
    document.getElementById(STYLE_ID)?.remove();
    document.querySelectorAll(`mark.${MARK_CLASS}`).forEach((mark) => {
      mark.replaceWith(document.createTextNode(mark.textContent || ''));
    });
  }

  function findArticleRoot() {
    const selectors = [
      '.v_news_content',
      '.article-content',
      '.article_content',
      '.news-content',
      '.content-show',
      'article',
      'main',
    ];
    return selectors.map((selector) => document.querySelector(selector)).find(Boolean) || document.body;
  }

  function highlightDates(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || !node.nodeValue?.trim()) return NodeFilter.FILTER_REJECT;
        if (parent.closest(`script, style, textarea, input, select, option, #${PANEL_ID}`)) {
          return NodeFilter.FILTER_REJECT;
        }
        return /(?:20\d{2}\s*[年./-]\s*)?\d{1,2}\s*月\s*\d{1,2}\s*日|20\d{2}\s*[-/.]\s*\d{1,2}\s*[-/.]\s*\d{1,2}/.test(node.nodeValue)
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      },
    });
    const nodes = [];
    while (walker.nextNode() && nodes.length < 80) nodes.push(walker.currentNode);
    const datePattern = /((?:20\d{2}\s*[年./-]\s*)?\d{1,2}\s*月\s*\d{1,2}\s*日|20\d{2}\s*[-/.]\s*\d{1,2}\s*[-/.]\s*\d{1,2})/g;

    let count = 0;
    for (const node of nodes) {
      const parts = node.nodeValue.split(datePattern);
      if (parts.length < 2) continue;
      const fragment = document.createDocumentFragment();
      parts.forEach((part, index) => {
        if (index % 2 === 1) {
          const mark = document.createElement('mark');
          mark.className = MARK_CLASS;
          mark.textContent = part;
          mark.title = '📅 关键日期';
          fragment.appendChild(mark);
          count++;
        } else if (part) {
          fragment.appendChild(document.createTextNode(part));
        }
      });
      node.parentNode?.replaceChild(fragment, node);
    }
    return count;
  }

  function collectLinks(root) {
    const links = [];
    root.querySelectorAll('a[href]').forEach((a) => {
      links.push({ text: a.textContent.trim(), href: a.href });
    });
    return links;
  }

  function collectParagraphs(root) {
    const paragraphs = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
      acceptNode(node) {
        return /^(?:P|DIV|SECTION|ARTICLE|LI|TD|TH|H[1-6])$/i.test(node.tagName) &&
          node.textContent.trim().length >= 10 &&
          !node.closest(`#${PANEL_ID}`)
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      },
    });
    while (walker.nextNode()) paragraphs.push(walker.currentNode.textContent);
    return paragraphs;
  }

  /* ========== 面板渲染 ========== */

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${PANEL_ID} {
        position: fixed; top: 16px; right: 16px;
        width: 380px; max-height: calc(100vh - 32px);
        overflow-y: auto;
        background: #fff; border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,.18), 0 2px 8px rgba(0,0,0,.12);
        z-index: 2147483647; font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif;
        font-size: 14px; line-height: 1.6; color: #333;
      }
      #${PANEL_ID} * { box-sizing: border-box; }
      #${PANEL_ID} .lzit-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 14px 18px; background: linear-gradient(135deg, #1a5276, #2980b9);
        color: #fff; border-radius: 12px 12px 0 0; position: sticky; top: 0; z-index: 1;
      }
      #${PANEL_ID} .lzit-header h3 { margin: 0; font-size: 16px; font-weight: 600; }
      #${PANEL_ID} .lzit-close-btn {
        background: rgba(255,255,255,.2); border: none; color: #fff;
        width: 28px; height: 28px; border-radius: 50%; cursor: pointer;
        font-size: 18px; display: flex; align-items: center; justify-content: center;
        transition: background .2s;
      }
      #${PANEL_ID} .lzit-close-btn:hover { background: rgba(255,255,255,.4); }
      #${PANEL_ID} .lzit-body { padding: 14px 18px; }
      #${PANEL_ID} .lzit-section { margin-bottom: 16px; }
      #${PANEL_ID} .lzit-section:last-child { margin-bottom: 0; }
      #${PANEL_ID} .lzit-section-title {
        font-size: 13px; font-weight: 600; color: #1a5276;
        margin: 0 0 8px 0; padding-bottom: 6px;
        border-bottom: 2px solid #3498db; display: flex; align-items: center; gap: 6px;
      }
      #${PANEL_ID} .lzit-summary {
        background: #f8f9fa; padding: 12px; border-radius: 8px;
        font-size: 13.5px; color: #444; line-height: 1.7; border-left: 4px solid #3498db;
      }
      #${PANEL_ID} .lzit-item {
        display: block; padding: 8px 10px; margin: 4px 0;
        background: #f8f9fa; border-radius: 6px; text-decoration: none;
        color: #2c3e50; font-size: 13px; transition: all .15s;
        border-left: 3px solid transparent;
      }
      #${PANEL_ID} .lzit-item:hover { background: #eaf2f8; border-left-color: #3498db; transform: translateX(2px); }
      #${PANEL_ID} .lzit-item.lzit-attachment { border-left-color: #e74c3c; }
      #${PANEL_ID} .lzit-item.lzit-attachment:hover { background: #fdedec; border-left-color: #c0392b; }
      #${PANEL_ID} .lzit-contact-item {
        display: flex; flex-direction: column; padding: 10px 12px; margin: 5px 0;
        background: #fef9e7; border-radius: 8px; border-left: 3px solid #f39c12;
      }
      #${PANEL_ID} .lzit-contact-value {
        font-weight: 600; color: #2c3e50; font-size: 13.5px;
      }
      #${PANEL_ID} .lzit-contact-context {
        font-size: 12px; color: #7f8c8d; margin-top: 3px;
      }
      #${PANEL_ID} .lzit-badge {
        display: inline-block; padding: 2px 8px; border-radius: 10px;
        font-size: 11px; font-weight: 600; vertical-align: middle;
      }
      #${PANEL_ID} .lzit-badge-date { background: #e8f6f3; color: #117a65; }
      #${PANEL_ID} .lzit-badge-attach { background: #fdedec; color: #c0392b; }
      #${PANEL_ID} .lzit-badge-link { background: #eaf2f8; color: #2471a3; }
      #${PANEL_ID} .lzit-badge-contact { background: #fef9e7; color: #9a7d0a; }
      #${PANEL_ID} .lzit-empty { color: #999; font-size: 13px; font-style: italic; padding: 8px 0; }
      #${PANEL_ID} .lzit-footer {
        text-align: center; padding: 10px; font-size: 11px; color: #aaa;
        border-top: 1px solid #eee; margin-top: 12px;
      }
      mark.${MARK_CLASS} {
        background: linear-gradient(135deg, #fff3cd, #ffe69c);
        color: #856404; padding: 1px 4px; border-radius: 3px;
        font-weight: 600; box-shadow: 0 1px 3px rgba(133,100,4,.2);
        cursor: help; transition: background .2s;
      }
      mark.${MARK_CLASS}:hover { background: #ffe69c; }
    `;
    document.head.appendChild(style);
  }

  function renderPanel(data) {
    const panel = document.createElement('div');
    panel.id = PANEL_ID;

    const sections = [];

    // 概览
    sections.push(`
      <div class="lzit-section">
        <h4 class="lzit-section-title">📋 通知概览</h4>
        <div class="lzit-summary">${escapeHtml(data.overview.summary)}</div>
      </div>
    `);

    // 关键日期
    if (data.dates.length) {
      const dateItems = data.dates
        .map((d) => `<div class="lzit-item"><span class="lzit-badge lzit-badge-date">📅</span> <strong>${escapeHtml(d.date)}</strong>${d.context ? `<br><small style="color:#666;margin-left:20px;">${escapeHtml(d.context.slice(0, 80))}</small>` : ''}</div>`)
        .join('');
      sections.push(`
        <div class="lzit-section">
          <h4 class="lzit-section-title">📅 关键日期 <span class="lzit-badge lzit-badge-date">${data.dates.length}</span></h4>
          ${dateItems}
        </div>
      `);
    }

    // 附件
    if (data.attachments.length) {
      const attachItems = data.attachments
        .map((a) => `<a class="lzit-item lzit-attachment" href="${escapeHtml(a.href)}" target="_blank" rel="noopener"><span class="lzit-badge lzit-badge-attach">📎</span> ${escapeHtml(a.text)}</a>`)
        .join('');
      sections.push(`
        <div class="lzit-section">
          <h4 class="lzit-section-title">📎 附件下载 <span class="lzit-badge lzit-badge-attach">${data.attachments.length}</span></h4>
          ${attachItems}
        </div>
      `);
    }

    // 相关链接
    if (data.relatedLinks.length) {
      const linkItems = data.relatedLinks
        .map((l) => `<a class="lzit-item" href="${escapeHtml(l.href)}" target="_blank" rel="noopener"><span class="lzit-badge lzit-badge-link">🔗</span> ${escapeHtml(l.text)}</a>`)
        .join('');
      sections.push(`
        <div class="lzit-section">
          <h4 class="lzit-section-title">🔗 相关链接 <span class="lzit-badge lzit-badge-link">${data.relatedLinks.length}</span></h4>
          ${linkItems}
        </div>
      `);
    }

    // 联系方式
    if (data.contacts.length) {
      const typeIcons = { 电话: '📞', 邮箱: '✉️', QQ群: '💬' };
      const contactItems = data.contacts
        .map((c) => `
          <div class="lzit-contact-item">
            <div class="lzit-contact-value"><span>${typeIcons[c.type] || '📋'}</span> <strong>${escapeHtml(c.value)}</strong> <span class="lzit-badge lzit-badge-contact">${c.type}</span></div>
            ${c.context ? `<div class="lzit-contact-context">${escapeHtml(c.context)}</div>` : ''}
          </div>
        `)
        .join('');
      sections.push(`
        <div class="lzit-section">
          <h4 class="lzit-section-title">📞 联系方式 <span class="lzit-badge lzit-badge-contact">${data.contacts.length}</span></h4>
          ${contactItems}
        </div>
      `);
    }

    panel.innerHTML = `
      <div class="lzit-header">
        <h3>🎯 通知重点雷达</h3>
        <button class="lzit-close-btn" title="关闭面板">×</button>
      </div>
      <div class="lzit-body">
        ${sections.join('')}
        <div class="lzit-footer">兰州工业学院 · 通知重点雷达妙招</div>
      </div>
    `;

    panel.querySelector('.lzit-close-btn').addEventListener('click', removeExisting);
    document.body.appendChild(panel);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /* ========== 主入口 ========== */

  function main() {
    removeExisting();
    injectStyles();

    const root = findArticleRoot();
    const rawText = root.textContent || '';

    // 高亮日期
    const dateCount = highlightDates(root);

    // 收集数据
    const title = document.title || '';
    const paragraphs = collectParagraphs(root);
    const links = collectLinks(root);

    const overview = buildOverview(title, paragraphs);
    const dates = extractDateEvents(rawText);
    const contacts = extractContactDetails(rawText);
    const { attachments, related } = classifyLinks(links);

    // 渲染面板
    renderPanel({
      overview,
      dates,
      attachments,
      relatedLinks: related,
      contacts,
    });

    console.log(`[通知雷达] 已高亮 ${dateCount} 个日期，提取 ${dates.length} 个日期事件、${attachments.length} 个附件、${related.length} 个相关链接、${contacts.length} 条联系方式`);
  }

  main();
})();