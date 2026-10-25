// 本地 Harness 桥客户端（dsh-ext-bridge）。
// 只在侧栏里用：默认关，设置页开「连接本地 Harness」才走这里。
// 约定：
//   - 除 ping 外都带 Authorization: Bearer <token>
//   - SSE 断档（宿主重启 / 客户端 since 超前）会先收到 {type:"bridge/reset"}
//   - 事件类型沿用 Harness：assistant/chunk(text-delta|reasoning-delta|tool-call-delta)、
//     assistant/message、tool/call、tool/result、turn/start|end、step/start|end、user/message
(function (root) {
  "use strict";

  var DEFAULTS = {
    url: "http://127.0.0.1:43120",
    timeoutMs: 8000
  };

  function normBase(url) {
    var u = String(url || DEFAULTS.url).trim().replace(/\/+$/, "");
    if (!/^https?:\/\//i.test(u)) u = "http://" + u;
    return u;
  }

  function headers(token, extra) {
    var h = { "content-type": "application/json" };
    if (token) h.authorization = "Bearer " + token;
    Object.assign(h, extra || {});
    return h;
  }

  function withTimeout(ms) {
    if (typeof AbortController === "undefined") return { signal: undefined, done: function () {} };
    var c = new AbortController();
    var t = setTimeout(function () {
      c.abort();
    }, ms);
    return {
      signal: c.signal,
      done: function () {
        clearTimeout(t);
      }
    };
  }

  async function readJson(res) {
    var text = await res.text();
    if (!res.ok) {
      var err = new Error("HTTP " + res.status + (text ? " " + text.slice(0, 200) : ""));
      err.status = res.status;
      throw err;
    }
    try {
      return text ? JSON.parse(text) : {};
    } catch (e) {
      throw new Error("返回不是 JSON：" + text.slice(0, 120));
    }
  }

  // 无鉴权的探活，给设置页"测试连接"用
  async function ping(base, timeoutMs) {
    var t = withTimeout(timeoutMs || DEFAULTS.timeoutMs);
    try {
      var res = await fetch(normBase(base) + "/ext-bridge/ping", { signal: t.signal });
      return await readJson(res);
    } finally {
      t.done();
    }
  }

  async function sessions(base, token) {
    var t = withTimeout(DEFAULTS.timeoutMs);
    try {
      var res = await fetch(normBase(base) + "/ext-bridge/sessions", {
        headers: headers(token),
        signal: t.signal
      });
      var data = await readJson(res);
      return Array.isArray(data.sessions) ? data.sessions : [];
    } finally {
      t.done();
    }
  }

  async function createSession(base, token, opts) {
    var t = withTimeout(DEFAULTS.timeoutMs);
    try {
      var res = await fetch(normBase(base) + "/ext-bridge/sessions", {
        method: "POST",
        headers: headers(token),
        body: JSON.stringify(opts || {}),
        signal: t.signal
      });
      var data = await readJson(res);
      if (!data.sessionId) throw new Error("宿主没返回 sessionId");
      return data.sessionId;
    } finally {
      t.done();
    }
  }

  async function prompt(base, token, body) {
    var t = withTimeout(DEFAULTS.timeoutMs);
    try {
      var res = await fetch(normBase(base) + "/ext-bridge/prompt", {
        method: "POST",
        headers: headers(token),
        body: JSON.stringify(body),
        signal: t.signal
      });
      return await readJson(res);
    } finally {
      t.done();
    }
  }

  async function cancel(base, token, sessionId) {
    var t = withTimeout(DEFAULTS.timeoutMs);
    try {
      var res = await fetch(normBase(base) + "/ext-bridge/cancel", {
        method: "POST",
        headers: headers(token),
        body: JSON.stringify({ sessionId: sessionId }),
        signal: t.signal
      });
      return await readJson(res);
    } finally {
      t.done();
    }
  }

  // GET /events?sessionId=&since=（EventSource 带不了自定义头，所以用 ?token=）
  // 返回 { close() }
  function subscribe(base, token, sessionId, since, handlers) {
    var h = handlers || {};
    var qs =
      "?sessionId=" +
      encodeURIComponent(sessionId) +
      "&since=" +
      encodeURIComponent(String(since || 0)) +
      (token ? "&token=" + encodeURIComponent(token) : "");
    var es = new EventSource(normBase(base) + "/ext-bridge/events" + qs);
    es.onmessage = function (ev) {
      var data;
      try {
        data = JSON.parse(ev.data);
      } catch (e) {
        return;
      }
      if (data && data.type === "bridge/reset") {
        if (h.onReset) h.onReset(data);
        return;
      }
      if (h.onEvent) h.onEvent(data);
    };
    es.onerror = function () {
      // EventSource 自己会重连；把状态交给上层显示
      if (h.onError) h.onError(new Error("事件流断开，正在重连"));
    };
    return {
      close: function () {
        try {
          es.close();
        } catch (e) {}
      }
    };
  }

  // 把 assistant/chunk 归并成便于渲染的增量
  // 返回 null 表示这条 chunk 不用渲染
  function chunkToDelta(chunk) {
    if (!chunk || typeof chunk !== "object") return null;
    switch (chunk.type) {
      case "text-delta":
        return chunk.text ? { kind: "text", text: chunk.text, index: chunk.index } : null;
      case "reasoning-delta":
        return chunk.text ? { kind: "reasoning", text: chunk.text, index: chunk.index } : null;
      case "tool-call-delta":
        return {
          kind: "tool-call",
          index: chunk.index,
          id: chunk.id,
          name: chunk.name,
          argumentsDelta: chunk.argumentsDelta || ""
        };
      default:
        return null;
    }
  }

  // assistant/message 的 message 里取正文（content 可能是字符串或分块数组）
  function messageText(message) {
    if (!message) return "";
    var content = message.content;
    if (typeof content === "string") return content;
    if (!Array.isArray(content)) return "";
    return content
      .map(function (part) {
        if (typeof part === "string") return part;
        if (!part) return "";
        if (part.type === "text" || part.type === "output_text") return part.text || "";
        return "";
      })
      .join("");
  }

  var api = {
    DEFAULTS: DEFAULTS,
    normBase: normBase,
    ping: ping,
    sessions: sessions,
    createSession: createSession,
    prompt: prompt,
    cancel: cancel,
    subscribe: subscribe,
    chunkToDelta: chunkToDelta,
    messageText: messageText
  };

  root.HarnessBridge = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
