(function() {
  'use strict';

  if (window.csdnNotionModeV8) return;
  window.csdnNotionModeV8 = true;

  let isReadingMode = false;
  let modeStyle = null;
  let toggleBtn = null;
  let pdfBtn = null;

  function toggleMode() {
    isReadingMode = !isReadingMode;
    if (isReadingMode) {
      enterReadingMode();
      if (toggleBtn) {
        toggleBtn.textContent = '退出阅读';
        toggleBtn.classList.add('notion-active');
      }
    } else {
      exitReadingMode();
      if (toggleBtn) {
        toggleBtn.textContent = '阅读模式';
        toggleBtn.classList.remove('notion-active');
      }
    }
  }

  function exitReadingMode() {
    if (modeStyle) {
      modeStyle.remove();
      modeStyle = null;
    }
    document.querySelectorAll('#content_views img').forEach(function(img) {
      var p = img.parentElement;
      if (p && p.tagName === 'P') {
        p.style.textAlign = '';
      }
    });
  }

  function enterReadingMode() {
    exitReadingMode();

    modeStyle = document.createElement('style');
    modeStyle.id = 'notion-mode-style';
    modeStyle.textContent = '\
/* ===== 隐藏所有干扰元素 ===== */\
#toolbarBox,#csdn-toolbar,.csdn-toolbar,\
.blog_container_aside,\
#rightAside,#rightAsideConcision,#recommend-right,#recommend-right-concision,\
#blogHuaweiyunAdvert,.column-group,.column-group-item,\
.vip-limited-time-offer-box-new,.limited-time-vip-box,\
#toolBarBox,.more-toolbox-new,.more-toolbar,\
#commentBox,#pcCommentBox,.comment-box,.has-comment,#commentSideBoxshadow,#pcCommentSideBox,\
.comment-side-box-shadow,.comment-rewarddialog-box,.redEnvolope,.pay-code,\
#lookFlodComment,#pcFlodCommentSideBox,#lookBadComment,\
.recommend-box,.second-recommend-box,.insert-baidu-box,.recommend-item-box,.recommend-box-style,\
[id^="kp_box"],#dmp_ad_58,#recommendAdBox,.wwads-cn,\
.gitcode-qc-left-box,.gitcode-qc-right-box,#footerRightAds,.programmer1Box,.isShowFooterAds,\
.blog-footer-bottom,#copyright-box,#csdn-copyright-footer,\
.csdn-side-toolbar,.csdn-side-newbie-guide,\
.mask-dark,.directory-boxshadow-dialog,.directory-boxshadow-dialog-box,.skin-boxshadow,\
.print_watermark,.print_watermark_info,\
.report-box,#st_confirmBox,#st_alertBox,#st_toastBox,\
.keyword-dec-box,\
.aside-box,#asideProfile,#asideHotArticle,#asideCategory,#asidedirectory,#asideArchive,\
#aside-content,#aside-content-column,.kind_person,.article-previous,.flexible-box-new,\
.article-header .operating,.article-header .href-article-edit-new,\
.article-header .blog-tags-box .community-name,\
#articleSearchTip,.article-search-tip,\
img[src*="pdf_watermark"],iframe[src*="kunpeng"]{display:none!important}\
\
/* ===== 页面布局 ===== */\
html,body{background:#ffffff!important;margin:0!important;padding:0!important}\
.main_father{background:#ffffff!important}\
#mainBox{max-width:900px!important;margin:0 auto!important;padding:0!important;\
background:#ffffff!important;float:none!important}\
#mainBox main{width:100%!important;float:none!important}\
\
/* ===== 文章标题 ===== */\
.article-header-box{max-width:100%!important;margin:0!important;\
padding:48px 0 0 0!important;background:#ffffff!important;border:none!important}\
.article-title-box{padding:0!important}\
.title-article{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,\
"Helvetica Neue",Arial,sans-serif!important;color:#37352f!important;font-size:32px!important;\
font-weight:700!important;line-height:1.3!important;margin-bottom:12px!important;\
letter-spacing:-0.5px!important}\
.article-info-box{color:#9b9a97!important;font-size:14px!important;\
font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif!important;\
margin-bottom:24px!important;padding-bottom:16px!important;border-bottom:1px solid #e9e9e7!important}\
.article-info-box .bar-content{color:#9b9a97!important;font-size:14px!important}\
.article-info-box .bar-content span{color:#9b9a97!important;font-size:14px!important}\
.article-info-box a{color:#9b9a97!important}\
.article-tag .label{display:none!important}\
.tag-link-new{color:#2383e2!important;font-size:14px!important;text-decoration:none!important}\
.up-time{color:#9b9a97!important;font-size:14px!important}\
\
/* ===== 正文 ===== */\
#content_views{max-width:100%!important;margin:0!important;padding:0!important;\
background:#ffffff!important;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,\
"Helvetica Neue",Arial,sans-serif!important;font-size:16px!important;line-height:1.6!important;\
color:#37352f!important}\
#content_views p{margin-bottom:1em!important;line-height:1.6!important;\
color:#37352f!important;font-size:16px!important}\
\
/* ===== 图片居中 ===== */\
#content_views img{display:block!important;margin:1.2em auto!important;\
max-width:100%!important;height:auto!important;border-radius:4px!important;float:none!important}\
#content_views p.img-center{text-align:center!important;margin:1.2em 0!important}\
#content_views p.img-center img{display:inline-block!important;margin:0 auto!important}\
#content_views p:has(>img:only-child){text-align:center!important}\
\
/* ===== 列表 ===== */\
#content_views ul,#content_views ol{margin-left:24px!important;margin-bottom:1em!important;\
padding-left:8px!important;color:#37352f!important}\
#content_views li{margin-bottom:0.4em!important;line-height:1.6!important}\
#content_views ol li{list-style-type:decimal!important}\
\
/* ===== 引用块 ===== */\
#content_views blockquote{border-left:3px solid #37352f!important;padding:8px 16px!important;\
margin:1em 0!important;background:#f7f6f3!important;border-radius:0 4px 4px 0!important;\
color:#6b6a67!important;font-style:normal!important}\
#content_views blockquote p{color:#6b6a67!important;margin-bottom:0.4em!important}\
\
/* ===== 表格 ===== */\
#content_views table{width:100%!important;border-collapse:collapse!important;\
margin:1em 0!important;font-size:14px!important}\
#content_views th,#content_views td{border:1px solid #e9e9e7!important;\
padding:8px 12px!important;text-align:left!important}\
#content_views th{background:#f7f6f3!important;font-weight:600!important;color:#37352f!important}\
\
/* ===== 链接 & 加粗 ===== */\
#content_views a{color:#2383e2!important;text-decoration:none!important}\
#content_views a:hover{text-decoration:underline!important}\
#content_views strong{color:#37352f!important;font-weight:600!important}\
\
/* ===== 杂项 ===== */\
.words-blog-icon,.new-words-blog .words-blog-icon{display:none!important}\
#content_views h1 a,#content_views h2 a,#content_views h3 a,#content_views h4 a{\
visibility:hidden!important;margin-right:0!important}\
';

    document.head.appendChild(modeStyle);

    document.querySelectorAll('#content_views img').forEach(function(img) {
      var p = img.parentElement;
      if (p && p.tagName === 'P') {
        p.style.textAlign = 'center';
      }
    });
  }

  // ===== 新增：导出 PDF =====
  function exportPDF() {
    var titleEl = document.querySelector('.title-article');
    var title = titleEl ? titleEl.innerText.trim() : document.title;
    
    var contentEl = document.querySelector('#content_views');
    if (!contentEl) {
      alert('未找到文章内容，无法导出');
      return;
    }

    // 克隆正文，避免影响当前页面
    var contentClone = contentEl.cloneNode(true);
    
    // 移除克隆中的脚本
    contentClone.querySelectorAll('script').forEach(function(s) { s.remove(); });
    
    // 处理图片：补全地址并优化打印样式
    contentClone.querySelectorAll('img').forEach(function(img) {
      var realSrc = img.getAttribute('src') || img.dataset.src || '';
      if (realSrc && realSrc.indexOf('http') !== 0) {
        try { realSrc = new URL(realSrc, window.location.href).href; } catch(e) {}
      }
      img.removeAttribute('data-src');
      img.setAttribute('src', realSrc);
      img.style.cssText = 'max-width:100%!important;height:auto!important;display:block;margin:1em auto;border-radius:4px;';
    });

    // 打印专用样式（Notion 风格 + 分页控制）
    var printStyles = '\
@page { size: A4; margin: 2cm 1.8cm; }\
* { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }\
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; font-size: 11pt; line-height: 1.6; color: #37352f; background: #ffffff; margin: 0; padding: 0; }\
.pdf-wrapper { max-width: 100%; margin: 0 auto; }\
.pdf-title { font-size: 22pt; font-weight: 700; line-height: 1.3; color: #000; margin: 0 0 12pt 0; letter-spacing: -0.5px; page-break-after: avoid; }\
.pdf-meta { font-size: 10pt; color: #9b9a97; margin-bottom: 18pt; padding-bottom: 10pt; border-bottom: 1px solid #e9e9e7; }\
.pdf-content { font-size: 11pt; line-height: 1.6; color: #37352f; }\
.pdf-content p { margin: 0 0 0.8em 0; orphans: 3; widows: 3; }\
.pdf-content h1, .pdf-content h2, .pdf-content h3, .pdf-content h4 { margin: 1.2em 0 0.6em 0; color: #000; page-break-after: avoid; orphans: 3; widows: 3; }\
.pdf-content h1 { font-size: 16pt; }\
.pdf-content h2 { font-size: 14pt; }\
.pdf-content h3 { font-size: 12pt; }\
.pdf-content h4 { font-size: 11pt; }\
.pdf-content img { max-width: 100% !important; height: auto !important; display: block; margin: 1em auto; border-radius: 4px; page-break-inside: avoid; }\
.pdf-content blockquote { border-left: 3px solid #37352f; padding: 8pt 12pt; margin: 1em 0; background: #f7f6f3; border-radius: 0 4px 4px 0; color: #6b6a67; page-break-inside: avoid; }\
.pdf-content pre, .pdf-content code { font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace; font-size: 10pt; background: #f7f6f3; border-radius: 4px; }\
.pdf-content pre { padding: 12pt; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word; page-break-inside: avoid; }\
.pdf-content table { width: 100%; border-collapse: collapse; margin: 1em 0; font-size: 10pt; page-break-inside: avoid; }\
.pdf-content th, .pdf-content td { border: 1px solid #e9e9e7; padding: 6pt 8pt; text-align: left; }\
.pdf-content th { background: #f7f6f3; font-weight: 600; }\
.pdf-content ul, .pdf-content ol { margin: 0 0 0.8em 0; padding-left: 20pt; }\
.pdf-content li { margin-bottom: 0.3em; }\
.pdf-content a { color: #2383e2; text-decoration: none; }\
.pdf-content strong { color: #000; font-weight: 600; }\
';

    var html = '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>' + 
      title + '</title><style>' + printStyles + '</style></head><body>' +
      '<div class="pdf-wrapper">' +
      '<h1 class="pdf-title">' + title + '</h1>' +
      '<div class="pdf-meta">来源：CSDN</div>' +
      '<div class="pdf-content">' + contentClone.innerHTML + '</div>' +
      '</div></body></html>';

    var printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('导出 PDF 需要允许浏览器弹出窗口，请检查设置后重试');
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    setTimeout(function() {
      printWindow.focus();
      printWindow.print();
    }, 400);
  }

  function createToggleBtn() {
    if (document.getElementById('notion-mode-toggle')) return;

    var btnStyle = document.createElement('style');
    btnStyle.id = 'notion-toggle-style';
    btnStyle.textContent = '\
#notion-mode-toggle{position:fixed!important;top:72px!important;right:16px!important;\
z-index:2147483647!important;padding:8px 20px!important;background:#ffffff!important;\
color:#37352f!important;border:1px solid #e0e0de!important;border-radius:20px!important;\
font-size:13px!important;font-weight:500!important;font-family:-apple-system,BlinkMacSystemFont,\
"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif!important;cursor:pointer!important;\
box-shadow:0 2px 8px rgba(0,0,0,0.06),0 0 1px rgba(0,0,0,0.1)!important;\
transition:all .25s cubic-bezier(.4,0,.2,1)!important;user-select:none!important;\
-webkit-user-select:none!important;letter-spacing:.3px!important;line-height:1.5!important;\
pointer-events:auto!important;display:block!important;visibility:visible!important;opacity:1!important}\
#notion-mode-toggle:hover{box-shadow:0 6px 20px rgba(0,0,0,0.1),0 0 1px rgba(0,0,0,0.1)!important;\
transform:translateY(-2px)!important}\
#notion-mode-toggle:active{transform:translateY(0)!important;\
box-shadow:0 2px 6px rgba(0,0,0,0.08)!important}\
#notion-mode-toggle.notion-active{background:#37352f!important;color:#ffffff!important;\
border-color:#37352f!important;box-shadow:0 4px 16px rgba(55,53,47,0.25)!important}\
#notion-mode-toggle.notion-active:hover{background:#2f2d2a!important;\
box-shadow:0 6px 20px rgba(55,53,47,0.3)!important;transform:translateY(-2px)!important}\
#notion-pdf-btn{position:fixed!important;top:118px!important;right:16px!important;\
z-index:2147483647!important;padding:8px 20px!important;background:#ffffff!important;\
color:#d93025!important;border:1px solid #e0e0de!important;border-radius:20px!important;\
font-size:13px!important;font-weight:500!important;font-family:-apple-system,BlinkMacSystemFont,\
"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif!important;cursor:pointer!important;\
box-shadow:0 2px 8px rgba(0,0,0,0.06),0 0 1px rgba(0,0,0,0.1)!important;\
transition:all .25s cubic-bezier(.4,0,.2,1)!important;user-select:none!important;\
-webkit-user-select:none!important;letter-spacing:.3px!important;line-height:1.5!important;\
pointer-events:auto!important;display:block!important;visibility:visible!important;opacity:1!important}\
#notion-pdf-btn:hover{box-shadow:0 6px 20px rgba(0,0,0,0.1),0 0 1px rgba(0,0,0,0.1)!important;\
transform:translateY(-2px)!important;background:#fce8e8!important}\
#notion-pdf-btn:active{transform:translateY(0)!important;\
box-shadow:0 2px 6px rgba(0,0,0,0.08)!important}';
    document.head.appendChild(btnStyle);

    toggleBtn = document.createElement('button');
    toggleBtn.id = 'notion-mode-toggle';
    toggleBtn.textContent = '阅读模式';
    toggleBtn.type = 'button';
    toggleBtn.onclick = function() { toggleMode(); };

    pdfBtn = document.createElement('button');
    pdfBtn.id = 'notion-pdf-btn';
    pdfBtn.textContent = '导出 PDF';
    pdfBtn.type = 'button';
    pdfBtn.onclick = function() { exportPDF(); };

    if (document.body) {
      document.body.insertBefore(toggleBtn, document.body.firstChild);
      document.body.insertBefore(pdfBtn, document.body.firstChild);
    } else {
      document.documentElement.appendChild(toggleBtn);
      document.documentElement.appendChild(pdfBtn);
    }
  }

  function init() {
    createToggleBtn();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  setTimeout(init, 500);
  setTimeout(init, 1500);
  setTimeout(init, 3000);
})();