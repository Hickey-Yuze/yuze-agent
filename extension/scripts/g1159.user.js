(async function __tabEvaluateScriptBridge() {
  const __tabScriptArgs = null;
  const __tabOriginalFunction = (
    /**
     * \u7F51\u9875\u6D3B\u52A8\u8FFD\u8E2A\u811A\u672C \u00B7 Web Activity Tracker (Enhanced)
     * 
     * \u529F\u80FD\uFF1A
     * - \u53EF\u62D6\u62FD\u60AC\u6D6E\u7A97\uFF0C\u5B9E\u65F6\u663E\u793A\u5F53\u524D\u7F51\u9875\u6D3B\u52A8\u72B6\u6001
     * - \u8BB0\u5F55\u5728\u4E0D\u540C\u7F51\u9875\u7684\u505C\u7559\u65F6\u957F
     * - \u8FFD\u8E2A\u9605\u8BFB\u5185\u5BB9\u53D8\u5316\uFF08\u6807\u9898\u3001URL\u3001\u6EDA\u52A8\u6D3B\u52A8\uFF09
     * - \u5168\u5929\u4E0D\u95F4\u65AD\u8BB0\u5F55\u7F51\u9875\u6D3B\u52A8
     * - \u751F\u6210\u6BCF\u65E5\u7B80\u62A5 + \u590D\u76D8\u5EFA\u8BAE
     * 
     * \u6570\u636E\u5B58\u50A8\uFF1AlocalStorage\uFF08\u8DE8\u9875\u9762\u6301\u4E45\u5316\uFF09
     */
    
    async function run(args) {
      // ========== \u914D\u7F6E ==========
      const CONFIG = {
        storageKey: 'web_activity_tracker_data',
        widgetId: 'web-activity-tracker-widget',
        tickInterval: 1000,
        contentCheckInterval: 5000,
        maxRecords: 2000,
        colors: {
          primary: '#4F46E5',
          primaryLight: '#818CF8',
          accent: '#10B981',
          warning: '#F59E0B',
          danger: '#EF4444',
          bg: 'rgba(15, 23, 42, 0.95)',
          bgCard: 'rgba(30, 41, 59, 0.9)',
          text: '#E2E8F0',
          textMuted: '#94A3B8',
          border: 'rgba(148, 163, 184, 0.2)'
        }
      };
    
      // ========== \u5DE5\u5177\u51FD\u6570 ==========
      function $(sel) { return document.querySelector(sel); }
      function $$(sel) { return document.querySelectorAll(sel); }
      function pad(n) { return String(n).padStart(2, '0'); }

      function escapeHTML(value) {
        return String(value ?? '').replace(/[&<>"']/g, char => ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;'
        })[char]);
      }
    
      function formatDuration(seconds) {
        if (seconds < 60) return `${seconds}\u79D2`;
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (h > 0) return `${h}\u65F6${pad(m)}\u5206${pad(s)}\u79D2`;
        return `${m}\u5206${pad(s)}\u79D2`;
      }
    
      function formatTime(ts) {
        const d = new Date(ts);
        return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
      }
    
      function getTodayStr() {
        const d = new Date();
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      }
    
      function getPageIdentity() {
        return {
          url: location.href,
          title: document.title,
          hostname: location.hostname,
          path: location.pathname
        };
      }
    
      function getScrollDepth() {
        const body = document.body;
        const html = document.documentElement;
        const scrollHeight = Math.max(body.scrollHeight, body.offsetHeight,
          html.clientHeight, html.scrollHeight, html.offsetHeight);
        const scrollTop = window.pageYOffset || (html && html.scrollTop) || (body && body.scrollTop);
        const clientHeight = html.clientHeight || window.innerHeight || 0;
        if (scrollHeight <= clientHeight) return 100;
        return Math.round((scrollTop / (scrollHeight - clientHeight)) * 100);
      }
    
      function getVisibleTextSample() {
        if (!document.body) return '';
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
          {
            acceptNode(node) {
              const text = node.textContent.trim();
              return text.length > 20 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
            }
          }
        );
        let texts = [];
        let node;
        while ((node = walker.nextNode()) && texts.length < 5) {
          texts.push(node.textContent.trim().slice(0, 80));
        }
        return texts.join(' | ').slice(0, 300);
      }
    
      // ========== \u6570\u636E\u7BA1\u7406 ==========
      function loadData() {
        try {
          const raw = localStorage.getItem(CONFIG.storageKey);
          return raw ? JSON.parse(raw) : createFreshData();
        } catch (e) {
          return createFreshData();
        }
      }
    
      function createFreshData() {
        return {
          version: '2.0',
          createdAt: Date.now(),
          sessions: [],
          currentSession: null,
          events: []
        };
      }
    
      function saveData(data) {
        try {
          if (data.events.length > CONFIG.maxRecords) {
            data.events = data.events.slice(-CONFIG.maxRecords);
          }
          localStorage.setItem(CONFIG.storageKey, JSON.stringify(data));
        } catch (e) {
          console.warn('[WebActivityTracker] \u5B58\u50A8\u5931\u8D25:', e.message);
        }
      }
    
      function getOrCreateTodaySession(data) {
        const today = getTodayStr();
        let session = data.sessions.find(s => s.date === today);
        if (!session) {
          session = {
            date: today,
            startedAt: Date.now(),
            pages: [],
            totalActiveTime: 0,
            lastEventAt: Date.now()
          };
          data.sessions.push(session);
          if (data.sessions.length > 30) {
            data.sessions = data.sessions.slice(-30);
          }
        }
        return session;
      }
    
      function recordPageVisit(data, pageInfo) {
        const session = getOrCreateTodaySession(data);
        const now = Date.now();
    
        let pageRecord = session.pages.find(p => p.url === pageInfo.url);
    
        if (!pageRecord) {
          pageRecord = {
            url: pageInfo.url,
            title: pageInfo.title,
            hostname: pageInfo.hostname,
            firstVisitedAt: now,
            lastVisitedAt: now,
            totalTime: 0,
            visitCount: 1,
            scrollDepths: [],
            maxScrollDepth: 0,
            contentSamples: [],
            titleHistory: [{ title: pageInfo.title, at: now }],
            active: true,
            startedAt: now
          };
          session.pages.push(pageRecord);
    
          data.events.push({
            type: 'page_open',
            url: pageInfo.url,
            title: pageInfo.title,
            at: now
          });
        } else {
          pageRecord.lastVisitedAt = now;
          pageRecord.visitCount++;
          pageRecord.active = true;
          pageRecord.startedAt = now;
    
          if (pageRecord.title !== pageInfo.title) {
            pageRecord.titleHistory = pageRecord.titleHistory || [];
            pageRecord.titleHistory.push({ title: pageInfo.title, at: now });
            pageRecord.title = pageInfo.title;
    
            data.events.push({
              type: 'title_change',
              url: pageInfo.url,
              oldTitle: pageRecord.titleHistory[pageRecord.titleHistory.length - 2]?.title,
              newTitle: pageInfo.title,
              at: now
            });
          }
        }
    
        data.currentSession = { url: pageInfo.url, startedAt: now };
        session.lastEventAt = now;
        saveData(data);
        return pageRecord;
      }
    
      function updatePageActivity(data, pageInfo) {
        const session = getOrCreateTodaySession(data);
        const pageRecord = session.pages.find(p => p.url === pageInfo.url);
        if (!pageRecord) return null;
    
        const now = Date.now();
        const elapsed = Math.floor((now - (pageRecord._lastTick || pageRecord.startedAt)) / 1000);
        pageRecord.totalTime += elapsed;
        pageRecord._lastTick = now;
        session.totalActiveTime += elapsed;
    
        const depth = getScrollDepth();
        pageRecord.scrollDepths.push({ depth, at: now });
        if (depth > pageRecord.maxScrollDepth) {
          pageRecord.maxScrollDepth = depth;
        }
    
        if (!pageRecord._lastContentSample || now - pageRecord._lastContentSample > 60000) {
          const sample = getVisibleTextSample();
          if (sample) {
            pageRecord.contentSamples.push({ sample, at: now, scrollDepth: depth });
            pageRecord._lastContentSample = now;
            if (pageRecord.contentSamples.length > 5) {
              pageRecord.contentSamples = pageRecord.contentSamples.slice(-5);
            }
          }
        }
    
        session.lastEventAt = now;
        saveData(data);
        return pageRecord;
      }
    
      // ========== \u884C\u4E3A\u5206\u6790 ==========
      function analyzePatterns(pages, domains) {
        const patterns = {
          isReadingFocused: false,
          isResearchMode: false,
          isSocialHeavy: false,
          isEntertainmentHeavy: false,
          topCategory: '\u901A\u7528',
          attentionSpan: 'medium',
          domainDiversity: domains.length
        };
    
        // \u9605\u8BFB\u6DF1\u5EA6\u5206\u6790
        const avgScrollDepth = pages.reduce((sum, p) => sum + (p.maxScrollDepth || 0), 0) / pages.length;
        patterns.isReadingFocused = avgScrollDepth > 50;
    
        // \u57DF\u540D\u5206\u7C7B
        const socialHosts = ['twitter.com', 'x.com', 'weibo.com', 'facebook.com', 'instagram.com', 'tiktok.com', 'douyin.com', 'xiaohongshu.com'];
        const entertainmentHosts = ['youtube.com', 'bilibili.com', 'netflix.com', 'youku.com', 'iqiyi.com'];
        const devHosts = ['github.com', 'stackoverflow.com', 'dev.to', 'csdn.net', 'juejin.cn', 'zhihu.com'];
        
        const socialTime = domains.filter(d => socialHosts.some(h => d.host.includes(h))).reduce((s, d) => s + d.time, 0);
        const entertainmentTime = domains.filter(d => entertainmentHosts.some(h => d.host.includes(h))).reduce((s, d) => s + d.time, 0);
        const devTime = domains.filter(d => devHosts.some(h => d.host.includes(h))).reduce((s, d) => s + d.time, 0);
        const totalTime = domains.reduce((s, d) => s + d.time, 0) || 1;
    
        patterns.isSocialHeavy = socialTime / totalTime > 0.3;
        patterns.isEntertainmentHeavy = entertainmentTime / totalTime > 0.3;
        patterns.isResearchMode = devTime / totalTime > 0.3;
    
        // \u5224\u65AD\u4E3B\u8981\u7C7B\u522B
        const categoryScores = [
          { cat: '\u6280\u672F\u5F00\u53D1', score: devTime },
          { cat: '\u793E\u4EA4\u5A31\u4E50', score: socialTime + entertainmentTime * 0.7 },
          { cat: '\u8D44\u8BAF\u9605\u8BFB', score: totalTime * (avgScrollDepth / 100) }
        ];
        categoryScores.sort((a, b) => b.score - a.score);
        patterns.topCategory = categoryScores[0].cat;
    
        // \u6CE8\u610F\u529B\u8DE8\u5EA6\uFF1A\u57FA\u4E8E\u9875\u9762\u5E73\u5747\u505C\u7559\u65F6\u95F4
        const avgPageTime = pages.reduce((s, p) => s + p.totalTime, 0) / pages.length;
        if (avgPageTime < 120) patterns.attentionSpan = 'short';
        else if (avgPageTime > 600) patterns.attentionSpan = 'long';
    
        return patterns;
      }
    
      // ========== \u590D\u76D8\u5EFA\u8BAE\u751F\u6210 ==========
      function generateSuggestions(patterns, pages, domains, totalTime) {
        const suggestions = [];
        const hours = Math.floor(totalTime / 3600);
    
        // \u65F6\u95F4\u4F7F\u7528\u5EFA\u8BAE
        if (patterns.isEntertainmentHeavy) {
          suggestions.push({
            type: 'warning',
            icon: '\uD83C\uDFAC',
            title: '\u5A31\u4E50\u65F6\u95F4\u5360\u6BD4\u8F83\u9AD8',
            desc: `\u4ECA\u5929\u5728\u5A31\u4E50\u7F51\u7AD9\u82B1\u8D39\u8F83\u591A\u65F6\u95F4\u3002\u5EFA\u8BAE\u8BBE\u5B9A\u4E13\u6CE8\u65F6\u6BB5\uFF0C\u4F7F\u7528\u756A\u8304\u949F\u63D0\u9AD8\u6548\u7387\u3002`,
            action: '\u5C1D\u8BD5\u5C06\u5A31\u4E50\u65F6\u95F4\u96C6\u4E2D\u5728\u5B8C\u6210\u91CD\u8981\u4EFB\u52A1\u540E\u4F5C\u4E3A\u5956\u52B1'
          });
        }
    
        if (patterns.isSocialHeavy) {
          suggestions.push({
            type: 'info',
            icon: '\uD83D\uDCAC',
            title: '\u793E\u4EA4\u5A92\u4F53\u6D3B\u8DC3\u5EA6\u9AD8',
            desc: `\u9891\u7E41\u5207\u6362\u793E\u4EA4\u5E73\u53F0\u53EF\u80FD\u5206\u6563\u6CE8\u610F\u529B\u3002\u5EFA\u8BAE\u6279\u91CF\u5904\u7406\u6D88\u606F\uFF0C\u51CF\u5C11\u4E0A\u4E0B\u6587\u5207\u6362\u6210\u672C\u3002`,
            action: '\u8BBE\u5B9A\u56FA\u5B9A\u7684\u793E\u4EA4\u5A92\u4F53\u67E5\u770B\u65F6\u95F4\uFF08\u5982\u5348\u4F11\u548C\u665A\u95F4\uFF09'
          });
        }
    
        if (patterns.isResearchMode) {
          suggestions.push({
            type: 'success',
            icon: '\uD83D\uDCDA',
            title: '\u5B66\u4E60/\u7814\u7A76\u6A21\u5F0F\u826F\u597D',
            desc: `\u4ECA\u5929\u6295\u5165\u4E86\u5927\u91CF\u65F6\u95F4\u5728\u6280\u672F/\u77E5\u8BC6\u7C7B\u7F51\u7AD9\u4E0A\uFF0C\u4FDD\u6301\u8FD9\u4E2A\u52BF\u5934\uFF01`,
            action: '\u8BB0\u5F97\u5B9A\u65F6\u4F11\u606F\uFF0C\u6BCF45\u5206\u949F\u7AD9\u8D77\u6765\u6D3B\u52A8\u4E00\u4E0B'
          });
        }
    
        if (patterns.isReadingFocused) {
          suggestions.push({
            type: 'success',
            icon: '\uD83D\uDCD6',
            title: '\u6DF1\u5EA6\u9605\u8BFB\u4E60\u60EF\u826F\u597D',
            desc: `\u5E73\u5747\u6EDA\u52A8\u6DF1\u5EA6\u8F83\u9AD8\uFF0C\u8BF4\u660E\u4F60\u5728\u8BA4\u771F\u9605\u8BFB\u5185\u5BB9\u800C\u975E\u5FEB\u901F\u6D4F\u89C8\u3002`,
            action: '\u53EF\u4EE5\u5C1D\u8BD5\u7528\u7B14\u8BB0\u5DE5\u5177\u8BB0\u5F55\u5173\u952E\u4FE1\u606F\uFF0C\u5F62\u6210\u77E5\u8BC6\u6C89\u6DC0'
          });
        }
    
        if (patterns.attentionSpan === 'short') {
          suggestions.push({
            type: 'warning',
            icon: '\u26A1',
            title: '\u6CE8\u610F\u529B\u8DE8\u5EA6\u504F\u77ED',
            desc: `\u5E73\u5747\u6BCF\u4E2A\u9875\u9762\u505C\u7559\u65F6\u95F4\u8F83\u77ED\uFF0C\u53EF\u80FD\u5B58\u5728\u9891\u7E41\u8DF3\u8F6C\u7684\u60C5\u51B5\u3002`,
            action: '\u5C1D\u8BD5\u4E00\u6B21\u53EA\u6253\u5F00\u4E00\u4E2A\u6807\u7B7E\u9875\uFF0C\u5B8C\u6210\u5F53\u524D\u4EFB\u52A1\u518D\u5207\u6362'
          });
        }
    
        if (hours > 6) {
          suggestions.push({
            type: 'warning',
            icon: '\uD83D\uDE30',
            title: '\u5C4F\u5E55\u65F6\u95F4\u8FC7\u957F',
            desc: `\u4ECA\u5929\u7684\u6D4F\u89C8\u5668\u4F7F\u7528\u65F6\u957F\u5DF2\u8D85\u8FC7${hours}\u5C0F\u65F6\uFF0C\u6CE8\u610F\u773C\u775B\u548C\u9888\u690E\u5065\u5EB7\uFF01`,
            action: '\u4F7F\u752820-20-20\u6CD5\u5219\uFF1A\u6BCF20\u5206\u949F\u770B20\u82F1\u5C3A\u591620\u79D2'
          });
        }
    
        if (patterns.domainDiversity >= 5) {
          suggestions.push({
            type: 'info',
            icon: '\uD83C\uDF10',
            title: '\u6D4F\u89C8\u8303\u56F4\u5E7F\u6CDB',
            desc: `\u4ECA\u5929\u8BBF\u95EE\u4E86${patterns.domainDiversity}\u4E2A\u4E0D\u540C\u57DF\u540D\uFF0C\u6D89\u730E\u9762\u5F88\u5E7F\u3002`,
            action: '\u53EF\u4EE5\u8003\u8651\u5BF9\u611F\u5174\u8DA3\u7684\u9886\u57DF\u6DF1\u5165\u6316\u6398\uFF0C\u5EFA\u7ACB\u7CFB\u7EDF\u5316\u77E5\u8BC6'
          });
        }
    
        // \u5982\u679C\u6CA1\u6709\u7279\u522B\u5EFA\u8BAE\uFF0C\u7ED9\u4E00\u4E2A\u9ED8\u8BA4\u7684
        if (suggestions.length === 0) {
          suggestions.push({
            type: 'info',
            icon: '\u2728',
            title: '\u7EE7\u7EED\u52A0\u6CB9',
            desc: `\u4ECA\u5929\u7684\u6D4F\u89C8\u6570\u636E\u5DF2\u8BB0\u5F55\uFF0C\u7EE7\u7EED\u4FDD\u6301\u826F\u597D\u7684\u4E0A\u7F51\u4E60\u60EF\uFF01`,
            action: '\u660E\u5929\u53EF\u4EE5\u8BD5\u8BD5\u8BBE\u5B9A\u4E00\u4E2A\u5C0F\u76EE\u6807\u6765\u63D0\u5347\u6548\u7387'
          });
        }
    
        return suggestions;
      }
    
      // ========== \u6BCF\u65E5\u7B80\u62A5\u751F\u6210 ==========
      function generateDailyReport(data, dateStr) {
        const session = data.sessions.find(s => s.date === dateStr);
        if (!session || session.pages.length === 0) {
          return { summary: '\u5F53\u5929\u65E0\u6D4F\u89C8\u8BB0\u5F55', details: [], suggestions: [] };
        }
    
        const pages = session.pages.sort((a, b) => b.totalTime - a.totalTime);
        const totalTime = session.totalActiveTime;
    
        // \u7EDF\u8BA1\u57DF\u540D\u5206\u5E03
        const domainMap = {};
        pages.forEach(p => {
          domainMap[p.hostname] = (domainMap[p.hostname] || 0) + p.totalTime;
        });
        const domains = Object.entries(domainMap)
          .sort((a, b) => b[1] - a[1])
          .map(([host, time]) => ({ host, time, pct: Math.round(time / totalTime * 100) }));
    
        // \u8BC6\u522B\u884C\u4E3A\u6A21\u5F0F
        const patterns = analyzePatterns(pages, domains);
    
        // \u590D\u76D8\u5EFA\u8BAE
        const suggestions = generateSuggestions(patterns, pages, domains, totalTime);
    
        return {
          date: dateStr,
          summary: {
            totalPages: pages.length,
            totalDomains: domains.length,
            totalTime: totalTime,
            formattedTotalTime: formatDuration(totalTime),
            topDomain: domains[0],
            patterns: patterns
          },
          details: {
            pages: pages.slice(0, 15).map(p => ({
              url: p.url,
              title: p.title,
              hostname: p.hostname,
              totalTime: p.totalTime,
              formattedTime: formatDuration(p.totalTime),
              visitCount: p.visitCount,
              maxScrollDepth: p.maxScrollDepth
            })),
            domains: domains.slice(0, 10)
          },
          suggestions: suggestions
        };
      }
    
      // ========== UI \u6837\u5F0F\u6CE8\u5165 ==========
      function injectStyles() {
        if (document.getElementById('wat-styles')) return;
        const style = document.createElement('style');
        style.id = 'wat-styles';
        // \u4F7F\u7528 !important \u548C\u591A\u5C42\u7B56\u7565\u786E\u4FDD\u6700\u9AD8\u5C42\u7EA7
        style.textContent = `
          #${CONFIG.widgetId} {
            position: fixed !important;
            top: 16px !important;
            right: 16px !important;
            width: 340px !important;
            max-height: 540px !important;
            background: ${CONFIG.colors.bg} !important;
            border-radius: 16px !important;
            box-shadow: 0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px ${CONFIG.colors.border} !important;
            z-index: 2147483647 !important;
            /* \u5F3A\u5236\u8131\u79BB\u6240\u6709\u5806\u53E0\u4E0A\u4E0B\u6587 */
            transform: translateZ(0) !important;
            -webkit-transform: translateZ(0) !important;
            contain: layout style paint !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 13px;
            color: ${CONFIG.colors.text};
            overflow: hidden;
            user-select: none;
            transition: width 0.22s ease, height 0.22s ease, max-height 0.22s ease,
              border-radius 0.22s ease, box-shadow 0.22s ease, opacity 0.2s ease, transform 0.2s ease;
            display: flex;
            flex-direction: column;
          }
          #${CONFIG.widgetId}.collapsed {
            width: 50px !important;
            height: 50px !important;
            min-width: 50px !important;
            min-height: 50px !important;
            max-height: 50px !important;
            border-radius: 50% !important;
            cursor: pointer;
            box-shadow: 0 5px 18px rgba(79,70,229,0.42), 0 0 0 1px rgba(255,255,255,0.18) !important;
          }
          #${CONFIG.widgetId}.collapsed:hover {
            transform: translateZ(0) scale(1.06) !important;
            box-shadow: 0 7px 22px rgba(79,70,229,0.55), 0 0 0 1px rgba(255,255,255,0.25) !important;
          }
          #${CONFIG.widgetId}.collapsed .wat-body,
          #${CONFIG.widgetId}.collapsed .wat-footer,
          #${CONFIG.widgetId}.collapsed .wat-tab-bar,
          #${CONFIG.widgetId}.collapsed .wat-title-copy,
          #${CONFIG.widgetId}.collapsed .wat-header-btns {
            display: none;
          }
          #${CONFIG.widgetId}.collapsed .wat-header {
            width: 50px;
            height: 50px;
            min-height: 50px;
            padding: 0;
            justify-content: center;
            border-radius: 50%;
            cursor: pointer;
          }
          #${CONFIG.widgetId}.collapsed .wat-title {
            width: 50px;
            height: 50px;
            justify-content: center;
            gap: 0;
          }
          #${CONFIG.widgetId}.collapsed .wat-title-icon {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: transparent;
            font-size: 22px;
          }
          #${CONFIG.widgetId}.wat-dragging {
            opacity: 0.9;
            cursor: grabbing;
            box-shadow: 0 12px 40px rgba(0,0,0,0.5);
            transition: none;
          }
          .wat-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            min-height: 56px;
            padding: 10px 12px;
            cursor: grab;
            background: linear-gradient(135deg, #4F46E5 0%, #4338CA 56%, #312E81 100%);
            gap: 8px;
            flex-shrink: 0;
          }
          .wat-header:active {
            cursor: grabbing;
          }
          .wat-title {
            display: flex;
            align-items: center;
            gap: 9px;
            font-weight: 600;
            font-size: 13px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .wat-title-icon {
            position: relative;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 10px;
            background: rgba(255,255,255,0.16);
            font-size: 17px;
            flex-shrink: 0;
          }
          .wat-title-icon::after {
            content: '';
            position: absolute;
            right: 1px;
            bottom: 1px;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: ${CONFIG.colors.accent};
            border: 2px solid #4338CA;
            box-shadow: 0 0 0 2px rgba(16,185,129,0.16);
            animation: wat-pulse 2s ease-in-out infinite;
          }
          @keyframes wat-pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.65; transform: scale(0.82); }
          }
          .wat-title-copy {
            min-width: 0;
            display: flex;
            flex-direction: column;
            gap: 1px;
          }
          .wat-title-name {
            color: #fff;
            font-size: 13px;
            font-weight: 700;
            line-height: 1.2;
          }
          .wat-title-status {
            display: flex;
            align-items: center;
            gap: 4px;
            color: rgba(255,255,255,0.7);
            font-size: 10px;
            font-weight: 500;
            font-variant-numeric: tabular-nums;
          }
          .wat-header-btns {
            display: flex;
            gap: 4px;
            flex-shrink: 0;
          }
          .wat-btn {
            width: 26px;
            height: 26px;
            border: none;
            border-radius: 6px;
            background: rgba(255,255,255,0.15);
            color: white;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            transition: background 0.15s;
          }
          .wat-btn:hover {
            background: rgba(255,255,255,0.25);
          }
          .wat-body {
            overflow-y: auto;
            flex: 1;
            min-height: 0;
            scrollbar-width: thin;
            scrollbar-color: ${CONFIG.colors.border} transparent;
          }
          .wat-body::-webkit-scrollbar { width: 4px; }
          .wat-body::-webkit-scrollbar-thumb { background: ${CONFIG.colors.border}; border-radius: 2px; }
          .wat-section {
            padding: 12px;
            border-bottom: 1px solid ${CONFIG.colors.border};
          }
          .wat-section:last-child {
            border-bottom: none;
          }
          .wat-section-title {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: ${CONFIG.colors.textMuted};
            margin-bottom: 8px;
            font-weight: 600;
          }
          .wat-stat-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 4px 0;
          }
          .wat-stat-label {
            color: ${CONFIG.colors.textMuted};
            font-size: 12px;
          }
          .wat-stat-value {
            font-weight: 600;
            font-size: 13px;
            font-variant-numeric: tabular-nums;
          }
          .wat-stat-value.accent { color: ${CONFIG.colors.accent}; }
          .wat-stat-value.warning { color: ${CONFIG.colors.warning}; }
          .wat-current-card {
            padding: 12px;
            border-radius: 12px;
            background: linear-gradient(145deg, rgba(79,70,229,0.16), rgba(15,23,42,0.2));
            border: 1px solid rgba(129,140,248,0.18);
          }
          .wat-current-top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            margin-bottom: 8px;
          }
          .wat-site-pill,
          .wat-live-pill {
            display: inline-flex;
            align-items: center;
            min-width: 0;
            padding: 3px 7px;
            border-radius: 999px;
            font-size: 10px;
            font-weight: 600;
          }
          .wat-site-pill {
            max-width: 190px;
            color: ${CONFIG.colors.primaryLight};
            background: rgba(129,140,248,0.1);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .wat-live-pill {
            flex-shrink: 0;
            gap: 5px;
            color: ${CONFIG.colors.accent};
            background: rgba(16,185,129,0.09);
          }
          .wat-live-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: ${CONFIG.colors.accent};
            box-shadow: 0 0 0 3px rgba(16,185,129,0.12);
          }
          .wat-current-title {
            color: ${CONFIG.colors.text};
            font-size: 13px;
            font-weight: 650;
            line-height: 1.45;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            margin-bottom: 11px;
          }
          .wat-current-metrics {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            margin-bottom: 10px;
          }
          .wat-current-metric {
            padding: 8px 9px;
            border-radius: 9px;
            background: rgba(255,255,255,0.035);
          }
          .wat-current-metric-label {
            display: block;
            color: ${CONFIG.colors.textMuted};
            font-size: 10px;
            margin-bottom: 3px;
          }
          .wat-current-metric-value {
            color: ${CONFIG.colors.text};
            font-size: 14px;
            font-weight: 700;
            font-variant-numeric: tabular-nums;
          }
          .wat-current-metric-value.accent { color: ${CONFIG.colors.accent}; }
          .wat-scroll-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            color: ${CONFIG.colors.textMuted};
            font-size: 10px;
            margin-bottom: 5px;
          }
          .wat-scroll-value {
            color: ${CONFIG.colors.text};
            font-weight: 700;
            font-variant-numeric: tabular-nums;
          }
          .wat-overview-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 7px;
          }
          .wat-overview-card {
            min-width: 0;
            padding: 10px 7px;
            border-radius: 10px;
            background: rgba(255,255,255,0.035);
            border: 1px solid rgba(148,163,184,0.08);
            text-align: center;
          }
          .wat-overview-icon {
            display: block;
            font-size: 15px;
            line-height: 1;
            margin-bottom: 5px;
          }
          .wat-overview-value {
            display: block;
            color: ${CONFIG.colors.text};
            font-size: 13px;
            font-weight: 750;
            line-height: 1.2;
            font-variant-numeric: tabular-nums;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .wat-overview-label {
            display: block;
            color: ${CONFIG.colors.textMuted};
            font-size: 9px;
            margin-top: 3px;
          }
          .wat-focus-strip {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            margin-top: 9px;
            padding: 8px 9px;
            border-radius: 9px;
            color: ${CONFIG.colors.textMuted};
            background: rgba(0,0,0,0.12);
            font-size: 10px;
          }
          .wat-focus-value {
            min-width: 0;
            color: ${CONFIG.colors.primaryLight};
            font-weight: 650;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .wat-page-item {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 0;
            border-bottom: 1px solid rgba(148,163,184,0.08);
          }
          .wat-page-item:last-child { border-bottom: none; }
          .wat-page-rank {
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 7px;
            color: ${CONFIG.colors.primaryLight};
            background: rgba(129,140,248,0.11);
            font-size: 9px;
            font-weight: 750;
            flex-shrink: 0;
          }
          .wat-page-info {
            flex: 1;
            min-width: 0;
          }
          .wat-page-title {
            font-size: 12px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .wat-page-url {
            font-size: 11px;
            color: ${CONFIG.colors.textMuted};
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .wat-page-time {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 1px;
            font-size: 11px;
            font-weight: 600;
            color: ${CONFIG.colors.accent};
            flex-shrink: 0;
            font-variant-numeric: tabular-nums;
          }
          .wat-page-visits {
            color: ${CONFIG.colors.textMuted};
            font-size: 9px;
            font-weight: 500;
          }
          .wat-progress-bar {
            height: 4px;
            background: rgba(148,163,184,0.15);
            border-radius: 2px;
            overflow: hidden;
            margin-top: 4px;
          }
          .wat-progress-fill {
            height: 100%;
            background: linear-gradient(90deg, ${CONFIG.colors.primary}, ${CONFIG.colors.accent});
            border-radius: 2px;
            transition: width 0.5s ease;
          }
          .wat-suggestion {
            display: flex;
            gap: 10px;
            padding: 10px;
            background: rgba(255,255,255,0.03);
            border-radius: 8px;
            margin-top: 6px;
            border-left: 3px solid ${CONFIG.colors.primary};
          }
          .wat-suggestion.success { border-left-color: ${CONFIG.colors.accent}; }
          .wat-suggestion.warning { border-left-color: ${CONFIG.colors.warning}; }
          .wat-suggestion.info { border-left-color: ${CONFIG.colors.primaryLight}; }
          .wat-sugg-icon { font-size: 18px; flex-shrink: 0; line-height: 1; }
          .wat-sugg-body { flex: 1; min-width: 0; }
          .wat-sugg-title { font-weight: 600; font-size: 12px; margin-bottom: 2px; }
          .wat-sugg-desc { font-size: 11px; color: ${CONFIG.colors.textMuted}; line-height: 1.4; }
          .wat-sugg-action { font-size: 10px; color: ${CONFIG.colors.primaryLight}; margin-top: 4px; font-style: italic; }
          .wat-footer {
            padding: 9px 12px 11px;
            border-top: 1px solid ${CONFIG.colors.border};
            display: flex;
            gap: 6px;
            flex-shrink: 0;
            background: rgba(0,0,0,0.1);
          }
          .wat-action-btn {
            flex: 1;
            min-height: 32px;
            padding: 7px 10px;
            border: 1px solid ${CONFIG.colors.border};
            border-radius: 8px;
            background: transparent;
            color: ${CONFIG.colors.textMuted};
            font-size: 11px;
            cursor: pointer;
            transition: all 0.15s;
            text-align: center;
          }
          .wat-action-btn:hover {
            background: rgba(255,255,255,0.05);
            color: ${CONFIG.colors.text};
            border-color: ${CONFIG.colors.primaryLight};
          }
          .wat-action-btn.primary {
            flex: 1.65;
            color: #fff;
            border-color: rgba(129,140,248,0.4);
            background: linear-gradient(135deg, ${CONFIG.colors.primary}, #4338CA);
            font-weight: 650;
          }
          .wat-action-btn.primary:hover {
            border-color: rgba(165,180,252,0.7);
            background: linear-gradient(135deg, #5B52EA, #4F46E5);
          }
          .wat-action-btn.compact {
            flex: 0 0 36px;
            width: 36px;
            padding: 7px 0;
            font-size: 13px;
          }
          .wat-badge {
            display: inline-flex;
            align-items: center;
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 10px;
            font-weight: 600;
          }
          .wat-badge-primary { background: ${CONFIG.colors.primary}; color: white; }
          .wat-badge-accent { background: rgba(16,185,129,0.15); color: ${CONFIG.colors.accent}; }
          .wat-badge-warning { background: rgba(245,158,11,0.15); color: ${CONFIG.colors.warning}; }
          .wat-report-panel {
            padding: 14px;
          }
          .wat-report-header {
            text-align: center;
            margin-bottom: 14px;
          }
          .wat-report-date {
            font-size: 16px;
            font-weight: 700;
            color: ${CONFIG.colors.text};
          }
          .wat-report-summary {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            margin-bottom: 14px;
          }
          .wat-report-stat {
            background: rgba(255,255,255,0.04);
            border-radius: 8px;
            padding: 10px;
            text-align: center;
          }
          .wat-report-stat-value {
            font-size: 18px;
            font-weight: 700;
            color: ${CONFIG.colors.primaryLight};
          }
          .wat-report-stat-label {
            font-size: 10px;
            color: ${CONFIG.colors.textMuted};
            margin-top: 2px;
          }
          .wat-domain-bar {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 5px 0;
          }
          .wat-domain-name {
            width: 100px;
            font-size: 11px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .wat-domain-track {
            flex: 1;
            height: 6px;
            background: rgba(148,163,184,0.12);
            border-radius: 3px;
            overflow: hidden;
          }
          .wat-domain-fill {
            height: 100%;
            border-radius: 3px;
            background: linear-gradient(90deg, ${CONFIG.colors.primary}, ${CONFIG.colors.accent});
          }
          .wat-domain-pct {
            width: 32px;
            text-align: right;
            font-size: 11px;
            font-weight: 600;
            color: ${CONFIG.colors.textMuted};
            font-variant-numeric: tabular-nums;
          }
          .wat-empty-state {
            text-align: center;
            padding: 28px 20px;
            color: ${CONFIG.colors.textMuted};
          }
          .wat-empty-icon { font-size: 36px; margin-bottom: 8px; }
          .wat-empty-text { font-size: 13px; }
          .wat-tab-bar {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            padding: 4px 8px 0;
            border-bottom: 1px solid ${CONFIG.colors.border};
            background: rgba(0,0,0,0.15);
            flex-shrink: 0;
          }
          .wat-tab {
            padding: 8px 6px 7px;
            font-size: 11px;
            font-weight: 600;
            color: ${CONFIG.colors.textMuted};
            cursor: pointer;
            border-bottom: 2px solid transparent;
            transition: all 0.15s;
            background: none;
            border-top: none;
            border-left: none;
            border-right: none;
          }
          .wat-tab:hover { color: ${CONFIG.colors.text}; }
          .wat-tab.active {
            color: ${CONFIG.colors.primaryLight};
            border-bottom-color: ${CONFIG.colors.primaryLight};
          }
          .wat-tab-content { display: none; }
          .wat-tab-content.active { display: block; }
        `;
        document.head.appendChild(style);
      }
    
      // ========== UI \u6E32\u67D3 ==========
      function createWidget(data) {
        // \u79FB\u9664\u5DF2\u6709\u5B9E\u4F8B
        const existing = document.getElementById(CONFIG.widgetId);
        if (existing) existing.remove();
    
        injectStyles();
    
        const widget = document.createElement('div');
        widget.id = CONFIG.widgetId;
    
        // \u5F3A\u5236\u5185\u8054\u6837\u5F0F\u786E\u4FDD\u6700\u9AD8\u5C42\u7EA7\uFF0C\u8986\u76D6\u6240\u6709\u53EF\u80FD\u7684CSS\u89C4\u5219
        Object.assign(widget.style, {
          position: 'fixed',
          top: '16px',
          right: '16px',
          width: '340px',
          maxHeight: '540px',
          zIndex: '2147483647',
          transform: 'translateZ(0)',
          contain: 'layout style paint'
        });

        // \u6BCF\u6B21\u542F\u52A8\u90FD\u5148\u4EE5\u8FF7\u4F60\u5706\u5F62\u60AC\u6D6E\u7403\u663E\u793A
        widget.classList.add('collapsed');
        widget.innerHTML = renderWidgetHTML(data);
    
        // \u8FFD\u52A0\u5230 body \u672B\u5C3E\uFF0C\u786E\u4FDD\u5728\u6240\u6709\u5176\u4ED6\u5143\u7D20\u4E4B\u540E\u6E32\u67D3
        if (document.body) {
          document.body.appendChild(widget);
        } else {
          // body \u5C1A\u672A\u5C31\u7EEA\u65F6\u7B49\u5F85
          document.addEventListener('DOMContentLoaded', () => {
            document.body.appendChild(widget);
          });
        }
    
        setupDrag(widget);
        setupEvents(widget, data);

        // \u6CE8\u518C\u952E\u76D8\u5FEB\u6377\u952E Alt+W \u5207\u6362\u5C55\u5F00/\u60AC\u6D6E\u7403
        registerKeyboardShortcut(widget);
    
        return widget;
      }
    
      function renderWidgetHTML(data) {
        const session = getOrCreateTodaySession(data);
        const currentPage = session.pages.find(p => p.url === location.href);
        const elapsed = currentPage ? formatDuration(currentPage.totalTime) : '0\u79D2';
        const scrollDepth = getScrollDepth();
        const totalPages = session.pages.length;
        const totalTime = formatDuration(session.totalActiveTime);
        const totalDomains = new Set(session.pages.map(p => p.hostname).filter(Boolean)).size;
        const mostVisited = [...session.pages].sort((a, b) => b.totalTime - a.totalTime)[0];
        const currentTitle = escapeHTML(currentPage?.title || document.title || '\u672A\u77E5\u9875\u9762');
        const currentHost = escapeHTML(currentPage?.hostname || location.hostname || '\u672C\u5730\u9875\u9762');
        const focusHost = mostVisited ? escapeHTML(mostVisited.hostname || '\u672A\u77E5\u7AD9\u70B9') : '\u6B63\u5728\u79EF\u7D2F\u6570\u636E';
        const focusTime = mostVisited ? formatDuration(mostVisited.totalTime) : '';
    
        return `
          <div class="wat-header" data-wat-drag="true" title="\u62D6\u52A8\u8C03\u6574\u4F4D\u7F6E\uFF0C\u70B9\u51FB\u60AC\u6D6E\u7403\u5C55\u5F00">
            <div class="wat-title">
              <span class="wat-title-icon">\uD83D\uDD0D</span>
              <span class="wat-title-copy">
                <span class="wat-title-name">\u4F60\u5728\u5E72\u561B</span>
                <span class="wat-title-status">\u6B63\u5728\u8BB0\u5F55 \u00B7 <span data-wat-value="clock">${formatTime(Date.now())}</span></span>
              </span>
            </div>
            <div class="wat-header-btns">
              <button class="wat-btn" data-wat-action="report" title="\u4ECA\u65E5\u7B80\u62A5">\uD83D\uDCCA</button>
              <button class="wat-btn" data-wat-action="collapse" title="\u7F29\u6210\u60AC\u6D6E\u7403" aria-label="\u7F29\u6210\u60AC\u6D6E\u7403">\u2212</button>
            </div>
          </div>
          <div class="wat-tab-bar">
            <button class="wat-tab active" data-wat-tab="live">\u25C9 \u6982\u89C8</button>
            <button class="wat-tab" data-wat-tab="pages">\u25A4 \u8DB3\u8FF9</button>
            <button class="wat-tab" data-wat-tab="tips">\u2726 \u590D\u76D8</button>
          </div>
          <div class="wat-body">
            <div class="wat-tab-content active" data-wat-panel="live">
              <div class="wat-section">
                <div class="wat-section-title">\uD83D\uDCCD \u6B63\u5728\u6D4F\u89C8</div>
                <div class="wat-current-card">
                  <div class="wat-current-top">
                    <span class="wat-site-pill">\uD83C\uDF10 ${currentHost}</span>
                    <span class="wat-live-pill"><span class="wat-live-dot"></span>\u8FFD\u8E2A\u4E2D</span>
                  </div>
                  <div class="wat-current-title" title="${currentTitle}">${currentTitle}</div>
                  <div class="wat-current-metrics">
                    <div class="wat-current-metric">
                      <span class="wat-current-metric-label">\u672C\u9875\u505C\u7559</span>
                      <span class="wat-current-metric-value accent" data-wat-value="current-page-time">${elapsed}</span>
                    </div>
                    <div class="wat-current-metric">
                      <span class="wat-current-metric-label">\u4ECA\u65E5\u8BBF\u95EE</span>
                      <span class="wat-current-metric-value" data-wat-value="page-count">${totalPages} \u9875</span>
                    </div>
                  </div>
                  <div class="wat-scroll-head">
                    <span>\u9605\u8BFB\u8FDB\u5EA6</span>
                    <span class="wat-scroll-value" data-wat-value="scroll-depth">${scrollDepth}%</span>
                  </div>
                  <div class="wat-progress-bar">
                    <div class="wat-progress-fill" data-wat-value="scroll-progress" style="width:${scrollDepth}%"></div>
                  </div>
                </div>
              </div>
              <div class="wat-section">
                <div class="wat-section-title">\uD83D\uDCC8 \u4ECA\u65E5\u6982\u89C8</div>
                <div class="wat-overview-grid">
                  <div class="wat-overview-card">
                    <span class="wat-overview-icon">\u23F1\uFE0F</span>
                    <span class="wat-overview-value" data-wat-value="total-time">${totalTime}</span>
                    <span class="wat-overview-label">\u6D3B\u8DC3\u65F6\u957F</span>
                  </div>
                  <div class="wat-overview-card">
                    <span class="wat-overview-icon">\uD83D\uDCC4</span>
                    <span class="wat-overview-value" data-wat-value="overview-page-count">${totalPages}</span>
                    <span class="wat-overview-label">\u6D4F\u89C8\u9875\u9762</span>
                  </div>
                  <div class="wat-overview-card">
                    <span class="wat-overview-icon">\uD83C\uDF10</span>
                    <span class="wat-overview-value" data-wat-value="domain-count">${totalDomains}</span>
                    <span class="wat-overview-label">\u8BBF\u95EE\u7AD9\u70B9</span>
                  </div>
                </div>
                <div class="wat-focus-strip">
                  <span>\u4ECA\u65E5\u505C\u7559\u6700\u4E45</span>
                  <span class="wat-focus-value" title="${focusHost}">${focusHost}${focusTime ? ` \u00B7 ${focusTime}` : ''}</span>
                </div>
              </div>
            </div>
    
            <div class="wat-tab-content" data-wat-panel="pages">
              <div class="wat-section">
                <div class="wat-section-title">\uD83D\uDCC4 \u9875\u9762\u6392\u884C \u00B7 ${totalPages} \u6761\u8BB0\u5F55</div>
                ${renderPagesList(session.pages)}
              </div>
            </div>
    
            <div class="wat-tab-content" data-wat-panel="tips">
              <div class="wat-section">
                <div class="wat-section-title">\uD83D\uDCA1 \u6839\u636E\u4ECA\u65E5\u6D4F\u89C8\u751F\u6210</div>
                <div id="wat-suggestions-container">
                  ${renderSuggestions(data, session)}
                </div>
              </div>
            </div>
          </div>
          <div class="wat-footer">
            ${renderFooterActions()}
          </div>
        `;
      }

      function renderFooterActions() {
        return `
          <button class="wat-action-btn primary" data-wat-action="report">\uD83D\uDCCA \u67E5\u770B\u4ECA\u65E5\u7B80\u62A5</button>
          <button class="wat-action-btn compact" data-wat-action="export" title="\u5BFC\u51FA\u6570\u636E" aria-label="\u5BFC\u51FA\u6570\u636E">\uD83D\uDCE4</button>
          <button class="wat-action-btn compact" data-wat-action="clear" title="\u6E05\u9664\u6570\u636E" aria-label="\u6E05\u9664\u6570\u636E">\uD83D\uDDD1\uFE0F</button>
        `;
      }
    
      function renderPagesList(pages) {
        if (!pages || pages.length === 0) {
          return `<div class="wat-empty-state"><div class="wat-empty-icon">\uD83D\uDCED</div><div class="wat-empty-text">\u6682\u65E0\u9875\u9762\u8BB0\u5F55</div></div>`;
        }
        const sorted = [...pages].sort((a, b) => b.totalTime - a.totalTime).slice(0, 10);
        return sorted.map((p, index) => `
          <div class="wat-page-item">
            <div class="wat-page-rank">${index + 1}</div>
            <div class="wat-page-info">
              <div class="wat-page-title" title="${escapeHTML(p.title || '\u65E0\u6807\u9898')}">${escapeHTML(p.title || '\u65E0\u6807\u9898')}</div>
              <div class="wat-page-url">${escapeHTML(p.hostname || '')}</div>
            </div>
            <div class="wat-page-time">
              <span>${formatDuration(p.totalTime)}</span>
              <span class="wat-page-visits">\u8BBF\u95EE ${p.visitCount || 1} \u6B21</span>
            </div>
          </div>
        `).join('');
      }
    
      function renderSuggestions(data, session) {
        const report = generateDailyReport(data, session.date);
        if (!report.suggestions || report.suggestions.length === 0) {
          return `<div class="wat-empty-state"><div class="wat-empty-icon">\u2728</div><div class="wat-empty-text">\u7EE7\u7EED\u79EF\u7D2F\u6570\u636E\u4E2D...</div></div>`;
        }
        return report.suggestions.map(s => `
          <div class="wat-suggestion ${s.type}">
            <div class="wat-sugg-icon">${s.icon}</div>
            <div class="wat-sugg-body">
              <div class="wat-sugg-title">${s.title}</div>
              <div class="wat-sugg-desc">${s.desc}</div>
              <div class="wat-sugg-action">\u2192 ${s.action}</div>
            </div>
          </div>
        `).join('');
      }
    
      function renderReportPanel(report) {
        if (!report.details) {
          return `<div class="wat-empty-state"><div class="wat-empty-icon">\uD83D\uDCED</div><div class="wat-empty-text">${report.summary}</div></div>`;
        }
    
        const s = report.summary;
        return `
          <div class="wat-report-header">
            <div class="wat-report-date">\uD83D\uDCCA ${report.date} \u6BCF\u65E5\u7B80\u62A5</div>
          </div>
          <div class="wat-report-summary">
            <div class="wat-report-stat">
              <div class="wat-report-stat-value">${s.formattedTotalTime}</div>
              <div class="wat-report-stat-label">\u603B\u6D3B\u8DC3\u65F6\u957F</div>
            </div>
            <div class="wat-report-stat">
              <div class="wat-report-stat-value">${s.totalPages}</div>
              <div class="wat-report-stat-label">\u8BBF\u95EE\u9875\u9762</div>
            </div>
            <div class="wat-report-stat">
              <div class="wat-report-stat-value">${s.totalDomains}</div>
              <div class="wat-report-stat-label">\u6D89\u53CA\u57DF\u540D</div>
            </div>
            <div class="wat-report-stat">
              <div class="wat-report-stat-value">${s.topDomain?.pct || 0}%</div>
              <div class="wat-report-stat-label">\u6700\u9AD8\u5360\u6BD4</div>
            </div>
          </div>
          <div class="wat-section">
            <div class="wat-section-title">\uD83C\uDF10 \u57DF\u540D\u5206\u5E03 TOP 5</div>
            ${(report.details.domains || []).slice(0, 5).map(d => `
              <div class="wat-domain-bar">
                <div class="wat-domain-name" title="${d.host}">${d.host}</div>
                <div class="wat-domain-track"><div class="wat-domain-fill" style="width:${d.pct}%"></div></div>
                <div class="wat-domain-pct">${d.pct}%</div>
              </div>
            `).join('')}
          </div>
          <div class="wat-section">
            <div class="wat-section-title">\uD83D\uDCA1 \u590D\u76D8\u5EFA\u8BAE</div>
            ${(report.suggestions || []).map(s => `
              <div class="wat-suggestion ${s.type}">
                <div class="wat-sugg-icon">${s.icon}</div>
                <div class="wat-sugg-body">
                  <div class="wat-sugg-title">${s.title}</div>
                  <div class="wat-sugg-desc">${s.desc}</div>
                </div>
              </div>
            `).join('')}
          </div>
        `;
      }
    
      // ========== \u4EA4\u4E92\u903B\u8F91 ==========
      function setupDrag(widget) {
        const header = widget.querySelector('.wat-header');
        let isDragging = false;
        let startX, startY, initLeft, initTop;
    
        header.addEventListener('mousedown', (e) => {
          if (e.target.closest('[data-wat-action]')) return;
          isDragging = true;
          widget.classList.add('wat-dragging');
          const rect = widget.getBoundingClientRect();
          startX = e.clientX;
          startY = e.clientY;
          initLeft = rect.left;
          initTop = rect.top;
          widget._dragMoved = false;
          e.preventDefault();
        });
    
        document.addEventListener('mousemove', (e) => {
          if (!isDragging) return;
          const dx = e.clientX - startX;
          const dy = e.clientY - startY;
          if (Math.abs(dx) > 4 || Math.abs(dy) > 4) widget._dragMoved = true;
          const rect = widget.getBoundingClientRect();
          const nextLeft = Math.max(8, Math.min(window.innerWidth - rect.width - 8, initLeft + dx));
          const nextTop = Math.max(8, Math.min(window.innerHeight - rect.height - 8, initTop + dy));
          widget.style.setProperty('left', `${nextLeft}px`, 'important');
          widget.style.setProperty('top', `${nextTop}px`, 'important');
          widget.style.setProperty('right', 'auto', 'important');
        });
    
        document.addEventListener('mouseup', () => {
          if (isDragging) {
            isDragging = false;
            widget.classList.remove('wat-dragging');
          }
        });
    
        // Touch support
        header.addEventListener('touchstart', (e) => {
          if (e.target.closest('[data-wat-action]')) return;
          isDragging = true;
          widget.classList.add('wat-dragging');
          const touch = e.touches[0];
          const rect = widget.getBoundingClientRect();
          startX = touch.clientX;
          startY = touch.clientY;
          initLeft = rect.left;
          initTop = rect.top;
          widget._dragMoved = false;
        }, { passive: true });
    
        document.addEventListener('touchmove', (e) => {
          if (!isDragging) return;
          const touch = e.touches[0];
          const dx = touch.clientX - startX;
          const dy = touch.clientY - startY;
          if (Math.abs(dx) > 4 || Math.abs(dy) > 4) widget._dragMoved = true;
          const rect = widget.getBoundingClientRect();
          const nextLeft = Math.max(8, Math.min(window.innerWidth - rect.width - 8, initLeft + dx));
          const nextTop = Math.max(8, Math.min(window.innerHeight - rect.height - 8, initTop + dy));
          widget.style.setProperty('left', `${nextLeft}px`, 'important');
          widget.style.setProperty('top', `${nextTop}px`, 'important');
          widget.style.setProperty('right', 'auto', 'important');
        }, { passive: true });
    
        document.addEventListener('touchend', () => {
          if (isDragging) {
            isDragging = false;
            widget.classList.remove('wat-dragging');
          }
        });
      }
    
      function setupEvents(widget, data) {
        // \u6298\u53E0/\u5C55\u5F00
        widget.addEventListener('click', (e) => {
          // \u8FF7\u4F60\u5706\u7403\u6574\u4F53\u90FD\u662F\u5C55\u5F00\u6309\u94AE\uFF1B\u62D6\u52A8\u540E\u4E0D\u8BEF\u89E6\u5C55\u5F00
          if (widget.classList.contains('collapsed') && !e.target.closest('[data-wat-action]')) {
            if (widget._dragMoved) {
              widget._dragMoved = false;
              return;
            }
            widget.classList.remove('collapsed');
            return;
          }

          const actionEl = e.target.closest('[data-wat-action]');
          if (!actionEl) return;
          const action = actionEl.dataset.watAction;
    
          switch (action) {
            case 'collapse':
              widget.classList.add('collapsed');
              break;
    
            case 'report':
              showReportPanel(widget, loadData());
              break;
    
            case 'back':
              // \u4ECE\u6BCF\u65E5\u7B80\u62A5\u8FD4\u56DE\u4E3B\u754C\u9762
              const bodyEl = widget.querySelector('.wat-body');
              if (widget._originalBodyHTML) {
                bodyEl.innerHTML = widget._originalBodyHTML;
                widget._originalBodyHTML = null;
              }
              // \u6062\u590D\u539F\u59CBfooter\u6309\u94AE
              const footEl = widget.querySelector('.wat-footer');
              if (footEl) {
                footEl.innerHTML = renderFooterActions();
              }
              break;
    
            case 'toggle':
              widget.classList.toggle('collapsed');
              break;
    
            case 'export':
              exportData(loadData());
              break;
    
            case 'clear':
              if (confirm('\u786E\u5B9A\u8981\u6E05\u9664\u6240\u6709\u8FFD\u8E2A\u6570\u636E\u5417\uFF1F')) {
                localStorage.removeItem(CONFIG.storageKey);
                location.reload();
              }
              break;
          }
        });
    
        // Tab \u5207\u6362
        widget.addEventListener('click', (e) => {
          const tabEl = e.target.closest('[data-wat-tab]');
          if (!tabEl) return;
          const tabId = tabEl.dataset.watTab;
    
          widget.querySelectorAll('.wat-tab').forEach(t => t.classList.remove('active'));
          widget.querySelectorAll('.wat-tab-content').forEach(c => c.classList.remove('active'));
          tabEl.classList.add('active');
          widget.querySelector(`[data-wat-panel="${tabId}"]`)?.classList.add('active');
        });
      }
    
      // ========== \u952E\u76D8\u5FEB\u6377\u952E ==========
      function registerKeyboardShortcut(widget) {
        document.addEventListener('keydown', (e) => {
          // Alt+W \u6216 Ctrl+Shift+W \u5207\u6362\u5C55\u5F00/\u8FF7\u4F60\u60AC\u6D6E\u7403
          if ((e.altKey && e.key === 'w') || (e.ctrlKey && e.shiftKey && e.key === 'W')) {
            e.preventDefault();
            e.stopPropagation();
            widget.classList.toggle('collapsed');
          }
    
          // Escape \u952E\uFF1A\u5982\u679C\u5728\u7B80\u62A5\u9875\u9762\u5219\u8FD4\u56DE\uFF0C\u5426\u5219\u7F29\u6210\u5706\u5F62\u60AC\u6D6E\u7403
          if (e.key === 'Escape') {
            if (widget._originalBodyHTML) {
              // \u5728\u7B80\u62A5\u9875\u9762 \u2192 \u8FD4\u56DE\u4E3B\u754C\u9762
              const backBtn = widget.querySelector('[data-wat-action="back"]');
              if (backBtn) backBtn.click();
            } else {
              widget.classList.add('collapsed');
            }
          }
        }, true); // \u6355\u83B7\u9636\u6BB5\uFF0C\u786E\u4FDD\u4F18\u5148\u5904\u7406
      }
    
      function showReportPanel(widget, data) {
        const report = generateDailyReport(data, getTodayStr());
        const body = widget.querySelector('.wat-body');
    
        // \u4FDD\u5B58\u539F\u59CB\u5185\u5BB9\u4EE5\u4FBF\u8FD4\u56DE
        if (!widget._originalBodyHTML) {
          widget._originalBodyHTML = body.innerHTML;
        }
    
        body.innerHTML = `<div class="wat-report-panel">${renderReportPanel(report)}</div>`;
    
        // \u66FF\u6362footer\u6309\u94AE\u4E3A\u8FD4\u56DE
        const footer = widget.querySelector('.wat-footer');
        footer.innerHTML = `
          <button class="wat-action-btn" data-wat-action="back">\u2190 \u8FD4\u56DE</button>
          <button class="wat-action-btn" data-wat-action="export">\uD83D\uDCE4 \u5BFC\u51FA</button>
        `;
      }
    
      function exportData(data) {
        try {
          const report = generateDailyReport(data, getTodayStr());
          const exportObj = {
            exportedAt: new Date().toISOString(),
            ...report
          };
          const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `web-activity-${getTodayStr()}.json`;
          a.click();
          URL.revokeObjectURL(url);
        } catch (e) {
          alert('\u5BFC\u51FA\u5931\u8D25: ' + e.message);
        }
      }
    
      // ========== \u4E3B\u5FAA\u73AF ==========
      function startTracking() {
        const data = loadData();
        const pageInfo = getPageIdentity();
        recordPageVisit(data, pageInfo);
        const widget = createWidget(data);
        let lastListUpdate = 0;
    
        // \u65F6\u949F\u66F4\u65B0
        setInterval(() => {
          const clock = widget.querySelector('[data-wat-value="clock"]');
          if (clock) clock.textContent = formatTime(Date.now());
        }, 1000);
    
        // \u6D3B\u52A8\u8BA1\u65F6\u5668
        setInterval(() => {
          const d = loadData();
          const pi = getPageIdentity();
          updatePageActivity(d, pi);
    
          // \u66F4\u65B0\u5B9E\u65F6\u663E\u793A
          const session = getOrCreateTodaySession(d);
          const cp = session.pages.find(p => p.url === location.href);
          const depth = getScrollDepth();
          if (cp) {
            const el = widget.querySelector('[data-wat-value="current-page-time"]');
            if (el) el.textContent = formatDuration(cp.totalTime);
          }

          const ttl = widget.querySelector('[data-wat-value="total-time"]');
          if (ttl) ttl.textContent = formatDuration(session.totalActiveTime);

          const pageCount = widget.querySelector('[data-wat-value="page-count"]');
          if (pageCount) pageCount.textContent = `${session.pages.length} \u9875`;

          const overviewPageCount = widget.querySelector('[data-wat-value="overview-page-count"]');
          if (overviewPageCount) overviewPageCount.textContent = String(session.pages.length);

          const domainCount = widget.querySelector('[data-wat-value="domain-count"]');
          if (domainCount) {
            domainCount.textContent = String(new Set(session.pages.map(p => p.hostname).filter(Boolean)).size);
          }

          const scrollValue = widget.querySelector('[data-wat-value="scroll-depth"]');
          if (scrollValue) scrollValue.textContent = `${depth}%`;
          const scrollProgress = widget.querySelector('[data-wat-value="scroll-progress"]');
          if (scrollProgress) scrollProgress.style.width = `${depth}%`;
    
          // \u66F4\u65B0\u9875\u9762\u5217\u8868\uFF08\u6BCF30\u79D2\u5237\u65B0\u4E00\u6B21\uFF09
          const pagesPanel = widget?.querySelector('[data-wat-panel="pages"]');
          if (pagesPanel && Date.now() - lastListUpdate > 30000) {
            const listContainer = pagesPanel.querySelector('.wat-section');
            if (listContainer) listContainer.innerHTML =
              `<div class="wat-section-title">\uD83D\uDCC4 \u9875\u9762\u6392\u884C \u00B7 ${session.pages.length} \u6761\u8BB0\u5F55</div>` +
              renderPagesList(session.pages);
            lastListUpdate = Date.now();

            const topPage = [...session.pages].sort((a, b) => b.totalTime - a.totalTime)[0];
            const focusEl = widget.querySelector('.wat-focus-value');
            if (focusEl && topPage) {
              focusEl.textContent = `${topPage.hostname || '\u672A\u77E5\u7AD9\u70B9'} \u00B7 ${formatDuration(topPage.totalTime)}`;
              focusEl.title = topPage.hostname || '\u672A\u77E5\u7AD9\u70B9';
            }
          }
        }, CONFIG.tickInterval);
    
        // \u5185\u5BB9\u53D8\u5316\u68C0\u6D4B
        setInterval(() => {
          const d = loadData();
          const pi = getPageIdentity();
          const session = getOrCreateTodaySession(d);
          const pr = session.pages.find(p => p.url === pi.url);
          if (pr && pr.title !== pi.title) {
            recordPageVisit(d, pi);
          }
        }, CONFIG.contentCheckInterval);
    
        // \u53EF\u89C1\u6027\u53D8\u5316\u5904\u7406
        document.addEventListener('visibilitychange', () => {
          if (!document.hidden) {
            const d = loadData();
            const pi = getPageIdentity();
            recordPageVisit(d, pi);
          }
        });
    
        // \u9875\u9762\u5378\u8F7D\u524D\u4FDD\u5B58
        window.addEventListener('beforeunload', () => {
          const d = loadData();
          const pi = getPageIdentity();
          updatePageActivity(d, pi);
          saveData(d);
        });
    
        return {
          ok: true,
          summary: '\u7F51\u9875\u6D3B\u52A8\u8FFD\u8E2A\u5668\u5DF2\u542F\u52A8 \u00B7 \u60AC\u6D6E\u7A97\u663E\u793A\u5728\u53F3\u4E0A\u89D2\uFF0C\u53EF\u62D6\u62FD\u79FB\u52A8',
          data: {
            widgetId: CONFIG.widgetId,
            storageKey: CONFIG.storageKey,
            todaySession: getTodayStr(),
            features: ['\u5B9E\u65F6\u8BA1\u65F6', '\u9875\u9762\u505C\u7559\u8FFD\u8E2A', '\u6EDA\u52A8\u6DF1\u5EA6\u8BB0\u5F55', '\u5185\u5BB9\u53D8\u5316\u68C0\u6D4B', '\u6BCF\u65E5\u7B80\u62A5', '\u590D\u76D8\u5EFA\u8BAE', '\u6570\u636E\u5BFC\u51FA']
          }
        };
      }
    
      // \u542F\u52A8
      return startTracking();
    }
  );
  if (typeof __tabOriginalFunction !== "function") {
    throw new Error("evaluate_script source must evaluate to a function");
  }
  return await __tabOriginalFunction();
})();