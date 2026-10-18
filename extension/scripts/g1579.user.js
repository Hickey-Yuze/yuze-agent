(function() {
  // 防止重复执行
  if (window.quizPageCreated) return;
  window.quizPageCreated = true;

  // 题目数据
  const quizData = [
    {
      question: "无期迷途的开服日期是什么时候？",
      options: [
        "A：2022年8月10日",
        "B：2022年8月11日", 
        "C：2023年8月11日",
        "D：2023年8月12日"
      ],
      correctAnswer: 1 // B选项索引
    },
    {
      question: "无期迷途第一个限定角色是谁？",
      options: [
        "A：瑟琳",
        "B：卓娅",
        "C：黛伦",
        "D：嗷呜"
      ],
      correctAnswer: 2 // C选项索引
    },
    {
      question: "柳生一天最多道了几次歉？",
      options: [
        "A：5次",
        "B：6次",
        "C：7次",
        "D：8次"
      ],
      correctAnswer: 3 // D选项索引
    }
  ];

  // 用户答案记录
  let userAnswers = new Array(quizData.length).fill(null);
  let currentQuestion = 0;

  function createQuizPage() {
    // 创建容器
    const container = document.createElement('div');
    container.id = 'quiz-container';
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 400px;
      background: white;
      border: 2px solid #4a5568;
      border-radius: 12px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.2);
      z-index: 9999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      overflow: hidden;
    `;

    // 标题栏
    const header = document.createElement('div');
    header.style.cssText = `
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 16px 20px;
      font-size: 18px;
      font-weight: bold;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;
    header.innerHTML = `
      <span>无期迷途知识问答</span>
      <span id="progress">1/${quizData.length}</span>
    `;

    // 内容区域
    const content = document.createElement('div');
    content.style.cssText = `
      padding: 20px;
      max-height: 500px;
      overflow-y: auto;
    `;

    // 题目区域
    const questionContainer = document.createElement('div');
    questionContainer.id = 'question-container';

    // 选项区域
    const optionsContainer = document.createElement('div');
    optionsContainer.id = 'options-container';
    optionsContainer.style.marginTop = '20px';

    // 按钮区域
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      display: flex;
      justify-content: space-between;
      margin-top: 25px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
    `;

    const prevButton = document.createElement('button');
    prevButton.textContent = '上一题';
    prevButton.style.cssText = `
      padding: 10px 20px;
      background: #e2e8f0;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
    `;

    const nextButton = document.createElement('button');
    nextButton.textContent = '下一题';
    nextButton.style.cssText = `
      padding: 10px 20px;
      background: #4299e1;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
    `;

    const submitButton = document.createElement('button');
    submitButton.textContent = '提交答案';
    submitButton.style.cssText = `
      padding: 10px 20px;
      background: #48bb78;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      display: none;
    `;

    // 结果区域
    const resultContainer = document.createElement('div');
    resultContainer.id = 'result-container';
    resultContainer.style.cssText = `
      display: none;
      text-align: center;
      padding: 20px;
      background: #f7fafc;
      border-radius: 8px;
      margin-top: 20px;
    `;

    // 组装容器
    buttonContainer.appendChild(prevButton);
    buttonContainer.appendChild(nextButton);
    buttonContainer.appendChild(submitButton);
    
    content.appendChild(questionContainer);
    content.appendChild(optionsContainer);
    content.appendChild(buttonContainer);
    content.appendChild(resultContainer);
    
    container.appendChild(header);
    container.appendChild(content);

    // 添加到页面
    document.body.appendChild(container);

    // 添加关闭按钮
    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.style.cssText = `
      background: rgba(255,255,255,0.2);
      border: none;
      color: white;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      cursor: pointer;
      font-size: 18px;
      line-height: 1;
    `;
    closeButton.addEventListener('click', () => {
      container.remove();
      window.quizPageCreated = false;
    });
    header.appendChild(closeButton);

    // 初始化第一题
    loadQuestion(0);

    // 事件监听
    prevButton.addEventListener('click', () => {
      if (currentQuestion > 0) {
        loadQuestion(currentQuestion - 1);
      }
    });

    nextButton.addEventListener('click', () => {
      if (currentQuestion < quizData.length - 1) {
        loadQuestion(currentQuestion + 1);
      }
    });

    submitButton.addEventListener('click', showResults);

    // 加载题目函数
    function loadQuestion(index) {
      currentQuestion = index;
      const question = quizData[index];
      
      // 更新进度
      document.getElementById('progress').textContent = `${index + 1}/${quizData.length}`;
      
      // 更新题目
      questionContainer.innerHTML = `
        <h3 style="margin: 0 0 15px 0; color: #2d3748; font-size: 16px;">
          题目${index + 1}：${question.question}
        </h3>
      `;
      
      // 更新选项
      optionsContainer.innerHTML = '';
      question.options.forEach((option, optionIndex) => {
        const optionDiv = document.createElement('div');
        optionDiv.style.cssText = `
          padding: 12px 16px;
          margin-bottom: 10px;
          border: 2px solid ${userAnswers[index] === optionIndex ? '#4299e1' : '#e2e8f0'};
          border-radius: 8px;
          cursor: pointer;
          background: ${userAnswers[index] === optionIndex ? '#ebf8ff' : 'white'};
          transition: all 0.2s;
        `;
        optionDiv.textContent = option;
        
        optionDiv.addEventListener('click', () => {
          userAnswers[index] = optionIndex;
          loadQuestion(index); // 重新加载以更新选中状态
        });
        
        optionsContainer.appendChild(optionDiv);
      });
      
      // 更新按钮状态
      prevButton.style.display = index === 0 ? 'none' : 'block';
      nextButton.style.display = index === quizData.length - 1 ? 'none' : 'block';
      submitButton.style.display = index === quizData.length - 1 ? 'block' : 'none';
      
      // 检查是否所有题目都已作答
      const allAnswered = userAnswers.every(answer => answer !== null);
      submitButton.disabled = !allAnswered;
      submitButton.style.opacity = allAnswered ? '1' : '0.5';
      submitButton.style.cursor = allAnswered ? 'pointer' : 'not-allowed';
    }

    // 显示结果函数
    function showResults() {
      let correctCount = 0;
      
      // 计算正确数量
      userAnswers.forEach((answer, index) => {
        if (answer === quizData[index].correctAnswer) {
          correctCount++;
        }
      });
      
      // 显示结果
      resultContainer.style.display = 'block';
      
      if (correctCount === quizData.length) {
        resultContainer.innerHTML = `
          <div style="color: #48bb78; font-size: 20px; margin-bottom: 10px;">✅ 全部正确！</div>
          <div style="font-size: 16px; color: #2d3748; margin-bottom: 15px;">
            你是一个合格的局长，欢迎加群：264213619
          </div>
          <div style="color: #718096; font-size: 14px;">
            答对了 ${correctCount}/${quizData.length} 题
          </div>
        `;
      } else {
        resultContainer.innerHTML = `
          <div style="color: #f56565; font-size: 20px; margin-bottom: 10px;">❌ 未能全部答对</div>
          <div style="font-size: 16px; color: #2d3748; margin-bottom: 15px;">
            很遗憾，未能全部答对，再试一次吧
          </div>
          <div style="color: #718096; font-size: 14px;">
            答对了 ${correctCount}/${quizData.length} 题
          </div>
          <button id="retry-btn" style="
            margin-top: 15px;
            padding: 8px 20px;
            background: #4299e1;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
          ">重新答题</button>
        `;
        
        // 重新答题按钮
        document.getElementById('retry-btn').addEventListener('click', () => {
          userAnswers = new Array(quizData.length).fill(null);
          resultContainer.style.display = 'none';
          loadQuestion(0);
        });
      }
      
      // 滚动到结果区域
      resultContainer.scrollIntoView({ behavior: 'smooth' });
    }
  }

  // 执行创建
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createQuizPage);
  } else {
    createQuizPage();
  }
})();