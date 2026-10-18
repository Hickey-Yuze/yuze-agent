(async (args) => {
  "use strict";

  const PANEL_ID = "tabbit-bilibili-ai-subtitle-direct-panel";
  const VERSION = "V4.2";
  const API_ROOT = "https://api.bilibili.com";
  const AI_SUBTITLE_HOST = "aisubtitle.hdslb.com";

  function formatTime(seconds) {
    const value = Math.max(0, Math.floor(Number(seconds) || 0));
    const hours = Math.floor(value / 3600);
    const minutes = Math.floor((value % 3600) / 60);
    const secs = value % 60;

    if (hours > 0) {
      return [
        String(hours).padStart(2, "0"),
        String(minutes).padStart(2, "0"),
        String(secs).padStart(2, "0")
      ].join(":");
    }

    return [
      String(minutes).padStart(2, "0"),
      String(secs).padStart(2, "0")
    ].join(":");
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalizeUrl(value) {
    const url = String(value || "").trim();
    if (!url) return "";
    if (url.startsWith("//")) return `https:${url}`;
    return url;
  }

  async function fetchWithTimeout(
    url,
    options = {},
    timeoutMs = 10000
  ) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fetch(url, {
        ...options,
        cache: "no-store",
        signal: controller.signal
      });
    } catch (error) {
      if (error?.name === "AbortError") {
        throw new Error(
          `请求超时（${Math.ceil(timeoutMs / 1000)}秒）：${url}`
        );
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  function safeInitialState() {
    try {
      return window.__INITIAL_STATE__ || {};
    } catch (error) {
      return {};
    }
  }

  function getBvid() {
    const pathnameValue =
      location.pathname.match(/BV[a-zA-Z0-9]+/)?.[0] || "";
    if (pathnameValue) return pathnameValue;

    const state = safeInitialState();
    return (
      state.bvid ||
      state.videoData?.bvid ||
      state.videoInfo?.bvid ||
      ""
    );
  }

  function getCurrentPlayerCid() {
    try {
      const cid = window.player?.getCid?.();
      if (cid) return String(cid);
    } catch (error) {}

    try {
      const cid = window.bilibiliPlayer?.getCid?.();
      if (cid) return String(cid);
    } catch (error) {}

    return "";
  }

  function findLoadedAiSubtitleUrl() {
    try {
      const entries = performance.getEntriesByType("resource");
      const matches = entries
        .map(entry => String(entry.name || ""))
        .filter(url =>
          url.includes(`${AI_SUBTITLE_HOST}/bfs/ai_subtitle/`)
        );

      return matches.length
        ? normalizeUrl(matches[matches.length - 1])
        : "";
    } catch (error) {
      return "";
    }
  }

  function scoreTrack(track) {
    const lan = String(track?.lan || "").toLowerCase();
    const lanDoc = String(track?.lan_doc || "").toLowerCase();
    const url = normalizeUrl(
      track?.subtitle_url || track?.subtitleUrl
    ).toLowerCase();
    const combined = `${lan} ${lanDoc}`;
    let score = 0;

    if (/^ai[-_]?zh/.test(lan)) score += 100;
    if (lan.includes("zh")) score += 40;
    if (/中文|汉语/.test(lanDoc)) score += 40;
    if (/ai|自动|智能/.test(combined)) score += 30;
    if (url.includes("/ai_subtitle/")) score += 50;
    if (url.includes(AI_SUBTITLE_HOST)) score += 30;
    if (normalizeUrl(track?.subtitle_url || track?.subtitleUrl)) {
      score += 10;
    }

    return score;
  }

  function chooseChineseAiTrack(tracks) {
    if (!Array.isArray(tracks) || !tracks.length) return null;

    const ranked = tracks
      .map(track => ({
        track,
        score: scoreTrack(track)
      }))
      .sort((a, b) => b.score - a.score);

    if (!ranked.length || ranked[0].score < 40) return null;
    return ranked[0].track;
  }

  function createBasePanel() {
    document.getElementById(PANEL_ID)?.remove();

    const panel = document.createElement("div");
    panel.id = PANEL_ID;
    panel.style.cssText = [
      "position:fixed",
      "top:70px",
      "right:20px",
      "width:540px",
      "max-width:calc(100vw - 40px)",
      "max-height:80vh",
      "z-index:2147483647",
      "background:#fff",
      "border:1px solid #d9d9d9",
      "border-radius:12px",
      "box-shadow:0 10px 36px rgba(0,0,0,.22)",
      "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif",
      "overflow:hidden"
    ].join(";");

    panel.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:#00aeec;color:#fff;">
        <strong>B站AI字幕接口提取 ${VERSION}</strong>
        <button data-action="close" style="border:0;background:rgba(255,255,255,.22);color:#fff;border-radius:50%;width:30px;height:30px;cursor:pointer;font-size:18px;">×</button>
      </div>
      <div data-role="body" style="padding:16px;overflow:auto;max-height:calc(80vh - 58px);">
        <div data-role="status" style="padding:12px;background:#e6f7ff;border:1px solid #91d5ff;border-radius:8px;color:#0050b3;line-height:1.7;">
          正在识别当前视频和分P……
        </div>
      </div>
    `;

    document.body.appendChild(panel);
    panel
      .querySelector('[data-action="close"]')
      .addEventListener("click", () => panel.remove());

    return panel;
  }

  function updateStatus(panel, text) {
    const status = panel.querySelector('[data-role="status"]');
    if (status) status.textContent = text;
  }

  function showError(panel, error) {
    const body = panel.querySelector('[data-role="body"]');
    if (!body) return;

    body.innerHTML = `
      <div style="padding:12px;background:#fff2f0;border:1px solid #ffccc7;border-radius:8px;color:#a8071a;line-height:1.7;">
        <strong>提取失败</strong>
        <div style="margin-top:6px;">${escapeHtml(error.message)}</div>
      </div>
      <pre style="margin-top:12px;padding:10px;background:#fafafa;border:1px solid #eee;border-radius:8px;white-space:pre-wrap;word-break:break-all;font-size:12px;line-height:1.6;">${escapeHtml(
        JSON.stringify(error, null, 2)
      )}</pre>
    `;
  }

  function showSuccess(panel, result) {
    const body = panel.querySelector('[data-role="body"]');
    if (!body) return;

    body.innerHTML = `
      <div style="padding:10px;background:#f6ffed;border:1px solid #b7eb8f;border-radius:8px;color:#237804;font-size:13px;line-height:1.7;">
        <div><strong>标题：</strong>${escapeHtml(result.title)}</div>
        <div><strong>分P：</strong>${escapeHtml(
          result.partTitle || `第${result.page}P`
        )}</div>
        <div><strong>字幕轨道：</strong>${escapeHtml(
          result.trackName || result.trackLanguage || "中文AI"
        )}</div>
        <div><strong>字幕数量：</strong>${result.count}条，${result.charCount}字</div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin:12px 0 10px;">
        <button data-action="plain" style="padding:7px 12px;border:1px solid #00aeec;background:#e6f7ff;color:#008ac5;border-radius:6px;cursor:pointer;">纯文本</button>
        <button data-action="timestamp" style="padding:7px 12px;border:1px solid #d9d9d9;background:#fff;color:#333;border-radius:6px;cursor:pointer;">带时间戳</button>
        <button data-action="copy" style="padding:7px 12px;border:1px solid #00aeec;background:#00aeec;color:#fff;border-radius:6px;cursor:pointer;">复制全文</button>
        <button data-action="download" style="padding:7px 12px;border:1px solid #d9d9d9;background:#fff;color:#333;border-radius:6px;cursor:pointer;">下载TXT</button>
      </div>
      <textarea data-role="text" readonly style="box-sizing:border-box;width:100%;height:350px;resize:vertical;padding:12px;border:1px solid #d9d9d9;border-radius:8px;font-size:13px;line-height:1.7;font-family:inherit;"></textarea>
    `;

    const textarea = body.querySelector('[data-role="text"]');
    const plainButton = body.querySelector('[data-action="plain"]');
    const timestampButton = body.querySelector(
      '[data-action="timestamp"]'
    );
    const copyButton = body.querySelector('[data-action="copy"]');
    let mode = "plain";

    textarea.value = result.plainText;

    plainButton.addEventListener("click", () => {
      mode = "plain";
      textarea.value = result.plainText;
      plainButton.style.background = "#e6f7ff";
      plainButton.style.borderColor = "#00aeec";
      timestampButton.style.background = "#fff";
      timestampButton.style.borderColor = "#d9d9d9";
    });

    timestampButton.addEventListener("click", () => {
      mode = "timestamp";
      textarea.value = result.timestampText;
      timestampButton.style.background = "#e6f7ff";
      timestampButton.style.borderColor = "#00aeec";
      plainButton.style.background = "#fff";
      plainButton.style.borderColor = "#d9d9d9";
    });

    copyButton.addEventListener("click", async () => {
      const text =
        mode === "plain"
          ? result.plainText
          : result.timestampText;

      try {
        await navigator.clipboard.writeText(text);
      } catch (error) {
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
      }

      const oldText = copyButton.textContent;
      copyButton.textContent = "已复制";
      setTimeout(() => {
        copyButton.textContent = oldText;
      }, 1500);
    });

    body
      .querySelector('[data-action="download"]')
      .addEventListener("click", () => {
        const text =
          mode === "plain"
            ? result.plainText
            : result.timestampText;
        const blob = new Blob([text], {
          type: "text/plain;charset=utf-8"
        });
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const safeTitle = result.title.replace(/[\\/:*?"<>|]/g, "_");
        link.href = objectUrl;
        link.download = `${safeTitle}-AI字幕.txt`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      });
  }

  function buildError(type, message, details = {}) {
    return {
      ok: false,
      errorType: type,
      message,
      ...details
    };
  }

  let panel = null;

  try {
    panel = createBasePanel();

    if (!/(^|\.)bilibili\.com$/i.test(location.hostname)) {
      const error = buildError(
        "NOT_BILIBILI_PAGE",
        "当前不是B站视频播放页面"
      );
      showError(panel, error);
      return error;
    }

    const bvid = getBvid();
    if (!bvid) {
      const error = buildError(
        "BVID_NOT_FOUND",
        "未能从当前页面取得BV号"
      );
      showError(panel, error);
      return error;
    }

    const pageNumber = Math.max(
      1,
      Number(new URL(location.href).searchParams.get("p") || 1)
    );

    updateStatus(panel, "正在取得当前视频和分P信息……");

    const viewResponse = await fetchWithTimeout(
      `${API_ROOT}/x/web-interface/view?bvid=${encodeURIComponent(
        bvid
      )}`,
      {
        method: "GET",
        credentials: "include",
        headers: {
          accept: "application/json, text/plain, */*"
        }
      },
      10000
    );

    const viewJson = await viewResponse.json();

    if (viewJson?.code !== 0 || !viewJson?.data) {
      const error = buildError(
        "VIEW_API_ERROR",
        `视频信息接口返回错误：${
          viewJson?.message || viewJson?.code
        }`,
        {
          bvid,
          apiCode: viewJson?.code,
          apiMessage: viewJson?.message,
          httpStatus: viewResponse.status
        }
      );
      showError(panel, error);
      return error;
    }

    const pages = Array.isArray(viewJson.data.pages)
      ? viewJson.data.pages
      : [];
    const playerCid = getCurrentPlayerCid();
    let currentPage =
      pages.find(page => String(page.cid) === playerCid) ||
      pages[pageNumber - 1] ||
      null;
    const cid = String(playerCid || currentPage?.cid || "");

    if (!cid) {
      const error = buildError(
        "CID_NOT_FOUND",
        `未找到当前第${pageNumber}P对应的CID`,
        {
          bvid,
          pageNumber,
          pageCount: pages.length
        }
      );
      showError(panel, error);
      return error;
    }

    if (!currentPage) {
      currentPage =
        pages.find(page => String(page.cid) === cid) || null;
    }

    updateStatus(panel, "正在调用播放器字幕轨道接口……");

    const aid = viewJson.data.aid;
    const querySets = [
      `bvid=${encodeURIComponent(bvid)}&cid=${encodeURIComponent(
        cid
      )}`,
      aid
        ? `aid=${encodeURIComponent(aid)}&cid=${encodeURIComponent(
            cid
          )}`
        : ""
    ].filter(Boolean);
    const endpoints = [
      "/x/player/wbi/v2",
      "/x/player/v2"
    ];
    const attempts = [];
    let playerJson = null;
    let playerApiUsed = "";

    playerApiLoop: for (const endpoint of endpoints) {
      for (const query of querySets) {
        const apiUrl = `${API_ROOT}${endpoint}?${query}`;

        try {
          const response = await fetchWithTimeout(apiUrl, {
            method: "GET",
            credentials: "include",
            headers: {
              accept: "application/json, text/plain, */*"
            }
          }, 10000);
          const json = await response.json();

          attempts.push({
            apiUrl,
            httpStatus: response.status,
            code: json?.code,
            message: json?.message,
            needLoginSubtitle: Boolean(
              json?.data?.need_login_subtitle
            ),
            trackCount:
              json?.data?.subtitle?.subtitles?.length || 0
          });

          if (
            json?.code === 0 &&
            json?.data?.need_login_subtitle
          ) {
            break playerApiLoop;
          }

          if (
            json?.code === 0 &&
            Array.isArray(json?.data?.subtitle?.subtitles) &&
            json.data.subtitle.subtitles.length
          ) {
            playerJson = json;
            playerApiUsed = apiUrl;
            break;
          }
        } catch (requestError) {
          attempts.push({
            apiUrl,
            message: requestError.message
          });
        }
      }

      if (playerJson) break;
    }

    let tracks = Array.isArray(
      playerJson?.data?.subtitle?.subtitles
    )
      ? playerJson.data.subtitle.subtitles
      : [];
    let subtitleUrl = "";
    let track = chooseChineseAiTrack(tracks);

    if (track) {
      subtitleUrl = normalizeUrl(
        track.subtitle_url || track.subtitleUrl
      );
    }

    if (!subtitleUrl) {
      const loadedUrl = findLoadedAiSubtitleUrl();
      if (loadedUrl) {
        subtitleUrl = loadedUrl;
        track = {
          lan: "ai-zh",
          lan_doc: "中文 AI（已加载资源）",
          subtitle_url: loadedUrl
        };
      }
    }

    if (!subtitleUrl) {
      const needLogin = attempts.some(
        attempt => attempt.needLoginSubtitle
      );
      const error = buildError(
        needLogin
          ? "SUBTITLE_LOGIN_REQUIRED"
          : "SUBTITLE_URL_NOT_FOUND",
        needLogin
          ? "字幕接口要求登录，请确认当前B站账号已经登录"
          : "播放器接口未返回中文AI字幕地址",
        {
          bvid,
          aid,
          cid,
          page: currentPage?.page || pageNumber,
          partTitle: currentPage?.part || "",
          attempts,
          availableTracks: tracks.map(item => ({
            id: item.id,
            lan: item.lan,
            lanDoc: item.lan_doc,
            subtitleUrl: normalizeUrl(
              item.subtitle_url || item.subtitleUrl
            )
          }))
        }
      );
      showError(panel, error);
      return error;
    }

    updateStatus(
      panel,
      "已取得本视频AI字幕地址，正在读取完整JSON……"
    );

    const subtitleResponse = await fetchWithTimeout(subtitleUrl, {
      method: "GET",
      mode: "cors",
      credentials: "omit",
      headers: {
        accept: "application/json, text/plain, */*"
      },
      referrer: location.href,
      referrerPolicy: "strict-origin-when-cross-origin"
    }, 12000);

    if (!subtitleResponse.ok) {
      const error = buildError(
        "SUBTITLE_HTTP_ERROR",
        `字幕文件请求失败：HTTP ${subtitleResponse.status}`,
        {
          bvid,
          cid,
          subtitleUrl,
          httpStatus: subtitleResponse.status
        }
      );
      showError(panel, error);
      return error;
    }

    const subtitleJson = await subtitleResponse.json();
    const body = Array.isArray(subtitleJson?.body)
      ? subtitleJson.body
      : [];

    if (!body.length) {
      const error = buildError(
        "SUBTITLE_BODY_EMPTY",
        "字幕JSON已成功读取，但body数组为空",
        {
          bvid,
          cid,
          subtitleUrl,
          subtitleType: subtitleJson?.type,
          subtitleLang: subtitleJson?.lang
        }
      );
      showError(panel, error);
      return error;
    }

    const subtitles = [];

    for (const item of body) {
      const text = String(item?.content || "")
        .trim()
        .replace(/\s+/g, " ");
      if (!text) continue;

      const previous = subtitles[subtitles.length - 1];
      if (previous?.text === text) continue;

      subtitles.push({
        start: Number(item?.from) || 0,
        end: Number(item?.to) || Number(item?.from) || 0,
        text
      });
    }

    if (!subtitles.length) {
      const error = buildError(
        "SUBTITLE_TEXT_EMPTY",
        "字幕body存在，但没有可用的content文字",
        {
          bvid,
          cid,
          bodyCount: body.length,
          subtitleUrl
        }
      );
      showError(panel, error);
      return error;
    }

    const plainText = subtitles
      .map(item => item.text)
      .join("\n");
    const timestampText = subtitles
      .map(item => `${formatTime(item.start)} ${item.text}`)
      .join("\n");

    const result = {
      success: true,
      source: "B站中文AI字幕接口",
      title: viewJson.data.title || document.title,
      partTitle: currentPage?.part || "",
      url: location.href,
      bvid,
      aid,
      cid,
      page: currentPage?.page || pageNumber,
      duration: Number(currentPage?.duration) || 0,
      trackLanguage: track?.lan || "ai-zh",
      trackName: track?.lan_doc || "中文 AI",
      playerApiUsed,
      subtitleUrl,
      subtitleType: subtitleJson?.type || "AISubtitle",
      subtitleLang: subtitleJson?.lang || "zh",
      count: subtitles.length,
      charCount: plainText.length,
      subtitles,
      plainText,
      timestampText
    };

    window.__TABBIT_BILIBILI_SUBTITLE__ = result;
    window.dispatchEvent(
      new CustomEvent("tabbit-bilibili-subtitle-ready", {
        detail: result
      })
    );

    showSuccess(panel, result);

    return {
      ok: true,
      version: VERSION,
      source: result.source,
      title: result.title,
      partTitle: result.partTitle,
      bvid: result.bvid,
      aid: result.aid,
      cid: result.cid,
      page: result.page,
      trackLanguage: result.trackLanguage,
      trackName: result.trackName,
      count: result.count,
      charCount: result.charCount,
      subtitleUrl: result.subtitleUrl,
      subtitleType: result.subtitleType,
      subtitleLang: result.subtitleLang,
      plainText: result.plainText,
      timestampText: result.timestampText,
      subtitles: result.subtitles,
      panelCreated: true
    };
  } catch (unexpectedError) {
    const error = buildError(
      "UNEXPECTED_ERROR",
      unexpectedError?.message || String(unexpectedError),
      {
        stack: unexpectedError?.stack || ""
      }
    );
    if (panel) {
      showError(panel, error);
    } else {
      console.error("[B站AI字幕提取]", error);
    }
    return error;
  }
})(typeof args !== "undefined" ? args : {});