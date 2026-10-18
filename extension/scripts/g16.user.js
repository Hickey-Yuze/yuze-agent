(async function __tabEvaluateScriptBridge() {
  const __tabScriptArgs = null;
  const __tabOriginalFunction = (
    async function run(args) {
      // ============================================================
      //  B站视频 + 评论区分析 → 生成 Word (.docx) 文档并命名“日本人去死”下载
      //  运行环境：在目标B站视频页面中通过 evaluate_script 注入
      // ============================================================
    
      // ---------- 0. 工具函数 ----------
      function q(sel) { return document.querySelector(sel); }
      function qq(sel) { return [...document.querySelectorAll(sel)]; }
      function txt(el) { return el ? el.textContent.trim() : ''; }
    
      // ---------- 1. 抓取视频基本信息 ----------
      const videoInfo = {
        title:    txt(q('h1.video-title, .video-title-container h1, [class*="video-title"]'))
               || txt(q('#v_desc .title, .title-text'))
               || document.title.replace(/_哔哩哔哩_bilibili$/, '').trim(),
        views:    txt(q('.view.item span, [class*="view-count"], .video-data .view')),
        likes:    txt(q('.like-info, [class*="like-btn"] .count, .video-like-info')),
        coins:    txt(q('.coin-info, [class*="coin-btn"] .count')),
        favorites:txt(q('.fav-info, [class*="fav-btn"] .count, .video-fav-info')),
        shares:   txt(q('.share-count, [class*="share-btn"] .count')),
        pubdate:  txt(q('.pubdate-ip-text, .video-desc-item .pubdate, [class*="pubdate"]')),
        tags:     qq('a.tag-link, .tag-container a, [class*="tag"] a').map(e => txt(e)).filter(Boolean).slice(0, 8).join(' / '),
        desc:     txt(q('#v_desc .desc-info-text, .video-desc-content, [class*="desc-text"]')),
        upName:   txt(q('.up-name, [class*="up-author"] .name, .up-info-container .name')),
        upFans:   txt(q('.fans-num, [class*="fan"] .num, .up-info-container [class*="fans"]')),
        commentCount: txt(q('#comment-module .total-reply, .comment-header-count, [class*="comment-count"]')),
      };
    
      // fallback: 从页面可读文本中补全关键字段
      const pageText = document.body.innerText;
      if (!videoInfo.views)    { const m = pageText.match(/(\d+[\.\d]*万?)\s*播放/); if (m) videoInfo.views = m[1]; }
      if (!videoInfo.likes)    { const m = pageText.match(/(\d+[\.\d]*万?)\s*(点赞|赞)/); if (m) videoInfo.likes = m[1]; }
      if (!videoInfo.upFans)   { const m = pageText.match(/关注\s*([\d\.]+万?)/); if (m) videoInfo.upFans = m[1]; }
      if (!videoInfo.commentCount) { const m = pageText.match(/评论\s*([\d]+)/); if (m) videoInfo.commentCount = m[1]; }
      if (!videoInfo.pubdate)  { const m = pageText.match(/(\d{4}-\d{2}-\d{2}\s*\d{2}:\d{2})/); if (m) videoInfo.pubdate = m[1]; }
    
      // ---------- 2. 抓取弹幕 ----------
      const danmuTexts = qq('[class*="danmaku-item"], .bilibili-player-dm span, [class*="dm-item"]')
        .map(e => txt(e)).filter(s => s.length > 1 && s.length < 60).slice(0, 20);
    
      // ---------- 3. 抓取评论区 ----------
      // B站评论DOM结构：每条主评论在 .reply-item / [class*="reply-item"]
      const commentEls = qq(
        '.reply-item, [class*="reply-item"], .comment-container .list-item, [class*="comment-item"]'
      );
    
      const comments = [];
      for (const el of commentEls) {
        // 用户名
        const username = txt(el.querySelector(
          '.user-name, [class*="user-name"], .author-name, a[class*="username"]'
        ));
        // 评论内容
        const content = txt(el.querySelector(
          '.reply-content, [class*="reply-content"], .comment-content, [class*="comment-text"]'
        ));
        // 点赞数
        const likeEl = el.querySelector(
          '[class*="like-count"], [class*="thumb-up"] .count, .like-btn .count, [class*="up-count"]'
        );
        let likes = likeEl ? txt(likeEl) : '';
        // 时间
        const timeEl = el.querySelector('[class*="reply-time"], [class*="comment-time"], .time');
        const time   = timeEl ? txt(timeEl) : '';
        // 是否UP主
        const isUp   = !!el.querySelector('[class*="up-icon"], [class*="author-badge"]');
    
        if (content && content.length > 2) {
          comments.push({ username: username || '匿名', content, likes, time, isUp });
        }
      }
    
      // 去重 + 按点赞排序
      const seen = new Set();
      const uniqueComments = comments.filter(c => {
        if (seen.has(c.content)) return false;
        seen.add(c.content);
        return true;
      });
    
      function parseLikes(s) {
        if (!s) return 0;
        s = s.toString().replace(/,/g, '');
        if (s.includes('万')) return parseFloat(s) * 10000;
        return parseInt(s) || 0;
      }
      uniqueComments.sort((a, b) => parseLikes(b.likes) - parseLikes(a.likes));
      const topComments = uniqueComments.slice(0, 20);
    
      // ---------- 4. 观点归纳（规则引擎） ----------
      const allText = uniqueComments.map(c => c.content).join('\n');
    
      const viewpointRules = [
        {
          key: '环境赞美',
          keywords: ['干净', '漂亮', '美', '治愈', '宫崎骏', '惬意', '好看', '舒服', '清澈', '自然'],
          color: '🟢'
        },
        {
          key: '房价/购房咨询',
          keywords: ['房子', '多少钱', '买房', '日元', '证件', '税', '价格', '便宜', '几万', '万元'],
          color: '🟡'
        },
        {
          key: '移居/定居讨论',
          keywords: ['移居', '定居', '永居', '移民', '国内', '出国', '离开', '武汉', '决心', '生活方式'],
          color: '🟣'
        },
        {
          key: '消费/性价比争议',
          keywords: ['100元', '102元', 'RMB', '值不值', '单价', '消费', '吃饱', '体验', '性价比', '贵'],
          color: '🟠'
        },
        {
          key: '现实考量与风险',
          keywords: ['找不到工作', '语言', '日语', '孤独', '寂寞', '没钱', '苦', '空调', '热', '疯'],
          color: '🔴'
        },
        {
          key: '中日对比/社会观察',
          keywords: ['国内', '中国', '对比', '差距', '审美', '建设', '地狱', '天堂', '环境', '密度'],
          color: '🔵'
        },
      ];
    
      function countMatches(text, keywords) {
        return keywords.reduce((n, kw) => n + (text.includes(kw) ? 1 : 0), 0);
      }
    
      const viewpoints = viewpointRules.map(rule => {
        const matchComments = uniqueComments.filter(c =>
          countMatches(c.content, rule.keywords) > 0
        );
        const ratio = uniqueComments.length > 0
          ? Math.round((matchComments.length / uniqueComments.length) * 100)
          : 0;
        return {
          ...rule,
          matchCount: matchComments.length,
          ratio,
          examples: matchComments.slice(0, 2).map(c => c.content.slice(0, 50))
        };
      }).sort((a, b) => b.matchCount - a.matchCount);
    
      // 整体情感判断
      const posKW = ['好', '棒', '喜欢', '漂亮', '干净', '治愈', '舒服', '惬意', '美', '赞'];
      const negKW = ['差', '不好', '糟', '烂', '可惜', '失望', '后悔', '坏', '苦', '疯'];
      let posScore = 0, negScore = 0;
      uniqueComments.forEach(c => {
        posScore += countMatches(c.content, posKW);
        negScore += countMatches(c.content, negKW);
      });
      const overallSentiment = posScore > negScore * 2
        ? '🟢 正面为主（观众对日本乡村生活整体持向往和赞美态度）'
        : posScore > negScore
        ? '🟡 正面偏中性（有赞美也有理性质疑）'
        : '🟣 争议性（正负面声音并存）';
    
      // ---------- 5. 动态加载 docx.js 并生成 Word ----------
      async function loadScript(url) {
        return new Promise((resolve, reject) => {
          if (window.__docxLoaded) return resolve();
          const s = document.createElement('script');
          s.src = url;
          s.onload = () => { window.__docxLoaded = true; resolve(); };
          s.onerror = reject;
          document.head.appendChild(s);
        });
      }
    
      // 尝试从CDN加载docx.js
      const CDN_URLS = [
        'https://unpkg.com/docx@8.5.0/build/index.js',
        'https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.js',
      ];
    
      let docxLoaded = false;
      for (const url of CDN_URLS) {
        try {
          await loadScript(url);
          if (window.docx) { docxLoaded = true; break; }
        } catch (e) { /* 继续尝试下一个 */ }
      }
    
      // ---- 5a. 如果 docx.js 加载成功：生成完整 .docx ----
      if (docxLoaded && window.docx) {
        const {
          Document, Packer, Paragraph, TextRun, HeadingLevel,
          Table, TableRow, TableCell, WidthType, BorderStyle,
          AlignmentType, ShadingType, convertInchesToTwip
        } = window.docx;
    
        function heading1(text) {
          return new Paragraph({
            text, heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 100 },
          });
        }
        function heading2(text) {
          return new Paragraph({
            text, heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 80 },
          });
        }
        function para(text, opts = {}) {
          return new Paragraph({
            children: [new TextRun({
              text,
              size: opts.size || 22,
              bold: opts.bold || false,
              color: opts.color || '000000',
            })],
            spacing: { before: 80, after: 60, line: 360 },
          });
        }
        function divider() {
          return new Paragraph({
            children: [new TextRun({ text: '─'.repeat(40), color: 'AAAAAA', size: 18 })],
            spacing: { before: 100, after: 100 },
          });
        }
    
        // 信息表格
        function infoTable(rows) {
          return new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: rows.map(([label, value]) => new TableRow({
              children: [
                new TableCell({
                  width: { size: 25, type: WidthType.PERCENTAGE },
                  children: [new Paragraph({
                    children: [new TextRun({ text: label, bold: true, size: 20 })]
                  })],
                  shading: { type: ShadingType.SOLID, color: 'F0F4FF' },
                }),
                new TableCell({
                  width: { size: 75, type: WidthType.PERCENTAGE },
                  children: [new Paragraph({
                    children: [new TextRun({ text: value || '—', size: 20 })]
                  })],
                }),
              ],
            })),
          });
        }
    
        // 评论表格
        function commentTable(comments) {
          const headerRow = new TableRow({
            children: ['序号', '用户名', '点赞', '评论内容（摘要）', '时间'].map(h =>
              new TableCell({
                children: [new Paragraph({
                  children: [new TextRun({ text: h, bold: true, size: 18 })]
                })],
                shading: { type: ShadingType.SOLID, color: 'E8F0FE' },
              })
            ),
          });
          const dataRows = comments.map((c, i) => new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(i + 1), size: 18 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: (c.isUp ? '👑 ' : '') + (c.username || '—').slice(0, 12), size: 18 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: c.likes || '—', size: 18 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: c.content.slice(0, 55) + (c.content.length > 55 ? '…' : ''), size: 18 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: c.time || '—', size: 18 })] })] }),
            ],
          }));
          return new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [headerRow, ...dataRows],
          });
        }
    
        const now = new Date().toLocaleDateString('zh-CN');
    
        const doc = new Document({
          sections: [{
            properties: {},
            children: [
              // ===== 封面 =====
              new Paragraph({
                children: [new TextRun({ text: 'B 站视频分析报告', bold: true, size: 52, color: '1A3A6B' })],
                alignment: AlignmentType.CENTER,
                spacing: { before: 600, after: 200 },
              }),
              new Paragraph({
                children: [new TextRun({ text: videoInfo.title, size: 28, color: '333333', italics: true })],
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 100 },
              }),
              new Paragraph({
                children: [new TextRun({ text: `生成日期：${now}  ｜  数据来源：哔哩哔哩（bilibili.com）`, size: 20, color: '888888' })],
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 800 },
              }),
              divider(),
    
              // ===== 一、视频基本信息 =====
              heading1('一、视频基本信息'),
              infoTable([
                ['视频标题', videoInfo.title],
                ['UP 主', videoInfo.upName],
                ['粉丝数', videoInfo.upFans],
                ['播放量', videoInfo.views],
                ['点赞数', videoInfo.likes],
                ['投币数', videoInfo.coins],
                ['收藏数', videoInfo.favorites],
                ['分享数', videoInfo.shares],
                ['评论总数', videoInfo.commentCount],
                ['发布时间', videoInfo.pubdate],
                ['视频标签', videoInfo.tags],
              ]),
              new Paragraph({ text: '', spacing: { after: 200 } }),
    
              // ===== 二、视频内容简介 =====
              heading1('二、视频内容简介'),
              para(videoInfo.desc || '（简介内容详见视频页面）'),
              new Paragraph({ text: '', spacing: { after: 200 } }),
    
              // ===== 三、弹幕热词 =====
              heading1('三、弹幕热词摘录'),
              danmuTexts.length > 0
                ? para('💬 ' + danmuTexts.join('　|　'))
                : para('（当前页面未检测到弹幕内容，可能需要播放视频后重新运行）', { color: '888888' }),
              new Paragraph({ text: '', spacing: { after: 200 } }),
    
              // ===== 四、热门评论 =====
              heading1(`四、热门评论 TOP ${topComments.length}（按点赞排序）`),
              topComments.length > 0
                ? commentTable(topComments)
                : para('（暂未检测到评论数据，请滚动页面加载评论后重新运行）', { color: '888888' }),
              new Paragraph({ text: '', spacing: { after: 200 } }),
    
              // ===== 五、主要观点归纳 =====
              heading1('五、评论区主要观点归纳'),
              ...viewpoints.flatMap(vp => [
                heading2(`${vp.color} ${vp.key}　（${vp.matchCount} 条相关评论，占比约 ${vp.ratio}%）`),
                ...vp.examples.map((ex, i) =>
                  para(`示例 ${i + 1}：「${ex}${ex.length >= 50 ? '…' : ''}」`, { color: '555555' })
                ),
                new Paragraph({ text: '', spacing: { after: 100 } }),
              ]),
    
              // ===== 六、整体态度评估 =====
              heading1('六、评论区整体态度评估'),
              para(overallSentiment, { bold: true, size: 24 }),
              para(`· 正面词汇命中：${posScore} 次　负面词汇命中：${negScore} 次`),
              para(`· 已采样评论数：${uniqueComments.length} 条`),
              para('· 本评估基于规则匹配，仅供参考，实际态度分布以完整评论数据为准。', { color: '888888', size: 18 }),
              new Paragraph({ text: '', spacing: { after: 200 } }),
    
              // ===== 七、说明 =====
              divider(),
              heading1('七、附注'),
              para('本报告由浏览器脚本自动提取当前页面可见数据生成，评论覆盖范围为页面首次加载后已滚动渲染的评论。'),
              para('如需采集更多评论，请先手动滚动页面至评论区底部，再重新运行本脚本。'),
              para(`报告生成时间：${new Date().toLocaleString('zh-CN')}　　视频 URL：${location.href.split('?')[0]}`),
            ],
          }],
        });
    
        const blob = await Packer.toBlob(doc);
        const url  = URL.createObjectURL(blob);
        const a    = Object.assign(document.createElement('a'), {
          href: url,
          download: `B站视频分析_${(videoInfo.title || 'report').slice(0, 20)}.docx`,
        });
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 3000);
    
        return {
          ok: true,
          mode: 'docx',
          summary: `✅ Word 文档已生成并触发下载！文件名：B站视频分析_${(videoInfo.title || 'report').slice(0, 20)}.docx`,
          video_title: videoInfo.title,
          up_name: videoInfo.upName,
          comments_extracted: uniqueComments.length,
          top_comments_in_doc: topComments.length,
          viewpoints_detected: viewpoints.filter(v => v.matchCount > 0).map(v => `${v.color}${v.key}(${v.matchCount}条)`),
          overall_sentiment: overallSentiment,
        };
      }
    
      // ---- 5b. fallback：docx.js 加载失败 → 生成 HTML 报告下载 ----
      const htmlContent = `<!DOCTYPE html>
    <html lang="zh-CN">
    <head>
    <meta charset="UTF-8">
    <title>B站视频分析报告</title>
    <style>
      body{font-family:'微软雅黑',sans-serif;max-width:900px;margin:40px auto;padding:0 20px;color:#333}
      h1{color:#1a3a6b;border-bottom:3px solid #1a3a6b;padding-bottom:10px}
      h2{color:#2c5282;margin-top:30px}
      .meta-table{width:100%;border-collapse:collapse;margin:15px 0}
      .meta-table td{border:1px solid #ddd;padding:8px 12px;font-size:14px}
      .meta-table td:first-child{background:#f0f4ff;font-weight:bold;width:120px}
      .comment-table{width:100%;border-collapse:collapse;font-size:13px}
      .comment-table th{background:#e8f0fe;padding:8px;border:1px solid #ccc}
      .comment-table td{padding:7px;border:1px solid #e0e0e0;vertical-align:top}
      .vp-card{background:#f8f9fa;border-left:4px solid #4285f4;padding:10px 15px;margin:10px 0;border-radius:4px}
      .sentiment{font-size:18px;font-weight:bold;color:#1a3a6b;padding:10px;background:#e8f4fd;border-radius:6px}
      .footer{color:#888;font-size:12px;margin-top:40px;border-top:1px solid #eee;padding-top:15px}
    </style>
    </head>
    <body>
    <h1>📊 B站视频分析报告</h1>
    <p style="color:#666">${new Date().toLocaleString('zh-CN')} 生成 | ${location.href.split('?')[0]}</p>
    <h2>一、视频基本信息</h2>
    <table class="meta-table">
    ${[
      ['视频标题', videoInfo.title],
      ['UP 主', videoInfo.upName],
      ['粉丝数', videoInfo.upFans],
      ['播放量', videoInfo.views],
      ['点赞数', videoInfo.likes],
      ['评论总数', videoInfo.commentCount],
      ['发布时间', videoInfo.pubdate],
      ['标签', videoInfo.tags],
    ].map(([k,v]) => `<tr><td>${k}</td><td>${v||'—'}</td></tr>`).join('')}
    </table>
    
    <h2>二、视频内容简介</h2>
    <p>${videoInfo.desc || '（详见视频页面）'}</p>
    
    <h2>三、弹幕热词</h2>
    <p>${danmuTexts.length > 0 ? danmuTexts.join('　|　') : '（页面未加载弹幕，请播放视频后重试）'}</p>
    
    <h2>四、热门评论 TOP ${topComments.length}</h2>
    ${topComments.length > 0 ? `
    <table class="comment-table">
    <tr><th>#</th><th>用户名</th><th>点赞</th><th>评论内容</th><th>时间</th></tr>
    ${topComments.map((c,i)=>`<tr>
      <td>${i+1}</td>
      <td>${c.isUp?'👑 ':''}${(c.username||'').slice(0,15)}</td>
      <td>${c.likes||'—'}</td>
      <td>${c.content.slice(0,80)}${c.content.length>80?'…':''}</td>
      <td style="white-space:nowrap;font-size:12px">${c.time||'—'}</td>
    </tr>`).join('')}
    </table>` : '<p style="color:#888">（滚动到评论区后重新运行）</p>'}
    
    <h2>五、主要观点归纳</h2>
    ${viewpoints.map(vp=>`
    <div class="vp-card">
      <strong>${vp.color} ${vp.key}</strong>（${vp.matchCount} 条，约 ${vp.ratio}%）
      ${vp.examples.map(ex=>`<div style="color:#555;margin-top:5px;font-size:13px">▸ 「${ex}${ex.length>=50?'…':''}」</div>`).join('')}
    </div>`).join('')}
    
    <h2>六、整体态度评估</h2>
    <div class="sentiment">${overallSentiment}</div>
    <p>正面词命中 ${posScore} 次，负面词命中 ${negScore} 次，采样 ${uniqueComments.length} 条评论。</p>
    
    <div class="footer">本报告由浏览器脚本自动提取页面可见数据生成。如需采集更多评论，请先滚动页面至底部再运行。</div>
    </body></html>`;
    
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url  = URL.createObjectURL(blob);
      const a    = Object.assign(document.createElement('a'), {
        href: url,
        download: `B站视频分析_${(videoInfo.title || 'report').slice(0, 20)}.html`,
      });
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 3000);
    
      return {
        ok: true,
        mode: 'html_fallback',
        summary: '⚠️ docx.js 加载失败（CDN 可能被屏蔽），已生成 HTML 格式分析报告并触发下载。可用 Word 打开 .html 文件查看，或将结果粘贴到 Word 中。',
        video_title: videoInfo.title,
        comments_extracted: uniqueComments.length,
        viewpoints_detected: viewpoints.filter(v=>v.matchCount>0).map(v=>`${v.color}${v.key}(${v.matchCount}条)`),
      };
    }
  );
  if (typeof __tabOriginalFunction !== "function") {
    throw new Error("evaluate_script source must evaluate to a function");
  }
  return await __tabOriginalFunction();
})();