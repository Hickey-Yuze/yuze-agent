(function () {
    try {
      const BASE = "https://cdn.tab-browser.com/theme-skin/skin-theme-2026051801";
      const u = (file) => `url("${BASE}/${file}")`;
  
      window.__SKIN_THEME_CONFIG__ = {
        enabled: true,
        basePath: "https://cdn.tab-browser.com/theme-skin",
        theme: "skin-theme-2026051801",
        bubble: {
          imageUrl: BASE + "/bubble.png",
          imageWidth: 512,
          imageHeight: 448,
          sliceTop: 120,
          sliceRight: 130,
          sliceBottom: 100,
          sliceLeft: 140,
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
    background-image:
      radial-gradient(circle at 18px 18px, #9cd5f3 0 11px, transparent 11.5px),
      radial-gradient(circle at 54px 53px, #9cd5f3 0 11px, transparent 11.5px);
    background-repeat: repeat;
    background-color: #fff;
    background-position: -15px -11px;
    background-size: 72px 70px;
    opacity: 1;
    pointer-events: none;
    z-index: 0;
  }
  @keyframes pet-sway {
    0%, 100% { transform: rotate(-3deg); }
    50% { transform: rotate(3deg); }
  }
  @keyframes pet-hop {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    35% { transform: translateY(-18px) rotate(-4deg); }
    70% { transform: translateY(4px) rotate(4deg); }
  }
  .theme-pet {
    position: fixed;
    bottom: 80px;
    right: 24px;
    left: auto;
    width: 300px;
    height: 280px;
    background-image: ${u("pet.png")};
    background-repeat: no-repeat;
    background-position: top left;
    background-size: contain;
    z-index: 2147483000;
    --theme-pet-drag-rotate: 0deg;
    transform-origin: bottom center;
    animation: pet-sway 3s ease-in-out infinite;
    pointer-events: auto !important;
    cursor: grab;
    touch-action: none;
    user-select: none;
    -webkit-user-drag: none;
    will-change: transform, left, top;
  }
  .theme-pet.is-dragging {
    animation: none;
    cursor: grabbing;
    z-index: 2147483001;
    transform: rotate(var(--theme-pet-drag-rotate, 0deg));
  }
  .theme-pet.is-happy {
    animation: pet-hop 480ms cubic-bezier(0.2, 1.3, 0.32, 1);
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
    margin-right: -10px;
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
    margin: -10px 12px 0 8px;
    background-color: #dff1fd;
    padding-top: 10px !important;
  }
  .theme-input-content {
    margin: -30px -15px 0 -15px;
  }
  .theme-input-toolbar {
    width: auto !important;
    margin: -20px -10px -40px -20px;
  }
  .theme-input-container {
    border: none;
    box-shadow: none;
    background: transparent;
  }
  .theme-logo {
    background-image: ${u("logo.png")} !important;
    background-repeat: no-repeat;
    background-position: center;
    background-size: contain;
    width: 180px !important;
    height: 180px !important;
    min-width: 180px;
    min-height: 180px;
    margin-left: -40px !important;
    margin-top: -70px !important
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

      const setupThemePetInteractions = () => {
        const cleanupKey = "__skinThemePetCleanup__";
        if (window[cleanupKey]) {
          window[cleanupKey]();
        }

        const stateKey = "skin-theme-2026051801-pet-state-v3";
        const cleanupFns = [];
        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const addListener = (target, type, handler, options) => {
          target.addEventListener(type, handler, options);
          cleanupFns.push(() => target.removeEventListener(type, handler, options));
        };

        const readState = () => {
          try {
            const parsed = JSON.parse(localStorage.getItem(stateKey) || "null");
            if (parsed && Number.isFinite(parsed.x) && Number.isFinite(parsed.y)) {
              return { x: parsed.x, y: parsed.y };
            }
          } catch (e) {}
          return null;
        };

        const saveState = (state) => {
          try {
            localStorage.setItem(stateKey, JSON.stringify(state));
          } catch (e) {}
        };

        const getDefaultState = (pet) => {
          const width = pet.offsetWidth || 300;
          const height = pet.offsetHeight || 280;
          return {
            x: Math.max(24, window.innerWidth - width - 24),
            y: Math.max(0, window.innerHeight - height - 80),
          };
        };

        const constrainState = (pet, state) => {
          const width = pet.offsetWidth || 300;
          const height = pet.offsetHeight || 280;
          const maxX = Math.max(0, window.innerWidth - width);
          const maxY = Math.max(0, window.innerHeight - height);
          return {
            x: Math.round(clamp(Number(state.x) || 0, 0, maxX)),
            y: Math.round(clamp(Number(state.y) || 0, 0, maxY)),
          };
        };

        const applyState = (pet, state) => {
          const next = constrainState(pet, state);
          pet.style.left = `${next.x}px`;
          pet.style.top = `${next.y}px`;
          pet.style.right = "auto";
          pet.style.bottom = "auto";
          return next;
        };

        const pulse = (pet, className, duration) => {
          pet.classList.remove(className);
          void pet.offsetWidth;
          pet.classList.add(className);
          window.setTimeout(() => pet.classList.remove(className), duration);
        };

        const bindPet = (pet) => {
          if (pet.__skinThemePetBound__) return;
          pet.__skinThemePetBound__ = true;

          let state = applyState(pet, readState() || getDefaultState(pet));
          let gesture = null;
          let moved = false;

          pet.setAttribute("draggable", "false");
          if (!pet.hasAttribute("tabindex")) {
            pet.tabIndex = 0;
          }

          const resetPet = () => {
            state = applyState(pet, getDefaultState(pet));
            saveState(state);
            pulse(pet, "is-happy", 520);
          };

          addListener(pet, "pointerdown", (event) => {
            if (event.button !== 0) return;
            gesture = {
              pointerId: event.pointerId,
              startX: event.clientX,
              startY: event.clientY,
              startState: { ...state },
            };
            moved = false;
            pet.classList.add("is-dragging");
            if (pet.setPointerCapture) {
              try {
                pet.setPointerCapture(event.pointerId);
              } catch (e) {}
            }
            event.preventDefault();
          });

          addListener(window, "pointermove", (event) => {
            if (!gesture || event.pointerId !== gesture.pointerId) return;
            const dx = event.clientX - gesture.startX;
            const dy = event.clientY - gesture.startY;
            moved = moved || Math.abs(dx) + Math.abs(dy) > 4;

            state = applyState(pet, {
              x: gesture.startState.x + dx,
              y: gesture.startState.y + dy,
            });
            const rotate = clamp(dx / 18, -8, 8).toFixed(2);
            pet.style.setProperty("--theme-pet-drag-rotate", `${rotate}deg`);

            event.preventDefault();
          }, { passive: false });

          const endGesture = (event) => {
            if (!gesture || event.pointerId !== gesture.pointerId) return;
            if (pet.releasePointerCapture) {
              try {
                pet.releasePointerCapture(event.pointerId);
              } catch (e) {}
            }
            pet.classList.remove("is-dragging");
            pet.style.setProperty("--theme-pet-drag-rotate", "0deg");
            saveState(state);
            const wasClick = !moved;
            gesture = null;
            if (wasClick) {
              pulse(pet, "is-happy", 520);
            }
          };

          addListener(window, "pointerup", endGesture);
          addListener(window, "pointercancel", endGesture);

          addListener(pet, "dblclick", (event) => {
            event.preventDefault();
            resetPet();
          });

          addListener(pet, "keydown", (event) => {
            if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
              event.preventDefault();
              const step = event.shiftKey ? 24 : 8;
              state = applyState(pet, {
                x: state.x + (event.key === "ArrowRight" ? step : event.key === "ArrowLeft" ? -step : 0),
                y: state.y + (event.key === "ArrowDown" ? step : event.key === "ArrowUp" ? -step : 0),
              });
              saveState(state);
            }
          });

          cleanupFns.push(() => {
            pet.__skinThemePetBound__ = false;
            pet.classList.remove("is-dragging", "is-happy");
          });
        };

        const bindAllPets = () => {
          const pets = Array.from(document.querySelectorAll(".theme-pet"));
          pets.forEach(bindPet);
        };

        bindAllPets();

        const observer = new MutationObserver(bindAllPets);
        observer.observe(document.documentElement, { childList: true, subtree: true });
        cleanupFns.push(() => observer.disconnect());
        addListener(document, "DOMContentLoaded", bindAllPets);

        addListener(window, "resize", () => {
          document.querySelectorAll(".theme-pet").forEach((pet) => {
            const nextState = applyState(pet, readState() || getDefaultState(pet));
            saveState(nextState);
          });
        });

        window[cleanupKey] = () => {
          while (cleanupFns.length) {
            const cleanup = cleanupFns.pop();
            try {
              cleanup();
            } catch (e) {}
          }
          delete window[cleanupKey];
        };
      };
  
      const styleEl = document.createElement("style");
      styleEl.id = "injected-skin-theme-css";
      styleEl.type = "text/css";
      styleEl.textContent = cssText;
      const existingStyleEl = document.getElementById("injected-skin-theme-css");
      if (existingStyleEl) {
        existingStyleEl.remove();
      }
      document.head.appendChild(styleEl);
      setupThemePetInteractions();
      chrome.tabThemeColor.setDarkMode(false);
    } catch (e) {
      console.error("[Skin] 注入失败:", e);
    }
  })();