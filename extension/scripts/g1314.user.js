(() => {
  'use strict';

  /**
   * 目标：
   * 1) 用户选中一个单字符（括号/引号等）时，自动扩展到与之配对的最内层范围
   * 2) 混合嵌套严格正确：例如 【a{b[c]d}e】 在任意层都能正确配对
   * 3) 不改 DOM：使用 CSS Highlight API 高亮（不支持则仅扩展选区）
   */

  // ---------- 配置 ----------
  const HIGHLIGHT_NAME = 'paired-text-highlight';
  const STYLE_ID = 'paired-text-highlight-style';

  // 非同符号的配对括号（混合嵌套用）
  const BRACKETS = new Map([
    ['(', ')'],
    ['[', ']'],
    ['{', '}'],
    ['【', '】'],
    ['《', '》'],
    ['「', '」'],
    ['『', '』'],
    ['（', '）'],
    ['［', '］'],
    ['｛', '｝'],
    ['〈', '〉'],
    ['〖', '〗'],
    ['〔', '〕'],
    ['【', '】'],
  ]);

  // 反向映射：close -> open
  const CLOSE_TO_OPEN = new Map([...BRACKETS.entries()].map(([o, c]) => [c, o]));

  // 同符号引号（按启发式解析）
  const QUOTES = new Set(['"', "'"]);

  // 高亮持续时间
  const HIGHLIGHT_MS = 2500;

  // ---------- 样式 ----------
  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      ::highlight(${HIGHLIGHT_NAME}) { background: rgba(255, 235, 59, 0.45); }
    `;
    document.head.appendChild(style);
  }

  function clearHighlight() {
    if (CSS.highlights && CSS.highlights.has(HIGHLIGHT_NAME)) {
      CSS.highlights.delete(HIGHLIGHT_NAME);
    }
  }

  function applyHighlight(range) {
    clearHighlight();
    if (!CSS.highlights || typeof Highlight === 'undefined') return false;
    CSS.highlights.set(HIGHLIGHT_NAME, new Highlight(range));
    return true;
  }

  // ---------- DOM 文本偏移映射 ----------
  function getRootElement(node) {
    if (!node) return null;
    if (node.nodeType === Node.TEXT_NODE) return node.parentElement;
    if (node.nodeType === Node.ELEMENT_NODE) return node;
    return node.parentElement || null;
  }

  function getTextOffsetIn(root, targetTextNode, targetOffset) {
    let offset = 0;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const n = walker.currentNode;
      if (n === targetTextNode) return offset + targetOffset;
      offset += n.textContent.length;
    }
    return -1;
  }

  function getNodeAtTextOffset(root, flatOffset) {
    let offset = 0;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const n = walker.currentNode;
      const len = n.textContent.length;
      if (flatOffset <= offset + len) {
        return { node: n, offset: Math.max(0, flatOffset - offset) };
      }
      offset += len;
    }
    return null;
  }

  // ---------- 文本解析工具 ----------
  function isEscaped(text, i) {
    // 统计 i 前连续反斜杠数量，奇数则转义
    let bs = 0;
    for (let k = i - 1; k >= 0 && text[k] === '\\'; k--) bs++;
    return bs % 2 === 1;
  }

  function isLikelyApostrophe(text, i) {
    // 处理英文缩写/所有格：don't, I'm, Alice's
    // 规则：左右都是字母/数字时，认为是撇号而非字符串引号边界
    const prev = text[i - 1] || '';
    const next = text[i + 1] || '';
    const isWord = (ch) => /[A-Za-z0-9]/.test(ch);
    return isWord(prev) && isWord(next);
  }

  function isQuoteBoundary(text, i, quoteChar) {
    if (text[i] !== quoteChar) return false;
    if (isEscaped(text, i)) return false;
    if (quoteChar === "'" && isLikelyApostrophe(text, i)) return false;
    return true;
  }

  /**
   * 统一解析：一次扫描构建“严格嵌套”的配对列表（brackets + quotes）
   * 返回 pairs: [{ type, openChar, closeChar, start, end }]
   * 其中 end 为开区间（即 close 的后一位）。
   */
  function parsePairs(text) {
    const pairs = [];
    const stack = []; // [{kind:'bracket'|'quote', openChar, closeChar, start}]

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];

      // 1) 处理引号：只在“边界”时参与栈（避免 don’t 之类）
      if (QUOTES.has(ch) && isQuoteBoundary(text, i, ch)) {
        const top = stack[stack.length - 1];

        // 如果栈顶就是同类引号，则闭合；否则入栈开启
        if (top && top.kind === 'quote' && top.openChar === ch) {
          const open = stack.pop();
          pairs.push({
            type: 'quote',
            openChar: ch,
            closeChar: ch,
            start: open.start,
            end: i + 1,
          });
        } else {
          stack.push({
            kind: 'quote',
            openChar: ch,
            closeChar: ch,
            start: i,
          });
        }
        continue;
      }

      // 2) 处理括号
      if (BRACKETS.has(ch)) {
        stack.push({
          kind: 'bracket',
          openChar: ch,
          closeChar: BRACKETS.get(ch),
          start: i,
        });
        continue;
      }

      if (CLOSE_TO_OPEN.has(ch)) {
        // 只闭合“栈顶匹配”的开括号；不匹配的 close 直接忽略（避免乱配）
        const expectedOpen = CLOSE_TO_OPEN.get(ch);
        const top = stack[stack.length - 1];

        if (top && top.kind === 'bracket' && top.openChar === expectedOpen && top.closeChar === ch) {
          const open = stack.pop();
          pairs.push({
            type: 'bracket',
            openChar: open.openChar,
            closeChar: ch,
            start: open.start,
            end: i + 1,
          });
        }
        continue;
      }
    }

    // 未闭合的开符号忽略
    return pairs;
  }

  /**
   * 选“包含 pos 的最内层配对”。
   * 如果用户选中了某个符号 char，则尽量返回“以该符号为边界的那一对”；
   * 否则返回包含 pos 的最内层一对。
   */
  function pickBestPair(pairs, pos, selectedChar) {
    // 候选：包含 pos
    const containing = pairs.filter(p => p.start <= pos && pos < p.end);
    if (containing.length === 0) return null;

    // 最内层：长度最短
    containing.sort((a, b) => (a.end - a.start) - (b.end - b.start));

    if (!selectedChar) return containing[0];

    // 若用户选中的是某个边界字符，优先选择“边界字符与该对匹配”的最内层
    const boundaryMatch = containing.filter(p =>
      p.openChar === selectedChar || p.closeChar === selectedChar
    );
    if (boundaryMatch.length) return boundaryMatch[0];

    // 否则退回最内层
    return containing[0];
  }

  // ---------- 主逻辑 ----------
  function expandAndHighlight() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const selectedText = sel.toString();
    if (!selectedText || selectedText.length !== 1) return;

    const ch = selectedText[0];
    const r0 = sel.getRangeAt(0);

    // 输入框/textarea 的选择不走 DOM Range（这里直接不处理）
    const ae = document.activeElement;
    if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA')) return;

    const root = getRootElement(r0.commonAncestorContainer);
    if (!root) return;

    const fullText = root.textContent || '';
    if (!fullText) return;

    const pos = getTextOffsetIn(root, r0.startContainer, r0.startOffset);
    if (pos < 0) return;

    // 仅当选中的是“我们关心的符号”才触发
    const isBracketChar = BRACKETS.has(ch) || CLOSE_TO_OPEN.has(ch);
    const isQuoteChar = QUOTES.has(ch);
    if (!isBracketChar && !isQuoteChar) return;

    const pairs = parsePairs(fullText);
    const best = pickBestPair(pairs, pos, ch);
    if (!best) return;

    const startInfo = getNodeAtTextOffset(root, best.start);
    const endInfo = getNodeAtTextOffset(root, best.end);
    if (!startInfo || !endInfo) return;

    const r = document.createRange();
    r.setStart(startInfo.node, startInfo.offset);
    r.setEnd(endInfo.node, endInfo.offset);

    // 更新选区（让你看到扩展效果）
    sel.removeAllRanges();
    sel.addRange(r);

    // 高亮（不改 DOM）
    applyHighlight(r);
    setTimeout(clearHighlight, HIGHLIGHT_MS);
  }

  // 事件：用 capture 更容易拿到 selection 已完成的状态（很多富文本场景更稳）
  let timer;
  function onMouseUp() {
    clearTimeout(timer);
    timer = setTimeout(expandAndHighlight, 60);
  }

  function init() {
    ensureStyle();
    document.addEventListener('mouseup', onMouseUp, true);
    console.log('paired highlight script loaded (full nested parser)');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();