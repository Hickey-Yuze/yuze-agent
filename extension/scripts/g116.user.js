/**
 * ECJTU first-use access gate for scholar.edu.cn.
 * The local proxy is applied only to the Yuze process.
 */
async function run(args) {
    const CONTAINER_ID = 'ecjtu-access-gate';
    const UI_VERSION = '2.0.6';
    const HELPER_VERSION = '1.5.10';
    const VERIFIED_KEY = 'ecjtu-access-verified-v7';
    const LOCAL_MANAGER_MODE_KEY = 'ecjtu-local-manager-seen-v1';
    const OFFICIAL_DOWNLOAD_PAGE = 'https://scholar.edu.cn/download.html';
    const OFFICIAL_TOOL_URL = 'https://download.scholar.edu.cn/tools/windows_x64/scholartools.exe';
    const HEALTH_URL = 'http://127.0.0.1:58080/health';
    const SCHOLAR_PROBE_URL = 'https://scholar.google.com/scholar?hl=zh-CN';
    const SCHOLAR_FAVICON_URL = 'https://scholar.google.com/favicon.ico';

    if (window.__ecjtuAccessGateTimer) clearInterval(window.__ecjtuAccessGateTimer);
    document.getElementById(CONTAINER_ID)?.remove();

    const root = document.createElement('section');
    root.id = CONTAINER_ID;
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-label', 'ECJTU 学术资源访问设置');
    root.setAttribute('data-version', UI_VERSION);
    root.innerHTML = `
        <div class="ecjtu-panel">
            <header class="ecjtu-header">
                <div>
                    <strong>ECJTU 学术资源直达</strong>
                    <span>学术资源、科研工具与 AI 检索</span>
                </div>
                <button type="button" class="ecjtu-collapse" aria-label="收起">-</button>
            </header>
            <div class="ecjtu-body" aria-live="polite"></div>
        </div>
        <style>
            #${CONTAINER_ID} {
                --blue: #155eef;
                --green: #067647;
                --amber: #b54708;
                --red: #b42318;
                --ink: #1d2939;
                --muted: #667085;
                --line: #d0d5dd;
                position: fixed;
                right: 18px;
                bottom: 18px;
                z-index: 2147483647;
                width: min(400px, calc(100vw - 36px));
                color: var(--ink);
                font-family: "Segoe UI", "Microsoft YaHei", sans-serif;
                letter-spacing: 0;
            }
            #${CONTAINER_ID} * { box-sizing: border-box; }
            #${CONTAINER_ID} .ecjtu-panel {
                overflow: hidden;
                background: #fff;
                border: 1px solid var(--line);
                border-radius: 8px;
                box-shadow: 0 16px 40px rgba(16, 24, 40, .2);
            }
            #${CONTAINER_ID} .ecjtu-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                padding: 14px 16px;
                color: #fff;
                background: #12335f;
            }
            #${CONTAINER_ID} .ecjtu-header strong,
            #${CONTAINER_ID} .ecjtu-header span { display: block; }
            #${CONTAINER_ID} .ecjtu-header strong { font-size: 15px; }
            #${CONTAINER_ID} .ecjtu-header span { margin-top: 2px; color: #d1e9ff; font-size: 11px; }
            #${CONTAINER_ID} .ecjtu-collapse {
                width: 30px;
                height: 30px;
                border: 0;
                border-radius: 6px;
                color: #fff;
                background: rgba(255, 255, 255, .14);
                cursor: pointer;
                font-size: 18px;
            }
            #${CONTAINER_ID} .ecjtu-body { max-height: calc(100vh - 96px); overflow: auto; padding: 16px; }
            #${CONTAINER_ID}.is-collapsed .ecjtu-body { display: none; }
            #${CONTAINER_ID} .ecjtu-state {
                margin: 0 0 12px;
                padding: 10px 12px;
                border-left: 4px solid var(--amber);
                background: #fffaeb;
                font-size: 13px;
                line-height: 1.55;
            }
            #${CONTAINER_ID} .ecjtu-state.is-ready { border-color: var(--green); background: #ecfdf3; color: #05603a; }
            #${CONTAINER_ID} .ecjtu-state.is-error { border-color: var(--red); background: #fef3f2; color: #912018; }
            #${CONTAINER_ID} h4 { margin: 0 0 8px; font-size: 14px; }
            #${CONTAINER_ID} ol { margin: 0 0 14px; padding-left: 22px; color: #344054; }
            #${CONTAINER_ID} li { margin: 5px 0; font-size: 12px; line-height: 1.5; }
            #${CONTAINER_ID} .ecjtu-note { margin: 10px 0 0; color: var(--muted); font-size: 11px; line-height: 1.5; }
            #${CONTAINER_ID} .ecjtu-greeting { margin: 0 0 12px; color: #344054; font-size: 13px; line-height: 1.7; }
            #${CONTAINER_ID} .ecjtu-divider { height: 1px; margin: 14px 0; background: var(--line); }
            #${CONTAINER_ID} .ecjtu-guide-list { margin-bottom: 12px; }
            #${CONTAINER_ID} .ecjtu-guide-list li { padding-left: 2px; }
            #${CONTAINER_ID} .ecjtu-subtitle { margin: 12px 0 6px; color: #344054; font-size: 12px; font-weight: 700; }
            #${CONTAINER_ID} .ecjtu-facts { margin: 0; padding-left: 18px; color: #475467; }
            #${CONTAINER_ID} .ecjtu-facts li { margin: 4px 0; }
            #${CONTAINER_ID} .ecjtu-capability { margin: 8px 0 0; padding-left: 0; list-style: none; }
            #${CONTAINER_ID} .ecjtu-capability li { margin: 8px 0; color: #344054; }
            #${CONTAINER_ID} .ecjtu-capability strong { display: inline-block; min-width: 96px; color: #1d2939; }
            #${CONTAINER_ID} .ecjtu-actions { display: grid; gap: 8px; }
            #${CONTAINER_ID} button.ecjtu-action {
                min-height: 38px;
                width: 100%;
                padding: 9px 12px;
                border: 1px solid var(--line);
                border-radius: 6px;
                color: #344054;
                background: #fff;
                cursor: pointer;
                font-size: 12px;
                font-weight: 600;
            }
            #${CONTAINER_ID} button.ecjtu-primary { border-color: var(--blue); color: #fff; background: var(--blue); }
            #${CONTAINER_ID} button.ecjtu-confirm { border-color: var(--green); color: #fff; background: var(--green); }
            #${CONTAINER_ID} button:disabled { cursor: wait; opacity: .65; }
            #${CONTAINER_ID} .ecjtu-quick { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
            #${CONTAINER_ID} .ecjtu-research { border-top: 1px solid var(--line); margin-top: 14px; padding-top: 14px; }
            #${CONTAINER_ID} .ecjtu-resource-hub { margin: 0 0 14px; }
            #${CONTAINER_ID} .ecjtu-resource-hub h4 { margin-bottom: 3px; }
            #${CONTAINER_ID} .ecjtu-resource-hub p { margin: 0 0 9px; color: var(--muted); font-size: 12px; }
            #${CONTAINER_ID} .ecjtu-resource-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; }
            #${CONTAINER_ID} .ecjtu-resource-hub > label { display: block; margin: 0 0 6px; color: #344054; font-size: 12px; font-weight: 700; }
            #${CONTAINER_ID} .ecjtu-resource-hub textarea {
                display: block; width: 100%; min-height: 76px; padding: 10px 11px; resize: vertical;
                border: 1px solid #b8c4be; border-radius: 6px; background: #fbfdfc; color: var(--ink);
                font: 13px/1.5 "Segoe UI", "Microsoft YaHei", sans-serif; outline: none;
            }
            #${CONTAINER_ID} .ecjtu-resource-hub textarea::placeholder { color: #7b8982; opacity: 1; }
            #${CONTAINER_ID} .ecjtu-resource-hub textarea:focus { border-color: var(--green); box-shadow: 0 0 0 2px rgba(6,118,71,.14); background: #fff; }
            #${CONTAINER_ID} .ecjtu-research label { display: block; margin: 0 0 6px; color: #344054; font-size: 12px; font-weight: 600; }
            #${CONTAINER_ID} .ecjtu-research textarea,
            #${CONTAINER_ID} .ecjtu-research select { width: 100%; border: 1px solid var(--line); border-radius: 6px; color: var(--ink); background: #fff; font: inherit; }
            #${CONTAINER_ID} .ecjtu-research textarea { min-height: 68px; padding: 8px 9px; resize: vertical; }
            #${CONTAINER_ID} .ecjtu-research select { height: 34px; padding: 0 7px; }
            #${CONTAINER_ID} .ecjtu-research textarea:focus,
            #${CONTAINER_ID} .ecjtu-research select:focus { outline: 2px solid rgba(6,118,71,.2); border-color: var(--green); }
            #${CONTAINER_ID} .ecjtu-modes { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 5px; margin: 10px 0; }
            #${CONTAINER_ID} .ecjtu-mode { min-height: 38px; padding: 4px; border: 1px solid var(--line); border-radius: 6px; color: #344054; background: #f9fafb; cursor: pointer; font-size: 12px; }
            #${CONTAINER_ID} .ecjtu-mode[aria-pressed="true"] { border-color: var(--green); color: #05603a; background: #ecfdf3; font-weight: 700; }
            #${CONTAINER_ID} .ecjtu-filters { display: grid; grid-template-columns: 1fr 1fr auto; gap: 7px; align-items: end; margin-bottom: 10px; }
            #${CONTAINER_ID} .ecjtu-check { display: flex; align-items: center; gap: 5px; height: 34px; margin: 0; white-space: nowrap; font-size: 12px; font-weight: 400; }
            #${CONTAINER_ID} .ecjtu-check input { width: 16px; height: 16px; accent-color: var(--green); }
            #${CONTAINER_ID} .ecjtu-research-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
            #${CONTAINER_ID} .ecjtu-feedback { min-height: 32px; margin: 9px 0 0; color: var(--muted); font-size: 12px; line-height: 1.45; }
            @media (max-width: 520px) {
                #${CONTAINER_ID} { right: 10px; bottom: 10px; width: calc(100vw - 20px); }
                #${CONTAINER_ID} .ecjtu-quick { grid-template-columns: 1fr; }
                #${CONTAINER_ID} .ecjtu-modes { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                #${CONTAINER_ID} .ecjtu-filters { grid-template-columns: 1fr 1fr; }
                #${CONTAINER_ID} .ecjtu-check { grid-column: 1 / -1; }
            }
        </style>
    `;
    document.body.appendChild(root);

    const body = root.querySelector('.ecjtu-body');
    const collapse = root.querySelector('.ecjtu-collapse');
    collapse.addEventListener('click', () => {
        const collapsed = root.classList.toggle('is-collapsed');
        collapse.textContent = collapsed ? '+' : '-';
        collapse.setAttribute('aria-label', collapsed ? '展开' : '收起');
    });

    async function copyText(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (_) {
            try {
                const input = document.createElement('textarea');
                input.value = text;
                input.style.cssText = 'position:fixed;opacity:0;pointer-events:none;';
                document.body.appendChild(input);
                input.select();
                const copied = document.execCommand('copy');
                input.remove();
                return copied;
            } catch (_) {
                return false;
            }
        }
    }

    function buildResourcePrompt(resource, topic) {
        const target = topic || '未提供具体关键词，请先根据当前门户的资源分类判断最合适入口';
        return `【ECJTU 学术资源任务】\n任务类型：资源定位。\n你是 Yuze 中的严谨学术资源导航 Agent。用户需求：${target}。资源方向：${resource}。先在当前 ECJTU 学术资源门户中定位最合适的真实入口，再打开并核验目标页面。页面结构变化时先读取页面，再寻找资源卡片、搜索框或导航项；每次最多打开一个外部资源，返回后再决定下一步。只报告页面可见或可核验的资源名称、机构或出版方、覆盖内容、与需求的匹配理由、入口 URL、可访问状态和未核验项。不得把门户首页、图标或单条日志当成访问成功，不得编造资源、权限、数据覆盖范围、全文状态或功能。默认中文输出，最后推荐一个最值得优先打开的入口和下一步操作。`;
    }

    function buildResearchPrompt(mode, topic, options) {
        const common = `【ECJTU 学术资源任务】\n任务类型：文献研究。\n你是 Yuze 中的严谨学术检索 Agent。研究主题：${topic}\n筛选条件：时间=${options.period}；语言=${options.language}；全文偏好=${options.fullText ? '优先可获取全文' : '不限'}。\n先使用当前 ECJTU 学术资源门户定位合适入口，再读取真实结果页面。每次最多打开一个外部资源，返回结果页后再决定下一步。只记录可见或可核验的题名、作者、年份、来源、DOI/URL、摘要和全文状态；缺失字段写“未核验”。不得编造文献、引用次数、结论或访问状态。默认中文回答，题名与检索式保留原语言。`;
        const tasks = {
            locate: '任务：精准找论文。拆分核心概念、对象、方法和场景，给出中英文关键词、缩写、同义词和排除词；生成宽、平衡、精准三条布尔检索式；从可见结果中筛选最多 8 篇候选论文，用表格列出证据字段和匹配理由，最后推荐一篇最值得继续核验的论文。',
            review: '任务：建立主题综述路线。定义范围、时间边界和纳入/排除标准；拆分 3-5 个子方向；定位高质量综述、经典研究、近年进展和方法论文；区分一致结论、冲突结论和证据不足，并给出研究空白与下一轮检索式。',
            compare: '任务：比较论文。只比较当前页面可见或用户明确提供的 3-6 篇论文；用表格比较研究问题、方法、样本、核心结论、局限、适用场景和证据来源。未打开正文的字段必须写“未核验”，最后说明还需核验什么。',
            evidence: '任务：追踪证据链。先确认一篇含 DOI/URL 的种子论文；依次检查参考文献、被引研究和相关研究；标记支持、反驳、部分支持或未确定，并说明研究设计、样本和年份；画出简洁证据链并给出下一条检索式。'
        };
        return `${common}\n\n${tasks[mode] || tasks.locate}`;
    }

    function renderSetupRequired(message) {
        root.dataset.state = 'SETUP_REQUIRED';
        body.innerHTML = `
            <p class="ecjtu-state is-error">${message || '尚未完成官方访问配置，请先按学校官方指引启用访问。'}</p>
            <p class="ecjtu-greeting">同学你好 👋<br>我是华东交通大学学术资源直达与检索助手 🧊</p>
            <div class="ecjtu-divider"></div>
            <h4>🔧 首次配置（仅需一次）</h4>
            <ol class="ecjtu-guide-list">
                <li>下载 ECJTU 官方“Git/Docker 工具 for Windows”（文件名：<code>scholartools.exe</code>）。</li>
                <li>按官方页面或工具中的步骤用管理员身份打开输入1完成配置。</li>
                <li>在 Yuze 中打开 Google Scholar，确认搜索框和正文正常加载。</li>
                <li>返回本面板，点击“开始网页验证”。</li>
            </ol>
            <div class="ecjtu-actions">
                <button type="button" class="ecjtu-action ecjtu-primary" data-action="official-download">下载官方学术工具</button>
                <button type="button" class="ecjtu-action" data-action="official-page">查看官方下载页</button>
                <button type="button" class="ecjtu-action" data-action="begin-verify">开始网页验证</button>
            </div>
            <p class="ecjtu-subtitle">💡 关于本技炉</p>
            <ul class="ecjtu-facts">
                <li>本技炉旨在为花椒学生快速配置该学术网站，同时结合Yuze的agent功能，快速检索到学术资源。大家可以放心使用。</li>
                <li>下载按钮只在用户点击后打开学校官方下载地址,输入1启动配置，输入2关闭配置。</li>
                <li>启动配置后，需访问相应网站时请先确认校园网环境！如需切换校园网访问，请再次打开科研工具输入2关闭配置即可！</li>
                <li>仅在当前网页中生成资源定位与检索任务，并在获得许可时写入剪贴板。</li>
            </ul>
            <div class="ecjtu-divider"></div>
            <h4>🧠 验证通过后可直接使用</h4>
            <ul class="ecjtu-capability">
                <li><strong>📚 学术文献与期刊</strong>查阅论文、期刊、预印本与全文入口。</li>
                <li><strong>🗃️ 科研数据库</strong>访问学科数据、共享数据与专业资源库。</li>
                <li><strong>🧰 科研工具与 GitHub</strong>使用代码、开发工具、模型与开源项目资源。</li>
                <li><strong>🏛️ 海外高校与机构</strong>浏览高校、实验室、图书馆与研究机构网站。</li>
                <li><strong>🌐 Wiki、学会与会议</strong>访问知识库、行业学会和学术会议信息。</li>
            </ul>
            <p class="ecjtu-note">门户左侧已提供真实资源入口；需要自动检索或页面分析时，先从本面板复制任务，再点击右上角 Chat 或按 Ctrl+] 粘贴发送。</p>
        `;
        body.querySelector('[data-action="official-download"]').addEventListener('click', () => {
            window.open(OFFICIAL_TOOL_URL, '_blank', 'noopener,noreferrer');
        });
        body.querySelector('[data-action="official-page"]').addEventListener('click', () => {
            window.open(OFFICIAL_DOWNLOAD_PAGE, '_blank', 'noopener,noreferrer');
        });
        body.querySelector('[data-action="begin-verify"]').addEventListener('click', () => {
            localStorage.removeItem(LOCAL_MANAGER_MODE_KEY);
            renderNeedsVerification();
        });
    }

    function renderNeedsVerification() {
        root.dataset.state = 'ACCESS_TEST_REQUIRED';
        body.innerHTML = `
            <p class="ecjtu-state">完成一次真实页面验证即可开始使用。</p>
            <h4>验证 Google Scholar</h4>
            <ol>
                <li>确认已按 ECJTU 官方指引完成访问工具的配置与启动。</li>
                <li>打开 Google Scholar，确认搜索框和正文正常显示。</li>
                <li>返回本页，点击“页面正常，完成验证”。</li>
            </ol>
            <div class="ecjtu-actions">
                <button type="button" class="ecjtu-action ecjtu-primary" data-action="scholar">打开 Google Scholar 验证</button>
                <button type="button" class="ecjtu-action ecjtu-confirm" data-action="confirm">页面正常，完成验证</button>
            </div>
            <p class="ecjtu-note">证书警告、空白页、超时或 502 都不算成功。不要用 GitHub 代替验证；本确认只保存到当前浏览器，不检查或控制本机程序。</p>
        `;
        body.querySelector('[data-action="scholar"]').addEventListener('click', () => {
            window.open('https://scholar.google.com/', '_blank', 'noopener,noreferrer');
        });
        body.querySelector('[data-action="confirm"]').addEventListener('click', (event) => {
            const button = event.currentTarget;
            button.disabled = true;
            button.textContent = '已记录网页验证';
            localStorage.setItem(VERIFIED_KEY, JSON.stringify({ verified: true, at: new Date().toISOString() }));
            renderReady();
        });
    }

    function renderReady() {
        root.dataset.state = 'ACCESS_VERIFIED';
        body.innerHTML = `
            <p class="ecjtu-state is-ready">访问已验证，可以访问学术资源与科研站点。</p>
            <section class="ecjtu-resource-hub" aria-label="资源直达">
                <h4>资源直达</h4>
                <p>输入需求后选择资源方向，生成更准确的访问任务。</p>
                <label for="ecjtu-topic">你想找什么资源？</label>
                <textarea id="ecjtu-topic" placeholder="例如：网络流量日志、生成式 AI 教育、蛋白质结构数据"></textarea>
                <div class="ecjtu-resource-grid">
                    <button type="button" class="ecjtu-action" data-resource="学术文献与期刊">学术文献与期刊</button>
                    <button type="button" class="ecjtu-action" data-resource="科研数据库">科研数据库</button>
                    <button type="button" class="ecjtu-action" data-resource="科研工具与开源平台">科研工具与开源平台</button>
                    <button type="button" class="ecjtu-action" data-resource="GitHub 代码与项目资源">GitHub 代码资源</button>
                    <button type="button" class="ecjtu-action" data-resource="海外高校、实验室与图书馆网站">海外高校与实验室</button>
                    <button type="button" class="ecjtu-action" data-resource="Wiki、行业学会与学术会议">Wiki、学会与会议</button>
                </div>
            </section>
            <div class="ecjtu-research">
                <label>文献研究任务</label>
                <div class="ecjtu-modes" role="group" aria-label="研究模式">
                    <button type="button" class="ecjtu-mode" data-mode="locate" aria-pressed="true">精准找论文</button>
                    <button type="button" class="ecjtu-mode" data-mode="review" aria-pressed="false">主题综述</button>
                    <button type="button" class="ecjtu-mode" data-mode="compare" aria-pressed="false">论文对比</button>
                    <button type="button" class="ecjtu-mode" data-mode="evidence" aria-pressed="false">证据追踪</button>
                </div>
                <div class="ecjtu-filters">
                    <div><label for="ecjtu-period">时间</label><select id="ecjtu-period"><option value="近 5 年">近 5 年</option><option value="近 10 年">近 10 年</option><option value="不限">不限</option></select></div>
                    <div><label for="ecjtu-language">语言</label><select id="ecjtu-language"><option value="中英文">中英文</option><option value="中文">中文</option><option value="英文">英文</option></select></div>
                    <label class="ecjtu-check"><input id="ecjtu-fulltext" type="checkbox" checked> 全文优先</label>
                </div>
                <div class="ecjtu-research-actions">
                    <button type="button" class="ecjtu-action ecjtu-confirm" data-action="research">复制检索任务</button>
                    <button type="button" class="ecjtu-action" data-action="analyze">分析当前页面</button>
                </div>
            </div>
            <p class="ecjtu-feedback" aria-live="polite"></p>
            <div class="ecjtu-actions">
                <button type="button" class="ecjtu-action" data-action="recheck">重新检测访问状态</button>
                <button type="button" class="ecjtu-action" data-action="minimize">收起面板</button>
            </div>
        `;
        let activeMode = 'locate';
        const feedback = body.querySelector('.ecjtu-feedback');
        const getTopic = () => body.querySelector('#ecjtu-topic').value.trim();
        const showCopied = (message, copied) => {
            feedback.textContent = copied
                ? `${message}已复制。点击右上角 Chat 按钮或按 Ctrl+] 打开聊天窗口，粘贴后发送。`
                : '无法复制任务。请允许此网站访问剪贴板后重试。';
        };
        body.querySelectorAll('[data-resource]').forEach((button) => {
            button.addEventListener('click', async () => {
                showCopied(`“${button.textContent}”访问任务`, await copyText(buildResourcePrompt(button.dataset.resource, getTopic())));
            });
        });
        body.querySelectorAll('[data-mode]').forEach((button) => {
            button.addEventListener('click', () => {
                activeMode = button.dataset.mode;
                body.querySelectorAll('[data-mode]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
            });
        });
        body.querySelector('[data-action="research"]').addEventListener('click', async () => {
            const topic = getTopic();
            if (!topic) {
                feedback.textContent = '请先输入研究主题或问题。';
                body.querySelector('#ecjtu-topic').focus();
                return;
            }
            showCopied('检索任务', await copyText(buildResearchPrompt(activeMode, topic, {
                period: body.querySelector('#ecjtu-period').value,
                language: body.querySelector('#ecjtu-language').value,
                fullText: body.querySelector('#ecjtu-fulltext').checked
            })));
        });
        body.querySelector('[data-action="analyze"]').addEventListener('click', async () => {
            const prompt = `【ECJTU 学术资源任务】\n任务类型：当前页面分析。\n你是 Yuze 中的严谨学术资源 Agent。请打开并分析页面：${location.href}\n页面标题：${document.title}\n用户需求：${getTopic() || '未指定'}。只使用页面可见信息，不得编造资源名称、题名、作者、年份、摘要、引用次数或全文状态。按“资源或论文、相关性、可见证据、可访问状态、未核验字段、下一步”输出表格；若没有可分析的结果，给出最合适的检索词和一个应继续打开的入口。每次最多打开一个外部资源。`;
            showCopied('当前页面分析任务', await copyText(prompt));
        });
        body.querySelector('[data-action="recheck"]').addEventListener('click', detectAndRender);
        body.querySelector('[data-action="minimize"]').addEventListener('click', () => collapse.click());
    }

    async function checkLocalHelper() {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2500);
        try {
            const response = await fetch(HEALTH_URL, {
                method: 'GET',
                cache: 'no-store',
                mode: 'cors',
                signal: controller.signal
            });
            if (!response.ok) return null;
            const result = await response.json();
            return result?.status === 'ready' &&
                result?.service === 'ecjtu-access-helper' &&
                result?.version === HELPER_VERSION &&
                result?.proxyScope === 'Yuze-process-only'
                ? result
                : null;
        } catch (_) {
            return null;
        } finally {
            clearTimeout(timeout);
        }
    }

    function loadImage(url, timeoutMs) {
        return new Promise((resolve) => {
            const image = new Image();
            const timeout = setTimeout(() => {
                image.src = '';
                resolve(false);
            }, timeoutMs);
            image.onload = () => {
                clearTimeout(timeout);
                resolve(true);
            };
            image.onerror = () => {
                clearTimeout(timeout);
                resolve(false);
            };
            image.referrerPolicy = 'no-referrer';
            image.src = `${url}?ecjtu_probe=${Date.now()}`;
        });
    }

    async function checkScholarReachable() {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        try {
            const request = fetch(`${SCHOLAR_PROBE_URL}&ecjtu_probe=${Date.now()}`, {
                method: 'GET',
                cache: 'no-store',
                mode: 'no-cors',
                redirect: 'follow',
                signal: controller.signal
            }).then(() => true).catch(() => false);
            const [requestCompleted, iconLoaded] = await Promise.all([
                request,
                loadImage(SCHOLAR_FAVICON_URL, 6000)
            ]);
            return requestCompleted && iconLoaded;
        } finally {
            clearTimeout(timeout);
        }
    }

    async function detectAndRender() {
        body.innerHTML = '<p class="ecjtu-state">正在自动检测 Google Scholar 访问状态...</p>';
        const [helper, scholarReachable] = await Promise.all([
            checkLocalHelper(),
            checkScholarReachable()
        ]);
        root.dataset.helperOnline = String(Boolean(helper));
        root.dataset.scholarReachable = String(scholarReachable);
        if (helper) localStorage.setItem(LOCAL_MANAGER_MODE_KEY, 'true');

        if (scholarReachable) {
            localStorage.setItem(VERIFIED_KEY, JSON.stringify({
                verified: true,
                method: 'automatic-scholar-probe',
                at: new Date().toISOString()
            }));
            renderReady();
            return;
        }

        if (!helper) {
            if (localStorage.getItem(LOCAL_MANAGER_MODE_KEY) === 'true') {
                localStorage.removeItem(VERIFIED_KEY);
                renderSetupRequired('本地学术访问管理器当前未启动。请先运行管理器并输入 1，再完成网页验证。若改用官方工具，请点击“开始网页验证”。');
            } else {
                renderSetupRequired('自动检测未能确认 Google Scholar 可访问。官方学术工具未提供可供网页读取的本地状态接口，请打开 Google Scholar 完成真实网页验证。');
            }
            return;
        }

        let verified = false;
        try {
            const saved = JSON.parse(localStorage.getItem(VERIFIED_KEY) || 'null');
            verified = saved?.verified === true;
        } catch (_) {}
        if (verified) renderReady();
        else renderNeedsVerification();
    }

    await detectAndRender();
    window.__ecjtuAccessGateTimer = setInterval(() => {
        if (!document.body.contains(root)) return;
        Promise.all([checkLocalHelper(), checkScholarReachable()]).then(([helper, scholarReachable]) => {
            const online = String(Boolean(helper));
            const reachable = String(scholarReachable);
            if (root.dataset.helperOnline !== online || root.dataset.scholarReachable !== reachable) {
                detectAndRender();
            }
        });
    }, 10000);
    return {
        ok: true,
        version: UI_VERSION,
        injected: true,
        state: root.dataset.state
    };
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    run().catch((error) => console.error('[ECJTU access gate]', error));
}