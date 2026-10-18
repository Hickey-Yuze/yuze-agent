(async function __tabEvaluateScriptBridge() {
  const __tabScriptArgs = null;
  const __tabOriginalFunction = (
    async function run(args) {
      // ==================== 音符与音色系统 ====================
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      const noteFrequencies = {
        'C3': 130.81, 'C#3': 138.59, 'D3': 146.83, 'D#3': 155.56,
        'E3': 164.81, 'F3': 174.61, 'F#3': 185.00, 'G3': 196.00,
        'G#3': 207.65, 'A3': 220.00, 'A#3': 233.08, 'B3': 246.94,
        'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13,
        'E4': 329.63, 'F4': 349.23, 'F#4': 369.99, 'G4': 392.00,
        'G#4': 415.30, 'A4': 440.00, 'A#4': 466.16, 'B4': 493.88,
        'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'D#5': 622.25,
        'E5': 659.25, 'F5': 698.46, 'F#5': 739.99, 'G5': 783.99,
        'G#5': 830.61, 'A5': 880.00, 'A#5': 932.33, 'B5': 987.77
      };
    
      // 键盘映射
      const keyMap = {
        'a': 'C4', 'w': 'C#4', 's': 'D4', 'e': 'D#4', 'd': 'E4',
        'f': 'F4', 't': 'F#4', 'g': 'G4', 'y': 'G#4', 'h': 'A4',
        'u': 'A#4', 'j': 'B4', 'k': 'C5', 'o': 'C#5', 'l': 'D5',
        'p': 'D#5', ';': 'E5'
      };
      const noteToKey = Object.fromEntries(Object.entries(keyMap).map(([k,v]) => [v,k]));
    
      let activeOscillators = {};
      function playNote(note, duration = 2) {
        if (!noteFrequencies[note]) return;
        if (activeOscillators[note]) { try{ activeOscillators[note].stop(); }catch(e){} }
        
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(noteFrequencies[note], audioContext.currentTime);
        gain.gain.setValueAtTime(0.4, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
        osc.start(audioContext.currentTime);
        osc.stop(audioContext.currentTime + duration + 0.05);
        activeOscillators[note] = osc;
        return osc;
      }
    
      // ==================== 曲谱库 ====================
      const songs = {
        beginner: [
          { name: '🌟 小星星 (单手)', tempo: 500, notes: ['C4','C4','G4','G4','A4','A4','G4','-','F4','F4','E4','E4','D4','D4','C4','-','G4','G4','F4','F4','E4','E4','D4','-','G4','G4','F4','F4','E4','E4','D4','-','C4','C4','G4','G4','A4','A4','G4','-','F4','F4','E4','E4','D4','D4','C4'], hint: '经典儿歌，适合熟悉键盘位置' },
          { name: '🎂 生日快乐', tempo: 480, notes: ['C4','C4','D4','C4','F4','E4','-','C4','C4','D4','C4','G4','F4','-','C4','C4','C5','A4','F4','E4','D4','-','Bb4','Bb4','A4','F4','G4','F4'], hint: '最熟悉的旋律，练起来！' },
          { name: '🔔 两只老虎', tempo: 450, notes: ['C4','D4','E4','C4','-','C4','D4','E4','C4','-','E4','F4','G4','-','E4','F4','G4','-','G4','A4','G4','F4','E4','C4','-','G4','A4','G4','F4','E4','C4','-','D4','G4','C4','-','D4','G4','C4'], hint: '简单重复的旋律，轻松上手' },
          { name: '🐸 小青蛙', tempo: 480, notes: ['C4','D4','E4','F4','-','E4','D4','E4','F4','-','G4','G4','A4','A4','-','G4','-','F4','E4','D4','C4'], hint: '活泼可爱的儿歌旋律' },
          { name: '🚂 火车开了', tempo: 420, notes: ['C4','C4','E4','E4','-','G4','G4','E4','-','F4','F4','G4','A4','-','G4','E4','C4','-','E4','E4','D4','D4','-','C4'], hint: '节奏明快的小火车之歌' },
          { name: '🌈 彩虹', tempo: 520, notes: ['E4','E4','G4','G4','-','A4','G4','E4','-','D4','D4','E4','F4','-','G4','E4','-','E4','D4','C4','D4','-','E4','G4','A4','-','G4','E4','-','D4','C4'], hint: '优美的旋律，练习音阶过渡' },
          { name: '🎵 欢乐颂', tempo: 450, notes: ['E4','E4','F4','G4','-','G4','F4','E4','D4','-','C4','C4','D4','E4','-','E4','D4','D4','-','E4','E4','F4','G4','-','G4','F4','E4','D4','-','C4','C4','D4','E4','-','D4','C4','C4'], hint: '贝多芬经典，简单又好听' },
          { name: '🌻 种太阳', tempo: 480, notes: ['C4','E4','G4','G4','-','A4','G4','E4','-','G4','F4','E4','D4','-','C4','-','D4','E4','F4','A4','-','G4','G4','E4','-','D4','C4'], hint: '充满希望的儿童歌曲' }
        ],
        intermediate: [
          { name: '🏰 卡农 (简化版)', tempo: 550, notes: ['C4','D4','E4','F4','G4','A4','G4','F4','E4','D4','C4','-','F4','G4','A4','Bb4','C5','Bb4','A4','G4','F4','-','G4','A4','Bb4','C5','D5','C5','Bb4','A4','G4','-','C4','D4','E4','F4','G4','A4','G4','F4','E4','D4','C4'], hint: '经典的卡农和弦进行，感受音乐之美' },
          { name: '🌊 致爱丽丝 (片段)', tempo: 520, notes: ['E4','D#4','E4','D#4','E4','B4','D4','C4','A4','-','C4','E4','A4','B4','-','E4','G#4','B4','C4','-','E4','D#4','E4','D#4','E4','B4','D4','C4','A4','-','C4','E4','A4','B4'], hint: '贝多芬名曲片段，需要一点手指灵活度' },
          { name: '🎄 铃儿响叮当', tempo: 420, notes: ['E4','E4','E4','-','E4','E4','E4','-','E4','G4','C4','D4','E4','-','F4','F4','F4','F4','-','F4','E4','E4','E4','-','E4','D4','D4','E4','D4','-','G4'], hint: '欢快的圣诞歌曲，节奏感强' },
          { name: '🎼 梦中的婚礼 (片段)', tempo: 580, notes: ['E4','G#4','B4','E5','-','D#5','B4','G#4','E4','-','C#5','B4','G#4','E4','-','B4','G#4','E4','-','D#4','F#4','A4','D#5','-','C#5','A4','F#4','D#4','-','B4','A4','F#4','D#4','-','A4','F#4','D#4'], hint: '理查德·克莱德曼代表作，浪漫优雅' },
          { name: '🍃 秋日的私语 (副歌)', tempo: 560, notes: ['G4','A4','B4','C5','-','B4','A4','G4','E4','-','G4','A4','B4','A4','-','G4','E4','-','D4','E4','F4','G4','-','A4','G4','F4','E4','-','D4','E4','F4','D4','-','C4'], hint: '另一首钢琴经典，深情款款' },
          { name: '🌹 爱的罗曼史', tempo: 500, notes: ['E4','F4','G4','E4','-','F4','G4','A4','G4','-','F4','E4','D4','E4','-','F4','E4','-','E4','D4','C4','D4','-','E4','F4','G4','E4','-','F4','G4','A4','G4','-','F4','E4','D4','E4','-','D4','C4'], hint: '西班牙民谣改编，温柔动人' },
          { name: '🎪 天空之城 (主旋律)', tempo: 540, notes: ['C4','E4','G4','C5','-','B4','A4','G4','E4','-','A4','G4','E4','D4','-','C4','-','D4','E4','A4','B4','-','C5','B4','A4','G4','-','E4','G4','A4','-','E4','D4','C4'], hint: '久石让经典动画配乐，治愈系' },
          { name: '🕯️ 圣诞快乐劳伦斯先生', tempo: 600, notes: ['F4','G4','A4','C5','-','A4','G4','F4','D4','-','F4','G4','A4','G4','-','F4','D4','-','E4','F4','G4','A4','-','G4','F4','E4','C4','-','E4','F4','G4','F4','-','E4','D4','C4'], hint: '坂本龙一经典作品，温暖动人' }
        ],
        advanced: [
          { name: '🎤 晴天 (副歌)', tempo: 520, notes: ['C4','C4','E4','G4','-','A4','G4','E4','-','G4','A4','B4','C5','-','B4','A4','G4','-','E4','G4','A4','-','G4','E4','-','D4','E4','F4','A4','-','G4','E4','-','D4','C4','-','C4','C4','E4','G4','-','A4','G4','E4','-','G4','A4','B4','C5','-','B4','A4','G4','-','E4','G4','A4','-','G4','E4','D4','C4'], hint: '周杰伦最经典的抒情歌曲之一' },
          { name: '🌿 七里香 (前奏+副歌)', tempo: 540, notes: ['E4','G4','A4','B4','-','C5','B4','A4','G4','-','A4','G4','E4','-','G4','A4','-','B4','C5','D5','C5','-','B4','A4','G4','E4','-','G4','A4','B4','-','A4','G4','E4','-','C4','E4','G4','A4','-','B4','A4','G4','E4','-','G4','A4','B4','C5','-','B4','A4','G4','E4','-','A4','G4','E4','-','D4','C4'], hint: '前奏一响就沦陷的神曲' },
          { name: '💗 简单爱 (副歌)', tempo: 500, notes: ['G4','G4','A4','B4','-','C5','B4','A4','G4','-','A4','B4','A4','G4','-','E4','-','G4','A4','B4','C5','-','B4','A4','G4','E4','-','G4','A4','B4','-','A4','G4','E4','-','D4','E4','G4','A4','-','G4','E4','-','D4','C4'], hint: '甜蜜轻快的恋爱小调' },
          { name: '🌾 稻香 (主旋律)', tempo: 480, notes: ['C4','D4','E4','G4','-','A4','G4','E4','D4','-','C4','D4','E4','G4','-','A4','G4','E4','-','D4','E4','F4','A4','-','G4','E4','D4','C4','-','D4','E4','G4','A4','-','G4','E4','D4','C4','-','C4','D4','E4','G4','-','A4','G4','E4','D4','-','C4'], hint: '温暖治愈的乡村风，回归初心' },
          { name: '🏺 青花瓷 (主旋律)', tempo: 580, notes: ['E4','G4','A4','-','B4','A4','G4','E4','-','G4','A4','B4','-','D5','C5','B4','A4','-','G4','E4','-','A4','B4','C5','-','B4','A4','G4','E4','-','G4','A4','B4','-','A4','G4','E4','-','D4','E4','G4','A4','-','G4','E4','-','D4','C4'], hint: '中国风巅峰之作，方文山作词' },
          { name: '🌙 夜曲 (副歌)', tempo: 500, notes: ['A3','C4','E4','A4','-','G4','E4','C4','A3','-','B3','D4','G4','B4','-','A4','G4','E4','-','C4','E4','A4','-','G4','E4','C4','-','D4','F4','A4','-','G4','E4','D4','C4','-','A3','C4','E4','A4','-','G4','E4','C4','A3','-','B3','D4','G4','B4','-','A4','G4','E4'], hint: '暗黑风格R&B，前奏即经典' },
          { name: '🎈 告白气球 (副歌)', tempo: 460, notes: ['C4','E4','G4','A4','-','G4','E4','-','D4','E4','F4','A4','-','G4','E4','-','C4','E4','G4','A4','-','G4','E4','D4','C4','-','D4','E4','F4','A4','-','G4','E4','-','D4','C4','-','C4','E4','G4','A4','-','G4','E4','-','D4','E4','F4','A4','-','G4','E4','D4','C4'], hint: '甜蜜告白神曲，轻松愉快' },
          { name: '🌸 菊花台 (主旋律)', tempo: 620, notes: ['A3','C4','E4','A4','-','B4','A4','G4','E4','-','A4','G4','E4','-','C4','E4','A4','-','G4','E4','-','D4','E4','G4','B4','-','A4','G4','E4','-','D4','C4','-','A3','C4','E4','A4','-','B4','A4','G4','E4','-','A4','G4','E4','C4','-','E4','A4','-','G4','E4','D4','C4'], hint: '满城尽带黄金甲主题曲，古风凄美' },
          { name: '❄️ 发如雪 (副歌)', tempo: 560, notes: ['E4','G4','A4','B4','-','C5','B4','A4','G4','-','A4','G4','E4','-','G4','A4','-','B4','C5','D5','C5','-','B4','A4','G4','E4','-','G4','A4','B4','-','A4','G4','E4','-','D4','E4','G4','A4','-','G4','E4','-','D4','C4','-','E4','G4','A4','B4','-','C5','B4','A4','G4','-','A4','G4','E4'], hint: '又一中国风力作，凄美动人' },
          { name: '🌧️ 那天下雨了 (完整版·前奏+主旋律)', tempo: 540, notes: ['E4','-','E4','-','E4','-','A3','C4','E4','A4','-','G4','E4','C4','A3','-','B3','D4','G4','B4','-','A4','G4','E4','C4','-','D4','E4','F4','A4','-','G4','E4','D4','C4','-','A3','C4','E4','A4','-','B4','A4','G4','E4','-','C4','E4','G4','C5','-','B4','A4','G4','E4','-','A3','C4','E4','A4','-','G4','E4','D4','C4','-','D4','-','E4','-','F4','-','G4','-','A3','C4','E4','A4','-','G4','E4','C4','A3','-','B3','D4','G4','B4','-','A4','G4','E4','C4','-','D4','E4','A4','-','G4','E4','D4','C4','-','A3','C4','E4','A4','-','G4','E4','C4','A3','-','B3','D4','G4','B4','-','A4','G4','E4','-','D4','E4','F4','A4','-','G4','E4','D4','C4','-','E4','G4','A4','C5','-','B4','A4','G4','E4','-','A4','G4','E4','C4','-','D4','E4','F4','A4','-','G4','E4','D4','C4','-','A3','C4','E4','A4','-','G4','E4','C4','A3','-','B3','D4','G4','B4','-','A4','G4','E4','C4','-','D4','E4','A4','-','G4','E4','D4','C4','-','E4','G4','A4','B4','-','C5','B4','A4','G4','-','A4','G4','E4','-','G4','A4','-','B4','C5','D5','C5','-','B4','A4','G4','E4','-','G4','A4','B4','-','A4','G4','E4','-','D4','E4','G4','A4','-','G4','E4','-','D4','C4','-','C4','-','D4','-','E4','-','A3','C4','E4','A4','-','G4','E4','C4','A3','-','B3','D4','G4','B4','-','A4','G4','E4','C4','-','D4','E4','A4','-','G4','E4','D4','C4','-','A3','C4','E4','A4','-','G4','E4','C4','A3','-','B3','D4','G4','B4','-','A4','G4','E4','-','D4','E4','F4','A4','-','G4','E4','D4','C4','-','E4','G4','A4','C5','-','B4','A4','G4','E4','-','C5','B4','A4','G4','-','A4','G4','E4','C4','-','D4','E4','G4','A4','-','G4','E4','D4','C4','-','A3','C4','E4','A4','-','G4','E4','D4','C4','-','E4','D4','C4','A3','-','C4','D4','E4','-','A3','C4','E4','-','G4','E4','C4','-','A3','-','C4','-','A3','-','C4','-','A3','-'], hint: '完整版！含前奏+主旋律+桥段+高潮+尾声' },
          { name: '📻 听妈妈的话 (副歌)', tempo: 480, notes: ['C4','D4','E4','G4','-','A4','G4','E4','-','G4','A4','B4','C5','-','B4','A4','G4','-','E4','G4','A4','-','G4','E4','-','D4','E4','F4','A4','-','G4','E4','-','D4','C4','-','C4','D4','E4','G4','-','A4','G4','E4','-','G4','A4','B4','C5','-','B4','A4','G4','E4','-','A4','G4','E4','D4','C4'], hint: '温暖的亲情之歌，献给所有母亲' },
          { name: '🎞️ 不能说的秘密 (主旋律)', tempo: 560, notes: ['E4','G4','B4','D5','-','C5','B4','G4','E4','-','G4','B4','D5','-','F5','E5','D5','B4','-','G4','B4','-','D5','E5','F5','-','E5','D5','B4','G4','-','B4','D5','-','E5','D5','B4','G4','-','E4','G4','B4','D5','-','C5','B4','G4','E4','-','G4','B4','D5','-','E5','D5','B4'], hint: '同名电影主题曲，神秘浪漫' },
          { name: '⭐ 星晴 (副歌)', tempo: 500, notes: ['C4','E4','G4','A4','-','B4','A4','G4','E4','-','G4','A4','B4','-','D5','C5','B4','A4','-','G4','E4','-','A4','B4','C5','-','B4','A4','G4','E4','-','G4','A4','B4','-','A4','G4','E4','-','D4','E4','G4','A4','-','G4','E4','-','D4','C4'], hint: '初恋般的纯真美好' },
          { name: '🌀 龙卷风 (副歌)', tempo: 520, notes: ['A3','C4','E4','A4','-','G4','E4','C4','A3','-','B3','D4','G4','B4','-','A4','G4','E4','-','C4','E4','A4','-','G4','E4','C4','-','D4','F4','A4','-','G4','E4','D4','C4','-','A3','C4','E4','A4','-','G4','E4','C4','A3','-','B3','D4','G4','B4','-','A4','G4','E4','D4','C4'], hint: '爱情像龙卷风，无法捉摸' },
          { name: '🎹 安静 (副歌)', tempo: 580, notes: ['E4','G4','A4','B4','-','C5','B4','A4','G4','-','A4','G4','E4','-','G4','A4','-','B4','C5','D5','C5','-','B4','A4','G4','E4','-','G4','A4','B4','-','A4','G4','E4','-','D4','E4','G4','A4','-','G4','E4','-','D4','C4','-','E4','G4','A4','B4','-','C5','B4','A4','G4','-','A4','G4','E4','D4','C4'], hint: '分手后的安静，只有钢琴陪着我' },
          { name: '🌊 东风破 (主旋律)', tempo: 600, notes: ['E4','G4','A4','-','B4','A4','G4','E4','-','A4','B4','C5','-','B4','A4','G4','E4','-','G4','A4','-','B4','C5','D5','-','C5','B4','A4','G4','-','A4','G4','E4','-','D4','E4','G4','A4','-','G4','E4','-','D4','C4','-','E4','G4','A4','-','B4','A4','G4','E4','-','A4','G4','E4','D4','C4'], hint: '中国风开山之作，古典与现代融合' },
          { name: '🏮 兰亭序 (副歌)', tempo: 560, notes: ['C4','E4','G4','A4','-','B4','A4','G4','E4','-','G4','A4','B4','-','D5','C5','B4','A4','-','G4','E4','-','A4','B4','C5','-','B4','A4','G4','E4','-','G4','A4','B4','-','A4','G4','E4','-','D4','E4','G4','A4','-','G4','E4','-','D4','C4'], hint: '书法入歌，行云流水般的中国风' },
          { name: '🦋 蝴蝶 (中国名曲)', tempo: 480, notes: ['E5','D5','C5','B4','A4','B4','C5','B4','A4','G4','A4','-','C5','B4','A4','G4','E4','G4','A4','G4','E4','D4','E4','-','A4','G4','E4','D4','C4','D4','E4','D4','C4','B3','C4','-','E4','D4','C4','B3','A3','B3','C4','B3','A3','G3','A3','-','C4','B3','A3','G3','E3','G3','A3','G3','E3','D3','E3'], hint: '优美的中国民歌，考验连贯性' },
          { name: '🌙 月亮代表我的心 (副歌)', tempo: 600, notes: ['C4','C4','D4','E4','E4','D4','E4','G4','-','G4','A4','G4','E4','D4','D4','-','D4','E4','D4','C4','A3','A3','C4','D4','-','E4','E4','D4','C4','D4','C4','-','C4','C4','D4','E4','E4','D4','E4','G4','-','G4','A4','G4','E4','D4','D4','-','D4','E4','D4','C4','A3','A3','C4','D4','-','E4','C4','D4','C4'], hint: '邓丽君经典，情感表达是关键' },
          { name: '🎵 River Flows In You (片段)', tempo: 650, notes: ['A3','B3','C4','E4','A4','G4','E4','C4','B3','A3','-','B3','C4','D4','F4','A4','G4','F4','D4','C4','B3','-','C4','D4','E4','G4','B4','A4','G4','E4','D4','C4','-','D4','E4','F4','A4','C5','B4','A4','F4','E4','D4','-','E4','F4','G4','B4','D5','C5','B4','G4','F4','E4','-','F4','G4','A4','C5','E5','D5','C5','A4','G4','F4'], hint: 'Yiruma代表作，需要流畅的指法' },
          { name: '🎻 卡农 (完整版)', tempo: 580, notes: ['C4','D4','E4','F4','G4','A4','B4','C5','-','B4','A4','G4','F4','E4','D4','C4','-','F4','G4','A4','B4','C5','D5','E5','F5','-','E5','D5','C5','B4','A4','G4','F4','-','G4','A4','B4','C5','D5','E5','D5','C5','B4','-','A4','G4','F4','E4','D4','C4','-','C4','D4','E4','F4','G4','A4','G4','F4','E4','D4','C4'], hint: '帕赫贝尔卡农完整版，永恒的经典' },
          { name: '🌸 千本樱 (简化版)', tempo: 450, notes: ['E5','D5','C5','B4','A4','B4','C5','B4','A4','G4','A4','-','B4','C5','D5','C5','B4','A4','G4','A4','-','E5','D5','C5','B4','A4','G4','A4','B4','-','C5','B4','A4','G4','E4','G4','A4','-','B4','A4','G4','E4','D4','E4','G4','A4'], hint: '热门Vocaloid曲目，节奏感超强' },
          { name: '🔥 Despacito (主旋律)', tempo: 500, notes: ['D4','F#4','A4','-','B4','A4','F#4','D4','-','E4','F#4','A4','-','B4','A4','F#4','-','D4','F#4','A4','-','B4','C#5','D5','-','C#5','B4','A4','-','F#4','A4','B4','-','A4','F#4','D4'], hint: '全球爆火的拉丁神曲' }
        ]
      };
    
      // ==================== 创建主界面（全新布局）====================
      const container = document.createElement('div');
      container.id = 'piano-game-container';
      container.innerHTML = `
        <style>
          #piano-game-container {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: linear-gradient(135deg, #0a0a1a 0%, #12122e 50%, #0d1b2a 100%);
            z-index: 999999; display: flex;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            overflow: hidden;
          }
    
          /* ====== 左侧边栏：模式按钮 ====== */
          .sidebar-left {
            width: 130px; min-width: 130px; background: rgba(255,255,255,0.03);
            border-right: 1px solid rgba(255,255,255,0.06);
            display: flex; flex-direction: column; padding: 20px 10px; gap: 8px;
            align-items: center;
          }
          .sidebar-title {
            color: #fff; font-size: 15px; font-weight: bold; margin-bottom: 12px;
            text-align: center; line-height: 1.3;
          }
          .nav-btn-vertical {
            width: 105px; padding: 14px 8px; border: none; border-radius: 14px;
            cursor: pointer; font-size: 13px; font-weight: bold; transition: all 0.25s;
            color: white; text-align: center; line-height: 1.35;
            position: relative; overflow: hidden;
          }
          .nav-btn-vertical.free { background: linear-gradient(135deg, #667eea, #764ba2); }
          .nav-btn-vertical.beginner { background: linear-gradient(135deg, #11998e, #38ef7d); }
          .nav-btn-vertical.intermediate { background: linear-gradient(135deg, #f093fb, #f5576c); }
          .nav-btn-vertical.advanced { background: linear-gradient(135deg, #fa709a, #fee140); color: #333; }
          .nav-btn-vertical:hover { transform: translateX(4px); box-shadow: 0 4px 16px rgba(255,255,255,0.12); }
          .nav-btn-vertical.active { box-shadow: 0 0 0 3px rgba(255,255,255,0.55), 0 4px 16px rgba(255,255,255,0.12); transform: scale(1.04); }
    
          /* ====== 中间主区域 ====== */
          .main-area {
            flex: 1; display: flex; flex-direction: column; align-items: center;
            justify-content: space-between; padding: 16px 24px; overflow-y: auto;
            max-width: calc(100vw - 380px);
          }
    
          /* 标题 */
          .header-area { text-align: center; flex-shrink: 0; }
          .piano-title { color: #fff; font-size: 26px; text-shadow: 0 2px 10px rgba(0,0,0,0.3); margin-bottom: 4px; }
          .mode-label { color: #99aabb; font-size: 13px; }
    
          /* 练习信息栏 */
          .practice-info {
            display: none; width: 100%; max-width: 720px; background: rgba(255,255,255,0.05);
            border-radius: 14px; padding: 14px 22px; backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.07); flex-shrink: 0;
          }
          .practice-info.show { display: block; animation: fadeIn 0.3s ease; }
          @keyframes fadeIn { from{opacity:0;transform:translateY(-8px);} to{opacity:1;transform:translateY(0);} }
          
          .song-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
          .song-name { color: #fff; font-size: 17px; font-weight: bold; }
          .song-hint { color: #99aabb; font-size: 12px; margin-top: 2px; }
          .score-display { display: flex; gap: 22px; align-items: center; }
          .score-item { text-align: center; }
          .score-value { color: #38ef7d; font-size: 26px; font-weight: bold; }
          .score-label { color: #777; font-size: 11px; }
          .progress-bar-wrap { width: 100%; height: 6px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden; }
          .progress-fill { height: 100%; background: linear-gradient(90deg, #667eea, #764ba2, #f5576c); border-radius: 3px; transition: width 0.15s; width: 0%; }
    
          /* 自动演奏状态栏 */
          .autoplay-status {
            display: none; width: 100%; max-width: 720px; background: linear-gradient(135deg, rgba(255,193,7,0.12), rgba(255,107,107,0.12));
            border-radius: 14px; padding: 14px 22px; backdrop-filter: blur(10px);
            border: 1px solid rgba(255,193,7,0.2); flex-shrink: 0; margin-top: 8px;
          }
          .autoplay-status.show { display: block; animation: fadeIn 0.3s ease; }
          .autoplay-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
          .autoplay-title { color: #ffc107; font-size: 17px; font-weight: bold; }
          .autoplay-song-name { color: #fff; font-size: 14px; }
          .autoplay-progress-text { color: #aaa; font-size: 12px; margin-top: 4px; }
          .autoplay-progress-wrap { width: 100%; height: 8px; background: rgba(255,255,255,0.08); border-radius: 4px; overflow: hidden; }
          .autoplay-progress-fill { height: 100%; background: linear-gradient(90deg, #ffc107, #ff6b6b, #ff8e53); border-radius: 4px; transition: width 0.1s; width: 0%; }
          .autoplay-current-note { 
            display: inline-block; margin-top: 6px; padding: 4px 16px; border-radius: 20px;
            background: rgba(255,193,7,0.15); color: #ffc107; font-size: 18px; font-weight: bold;
            letter-spacing: 2px; min-height: 28px;
          }
    
          /* ====== 下落音符区 ====== */
          .falling-notes-area {
            display: none; width: 100%; max-width: 720px; height: 320px;
            position: relative; background: rgba(0,0,0,0.25); border-radius: 16px;
            overflow: hidden; border: 1px solid rgba(255,255,255,0.06);
            flex-shrink: 0; margin-top: 8px;
          }
          .falling-notes-area.show { display: block; animation: fadeIn 0.3s ease; }
          .falling-note {
            position: absolute; border-radius: 10px;
            background: linear-gradient(180deg, rgba(102,126,234,0.92), rgba(118,75,162,0.92));
            color: white; font-weight: bold;
            display: flex; align-items: center; justify-content: center;
            animation: fallNote linear forwards; box-shadow: 0 3px 12px rgba(0,0,0,0.4);
            font-size: 15px; letter-spacing: 0.5px;
          }
          .falling-note.black-key { 
            background: linear-gradient(180deg, rgba(60,60,60,0.95), rgba(15,15,15,0.95)); 
          }
          .falling-note.hit { background: linear-gradient(180deg, #38ef7d, #11998e) !important; transform: scale(1.08); }
          .falling-note.miss { background: rgba(255,80,80,0.75) !important; opacity: 0.45; }
          @keyframes fallNote { from { top: -65px; } to { top: 260px; } }
    
          /* 判定线 */
          .judge-line {
            position: absolute; bottom: 52px; left: 0; right: 0; height: 4px;
            background: linear-gradient(90deg, transparent, rgba(56,239,125,0.55), transparent);
            pointer-events: none; border-radius: 2px;
          }
    
          /* 钢琴键区 */
          .piano-section { flex-shrink: 0; margin-top: 6px; }
          .piano-wrapper { position: relative; display: flex; user-select: none; }
          .piano-key {
            width: 48px; height: 160px; border: 1px solid #333;
            background: linear-gradient(180deg, #f8f8f8 0%, #fff 80%, #e8e8e8 100%);
            border-radius: 0 0 6px 6px; cursor: pointer;
            display: flex; flex-direction: column; justify-content: flex-end;
            align-items: center; padding-bottom: 6px;
            box-shadow: 2px 4px 6px rgba(0,0,0,0.3); transition: all 0.08s; position: relative;
          }
          .piano-key:hover { background: linear-gradient(180deg, #fff 0%, #f8f8f8 80%, #f0f0f0 100%); }
          .piano-key.active { background: linear-gradient(180deg, #d4edda, #c3e6cb) !important; transform: translateY(2px); box-shadow: 1px 2px 3px rgba(0,0,0,0.3); }
          .piano-key.hint-glow { box-shadow: 0 0 18px 6px rgba(56,239,125,0.45), 2px 4px 6px rgba(0,0,0,0.3) !important; }
          /* 自动演奏高亮样式 - 金色光效 */
          .piano-key.autoplay-glow { 
            box-shadow: 0 0 20px 8px rgba(255,193,7,0.55), 0 0 40px 16px rgba(255,107,107,0.25), 2px 4px 6px rgba(0,0,0,0.3) !important;
            background: linear-gradient(180deg, #fff3cd, #ffe69c) !important;
            transition: all 0.06s;
          }
          .piano-key.black.autoplay-glow {
            box-shadow: 0 0 20px 8px rgba(255,193,7,0.55), 0 0 40px 16px rgba(255,107,107,0.25) !important;
            background: linear-gradient(180deg, #666, #444) !important;
          }
          .piano-key.black {
            width: 32px; height: 98px; background: linear-gradient(180deg, #333 0%, #000 100%);
            position: absolute; z-index: 10; border-radius: 0 0 4px 4px;
          }
          .piano-key.black:hover { background: linear-gradient(180deg, #444 0%, #111 100%); }
          .piano-key.black.active { background: linear-gradient(180deg, #222 0%, #000 100%); }
          .key-label { font-size: 10px; color: #555; font-weight: bold; }
          .piano-key.black .key-label { color: #888; font-size: 8px; }
          .note-label { font-size: 12px; color: #888; margin-top: 2px; }
          .piano-key.black .note-label { color: #aaa; font-size: 9px; }
    
          /* 控制按钮 */
          .controls { display: flex; gap: 12px; margin-top: 12px; flex-wrap: wrap; justify-content: center; flex-shrink: 0; }
          .ctrl-btn {
            padding: 10px 24px; font-size: 14px; border: none; border-radius: 22px;
            cursor: pointer; transition: all 0.2s; font-weight: bold; color: white;
          }
          .btn-start { background: linear-gradient(135deg, #11998e, #38ef7d); }
          .btn-start:hover { transform: scale(1.05); box-shadow: 0 4px 15px rgba(56,239,125,0.4); }
          .btn-stop { background: linear-gradient(135deg, #eb3349, #f45c43); }
          .btn-stop:hover { transform: scale(1.05); box-shadow: 0 4px 15px rgba(235,51,73,0.4); }
          .btn-close { background: linear-gradient(135deg, #555, #333); }
          .btn-close:hover { transform: scale(1.05); }
          /* 自动演奏按钮 */
          .btn-autoplay { 
            background: linear-gradient(135deg, #ffc107, #ff6b6b); color: #333;
            font-size: 14px; padding: 10px 26px;
          }
          .btn-autoplay:hover { transform: scale(1.05); box-shadow: 0 4px 15px rgba(255,193,7,0.4); }
          .btn-autoplay.playing { 
            background: linear-gradient(135deg, #ff6b6b, #ee5a24); color: white;
            animation: pulseBtn 1s infinite;
          }
          @keyframes pulseBtn { 0%{box-shadow:0 0 0 0 rgba(255,107,107,0.5);} 70%{box-shadow:0 0 0 10px rgba(255,107,107,0);} 100%{box-shadow:0 0 0 0 rgba(255,107,107,0);} }
    
          /* 底部说明 */
          .instructions { color: #667; font-size: 11px; margin-top: 10px; text-align: center; line-height: 1.6; flex-shrink: 0; }
    
          /* ====== 右侧边栏：曲目列表 ====== */
          .sidebar-right {
            width: 250px; min-width: 250px; background: rgba(255,255,255,0.03);
            border-left: 1px solid rgba(255,255,255,0.06);
            display: none; flex-direction: column; padding: 16px 12px; gap: 6px;
            overflow-y: auto;
          }
          .sidebar-right.show { display: flex; animation: slideInRight 0.3s ease; }
          @keyframes slideInRight { from{opacity:0;transform:translateX(16px);} to{opacity:1;transform:translateX(0);} }
          .sidebar-right-title {
            color: #fff; font-size: 15px; font-weight: bold; margin-bottom: 8px;
            text-align: center; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.08);
          }
          .song-item {
            display: flex; flex-direction: column; gap: 2px;
            padding: 12px 14px; border-radius: 12px; cursor: pointer;
            transition: all 0.2s; background: rgba(255,255,255,0.03);
            border: 1px solid transparent;
          }
          .song-item:hover { background: rgba(255,255,255,0.07); border-color: rgba(255,255,255,0.08); }
          .song-item.selected { background: rgba(102,126,234,0.18); border-color: rgba(102,126,234,0.4); }
          .song-item-name { color: #eee; font-size: 13.5px; font-weight: 600; }
          .song-item-hint { color: #889; font-size: 11px; }
          .song-item-meta { color: #777; font-size: 11px; margin-top: 3px; }
          /* 每首曲目旁的欣赏按钮 */
          .song-item-row { display: flex; justify-content: space-between; align-items: center; width: 100%; }
          .btn-mini-autoplay {
            padding: 3px 10px; font-size: 11px; border: none; border-radius: 12px;
            cursor: pointer; background: linear-gradient(135deg, #ffc107, #ff9800);
            color: #333; font-weight: bold; transition: all 0.2s; flex-shrink: 0;
            margin-left: 8px;
          }
          .btn-mini-autoplay:hover { transform: scale(1.08); box-shadow: 0 2px 8px rgba(255,193,7,0.35); }
    
          /* 结果弹窗 */
          .result-overlay {
            display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.75); z-index: 2000; align-items: center; justify-content: center;
            backdrop-filter: blur(6px);
          }
          .result-overlay.show { display: flex; animation: fadeIn 0.3s ease; }
          .result-box {
            background: linear-gradient(135deg, #1a1a3e, #16213e); border-radius: 24px;
            padding: 36px 46px; text-align: center; border: 1px solid rgba(255,255,255,0.1);
            box-shadow: 0 20px 60px rgba(0,0,0,0.5);
          }
          .result-title { color: #fff; font-size: 26px; font-weight: bold; margin-bottom: 16px; }
          .result-score { font-size: 58px; font-weight: bold; background: linear-gradient(135deg, #38ef7d, #11998e); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
          .result-detail { color: #aaa; font-size: 14px; margin: 14px 0; line-height: 1.8; }
          .result-grade { font-size: 44px; margin: 8px 0; }
          .result-btn {
            padding: 11px 28px; font-size: 15px; border: none; border-radius: 25px;
            cursor: pointer; background: linear-gradient(135deg, #667eea, #764ba2);
            color: white; font-weight: bold; margin: 6px; transition: all 0.2s;
          }
          .result-btn:hover { transform: scale(1.05); }
    
          /* 自动演奏完成弹窗 */
          .autoplay-finish-overlay {
            display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.75); z-index: 2000; align-items: center; justify-content: center;
            backdrop-filter: blur(6px);
          }
          .autoplay-finish-overlay.show { display: flex; animation: fadeIn 0.3s ease; }
          .autoplay-finish-box {
            background: linear-gradient(135deg, #2d1b4e, #1a1a3e); border-radius: 24px;
            padding: 36px 46px; text-align: center; border: 1px solid rgba(255,193,7,0.2);
            box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(255,193,7,0.1);
          }
          .autoplay-finish-title { color: #ffc107; font-size: 26px; font-weight: bold; margin-bottom: 16px; }
          .autoplay-finish-emoji { font-size: 56px; margin: 10px 0; }
    
          /* 滚动条美化 */
          .sidebar-right::-webkit-scrollbar { width: 5px; }
          .sidebar-right::-webkit-scrollbar-track { background: transparent; }
          .sidebar-right::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 3px; }
        </style>
    
        <!-- 左侧：模式导航 -->
        <div class="sidebar-left">
          <div class="sidebar-title">🎹<br>钢琴<br>游戏</div>
          <button class="nav-btn-vertical free active" data-mode="free">🎹 自由演奏</button>
          <button class="nav-btn-vertical beginner" data-mode="beginner">🌱 新手跟练</button>
          <button class="nav-btn-vertical intermediate" data-mode="intermediate">⚡ 进阶挑战</button>
          <button class="nav-btn-vertical advanced" data-mode="advanced">🔥 大师曲目</button>
        </div>
    
        <!-- 中间：主游戏区 -->
        <div class="main-area">
          <div class="header-area">
            <div class="piano-title">⌨️ 键盘钢琴</div>
            <div class="mode-label" id="modeLabel">自由演奏模式 — 尽情发挥你的创意</div>
          </div>
    
          <div class="practice-info" id="practiceInfo">
            <div class="song-header">
              <div>
                <div class="song-name" id="songName">选择一首曲子开始练习</div>
                <div class="song-hint" id="songHint"></div>
              </div>
              <div class="score-display">
                <div class="score-item"><div class="score-value" id="scoreVal">0</div><div class="score-label">得分</div></div>
                <div class="score-item"><div class="score-value" id="comboVal">0</div><div class="score-label">连击</div></div>
                <div class="score-item"><div class="score-value" id="maxComboVal">0</div><div class="score-label">最高连击</div></div>
              </div>
            </div>
            <div class="progress-bar-wrap"><div class="progress-fill" id="progressFill"></div></div>
          </div>
    
          <!-- 自动演奏状态栏 -->
          <div class="autoplay-status" id="autoplayStatus">
            <div class="autoplay-header">
              <div>
                <div class="autoplay-title">🎵 自动演奏中...</div>
                <div class="autoplay-song-name" id="autoplaySongName"></div>
              </div>
            </div>
            <div class="autoplay-current-note" id="autoplayCurrentNote">♪ 准备中...</div>
            <div class="autoplay-progress-text" id="autoplayProgressText">0 / 0</div>
            <div class="autoplay-progress-wrap"><div class="autoplay-progress-fill" id="autoplayProgressFill"></div></div>
          </div>
    
          <!-- 下落音符区 -->
          <div class="falling-notes-area" id="fallingArea">
            <div class="judge-line"></div>
          </div>
    
          <!-- 钢琴键 -->
          <div class="piano-section">
            <div class="piano-wrapper" id="pianoKeys"></div>
          </div>
    
          <div class="controls" id="controls">
            <button class="ctrl-btn btn-start" id="startBtn" style="display:none;">▶ 开始演奏</button>
            <button class="ctrl-btn btn-stop" id="stopBtn" style="display:none;">⏹ 停止</button>
            <button class="ctrl-btn btn-autoplay" id="autoPlayBtn" style="display:none;">✨ 自动演奏欣赏</button>
            <button class="ctrl-btn btn-close" id="closeBtn">关闭 ✕</button>
          </div>
    
          <div class="instructions" id="instructions">
            白键：A S D F G H J K L ; &nbsp;&nbsp; 黑键：W E T Y U O P<br>
            在练习模式下，跟随下落的音符按下对应按键即可 · 点击曲目旁的 🎵 可自动欣赏
          </div>
        </div>
    
        <!-- 右侧：曲目列表 -->
        <div class="sidebar-right" id="songListSidebar">
          <div class="sidebar-right-title">📋 曲目列表</div>
          <div id="songListContent"></div>
        </div>
    
        <!-- 结果弹窗 -->
        <div class="result-overlay" id="resultOverlay">
          <div class="result-box">
            <div class="result-title" id="resultTitle">🎉 演奏完成！</div>
            <div class="result-grade" id="resultGrade">S</div>
            <div class="result-score" id="resultScore">0</div>
            <div class="result-detail" id="resultDetail"></div>
            <button class="result-btn" id="replayBtn">再来一次 🔄</button>
            <button class="result-btn" id="backToListBtn">返回选曲 📋</button>
          </div>
        </div>
    
        <!-- 自动演奏完成弹窗 -->
        <div class="autoplay-finish-overlay" id="autoplayFinishOverlay">
          <div class="autoplay-finish-box">
            <div class="autoplay-finish-title">🎵 欣赏完毕！</div>
            <div class="autoplay-finish-emoji" id="autoplayFinishEmoji">🎉</div>
            <div class="result-detail" id="autoplayFinishDetail" style="color:#ccc;"></div>
            <button class="result-btn" id="autoplayReplayBtn">再听一遍 🔄</button>
            <button class="result-btn" id="autoplayBackBtn">返回选曲 📋</button>
          </div>
        </div>
      `;
    
      document.body.appendChild(container);
    
      // ==================== 构建钢琴键 ====================
      const pianoWrapper = document.getElementById('pianoKeys');
      const mainKeys = [
        { key:'a', note:'C4', type:'white' }, { key:'w', note:'C#4', type:'black' },
        { key:'s', note:'D4', type:'white' }, { key:'e', note:'D#4', type:'black' },
        { key:'d', note:'E4', type:'white' }, { key:'f', note:'F4', type:'white' },
        { key:'t', note:'F#4', type:'black' }, { key:'g', note:'G4', type:'white' },
        { key:'y', note:'G#4', type:'black' }, { key:'h', note:'A4', type:'white' },
        { key:'u', note:'A#4', type:'black' }, { key:'j', note:'B4', type:'white' },
        { key:'k', note:'C5', type:'white' }, { key:'o', note:'C#5', type:'black' },
        { key:'l', note:'D5', type:'white' }, { key:'p', note:'D#5', type:'black' },
        { key:';', note:'E5', type:'white' }
      ];
    
      let wIdx = 0;
      mainKeys.forEach(kd => {
        const el = document.createElement('div');
        el.className = `piano-key ${kd.type}`;
        el.dataset.note = kd.note;
        el.dataset.key = kd.key;
        el.innerHTML = `<span class="note-label">${kd.note.replace('#','♯')}</span><span class="key-label">${kd.key.toUpperCase()}</span>`;
        if (kd.type === 'white') { el.style.marginLeft = '2px'; pianoWrapper.appendChild(el); wIdx++; }
        else { el.style.left = (wIdx * 50 - 15) + 'px'; pianoWrapper.appendChild(el); }
      });
    
      // 键位到X坐标的映射（用于下落音符定位）
      const keyPositions = {};
      mainKeys.forEach((kd, i) => {
        if (kd.type === 'white') {
          const wi = mainKeys.slice(0,i+1).filter(x=>x.type==='white').length - 1;
          keyPositions[kd.note] = wi * 50 + 2 + 24;
        } else {
          const wi = mainKeys.slice(0,i).filter(x=>x.type==='white').length;
          keyPositions[kd.note] = wi * 50 + 50 - 15 + 16;
        }
      });
    
      // ==================== 状态管理 ====================
      let currentMode = 'free';
      let currentSong = null;
      let isPlaying = false;
      let isAutoPlaying = false;
      let score = 0, combo = 0, maxCombo = 0, totalNotes = 0, hitNotes = 0, noteIndex = 0;
      let playTimer = null, fallingTimers = [], activeFallingNotes = [];
      let autoPlayTimer = null;
    
      // ==================== 模式切换 ====================
      const navBtns = container.querySelectorAll('.nav-btn-vertical');
      const practiceInfo = document.getElementById('practiceInfo');
      const fallingArea = document.getElementById('fallingArea');
      const songListSidebar = document.getElementById('songListSidebar');
      const startBtn = document.getElementById('startBtn');
      const stopBtn = document.getElementById('stopBtn');
      const autoPlayBtn = document.getElementById('autoPlayBtn');
      const modeLabel = document.getElementById('modeLabel');
      const autoplayStatus = document.getElementById('autoplayStatus');
    
      const modeLabels = {
        free: '自由演奏模式 — 尽情发挥你的创意',
        beginner: '新手跟练模式 — 跟随引导，轻松入门',
        intermediate: '进阶挑战模式 — 提升技巧，挑战自我',
        advanced: '大师曲目模式 — 高难度，展现实力'
      };
    
      function switchMode(mode) {
        currentMode = mode;
        stopPractice();
        stopAutoPlay();
        navBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
        modeLabel.textContent = modeLabels[mode];
    
        if (mode === 'free') {
          practiceInfo.classList.remove('show');
          fallingArea.classList.remove('show');
          songListSidebar.classList.remove('show');
          autoplayStatus.classList.remove('show');
          startBtn.style.display = 'none';
          stopBtn.style.display = 'none';
          autoPlayBtn.style.display = 'none';
        } else {
          practiceInfo.classList.add('show');
          fallingArea.classList.add('show');
          showSongList(songs[mode]);
          songListSidebar.classList.add('show');
          startBtn.style.display = 'inline-block';
          stopBtn.style.display = 'none';
          autoPlayBtn.style.display = 'inline-block';
        }
      }
    
      navBtns.forEach(btn => btn.addEventListener('click', () => switchMode(btn.dataset.mode)));
    
      // ==================== 曲目列表（带欣赏按钮）====================
      function showSongList(songArr) {
        const content = document.getElementById('songListContent');
        content.innerHTML = '';
        songArr.forEach((song, idx) => {
          const item = document.createElement('div');
          item.className = 'song-item';
          item.innerHTML = `
            <div class="song-item-row">
              <div style="display:flex;flex-direction:column;gap:2px;flex:1;">
                <div class="song-item-name">${song.name}</div>
                <div class="song-item-hint">${song.hint}</div>
                <div class="song-item-meta">${song.notes.filter(n=>n!=='-').length} 个音符</div>
              </div>
              <button class="btn-mini-autoplay" data-song-idx="${idx}" title="点击自动欣赏这首曲子">🎵 欣赏</button>
            </div>
          `;
          // 点击选中曲目
          item.querySelector('.song-item-row > div').addEventListener('click', () => selectSong(idx, item));
          // 点击欣赏按钮
          item.querySelector('.btn-mini-autoplay').addEventListener('click', (e) => {
            e.stopPropagation();
            selectSong(idx, item);
            startAutoPlay();
          });
          content.appendChild(item);
        });
      }
    
      function selectSong(idx, itemEl) {
        document.getElementById('songListContent').querySelectorAll('.song-item').forEach(i => i.classList.remove('selected'));
        if (itemEl) itemEl.classList.add('selected');
        currentSong = songs[currentMode][idx];
        document.getElementById('songName').textContent = currentSong.name;
        document.getElementById('songHint').textContent = currentSong.hint;
        resetScore();
      }
    
      // ==================== 分数系统 ====================
      function resetScore() {
        score = 0; combo = 0; maxCombo = 0; totalNotes = 0; hitNotes = 0; noteIndex = 0;
        updateScoreDisplay();
        document.getElementById('progressFill').style.width = '0%';
      }
    
      function updateScoreDisplay() {
        document.getElementById('scoreVal').textContent = score;
        document.getElementById('comboVal').textContent = combo;
        document.getElementById('maxComboVal').textContent = maxCombo;
      }
    
      function addHit() {
        hitNotes++;
        combo++;
        if (combo > maxCombo) maxCombo = combo;
        score += Math.round(100 * (1 + Math.floor(combo / 10) * 0.1));
        updateScoreDisplay();
      }
    
      function addMiss() { combo = 0; updateScoreDisplay(); }
    
      // ==================== ★★★ 自动演奏核心逻辑 ★★★ ====================
      
      function startAutoPlay() {
        if (!currentSong) {
          alert('请先在右侧选择一首曲子！');
          return;
        }
        
        // 如果正在练习，先停止
        if (isPlaying) stopPractice();
        
        isAutoPlaying = true;
        const songNotes = currentSong.notes;
        const tempo = currentSong.tempo;
        const totalNoteCount = songNotes.length;
        let currentIndex = 0;
        let playedCount = 0;
    
        // 更新UI状态
        autoPlayBtn.textContent = '⏹ 停止欣赏';
        autoPlayBtn.classList.add('playing');
        startBtn.style.display = 'none';
        stopBtn.style.display = 'none';
        autoplayStatus.classList.add('show');
        practiceInfo.classList.remove('show'); // 隐藏练习信息，突出显示自动演奏
        fallingArea.classList.remove('show'); // 隐藏下落区，专注欣赏
        document.getElementById('autoplaySongName').textContent = '正在演奏：' + currentSong.name;
    
        // 恢复AudioContext（浏览器可能挂起）
        if (audioContext.state === 'suspended') {
          audioContext.resume();
        }
    
        function playNextNote() {
          if (!isAutoPlaying || currentIndex >= songNotes.length) {
            // 演奏结束
            if (isAutoPlaying && currentIndex >= songNotes.length) {
              finishAutoPlay(currentSong.name, playedCount, totalNoteCount);
            }
            return;
          }
    
          const note = songNotes[currentIndex];
          
          // 更新进度
          const progress = Math.round((currentIndex / totalNoteCount) * 100);
          document.getElementById('autoplayProgressFill').style.width = progress + '%';
          document.getElementById('autoplayProgressText').textContent = `${currentIndex + 1} / ${totalNoteCount}`;
    
          if (note === '-') {
            // 休止符 - 显示休息
            document.getElementById('autoplayCurrentNote').textContent = '𝄽 休止';
            currentIndex++;
            autoPlayTimer = setTimeout(playNextNote, tempo);
            return;
          }
    
          // 播放音符
          playedCount++;
          document.getElementById('autoplayCurrentNote').textContent = `♪ ${note.replace('#','♯')}`;
          
          // 发声
          playNote(note, Math.max(tempo / 400, 0.5));
    
          // 高亮琴键
          const keyEl = document.querySelector(`[data-note="${note}"]`);
          if (keyEl) {
            keyEl.classList.add('autoplay-glow');
            // 在适当时间后移除高亮
            setTimeout(() => {
              keyEl.classList.remove('autoplay-glow');
            }, Math.min(tempo * 0.8, 300));
          }
    
          currentIndex++;
          autoPlayTimer = setTimeout(playNextNote, tempo);
        }
    
        // 开始演奏第一个音符
        playNextNote();
      }
    
      function stopAutoPlay() {
        isAutoPlaying = false;
        if (autoPlayTimer) {
          clearTimeout(autoPlayTimer);
          autoPlayTimer = null;
        }
        // 清除所有琴键高亮
        document.querySelectorAll('.piano-key').forEach(k => k.classList.remove('autoplay-glow'));
        // 恢复UI
        autoPlayBtn.textContent = '✨ 自动演奏欣赏';
        autoPlayBtn.classList.remove('playing');
        autoplayStatus.classList.remove('show');
        document.getElementById('autoplayCurrentNote').textContent = '♪ 准备中...';
        document.getElementById('autoplayProgressFill').style.width = '0%';
        
        // 根据当前模式恢复显示
        if (currentMode !== 'free') {
          startBtn.style.display = 'inline-block';
          practiceInfo.classList.add('show');
          fallingArea.classList.add('show');
        }
      }
    
      function finishAutoPlay(songName, playedCount, totalCount) {
        isAutoPlaying = false;
        autoPlayBtn.textContent = '✨ 自动演奏欣赏';
        autoPlayBtn.classList.remove('playing');
        
        // 清除琴键高亮
        document.querySelectorAll('.piano-key').forEach(k => k.classList.remove('autoplay-glow'));
    
        // 显示完成弹窗
        const emojis = ['🎉', '🎵', '🎶', '✨', '🌟', '💫', '🎹', '🏆'];
        const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
        document.getElementById('autoplayFinishEmoji').textContent = randomEmoji;
        
        const durationSec = ((totalCount * currentSong.tempo) / 1000).toFixed(1);
        document.getElementById('autoplayFinishDetail').innerHTML = `
          <b>${songName}</b> 演奏完毕！<br><br>
          🎼 总音符数：<b>${totalCount}</b> 个<br>
          🎵 实际演奏：<b>${playedCount}</b> 个<br>
          ⏱️ 曲目时长：约 <b>${durationSec}</b> 秒<br><br>
          <span style="color:#ffc107;font-size:13px;">希望你喜欢这段音乐！🎹</span>
        `;
        document.getElementById('autoplayFinishOverlay').classList.add('show');
      }
    
      // ==================== 练习核心逻辑 ====================
      const FALL_DURATION_MS = 3000;
    
      function startPractice() {
        if (!currentSong) { alert('请先在右侧选择一首曲子！'); return; }
        // 如果正在自动演奏，先停止
        if (isAutoPlaying) stopAutoPlay();
        
        isPlaying = true;
        resetScore();
        startBtn.style.display = 'none';
        stopBtn.style.display = 'inline-block';
        autoPlayBtn.style.display = 'inline-block';
    
        totalNotes = currentSong.notes.filter(n => n !== '-').length;
        noteIndex = 0;
        const tempo = currentSong.tempo;
    
        function scheduleNext() {
          if (!isPlaying || noteIndex >= currentSong.notes.length) {
            if (noteIndex >= currentSong.notes.length && isPlaying) {
              setTimeout(finishPractice, 1500);
            }
            return;
          }
    
          const note = currentSong.notes[noteIndex];
          if (note === '-') { noteIndex++; playTimer = setTimeout(scheduleNext, tempo); return; }
    
          createFallingNote(note, noteIndex);
          noteIndex++;
          playTimer = setTimeout(scheduleNext, tempo);
        }
    
        scheduleNext();
      }
    
      function stopPractice() {
        isPlaying = false;
        if (playTimer) { clearTimeout(playTimer); playTimer = null; }
        fallingTimers.forEach(t => clearTimeout(t));
        fallingTimers = [];
        activeFallingNotes.forEach(n => { if(n && n.parentNode) n.remove(); });
        activeFallingNotes = [];
        document.querySelectorAll('.piano-key').forEach(k => k.classList.remove('hint-glow'));
        startBtn.style.display = 'inline-block';
        stopBtn.style.display = 'none';
        if (currentMode !== 'free') autoPlayBtn.style.display = 'inline-block';
      }
    
      function createFallingNote(note, idx) {
        const area = document.getElementById('fallingArea');
        const posX = keyPositions[note];
        if (posX === undefined) return;
    
        const isBlack = note.includes('#');
        const el = document.createElement('div');
        el.className = `falling-note ${isBlack ? 'black-key' : ''}`;
        
        const noteWidth = isBlack ? 42 : 58;
        const noteHeight = 54;
        el.style.width = noteWidth + 'px';
        el.style.height = noteHeight + 'px';
        el.style.fontSize = isBlack ? '12px' : '15px';
        el.style.left = (posX - noteWidth / 2) + 'px';
        const keyLabel = noteToKey[note] ? noteToKey[note].toUpperCase() : '';
        el.innerHTML = `<div style="font-size:${isBlack?'12px':'15px'};line-height:1.2;">${note.replace('#','♯')}</div><div style="font-size:${isBlack?'10px':'13px'};color:rgba(255,255,255,0.7);font-weight:bold;margin-top:2px;border-top:1px solid rgba(255,255,255,0.25);padding-top:2px;">${keyLabel}</div>`;
        el.style.display = 'flex';
        el.style.flexDirection = 'column';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.dataset.note = note;
        el.dataset.idx = idx;
        el.style.animationDuration = (FALL_DURATION_MS / 1000) + 's';
        area.appendChild(el);
        activeFallingNotes.push(el);
    
        const keyEl = document.querySelector(`[data-note="${note}"]`);
        if (keyEl) keyEl.classList.add('hint-glow');
    
        const removeTimer = setTimeout(() => {
          if (el.parentNode && !el.classList.contains('hit')) {
            el.classList.add('miss');
            addMiss();
            if (keyEl) keyEl.classList.remove('hint-glow');
          }
          setTimeout(() => { if(el.parentNode) el.remove(); }, 300);
        }, FALL_DURATION_MS + 400);
        fallingTimers.push(removeTimer);
      }
    
      function checkNoteHit(pressedNote) {
        for (let i = 0; i < activeFallingNotes.length; i++) {
          const fn = activeFallingNotes[i];
          if (fn && fn.dataset.note === pressedNote && !fn.classList.contains('hit') && !fn.classList.contains('miss')) {
            fn.classList.add('hit');
            addHit();
    
            const progress = totalNotes > 0 ? Math.round((hitNotes / totalNotes) * 100) : 0;
            document.getElementById('progressFill').style.width = progress + '%';
    
            const keyEl = document.querySelector(`[data-note="${pressedNote}"]`);
            if (keyEl) keyEl.classList.remove('hint-glow');
    
            return true;
          }
        }
        return false;
      }
    
      function finishPractice() {
        isPlaying = false;
        startBtn.style.display = 'inline-block';
        stopBtn.style.display = 'none';
        if (currentMode !== 'free') autoPlayBtn.style.display = 'inline-block';
    
        const accuracy = totalNotes > 0 ? Math.round((hitNotes / totalNotes) * 100) : 0;
        let grade = 'F';
        if (accuracy >= 95) grade = 'S';
        else if (accuracy >= 88) grade = 'A';
        else if (accuracy >= 75) grade = 'B';
        else if (accuracy >= 60) grade = 'C';
        else if (accuracy >= 40) grade = 'D';
    
        const gradeEmojis = { S: '🏆', A: '⭐', B: '👍', C: '💪', D: '📖', F: '💡' };
    
        document.getElementById('resultGrade').textContent = `${gradeEmojis[grade]} ${grade}`;
        document.getElementById('resultScore').textContent = score;
        document.getElementById('resultDetail').innerHTML =
          `准确率：<b>${accuracy}%</b> (${hitNotes}/${totalNotes})<br>` +
          `最高连击：<b>${maxCombo}</b> 连击<br>` +
          `${accuracy >= 75 ? '太棒了！继续保持！' : accuracy >= 50 ? '不错哦，再接再厉！' : '别灰心，多练习就能进步！'}`;
        document.getElementById('resultOverlay').classList.add('show');
      }
    
      // ==================== 键盘事件 ====================
      const pressedKeys = new Set();
    
      document.addEventListener('keydown', (e) => {
        const k = e.key.toLowerCase();
        if (pressedKeys.has(k)) return;
        pressedKeys.add(k);
    
        const mappedNote = keyMap[k];
        if (mappedNote) {
          playNote(mappedNote);
          const keyEl = document.querySelector(`[data-note="${mappedNote}"]`);
          if (keyEl) keyEl.classList.add('active');
          if (isPlaying && currentMode !== 'free') checkNoteHit(mappedNote);
        }
      });
    
      document.addEventListener('keyup', (e) => {
        const k = e.key.toLowerCase();
        pressedKeys.delete(k);
        const mappedNote = keyMap[k];
        if (mappedNote) {
          const keyEl = document.querySelector(`[data-note="${mappedNote}"]`);
          if (keyEl) keyEl.classList.remove('active');
        }
      });
    
      // 鼠标点击钢琴键
      document.querySelectorAll('.piano-key').forEach(keyEl => {
        keyEl.addEventListener('mousedown', () => {
          const n = keyEl.dataset.note;
          playNote(n);
          keyEl.classList.add('active');
          if (isPlaying && currentMode !== 'free') checkNoteHit(n);
        });
        keyEl.addEventListener('mouseup', () => keyEl.classList.remove('active'));
        keyEl.addEventListener('mouseleave', () => keyEl.classList.remove('active'));
      });
    
      // ==================== 按钮事件 ====================
      startBtn.addEventListener('click', startPractice);
      stopBtn.addEventListener('click', stopPractice);
      
      // 自动演奏按钮事件
      autoPlayBtn.addEventListener('click', () => {
        if (isAutoPlaying) {
          stopAutoPlay();
        } else {
          startAutoPlay();
        }
      });
    
      document.getElementById('closeBtn').addEventListener('click', () => {
        stopPractice();
        stopAutoPlay();
        container.remove();
        Object.values(activeOscillators).forEach(o => { try{o.stop();}catch(e){} });
      });
    
      document.getElementById('replayBtn').addEventListener('click', () => {
        document.getElementById('resultOverlay').classList.remove('show');
        startPractice();
      });
    
      document.getElementById('backToListBtn').addEventListener('click', () => {
        document.getElementById('resultOverlay').classList.remove('show');
      });
    
      // 自动演奏完成弹窗按钮
      document.getElementById('autoplayReplayBtn').addEventListener('click', () => {
        document.getElementById('autoplayFinishOverlay').classList.remove('show');
        startAutoPlay();
      });
    
      document.getElementById('autoplayBackBtn').addEventListener('click', () => {
        document.getElementById('autoplayFinishOverlay').classList.remove('show');
      });
    
      container.addEventListener('keydown', e => { if(e.code === 'Space') e.preventDefault(); });
    
      return {
        ok: true,
        summary: '🎹 键盘钢琴 v4 已启动！新增【自动演奏欣赏】功能 — 所有曲目均可一键自动播放欣赏！全新布局：左侧模式导航、右侧曲目列表(每首带🎵欣赏按钮)、中间控制区含【✨自动演奏欣赏】大按钮。',
        data: {
          modes: ['free', 'beginner', 'intermediate', 'advanced'],
          totalSongs: songs.beginner.length + songs.intermediate.length + songs.advanced.length,
          pianoKeys: mainKeys.length,
          newFeatures: [
            '自动演奏欣赏功能 - 所有曲目支持',
            '每首曲目旁独立🎵欣赏按钮',
            '金色琴键光效动画反馈',
            '实时当前音符显示',
            '演奏进度条与计数',
            '演奏完成精美弹窗',
            '可中途停止/重播'
          ],
          layout: 'left-sidebar-nav | center-game-area(with autoplay status bar) | right-sidebar-song-list(with mini autoplay buttons)'
        }
      };
    }
  );
  if (typeof __tabOriginalFunction !== "function") {
    throw new Error("evaluate_script source must evaluate to a function");
  }
  return await __tabOriginalFunction();
})();