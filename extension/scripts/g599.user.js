(async function () {
	"use strict";

	const CONFIG = {
		minWidth: 80,
		minHeight: 80,
		outputFormats: ["markdown", "html", "json"],
		beautify: {
			contrast: 1.12,
			saturation: 1.16,
			brightness: 1.03,
			sharpness: 0.18,
			maxCanvasSize: 1800,
		},
	};

	const state = {
		items: [],
		selected: new Set(),
		outputText: "",
	};

	function absUrl(url) {
		if (!url) return "";
		try {
			return new URL(url, location.href).href;
		} catch {
			return "";
		}
	}

	function parseSrcset(srcset) {
		return String(srcset || "")
			.split(",")
			.map((item) => item.trim().split(/\s+/)[0])
			.map(absUrl)
			.filter(Boolean);
	}

	function extractCssUrls(value) {
		const urls = [];
		const regex = /url\((['"]?)(.*?)\1\)/gi;
		let match;

		while ((match = regex.exec(value || ""))) {
			const url = absUrl(match[2]);
			if (url) urls.push(url);
		}

		return urls;
	}

	function isImageUrl(url) {
		return /\.(png|jpe?g|webp|gif|avif|svg|bmp)(\?.*)?$/i.test(url);
	}

	function dedupe(items) {
		const seen = new Set();
		return items.filter((item) => {
			if (!item.url || seen.has(item.url)) return false;
			seen.add(item.url);
			return true;
		});
	}

	function collectImages() {
		const items = [];

		document.querySelectorAll("img").forEach((img, index) => {
			const urls = [
				absUrl(img.currentSrc),
				absUrl(img.src),
				...parseSrcset(img.getAttribute("srcset")),
			].filter(Boolean);

			urls.forEach((url) => {
				items.push({
					id: `img-${index}-${items.length}`,
					url,
					type: "img",
					alt: img.alt || img.title || "image",
					width: img.naturalWidth || img.width || 0,
					height: img.naturalHeight || img.height || 0,
				});
			});
		});

		document.querySelectorAll("source[srcset]").forEach((source, index) => {
			parseSrcset(source.getAttribute("srcset")).forEach((url) => {
				items.push({
					id: `source-${index}-${items.length}`,
					url,
					type: "srcset",
					alt: "image",
					width: 0,
					height: 0,
				});
			});
		});

		document.querySelectorAll("a[href]").forEach((link, index) => {
			const url = absUrl(link.getAttribute("href"));
			if (!isImageUrl(url)) return;

			items.push({
				id: `link-${index}-${items.length}`,
				url,
				type: "link",
				alt: link.textContent.trim() || "image",
				width: 0,
				height: 0,
			});
		});

		document.querySelectorAll("*").forEach((node, index) => {
			const style = getComputedStyle(node);
			extractCssUrls(style.backgroundImage).forEach((url) => {
				items.push({
					id: `bg-${index}-${items.length}`,
					url,
					type: "background",
					alt: "background",
					width: node.clientWidth || 0,
					height: node.clientHeight || 0,
				});
			});
		});

		return dedupe(items).filter((item) => {
			if (!item.width || !item.height) return true;
			return item.width >= CONFIG.minWidth && item.height >= CONFIG.minHeight;
		});
	}

	function escapeHtml(text) {
		return String(text || "")
			.replaceAll("&", "&amp;")
			.replaceAll("<", "&lt;")
			.replaceAll(">", "&gt;")
			.replaceAll('"', "&quot;");
	}

	function addStyle() {
		if (document.querySelector("#image-extractor-direct-style")) return;

		const style = document.createElement("style");
		style.id = "image-extractor-direct-style";
		style.textContent = `
			#image-extractor-direct-panel {
				position: fixed;
				inset: 20px;
				z-index: 2147483647;
				display: grid;
				grid-template-rows: auto 1fr auto;
				background: #ffffff;
				color: #111827;
				border-radius: 18px;
				box-shadow: 0 24px 90px rgba(15, 23, 42, .35);
				border: 1px solid rgba(15, 23, 42, .12);
				overflow: hidden;
				font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif;
			}
			#image-extractor-direct-panel * { box-sizing: border-box; }
			.image-extractor-header,
			.image-extractor-footer {
				display: flex;
				align-items: center;
				justify-content: space-between;
				gap: 12px;
				padding: 12px 16px;
				background: #f8fafc;
				border-bottom: 1px solid #e5e7eb;
			}
			.image-extractor-footer {
				border-top: 1px solid #e5e7eb;
				border-bottom: 0;
			}
			.image-extractor-title {
				font-size: 16px;
				font-weight: 800;
			}
			.image-extractor-actions {
				display: flex;
				flex-wrap: wrap;
				gap: 8px;
				align-items: center;
			}
			.image-extractor-actions button {
				border: 0;
				border-radius: 999px;
				padding: 8px 12px;
				background: #2563eb;
				color: white;
				font-weight: 700;
				cursor: pointer;
			}
			.image-extractor-actions button.secondary {
				background: #e5e7eb;
				color: #111827;
			}
			.image-extractor-actions button.danger {
				background: #ef4444;
				color: white;
			}
			.image-extractor-main {
				display: grid;
				grid-template-columns: minmax(0, 1fr) 420px;
				min-height: 0;
			}
			.image-extractor-grid {
				overflow: auto;
				padding: 14px;
				background: #f1f5f9;
				display: grid;
				grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
				gap: 12px;
			}
			.image-card {
				position: relative;
				overflow: hidden;
				border-radius: 14px;
				background: white;
				border: 2px solid transparent;
				box-shadow: 0 10px 25px rgba(15, 23, 42, .08);
			}
			.image-card.selected {
				border-color: #22c55e;
			}
			.image-card img {
				display: block;
				width: 100%;
				aspect-ratio: 1.2 / 1;
				object-fit: cover;
				background: #e5e7eb;
			}
			.image-card label {
				position: absolute;
				top: 8px;
				left: 8px;
				display: flex;
				align-items: center;
				gap: 6px;
				padding: 4px 8px;
				border-radius: 999px;
				background: rgba(255,255,255,.94);
				font-weight: 700;
				font-size: 12px;
				cursor: pointer;
			}
			.image-meta {
				padding: 8px;
				font-size: 12px;
				color: #475569;
			}
			.image-url {
				overflow: hidden;
				white-space: nowrap;
				text-overflow: ellipsis;
			}
			.image-output {
				display: flex;
				flex-direction: column;
				gap: 10px;
				min-height: 0;
				padding: 12px;
				border-left: 1px solid #e5e7eb;
			}
			.image-output textarea {
				width: 100%;
				flex: 1;
				resize: none;
				border: 1px solid #d1d5db;
				border-radius: 12px;
				padding: 10px;
				font: 12px/1.6 Consolas, Monaco, monospace;
			}
			.image-status {
				color: #475569;
				font-size: 12px;
			}
			@media (max-width: 900px) {
				#image-extractor-direct-panel { inset: 8px; }
				.image-extractor-main { grid-template-columns: 1fr; }
				.image-output { border-left: 0; border-top: 1px solid #e5e7eb; min-height: 260px; }
			}
		`;
		document.head.appendChild(style);
	}

	function setStatus(text) {
		const status = document.querySelector("#image-extractor-direct-panel .image-status");
		if (status) status.textContent = text;
	}

	function selectedItems() {
		return state.items.filter((item) => state.selected.has(item.id));
	}

	function renderGrid() {
		const grid = document.querySelector("#image-extractor-direct-panel .image-extractor-grid");
		if (!grid) return;

		grid.innerHTML = "";

		state.items.forEach((item) => {
			const card = document.createElement("div");
			card.className = `image-card ${state.selected.has(item.id) ? "selected" : ""}`;

			const img = document.createElement("img");
			img.src = item.url;
			img.alt = item.alt;
			img.loading = "lazy";
			img.referrerPolicy = "no-referrer";

			const label = document.createElement("label");
			const checkbox = document.createElement("input");
			checkbox.type = "checkbox";
			checkbox.checked = state.selected.has(item.id);
			checkbox.addEventListener("change", () => {
				if (checkbox.checked) state.selected.add(item.id);
				else state.selected.delete(item.id);
				card.classList.toggle("selected", checkbox.checked);
				setStatus(`已选择 ${state.selected.size} 张，共 ${state.items.length} 张`);
			});
			label.append(checkbox, "选择");

			const meta = document.createElement("div");
			meta.className = "image-meta";
			meta.innerHTML = `
				<div>${item.type}${item.width && item.height ? ` · ${item.width}×${item.height}` : ""}</div>
				<div class="image-url" title="${escapeHtml(item.url)}">${escapeHtml(item.url)}</div>
			`;

			card.append(img, label, meta);
			grid.appendChild(card);
		});
	}

	async function loadImageForCanvas(url) {
		return new Promise((resolve, reject) => {
			const image = new Image();
			image.crossOrigin = "anonymous";
			image.referrerPolicy = "no-referrer";
			image.onload = () => resolve(image);
			image.onerror = () => reject(new Error("图片加载失败或跨域不允许 Canvas 处理"));
			image.src = url;
		});
	}

	function clamp(value) {
		return Math.max(0, Math.min(255, value));
	}

	function beautifyPixels(imageData) {
		const data = imageData.data;
		const contrast = CONFIG.beautify.contrast;
		const saturation = CONFIG.beautify.saturation;
		const brightness = CONFIG.beautify.brightness;

		for (let index = 0; index < data.length; index += 4) {
			let r = data[index];
			let g = data[index + 1];
			let b = data[index + 2];

			r = (r - 128) * contrast + 128;
			g = (g - 128) * contrast + 128;
			b = (b - 128) * contrast + 128;

			const gray = 0.299 * r + 0.587 * g + 0.114 * b;
			r = gray + (r - gray) * saturation;
			g = gray + (g - gray) * saturation;
			b = gray + (b - gray) * saturation;

			data[index] = clamp(r * brightness);
			data[index + 1] = clamp(g * brightness);
			data[index + 2] = clamp(b * brightness);
		}

		return imageData;
	}

	function sharpen(canvas, context) {
		const amount = CONFIG.beautify.sharpness;
		if (!amount) return;

		const width = canvas.width;
		const height = canvas.height;
		const source = context.getImageData(0, 0, width, height);
		const output = context.createImageData(width, height);
		const src = source.data;
		const dst = output.data;
		const kernel = [0, -amount, 0, -amount, 1 + 4 * amount, -amount, 0, -amount, 0];

		for (let y = 1; y < height - 1; y++) {
			for (let x = 1; x < width - 1; x++) {
				for (let channel = 0; channel < 4; channel++) {
					const offset = (y * width + x) * 4 + channel;
					if (channel === 3) {
						dst[offset] = src[offset];
						continue;
					}

					let value = 0;
					let kernelIndex = 0;

					for (let ky = -1; ky <= 1; ky++) {
						for (let kx = -1; kx <= 1; kx++) {
							const sample = ((y + ky) * width + (x + kx)) * 4 + channel;
							value += src[sample] * kernel[kernelIndex++];
						}
					}

					dst[offset] = clamp(value);
				}
			}
		}

		context.putImageData(output, 0, 0);
	}

	async function beautifyImageToDataUrl(item) {
		const image = await loadImageForCanvas(item.url);
		const maxSize = CONFIG.beautify.maxCanvasSize;
		const scale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
		const width = Math.max(1, Math.round(image.naturalWidth * scale));
		const height = Math.max(1, Math.round(image.naturalHeight * scale));
		const canvas = document.createElement("canvas");
		const context = canvas.getContext("2d", { willReadFrequently: true });

		canvas.width = width;
		canvas.height = height;
		context.drawImage(image, 0, 0, width, height);
		context.putImageData(beautifyPixels(context.getImageData(0, 0, width, height)), 0, 0);
		sharpen(canvas, context);

		return canvas.toDataURL("image/webp", 0.9);
	}

	function buildOutput(items, format) {
		if (format === "html") {
			return items
				.map((item) => `<img src="${escapeHtml(item.finalUrl)}" alt="${escapeHtml(item.alt)}">`)
				.join("\n");
		}

		if (format === "json") {
			return JSON.stringify(items, null, 2);
		}

		return items.map((item) => `![${item.alt || "image"}](${item.finalUrl})`).join("\n\n");
	}

	async function generate(format) {
		const items = selectedItems();
		if (!items.length) {
			alert("请先选择至少一张图片。");
			return;
		}

		const needBeautify = confirm(
			"是否需要自动美化图片？\n\n确定：使用浏览器本地算法增强图片，并生成 base64 图片结果。\n取消：不处理图片，直接生成原图链接。",
		);
		const results = [];

		for (let index = 0; index < items.length; index++) {
			const item = items[index];
			setStatus(`正在处理 ${index + 1}/${items.length}：${item.url}`);

			try {
				const finalUrl = needBeautify ? await beautifyImageToDataUrl(item) : item.url;
				results.push({
					...item,
					finalUrl,
					beautified: needBeautify,
					ok: true,
				});
			} catch (error) {
				results.push({
					...item,
					finalUrl: item.url,
					beautified: false,
					ok: false,
					error: error.message || String(error),
				});
			}
		}

		state.outputText = buildOutput(results, format);
		const textarea = document.querySelector("#image-extractor-direct-panel textarea");
		if (textarea) textarea.value = state.outputText;

		const failCount = results.filter((item) => !item.ok).length;
		setStatus(`生成完成：${results.length - failCount} 张成功，${failCount} 张因跨域等原因回退原图链接`);
	}

	async function copyOutput() {
		if (!state.outputText) {
			alert("还没有生成内容。");
			return;
		}

		await navigator.clipboard.writeText(state.outputText);
		setStatus("已复制结果到剪贴板。");
	}

	function downloadOutput() {
		if (!state.outputText) {
			alert("还没有生成内容。");
			return;
		}

		const blob = new Blob([state.outputText], { type: "text/plain;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");

		link.href = url;
		link.download = `网页图片提取-${Date.now()}.txt`;
		link.click();
		URL.revokeObjectURL(url);
	}

	function closePanel() {
		document.querySelector("#image-extractor-direct-panel")?.remove();
	}

	function openPanel() {
		closePanel();
		addStyle();

		state.items = collectImages();
		state.selected = new Set(state.items.map((item) => item.id));
		state.outputText = "";

		const panel = document.createElement("section");
		panel.id = "image-extractor-direct-panel";
		panel.innerHTML = `
			<header class="image-extractor-header">
				<div>
					<div class="image-extractor-title">网页图片提取器</div>
					<div class="image-status">已选择 ${state.selected.size} 张，共 ${state.items.length} 张</div>
				</div>
				<div class="image-extractor-actions">
					<button data-action="rescan" class="secondary">重新扫描</button>
					<button data-action="select-all" class="secondary">全选</button>
					<button data-action="select-none" class="secondary">全不选</button>
					<button data-action="close" class="danger">关闭</button>
				</div>
			</header>
			<main class="image-extractor-main">
				<div class="image-extractor-grid"></div>
				<aside class="image-output">
					<strong>生成结果</strong>
					<textarea placeholder="选择图片后，点击下方按钮生成结果。"></textarea>
				</aside>
			</main>
			<footer class="image-extractor-footer">
				<div class="image-extractor-actions">
					<button data-action="markdown">生成 Markdown</button>
					<button data-action="html" class="secondary">生成 HTML</button>
					<button data-action="json" class="secondary">生成 JSON</button>
					<button data-action="copy" class="secondary">复制结果</button>
					<button data-action="download" class="secondary">下载结果</button>
				</div>
			</footer>
		`;

		document.body.appendChild(panel);

		panel.addEventListener("click", (event) => {
			const button = event.target.closest("button[data-action]");
			if (!button) return;

			const action = button.dataset.action;

			if (action === "close") closePanel();
			if (action === "rescan") {
				state.items = collectImages();
				state.selected = new Set(state.items.map((item) => item.id));
				renderGrid();
				setStatus(`已重新扫描：已选择 ${state.selected.size} 张，共 ${state.items.length} 张`);
			}
			if (action === "select-all") {
				state.selected = new Set(state.items.map((item) => item.id));
				renderGrid();
				setStatus(`已选择 ${state.selected.size} 张，共 ${state.items.length} 张`);
			}
			if (action === "select-none") {
				state.selected.clear();
				renderGrid();
				setStatus(`已选择 0 张，共 ${state.items.length} 张`);
			}
			if (CONFIG.outputFormats.includes(action)) generate(action);
			if (action === "copy") copyOutput();
			if (action === "download") downloadOutput();
		});

		renderGrid();
	}

	openPanel();
})();