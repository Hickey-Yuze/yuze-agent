(() => {
  const LAUNCH_URL = "https://web.tabbit.com/newtab?flight_radar_launch=skill-v2";
  const DOWNLOAD_DOC_URL = "https://km.sankuai.com/collabpage/2785102426";
  const NOTICE_ID = "tabbit-flight-radar-skill-launch";
  const DETECTION_TIMEOUT_MS = 6000;

  document.getElementById(NOTICE_ID)?.remove();
  const notice = document.createElement("aside");
  notice.id = NOTICE_ID;
  Object.assign(notice.style, {
    position: "fixed", right: "18px", top: "18px", zIndex: "2147483647",
    width: "360px", padding: "16px 18px", border: "1px solid rgba(98,230,197,.45)",
    borderRadius: "14px", color: "#eefcff", background: "#0b2230",
    boxShadow: "0 16px 50px rgba(0,0,0,.35)",
    font: "14px/1.55 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"
  });

  const title = document.createElement("strong");
  title.textContent = "正在检测航迹雷达扩展";
  Object.assign(title.style, { display: "block", marginBottom: "5px" });
  const description = document.createElement("div");
  description.textContent = "检测到扩展后会直接打开完整查询页面。";
  description.style.color = "#a9c0ca";

  const instructions = document.createElement("ol");
  instructions.hidden = true;
  Object.assign(instructions.style, { margin: "12px 0", paddingLeft: "22px" });
  for (const text of [
    "打开 Tabbit 扩展管理页并启用开发者模式",
    "解压刚刚下载的 ZIP",
    "点击“加载已解压的扩展程序”，选择解压后的 extension 目录",
    "回到这里点击“安装完成，重新检测”"
  ]) {
    const item = document.createElement("li");
    item.textContent = text;
    instructions.append(item);
  }

  const actions = document.createElement("div");
  actions.hidden = true;
  Object.assign(actions.style, { display: "flex", flexWrap: "wrap", gap: "8px" });
  const makeButton = (text) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = text;
    Object.assign(button.style, {
      padding: "8px 10px", border: "1px solid #35616c", borderRadius: "9px",
      color: "#eaffff", background: "#123442", cursor: "pointer"
    });
    return button;
  };
  const retryButton = makeButton("安装完成，重新检测");
  const downloadButton = makeButton("打开扩展下载文档");
  actions.append(retryButton, downloadButton);
  notice.append(title, description, instructions, actions);
  document.documentElement.append(notice);

  let detectionTimer;
  let closePoll;
  const openDownloadGuide = () => window.open(DOWNLOAD_DOC_URL, "_blank", "noopener,noreferrer");

  const showInstaller = (popupBlocked = false) => {
    clearTimeout(detectionTimer);
    clearInterval(closePoll);
    title.textContent = "需要安装航迹雷达扩展";
    description.textContent = popupBlocked
      ? "浏览器阻止了检测窗口。请从学城文档下载扩展并按下面步骤安装。"
      : "未检测到航迹雷达扩展。请从学城文档下载扩展并按下面步骤安装。";
    instructions.hidden = false;
    actions.hidden = false;
  };

  const detectAndLaunch = () => {
    clearTimeout(detectionTimer);
    clearInterval(closePoll);
    title.textContent = "正在检测航迹雷达扩展";
    description.textContent = "检测到扩展后会直接打开完整查询页面。";
    instructions.hidden = true;
    actions.hidden = true;
    const launcher = window.open(LAUNCH_URL, "_blank");
    if (!launcher) {
      showInstaller(true);
      return;
    }
    closePoll = setInterval(() => {
      if (!launcher.closed) return;
      clearTimeout(detectionTimer);
      clearInterval(closePoll);
      title.textContent = "欢迎使用航迹雷达";
      description.textContent = "扩展已打开。填写航线、日期、票务平台、单程或往返和预算，然后点击“扫描航班价格”；也可以直接把这些条件告诉 Agent。";
    }, 250);
    detectionTimer = setTimeout(() => showInstaller(false), DETECTION_TIMEOUT_MS);
  };

  retryButton.addEventListener("click", detectAndLaunch);
  downloadButton.addEventListener("click", openDownloadGuide);
  detectAndLaunch();
})();
