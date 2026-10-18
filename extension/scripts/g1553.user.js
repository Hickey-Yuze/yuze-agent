(function () {
  try {
    const THEME = "20260122-ggbond-red";
    const CDN_PATH = "https://cdn.tab-browser.com/theme-skin";
    const BASE = `${CDN_PATH}/${THEME}`;
    const u = (file) => `url("${BASE}/${file}")`;

    const config = {
      name: "GGBond-猪猪侠",
      background: {
        opacity: 0.1,
      },
      bubble: {
        textColor: "#b27900",
        sliceTop: 150,
        sliceRight: 210,
        sliceBottom: 170,
        sliceLeft: 210,
        scale: 0.35,
        contentMargin: "-20px -30px",
      },
      input: {
        imageWidth: 1600,
        imageHeight: 260,
        sliceTop: 110,
        sliceRight: 120,
        sliceBottom: 110,
        sliceLeft: 134,
        scale: 0.5,
        contentMargin: "-30px -5px 0 -15px",
        toolbarMargin: "-20px -5px -30px -15px",
        searchMargin: "0 12px 0 12px",
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
    const textColor = bubble.textColor;
    const bubbleContentMargin = bubble.contentMargin;

    window.__SKIN_THEME_CONFIG__ = {
      enabled: true,
      basePath: CDN_PATH,
      theme: THEME,
      bubble: {
        imageUrl: `${BASE}/bubble.png`,
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
        imageUrl: `${BASE}/input.png`,
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
  background-repeat: ${bg.repeat};
  background-position: top ${
    bg.repeat === "repeat-x" ? "center" : "left"
  };
  background-size: ${bg.size};
  opacity: ${bg.opacity};
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
  ${textColor ? `color: ${textColor};` : ""}
  ${bubbleContentMargin ? `margin: ${bubbleContentMargin};` : "margin: -10px;"}
}
.svg-nine-slice-frame {
  background-color: transparent;
  border: none !important;
  border-radius: 0;
}
.theme-search-panel {
  margin: ${input.searchMargin};
}
.theme-input-content {
  margin: ${input.contentMargin || "0"};
  ${textColor ? `color: ${textColor};` : ""}
}
.theme-input-toolbar {
  width: auto !important;
  margin: ${input.toolbarMargin || "0"};
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
    const existing = document.getElementById("injected-skin-theme-css");
    if (existing) {
      existing.remove();
    }
    document.head.appendChild(styleEl);
  } catch (e) {
    console.error("[Skin] 注入失败:", e);
  }
})();