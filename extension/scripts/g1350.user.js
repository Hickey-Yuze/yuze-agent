/**
 * Tabbit 脚本妙招：开学社交人格说明书
 * 版本：1.0.0
 *
 * 数据用途：
 * 1. 在当前 Tabbit 页面内运行 20 道大学新环境社交倾向测试；
 * 2. 根据用户主动填写的信息生成自我介绍；
 * 3. 将测试结果、填写内容和最近生成记录保存在当前浏览器 localStorage。
 *
 * 隐私范围：
 * - 不读取本地文件、Cookie、账号信息、网页正文或浏览记录；
 * - 不上传测试答案、文件或自我介绍正文；
 * - 不发送网络请求，所有计算均在当前浏览器内完成；
 * - 关闭应用只移除本次界面，不删除用户保存的结果。
 *
 * 安全与审核声明：
 * - 代码、HTML、CSS 和 JavaScript 均保持透明可读；
 * - 直接操作当前页面 DOM，不使用 iframe；
 * - 不使用 eval、new Function、动态下载或执行远程代码；
 * - 不使用混淆、加密、gzip/Base64 隐藏主要业务逻辑；
 * - 不依赖第三方库或远程字体。
 */

(() => {
  "use strict";

  const APP_ID = "tabbit-campus-personality-app";
  const STYLE_ID = `${APP_ID}-style`;
  const CLEANUP_KEY = "__tabbitCampusPersonalityCleanup";
  const STORAGE_RESULT = "tabbit-campus-personality-result-v1";
  const STORAGE_PROFILE = "tabbit-campus-personality-profile-v1";
  const STORAGE_INTROS = "tabbit-campus-personality-intros-v1";

  if (typeof window[CLEANUP_KEY] === "function") window[CLEANUP_KEY]();

  const questions = [
    { text: "班级群刚建好时，你通常愿意先发一条让别人容易接话的消息。", axis: "entry", direction: 1 },
    { text: "室友说“今天状态有点差”时，你的第一反应通常是先安慰一下对方。", axis: "connection", direction: -1 },
    { text: "新生自我介绍时，你会想放进一个有点意外的小细节，让别人更容易记住你。", axis: "expression", direction: 1 },
    { text: "参加第一次社团活动时，你更容易主动加入现场人数较多的那一圈。", axis: "radius", direction: 1 },
    { text: "小组作业刚公布时，你会很快构思出思路。", axis: "structure", direction: 1 },
    { text: "第一次进入新宿舍时，你往往先观察大家的相处节奏和性格，再决定自己要展现出来的状态。", axis: "entry", direction: -1 },
    { text: "同学问“晚饭一起吗”时，你会先确认时间和地点，而不是直接答应。", axis: "connection", direction: 1 },
    { text: "在不熟的人面前，你更愿意使用清楚稳妥的表达，而不是临场玩梗。", axis: "expression", direction: -1 },
    { text: "课间有十分钟空档时，你更想和一两个人慢慢聊，而不是加入一大群人的话题。", axis: "radius", direction: -1 },
    { text: "小组刚成立但还没人安排任务时，你通常会先等等，看大家自然形成什么节奏。", axis: "structure", direction: -1 },
    { text: "大家第一次见面突然安静下来时，你愿意抛出一个轻松的问题试着破冰。", axis: "entry", direction: 1 },
    { text: "同学吐槽截止日期太赶时，你往往会很快想到“那现在可以先做哪一步”。", axis: "connection", direction: 1 },
    { text: "聊天时，你经常从眼前的话题联想到一个出乎意料的新方向。", axis: "expression", direction: 1 },
    { text: "校园活动现场，你会觉得和不同的人分别聊几句也挺有意思。", axis: "radius", direction: 1 },
    { text: "约好集体行动后，你会想提前确认集合时间和地点。", axis: "structure", direction: 1 },
    { text: "刚进入一个新群聊时，你更愿意等到自己有具体内容可说再发言。", axis: "entry", direction: -1 },
    { text: "朋友说“我好像搞砸了”时，你会先让对方知道这份难受被你听见了。", axis: "connection", direction: -1 },
    { text: "面对陌生场合，你更喜欢用自己熟悉的开场方式，不太想临场即兴。", axis: "expression", direction: -1 },
    { text: "参加完热闹的大活动后，你更想回到熟悉的小圈子里恢复电量。", axis: "radius", direction: -1 },
    { text: "团队合作时，你更习惯先完成分到手的部分，再跟着整体节奏调整。", axis: "structure", direction: -1 }
  ];

  const scale = [
    { value: -3, label: "完全不符合" },
    { value: -2, label: "不符合" },
    { value: -1, label: "比较不符合" },
    { value: 0, label: "不确定" },
    { value: 1, label: "比较符合" },
    { value: 2, label: "符合" },
    { value: 3, label: "完全符合" }
  ];

  const axes = [
    { key: "entry", left: "先观察", right: "先开口" },
    { key: "connection", left: "情绪回应", right: "一起行动" },
    { key: "expression", left: "稳妥表达", right: "灵活联想" },
    { key: "radius", left: "小范围交流", right: "多人现场" },
    { key: "structure", left: "顺势配合", right: "主动安排" }
  ];

  const personaOrder = ["observer", "empath", "initiator", "partner", "creator", "doer"];

  const personas = {
    observer: {
      name: "社交观察员", short: "观察", mark: "观", color: "#547e9a", soft: "#e7f0f4",
      quote: "你不急着成为人群中心，但经常比别人更早读懂现场。",
      keywords: ["敏锐", "有分寸", "慢热"],
      overview: "进入陌生环境时，你通常会先接收现场信息，再选择合适的方式加入。你不是没有表达欲，而是希望自己的出现有自然的落点。",
      first: "安静、稳、有分寸，不会为了刷存在感强行加入对话。",
      familiar: "熟悉后会更自然，也可能展现出精准的幽默和对细节的好记性。",
      strengths: ["能察觉群体气氛和边界", "不容易让别人感到被强行靠近", "记得住别人说过的小信息"],
      misunderstanding: "别人可能把你的“还在观察”误解成不感兴趣。",
      introStyle: "短、真诚，加入一个真实爱好和容易接话的入口。",
      trigger: "环境陌生、信息较多时，你会先观察气氛再行动。",
      prototype: [-0.60, -0.05, -0.15, -0.50, -0.20]
    },
    empath: {
      name: "共情连接者", short: "连接", mark: "共", color: "#c77782", soft: "#f8e9eb",
      quote: "你不一定最先开口，但很少让别人的话掉在地上。",
      keywords: ["温和", "共情", "连接感"],
      overview: "你建立关系的方式，往往从让对方舒服一点开始。你愿意倾听，也容易注意到谁还没有真正进入话题。",
      first: "温和、好相处，和你交流不需要担心突然冷下来。",
      familiar: "熟悉以后，你会展现更明确的偏好和边界，对重要关系也很认真。",
      strengths: ["能接住尴尬和不完整的表达", "容易让慢热的人感到安全", "关系中有持续回应"],
      misunderstanding: "别人可能把你的体贴当成“什么都可以”。",
      introStyle: "自然、友善，给别人一个清楚但没有压力的交流入口。",
      trigger: "有人紧张或需要回应时，你会自然地让现场舒服一点。",
      prototype: [-0.05, -0.60, -0.05, -0.30, -0.10]
    },
    initiator: {
      name: "主动破冰者", short: "破冰", mark: "启", color: "#d28a3a", soft: "#fbefdf",
      quote: "当大家都在等第一句话时，你通常愿意先让交流开始。",
      keywords: ["主动", "自然", "带动感"],
      overview: "陌生环境未必让你完全不紧张，但你更愿意先试着说一句，再根据大家的反应调整。你的主动常常能降低其他人的开口门槛。",
      first: "开朗、自然、容易接近，很快能和新环境建立连接。",
      familiar: "你也需要休息，并不希望每次都默认由你负责活跃气氛。",
      strengths: ["愿意承担先开口的风险", "能提供低门槛的共同话题", "容易带动活动参与感"],
      misunderstanding: "别人可能默认你随时都想热闹，忽略你也需要安静。",
      introStyle: "轻松明快，带一个大家容易回应的问题或邀请。",
      trigger: "场面卡住、没人先开口时，你更愿意主动试一次。",
      prototype: [0.60, -0.15, 0.25, 0.50, -0.05]
    },
    partner: {
      name: "稳定搭子", short: "稳定", mark: "稳", color: "#c79a2c", soft: "#f8f1d9",
      quote: "你不一定抢主角位，但通常会认真对待说好的事情。",
      keywords: ["踏实", "有回应", "好配合"],
      overview: "你更容易通过一起做点什么认识别人。与其反复寒暄，你更习惯把提议落到实际行动，用稳定回应建立信任。",
      first: "稳、直接、好合作，和你约事情时不太需要反复猜。",
      familiar: "你并不只有实用的一面，也有自己的兴趣、幽默和生活节奏。",
      strengths: ["能把想法变成具体行动", "重视约定和他人的时间", "容易成为长期合作中的稳定支点"],
      misunderstanding: "别人可能只在需要帮忙时想到你，忽略你的个人感受。",
      introStyle: "简洁具体，加入一个可执行的邀请或共同活动。",
      trigger: "大家需要一起行动时，你会自然确认实际安排。",
      prototype: [0.25, 0.50, -0.60, 0.05, 0.15]
    },
    creator: {
      name: "创意探索者", short: "创意", mark: "创", color: "#8266a9", soft: "#eee9f6",
      quote: "你对新鲜事和不同可能性，总会多留一点注意力。",
      keywords: ["好奇", "灵活", "新鲜感"],
      overview: "你对新鲜感和可能性比较敏感，普通场景到了你这里，常常会多出一个不同角度。遇到感兴趣的话题时，你的表达会明显变得鲜活。",
      first: "有想法、好奇、愿意尝试，不太喜欢一成不变。",
      familiar: "你的联想并不代表不认真，只是有时会省略中间步骤。",
      strengths: ["能给普通话题增加新鲜感", "善于连接不同兴趣", "在内容构思时反应较快"],
      misunderstanding: "别人可能觉得你的话题或计划变化较快，需要一点时间跟上。",
      introStyle: "保留一个真实的小亮点，同时给它一个容易理解的落点。",
      trigger: "内容过于常规时，你容易想到一个不同的角度。",
      prototype: [0.15, 0.00, 0.60, 0.05, -0.45]
    },
    doer: {
      name: "安静行动派", short: "行动", mark: "行", color: "#4e8a6a", soft: "#e5f1e9",
      quote: "你可能不是话最多的人，但会认真把答应的事情做好。",
      keywords: ["专注", "执行", "低调"],
      overview: "你在新环境里通常先确认发生了什么、需要做什么，再决定如何参与。比起高频表达，你更在意事情是否真正落地。",
      first: "安静、清楚、做事认真，不太爱说没有信息量的话。",
      familiar: "安全感建立后，你也会展现生活化的一面和自己的兴趣。",
      strengths: ["能从零散信息中找出下一步", "可以持续跟进自己负责的事情", "适合整理和执行具体任务"],
      misunderstanding: "别人可能把简短回应理解成冷淡，没及时看见你的投入。",
      introStyle: "信息清楚、自然简短，再补充一个真实的生活兴趣。",
      trigger: "任务混乱或时间临近时，你会更主动地整理和行动。",
      prototype: [-0.35, 0.40, -0.15, -0.30, 0.50]
    }
  };

  const scenes = [
    { key: "class", icon: "班", name: "班级初次见面", time: "30～45 秒", description: "姓名、爱好与相处期待" },
    { key: "training", icon: "训", name: "军训期间破冰", time: "20～30 秒", description: "轻松、简短、有共同体验" },
    { key: "dorm", icon: "舍", name: "宿舍初次见面", time: "15～30 秒", description: "像日常聊天一样自然" },
    { key: "club", icon: "社", name: "社团/学生会面试", time: "45～60 秒", description: "动机、经历与可贡献内容" },
    { key: "group", icon: "组", name: "课程小组初见", time: "20～30 秒", description: "擅长事项与协作方式" }
  ];

  const tones = [
    { key: "concise", name: "极简稳妥", description: "信息够用，不多说" },
    { key: "natural", name: "真诚自然", description: "完整、顺口、最通用" },
    { key: "memorable", name: "轻记忆点", description: "多一个容易接话的小特点" },
    { key: "lively", name: "轻松活泼", description: "语气更明快，但不夸张" }
  ];

  const emptyProfile = {
    name: "", city: "", major: "", hobby1: "", hobby2: "", nameNote: "",
    skill: "", experience: "", clubName: "", reason: ""
  };

  function saveJson(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* 当前页面可能禁用本地存储 */ }
  }

  function readJson(key) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function computeResult(answers) {
    const totals = { entry: 0, connection: 0, expression: 0, radius: 0, structure: 0 };
    questions.forEach((question, index) => {
      totals[question.axis] += (answers[index] ?? 0) * question.direction;
    });
    const scores = {
      entry: totals.entry / 12,
      connection: totals.connection / 12,
      expression: totals.expression / 12,
      radius: totals.radius / 12,
      structure: totals.structure / 12
    };
    const vector = axes.map((axis) => scores[axis.key]);
    const matches = personaOrder.map((key) => {
      const distance = personas[key].prototype.reduce(
        (sum, value, index) => sum + Math.pow(value - vector[index], 2),
        0
      );
      return { key, distance };
    }).sort((a, b) => a.distance - b.distance);
    return {
      primary: matches[0].key,
      secondary: matches[1].key,
      scores,
      completedAt: new Date().toISOString()
    };
  }

  function buildIntro(scene, persona, tone, p) {
    const city = p.city.trim() ? `，来自${p.city.trim()}` : "";
    const hobbies = [p.hobby1.trim(), p.hobby2.trim()].filter(Boolean);
    const hobbyText = hobbies.length ? `平时喜欢${hobbies.join("和")}。` : "";
    const nameNote = p.nameNote.trim() && (tone === "memorable" || tone === "lively")
      ? `${p.nameNote.trim()}。`
      : "";
    const trait = {
      class: {
        observer: "我刚到新环境时会稍微慢热一点，熟悉以后会自然很多。",
        empath: "我的性格比较随和，也很愿意听大家分享。",
        initiator: "我比较喜欢认识新朋友，也愿意主动参加班级活动。",
        partner: "我的性格比较踏实，答应别人的事情会认真做好。",
        creator: "我对新鲜事比较感兴趣，也很期待在大学里尝试新的事情。",
        doer: "我平时话不算特别多，但做事情会比较认真。"
      },
      training: {
        observer: "这几天我还在慢慢认识大家，不过已经觉得我们班很有意思了。",
        empath: "军训这几天大家都挺辛苦的，也很高兴能和大家一起坚持。",
        initiator: "军训虽然有点累，但也正好让我们快速认识彼此。",
        partner: "军训期间需要一起接水、吃饭或者互相提醒集合时间，都可以叫我。",
        creator: "除了认真军训，我也很想慢慢发现校园里好吃、好逛的地方。",
        doer: "我平时比较安静，但需要互相提醒或者帮忙时可以直接找我。"
      },
      dorm: {
        observer: "我刚开始可能稍微慢热一点，熟悉以后会自然很多。",
        empath: "我平时比较随和，有什么生活习惯都可以直接沟通。",
        initiator: "之后想一起吃饭、逛校园或者买生活用品都可以叫上我。",
        partner: "我比较好沟通，宿舍里的公共安排可以一起商量。",
        creator: "我很想在大学里多尝试一些新鲜事情，也欢迎大家一起参加。",
        doer: "我平时比较安静，但宿舍里的公共安排都会认真配合。"
      },
      club: {
        observer: "我平时比较细心，进入新环境时会先了解具体需求，再开始行动。",
        empath: "我的性格比较随和，也比较愿意倾听和沟通。",
        initiator: "我比较喜欢和人交流，也愿意主动参与集体活动。",
        partner: "我做事比较认真，接下来的任务会尽量按时完成并及时反馈。",
        creator: "我对新鲜的内容和活动形式比较感兴趣，也愿意尝试不同想法。",
        doer: "我平时话不算特别多，但做事情比较专注，也会认真跟进负责的部分。"
      },
      group: {
        observer: "我习惯先了解任务要求和大家的想法，再认领适合自己的部分。",
        empath: "我愿意听听大家分别想做哪一部分，也会认真沟通不同意见。",
        initiator: "我比较愿意主动沟通，可以先和大家一起确认要求、讨论分工。",
        partner: "我习惯把分工和时间点确认清楚，认领的部分会按时完成。",
        creator: "前期选题和表现形式可以让我一起参与讨论，我会提供一些想法。",
        doer: "我可以负责资料整理、内容汇总或者最后检查，并及时同步进度。"
      }
    };

    if (tone === "concise") {
      if (scene === "club") {
        return `学长学姐好，我是${p.major.trim() ? `${p.major.trim()}的` : ""}${p.name.trim()}。${trait.club[persona]}我希望加入${p.clubName.trim() || "这个社团"}${p.reason.trim() ? `，因为${p.reason.trim()}` : ""}。如果有机会加入，我会认真完成负责的工作，谢谢。`;
      }
      if (scene === "group") {
        return `大家好，我叫${p.name.trim()}。${trait.group[persona]}${p.skill.trim() ? `我比较擅长${p.skill.trim()}。` : ""}希望我们合作顺利。`;
      }
      const close = scene === "dorm" ? "以后有事情可以直接沟通，希望相处愉快。" : "很高兴认识大家，谢谢。";
      return `大家好，我叫${p.name.trim()}${city}。${trait[scene][persona]}${close}`;
    }

    if (scene === "club") {
      const experience = p.experience.trim()
        ? `之前我有过${p.experience.trim()}，这段经历让我对相关工作有了更多了解。`
        : "";
      const skill = p.skill.trim() ? `我比较擅长${p.skill.trim()}。` : "";
      const reason = p.reason.trim()
        ? `我想加入${p.clubName.trim() || "这个社团"}，是因为${p.reason.trim()}。`
        : `我希望加入${p.clubName.trim() || "这个社团"}，进一步学习和参与实际活动。`;
      return `学长学姐好，我是${p.major.trim() ? `${p.major.trim()}的` : ""}${p.name.trim()}。${trait.club[persona]}${skill}${experience}${reason}如果有机会加入，我愿意从具体工作做起，认真完成自己负责的部分，谢谢。`;
    }

    if (scene === "group") {
      const skill = p.skill.trim() ? `我比较擅长${p.skill.trim()}。` : "";
      return `大家好，我叫${p.name.trim()}。${trait.group[persona]}${skill}后续安排和变化都可以直接在群里沟通，希望我们合作顺利。`;
    }

    const intro = `大家好，我叫${p.name.trim()}${city}。${nameNote}${trait[scene][persona]}${hobbyText}`;
    const invites = {
      class: hobbies.length
        ? "如果大家也有相同的兴趣，欢迎来找我聊天。很高兴和大家成为同学，希望接下来相处愉快。"
        : "很高兴以后能和大家一起学习、慢慢熟悉。",
      training: hobbies.length
        ? "如果你也感兴趣，可以休息的时候来找我聊聊。希望接下来和大家慢慢熟悉、互相照顾。"
        : "希望接下来和大家慢慢熟悉、互相照顾。",
      dorm: "生活习惯有不一样的地方都可以随时沟通，希望之后相处愉快。",
      club: "",
      group: ""
    };
    const ending = scene === "dorm"
      ? invites[scene]
      : `${invites[scene]}${tone === "lively" ? "也期待和大家一起解锁更多大学生活。" : ""}谢谢大家。`;
    return `${intro}${ending}`;
  }

  const previousDocumentOverflow = document.documentElement.style.overflow;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    #${APP_ID} {
      --tbp-ink: #2f2c35;
      --tbp-muted: #716d78;
      --tbp-paper: #f7f4ed;
      --tbp-white: #fffdf9;
      --tbp-purple: #7952a8;
      --tbp-purple-soft: #f0e6f8;
      --tbp-line: #ddd7ce;
      --tbp-display: "Yuanti SC", "STYuanti-SC-Bold", "YouYuan", "Arial Rounded MT Bold", "PingFang SC", "Microsoft YaHei", sans-serif;
      --tbp-body: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
      position: fixed;
      inset: 0;
      z-index: 2147483000;
      overflow: auto;
      overscroll-behavior: contain;
      background: var(--tbp-paper);
      color: var(--tbp-ink);
      font-family: var(--tbp-body);
      -webkit-font-smoothing: antialiased;
    }
    #${APP_ID}, #${APP_ID} * { box-sizing: border-box; }
    #${APP_ID} button, #${APP_ID} input { font: inherit; }
    #${APP_ID} button { color: inherit; }
    #${APP_ID} .tbp-shell { position: relative; isolation: isolate; min-height: 100%; overflow: hidden; }
    #${APP_ID} .tbp-page { position: relative; z-index: 1; width: min(1180px, calc(100% - 48px)); margin: 0 auto; }
    #${APP_ID} .tbp-narrow { width: min(860px, calc(100% - 48px)); }
    #${APP_ID} .tbp-topbar { position: sticky; top: 0; z-index: 30; height: 84px; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 0 max(28px, calc((100vw - 1180px) / 2)); border-bottom: 1px solid rgba(198,190,180,.7); background: rgba(255,253,249,.94); backdrop-filter: blur(18px); }
    #${APP_ID} .tbp-brand { display: flex; align-items: center; gap: 12px; border: 0; background: none; padding: 0; cursor: pointer; text-align: left; }
    #${APP_ID} .tbp-brand-mark { width: 40px; height: 40px; border-radius: 13px 13px 13px 4px; display: grid; place-items: center; background: var(--tbp-purple); color: white; font-weight: 900; }
    #${APP_ID} .tbp-brand strong { display: block; font-family: var(--tbp-display); font-size: 16px; font-weight: 850; }
    #${APP_ID} .tbp-brand small { display: block; margin-top: 3px; color: var(--tbp-muted); font-size: 11px; }
    #${APP_ID} .tbp-top-actions { display: flex; align-items: center; gap: 9px; }
    #${APP_ID} .tbp-local { padding: 8px 13px; border: 1px solid #d8ded6; border-radius: 999px; background: #f6faf4; color: #54705a; font-size: 12px; }
    #${APP_ID} .tbp-close { width: 38px; height: 38px; border: 1px solid #d6cfc6; border-radius: 50%; background: white; cursor: pointer; font-size: 20px; line-height: 1; }
    #${APP_ID} .tbp-close:hover { background: #f1ece4; }

    #${APP_ID} .tbp-ambient { position: fixed; inset: 84px 0 0; z-index: 0; overflow: hidden; pointer-events: none; }
    #${APP_ID} .tbp-blob { position: absolute; border-radius: 50%; filter: blur(16px); opacity: .42; }
    #${APP_ID} .tbp-blob-a { width: 390px; height: 390px; right: 2vw; top: 5vh; background: rgba(195,172,217,.55); animation: tbp-float-a 17s ease-in-out infinite alternate; }
    #${APP_ID} .tbp-blob-b { width: 330px; height: 330px; left: 4vw; bottom: 1vh; background: rgba(168,213,199,.48); animation: tbp-float-b 21s ease-in-out infinite alternate; }
    #${APP_ID} .tbp-lane { position: absolute; left: -8vw; width: 116vw; height: 180px; overflow: hidden; transform-origin: center; }
    #${APP_ID} .tbp-lane-a { top: 12%; transform: rotate(-5deg); }
    #${APP_ID} .tbp-lane-b { bottom: 10%; transform: rotate(4deg); }
    #${APP_ID} .tbp-track { display: flex; width: max-content; animation: tbp-slide 34s linear infinite; }
    #${APP_ID} .tbp-track-reverse { animation-direction: reverse; animation-duration: 42s; }
    #${APP_ID} .tbp-shape-group { flex: 0 0 auto; display: flex; align-items: center; gap: 84px; min-width: 1500px; height: 180px; padding-right: 84px; }
    #${APP_ID} .tbp-symbol { position: relative; flex: 0 0 auto; display: block; opacity: .32; }
    #${APP_ID} .tbp-disc { width: 104px; height: 104px; border-radius: 50% 48% 46% 52%; background: #cfbde0; box-shadow: inset -18px -12px 0 rgba(255,255,255,.28); }
    #${APP_ID} .tbp-ring { width: 126px; height: 126px; border: 20px solid #a8d2c9; border-radius: 50%; }
    #${APP_ID} .tbp-pill { width: 166px; height: 76px; border-radius: 999px; background: #efc5cb; transform: rotate(-12deg); }
    #${APP_ID} .tbp-diamond { width: 88px; height: 88px; border: 15px solid #d7bd7a; border-radius: 16px; transform: rotate(45deg); }
    #${APP_ID} .tbp-orbit { width: 146px; height: 92px; border: 5px solid #a8bfd7; border-radius: 50%; transform: rotate(18deg); }
    #${APP_ID} .tbp-orbit::after { content: ""; position: absolute; width: 24px; height: 24px; right: 8px; top: 2px; border-radius: 50%; background: #89a9c9; }
    #${APP_ID} .tbp-flower { width: 104px; height: 104px; background: #cab8dd; border-radius: 50% 8% 50% 8%; transform: rotate(18deg); }
    #${APP_ID} .tbp-flower::after { content: ""; position: absolute; inset: 0; border-radius: 8% 50% 8% 50%; background: #a8d2c9; transform: rotate(45deg); }

    #${APP_ID} .tbp-eyebrow { display: inline-flex; align-items: center; padding: 7px 13px; border-radius: 999px; background: rgba(240,230,248,.88); color: var(--tbp-purple); font-size: 12px; font-weight: 850; letter-spacing: .12em; }
    #${APP_ID} .tbp-primary, #${APP_ID} .tbp-secondary, #${APP_ID} .tbp-copy { min-height: 48px; padding: 0 22px; border: 1px solid transparent; border-radius: 999px; font-weight: 780; cursor: pointer; transition: transform .18s ease, box-shadow .18s ease, background .18s ease; }
    #${APP_ID} .tbp-primary { background: var(--tbp-purple); color: white; box-shadow: 0 10px 24px rgba(121,82,168,.22); }
    #${APP_ID} .tbp-secondary { background: var(--tbp-white); border-color: #cfc8bf; }
    #${APP_ID} .tbp-primary:hover:not(:disabled), #${APP_ID} .tbp-secondary:hover:not(:disabled) { transform: translateY(-2px); }
    #${APP_ID} button:disabled { opacity: .42; cursor: not-allowed; box-shadow: none; }
    #${APP_ID} .tbp-text-button { border: 0; padding: 7px 0; background: none; color: var(--tbp-muted); cursor: pointer; }

    #${APP_ID} .tbp-landing { min-height: calc(100vh - 84px); padding: 82px 0 110px; text-align: center; }
    #${APP_ID} .tbp-hero-copy { position: relative; z-index: 2; width: min(900px, 100%); margin: 0 auto; }
    #${APP_ID} .tbp-hero-copy h1 { margin: 20px 0 25px; font-family: var(--tbp-display); font-size: clamp(54px, 6vw, 82px); line-height: 1.08; font-weight: 900; letter-spacing: .035em; }
    #${APP_ID} .tbp-hero-copy h1 em { position: relative; color: var(--tbp-purple); font-style: normal; text-shadow: 0 5px 0 rgba(214,193,231,.38); }
    #${APP_ID} .tbp-hero-copy h1 em::after { content: ""; position: absolute; left: 1%; right: -2%; bottom: -7px; height: 13px; border-radius: 999px; background: linear-gradient(90deg,#d8c4e8,#efc9d0); transform: rotate(-1.2deg); z-index: -1; }
    #${APP_ID} .tbp-hero-lead { max-width: 800px; margin: 0 auto; color: #5e5964; font-size: 19px; line-height: 1.85; }
    #${APP_ID} .tbp-meta { display: flex; justify-content: center; flex-wrap: wrap; gap: 10px; margin: 28px 0; }
    #${APP_ID} .tbp-meta span { padding: 9px 15px; border: 1px solid rgba(255,255,255,.7); border-radius: 999px; font-size: 13px; font-weight: 750; box-shadow: 0 7px 18px rgba(72,58,80,.06); }
    #${APP_ID} .tbp-meta span:nth-child(1) { background: #efe7f5; color: #6f4c91; }
    #${APP_ID} .tbp-meta span:nth-child(2) { background: #e4f1ed; color: #397874; }
    #${APP_ID} .tbp-meta span:nth-child(3) { background: #f7e7e9; color: #965563; }
    #${APP_ID} .tbp-hero-actions { display: flex; justify-content: center; flex-wrap: wrap; gap: 13px; }
    #${APP_ID} .tbp-disclaimer { max-width: 700px; margin: 24px auto 0; color: #8b858f; font-size: 12px; line-height: 1.7; }
    #${APP_ID} .tbp-hero-visual { position: relative; width: min(720px,100%); min-height: 500px; margin: 54px auto 0; }
    #${APP_ID} .tbp-big-shape { position: absolute; width: 450px; height: 410px; right: -40px; top: 36px; border-radius: 46% 54% 62% 38% / 49% 41% 59% 51%; background: #d9cee3; transform: rotate(13deg); }
    #${APP_ID} .tbp-card { position: absolute; width: 226px; height: 310px; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 8px solid rgba(255,255,255,.75); border-radius: 115px 115px 28px 28px; box-shadow: 0 22px 60px rgba(64,50,72,.12); }
    #${APP_ID} .tbp-card b { width: 112px; height: 112px; display: grid; place-items: center; border-radius: 50%; background: rgba(255,255,255,.7); font-family: var(--tbp-display); font-size: 48px; }
    #${APP_ID} .tbp-card small { margin-top: 24px; font-family: var(--tbp-display); font-weight: 850; }
    #${APP_ID} .tbp-card-a { right: 2px; top: 30px; background: #d9ccea; color: #6e4b91; transform: rotate(9deg) scale(.86); }
    #${APP_ID} .tbp-card-b { left: 54px; top: 52px; background: #f1d3d6; color: #a65b67; transform: rotate(-10deg) scale(.9); }
    #${APP_ID} .tbp-card-c { left: 170px; top: 150px; background: #cfe1ea; color: #4d7891; transform: rotate(2deg); }
    #${APP_ID} .tbp-saved { width: min(850px,100%); display: flex; align-items: center; gap: 14px; margin: 22px auto 0; padding: 15px 18px; border: 1px solid var(--tbp-line); border-radius: 18px; background: rgba(255,253,249,.9); cursor: pointer; text-align: left; }
    #${APP_ID} .tbp-saved-avatar { width: 48px; height: 48px; display: grid; place-items: center; flex: 0 0 auto; border-radius: 50%; font-weight: 900; }
    #${APP_ID} .tbp-saved small, #${APP_ID} .tbp-saved strong { display: block; }
    #${APP_ID} .tbp-saved-arrow { margin-left: auto; color: var(--tbp-purple); font-weight: 800; }

    #${APP_ID} .tbp-test { padding: 56px 0 100px; }
    #${APP_ID} .tbp-progress-row { display: flex; justify-content: space-between; margin-bottom: 14px; color: var(--tbp-muted); font-size: 13px; }
    #${APP_ID} .tbp-progress { height: 7px; overflow: hidden; border-radius: 999px; background: #ded8cf; }
    #${APP_ID} .tbp-progress span { display: block; height: 100%; border-radius: inherit; background: var(--tbp-purple); }
    #${APP_ID} .tbp-question { margin-top: 42px; padding: 52px 58px 38px; border: 1px solid var(--tbp-line); border-radius: 26px; background: var(--tbp-white); box-shadow: 0 22px 60px rgba(64,50,72,.12); }
    #${APP_ID} .tbp-label { color: var(--tbp-purple); font-size: 12px; font-weight: 850; letter-spacing: .12em; }
    #${APP_ID} .tbp-question h2 { max-width: 700px; margin: 22px 0 58px; font-family: var(--tbp-display); font-size: clamp(28px,3.3vw,42px); line-height: 1.55; }
    #${APP_ID} .tbp-scale-head { display: grid; grid-template-columns: 1fr auto 1fr; margin-bottom: 16px; color: #88828d; font-size: 12px; }
    #${APP_ID} .tbp-scale-head strong { min-width: 130px; color: var(--tbp-purple); text-align: center; }
    #${APP_ID} .tbp-scale-head span:last-child { text-align: right; }
    #${APP_ID} .tbp-range { width: 100%; accent-color: var(--tbp-purple); cursor: pointer; }
    #${APP_ID} .tbp-scale-options { display: grid; grid-template-columns: repeat(7,1fr); gap: 5px; margin-top: 20px; }
    #${APP_ID} .tbp-scale-options button { border: 0; background: none; color: #918b95; font-size: 10px; cursor: pointer; }
    #${APP_ID} .tbp-scale-options i { display: block; width: 16px; height: 16px; margin: 0 auto 9px; border: 2px solid #bcb5c0; border-radius: 50%; background: white; }
    #${APP_ID} .tbp-scale-options button.is-active { color: var(--tbp-purple); font-weight: 800; }
    #${APP_ID} .tbp-scale-options button.is-active i { border: 4px solid var(--tbp-purple); transform: scale(1.2); }
    #${APP_ID} .tbp-question-actions { display: flex; justify-content: space-between; gap: 12px; margin-top: 54px; padding-top: 28px; border-top: 1px solid #e8e2d9; }
    #${APP_ID} .tbp-note { margin-top: 18px; color: #8c8690; text-align: center; font-size: 12px; }

    #${APP_ID} .tbp-result-hero { position: relative; z-index: 1; border-bottom: 1px solid rgba(100,90,100,.08); }
    #${APP_ID} .tbp-result-hero-inner { min-height: 480px; padding: 74px 0; display: grid; grid-template-columns: 1.2fr .8fr; gap: 70px; align-items: center; }
    #${APP_ID} .tbp-result-copy h1 { margin: 12px 0; font-family: var(--tbp-display); font-size: clamp(50px,6vw,78px); line-height: 1.1; }
    #${APP_ID} .tbp-result-quote { max-width: 640px; font-family: var(--tbp-display); font-size: 21px; line-height: 1.8; }
    #${APP_ID} .tbp-keywords { display: flex; flex-wrap: wrap; gap: 9px; margin: 24px 0 34px; }
    #${APP_ID} .tbp-keywords span { padding: 7px 13px; border: 1px solid rgba(55,48,60,.18); border-radius: 999px; background: rgba(255,255,255,.55); font-size: 12px; font-weight: 750; }
    #${APP_ID} .tbp-result-actions { display: flex; flex-wrap: wrap; gap: 12px; }
    #${APP_ID} .tbp-emblem { position: relative; width: 310px; height: 310px; margin: auto; display: grid; place-items: center; }
    #${APP_ID} .tbp-emblem::before, #${APP_ID} .tbp-emblem::after { content: ""; position: absolute; inset: 25px; border: 2px solid currentColor; border-radius: 50%; opacity: .35; transform: rotate(22deg) scaleY(.7); }
    #${APP_ID} .tbp-emblem::after { inset: 0; border-style: dashed; transform: rotate(-18deg) scaleX(.8); }
    #${APP_ID} .tbp-emblem-core { position: relative; z-index: 2; width: 170px; height: 170px; display: grid; place-items: center; border-radius: 50% 50% 42% 58% / 48% 44% 56% 52%; color: white; font-family: var(--tbp-display); font-size: 72px; font-weight: 900; box-shadow: 0 20px 50px rgba(55,48,60,.19); transform: rotate(-5deg); }
    #${APP_ID} .tbp-result-content { padding: 62px 0 110px; }
    #${APP_ID} .tbp-hidden { display: flex; align-items: center; gap: 18px; margin-bottom: 28px; padding: 20px 24px; border: 1px solid var(--tbp-line); border-radius: 18px; background: var(--tbp-white); }
    #${APP_ID} .tbp-hidden-mark { width: 58px; height: 58px; flex: 0 0 auto; display: grid; place-items: center; border-radius: 50%; font-size: 22px; font-weight: 900; }
    #${APP_ID} .tbp-hidden small { color: var(--tbp-muted); }
    #${APP_ID} .tbp-hidden h3 { display: inline; margin: 0 12px 0 0; }
    #${APP_ID} .tbp-hidden p { display: inline; color: var(--tbp-muted); }
    #${APP_ID} .tbp-result-grid { display: grid; grid-template-columns: 1.15fr .85fr; gap: 22px; }
    #${APP_ID} .tbp-content-card { padding: 34px 36px; border: 1px solid var(--tbp-line); border-radius: 20px; background: var(--tbp-white); }
    #${APP_ID} .tbp-content-card h2 { margin: 11px 0 20px; font-family: var(--tbp-display); font-size: 27px; }
    #${APP_ID} .tbp-content-card p { color: #625d67; line-height: 1.9; }
    #${APP_ID} .tbp-wide-card { grid-column: 1 / -1; }
    #${APP_ID} .tbp-two-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-top: 24px; }
    #${APP_ID} .tbp-two-cols div { padding: 20px; border-radius: 14px; background: #f5f1e9; }
    #${APP_ID} .tbp-axis-list { display: grid; gap: 22px; }
    #${APP_ID} .tbp-axis-labels { display: flex; justify-content: space-between; margin-bottom: 8px; color: #69636d; font-size: 12px; }
    #${APP_ID} .tbp-axis-track { position: relative; height: 6px; border-radius: 999px; background: #ded9d1; }
    #${APP_ID} .tbp-axis-track i { position: absolute; top: 50%; width: 15px; height: 15px; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,.18); transform: translate(-50%,-50%); }
    #${APP_ID} .tbp-strengths { display: grid; gap: 14px; padding: 0; list-style: none; }
    #${APP_ID} .tbp-strengths li { color: #5f5a64; line-height: 1.6; }
    #${APP_ID} .tbp-bottom-cta { display: flex; align-items: center; justify-content: space-between; gap: 30px; margin-top: 24px; padding: 38px 42px; border-radius: 22px; color: white; }
    #${APP_ID} .tbp-bottom-cta h2 { max-width: 700px; margin: 8px 0 0; font-family: var(--tbp-display); font-size: 25px; }
    #${APP_ID} .tbp-bottom-cta button { flex: 0 0 auto; padding: 14px 20px; border: 0; border-radius: 999px; background: white; font-weight: 800; cursor: pointer; }

    #${APP_ID} .tbp-intro { padding: 42px 0 110px; }
    #${APP_ID} .tbp-intro-head { display: flex; justify-content: space-between; align-items: center; }
    #${APP_ID} .tbp-mini-persona { padding: 8px 14px; border-radius: 999px; font-size: 12px; font-weight: 850; }
    #${APP_ID} .tbp-intro-title { max-width: 760px; margin: 58px 0 34px; }
    #${APP_ID} .tbp-intro-title h1 { margin: 12px 0; font-family: var(--tbp-display); font-size: clamp(38px,4.8vw,58px); }
    #${APP_ID} .tbp-intro-title p { color: var(--tbp-muted); font-size: 16px; line-height: 1.8; }
    #${APP_ID} .tbp-scenes { display: grid; grid-template-columns: repeat(5,1fr); gap: 12px; }
    #${APP_ID} .tbp-scene { position: relative; min-height: 190px; padding: 18px; border: 1px solid var(--tbp-line); border-radius: 18px; background: var(--tbp-white); text-align: left; cursor: pointer; }
    #${APP_ID} .tbp-scene.is-active { border: 2px solid var(--tbp-purple); background: #faf7fc; }
    #${APP_ID} .tbp-scene-icon { width: 42px; height: 42px; display: grid; place-items: center; margin-bottom: 18px; border-radius: 50%; background: var(--tbp-purple-soft); color: var(--tbp-purple); font-weight: 900; }
    #${APP_ID} .tbp-scene strong, #${APP_ID} .tbp-scene small { display: block; }
    #${APP_ID} .tbp-scene small { margin-top: 5px; color: var(--tbp-purple); }
    #${APP_ID} .tbp-scene p { color: var(--tbp-muted); font-size: 12px; line-height: 1.6; }
    #${APP_ID} .tbp-generator { display: grid; grid-template-columns: 1.1fr .9fr; gap: 22px; margin-top: 28px; align-items: start; }
    #${APP_ID} .tbp-form, #${APP_ID} .tbp-preview { padding: 30px; border: 1px solid var(--tbp-line); border-radius: 20px; background: var(--tbp-white); }
    #${APP_ID} .tbp-panel-head { display: flex; gap: 14px; margin-bottom: 24px; }
    #${APP_ID} .tbp-panel-head > span { width: 34px; height: 34px; flex: 0 0 auto; display: grid; place-items: center; border-radius: 50%; background: var(--tbp-purple); color: white; font-weight: 850; }
    #${APP_ID} .tbp-panel-head h2 { margin: 1px 0 4px; font-family: var(--tbp-display); font-size: 23px; }
    #${APP_ID} .tbp-panel-head p { margin: 0; color: var(--tbp-muted); font-size: 12px; }
    #${APP_ID} .tbp-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 17px; }
    #${APP_ID} .tbp-field-wide { grid-column: 1 / -1; }
    #${APP_ID} .tbp-fields label span { display: block; margin-bottom: 7px; color: #5f5963; font-size: 12px; font-weight: 750; }
    #${APP_ID} .tbp-fields input { width: 100%; height: 44px; padding: 0 14px; border: 1px solid #d6cfc6; border-radius: 12px; outline: none; background: #fffefa; }
    #${APP_ID} .tbp-fields input:focus { border-color: var(--tbp-purple); box-shadow: 0 0 0 3px var(--tbp-purple-soft); }
    #${APP_ID} .tbp-tone-title { margin-top: 32px; padding-top: 28px; border-top: 1px solid #e7e1d8; }
    #${APP_ID} .tbp-tones { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
    #${APP_ID} .tbp-tone { padding: 13px 14px; border: 1px solid #d8d1c8; border-radius: 14px; background: #fffefa; text-align: left; cursor: pointer; }
    #${APP_ID} .tbp-tone.is-active { border: 2px solid var(--tbp-purple); background: var(--tbp-purple-soft); }
    #${APP_ID} .tbp-tone strong, #${APP_ID} .tbp-tone small { display: block; }
    #${APP_ID} .tbp-tone small { margin-top: 4px; color: var(--tbp-muted); }
    #${APP_ID} .tbp-generate { width: 100%; margin-top: 24px; }
    #${APP_ID} .tbp-preview { position: sticky; top: 108px; min-height: 430px; background: #f0ebe2; }
    #${APP_ID} .tbp-preview-top { display: flex; justify-content: space-between; padding-bottom: 18px; border-bottom: 1px solid #d8d1c7; }
    #${APP_ID} .tbp-preview blockquote { margin: 28px 0; font-family: var(--tbp-display); font-size: 18px; line-height: 2; }
    #${APP_ID} .tbp-preview-actions { display: flex; gap: 9px; }
    #${APP_ID} .tbp-copy { flex: 1; background: var(--tbp-purple); color: white; }
    #${APP_ID} .tbp-empty { min-height: 320px; display: grid; place-items: center; align-content: center; color: #8c8690; text-align: center; }
    #${APP_ID} .tbp-empty b { width: 72px; height: 72px; display: grid; place-items: center; border: 1px dashed #aaa3ab; border-radius: 50%; font-family: var(--tbp-display); font-size: 27px; }
    #${APP_ID} .tbp-empty p { max-width: 270px; line-height: 1.8; }

    #${APP_ID} .tbp-modal-backdrop { position: fixed; inset: 0; z-index: 100; display: grid; place-items: center; padding: 20px; background: rgba(44,38,48,.45); backdrop-filter: blur(5px); }
    #${APP_ID} .tbp-modal { width: min(430px,100%); padding: 34px; border: 1px solid var(--tbp-line); border-radius: 20px; background: var(--tbp-white); box-shadow: 0 28px 80px rgba(34,29,38,.25); text-align: center; }
    #${APP_ID} .tbp-modal h2 { font-family: var(--tbp-display); }
    #${APP_ID} .tbp-modal p { color: var(--tbp-muted); line-height: 1.75; }
    #${APP_ID} .tbp-modal-actions { display: flex; justify-content: center; flex-wrap: wrap; gap: 10px; }
    #${APP_ID} .tbp-footer { position: relative; z-index: 1; display: flex; justify-content: space-between; gap: 18px; padding: 24px max(28px,calc((100vw - 1180px) / 2)); background: #342f39; color: white; }
    #${APP_ID} .tbp-footer p { margin: 0; color: #c5bec8; font-size: 11px; }

    @keyframes tbp-slide { to { transform: translate3d(-50%,0,0); } }
    @keyframes tbp-float-a { to { transform: translate3d(-90px,70px,0) scale(1.14); } }
    @keyframes tbp-float-b { to { transform: translate3d(110px,-55px,0) scale(1.12); } }

    @media (max-width: 980px) {
      #${APP_ID} .tbp-result-hero-inner, #${APP_ID} .tbp-generator { grid-template-columns: 1fr; }
      #${APP_ID} .tbp-result-copy { text-align: center; }
      #${APP_ID} .tbp-keywords, #${APP_ID} .tbp-result-actions { justify-content: center; }
      #${APP_ID} .tbp-result-grid { grid-template-columns: 1fr; }
      #${APP_ID} .tbp-wide-card { grid-column: auto; }
      #${APP_ID} .tbp-scenes { grid-template-columns: repeat(3,1fr); }
      #${APP_ID} .tbp-preview { position: static; }
    }
    @media (max-width: 680px) {
      #${APP_ID} .tbp-page, #${APP_ID} .tbp-narrow { width: min(100% - 28px,1180px); }
      #${APP_ID} .tbp-topbar { height: 72px; padding: 0 14px; }
      #${APP_ID} .tbp-brand small, #${APP_ID} .tbp-local { display: none; }
      #${APP_ID} .tbp-ambient { inset: 72px 0 0; }
      #${APP_ID} .tbp-shape-group { transform: scale(.72); transform-origin: left center; }
      #${APP_ID} .tbp-landing { padding-top: 58px; }
      #${APP_ID} .tbp-hero-copy h1 { font-size: 47px; }
      #${APP_ID} .tbp-hero-lead { font-size: 16px; }
      #${APP_ID} .tbp-hero-visual { min-height: 390px; transform: scale(.86); transform-origin: top center; margin-bottom: -45px; }
      #${APP_ID} .tbp-card { width: 190px; height: 270px; }
      #${APP_ID} .tbp-card-c { left: 120px; }
      #${APP_ID} .tbp-card-b { left: 0; }
      #${APP_ID} .tbp-question { margin-top: 24px; padding: 34px 20px 24px; }
      #${APP_ID} .tbp-question h2 { font-size: 27px; }
      #${APP_ID} .tbp-scale-options button { font-size: 0; }
      #${APP_ID} .tbp-scale-options button:first-child, #${APP_ID} .tbp-scale-options button:nth-child(4), #${APP_ID} .tbp-scale-options button:last-child { font-size: 9px; }
      #${APP_ID} .tbp-content-card { padding: 27px 22px; }
      #${APP_ID} .tbp-two-cols, #${APP_ID} .tbp-fields { grid-template-columns: 1fr; }
      #${APP_ID} .tbp-field-wide { grid-column: auto; }
      #${APP_ID} .tbp-bottom-cta, #${APP_ID} .tbp-footer { align-items: flex-start; flex-direction: column; }
      #${APP_ID} .tbp-scenes { grid-template-columns: 1fr 1fr; }
      #${APP_ID} .tbp-scene { min-height: 175px; }
      #${APP_ID} .tbp-form, #${APP_ID} .tbp-preview { padding: 22px 18px; }
    }
    @media (prefers-reduced-motion: reduce) {
      #${APP_ID} *, #${APP_ID} *::before, #${APP_ID} *::after { scroll-behavior: auto !important; transition: none !important; }
      #${APP_ID} .tbp-track, #${APP_ID} .tbp-blob { animation: none !important; }
    }
  `;

  const root = document.createElement("div");
  root.id = APP_ID;
  root.setAttribute("role", "application");
  root.setAttribute("aria-label", "开学社交人格说明书");

  const storedResult = readJson(STORAGE_RESULT);
  const storedProfile = readJson(STORAGE_PROFILE);
  const validStoredResult = storedResult
    && personas[storedResult.primary]
    && personas[storedResult.secondary]
    && storedResult.scores
    ? storedResult
    : null;

  const state = {
    screen: "landing",
    answers: Array(questions.length).fill(null),
    questionIndex: 0,
    result: validStoredResult,
    savedResult: validStoredResult,
    scene: null,
    tone: "natural",
    profile: { ...emptyProfile, ...(storedProfile && typeof storedProfile === "object" ? storedProfile : {}) },
    generated: "",
    copied: false,
    showRetestConfirm: false
  };

  let copyTimer = null;

  function activeResult() {
    return state.result || state.savedResult;
  }

  function setScreen(screen) {
    state.screen = screen;
    render();
    root.scrollTo({ top: 0, behavior: "smooth" });
  }

  function beginTest() {
    state.answers = Array(questions.length).fill(null);
    state.questionIndex = 0;
    state.result = null;
    state.generated = "";
    state.showRetestConfirm = false;
    setScreen("test");
  }

  function finishTest() {
    const result = computeResult(state.answers);
    state.result = result;
    state.savedResult = result;
    saveJson(STORAGE_RESULT, result);
    setScreen("result");
  }

  function shapeGroup(extraClass = "") {
    return `<div class="tbp-shape-group ${extraClass}">
      <span class="tbp-symbol tbp-disc"></span>
      <span class="tbp-symbol tbp-ring"></span>
      <span class="tbp-symbol tbp-pill"></span>
      <span class="tbp-symbol tbp-diamond"></span>
      <span class="tbp-symbol tbp-orbit"></span>
      <span class="tbp-symbol tbp-flower"></span>
    </div>`;
  }

  function renderAmbient() {
    return `<div class="tbp-ambient" aria-hidden="true">
      <div class="tbp-blob tbp-blob-a"></div>
      <div class="tbp-blob tbp-blob-b"></div>
      <div class="tbp-lane tbp-lane-a"><div class="tbp-track">${shapeGroup()}${shapeGroup()}</div></div>
      <div class="tbp-lane tbp-lane-b"><div class="tbp-track tbp-track-reverse">${shapeGroup()}${shapeGroup()}</div></div>
    </div>`;
  }

  function renderHeader() {
    return `<header class="tbp-topbar">
      <button class="tbp-brand" data-action="home" aria-label="返回应用首页">
        <span class="tbp-brand-mark">社</span>
        <span><strong>开学社交人格说明书</strong><small>大学新环境中的你，会怎样开始连接？</small></span>
      </button>
      <div class="tbp-top-actions">
        <span class="tbp-local">● 结果仅保存在当前浏览器</span>
        <button class="tbp-close" data-action="close" aria-label="关闭应用" title="关闭并返回 Tabbit 首页">×</button>
      </div>
    </header>`;
  }

  function renderLanding() {
    const saved = state.savedResult;
    const savedPersona = saved ? personas[saved.primary] : null;
    return `<section class="tbp-page tbp-landing">
      <div class="tbp-hero-copy">
        <div class="tbp-eyebrow">TABBIT · 大学生妙招</div>
        <h1>找到你的<br><em>开学社交人格</em></h1>
        <p class="tbp-hero-lead">20 道大学情境题，看看你在陌生环境中更自然的社交方式，并生成适合你的自我介绍。</p>
        <div class="tbp-meta"><span>20 道情境题</span><span>约 3 分钟</span><span>6 种人格结果</span></div>
        <div class="tbp-hero-actions">
          <button class="tbp-primary" data-action="start-test">开始测试　→</button>
          <button class="tbp-secondary" data-action="retest" ${saved ? "" : "disabled title=\"完成第一次测试后可用\""}>重新测试</button>
          <button class="tbp-secondary" data-action="view-last" ${saved ? "" : "disabled title=\"完成第一次测试后可用\""}>查看上次结果</button>
        </div>
        <p class="tbp-disclaimer">用于娱乐与自我表达，只描述进入大学新环境时的社交倾向，不构成专业心理测评。</p>
      </div>
      <div class="tbp-hero-visual" aria-hidden="true">
        <div class="tbp-big-shape"></div>
        <div class="tbp-card tbp-card-a"><b>创</b><small>创意探索者</small></div>
        <div class="tbp-card tbp-card-b"><b>共</b><small>共情连接者</small></div>
        <div class="tbp-card tbp-card-c"><b>观</b><small>社交观察员</small></div>
      </div>
      ${savedPersona ? `<button class="tbp-saved" data-action="view-last">
        <span class="tbp-saved-avatar" style="background:${savedPersona.soft};color:${savedPersona.color}">${savedPersona.mark}</span>
        <span><small>你上次的结果</small><strong>${savedPersona.name}</strong></span>
        <span class="tbp-saved-arrow">继续使用结果 →</span>
      </button>` : ""}
    </section>`;
  }

  function renderTest() {
    const index = state.questionIndex;
    const current = state.answers[index];
    const answered = state.answers.filter((value) => value !== null).length;
    const progress = Math.round(((index + 1) / questions.length) * 100);
    const currentLabel = current === null
      ? "请选择你的倾向"
      : scale.find((item) => item.value === current)?.label || "请选择你的倾向";
    return `<section class="tbp-page tbp-narrow tbp-test">
      <div class="tbp-progress-row"><button class="tbp-text-button" data-action="exit-test">退出测试</button><span>${index + 1} / ${questions.length}</span></div>
      <div class="tbp-progress"><span style="width:${progress}%"></span></div>
      <article class="tbp-question">
        <div class="tbp-label">问题 ${String(index + 1).padStart(2, "0")}</div>
        <h2>${questions[index].text}</h2>
        <div class="tbp-scale-head"><span>不符合</span><strong>${currentLabel}</strong><span>符合</span></div>
        <input class="tbp-range" data-role="range-answer" type="range" min="-3" max="3" step="1" value="${current ?? 0}" aria-label="选择符合程度">
        <div class="tbp-scale-options" role="radiogroup" aria-label="符合程度">
          ${scale.map((item) => `<button class="${current === item.value ? "is-active" : ""}" data-action="answer" data-value="${item.value}" role="radio" aria-checked="${current === item.value}"><i></i>${item.label}</button>`).join("")}
        </div>
        <div class="tbp-question-actions">
          <button class="tbp-secondary" data-action="previous-question" ${index === 0 ? "disabled" : ""}>← 上一题</button>
          <button class="tbp-primary" data-action="next-question" ${current === null ? "disabled" : ""}>${index === questions.length - 1 ? "查看结果" : "下一题"}　→</button>
        </div>
      </article>
      <p class="tbp-note">没有正确答案，请按进入大学新环境时更自然的反应选择。已完成 ${answered} 题。</p>
    </section>`;
  }

  function renderResult() {
    const result = activeResult();
    if (!result || !personas[result.primary] || !personas[result.secondary]) return renderLanding();
    const primary = personas[result.primary];
    const secondary = personas[result.secondary];
    return `<section>
      <div class="tbp-result-hero" style="background:${primary.soft}">
        <div class="tbp-page tbp-result-hero-inner">
          <div class="tbp-result-copy">
            <div class="tbp-eyebrow" style="color:${primary.color}">你的开学社交人格</div>
            <h1>${primary.name}</h1>
            <p class="tbp-result-quote">“${primary.quote}”</p>
            <div class="tbp-keywords">${primary.keywords.map((item) => `<span>${item}</span>`).join("")}</div>
            <div class="tbp-result-actions">
              <button class="tbp-primary" data-action="open-intro" style="background:${primary.color}">生成我的自我介绍　→</button>
              <button class="tbp-secondary" data-action="retest">重新测试</button>
            </div>
          </div>
          <div class="tbp-emblem" style="color:${primary.color}"><div class="tbp-emblem-core" style="background:${primary.color}">${primary.mark}</div></div>
        </div>
      </div>
      <div class="tbp-page tbp-result-content">
        <div class="tbp-hidden">
          <span class="tbp-hidden-mark" style="background:${secondary.soft};color:${secondary.color}">${secondary.mark}</span>
          <div><small>你的隐藏倾向</small><h3>${secondary.name}</h3><p>${secondary.trigger}</p></div>
        </div>
        <div class="tbp-result-grid">
          <article class="tbp-content-card tbp-wide-card">
            <div class="tbp-label">01 · 总体画像</div><h2>你更自然的社交方式</h2><p>${primary.overview}</p>
            <div class="tbp-two-cols"><div><strong>别人对你的第一印象</strong><p>${primary.first}</p></div><div><strong>熟悉之后的你</strong><p>${primary.familiar}</p></div></div>
          </article>
          <article class="tbp-content-card">
            <div class="tbp-label">02 · 倾向分布</div><h2>你的五个社交维度</h2>
            <div class="tbp-axis-list">${axes.map((axis) => {
              const position = Math.max(2, Math.min(98, (result.scores[axis.key] + 1) * 50));
              return `<div><div class="tbp-axis-labels"><span>${axis.left}</span><span>${axis.right}</span></div><div class="tbp-axis-track"><i style="left:${position}%;background:${primary.color}"></i></div></div>`;
            }).join("")}</div>
          </article>
          <article class="tbp-content-card"><div class="tbp-label">03 · 你的优势</div><h2>你在新环境里的加分项</h2><ul class="tbp-strengths">${primary.strengths.map((item) => `<li>✓　${item}</li>`).join("")}</ul></article>
          <article class="tbp-content-card"><div class="tbp-label">04 · 小提醒</div><h2>可能遇到的误会</h2><p>${primary.misunderstanding}</p><hr><strong>推荐自我介绍风格</strong><p>${primary.introStyle}</p></article>
        </div>
        <div class="tbp-bottom-cta" style="background:${primary.color}"><div><small>把测试结果真正用起来</small><h2>根据你的性格和场景，生成一段自然的自我介绍</h2></div><button data-action="open-intro">开始生成 →</button></div>
      </div>
    </section>`;
  }

  function fieldMarkup(field, label, placeholder, wide = false) {
    return `<label class="${wide ? "tbp-field-wide" : ""}"><span>${label}</span><input data-field="${field}" value="${escapeHtml(state.profile[field])}" placeholder="${escapeHtml(placeholder)}"></label>`;
  }

  function renderGenerator(primary) {
    if (!state.scene) return "";
    const selectedScene = scenes.find((item) => item.key === state.scene);
    const needsNameNote = state.tone === "memorable" || state.tone === "lively";
    return `<div class="tbp-generator">
      <div class="tbp-form">
        <div class="tbp-panel-head"><span>01</span><div><h2>补充你的信息</h2><p>除称呼外全部选填，未填写的内容不会出现在结果中。</p></div></div>
        <div class="tbp-fields">
          ${fieldMarkup("name", "希望别人怎么称呼你 *", "例如：小林")}
          ${fieldMarkup("city", "来自哪里", "例如：杭州")}
          ${state.scene === "club" ? fieldMarkup("major", "专业或方向", "例如：新闻传播专业") : ""}
          ${fieldMarkup("hobby1", "兴趣爱好 1", "例如：听歌")}
          ${fieldMarkup("hobby2", "兴趣爱好 2", "例如：羽毛球")}
          ${state.scene === "club" || state.scene === "group" ? fieldMarkup("skill", state.scene === "group" ? "擅长的事项" : "特长或能力", state.scene === "group" ? "例如：资料整理" : "例如：摄影") : ""}
          ${state.scene === "club" ? fieldMarkup("experience", "相关经历", "没有可以留空，不会虚构") : ""}
          ${state.scene === "club" ? fieldMarkup("clubName", "社团或部门名称", "例如：学生会宣传部") : ""}
          ${state.scene === "club" ? fieldMarkup("reason", "为什么想加入", "例如：想学习活动策划，也希望认识兴趣相近的同学", true) : ""}
          ${needsNameNote ? fieldMarkup("nameNote", "名字记忆点", "只填写真实、自然的名字含义或谐音；没有可留空", true) : ""}
        </div>
        <div class="tbp-panel-head tbp-tone-title"><span>02</span><div><h2>选择表达方式</h2><p>人格保持不变，只调整篇幅和语气。</p></div></div>
        <div class="tbp-tones">${tones.map((item) => `<button class="tbp-tone ${state.tone === item.key ? "is-active" : ""}" data-action="select-tone" data-tone="${item.key}"><strong>${item.name}</strong><small>${item.description}</small></button>`).join("")}</div>
        <button class="tbp-primary tbp-generate" data-action="generate" ${state.profile.name.trim() ? "" : "disabled"} style="background:${primary.color}">生成自我介绍　→</button>
        ${state.profile.name.trim() ? "" : `<p class="tbp-note">请先填写希望别人怎么称呼你。</p>`}
      </div>
      <aside class="tbp-preview">
        <div class="tbp-preview-top"><div><small>生成预览</small><h3>${selectedScene.name}</h3></div><strong>${tones.find((item) => item.key === state.tone)?.name || ""}</strong></div>
        ${state.generated ? `<blockquote>${escapeHtml(state.generated)}</blockquote>
          <div class="tbp-preview-actions"><button class="tbp-copy" data-action="copy">${state.copied ? "已复制" : "复制全文"}</button><button class="tbp-secondary" data-action="generate">应用修改</button></div>
          <p class="tbp-note">不需要逐字背诵，先让大家听清名字；语速稍慢，记住开头和结尾即可。</p>`
          : `<div class="tbp-empty"><b>文</b><p>填写称呼并点击生成后，完整自我介绍会出现在这里。</p></div>`}
      </aside>
    </div>`;
  }

  function renderIntro() {
    const result = activeResult();
    if (!result || !personas[result.primary]) return renderLanding();
    const primary = personas[result.primary];
    return `<section class="tbp-page tbp-intro">
      <div class="tbp-intro-head"><button class="tbp-text-button" data-action="back-result">← 返回人格结果</button><span class="tbp-mini-persona" style="background:${primary.soft};color:${primary.color}">${primary.mark}　${primary.name}</span></div>
      <div class="tbp-intro-title"><div class="tbp-eyebrow">自我介绍生成器</div><h1>这一次，你要在哪里介绍自己？</h1><p>不同场景需要不同的信息重点。选择场景后，再补充你愿意透露的内容。</p></div>
      <div class="tbp-scenes">${scenes.map((item) => `<button class="tbp-scene ${state.scene === item.key ? "is-active" : ""}" data-action="select-scene" data-scene="${item.key}"><span class="tbp-scene-icon">${item.icon}</span><strong>${item.name}</strong><small>${item.time}</small><p>${item.description}</p></button>`).join("")}</div>
      ${renderGenerator(primary)}
    </section>`;
  }

  function renderModal() {
    if (!state.showRetestConfirm) return "";
    return `<div class="tbp-modal-backdrop"><section class="tbp-modal" role="dialog" aria-modal="true" aria-labelledby="tbp-retest-title"><h2 id="tbp-retest-title">重新进行测试？</h2><p>新测试完成后会替换当前人格结果；已保存的自我介绍不会被删除。</p><div class="tbp-modal-actions"><button class="tbp-secondary" data-action="cancel-retest">暂不重测</button><button class="tbp-primary" data-action="confirm-retest">确认重新测试</button></div></section></div>`;
  }

  function renderScreen() {
    if (state.screen === "test") return renderTest();
    if (state.screen === "result") return renderResult();
    if (state.screen === "intro") return renderIntro();
    return renderLanding();
  }

  function render() {
    root.innerHTML = `<div class="tbp-shell">${renderAmbient()}${renderHeader()}${renderScreen()}${renderModal()}<footer class="tbp-footer"><strong>开学社交人格说明书</strong><p>答案、结果和填写内容默认只保存在当前浏览器。</p></footer></div>`;
  }

  async function copyGeneratedText() {
    if (!state.generated) return;
    let success = false;
    try {
      await navigator.clipboard.writeText(state.generated);
      success = true;
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = state.generated;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      root.appendChild(textarea);
      textarea.select();
      try { success = document.execCommand("copy"); } catch { success = false; }
      textarea.remove();
    }
    state.copied = success;
    render();
    if (copyTimer) window.clearTimeout(copyTimer);
    copyTimer = window.setTimeout(() => {
      state.copied = false;
      render();
    }, 1800);
  }

  function handleClick(event) {
    const target = event.target.closest("[data-action]");
    if (!target || target.disabled) return;
    const action = target.dataset.action;

    if (action === "close") return cleanup();
    if (action === "home" || action === "exit-test") return setScreen("landing");
    if (action === "start-test") return beginTest();
    if (action === "retest") {
      if (state.savedResult) {
        state.showRetestConfirm = true;
        return render();
      }
      return beginTest();
    }
    if (action === "cancel-retest") {
      state.showRetestConfirm = false;
      return render();
    }
    if (action === "confirm-retest") return beginTest();
    if (action === "view-last") {
      if (!state.savedResult) return;
      state.result = state.savedResult;
      return setScreen("result");
    }
    if (action === "answer") {
      state.answers[state.questionIndex] = Number(target.dataset.value);
      return render();
    }
    if (action === "previous-question") {
      state.questionIndex = Math.max(0, state.questionIndex - 1);
      return render();
    }
    if (action === "next-question") {
      if (state.answers[state.questionIndex] === null) return;
      if (state.questionIndex < questions.length - 1) {
        state.questionIndex += 1;
        return render();
      }
      return finishTest();
    }
    if (action === "open-intro") return setScreen("intro");
    if (action === "back-result") return setScreen("result");
    if (action === "select-scene") {
      state.scene = target.dataset.scene;
      state.generated = "";
      return render();
    }
    if (action === "select-tone") {
      state.tone = target.dataset.tone;
      state.generated = "";
      return render();
    }
    if (action === "generate") {
      const result = activeResult();
      if (!state.scene || !result || !state.profile.name.trim()) return;
      state.generated = buildIntro(state.scene, result.primary, state.tone, state.profile);
      const history = readJson(STORAGE_INTROS) || [];
      const nextHistory = [{
        text: state.generated,
        scene: state.scene,
        persona: result.primary,
        createdAt: new Date().toISOString()
      }, ...(Array.isArray(history) ? history : [])].slice(0, 20);
      saveJson(STORAGE_INTROS, nextHistory);
      return render();
    }
    if (action === "copy") return copyGeneratedText();
  }

  function handleInput(event) {
    const field = event.target.dataset.field;
    if (!field || !(field in state.profile)) return;
    state.profile[field] = event.target.value;
    saveJson(STORAGE_PROFILE, state.profile);
    const generateButton = root.querySelector('[data-action="generate"]');
    if (generateButton) generateButton.disabled = !state.profile.name.trim();
  }

  function handleChange(event) {
    if (!event.target.matches('[data-role="range-answer"]')) return;
    state.answers[state.questionIndex] = Number(event.target.value);
    render();
  }

  function handleKeydown(event) {
    if (event.key === "Escape" && state.showRetestConfirm) {
      state.showRetestConfirm = false;
      render();
    }
  }

  function cleanup() {
    if (copyTimer) window.clearTimeout(copyTimer);
    root.removeEventListener("click", handleClick);
    root.removeEventListener("input", handleInput);
    root.removeEventListener("change", handleChange);
    root.removeEventListener("keydown", handleKeydown);
    root.remove();
    style.remove();
    document.documentElement.style.overflow = previousDocumentOverflow;
    if (window[CLEANUP_KEY] === cleanup) delete window[CLEANUP_KEY];
  }

  window[CLEANUP_KEY] = cleanup;
  document.head.appendChild(style);
  document.body.appendChild(root);
  document.documentElement.style.overflow = "hidden";
  root.addEventListener("click", handleClick);
  root.addEventListener("input", handleInput);
  root.addEventListener("change", handleChange);
  root.addEventListener("keydown", handleKeydown);
  render();
})();