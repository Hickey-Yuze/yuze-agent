(function() {                                                                                                                                                                                            
    'use strict';                                                                                                                                                                                          
                                                                                                                                                                                                           
    const DELAY = 300; // 下载间隔（毫秒）                                                                                                                                                                 
    const MIN_SIZE = 50; // 过滤小图标                                                                                                                                                                     
                                                                                                                                                                                                           
    // 收集所有图片 URL                                                                                                                                                                                    
    function collectImages() {                                                                                                                                                                             
      const urls = new Set();                                                                                                                                                                              
                                                                                                                                                                                                           
      document.querySelectorAll('img').forEach(img => {                                                                                                                                                    
        // 过滤太小的图片                                                                                                                                                                                  
        if (img.naturalWidth > 0 && img.naturalWidth < MIN_SIZE) return;                                                                                                                                   
                                                                                                                                                                                                           
        // 标准 src                                                                                                                                                                                        
        if (img.src && img.src.startsWith('http')) {                                                                                                                                                       
          urls.add(img.src);                                                                                                                                                                               
        }                                                                                                                                                                                                  
                                                                                                                                                                                                           
        // currentSrc（响应式图片）                                                                                                                                                                        
        if (img.currentSrc && img.currentSrc.startsWith('http')) {                                                                                                                                         
          urls.add(img.currentSrc);                                                                                                                                                                        
        }                                                                                                                                                                                                  
                                                                                                                                                                                                           
        // 懒加载属性                                                                                                                                                                                      
        ['data-src', 'data-original', 'data-lazy'].forEach(attr => {
          const val = img.getAttribute(attr);                                                                                                                                                              
          if (val && val.startsWith('http')) urls.add(val);                                                                                                                                                
        });                                                                                                                                                                                                
      });                                                                                                                                                                                                  
                                                                                                                                                                                                           
      return [...urls];                                                                                                                                                                                    
    }             
                                                                                                                                                                                                           
    // 提取文件名                                                                                                                                                                                          
    function getFilename(url, index) {
      try {                                                                                                                                                                                                
        const name = new URL(url).pathname.split('/').pop().split('?')[0];                                                                                                                                 
        return name || `image_${index + 1}.jpg`;                                                                                                                                                           
      } catch {                                                                                                                                                                                            
        return `image_${index + 1}.jpg`;                                                                                                                                                                   
      }                                                                                                                                                                                                    
    }                                                                                                                                                                                                      
                  
    // 下载单张图片                                                                                                                                                                                        
    function downloadImage(url, filename) {
      return fetch(url)                                                                                                                                                                                    
        .then(res => {                                                                                                                                                                                     
          if (!res.ok) throw new Error(`HTTP ${res.status}`);                                                                                                                                              
          return res.blob();                                                                                                                                                                               
        })                                                                                                                                                                                                 
        .then(blob => {                                                                                                                                                                                    
          const a = document.createElement('a');                                                                                                                                                           
          const objUrl = URL.createObjectURL(blob);                                                                                                                                                        
          a.href = objUrl;                                                                                                                                                                                 
          a.download = filename;                                                                                                                                                                           
          a.style.display = 'none';                                                                                                                                                                        
          document.body.appendChild(a);                                                                                                                                                                    
          a.click();                                                                                                                                                                                       
          document.body.removeChild(a);                                                                                                                                                                    
          setTimeout(() => URL.revokeObjectURL(objUrl), 100);                                                                                                                                              
          return { success: true, url };                                                                                                                                                                   
        })                                                                                                                                                                                                 
        .catch(err => {                                                                                                                                                                                    
          console.warn(`❌ 下载失败: ${url}`, err.message);                                                                                                                                                
          return { success: false, url, error: err.message };                                                                                                                                              
        });                                                                                                                                                                                                
    }                                                                                                                                                                                                      
                                                                                                                                                                                                           
    // 批量下载（带延迟）                                                                                                                                                                                  
    async function downloadAll() {
      const urls = collectImages();                                                                                                                                                                        
                                                                                                                                                                                                           
      if (urls.length === 0) {                                                                                                                                                                             
        console.log('❌ 未找到图片');                                                                                                                                                                      
        return;                                                                                                                                                                                            
      }           
                                                                                                                                                                                                           
      console.log(`🔍 找到 ${urls.length} 张图片，开始下载...`);                                                                                                                                           
   
      let success = 0, fail = 0;                                                                                                                                                                           
                  
      for (let i = 0; i < urls.length; i++) {                                                                                                                                                              
        const url = urls[i];
        const filename = getFilename(url, i);                                                                                                                                                              
                                                                                                                                                                                                           
        const result = await downloadImage(url, filename);                                                                                                                                                 
        if (result.success) {                                                                                                                                                                              
          success++;                                                                                                                                                                                       
          console.log(`✅ [${i + 1}/${urls.length}] ${filename}`);                                                                                                                                         
        } else {                                                                                                                                                                                           
          fail++;                                                                                                                                                                                          
        }                                                                                                                                                                                                  
                  
        // 延迟避免浏览器拦截                                                                                                                                                                              
        if (i < urls.length - 1) {
          await new Promise(resolve => setTimeout(resolve, DELAY));                                                                                                                                        
        }                                                                                                                                                                                                  
      }                                                                                                                                                                                                    
                                                                                                                                                                                                           
      console.log(`\n✨ 完成: ${success} 成功, ${fail} 失败`);                                                                                                                                             
    }                                                                                                                                                                                                      
                                                                                                                                                                                                           
    downloadAll();                                                                                                                                                                                         
  })();