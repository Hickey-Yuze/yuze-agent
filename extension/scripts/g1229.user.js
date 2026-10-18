(function() {
  if (window.__multiPlatformExtractor) return;
  window.__multiPlatformExtractor = true;

  // ═══════════════════════════════════════════
  // 工具函数
  // ═══════════════════════════════════════════
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => [...(ctx || document).querySelectorAll(sel)];
  const cleanImgSrc = (img) => img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || img.dataset.src || '';
  const firstText = (selectors) => {
    for (const sel of selectors) {
      const el = $(sel);
      if (el && el.innerText.trim().length > 0) return el.innerText.trim();
    }
    return '';
  };
  const allText = (selectors) => {
    for (const sel of selectors) {
      const els = $$(sel);
      const texts = els.map(e => e.innerText.trim()).filter(t => t);
      if (texts.length) return texts;
    }
    return [];
  };

  // ═══════════════════════════════════════════
  // 平台检测
  // ═══════════════════════════════════════════
  const host = location.hostname;
  const PLATFORM = {
    TAOBAO:  host.includes('taobao.com') || host.includes('taobao.cn'),
    TMALL:   host.includes('tmall.com'),
    JD:      host.includes('jd.com') || host.includes('jd.hk'),
    PDD:     host.includes('pinduoduo.com') || host.includes('yangkeduo.com'),
    ALBB:    host.includes('1688.com'),
  };
  const currentPlatform = Object.entries(PLATFORM).find(([, v]) => v)?.[0] || 'UNKNOWN';
  console.log(`[商品提取] 检测到平台: ${currentPlatform}`);

  // ═══════════════════════════════════════════
  // 各平台选择器配置
  // ═══════════════════════════════════════════
  const CONFIGS = {
    TAOBAO: {
      label: '淘宝',
      title: [
        '[class*="Title--mainTitle"]', '[class*="Title--"] span',
        '.tb-main-title', 'h1[class*="title"]',
      ],
      promoPrice: [
        '[class*="price--promo"] [class*="priceText--"]',
        '[class*="Price--priceText"]', '.tb-rmb-num',
        '[class*="priceText"]',
      ],
      originalPrice: [
        '[class*="price--original"] [class*="priceText--"]',
        '[class*="originalPrice"]', '.tb-original-price',
      ],
      shopName: [
        '[class*="shopName--"] a', '[class*="ShopName--"] a',
        '.tb-shop-name a',
      ],
      shopRating: [
        '[class*="shopRating--"]', '[class*="shopScore--"]',
      ],
      sales: [
        '[class*="sellCount--"]', '[class*="Counter--"]',
        '[class*="Sold--"]',
      ],
      reviewCount: [
        '[class*="reviewCount--"]', '[class*="Comment--count"]',
      ],
      skuLabels: [
        '[class*="skuLabel--"]', '[class*="SkuLabel--"]',
        '[class*="skuKind--"]',
      ],
      skuOptions: [
        '[class*="skuText--"]', '[class*="SkuText--"]',
        '[class*="skuValue--"]',
      ],
      attributes: [
        '[class*="AttrItem--"]', '[class*="attributeList--"] li',
        '[class*="AttrRow--"]', '[class*="parameter--"] li',
      ],
      mainImages: [
        '[class*="PicGallery--"] img', '[class*="mainPic--"] img',
        '[class*="MainPic--"] img',
      ],
      detailImages: [
        '[class*="descV8--"] img', '[class*="detail--"] img',
        '#description img', '[class*="ke-post"] img',
      ],
      promotions: [
        '[class*="promotions--"] [class*="item--"]',
        '[class*="coupon--"]', '[class*="Coupon--"]',
      ],
      shipping: [
        '[class*="shipping--"]', '[class*="Shipping--"]',
        '[class*="delivery--"]',
      ],
    },

    TMALL: {
      label: '天猫',
      title: [
        '[class*="ItemHeader--mainTitle"]', '[class*="ItemHeader--"]',
        '.tb-detail-hd h1', '[class*="title--mainTitle"]',
      ],
      promoPrice: [
        '[class*="Price--priceText"]', '[class*="priceText--"]',
        '.tm-price', '.tb-rmb-num',
      ],
      originalPrice: [
        '[class*="Price--original"]', '[class*="originalPrice"]',
        '.tm-original-price',
      ],
      shopName: [
        '[class*="shopName--"] a', '[class*="ShopName--"]',
        '.shop-name a', '.shopName a',
      ],
      shopRating: [
        '[class*="shopRating--"]', '[class*="rating--"]',
      ],
      sales: [
        '[class*="sellCount--"]', '[class*="Sold--"]',
        '[class*="Counter--"]',
      ],
      reviewCount: [
        '[class*="reviewCount--"]', '[class*="Comment--"]',
      ],
      skuLabels: [
        '[class*="skuLabel--"]', '[class*="SkuLabel--"]',
      ],
      skuOptions: [
        '[class*="skuText--"]', '[class*="SkuText--"]',
      ],
      attributes: [
        '[class*="AttrItem--"]', '[class*="attribute--"] li',
        '#J_AttrList li',
      ],
      mainImages: [
        '[class*="PicGallery--"] img', '[class*="mainPic--"] img',
        '#J_UlView img',
      ],
      detailImages: [
        '[class*="descV8--"] img', '#description img',
        '[class*="detail--"] img',
      ],
      promotions: [
        '[class*="promotions--"]', '[class*="coupon--"]',
      ],
      shipping: [
        '[class*="shipping--"]', '[class*="delivery--"]',
      ],
    },

    JD: {
      label: '京东',
      title: [
        '.sku-name', '.itemInfo-wrap .item-name',
        '.product-intro .item-name', '[class*="sku-name"]',
        '#detail .sku-name',
      ],
      promoPrice: [
        '.price.J-p-', '.p-price .price',
        '[class*="price"] .J-p-', '.p-price span',
        '#jd-price',
      ],
      originalPrice: [
        '.p-price .del', '.market-price',
        '[class*="origin-price"]',
      ],
      shopName: [
        '.J-hove-wrap .name a', '.shopName a',
        '.follow-shop .name a', '[class*="shopName"] a',
        '.J-hove-wrap .name',
      ],
      shopRating: [
        '.shop-score span', '[class*="score"]',
      ],
      sales: [
        '.comment-count a', '[class*="comment-count"]',
        '#comm-number',
      ],
      reviewCount: [
        '.comment-item .count', '#comm-number',
      ],
      skuLabels: [
        '#choose-attr .dt', '.choose-attr .dt',
        '[class*="sku-label"]', '.dt',
      ],
      skuOptions: [
        '#choose-attr .item a', '.choose-attr .item a',
        '#choose-attr .item',
      ],
      attributes: [
        '.Ptable-item', '.p-parameter-list li',
        '#detail .Ptable li', '.parameter2-list li',
        '[class*="Ptable"] li',
      ],
      mainImages: [
        '#spec-list img', '#spec-n1 img',
        '.J-p-view img', '.lh img',
      ],
      detailImages: [
        '#J-detail-content img', '#detail img',
        '.detail-content img', '[class*="detail-content"] img',
      ],
      promotions: [
        '.J-prom-flag', '.promo-tag',
        '[class*="promotion"]', '.quan-item',
      ],
      shipping: [
        '.p-postage', '[class*="postage"]',
      ],
    },

    PDD: {
      label: '拼多多',
      title: [
        '[class*="goodsName"]', '[class*="goods-name"]',
        '.goods-name', 'h1',
      ],
      promoPrice: [
        '[class*="price--"]', '[class*="priceNum"]',
        '[class*="groupPrice"]', '.price-num',
      ],
      originalPrice: [
        '[class*="originPrice"]', '[class*="original-price"]',
        '[class*="singlePrice"]',
      ],
      shopName: [
        '[class*="mallName"]', '[class*="shopName"]',
        '[class*="store-name"] a',
      ],
      shopRating: [
        '[class*="mallScore"]', '[class*="shopScore"]',
      ],
      sales: [
        '[class*="sales"]', '[class*="soldNum"]',
        '[class*="sellCount"]',
      ],
      reviewCount: [
        '[class*="reviewNum"]', '[class*="commentNum"]',
      ],
      skuLabels: [
        '[class*="skuLabel"]', '[class*="groupTitle"]',
      ],
      skuOptions: [
        '[class*="skuItem"]', '[class*="specItem"]',
      ],
      attributes: [
        '[class*="attrItem"]', '[class*="parameter"] li',
      ],
      mainImages: [
        '[class*="goodsGallery"] img', '[class*="swiper"] img',
        '[class*="carousel"] img',
      ],
      detailImages: [
        '[class*="detailContent"] img', '[class*="descContent"] img',
        '[class*="goodsDesc"] img',
      ],
      promotions: [
        '[class*="coupon"]', '[class*="promotion"]',
      ],
      shipping: [
        '[class*="shipping"]', '[class*="freight"]',
      ],
    },

    ALBB: {
      label: '1688',
      title: [
        '.subject-title', '.title-text',
        '[class*="subject-title"]', 'h1[class*="title"]',
        '.d-title',
      ],
      promoPrice: [
        '.price-value', '.price-original',
        '[class*="price-value"]', '[class*="PriceValue"]',
        '.price-now',
      ],
      originalPrice: [
        '.price-range', '.price-original',
        '[class*="price-range"]',
      ],
      shopName: [
        '.shop-name a', '[class*="shopName"]',
        '.company-name a',
      ],
      shopRating: [
        '.shop-rate', '[class*="shopScore"]',
      ],
      sales: [
        '.sale-num', '[class*="saleNum"]',
        '[class*="sold"]',
      ],
      reviewCount: [
        '.review-num', '[class*="reviewNum"]',
      ],
      skuLabels: [
        '.sku-label', '[class*="skuLabel"]',
        '.obj-attr .name',
      ],
      skuOptions: [
        '.sku-item', '.obj-attr .values span',
        '[class*="skuItem"]',
      ],
      attributes: [
        '.offer-attr-item', '[class*="attribute"] li',
        '.offer-detail-row',
      ],
      mainImages: [
        '.vertical-view img', '.image-nav img',
        '[class*="mainImage"] img', '[class*="gallery"] img',
      ],
      detailImages: [
        '.desc-content img', '#mod-detail-description img',
        '[class*="desc-content"] img',
      ],
      promotions: [
        '[class*="coupon"]', '[class*="promotion"]',
      ],
      shipping: [
        '.shipping-info', '[class*="freight"]',
      ],
    },
  };

  // ═══════════════════════════════════════════
  // 通用提取逻辑
  // ═══════════════════════════════════════════
  const config = CONFIGS[currentPlatform] || CONFIGS.TAOBAO;

  function extractTitle() {
    const title = firstText(config.title);
    if (title) return title;
    return document.title.replace(/[-–—|].*(淘宝|天猫|京东|拼多多|1688|阿里巴巴).*/g, '').trim();
  }

  function extractPrices() {
    const prices = {};
    const promo = firstText(config.promoPrice);
    const orig = firstText(config.originalPrice);
    if (promo) prices.promoPrice = promo.replace(/[^\d.~\-起元¥￥]/g, '').replace(/^(\d)/, '¥$1');
    if (orig) prices.originalPrice = orig.replace(/[^\d.~\-起元¥￥]/g, '').replace(/^(\d)/, '¥$1');

    if (!promo && !orig) {
      const any = firstText(config.promoPrice.concat(config.originalPrice));
      if (any) prices.detectedPrice = any;
    }
    return prices;
  }

  function extractShop() {
    const shop = {};
    const name = firstText(config.shopName);
    if (name) shop.name = name;

    const rating = firstText(config.shopRating);
    if (rating) shop.rating = rating;

    const fansEl = $('[class*="shopFans"], [class*="fansNum"], [class*="follower"]');
    if (fansEl) shop.fans = fansEl.innerText.trim();

    return shop;
  }

  function extractSales() {
    const info = {};
    const sales = firstText(config.sales);
    if (sales) info.sales = sales;

    const reviews = firstText(config.reviewCount);
    if (reviews) info.reviewCount = reviews;
    return info;
  }

  function extractSKUs() {
    const groups = [];
    const labels = $$(config.skuLabels.join(', '));
    const seen = new Set();

    labels.forEach(labelEl => {
      const label = labelEl.innerText.trim().replace(/[:：]/g, '');
      if (!label || seen.has(label)) return;
      seen.add(label);

      const container = labelEl.closest('[class*="sku"], [class*="Sku"], [class*="attr"], [class*="Attr"]')
        || labelEl.parentElement?.parentElement
        || labelEl.parentElement;
      if (!container) return;

      const options = $$(config.skuOptions.join(', '), container)
        .map(o => o.innerText.trim())
        .filter(t => t && t !== label);

      if (options.length > 0) {
        groups.push({ label, options: [...new Set(options)] });
      }
    });
    return groups;
  }

  function extractAttributes() {
    const attrs = [];
    $$(config.attributes.join(', ')).forEach(el => {
      const text = el.innerText.trim().replace(/：/g, ':');
      if (text && text.includes(':')) {
        attrs.push(text);
      }
    });

    // 京东特有：Ptable 表格
    if (currentPlatform === 'JD') {
      $$('.Ptable tr, .p-parameter-list li').forEach(tr => {
        const tds = tr.querySelectorAll('td, th, .name, .value');
        if (tds.length >= 2) {
          attrs.push(`${tds[0].innerText.trim()}: ${tds[1].innerText.trim()}`);
        }
      });
    }

    return [...new Set(attrs)];
  }

  function extractMainImages() {
    const images = [];
    $$(config.mainImages.join(', ')).forEach(img => {
      const src = cleanImgSrc(img);
      if (src && !images.includes(src)) images.push(src);
    });
    return images;
  }

  function extractDetailImages() {
    const images = [];
    $$(config.detailImages.join(', ')).forEach(img => {
      const src = cleanImgSrc(img);
      if (src && !images.includes(src)) images.push(src);
    });
    return images;
  }

  function extractPromotions() {
    const promos = allText(config.promotions);
    return [...new Set(promos.filter(p => p.length < 200))];
  }

  function extractShipping() {
    return firstText(config.shipping);
  }

  // ═══════════════════════════════════════════
  // Markdown 生成
  // ═══════════════════════════════════════════
  function generateMarkdown(data) {
    let md = '';
    const platformEmoji = {
      TAOBAO: '🟠', TMALL: '🔴', JD: '🔴', PDD: '🔴', ALBB: '🟠'
    };
    const emoji = platformEmoji[data.platform] || '🛒';

    md += `# ${emoji} ${data.title}\n\n`;
    md += `> 📦 平台：**​${data.platformLabel}​**  \n`;
    md += `> 🕐 提取时间：${data.extractTime}  \n`;
    md += `> 🔗 页面链接：${data.url}\n\n`;
    md += `---\n\n`;

    // 价格
    if (data.prices.promoPrice || data.prices.originalPrice || data.prices.detectedPrice) {
      md += `## 💰 价格信息\n\n`;
      if (data.prices.promoPrice)  md += `- **促销价**：${data.prices.promoPrice}\n`;
      if (data.prices.originalPrice) md += `- **原价**：${data.prices.originalPrice}\n`;
      if (data.prices.detectedPrice) md += `- **检测价格**：${data.prices.detectedPrice}\n`;
      md += '\n';
    }

    // 店铺
    if (data.shop.name) {
      md += `## 🏪 店铺信息\n\n`;
      md += `- **店铺名称**：${data.shop.name}\n`;
      if (data.shop.rating) md += `- **店铺评分**：${data.shop.rating}\n`;
      if (data.shop.fans)  md += `- **粉丝数**：${data.shop.fans}\n`;
      md += '\n';
    }

    // 销量
    if (data.sales.sales || data.sales.reviewCount) {
      md += `## 📊 销售数据\n\n`;
      if (data.sales.sales)       md += `- **销量**：${data.sales.sales}\n`;
      if (data.sales.reviewCount) md += `- **评价数**：${data.sales.reviewCount}\n`;
      md += '\n';
    }

    // 物流
    if (data.shipping) {
      md += `## 🚚 物流信息\n\n${data.shipping}\n\n`;
    }

    // SKU
    if (data.skus.length > 0) {
      md += `## 🏷️ 商品规格\n\n`;
      data.skus.forEach(sku => {
        md += `**​${sku.label}​**：${sku.options.join('、')}\n\n`;
      });
    }

    // 优惠
    if (data.promotions.length > 0) {
      md += `## 🎁 优惠活动\n\n`;
      data.promotions.forEach(p => { md += `- ${p}\n`; });
      md += '\n';
    }

    // 属性参数
    if (data.attributes.length > 0) {
      md += `## 📋 商品参数\n\n`;
      md += `| 参数 | 值 |\n|------|----|\n`;
      data.attributes.forEach(attr => {
        const idx = attr.indexOf(':');
        if (idx > 0) {
          md += `| ${attr.slice(0, idx).trim()} | ${attr.slice(idx + 1).trim()} |\n`;
        }
      });
      md += '\n';
    }

    // 主图
    if (data.mainImages.length > 0) {
      md += `## 🖼️ 商品主图\n\n`;
      data.mainImages.forEach((src, i) => {
        md += `![主图${i + 1}](${src})\n\n`;
      });
    }

    // 详情图
    if (data.detailImages.length > 0) {
      md += `## 📄 商品详情图\n\n`;
      data.detailImages.forEach((src, i) => {
        md += `![详情${i + 1}](${src})\n\n`;
      });
    }

    md += `---\n\n*由多平台商品信息提取脚本自动生成 | 平台：${data.platformLabel}*\n`;
    return md;
  }

  // ═══════════════════════════════════════════
  // 下载
  // ═══════════════════════════════════════════
  function downloadMarkdown(content, filename) {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ═══════════════════════════════════════════
  // 主提取流程
  // ═══════════════════════════════════════════
  function extractAll() {
    console.log(`[商品提取] 平台: ${config.label} | 开始提取...`);

    const data = {
      platform: currentPlatform,
      platformLabel: config.label,
      title: extractTitle(),
      prices: extractPrices(),
      shop: extractShop(),
      sales: extractSales(),
      shipping: extractShipping(),
      skus: extractSKUs(),
      attributes: extractAttributes(),
      promotions: extractPromotions(),
      mainImages: extractMainImages(),
      detailImages: extractDetailImages(),
      url: location.href,
      extractTime: new Date().toLocaleString('zh-CN'),
    };

    console.log('[商品提取] 提取结果:', data);

    const md = generateMarkdown(data);
    const safeName = data.title.replace(/[\\/:*?"<>|\r\n]/g, '_').substring(0, 80);
    downloadMarkdown(md, `[${config.label}]${safeName}.md`);

    console.log('[商品提取] ✅ Markdown 已下载');
    return data;
  }

  function waitAndExtract() {
    // 滚动以触发懒加载
    const scrollToBottom = (cb) => {
      let scrollCount = 0;
      const maxScrolls = 5;
      const step = () => {
        if (scrollCount >= maxScrolls) {
          setTimeout(cb, 2000);
          return;
        }
        window.scrollTo({ top: document.body.scrollHeight * (scrollCount + 1) / maxScrolls, behavior: 'smooth' });
        scrollCount++;
        setTimeout(step, 1200);
      };
      step();
    };

    scrollToBottom(extractAll);
  }

  // ═══════════════════════════════════════════
  // 启动
  // ═══════════════════════════════════════════
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitAndExtract);
  } else {
    waitAndExtract();
  }
})();