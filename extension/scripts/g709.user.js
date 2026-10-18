/*
 * 名称：吉大就业岗位智筛面板
 * 描述：自动汇总吉林大学就业网最近90天的招聘信息，通过智能标签、关键词搜索和多维筛选快速定位岗位，并支持收藏管理、分页浏览与 Excel 导出
 */
(function () {
  'use strict';

  var SCRIPT_VERSION = '13';
  if (window.jluJobPanelReady && window.jluJobPanelVersion === SCRIPT_VERSION) {
    var existingPanel = document.getElementById('jlu-job-panel');
    if (existingPanel) existingPanel.style.display = 'flex';
    return function () {
      return Promise.resolve({ ok: true, message: 'Already running' });
    };
  }
  ['jlu-job-ball', 'jlu-job-panel', 'jlu-status-bar', 'jlu-job-panel-style'].forEach(function (id) {
    var staleElement = document.getElementById(id);
    if (staleElement) staleElement.remove();
  });
  window.jluJobPanelReady = true;
  window.jluJobPanelVersion = SCRIPT_VERSION;

  var CACHE_KEY = 'jlu_job_cache_v7';
  var CACHE_TIME_KEY = 'jlu_job_cache_time_v7';
  var FAVORITES_KEY = 'jlu_job_favorites_v1';
  var CACHE_TTL = 30 * 60 * 1000;
  var MAX_PAGES = 600;
  var DELAY_MS = 200;
  var PAGE_SIZE = 24;
  var HOST = 'https://jdjyw.jlu.edu.cn';
  var CUTOFF_90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  var SOURCES = [
    { id: 'campus', name: '校园招聘', urlFn: function (p) { return HOST + '/portal/jyzp/recruit/list?type=1&pageNo=' + p; }, linkSel: 'a[href*="/recruit/details"]', isJob: false },
    { id: 'news', name: '招聘快讯', urlFn: function (p) { return HOST + '/portal/jyzp/recruit/list?type=2&pageNo=' + p; }, linkSel: 'a[href*="/recruit/details"]', isJob: false },
    { id: 'internship', name: '实习实践', urlFn: function (p) { return HOST + '/portal/jyzp/recruit/list?type=3&pageNo=' + p; }, linkSel: 'a[href*="/recruit/details"]', isJob: false },
    { id: 'air', name: '空中宣讲', urlFn: function (p) { return HOST + '/portal/jyzp/recruit/list?type=5&pageNo=' + p; }, linkSel: 'a[href*="/recruit/details"]', isJob: false },
    { id: 'jobfair', name: '双选会', urlFn: function (p) { return HOST + '/portal/jyzp/jobFair/list?pageNo=' + p; }, linkSel: 'a[href*="/jobFair/details"]', isJob: false },
    { id: 'notice', name: '通知公告', urlFn: function (p) { return HOST + '/portal/jyzp/article/list?cid=jyzp_tzgg&pageNo=' + p; }, linkSel: 'a[href*="/article/details"]', isJob: false },
    { id: 'job', name: '职位信息', urlFn: function (p) { return HOST + '/portal/jyzp/job/list?pageNo=' + p + '&pageSize=8'; }, linkSel: 'a[href*="/job/details"]', isJob: true }
  ];

  var CITY_NAMES = [
    '北京', '上海', '天津', '重庆', '香港', '澳门',
    '长春', '吉林', '延吉', '哈尔滨', '齐齐哈尔', '大庆', '牡丹江',
    '沈阳', '大连', '鞍山', '丹东', '锦州', '营口',
    '石家庄', '唐山', '保定', '秦皇岛', '廊坊', '沧州', '邯郸', '邢台',
    '太原', '呼和浩特', '包头', '鄂尔多斯',
    '济南', '青岛', '烟台', '潍坊', '淄博', '威海', '临沂', '济宁', '泰安', '东营',
    '南京', '苏州', '无锡', '常州', '南通', '徐州', '扬州', '镇江', '盐城', '泰州', '淮安', '连云港',
    '杭州', '宁波', '温州', '绍兴', '嘉兴', '金华', '台州', '湖州', '衢州', '舟山',
    '合肥', '芜湖', '安庆', '蚌埠', '马鞍山', '阜阳', '滁州',
    '福州', '厦门', '泉州', '漳州', '莆田', '南昌', '赣州', '九江', '上饶',
    '郑州', '洛阳', '开封', '新乡', '许昌', '南阳',
    '武汉', '宜昌', '襄阳', '荆州', '长沙', '株洲', '岳阳', '衡阳',
    '广州', '深圳', '珠海', '佛山', '东莞', '惠州', '中山', '江门', '湛江', '汕头',
    '南宁', '柳州', '桂林', '海口', '三亚',
    '成都', '绵阳', '德阳', '乐山', '宜宾', '贵阳', '遵义', '昆明', '曲靖', '拉萨',
    '西安', '咸阳', '兰州', '天水', '西宁', '银川', '乌鲁木齐'
  ];

  var COLORS = {
    source: '#2563eb', audience: '#16a34a', role: '#ca8a04', industry: '#db2777',
    recruit: '#7c3aed', company: '#ea580c', base: '#9333ea', muted: '#64748b'
  };

  function parseDate(value) {
    if (!value) return null;
    var text = String(value).trim();
    var full = text.match(/(20\d{2})[\-\/.年](\d{1,2})[\-\/.月](\d{1,2})日?/);
    if (full) return new Date(Number(full[1]), Number(full[2]) - 1, Number(full[3]));
    var english = text.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),\s*(20\d{2})\b/i);
    if (english) {
      var monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      return new Date(Number(english[3]), monthNames.indexOf(english[1].toLowerCase()), Number(english[2]));
    }
    var shortDate = text.match(/(\d{1,2})月(\d{1,2})日/);
    if (shortDate) {
      var now = new Date();
      var result = new Date(now.getFullYear(), Number(shortDate[1]) - 1, Number(shortDate[2]));
      if (result.getTime() > now.getTime() + 45 * 24 * 60 * 60 * 1000) result.setFullYear(result.getFullYear() - 1);
      return result;
    }
    return null;
  }

  function formatDate(date) {
    if (!date || isNaN(date.getTime())) return '';
    return date.getFullYear() + '/' + pad(date.getMonth() + 1) + '/' + pad(date.getDate());
  }

  function pad(value) {
    return value < 10 ? '0' + value : String(value);
  }

  function unique(values) {
    var result = [];
    values.forEach(function (value) {
      if (value && result.indexOf(value) < 0) result.push(value);
    });
    return result;
  }

  function matchesPattern(text, pattern) {
    return pattern instanceof RegExp ? pattern.test(text) : text.indexOf(String(pattern).toLowerCase()) >= 0;
  }

  function matchesPatterns(text, patterns) {
    for (var i = 0; i < patterns.length; i++) {
      if (matchesPattern(text, patterns[i])) return true;
    }
    return false;
  }

  function isPublishingAgent(company) {
    return /吉林大学就业中心|前锦网络信息技术|北京月生信息技术|中研博硕信息科技|南方国际人力资源顾问|北京网聘信息技术|同道精英|万宝盛华|上海外服|智联招聘|猎聘|北京海天创高网络技术|北京神州硕博信息技术|北京神州之窗网络技术服务|北京市新兴雅文翻译中心|北京伟馨文化发展|千才汇信息技术|广州高才信息科技|高博人才科技|北京高博中进信息技术|北京博创智研科技|北京诺美斯信息技术|北京君林浩海科技咨询|寰球科技服务|博汇人力资源服务/.test(company || '');
  }

  function cleanCompanyCandidate(value) {
    var candidate = value
      .replace(/^(?:(?:关于开展|关于|开展|启动|报名|发布|聚焦|直击|大国重器|上市公司|诚邀|招聘|组团)[\s|·:：—-]*)+/, '')
      .replace(/^(?:20\d{2})(?:年|届)?[\s|·:：—-]*/, '')
      .replace(/^(?:首年保薪|保薪|年薪)?\d+(?:\.\d+)?(?:\s*[-~～至]\s*\d+(?:\.\d+)?)?[wW万]\s*/, '')
      .replace(/^\s+|\s+$/g, '');
    var bracketStart = Math.max(candidate.lastIndexOf('（'), candidate.lastIndexOf('('));
    if (bracketStart >= 0) {
      var bracketOrganization = candidate.slice(bracketStart + 1).replace(/[）)]$/, '').trim();
      if (/[\u4e00-\u9fa5A-Za-z0-9·&]{2,40}(?:大学|学院|中学|学校|医院|研究院|研究所|集团|公司)$/.test(bracketOrganization)) {
        candidate = bracketOrganization;
      }
    }
    if (/^(?:公司|集团|大学|学院|学校|医院|研究院|研究所|银行|证券|中心)$/.test(candidate)) return '';
    return candidate;
  }

  function extractCompany(title, suppliedCompany) {
    var normalized = String(title || '').replace(/[【】\[\]]/g, ' ').replace(/&[^;]+;/g, ' ');
    var suffix = '(?:集团(?:股份)?有限公司|股份有限公司|有限责任公司|集团有限公司|有限公司|银行[^\\s，。；、：:]{0,16}分行|研究院|研究所|设计院|地质院|科学院(?![\\u4e00-\\u9fa5]{1,24}(?:研究所|研究院|大学|学院))|实验室|大学|学院|中学|学校|医院|银行(?!股份有限公司|有限责任公司|有限公司)|证券|事务所|交易所|组织部|部队|委员会|管理局|基地|集团|公司|局(?!集团|有限|公司)|厂)';
    var pattern = new RegExp('[\\u4e00-\\u9fa5A-Za-z0-9·&（）()]{2,48}?' + suffix, 'g');
    var hospitalPattern = new RegExp('[\\u4e00-\\u9fa5A-Za-z0-9·&（）()]{2,48}?(?:大学|学院)附属[\\u4e00-\\u9fa5A-Za-z0-9·&（）()]{0,20}?(?:医院|中学|学校)', 'g');
    var legalCompanyPattern = new RegExp('[\\u4e00-\\u9fa5A-Za-z0-9·&（）()]{2,64}?(?:集团(?:股份)?有限公司|股份有限公司|有限责任公司|集团有限公司|有限公司)', 'g');
    var matches = (normalized.match(hospitalPattern) || [])
      .concat(normalized.match(legalCompanyPattern) || [])
      .concat(normalized.match(pattern) || []);
    for (var i = 0; i < matches.length; i++) {
      var candidate = cleanCompanyCandidate(matches[i]);
      if (/科学院$/.test(candidate)) {
        var matchStart = normalized.indexOf(matches[i]);
        var remainder = normalized.slice(matchStart + matches[i].length);
        var academyExtension = remainder.match(/^([\u4e00-\u9fa5]{1,24}(?:研究所|研究院|大学|学院))/);
        if (academyExtension) candidate += academyExtension[1];
      }
      if (/(?:大学|学院)$/.test(candidate) && /校园招聘邀请函|校园招聘活动|招聘会|双选会|供需对接|校友企业|企业专属招聘/.test(normalized) && !/引才兴校/.test(normalized)) continue;
      if (candidate) return candidate;
    }
    var supplied = String(suppliedCompany || '').trim();
    return supplied && !isPublishingAgent(supplied) ? supplied : '';
  }

  function companyMetadataIsReliable(company, rawCompany, sourceId) {
    var raw = String(rawCompany || '').trim();
    if (!raw || isPublishingAgent(raw)) return false;
    if (sourceId === 'job') return true;
    var companyId = String(company || '').toLowerCase().replace(/股份有限公司|有限责任公司|集团有限公司|有限公司|集团|公司|[\s（）()·&]/g, '');
    var rawCompanyId = raw.toLowerCase().replace(/股份有限公司|有限责任公司|集团有限公司|有限公司|集团|公司|[\s（）()·&]/g, '');
    if (!companyId || !rawCompanyId) return false;
    if (companyId === rawCompanyId) return true;
    var shorter = companyId.length <= rawCompanyId.length ? companyId : rawCompanyId;
    var longer = companyId.length > rawCompanyId.length ? companyId : rawCompanyId;
    return shorter.length >= 4 && longer.indexOf(shorter) >= 0;
  }

  function extractSalary(text) {
    var patterns = [
      /(?:年薪|年收入|首年保薪|保薪)[：:\s]*\d+(?:\.\d+)?\s*(?:-|~|～|至)\s*\d+(?:\.\d+)?\s*(?:[wW]|万元?)/,
      /\b\d+(?:\.\d+)?\s*[kK]\s*(?:-|~|～|至)\s*\d+(?:\.\d+)?\s*[kK](?:\s*[\/／]\s*月)?(?:\s*[·x×*]\s*\d{1,2}薪)?/,
      /(?:月薪|薪资)[：:\s]*\d+(?:\.\d+)?\s*(?:-|~|～|至)\s*\d+(?:\.\d+)?\s*(?:元|万元?)(?:\s*[\/／]\s*月)?/,
      /(?:年薪|年收入)[：:\s]*\d+(?:\.\d+)?\s*(?:-|~|～|至)\s*\d+(?:\.\d+)?\s*万元?(?:\s*[\/／]\s*年)?/,
      /(?:年薪|年收入)[：:\s]*\d+(?:\.\d+)?\s*万元?\+?/,
      /\d+(?:\.\d+)?\s*(?:-|~|～|至)\s*\d+(?:\.\d+)?\s*万元?\s*[\/／]\s*年/,
      /\b\d+(?:\.\d+)?\s*[kK]\s*(?:以上|起)(?:\s*[\/／]\s*月)?/,
      /\b\d+(?:\.\d+)?\s*[kK](?:\s*[\/／]\s*月)/
    ];
    for (var i = 0; i < patterns.length; i++) {
      var match = text.match(patterns[i]);
      if (match) return match[0].replace(/\s+/g, '');
    }
    return '';
  }

  function classifyRole(title, company, positionCategory) {
    var text = String(title || '').toLowerCase();
    var companyText = String(company || '').toLowerCase();
    var categoryText = String(positionCategory || '').toLowerCase();
    if (companyText && text.indexOf(companyText) >= 0) text = text.replace(companyText, ' ');

    if (matchesPatterns(text, ['公务员', '选调', '军队', '部队', '入伍', '征兵', '警察', '消防', '文职人员'])) return '公职/部队';
    if (matchesPatterns(text, ['医生', '医师', '护士', '护理', '临床', '药师', '兽医', '口腔医师', '疾控'])) return '医疗卫生';
    if (matchesPatterns(text, ['销售', '营销', '客户经理', '渠道经理', '商务拓展', '业务拓展', '课程顾问', '市场渠道', '市场类', '贸易类', /\bbd\b/i])) return '市场销售';
    if (matchesPatterns(text, ['产品经理', '产品运营'])) return '产品运营';
    if (matchesPatterns(text, ['教师', '老师', '教学', '辅导员', '讲师', '教授', '校长'])) return '教育教学';
    if (matchesPatterns(text, ['研发', '研究员', '科研', '算法', '开发', '工程师', '程序员', '测试工程师', '数据科学', '机器学习', '人工智能', '前端', '后端', '架构师', '运维'])) return '技术研发';
    if (matchesPatterns(text, ['行政', '人力', '法务', '法律类', '采购', '党务', '纪检', '合规', '职能管理', '生产管理', '项目管理', '质量管理', '管培', '管理培训', '综合管理', '总经理助理', /\bhrbp\b/i, /\bhr\b/i])) return '职能管理';
    if (matchesPatterns(text, ['金融', '证券', '基金', '保险', '投行', '投资', '财务', '经济', '会计', '审计', '精算', '交易员', '出纳', '风险管理', '资产管理', '信贷', '授信', '财会类'])) return '金融经济';
    if (matchesPatterns(text, ['运营', '内容', '用户增长', '新媒体', '活动策划', '编辑', '文案', '编导', '导演', /\bproduct\b/i])) return '产品运营';
    if (matchesPatterns(text, ['教研', '教务'])) return '教育教学';
    if (matchesPatterns(text, ['医院', '医疗', '卫生', '医药类'])) return '医疗卫生';

    var categoryRoles = [
      ['医疗卫生/美容保健类', '医疗卫生'], ['销售类', '市场销售'], ['市场/公关/媒介类', '市场销售'],
      ['计算机/网络/技术类', '技术研发'], ['计算机类', '技术研发'], ['电子/电器/通信技术类', '技术研发'],
      ['电子类', '技术研发'], ['机械/仪器仪表类', '技术研发'], ['机械类', '技术研发'],
      ['电气/能源/动力类', '技术研发'], ['生物/制药/化工/环保类', '技术研发'], ['科研类', '技术研发'],
      ['金融保险类', '金融经济'], ['财务/审计/统计类', '金融经济'],
      ['行政/后勤类', '职能管理'], ['人力资源类', '职能管理'], ['法律类', '职能管理'],
      ['经营管理类', '职能管理'], ['咨询/顾问类', '职能管理'], ['教育/培训类', '教育教学']
    ];
    for (var i = 0; i < categoryRoles.length; i++) {
      if (categoryText.indexOf(categoryRoles[i][0]) >= 0) return categoryRoles[i][1];
    }

    var higherEducationEvent = /校园招聘邀请函|招聘会|双选会|供需对接|校友企业|企业专属招聘|职业规划|签约洽谈会|招生|入伍|征兵/.test(text);
    if (/(?:大学|学院|中学|学校)$/.test(companyText) && !/(?:科学院|研究院|研究所|医院)/.test(companyText) &&
        /招聘|人才引进|高层次人才|博士后/.test(text) && (!higherEducationEvent || /引才兴校/.test(text))) return '教育教学';
    if (/(?:科学院|研究所|研究院)/.test(companyText) && /博士后|科研|研究岗位/.test(text)) return '技术研发';
    if (/医院|卫生院|妇幼保健院|疾控中心/.test(companyText) && /招聘|人才引进|博士后|岗位|工作人员/.test(text)) return '医疗卫生';
    if (/银行|证券|基金|保险|交易所|期货/.test(companyText) && /开放日|open\s*day|招聘|宣讲|实习/.test(text)) return '金融经济';
    if (/事业编/.test(text)) return '公职/部队';
    return '综合岗';
  }

  function generateTags(item) {
    var displayTitleText = String(item.title || '').toLowerCase();
    var rawTitleText = String(item.contextTitle || item.title || '');
    var titleText = rawTitleText.toLowerCase();
    var compactTitleText = titleText.replace(/\s+/g, '');
    var companyText = String(item.company || '').toLowerCase();
    var metadataReliable = item.metadataReliable !== false;
    var compactCompanyText = companyText.replace(/\s+/g, '');
    var audienceTitleText = compactTitleText;
    if (compactCompanyText && audienceTitleText.indexOf(compactCompanyText) >= 0) {
      audienceTitleText = audienceTitleText.replace(compactCompanyText, '');
    }
    audienceTitleText = audienceTitleText.replace(/博士眼镜|博士伦/g, '');
    var educationText = metadataReliable ? String(item.education || '').toLowerCase().replace(/\s+/g, '') : '';
    var audienceText = audienceTitleText + educationText;
    var audience = [];
    var generalOpenDay = /开放日/i.test(audienceText) || /open\s*day/i.test(titleText);
    generalOpenDay = generalOpenDay && !/博士|研究生|硕士/.test(audienceText);
    if (/本科|大学生|在校生|学士|训练营/.test(audienceText) || generalOpenDay) audience.push('本科生');
    if (/研究生|硕士|博士|科研|高层次人才|高校(?:教职|教师|人才)/.test(audienceText)) audience.push('研究生');
    if (/博士|高层次人才|研究员|教授/.test(audienceText) || (/预公告/.test(audienceText) && /人才|教职|高校/.test(audienceText))) audience.push('博士生');
    if (/毕业生|离校未就业|应届|(?:20)?\d{2}届|校园(?:[\/／、]?实习)?招聘|校招|秋招|春招|提前批|人才引进|入伍/.test(audienceText)) audience.push('毕业生');

    var industries = [];
    var natureText = metadataReliable ? String(item.companyNature || '').toLowerCase() : '';
    var structuredIndustry = metadataReliable ? String(item.companyIndustry || '').toLowerCase() : '';
    var organizationText = titleText + ' ' + companyText;
    var higherEducationOrganization = companyText
      ? (/(?:大学|学院)$/.test(companyText) || /(?:中国|省|市)?[\u4e00-\u9fa5]{0,8}科学院/.test(companyText)) && !/医院/.test(organizationText)
      : /大学|学院|高校|(?:中国|省|市)?[\u4e00-\u9fa5]{0,8}科学院/.test(titleText) && !/医院/.test(titleText);
    if (/央企|国企|国有/.test(natureText + ' ' + organizationText) || /国家电网|南方电网|中国(?:铁路|移动|联通|电信|邮政|石油|石化|建筑|银行|航天|航空|船舶|出口信用保险|电建|能建|海油|中车|通号|储备粮)|中国航发|中信|中核|中建|中交|中铁|中航|中电|中冶|中粮|中化|华润|招商局|保利|兵器|烟草|国网|一汽|东风汽车|上汽集团|海信|新华三|南网|山东高速|中国通服|中石油|国家管网/.test(organizationText)) industries.push('央国企');
    var isInternetIndustry = false;
    if (!higherEducationOrganization) {
      isInternetIndustry = structuredIndustry
        ? /信息传输、软件和信息技术服务业|互联网/.test(structuredIndustry)
        : (/互联网|网络信息|软件(?:技术)?|信息技术|云计算/.test(companyText) || /腾讯|阿里|字节跳动|小红书|美团|京东(?!方)|百度|网易|快手|滴滴|拼多多|哔哩哔哩|携程|商汤科技/.test(organizationText));
    }
    if (isInternetIndustry) industries.push('互联网');
    var higherEducationEvent = /校园招聘邀请函|招聘会|双选会|供需对接|校友企业|企业专属招聘|职业规划|签约洽谈会|招生|入伍|征兵/.test(titleText);
    var higherEducationHiring = /招聘|人才引进|高层次人才|博士后|教授|讲师|辅导员|教师/.test(titleText) &&
      !/研究生招生|本科招生|招生宣讲/.test(titleText) && (!higherEducationEvent || /引才兴校/.test(titleText));
    if (higherEducationOrganization && higherEducationHiring) industries.push('高校教职');

    var bases = [];
    var baseText = metadataReliable ? String(item.location || '').toLowerCase() : '';
    if (!baseText) {
      baseText = titleText.replace(/吉林大学(?:专场)?(?:宣讲会|宣介会|推介会)?/g, ' ');
    }
    CITY_NAMES.forEach(function (city) {
      if (city === '吉林') {
        if (/吉林市/.test(baseText)) bases.push(city);
      } else if (baseText.indexOf(city.toLowerCase()) >= 0) {
        bases.push(city);
      }
    });
    if (bases.length === 0 && /全国|多地|各地/.test(baseText)) bases.push('全国');

    var recruitTypes = [];
    var recruitText = compactTitleText + (metadataReliable ? String(item.jobType || '').toLowerCase().replace(/\s+/g, '') : '');
    var explicitSocialRecruitment = /社会招聘|社招/.test(recruitText);
    if (/实习|实习生|暑期项目|寒假项目/.test(recruitText)) recruitTypes.push('实习');
    if (!explicitSocialRecruitment && (/(?:20)?\d{2}届|校招|校园(?:[\/／、]?实习)?招聘|应届|毕业生|秋招|春招|提前批/.test(recruitText) || ['campus', 'air', 'jobfair'].indexOf(item.sourceId) >= 0)) recruitTypes.push('校招');

    return {
      audience: unique(audience),
      role: classifyRole(displayTitleText, companyText, metadataReliable ? String(item.positionCategory || '').toLowerCase() : ''),
      industries: unique(industries),
      bases: unique(bases),
      recruitTypes: unique(recruitTypes),
      salary: (metadataReliable ? String(item.salaryText || '').replace(/\s+/g, '') : '') || extractSalary(rawTitleText)
    };
  }

  function parseTotalPages(doc) {
    var bodyText = doc.body ? doc.body.textContent : '';
    var totalMatch = bodyText.match(/共\s*(\d+)\s*页/);
    if (totalMatch) return Math.min(Number(totalMatch[1]), MAX_PAGES);
    var links = doc.querySelectorAll('#s-portal__pagination a, .pagination a');
    var maxPage = 1;
    for (var i = 0; i < links.length; i++) {
      var page = Number(links[i].textContent.trim());
      if (!isNaN(page)) maxPage = Math.max(maxPage, page);
    }
    return Math.min(maxPage, MAX_PAGES);
  }

  function readDetailValue(container, labelNames) {
    if (!container) return '';
    var rows = container.querySelectorAll('.m-list-xyzp_item_bottom li, .m-jyzp-job__box section');
    for (var i = 0; i < rows.length; i++) {
      var children = rows[i].children;
      if (children.length < 2) continue;
      var label = children[0].textContent.replace(/\s+/g, '').trim();
      if (labelNames.indexOf(label) >= 0) {
        return children[children.length - 1].textContent.replace(/\s+/g, ' ').trim();
      }
    }
    return '';
  }

  function parseItems(doc, source) {
    var items = [];
    var seen = {};
    var links = doc.querySelectorAll(source.linkSel);
    for (var i = 0; i < links.length; i++) {
      var link = links[i];
      var href = link.getAttribute('href') || '';
      var url = href.indexOf('http') === 0 ? href : HOST + (href.charAt(0) === '/' ? href : '/' + href);
      if (seen[url]) continue;
      seen[url] = true;
      var title = link.textContent.replace(/\s+/g, ' ').trim();
      if (!title) continue;

      var container = link.closest('li, article, .item, .s-portal-list__item') || link.parentElement;
      var heading = link.closest('h2, h3');
      var contextTitle = heading ? heading.textContent.replace(/\s+/g, ' ').trim() : title;
      var allText = container ? container.textContent.replace(/\s+/g, ' ').trim() : title;
      var dateText = '';
      var scheduledMatch = allText.match(/(?:举办时间|招聘时间)[：:\s]*(20\d{2}-\d{1,2}-\d{1,2})/);
      var createdMatch = allText.match(/创建时间[：:\s]*([A-Za-z]{3,9}\s+\d{1,2},\s*20\d{2})/i);
      if (scheduledMatch) dateText = scheduledMatch[1];
      else if (createdMatch) dateText = createdMatch[1];
      var dateElement = container && container.querySelector('.m-list-line_date');
      if (!parseDate(dateText) && dateElement) {
        var dateParts = dateElement.querySelectorAll('span');
        var day = dateParts.length ? dateParts[0].textContent.trim() : '';
        var yearMonth = dateParts.length > 2 ? dateParts[2].textContent.trim().match(/(\d{2,4})\/(\d{1,2})/) : null;
        if (day && yearMonth) {
          var year = Number(yearMonth[1]);
          if (year < 100) year += 2000;
          dateText = year + '/' + yearMonth[2] + '/' + day;
        }
      }
      if (!parseDate(dateText)) {
        dateElement = container && container.querySelector('.s-portal-list__item-date, time, [class*="date"]');
        if (dateElement) dateText = dateElement.textContent.trim();
      }
      if (!parseDate(dateText)) {
        var dateMatch = allText.match(/20\d{2}[\-\/.年]\d{1,2}[\-\/.月]\d{1,2}日?|\d{1,2}月\d{1,2}日/);
        if (dateMatch) dateText = dateMatch[0];
      }

      var rawCompany = readDetailValue(container, ['公司名称', '单位名称']);
      var companyNature = readDetailValue(container, ['公司性质', '单位性质']);
      var companyIndustry = readDetailValue(container, ['公司行业', '单位行业']);
      var location = readDetailValue(container, ['工作地点']);
      var jobType = readDetailValue(container, ['职位性质']);
      var education = readDetailValue(container, ['学历要求']);
      var positionCategory = readDetailValue(container, ['职位类别']);
      var salaryElement = container && container.querySelector('.m-jyzp-job__pay');
      var salaryText = salaryElement ? salaryElement.textContent.replace(/\s+/g, ' ').trim() : '';
      var company = extractCompany(contextTitle, rawCompany);
      var dateObj = parseDate(dateText);
      var item = {
        title: title, contextTitle: contextTitle, company: company, rawCompany: rawCompany,
        companyNature: companyNature, companyIndustry: companyIndustry,
        metadataReliable: companyMetadataIsReliable(company, rawCompany, source.id), url: url, rawDate: dateText,
        date: formatDate(dateObj), dateTs: dateObj ? dateObj.getTime() : null,
        location: location, jobType: jobType, education: education,
        positionCategory: positionCategory, salaryText: salaryText,
        source: source.name, sourceId: source.id
      };
      item.tags = generateTags(item);
      items.push(item);
    }
    return items;
  }

  function showStatus(message) {
    var element = document.getElementById('jlu-status-bar');
    if (!element) {
      element = document.createElement('div');
      element.id = 'jlu-status-bar';
      element.setAttribute('role', 'status');
      element.setAttribute('aria-live', 'polite');
      element.style.cssText = 'position:fixed;bottom:76px;right:20px;background:#111827;color:#d1fae5;padding:10px 14px;border:1px solid #374151;border-radius:6px;z-index:100001;font:12px sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.35)';
      document.body.appendChild(element);
    }
    element.textContent = message;
  }

  function hideStatus() {
    var element = document.getElementById('jlu-status-bar');
    if (element) element.remove();
  }

  function fetchPage(url) {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.onreadystatechange = function () {
        if (xhr.readyState !== 4) return;
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(new DOMParser().parseFromString(xhr.responseText, 'text/html'));
        } else {
          reject(new Error('请求失败 (' + xhr.status + '): ' + url));
        }
      };
      xhr.onerror = function () { reject(new Error('网络请求失败: ' + url)); };
      xhr.send();
    });
  }

  function crawlSource(source) {
    return new Promise(function (resolve) {
      var collected = [];
      function next(pageNo) {
        showStatus('正在抓取 ' + source.name + '，第 ' + pageNo + ' 页');
        fetchPage(source.urlFn(pageNo)).then(function (doc) {
          var pageItems = parseItems(doc, source);
          if (!pageItems.length) return resolve(collected);
          var validDates = pageItems.filter(function (item) { return item.dateTs !== null; });
          collected = collected.concat(pageItems.filter(function (item) {
            return item.dateTs === null || item.dateTs >= CUTOFF_90.getTime();
          }));
          var canContinue = pageNo < parseTotalPages(doc) && pageNo < MAX_PAGES;
          var hasRecentDate = validDates.some(function (item) { return item.dateTs >= CUTOFF_90.getTime(); });
          var hasUnknownDate = validDates.length < pageItems.length;
          // A stale pinned item can appear beside current entries, so stop only when the whole page is old.
          if (validDates.length && !hasRecentDate && !hasUnknownDate) canContinue = false;
          if (!canContinue) return resolve(collected);
          setTimeout(function () { next(pageNo + 1); }, DELAY_MS);
        }).catch(function (error) {
          console.error(error);
          resolve(collected);
        });
      }
      next(1);
    });
  }

  function crawlAllSources() {
    var all = [];
    var chain = Promise.resolve();
    SOURCES.forEach(function (source) {
      chain = chain.then(function () {
        return crawlSource(source).then(function (items) { all = all.concat(items); });
      }).then(function () {
        return new Promise(function (resolve) { setTimeout(resolve, DELAY_MS); });
      });
    });
    return chain.then(function () {
      var seen = {};
      return all.filter(function (item) {
        if (seen[item.url]) return false;
        seen[item.url] = true;
        return true;
      }).sort(function (a, b) { return (b.dateTs || 0) - (a.dateTs || 0); });
    });
  }

  function makeButton(text, title) {
    var button = document.createElement('button');
    button.type = 'button';
    button.textContent = text;
    if (title) button.title = title;
    button.style.cssText = 'border:1px solid #475569;background:#1e293b;color:#e2e8f0;border-radius:4px;padding:5px 9px;cursor:pointer;font-size:12px;white-space:nowrap';
    return button;
  }

  function makeTag(text, color) {
    var span = document.createElement('span');
    span.textContent = text;
    span.style.cssText = 'display:inline-block;box-sizing:border-box;max-width:100%;margin:2px 4px 2px 0;padding:2px 6px;border-radius:3px;background:' + color + ';color:white;font-size:11px;line-height:17px;white-space:normal;overflow-wrap:anywhere;vertical-align:top';
    return span;
  }

  function favoriteKey(item) {
    return String(item && item.url || '').trim();
  }

  function copyTagValues(value) {
    if (Array.isArray(value)) return value.slice();
    return value ? [String(value)] : [];
  }

  function normalizeFavorites(value) {
    var result = {};
    if (!value || typeof value !== 'object') return result;
    if (Array.isArray(value)) {
      value.forEach(function (item) {
        var key = favoriteKey(item);
        if (key) result[key] = snapshotFavorite(item, item);
      });
      return result;
    }
    Object.keys(value).forEach(function (key) {
      var item = value[key];
      var normalizedKey = favoriteKey(item);
      if (normalizedKey && item && typeof item === 'object') result[normalizedKey] = snapshotFavorite(item, item);
    });
    return result;
  }

  function loadFavorites() {
    try {
      return normalizeFavorites(JSON.parse(localStorage.getItem(FAVORITES_KEY) || '{}'));
    } catch (error) {
      console.warn('读取岗位收藏失败', error);
      return {};
    }
  }

  function saveFavorites(favorites) {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
      return true;
    } catch (error) {
      console.warn('保存岗位收藏失败', error);
      return false;
    }
  }

  function snapshotFavorite(item, previous) {
    item = item || {};
    var tags = item.tags || {};
    return {
      title: item.title || '',
      company: item.company || '',
      url: item.url || '',
      date: item.date || '',
      dateTs: item.dateTs || null,
      location: item.location || '',
      source: item.source || '',
      sourceId: item.sourceId || '',
      tags: {
        audience: copyTagValues(tags.audience),
        role: tags.role || '综合岗',
        industries: copyTagValues(tags.industries),
        bases: copyTagValues(tags.bases),
        recruitTypes: copyTagValues(tags.recruitTypes),
        salary: tags.salary || ''
      },
      favoritedAt: previous && previous.favoritedAt || Date.now()
    };
  }

  function favoriteItems(favorites) {
    return Object.keys(favorites).map(function (key) { return favorites[key]; }).filter(function (item) {
      return item && favoriteKey(item);
    }).sort(function (a, b) {
      return Number(b.favoritedAt || 0) - Number(a.favoritedAt || 0);
    });
  }

  function addFavoriteItems(favorites, items) {
    var added = 0;
    items.forEach(function (item) {
      var key = favoriteKey(item);
      if (!key) return;
      if (!favorites[key]) added++;
      favorites[key] = snapshotFavorite(item, favorites[key]);
    });
    return added;
  }

  function clearFavoriteItems(favorites) {
    var keys = Object.keys(favorites || {});
    keys.forEach(function (key) { delete favorites[key]; });
    return keys.length;
  }

  function filterPanelItems(items, favorites, state) {
    state = state || {};
    var filters = state.filters || {};
    var sourceItems = state.onlyFavorites ? favoriteItems(favorites || {}) : (Array.isArray(items) ? items : []);
    var query = String(state.query || '').trim().toLowerCase();
    return sourceItems.filter(function (item) {
      if (!item) return false;
      var tags = item.tags || {};
      var audience = tags.audience || [];
      var industries = tags.industries || [];
      var recruitTypes = tags.recruitTypes || [];
      var bases = tags.bases || [];
      var searchable = String(item.title || '') + ' ' + String(item.company || '');
      if (query && searchable.toLowerCase().indexOf(query) < 0) return false;
      if (filters.audience && audience.indexOf(filters.audience) < 0) return false;
      if (filters.role && tags.role !== filters.role) return false;
      if (filters.industry && industries.indexOf(filters.industry) < 0) return false;
      if (filters.recruit && recruitTypes.indexOf(filters.recruit) < 0) return false;
      if (filters.source && item.source !== filters.source) return false;
      if (filters.base && bases.indexOf(filters.base) < 0) return false;
      return true;
    });
  }

  function injectPanelStyles() {
    var oldStyle = document.getElementById('jlu-job-panel-style');
    if (oldStyle) oldStyle.remove();
    var style = document.createElement('style');
    style.id = 'jlu-job-panel-style';
    style.textContent =
      '#jlu-job-panel .jlu-favorite-button{' +
        'width:30px;height:30px;min-width:30px;display:grid;place-items:center;' +
        'border:1px solid #64748b;border-radius:50%;padding:0;background:#111827;' +
        'color:#cbd5e1;cursor:pointer;font:20px/1 sans-serif;' +
        'transition:background-color .15s,border-color .15s,color .15s,box-shadow .15s,transform .1s' +
      '}' +
      '#jlu-job-panel .jlu-favorite-button:hover{' +
        'border-color:#f59e0b;background:#292214;color:#fde68a' +
      '}' +
      '#jlu-job-panel .jlu-favorite-button:active{transform:scale(.92)}' +
      '#jlu-job-panel .jlu-favorite-button:focus-visible,' +
      '#jlu-job-panel .jlu-favorites-filter:focus-visible{' +
        'outline:2px solid #38bdf8;outline-offset:2px' +
      '}' +
      '#jlu-job-panel .jlu-favorite-button[aria-pressed="true"]{' +
        'border-color:#f59e0b;background:#78350f;color:#fbbf24;' +
        'box-shadow:inset 0 0 0 1px rgba(251,191,36,.22),0 0 0 1px rgba(245,158,11,.12)' +
      '}' +
      '#jlu-job-panel .jlu-favorite-button[aria-pressed="true"]:hover{' +
        'background:#92400e;color:#fef3c7' +
      '}' +
      '#jlu-job-panel .jlu-favorites-filter{' +
        'border:1px solid #475569;background:#1e293b;color:#e2e8f0;border-radius:4px;' +
        'padding:5px 9px;cursor:pointer;font-size:12px;white-space:nowrap;' +
        'transition:background-color .15s,border-color .15s,color .15s,box-shadow .15s' +
      '}' +
      '#jlu-job-panel .jlu-favorites-filter:hover{' +
        'border-color:#f59e0b;background:#292214;color:#fde68a' +
      '}' +
      '#jlu-job-panel .jlu-favorites-filter[aria-pressed="true"]{' +
        'border-color:#f59e0b;background:#78350f;color:#fbbf24;' +
        'box-shadow:inset 0 0 0 1px rgba(251,191,36,.2)' +
      '}' +
      '#jlu-job-panel .jlu-clear-favorites{' +
        'border:1px solid #7f1d1d;background:#2b1820;color:#fca5a5;border-radius:4px;' +
        'padding:5px 9px;cursor:pointer;font-size:12px;white-space:nowrap;' +
        'transition:background-color .15s,border-color .15s,color .15s' +
      '}' +
      '#jlu-job-panel .jlu-clear-favorites:hover:not(:disabled){' +
        'border-color:#ef4444;background:#450a0a;color:#fecaca' +
      '}' +
      '#jlu-job-panel .jlu-clear-favorites:focus-visible{' +
        'outline:2px solid #38bdf8;outline-offset:2px' +
      '}' +
      '#jlu-job-panel .jlu-clear-favorites:disabled{' +
        'opacity:.45;cursor:not-allowed' +
      '}';
    (document.head || document.documentElement).appendChild(style);
  }

  function showTemporaryStatus(message) {
    showStatus(message);
    setTimeout(function () {
      var element = document.getElementById('jlu-status-bar');
      if (element && element.textContent === message) element.remove();
    }, 2200);
  }

  function buildPanel(items, fromCache) {
    ['jlu-job-ball', 'jlu-job-panel', 'jlu-job-panel-style'].forEach(function (id) {
      var old = document.getElementById(id);
      if (old) old.remove();
    });
    injectPanelStyles();

    var state = {
      page: 0,
      query: '',
      onlyFavorites: false,
      filters: { audience: '', role: '', industry: '', recruit: '', source: '', base: '' }
    };
    var favorites = loadFavorites();
    var favoritesBeforeRefresh = {};
    Object.keys(favorites).forEach(function (key) { favoritesBeforeRefresh[key] = favorites[key]; });
    var refreshedFavorite = false;
    items.forEach(function (item) {
      var key = favoriteKey(item);
      if (key && favorites[key]) {
        favorites[key] = snapshotFavorite(item, favorites[key]);
        refreshedFavorite = true;
      }
    });
    if (refreshedFavorite && !saveFavorites(favorites)) {
      favorites = favoritesBeforeRefresh;
      showTemporaryStatus('收藏信息更新失败，已保留原收藏数据');
    }

    var ball = document.createElement('button');
    ball.id = 'jlu-job-ball';
    ball.type = 'button';
    ball.title = '展开/收起招聘面板';
    ball.textContent = '招聘';
    ball.style.cssText = 'position:fixed;bottom:78px;right:20px;width:52px;height:52px;border:0;border-radius:50%;background:#2563eb;color:white;cursor:pointer;z-index:100000;box-shadow:0 5px 18px rgba(0,0,0,.4);font:bold 12px sans-serif';
    document.body.appendChild(ball);

    var panel = document.createElement('section');
    panel.id = 'jlu-job-panel';
    panel.style.cssText = 'position:fixed;top:16px;right:20px;width:min(900px,calc(100vw - 24px));height:calc(100vh - 32px);background:#0f172a;color:#e2e8f0;border:1px solid #334155;border-radius:8px;box-shadow:0 12px 40px rgba(0,0,0,.55);z-index:99999;display:flex;flex-direction:column;font:13px/1.45 sans-serif;overflow:hidden';

    var header = document.createElement('header');
    header.style.cssText = 'height:46px;box-sizing:border-box;background:#111827;padding:8px 10px 8px 14px;display:flex;align-items:center;border-bottom:1px solid #334155;cursor:move;user-select:none';
    var heading = document.createElement('strong');
    heading.textContent = '吉林大学就业岗位';
    heading.style.cssText = 'flex:1;color:#f8fafc;font-size:15px';
    var exportButton = makeButton('导出筛选', '导出当前筛选结果');
    var minimizeButton = makeButton('−', '最小化');
    var closeButton = makeButton('×', '关闭');
    minimizeButton.style.marginLeft = '6px';
    closeButton.style.marginLeft = '6px';
    header.appendChild(heading);
    header.appendChild(exportButton);
    header.appendChild(minimizeButton);
    header.appendChild(closeButton);
    panel.appendChild(header);

    var toolbar = document.createElement('div');
    toolbar.style.cssText = 'padding:10px 14px;border-bottom:1px solid #334155;background:#172033;max-height:46vh;overflow-y:auto;flex:0 1 auto';
    var stats = document.createElement('div');
    stats.style.cssText = 'margin-bottom:8px;color:#cbd5e1';
    var search = document.createElement('input');
    search.type = 'search';
    search.placeholder = '搜索公司名称或岗位关键词';
    search.setAttribute('aria-label', '搜索公司名称或岗位关键词');
    search.style.cssText = 'box-sizing:border-box;width:100%;height:34px;border:1px solid #475569;border-radius:4px;background:#0f172a;color:#f8fafc;padding:0 10px;outline:none';
    toolbar.appendChild(stats);
    toolbar.appendChild(search);

    var favoriteActions = document.createElement('div');
    favoriteActions.style.cssText = 'margin-top:7px;display:flex;justify-content:flex-end;gap:6px;flex-wrap:wrap';
    var onlyFavoritesButton = document.createElement('button');
    onlyFavoritesButton.type = 'button';
    onlyFavoritesButton.className = 'jlu-favorites-filter';
    onlyFavoritesButton.textContent = '☆ 我的收藏 (0)';
    onlyFavoritesButton.title = '只看收藏岗位';
    onlyFavoritesButton.setAttribute('aria-pressed', 'false');
    var bulkFavoriteButton = makeButton('★ 一键收藏筛选结果', '收藏当前筛选条件下的全部岗位');
    var clearFavoritesButton = document.createElement('button');
    clearFavoritesButton.type = 'button';
    clearFavoritesButton.className = 'jlu-clear-favorites';
    clearFavoritesButton.textContent = '☆ 取消全部收藏';
    clearFavoritesButton.title = '取消全部已收藏岗位';
    var exportFavoritesButton = makeButton('导出收藏 Excel (0)', '导出全部已收藏岗位');
    favoriteActions.appendChild(onlyFavoritesButton);
    favoriteActions.appendChild(bulkFavoriteButton);
    favoriteActions.appendChild(clearFavoritesButton);
    favoriteActions.appendChild(exportFavoritesButton);
    toolbar.appendChild(favoriteActions);

    var filterArea = document.createElement('div');
    filterArea.style.cssText = 'margin-top:8px;display:grid;gap:5px';
    toolbar.appendChild(filterArea);
    panel.appendChild(toolbar);

    var list = document.createElement('div');
    list.style.cssText = 'padding:4px 14px;overflow:auto;flex:1;min-height:0';
    panel.appendChild(list);

    var footer = document.createElement('footer');
    footer.style.cssText = 'height:46px;box-sizing:border-box;padding:7px 14px;border-top:1px solid #334155;display:flex;justify-content:center;align-items:center;gap:10px;background:#111827';
    var previousButton = makeButton('上一批');
    var pageText = document.createElement('span');
    pageText.style.minWidth = '90px';
    pageText.style.textAlign = 'center';
    var nextButton = makeButton('下一批');
    footer.appendChild(previousButton);
    footer.appendChild(pageText);
    footer.appendChild(nextButton);
    panel.appendChild(footer);
    document.body.appendChild(panel);

    var filterOptionItems = items.concat(favoriteItems(favorites));
    var filterDefinitions = [
      ['audience', '面向人群', ['本科生', '研究生', '博士生', '毕业生']],
      ['role', '岗位类型', ['技术研发', '市场销售', '教育教学', '产品运营', '职能管理', '医疗卫生', '金融经济', '公职/部队', '综合岗']],
      ['industry', '行业', ['央国企', '互联网', '高校教职']],
      ['recruit', '招聘类型', ['实习', '校招']],
      ['source', '来源板块', SOURCES.map(function (source) { return source.name; })],
      ['base', 'Base地', unique([].concat.apply([], filterOptionItems.map(function (item) {
        return item.tags && item.tags.bases || [];
      }))).sort()]
    ];

    filterDefinitions.forEach(function (definition) {
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:flex-start;gap:4px';
      var label = document.createElement('span');
      label.textContent = definition[1];
      label.style.cssText = 'width:66px;flex:0 0 66px;color:#94a3b8;padding-top:4px';
      var choices = document.createElement('div');
      choices.style.cssText = 'display:flex;gap:4px;flex-wrap:wrap';
      ['全部'].concat(definition[2]).forEach(function (value) {
        var button = makeButton(value);
        button.dataset.filterKey = definition[0];
        button.dataset.filterValue = value === '全部' ? '' : value;
        if (value === '全部') button.style.background = '#2563eb';
        button.onclick = function () {
          state.filters[definition[0]] = button.dataset.filterValue;
          state.page = 0;
          var siblings = choices.querySelectorAll('button');
          for (var i = 0; i < siblings.length; i++) siblings[i].style.background = '#1e293b';
          button.style.background = '#2563eb';
          render();
        };
        choices.appendChild(button);
      });
      row.appendChild(label);
      row.appendChild(choices);
      filterArea.appendChild(row);
    });

    function filteredItems() {
      return filterPanelItems(items, favorites, state);
    }

    function isFavorite(item) {
      var key = favoriteKey(item);
      return Boolean(key && favorites[key]);
    }

    function updateFavoriteSummary(filteredCount) {
      var count = favoriteItems(favorites).length;
      stats.textContent = '总条目 ' + (state.onlyFavorites ? count : items.length) + '  ·  筛选后 ' + filteredCount +
        (state.onlyFavorites ? '  ·  收藏视图' : '  ·  已收藏 ' + count + '  ·  最近90天') +
        (fromCache ? '  ·  缓存数据' : '');
      onlyFavoritesButton.textContent = (state.onlyFavorites ? '★' : '☆') + ' 我的收藏 (' + count + ')';
      onlyFavoritesButton.title = state.onlyFavorites ? '退出收藏筛选' : '只看收藏岗位';
      onlyFavoritesButton.setAttribute('aria-pressed', state.onlyFavorites ? 'true' : 'false');
      clearFavoritesButton.textContent = '☆ 取消全部收藏 (' + count + ')';
      exportFavoritesButton.textContent = '导出收藏 Excel (' + count + ')';
      bulkFavoriteButton.disabled = state.onlyFavorites || filteredCount === 0;
      bulkFavoriteButton.title = state.onlyFavorites ? '收藏视图中的岗位均已收藏' : '收藏当前筛选条件下的全部岗位';
      clearFavoritesButton.disabled = count === 0;
      exportFavoritesButton.disabled = count === 0;
      bulkFavoriteButton.style.opacity = bulkFavoriteButton.disabled ? '.45' : '1';
      exportFavoritesButton.style.opacity = exportFavoritesButton.disabled ? '.45' : '1';
      bulkFavoriteButton.style.cursor = bulkFavoriteButton.disabled ? 'not-allowed' : 'pointer';
      exportFavoritesButton.style.cursor = exportFavoritesButton.disabled ? 'not-allowed' : 'pointer';
    }

    function styleFavoriteButton(button, selected) {
      button.className = 'jlu-favorite-button';
      button.textContent = selected ? '★' : '☆';
      button.title = selected ? '取消收藏' : '收藏岗位';
      button.setAttribute('aria-label', button.title);
      button.setAttribute('aria-pressed', selected ? 'true' : 'false');
    }

    function toggleFavorite(item, button) {
      var key = favoriteKey(item);
      if (!key) return;
      var previous = favorites[key];
      if (favorites[key]) {
        delete favorites[key];
      } else {
        favorites[key] = snapshotFavorite(item);
      }
      if (!saveFavorites(favorites)) {
        if (previous) favorites[key] = previous;
        else delete favorites[key];
        showTemporaryStatus('收藏保存失败，请检查浏览器存储权限');
      }
      if (state.onlyFavorites && previous && !favorites[key]) {
        var favoriteButtons = list.querySelectorAll('.jlu-favorite-button');
        var favoriteButtonIndex = 0;
        for (var i = 0; i < favoriteButtons.length; i++) {
          if (favoriteButtons[i] === button) favoriteButtonIndex = i;
        }
        render({ preserveScroll: true, focusFavoriteIndex: favoriteButtonIndex });
      } else {
        styleFavoriteButton(button, Boolean(favorites[key]));
        updateFavoriteSummary(filteredItems().length);
      }
    }

    function syncPendingSearch() {
      clearTimeout(searchTimer);
      var changed = state.query !== search.value.trim();
      state.query = search.value.trim();
      if (changed) state.page = 0;
      return changed;
    }

    function render(options) {
      options = options || {};
      var previousScrollTop = list.scrollTop;
      var filtered = filteredItems();
      var pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
      if (state.page >= pages) state.page = pages - 1;
      updateFavoriteSummary(filtered.length);
      list.innerHTML = '';
      var visible = filtered.slice(state.page * PAGE_SIZE, (state.page + 1) * PAGE_SIZE);
      if (!visible.length) {
        var empty = document.createElement('div');
        empty.textContent = state.onlyFavorites ? '暂无符合当前条件的收藏岗位' : '没有符合当前筛选条件的结果';
        empty.style.cssText = 'padding:36px;text-align:center;color:#94a3b8';
        list.appendChild(empty);
      }
      visible.forEach(function (item) {
        var row = document.createElement('article');
        row.style.cssText = 'padding:9px 0;border-bottom:1px solid #263449';
        var titleLine = document.createElement('div');
        titleLine.style.cssText = 'display:grid;grid-template-columns:minmax(0,1fr) 30px max-content;align-items:start;gap:10px;margin-bottom:4px';
        var title = document.createElement('a');
        title.href = item.url;
        title.target = '_blank';
        title.rel = 'noopener noreferrer';
        title.textContent = item.title;
        title.style.cssText = 'display:block;min-width:0;flex:1;color:#7dd3fc;text-decoration:none;font-weight:600;overflow-wrap:anywhere';
        titleLine.appendChild(title);
        var favoriteButton = document.createElement('button');
        favoriteButton.type = 'button';
        styleFavoriteButton(favoriteButton, isFavorite(item));
        favoriteButton.onclick = function () { toggleFavorite(item, favoriteButton); };
        titleLine.appendChild(favoriteButton);
        if (item.date) {
          var dateTag = makeTag(item.date, COLORS.muted);
          dateTag.style.flex = '0 0 auto';
          dateTag.style.margin = '0';
          titleLine.appendChild(dateTag);
        }
        row.appendChild(titleLine);
        var tagLine = document.createElement('div');
        tagLine.style.cssText = 'display:flex;align-items:flex-start;justify-content:space-between;gap:12px';
        var leftTags = document.createElement('div');
        leftTags.style.cssText = 'min-width:0;flex:1';
        leftTags.appendChild(makeTag(item.source, COLORS.source));
        leftTags.appendChild(makeTag(item.tags.role, COLORS.role));
        item.tags.industries.forEach(function (value) { leftTags.appendChild(makeTag(value, COLORS.industry)); });
        item.tags.recruitTypes.forEach(function (value) { leftTags.appendChild(makeTag(value, COLORS.recruit)); });
        if (item.company) leftTags.appendChild(makeTag(item.company, COLORS.company));
        if (item.tags.salary) leftTags.appendChild(makeTag(item.tags.salary, COLORS.muted));
        var audienceAndBase = document.createElement('div');
        audienceAndBase.style.cssText = 'display:flex;flex:0 1 48%;flex-wrap:wrap;justify-content:flex-end;gap:4px;min-width:0;padding-top:2px';
        item.tags.audience.forEach(function (value) {
          var audienceTag = makeTag(value, COLORS.audience);
          audienceTag.style.margin = '0';
          audienceAndBase.appendChild(audienceTag);
        });
        item.tags.bases.forEach(function (value) {
          var baseTag = makeTag(value, COLORS.base);
          baseTag.style.margin = '0';
          audienceAndBase.appendChild(baseTag);
        });
        tagLine.appendChild(leftTags);
        tagLine.appendChild(audienceAndBase);
        row.appendChild(tagLine);
        list.appendChild(row);
      });
      pageText.textContent = (state.page + 1) + ' / ' + pages;
      previousButton.disabled = state.page === 0;
      nextButton.disabled = state.page >= pages - 1;
      previousButton.style.opacity = previousButton.disabled ? '.45' : '1';
      nextButton.style.opacity = nextButton.disabled ? '.45' : '1';
      list.scrollTop = options.preserveScroll ? previousScrollTop : 0;
      if (typeof options.focusFavoriteIndex === 'number') {
        var remainingFavoriteButtons = list.querySelectorAll('.jlu-favorite-button');
        if (remainingFavoriteButtons.length) {
          remainingFavoriteButtons[Math.min(options.focusFavoriteIndex, remainingFavoriteButtons.length - 1)].focus();
        }
      }
    }

    var searchTimer;
    search.oninput = function () {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () {
        state.query = search.value.trim();
        state.page = 0;
        render();
      }, 250);
    };
    onlyFavoritesButton.onclick = function () {
      syncPendingSearch();
      state.onlyFavorites = !state.onlyFavorites;
      state.page = 0;
      render();
    };
    previousButton.onclick = function () { if (state.page > 0) { state.page--; render(); } };
    nextButton.onclick = function () {
      if ((state.page + 1) * PAGE_SIZE < filteredItems().length) { state.page++; render(); }
    };
    minimizeButton.onclick = function () { panel.style.display = 'none'; };
    closeButton.onclick = function () { panel.style.display = 'none'; };
    ball.onclick = function () { panel.style.display = panel.style.display === 'none' ? 'flex' : 'none'; };
    exportButton.onclick = function () {
      if (syncPendingSearch()) render();
      var filtered = filteredItems();
      if (!filtered.length) return showTemporaryStatus('当前筛选结果为空，未导出文件');
      exportExcel(filtered, { fileLabel: '筛选结果', sheetName: '筛选岗位' });
    };
    bulkFavoriteButton.onclick = function () {
      syncPendingSearch();
      if (state.onlyFavorites) return;
      var filtered = filteredItems();
      if (!filtered.length) return showTemporaryStatus('当前筛选结果为空，没有可收藏岗位');
      var before = {};
      Object.keys(favorites).forEach(function (key) { before[key] = favorites[key]; });
      var added = addFavoriteItems(favorites, filtered);
      if (!saveFavorites(favorites)) {
        favorites = before;
        render();
        return showTemporaryStatus('批量收藏保存失败，请检查浏览器存储权限');
      }
      render();
      showTemporaryStatus(added ? '已新增收藏 ' + added + ' 条岗位' : '当前筛选结果已全部收藏');
    };
    clearFavoritesButton.onclick = function () {
      var favoriteCount = favoriteItems(favorites).length;
      if (!favoriteCount) return showTemporaryStatus('暂无收藏岗位');
      if (typeof window.confirm === 'function' && !window.confirm('确定取消全部 ' + favoriteCount + ' 条收藏吗？此操作无法撤销。')) return;
      var before = {};
      Object.keys(favorites).forEach(function (key) { before[key] = favorites[key]; });
      var removed = clearFavoriteItems(favorites);
      if (!saveFavorites(favorites)) {
        favorites = before;
        render();
        return showTemporaryStatus('取消全部收藏失败，请检查浏览器存储权限');
      }
      state.page = 0;
      render();
      showTemporaryStatus('已取消全部 ' + removed + ' 条收藏');
    };
    exportFavoritesButton.onclick = function () {
      var savedItems = favoriteItems(favorites);
      if (!savedItems.length) return showTemporaryStatus('暂无收藏岗位，未导出文件');
      exportExcel(savedItems, { fileLabel: '收藏岗位', sheetName: '收藏岗位', includeFavoriteTime: true });
    };

    var drag = null;
    header.addEventListener('mousedown', function (event) {
      if (event.target.closest('button')) return;
      var rect = panel.getBoundingClientRect();
      drag = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      panel.style.right = 'auto';
      event.preventDefault();
    });
    document.addEventListener('mousemove', function (event) {
      if (!drag) return;
      var left = Math.max(0, Math.min(window.innerWidth - panel.offsetWidth, event.clientX - drag.x));
      var top = Math.max(0, Math.min(window.innerHeight - header.offsetHeight, event.clientY - drag.y));
      panel.style.left = left + 'px';
      panel.style.top = top + 'px';
    });
    document.addEventListener('mouseup', function () { drag = null; });
    render();
  }

  function xmlEscape(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  }

  function formatDateTime(timestamp) {
    var date = new Date(Number(timestamp));
    if (!timestamp || isNaN(date.getTime())) return '';
    return formatDate(date) + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes());
  }

  function buildExcelWorkbook(items, options) {
    options = options || {};
    var columns = ['标题', '公司名称', '面向人群', '岗位类型', '行业标签', '招聘类型', '来源板块', 'Base地', '举办时间', '薪资范围', '链接'];
    if (options.includeFavoriteTime) columns.splice(columns.length - 1, 0, '收藏时间');
    var rows = items.map(function (item) {
      var tags = item.tags || {};
      var row = [item.title || '', item.company || '', (tags.audience || []).join('、'), tags.role || '',
        (tags.industries || []).join('、'), (tags.recruitTypes || []).join('、'), item.source || '',
        (tags.bases || []).join('、'), item.date || '', tags.salary || ''];
      if (options.includeFavoriteTime) row.push(formatDateTime(item.favoritedAt));
      row.push(item.url);
      return row;
    });
    var tableRows = [columns].concat(rows).map(function (row) {
      return '<Row>' + row.map(function (cell) {
        return '<Cell><Data ss:Type="String">' + xmlEscape(cell) + '</Data></Cell>';
      }).join('') + '</Row>';
    }).join('');
    return '<?xml version="1.0" encoding="UTF-8"?>' +
      '<?mso-application progid="Excel.Sheet"?>' +
      '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" ' +
      'xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="' + xmlEscape(options.sheetName || '招聘岗位') + '"><Table>' +
      tableRows + '</Table></Worksheet></Workbook>';
  }

  function exportExcel(items, options) {
    options = options || {};
    var workbook = buildExcelWorkbook(items, options);
    var blob = new Blob([workbook], { type: 'application/vnd.ms-excel;charset=utf-8' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = '吉林大学就业岗位_' + (options.fileLabel || '筛选结果') + '_' + formatDate(new Date()).replace(/\//g, '') + '.xls';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
  }

  function loadCache() {
    try {
      var timestamp = Number(localStorage.getItem(CACHE_TIME_KEY));
      if (!timestamp || Date.now() - timestamp > CACHE_TTL) return null;
      var data = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      return Array.isArray(data) ? data : null;
    } catch (error) {
      console.warn('读取岗位缓存失败', error);
      return null;
    }
  }

  function saveCache(items) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(items));
      localStorage.setItem(CACHE_TIME_KEY, String(Date.now()));
    } catch (error) {
      console.warn('保存岗位缓存失败', error);
    }
  }

  window.jluJobTagEngine = {
    extractCompany: extractCompany,
    extractSalary: extractSalary,
    companyMetadataIsReliable: companyMetadataIsReliable,
    classifyRole: classifyRole,
    generateTags: generateTags
  };
  window.jluJobPanelUtils = {
    normalizeFavorites: normalizeFavorites,
    loadFavorites: loadFavorites,
    saveFavorites: saveFavorites,
    snapshotFavorite: snapshotFavorite,
    favoriteItems: favoriteItems,
    addFavoriteItems: addFavoriteItems,
    clearFavoriteItems: clearFavoriteItems,
    filterPanelItems: filterPanelItems,
    buildExcelWorkbook: buildExcelWorkbook
  };

  if (window.jluJobPanelTestMode) {
    return function () {
      return Promise.resolve({ ok: true, summary: 'Tag engine loaded in test mode.' });
    };
  }

  function main() {
    var cached = loadCache();
    if (cached) {
      buildPanel(cached, true);
      return Promise.resolve(cached);
    }
    showStatus('开始抓取最近90天招聘数据');
    return crawlAllSources().then(function (items) {
      hideStatus();
      saveCache(items);
      buildPanel(items, false);
      return items;
    }).catch(function (error) {
      hideStatus();
      window.jluJobPanelReady = false;
      console.error(error);
      throw error;
    });
  }

  var initialization = main();
  return function () {
    return initialization.then(function (items) {
      return { ok: true, summary: '岗位获取面板初始化成功，共加载 ' + items.length + ' 条数据。' };
    }).catch(function (error) {
      return { ok: false, summary: error.message || String(error) };
    });
  };
})();