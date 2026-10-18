/**
 * JD Lens 本地服务
 * 用法：node proxy.js
 * 
 * 五个功能：
 * 1. GET/POST /config → 读写配置（凭证存在本地，不暴露给脚本；GET 返回掩码凭证+configured 状态）
 * 2. POST /save → 接收 JD 业务数据，代理自己用凭证调 API 写入飞书表格（按投递链接查重，已有则更新）
 * 3. POST /check → 代理用凭证查表格，检查某链接是否已存过；已存则返回完整记录字段，供脚本回显
 * 4. GET/POST /resume → 读写结构化简历数据（存在本地配置文件中，不经过飞书）
 * 5. GET / → 健康检查，返回服务状态
 * 
 * 安全说明：凭证仅存在本服务的 jd-lens-config.json 中，不经过脚本代码。
 * 脚本只发送业务数据（JD 内容）和投递链接，代理自己持有凭证调飞书 API。
 */
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 8788;
const CONFIG_FILE = path.join(__dirname, 'jd-lens-config.json');

// ==================== 凭证与 token 缓存 ====================
let _tenantToken = null;
let _tenantTokenExpire = 0;
let _realAppToken = null;

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }
  } catch (e) {
    console.log('  [config] read error:', e.message);
  }
  return {};
}

function saveConfig(config) {
  const existing = loadConfig();
  const merged = { ...existing, ...config };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2), 'utf8');
}

// 获取 tenant_access_token（带缓存，2小时有效）
async function getTenantToken() {
  if (_tenantToken && Date.now() < _tenantTokenExpire - 300000) {
    return _tenantToken;
  }
  const config = loadConfig();
  const { appId, appSecret } = config;
  if (!appId || !appSecret) {
    throw new Error('缺少应用凭证，请在配置页填写');
  }
  const tokenData = await httpsRequest(
    'POST',
    'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
    { 'Content-Type': 'application/json' },
    { app_id: appId, app_secret: appSecret }
  );
  if (tokenData.code !== 0) {
    throw new Error('登录失败: ' + (tokenData.msg || JSON.stringify(tokenData)));
  }
  _tenantToken = tokenData.tenant_access_token;
  _tenantTokenExpire = Date.now() + (tokenData.expire || 7200) * 1000;
  return _tenantToken;
}

// 获取真实 app_token（wiki 表格需要转换）
async function getRealAppToken() {
  if (_realAppToken) return _realAppToken;
  const config = loadConfig();
  const { appToken } = config;
  if (!appToken) throw new Error('缺少表格 Token');
  let real = appToken;
  const token = await getTenantToken();
  try {
    const wikiData = await httpsRequest(
      'GET',
      `https://open.feishu.cn/open-apis/wiki/v2/nodes/${appToken}?obj_type=8`,
      { Authorization: 'Bearer ' + token }
    );
    if (wikiData.code === 0 && wikiData.data && wikiData.data.node && wikiData.data.node.obj_token) {
      real = wikiData.data.node.obj_token;
    }
  } catch (e) {
    console.log('  [wiki] resolve failed, using original token');
  }
  _realAppToken = real;
  return real;
}

// ==================== HTTPS 请求封装 ====================
function httpsRequest(method, url, headers, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const reqBody = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: u.hostname,
      port: u.port || 443,
      path: u.pathname + u.search,
      method: method,
      headers: {
        ...headers,
        ...(reqBody ? { 'Content-Length': Buffer.byteLength(reqBody) } : {}),
      },
    }, (res) => {
      let respBody = '';
      res.on('data', chunk => respBody += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(respBody)); }
        catch (e) { resolve({ code: -1, msg: respBody }); }
      });
    });
    req.on('error', reject);
    if (reqBody) req.write(reqBody);
    req.end();
  });
}

// ==================== 错误码翻译 ====================
function feishuErrorMsg(code, msg) {
  const map = {
    1254045: '表格里没有找到对应的列名',
    1254004: '字段格式不匹配，请检查多选/单选/日期类型',
    1254040: '找不到这个表格，请检查 Table ID 和 Token',
    99991663: '登录失败，请检查应用凭证是否正确',
    99991679: '应用权限不足，请开通云文档和多维表格权限',
    1254101: '应用权限不足，请开通 bitable 和 wiki 权限',
  };
  return map[code] || msg || ('未知错误，错误码: ' + code);
}

// ==================== 表格操作 ====================
async function saveRecord(jdData) {
  const config = loadConfig();
  const { tableId } = config;
  if (!tableId) throw new Error('缺少表格 Table ID');

  console.log('  [save] apply_link:', JSON.stringify(jdData.apply_link));
  console.log('  [save] update_time:', JSON.stringify(jdData.update_time));
  console.log('  [save] ddl:', JSON.stringify(jdData.ddl));
  console.log('  [save] all fields:', JSON.stringify(jdData, null, 2));

  const token = await getTenantToken();
  const realApp = await getRealAppToken();

  // 查重：投递链接 + 公司名称 同时命中才算已存在
  const conds = [];
  if (jdData.apply_link) conds.push(`CurrentValue.[投递链接].link="${jdData.apply_link}"`);
  if (jdData.company) conds.push(`CurrentValue.[公司名称]="${jdData.company}"`);
  const filterExpr = conds.length > 0 ? conds.join(' AND ') : 'CurrentValue.[投递链接]!=""';
  const queryData = await httpsRequest(
    'GET',
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${realApp}/tables/${tableId}/records?filter=${encodeURIComponent(filterExpr)}&page_size=1`,
    { Authorization: 'Bearer ' + token }
  );

  // 日期 → 毫秒时间戳
  function dateToTs(s) {
    if (!s) return null;
    const d = new Date(s.replace(/\//g, '-'));
    if (isNaN(d.getTime())) return null;
    return d.getTime();
  }

  function toArray(v) {
    if (!v) return [];
    return String(v).split(/[,，、]/).map(s => s.trim()).filter(Boolean);
  }

  // 构建 fields
  const fields = {
    '公司名称': jdData.company || '',
    '岗位名称': jdData.title || '',
    '岗位类型': toArray(jdData.position_category),
    '行业': jdData.industry || '',
    '类型': jdData.job_type || '',
    '薪资': jdData.salary || '',
    'base地': toArray(jdData.location),
    '是否hc': determineHC(jdData.job_type),
    '投递链接': jdData.apply_link ? { link: jdData.apply_link, text: jdData.apply_link } : null,
    '职位描述': jdData.responsibilities || '',
    '职位要求': jdData.requirements || '',
    '加分项': jdData.bonus || '',
    'ddl': dateToTs(jdData.ddl),
    '投递须知': jdData.apply_notes || '',
    '投递状态': jdData.has_applied ? '已投递' : '待投递',
    '是否下线': '否',
    '更新时间': dateToTs(jdData.update_time) || Date.now(),
  };

  // 移除 null 值
  Object.keys(fields).forEach(k => {
    if (fields[k] === null || fields[k] === undefined) delete fields[k];
  });

  console.log('  [save] final fields:', JSON.stringify(fields, null, 2));

  let result;
  if (queryData.code === 0 && queryData.data && queryData.data.items && queryData.data.items.length > 0) {
    // 更新已有记录
    const recordId = queryData.data.items[0].record_id;
    result = await httpsRequest(
      'PUT',
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${realApp}/tables/${tableId}/records/${recordId}`,
      { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      { fields }
    );
  } else {
    // 新增记录
    result = await httpsRequest(
      'POST',
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${realApp}/tables/${tableId}/records`,
      { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      { fields }
    );
  }

  if (result.code !== 0) {
    throw new Error(feishuErrorMsg(result.code, result.msg));
  }
  return result;
}

async function checkRecordExists(applyLink, jobTitle, company) {
  const config = loadConfig();
  const { tableId } = config;
  if (!tableId) return { exists: false };
  const token = await getTenantToken();
  const realApp = await getRealAppToken();
  // 查重：投递链接 + 公司名称 同时命中才算已存在
  const conds = [];
  if (applyLink) conds.push(`CurrentValue.[投递链接].link="${applyLink}"`);
  if (company) conds.push(`CurrentValue.[公司名称]="${company}"`);
  const filterExpr = conds.length > 0 ? conds.join(' AND ') : 'CurrentValue.[投递链接]!=""';
  const queryData = await httpsRequest(
    'GET',
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${realApp}/tables/${tableId}/records?filter=${encodeURIComponent(filterExpr)}&page_size=1`,
    { Authorization: 'Bearer ' + token }
  );
  if (queryData.code === 0 && queryData.data && queryData.data.items && queryData.data.items.length > 0) {
    return { exists: true, record: queryData.data.items[0].fields };
  }
  return { exists: false };
}

function determineHC(jobType) {
  if (!jobType) return '否';
  if (['秋招', '秋招提前批', '春招', '暑期实习'].includes(jobType)) return '是';
  return '否';
}

// ==================== HTTP Server ====================
const server = http.createServer((req, res) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
    'Access-Control-Allow-Headers': '*',
  };

  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    return res.end();
  }

  // ==================== 配置存取 ====================
  if (req.url === '/config' || req.url === '/config/') {
    if (req.method === 'GET') {
      const config = loadConfig();
      function mask(s) {
        if (!s) return '';
        if (s.length <= 4) return s[0] + '***';
        return s.slice(0, 4) + '****';
      }
      const safe = {
        configured: !!(config.appId && config.appSecret && config.appToken && config.tableId),
        appId: mask(config.appId),
        appSecret: mask(config.appSecret),
        appToken: mask(config.appToken),
        tableId: mask(config.tableId),
      };
      res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
      return res.end(JSON.stringify({ code: 0, data: safe }));
    }
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const newConfig = JSON.parse(body);
          saveConfig(newConfig);
          console.log('  [config] POST → saved');
          _tenantToken = null;
          _realAppToken = null;
          res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
          return res.end(JSON.stringify({ code: 0, msg: 'ok' }));
        } catch (e) {
          res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
          return res.end(JSON.stringify({ code: -1, msg: e.message }));
        }
      });
      return;
    }
  }

  // ==================== 保存 JD 数据 ====================
  if (req.url === '/save' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const jdData = JSON.parse(body);
        console.log('  [save] title:', jdData.title);
        const result = await saveRecord(jdData);
        console.log('  [save] success');
        res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
        return res.end(JSON.stringify({ code: 0, msg: 'ok', data: result }));
      } catch (e) {
        console.log('  [save] error:', e.message);
        res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
        return res.end(JSON.stringify({ code: -1, msg: e.message }));
      }
    });
    return;
  }

  // ==================== 检查是否已存 ====================
  if (req.url === '/check' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { applyLink, jobTitle, company } = JSON.parse(body);
        const result = await checkRecordExists(applyLink, jobTitle, company);
        res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
        return res.end(JSON.stringify({ code: 0, data: result }));
      } catch (e) {
        res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
        return res.end(JSON.stringify({ code: -1, msg: e.message }));
      }
    });
    return;
  }

  // ==================== 简历数据存取 ====================
  if (req.url === '/resume' || req.url === '/resume/') {
    if (req.method === 'GET') {
      const config = loadConfig();
      const resume = config.resume || null;
      res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
      return res.end(JSON.stringify({ code: 0, data: resume }));
    }
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const resumeData = JSON.parse(body);
          saveConfig({ resume: resumeData });
          console.log('  [resume] POST → saved');
          res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
          return res.end(JSON.stringify({ code: 0, msg: 'ok' }));
        } catch (e) {
          res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
          return res.end(JSON.stringify({ code: -1, msg: e.message }));
        }
      });
      return;
    }
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json', ...corsHeaders });
  res.end(JSON.stringify({ code: -1, msg: 'not found' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('========================================');
  console.log('JD Lens 本地服务已启动: http://localhost:' + PORT);
  console.log('配置: GET/POST http://localhost:' + PORT + '/config');
  console.log('保存: POST http://localhost:' + PORT + '/save');
  console.log('检查: POST http://localhost:' + PORT + '/check');
  console.log('简历: GET/POST http://localhost:' + PORT + '/resume');
  console.log('按 Ctrl+C 停止');
  console.log('========================================\n');
});