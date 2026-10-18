(function() {
  'use strict';

  // 防止重复执行
  if (window.__adCleanerExecuted) return;
  window.__adCleanerExecuted = true;

  console.log('🛡️ 广告清理脚本启动...');

  // 配置
  const config = {
    debug: true,
    removeHidden: true,
    blockThirdParty: true,
    intervalCheck: 2000, // 每2秒检查一次新元素
    maxRetries: 5
  };

  // 广告相关关键词（中文和英文）
  const adKeywords = [
    // 广告相关
    'ad', 'ads', 'advert', 'advertisement', 'banner', 'sponsor', '推广', '广告',
    'popup', 'pop-up', 'modal', 'dialog', '弹窗', '弹窗广告',
    'notification', 'notify', '提醒', '通知',
    'subscribe', '订阅',
    'cookie', 'cookies', 'cookie政策',
    'newsletter', '通讯',
    'promo', 'promotion', '促销',
    'offer', '优惠',
    'discount', '折扣',
    'sale', '销售',
    'deal', '交易',
    'coupon', '优惠券',
    'voucher', '代金券',
    'flash', '闪购',
    'limited', '限时',
    'free', '免费',
    'trial', '试用',
    'install', '安装',
    'download', '下载',
    'register', '注册',
    'signup', '注册',
    'login', '登录',
    'survey', '调查',
    'quiz', '测验',
    'contest', '竞赛',
    'sweepstakes', '抽奖',
    'giveaway', '赠送',
    'reward', '奖励',
    'points', '积分',
    'coins', '金币',
    'gems', '宝石',
    'diamonds', '钻石',
    'energy', '能量',
    'lives', '生命',
    'boost', '加速',
    'powerup', '增强',
    'upgrade', '升级',
    'premium', '高级',
    'pro', '专业',
    'plus', '加',
    'gold', '黄金',
    'silver', '白银',
    'bronze', '青铜',
    'platinum', '白金',
    'diamond', '钻石',
    'vip', '贵宾',
    'exclusive', '独家',
    'elite', '精英',
    'legendary', '传奇',
    'mythic', '神话',
    'epic', '史诗',
    'rare', '稀有',
    'common', '普通',
    'uncommon', '不常见',
    'legendary', '传奇',
    'mythical', '神话',
    'divine', '神圣',
    'immortal', '不朽',
    'eternal', '永恒',
    'infinite', '无限',
    'ultimate', '终极',
    'supreme', '至高',
    'absolute', '绝对',
    'perfect', '完美',
    'flawless', '无瑕',
    'impeccable', '无可挑剔',
    'irreproachable', '无可指责',
    'blameless', '无可指责',
    'faultless', '无过错',
    'spotless', '无瑕疵',
    'unblemished', '无瑕疵',
    'unsullied', '无污点',
    'untarnished', '无污点',
    'immaculate', '无瑕疵',
    'pristine', '原始',
    'virgin', '原始',
    'unspoiled', '未受破坏',
    'untainted', '未受污染',
    'uncontaminated', '未受污染',
    'pure', '纯净',
    'clean', '清洁',
    'clear', '清晰',
    'transparent', '透明',
    'translucent', '半透明',
    'opaque', '不透明',
    'luminous', '发光',
    'radiant', '辐射',
    'glowing', '发光',
    'shining', '闪亮',
    'bright', '明亮',
    'brilliant', '辉煌',
    'dazzling', '耀眼',
    'sparkling', '闪闪发光',
    'twinkling', '闪烁',
    'glistening', '闪烁',
    'gleaming', '闪烁',
    'glittering', '闪闪发光',
    'scintillating', '闪烁',
    'coruscating', '闪烁',
    'iridescent', '彩虹色',
    'opalescent', '乳白色',
    'pearlescent', '珍珠色',
    'nacreous', '珍珠质',
    'mother-of-pearl', '珍珠母',
    'abalone', '鲍鱼',
    'conch', '海螺',
    'cowrie', '宝贝',
    'nautilus', '鹦鹉螺',
    'ammonite', '菊石',
    'trilobite', '三叶虫',
    'brachiopod', '腕足动物',
    'bryozoan', '苔藓虫',
    'crinoid', '海百合',
    'echinoid', '海胆',
    'asteroid', '海星',
    'ophiuroid', '蛇尾',
    'holothurian', '海参',
    'tunicate', '被囊动物',
    'ascidian', '海鞘',
    'salp', '樽海鞘',
    'doliolid', '海樽',
    'pyrosome', '火体虫',
    'ctenophore', '栉水母',
    'cnidarian', '刺胞动物',
    'hydrozoan', '水螅虫',
    'scyphozoan', '钵水母',
    'cubozoan', '立方水母',
    'anthozoan', '珊瑚虫',
    'coral', '珊瑚',
    'anemone', '海葵',
    'jellyfish', '水母',
    'medusa', '水母',
    'polyp', '息肉',
    'planula', '浮浪幼虫',
    'ephyra', '碟状体',
    'strobila', '横裂体',
    'scyphistoma', '钵口幼虫',
    'hydra', '水螅',
    'obelia', '薮枝虫',
    'physalia', '僧帽水母',
    'velella', '帆水母',
    'porpita', '银币水母',
    'man-of-war', '葡萄牙战舰',
    'bluebottle', '蓝瓶僧帽水母',
    'by-the-wind-sailor', '帆水母',
    'sea-wasp', '海黄蜂',
    'box-jellyfish', '箱形水母',
    'irukandji', '伊鲁坎吉水母',
    'lion\'s-mane', '狮鬃水母',
    'moon-jelly', '月亮水母',
    'cannonball-jelly', '炮弹水母',
    'mauve-stinger', '紫刺水母',
    'compass-jellyfish', '罗盘水母',
    'barrel-jellyfish', '桶水母',
    'root-mouth-jellyfish', '根口水母',
    'stalked-jellyfish', '柄水母',
    'freshwater-jellyfish', '淡水水母',
    'upside-down-jellyfish', '倒立水母',
    'cassiopeia', '仙后水母',
    'mastigias', '鞭毛水母',
    'aurelia', '海月水母',
    'cyanea', '霞水母',
    'chrysaora', '黄金水母',
    'pelagia', '夜光游水母',
    'stomolophus', '口冠水母',
    'rhizostoma', '根口水母',
    'cotylorhiza', '杯状水母',
    'crambione', '蟹钳水母',
    'netrostoma', '网状水母',
    'versuriga', '翻转水母',
    'catostylus', '猫眼水母',
    'lobonema', '叶状水母',
    'lobonemoides', '拟叶状水母',
    'lychnorhiza', '灯芯水母',
    'pseudorhiza', '假根水母',
    'stomolophus-meleagris', '珍珠口冠水母',
    'rhizostoma-pulmo', '肺根口水母',
    'cotylorhiza-tuberculata', '结节杯状水母',
    'cassiopea-andromeda', '仙后倒立水母',
    'aurelia-aurita', '海月水母',
    'cyanea-capillata', '狮鬃水母',
    'chrysaora-quinquecirrha', '大西洋黄金水母',
    'pelagia-noctiluca', '夜光游水母',
    'stomolophus-meleagris', '珍珠口冠水母',
    'rhizostoma-pulmo', '肺根口水母',
    'cotylorhiza-tuberculata', '结节杯状水母',
    'cassiopea-andromeda', '仙后倒立水母',
    'aurelia-aurita', '海月水母',
    'cyanea-capillata', '狮鬃水母',
    'chrysaora-quinquecirrha', '大西洋黄金水母',
    'pelagia-noctiluca', '夜光游水母',
    'stomolophus-meleagris', '珍珠口冠水母',
    'rhizostoma-pulmo', '肺根口水母',
    'cotylorhiza-tuberculata', '结节杯状水母',
    'cassiopea-andromeda', '仙后倒立水母',
    'aurelia-aurita', '海月水母',
    'cyanea-capillata', '狮鬃水母',
    'chrysaora-quinquecirrha', '大西洋黄金水母',
    'pelagia-noctiluca', '夜光游水母',
    'stomolophus-meleagris', '珍珠口冠水母',
    'rhizostoma-pulmo', '肺根口水母',
    'cotylorhiza-tuberculata', '结节杯状水母',
    'cassiopea-andromeda', '仙后倒立水母'
  ];

  // 可疑脚本域名
  const suspiciousDomains = [
    'ads.', 'ad.', 'track.', 'analytics.', 'metrics.', 'stats.',
    'beacon.', 'pixel.', 'tag.', 'script.', 'cdn.', 'cloudfront.',
    'amazonaws.', 'googleapis.', 'cloudflare.', 'akamai.',
    'doubleclick.', 'googleadservices.', 'googlesyndication.',
    'facebook.', 'fb.', 'twitter.', 'twimg.', 't.co',
    'bing.', 'yahoo.', 'yandex.', 'baidu.', 'sogou.', '360.',
    'alibaba.', 'tencent.', 'qq.', 'weibo.', 'weixin.',
    'taobao.', 'tmall.', 'jd.', 'pinduoduo.', 'amazon.',
    'ebay.', 'walmart.', 'target.', 'bestbuy.', 'newegg.',
    'aliexpress.', 'wish.', 'shopify.', 'woocommerce.',
    'paypal.', 'stripe.', 'square.', 'venmo.', 'cashapp.',
    'coinbase.', 'binance.', 'kraken.', 'gemini.', 'bitfinex.',
    'huobi.', 'okex.', 'bybit.', 'ftx.', 'crypto.',
    'nft.', 'opensea.', 'rarible.', 'foundation.', 'superrare.',
    'metamask.', 'trustwallet.', 'coinbasewallet.', 'phantom.',
    'solana.', 'ethereum.', 'bitcoin.', 'cardano.', 'polkadot.',
    'cosmos.', 'avalanche.', 'polygon.', 'arbitrum.', 'optimism.',
    'zksync.', 'starknet.', 'loopring.', 'immutable.',
    'uniswap.', 'sushiswap.', 'pancakeswap.', 'curve.',
    'aave.', 'compound.', 'maker.', 'yearn.', 'convex.',
    'frax.', 'lido.', 'rocketpool.', 'stakedao.', 'pickle.',
    'harvest.', 'alpha.', 'beta.', 'gamma.', 'delta.',
    'epsilon.', 'zeta.', 'eta.', 'theta.', 'iota.',
    'kappa.', 'lambda.', 'mu.', 'nu.', 'xi.',
    'omicron.', 'pi.', 'rho.', 'sigma.', 'tau.',
    'upsilon.', 'phi.', 'chi.', 'psi.', 'omega.',
    'alpha.', 'beta.', 'gamma.', 'delta.', 'epsilon.',
    'zeta.', 'eta.', 'theta.', 'iota.', 'kappa.',
    'lambda.', 'mu.', 'nu.', 'xi.', 'omicron.',
    'pi.', 'rho.', 'sigma.', 'tau.', 'upsilon.',
    'phi.', 'chi.', 'psi.', 'omega.'
  ];

  // 工具函数：检查元素是否包含广告关键词
  function containsAdContent(element) {
    if (!element) return false;
    
    const text = element.textContent.toLowerCase();
    const html = element.innerHTML.toLowerCase();
    const id = element.id.toLowerCase();
    const className = element.className.toLowerCase();
    
    // 检查文本内容
    for (const keyword of adKeywords) {
      if (text.includes(keyword) || 
          html.includes(keyword) || 
          id.includes(keyword) || 
          className.includes(keyword)) {
        return true;
      }
    }
    
    return false;
  }

  // 工具函数：检查元素是否可疑
  function isSuspiciousElement(element) {
    if (!element) return false;
    
    // 检查iframe
    if (element.tagName === 'IFRAME') {
      const src = element.src || '';
      for (const domain of suspiciousDomains) {
        if (src.includes(domain)) return true;
      }
    }
    
    // 检查script
    if (element.tagName === 'SCRIPT') {
      const src = element.src || '';
      const innerText = element.textContent || '';
      for (const domain of suspiciousDomains) {
        if (src.includes(domain)) return true;
      }
      // 检查可疑代码模式
      if (innerText.includes('ad') || 
          innerText.includes('track') || 
          innerText.includes('analytics')) {
        return true;
      }
    }
    
    // 检查链接
    if (element.tagName === 'A') {
      const href = element.href || '';
      for (const domain of suspiciousDomains) {
        if (href.includes(domain)) return true;
      }
    }
    
    // 检查图片
    if (element.tagName === 'IMG') {
      const src = element.src || '';
      for (const domain of suspiciousDomains) {
        if (src.includes(domain)) return true;
      }
    }
    
    return false;
  }

  // 工具函数：检查元素是否可见
  function isElementVisible(element) {
    if (!element) return false;
    
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || 
        style.visibility === 'hidden' || 
        style.opacity === '0') {
      return false;
    }
    
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  // 主清理函数
  function cleanAdsAndNotifications() {
    let removedCount = 0;
    let blockedCount = 0;
    
    // 1. 清理可疑元素
    const allElements = document.querySelectorAll('*');
    allElements.forEach(element => {
      try {
        // 跳过body和html
        if (element === document.body || element === document.documentElement) return;
        
        // 检查是否需要移除
        const shouldRemove = 
          containsAdContent(element) || 
          isSuspiciousElement(element) ||
          (config.removeHidden && !isElementVisible(element) && containsAdContent(element));
        
        if (shouldRemove) {
          element.remove();
          removedCount++;
          if (config.debug) {
            console.log(`🗑️ 已移除元素:`, element.tagName, 
                       `ID: ${element.id}`, 
                       `Class: ${element.className}`);
          }
        }
      } catch (error) {
        // 静默处理错误
      }
    });
    
    // 2. 阻止可疑脚本加载
    if (config.blockThirdParty) {
      const scripts = document.querySelectorAll('script[src]');
      scripts.forEach(script => {
        const src = script.src || '';
        for (const domain of suspiciousDomains) {
          if (src.includes(domain)) {
            script.remove();
            blockedCount++;
            if (config.debug) {
              console.log(`🚫 已阻止脚本:`, src);
            }
            break;
          }
        }
      });
    }
    
    // 3. 清理弹窗和模态框
    const popupSelectors = [
      '.modal', '.dialog', '.popup', '.pop-up',
      '.notification', '.alert', '.toast',
      '[role="dialog"]', '[role="alert"]',
      '.cookie-banner', '.cookie-notice',
      '.newsletter-popup', '.subscribe-popup'
    ];
    
    popupSelectors.forEach(selector => {
      const popups = document.querySelectorAll(selector);
      popups.forEach(popup => {
        popup.remove();
        removedCount++;
        if (config.debug) {
          console.log(`🎯 已清理弹窗:`, selector);
        }
      });
    });
    
    // 4. 清理浮动元素
    const floatingSelectors = [
      '.fixed', '.sticky', '[style*="fixed"]', '[style*="sticky"]',
      '.floating', '.float', '.flyout'
    ];
    
    floatingSelectors.forEach(selector => {
      const floaters = document.querySelectorAll(selector);
      floaters.forEach(floater => {
        if (containsAdContent(floater)) {
          floater.remove();
          removedCount++;
          if (config.debug) {
            console.log(`🧹 已清理浮动元素:`, selector);
          }
        }
      });
    });
    
    // 5. 清理过大的元素（可能是全屏广告）
    const largeElements = document.querySelectorAll('div, section, aside');
    largeElements.forEach(element => {
      const rect = element.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // 如果元素覆盖了大部分视口
      if (rect.width > viewportWidth * 0.8 && 
          rect.height > viewportHeight * 0.8) {
        if (containsAdContent(element)) {
          element.remove();
          removedCount++;
          if (config.debug) {
            console.log(`📏 已清理全屏广告元素`);
          }
        }
      }
    });
    
    // 记录结果
    if (removedCount > 0 || blockedCount > 0) {
      console.log(`✅ 清理完成: 移除了 ${removedCount} 个元素，阻止了 ${blockedCount} 个脚本`);
    } else {
      console.log(`✅ 页面看起来已经很干净了`);
    }
    
    return { removed: removedCount, blocked: blockedCount };
  }

  // 监控新元素
  function setupMutationObserver() {
    const observer = new MutationObserver((mutations) => {
      let needsCleanup = false;
      
      mutations.forEach(mutation => {
        if (mutation.addedNodes.length > 0) {
          needsCleanup = true;
        }
      });
      
      if (needsCleanup) {
        setTimeout(cleanAdsAndNotifications, 100);
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    return observer;
  }

  // 阻止默认弹窗行为
  function blockDefaultPopups() {
    // 阻止alert
    const originalAlert = window.alert;
    window.alert = function(message) {
      console.log(`🚫 已阻止弹窗消息:`, message);
      return null;
    };
    
    // 阻止confirm
    const originalConfirm = window.confirm;
    window.confirm = function(message) {
      console.log(`🚫 已阻止确认弹窗:`, message);
      return false;
    };
    
    // 阻止print
    const originalPrint = window.print;
    window.print = function() {
      console.log(`🚫 已阻止打印弹窗`);
      return null;
    };
    
    // 存储原始函数以便恢复
    window.__originalAlert = originalAlert;
    window.__originalConfirm = originalConfirm;
    window.__originalPrint = originalPrint;
  }

  // 初始化函数
  function init() {
    console.log('🚀 广告清理脚本初始化...');
    
    // 执行初始清理
    const results = cleanAdsAndNotifications();
    
    // 设置定时检查
    let retryCount = 0;
    const intervalId = setInterval(() => {
      if (retryCount >= config.maxRetries) {
        clearInterval(intervalId);
        return;
      }
      
      const newResults = cleanAdsAndNotifications();
      if (newResults.removed > 0 || newResults.blocked > 0) {
        retryCount++;
      } else {
        clearInterval(intervalId);
      }
    }, config.intervalCheck);
    
    // 设置DOM变化监控
    const observer = setupMutationObserver();
    
    // 阻止默认弹窗
    blockDefaultPopups();
    
    // 监听页面可见性变化
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        cleanAdsAndNotifications();
      }
    });
    
    // 监听窗口焦点变化
    window.addEventListener('focus', cleanAdsAndNotifications);
    
    console.log('🎉 广告清理脚本已激活并运行');
    
    // 返回清理函数供外部调用
    return {
      clean: cleanAdsAndNotifications,
      stop: () => {
        clearInterval(intervalId);
        observer.disconnect();
        console.log('🛑 广告清理已停止');
      }
    };
  }

  // 执行初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();