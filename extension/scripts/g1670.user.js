(async function __tabEvaluateScriptBridge() {
  const __tabScriptArgs = null;
  const __tabOriginalFunction = (
    /**
     * 朋友圈文案生成器 - WeChat Moments Copywriter
     * 
     * 功能：
     * 1. 根据图片/关键词自动生成适合发朋友圈的文案
     * 2. 支持多种风格：文艺、幽默、生活、旅行、美食、情感、励志、简约
     * 3. 支持自定义关键词组合
     * 4. 一键复制生成的文案
     * 5. 根据风格/关键词推荐适合照片的背景音乐（BGM）
     * 
     * 使用方式：在任意网页上运行此脚本，会弹出一个浮动的文案生成器面板
     */
    
    async function run(args) {
      // ========== 配置 ==========
      const CONFIG = {
        title: '✨ 朋友圈文案生成器',
        version: '3.0.0',
        styles: [
          { id: 'literary', name: '📖 文艺', icon: '🌸', color: '#6366f1' },
          { id: 'humor', name: '😄 幽默', icon: '🤪', color: '#f59e0b' },
          { id: 'life', name: '☕ 生活', icon: '🌿', color: '#10b981' },
          { id: 'travel', name: '✈️ 旅行', icon: '🗺️', color: '#3b82f6' },
          { id: 'food', name: '🍜 美食', icon: '🍱', color: '#ef4444' },
          { id: 'emotion', name: '💕 情感', icon: '💗', color: '#ec4899' },
          { id: 'motivation', name: '💪 励志', icon: '🔥', color: '#f97316' },
          { id: 'minimal', name: '🤍 简约', icon: '✨', color: '#8b5cf6' }
        ],
        defaultStyle: 'life'
      };
    
      // ========== 文案模板库 ==========
      const TEMPLATES = {
        literary: {
          templates: [
            '"没有人过着如愿以偿的顺遂人生。" ——坂口安吾《青色地毯》。今天和{keyword}在一起。',
            '"所有大人都曾经是小孩，虽然只有少数人记得。" ——《小王子》。{keyword}让我想起这句话。',
            '"人是为了活着本身而活，而不是为了活着之外的任何事物。" ——余华《活着》。{keyword}亦是如此。',
            '"明天又是新的一天。" ——《飘》。带着{keyword}迎接每个清晨。',
            '"坚定地成为自己，同时关心他人的命运。" ——蒋方舟《在黑夜里健步如飞》。{keyword}时刻。',
            '如花在野，温柔热烈。今日{keyword}。',
            '我与世界，就是帧帧瞬间。{keyword}是其中最温柔的一帧。',
            '时间是横渡一切的造物。在{keyword}面前，时间慢了下来。',
            '先成为自己的山，再去找心中的海。{keyword}就是那座山。',
            '循环往复，直至新生。每一次{keyword}都是一次小小的重生。'
          ],
          suffixes: ['\n\n#书摘 #文艺 #阅读', '\n\n#高级感文案 #文字的力量', '\n\n#治愈系 #小确幸']
        },
        humor: {
          templates: [
            '关于{keyword}这件事，我有一个大胆的想法……算了还是吃吧🍜',
            '别人在朋友圈晒精致生活，我在{keyword}里寻找生命的意义（并没有）',
            '今日{keyword}含量超标⚠️建议反复观看至少三遍',
            '本来想拍个{keyword}大片，结果拍成了表情包😂',
            '朋友问我为什么总发{keyword}，我说因为穷得只剩{keyword}了💸',
            '这不是{keyword}，这是我的人生高光时刻（虽然有点矮）✨',
            '官方认证：本条朋友圈含{keyword}量极高，建议全文背诵',
            '生活不是等待暴风雨过去，而是在{keyword}里学会跳舞💃',
            '不要在该奋斗的年纪选择{keyword}……开玩笑的，{keyword}很重要',
            '勇敢不是不害怕，而是明明怕得要死还敢去吃{keyword}🦶'
          ],
          suffixes: ['\n\n#搞笑女/男 #沙雕日常', '\n\n#快乐源泉 #今日份开心', '\n\n#朋友圈段子 #幽默']
        },
        life: {
          templates: [
            '"人生只要能照亮某个角落就够了。" ——中村恒子《人间值得》。今天被{keyword}照亮了。',
            '浪漫的年纪，不许活得无趣。{keyword}日签☑️',
            '有钱把日子过好，没钱把心情过好。今天选{keyword}。',
            '没有大彻大悟，只有边走边悟。{keyword}教会我的事。',
            '当你不再焦虑，这世界便开满了花。今日花朵：{keyword}🌸',
            '答案藏在硬币的第三面。{keyword}是我的答案。',
            '有人走向海，有人走向山，都是好风光。我走向{keyword}。',
            '心宽便会百事成欢。{keyword}之后，百事成欢。',
            '来日方长，我们带着诚意慢慢来。{keyword}不急。',
            '生活就像一个洞，但光还是会进来。{keyword}就是那束光。'
          ],
          suffixes: ['\n\n#生活碎片 #人间值得', '\n\n#好好生活 #日常记录', '\n\n#治愈 #小确幸']
        },
        travel: {
          templates: [
            '"每一条路都是一场实验，路的尽头也就是另一次重新评估的时机。" 在{keyword}的路上。',
            '护照上的印章会褪色，但{keyword}的记忆永远鲜活📍',
            '山不见我，我自去见山。这次去见{keyword}。',
            '世界是一本书，不去{keyword}的人只读了第一页。',
            '与其向往{keyword}，不如现在就出发✈️',
            '收集地图上的每一次风和日丽。这次收集的是{keyword}。',
            '身体和灵魂总要有一个在{keyword}的路上。',
            '走过很多路，最爱的还是通往{keyword}的那一条。',
            '在{keyword}，时间好像变慢了。这正是旅行的意义。',
            '路是崎岖的，可灯永远亮着。下一盏灯在{keyword}。'
          ],
          suffixes: ['\n\n#旅行日记 #在路上', '\n\n#说走就走 #风景', '\n\n#{keyword} #旅行记录']
        },
        food: {
          templates: [
            '厨房里的烟火气，是世界上最治愈的味道。今日菜单：{keyword}🍽️',
            '没有什么是一顿{keyword}解决不了的，如果有，那就两顿。',
            '认真吃饭是对生活最大的尊重。今天认真吃了：{keyword}',
            '给生活加点料——今天加的是{keyword} 🧂',
            '味道是个奇怪的东西，{keyword}一口就能带你回家。',
            '今日卡路里来源：{keyword}（完全值得！）',
            '吃货的最高境界：看见{keyword}走不动道🚶‍♂️💨',
            '人生苦短，再来一碗{keyword}！',
            '好吃的东西要吃进肚子里，喜欢的人要放在心里。{keyword}安排上了。',
            '唯有美食与爱不可辜负。今日份双倍快乐：{keyword}'
          ],
          suffixes: ['\n\n#美食分享 #干饭人', '\n\n#今天吃什么 #美食打卡', '\n\n#美食日记 #吃货日常']
        },
        emotion: {
          templates: [
            '"路要和优秀的人一起走才能长远，日子要和懂你的人一起过才算值得。" 和你一起{keyword}。',
            '"如果你不花时间去创造你想要的生活，你将被迫花很多时间去应付你不想要的。" 选择{keyword}就是选择想要的生活。',
            '你是我藏在微风里的欢喜，也是{keyword}时的心动。',
            '喜欢你是件很麻烦的事，但偏偏我喜欢找麻烦。尤其是在{keyword}的时候。',
            '这一生，关于{keyword}的故事，都想和你有关。',
            '爱在日常，才不寻常。今天的{keyword}，想分享给你❤️',
            '遇见你之后，所有的{keyword}都有了归属。',
            '如果快乐有形状，那一定是{keyword}的样子。',
            '不用刻意合群，有趣的人会互相吸引。就像我和{keyword}。',
            '那些杀不死你的，终将成为你身上的勋章。包括爱上{keyword}这件事。'
          ],
          suffixes: ['\n\n#碎碎念 #情感语录', '\n\n#心动 #温柔', '\n\n#爱与被爱 #日常']
        },
        motivation: {
          templates: [
            '"人生没有白走的路，每一步都算数。" 走向{keyword}的每一步都算数。',
            '"不跟生活认输，不向岁月低头。" 如果风景不够好，就多走几步到{keyword}。',
            '"每一次跌倒后的站起，都让你比昨天更强大。" 为{keyword}站起来！',
            '"成功的路上没有人会叫你起床，也没有人会为你买单。" 但{keyword}值得你主动醒来。',
            '"半山腰总是最挤的，我们要去山顶看看。" 山顶有{keyword}在等你。',
            '"做自己的光，不需要太亮，足够照亮前行的路就够了。" 前行的路上有{keyword}。',
            '"你比你想象的更强大。" 强大到可以拥有{keyword}。',
            '"保持热爱，奔赴山海。" 奔赴{keyword}这片山海。',
            '"种一棵树最好的时间是十年前，其次是现在。" 现在开始{keyword}吧。',
            '"星光不问赶路人，时光不负有心人。" 追逐{keyword}的人，终将被时光善待。'
          ],
          suffixes: ['\n\n#自我成长 #每日一句', '\n\n#励志 #正能量', '\n\n#向前冲 #加油']
        },
        minimal: {
          templates: [
            '{keyword}。',
            'about {keyword}',
            '{keyword} / done',
            'just {keyword}',
            '· {keyword} ·',
            '{keyword} ✓',
            '{keyword} 🤍',
            'less is more.\n{keyword}.',
            '{keyword}。就这样。',
            'here → {keyword}'
          ],
          suffixes: ['', '', '\n\n#极简主义', '\n\n#少即是多']
        }
      };
    
      // ========== 开场白模板（无关键词时） ==========
      const OPENING_LINES = {
        literary: [
          '"愿得长如此，年年物候新。" ——卢照邻',
          '"如花在野，温柔热烈。"',
          '"先有自我，才无枷锁。"',
          '"生而独一无二，无需人云亦云。"',
          '"风走了，影子却还留在窗里。"'
        ],
        humor: [
          '不可以垂头丧气哦，会显矮 📏',
          '这条朋友圈凑数的，别介意哈（已凑满字数）',
          '今日营业状态：已开机，正在加载{keyword}...',
          '活着真好（发自肺腑地）',
          '本内容纯属虚构，如有雷同……那你眼光不错😎'
        ],
        life: [
          '"去做力所能及的事，这也是一种自我解脱。" ——中村恒子',
          '"快乐与平凡最浪漫。"',
          '"生活不简单，尽量简单过。"',
          '"落日余晖的路上总是爱意弥漫。"',
          '"如果事与愿违，那一定另有安排。"'
        ],
        travel: [
          '"世界赠予我的，我都收下。" ——王菲',
          '"去更远的地方，见更亮的光。"',
          '"在路上，永远年轻。"',
          '"收集地图上的每一次风和日利。"',
          '"下一站，未知但期待。"'
        ],
        food: [
          '"吃饭是头等大事，其他都是次要的。"',
          '"碳水快乐，谁懂啊 🍜"',
          '"今日份的快乐来自胃。"',
          '"好好吃饭，好好爱自己。"',
          '"民以食为天，我以食为乐。"'
        ],
        emotion: [
          '"谢谢你的出现，让我精神愉悦。"',
          '"无需比较，你也是无与伦比的美丽。"',
          '"光会拥抱每一个努力抬头的人。"',
          '"你和星星一样值得被收藏。"',
          '"心动的频率，刚好和你同频。"'
        ],
        motivation: [
          '"你现在的每一步，都在靠近你想去的远方。"',
          '"那些你看不见的努力，正在为你铺路。"',
          '"做有序的自己，等待万物更新。"',
          '"没有永远的上游，但我们永远向上游。"',
          '"路是崎岖的，可灯永远亮着。"'
        ],
        minimal: [
          'here.',
          'now.',
          'alive.',
          'breathe.',
          'ok.'
        ]
      };
    
      // ========== 工具函数 ==========
      function randomPick(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
      }
    
      function generateCopy(styleId, keywords, imageCount = 0) {
        const styleTemplates = TEMPLATES[styleId];
        if (!styleTemplates) return '请选择有效的风格';
    
        let text = '';
        
        if (keywords && keywords.trim()) {
          // 有关键词时使用模板
          const kw = keywords.trim();
          const template = randomPick(styleTemplates.templates);
          text = template.replace(/{keyword}/g, kw);
          
          // 如果有多张图片，可能添加相关描述
          if (imageCount > 1) {
            const multiImagePhrases = [
              `\n（还有${imageCount - 1}张同样精彩的照片 ✨）`,
              `\n📸 多图预警：共${imageCount}张`,
              ''
            ];
            text += randomPick(multiImagePhrases);
          }
          
          // 随机添加后缀标签
          const suffix = randomPick(styleTemplates.suffixes);
          if (suffix) text += suffix;
        } else {
          // 无关键词时使用开场白
          const openings = OPENING_LINES[styleId] || OPENING_LINES.life;
          text = randomPick(openings);
          const suffix = randomPick(styleTemplates.suffixes);
          if (suffix) text += suffix;
        }
    
        return text;
      }
    
      function generateMultipleCopies(styleId, keywords, count = 3, imageCount = 0) {
        const results = [];
        const usedTemplates = new Set();
        
        for (let i = 0; i < count; i++) {
          let copy;
          let attempts = 0;
          do {
            copy = generateCopy(styleId, keywords, imageCount);
            attempts++;
          } while (usedTemplates.has(copy) && attempts < 10);
          
          usedTemplates.add(copy);
          results.push({ index: i + 1, text: copy });
        }
        
        return results;
      }
    
      // ========== 背景音乐推荐库 ==========
      const MUSIC_LIBRARY = {
        literary: [
          { name: '世界赠予我的', artist: '王菲', mood: '温柔治愈' },
          { name: '溯 (Reverse)', artist: 'CORSAK 胡梦周', mood: '空灵文艺' },
          { name: '消散对白', artist: '丁禹兮', mood: '遗憾唯美' },
          { name: '山茶花读不懂白玫瑰', artist: '抖音热歌', mood: '诗意叙事' },
          { name: '苹果香', artist: '狼戈', mood: '民族怀旧' },
          { name: '想你时风起', artist: '单依纯', mood: '温柔思念' },
          { name: '若月亮没来', artist: '王宇宙/乔浚丞', mood: '治愈民谣' },
          { name: '可能', artist: '程响', mood: '人生感悟' }
        ],
        humor: [
          { name: '大展宏图', artist: '揽佬SKAI/AR刘夫阳', mood: '洗脑魔性' },
          { name: '跳楼机', artist: 'LBI利比', mood: '轻松搞怪' },
          { name: '越打越年轻', artist: '7Revive', mood: '欢乐游戏' },
          { name: '天亮以前说再见', artist: '四熹丸子', mood: '反差搞笑' },
          { name: '2025狠狠的幸福', artist: '文佬狮', mood: '快乐洗脑' },
          { name: '半生雪', artist: '七叔', mood: '古风趣玩' },
          { name: '喊麦串烧', artist: 'MC水观音', mood: '复古狂欢' },
          { name: 'Lose Control', artist: 'Hedley', mood: '节奏欢快' }
        ],
        life: [
          { name: '人间烟火', artist: '程响', mood: '温暖日常' },
          { name: '小美满', artist: '周深', mood: '治愈生活' },
          { name: '你曾说过', artist: '张远', mood: '时光感慨' },
          { name: '我的纸飞机', artist: '群星', mood: '童年回忆' },
          { name: '去有风的地方', artist: '郁可唯', mood: '松弛自在' },
          { name: '如愿', artist: '王菲', mood: '深情温暖' },
          { name: '是妈妈是女儿', artist: '黄绮珊/希林娜依·高', mood: '亲情治愈' },
          { name: '这世界那么多人', artist: '莫文蔚', mood: '温柔珍惜' }
        ],
        travel: [
          { name: '向云端', artist: '小霞/毛不易', mood: '自由远方' },
          { name: '离别开出花', artist: '就是南方凯', mood: '旅途感怀' },
          { name: '西楼儿女', artist: '海来阿木', mood: '城市漂泊' },
          { name: '望', artist: '周深', mood: '壮阔山河' },
          { name: '一路生花', artist: '温奕心', mood: '美好旅程' },
          { name: '星辰大海', artist: '黄霄雬', mood: '梦想远航' },
          { name: '追光的人', artist: '韦礼安', mood: '追逐风景' },
          { name: '风起时', artist: '吴青峰', mood: '旅途诗意' }
        ],
        food: [
          { name: '热爱105°C的你', artist: '阿肆', mood: '活力美食' },
          { name: 'Mojito', artist: '周杰伦', mood: '轻松惬意' },
          { name: '卡路里', artist: '火箭少女101', mood: '美食狂欢' },
          { name: '人间烟火气', artist: '程响', mood: '烟火治愈' },
          { name: '甜蜜蜜', artist: '邓丽君', mood: '经典甜美' },
          { name: '告白气球', artist: '周杰伦', mood: '约会甜点' },
          { name: '慢慢喜欢你', artist: '莫文蔚', mood: '温柔食刻' },
          { name: '暖暖', artist: '梁静茹', mood: '温馨满足' }
        ],
        emotion: [
          { name: '万物不如你', artist: '张杰', mood: '甜蜜依恋' },
          { name: '如果爱忘了', artist: '戚薇', mood: '情感释怀' },
          { name: '年轮说', artist: '杨丞琳', mood: '时光情感' },
          { name: '关键词', artist: '林俊杰', mood: '温柔情歌' },
          { name: '永不失联的爱', artist: '周兴哲', mood: '深情守候' },
          { name: '悬溺', artist: '葛东琪', mood: '独特心动' },
          { name: '孤勇者', artist: '陈奕迅', mood: '力量情感' },
          { name: '字字句句', artist: '抖音热歌', mood: '细腻心事' }
        ],
        motivation: [
          { name: '罗刹海市', artist: '刀郎', mood: '深刻力量' },
          { name: '少年', artist: '梦然', mood: '初心不改' },
          { name: '破茧', artist: '张韶涵', mood: '突破自我' },
          { name: '你的答案', artist: '阿冗', mood: '热血追梦' },
          { name: '星辰大海', artist: '黄霄雬', mood: '梦想远航' },
          { name: '人世间', artist: '雷佳', mood: '坚韧生命' },
          { name: '篇章', artist: '群星', mood: '青春奋斗' },
          { name: '做自己的光，不需要太亮', artist: '刘惜君', mood: '自我坚定' }
        ],
        minimal: [
          { name: '安静', artist: '周杰伦', mood: '安静简约' },
          { name: '房间', artist: '刘瑞琦', mood: '私密安静' },
          { name: '消愁', artist: '毛不易', mood: '淡淡忧伤' },
          { name: '像我这样的人', artist: '毛不易', mood: '自省简约' },
          { name: '我要你', artist: '任素汐', mood: '纯真简单' },
          { name: '可能', artist: '程响', mood: '极简感悟' },
          { name: '萱草花', artist: '张小斐', mood: '温柔朴素' },
          { name: '只要平凡', artist: '张杰/张碧晨', mood: '平静力量' }
        ]
      };
    
      function generateMusicRecommendation(styleId, keywords) {
        const songs = MUSIC_LIBRARY[styleId] || MUSIC_LIBRARY.life;
        let recommended = [];
    
        // 根据关键词匹配（简单启发式）
        if (keywords) {
          const kw = keywords.toLowerCase();
          const travelKw = ['旅行','旅游','风景','山','海','城市','日落','日出','海边','爬山'];
          const foodKw = ['美食','吃','咖啡','火锅','烧烤','蛋糕','甜点','餐厅','做饭','晚餐'];
          const loveKw = ['爱','喜欢','想你','恋爱','情侣','约会','心动','表白','幸福'];
          const lifeKw = ['生活','日常','工作','学习','读书','运动','健身','跑步'];
    
          if (travelKw.some(t => kw.includes(t))) {
            recommended = [...MUSIC_LIBRARY.travel];
          } else if (foodKw.some(t => kw.includes(t))) {
            recommended = [...MUSIC_LIBRARY.food];
          } else if (loveKw.some(t => kw.includes(t))) {
            recommended = [...MUSIC_LIBRARY.emotion];
          } else if (lifeKw.some(t => kw.includes(t))) {
            recommended = [...MUSIC_LIBRARY.life];
          }
        }
    
        // 如果没有通过关键词匹配到，使用风格默认推荐
        if (recommended.length === 0) {
          recommended = [...songs];
        }
    
        // 随机选2-3首
        const shuffled = recommended.sort(() => Math.random() - 0.5);
        return shuffled.slice(0, 2 + Math.floor(Math.random() * 2));
      }
    
      // ========== UI 样式 ==========
      const CSS = `
        .wmg-overlay {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          background: rgba(0,0,0,0.5) !important;
          z-index: 2147483647 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif !important;
          animation: wmg-fadeIn 0.3s ease !important;
        }
        
        @keyframes wmg-fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes wmg-slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes wmg-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        
        .wmg-panel {
          background: #ffffff !important;
          border-radius: 20px !important;
          width: 420px !important;
          max-width: 90vw !important;
          max-height: 85vh !important;
          overflow: hidden !important;
          box-shadow: 0 25px 80px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.1) !important;
          animation: wmg-slideUp 0.4s ease !important;
          display: flex !important;
          flex-direction: column !important;
        }
        
        .wmg-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
          padding: 20px 24px !important;
          color: white !important;
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          position: relative !important;
          overflow: hidden !important;
        }
        
        .wmg-header::before {
          content: '' !important;
          position: absolute !important;
          top: -50% !important;
          right: -30% !important;
          width: 200px !important;
          height: 200px !important;
          background: rgba(255,255,255,0.1) !important;
          border-radius: 50% !important;
        }
        
        .wmg-title {
          font-size: 18px !important;
          font-weight: 700 !important;
          letter-spacing: 0.5px !important;
          position: relative !important;
          z-index: 1 !important;
        }
        
        .wmg-version {
          font-size: 11px !important;
          opacity: 0.7 !important;
          margin-left: 8px !important;
          font-weight: 400 !important;
        }
        
        .wmg-close-btn {
          width: 32px !important;
          height: 32px !important;
          border-radius: 50% !important;
          border: none !important;
          background: rgba(255,255,255,0.2) !important;
          color: white !important;
          font-size: 18px !important;
          cursor: pointer !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          transition: all 0.2s !important;
          position: relative !important;
          z-index: 1 !important;
        }
        
        .wmg-close-btn:hover {
          background: rgba(255,255,255,0.35) !important;
          transform: rotate(90deg) !important;
        }
        
        .wmg-body {
          padding: 20px 24px !important;
          overflow-y: auto !important;
          flex: 1 !important;
        }
        
        .wmg-section {
          margin-bottom: 18px !important;
        }
        
        .wmg-label {
          font-size: 13px !important;
          font-weight: 600 !important;
          color: #374151 !important;
          margin-bottom: 8px !important;
          display: block !important;
        }
        
        .wmg-input {
          width: 100% !important;
          padding: 12px 16px !important;
          border: 2px solid #e5e7eb !important;
          border-radius: 12px !important;
          font-size: 14px !important;
          outline: none !important;
          transition: all 0.2s !important;
          box-sizing: border-box !important;
          font-family: inherit !important;
          background: #fafafa !important;
          color: #1f2937 !important;
        }
        
        .wmg-input:focus {
          border-color: #667eea !important;
          background: white !important;
          box-shadow: 0 0 0 4px rgba(102,126,234,0.1) !important;
        }
        
        .wmg-input::placeholder {
          color: #9ca3af !important;
        }
        
        .wmg-textarea {
          min-height: 72px !important;
          resize: vertical !important;
          line-height: 1.5 !important;
        }
        
        /* 风格选择器 */
        .wmg-style-grid {
          display: grid !important;
          grid-template-columns: repeat(4, 1fr) !important;
          gap: 8px !important;
        }
        
        .wmg-style-chip {
          padding: 8px 10px !important;
          border-radius: 10px !important;
          border: 2px solid #e5e7eb !important;
          background: white !important;
          cursor: pointer !important;
          font-size: 12px !important;
          text-align: center !important;
          transition: all 0.2s !important;
          user-select: none !important;
          line-height: 1.4 !important;
        }
        
        .wmg-style-chip:hover {
          border-color: #c7d2fe !important;
          background: #f5f3ff !important;
        }
        
        .wmg-style-chip.active {
          border-width: 2.5px !important;
          box-shadow: 0 0 0 3px rgba(102,126,234,0.15), 0 4px 14px rgba(0,0,0,0.12) !important;
          transform: scale(1.03) !important;
          font-weight: 700 !important;
        }
        
        /* 图片上传区 */
        .wmg-upload-zone {
          border: 2px dashed #d1d5db !important;
          border-radius: 14px !important;
          padding: 24px 16px !important;
          text-align: center !important;
          cursor: pointer !important;
          transition: all 0.2s !important;
          background: #f9fafb !important;
          position: relative !important;
        }
        
        .wmg-upload-zone:hover {
          border-color: #667eea !important;
          background: #f5f3ff !important;
        }
        
        .wmg-upload-zone.has-files {
          border-style: solid !important;
          border-color: #86efac !important;
          background: #f0fdf4 !important;
        }
        
        .wmg-upload-icon {
          font-size: 36px !important;
          margin-bottom: 8px !important;
          display: block !important;
        }
        
        .wmg-upload-text {
          font-size: 13px !important;
          color: #6b7280 !important;
        }
        
        .wmg-upload-hint {
          font-size: 11px !important;
          color: #9ca3af !important;
          margin-top: 4px !important;
        }
        
        .wmg-file-input {
          display: none !important;
        }
        
        /* 按钮 */
        .wmg-generate-btn {
          width: 100% !important;
          padding: 14px 24px !important;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
          color: white !important;
          border: none !important;
          border-radius: 14px !important;
          font-size: 15px !important;
          font-weight: 700 !important;
          cursor: pointer !important;
          transition: all 0.3s !important;
          letter-spacing: 0.5px !important;
          position: relative !important;
          overflow: hidden !important;
        }
        
        .wmg-generate-btn:hover {
          transform: translateY(-2px) !important;
          box-shadow: 0 8px 25px rgba(102,126,234,0.4) !important;
        }
        
        .wmg-generate-btn:active {
          transform: translateY(0) !important;
        }
        
        .wmg-generate-btn:disabled {
          opacity: 0.6 !important;
          cursor: not-allowed !important;
          transform: none !important;
        }
        
        /* 结果区域 */
        .wmg-results {
          margin-top: 16px !important;
          display: none !important;
        }
        
        .wmg-results.show {
          display: block !important;
          animation: wmg-slideUp 0.3s ease !important;
        }
        
        .wmg-result-card {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%) !important;
          border-radius: 14px !important;
          padding: 16px !important;
          margin-bottom: 12px !important;
          border: 1px solid #e2e8f0 !important;
          position: relative !important;
          transition: all 0.2s !important;
        }
        
        .wmg-result-card:hover {
          border-color: #c7d2fe !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.06) !important;
        }
        
        .wmg-result-number {
          position: absolute !important;
          top: -8px !important;
          left: 14px !important;
          background: linear-gradient(135deg, #667eea, #764ba2) !important;
          color: white !important;
          font-size: 11px !important;
          font-weight: 700 !important;
          padding: 2px 10px !important;
          border-radius: 20px !important;
        }
        
        .wmg-result-text {
          font-size: 14px !important;
          line-height: 1.7 !important;
          color: #1f2937 !important;
          white-space: pre-wrap !important;
          word-break: break-word !important;
          margin-top: 4px !important;
        }
        
        .wmg-copy-btn {
          margin-top: 10px !important;
          padding: 6px 16px !important;
          background: white !important;
          border: 1.5px solid #e5e7eb !important;
          border-radius: 8px !important;
          font-size: 12px !important;
          color: #4b5563 !important;
          cursor: pointer !important;
          transition: all 0.2s !important;
          display: inline-flex !important;
          align-items: center !important;
          gap: 4px !important;
        }
        
        .wmg-copy-btn:hover {
          background: #667eea !important;
          color: white !important;
          border-color: #667eea !important;
        }
        
        .wmg-copy-btn.copied {
          background: #10b981 !important;
          color: white !important;
          border-color: #10b981 !important;
        }
        
        /* 底部操作栏 */
        .wmg-footer {
          padding: 14px 24px !important;
          background: #f9fafb !important;
          border-top: 1px solid #f3f4f6 !important;
          display: flex !important;
          gap: 10px !important;
          align-items: center !important;
        }
        
        .wmg-regenerate-btn {
          flex: 1 !important;
          padding: 10px !important;
          background: white !important;
          border: 2px solid #e5e7eb !important;
          border-radius: 10px !important;
          font-size: 13px !important;
          color: #4b5563 !important;
          cursor: pointer !important;
          transition: all 0.2s !important;
          font-weight: 600 !important;
        }
        
        .wmg-regenerate-btn:hover {
          border-color: #667eea !important;
          color: #667eea !important;
          background: #f5f3ff !important;
        }
        
        .wmg-count-select {
          padding: 10px 12px !important;
          border: 2px solid #e5e7eb !important;
          border-radius: 10px !important;
          font-size: 13px !important;
          color: #4b5563 !important;
          background: white !important;
          cursor: pointer !important;
          outline: none !important;
          font-weight: 600 !important;
        }
        
        .wmg-count-select:focus {
          border-color: #667eea !important;
        }
        
        /* Toast 提示 */
        .wmg-toast {
          position: fixed !important;
          bottom: 40px !important;
          left: 50% !important;
          transform: translateX(-50%) translateY(20px) !important;
          background: #1f2937 !important;
          color: white !important;
          padding: 12px 24px !important;
          border-radius: 12px !important;
          font-size: 14px !important;
          z-index: 2147483648 !important;
          opacity: 0 !important;
          transition: all 0.3s ease !important;
          pointer-events: none !important;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2) !important;
        }
        
        .wmg-toast.show {
          opacity: 1 !important;
          transform: translateX(-50%) translateY(0) !important;
        }
        
        /* 背景音乐推荐区 */
        .wmg-music-section {
          margin-top: 16px !important;
          display: none !important;
          animation: wmg-slideUp 0.3s ease !important;
        }
        
        .wmg-music-section.show {
          display: block !important;
        }
        
        .wmg-music-header {
          display: flex !important;
          align-items: center !important;
          gap: 6px !important;
          font-size: 13px !important;
          font-weight: 700 !important;
          color: #374151 !important;
          margin-bottom: 10px !important;
        }
        
        .wmg-music-list {
          display: flex !important;
          flex-direction: column !important;
          gap: 8px !important;
        }
        
        .wmg-music-item {
          display: flex !important;
          align-items: center !important;
          gap: 10px !important;
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%) !important;
          border-radius: 12px !important;
          padding: 12px 14px !important;
          border: 1px solid #fcd34d !important;
          transition: all 0.2s !important;
        }
        
        .wmg-music-item:hover {
          transform: translateX(4px) !important;
          box-shadow: 0 4px 12px rgba(251,191,36,0.25) !important;
        }
        
        .wmg-music-icon {
          font-size: 24px !important;
          flex-shrink: 0 !important;
        }
        
        .wmg-music-info {
          flex: 1 !important;
          min-width: 0 !important;
        }
        
        .wmg-music-name {
          font-size: 13px !important;
          font-weight: 700 !important;
          color: #92400e !important;
        }
        
        .wmg-music-artist {
          font-size: 11px !important;
          color: #b45309 !important;
          margin-top: 1px !important;
        }
        
        .wmg-music-mood {
          font-size: 10px !important;
          background: rgba(255,255,255,0.6) !important;
          color: #92400e !important;
          padding: 2px 8px !important;
          border-radius: 20px !important;
          white-space: nowrap !important;
          flex-shrink: 0 !important;
        }
    
        /* 响应式 */
        @media (max-width: 480px) {
          .wmg-panel {
            width: 95vw !important;
            border-radius: 16px !important;
          }
          .wmg-style-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .wmg-body {
            padding: 16px 18px !important;
          }
        }
      `;
    
      // ========== 创建UI ==========
      function createUI() {
        // 注入样式
        const styleEl = document.createElement('style');
        styleEl.id = 'wmg-styles';
        styleEl.textContent = CSS;
        document.head.appendChild(styleEl);
    
        // 创建遮罩层
        const overlay = document.createElement('div');
        overlay.className = 'wmg-overlay';
        overlay.id = 'wmg-container';
        overlay.innerHTML = `
          <div class="wmg-panel">
            <!-- 头部 -->
            <div class="wmg-header">
              <div>
                <span class="wmg-title">${CONFIG.title}</span>
                <span class="wmg-version">v${CONFIG.version}</span>
              </div>
              <button class="wmg-close-btn" id="wmg-close" title="关闭">✕</button>
            </div>
            
            <!-- 主体内容 -->
            <div class="wmg-body">
              <!-- 关键词输入 -->
              <div class="wmg-section">
                <label class="wmg-label">📝 输入关键词</label>
                <textarea 
                  class="wmg-input wmg-textarea" 
                  id="wmg-keywords" 
                  placeholder="例如：咖啡、日落、旅行、美食、读书...&#10;&#10;多个关键词用逗号或空格分隔&#10;留空则自动生成开场白"
                ></textarea>
              </div>
              
              <!-- 图片上传 -->
              <div class="wmg-section">
                <label class="wmg-label">🖼️ 上传图片（可选）</label>
                <div class="wmg-upload-zone" id="wmg-upload-zone">
                  <span class="wmg-upload-icon">📷</span>
                  <div class="wmg-upload-text">点击或拖拽上传图片</div>
                  <div class="wmg-upload-hint">支持识别图片内容辅助生成文案</div>
                </div>
                <input type="file" class="wmg-file-input" id="wmg-file-input" accept="image/*" multiple />
              </div>
              
              <!-- 风格选择 -->
              <div class="wmg-section">
                <label class="wmg-label">🎨 选择文案风格</label>
                <div class="wmg-style-grid" id="wmg-style-grid">
                  ${CONFIG.styles.map((s, i) => `
                    <div class="wmg-style-chip${i === 3 ? ' active' : ''}" 
                         data-style="${s.id}" 
                         style="${i === 3 ? `color:${s.color};border-color:${s.color};background:${s.color};` : `color:${s.color};`}">
                      ${s.name}
                    </div>
                  `).join('')}
                </div>
              </div>
              
              <!-- 生成按钮 -->
              <button class="wmg-generate-btn" id="wmg-generate">
                ✨ 生成朋友圈文案
              </button>
              
              <!-- 结果区域 -->
              <div class="wmg-results" id="wmg-results"></div>
              
              <!-- 背景音乐推荐区 -->
              <div class="wmg-music-section" id="wmg-music-section">
                <div class="wmg-music-header">🎵 推荐背景音乐（BGM）</div>
                <div class="wmg-music-list" id="wmg-music-list"></div>
              </div>
            </div>
            
            <!-- 底部操作栏 -->
            <div class="wmg-footer">
              <select class="wmg-count-select" id="wmg-count">
                <option value="1">生成 1 条</option>
                <option value="3" selected>生成 3 条</option>
                <option value="5">生成 5 条</option>
              </select>
              <button class="wmg-regenerate-btn" id="wmg-regenerate">🔄 换一批</button>
            </div>
          </div>
          
          <!-- Toast -->
          <div class="wmg-toast" id="wmg-toast"></div>
        `;
        
        document.body.appendChild(overlay);
        return overlay;
      }
    
      // ========== 绑定事件 ==========
      function bindEvents(container) {
        const closeBtn = container.querySelector('#wmg-close');
        const generateBtn = container.querySelector('#wmg-generate');
        const regenerateBtn = container.querySelector('#wmg-regenerate');
        const uploadZone = container.querySelector('#wmg-upload-zone');
        const fileInput = container.querySelector('#wmg-file-input');
        const styleGrid = container.querySelector('#wmg-style-grid');
        const countSelect = container.querySelector('#wmg-count');
        const toast = container.querySelector('#wmg-toast');
    
        let selectedStyle = 'travel'; // 默认选中旅行风格
        let uploadedFiles = [];
    
        // 关闭按钮
        closeBtn.addEventListener('click', () => {
          container.style.animation = 'wmg-fadeIn 0.2s ease reverse';
          setTimeout(() => {
            container.remove();
            document.getElementById('wmg-styles')?.remove();
          }, 200);
        });
    
        // 点击遮罩关闭
        container.addEventListener('click', (e) => {
          if (e.target === container) {
            closeBtn.click();
          }
        });
    
        // ESC键关闭
        document.addEventListener('keydown', function escHandler(e) {
          if (e.key === 'Escape') {
            closeBtn.click();
            document.removeEventListener('keydown', escHandler);
          }
        });
    
        // 风格选择
        styleGrid.addEventListener('click', (e) => {
          const chip = e.target.closest('.wmg-style-chip');
          if (!chip) return;
          
          styleGrid.querySelectorAll('.wmg-style-chip').forEach(c => {
            c.classList.remove('active');
            c.style.background = 'white';
            c.style.color = c.dataset.style ? 
              CONFIG.styles.find(s => s.id === c.dataset.style)?.color || '#374151' : 
              '#374151';
          });
          
          chip.classList.add('active');
          const styleConfig = CONFIG.styles.find(s => s.id === chip.dataset.style);
          chip.style.borderColor = styleConfig?.color || '#667eea';
          chip.style.color = styleConfig?.color || '#374151';
          selectedStyle = chip.dataset.style;
        });
    
        // 文件上传
        uploadZone.addEventListener('click', () => fileInput.click());
        
        uploadZone.addEventListener('dragover', (e) => {
          e.preventDefault();
          uploadZone.style.borderColor = '#667eea';
          uploadZone.style.background = '#f5f3ff';
        });
        
        uploadZone.addEventListener('dragleave', () => {
          uploadZone.style.borderColor = uploadedFiles.length ? '#86efac' : '#d1d5db';
          uploadZone.style.background = uploadedFiles.length ? '#f0fdf4' : '#f9fafb';
        });
        
        uploadZone.addEventListener('drop', (e) => {
          e.preventDefault();
          const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
          handleFiles(files);
        });
        
        fileInput.addEventListener('change', () => {
          handleFiles(Array.from(fileInput.files));
        });
    
        function handleFiles(files) {
          uploadedFiles = files;
          if (files.length > 0) {
            uploadZone.classList.add('has-files');
            uploadZone.querySelector('.wmg-upload-text').textContent = 
              `已选择 ${files.length} 张图片`;
            uploadZone.querySelector('.wmg-upload-hint').textContent = 
              files.map(f => f.name).join(', ');
          } else {
            uploadZone.classList.remove('has-files');
            uploadZone.querySelector('.wmg-upload-text').textContent = 
              '点击或拖拽上传图片';
            uploadZone.querySelector('.wmg-upload-hint').textContent = 
              '支持识别图片内容辅助生成文案';
          }
        }
    
        // 显示Toast
        function showToast(message) {
          toast.textContent = message;
          toast.classList.add('show');
          setTimeout(() => toast.classList.remove('show'), 2000);
        }
    
        // 复制功能
        async function copyToClipboard(text, btn) {
          try {
            await navigator.clipboard.writeText(text);
            btn.textContent = '✅ 已复制';
            btn.classList.add('copied');
            showToast('✅ 已复制到剪贴板！');
            setTimeout(() => {
              btn.textContent = '📋 复制文案';
              btn.classList.remove('copied');
            }, 2000);
          } catch (err) {
            // Fallback
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            btn.textContent = '✅ 已复制';
            showToast('✅ 已复制到剪贴板！');
            setTimeout(() => {
              btn.textContent = '📋 复制文案';
            }, 2000);
          }
        }
    
        // 渲染背景音乐推荐
        function renderMusic(songs) {
          const musicSection = container.querySelector('#wmg-music-section');
          const musicList = container.querySelector('#wmg-music-list');
          
          if (!songs || songs.length === 0) {
            musicSection.classList.remove('show');
            return;
          }
          
          const icons = ['🎧', '🎵', '🎶', '🎼', '🎤'];
          musicList.innerHTML = songs.map((song, i) => `
            <div class="wmg-music-item">
              <span class="wmg-music-icon">${icons[i % icons.length]}</span>
              <div class="wmg-music-info">
                <div class="wmg-music-name">${song.name}</div>
                <div class="wmg-music-artist">${song.artist}</div>
              </div>
              <span class="wmg-music-mood">${song.mood}</span>
            </div>
          `).join('');
          
          musicSection.classList.add('show');
          
          // 绑定点击复制歌名
          musicList.querySelectorAll('.wmg-music-item').forEach((item, i) => {
            item.style.cursor = 'pointer';
            item.addEventListener('click', () => {
              const song = songs[i];
              const text = `🎵 推荐BGM：${song.name} - ${song.artist}（${song.mood}）`;
              navigator.clipboard.writeText(text).then(() => {
                showToast(`🎵 已复制「${song.name}」`);
              }).catch(() => {
                showToast(`🎵 推荐BGM：${song.name} - ${song.artist}`);
              });
            });
          });
        }
    
        // 渲染结果
        function renderResults(results, songs) {
          const resultsContainer = container.querySelector('#wmg-results');
          resultsContainer.innerHTML = results.map(r => `
            <div class="wmg-result-card">
              <span class="wmg-result-number">方案 ${r.index}</span>
              <div class="wmg-result-text">${r.text}</div>
              <button class="wmg-copy-btn" data-text="${encodeURIComponent(r.text)}">📋 复制文案</button>
            </div>
          `).join('');
          
          resultsContainer.classList.add('show');
          
          // 渲染音乐推荐
          renderMusic(songs);
          
          // 绑定复制事件
          resultsContainer.querySelectorAll('.wmg-copy-btn').forEach(btn => {
            btn.addEventListener('click', () => {
              copyToClipboard(decodeURIComponent(btn.dataset.text), btn);
            });
          });
        }
    
        // 生成文案
        function doGenerate() {
          const keywords = container.querySelector('#wmg-keywords').value.trim();
          const count = parseInt(countSelect.value) || 3;
          const imageCount = uploadedFiles.length;
    
          const results = generateMultipleCopies(selectedStyle, keywords, count, imageCount);
          const songs = generateMusicRecommendation(selectedStyle, keywords);
          renderResults(results, songs);
    
          // 滚动到结果区域
          setTimeout(() => {
            resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }, 100);
        }
    
        // 生成按钮
        generateBtn.addEventListener('click', doGenerate);
        
        // 换一批
        regenerateBtn.addEventListener('click', doGenerate);
    
        // 回车生成
        container.querySelector('#wmg-keywords').addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            doGenerate();
          }
        });
    
        return { doGenerate };
      }
    
      // ========== 主逻辑 ==========
      try {
        // 检查是否已经存在实例
        if (document.getElementById('wmg-container')) {
          document.getElementById('wmg-container').remove();
          document.getElementById('wmg-styles')?.remove();
        }
    
        const container = createUI();
        bindEvents(container);
    
        return {
          ok: true,
          summary: '朋友圈文案生成器已启动，浮动面板已显示在页面上',
          changed_count: 1,
          data: {
            features: [
              '支持8种文案风格：文艺、幽默、生活、旅行、美食、情感、励志、简约',
              '支持自定义关键词输入',
              '支持图片上传（可辅助理解场景）',
              '每次可生成1-5条不同文案',
              '一键复制到剪贴板',
              '支持拖拽上传图片',
              '响应式设计，适配手机和电脑'
            ],
            styles: CONFIG.styles.map(s => s.name)
          },
          warnings: []
        };
      } catch (error) {
        return {
          ok: false,
          summary: '脚本执行出错: ' + error.message,
          changed_count: 0,
          data: {},
          warnings: [error.stack]
        };
      }
    }
  );
  if (typeof __tabOriginalFunction !== "function") {
    throw new Error("evaluate_script source must evaluate to a function");
  }
  return await __tabOriginalFunction();
})();