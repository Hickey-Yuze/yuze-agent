/**
 * Yuze 技炉：评论区情绪脱水机
 * 适用：知乎、B站、微博、论坛等含大量短评论的页面
 * 纯前端启发式（不调用 API）；高「含水量」评论折叠为 🧽 已脱水 气泡
 */
(function () {
  'use strict';

  const STYLE_ID = 'poke-dehydrator-style';
  const MARK = 'poke-dehydrated';
  const MIN_LEN = 6;

  const INSULT = /傻[逼叉比]|nmsl|去死|滚|废物|脑残|弱智|阴阳|杠精|爬/i;
  const RANT = /[!！]{3,}|哈{4,}|呵{3,}|666{2,}|笑死|绝了|绷不住/i;
  const EMOJI_HEAVY = /[\u{1F300}-\u{1FAFF}]/gu;

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
      .poke-dehydrate-wrap { position: relative; }
      .poke-dehydrate-original {
        opacity: 0.18 !important;
        filter: grayscale(0.6);
        max-height: 2.4em;
        overflow: hidden;
        transition: opacity 0.2s;
      }
      .poke-dehydrate-original:hover { opacity: 0.45 !important; }
      .poke-dehydrate-badge {
        display: inline-block;
        margin: 4px 0;
        padding: 4px 10px;
        border-radius: 8px;
        background: linear-gradient(135deg, #e0f2fe, #f0fdf4);
        border: 1px dashed #94a3b8;
        color: #475569;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        font-family: system-ui, sans-serif;
      }
      .poke-dehydrate-badge:hover { background: #f1f5f9; }
      .poke-dehydrate-expanded .poke-dehydrate-original {
        opacity: 1 !important;
        max-height: none;
        filter: none;
      }
    `;
    document.head.appendChild(s);
  }

  function emojiRatio(text) {
    const em = text.match(EMOJI_HEAVY);
    return em ? em.length / Math.max(text.length, 1) : 0;
  }

  /** 0–100 含水量，越高越像纯情绪 */
  function waterScore(text) {
    const t = text.trim();
    if (t.length < MIN_LEN) return 95;
    let score = 0;
    if (INSULT.test(t)) score += 45;
    if (RANT.test(t)) score += 25;
    if (emojiRatio(t) > 0.15) score += 20;
    if (t.length < 20 && /[?？]/.test(t)) score += 15;
    if (/^(附议|\+1|顶|蹲|mark|插眼)/i.test(t)) score += 40;
    if (/我觉得|感觉|好像|也许/.test(t) && t.length < 40 && !/\d/.test(t)) score += 10;
    // 低分：含数据、链接、步骤
    if (/\d{2,}|https?:|步骤|首先|因为|所以|数据|论文|来源/.test(t)) score -= 30;
    if (t.length > 120 && /[。；]/.test(t)) score -= 15;
    return Math.max(0, Math.min(100, score));
  }

  const BLOCK_SELECTORS = [
    '.CommentContent',
    '.CommentItem',
    '.reply-item',
    '.list-item',
    '[class*="comment"]',
    '[class*="Comment"]',
    '.reply-content',
    '.text-con',
  ];

  function candidateNodes() {
    const set = new Set();
    BLOCK_SELECTORS.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        if (el.dataset[MARK]) return;
        const text = (el.innerText || '').trim();
        if (text.length < MIN_LEN || text.length > 2000) return;
        set.add(el);
      });
    });
    return [...set];
  }

  function dehydrate(el, score) {
    if (el.dataset[MARK]) return;
    el.dataset[MARK] = '1';
    const wrap = document.createElement('div');
    wrap.className = 'poke-dehydrate-wrap';
    el.parentNode.insertBefore(wrap, el);
    wrap.appendChild(el);

    const badge = document.createElement('span');
    badge.className = 'poke-dehydrate-badge';
    badge.textContent = '🧽 已脱水 · 含水量 ' + score + '% · 点击展开';
    badge.addEventListener('click', () => {
      wrap.classList.toggle('poke-dehydrate-expanded');
      badge.textContent = wrap.classList.contains('poke-dehydrate-expanded')
        ? '🧽 已恢复原文 · 点击折叠'
        : '🧽 已脱水 · 含水量 ' + score + '% · 点击展开';
    });

    el.classList.add('poke-dehydrate-original');
    wrap.insertBefore(badge, el);
  }

  injectStyles();
  let n = 0;
  candidateNodes().forEach((el) => {
    const score = waterScore(el.innerText || '');
    if (score >= 55) {
      dehydrate(el, score);
      n++;
    }
  });

  if (n === 0) {
    console.warn('[情绪脱水机] 本页未命中高含水量评论，可滚动加载更多或调低阈值');
  } else {
    console.log('[情绪脱水机] 已脱水 ' + n + ' 条评论');
  }
})();