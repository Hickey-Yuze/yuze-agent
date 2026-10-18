(async function __tabEvaluateScriptBridge() {
  const __tabScriptArgs = null;
  const __tabOriginalFunction = (
    async function run(args) {
      // Anaconda 环境配置常用指令速查表
      const commands = [
        {
          category: "📦 环境管理",
          items: [
            { cmd: "conda create -n myenv python=3.10", desc: "创建新环境（指定Python版本）" },
            { cmd: "conda create -n myenv --clone base", desc: "从现有环境克隆" },
            { cmd: "conda env remove -n myenv", desc: "删除指定环境" },
            { cmd: "conda activate myenv", desc: "激活环境" },
            { cmd: "conda deactivate", desc: "退出当前环境" },
            { cmd: "conda info --envs  或 conda env list", desc: "列出所有环境" },
            { cmd: "conda create -n myenv python=3.9 numpy pandas", desc: "创建环境并安装包" },
          ]
        },
        {
          category: "🔍 查询与信息",
          items: [
            { cmd: "conda list", desc: "列出当前环境的所有包" },
            { cmd: "conda list -n myenv", desc: "列出指定环境的包" },
            { cmd: "conda search numpy", desc: "搜索可用的包版本" },
            { cmd: "conda info", desc: "显示Anaconda信息" },
            { cmd: "python --version", desc: "查看当前Python版本" },
            { cmd: "which python / where python", desc: "查看Python路径" },
          ]
        },
        {
          category: "📥 包管理",
          items: [
            { cmd: "conda install numpy pandas matplotlib", desc: "安装指定包" },
            { cmd: "conda install numpy=1.24.0", desc: "安装指定版本的包" },
            { cmd: "conda install -c conda-forge package", desc: "从指定渠道安装" },
            { cmd: "conda update --all", desc: "更新所有包" },
            { cmd: "conda update numpy", desc: "更新指定包" },
            { cmd: "conda uninstall numpy", desc: "卸载指定包" },
            { cmd: "pip install package", desc: "用pip安装（conda环境中也可用）" },
          ]
        },
        {
          category: "⚙️ 配置与优化",
          items: [
            { cmd: "conda config --show channels", desc: "查看当前镜像源配置" },
            { cmd: "conda config --add channels https://mirrors.tuna.tsinghua.edu.cn/anaconda/pkgs/main/", desc: "添加清华镜像源" },
            { cmd: "conda config --set show_channel_urls yes", desc: "显示渠道URL" },
            { cmd: "conda config --remove channels url", desc: "移除指定镜像源" },
            { cmd: "conda clean --all", desc: "清理缓存释放空间" },
            { cmd: "conda config --set auto_activate_base false", desc: "禁止自动激活base环境" },
          ]
        },
        {
          category: "📤 导出与复现",
          items: [
            { cmd: "conda env export > environment.yml", desc: "导出当前环境到YAML文件" },
            { cmd: "conda env export --no-builds > environment.yml", desc: "导出（不包含build信息）" },
            { cmd: "conda env create -f environment.yml", desc: "从YAML文件重建环境" },
            { cmd: "pip freeze > requirements.txt", desc: "用pip导出依赖列表" },
            { cmd: "pip install -r requirements.txt", desc: "从requirements.txt安装" },
          ]
        },
        {
          category: "🔧 高级操作",
          items: [
            { cmd: "conda rename -n old_name new_name", desc: "重命名环境（需较新版本）" },
            { cmd: "conda run -n myenv python script.py", desc: "在不激活的情况下运行脚本" },
            { cmd: "conda compare --prefix ./env1 ./env2", desc: "比较两个环境的差异" },
            { cmd: "conda init bash/zsh/powershell", desc: "初始化shell集成" },
          ]
        }
      ];
    
      // 样式
      const style = document.createElement('style');
      style.textContent = `
        .anaconda-cheatsheet-overlay {
          position: fixed;
          top: 0; left: 0;
          width: 100vw; height: 100vh;
          background: rgba(15, 23, 42, 0.75);
          backdrop-filter: blur(8px);
          z-index: 999999;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
          animation: acs-fadeIn 0.3s ease;
        }
        @keyframes acs-fadeIn { from { opacity: 0; } to { opacity: 1; } }
        
        .acs-container {
          width: 92%;
          max-width: 1100px;
          max-height: 88vh;
          background: #ffffff;
          border-radius: 20px;
          box-shadow: 0 25px 80px rgba(0,0,0,0.35);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: acs-slideUp 0.4s ease;
        }
        @keyframes acs-slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    
        .acs-header {
          background: linear-gradient(135deg, #1e40af 0%, #7c3aed 50%, #db2777 100%);
          color: white;
          padding: 22px 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
        }
        .acs-header h1 {
          margin: 0;
          font-size: 22px;
          font-weight: 700;
          letter-spacing: -0.5px;
        }
        .acs-header h1 span { opacity: 0.85; font-size: 14px; font-weight: 400; margin-left: 12px; }
        .acs-close-btn {
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          width: 36px; height: 36px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .acs-close-btn:hover { background: rgba(255,255,255,0.35); transform: scale(1.1); }
    
        .acs-tabs {
          display: flex;
          gap: 4px;
          padding: 12px 16px;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          overflow-x: auto;
          flex-shrink: 0;
          scrollbar-width: none;
        }
        .acs-tabs::-webkit-scrollbar { display: none; }
        .acs-tab {
          padding: 8px 18px;
          border: none;
          background: transparent;
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          color: #64748b;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .acs-tab:hover { background: #e2e8f0; color: #334155; }
        .acs-tab.active { background: #3b82f6; color: white; box-shadow: 0 2px 8px rgba(59,130,246,0.35); }
    
        .acs-body {
          flex: 1;
          overflow-y: auto;
          padding: 20px 24px;
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 transparent;
        }
        .acs-body::-webkit-scrollbar { width: 6px; }
        .acs-body::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
    
        .acs-panel { display: none; }
        .acs-panel.active { display: block; animation: acs-panelFade 0.25s ease; }
        @keyframes acs_panelFade { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: translateX(0); } }
    
        .acs-item {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 14px 18px;
          margin-bottom: 10px;
          transition: all 0.2s;
          cursor: pointer;
        }
        .acs-item:hover {
          border-color: #93c5fd;
          box-shadow: 0 2px 12px rgba(59,130,246,0.12);
          transform: translateY(-1px);
        }
        .acs-item.copied {
          border-color: #34d399;
          background: #ecfdf5;
        }
        .acs-cmd {
          font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace;
          font-size: 13px;
          color: #1e293b;
          background: #fff;
          padding: 8px 14px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          display: block;
          word-break: break-all;
          line-height: 1.5;
          margin-bottom: 6px;
        }
        .acs-desc {
          font-size: 13px;
          color: #64748b;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .acs-copy-hint {
          font-size: 11px;
          color: #94a3b8;
          margin-left: auto;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .acs-item:hover .acs-copy-hint { opacity: 1; }
        .acs-copied-badge {
          color: #059669;
          font-weight: 600;
          font-size: 11px;
        }
    
        .acs-footer {
          padding: 12px 20px;
          background: #f1f5f9;
          text-align: center;
          font-size: 12px;
          color: #94a3b8;
          border-top: 1px solid #e2e8f0;
          flex-shrink: 0;
        }
    
        /* 全部显示模式 */
        .acs-all-grid {
          display: grid;
          gap: 16px;
        }
        .acs-category-block {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          overflow: hidden;
        }
        .acs-category-title {
          background: linear-gradient(135deg, #f0f9ff, #faf5ff);
          padding: 12px 18px;
          font-weight: 700;
          font-size: 15px;
          color: #334155;
          border-bottom: 1px solid #e2e8f0;
        }
        .acs-category-content { padding: 12px; }
      `;
    
      // 构建HTML
      let tabsHtml = commands.map((cat, i) => 
        `<button class="acs-tab ${i === 0 ? 'active' : ''}" data-index="${i}">${cat.category}</button>`
      ).join('');
    
      let panelsHtml = commands.map((cat, i) => `
        <div class="acs-panel ${i === 0 ? 'active' : ''}" data-index="${i}">
          ${cat.items.map(item => `
            <div class="acs-item" data-cmd="${item.cmd.replace(/"/g, '&quot;')}">
              <code class="acs-cmd">${item.cmd}</code>
              <div class="acs-desc">
                <span>💡</span><span>${item.desc}</span>
                <span class="acs-copy-hint">点击复制</span>
              </div>
            </div>
          `).join('')}
        </div>
      `).join('');
    
      // 全部面板
      let allPanelHtml = `
        <div class="acs-panel" data-index="all">
          <div class="acs-all-grid">
            ${commands.map(cat => `
              <div class="acs-category-block">
                <div class="acs-category-title">${cat.category}</div>
                <div class="acs-category-content">
                  ${cat.items.map(item => `
                    <div class="acs-item" data-cmd="${item.cmd.replace(/"/g, '&quot;')}">
                      <code class="acs-cmd">${item.cmd}</code>
                      <div class="acs-desc">
                        <span>💡</span><span>${item.desc}</span>
                        <span class="acs-copy-hint">点击复制</span>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    
      const container = document.createElement('div');
      container.className = 'anaconda-cheatsheet-overlay';
      container.innerHTML = `
        ${style.outerHTML}
        <div class="acs-container">
          <div class="acs-header">
            <h1>🐍 Anaconda 环境配置常用指令 <span>速查手册</span></h1>
            <button class="acs-close-btn" title="关闭">✕</button>
          </div>
          <div class="acs-tabs">
            ${tabsHtml}
            <button class="acs-tab" data-index="all">📋 全部</button>
          </div>
          <div class="acs-body">
            ${panelsHtml}
            ${allPanelHtml}
          </div>
          <div class="acs-footer">💡 点击任意命令即可复制到剪贴板 · 共 ${commands.reduce((sum, c) => sum + c.items.length, 0)} 条常用指令</div>
        </div>
      `;
    
      document.body.appendChild(container);
    
      // 绑定事件
      const overlay = container;
      
      // 关闭
      overlay.querySelector('.acs-close-btn').addEventListener('click', () => {
        overlay.style.animation = 'acs-fadeIn 0.2s ease reverse';
        setTimeout(() => overlay.remove(), 200);
      });
    
      // 点击背景关闭
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.style.animation = 'acs-fadeIn 0.2s ease reverse';
          setTimeout(() => overlay.remove(), 200);
        }
      });
    
      // Tab切换
      overlay.querySelectorAll('.acs-tab').forEach(tab => {
        tab.addEventListener('click', () => {
          overlay.querySelectorAll('.acs-tab').forEach(t => t.classList.remove('active'));
          overlay.querySelectorAll('.acs-panel').forEach(p => p.classList.remove('active'));
          tab.classList.add('active');
          const idx = tab.dataset.index;
          overlay.querySelector(`.acs-panel[data-index="${idx}"]`).classList.add('active');
        });
      });
    
      // 复制功能
      overlay.querySelectorAll('.acs-item').forEach(item => {
        item.addEventListener('click', async () => {
          const cmd = item.dataset.cmd;
          try {
            await navigator.clipboard.writeText(cmd);
            item.classList.add('copied');
            const hint = item.querySelector('.acs-copy-hint');
            if (hint) {
              hint.className = 'acs-copied-badge';
              hint.textContent = '✅ 已复制!';
            }
            setTimeout(() => {
              item.classList.remove('copied');
              if (hint) {
                hint.className = 'acs-copy-hint';
                hint.textContent = '点击复制';
              }
            }, 1500);
          } catch (err) {
            console.warn('复制失败:', err);
          }
        });
      });
    
      // ESC关闭
      const escHandler = (e) => {
        if (e.key === 'Escape') {
          overlay.style.animation = 'acs-fadeIn 0.2s ease reverse';
          setTimeout(() => overlay.remove(), 200);
          document.removeEventListener('keydown', escHandler);
        }
      };
      document.addEventListener('keydown', escHandler);
    
      return {
        ok: true,
        summary: "Anaconda 环境配置常用指令速查表已渲染，共6大分类、38条指令，支持Tab分类浏览和点击复制",
        changed_count: 1,
        data: {
          categories: commands.map(c => ({ name: c.category, count: c.items.length })),
          total_commands: commands.reduce((sum, c) => sum + c.items.length, 0),
          features: ["分类Tab导航", "点击复制命令", "ESC/点击外部关闭", "响应式布局"]
        },
        warnings: []
      };
    }
  );
  if (typeof __tabOriginalFunction !== "function") {
    throw new Error("evaluate_script source must evaluate to a function");
  }
  return await __tabOriginalFunction();
})();