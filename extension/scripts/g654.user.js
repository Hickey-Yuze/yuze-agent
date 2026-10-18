(function() {
    if (window.__csdn_img_align_btn__) return;
    window.__csdn_img_align_btn__ = true;

    var toolbar = document.createElement('div');
    toolbar.innerHTML = `
        <div class="img-align-fab" id="imgAlignFab">
            <button class="fab-toggle" title="图片对齐工具">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                </svg>
            </button>
            <div class="fab-actions">
                <button class="fab-action" data-align="left" title="全部图片左对齐">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="3" y1="3" x2="21" y2="3"/><line x1="3" y1="8" x2="15" y2="8"/><line x1="3" y1="13" x2="18" y2="13"/><line x1="3" y1="18" x2="12" y2="18"/></svg>
                    <span>左对齐</span>
                </button>
                <button class="fab-action" data-align="center" title="全部图片居中">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="3" y1="3" x2="21" y2="3"/><line x1="6" y1="8" x2="18" y2="8"/><line x1="4" y1="13" x2="20" y2="13"/><line x1="7" y1="18" x2="17" y2="18"/></svg>
                    <span>居中</span>
                </button>
                <button class="fab-action" data-align="right" title="全部图片右对齐">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="3" y1="3" x2="21" y2="3"/><line x1="9" y1="8" x2="21" y2="8"/><line x1="6" y1="13" x2="21" y2="13"/><line x1="12" y1="18" x2="21" y2="18"/></svg>
                    <span>右对齐</span>
                </button>
            </div>
        </div>
    `;

    var style = document.createElement('style');
    style.textContent = `
        .img-align-fab {
            position: fixed;
            right: 20px;
            bottom: 100px;
            z-index: 99999;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 8px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        .fab-toggle {
            width: 44px;
            height: 44px;
            border-radius: 12px;
            border: none;
            background: linear-gradient(135deg, #fc5531, #e04425);
            color: #fff;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 16px rgba(252,85,49,0.35);
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .fab-toggle:hover {
            transform: scale(1.08);
            box-shadow: 0 6px 20px rgba(252,85,49,0.45);
        }
        .fab-toggle.active {
            background: linear-gradient(135deg, #e04425, #c93820);
            border-radius: 12px 12px 4px 4px;
        }
        .fab-actions {
            display: flex;
            flex-direction: column;
            gap: 4px;
            opacity: 0;
            transform: translateY(8px) scale(0.9);
            transform-origin: bottom right;
            pointer-events: none;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .fab-actions.show {
            opacity: 1;
            transform: translateY(0) scale(1);
            pointer-events: auto;
        }
        .fab-action {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 14px;
            background: #fff;
            border: 1px solid #f0f0f0;
            border-radius: 10px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            color: #333;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
            transition: all 0.2s ease;
            white-space: nowrap;
        }
        .fab-action:hover {
            background: #fff5f3;
            border-color: #fc5531;
            color: #fc5531;
            transform: translateX(-4px);
            box-shadow: 0 4px 12px rgba(252,85,49,0.15);
        }
        .fab-action svg {
            flex-shrink: 0;
        }
        .img-align-toast {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) scale(0.85);
            background: rgba(0,0,0,0.78);
            color: #fff;
            padding: 14px 28px;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 500;
            z-index: 100000;
            pointer-events: none;
            opacity: 0;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            backdrop-filter: blur(8px);
            text-align: center;
            line-height: 1.6;
        }
        .img-align-toast.visible {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
        }
    `;
    document.head.appendChild(style);
    document.body.appendChild(toolbar);

    var toggleBtn = toolbar.querySelector('.fab-toggle');
    var actionsPanel = toolbar.querySelector('.fab-actions');
    var isOpen = false;

    toggleBtn.addEventListener('click', function() {
        isOpen = !isOpen;
        toggleBtn.classList.toggle('active', isOpen);
        actionsPanel.classList.toggle('show', isOpen);
    });

    document.addEventListener('click', function(e) {
        if (!toolbar.contains(e.target) && isOpen) {
            isOpen = false;
            toggleBtn.classList.remove('active');
            actionsPanel.classList.remove('show');
        }
    });

    function showToast(msg) {
        var t = document.createElement('div');
        t.className = 'img-align-toast';
        t.innerHTML = msg;
        document.body.appendChild(t);
        requestAnimationFrame(function() {
            t.classList.add('visible');
        });
        setTimeout(function() {
            t.classList.remove('visible');
            setTimeout(function() { t.remove(); }, 300);
        }, 2200);
    }

    var alignLabels = { left: '左对齐', center: '居中', right: '右对齐' };

    toolbar.querySelectorAll('.fab-action').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var align = this.getAttribute('data-align');
            var script = document.createElement('script');
            script.textContent = '(' + function(alignDir, label) {
                try {
                    var editor = CKEDITOR.instances.editor
                              || CKEDITOR.instances['editor']
                              || Object.values(CKEDITOR.instances)[0];

                    if (!editor) {
                        var t = document.createElement('div');
                        t.className = 'img-align-toast';
                        t.textContent = '❌ 未检测到编辑器，请确认在文章编辑页';
                        document.body.appendChild(t);
                        requestAnimationFrame(function() { t.classList.add('visible'); });
                        setTimeout(function() { t.classList.remove('visible'); setTimeout(function() { t.remove(); }, 300); }, 2200);
                        return;
                    }

                    var imgs = editor.document.find('img');
                    var total = imgs.count();

                    if (total === 0) {
                        var t2 = document.createElement('div');
                        t2.className = 'img-align-toast';
                        t2.textContent = '⚠️ 编辑器中未找到图片';
                        document.body.appendChild(t2);
                        requestAnimationFrame(function() { t2.classList.add('visible'); });
                        setTimeout(function() { t2.classList.remove('visible'); setTimeout(function() { t2.remove(); }, 300); }, 2200);
                        return;
                    }

                    var count = 0;

                    imgs.toArray().forEach(function(img) {
                        if (editor.widgets) {
                            var widget = editor.widgets.getByElement(img);
                            if (widget && widget.setData) {
                                try {
                                    widget.setData('align', alignDir);
                                    count++;
                                    return;
                                } catch(e) {}
                            }
                        }

                        img.removeAttribute('align');
                        img.removeStyle('margin-left');
                        img.removeStyle('margin-right');
                        img.removeStyle('float');

                        if (img.hasClass('cke_left'))  img.removeClass('cke_left');
                        if (img.hasClass('cke_right')) img.removeClass('cke_right');
                        if (img.hasClass('cke_center')) img.removeClass('cke_center');

                        if (alignDir === 'center') {
                            img.setAttribute('align', 'center');
                            img.setStyle('display', 'block');
                            img.setStyle('margin-left', 'auto');
                            img.setStyle('margin-right', 'auto');
                        } else if (alignDir === 'left') {
                            img.setAttribute('align', 'left');
                            img.setStyle('float', 'left');
                        } else if (alignDir === 'right') {
                            img.setAttribute('align', 'right');
                            img.setStyle('float', 'right');
                        }

                        count++;
                    });

                    editor.fire('change');
                    editor.fire('saveSnapshot');

                    var t3 = document.createElement('div');
                    t3.className = 'img-align-toast';
                    t3.innerHTML = '✅ 已将 ' + count + ' 张图片设为' + label + '<br><span style="font-size:12px;opacity:0.7">点击编辑区空白处可触发重绘</span>';
                    document.body.appendChild(t3);
                    requestAnimationFrame(function() { t3.classList.add('visible'); });
                    setTimeout(function() { t3.classList.remove('visible'); setTimeout(function() { t3.remove(); }, 300); }, 2200);

                } catch(err) {
                    var t4 = document.createElement('div');
                    t4.className = 'img-align-toast';
                    t4.textContent = '❌ 执行出错：' + err.message;
                    document.body.appendChild(t4);
                    requestAnimationFrame(function() { t4.classList.add('visible'); });
                    setTimeout(function() { t4.classList.remove('visible'); setTimeout(function() { t4.remove(); }, 300); }, 2200);
                    console.error('[CSDN Image Align]', err);
                }
            } + ')(' + JSON.stringify(align) + ',' + JSON.stringify(alignLabels[align]) + ');';

            document.head.appendChild(script);
            script.remove();

            isOpen = false;
            toggleBtn.classList.remove('active');
            actionsPanel.classList.remove('show');
        });
    });

    console.log('[CSDN Image Align] 图片对齐工具已就绪');
})();