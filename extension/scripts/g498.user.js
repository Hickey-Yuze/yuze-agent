// ==UserScript==
// @name         AI热点选题助手 - 修复版
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  修复API问题的AI热点收集插件
// @author       Tabbit
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_notification
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      api.bilibili.com
// @connect      weibo.com
// @connect      *
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';
    
    console.log('AI热点插件修复版已启动');
    
    // 配置
    const CONFIG = {
        triggerKeyword: 'AI',
        useMockData: true,  // 使用模拟数据，避免API问题
        autoCollect: false  // 关闭自动收集
    };
    
    // 初始化
    function init() {
        console.log('初始化插件...');
        createFloatingButton();
        setupKeyboardListener();
    }
    
    // 创建浮动按钮
    function createFloatingButton() {
        const button = document.createElement('button');
        button.id = 'ai-hotspot-button';
        button.textContent = '🤖';
        button.title = 'AI热点选题助手';
        
        button.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999;
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            cursor: pointer;
            font-size: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s;
        `;
        
        button.onmouseenter = () => {
            button.style.transform = 'scale(1.1)';
            button.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)';
        };
        
        button.onmouseleave = () => {
            button.style.transform = 'scale(1)';
            button.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
        };
        
        button.onclick = () => {
            showTopicSelector();
        };
        
        document.body.appendChild(button);
        console.log('浮动按钮创建完成');
    }
    
    // 设置键盘监听
    function setupKeyboardListener() {
        let inputBuffer = '';
        let timer;
        
        document.addEventListener('keydown', (e) => {
            if (e.key.length === 1 && /[a-zA-Z]/i.test(e.key)) {
                inputBuffer += e.key.toUpperCase();
                
                // 限制缓冲区大小
                if (inputBuffer.length > 10) {
                    inputBuffer = inputBuffer.slice(-10);
                }
                
                // 检测AI关键词
                if (inputBuffer.includes('AI')) {
                    showTopicSelector();
                    inputBuffer = '';
                }
                
                // 清除定时器，重新设置
                clearTimeout(timer);
                timer = setTimeout(() => {
                    inputBuffer = '';
                }, 2000); // 2秒后清空缓冲区
            }
        });
        
        console.log('键盘监听已设置');
    }
    
    // 显示选题选择器
    function showTopicSelector() {
        // 移除现有的选择器
        removeExistingSelector();
        
        // 获取选题数据
        const topics = CONFIG.useMockData ? getMockTopics() : collectRealTopics();
        
        // 创建UI
        createSelectorUI(topics);
        
        console.log('选题选择器已显示');
    }
    
    // 获取模拟数据
    function getMockTopics() {
        return [
            {
                id: 1,
                title: 'OpenAI发布o3推理模型，推理速度提升5倍',
                platform: 'B站',
                category: '技术突破',
                score: 92,
                hot: '150万',
                description: 'OpenAI最新发布的o3模型在推理速度和准确性方面都有显著提升'
            },
            {
                id: 2,
                title: 'AI医疗诊断系统在基层医院成功落地',
                platform: '微博',
                category: '应用场景',
                score: 88,
                hot: '280万',
                description: 'AI医疗系统诊断准确率达95%，大幅提升基层医疗效率'
            },
            {
                id: 3,
                title: '生成式AI内容创作成为新趋势',
                platform: '抖音',
                category: '行业趋势',
                score: 85,
                hot: '320万',
                description: 'AIGC工具在短视频、文案创作等领域广泛应用'
            },
            {
                id: 4,
                title: 'AI伦理与安全问题引发广泛讨论',
                platform: 'B站',
                category: '伦理安全',
                score: 82,
                hot: '95万',
                description: 'AI换脸、深度伪造等技术带来的伦理挑战'
            },
            {
                id: 5,
                title: '多模态AI技术实现新突破',
                platform: '微博',
                category: '技术突破',
                score: 80,
                hot: '120万',
                description: '图像、语音、文本多模态融合技术取得进展'
            }
        ];
    }
    
    // 收集真实数据（简化版）
    function collectRealTopics() {
        // 这里可以添加真实API调用
        // 目前先返回模拟数据
        return getMockTopics();
    }
    
    // 创建选择器UI
    function createSelectorUI(topics) {
        // 创建遮罩层
        const overlay = document.createElement('div');
        overlay.id = 'ai-selector-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: 9998;
        `;
        
        // 创建主容器
        const container = document.createElement('div');
        container.id = 'ai-selector-container';
        container.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 9999;
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            width: 600px;
            max-height: 80vh;
            overflow: hidden;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        `;
        
        // 头部
        const header = document.createElement('div');
        header.style.cssText = `
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        
        header.innerHTML = `
            <div>
                <h2 style="margin: 0; font-size: 20px; font-weight: 600;">🤖 AI热点选题助手</h2>
                <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 14px;">
                    为您筛选 ${topics.length} 个优质选题（${CONFIG.useMockData ? '模拟数据' : '实时数据'}）
                </p>
            </div>
            <button id="ai-close-btn" style="
                background: rgba(255,255,255,0.2);
                border: none;
                color: white;
                font-size: 24px;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
            ">
                ×
            </button>
        `;
        
        // 内容区域
        const content = document.createElement('div');
        content.style.cssText = `
            padding: 20px;
            max-height: 60vh;
            overflow-y: auto;
        `;
        
        // 创建选题列表
        topics.forEach(topic => {
            const topicCard = document.createElement('div');
            topicCard.style.cssText = `
                margin-bottom: 15px;
                padding: 15px;
                border: 1px solid #e0e0e0;
                border-radius: 8px;
                background: white;
                transition: all 0.2s;
            `;
            
            topicCard.onmouseenter = () => {
                topicCard.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                topicCard.style.transform = 'translateY(-2px)';
            };
            
            topicCard.onmouseleave = () => {
                topicCard.style.boxShadow = 'none';
                topicCard.style.transform = 'translateY(0)';
            };
            
            // 获取类别颜色
            const categoryColors = {
                '技术突破': '#667eea',
                '应用场景': '#4CAF50',
                '行业趋势': '#2196F3',
                '伦理安全': '#F44336',
                '商业动态': '#FF9800'
            };
            
            const color = categoryColors[topic.category] || '#666';
            
            topicCard.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; margin-bottom: 8px;">
                            <span style="
                                display: inline-block;
                                width: 28px;
                                height: 28px;
                                background: linear-gradient(135deg, ${color} 0%, ${color}99 100%);
                                color: white;
                                border-radius: 50%;
                                text-align: center;
                                line-height: 28px;
                                font-size: 14px;
                                font-weight: bold;
                                margin-right: 10px;
                            ">
                                ${topic.id}
                            </span>
                            <span style="
                                font-size: 12px;
                                padding: 4px 10px;
                                border-radius: 12px;
                                background: ${color};
                                color: white;
                                font-weight: 500;
                            ">
                                ${topic.category}
                            </span>
                        </div>
                        <h3 style="margin: 0 0 8px 0; font-size: 16px; line-height: 1.4; color: #333;">
                            ${topic.title}
                        </h3>
                    </div>
                    <div style="
                        width: 50px;
                        height: 50px;
                        background: ${color};
                        color: white;
                        border-radius: 10px;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        font-weight: bold;
                    ">
                        <div style="font-size: 18px;">${topic.score}</div>
                        <div style="font-size: 10px; opacity: 0.9;">分</div>
                    </div>
                </div>
                
                <div style="margin-bottom: 10px;">
                    <p style="margin: 0; font-size: 14px; color: #666; line-height: 1.5;">
                        ${topic.description}
                    </p>
                </div>
                
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <span style="font-size: 13px; color: #666; margin-right: 15px;">
                            📍 ${topic.platform}
                        </span>
                        <span style="font-size: 13px; color: #666;">
                            🔥 热度: ${topic.hot}
                        </span>
                    </div>
                    <button onclick="copyTopicText(${topic.id})" style="
                        background: none;
                        border: 1px solid ${color};
                        color: ${color};
                        padding: 6px 16px;
                        border-radius: 4px;
                        font-size: 13px;
                        cursor: pointer;
                        transition: all 0.2s;
                    " onmouseover="this.style.background='${color}'; this.style.color='white'"
                    onmouseout="this.style.background='none'; this.style.color='${color}'">
                        复制选题
                    </button>
                </div>
            `;
            
            content.appendChild(topicCard);
        });
        
        // 底部操作
        const footer = document.createElement('div');
        footer.style.cssText = `
            padding: 15px 20px;
            border-top: 1px solid #e0e0e0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #f8f9fa;
        `;
        
        footer.innerHTML = `
            <div style="font-size: 12px; color: #666;">
                最后更新: ${new Date().toLocaleString()}
            </div>
            <div style="display: flex; gap: 10px;">
                <button id="ai-refresh-btn" style="
                    background: #2196F3;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    font-size: 13px;
                    cursor: pointer;
                ">
                    🔄 刷新
                </button>
                <button id="ai-export-btn" style="
                    background: #4CAF50;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    font-size: 13px;
                    cursor: pointer;
                ">
                    📥 导出
                </button>
            </div>
        `;
        
        // 组装容器
        container.appendChild(header);
        container.appendChild(content);
        container.appendChild(footer);
        
        // 添加到页面
        document.body.appendChild(overlay);
        document.body.appendChild(container);
        
        // 绑定事件
        setupSelectorEvents(container, overlay, topics);
    }
    
    // 设置选择器事件
    function setupSelectorEvents(container, overlay, topics) {
        // 关闭按钮
        document.getElementById('ai-close-btn').onclick = () => {
            container.remove();
            overlay.remove();
        };
        
        // 遮罩层点击关闭
        overlay.onclick = () => {
            container.remove();
            overlay.remove();
        };
        
        // 刷新按钮
        document.getElementById('ai-refresh-btn').onclick = () => {
            container.remove();
            overlay.remove();
            setTimeout(() => showTopicSelector(), 300);
        };
        
        // 导出按钮
        document.getElementById('ai-export-btn').onclick = () => {
            exportTopics(topics);
        };
        
        // 全局复制函数
        window.copyTopicText = function(topicId) {
            const topic = topics.find(t => t.id === topicId);
            if (topic) {
                const text = `选题: ${topic.title}
平台: ${topic.platform}
类别: ${topic.category}
评分: ${topic.score}分
热度: ${topic.hot}
描述: ${topic.description}`;
                
                navigator.clipboard.writeText(text).then(() => {
                    alert('选题已复制到剪贴板！');
                });
            }
        };
    }
    
    // 导出选题
    function exportTopics(topics) {
        let exportText = `AI热点选题报告
生成时间: ${new Date().toLocaleString()}
数据来源: B站、抖音、微博（模拟数据）
========================================

`;
        
        topics.forEach((topic, index) => {
            exportText += `${index + 1}. 【${topic.title}】
   平台: ${topic.platform}
   类别: ${topic.category}
   评分: ${topic.score}分
   热度: ${topic.hot}
   描述: ${topic.description}
   --------------------------
`;
        });
        
        const blob = new Blob([exportText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `AI热点选题_${new Date().getTime()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        alert('选题已导出为TXT文件！');
    }
    
    // 移除现有的选择器
    function removeExistingSelector() {
        const overlay = document.getElementById('ai-selector-overlay');
        const container = document.getElementById('ai-selector-container');
        
        if (overlay) overlay.remove();
        if (container) container.remove();
    }
    
    // 启动
    setTimeout(() => {
        init();
        console.log('插件启动完成');
    }, 1000);
})();