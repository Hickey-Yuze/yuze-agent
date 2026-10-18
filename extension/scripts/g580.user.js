(function() {
  // 防止重复执行
  if (window.AIQuizLoaded) return;
  window.AIQuizLoaded = true;

  // AI常识题目和答案
  const quizQuestions = [
    {
      question: "AI是哪个英文词组的缩写？",
      options: ["Artificial Intelligence", "Automatic Information", "Advanced Interface", "Automated Integration"],
      correct: 0,
      explanation: "AI是Artificial Intelligence（人工智能）的缩写。"
    },
    {
      question: "以下哪个不是机器学习的主要类型？",
      options: ["监督学习", "无监督学习", "强化学习", "人工学习"],
      correct: 3,
      explanation: "机器学习的主要类型包括监督学习、无监督学习和强化学习，人工学习不是标准分类。"
    },
    {
      question: "深度学习主要基于哪种神经网络结构？",
      options: ["感知机", "卷积神经网络", "循环神经网络", "多层感知机"],
      correct: 3,
      explanation: "深度学习主要基于多层感知机（MLP），通过多个隐藏层学习复杂特征。"
    },
    {
      question: "Transformer架构主要用于哪个领域？",
      options: ["计算机视觉", "自然语言处理", "机器人控制", "数据挖掘"],
      correct: 1,
      explanation: "Transformer架构主要应用于自然语言处理领域，如GPT、BERT等模型。"
    },
    {
      question: "以下哪个不是常见的AI伦理原则？",
      options: ["公平性", "透明度", "效率优先", "隐私保护"],
      correct: 2,
      explanation: "AI伦理原则包括公平性、透明度、隐私保护等，效率优先不是核心伦理原则。"
    }
  ];

  // 创建问答界面
  function createQuizInterface() {
    // 移除已存在的界面
    const existingQuiz = document.getElementById('ai-quiz-container');
    if (existingQuiz) existingQuiz.remove();

    // 创建容器
    const container = document.createElement('div');
    container.id = 'ai-quiz-container';
    container.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 90%;
      max-width: 600px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 20px;
      padding: 30px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: white;
      animation: fadeIn 0.5s ease-out;
    `;

    // 添加CSS动画
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; transform: translate(-50%, -60%); }
        to { opacity: 1; transform: translate(-50%, -50%); }
      }
      @keyframes slideUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes bounce {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
      .quiz-option {
        transition: all 0.3s ease;
      }
      .quiz-option:hover {
        transform: translateX(10px);
        background: rgba(255, 255, 255, 0.2) !important;
      }
      .correct-answer {
        animation: bounce 0.5s ease;
      }
    `;
    document.head.appendChild(style);

    // 标题
    const title = document.createElement('h1');
    title.textContent = '🤖 AI常识挑战赛';
    title.style.cssText = `
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 10px;
      text-align: center;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    `;

    const subtitle = document.createElement('p');
    subtitle.textContent = '测试你对人工智能基础知识的了解程度';
    subtitle.style.cssText = `
      font-size: 16px;
      opacity: 0.9;
      text-align: center;
      margin-bottom: 30px;
    `;

    container.appendChild(title);
    container.appendChild(subtitle);

    // 创建题目容器
    const questionsContainer = document.createElement('div');
    questionsContainer.id = 'quiz-questions';
    container.appendChild(questionsContainer);

    // 进度指示器
    const progress = document.createElement('div');
    progress.id = 'quiz-progress';
    progress.style.cssText = `
      display: flex;
      justify-content: center;
      gap: 8px;
      margin-bottom: 20px;
    `;

    quizQuestions.forEach((_, index) => {
      const dot = document.createElement('div');
      dot.className = 'progress-dot';
      dot.style.cssText = `
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: ${index === 0 ? 'white' : 'rgba(255, 255, 255, 0.3)'};
        transition: background 0.3s ease;
      `;
      progress.appendChild(dot);
    });

    container.insertBefore(progress, questionsContainer);

    // 按钮容器
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      display: flex;
      justify-content: center;
      gap: 15px;
      margin-top: 30px;
    `;

    const startButton = document.createElement('button');
    startButton.textContent = '开始挑战';
    startButton.style.cssText = `
      background: white;
      color: #667eea;
      border: none;
      padding: 12px 30px;
      border-radius: 50px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    `;
    startButton.onmouseover = () => startButton.style.transform = 'translateY(-2px)';
    startButton.onmouseout = () => startButton.style.transform = 'translateY(0)';

    startButton.onclick = () => {
      startButton.style.display = 'none';
      showQuestion(0);
    };

    buttonContainer.appendChild(startButton);
    container.appendChild(buttonContainer);

    // 关闭按钮
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '×';
    closeButton.style.cssText = `
      position: absolute;
      top: 15px;
      right: 15px;
      background: rgba(255, 255, 255, 0.2);
      color: white;
      border: none;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      font-size: 20px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
    `;
    closeButton.onmouseover = () => closeButton.style.background = 'rgba(255, 255, 255, 0.3)';
    closeButton.onmouseout = () => closeButton.style.background = 'rgba(255, 255, 255, 0.2)';
    closeButton.onclick = () => container.remove();

    container.appendChild(closeButton);
    document.body.appendChild(container);

    // 初始化状态
    let currentQuestion = 0;
    const userAnswers = [];

    // 显示题目
    function showQuestion(index) {
      const question = quizQuestions[index];
      questionsContainer.innerHTML = '';
      
      // 更新进度点
      document.querySelectorAll('.progress-dot').forEach((dot, i) => {
        dot.style.background = i === index ? 'white' : 
                              i < index ? 'rgba(255, 255, 255, 0.7)' : 
                              'rgba(255, 255, 255, 0.3)';
      });

      // 题目文本
      const questionText = document.createElement('div');
      questionText.style.cssText = `
        font-size: 20px;
        font-weight: 600;
        margin-bottom: 25px;
        text-align: center;
        animation: slideUp 0.5s ease-out;
      `;
      questionText.textContent = `第 ${index + 1} 题：${question.question}`;
      questionsContainer.appendChild(questionText);

      // 选项容器
      const optionsContainer = document.createElement('div');
      optionsContainer.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 12px;
      `;

      // 创建选项
      question.options.forEach((option, optionIndex) => {
        const optionElement = document.createElement('div');
        optionElement.className = 'quiz-option';
        optionElement.style.cssText = `
          background: rgba(255, 255, 255, 0.1);
          padding: 15px 20px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
          border: 2px solid transparent;
          font-size: 16px;
        `;

        const optionLabel = document.createElement('div');
        optionLabel.style.cssText = `
          display: flex;
          align-items: center;
          gap: 12px;
        `;

        const letter = document.createElement('span');
        letter.textContent = String.fromCharCode(65 + optionIndex);
        letter.style.cssText = `
          background: rgba(255, 255, 255, 0.2);
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
        `;

        const text = document.createElement('span');
        text.textContent = option;

        optionLabel.appendChild(letter);
        optionLabel.appendChild(text);
        optionElement.appendChild(optionLabel);

        optionElement.onclick = () => {
          // 移除其他选项的选中状态
          document.querySelectorAll('.quiz-option').forEach(opt => {
            opt.style.background = 'rgba(255, 255, 255, 0.1)';
            opt.style.borderColor = 'transparent';
          });

          // 设置当前选项为选中状态
          optionElement.style.background = 'rgba(255, 255, 255, 0.2)';
          optionElement.style.borderColor = 'rgba(255, 255, 255, 0.5)';

          // 存储答案
          userAnswers[index] = optionIndex;

          // 显示下一步按钮
          showNextButton(index);
        };

        optionsContainer.appendChild(optionElement);
      });

      questionsContainer.appendChild(optionsContainer);
    }

    // 显示下一步/提交按钮
    function showNextButton(index) {
      let nextButton = document.getElementById('quiz-next-button');
      
      if (!nextButton) {
        nextButton = document.createElement('button');
        nextButton.id = 'quiz-next-button';
        nextButton.style.cssText = `
          background: white;
          color: #667eea;
          border: none;
          padding: 12px 30px;
          border-radius: 50px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-top: 20px;
          display: block;
          margin-left: auto;
          margin-right: auto;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        `;
        nextButton.onmouseover = () => nextButton.style.transform = 'translateY(-2px)';
        nextButton.onmouseout = () => nextButton.style.transform = 'translateY(0)';
        
        buttonContainer.innerHTML = '';
        buttonContainer.appendChild(nextButton);
      }

      if (index < quizQuestions.length - 1) {
        nextButton.textContent = '下一题';
        nextButton.onclick = () => showQuestion(index + 1);
      } else {
        nextButton.textContent = '提交答案';
        nextButton.onclick = checkAnswers;
      }
    }

    // 检查答案
    function checkAnswers() {
      let correctCount = 0;
      
      // 检查每个答案
      quizQuestions.forEach((question, index) => {
        if (userAnswers[index] === question.correct) {
          correctCount++;
        }
      });

      // 显示结果
      questionsContainer.innerHTML = '';
      
      const resultContainer = document.createElement('div');
      resultContainer.style.cssText = `
        text-align: center;
        animation: slideUp 0.5s ease-out;
      `;

      if (correctCount === quizQuestions.length) {
        // 全部正确 - 显示恭喜消息
        const congrats = document.createElement('div');
        congrats.style.cssText = `
          font-size: 32px;
          font-weight: 700;
          color: #ffd700;
          margin-bottom: 20px;
          text-shadow: 0 2px 10px rgba(255, 215, 0, 0.3);
          animation: bounce 1s ease infinite;
        `;
        congrats.textContent = '🎉 恭喜你！';
        
        const message = document.createElement('p');
        message.style.cssText = `
          font-size: 18px;
          margin-bottom: 15px;
        `;
        message.textContent = '太棒了！你答对了所有题目！';
        
        const perfectScore = document.createElement('p');
        perfectScore.style.cssText = `
          font-size: 24px;
          font-weight: 600;
          margin-bottom: 30px;
          background: rgba(255, 255, 255, 0.1);
          padding: 15px;
          border-radius: 12px;
          display: inline-block;
        `;
        perfectScore.textContent = `满分：${correctCount}/${quizQuestions.length}`;

        resultContainer.appendChild(congrats);
        resultContainer.appendChild(message);
        resultContainer.appendChild(perfectScore);
      } else {
        // 显示分数和详细结果
        const score = document.createElement('div');
        score.style.cssText = `
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 20px;
          color: ${correctCount >= quizQuestions.length * 0.6 ? '#4CAF50' : '#FF5722'};
        `;
        score.textContent = `得分：${correctCount}/${quizQuestions.length}`;

        const message = document.createElement('p');
        message.style.cssText = `
          font-size: 18px;
          margin-bottom: 30px;
        `;
        message.textContent = correctCount >= quizQuestions.length * 0.6 
          ? '不错！但还可以更好，加油！' 
          : '需要多学习AI基础知识哦！';

        resultContainer.appendChild(score);
        resultContainer.appendChild(message);

        // 显示错误题目的解释
        quizQuestions.forEach((question, index) => {
          if (userAnswers[index] !== question.correct) {
            const explanation = document.createElement('div');
            explanation.style.cssText = `
              background: rgba(255, 255, 255, 0.1);
              padding: 15px;
              border-radius: 12px;
              margin-bottom: 15px;
              text-align: left;
            `;
            
            const questionText = document.createElement('p');
            questionText.style.cssText = 'font-weight: 600; margin-bottom: 8px;';
            questionText.textContent = `第 ${index + 1} 题：${question.question}`;
            
            const correctAnswer = document.createElement('p');
            correctAnswer.style.cssText = 'margin-bottom: 8px;';
            correctAnswer.textContent = `正确答案：${question.options[question.correct]}`;
            
            const explanationText = document.createElement('p');
            explanationText.style.cssText = 'opacity: 0.9; font-size: 14px;';
            explanationText.textContent = question.explanation;
            
            explanation.appendChild(questionText);
            explanation.appendChild(correctAnswer);
            explanation.appendChild(explanationText);
            resultContainer.appendChild(explanation);
          }
        });
      }

      // 重新挑战按钮
      const retryButton = document.createElement('button');
      retryButton.textContent = '重新挑战';
      retryButton.style.cssText = `
        background: white;
        color: #667eea;
        border: none;
        padding: 12px 30px;
        border-radius: 50px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        margin-top: 20px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
      `;
      retryButton.onmouseover = () => retryButton.style.transform = 'translateY(-2px)';
      retryButton.onmouseout = () => retryButton.style.transform = 'translateY(0)';
      retryButton.onclick = () => {
        userAnswers.length = 0;
        showQuestion(0);
        buttonContainer.innerHTML = '';
      };

      resultContainer.appendChild(retryButton);
      questionsContainer.appendChild(resultContainer);
      
      // 移除下一步按钮
      const nextButton = document.getElementById('quiz-next-button');
      if (nextButton) nextButton.remove();
    }
  }

  // 执行脚本
  function executeScript() {
    console.log('AI常识问答脚本已加载');
    
    // 等待页面完全加载
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', createQuizInterface);
    } else {
      createQuizInterface();
    }
  }

  // 启动脚本
  executeScript();
})();