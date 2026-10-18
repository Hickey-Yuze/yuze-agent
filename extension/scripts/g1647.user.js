// ==========================================
// 单脚本：爆款矩阵智能填充工坊 (Tabbit Script)
// 核心功能：输入主题 -> AI生成内容 -> 自动识别网页并填充
// ==========================================

(function() {
    'use strict';

    // 1. 注入悬浮面板 UI
    function injectUI() {
        if (document.getElementById('matrix-gen-btn')) return;

        // 主按钮
        const btn = document.createElement('div');
        btn.id = 'matrix-gen-btn';
        btn.innerHTML = '🎬 内容超能生成';
        btn.style.cssText = `
            position: fixed; bottom: 50px; right: 30px; z-index: 99999;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white; padding: 12px 20px; border-radius: 30px;
            cursor: pointer; font-size: 14px; box-shadow: 0 8px 16px rgba(0,0,0,0.2);
            transition: all 0.3s ease; font-weight: bold; letter-spacing: 1px;
        `;
        btn.onmouseenter = () => { btn.style.transform = 'scale(1.05)'; };
        btn.onmouseleave = () => { btn.style.transform = 'scale(1)'; };
        document.body.appendChild(btn);

        // 输入弹窗层 (先隐藏)
        const modal = document.createElement('div');
        modal.id = 'matrix-input-modal';
        modal.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            width: 500px; background: white; border-radius: 16px; padding: 30px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.4); z-index: 100000;
            display: none; flex-direction: column; gap: 20px; font-family: system-ui;
        `;
        modal.innerHTML = `
            <div style="font-size: 22px; font-weight: bold; text-align: center; color: #333;">🚀 智能选题生成器</div>
            <div style="font-size: 14px; color: #666; text-align: center;">输入一个主题，AI 自动生成爆款标题、标签和发布脚本</div>
            <textarea id="matrix-topic-input" placeholder="请输入主题/产品 (例如：家用投影仪 或 职场情商)" style="padding: 15px; border: 2px solid #e0e0e0; border-radius: 10px; font-size: 14px; min-height: 60px; resize: none; outline: none;"></textarea>
            <div style="display: flex; gap: 15px; justify-content: flex-end;">
                <button id="matrix-cancel-btn" style="padding: 10px 20px; border: 1px solid #ddd; background: white; border-radius: 8px; cursor: pointer; color: #666;">取消</button>
                <button id="matrix-go-btn" style="padding: 10px 20px; border: none; background: #667eea; border-radius: 8px; cursor: pointer; color: white;">✨ 让 AI 生成并填充</button>
            </div>
        `;
        document.body.appendChild(modal);

        // 绑定事件
        btn.onclick = () => { modal.style.display = 'flex'; };
        document.getElementById('matrix-cancel-btn').onclick = () => { modal.style.display = 'none'; };
        document.getElementById('matrix-go-btn').onclick = handleGeneration;
    }

    // 2. 核心 AI 调用与填充逻辑
    async function handleGeneration() {
        const topicInput = document.getElementById('matrix-topic-input');
        const topic = topicInput.value.trim();
        if (!topic) { alert('⚠️ 请先输入一个主题！'); return; }

        const goBtn = document.getElementById('matrix-go-btn');
        const originalText = goBtn.innerText;
        goBtn.innerText = '⏳ AI 思考中...';
        goBtn.disabled = true;

        try {
            // 核心提示词（内置在脚本中，替代外部提示词妙招）
            const promptText = `你是一个爆款短视频策划专家。请针对主题：“${topic}”，生成用于新媒体平台（抖音/B站/小红书）的发布物料。
请以严格的 JSON 格式返回，不要包含任何 Markdown 标记，仅提供纯 JSON。
JSON 结构必须为：
{
  "title": "15字以内的吸引人标题",
  "tags": "#热门话题 #相关标签 #卖点标签 (用空格隔开，最多5个)",
  "description": "大约200字的极具吸引力的发布简介，含有引导互动的句子。",
  "script": "包含黄金开头、痛点引入、解决方案的短视频简短逐字稿（200字左右）。"
}`;

            // 调用 Tabbit 内置大模型 API
            const response = await window.Tabbit.AI.invoke({
                task: "content_generation_suite",
                prompt: promptText,
                model: "gpt-4"
            });

            const content = response.choices[0].message.content;
            // 处理 AI 可能返回的 Markdown 代码块包裹
            let cleanJson = content.replace(/```json/g, '').replace(/```/g, '').trim();
            const data = JSON.parse(cleanJson);

            // 3. 自动识别并填充 DOM 元素
            const originalState = { title: '', tags: '', desc: '' };
            
            // 通用平台选择器（涵盖 抖音、B站、小红书 等）
            const findInput = (placeholders) => {
                for (let p of placeholders) {
                    let el = document.querySelector(`input[placeholder*="${p}"]`) || document.querySelector(`textarea[placeholder*="${p}"]`);
                    if (el) return el;
                }
                return null;
            };

            const titleInput = findInput(['标题', '标题', '标题']); // 多写几个防止匹配失败
            const tagInput = findInput(['话题', '标签']);
            const descInput = findInput(['简介', '说点什么', '描述']);

            // 保存原始状态
            if (titleInput) originalState.title = titleInput.value;
            if (tagInput) originalState.tags = tagInput.value;
            if (descInput) originalState.desc = descInput.value;
            window._script_original_state = originalState;

            // 填充内容
            if (titleInput) { titleInput.value = data.title; titleInput.dispatchEvent(new Event('input', { bubbles: true })); }
            if (tagInput) { tagInput.value = data.tags; tagInput.dispatchEvent(new Event('input', { bubbles: true })); }
            if (descInput) { descInput.value = data.description; descInput.dispatchEvent(new Event('input', { bubbles: true })); }

            // 4. 判断填充结果，反馈给用户
            let msg = `✅ 标题、标签、简介已自动填充！\n\n📌 标题: ${data.title}\n🏷️ 标签: ${data.tags}`;
            if (!titleInput) {
                msg += `\n\n⚠️ 注意：没有找到网页上的输入框。已为您将【完整脚本】复制到剪贴板，请手动粘贴！`;
                await navigator.clipboard.writeText(`【标题】${data.title}\n【标签】${data.tags}\n【简介】${data.description}\n\n【完整口播脚本】${data.script}`);
            } else {
                // 如果找到了输入框，顺便把完整脚本也复制到剪贴板，方便人机协作
                await navigator.clipboard.writeText(data.script);
                msg += `\n\n📜 完整口播脚本已自动复制到剪贴板！`;
            }
            alert(msg);

            // 关闭弹窗
            document.getElementById('matrix-input-modal').style.display = 'none';

        } catch (error) {
            alert(`❌ 出现异常：${error.message || error}`);
            console.error(error);
        } finally {
            goBtn.innerText = originalText;
            goBtn.disabled = false;
            topicInput.value = '';
        }
    }

    // 4. 额外注入一个全局“一键撤销”按钮（在右下角）
    function injectUndo() {
        if (document.getElementById('script-undo-btn')) return;
        const undo = document.createElement('div');
        undo.id = 'script-undo-btn';
        undo.innerText = '↩️ 撤销填充';
        undo.style.cssText = `
            position: fixed; bottom: 100px; right: 30px; z-index: 99999;
            background: #ff4d4f; color: white; padding: 8px 16px; border-radius: 20px;
            cursor: pointer; font-size: 12px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            display: none;
        `;
        undo.onclick = function() {
            const state = window._script_original_state;
            if (!state) { alert('暂无可撤销的记录'); return; }
            const titleInput = document.querySelector('input[placeholder*="标题"]') || document.querySelector('textarea[placeholder*="标题"]');
            const tagInput = document.querySelector('input[placeholder*="话题"]') || document.querySelector('input[placeholder*="标签"]');
            const descInput = document.querySelector('textarea[placeholder*="简介"]') || document.querySelector('textarea[placeholder*="说点什么"]');
            
            if (titleInput) { titleInput.value = state.title; titleInput.dispatchEvent(new Event('input', { bubbles: true })); }
            if (tagInput) { tagInput.value = state.tags; tagInput.dispatchEvent(new Event('input', { bubbles: true })); }
            if (descInput) { descInput.value = state.desc; descInput.dispatchEvent(new Event('input', { bubbles: true })); }
            alert('已成功撤销 AI 的填充数据，恢复为原始状态。');
            undo.style.display = 'none';
        };
        document.body.appendChild(undo);

        // 暴露撤销按钮的显示方法
        window._showUndo = () => { undo.style.display = 'block'; };
    }

    // 初始化：如果是发布后台页面，则注入工具
    if (document.readyState === 'complete') {
        setTimeout(() => { injectUI(); injectUndo(); }, 1500);
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => { injectUI(); injectUndo(); }, 1500);
        });
    }
})();