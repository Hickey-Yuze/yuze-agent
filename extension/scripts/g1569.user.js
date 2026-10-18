(function () {
  try {
    const BASE = "https://cdn.tab-browser.com/theme-skin/20260122-chiikawa-pink";
    const u = (file) => `url("${BASE}/${file}")`;

    window.__SKIN_THEME_CONFIG__ = {
      enabled: true,
      basePath: "https://cdn.tab-browser.com/theme-skin",
      theme: "20260122-chiikawa-pink",
      bubble: {
        imageUrl: BASE + "/bubble.png",
        imageWidth: 512,
        imageHeight: 448,
        sliceTop: 120,
        sliceRight: 130,
        sliceBottom: 130,
        sliceLeft: 120,
        scale: 0.35,
      },
      input: {
        imageUrl: BASE + "/input.png",
        imageWidth: 1600,
        imageHeight: 260,
        sliceTop: 120,
        sliceRight: 130,
        sliceBottom: 130,
        sliceLeft: 120,
        scale: 0.5,
      },
    };
    window.dispatchEvent(new CustomEvent("skin-theme-change"));

    const cssText = `
.theme-background {
  position: relative;
  overflow: hidden;
  padding-bottom: 24px;
}
.theme-background::before {
  content: "";
  position: absolute;
  inset: 0;
  background-image: ${u("background.png")};
  background-repeat: repeat;
  background-position: top left;
  background-size: 240px 240px;
  opacity: 0.3;
  pointer-events: none;
  z-index: 0;
}
@keyframes pet-sway {
  0%, 100% { transform: rotate(-3deg); }
  50% { transform: rotate(3deg); }
}
.theme-pet {
  position: fixed;
  bottom: 10px;
  left: 20px;
  width: 200px;
  height: 280px;
  background-image: ${u("pet.png")};
  background-repeat: no-repeat;
  background-position: top left;
  background-size: contain;
  z-index: 0;
  transform-origin: bottom center;
  animation: pet-sway 3s ease-in-out infinite;
}
.theme-background-footer {
  content: "";
  position: absolute;
  background-image: ${u("footer.png")};
  background-repeat: repeat-x;
  background-position: top center;
  background-size: auto 100%;
  left: 0;
  right: 0;
  bottom: 0;
  height: 32px;
  z-index: 0;
}
.theme-header {
  background-image: ${u("header.png")};
  background-repeat: repeat-x;
  background-position: top center;
  background-size: auto 56px;
  height: 56px;
  border: none;
  z-index: 10;
}
.theme-header-title-suffix {
  background-image: ${u("guide.png")};
  transform: rotateY(180deg);
  background-repeat: no-repeat;
  background-size: contain;
  width: 36px;
  height: 36px;
  margin-right: 4px;
}
.theme-user-message {
  position: relative;
  background: transparent !important;
  padding: 0 !important;
  border-radius: 0 !important;
}
.svg-nine-slice-frame {
  background-color: transparent;
  border: none !important;
  border-radius: 0;
}
.theme-search-panel {
  margin: 5px 15px 0 15px;
}
.theme-input-content {
  margin: -30px -15px 0 -15px;
}
.theme-input-toolbar {
  width: auto !important;
  margin: -20px -15px -40px -15px;
}
.theme-input-container {
  border: none;
  box-shadow: none;
  background: transparent;
}
.theme-logo {
  background-image: ${u("logo.png")} !important;
  background-repeat: no-repeat;
}
.theme-thinking {
  padding-left: 32px;
}
.theme-thinking::before {
  content: "";
  position: absolute;
  inset: 0;
  top: -4px;
  width: 28px;
  height: 28px;
  background-image: ${u("loading.png")};
  background-repeat: no-repeat;
  background-size: 28px 28px;
  animation: thinking-rotate 1.5s ease-in-out infinite;
  transform-origin: center center;
  z-index: 1;
}
@keyframes thinking-rotate {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
.theme-thinking .thinking-loading-char {
  display: none;
}
`.trim();

    const styleEl = document.createElement("style");
    styleEl.id = "injected-skin-theme-css";
    styleEl.type = "text/css";
    styleEl.textContent = cssText;
    document.head.appendChild(styleEl);
    chrome.tabThemeColor.setDarkMode(false);
  } catch (e) {
    console.error("[Skin] 注入失败:", e);
  }
})();