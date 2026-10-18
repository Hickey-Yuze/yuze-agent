(function newtabLogoRotateCDP() {
  const BASE_ROTATION = 45;

  function calculateRotation(charCount) {
    if (charCount <= 0) return 0;
    let totalRotation = 0;
    for (let i = 1; i <= charCount; i++) {
      const baseForChar = BASE_ROTATION / Math.log(i + Math.E);
      const dampingDivisor = Math.sqrt(1 + totalRotation / 180);
      totalRotation += baseForChar / dampingDivisor;
    }
    return Math.round(totalRotation * 100) / 100;
  }

  function getCharCount(editorEl) {
    if (!editorEl) return 0;
    const text = editorEl.innerText ?? editorEl.textContent ?? "";
    return text.replace(/\n$/, "").length;
  }

  function findLogoRotationEl() {
    const themeLogo = document.querySelector(".theme-logo");
    return themeLogo?.parentElement ?? null;
  }

  function findProseMirrorEditor() {
    return document.querySelector(".ProseMirror");
  }

  let currentAngle = 0;
  let runningAnim = null;


  function readCurrentAngleFromAnim(logoEl) {
    if (!runningAnim) return currentAngle;
    const computed = getComputedStyle(logoEl).transform;
    if (!computed || computed === "none") return currentAngle;
    const mat = new DOMMatrix(computed);
    const raw = Math.atan2(mat.b, mat.a) * (180 / Math.PI);
    const diff = raw - (currentAngle % 360);
    const normalizedDiff = ((diff + 540) % 360) - 180;
    return currentAngle + normalizedDiff;
  }

  function animateToAngle(logoEl, targetAngle) {
    const from = runningAnim ? readCurrentAngleFromAnim(logoEl) : currentAngle;

    if (runningAnim) {
      runningAnim.onfinish = null;
      runningAnim.cancel();
      runningAnim = null;
    }


    currentAngle = from;
    logoEl.style.transform = `rotate(${from}deg)`;
    logoEl.style.transformOrigin = "center center";

    const to = -targetAngle; // 逆时针：负号

    if (Math.abs(to - from) < 0.1) {
      currentAngle = to;
      return;
    }

    const isReleasing = targetAngle === 0 && Math.abs(from) > 90;
    const duration = isReleasing ? 900 : 200;
    const easing = isReleasing
      ? "cubic-bezier(0.16, 1, 0.3, 1)"   // 先急后缓，发条释放感
      : "cubic-bezier(0.25, 0.46, 0.45, 0.94)"; // 快速跟随

    const anim = logoEl.animate(
      [
        { transform: `rotate(${from}deg)` },
        { transform: `rotate(${to}deg)` },
      ],
      { duration, easing, fill: "forwards" }
    );

    anim.onfinish = () => {
      currentAngle = to;
      runningAnim = null;
      logoEl.style.transform = `rotate(${to}deg)`;
      anim.cancel();
    };

    runningAnim = anim;
  }

  // let debounceTimer = null;
  // function scheduleUpdate(logoEl, editor) {
  //   if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null; }
  //   debounceTimer = setTimeout(() => {
  //     debounceTimer = null;
  //     const count = getCharCount(editor);
  //     const rotation = calculateRotation(count);
  //     animateToAngle(logoEl, rotation);
  //   }, 80);
  // }

  function doUpdate(logoEl, editor) {
    const count = getCharCount(editor);
    const rotation = calculateRotation(count);
    animateToAngle(logoEl, rotation);
  }

  function takeoverFromGSAP(logoEl) {
    if (window.gsap && window.gsap.killTweensOf) {
      window.gsap.killTweensOf(logoEl);
    }
    const computed = getComputedStyle(logoEl).transform;
    if (computed && computed !== "none") {
      const mat = new DOMMatrix(computed);
      currentAngle = Math.atan2(mat.b, mat.a) * (180 / Math.PI);
    }
    logoEl.style.transform = `rotate(${currentAngle}deg)`;
    logoEl.style.transformOrigin = "center center";
  }

  function setupObserver() {
    const editor = findProseMirrorEditor();
    const logoEl = findLogoRotationEl();

    if (!editor) {
      console.warn("[newtab-logo-rotate] 未找到 ProseMirror 编辑器，将在 500ms 后重试");
      setTimeout(setupObserver, 500);
      return;
    }

    if (!logoEl) {
      console.warn("[newtab-logo-rotate] 未找到 Logo 旋转元素 (.theme-logo 的父节点)");
      return;
    }

    takeoverFromGSAP(logoEl);

    let isComposing = false;

    const onCompositionStart = () => { isComposing = true; };
    const onCompositionEnd = () => {
      isComposing = false;
      doUpdate(logoEl, editor);
    };

    // MutationObserver：非 IME 输入时实时触发
    const onMutation = () => {
      if (isComposing) return;
      doUpdate(logoEl, editor);
    };

    const onInput = () => {
      if (isComposing) return;
      doUpdate(logoEl, editor);
    };

    const onPaste = () => setTimeout(() => doUpdate(logoEl, editor), 50);

    const observer = new MutationObserver(onMutation);
    observer.observe(editor, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    editor.addEventListener("compositionstart", onCompositionStart);
    editor.addEventListener("compositionend", onCompositionEnd);
    editor.addEventListener("input", onInput);
    editor.addEventListener("paste", onPaste);

    // 立即同步一次
    doUpdate(logoEl, editor);

    return function disconnect() {
      observer.disconnect();
      editor.removeEventListener("compositionstart", onCompositionStart);
      editor.removeEventListener("compositionend", onCompositionEnd);
      editor.removeEventListener("input", onInput);
      editor.removeEventListener("paste", onPaste);
      if (runningAnim) {
        runningAnim.cancel();
        runningAnim = null;
      }
      logoEl.style.transform = "";
    };
  }

  if (typeof window !== "undefined") {
    if (window.__newtabLogoRotateDisconnect) {
      window.__newtabLogoRotateDisconnect();
      window.__newtabLogoRotateDisconnect = null;
      console.log("[newtab-logo-rotate] 已停止，Logo 控制权已归还 React");
      return;
    }
    const disconnect = setupObserver();
    if (disconnect) {
      window.__newtabLogoRotateDisconnect = disconnect;
      console.log("[newtab-logo-rotate] 已启动：输入框文字将驱动 Logo 旋转（发条模式）");
    }
  }
})()