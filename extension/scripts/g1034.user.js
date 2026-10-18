// ========================================
// 力扣题目信息提取脚本（修改版）
// 功能：延迟3秒启动提取，点击复制后自动关闭弹窗
// ========================================
(function delayExtract() {
    console.log('脚本已启动，将在 3 秒后开始提取...');
    
    // 1. 核心修改：设置 3000 毫秒（3秒）的延迟
    setTimeout(() => {
        extractLeetCodeProblem();
    }, 2000);
})();

// 原有的提取函数，但修改了内部的复制逻辑
function extractLeetCodeProblem() {
    const result = {
        title: '',
        description: '',
        examples: [],
        hints: [],
        code: ''
    };

    // --- 以下为原有的提取逻辑，保持不变 ---
    
    // 1. 提取题目标题
    const titleElement = document.querySelector('h1') || document.querySelector('[class*="title"] a') || document.querySelector('a[href*="/problems/"]');
    if (titleElement && titleElement.textContent.trim()) {
        result.title = titleElement.textContent.trim();
    } else {
        const pageTitle = document.title;
        const match = pageTitle.match(/^(\d+\.\s*[^\-]+)/);
        if (match) {
            result.title = match[1].trim();
        } else {
            result.title = '未获取到标题';
        }
    }

    // 2. 提取题目描述内容
    const descriptionContainer = document.querySelector('[data-track-load="description_content"]') || document.querySelector('.markdown') || document.querySelector('[class*="description"]');
    if (descriptionContainer) {
        const fullText = descriptionContainer.innerText;
        
        // 方法1：使用更精确的正则匹配示例
        const exampleRegex = /\*\*示例 \d+：\*\*\s*\n([\s\S]*?)(?=\*\*示例 \d+：|\*\*提示：|$)/g;
        let exampleMatch;
        const examples = [];
        while ((exampleMatch = exampleRegex.exec(fullText)) !== null) {
            examples.push(exampleMatch[0].trim());
        }
        if (examples.length > 0) {
            result.examples = examples;
        } else {
            // 方法2：使用更简单的正则
            const simpleExampleRegex = /示例 \d+：[\s\S]*?(?=示例 \d+：|提示：|$)/g;
            const simpleMatches = fullText.match(simpleExampleRegex);
            if (simpleMatches) {
                result.examples = simpleMatches.map(ex => ex.trim());
            }
        }

        // 提取提示信息
        // 方法1：匹配提示部分（包括所有列表项）
        const hintRegex = /\*\*提示：\*\*([\s\S]*?)(?=\*\*通过次数|\*\*相关标签|$)/;
        const hintMatch = fullText.match(hintRegex);
        if (hintMatch && hintMatch[1]) {
            const hintText = hintMatch[1].trim();
            // 分割提示为单独的行
            const hintLines = hintText.split('\n')
                .map(line => line.trim())
                .filter(line => line && !line.startsWith('通过次数'));
            result.hints = hintLines;
        } else {
            // 方法2：查找包含"提示："的行
            const lines = fullText.split('\n');
            let foundHint = false;
            const hintLines = [];
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (line.includes('提示：')) {
                    foundHint = true;
                    // 提取提示内容（去掉"提示："前缀）
                    const hintContent = line.replace(/提示：/, '').trim();
                    if (hintContent) {
                        hintLines.push(hintContent);
                    }
                } else if (foundHint && line && !line.includes('通过次数') && !line.includes('相关标签') && !line.includes('---')) {
                    // 收集提示的后续行
                    hintLines.push(line);
                } else if (foundHint && (line.includes('通过次数') || line.includes('相关标签'))) {
                    break;
                }
            }
            if (hintLines.length > 0) {
                result.hints = hintLines;
            }
        }

        // 提取描述（移除示例和提示部分）
        let descriptionText = fullText;
        // 移除示例部分
        if (result.examples.length > 0) {
            const firstExample = result.examples[0];
            const exampleIndex = descriptionText.indexOf(firstExample);
            if (exampleIndex > -1) {
                descriptionText = descriptionText.substring(0, exampleIndex);
            }
        }
        // 移除提示部分
        if (result.hints.length > 0) {
            const hintStart = descriptionText.indexOf('提示：');
            if (hintStart > -1) {
                descriptionText = descriptionText.substring(0, hintStart);
            }
        }
        result.description = descriptionText.trim();
    }

    // 3. 提取代码
    try {
        const editorInstances = window.monaco?.editor?.getEditors();
        if (editorInstances && editorInstances.length > 0) {
            const rawCode = editorInstances[0].getValue();
            let language = 'javascript';
            const langButtons = document.querySelectorAll('button[class*="language"], button[class*="lang"]');
            langButtons.forEach(btn => {
                const langText = btn.textContent.toLowerCase().trim();
                if (langText.includes('cpp') || langText.includes('c++')) language = 'cpp';
                else if (langText.includes('python')) language = 'python';
                else if (langText.includes('java')) language = 'java';
                else if (langText.includes('javascript') || langText.includes('js')) language = 'javascript';
                else if (langText.includes('go')) language = 'go';
                else if (langText.includes('rust')) language = 'rust';
            });
            result.code = '```' + language + '\n' + rawCode + '\n```';
        } else {
            result.code = '```\n未获取到代码\n```';
        }
    } catch (e) {
        result.code = '```\n无法提取代码\n```';
    }

    // 4. 调试输出
    console.log('提取结果:', result);

    // 5. 格式化输出
    const formattedOutput = `# ${result.title} 

【题目描述】
${result.description}

【示例】
${result.examples.map((ex, i) => `${i + 1}. ${ex}`).join('\n\n')}

【提示】
${result.hints.map((hint, i) => `${i + 1}. ${hint}`).join('\n')}

【我的代码】
${result.code}`;

    // 6. 创建弹窗显示结果
    showResultModal(formattedOutput);
    console.log('格式化输出:', formattedOutput);
    return { data: result, formatted: formattedOutput };
}

// 弹窗显示函数（修改了复制按钮的逻辑）
function showResultModal(content) {
    const existingModal = document.getElementById('leetcodeExtractModal');
    if (existingModal) {
        existingModal.remove();
    }
    const modalHTML = `
    <div id="leetcodeExtractModal" style="
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background-color: rgba(0, 0, 0, 0.5); z-index: 999999; 
        display: flex; justify-content: center; align-items: center; 
    ">
        <div style="
            background: white; border-radius: 8px; width: 80%; max-width: 800px; 
            max-height: 80vh; box-shadow: 0 4px 20px rgba(0,0,0,0.3); 
            display: flex; flex-direction: column; position: relative; 
        ">
            <div style="
                padding: 15px 20px; border-bottom: 1px solid #e0e0e0; 
                display: flex; justify-content: space-between; align-items: center; 
            ">
                <h3 style="margin: 0; color: #333;">📋 题目信息</h3>
                <button id="closeModal" style="
                    background: none; border: none; font-size: 24px; 
                    cursor: pointer; color: #999; padding: 0; line-height: 1; 
                ">&times;</button>
            </div>
            <textarea id="extractContent" style="
                flex: 1; padding: 15px; border: none; resize: none; 
                font-family: 'Courier New', monospace; font-size: 13px; 
                line-height: 1.5; outline: none; overflow-y: auto; 
            ">${content}</textarea>
            <div style="
                padding: 15px 20px; border-top: 1px solid #e0e0e0; 
                display: flex; gap: 10px; justify-content: flex-end; 
            ">
                <button id="copyButton" style="
                    background: #0066ff; color: white; border: none; 
                    padding: 10px 20px; border-radius: 4px; 
                    cursor: pointer; font-size: 14px; transition: background 0.3s; 
                ">📋 一键复制</button>
                <button id="closeButton" style="
                    background: #f0f0f0; color: #333; border: 1px solid #ccc; 
                    padding: 10px 20px; border-radius: 4px; 
                    cursor: pointer; font-size: 14px; 
                ">关闭</button>
            </div>
        </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    setTimeout(() => {
        const closeModal = document.getElementById('closeModal');
        const closeButton = document.getElementById('closeButton');
        const copyButton = document.getElementById('copyButton');
        const modal = document.getElementById('leetcodeExtractModal');

        const closeHandler = () => modal.remove();
        closeModal.addEventListener('click', closeHandler);
        closeButton.addEventListener('click', closeHandler);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeHandler();
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && document.getElementById('leetcodeExtractModal')) {
                closeHandler();
            }
        });

        // 核心修改点：点击复制后自动关闭弹窗
        copyButton.addEventListener('click', () => {
            const textarea = document.getElementById('extractContent');
            textarea.select();
            navigator.clipboard.writeText(textarea.value).then(() => {
                const originalText = copyButton.textContent;
                copyButton.textContent = '✅ 已复制！';
                copyButton.style.background = '#28a745';
                
                // 复制成功后等待片刻再关闭弹窗
                setTimeout(() => {
                    modal.remove();
                }, 500);
                
            }).catch(err => {
                alert('复制失败，请手动复制');
                modal.remove(); // 复制失败也关闭
            });
        });
    }, 100);
}