(function () {
  'use strict';

  const INSTANCE_KEY = '__YuzePerlerBeadGenerator';
  const CONFIG_KEY = '__YuzePerlerBeadGeneratorConfig';
  const HOST_ID = 'Yuze-perler-bead-generator-root';
  const VERSION = '1.6.1';

  window[INSTANCE_KEY]?.cleanup?.();
  document.querySelectorAll(`#${HOST_ID}`).forEach((existingHost) => existingHost.remove());

  const defaultSelectors = {
    card: 'article, figure, section.note-item, .note-item, [class*="card"], [class*="post"]',
    cover: 'picture, figure, a.cover, .cover, [class*="cover"], [class*="photo"], [class*="media"], [class*="thumbnail"]',
    detail: '[class*="detail"], [class*="viewer"], [class*="lightbox"], [class*="image-container"], [class*="carousel"], [class*="swiper"], [class*="gallery"], [role="dialog"]'
  };
  const suppliedConfig = window[CONFIG_KEY] || {};
  const GRID_SIZES = [40, 52, 64, 80, 100, 120];
  const config = Object.assign({
    mockBridge: false,
    mockDelayMs: 650,
    minImageSize: 48,
    maxUploadMB: 30,
    patternGridSize: 100,
    selectors: defaultSelectors
  }, suppliedConfig);
  config.selectors = Object.assign({}, defaultSelectors, suppliedConfig.selectors || {});
  config.patternGridSize = GRID_SIZES.includes(Math.round(Number(config.patternGridSize)))
    ? Math.round(Number(config.patternGridSize))
    : 100;

  // 内嵌缩略参考图，确保脚本注入任意网页后仍能预览并传给 Bridge Pro。
  const CARTOON_STYLE_REFERENCE = 'data:image/jpeg;base64,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';

  const CARTOON_STYLE_REFERENCE_192 = 'data:image/jpeg;base64,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';

  // 后续新增风格时，只需在这里追加一项。
  const STYLES = [
    {
      id: 'floral-vintage-illustration',
      name: '花卉复古手绘',
      imageUrl: 'https://web-gen.tabai-test.meituan.com/previews/d70ca192-b3da-4990-be77-aa26e9b26861/bridge_img_4b421b7c4a934a8b827617b92f4ffdae.png',
      reproductionPrompt: '竖幅9:16构图，主体为双丸子双马尾金发蓝眼少女，侧身回头，身着藏蓝色毛绒抹胸，头发装饰银灰色蕾丝发饰，佩戴蕾丝耳坠与戒指，前景、背景都环绕淡蓝色黄心鸢尾花，浅灰色纯色背景，线条细腻精致，柔和均匀光照，手绘线稿加平涂上色，细腻数码插画质感',
      stylePrompt: '竖版人物肖像构图，花卉环绕层叠版式，细腻勾线手绘质感，浅蓝、米金、藏蓝配色组合，搭配精致复古装饰配饰，清晰细腻线条，柔和平涂上色，半写实人物比例，带清晰线稿的数码插画，柔和均匀光照，细腻纸质质感'
    },
    {
      id: 'cute-cartoon-illustration',
      name: '卡通风格',
      imageUrl: CARTOON_STYLE_REFERENCE_192,
      reproductionPrompt: '正方形1:1构图，一只原创橙白配色的可爱柯基犬以三分之四侧身姿态坐在画面中央，完整露出两只大耳朵、身体、四肢和短尾，嘴巴张开并轻轻吐舌，神态开心友好。Q版卡通比例，头部略大、身体圆润、四肢短小，眼睛大而有高光；橙色毛区、奶白色脸部中线、口鼻、胸毛、脚掌和尾尖分区清晰。使用连续闭合的深棕色粗外轮廓和略细的内部结构线，干净数码平涂，暖橙、奶白、深棕和少量粉色配色，只保留2至3层清晰柔和的卡通明暗，不刻画细碎毛发。纯暖白色背景，主体四周留有充足空白，无场景、无投影、无文字、无水印、无边框。不是照片，不是3D，不是像素画，不是拼豆图，不带网格、色号、马赛克或颗粒效果。',
      stylePrompt: 'Q版卡通插画风格，根据参考原图准确保留主体身份、物种、脸部特征、发型或毛色分区、姿态、服装、配饰和标志性细节；将真实比例适度概括为圆润可爱的卡通比例，但不能替换主体或改变关键辨识特征。使用粗细分明、连续闭合的深棕色或深灰色轮廓线，外轮廓较粗、内部结构线略细；造型由清楚的大色块和圆润几何形组成，五官适度放大、表情生动友好，整体轮廓简洁、完整、容易辨认。采用干净的数码平涂上色，每个区域颜色均匀，只保留2至3层明确的卡通明暗关系，少量柔和渐变仅用于体积过渡；控制细碎纹理、毛发丝和复杂装饰，避免照片噪点。主体完整居中，四周留白，使用纯白或暖白色简洁背景，无投影、无场景、无文字、无水印、无边框。最终效果是高完成度的现代Q版角色立绘，不是像素画，不是拼豆图，不带网格、色号、马赛克或颗粒效果。'
    }
  ];

  // MARD 屏幕近似色。前 221 项为基础版，完整 291 项包含 P/Q/R/T/Y/ZG 特殊系列。
  const MARD_PALETTE_DATA = 'A1:#FAF4C8,A2:#FFFFD5,A3:#FEFF8B,A4:#FBED56,A5:#F4D738,A6:#FEAC4C,A7:#FE8B4C,A8:#FFDA45,A9:#FF995B,A10:#F77C31,A11:#FFDD99,A12:#FE9F72,A13:#FFC365,A14:#FD543D,A15:#FFF365,A16:#FFFF9F,A17:#FFE36E,A18:#FEBE7D,A19:#FD7C72,A20:#FFD568,A21:#FFE395,A22:#F4F57D,A23:#E6C9B7,A24:#F7F8A2,A25:#FFD67D,A26:#FFC830,B1:#E6EE31,B2:#63F347,B3:#9EF780,B4:#5DE035,B5:#35E352,B6:#65E2A6,B7:#3DAF80,B8:#1C9C4F,B9:#27523A,B10:#95D3C2,B11:#5D722A,B12:#166F41,B13:#CAEB7B,B14:#ADE946,B15:#2E5132,B16:#C5ED9C,B17:#9BB13A,B18:#E6EE49,B19:#24B88C,B20:#C2F0CC,B21:#156A6B,B22:#0B3C43,B23:#303A21,B24:#EEFCA5,B25:#4E846D,B26:#8D7A35,B27:#CCE1AF,B28:#9EE5B9,B29:#C5E254,B30:#E2FCB1,B31:#B0E792,B32:#9CAB5A,C1:#E8FFE7,C2:#A9F9FC,C3:#A0E2FB,C4:#41CCFF,C5:#01ACEB,C6:#50AAF0,C7:#3677D2,C8:#0F54C0,C9:#324BCA,C10:#3EBCE2,C11:#28DDDE,C12:#1C334D,C13:#CDE8FF,C14:#D5FDFF,C15:#22C4C6,C16:#1557A8,C17:#04D1F6,C18:#1D3344,C19:#1887A2,C20:#176DAF,C21:#BEDDFF,C22:#67B4BE,C23:#C8E2FF,C24:#7CC4FF,C25:#A9E5E5,C26:#3CAED8,C27:#D3DFFA,C28:#BBCFED,C29:#34488E,D1:#AEB4F2,D2:#858EDD,D3:#2F54AF,D4:#182A84,D5:#B843C5,D6:#AC7BDE,D7:#8854B3,D8:#E2D3FF,D9:#D5B9F8,D10:#361851,D11:#B9BAE1,D12:#DE9AD4,D13:#B90095,D14:#8B279B,D15:#2F1F90,D16:#E3E1EE,D17:#C4D4F6,D18:#A45EC7,D19:#D8C3D7,D20:#9C32B2,D21:#9A009B,D22:#333A95,D23:#EBDAFC,D24:#7786E5,D25:#494FC7,D26:#DFC2F8,E1:#FDD3CC,E2:#FEC0DF,E3:#FFB7E7,E4:#E8649E,E5:#F551A2,E6:#F13D74,E7:#C63478,E8:#FFDBE9,E9:#E970CC,E10:#D33793,E11:#FCDDD2,E12:#F78FC3,E13:#B5006D,E14:#FFD1BA,E15:#F8C7C9,E16:#FFF3EB,E17:#FFE2EA,E18:#FFC7DB,E19:#FEBAD5,E20:#D8C7D1,E21:#BD9DA1,E22:#B785A1,E23:#937A8D,E24:#E1BCE8,F1:#FD957B,F2:#FC3D46,F3:#F74941,F4:#FC283C,F5:#E7002F,F6:#943630,F7:#971937,F8:#BC0028,F9:#E2677A,F10:#8A4526,F11:#5A2121,F12:#FD4E6A,F13:#F35744,F14:#FFA9AD,F15:#D30022,F16:#FEC2A6,F17:#E69C79,F18:#D37C46,F19:#C1444A,F20:#CD9391,F21:#F7B4C6,F22:#FDC0D0,F23:#F67E66,F24:#E698AA,F25:#E54B4F,G1:#FFE2CE,G2:#FFC4AA,G3:#F4C3A5,G4:#E1B383,G5:#EDB045,G6:#E99C17,G7:#9D5B3E,G8:#753832,G9:#E6B483,G10:#D98C39,G11:#E0C593,G12:#FFC890,G13:#B7714A,G14:#8D614C,G15:#FCF9E0,G16:#F2D9BA,G17:#78524B,G18:#FFE4CC,G19:#E07935,G20:#A94023,G21:#B88558,H1:#FDFBFF,H2:#FEFFFF,H3:#B6B1BA,H4:#89858C,H5:#48464E,H6:#2F2B2F,H7:#000000,H8:#E7D6DB,H9:#EDEDED,H10:#EEE9EA,H11:#CECDD5,H12:#FFF5ED,H13:#F5ECD2,H14:#CFD7D3,H15:#98A6A8,H16:#1D1414,H17:#F1EDED,H18:#FFFDF0,H19:#F6EFE2,H20:#949FA3,H21:#FFFBE1,H22:#CACAD4,H23:#9A9D94,M1:#BCC6B8,M2:#8AA386,M3:#697D80,M4:#E3D2BC,M5:#D0CCAA,M6:#B0A782,M7:#B4A497,M8:#B38281,M9:#A58767,M10:#C5B2BC,M11:#9F7594,M12:#644749,M13:#D19066,M14:#C77362,M15:#757D78,P1:#FCF7F8,P2:#B0A9AC,P3:#AFDCAB,P4:#FEA49F,P5:#EE8C3E,P6:#5FD0A7,P7:#EB9270,P8:#F0D958,P9:#D9D9D9,P10:#D9C7EA,P11:#F3ECC9,P12:#E6EEF2,P13:#AACBEF,P14:#337680,P15:#668575,P16:#FEBF45,P17:#FEA324,P18:#FEB89F,P19:#FFFEEC,P20:#FEBECF,P21:#ECBEBF,P22:#E4A89F,P23:#A56268,Q1:#F2A5E8,Q2:#E9EC91,Q3:#FFFF00,Q4:#FFEBFA,Q5:#76CEDE,R1:#D50D21,R2:#F92F83,R3:#FD8324,R4:#F8EC31,R5:#35C75B,R6:#238891,R7:#19779D,R8:#1A60C3,R9:#9A56B4,R10:#FFDB4C,R11:#FFEBFA,R12:#D8D5CE,R13:#55514C,R14:#9FE4DF,R15:#77CEE9,R16:#3ECFCA,R17:#4A867A,R18:#7FCD9D,R19:#CDE55D,R20:#E8C7B4,R21:#AD6F3C,R22:#6C372F,R23:#FEB872,R24:#F3C1C0,R25:#C9675E,R26:#D293BE,R27:#EA8CB1,R28:#9C87D6,T1:#FFFFFF,Y1:#FD6FB4,Y2:#FEB481,Y3:#D7FAA0,Y4:#8BDBFA,Y5:#E987EA,ZG1:#DAABB3,ZG2:#D6AA87,ZG3:#C1BD8D,ZG4:#96869F,ZG5:#8490A6,ZG6:#94BFE2,ZG7:#E2A9D2,ZG8:#AB91C0';
  const MARD_PALETTE_291 = MARD_PALETTE_DATA.split(',').map((entry) => {
    const [code, hex] = entry.split(':');
    return { code, hex };
  });
  const MARD_PALETTE_221 = MARD_PALETTE_291.slice(0, 221);

  const state = {
    enabled: true,
    panelOpen: false,
    surface: '',
    phase: 'idle',
    activeImage: null,
    activeCard: null,
    sourceUrl: '',
    sourceTitle: '',
    anchorX: 0,
    anchorY: 0,
    styleId: '',
    paletteSize: 221,
    gridSize: config.patternGridSize,
    adjustMode: 'repair',
    busy: false,
    progress: '',
    error: null,
    styleUrl: '',
    beadUrl: '',
    patternUrl: '',
    patternMeta: null,
    lastResult: null,
    destroyed: false
  };

  const disposers = [];
  const recordsByImage = new WeakMap();
  const modifiedRecords = new Set();
  let toastTimer = 0;

  const host = document.createElement('div');
  host.id = HOST_ID;
  host.dataset.version = VERSION;
  (document.body || document.documentElement).appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `
    <style>${styles()}</style>
    <div class="app" aria-live="polite">
      <div class="selection" data-ref="selection" hidden></div>

      <button class="orb" data-action="toggle-panel" data-ref="orb" type="button"
        aria-label="打开拼豆生成器" aria-expanded="false" title="拼豆生成器">
        ${icon('bead')}
        <span class="status-dot" aria-hidden="true"></span>
      </button>

      <section class="panel glass" data-ref="panel" hidden aria-label="拼豆生成器状态"></section>
      <input data-ref="uploadInput" type="file" accept="image/*" hidden>

      <section class="surface glass" data-ref="surface" hidden></section>

      <div class="result-backdrop" data-ref="resultBackdrop" hidden>
        <section class="result-viewer glass" role="dialog" aria-modal="true" aria-label="拼豆图生成结果">
          <header class="result-header">
            <div>
              <span class="eyebrow">AI 生成与代码配色完成</span>
              <strong>拼豆色号图纸预览</strong>
            </div>
            <button class="icon-button" type="button" data-action="close-result" aria-label="关闭">${icon('close')}</button>
          </header>
          <div class="result-grid" data-ref="resultGrid"></div>
          <footer class="result-footer">
            <div class="result-footer-info">
              <p data-ref="resultMeta"></p>
              <div class="result-size-control">
                <span>切换图纸尺寸（不重新生图）</span>
                <div class="grid-size-tabs is-compact" data-ref="resultSizeTabs"></div>
              </div>
            </div>
            <div class="footer-actions">
              <button class="button secondary" type="button" data-action="generate-heat-effects" data-ref="heatEffectButton">
                ${icon('sparkle')}<span>生成烫后正反面效果</span>
              </button>
              <button class="button secondary" type="button" data-action="restore">${icon('restore')}<span>恢复原图</span></button>
              <button class="button primary" type="button" data-action="download-pattern">${icon('download')}<span>下载色号图纸</span></button>
            </div>
          </footer>
        </section>

        <div class="adjustment-backdrop" data-ref="adjustmentBackdrop" hidden>
          <section class="adjustment-dialog glass" role="dialog" aria-modal="true" aria-label="Prompt 调整 AI 拼豆图">
            <header class="adjustment-header">
              <div>
                <span class="eyebrow">原图 + 当前 AI 拼豆图双参考</span>
                <strong>用 Prompt 继续调整</strong>
              </div>
              <button class="icon-button" type="button" data-action="close-adjustment" aria-label="关闭">${icon('close')}</button>
            </header>
            <div class="adjustment-body">
              <div class="adjustment-references">
                <figure><img data-ref="adjustOriginalPreview" alt="原图参考"><figcaption>原图 · 主体与关键细节</figcaption></figure>
                <figure><img data-ref="adjustCurrentPreview" alt="当前 AI 拼豆图参考"><figcaption>当前 AI 拼豆图 · 修改起点</figcaption></figure>
              </div>
              <div class="adjustment-modes">
                <button type="button" data-action="select-adjust-mode" data-adjust-mode="repair">修正转换</button>
                <button type="button" data-action="select-adjust-mode" data-adjust-mode="creative">创意调整</button>
              </div>
              <p class="adjustment-mode-hint" data-ref="adjustModeHint"></p>
              <label class="adjustment-prompt-label" for="Yuze-perler-adjust-prompt">调整要求</label>
              <textarea id="Yuze-perler-adjust-prompt" data-ref="adjustPrompt" rows="5"
                placeholder="例如：眼睛更接近原图，保留手里的毛笔；减少身体内部的黑色描边。"></textarea>
              <p class="adjustment-note">会重新调用一次 Pro 生图；完成后自动重算当前尺寸的 MARD 色号图纸。</p>
            </div>
            <footer class="adjustment-footer">
              <button class="button secondary" type="button" data-action="close-adjustment">取消</button>
              <button class="button primary" type="button" data-action="submit-adjustment" data-ref="adjustSubmit">
                ${icon('sparkle')}<span>生成调整版本</span>
              </button>
            </footer>
          </section>
        </div>
      </div>

      <div class="toast glass" data-ref="toast" hidden></div>
    </div>
  `;

  const refs = Object.fromEntries(
    Array.from(shadow.querySelectorAll('[data-ref]')).map((node) => [node.dataset.ref, node])
  );

  function styles() {
    return `
      :host {
        all: initial;
        position: fixed;
        inset: 0;
        z-index: 2147483000;
        pointer-events: none;
        color-scheme: light;
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Segoe UI", sans-serif;
        --orange: #ff7a1a;
        --pink: #ff4d8d;
        --purple: #7657e8;
        --green: #2dbd72;
        --red: #ef4444;
        --text: rgba(24, 28, 38, .94);
        --muted: rgba(69, 76, 91, .66);
        --ease: cubic-bezier(.22, .8, .24, 1);
      }
      * { box-sizing: border-box; }
      [hidden] { display: none !important; }
      button, input { font: inherit; }
      button { color: inherit; }
      svg { display: block; width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
      .app { position: fixed; inset: 0; pointer-events: none; }
      .glass {
        border: 1px solid rgba(255,255,255,.76);
        background:
          linear-gradient(145deg, rgba(255,255,255,.92), rgba(250,247,255,.73)),
          linear-gradient(135deg, rgba(255,122,26,.07), rgba(118,87,232,.07));
        box-shadow: 0 18px 50px rgba(25,29,43,.19), inset 0 1px 0 rgba(255,255,255,.86);
        -webkit-backdrop-filter: blur(24px) saturate(1.4);
        backdrop-filter: blur(24px) saturate(1.4);
      }
      .orb {
        position: fixed;
        right: 24px;
        bottom: 132px;
        width: 46px;
        height: 46px;
        display: grid;
        place-items: center;
        padding: 0;
        border: 1px solid rgba(255,255,255,.82);
        border-radius: 50%;
        color: #6f4ee6;
        background:
          radial-gradient(circle at 35% 28%, #fff 0 16%, rgba(255,255,255,.82) 17% 37%, transparent 38%),
          linear-gradient(145deg, rgba(255,247,237,.96), rgba(244,239,255,.88));
        box-shadow: 0 12px 28px rgba(35,28,65,.2), inset 0 1px 0 #fff;
        cursor: pointer;
        pointer-events: auto;
        transition: transform 180ms var(--ease), box-shadow 180ms var(--ease);
      }
      .orb::before {
        content: "";
        position: absolute;
        inset: -2px;
        border-radius: inherit;
        padding: 1px;
        background: linear-gradient(135deg, var(--orange), var(--pink), var(--purple));
        -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
        -webkit-mask-composite: xor;
        mask-composite: exclude;
        opacity: .72;
      }
      .orb:hover { transform: translateY(-2px) scale(1.03); box-shadow: 0 16px 34px rgba(35,28,65,.25); }
      .orb:focus-visible { outline: 3px solid rgba(118,87,232,.24); outline-offset: 3px; }
      .orb.is-busy::before { animation: spin 1.5s linear infinite; opacity: 1; }
      .orb.is-disabled { filter: grayscale(.7); opacity: .58; }
      .status-dot { position: absolute; right: 1px; bottom: 1px; width: 10px; height: 10px; border: 2px solid #fff; border-radius: 50%; background: transparent; opacity: 0; }
      .orb.is-success .status-dot { opacity: 1; background: var(--green); }
      .orb.is-error .status-dot { opacity: 1; background: var(--red); }
      .panel {
        position: fixed;
        right: 24px;
        bottom: 188px;
        width: 286px;
        padding: 15px;
        border-radius: 21px;
        color: var(--text);
        pointer-events: auto;
        animation: pop 190ms var(--ease) both;
      }
      .panel-head, .panel-row, .composer-header, .composer-bottom, .result-header, .result-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .panel-title { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 760; }
      .panel-title span:first-child { color: var(--purple); }
      .panel-copy { margin: 5px 0 0; color: var(--muted); font-size: 11px; line-height: 1.45; }
      .panel-section { margin-top: 13px; padding-top: 13px; border-top: 1px solid rgba(70,76,92,.1); }
      .panel-row strong { display: block; font-size: 12px; }
      .panel-row small { display: block; max-width: 190px; margin-top: 3px; overflow: hidden; color: var(--muted); font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
      .switch { position: relative; width: 38px; height: 22px; padding: 0; border: 0; border-radius: 999px; background: rgba(100,108,124,.22); cursor: pointer; }
      .switch::after { content: ""; position: absolute; left: 2px; top: 2px; width: 18px; height: 18px; border-radius: 50%; background: #fff; box-shadow: 0 2px 6px rgba(15,23,42,.2); transition: transform 180ms var(--ease); }
      .switch.is-on { background: var(--green); }
      .switch.is-on::after { transform: translateX(16px); }
      .upload {
        width: 100%;
        min-height: 50px;
        display: grid;
        grid-template-columns: 34px 1fr auto;
        align-items: center;
        gap: 10px;
        padding: 7px 10px;
        border: 1px solid rgba(118,87,232,.13);
        border-radius: 14px;
        background: linear-gradient(135deg, rgba(255,122,26,.08), rgba(118,87,232,.08));
        cursor: pointer;
        text-align: left;
      }
      .upload:hover { background: linear-gradient(135deg, rgba(255,122,26,.13), rgba(118,87,232,.12)); }
      .upload-icon { width: 34px; height: 34px; display: grid; place-items: center; border-radius: 11px; color: var(--purple); background: rgba(255,255,255,.68); }
      .upload strong { display: block; font-size: 12px; }
      .upload small { display: block; margin-top: 3px; color: var(--muted); font-size: 9px; }
      .surface {
        position: fixed;
        z-index: 20;
        width: 202px;
        overflow: hidden;
        border-radius: 17px;
        color: var(--text);
        pointer-events: auto;
        animation: pop 160ms var(--ease) both;
      }
      .surface.is-composer { width: min(404px, calc(100vw - 32px)); max-height: calc(100vh - 32px); border-radius: 22px; overflow: auto; }
      .context { padding: 7px; }
      .context-item {
        width: 100%;
        min-height: 44px;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 0 10px;
        border: 0;
        border-radius: 11px;
        background: transparent;
        cursor: pointer;
        text-align: left;
      }
      .context-item:hover, .context-item:focus-visible { outline: 0; background: rgba(118,87,232,.1); }
      .context-icon { width: 29px; height: 29px; display: grid; place-items: center; border-radius: 9px; color: var(--purple); background: linear-gradient(135deg, rgba(255,122,26,.13), rgba(118,87,232,.12)); }
      .context-item strong { flex: 1; font-size: 13px; }
      .context-key { color: rgba(70,76,92,.48); font-size: 10px; }
      .context-hint { padding: 5px 10px 7px; color: rgba(70,76,92,.5); font-size: 10px; }
      .composer { padding: 15px; }
      .composer-header { align-items: flex-start; }
      .thumb { flex: 0 0 auto; width: 45px; height: 45px; border-radius: 12px; object-fit: cover; background: #f1f1f4; }
      .composer-heading { min-width: 0; flex: 1; padding-top: 2px; }
      .composer-heading strong { display: block; font-size: 14px; }
      .composer-heading span { display: block; margin-top: 4px; overflow: hidden; color: var(--muted); font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
      .section-label { display: block; margin: 14px 0 8px; color: var(--muted); font-size: 10px; font-weight: 700; letter-spacing: .04em; }
      .style-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(165px, 1fr)); gap: 9px; }
      .style-card {
        position: relative;
        min-width: 0;
        display: grid;
        grid-template-columns: 48px minmax(0, 1fr);
        align-items: center;
        gap: 9px;
        padding: 7px;
        border: 1px solid rgba(75,80,96,.1);
        border-radius: 14px;
        background: rgba(255,255,255,.48);
        cursor: pointer;
        text-align: left;
        transition: border-color 160ms var(--ease), transform 160ms var(--ease), box-shadow 160ms var(--ease);
      }
      .style-card:hover { transform: translateY(-1px); border-color: rgba(118,87,232,.26); }
      .style-card.is-selected { border-color: rgba(118,87,232,.52); box-shadow: 0 0 0 3px rgba(118,87,232,.09); background: rgba(248,245,255,.82); }
      .style-card img { width: 48px; height: 56px; display: block; border-radius: 9px; object-fit: cover; background: #eee; }
      .style-card strong { overflow: hidden; font-size: 11px; line-height: 1.35; text-overflow: ellipsis; }
      .style-check { position: absolute; right: 6px; top: 6px; width: 16px; height: 16px; display: grid; place-items: center; border: 2px solid #fff; border-radius: 50%; color: #fff; background: var(--purple); opacity: 0; }
      .style-check svg { width: 10px; height: 10px; stroke-width: 2.5; }
      .style-card.is-selected .style-check { opacity: 1; }
      .palette-tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 4px; border-radius: 14px; background: rgba(80,86,102,.07); }
      .palette-option { min-height: 49px; display: grid; align-content: center; gap: 2px; padding: 5px 10px; border: 0; border-radius: 11px; background: transparent; cursor: pointer; text-align: left; }
      .palette-option strong { font-size: 11px; }
      .palette-option span { color: var(--muted); font-size: 9px; }
      .palette-option.is-selected { background: rgba(255,255,255,.88); box-shadow: 0 3px 10px rgba(24,28,38,.08); color: var(--purple); }
      .grid-size-tabs { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 6px; }
      .grid-size-option {
        min-height: 34px;
        padding: 0 5px;
        border: 1px solid rgba(75,80,96,.1);
        border-radius: 10px;
        color: var(--muted);
        background: rgba(255,255,255,.48);
        font-size: 9px;
        font-weight: 700;
        cursor: pointer;
      }
      .grid-size-option:hover { border-color: rgba(118,87,232,.32); color: var(--purple); }
      .grid-size-option.is-selected { border-color: rgba(118,87,232,.46); color: var(--purple); background: rgba(248,245,255,.92); box-shadow: 0 0 0 2px rgba(118,87,232,.07); }
      .grid-size-option:disabled { opacity: .5; cursor: wait; }
      .pipeline {
        display: flex;
        align-items: center;
        gap: 5px;
        margin-top: 12px;
        color: var(--muted);
        font-size: 9px;
      }
      .pipeline span { min-width: 0; padding: 5px 7px; border-radius: 999px; background: rgba(80,86,102,.06); white-space: nowrap; }
      .pipeline b { color: rgba(80,86,102,.35); }
      .composer-error { margin-top: 10px; padding: 8px 10px; border-radius: 10px; color: #b42318; background: rgba(239,68,68,.08); font-size: 10px; line-height: 1.4; }
      .composer-bottom { margin-top: 14px; }
      .safe-note { max-width: 195px; color: var(--muted); font-size: 9px; line-height: 1.4; }
      .composer-actions, .footer-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
      .button {
        min-height: 35px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 0 13px;
        border: 1px solid transparent;
        border-radius: 11px;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
      }
      .button:hover { transform: translateY(-1px); }
      .button:disabled { opacity: .52; cursor: default; transform: none; }
      .button.secondary { border-color: rgba(75,80,96,.1); background: rgba(255,255,255,.58); }
      .button.primary { color: #fff; background: linear-gradient(135deg, var(--orange), var(--pink) 48%, var(--purple)); box-shadow: 0 9px 20px rgba(118,87,232,.2); }
      .icon-button { width: 34px; height: 34px; display: grid; place-items: center; flex: 0 0 auto; padding: 0; border: 0; border-radius: 10px; background: transparent; cursor: pointer; }
      .icon-button:hover { background: rgba(80,86,102,.07); }
      .selection { position: fixed; z-index: 8; border: 2px solid rgba(118,87,232,.78); border-radius: 13px; box-shadow: 0 0 0 3px rgba(255,122,26,.12); pointer-events: none; }
      .selection.is-busy { animation: pulse 1.3s ease-in-out infinite; }
      .result-backdrop {
        position: fixed;
        inset: 0;
        z-index: 30;
        display: grid;
        place-items: center;
        padding: 24px;
        background: rgba(18,20,29,.34);
        -webkit-backdrop-filter: blur(18px);
        backdrop-filter: blur(18px);
        pointer-events: auto;
        animation: fade 180ms ease both;
      }
      .result-viewer { width: min(1100px, calc(100vw - 48px)); max-height: calc(100vh - 48px); display: grid; grid-template-rows: auto minmax(0, 1fr) auto; overflow: hidden; border-radius: 25px; color: var(--text); }
      .result-header { min-height: 68px; padding: 12px 17px 12px 20px; border-bottom: 1px solid rgba(70,76,92,.09); }
      .result-header strong { display: block; margin-top: 3px; font-size: 16px; }
      .eyebrow { color: var(--purple); font-size: 9px; font-weight: 800; letter-spacing: .08em; }
      .result-grid { min-height: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 14px; padding: 18px; overflow: auto; background: rgba(241,241,247,.55); }
      .result-card { min-width: 0; display: grid; grid-template-rows: auto minmax(0, 1fr); gap: 8px; }
      .result-card header { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
      .result-card header > div { min-width: 0; display: grid; gap: 2px; }
      .result-card strong { font-size: 11px; }
      .result-card span { color: var(--muted); font-size: 9px; }
      .result-card-action {
        flex: 0 0 auto;
        min-height: 27px;
        padding: 0 9px;
        border: 1px solid rgba(118,87,232,.2);
        border-radius: 8px;
        color: var(--purple);
        background: rgba(248,245,255,.82);
        font-size: 9px;
        font-weight: 750;
        cursor: pointer;
      }
      .result-card-action:hover { border-color: rgba(118,87,232,.48); background: #fff; }
      .result-card-action:disabled { opacity: .5; cursor: wait; }
      .result-image-wrap { min-height: 250px; display: grid; place-items: center; overflow: hidden; border: 1px solid rgba(70,76,92,.08); border-radius: 16px; background: #fff; box-shadow: 0 9px 25px rgba(25,29,43,.1); }
      .result-image-wrap img { display: block; width: 100%; height: 100%; max-height: 58vh; object-fit: contain; }
      .result-footer { min-height: 72px; padding: 12px 17px 12px 20px; border-top: 1px solid rgba(70,76,92,.09); }
      .result-footer p { margin: 0; color: var(--muted); font-size: 10px; }
      .result-footer-info { min-width: 0; display: grid; gap: 8px; }
      .result-size-control { display: flex; align-items: center; gap: 8px; }
      .result-size-control > span { flex: 0 0 auto; color: var(--muted); font-size: 9px; }
      .grid-size-tabs.is-compact { width: min(370px, 46vw); }
      .grid-size-tabs.is-compact .grid-size-option { min-height: 28px; border-radius: 8px; }
      .adjustment-backdrop {
        position: fixed;
        inset: 0;
        z-index: 4;
        display: grid;
        place-items: center;
        padding: 20px;
        background: rgba(18,20,29,.42);
        -webkit-backdrop-filter: blur(14px);
        backdrop-filter: blur(14px);
      }
      .adjustment-dialog { width: min(680px, calc(100vw - 40px)); max-height: calc(100vh - 40px); display: grid; grid-template-rows: auto minmax(0, 1fr) auto; overflow: hidden; border-radius: 22px; }
      .adjustment-header, .adjustment-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 17px; }
      .adjustment-header { border-bottom: 1px solid rgba(70,76,92,.09); }
      .adjustment-header strong { display: block; margin-top: 3px; font-size: 15px; }
      .adjustment-footer { justify-content: flex-end; border-top: 1px solid rgba(70,76,92,.09); }
      .adjustment-body { padding: 16px 17px; overflow: auto; }
      .adjustment-references { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      .adjustment-references figure { min-width: 0; margin: 0; }
      .adjustment-references img { width: 100%; height: 160px; display: block; border: 1px solid rgba(70,76,92,.08); border-radius: 13px; object-fit: contain; background: #fff; }
      .adjustment-references figcaption { margin-top: 5px; color: var(--muted); font-size: 9px; }
      .adjustment-modes { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; margin-top: 14px; padding: 4px; border-radius: 12px; background: rgba(80,86,102,.07); }
      .adjustment-modes button { min-height: 34px; border: 0; border-radius: 9px; color: var(--muted); background: transparent; font-size: 10px; font-weight: 750; cursor: pointer; }
      .adjustment-modes button.is-selected { color: var(--purple); background: rgba(255,255,255,.9); box-shadow: 0 3px 10px rgba(24,28,38,.08); }
      .adjustment-mode-hint, .adjustment-note { margin: 7px 1px 0; color: var(--muted); font-size: 9px; line-height: 1.5; }
      .adjustment-prompt-label { display: block; margin: 13px 0 6px; color: var(--text); font-size: 10px; font-weight: 750; }
      .adjustment-body textarea { width: 100%; min-height: 104px; resize: vertical; padding: 10px 11px; border: 1px solid rgba(75,80,96,.14); border-radius: 12px; outline: 0; color: var(--text); background: rgba(255,255,255,.8); font: 11px/1.55 -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif; }
      .adjustment-body textarea:focus { border-color: rgba(118,87,232,.5); box-shadow: 0 0 0 3px rgba(118,87,232,.08); }
      .toast { position: fixed; left: 50%; bottom: 28px; z-index: 50; max-width: min(440px, calc(100vw - 32px)); padding: 10px 14px; border-radius: 13px; color: var(--text); font-size: 11px; font-weight: 650; pointer-events: none; transform: translateX(-50%); animation: toast-in 180ms var(--ease) both; }
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes pulse { 50% { box-shadow: 0 0 0 7px rgba(255,122,26,.08); } }
      @keyframes pop { from { opacity: 0; transform: translateY(5px) scale(.98); } to { opacity: 1; transform: none; } }
      @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
      @keyframes toast-in { from { opacity: 0; transform: translate(-50%, 6px); } to { opacity: 1; transform: translate(-50%, 0); } }
      @media (max-width: 760px) {
        .orb { right: 16px; bottom: 88px; }
        .panel { right: 16px; bottom: 144px; width: min(286px, calc(100vw - 32px)); }
        .style-grid { grid-template-columns: 1fr; }
        .result-grid { grid-template-columns: 1fr; }
        .result-viewer { width: calc(100vw - 24px); max-height: calc(100vh - 24px); }
        .result-backdrop { padding: 12px; }
        .result-footer { align-items: flex-start; flex-direction: column; }
        .result-footer-info, .result-size-control { width: 100%; }
        .result-size-control { align-items: flex-start; flex-direction: column; }
        .grid-size-tabs.is-compact { width: 100%; }
        .adjustment-backdrop { padding: 12px; }
        .adjustment-dialog { width: calc(100vw - 24px); max-height: calc(100vh - 24px); }
        .adjustment-references img { height: 120px; }
      }
    `;
  }

  function icon(name) {
    const icons = {
      bead: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="7" cy="7" r="2.6"/><circle cx="15.8" cy="6.3" r="2.1"/><circle cx="11.8" cy="13.2" r="2.8"/><circle cx="18" cy="16.8" r="2.2"/><circle cx="5.3" cy="17.2" r="1.8"/></svg>',
      close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>',
      upload: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5"/><path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"/></svg>',
      sparkle: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3c.6 4.5 2.5 6.4 7 7-4.5.6-6.4 2.5-7 7-.6-4.5-2.5-6.4-7-7 4.5-.6 6.4-2.5 7-7Z"/><path d="M19 16c.2 1.8 1 2.6 2.8 2.8-1.8.2-2.6 1-2.8 2.8-.2-1.8-1-2.6-2.8-2.8 1.8-.2 2.6-1 2.8-2.8Z"/></svg>',
      check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.2 4.2L19 7"/></svg>',
      restore: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10a8 8 0 1 1 2.4 7.1"/><path d="M4 4v6h6"/></svg>',
      download: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11m0 0 4-4m-4 4-4-4"/><path d="M5 19h14"/></svg>'
    };
    return icons[name] || '';
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function on(target, type, listener, options) {
    target.addEventListener(type, listener, options);
    disposers.push(() => target.removeEventListener(type, listener, options));
  }

  function getImageSource(image) {
    return image?.currentSrc || image?.src || image?.getAttribute?.('src') || '';
  }

  function absoluteUrl(source) {
    if (!source) return '';
    if (/^(?:data:image\/|blob:|https?:\/\/)/i.test(source)) return source;
    try { return new URL(source, location.href).href; } catch (_) { return ''; }
  }

  function isVisibleImage(image) {
    if (!(image instanceof HTMLImageElement)) return false;
    const rect = image.getBoundingClientRect();
    const style = getComputedStyle(image);
    return rect.width >= config.minImageSize
      && rect.height >= config.minImageSize
      && rect.bottom > 0
      && rect.top < innerHeight
      && style.display !== 'none'
      && style.visibility !== 'hidden';
  }

  function findBestImage(container, x, y) {
    if (!container?.querySelectorAll) return null;
    const images = Array.from(container.querySelectorAll('img')).filter(isVisibleImage);
    const pointed = images.filter((image) => {
      const rect = image.getBoundingClientRect();
      return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    });
    const pool = pointed.length ? pointed : images;
    pool.sort((a, b) => {
      const ar = a.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      return (br.width * br.height) - (ar.width * ar.height);
    });
    return pool[0] || null;
  }

  function findImageFromEvent(event) {
    const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
    const direct = path.find((node) => node instanceof HTMLImageElement) || event.target?.closest?.('img');
    if (direct) return direct;

    const elements = path.filter((node) => node instanceof Element);
    const container = event.target?.closest?.(`${config.selectors.cover}, ${config.selectors.detail}`)
      || elements.find((node) => node.matches?.(config.selectors.cover) || node.matches?.(config.selectors.detail));
    const nested = findBestImage(container, event.clientX, event.clientY);
    if (nested) return nested;

    const pointElements = typeof document.elementsFromPoint === 'function'
      ? document.elementsFromPoint(event.clientX, event.clientY)
      : [];
    for (const element of pointElements.slice(0, 8)) {
      if (element instanceof HTMLImageElement && isVisibleImage(element)) return element;
      const candidate = findBestImage(element, event.clientX, event.clientY);
      if (candidate) return candidate;
    }
    return null;
  }

  function resolveTarget(event) {
    const image = findImageFromEvent(event);
    if (!image || host.contains(image) || !isVisibleImage(image)) return null;
    const record = recordsByImage.get(image);
    const source = absoluteUrl(record?.original.sourceUrl || getImageSource(image));
    if (!source) return null;
    const card = image.closest(config.selectors.card)
      || image.closest(config.selectors.detail)
      || image.closest(config.selectors.cover)
      || image.parentElement;
    const title = card?.querySelector?.('figcaption, .title, [class*="title"], h1, h2, h3')?.textContent?.trim()
      || record?.original.alt
      || image.alt?.trim()
      || document.title
      || '网页图片';
    return { image, card, source, title };
  }

  function selectTarget(target, x, y) {
    state.activeImage = target.image;
    state.activeCard = target.card;
    state.sourceUrl = target.source;
    state.sourceTitle = target.title;
    state.anchorX = x;
    state.anchorY = y;
    state.error = null;
    state.styleUrl = '';
    state.beadUrl = '';
    state.patternUrl = '';
    state.patternMeta = null;
    updateSelection();
  }

  function hasTarget() {
    return Boolean(state.activeImage && state.sourceUrl);
  }

  function togglePanel(force) {
    state.panelOpen = typeof force === 'boolean' ? force : !state.panelOpen;
    refs.panel.hidden = !state.panelOpen;
    refs.orb.setAttribute('aria-expanded', String(state.panelOpen));
    renderPanel();
  }

  function renderPanel() {
    const status = state.busy
      ? state.progress
      : state.error
        ? state.error.message
        : state.lastResult
          ? `已生成 · ${state.lastResult.styleName} · ${state.lastResult.paletteSize} 色`
          : '右键网页图片，选择“生成拼豆图”';
    refs.panel.innerHTML = `
      <div class="panel-head">
        <div>
          <div class="panel-title"><span>${icon('bead')}</span><span>拼豆生成器</span></div>
          <p class="panel-copy">${state.enabled ? '已开启图片右键增强' : '已暂停，不拦截图片右键'}</p>
        </div>
        <button class="icon-button" type="button" data-action="close-panel" aria-label="关闭">${icon('close')}</button>
      </div>
      <div class="panel-section panel-row">
        <div><strong>右键增强</strong><small>${escapeHtml(status)}</small></div>
        <button class="switch ${state.enabled ? 'is-on' : ''}" type="button" data-action="toggle-enabled" role="switch" aria-checked="${state.enabled}"></button>
      </div>
      <div class="panel-section">
        <button class="upload" type="button" data-action="upload">
          <span class="upload-icon">${icon('upload')}</span>
          <span><strong>上传本地图片</strong><small>PNG、JPG、WebP，最大 ${config.maxUploadMB}MB</small></span>
          <span>›</span>
        </button>
      </div>
      ${state.lastResult ? `
        <div class="panel-section">
          <button class="button secondary" type="button" data-action="show-result">查看最近生成结果</button>
        </div>
      ` : ''}
    `;
  }

  function showContextMenu(x, y) {
    state.surface = 'context';
    refs.surface.className = 'surface glass';
    refs.surface.innerHTML = `
      <div class="context">
        <button class="context-item" type="button" data-action="open-composer">
          <span class="context-icon">${icon('sparkle')}</span>
          <strong>生成拼豆图</strong>
          <span class="context-key">↵</span>
        </button>
        <div class="context-hint">Shift + 右键打开原菜单</div>
      </div>
    `;
    refs.surface.hidden = false;
    positionSurface(x, y, 202);
    updateSelection();
    requestAnimationFrame(() => refs.surface.querySelector('[data-action="open-composer"]')?.focus());
  }

  function renderStyleCards() {
    const originalCard = `
      <button class="style-card ${state.styleId ? '' : 'is-selected'}" type="button"
        data-action="select-style" data-style-id="" aria-pressed="${!state.styleId}">
        <img src="${escapeHtml(state.sourceUrl)}" alt="原图">
        <strong>原图</strong>
        <span class="style-check">${icon('check')}</span>
      </button>
    `;
    const styleCards = STYLES.map((style) => `
      <button class="style-card ${state.styleId === style.id ? 'is-selected' : ''}" type="button"
        data-action="select-style" data-style-id="${escapeHtml(style.id)}" aria-pressed="${state.styleId === style.id}">
        <img src="${escapeHtml(style.imageUrl)}" alt="${escapeHtml(style.name)}风格示例">
        <strong>${escapeHtml(style.name)}</strong>
        <span class="style-check">${icon('check')}</span>
      </button>
    `).join('');
    return originalCard + styleCards;
  }

  function renderGridSizeOptions(selectedSize, action) {
    return GRID_SIZES.map((size) => `
      <button class="grid-size-option ${selectedSize === size ? 'is-selected' : ''}" type="button"
        data-action="${escapeHtml(action)}" data-grid-size="${size}"
        aria-pressed="${selectedSize === size}" ${state.busy ? 'disabled' : ''}>
        ${size}×${size}
      </button>
    `).join('');
  }

  function showComposer() {
    if (!hasTarget()) {
      showToast('目标图片不可用，请重新选择');
      closeSurface();
      return;
    }
    state.surface = 'composer';
    refs.surface.className = 'surface glass is-composer';
    refs.surface.innerHTML = `
      <div class="composer">
        <div class="composer-header">
          <img class="thumb" src="${escapeHtml(state.sourceUrl)}" alt="待生成图片缩略图">
          <div class="composer-heading">
            <strong>制作这张图片的拼豆图</strong>
            <span>${escapeHtml(state.sourceTitle)}</span>
          </div>
          <button class="icon-button" type="button" data-action="close-surface" aria-label="关闭">${icon('close')}</button>
        </div>

        <span class="section-label">选择风格</span>
        <div class="style-grid">${renderStyleCards()}</div>

        <span class="section-label">选择拼豆色号范围</span>
        <div class="palette-tabs">
          <button class="palette-option ${state.paletteSize === 221 ? 'is-selected' : ''}" type="button" data-action="select-palette" data-palette="221" aria-pressed="${state.paletteSize === 221}">
            <strong>基础版 · 221 色</strong><span>常用色齐全，成品更易配色</span>
          </button>
          <button class="palette-option ${state.paletteSize === 291 ? 'is-selected' : ''}" type="button" data-action="select-palette" data-palette="291" aria-pressed="${state.paletteSize === 291}">
            <strong>扩展版 · 291 色</strong><span>渐变更细腻，颜色还原更丰富</span>
          </button>
        </div>

        <span class="section-label">选择拼豆尺寸</span>
        <div class="grid-size-tabs">
          ${renderGridSizeOptions(state.gridSize, 'select-grid-size')}
        </div>

        <div class="pipeline">
          ${state.styleId
            ? '<span>提取主体</span><b>→</b><span>生成风格图</span><b>→</b><span>生成拼豆图</span><b>→</b><span>代码生成色号图纸</span>'
            : '<span>使用原图</span><b>→</b><span>生成拼豆图</span><b>→</b><span>代码生成色号图纸</span>'}
        </div>
        ${state.error ? `<div class="composer-error">${escapeHtml(state.error.message || state.error)}</div>` : ''}

        <div class="composer-bottom">
          <span class="safe-note">最终一步由代码按 MARD 色表精确配色，生成后可切换尺寸，不会再次调用 AI。</span>
          <div class="composer-actions">
            <button class="button secondary" type="button" data-action="close-surface">取消</button>
            <button class="button primary" type="button" data-action="generate" ${state.busy ? 'disabled' : ''}>
              ${icon('sparkle')}<span>开始生成</span>
            </button>
          </div>
        </div>
      </div>
    `;
    refs.surface.hidden = false;
    positionSurface(state.anchorX, state.anchorY, Math.min(404, innerWidth - 32));
    updateSelection();
  }

  function positionSurface(x, y, expectedWidth) {
    requestAnimationFrame(() => {
      if (refs.surface.hidden) return;
      const margin = 16;
      const gap = 8;
      const rect = refs.surface.getBoundingClientRect();
      const width = Math.max(rect.width, expectedWidth || 0);
      const height = rect.height || 120;
      let left = x + gap;
      let top = y + gap;
      if (left + width > innerWidth - margin) left = x - width - gap;
      if (top + height > innerHeight - margin) top = y - height - gap;
      left = Math.max(margin, Math.min(left, innerWidth - width - margin));
      top = Math.max(margin, Math.min(top, innerHeight - height - margin));
      refs.surface.style.left = `${Math.round(left)}px`;
      refs.surface.style.top = `${Math.round(top)}px`;
    });
  }

  function closeSurface() {
    state.surface = '';
    refs.surface.hidden = true;
    refs.surface.innerHTML = '';
    if (!state.busy) refs.selection.hidden = true;
  }

  function updateSelection() {
    const image = state.activeImage;
    if (!image?.isConnected || (!state.surface && !state.busy)) {
      refs.selection.hidden = true;
      return;
    }
    const rect = image.getBoundingClientRect();
    if (!rect.width || !rect.height || rect.bottom < 0 || rect.top > innerHeight) {
      refs.selection.hidden = true;
      return;
    }
    refs.selection.hidden = false;
    refs.selection.style.left = `${Math.round(rect.left - 2)}px`;
    refs.selection.style.top = `${Math.round(rect.top - 2)}px`;
    refs.selection.style.width = `${Math.round(rect.width + 4)}px`;
    refs.selection.style.height = `${Math.round(rect.height + 4)}px`;
    refs.selection.classList.toggle('is-busy', state.busy);
  }

  function setPhase(phase, progress, error) {
    state.phase = phase;
    state.busy = phase === 'style' || phase === 'bead' || phase === 'pattern' || phase === 'effect';
    state.progress = progress || '';
    state.error = error || null;
    refs.orb.classList.toggle('is-busy', state.busy);
    refs.orb.classList.toggle('is-success', phase === 'success');
    refs.orb.classList.toggle('is-error', phase === 'error');
    refs.orb.classList.toggle('is-disabled', !state.enabled);
    updateSelection();
    renderPanel();
  }

  function getSelectedStyle() {
    if (!state.styleId) return null;
    return STYLES.find((style) => style.id === state.styleId) || null;
  }

  function getAspectRatio(image) {
    const width = image?.naturalWidth || image?.width || image?.getBoundingClientRect?.().width || 1;
    const height = image?.naturalHeight || image?.height || image?.getBoundingClientRect?.().height || 1;
    const ratio = width / height;
    const supported = [
      ['9:16', 9 / 16], ['2:3', 2 / 3], ['3:4', 3 / 4], ['1:1', 1],
      ['4:3', 4 / 3], ['3:2', 3 / 2], ['16:9', 16 / 9], ['21:9', 21 / 9]
    ];
    return supported.reduce((best, item) => (
      Math.abs(Math.log(ratio / item[1])) < Math.abs(Math.log(ratio / best[1])) ? item : best
    ), supported[0])[0];
  }

  function buildStylePrompt(style) {
    return [
      '参考图中包含一张用户原始图片和一张所选风格示例图。请准确区分两者：含有用户待处理主体的图片只提供主体与构图，所选风格示例图只提供画风、配色、线条和质感。',
      '以用户原始图片作为唯一主体与构图依据，先准确识别并保留其中的主要人物、动物或物体。',
      '保持原主体身份、脸部特征、发型、姿态、服装轮廓、标志性配饰和视角一致，绝不能替换成风格示例图中的人物、动物或物体，也不要添加文字、水印或边框。',
      '将主体完整地从杂乱背景中视觉分离，边缘清楚，画面主体完整，不裁掉头顶、四肢或关键物件。',
      `使用以下风格进行高质量重绘：${style.stylePrompt}。`,
      '这是拼豆图生成的中间风格稿：造型轮廓要明确，色块关系清晰，细节有层次，避免照片噪点和过度复杂的背景。'
    ].join('\n');
  }

  function buildBeadPrompt(style, paletteSize, gridSize) {
    const paletteText = paletteSize === 291
      ? '扩展版 291 色标准拼豆色号体系，允许更丰富的近似色、肤色和渐变层次'
      : '基础版 221 色标准拼豆色号体系，优先使用常用、易购买、区分清楚的色号';
    return [
      style
        ? '请以参考风格图为唯一内容依据，提取其中的主要主体并制作一张可以实际照图拼制的拼豆（Perler/Hama beads）成品效果图。'
        : '请直接以参考原图为唯一内容依据，准确提取其中的主要人物、动物或物体，并制作一张可以实际照图拼制的拼豆（Perler/Hama beads）成品效果图。',
      '严格保持主体身份、姿态、服装、配饰、主要配色和外轮廓；去除原背景、花卉背景、装饰背景、阴影、文字、水印和边框。',
      '背景必须是干净、均匀的纯白色，只保留一个完整居中的拼豆主体，主体四周留出适量白边。',
      `颜色只能从${paletteText}中选取；不是要求使用全部颜色，而是把每个像素映射到该色号范围内最接近的可用拼豆色。`,
      '使用清晰、规整、等尺寸、横竖严格对齐的拼豆网格表现；每颗拼豆独立可辨，边缘呈阶梯状像素轮廓，不使用抗锯齿、半透明、模糊渐变或绘画笔触。',
      '这是供代码读取颜色的中间图：每个豆格内部必须是均匀的单一平涂色，不绘制孔洞、反光、高光、阴影或立体材质，不能让一颗豆子内部出现多种颜色。',
      `画面首先会由代码均匀采样为 ${gridSize}×${gridSize} 网格，并允许用户在 ${GRID_SIZES.join('、')} 等规格间切换；请让主体完整居中、单颗拼豆大小一致、网格方向水平垂直，不要使用透视倾斜的拼豆板。`,
      '在有限网格中保留脸部、五官、发型、服饰纹样和关键配饰等最有辨识度的细节，色块连续，轮廓闭合，适合作为拼豆参考图。',
      style
        ? `中间稿所选风格为“${style.name}”，保留它对主体的造型与配色处理，但最终材质必须完全转换为真实拼豆像素艺术。`
        : '未选择额外风格，不要对主体做风格化重绘；直接忠实还原原图主体的造型、比例和主要配色，再转换为真实拼豆像素艺术。'
    ].join('\n');
  }

  function buildAdjustmentPrompt(result, instruction, mode) {
    const modeInstruction = mode === 'creative'
      ? '这是一次创意调整：以当前 AI 拼豆图为修改起点，按用户要求改变指定的造型、动作、配饰、表情或局部设计；未被要求改变的主体身份、关键特征、构图和主要配色必须保持稳定。'
      : '这是一次转换修正：仔细对照原图，修复当前 AI 拼豆图中遗漏、错位、比例不准或辨识度不足的主体特征；除用户明确指出的部分外，不要进行额外创作。';
    return [
      '参考图中包含原图和当前 AI 拼豆图。请根据画面特征准确区分：原图用于确认主体身份、姿态、关键细节和内容事实；白色背景、规则豆格的图片是当前 AI 拼豆图，也是本次修改的直接起点。',
      modeInstruction,
      `用户本次调整要求：${instruction}`,
      `输出仍须是 MARD ${result.paletteSize} 色体系适用的拼豆成品图，并适合后续代码采样为 ${result.patternMeta.width}×${result.patternMeta.height} 网格。`,
      '保持干净均匀的纯白背景，只保留一个完整居中的拼豆主体，四周留白；不能把原图背景、文字、书法、水印、边框或无关装饰带入成品。',
      '所有拼豆必须等尺寸、横竖严格对齐、边缘呈阶梯状；每颗豆格内部只使用单一平涂色，不要孔洞、反光、阴影、抗锯齿、模糊渐变或绘画笔触。',
      '只输出调整后的拼豆图，不要输出对比图、说明文字、色号、坐标、网格标签或颜色清单。'
    ].join('\n');
  }

  function buildHeatEffectPrompt(result, side) {
    const isBack = side === 'back';
    const sideDescription = isBack
      ? [
        '展示这张单层拼豆薄片翻转后的热压反面，图案相对于正面自然水平镜像，但仍是同一张完整平片。',
        '反面必须是熨烫纸直接接触的一面：所有圆柱豆粒都被明显压扁，原有圆孔完全或接近完全闭合；相邻豆粒横向膨胀并连接成一层连续的薄塑料熔融膜。',
        '近看必须清楚看到密集的压熔纹理：每颗豆对应的扁平圆角方块或扁圆压痕、相邻色块之间略微鼓起的熔合接缝、烫纸留下的细颗粒哑光压纹、轻微波浪褶皱、局部挤压和不均匀热收缩。',
        '反面不能继续保留一颗颗直立圆柱拼豆，不能有整齐开放圆孔，不能只是把正面图案镜像后保持原材质，也不能变成光滑无纹理的塑料印刷板。'
      ].join('')
      : [
        '展示这张单层拼豆薄片的正面，图案方向与参考图一致。',
        '正面仍能辨认规则排列的豆粒端面和细密横纵行列，但所有豆粒都处在完全相同的平面上；只允许极轻微的受热收缩、边缘熔合和半哑光塑料微纹理。',
        '使用接近正视、仅有很小倾角的拍摄角度，只在薄片外轮廓处显示均匀一致的约 2–3 毫米厚度；绝不能让图案内部形成前后层级、浮雕或独立立体部件。'
      ].join('');
    return [
      '请把参考图中的 AI 拼豆图准确还原成一张已经实际熨烫完成的真实 Perler/Hama 塑料拼豆单层平片产品照片。',
      '最高优先级结构约束：成品必须是一张从头到尾处在同一平面、厚度均匀的二维拼豆薄片。参考图中的人物、动物、桌子、书本、笔、家具和其他内部元素都只是薄片表面的像素色块，绝不是可以站立、堆叠、凸起或分层的实体。',
      '必须忠实保留参考图的二维像素轮廓、颜色分区、主体形状、五官、配饰和所有关键色块，不要把平面图案改造成场景模型，不要重新设计图案，不要加入参考图中没有的文字或装饰。',
      sideDescription,
      `作品应体现约 ${result.patternMeta.width}×${result.patternMeta.height} 豆格的精细程度，但不要显示坐标、色号、辅助网格或拼豆板。`,
      '材质必须是热熔塑料拼豆：可见半哑光塑料、细小高光、真实微纹理和熔合接缝；整体只能有均匀薄片厚度，不得出现明显高度差。绝不能表现为刺绣、毛线、钩织、布料、纸张、马赛克瓷砖或二维插画。',
      '严格禁止：3D 拼豆摆件、立体模型、分层纸雕、浮雕、厚重挤出、独立桌面、桌腿、堆叠书本、站立人物、凸起手臂、支架、底座、微缩场景或任何脱离同一平面的结构。',
      '采用写实手工作品摄影：一只真实的手仅夹住或托住薄片最下方的边缘，不能用手掌承托一个立体场景；暖灰色细纹墙面作为简洁背景，柔和室内侧光形成薄片投下的自然阴影，高清微距材质细节，真实比例。',
      `画面只展示同一件作品的${isBack ? '反面' : '正面'}，不要拼接正反面对比图，不要出现熨斗、熨烫纸、包装、说明文字、水印或边框。`
    ].join('\n');
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('读取本地图片失败'));
      reader.readAsDataURL(file);
    });
  }

  async function prepareReference(source) {
    if (/^https?:\/\//i.test(source)) return { reference_image_url: source };
    if (/^data:image\/[^;]+;base64,/i.test(source)) return { reference_image_base64: source };
    if (/^data:image\//i.test(source)) return { reference_image_base64: await rasterizeToPng(source) };
    if (/^blob:/i.test(source)) {
      const response = await fetch(source);
      const blob = await response.blob();
      return { reference_image_base64: await fileToDataUrl(blob) };
    }
    throw new Error('当前图片地址无法用于图生图，请尝试上传原图');
  }

  function addStyleReference(sourceReference, style) {
    const referenceImageUrls = [];
    const referenceImageBase64s = [];

    if (sourceReference.reference_image_url) {
      referenceImageUrls.push(sourceReference.reference_image_url);
    }
    if (sourceReference.reference_image_base64) {
      referenceImageBase64s.push(sourceReference.reference_image_base64);
    }
    if (/^https?:\/\//i.test(style.imageUrl)) {
      referenceImageUrls.push(style.imageUrl);
    } else if (/^data:image\/[^;]+;base64,/i.test(style.imageUrl)) {
      referenceImageBase64s.push(style.imageUrl);
    } else {
      throw new Error(`风格“${style.name}”的参考图地址不可用`);
    }

    return Object.assign(
      {},
      referenceImageUrls.length ? { reference_image_urls: referenceImageUrls } : {},
      referenceImageBase64s.length ? { reference_image_base64s: referenceImageBase64s } : {}
    );
  }

  function mergeImageReferences(...references) {
    const referenceImageUrls = [];
    const referenceImageBase64s = [];
    references.forEach((reference) => {
      if (reference?.reference_image_url) referenceImageUrls.push(reference.reference_image_url);
      if (reference?.reference_image_base64) referenceImageBase64s.push(reference.reference_image_base64);
      if (Array.isArray(reference?.reference_image_urls)) referenceImageUrls.push(...reference.reference_image_urls);
      if (Array.isArray(reference?.reference_image_base64s)) referenceImageBase64s.push(...reference.reference_image_base64s);
    });
    return Object.assign(
      {},
      referenceImageUrls.length ? { reference_image_urls: referenceImageUrls } : {},
      referenceImageBase64s.length ? { reference_image_base64s: referenceImageBase64s } : {}
    );
  }

  async function rasterizeToPng(source) {
    const image = await loadImage(source);
    const maxEdge = 2560;
    const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth || 1, image.naturalHeight || 1));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round((image.naturalWidth || 1) * scale));
    canvas.height = Math.max(1, Math.round((image.naturalHeight || 1) * scale));
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  }

  async function createMockImage(source, label, pixelate) {
    await delay(config.mockDelayMs);
    try {
      const image = await loadImage(source);
      const maxEdge = 1000;
      const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth || 1, image.naturalHeight || 1));
      const width = Math.max(1, Math.round((image.naturalWidth || 1) * scale));
      const height = Math.max(1, Math.round((image.naturalHeight || 1) * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, width, height);
      if (pixelate) {
        const small = document.createElement('canvas');
        const cell = Math.max(24, Math.round(Math.min(width, height) / 22));
        small.width = Math.max(1, Math.round(width / cell));
        small.height = Math.max(1, Math.round(height / cell));
        const smallCtx = small.getContext('2d');
        smallCtx.drawImage(image, 0, 0, small.width, small.height);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(small, 0, 0, small.width, small.height, 0, 0, width, height);
        ctx.strokeStyle = 'rgba(255,255,255,.28)';
        ctx.lineWidth = 1;
        for (let x = 0; x < width; x += cell) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); }
        for (let y = 0; y < height; y += cell) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }
      } else {
        ctx.drawImage(image, 0, 0, width, height);
        const tint = ctx.createLinearGradient(0, 0, width, height);
        tint.addColorStop(0, 'rgba(173,216,230,.16)');
        tint.addColorStop(.5, 'rgba(245,225,188,.12)');
        tint.addColorStop(1, 'rgba(23,43,77,.14)');
        ctx.fillStyle = tint;
        ctx.fillRect(0, 0, width, height);
      }
      ctx.fillStyle = 'rgba(255,255,255,.88)';
      ctx.fillRect(12, 12, Math.min(width - 24, 180), 34);
      ctx.fillStyle = '#6949d7';
      ctx.font = '600 14px -apple-system, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, 23, 29);
      return canvas.toDataURL('image/png');
    } catch (_) {
      return source;
    }
  }

  function loadImage(source) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('图片加载失败'));
      image.src = source;
    });
  }

  function delay(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, Math.max(0, Number(ms) || 0)));
  }

  function imageDataUrlFromBase64(base64, outputFormat) {
    const value = String(base64 || '').trim();
    if (!value) throw new Error('服务端没有返回 b64_json');
    if (/^data:image\/[^;]+;base64,/i.test(value)) return value;
    const format = String(outputFormat || 'png').toLowerCase();
    const mime = format === 'jpg' || format === 'jpeg' ? 'image/jpeg' : `image/${format}`;
    return `data:${mime};base64,${value.replace(/\s+/g, '')}`;
  }

  async function generateImageWithProFallback(prompt, options) {
    const requestImage = async (requestOptions) => {
      const result = await window.LLMBridge.generateImage(prompt, requestOptions);
      if (!result?.success) {
        throw new Error(result?.error_message || '图片生成失败');
      }
      return {
        dataUrl: imageDataUrlFromBase64(result.b64_json, requestOptions.output_format),
        imageUrl: result.image_url || result.image_urls?.[0] || '',
        width: Number(result.width) || 0,
        height: Number(result.height) || 0,
        sizeBytes: Number(result.size_bytes) || 0
      };
    };

    const requestOptions = Object.assign({}, options || {}, {
      optimize_prompt_mode: 'pro',
      response_format: 'b64_json'
    });
    try {
      return await requestImage(requestOptions);
    } catch (error) {
      const fallbackOptions = Object.assign({}, requestOptions);
      delete fallbackOptions.optimize_prompt_mode;
      console.warn('[Yuze] Pro Prompt 优化请求失败，自动关闭优化重试一次:', error);
      showToast('Pro 优化暂时不可用，正在自动重试…', 2600);
      return requestImage(fallbackOptions);
    }
  }

  function hexToRgb(hex) {
    const value = String(hex || '').replace('#', '');
    return {
      r: parseInt(value.slice(0, 2), 16),
      g: parseInt(value.slice(2, 4), 16),
      b: parseInt(value.slice(4, 6), 16)
    };
  }

  function rgbToLab(r, g, b) {
    const linear = (value) => {
      const normalized = value / 255;
      return normalized <= .04045
        ? normalized / 12.92
        : Math.pow((normalized + .055) / 1.055, 2.4);
    };
    const red = linear(r);
    const green = linear(g);
    const blue = linear(b);
    const x = (red * .4124564 + green * .3575761 + blue * .1804375) / .95047;
    const y = (red * .2126729 + green * .7151522 + blue * .072175) / 1;
    const z = (red * .0193339 + green * .119192 + blue * .9503041) / 1.08883;
    const pivot = (value) => value > .008856451679
      ? Math.cbrt(value)
      : (7.787037037 * value) + (16 / 116);
    const fx = pivot(x);
    const fy = pivot(y);
    const fz = pivot(z);
    return {
      l: (116 * fy) - 16,
      a: 500 * (fx - fy),
      b: 200 * (fy - fz)
    };
  }

  function ciede2000(lab1, lab2) {
    const rad = Math.PI / 180;
    const deg = 180 / Math.PI;
    const c1 = Math.hypot(lab1.a, lab1.b);
    const c2 = Math.hypot(lab2.a, lab2.b);
    const cMean = (c1 + c2) / 2;
    const cMean7 = Math.pow(cMean, 7);
    const g = .5 * (1 - Math.sqrt(cMean7 / (cMean7 + Math.pow(25, 7))));
    const a1Prime = (1 + g) * lab1.a;
    const a2Prime = (1 + g) * lab2.a;
    const c1Prime = Math.hypot(a1Prime, lab1.b);
    const c2Prime = Math.hypot(a2Prime, lab2.b);
    const hue = (a, b) => {
      if (a === 0 && b === 0) return 0;
      const angle = Math.atan2(b, a) * deg;
      return angle >= 0 ? angle : angle + 360;
    };
    const h1Prime = hue(a1Prime, lab1.b);
    const h2Prime = hue(a2Prime, lab2.b);
    const deltaLPrime = lab2.l - lab1.l;
    const deltaCPrime = c2Prime - c1Prime;
    let deltaHuePrime = 0;
    if (c1Prime * c2Prime !== 0) {
      const difference = h2Prime - h1Prime;
      deltaHuePrime = Math.abs(difference) <= 180
        ? difference
        : difference > 180
          ? difference - 360
          : difference + 360;
    }
    const deltaHPrime = 2 * Math.sqrt(c1Prime * c2Prime) * Math.sin((deltaHuePrime / 2) * rad);
    const lMeanPrime = (lab1.l + lab2.l) / 2;
    const cMeanPrime = (c1Prime + c2Prime) / 2;
    let hMeanPrime = h1Prime + h2Prime;
    if (c1Prime * c2Prime !== 0) {
      const difference = Math.abs(h1Prime - h2Prime);
      hMeanPrime = difference <= 180
        ? (h1Prime + h2Prime) / 2
        : h1Prime + h2Prime < 360
          ? (h1Prime + h2Prime + 360) / 2
          : (h1Prime + h2Prime - 360) / 2;
    }
    const t = 1
      - .17 * Math.cos((hMeanPrime - 30) * rad)
      + .24 * Math.cos((2 * hMeanPrime) * rad)
      + .32 * Math.cos((3 * hMeanPrime + 6) * rad)
      - .20 * Math.cos((4 * hMeanPrime - 63) * rad);
    const deltaTheta = 30 * Math.exp(-Math.pow((hMeanPrime - 275) / 25, 2));
    const cMeanPrime7 = Math.pow(cMeanPrime, 7);
    const rc = 2 * Math.sqrt(cMeanPrime7 / (cMeanPrime7 + Math.pow(25, 7)));
    const sl = 1 + (.015 * Math.pow(lMeanPrime - 50, 2)) / Math.sqrt(20 + Math.pow(lMeanPrime - 50, 2));
    const sc = 1 + .045 * cMeanPrime;
    const sh = 1 + .015 * cMeanPrime * t;
    const rt = -Math.sin((2 * deltaTheta) * rad) * rc;
    const lTerm = deltaLPrime / sl;
    const cTerm = deltaCPrime / sc;
    const hTerm = deltaHPrime / sh;
    return Math.sqrt(
      Math.pow(lTerm, 2)
      + Math.pow(cTerm, 2)
      + Math.pow(hTerm, 2)
      + rt * cTerm * hTerm
    );
  }

  function preparePalette(paletteSize) {
    const source = paletteSize === 291 ? MARD_PALETTE_291 : MARD_PALETTE_221;
    return source.map((entry) => {
      const rgb = hexToRgb(entry.hex);
      return Object.assign({}, entry, rgb, { lab: rgbToLab(rgb.r, rgb.g, rgb.b) });
    });
  }

  function nearestPaletteColor(r, g, b, palette, cache) {
    const key = `${r},${g},${b}`;
    if (cache.has(key)) return cache.get(key);
    const target = rgbToLab(r, g, b);
    let best = palette[0];
    let bestDistance = Infinity;
    palette.forEach((entry) => {
      const distance = ciede2000(target, entry.lab);
      if (distance < bestDistance) {
        best = entry;
        bestDistance = distance;
      }
    });
    cache.set(key, best);
    return best;
  }

  async function loadCanvasSafeImage(source) {
    if (!/^https?:\/\//i.test(source)) return loadImage(source);
    try {
      const response = await fetch(source, { mode: 'cors', credentials: 'omit' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      try {
        return await loadImage(objectUrl);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    } catch (error) {
      throw new Error(`生成图无法读取像素，不能制作色号图纸：${error?.message || error}`);
    }
  }

  function roundedPath(ctx, x, y, width, height, radius) {
    const safeRadius = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + safeRadius, y);
    ctx.arcTo(x + width, y, x + width, y + height, safeRadius);
    ctx.arcTo(x + width, y + height, x, y + height, safeRadius);
    ctx.arcTo(x, y + height, x, y, safeRadius);
    ctx.arcTo(x, y, x + width, y, safeRadius);
    ctx.closePath();
  }

  function readableTextColor(entry) {
    const luminance = (.2126 * entry.r + .7152 * entry.g + .0722 * entry.b) / 255;
    return luminance < .52 ? '#ffffff' : '#20242d';
  }

  function renderPatternCanvas(cells, gridSize, paletteSize, counts) {
    const cellSize = gridSize > 105 ? 21 : gridSize > 80 ? 24 : 28;
    const boardSize = gridSize * cellSize;
    const margin = 56;
    const coordinateGutter = 54;
    const boardX = margin + coordinateGutter;
    const boardY = 150;
    const legendItems = Array.from(counts.entries())
      .map(([code, value]) => ({ entry: value.entry, count: value.count }))
      .sort((a, b) => b.count - a.count || a.entry.code.localeCompare(b.entry.code, 'en', { numeric: true }));
    const legendColumns = 6;
    const legendRows = Math.ceil(legendItems.length / legendColumns);
    const legendTop = boardY + boardSize + 96;
    const legendRowHeight = 88;
    const canvas = document.createElement('canvas');
    canvas.width = boardX + boardSize + margin;
    canvas.height = legendTop + 90 + legendRows * legendRowHeight + 54;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#343943';
    ctx.lineWidth = 4;
    roundedPath(ctx, 22, 22, canvas.width - 44, canvas.height - 44, 34);
    ctx.stroke();

    ctx.fillStyle = '#171a21';
    ctx.font = '700 34px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
    ctx.fillText(`MARD ${paletteSize} 色拼豆图纸`, margin, 70);
    ctx.fillStyle = '#686f7d';
    ctx.font = '500 18px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
    ctx.fillText(`${gridSize} × ${gridSize} 网格 · CIEDE2000 精确配色 · 每格标注 MARD 色号`, margin, 105);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '600 11px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillStyle = '#626978';
    for (let index = 0; index < gridSize; index += 1) {
      if (index === 0 || (index + 1) % 5 === 0) {
        const center = boardX + index * cellSize + cellSize / 2;
        ctx.fillText(String(index + 1), center, boardY - 18);
        ctx.fillText(String(index + 1), boardX - 25, boardY + index * cellSize + cellSize / 2);
      }
    }

    cells.forEach((entry, index) => {
      const xIndex = index % gridSize;
      const yIndex = Math.floor(index / gridSize);
      const x = boardX + xIndex * cellSize;
      const y = boardY + yIndex * cellSize;
      ctx.fillStyle = entry.hex;
      ctx.fillRect(x, y, cellSize, cellSize);
      ctx.strokeStyle = (xIndex + 1) % 5 === 0 || (yIndex + 1) % 5 === 0 ? '#9ca3b2' : '#d8dbe3';
      ctx.lineWidth = (xIndex + 1) % 5 === 0 || (yIndex + 1) % 5 === 0 ? 1.15 : .55;
      ctx.strokeRect(x, y, cellSize, cellSize);
      ctx.fillStyle = readableTextColor(entry);
      ctx.font = `700 ${entry.code.length > 2 ? 7 : 8}px -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.fillText(entry.code, x + cellSize / 2, y + cellSize / 2 + .5);
    });

    ctx.strokeStyle = '#555d6c';
    ctx.lineWidth = 2;
    ctx.strokeRect(boardX, boardY, boardSize, boardSize);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#171a21';
    ctx.font = '700 28px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
    ctx.fillText('颜色清单', margin, legendTop);
    ctx.textAlign = 'right';
    ctx.font = '500 18px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
    ctx.fillText(`共 ${legendItems.length} 种颜色｜共 ${gridSize * gridSize} 颗豆子`, canvas.width - margin, legendTop);

    const legendWidth = canvas.width - margin * 2;
    const itemWidth = legendWidth / legendColumns;
    legendItems.forEach((item, index) => {
      const column = index % legendColumns;
      const row = Math.floor(index / legendColumns);
      const x = margin + column * itemWidth;
      const y = legendTop + 38 + row * legendRowHeight;
      ctx.fillStyle = item.entry.hex;
      roundedPath(ctx, x, y, 68, 42, 9);
      ctx.fill();
      ctx.strokeStyle = '#d4d7df';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = readableTextColor(item.entry);
      ctx.textAlign = 'center';
      ctx.font = '700 16px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText(item.entry.code, x + 34, y + 21);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#313640';
      ctx.font = '600 15px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText(`× ${item.count}`, x + 80, y + 18);
      ctx.fillStyle = '#858b97';
      ctx.font = '500 12px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillText(item.entry.hex, x + 80, y + 38);
    });

    return {
      url: canvas.toDataURL('image/png'),
      width: gridSize,
      height: gridSize,
      total: gridSize * gridSize,
      colors: legendItems.map((item) => ({
        code: item.entry.code,
        hex: item.entry.hex,
        count: item.count
      }))
    };
  }

  function normalizeGridSize(value, fallback = config.patternGridSize) {
    const size = Math.round(Number(value));
    return GRID_SIZES.includes(size) ? size : fallback;
  }

  async function createMardPattern(source, paletteSize, requestedGridSize = state.gridSize) {
    const image = await loadCanvasSafeImage(source);
    const gridSize = normalizeGridSize(requestedGridSize);
    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = gridSize;
    sampleCanvas.height = gridSize;
    const sampleContext = sampleCanvas.getContext('2d', { willReadFrequently: true });
    sampleContext.fillStyle = '#ffffff';
    sampleContext.fillRect(0, 0, gridSize, gridSize);
    sampleContext.imageSmoothingEnabled = true;
    sampleContext.imageSmoothingQuality = 'high';
    const width = image.naturalWidth || image.width || 1;
    const height = image.naturalHeight || image.height || 1;
    const scale = Math.min(gridSize / width, gridSize / height);
    const drawWidth = Math.max(1, width * scale);
    const drawHeight = Math.max(1, height * scale);
    sampleContext.drawImage(
      image,
      (gridSize - drawWidth) / 2,
      (gridSize - drawHeight) / 2,
      drawWidth,
      drawHeight
    );

    const pixels = sampleContext.getImageData(0, 0, gridSize, gridSize).data;
    const palette = preparePalette(paletteSize);
    const matchingPalette = palette.filter((entry) => entry.code !== 'T1');
    const background = palette.find((entry) => entry.code === (paletteSize === 291 ? 'T1' : 'H2'))
      || palette[0];
    const cache = new Map();
    const counts = new Map();
    const cells = [];
    for (let index = 0; index < pixels.length; index += 4) {
      const alpha = pixels[index + 3] / 255;
      const r = Math.round(pixels[index] * alpha + 255 * (1 - alpha));
      const g = Math.round(pixels[index + 1] * alpha + 255 * (1 - alpha));
      const b = Math.round(pixels[index + 2] * alpha + 255 * (1 - alpha));
      const isWhiteBackground = r >= 247 && g >= 247 && b >= 247 && Math.max(r, g, b) - Math.min(r, g, b) <= 8;
      const entry = isWhiteBackground
        ? background
        : nearestPaletteColor(r, g, b, matchingPalette, cache);
      cells.push(entry);
      const current = counts.get(entry.code) || { entry, count: 0 };
      current.count += 1;
      counts.set(entry.code, current);
    }
    return renderPatternCanvas(cells, gridSize, paletteSize, counts);
  }

  function applyGeneratedImage(image, generatedUrl) {
    let record = recordsByImage.get(image);
    if (!record) {
      const picture = image.closest('picture');
      record = {
        image,
        original: {
          src: image.getAttribute('src') || '',
          srcset: image.getAttribute('srcset') || '',
          sizes: image.getAttribute('sizes') || '',
          sourceUrl: state.sourceUrl,
          alt: image.alt || '',
          sources: picture
            ? Array.from(picture.querySelectorAll('source')).map((node) => ({
              node,
              srcset: node.getAttribute('srcset') || '',
              sizes: node.getAttribute('sizes') || ''
            }))
            : []
        },
        styleUrl: '',
        beadUrl: '',
        patternUrl: ''
      };
      recordsByImage.set(image, record);
      modifiedRecords.add(record);
    }
    record.styleUrl = state.styleUrl;
    record.beadUrl = state.beadUrl;
    record.patternUrl = generatedUrl;
    record.original.sources.forEach(({ node }) => node.removeAttribute('srcset'));
    image.removeAttribute('srcset');
    image.removeAttribute('sizes');
    image.src = generatedUrl;
    image.dataset.YuzePerlerBeadGenerated = 'true';
    return record;
  }

  function restoreRecord() {
    const image = state.lastResult?.record?.image || state.activeImage;
    const record = recordsByImage.get(image);
    if (!record || !image) {
      showToast('当前没有可恢复的网页图片');
      return;
    }
    if (record.original.src) image.setAttribute('src', record.original.src); else image.removeAttribute('src');
    if (record.original.srcset) image.setAttribute('srcset', record.original.srcset); else image.removeAttribute('srcset');
    if (record.original.sizes) image.setAttribute('sizes', record.original.sizes); else image.removeAttribute('sizes');
    record.original.sources.forEach(({ node, srcset, sizes }) => {
      if (srcset) node.setAttribute('srcset', srcset); else node.removeAttribute('srcset');
      if (sizes) node.setAttribute('sizes', sizes); else node.removeAttribute('sizes');
    });
    delete image.dataset.YuzePerlerBeadGenerated;
    refs.resultBackdrop.hidden = true;
    showToast('已恢复原图');
  }

  async function generate() {
    if (state.busy || !hasTarget()) return;
    const style = getSelectedStyle();
    const aspectRatio = getAspectRatio(state.activeImage);
    const sourceUrl = state.sourceUrl;
    const activeImage = state.activeImage;
    const calls = [];
    closeSurface();

    try {
      if (!config.mockBridge && (!window.LLMBridge || typeof window.LLMBridge.generateImage !== 'function')) {
        throw new Error('当前页面未检测到 LLMBridge.generateImage');
      }
      if (style) {
        setPhase('style', `第 1/3 步 · 正在生成“${style.name}”风格图`);
        showToast(`第 1/3 步：正在生成“${style.name}”风格图…`, 3000);
      } else {
        setPhase('bead', `第 1/2 步 · 正在直接生成 ${state.paletteSize} 色白底拼豆图`);
        showToast(`正在从原图直接生成 ${state.paletteSize} 色白底拼豆图…`, 3000);
      }

      const sourceReference = await prepareReference(sourceUrl);
      let styleUrl = '';
      let styleImageUrl = '';
      let beadReference = sourceReference;

      if (style) {
        const reference = addStyleReference(sourceReference, style);
        const stylePrompt = buildStylePrompt(style);
        const styleOptions = Object.assign({}, reference, {
          aspect_ratio: aspectRatio,
          output_format: 'png',
          response_format: 'b64_json',
          sequential_image_generation: 'disabled',
          optimize_prompt_mode: 'pro',
          watermark: false
        });
        calls.push({ stage: 'style', prompt: stylePrompt, options: styleOptions });

        if (config.mockBridge) {
          styleUrl = await createMockImage(sourceUrl, style.name, false);
        } else {
          const styleImage = await generateImageWithProFallback(stylePrompt, styleOptions);
          styleUrl = styleImage.dataUrl;
          styleImageUrl = styleImage.imageUrl;
        }
        beadReference = { reference_image_base64: styleUrl };
        setPhase('bead', `第 2/3 步 · 正在生成 ${state.paletteSize} 色白底拼豆图`);
        showToast(`第 2/3 步：正在生成 ${state.paletteSize} 色白底拼豆图…`, 3000);
      }
      state.styleUrl = styleUrl;

      const beadPrompt = buildBeadPrompt(style, state.paletteSize, state.gridSize);
      const beadOptions = Object.assign({}, beadReference, {
        aspect_ratio: aspectRatio,
        output_format: 'png',
        response_format: 'b64_json',
        sequential_image_generation: 'disabled',
        optimize_prompt_mode: 'pro',
        watermark: false
      });
      calls.push({ stage: 'bead', prompt: beadPrompt, options: beadOptions });

      let beadUrl = '';
      let beadImageUrl = '';
      if (config.mockBridge) {
        beadUrl = await createMockImage(styleUrl || sourceUrl, `MOCK · ${state.paletteSize} 色拼豆`, true);
      } else {
        const beadImage = await generateImageWithProFallback(beadPrompt, beadOptions);
        beadUrl = beadImage.dataUrl;
        beadImageUrl = beadImage.imageUrl;
      }
      state.beadUrl = beadUrl;

      const patternStep = style ? '第 3/3 步' : '第 2/2 步';
      setPhase('pattern', `${patternStep} · 正在用代码生成 MARD 色号图纸`);
      showToast(`${patternStep}：正在进行 CIEDE2000 配色与色号统计…`, 3200);
      const pattern = await createMardPattern(beadUrl, state.paletteSize, state.gridSize);
      state.patternUrl = pattern.url;
      state.patternMeta = pattern;

      let record = null;
      if (activeImage?.isConnected) record = applyGeneratedImage(activeImage, pattern.url);
      state.lastResult = {
        originalUrl: sourceUrl,
        styleUrl,
        styleImageUrl,
        beadUrl,
        beadImageUrl,
        patternUrl: pattern.url,
        patternMeta: pattern,
        styleId: style?.id || '',
        styleName: style?.name || '原图',
        paletteSize: state.paletteSize,
        gridSize: state.gridSize,
        aspectRatio,
        adjustments: [],
        heatEffects: {
          frontUrl: '',
          frontImageUrl: '',
          backUrl: '',
          backImageUrl: ''
        },
        record,
        createdAt: Date.now()
      };
      window.__YuzePerlerBeadGeneratorLastCalls = calls;
      setPhase('success', '拼豆色号图纸已生成');
      showResult();
      showToast(`色号图纸生成完成：${pattern.colors.length} 种颜色，共 ${pattern.total} 颗`);
      window.setTimeout(() => {
        if (state.phase === 'success') setPhase('idle');
      }, 2800);
    } catch (error) {
      console.error('[Yuze] 拼豆图生成失败:', error);
      window.__YuzePerlerBeadGeneratorLastCalls = calls;
      setPhase('error', '', error instanceof Error ? error : new Error(String(error)));
      showToast(error?.message || '拼豆图生成失败', 3600);
      window.setTimeout(showComposer, 160);
    }
  }

  function renderAdjustmentMode() {
    shadow.querySelectorAll('[data-adjust-mode]').forEach((button) => {
      const selected = button.dataset.adjustMode === state.adjustMode;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    const creative = state.adjustMode === 'creative';
    refs.adjustModeHint.textContent = creative
      ? '适合增加新动作、配饰、表情或局部设计；仍保持主体身份和拼豆规则。'
      : '适合修复五官、姿态、配饰、轮廓或颜色与原图不一致的问题。';
    refs.adjustPrompt.placeholder = creative
      ? '例如：让角色左手拿一束花，表情更开心；其他造型和配色保持不变。'
      : '例如：眼睛更接近原图，保留手里的毛笔；减少身体内部的黑色描边。';
  }

  function showAdjustmentDialog() {
    const result = state.lastResult;
    if (!result || state.busy) return;
    refs.adjustOriginalPreview.src = result.originalUrl;
    refs.adjustCurrentPreview.src = result.beadUrl;
    refs.adjustPrompt.value = '';
    refs.adjustmentBackdrop.hidden = false;
    renderAdjustmentMode();
    window.setTimeout(() => refs.adjustPrompt.focus(), 0);
  }

  function closeAdjustmentDialog() {
    refs.adjustmentBackdrop.hidden = true;
  }

  async function adjustGeneratedBead() {
    const result = state.lastResult;
    const instruction = refs.adjustPrompt.value.trim();
    if (!result || state.busy) return;
    if (!instruction) {
      showToast('请先输入希望调整的内容');
      refs.adjustPrompt.focus();
      return;
    }

    const mode = state.adjustMode;
    const submitLabel = refs.adjustSubmit.querySelector('span');
    refs.adjustSubmit.disabled = true;
    submitLabel.textContent = '正在调整…';

    try {
      setPhase('bead', '正在结合原图和当前拼豆图进行 Prompt 调整');
      const [originalReference, currentReference] = await Promise.all([
        prepareReference(result.originalUrl),
        prepareReference(result.beadUrl)
      ]);
      const references = mergeImageReferences(originalReference, currentReference);
      const prompt = buildAdjustmentPrompt(result, instruction, mode);
      const options = Object.assign({}, references, {
        aspect_ratio: result.aspectRatio || '1:1',
        output_format: 'png',
        response_format: 'b64_json',
        sequential_image_generation: 'disabled',
        optimize_prompt_mode: 'pro',
        watermark: false
      });
      const calls = Array.isArray(window.__YuzePerlerBeadGeneratorLastCalls)
        ? window.__YuzePerlerBeadGeneratorLastCalls.slice()
        : [];
      calls.push({ stage: 'adjust-bead', mode, prompt, options });
      window.__YuzePerlerBeadGeneratorLastCalls = calls;

      const adjustedImage = config.mockBridge
        ? {
          dataUrl: await createMockImage(result.beadUrl, `MOCK · ${mode === 'creative' ? '创意调整' : '修正转换'}`, true),
          imageUrl: ''
        }
        : await generateImageWithProFallback(prompt, options);

      setPhase('pattern', `调整完成，正在重算 ${result.patternMeta.width}×${result.patternMeta.height} 色号图纸`);
      const pattern = await createMardPattern(
        adjustedImage.dataUrl,
        result.paletteSize,
        result.patternMeta.width
      );

      state.beadUrl = adjustedImage.dataUrl;
      state.patternUrl = pattern.url;
      state.patternMeta = pattern;
      result.beadUrl = adjustedImage.dataUrl;
      result.beadImageUrl = adjustedImage.imageUrl;
      result.heatEffects = {
        frontUrl: '',
        frontImageUrl: '',
        backUrl: '',
        backImageUrl: ''
      };
      result.patternUrl = pattern.url;
      result.patternMeta = pattern;
      result.adjustments = Array.isArray(result.adjustments) ? result.adjustments : [];
      result.adjustments.push({
        mode,
        prompt: instruction,
        imageUrl: adjustedImage.imageUrl,
        createdAt: Date.now()
      });
      result.createdAt = Date.now();

      if (result.record) {
        result.record.beadUrl = adjustedImage.dataUrl;
        result.record.patternUrl = pattern.url;
        if (result.record.image?.isConnected) result.record.image.src = pattern.url;
      }

      closeAdjustmentDialog();
      setPhase('success', 'Prompt 调整和色号图纸重算完成');
      showResult();
      showToast(`调整完成，已重算 ${pattern.width}×${pattern.height} 色号图纸`);
      window.setTimeout(() => {
        if (state.phase === 'success') setPhase('idle');
      }, 2600);
    } catch (error) {
      setPhase('error', '', error instanceof Error ? error : new Error(String(error)));
      showToast(error?.message || 'Prompt 调整失败', 3600);
    } finally {
      refs.adjustSubmit.disabled = false;
      submitLabel.textContent = '生成调整版本';
    }
  }

  async function generateHeatEffects() {
    const result = state.lastResult;
    if (!result || state.busy || !result.beadUrl) return;
    result.heatEffects = {
      frontUrl: '',
      frontImageUrl: '',
      backUrl: '',
      backImageUrl: ''
    };

    try {
      setPhase('effect', '第 1/2 步 · 正在生成烫后正面效果');
      showResult();
      showToast('正在以当前 AI 拼豆图生成写实烫后正面…', 2800);
      const reference = await prepareReference(result.beadUrl);
      const baseOptions = Object.assign({}, mergeImageReferences(reference), {
        aspect_ratio: result.aspectRatio || '1:1',
        output_format: 'png',
        response_format: 'b64_json',
        sequential_image_generation: 'disabled',
        optimize_prompt_mode: 'pro',
        watermark: false
      });
      const calls = Array.isArray(window.__YuzePerlerBeadGeneratorLastCalls)
        ? window.__YuzePerlerBeadGeneratorLastCalls.slice()
        : [];

      const frontPrompt = buildHeatEffectPrompt(result, 'front');
      const frontOptions = Object.assign({}, baseOptions);
      calls.push({ stage: 'heat-effect-front', prompt: frontPrompt, options: frontOptions });
      window.__YuzePerlerBeadGeneratorLastCalls = calls;
      const frontImage = config.mockBridge
        ? {
          dataUrl: await createMockImage(result.beadUrl, 'MOCK · 烫后正面', false),
          imageUrl: ''
        }
        : await generateImageWithProFallback(frontPrompt, frontOptions);
      result.heatEffects.frontUrl = frontImage.dataUrl;
      result.heatEffects.frontImageUrl = frontImage.imageUrl;
      result.createdAt = Date.now();

      setPhase('effect', '第 2/2 步 · 正在生成烫后反面效果');
      showResult();
      showToast('正面已完成，正在生成带热压熔融纹理的反面…', 2800);
      const backPrompt = buildHeatEffectPrompt(result, 'back');
      const backOptions = Object.assign({}, baseOptions);
      calls.push({ stage: 'heat-effect-back', prompt: backPrompt, options: backOptions });
      window.__YuzePerlerBeadGeneratorLastCalls = calls;
      const backImage = config.mockBridge
        ? {
          dataUrl: await createMockImage(result.beadUrl, 'MOCK · 烫后反面', false),
          imageUrl: ''
        }
        : await generateImageWithProFallback(backPrompt, backOptions);
      result.heatEffects.backUrl = backImage.dataUrl;
      result.heatEffects.backImageUrl = backImage.imageUrl;
      result.createdAt = Date.now();

      setPhase('success', '烫后正反面效果已生成');
      showResult();
      showToast('烫后正面与反面效果生成完成');
      window.setTimeout(() => {
        if (state.phase === 'success') setPhase('idle');
      }, 2600);
    } catch (error) {
      setPhase('error', '', error instanceof Error ? error : new Error(String(error)));
      showResult();
      showToast(error?.message || '烫后效果生成失败', 3600);
    }
  }

  async function resizeGeneratedPattern(requestedGridSize) {
    const result = state.lastResult;
    if (!result || state.busy) return;
    const nextGridSize = normalizeGridSize(requestedGridSize, result.patternMeta?.width || state.gridSize);
    if (nextGridSize === result.patternMeta?.width) return;
    const previousGridSize = state.gridSize;
    state.gridSize = nextGridSize;

    try {
      setPhase('pattern', `正在切换为 ${nextGridSize}×${nextGridSize} 图纸，不会重新生图`);
      showResult();
      showToast(`正在复用 AI 拼豆图生成 ${nextGridSize}×${nextGridSize} 色号图纸…`, 2600);
      const pattern = await createMardPattern(result.beadUrl, result.paletteSize, nextGridSize);
      state.patternUrl = pattern.url;
      state.patternMeta = pattern;
      result.gridSize = nextGridSize;
      result.patternUrl = pattern.url;
      result.patternMeta = pattern;
      result.createdAt = Date.now();

      if (result.record) {
        result.record.patternUrl = pattern.url;
        if (result.record.image?.isConnected) result.record.image.src = pattern.url;
      }

      setPhase('success', `已切换为 ${nextGridSize}×${nextGridSize} 图纸`);
      showResult();
      showToast(`尺寸切换完成：${nextGridSize}×${nextGridSize}，共 ${pattern.total} 颗豆子`);
      window.setTimeout(() => {
        if (state.phase === 'success') setPhase('idle');
      }, 2400);
    } catch (error) {
      state.gridSize = previousGridSize;
      setPhase('error', '', error instanceof Error ? error : new Error(String(error)));
      showResult();
      showToast(error?.message || '切换图纸尺寸失败', 3200);
    }
  }

  function showResult() {
    const result = state.lastResult;
    if (!result) return;
    refs.resultGrid.innerHTML = `
      ${resultCard('原图', '主体来源', result.originalUrl)}
      ${result.styleUrl ? resultCard('风格图', result.styleName, result.styleUrl) : ''}
      ${resultCard(
        'AI 拼豆图',
        `${result.paletteSize} 色 · 白色背景${result.adjustments?.length ? ` · 已调整 ${result.adjustments.length} 次` : ''}`,
        result.beadUrl,
        `<button class="result-card-action" type="button" data-action="open-adjustment" ${state.busy ? 'disabled' : ''}>Prompt 调整</button>`
      )}
      ${result.heatEffects?.frontUrl ? resultCard(
        '烫后正面效果',
        '单层平片 · 规则豆粒 · 均匀薄边',
        result.heatEffects.frontUrl,
        '<button class="result-card-action" type="button" data-action="download-heat-effect" data-side="front">下载</button>'
      ) : ''}
      ${result.heatEffects?.backUrl ? resultCard(
        '烫后反面效果',
        '连续熔融膜 · 烫纸压纹 · 轻微褶皱',
        result.heatEffects.backUrl,
        '<button class="result-card-action" type="button" data-action="download-heat-effect" data-side="back">下载</button>'
      ) : ''}
      ${resultCard('MARD 色号图纸', `${result.patternMeta.width}×${result.patternMeta.height} · ${result.patternMeta.colors.length} 种颜色`, result.patternUrl)}
    `;
    refs.resultMeta.textContent = result.record
      ? `${result.styleName} · MARD ${result.paletteSize} 色 · ${result.patternMeta.total} 颗 · 已替换为色号图纸`
      : `${result.styleName} · MARD ${result.paletteSize} 色 · ${result.patternMeta.total} 颗 · 本地图片色号图纸`;
    refs.resultSizeTabs.innerHTML = renderGridSizeOptions(result.patternMeta.width, 'resize-pattern');
    const hasBothHeatEffects = Boolean(result.heatEffects?.frontUrl && result.heatEffects?.backUrl);
    refs.heatEffectButton.disabled = state.busy;
    refs.heatEffectButton.querySelector('span').textContent = state.phase === 'effect'
      ? '正在生成烫后效果…'
      : hasBothHeatEffects
        ? '重新生成烫后正反面'
        : '生成烫后正反面效果';
    refs.resultBackdrop.hidden = false;
    togglePanel(false);
  }

  function resultCard(title, meta, url, action = '') {
    return `
      <article class="result-card">
        <header>
          <div><strong>${escapeHtml(title)}</strong><span>${escapeHtml(meta)}</span></div>
          ${action}
        </header>
        <div class="result-image-wrap"><img src="${escapeHtml(url)}" alt="${escapeHtml(title)}"></div>
      </article>
    `;
  }

  function download(url, name) {
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.target = '_blank';
    link.rel = 'noopener';
    document.documentElement.appendChild(link);
    link.click();
    link.remove();
  }

  function showToast(message, duration = 2200) {
    window.clearTimeout(toastTimer);
    refs.toast.textContent = String(message || '');
    refs.toast.hidden = false;
    toastTimer = window.setTimeout(() => { refs.toast.hidden = true; }, duration);
  }

  async function handleUpload(event) {
    const input = event.target;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!file.type?.startsWith('image/')) {
      showToast('请选择有效图片文件');
      return;
    }
    if (file.size > config.maxUploadMB * 1024 * 1024) {
      showToast(`图片不能超过 ${config.maxUploadMB}MB`);
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      const image = await loadImage(dataUrl);
      image.alt = file.name.replace(/\.[^.]+$/, '') || '上传图片';
      selectTarget({
        image,
        card: null,
        source: dataUrl,
        title: image.alt
      }, innerWidth - 28, Math.max(90, innerHeight - 170));
      togglePanel(false);
      showComposer();
    } catch (error) {
      showToast(error?.message || '读取图片失败');
    }
  }

  function handleContextMenu(event) {
    if (!state.enabled || state.busy || event.shiftKey) return;
    const target = resolveTarget(event);
    if (!target) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    togglePanel(false);
    selectTarget(target, event.clientX, event.clientY);
    showContextMenu(event.clientX, event.clientY);
  }

  function handleShadowClick(event) {
    if (event.target === refs.adjustmentBackdrop) {
      closeAdjustmentDialog();
      return;
    }
    if (event.target === refs.resultBackdrop) {
      refs.resultBackdrop.hidden = true;
      return;
    }
    const node = event.target.closest('[data-action]');
    if (!node) return;
    const action = node.dataset.action;
    event.preventDefault();
    event.stopPropagation();

    if (action === 'toggle-panel') togglePanel();
    else if (action === 'close-panel') togglePanel(false);
    else if (action === 'toggle-enabled') {
      state.enabled = !state.enabled;
      if (!state.enabled) closeSurface();
      setPhase('idle');
    } else if (action === 'upload') refs.uploadInput.click();
    else if (action === 'open-composer') showComposer();
    else if (action === 'close-surface') closeSurface();
    else if (action === 'select-style') {
      state.styleId = node.dataset.styleId || '';
      showComposer();
    } else if (action === 'select-palette') {
      state.paletteSize = Number(node.dataset.palette) === 291 ? 291 : 221;
      showComposer();
    } else if (action === 'select-grid-size') {
      state.gridSize = normalizeGridSize(node.dataset.gridSize, state.gridSize);
      showComposer();
    } else if (action === 'resize-pattern') {
      resizeGeneratedPattern(node.dataset.gridSize);
    } else if (action === 'open-adjustment') {
      showAdjustmentDialog();
    } else if (action === 'close-adjustment') {
      closeAdjustmentDialog();
    } else if (action === 'select-adjust-mode') {
      state.adjustMode = node.dataset.adjustMode === 'creative' ? 'creative' : 'repair';
      renderAdjustmentMode();
    } else if (action === 'submit-adjustment') {
      adjustGeneratedBead();
    } else if (action === 'generate-heat-effects') {
      generateHeatEffects();
    } else if (action === 'download-heat-effect') {
      const side = node.dataset.side === 'back' ? 'back' : 'front';
      const effectUrl = state.lastResult?.heatEffects?.[`${side}Url`];
      download(effectUrl, `拼豆烫后${side === 'back' ? '反面' : '正面'}效果.png`);
    } else if (action === 'generate') generate();
    else if (action === 'show-result') showResult();
    else if (action === 'close-result') {
      closeAdjustmentDialog();
      refs.resultBackdrop.hidden = true;
    }
    else if (action === 'restore') restoreRecord();
    else if (action === 'download-pattern') {
      const result = state.lastResult;
      download(
        result?.patternUrl,
        `MARD拼豆色号图纸-${result?.patternMeta?.width || state.gridSize}x${result?.patternMeta?.height || state.gridSize}-${result?.paletteSize || state.paletteSize}色.png`
      );
    }
  }

  function handleDocumentPointerDown(event) {
    if (!state.surface || event.composedPath().includes(host)) return;
    closeSurface();
  }

  function handleKeydown(event) {
    if (event.key === 'Escape') {
      if (!refs.adjustmentBackdrop.hidden) closeAdjustmentDialog();
      else if (!refs.resultBackdrop.hidden) refs.resultBackdrop.hidden = true;
      else if (state.surface) closeSurface();
      else if (state.panelOpen) togglePanel(false);
      return;
    }
    if (state.surface === 'context' && event.key === 'Enter') {
      event.preventDefault();
      showComposer();
    }
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && !refs.adjustmentBackdrop.hidden) {
      event.preventDefault();
      adjustGeneratedBead();
    } else if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && state.surface === 'composer') {
      event.preventDefault();
      generate();
    }
  }

  function cleanup() {
    if (state.destroyed) return;
    state.destroyed = true;
    disposers.splice(0).forEach((dispose) => {
      try { dispose(); } catch (_) { /* noop */ }
    });
    window.clearTimeout(toastTimer);
    modifiedRecords.forEach((record) => {
      const image = record.image;
      if (!image?.isConnected) return;
      if (record.original.src) image.setAttribute('src', record.original.src); else image.removeAttribute('src');
      if (record.original.srcset) image.setAttribute('srcset', record.original.srcset); else image.removeAttribute('srcset');
      if (record.original.sizes) image.setAttribute('sizes', record.original.sizes); else image.removeAttribute('sizes');
      record.original.sources.forEach(({ node, srcset, sizes }) => {
        if (!node.isConnected) return;
        if (srcset) node.setAttribute('srcset', srcset); else node.removeAttribute('srcset');
        if (sizes) node.setAttribute('sizes', sizes); else node.removeAttribute('sizes');
      });
      delete image.dataset.YuzePerlerBeadGenerated;
    });
    host.remove();
    if (window[INSTANCE_KEY]?.cleanup === cleanup) delete window[INSTANCE_KEY];
  }

  on(document, 'contextmenu', handleContextMenu, true);
  on(document, 'pointerdown', handleDocumentPointerDown, true);
  on(document, 'keydown', handleKeydown, true);
  on(document, 'scroll', () => {
    if (state.surface) closeSurface();
    updateSelection();
  }, true);
  on(window, 'resize', () => {
    updateSelection();
    if (state.surface) positionSurface(state.anchorX, state.anchorY, state.surface === 'composer' ? 404 : 202);
  }, { passive: true });
  on(window, 'blur', () => {
    if (state.surface) closeSurface();
  });
  on(shadow, 'click', handleShadowClick);
  on(refs.uploadInput, 'change', handleUpload);

  renderPanel();
  setPhase('idle');
  window[INSTANCE_KEY] = {
    version: VERSION,
    cleanup,
    getState: () => ({
      enabled: state.enabled,
      phase: state.phase,
      styleId: state.styleId,
      paletteSize: state.paletteSize,
      patternGridSize: state.gridSize,
      patternGridSizes: GRID_SIZES.slice(),
      busy: state.busy,
      hasResult: Boolean(state.lastResult),
      adjustmentCount: state.lastResult?.adjustments?.length || 0,
      hasHeatEffects: Boolean(state.lastResult?.heatEffects?.frontUrl && state.lastResult?.heatEffects?.backUrl),
      patternColors: state.lastResult?.patternMeta?.colors?.length || 0
    }),
    styles: STYLES.map((style) => Object.assign({}, style)),
    paletteCounts: { basic: MARD_PALETTE_221.length, extended: MARD_PALETTE_291.length },
    createPatternFromImage: createMardPattern
  };
})();