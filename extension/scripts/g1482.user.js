(async function __tabEvaluateScriptBridge() {
  const __tabScriptArgs = {"keywords": ["阳台", "大阳台", "带阳台"], "maxPrice": 2500, "areas": ["前海", "蛇口", "大新", "桃园"], "sortBy": "price_asc", "showPanel": true, "autoDownload": false};
  const __tabOriginalFunction = (
    /**
     * 安居客租房房源提取器 v2.0
     * 
     * 功能：
     * 1. 自动提取当前页面所有可见房源信息（标题、价格、图片、地址、楼层、朝向、地铁等）
     * 2. 可配置筛选条件：关键词（阳台/大阳台）、区域商圈、价格范围
     * 3. 按价格从低到高排序
     * 4. 一键导出为CSV文件（可直接用Excel打开），含图片链接和网址
     * 5. 浮动操作面板，支持不同城市/区域复用
     *
     * 使用方法：在安居客租房列表页面上执行此脚本
     */
    
    async function run(args) {
      // ========== 配置参数 ==========
      const config = {
        // 筛选关键词（在标题或标签中搜索，匹配任一即保留）
        // 设为空数组 [] 表示不过滤
        keywords: args.keywords || ['阳台', '大阳台', '带阳台', '弧形阳台'],
        
        // 价格范围（元/月），null表示不限
        minPrice: args.minPrice || null,
        maxPrice: args.maxPrice || null,
        
        // 区域商圈过滤（在小区位置中搜索）
        areas: args.areas || [],
        
        // 排序方式: 'price_asc'(默认), 'price_desc', 'none'
        sortBy: args.sortBy || 'price_asc',
        
        // 是否显示浮动面板UI
        showPanel: args.showPanel !== false,
        
        // 是否自动下载CSV
        autoDownload: args.autoDownload || false,
      };
    
      // ========== DOM选择器 ==========
      const SELECTORS = {
        listContainer: '#list-content',
        listItem: '.zu-itemmod',
        image: '.img img.thumbnail',
        titleLink: '.zu-info h3 a',
        titleText: '.zu-info h3 a b, .zu-info h3 a',
        detailsRow: '.zu-info .details-item',
        communityLink: '.zu-info .comm-name, .zu-info a[href*="community"]',
        bottomTags: '.zu-info .bot-tag',
        agentInfo: '.zu-info .jjr-info',
        price: '.zu-info .price strong, .zu-info .price',
        urlAttr: 'link', // 卡片上的 link 属性包含完整URL
      };
    
      // ========== 核心提取函数 ==========
      
      function extractAllListings() {
        const container = document.querySelector(SELECTORS.listContainer);
        if (!container) {
          return { ok: false, error: '未找到房源列表容器 #list-content', data: [] };
        }
    
        const cards = container.querySelectorAll(SELECTORS.listItem);
        if (!cards || cards.length === 0) {
          return { ok: false, error: '当前页面没有找到房源卡片', data: [] };
        }
    
        const listings = [];
        
        cards.forEach((card, index) => {
          try {
            const listing = extractSingleCard(card, index);
            if (listing) listings.push(listing);
          } catch(e) {
            console.warn(`[安居客提取] 第${index+1}条房源提取失败:`, e.message);
          }
        });
    
        return { ok: true, data: listings };
      }
    
      function extractSingleCard(card, index) {
        // ---- 图片 ----
        const imgEl = card.querySelector(SELECTORS.image);
        const imageUrl = imgEl ? (imgEl.getAttribute('src') || imgEl.getAttribute('lazy_src') || '') : '';
        const imageAlt = imgEl ? (imgEl.getAttribute('alt') || '') : '';
    
        // ---- 标题和网址 ----
        const titleEl = card.querySelector(SELECTORS.titleLink);
        const title = titleEl ? (titleEl.textContent || '').trim() : '';
        const url = titleEl ? (titleEl.getAttribute('href') || '') : '';
        // 也尝试从card的link属性获取
        const cardUrl = card.getAttribute(SELECTORS.urlAttr) || url;
        const finalUrl = cardUrl.startsWith('http') ? cardUrl : 
                         (cardUrl ? 'https://sz.zu.anjuke.com' + cardUrl : url);
    
        // ---- 价格 ----
        const priceEl = card.querySelector(SELECTORS.price);
        let price = 0;
        let priceText = '';
        if (priceEl) {
          priceText = priceEl.textContent.trim();
          const priceMatch = priceText.match(/(\d+)/);
          if (priceMatch) price = parseInt(priceMatch[1], 10);
        }
    
        // ---- 详情行（户型 | 面积 | 楼层）----
        const detailRows = card.querySelectorAll(SELECTORS.detailsRow);
        let layout = '', size = '', floor = '', address = '', communityName = '';
        let direction = '', rentType = '', hasElevator = '';
    
        detailRows.forEach(row => {
          const text = row.textContent.trim();
          // 解析户型信息如 "1室0厅 | 30平米 | 中层(共10层)"
          if (text.includes('室') && text.includes('厅')) {
            const parts = text.split('|').map(s => s.trim());
            parts.forEach(p => {
              if (p.match(/\d室\d厅/)) layout = p;
              else if (p.match(/[\d.]+平米/)) size = p.replace('平米', '').trim();
              else if (p.match(/层\(共/)) floor = p;
            });
          }
          
          // 小区名称和地址
          if (row.querySelector('a') || row.textContent.includes('南山')) {
            const links = row.querySelectorAll('a');
            links.forEach(a => {
              const href = a.getAttribute('href') || '';
              if (href.includes('community')) {
                communityName = a.textContent.trim();
              }
            });
            const addrParts = text.replace(communityName, '').split('-').map(s => s.trim()).filter(Boolean);
            if (addrParts.length >= 2) {
              address = addrParts.join(' ');
            }
          }
    
          // 类型标签（合租/独立单间）和朝向
          if (text.includes('合租')) rentType = '合租';
          if (text.includes('独立单间')) rentType = '独立单间';
          if (text.includes('朝南') || text.includes('朝北') || text.includes('南北') || text.includes('朝东') || text.includes('朝西')) {
            direction = text.match(/朝[东南西北北]+/)?.[0] || text;
          }
          if (text.includes('有电梯')) hasElevator = '有电梯';
        });
    
        // ---- 底部标签（地铁线等）----
        const botTagEls = card.querySelectorAll(SELECTORS.bottomTags);
        let metroLines = '';
        let otherTags = [];
        botTagEls.forEach(el => {
          const t = el.textContent.trim();
          if (t.match(/^\d+[\/\d]*号线$/)) metroLines += (metroLines ? '/' : '') + t;
          else otherTags.push(t);
        });
    
        // ---- 经纪人信息 ----
        const agentEl = card.querySelector(SELECTORS.agentInfo);
        const agentName = agentEl ? (agentEl.textContent.trim().substring(0, 20)) : '';
    
        // ---- 组装所有标签用于关键词搜索 ----
        const allTags = [title, ...otherTags].join(' ');
    
        return {
          index: index + 1,
          title,
          price,
          priceText: priceText + '元/月',
          imageUrl,
          imageAlt,
          communityName,
          area: extractAreaFromAddress(address),
          address: address || imageAlt.split(' ')[0] || '',
          layout,
          size: parseFloat(size) || 0,
          floor,
          direction,
          rentType,
          hasElevator,
          metroLines,
          otherTags: otherTags.join(' | '),
          agentName,
          url: finalUrl,
          allTags, // 用于客户端筛选
        };
      }
    
      function extractAreaFromAddress(addr) {
        if (!addr) return '';
        // 常见商圈关键词
        const areaKeywords = ['前海', '蛇口', '大新', '桃园', '南头', '南山中心区', '后海', '科技园', 
                              '科苑', '南油', '白石洲', '华侨城', '深大', '海上世界'];
        for (const kw of areaKeywords) {
          if (addr.includes(kw)) return kw;
        }
        return addr.split(/[,\s-]/)[0] || addr;
      }
    
      // ========== 筛选函数 ==========
      
      function filterListings(listings, cfg) {
        return listings.filter(item => {
          // 价格范围
          if (cfg.minPrice !== null && item.price < cfg.minPrice) return false;
          if (cfg.maxPrice !== null && item.price > cfg.maxPrice) return false;
    
          // 关键词筛选
          if (cfg.keywords && cfg.keywords.length > 0) {
            const combined = (item.title + ' ' + item.otherTags).toLowerCase();
            const matched = cfg.keywords.some(kw => combined.includes(kw.toLowerCase()));
            if (!matched) return false;
          }
    
          // 区域筛选
          if (cfg.areas && cfg.areas.length > 0) {
            const areaMatched = cfg.areas.some(area => 
              item.area.includes(area) || item.address.includes(area) || item.communityName.includes(area)
            );
            if (!areaMatched) return false;
          }
    
          return true;
        });
      }
    
      // ========== 排序函数 ==========
      
      function sortListings(listings, sortBy) {
        const sorted = [...listings];
        switch(sortBy) {
          case 'price_asc':
            sorted.sort((a, b) => a.price - b.price);
            break;
          case 'price_desc':
            sorted.sort((a, b) => b.price - a.price);
            break;
          default:
            break;
        }
        return sorted;
      }
    
      // ========== CSV生成函数 ==========
      
      function generateCSV(listings) {
        if (!listings.length) return '';
    
        const headers = [
          '序号', '价格(元/月)', '房源标题', '小区名称', '区域/商圈', '详细地址',
          '户型', '面积(㎡)', '楼层', '朝向', '类型', '电梯', '地铁线',
          '特色标签', '经纪人', '图片链接', '网址'
        ];
    
        const BOM = '\uFEFF'; // UTF-8 BOM for Excel compatibility
        let csv = BOM + headers.join(',') + '\n';
    
        listings.forEach((item, i) => {
          const row = [
            i + 1,
            item.price,
            escapeCSV(item.title),
            escapeCSV(item.communityName),
            escapeCSV(item.area),
            escapeCSV(item.address),
            escapeCSV(item.layout),
            item.size,
            escapeCSV(item.floor),
            escapeCSV(item.direction),
            escapeCSV(item.rentType),
            escapeCSV(item.hasElevator),
            escapeCSV(item.metroLines),
            escapeCSV(item.otherTags),
            escapeCSV(item.agentName),
            escapeCSV(item.imageUrl),
            escapeCSV(item.url),
          ];
          csv += row.join(',') + '\n';
        });
    
        return csv;
      }
    
      function escapeCSV(str) {
        if (!str) return '';
        str = String(str).replace(/"/g, '""');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          str = '"' + str + '"';
        }
        return str;
      }
    
      function downloadFile(content, filename) {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
      }
    
      // ========== 浮动面板UI ==========
      
      function createPanel(extractResult) {
        // 移除已有面板
        const existing = document.getElementById('anjuke-extractor-panel');
        if (existing) existing.remove();
    
        const total = extractResult.data.length;
        const filteredCount = filterListings(extractResult.data, config).length;
    
        const panel = document.createElement('div');
        panel.id = 'anjuke-extractor-panel';
        panel.innerHTML = `
          <style>
            #anjuke-extractor-panel {
              position: fixed; top: 60px; right: 20px; width: 360px; max-height: 80vh;
              background: linear-gradient(135deg, #1a73e8 0%, #0d47a1 100%);
              border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.35); z-index: 999999;
              font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif;
              color: white; overflow-y: auto; transition: all 0.3s ease;
            }
            #anjuke-extractor-panel::-webkit-scrollbar { width: 6px; }
            #anjuke-extractor-panel::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.3); border-radius: 3px; }
            .ae-header { padding: 18px 20px 12px; display: flex; align-items: center; justify-content: space-between; }
            .ae-header h3 { margin: 0; font-size: 17px; font-weight: 700; letter-spacing: 0.5px; }
            .ae-close { cursor: pointer; font-size: 22px; opacity: 0.7; line-height: 1; transition: opacity 0.2s; }
            .ae-close:hover { opacity: 1; transform: rotate(90deg); }
            .ae-body { padding: 0 20px 20px; }
            .ae-stat { display: flex; gap: 15px; margin-bottom: 16px; }
            .ae-stat-card { flex: 1; background: rgba(255,255,255,0.15); border-radius: 10px; padding: 12px 10px; text-align: center; backdrop-filter: blur(5px); }
            .ae-stat-num { font-size: 26px; font-weight: 800; display: block; line-height: 1.2; }
            .ae-stat-label { font-size: 11px; opacity: 0.85; margin-top: 2px; }
            .ae-section { margin-bottom: 14px; }
            .ae-label { font-size: 11px; opacity: 0.75; margin-bottom: 6px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; }
            .ae-input, .ae-textarea { width: 100%; box-sizing: border-box; border: none; border-radius: 8px;
              padding: 9px 12px; font-size: 13px; outline: none; background: rgba(255,255,255,0.95); color: #333;
              transition: box-shadow 0.2s; font-family: inherit; }
            .ae-input:focus, .ae-textarea:focus { box-shadow: 0 0 0 3px rgba(255,255,255,0.4); }
            .ae-row { display: flex; gap: 10px; }
            .ae-row > * { flex: 1; }
            .ae-btn { width: 100%; padding: 11px; border: none; border-radius: 10px; font-size: 14px; font-weight: 700;
              cursor: pointer; transition: all 0.25s; font-family: inherit; letter-spacing: 0.3px; }
            .ae-btn-primary { background: #00c853; color: white; box-shadow: 0 4px 15px rgba(0,200,83,0.4); }
            .ae-btn-primary:hover { background: #00e676; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(0,200,83,0.5); }
            .ae-btn-secondary { background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3); }
            .ae-btn-secondary:hover { background: rgba(255,255,255,0.3); }
            .ae-result { margin-top: 14px; background: rgba(0,0,0,0.2); border-radius: 10px; padding: 12px; max-height: 200px; overflow-y: auto; }
            .ae-result-title { font-size: 13px; font-weight: 700; margin-bottom: 8px; color: #69f0ae; }
            .ae-result-item { font-size: 12px; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.08); display: flex; gap: 8px; align-items: baseline; }
            .ae-result-item:last-child { border-bottom: none; }
            .ae-result-price { font-weight: 800; color: #ffeb3b; white-space: nowrap; min-width: 55px; }
            .ae-result-title-text { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .ae-tag { display: inline-block; background: rgba(255,235,59,0.2); color: #ffeb3b; padding: 1px 6px; border-radius: 4px; font-size: 10px; margin-left: 4px; }
            .ae-footer { margin-top: 14px; font-size: 10px; opacity: 0.55; text-align: center; line-height: 1.5; }
            @keyframes ae-pulse { 0% { box-shadow: 0 0 0 0 rgba(0,200,83,0.5); } 70% { box-shadow: 0 0 0 8px rgba(0,200,83,0); } 100% { box-shadow: 0 0 0 0 rgba(0,200,83,0); } }
            .ae-exporting { animation: ae-pulse 1s infinite; }
          </style>
          <div class="ae-header">
            <h3>🏠 安居客房源提取器</h3>
            <span class="ae-close" onclick="document.getElementById('anjuke-extractor-panel').remove()">✕</span>
          </div>
          <div class="ae-body">
            <div class="ae-stat">
              <div class="ae-stat-card"><span class="ae-stat-num">${total}</span><span class="ae-stat-label">总房源数</span></div>
              <div class="ae-stat-card"><span class="ae-stat-num">${filteredCount}</span><span class="ae-stat-label">筛选后</span></div>
            </div>
    
            <div class="ae-section">
              <div class="ae-label">🔍 关键词筛选（逗号分隔，如: 阳台,大阳台）</div>
              <input class="ae-input" id="ae-keywords" value="${config.keywords.join(', ')}" placeholder="留空则不筛选">
            </div>
    
            <div class="ae-section">
              <div class="ae-label">📍 区域/商圈筛选（逗号分隔，如: 前海,蛇口,大新）</div>
              <input class="ae-input" id="ae-areas" value="${config.areas.join(', ')}" placeholder="留空则不筛选">
            </div>
    
            <div class="ae-section">
              <div class="ae-label">💰 价格范围（元/月）</div>
              <div class="ae-row">
                <input class="ae-input" id="ae-min-price" type="number" placeholder="最低价" value="${config.minPrice || ''}">
                <input class="ae-input" id="ae-max-price" type="number" placeholder="最高价" value="${config.maxPrice || ''}">
              </div>
            </div>
    
            <div class="ae-section">
              <button class="ae-btn ae-btn-secondary" id="ae-preview-btn">📋 预览筛选结果</button>
            </div>
    
            <div class="ae-section">
              <button class="ae-btn ae-btn-primary" id="ae-export-btn">📥 导出CSV（含图片+网址）</button>
            </div>
    
            <div class="ae-result" id="ae-result" style="display:none;">
              <div class="ae-result-title">筛选结果预览（按价格升序）</div>
              <div id="ae-result-list"></div>
            </div>
    
            <div class="ae-footer">
              支持任意城市/区域 · 数据来自当前页面<br>
              CSV可用Excel/WPS直接打开 · 含完整链接
            </div>
          </div>
        `;
    
        document.body.appendChild(panel);
    
        // 绑定事件
        const previewBtn = panel.querySelector('#ae-preview-btn');
        const exportBtn = panel.querySelector('#ae-export-btn');
        const resultDiv = panel.querySelector('#ae-result');
        const resultList = panel.querySelector('#ae-result-list');
    
        previewBtn.addEventListener('click', () => {
          const currentCfg = getCurrentConfig();
          const filtered = filterAndSort(extractResult.data, currentCfg);
          renderPreview(filtered, resultList);
          resultDiv.style.display = filtered.length ? 'block' : 'none';
          if (!filtered.length) {
            resultList.innerHTML = '<div style="padding:10px;text-align:center;color:#ff8a80;">😢 没有符合条件的房源，请调整筛选条件</div>';
          }
        });
    
        exportBtn.addEventListener('click', () => {
          const currentCfg = getCurrentConfig();
          const filtered = filterAndSort(extractResult.data, currentCfg);
          if (!filtered.length) {
            alert('⚠️ 没有符合当前条件的房源！请先预览或调整筛选条件。');
            return;
          }
          const csv = generateCSV(filtered);
          const timestamp = new Date().toISOString().slice(0,10);
          const cityMatch = location.hostname.match(/^sz|gz|sh|bj|cd|hz|nj|wh|xm|cs|kf/i);
          const cityCode = cityMatch ? cityMatch[0] : 'unknown';
          downloadFile(csv, `安居客租房_${cityCode}_${timestamp}_${filtered.length}条.csv`);
          
          exportBtn.classList.add('ae-exporting');
          exportBtn.textContent = '✅ 导出成功！';
          setTimeout(() => {
            exportBtn.classList.remove('ae-exporting');
            exportBtn.textContent = '📥 导出CSV（含图片+网址）';
          }, 2500);
        });
    
        return panel;
      }
    
      function getCurrentConfig() {
        const kwVal = document.getElementById('ae-keywords').value;
        return {
          keywords: kwVal ? kwVal.split(/[,，]/).map(s => s.trim()).filter(Boolean) : [],
          areas: (document.getElementById('ae-areas').value || '').split(/[,，]/).map(s => s.trim()).filter(Boolean),
          minPrice: document.getElementById('ae-min-price').value ? parseInt(document.getElementById('ae-min-price').value, 10) : null,
          maxPrice: document.getElementById('ae-max-price').value ? parseInt(document.getElementById('ae-max-price').value, 10) : null,
          sortBy: 'price_asc',
        };
      }
    
      function filterAndSort(data, cfg) {
        return sortListings(filterListings(data, cfg), cfg.sortBy);
      }
    
      function renderPreview(listings, container) {
        if (!listings.length) {
          container.innerHTML = '<div style="padding:10px;color:#ff8a80;">无结果</div>';
          return;
        }
        container.innerHTML = listings.slice(0, 50).map(item => `
          <div class="ae-result-item">
            <span class="ae-result-price">${item.price}元</span>
            <span class="ae-result-title-text" title="${item.title}">${item.title}
              ${item.otherTags.split('|').filter(t=>t.includes('阳台')).map(t=>'<span class="ae-tag">'+t.trim()+'</span>').join('')}
            </span>
          </div>
        `).join('');
        if (listings.length > 50) {
          container.innerHTML += `<div style="font-size:11px;opacity:0.6;text-align:center;padding-top:8px;">... 共${listings.length}条，仅显示前50条</div>`;
        }
      }
    
      // ========== 主执行流程 ==========
      
      // Step 1: 提取所有可见房源
      const extractResult = extractAllListings();
      
      if (!extractResult.ok) {
        return {
          ok: false,
          summary: extractResult.error,
          data: [],
          warnings: [`页面URL: ${location.href}`],
        };
      }
    
      // Step 2: 初始筛选和排序
      const filteredData = filterAndSort(extractResult.data, config);
    
      // Step 3: 创建浮动面板（如果启用）
      if (config.showPanel) {
        createPanel(extractResult);
      }
    
      // Step 4: 如果开启自动下载，直接生成CSV
      if (config.autoDownload && filteredData.length > 0) {
        const csv = generateCSV(filteredData);
        const timestamp = new Date().toISOString().slice(0,10);
        downloadFile(csv, `安居客租房_${timestamp}_${filteredData.length}条.csv`);
      }
    
      // 返回结构化数据
      return {
        ok: true,
        summary: `成功提取 ${extractResult.data.length} 条房源，筛选后 ${filteredData.length} 条`,
        totalCount: extractResult.data.length,
        filteredCount: filteredData.length,
        data: filteredData.map(item => ({
          序号: item.index,
          价格_元月: item.price,
          房源标题: item.title,
          小区名称: item.communityName,
          区域商圈: item.area,
          详细地址: item.address,
          户型: item.layout,
          面积_平方米: item.size,
          楼层: item.floor,
          朝向: item.direction,
          类型: item.rentType,
          电梯: item.hasElevator,
          地铁线: item.metroLines,
          特色标签: item.otherTags,
          经纪人: item.agentName,
          图片链接: item.imageUrl,
          网址: item.url,
        })),
        configUsed: config,
        warnings: filteredData.length === 0 ? ['筛选后无结果，请检查筛选条件'] : [],
      };
    }
  );
  if (typeof __tabOriginalFunction !== "function") {
    throw new Error("evaluate_script source must evaluate to a function");
  }
  return await __tabOriginalFunction(__tabScriptArgs);
})();