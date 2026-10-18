(async function __tabEvaluateScriptBridge() {
  const __tabScriptArgs = {};
  const __tabOriginalFunction = (
    async function run(args) {
      'use strict';
    
      // ========== Common Utilities ==========
      const CommonUtils = {
        getSupportedLang() {
          const lang = navigator.language || navigator.userLanguage;
          const supportedLanguages = {
            "en": "en", "es": "es", "fr": "fr", "pt": "pt", "ru": "ru",
            "ja": "ja", "de": "de", "ko": "ko", "it": "it", "id": "id",
            "tr": "tr", "pl": "pl", "uk": "uk", "nl": "nl", "vi": "vi",
            "th": "th", "ar": "ar", "fa": "fa", "hi": "hi", "ms": "ms",
            "zh-CN": "zh-CN", "zh-TW": "zh-TW"
          };
          const langCode = lang.split("-")[0];
          if (langCode === "zh") {
            return lang === "zh-CN" ? "zh-CN" : "zh-TW";
          }
          return supportedLanguages[langCode] || "en";
        },
        openInTab(url) {
          window.open(url, '_blank', 'noopener,noreferrer');
        },
        genrateDownloadSvg(color = "#FFF", width = 25, height = 25) {
          const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
          svg.setAttribute("t", "1768806429307");
          svg.setAttribute("class", "icon");
          svg.setAttribute("viewBox", "0 0 1024 1024");
          svg.setAttribute("version", "1.1");
          svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
          svg.setAttribute("p-id", "21520");
          svg.setAttribute("width", width);
          svg.setAttribute("height", height);
          const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
          path.setAttribute("d", "M684.5 512H573.1V389.8c0-11.2-9.1-20.4-20.4-20.4h-81.5c-11.3 0-20.4 9.1-20.4 20.4v122.4l-112.4 0.6c-4 0-7.1 2.3-8.5 5.5 0 0.1-0.1 0.1-0.1 0.2-0.3 0.6-0.3 1.3-0.4 2-0.1 0.6-0.3 1.2-0.2 1.8 0 0.1-0.1 0.3-0.1 0.4 0 0.4 0.2 0.7 0.3 1.1 0.2 0.8 0.3 1.6 0.7 2.4 0.2 0.4 0.4 0.7 0.6 1 0.3 0.6 0.6 1.2 1 1.7l168.2 188c0.4 0.4 0.8 0.6 1.2 1 0.2 0.2 0.3 0.5 0.6 0.7 0.2 0.2 0.5 0.2 0.8 0.4 0.7 0.4 1.4 0.7 2.1 1 0.2 0.1 0.5 0.2 0.7 0.2 2.9 0.9 6 0.6 8.3-1.3 0.5-0.4 0.8-1.1 1.2-1.6 0.3-0.2 0.6-0.4 0.9-0.7l175.2-187.8c0.5-0.6 0.8-1.3 1.2-1.9 0.2-0.3 0.4-0.5 0.5-0.9 0.4-0.8 0.6-1.6 0.7-2.3 0.1-0.4 0.3-0.6 0.3-1v-1c0.6-5.4-3.6-9.7-9.1-9.7zM471.3 349.1h81.5c11.3 0 20.4-9.1 20.4-20.4v-20.4c0-11.2-9.1-20.4-20.4-20.4h-81.5c-11.3 0-20.4 9.1-20.4 20.4v20.4c0 11.3 9.1 20.4 20.4 20.4zM512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64z m0 814.6c-202.4 0-366.5-164.1-366.5-366.6 0-202.4 164.1-366.5 366.5-366.5S878.5 309.6 878.5 512 714.4 878.6 512 878.6z");
          path.setAttribute("fill", color);
          svg.appendChild(path);
          return svg;
        },
        findParentByClassContains(el, classPart, maxLevel = 5) {
          let level = 0;
          let cur = el;
          while (cur && level < maxLevel) {
            if (cur.className && typeof cur.className === "string" && cur.className.includes(classPart)) {
              return cur;
            }
            cur = cur.parentElement;
            level++;
          }
          return null;
        },
        onLocationChange(callback) {
          if (typeof callback !== "function") return;
          if (!this._locationChangeListeners) {
            this._locationChangeListeners = new Set();
          }
          this._locationChangeListeners.add(callback);
          if (window.__tm_history_patch_v1__) return;
          window.__tm_history_patch_v1__ = true;
          const utils = this;
          let lastHref = location.href;
          let scheduled = false;
          const notify = () => {
            if (scheduled) return;
            scheduled = true;
            requestAnimationFrame(() => {
              scheduled = false;
              const href = location.href;
              if (href === lastHref) return;
              lastHref = href;
              utils._locationChangeListeners.forEach((cb) => { try { cb(href); } catch (e) {} });
            });
          };
          const patch = (type) => {
            const raw = history[type];
            if (raw.__tm_patched__) return;
            function wrappedState() {
              const ret = raw.apply(this, arguments);
              notify();
              return ret;
            }
            wrappedState.__tm_patched__ = true;
            history[type] = wrappedState;
          };
          patch("pushState");
          patch("replaceState");
          window.addEventListener("popstate", notify);
          window.addEventListener("hashchange", notify);
        },
        downloaderEvent(url) {
          const durl = "https://www.tool77.com/" + CommonUtils.getSupportedLang() + "/v/downloader?url=" + encodeURIComponent(url);
          CommonUtils.openInTab(durl);
        }
      };
    
      // ========== Download HUD System ==========
      const DownloadHud = {
        instances: new Map(),
        createStyleText(id, zIndex, buttonSize) {
          return `
            #${id} {
              position: fixed; z-index: ${zIndex} !important; overflow: hidden;
              background: rgba(0, 0, 0, 0.3); width: ${buttonSize}px; height: ${buttonSize}px;
              border-radius: 50%; display: none; align-items: center; justify-content: center;
              cursor: pointer; pointer-events: auto !important; font-size: 16px;
            }
            #${id}::before {
              content: ""; position: absolute; inset: 0; border-radius: inherit; padding: 2px;
              background: linear-gradient(90deg, red, orange, yellow, green, cyan, blue, violet, red);
              background-size: 200% 200%; opacity: 0; transition: opacity .25s;
              -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
              -webkit-mask-composite: xor; mask-composite: exclude;
            }
            #${id}.video-downloader-skill-hover { opacity: 1; }
            #${id}.video-downloader-skill-hover::before { opacity: 1; animation: vd-rainbow-move 3s linear infinite; }
            #${id} svg { fill: currentColor; pointer-events: none; }
            @keyframes vd-rainbow-move { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }
          `;
        },
        isPointInRect(x, y, rect) {
          return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
        },
        isVisibleElement(element, minTargetSize) {
          const rect = element.getBoundingClientRect();
          if (rect.width <= minTargetSize || rect.height <= minTargetSize) return false;
          const cs = window.getComputedStyle(element);
          if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") return false;
          return true;
        },
        createHoverDownloadButton(options = {}) {
          const {
            id = "video-downloader-skill", zIndex = 2147483647, buttonSize = 40,
            buttonPosition = "top-center", buttonEdgeOffset = 15, iconSize = 25,
            iconColor = "#fff", minTargetSize = 50, targetSelector = "video",
            extraTargetSelector = "", getAnchorRect = null, onClick = null
          } = options;
    
          if (this.instances.has(id)) return this.instances.get(id).api;
    
          const state = { activeTarget: null, mouseX: -500, mouseY: -500, destroyed: false, disabled: false, buttonPosition, buttonEdgeOffset };
    
          const styleEl = document.createElement('style');
          styleEl.textContent = this.createStyleText(id, zIndex, buttonSize);
          document.head.appendChild(styleEl);
    
          const button = document.createElement("div");
          button.id = id;
          button.style.cursor = "pointer!important";
          button.appendChild(CommonUtils.genrateDownloadSvg(iconColor, iconSize, iconSize));
          (document.body || document.documentElement).appendChild(button);
    
          const updateButtonPos = () => {
            if (state.destroyed || !state.activeTarget || button.style.display === "none") return;
            let rect = null;
            if (typeof getAnchorRect === "function") rect = getAnchorRect(state.activeTarget);
            if (!rect) rect = state.activeTarget.getBoundingClientRect();
            if (!rect) return;
            const edgeOffset = Number.isFinite(Number(state.buttonEdgeOffset)) ? Number(state.buttonEdgeOffset) : 15;
            let top = rect.top + edgeOffset;
            let left = rect.left + rect.width / 2 - buttonSize / 2;
            switch (state.buttonPosition) {
              case "bottom-center": top = rect.bottom - buttonSize - edgeOffset; left = rect.left + rect.width / 2 - buttonSize / 2; break;
              case "left-center": top = rect.top + rect.height / 2 - buttonSize / 2; left = rect.left + edgeOffset; break;
              case "right-center": top = rect.top + rect.height / 2 - buttonSize / 2; left = rect.right - buttonSize - edgeOffset; break;
              case "right-top-quarter": top = rect.top + rect.height * 0.25 - buttonSize / 2; left = rect.right - buttonSize - edgeOffset; break;
              case "right-three-quarter": top = rect.top + rect.height * 0.75 - buttonSize / 2; left = rect.right - buttonSize - edgeOffset; break;
              case "left-top-quarter": top = rect.top + rect.height * 0.25 - buttonSize / 2; left = rect.left + edgeOffset; break;
              case "left-three-quarter": top = rect.top + rect.height * 0.75 - buttonSize / 2; left = rect.left + edgeOffset; break;
              case "top-left-quarter": top = rect.top + edgeOffset; left = rect.left + rect.width * 0.25 - buttonSize / 2; break;
              case "top-three-quarter": top = rect.top + edgeOffset; left = rect.left + rect.width * 0.75 - buttonSize / 2; break;
              case "bottom-left-quarter": top = rect.bottom - buttonSize - edgeOffset; left = rect.left + rect.width * 0.25 - buttonSize / 2; break;
              case "bottom-three-quarter": top = rect.bottom - buttonSize - edgeOffset; left = rect.left + rect.width * 0.75 - buttonSize / 2; break;
              default: top = rect.top + edgeOffset; left = rect.left + rect.width / 2 - buttonSize / 2; break;
            }
            if (left < 5) left = 5;
            if (top < 5) top = 5;
            if (top > window.innerHeight - buttonSize - 5) top = window.innerHeight - buttonSize - 5;
            if (left > window.innerWidth - buttonSize - 5) left = window.innerWidth - buttonSize - 5;
            button.style.top = `${top}px`;
            button.style.left = `${left}px`;
            button.style.zIndex = zIndex + "!important";
          };
    
          const pickTarget = () => {
            const targets = document.querySelectorAll(targetSelector);
            for (const el of targets) {
              const rect = el.getBoundingClientRect();
              if (!this.isPointInRect(state.mouseX, state.mouseY, rect)) continue;
              if (!this.isVisibleElement(el, minTargetSize)) continue;
              if (targetSelector === "video" && el.readyState < 3) continue;
              return el;
            }
            if (extraTargetSelector) {
              const extras = document.querySelectorAll(extraTargetSelector);
              for (const el of extras) {
                if (this.isPointInRect(state.mouseX, state.mouseY, el.getBoundingClientRect())) return el;
              }
            }
            return null;
          };
    
          const checkHover = () => {
            if (state.destroyed) return;
            if (state.disabled) { button.style.display = "none"; state.activeTarget = null; return; }
            if (state.mouseX < 0 || state.mouseY < 0) return;
            const btnRect = button.getBoundingClientRect();
            const hoveringBtn = button.style.display === "flex" && this.isPointInRect(state.mouseX, state.mouseY, btnRect);
            if (hoveringBtn) { button.classList.add("video-downloader-skill-hover"); return; }
            button.classList.remove("video-downloader-skill-hover");
            const found = pickTarget();
            if (found) { state.activeTarget = found; button.style.display = "flex"; updateButtonPos(); }
            else { button.style.display = "none"; state.activeTarget = null; }
          };
    
          const onMouseMove = (e) => { if (!state.destroyed) { state.mouseX = e.clientX; state.mouseY = e.clientY; checkHover(); } };
          const onMouseDown = (e) => {
            if (state.destroyed || state.disabled || button.style.display !== "flex") return;
            const r = button.getBoundingClientRect();
            if (!this.isPointInRect(e.clientX, e.clientY, r)) return;
            e.preventDefault(); e.stopPropagation();
            if (typeof onClick === "function") Promise.resolve(onClick(state.activeTarget)).catch(() => {});
          };
          const onScroll = () => { if (!state.destroyed && !state.disabled && state.activeTarget && button.style.display === "flex") updateButtonPos(); };
    
          window.addEventListener("mousemove", onMouseMove, true);
          window.addEventListener("mousedown", onMouseDown, true);
          window.addEventListener("scroll", onScroll, { passive: true, capture: true });
          const timer = setInterval(() => { if (!state.destroyed && state.mouseX >= 0 && state.mouseY >= 0) checkHover(); }, 300);
    
          const destroy = () => {
            if (state.destroyed) return;
            state.destroyed = true; clearInterval(timer);
            window.removeEventListener("mousemove", onMouseMove, true);
            window.removeEventListener("mousedown", onMouseDown, true);
            window.removeEventListener("scroll", onScroll, true);
            button.remove(); styleEl.remove(); this.instances.delete(id);
          };
          const hideButton = () => { button.style.display = "none"; };
          const disable = () => { state.disabled = true; button.style.display = "none"; state.activeTarget = null; };
          const enable = () => { state.disabled = false; checkHover(); };
          const showButtonForTarget = (target) => { if (!target || state.disabled) return; state.activeTarget = target; button.style.display = "flex"; updateButtonPos(); };
          const setButtonPosition = (pos, offset) => {
            const valid = new Set(["top-center","bottom-center","left-center","right-center","top-left-quarter","top-three-quarter","bottom-left-quarter","bottom-three-quarter","right-top-quarter","right-three-quarter","left-top-quarter","left-three-quarter"]);
            if (valid.has(pos)) state.buttonPosition = pos;
            if (offset != null && Number.isFinite(Number(offset))) state.buttonEdgeOffset = Number(offset);
            if (state.activeTarget && button.style.display === "flex") updateButtonPos();
          };
          const api = { getCurrentTargetElement: () => state.activeTarget, hideButton, disable, enable, showButtonForTarget, setButtonPosition, destroy };
          this.instances.set(id, { api });
          return api;
        },
        mountVideoHoverDownload(spec = {}) {
          const { getDownloadUrl, invokeDownload = CommonUtils.downloaderEvent, ...hoverOpts } = spec;
          if (typeof getDownloadUrl !== "function") return null;
          return this.createHoverDownloadButton({
            ...hoverOpts,
            onClick: async (target) => {
              if (!target) return;
              try {
                const url = await Promise.resolve(getDownloadUrl(target));
                if (url && !String(url).includes("undefined")) invokeDownload(url);
              } catch (err) {}
            }
          });
        }
      };
    
      // ========== YouTube Downloader ==========
      const YouTubeDownloader = {
        downloadVideo() {
          CommonUtils.downloaderEvent(window.location.href);
        },
        generate() {
          return new Promise((resolve) => {
            const btnId = "all-in-one-downloader";
            const boxContainer = document.createElement("div");
            boxContainer.className = "ytp-button";
            boxContainer.id = btnId;
            boxContainer.setAttribute("style", `position:relative;display:inline-block;width:48px;height:100%;`);
            const boxInner = document.createElement("div");
            boxInner.setAttribute("style", `position:absolute;width:100%;height:100%;`);
            const boxBtn = document.createElement("button");
            boxBtn.setAttribute("style", `background-color:transparent;width:100%;height:100%;outline:none;flex:1 1 0%;display:flex;align-items:center;justify-content:center;border:none;padding:0px;cursor:pointer;`);
            boxContainer.appendChild(boxInner); boxInner.appendChild(boxBtn);
            boxBtn.appendChild(CommonUtils.genrateDownloadSvg("#FFF"));
            boxContainer.addEventListener("click", () => this.downloadVideo());
            const tryInsert = () => {
              const player = document.querySelector("#player-container-outer .html5-video-player");
              if (player) {
                const rightControls = player.querySelector(".ytp-right-controls");
                if (rightControls && !document.querySelector("#" + btnId)) rightControls.prepend(boxContainer);
              }
            };
            const interval = setInterval(() => {
              if (!document.querySelector("#" + btnId)) { tryInsert(); } else { resolve(); clearInterval(interval); }
            }, 777);
          });
        },
        generateShorts() {
          let hud = DownloadHud.mountVideoHoverDownload({
            buttonSize: 48, iconSize: 25, buttonEdgeOffset: 15,
            getDownloadUrl: () => window.location.href
          });
          setInterval(() => {
            if (window.location.href.indexOf("/shorts/") !== -1) hud.enable(); else hud.disable();
          }, 800);
        },
        run() { this.generate(); this.generateShorts(); },
        start() { if (/youtube\.com/.test(window.location.host)) this.run(); }
      };
    
      // ========== TikTok Downloader ==========
      const TiktokDownloader = {
        extractLastDashNumber(str) { if (!str) return null; const m = str.match(/-(\d+)$/); return m ? m[1] : null; },
        getPlayUrl(target) {
          const container = CommonUtils.findParentByClassContains(target, "xgplayer-container", 5);
          if (container && container.getAttribute("id")) {
            const playId = this.extractLastDashNumber(container.getAttribute("id"));
            if (playId) return "https://www.tiktok.com/@_/video/" + playId;
          }
          return window.location.href.split("?")[0];
        },
        run() {
          const hud = DownloadHud.mountVideoHoverDownload({ getDownloadUrl: (target) => this.getPlayUrl(target) });
          const updatePos = () => {
            const pn = window.location.pathname;
            if (/^\/@[^/]+$/.test(pn)) hud.setButtonPosition("bottom-center");
            else if (/\/@[^/]+\/video\/.+$/.test(pn)) hud.setButtonPosition(document.querySelector("[aria-label='Close']") ? "right-three-quarter" : "top-center");
            else hud.setButtonPosition("top-center");
          };
          CommonUtils.onLocationChange(updatePos); updatePos();
        },
        start() { if (/tiktok\.com/.test(window.location.host)) this.run(); }
      };
    
      // ========== Threads Downloader ==========
      const ThreadsDownloader = {
        downloadVideo(url) {
          CommonUtils.openInTab("https://www.tool77.com/" + CommonUtils.getSupportedLang() + "/v/downloader?url=" + encodeURIComponent(url));
        },
        run() {
          setInterval(() => {
            document.querySelectorAll("*[data-pressable-container='true']:not([detectvs='true'])").forEach((el) => {
              if (el.querySelector("video") === null) return;
              el.setAttribute("detectvs", "true");
              const buttons = el.querySelectorAll("*[role='button']");
              if (buttons.length <= 1) return;
              let btnsWithNum = Array.from(buttons).filter((b) => /\d/.test(b.textContent || ""));
              if (btnsWithNum.length === 0) btnsWithNum = buttons;
              const lastBtn = btnsWithNum[btnsWithNum.length - 1];
              const shareBtn = lastBtn.parentElement;
              const dlBtn = shareBtn.cloneNode(false);
              dlBtn.appendChild(CommonUtils.genrateDownloadSvg("#505050", 20, 20));
              dlBtn.style.cursor = "pointer";
              shareBtn.insertAdjacentElement("afterend", dlBtn);
              dlBtn.addEventListener("click", (e) => {
                e.stopPropagation(); e.preventDefault();
                let link = "";
                el.querySelectorAll("a[role='link']").forEach((a) => { if (a.getAttribute("href").indexOf("/post/") !== -1) link = "https://www.threads.com" + a.getAttribute("href"); });
                if (!!link) this.downloadVideo(link); else this.downloadVideo(window.location.href);
              });
            });
          }, 777);
        },
        start() { if (/threads\.com/.test(window.location.host)) this.run(); }
      };
    
      // ========== Twitter/X Downloader ==========
      const TwitterDownloader = {
        svg: '<g class="download"><path d="M11.99 16l-5.7-5.7L7.7 8.88l3.29 3.3V2.59h2v9.59l3.3-3.3 1.41 1.42-5.71 5.7zM21 15l-.02 3.51c0 1.38-1.12 2.49-2.5 2.49H5.5C4.11 21 3 19.88 3 18.5V15h2v3.5c0 .28.22.5.5.5h12.98c.28 0 .5-.22.5-.5L19 15h2z"/></g>',
        extractStatusId: (url) => url ? (url.match(/\/status\/(\d+)/) || [null, null])[1] : null,
        downloadVideo(statusIds) {
          CommonUtils.openInTab("https://www.tool77.com/" + CommonUtils.getSupportedLang() + "/v/downloader?url=https%3A%2F%2Fx.com/_/status/" + statusIds);
        },
        addButtonTo(article) {
          if (article.dataset.detected) return;
          article.dataset.detected = "true";
          const statusIds = Array.from(article.querySelectorAll('a[href*="/status/"]')).map((el) => this.extractStatusId(el.href)).filter((id) => id);
          if (statusIds.length === 0) return;
          const mediaSel = ['div[role="progressbar"]', 'button[data-testid="playButton"]', 'div[data-testid="videoComponent"]', 'a[href="/settings/content_you_see"]', "div.media-image-container", "div.media-preview-container"];
          const hasMedia = article.querySelector(mediaSel.join(","));
          if (hasMedia) {
            const btnGroup = article.querySelector('div[role="group"]:last-of-type, ul.tweet-actions, ul.tweet-detail-actions');
            if (btnGroup) {
              const btnShare = Array.from(btnGroup.querySelectorAll(":scope>div>div, li.tweet-action-item>a, li.tweet-detail-action-item>a")).pop().parentNode;
              const btnDl = btnShare.cloneNode(true);
              btnDl.classList.add("aio-twitter-down"); btnDl.style.marginLeft = "10px"; btnDl.style.cursor = "pointer";
              btnDl.querySelector("button")?.removeAttribute("disabled");
              const svgCont = btnDl.querySelector("svg");
              if (svgCont) svgCont.innerHTML = this.svg;
              btnGroup.insertBefore(btnDl, btnShare.nextSibling);
              btnDl.onclick = () => this.downloadVideo(statusIds);
            }
          }
        },
        injectStyles() {
          if (document.getElementById("aio-twitter-style")) return;
          const s = document.createElement("style"); s.id = "aio-twitter-style";
          s.textContent = `.aio-twitter-down{margin-left:12px;order:99}.aio-twitter-down:hover svg{color:rgba(29,161,242,1)}.aio-twitter-down.aio-twitter-media{position:absolute;right:0}.aio-twitter-down.aio-twitter-media>div{display:flex;border-radius:99px;margin:2px}.aio-twitter-down.aio-twitter-media:hover>div{background-color:rgba(255,255,255,.6)}`;
          document.head.appendChild(s);
        },
        run() {
          this.injectStyles();
          new MutationObserver((mutations) => {
            mutations.forEach((m) => m.addedNodes.forEach((node) => { if (node.nodeType === 1) { let art = node.tagName === "ARTICLE" ? node : node.closest?.("article"); if (art) this.addButtonTo(art); } }));
          }).observe(document.body, { childList: true, subtree: true });
        },
        start() { if (/(twitter|x)\.com/.test(window.location.host)) this.run(); }
      };
    
      // ========== Instagram Downloader ==========
      const InstagramDownloader = {
        getPlayUrl(target) {
          const clean = (u) => String(u).split("?")[0];
          const article = target?.closest?.("article");
          if (article) {
            const href = article.querySelector('a[href*="/p/"], a[href*="/reels/"], a[href*="/reel/"]')?.getAttribute("href");
            if (href) return clean(window.location.origin + href);
          }
          return clean(window.location.href);
        },
        run() { DownloadHud.mountVideoHoverDownload({ getDownloadUrl: (target) => this.getPlayUrl(target) }); },
        start() { if (/instagram\.com/.test(window.location.host)) this.run(); }
      };
    
      // ========== Douyin Downloader ==========
      const DouyinDownloader = {
        downloadVideo() { CommonUtils.openInTab("https://www.tool77.com/zh-CN/v/downloader?url=" + encodeURIComponent(window.location.href)); },
        generate() {
          document.querySelectorAll(".xg-inner-controls:not([downloaderx='true'])").forEach((ctrl) => {
            ctrl.setAttribute("downloaderx", "true");
            const rightGrid = ctrl.querySelector(".xg-right-grid");
            if (rightGrid) {
              const fs = rightGrid.querySelector(".xgplayer-fullscreen");
              if (fs) {
                const dl = fs.cloneNode(false);
                dl.style.cssText = "display:flex;align-items:center;justify-content:center;margin:0 7px";
                dl.appendChild(CommonUtils.genrateDownloadSvg("#FFF", 20, 20));
                rightGrid.before(dl);
                dl.addEventListener("click", () => this.downloadVideo());
              }
            }
          });
        },
        start() { if (/douyin\.com/.test(window.location.host)) setInterval(() => this.generate(), 777); }
      };
    
      // ========== XiaoHongShu Downloader ==========
      const XiaoHongShuDownloader = {
        downloadVideo() { CommonUtils.openInTab("https://www.tool77.com/zh-CN/v/downloader?url=" + encodeURIComponent(window.location.href)); },
        generate() {
          if (!/www\.xiaohongshu\.com\/explore\//.test(window.location.href)) return;
          const nc = document.querySelector("#noteContainer");
          if (!nc || nc.querySelector("*[x-add='true']")) return;
          const mc = nc.querySelector(".media-container");
          if (!mc) return;
          const rid = Math.floor(1e5 + Math.random() * 9e5);
          const ss = document.createElement('style');
          ss.textContent = `.sc-download-${rid}{cursor:pointer;justify-content:center;align-items:center;width:40px;height:40px;z-index:99999;position:absolute;right:55px;top:10px;border-radius:50%;display:flex}`;
          document.head.appendChild(ss);
          const de = document.createElement("div"); de.setAttribute("x-add", "true"); de.className = `sc-download-${rid}`;
          de.appendChild(CommonUtils.genrateDownloadSvg("#FFF")); de.style.cursor = "pointer";
          mc.appendChild(de);
          de.addEventListener("click", () => this.downloadVideo());
        },
        start() { if (/xiaohongshu\.com/.test(window.location.host)) setInterval(() => this.generate(), 777); }
      };
    
      // ========== Facebook Downloader ==========
      const FacebookDownloader = {
        getPlayUrl() {
          const clean = (u) => String(u).split("&")[0];
          const extractId = (u) => String(u).match(/(?:v=|\/videos\/|\/reel\/|\/reels\/)(\d+)/)?.[1];
          const id = extractId(window.location.href);
          if (id) return "https://www.facebook.com/reel/" + id;
          return clean(window.location.href);
        },
        run() {
          const hud = DownloadHud.mountVideoHoverDownload({ buttonEdgeOffset: 10, getDownloadUrl: () => this.getPlayUrl() });
          setInterval(() => {
            if (/\.facebook\.com\/(reel|reels|videos)\//.test(window.location.href)) hud.enable(); else hud.disable();
          }, 700);
        },
        start() { if (/facebook\.com/.test(window.location.host)) this.run(); }
      };
    
      // ========== Pinterest Downloader ==========
      const PinterestDownloader = {
        getPlayUrl(target) {
          const a = target.closest('a[href*="/pin/"]');
          return a ? a.href : window.location.href;
        },
        run() { DownloadHud.mountVideoHoverDownload({ getDownloadUrl: (target) => this.getPlayUrl(target) }); },
        start() { if (/pinterest\.com/.test(window.location.host)) this.run(); }
      };
    
      // ========== Snapchat Downloader ==========
      const SnapchatDownloader = {
        run() {
          const hud = DownloadHud.mountVideoHoverDownload({ getDownloadUrl: async () => window.location.href });
          const patterns = [/^https:\/\/www\.snapchat\.com\/@[^/]+\/[^/?]+(\?.*)?$/i, /^https:\/\/www\.snapchat\.com\/(@[^/]+\/)?spotlight\/[^/?]+(\?.*)?$/i, /^https:\/\/www\.snapchat\.com\/p\/[^/]+\/[^/?]+(\?.*)?$/i];
          const upd = () => { patterns.some((r) => r.test(window.location.href)) ? hud.enable() : hud.disable(); };
          CommonUtils.onLocationChange(upd); upd();
        },
        start() { if (/snapchat\.com/.test(window.location.host)) this.run(); }
      };
    
      // ========== TED Downloader ==========
      const TedDownloader = {
        injectStyle(cls) {
          const s = document.createElement('style');
          s.textContent = `.${cls}{cursor:pointer;justify-content:center;align-items:center;width:40px;height:40px;z-index:999999;position:relative;border-radius:50%;display:flex}`;
          document.head.appendChild(s);
        },
        createBtn(cls) {
          const de = document.createElement("div"); de.setAttribute("x-add", "true"); de.className = cls; de.style.cursor = "pointer";
          de.appendChild(CommonUtils.genrateDownloadSvg("#000"));
          de.addEventListener("click", () => CommonUtils.downloaderEvent(window.location.href));
          return de;
        },
        injectIfNeeded(cls) {
          if (!/www\.ted\.com\/talks\//.test(window.location.href) || document.querySelector("." + cls)) return;
          const transcript = document.querySelector("#transcript-control");
          const ac = transcript?.parentNode?.querySelector(".items-center");
          if (ac) ac.appendChild(this.createBtn(cls));
        },
        start() {
          if (/ted\.com/.test(window.location.host)) {
            const cls = "sc-dl-" + Math.floor(1e5 + Math.random() * 9e5);
            this.injectStyle(cls);
            const doInject = () => this.injectIfNeeded(cls);
            new MutationObserver(doInject).observe(document.documentElement, { childList: true, subtree: true });
            CommonUtils.onLocationChange(doInject); doInject();
          }
        }
      };
    
      // ========== Initialize all downloaders ==========
      [
        YouTubeDownloader, TiktokDownloader, ThreadsDownloader, TwitterDownloader,
        InstagramDownloader, DouyinDownloader, XiaoHongShuDownloader,
        FacebookDownloader, PinterestDownloader, SnapchatDownloader, TedDownloader
      ].forEach(m => m.start());
    
      return {
        ok: true,
        summary: "All-in-One Video Downloader 已注入当前页面。支持 YouTube、TikTok、Instagram、X/Twitter、抖音、小红书、Facebook、Threads、Pinterest、Snapchat、TED 等平台。鼠标悬停在视频上会显示下载按钮。",
        changed_count: 11,
        data: { platforms: ["YouTube", "TikTok", "Instagram", "X/Twitter", "Douyin", "XiaoHongShu", "Facebook", "Threads", "Pinterest", "Snapchat", "TED"] },
        warnings: []
      };
    }
  );
  if (typeof __tabOriginalFunction !== "function") {
    throw new Error("evaluate_script source must evaluate to a function");
  }
  return await __tabOriginalFunction(__tabScriptArgs);
})();