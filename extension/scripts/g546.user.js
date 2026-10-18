(function() {
  var SCRIPT_ID = 'pdf-download-script';
  if (document.getElementById(SCRIPT_ID)) return;
  var marker = document.createElement('div');
  marker.id = SCRIPT_ID;
  marker.style.display = 'none';
  document.body.appendChild(marker);

  function tryDownloadPDF(retries) {
    if (retries <= 0) {
      console.warn('All download attempts failed.');
      return;
    }

    var iframe = document.querySelector('iframe[src*="pdfjs"]');
    if (!iframe) {
      console.warn('PDF iframe not found, retrying...');
      setTimeout(function() { tryDownloadPDF(retries - 1); }, 2000);
      return;
    }

    try {
      var iframeWin = iframe.contentWindow;
      var app = iframeWin.PDFViewerApplication;

      if (!app || !app.pdfDocument) {
        console.log('PDF not fully loaded yet, waiting...');
        setTimeout(function() { tryDownloadPDF(retries - 1); }, 3000);
        return;
      }

      app.pdfDocument.getData().then(function(data) {
        var blob = new Blob([data], { type: 'application/pdf' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'down.pdf';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(function() {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 1000);
        console.log('PDF download triggered successfully from viewer data!');
      }).catch(function(err) {
        console.error('getData() failed:', err);
        tryClickDownloadButton(iframeWin);
      });
    } catch (e) {
      console.error('Cannot access iframe content:', e);
      tryClickDownloadButton(null);
    }
  }

  function tryClickDownloadButton(iframeWin) {
    try {
      if (!iframeWin) {
        var iframe = document.querySelector('iframe[src*="pdfjs"]');
        if (iframe) iframeWin = iframe.contentWindow;
      }
      if (!iframeWin) return;

      var iframeDoc = iframeWin.document;
      var downloadBtn = iframeDoc.querySelector('#download')
        || iframeDoc.querySelector('button[title="下载"]')
        || iframeDoc.querySelector('.toolbarButton.download');
      if (downloadBtn) {
        downloadBtn.click();
        console.log('Clicked PDF.js download button');
      } else {
        console.warn('Download button not found in PDF.js viewer');
      }
    } catch (e) {
      console.error('Cannot click download button:', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(function() { tryDownloadPDF(5); }, 3000);
    });
  } else {
    setTimeout(function() { tryDownloadPDF(5); }, 3000);
  }
})();