(async function __tabEvaluateScriptBridge() {
  const __tabScriptArgs = null;
  const __tabOriginalFunction = (
    () => {
      // ============================================================
      // 🚀 一键标记 test/md 文件 — 最终版
      //
      // 工作原理（无需切换文件视图！）：
      // 1. 从 Vue 组件的 fileArray 直接读取所有73个文件列表
      // 2. 过滤出 .test.ts、.test.tsx 和 .md 结尾的文件
      // 3. 劫持 reviewVm.path，批量调用 reviewedPrFile() → 直接 POST 后端 API
      // 4. 折叠：通过 Vue 响应式数据直接修改 isCollapsed，无需点击 fold-button
      //
      // 整个过程约 3~5 秒，不切换页面，不操作 DOM
      // ============================================================
    
      // 清除所有旧版按钮
      ['__auto-mark-test-md-btn__', '__auto-mark-v2__', '__auto-mark-v3__',
       '__auto-mark-v4__', '__auto-mark-final__', '__auto-mark-final-v5__'].forEach(id => {
        document.getElementById(id)?.remove();
      });
    
      const BTN_ID  = '__auto-mark-final-v6__';
      const STS_ID  = '__ams-status__';
      const POSITION_KEY = '__auto-mark-position-v6__';
      const CLEANUP_KEY = '__autoMarkDragCleanupV6__';
      const DRAG_THRESHOLD = 4;
      const BUTTON_TRANSITION = 'box-shadow .15s, transform .1s';
      try { window[CLEANUP_KEY]?.(); } catch {}
      document.getElementById(BTN_ID)?.remove();
    
      // ── 工具 ──────────────────────────────────────────────────
    
      const sleep = ms => new Promise(r => setTimeout(r, ms));

      let reclampButton = () => {};
    
      const setStatus = (text, color = '#fff') => {
        const el = document.getElementById(STS_ID);
        if (el) { el.textContent = text; el.style.color = color; }
        console.log('[AutoMark]', text);
        reclampButton();
      };
    
      const isTarget = path => {
        const p = String(path || '').toLowerCase();
        return p.endsWith('.test.ts') || p.endsWith('.test.tsx') || p.endsWith('.md');
      };
    
      const getVm = el => {
        for (const k of Object.keys(el || {})) {
          if (k.startsWith('__vue') || k === '__vueParentComponent') {
            return el[k]?.ctx || el[k];
          }
        }
        return null;
      };
    
      const findVm = (el, pred, max = 25) => {
        for (let i = 0; i < max && el; i++, el = el.parentElement) {
          const vm = getVm(el);
          if (vm && pred(vm)) return vm;
        }
      };
    
      // 从文件对象提取路径字符串
      // 结构：fileArray[i].item.path.toString（字符串属性，非函数）
      const getPathStr = f =>
        f?.item?.path?.toString
        || f?.item?.path?.components?.join('/')
        || f?.path?.toString
        || f?.components?.join('/')
        || String(f?.path || '');
    
      // ── 创建悬浮按钮 ──────────────────────────────────────────
    
      const btn = document.createElement('button');
      btn.id = BTN_ID;
      btn.innerHTML = `
        <span>一键标记 test/md</span>
        <span id="${STS_ID}" style="
          margin-left:8px; font-size:11px; font-weight:400;
          max-width:260px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
        "></span>
      `;
      Object.assign(btn.style, {
        position: 'fixed', top: '108px', right: '20px', zIndex: '2147483647',
        background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
        color: '#fff', border: '1px solid rgba(255,255,255,.2)',
        borderRadius: '8px', padding: '7px 14px', cursor: 'pointer',
        fontFamily: '-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif',
        fontSize: '13px', fontWeight: '600',
        boxShadow: '0 4px 18px rgba(99,102,241,.5)',
        display: 'flex', alignItems: 'center', whiteSpace: 'nowrap',
        userSelect: 'none', touchAction: 'none', transition: BUTTON_TRANSITION,
      });
      btn.onmouseenter = () => {
        btn.style.transform = 'translateY(-1px)';
        btn.style.boxShadow = '0 6px 24px rgba(99,102,241,.75)';
      };
      btn.onmouseleave = () => {
        btn.style.transform = '';
        btn.style.boxShadow = '0 4px 18px rgba(99,102,241,.5)';
      };
      document.body.appendChild(btn);

      // ── 拖拽与位置持久化 ──────────────────────────────────────

      let running = false;
      let dragState = null;
      let suppressClick = false;
      let hasCustomPosition = false;

      const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

      const clampPosition = (left, top) => ({
        left: clamp(left, 0, Math.max(0, window.innerWidth - btn.offsetWidth)),
        top: clamp(top, 0, Math.max(0, window.innerHeight - btn.offsetHeight)),
      });

      const applyPosition = (left, top) => {
        const position = clampPosition(left, top);
        btn.style.left = `${position.left}px`;
        btn.style.top = `${position.top}px`;
        btn.style.right = 'auto';
        return position;
      };

      const getCurrentPosition = () => {
        const rect = btn.getBoundingClientRect();
        const styleLeft = Number.parseFloat(btn.style.left);
        const styleTop = Number.parseFloat(btn.style.top);
        return {
          left: Number.isFinite(styleLeft) ? styleLeft : rect.left,
          top: Number.isFinite(styleTop) ? styleTop : rect.top,
        };
      };

      const savePosition = position => {
        try {
          window.localStorage?.setItem(POSITION_KEY, JSON.stringify(position));
        } catch {}
      };

      const restorePosition = () => {
        try {
          const raw = window.localStorage?.getItem(POSITION_KEY);
          if (!raw) return;
          const position = JSON.parse(raw);
          if (!Number.isFinite(position?.left) || !Number.isFinite(position?.top)) return;
          const restored = applyPosition(position.left, position.top);
          hasCustomPosition = true;
          if (restored.left !== position.left || restored.top !== position.top) {
            savePosition(restored);
          }
        } catch {}
      };

      reclampButton = () => {
        if (!hasCustomPosition) return;
        const current = getCurrentPosition();
        savePosition(applyPosition(current.left, current.top));
      };

      const handleResize = () => reclampButton();

      restorePosition();
      window.addEventListener('resize', handleResize);
      window[CLEANUP_KEY] = () => window.removeEventListener('resize', handleResize);

      btn.addEventListener('pointerdown', event => {
        if (running || event.isPrimary === false || event.button !== 0) return;
        const rect = btn.getBoundingClientRect();
        dragState = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          startLeft: rect.left,
          startTop: rect.top,
          dragging: false,
        };
        btn.setPointerCapture?.(event.pointerId);
      });

      btn.addEventListener('pointermove', event => {
        if (!dragState || event.pointerId !== dragState.pointerId) return;
        const dx = event.clientX - dragState.startX;
        const dy = event.clientY - dragState.startY;
        if (!dragState.dragging && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;

        if (!dragState.dragging) {
          dragState.dragging = true;
          btn.style.cursor = 'grabbing';
          btn.style.transition = 'none';
          btn.style.transform = '';
        }
        event.preventDefault();
        applyPosition(dragState.startLeft + dx, dragState.startTop + dy);
      });

      const finishDrag = event => {
        if (!dragState || event.pointerId !== dragState.pointerId) return;
        const wasDragging = dragState.dragging;
        const pointerId = dragState.pointerId;
        dragState = null;
        try { btn.releasePointerCapture?.(pointerId); } catch {}
        btn.style.cursor = running ? 'wait' : 'pointer';
        btn.style.transition = BUTTON_TRANSITION;

        if (!wasDragging) return;
        event.preventDefault();
        hasCustomPosition = true;
        savePosition(getCurrentPosition());
        suppressClick = true;
        setTimeout(() => { suppressClick = false; }, 0);
      };

      btn.addEventListener('pointerup', finishDrag);
      btn.addEventListener('pointercancel', finishDrag);
      btn.addEventListener('lostpointercapture', finishDrag);
    
      // ── 主逻辑 ────────────────────────────────────────────────
    
      btn.onclick = async () => {
        if (suppressClick) {
          suppressClick = false;
          return;
        }
        if (running) { setStatus('⏳ 运行中...', '#fde68a'); return; }
        running = true;
        btn.style.opacity = '.75';
        btn.style.cursor = 'wait';
    
        try {
          setStatus('🔍 读取文件列表...', '#e0e7ff');
    
          // ── Step 1: 找 fileArray ────────────────────────────────
          const cbEl = document.querySelector(
            '.file-reviewed-checkbox, input.mtd-checkbox-input'
          );
          if (!cbEl) throw new Error('请在 Diff 页面使用（未找到"已查看"元素）');
    
          const mainVm = findVm(cbEl, vm => {
            const d = vm.$data || {};
            return d.fileArray !== undefined || vm.fileArray !== undefined;
          }, 25);
          if (!mainVm) throw new Error('找不到 fileArray，请确保在 diff 页面');
    
          const fileArray = mainVm.$data?.fileArray || mainVm.fileArray;
          if (!fileArray?.length) throw new Error('fileArray 为空');
          console.log('[AutoMark] fileArray:', fileArray.length, '个文件');
    
          // ── Step 2: 过滤目标文件 ─────────────────────────────────
          const targets = fileArray.filter(f => isTarget(getPathStr(f)));
          console.log('[AutoMark] 目标文件:', targets.map(f => getPathStr(f)));
    
          if (!targets.length) {
            setStatus('😕 未发现 .test.ts / .md 文件', '#fca5a5');
            return;
          }
    
          // ── Step 3: 找 reviewVm（有 reviewedPrFile 方法）──────────
          const reviewVm = findVm(cbEl.parentElement, vm =>
            typeof (vm.$options?.methods?.reviewedPrFile ?? vm.reviewedPrFile) === 'function'
          , 15);
          if (!reviewVm) throw new Error('找不到 reviewedPrFile 方法');
    
          const reviewedPrFile = (
            reviewVm.$options?.methods?.reviewedPrFile || reviewVm.reviewedPrFile
          ).bind(reviewVm);
    
          const updatePrReviewItem = (
            reviewVm.$options?.methods?.updatePrReviewItem || reviewVm.updatePrReviewItem
          )?.bind(reviewVm);
    
          // ── Step 4: 找 prReviewList（跳过已标记的）──────────────
          const prlVm = findVm(cbEl, vm => {
            const d = vm.$data || {};
            return d.prReviewList !== undefined || vm.prReviewList !== undefined;
          }, 25);
          const getPRL = () => prlVm?.$data?.prReviewList || prlVm?.prReviewList || [];
    
          // ── Step 5: 找 collapse/fold 相关的 Vue 状态 ────────────
          // 用于折叠：fileArray[i].isCollapsed 或 reviewItem 父组件的 collapse 方法
          // 这里尝试直接修改 fileArray 项的 isCollapsed 属性（响应式）
          const tryCollapse = (fileObj) => {
            try {
              // 方式1：直接设置响应式 isCollapsed
              if ('isCollapsed' in fileObj) {
                fileObj.isCollapsed = true;
                return true;
              }
              // 方式2：通过 Vue.set 设置（Vue 2）
              if (window.Vue?.set) {
                window.Vue.set(fileObj, 'isCollapsed', true);
                return true;
              }
            } catch {}
            return false;
          };
    
          setStatus(`发现 ${targets.length} 个目标，调用 API 中...`, '#fde68a');
          await sleep(100);
    
          // ── Step 6: 批量处理 ──────────────────────────────────────
          let marked = 0, skipped = 0, failed = 0, collapsed = 0;
    
          for (let i = 0; i < targets.length; i++) {
            const file = targets[i];
            const pathStr = getPathStr(file);
            const basename = pathStr.split('/').pop();
    
            setStatus(`(${i + 1}/${targets.length}) ${basename}`, '#fde68a');
    
            // 检查是否已标记
            const prl = getPRL();
            const existing = prl.find(r => r.path === pathStr);
            const alreadyReviewed = existing?.reviewed || file?.reviewed || file?.reviewItem?.reviewed;
    
            if (!alreadyReviewed) {
              // 劫持 reviewVm.path → 调用后端 API
              try {
                Object.defineProperty(reviewVm, 'path', {
                  value: pathStr, configurable: true, writable: true,
                });
                await reviewedPrFile();
    
                // 同步 UI 进度状态
                if (updatePrReviewItem) {
                  updatePrReviewItem({
                    ...(reviewVm.$props?.reviewItem || {}),
                    path: pathStr,
                    reviewed: true,
                    updatedAt: Date.now(),
                  });
                }
                marked++;
              } catch (e) {
                console.warn('[AutoMark] 标记失败:', pathStr, e?.message);
                failed++;
              } finally {
                try { delete reviewVm.path; } catch {}
              }
              await sleep(180);
            } else {
              skipped++;
            }
    
            // 折叠（响应式修改 isCollapsed）
            if (tryCollapse(file)) collapsed++;
            // 也尝试折叠 item 属性内
            if (file.item && tryCollapse(file.item)) collapsed++;
          }
    
          // ── 完成 ───────────────────────────────────────────────
          const parts = [];
          if (marked > 0)    parts.push(`✅ 标记 ${marked} 个`);
          if (skipped > 0)   parts.push(`⏭ 已有 ${skipped} 个`);
          if (collapsed > 0) parts.push(`📁 折叠 ${collapsed} 个`);
          if (failed > 0)    parts.push(`❌ 失败 ${failed} 个`);
          setStatus(parts.join(' · ') || '✅ 完成', '#86efac');
    
        } catch (err) {
          console.error('[AutoMark]', err);
          setStatus(`❌ ${err.message?.slice(0, 60)}`, '#fca5a5');
        } finally {
          btn.style.opacity = '1';
          btn.style.cursor = 'pointer';
          running = false;
        }
      };
    
      console.log('[AutoMark v6] ✅ 已注入，等待点击');
      return {
        ok: true,
        msg: '🚀 已注入「一键标记 test/md」按钮！\n直接调用 Vue 实例方法 + 后端 API，无需切换文件视图，秒级完成。',
      };
    }
  );
  if (typeof __tabOriginalFunction !== "function") {
    throw new Error("evaluate_script source must evaluate to a function");
  }
  return await __tabOriginalFunction();
})();