(function() {
  if (window.__redditScraperLoaded) return;
  window.__redditScraperLoaded = true;

  function scrapeRedditPosts() {
    const results = [];
    // 新版 Reddit 使用 shreddit-post 自定义元素
    const posts = document.querySelectorAll('shreddit-post');

    if (posts.length > 0) {
      posts.forEach(post => {
        const titleEl = post.querySelector('a[slot="title"]');
        const title = titleEl?.textContent?.trim() || '';
        const url = titleEl?.href || '';
        const author = post.getAttribute('author') || '';
        const score = post.getAttribute('score') || '';
        const commentCount = post.getAttribute('comment-count') || '';
        const subreddit = post.getAttribute('subreddit') || '';

        if (title) {
          results.push({ title, url, author, score, commentCount, subreddit });
        }
      });
    } else {
      // 旧版 Reddit fallback
      const legacyPosts = document.querySelectorAll('div[data-testid="post-container"], .thing.link');
      legacyPosts.forEach(post => {
        const titleEl = post.querySelector('a[data-click-id="body"], a.title');
        const title = titleEl?.textContent?.trim() || '';
        const url = titleEl?.href || '';
        const scoreEl = post.querySelector('.score.unvoted, span[data-click-id="upvote"]');
        const score = scoreEl?.textContent?.trim() || '';
        const commentEl = post.querySelector('a[data-click-id="comments"], .comments');
        const commentText = commentEl?.textContent?.trim() || '';

        if (title) {
          results.push({ title, url, score, commentCount: commentText });
        }
      });
    }

    return results;
  }

  function run() {
    const results = scrapeRedditPosts();
    if (results.length === 0) {
      console.warn('No Reddit posts found, DOM may not be ready. Retrying in 3s...');
      setTimeout(run, 3000);
      return;
    }
    console.log(`%c[Reddit Scraper] Found ${results.length} posts`, 'color: #ff4500; font-weight: bold');
    console.table(results);
    // 复制到剪贴板
    const json = JSON.stringify(results, null, 2);
    navigator.clipboard?.writeText(json).then(() => {
      console.log('%c[Reddit Scraper] Data copied to clipboard!', 'color: green');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(run, 2000));
  } else {
    setTimeout(run, 2000);
  }
})();