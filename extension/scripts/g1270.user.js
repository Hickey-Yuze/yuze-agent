// ==UserScript==
// @name         知乎MD导出-内嵌版
// @namespace    http://tampermonkey.net/
// @version      3.1
// @description  知乎专栏文章导出Markdown - 无需CDN
// @match        *://zhuanlan.zhihu.com/p/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    console.log('🚀 脚本启动（无CDN版本）');

    // ========== 内嵌简化版 HTML 转 Markdown 函数 ==========
    function htmlToMarkdown(html) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;

        function processNode(node) {
            if (node.nodeType === Node.TEXT_NODE) {
                return node.textContent;
            }

            if (node.nodeType !== Node.ELEMENT_NODE) {
                return '';
            }

            const tag = node.tagName.toLowerCase();
            const children = Array.from(node.childNodes).map(processNode).join('');

            switch (tag) {
                case 'h1': return `\n# ${children}\n`;
                case 'h2': return `\n## ${children}\n`;
                case 'h3': return `\n### ${children}\n`;
                case 'h4': return `\n#### ${children}\n`;
                case 'h5': return `\n##### ${children}\n`;
                case 'h6': return `\n###### ${children}\n`;
                case 'p': return `\n${children}\n`;
                case 'br': return '\n';
                case 'hr': return '\n---\n';
                case 'strong':
                case 'b': return `**​${children}​**`;
                case 'em':
                case 'i': return `*${children}*`;
                case 'code': return `\`${children}\``;
                case 'pre': return `\n\`\`\`\n${children}\n\`\`\`\n`;
                case 'a': return `[${children}](${node.href || ''})`;
                case 'img': return `![${node.alt || ''}](${node.src || ''})`;
                case 'ul':
                case 'ol': 
                    return '\n' + Array.from(node.children).map((li, i) => {
                        const prefix = tag === 'ul' ? '-' : `${i + 1}.`;
                        return `${prefix} ${processNode(li)}`;
                    }).join('\n') + '\n';
                case 'li': return children;
                case 'blockquote': return `\n> ${children}\n`;
                case 'figure': return children;
                case 'div':
                case 'span': return children;
                default: return children;
            }
        }

        return processNode(tempDiv).replace(/\n{3,}/g, '\n\n').trim();
    }

    // ========== 查找元素 ==========
    function findElement(selectors) {
        for (const selector of selectors) {
            const el = document.querySelector(selector);
            if (el) {
                console.log(`✅ 找到: ${selector}`);
                return el;
            }
        }
        console.warn('❌ 未找到元素:', selectors);
        return null;
    }

    // ========== 提取内容 ==========
    function getContent() {
        const titleEl = findElement(['h1.Post-Title', '.Post-Title', 'h1']);
        const contentEl = findElement([
            '.RichText.ztext.Post-RichText',
            '.Post-RichText',
            'article .RichText'
        ]);

        if (!titleEl || !contentEl) {
            alert('⚠️ 页面元素未完全加载，请稍后再试');
            return null;
        }

        const title = titleEl.textContent.trim();
        const html = contentEl.innerHTML;
        const markdown = `# ${title}\n\n${htmlToMarkdown(html)}`;

        console.log(`✅ 提取成功 - 标题: ${title.substring(0, 20)}...`);
        console.log(`📊 Markdown 长度: ${markdown.length} 字符`);

        return { title, markdown };
    }

    // ========== 下载文件 ==========
    function download(filename, content) {
        try {
            const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            console.log('✅ 文件下载成功');
            showToast('✅ 下载成功');
        } catch (err) {
            console.error('❌ 下载失败:', err);
            alert('下载失败: ' + err.message);
        }
    }

    // ========== 显示提示 ==========
    function showToast(message) {
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.85);
            color: white;
            padding: 16px 32px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: bold;
            z-index: 999999;
            box-shadow: 0 4px 16px rgba(0,0,0,0.3);
        `;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.transition = 'opacity 0.3s';
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }

    // ========== 创建下载按钮 ==========
    function createDownloadButton() {
        const result = getContent();
        if (!result) return;

        const { title, markdown } = result;

        const btn = document.createElement('button');
        btn.innerHTML = `<span style="font-size:20px">💾</span><br><span style="font-size:12px">下载</span>`;
        btn.style.cssText = `
            position: fixed;
            bottom: 80px;
            right: 30px;
            width: 70px;
            height: 70px;
            border-radius: 50%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            cursor: pointer;
            z-index: 99999;
            box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);
            transition: all 0.3s ease;
            font-family: system-ui;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            line-height: 1.2;
        `;

        btn.addEventListener('mouseenter', () => {
            btn.style.transform = 'scale(1.1)';
            btn.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)';
        });

        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'scale(1)';
            btn.style.boxShadow = '0 4px 16px rgba(102, 126, 234, 0.4)';
        });

        btn.onclick = () => {
            download(`${title}.md`, markdown);
        };

        document.body.appendChild(btn);
        console.log('✅ 下载按钮创建成功');
    }

    // ========== 启动 ==========
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(createDownloadButton, 1000);
        });
    } else {
        setTimeout(createDownloadButton, 1000);
    }
})();