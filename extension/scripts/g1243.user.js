(function() {
  if (window.__universalTranslatorLoaded) return;
  window.__universalTranslatorLoaded = true;

  const SCRIPT_ID = '__ut_';
  let overlayElements = [];
  let isTranslated = false;
  let currentTargetLang = null;

  // ============ 语言列表 ============
  const LANGUAGES = {
    '常用语言': {
      'zh-CN': '中文(简体)', 'zh-TW': '中文(繁體)', 'en': 'English', 'ja': '日本語',
      'ko': '한국어', 'fr': 'Français', 'de': 'Deutsch', 'es': 'Español',
      'pt': 'Português', 'ru': 'Русский', 'ar': 'العربية', 'it': 'Italiano',
      'th': 'ไทย', 'vi': 'Tiếng Việt', 'id': 'Bahasa Indonesia', 'ms': 'Bahasa Melayu',
      'hi': 'हिन्दी', 'bn': 'বাংলা', 'tr': 'Türkçe', 'nl': 'Nederlands',
      'pl': 'Polski', 'uk': 'Українська', 'sv': 'Svenska', 'da': 'Dansk',
    },
    '小众/区域语言': {
      'la': 'Latina', 'eo': 'Esperanto', 'cy': 'Cymraeg', 'ga': 'Gaeilge',
      'gd': 'Gàidhlig', 'mt': 'Malti', 'eu': 'Euskara', 'ca': 'Català',
      'gl': 'Galego', 'af': 'Afrikaans', 'sw': 'Kiswahili', 'zu': 'isiZulu',
      'xh': 'isiXhosa', 'am': 'አማርኛ', 'hy': 'Հայերեն', 'ka': 'ქართული',
      'km': 'ខ្មែរ', 'lo': 'ລາວ', 'my': 'မြန်မာ', 'si': 'සිංහල',
      'ne': 'नेपाली', 'ps': 'پښتو', 'ku': 'Kurdî', 'tg': 'Тоҷикӣ',
      'ug': 'ئۇيغۇرچە', 'bo': 'བོད་སྐད།', 'dv': 'ދިވެހި', 'iu': 'ᐃᓄᒃᑎᑐᑦ',
      'or': 'ଓଡ଼ିଆ', 'pa': 'ਪੰਜਾਬੀ', 'sa': 'संस्कृतम्', 'sd': 'سنڌي',
      'as': 'অসমীয়া', 'gu': 'ગુજરાતી', 'kn': 'ಕನ್ನಡ', 'ml': 'മലയാളം',
      'mr': 'मराठी', 'ta': 'தமிழ்', 'te': 'తెలుగు', 'haw': 'ʻŌlelo Hawaiʻi',
      'mi': 'Te Reo Māori', 'sm': 'Gagana Sāmoa', 'to': 'Lea Faka-Tonga',
      'fj': 'Vosa Vakaviti', 'st': 'Sesotho', 'tn': 'Setswana', 'ts': 'Xitsonga',
    },
    '编码格式': {
      'binary': '二进制 (Binary)', 'morse': '摩斯电码 (Morse Code)',
      'hex': '十六进制 (Hexadecimal)', 'base64': 'Base64 编码',
    }
  };

  // ============ 摩斯电码表 ============
  const MORSE_MAP = {
    'A':'.-','B':'-...','C':'-.-.','D':'-..','E':'.','F':'..-.','G':'--.',
    'H':'....','I':'..','J':'.---','K':'-.-','L':'.-..','M':'--','N':'-.',
    'O':'---','P':'.--.','Q':'--.-','R':'.-.','S':'...','T':'-','U':'..-',
    'V':'...-','W':'.--','X':'-..-','Y':'-.--','Z':'--..','0':'-----',
    '1':'.----','2':'..---','3':'...--','4':'....-','5':'.....',
    '6':'-....','7':'--...','8':'---..','9':'----.', ' ':'/','.':'.-.-.-',
    ',':'--..--','?':'..--..','!':'-.-.--','/':'-..-.','(':'-.--.',')':'-.--.-',
    '&':'.-...',':':'---...',';':'-.-.-.','=':'-...-','+':'.-.-.',
    '-':'-....-','_':'..--.-','"':'.-..-.','$':'...-..-','@':'.--.-.',
    "'":'.----.'
  };
  const MORSE_REVERSE = {};
  Object.entries(MORSE_MAP).forEach(([k, v]) => MORSE_REVERSE[v] = k);

  // ============ 编码/解码函数 ============
  function textToBinary(text) {
    return [...text].map(c => c.charCodeAt(0).toString(2).padStart(8, '0')).join(' ');
  }

  function textToHex(text) {
    return [...text].map(c => c.charCodeAt(0).toString(16).padStart(2, '0').toUpperCase()).join(' ');
  }

  function textToBase64(text) {
    try { return btoa(unescape(encodeURIComponent(text))); } catch(e) { return text; }
  }

  function textToMorse(text) {
    return [...text.toUpperCase()].map(c => MORSE_MAP[c] || c).join(' ');
  }

  function binaryToText(binary) {
    try {
      return binary.trim().split(/\s+/).map(b => String.fromCharCode(parseInt(b, 2))).join('');
    } catch(e) { return binary; }
  }

  function hexToText(hex) {
    try {
      return hex.trim().split(/\s+/).map(h => String.fromCharCode(parseInt(h, 16))).join('');
    } catch(e) { return hex; }
  }

  function base64ToText(b64) {
    try { return decodeURIComponent(escape(atob(b64))); } catch(e) { return b64; }
  }

  function morseToText(morse) {
    return morse.trim().split(/\s{2,}|\s*\/\s*/).map(word =>
      word.split(/\s+/).map(code => MORSE_REVERSE[code] || code).join('')
    ).join(' ');
  }

  // ============ 翻译引擎 ============
  async function translateText(text, sourceLang, targetLang) {
    if (!text || !text.trim()) return text;

    // 编码格式目标：本地转换
    if (targetLang === 'binary') return textToBinary(text);
    if (targetLang === 'morse') return textToMorse(text);
    if (targetLang === 'hex') return textToHex(text);
    if (targetLang === 'base64') return textToBase64(text);

    // 编码格式源：先解码为文本
    let processedText = text;
    let effectiveSource = sourceLang;
    if (sourceLang === 'binary') { processedText = binaryToText(text); effectiveSource = 'en'; }
    else if (sourceLang === 'morse') { processedText = morseToText(text); effectiveSource = 'en'; }
    else if (sourceLang === 'hex') { processedText = hexToText(text); effectiveSource = 'en'; }
    else if (sourceLang === 'base64') { processedText = base64ToText(text); effectiveSource = 'en'; }

    // 相同语言无需翻译
    if (effectiveSource === targetLang) return processedText;

    // 使用 MyMemory API 翻译
    const maxLen = 480;
    const chunks = [];
    for (let i = 0; i < processedText.length; i += maxLen) {
      chunks.push(processedText.slice(i, i + maxLen));
    }

    const results = [];
    for (const chunk of chunks) {
      try {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=${effectiveSource}|${targetLang}`;
        const resp = await fetch(url);
        const data = await resp.json();
        if (data.responseStatus === 200 && data.responseData) {
          results.push(data.responseData.translatedText);
        } else {
          results.push(chunk);
        }
      } catch(e) {
        console.warn('Translation failed for chunk:', e);
        results.push(chunk);
      }
    }
    return results.join('');
  }

  // ============ 文本节点收集 ============
  function getVisibleTextNodes(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function(node) {
        if (!node.textContent.trim()) return NodeFilter.FILTER_REJECT;
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        const tag = parent.tagName.toLowerCase();
        if (['script','style','noscript','textarea','input','select','option'].includes(tag)) return NodeFilter.FILTER_REJECT;
        if (parent.id && parent.id.startsWith(SCRIPT_ID)) return NodeFilter.FILTER_REJECT;
        const style = window.getComputedStyle(parent);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return NodeFilter.FILTER_REJECT;
        if (parent.closest(`[id^="${SCRIPT_ID}"]`)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    return nodes;
  }

  // ============ 检测语言 ============
  function detectSourceLang() {
    const htmlLang = document.documentElement.lang || '';
    if (htmlLang.startsWith('zh')) return 'zh-CN';
    if (htmlLang.startsWith('en')) return 'en';
    if (htmlLang.startsWith('ja')) return 'ja';
    if (htmlLang.startsWith('ko')) return 'ko';
    if (htmlLang.startsWith('fr')) return 'fr';
    if (htmlLang.startsWith('de')) return 'de';
    if (htmlLang.startsWith('es')) return 'es';
    if (htmlLang.startsWith('ru')) return 'ru';
    if (htmlLang.startsWith('ar')) return 'ar';
    return 'en';
  }

  // ============ 覆盖翻译显示 ============
  async function applyTranslation(targetLang) {
    // 先清除已有的覆盖层
    removeTranslation();

    currentTargetLang = targetLang;
    const sourceLang = detectSourceLang();
    const textNodes = getVisibleTextNodes(document.body);

    const uniqueParents = new Map();
    textNodes.forEach(node => {
      const parent = node.parentElement;
      if (parent && !uniqueParents.has(parent)) {
        uniqueParents.set(parent, []);
      }
      if (parent) {
        uniqueParents.get(parent).push(node);
      }
    });

    for (const [parent, nodes] of uniqueParents) {
      const fullText = parent.textContent.trim();
      if (!fullText || fullText.length < 1) continue;

      try {
        const translated = await translateText(fullText, sourceLang, targetLang);
        if (!translated || translated === fullText) continue;

        const overlay = document.createElement('span');
        overlay.id = SCRIPT_ID + 'ovl_' + Math.random().toString(36).slice(2);
        overlay.className = SCRIPT_ID + 'overlay';
        overlay.textContent = translated;
        overlay.dataset.originalText = fullText;

        Object.assign(overlay.style, {
          position: 'relative',
          display: 'inline',
          color: '#1a73e8',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.95) 60%, rgba(26,115,232,0.08) 100%)',
          borderRadius: '3px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          textDecoration: 'underline',
          textDecorationStyle: 'dotted',
          textDecorationColor: '#1a73e8',
          textUnderlineOffset: '3px',
        });

        overlay.title = `原文: ${fullText}\n(点击查看原文)`;

        overlay.addEventListener('click', function(e) {
          e.stopPropagation();
          const isShowingOriginal = this.dataset.showOriginal === 'true';
          if (isShowingOriginal) {
            this.textContent = this.dataset.translatedText;
            this.dataset.showOriginal = 'false';
            this.title = `原文: ${this.dataset.originalText}\n(点击查看原文)`;
          } else {
            this.dataset.translatedText = this.textContent;
            this.textContent = this.dataset.originalText;
            this.dataset.showOriginal = 'true';
            this.title = `译文: ${this.dataset.translatedText}\n(点击查看译文)`;
          }
        });

        parent.innerHTML = '';
        parent.appendChild(overlay);
        overlayElements.push({ parent, overlay });
      } catch(e) {
        console.warn('Translation error:', e);
      }
    }

    isTranslated = true;
    showToast(`✅ 已翻译为 ${getLangName(targetLang)}（点击蓝色文字可切换原文）`);
  }

  function removeTranslation() {
    overlayElements.forEach(({ parent, overlay }) => {
      try {
        if (overlay.dataset.originalText && parent.contains(overlay)) {
          parent.textContent = overlay.dataset.originalText;
        }
      } catch(e) {}
    });
    overlayElements = [];
    isTranslated = false;
    currentTargetLang = null;
  }

  function getLangName(code) {
    for (const category of Object.values(LANGUAGES)) {
      if (category[code]) return category[code];
    }
    return code;
  }

  // ============ Toast 提示 ============
  function showToast(message, duration = 3000) {
    const existing = document.getElementById(SCRIPT_ID + 'toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = SCRIPT_ID + 'toast';
    Object.assign(toast.style, {
      position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
      background: 'rgba(30,30,30,0.92)', color: '#fff', padding: '10px 22px',
      borderRadius: '12px', fontSize: '14px', zIndex: '2147483647',
      backdropFilter: 'blur(8px)', boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
      transition: 'opacity 0.3s ease', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    });
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, duration);
  }

  // ============ 弹窗 UI ============
  function createModal() {
    if (document.getElementById(SCRIPT_ID + 'modal')) {
      document.getElementById(SCRIPT_ID + 'modal').remove();
    }

    const modal = document.createElement('div');
    modal.id = SCRIPT_ID + 'modal';
    Object.assign(modal.style, {
      position: 'fixed', inset: '0', zIndex: '2147483646',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    });

    const dialog = document.createElement('div');
    Object.assign(dialog.style, {
      background: '#fff', borderRadius: '16px', width: '520px', maxWidth: '92vw',
      maxHeight: '80vh', display: 'flex', flexDirection: 'column',
      boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden',
    });

    // 头部
    const header = document.createElement('div');
    Object.assign(header.style, {
      padding: '20px 24px 16px', borderBottom: '1px solid #eee',
      display: 'flex', flexDirection: 'column', gap: '12px',
    });

    const titleRow = document.createElement('div');
    Object.assign(titleRow.style, { display: 'flex', justifyContent: 'space-between', alignItems: 'center' });

    const title = document.createElement('h3');
    Object.assign(title.style, {
      margin: '0', fontSize: '18px', fontWeight: '700', color: '#1a1a1a',
    });
    title.textContent = '🌐 万能翻译器';

    const closeBtn = document.createElement('button');
    Object.assign(closeBtn.style, {
      background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer',
      color: '#999', padding: '4px 8px', borderRadius: '6px',
    });
    closeBtn.textContent = '✕';
    closeBtn.onmouseenter = () => closeBtn.style.background = '#f0f0f0';
    closeBtn.onmouseleave = () => closeBtn.style.background = 'none';
    closeBtn.onclick = () => modal.remove();

    titleRow.append(title, closeBtn);

    // 搜索框
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = '🔍 搜索语言...';
    Object.assign(searchInput.style, {
      width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #e0e0e0',
      fontSize: '14px', outline: 'none', boxSizing: 'border-box',
      transition: 'border-color 0.2s',
    });
    searchInput.onfocus = () => searchInput.style.borderColor = '#1a73e8';
    searchInput.onblur = () => searchInput.style.borderColor = '#e0e0e0';

    header.append(titleRow, searchInput);

    // 语言列表
    const listContainer = document.createElement('div');
    Object.assign(listContainer.style, {
      flex: '1', overflowY: 'auto', padding: '8px 0',
    });

    function renderLanguages(filter = '') {
      listContainer.innerHTML = '';
      const lowerFilter = filter.toLowerCase();

      for (const [category, langs] of Object.entries(LANGUAGES)) {
        const filteredEntries = Object.entries(langs).filter(([code, name]) => {
          return !filter || name.toLowerCase().includes(lowerFilter) || code.toLowerCase().includes(lowerFilter);
        });

        if (filteredEntries.length === 0) continue;

        const catHeader = document.createElement('div');
        Object.assign(catHeader.style, {
          padding: '10px 24px 6px', fontSize: '12px', fontWeight: '600',
          color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px',
        });
        catHeader.textContent = category;
        listContainer.appendChild(catHeader);

        filteredEntries.forEach(([code, name]) => {
          const item = document.createElement('div');
          Object.assign(item.style, {
            padding: '10px 24px', cursor: 'pointer', fontSize: '14px',
            color: '#333', transition: 'background 0.15s', display: 'flex',
            justifyContent: 'space-between', alignItems: 'center',
          });
          item.onmouseenter = () => item.style.background = '#f0f4ff';
          item.onmouseleave = () => item.style.background = 'transparent';

          const nameSpan = document.createElement('span');
          nameSpan.textContent = name;

          const codeSpan = document.createElement('span');
          Object.assign(codeSpan.style, {
            fontSize: '11px', color: '#aaa', background: '#f5f5f5',
            padding: '2px 8px', borderRadius: '4px',
          });
          codeSpan.textContent = code;

          item.append(nameSpan, codeSpan);
          item.onclick = () => {
            modal.remove();
            applyTranslation(code);
          };
          listContainer.appendChild(item);
        });
      }

      if (!listContainer.children.length) {
        const empty = document.createElement('div');
        Object.assign(empty.style, {
          padding: '40px 24px', textAlign: 'center', color: '#999', fontSize: '14px',
        });
        empty.textContent = '未找到匹配的语言';
        listContainer.appendChild(empty);
      }
    }

    searchInput.oninput = (e) => renderLanguages(e.target.value);

    // 底部操作栏
    const footer = document.createElement('div');
    Object.assign(footer.style, {
      padding: '12px 24px', borderTop: '1px solid #eee',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      background: '#fafafa',
    });

    const hint = document.createElement('span');
    Object.assign(hint.style, { fontSize: '12px', color: '#999' });
    hint.textContent = '快捷键: Alt+T 唤出 | Alt+R 还原';

    const restoreBtn = document.createElement('button');
    Object.assign(restoreBtn.style, {
      background: '#fff', border: '1.5px solid #e0e0e0', padding: '8px 18px',
      borderRadius: '8px', fontSize: '13px', cursor: 'pointer', color: '#666',
      fontWeight: '500', transition: 'all 0.15s',
    });
    restoreBtn.textContent = '↩ 还原原文';
    restoreBtn.onmouseenter = () => { restoreBtn.style.borderColor = '#1a73e8'; restoreBtn.style.color = '#1a73e8'; };
    restoreBtn.onmouseleave = () => { restoreBtn.style.borderColor = '#e0e0e0'; restoreBtn.style.color = '#666'; };
    restoreBtn.onclick = () => { removeTranslation(); modal.remove(); showToast('已还原原文'); };

    footer.append(hint, restoreBtn);

    dialog.append(header, listContainer, footer);
    modal.appendChild(dialog);
    document.body.appendChild(modal);

    renderLanguages();
    searchInput.focus();

    // 点击遮罩关闭
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    // ESC 关闭
    const escHandler = (e) => { if (e.key === 'Escape') { modal.remove(); document.removeEventListener('keydown', escHandler); } };
    document.addEventListener('keydown', escHandler);
  }

  // ============ 快捷键绑定 ============
  document.addEventListener('keydown', (e) => {
    // Alt+T 唤出翻译弹窗
    if (e.altKey && e.key.toLowerCase() === 't') {
      e.preventDefault();
      createModal();
    }
    // Alt+R 还原
    if (e.altKey && e.key.toLowerCase() === 'r') {
      e.preventDefault();
      removeTranslation();
      showToast('已还原原文');
    }
  });

  // ============ 浮动按钮 ============
  function createFloatingButton() {
    if (document.getElementById(SCRIPT_ID + 'fab')) return;

    const fab = document.createElement('div');
    fab.id = SCRIPT_ID + 'fab';
    fab.innerHTML = '🌐';
    Object.assign(fab.style, {
      position: 'fixed', bottom: '80px', right: '24px', width: '44px', height: '44px',
      borderRadius: '50%', background: 'linear-gradient(135deg, #1a73e8, #4285f4)',
      color: '#fff', fontSize: '20px', display: 'flex', alignItems: 'center',
      justifyContent: 'center', cursor: 'pointer', zIndex: '2147483645',
      boxShadow: '0 4px 14px rgba(26,115,232,0.4)', transition: 'all 0.2s ease',
      userSelect: 'none',
    });
    fab.onmouseenter = () => { fab.style.transform = 'scale(1.12)'; fab.style.boxShadow = '0 6px 20px rgba(26,115,232,0.5)'; };
    fab.onmouseleave = () => { fab.style.transform = 'scale(1)'; fab.style.boxShadow = '0 4px 14px rgba(26,115,232,0.4)'; };
    fab.title = '万能翻译器 (Alt+T)';
    fab.onclick = () => createModal();
    document.body.appendChild(fab);
  }

  // ============ 初始化 ============
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createFloatingButton);
  } else {
    createFloatingButton();
  }

  showToast('🌐 万能翻译器已就绪 | Alt+T 翻译 | Alt+R 还原', 4000);
})();