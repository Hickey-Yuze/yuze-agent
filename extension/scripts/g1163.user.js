(async function __tabEvaluateScriptBridge() {
  const __tabScriptArgs = null;
  const __tabOriginalFunction = (
    /**
     * ════════════════════════════════════════════════════════
     *   正版软件官网导航 - 浏览器注入脚本 v1.0
     *   一键直达软件官方网站，安全下载正版软件
     *   
     *   使用方式：
     *     1. 在任意网页的控制台(F12)中粘贴此脚本并回车
     *     2. 或通过油猴(Tampermonkey)等脚本管理器安装
     *     3. 点击页面右下角悬浮按钮即可打开导航面板
     *   
     *   作者：Tabbit AI
     *   日期：2026-06-15
     * ════════════════════════════════════════════════════════
     */
    
    async function run(args) {
      'use strict';
    
      // ========== 软件数据库 ==========
      const SOFTWARE_DB = [
        // ── 浏览器 ──
        { id:"chrome", name:"Google Chrome", nameCN:"谷歌浏览器", pinyin:"ggl", category:"browser", icon:"🌐", platforms:["Windows","macOS","Linux","iOS","Android"], officialSite:"https://www.google.com/chrome/", downloadPage:"https://www.google.com/chrome/", isFree:true, description:"Google 出品的高速网页浏览器，全球使用最广泛。", keywords:["google","chrome浏览器","谷歌"] },
        { id:"firefox", name:"Mozilla Firefox", nameCN:"火狐浏览器", pinyin:"hh", category:"browser", icon:"🦊", platforms:["Windows","macOS","Linux","iOS","Android"], officialSite:"https://www.mozilla.org/zh-CN/firefox/new/", downloadPage:"https://www.mozilla.org/zh-CN/firefox/new/", isFree:true, description:"开源免费浏览器，注重隐私保护与自定义功能。", keywords:["mozilla","firefox","火狐"] },
        { id:"edge", name:"Microsoft Edge", nameCN:"Edge 浏览器", pinyin:"edge", category:"browser", icon:"💠", platforms:["Windows","macOS","iOS","Android"], officialSite:"https://www.microsoft.com/zh-cn/edge", downloadPage:"https://www.microsoft.com/zh-cn/edge", isFree:true, description:"微软新一代 Chromium 内核浏览器，集成 AI 助手 Copilot。", keywords:["microsoft","edge","微软"] },
        { id:"brave", name:"Brave Browser", nameCN:"Brave 浏览器", pinyin:"brave", category:"browser", icon:"🦁", platforms:["Windows","macOS","Linux","iOS","Android"], officialSite:"https://brave.com/", downloadPage:"https://brave.com/download/", isFree:true, description:"主打隐私保护和广告拦截的快速浏览器。", keywords:["brave","隐私浏览器"] },
        { id:"arc", name:"Arc Browser", nameCN:"Arc 浏览器", pinyin:"arc", category:"browser", icon:"🌈", platforms:["Windows","macOS","iOS"], officialSite:"https://arc.net/", downloadPage:"https://arc.net/", isFree:true, description:"重新定义浏览体验的创新型浏览器。", keywords:["arc","arc浏览器"] },
    
        // ── 办公 ──
        { id:"wps-office", name:"WPS Office", nameCN:"WPS Office", pinyin:"wps", category:"office", icon:"📝", platforms:["Windows","macOS","Linux","iOS","Android"], officialSite:"https://www.wps.cn/", downloadPage:"https://www.wps.cn/product/wps-office/", isFree:true, description:"金山出品国产办公套件，兼容 Microsoft Office 格式。", keywords:["wps","金山办公","文档编辑"] },
        { id:"microsoft-365", name:"Microsoft 365", nameCN:"微软 365 / Office", pinyin:"ms365", category:"office", icon:"📘", platforms:["Windows","macOS","iOS","Android"], officialSite:"https://www.microsoft.com/zh-cn/microsoft-365", downloadPage:"https://www.microsoft.com/zh-cn/microsoft-365/download-office", isFree:false, description:"微软旗舰办公套件，包含 Word、Excel、PowerPoint 等。", keywords:["office","word","excel","ppt","powerpoint","微软办公"] },
        { id:"notion", name:"Notion", nameCN:"Notion", pinyin:"notion", category:"office", icon:"📓", platforms:["Windows","macOS","iOS","Android"], officialSite:"https://www.notion.so/zh-cn", downloadPage:"https://www.notion.so/zh-cn/downloads", isFree:true, description:"集笔记、知识库、任务管理、协作于一体的全能工具。", keywords:["notion","笔记","知识库","协作"] },
        { id:"obsidian", name:"Obsidian", nameCN:"Obsidian", pinyin:"obsidian", category:"office", icon:"🔮", platforms:["Windows","macOS","Linux","iOS","Android"], officialSite:"https://obsidian.md/", downloadPage:"https://obsidian.md/download", isFree:true, description:"本地优先的双向链接笔记工具，支持 Markdown 和插件生态。", keywords:["obsidian","双向链接","markdown","笔记"] },
        { id:"libreoffice", name:"LibreOffice", nameCN:"LibreOffice", pinyin:"libreoffice", category:"office", icon:"📊", platforms:["Windows","macOS","Linux"], officialSite:"https://zh-cn.libreoffice.org/", downloadPage:"https://zh-cn.libreoffice.org/download/download-libreoffice/", isFree:true, description:"开源免费的完整办公套件，兼容多种文档格式。", keywords:["libreoffice","开源办公","writer","calc","impress"] },
    
        // ── 开发工具 ──
        { id:"vscode", name:"Visual Studio Code", nameCN:"VS Code", pinyin:"vscode", category:"dev", icon:"💻", platforms:["Windows","macOS","Linux"], officialSite:"https://code.visualstudio.com/", downloadPage:"https://code.visualstudio.com/Download", isFree:true, description:"微软出品的免费开源代码编辑器，插件生态极其丰富。", keywords:["vscode","visual studio code","代码编辑器","ide","开发"] },
        { id:"git", name:"Git", nameCN:"Git 版本控制", pinyin:"git", category:"dev", icon:"🔀", platforms:["Windows","macOS","Linux"], officialSite:"https://git-scm.com/", downloadPage:"https://git-scm.com/downloads", isFree:true, description:"分布式版本控制系统，开发者必备工具。", keywords:["git","版本控制","github"] },
        { id:"nodejs", name:"Node.js", nameCN:"Node.js 运行时", pinyin:"nodejs", category:"dev", icon:"🟢", platforms:["Windows","macOS","Linux"], officialSite:"https://nodejs.org/", downloadPage:"https://nodejs.org/en/download", isFree:true, description:"基于 V8 引擎的 JavaScript 运行时环境。", keywords:["nodejs","node","javascript","npm"] },
        { id:"python", name:"Python", nameCN:"Python 编程语言", pinyin:"python", category:"dev", icon:"🐍", platforms:["Windows","macOS","Linux"], officialSite:"https://www.python.org/", downloadPage:"https://www.python.org/downloads/", isFree:true, description:"世界上最流行的编程语言之一，简洁易学，应用广泛。", keywords:["python","编程语言","解释器"] },
        { id:"docker", name:"Docker Desktop", nameCN:"Docker 桌面版", pinyin:"docker", category:"dev", icon:"🐳", platforms:["Windows","macOS","Linux"], officialSite:"https://www.docker.com/products/docker-desktop/", downloadPage:"https://www.docker.com/products/docker-desktop/", isFree:true, description:"容器化平台，让应用在任何环境中一致运行。", keywords:["docker","容器","container","虚拟化"] },
        { id:"jetbrains-toolbox", name:"JetBrains Toolbox", nameCN:"JetBrains 工具箱", pinyin:"jetbrains", category:"dev", icon:"⚡", platforms:["Windows","macOS","Linux"], officialSite:"https://www.jetbrains.com/toolbox-app/", downloadPage:"https://www.jetbrains.com/toolbox-app/download", isFree:true, description:"统一管理 JetBrains 全系列 IDE 的启动器和更新工具。", keywords:["jetbrains","idea","pycharm","webstorm","clion"] },
        { id:"postman", name:"Postman", nameCN:"Postman API 工具", pinyin:"postman", category:"dev", icon:"📮", platforms:["Windows","macOS","Linux"], officialSite:"https://www.postman.com/", downloadPage:"https://www.postman.com/downloads/", isFree:true, description:"API 开发和测试的必备工具，支持团队协作。", keywords:["postman","api","接口测试","http"] },
    
        // ── 设计创意 ──
        { id:"figma", name:"Figma", nameCN:"Figma 设计工具", pinyin:"figma", category:"design", icon:"🎨", platforms:["Windows","macOS","Linux"], officialSite:"https://www.figma.com/", downloadPage:"https://www.figma.com/downloads/", isFree:true, description:"基于云端的专业 UI/UX 设计和原型工具，支持实时协作。", keywords:["figma","ui设计","ux","原型","界面设计"] },
        { id:"adobe-cc", name:"Adobe Creative Cloud", nameCN:"Adobe 创意云", pinyin:"adobe", category:"design", icon:"🎬", platforms:["Windows","macOS"], officialSite:"https://www.adobe.com/cn/creativecloud.html", downloadPage:"https://www.adobe.com/cn/creativecloud/plans.html", isFree:false, description:"包含 Photoshop、Illustrator、Premiere Pro 等专业创意软件全家桶。", keywords:["adobe","photoshop","ps","illustrator","ai","premiere","pr","ae"] },
        { id:"canva", name:"Canva 可画", nameCN:"Canva 可画", pinyin:"canva", category:"design", icon:"✨", platforms:["Windows","macOS","iOS","Android"], officialSite:"https://www.canva.cn/", downloadPage:"https://www.canva.cn/download", isFree:true, description:"在线平面设计平台，海量模板让设计变得简单。", keywords:["canva","可画","在线设计","海报","模板"] },
        { id:"blender", name:"Blender", nameCN:"Blender 三维创作", pinyin:"blender", category:"design", icon:"🧊", platforms:["Windows","macOS","Linux"], officialSite:"https://www.blender.org/", downloadPage:"https://www.blender.org/download/", isFree:true, description:"开源免费的全能三维创作套件：建模、动画、渲染、剪辑全覆盖。", keywords:["blender","3d","建模","动画","渲染"] },
    
        // ── 影音娱乐 ──
        { id:"vlc", name:"VLC media player", nameCN:"VLC 播放器", pinyin:"vlc", category:"media", icon:"🎵", platforms:["Windows","macOS","Linux","iOS","Android"], officialSite:"https://www.videolan.org/vlc/", downloadPage:"https://www.videolan.org/vlc/#download", isFree:true, description:"开源万能播放器，几乎支持所有音视频格式。", keywords:["vlc","播放器","视频播放","音频播放"] },
        { id:"potplayer", name:"PotPlayer", nameCN:"PotPlayer 播放器", pinyin:"potplayer", category:"media", icon:"▶️", platforms:["Windows"], officialSite:"https://potplayer.daum.net/", downloadPage:"https://potplayer.daum.net/?lang=zh_CN", isFree:true, description:"韩国 Daum 出品的高性能视频播放器，硬件加速强大。", keywords:["potplayer","播放器","视频"] },
        { id:"foobar2000", name:"foobar2000", nameCN:"foobar2000 音频播放器", pinyin:"foobar", category:"media", icon:"🎶", platforms:["Windows"], officialSite:"https://www.foobar2000.org/", downloadPage:"https://www.foobar2000.org/download", isFree:true, description:"Windows 平台高级音频播放器，音质发烧友首选。", keywords:["foobar2000","音乐播放器","无损","hi-fi"] },
        { id:"audacity", name:"Audacity", nameCN:"Audacity 音频编辑", pinyin:"audacity", category:"media", icon:"🎙️", platforms:["Windows","macOS","Linux"], officialSite:"https://www.audacityteam.org/", downloadPage:"https://www.audacityteam.org/download/", isFree:true, description:"开源免费的多轨音频录制和编辑软件。", keywords:["audacity","录音","音频编辑","混音"] },
        { id:"handbrake", name:"HandBrake", nameCN:"HandBrake 视频转码", pinyin:"handbrake", category:"media", icon:"🔄", platforms:["Windows","macOS","Linux"], officialSite:"https://handbrake.fr/", downloadPage:"https://handbrake.fr/downloads.php", isFree:true, description:"开源视频转码工具，支持几乎所有视频格式的转换。", keywords:["handbrake","转码","视频转换","压缩"] },
        { id:"mpv", name: "mpv player", nameCN: "mpv 播放器", pinyin: "mpv", category: "media", icon: "🎞️", platforms: ["Windows", "macOS", "Linux"], officialSite: "https://mpv.io/", downloadPage: "https://mpv.io/installation/", isFree: true, description: "轻量级开源媒体播放器，极简但功能强大，可高度定制。", keywords: ["mpv", "播放器", "轻量", "开源"] },
        { id: "OBS", name: "OBS Studio", nameCN: "OBS 直播推流", pinyin: "obs", category: "media", icon: "📹", platforms: ["Windows", "macOS", "Linux"], officialSite: "https://obsproject.com/", downloadPage: "https://obsproject.com/download", isFree: true, description: "免费开源的屏幕录制和直播推流软件。", keywords: ["obs", "直播", "录屏", "推流", "streaming"] },
    
        // ── 安全防护 ──
        { id:"defender", name:"Microsoft Defender", nameCN:"Windows 安全中心", pinyin:"defender", category:"security", icon:"🛡️", platforms:["Windows"], officialSite:"https://www.microsoft.com/zh-cn/security/windows-defender", downloadPage:"https://www.microsoft.com/zh-cn/security/windows-defender", isFree:true, description:"Windows 系统内置安全防护，提供实时病毒检测和威胁防护。", keywords:["defender","杀毒","安全","windows安全"] },
        { id:"malwarebytes", name:"Malwarebytes", nameCN:"Malwarebytes 扫描工具", pinyin:"malwarebytes", category:"security", icon:"🔒", platforms:["Windows","macOS","Android"], officialSite:"https://www.malwarebytes.com/", downloadPage:"https://www.malwarebytes.com/downloads/", isFree:true, description:"专业的恶意软件扫描和清除工具，可与其他杀毒软件共存。", keywords:["malwarebytes","恶意软件","查杀","清理"] },
        { id:"bitwarden", name:"Bitwarden", nameCN:"Bitwarden 密码管理", pinyin:"bitwarden", category:"security", icon:"🔐", platforms:["Windows","macOS","Linux","iOS","Android"], officialSite:"https://bitwarden.com/", downloadPage:"https://bitwarden.com/download/", isFree:true, description:"开源密码管理器，安全存储和管理所有账号密码。", keywords:["bitwarden","密码管理","password","开源"] },
        { id:"veracrypt", name:"VeraCrypt", nameCN:"VeraCrypt 加密工具", pinyin:"veracrypt", category:"security", icon:"🗄️", platforms:["Windows","macOS","Linux"], officialSite:"https://www.veracrypt.fr/", downloadPage:"https://www.veracrypt.fr/en/Downloads.html", isFree:true, description:"开源磁盘加密软件，为文件和分区提供军事级加密保护。", keywords:["veracrypt","加密","磁盘加密","truecrypt"] },
    
        // ── 通讯社交 ──
        { id:"wechat", name:"微信 WeChat", nameCN:"微信", pinyin:"wx", category:"communication", icon:"💬", platforms:["Windows","macOS","iOS","Android"], officialSite:"https://weixin.qq.com/", downloadPage:"https://weixin.qq.com/#download", isFree:true, description:"腾讯出品的国民级即时通讯应用，超过 13 亿用户。", keywords:["微信","wechat","聊天","社交"] },
        { id:"qq", name:"QQ", nameCN:"QQ", pinyin:"qq", category:"communication", icon:"🐧", platforms:["Windows","macOS","iOS","Android"], officialSite:"https://im.qq.com/", downloadPage:"https://im.qq.com/pcqq/index", isFree:true, description:"腾讯 QQ，中国最大的即时通讯平台之一。", keywords:["qq","腾讯qq","聊天"] },
        { id:"telegram", name:"Telegram", nameCN:"Telegram 电报", pinyin:"telegram", category:"communication", icon:"✈️", platforms:["Windows","macOS","Linux","iOS","Android"], officialSite:"https://telegram.org/", downloadPage:"https://desktop.telegram.org/", isFree:true, description:"注重隐私安全的跨平台即时通讯工具，端到端加密。", keywords:["telegram","电报","加密通讯","隐私"] },
        { id:"discord", name:"Discord", nameCN:"Discord", pinyin:"discord", category:"communication", icon:"🎮", platforms:["Windows","macOS","Linux","iOS","Android"], officialSite:"https://discord.com/", downloadPage:"https://discord.com/download", isFree:true, description:"游戏社区和语音聊天平台，也广泛用于各类社群交流。", keywords:["discord","语音聊天","游戏社区","群组"] },
        { id:"slack", name:"Slack", nameCN:"Slack 团队协作", pinyin:"slack", category:"communication", icon:"💼", platforms:["Windows","macOS","Linux","iOS","Android"], officialSite:"https://slack.com/intl/zh-cn/", downloadPage:"https://slack.com/downloads", isFree:true, description:"企业级团队沟通协作平台，频道化组织高效沟通。", keywords:["slack","团队协作","企业通讯"] },
        { id:"zoom", name:"Zoom", nameCN:"Zoom 视频会议", pinyin:"zoom", category:"communication", icon:"📹", platforms:["Windows","macOS","Linux","iOS","Android"], officialSite:"https://zoom.us/", downloadPage:"https://zoom.us/download", isFree:true, description:"高清视频会议和网络研讨会平台。", keywords:["zoom","视频会议","远程会议","网课"] },
        { id:"feishu", name:"飞书 Lark", nameCN:"飞书", pinyin:"feishu", category:"communication", icon:"🚀", platforms:["Windows","macOS","iOS","Android"], officialSite:"https://www.feishu.cn/", downloadPage:"https://www.feishu.cn/download", isFree:true, description:"字节跳动出品的企业协作平台，整合 IM、日历、文档、会议等。", keywords:["飞书","lark","字节跳动","企业协作"] },
    
        // ── 系统工具 ──
        { id:"7zip", name:"7-Zip", nameCN:"7-Zip 压缩工具", pinyin:"7z", category:"system", icon:"📦", platforms:["Windows","Linux"], officialSite:"https://www.7-zip.org/", downloadPage:"https://www.7-zip.org/download.html", isFree:true, description:"开源免费的高压缩比文件压缩/解压工具。", keywords:["7zip","压缩","解压","rar","zip"] },
        { id:"everything", name:"Everything", nameCN:"Everything 文件搜索", pinyin:"everything", category:"system", icon:"🔍", platforms:["Windows"], officialSite:"https://www.voidtools.com/", downloadPage:"https://www.voidtools.com/downloads/", isFree:true, description:"基于 NTFS 索引的极速文件搜索工具，秒搜全盘文件。", keywords:["everything","文件搜索","搜索工具","快速搜索"] },
        { id:"snipaste", name:"Snipaste", nameCN:"Snipaste 截图工具", pinyin:"snipaste", category:"system", icon:"✂️", platforms:["Windows"], officialSite:"https://www.snipaste.com/", downloadPage:"https://www.snipaste.com/download.html", isFree:true, description:"强大的截图 + 贴图工具，支持截图后悬浮在桌面上参考。", keywords:["snipaste","截图","贴图","取色"] },
        { id:"rufus", name:"Rufus", nameCN:"Rufus 启动盘制作", pinyin:"rufus", category:"system", icon:"💿", platforms:["Windows"], officialSite:"https://rufus.ie/", downloadPage:"https://rufus.ie/zh-CN/", isFree:true, description:"快速制作 USB 启动盘的工具，用于安装或运行操作系统。", keywords:["rufus","u盘启动","系统安装","usb"] },
        { id:"cpu-z", name:"CPU-Z", nameCN:"CPU-Z 硬件信息", pinyin:"cpuz", category:"system", icon:"🖥️", platforms:["Windows","Android"], officialSite:"https://www.cpuid.com/softwares/cpu-z.html", downloadPage:"https://www.cpuid.com/softwares/cpu-z.html", isFree:true, description:"查看 CPU、主板、内存详细信息的硬件检测工具。", keywords:["cpu-z","硬件信息","cpu","检测"] },
        { id:"powertoys", name:"Microsoft PowerToys", nameCN:"PowerToys 微软增强工具", pinyin:"powertoys", category:"system", icon:"⚙️", platforms:["Windows"], officialSite:"https://learn.microsoft.com/zh-cn/power-toys/", downloadPage:"https://learn.microsoft.com/zh-cn/power-toys/download", isFree:true, description:"微软官方 Windows 系统增强工具集：窗口管理、批量重命名、颜色拾取等。", keywords:["powertoys","微软","windows增强","fancyzones","run"] },
        { id:"wiztree", name:"WizTree", nameCN:"WizTree 磁盘分析", pinyin:"wiztree", category:"system", icon:"📁", platforms:["Windows"], officialSite:"https://diskanalyzer.com/", downloadPage:"https://diskanalyzer.com/download.html", isFree:true, description:"极速磁盘空间分析工具，快速找出占用大空间的文件和文件夹。", keywords:["wiztree","磁盘空间","大文件","清理"] },
    
        // ── 效率工具 ──
        { id:"listary", name:"Listary", nameCN:"Listary 文件搜索", pinyin:"listary", category:"utility", icon:"⚡", platforms:["Windows"], officialSite:"https://www.listary.com/", downloadPage:"https://www.listary.com/download", isFree:false, description:"全局文件快速启动和搜索神器，双击 Ctrl 即刻召唤。", keywords:["listary","文件搜索","快速启动","效率"] },
        { id:"ditto", name:"Ditto", nameCN:"Ditto 剪贴板管理", pinyin:"ditto", category:"utility", icon:"📋", platforms:["Windows"], officialSite:"https://ditto-cp.sourceforge.io/", downloadPage:"https://ditto-cp.sourceforge.io/", isFree:true, description:"开源剪贴板历史管理工具，保存所有复制内容随时调用。", keywords:["ditto","剪贴板","clipboard","复制粘贴"] },
        { id:"autohotkey", name:"AutoHotkey", nameCN:"AutoHotkey 自动化脚本", pinyin:"ahk", category:"utility", icon:"🤖", platforms:["Windows"], officialSite:"https://www.autohotkey.com/", downloadPage:"https://www.autohotkey.com/download", isFree:true, description:"Windows 自动化脚本语言，通过快捷键和脚本实现各种自动化操作。", keywords:["autohotkey","ahk","自动化","快捷键","脚本"] },
        { id:"sharex", name:"ShareX", nameCN:"ShareX 截图录屏", pinyin:"sharex", category:"utility", icon:"📸", platforms:["Windows"], officialSite:"https://getsharex.com/", downloadPage:"https://getsharex.com/downloads/", isFree:true, description:"全功能截图、录屏、GIF 制作和文件分享工具。", keywords:["sharex","截图","录屏","gif","分享"] },
        { id:"calibre", name:"Calibre", nameCN:"Calibre 电子书管理", pinyin:"calibre", category:"utility", icon:"📚", platforms:["Windows","macOS","Linux"], officialSite:"https://calibre-ebook.com/", downloadPage:"https://calibre-ebook.com/download", isFree:true, description:"开源电子书管理一站式解决方案：阅读、转换、编辑、同步。", keywords:["calibre","电子书","ebook","epub","kindle"] }
      ];
    
      // ========== 分类配置 ==========
      const CATEGORIES = [
        { key:'all', label:'全部', emoji:'🏠' },
        { key:'browser', label:'浏览器', emoji:'🌐' },
        { key:'office', label:'办公', emoji:'📝' },
        { key:'dev', label:'开发工具', emoji:'💻' },
        { key:'design', label:'设计创意', emoji:'🎨' },
        { key:'media', label:'影音娱乐', emoji:'🎵' },
        { key:'security', label:'安全防护', emoji:'🛡️' },
        { key:'communication', label:'通讯社交', emoji:'💬' },
        { key:'system', label:'系统工具', emoji:'⚙️' },
        { key:'utility', label:'效率工具', emoji:'⚡' }
      ];
    
      // ========== 样式注入 ==========
      const STYLE_ID = 'osn-styles';
      if (!document.getElementById(STYLE_ID)) {
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
          /* ===== 容器与遮罩 ===== */
          #osn-overlay {
            position: fixed; inset: 0; z-index: 2147483647;
            background: rgba(15,23,42,.55);
            backdrop-filter: blur(4px);
            display: flex; align-items: center; justify-content: center;
            animation: osn-fadeIn .25s ease;
            font-family: -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;
          }
          @keyframes osn-fadeIn{from{opacity:0}to{opacity:1}}
          @keyframes osn-slideUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
    
          /* ===== 主面板 ===== */
          #osn-panel {
            width: 460px; max-height: 80vh;
            background: #fff; border-radius: 16px;
            box-shadow: 0 24px 80px rgba(0,0,0,.28);
            display: flex; flex-direction: column;
            overflow: hidden;
            animation: osn-slideUp .3s ease;
          }
    
          /* ===== 头部 ===== */
          .osn-header {
            background: linear-gradient(135deg,#2563eb,#7c3aed);
            color: #fff; padding: 18px 20px 14px;
            text-align: center; position: relative;
          }
          .osn-header h1 { font-size: 18px; font-weight: 700; margin: 0; letter-spacing:.5px; }
          .osn-header p { font-size: 11.5px; opacity:.85; margin-top: 4px; }
          .osn-close-btn {
            position:absolute; top:10px; right:14px;
            background:none; border:none; color:#fff; opacity:.75;
            font-size:22px; cursor:pointer; line-height:1; padding:0 3px;
            transition: opacity .2s;
          }
          .osn-close-btn:hover { opacity:1; }
    
          /* ===== 搜索框 ===== */
          .osn-search-wrap { padding: 12px 16px 8px; position:relative; }
          .osn-search-input {
            width:100%; padding:10px 38px 10px 36px;
            border:2px solid #e2e8f0; border-radius:11px;
            font-size:13.5px; outline:none; transition:all .25s ease;
            color:#334155; box-sizing:border-box;
          }
          .osn-search-input:focus { border-color:#3b82f6; box-shadow:0 0 0 3px rgba(59,130,246,.15); }
          .osn-search-input::placeholder { color:#94a3b8; }
          .osn-search-icon { position:absolute; left:26px; top:50%; transform:translateY(-52%); pointer-events:none; font-size:15px; }
          .osn-clear-btn {
            position:absolute; right:20px; top:50%; transform:translateY(-52%);
            background:none; border:none; font-size:22px; color:#94a3b8;
            cursor:pointer; line-height:1; padding:0 2px; display:none;
          }
          .osn-clear-btn:hover { color:#ef4444; }
          .osn-clear-btn.visible { display:block; }
    
          /* ===== 分类标签 ===== */
          .osn-cats { display:flex; flex-wrap:wrap; gap:5px; padding:6px 16px 10px; border-bottom:1px solid #e2e8f0; }
          .osn-cat-btn {
            padding:5px 12px; border:1.5px solid #e2e8f0; border-radius:20px;
            background:#fff; color:#64748b; font-size:11.5px; cursor:pointer;
            transition:all .2s ease; white-space:nowrap; font-weight:500;
          }
          .osn-cat-btn:hover { border-color:#93c5fd; color:#2563eb; background:#eff6ff; }
          .osn-cat-btn.active {
            background:linear-gradient(135deg,#2563eb,#7c3aed); color:#fff;
            border-color:transparent; box-shadow:0 2px 8px rgba(37,99,235,.3);
          }
    
          /* ===== 软件列表 ===== */
          .osn-list { flex:1; overflow-y:auto; padding:10px 16px; display:flex; flex-direction:column; gap:6px; min-height:100px; max-height:42vh;}
          .osn-list::-webkit-scrollbar { width:5px; }
          .osn-list::-webkit-scrollbar-track { background:transparent; }
          .osn-list::-webkit-scrollbar-thumb { background:#cbd5e1; border-radius:3px; }
    
          .osn-card {
            display:flex; align-items:center; gap:12px;
            padding:11px 13px; background:#fff; border-radius:11px;
            border:1px solid #e2e8f0; cursor:pointer;
            transition:all .2s ease;
          }
          .osn-card:hover { border-color:#93c5fd; box-shadow:0 2px 12px rgba(59,130,246,.1); transform:translateY(-1px); }
          .osn-card-icon { font-size:30px; width:42px; height:42px; display:flex; align-items:center; justify-content:center; background:#f1f5f9; border-radius:10px; flex-shrink:0; }
          .osn-card-info { flex:1; min-width:0; }
          .osn-card-name { font-size:14px; font-weight:600; color:#1e293b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
          .osn-card-name-en { font-size:11px; color:#94a3b8; }
          .osn-card-desc { font-size:11.5px; color:#64748b; margin-top:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
          .osn-card-meta { display:flex; align-items:center; gap:6px; margin-top:5px; flex-wrap:wrap; }
          .osn-tag-plat { font-size:10px; padding:2px 7px; border-radius:5px; background:#f0fdf4; color:#16a34a; font-weight:500; }
          .osn-tag-free { font-size:10px; padding:2px 7px; border-radius:5px; background:#eff6ff; color:#2563eb; font-weight:500; }
          .osn-tag-paid { font-size:10px; padding:2px 7px; border-radius:5px; background:#fefce8; color:#ca8a04; font-weight:500; }
          .osn-arrow { color:#cbd5e1; font-size:17px; flex-shrink:0; transition:color .2s; }
          .osn-card:hover .osn-arrow { color:#3b82f6; }
    
          /* ===== 空状态（含搜索/推荐按钮） ===== */
          .osn-empty { text-align:center; padding:30px 20px 20px; color:#94a3b8; }
          .osn-empty p:first-child { font-size:17px; margin-bottom:6px; }
          .osn-empty-hint { font-size:12px !important; margin-bottom:16px; }
          .osn-empty-actions { display:flex; gap:10px; justify-content:center; flex-wrap:wrap; }
          .osn-action-btn {
            padding:9px 18px; border-radius:10px; font-size:12.5px;
            font-weight:600; cursor:pointer; border:none; transition:all .2s ease;
            display:inline-flex; align-items:center; gap:6px;
          }
          .osn-btn-search-online {
            background:linear-gradient(135deg,#2563eb,#7c3aed); color:#fff;
            box-shadow:0 2px 8px rgba(37,99,235,.25);
          }
          .osn-btn-search-online:hover { box-shadow:0 4px 14px rgba(37,99,235,.4); transform:translateY(-1px); }
          .osn-btn-suggest {
            background:#f1f5f9; color:#475569; border:1.5px solid #e2e8f0;
          }
          .osn-btn-suggest:hover { background:#e2e8f0; }
    
          /* ===== 推荐添加表单 ===== */
          .osn-form-card {
            background:#fff; border-radius:11px; border:1px solid #e2e8f0;
            padding:16px; margin-top:6px;
          }
          .osn-form-title { font-size:14px; font-weight:700; color:#1e293b; margin-bottom:12px; text-align:center; }
          .osn-form-field { margin-bottom:10px; }
          .osn-form-label { display:block; font-size:11.5px; font-weight:600; color:#475569; margin-bottom:4px; }
          .osn-form-input, .osn-form-select, .osn-form-textarea {
            width:100%; padding:8px 11px; border:1.5px solid #e2e8f0; border-radius:8px;
            font-size:12.5px; outline:none; transition:border-color .2s; box-sizing:border-box;
            color:#334155; font-family:inherit;
          }
          .osn-form-input:focus, .osn-form-select:focus, .osn-form-textarea:focus { border-color:#3b82f6; box-shadow:0 0 0 3px rgba(59,130,246,.12); }
          .osn-form-textarea { resize:vertical; min-height:50px; }
          .osn-form-row { display:flex; gap:8px; }
          .osn-form-row > * { flex:1; }
          .osn-form-submit {
            width:100%; padding:9px; border:none; border-radius:9px;
            background:linear-gradient(135deg,#16a34a,#15803d); color:#fff;
            font-size:13px; font-weight:600; cursor:pointer;
            box-shadow:0 2px 8px rgba(22,163,74,.25);
            transition:all .2s ease; margin-top:4px;
          }
          .osn-form-submit:hover { box-shadow:0 4px 14px rgba(22,163,74,.4); transform:translateY(-1px); }
          .osn-form-cancel {
            width:100%; padding:7px; border:1.5px solid #e2e8f0; border-radius:9px;
            background:#fff; color:#64748b; font-size:12px; font-weight:600;
            cursor:pointer; margin-top:6px; transition:background .2s;
          }
          .osn-form-cancel:hover { background:#f8fafc; }
          .osn-toast {
            position:absolute; top:-40px; left:50%; transform:translateX(-50%);
            background:#16a34a; color:#fff; padding:7px 16px; border-radius:8px;
            font-size:12px; font-weight:600; white-space:nowrap;
            animation:osn-slideDown .3s ease; z-index:200;
          }
          @keyframes osn-slideDown{from{opacity:0;transform:translateX(-50%) translateY(-8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
          .osn-pending-list { margin-top:10px; max-height:120px; overflow-y:auto; }
          .osn-pending-item {
            display:flex; align-items:center; justify-content:space-between;
            padding:6px 10px; background:#f8fafc; border-radius:6px; margin-bottom:4px;
            font-size:11.5px; color:#475569;
          }
          .osn-pending-item span:first-child { font-weight:600; color:#1e293b; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:180px; }
          .osn-pending-del { background:none; border:none; color:#ef4444; cursor:pointer; font-size:15px; line-height:1; }
    
          /* ===== 底部 ===== */
          .osn-footer {
            display:flex; justify-content:space-between; align-items:center;
            padding:11px 16px; border-top:1px solid #e2e8f0; background:#f8fafc;
          }
          .osn-badge { font-size:11.5px; padding:4px 10px; border-radius:20px; font-weight:600; background:#f0fdf4; color:#16a34a; }
          .osn-count { font-size:11.5px; color:#94a3b8; }
    
          /* ===== 安全提示弹窗 ===== */
          .osn-modal-mask {
            position:absolute; inset:0; z-index:100;
            background:rgba(15,23,42,.55); backdrop-filter:blur(3px);
            display:flex; align-items:center; justify-content:center;
            border-radius:16px; animation:osn-fadeIn .2s ease;
          }
          .osn-modal {
            background:#fff; border-radius:14px; width:340px;
            box-shadow:0 20px 60px rgba(0,0,0,.2);
            animation:osn-slideUp .25s ease;
          }
          .osn-modal-header { display:flex; justify-content:space-between; align-items:center; padding:16px 18px 12px; border-bottom:1px solid #e2e8f0; }
          .osn-modal-header h3 { font-size:15px; font-weight:700; color:#1e293b; margin:0; }
          .osn-mclose { background:none; border:none; font-size:22px; color:#94a3b8; cursor:pointer; line-height:1; }
          .osn-mclose:hover { color:#ef4444; }
          .osn-modal-body { padding:14px 18px; }
          .osn-sw-name { font-size:17px; font-weight:700; color:#1e293b; margin-bottom:8px; }
          .osn-sw-label { font-size:12px; color:#64748b; margin-bottom:4px; }
          .osn-sw-url {
            display:inline-block; word-break:break-all; color:#2563eb;
            font-size:12.5px; font-weight:600; text-decoration:none;
            border-bottom:1px dashed #93c5fd; padding:7px 11px;
            background:#eff6ff; border-radius:7px; margin-bottom:12px;
          }
          .osn-tips { background:#fefce8; border-radius:8px; padding:11px 13px; border-left:3px solid #eab308; }
          .osn-tips p { font-size:12px; font-weight:600; color:#854d0e; margin-bottom:5px; }
          .osn-tips ul { list-style:none; padding:0; margin:0; }
          .osn-tips li { font-size:11.5px; color:#a16207; padding:2px 0; padding-left:16px; position:relative; }
          .osn-tips li::before { content:"•"; position:absolute; left:4px; font-weight:bold; }
          .osn-modal-footer { display:flex; justify-content:flex-end; gap:8px; padding:12px 18px 16px; }
          .osn-btn { padding:8px 18px; border-radius:9px; font-size:12.5px; font-weight:600; cursor:pointer; border:none; transition:all .2s ease; }
          .osn-btn-sec { background:#f1f5f9; color:#475569; }
          .osn-btn-sec:hover { background:#e2e8f0; }
          .osn-btn-pri { background:linear-gradient(135deg,#2563eb,#7c3aed); color:#fff; box-shadow:0 2px 8px rgba(37,99,235,.3); }
          .osn-btn-pri:hover { box-shadow:0 4px 14px rgba(37,99,235,.4); transform:translateY(-1px); }
    
          /* ===== 悬浮触发按钮 ===== */
          #osn-trigger {
            position:fixed; right:20px; bottom:20px; z-index:2147483646;
            width:54px; height:54px; border-radius:50%;
            background:linear-gradient(135deg,#2563eb,#7c3aed);
            color:#fff; border:none; cursor:pointer;
            display:flex; align-items:center; justify-content:center;
            font-size:26px; box-shadow:0 4px 20px rgba(37,99,235,.4);
            transition:transform .2s,box-shadow .2s;
            animation:osn-bounceIn .5s ease;
          }
          @keyframes osn-bounceIn{
            0%{transform:scale(0);opacity:0}
            60%{transform:scale(1.15)}
            100%{transform:scale(1);opacity:1}
          }
          #osn-trigger:hover { transform:scale(1.08); box-shadow:0 6px 28px rgba(37,99,235,.5); }
          #osn-trigger:active { transform:scale(.95); }
        `;
        document.head.appendChild(style);
      }
    
      // ========== 移除已有实例 ==========
      const existingOverlay = document.getElementById('osn-overlay');
      const existingTrigger = document.getElementById('osn-trigger');
      if (existingOverlay) existingOverlay.remove();
      if (existingTrigger) existingTrigger.remove();
    
      // ========== 创建 DOM 结构 ==========
      // 遮罩 + 主面板
      const overlay = document.createElement('div');
      overlay.id = 'osn-overlay';
      overlay.innerHTML = `
        <div id="osn-panel">
          <!-- 头部 -->
          <div class="osn-header">
            <button class="osn-close-btn" id="osn-close">×</button>
            <h1>🛡️ 正版软件官网导航</h1>
            <p>一键直达官方网站 · 安全下载正版软件</p>
          </div>
    
          <!-- 搜索框 -->
          <div class="osn-search-wrap">
            <span class="osn-search-icon">🔍</span>
            <input class="osn-search-input" id="osn-search" placeholder="搜索软件名称（中文 / 英文 / 拼音）..." autocomplete="off">
            <button class="osn-clear-btn" id="osn-clear">×</button>
          </div>
    
          <!-- 分类 -->
          <nav class="osn-cats" id="osn-cats"></nav>
    
          <!-- 列表 -->
          <main class="osn-list" id="osn-list"></main>
    
          <!-- 底部 -->
          <footer class="osn-footer">
            <span class="osn-badge">✅ 已核验官网</span>
            <span class="osn-count" id="osn-count"></span>
          </footer>
        </div>
      `;
      document.body.appendChild(overlay);
    
      // 悬浮触发按钮
      const trigger = document.createElement('button');
      trigger.id = 'osn-trigger';
      trigger.title = '打开正版软件导航';
      trigger.innerHTML = '🛡️';
      trigger.addEventListener('click', () => {
        overlay.style.display = 'flex';
      });
      document.body.appendChild(trigger);
    
      // ========== DOM 引用 ==========
      const searchInput = document.getElementById('osn-search');
      const clearBtn = document.getElementById('osn-clear');
      const catsNav = document.getElementById('osn-cats');
      const listEl = document.getElementById('osn-list');
      const countEl = document.getElementById('osn-count');
      const closeBtn = document.getElementById('osn-close');
    
      let currentCat = 'all';
    
      // ========== 渲染分类标签 ==========
      catsNav.innerHTML = CATEGORIES.map(c =>
        `<button class="osn-cat-btn${c.key === 'all' ? ' active' : ''}" data-cat="${c.key}">${c.emoji} ${c.label}</button>`
      ).join('');
    
      // ========== 过滤逻辑 ==========
      function filterData() {
        const q = searchInput.value.trim().toLowerCase();
        let data = SOFTWARE_DB;
        if (currentCat !== 'all') data = data.filter(d => d.category === currentCat);
        if (q) {
          data = data.filter(d =>
            d.name.toLowerCase().includes(q) ||
            (d.nameCN || '').toLowerCase().includes(q) ||
            (d.pinyin || '').toLowerCase().includes(q) ||
            (d.keywords || []).some(k => k.toLowerCase().includes(q))
          );
        }
        return data;
      }
    
      // ========== 渲染列表 ==========
      function renderList() {
        const data = filterData();
        countEl.textContent = `共 ${data.length} 款软件`;
    
        if (data.length === 0) {
          const q = searchInput.value.trim();
          listEl.innerHTML = `
            <div class="osn-empty">
              <p>😕 没有找到匹配的软件</p>
              <p class="osn-empty-hint">"${q || '当前分类'}" 在本地数据库中暂无收录</p>
              <div class="osn-empty-actions">
                <button class="osn-action-btn osn-btn-search-online" id="osn-search-online">
                  🔍 联网搜索官网
                </button>
                <button class="osn-action-btn osn-btn-suggest" id="osn-suggest-add">
                  📝 推荐添加此软件
                </button>
              </div>
            </div>
          `;
          // 绑定按钮事件
          document.getElementById('osn-search-online').addEventListener('click', () => openOnlineSearch(q));
          document.getElementById('osn-suggest-add').addEventListener('click', () => showSuggestForm(q));
          return;
        }
    
        listEl.innerHTML = data.map(item => `
          <div class="osn-card" data-name="${item.name}" data-url="${item.downloadPage || item.officialSite}">
            <div class="osn-card-icon">${item.icon}</div>
            <div class="osn-card-info">
              <div class="osn-card-name">${item.name}${item.nameCN ? ` <span class="osn-card-name-en">· ${item.nameCN}</span>` : ''}</div>
              <div class="osn-card-desc">${item.description}</div>
              <div class="osn-card-meta">
                ${item.platforms.map(p => `<span class="osn-tag-plat">${p}</span>`).join('')}
                ${item.isFree ? '<span class="osn-tag-free">免费</span>' : '<span class="osn-tag-paid">付费</span>'}
              </div>
            </div>
            <span class="osn-arrow">→</span>
          </div>
        `).join('');
    
        // 绑定卡片点击 → 弹出安全确认
        listEl.querySelectorAll('.osn-card').forEach(card => {
          card.addEventListener('click', () => showConfirmModal(card.dataset.name, card.dataset.url));
        });
      }
    
      // ========== 安全确认弹窗 ==========
      function showConfirmModal(name, url) {
        const mask = document.createElement('div');
        mask.className = 'osn-modal-mask';
        mask.innerHTML = `
          <div class="osn-modal">
            <div class="osn-modal-header">
              <h3>🔗 前往官方网站</h3>
              <button class="osn-mclose">×</button>
            </div>
            <div class="osn-modal-body">
              <div class="osn-sw-name">${name}</div>
              <p class="osn-sw-label">即将跳转到以下官方网址：</p>
              <a class="osn-sw-url" href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>
              <div class="osn-tips">
                <p>⚠️ 安全提示：</p>
                <ul>
                  <li>请确认域名与官方一致</li>
                  <li>不要在第三方页面下载安装包</li>
                  <li>警惕捆绑软件和广告链接</li>
                </ul>
              </div>
            </div>
            <div class="osn-modal-footer">
              <button class="osn-btn osn-btn-sec">取消</button>
              <button class="osn-btn osn-btn-pri">确认前往官网</button>
            </div>
          </div>
        `;
    
        document.getElementById('osn-panel').appendChild(mask);
    
        // 关闭/取消
        const closeModal = () => mask.remove();
        mask.querySelector('.osn-mclose').addEventListener('click', closeModal);
        mask.querySelector('.osn-btn-sec').addEventListener('click', closeModal);
        mask.querySelector('.osn-btn-pri').addEventListener('click', () => {
          window.open(url, '_blank', 'noopener,noreferrer');
          closeModal();
        });
        mask.addEventListener('click', e => { if (e.target === mask) closeModal(); });
      }
    
      // ========== 联网搜索官网（本地没找到时） ==========
      let currentQuery = '';
      function openOnlineSearch(query) {
        currentQuery = query || searchInput.value.trim();
        if (!currentQuery) return;
        // 用多个搜索引擎同时搜索，优先找官方网站
        const searchUrl = 'https://www.google.com/search?q=' + encodeURIComponent(currentQuery + ' 官方网站 下载 site:.com OR site:.cn OR site:.org');
        window.open(searchUrl, '_blank', 'noopener,noreferrer');
      }
    
      // ========== 推荐添加新软件（保存到 localStorage） ==========
      const STORAGE_KEY = 'osn_pending_suggestions';
    
      function getPendingSuggestions() {
        try {
          return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        } catch { return []; }
      }
    
      function saveSuggestion(suggestion) {
        const list = getPendingSuggestions();
        suggestion.id = Date.now();
        suggestion.submittedAt = new Date().toLocaleString('zh-CN');
        list.unshift(suggestion);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
        showToast('✅ 推荐已保存！感谢你的贡献 🎉');
      }
    
      function deleteSuggestion(id) {
        let list = getPendingSuggestions();
        list = list.filter(s => s.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
        renderPendingList();
      }
    
      function renderPendingList() {
        const container = document.getElementById('osn-pending-list');
        if (!container) return;
        const list = getPendingSuggestions();
        if (list.length === 0) {
          container.innerHTML = '<p style="text-align:center;color:#94a3b8;font-size:11.5px;padding:8px 0;">暂无推荐记录</p>';
          return;
        }
        container.innerHTML = list.map(s => `
          <div class="osn-pending-item">
            <span title="${s.name}">${s.icon || '📦'} ${s.name}</span>
            <button class="osn-pending-del" data-id="${s.id}" title="删除">✕</button>
          </div>
        `).join('');
        container.querySelectorAll('.osn-pending-del').forEach(btn => {
          btn.addEventListener('click', () => deleteSuggestion(parseInt(btn.dataset.id)));
        });
      }
    
      function showToast(msg) {
        // 移除已有 toast
        const existing = document.querySelector('.osn-toast');
        if (existing) existing.remove();
        const toast = document.createElement('div');
        toast.className = 'osn-toast';
        toast.textContent = msg;
        const panel = document.getElementById('osn-panel');
        panel.style.position = 'relative';
        panel.appendChild(toast);
        setTimeout(() => toast.remove(), 2500);
      }
    
      function showSuggestForm(preFillName) {
        const q = preFillName || searchInput.value.trim();
    
        // 渲染推荐表单
        listEl.innerHTML = `
          <div class="osn-form-card">
            <div class="osn-form-title">📝 推荐添加新软件</div>
    
            <div class="osn-form-field">
              <label class="osn-form-label">软件名称 *</label>
              <input class="osn-form-input" id="osn-f-name" value="${escapeHtml(q)}" placeholder="例如：Typora、迅雷">
            </div>
    
            <div class="osn-form-row">
              <div class="osn-form-field">
                <label class="osn-form-label">中文名（可选）</label>
                <input class="osn-form-input" id="osn-f-name-cn" placeholder="例如：Typora 编辑器">
              </div>
              <div class="osn-form-field">
                <label class="osn-form-label">分类 *</label>
                <select class="osn-form-select" id="osn-f-category">
                  ${CATEGORIES.filter(c => c.key !== 'all').map(c => `<option value="${c.key}">${c.emoji} ${c.label}</option>`).join('')}
                </select>
              </div>
            </div>
    
            <div class="osn-form-field">
              <label class="osn-form-label">官方网址 *</label>
              <input class="osn-form-input" id="osn-f-url" placeholder="https://example.com/download" type="url">
            </div>
    
            <div class="osn-form-field">
              <label class="osn-form-label">适用平台（可多选）</label>
              <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px;">
                ${['Windows','macOS','Linux','iOS','Android'].map(p =>
                  `<label style="font-size:11.5px;color:#475569;cursor:pointer;display:flex;align-items:center;gap:3px;">
                    <input type="checkbox" id="osn-f-p-${p}" value="${p}" checked> ${p}
                  </label>`
                ).join('')}
              </div>
            </div>
    
            <div class="osn-form-row">
              <div class="osn-form-field">
                <label class="osn-form-label">是否免费</label>
                <select class="osn-form-select" id="osn-f-free">
                  <option value="true">免费</option>
                  <option value="false">付费 / 部分付费</option>
                </select>
              </div>
              <div class="osn-form-field">
                <label class="osn-form-label">图标 Emoji</label>
                <input class="osn-form-input" id="osn-f-icon" value="📦" placeholder="📦" maxlength="4" style="width:70px;text-align:center;">
              </div>
            </div>
    
            <div class="osn-form-field">
              <label class="osn-form-label">简短描述</label>
              <textarea class="osn-form-textarea" id="osn-f-desc" placeholder="一句话描述这个软件的功能和特点..." rows="2"></textarea>
            </div>
    
            <button class="osn-form-submit" id="osn-f-submit">💾 提交推荐</button>
            <button class="osn-form-cancel" id="osn-f-cancel">← 返回列表</button>
    
            <!-- 已有推荐列表 -->
            <div style="margin-top:14px;border-top:1px solid #e2e8f0;padding-top:10px;">
              <p style="font-size:11.5px;font-weight:600;color:#64748b;margin-bottom:6px;">📋 已提交的推荐（保存在本地）</p>
              <div class="osn-pending-list" id="osn-pending-list"></div>
            </div>
          </div>
        `;
    
        // 渲染已有推荐
        renderPendingList();
    
        // 绑定表单事件
        document.getElementById('osn-f-submit').addEventListener('click', () => {
          const name = document.getElementById('osn-f-name').value.trim();
          const url = document.getElementById('osn-f-url').value.trim();
          if (!name || !url) {
            alert('⚠️ 请填写软件名称和官方网址（必填项）');
            return;
          }
          if (!url.startsWith('http')) {
            alert('⚠️ 官方网址需要以 http:// 或 https:// 开头');
            return;
          }
    
          const platforms = [];
          ['Windows','macOS','Linux','iOS','Android'].forEach(p => {
            if (document.getElementById(`osn-f-p-${p}`).checked) platforms.push(p);
          });
    
          saveSuggestion({
            name,
            nameCN: document.getElementById('osn-f-name-cn').value.trim(),
            category: document.getElementById('osn-f-category').value,
            officialSite: url,
            downloadPage: url,
            platforms: platforms.length ? platforms : ['Windows'],
            isFree: document.getElementById('osn-f-free').value === 'true',
            icon: document.getElementById('osn-f-icon').value || '📦',
            description: document.getElementById('osn-f-desc').value.trim() || '用户推荐的软件'
          });
    
          renderPendingList();
          // 清空表单部分字段
          document.getElementById('osn-f-name').value = '';
          document.getElementById('osn-f-url').value = '';
          document.getElementById('osn-f-desc').value = '';
        });
    
        document.getElementById('osn-f-cancel').addEventListener('click', () => {
          renderList(); // 返回正常列表视图
        });
      }
    
      // HTML 转义工具函数
      function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
      }
    
      // ========== 事件绑定 ==========
      searchInput.addEventListener('input', () => {
        clearBtn.classList.toggle('visible', searchInput.value.length > 0);
        renderList();
      });
    
      clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearBtn.classList.remove('visible');
        renderList();
        searchInput.focus();
      });
    
      catsNav.addEventListener('click', e => {
        const btn = e.target.closest('.osn-cat-btn');
        if (!btn) return;
        catsNav.querySelectorAll('.osn-cat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentCat = btn.dataset.cat;
        renderList();
      });
    
      closeBtn.addEventListener('click', () => {
        overlay.style.display = 'none';
      });
    
      // ESC 关闭
      overlay.addEventListener('keydown', e => {
        if (e.key === 'Escape') overlay.style.display = 'none';
      });
    
      // 点击遮罩关闭（排除弹窗）
      overlay.addEventListener('click', e => {
        if (e.target === overlay && !e.target.closest('.osn-modal')) {
          overlay.style.display = 'none';
        }
      });
    
      // ========== 初始渲染 ==========
      renderList();
    
      return {
        ok: true,
        summary: '✅ 正版软件官网导航已成功注入！共收录 ' + SOFTWARE_DB.length + ' 款软件，覆盖 9 大分类。',
        changed_count: SOFTWARE_DB.length,
        data: {
          totalSoftware: SOFTWARE_DB.length,
          categories: CATEGORIES.length,
          features: ['智能搜索(中文名/英文/拼音)', '分类筛选', '一键直达官网', '安全提示弹窗', '悬浮触发按钮']
        },
        warnings: []
      };
    }
  );
  if (typeof __tabOriginalFunction !== "function") {
    throw new Error("evaluate_script source must evaluate to a function");
  }
  return await __tabOriginalFunction();
})();