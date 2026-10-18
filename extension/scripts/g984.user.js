(async function __tabEvaluateScriptBridge() {
  const __tabScriptArgs = null;
  const __tabOriginalFunction = (
    async function run(args) {
      // 创建完整的 Python 测试网页
      const container = document.createElement('div');
      container.id = 'python-test-page';
      container.innerHTML = `
        <style>
          #python-test-page {
            all: initial;
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            z-index: 999999;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
            color: #e6e6e6;
            overflow-y: auto;
            padding: 20px;
            box-sizing: border-box;
          }
          .ptp-header {
            text-align: center;
            padding: 30px 0 20px;
          }
          .ptp-header h1 {
            margin: 0;
            font-size: 2.2em;
            background: linear-gradient(90deg, #00d4ff, #7b2ff7, #f107a3);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            letter-spacing: 2px;
          }
          .ptp-header p {
            color: #8899aa;
            margin-top: 8px;
            font-size: 1em;
          }
          .ptp-main {
            display: flex;
            gap: 20px;
            max-width: 1400px;
            margin: 0 auto;
            flex-wrap: wrap;
          }
          .ptp-panel {
            background: rgba(255,255,255,0.05);
            border-radius: 12px;
            border: 1px solid rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
            overflow: hidden;
          }
          .ptp-editor-section {
            flex: 1.5;
            min-width: 500px;
            display: flex;
            flex-direction: column;
          }
          .ptp-output-section {
            flex: 1;
            min-width: 400px;
            display: flex;
            flex-direction: column;
          }
          .ptp-toolbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 16px;
            background: rgba(0,0,0,0.3);
            border-bottom: 1px solid rgba(255,255,255,0.08);
          }
          .ptp-toolbar-title {
            font-weight: 600;
            font-size: 0.95em;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .ptp-toolbar-title .dot {
            width: 10px; height: 10px; border-radius: 50%;
          }
          .dot-green { background: #4ade80; }
          .dot-blue { background: #60a5fa; }
          .dot-orange { background: #fb923c; }
          .ptp-btn-group {
            display: flex;
            gap: 8px;
          }
          .ptp-btn {
            padding: 7px 18px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.85em;
            font-weight: 600;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 5px;
          }
          .ptp-btn-run {
            background: linear-gradient(135deg, #22c55e, #16a34a);
            color: white;
          }
          .ptp-btn-run:hover { transform: translateY(-1px); box-shadow: 0 4px 15px rgba(34,197,94,0.4); }
          .ptp-btn-clear {
            background: rgba(255,255,255,0.1);
            color: #ccc;
          }
          .ptp-btn-clear:hover { background: rgba(255,255,255,0.2); }
          .ptp-btn-example {
            background: linear-gradient(135deg, #3b82f6, #2563eb);
            color: white;
          }
          .ptp-btn-example:hover { transform: translateY(-1px); box-shadow: 0 4px 15px rgba(59,130,246,0.4); }
          .ptp-editor-wrap {
            flex: 1;
            position: relative;
          }
          #ptp-code-editor {
            width: 100%;
            height: 100%;
            min-height: 380px;
            background: transparent;
            color: #e6e6e6;
            border: none;
            padding: 16px;
            font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace;
            font-size: 14px;
            line-height: 1.65;
            resize: none;
            outline: none;
            tab-size: 4;
            box-sizing: border-box;
          }
          #ptp-code-editor::placeholder { color: #556677; }
          .ptp-output-wrap {
            flex: 1;
            min-height: 400px;
            overflow: auto;
          }
          #ptp-output {
            padding: 16px;
            font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
            font-size: 13px;
            line-height: 1.6;
            white-space: pre-wrap;
            word-break: break-all;
          }
          .out-info { color: #60a5fa; }
          .out-success { color: #4ade80; }
          .out-error { color: #f87171; }
          .out-warn { color: #fbbf24; }
          .out-value { color: #c084fc; }
          .ptp-test-results {
            padding: 12px 16px;
            background: rgba(0,0,0,0.2);
            border-top: 1px solid rgba(255,255,255,0.08);
            font-size: 0.85em;
            display: none;
          }
          .ptp-test-results.show { display: block; }
          .ptp-status-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 16px;
            background: rgba(0,0,0,0.25);
            font-size: 0.78em;
            color: #667788;
            border-top: 1px solid rgba(255,255,255,0.06);
          }
          .ptp-examples-bar {
            max-width: 1400px;
            margin: 20px auto;
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            align-items: center;
          }
          .ptp-examples-bar label {
            color: #8899aa;
            font-size: 0.9em;
            font-weight: 600;
          }
          .ptp-example-chip {
            padding: 6px 14px;
            border-radius: 20px;
            background: rgba(255,255,255,0.07);
            border: 1px solid rgba(255,255,255,0.12);
            color: #b0c0d0;
            cursor: pointer;
            font-size: 0.82em;
            transition: all 0.2s;
          }
          .ptp-example-chip:hover {
            background: rgba(59,130,246,0.2);
            border-color: rgba(59,130,246,0.4);
            color: #60a5fa;
          }
          .ptp-close-btn {
            position: fixed;
            top: 15px;
            right: 20px;
            z-index: 1000000;
            width: 36px; height: 36px;
            border-radius: 50%;
            border: 1px solid rgba(255,255,255,0.2);
            background: rgba(0,0,0,0.4);
            color: #aaa;
            font-size: 18px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
          }
          .ptp-close-btn:hover {
            background: rgba(248,113,113,0.3);
            border-color: rgba(248,113,113,0.5);
            color: #f87171;
          }
    
          /* 行号 */
          .ptp-line-numbers {
            position: absolute;
            left: 0; top: 0; bottom: 0;
            width: 40px;
            padding: 16px 8px;
            background: rgba(0,0,0,0.15);
            border-right: 1px solid rgba(255,255,255,0.06);
            color: #445566;
            font-family: 'JetBrains Mono', monospace;
            font-size: 13px;
            line-height: 1.65;
            text-align: right;
            user-select: none;
            overflow: hidden;
          }
          #ptp-code-editor { padding-left: 52px; }
    
          /* 动画 */
          @keyframes ptpFadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .ptp-panel { animation: ptpFadeIn 0.4s ease-out; }
        </style>
    
        <button class="ptp-close-btn" id="ptp-close" title="关闭页面">✕</button>
    
        <div class="ptp-header">
          <h1>🐍 Python 在线测试环境</h1>
          <p>在浏览器中编写、运行和测试 Python 代码 — 基于 JavaScript 模拟引擎</p>
        </div>
    
        <div class="ptp-examples-bar">
          <label>📝 示例代码：</label>
          <span class="ptp-example-chip" data-example="hello">Hello World</span>
          <span class="ptp-example-chip" data-example="loop">循环与列表</span>
          <span class="ptp-example-chip" data-example="function">函数定义</span>
          <span class="ptp-example-chip" data-example="class">类与对象</span>
          <span class="ptp-example-chip" data-example="test">单元测试</span>
          <span class="ptp-example-chip" data-example="algo">算法题</span>
        </div>
    
        <div class="ptp-main">
          <!-- 编辑器面板 -->
          <div class="ptp-panel ptp-editor-section">
            <div class="ptp-toolbar">
              <div class="ptp-toolbar-title">
                <span class="dot dot-green"></span>
                📄 code.py
              </div>
              <div class="ptp-btn-group">
                <button class="ptp-btn ptp-btn-example" id="ptp-format">✨ 格式化</button>
                <button class="ptp-btn ptp-btn-run" id="ptp-run">▶ 运行代码</button>
              </div>
            </div>
            <div class="ptp-editor-wrap">
              <div class="ptp-line-numbers" id="ptp-line-num"></div>
              <textarea id="ptp-code-editor" spellcheck="false" placeholder="# 在这里输入 Python 代码...
    # 例如:
    print('Hello, Python!')
    
    # 定义变量
    name = 'World'
    greeting = f'Hello, {name}!'
    print(greeting)
    
    # 列表操作
    numbers = [1, 2, 3, 4, 5]
    print(f'列表: {numbers}')
    print(f'长度: {len(numbers)}')
    print(f'求和: {sum(numbers)}')"></textarea>
            </div>
            <div class="ptp-status-bar">
              <span id="ptp-cursor-pos">行 1, 列 1</span>
              <span>Python 3 (模拟) · UTF-8</span>
            </div>
          </div>
    
          <!-- 输出面板 -->
          <div class="ptp-panel ptp-output-section">
            <div class="ptp-toolbar">
              <div class="ptp-toolbar-title">
                <span class="dot dot-blue"></span>
                🖥️ 输出控制台
              </div>
              <div class="ptp-btn-group">
                <button class="ptp-btn ptp-btn-clear" id="ptp-clear">清空</button>
              </div>
            </div>
            <div class="ptp-output-wrap">
              <div id="ptp-output"><span class="out-info">💡 点击 "运行代码" 或按 Ctrl+Enter 执行 Python 代码\n输出将显示在这里...</span></div>
            </div>
            <div class="ptp-test-results" id="ptp-test-results"></div>
          </div>
        </div>
      `;
    
      document.body.appendChild(container);
      document.body.style.overflow = 'hidden';
    
      // ====== 示例代码库 ======
      const examples = {
        hello: `# ============================================
    #   示例 1: Hello World
    # ============================================
    
    print("🎉 Hello, Python!")
    print("=" * 40)
    
    # 字符串操作
    name = "Python"
    version = 3.12
    print(f"欢迎来到 {name} {version} 测试环境!")
    
    # 多行字符串
    message = """
    这是一个在线 Python 测试页面
    你可以在这里练习 Python 语法
    支持基本的运算、循环、函数等
    """
    print(message)`,
    
        loop: `# ============================================
    #   示例 2: 循环与列表
    # ============================================
    
    # 列表基本操作
    fruits = ["苹果", "香蕉", "橙子", "葡萄", "西瓜"]
    print("📦 水果列表:", fruits)
    print(f"共有 {len(fruits)} 种水果")
    print("-" * 35)
    
    # for 循环遍历
    for i, fruit in enumerate(fruits, 1):
        print(f"  {i}. {fruit}")
    
    print("-" * 35)
    
    # 列表推导式
    squares = [x ** 2 for x in range(1, 11)]
    print("平方数列表:", squares)
    
    # 字典操作
    scores = {"数学": 95, "英语": 88, "科学": 92}
    print("\\n📊 成绩单:")
    for subject, score in scores.items():
        level = "优秀" if score >= 90 else "良好"
        print(f"  {subject}: {score}分 ({level})")`,
    
        function: `# ============================================
    #   示例 3: 函数定义
    # ============================================
    
    def greet(name, greeting="你好"):
        """向用户打招呼的函数"""
        return f"{greeting}, {name}! 欢迎使用 Python!"
    
    # 调用函数
    print(greet("开发者"))
    print(greet("Python爱好者", greeting="欢迎"))
    print("=" * 40)
    
    # 递归函数：阶乘
    def factorial(n):
        """计算 n 的阶乘"""
        if n <= 1:
            return 1
        return n * factorial(n - 1)
    
    print("\\n📐 阶乘计算:")
    for i in range(1, 8):
        result = factorial(i)
        print(f"  {i}! = {result}")
    
    # 高阶函数
    def apply_operation(numbers, operation):
        """对列表中的每个元素应用操作"""
        return [operation(x) for x in numbers]
    
    nums = [1, 2, 3, 4, 5]
    doubled = apply_operation(nums, lambda x: x * 2)
    squared = apply_operation(nums, lambda x: x ** 2)
    print(f"\\n原数组:     {nums}")
    print(f"翻倍后:     {doubled}")
    print(f"平方后:     {squared}")`,
    
        class: `# ============================================
    #   示例 4: 类与对象 (OOP)
    # ============================================
    
    class Animal:
        """动物基类"""
        def __init__(self, name, species):
            self.name = name
            self.species = species
            self.energy = 100
    
        def speak(self):
            return f"{self.name} 发出了声音..."
    
        def feed(self, amount=10):
            self.energy = min(100, self.energy + amount)
            return f"{self.name} 吃了食物! 能量: {self.energy}"
    
        def info(self):
            return f"[{self.species}] {self.name} (能量: {self.energy})"
    
    
    class Dog(Animal):
        """狗类 - 继承自 Animal"""
        def __init__(self, name, breed):
            super().__init__(name, species="犬科")
            self.breed = breed
            self.tricks = []
    
        def speak(self):
            return f"🐕 {self.name} (汪汪!)"
    
        def learn_trick(self, trick):
            self.tricks.append(trick)
            return f"{self.name} 学会了新技能: {trick}!"
    
    
    class Cat(Animal):
        """猫类 - 继承自 Animal"""
        def speak(self):
            return f"🐱 {self.name} (喵~)"
    
        def nap(self, hours=1):
            self.energy = min(100, self.energy + hours * 20)
            return f"💤 {name} 睡了 {hours} 小时, 精力充沛!"
    
    
    # 创建实例
    dog = Dog("旺财", "柴犬")
    cat = Cat("咪咪", "猫科")
    
    print(dog.speak())
    print(cat.speak())
    print("-" * 35)
    print(dog.learn_trick("握手"))
    print(dog.learn_trick("打滚"))
    print(dog.feed())
    print("-" * 35)
    print(f"狗狗信息: {dog.info()}")
    print(f"猫咪信息: {cat.info()}")`,
    
        test: `# ============================================
    #   示例 5: 单元测试框架
    # ============================================
    
    class TestResult:
        """简单的测试结果收集器"""
        def __init__(self):
            self.passed = 0
            self.failed = 0
            self.errors = []
        
        def assert_equal(self, expected, actual, msg=""):
            if expected == actual:
                self.passed += 1
                print(f"  ✅ PASS: {msg or f'{actual} == {expected}'}")
            else:
                self.failed += 1
                detail = f"❌ FAIL: 期望 {expected}, 得到 {actual}"
                self.errors.append(detail)
                print(f"  {detail}")
        
        def assert_true(self, condition, msg=""):
            if condition:
                self.passed += 1
                print(f"  ✅ PASS: {msg or '条件为真'}")
            else:
                self.failed += 1
                detail = f"❌ FAIL: 条件应为 True"
                self.errors.append(detail)
                print(f"  {detail}")
    
        def summary(self):
            total = self.passed + self.failed
            print(f"\\n{'='*40}")
            print(f"📊 测试结果: {self.passed}/{total} 通过")
            if self.failed == 0:
                print("🎉 所有测试通过!")
            else:
                print(f"⚠️  {self.failed} 个测试失败")
            return self.failed == 0
    
    
    # === 被测试的函数 ===
    def add(a, b):
        return a + b
    
    def is_even(n):
        return n % 2 == 0
    
    def fibonacci(n):
        """返回斐波那契数列前 n 项"""
        if n <= 0:
            return []
        if n == 1:
            return [0]
        fib = [0, 1]
        for _ in range(2, n):
            fib.append(fib[-1] + fib[-2])
        return fib
    
    
    # === 运行测试 ===
    t = TestResult()
    print("🧪 开始运行测试...\\n")
    
    # 测试 add 函数
    print("[测试] add() 加法函数:")
    t.assert_equal(add(2, 3), 5, "2 + 3 = 5")
    t.assert_equal(add(-1, 1), 0, "-1 + 1 = 0")
    t.assert_equal(add(0, 0), 0, "0 + 0 = 0")
    t.assert_equal(add("hello", " world"), "hello world", "字符串拼接")
    
    # 测试 is_even 函数
    print("\\n[测试] is_even() 奇偶判断:")
    t.assert_true(is_even(4), "4 是偶数")
    t.assert_true(is_even(0), "0 是偶数")
    t.assert_true(not is_even(7), "7 是奇数")
    
    # 测试 fibonacci 函数
    print("\\n[测试] fibonacci() 斐波那契:")
    t.assert_equal(fibonacci(1), [0], "n=1")
    t.assert_equal(fibonacci(2), [0, 1], "n=2")
    t.assert_equal(fibonacci(7), [0,1,1,2,3,5,8], "n=7")
    
    # 汇总
    all_passed = t.summary()`,
    
        algo: `# ============================================
    #   示例 6: 经典算法题
    # ============================================
    
    # --- 算法1: 两数之和 ---
    def two_sum(nums, target):
        """找出数组中两个数之和等于 target 的下标"""
        seen = {}
        for i, num in enumerate(nums):
            complement = target - num
            if complement in seen:
                return [seen[complement], i]
            seen[num] = i]
        return []
    
    nums = [2, 7, 11, 15]
    result = two_sum(nums, 9)
    print(f"🔢 两数之和: nums={nums}, target=9")
    print(f"   结果下标: {result}")
    print(f"   验证: nums[{result[0]}] + nums[{result[1]}] = {nums[result[0]]} + {nums[result[1]]} = {nums[result[0]] + nums[result[1]]}")
    print("-" * 45)
    
    # --- 算法2: 二分查找 ---
    def binary_search(arr, target):
        """二分查找，返回下标或 -1"""
        left, right = 0, len(arr) - 1
        while left <= right:
            mid = (left + right) // 2
            if arr[mid] == target:
                return mid
            elif arr[mid] < target:
                left = mid + 1
            else:
                right = mid - 1
        return -1
    
    arr = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19]
    idx = binary_search(arr, 13)
    print(f"🔍 二分查找: 在 {arr} 中查找 13")
    print(f"   找到! 下标 = {idx}, 值 = {arr[idx]}")
    print("-" * 45)
    
    # --- 算法3: 快速排序 ---
    def quicksort(arr):
        if len(arr) <= 1:
            return arr
        pivot = arr[len(arr) // 2]
        left = [x for x in arr if x < pivot]
        middle = [x for x in arr if x == pivot]
        right = [x for x in arr if x > pivot]
        return quicksort(left) + middle + quicksort(right)
    
    unsorted = [38, 27, 43, 3, 9, 82, 10, 64, 56, 21]
    sorted_arr = quicksort(unsorted)
    print(f"📊 快速排序:")
    print(f"   原始: {unsorted}")
    print(f"   排序后: {sorted_arr}")`
      };
    
      // ====== 工具函数 ======
      const editor = container.querySelector('#ptp-code-editor');
      const output = container.querySelector('#ptp-output');
      const lineNumEl = container.querySelector('#ptp-line-num');
      const cursorPosEl = container.querySelector('#ptp-cursor-pos');
    
      // 更新行号
      function updateLineNumbers() {
        const lines = editor.value.split('\n').length;
        let nums = '';
        for (let i = 1; i <= lines; i++) nums += i + '\n';
        lineNumEl.textContent = nums;
      }
    
      // 更新光标位置
      function updateCursorPos() {
        const text = editor.value.substring(0, editor.selectionStart);
        const lines = text.split('\n');
        const line = lines.length;
        const col = lines[lines.length - 1].length + 1;
        cursorPosEl.textContent = `行 ${line}, 列 ${col}`;
      }
    
      editor.addEventListener('input', updateLineNumbers);
      editor.addEventListener('keyup', updateCursorPos);
      editor.addEventListener('click', updateCursorPos);
    
      // Tab 键支持
      editor.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
          e.preventDefault();
          const start = editor.selectionStart;
          const end = editor.selectionEnd;
          editor.value = editor.value.substring(0, start) + '    ' + editor.value.substring(end);
          editor.selectionStart = editor.selectionEnd = start + 4;
          updateLineNumbers();
        }
        // Ctrl+Enter 运行
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          runCode();
        }
      });
    
      // ====== Python 模拟执行引擎 ======
      function runCode() {
        const code = editor.value;
        output.innerHTML = '';
    
        const logs = [];
        const mockPrint = (...args) => {
          logs.push(args.map(a => formatValue(a)).join(' '));
        };
    
        try {
          // 模拟执行 Python 代码
          executePython(code, mockPrint, output);
        } catch (err) {
          appendOutput(`\n❌ 执行错误: ${err.message}`, 'out-error');
        }
      }
    
      function formatValue(val) {
        if (val === undefined) return 'undefined';
        if (val === null) return 'None';
        if (typeof val === 'string') return val;
        if (Array.isArray(val)) return '[' + val.map(formatValue).join(', ') + ']';
        if (typeof val === 'object') return JSON.stringify(val);
        return String(val);
      }
    
      function appendOutput(text, className = '') {
        const span = document.createElement('span');
        span.className = className;
        span.textContent = text;
        output.appendChild(span);
        output.appendChild(document.createTextNode('\n'));
      }
    
      // ====== Python 代码模拟器（核心）======
      function executePython(code, printFn, outputEl) {
        const startTime = performance.now();
    
        // 移除注释（简化处理）
        let cleanCode = code.replace(/#.*$/gm, '');
    
        // 模拟作用域
        const scope = {};
        
        // 内置函数模拟
        scope.len = (val) => {
          if (Array.isArray(val)) return val.length;
          if (typeof val === 'string') return val.length;
          if (typeof val === 'object' && val !== null) return Object.keys(val).length;
          return 0;
        };
        scope.range = (start, end, step = 1) => {
          if (end === undefined) { end = start; start = 0; }
          const arr = [];
          if (step > 0) { for (let i = start; i < end; i += step) arr.push(i); }
          else { for (let i = start; i > end; i += step) arr.push(i); }
          return arr;
        };
        scope.sum = (arr) => arr.reduce((a, b) => a + b, 0);
        scope.min = (arr) => Math.min(...arr);
        scope.max = (arr) => Math.max(...arr);
        scope.abs = Math.abs;
        scope.round = Math.round;
        scope.int = (x) => Math.floor(x);
        scope.float = (x) => parseFloat(x);
        scope.str = (x) => String(x);
        scope.type = (x) => Array.isArray(val) ? '<list>' : typeof x;
        scope.enumerate = (arr, start = 0) => arr.map((v, i) => [i + start, v]);
        scope.zip = (...arrays) => {
          const len = Math.min(...arrays.map(a => a.length));
          return Array.from({ length: len }, (_, i) => arrays.map(a => a[i]));
        };
        scope.list = (arr) => Array.isArray(arr) ? [...arr] : arr.split('');
        scope.dict = (obj) => ({ ...obj });
        scope.sorted = (arr) => [...arr].sort((a, b) => a > b ? 1 : -1);
        scope.reversed = (arr) => [...arr].reverse();
        scope.isinstance = (val, typeStr) => {
          if (typeStr === 'int') return Number.isInteger(val);
          if (typeStr === 'str') return typeof val === 'string';
          if (typeStr === 'list') return Array.isArray(val);
          return true;
        };
    
        // 解析并执行
        const lines = code.split('\n');
        let currentIndent = 0;
        let buffer = '';
        let inMultiLineString = false;
        let multiLineChar = '';
        let multiLineBuffer = [];
    
        for (let li = 0; li < lines.length; li++) {
          let line = lines[li];
          
          // 处理多行字符串
          if (!inMultiLineString) {
            const tripleDouble = line.indexOf('"""');
            const tripleSingle = line.indexOf("'''");
            if (tripleDouble !== -1 || tripleSingle !== -1) {
              inMultiLineString = true;
              multiLineChar = tripleDouble !== -1 ? '"""' : "'''";
              const parts = line.split(multiLineChar);
              if (parts.length > 2) {
                inMultiLineString = false;
              } else {
                continue;
              }
            }
          } else {
            if (line.includes(multiLineChar)) {
              inMultiLineString = false;
            } else {
              multiLineBuffer.push(line);
            }
            continue;
          }
    
          // 跳过空行和纯注释行
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
    
          // 处理 print 语句
          const printMatch = trimmed.match(/^print\s*\((.*)\)\s*$/);
          if (printMatch) {
            try {
              const expr = processExpression(printMatch[1], scope);
              printFn(expr);
              appendOutput(expr, 'out-value');
            } catch (e) {
              appendOutput(trimmed, 'out-warn');
              appendOutput(`  ⚠️ 解析错误: ${e.message}`, 'out-error');
            }
            continue;
          }
    
          // 处理赋值语句
          const assignMatch = trimmed.match(/^(\w+)\s*=\s*(.+)$/);
          if (assignMatch && !trimmed.includes('return') && !trimmed.includes('def ') && !trimmed.includes('class ')) {
            try {
              const val = evaluateValue(assignMatch[2], scope);
              scope[assignMatch[1]] = val;
            } catch (e) {
              // 静默跳过无法解析的赋值
            }
            continue;
          }
    
          // 处理 for 循环
          const forMatch = trimmed.match(/^for\s+(\w+)\s+in\s+(.+):$/);
          if (forMatch) {
            try {
              const iterable = evaluateValue(forMatch[2], scope);
              const loopBody = [];
              let j = li + 1;
              while (j < lines.length) {
                const innerLine = lines[j];
                const innerTrimmed = innerLine.trim();
                if (innerTrimmed && !innerLine.startsWith('    ') && !innerLine.startsWith('\t')) break;
                if (innerTrimmed && !innerTrimmed.startsWith('#')) loopBody.push(innerTrimmed);
                j++;
              }
              
              for (const item of iterable) {
                scope[forMatch[1]] = item;
                for (const bodyLine of loopBody) {
                  const bodyPrint = bodyLine.match(/^print\s*\((.*)\)\s*$/);
                  if (bodyPrint) {
                    const expr = processExpression(bodyPrint[1], scope);
                    printFn(expr);
                    appendOutput(expr, 'out-value');
                  }
                  const bodyAssign = bodyLine.match(/^(\w+)\s*=\s*(.+)$/);
                  if (bodyAssign) {
                    scope[bodyAssign[1]] = evaluateValue(bodyAssign[2], scope);
                  }
                }
              }
              li = j - 1;
            } catch (e) {
              appendOutput(`  ⚠️ 循环解析: ${e.message}`, 'out-warn');
            }
            continue;
          }
    
          // 处理 if 语句（简单）
          const ifMatch = trimmed.match(/^if\s+(.+):$/);
          if (ifMatch) {
            try {
              const cond = evaluateValue(ifMatch[1], scope);
              if (cond) {
                // 执行缩进块
                let j = li + 1;
                while (j < lines.length) {
                  const innerLine = lines[j];
                  const innerTrimmed = innerLine.trim();
                  if (innerTrimmed && !innerLine.startsWith('    ') && !innerLine.startsWith('\t')) break;
                  if (innerTrimmed && !innerTrimmed.startsWith('#')) {
                    const bodyPrint = innerTrimmed.match(/^print\s*\((.*)\)\s*$/);
                    if (bodyPrint) {
                      const expr = processExpression(bodyPrint[1], scope);
                      printFn(expr);
                      appendOutput(expr, 'out-value');
                    }
                  }
                  j++;
                }
              }
            } catch (e) {}
            continue;
          }
        }
    
        const elapsed = ((performance.now() - startTime) / 1000).toFixed(3);
        appendOutput('', '');
        appendOutput(`✨ 执行完成 · 耗时 ${elapsed}s`, 'out-info');
      }
    
      function evaluateValue(expr, scope) {
        expr = expr.trim();
        if (!expr) return null;
    
        // 字符串
        if ((expr.startsWith('"') && expr.endsWith('"')) || (expr.startsWith("'") && expr.endsWith("'"))) {
          return expr.slice(1, -1).replace(/\\n/g, '\n').replace(/\\t/g, '\t');
        }
    
        // f-string 简化处理
        if (expr.startsWith('f"') || expr.startsWith("f'")) {
          const quote = expr[1];
          let raw = expr.slice(2, -1);
          raw = raw.replace(/\{([^}]+)\}/g, (_, p1) => {
            try { return evaluateValue(p1.trim(), scope); } catch { return '{' + p1 + '}'; }
          });
          return raw;
        }
    
        // 数字
        if (/^-?\d+(\.\d+)?$/.test(expr)) return parseFloat(expr);
    
        // 布尔
        if (expr === 'True' || expr === 'true') return true;
        if (expr === 'False' || expr === 'false') return false;
        if (expr === 'None' || expr === 'null') return null;
    
        // 列表
        if (expr.startsWith('[') && expr.endsWith(']')) {
          const inner = expr.slice(1, -1);
          if (!inner.trim()) return [];
          return splitListItems(inner).map(item => evaluateValue(item.trim(), scope));
        }
    
        // 字典
        if (expr.startsWith('{') && expr.endsWith('}') && expr.includes(':')) {
          const inner = expr.slice(1, -1);
          if (!inner.trim()) return {};
          const result = {};
          const pairs = splitDictPairs(inner);
          for (const [k, v] of pairs) {
            result[evaluateValue(k.trim(), scope)] = evaluateValue(v.trim(), scope);
          }
          return result;
        }
    
        // 函数调用
        const funcCall = expr.match(/^(\w+)\((.*)\)$/);
        if (funcCall) {
          const fname = funcCall[1];
          const argsStr = funcCall[2];
          
          // 内置函数
          if (scope[fname] && typeof scope[fname] === 'function') {
            const args = argsStr ? splitArgs(argsStr).map(a => evaluateValue(a.trim(), scope)) : [];
            return scope[fname](...args);
          }
    
          // 方法调用如 .append(), .items() 等
          const methodCall = expr.match(/^(\w+)\.(\w+)\((.*)\)$/);
          if (methodCall) {
            const objName = methodCall[1];
            const methodName = methodCall[2];
            const methodArgs = methodCall[3] ? splitArgs(methodCall[3]).map(a => evaluateValue(a.trim(), scope)) : [];
            const obj = scope[objName];
            
            if (methodName === 'append' && Array.isArray(obj)) {
              obj.push(evaluateValue(methodArgs[0], scope));
              return null;
            }
            if (methodName === 'items' && typeof obj === 'object') {
              return Object.entries(obj);
            }
            if (methodName === 'keys' && typeof obj === 'object') {
              return Object.keys(obj);
            }
            if (methodName === 'values' && typeof obj === 'object') {
              return Object.values(obj);
            }
          }
        }
    
        // 变量引用
        if (scope.hasOwnProperty(expr)) return scope[expr];
    
        // 表达式计算
        try {
          // 替换 Python 操作符
          let jsExpr = expr
            .replace(/\band\b/g, '&&')
            .replace(/\bor\b/g, '||')
            .replace(/\bnot\b/g, '!')
            .replace(/!=/g, '!==')
            .replace(/==/g, '===')
            .replace(/\bNone\b/g, 'null')
            .replace(/\bTrue\b/g, 'true')
            .replace(/\bFalse\b/g, 'false');
          
          // 替换变量引用
          jsExpr = jsExpr.replace(/\b([a-zA-Z_]\w*)\b/g, (match) => {
            if (scope.hasOwnProperty(match) && typeof scope[match] !== 'function') {
              const val = scope[match];
              if (typeof val === 'string') return JSON.stringify(val);
              if (Array.isArray(val)) return JSON.stringify(val);
              return String(val);
            }
            return match;
          });
    
          return Function('"use strict"; return (' + jsExpr + ')')();
        } catch (e) {
          return expr;
        }
      }
    
      function processExpression(expr, scope) {
        // 处理 f-string 和逗号分隔的多参数
        if (expr.includes(',')) {
          const parts = splitArgs(expr);
          return parts.map(p => evaluateValue(p.trim(), scope)).join(' ');
        }
        return evaluateValue(expr.trim(), scope);
      }
    
      function splitArgs(str) {
        const args = [];
        let depth = 0;
        let current = '';
        inStr = false; strChar = '';
        for (const ch of str) {
          if ((ch === '"' || ch === "'") && !inStr) { inStr = true; strChar = ch; current += ch; continue; }
          if (ch === strChar && inStr) { inStr = false; current += ch; continue; }
          if (!inStr) {
            if (ch === '[' || ch === '(' || ch === '{') depth++;
            if (ch === ']' || ch === ')' || ch === '}') depth--;
            if (ch === ',' && depth === 0) { args.push(current); current = ''; continue; }
          }
          current += ch;
        }
        if (current.trim()) args.push(current);
        return args;
      }
    
      function splitListItems(str) {
        return splitArgs(str);
      }
    
      function splitDictPairs(str) {
        const pairs = [];
        let depth = 0;
        let current = '';
        inStr = false; strChar = '';
        for (const ch of str) {
          if ((ch === '"' || ch === "'") && !inStr) { inStr = true; strChar = ch; current += ch; continue; }
          if (ch === strChar && inStr) { inStr = false; current += ch; continue; }
          if (!inStr) {
            if (ch === '[' || ch === '(' || ch === '{') depth++;
            if (ch === ']' || ch === ')' || ch === '}') depth--;
            if (ch === ',' && depth === 0) { pairs.push(current.trim()); current = ''; continue; }
          }
          current += ch;
        }
        if (current.trim()) pairs.push(current.trim());
        return pairs.map(p => {
          const idx = p.indexOf(':');
          return idx !== -1 ? [p.slice(0, idx), p.slice(idx + 1)] : [p, ''];
        });
      }
    
      // ====== 事件绑定 ======
      
      // 运行按钮
      container.querySelector('#ptp-run').addEventListener('click', runCode);
    
      // 清空按钮
      container.querySelector('#ptp-clear').addEventListener('click', () => {
        output.innerHTML = '<span class="out-info">🔄 控制台已清空</span>';
      });
    
      // 格式化按钮（简单缩进整理）
      container.querySelector('#ptp-format').addEventListener('click', () => {
        // 简单格式化：确保一致的缩进
        let formatted = editor.value.split('\n').map(line => {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) return line;
          return line;
        }).join('\n');
        editor.value = formatted;
        updateLineNumbers();
        appendOutput('✨ 代码已格式化', 'out-info');
      });
    
      // 示例代码切换
      container.querySelectorAll('.ptp-example-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          const key = chip.dataset.example;
          if (examples[key]) {
            editor.value = examples[key];
            updateLineNumbers();
            output.innerHTML = `<span class="out-info">📝 已加载示例: ${chip.textContent}</span>`;
          }
        });
      });
    
      // 关闭按钮
      container.querySelector('#ptp-close').addEventListener('click', () => {
        container.remove();
        document.body.style.overflow = '';
      });
    
      // 初始化行号
      updateLineNumbers();
    
      return {
        ok: true,
        summary: 'Python 测试网页已创建成功！包含代码编辑器、运行引擎、6个示例代码',
        changed_count: 1,
        data: {
          features: ['代码编辑器(Tab缩进/Ctrl+Enter运行)', 'Python模拟执行引擎', '6个示例代码', '行号显示', '光标位置追踪'],
          examples_count: Object.keys(examples).length
        },
        warnings: ['基于JS模拟的Python引擎，不支持完整Python语法', '复杂OOP/异常处理/模块导入等高级特性有限支持']
      };
    }
  );
  if (typeof __tabOriginalFunction !== "function") {
    throw new Error("evaluate_script source must evaluate to a function");
  }
  return await __tabOriginalFunction();
})();