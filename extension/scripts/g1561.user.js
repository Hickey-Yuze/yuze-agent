(function() {
  // 标记防止重复执行
  if (window.__earliestVideoFinder) return;
  window.__earliestVideoFinder = true;

  function findEarliestVideo() {
    // 收集所有视频卡片信息
    const videoCards = document.querySelectorAll('.bili-video-card');
    if (videoCards.length === 0) {
      console.warn('未找到视频卡片');
      return;
    }

    let earliestVideo = null;
    let earliestDate = null;

    videoCards.forEach(card => {
      const titleEl = card.querySelector('.bili-video-card__title a');
      const dateEl = card.querySelector('.bili-video-card__subtitle span');
      
      if (titleEl && dateEl) {
        const title = titleEl.textContent.trim();
        const href = titleEl.getAttribute('href');
        const dateText = dateEl.textContent.trim();
        
        // 解析日期 (格式如 "03-07" 或 "2025-03-07")
        let videoDate;
        if (dateText.includes('-') && dateText.length <= 5) {
          // 格式 MM-DD，使用当前年份
          const currentYear = new Date().getFullYear();
          videoDate = new Date(`${currentYear}-${dateText}`);
        } else {
          videoDate = new Date(dateText);
        }

        if (!earliestDate || videoDate < earliestDate) {
          earliestDate = videoDate;
          earliestVideo = { title, href, dateText };
        }
      }
    });

    if (earliestVideo) {
      // 构建完整链接
      let fullUrl = earliestVideo.href;
      if (fullUrl.startsWith('//')) {
        fullUrl = 'https:' + fullUrl;
      }
      // 去掉追踪参数
      fullUrl = fullUrl.split('?')[0];

      // 创建悬浮展示框
      const overlay = document.createElement('div');
      overlay.id = '__earliest-video-result';
      overlay.style.cssText = `
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        z-index: 99999; background: #fff; border-radius: 16px; padding: 32px 40px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.2); max-width: 520px; width: 90%;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      `;

      overlay.innerHTML = `
        <div style="margin-bottom: 16px;">
          <div style="font-size: 18px; font-weight: 700; color: #18191C; margin-bottom: 8px;">
            🎬 最早发布的视频
          </div>
          <div style="font-size: 14px; color: #9499A0;">UP主: wanaaaY</div>
        </div>
        <div style="background: #F6F7F8; border-radius: 10px; padding: 16px; margin-bottom: 20px;">
          <div style="font-size: 16px; font-weight: 600; color: #18191C; margin-bottom: 8px; line-height: 1.4;">
            ${earliestVideo.title}
          </div>
          <div style="font-size: 13px; color: #9499A0;">发布日期: ${earliestVideo.dateText}</div>
        </div>
        <div style="margin-bottom: 20px;">
          <div style="font-size: 12px; color: #9499A0; margin-bottom: 6px;">视频链接</div>
          <a href="${fullUrl}" target="_blank" style="
            font-size: 14px; color: #00A1D6; word-break: break-all;
            text-decoration: none; border: 1px solid #E3E5E7; 
            border-radius: 8px; padding: 10px 14px; display: block;
            transition: all 0.2s;
          " onmouseover="this.style.borderColor='#00A1D6'; this.style.background='#F0FBFF'"
             onmouseout="this.style.borderColor='#E3E5E7'; this.style.background='transparent'">
            ${fullUrl}
          </a>
        </div>
        <button onclick="document.getElementById('__earliest-video-result').remove(); window.__earliestVideoFinder=false;" style="
          width: 100%; padding: 10px; border: none; border-radius: 8px;
          background: #00A1D6; color: #fff; font-size: 14px; font-weight: 600;
          cursor: pointer; transition: background 0.2s;
        " onmouseover="this.style.background='#00B5E5'" 
           onmouseout="this.style.background='#00A1D6'">
          关闭
        </button>
      `;

      // 半透明背景遮罩
      const backdrop = document.createElement('div');
      backdrop.id = '__earliest-video-backdrop';
      backdrop.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.4); z-index: 99998;
      `;
      backdrop.onclick = () => {
        overlay.remove();
        backdrop.remove();
        window.__earliestVideoFinder = false;
      };

      document.body.appendChild(backdrop);
      document.body.appendChild(overlay);

      console.log('最早视频:', earliestVideo.title, fullUrl, earliestVideo.dateText);
    } else {
      console.warn('未能找到视频信息');
    }
  }

  // 先尝试点击"查看更多"获取完整列表
  function tryExpandAndFind() {
    const viewMoreBtn = document.querySelector('.video-section .btns button:last-child');
    if (viewMoreBtn && viewMoreBtn.textContent.includes('查看更多')) {
      // 检查当前页面是否是投稿列表页（URL含/upload）
      const isUploadPage = window.location.pathname.includes('/upload');
      
      if (isUploadPage) {
        // 已经在投稿列表页，直接查找
        setTimeout(findEarliestVideo, 1500);
      } else {
        // 点击查看更多跳转到投稿列表
        viewMoreBtn.click();
        // 等待页面加载
        setTimeout(() => {
          findEarliestVideo();
        }, 2000);
      }
    } else {
      // 没有查看更多按钮，直接查找当前列表
      findEarliestVideo();
    }
  }

  // 使用B站API获取完整视频列表（更可靠）
  async function fetchViaAPI() {
    const mid = '1603401268';
    const apiUrl = `https://api.bilibili.com/x/space/wbi/arc/search?mid=${mid}&ps=30&order=pubdate`;
    
    try {
      const resp = await fetch(apiUrl, { credentials: 'include' });
      const data = await resp.json();
      
      if (data.code === 0 && data.data && data.data.list && data.data.list.vlist) {
        const videos = data.data.list.vlist;
        if (videos.length > 0) {
          // 按发布时间排序，找最早的
          videos.sort((a, b) => a.created - b.created);
          const earliest = videos[0];
          
          const fullUrl = `https://www.bilibili.com/video/${earliest.bvid}`;
          const createdDate = new Date(earliest.created * 1000);
          const dateStr = `${createdDate.getFullYear()}-${String(createdDate.getMonth()+1).padStart(2,'0')}-${String(createdDate.getDate()).padStart(2,'0')}`;
          
          // 显示结果
          showResult(earliest.title, fullUrl, dateStr, earliest.description || '');
          return;
        }
      }
    } catch(e) {
      console.warn('API请求失败，回退到DOM解析:', e);
    }
    
    // API失败，回退到DOM解析
    tryExpandAndFind();
  }

  function showResult(title, url, dateText, desc) {
    // 移除已有结果
    const existing = document.getElementById('__earliest-video-result');
    const existingBackdrop = document.getElementById('__earliest-video-backdrop');
    if (existing) existing.remove();
    if (existingBackdrop) existingBackdrop.remove();

    const overlay = document.createElement('div');
    overlay.id = '__earliest-video-result';
    overlay.style.cssText = `
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      z-index: 99999; background: #fff; border-radius: 16px; padding: 32px 40px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2); max-width: 560px; width: 90%;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    `;

    overlay.innerHTML = `
      <div style="margin-bottom: 16px;">
        <div style="font-size: 18px; font-weight: 700; color: #18191C; margin-bottom: 8px;">
          🎬 最早发布的视频
        </div>
        <div style="font-size: 14px; color: #9499A0;">UP主: wanaaaY (UID: 1603401268)</div>
      </div>
      <div style="background: #F6F7F8; border-radius: 10px; padding: 16px; margin-bottom: 20px;">
        <div style="font-size: 16px; font-weight: 600; color: #18191C; margin-bottom: 8px; line-height: 1.4;">
          ${title}
        </div>
        <div style="font-size: 13px; color: #9499A0;">发布日期: ${dateText}</div>
      </div>
      <div style="margin-bottom: 20px;">
        <div style="font-size: 12px; color: #9499A0; margin-bottom: 6px;">视频链接</div>
        <a href="${url}" target="_blank" style="
          font-size: 14px; color: #00A1D6; word-break: break-all;
          text-decoration: none; border: 1px solid #E3E5E7; 
          border-radius: 8px; padding: 10px 14px; display: block;
          transition: all 0.2s;
        " onmouseover="this.style.borderColor='#00A1D6'; this.style.background='#F0FBFF'"
           onmouseout="this.style.borderColor='#E3E5E7'; this.style.background='transparent'">
          ${url}
        </a>
      </div>
      <button onclick="document.getElementById('__earliest-video-result').remove(); document.getElementById('__earliest-video-backdrop').remove(); window.__earliestVideoFinder=false;" style="
        width: 100%; padding: 10px; border: none; border-radius: 8px;
        background: #00A1D6; color: #fff; font-size: 14px; font-weight: 600;
        cursor: pointer; transition: background 0.2s;
      " onmouseover="this.style.background='#00B5E5'" 
         onmouseout="this.style.background='#00A1D6'">
        关闭
      </button>
    `;

    const backdrop = document.createElement('div');
    backdrop.id = '__earliest-video-backdrop';
    backdrop.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.4); z-index: 99998;
    `;
    backdrop.onclick = () => {
      overlay.remove();
      backdrop.remove();
      window.__earliestVideoFinder = false;
    };

    document.body.appendChild(backdrop);
    document.body.appendChild(overlay);
  }

  // 优先尝试API方式（更准确），失败回退DOM解析
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fetchViaAPI);
  } else {
    fetchViaAPI();
  }
})();