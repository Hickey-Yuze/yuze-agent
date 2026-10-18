(async function __tabEvaluateScriptBridge() {
  const __tabScriptArgs = null;
  const __tabOriginalFunction = (
    /**
     * 安居客智能筛选工作流脚本
     * 功能：在安居客页面弹出筛选框，用户填写条件后自动跳转到筛选结果页
     * 
     * 使用方式：在安居客任意页面（如 https://shenzhen.anjuke.com/）的控制台或通过注入执行此脚本
     */
    
    async function run(args = {}) {
      // ========== 配置项 ==========
      const CONFIG = {
        city: args.city || 'shenzhen',           // 默认城市
        title: '安居客智能筛选',
        regions: [
          { value: '', label: '不限' },
          { value: 'nanshan', label: '南山' },
          { value: 'baoan', label: '宝安' },
          { value: 'longhua', label: '龙华' },
          { value: 'futian', label: '福田' },
          { value: 'longgang', label: '龙岗' },
          { value: 'luohu', label: '罗湖' },
          { value: 'yantian', label: '盐田' },
          { value: 'pingshan', label: '坪山' },
          { value: 'guangming', label: '光明' },
          { value: 'meilin', label: '梅林' },
          { value: 'dapeng', label: '大鹏新区' }
        ],
        priceRanges: [
          { value: '', label: '不限' },
          { value: 'm0-100', label: '100万以下' },
          { value: 'm13505', label: '100-150万' },
          { value: 'm150-200', label: '150-200万' },
          { value: 'm200-250', label: '200-250万' },
          { value: 'm250-300', label: '250-300万' },
          { value: 'm300-400', label: '300-400万' },
          { value: 'm400-500', label: '400-500万' },
          { value: 'm500-800', label: '500-800万' },
          { value: 'm800-1200', label: '800-1200万' },
          { value: 'm1200-1900', label: '1200-1900万' },
          { value: 'm1900-', label: '1900万以上' }
        ],
        areaRanges: [
          { value: '', label: '不限' },
          { value: 'a0-50', label: '50㎡以下' },
          { value: 'a50-60', label: '50-60㎡' },
          { value: 'a60-80', label: '60-80㎡' },
          { value: 'a80-90', label: '80-90㎡' },
          { value: 'a90-110', label: '90-110㎡' },
          { value: 'a110-130', label: '110-130㎡' },
          { value: 'a130-150', label: '130-150㎡' },
          { value: 'a150-200', label: '150-200㎡' },
          { value: 'a200-', label: '200㎡以上' }
        ],
        roomTypes: [
          { value: '', label: '不限' },
          { value: 'l1', label: '一室' },
          { value: 'l2', label: '二室' },
          { value: 'l3', label: '三室' },
          { value: 'l4', label: '四室' },
          { value: 'l5', label: '五室及以上' }
        ],
        tagOptions: [
          '近地铁',
          '满五年',
          '满二',
          '随时看房',
          '精装修',
          '南北通透',
          '电梯房',
          '学区房',
          '低总价',
          '急售'
        ]
      };
    
      // ========== 样式定义 ==========
      const styles = `
        .ajk-filter-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.6);
          z-index: 999998;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          animation: ajkFadeIn 0.3s ease-out;
        }
    
        @keyframes ajkFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
    
        @keyframes ajkSlideUp {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
    
        .ajk-filter-dialog {
          background: #fff;
          border-radius: 16px;
          width: 520px;
          max-width: 95vw;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          animation: ajkSlideUp 0.4s ease-out;
          position: relative;
        }
    
        .ajk-filter-header {
          padding: 24px 28px 16px;
          border-bottom: 1px solid #f0f0f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
    
        .ajk-filter-title {
          font-size: 20px;
          font-weight: 700;
          color: #1a1a1a;
          margin: 0;
        }
    
        .ajk-filter-close {
          width: 32px;
          height: 32px;
          border: none;
          background: #f5f5f5;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          color: #666;
          transition: all 0.2s;
        }
    
        .ajk-filter-close:hover {
          background: #e0e0e0;
          color: #333;
        }
    
        .ajk-filter-body {
          padding: 20px 28px 28px;
        }
    
        .ajk-form-group {
          margin-bottom: 18px;
        }
    
        .ajk-form-label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: #333;
          margin-bottom: 8px;
        }
    
        .ajk-form-label .required {
          color: #ff4d4f;
          margin-left: 3px;
        }
    
        .ajk-select,
        .ajk-input {
          width: 100%;
          height: 40px;
          border: 1px solid #d9d9d9;
          border-radius: 8px;
          padding: 0 12px;
          font-size: 14px;
          color: #333;
          outline: none;
          transition: all 0.2s;
          box-sizing: border-box;
          background: #fff;
        }
    
        .ajk-select:focus,
        .ajk-input:focus {
          border-color: #1890ff;
          box-shadow: 0 0 0 3px rgba(24, 144, 255, 0.1);
        }
    
        /* 自定义标签样式 */
        .ajk-tags-container {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          padding: 4px 0;
        }
    
        .ajk-tag-item {
          display: inline-flex;
          align-items: center;
          padding: 6px 14px;
          border: 1px solid #d9d9d9;
          border-radius: 20px;
          font-size: 13px;
          color: #555;
          cursor: pointer;
          user-select: none;
          transition: all 0.2s;
          background: #fafafa;
        }
    
        .ajk-tag-item:hover {
          border-color: #1890ff;
          color: #1890ff;
        }
    
        .ajk-tag-item.active {
          background: linear-gradient(135deg, #1890ff, #096dd9);
          color: #fff;
          border-color: transparent;
        }
    
        .ajk-tag-item.active::before {
          content: '✓ ';
          font-weight: bold;
        }
    
        /* 自定义标签输入 */
        .ajk-custom-tag-row {
          display: flex;
          gap: 8px;
          margin-top: 10px;
        }
    
        .ajk-custom-tag-input {
          flex: 1;
          height: 36px;
          border: 1px dashed #d9d9d9;
          border-radius: 18px;
          padding: 0 14px;
          font-size: 13px;
          outline: none;
          transition: all 0.2s;
        }
    
        .ajk-custom-tag-input:focus {
          border-color: #1890ff;
          border-style: solid;
        }
    
        .ajk-add-tag-btn {
          height: 36px;
          padding: 0 16px;
          border: 1px dashed #d9d9d9;
          border-radius: 18px;
          background: #fff;
          cursor: pointer;
          font-size: 13px;
          color: #999;
          transition: all 0.2s;
        }
    
        .ajk-add-tag-btn:hover {
          border-color: #1890ff;
          color: #1890ff;
        }
    
        /* 已添加的自定义标签 */
        .ajk-custom-tags-list {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 10px;
        }
    
        .ajk-custom-tag-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          background: #fff7e6;
          border: 1px solid #ffd591;
          border-radius: 14px;
          font-size: 12px;
          color: #ad6800;
        }
    
        .ajk-remove-tag {
          cursor: pointer;
          font-weight: bold;
          color: #ad6800;
          opacity: 0.7;
        }
    
        .ajk-remove-tag:hover {
          opacity: 1;
        }
    
        /* 按钮组 */
        .ajk-filter-actions {
          display: flex;
          gap: 12px;
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid #f0f0f0;
        }
    
        .ajk-btn {
          flex: 1;
          height: 44px;
          border: none;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.25s;
          letter-spacing: 0.5px;
        }
    
        .ajk-btn-cancel {
          background: #f5f5f5;
          color: #666;
        }
    
        .ajk-btn-cancel:hover {
          background: #e8e8e8;
        }
    
        .ajk-btn-submit {
          background: linear-gradient(135deg, #1890ff, #096dd9);
          color: #fff;
          box-shadow: 0 4px 15px rgba(24, 144, 255, 0.35);
        }
    
        .ajk-btn-submit:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(24, 144, 255, 0.45);
        }
    
        .ajk-btn-submit:active {
          transform: translateY(0);
        }
    
        /* 结果展示区 */
        .ajk-result-info {
          margin-top: 16px;
          padding: 14px 16px;
          background: linear-gradient(135deg, #e6f7ff, #f0f5ff);
          border: 1px solid #bae7ff;
          border-radius: 10px;
          font-size: 13px;
          line-height: 1.8;
          display: none;
        }
    
        .ajk-result-info.show {
          display: block;
          animation: ajkFadeIn 0.3s ease-out;
        }
    
        .ajk-result-title {
          font-weight: 700;
          color: #096dd9;
          margin-bottom: 6px;
        }
    
        .ajk-result-detail {
          color: #555;
        }
    
        /* 加载动画 */
        .ajk-loading {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,.3);
          border-radius: 50%;
          border-top-color: #fff;
          animation: ajkSpin 0.8s linear infinite;
          margin-right: 8px;
          vertical-align: middle;
        }
    
        @keyframes ajkSpin {
          to { transform: rotate(360deg); }
        }
    
        /* 响应式 */
        @media (max-width: 600px) {
          .ajk-filter-dialog {
            width: 96vw;
            border-radius: 12px;
          }
          .ajk-filter-body {
            padding: 16px 20px 24px;
          }
        }
      `;
    
      // ========== HTML模板 ==========
      function createDialogHTML() {
        return `
          <div class="ajk-filter-overlay" id="ajkFilterOverlay">
            <div class="ajk-filter-dialog">
              <!-- 头部 -->
              <div class="ajk-filter-header">
                <h2 class="ajk-filter-title">🏠 ${CONFIG.title}</h2>
                <button class="ajk-filter-close" id="ajkCloseBtn" title="关闭">✕</button>
              </div>
    
              <!-- 表单主体 -->
              <div class="ajk-filter-body">
                <!-- 区域选择 -->
                <div class="ajk-form-group">
                  <label class="ajk-form-label">所在区域<span class="required">*</span></label>
                  <select class="ajk-select" id="ajkRegion">
                    ${CONFIG.regions.map(r => `<option value="${r.value}">${r.label}</option>`).join('')}
                  </select>
                </div>
    
                <!-- 价格范围 -->
                <div class="ajk-form-group">
                  <label class="ajk-form-label">价格区间<span class="required">*</span></label>
                  <select class="ajk-select" id="ajkPrice">
                    ${CONFIG.priceRanges.map(p => `<option value="${p.value}">${p.label}</option>`).join('')}
                  </select>
                </div>
    
                <!-- 面积范围 -->
                <div class="ajk-form-group">
                  <label class="ajk-form-label">建筑面积</label>
                  <select class="ajk-select" id="ajkArea">
                    ${CONFIG.areaRanges.map(a => `<option value="${a.value}">${a.label}</option>`).join('')}
                  </select>
                </div>
    
                <!-- 房型选择 -->
                <div class="ajk-form-group">
                  <label class="ajk-form-label">房型</label>
                  <select class="ajk-select" id="ajkRoomType">
                    ${CONFIG.roomTypes.map(r => `<option value="${r.value}">${r.label}</option>`).join('')}
                  </select>
                </div>
    
                <!-- 特色标签（多选） -->
                <div class="ajk-form-group">
                  <label class="ajk-form-label">特色标签（可多选）</label>
                  <div class="ajk-tags-container" id="ajkTagContainer">
                    ${CONFIG.tagOptions.map(tag => `
                      <span class="ajk-tag-item" data-tag="${tag}">${tag}</span>
                    `).join('')}
                  </div>
    
                  <!-- 自定义标签输入 -->
                  <div class="ajk-custom-tag-row">
                    <input type="text" class="ajk-custom-tag-input" id="ajkCustomTagInput" placeholder="输入自定义标签..." maxlength="20">
                    <button class="ajk-add-tag-btn" id="ajkAddTagBtn">+ 添加</button>
                  </div>
    
                  <!-- 已添加的自定义标签列表 -->
                  <div class="ajk-custom-tags-list" id="ajkCustomTagsList"></div>
                </div>
    
                <!-- 筛选结果预览 -->
                <div class="ajk-result-info" id="ajkResultInfo">
                  <div class="ajk-result-title">📋 筛选条件预览</div>
                  <div class="ajk-result-detail" id="ajkResultDetail"></div>
                </div>
    
                <!-- 操作按钮 -->
                <div class="ajk-filter-actions">
                  <button class="ajk-btn ajk-btn-cancel" id="ajkCancelBtn">取消</button>
                  <button class="ajk-btn ajk-btn-submit" id="ajkSubmitBtn">开始筛选 🔍</button>
                </div>
              </div>
            </div>
          </div>
        `;
      }
    
      // ========== 工具函数 ==========
      
      /**
       * 构建安居客筛选URL
       * URL格式: /sale/{region}/{price}{area}{room}/
       */
      function buildFilterURL(filters) {
        let url = `https://${CONFIG.city}.anjuke.com/sale/`;
        
        // 区域
        if (filters.region) {
          url += filters.region + '/';
        } else {
          url += '/';
        }
        
        // 价格 + 面积 + 房型（拼接在一起）
        let params = [];
        if (filters.price) params.push(filters.price);
        if (filters.area) params.push(filters.area);
        if (filters.roomType) params.push(filters.roomType);
        
        if (params.length > 0) {
          url += params.join('') + '/';
        } else {
          url += '';
        }
        
        return url;
      }
    
      /**
       * 获取用户友好的筛选描述
       */
      function getFilterDescription(filters) {
        const regionLabel = CONFIG.regions.find(r => r.value === filters.region)?.label || '全部';
        const priceLabel = CONFIG.priceRanges.find(p => p.value === filters.price)?.label || '不限';
        const areaLabel = CONFIG.areaRanges.find(a => a.value === filters.area)?.label || '不限';
        const roomLabel = CONFIG.roomTypes.find(r => r.value === filters.roomType)?.label || '不限';
        
        return `
          <strong>区域：</strong>${regionLabel}<br>
          <strong>价格：</strong>${priceLabel}<br>
          <strong>面积：</strong>${areaLabel}<br>
          <strong>房型：</strong>${roomLabel}
          ${filters.tags.length ? '<br><strong>标签：</strong>' + filters.tags.join('、') : ''}
        `;
      }
    
      // ========== 主逻辑 ==========
      
      // 注入样式
      const styleEl = document.createElement('style');
      styleEl.id = 'ajkFilterStyles';
      styleEl.textContent = styles;
      document.head.appendChild(styleEl);
    
      // 创建弹窗DOM
      const container = document.createElement('div');
      container.innerHTML = createDialogHTML();
      document.body.appendChild(container);
    
      // 获取DOM元素引用
      const overlay = document.getElementById('ajkFilterOverlay');
      const closeBtn = document.getElementById('ajkCloseBtn');
      const cancelBtn = document.getElementById('ajkCancelBtn');
      const submitBtn = document.getElementById('ajkSubmitBtn');
      const tagContainer = document.getElementById('ajkTagContainer');
      const customTagInput = document.getElementById('ajkCustomTagInput');
      const addTagBtn = document.getElementById('ajkAddTagBtn');
      const customTagsList = document.getElementById('ajkCustomTagsList');
      const resultInfo = document.getElementById('ajkResultInfo');
      const resultDetail = document.getElementById('ajkResultDetail');
    
      // 状态管理
      const state = {
        selectedTags: [],
        customTags: []
      };
    
      // ========== 事件绑定 ==========
    
      // 关闭按钮
      const closeDialog = () => {
        overlay.style.animation = 'ajkFadeIn 0.2s ease-out reverse';
        setTimeout(() => {
          overlay.remove();
          styleEl.remove();
        }, 200);
      };
    
      closeBtn.addEventListener('click', closeDialog);
      cancelBtn.addEventListener('click', closeDialog);
    
      // 点击遮罩层关闭
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeDialog();
      });
    
      // ESC键关闭
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeDialog();
      });
    
      // 标签多选切换
      tagContainer.addEventListener('click', (e) => {
        const tagItem = e.target.closest('.ajk-tag-item');
        if (!tagItem) return;
    
        const tag = tagItem.dataset.tag;
        tagItem.classList.toggle('active');
    
        if (state.selectedTags.includes(tag)) {
          state.selectedTags = state.selectedTags.filter(t => t !== tag);
        } else {
          state.selectedTags.push(tag);
        }
      });
    
      // 添加自定义标签
      const addCustomTag = () => {
        const val = customTagInput.value.trim();
        if (!val) return;
        if (state.customTags.includes(val)) {
          customTagInput.value = '';
          return;
        }
    
        state.customTags.push(val);
    
        const chip = document.createElement('span');
        chip.className = 'ajk-custom-tag-chip';
        chip.innerHTML = `${val} <span class="ajk-remove-tag" data-tag="${val}">×</span>`;
        customTagsList.appendChild(chip);
    
        customTagInput.value = '';
      };
    
      addTagBtn.addEventListener('click', addCustomTag);
      customTagInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          addCustomTag();
        }
      });
    
      // 删除自定义标签
      customTagsList.addEventListener('click', (e) => {
        if (e.target.classList.contains('ajk-remove-tag')) {
          const tag = e.target.dataset.tag;
          state.customTags = state.customTags.filter(t => t !== tag);
          e.target.parentElement.remove();
        }
      });
    
      // 提交筛选
      submitBtn.addEventListener('click', async () => {
        // 收集表单数据
        const filters = {
          region: document.getElementById('ajkRegion').value,
          price: document.getElementById('ajkPrice').value,
          area: document.getElementById('ajkArea').value,
          roomType: document.getElementById('ajkRoomType').value,
          tags: [...state.selectedTags, ...state.customTags]
        };
    
        // 必填验证
        if (!filters.region && !filters.price) {
          alert('⚠️ 请至少选择一个区域或价格区间！');
          return;
        }
    
        // 显示预览信息
        resultDetail.innerHTML = getFilterDescription(filters);
        resultInfo.classList.add('show');
    
        // 构建目标URL
        const targetUrl = buildFilterURL(filters);
    
        // 按钮加载状态
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="ajk-loading"></span>正在筛选...';
    
        // 短暂延迟后跳转，让用户看到预览
        await new Promise(resolve => setTimeout(resolve, 800));
    
        // 跳转到筛选结果页
        window.location.href = targetUrl;
      });
    
      // 返回执行结果
      return {
        ok: true,
        summary: '安居客智能筛选工作流已启动 — 弹出筛选对话框，支持区域、价格、面积、房型及自定义标签筛选',
        changed_count: 1,
        data: {
          dialog_id: 'ajkFilterOverlay',
          available_regions: CONFIG.regions.map(r => r.label),
          available_prices: CONFIG.priceRanges.map(p => p.label),
          available_areas: CONFIG.areaRanges.map(a => a.label),
          available_rooms: CONFIG.roomTypes.map(r => r.label),
          preset_tags: CONFIG.tagOptions,
          features: ['弹窗UI', '多选标签', '自定义标签', '实时预览', '自动构建URL', '一键跳转']
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