# 交接文档 · Yuze-agent

> 作者：Yuze（Hickey-Yuze） · 版本 0.4.0 · 更新：2025-10
> 读者：接手本项目的开发者。读完应能独立跑起、改对、测过。

---

## 1. 项目概览

Chrome MV3 侧边栏 AI agent。核心思想：**所有逻辑跑在侧边栏页面**（不受 service worker 休眠影响），LLM 走 OpenAI 兼容 `/chat/completions`（SSE 流式 + tools），浏览器操控走 `chrome.debugger`（原生 CDP），扩展性走 MCP 与妙招脚本。

```
extension/                Chrome 扩展本体（加载这个目录）
  manifest.json           MV3 清单：permissions 含 debugger/scripting/tabs/storage/downloads；host_permissions <all_urls>
  sidepanel.html/.css/.js 侧边栏 UI + 全部业务逻辑（单文件 ~3000 行）
  background.js           仅一件事：监听 tabs.onUpdated，按 autoSkills 注入脚本类妙招
  icons/ brand.png        图标与品牌图（源图 logo.jpg 1080×1080 生成 16/32/48/128）
  scripts/*.user.js       妙招脚本（b15–b19 及 index.json 元数据）
server/                   本地辅助服务（filegen MCP: 127.0.0.1:8950/mcp）
  server.mjs              MCP server：gen_pdf/gen_pptx/gen_xlsx/gen_docx
  chrome-pdf.mjs          headless Chrome Page.printToPDF 单实例（空闲 5 分钟回收，失败回退 pdf-lib）
docs/                     PRD.md、HANDOVER.md、测试截图
test-*.mjs                headless Chrome 自动化测试（~60 个）
.bak/                     历史备份（gitignore，不随仓库发布）
```

## 2. 运行与调试

```bash
# 扩展
chrome://extensions → 开发者模式 → 加载已解压 → 选 extension/
# PDF 服务（可选，不启动则回退 pdf-lib）
cd server && npm install && node server.mjs
# 测试（headless Chrome + Extensions.loadUnpacked + CDP）
node test-settings.mjs     # 设置弹窗结构 + 截图
node test-quote-auto.mjs   # 自动引用开关
node test-b15-restore.mjs  # b15 脚本注入验证
```

**重载铁律**（踩过坑）：

1. 改 `manifest.json` 权限 → 必须 `chrome://extensions` 把开关**关掉再打开**，仅点 ↻ 不重载静态权限。
2. 刷新扩展后已打开的侧边栏不重载（每窗口独立）→ 必须关闭重开。
3. `background.js` 变更同样需要完整重载。

## 3. sidepanel.js 模块地图

| 区块 | 内容 |
|---|---|
| 常量区（~1-60 行） | `MAX_STEPS=300`、`SYSTEM_PROMPT`（任务模式注入，强制 `mcp_gen_*`）、`BUILTIN_SKILLS`（33 个妙招）、`TASK_ICONS` |
| LLM | `callLLM(onDelta)`：SSE 流式（`data:` 逐行，跳过 `[DONE]`），累积 `delta.reasoning_content` / `delta.content` / `delta.tool_calls`（按 index 合并） |
| Agent 循环 | `runAgent()`：push live 消息 → 流式回填 → 工具调用 → `sig`（name+args 前 160 字）判进展，连续 4 轮无新进展即停 |
| 渲染 | `render()` 全量、`updateLive(msg)` 增量（流式期间只更新最后一条 `.msg-bot` 的 `.think-body` 与 `.bot-md`，避免动画重播闪烁） |
| Markdown | `mdToHtml`：h1-h6→h2-h6、hr、ul/ol、代码块、blockquote、链接、em、图片规则**先于**链接 |
| 工具实现 | `TOOL_IMPL`：browser_*（CDP）、`save_js`（data URL + downloads）、`toolReadTabText` 等 |
| 引用 | `quoteRefs[]` + `renderQuoteBar()`（控制 `#quoteWrap` 显隐）；`syncAutoQuote()`（`tabs.onActivated`/`onUpdated` 触发）；`readTabText(tabId)`：attach debugger → Runtime.evaluate（选区或正文前 3000 字）→ detach |
| MCP | `mcpServers[]`（storage.mcp = [{name,url,headers}]）；`mcpRpc(server,method,params)` 支持 headers、JSON 与 SSE 双响应；工具名 `mcp_<slug>` 冲突加序号 |
| 妙招 | `skillSites[id]`（适用网站）、`chrome.storage.autoSkills`（自动运行清单）、详情页加载 `codeFile` 显示脚本源码 |
| 会话 | `sessions` 键（≤100 条，300ms 防抖）；`persist()` 记录 `host`；抽屉按 `pageHost()` 分组 |

## 4. 存储结构（chrome.storage.local）

| 键 | 内容 |
|---|---|
| `sessions` | 会话列表（消息含 reasoning/tool 卡片） |
| `sessionId` | 当前会话 id |
| `settings` | 提供商列表与激活项（含 apiKey——仅本机） |
| `mcp` | MCP 服务器数组 [{name,url,headers}] |
| `quoteAuto` | 自动引用开关 |
| `quoteBookmarks` | 引用收藏 |
| `autoSkills` | 自动运行妙招 [{id,name,codeFile,match}] |

## 5. 关键设计决策（为什么这么写）

- **侧边栏承载循环**：MV3 service worker 30s 休眠会杀长任务，工具循环放 sidepanel 页面。
- **chrome.debugger 而非 remote-debugging-port**：免启动参数、免 native host；代价是顶部调试提示条与受保护页不可用。
- **导航用 `chrome.tabs.update` + 等 complete**：CDP `Page.navigate` 会 `Detached while handling command`。
- **执行脚本前先 detach**：debugger 与 scripting.executeScript 互斥（attachedTabId 检查）。
- **文件生成外包 MCP**：文档库 ~2.2MB 不进扩展；PDF 用 Chrome 排版引擎拿中文断行/表头重复/页码。
- **流式不重建 DOM**：入场动画只做位移不碰 opacity；`updateLive` 文本节点原地改。
- **布局红线**：面板动画只位移；`.sheet` 用 absolute + z-index:1000 + opacity:1 压住输入框；网格 `minmax(0,1fr)` + `min-width:0`。
- **UI 定稿**：macOS 蓝（`--accent:#007aff`），不用橙色；设置页为居中弹窗卡（`.set-card`）；引用开关在引用条同一行右侧（`#quoteWrap`）。

## 6. 已知问题与待办

**已知问题**

1. 受保护页面（`chrome://`、Web Store）无法 attach debugger。
2. 文件卡片重开侧边栏后打不开（Blob URL 释放）——重新生成即可。
3. b15 等移植脚本依赖原站结构（Tabbit 页面 + `p0.meituan.net` 图片），原站改版失效；原版备份在 `extension/scripts/b15.orig.user.js`。
4. reasoning 未在发送历史时剥离（若上游对 reasoning 字段报错需处理）。

**待办（PRD 范围外延）**

- 自定义妙招：编辑、上传文件、对话创建。
- `save_js` → `save_file` 泛化（任意扩展名）。
- filegen 开机自启；其余分类妙招脚本抓取（页面懒加载待处理）。
- 12 个内置妙招描述是否按四段式重写，待拍板。

## 7. 测试资产

- `test-<场景>.mjs` 统一骨架：`mkdtempSync` 用户目录 → `Extensions.loadUnpacked` → `Target.createTarget sidepanel.html` → `Runtime.evaluate(awaitPromise)` → `Page.captureScreenshot` 输出 `docs/`。
- 新增功能请补一个 test 脚本并跑通后再提交。
- 推送约定：**每次修复后推送到 GitHub**（main 分支）。

## 8. 联系方式

- 作者 / 维护者：Yuze —— [github.com/Hickey-Yuze](https://github.com/Hickey-Yuze)
- 相关文档：[docs/PRD.md](./PRD.md)（需求与验收）、[README.md](../README.md)（操作手册）
