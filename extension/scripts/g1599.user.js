(function() {
  if (window.__TAB_DOUBAN_IMDB_LINK_ONLY_LOADED__) return;
  window.__TAB_DOUBAN_IMDB_LINK_ONLY_LOADED__ = true;

  function executeAutomation() {
    console.log('[DoubanIMDbLink] Executing automation script...');

    if (!/movie\.douban\.com$/i.test(location.hostname) || !/\/subject\/\d+/.test(location.pathname)) {
      return;
    }

    const info = document.querySelector('#info');
    const mount = document.querySelector('#interest_sectl');

    if (!info || !mount) {
      console.warn('[DoubanIMDbLink] Required elements not found');
      return;
    }

    const text = (info.textContent || '').replace(/\s+/g, ' ').trim();
    const match = text.match(/IMDb:\s*(tt\d+)/i);

    if (!match) {
      console.warn('[DoubanIMDbLink] IMDb id not found');
      return;
    }

    const imdbId = match[1];
    const imdbUrl = `https://www.imdb.com/title/${imdbId}/`;

    if (mount.querySelector('.tab-imdb-link-box')) return;

    if (!document.getElementById('tab-imdb-link-style')) {
      const style = document.createElement('style');
      style.id = 'tab-imdb-link-style';
      style.textContent = `
        .tab-imdb-link-box {
          margin-top: 12px;
          padding: 10px 12px;
          border: 1px solid #e5e5e5;
          border-radius: 8px;
          background: #fafafa;
          font-size: 13px;
          line-height: 1.6;
        }
        .tab-imdb-link-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .tab-imdb-link-label {
          font-weight: 600;
          color: #333;
        }
        .tab-imdb-link-id {
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          color: #666;
        }
        .tab-imdb-link-btn {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 999px;
          background: #f5c518;
          color: #111;
          text-decoration: none;
          font-size: 12px;
          font-weight: 600;
        }
      `;
      document.documentElement.appendChild(style);
    }

    const box = document.createElement('div');
    box.className = 'tab-imdb-link-box';
    box.innerHTML = `
      <div class="tab-imdb-link-row">
        <span class="tab-imdb-link-label">IMDb</span>
        <span class="tab-imdb-link-id">${imdbId}</span>
        <a class="tab-imdb-link-btn" href="${imdbUrl}" target="_blank" rel="noopener noreferrer">打开 IMDb</a>
      </div>
    `;

    mount.appendChild(box);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', executeAutomation, { once: true });
  } else {
    executeAutomation();
  }
})();