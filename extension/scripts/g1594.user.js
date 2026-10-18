(function() {
  console.log("=== 像素书笑话功能开始加载 ===");
  
  // 30条笑话（10条程序员梗 + 20条优质冷笑话）
  var jokes = [
    // 程序员梗 (10条)
    "为什么程序员分不清万圣节和圣诞节？因为 Oct 31 == Dec 25！",
    "程序猿最烦两件事：别人要他写文档，别人的程序没文档。",
    "换灯泡需要几个程序员？一个也不要，这是硬件问题。",
    "为什么程序员喜欢黑暗模式？因为光吸引bug。",
    "程序员买西瓜：师傅，这瓜多少钱一斤？八毛，给我来熟的！",
    "Java和C++的区别？Java程序员不用处理内存泄漏，但他们得处理NullPointerException。",
    "程序员约会：宝贝，我们去吃饭、看电影，然后...我回家debug。",
    "什么是递归？就是自己在家里叫自己开门。",
    "前端程序员最害怕什么？后端说他改了API。",
    "后端程序员最害怕什么？前端说他改了样式。",
    
    // 优质冷笑话 (20条)
    "一只癞蛤蟆最新茶不思饭不想，连蚊子都不抓着吃了，其他的癞蛤蟆都很想知道它到底怎么了。年最长癞蛤蟆说了：'抓只天鹅来，保管好。'",
    "一天，白娘子放了个屁。许仙：原来你还是条响尾蛇？",
    "问：两个i人谈恋爱就会有一个e人暴富，为什么？答：因为i²=-1。",
    "从前有个人钓鱼，钓到了只鱿鱼。鱿鱼求他：你放了我吧，别把我烤来吃啊。那个人说：好的，那么我来考问你几个问题吧。鱿鱼很开心说：你考吧你考吧！",
    "老师问一同学怎么减少白色污染？同学答：把饭盒做成蓝色。",
    "飞机上，一位空中小姐问一个小女孩说：'为什么飞机飞这么高都不会撞到星星呢？'小女孩回答：'因为星星会闪啊！'",
    "一只土狗沙漠中旅行，发现了电线杆，却尿急被憋死了，为什么？因为虚线条写着'此处禁止排尿'。",
    "有一只深海鱼，每天都自由自在地游来游去，但它却不知道自己叫什么，因为它听不到。",
    "有一天，小明去动物园，看到一只企鹅在哭。小明问：'你怎么了？'企鹅说：'没人理我。'小明说：'我做你朋友吧！'企鹅说：'真的吗？'小明说：'真的，我从来不说假话。'企鹅说：'那太好了，你快告诉我，我是谁？'",
    "老师：请用'有...有...还有...'造句。小明：我家有爸爸，有妈妈，还有我。老师：很好！小明：还有500万存款！",
    "一个鸡蛋去茶馆喝茶，结果变成了茶叶蛋。",
    "有一只蚂蚁在大象身上爬，大象说：'你爬什么爬？'蚂蚁说：'我爬呀爬呀就习惯了。'",
    "小明问：'妈妈，为什么飞机在天上飞不会掉下来？'妈妈说：'因为飞机有翅膀啊。'小明说：'那为什么鸡有翅膀不会飞？'妈妈：'......'",
    "有一只猪，它走啊走啊，走到了英国，结果变成了火腿。",
    "一只青蛙对另一只青蛙说：'我发现了一个秘密，人类是用肺呼吸的。'另一只青蛙说：'那又怎样？'第一只青蛙说：'那我们以后就可以放心地在陆地上小便了。'",
    "老师：小明，你知道1+1等于几吗？小明：不知道。老师：回家问你爸爸。第二天小明：老师，我爸说是2，我妈说是3，因为有了我。",
    "有一只鱼，它游啊游啊，游到了沙漠，结果变成了烤鱼。",
    "小明：'老师，我觉得学习好累。'老师：'累就对了，舒服是留给死人的。'",
    "有一只猫，它走啊走啊，走到了电脑前，结果变成了鼠标。",
    "一个包子走在路上，走着走着饿了，于是把自己吃了。"
  ];
  
  // 创建书图标
  var bookIcon = document.createElement('div');
  bookIcon.id = 'pixelBookIcon';
  bookIcon.style.cssText = 'position:fixed;bottom:20px;right:20px;width:50px;height:40px;background:#8B4513;border:2px solid #654321;border-radius:4px;cursor:pointer;z-index:1000;box-shadow:0 4px 8px rgba(0,0,0,0.3);transition:all 0.3s ease;';
  
  // 添加页面效果
  var page = document.createElement('div');
  page.style.cssText = 'position:absolute;top:4px;left:25px;width:20px;height:32px;background:#F5DEB3;border:1px solid #D2B48C;border-radius:0 2px 2px 0;';
  
  // 添加线条
  for (var i = 0; i < 5; i++) {
    var line = document.createElement('div');
    line.style.cssText = 'position:absolute;left:2px;top:' + (6 + i * 5) + 'px;width:16px;height:1px;background:#8B4513;opacity:0.6;';
    page.appendChild(line);
  }
  
  bookIcon.appendChild(page);
  
  // 悬停效果
  bookIcon.onmouseover = function() {
    this.style.transform = 'scale(1.1)';
    this.style.boxShadow = '0 6px 12px rgba(0,0,0,0.4)';
  };
  
  bookIcon.onmouseout = function() {
    this.style.transform = 'scale(1)';
    this.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
  };
  
  // 显示笑话
  function showJoke() {
    // 移除现有弹窗
    var existing = document.getElementById('jokePopup');
    if (existing) existing.remove();
    
    // 随机选择笑话
    var randomJoke = jokes[Math.floor(Math.random() * jokes.length)];
    
    // 创建弹窗
    var popup = document.createElement('div');
    popup.id = 'jokePopup';
    popup.style.cssText = 'position:fixed;bottom:75px;right:20px;width:280px;background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);border-radius:12px;padding:15px;box-shadow:0 8px 25px rgba(0,0,0,0.2);z-index:1001;border:1px solid rgba(255,255,255,0.1);';
    
    // 笑话内容
    var jokeText = document.createElement('div');
    jokeText.textContent = randomJoke;
    jokeText.style.cssText = 'color:white;font-size:13px;line-height:1.4;text-align:center;margin-bottom:12px;font-family:Arial,sans-serif;text-shadow:1px 1px 2px rgba(0,0,0,0.3);';
    
    // 关闭按钮
    var closeBtn = document.createElement('button');
    closeBtn.textContent = '知道了 😊';
    closeBtn.style.cssText = 'background:rgba(255,255,255,0.2);border:none;color:white;padding:6px 12px;border-radius:15px;cursor:pointer;font-size:12px;margin:0 auto;display:block;transition:background 0.2s;';
    
    closeBtn.onmouseover = function() {
      this.style.backgroundColor = 'rgba(255,255,255,0.3)';
    };
    
    closeBtn.onmouseout = function() {
      this.style.backgroundColor = 'rgba(255,255,255,0.2)';
    };
    
    closeBtn.onclick = function() {
      popup.style.opacity = '0';
      setTimeout(function() {
        if (popup.parentNode) popup.remove();
      }, 200);
    };
    
    popup.appendChild(jokeText);
    popup.appendChild(closeBtn);
    document.body.appendChild(popup);
    
    // 自动关闭
    setTimeout(function() {
      if (popup.parentNode) {
        popup.style.opacity = '0';
        setTimeout(function() {
          if (popup.parentNode) popup.remove();
        }, 200);
      }
    }, 5000); // 延长到5秒，因为冷笑话需要时间理解
  }
  
  // 绑定点击事件
  bookIcon.onclick = function(e) {
    e.stopPropagation();
    showJoke();
  };
  
  // 添加到页面
  document.body.appendChild(bookIcon);
  
  console.log("=== 像素书笑话功能加载完成 ===");
  console.log("书图标已创建，包含" + jokes.length + "条笑话");
  console.log("笑话分类：程序员梗(10条) + 优质冷笑话(20条) = 30条");
  console.log("点击右下角书图标即可查看笑话！");
})();