window.CATTLE_READER_DEFAULT_DATA = [
  {
    title: '第1章 欢迎使用牛马阅读器',
    content: `
这是一款能够平衡工作节奏和精神状态的阅读器，长期使用有助于保持牛马的身心健康。

现在导入你喜欢的书籍开始阅读吧。

或者继续阅读下一章：如何使用牛马阅读器
`
  },
  {
    title: `第2章 如何使用牛马阅读器`,
    content: `
1、点击“导书”按钮，导入喜欢的书籍
2、选择文本，点击“插入”按钮，插入阅读器
  
此时，你便可在看文档的同时无缝阅读书籍了。
  
如果你担心，你精彩的书籍会吸引到你好奇的同事，
或者你担心，总在你身后徘徊的老板会误解你保持高效的「技炉」，
那么……
  
3、点击“开启深度伪装”按钮，牛马阅读器将分析文档上下文，自动生成伪装文字。
  
现在，当鼠标离开阅读器时，伪装文字将填补阅读器，一切浑然天成。
还等什么呢？赶紧导入书籍开始享受吧！
`
  },
]

function cattleReaderLog(...args) {
  // console.log('🐮 CATTLE READER 🐮', ...args);
}

const CATTLE_READER_VERSION = '0.0.1';
cattleReaderLog(`version: ${CATTLE_READER_VERSION}`);
const READER_PAGE_SIZE = 10;
const PREV_CONTEXT_LEN = 200;
const NEXT_CONTEXT_LEN = 200;
const LINE_COUNT = READER_PAGE_SIZE + 1;
const LINE_SIZE_MIN = 10;
const LINE_SIZE_MAX = 40;

// 深度伪装首次切换时的碎裂/聚合动效时长（毫秒），需与样式表中的 animation-duration 保持一致
const DISGUISE_ANIMATION_DURATION = 500;
// 首次生成完成后的常规淡入淡出，以及后续鼠标进出阅读器时使用的切换时长（毫秒）
const DISGUISE_FADE_DURATION = 180;

// 注入深度伪装动效需要的样式：把文字拆成单字 span 后，
// 通过随机方向的位移/旋转/缩放 + 透明度过渡，模拟"碎裂消失"与"聚合出现"。
function createDisguiseStyleSheet() {
  if (document.getElementById('cattle-reader-disguise-style')) {
    return;
  }
  const style = document.createElement('style');
  style.id = 'cattle-reader-disguise-style';
  style.textContent = `
    .cattle-reader-char {
      display: inline-block;
      white-space: pre;
      will-change: transform, opacity;
    }
    .cattle-reader-char-shatter-out {
      animation: cattle-reader-shatter-out ${DISGUISE_ANIMATION_DURATION}ms cubic-bezier(0.55, 0, 1, 0.45) forwards;
    }
    .cattle-reader-char-assemble-in {
      animation: cattle-reader-assemble-in ${DISGUISE_ANIMATION_DURATION}ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    .cattle-reader-char-charging {
      animation: cattle-reader-char-charge 140ms ease-in-out infinite alternate;
    }
    @keyframes cattle-reader-char-charge {
      from {
        transform: translate(0, 0) scale(1);
        opacity: 1;
      }
      to {
        transform: translate(var(--cattle-charge-x), var(--cattle-charge-y)) scale(1.06);
        opacity: 0.78;
      }
    }
    @keyframes cattle-reader-shatter-out {
      to {
        transform: translate(var(--cattle-dx), var(--cattle-dy)) rotate(var(--cattle-rot)) scale(0.2);
        opacity: 0;
      }
    }
    @keyframes cattle-reader-assemble-in {
      from {
        transform: translate(var(--cattle-dx), var(--cattle-dy)) rotate(var(--cattle-rot)) scale(0.2);
        opacity: 0;
      }
      to {
        transform: translate(0, 0) rotate(0deg) scale(1);
        opacity: 1;
      }
    }
  `;
  document.head.appendChild(style);
}

// 把一行文本拆成逐字 span，写入 lineElement；每个字符 span 带随机的
// --cattle-dx/--cattle-dy/--cattle-rot CSS 变量，供碎裂/聚合动画使用位移方向。
function renderLineAsCharSpans(lineElement, text) {
  const textHost = lineElement.cattleReaderTextHost || lineElement;
  textHost.innerHTML = '';
  Array.from(text).forEach((char) => {
    const charSpan = document.createElement('span');
    charSpan.className = 'cattle-reader-char';
    charSpan.textContent = char;
    const angle = Math.random() * Math.PI * 2;
    const distance = 24 + Math.random() * 36;
    charSpan.style.setProperty('--cattle-dx', `${(Math.cos(angle) * distance).toFixed(1)}px`);
    charSpan.style.setProperty('--cattle-dy', `${(Math.sin(angle) * distance).toFixed(1)}px`);
    charSpan.style.setProperty('--cattle-rot', `${Math.round((Math.random() - 0.5) * 240)}deg`);
    // 错落感：每个字符动画略微错开起始时间
    charSpan.style.animationDelay = `${Math.round(Math.random() * 120)}ms`;
    textHost.appendChild(charSpan);
  });
}

// 还原控制栏内逐字动画产生的 span。只恢复文本节点，不重建链接元素，
// 因此翻页、目录、关闭等链接上已经绑定的事件监听会被完整保留。
function restoreControlsText(controlsElement) {
  controlsElement.querySelectorAll('.cattle-reader-char').forEach((charSpan) => {
    charSpan.replaceWith(document.createTextNode(charSpan.textContent));
  });
}

// 把控制栏内的文本节点逐字包装为 span。
function renderControlsAsCharSpans(controlsElement) {
  // 上一次动效可能遗留字符 span，先还原为普通文本节点，避免出现嵌套 span。
  restoreControlsText(controlsElement);

  const textNodes = [];
  const walker = document.createTreeWalker(controlsElement, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    if (walker.currentNode.textContent.length > 0) {
      textNodes.push(walker.currentNode);
    }
  }

  textNodes.forEach((textNode) => {
    const fragment = document.createDocumentFragment();
    Array.from(textNode.textContent).forEach((char) => {
      const charSpan = document.createElement('span');
      charSpan.className = 'cattle-reader-char';
      charSpan.textContent = char;
      const angle = Math.random() * Math.PI * 2;
      const distance = 24 + Math.random() * 36;
      charSpan.style.setProperty('--cattle-dx', `${(Math.cos(angle) * distance).toFixed(1)}px`);
      charSpan.style.setProperty('--cattle-dy', `${(Math.sin(angle) * distance).toFixed(1)}px`);
      charSpan.style.setProperty('--cattle-rot', `${Math.round((Math.random() - 0.5) * 240)}deg`);
      charSpan.style.animationDelay = `${Math.round(Math.random() * 120)}ms`;
      fragment.appendChild(charSpan);
    });
    textNode.replaceWith(fragment);
  });
}

// 将正文行和控制栏准备为逐字 span。生成中的“蓄能”与成功后的“碎裂”共用同一批字符，
// 使两段动画自然衔接，而不是先整体抖动再重新拆字。
function prepareDisguiseCharacters(contentElement) {
  const lineElements = Array.from(contentElement.querySelectorAll('.cattle-reader-line'));
  const controlsElement = contentElement.querySelector('.cattle-reader-controls');

  lineElements.forEach((lineElement) => {
    renderLineAsCharSpans(lineElement, lineElement.textContent);
  });
  if (controlsElement) {
    renderControlsAsCharSpans(controlsElement);
  }

  contentElement.querySelectorAll('.cattle-reader-char').forEach((charSpan) => {
    const chargeAngle = Math.random() * Math.PI * 2;
    const chargeDistance = 0.8 + Math.random() * 1.8;
    charSpan.style.setProperty('--cattle-charge-x', `${(Math.cos(chargeAngle) * chargeDistance).toFixed(1)}px`);
    charSpan.style.setProperty('--cattle-charge-y', `${(Math.sin(chargeAngle) * chargeDistance).toFixed(1)}px`);
  });
}

// 对逐字文本播放指定动画。reusePreparedCharacters 为 true 时复用“蓄能”阶段的字符节点。
function playDisguiseAnimation(contentElement, direction, reusePreparedCharacters = false) {
  if (!reusePreparedCharacters) {
    prepareDisguiseCharacters(contentElement);
  }

  const animationClass =
    direction === 'out' ? 'cattle-reader-char-shatter-out' : 'cattle-reader-char-assemble-in';
  contentElement.querySelectorAll('.cattle-reader-char').forEach((charSpan) => {
    charSpan.classList.remove('cattle-reader-char-charging');
    charSpan.classList.add(animationClass);
  });
}

function startChargingCharacters(contentElement) {
  prepareDisguiseCharacters(contentElement);
  contentElement.querySelectorAll('.cattle-reader-char').forEach((charSpan) => {
    charSpan.classList.add('cattle-reader-char-charging');
  });
}

function stopChargingCharacters(contentElement) {
  contentElement.querySelectorAll('.cattle-reader-char').forEach((charSpan) => {
    charSpan.classList.remove('cattle-reader-char-charging');
  });
}

// 构造一个从 body 起点到指定节点/偏移位置的 Range，取 toString() 长度，
// 作为该点在整页纯文本中的偏移量。供选区上下文、节点上下文等场景复用。
function getTextOffsetInBody(node, offset) {
  const range = document.createRange();
  range.selectNodeContents(document.body);
  range.setEnd(node, offset);
  return range.toString().length;
}

// 获取指定节点（如阅读器容器）在页面正文中前后指定长度的纯文本，
// 用于"深度伪装"场景：让 LLM 依据阅读器插入位置前后的原网页文本，生成过渡内容。
function getNodeSurroundingContext(node) {
  const fullTextRange = document.createRange();
  fullTextRange.selectNodeContents(document.body);
  const fullText = fullTextRange.toString();

  // 节点起点：body 起点到节点第一个子节点之前的偏移
  const nodeStart = getTextOffsetInBody(node, 0);
  // 节点终点：body 起点到节点最后一个子节点之后的偏移（即跳过整个节点的文本内容）
  const nodeEnd = getTextOffsetInBody(node, node.childNodes.length);

  const prevText = fullText.slice(Math.max(0, nodeStart - PREV_CONTEXT_LEN), nodeStart);
  const nextText = fullText.slice(nodeEnd, nodeEnd + NEXT_CONTEXT_LEN);

  return { prevText, nextText };
}

function hasTextSelection() {
  if (!window.getSelection) {
    return false;
  }
  const selection = window.getSelection();
  return !!selection && !selection.isCollapsed && selection.toString().trim().length > 0;
}

function getSelectedElement() {
  if (window.getSelection) {
    const selection = window.getSelection();
    cattleReaderLog('selection', selection);
    const parentElement = selection?.baseNode?.parentElement
    if (parentElement) {
      return parentElement;
    } else {
      cattleReaderLog('未选择文本');
    }
  } else {
    cattleReaderLog('不资瓷 getSelection');
  }
  return null;
}


function buildReaderPages(novelData) {
  // 每一章单独分页，不跨章节合并，保证新的一章总是从新的一页开始
  const pages = [];
  // 记录每一章第一页在 pages 数组中的下标，供"上一章/下一章"跳转使用
  const chapterFirstPageIndex = [];
  novelData.forEach((chapter, chapterIndex) => {
    const contentLines = (chapter.content || '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const chapterLines = [
      { text: chapter.title, isTitle: true, chapterIndex },
      ...contentLines.map((line) => ({ text: line, isTitle: false, chapterIndex })),
    ];

    chapterFirstPageIndex.push(pages.length);
    for (let i = 0; i < chapterLines.length; i += READER_PAGE_SIZE) {
      pages.push(chapterLines.slice(i, i + READER_PAGE_SIZE));
    }
  });
  return { pages, chapterFirstPageIndex };
}

// 以书维度记录阅读进度（当前页码），key 为书籍标识，value 为 pageIndex。
// 只存在于内存中，刷新页面后会丢失，但同一次会话内关闭阅读器再重新打开同一本书，进度可以恢复。
const novelProgressMap = new Map();

// 用书籍的章节标题拼接生成一个简单标识，作为进度记录的 key。
// 同一本书（章节标题序列相同）视为同一本书，避免为每本书额外维护 id 字段。
function getNovelKey(novelData) {
  return novelData.map((chapter) => chapter.title).join('|');
}

function isFeishuDocument() {
  return window.location.hostname.includes('.feishu.cn');
}

function createReaderTextElement(className, text = '') {
  if (!isFeishuDocument()) {
    const paragraph = document.createElement('p');
    paragraph.className = className;
    paragraph.textContent = text;
    return paragraph;
  }

  const block = document.createElement('div');
  block.className = `block docx-text-block ${className}`;
  block.dataset.blockType = 'text';

  const wrapper = document.createElement('div');
  wrapper.className = 'text-block-wrapper';
  const textBlock = document.createElement('div');
  textBlock.className = 'text-block';
  const zone = document.createElement('div');
  zone.className = 'zone-container text-editor hide-placeholder non-empty';
  zone.dataset.zoneContainer = '*';
  zone.dataset.slateEditor = 'true';
  zone.contentEditable = 'false';
  const line = document.createElement('div');
  line.className = 'ace-line';
  line.dataset.node = 'true';
  line.dir = 'auto';
  const leaf = document.createElement('span');
  leaf.dataset.string = 'true';
  leaf.dataset.leaf = 'true';
  leaf.textContent = text;

  line.appendChild(leaf);
  zone.appendChild(line);
  textBlock.appendChild(zone);
  wrapper.appendChild(textBlock);
  block.appendChild(wrapper);
  block.cattleReaderTextHost = line;
  return block;
}

function createReaderElement(novelData, onClose) {
  createDisguiseStyleSheet();

  const { pages, chapterFirstPageIndex } = buildReaderPages(novelData);
  const novelKey = getNovelKey(novelData);
  const savedPageIndex = novelProgressMap.get(novelKey);
  let currentPageIndex =
    typeof savedPageIndex === 'number' && savedPageIndex >= 0 && savedPageIndex < pages.length
      ? savedPageIndex
      : 0;

  // 用 span 而非 div/section，避免产生独立区块的视觉观感，
  // 让内容原地插入在选区之后，跟随页面正常文档流，不另起卡片、不分屏。
  const container = document.createElement('div');
  container.className = 'cattle-reader-container';
  // 真实阅读器和伪装文本共用一个 Grid 单元格：两者都参与高度计算，
  // 容器会被较高内容自然撑开，避免伪装文本覆盖到阅读器下方的网页文字。
  container.style.display = 'grid';

  // 真实内容容器：装控制栏 + 正文行。深度伪装开启且鼠标移出阅读器时，
  // 整体隐藏，替换为 disguiseContainer 展示的伪装文本；鼠标移回时恢复展示。
  const realContent = document.createElement('div');
  realContent.className = 'cattle-reader-real-content';

  // 深度伪装内容容器：展示 LLM 生成的过渡文本，行数等于控制栏 1 行 + 正文 READER_PAGE_SIZE 行，
  // 与真实内容行数一致，尽量不因为行数变化引起页面其余内容跳动。
  const disguiseContainer = document.createElement('div');
  disguiseContainer.className = 'cattle-reader-disguise-content';
  // 与真实阅读器放在同一 Grid 单元格中。它不再使用绝对定位，
  // 因此会参与阅读器的自然高度计算，永远不会与下方网页文本重叠。
  disguiseContainer.style.cssText = [
    'display: none',
    'grid-area: 1 / 1',
    'width: 100%',
    'pointer-events: none',
  ].join(';');
  realContent.style.gridArea = '1 / 1';

  // 翻页控制行，样式尽量贴近普通文本链接，不做按钮化装饰。
  // 整行不换行，右侧预留当前章节名展示区
  const controls = createReaderTextElement('cattle-reader-controls');
  const controlsContent = controls.cattleReaderTextHost || controls;
  controlsContent.style.cssText = ['white-space: nowrap', 'display: flex', 'align-items: center'].join(
    ';',
  );

  function createControlLink(text, className) {
    const link = document.createElement('a');
    link.href = 'javascript:void(0)';
    link.textContent = text;
    link.className = className;
    return link;
  }

  // 分组分隔符，用于在"切章"/"当前章节"/"关闭阅读器"之间做视觉分隔
  function createControlSeparator() {
    const separator = document.createElement('span');
    separator.textContent = '|';
    separator.className = 'cattle-reader-separator';
    separator.style.cssText = ['margin: 0 8px', 'color: #ccc'].join(';');
    return separator;
  }

  const prevChapterButton = createControlLink('上一章', 'cattle-reader-prev-chapter'); // ⇤
  const prevButton = createControlLink('上一页', 'cattle-reader-prev'); // ←
  const nextButton = createControlLink('下一页', 'cattle-reader-next'); // →
  const nextChapterButton = createControlLink('下一章', 'cattle-reader-next-chapter'); // ⇥
  // 翻页链接文字较长，用固定间距分隔，避免挤在一起。
  // nextChapterButton 后面紧跟分组分隔符（自带左右间距），无需再加右边距。
  [prevChapterButton, prevButton, nextButton].forEach((link) => {
    link.style.marginRight = '10px';
  });

  const pageIndicator = document.createElement('span');
  pageIndicator.className = 'cattle-reader-page-indicator';

  // 当前章节名，固定在控制区域右侧，单行不换行，过长时自动变成省略号。
  // 点击可弹出目录列表进行章节跳转，替代原先单独的"选择章节"按钮。
  const chapterNameLabel = document.createElement('a');
  chapterNameLabel.href = 'javascript:void(0)';
  chapterNameLabel.className = 'cattle-reader-chapter-name';
  chapterNameLabel.style.cssText = ['cursor: pointer', 'text-decoration: none'].join(';');

  // 深度伪装状态：是否已开启、LLM 生成的伪装行文本（未拿到结果前为 null）
  let isDeepDisguiseEnabled = false;
  let disguiseLines = null;
  // 缓存本次阅读器实例的 LLM 请求 Promise：同一次插入只请求一次，
  // 后续重复开启只要复用该 Promise 的结果，不再重复调用 LLMBridge.chat。
  let disguiseContentPromise = null;

  // 把 LLM 返回的文本拆成行数组：按换行切分、去除首尾空白、丢弃空行，
  // 再补齐/裁剪到正好 LINE_COUNT 行，避免行数和真实内容对不上导致页面跳动。
  function parseDisguiseResultToLines(result) {
    const rawLines = String(result ?? '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const lines = rawLines.slice(0, LINE_COUNT);
    while (lines.length < LINE_COUNT) {
      lines.push('');
    }
    return lines;
  }

  // 请求（或复用缓存的）深度伪装文本，返回 Promise<string[]>（LINE_COUNT 行文本）
  function ensureDisguiseLines() {
    if (disguiseContentPromise) {
      return disguiseContentPromise;
    }

    const { prevText, nextText } = getNodeSurroundingContext(container);
    cattleReaderLog('深度伪装-阅读器前文本', prevText);
    cattleReaderLog('深度伪装-阅读器后文本', nextText);

    disguiseContentPromise = LLMBridge.chat(
      `根据前后内容拓展写下中间的填充内容，要求分成${LINE_COUNT}行，每行${LINE_SIZE_MIN}到${LINE_SIZE_MAX}个字，前面的内容是：「${prevText}」，后面的内容是：「${nextText}」`,
    ).then(
      (result) => {
        return parseDisguiseResultToLines(result);
      },
      (error) => {
        console.log(error);
        // 请求失败时清空缓存，允许下次点击重新请求
        disguiseContentPromise = null;
        throw error;
      },
    );

    return disguiseContentPromise;
  }

  // 用解析好的伪装行渲染 disguiseContainer 的静态内容（不带动画），
  // 供开启深度伪装、拿到 LLM 结果的那一刻使用（此时鼠标仍在阅读器内，伪装内容尚未显示）。
  function renderDisguiseContent(lines) {
    disguiseContainer.innerHTML = '';
    lines.forEach((lineText) => {
      disguiseContainer.appendChild(createReaderTextElement('cattle-reader-line', lineText));
    });
  }

  // 深度伪装的首次调用才会经历“抖动 → 碎裂 → 伪装文本出现”。
  // 缓存已生成后再次开启、以及后续鼠标进出，都只使用轻量的透明度切换。
  let isDeepDisguiseGenerating = false;
  let hasPlayedInitialDisguiseTransition = false;
  let isInitialDisguiseTransitioning = false;

  function notifyDeepDisguiseStateChange() {
    document.dispatchEvent(new Event('cattle-reader-deep-disguise-change'));
  }

  function showRealContentImmediately() {
    clearDisguiseTransitionTimer();
    // 若用户在首次碎裂过程中关闭伪装，明确结束该过渡，避免后续 hover 被误拦截。
    isInitialDisguiseTransitioning = false;
    stopChargingCharacters(realContent);
    restoreControlsText(controls);
    disguiseContainer.style.display = 'none';
    disguiseContainer.style.opacity = '';
    realContent.style.display = '';
    realContent.style.opacity = '';
    renderPage();
  }

  // 每次开启深度伪装都让真实阅读器碎裂消失；只有首次生成完成时，
  // 伪装文本额外播放一次聚合出现，之后开启直接展示静态伪装文本。
  function playDeepDisguiseTransition(reuseChargingCharacters, shouldAssembleDisguise) {
    isInitialDisguiseTransitioning = true;
    // 首次生成成功时复用正在逐字蓄能的节点；缓存复用时重新准备字符后碎裂。
    playDisguiseAnimation(realContent, 'out', reuseChargingCharacters);
    disguiseTransitionTimer = window.setTimeout(() => {
      // 两层都在同一 Grid 单元格并参与自然高度计算，不需要锁定容器高度。
      realContent.style.display = 'none';
      // 首次碎裂会把 controls 和正文行都拆为字符 span；隐藏后立刻恢复真实内容，
      // 确保后续 hover 的真实内容只参与透明度切换，不会残留任何碎裂状态。
      restoreControlsText(controls);
      renderPage();
      realContent.style.opacity = '';
      disguiseContainer.style.display = '';
      disguiseContainer.style.opacity = '';
      if (shouldAssembleDisguise) {
        // 仅首次展示时播放伪装文本的聚合；完成后立即还原为静态文本，
        // 后续 hover 或重新开启都不会继续带着聚合动画或其 forwards 结束状态。
        playDisguiseAnimation(disguiseContainer, 'in');
        disguiseTransitionTimer = window.setTimeout(() => {
          renderDisguiseContent(disguiseLines);
          isInitialDisguiseTransitioning = false;
          disguiseTransitionTimer = null;
        }, DISGUISE_ANIMATION_DURATION);
      } else {
        // 缓存复用后的重新开启：伪装文本是静态内容，仅真实阅读器播放碎裂。
        isInitialDisguiseTransitioning = false;
        disguiseTransitionTimer = null;
      }
    }, DISGUISE_ANIMATION_DURATION);
  }

  // 供“牛”菜单调用的开关入口。首次开启请求 LLM，后续复用缓存。
  function toggleDeepDisguise() {
    if (isDeepDisguiseGenerating) {
      return Promise.resolve();
    }

    if (isDeepDisguiseEnabled) {
      isDeepDisguiseEnabled = false;
      showRealContentImmediately();
      notifyDeepDisguiseStateChange();
      cattleReaderLog('深度伪装已关闭');
      return Promise.resolve();
    }

    const isFirstGeneration = !disguiseContentPromise;
    isDeepDisguiseGenerating = true;
    if (isFirstGeneration) {
      // LLM 生成期间，每个字符独立轻微震动、缩放，形成逐字蓄能感。
      startChargingCharacters(realContent);
    }
    notifyDeepDisguiseStateChange();

    return ensureDisguiseLines().then(
      (lines) => {
        disguiseLines = lines;
        renderDisguiseContent(disguiseLines);
        isDeepDisguiseEnabled = true;
        isDeepDisguiseGenerating = false;

        const isFirstDeepDisguiseTransition = !hasPlayedInitialDisguiseTransition;
        hasPlayedInitialDisguiseTransition = true;
        // 每次开启都播放真实阅读器碎裂；首次生成时复用蓄能字符并播放伪装聚合。
        playDeepDisguiseTransition(isFirstGeneration, isFirstDeepDisguiseTransition);

        notifyDeepDisguiseStateChange();
        cattleReaderLog('深度伪装已开启');
      },
      (error) => {
        isDeepDisguiseGenerating = false;
        stopChargingCharacters(realContent);
        showRealContentImmediately();
        notifyDeepDisguiseStateChange();
        throw error;
      },
    );
  }

  // 将阅读器能力暴露给外部“牛”菜单；事件与数据仍保留在当前实例的闭包中。
  container.cattleReaderDeepDisguise = {
    toggle: toggleDeepDisguise,
    isEnabled: () => isDeepDisguiseEnabled,
    isGenerating: () => isDeepDisguiseGenerating,
  };

  function closeReader() {
    clearDisguiseTransitionTimer();
    container.remove();
    tocPanel.remove();
    if (typeof onClose === 'function') {
      onClose();
    }
    cattleReaderLog('reader closed');
  }

  container.cattleReaderClose = closeReader;

  // 关闭阅读器按钮，紧跟在当前章节名右侧
  const closeButton = createControlLink('关闭阅读器', 'cattle-reader-close');
  closeButton.addEventListener('click', closeReader);

  function setLinkDisabled(link, disabled) {
    link.style.pointerEvents = disabled ? 'none' : 'auto';
    link.style.color = disabled ? '#ccc' : '';
    link.style.cursor = disabled ? 'default' : 'pointer';
  }

  // 当前页第一行携带的 chapterIndex 即为当前所在章节序号
  function getCurrentChapterOrder() {
    const line = (pages[currentPageIndex] || [])[0];
    return line ? line.chapterIndex : 0;
  }

  function goToPage(pageIndex) {
    if (pageIndex < 0 || pageIndex >= pages.length || pageIndex === currentPageIndex) {
      return;
    }
    currentPageIndex = pageIndex;
    novelProgressMap.set(novelKey, currentPageIndex);
    renderPage();
  }

  function renderPage() {
    // 先移除上一页渲染的行元素（保留 controls，不重建整个结构）
    // 限定在 realContent 范围内查找，避免误删 disguiseContainer 里的伪装行
    Array.from(realContent.querySelectorAll('.cattle-reader-line')).forEach((el) => el.remove());

    const page = pages[currentPageIndex] || [];
    page.forEach((line) => {
      // controls 固定在内容上方，正文行统一追加在 realContent 末尾即可
      realContent.appendChild(createReaderTextElement('cattle-reader-line', line.text));
    });

    const chapterOrder = getCurrentChapterOrder();
    const isFirstPage = currentPageIndex <= 0;
    const isLastPage = currentPageIndex >= pages.length - 1;

    setLinkDisabled(prevChapterButton, chapterOrder <= 0);
    setLinkDisabled(prevButton, isFirstPage);
    setLinkDisabled(nextButton, isLastPage);
    setLinkDisabled(nextChapterButton, chapterOrder >= novelData.length - 1);

    pageIndicator.textContent = `${currentPageIndex + 1}/${pages.length}`;

    const chapterName = novelData[chapterOrder] ? novelData[chapterOrder].title : '';
    chapterNameLabel.textContent = `当前章节：${chapterName}`;
  }

  prevChapterButton.addEventListener('click', () => {
    const chapterOrder = getCurrentChapterOrder();
    if (chapterOrder > 0) {
      goToPage(chapterFirstPageIndex[chapterOrder - 1]);
    }
  });

  prevButton.addEventListener('click', () => {
    goToPage(currentPageIndex - 1);
  });

  nextButton.addEventListener('click', () => {
    goToPage(currentPageIndex + 1);
  });

  nextChapterButton.addEventListener('click', () => {
    const chapterOrder = getCurrentChapterOrder();
    if (chapterOrder < novelData.length - 1) {
      goToPage(chapterFirstPageIndex[chapterOrder + 1]);
    }
  });

  // 目录浮层：固定定位，展示全部章节标题，点击某一项跳转到该章节第一页
  const tocPanel = document.createElement('div');
  tocPanel.className = 'cattle-reader-toc-panel';
  tocPanel.style.cssText = [
    'position: fixed',
    'display: none',
    'flex-direction: column',
    'max-height: 60vh',
    'overflow-y: auto',
    'background: #ffffff',
    'border: 1px solid #e0e0e0',
    'border-radius: 8px',
    'box-shadow: 0 2px 10px rgba(0, 0, 0, 0.25)',
    'padding: 6px',
    'z-index: 2147483647',
  ].join(';');

  const tocItems = novelData.map((chapter, chapterIndex) => {
    const tocItem = document.createElement('a');
    tocItem.href = 'javascript:void(0)';
    tocItem.className = 'cattle-reader-toc-item';
    tocItem.textContent = chapter.title;
    tocItem.style.cssText = [
      'display: block',
      'padding: 6px 12px',
      'white-space: nowrap',
      'color: #333333',
      'text-decoration: none',
      'border-radius: 4px',
    ].join(';');
    tocItem.addEventListener('mouseenter', () => {
      tocItem.style.background = '#f0f0f0';
    });
    tocItem.addEventListener('mouseleave', () => {
      tocItem.style.background = 'transparent';
    });
    tocItem.addEventListener('click', (event) => {
      event.stopPropagation();
      goToPage(chapterFirstPageIndex[chapterIndex]);
      closeTocPanel();
    });
    tocPanel.appendChild(tocItem);
    return tocItem;
  });

  function isTocPanelOpen() {
    return tocPanel.style.display !== 'none';
  }

  function closeTocPanel() {
    tocPanel.style.display = 'none';
  }

  function openTocPanel() {
    // 高亮当前所在章节，方便定位
    const chapterOrder = getCurrentChapterOrder();
    tocItems.forEach((tocItem, chapterIndex) => {
      tocItem.style.fontWeight = chapterIndex === chapterOrder ? 'bold' : 'normal';
    });

    tocPanel.style.display = 'flex';
    const buttonRect = chapterNameLabel.getBoundingClientRect();
    const panelRect = tocPanel.getBoundingClientRect();

    let left = buttonRect.left;
    left = Math.min(left, window.innerWidth - panelRect.width - 8);
    left = Math.max(left, 8);

    let top = buttonRect.bottom + 4;
    if (top + panelRect.height > window.innerHeight) {
      top = buttonRect.top - panelRect.height - 4;
    }
    top = Math.max(top, 8);

    tocPanel.style.left = `${left}px`;
    tocPanel.style.top = `${top}px`;
  }

  chapterNameLabel.addEventListener('click', (event) => {
    event.stopPropagation();
    if (isTocPanelOpen()) {
      closeTocPanel();
    } else {
      openTocPanel();
    }
  });

  document.addEventListener('click', (event) => {
    if (isTocPanelOpen() && !tocPanel.contains(event.target) && event.target !== chapterNameLabel) {
      closeTocPanel();
    }
  });

  // 切章分组：上一章 上一页 页码 下一页 下一章，间距通过各元素的 margin-right 控制
  pageIndicator.style.marginRight = '10px';
  controlsContent.appendChild(prevChapterButton);
  controlsContent.appendChild(prevButton);
  controlsContent.appendChild(pageIndicator);
  controlsContent.appendChild(nextButton);
  controlsContent.appendChild(nextChapterButton);
  controlsContent.appendChild(createControlSeparator());
  controlsContent.appendChild(chapterNameLabel);
  controlsContent.appendChild(createControlSeparator());
  controlsContent.appendChild(closeButton);
  // controls 固定放在书籍内容上方，与正文行一起装入 realContent
  realContent.appendChild(controls);
  container.appendChild(realContent);
  container.appendChild(disguiseContainer);
  document.body.appendChild(tocPanel);

  // 深度伪装切换动画的定时器：用于在快速进出阅读器区域时，
  // 取消上一次尚未完成的切换，避免动画状态叠加错乱。
  let disguiseTransitionTimer = null;

  function clearDisguiseTransitionTimer() {
    if (disguiseTransitionTimer !== null) {
      clearTimeout(disguiseTransitionTimer);
      disguiseTransitionTimer = null;
    }
  }

  // 首次生成完成后的鼠标进出不再重复碎裂，仅做透明度淡入淡出，避免频繁动画影响阅读。
  function fadeToDisguiseContent() {
    clearDisguiseTransitionTimer();
    disguiseContainer.style.display = '';
    disguiseContainer.style.opacity = '0';
    realContent.style.opacity = '1';

    // 强制浏览器先应用初始透明度，再开始过渡。
    void disguiseContainer.offsetWidth;
    realContent.style.transition = `opacity ${DISGUISE_FADE_DURATION}ms ease`;
    disguiseContainer.style.transition = `opacity ${DISGUISE_FADE_DURATION}ms ease`;
    realContent.style.opacity = '0';
    disguiseContainer.style.opacity = '1';

    disguiseTransitionTimer = window.setTimeout(() => {
      realContent.style.display = 'none';
      realContent.style.opacity = '';
      realContent.style.transition = '';
      disguiseContainer.style.transition = '';
      disguiseTransitionTimer = null;
    }, DISGUISE_FADE_DURATION);
  }

  function fadeToRealContent() {
    clearDisguiseTransitionTimer();
    realContent.style.display = '';
    realContent.style.opacity = '0';
    disguiseContainer.style.opacity = '1';

    void realContent.offsetWidth;
    realContent.style.transition = `opacity ${DISGUISE_FADE_DURATION}ms ease`;
    disguiseContainer.style.transition = `opacity ${DISGUISE_FADE_DURATION}ms ease`;
    realContent.style.opacity = '1';
    disguiseContainer.style.opacity = '0';

    disguiseTransitionTimer = window.setTimeout(() => {
      disguiseContainer.style.display = 'none';
      disguiseContainer.style.opacity = '';
      disguiseContainer.style.transition = '';
      realContent.style.transition = '';
      // 两层同处 Grid 单元格且都参与布局；无需额外锁定高度。
      disguiseTransitionTimer = null;
    }, DISGUISE_FADE_DURATION);
  }

  container.addEventListener('mouseleave', () => {
    if (isDeepDisguiseEnabled && disguiseLines && hasPlayedInitialDisguiseTransition && !isInitialDisguiseTransitioning) {
      fadeToDisguiseContent();
    }
  });

  container.addEventListener('mouseenter', () => {
    if (isDeepDisguiseEnabled && disguiseLines && hasPlayedInitialDisguiseTransition && !isInitialDisguiseTransitioning) {
      fadeToRealContent();
    }
  });

  renderPage();

  return container;
}

// 页面上同一时间只允许存在一个阅读器实例，记录其 DOM 节点，
// 以便再次插入时直接移动该节点（而非重新创建），从而保留阅读进度。
let currentReaderElement = null;

// 用户通过"导书"导入的书籍数据，优先级高于 window.CATTLE_READER_DEFAULT_DATA 兜底数据。
// 只存在于内存中，刷新页面后会丢失。
let importedNovelData = null;

// 获取当前应使用的小说数据：优先用户导入的书，没有导入时才使用 window.CATTLE_READER_DEFAULT_DATA 兜底
function getActiveNovelData() {
  if (Array.isArray(importedNovelData) && importedNovelData.length > 0) {
    return importedNovelData;
  }
  return window.CATTLE_READER_DEFAULT_DATA;
}

function hasActiveNovelData() {
  const novelData = getActiveNovelData();
  return Array.isArray(novelData) && novelData.length > 0;
}

// 导入新书时，若阅读器正在页面中显示，则在原位置用新书重建阅读器，
// 使当前阅读内容立即切换为刚导入的书籍。
function replaceOpenReaderWithImportedNovel() {
  if (!currentReaderElement || !document.body.contains(currentReaderElement)) {
    return;
  }

  const previousReader = currentReaderElement;
  const parentNode = previousReader.parentNode;
  const nextSibling = previousReader.nextSibling;
  previousReader.cattleReaderClose();

  const reader = createReaderElement(importedNovelData, () => {
    currentReaderElement = null;
  });
  parentNode.insertBefore(reader, nextSibling);
  currentReaderElement = reader;
  cattleReaderLog('已将打开的阅读器替换为刚导入的书籍');
}

function insertReaderAtSelection() {
  if (isKmEditMode()) {
    showReaderTip('编辑模式无法插入阅读器。');
    return;
  }

  const selectedElement = getSelectedElement();
  if (!selectedElement) {
    cattleReaderLog('未找到选中元素，插入终止');
    return;
  }

  // 已存在阅读器且仍在页面中：直接把这个节点移动到新位置，
  // DOM 节点本身没有被重建，其内部闭包保存的翻页进度不受影响。
  if (currentReaderElement && document.body.contains(currentReaderElement)) {
    if (currentReaderElement.contains(selectedElement)) {
      cattleReaderLog('选区位于阅读器内部，忽略本次移动');
      return;
    }
    cattleReaderLog(
      'reader already exists, moving to new position...',
      selectedElement,
      selectedElement.parentNode,
      selectedElement.nextSibling,
    );
    selectedElement.parentNode.insertBefore(currentReaderElement, selectedElement.nextSibling);
    cattleReaderLog('reader move success');
    return;
  }

  const novelData = getActiveNovelData();
  if (!Array.isArray(novelData) || novelData.length === 0) {
    cattleReaderLog('没有可用的小说数据（导入的书和 window.CATTLE_READER_DEFAULT_DATA 均不存在或为空）');
    return;
  }

  const reader = createReaderElement(novelData, () => {
    currentReaderElement = null;
  });

  cattleReaderLog('reader inserting...', selectedElement, selectedElement.parentNode, selectedElement.nextSibling);

  selectedElement.parentNode.insertBefore(reader, selectedElement.nextSibling);
  currentReaderElement = reader;
  cattleReaderLog('reader insert success');
}

// 常见的章节标题格式，例如："第1章 xxx"、"第一章 xxx"、"第10节 xxx"、"番外 xxx" 等
const CHAPTER_TITLE_REGEX = /^(第[0-9零一二三四五六七八九十百千]+[章节回卷集部])|^(序章|楔子|番外|后记|尾声)/;

// 把单个 txt 文件的文本内容解析为章节数组：[{ title, content }]
// 按"章节标题行"切分章节；如果文本内容找不到章节标题，则整篇作为单独一章，标题用 fallbackTitle 兜底
function parseNovelContent(rawText, fallbackTitle) {
  const lines = rawText.split(/\r?\n/);

  const chapters = [];
  let currentChapter = null;

  lines.forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) {
      return;
    }
    if (CHAPTER_TITLE_REGEX.test(line)) {
      currentChapter = { title: line, contentLines: [] };
      chapters.push(currentChapter);
    } else if (currentChapter) {
      currentChapter.contentLines.push(line);
    } else {
      // 章节标题出现前的内容，归入一个默认的章节（用文件名兜底），避免丢失文本
      currentChapter = { title: fallbackTitle || '正文', contentLines: [line] };
      chapters.push(currentChapter);
    }
  });

  if (chapters.length === 0) {
    return [];
  }

  return chapters.map((chapter) => ({
    title: chapter.title,
    content: chapter.contentLines.join('\n'),
  }));
}

// 按文件名自然排序（数字部分按数值比较），避免 "2.txt" 排在 "10.txt" 之后
function compareFileNameNatural(nameA, nameB) {
  return nameA.localeCompare(nameB, 'zh-Hans-CN-u-kn-true', { numeric: true });
}

function importNovelFromFolder() {
  // input 仅用于触发系统文件夹选择框，本身 display: none 不可见、不参与布局，
  // 挂载到 document.body 上即可（只需存在于文档中以支持 click() 弹出选择框），
  // 不依赖、也不需要用户当前的文本选区。
  const input = document.createElement('input');
  input.type = 'file';
  input.webkitdirectory = true;
  input.multiple = true;
  input.style.display = 'none';

  input.addEventListener('change', async () => {
    const txtFiles = Array.from(input.files)
      .filter((file) => file.name.toLowerCase().endsWith('.txt'))
      .sort((fileA, fileB) => compareFileNameNatural(fileA.name, fileB.name));

    if (txtFiles.length === 0) {
      cattleReaderLog('所选文件夹中没有 txt 文件');
      alert('所选文件夹中没有 txt 文件');
      return;
    }

    // 一个 txt 文件对应一章：文件内部若还能识别出章节标题则按标题拆分为多章，
    // 否则整个文件作为单独一章，标题用文件名兜底
    const chapterLists = await Promise.all(
      txtFiles.map(async (file) => {
        const content = await file.text();
        const fallbackTitle = file.name.replace(/\.txt$/i, '');
        return parseNovelContent(content, fallbackTitle);
      }),
    );
    const novelData = chapterLists.flat();

    if (novelData.length === 0) {
      cattleReaderLog('导入的 txt 文件内容为空，导入终止');
      alert('导入的 txt 文件内容为空');
      return;
    }

    importedNovelData = novelData;
    replaceOpenReaderWithImportedNovel();
    cattleReaderLog(
      `导书成功，共 ${txtFiles.length} 个文件、${novelData.length} 章，已优先使用导入的书籍替代 window.CATTLE_READER_DEFAULT_DATA`,
      importedNovelData,
    );
  });

  document.body.appendChild(input);
  input.click();
  cattleReaderLog('folder input insert success');
}

const FAB_SIZE = 44;
const FAB_MARGIN = 16;
const FAB_DRAG_THRESHOLD = 5;
const MENU_ITEM_GAP = 8;
const READER_TIP_DURATION = 3000;

let readerTipElement = null;
let readerTipTimer = null;
let readerFabElement = null;
let lastKmEditMode = false;

function isKmEditMode() {
  return window.location.hostname.includes('km.sankuai.com') && !!document.querySelector('.doc-mode-switch-container.edit');
}

function showReaderTip(message) {
  if (!readerTipElement || !readerFabElement) {
    return;
  }

  if (readerTipTimer !== null) {
    clearTimeout(readerTipTimer);
  }

  readerTipElement.textContent = message;
  readerTipElement.classList.add('cattle-reader-fab-tip-visible');

  const fabRect = readerFabElement.getBoundingClientRect();
  const tipRect = readerTipElement.getBoundingClientRect();
  const expandToLeft = window.innerWidth - fabRect.right < tipRect.width + MENU_ITEM_GAP;
  const left = expandToLeft
    ? fabRect.left - tipRect.width - MENU_ITEM_GAP
    : fabRect.right + MENU_ITEM_GAP;
  const top = Math.min(
    Math.max(fabRect.top + fabRect.height / 2 - tipRect.height / 2, FAB_MARGIN),
    window.innerHeight - tipRect.height - FAB_MARGIN,
  );

  readerTipElement.style.left = `${Math.min(Math.max(left, FAB_MARGIN), window.innerWidth - tipRect.width - FAB_MARGIN)}px`;
  readerTipElement.style.top = `${top}px`;
  readerTipTimer = window.setTimeout(() => {
    readerTipElement.classList.remove('cattle-reader-fab-tip-visible');
    readerTipTimer = null;
  }, READER_TIP_DURATION);
}

function watchKmEditMode() {
  lastKmEditMode = isKmEditMode();
  const observer = new MutationObserver(() => {
    const isEditing = isKmEditMode();
    if (isEditing === lastKmEditMode) {
      return;
    }
    lastKmEditMode = isEditing;
    if (isEditing && currentReaderElement && document.body.contains(currentReaderElement)) {
      currentReaderElement.cattleReaderClose?.();
      showReaderTip('进入编辑模式，自动为您关闭阅读器。');
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
}

function addKmSelectionReaderButton() {
  document.querySelectorAll('.pk-selection-menu-container .button-container').forEach((buttonContainer) => {
    if (!buttonContainer.children.length) {
      return;
    }

    let button = buttonContainer.querySelector('[data-cattle-reader-selection-button]');
    let divider = buttonContainer.querySelector('[data-cattle-reader-selection-divider]');
    if (!button || !divider) {
      divider = document.createElement('div');
      divider.className = 'divider-seg-line';
      divider.dataset.cattleReaderSelectionDivider = 'true';

      button = document.createElement('span');
      button.className = 'pk-toolbar-word-count button-item';
      button.textContent = '插入阅读器';
      button.style.cursor = 'pointer';
      button.dataset.cattleReaderSelectionButton = 'true';
      button.addEventListener('click', () => insertReaderAtSelection());
    }

    // 仅在入口不位于末尾时移动它；无条件 append 已在末尾的节点会再次触发 MutationObserver。
    const children = Array.from(buttonContainer.children);
    const isAtEnd = children.at(-2) === divider && children.at(-1) === button;
    if (!isAtEnd) {
      buttonContainer.append(divider, button);
    }
  });
}

let isKmSelectionMenuWatching = false;

function watchKmSelectionMenu() {
  if (isKmSelectionMenuWatching) {
    return;
  }

  isKmSelectionMenuWatching = true;
  addKmSelectionReaderButton();
  new MutationObserver(addKmSelectionReaderButton).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}

function createFabStyleSheet() {
  if (document.getElementById('cattle-reader-fab-style')) {
    return;
  }
  const style = document.createElement('style');
  style.id = 'cattle-reader-fab-style';
  style.textContent = `
    .cattle-reader-fab {
      position: fixed;
      width: ${FAB_SIZE}px;
      height: ${FAB_SIZE}px;
      border-radius: 50%;
      background: #ffffff;
      color: #333333;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      font-weight: bold;
      user-select: none;
      cursor: grab;
      z-index: 2147483647;
      opacity: 0.35;
      transition: opacity 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease;
    }
    .cattle-reader-fab:hover {
      opacity: 1;
    }
    .cattle-reader-fab:active {
      cursor: grabbing;
      opacity: 1;
    }
    .cattle-reader-fab.cattle-reader-fab-dragging {
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
      transform: scale(1.05);
      opacity: 1;
    }
    .cattle-reader-fab.cattle-reader-fab-menu-active {
      opacity: 1;
    }
    .cattle-reader-fab-menu {
      position: fixed;
      display: flex;
      flex-direction: column;
      gap: 6px;
      background: #ffffff;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);
      padding: 6px;
      z-index: 2147483647;
      visibility: hidden;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.12s ease;
    }
    .cattle-reader-fab-menu.cattle-reader-fab-menu-open {
      visibility: visible;
      opacity: 1;
      pointer-events: auto;
    }
    .cattle-reader-fab-menu-item {
      border: none;
      background: transparent;
      color: #333333;
      font-size: 14px;
      line-height: 1;
      white-space: nowrap;
      text-align: center;
      padding: 8px 14px;
      border-radius: 6px;
      cursor: pointer;
    }
    .cattle-reader-fab-menu-item:hover {
      background: #f0f0f0;
    }
    .cattle-reader-fab-menu-item-disabled {
      color: #bbbbbb;
      cursor: not-allowed;
    }
    .cattle-reader-fab-menu-item-disabled:hover {
      background: transparent;
    }
    .cattle-reader-fab-tip {
      position: fixed;
      max-width: 220px;
      padding: 9px 12px;
      border-radius: 6px;
      background: #222222;
      color: #ffffff;
      font-size: 13px;
      line-height: 1.4;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
      z-index: 2147483647;
      pointer-events: none;
      visibility: hidden;
      opacity: 0;
      transition: opacity 0.18s ease;
    }
    .cattle-reader-fab-tip-visible {
      visibility: visible;
      opacity: 1;
    }
  `;
  document.head.appendChild(style);
}

function clampFabPosition(left, top) {
  const maxLeft = window.innerWidth - FAB_SIZE - FAB_MARGIN;
  const maxTop = window.innerHeight - FAB_SIZE - FAB_MARGIN;
  return {
    left: Math.min(Math.max(left, FAB_MARGIN), Math.max(maxLeft, FAB_MARGIN)),
    top: Math.min(Math.max(top, FAB_MARGIN), Math.max(maxTop, FAB_MARGIN)),
  };
}

function insertMenuIntoPage() {
  const existingFab = document.querySelector('.cattle-reader-fab');
  if (existingFab) {
    cattleReaderLog('悬浮按钮已存在，跳过重复插入');
    return existingFab;
  }

  createFabStyleSheet();

  const fab = document.createElement('div');
  fab.className = 'cattle-reader-fab';
  fab.textContent = '牛';

  const menu = document.createElement('div');
  menu.className = 'cattle-reader-fab-menu';

  const tip = document.createElement('div');
  tip.className = 'cattle-reader-fab-tip';
  tip.setAttribute('role', 'status');
  tip.setAttribute('aria-live', 'polite');
  readerTipElement = tip;
  readerFabElement = fab;

  const menuActions = [
    { key: 'import', text: '导书', handler: () => importNovelFromFolder() },
    {
      key: 'insert',
      text: '插入',
      handler: () => insertReaderAtSelection(),
      disabledTip: () =>
        hasActiveNovelData() ? '未选择文本。阅读器将在选择文本段落后插入。' : '无阅读内容。',
      isDisabled: () => !hasTextSelection() || !hasActiveNovelData(),
    },
    {
      key: 'deepDisguise',
      text: '开启深度伪装',
      getText: () => {
        const deepDisguise = currentReaderElement?.cattleReaderDeepDisguise;
        if (deepDisguise?.isGenerating()) {
          return '深度伪装生成中...';
        }
        return deepDisguise?.isEnabled() ? '关闭深度伪装' : '开启深度伪装';
      },
      handler: () => {
        const deepDisguise = currentReaderElement?.cattleReaderDeepDisguise;
        if (deepDisguise) {
          deepDisguise.toggle().catch((error) => cattleReaderLog('深度伪装生成失败', error));
        }
      },
      disabledTip: '请先插入阅读器后再开启深度伪装。',
      isDisabled: () => !currentReaderElement?.cattleReaderDeepDisguise || currentReaderElement.cattleReaderDeepDisguise.isGenerating(),
    },
    {
      key: 'closeReader',
      text: '关闭阅读器',
      handler: () => currentReaderElement?.cattleReaderClose?.(),
      disabledTip: '当前没有打开的阅读器。',
      isDisabled: () =>
        !currentReaderElement?.cattleReaderClose || !document.body.contains(currentReaderElement),
    },
    {
      key: 'closeFab',
      text: '关闭悬浮按钮',
      handler: () => closeFab(),
    },
  ];

  const menuItemElements = {};

  menuActions.forEach(({ key, text, getText, handler, isDisabled, disabledTip }) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'cattle-reader-fab-menu-item';
    item.textContent = getText ? getText() : text;
    item.addEventListener('click', (event) => {
      event.stopPropagation();
      if (isDisabled && isDisabled()) {
        alert(typeof disabledTip === 'function' ? disabledTip() : disabledTip);
        return;
      }
      closeMenu();
      handler();
    });
    menu.appendChild(item);
    menuItemElements[key] = item;
  });

  // 每次展开菜单、或阅读器深度伪装状态变化时，刷新菜单文案和禁用态。
  function refreshMenuItemsState() {
    menuActions.forEach(({ key, text, getText, isDisabled }) => {
      const item = menuItemElements[key];
      if (!item) {
        return;
      }
      item.textContent = getText ? getText() : text;
      const disabled = !!isDisabled && isDisabled();
      item.classList.toggle('cattle-reader-fab-menu-item-disabled', disabled);
    });
  }

  document.addEventListener('cattle-reader-deep-disguise-change', refreshMenuItemsState);

  document.body.appendChild(menu);
  document.body.appendChild(tip);
  document.body.appendChild(fab);

  // 初始位置：屏幕右下角
  const initialPosition = clampFabPosition(
    window.innerWidth - FAB_SIZE - FAB_MARGIN,
    window.innerHeight - FAB_SIZE - FAB_MARGIN,
  );
  fab.style.left = `${initialPosition.left}px`;
  fab.style.top = `${initialPosition.top}px`;

  let isMenuOpen = false;

  function openMenu() {
    refreshMenuItemsState();

    const fabRect = fab.getBoundingClientRect();
    // 先展示菜单以获取真实尺寸，再定位
    menu.classList.add('cattle-reader-fab-menu-open');
    // 菜单展开期间按钮保持不透明，避免鼠标移到菜单项上时按钮又变淡
    fab.classList.add('cattle-reader-fab-menu-active');
    const menuRect = menu.getBoundingClientRect();

    const spaceOnRight = window.innerWidth - fabRect.right;
    const expandToLeft = spaceOnRight < menuRect.width + MENU_ITEM_GAP;

    const left = expandToLeft
      ? fabRect.left - menuRect.width - MENU_ITEM_GAP
      : fabRect.right + MENU_ITEM_GAP;

    let top = fabRect.top + fabRect.height / 2 - menuRect.height / 2;
    top = Math.min(
      Math.max(top, FAB_MARGIN),
      window.innerHeight - menuRect.height - FAB_MARGIN,
    );

    menu.style.left = `${Math.min(Math.max(left, FAB_MARGIN), window.innerWidth - menuRect.width - FAB_MARGIN)}px`;
    menu.style.top = `${top}px`;

    isMenuOpen = true;
  }

  function closeMenu() {
    menu.classList.remove('cattle-reader-fab-menu-open');
    fab.classList.remove('cattle-reader-fab-menu-active');
    isMenuOpen = false;
  }

  function toggleMenu() {
    if (isMenuOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  }

  function handleDocumentClick(event) {
    if (isMenuOpen && event.target !== fab && !menu.contains(event.target)) {
      closeMenu();
    }
  }

  function closeFab() {
    if (readerTipTimer) {
      window.clearTimeout(readerTipTimer);
      readerTipTimer = null;
    }
    document.removeEventListener('cattle-reader-deep-disguise-change', refreshMenuItemsState);
    document.removeEventListener('click', handleDocumentClick);
    window.removeEventListener('resize', handleWindowResize);
    menu.remove();
    tip.remove();
    fab.remove();
    if (readerTipElement === tip) {
      readerTipElement = null;
    }
    if (readerFabElement === fab) {
      readerFabElement = null;
    }
    cattleReaderLog('悬浮按钮已关闭');
  }

  document.addEventListener('click', handleDocumentClick);

  // 拖拽逻辑：区分点击与拖拽，超过阈值视为拖拽，松手后不触发点击展开菜单
  let isDragging = false;
  let didDrag = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let fabStartLeft = 0;
  let fabStartTop = 0;

  function onPointerDown(event) {
    // 阻止默认行为，避免点击悬浮按钮时清除页面上已有的文本选区
    // （"插入"菜单项依赖选区状态判断是否可用）
    if (!event.touches) {
      event.preventDefault();
    }
    const point = event.touches ? event.touches[0] : event;
    isDragging = true;
    didDrag = false;
    dragStartX = point.clientX;
    dragStartY = point.clientY;
    const rect = fab.getBoundingClientRect();
    fabStartLeft = rect.left;
    fabStartTop = rect.top;

    document.addEventListener('mousemove', onPointerMove);
    document.addEventListener('mouseup', onPointerUp);
    document.addEventListener('touchmove', onPointerMove, { passive: false });
    document.addEventListener('touchend', onPointerUp);
  }

  function onPointerMove(event) {
    if (!isDragging) {
      return;
    }
    const point = event.touches ? event.touches[0] : event;
    const deltaX = point.clientX - dragStartX;
    const deltaY = point.clientY - dragStartY;

    if (!didDrag && Math.hypot(deltaX, deltaY) > FAB_DRAG_THRESHOLD) {
      didDrag = true;
      fab.classList.add('cattle-reader-fab-dragging');
      if (isMenuOpen) {
        closeMenu();
      }
    }

    if (didDrag) {
      event.preventDefault();
      const { left, top } = clampFabPosition(fabStartLeft + deltaX, fabStartTop + deltaY);
      fab.style.left = `${left}px`;
      fab.style.top = `${top}px`;
    }
  }

  function onPointerUp() {
    isDragging = false;
    fab.classList.remove('cattle-reader-fab-dragging');

    document.removeEventListener('mousemove', onPointerMove);
    document.removeEventListener('mouseup', onPointerUp);
    document.removeEventListener('touchmove', onPointerMove);
    document.removeEventListener('touchend', onPointerUp);

    if (!didDrag) {
      toggleMenu();
    }
  }

  fab.addEventListener('mousedown', onPointerDown);
  fab.addEventListener('touchstart', onPointerDown, { passive: true });

  // 窗口尺寸变化时，确保按钮仍在可视区域内
  function handleWindowResize() {
    const rect = fab.getBoundingClientRect();
    const { left, top } = clampFabPosition(rect.left, rect.top);
    fab.style.left = `${left}px`;
    fab.style.top = `${top}px`;
    if (isMenuOpen) {
      closeMenu();
    }
  }

  window.addEventListener('resize', handleWindowResize);

  cattleReaderLog('悬浮按钮菜单插入成功');

  return fab;
}

function initializeKmFeatures() {
  if (!window.location.hostname.includes('km.sankuai.com')) {
    return;
  }

  watchKmEditMode();
  watchKmSelectionMenu();
}

function addFeishuSelectionReaderButton() {
  document.querySelectorAll('.docx-menu-container').forEach((menuContainer) => {
    let button = menuContainer.querySelector('[data-cattle-reader-feishu-selection-button]');
    let divider = menuContainer.querySelector('[data-cattle-reader-feishu-selection-divider]');
    if (!button || !divider) {
      divider = document.createElement('div');
      divider.className = 'menu-divider-item override-full-height';
      divider.dataset.cattleReaderFeishuSelectionDivider = 'true';

      button = document.createElement('div');
      button.className = 'panel-menu-item';
      button.dataset.name = 'explain';
      button.dataset.cattleReaderFeishuSelectionButton = 'true';
      button.innerHTML = `
        <div class="menu-item-content">
          <div class="menu-item-main-box-wrapper">
            <div class="menu-item-main-box">
              <div class="menu-text">插入阅读器</div>
            </div>
          </div>
        </div>
      `;
      button.addEventListener('click', () => insertReaderAtSelection());
    }

    const children = Array.from(menuContainer.children);
    const isAtEnd = children.at(-2) === divider && children.at(-1) === button;
    if (!isAtEnd) {
      menuContainer.append(divider, button);
    }
  });
}

let isFeishuSelectionMenuWatching = false;

function watchFeishuSelectionMenu() {
  if (isFeishuSelectionMenuWatching) {
    return;
  }

  isFeishuSelectionMenuWatching = true;
  addFeishuSelectionReaderButton();
  new MutationObserver(addFeishuSelectionReaderButton).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}

function initializeFeishuFeatures() {
  if (!window.location.hostname.includes('.feishu.cn')) {
    return;
  }

  watchFeishuSelectionMenu();
}

insertMenuIntoPage();
initializeKmFeatures();
initializeFeishuFeatures();

cattleReaderLog('js insert success', getActiveNovelData());