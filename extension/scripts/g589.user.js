(function () {
  'use strict';

  const SCRIPT_ID = 'tabbit-poster-diy';
  const HOST_ID = `${SCRIPT_ID}-host`;
  const PAGE_STYLE_ID = `${SCRIPT_ID}-page-style`;
  const PAGE_OVERLAY_ID = `${SCRIPT_ID}-page-overlay`;
  const IMAGE_READY_ATTR = `data-${SCRIPT_ID}-ready`;
  const IMAGE_BUTTON_CLASS = `${SCRIPT_ID}-image-button`;
  const CLEANUP_KEY = '__tabbitPosterDiyCleanup';
  const STORAGE_KEY = 'tabbit:poster-diy:preferences:v1';
  const PROJECT_DB_NAME = 'tabbit-poster-diy-v13';
  const LEGACY_PROJECT_DB_NAME = 'tabbit-poster-diy';
  const PROJECT_DB_VERSION = 2;
  const PROJECT_STORE_NAME = 'projects';
  const ASSET_STORE_NAME = 'assets';
  const PROJECT_CACHE_KEY = 'current-project-v3';
  const LEGACY_PROJECT_CACHE_KEY = 'current-project-v2';
  const PROJECT_FALLBACK_KEY = 'tabbit:poster-diy:project:v3';
  const LEGACY_PROJECT_FALLBACK_KEY = 'tabbit:poster-diy:project:v2';
  const ASSET_PREVIEW_LONG_EDGE = 1024;
  const ASSET_THUMB_LONG_EDGE = 384;
  const ORIGINAL_URL_CACHE_LIMIT = 4;
  const MAX_LAYER_REVISIONS = 10;
  const DEFAULT_STYLE_PREVIEW_BASE_URL = 'https://go.tabbit.site/previews/16fd49e1-191f-413a-9d06-b9c4c2073502';
  const DEFAULT_CUTOUT_RETENTION = 70;
  const SEEDREAM_2K_SIZE_BY_ASPECT_RATIO = Object.freeze({
    '1:1': { width: 2048, height: 2048 },
    '16:9': { width: 2848, height: 1600 },
    '9:16': { width: 1600, height: 2848 },
    '4:3': { width: 2304, height: 1728 },
    '3:4': { width: 1728, height: 2304 },
    '3:2': { width: 2496, height: 1664 },
    '2:3': { width: 1664, height: 2496 },
    '21:9': { width: 3136, height: 1344 }
  });
  const SEEDREAM_ASPECT_RATIOS = Object.keys(SEEDREAM_2K_SIZE_BY_ASPECT_RATIO);
  const currentScriptSrc = document.currentScript && document.currentScript.src
    ? document.currentScript.src
    : '';

  if (typeof window[CLEANUP_KEY] === 'function') window[CLEANUP_KEY]();

  const overrides = window.__TABBIT_POSTER_DIY_CONFIG__ || {};
  const config = {
    assetBaseUrl: String(overrides.assetBaseUrl || ''),
    generationTimeoutMs: Number(overrides.generationTimeoutMs) || 180000,
    imageTaskPollIntervalMs: Math.max(50, Number(overrides.imageTaskPollIntervalMs) || 3000),
    imageTaskRequestTimeoutMs: Math.max(1000, Number(overrides.imageTaskRequestTimeoutMs) || 30000),
    chatTimeoutMs: Number(overrides.chatTimeoutMs) || 80000,
    minImageWidth: Number(overrides.minImageWidth) || 180,
    minImageHeight: Number(overrides.minImageHeight) || 120,
    templateReferences: overrides.templateReferences || {},
    fullImageTemplateReferences: overrides.fullImageTemplateReferences || {},
    debug: Boolean(overrides.debug)
  };
  const STYLE_PREVIEW_BASE_URL = String(
    overrides.stylePreviewBaseUrl || DEFAULT_STYLE_PREVIEW_BASE_URL
  ).replace(/\/$/, '');

  const OBJECT_TEMPLATES = [
    {
      id: 'healing-illustration',
      name: '疗愈手绘',
      badge: '细线 · 点绘',
      palette: ['#123f22', '#67aa62', '#c7d80a', '#f2ead1'],
      reference: `${STYLE_PREVIEW_BASE_URL}/object_01_healing_illustration.png`,
      fullImageReference: '',
      prompt: [
        'Use case: style-transfer',
        'Asset type: transparent poster object',
        'Primary request: 将用户给出的主体重绘为一个完整、独立、可用于海报拼贴的插画物体。',
        'Style/medium: refined naive hand-drawn editorial illustration；圆润有机块面、轻微点绘与细小色块、克制的纸张颗粒和极轻套色偏移。',
        'Color palette: forest green、mint、chartreuse、warm cream；三到五个低对比平涂专色，最深色使用苔绿而不是纯黑。',
        'Line treatment: 使用苔绿、灰蓝或暖灰的纤细彩色轮廓；线条轻盈、断续、略有手绘颤动，以密疏有致的小点和短线补充细节。',
        'Composition/framing: 单一主体居中，轮廓完整，四周留出充足透明边距。',
        'Negative style constraints: 禁止纯黑粗描边、漫画式勾线、马克笔粗线、厚重阴影和大面积黑色排线。',
        'Constraints: 保留主体可识别特征；不要场景、地面、投影、文字、边框或水印。'
      ].join('\n')
    },
    {
      id: 'sparse-line-art',
      name: '留白线稿',
      badge: '线描 · 专色',
      palette: ['#61bce0', '#ffca36', '#ed8eb1', '#9dcfa7'],
      reference: `${STYLE_PREVIEW_BASE_URL}/object_02_sparse_line_art.png`,
      fullImageReference: '',
      prompt: [
        'Use case: style-transfer',
        'Asset type: transparent poster object',
        'Primary request: 将用户给出的主体重绘为当代文化海报中的独立手绘线稿物体。',
        'Style/medium: sparse contemporary editorial line art；天真观察式描线、略不稳定的超细轮廓、少量点描和短排线、轻盈平涂专色、清透印刷感。',
        'Color palette: cyan blue、lemon yellow、soft pink、mint green；每个主体优先单一主色。',
        'Line treatment: 使用与主体主色同色系的细线，保持较多留白；线条宽度稳定、局部自然断开，不使用黑色外轮廓。',
        'Composition/framing: 单一主体或紧凑同类物体组，完整、不裁切、留白充足。',
        'Negative style constraints: 禁止纯黑粗描边、漫画墨线、密集交叉排线、厚重边框和高反差阴影。',
        'Constraints: 不要场景、装饰文字、阴影、渐变、写实材质或水印。'
      ].join('\n')
    },
    {
      id: 'pastel-botanical',
      name: '粉彩植物拓印',
      badge: '粉彩 · 植物线稿',
      palette: ['#b9edf0', '#a9dda8', '#efc6d8', '#fffdf5'],
      reference: `${STYLE_PREVIEW_BASE_URL}/object_03_pastel_botanical.png`,
      fullImageReference: '',
      prompt: [
        'Use case: style-transfer',
        'Asset type: transparent poster object',
        'Primary request: 将用户给出的主体重绘为梦幻粉彩植物海报中的独立图形。',
        'Style/medium: pastel risograph botanical line art；细碎点绘与不规则彩色细轮廓、手工拓印般纹理、轻微套色偏移、纸张颗粒、局部留白剪影。',
        'Color palette: pale cyan、mint green、dusty pink、warm white、desaturated moss or slate-blue contour；禁止纯黑。',
        'Line treatment: 用灰绿、雾蓝或浅棕的发丝级细线勾勒结构，叶脉与纹理以小点、短线和微小色块表现，层次柔和通透。',
        'Composition/framing: 主体可与一小段植物枝叶形成一个整体，居中、完整、不裁切。',
        'Negative style constraints: 禁止粗黑外轮廓、漫画勾线、厚重阴影、密集黑色排线和高反差硬边。',
        'Constraints: 不要完整环境、地平线、文本、边框、投影或水印。'
      ].join('\n')
    },
    {
      id: 'experimental-collage',
      name: '实验拼贴',
      badge: '轻拼贴 · 彩色细线',
      palette: ['#dce5c8', '#9bbbe0', '#d5a9e5', '#59677a'],
      reference: `${STYLE_PREVIEW_BASE_URL}/object_04_experimental_collage.png`,
      fullImageReference: '',
      prompt: [
        'Use case: style-transfer',
        'Asset type: transparent poster collage object',
        'Primary request: 将用户给出的主体转化为一个完整、独立的实验编辑拼贴图形。',
        'Style/medium: delicate Southeast Asian editorial collage；轻薄剪纸边缘、纤细断续彩色线、克制的丝网印刷错版、少量几何切分与细腻磨损颗粒。',
        'Color palette: pale sage、powder blue、soft lilac、slate blue、warm off-white；最深色使用低饱和灰蓝而不是纯黑。',
        'Line treatment: 轮廓以灰蓝、灰紫或深苔绿细线表现，粗细轻微变化但整体纤细；磨损只作为局部微小颗粒，不形成厚重黑边。',
        'Composition/framing: 紧凑徽章式构图，允许两到三个相关形状叠加，但整体轮廓清晰、四周留白。',
        'Negative style constraints: 禁止纯黑粗描边、粗糙漫画墨线、厚重剪纸黑边、大面积暗部和密集交叉排线。',
        'Constraints: 不要复刻参考图布局；不要文字、场景背景、投影、照片写实感或水印。'
      ].join('\n')
    },
    {
      id: 'folk-banquet-silhouette',
      name: '民俗宴席剪影',
      badge: '民俗 · 丝网撞色',
      palette: ['#ef171d', '#ec2bb8', '#171514', '#d6bd89'],
      reference: `${STYLE_PREVIEW_BASE_URL}/object_05_folk_banquet_silhouette.png`,
      prompt: [
        'Use case: style-transfer',
        'Asset type: transparent poster object',
        'Primary request: 将用户给出的主体重绘为浓烈中式民俗宴席海报中的独立扁平剪影图形。',
        'Style/medium: 复古丝网印刷与老版画油墨叠印；纯色平涂、无渐变、无写实光影，色块边缘带轻微粗糙噪点和套色偏移。',
        'Color palette: 正大红、玫粉或洋红、纯黑，少量米白与极小面积朱红印章色；透明主体模式不要生成牛皮纸背景。',
        'Shape language: 大轮廓块面化剪影，舍去细微纹理，只用纯色大块面塑造形体；红与粉的重叠处保留清晰叠色层次。',
        'Composition/framing: 单一主体或紧凑的相关物体组合，轮廓完整、四周留出透明边距。',
        'Constraints: 只迁移民俗喜庆、传统宴席烟火气与印刷语言；不要照抄参考图中的手、宴席图形、文字、印章内容或版式；不要投影、渐变、水印。'
      ].join('\n')
    },
    {
      id: 'macaron-geometric',
      name: '马卡龙几何',
      badge: '极简 · 细红描边',
      palette: ['#bcefd7', '#f5a36d', '#f51e2d', '#fff8dc'],
      reference: `${STYLE_PREVIEW_BASE_URL}/object_06_macaron_geometric.png`,
      prompt: [
        'Use case: style-transfer',
        'Asset type: transparent poster object',
        'Primary request: 将用户给出的主体高度抽象成现代、清爽的极简马卡龙几何图形；只保留外轮廓和最低限度的识别特征，不要逐项描摹照片细节。',
        'Style/medium: ultra-minimal flat editorial vector illustration；整件物体最多由三到五个干净的大色块构成，无笔触、无渐变、无纹理、无写实光影。',
        'Color palette: 高明度、高纯度的薄荷绿、鲜暖橙、正红、奶油黄与少量清晰深棕；颜色要明快饱和、对比清爽，禁止灰脏、发闷、低饱和或大面积土棕色。',
        'Shape language: 先提取一个极简外轮廓，再用最多二到四个内部几何块面和一到三个微小识别标记概括主体；删除表面纹理、接缝、褶皱、毛发、按钮、文字、重复图案和透视小结构。不要沿着照片中每条边缘描线。',
        'Line treatment: 只使用极细、均匀、克制的红色发丝轮廓；内部结构优先用色块分界，不使用重复描边、双重轮廓或粗重勾线。',
        'Negative style constraints: 禁止粗描边、低饱和脏色、写实描摹、复杂内部线稿、装饰性细节、3D 体积、高光、渐变、阴影和纸张纹理；结果必须简洁、现代、像几何标志而不是卡通照片临摹。',
        'Composition/framing: 单一主体完整、简洁、居中，保持大轮廓易识别，四周透明留白。',
        'Constraints: 只迁移极简几何概括、明快马卡龙配色和极细红线；不要复制参考图中的咖啡、餐盘、食物、文字或版式；不要背景或水印。'
      ].join('\n')
    },
    {
      id: 'kraft-riso-produce',
      name: '牛皮纸果蔬',
      badge: 'Riso · 高饱和块面',
      palette: ['#ef201e', '#0a6235', '#fff000', '#2ab8e6'],
      reference: `${STYLE_PREVIEW_BASE_URL}/object_07_kraft_riso_produce.png`,
      prompt: [
        'Use case: style-transfer',
        'Asset type: transparent poster object',
        'Primary request: 将用户给出的主体重绘为高饱和、低多边形的 Riso 块面图标；用折线外轮廓和少量切面完成高度抽象。',
        'Style/medium: low-poly cut-paper Riso graphic；纯平涂、硬边色块、轻微孔版套色质感，无渐变、无写实光影，印刷颗粒只能极少量出现在主体内部。',
        'Color palette: 正大红、深墨绿、亮荧光柠檬黄、鲜橙与清爽亮蓝；色彩必须高饱和、强对比、干净醒目，透明主体模式不要生成牛皮纸卡其底色。',
        'Shape language: 主体只由五到十二个大多边形块面构成；外边缘必须由明显的短直线、折线、斜切角和不对称棱角组成。圆形物体也要转译成不规则多边形，禁止圆润气泡形、连续柔滑曲线和写实小结构。',
        'Line treatment: 以相邻色块和多边形切面塑造结构，默认不加外描边；如确需分隔，只允许与块面同色系的极细短线，禁止黑色粗轮廓。',
        'Negative style constraints: 禁止圆角化、软萌圆润造型、平滑弧线、粗描边、复杂内部细节、写实纹理、体积光影、3D 渐变和低饱和脏色；结果应像现代多边形图标或硬边剪纸。',
        'Composition/framing: 单一主体或紧凑同类组合，轮廓硬朗清晰、不裁切，四周透明留白。',
        'Constraints: 只迁移 Riso 高饱和撞色、折线轮廓和多边形块面语言；不要复制参考图中的番茄、藤蔓、水滴、文字、数字或版式；不要背景、阴影或水印。'
      ].join('\n')
    },
    {
      id: 'retro-market-halftone',
      name: '复古市集网点',
      badge: '市集 · 半色调块面',
      palette: ['#2576d6', '#ee3025', '#f18532', '#24a855'],
      reference: `${STYLE_PREVIEW_BASE_URL}/object_08_retro_market_halftone.png`,
      prompt: [
        'Use case: style-transfer',
        'Asset type: transparent poster object',
        'Primary request: 将用户给出的主体重绘为明快活泼的复古市集扁平插画。',
        'Style/medium: 高饱和马卡龙复古撞色；平涂色块叠加半色调网点印刷肌理，无柔和渐变，色块分界清晰硬朗。',
        'Color palette: 宝蓝、亮红、橙、鲜绿、浅灰，少量黑色轮廓；透明主体模式不要生成浅灰白底。',
        'Shape language: 物体概括成饱满、柔和的圆角几何块面，舍弃写实纹理、光影和透视，不使用尖锐棱角。',
        'Composition/framing: 一个完整主体或紧凑的市集陈列组合，外轮廓圆润清晰、四周透明留白。',
        'Constraints: 只迁移圆润块面、活泼撞色与网点印刷语言；不要复制参考图中的蔬果篮、兔子、文字、条纹底座或版式；不要背景、阴影、渐变或水印。'
      ].join('\n')
    },
    {
      id: 'artistic-editorial-illustration',
      name: '文艺风插画',
      badge: '版画 · 文艺配色',
      palette: ['#0d5b35', '#c4d907', '#a9d9cc', '#f2eddc'],
      reference: `${STYLE_PREVIEW_BASE_URL}/object_09_artistic_editorial_01_lime_tree.png`,
      references: [
        {
          id: 'lime-tree',
          label: '绿荫版画',
          reference: `${STYLE_PREVIEW_BASE_URL}/object_09_artistic_editorial_01_lime_tree.png`,
          thumbnail: `${STYLE_PREVIEW_BASE_URL}/object_09_artistic_editorial_01_lime_tree_thumb.webp`
        },
        {
          id: 'mint-tree-bird',
          label: '薄荷线描',
          reference: `${STYLE_PREVIEW_BASE_URL}/object_09_artistic_editorial_02_mint_tree_bird.png`,
          thumbnail: `${STYLE_PREVIEW_BASE_URL}/object_09_artistic_editorial_02_mint_tree_bird_thumb.webp`
        },
        {
          id: 'pastel-tree',
          label: '粉彩树影',
          reference: `${STYLE_PREVIEW_BASE_URL}/object_09_artistic_editorial_03_pastel_tree.png`,
          thumbnail: `${STYLE_PREVIEW_BASE_URL}/object_09_artistic_editorial_03_pastel_tree_thumb.webp`
        }
      ],
      prompt: [
        'Use case: style-transfer',
        'Asset type: transparent poster object',
        'Primary request: 将用户给出的主体重绘为具有文艺出版物气质的独立插画物体。',
        'Style/medium: literary editorial print illustration；融合细线蚀刻、植物版画、平涂专色和轻微丝网印刷颗粒，画面安静、克制、富有手工印刷感。',
        'Color palette: forest green、lime yellow-green、pale mint、powder blue、warm cream；以三到五个低对比专色形成清新复古配色。',
        'Shape language: 保留主体自然结构，以舒展的有机曲线和概括块面组织形体；细节丰富但不写实堆砌。',
        'Line treatment: 使用深绿、灰绿或深灰紫的手绘细线与短排线，线条允许轻微断续、套色偏移和纸张颗粒。',
        'Negative style constraints: 禁止照片写实、3D 渲染、塑料高光、机械矢量线、霓虹渐变和漫画式粗黑描边。',
        'Composition/framing: 主体完整、居中或略带自然生长方向，四周保留透明边距。',
        'Constraints: 参考图只提供画材、线条、配色与印刷质感；不要复制其中的树木、鸟或原构图；不要文字、边框、场景背景、投影或水印。'
      ].join('\n')
    },
    {
      id: 'blue-dreamcore',
      name: '蓝色梦核',
      badge: '柔光 · 清透蓝',
      palette: ['#bfeeff', '#83bdf3', '#2f65a9', '#fffdf4'],
      reference: `${STYLE_PREVIEW_BASE_URL}/object_10_blue_dreamcore_01_star_wind_chime.png`,
      references: [
        {
          id: 'star-wind-chime',
          label: '星夜风铃',
          reference: `${STYLE_PREVIEW_BASE_URL}/object_10_blue_dreamcore_01_star_wind_chime.png`,
          thumbnail: `${STYLE_PREVIEW_BASE_URL}/object_10_blue_dreamcore_01_star_wind_chime_thumb.webp`
        },
        {
          id: 'ice-fish-poster',
          label: '冰湖游鱼',
          reference: `${STYLE_PREVIEW_BASE_URL}/object_10_blue_dreamcore_02_ice_fish_poster.png`,
          thumbnail: `${STYLE_PREVIEW_BASE_URL}/object_10_blue_dreamcore_02_ice_fish_poster_thumb.webp`
        },
        {
          id: 'star-fountain',
          label: '星光喷泉',
          reference: `${STYLE_PREVIEW_BASE_URL}/object_10_blue_dreamcore_03_star_fountain.png`,
          thumbnail: `${STYLE_PREVIEW_BASE_URL}/object_10_blue_dreamcore_03_star_fountain_thumb.webp`
        },
        {
          id: 'blue-fireworks',
          label: '蓝白烟火',
          reference: `${STYLE_PREVIEW_BASE_URL}/object_10_blue_dreamcore_04_blue_fireworks.png`,
          thumbnail: `${STYLE_PREVIEW_BASE_URL}/object_10_blue_dreamcore_04_blue_fireworks_thumb.webp`
        },
        {
          id: 'night-water-cat',
          label: '暗夜水流',
          reference: `${STYLE_PREVIEW_BASE_URL}/object_10_blue_dreamcore_05_night_water_cat.png`,
          thumbnail: `${STYLE_PREVIEW_BASE_URL}/object_10_blue_dreamcore_05_night_water_cat_thumb.webp`
        },
        {
          id: 'pastel-goldfish',
          label: '粉彩金鱼',
          reference: `${STYLE_PREVIEW_BASE_URL}/object_10_blue_dreamcore_06_pastel_goldfish.png`,
          thumbnail: `${STYLE_PREVIEW_BASE_URL}/object_10_blue_dreamcore_06_pastel_goldfish_thumb.webp`
        }
      ],
      prompt: [
        'Use case: style-transfer',
        'Asset type: transparent dreamcore poster object',
        'Primary request: 将用户给出的主体转化为清透、朦胧、带童年梦境感的蓝色梦核插画。',
        'Style/medium: soft-focus blue dreamcore illustration；柔雾渐变晕染、发光光晕、星光碎闪、轻微颗粒噪点与彩铅纸纹，整体清冷治愈。',
        'Color palette: 浅天蓝、雾霾蓝、深海藏蓝、冰蓝为主，搭配柔白、淡粉、浅黄绿和浅紫作小面积点缀；整体低饱和清透冷调。',
        'Shape language: 几乎无硬朗轮廓，物体靠柔和色彩渐变、半透明叠色和发光边缘区分形体；星星、鱼、丝带、水流等装饰保持圆润轻盈。',
        'Line treatment: 不使用硬黑勾线；边缘虚化朦胧，局部以白色或冰蓝柔光描出轮廓，避免生硬平涂边界。',
        'Negative style constraints: 禁止粗黑描边、赛博朋克霓虹、强烈高饱和电光、硬边矢量块、写实摄影和锐利金属质感。',
        'Composition/framing: 主体完整，允许紧贴主体的小范围柔光和星点，但四周仍保留可抠图边距。',
        'Constraints: 参考图只用于蓝色梦核的配色、柔光和肌理；不要复制其中的鱼、风铃、喷泉、烟火、猫、文字或版式；不要水印。'
      ].join('\n')
    },
    {
      id: 'green-dreamcore',
      name: '绿色梦核',
      badge: '柔雾 · 森系荧光',
      palette: ['#c7f56a', '#5bcf70', '#0f5f42', '#fff2b8'],
      reference: `${STYLE_PREVIEW_BASE_URL}/object_11_green_dreamcore_01_glowing_willow.png`,
      references: [
        {
          id: 'glowing-willow',
          label: '荧光柳树',
          reference: `${STYLE_PREVIEW_BASE_URL}/object_11_green_dreamcore_01_glowing_willow.png`,
          thumbnail: `${STYLE_PREVIEW_BASE_URL}/object_11_green_dreamcore_01_glowing_willow_thumb.webp`
        },
        {
          id: 'candle-cats',
          label: '梦幻烛台',
          reference: `${STYLE_PREVIEW_BASE_URL}/object_11_green_dreamcore_02_candle_cats.png`,
          thumbnail: `${STYLE_PREVIEW_BASE_URL}/object_11_green_dreamcore_02_candle_cats_thumb.webp`
        },
        {
          id: 'forest-fishbowl',
          label: '森林鱼缸',
          reference: `${STYLE_PREVIEW_BASE_URL}/object_11_green_dreamcore_03_forest_fishbowl.png`,
          thumbnail: `${STYLE_PREVIEW_BASE_URL}/object_11_green_dreamcore_03_forest_fishbowl_thumb.webp`
        },
        {
          id: 'sunlit-window',
          label: '日光森林',
          reference: `${STYLE_PREVIEW_BASE_URL}/object_11_green_dreamcore_04_sunlit_window.png`,
          thumbnail: `${STYLE_PREVIEW_BASE_URL}/object_11_green_dreamcore_04_sunlit_window_thumb.webp`
        }
      ],
      prompt: [
        'Use case: style-transfer',
        'Asset type: transparent dreamcore poster object',
        'Primary request: 将用户给出的主体转化为柔雾、发光、充满自然治愈感的绿色梦核插画。',
        'Style/medium: green dreamcore soft illustration；柔雾晕染、暖色发光光晕、星光碎闪、颗粒纸纹和轻微朦胧光斑。',
        'Color palette: 清新草绿、森系深绿、荧光嫩绿、柔雾浅绿为核心，搭配暖黄柔光、奶白和柔粉点缀；低饱和渐变配色，冷暖柔和过渡。',
        'Shape language: 景物与动物做写意圆润简化，飞鸟、金鱼、猫咪和植物都使用松散飘逸的曲线，没有尖锐棱角。',
        'Line treatment: 无黑色硬勾线；全部依靠色彩明暗、柔光边缘和毛茸茸的虚化质感区分轮廓。',
        'Negative style constraints: 禁止生硬色块边界、纯黑粗线、锐利棱角、强对比硬阴影、塑料 3D 渲染和冷硬科技霓虹。',
        'Composition/framing: 主体完整，光晕和粒子控制在主体附近，保留充足透明边距。',
        'Constraints: 参考图只用于绿色层次、柔光、纸纹和治愈氛围；不要复制其中的树、烛台、猫、鱼缸、飞鸟或窗景；不要文字、边框或水印。'
      ].join('\n')
    },
    {
      id: 'relaxed-hand-drawn',
      name: '手绘风',
      badge: '粗线 · 松弛涂鸦',
      palette: ['#171513', '#f7f1df', '#ff9d17', '#5ea64b'],
      reference: `${STYLE_PREVIEW_BASE_URL}/object_12_relaxed_hand_drawn_01_kraft_dogs.png`,
      references: [
        {
          id: 'kraft-dogs',
          label: '牛皮纸小狗',
          reference: `${STYLE_PREVIEW_BASE_URL}/object_12_relaxed_hand_drawn_01_kraft_dogs.png`,
          thumbnail: `${STYLE_PREVIEW_BASE_URL}/object_12_relaxed_hand_drawn_01_kraft_dogs_thumb.webp`
        },
        {
          id: 'sheep-collage',
          label: '小羊拼贴',
          reference: `${STYLE_PREVIEW_BASE_URL}/object_12_relaxed_hand_drawn_02_sheep_collage.png`,
          thumbnail: `${STYLE_PREVIEW_BASE_URL}/object_12_relaxed_hand_drawn_02_sheep_collage_thumb.webp`
        },
        {
          id: 'sheep-sticker',
          label: '小羊贴纸',
          reference: `${STYLE_PREVIEW_BASE_URL}/object_12_relaxed_hand_drawn_03_sheep_sticker.png`,
          thumbnail: `${STYLE_PREVIEW_BASE_URL}/object_12_relaxed_hand_drawn_03_sheep_sticker_thumb.webp`
        },
        {
          id: 'orange-bar',
          label: '橙色酒吧',
          reference: `${STYLE_PREVIEW_BASE_URL}/object_12_relaxed_hand_drawn_04_orange_bar.png`,
          thumbnail: `${STYLE_PREVIEW_BASE_URL}/object_12_relaxed_hand_drawn_04_orange_bar_thumb.webp`
        },
        {
          id: 'bakery-doodle',
          label: '面包涂鸦',
          reference: `${STYLE_PREVIEW_BASE_URL}/object_12_relaxed_hand_drawn_05_bakery_doodle.png`,
          thumbnail: `${STYLE_PREVIEW_BASE_URL}/object_12_relaxed_hand_drawn_05_bakery_doodle_thumb.webp`
        }
      ],
      prompt: [
        'Use case: style-transfer',
        'Asset type: transparent poster object',
        'Primary request: 将用户给出的主体重绘为韩系松弛感手绘涂鸦扁平插画。',
        'Style/medium: relaxed Korean hand-drawn doodle flat illustration；粗黑手绘轮廓、平涂色块、蜡笔或马克笔般的自然涂鸦质感。',
        'Color palette: 主体大面积暖白或米白，搭配黑色块面；只在局部使用橙、绿、蓝或其他一到两种亮色点缀。',
        'Shape language: 高度卡通 Q 版简化，圆点小眼和寥寥几笔表情，四肢与体态夸张松弛；用圆润块面塑造软萌感，动作生活化且有故事性。',
        'Line treatment: 随性粗黑手绘轮廓线，略带松弛抖动和粗细变化，不是机械矢量直线；轮廓圆润，无尖锐棱角。',
        'Negative style constraints: 禁止写实人体或动物结构、精细光影、3D 塑料质感、机械矢量线、复杂渐变和过度精修。',
        'Composition/framing: 单一主体或紧凑动作组合，轮廓完整，可添加白色贴纸外描边，四周留出透明边距。',
        'Constraints: 参考图只用于线条、Q 版造型和松弛气质；不要复制其中的小狗、小羊、面包、啤酒、文字或海报版式；不要背景或水印。'
      ].join('\n')
    },
    {
      id: 'xiaohongshu-editorial',
      name: '小红书风',
      badge: '活动海报 · 童趣涂鸦',
      palette: ['#f8f3df', '#8fc2f4', '#68aa43', '#f4a6b8'],
      reference: `${STYLE_PREVIEW_BASE_URL}/object_13_xiaohongshu_editorial_01_cloud_festival.png`,
      references: [
        {
          id: 'cloud-festival',
          label: '云朵发呆',
          reference: `${STYLE_PREVIEW_BASE_URL}/object_13_xiaohongshu_editorial_01_cloud_festival.png`,
          thumbnail: `${STYLE_PREVIEW_BASE_URL}/object_13_xiaohongshu_editorial_01_cloud_festival_thumb.webp`
        },
        {
          id: 'spring-walk',
          label: '春日漫游',
          reference: `${STYLE_PREVIEW_BASE_URL}/object_13_xiaohongshu_editorial_02_spring_walk.png`,
          thumbnail: `${STYLE_PREVIEW_BASE_URL}/object_13_xiaohongshu_editorial_02_spring_walk_thumb.webp`
        }
      ],
      prompt: [
        'Use case: style-transfer',
        'Asset type: transparent poster object',
        'Primary request: 将用户给出的主体重绘为适合生活方式活动海报的小红书童趣手绘插画。',
        'Style/medium: playful Xiaohongshu editorial doodle illustration；手绘粗细线、扁平平涂、少量波点或条纹纹样、纸张颗粒和轻松的活动视觉气质。',
        'Color palette: 奶油米白为基底感，搭配浅天蓝、草绿、柔粉、柠檬黄和少量黑色；明快但不过度饱和。',
        'Shape language: 人物、动物和日常物件采用圆润夸张的童趣造型，允许有趣叠放、环抱和松散组合，保留手绘不规则感。',
        'Line treatment: 黑色或深棕手绘轮廓略有抖动，粗细自然；内部以简洁色块、波点、条纹和短线补充层次。',
        'Negative style constraints: 禁止写实摄影、精致商业 3D、厚重阴影、金属玻璃质感、复杂透视和完全规整的矢量图标。',
        'Composition/framing: 主体完整，可形成紧凑的趣味群像或生活物件组合，四周保留透明边距。',
        'Constraints: 参考图只用于童趣造型、配色和活动海报气质；不要复制其中的人物、猫、兔子、自行车、中文标题、日期、Logo 或原版式；不要水印。'
      ].join('\n')
    }
  ];

  const TEXT_TEMPLATES = [
    {
      id: 'spring-breeze',
      name: '荧光春风字',
      badge: '超细甩笔 · 荧光黄绿',
      palette: ['#e7ff67', '#8abf7a', '#286c44'],
      reference: `${STYLE_PREVIEW_BASE_URL}/text_01_spring_breeze.png`,
      prompt: [
        'Use case: stylized-concept',
        'Asset type: transparent artistic typography',
        'Typography: 超细中文单线展示字，字身高挑疏朗，横竖笔画不规则拉长，首尾加入长弧形甩笔；少量四瓣星花点缀。',
        'Color palette: luminous acid yellow-green only。',
        'Layout: 默认横向大标题；排版要求可以指定竖排、错位、环绕或更大的字距。',
        'Text accuracy: 逐字准确，只出现一次，不增加其他文字。',
        'Constraints: 不要背景纹理、阴影、发光、边框或水印。'
      ].join('\n')
    },
    {
      id: 'sunset-announcer',
      name: '日落播报字',
      badge: '窄体中文 · 手写穿插',
      palette: ['#fff8f0', '#ff633d', '#1a1a18'],
      reference: `${STYLE_PREVIEW_BASE_URL}/text_02_sunset_announcer.png`,
      prompt: [
        'Use case: stylized-concept',
        'Asset type: transparent artistic typography',
        'Typography: 超大白色窄体几何中文，纵向比例明显拉长；可以用一行珊瑚橙色细手写拉丁字横穿主标题，形成编辑设计层次。',
        'Color palette: warm white Chinese glyphs；coral orange accent script。',
        'Layout: 默认紧凑错层竖排；排版要求可指定横排、交叠、倾斜或字级。',
        'Text accuracy: 用户正文逐字准确且只出现一次；未提供英文时不擅自添加英文。',
        'Constraints: 不要照片背景、小字说明、阴影、边框或水印。'
      ].join('\n')
    },
    {
      id: 'new-chinese-condensed',
      name: '新中式窄长字',
      badge: '极窄字形 · 新中式',
      palette: ['#42679b', '#dce9f8', '#a7bdd8'],
      reference: `${STYLE_PREVIEW_BASE_URL}/text_03_new_chinese_condensed.png`,
      prompt: [
        'Use case: stylized-concept',
        'Asset type: transparent artistic typography',
        'Typography: 极窄、极高的中文几何单线字；字形比例不规则拉伸，局部笔画穿插或错位，节奏克制但具有当代字体练习感。',
        'Color palette: muted cobalt blue only。',
        'Layout: 默认两列或二乘二字阵；排版要求可指定单列、满版、疏密变化与阅读顺序。',
        'Text accuracy: 逐字准确，只出现一次，不加入数字、英文或网格。',
        'Constraints: 不要背景、注释小字、阴影、描边装饰或水印。'
      ].join('\n')
    },
    {
      id: 'market-outline-type',
      name: '菜市场描边字',
      badge: '粗黑字 · 橙色套印',
      palette: ['#181512', '#f06b27', '#d5a9e5', '#2ca858'],
      reference: `${STYLE_PREVIEW_BASE_URL}/text_04_market_outline.png`,
      prompt: [
        'Use case: stylized-concept',
        'Asset type: transparent artistic typography',
        'Typography: 粗重黑色中文展示字，笔画厚实、紧凑、略带手工招牌字的不规则感；外包一圈宽厚亮橙描边，并保留轻微红橙套色偏移和粗颗粒半色调网点。',
        'Color palette: solid black glyphs、vivid orange outer stroke；可用极少量淡紫或鲜绿作局部小面积套印点缀。',
        'Layout: 默认紧凑横排大标题；排版要求可指定两行错位、轻微倾斜、字间咬合或竖排，必须保持每个字完整可读。',
        'Text accuracy: 严格绘制用户输入文字，逐字准确，只出现一次；“菜市场”只是风格名称，不是固定生成内容。',
        'Constraints: 参考图仅用于字体笔画、描边和网点印刷风格；不要复制参考图中的 Market、Vegetable、英文段落、蔬果、兔子、标签或原版式；不要背景、阴影、边框或水印。'
      ].join('\n')
    },
    {
      id: 'archaic-lishu',
      name: '古拙隶书',
      badge: '隶书 · 蚕头燕尾',
      palette: ['#11110f', '#f7f5ef', '#8c1d18'],
      reference: `${STYLE_PREVIEW_BASE_URL}/text_05_lishu_01_zaixiji.png`,
      references: [
        {
          id: 'zaixiji',
          label: '稚拙碑刻',
          reference: `${STYLE_PREVIEW_BASE_URL}/text_05_lishu_01_zaixiji.png`,
          thumbnail: `${STYLE_PREVIEW_BASE_URL}/text_05_lishu_01_zaixiji_thumb.jpg`
        },
        {
          id: 'sumikura',
          label: '秀逸隶意',
          reference: `${STYLE_PREVIEW_BASE_URL}/text_05_lishu_02_sumikura.jpg`,
          thumbnail: `${STYLE_PREVIEW_BASE_URL}/text_05_lishu_02_sumikura_thumb.jpg`
        }
      ],
      prompt: [
        'Use case: stylized-concept',
        'Asset type: transparent artistic typography',
        'Typography: 当代设计化隶书；横势舒展、字形略扁，保留蚕头燕尾、波磔和碑刻般古拙结构。笔画可有轻微手写抖动，但每个字必须清楚可辨。',
        'Ink treatment: 单色浓墨或近黑实色，边缘带少量自然毛边与墨色缺口；不要做成规则电脑宋体，也不要过度狂草化。',
        'Layout: 默认横排或疏朗竖排；排版要求可指定印章式组合、大小错落或更宽字距。',
        'Text accuracy: 严格逐字准确，只生成用户输入文字一次；参考图中的原字、拉丁字母和印章不得出现在结果中。',
        'Constraints: 只迁移隶书骨架、波磔和墨迹质感；不要背景、英文副标题、印章、边框、阴影或水印。'
      ].join('\n')
    },
    {
      id: 'freehand-notes',
      name: '自由手写字',
      badge: '手写 · 随性笔触',
      palette: ['#151513', '#fffdf5', '#f5efdf'],
      reference: `${STYLE_PREVIEW_BASE_URL}/text_06_handwritten_01_childlike_cutout.png`,
      references: [
        {
          id: 'childlike-notes',
          label: '童稚笔记',
          reference: `${STYLE_PREVIEW_BASE_URL}/text_06_handwritten_01_childlike_cutout.png`,
          thumbnail: `${STYLE_PREVIEW_BASE_URL}/text_06_handwritten_01_childlike_cutout_thumb.png`
        },
        {
          id: 'wandering-stroke',
          label: '漫游甩笔',
          reference: `${STYLE_PREVIEW_BASE_URL}/text_06_handwritten_02_wandering_cutout.png`,
          thumbnail: `${STYLE_PREVIEW_BASE_URL}/text_06_handwritten_02_wandering_cutout_thumb.png`
        },
        {
          id: 'clumsy-love',
          label: '松弛细写',
          reference: `${STYLE_PREVIEW_BASE_URL}/text_06_handwritten_03_clumsy_love_cutout.png`,
          thumbnail: `${STYLE_PREVIEW_BASE_URL}/text_06_handwritten_03_clumsy_love_cutout_thumb.png`
        },
        {
          id: 'blue-gate',
          label: '粉笔粗写',
          reference: `${STYLE_PREVIEW_BASE_URL}/text_06_handwritten_04_blue_gate_cutout.png`,
          thumbnail: `${STYLE_PREVIEW_BASE_URL}/text_06_handwritten_04_blue_gate_cutout_thumb.png`
        }
      ],
      prompt: [
        'Use case: stylized-concept',
        'Asset type: transparent artistic typography',
        'Typography: 自然随手写下的中文标题，保留真实人手速度、轻微歪斜、不齐基线、忽粗忽细和偶发长甩笔；整体亲切、有呼吸感，不像标准字库。',
        'Stroke treatment: 根据所选参考图在细签字笔、粉笔粗写或干刷之间取样；保持单色高对比笔迹，允许少量笔触断裂，但不得损害字形辨识。',
        'Layout: 默认自由横排，可按要求做错位两行或竖写；只保留构成每个字的笔画，不生成独立于字形的长横线、箭头、对话框或装饰符号。',
        'Text accuracy: 用户输入逐字准确，只出现一次；不得复制参考图中的英文、人物、插画、日期或其他说明文字。',
        'Constraints: 前景中的每一个非背景像素都必须属于用户所输入文字的字形笔画；不要纸张、照片、场景、对话框、笔、鸟、雨滴、装饰插画、英文小字、署名、阴影、边框或水印。'
      ].join('\n')
    },
    {
      id: 'modern-ligature',
      name: '现代连笔字',
      badge: '现代 · 连笔重构',
      palette: ['#111111', '#f4a7cf', '#ffffff'],
      reference: `${STYLE_PREVIEW_BASE_URL}/text_07_modern_ligature_01_diary.jpg`,
      references: [
        {
          id: 'diary-brush',
          label: '粉色连笔',
          reference: `${STYLE_PREVIEW_BASE_URL}/text_07_modern_ligature_01_diary.jpg`,
          thumbnail: `${STYLE_PREVIEW_BASE_URL}/text_07_modern_ligature_01_diary_thumb.jpg`
        },
        {
          id: 'xi-ya',
          label: '极简穿插',
          reference: `${STYLE_PREVIEW_BASE_URL}/text_07_modern_ligature_02_xiya.png`,
          thumbnail: `${STYLE_PREVIEW_BASE_URL}/text_07_modern_ligature_02_xiya_thumb.jpg`
        },
        {
          id: 'youran',
          label: '圆角连结',
          reference: `${STYLE_PREVIEW_BASE_URL}/text_07_modern_ligature_03_youran.png`,
          thumbnail: `${STYLE_PREVIEW_BASE_URL}/text_07_modern_ligature_03_youran_thumb.jpg`
        },
        {
          id: 'streamwest',
          label: '几何共笔',
          reference: `${STYLE_PREVIEW_BASE_URL}/text_07_modern_ligature_04_streamwest.png`,
          thumbnail: `${STYLE_PREVIEW_BASE_URL}/text_07_modern_ligature_04_streamwest_thumb.jpg`
        }
      ],
      prompt: [
        'Use case: stylized-concept',
        'Asset type: transparent artistic typography',
        'Typography: 现代中文展示字，将相邻字的横、竖、撇捺或收笔有意识地连接、共享、穿插和延伸，形成一体化 Logo 感；允许局部几何切分与尺度反差。',
        'Shape language: 保持每个字核心结构可识别，再用少量连笔、共笔、错位和长线建立节奏；禁止为了造型把字拆到不可读。',
        'Stroke treatment: 可按参考选择粗刷、圆角黑体或硬边几何笔画；单色为主，色块干净，无立体高光。',
        'Layout: 默认紧凑横排，也可按要求做竖排、上下咬合或字间穿插；连笔必须服务于整体阅读顺序。',
        'Text accuracy: 严格逐字准确，只出现一次；不得复制参考图原文、英文副标题、线稿装饰或背景。',
        'Constraints: 不要照片、场景、额外英文、阴影、3D、边框或水印。'
      ].join('\n')
    },
    {
      id: 'display-kaiti',
      name: '新锐楷体字',
      badge: '楷体 · 刀刻转折',
      palette: ['#ffffff', '#1e1e1e', '#8d1212'],
      reference: `${STYLE_PREVIEW_BASE_URL}/text_08_kaiti_01_zhini.png`,
      references: [
        {
          id: 'angular-kaiti',
          label: '锐角楷意',
          reference: `${STYLE_PREVIEW_BASE_URL}/text_08_kaiti_01_zhini.png`,
          thumbnail: `${STYLE_PREVIEW_BASE_URL}/text_08_kaiti_01_zhini_thumb.jpg`
        },
        {
          id: 'dragon-kaiti',
          label: '厚重馆阁',
          reference: `${STYLE_PREVIEW_BASE_URL}/text_08_kaiti_02_dragon_noodles.png`,
          thumbnail: `${STYLE_PREVIEW_BASE_URL}/text_08_kaiti_02_dragon_noodles_thumb.jpg`
        }
      ],
      prompt: [
        'Use case: stylized-concept',
        'Asset type: transparent artistic typography',
        'Typography: 以楷体端正骨架为基础的标题字；横竖撇捺交代完整，重心稳定、字面饱满，并加入刀刻般锐角、夸张顿笔和现代招牌字的块面处理。',
        'Stroke treatment: 笔画厚实、起收明确、转折利落；可在锐薄切角与厚重馆阁笔势之间按参考图取样，保持纯色高对比。',
        'Layout: 默认横排大标题，可按要求竖排或两行居中；每个字保持完整，不使用连笔破坏楷体结构。',
        'Text accuracy: 严格逐字准确，只出现一次；不得复制参考图中的英文、品牌标识或固定词语。',
        'Constraints: 不要背景色块、英文副标题、印章、阴影、立体挤出、边框或水印。'
      ].join('\n')
    },
    {
      id: 'expressive-calligraphy',
      name: '墨韵书法字',
      badge: '书法 · 浓淡飞白',
      palette: ['#0d0d0b', '#faf8f1', '#b3261e'],
      reference: `${STYLE_PREVIEW_BASE_URL}/text_09_calligraphy_01_qingling.png`,
      references: [
        {
          id: 'qingling',
          label: '厚墨章法',
          reference: `${STYLE_PREVIEW_BASE_URL}/text_09_calligraphy_01_qingling.png`,
          thumbnail: `${STYLE_PREVIEW_BASE_URL}/text_09_calligraphy_01_qingling_thumb.jpg`
        },
        {
          id: 'vertical-ink',
          label: '纵势狂草',
          reference: `${STYLE_PREVIEW_BASE_URL}/text_09_calligraphy_02_vertical_ink.png`,
          thumbnail: `${STYLE_PREVIEW_BASE_URL}/text_09_calligraphy_02_vertical_ink_thumb.jpg`
        },
        {
          id: 'meihua',
          label: '轻盈行草',
          reference: `${STYLE_PREVIEW_BASE_URL}/text_09_calligraphy_03_meihua.png`,
          thumbnail: `${STYLE_PREVIEW_BASE_URL}/text_09_calligraphy_03_meihua_thumb.jpg`
        },
        {
          id: 'chazi',
          label: '枯笔禅意',
          reference: `${STYLE_PREVIEW_BASE_URL}/text_09_calligraphy_04_chazi.png`,
          thumbnail: `${STYLE_PREVIEW_BASE_URL}/text_09_calligraphy_04_chazi_thumb.jpg`
        }
      ],
      prompt: [
        'Use case: stylized-concept',
        'Asset type: transparent artistic typography',
        'Typography: 有真实毛笔提按、顿挫和行气的中文书法标题；根据所选参考在厚墨、行草、纵势狂草或枯笔禅意之间取样，章法自然且有强烈手作气息。',
        'Ink treatment: 单色墨迹，保留浓淡、飞白、毛边、墨团与笔锋速度变化；可有少量自然连带，但每个字仍必须辨识准确。',
        'Layout: 默认有呼吸感的横排或竖排章法；排版要求可控制疏密、大小、倾斜和长尾笔，不自动添加落款。',
        'Text accuracy: 严格逐字准确，只出现一次；不得复制参考图的固定词、拼音、设计署名或红色印章。',
        'Constraints: 只输出书法字本体；不要宣纸、印章、拼音、照片背景、阴影、边框或水印。'
      ].join('\n')
    },
    {
      id: 'flying-white-edge',
      name: '飞白锋芒字',
      badge: '飞白 · 野性锋芒',
      palette: ['#0a0a09', '#fffdf7', '#b01e18'],
      reference: `${STYLE_PREVIEW_BASE_URL}/text_10_flying_white_edge.png`,
      prompt: [
        'Use case: stylized-concept',
        'Asset type: transparent artistic typography',
        'Typography: 粗犷而当代的飞白展示字；以厚重毛笔骨架为主，加入刀锋般尖锐收笔、干刷裂纹、墨迹剥落和不对称字面挤压，形成摇滚海报般的强烈张力。',
        'Ink treatment: 高对比浓黑墨块与清晰飞白并存，边缘粗粝但字的核心结构必须完整可读；不要柔软圆润，也不要变成普通楷体。',
        'Layout: 默认紧凑横排，字与字可轻微咬合、上下错落；排版要求可指定竖排、倾斜或更强的长锋收笔。',
        'Text accuracy: 严格逐字准确，只出现一次；不得复制参考图原字、红印或其他内容。',
        'Constraints: 只输出黑色飞白字本体；不要印章、宣纸、背景、阴影、描边、边框或水印。'
      ].join('\n')
    }
  ];

  const REFERENCE_SUBJECT_PROMPT = '以参考图中的主体为准，保留主体的可识别结构、姿态和关键细节，只转换为所选物体风格';
  const FULL_IMAGE_DEFAULT_PROMPT = '保留原图中的全部主体、环境、背景和构图，让整张图片统一转换为所选插画风格';

  const state = {
    open: false,
    activeTab: 'object',
    selectedObjectTemplate: OBJECT_TEMPLATES[0].id,
    selectedObjectReferenceIds: {},
    customObjectStyles: [],
    customStyleEditorOpen: false,
    customStyleDraft: {
      editingId: '',
      name: '',
      prompt: '',
      reference: '',
      referenceAssetId: '',
      referenceName: ''
    },
    selectedTextTemplate: TEXT_TEMPLATES[0].id,
    selectedTextReferenceIds: {},
    objectPrompt: '',
    objectGenerationMode: 'subject',
    objectStyleStrength: 60,
    imageModelTier: 'lite',
    generationAspectRatio: '1:1',
    generationSize: { ...SEEDREAM_2K_SIZE_BY_ASPECT_RATIO['1:1'] },
    textValue: '春日漫游',
    textLayoutPrompt: '横向排版，字距舒展，保留长甩笔',
    editPrompt: '',
    source: null,
    analyzedSource: '',
    layers: [],
    layerGroups: [],
    selectedLayerId: '',
    selectedLayerIds: [],
    multiSelectMode: false,
    collapsedPanelSections: {},
    busy: '',
    status: '已开启工程自动缓存 · 选择模板或上传图片开始创作',
    statusKind: 'neutral',
    canvas: { width: 720, height: 960, background: '#f4f0e8' },
    workspace: { zoom: 1, panX: 0, panY: 0, background: '#ffffff' },
    exportScale: 2,
    undo: [],
    redo: [],
    observer: null,
    scanTimer: 0
  };

  let host = null;
  let shadow = null;
  let refs = {};
  let resizeObserver = null;
  let generationSerial = 0;
  let pageOverlay = null;
  let imageButtonFrame = 0;
  let studioDragCleanup = null;
  let workspaceNavigationCleanup = null;
  let workspaceSpacePressed = false;
  let projectSaveTimer = 0;
  let projectCacheReady = false;
  let projectSaveChain = Promise.resolve();
  let projectDbPromise = null;
  let paintSession = null;
  let projectSaveInFlight = false;
  let projectSaveDirty = false;
  let canvasCullFrame = 0;
  const assetMetaCache = new Map();
  const assetUrlCache = new Map();
  const canvasLayerNodes = new Map();
  const imageButtonRecords = new Map();

  function debug(...args) {
    if (config.debug) console.log('[Poster DIY]', ...args);
  }

  function uid(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function closestAspectRatio(width, height) {
    const ratio = width / Math.max(1, height);
    return SEEDREAM_ASPECT_RATIOS
      .map(value => {
        const [w, h] = value.split(':').map(Number);
        return [value, w / h];
      })
      .sort((a, b) => Math.abs(a[1] - ratio) - Math.abs(b[1] - ratio))[0][0];
  }

  function supportedAspectRatio(value, fallback) {
    if (SEEDREAM_ASPECT_RATIOS.includes(value)) return value;
    return SEEDREAM_ASPECT_RATIOS.includes(fallback) ? fallback : '1:1';
  }

  function seedreamSizeForAspectRatio(value) {
    const ratio = supportedAspectRatio(value);
    return { ...SEEDREAM_2K_SIZE_BY_ASPECT_RATIO[ratio] };
  }

  function setGenerationAspectRatio(value) {
    const ratio = supportedAspectRatio(value, state.generationAspectRatio);
    state.generationAspectRatio = ratio;
    state.generationSize = seedreamSizeForAspectRatio(ratio);
    return ratio;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, '&#096;');
  }

  function setStatus(message, kind) {
    state.status = message;
    state.statusKind = kind || 'neutral';
    if (refs.status) {
      refs.status.textContent = message;
      refs.status.dataset.kind = state.statusKind;
    }
  }

  function isGenerationBusy() {
    return state.busy === 'object' || state.busy === 'text';
  }

  function isCanvasEditBlocked() {
    return Boolean(state.busy) && !isGenerationBusy();
  }

  function icon(name) {
    const paths = {
      sparkle: '<path d="M12 2l1.5 5.2L19 9l-5.5 1.8L12 16l-1.5-5.2L5 9l5.5-1.8L12 2Z"/><path d="M5 15l.7 2.3L8 18l-2.3.7L5 21l-.7-2.3L2 18l2.3-.7L5 15Z"/>',
      image: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="8.5" cy="9" r="2"/><path d="m4 17 4.5-4 3.5 3 3-2.5 5 4.5"/>',
      type: '<path d="M5 5V3h14v2M9 21h6M12 3v18"/>',
      layers: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 16 9 5 9-5"/>',
      upload: '<path d="M12 16V3m0 0L7 8m5-5 5 5"/><path d="M4 15v5h16v-5"/>',
      download: '<path d="M12 3v13m0 0 5-5m-5 5-5-5"/><path d="M4 20h16"/>',
      close: '<path d="m5 5 14 14M19 5 5 19"/>',
      plus: '<path d="M12 5v14M5 12h14"/>',
      trash: '<path d="M4 7h16M9 7V4h6v3m3 0-1 14H7L6 7m4 4v6m4-6v6"/>',
      up: '<path d="m6 15 6-6 6 6"/>',
      down: '<path d="m6 9 6 6 6-6"/>',
      copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/>',
      clipboard: '<path d="M9 5h6v3H9z"/><path d="M9 6H6v15h12V6h-3"/>',
      eye: '<path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/>',
      eyeOff: '<path d="m3 3 18 18"/><path d="M10.6 6.1A10.7 10.7 0 0 1 12 6c6 0 9.5 6 9.5 6a16 16 0 0 1-2.1 2.8M6.2 6.2C3.8 8 2.5 12 2.5 12s3.5 6 9.5 6c1.2 0 2.3-.2 3.3-.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
      undo: '<path d="M9 7 4 12l5 5"/><path d="M5 12h8a6 6 0 0 1 6 6"/>',
      redo: '<path d="m15 7 5 5-5 5"/><path d="M19 12h-8a6 6 0 0 0-6 6"/>',
      wand: '<path d="m4 20 11-11"/><path d="m13 5 2-2m2 6 3-1M9 3 8 0m10 14 2 2M4 8 1 7"/><path d="m14 8 2 2"/>',
      brush: '<path d="m14 4 6 6-9 9H5v-6l9-9Z"/><path d="m12 6 6 6"/><path d="M5 19c-1.5 0-2.5.7-3 2 2.8.2 4.7-.5 5.5-2"/>',
      eraser: '<path d="m7 19-4-4L13 5l6 6-8 8H7Z"/><path d="m11 19 8-8 2 2-6 6H7"/>',
      check: '<path d="m5 12 4 4L19 6"/>',
      external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 13v7H4V6h7"/>'
    };
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.sparkle}</svg>`;
  }

  function getScriptBase() {
    if (config.assetBaseUrl) {
      try {
        return new URL(config.assetBaseUrl, location.href).href.replace(/\/?$/, '/');
      } catch (_) {
        return '';
      }
    }
    if (!currentScriptSrc) return '';
    try {
      return new URL('.', currentScriptSrc).href;
    } catch (_) {
      return '';
    }
  }

  function resolveAsset(path) {
    if (/^(?:https?:|data:|blob:)/i.test(path || '')) return path;
    const base = getScriptBase();
    if (!base) return '';
    try {
      return new URL(path, base).href;
    } catch (_) {
      return '';
    }
  }

  function customStylePrompt(stylePrompt) {
    return [
      'Use case: style-transfer',
      'Asset type: transparent poster object',
      'Primary request: 将用户给出的主体重绘为一个完整、独立、可用于海报拼贴的自定义风格插画物体。',
      `Style/medium: ${String(stylePrompt || '').trim()}`,
      'Reference handling: 风格参考图只用于画材、配色、线条、形状语言和质感；不得复制其中的主体、文字、构图或背景。',
      'Composition/framing: 保留用户主体的身份和关键结构，主体完整、居中，四周留出透明边距。',
      'Negative style constraints: 不要照抄风格图内容，不要增加无关主体、文字、边框、水印、场景、地面或投影。'
    ].join('\n');
  }

  function normalizeCustomStyle(raw, options = {}) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const name = String(raw.name || '').replace(/\s+/g, ' ').trim().slice(0, 48);
    const prompt = String(raw.prompt || raw.stylePrompt || '').trim().slice(0, 12000);
    const rawReference = raw.reference && typeof raw.reference === 'object'
      ? raw.reference.dataUrl || raw.reference.url || ''
      : raw.reference || raw.image || '';
    const reference = String(rawReference || '').trim();
    if (!name || !prompt || !/^(?:data:image\/|blob:|https?:\/\/)/i.test(reference)) return null;
    const suppliedId = String(raw.id || '').trim();
    const id = options.newId || !/^custom-style-[a-z0-9-]+$/i.test(suppliedId)
      ? uid('custom-style')
      : suppliedId;
    const now = new Date().toISOString();
    const palette = Array.isArray(raw.palette)
      ? raw.palette.filter(color => /^#[0-9a-f]{6}$/i.test(color)).slice(0, 5)
      : [];
    return {
      id,
      name,
      prompt,
      reference,
      referenceAssetId: String(raw.referenceAssetId || ''),
      referenceName: String(
        raw.referenceName
        || (raw.reference && typeof raw.reference === 'object' ? raw.reference.name : '')
        || 'style-reference.png'
      ).slice(0, 120),
      palette: palette.length ? palette : ['#e7ff67', '#ff633d', '#42679b', '#f4f0e8'],
      createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : now,
      updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : now
    };
  }

  function customStyleTemplate(style) {
    return {
      id: style.id,
      name: style.name,
      badge: '自定义 · 图片 + Prompt',
      palette: [...style.palette],
      reference: style.reference,
      prompt: customStylePrompt(style.prompt),
      custom: true,
      customPrompt: style.prompt
    };
  }

  function objectTemplates() {
    return [
      ...OBJECT_TEMPLATES,
      ...state.customObjectStyles.map(customStyleTemplate)
    ];
  }

  function isObjectTemplate(template) {
    return Boolean(template) && objectTemplates().some(item => item.id === template.id);
  }

  function getTemplate(type, id) {
    const list = type === 'text' ? TEXT_TEMPLATES : objectTemplates();
    return list.find(item => item.id === id) || list[0];
  }

  function fullImageStylePrompt(template) {
    if (template?.custom && template.customPrompt) {
      return [
        'Custom style instruction:',
        String(template.customPrompt).trim(),
        'Use the custom reference image only for palette, line, shape, medium and texture. Never copy its subject, text, composition or background.'
      ].join('\n');
    }
    const visualLines = String(template?.prompt || '')
      .split('\n')
      .filter(line => /^(?:Style\/medium|Color palette|Shape language|Line treatment|Negative style constraints):/i.test(line.trim()));
    return visualLines.join('\n') || String(template?.prompt || '');
  }

  function imageModelOptions() {
    return { optimize_prompt_mode: state.imageModelTier === 'pro' ? 'pro' : 'lite' };
  }

  function imageModelLabel() {
    return state.imageModelTier === 'pro' ? 'Seedream 5.0 Pro' : 'Seedream 5.0 Lite';
  }

  function templateReferenceItems(template) {
    const rawItems = Array.isArray(template?.references) && template.references.length
      ? template.references
      : [{ id: 'default', label: '默认参考', reference: template?.reference || '' }];
    const templateOverride = config.templateReferences[template?.id];
    return rawItems.map((item, index) => {
      const itemOverride = templateOverride && typeof templateOverride === 'object'
        ? templateOverride[item.id]
        : index === 0 ? templateOverride : '';
      const overriddenReference = typeof itemOverride === 'string'
        ? itemOverride
        : itemOverride?.reference;
      const overriddenThumbnail = itemOverride && typeof itemOverride === 'object'
        ? itemOverride.thumbnail
        : '';
      const reference = resolveAsset(overriddenReference || item.reference || '');
      const thumbnail = resolveAsset(overriddenThumbnail || item.thumbnail || overriddenReference || item.reference || '');
      return {
        id: String(item.id || `reference-${index + 1}`),
        label: String(item.label || `参考 ${index + 1}`),
        reference,
        thumbnail
      };
    }).filter(item => item.reference || item.thumbnail);
  }

  function selectedObjectReferenceItem(template) {
    const items = templateReferenceItems(template);
    const selectedId = state.selectedObjectReferenceIds[template?.id]
      || template?.defaultReferenceId
      || items[0]?.id;
    return items.find(item => item.id === selectedId) || items[0] || null;
  }

  function selectedTextReferenceItem(template) {
    const items = templateReferenceItems(template);
    const selectedId = state.selectedTextReferenceIds[template?.id]
      || template?.defaultReferenceId
      || items[0]?.id;
    return items.find(item => item.id === selectedId) || items[0] || null;
  }

  function restoreObjectReferenceSelections(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return;
    objectTemplates().forEach(template => {
      const id = value[template.id];
      if (typeof id !== 'string') return;
      if (templateReferenceItems(template).some(item => item.id === id)) {
        state.selectedObjectReferenceIds[template.id] = id;
      }
    });
  }

  function restoreTextReferenceSelections(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return;
    TEXT_TEMPLATES.forEach(template => {
      const id = value[template.id];
      if (typeof id !== 'string') return;
      if (templateReferenceItems(template).some(item => item.id === id)) {
        state.selectedTextReferenceIds[template.id] = id;
      }
    });
  }

  function templateReference(template) {
    if (isObjectTemplate(template)) {
      return selectedObjectReferenceItem(template)?.reference || '';
    }
    return selectedTextReferenceItem(template)?.reference || '';
  }

  function templateThumbnail(template) {
    if (isObjectTemplate(template)) {
      const selected = selectedObjectReferenceItem(template);
      return selected?.thumbnail || selected?.reference || '';
    }
    return templateReference(template);
  }

  function generationTemplateReference(template, fullImageMode) {
    if (!fullImageMode) return templateReference(template);
    const configured = config.fullImageTemplateReferences[template.id];
    if (configured) return resolveAsset(configured);
    if (Object.prototype.hasOwnProperty.call(template, 'fullImageReference')) {
      return resolveAsset(template.fullImageReference);
    }
    return templateReference(template);
  }

  function loadPreferences() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if (stored.activeTab === 'object' || stored.activeTab === 'text') state.activeTab = stored.activeTab;
      if (getTemplate('object', stored.selectedObjectTemplate)?.id === stored.selectedObjectTemplate) {
        state.selectedObjectTemplate = stored.selectedObjectTemplate;
      }
      restoreObjectReferenceSelections(stored.selectedObjectReferenceIds);
      if (getTemplate('text', stored.selectedTextTemplate)?.id === stored.selectedTextTemplate) {
        state.selectedTextTemplate = stored.selectedTextTemplate;
      }
      restoreTextReferenceSelections(stored.selectedTextReferenceIds);
      if (/^#[0-9a-f]{6}$/i.test(stored.background || '')) state.canvas.background = stored.background;
      if (typeof stored.objectPrompt === 'string') state.objectPrompt = stored.objectPrompt;
      if (stored.objectGenerationMode === 'subject' || stored.objectGenerationMode === 'full') {
        state.objectGenerationMode = stored.objectGenerationMode;
      }
      if (Number.isFinite(stored.objectStyleStrength)) {
        state.objectStyleStrength = clamp(Math.round(stored.objectStyleStrength), 0, 100);
      }
      if (stored.imageModelTier === 'lite' || stored.imageModelTier === 'pro') {
        state.imageModelTier = stored.imageModelTier;
      }
      const storedRatio = supportedAspectRatio(
        stored.generationAspectRatio,
        stored.generationSize?.width && stored.generationSize?.height
          ? closestAspectRatio(stored.generationSize.width, stored.generationSize.height)
          : '1:1'
      );
      setGenerationAspectRatio(storedRatio);
      if ([1, 2, 3, 4].includes(Number(stored.exportScale))) state.exportScale = Number(stored.exportScale);
      if (typeof stored.textValue === 'string') state.textValue = stored.textValue;
      if (typeof stored.textLayoutPrompt === 'string') state.textLayoutPrompt = stored.textLayoutPrompt;
      if (typeof stored.editPrompt === 'string') state.editPrompt = stored.editPrompt;
      if (stored.collapsedPanelSections && typeof stored.collapsedPanelSections === 'object') {
        state.collapsedPanelSections = Object.fromEntries(
          Object.entries(stored.collapsedPanelSections)
            .filter(([id, collapsed]) => typeof id === 'string' && collapsed === true)
        );
      }
    } catch (_) {
      // Preference recovery is intentionally best-effort.
    }
  }

  function savePreferences() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        activeTab: state.activeTab,
        selectedObjectTemplate: state.selectedObjectTemplate,
        selectedObjectReferenceIds: { ...state.selectedObjectReferenceIds },
        selectedTextTemplate: state.selectedTextTemplate,
        selectedTextReferenceIds: { ...state.selectedTextReferenceIds },
        background: state.canvas.background,
        objectPrompt: state.objectPrompt,
        objectGenerationMode: state.objectGenerationMode,
        objectStyleStrength: state.objectStyleStrength,
        imageModelTier: state.imageModelTier,
        generationAspectRatio: state.generationAspectRatio,
        generationSize: { ...state.generationSize },
        exportScale: state.exportScale,
        textValue: state.textValue,
        textLayoutPrompt: state.textLayoutPrompt,
        editPrompt: state.editPrompt,
        collapsedPanelSections: { ...state.collapsedPanelSections }
      }));
    } catch (_) {
      // Storage may be disabled on private pages.
    }
    scheduleProjectSave();
  }

  function openProjectDb() {
    if (!('indexedDB' in window)) return Promise.reject(new Error('IndexedDB unavailable'));
    if (projectDbPromise) return projectDbPromise;
    projectDbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(PROJECT_DB_NAME, PROJECT_DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(PROJECT_STORE_NAME)) {
          db.createObjectStore(PROJECT_STORE_NAME);
        }
        if (!db.objectStoreNames.contains(ASSET_STORE_NAME)) {
          db.createObjectStore(ASSET_STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('工程缓存数据库打开失败'));
      request.onblocked = () => reject(new Error('工程缓存数据库升级被其他页面占用，请刷新后重试'));
    });
    return projectDbPromise;
  }

  async function readProjectCache() {
    try {
      const db = await openProjectDb();
      return await new Promise((resolve, reject) => {
        const store = db.transaction(PROJECT_STORE_NAME, 'readonly').objectStore(PROJECT_STORE_NAME);
        const request = store.get(PROJECT_CACHE_KEY);
        request.onsuccess = () => {
          if (request.result) {
            resolve(request.result);
            return;
          }
          readLegacyProjectCache().then(resolve, reject);
        };
        request.onerror = () => reject(request.error || new Error('工程缓存读取失败'));
      });
    } catch (_) {
      try {
        return JSON.parse(
          localStorage.getItem(PROJECT_FALLBACK_KEY)
          || localStorage.getItem(LEGACY_PROJECT_FALLBACK_KEY)
          || 'null'
        );
      } catch (_) {
        return null;
      }
    }
  }

  function readLegacyProjectCache() {
    const fallback = () => {
      try {
        return JSON.parse(localStorage.getItem(LEGACY_PROJECT_FALLBACK_KEY) || 'null');
      } catch (_) {
        return null;
      }
    };
    return new Promise(resolve => {
      const request = indexedDB.open(LEGACY_PROJECT_DB_NAME);
      request.onsuccess = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(PROJECT_STORE_NAME)) {
          db.close();
          resolve(fallback());
          return;
        }
        const legacyRequest = db.transaction(PROJECT_STORE_NAME, 'readonly')
          .objectStore(PROJECT_STORE_NAME)
          .get(LEGACY_PROJECT_CACHE_KEY);
        legacyRequest.onsuccess = () => {
          const value = legacyRequest.result || fallback();
          db.close();
          resolve(value);
        };
        legacyRequest.onerror = () => {
          db.close();
          resolve(fallback());
        };
      };
      request.onerror = () => resolve(fallback());
    });
  }

  async function writeProjectCache(project) {
    try {
      const db = await openProjectDb();
      await new Promise((resolve, reject) => {
        const transaction = db.transaction(PROJECT_STORE_NAME, 'readwrite');
        transaction.objectStore(PROJECT_STORE_NAME).put(project, PROJECT_CACHE_KEY);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error || new Error('工程缓存写入失败'));
        transaction.onabort = () => reject(transaction.error || new Error('工程缓存写入中止'));
      });
      try {
        localStorage.removeItem(PROJECT_FALLBACK_KEY);
      } catch (_) {
        // Ignore fallback cleanup failures.
      }
    } catch (error) {
      debug('project metadata save failed', error);
      throw error;
    }
  }

  async function writeAssetRecord(record) {
    const db = await openProjectDb();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(ASSET_STORE_NAME, 'readwrite');
      transaction.objectStore(ASSET_STORE_NAME).put(record);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('图片资源写入失败'));
      transaction.onabort = () => reject(transaction.error || new Error('图片资源写入中止'));
    });
    assetMetaCache.set(record.id, {
      id: record.id,
      mime: record.mime,
      width: record.width,
      height: record.height,
      byteSize: record.byteSize,
      persistentUrl: record.persistentUrl || '',
      createdAt: record.createdAt
    });
    return record;
  }

  async function readAssetRecord(assetId) {
    if (!assetId) return null;
    const db = await openProjectDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction(ASSET_STORE_NAME, 'readonly')
        .objectStore(ASSET_STORE_NAME)
        .get(assetId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error('图片资源读取失败'));
    });
  }

  async function deleteLegacyProjectCache() {
    // Keep the v12 cache intact so users can safely switch back to the legacy script.
  }

  function serializableRevision(revision) {
    if (!revision) return null;
    const { src, restoreSrc, originalSrc, thumbnailSrc, ...metadata } = revision;
    return metadata;
  }

  function serializableLayer(layer) {
    const { src, restoreSrc, originalSrc, thumbnailSrc, ...metadata } = layer;
    return {
      ...metadata,
      revisions: Array.isArray(layer.revisions)
        ? layer.revisions.map(serializableRevision).filter(Boolean)
        : []
    };
  }

  function projectData() {
    return {
      format: 'tabbit-poster-diy-project',
      version: 13,
      updatedAt: new Date().toISOString(),
      activeTab: state.activeTab,
      selectedObjectTemplate: state.selectedObjectTemplate,
      selectedObjectReferenceIds: { ...state.selectedObjectReferenceIds },
      customObjectStyles: state.customObjectStyles.map(style => {
        const { reference, thumbnailSrc, ...metadata } = style;
        return { ...metadata, palette: [...style.palette] };
      }),
      selectedTextTemplate: state.selectedTextTemplate,
      selectedTextReferenceIds: { ...state.selectedTextReferenceIds },
      objectPrompt: state.objectPrompt,
      objectGenerationMode: state.objectGenerationMode,
      objectStyleStrength: state.objectStyleStrength,
      imageModelTier: state.imageModelTier,
      generationAspectRatio: state.generationAspectRatio,
      generationSize: { ...state.generationSize },
      exportScale: state.exportScale,
      textValue: state.textValue,
      textLayoutPrompt: state.textLayoutPrompt,
      editPrompt: state.editPrompt,
      source: state.source
        ? (({ src, thumbnailSrc, ...metadata }) => ({
            ...metadata,
            remoteSrc: /^https?:\/\//i.test(src || '') ? src : ''
          }))(state.source)
        : null,
      analyzedSource: state.analyzedSource,
      workspace: { ...state.workspace },
      ...snapshot()
    };
  }

  async function projectAssetFromLegacySource(source, metadata, migrationCache) {
    if (!source) return null;
    if (typeof source === 'object' && source.id) return source;
    const cacheKey = typeof source === 'string'
      ? `${source.length}:${source.slice(0, 72)}:${source.slice(
          Math.max(0, Math.floor(source.length / 2) - 36),
          Math.floor(source.length / 2) + 36
        )}:${source.slice(Math.max(0, source.length - 72))}`
      : source;
    if (migrationCache?.has(cacheKey)) return migrationCache.get(cacheKey);
    const promise = createImageAsset(source, metadata);
    migrationCache?.set(cacheKey, promise);
    try {
      return await promise;
    } catch (error) {
      migrationCache?.delete(cacheKey);
      throw error;
    }
  }

  async function normalizeStoredRevision(revision, migrationCache) {
    if (!revision) return null;
    if (revision.assetId) return { ...revision };
    if (!revision.src) return null;
    const active = await projectAssetFromLegacySource(
      revision.src,
      { cacheRuntime: false },
      migrationCache
    );
    const restore = await projectAssetFromLegacySource(
      revision.restoreSrc || revision.src,
      { cacheRuntime: false },
      migrationCache
    );
    const original = await projectAssetFromLegacySource(
      revision.originalSrc || revision.restoreSrc || revision.src,
      { persistentUrl: revision.persistentUrl || '', cacheRuntime: false },
      migrationCache
    );
    const { src, restoreSrc, originalSrc, ...metadata } = revision;
    return {
      ...metadata,
      assetId: active.id,
      restoreAssetId: restore.id,
      originalAssetId: original.id
    };
  }

  async function normalizeStoredLayer(layer, migrationCache) {
    if (!layer) return null;
    if (layer.assetId) {
      const normalized = {
        ...layer,
        restoreAssetId: layer.restoreAssetId || layer.assetId,
        originalAssetId: layer.originalAssetId || layer.restoreAssetId || layer.assetId,
        revisions: []
      };
      for (const revision of Array.isArray(layer.revisions) ? layer.revisions : []) {
        const item = await normalizeStoredRevision(revision, migrationCache);
        if (item) normalized.revisions.push(item);
      }
      await hydrateLayerRuntime(normalized);
      return normalized;
    }
    if (!layer.src) return null;
    const active = await projectAssetFromLegacySource(
      layer.src,
      { persistentUrl: layer.persistentUrl || '' },
      migrationCache
    );
    const restore = await projectAssetFromLegacySource(
      layer.restoreSrc || layer.src,
      { cacheRuntime: false },
      migrationCache
    );
    const original = await projectAssetFromLegacySource(
      layer.originalSrc || layer.restoreSrc || layer.src,
      { persistentUrl: layer.persistentUrl || '', cacheRuntime: false },
      migrationCache
    );
    const { src, restoreSrc, originalSrc, thumbnailSrc, ...metadata } = layer;
    const normalized = {
      ...metadata,
      assetId: active.id,
      restoreAssetId: restore.id,
      originalAssetId: original.id,
      revisions: []
    };
    for (const revision of Array.isArray(layer.revisions) ? layer.revisions : []) {
      const item = await normalizeStoredRevision(revision, migrationCache);
      if (item) normalized.revisions.push(item);
    }
    await hydrateLayerRuntime(normalized);
    return normalized;
  }

  async function applyProjectData(project) {
    if (!project || project.format !== 'tabbit-poster-diy-project' || !Array.isArray(project.layers)) return false;
    if (
      !project.canvas
      || !Number.isFinite(project.canvas.width)
      || !Number.isFinite(project.canvas.height)
      || typeof project.canvas.background !== 'string'
    ) return false;
    const migrationCache = new Map();
    const migratedFromLegacy = Number(project.version) < 13;
    state.activeTab = project.activeTab === 'text' ? 'text' : 'object';
    const seenCustomStyleIds = new Set();
    state.customObjectStyles = [];
    const storedCustomStyles = Array.isArray(project.customObjectStyles) ? project.customObjectStyles : [];
    for (let styleIndex = 0; styleIndex < storedCustomStyles.length; styleIndex += 1) {
      const rawStyle = storedCustomStyles[styleIndex];
      try {
        let referenceAssetId = rawStyle.referenceAssetId || '';
        let reference = '';
        if (referenceAssetId) {
          reference = await assetUrl(referenceAssetId, 'preview');
        } else if (rawStyle.reference) {
          const asset = await projectAssetFromLegacySource(rawStyle.reference, {}, migrationCache);
          referenceAssetId = asset.id;
          reference = asset.previewSrc;
        }
        const style = normalizeCustomStyle({ ...rawStyle, reference, referenceAssetId });
        if (style && !seenCustomStyleIds.has(style.id)) {
          seenCustomStyleIds.add(style.id);
          state.customObjectStyles.push(style);
        }
      } catch (error) {
        debug('custom style asset migration failed', rawStyle?.id, error);
      } finally {
        if (migratedFromLegacy && rawStyle) rawStyle.reference = '';
      }
    }
    state.selectedObjectTemplate = getTemplate('object', project.selectedObjectTemplate).id;
    state.selectedObjectReferenceIds = {};
    restoreObjectReferenceSelections(project.selectedObjectReferenceIds);
    state.selectedTextTemplate = getTemplate('text', project.selectedTextTemplate).id;
    state.selectedTextReferenceIds = {};
    restoreTextReferenceSelections(project.selectedTextReferenceIds);
    state.objectPrompt = typeof project.objectPrompt === 'string' ? project.objectPrompt : state.objectPrompt;
    state.objectGenerationMode = project.objectGenerationMode === 'full' ? 'full' : 'subject';
    state.objectStyleStrength = Number.isFinite(project.objectStyleStrength)
      ? clamp(Math.round(project.objectStyleStrength), 0, 100)
      : state.objectStyleStrength;
    state.imageModelTier = project.imageModelTier === 'pro' ? 'pro' : 'lite';
    const projectRatio = supportedAspectRatio(
      project.generationAspectRatio,
      project.generationSize?.width && project.generationSize?.height
        ? closestAspectRatio(project.generationSize.width, project.generationSize.height)
        : project.source?.width && project.source?.height
          ? closestAspectRatio(project.source.width, project.source.height)
          : '1:1'
    );
    setGenerationAspectRatio(projectRatio);
    state.exportScale = [1, 2, 3, 4].includes(Number(project.exportScale))
      ? Number(project.exportScale)
      : state.exportScale;
    state.textValue = typeof project.textValue === 'string' ? project.textValue : state.textValue;
    state.textLayoutPrompt = typeof project.textLayoutPrompt === 'string'
      ? project.textLayoutPrompt
      : state.textLayoutPrompt;
    state.editPrompt = typeof project.editPrompt === 'string' ? project.editPrompt : '';
    state.source = null;
    if (project.source) {
      try {
        let sourceAssetId = project.source.assetId || '';
        let sourceSrc = '';
        if (sourceAssetId) {
          sourceSrc = await assetUrl(sourceAssetId, 'preview');
        } else if (project.source.src || project.source.remoteSrc) {
          const storedSource = project.source.src || project.source.remoteSrc;
          const sourceAsset = await projectAssetFromLegacySource(storedSource, {}, migrationCache);
          sourceAssetId = sourceAsset.id;
          sourceSrc = sourceAsset.previewSrc;
        }
        if (sourceAssetId && sourceSrc) {
          state.source = { ...project.source, assetId: sourceAssetId, src: sourceSrc };
        }
      } catch (error) {
        debug('source asset migration failed', error);
        if (project.source.remoteSrc) {
          state.source = { ...project.source, src: project.source.remoteSrc };
        }
      } finally {
        if (migratedFromLegacy) project.source.src = '';
      }
    }
    state.analyzedSource = typeof project.analyzedSource === 'string' ? project.analyzedSource : '';
    state.canvas = {
      width: clamp(Math.round(project.canvas.width), 200, 4096),
      height: clamp(Math.round(project.canvas.height), 200, 4096),
      background: /^#[0-9a-f]{6}$/i.test(project.canvas.background)
        ? project.canvas.background
        : '#f4f0e8'
    };
    state.workspace = {
      zoom: Number.isFinite(project.workspace?.zoom)
        ? clamp(project.workspace.zoom, 0.12, 8)
        : 1,
      panX: Number.isFinite(project.workspace?.panX) ? project.workspace.panX : 0,
      panY: Number.isFinite(project.workspace?.panY) ? project.workspace.panY : 0,
      background: /^#[0-9a-f]{6}$/i.test(project.workspace?.background)
        ? project.workspace.background
        : '#ffffff'
    };
    state.layers = [];
    for (let layerIndex = 0; layerIndex < project.layers.length; layerIndex += 1) {
      const rawLayer = project.layers[layerIndex];
      try {
        const layer = await normalizeStoredLayer(rawLayer, migrationCache);
        if (!layer) continue;
        state.layers.push({
          ...layer,
          id: typeof layer.id === 'string' && layer.id ? layer.id : uid('layer'),
          groupId: typeof layer.groupId === 'string' ? layer.groupId : '',
          visible: layer.visible !== false
        });
        await nextFrame();
      } catch (error) {
        debug('layer asset migration failed', rawLayer?.id, error);
      } finally {
        if (migratedFromLegacy) project.layers[layerIndex] = null;
      }
    }
    const rawGroups = Array.isArray(project.layerGroups) ? project.layerGroups : [];
    const seenGroupIds = new Set();
    state.layerGroups = rawGroups
      .filter(group => (
        group
        && typeof group.id === 'string'
        && group.id
        && !seenGroupIds.has(group.id)
        && seenGroupIds.add(group.id)
      ))
      .map(group => ({
        id: group.id,
        name: typeof group.name === 'string' && group.name.trim() ? group.name.trim() : '图层组',
        visible: group.visible !== false,
        collapsed: Boolean(group.collapsed)
      }));
    normalizeLayerGroups();
    state.selectedLayerId = state.layers.some(layer => layer.id === project.selectedLayerId)
      ? project.selectedLayerId
      : state.layers.at(-1)?.id || '';
    const restoredSelection = Array.isArray(project.selectedLayerIds)
      ? project.selectedLayerIds.filter((id, index, list) => (
          typeof id === 'string'
          && state.layers.some(layer => layer.id === id)
          && list.indexOf(id) === index
        ))
      : [];
    state.selectedLayerIds = restoredSelection.length
      ? restoredSelection
      : state.selectedLayerId ? [state.selectedLayerId] : [];
    if (state.selectedLayerId && !state.selectedLayerIds.includes(state.selectedLayerId)) {
      state.selectedLayerIds.push(state.selectedLayerId);
    }
    state.multiSelectMode = false;
    state.undo = [];
    state.redo = [];
    if (migratedFromLegacy) {
      await writeProjectCache(projectData());
      await deleteLegacyProjectCache();
    }
    return true;
  }

  async function restoreProjectCache() {
    let restored = false;
    try {
      restored = await applyProjectData(await readProjectCache());
    } catch (error) {
      debug('project cache restore failed', error);
    } finally {
      projectCacheReady = true;
    }
    if (!restored) return;
    renderTemplatePanel();
    renderCanvas();
    renderLayersPanel();
    renderToolbarState();
    scheduleProjectSave();
    shadow.querySelector('.background-control')?.style.setProperty('--canvas-color', state.canvas.background);
    setStatus(`已从缓存恢复 ${state.layers.length} 个图层，后续修改会自动保存`, 'success');
  }

  function flushProjectCache() {
    if (!projectCacheReady) return Promise.resolve();
    clearTimeout(projectSaveTimer);
    projectSaveTimer = 0;
    projectSaveDirty = true;
    if (projectSaveInFlight) return projectSaveChain;
    projectSaveInFlight = true;
    projectSaveChain = (async () => {
      do {
        projectSaveDirty = false;
        await writeProjectCache(projectData());
      } while (projectSaveDirty);
    })()
      .catch(error => debug('project cache save failed', error))
      .finally(() => {
        projectSaveInFlight = false;
      });
    return projectSaveChain;
  }

  function scheduleProjectSave(delay) {
    if (!projectCacheReady) return;
    clearTimeout(projectSaveTimer);
    projectSaveTimer = window.setTimeout(flushProjectCache, Number.isFinite(delay) ? delay : 1000);
  }

  function handlePageVisibilityChange() {
    if (document.visibilityState === 'hidden') flushProjectCache();
  }

  function snapshot() {
    return {
      canvas: { ...state.canvas },
      layers: state.layers.map(serializableLayer),
      layerGroups: state.layerGroups.map(group => ({ ...group })),
      selectedLayerId: state.selectedLayerId,
      selectedLayerIds: [...state.selectedLayerIds]
    };
  }

  async function restoreSnapshot(value) {
    state.canvas = { ...value.canvas };
    state.layers = value.layers.map(layer => ({
      ...layer,
      src: cachedAssetUrl(layer.assetId, 'preview'),
      thumbnailSrc: cachedAssetUrl(layer.assetId, 'thumbnail'),
      groupId: typeof layer.groupId === 'string' ? layer.groupId : '',
      revisions: Array.isArray(layer.revisions) ? layer.revisions.map(item => ({ ...item })) : []
    }));
    for (const layer of state.layers) {
      if (!layer.src || !layer.thumbnailSrc) await hydrateLayerRuntime(layer);
    }
    state.layerGroups = Array.isArray(value.layerGroups)
      ? value.layerGroups.map(group => ({ ...group }))
      : [];
    normalizeLayerGroups();
    state.selectedLayerId = value.selectedLayerId || state.layers.at(-1)?.id || '';
    state.selectedLayerIds = Array.isArray(value.selectedLayerIds)
      ? value.selectedLayerIds.filter(id => state.layers.some(layer => layer.id === id))
      : state.selectedLayerId ? [state.selectedLayerId] : [];
    if (state.selectedLayerId && !state.selectedLayerIds.includes(state.selectedLayerId)) {
      state.selectedLayerIds.push(state.selectedLayerId);
    }
    renderCanvas();
    renderLayersPanel();
    renderToolbarState();
    scheduleProjectSave();
  }

  function pushUndo() {
    state.undo.push(snapshot());
    if (state.undo.length > 30) state.undo.shift();
    state.redo = [];
    renderToolbarState();
  }

  async function undo() {
    if (!state.undo.length || isCanvasEditBlocked()) return;
    state.redo.push(snapshot());
    await restoreSnapshot(state.undo.pop());
    setStatus('已撤销上一步', 'success');
  }

  async function redo() {
    if (!state.redo.length || isCanvasEditBlocked()) return;
    state.undo.push(snapshot());
    await restoreSnapshot(state.redo.pop());
    setStatus('已恢复上一步', 'success');
  }

  function callWithTimeout(factory, timeoutMs, label) {
    return new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error(`${label}超时，请稍后重试`)), timeoutMs);
      Promise.resolve()
        .then(factory)
        .then(value => {
          clearTimeout(timer);
          resolve(value);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  function wait(ms) {
    return new Promise(resolve => window.setTimeout(resolve, ms));
  }

  function hasAsyncImageBridge() {
    return Boolean(
      window.LLMBridge &&
      typeof window.LLMBridge.createImageTask === 'function' &&
      typeof window.LLMBridge.getImageTask === 'function'
    );
  }

  function imageTaskId(task) {
    return String(task?.task_id || task?.taskId || task?.id || '').trim();
  }

  function imageTaskStatus(task) {
    return String(task?.status || '').trim().toLowerCase();
  }

  async function runAsyncImageTask(prompt, options, label) {
    if (!hasAsyncImageBridge()) {
      throw new Error('当前页面未检测到 LLMBridge.createImageTask / getImageTask');
    }

    const startedAt = Date.now();
    const totalTimeoutMs = config.generationTimeoutMs;
    const requestTimeoutMs = Math.min(config.imageTaskRequestTimeoutMs, totalTimeoutMs);
    const created = await callWithTimeout(
      () => window.LLMBridge.createImageTask(prompt, options),
      requestTimeoutMs,
      `${label}任务创建`
    );
    if (!created || created.success === false) {
      throw new Error(created?.error_message || created?.message || `${label}任务创建失败`);
    }

    const taskId = imageTaskId(created);
    if (!taskId) throw new Error(`${label}任务创建成功，但没有返回 task_id`);

    let result = created;
    while (true) {
      const status = imageTaskStatus(result);
      if (status === 'succeeded') return result;
      if (status === 'failed') {
        throw new Error(result?.error_message || result?.message || `${label}失败`);
      }

      const remainingBeforeWait = totalTimeoutMs - (Date.now() - startedAt);
      if (remainingBeforeWait <= 0) throw new Error(`${label}超时，请稍后重试`);
      await wait(Math.min(config.imageTaskPollIntervalMs, remainingBeforeWait));

      const remainingBeforeQuery = totalTimeoutMs - (Date.now() - startedAt);
      if (remainingBeforeQuery <= 0) throw new Error(`${label}超时，请稍后重试`);
      result = await callWithTimeout(
        () => window.LLMBridge.getImageTask(taskId),
        Math.min(config.imageTaskRequestTimeoutMs, remainingBeforeQuery),
        `${label}任务查询`
      );
      if (!result) throw new Error(`${label}任务查询未返回结果`);
      if (result.success === false && !imageTaskStatus(result)) {
        throw new Error(result.error_message || result.message || `${label}任务查询失败`);
      }
    }
  }

  function parseJsonResponse(raw) {
    if (raw && typeof raw === 'object') return raw;
    const text = String(raw || '').trim();
    try {
      return JSON.parse(text);
    } catch (_) {
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) return {};
      try {
        return JSON.parse(match[0]);
      } catch (_) {
        return {};
      }
    }
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error || new Error('文件读取失败'));
      reader.readAsDataURL(file);
    });
  }

  function resetCustomStyleDraft() {
    state.customStyleDraft = {
      editingId: '',
      name: '',
      prompt: '',
      reference: '',
      referenceAssetId: '',
      referenceName: ''
    };
  }

  function openCustomStyleEditor(styleId) {
    const style = state.customObjectStyles.find(item => item.id === styleId);
    state.customStyleEditorOpen = true;
    state.customStyleDraft = style
      ? {
          editingId: style.id,
          name: style.name,
          prompt: style.prompt,
          reference: style.reference,
          referenceAssetId: style.referenceAssetId || '',
          referenceName: style.referenceName
        }
      : {
          editingId: '',
          name: '',
          prompt: '',
          reference: '',
          referenceAssetId: '',
          referenceName: ''
        };
    renderTemplatePanel();
  }

  async function setCustomStyleReferenceFile(file) {
    if (!isImageFile(file)) {
      setStatus('请选择 PNG、JPG、WebP、GIF 或 AVIF 风格图片', 'error');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setStatus('风格图片请控制在 20MB 以内', 'error');
      return;
    }
    try {
      const asset = await createImageAsset(file);
      state.customStyleDraft.reference = asset.previewSrc;
      state.customStyleDraft.referenceAssetId = asset.id;
      state.customStyleDraft.referenceName = file.name || 'style-reference.png';
      renderTemplatePanel();
      setStatus('风格参考图已载入，请补充名称与 Prompt 后保存', 'success');
    } catch (error) {
      setStatus(error?.message || '风格图片读取失败', 'error');
    }
  }

  function saveCustomStyleDraft() {
    const draft = state.customStyleDraft;
    if (!draft.name.trim()) {
      setStatus('请填写自定义风格名称', 'error');
      refs.customStyleName?.focus();
      return;
    }
    if (!draft.reference) {
      setStatus('请上传一张风格参考图', 'error');
      return;
    }
    if (!draft.prompt.trim()) {
      setStatus('请填写描述画材、配色、线条和形状语言的风格 Prompt', 'error');
      refs.customStylePrompt?.focus();
      return;
    }
    const existingIndex = state.customObjectStyles.findIndex(item => item.id === draft.editingId);
    const existing = existingIndex >= 0 ? state.customObjectStyles[existingIndex] : null;
    const normalized = normalizeCustomStyle({
      id: existing?.id || uid('custom-style'),
      name: draft.name,
      prompt: draft.prompt,
      reference: draft.reference,
      referenceAssetId: draft.referenceAssetId,
      referenceName: draft.referenceName,
      palette: existing?.palette,
      createdAt: existing?.createdAt,
      updatedAt: new Date().toISOString()
    });
    if (!normalized) {
      setStatus('自定义风格数据不完整，请检查图片和 Prompt', 'error');
      return;
    }
    if (existingIndex >= 0) state.customObjectStyles.splice(existingIndex, 1, normalized);
    else state.customObjectStyles.push(normalized);
    state.selectedObjectTemplate = normalized.id;
    state.customStyleEditorOpen = false;
    resetCustomStyleDraft();
    savePreferences();
    scheduleProjectSave(0);
    renderTemplatePanel();
    setStatus(existing ? `已更新自定义风格「${normalized.name}」` : `已创建自定义风格「${normalized.name}」`, 'success');
  }

  async function customStyleJson(style) {
    let dataUrl = style.reference;
    if (style.referenceAssetId) {
      const record = await readAssetRecord(style.referenceAssetId);
      if (record?.originalBlob) dataUrl = await fileToDataUrl(record.originalBlob);
    }
    return {
      format: 'tabbit-poster-diy-custom-style',
      version: 1,
      exportedAt: new Date().toISOString(),
      style: {
        id: style.id,
        name: style.name,
        prompt: style.prompt,
        palette: [...style.palette],
        reference: {
          name: style.referenceName,
          dataUrl
        },
        createdAt: style.createdAt,
        updatedAt: style.updatedAt
      }
    };
  }

  async function exportCustomStyle(styleId) {
    const style = state.customObjectStyles.find(item => item.id === styleId);
    if (!style) return;
    const json = JSON.stringify(await customStyleJson(style), null, 2);
    downloadBlob(
      new Blob([json], { type: 'application/json;charset=utf-8' }),
      `poster-diy-style-${safeFileName(style.name, 'custom-style')}.json`
    );
    setStatus(`已导出自定义风格「${style.name}」，JSON 内含 Prompt 和参考图`, 'success');
  }

  async function importCustomStyleFile(file) {
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      setStatus('自定义风格 JSON 请控制在 25MB 以内', 'error');
      return;
    }
    try {
      const parsed = JSON.parse(await file.text());
      const rawStyle = parsed?.format === 'tabbit-poster-diy-custom-style'
        ? parsed.style
        : parsed?.style || parsed;
      const style = normalizeCustomStyle(rawStyle, { newId: true });
      if (!style) throw new Error('JSON 缺少有效的 name、prompt 或 reference 图片');
      const asset = await createImageAsset(style.reference);
      style.referenceAssetId = asset.id;
      style.reference = asset.previewSrc;
      style.name = state.customObjectStyles.some(item => item.name === style.name)
        ? `${style.name}（导入）`.slice(0, 48)
        : style.name;
      state.customObjectStyles.push(style);
      state.selectedObjectTemplate = style.id;
      state.customStyleEditorOpen = false;
      resetCustomStyleDraft();
      savePreferences();
      scheduleProjectSave(0);
      renderTemplatePanel();
      setStatus(`已导入并选中自定义风格「${style.name}」`, 'success');
    } catch (error) {
      setStatus(error?.message || '自定义风格 JSON 解析失败', 'error');
    }
  }

  function deleteCustomStyle(styleId) {
    const index = state.customObjectStyles.findIndex(item => item.id === styleId);
    if (index < 0) return;
    const [style] = state.customObjectStyles.splice(index, 1);
    delete state.selectedObjectReferenceIds[style.id];
    if (state.selectedObjectTemplate === style.id) {
      state.selectedObjectTemplate = OBJECT_TEMPLATES[0].id;
    }
    if (state.customStyleDraft.editingId === style.id) {
      state.customStyleEditorOpen = false;
      resetCustomStyleDraft();
    }
    trimInactiveAssetUrls();
    savePreferences();
    scheduleProjectSave(0);
    renderTemplatePanel();
    setStatus(`已删除自定义风格「${style.name}」`, 'neutral');
  }

  function isImageFile(file) {
    return Boolean(
      file
      && (
        file.type?.startsWith('image/')
        || /\.(?:avif|gif|jpe?g|png|webp)$/i.test(file.name || '')
      )
    );
  }

  function loadImage(src, cors) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      if (cors && /^https?:\/\//i.test(src)) image.crossOrigin = 'anonymous';
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('图片加载失败'));
      image.src = src;
    });
  }

  async function loadImageSource(source, cors) {
    if (!(source instanceof Blob)) return loadImage(source, cors);
    const url = URL.createObjectURL(source);
    try {
      return await loadImage(url, false);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  function base64ImageToBlob(value, fallbackMime) {
    const raw = String(value || '');
    const commaIndex = raw.startsWith('data:') ? raw.indexOf(',') : -1;
    const header = commaIndex >= 0 ? raw.slice(0, commaIndex) : '';
    const mimeMatch = header.match(/^data:([^;,]+)/i);
    const mime = mimeMatch?.[1] || fallbackMime || 'image/png';
    const encodedValue = commaIndex >= 0 ? raw.slice(commaIndex + 1) : raw;
    const encoded = /\s/.test(encodedValue) ? encodedValue.replace(/\s+/g, '') : encodedValue;
    if (!encoded) throw new Error('图片 Base64 为空');
    const parts = [];
    const chunkSize = 256 * 1024;
    for (let offset = 0; offset < encoded.length; offset += chunkSize) {
      const end = Math.min(encoded.length, offset + chunkSize);
      const alignedEnd = end < encoded.length ? end - ((end - offset) % 4) : end;
      const binary = atob(encoded.slice(offset, alignedEnd));
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
      parts.push(bytes);
      offset = alignedEnd - chunkSize;
    }
    return new Blob(parts, { type: mime });
  }

  async function imageSourceToBlob(src, fallbackMime) {
    if (src instanceof Blob) return src;
    if (/^data:image\//i.test(String(src || ''))) return base64ImageToBlob(src, fallbackMime);
    if (/^(?:blob:|https?:)/i.test(String(src || ''))) {
      const response = await fetch(src, { credentials: 'omit' });
      if (!response.ok) throw new Error(`图片读取失败（${response.status}）`);
      const blob = await response.blob();
      if (!/^image\//i.test(blob.type || '')) throw new Error('资源不是有效图片');
      return blob;
    }
    throw new Error('不支持的图片来源');
  }

  function canvasBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error('图片预览编码失败'));
      }, type, quality);
    });
  }

  async function createAssetVariants(blob) {
    const temporaryUrl = URL.createObjectURL(blob);
    const canvas = document.createElement('canvas');
    try {
      const image = await loadImage(temporaryUrl, false);
      const width = Math.max(1, image.naturalWidth || image.width);
      const height = Math.max(1, image.naturalHeight || image.height);
      const makeVariant = async (longEdge, quality) => {
        const scale = Math.min(1, longEdge / Math.max(width, height));
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));
        const context = canvas.getContext('2d', { alpha: true });
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        return canvasBlob(canvas, 'image/webp', quality);
      };
      const previewBlob = Math.max(width, height) > ASSET_PREVIEW_LONG_EDGE
        ? await makeVariant(ASSET_PREVIEW_LONG_EDGE, 0.9)
        : blob;
      const thumbnailBlob = await makeVariant(ASSET_THUMB_LONG_EDGE, 0.82);
      return { width, height, previewBlob, thumbnailBlob };
    } finally {
      URL.revokeObjectURL(temporaryUrl);
      canvas.width = 0;
      canvas.height = 0;
    }
  }

  function cacheAssetUrl(assetId, variant, blob) {
    const key = `${assetId}:${variant}`;
    const existing = assetUrlCache.get(key);
    if (existing) {
      existing.lastUsed = Date.now();
      return existing.url;
    }
    const url = URL.createObjectURL(blob);
    assetUrlCache.set(key, { url, variant, lastUsed: Date.now() });
    if (variant === 'original') {
      const originals = [...assetUrlCache.entries()]
        .filter(([, entry]) => entry.variant === 'original')
        .sort((a, b) => b[1].lastUsed - a[1].lastUsed);
      originals.slice(ORIGINAL_URL_CACHE_LIMIT).forEach(([cacheKey, entry]) => {
        URL.revokeObjectURL(entry.url);
        assetUrlCache.delete(cacheKey);
      });
    }
    return url;
  }

  function cachedAssetUrl(assetId, variant) {
    const entry = assetUrlCache.get(`${assetId}:${variant}`);
    if (!entry) return '';
    entry.lastUsed = Date.now();
    return entry.url;
  }

  async function assetUrl(assetId, variant = 'preview') {
    const cached = cachedAssetUrl(assetId, variant);
    if (cached) return cached;
    const record = await readAssetRecord(assetId);
    if (!record) throw new Error(`图片资源不存在：${assetId}`);
    const blob = variant === 'thumbnail'
      ? record.thumbnailBlob || record.previewBlob || record.originalBlob
      : variant === 'original'
        ? record.originalBlob || record.previewBlob
        : record.previewBlob || record.originalBlob;
    if (!blob) {
      if (record.persistentUrl) return record.persistentUrl;
      throw new Error(`图片资源内容缺失：${assetId}`);
    }
    return cacheAssetUrl(assetId, variant, blob);
  }

  async function createImageAsset(source, metadata = {}) {
    const originalBlob = await imageSourceToBlob(source, metadata.mime);
    const variants = await createAssetVariants(originalBlob);
    const id = metadata.id || uid('asset');
    const record = await writeAssetRecord({
      id,
      originalBlob,
      previewBlob: variants.previewBlob,
      thumbnailBlob: variants.thumbnailBlob,
      mime: originalBlob.type || metadata.mime || 'image/png',
      width: variants.width,
      height: variants.height,
      byteSize: originalBlob.size,
      persistentUrl: metadata.persistentUrl || '',
      createdAt: Date.now()
    });
    return {
      id,
      width: record.width,
      height: record.height,
      previewSrc: metadata.cacheRuntime === false
        ? ''
        : cacheAssetUrl(id, 'preview', record.previewBlob || record.originalBlob),
      thumbnailSrc: metadata.cacheRuntime === false
        ? ''
        : cacheAssetUrl(id, 'thumbnail', record.thumbnailBlob || record.previewBlob || record.originalBlob)
    };
  }

  async function imageAssetDescriptor(assetId, cacheRuntime = true) {
    const record = await readAssetRecord(assetId);
    if (!record) throw new Error(`图片资源不存在：${assetId}`);
    return {
      id: assetId,
      width: record.width,
      height: record.height,
      previewSrc: cacheRuntime ? await assetUrl(assetId, 'preview') : '',
      thumbnailSrc: cacheRuntime ? await assetUrl(assetId, 'thumbnail') : ''
    };
  }

  async function hydrateLayerRuntime(layer) {
    if (!layer?.assetId) return layer;
    layer.src = await assetUrl(layer.assetId, 'preview');
    layer.thumbnailSrc = await assetUrl(layer.assetId, 'thumbnail');
    return layer;
  }

  async function layerOriginalSource(layer) {
    return assetUrl(layer?.assetId, 'original');
  }

  function revokeAllAssetUrls() {
    assetUrlCache.forEach(entry => URL.revokeObjectURL(entry.url));
    assetUrlCache.clear();
  }

  function trimInactiveAssetUrls() {
    const activeAssetIds = new Set([
      ...state.layers.map(layer => layer.assetId),
      state.source?.assetId,
      ...state.customObjectStyles.map(style => style.referenceAssetId)
    ].filter(Boolean));
    assetUrlCache.forEach((entry, key) => {
      if (entry.variant === 'original') return;
      const separator = key.lastIndexOf(':');
      const assetId = separator >= 0 ? key.slice(0, separator) : key;
      if (activeAssetIds.has(assetId)) return;
      URL.revokeObjectURL(entry.url);
      assetUrlCache.delete(key);
    });
  }

  async function setSourceImage(src, name, dimensions) {
    let width = Number(dimensions?.width) || 0;
    let height = Number(dimensions?.height) || 0;
    let sourceSrc = src;
    let assetId = dimensions?.assetId || '';
    try {
      const asset = assetId
        ? await imageAssetDescriptor(assetId)
        : await createImageAsset(src);
      assetId = asset.id;
      sourceSrc = asset.previewSrc;
      width = asset.width;
      height = asset.height;
    } catch (error) {
      if (!/^https?:\/\//i.test(String(src || ''))) throw error;
      debug('remote source kept without local asset', error);
    }
    if (!width || !height) {
      const image = await loadImage(sourceSrc, false);
      width = image.naturalWidth || image.width;
      height = image.naturalHeight || image.height;
    }
    state.source = {
      assetId,
      src: sourceSrc,
      name: name || '页面引用图片',
      width: Math.max(1, Math.round(width)),
      height: Math.max(1, Math.round(height))
    };
    trimInactiveAssetUrls();
    setGenerationAspectRatio(closestAspectRatio(width, height));
    state.analyzedSource = '';
    if (
      !state.objectPrompt.trim()
      || state.objectPrompt === REFERENCE_SUBJECT_PROMPT
      || state.objectPrompt === FULL_IMAGE_DEFAULT_PROMPT
    ) {
      state.objectPrompt = state.objectGenerationMode === 'full'
        ? FULL_IMAGE_DEFAULT_PROMPT
        : REFERENCE_SUBJECT_PROMPT;
    }
  }

  async function setSourceFromFile(file, options) {
    if (!isImageFile(file)) {
      setStatus('请选择 PNG、JPG、WebP、GIF 或 AVIF 图片', 'error');
      return false;
    }
    try {
      await setSourceImage(file, file.name);
      renderTemplatePanel();
      savePreferences();
      setStatus(
        `${options?.source === 'drop' ? '已通过拖拽载入' : '主体参考图已载入'}，已匹配比例 ${
          state.generationAspectRatio
        }（2K ${state.generationSize.width} × ${state.generationSize.height}）`,
        'success'
      );
      return true;
    } catch (error) {
      setStatus(error?.message || '图片读取失败', 'error');
      return false;
    }
  }

  async function urlToDataUrl(url) {
    if (!url || /^data:image\//i.test(url)) return url;
    const response = await fetch(url, { credentials: 'omit' });
    if (!response.ok) throw new Error(`参考图读取失败（${response.status}）`);
    const blob = await response.blob();
    if (!/^image\//i.test(blob.type || '')) {
      throw new Error(`参考图返回了非图片内容（${blob.type || 'unknown'}）`);
    }
    return fileToDataUrl(new File([blob], 'reference', { type: blob.type || 'image/png' }));
  }

  function normalizePageImage(img) {
    const src = img.currentSrc || img.src || '';
    if (/^https?:\/\//i.test(src) || /^data:image\//i.test(src)) return src;
    if (/^blob:/i.test(src)) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d').drawImage(img, 0, 0);
        return canvas.toDataURL('image/png');
      } catch (_) {
        return src;
      }
    }
    return src;
  }

  async function nextFrame() {
    await new Promise(resolve => requestAnimationFrame(resolve));
  }

  function featherTransparentCanvas(source, radius) {
    const amount = clamp(Number(radius) || 0, 0, 24);
    if (amount < 0.5) return source;
    const mask = document.createElement('canvas');
    mask.width = source.width;
    mask.height = source.height;
    const maskCtx = mask.getContext('2d');
    maskCtx.filter = `blur(${amount}px)`;
    maskCtx.drawImage(source, 0, 0);
    const output = document.createElement('canvas');
    output.width = source.width;
    output.height = source.height;
    const outputCtx = output.getContext('2d');
    outputCtx.drawImage(source, 0, 0);
    outputCtx.globalCompositeOperation = 'destination-in';
    outputCtx.drawImage(mask, 0, 0);
    outputCtx.globalCompositeOperation = 'source-over';
    return output;
  }

  async function removeFlatBackground(src, options) {
    if (!src) return { src, removed: false, reason: 'empty-source' };
    const allowNeutral = Boolean(options?.allowNeutral);
    const retention = clamp(Number(options?.retention ?? DEFAULT_CUTOUT_RETENTION), 0, 100);
    const feather = clamp(Number(options?.feather) || 0, 0, 24);
    const cropOutput = options?.crop !== false;
    let editableSrc = src;
    if (/^https?:\/\//i.test(src)) {
      try {
        editableSrc = await urlToDataUrl(src);
      } catch (_) {
        editableSrc = src;
      }
    }
    let image;
    try {
      image = await loadImage(editableSrc, true);
    } catch (_) {
      return { src, removed: false, reason: 'image-load-failed' };
    }
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    try {
      ctx.drawImage(image, 0, 0);
    } catch (_) {
      return { src, removed: false, reason: 'canvas-draw-failed' };
    }
    if (retention >= 100) {
      const sourceWidth = canvas.width;
      const sourceHeight = canvas.height;
      const blob = await canvasBlob(canvas, 'image/png');
      canvas.width = 0;
      canvas.height = 0;
      return {
        src: blob,
        restoreSrc: blob,
        removed: true,
        reason: 'retention-full',
        sourceWidth,
        sourceHeight,
        cropX: 0,
        cropY: 0,
        cropWidth: sourceWidth,
        cropHeight: sourceHeight,
        retention,
        feather: 0
      };
    }
    let imageData;
    try {
      imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    } catch (_) {
      return { src, removed: false, reason: 'canvas-pixel-access-failed' };
    }
    const data = imageData.data;
    const width = canvas.width;
    const height = canvas.height;
    const totalPixels = width * height;
    const borderStep = Math.max(1, Math.floor(Math.min(width, height) / 96));
    const borderPixels = [];
    for (let x = 0; x < width; x += borderStep) {
      borderPixels.push(x, (height - 1) * width + x);
    }
    for (let y = borderStep; y < height - borderStep; y += borderStep) {
      borderPixels.push(y * width, y * width + width - 1);
    }
    const opaqueBorder = borderPixels.filter(pixel => data[pixel * 4 + 3] > 24);
    if (opaqueBorder.length < borderPixels.length * 0.16) {
      return {
        src: editableSrc,
        restoreSrc: editableSrc,
        removed: true,
        reason: 'already-transparent'
      };
    }
    const median = values => {
      values.sort((a, b) => a - b);
      return values[Math.floor(values.length / 2)] || 0;
    };
    const key = [0, 1, 2].map(channel => median(
      opaqueBorder.map(pixel => data[pixel * 4 + channel])
    ));
    const maxKey = Math.max(...key);
    const minKey = Math.min(...key);
    const keyIsChromatic = maxKey - minKey >= 24;
    if (!keyIsChromatic && !allowNeutral) {
      return { src: editableSrc, removed: false, reason: 'background-not-chromatic' };
    }

    const keyIsMagenta = key[0] > key[1] * 1.16 && key[2] > key[1] * 1.12;
    const keyIsGreen = key[1] > key[0] * 1.16 && key[1] > key[2] * 1.16;
    const borderSpread = median(opaqueBorder.map(pixel => {
      const index = pixel * 4;
      return Math.hypot(
        data[index] - key[0],
        data[index + 1] - key[1],
        data[index + 2] - key[2]
      );
    }));
    const retentionFactor = 1.4 - retention * 0.008;
    const genericDistanceThreshold = clamp(
      (30 + borderSpread * 2.8) * retentionFactor,
      20,
      150
    );
    const chromaticDistanceThreshold = clamp(228 - retention, 128, 228);
    const chromaticDominanceThreshold = 12 + retention * 0.2;
    const greenDominanceThreshold = 14 + retention * 0.2;
    const backgroundMask = new Uint8Array(totalPixels);
    const queue = new Uint32Array(totalPixels);
    let queueHead = 0;
    let queueTail = 0;

    const isBackgroundCandidate = pixel => {
      const index = pixel * 4;
      if (data[index + 3] < 24) return true;
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      const dr = r - key[0];
      const dg = g - key[1];
      const db = b - key[2];
      const distance = Math.sqrt(dr * dr + dg * dg + db * db);
      if (distance < (keyIsChromatic ? chromaticDistanceThreshold : genericDistanceThreshold)) return true;
      if (keyIsMagenta) {
        const magentaDominance = (r + b) / 2 - g;
        return r > 88 && b > 78
          && magentaDominance > chromaticDominanceThreshold
          && Math.abs(r - b) < 176;
      }
      if (keyIsGreen) {
        const greenDominance = g - (r + b) / 2;
        return g > 88 && greenDominance > greenDominanceThreshold;
      }
      return false;
    };

    const enqueue = pixel => {
      if (backgroundMask[pixel] || !isBackgroundCandidate(pixel)) return;
      backgroundMask[pixel] = 1;
      queue[queueTail++] = pixel;
    };

    for (let x = 0; x < width; x += 1) {
      enqueue(x);
      enqueue((height - 1) * width + x);
    }
    for (let y = 1; y < height - 1; y += 1) {
      enqueue(y * width);
      enqueue(y * width + width - 1);
    }

    while (queueHead < queueTail) {
      const pixel = queue[queueHead++];
      const x = pixel % width;
      const y = Math.floor(pixel / width);
      if (x > 0) enqueue(pixel - 1);
      if (x + 1 < width) enqueue(pixel + 1);
      if (y > 0) enqueue(pixel - width);
      if (y + 1 < height) enqueue(pixel + width);
      if (queueHead % 220000 === 0) await nextFrame();
    }

    let enclosedKeyPixels = 0;
    if (keyIsMagenta || keyIsGreen) {
      for (let pixel = 0; pixel < totalPixels; pixel += 1) {
        if (backgroundMask[pixel]) continue;
        const index = pixel * 4;
        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];
        const matchesKeyFamily = keyIsMagenta
          ? r > 88 && b > 78
            && (r + b) / 2 - g > chromaticDominanceThreshold
            && Math.abs(r - b) < 176
          : g > 88 && g - (r + b) / 2 > greenDominanceThreshold;
        if (matchesKeyFamily) {
          backgroundMask[pixel] = 1;
          enclosedKeyPixels += 1;
        }
        if (pixel > 0 && pixel % 420000 === 0) await nextFrame();
      }
    }

    const backgroundRatio = (queueTail + enclosedKeyPixels) / totalPixels;
    if (backgroundRatio < 0.035 || backgroundRatio > 0.985) {
      return { src: editableSrc, removed: false, reason: 'background-segmentation-unsafe' };
    }

    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    for (let pixel = 0; pixel < totalPixels; pixel += 1) {
      const index = pixel * 4;
      if (backgroundMask[pixel]) {
        data[index + 3] = 0;
        continue;
      }
      if (data[index + 3] <= 16) continue;
      const x = pixel % width;
      const y = Math.floor(pixel / width);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      if (keyIsMagenta) {
        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];
        const magentaDominance = Math.max(0, (r + b) / 2 - g);
        if (magentaDominance > 18) {
          const despill = clamp(magentaDominance / 180, 0, 0.42);
          const neutral = Math.min(r, b);
          data[index] = Math.round(r * (1 - despill) + neutral * despill);
          data[index + 2] = Math.round(b * (1 - despill) + neutral * despill);
        }
      }
      if (pixel > 0 && pixel % 420000 === 0) await nextFrame();
    }
    ctx.putImageData(imageData, 0, 0);

    if (maxX < minX || maxY < minY) {
      return { src: editableSrc, removed: false, reason: 'empty-foreground' };
    }
    const padding = Math.max(8, Math.round(Math.min(width, height) * 0.018));
    const cropX = cropOutput ? Math.max(0, minX - padding) : 0;
    const cropY = cropOutput ? Math.max(0, minY - padding) : 0;
    const cropWidth = cropOutput
      ? Math.min(width - cropX, maxX - minX + 1 + padding * 2)
      : width;
    const cropHeight = cropOutput
      ? Math.min(height - cropY, maxY - minY + 1 + padding * 2)
      : height;
    const output = document.createElement('canvas');
    output.width = cropWidth;
    output.height = cropHeight;
    output.getContext('2d').drawImage(
      canvas,
      cropX, cropY, cropWidth, cropHeight,
      0, 0, cropWidth, cropHeight
    );
    const featheredOutput = featherTransparentCanvas(output, feather);
    const restoreOutput = document.createElement('canvas');
    restoreOutput.width = cropWidth;
    restoreOutput.height = cropHeight;
    restoreOutput.getContext('2d').drawImage(
      image,
      cropX, cropY, cropWidth, cropHeight,
      0, 0, cropWidth, cropHeight
    );
    debug('background removed', { key, backgroundRatio, cropWidth, cropHeight });
    const outputBlob = await canvasBlob(featheredOutput, 'image/png');
    const restoreBlob = cropOutput
      ? await canvasBlob(restoreOutput, 'image/png')
      : editableSrc;
    canvas.width = 0;
    canvas.height = 0;
    output.width = 0;
    output.height = 0;
    if (featheredOutput !== output) {
      featheredOutput.width = 0;
      featheredOutput.height = 0;
    }
    restoreOutput.width = 0;
    restoreOutput.height = 0;
    return {
      src: outputBlob,
      restoreSrc: restoreBlob,
      removed: true,
      reason: keyIsChromatic ? 'edge-connected-chroma' : 'edge-connected-solid',
      backgroundRatio,
      sourceWidth: width,
      sourceHeight: height,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      retention,
      feather
    };
  }

  function generationImage(result) {
    if (!result || result.success === false) {
      throw new Error(result?.error_message || result?.message || '图片生成失败');
    }
    const b64 = Array.isArray(result.b64_json) ? result.b64_json[0] : result.b64_json;
    if (b64) {
      return {
        src: /^data:image\//i.test(b64) ? b64 : `data:image/png;base64,${b64}`,
        persistentUrl: result.image_url || ''
      };
    }
    const url = (Array.isArray(result.image_urls) && result.image_urls[0]) || result.image_url || '';
    if (!url) throw new Error('生成结果中没有可用图片');
    return { src: url, persistentUrl: url };
  }

  async function buildReferenceOptions(sources) {
    const urls = [];
    const base64s = [];
    for (const source of sources.filter(Boolean).slice(0, 14)) {
      if (source && typeof source === 'object' && source.assetId) {
        try {
          const record = await readAssetRecord(source.assetId);
          if (record?.originalBlob) {
            base64s.push(await fileToDataUrl(record.originalBlob));
            continue;
          }
        } catch (error) {
          debug('asset reference skipped', source.assetId, error);
          continue;
        }
      }
      const value = typeof source === 'string' ? source : source.src;
      const forceBase64 = Boolean(source && typeof source === 'object' && source.forceBase64);
      if (!value) continue;
      if (/^data:image\//i.test(value)) {
        base64s.push(value);
      } else if (/^https?:\/\//i.test(value) && !forceBase64) {
        urls.push(value);
      } else {
        try {
          base64s.push(await urlToDataUrl(value));
        } catch (error) {
          debug('reference skipped', value, error);
        }
      }
    }
    const options = {};
    if (urls.length === 1 && base64s.length === 0) options.reference_image_url = urls[0];
    if (urls.length > 1 || (urls.length > 0 && base64s.length > 0)) {
      options.reference_image_urls = urls;
    }
    if (base64s.length === 1 && urls.length === 0) {
      options.reference_image_base64 = base64s[0];
    }
    if (base64s.length > 1 || (base64s.length > 0 && urls.length > 0)) {
      options.reference_image_base64s = base64s;
    }
    return options;
  }

  function isGeneratedLayer(layer) {
    return Boolean(layer?.generated) || ['object', 'text', 'full-image'].includes(layer?.kind);
  }

  function generatedLayerPlacement(width, height) {
    const previous = [...state.layers].reverse().find(isGeneratedLayer) || null;
    if (!previous) {
      return {
        previous: null,
        x: state.canvas.width / 2,
        y: state.canvas.height / 2
      };
    }
    const gap = Math.max(28, Math.min(state.canvas.width, state.canvas.height) * 0.045);
    const previousWidth = previous.width * Math.abs(previous.scale || 1);
    return {
      previous,
      x: previous.x + previousWidth / 2 + width / 2 + gap,
      y: previous.y
    };
  }

  async function addImageLayer(src, meta) {
    const localAssets = new Map();
    const ensureAsset = async (source, assetId, metadata) => {
      if (assetId) return imageAssetDescriptor(assetId, metadata?.cacheRuntime !== false);
      if (localAssets.has(source)) return localAssets.get(source);
      const promise = createImageAsset(source, metadata);
      localAssets.set(source, promise);
      return promise;
    };
    const activeAsset = await ensureAsset(src, meta?.assetId, {
      persistentUrl: meta?.persistentUrl || '',
      cacheRuntime: true
    });
    const restoreSource = meta?.restoreSrc || src;
    const restoreAsset = await ensureAsset(
      restoreSource,
      meta?.restoreAssetId,
      { cacheRuntime: false }
    );
    const originalSource = meta?.originalSrc || restoreSource;
    const originalAsset = await ensureAsset(
      originalSource,
      meta?.originalAssetId,
      { persistentUrl: meta?.persistentUrl || '', cacheRuntime: false }
    );
    const intrinsicWidth = activeAsset.width || 1024;
    const intrinsicHeight = activeAsset.height || 1024;
    const maxWidth = state.canvas.width * (
      meta?.kind === 'text' ? 0.78 : meta?.kind === 'full-image' ? 0.9 : 0.68
    );
    const maxHeight = state.canvas.height * (
      meta?.kind === 'text' ? 0.38 : meta?.kind === 'full-image' ? 0.9 : 0.64
    );
    const fit = Math.min(maxWidth / intrinsicWidth, maxHeight / intrinsicHeight, 1);
    const width = Math.max(60, intrinsicWidth * fit);
    const height = Math.max(60, intrinsicHeight * fit);
    const placement = meta?.placeNextToGenerated
      ? generatedLayerPlacement(width, height)
      : {
          previous: null,
          x: Number.isFinite(meta?.x) ? meta.x : state.canvas.width / 2,
          y: Number.isFinite(meta?.y) ? meta.y : state.canvas.height / 2
        };
    const layer = {
      id: uid('layer'),
      name: meta?.name || `图片 ${state.layers.length + 1}`,
      assetId: activeAsset.id,
      restoreAssetId: restoreAsset.id,
      originalAssetId: originalAsset.id,
      src: activeAsset.previewSrc,
      thumbnailSrc: activeAsset.thumbnailSrc,
      persistentUrl: meta?.persistentUrl || '',
      kind: meta?.kind || 'image',
      templateId: meta?.templateId || '',
      prompt: meta?.prompt || '',
      text: meta?.text || '',
      generated: Boolean(meta?.generated),
      groupId: '',
      cutoutSettings: meta?.cutoutSettings ? { ...meta.cutoutSettings } : undefined,
      x: placement.x,
      y: placement.y,
      width,
      height,
      scale: 1,
      rotation: 0,
      opacity: 1,
      visible: meta?.visible !== false,
      flipX: 1,
      flipY: 1,
      revisions: []
    };
    pushUndo();
    state.layers.push(layer);
    state.selectedLayerId = layer.id;
    state.selectedLayerIds = [layer.id];
    renderCanvas();
    renderLayersPanel();
    renderToolbarState();
    scheduleProjectSave();
    if (meta?.placeNextToGenerated) {
      requestAnimationFrame(() => focusWorkspaceLayers(
        placement.previous ? [placement.previous, layer] : [layer],
        { onlyZoomOut: true }
      ));
    }
    return layer;
  }

  async function replaceLayerImageAssets(layer, src, metadata = {}) {
    const localAssets = new Map();
    const ensureAsset = async (source, assetId, options) => {
      if (assetId) return imageAssetDescriptor(assetId, options?.cacheRuntime !== false);
      if (localAssets.has(source)) return localAssets.get(source);
      const promise = createImageAsset(source, options);
      localAssets.set(source, promise);
      return promise;
    };
    const active = await ensureAsset(src, metadata.assetId, {
      persistentUrl: metadata.persistentUrl || '',
      cacheRuntime: true
    });
    const restoreSource = metadata.restoreSrc || src;
    const restore = await ensureAsset(
      restoreSource,
      metadata.restoreAssetId,
      { cacheRuntime: false }
    );
    const originalSource = metadata.originalSrc || restoreSource;
    const original = await ensureAsset(originalSource, metadata.originalAssetId, {
      persistentUrl: metadata.persistentUrl || '',
      cacheRuntime: false
    });
    layer.assetId = active.id;
    layer.restoreAssetId = restore.id;
    layer.originalAssetId = original.id;
    layer.src = active.previewSrc;
    layer.thumbnailSrc = active.thumbnailSrc;
    layer.persistentUrl = metadata.persistentUrl || layer.persistentUrl || '';
    return layer;
  }

  async function generateTemplateAsset(kind) {
    if (state.busy) return;
    if (!hasAsyncImageBridge()) {
      setStatus('当前页面未检测到 LLMBridge.createImageTask / getImageTask；画板功能仍可使用', 'error');
      return;
    }

    const isText = kind === 'text';
    const template = isText
      ? getTemplate('text', state.selectedTextTemplate)
      : getTemplate('object', state.selectedObjectTemplate);
    const text = state.textValue.trim();
    const userPrompt = state.objectPrompt.trim();
    const fullImageMode = !isText && state.objectGenerationMode === 'full';
    const hasSource = Boolean(state.source?.src);
    const requestedRatio = supportedAspectRatio(state.generationAspectRatio);
    const requestedSize = seedreamSizeForAspectRatio(requestedRatio);
    if (isText && !text) {
      setStatus('请先输入要绘制的文字', 'error');
      refs.textInput?.focus();
      return;
    }
    if (!isText && !userPrompt && !state.source) {
      setStatus(
        fullImageMode
          ? '请描述要生成的完整画面，或上传一张图片作为参考'
          : '请描述要生成的主体，或上传一张图片作为参考',
        'error'
      );
      refs.objectPrompt?.focus();
      return;
    }

    const serial = ++generationSerial;
    state.busy = isText ? 'text' : 'object';
    renderTemplatePanel();
    renderToolbarState();
    setStatus(
      isText
        ? '正在绘制艺术字体…'
        : fullImageMode
          ? hasSource
            ? '正在将整张图片转换为插画…'
            : '正在根据描述绘制完整插画…'
          : '正在生成透明插画物体…',
      'working'
    );

    try {
      const templateRef = generationTemplateReference(template, fullImageMode);
      const sourceRefs = [];
      let templateReferenceRole = 'none';
      if (isText) {
        if (templateRef) {
          sourceRefs.push({
            src: templateRef,
            forceBase64: true
          });
          templateReferenceRole = 'style-only';
        }
      } else if (state.source?.src) {
        sourceRefs.push(state.source);
        if (templateRef) {
          sourceRefs.push({
            src: templateRef,
            forceBase64: true
          });
          templateReferenceRole = 'second-image-style-only';
        } else {
          templateReferenceRole = 'prompt-only';
          debug('object template image unavailable; using prompt-only style guidance');
        }
      } else if (templateRef) {
        sourceRefs.push({
          src: templateRef,
          forceBase64: true
        });
        templateReferenceRole = 'first-image-style-only';
      }
      const referenceOptions = await buildReferenceOptions(sourceRefs);
      const styleStrengthInstruction = [
        `Style strength: ${state.objectStyleStrength}/100.`,
        state.objectStyleStrength < 35
          ? 'Apply the selected illustration language subtly; preserve source identity and colors, but still obey the template-specific abstraction and detail limits.'
          : state.objectStyleStrength < 85
            ? 'Apply a balanced style transformation while keeping source identity and spatial relationships stable; the selected template, not the source photo, decides how much detail remains.'
            : 'Apply the selected illustration language strongly and consistently while preserving recognizable content and composition.'
      ].join(' ');
      const fullImageUserPrompt = hasSource
        ? userPrompt && userPrompt !== REFERENCE_SUBJECT_PROMPT
          ? userPrompt
          : FULL_IMAGE_DEFAULT_PROMPT
        : userPrompt;
      const subjectInstruction = isText
        ? [
            `Primary request: 将文字“${text}”绘制成一张独立艺术字体图片。`,
            templateReferenceRole === 'style-only'
              ? 'Image 1 is a typography style sample only. Ignore its literal words and never copy its text content.'
              : '',
            'TYPOGRAPHY-ONLY FOREGROUND RULE: every non-background pixel must be part of the requested text glyph strokes. Output no paper, photo, scene, object, person, animal, pen, speech bubble, underline, arrow, star, raindrop, illustration, signature, Latin caption or other decorative mark.',
            'Use the reference only to learn letterform proportions, stroke pressure, rhythm and texture. Completely ignore and remove every non-glyph element visible in the reference image.',
            template.prompt,
            `Layout instruction: ${state.textLayoutPrompt.trim() || '保持清晰、完整、易于在海报中排版。'}`,
            `Text (verbatim): "${text}"`,
            `Text accuracy: 必须逐字准确，只出现一次，不要增加任何其他文字。`
          ].join('\n')
        : fullImageMode && hasSource
          ? [
              'Image 1 is the authoritative complete-image reference.',
              templateReferenceRole === 'second-image-style-only'
                ? 'Image 2 is a STYLE SAMPLE ONLY. Never copy its objects, subject, composition, text or background layout.'
                : '',
              'Transform the ENTIRE image into one coherent illustration, including the main subject, secondary objects, environment and background.',
              'Apply the selected visual language across the full frame, not only to the foreground subject.',
              'Preserve the camera viewpoint, composition, spatial layout, subject identity and every important background element.',
              'If the requested aspect ratio differs from Image 1, extend the outer background naturally; never crop away source content.',
              'Do not isolate the subject. Do not remove, replace, simplify away or turn the background into a flat color.',
              'Selected visual language:',
              fullImageStylePrompt(template),
              'Ignore every transparent-asset, isolated-object, single-subject, no-scene and no-background constraint from the object template.',
              styleStrengthInstruction,
              `Additional user instruction: ${fullImageUserPrompt}`,
              'FINAL SCOPE RULE: stylize all visible pixels from edge to edge—foreground, secondary objects, environment and background—with one consistent treatment.'
            ].filter(Boolean).join('\n')
          : fullImageMode
            ? [
                'No content image is supplied. Create a brand-new complete illustration from the written scene request.',
                templateReferenceRole === 'first-image-style-only'
                  ? 'Image 1 is a STYLE SAMPLE ONLY. Never copy its objects, subject, composition, text or background layout; use only its line, color, texture and print treatment.'
                  : '',
                `Primary scene request: ${fullImageUserPrompt}`,
                'Create the ENTIRE image as one coherent edge-to-edge scene with a clear foreground, middle ground and background where appropriate.',
                'Do not isolate the main subject, do not create a transparent asset, and do not leave a chroma-key or empty backdrop.',
                'Selected visual language:',
                fullImageStylePrompt(template),
                'Ignore every transparent-asset, isolated-object, single-subject, no-scene and no-background constraint from the object template.',
                styleStrengthInstruction,
                'FINAL SCOPE RULE: fill all visible pixels from edge to edge with one consistent illustration treatment while faithfully following the written scene request.'
              ].filter(Boolean).join('\n')
          : [
            state.source
              ? [
                  'Image 1 is the authoritative subject/content reference.',
                  'Use the main subject from Image 1 by default. Preserve its recognizable structure, pose and proportions, but keep only the minimum identity-defining cues allowed by the selected style; discard incidental surface detail when the template calls for abstraction.',
                  templateReferenceRole === 'second-image-style-only'
                    ? 'Image 2 is a STYLE SAMPLE ONLY. Use only its palette, line treatment, texture and rendering language. Never copy its objects, characters, text, composition or background.'
                    : 'Only Image 1 is supplied for object generation. The selected template prompt defines visual style only.',
                  'Never replace, mix or reinterpret the subject from Image 1 as an object depicted by a style template.',
                  `Additional user instruction: ${userPrompt || REFERENCE_SUBJECT_PROMPT}`
                ].join('\n')
              : [
                  'No subject image is supplied; create the object from the written request.',
                  templateReferenceRole === 'first-image-style-only'
                    ? 'Image 1 is a style sample only. Ignore every object/content shown in it and use only its line, color, texture and print treatment.'
                    : ''
                ].filter(Boolean).join('\n'),
            state.source
              ? 'Primary subject request: redraw the main subject from Image 1 in the selected object style.'
              : `Primary subject request: ${userPrompt}`,
            template.prompt,
            styleStrengthInstruction
          ].join('\n');
      const prompt = fullImageMode
        ? [
            subjectInstruction,
            hasSource
              ? 'Output framing: match Image 1 edge-to-edge at the requested dimensions and aspect ratio.'
              : 'Output framing: compose a complete scene that fills the requested dimensions and aspect ratio edge-to-edge.',
            'No added captions, typography, border or watermark.'
          ].join('\n')
        : [
            subjectInstruction,
            'Scene/backdrop: perfectly flat digital solid #ff00ff chroma-key background for automatic background removal.',
            'CRITICAL BACKGROUND RULE: keep every background pixel exact #ff00ff. Apply paper grain, print texture and distress only inside the subject, never on the background.',
            'Background constraints: one uniform color, no shadow, no gradient, no texture, no reflection, no floor plane, no glow, no color variation.',
            'Keep the complete subject centered with generous padding. Do not use #ff00ff inside the subject. No watermark.'
          ].join('\n');
      const result = await runAsyncImageTask(
        prompt,
        {
          ...imageModelOptions(),
          ...referenceOptions,
          aspect_ratio: isText
            ? '3:2'
            : requestedRatio,
          output_format: 'png',
          response_format: 'b64_json',
          watermark: false,
          sequential_image_generation: 'disabled'
        },
        '图片生成'
      );
      if (serial !== generationSerial) return;
      const generated = generationImage(result);
      setStatus(
        fullImageMode ? '整图插画生成完成，正在加入画板…' : '生成完成，正在自动去除背景…',
        'working'
      );
      const prepared = fullImageMode
        ? { src: generated.src, removed: false }
        : await removeFlatBackground(generated.src, { allowNeutral: isText, crop: false });
      await addImageLayer(prepared.src, {
        name: isText
          ? `${template.name} · ${text}`
          : fullImageMode
            ? `${template.name} · 整图插画`
          : `${template.name} · ${state.source?.name || userPrompt || '参考主体'}`,
        persistentUrl: generated.persistentUrl,
        restoreSrc: generated.src,
        originalSrc: generated.src,
        cutoutSettings: prepared.removed
          ? {
              retention: Number.isFinite(prepared.retention)
                ? prepared.retention
                : DEFAULT_CUTOUT_RETENTION,
              feather: Number.isFinite(prepared.feather) ? prepared.feather : 0
            }
          : undefined,
        kind: isText ? 'text' : fullImageMode ? 'full-image' : 'object',
        templateId: template.id,
        prompt,
        text,
        generated: true,
        placeNextToGenerated: true
      });
      if (fullImageMode) {
        setStatus(
          `已按 ${requestedRatio}（Seedream 2K，约 ${requestedSize.width} × ${requestedSize.height}）生成整图插画`,
          'success'
        );
      } else {
        setStatus(
          prepared.removed
            ? '已自动去底并加入画板，可继续移动、旋转、缩放或 AI 编辑'
            : '图片已加入画板；如仍有背景，可在图层面板点击「智能抠图」',
          prepared.removed ? 'success' : 'error'
        );
      }
    } catch (error) {
      console.error('[Poster DIY] generate failed', error);
      setStatus(error?.message || '生成失败，请稍后重试', 'error');
    } finally {
      if (serial === generationSerial) {
        state.busy = '';
        renderTemplatePanel();
        renderLayersPanel();
        renderToolbarState();
      }
    }
  }

  async function analyzeSource() {
    if (state.busy) return;
    if (!state.source?.src) {
      setStatus('请先上传图片或从页面右上角引用图片', 'error');
      return;
    }
    if (!window.LLMBridge || typeof window.LLMBridge.chat !== 'function') {
      setStatus('当前页面未检测到 LLMBridge.chat', 'error');
      return;
    }
    state.busy = 'analyze';
    renderTemplatePanel();
    const fullImageMode = state.objectGenerationMode === 'full';
    setStatus(
      fullImageMode ? '正在识别整图构图、环境与视觉特征…' : '正在识别参考图主体与视觉特征…',
      'working'
    );
    try {
      let analysisImage = state.source.src;
      if (state.source.assetId) {
        const record = await readAssetRecord(state.source.assetId);
        if (!record?.originalBlob) throw new Error('主体参考图资源不存在');
        analysisImage = await fileToDataUrl(record.originalBlob);
      } else if (/^blob:/i.test(analysisImage)) {
        analysisImage = await urlToDataUrl(analysisImage);
      }
      const prompt = fullImageMode
        ? [
            '分析这张用于整图插画转换的参考图。关注完整画面中的主体、次要物体、环境、背景、构图和空间关系，不分析页面 UI。',
            '返回 JSON：',
            '{"subject":"整图内容概述","recognizable_features":["最多5条必须保留的主体/背景/构图特征"],"palette":["最多5个颜色"],"suggested_prompt":"用于整张图统一风格化的中文短 prompt，80字以内，明确保留全部背景与构图"}',
            '不要提及品牌，不要凭空增加或删除画面内容，不要要求抠图或透明背景。'
          ].join('\n')
        : [
            '分析这张用于海报 DIY 的参考图。只关注可被重绘成独立透明物体的主体，不分析页面 UI。',
            '返回 JSON：',
            '{"subject":"主体","recognizable_features":["最多5条"],"palette":["最多5个颜色"],"suggested_prompt":"用于图生图重绘的中文短 prompt，80字以内"}',
            '不要提及品牌，不要凭空增加主体。'
          ].join('\n');
      const raw = await callWithTimeout(
        () => window.LLMBridge.chat(prompt, {
          response_format: 'json',
          images: [analysisImage]
        }),
        config.chatTimeoutMs,
        '图片分析'
      );
      const parsed = parseJsonResponse(raw);
      state.analyzedSource = [
        parsed.subject,
        Array.isArray(parsed.recognizable_features) ? parsed.recognizable_features.join('、') : '',
        parsed.suggested_prompt
      ].filter(Boolean).join('；');
      if (parsed.suggested_prompt) state.objectPrompt = parsed.suggested_prompt;
      renderTemplatePanel();
      savePreferences();
      setStatus(
        fullImageMode ? '整图已识别，已写入完整画面描述' : '参考图已识别，已写入物体描述',
        'success'
      );
    } catch (error) {
      setStatus(error?.message || '参考图识别失败', 'error');
    } finally {
      state.busy = '';
      renderTemplatePanel();
    }
  }

  async function editSelectedLayer() {
    if (state.busy) return;
    const layer = state.layers.find(item => item.id === state.selectedLayerId);
    const request = state.editPrompt.trim();
    if (!layer) {
      setStatus('请先选择一个生成结果图层', 'error');
      return;
    }
    if (!request) {
      setStatus('请输入本次要修改的内容', 'error');
      refs.editPrompt?.focus();
      return;
    }
    if (!hasAsyncImageBridge()) {
      setStatus('当前页面未检测到 LLMBridge.createImageTask / getImageTask', 'error');
      return;
    }
    state.busy = 'edit';
    renderLayersPanel();
    setStatus('正在根据当前图层继续编辑…', 'working');
    try {
      const referenceOptions = await buildReferenceOptions([{ assetId: layer.assetId }]);
      const fullImageEdit = layer.kind === 'full-image';
      const sourceImage = await loadImage(await layerOriginalSource(layer), false);
      const sourceRatio = closestAspectRatio(
        sourceImage.naturalWidth || sourceImage.width,
        sourceImage.naturalHeight || sourceImage.height
      );
      const prompt = fullImageEdit
        ? [
            'Use case: precise full-image edit.',
            `Primary request: ${request}`,
            'Input image 1 is the complete edit target, including its subject and background.',
            'Change only what the user requested. Preserve the original crop, composition, subject identity, background, style and all unspecified details.',
            'Return a complete edge-to-edge image at the same aspect ratio. Do not isolate the subject or replace the background.',
            'No added text, border or watermark.'
          ].join('\n')
        : [
            'Use case: precise-object-edit',
            `Primary request: ${request}`,
            'Input image 1 is the edit target.',
            `Original asset role: ${layer.kind === 'text' ? 'transparent artistic typography' : 'transparent poster object'}.`,
            layer.text ? `Text invariant: keep the exact text "${layer.text}" unless the request explicitly changes the wording.` : '',
            'Change only what the user requested. Preserve the subject identity, style, silhouette quality and all unspecified details.',
            'Return one complete isolated asset on a perfectly flat digital solid #ff00ff chroma-key background.',
            'Keep every background pixel exact #ff00ff. Apply texture only inside the subject.',
            'No scene, floor, cast shadow, gradient, background texture, color variation, extra text or watermark. Do not use #ff00ff in the subject.'
          ].filter(Boolean).join('\n');
      const result = await runAsyncImageTask(
        prompt,
        {
          ...imageModelOptions(),
          ...referenceOptions,
          aspect_ratio: layer.kind === 'text'
            ? '3:2'
            : sourceRatio,
          output_format: 'png',
          response_format: 'b64_json',
          watermark: false
        },
        '图片编辑'
      );
      const generated = generationImage(result);
      const prepared = fullImageEdit
        ? { src: generated.src, removed: false }
        : await removeFlatBackground(generated.src, { crop: false });
      pushUndo();
      storeLayerRevision(layer);
      await replaceLayerImageAssets(layer, prepared.src, {
        restoreSrc: generated.src,
        originalSrc: generated.src,
        persistentUrl: generated.persistentUrl
      });
      layer.cutoutSettings = prepared.removed
        ? {
            retention: Number.isFinite(prepared.retention)
              ? prepared.retention
              : DEFAULT_CUTOUT_RETENTION,
            feather: Number.isFinite(prepared.feather) ? prepared.feather : 0
          }
        : undefined;
      layer.persistentUrl = generated.persistentUrl;
      layer.prompt = prompt;
      layer.name = `${layer.name.replace(/ · v\d+$/, '')} · v${layer.revisions.length + 1}`;
      state.editPrompt = '';
      renderCanvas();
      renderLayersPanel();
      scheduleProjectSave();
      if (fullImageEdit) {
        setStatus('整图编辑结果已替换当前图层，背景和构图已保留；可随时回退上一版', 'success');
      } else {
        setStatus(
          prepared.removed
            ? '编辑结果已去底并替换当前图层；可随时回退上一版'
            : '编辑结果已替换；如仍有背景，可在图层面板点击「智能抠图」',
          prepared.removed ? 'success' : 'error'
        );
      }
    } catch (error) {
      setStatus(error?.message || '编辑失败，请稍后重试', 'error');
    } finally {
      state.busy = '';
      renderLayersPanel();
    }
  }

  async function restoreLayerRevision() {
    const layer = state.layers.find(item => item.id === state.selectedLayerId);
    if (!layer?.revisions?.length || isCanvasEditBlocked()) return;
    pushUndo();
    const previous = layer.revisions.pop();
    await replaceLayerImageAssets(layer, null, {
      assetId: previous.assetId,
      restoreAssetId: previous.restoreAssetId || previous.assetId,
      originalAssetId: previous.originalAssetId || previous.restoreAssetId || previous.assetId,
      persistentUrl: previous.persistentUrl || ''
    });
    layer.persistentUrl = previous.persistentUrl || '';
    layer.prompt = previous.prompt || '';
    layer.name = previous.name || layer.name;
    layer.cutoutSettings = previous.cutoutSettings ? { ...previous.cutoutSettings } : undefined;
    ['x', 'y', 'width', 'height', 'scale', 'rotation', 'flipX', 'flipY'].forEach(property => {
      if (Number.isFinite(previous[property])) layer[property] = previous[property];
    });
    renderCanvas();
    renderLayersPanel();
    scheduleProjectSave();
    setStatus('已回退到上一版图像', 'success');
  }

  function storeLayerRevision(layer) {
    if (!Array.isArray(layer.revisions)) layer.revisions = [];
    layer.revisions.push({
      assetId: layer.assetId,
      restoreAssetId: layer.restoreAssetId || layer.assetId,
      originalAssetId: layer.originalAssetId || layer.restoreAssetId || layer.assetId,
      persistentUrl: layer.persistentUrl,
      prompt: layer.prompt,
      name: layer.name,
      x: layer.x,
      y: layer.y,
      width: layer.width,
      height: layer.height,
      scale: layer.scale,
      rotation: layer.rotation,
      flipX: layer.flipX,
      flipY: layer.flipY,
      cutoutSettings: layer.cutoutSettings ? { ...layer.cutoutSettings } : undefined
    });
    if (layer.revisions.length > MAX_LAYER_REVISIONS) layer.revisions.shift();
  }

  async function applyCutoutToLayer(layer, cutout, persistentUrl, preserveCropGeometry, originalBeforeCutout) {
    storeLayerRevision(layer);
    if (
      preserveCropGeometry
      && Number.isFinite(cutout.sourceWidth)
      && Number.isFinite(cutout.sourceHeight)
      && Number.isFinite(cutout.cropWidth)
      && Number.isFinite(cutout.cropHeight)
    ) {
      const localX = (
        (cutout.cropX + cutout.cropWidth / 2) / cutout.sourceWidth - 0.5
      ) * layer.width * layer.scale * layer.flipX;
      const localY = (
        (cutout.cropY + cutout.cropHeight / 2) / cutout.sourceHeight - 0.5
      ) * layer.height * layer.scale * layer.flipY;
      const radians = layer.rotation * Math.PI / 180;
      layer.x += localX * Math.cos(radians) - localY * Math.sin(radians);
      layer.y += localX * Math.sin(radians) + localY * Math.cos(radians);
      layer.width *= cutout.cropWidth / cutout.sourceWidth;
      layer.height *= cutout.cropHeight / cutout.sourceHeight;
    }
    await replaceLayerImageAssets(layer, cutout.src, {
      restoreAssetId: originalBeforeCutout || layer.originalAssetId || layer.restoreAssetId || layer.assetId,
      originalAssetId: originalBeforeCutout || layer.originalAssetId || layer.restoreAssetId || layer.assetId,
      persistentUrl
    });
    layer.cutoutSettings = {
      retention: Number.isFinite(cutout.retention)
        ? cutout.retention
        : DEFAULT_CUTOUT_RETENTION,
      feather: Number.isFinite(cutout.feather) ? cutout.feather : 0
    };
    layer.persistentUrl = persistentUrl || '';
    layer.prompt = [layer.prompt, 'Manual operation: remove background and keep the foreground subject only.']
      .filter(Boolean)
      .join('\n');
    layer.name = `${layer.name.replace(/ · 已抠图$/, '')} · 已抠图`;
  }

  async function cutoutSelectedLayer() {
    if (state.busy) return;
    const layer = selectedLayer();
    if (!layer) {
      setStatus('请先选择要抠图的图层', 'error');
      return;
    }
    state.busy = 'cutout';
    renderLayersPanel();
    renderToolbarState();
    setStatus('正在识别图层背景…', 'working');
    try {
      const originalBeforeCutout = layer.originalAssetId || layer.restoreAssetId || layer.assetId;
      let cutout = await removeFlatBackground(
        await layerOriginalSource(layer),
        { allowNeutral: true, crop: false }
      );
      if (cutout.removed && cutout.reason === 'already-transparent') {
        setStatus('当前图层已经包含透明背景，无需重复抠图', 'success');
        return;
      }

      let persistentUrl = '';
      let preserveCropGeometry = true;
      if (!cutout.removed) {
        if (!hasAsyncImageBridge()) {
          throw new Error('未识别到可安全删除的纯色背景，且当前页面没有 AI 抠图能力');
        }
        setStatus('背景较复杂，正在使用 AI 提取主体…', 'working');
        const referenceOptions = await buildReferenceOptions([{ assetId: layer.assetId }]);
        const ratio = layer.width / Math.max(1, layer.height);
        const prompt = [
          'Use case: exact foreground extraction.',
          'Image 1 is the authoritative source. Extract the main foreground subject without redesigning, restyling or changing it.',
          'Preserve the exact subject identity, pose, proportions, colors, texture and internal details.',
          'Remove every original background element, floor and cast shadow.',
          'Place the complete isolated subject on a perfectly flat digital solid #ff00ff background.',
          'Every background pixel must be exact #ff00ff with no texture, gradient, glow or color variation.',
          'Do not add text, decoration, border or watermark. Do not use #ff00ff inside the subject.'
        ].join('\n');
        const result = await runAsyncImageTask(
          prompt,
          {
            ...imageModelOptions(),
            ...referenceOptions,
            aspect_ratio: ratio > 1.25 ? '3:2' : ratio < 0.8 ? '2:3' : '1:1',
            output_format: 'png',
            response_format: 'b64_json',
            watermark: false,
            sequential_image_generation: 'disabled'
          },
          'AI 抠图'
        );
        const generated = generationImage(result);
        cutout = await removeFlatBackground(generated.src, { crop: false });
        persistentUrl = generated.persistentUrl;
        preserveCropGeometry = false;
      }
      if (!cutout.removed) throw new Error('背景去除失败，请换一张主体边缘更清晰的图片重试');

      pushUndo();
      await applyCutoutToLayer(
        layer,
        cutout,
        persistentUrl,
        preserveCropGeometry,
        originalBeforeCutout
      );
      renderCanvas();
      renderLayersPanel();
      renderToolbarState();
      scheduleProjectSave();
      setStatus('背景已去除，并已保留原图版本供回退', 'success');
    } catch (error) {
      setStatus(error?.message || '图层抠图失败', 'error');
    } finally {
      state.busy = '';
      renderLayersPanel();
      renderToolbarState();
    }
  }

  function paintSnapshot(canvas) {
    const snapshotCanvas = document.createElement('canvas');
    snapshotCanvas.width = canvas.width;
    snapshotCanvas.height = canvas.height;
    snapshotCanvas.getContext('2d').drawImage(canvas, 0, 0);
    return snapshotCanvas;
  }

  function fitPaintCanvas() {
    if (!paintSession || !refs.paintStage || !refs.paintCanvas) return;
    const stageRect = refs.paintStage.getBoundingClientRect();
    const availableWidth = Math.max(120, stageRect.width - 40);
    const availableHeight = Math.max(120, stageRect.height - 40);
    const scale = Math.min(
      availableWidth / paintSession.canvas.width,
      availableHeight / paintSession.canvas.height,
      1
    );
    refs.paintCanvas.style.width = `${Math.max(1, Math.round(paintSession.canvas.width * scale))}px`;
    refs.paintCanvas.style.height = `${Math.max(1, Math.round(paintSession.canvas.height * scale))}px`;
  }

  function updatePaintEditorControls() {
    if (!paintSession || !refs.paintEditor) return;
    refs.paintEditor.querySelectorAll('[data-paint-tool]').forEach(button => {
      button.classList.toggle('is-active', button.dataset.paintTool === paintSession.tool);
    });
    if (refs.paintSize) refs.paintSize.value = String(paintSession.brushSize);
    if (refs.paintSizeValue) refs.paintSizeValue.textContent = `${paintSession.brushSize}px`;
    if (refs.paintOpacity) refs.paintOpacity.value = String(Math.round(paintSession.opacity * 100));
    if (refs.paintOpacityValue) refs.paintOpacityValue.textContent = `${Math.round(paintSession.opacity * 100)}%`;
    if (refs.paintColor) refs.paintColor.value = paintSession.color;
    if (refs.cutoutRetention) refs.cutoutRetention.value = String(paintSession.cutoutRetention);
    if (refs.cutoutRetentionValue) {
      refs.cutoutRetentionValue.textContent = `${paintSession.cutoutRetention}%`;
    }
    if (refs.cutoutFeather) refs.cutoutFeather.value = String(paintSession.cutoutFeather);
    if (refs.cutoutFeatherValue) refs.cutoutFeatherValue.textContent = `${paintSession.cutoutFeather}px`;
    refs.paintEditor.querySelectorAll('.cutout-live-control').forEach(control => {
      control.classList.toggle('is-disabled', !paintSession.canLiveCutout);
    });
    if (refs.cutoutLiveHelp) {
      refs.cutoutLiveHelp.textContent = paintSession.cutoutMessage || (
        paintSession.canLiveCutout
          ? '拖动时会从抠图前图片重新计算透明区域；保留越高越不容易误删，100% 会严格恢复抠图前完整图片。再次调节会重置尚未应用的局部笔画。'
          : '当前图层没有可用于重新计算的抠图前图片，可继续使用修复画笔和橡皮擦。'
      );
      refs.cutoutLiveHelp.dataset.kind = paintSession.cutoutMessageKind || 'neutral';
    }
    refs.paintEditor.querySelector('.paint-color-control')
      ?.classList.toggle('is-disabled', paintSession.tool !== 'paint');
    refs.paintEditor.querySelector('[data-action="paint-undo"]')
      ?.toggleAttribute('disabled', !paintSession.history.length);
    if (refs.paintEditorHelp) {
      refs.paintEditorHelp.textContent = paintSession.hasOriginalRestore
        ? '修复画笔会从抠图前原图恢复误删像素；橡皮擦继续删除；彩色画笔可进行局部标注或补色。'
        : '该旧图层没有保存抠图前像素；修复画笔只能恢复本次打开编辑器时仍存在的内容。';
    }
  }

  async function originalSourcesForAssetIds(assetIds) {
    const sources = [];
    for (const assetId of [...new Set(assetIds.filter(Boolean))]) {
      try {
        sources.push({ assetId, src: await assetUrl(assetId, 'original') });
      } catch (error) {
        debug('paint source asset unavailable', assetId, error);
      }
    }
    return sources;
  }

  async function rebuildLegacyFullFrame(layer, currentImage) {
    const currentWidth = currentImage.naturalWidth || currentImage.width;
    const currentHeight = currentImage.naturalHeight || currentImage.height;
    const retention = clamp(
      Math.round(Number(layer.cutoutSettings?.retention ?? DEFAULT_CUTOUT_RETENTION)),
      0,
      99
    );
    const candidates = await originalSourcesForAssetIds([
      layer.originalAssetId,
      layer.revisions?.at(-1)?.originalAssetId,
      layer.revisions?.at(-1)?.restoreAssetId,
      layer.revisions?.at(-1)?.assetId
    ]);
    for (const candidateRecord of candidates) {
      try {
        const candidate = candidateRecord.src;
        const originalImage = await loadImage(candidate, true);
        const sourceWidth = originalImage.naturalWidth || originalImage.width;
        const sourceHeight = originalImage.naturalHeight || originalImage.height;
        if (sourceWidth === currentWidth && sourceHeight === currentHeight) continue;
        const cropped = await removeFlatBackground(candidate, {
          allowNeutral: true,
          retention,
          feather: Number(layer.cutoutSettings?.feather) || 0
        });
        const dimensionsMatch = cropped.removed
          && cropped.reason !== 'already-transparent'
          && Math.abs(Number(cropped.cropWidth) - currentWidth) <= 2
          && Math.abs(Number(cropped.cropHeight) - currentHeight) <= 2;
        if (!dimensionsMatch) continue;
        const fullFrame = await removeFlatBackground(candidate, {
          allowNeutral: true,
          crop: false,
          retention,
          feather: Number(layer.cutoutSettings?.feather) || 0
        });
        if (!fullFrame.removed || fullFrame.reason === 'already-transparent') continue;
        return {
          currentImage: await loadImageSource(fullFrame.src, false),
          restoreImage: originalImage,
          originalAssetId: candidateRecord.assetId,
          geometry: {
            sourceWidth,
            sourceHeight,
            cropX: cropped.cropX,
            cropY: cropped.cropY,
            cropWidth: cropped.cropWidth,
            cropHeight: cropped.cropHeight
          }
        };
      } catch (_) {
        // The next saved source may still be usable.
      }
    }
    return null;
  }

  function restoreLegacyLayerGeometry(layer, geometry) {
    if (
      !geometry
      || !Number.isFinite(geometry.sourceWidth)
      || !Number.isFinite(geometry.sourceHeight)
      || !Number.isFinite(geometry.cropWidth)
      || !Number.isFinite(geometry.cropHeight)
      || geometry.cropWidth <= 0
      || geometry.cropHeight <= 0
    ) return;
    const fullWidth = layer.width * geometry.sourceWidth / geometry.cropWidth;
    const fullHeight = layer.height * geometry.sourceHeight / geometry.cropHeight;
    const localX = (
      (geometry.cropX + geometry.cropWidth / 2) / geometry.sourceWidth - 0.5
    ) * fullWidth * layer.scale * layer.flipX;
    const localY = (
      (geometry.cropY + geometry.cropHeight / 2) / geometry.sourceHeight - 0.5
    ) * fullHeight * layer.scale * layer.flipY;
    const radians = layer.rotation * Math.PI / 180;
    layer.x -= localX * Math.cos(radians) - localY * Math.sin(radians);
    layer.y -= localX * Math.sin(radians) + localY * Math.cos(radians);
    layer.width = fullWidth;
    layer.height = fullHeight;
  }

  async function openPaintEditor() {
    if (paintSession || isCanvasEditBlocked()) return;
    const layer = selectedLayer();
    if (!layer) {
      setStatus('请先选择要精修的图层', 'error');
      return;
    }
    setStatus('正在准备单图像素编辑器…', 'working');
    try {
      let currentImage = await loadImage(await layerOriginalSource(layer), true);
      let width = currentImage.naturalWidth || currentImage.width;
      let height = currentImage.naturalHeight || currentImage.height;
      const legacyFullFrame = await rebuildLegacyFullFrame(layer, currentImage);
      if (legacyFullFrame) {
        currentImage = legacyFullFrame.currentImage;
        width = currentImage.naturalWidth || currentImage.width;
        height = currentImage.naturalHeight || currentImage.height;
      }
      const restoreCandidates = await originalSourcesForAssetIds([
        layer.originalAssetId,
        layer.restoreAssetId,
        layer.revisions?.at(-1)?.originalAssetId,
        layer.revisions?.at(-1)?.restoreAssetId,
        layer.revisions?.at(-1)?.assetId
      ]);
      let restoreImage = legacyFullFrame?.restoreImage || currentImage;
      let hasOriginalRestore = Boolean(legacyFullFrame);
      for (const candidateRecord of restoreCandidates) {
        try {
          const image = await loadImage(candidateRecord.src, true);
          const candidateWidth = image.naturalWidth || image.width;
          const candidateHeight = image.naturalHeight || image.height;
          if (candidateWidth === width && candidateHeight === height) {
            restoreImage = image;
            hasOriginalRestore = true;
            break;
          }
        } catch (_) {
          // Try the next compatible restoration source.
        }
      }

      refs.paintCanvas.width = width;
      refs.paintCanvas.height = height;
      const ctx = refs.paintCanvas.getContext('2d');
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(currentImage, 0, 0, width, height);
      const initialCanvas = paintSnapshot(refs.paintCanvas);
      const restoreCanvas = document.createElement('canvas');
      restoreCanvas.width = width;
      restoreCanvas.height = height;
      restoreCanvas.getContext('2d').drawImage(restoreImage, 0, 0, width, height);
      const cutoutSourceBlob = await canvasBlob(restoreCanvas, 'image/png');
      const cutoutSourceUrl = URL.createObjectURL(cutoutSourceBlob);
      paintSession = {
        layerId: layer.id,
        tool: 'restore',
        brushSize: 32,
        opacity: 1,
        color: '#ff633d',
        cutoutRetention: clamp(
          Math.round(Number(
            layer.cutoutSettings?.retention
            ?? 100
          )),
          0,
          100
        ),
        cutoutFeather: clamp(
          Math.round(Number(layer.cutoutSettings?.feather ?? 0)),
          0,
          16
        ),
        cutoutPreviewTimer: 0,
        cutoutPreviewSerial: 0,
        cutoutMessage: '',
        cutoutMessageKind: 'neutral',
        canLiveCutout: Boolean(restoreCanvas.width && restoreCanvas.height),
        cutoutSourceUrl,
        originalAssetId: legacyFullFrame?.originalAssetId
          || layer.originalAssetId
          || layer.restoreAssetId
          || layer.assetId,
        legacyGeometry: legacyFullFrame?.geometry || null,
        history: [],
        maxHistory: width * height > 8_000_000 ? 2 : width * height > 3_000_000 ? 4 : 8,
        canvas: refs.paintCanvas,
        ctx,
        initialCanvas,
        restoreCanvas,
        hasOriginalRestore,
        lastPoint: null
      };
      refs.paintEditor.hidden = false;
      if (refs.paintEditorTitle) refs.paintEditorTitle.textContent = `抠图微调 · ${layer.name}`;
      updatePaintEditorControls();
      requestAnimationFrame(fitPaintCanvas);
      setStatus('已打开抠图微调；滑动参数会实时预览，也可用画笔修复局部边缘', 'success');
    } catch (error) {
      paintSession = null;
      setStatus(error?.message || '图层图片无法进入像素编辑器', 'error');
    }
  }

  function closePaintEditor() {
    if (paintSession?.cutoutPreviewTimer) clearTimeout(paintSession.cutoutPreviewTimer);
    if (paintSession) {
      URL.revokeObjectURL(paintSession.cutoutSourceUrl);
      paintSession.history.forEach(canvas => {
        canvas.width = 0;
        canvas.height = 0;
      });
      paintSession.initialCanvas.width = 0;
      paintSession.initialCanvas.height = 0;
      paintSession.restoreCanvas.width = 0;
      paintSession.restoreCanvas.height = 0;
      paintSession.canvas.width = 0;
      paintSession.canvas.height = 0;
    }
    paintSession = null;
    if (refs.paintEditor) refs.paintEditor.hidden = true;
    if (refs.paintCanvas) {
      refs.paintCanvas.style.width = '';
      refs.paintCanvas.style.height = '';
    }
  }

  function scheduleLiveCutoutPreview() {
    if (!paintSession?.canLiveCutout) return;
    clearTimeout(paintSession.cutoutPreviewTimer);
    const session = paintSession;
    const serial = ++session.cutoutPreviewSerial;
    session.cutoutMessage = '正在重新计算透明边缘…';
    session.cutoutMessageKind = 'working';
    updatePaintEditorControls();
    session.cutoutPreviewTimer = window.setTimeout(() => {
      previewLiveCutout(session, serial);
    }, 90);
  }

  async function previewLiveCutout(session, serial) {
    if (!session || paintSession !== session) return;
    try {
      if (session.cutoutRetention >= 100) {
        session.ctx.clearRect(0, 0, session.canvas.width, session.canvas.height);
        session.ctx.drawImage(
          session.restoreCanvas,
          0, 0,
          session.canvas.width, session.canvas.height
        );
        session.history = [];
        session.cutoutMessage = '主体保留 100%：已严格恢复抠图前的完整图片，不再执行背景分割。';
        session.cutoutMessageKind = 'neutral';
        updatePaintEditorControls();
        return;
      }
      const cutout = await removeFlatBackground(session.cutoutSourceUrl, {
        allowNeutral: true,
        crop: false,
        retention: session.cutoutRetention,
        feather: session.cutoutFeather
      });
      if (paintSession !== session || serial !== session.cutoutPreviewSerial) return;
      if (!cutout.removed || cutout.reason === 'already-transparent') {
        session.cutoutMessage = cutout.reason === 'already-transparent'
          ? '抠图前图片本身已经透明；请使用修复画笔或橡皮擦继续调整。'
          : '没有识别到可安全删除的连续背景；请提高主体保留，或改用橡皮擦处理。';
        session.cutoutMessageKind = 'error';
        updatePaintEditorControls();
        return;
      }
      const image = await loadImageSource(cutout.src, false);
      if (paintSession !== session || serial !== session.cutoutPreviewSerial) return;
      session.ctx.clearRect(0, 0, session.canvas.width, session.canvas.height);
      session.ctx.drawImage(image, 0, 0, session.canvas.width, session.canvas.height);
      session.history = [];
      session.cutoutMessage = `实时预览已更新：主体保留 ${session.cutoutRetention}%，边缘柔化 ${session.cutoutFeather}px。`;
      session.cutoutMessageKind = 'neutral';
      updatePaintEditorControls();
    } catch (error) {
      if (paintSession !== session || serial !== session.cutoutPreviewSerial) return;
      session.cutoutMessage = error?.message || '实时抠图预览失败';
      session.cutoutMessageKind = 'error';
      updatePaintEditorControls();
    }
  }

  function pushPaintHistory() {
    if (!paintSession) return;
    paintSession.history.push(paintSnapshot(paintSession.canvas));
    if (paintSession.history.length > paintSession.maxHistory) {
      const evicted = paintSession.history.shift();
      evicted.width = 0;
      evicted.height = 0;
    }
    updatePaintEditorControls();
  }

  function paintEditorPoint(event) {
    const rect = paintSession.canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * paintSession.canvas.width / Math.max(1, rect.width),
      y: (event.clientY - rect.top) * paintSession.canvas.height / Math.max(1, rect.height),
      scale: paintSession.canvas.width / Math.max(1, rect.width)
    };
  }

  function paintEditorDab(point) {
    if (!paintSession) return;
    const { ctx, restoreCanvas } = paintSession;
    const radius = Math.max(1, paintSession.brushSize * point.scale / 2);
    ctx.save();
    if (paintSession.tool === 'erase') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.globalAlpha = paintSession.opacity;
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fill();
    } else if (paintSession.tool === 'paint') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = paintSession.opacity;
      ctx.fillStyle = paintSession.color;
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.clip();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = paintSession.opacity;
      ctx.drawImage(restoreCanvas, 0, 0);
    }
    ctx.restore();
  }

  function paintEditorSegment(from, to) {
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    const radius = Math.max(1, paintSession.brushSize * to.scale / 2);
    const steps = Math.max(1, Math.ceil(distance / Math.max(1, radius * 0.4)));
    for (let index = 1; index <= steps; index += 1) {
      paintEditorDab({
        x: from.x + (to.x - from.x) * index / steps,
        y: from.y + (to.y - from.y) * index / steps,
        scale: to.scale
      });
    }
  }

  function bindPaintEditor() {
    if (!refs.paintCanvas) return;
    refs.paintCanvas.addEventListener('pointerdown', event => {
      if (!paintSession || event.button !== 0) return;
      event.preventDefault();
      pushPaintHistory();
      paintSession.lastPoint = paintEditorPoint(event);
      paintEditorDab(paintSession.lastPoint);
      refs.paintCanvas.setPointerCapture?.(event.pointerId);

      const onMove = moveEvent => {
        if (!paintSession || moveEvent.pointerId !== event.pointerId) return;
        const point = paintEditorPoint(moveEvent);
        paintEditorSegment(paintSession.lastPoint, point);
        paintSession.lastPoint = point;
      };
      const onEnd = endEvent => {
        if (endEvent.pointerId !== event.pointerId) return;
        refs.paintCanvas.removeEventListener('pointermove', onMove);
        refs.paintCanvas.removeEventListener('pointerup', onEnd);
        refs.paintCanvas.removeEventListener('pointercancel', onEnd);
        if (paintSession) paintSession.lastPoint = null;
        updatePaintEditorControls();
      };
      refs.paintCanvas.addEventListener('pointermove', onMove);
      refs.paintCanvas.addEventListener('pointerup', onEnd);
      refs.paintCanvas.addEventListener('pointercancel', onEnd);
    });
  }

  function undoPaintStroke() {
    if (!paintSession?.history.length) return;
    const previous = paintSession.history.pop();
    paintSession.ctx.clearRect(0, 0, paintSession.canvas.width, paintSession.canvas.height);
    paintSession.ctx.drawImage(previous, 0, 0);
    previous.width = 0;
    previous.height = 0;
    updatePaintEditorControls();
  }

  function resetPaintEditor() {
    if (!paintSession) return;
    pushPaintHistory();
    paintSession.ctx.clearRect(0, 0, paintSession.canvas.width, paintSession.canvas.height);
    paintSession.ctx.drawImage(paintSession.initialCanvas, 0, 0);
    updatePaintEditorControls();
  }

  async function applyPaintEditor() {
    if (!paintSession) return;
    const layer = layerById(paintSession.layerId);
    if (!layer) {
      closePaintEditor();
      return;
    }
    try {
      const editedBlob = await canvasBlob(paintSession.canvas, 'image/png');
      const restoreBlob = await canvasBlob(paintSession.restoreCanvas, 'image/png');
      pushUndo();
      storeLayerRevision(layer);
      await replaceLayerImageAssets(layer, editedBlob, {
        restoreSrc: restoreBlob,
        originalAssetId: paintSession.originalAssetId
      });
      restoreLegacyLayerGeometry(layer, paintSession.legacyGeometry);
      layer.persistentUrl = '';
      layer.cutoutSettings = {
        retention: paintSession.cutoutRetention,
        feather: paintSession.cutoutFeather
      };
      layer.name = `${layer.name.replace(/ · (?:精修|已微调)$/, '')} · 已微调`;
      closePaintEditor();
      renderCanvas();
      renderLayersPanel();
      renderToolbarState();
      scheduleProjectSave(0);
      setStatus('抠图微调已应用到当前图层，可通过「回退上版」恢复', 'success');
    } catch (error) {
      setStatus(error?.message || '抠图微调结果保存失败', 'error');
    }
  }

  function layerById(id) {
    return state.layers.find(layer => layer.id === id);
  }

  function groupById(id) {
    return state.layerGroups.find(group => group.id === id);
  }

  function effectiveLayerVisible(layer) {
    if (!layer || layer.visible === false) return false;
    const group = layer.groupId ? groupById(layer.groupId) : null;
    return !group || group.visible !== false;
  }

  function normalizeLayerGroups() {
    const memberIds = new Set(
      state.layers.map(layer => typeof layer.groupId === 'string' ? layer.groupId : '').filter(Boolean)
    );
    state.layerGroups = state.layerGroups
      .filter((group, index, list) => (
        group
        && typeof group.id === 'string'
        && group.id
        && memberIds.has(group.id)
        && list.findIndex(item => item?.id === group.id) === index
      ))
      .map(group => ({
        id: group.id,
        name: typeof group.name === 'string' && group.name.trim() ? group.name.trim() : '图层组',
        visible: group.visible !== false,
        collapsed: Boolean(group.collapsed)
      }));
    const validIds = new Set(state.layerGroups.map(group => group.id));
    state.layers.forEach(layer => {
      if (!validIds.has(layer.groupId)) layer.groupId = '';
    });
    state.layerGroups.forEach(group => {
      const members = state.layers.filter(layer => layer.groupId === group.id);
      if (members.length < 2) return;
      const indexes = members.map(layer => state.layers.indexOf(layer));
      const first = Math.min(...indexes);
      const last = Math.max(...indexes);
      if (last - first + 1 === members.length) return;
      const memberIds = new Set(members.map(layer => layer.id));
      const remaining = state.layers.filter(layer => !memberIds.has(layer.id));
      const insertionIndex = state.layers
        .slice(0, last + 1)
        .filter(layer => !memberIds.has(layer.id))
        .length;
      remaining.splice(insertionIndex, 0, ...members);
      state.layers = remaining;
    });
  }

  function cleanupEmptyGroups() {
    normalizeLayerGroups();
  }

  function selectedLayersForGrouping() {
    const selectedIds = new Set(state.selectedLayerIds);
    return state.layers.filter(layer => selectedIds.has(layer.id));
  }

  function layerStackUnits() {
    const units = [];
    const seenGroups = new Set();
    state.layers.forEach(layer => {
      const group = layer.groupId ? groupById(layer.groupId) : null;
      if (!group) {
        units.push({ type: 'layer', layer, layers: [layer] });
        return;
      }
      if (seenGroups.has(group.id)) return;
      seenGroups.add(group.id);
      units.push({
        type: 'group',
        group,
        layers: state.layers.filter(item => item.groupId === group.id)
      });
    });
    return units;
  }

  function createLayerGroup() {
    if (isCanvasEditBlocked()) return;
    const selected = selectedLayersForGrouping();
    if (selected.length < 2) {
      setStatus('请先在多选模式中勾选至少两个图层', 'error');
      return;
    }
    pushUndo();
    const selectedIds = new Set(selected.map(layer => layer.id));
    const highestSelectedIndex = Math.max(...selected.map(layer => state.layers.indexOf(layer)));
    const remaining = state.layers.filter(layer => !selectedIds.has(layer.id));
    const insertionIndex = state.layers
      .slice(0, highestSelectedIndex + 1)
      .filter(layer => !selectedIds.has(layer.id))
      .length;
    const groupId = uid('group');
    selected.forEach(layer => {
      layer.groupId = groupId;
    });
    remaining.splice(insertionIndex, 0, ...selected);
    state.layers = remaining;
    state.layerGroups.push({
      id: groupId,
      name: `分组 ${state.layerGroups.length + 1}`,
      visible: true,
      collapsed: false
    });
    cleanupEmptyGroups();
    state.selectedLayerId = selected.at(-1)?.id || state.selectedLayerId;
    state.selectedLayerIds = selected.map(layer => layer.id);
    renderCanvas();
    renderLayersPanel();
    renderToolbarState();
    scheduleProjectSave(0);
    setStatus(`已将 ${selected.length} 个图层建立分组`, 'success');
  }

  function ungroupLayers(groupId) {
    const group = groupById(groupId);
    if (!group || isCanvasEditBlocked()) return;
    pushUndo();
    const members = state.layers.filter(layer => layer.groupId === groupId);
    members.forEach(layer => {
      layer.groupId = '';
    });
    state.layerGroups = state.layerGroups.filter(item => item.id !== groupId);
    renderCanvas();
    renderLayersPanel();
    renderToolbarState();
    scheduleProjectSave(0);
    setStatus(`已取消「${group.name}」分组`, 'success');
  }

  function ungroupSelectedLayers() {
    if (isCanvasEditBlocked()) return;
    const selectedIds = new Set(state.selectedLayerIds);
    const affected = state.layers.filter(layer => selectedIds.has(layer.id) && layer.groupId);
    if (!affected.length) return;
    pushUndo();
    const groupNames = new Set();
    affected.forEach(layer => {
      const group = groupById(layer.groupId);
      if (group) groupNames.add(group.name);
      layer.groupId = '';
    });
    cleanupEmptyGroups();
    renderCanvas();
    renderLayersPanel();
    renderToolbarState();
    scheduleProjectSave(0);
    setStatus(`已将 ${affected.length} 个图层移出分组`, 'success');
  }

  function toggleGroupVisibility(groupId) {
    const group = groupById(groupId);
    if (!group || isCanvasEditBlocked()) return;
    pushUndo();
    group.visible = group.visible === false;
    renderCanvas();
    renderLayersPanel();
    renderToolbarState();
    setStatus(group.visible ? `已显示「${group.name}」` : `已隐藏「${group.name}」`, 'success');
  }

  function toggleGroupCollapsed(groupId) {
    const group = groupById(groupId);
    if (!group || isCanvasEditBlocked()) return;
    pushUndo();
    group.collapsed = !group.collapsed;
    renderLayersPanel();
    scheduleProjectSave(0);
  }

  function renameLayerGroup(groupId, value, options) {
    const group = groupById(groupId);
    if (!group || isCanvasEditBlocked()) return;
    const originalName = options?.originalName || group.name || '图层组';
    const name = String(value || '').replace(/\s+/g, ' ').trim().slice(0, 40) || originalName;
    const changed = name !== originalName;
    if (!options?.undoStarted && name !== group.name) pushUndo();
    group.name = name;
    renderLayersPanel();
    renderToolbarState();
    scheduleProjectSave(0);
    if (changed) setStatus(`分组已命名为「${name}」`, 'success');
  }

  function selectedLayer() {
    return layerById(state.selectedLayerId);
  }

  function deleteLayers(ids) {
    const deleteIds = new Set(ids);
    const firstIndex = state.layers.findIndex(layer => deleteIds.has(layer.id));
    if (firstIndex < 0 || isCanvasEditBlocked()) return;
    pushUndo();
    state.layers = state.layers.filter(layer => !deleteIds.has(layer.id));
    state.selectedLayerIds = state.selectedLayerIds.filter(id => !deleteIds.has(id));
    cleanupEmptyGroups();
    state.selectedLayerId = state.selectedLayerIds.at(-1)
      || state.layers[Math.min(firstIndex, state.layers.length - 1)]?.id
      || '';
    if (state.selectedLayerId && !state.selectedLayerIds.includes(state.selectedLayerId)) {
      state.selectedLayerIds = [state.selectedLayerId];
    }
    renderCanvas();
    renderLayersPanel();
    renderToolbarState();
  }

  function deleteLayer(id) {
    deleteLayers([id]);
  }

  function deleteSelectedLayers() {
    const ids = state.selectedLayerIds.length
      ? state.selectedLayerIds
      : state.selectedLayerId ? [state.selectedLayerId] : [];
    if (!ids.length || isCanvasEditBlocked()) return;
    deleteLayers(ids);
    setStatus(`已删除 ${ids.length} 个图层，可使用撤销恢复`, 'success');
  }

  function duplicateLayer(id) {
    const layer = layerById(id);
    if (!layer || isCanvasEditBlocked()) return;
    pushUndo();
    const copy = {
      ...layer,
      id: uid('layer'),
      name: `${layer.name} 副本`,
      x: layer.x + 30,
      y: layer.y + 30,
      revisions: (layer.revisions || []).map(item => ({ ...item }))
    };
    const index = state.layers.indexOf(layer);
    state.layers.splice(index + 1, 0, copy);
    state.selectedLayerId = copy.id;
    state.selectedLayerIds = [copy.id];
    renderCanvas();
    renderLayersPanel();
    renderToolbarState();
  }

  function toggleLayerVisibility(id) {
    const layer = layerById(id);
    if (!layer || isCanvasEditBlocked()) return;
    pushUndo();
    layer.visible = layer.visible === false;
    renderCanvas();
    renderLayersPanel();
    renderToolbarState();
    const group = layer.groupId ? groupById(layer.groupId) : null;
    setStatus(
      layer.visible && group?.visible === false
        ? `「${layer.name}」自身已显示，但所在分组仍处于隐藏状态`
        : layer.visible ? `已显示「${layer.name}」` : `已隐藏「${layer.name}」`,
      'success'
    );
  }

  function moveLayerOrder(id, direction) {
    const layer = layerById(id);
    if (!layer || isCanvasEditBlocked()) return;
    if (layer.groupId) {
      const index = state.layers.indexOf(layer);
      const next = index + direction;
      if (next < 0 || next >= state.layers.length || state.layers[next].groupId !== layer.groupId) return;
      pushUndo();
      [state.layers[index], state.layers[next]] = [state.layers[next], state.layers[index]];
    } else {
      const units = layerStackUnits();
      const unitIndex = units.findIndex(unit => unit.type === 'layer' && unit.layer.id === id);
      const nextUnitIndex = unitIndex + direction;
      if (unitIndex < 0 || nextUnitIndex < 0 || nextUnitIndex >= units.length) return;
      pushUndo();
      [units[unitIndex], units[nextUnitIndex]] = [units[nextUnitIndex], units[unitIndex]];
      state.layers = units.flatMap(unit => unit.layers);
    }
    renderCanvas();
    renderLayersPanel();
  }

  function workspaceBaseScale() {
    const width = parseFloat(refs.canvas?.style.width || '');
    return Number.isFinite(width) && width > 0 ? width / state.canvas.width : 1;
  }

  function applyWorkspaceTransform() {
    if (!refs.canvas || !refs.canvasViewport) return;
    const zoom = clamp(Number(state.workspace.zoom) || 1, 0.12, 8);
    state.workspace.zoom = zoom;
    refs.canvas.style.transform = [
      'translate(-50%, -50%)',
      `translate(${state.workspace.panX}px, ${state.workspace.panY}px)`,
      `scale(${zoom})`
    ].join(' ');
    const gridSize = Math.max(8, 24 * zoom);
    refs.canvasViewport.style.setProperty('--workspace-grid-size', `${gridSize}px`);
    refs.canvasViewport.style.setProperty('--workspace-grid-x', `calc(50% + ${state.workspace.panX}px)`);
    refs.canvasViewport.style.setProperty('--workspace-grid-y', `calc(50% + ${state.workspace.panY}px)`);
    refs.canvasViewport.style.setProperty('--workspace-color', state.workspace.background || '#ffffff');
    if (refs.workspaceZoomValue) {
      refs.workspaceZoomValue.textContent = `${Math.round(zoom * 100)}%`;
    }
    scheduleCanvasImageVisibility();
  }

  function setWorkspaceZoom(value, anchor, options) {
    if (!refs.canvasViewport) return;
    const previous = state.workspace.zoom;
    const next = clamp(Number(value) || 1, 0.12, 8);
    if (Math.abs(next - previous) < 0.0001) return;
    const rect = refs.canvasViewport.getBoundingClientRect();
    const pointX = Number.isFinite(anchor?.clientX)
      ? anchor.clientX - rect.left - rect.width / 2
      : 0;
    const pointY = Number.isFinite(anchor?.clientY)
      ? anchor.clientY - rect.top - rect.height / 2
      : 0;
    const ratio = next / previous;
    state.workspace.panX = pointX - (pointX - state.workspace.panX) * ratio;
    state.workspace.panY = pointY - (pointY - state.workspace.panY) * ratio;
    state.workspace.zoom = next;
    applyWorkspaceTransform();
    scheduleProjectSave();
    if (options?.announce) {
      setStatus(`工作区缩放 ${Math.round(next * 100)}%`, 'neutral');
    }
  }

  function resetWorkspaceView(options) {
    state.workspace.zoom = 1;
    state.workspace.panX = 0;
    state.workspace.panY = 0;
    applyWorkspaceTransform();
    scheduleProjectSave();
    if (options?.announce) setStatus('已适配并居中显示画板', 'neutral');
  }

  function focusWorkspaceLayers(layers, options) {
    if (!refs.canvasViewport || !refs.canvas || !layers?.length) return;
    const validLayers = layers.filter(Boolean);
    if (!validLayers.length) return;
    const bounds = validLayers.reduce((value, layer) => {
      const halfWidth = layer.width * Math.abs(layer.scale || 1) / 2;
      const halfHeight = layer.height * Math.abs(layer.scale || 1) / 2;
      value.minX = Math.min(value.minX, layer.x - halfWidth);
      value.maxX = Math.max(value.maxX, layer.x + halfWidth);
      value.minY = Math.min(value.minY, layer.y - halfHeight);
      value.maxY = Math.max(value.maxY, layer.y + halfHeight);
      return value;
    }, { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
    const viewportRect = refs.canvasViewport.getBoundingClientRect();
    const baseScale = workspaceBaseScale();
    const width = Math.max(1, bounds.maxX - bounds.minX);
    const height = Math.max(1, bounds.maxY - bounds.minY);
    const fitZoom = clamp(Math.min(
      Math.max(160, viewportRect.width - 104) / (width * baseScale),
      Math.max(180, viewportRect.height - 104) / (height * baseScale)
    ), 0.12, 8);
    state.workspace.zoom = options?.onlyZoomOut
      ? Math.min(state.workspace.zoom, fitZoom)
      : fitZoom;
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    state.workspace.panX = -(centerX - state.canvas.width / 2) * baseScale * state.workspace.zoom;
    state.workspace.panY = -(centerY - state.canvas.height / 2) * baseScale * state.workspace.zoom;
    applyWorkspaceTransform();
    scheduleProjectSave();
  }

  function fitCanvas() {
    if (!refs.canvasViewport || !refs.canvas) return;
    const rect = refs.canvasViewport.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const padding = 72;
    const availableWidth = Math.max(160, rect.width - padding);
    const availableHeight = Math.max(200, rect.height - padding);
    const ratio = state.canvas.width / state.canvas.height;
    let width = availableWidth;
    let height = width / ratio;
    if (height > availableHeight) {
      height = availableHeight;
      width = height * ratio;
    }
    refs.canvas.style.width = `${Math.round(width)}px`;
    refs.canvas.style.height = `${Math.round(height)}px`;
    applyWorkspaceTransform();
  }

  function workspacePointToCanvas(clientX, clientY) {
    const rect = refs.canvas?.getBoundingClientRect();
    if (!rect?.width || !rect.height) {
      return { x: state.canvas.width / 2, y: state.canvas.height / 2 };
    }
    return {
      x: (clientX - rect.left) / rect.width * state.canvas.width,
      y: (clientY - rect.top) / rect.height * state.canvas.height
    };
  }

  function bindWorkspaceNavigation() {
    const viewport = refs.canvasViewport;
    if (!viewport) return;
    workspaceNavigationCleanup?.();

    const onWheel = event => {
      if (!state.open || paintSession) return;
      event.preventDefault();
      if (event.ctrlKey || event.metaKey || event.altKey) {
        const factor = Math.exp(-event.deltaY * 0.002);
        setWorkspaceZoom(state.workspace.zoom * factor, event);
        return;
      }
      const horizontal = event.shiftKey ? (event.deltaX || event.deltaY) : event.deltaX;
      const vertical = event.shiftKey ? 0 : event.deltaY;
      state.workspace.panX -= horizontal;
      state.workspace.panY -= vertical;
      applyWorkspaceTransform();
      scheduleProjectSave();
    };

    const onPointerDown = event => {
      if (
        isCanvasEditBlocked()
        || paintSession
        || ![0, 1].includes(event.button)
        || (
          !workspaceSpacePressed
          && event.button !== 1
          && event.composedPath().some(node => (
            node instanceof HTMLElement && node.classList?.contains('poster-layer')
          ))
        )
      ) return;
      event.preventDefault();
      selectLayer('');
      const startX = event.clientX;
      const startY = event.clientY;
      const startPanX = state.workspace.panX;
      const startPanY = state.workspace.panY;
      const pointerId = event.pointerId;
      viewport.classList.add('is-panning');
      viewport.setPointerCapture?.(pointerId);

      const onMove = moveEvent => {
        if (moveEvent.pointerId !== pointerId) return;
        state.workspace.panX = startPanX + moveEvent.clientX - startX;
        state.workspace.panY = startPanY + moveEvent.clientY - startY;
        applyWorkspaceTransform();
      };
      const onEnd = endEvent => {
        if (endEvent.pointerId !== pointerId) return;
        viewport.classList.remove('is-panning');
        viewport.releasePointerCapture?.(pointerId);
        viewport.removeEventListener('pointermove', onMove);
        viewport.removeEventListener('pointerup', onEnd);
        viewport.removeEventListener('pointercancel', onEnd);
        scheduleProjectSave();
      };
      viewport.addEventListener('pointermove', onMove);
      viewport.addEventListener('pointerup', onEnd);
      viewport.addEventListener('pointercancel', onEnd);
    };

    const onDoubleClick = event => {
      if (event.composedPath().some(node => node instanceof HTMLElement && node.classList?.contains('poster-layer'))) return;
      resetWorkspaceView({ announce: true });
    };

    let dragDepth = 0;
    const hasDraggedFiles = event => Array.from(event.dataTransfer?.types || []).includes('Files');
    const onDragEnter = event => {
      if (!hasDraggedFiles(event)) return;
      event.preventDefault();
      dragDepth += 1;
      viewport.classList.add('is-drag-over');
    };
    const onDragOver = event => {
      if (!hasDraggedFiles(event)) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
      viewport.classList.add('is-drag-over');
    };
    const onDragLeave = event => {
      if (!hasDraggedFiles(event)) return;
      dragDepth = Math.max(0, dragDepth - 1);
      if (!dragDepth) viewport.classList.remove('is-drag-over');
    };
    const onDrop = async event => {
      if (!hasDraggedFiles(event)) return;
      event.preventDefault();
      event.stopPropagation();
      dragDepth = 0;
      viewport.classList.remove('is-drag-over');
      if (isCanvasEditBlocked()) {
        setStatus('当前任务完成后再拖入图片', 'error');
        return;
      }
      const point = workspacePointToCanvas(event.clientX, event.clientY);
      await importCanvasFiles(event.dataTransfer?.files, point, { source: 'drop' });
    };

    viewport.addEventListener('wheel', onWheel, { passive: false });
    viewport.addEventListener('pointerdown', onPointerDown);
    viewport.addEventListener('dblclick', onDoubleClick);
    viewport.addEventListener('dragenter', onDragEnter);
    viewport.addEventListener('dragover', onDragOver);
    viewport.addEventListener('dragleave', onDragLeave);
    viewport.addEventListener('drop', onDrop);
    workspaceNavigationCleanup = () => {
      viewport.removeEventListener('wheel', onWheel);
      viewport.removeEventListener('pointerdown', onPointerDown);
      viewport.removeEventListener('dblclick', onDoubleClick);
      viewport.removeEventListener('dragenter', onDragEnter);
      viewport.removeEventListener('dragover', onDragOver);
      viewport.removeEventListener('dragleave', onDragLeave);
      viewport.removeEventListener('drop', onDrop);
      viewport.classList.remove('is-panning', 'is-space-pan', 'is-drag-over');
      workspaceNavigationCleanup = null;
    };
  }

  function applyLayerNode(node, layer) {
    node.hidden = !effectiveLayerVisible(layer);
    node.style.left = `${(layer.x / state.canvas.width) * 100}%`;
    node.style.top = `${(layer.y / state.canvas.height) * 100}%`;
    node.style.width = `${(layer.width / state.canvas.width) * 100}%`;
    node.style.height = `${(layer.height / state.canvas.height) * 100}%`;
    node.style.opacity = String(layer.opacity);
    node.style.transform = [
      'translate(-50%, -50%)',
      `rotate(${layer.rotation}deg)`,
      `scale(${layer.scale * layer.flipX}, ${layer.scale * layer.flipY})`
    ].join(' ');
  }

  function selectLayer(id, options) {
    if (!id) {
      state.selectedLayerId = '';
      state.selectedLayerIds = [];
    } else if (options?.toggle) {
      if (state.selectedLayerIds.includes(id)) {
        state.selectedLayerIds = state.selectedLayerIds.filter(item => item !== id);
        if (state.selectedLayerId === id) {
          state.selectedLayerId = state.selectedLayerIds.at(-1) || '';
        }
      } else {
        state.selectedLayerIds = [...state.selectedLayerIds, id];
        state.selectedLayerId = id;
      }
    } else {
      state.selectedLayerId = id;
      state.selectedLayerIds = id ? [id] : [];
    }
    refs.layerStage?.querySelectorAll('[data-layer-id]').forEach(node => {
      const layerId = node.dataset.layerId;
      node.classList.toggle('is-selected', layerId === state.selectedLayerId);
      node.classList.toggle(
        'is-multi-selected',
        state.multiSelectMode && state.selectedLayerIds.includes(layerId)
      );
    });
    scheduleCanvasImageVisibility();
    renderLayersPanel();
    renderToolbarState();
    scheduleProjectSave();
  }

  function bindLayerInteraction(node, layer) {
    node.addEventListener('pointerdown', event => {
      if (isCanvasEditBlocked() || event.button !== 0 || workspaceSpacePressed) return;
      event.preventDefault();
      event.stopPropagation();
      if (state.multiSelectMode || event.metaKey || event.ctrlKey) {
        selectLayer(layer.id, { toggle: true });
        return;
      }
      selectLayer(layer.id);
      const canvasRect = refs.canvas.getBoundingClientRect();
      const scale = canvasRect.width / state.canvas.width;
      const start = {
        clientX: event.clientX,
        clientY: event.clientY,
        x: layer.x,
        y: layer.y,
        scale: layer.scale,
        rotation: layer.rotation
      };
      const center = {
        x: canvasRect.left + (layer.x / state.canvas.width) * canvasRect.width,
        y: canvasRect.top + (layer.y / state.canvas.height) * canvasRect.height
      };
      const startDistance = Math.hypot(event.clientX - center.x, event.clientY - center.y) || 1;
      const startAngle = Math.atan2(event.clientY - center.y, event.clientX - center.x) * 180 / Math.PI;
      const mode = event.target.closest('[data-handle="scale"]')
        ? 'scale'
        : event.target.closest('[data-handle="rotate"]')
          ? 'rotate'
          : 'drag';
      let undoStarted = false;
      node.setPointerCapture?.(event.pointerId);

      const onMove = moveEvent => {
        if (!undoStarted) {
          pushUndo();
          undoStarted = true;
        }
        if (mode === 'drag') {
          layer.x = start.x + (moveEvent.clientX - start.clientX) / scale;
          layer.y = start.y + (moveEvent.clientY - start.clientY) / scale;
        } else if (mode === 'scale') {
          const distance = Math.hypot(moveEvent.clientX - center.x, moveEvent.clientY - center.y);
          layer.scale = clamp(start.scale * (distance / startDistance), 0.08, 8);
        } else {
          const angle = Math.atan2(moveEvent.clientY - center.y, moveEvent.clientX - center.x) * 180 / Math.PI;
          layer.rotation = Math.round(start.rotation + angle - startAngle);
        }
        applyLayerNode(node, layer);
      };

      const onEnd = () => {
        node.removeEventListener('pointermove', onMove);
        node.removeEventListener('pointerup', onEnd);
        node.removeEventListener('pointercancel', onEnd);
        renderLayersPanel();
        scheduleProjectSave();
      };
      node.addEventListener('pointermove', onMove);
      node.addEventListener('pointerup', onEnd);
      node.addEventListener('pointercancel', onEnd);
    });
  }

  function updateCanvasImageVisibility() {
    canvasCullFrame = 0;
    if (!refs.canvasViewport) return;
    if (!state.open) {
      canvasLayerNodes.forEach(node => {
        const image = node.querySelector('img');
        image?.removeAttribute('src');
        if (image) image.dataset.assetSrc = '';
      });
      return;
    }
    const viewport = refs.canvasViewport.getBoundingClientRect();
    const margin = 240;
    canvasLayerNodes.forEach((node, layerId) => {
      const layer = layerById(layerId);
      const image = node.querySelector('img');
      if (!layer || !image || !effectiveLayerVisible(layer)) {
        image?.removeAttribute('src');
        return;
      }
      const rect = node.getBoundingClientRect();
      const intersects = rect.right >= viewport.left - margin
        && rect.left <= viewport.right + margin
        && rect.bottom >= viewport.top - margin
        && rect.top <= viewport.bottom + margin;
      const needsPreview = layer.id === state.selectedLayerId
        || Math.max(rect.width, rect.height) > 520;
      const desiredSrc = needsPreview ? layer.src : layer.thumbnailSrc || layer.src;
      if (intersects || layer.id === state.selectedLayerId) {
        if (image.dataset.assetSrc !== desiredSrc) {
          image.src = desiredSrc;
          image.dataset.assetSrc = desiredSrc;
        }
      } else if (image.hasAttribute('src')) {
        image.removeAttribute('src');
        image.dataset.assetSrc = '';
      }
    });
  }

  function scheduleCanvasImageVisibility() {
    if (canvasCullFrame) return;
    canvasCullFrame = requestAnimationFrame(updateCanvasImageVisibility);
  }

  function createCanvasLayerNode(layer) {
    const node = document.createElement('div');
    node.className = 'poster-layer';
    node.dataset.layerId = layer.id;
    node.__posterLayer = layer;
    node.innerHTML = `
      <img alt="" draggable="false" loading="lazy" decoding="async">
      <span class="layer-handle rotate-handle" data-handle="rotate" title="旋转"></span>
      <span class="layer-handle scale-handle" data-handle="scale" title="缩放"></span>
    `;
    bindLayerInteraction(node, layer);
    canvasLayerNodes.set(layer.id, node);
    refs.layerStage.appendChild(node);
    return node;
  }

  function renderCanvas() {
    if (!refs.canvas || !refs.layerStage) return;
    refs.canvas.style.background = state.canvas.background;
    const liveIds = new Set(state.layers.map(layer => layer.id));
    canvasLayerNodes.forEach((node, layerId) => {
      if (liveIds.has(layerId)) return;
      node.remove();
      canvasLayerNodes.delete(layerId);
    });
    state.layers.forEach((layer, index) => {
      let node = canvasLayerNodes.get(layer.id);
      if (node && node.__posterLayer !== layer) {
        node.remove();
        canvasLayerNodes.delete(layer.id);
        node = null;
      }
      node = node || createCanvasLayerNode(layer);
      node.title = layer.name;
      node.style.zIndex = String(index + 1);
      node.classList.toggle('is-selected', layer.id === state.selectedLayerId);
      node.classList.toggle(
        'is-multi-selected',
        state.multiSelectMode && state.selectedLayerIds.includes(layer.id)
      );
      applyLayerNode(node, layer);
    });
    trimInactiveAssetUrls();
    requestAnimationFrame(() => {
      fitCanvas();
      scheduleCanvasImageVisibility();
    });
  }

  function paletteHtml(template) {
    return `<span class="template-palette">${template.palette.map(color => (
      `<i style="--swatch:${escapeAttr(color)}"></i>`
    )).join('')}</span>`;
  }

  function templateCard(template, type, selectedId) {
    const selected = template.id === selectedId;
    const selectedReference = type === 'object'
      ? selectedObjectReferenceItem(template)
      : selectedTextReferenceItem(template);
    const reference = type === 'object'
      ? templateThumbnail(template)
      : selectedReference?.thumbnail || selectedReference?.reference || templateReference(template);
    const referenceItems = templateReferenceItems(template);
    const detail = selected && referenceItems.length > 1 && selectedReference
      ? `${template.badge} · ${selectedReference.label}`
      : template.badge;
    return `
      <button type="button" class="template-card ${selected ? 'is-selected' : ''}"
        data-action="select-template" data-template-type="${type}" data-template-id="${escapeAttr(template.id)}">
        <span class="template-preview" style="--template-bg:${escapeAttr(template.palette.at(-1))}">
          ${reference
            ? `<img src="${escapeAttr(reference)}" alt="${escapeAttr(template.name)}参考图" loading="lazy">`
            : `<b>${escapeHtml(template.name.slice(0, 2))}</b>`}
        </span>
        <span class="template-copy"><strong>${escapeHtml(template.name)}</strong><small>${escapeHtml(detail)}</small>${paletteHtml(template)}</span>
        <span class="template-check">${icon('check')}</span>
      </button>
    `;
  }

  function templateReferencePicker(template, type, selectedId) {
    if (template.id !== selectedId) return '';
    const items = templateReferenceItems(template);
    if (items.length < 2) return '';
    const selected = type === 'object'
      ? selectedObjectReferenceItem(template)
      : selectedTextReferenceItem(template);
    return `
      <div class="template-reference-panel">
        <div class="template-reference-heading">
          <strong>更接近哪张？</strong><span>可选 · 默认已选</span>
        </div>
        <div class="template-reference-grid">
          ${items.map(item => `
            <button type="button" class="template-reference-card ${item.id === selected?.id ? 'is-selected' : ''}"
              data-action="select-style-reference" data-template-id="${escapeAttr(template.id)}"
              data-template-type="${escapeAttr(type)}"
              data-reference-id="${escapeAttr(item.id)}" title="${escapeAttr(item.label)}">
              <span class="template-reference-image">
                ${item.thumbnail
                  ? `<img src="${escapeAttr(item.thumbnail)}" alt="${escapeAttr(item.label)}" loading="lazy">`
                  : `<b>${escapeHtml(item.label.slice(0, 2))}</b>`}
                <i>${icon('check')}</i>
              </span>
              <small>${escapeHtml(item.label)}</small>
            </button>
          `).join('')}
        </div>
        <p>${type === 'text'
          ? '参考图只控制字形、笔触和连笔方式；最终只生成你输入的文字。'
          : '参考图只控制画法；主体仍以你上传的图片或描述为准。'}</p>
      </div>
    `;
  }

  function customStyleEditorHtml() {
    if (!state.customStyleEditorOpen) return '';
    const draft = state.customStyleDraft;
    return `
      <div class="custom-style-editor">
        <div class="custom-style-editor-heading">
          <strong>${draft.editingId ? '编辑自定义风格' : '创建自定义风格'}</strong>
          <small>参考图控制视觉语言，Prompt 说明画材、配色、线条与形状</small>
        </div>
        <button type="button" class="custom-style-reference ${draft.reference ? 'has-image' : ''}"
          data-action="choose-custom-style-image">
          ${draft.reference
            ? `<img src="${escapeAttr(draft.reference)}" alt="自定义风格参考图">`
            : `${icon('upload')}<span><strong>上传风格图</strong><small>PNG / JPG / WebP，最大 20MB</small></span>`}
        </button>
        <label class="custom-style-field">
          <span>风格名称</span>
          <input type="text" maxlength="48" data-ref-dynamic="customStyleName"
            value="${escapeAttr(draft.name)}" placeholder="例如：高饱和折纸插画">
        </label>
        <label class="custom-style-field">
          <span>风格 Prompt</span>
          <textarea rows="6" maxlength="12000" data-ref-dynamic="customStylePrompt"
            placeholder="描述画材、配色、线条、形状语言、细节量与不希望出现的效果。不要描述具体主体。">${escapeHtml(draft.prompt)}</textarea>
        </label>
        <p>保存后会将上传图片作为风格样本，并将 Prompt 作为风格规则；生成内容仍以主体图或生成描述为准。</p>
        <div class="custom-style-editor-actions">
          <button type="button" class="secondary-button" data-action="cancel-custom-style">取消</button>
          <button type="button" class="primary-button" data-action="save-custom-style">${draft.editingId ? '更新风格' : '保存风格'}</button>
        </div>
      </div>
    `;
  }

  function templateItem(template, type, selectedId) {
    const customActions = type === 'object' && template.custom
      ? `
        <div class="custom-style-card-actions">
          <button type="button" data-action="edit-custom-style" data-style-id="${escapeAttr(template.id)}">编辑</button>
          <button type="button" data-action="export-custom-style" data-style-id="${escapeAttr(template.id)}">导出 JSON</button>
          <button type="button" data-action="delete-custom-style" data-style-id="${escapeAttr(template.id)}">删除</button>
        </div>
      `
      : '';
    return `<div class="template-item ${template.custom ? 'is-custom-style' : ''}">${templateCard(template, type, selectedId)}${
      templateReferencePicker(template, type, selectedId)
    }${customActions}</div>`;
  }

  function sourceCardHtml() {
    if (!state.source) {
      return `
        <div class="source-choice-grid">
          <button type="button" class="source-choice source-drop-zone" data-action="choose-source" data-source-drop-zone>
            ${icon('upload')}
            <span><strong>上传参考图</strong><small>改现有图片<br>也支持拖入</small></span>
          </button>
          <button type="button" class="source-choice is-prompt" data-action="focus-object-prompt">
            ${icon('sparkle')}
            <span><strong>直接描述生成</strong><small>无需上传图片<br>从 Prompt 创作</small></span>
          </button>
        </div>
      `;
    }
    return `
      <div class="source-card source-drop-zone" data-source-drop-zone>
        <img src="${escapeAttr(state.source.src)}" alt="${escapeAttr(state.source.name || '主体参考图')}">
        <span><strong>${escapeHtml(state.source.name || '已引用页面图片')}</strong><small>${escapeHtml(
          state.analyzedSource
          || (state.source.width && state.source.height
            ? `原图 ${state.source.width} × ${state.source.height}`
            : '可先让 AI 识别主体，再选择物体模板')
        )}</small></span>
        <button type="button" class="icon-button" data-action="clear-source" title="移除参考图">${icon('close')}</button>
      </div>
    `;
  }

  function bindSourceDropZone() {
    const zone = refs.templatePanel?.querySelector('[data-source-drop-zone]');
    if (!zone) return;
    let dragDepth = 0;
    const hasDraggedFiles = event => Array.from(event.dataTransfer?.types || []).includes('Files');
    const clearDragState = () => {
      dragDepth = 0;
      zone.classList.remove('is-drag-over');
    };
    zone.addEventListener('dragenter', event => {
      if (!hasDraggedFiles(event)) return;
      event.preventDefault();
      event.stopPropagation();
      dragDepth += 1;
      zone.classList.add('is-drag-over');
    });
    zone.addEventListener('dragover', event => {
      if (!hasDraggedFiles(event)) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
      zone.classList.add('is-drag-over');
    });
    zone.addEventListener('dragleave', event => {
      if (!hasDraggedFiles(event)) return;
      event.preventDefault();
      event.stopPropagation();
      dragDepth = Math.max(0, dragDepth - 1);
      if (!dragDepth) zone.classList.remove('is-drag-over');
    });
    zone.addEventListener('drop', async event => {
      if (!hasDraggedFiles(event)) return;
      event.preventDefault();
      event.stopPropagation();
      clearDragState();
      if (state.busy) {
        setStatus('当前任务完成后再替换主体参考图', 'error');
        return;
      }
      const file = Array.from(event.dataTransfer?.files || []).find(isImageFile);
      if (!file) {
        setStatus('拖入内容中没有可用图片', 'error');
        return;
      }
      await setSourceFromFile(file, { source: 'drop' });
    });
  }

  function panelSectionClass(sectionId) {
    return `editor-section collapsible-section ${
      state.collapsedPanelSections[sectionId] ? 'is-collapsed' : ''
    }`;
  }

  function panelSectionHeading(sectionId, marker, title, badge = '') {
    const collapsed = Boolean(state.collapsedPanelSections[sectionId]);
    return `
      <button type="button" class="section-title section-toggle" data-action="toggle-panel-section"
        data-panel-section-id="${escapeAttr(sectionId)}" aria-expanded="${collapsed ? 'false' : 'true'}">
        <span>${escapeHtml(marker)}</span><strong>${escapeHtml(title)}</strong>${badge}
        <i class="section-collapse-icon">${icon(collapsed ? 'down' : 'up')}</i>
      </button>
    `;
  }

  function renderTemplatePanel(options = {}) {
    if (!refs.templatePanel) return;
    const previousScrollTop = options.resetScroll
      ? 0
      : refs.templatePanel.querySelector('.panel-scroll')?.scrollTop || 0;
    const isObject = state.activeTab === 'object';
    const busy = Boolean(state.busy);
    refs.templatePanel.innerHTML = `
      <div class="panel-scroll">
        <div class="mode-tabs">
          <button type="button" data-action="switch-tab" data-tab="object" class="${isObject ? 'is-active' : ''}">${icon('image')}物体模板</button>
          <button type="button" data-action="switch-tab" data-tab="text" class="${!isObject ? 'is-active' : ''}">${icon('type')}文字模板</button>
        </div>

        <section class="${panelSectionClass('image-model')} image-model-section">
          ${panelSectionHeading('image-model', 'AI', '生图模型')}
          <div class="section-content">
          <div class="image-model-switch">
            <button type="button" data-action="set-image-model" data-image-model="lite"
              class="${state.imageModelTier === 'lite' ? 'is-active' : ''}" ${busy ? 'disabled' : ''}>
              <strong>Lite</strong><small>速度优先 · 适合预览</small>
            </button>
            <button type="button" data-action="set-image-model" data-image-model="pro"
              class="${state.imageModelTier === 'pro' ? 'is-active' : ''}" ${busy ? 'disabled' : ''}>
              <strong>Pro</strong><small>质量优先 · 适合定稿</small>
            </button>
          </div>
          <p class="field-help">当前使用 ${imageModelLabel()}；模型选择同时应用于模板生成、图层编辑和 AI 抠图。</p>
          </div>
        </section>

        ${isObject ? `
          <section class="${panelSectionClass('object-source')}">
            ${panelSectionHeading('object-source', '01', '开始方式', '<em class="optional-badge">图片可选</em>')}
            <div class="section-content">
            ${sourceCardHtml()}
            <div class="source-actions" ${state.source ? '' : 'hidden'}>
              <button type="button" class="secondary-button" data-action="choose-source">${icon('upload')}上传</button>
              <button type="button" class="secondary-button" data-action="analyze-source" ${!state.source || busy ? 'disabled' : ''}>
                ${icon('wand')}${state.busy === 'analyze' ? '识别中…' : 'AI 识别'}
              </button>
            </div>
            </div>
          </section>
          <section class="${panelSectionClass('object-prompt')}">
            ${panelSectionHeading(
              'object-prompt',
              '02',
              '生成描述',
              state.source ? '<em class="optional-badge">可选补充</em>' : '<em class="required-badge">必填</em>'
            )}
            <div class="section-content">
            <textarea rows="4" data-ref-dynamic="objectPrompt" placeholder="${state.objectGenerationMode === 'full'
              ? '例如：雾蓝森林中，一棵枝叶舒展的大树，白色飞鸟穿过树冠，画面安静通透'
              : '例如：一只举着咖啡杯的小猫，完整居中，姿态轻松'}">${escapeHtml(state.objectPrompt)}</textarea>
            <p class="prompt-path-help">${state.objectGenerationMode === 'full'
              ? state.source
                ? '<strong>有图转换：</strong>保留原图主体、环境和构图，并按描述补充调整。'
                : '<strong>无图创作：</strong>描述主体、环境与构图，直接生成铺满画面的完整插画。'
              : state.source
                ? '<strong>有图重绘：</strong>参考图片决定主体，描述用于补充希望保留或修改的细节。'
                : '<strong>无图创作：</strong>只需描述主体，再选择风格即可生成透明素材。'}</p>
            </div>
          </section>
          <section class="${panelSectionClass('object-style')}">
            ${panelSectionHeading('object-style', '03', '物体风格')}
            <div class="section-content">
            <div class="custom-style-toolbar">
              <button type="button" data-action="new-custom-style">${icon('plus')}自定义风格</button>
              <button type="button" data-action="import-custom-style">${icon('upload')}导入 JSON</button>
            </div>
            ${customStyleEditorHtml()}
            <div class="template-list">${objectTemplates().map(item => templateItem(item, 'object', state.selectedObjectTemplate)).join('')}</div>
            </div>
          </section>
          <section class="${panelSectionClass('object-range')}">
            ${panelSectionHeading('object-range', '04', '生成范围')}
            <div class="section-content">
            <div class="generation-mode">
              <button type="button" data-action="set-generation-mode" data-generation-mode="subject"
                class="${state.objectGenerationMode === 'subject' ? 'is-active' : ''}">
                <strong>主体素材</strong><small>有图重绘 / 无图生成<br>自动抠成透明背景</small>
              </button>
              <button type="button" data-action="set-generation-mode" data-generation-mode="full"
                class="${state.objectGenerationMode === 'full' ? 'is-active' : ''}">
                <strong>整图插画</strong><small>有图转换 / 无图创作<br>生成完整场景</small>
              </button>
            </div>
            <label class="control-range">
              <span>风格强度 <b>${state.objectStyleStrength}%</b></span>
              <input type="range" min="0" max="100" value="${state.objectStyleStrength}" data-generation-control="style-strength">
            </label>
            <p class="field-help">风格强度只控制生图前的插画风格转换，不会改变抠图范围；抠图请在图层中打开「抠图微调」。</p>
            </div>
          </section>
          <section class="${panelSectionClass('object-ratio')}">
            ${panelSectionHeading('object-ratio', '05', '生图比例')}
            <div class="section-content">
            <div class="generation-ratios">
              ${SEEDREAM_ASPECT_RATIOS.map(ratio => `
                <button type="button" data-action="set-generation-ratio" data-generation-ratio="${ratio}"
                  class="${state.generationAspectRatio === ratio ? 'is-active' : ''}">${ratio}</button>
              `).join('')}
            </div>
            <p class="field-help">${state.source?.width && state.source?.height
              ? `原图 ${state.source.width} × ${state.source.height}，已匹配最近支持比例 ${state.generationAspectRatio}；模型将自动使用合法 2K 尺寸 ${state.generationSize.width} × ${state.generationSize.height}。`
              : `当前 ${state.generationAspectRatio}，模型将自动使用合法 2K 尺寸 ${state.generationSize.width} × ${state.generationSize.height}。上传图片后会自动匹配最近支持比例。`}</p>
            </div>
          </section>
          <button type="button" class="primary-button generate-button" data-action="generate-object"
            ${busy ? 'disabled' : ''}>
            ${icon('sparkle')}${state.busy === 'object'
              ? state.objectGenerationMode === 'full'
                ? state.source ? '正在转换整图插画…' : '正在绘制完整场景…'
                : '正在生成透明插画…'
              : state.objectGenerationMode === 'full'
                ? state.source ? '转换为整图插画' : '从描述生成整图'
                : state.source ? '重绘透明主体' : '从描述生成主体'}
          </button>
        ` : `
          <section class="${panelSectionClass('text-style')}">
            ${panelSectionHeading('text-style', '01', '文字风格')}
            <div class="section-content">
            <div class="template-list">${TEXT_TEMPLATES.map(item => templateItem(item, 'text', state.selectedTextTemplate)).join('')}</div>
            </div>
          </section>
          <section class="${panelSectionClass('text-input')}">
            ${panelSectionHeading('text-input', '02', '输入文字')}
            <div class="section-content">
            <textarea rows="3" data-ref-dynamic="textInput" placeholder="输入要绘制的中文或英文">${escapeHtml(state.textValue)}</textarea>
            </div>
          </section>
          <section class="${panelSectionClass('text-layout')}">
            ${panelSectionHeading('text-layout', '03', '排版要求')}
            <div class="section-content">
            <textarea rows="3" data-ref-dynamic="textLayoutPrompt" placeholder="例如：两列错位竖排，英文从中间穿过">${escapeHtml(state.textLayoutPrompt)}</textarea>
            <p class="field-help">文字会生成独立透明图片，之后仍可在画板中旋转、缩放和叠放。</p>
            </div>
          </section>
          <button type="button" class="primary-button generate-button" data-action="generate-text" ${busy ? 'disabled' : ''}>
            ${icon('sparkle')}${state.busy === 'text' ? '正在绘制艺术字体…' : '绘制艺术字体'}
          </button>
        `}
      </div>
      <input type="file" accept="image/*" hidden data-ref-dynamic="sourceInput">
      <input type="file" accept="image/*" hidden data-ref-dynamic="customStyleImageInput">
      <input type="file" accept="application/json,.json" hidden data-ref-dynamic="customStyleJsonInput">
    `;
    refs.objectPrompt = refs.templatePanel.querySelector('[data-ref-dynamic="objectPrompt"]');
    refs.textInput = refs.templatePanel.querySelector('[data-ref-dynamic="textInput"]');
    refs.textLayoutPrompt = refs.templatePanel.querySelector('[data-ref-dynamic="textLayoutPrompt"]');
    refs.sourceInput = refs.templatePanel.querySelector('[data-ref-dynamic="sourceInput"]');
    refs.customStyleName = refs.templatePanel.querySelector('[data-ref-dynamic="customStyleName"]');
    refs.customStylePrompt = refs.templatePanel.querySelector('[data-ref-dynamic="customStylePrompt"]');
    refs.customStyleImageInput = refs.templatePanel.querySelector('[data-ref-dynamic="customStyleImageInput"]');
    refs.customStyleJsonInput = refs.templatePanel.querySelector('[data-ref-dynamic="customStyleJsonInput"]');
    if (!options.resetScroll) {
      const panelScroll = refs.templatePanel.querySelector('.panel-scroll');
      if (panelScroll) panelScroll.scrollTop = previousScrollTop;
    }
    bindSourceDropZone();
  }

  function layerListItem(layer, nested) {
    const selected = layer.id === state.selectedLayerId;
    const multiSelected = state.selectedLayerIds.includes(layer.id);
    const effectivelyVisible = effectiveLayerVisible(layer);
    return `
      <div class="layer-row ${selected ? 'is-selected' : ''} ${
        state.multiSelectMode && multiSelected ? 'is-multi-selected' : ''
      } ${!effectivelyVisible ? 'is-hidden' : ''} ${nested ? 'is-group-child' : ''}"
        data-action="select-layer" data-layer-id="${escapeAttr(layer.id)}">
        <span class="layer-thumb">
          <img src="${escapeAttr(layer.thumbnailSrc || layer.src)}" alt="" loading="lazy" decoding="async">
          ${state.multiSelectMode ? `
            <button type="button" class="layer-check ${multiSelected ? 'is-checked' : ''}"
              data-action="toggle-layer-selection" data-layer-id="${escapeAttr(layer.id)}"
              title="${multiSelected ? '取消选择' : '选择用于分组'}">${multiSelected ? icon('check') : ''}</button>
          ` : ''}
        </span>
        <span class="layer-copy"><strong>${escapeHtml(layer.name)}</strong><small>${
          layer.kind === 'text'
            ? '艺术字'
            : layer.kind === 'object'
              ? '透明插画主体'
              : layer.kind === 'full-image'
                ? '整图插画'
                : '导入图片'
        }</small></span>
        <span class="layer-actions">
          <button type="button" data-action="toggle-layer-visibility" data-layer-id="${escapeAttr(layer.id)}"
            title="${layer.visible === false ? '显示图层' : '隐藏图层'}">${icon(layer.visible === false ? 'eyeOff' : 'eye')}</button>
          <button type="button" data-action="layer-up" data-layer-id="${escapeAttr(layer.id)}" title="上移一层">${icon('up')}</button>
          <button type="button" data-action="layer-down" data-layer-id="${escapeAttr(layer.id)}" title="下移一层">${icon('down')}</button>
        </span>
      </div>
    `;
  }

  function layerGroupItem(unit) {
    const { group } = unit;
    const members = [...unit.layers].reverse();
    return `
      <section class="layer-group ${group.collapsed ? 'is-collapsed' : ''} ${
        group.visible === false ? 'is-group-hidden' : ''
      }" data-group-id="${escapeAttr(group.id)}">
        <div class="layer-group-header">
          <button type="button" class="group-disclosure" data-action="toggle-group-collapse"
            data-group-id="${escapeAttr(group.id)}" title="${group.collapsed ? '展开分组' : '收起分组'}">${
              group.collapsed ? '▸' : '▾'
            }</button>
          <span class="group-icon">${icon('layers')}</span>
          <span class="group-copy">
            <input class="group-name-input" type="text" maxlength="40"
              value="${escapeAttr(group.name)}" data-group-name="${escapeAttr(group.id)}"
              aria-label="分组名称" title="点击修改分组名称">
            <small>${members.length} 个图层</small>
          </span>
          <span class="group-actions">
            <button type="button" data-action="toggle-group-visibility" data-group-id="${escapeAttr(group.id)}"
              title="${group.visible === false ? '显示分组' : '隐藏分组'}">${icon(group.visible === false ? 'eyeOff' : 'eye')}</button>
            <button type="button" class="group-ungroup" data-action="ungroup-layers"
              data-group-id="${escapeAttr(group.id)}" title="取消分组">解</button>
          </span>
        </div>
        <div class="layer-group-items">
          ${members.map(layer => layerListItem(layer, true)).join('')}
        </div>
      </section>
    `;
  }

  function layerListSignature() {
    return JSON.stringify({
      multiSelectMode: state.multiSelectMode,
      multiSelection: state.multiSelectMode ? state.selectedLayerIds : [],
      layers: state.layers.map(layer => [
        layer.id,
        layer.assetId,
        layer.name,
        layer.kind,
        layer.groupId,
        layer.visible !== false
      ]),
      groups: state.layerGroups.map(group => [
        group.id,
        group.name,
        group.visible !== false,
        group.collapsed
      ])
    });
  }

  function syncLayerListSelection(list) {
    list?.querySelectorAll('.layer-row').forEach(row => {
      const layerId = row.dataset.layerId;
      row.classList.toggle('is-selected', layerId === state.selectedLayerId);
      row.classList.toggle(
        'is-multi-selected',
        state.multiSelectMode && state.selectedLayerIds.includes(layerId)
      );
    });
  }

  function renderLayersPanel() {
    if (!refs.layersPanel) return;
    const previousList = refs.layersPanel.querySelector('.layers-list');
    const previousScrollTop = previousList?.scrollTop || 0;
    const listSignature = layerListSignature();
    const reusePreviousList = previousList?.dataset.signature === listSignature;
    const layer = selectedLayer();
    const selectedCount = state.selectedLayerIds.length;
    const hasGroupedSelection = state.layers.some(layer => (
      state.selectedLayerIds.includes(layer.id) && Boolean(layer.groupId)
    ));
    const panelItems = reusePreviousList
      ? ''
      : layerStackUnits()
        .reverse()
        .map(unit => unit.type === 'group' ? layerGroupItem(unit) : layerListItem(unit.layer, false))
        .join('');
    refs.layersPanel.innerHTML = `
      <div class="layers-heading">
        <div class="layers-title"><span>LAYERS</span><strong>图层</strong></div>
        <div class="layers-heading-actions">
          <button type="button" class="asset-export-button" data-action="export-assets-images" title="把全部图层素材导出为 PNG 压缩包">图片包</button>
          <button type="button" class="asset-export-button" data-action="export-assets-json" title="导出不含图片二进制的轻量工程元数据">JSON</button>
          <button type="button" class="icon-button" data-action="choose-canvas-image" title="导入图片到画板">${icon('plus')}</button>
        </div>
      </div>
      <div class="layers-bulk-toolbar ${state.multiSelectMode ? 'is-active' : ''}">
        <button type="button" class="multi-select-toggle" data-action="toggle-multi-select">
          ${state.multiSelectMode ? '完成多选' : '多选图层'}
        </button>
        ${state.multiSelectMode ? `
          <span class="bulk-selection-count">已选 ${selectedCount}</span>
          <button type="button" class="bulk-action" data-action="create-layer-group" ${selectedCount >= 2 ? '' : 'disabled'}>成组</button>
          <button type="button" class="bulk-action" data-action="ungroup-selected" ${hasGroupedSelection ? '' : 'disabled'}>解组</button>
          <button type="button" class="bulk-action" data-action="export-selected-layers" ${selectedCount && !state.busy ? '' : 'disabled'}>导出</button>
          <button type="button" class="bulk-action is-danger" data-action="delete-selected-layers" ${selectedCount && !isCanvasEditBlocked() ? '' : 'disabled'}>删除</button>
        ` : '<span class="bulk-toolbar-help">勾选多个图层后建立分组</span>'}
      </div>
      <div class="layers-list">
        ${state.layers.length
          ? panelItems
          : `<div class="layers-empty">${icon('layers')}<strong>画板还是空的</strong><span>生成模板素材，或直接导入 PNG/JPG</span></div>`}
      </div>
      ${layer ? `
        <div class="layer-properties">
          <div class="property-heading">
            <strong>${state.multiSelectMode && selectedCount > 1 ? `主选图层 · 已选 ${selectedCount}` : '选中图层'}</strong>
            <span class="property-actions">
              <button type="button" data-action="toggle-layer-visibility" data-layer-id="${escapeAttr(layer.id)}"
                title="${layer.visible === false ? '显示图层' : '隐藏图层'}">${icon(layer.visible === false ? 'eyeOff' : 'eye')}</button>
              <button type="button" data-action="download-layer" data-layer-id="${escapeAttr(layer.id)}" title="单独下载 PNG">${icon('download')}</button>
              <button type="button" data-action="copy-layer-image" data-layer-id="${escapeAttr(layer.id)}" title="复制图片到剪贴板">${icon('clipboard')}</button>
              <button type="button" data-action="duplicate-layer" data-layer-id="${escapeAttr(layer.id)}" title="复制图层">${icon('copy')}</button>
              <button type="button" data-action="delete-layer" data-layer-id="${escapeAttr(layer.id)}" title="删除">${icon('trash')}</button>
            </span>
          </div>
          <label><span>缩放 <b>${Math.round(layer.scale * 100)}%</b></span><input type="range" min="8" max="400" value="${Math.round(layer.scale * 100)}" data-property="scale"></label>
          <label><span>旋转 <b>${Math.round(layer.rotation)}°</b></span><input type="range" min="-180" max="180" value="${Math.round(layer.rotation)}" data-property="rotation"></label>
          <label><span>透明度 <b>${Math.round(layer.opacity * 100)}%</b></span><input type="range" min="5" max="100" value="${Math.round(layer.opacity * 100)}" data-property="opacity"></label>
          <div class="flip-actions">
            <button type="button" class="secondary-button" data-action="flip-x">水平翻转</button>
            <button type="button" class="secondary-button" data-action="flip-y">垂直翻转</button>
            <button type="button" class="secondary-button cutout-button" data-action="cutout-layer" ${state.busy ? 'disabled' : ''}>
              ${icon('wand')}${state.busy === 'cutout' ? '正在抠图…' : '智能抠图'}
            </button>
            <button type="button" class="secondary-button paint-button" data-action="open-paint-editor" ${isCanvasEditBlocked() ? 'disabled' : ''}>
              ${icon('brush')}抠图微调
            </button>
          </div>
        </div>
        <div class="ai-edit-panel">
          <div class="section-title"><span>AI</span><strong>继续编辑结果</strong></div>
          <textarea rows="3" data-ref-dynamic="editPrompt" placeholder="例如：叶片更舒展，线条再粗一点">${escapeHtml(state.editPrompt)}</textarea>
          <div class="ai-edit-actions">
            <button type="button" class="secondary-button" data-action="restore-revision" ${layer.revisions?.length && !isCanvasEditBlocked() ? '' : 'disabled'}>回退上版</button>
            <button type="button" class="primary-button" data-action="edit-layer" ${state.busy ? 'disabled' : ''}>${icon('wand')}${state.busy === 'edit' ? '编辑中…' : '生成修改'}</button>
          </div>
        </div>
      ` : ''}
      <input type="file" accept="image/*" multiple hidden data-ref-dynamic="canvasInput">
    `;
    refs.editPrompt = refs.layersPanel.querySelector('[data-ref-dynamic="editPrompt"]');
    refs.canvasInput = refs.layersPanel.querySelector('[data-ref-dynamic="canvasInput"]');
    let layersList = refs.layersPanel.querySelector('.layers-list');
    if (reusePreviousList && previousList && layersList) {
      layersList.replaceWith(previousList);
      layersList = previousList;
    }
    if (layersList) {
      layersList.dataset.signature = listSignature;
      layersList.scrollTop = previousScrollTop;
      syncLayerListSelection(layersList);
    }
  }

  function renderToolbarState() {
    if (!shadow) return;
    shadow.querySelector('[data-action="undo"]')?.toggleAttribute('disabled', !state.undo.length || isCanvasEditBlocked());
    shadow.querySelector('[data-action="redo"]')?.toggleAttribute('disabled', !state.redo.length || isCanvasEditBlocked());
    shadow.querySelector('[data-action="export"]')?.toggleAttribute('disabled', !state.layers.length || Boolean(state.busy));
    shadow.querySelector('[data-action="export-assets-images"]')
      ?.toggleAttribute('disabled', !state.layers.length || Boolean(state.busy));
    shadow.querySelector('[data-action="export-assets-json"]')
      ?.toggleAttribute('disabled', !state.layers.length || Boolean(state.busy));
    if (refs.canvasRatio) refs.canvasRatio.value = closestAspectRatio(state.canvas.width, state.canvas.height);
    if (refs.backgroundInput) refs.backgroundInput.value = state.canvas.background;
    if (refs.workspaceBackgroundInput) refs.workspaceBackgroundInput.value = state.workspace.background;
    if (refs.exportScale) refs.exportScale.value = String(state.exportScale);
    if (refs.workspaceZoomValue) {
      refs.workspaceZoomValue.textContent = `${Math.round(state.workspace.zoom * 100)}%`;
    }
    shadow.querySelector('.workspace-background-control')
      ?.style.setProperty('--workspace-color', state.workspace.background);
  }

  function setCanvasRatio(ratio) {
    if (isCanvasEditBlocked()) return;
    const [w, h] = ratio.split(':').map(Number);
    if (!w || !h) return;
    pushUndo();
    const oldWidth = state.canvas.width;
    const oldHeight = state.canvas.height;
    const longEdge = 960;
    state.canvas.width = w >= h ? longEdge : Math.round(longEdge * w / h);
    state.canvas.height = h >= w ? longEdge : Math.round(longEdge * h / w);
    state.layers.forEach(layer => {
      layer.x = layer.x / oldWidth * state.canvas.width;
      layer.y = layer.y / oldHeight * state.canvas.height;
      layer.width = layer.width / oldWidth * state.canvas.width;
      layer.height = layer.height / oldHeight * state.canvas.height;
    });
    renderCanvas();
    renderLayersPanel();
    renderToolbarState();
  }

  async function importCanvasFile(file, position, options) {
    if (!file) return;
    if (!isImageFile(file)) {
      setStatus('请选择 PNG、JPG 或 WebP 图片', 'error');
      return false;
    }
    try {
      await addImageLayer(file, {
        name: file.name,
        kind: 'image',
        x: Number.isFinite(position?.x) ? position.x : undefined,
        y: Number.isFinite(position?.y) ? position.y : undefined
      });
      if (!options?.silent) setStatus('图片已导入工作区', 'success');
      return true;
    } catch (error) {
      setStatus(error?.message || '图片导入失败', 'error');
      return false;
    }
  }

  async function importCanvasFiles(fileList, position, options) {
    const files = Array.from(fileList || []).filter(isImageFile);
    if (!files.length) {
      setStatus('拖入内容中没有可用图片', 'error');
      return 0;
    }
    const offset = 28 / Math.max(0.01, workspaceBaseScale() * state.workspace.zoom);
    let imported = 0;
    for (const [index, file] of files.entries()) {
      const added = await importCanvasFile(file, {
        x: (position?.x ?? state.canvas.width / 2) + index * offset,
        y: (position?.y ?? state.canvas.height / 2) + index * offset
      }, { silent: true });
      if (added) imported += 1;
    }
    if (imported) {
      setStatus(
        options?.source === 'drop'
          ? `已在拖放位置加入 ${imported} 张图片`
          : `已导入 ${imported} 张图片到工作区`,
        'success'
      );
    }
    return imported;
  }

  function safeFileName(value, fallback) {
    const cleaned = String(value || '')
      .normalize('NFKC')
      .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 72);
    return cleaned || fallback;
  }

  function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  async function imageSourceToPngBlob(src) {
    let editableSrc = src;
    if (/^https?:\/\//i.test(src)) {
      try {
        editableSrc = await urlToDataUrl(src);
      } catch (_) {
        editableSrc = src;
      }
    }
    const image = await loadImage(editableSrc, true);
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;
    canvas.getContext('2d').drawImage(image, 0, 0);
    try {
      return await new Promise((resolve, reject) => {
        try {
          canvas.toBlob(blob => {
            if (blob) resolve(blob);
            else reject(new Error('PNG 编码失败'));
          }, 'image/png');
        } catch (error) {
          reject(error);
        }
      });
    } finally {
      canvas.width = 0;
      canvas.height = 0;
    }
  }

  async function layerPngBlob(layer) {
    const record = await readAssetRecord(layer.assetId);
    if (!record?.originalBlob) throw new Error(`图片资源不存在：${layer.assetId}`);
    if (record.originalBlob.type === 'image/png') return record.originalBlob;
    const sourceUrl = cacheAssetUrl(layer.assetId, 'original', record.originalBlob);
    return imageSourceToPngBlob(sourceUrl);
  }

  async function downloadLayerImage(id) {
    const layer = layerById(id);
    if (!layer || isCanvasEditBlocked()) return;
    try {
      setStatus(`正在准备「${layer.name}」…`, 'working');
      const blob = await layerPngBlob(layer);
      downloadBlob(blob, `${safeFileName(layer.name, 'poster-layer')}.png`);
      setStatus(`已单独下载「${layer.name}」`, 'success');
    } catch (error) {
      setStatus(error?.message || '图层下载失败，远程图片可能禁止读取', 'error');
    }
  }

  async function copyLayerImage(id) {
    const layer = layerById(id);
    if (!layer || isCanvasEditBlocked()) return;
    if (!navigator.clipboard?.write || typeof window.ClipboardItem !== 'function') {
      setStatus('当前浏览器不支持复制图片，请使用单独下载', 'error');
      return;
    }
    try {
      setStatus(`正在复制「${layer.name}」…`, 'working');
      const blob = await layerPngBlob(layer);
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      setStatus(`已将「${layer.name}」复制到剪贴板`, 'success');
    } catch (error) {
      setStatus(error?.message || '复制图片失败，请确认已允许剪贴板权限', 'error');
    }
  }

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (let index = 0; index < bytes.length; index += 1) {
      crc ^= bytes[index];
      for (let bit = 0; bit < 8; bit += 1) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
      }
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function zipDateTime(date) {
    const year = Math.max(1980, date.getFullYear());
    return {
      time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
      date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
    };
  }

  function buildStoredZip(entries) {
    const encoder = new TextEncoder();
    const localParts = [];
    const centralParts = [];
    let offset = 0;
    const now = zipDateTime(new Date());

    entries.forEach(entry => {
      const name = encoder.encode(entry.name);
      const data = entry.data instanceof Uint8Array ? entry.data : new Uint8Array(entry.data);
      const checksum = crc32(data);
      const local = new Uint8Array(30 + name.length);
      const localView = new DataView(local.buffer);
      localView.setUint32(0, 0x04034b50, true);
      localView.setUint16(4, 20, true);
      localView.setUint16(6, 0x0800, true);
      localView.setUint16(8, 0, true);
      localView.setUint16(10, now.time, true);
      localView.setUint16(12, now.date, true);
      localView.setUint32(14, checksum, true);
      localView.setUint32(18, data.length, true);
      localView.setUint32(22, data.length, true);
      localView.setUint16(26, name.length, true);
      localView.setUint16(28, 0, true);
      local.set(name, 30);
      localParts.push(local, data);

      const central = new Uint8Array(46 + name.length);
      const centralView = new DataView(central.buffer);
      centralView.setUint32(0, 0x02014b50, true);
      centralView.setUint16(4, 20, true);
      centralView.setUint16(6, 20, true);
      centralView.setUint16(8, 0x0800, true);
      centralView.setUint16(10, 0, true);
      centralView.setUint16(12, now.time, true);
      centralView.setUint16(14, now.date, true);
      centralView.setUint32(16, checksum, true);
      centralView.setUint32(20, data.length, true);
      centralView.setUint32(24, data.length, true);
      centralView.setUint16(28, name.length, true);
      centralView.setUint16(30, 0, true);
      centralView.setUint16(32, 0, true);
      centralView.setUint16(34, 0, true);
      centralView.setUint16(36, 0, true);
      centralView.setUint32(38, 0, true);
      centralView.setUint32(42, offset, true);
      central.set(name, 46);
      centralParts.push(central);
      offset += local.length + data.length;
    });

    const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
    const end = new Uint8Array(22);
    const endView = new DataView(end.buffer);
    endView.setUint32(0, 0x06054b50, true);
    endView.setUint16(4, 0, true);
    endView.setUint16(6, 0, true);
    endView.setUint16(8, entries.length, true);
    endView.setUint16(10, entries.length, true);
    endView.setUint32(12, centralSize, true);
    endView.setUint32(16, offset, true);
    endView.setUint16(20, 0, true);
    return new Blob([...localParts, ...centralParts, end], { type: 'application/zip' });
  }

  async function createStreamingZipWriter(fileName) {
    if (typeof window.showSaveFilePicker !== 'function') return null;
    const handle = await window.showSaveFilePicker({
      suggestedName: fileName,
      types: [{ description: 'ZIP 压缩包', accept: { 'application/zip': ['.zip'] } }]
    });
    const writable = await handle.createWritable();
    const encoder = new TextEncoder();
    const centralParts = [];
    const now = zipDateTime(new Date());
    let offset = 0;
    let count = 0;
    return {
      async add(nameValue, value) {
        const name = encoder.encode(nameValue);
        const data = value instanceof Blob
          ? new Uint8Array(await value.arrayBuffer())
          : value instanceof Uint8Array
            ? value
            : new Uint8Array(value);
        const checksum = crc32(data);
        const local = new Uint8Array(30 + name.length);
        const localView = new DataView(local.buffer);
        localView.setUint32(0, 0x04034b50, true);
        localView.setUint16(4, 20, true);
        localView.setUint16(6, 0x0800, true);
        localView.setUint16(8, 0, true);
        localView.setUint16(10, now.time, true);
        localView.setUint16(12, now.date, true);
        localView.setUint32(14, checksum, true);
        localView.setUint32(18, data.length, true);
        localView.setUint32(22, data.length, true);
        localView.setUint16(26, name.length, true);
        localView.setUint16(28, 0, true);
        local.set(name, 30);
        await writable.write(local);
        await writable.write(data);

        const central = new Uint8Array(46 + name.length);
        const centralView = new DataView(central.buffer);
        centralView.setUint32(0, 0x02014b50, true);
        centralView.setUint16(4, 20, true);
        centralView.setUint16(6, 20, true);
        centralView.setUint16(8, 0x0800, true);
        centralView.setUint16(10, 0, true);
        centralView.setUint16(12, now.time, true);
        centralView.setUint16(14, now.date, true);
        centralView.setUint32(16, checksum, true);
        centralView.setUint32(20, data.length, true);
        centralView.setUint32(24, data.length, true);
        centralView.setUint16(28, name.length, true);
        centralView.setUint32(42, offset, true);
        central.set(name, 46);
        centralParts.push(central);
        offset += local.length + data.length;
        count += 1;
      },
      async close() {
        const centralOffset = offset;
        let centralSize = 0;
        for (const central of centralParts) {
          await writable.write(central);
          centralSize += central.length;
        }
        const end = new Uint8Array(22);
        const endView = new DataView(end.buffer);
        endView.setUint32(0, 0x06054b50, true);
        endView.setUint16(8, count, true);
        endView.setUint16(10, count, true);
        endView.setUint32(12, centralSize, true);
        endView.setUint32(16, centralOffset, true);
        await writable.write(end);
        await writable.close();
      },
      async abort() {
        try {
          await writable.abort();
        } catch (_) {
          // Ignore cleanup failure after a cancelled or failed export.
        }
      }
    };
  }

  async function exportAssetsAsImages(layers, scopeLabel) {
    if (!layers.length || state.busy) return;
    state.busy = 'export-assets';
    renderLayersPanel();
    renderToolbarState();
    setStatus(`正在整理${scopeLabel} ${layers.length} 个图层素材…`, 'working');
    const archiveName = `poster-diy-${scopeLabel === '所选' ? 'selected-' : ''}assets-${new Date().toISOString().slice(0, 10)}.zip`;
    let zipWriter = null;
    try {
      zipWriter = await createStreamingZipWriter(archiveName);
      if (!zipWriter && layers.length > 20) {
        throw new Error('当前浏览器不支持流式 ZIP；请使用多选分批导出，每批不超过 20 张');
      }
      const entries = [];
      const manifestLayers = [];
      const failures = [];
      for (let index = 0; index < layers.length; index += 1) {
        const layer = layers[index];
        const fileName = `${String(index + 1).padStart(3, '0')}-${safeFileName(layer.name, `layer-${index + 1}`)}.png`;
        try {
          const blob = await layerPngBlob(layer);
          if (zipWriter) await zipWriter.add(`images/${fileName}`, blob);
          else entries.push({ name: `images/${fileName}`, data: new Uint8Array(await blob.arrayBuffer()) });
          const { src, restoreSrc, originalSrc, thumbnailSrc, revisions, ...metadata } = layer;
          manifestLayers.push({ ...metadata, assetFile: `images/${fileName}` });
        } catch (error) {
          failures.push({ layerId: layer.id, name: layer.name, error: error?.message || '图片读取失败' });
        }
        setStatus(`正在整理${scopeLabel}图层素材 ${index + 1}/${layers.length}…`, 'working');
        await nextFrame();
      }
      if (!manifestLayers.length) throw new Error('没有可读取并导出的图层图片');
      const manifest = {
        format: 'tabbit-poster-diy-assets',
        version: 3,
        exportedAt: new Date().toISOString(),
        canvas: { ...state.canvas },
        workspace: { ...state.workspace },
        layerGroups: state.layerGroups
          .filter(group => manifestLayers.some(layer => layer.groupId === group.id))
          .map(group => ({ ...group })),
        layers: manifestLayers,
        failures
      };
      const manifestData = new TextEncoder().encode(JSON.stringify(manifest, null, 2));
      if (zipWriter) {
        await zipWriter.add('manifest.json', manifestData);
        await zipWriter.close();
        zipWriter = null;
      } else {
        entries.push({ name: 'manifest.json', data: manifestData });
        downloadBlob(buildStoredZip(entries), archiveName);
      }
      setStatus(
        failures.length
          ? `已导出 ${manifestLayers.length} 张素材；${failures.length} 张图片未能读取`
          : `已将${scopeLabel} ${manifestLayers.length} 张素材打包为 ZIP`,
        failures.length ? 'error' : 'success'
      );
    } catch (error) {
      await zipWriter?.abort();
      setStatus(
        error?.name === 'AbortError' ? '已取消素材导出' : error?.message || '素材图片导出失败',
        error?.name === 'AbortError' ? 'neutral' : 'error'
      );
    } finally {
      state.busy = '';
      renderLayersPanel();
      renderToolbarState();
    }
  }

  function exportAllAssetsAsImages() {
    return exportAssetsAsImages([...state.layers], '全部');
  }

  function exportSelectedLayersAsImages() {
    const selectedIds = new Set(state.selectedLayerIds);
    const layers = state.layers.filter(layer => selectedIds.has(layer.id));
    if (!layers.length) {
      setStatus('请先在多选模式中勾选要导出的图层', 'error');
      return;
    }
    return exportAssetsAsImages(layers, '所选');
  }

  function exportProjectJson() {
    if (!state.layers.length || state.busy) return;
    try {
      const json = JSON.stringify(projectData(), null, 2);
      downloadBlob(
        new Blob([json], { type: 'application/json;charset=utf-8' }),
        `poster-diy-project-${new Date().toISOString().slice(0, 10)}.json`
      );
      setStatus(`已导出 ${state.layers.length} 个图层的轻量工程元数据；图片资源仍保存在本机缓存`, 'success');
    } catch (error) {
      setStatus(error?.message || 'JSON 工程导出失败', 'error');
    }
  }

  async function exportPoster() {
    if (!state.layers.length || state.busy) return;
    const exportScale = [1, 2, 3, 4].includes(Number(state.exportScale))
      ? Number(state.exportScale)
      : 1;
    setStatus(`正在合成 ${exportScale}× PNG…`, 'working');
    const canvas = document.createElement('canvas');
    canvas.width = state.canvas.width * exportScale;
    canvas.height = state.canvas.height * exportScale;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = state.canvas.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(exportScale, exportScale);
    try {
      for (const layer of state.layers) {
        if (!effectiveLayerVisible(layer)) continue;
        const record = await readAssetRecord(layer.assetId);
        if (!record?.originalBlob) throw new Error(`图片资源不存在：${layer.assetId}`);
        const image = await createImageBitmap(record.originalBlob);
        ctx.save();
        ctx.globalAlpha = layer.opacity;
        ctx.translate(layer.x, layer.y);
        ctx.rotate(layer.rotation * Math.PI / 180);
        ctx.scale(layer.scale * layer.flipX, layer.scale * layer.flipY);
        ctx.drawImage(image, -layer.width / 2, -layer.height / 2, layer.width, layer.height);
        ctx.restore();
        image.close();
        await nextFrame();
      }
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('PNG 编码失败');
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `poster-diy-${new Date().toISOString().slice(0, 10)}.png`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus(`已导出 ${canvas.width} × ${canvas.height} PNG`, 'success');
    } catch (error) {
      console.error('[Poster DIY] export failed', error);
      setStatus('导出失败：某个远程图片禁止画布读取；请重新上传该图或使用生成图 Base64 结果', 'error');
    } finally {
      canvas.width = 0;
      canvas.height = 0;
    }
  }

  function shellHtml() {
    return `
      <button type="button" class="launcher" data-ref="launcher" data-action="toggle-studio" aria-label="打开海报 DIY">
        ${icon('sparkle')}<span>海报 DIY</span>
      </button>
      <section class="studio" data-ref="studio" hidden aria-label="海报 DIY 工作台">
        <header class="studio-header" data-ref="studioHeader" title="拖动这里移动浮窗">
          <div class="brand">
            <span class="brand-mark">${icon('sparkle')}</span>
            <span class="brand-copy">
              <span class="brand-title"><strong>POSTER DIY</strong><em>DES.野玫瑰桃乐丝</em></span>
              <small>透明素材生成与自由拼贴画板</small>
            </span>
          </div>
          <div class="canvas-controls">
            <span class="control-label">画布</span>
            <select data-ref="canvasRatio" aria-label="画布比例">
              ${SEEDREAM_ASPECT_RATIOS.map(ratio => `
                <option value="${ratio}" ${ratio === closestAspectRatio(state.canvas.width, state.canvas.height) ? 'selected' : ''}>${ratio}</option>
              `).join('')}
            </select>
            <label class="background-control" title="背景颜色"><input type="color" data-ref="backgroundInput" value="${escapeAttr(state.canvas.background)}"><span></span></label>
            <span class="control-label workspace-color-label">工作区</span>
            <label class="background-control workspace-background-control" title="无限工作区颜色">
              <input type="color" data-ref="workspaceBackgroundInput" aria-label="无限工作区颜色"
                value="${escapeAttr(state.workspace.background)}"><span></span>
            </label>
            <span class="workspace-zoom-controls" title="Ctrl/⌘ + 滚轮缩放，滚轮平移">
              <button type="button" data-action="workspace-zoom-out" title="缩小工作区">−</button>
              <button type="button" class="workspace-zoom-value" data-ref="workspaceZoomValue"
                data-action="workspace-fit" title="适配并居中画板">${Math.round(state.workspace.zoom * 100)}%</button>
              <button type="button" data-action="workspace-zoom-in" title="放大工作区">+</button>
            </span>
          </div>
          <div class="header-actions">
            <button type="button" class="icon-button" data-action="undo" title="撤销">${icon('undo')}</button>
            <button type="button" class="icon-button" data-action="redo" title="重做">${icon('redo')}</button>
            <label class="export-scale-control" title="PNG 导出清晰度">
              <span>清晰度</span>
              <select data-ref="exportScale">
                <option value="1" ${state.exportScale === 1 ? 'selected' : ''}>1×</option>
                <option value="2" ${state.exportScale === 2 ? 'selected' : ''}>2× 高清</option>
                <option value="3" ${state.exportScale === 3 ? 'selected' : ''}>3× 超清</option>
                <option value="4" ${state.exportScale === 4 ? 'selected' : ''}>4×</option>
              </select>
            </label>
            <button type="button" class="export-button" data-action="export">${icon('download')}导出 PNG</button>
            <button type="button" class="icon-button close-button" data-action="close-studio" title="关闭">${icon('close')}</button>
          </div>
        </header>
        <div class="studio-body">
          <aside class="template-panel" data-ref="templatePanel"></aside>
          <main class="canvas-workspace">
            <div class="canvas-viewport" data-ref="canvasViewport">
              <div class="poster-canvas" data-ref="canvas">
                <div class="canvas-grid"></div>
                <div class="layer-stage" data-ref="layerStage"></div>
              </div>
              <div class="canvas-hint">拖入图片 · 空白处/空格拖拽平移 · 滚轮平移 · Ctrl/⌘ + 滚轮缩放</div>
            </div>
            <div class="status-bar">
              <span class="status-dot"></span>
              <span data-ref="status" data-kind="${escapeAttr(state.statusKind)}">${escapeHtml(state.status)}</span>
            </div>
          </main>
          <aside class="layers-panel" data-ref="layersPanel"></aside>
        </div>
        <div class="paint-editor" data-ref="paintEditor" hidden>
          <div class="paint-editor-dialog" role="dialog" aria-modal="true" aria-label="单图抠图微调">
            <header class="paint-editor-header">
              <div>
                <strong data-ref="paintEditorTitle">抠图微调</strong>
                <small>滑动参数实时预览，也可以用修复画笔和橡皮擦处理局部边缘</small>
              </div>
              <button type="button" class="icon-button" data-action="close-paint-editor" title="取消并关闭">${icon('close')}</button>
            </header>
            <div class="paint-editor-body">
              <div class="paint-stage" data-ref="paintStage">
                <canvas data-ref="paintCanvas"></canvas>
              </div>
              <aside class="paint-controls">
                <div class="section-title"><span>01</span><strong>实时抠图</strong></div>
                <label class="paint-range cutout-live-control"><span>主体保留 <b data-ref="cutoutRetentionValue">${DEFAULT_CUTOUT_RETENTION}%</b></span>
                  <input type="range" min="0" max="100" value="${DEFAULT_CUTOUT_RETENTION}" data-ref="cutoutRetention" data-cutout-control="retention">
                </label>
                <label class="paint-range cutout-live-control"><span>边缘柔化 <b data-ref="cutoutFeatherValue">0px</b></span>
                  <input type="range" min="0" max="16" value="0" data-ref="cutoutFeather" data-cutout-control="feather">
                </label>
                <p class="cutout-live-help" data-ref="cutoutLiveHelp">保留越高越不容易误删；调到 100% 会严格恢复抠图前完整图片。</p>
                <div class="section-title paint-tool-heading"><span>02</span><strong>局部工具</strong></div>
                <div class="paint-tools">
                  <button type="button" data-action="set-paint-tool" data-paint-tool="restore">
                    ${icon('wand')}<strong>修复画笔</strong><small>恢复误删像素</small>
                  </button>
                  <button type="button" data-action="set-paint-tool" data-paint-tool="erase">
                    ${icon('eraser')}<strong>橡皮擦</strong><small>继续删除区域</small>
                  </button>
                  <button type="button" data-action="set-paint-tool" data-paint-tool="paint">
                    ${icon('brush')}<strong>彩色画笔</strong><small>局部补色和标记</small>
                  </button>
                </div>
                <label class="paint-range"><span>笔刷大小 <b data-ref="paintSizeValue">32px</b></span>
                  <input type="range" min="4" max="120" value="32" data-ref="paintSize" data-paint-control="size">
                </label>
                <label class="paint-range"><span>笔刷透明度 <b data-ref="paintOpacityValue">100%</b></span>
                  <input type="range" min="5" max="100" value="100" data-ref="paintOpacity" data-paint-control="opacity">
                </label>
                <label class="paint-color-control"><span>画笔颜色</span>
                  <input type="color" value="#ff633d" data-ref="paintColor" data-paint-control="color">
                </label>
                <p class="paint-editor-help" data-ref="paintEditorHelp"></p>
                <div class="paint-history-actions">
                  <button type="button" class="secondary-button" data-action="paint-undo" disabled>${icon('undo')}撤销一笔</button>
                  <button type="button" class="secondary-button" data-action="paint-reset">重置</button>
                </div>
              </aside>
            </div>
            <footer class="paint-editor-footer">
              <span>修改只作用于当前图层，画板中的缩放、旋转和位置不会改变。</span>
              <div>
                <button type="button" class="secondary-button" data-action="close-paint-editor">取消</button>
                <button type="button" class="primary-button" data-action="apply-paint-editor">${icon('check')}应用精修</button>
              </div>
            </footer>
          </div>
        </div>
      </section>
    `;
  }

  function styles() {
    return `
      :host {
        all: initial;
        color: #181813;
        font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "PingFang SC", "Segoe UI", sans-serif;
        --ink: #181813;
        --paper: #f6f3ea;
        --panel: #fbfaf5;
        --line: rgba(24,24,19,.13);
        --muted: rgba(24,24,19,.56);
        --lime: #d9ff43;
        --orange: #ff633d;
        --blue: #42679b;
        --shadow: 0 24px 80px rgba(20,24,19,.22);
      }
      * { box-sizing: border-box; }
      button, input, textarea, select { font: inherit; }
      button { color: inherit; }
      [hidden] { display: none !important; }
      svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
      .launcher {
        position: fixed;
        right: 24px;
        bottom: 86px;
        z-index: 2147483000;
        height: 48px;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 0 18px;
        border: 1px solid rgba(255,255,255,.7);
        border-radius: 999px;
        background: rgba(22,24,19,.94);
        color: #fff;
        box-shadow: 0 16px 40px rgba(0,0,0,.24);
        backdrop-filter: blur(18px);
        cursor: pointer;
        pointer-events: auto;
        transition: transform .18s ease, box-shadow .18s ease;
      }
      .launcher:hover { transform: translateY(-2px); box-shadow: 0 20px 48px rgba(0,0,0,.28); }
      .launcher span { font-size: 13px; font-weight: 760; letter-spacing: .06em; }
      .studio {
        position: fixed;
        top: 64px;
        left: 50%;
        width: min(1440px, calc(100vw - 88px));
        height: min(880px, calc(100vh - 128px));
        z-index: 2147481000;
        display: grid;
        grid-template-rows: 66px minmax(0,1fr);
        overflow: hidden;
        border: 1px solid rgba(24,24,19,.15);
        border-radius: 22px;
        background: var(--paper);
        box-shadow: var(--shadow);
        pointer-events: auto;
        transform: translateX(-50%);
      }
      .studio-header {
        display: grid;
        grid-template-columns: minmax(260px,1fr) auto minmax(260px,1fr);
        align-items: center;
        gap: 18px;
        padding: 0 18px;
        border-bottom: 1px solid var(--line);
        background: rgba(251,250,245,.93);
        backdrop-filter: blur(22px);
        cursor: grab;
        touch-action: none;
        user-select: none;
      }
      .studio-header.is-dragging { cursor: grabbing; }
      .studio-header button, .studio-header input, .studio-header label, .studio-header select { cursor: pointer; }
      .brand { display: flex; align-items: center; gap: 11px; min-width: 0; }
      .brand-mark { width: 36px; height: 36px; display: grid; place-items: center; background: var(--lime); border-radius: 11px; }
      .brand-copy { min-width: 0; display: grid; gap: 2px; }
      .brand-title { display: flex; align-items: baseline; gap: 7px; white-space: nowrap; }
      .brand strong { font-family: "Arial Narrow", Inter, sans-serif; font-size: 15px; letter-spacing: .12em; }
      .brand-title em { color: var(--orange); font-size: 9px; font-style: normal; font-weight: 750; letter-spacing: .03em; }
      .brand small { color: var(--muted); font-size: 11px; }
      .canvas-controls, .header-actions { display: flex; align-items: center; gap: 7px; }
      .header-actions { justify-self: end; }
      .control-label { color: var(--muted); font-size: 11px; margin-right: 2px; }
      .canvas-controls button, .icon-button {
        height: 34px;
        min-width: 34px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0 10px;
        border: 1px solid var(--line);
        border-radius: 10px;
        background: #fff;
        font-size: 11px;
        cursor: pointer;
      }
      .canvas-controls button.is-active { border-color: var(--ink); background: var(--ink); color: #fff; }
      .canvas-controls select {
        height: 34px;
        min-width: 72px;
        padding: 0 26px 0 10px;
        border: 1px solid var(--line);
        border-radius: 10px;
        background: #fff;
        color: var(--ink);
        font-size: 11px;
        font-weight: 700;
        outline: none;
      }
      button:disabled { opacity: .4; cursor: not-allowed !important; }
      .background-control { position: relative; width: 34px; height: 34px; border: 1px solid var(--line); border-radius: 10px; overflow: hidden; cursor: pointer; background: #fff; }
      .background-control input { position: absolute; inset: -8px; width: 50px; height: 50px; opacity: 0; cursor: pointer; }
      .background-control span { position: absolute; inset: 8px; border-radius: 50%; background: var(--canvas-color, #f4f0e8); box-shadow: inset 0 0 0 1px rgba(0,0,0,.12); pointer-events: none; }
      .workspace-color-label { margin: 0 -3px 0 2px; }
      .workspace-background-control span { background: var(--workspace-color, #fff); }
      .workspace-zoom-controls {
        height: 34px;
        display: grid;
        grid-template-columns: 27px 48px 27px;
        align-items: stretch;
        overflow: hidden;
        margin-left: 2px;
        border: 1px solid var(--line);
        border-radius: 10px;
        background: #fff;
      }
      .workspace-zoom-controls button {
        min-width: 0;
        padding: 0;
        border: 0;
        border-right: 1px solid var(--line);
        border-radius: 0;
        background: transparent;
        color: var(--ink);
        font-size: 12px;
        font-weight: 760;
        cursor: pointer;
      }
      .workspace-zoom-controls button:last-child { border-right: 0; }
      .workspace-zoom-controls .workspace-zoom-value { font-size: 9px; }
      .export-button, .primary-button {
        min-height: 38px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        border: 0;
        border-radius: 11px;
        padding: 0 16px;
        background: var(--ink);
        color: #fff;
        font-weight: 700;
        font-size: 12px;
        cursor: pointer;
      }
      .export-button { height: 38px; background: var(--orange); }
      .export-scale-control {
        height: 34px;
        display: flex;
        align-items: center;
        gap: 5px;
        padding: 0 7px;
        border: 1px solid var(--line);
        border-radius: 10px;
        background: #fff;
        cursor: pointer;
      }
      .export-scale-control span { color: var(--muted); font-size: 9px; }
      .export-scale-control select { max-width: 72px; border: 0; background: transparent; color: var(--ink); font-size: 10px; font-weight: 700; outline: none; cursor: pointer; }
      .close-button { margin-left: 4px; }
      .studio-body { min-height: 0; display: grid; grid-template-columns: 316px minmax(420px,1fr) 286px; }
      .template-panel, .layers-panel { min-width: 0; overflow: hidden; background: var(--panel); }
      .template-panel { border-right: 1px solid var(--line); }
      .layers-panel { border-left: 1px solid var(--line); display: flex; flex-direction: column; }
      .panel-scroll { height: 100%; overflow: auto; padding: 16px 15px 24px; }
      .mode-tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; padding: 4px; border-radius: 13px; background: #ece9df; margin-bottom: 17px; }
      .mode-tabs button {
        height: 38px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        border: 0;
        border-radius: 10px;
        background: transparent;
        color: var(--muted);
        font-size: 12px;
        font-weight: 690;
        cursor: pointer;
      }
      .mode-tabs button.is-active { background: #fff; color: var(--ink); box-shadow: 0 2px 10px rgba(24,24,19,.08); }
      .editor-section { margin-bottom: 18px; }
      .section-title { display: flex; align-items: center; gap: 8px; margin-bottom: 9px; }
      button.section-title {
        width: 100%;
        padding: 0;
        border: 0;
        background: transparent;
        color: inherit;
        text-align: left;
        cursor: pointer;
      }
      .section-title span { min-width: 22px; color: var(--orange); font: 700 10px/1 Inter,sans-serif; letter-spacing: .08em; }
      .section-title strong { font-size: 12px; }
      .section-title em {
        margin-left: auto;
        padding: 3px 7px;
        border-radius: 999px;
        font-size: 8px;
        font-style: normal;
        font-weight: 750;
        letter-spacing: .03em;
      }
      .section-collapse-icon {
        width: 18px;
        height: 18px;
        display: grid;
        place-items: center;
        margin-left: auto;
        color: var(--muted);
      }
      .section-title em + .section-collapse-icon { margin-left: 0; }
      .section-collapse-icon svg { width: 13px; height: 13px; }
      .collapsible-section.is-collapsed .section-title { margin-bottom: 0; }
      .collapsible-section.is-collapsed .section-content { display: none; }
      .optional-badge { background: #ece9df; color: var(--muted); }
      .required-badge { background: rgba(255,99,61,.13); color: #c54324; }
      textarea {
        width: 100%;
        resize: vertical;
        border: 1px solid var(--line);
        border-radius: 11px;
        background: #fff;
        color: var(--ink);
        padding: 11px 12px;
        font-size: 12px;
        line-height: 1.55;
        outline: none;
      }
      textarea:focus { border-color: rgba(24,24,19,.56); box-shadow: 0 0 0 3px rgba(217,255,67,.35); }
      .field-help { margin: 7px 2px 0; color: var(--muted); font-size: 10px; line-height: 1.5; }
      .prompt-path-help {
        margin: 8px 0 0;
        padding: 9px 10px;
        border-radius: 9px;
        background: rgba(66,103,155,.08);
        color: var(--muted);
        font-size: 9px;
        line-height: 1.5;
      }
      .prompt-path-help strong { color: var(--blue); }
      .image-model-section { padding: 11px; border: 1px solid var(--line); border-radius: 13px; background: rgba(255,255,255,.55); }
      .image-model-switch { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }
      .image-model-switch button {
        min-height: 48px;
        display: grid;
        align-content: center;
        gap: 3px;
        padding: 8px 10px;
        border: 1px solid var(--line);
        border-radius: 10px;
        background: #fff;
        color: var(--ink);
        text-align: left;
        cursor: pointer;
      }
      .image-model-switch button strong { font-size: 11px; }
      .image-model-switch button small { color: var(--muted); font-size: 8px; line-height: 1.35; }
      .image-model-switch button.is-active { border-color: var(--ink); background: rgba(217,255,67,.24); box-shadow: inset 0 0 0 1px var(--ink); }
      .image-model-switch button:disabled { cursor: default; opacity: .55; }
      .generation-mode { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }
      .generation-mode button {
        min-height: 58px;
        display: grid;
        align-content: center;
        gap: 4px;
        padding: 8px;
        border: 1px solid var(--line);
        border-radius: 11px;
        background: #fff;
        text-align: left;
        cursor: pointer;
      }
      .generation-mode button strong { font-size: 11px; }
      .generation-mode button small { color: var(--muted); font-size: 8px; line-height: 1.35; }
      .generation-mode button.is-active { border-color: var(--ink); background: rgba(217,255,67,.2); box-shadow: inset 0 0 0 1px var(--ink); }
      .control-range { display: grid; gap: 6px; margin-top: 10px; }
      .control-range > span { display: flex; justify-content: space-between; color: var(--muted); font-size: 9px; }
      .control-range b { color: var(--ink); }
      .generation-ratios { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
      .generation-ratios button {
        min-height: 31px;
        border: 1px solid var(--line);
        border-radius: 9px;
        background: #fff;
        color: var(--ink);
        font-size: 9px;
        font-weight: 700;
        cursor: pointer;
      }
      .generation-ratios button.is-active {
        border-color: var(--ink);
        background: rgba(217,255,67,.28);
        box-shadow: inset 0 0 0 1px var(--ink);
      }
      .source-choice-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }
      .source-choice {
        position: relative;
        min-height: 88px;
        display: grid;
        align-content: center;
        justify-items: start;
        gap: 8px;
        padding: 11px;
        border: 1px dashed rgba(24,24,19,.28);
        border-radius: 12px;
        background: rgba(255,255,255,.62);
        color: var(--ink);
        text-align: left;
        cursor: pointer;
      }
      .source-choice.is-prompt {
        border-style: solid;
        border-color: rgba(66,103,155,.38);
        background: rgba(66,103,155,.08);
      }
      .source-choice > svg { width: 20px; height: 20px; color: var(--blue); }
      .source-choice span { display: grid; gap: 3px; }
      .source-choice strong { font-size: 10px; }
      .source-choice small { color: var(--muted); font-size: 8px; line-height: 1.4; }
      .source-choice:hover { border-color: var(--ink); transform: translateY(-1px); }
      .source-empty {
        position: relative;
        width: 100%;
        min-height: 72px;
        display: flex;
        align-items: center;
        gap: 11px;
        padding: 12px;
        border: 1px dashed rgba(24,24,19,.28);
        border-radius: 12px;
        background: rgba(255,255,255,.52);
        text-align: left;
        cursor: pointer;
      }
      .source-empty > svg { width: 23px; height: 23px; }
      .source-empty span { display: grid; gap: 4px; }
      .source-empty strong { font-size: 12px; }
      .source-empty small { color: var(--muted); font-size: 10px; line-height: 1.35; }
      .source-card {
        position: relative;
        overflow: hidden;
        display: grid;
        grid-template-columns: 54px 1fr 30px;
        align-items: center;
        gap: 9px;
        padding: 8px;
        border: 1px solid var(--line);
        border-radius: 12px;
        background: #fff;
      }
      .source-card > img { width: 54px; height: 54px; object-fit: cover; border-radius: 8px; background: #eee; }
      .source-card > span { min-width: 0; display: grid; gap: 3px; }
      .source-card strong, .source-card small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .source-card strong { font-size: 11px; }
      .source-card small { color: var(--muted); font-size: 9px; }
      .source-card .icon-button { width: 28px; min-width: 28px; height: 28px; padding: 0; }
      .source-drop-zone {
        transition: border-color .15s ease, background-color .15s ease, box-shadow .15s ease;
      }
      .source-drop-zone.is-drag-over {
        border-color: var(--orange);
        background: #fff6f1;
        box-shadow: inset 0 0 0 1px var(--orange);
      }
      .source-drop-zone.is-drag-over::after {
        content: "松开图片，设为参考图";
        position: absolute;
        inset: 4px;
        z-index: 5;
        display: grid;
        place-items: center;
        border-radius: 9px;
        background: rgba(255,255,255,.94);
        color: var(--orange);
        font-size: 11px;
        font-weight: 750;
        pointer-events: none;
      }
      .source-actions, .flip-actions, .ai-edit-actions { display: flex; gap: 7px; margin-top: 8px; }
      .secondary-button {
        min-height: 34px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        flex: 1;
        border: 1px solid var(--line);
        border-radius: 10px;
        background: #fff;
        font-size: 11px;
        font-weight: 650;
        cursor: pointer;
      }
      .custom-style-toolbar {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 7px;
        margin-bottom: 9px;
      }
      .custom-style-toolbar button {
        min-height: 34px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        border: 1px dashed rgba(24,24,19,.26);
        border-radius: 10px;
        background: rgba(255,255,255,.6);
        color: var(--ink);
        font-size: 10px;
        font-weight: 700;
        cursor: pointer;
      }
      .custom-style-toolbar button:hover { border-color: var(--ink); background: #fff; }
      .custom-style-toolbar svg { width: 14px; height: 14px; }
      .custom-style-editor {
        display: grid;
        gap: 9px;
        margin-bottom: 10px;
        padding: 10px;
        border: 1px solid var(--ink);
        border-radius: 12px;
        background: #fffdf6;
        box-shadow: 0 10px 28px rgba(24,24,19,.08);
      }
      .custom-style-editor-heading { display: grid; gap: 3px; }
      .custom-style-editor-heading strong { font-size: 11px; }
      .custom-style-editor-heading small { color: var(--muted); font-size: 8px; line-height: 1.4; }
      .custom-style-reference {
        width: 100%;
        min-height: 108px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 9px;
        overflow: hidden;
        padding: 8px;
        border: 1px dashed rgba(24,24,19,.34);
        border-radius: 10px;
        background: #f0eee6;
        color: var(--ink);
        cursor: pointer;
      }
      .custom-style-reference:hover { border-color: var(--orange); }
      .custom-style-reference > svg { width: 22px; height: 22px; }
      .custom-style-reference > span { display: grid; gap: 3px; text-align: left; }
      .custom-style-reference strong { font-size: 10px; }
      .custom-style-reference small { color: var(--muted); font-size: 8px; }
      .custom-style-reference.has-image { padding: 4px; border-style: solid; }
      .custom-style-reference img { width: 100%; height: 132px; display: block; object-fit: contain; border-radius: 7px; }
      .custom-style-field { display: grid; gap: 5px; }
      .custom-style-field > span { font-size: 9px; font-weight: 750; }
      .custom-style-field input {
        width: 100%;
        min-height: 34px;
        padding: 8px 9px;
        border: 1px solid var(--line);
        border-radius: 9px;
        background: #fff;
        color: var(--ink);
        font: inherit;
      }
      .custom-style-field textarea { min-height: 118px; font-size: 10px; line-height: 1.5; }
      .custom-style-editor > p { margin: 0; color: var(--muted); font-size: 8px; line-height: 1.45; }
      .custom-style-editor-actions { display: flex; gap: 7px; }
      .custom-style-editor-actions .primary-button { flex: 1; min-height: 34px; }
      .custom-style-card-actions {
        display: grid;
        grid-template-columns: 1fr 1.35fr 1fr;
        gap: 5px;
        margin-top: -3px;
      }
      .custom-style-card-actions button {
        min-height: 27px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: rgba(255,255,255,.66);
        color: var(--muted);
        font-size: 8px;
        font-weight: 700;
        cursor: pointer;
      }
      .custom-style-card-actions button:hover { border-color: var(--ink); color: var(--ink); background: #fff; }
      .template-list { display: grid; gap: 7px; }
      .template-item { min-width: 0; display: grid; gap: 7px; }
      .template-card {
        position: relative;
        width: 100%;
        min-height: 70px;
        display: grid;
        grid-template-columns: 58px minmax(0,1fr) 24px;
        align-items: center;
        gap: 10px;
        padding: 7px 8px;
        border: 1px solid var(--line);
        border-radius: 12px;
        background: #fff;
        text-align: left;
        cursor: pointer;
        transition: border .16s ease, transform .16s ease, box-shadow .16s ease;
      }
      .template-card:hover { transform: translateY(-1px); box-shadow: 0 8px 22px rgba(24,24,19,.08); }
      .template-card.is-selected { border-color: var(--ink); box-shadow: inset 0 0 0 1px var(--ink); }
      .template-preview {
        width: 58px;
        height: 54px;
        display: grid;
        place-items: center;
        overflow: hidden;
        border-radius: 9px;
        background: var(--template-bg, #f2ead1);
        box-shadow: inset 0 0 0 1px rgba(24,24,19,.07);
      }
      .template-preview img { width: 100%; height: 100%; object-fit: contain; padding: 2px; }
      .template-preview b { font-size: 16px; color: var(--ink); }
      .template-copy { min-width: 0; display: grid; gap: 3px; }
      .template-copy strong { font-size: 11px; }
      .template-copy small {
        overflow: hidden;
        color: var(--muted);
        font-size: 9px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .template-palette { display: flex; gap: 3px; margin-top: 2px; }
      .template-palette i { width: 12px; height: 4px; border-radius: 99px; background: var(--swatch); box-shadow: inset 0 0 0 1px rgba(0,0,0,.06); }
      .template-check { width: 20px; height: 20px; display: none; place-items: center; border-radius: 50%; background: var(--lime); }
      .template-check svg { width: 12px; height: 12px; }
      .template-card.is-selected .template-check { display: grid; }
      .template-reference-panel {
        padding: 10px;
        border-radius: 12px;
        background: #eeece4;
      }
      .template-reference-heading {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 8px;
      }
      .template-reference-heading strong { font-size: 10px; }
      .template-reference-heading span { color: var(--muted); font-size: 8px; }
      .template-reference-grid { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 6px; }
      .template-reference-card {
        min-width: 0;
        display: grid;
        gap: 5px;
        padding: 4px;
        border: 1px solid transparent;
        border-radius: 10px;
        background: transparent;
        text-align: left;
        cursor: pointer;
      }
      .template-reference-card:hover { background: rgba(255,255,255,.62); }
      .template-reference-card.is-selected {
        border-color: var(--ink);
        background: #fff;
        box-shadow: inset 0 0 0 1px var(--ink);
      }
      .template-reference-image {
        position: relative;
        width: 100%;
        aspect-ratio: 1;
        display: grid;
        place-items: center;
        overflow: hidden;
        border-radius: 7px;
        background: #ddd9ce;
      }
      .template-reference-image > img { width: 100%; height: 100%; display: block; object-fit: cover; }
      .template-reference-image > b { font-size: 12px; }
      .template-reference-image > i {
        position: absolute;
        top: 4px;
        right: 4px;
        width: 18px;
        height: 18px;
        display: none;
        place-items: center;
        border-radius: 50%;
        background: var(--lime);
        color: var(--ink);
        box-shadow: 0 2px 7px rgba(24,24,19,.18);
      }
      .template-reference-image > i svg { width: 11px; height: 11px; }
      .template-reference-card.is-selected .template-reference-image > i { display: grid; }
      .template-reference-card > small {
        overflow: hidden;
        color: var(--muted);
        font-size: 8px;
        line-height: 1.25;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .template-reference-card.is-selected > small { color: var(--ink); font-weight: 700; }
      .template-reference-panel > p { margin: 8px 2px 0; color: var(--muted); font-size: 8px; line-height: 1.45; }
      .generate-button { width: 100%; min-height: 44px; background: var(--ink); }
      .generate-button svg { color: var(--lime); }
      .canvas-workspace { min-width: 0; min-height: 0; display: grid; grid-template-rows: minmax(0,1fr) 35px; background: #dcdad2; }
      .canvas-viewport {
        position: relative;
        min-width: 0;
        min-height: 0;
        overflow: hidden;
        cursor: grab;
        touch-action: none;
        background:
          linear-gradient(rgba(28,28,23,.065) 1px, transparent 1px),
          linear-gradient(90deg, rgba(28,28,23,.065) 1px, transparent 1px),
          var(--workspace-color, #fff);
        background-size:
          var(--workspace-grid-size, 24px) var(--workspace-grid-size, 24px),
          var(--workspace-grid-size, 24px) var(--workspace-grid-size, 24px);
        background-position:
          var(--workspace-grid-x, 50%) var(--workspace-grid-y, 50%),
          var(--workspace-grid-x, 50%) var(--workspace-grid-y, 50%);
      }
      .canvas-viewport.is-panning,
      .canvas-viewport.is-space-pan { cursor: grabbing; }
      .canvas-viewport.is-drag-over::after {
        content: "松开图片，加入工作区";
        position: absolute;
        inset: 14px;
        z-index: 40;
        display: grid;
        place-items: center;
        border: 2px dashed var(--orange);
        border-radius: 14px;
        background: rgba(255,255,255,.88);
        color: var(--ink);
        font-size: 13px;
        font-weight: 800;
        letter-spacing: .04em;
        pointer-events: none;
        backdrop-filter: blur(6px);
      }
      .poster-canvas {
        position: absolute;
        left: 50%;
        top: 50%;
        overflow: visible;
        transform-origin: center;
        background: #f4f0e8;
        box-shadow: 0 18px 55px rgba(28,30,23,.2), 0 0 0 1px rgba(28,30,23,.1);
        touch-action: none;
        will-change: transform;
      }
      .canvas-grid {
        position: absolute;
        inset: 0;
        opacity: .18;
        pointer-events: none;
        background-image: linear-gradient(rgba(28,28,23,.14) 1px, transparent 1px), linear-gradient(90deg, rgba(28,28,23,.14) 1px, transparent 1px);
        background-size: 24px 24px;
      }
      .layer-stage { position: absolute; inset: 0; }
      .poster-layer { position: absolute; transform-origin: center; cursor: move; user-select: none; touch-action: none; }
      .poster-layer img { width: 100%; height: 100%; display: block; object-fit: contain; pointer-events: none; user-select: none; }
      .poster-layer.is-selected::after { content: ""; position: absolute; inset: -5px; border: 1.5px solid var(--orange); pointer-events: none; }
      .poster-layer.is-multi-selected:not(.is-selected)::after { content: ""; position: absolute; inset: -5px; border: 1.5px dashed #8bb529; pointer-events: none; }
      .layer-handle { position: absolute; display: none; width: 15px; height: 15px; border: 2px solid #fff; border-radius: 50%; background: var(--orange); box-shadow: 0 2px 8px rgba(0,0,0,.25); pointer-events: auto; }
      .poster-layer.is-selected .layer-handle { display: block; }
      .scale-handle { right: -12px; bottom: -12px; cursor: nwse-resize; }
      .rotate-handle { left: 50%; top: -28px; transform: translateX(-50%); cursor: grab; }
      .rotate-handle::after { content: ""; position: absolute; left: 50%; top: 13px; width: 1px; height: 13px; background: var(--orange); }
      .canvas-hint { position: absolute; left: 50%; bottom: 10px; transform: translateX(-50%); padding: 6px 10px; border-radius: 99px; background: rgba(24,24,19,.66); color: #fff; font-size: 9px; pointer-events: none; }
      .status-bar { display: flex; align-items: center; gap: 8px; padding: 0 14px; border-top: 1px solid var(--line); background: rgba(251,250,245,.94); font-size: 10px; color: var(--muted); }
      .status-dot { width: 7px; height: 7px; border-radius: 50%; background: #9b9d94; }
      .status-bar [data-kind="working"] + * {}
      .status-bar:has([data-kind="working"]) .status-dot { background: var(--orange); animation: pulse 1s ease infinite; }
      .status-bar:has([data-kind="success"]) .status-dot { background: #6aa444; }
      .status-bar:has([data-kind="error"]) .status-dot { background: #d44535; }
      @keyframes pulse { 50% { opacity: .3; transform: scale(.7); } }
      .layers-heading { height: 56px; display: flex; align-items: center; justify-content: space-between; padding: 0 14px; border-bottom: 1px solid var(--line); }
      .layers-title { display: flex; align-items: baseline; gap: 8px; }
      .layers-heading span { color: var(--orange); font-size: 9px; font-weight: 800; letter-spacing: .12em; }
      .layers-heading strong { font-size: 13px; }
      .layers-heading-actions { display: flex; align-items: center; gap: 5px; }
      .layers-heading-actions .icon-button { width: 30px; min-width: 30px; height: 30px; padding: 0; }
      .asset-export-button {
        height: 28px;
        padding: 0 7px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: #fff;
        font-size: 8px;
        font-weight: 750;
        cursor: pointer;
      }
      .layers-bulk-toolbar {
        min-height: 40px;
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 6px;
        padding: 5px 9px;
        border-bottom: 1px solid var(--line);
        background: rgba(244,240,232,.72);
      }
      .multi-select-toggle, .bulk-action {
        min-height: 28px;
        padding: 0 8px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: #fff;
        font-size: 8px;
        font-weight: 750;
        cursor: pointer;
      }
      .layers-bulk-toolbar.is-active .multi-select-toggle { border-color: var(--ink); background: rgba(217,255,67,.3); }
      .bulk-action:disabled { opacity: .38; cursor: default; }
      .bulk-action.is-danger { border-color: rgba(190,45,38,.24); color: #a52c26; }
      .bulk-action.is-danger:not(:disabled):hover { background: rgba(190,45,38,.08); }
      .bulk-selection-count { margin-right: auto; color: var(--ink); font-size: 8px; font-weight: 750; white-space: nowrap; }
      .bulk-toolbar-help { min-width: 0; overflow: hidden; color: var(--muted); font-size: 8px; text-overflow: ellipsis; white-space: nowrap; }
      .layers-list { flex: 1 1 380px; min-height: min(260px, 38vh); overflow: auto; padding: 9px; border-bottom: 1px solid var(--line); }
      .layers-empty { height: 100%; min-height: 140px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 7px; color: var(--muted); text-align: center; }
      .layers-empty > svg { width: 28px; height: 28px; opacity: .5; }
      .layers-empty strong { color: var(--ink); font-size: 11px; }
      .layers-empty span { max-width: 160px; font-size: 9px; line-height: 1.45; }
      .layer-row { position: relative; display: grid; grid-template-columns: 42px minmax(0,1fr) auto; align-items: center; gap: 8px; min-height: 52px; padding: 6px; border: 1px solid transparent; border-radius: 10px; cursor: pointer; }
      .layer-row:hover { background: #fff; }
      .layer-row.is-selected { border-color: var(--ink); background: #fff; }
      .layer-row.is-multi-selected { border-color: rgba(115,145,0,.7); background: rgba(217,255,67,.18); }
      .layer-row.is-selected.is-multi-selected { border-color: var(--ink); box-shadow: inset 3px 0 0 var(--lime); }
      .layer-row.is-hidden { opacity: .48; }
      .layer-row.is-hidden .layer-thumb img { filter: grayscale(1); }
      .layer-thumb { position: relative; width: 42px; height: 40px; display: grid; place-items: center; overflow: visible; border-radius: 7px; background: repeating-conic-gradient(#eee 0 25%,#fff 0 50%) 50%/10px 10px; }
      .layer-thumb img { width: 100%; height: 100%; object-fit: contain; }
      .layer-check {
        position: absolute;
        left: -4px;
        top: -4px;
        width: 18px;
        height: 18px;
        display: grid;
        place-items: center;
        padding: 0;
        border: 1px solid var(--ink);
        border-radius: 50%;
        background: #fff;
        color: var(--ink);
        cursor: pointer;
        z-index: 2;
      }
      .layer-check.is-checked { background: var(--lime); }
      .layer-check svg { width: 11px; height: 11px; }
      .layer-copy { min-width: 0; display: grid; gap: 3px; }
      .layer-copy strong, .layer-copy small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .layer-copy strong { font-size: 10px; }
      .layer-copy small { color: var(--muted); font-size: 8px; }
      .layer-actions { display: grid; grid-template-columns: 24px 24px 24px; }
      .layer-actions button, .property-actions button {
        width: 24px;
        height: 24px;
        display: grid;
        place-items: center;
        padding: 0;
        border: 0;
        background: transparent;
        cursor: pointer;
      }
      .layer-actions svg, .property-actions svg { width: 14px; height: 14px; }
      .layer-group { margin: 0 0 7px; overflow: hidden; border: 1px solid var(--line); border-radius: 11px; background: rgba(255,255,255,.72); }
      .layer-group-header {
        min-height: 40px;
        display: grid;
        grid-template-columns: 22px 22px minmax(0,1fr) auto;
        align-items: center;
        gap: 4px;
        padding: 4px 5px;
        background: #fff;
      }
      .group-disclosure, .group-actions button {
        width: 22px;
        height: 22px;
        display: grid;
        place-items: center;
        padding: 0;
        border: 0;
        background: transparent;
        color: var(--ink);
        font-size: 13px;
        cursor: pointer;
      }
      .group-icon { display: grid; place-items: center; color: var(--orange); }
      .group-icon svg { width: 15px; height: 15px; }
      .group-copy { min-width: 0; display: grid; gap: 1px; }
      .group-copy small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .group-name-input {
        min-width: 0;
        width: 100%;
        height: 20px;
        padding: 0 3px;
        border: 1px solid transparent;
        border-radius: 5px;
        background: transparent;
        color: var(--ink);
        font: 700 9px/1.2 Inter, sans-serif;
        outline: none;
      }
      .group-name-input:hover { border-color: var(--line); background: rgba(255,255,255,.72); }
      .group-name-input:focus { border-color: var(--orange); background: #fff; box-shadow: 0 0 0 2px rgba(255,99,61,.1); }
      .group-copy small { color: var(--muted); font-size: 7px; }
      .group-actions { display: flex; gap: 1px; }
      .group-actions svg { width: 14px; height: 14px; }
      .group-actions .group-ungroup { border-radius: 6px; background: #f1eee5; font-size: 8px; font-weight: 800; }
      .layer-group-items { padding: 3px 3px 4px 10px; border-top: 1px solid var(--line); }
      .layer-group.is-collapsed .layer-group-items { display: none; }
      .layer-group.is-group-hidden .layer-group-header { background: #f1efe8; }
      .layer-group.is-group-hidden .group-copy,
      .layer-group.is-group-hidden .layer-group-items { opacity: .46; }
      .layer-row.is-group-child { min-height: 48px; }
      .layer-properties { flex: 0 1 198px; max-height: 198px; overflow: auto; padding: 10px 13px; border-bottom: 1px solid var(--line); }
      .property-heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
      .property-heading strong { font-size: 11px; }
      .property-actions { display: flex; }
      .layer-properties label { display: grid; gap: 4px; margin: 6px 0; }
      .layer-properties label > span { display: flex; justify-content: space-between; color: var(--muted); font-size: 9px; }
      .layer-properties label b { color: var(--ink); font-weight: 700; }
      input[type="range"] { width: 100%; accent-color: var(--orange); }
      .flip-actions { flex-wrap: wrap; }
      .flip-actions .secondary-button { flex: 1 1 calc(50% - 4px); min-height: 30px; font-size: 9px; }
      .flip-actions .cutout-button { border-color: rgba(115,145,0,.34); background: rgba(217,255,67,.28); }
      .flip-actions .cutout-button svg { width: 14px; height: 14px; }
      .flip-actions .paint-button { border-color: rgba(255,99,61,.3); background: rgba(255,99,61,.08); }
      .flip-actions .paint-button svg { width: 14px; height: 14px; }
      .ai-edit-panel { flex: 0 1 148px; max-height: 148px; overflow: auto; padding: 11px 13px; }
      .ai-edit-actions .secondary-button { flex: 0 0 auto; padding: 0 10px; }
      .ai-edit-actions .primary-button { flex: 1; min-height: 36px; }
      .paint-editor {
        position: absolute;
        inset: 0;
        z-index: 30;
        display: grid;
        place-items: center;
        padding: 22px;
        background: rgba(20,20,17,.62);
        backdrop-filter: blur(9px);
      }
      .paint-editor-dialog {
        width: min(1100px, 100%);
        height: min(720px, 100%);
        min-height: 0;
        display: grid;
        grid-template-rows: 62px minmax(0,1fr) 62px;
        overflow: hidden;
        border: 1px solid rgba(255,255,255,.2);
        border-radius: 18px;
        background: var(--panel);
        box-shadow: 0 28px 90px rgba(0,0,0,.38);
      }
      .paint-editor-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 0 18px;
        border-bottom: 1px solid var(--line);
        background: #fff;
      }
      .paint-editor-header > div { min-width: 0; display: grid; gap: 3px; }
      .paint-editor-header strong, .paint-editor-header small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .paint-editor-header strong { font-size: 13px; }
      .paint-editor-header small { color: var(--muted); font-size: 9px; }
      .paint-editor-body { min-height: 0; display: grid; grid-template-columns: minmax(0,1fr) 250px; }
      .paint-stage {
        min-width: 0;
        min-height: 0;
        display: grid;
        place-items: center;
        overflow: hidden;
        padding: 20px;
        background:
          linear-gradient(45deg,#e6e6e2 25%,transparent 25%),
          linear-gradient(-45deg,#e6e6e2 25%,transparent 25%),
          linear-gradient(45deg,transparent 75%,#e6e6e2 75%),
          linear-gradient(-45deg,transparent 75%,#e6e6e2 75%),
          #f7f7f4;
        background-size: 24px 24px;
        background-position: 0 0,0 12px,12px -12px,-12px 0;
      }
      .paint-stage canvas {
        max-width: 100%;
        max-height: 100%;
        display: block;
        border: 1px solid rgba(24,24,19,.14);
        background: transparent;
        box-shadow: 0 12px 35px rgba(24,24,19,.14);
        cursor: crosshair;
        touch-action: none;
      }
      .paint-controls { min-height: 0; overflow: auto; padding: 16px; border-left: 1px solid var(--line); background: var(--panel); }
      .cutout-live-control { margin-top: 9px; }
      .cutout-live-control.is-disabled { opacity: .38; pointer-events: none; }
      .cutout-live-help {
        margin: 9px 0 15px;
        padding: 8px 9px;
        border-radius: 9px;
        background: rgba(217,255,67,.16);
        color: var(--muted);
        font-size: 8px;
        line-height: 1.5;
      }
      .cutout-live-help[data-kind="working"] { color: #765d00; background: rgba(255,202,54,.18); }
      .cutout-live-help[data-kind="error"] { color: #9a2f1c; background: rgba(255,99,61,.12); }
      .paint-tool-heading { margin-top: 16px; }
      .paint-tools { display: grid; gap: 7px; }
      .paint-tools button {
        min-height: 48px;
        display: grid;
        grid-template-columns: 24px minmax(0,1fr);
        grid-template-rows: auto auto;
        column-gap: 8px;
        align-items: center;
        padding: 7px 9px;
        border: 1px solid var(--line);
        border-radius: 10px;
        background: #fff;
        text-align: left;
        cursor: pointer;
      }
      .paint-tools button > svg { grid-row: 1 / 3; width: 19px; height: 19px; }
      .paint-tools button strong { font-size: 10px; }
      .paint-tools button small { color: var(--muted); font-size: 8px; }
      .paint-tools button.is-active { border-color: var(--ink); background: rgba(217,255,67,.25); box-shadow: inset 0 0 0 1px var(--ink); }
      .paint-range { display: grid; gap: 5px; margin-top: 14px; }
      .paint-range > span { display: flex; justify-content: space-between; color: var(--muted); font-size: 9px; }
      .paint-range b { color: var(--ink); }
      .paint-color-control { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 12px; color: var(--muted); font-size: 9px; transition: opacity .15s; }
      .paint-color-control.is-disabled { opacity: .36; pointer-events: none; }
      .paint-color-control input { width: 38px; height: 28px; padding: 0; border: 1px solid var(--line); border-radius: 8px; background: #fff; cursor: pointer; }
      .paint-editor-help { min-height: 46px; margin: 14px 0 0; padding: 9px; border-radius: 9px; background: rgba(66,103,155,.08); color: var(--muted); font-size: 8px; line-height: 1.55; }
      .paint-history-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; margin-top: 12px; }
      .paint-history-actions .secondary-button { min-height: 32px; font-size: 9px; }
      .paint-history-actions svg { width: 13px; height: 13px; }
      .paint-editor-footer { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 0 18px; border-top: 1px solid var(--line); background: #fff; }
      .paint-editor-footer > span { color: var(--muted); font-size: 9px; }
      .paint-editor-footer > div { display: flex; gap: 8px; }
      .paint-editor-footer .secondary-button { min-width: 72px; }
      .paint-editor-footer .primary-button { min-width: 110px; }
      @media (max-width: 1150px) {
        .studio {
          top: 42px;
          width: calc(100vw - 32px);
          height: calc(100vh - 84px);
        }
        .studio-body { grid-template-columns: 270px minmax(360px,1fr) 250px; }
        .studio-header { grid-template-columns: minmax(210px,1fr) auto minmax(210px,1fr); }
        .brand small { display: none; }
        .paint-editor-body { grid-template-columns: minmax(0,1fr) 220px; }
      }
      @media (max-width: 860px) {
        .studio {
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          border-radius: 0;
          transform: none;
        }
        .studio-header { grid-template-columns: 1fr auto; }
        .canvas-controls { display: none; }
        .studio-body { grid-template-columns: 238px minmax(330px,1fr); }
        .layers-panel { position: absolute; right: 0; top: 66px; bottom: 0; width: 246px; z-index: 5; box-shadow: -12px 0 30px rgba(0,0,0,.12); }
        .paint-editor { padding: 0; }
        .paint-editor-dialog { width: 100%; height: 100%; border-radius: 0; }
        .paint-editor-body { grid-template-columns: minmax(0,1fr) 210px; }
        .paint-editor-footer > span { display: none; }
      }
    `;
  }

  function bindStudioDrag() {
    const header = refs.studioHeader;
    const studio = refs.studio;
    if (!header || !studio) return;

    header.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.target.closest('button, input, label, textarea, select, a')) return;
      event.preventDefault();
      studioDragCleanup?.();

      const rect = studio.getBoundingClientRect();
      const startX = event.clientX;
      const startY = event.clientY;
      const pointerId = event.pointerId;
      const visibleEdge = 72;
      studio.style.inset = 'auto';
      studio.style.left = `${rect.left}px`;
      studio.style.top = `${rect.top}px`;
      studio.style.width = `${rect.width}px`;
      studio.style.height = `${rect.height}px`;
      studio.style.transform = 'none';
      header.classList.add('is-dragging');
      header.setPointerCapture?.(pointerId);

      const onMove = moveEvent => {
        if (moveEvent.pointerId !== pointerId) return;
        const minLeft = Math.min(0, visibleEdge - rect.width);
        const maxLeft = Math.max(0, window.innerWidth - visibleEdge);
        const minTop = 0;
        const maxTop = Math.max(0, window.innerHeight - visibleEdge);
        studio.style.left = `${Math.round(clamp(rect.left + moveEvent.clientX - startX, minLeft, maxLeft))}px`;
        studio.style.top = `${Math.round(clamp(rect.top + moveEvent.clientY - startY, minTop, maxTop))}px`;
      };

      const finish = endEvent => {
        if (endEvent && endEvent.pointerId !== pointerId) return;
        header.classList.remove('is-dragging');
        header.releasePointerCapture?.(pointerId);
        header.removeEventListener('pointermove', onMove);
        header.removeEventListener('pointerup', finish);
        header.removeEventListener('pointercancel', finish);
        studioDragCleanup = null;
      };

      studioDragCleanup = finish;
      header.addEventListener('pointermove', onMove);
      header.addEventListener('pointerup', finish);
      header.addEventListener('pointercancel', finish);
    });

    header.addEventListener('dblclick', event => {
      if (event.target.closest('button, input, label, textarea, select, a')) return;
      studio.removeAttribute('style');
      requestAnimationFrame(fitCanvas);
    });
  }

  function openStudio() {
    state.open = true;
    refs.studio.hidden = false;
    if (refs.launcher) refs.launcher.hidden = true;
    if (pageOverlay) {
      pageOverlay.hidden = true;
      pageOverlay.classList.add('is-studio-open');
      pageOverlay.querySelectorAll(`.${IMAGE_BUTTON_CLASS}`).forEach(button => {
        button.classList.remove('is-visible');
      });
    }
    renderTemplatePanel();
    renderCanvas();
    renderLayersPanel();
    renderToolbarState();
    requestAnimationFrame(fitCanvas);
  }

  function closeStudio() {
    closePaintEditor();
    state.open = false;
    scheduleCanvasImageVisibility();
    refs.studio.hidden = true;
    if (refs.launcher) refs.launcher.hidden = false;
    if (pageOverlay) {
      pageOverlay.hidden = false;
      pageOverlay.classList.remove('is-studio-open');
      scheduleImageButtonSync();
    }
  }

  async function openWithSource(src, name, dimensions) {
    try {
      await setSourceImage(src, name, dimensions);
      state.activeTab = 'object';
      savePreferences();
      openStudio();
      setStatus(
        `已引用页面图片，已匹配比例 ${state.generationAspectRatio}（2K ${state.generationSize.width} × ${state.generationSize.height}）`,
        'success'
      );
    } catch (error) {
      openStudio();
      setStatus(error?.message || '页面图片读取失败', 'error');
    }
  }

  function handleShadowClick(event) {
    const button = event.target.closest('[data-action]');
    if (!button) {
      if (event.target === refs.layerStage || event.target === refs.canvas) selectLayer('');
      return;
    }
    const action = button.dataset.action;
    if (action === 'toggle-studio') return state.open ? closeStudio() : openStudio();
    if (action === 'close-studio') return closeStudio();
    if (action === 'workspace-zoom-out') {
      return setWorkspaceZoom(state.workspace.zoom / 1.2, null, { announce: true });
    }
    if (action === 'workspace-zoom-in') {
      return setWorkspaceZoom(state.workspace.zoom * 1.2, null, { announce: true });
    }
    if (action === 'workspace-fit') return resetWorkspaceView({ announce: true });
    if (action === 'toggle-panel-section') {
      const sectionId = button.dataset.panelSectionId;
      if (!sectionId) return;
      state.collapsedPanelSections[sectionId] = !state.collapsedPanelSections[sectionId];
      savePreferences();
      renderTemplatePanel();
      return;
    }
    if (action === 'switch-tab') {
      state.activeTab = button.dataset.tab === 'text' ? 'text' : 'object';
      savePreferences();
      renderTemplatePanel();
      return;
    }
    if (action === 'set-image-model') {
      state.imageModelTier = button.dataset.imageModel === 'pro' ? 'pro' : 'lite';
      savePreferences();
      renderTemplatePanel();
      setStatus(`已切换为 ${imageModelLabel()}`, 'success');
      return;
    }
    if (action === 'new-custom-style') {
      openCustomStyleEditor('');
      return;
    }
    if (action === 'import-custom-style') return refs.customStyleJsonInput?.click();
    if (action === 'choose-custom-style-image') return refs.customStyleImageInput?.click();
    if (action === 'cancel-custom-style') {
      state.customStyleEditorOpen = false;
      resetCustomStyleDraft();
      renderTemplatePanel();
      return;
    }
    if (action === 'save-custom-style') return saveCustomStyleDraft();
    if (action === 'edit-custom-style') {
      openCustomStyleEditor(button.dataset.styleId);
      return;
    }
    if (action === 'export-custom-style') return exportCustomStyle(button.dataset.styleId);
    if (action === 'delete-custom-style') return deleteCustomStyle(button.dataset.styleId);
    if (action === 'select-template') {
      const type = button.dataset.templateType;
      if (type === 'text') state.selectedTextTemplate = button.dataset.templateId;
      else state.selectedObjectTemplate = button.dataset.templateId;
      savePreferences();
      renderTemplatePanel();
      return;
    }
    if (action === 'select-style-reference') {
      const type = button.dataset.templateType === 'text' ? 'text' : 'object';
      const template = getTemplate(type, button.dataset.templateId);
      const selected = templateReferenceItems(template).find(item => item.id === button.dataset.referenceId);
      if (!selected) return;
      if (type === 'text') state.selectedTextReferenceIds[template.id] = selected.id;
      else state.selectedObjectReferenceIds[template.id] = selected.id;
      savePreferences();
      renderTemplatePanel();
      setStatus(`已为「${template.name}」选择参考图：${selected.label}`, 'success');
      return;
    }
    if (action === 'set-generation-mode') {
      state.objectGenerationMode = button.dataset.generationMode === 'full' ? 'full' : 'subject';
      if (state.source && (
        !state.objectPrompt.trim()
        || state.objectPrompt === REFERENCE_SUBJECT_PROMPT
        || state.objectPrompt === FULL_IMAGE_DEFAULT_PROMPT
      )) {
        state.objectPrompt = state.objectGenerationMode === 'full'
          ? FULL_IMAGE_DEFAULT_PROMPT
          : REFERENCE_SUBJECT_PROMPT;
      } else if (!state.source && (
        state.objectPrompt === REFERENCE_SUBJECT_PROMPT
        || state.objectPrompt === FULL_IMAGE_DEFAULT_PROMPT
      )) {
        state.objectPrompt = '';
      }
      savePreferences();
      renderTemplatePanel();
      setStatus(
        state.objectGenerationMode === 'full'
          ? state.source
            ? '已切换为整图插画：将保留参考图构图并统一转换风格'
            : '已切换为整图插画：填写描述即可从零生成完整场景'
          : state.source
            ? '已切换为主体素材：将重绘参考主体并自动抠除背景'
            : '已切换为主体素材：填写描述即可生成透明主体',
        'success'
      );
      return;
    }
    if (action === 'focus-object-prompt') {
      refs.objectPrompt?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      window.setTimeout(() => refs.objectPrompt?.focus(), 180);
      return;
    }
    if (action === 'set-generation-ratio') {
      const ratio = setGenerationAspectRatio(button.dataset.generationRatio);
      savePreferences();
      renderTemplatePanel();
      setStatus(
        `生图比例已设为 ${ratio}，模型将使用合法 2K 尺寸 ${state.generationSize.width} × ${state.generationSize.height}`,
        'success'
      );
      return;
    }
    if (action === 'choose-source') return refs.sourceInput?.click();
    if (action === 'clear-source') {
      state.source = null;
      trimInactiveAssetUrls();
      state.analyzedSource = '';
      if (
        state.objectPrompt === REFERENCE_SUBJECT_PROMPT
        || state.objectPrompt === FULL_IMAGE_DEFAULT_PROMPT
      ) state.objectPrompt = '';
      renderTemplatePanel();
      savePreferences();
      setStatus('已移除参考图；现在可以直接填写描述生成', 'neutral');
      return;
    }
    if (action === 'analyze-source') return analyzeSource();
    if (action === 'generate-object') return generateTemplateAsset('object');
    if (action === 'generate-text') return generateTemplateAsset('text');
    if (action === 'choose-canvas-image') return refs.canvasInput?.click();
    if (action === 'toggle-multi-select') {
      state.multiSelectMode = !state.multiSelectMode;
      if (state.multiSelectMode) {
        state.selectedLayerIds = state.selectedLayerId ? [state.selectedLayerId] : [];
      } else {
        state.selectedLayerIds = state.selectedLayerId ? [state.selectedLayerId] : [];
      }
      renderCanvas();
      renderLayersPanel();
      renderToolbarState();
      setStatus(state.multiSelectMode ? '多选模式已开启：勾选图层后可成组' : '多选模式已关闭', 'neutral');
      return;
    }
    if (action === 'toggle-layer-selection') {
      event.stopPropagation();
      return selectLayer(button.dataset.layerId, { toggle: true });
    }
    if (action === 'create-layer-group') {
      event.stopPropagation();
      return createLayerGroup();
    }
    if (action === 'ungroup-selected') {
      event.stopPropagation();
      return ungroupSelectedLayers();
    }
    if (action === 'export-selected-layers') {
      event.stopPropagation();
      return exportSelectedLayersAsImages();
    }
    if (action === 'delete-selected-layers') {
      event.stopPropagation();
      return deleteSelectedLayers();
    }
    if (action === 'toggle-group-visibility') {
      event.stopPropagation();
      return toggleGroupVisibility(button.dataset.groupId);
    }
    if (action === 'toggle-group-collapse') {
      event.stopPropagation();
      return toggleGroupCollapsed(button.dataset.groupId);
    }
    if (action === 'ungroup-layers') {
      event.stopPropagation();
      return ungroupLayers(button.dataset.groupId);
    }
    if (action === 'select-layer') {
      return selectLayer(button.dataset.layerId, {
        toggle: state.multiSelectMode || event.metaKey || event.ctrlKey
      });
    }
    if (action === 'layer-up') {
      event.stopPropagation();
      return moveLayerOrder(button.dataset.layerId, 1);
    }
    if (action === 'layer-down') {
      event.stopPropagation();
      return moveLayerOrder(button.dataset.layerId, -1);
    }
    if (action === 'toggle-layer-visibility') {
      event.stopPropagation();
      return toggleLayerVisibility(button.dataset.layerId);
    }
    if (action === 'download-layer') return downloadLayerImage(button.dataset.layerId);
    if (action === 'copy-layer-image') return copyLayerImage(button.dataset.layerId);
    if (action === 'delete-layer') return deleteLayer(button.dataset.layerId);
    if (action === 'duplicate-layer') return duplicateLayer(button.dataset.layerId);
    if (action === 'cutout-layer') return cutoutSelectedLayer();
    if (action === 'open-paint-editor') return openPaintEditor();
    if (action === 'close-paint-editor') {
      closePaintEditor();
      setStatus('已取消抠图微调，图层未发生变化', 'neutral');
      return;
    }
    if (action === 'set-paint-tool' && paintSession) {
      paintSession.tool = ['restore', 'erase', 'paint'].includes(button.dataset.paintTool)
        ? button.dataset.paintTool
        : 'restore';
      updatePaintEditorControls();
      return;
    }
    if (action === 'paint-undo') return undoPaintStroke();
    if (action === 'paint-reset') return resetPaintEditor();
    if (action === 'apply-paint-editor') return applyPaintEditor();
    if (action === 'flip-x' || action === 'flip-y') {
      const layer = selectedLayer();
      if (!layer) return;
      pushUndo();
      if (action === 'flip-x') layer.flipX *= -1;
      else layer.flipY *= -1;
      renderCanvas();
      renderLayersPanel();
      return;
    }
    if (action === 'edit-layer') return editSelectedLayer();
    if (action === 'restore-revision') return restoreLayerRevision();
    if (action === 'canvas-ratio') return setCanvasRatio(button.dataset.ratio);
    if (action === 'undo') return undo();
    if (action === 'redo') return redo();
    if (action === 'export-assets-images') return exportAllAssetsAsImages();
    if (action === 'export-assets-json') return exportProjectJson();
    if (action === 'export') return exportPoster();
  }

  function handleShadowInput(event) {
    const target = event.target;
    if (target.dataset.groupName) {
      const group = groupById(target.dataset.groupName);
      if (!group || isCanvasEditBlocked()) return;
      if (!target.dataset.groupRenameStarted) {
        target.dataset.groupRenameStarted = 'true';
        target.dataset.originalGroupName = group.name;
        pushUndo();
      }
      group.name = target.value.slice(0, 40);
      scheduleProjectSave();
      return;
    }
    if (target.dataset.cutoutControl && paintSession) {
      if (target.dataset.cutoutControl === 'retention') {
        paintSession.cutoutRetention = clamp(Math.round(Number(target.value) || 0), 0, 100);
      }
      if (target.dataset.cutoutControl === 'feather') {
        paintSession.cutoutFeather = clamp(Math.round(Number(target.value) || 0), 0, 16);
      }
      scheduleLiveCutoutPreview();
      return;
    }
    if (target.dataset.paintControl && paintSession) {
      if (target.dataset.paintControl === 'size') {
        paintSession.brushSize = clamp(Math.round(Number(target.value) || 32), 4, 120);
      }
      if (target.dataset.paintControl === 'opacity') {
        paintSession.opacity = clamp(Number(target.value) / 100, 0.05, 1);
      }
      if (target.dataset.paintControl === 'color' && /^#[0-9a-f]{6}$/i.test(target.value)) {
        paintSession.color = target.value;
      }
      updatePaintEditorControls();
      return;
    }
    if (target === refs.customStyleName) {
      state.customStyleDraft.name = target.value.slice(0, 48);
      return;
    }
    if (target === refs.customStylePrompt) {
      state.customStyleDraft.prompt = target.value.slice(0, 12000);
      return;
    }
    if (target === refs.objectPrompt) state.objectPrompt = target.value;
    if (target === refs.textInput) state.textValue = target.value;
    if (target === refs.textLayoutPrompt) state.textLayoutPrompt = target.value;
    if (target === refs.editPrompt) state.editPrompt = target.value;
    if (target.dataset.generationControl === 'style-strength') {
      state.objectStyleStrength = clamp(Math.round(Number(target.value) || 0), 0, 100);
      const valueLabel = target.closest('label')?.querySelector('b');
      if (valueLabel) valueLabel.textContent = `${state.objectStyleStrength}%`;
      savePreferences();
    }
    if (
      target === refs.objectPrompt
      || target === refs.textInput
      || target === refs.textLayoutPrompt
      || target === refs.editPrompt
    ) savePreferences();
    if (target === refs.backgroundInput) {
      state.canvas.background = target.value;
      refs.canvas.style.background = target.value;
      shadow.querySelector('.background-control:not(.workspace-background-control)')
        ?.style.setProperty('--canvas-color', target.value);
      savePreferences();
    }
    if (target === refs.workspaceBackgroundInput) {
      state.workspace.background = target.value;
      refs.canvasViewport?.style.setProperty('--workspace-color', target.value);
      shadow.querySelector('.workspace-background-control')
        ?.style.setProperty('--workspace-color', target.value);
      scheduleProjectSave();
    }
    const property = target.dataset.property;
    const layer = selectedLayer();
    if (!property || !layer) return;
    if (!target.dataset.undoStarted) {
      pushUndo();
      target.dataset.undoStarted = 'true';
    }
    if (property === 'scale') layer.scale = Number(target.value) / 100;
    if (property === 'rotation') layer.rotation = Number(target.value);
    if (property === 'opacity') layer.opacity = Number(target.value) / 100;
    const node = refs.layerStage?.querySelector(`[data-layer-id="${CSS.escape(layer.id)}"]`);
    if (node) applyLayerNode(node, layer);
    const valueLabel = target.closest('label')?.querySelector('b');
    if (valueLabel) {
      valueLabel.textContent = property === 'rotation'
        ? `${Math.round(layer.rotation)}°`
        : `${Math.round((property === 'opacity' ? layer.opacity : layer.scale) * 100)}%`;
    }
    scheduleProjectSave();
  }

  async function handleShadowChange(event) {
    const target = event.target;
    if (target.dataset.groupName) {
      renameLayerGroup(target.dataset.groupName, target.value, {
        undoStarted: target.dataset.groupRenameStarted === 'true',
        originalName: target.dataset.originalGroupName
      });
      return;
    }
    if (target === refs.canvasRatio) {
      setCanvasRatio(supportedAspectRatio(target.value));
      setStatus(`画布比例已设为 ${target.value}`, 'success');
      return;
    }
    if (target === refs.sourceInput) {
      const file = target.files?.[0];
      if (!file) return;
      await setSourceFromFile(file, { source: 'picker' });
      target.value = '';
    }
    if (target === refs.customStyleImageInput) {
      const file = target.files?.[0];
      if (!file) return;
      await setCustomStyleReferenceFile(file);
      target.value = '';
      return;
    }
    if (target === refs.customStyleJsonInput) {
      const file = target.files?.[0];
      if (!file) return;
      await importCustomStyleFile(file);
      target.value = '';
      return;
    }
    if (target === refs.exportScale) {
      state.exportScale = [1, 2, 3, 4].includes(Number(target.value)) ? Number(target.value) : 2;
      savePreferences();
      setStatus(
        `PNG 将以 ${state.exportScale}× 导出（${state.canvas.width * state.exportScale} × ${state.canvas.height * state.exportScale}）`,
        'success'
      );
    }
    if (target === refs.canvasInput) {
      await importCanvasFiles(target.files, null, { source: 'picker' });
      target.value = '';
    }
    if (target.dataset.property) {
      delete target.dataset.undoStarted;
      renderLayersPanel();
    }
  }

  function qualifyImage(img) {
    if (!img || img.closest(`#${HOST_ID}`) || imageButtonRecords.has(img)) return false;
    const width = img.naturalWidth || img.width || img.clientWidth;
    const height = img.naturalHeight || img.height || img.clientHeight;
    if (width < config.minImageWidth || height < config.minImageHeight) return false;
    if (!img.currentSrc && !img.src) return false;
    return true;
  }

  function removeImageButton(img) {
    const record = imageButtonRecords.get(img);
    if (!record) return;
    img.removeEventListener('pointerenter', record.show);
    img.removeEventListener('pointerleave', record.hide);
    record.button.remove();
    imageButtonRecords.delete(img);
    img.removeAttribute(IMAGE_READY_ATTR);
  }

  function syncImageButtons() {
    imageButtonFrame = 0;
    const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
    const viewportHeight = document.documentElement.clientHeight || window.innerHeight;
    imageButtonRecords.forEach((record, img) => {
      if (!img.isConnected || !record.button.isConnected) {
        removeImageButton(img);
        return;
      }
      const rect = img.getBoundingClientRect();
      const visible = rect.width >= config.minImageWidth
        && rect.height >= config.minImageHeight
        && rect.right > 0
        && rect.bottom > 0
        && rect.left < viewportWidth
        && rect.top < viewportHeight;
      record.button.classList.toggle('is-offscreen', !visible);
      if (!visible) return;
      record.button.style.setProperty(
        'top',
        `${Math.round(clamp(rect.top + 10, 10, Math.max(10, viewportHeight - 44)))}px`,
        'important'
      );
      record.button.style.setProperty(
        'left',
        `${Math.round(clamp(rect.right - 10, 84, Math.max(84, viewportWidth - 10)))}px`,
        'important'
      );
    });
  }

  function scheduleImageButtonSync() {
    if (imageButtonFrame) return;
    imageButtonFrame = requestAnimationFrame(syncImageButtons);
  }

  function addImageButton(img) {
    if (!qualifyImage(img)) return;
    img.setAttribute(IMAGE_READY_ATTR, 'true');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = IMAGE_BUTTON_CLASS;
    button.innerHTML = `${icon('sparkle')}<span>海报 DIY</span>`;
    button.title = '引用这张图片到海报 DIY';
    const show = () => {
      button.classList.add('is-visible');
      scheduleImageButtonSync();
    };
    const hide = () => {
      requestAnimationFrame(() => {
        if (!button.matches(':hover') && !img.matches(':hover')) button.classList.remove('is-visible');
      });
    };
    img.addEventListener('pointerenter', show);
    img.addEventListener('pointerleave', hide);
    button.addEventListener('pointerenter', show);
    button.addEventListener('pointerleave', hide);
    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      const src = normalizePageImage(img);
      if (!src) return;
      openWithSource(
        src,
        img.alt || img.title || '页面引用图片',
        {
          width: img.naturalWidth || img.width,
          height: img.naturalHeight || img.height
        }
      );
    }, true);
    pageOverlay?.appendChild(button);
    imageButtonRecords.set(img, { button, show, hide });
    scheduleImageButtonSync();
  }

  function scanImages(root) {
    if (root instanceof HTMLImageElement) addImageButton(root);
    root.querySelectorAll?.('img').forEach(addImageButton);
    scheduleImageButtonSync();
  }

  function scheduleScan(root) {
    clearTimeout(state.scanTimer);
    state.scanTimer = window.setTimeout(() => scanImages(root || document), 120);
  }

  function handleKeydown(event) {
    if (!state.open) return;
    if (paintSession) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        undoPaintStroke();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        closePaintEditor();
        setStatus('已取消抠图微调，图层未发生变化', 'neutral');
      }
      return;
    }
    const groupNameInput = event.composedPath().find(node => (
      node instanceof HTMLInputElement && node.dataset.groupName
    ));
    if (groupNameInput) {
      if (event.key === 'Enter') {
        event.preventDefault();
        groupNameInput.blur();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        const originalName = groupNameInput.dataset.originalGroupName;
        if (originalName) {
          const group = groupById(groupNameInput.dataset.groupName);
          if (group) group.name = originalName;
          groupNameInput.value = originalName;
          scheduleProjectSave(0);
        }
        groupNameInput.blur();
      }
      return;
    }
    const editable = event.composedPath().some(node => (
      node instanceof HTMLInputElement
      || node instanceof HTMLTextAreaElement
      || node instanceof HTMLSelectElement
      || (node instanceof HTMLElement && node.isContentEditable)
    ));
    if (editable) return;
    if (event.code === 'Space') {
      event.preventDefault();
      workspaceSpacePressed = true;
      refs.canvasViewport?.classList.add('is-space-pan');
      return;
    }
    if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      return setWorkspaceZoom(state.workspace.zoom * 1.2, null, { announce: true });
    }
    if (event.key === '-' || event.key === '_') {
      event.preventDefault();
      return setWorkspaceZoom(state.workspace.zoom / 1.2, null, { announce: true });
    }
    if (event.key === '0') {
      event.preventDefault();
      return resetWorkspaceView({ announce: true });
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      return event.shiftKey ? redo() : undo();
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      if (state.selectedLayerId) deleteSelectedLayers();
    }
    if (event.key === 'Escape') closeStudio();
    const layer = selectedLayer();
    if (!layer || !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    pushUndo();
    const amount = event.shiftKey ? 10 : 1;
    if (event.key === 'ArrowUp') layer.y -= amount;
    if (event.key === 'ArrowDown') layer.y += amount;
    if (event.key === 'ArrowLeft') layer.x -= amount;
    if (event.key === 'ArrowRight') layer.x += amount;
    renderCanvas();
    renderLayersPanel();
  }

  function handleKeyup(event) {
    if (event.code !== 'Space') return;
    workspaceSpacePressed = false;
    refs.canvasViewport?.classList.remove('is-space-pan');
  }

  function installPageStyle() {
    const style = document.createElement('style');
    style.id = PAGE_STYLE_ID;
    style.textContent = `
      #${PAGE_OVERLAY_ID} {
        position: fixed !important;
        inset: 0 !important;
        z-index: 2147480000 !important;
        pointer-events: none !important;
      }
      #${PAGE_OVERLAY_ID}[hidden] { display: none !important; }
      #${PAGE_OVERLAY_ID}.is-studio-open .${IMAGE_BUTTON_CLASS} {
        display: none !important;
      }
      .${IMAGE_BUTTON_CLASS} {
        all: initial;
        position: fixed !important;
        top: 0 !important;
        right: auto !important;
        bottom: auto !important;
        left: 0 !important;
        z-index: 1 !important;
        height: 34px !important;
        display: flex !important;
        align-items: center !important;
        gap: 6px !important;
        padding: 0 11px !important;
        border: 1px solid rgba(255,255,255,.72) !important;
        border-radius: 999px !important;
        background: rgba(18,20,16,.82) !important;
        color: white !important;
        box-shadow: 0 8px 22px rgba(0,0,0,.22) !important;
        backdrop-filter: blur(14px) !important;
        font: 700 11px/1 -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif !important;
        cursor: pointer !important;
        pointer-events: auto !important;
        opacity: 0 !important;
        transform: translate(-100%, -3px) !important;
        transition: opacity .16s ease, transform .16s ease !important;
      }
      .${IMAGE_BUTTON_CLASS}.is-visible, .${IMAGE_BUTTON_CLASS}:focus-visible {
        opacity: 1 !important;
        transform: translate(-100%, 0) !important;
      }
      .${IMAGE_BUTTON_CLASS}.is-offscreen { display: none !important; }
      .${IMAGE_BUTTON_CLASS} svg {
        width: 15px !important;
        height: 15px !important;
        fill: none !important;
        stroke: currentColor !important;
        stroke-width: 1.8 !important;
        stroke-linecap: round !important;
        stroke-linejoin: round !important;
      }
    `;
    document.head.appendChild(style);
  }

  function mount() {
    loadPreferences();
    installPageStyle();
    pageOverlay = document.createElement('div');
    pageOverlay.id = PAGE_OVERLAY_ID;
    document.documentElement.appendChild(pageOverlay);
    host = document.createElement('div');
    host.id = HOST_ID;
    host.style.cssText = [
      'position:static!important',
      'inset:auto!important',
      'width:0!important',
      'height:0!important',
      'z-index:auto!important',
      'pointer-events:none!important',
      'transform:none!important'
    ].join(';');
    shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `<style>${styles()}</style>${shellHtml()}`;
    document.documentElement.appendChild(host);
    refs = Object.fromEntries(
      [...shadow.querySelectorAll('[data-ref]')].map(node => [node.dataset.ref, node])
    );
    refs.backgroundInput = shadow.querySelector('[data-ref="backgroundInput"]');
    refs.workspaceBackgroundInput = shadow.querySelector('[data-ref="workspaceBackgroundInput"]');
    shadow.querySelector('.background-control')?.style.setProperty('--canvas-color', state.canvas.background);
    shadow.querySelector('.workspace-background-control')
      ?.style.setProperty('--workspace-color', state.workspace.background);
    shadow.addEventListener('click', handleShadowClick);
    shadow.addEventListener('input', handleShadowInput);
    shadow.addEventListener('change', handleShadowChange);
    bindStudioDrag();
    bindPaintEditor();
    bindWorkspaceNavigation();
    window.addEventListener('keydown', handleKeydown, true);
    window.addEventListener('keyup', handleKeyup, true);
    window.addEventListener('resize', fitCanvas);
    window.addEventListener('resize', fitPaintCanvas);
    window.addEventListener('resize', scheduleImageButtonSync);
    window.addEventListener('scroll', scheduleImageButtonSync, true);
    window.addEventListener('pagehide', flushProjectCache);
    document.addEventListener('visibilitychange', handlePageVisibilityChange);
    resizeObserver = new ResizeObserver(fitCanvas);
    resizeObserver.observe(refs.canvasViewport);
    state.observer = new MutationObserver(records => {
      for (const record of records) {
        record.addedNodes.forEach(node => {
          if (
            node.nodeType === Node.ELEMENT_NODE
            && !host.contains(node)
            && !pageOverlay.contains(node)
          ) scheduleScan(node);
        });
        if (record.removedNodes.length) scheduleImageButtonSync();
      }
    });
    state.observer.observe(document.documentElement, { childList: true, subtree: true });
    scanImages(document);
    renderTemplatePanel();
    renderLayersPanel();
    renderCanvas();
    renderToolbarState();
    restoreProjectCache();
  }

  function cleanup() {
    generationSerial += 1;
    closePaintEditor();
    flushProjectCache();
    clearTimeout(state.scanTimer);
    clearTimeout(projectSaveTimer);
    projectSaveTimer = 0;
    if (imageButtonFrame) cancelAnimationFrame(imageButtonFrame);
    imageButtonFrame = 0;
    if (canvasCullFrame) cancelAnimationFrame(canvasCullFrame);
    canvasCullFrame = 0;
    revokeAllAssetUrls();
    canvasLayerNodes.clear();
    assetMetaCache.clear();
    studioDragCleanup?.();
    studioDragCleanup = null;
    workspaceNavigationCleanup?.();
    workspaceNavigationCleanup = null;
    workspaceSpacePressed = false;
    state.observer?.disconnect();
    resizeObserver?.disconnect();
    window.removeEventListener('keydown', handleKeydown, true);
    window.removeEventListener('keyup', handleKeyup, true);
    window.removeEventListener('resize', fitCanvas);
    window.removeEventListener('resize', fitPaintCanvas);
    window.removeEventListener('resize', scheduleImageButtonSync);
    window.removeEventListener('scroll', scheduleImageButtonSync, true);
    window.removeEventListener('pagehide', flushProjectCache);
    document.removeEventListener('visibilitychange', handlePageVisibilityChange);
    [...imageButtonRecords.keys()].forEach(removeImageButton);
    document.querySelectorAll(`[${IMAGE_READY_ATTR}]`).forEach(node => node.removeAttribute(IMAGE_READY_ATTR));
    pageOverlay?.remove();
    pageOverlay = null;
    document.getElementById(PAGE_STYLE_ID)?.remove();
    host?.remove();
    delete window.__TABBIT_POSTER_DIY_V13_INSPECT__;
    delete window[CLEANUP_KEY];
  }

  if (config.debug) {
    window.__TABBIT_POSTER_DIY_V13_INSPECT__ = async () => {
      const db = await openProjectDb();
      const assetCount = await new Promise((resolve, reject) => {
        const request = db.transaction(ASSET_STORE_NAME, 'readonly')
          .objectStore(ASSET_STORE_NAME)
          .count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('资源统计失败'));
      });
      const project = projectData();
      const serialized = JSON.stringify(project);
      return {
        projectVersion: project.version,
        layerCount: state.layers.length,
        assetCount,
        metadataBytes: new Blob([serialized]).size,
        containsDataUrl: serialized.includes('data:image/'),
        containsBlobUrl: serialized.includes('blob:'),
        canvasNodeCount: canvasLayerNodes.size,
        loadedCanvasImageCount: [...canvasLayerNodes.values()]
          .filter(node => node.querySelector('img')?.hasAttribute('src')).length,
        objectUrlCount: assetUrlCache.size,
        undoDepth: state.undo.length,
        revisionCount: state.layers.reduce((sum, layer) => sum + (layer.revisions?.length || 0), 0)
      };
    };
  }

  window[CLEANUP_KEY] = cleanup;
  mount();
})();