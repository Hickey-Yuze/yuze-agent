async (args = {}) => {
  const registerPersonalSkill = (
    async ({
      page_origin = "https://web.Yuze.com",
      page_path = "/plaza/skills",
      api_base = "/api/v1/prompts",
      upload_api_base = "/proxy/v0/skills",
      original_filename,
      content_type = "application/gzip",
      bundle_base64,
      bundle_sha256 = null,
      existing_skill_id = null,
      create_payload,
    }) => {
      function requireField(name, value) {
        if (value === undefined || value === null || value === "") {
          throw new Error(`Missing required field: ${name}`);
        }
        return value;
      }

      function normalizeBase64(input) {
        return String(input || "").replace(/\s+/g, "");
      }

      function decodeBase64ToUint8Array(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) {
          bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
      }

      async function sha256Hex(bytes) {
        if (!crypto || !crypto.subtle || !crypto.subtle.digest) {
          throw new Error("Browser crypto.subtle.digest is unavailable");
        }
        const digest = await crypto.subtle.digest("SHA-256", bytes);
        return Array.from(new Uint8Array(digest))
          .map((byte) => byte.toString(16).padStart(2, "0"))
          .join("");
      }

      function normalizeOrigin(origin) {
        return String(origin || "").replace(/\/+$/, "");
      }

      function normalizeAllowedTools(payload) {
        if (!payload || !Array.isArray(payload.allowed_tools)) {
          return payload;
        }
        const allowedTools = [];
        const seen = new Set();
        const supportedTools = new Set(["evaluate_script", "image_generate"]);
        for (const rawName of payload.allowed_tools) {
          const name = String(rawName || "").trim();
          if (!name || seen.has(name) || !supportedTools.has(name)) {
            continue;
          }
          seen.add(name);
          allowedTools.push(name);
        }
        return {
          ...payload,
          allowed_tools: allowedTools,
        };
      }

      async function readJson(response, label) {
        const text = await response.text();
        let parsed = null;
        try {
          parsed = text ? JSON.parse(text) : null;
        } catch (_error) {
          parsed = null;
        }
        if (!response.ok) {
          const rawDetail =
            (parsed && (parsed.detail || parsed.message || parsed.error)) || text;
          const detail =
            typeof rawDetail === "string"
              ? rawDetail
              : rawDetail
                ? JSON.stringify(rawDetail)
                : `${label} failed with status ${response.status}`;
          throw new Error(detail);
        }
        return parsed;
      }

      const expectedOrigin = normalizeOrigin(page_origin);
      if (expectedOrigin && location.origin !== expectedOrigin) {
        throw new Error(
          `This script must run on ${expectedOrigin}${page_path}. Current URL: ${location.href}`
        );
      }

      if (!location.pathname.startsWith(page_path)) {
        throw new Error(
          `This script must run on ${expectedOrigin || ""}${page_path}. Current URL: ${location.href}`
        );
      }

      requireField("original_filename", original_filename);
      requireField("bundle_base64", bundle_base64);
      requireField("create_payload", create_payload);

      const normalizedBase64 = normalizeBase64(bundle_base64);
      const bundleBytes = decodeBase64ToUint8Array(normalizedBase64);
      if (bundle_sha256) {
        const expectedSha256 = String(bundle_sha256).trim().toLowerCase();
        const actualSha256 = await sha256Hex(bundleBytes);
        if (actualSha256 !== expectedSha256) {
          throw new Error(
            `Bundle SHA256 mismatch: expected ${expectedSha256}, got ${actualSha256}`
          );
        }
      }

      const uploadInitResponse = await fetch(`${upload_api_base}/uploads/init`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          original_filename,
          content_type,
          skill_id: existing_skill_id || undefined,
        }),
      });
      const uploadInit = await readJson(uploadInitResponse, "init upload");

      const uploadResponse = await fetch(uploadInit.upload_url, {
        method: "PUT",
        headers: {
          "Content-Type": content_type,
        },
        body: bundleBytes,
      });
      if (!uploadResponse.ok) {
        throw new Error(`Upload bundle failed with status ${uploadResponse.status}`);
      }

      const submitPayloadBase = {
        ...normalizeAllowedTools(create_payload),
        bundle_uri: uploadInit.bundle_uri,
        bundle_digest: bundle_sha256 || create_payload.bundle_digest,
      };

      const submitPayload = existing_skill_id
        ? submitPayloadBase
        : {
            category: 4,
            ...submitPayloadBase,
          };
      const submitUrl = existing_skill_id
        ? `${api_base}/${existing_skill_id}`
        : `${api_base}`;

      const submitResponse = await fetch(submitUrl, {
        method: existing_skill_id ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitPayload),
      });
      const created = await readJson(submitResponse, "create skill");

      return {
        ok: true,
        mode: existing_skill_id ? "update_version" : "create_skill",
        upload: {
          bucket: uploadInit.bucket,
          object_key: uploadInit.object_key,
          bundle_uri: uploadInit.bundle_uri,
        },
        skill: created,
        page: {
          href: location.href,
          pathname: location.pathname,
        },
      };
    }
  );
  const mergedArgs = {
    ...(args || {}),
    bundle_base64: "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",
    bundle_sha256: "112f7d129010be2d9d3888d6ac5d3d95773264162a33225b1a5d08aa3141d5bc",
  };
  return await registerPersonalSkill(mergedArgs);
}