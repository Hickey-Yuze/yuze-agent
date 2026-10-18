(function() {
  'use strict';

  // ====== 平台识别 ======
  function detectPlatform() {
    var url = window.location.href;
    if (url.includes('taobao.com') || url.includes('tmall.com')) return 'taobao';
    if (url.includes('jd.com')) return 'jd';
    if (url.includes('pinduoduo.com') || url.includes('yangkeduo.com')) return 'pdd';
    if (url.includes('1688.com')) return '1688';
    if (url.includes('xiaohongshu.com')) return 'xhs';
    return 'unknown';
  }

  // ====== URL清洗：获取高清原图 ======
  function getOriginalUrl(url) {
    if (!url || url.startsWith('data:') || url.startsWith('blob:')) return '';
    if (url.startsWith('//')) url = 'https:' + url;
    // 去除淘宝/天猫/1688尺寸后缀 _430x430.jpg → .jpg
    url = url.replace(/_\d+x\d+(\.(jpg|jpeg|png|webp))/gi, '$1');
    // 去除京东尺寸后缀 s800x800 → 原图
    url = url.replace(/\/s\d+x\d+_\w+\//, '/');
    // 去除小红书尺寸后缀
    url = url.replace(/\/\w+\/!.*$/, '');
    // 过滤小图标/sprite
    if (url.includes('sprite') || url.includes('icon') || url.includes('logo') || url.includes('avatar') || url.includes('search')) return '';
    if (url.endsWith('.svg') || url.endsWith('.gif')) return '';
    return url;
  }

  // ====== 提取商品标题 ======
  function getProductTitle(platform) {
    var selectors = {
      'taobao': '[class*="Title"] span, [class*="title"] h1, h1',
      'jd': '.sku-name, .itemInfo-wrap .item-name, h1',
      'pdd': '[class*="goods-name"], [class*="title"]',
      '1688': '[class*="title"] span, [class*="Title"]',
      'xhs': '[class*="title"] span'
    };
    var sel = selectors[platform] || 'h1';
    var el = document.querySelector(sel);
    return el ? el.innerText.trim().substring(0, 30).replace(/[\\/:*?"<>|]/g, '') : 'product';
  }

  // ====== 提取图片 ======
  function extractImages(platform) {
    var mainImages = [];
    var detailImages = [];

    // 主图提取规则
    var mainSelectors = {
      'taobao': '[class*="MainPic"] img, [class*="mainPic"] img, [class*="PicGallery"] img, [class*="gallery"] img, [class*="slider"] img, [class*="main-image"] img',
      'jd': '#spec-img, .J-focus-img img, #preview img, .lh img, [class*="main-img"] img',
      'pdd': '[class*="goodsImage"] img, [class*="mainImage"] img, [class*="carousel"] img, [class*="swiper"] img',
      '1688': '[class*="image"] img, [class*="Image"] img, .offer-detail img, [class*="slider"] img',
      'xhs': '[class*="slide"] img, [class*="carousel"] img, [class*="note-image"] img'
    };

    var detailSelectors = {
      'taobao': '#description img, [class*="desc"] img, [class*="detail"] img, [class*="DescDetail"] img',
      'jd': '#detail img, .detail-content img, [class*="detail"] img',
      'pdd': '[class*="detail"] img, [class*="desc"] img',
      '1688': '[class*="desc"] img, [class*="detail"] img, .offer-detail img',
      'xhs': ''
    };

    // 提取主图
    var mainSel = mainSelectors[platform] || '';
    if (mainSel) {
      document.querySelectorAll(mainSel).forEach(function(img) {
        var src = getOriginalUrl(img.src || img.dataset.src || img.dataset.original || '');
        if (src && mainImages.indexOf(src) === -1) mainImages.push(src);
      });
    }

    // 提取详情图
    var detailSel = detailSelectors[platform] || '';
    if (detailSel) {
      document.querySelectorAll(detailSel).forEach(function(img) {
        var src = getOriginalUrl(img.src || img.dataset.src || img.dataset.original || '');
        if (src && detailImages.indexOf(src) === -1 && mainImages.indexOf(src) === -1) detailImages.push(src);
      });
    }

    // 通用兜底：查找页面大图
    if (mainImages.length === 0) {
      document.querySelectorAll('img').forEach(function(img) {
        var w = img.naturalWidth || img.width || 0;
        var h = img.naturalHeight || img.height || 0;
        var src = getOriginalUrl(img.src || img.dataset.src || '');
        if (src && (w > 200 || h > 200) && mainImages.indexOf(src) === -1) {
          mainImages.push(src);
        }
      });
    }

    return { mainImages: mainImages, detailImages: detailImages };
  }

  // ====== 下载单张图片 ======
  function downloadSingle(url, filename) {
    fetch(url, { mode: 'cors' })
      .then(function(resp) { return resp.blob(); })
      .then(function(blob) {
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
      })
      .catch(function() {
        window.open(url, '_blank');
      });
  }

  // ====== 批量下载 ======
  function downloadAll(urls, prefix) {
    var delay = 300;
    urls.forEach(function(url, i) {
      setTimeout(function() {
        var ext = url.match(/\.(jpg|jpeg|png|webp)/i);
        ext = ext ? ext[1] : 'jpg';
        downloadSingle(url, prefix + '_' + (i + 1) + '.' + ext);
      }, i * delay);
    });
  }

  // ====== 注入UI ======
  function injectUI(data, title) {
    // 移除旧面板
    var old = document.getElementById('Yuze-img-extractor');
    if (old) old.remove();

    var allImages = data.mainImages.concat(data.detailImages);
    var mainCount = data.mainImages.length;
    var detailCount = data.detailImages.length;

    if (allImages.length === 0) return;

    var panel = document.createElement('div');
    panel.id = 'Yuze-img-extractor';

    // 样式
    var style = document.createElement('style');
    style.textContent = '\
      #Yuze-img-btn{position:fixed;right:20px;bottom:20px;width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;font-size:24px;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:99999;box-shadow:0 4px 15px rgba(102,126,234,0.4);transition:transform .2s}\
      #Yuze-img-btn:hover{transform:scale(1.1)}\
      #Yuze-img-panel{position:fixed;right:20px;top:50%;transform:translateY(-50%);width:360px;max-height:80vh;background:#fff;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.15);z-index:99999;font-family:-apple-system,sans-serif;display:flex;flex-direction:column;overflow:hidden}\
      .tie-header{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;padding:16px;display:flex;justify-content:space-between;align-items:center}\
      .tie-header h3{margin:0;font-size:16px;font-weight:600}\
      .tie-close{background:none;border:none;color:#fff;font-size:20px;cursor:pointer;padding:0;line-height:1}\
      .tie-info{padding:12px 16px;background:#f8f9fa;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center;font-size:13px;color:#666}\
      .tie-body{overflow-y:auto;flex:1;padding:12px}\
      .tie-section{margin-bottom:12px}\
      .tie-section-title{font-size:13px;font-weight:600;color:#333;margin-bottom:8px;padding-bottom:4px;border-bottom:2px solid #667eea}\
      .tie-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}\
      .tie-card{position:relative;border-radius:8px;overflow:hidden;background:#f5f5f5;cursor:pointer;aspect-ratio:1}\
      .tie-card img{width:100%;height:100%;object-fit:cover}\
      .tie-card:hover .tie-dl{opacity:1}\
      .tie-dl{position:absolute;bottom:0;left:0;right:0;background:rgba(102,126,234,0.9);color:#fff;text-align:center;font-size:12px;padding:6px;opacity:0;transition:opacity .2s}\
      .tie-footer{padding:12px 16px;border-top:1px solid #eee;display:flex;gap:8px}\
      .tie-btn{flex:1;padding:10px;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;transition:opacity .2s}\
      .tie-btn:hover{opacity:0.9}\
      .tie-btn-primary{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff}\
      .tie-btn-secondary{background:#f0f0f0;color:#333}\
    ';
    document.head.appendChild(style);

    // 浮动按钮
    var btn = document.createElement('div');
    btn.id = 'Yuze-img-btn';
    btn.textContent = '📸';
    btn.title = '提取商品图片';
    document.body.appendChild(btn);

    // 面板内容
    var mainHTML = '';
    if (data.mainImages.length > 0) {
      mainHTML += '<div class="tie-section"><div class="tie-section-title">📷 主图（' + mainCount + '张）</div><div class="tie-grid">';
      data.mainImages.forEach(function(url, i) {
        mainHTML += '<div class="tie-card"><img src="' + url + '" loading="lazy"><div class="tie-dl" data-url="' + url + '" data-name="' + title + '_主图_' + (i+1) + '">下载</div></div>';
      });
      mainHTML += '</div></div>';
    }

    var detailHTML = '';
    if (data.detailImages.length > 0) {
      detailHTML += '<div class="tie-section"><div class="tie-section-title">📄 详情图（' + detailCount + '张）</div><div class="tie-grid">';
      data.detailImages.forEach(function(url, i) {
        detailHTML += '<div class="tie-card"><img src="' + url + '" loading="lazy"><div class="tie-dl" data-url="' + url + '" data-name="' + title + '_详情_' + (i+1) + '">下载</div></div>';
      });
      detailHTML += '</div></div>';
    }

    var panelHTML = '\
      <div id="Yuze-img-panel" style="display:none">\
        <div class="tie-header"><h3>📸 商品图提取</h3><button class="tie-close" id="tie-close-btn">✕</button></div>\
        <div class="tie-info"><span>共 <b>' + allImages.length + '</b> 张图片（主图' + mainCount + ' + 详情' + detailCount + '）</span><button id="tie-rescan" style="background:none;border:none;color:#667eea;font-size:13px;cursor:pointer">🔄 重新扫描</button></div>\
        <div class="tie-body">' + mainHTML + detailHTML + '</div>\
        <div class="tie-footer">\
          <button class="tie-btn tie-btn-secondary" id="tie-dl-main">下载主图（' + mainCount + '张）</button>\
          <button class="tie-btn tie-btn-primary" id="tie-dl-all">一键下载全部（' + allImages.length + '张）</button>\
        </div>\
      </div>';

    document.body.insertAdjacentHTML('beforeend', panelHTML);

    // 事件绑定
    btn.addEventListener('click', function() {
      var p = document.getElementById('Yuze-img-panel');
      p.style.display = p.style.display === 'none' ? 'flex' : 'none';
    });

    document.getElementById('tie-close-btn').addEventListener('click', function() {
      document.getElementById('Yuze-img-panel').style.display = 'none';
    });

    document.getElementById('tie-rescan').addEventListener('click', function() {
      var newData = extractImages(detectPlatform());
      document.getElementById('Yuze-img-panel').remove();
      injectUI(newData, getProductTitle(detectPlatform()));
      document.getElementById('Yuze-img-panel').style.display = 'flex';
    });

    document.getElementById('tie-dl-main').addEventListener('click', function() {
      if (data.mainImages.length > 0) downloadAll(data.mainImages, title + '_主图');
    });

    document.getElementById('tie-dl-all').addEventListener('click', function() {
      downloadAll(allImages, title);
    });

    // 单张下载
    document.querySelectorAll('.tie-dl').forEach(function(el) {
      el.addEventListener('click', function(e) {
        e.stopPropagation();
        var url = this.getAttribute('data-url');
        var name = this.getAttribute('data-name');
        var ext = url.match(/\.(jpg|jpeg|png|webp)/i);
        ext = ext ? ext[1] : 'jpg';
        downloadSingle(url, name + '.' + ext);
      });
    });
  }

  // ====== 主流程 ======
  var platform = detectPlatform();
  if (platform === 'unknown') return;

  // 延迟执行，等页面加载
  setTimeout(function() {
    var data = extractImages(platform);
    var title = getProductTitle(platform);
    injectUI(data, title);
  }, 2000);

})();