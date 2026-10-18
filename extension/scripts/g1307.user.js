(function () {
  if (window.__weiboDownloader) {
    console.warn('[微博下载器] 已在运行，请勿重复执行');
    return;
  }
  window.__weiboDownloader = true;

  // ─── 配置 ────────────────────────────────────────────────────────────
  const START_TS = Date.now();
  const DELAY_IMG = 350;
  const DELAY_VID = 1000;

  // URL质量升级规则（统一升为原图）
  const QUALITY_PATTERNS = [
    [/\/(mw\d+|webp\d+|orj\d+|thumbnail|bmiddle|small|woriginal)\//i, '/large/'],
  ];

  // 排除规则（头像/icon/表情/占位）
  const EXCLUDE = [
    /crop\.\d+\.\d+\.\d+\.\d+/,
    /\/expression\//,
    /timeline_card_small/,
    /sinaimg\.cn\/upload\//,
    /h5\.sinaimg\.cn/,
    /face\.t\.sinajs\.cn/,
    /^data:image/,
    /vvip_\d+\.png/,
  ];

  function upgradeUrl(url) {
    if (!url) return url;
    for (const [pat, rep] of QUALITY_PATTERNS) {
      if (pat.test(url)) return url.replace(pat, rep);
    }
    return url;
  }

  function isValid(url) {
    if (!url || url.startsWith('data:')) return false;
    return !EXCLUDE.some(p => p.test(url));
  }

  // 生成时间戳文件名：weibo_img_<启动时间戳>_<序号三位>.<ext>
  function makeFilename(type, index, url) {
    const ext = (url.split('?')[0].split('.').pop() || 'jpg')
      .toLowerCase()
      .replace('webp', 'jpg');
    const idx = String(index + 1).padStart(3, '0');
    return `weibo_${type}_${START_TS}_${idx}.${ext}`;
  }

  // ─── 页面类型检测 ────────────────────────────────────────────────────
  function isAlbumPage() {
    return location.search.includes('tabtype=album')
      || !!document.querySelector('._album_vozf1_3');
  }

  // ─── 相册页图片收集 ──────────────────────────────────────────────────
  function collectAlbumImages() {
    const seen = new Set();
    const result = [];

    // 相册详情网格（已展开的图片墙）
    document.querySelectorAll('._album_vozf1_3 ._box_vozf1_31 img.woo-picture-img').forEach(img => {
      const raw = img.getAttribute('src') || img.src || '';
      if (!isValid(raw)) return;
      const hq = upgradeUrl(raw);
      if (!seen.has(hq)) { seen.add(hq); result.push(hq); }
    });

    // 如果网格没有内容，退而收集分类封面缩略图
    if (result.length === 0) {
      document.querySelectorAll('._card2_1u1aq_3 img.woo-picture-img').forEach(img => {
        const raw = img.getAttribute('src') || img.src || '';
        if (!isValid(raw)) return;
        const hq = upgradeUrl(raw);
        if (!seen.has(hq)) { seen.add(hq); result.push(hq); }
      });
    }

    return result.map((url, i) => ({
      url,
      filename: makeFilename('album', i, url),
    }));
  }

  // ─── Feed 页图片收集 ─────────────────────────────────────────────────
  function collectFeedImages() {
    const seen = new Set();
    const result = [];

    const selectors = [
      'img._focusImg_a3hty_23',
      'img._customPoster_a3hty_132',
      '.wbpro-feed-content img.woo-picture-img',
    ];

    selectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(img => {
        const raw = img.getAttribute('src') || img.src || '';
        if (!isValid(raw)) return;
        const hq = upgradeUrl(raw);
        if (!seen.has(hq)) { seen.add(hq); result.push(hq); }
      });
    });

    return result.map((url, i) => ({
      url,
      filename: makeFilename('img', i, url),
    }));
  }

  // ─── 视频收集（Feed页）──────────────────────────────────────────────
  function collectVideos() {
    const seen = new Set();
    const result = [];

    // 从 videojs 全局实例读取
    if (typeof window.videojs === 'function' && window.videojs.getAllPlayers) {
      try {
        window.videojs.getAllPlayers().forEach(player => {
          const srcs = [
            player.currentSrc?.(),
            ...(player.currentSources?.() || []).map(s => s.src),
          ].filter(s => s && !s.startsWith('blob:') && !seen.has(s));
          srcs.forEach(src => {
            seen.add(src);
            result.push(src);
          });
        });
      } catch (e) { /* ignore */ }
    }

    // 直接查找 <video> src
    document.querySelectorAll('video').forEach(v => {
      const src = v.currentSrc || v.src;
      if (!src || src.startsWith('blob:') || seen.has(src)) return;
      seen.add(src);
      result.push(src);
    });

    return result.map((url, i) => ({
      url,
      filename: makeFilename('video', i, url),
      isHLS: url.includes('.m3u8'),
    }));
  }

  // ─── 下载核心 ────────────────────────────────────────────────────────
  async function downloadFile({ url, filename, isHLS = false }) {
    if (isHLS) {
      console.warn(`[下载器] ⚠️ HLS流，请用 ffmpeg 下载:\nffmpeg -i "${url}" -c copy "${filename.replace('.m3u8', '.mp4')}"`);
      return;
    }
    try {
      const res = await fetch(url, { credentials: 'include', mode: 'cors' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement('a'), {
        href: blobUrl,
        download: filename,
        style: 'display:none',
      });
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 8000);
      console.log(`[下载器] ✅ ${filename}`);
    } catch (err) {
      console.error(`[下载器] ❌ 失败 ${filename}:`, err.message);
      // 降级：新标签打开
      Object.assign(document.createElement('a'), {
        href: url, target: '_blank', rel: 'noopener',
      }).click();
    }
  }

  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  // ─── 主流程 ──────────────────────────────────────────────────────────
  async function run() {
    const onAlbum = isAlbumPage();
    const images = onAlbum ? collectAlbumImages() : collectFeedImages();
    const videos = onAlbum ? [] : collectVideos();

    const pageType = onAlbum ? '📸 相册页' : '📰 Feed页';
    console.group(`[微博下载器] 🚀 ${pageType} 开始下载`);
    console.log(`📷 图片: ${images.length} 张`);
    if (!onAlbum) console.log(`🎬 视频: ${videos.length} 个`);
    console.groupEnd();

    if (images.length === 0 && videos.length === 0) {
      alert('⚠️ 未找到可下载内容！\n相册页：请先点击相册分类展开图片后再执行\nFeed页：请先滚动加载内容');
      window.__weiboDownloader = false;
      return;
    }

    for (const item of images) {
      await downloadFile(item);
      await sleep(DELAY_IMG);
    }

    for (const item of videos) {
      await downloadFile(item);
      await sleep(DELAY_VID);
    }

    console.log(`[微博下载器] 🎉 完成！共下载 ${images.length + videos.length} 个文件`);
    window.__weiboDownloader = false;
  }

  run();
})();