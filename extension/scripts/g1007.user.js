(async function __tabEvaluateScriptBridge() {
  const __tabScriptArgs = null;
  const __tabOriginalFunction = (
    async function run(args) {
      // ═══════════════════════════════════════════════════════════
      // sprint — 页面快照生成器（生产版 v2）
      // 功能：将当前页面完整快照为离线 HTML 文件并触发下载
      // ═══════════════════════════════════════════════════════════
    
      const opts = Object.assign({
        filename: '',          // 自定义文件名（空则自动取页面标题）
        includeMeta: true,     // 是否在 HTML 尾部包含元信息注释
      }, args || {});
    
      // ═══════════════════════════════════════════════════════════
      // 工具函数：HTML 属性转义 & CSS 值转义
      // ═══════════════════════════════════════════════════════════
      function escapeHtmlAttr(str) {
        return String(str)
          .replace(/&/g, '&amp;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
      }
    
      function escapeCssValue(str) {
        return String(str)
          .replace(/\\/g, '\\\\')
          .replace(/"/g, '\\"')
          .replace(/\n/g, '\\a ');
      }
    
      // ═══════════════════════════════════════════════════════════
      // 0. 白名单
      // ═══════════════════════════════════════════════════════════
      const PROP_WHITELIST = new Set([
        'display', 'position', 'top', 'right', 'bottom', 'left',
        'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
        'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
        'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
        'box-sizing',
        'flex', 'flex-direction', 'flex-wrap', 'flex-grow', 'flex-shrink', 'flex-basis',
        'justify-content', 'align-items', 'align-content', 'align-self', 'order',
        'grid-template-columns', 'grid-template-rows', 'grid-column', 'grid-row',
        'gap', 'row-gap', 'column-gap', 'place-items', 'place-content',
        'border', 'border-top', 'border-right', 'border-bottom', 'border-left',
        'border-width', 'border-style', 'border-color', 'border-radius',
        'box-shadow', 'opacity', 'visibility', 'overflow', 'overflow-x', 'overflow-y',
        'z-index', 'outline', 'outline-offset',
        'font-family', 'font-size', 'font-weight', 'font-style', 'font-variant',
        'text-decoration', 'text-align', 'text-align-last',
        'line-height', 'letter-spacing', 'word-spacing',
        'white-space', 'text-overflow', 'text-transform', 'text-indent',
        'word-break', 'overflow-wrap', 'hyphens',
        'color', 'text-shadow', 'vertical-align',
        'background', 'background-color', 'background-image',
        'background-size', 'background-position', 'background-repeat',
        'background-origin', 'background-clip', 'background-attachment',
        'transform', 'transform-origin', 'transition', 'animation',
        'filter', 'backdrop-filter', 'mix-blend-mode',
        'cursor', 'pointer-events', 'user-select',
        'object-fit', 'object-position', 'aspect-ratio',
        'clip-path', 'mask', 'mask-image',
      ]);
    
      // ═══════════════════════════════════════════════════════════
      // 1. 收集同域样式表规则
      // ═══════════════════════════════════════════════════════════
      let collectedCSS = '';
      const crossOriginURLs = [];
      const warnings = [];
    
      try {
        for (const sheet of document.styleSheets) {
          try {
            if (!sheet.cssRules) {
              crossOriginURLs.push(sheet.href || '(inline stylesheet)');
              continue;
            }
            for (const rule of sheet.cssRules) {
              if (rule.cssText) collectedCSS += rule.cssText + '\n';
            }
          } catch (e) {
            if (e.name === 'SecurityError') {
              crossOriginURLs.push(sheet.href || '(inline cross-origin)');
            } else {
              warnings.push('样式表读取异常: ' + (sheet.href || 'inline') + ' — ' + e.message);
            }
          }
        }
      } catch (e) {
        warnings.push('样式表遍历失败: ' + e.message);
      }
    
      // ═══════════════════════════════════════════════════════════
      // 2. 克隆 DOM，内联计算样式 & 提取伪元素
      // ═══════════════════════════════════════════════════════════
      const clone = document.documentElement.cloneNode(true);
      const liveEls = document.querySelectorAll('body *');
      const cloneEls = clone.querySelectorAll('body *');
      const pseudoBlocks = [];
    
      for (let i = 0; i < liveEls.length; i++) {
        const liveEl = liveEls[i];
        const cloneEl = cloneEls[i];
        if (!cloneEl) continue;
    
        let computed;
        try {
          computed = getComputedStyle(liveEl);
        } catch (e) {
          continue;
        }
    
        for (const prop of PROP_WHITELIST) {
          try {
            const val = computed.getPropertyValue(prop);
            if (val !== '') {
              cloneEl.style.setProperty(prop, val);
            }
          } catch (e) { /* skip */ }
        }
    
        // 伪元素处理（带转义保护）
        for (const pseudo of ['::before', '::after']) {
          let pcomputed;
          try {
            pcomputed = getComputedStyle(liveEl, pseudo);
          } catch (e) {
            continue;
          }
    
          const ct = pcomputed.content;
          if (ct === 'normal' || ct === 'none' || ct === '') continue;
    
          const attrName = pseudo === '::before' ? 'data-before-id' : 'data-after-id';
          const id = pseudoBlocks.length;
    
          let ruleBlock = `[${attrName}="${id}"] {\n`;
          // ✅ 修复 A-2: CSS 转义防止注入
          ruleBlock += `  content: ${escapeCssValue(ct)};\n`;
    
          for (const prop of PROP_WHITELIST) {
            try {
              const val = pcomputed.getPropertyValue(prop);
              if (val !== '') {
                // ✅ 修复 A-3: prop 和 val 正确插入
                ruleBlock += `  ${prop}: ${escapeCssValue(val)};\n`;
              }
            } catch (e) { /* skip */ }
          }
          ruleBlock += '}';
          pseudoBlocks.push(ruleBlock);
    
          cloneEl.setAttribute(attrName, String(id));
        }
      }
    
      // body 自身样式（带 HTML 转义）
      const bodyClone = clone.querySelector('body');
      let bodyStyleAttr = '';
      if (bodyClone) {
        try {
          const bodyComputed = getComputedStyle(document.body);
          for (const prop of PROP_WHITELIST) {
            const val = bodyComputed.getPropertyValue(prop);
            if (val !== '') {
              bodyClone.style.setProperty(prop, val);
            }
          }
          bodyStyleAttr = bodyClone.getAttribute('style') || '';
        } catch (e) {
          warnings.push('body 样式提取失败: ' + e.message);
        }
      }
    
      // ═══════════════════════════════════════════════════════════
      // 3. 移除冗余标签（保留 stylesheet link）
      // ═══════════════════════════════════════════════════════════
      try {
        clone.querySelectorAll('script, link').forEach(el => {
          if (el.tagName === 'LINK' && el.rel && el.rel.toLowerCase() !== 'stylesheet') return;
          el.remove();
        });
      } catch (e) {
        warnings.push('清理冗余标签时出错: ' + e.message);
      }
    
      // ═══════════════════════════════════════════════════════════
      // 4. 组装输出
      // ═══════════════════════════════════════════════════════════
      const title = document.title || 'snapshot';
      const ruleCount = collectedCSS.split('\n').filter(l => l.trim()).length;
    
      const safeFilename = (opts.filename || title).replace(/[\\/:*?"<>|]/g, '_');
    
      const crossOriginComment = crossOriginURLs.length
        ? '\n<!-- ⚠ 以下 ' + crossOriginURLs.length + ' 个跨域样式表无法提取原始规则，已用 getComputedStyle 兜底：\n'
          + crossOriginURLs.map(u => '     ' + u).join('\n')
          + '\n-->\n'
        : '';
    
      const pseudoCSS = pseudoBlocks.join('\n\n');
    
      // ✅ 修复 A-1: body style 属性做 HTML 转义
      const bodyOpenTag = bodyStyleAttr
        ? '<body style="' + escapeHtmlAttr(bodyStyleAttr) + '">'
        : '<body>';
      const bodyInnerHTML = bodyClone ? bodyClone.innerHTML : '';
    
      const metaComments = opts.includeMeta ? [
        '<!-- 原页面 URL: ' + location.href + ' -->',
        '<!-- 生成时间: ' + new Date().toISOString() + ' -->',
        '<!-- 同域规则数: ' + ruleCount + ' 条 -->',
        '<!-- 跨域样式表: ' + crossOriginURLs.length + ' 个已兜底 -->',
        '<!-- 伪元素: ' + pseudoBlocks.length + ' 个 -->',
        warnings.length ? '<!-- 警告: ' + warnings.join('; ') + ' -->' : '',
      ].filter(Boolean).join('\n') : '';
    
      const html = [
        '<!DOCTYPE html>',
        '<html lang="zh-CN">',
        '<head>',
        '<meta charset="UTF-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
        '<title>' + escapeHtmlAttr(title) + ' (snapshot)</title>',
        crossOriginComment,
        '<style>',
        '/* ═══ 同域样式表规则 ═══ */',
        collectedCSS,
        '',
        '/* ═══ 伪元素还原 ═══ */',
        pseudoCSS,
        '</style>',
        '</head>',
        bodyOpenTag,
        bodyInnerHTML,
        '</body>',
        metaComments,
        '</html>',
      ].join('\n');
    
      // ═══════════════════════════════════════════════════════════
      // 5. 触发下载
      // ═══════════════════════════════════════════════════════════
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = safeFilename + '_snapshot.html';
      a.click();
      URL.revokeObjectURL(a.href);
    
      console.log(
        '%c✅ 快照完成 %c| 同域规则 ' + ruleCount + ' 条 | 跨域样式表 '
        + crossOriginURLs.length + ' 个已兜底 | 伪元素 ' + pseudoBlocks.length + ' 个'
        + (warnings.length ? ' | ⚠ 警告 ' + warnings.length + ' 条' : ''),
        'color: #4caf50; font-weight: bold', 'color: inherit'
      );
    
      return {
        ok: true,
        summary: '页面快照已完成并触发下载',
        fileName: safeFilename + '_snapshot.html',
        ruleCount: ruleCount,
        crossOriginCount: crossOriginURLs.length,
        pseudoElementCount: pseudoBlocks.length,
        warnings: warnings,
      };
    }
  );
  if (typeof __tabOriginalFunction !== "function") {
    throw new Error("evaluate_script source must evaluate to a function");
  }
  return await __tabOriginalFunction();
})();