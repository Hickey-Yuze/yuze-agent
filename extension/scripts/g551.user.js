(function() {
  'use strict';

  // 防止重复执行
  if (window.__VERB_BOLD_APPLIED__) return;
  window.__VERB_BOLD_APPLIED__ = true;

  // 高频动词词典（可扩展）
  const VERB_DICT = new Set([
    // 常用动词
    '是', '有', '做', '去', '来', '看', '说', '想', '要', '能', '会', '得',
    '吃', '喝', '玩', '用', '买', '卖', '走', '跑', '坐', '站', '睡', '醒',
    '读', '写', '听', '唱', '跳', '飞', '游', '开', '关', '打', '放', '拿',
    '给', '送', '借', '还', '找', '找', '等', '问', '答', '教', '学', '考',
    '工作', '学习', '生活', '运动', '休息', '旅行', '吃饭', '睡觉', '起床',
    '开始', '结束', '继续', '停止', '完成', '进行', '发展', '变化', '提高',
    '增加', '减少', '扩大', '缩小', '提高', '降低', '上升', '下降', '前进',
    '后退', '进入', '退出', '到达', '离开', '返回', '出发', '经过', '穿过',
    '选择', '决定', '判断', '认为', '相信', '希望', '期待', '担心', '害怕',
    '喜欢', '爱', '恨', '讨厌', '羡慕', '嫉妒', '同情', '理解', '原谅',
    '帮助', '支持', '反对', '批评', '表扬', '鼓励', '安慰', '照顾', '关心',
    '创建', '建立', '设置', '配置', '修改', '删除', '添加', '移除', '更新',
    '发布', '下载', '上传', '保存', '加载', '运行', '执行', '调试', '测试',
    '分析', '研究', '调查', '探索', '发现', '发明', '创新', '改进', '优化',
    '管理', '组织', '领导', '指挥', '协调', '沟通', '交流', '合作', '竞争',
    '生产', '制造', '加工', '运输', '销售', '购买', '消费', '使用', '回收',
    '保护', '维护', '修理', '建设', '破坏', '恢复', '重建', '改造', '装修',
    '教育', '培养', '训练', '锻炼', '提高', '改善', '促进', '推动', '引导',
    '解决', '处理', '应对', '面对', '克服', '战胜', '避免', '预防', '消除',
    '展示', '显示', '呈现', '表现', '表达', '说明', '解释', '描述', '介绍',
    '点击', '浏览', '搜索', '查询', '查看', '阅读', '编辑', '输入', '输出',
    '登录', '注册', '登录', '退出', '订阅', '关注', '分享', '转发', '评论',
    '发布', '发送', '接收', '传输', '同步', '备份', '恢复', '加密', '解密',
    // 更多常用动词
    '走', '跑', '跳', '爬', '飞', '游', '坐', '站', '躺', '蹲', '跪',
    '笑', '哭', '叫', '喊', '说', '讲', '谈', '问', '答', '唱',
    '看', '见', '听', '闻', '摸', '尝', '感觉', '觉得', '认为',
    '拿', '放', '提', '抬', '抱', '背', '扛', '推', '拉', '拖',
    '开', '关', '锁', '开', '收', '展开', '折叠', '打开', '关闭',
    '吃', '喝', '咬', '嚼', '吞', '吐', '吸', '吹', '喷', '洒',
    '穿', '戴', '脱', '换', '洗', '晾', '晒', '熨', '缝', '补',
    '住', '住', '睡', '醒', '起', '躺', '休息', '工作', '学习',
    '买', '卖', '租', '借', '还', '送', '给', '收', '付', '赚',
    '写', '画', '刻', '印', '抄', '录', '记', '忘', '回忆', '想',
    '爱', '恨', '怕', '喜', '怒', '哀', '乐', '愁', '忧', '虑',
    '帮', '助', '救', '护', '管', '理', '治', '办', '做', '作',
    '成', '败', '胜', '负', '赢', '输', '得', '失', '存', '亡',
    '生', '死', '杀', '救', '伤', '病', '医', '治', '养', '育',
    '走', '进', '出', '来', '去', '回', '过', '到', '离', '远',
    '上', '下', '左', '右', '前', '后', '里', '外', '高', '低',
    // 新闻标题常见动词
    '召开', '举行', '宣布', '发布', '推出', '实施', '执行', '落实', '推进',
    '突破', '创新', '发展', '增长', '下降', '上升', '扩大', '提升', '优化',
    '加强', '强化', '完善', '健全', '构建', '打造', '培育', '扶持', '促进',
    '聚焦', '关注', '重视', '强调', '指出', '提出', '要求', '部署', '安排',
    '获', '迎', '访', '抵', '启', '停', '启程', '抵达', '出访', '访问',
    '签署', '签订', '达成', '取得', '实现', '完成', '结束', '开始', '启动'
  ]);

  // 动词后缀（帮助识别更多动词）
  const VERB_SUFFIXES = ['了', '着', '过', '起来', '下去', '出来', '进来', '过来'];

  // 排除的标签（不处理这些标签内的文本）
  const EXCLUDED_TAGS = new Set([
    'SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'OBJECT', 'EMBED',
    'TEXTAREA', 'INPUT', 'SELECT', 'CODE', 'PRE', 'KBD', 'SAMP'
  ]);

  // 已处理的文本节点标记
  const PROCESSED_CLASS = '__verb-bold-processed__';

  /**
   * 检查一个词是否可能是动词
   */
  function isVerb(word) {
    if (VERB_DICT.has(word)) return true;

    // 检查带后缀的动词
    for (const suffix of VERB_SUFFIXES) {
      if (word.endsWith(suffix) && word.length > suffix.length) {
        const baseWord = word.slice(0, -suffix.length);
        if (VERB_DICT.has(baseWord)) return true;
      }
    }

    return false;
  }

  /**
   * 对文本节点进行分词并标记动词
   */
  function processTextNode(textNode) {
    if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return;
    if (!textNode.textContent || textNode.textContent.trim().length === 0) return;

    const text = textNode.textContent;
    const parent = textNode.parentNode;
    if (!parent || parent.classList && parent.classList.contains(PROCESSED_CLASS)) return;

    // 检查父元素是否在排除列表中
    let el = parent;
    while (el && el !== document.body) {
      if (EXCLUDED_TAGS.has(el.tagName)) return;
      el = el.parentNode;
    }

    // 简单分词：按字符扫描，尝试匹配动词
    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    let hasMatch = false;

    // 使用滑动窗口匹配动词（1-4个字符）
    for (let len = 4; len >= 1; len--) {
      for (let i = 0; i <= text.length - len; i++) {
        const word = text.substring(i, i + len);
        if (isVerb(word)) {
          hasMatch = true;
        }
      }
    }

    if (!hasMatch) return;

    // 重新处理文本，标记所有动词
    let i = 0;
    while (i < text.length) {
      let matched = false;

      // 从长到短匹配
      for (let len = 4; len >= 1; len--) {
        if (i + len > text.length) continue;
        const word = text.substring(i, i + len);
        
        if (isVerb(word)) {
          // 添加前面的普通文本
          if (i > lastIndex) {
            fragment.appendChild(document.createTextNode(text.substring(lastIndex, i)));
          }
          
          // 添加加粗的动词
          const bold = document.createElement('b');
          bold.style.fontWeight = 'bold';
          bold.textContent = word;
          fragment.appendChild(bold);
          
          lastIndex = i + len;
          i += len;
          matched = true;
          break;
        }
      }

      if (!matched) {
        i++;
      }
    }

    // 添加剩余文本
    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
    }

    // 替换原节点
    if (fragment.childNodes.length > 0) {
      parent.replaceChild(fragment, textNode);
    }
  }

  /**
   * 遍历元素内的所有文本节点
   */
  function processElement(element) {
    if (!element) return;

    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          const parent = node.parentNode;
          if (!parent) return NodeFilter.FILTER_REJECT;
          
          // 检查是否在排除的标签中
          let el = parent;
          while (el && el !== document.body) {
            if (EXCLUDED_TAGS.has(el.tagName)) return NodeFilter.FILTER_REJECT;
            if (el.classList && el.classList.contains(PROCESSED_CLASS)) return NodeFilter.FILTER_REJECT;
            el = el.parentNode;
          }
          
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const textNodes = [];
    while (walker.nextNode()) {
      textNodes.push(walker.currentNode);
    }

    // 处理所有文本节点
    textNodes.forEach(processTextNode);
  }

  /**
   * 使用 MutationObserver 监听 DOM 变化
   */
  function observeDOMChanges() {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // 延迟处理，确保内容完全加载
              requestIdleCallback(() => {
                processElement(node);
              }, { timeout: 100 });
            } else if (node.nodeType === Node.TEXT_NODE) {
              processTextNode(node);
            }
          });
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * 主执行函数
   */
  function execute() {
    console.log('[动词加粗] 开始处理页面...');

    // 处理现有内容
    processElement(document.body);

    // 监听 DOM 变化
    observeDOMChanges();

    console.log('[动词加粗] 处理完成，已启动动态监听');
  }

  // 确保 DOM 加载完成后执行
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', execute);
  } else {
    execute();
  }

  // 对于 SPA 应用，监听路由变化后重新处理
  let lastUrl = location.href;
  const urlObserver = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      // 延迟处理新页面内容
      setTimeout(() => processElement(document.body), 500);
    }
  });
  urlObserver.observe(document, { subtree: true, childList: true });

})();