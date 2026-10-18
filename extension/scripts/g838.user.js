(function() {
  if (window.__pdfExportLoaded) return;
  window.__pdfExportLoaded = true;

  function extractArticle() {
    var contentEl = document.querySelector('div#js_content') || document.querySelector('div.rich_media_content');
    if (contentEl) {
      return {
        title: document.querySelector('div.wenben h1') ? document.querySelector('div.wenben h1').textContent.trim() : document.title,
        html: contentEl.innerHTML
      };
    }
    var sel = window.getSelection();
    if (sel && sel.toString().trim()) {
      var range = sel.getRangeAt(0);
      var frag = range.cloneContents();
      var div = document.createElement('div');
      div.appendChild(frag);
      return { title: document.title, html: div.innerHTML };
    }
    return null;
  }

  function cleanHtml(html) {
    var tmp = document.createElement('div');
    tmp.innerHTML = html;
    var remove = tmp.querySelectorAll('script, style, iframe, .social-share');
    for (var i = 0; i < remove.length; i++) { remove[i].parentNode.removeChild(remove[i]); }
    var links = tmp.querySelectorAll('a');
    for (var j = 0; j < links.length; j++) {
      var text = document.createTextNode(links[j].textContent);
      links[j].parentNode.replaceChild(text, links[j]);
    }
    return tmp.innerHTML;
  }

  function createOverlay(title, html) {
    if (document.getElementById('__pdf-overlay')) return;

    var overlay = document.createElement('div');
    overlay.id = '__pdf-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(2px);font-family:"Microsoft YaHei","PingFang SC",sans-serif';

    var box = document.createElement('div');
    box.style.cssText = 'width:820px;max-height:88vh;background:#fff;border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,0.25);display:flex;flex-direction:column;overflow:hidden';

    // Header
    var header = document.createElement('div');
    header.style.cssText = 'padding:14px 24px;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center';
    var ht = document.createElement('span');
    ht.textContent = '📝 预览并编辑内容（图片可选中后删除）';
    ht.style.cssText = 'font-size:15px;font-weight:600;color:#333';
    var cb = document.createElement('span');
    cb.textContent = '✕';
    cb.style.cssText = 'font-size:18px;cursor:pointer;color:#999;width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:4px;transition:all .2s';
    cb.onmouseenter = function() { cb.style.background = '#f0f0f0'; cb.style.color = '#333'; };
    cb.onmouseleave = function() { cb.style.background = 'transparent'; cb.style.color = '#999'; };
    cb.onclick = function() { document.body.removeChild(overlay); };
    header.appendChild(ht);
    header.appendChild(cb);

    // Title input
    var titleInput = document.createElement('input');
    titleInput.value = title;
    titleInput.style.cssText = 'margin:14px 24px 0;padding:10px 14px;font-size:18px;font-weight:600;border:1px solid #e0e0e0;border-radius:6px;outline:none;color:#1a1a1a;transition:border .2s';
    titleInput.onfocus = function() { titleInput.style.borderColor = '#4a90d9'; };
    titleInput.onblur = function() { titleInput.style.borderColor = '#e0e0e0'; };

    // Editor
    var editor = document.createElement('div');
    editor.contentEditable = 'true';
    editor.spellcheck = false;
    editor.innerHTML = cleanHtml(html);
    editor.style.cssText = 'flex:1;overflow-y:auto;padding:16px 24px;font-size:14px;line-height:2;color:#333;outline:none;white-space:pre-wrap';
    var imgs = editor.querySelectorAll('img');
    for (var i = 0; i < imgs.length; i++) {
      imgs[i].style.cssText = 'max-width:100%;height:auto;display:block;margin:12px auto;border-radius:4px;border:1px dashed #ccc;cursor:pointer';
    }
    var strongs = editor.querySelectorAll('strong,b');
    for (var j = 0; j < strongs.length; j++) {
      strongs[j].style.cssText = 'display:block;font-size:16px;font-weight:bold;margin:20px 0 8px;color:#1a1a1a';
    }

    // Footer
    var footer = document.createElement('div');
    footer.style.cssText = 'padding:12px 24px;display:flex;justify-content:space-between;align-items:center;border-top:1px solid #eee';
    var tip = document.createElement('span');
    tip.textContent = '💡 可编辑文字，点击图片选中后可删除';
    tip.style.cssText = 'font-size:12px;color:#999';

    var btnGroup = document.createElement('div');
    btnGroup.style.cssText = 'display:flex;gap:10px';

    function makeBtn(label, bg, hoverBg, handler) {
      var b = document.createElement('button');
      b.textContent = label;
      b.style.cssText = 'padding:8px 22px;font-size:14px;font-weight:600;border:none;border-radius:6px;cursor:pointer;background:' + bg + ';color:#fff;transition:all .2s';
      b.onmouseenter = function() { b.style.background = hoverBg; };
      b.onmouseleave = function() { b.style.background = bg; };
      b.onclick = handler;
      return b;
    }

    var cancelBtn = makeBtn('取消', '#bbb', '#999', function() {
      document.body.removeChild(overlay);
    });

    var exportBtn = makeBtn('📤 导出PDF', '#4a90d9', '#357abd', function() {
      var finalTitle = titleInput.value.trim() || '未命名文档';
      var finalHtml = editor.innerHTML;

      // 关键校验：确保内容不为空
      var textCheck = editor.innerText.trim();
      if (!textCheck && editor.querySelectorAll('img').length === 0) {
        alert('内容为空，无法导出');
        return;
      }

      exportBtn.textContent = '⏳ 生成中...';
      exportBtn.style.pointerEvents = 'none';

      document.body.removeChild(overlay);
      generatePDF(finalTitle, finalHtml);
    });

    btnGroup.appendChild(cancelBtn);
    btnGroup.appendChild(exportBtn);
    footer.appendChild(tip);
    footer.appendChild(btnGroup);

    box.appendChild(header);
    box.appendChild(titleInput);
    box.appendChild(editor);
    box.appendChild(footer);
    overlay.appendChild(box);

    overlay.onclick = function(e) { if (e.target === overlay) document.body.removeChild(overlay); };
    document.body.appendChild(overlay);
    titleInput.focus();
  }

  function generatePDF(title, html) {
    var now = new Date().toLocaleDateString('zh-CN');

    // 格式化内容中的图片样式
    var tmp = document.createElement('div');
    tmp.innerHTML = html;
    var allImgs = tmp.querySelectorAll('img');
    for (var i = 0; i < allImgs.length; i++) {
      allImgs[i].style.cssText = 'max-width:100%;height:auto;display:block;margin:16px auto';
    }
    var contentHtml = tmp.innerHTML;

    // 安全检查
    if (!contentHtml || contentHtml.trim() === '') {
      alert('导出内容为空，请重试');
      return;
    }

    // 直接拼接完整HTML字符串
    var fullHtml = ''
      + '<!DOCTYPE html>'
      + '<html lang="zh-CN">'
      + '<head>'
      + '<meta charset="UTF-8">'
      + '<title>' + title + '</title>'
      + '<style>'
      + '@page{size:A4;margin:2cm 2.5cm}'
      + '*{margin:0;padding:0;box-sizing:border-box}'
      + 'body{font-family:"Microsoft YaHei","PingFang SC",SimSun,serif;font-size:14px;line-height:2;color:#333;padding:48px 64px}'
      + 'h1{font-size:22px;text-align:center;margin-bottom:20px;line-height:1.4}'
      + '.meta{text-align:center;font-size:12px;color:#999;margin-bottom:28px;padding-bottom:16px;border-bottom:1px solid #e5e5e5}'
      + 'strong,b{display:block;font-size:16px;font-weight:bold;margin:22px 0 8px;color:#1a1a1a}'
      + 'p{margin-bottom:10px;text-align:justify}'
      + 'img{max-width:100%;height:auto;display:block;margin:16px auto}'
      + '.footer{text-align:center;font-size:10px;color:#ccc;margin-top:36px;padding-top:12px;border-top:1px solid #e5e5e5}'
      + '</style>'
      + '</head>'
      + '<body>'
      + '<h1>' + title + '</h1>'
      + '<div class="meta">来源：法安网 | 导出时间：' + now + '</div>'
      + '<div class="content">' + contentHtml + '</div>'
      + '<div class="footer">Yuze 浏览器 · 一键导出</div>'
      + '</body>'
      + '</html>';

    var w = window.open('', '_blank');
    if (!w) {
      alert('弹出窗口被拦截，请允许后重试');
      return;
    }

    // 显式写入
    w.document.open();
    w.document.write(fullHtml);
    w.document.close();

    // 等待图片加载后打印
    var printImgs = w.document.querySelectorAll('img');
    var imgCount = printImgs.length;
    var printed = false;

    function doPrint() {
      if (printed) return;
      printed = true;
      setTimeout(function() { w.print(); }, 500);
    }

    if (imgCount > 0) {
      var loaded = 0;
      for (var k = 0; k < printImgs.length; k++) {
        if (printImgs[k].complete && printImgs[k].naturalHeight > 0) {
          loaded++;
        } else {
          printImgs[k].onload = function() { loaded++; if (loaded >= imgCount) doPrint(); };
          printImgs[k].onerror = function() { loaded++; if (loaded >= imgCount) doPrint(); };
        }
      }
      if (loaded >= imgCount) doPrint();
      // 5秒超时保底
      setTimeout(doPrint, 5000);
    } else {
      doPrint();
    }
  }

  // 右上角按钮
  var btn = document.createElement('div');
  btn.innerHTML = '📤 选中内容一键导出';
  btn.style.cssText = 'position:fixed;top:12px;right:12px;z-index:99999;padding:8px 16px;background:#4a90d9;color:#fff;font-size:13px;font-weight:600;border-radius:6px;cursor:pointer;box-shadow:0 2px 8px rgba(74,144,217,0.35);transition:all .2s;user-select:none;font-family:"Microsoft YaHei","PingFang SC",sans-serif';
  btn.onmouseenter = function() { btn.style.background = '#357abd'; btn.style.transform = 'translateY(-1px)'; };
  btn.onmouseleave = function() { btn.style.background = '#4a90d9'; btn.style.transform = 'none'; };
  btn.onclick = function() {
    var article = extractArticle();
    if (!article) {
      alert('未找到可导出的内容，请先选中需要导出的文本');
      return;
    }
    createOverlay(article.title, article.html);
  };
  document.body.appendChild(btn);
})();