// ==UserScript==
// @name         一键加入岗位 + 面评记录
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  在招聘页面添加一键加入岗位按钮 + 面评记录展示
// @author       You
// @match        https://zhaopin.sankuai.com/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const POSITION_UNION_ID = '4291734764';

    // 获取面评记录
    async function fetchEvaluationInfo(resumeUnionId) {
        try {
            const res = await fetch('https://zhaopin.sankuai.com/api/query/interview/evaluation/list', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pageNo: 1,
                    pageSize: 10,
                    resumeUnionId: resumeUnionId,
                    requestSource: 1,
                    logSource: '2'
                })
            });
            const result = await res.json();
            return result;
        } catch (e) {
            console.error('获取面评记录失败:', e);
            return null;
        }
    }

    // 结果码映射
    // resultCode: 1=强烈推荐 2=推荐 3=待定 4=建议不录用 5=强烈不推荐（根据实际补充）
    function parseResultCode(resultCode, resultText) {
        const code = String(resultCode);
        const text = String(resultText || '');

        if (['1', '2'].includes(code) || text.includes('推荐') && !text.includes('不')) {
            return 'pass';
        }
        if (['4', '5'].includes(code) || text.includes('不录用') || text.includes('不推荐') || text.includes('淘汰')) {
            return 'fail';
        }
        if (code === '3' || text.includes('待定')) {
            return 'pending';
        }
        return 'unknown';
    }

    // 解析面评数据
    function parseEvaluation(result) {
        const pageList = result?.data?.pageList;

        if (!Array.isArray(pageList) || pageList.length === 0) {
            return { total: 0, pass: 0, fail: 0, pending: 0, items: [], text: '暂无面评' };
        }

        let pass = 0, fail = 0, pending = 0;
        const items = pageList.map(item => {
            const type = parseResultCode(item.resultCode, item.result);
            if (type === 'pass') pass++;
            else if (type === 'fail') fail++;
            else if (type === 'pending') pending++;

            return {
                type,
                interviewType: item.interviewType || '',       // 面试类型：业务初试
                interviewerName: (item.interviewerName || '').split('|')[0], // 取中文名
                result: item.result || '',                      // 建议不录用
                jobName: item.jobName || '',
                interviewDate: item.interviewDate
                    ? new Date(item.interviewDate).toLocaleDateString('zh-CN')
                    : '',
                // 各维度评分
                appraisals: (item.formatAppraisalDtoList || []).map(a => ({
                    name: a.name,
                    score: a.score
                }))
            };
        });

        const total = pageList.length;
        let text = `共${total}条面评`;
        if (pass > 0) text += `，通过 ${pass} 个`;
        if (fail > 0) text += `，不通过 ${fail} 个`;
        if (pending > 0) text += `，待定 ${pending} 个`;

        return { total, pass, fail, pending, items, text };
    }

    // 构建 tooltip 详情 HTML
    function buildTooltipHTML(items) {
        if (items.length === 0) return '<div style="padding:8px;">暂无面评记录</div>';

        return items.map((item, idx) => {
            const typeColor = item.type === 'pass' ? '#52c41a'
                : item.type === 'fail' ? '#ff4d4f'
                : '#faad14';

            const appraisalHTML = item.appraisals.length > 0
                ? item.appraisals.map(a =>
                    `<span style="margin-right:8px;font-size:11px;color:#666;">
                        ${a.name}：${'⭐'.repeat(a.score)}${'☆'.repeat(Math.max(0, 5 - a.score))}
                    </span>`
                ).join('')
                : '';

            return `
                <div style="padding:8px 0;${idx > 0 ? 'border-top:1px solid #f0f0f0;' : ''}">
                    <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
                        <span style="font-weight:bold;font-size:13px;">${item.interviewType}</span>
                        <span style="color:#999;font-size:12px;">${item.interviewDate}</span>
                        <span style="color:#999;font-size:12px;">面试官：${item.interviewerName}</span>
                        <span style="
                            padding:1px 6px;
                            border-radius:3px;
                            font-size:12px;
                            color:#fff;
                            background:${typeColor};
                            margin-left:auto;
                        ">${item.result}</span>
                    </div>
                    ${appraisalHTML ? `<div style="margin-top:4px;">${appraisalHTML}</div>` : ''}
                    <div style="font-size:11px;color:#999;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:400px;">
                        ${item.jobName}
                    </div>
                </div>
            `;
        }).join('');
    }

    // 创建悬浮 tooltip
    function createTooltip(badge, items) {
        let tooltip = null;

        badge.addEventListener('mouseenter', () => {
            tooltip = document.createElement('div');
            tooltip.style.cssText = `
                position: fixed;
                z-index: 99999;
                background: #fff;
                border: 1px solid #e8e8e8;
                border-radius: 6px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                padding: 8px 12px;
                min-width: 320px;
                max-width: 480px;
                font-size: 13px;
                color: #333;
                line-height: 1.5;
                pointer-events: none;
            `;
            tooltip.innerHTML = buildTooltipHTML(items);
            document.body.appendChild(tooltip);

            const rect = badge.getBoundingClientRect();
            tooltip.style.top = `${rect.bottom + 6}px`;
            tooltip.style.left = `${Math.min(rect.left, window.innerWidth - 500)}px`;
        });

        badge.addEventListener('mouseleave', () => {
            if (tooltip) {
                tooltip.remove();
                tooltip = null;
            }
        });
    }

    async function processRow(row) {
        const resumeUnionId = row.getAttribute('data-row-key');
        if (!resumeUnionId) return;

        const buttonGroup = row.querySelector(`#button-group-${resumeUnionId}`);
        if (!buttonGroup) return;

        // -------- 一键加入岗位按钮 --------
        if (!buttonGroup.querySelector('.quick-add-btn')) {
            const btn = document.createElement('button');
            btn.className = 'quick-add-btn';
            btn.type = 'button';
            btn.textContent = '⚡ 一键加入岗位';
            btn.style.cssText = `
                background-color: #ff4d4f;
                border: none;
                color: #fff;
                margin-left: 8px;
                cursor: pointer;
                border-radius: 4px;
                padding: 0 12px;
                height: 32px;
                font-size: 13px;
                transition: opacity 0.2s;
                white-space: nowrap;
                vertical-align: middle;
            `;

            btn.addEventListener('mouseenter', () => btn.style.opacity = '0.85');
            btn.addEventListener('mouseleave', () => btn.style.opacity = '1');

            btn.addEventListener('click', async () => {
                if (btn.disabled) return;
                btn.disabled = true;
                btn.textContent = '处理中...';
                btn.style.opacity = '0.6';

                try {
                    const res = await fetch('https://zhaopin.sankuai.com/api/flow/talent/batch/create/apply', {
                        method: 'POST',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            positionUnionId: POSITION_UNION_ID,
                            resumeUnionIds: [resumeUnionId],
                            sceneType: '2'
                        })
                    });
                    const result = await res.json();
                    console.log('加入岗位结果:', result);
                    if (res.ok) {
                        btn.textContent = '✅ 已加入';
                        btn.style.backgroundColor = '#52c41a';
                    } else {
                        throw new Error(result.message || '请求失败');
                    }
                } catch (e) {
                    console.error('加入岗位失败:', e);
                    btn.textContent = '❌ 失败';
                    btn.style.backgroundColor = '#faad14';
                    btn.disabled = false;
                    btn.style.opacity = '1';
                    alert(`加入失败: ${e.message}`);
                }
            });

            buttonGroup.appendChild(btn);
        }

        // -------- 面评记录标签 --------
        const infoDiv = row.querySelector('.content-top__info');
        if (!infoDiv) return;
        if (infoDiv.querySelector('.evaluation-badge')) return;

        // loading 占位
        const badge = document.createElement('span');
        badge.className = 'evaluation-badge';
        badge.textContent = '面评加载中...';
        badge.style.cssText = `
            display: inline-block;
            margin-left: 8px;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 12px;
            background: #f0f0f0;
            color: #999;
            vertical-align: middle;
            white-space: nowrap;
            cursor: default;
        `;

        const skillDiv = infoDiv.querySelector('.content-top__skill');
        if (skillDiv) {
            skillDiv.insertAdjacentElement('afterend', badge);
        } else {
            infoDiv.appendChild(badge);
        }

        // 拉取面评
        const result = await fetchEvaluationInfo(resumeUnionId);
        if (!result || result.status !== 1) {
            badge.textContent = '📋 面评获取失败';
            return;
        }

        const { total, pass, fail, pending, items, text } = parseEvaluation(result);

        badge.textContent = `📋 ${text}`;

        // 根据结果设置颜色
        if (total === 0) {
            badge.style.background = '#f0f0f0';
            badge.style.color = '#999';
        } else if (fail > 0 && pass === 0) {
            badge.style.background = '#fff1f0';
            badge.style.color = '#ff4d4f';
            badge.style.border = '1px solid #ffa39e';
        } else if (pass > 0 && fail === 0) {
            badge.style.background = '#f6ffed';
            badge.style.color = '#52c41a';
            badge.style.border = '1px solid #b7eb8f';
        } else {
            badge.style.background = '#fffbe6';
            badge.style.color = '#faad14';
            badge.style.border = '1px solid #ffe58f';
        }

        // 悬浮详情
        if (total > 0) {
            badge.style.cursor = 'pointer';
            createTooltip(badge, items);
        }
    }

    function addButtonsAndBadges() {
        const rows = document.querySelectorAll('tr.rc-table-row[data-row-key]');
        rows.forEach(row => {
            if (row.dataset.evaluated) return;
            row.dataset.evaluated = '1';
            processRow(row);
        });
    }

    addButtonsAndBadges();

    const observer = new MutationObserver(() => {
        addButtonsAndBadges();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
})();