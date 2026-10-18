(async function __tabEvaluateScriptBridge() {
  const __tabScriptArgs = {"videoUrl": "BV1GJ411x7h7", "width": 420, "height": 300, "adText": "🎁 限时优惠 活动进行中", "position": "bottom-right"};
  const __tabOriginalFunction = (
    /**
     * 摸鱼看视频 - 浏览器注入脚本
     * 
     * 功能：在当前页面创建一个伪装成广告的浮层弹窗
     * - 鼠标悬停 → 显示 B站视频播放器
     * - 鼠标移开 → 切换为伪装广告界面
     * - 可拖拽移动、可关闭
     * 
     * @param {Object} args
     * @param {string} args.videoUrl - B站视频URL或BV号
     * @param {number} [args.width=400] - 弹窗宽度
     * @param {number} [args.height=300] - 弹窗高度
     * @param {string} [args.adText='限时优惠 活动进行中'] - 伪装广告文案
     * @param {string} [args.position='bottom-right'] - 初始位置
     */
    async function run(args) {
      const videoUrl = args?.videoUrl || '';
      const width = args?.width || 400;
      const height = args?.height || 300;
      const adText = args?.adText || '限时优惠 活动进行中';
      const position = args?.position || 'bottom-right';
    
      // 处理输入：支持纯BV号自动补全URL
      let embedUrl = videoUrl;
      if (videoUrl && !videoUrl.startsWith('http')) {
        // 纯BV号，补全为bilibili URL
        if (videoUrl.startsWith('BV')) {
          embedUrl = 'https://www.bilibili.com/video/' + videoUrl;
        } else {
          return { ok: false, error: '请提供有效的B站视频URL或BV号' };
        }
      }
    
      // 构建嵌入式播放器URL（使用player页面以便更好地嵌入）
      const videoId = embedUrl.match(/\/video\/(BV[\w]+)/)?.[1] || '';
      if (!videoId) {
        return { ok: false, error: '无法从URL中提取视频ID，请确认是有效的B站视频链接' };
      }
      
      // B站嵌入播放器URL
      const playerUrl = `https://player.bilibili.com/player.html?bvid=${videoId}&high_quality=1&autoplay=0`;
    
      // 移除已有的摸鱼弹窗（避免重复）
      const existing = document.getElementById('moyu-video-container');
      if (existing) existing.remove();
    
      // ========== 创建浮层DOM结构 ==========
      const container = document.createElement('div');
      container.id = 'moyu-video-container';
      
      // 根据position设置初始位置
      const positionStyles = {
        'bottom-right': { right: '20px', bottom: '20px', left: 'auto', top: 'auto' },
        'bottom-left': { left: '20px', bottom: '20px', right: 'auto', top: 'auto' },
        'top-right': { right: '20px', top: '20px', left: 'auto', bottom: 'auto' },
        'top-left': { left: '20px', top: '20px', right: 'auto', bottom: 'auto' },
      };
      const posStyle = positionStyles[position] || positionStyles['bottom-right'];
    
      Object.assign(container.style, {
        position: 'fixed',
        width: width + 'px',
        height: height + 'px',
        zIndex: '2147483647',
        ...posStyle,
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: '14px',
        userSelect: 'none',
        transition: 'box-shadow 0.3s ease',
      });
    
      // ---------- 标题栏（可拖拽） ----------
      const header = document.createElement('div');
      Object.assign(header.style, {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 10px',
        background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
        color: '#fff',
        cursor: 'move',
        fontSize: '12px',
        fontWeight: '600',
        letterSpacing: '0.5px',
      });
      header.innerHTML = `<span>📢 推广</span><span style="cursor:pointer;font-size:16px;line-height:1;" title="关闭">✕</span>`;
    
      // ---------- 广告伪装层 ----------
      const adLayer = document.createElement('div');
      adLayer.id = 'moyu-ad-layer';
      Object.assign(adLayer.style, {
        position: 'absolute',
        top: '28px',
        left: '0',
        right: '0',
        bottom: '0',
        background: 'linear-gradient(180deg, #fff9f0 0%, #fff5e6 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        textAlign: 'center',
        boxSizing: 'border-box',
        opacity: '1',
        transition: 'opacity 0.35s ease, transform 0.35s ease',
        transform: 'scale(1)',
      });
      adLayer.innerHTML = `
        <div style="font-size:32px;margin-bottom:10px;">🎁</div>
        <div style="font-size:15px;font-weight:bold;color:#d44;color:#e65100;margin-bottom:8px;">${escapeHtml(adText)}</div>
        <div style="font-size:12px;color:#999;margin-bottom:14px;">仅限今日 · 先到先得</div>
        <div style="display:flex;gap:8px;">
          <div style="padding:6px 18px;background:#ff5722;color:#fff;border-radius:20px;font-size:12px;cursor:pointer;">立即查看</div>
          <div style="padding:6px 18px;background:#eee;color:#666;border-radius:20px;font-size:12px;cursor:pointer;">稍后再说</div>
        </div>
        <div style="margin-top:14px;font-size:10px;color:#ccc;">广告 · 本弹窗由系统推送</div>
      `;
    
      // ---------- 视频层 ----------
      const videoLayer = document.createElement('div');
      videoLayer.id = 'moyu-video-layer';
      Object.assign(videoLayer.style, {
        position: 'absolute',
        top: '28px',
        left: '0',
        right: '0',
        bottom: '0',
        opacity: '0',
        transition: 'opacity 0.35s ease, transform 0.35s ease',
        transform: 'scale(0.95)',
        pointerEvents: 'none',
        background: '#000',
      });
      
      const iframe = document.createElement('iframe');
      iframe.src = playerUrl;
      iframe.allowFullscreen = true;
      iframe.setAttribute('allowfullscreen', 'true');
      iframe.setAttribute('scrolling', 'no');
      iframe.setAttribute('frameborder', '0');
      iframe.sandbox = 'allow-scripts allow-same-origin allow-popups allow-presentation allow-forms';
      Object.assign(iframe.style, {
        width: '100%',
        height: '100%',
        border: 'none',
      });
      videoLayer.appendChild(iframe);
    
      // ---------- 组装DOM ----------
      container.appendChild(header);
      container.appendChild(adLayer);
      container.appendChild(videoLayer);
      document.body.appendChild(container);
    
      // ========== 交互逻辑 ==========
    
      // 模式切换：mouse enter → 视频，mouse leave → 广告
      let isVideoMode = false;
      let hoverTimeout = null;
      let leaveTimeout = null;
    
      container.addEventListener('mouseenter', () => {
        clearTimeout(leaveTimeout);
        hoverTimeout = setTimeout(() => {
          if (!isVideoMode) {
            isVideoMode = true;
            adLayer.style.opacity = '0';
            adLayer.style.transform = 'scale(0.95)';
            adLayer.style.pointerEvents = 'none';
            videoLayer.style.opacity = '1';
            videoLayer.style.transform = 'scale(1)';
            videoLayer.style.pointerEvents = 'auto';
            container.style.boxShadow = '0 8px 40px rgba(255,107,53,0.4)';
          }
        }, 150); // 轻微延迟避免误触
      });
    
      container.addEventListener('mouseleave', () => {
        clearTimeout(hoverTimeout);
        leaveTimeout = setTimeout(() => {
          if (isVideoMode) {
            isVideoMode = false;
            videoLayer.style.opacity = '0';
            videoLayer.style.transform = 'scale(0.95)';
            videoLayer.style.pointerEvents = 'none';
            adLayer.style.opacity = '1';
            adLayer.style.transform = 'scale(1)';
            adLayer.style.pointerEvents = 'auto';
            container.style.boxShadow = '0 4px 24px rgba(0,0,0,0.3)';
          }
        }, 200); // 移开后稍微延迟再切换
      });
    
      // 关闭按钮
      header.querySelector('span:last-child').addEventListener('click', (e) => {
        e.stopPropagation();
        container.remove();
      });
    
      // ========== 拖拽功能 ==========
      let isDragging = false;
      let dragOffsetX = 0;
      let dragOffsetY = 0;
    
      header.addEventListener('mousedown', (e) => {
        if (e.target === header || e.target.tagName === 'SPAN') {
          isDragging = true;
          dragOffsetX = e.clientX - container.offsetLeft;
          dragOffsetY = e.clientY - container.offsetTop;
          container.style.transition = 'none';
          e.preventDefault();
        }
      });
    
      document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const newX = Math.max(0, Math.min(window.innerWidth - width, e.clientX - dragOffsetX));
        const newY = Math.max(0, Math.min(window.innerHeight - height, e.clientY - dragOffsetY));
        container.style.left = newX + 'px';
        container.style.top = newY + 'px';
        container.style.right = 'auto';
        container.style.bottom = 'auto';
      });
    
      document.addEventListener('mouseup', () => {
        if (isDragging) {
          isDragging = false;
          container.style.transition = 'box-shadow 0.3s ease';
        }
      });
    
      // ========== 工具函数 ==========
      function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      }
    
      return {
        ok: true,
        message: '🐟 摸鱼弹窗已启动！鼠标放上去看视频，移开变广告～',
        videoId: videoId,
        tip: '老板来了赶紧移开鼠标！'
      };
    }
  );
  if (typeof __tabOriginalFunction !== "function") {
    throw new Error("evaluate_script source must evaluate to a function");
  }
  return await __tabOriginalFunction(__tabScriptArgs);
})();