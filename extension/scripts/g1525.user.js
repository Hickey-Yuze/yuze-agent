(function () {
  try {
    const THEME = "kirby-theme-" + Date.now();
    const CDN_PATH = "https://cdn.tab-browser.com/theme-skin";

    const config = {
      name: "星之卡比 Kirby",
      background: {
        backgroundRepeat: "no-repeat",
        backgroundSize: "100% 100%",
        opacity: 0.7,
      },
      bubble: {
        sliceTop: 120,
        sliceRight: 120,
        sliceBottom: 120,
        sliceLeft: 120,
        scale: 0.4,
        textColor: "#ffffff",
        contentMargin: "-25px -20px 0 -20px",
      },
      input: {
        imageWidth: 1600,
        imageHeight: 260,
        sliceTop: 110,
        sliceRight: 110,
        sliceBottom: 110,
        sliceLeft: 110,
        scale: 0.5,
        contentMargin: "-25px -15px 0 -15px",
        toolbarMargin: "-15px -15px -25px -15px",
        searchMargin: "0 8px 0 8px",
      },
    };

    const DEFAULTS = {
      bubble: { imageWidth: 512, imageHeight: 448, scale: 0.5 },
      input: { imageWidth: 1600, imageHeight: 260, scale: 0.5, searchMargin: "0 10px" },
      background: { repeat: "repeat", size: "240px 240px", opacity: 0.3 },
    };

    const bgConfig = config.background || {};
    const bg = {
      repeat: bgConfig.backgroundRepeat || bgConfig.repeat || DEFAULTS.background.repeat,
      size: bgConfig.backgroundSize || bgConfig.size || DEFAULTS.background.size,
      opacity:
        bgConfig.opacity !== undefined
          ? bgConfig.opacity
          : DEFAULTS.background.opacity,
    };

    const input = { ...DEFAULTS.input, ...config.input };
    const bubble = config.bubble || {};

    // ============================================================
    // 图片链接集中管理 —— 方便以后替换
    // ============================================================
    const IMG = {
      background: "https://b0.bdstatic.com/18d1eced4c63b5b4cd985ac5d1d651f3.jpg@h_1280",
      kirby:      "https://clipart-library.com/image_gallery2/Kirby-PNG.png",
      star:       "https://clipart-library.com/images_k/transparent-star-png/transparent-star-png-18.jpg",
      bubble:     "https://clipart-library.com/images/M8iAEo8ca.png",
    };

    window.__SKIN_THEME_CONFIG__ = {
      enabled: true,
      basePath: CDN_PATH,
      theme: THEME,
      bubble: {
        imageUrl: `/bubble.png`,
        imageWidth: bubble.imageWidth ?? DEFAULTS.bubble.imageWidth,
        imageHeight: bubble.imageHeight ?? DEFAULTS.bubble.imageHeight,
        sliceTop: bubble.sliceTop,
        sliceRight: bubble.sliceRight,
        sliceBottom: bubble.sliceBottom,
        sliceLeft: bubble.sliceLeft,
        scale: bubble.scale ?? DEFAULTS.bubble.scale,
        textColor: bubble.textColor,
        contentMargin: bubble.contentMargin,
      },
      input: {
        imageUrl: `/input.png`,
        imageWidth: input.imageWidth,
        imageHeight: input.imageHeight,
        sliceTop: input.sliceTop,
        sliceRight: input.sliceRight,
        sliceBottom: input.sliceBottom,
        sliceLeft: input.sliceLeft,
        scale: input.scale,
      },
    };

    window.dispatchEvent(new CustomEvent("skin-theme-change"));

    // ============================================================
    // CSS —— 所有 url() 均已替换为上面的链接
    // ============================================================
    const cssText = `
.theme-background {
  position: relative;
  overflow: hidden;
  padding-bottom: 24px;
  background: linear-gradient(135deg, #ffb6c1 0%, #ff69b4 50%, #ff1493 100%);
}

.theme-background::before {
  content: "";
  position: absolute;
  inset: 0;
  background-image: url("${IMG.background}");
  background-repeat: no-repeat;
  background-position: center top;
  background-size: 100% 100%;
  opacity: 0.7;
  pointer-events: none;
  z-index: 0;
}

@keyframes kirby-float {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  25%     { transform: translateY(-10px) rotate(-2deg); }
  50%     { transform: translateY(-20px) rotate(0deg); }
  75%     { transform: translateY(-10px) rotate(2deg); }
}

@keyframes star-twinkle {
  0%, 100% { opacity: 0.7; transform: scale(1); }
  50%      { opacity: 1;   transform: scale(1.1); }
}

.theme-kirby {
  position: fixed;
  bottom: 20px;
  right: 30px;
  width: 180px;
  height: 180px;
  background-image: url("${IMG.kirby}");
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
  z-index: 9999;
  transform-origin: center center;
  animation: kirby-float 4s ease-in-out infinite;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
}

.theme-star {
  position: fixed;
  width: 30px;
  height: 30px;
  background-image: url("${IMG.star}");
  background-repeat: no-repeat;
  background-size: contain;
  z-index: 9999;
  animation: star-twinkle 2s ease-in-out infinite;
  pointer-events: none;
}

.theme-star:nth-child(1) { top: 20%; left: 10%;  animation-delay: 0s; }
.theme-star:nth-child(2) { top: 15%; right: 15%; animation-delay: 0.5s; }
.theme-star:nth-child(3) { bottom: 30%; left: 20%; animation-delay: 1s; }
.theme-star:nth-child(4) { bottom: 25%; right: 25%; animation-delay: 1.5s; }

.theme-background-footer {
  content: "";
  position: absolute;
  background-image: url("${IMG.background}");
  background-repeat: repeat-x;
  background-position: bottom center;
  background-size: auto 100%;
  left: 0;
  right: 0;
  bottom: 0;
  height: 40px;
  z-index: 0;
}

.theme-header {
  background-color: #ff69b4;
  background-repeat: repeat-x;
  background-position: top center;
  background-size: auto 60px;
  height: 60px;
  border: none;
  z-index: 10;
}

.theme-header-title-suffix {
  background-image: url("${IMG.kirby}");
  background-repeat: no-repeat;
  background-size: contain;
  width: 40px;
  height: 40px;
  margin-right: 8px;
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
  margin: 0 8px 0 8px;
}

.theme-input-content {
  margin: -25px -15px 0 -15px;
  font-weight: 500;
}

.theme-input-toolbar {
  width: auto !important;
  margin: -15px -15px -25px -15px;
}

.theme-input-container {
  border: none;
  box-shadow: 0 4px 12px rgba(255, 105, 180, 0.3);
  background: rgba(255, 255, 255, 0.9);
}

.theme-logo {
  background-image: url("${IMG.kirby}") !important;
  background-repeat: no-repeat;
  background-size: contain;
}

@keyframes kirby-thinking {
  0%   { background-position: 0 0; }
  25%  { background-position: -32px 0; }
  50%  { background-position: -64px 0; }
  75%  { background-position: -96px 0; }
  100% { background-position: 0 0; }
}

.theme-thinking {
  padding-left: 40px;
  position: relative;
}

.theme-thinking::before {
  content: "";
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 32px;
  height: 32px;
  background-image: url("${IMG.kirby}");
  background-repeat: no-repeat;
  background-size: 32px 32px;
  z-index: 1;
}

.theme-thinking .thinking-loading-char {
  display: none;
}

.theme-button {
  background: linear-gradient(135deg, #ff69b4, #ff1493);
  border: 2px solid #ffb6c1;
  color: white;
  border-radius: 20px;
  transition: all 0.3s ease;
}

.theme-button:hover {
  background: linear-gradient(135deg, #ff1493, #ff69b4);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(255, 105, 180, 0.4);
}

.theme-scrollbar::-webkit-scrollbar { width: 10px; }
.theme-scrollbar::-webkit-scrollbar-track {
  background: rgba(255, 182, 193, 0.2);
  border-radius: 5px;
}
.theme-scrollbar::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #ff69b4, #ff1493);
  border-radius: 5px;
}
.theme-scrollbar::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, #ff1493, #ff69b4);
}

.theme-notification {
  background: rgba(255, 105, 180, 0.9);
  border-left: 4px solid #ff1493;
  color: white;
}

.theme-tab {
  background: rgba(255, 182, 193, 0.3);
  border-bottom: 2px solid transparent;
  transition: all 0.3s ease;
}
.theme-tab:hover {
  background: rgba(255, 182, 193, 0.5);
  border-bottom: 2px solid #ff69b4;
}
.theme-tab.active {
  background: rgba(255, 105, 180, 0.8);
  border-bottom: 2px solid #ff1493;
  color: white;
}
`.trim();

    const styleEl = document.createElement("style");
    styleEl.id = "injected-kirby-theme-css";
    styleEl.type = "text/css";
    styleEl.textContent = cssText;

    const existing = document.getElementById("injected-kirby-theme-css");
    if (existing) {
      existing.remove();
    }

    document.head.appendChild(styleEl);

    setTimeout(() => {
      const kirby = document.createElement("div");
      kirby.className = "theme-kirby";
      document.body.appendChild(kirby);

      for (let i = 1; i <= 4; i++) {
        const star = document.createElement("div");
        star.className = "theme-star";
        document.body.appendChild(star);
      }
    }, 100);

    chrome.tabThemeColor.setDarkMode(false);

    console.log("✨ 星之卡比主题已加载！粉色力量启动！");
  } catch (e) {
    console.error("[Kirby Theme] 注入失败:", e);
  }
})();