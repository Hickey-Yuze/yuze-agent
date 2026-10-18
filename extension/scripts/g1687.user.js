(async function __tabEvaluateScriptBridge() {
  const __tabScriptArgs = null;
  const __tabOriginalFunction = (
    async function run(args) {
      // ── 防止重复注入 ──────────────────────────────────────────────
      if (document.getElementById('xhs-douyin-feed-overlay')) {
        document.getElementById('xhs-douyin-feed-overlay').remove();
        document.body.style.overflow = '';
        return { ok: true, summary: '已关闭抖音Feed流模式' };
      }
    
      // ── 1. 采集帖子数据 ───────────────────────────────────────────
      const selectors = [
        'section.note-item',
        '.note-item',
        'a.cover[href*="/explore/"]',
        '.feeds-page .note-item',
        '[class*="note-item"]',
        '.note',
        '[data-v] section',
      ];
    
      let cards = [];
      for (const sel of selectors) {
        cards = Array.from(document.querySelectorAll(sel));
        if (cards.length > 0) break;
      }
    
      // 备用：直接找所有带图片的链接卡片
      if (cards.length === 0) {
        cards = Array.from(document.querySelectorAll('a[href*="/explore/"]'))
          .filter(a => a.querySelector('img'));
      }
    
      const posts = [];
      cards.forEach((card, i) => {
        const img = card.querySelector('img[src], img[data-src]');
        const imgSrc = img ? (img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || '') : '';
        
        // 标题
        const titleEl = card.querySelector('[class*="title"], [class*="desc"], .title, .desc, footer a, .name');
        const title = titleEl ? titleEl.textContent.trim() : ('帖子 ' + (i + 1));
        
        // 用户名
        const userEl = card.querySelector('[class*="author"], [class*="user"], [class*="nickname"], .author, .user');
        const username = userEl ? userEl.textContent.trim() : ('用户' + (i + 1));
        
        // 头像
        const avatarEl = card.querySelector('img[class*="avatar"], img[class*="user"], [class*="avatar"] img');
        const avatarSrc = avatarEl ? (avatarEl.src || '') : '';
        
        // 点赞数
        const likeEl = card.querySelector('[class*="like"] span, [class*="count"], .like-wrapper span, .interactions span');
        const likeCount = likeEl ? likeEl.textContent.trim() : Math.floor(Math.random() * 9000 + 100) + '';
        
        // 链接
        const linkEl = card.closest('a[href]') || card.querySelector('a[href]');
        const href = linkEl ? linkEl.href : '#';
        
        if (imgSrc || title) {
          posts.push({ imgSrc, title, username, avatarSrc, likeCount, href, index: i });
        }
      });
    
      if (posts.length === 0) {
        return { ok: false, summary: '未找到帖子卡片，请确认在小红书首页', posts_found: 0 };
      }
    
      // ── 2. 注入样式 ───────────────────────────────────────────────
      const style = document.createElement('style');
      style.id = 'xhs-douyin-feed-style';
      style.textContent = `
        #xhs-douyin-feed-overlay {
          position: fixed;
          inset: 0;
          z-index: 999999;
          background: #000;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          font-family: -apple-system, 'PingFang SC', 'Helvetica Neue', sans-serif;
        }
    
        /* ── 顶部栏 ── */
        #xhs-df-topbar {
          position: absolute;
          top: 0; left: 0; right: 0;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px 0;
          background: linear-gradient(to bottom, rgba(0,0,0,.55) 0%, transparent 100%);
        }
        #xhs-df-tabs {
          display: flex;
          gap: 24px;
          align-items: center;
        }
        .xhs-df-tab {
          color: rgba(255,255,255,.65);
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          padding-bottom: 4px;
          border-bottom: 2px solid transparent;
          transition: all .2s;
        }
        .xhs-df-tab.active {
          color: #fff;
          font-weight: 700;
          border-bottom-color: #fff;
        }
        #xhs-df-close {
          color: rgba(255,255,255,.8);
          font-size: 24px;
          cursor: pointer;
          padding: 4px 8px;
          line-height: 1;
          border-radius: 50%;
          transition: background .2s;
        }
        #xhs-df-close:hover { background: rgba(255,255,255,.15); }
    
        /* ── 帖子容器（竖向滑动轴）── */
        #xhs-df-feed {
          flex: 1;
          overflow-y: scroll;
          scroll-snap-type: y mandatory;
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        #xhs-df-feed::-webkit-scrollbar { display: none; }
    
        /* ── 单个帖子 ── */
        .xhs-df-post {
          position: relative;
          width: 100%;
          height: 100vh;
          scroll-snap-align: start;
          flex-shrink: 0;
          overflow: hidden;
          background: #111;
        }
    
        /* ── 封面图 ── */
        .xhs-df-bg {
          position: absolute;
          inset: 0;
          object-fit: cover;
          width: 100%;
          height: 100%;
          filter: blur(18px) brightness(.35);
          transform: scale(1.08);
          transition: opacity .4s;
        }
        .xhs-df-cover {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -54%);
          max-height: 78%;
          max-width: 88%;
          object-fit: contain;
          border-radius: 12px;
          box-shadow: 0 8px 40px rgba(0,0,0,.6);
          z-index: 2;
        }
        .xhs-df-no-img {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 56px;
          z-index: 2;
        }
    
        /* ── 右侧操作栏 ── */
        .xhs-df-actions {
          position: absolute;
          right: 14px;
          bottom: 130px;
          z-index: 5;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 22px;
        }
        .xhs-df-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }
        .xhs-df-btn-icon {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: rgba(255,255,255,.12);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          transition: transform .15s, background .15s;
          backdrop-filter: blur(6px);
        }
        .xhs-df-btn:active .xhs-df-btn-icon {
          transform: scale(1.18);
          background: rgba(255,255,255,.25);
        }
        .xhs-df-btn-label {
          color: rgba(255,255,255,.9);
          font-size: 12px;
          font-weight: 500;
          text-shadow: 0 1px 3px rgba(0,0,0,.6);
        }
        .xhs-df-btn.liked .xhs-df-btn-icon { background: rgba(255,60,60,.22); }
        .xhs-df-btn.liked .xhs-df-btn-label { color: #ff4757; }
    
        /* ── 头像（带关注+） ── */
        .xhs-df-avatar-wrap {
          position: relative;
          width: 50px;
          height: 50px;
          margin-bottom: 4px;
        }
        .xhs-df-avatar {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          border: 2.5px solid #fff;
          object-fit: cover;
          background: #444;
          display: block;
        }
        .xhs-df-avatar-placeholder {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          border: 2.5px solid #fff;
          background: linear-gradient(135deg,#ff5e5e,#ff8c8c);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          color: #fff;
        }
        .xhs-df-follow-dot {
          position: absolute;
          bottom: -4px;
          left: 50%;
          transform: translateX(-50%);
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #ff2442;
          color: #fff;
          font-size: 16px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
          border: 1.5px solid #000;
          cursor: pointer;
        }
    
        /* ── 底部信息区 ── */
        .xhs-df-info {
          position: absolute;
          bottom: 0; left: 0; right: 80px;
          z-index: 5;
          padding: 0 16px 28px;
          background: linear-gradient(to top, rgba(0,0,0,.75) 0%, transparent 100%);
        }
        .xhs-df-username {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }
        .xhs-df-uname {
          color: #fff;
          font-size: 15px;
          font-weight: 700;
          text-shadow: 0 1px 4px rgba(0,0,0,.5);
        }
        .xhs-df-title {
          color: rgba(255,255,255,.93);
          font-size: 14px;
          line-height: 1.55;
          max-height: 3.3em;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          text-shadow: 0 1px 3px rgba(0,0,0,.6);
          margin-bottom: 10px;
        }
        .xhs-df-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .xhs-df-tag {
          color: rgba(255,255,255,.75);
          font-size: 13px;
          background: rgba(255,255,255,.1);
          border-radius: 20px;
          padding: 2px 10px;
          backdrop-filter: blur(4px);
        }
    
        /* ── 进度点 ── */
        #xhs-df-dots {
          position: absolute;
          bottom: 10px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 10;
          display: flex;
          gap: 5px;
        }
        .xhs-df-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: rgba(255,255,255,.35);
          transition: all .25s;
        }
        .xhs-df-dot.active {
          background: #fff;
          width: 18px;
          border-radius: 3px;
        }
    
        /* ── 音乐旋转图标 ── */
        .xhs-df-music {
          position: absolute;
          right: 14px;
          bottom: 90px;
          z-index: 5;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(0,0,0,.4);
          border: 2px solid rgba(255,255,255,.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          animation: xhs-df-spin 4s linear infinite;
          backdrop-filter: blur(4px);
        }
        @keyframes xhs-df-spin { to { transform: rotate(360deg); } }
    
        /* ── 入场动画 ── */
        @keyframes xhs-df-fadein {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        #xhs-douyin-feed-overlay {
          animation: xhs-df-fadein .3s ease;
        }
      `;
      document.head.appendChild(style);
    
      // ── 3. 构建 HTML ──────────────────────────────────────────────
      const overlay = document.createElement('div');
      overlay.id = 'xhs-douyin-feed-overlay';
    
      // 顶部导航
      overlay.innerHTML = `
        <div id="xhs-df-topbar">
          <div id="xhs-df-tabs">
            <span class="xhs-df-tab">关注</span>
            <span class="xhs-df-tab active">推荐</span>
            <span class="xhs-df-tab">同城</span>
          </div>
          <div id="xhs-df-close" title="关闭Feed流">✕</div>
        </div>
        <div id="xhs-df-feed"></div>
        <div id="xhs-df-dots"></div>
      `;
    
      document.body.appendChild(overlay);
    
      const feedEl = overlay.querySelector('#xhs-df-feed');
      const dotsEl = overlay.querySelector('#xhs-df-dots');
    
      // 图标 map
      const EMOJIS = ['🌸','🎵','✨','🍜','🎨','🏔️','🌊','🦋','🌙','🎭'];
    
      posts.forEach((post, i) => {
        const postEl = document.createElement('div');
        postEl.className = 'xhs-df-post';
        postEl.dataset.index = i;
    
        // 标签（从标题提取 or mock）
        const tagWords = post.title.match(/[^\s，。！？、]+/g) || [];
        const tags = tagWords.slice(0,3).map(w => '#' + w.slice(0,6)).join(' ') || '#小红书 #推荐';
    
        // 用户名截取
        const uname = post.username.slice(0, 14) || '小红书用户';
    
        const hasImg = post.imgSrc && post.imgSrc.startsWith('http');
        const emoji = EMOJIS[i % EMOJIS.length];
    
        postEl.innerHTML = `
          ${hasImg ? `<img class="xhs-df-bg" src="${post.imgSrc}" alt="" draggable="false">` : ''}
          ${hasImg
            ? `<img class="xhs-df-cover" src="${post.imgSrc}" alt="${post.title}" draggable="false">`
            : `<div class="xhs-df-no-img">${emoji}</div>`
          }
    
          <div class="xhs-df-actions">
            <div class="xhs-df-avatar-wrap">
              ${post.avatarSrc && post.avatarSrc.startsWith('http')
                ? `<img class="xhs-df-avatar" src="${post.avatarSrc}" alt="${uname}">`
                : `<div class="xhs-df-avatar-placeholder">${uname.slice(0,1)}</div>`
              }
              <div class="xhs-df-follow-dot">+</div>
            </div>
    
            <div class="xhs-df-btn" data-action="like">
              <div class="xhs-df-btn-icon">♥</div>
              <div class="xhs-df-btn-label">${post.likeCount || '赞'}</div>
            </div>
            <div class="xhs-df-btn" data-action="comment">
              <div class="xhs-df-btn-icon">💬</div>
              <div class="xhs-df-btn-label">评论</div>
            </div>
            <div class="xhs-df-btn" data-action="collect">
              <div class="xhs-df-btn-icon">⭐</div>
              <div class="xhs-df-btn-label">收藏</div>
            </div>
            <div class="xhs-df-btn" data-action="share">
              <div class="xhs-df-btn-icon">↗</div>
              <div class="xhs-df-btn-label">分享</div>
            </div>
          </div>
    
          <div class="xhs-df-music">🎵</div>
    
          <div class="xhs-df-info">
            <div class="xhs-df-username">
              <span class="xhs-df-uname">@${uname}</span>
            </div>
            <div class="xhs-df-title">${post.title || '小红书推荐内容'}</div>
            <div class="xhs-df-tags">
              ${tags.split(' ').map(t => `<span class="xhs-df-tag">${t}</span>`).join('')}
            </div>
          </div>
        `;
    
        feedEl.appendChild(postEl);
    
        // 进度点
        const dot = document.createElement('div');
        dot.className = 'xhs-df-dot' + (i === 0 ? ' active' : '');
        dotsEl.appendChild(dot);
      });
    
      // ── 4. 交互逻辑 ───────────────────────────────────────────────
      // 点赞等互动按钮
      overlay.addEventListener('click', e => {
        const btn = e.target.closest('.xhs-df-btn[data-action]');
        if (!btn) return;
        const action = btn.dataset.action;
        if (action === 'like') {
          btn.classList.toggle('liked');
          const icon = btn.querySelector('.xhs-df-btn-icon');
          icon.style.transform = 'scale(1.3)';
          setTimeout(() => icon.style.transform = '', 200);
        }
        if (action === 'collect') {
          btn.classList.toggle('liked');
        }
        e.stopPropagation();
      });
    
      // 关注按钮
      overlay.addEventListener('click', e => {
        const dot = e.target.closest('.xhs-df-follow-dot');
        if (!dot) return;
        if (dot.textContent === '+') {
          dot.textContent = '✓';
          dot.style.background = '#555';
          dot.style.fontSize = '12px';
        } else {
          dot.textContent = '+';
          dot.style.background = '#ff2442';
          dot.style.fontSize = '16px';
        }
        e.stopPropagation();
      });
    
      // 关闭按钮
      overlay.querySelector('#xhs-df-close').addEventListener('click', () => {
        overlay.remove();
        style.remove();
        document.body.style.overflow = '';
      });
    
      // 滚动更新进度点
      let currentIndex = 0;
      const dots = dotsEl.querySelectorAll('.xhs-df-dot');
      feedEl.addEventListener('scroll', () => {
        const newIndex = Math.round(feedEl.scrollTop / window.innerHeight);
        if (newIndex !== currentIndex && newIndex >= 0 && newIndex < posts.length) {
          dots[currentIndex].classList.remove('active');
          dots[newIndex].classList.add('active');
          currentIndex = newIndex;
        }
      }, { passive: true });
    
      // 禁止背后页面滚动
      document.body.style.overflow = 'hidden';
    
      // 键盘导航
      const keyHandler = e => {
        if (!document.getElementById('xhs-douyin-feed-overlay')) {
          document.removeEventListener('keydown', keyHandler);
          return;
        }
        if (e.key === 'ArrowDown' || e.key === 'PageDown') {
          feedEl.scrollBy({ top: window.innerHeight, behavior: 'smooth' });
        }
        if (e.key === 'ArrowUp' || e.key === 'PageUp') {
          feedEl.scrollBy({ top: -window.innerHeight, behavior: 'smooth' });
        }
        if (e.key === 'Escape') {
          overlay.querySelector('#xhs-df-close').click();
        }
      };
      document.addEventListener('keydown', keyHandler);
    
      return {
        ok: true,
        summary: `✅ 抖音Feed流模式已启动！共加载 ${posts.length} 个帖子。上下滚动切换，按 ESC 或点击 ✕ 退出。`,
        posts_loaded: posts.length,
        tips: '可用 ↓/↑ 方向键、PageDown/PageUp 切换帖子，点击右侧按钮互动，点 ✕ 关闭恢复原始页面'
      };
    }
  );
  if (typeof __tabOriginalFunction !== "function") {
    throw new Error("evaluate_script source must evaluate to a function");
  }
  return await __tabOriginalFunction();
})();