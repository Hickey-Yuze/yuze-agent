(function() {
  try {
    // 清理之前的脚本效果
    const cleanup = () => {
      document.querySelectorAll('.random-script-overlay').forEach(el => el.remove());
      document.body.style.cssText = document.body.getAttribute('data-original-style') || '';
    };
    // 保存原始样式
    if (!document.body.hasAttribute('data-original-style')) {
      document.body.setAttribute('data-original-style', document.body.style.cssText);
    }
    cleanup();

    // ========== 核心算法逻辑（完全对应 C++ 实现） ==========
    const calculate = (sjm) => {
      const e = 1;
      // 取第8位（索引7）做异或
      const bit7 = parseInt(sjm[7], 10);
      let o = bit7 ^ e;
      if (o > 7) o -= 8;

      const bitO = parseInt(sjm[o], 10);
      const n = ((bitO - o) + 10) % 10;

      // 生成 7 位 s 字符串
      let s = '';
      for (let i = 0; i < 7; i++) {
        if (i === o) {
          s += n.toString();
        } else {
          const bitI = parseInt(sjm[i], 10);
          s += ((bitI + 10 - n) % 10).toString();
        }
      }

      // 随机生成 0~6 的 c
      const c = Math.floor(Math.random() * 7);
      const a = parseInt(s[c], 10);

      // 生成 7 位 r 字符串
      let r = '';
      for (let i = 0; i < 7; i++) {
        const jia = i === c ? c : a;
        const bitSi = parseInt(s[i], 10);
        r += ((bitSi + jia) % 10).toString();
      }

      // 拼接最终 8 位结果
      return r + (e ^ c).toString();
    };

    // ========== 浮窗 UI（沿用打地鼠视觉风格） ==========
    const tool = document.createElement('div');
    tool.className = 'random-script-overlay';
    tool.innerHTML = `
      <style>
        @keyframes floatIn{from{opacity:0;transform:translate(-50%,-50%) scale(.8)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}
        .float-window{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-radius:30px;padding:30px;box-shadow:0 25px 60px rgba(0,0,0,.5);z-index:999999;animation:floatIn .4s ease-out;font-family:system-ui,-apple-system,sans-serif;pointer-events:auto;width:380px;box-sizing:border-box}
        .input-field{width:100%;padding:14px 18px;font-size:16px;border:none;border-radius:16px;outline:none;box-sizing:border-box;margin-bottom:20px;box-shadow:0 4px 12px rgba(0,0,0,.2)}
        .result-box{background:rgba(255,255,255,.15);backdrop-filter:blur(10px);border-radius:16px;padding:16px;color:#fff;font-size:18px;font-weight:bold;text-align:center;margin-bottom:20px;min-height:24px;word-break:break-all}
        .btn-primary{width:100%;padding:12px;font-size:17px;background:#fff;color:#667eea;border:none;border-radius:50px;cursor:pointer;font-weight:bold;box-shadow:0 8px 20px rgba(0,0,0,.25);transition:all .2s;margin-bottom:12px}
        .btn-primary:hover{transform:translateY(-2px);box-shadow:0 12px 30px rgba(0,0,0,.35)}
        .btn-close{width:100%;padding:10px;font-size:16px;background:rgba(255,255,255,.2);color:#fff;border:2px solid #fff;border-radius:50px;cursor:pointer;transition:all .3s}
        .btn-close:hover{background:rgba(255,255,255,.3)}
      </style>
      <div class="float-window">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
          <div style="color:#fff;font-size:24px;font-weight:800;text-shadow:0 4px 20px rgba(0,0,0,.4)">🔢 算法转换工具</div>
          <button id="close-float" style="width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,.2);border:none;color:#fff;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s">×</button>
        </div>
        <input id="input-sjm" class="input-field" placeholder="请输入 8 位数字字符串" maxlength="8" />
        <div id="result-box" class="result-box">等待输入计算...</div>
        <button id="calc-btn" class="btn-primary">计算结果</button>
        <button id="close-btn" class="btn-close">关闭</button>
      </div>
    `;
    document.body.appendChild(tool);

    // ========== 事件绑定 ==========
    const inputEl = document.getElementById('input-sjm');
    const resultEl = document.getElementById('result-box');
    const calcBtn = document.getElementById('calc-btn');
    const closeBtn = document.getElementById('close-btn');
    const closeX = document.getElementById('close-float');

    const closeTool = () => tool.remove();

    calcBtn.onclick = () => {
      const sjm = inputEl.value.trim();
      if (!/^\d{8}$/.test(sjm)) {
        resultEl.textContent = '⚠️ 请输入 8 位纯数字';
        resultEl.style.color = '#ff6b6b';
        return;
      }
      try {
        const result = calculate(sjm);
        resultEl.textContent = `输出结果：${result}`;
        resultEl.style.color = '#fff';
      } catch (err) {
        resultEl.textContent = '计算出错：' + err.message;
        resultEl.style.color = '#ff6b6b';
      }
    };

    // 回车快捷计算
    inputEl.onkeydown = (e) => {
      if (e.key === 'Enter') calcBtn.click();
    };

    closeBtn.onclick = closeTool;
    closeX.onclick = closeTool;

    return {
      success: true,
      timestamp: Date.now()
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
})();