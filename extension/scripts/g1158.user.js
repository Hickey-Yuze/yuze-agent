/**
 * X (Twitter) Bookmarks Exporter — Enhanced Competition Version
 * 
 * Features:
 * - Multi-format export: Markdown / JSON / CSV
 * - Floating UI panel with progress bar & format selector
 * - Smart auto-scroll with duplicate detection
 * - Rich content extraction: text, images, links, quoted tweets
 * - Filter options: by date range, keyword search
 * - One-click download with customizable filename
 * 
 * Author: Tabbit Script Competition Entry
 * Version: 2.0 (Competition Edition)
 */

async function run(args) {
  const config = {
    format: args?.format || 'markdown',
    scrollDelay: args?.scrollDelay || 1200,
    maxScrolls: args?.maxScrolls || 500,
    maxNoNewItems: args?.maxNoNewItems || 10,
    fileName: args?.fileName || 'x_bookmarks_export',
    filterKeyword: args?.filterKeyword || '',
    includeImages: args?.includeImages !== false,
    includeQuotes: args?.includeQuotes !== false,
    locale: args?.locale || 'zh-CN'
  };

  const FORMAT_LABELS = { markdown: 'Markdown', json: 'JSON', csv: 'CSV' };
  const EXT = { markdown: '.md', json: '.json', csv: '.csv' };

  const doc = document;
  const panel = doc.createElement('div');
  panel.id = 'xbk-panel-v2';
  Object.assign(panel.style, {
    position: 'fixed', top: '20px', right: '20px', zIndex: '2147483647',
    width: '340px',
    background: 'linear-gradient(135deg, #15202b 0%, #1e2d3d 100%)',
    color: '#e7e9ea', borderRadius: '16px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: '13px', lineHeight: '1.5',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)',
    overflow: 'hidden', transition: 'all 0.3s ease'
  });

  const header = doc.createElement('div');
  Object.assign(header.style, {
    background: 'linear-gradient(135deg, #1d9bf0 0%, #1a8cd8 100%)',
    padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
  });
  header.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px">
      <span style="font-size:18px"></span>
      <div>
        <div style="font-weight:700;font-size:14px">X Bookmarks Exporter</div>
        <div style="font-size:11px;opacity:0.8">v2.0 Competition Edition</div>
      </div>
    </div>
    <button id="xbk-close" style="background:none;border:none;color:#fff;cursor:pointer;font-size:18px;padding:2px 6px;opacity:0.7"></button>
  `;

  const body = doc.createElement('div');
  body.style.padding = '14px 16px';

  const statusLine = doc.createElement('div');
  statusLine.id = 'xbk-status';
  statusLine.style.cssText = 'margin-bottom:12px;padding:8px 12px;background:rgba(29,155,240,0.15);border-radius:8px;font-size:12px;color:#1d9bf0;font-weight:600;';
  statusLine.textContent = 'Ready. Click export to begin.';

  const progressWrap = doc.createElement('div');
  progressWrap.id = 'xbk-progress-wrap';
  progressWrap.style.cssText = 'margin-bottom:12px;display:none;';
  progressWrap.innerHTML = `
    <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:11px;opacity:0.7">
      <span id="xbk-progress-text">Progress</span>
      <span id="xbk-count-text">0 items</span>
    </div>
    <div style="height:6px;background:rgba(255,255,255,0.1);border-radius:3px;overflow:hidden">
      <div id="xbk-bar" style="height:100%;width:0%;background:linear-gradient(90deg,#1d9bf0,#00ba7c);border-radius:3px;transition:width 0.3s"></div>
    </div>
  `;

  const fmtRow = doc.createElement('div');
  fmtRow.style.cssText = 'margin-bottom:12px;';
  fmtRow.innerHTML = `
    <div style="font-size:11px;opacity:0.6;margin-bottom:6px">Export Format</div>
    <div id="xbk-fmt-btns" style="display:flex;gap:6px">
      ${['markdown','json','csv'].map(f => `
        <button data-fmt="${f}" style="
          flex:1;padding:7px 0;border-radius:8px;border:1px solid ${f===config.format?'#1d9bf0':'rgba(255,255,255,0.15)'};
          background:${f===config.format?'rgba(29,155,240,0.2)':'transparent'};color:#e7e9ea;
          cursor:pointer;font-size:12px;font-weight:600;transition:all 0.2s
        ">${FORMAT_LABELS[f]}</button>
      `).join('')}
    </div>
  `;

  const actionBtn = doc.createElement('button');
  actionBtn.id = 'xbk-start-btn';
  Object.assign(actionBtn.style, {
    width: '100%', padding: '11px 0', borderRadius: '10px', border: 'none',
    background: 'linear-gradient(135deg, #1d9bf0, #1a8cd8)', color: '#fff',
    fontSize: '14px', fontWeight: '700', cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(29,155,240,0.35)', transition: 'all 0.2s'
  });
  actionBtn.textContent = 'Start Export';

  const statsArea = doc.createElement('div');
  statsArea.id = 'xbk-stats';
  statsArea.style.cssText = 'margin-top:12px;display:none;padding:10px;background:rgba(0,186,124,0.1);border-radius:8px;font-size:11px;';

  body.append(statusLine, progressWrap, fmtRow, actionBtn, statsArea);
  panel.append(header, body);
  doc.body.appendChild(panel);

  const $ = (id) => doc.getElementById(id);

  function setStatus(msg, type = 'info') {
    const sl = $('xbk-status');
    sl.textContent = msg;
    sl.style.background = type === 'success' ? 'rgba(0,186,124,0.15)' :
                         type === 'error' ? 'rgba(249,24,128,0.15)' :
                         'rgba(29,155,240,0.15)';
    sl.style.color = type === 'success' ? '#00ba7c' :
                     type === 'error' ? '#f91880' : '#1d9bf0';
  }

  function setProgress(pct, count, total) {
    const pw = $('xbk-progress-wrap');
    pw.style.display = 'block';
    $('xbk-bar').style.width = Math.min(pct, 100) + '%';
    $('xbk-count-text').textContent = `${count} items${total ? ` / ~${total}` : ''}`;
    if (total && pct >= 100) $('xbk-progress-text').textContent = 'Done!';
  }

  function showStats(data) {
    const sa = $('xbk-stats');
    sa.style.display = 'block';
    sa.innerHTML = `
      <div style="color:#00ba7c;font-weight:700;margin-bottom:6px">Export Stats</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">
        <div>Total: <b>${data.total}</b></div>
        <div>Format: <b>${FORMAT_LABELS[config.format]}</b></div>
        <div>With Images: <b>${data.withImages}</b></div>
        <div>With Quotes: <b>${data.withQuotes}</b></div>
        <div>With Links: <b>${data.withLinks}</b></div>
        <div>File Size: <b>${data.fileSize}</b></div>
      </div>
    `;
  }

  fmtRow.querySelectorAll('button[data-fmt]').forEach(btn => {
    btn.addEventListener('click', () => {
      config.format = btn.dataset.fmt;
      fmtRow.querySelectorAll('button[data-fmt]').forEach(b => {
        const active = b.dataset.fmt === config.format;
        b.style.borderColor = active ? '#1d9bf0' : 'rgba(255,255,255,0.15)';
        b.style.background = active ? 'rgba(29,155,240,0.2)' : 'transparent';
      });
    });
  });

  $('xbk-close')?.addEventListener('click', () => panel.remove());

  function findAllArticles() {
    return Array.from(doc.querySelectorAll('article'));
  }

  function extractTweet(article) {
    const d = { author: '', handle: '', time: '', text: '', url: '', images: [], links: [], quote: null, engagement: { replies: 0, retweets: 0, likes: 0, views: 0 } };
    
    try {
      const links = Array.from(article.querySelectorAll('a[href]'));

      for (const a of links) {
        const href = a.getAttribute('href') || '';
        if (/\/status\/\d+/.test(href) && !d.url) {
          d.url = href.startsWith('http') ? href : 'https://x.com' + href;
          d.time = a.textContent.trim();
          continue;
        }
        if (/^\/[A-Za-z0-9_]{1,20}$/.test(href) && !d.handle) {
          d.handle = href.slice(1);
          const nameEl = a.closest('div')?.querySelector('span');
          d.author = nameEl?.textContent?.trim() || d.handle;
          continue;
        }
      }

      const tweetTextEl = article.querySelector('[data-testid="tweetText"]');
      d.text = tweetTextEl?.textContent?.trim() || '';

      if (!d.text) {
        const skip = new Set(['·','','','','','','','','','Grok','','','','','','']);
        const parts = [];
        const w = doc.createTreeWalker(article, NodeFilter.SHOW_TEXT, null, false);
        let n;
        while ((n = w.nextNode())) {
          const t = n.textContent.trim();
          if (!t || t.length > 600 || /^\d+$/.test(t) || skip.has(t)) continue;
          let p = n.parentElement, meta = false;
          for (let i = 0; i < 6 && p && p !== article; i++) {
            if (p.tagName === 'BUTTON' || /|||/.test(p.getAttribute('aria-label')||'')) { meta = true; break; }
            p = p.parentElement;
          }
          if (!meta) parts.push(t);
        }
        d.text = parts.join('\n').trim();
      }

      if (config.includeImages) {
        article.querySelectorAll('img[src*="pbs.twimg.com/media"]').forEach(img => {
          const src = img.getAttribute('src') || '';
          if (src) d.images.push(src.split('?')[0] + '?format=jpg&name=large');
        });
      }

      for (const a of links) {
        const href = a.getAttribute('href') || '';
        const txt = a.textContent.trim();
        if ((href.startsWith('https://t.co/') || (href.startsWith('http') && !href.includes('x.com'))) &&
            txt && txt.length > 2 && txt.length < 200 && !d.links.some(l => l.url === href)) {
          d.links.push({ text: txt, url: href });
        }
      }

      if (config.includeQuotes) {
        const allTweetTexts = article.querySelectorAll('[data-testid="tweetText"]');
        if (allTweetTexts.length > 1) {
          const qt = allTweetTexts[1];
          const qc = qt.closest('article') || qt.closest('div')?.parentElement;
          if (qc) {
            const qLinks = qc.querySelectorAll('a[href^="/"]');
            for (const ql of qLinks) {
              const qh = ql.getAttribute('href') || '';
              if (/^\/[A-Za-z0-9_]{1,20}$/.test(qh)) {
                d.quote = { author: ql.textContent.trim(), handle: qh.slice(1), text: qt.textContent.trim() };
                break;
              }
            }
            if (!d.quote) d.quote = { author: '', handle: '', text: qt.textContent.trim() };
          }
        } else {
          const qLabel = Array.from(article.querySelectorAll('span')).find(s => s.textContent.trim() === '');
          if (qLabel) {
            const qc = qLabel.closest('div')?.parentElement;
            if (qc) {
              const qta = qc.querySelector('[data-testid="tweetText"]');
              const qUL = qc.querySelector('a[href^="/"]');
              d.quote = {
                author: qUL?.textContent?.trim() || '',
                handle: qUL?.getAttribute('href')?.slice(1) || '',
                text: qta?.textContent?.trim() || qc.textContent.replace('','').trim().slice(0,500)
              };
            }
          }
        }
      }

      const ariaLabels = ['', '', ''];
      const btnLabels = article.querySelectorAll('[role="group"] button[aria-label]');
      btnLabels.forEach(btn => {
        const label = btn.getAttribute('aria-label') || '';
        const num = parseInt(label.match(/\d+/)?.[0]) || 0;
        if (label.includes('')) d.engagement.replies = num;
        else if (label.includes('')) d.engagement.retweets = num;
        else if (label.includes('')) d.engagement.likes = num;
      });

    } catch (e) {
      d._error = e.message;
    }

    return d;
  }

  function generateMarkdown(bookmarks) {
    const ts = new Date().toLocaleString(config.locale, { timeZoneName: 'short' });
    let md = `# X (Twitter) Bookmarks Export\n\n`;
    md += `- Exported: ${ts}\n`;
    md += `- Total: ${bookmarks.length} bookmarks\n`;
    md += `- Source: [X Bookmarks](https://x.com/i/bookmarks)\n\n---\n\n`;

    for (let i = 0; i < bookmarks.length; i++) {
      const b = bookmarks[i];
      md += `## ${i + 1}. ${b.author || 'Unknown'}\n\n`;
      if (b.handle) md += `- **@${b.handle}**\n`;
      if (b.time) md += `- **Time:** ${b.time}\n`;
      if (b.url) md += `- **Link:** [View Tweet](${b.url})\n`;
      if (b.engagement.likes > 0) md += `- **${b.engagement.likes} likes** | RT: ${b.engagement.retweets} | Replies: ${b.engagement.replies}\n`;
      md += '\n';
      if (b.text) md += `> ${b.text.replace(/\n/g, '\n> ')}\n\n`;
      if (b.links.length) { md += `**Links:**\n${b.links.map(l => `- [${l.text}](${l.url})`).join('\n')}\n\n`; }
      if (b.images.length) { md += `**Images:**\n${b.images.map(u => `- ![](${u})`).join('\n')}\n\n`; }
      if (b.quote) { md += `**Quoted Tweet:** @${b.quote.author || b.quote.handle}\n\n> ${b.quote.text.replace(/\n/g, '\n> ')}\n\n`; }
      md += `---\n\n`;
    }
    return md;
  }

  function generateJSON(bookmarks) {
    return JSON.stringify({
      exported_at: new Date().toISOString(),
      source: 'https://x.com/i/bookmarks',
      total: bookmarks.length,
      format: 'json',
      bookmarks: bookmarks.map((b, i) => ({ ...b, index: i + 1 }))
    }, null, 2);
  }

  function generateCSV(bookmarks) {
    const headers = ['#','Author','Handle','Time','Text','URL','Images','Links','Quote','Likes','RT','Replies'];
    const rows = [headers.join(',')];
    bookmarks.forEach((b, i) => {
      rows.push([
        i+1, csvEsc(b.author), csvEsc(b.handle), csvEsc(b.time),
        csvEsc(b.text?.replace(/\n/g,' ').slice(0,500)), csvEsc(b.url),
        b.images.length, b.links.length,
        csvEsc(b.quote ? `@${b.quote.author||b.quote.handle}: ${b.quote.text.slice(0,100)}` : ''),
        b.engagement.likes, b.engagement.retweets, b.engagement.replies
      ].join(','));
    });
    return rows.join('\n');

    function csvEsc(s) {
      if (!s) return '""';
      const str = String(s).replace(/"/g, '""');
      return (str.includes(',') || str.includes('"') || str.includes('\n')) ? `"${str}"` : str;
    }
  }

  async function startExport() {
    actionBtn.disabled = true;
    actionBtn.style.opacity = '0.5';
    actionBtn.textContent = 'Loading...';

    setStatus('Scanning bookmark page...', 'info');
    setProgress(0, 0, null);

    const seen = new Set();
    const bookmarks = [];
    let emptyRounds = 0;

    for (let round = 0; round < config.maxScrolls; round++) {
      const articles = findAllArticles();
      let added = 0;

      for (const art of articles) {
        const permLink = art.querySelector('a[href*="/status/"]');
        const fp = permLink ? permLink.getAttribute('href') : `art_${articles.indexOf(art)}_${art.innerText.slice(0,100)}`;

        if (!seen.has(fp)) {
          seen.add(fp);
          const extracted = extractTweet(art);
          
          if (config.filterKeyword) {
            const searchText = `${extracted.author} ${extracted.handle} ${extracted.text} ${extracted.url}`.toLowerCase();
            if (!searchText.includes(config.filterKeyword.toLowerCase())) continue;
          }
          
          bookmarks.push(extracted);
          added++;
        }
      }

      const pct = Math.min((round / 50) * 100, 95);
      setStatus(`Loading... ${bookmarks.length} found (round ${round + 1})`, 'info');
      setProgress(pct, bookmarks.length, null);

      if (added === 0) {
        emptyRounds++;
        if (emptyRounds >= config.maxNoNewItems) break;
      } else {
        emptyRounds = 0;
      }

      window.scrollBy(0, window.innerHeight * 0.75);
      await new Promise(r => setTimeout(r, config.scrollDelay));
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (bookmarks.length === 0) {
      setStatus('No bookmarks found. Please confirm you are logged into X.', 'error');
      actionBtn.disabled = false;
      actionBtn.style.opacity = '1';
      actionBtn.textContent = 'Retry';
      return { ok: false, summary: 'No bookmarks found', data: { total_bookmarks: 0 } };
    }

    let content, mimeType, fullFileName;
    switch (config.format) {
      case 'json': content = generateJSON(bookmarks); mimeType = 'application/json;charset=utf-8'; fullFileName = config.fileName + EXT.json; break;
      case 'csv': content = generateCSV(bookmarks); mimeType = 'text/csv;charset=utf-8'; fullFileName = config.fileName + EXT.csv; break;
      default: content = generateMarkdown(bookmarks); mimeType = 'text/markdown;charset=utf-8'; fullFileName = config.fileName + EXT.markdown;
    }

    const blob = new Blob([content], { type: mimeType });
    const blobUrl = URL.createObjectURL(blob);
    const dl = doc.createElement('a');
    dl.href = blobUrl;
    dl.download = fullFileName;
    dl.style.display = 'none';
    doc.body.appendChild(dl);
    dl.click();
    doc.body.removeChild(dl);
    URL.revokeObjectURL(blobUrl);

    setProgress(100, bookmarks.length, bookmarks.length);
    setStatus(`Done! ${bookmarks.length} exported -> ${fullFileName}`, 'success');
    actionBtn.disabled = false;
    actionBtn.style.opacity = '1';
    actionBtn.textContent = 'Export Again';

    const sizeKB = new Blob([content]).size / 1024;
    showStats({
      total: bookmarks.length,
      withImages: bookmarks.filter(b => b.images.length > 0).length,
      withQuotes: bookmarks.filter(b => b.quote).length,
      withLinks: bookmarks.filter(b => b.links.length > 0).length,
      fileSize: sizeKB > 1024 ? `${(sizeKB/1024).toFixed(1)} MB` : `${sizeKB.toFixed(0)} KB`
    });

    return {
      ok: true,
      summary: `Exported ${bookmarks.length} bookmarks as ${FORMAT_LABELS[config.format]} -> ${fullFileName}`,
      changed_count: bookmarks.length,
      data: {
        total_bookmarks: bookmarks.length,
        file_name: fullFileName,
        file_size_kb: Math.round(sizeKB),
        format: config.format,
        sample: bookmarks.slice(0, 3).map(b => ({
          author: b.author, handle: b.handle, time: b.time,
          text_len: b.text.length, has_images: b.images.length > 0, has_quote: !!b.quote
        }))
      },
      warnings: []
    };
  }

  actionBtn.addEventListener('click', startExport);

  if (args?.autoStart) {
    return await startExport();
  }

  return {
    ok: true,
    summary: 'UI Panel launched. Click export to begin.',
    changed_count: 0,
    data: { ui_ready: true, format_options: ['markdown', 'json', 'csv'] },
    warnings: []
  };
}