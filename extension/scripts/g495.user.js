// ============================================================
// 学术文献摘录助手 — Tabbit 脚本妙招适配版 v3.0
// ============================================================

(function () {
    'use strict';

    if (window.__excerptHelperInjected) return;
    window.__excerptHelperInjected = true;

    // ==========================================================
    // ===== 用户配置区（填写后所有站点自动生效） ===============
    // ==========================================================
    // 将你的 API Key 粘贴到下方引号内，保存脚本即可全站点生效
    // 留空则每个站点首次使用时会弹出输入框
    var USER_API_KEY = '';
    // 默认模型：'deepseek-v4-flash'（快速）或 'deepseek-v4-pro'（精准）
    var USER_MODEL = '';
    // --- 云同步设置（GitHub Gist） ---
    // GitHub 私人令牌（在 github.com → Settings → Developer settings → Personal access tokens → 生成，勾选 gist 权限）
    var SYNC_GITHUB_TOKEN = '';
    // ==========================================================

    // ===== 常量与配置 =====
    var STORAGE_KEY = 'excerpt_helper_entries';
    var API_KEY_STORAGE_KEY = 'excerpt_helper_deepseek_api_key';
    var MODEL_STORAGE_KEY = 'excerpt_helper_deepseek_model';
    var API_KEY_VALID_PREFIX = 'sk-';
    var API_BASE_URL = 'https://api.deepseek.com/chat/completions';
    var MIN_SELECTION_LENGTH = 10;
    var DOI_RE = /10\.\d{4,}\/[^\s]+/;
    var OWN_UI_SELECTOR = '#excerpt-dialog-overlay, #excerpt-dashboard-overlay, #excerpt-main-btn, #excerpt-copy-confirm';
    var DASHBOARD_PREFIX = 'excerpt-dashboard-';
    var SYNC_GITHUB_API = 'https://api.github.com/gists';
    var SYNC_GIST_DESC = 'excerpt_helper_sync_data';
    var SYNC_TOKEN_KEY = 'excerpt_helper_github_token';
    var SYNC_GIST_ID_KEY = 'excerpt_helper_github_gist_id';

    var AVAILABLE_MODELS = [
        { id: 'deepseek-v4-flash', label: 'DeepSeek V4 Flash (快速·经济)' },
        { id: 'deepseek-v4-pro',  label: 'DeepSeek V4 Pro (旗舰·精准)' }
    ];

    // ===== 通用工具 =====
    function onDOMReady(fn) {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
        else fn();
    }
    function $(sel, root)  { return (root || document).querySelector(sel); }
    function $$(sel, root) { return (root || document).querySelectorAll(sel); }
    function trim(s)       { return (s == null) ? '' : String(s).trim(); }
    function squashWS(s)   { return (s == null ? '' : String(s)).replace(/\s+/g, ' ').trim(); }

    function getMetaContent(name) {
        var attrs = ['name', 'property', 'itemprop'];
        for (var i = 0; i < attrs.length; i++) {
            var el = document.querySelector('meta[' + attrs[i] + '="' + name + '"]');
            if (el && el.content && el.content.trim()) return el.content.trim();
        }
        return '';
    }
    function metaJoinAll(name) {
        var els = $$('meta[name="' + name + '"]');
        var arr = [];
        for (var i = 0; i < els.length; i++) {
            var v = trim(els[i].content);
            if (v) arr.push(v);
        }
        return arr.join('; ');
    }

    function pickFirstText(selectors, root) {
        for (var i = 0; i < selectors.length; i++) {
            var el = (root || document).querySelector(selectors[i]);
            if (el && trim(el.innerText)) return squashWS(el.innerText);
        }
        return '';
    }

    function findDOI(text) {
        if (!text) return '';
        var m = String(text).match(DOI_RE);
        return m ? m[0] : '';
    }

    function extractPMIDFromURL() {
        var m = window.location.href.match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/);
        return m ? m[1] : '';
    }

    function extractDOIFromText() {
        var metaDOI = getMetaContent('citation_doi') || getMetaContent('dc.DOI') || getMetaContent('dc.identifier');
        if (metaDOI) return metaDOI.replace(/^doi:/i, '').trim();
        var links = $$('a[href*="doi.org"], a[href*="dx.doi.org"]');
        for (var i = 0; i < links.length; i++) {
            var d = findDOI(links[i].href);
            if (d) return d;
        }
        var bodyText = document.body ? (document.body.innerText || '') : '';
        return findDOI(bodyText);
    }

    function buildYearIssue(yr, vol, iss) {
        var s = trim(yr).slice(0, 4);
        if (vol) s += ';' + vol;
        if (iss) s += '(' + iss + ')';
        return s;
    }

    function metaYearIssue() {
        var yr = getMetaContent('citation_date') || getMetaContent('dc.date') || '';
        return buildYearIssue(yr, getMetaContent('citation_volume'), getMetaContent('citation_issue'));
    }

    function formatAuthors(authors) {
        if (!authors) return '';
        if (Array.isArray(authors)) return authors.join('; ');
        if (authors.indexOf(',') > -1) {
            return authors.split(',').map(function (a) { return a.trim(); }).join('; ');
        }
        return authors.trim();
    }

    function escapeHTML(str) {
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str == null ? '' : String(str)));
        return div.innerHTML;
    }

    function escapeAttr(str) { return escapeHTML(str).replace(/"/g, '&quot;'); }

    function makeMetadata(p) {
        return {
            title:     p.title     || '',
            authors:   formatAuthors(p.authors || ''),
            journal:   p.journal   || '',
            yearIssue: p.yearIssue || '',
            doi:       p.doi       || '',
            pmid:      p.pmid      || '',
            abstract:  p.abstract  || ''
        };
    }

    // ===== 本地存储 =====
    // 优先级：用户配置区 > localStorage（当前站点设置）> 默认值
    function getAPIKey() {
        if (USER_API_KEY && trim(USER_API_KEY)) return trim(USER_API_KEY);
        return localStorage.getItem(API_KEY_STORAGE_KEY) || '';
    }
    function setAPIKey(k)  { localStorage.setItem(API_KEY_STORAGE_KEY, trim(k)); }
    function clearAPIKey() { localStorage.removeItem(API_KEY_STORAGE_KEY); }

    function getModel() {
        if (USER_MODEL && trim(USER_MODEL)) {
            for (var j = 0; j < AVAILABLE_MODELS.length; j++) {
                if (AVAILABLE_MODELS[j].id === trim(USER_MODEL)) return trim(USER_MODEL);
            }
        }
        var saved = localStorage.getItem(MODEL_STORAGE_KEY);
        if (saved) {
            for (var i = 0; i < AVAILABLE_MODELS.length; i++) {
                if (AVAILABLE_MODELS[i].id === saved) return saved;
            }
        }
        return 'deepseek-v4-flash';
    }
    function setModel(id) { localStorage.setItem(MODEL_STORAGE_KEY, id); }

    function getEntries() {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
        catch (e) { return []; }
    }
    function saveEntries(entries) { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); }

    function addEntry(entry) {
        var entries = getEntries();
        entry.timestamp = new Date().toISOString();
        entries.push(entry);
        saveEntries(entries);
    }

    // ===== 云同步（GitHub Gist API） =====
    function getGithubToken() {
        return trim(SYNC_GITHUB_TOKEN) || localStorage.getItem(SYNC_TOKEN_KEY) || '';
    }
    function setGithubToken(t) { localStorage.setItem(SYNC_TOKEN_KEY, trim(t)); }
    function getGistId() { return localStorage.getItem(SYNC_GIST_ID_KEY) || ''; }
    function setGistId(id) { localStorage.setItem(SYNC_GIST_ID_KEY, id); }

    function isSyncConfigured() { return !!getGithubToken(); }

    function ghHeaders(token) {
        return {
            'Authorization': 'Bearer ' + token,
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28'
        };
    }

    function findExistingGist(token) {
        return fetch(SYNC_GITHUB_API + '?per_page=100', {
            method: 'GET',
            headers: ghHeaders(token)
        }).then(function (r) {
            if (!r.ok) throw new Error('GitHub API 错误: ' + r.status);
            return r.json();
        }).then(function (gists) {
            for (var i = 0; i < gists.length; i++) {
                if (gists[i].description === SYNC_GIST_DESC) return gists[i].id;
            }
            return null;
        });
    }

    function createGist(token, entries) {
        var body = {
            description: SYNC_GIST_DESC,
            public: false,
            files: { 'data.json': { content: JSON.stringify(entries) } }
        };
        return fetch(SYNC_GITHUB_API, {
            method: 'POST',
            headers: Object.assign({ 'Content-Type': 'application/json' }, ghHeaders(token)),
            body: JSON.stringify(body)
        }).then(function (r) {
            if (!r.ok) throw new Error('创建 Gist 失败: ' + r.status);
            return r.json();
        }).then(function (g) {
            setGistId(g.id);
            return g.id;
        });
    }

    function pullRemoteEntries() {
        var token = getGithubToken();
        if (!token) return Promise.reject(new Error('未配置 GitHub Token'));
        var gistId = getGistId();

        var p = gistId ? Promise.resolve(gistId) : findExistingGist(token).then(function (id) {
            if (id) { setGistId(id); return id; }
            return null;
        });

        return p.then(function (id) {
            if (!id) return [];
            return fetch(SYNC_GITHUB_API + '/' + id, {
                method: 'GET',
                headers: ghHeaders(token)
            }).then(function (r) {
                if (!r.ok) throw new Error('拉取失败: ' + r.status);
                return r.json();
            }).then(function (g) {
                var file = g.files && g.files['data.json'];
                if (!file || !file.content) return [];
                try { return JSON.parse(file.content); } catch (e) { return []; }
            });
        });
    }

    function pushEntries(entries) {
        var token = getGithubToken();
        if (!token) return Promise.reject(new Error('未配置 GitHub Token'));
        var gistId = getGistId();

        if (!gistId) {
            return createGist(token, entries);
        }

        var body = {
            files: { 'data.json': { content: JSON.stringify(entries) } }
        };
        return fetch(SYNC_GITHUB_API + '/' + gistId, {
            method: 'PATCH',
            headers: Object.assign({ 'Content-Type': 'application/json' }, ghHeaders(token)),
            body: JSON.stringify(body)
        }).then(function (r) {
            if (!r.ok) throw new Error('推送失败: ' + r.status);
            return true;
        });
    }

    function mergeEntries(local, remote) {
        var merged = local.slice();
        var existingSet = {};
        for (var i = 0; i < merged.length; i++) {
            var key = (merged[i].timestamp || '') + '|' + (merged[i].selectedText || '').slice(0, 50);
            existingSet[key] = true;
        }
        var added = 0;
        for (var j = 0; j < remote.length; j++) {
            var rKey = (remote[j].timestamp || '') + '|' + (remote[j].selectedText || '').slice(0, 50);
            if (!existingSet[rKey]) {
                merged.push(remote[j]);
                added++;
            }
        }
        return { entries: merged, added: added };
    }

    function doSync() {
        if (!isSyncConfigured()) return Promise.reject(new Error('同步未配置，请先填写 GitHub 私人令牌。'));
        var local = getEntries();
        return pullRemoteEntries().then(function (remote) {
            var result = mergeEntries(local, remote);
            saveEntries(result.entries);
            return pushEntries(result.entries).then(function () {
                return result;
            });
        });
    }

    // 去重策略：DOI > PMID > 标准化标题
    function countUniqueArticles(entries) {
        var seen = { doi: {}, pmid: {}, title: {} };
        var uniqueCount = 0;
        for (var i = 0; i < entries.length; i++) {
            var e = entries[i];
            var matched = false;
            var doi = trim(e.doi).toLowerCase();
            if (doi) { if (seen.doi[doi]) matched = true; else seen.doi[doi] = true; }
            if (!matched) {
                var pmid = trim(e.pmid);
                if (pmid) { if (seen.pmid[pmid]) matched = true; else seen.pmid[pmid] = true; }
            }
            if (!matched && e.title) {
                var t = trim(e.title).toLowerCase().replace(/\s+/g, ' ').replace(/[^\w\s]/g, '');
                if (t) { if (seen.title[t]) matched = true; else seen.title[t] = true; }
            }
            if (!matched) uniqueCount++;
        }
        return uniqueCount;
    }

    // ===== CSV 导出 =====
    function csvField(v) {
        var s = (v == null) ? '' : String(v);
        if (s.indexOf(',') > -1 || s.indexOf('"') > -1 || s.indexOf('\n') > -1) {
            return '"' + s.replace(/"/g, '""') + '"';
        }
        return s;
    }

    function exportCSV() {
        var entries = getEntries();
        if (entries.length === 0) {
            showToast('暂无摘录数据，请先进行摘录。');
            return;
        }
        var headers = ['标题', '作者', '期刊', '年份/期号', 'DOI', 'PMID', '摘要', '选中的话', '选中的理由', '记录时间'];
        var lines = ['\uFEFF' + headers.map(csvField).join(',')];
        for (var i = 0; i < entries.length; i++) {
            var e = entries[i];
            lines.push([
                e.title, e.authors, e.journal, e.yearIssue,
                e.doi, e.pmid, e.abstract, e.selectedText,
                e.reason, e.timestamp
            ].map(csvField).join(','));
        }
        var blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = '文献摘录_' + new Date().toISOString().slice(0, 10) + '.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // ===== Toast =====
    function showToast(msg) {
        if (!document.body) { console.log('[学术文献摘录助手] ' + msg); return; }
        var existing = $$('.excerpt-toast');
        for (var i = 0; i < existing.length; i++) existing[i].remove();
        var t = document.createElement('div');
        t.className = 'excerpt-toast';
        t.textContent = msg;
        t.style.cssText =
            'position:fixed;bottom:60px;left:50%;transform:translateX(-50%);' +
            'background:#333;color:#fff;padding:10px 24px;border-radius:4px;' +
            'z-index:2147483647;font-size:14px;opacity:0;transition:opacity .3s;' +
            'pointer-events:none;';
        document.body.appendChild(t);
        requestAnimationFrame(function () { t.style.opacity = '1'; });
        setTimeout(function () {
            t.style.opacity = '0';
            setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 300);
        }, 2500);
    }

    // ===== 弹层控制（统一遮罩 + ESC + 点击空白关闭） =====
    function createOverlay(id, bg, zIndex) {
        var ov = document.createElement('div');
        ov.id = id;
        ov.style.cssText =
            'position:fixed;top:0;left:0;width:100%;height:100%;background:' + bg + ';' +
            'z-index:' + zIndex + ';display:flex;align-items:center;justify-content:center;';
        return ov;
    }

    function bindDismiss(overlay, onClose) {
        function close() {
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            document.removeEventListener('keydown', escHandler);
            if (typeof onClose === 'function') onClose();
        }
        function escHandler(e) { if (e.key === 'Escape') close(); }
        overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
        document.addEventListener('keydown', escHandler);
        return close;
    }

    // ===== DeepSeek API =====
    function getPageTextForLLM() {
        var sources = [
            '#XMLContent',
            'section#abstract, div.abstract',
            'section[id*="-abs-"], section[id^="ab"]'
        ];
        for (var i = 0; i < sources.length; i++) {
            var el = $(sources[i]);
            if (el && el.innerText && trim(el.innerText).length > 20) {
                return trim(el.innerText).slice(0, 4000);
            }
        }
        if (document.body) return squashWS(document.body.innerText || '').slice(0, 4000);
        return '';
    }

    function isMetadataSufficient(m) {
        if (!m.title || trim(m.title).length < 3) return false;
        return !!(trim(m.authors) || trim(m.journal));
    }

    function extractWithDeepSeek(apiKey, pageText, modelId) {
        var prompt =
            '你是一个学术文献信息提取助手。请从以下网页文本中提取题录信息，以严格的JSON格式返回。' +
            '需要提取的字段：title（文章标题）、authors（作者，用"; "分隔）、' +
            'journal（期刊名称）、yearIssue（年份和卷期号，如"2023;48(2)"）、' +
            'doi（DOI号）、abstract（摘要全文）。' +
            '仅返回JSON对象，不要Markdown标记。无法确定的字段设为空字符串""。\n\n网页文本：\n' + pageText;

        return fetch(API_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + apiKey
            },
            body: JSON.stringify({
                model: modelId,
                messages: [
                    { role: 'system', content: '你是学术文献信息提取助手，只返回JSON。' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0,
                max_tokens: 2000
            })
        }).then(function (r) {
            if (!r.ok) throw new Error('API 返回状态码 ' + r.status);
            return r.json();
        }).then(function (d) {
            var c = d.choices[0].message.content || '';
            c = c.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '').trim();
            var result = safeParseJSON(c);
            if (!result) throw new Error('无法解析 AI 返回的 JSON');
            return makeMetadata(result);
        });
    }

    function safeParseJSON(raw) {
        try { return JSON.parse(raw); } catch (e) { /* 继续尝试修复 */ }
        var fixed = raw
            .replace(/[\x00-\x1f]/g, function (ch) {
                if (ch === '\n') return '\\n';
                if (ch === '\r') return '\\r';
                if (ch === '\t') return '\\t';
                return '';
            });
        try { return JSON.parse(fixed); } catch (e2) { /* 继续 */ }
        var obj = {};
        var keys = ['title', 'authors', 'journal', 'yearIssue', 'doi', 'pmid', 'abstract'];
        for (var i = 0; i < keys.length; i++) {
            var re = new RegExp('"' + keys[i] + '"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"', 'i');
            var m = fixed.match(re);
            obj[keys[i]] = m ? m[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') : '';
        }
        if (obj.title || obj.authors || obj.journal) return obj;
        return null;
    }

    // ===== 元数据提取器（各站点适配，保留原版选择器与回退顺序） =====
    function extractGeneric() {
        var title = getMetaContent('citation_title') || getMetaContent('dc.title') || '';
        var authors = metaJoinAll('citation_author') || getMetaContent('citation_author');
        var journal = getMetaContent('citation_journal_title') || getMetaContent('dc.source') || '';
        var doi = getMetaContent('citation_doi') || extractDOIFromText();
        var pmid = getMetaContent('citation_pmid') || extractPMIDFromURL();
        var abstract = getMetaContent('description') || getMetaContent('dc.description') || '';
        if (abstract.length < 100) {
            var absEl = $('.abstract, #abstract, [class*="abstract"], [id*="abstract"]');
            if (absEl) abstract = squashWS(absEl.innerText);
        }
        return makeMetadata({
            title: title, authors: authors, journal: journal,
            yearIssue: metaYearIssue(), doi: doi, pmid: pmid, abstract: abstract
        });
    }

    function extractCNKI() {
        var title = '';
        var boxEl = $('section.H-Box-xml, section[class*="H-Box-xml"]');
        if (boxEl) {
            var h1 = boxEl.querySelector('h1');
            title = h1 ? trim(h1.innerText) : trim((boxEl.innerText || '').split('\n')[0]);
        }
        if (!title) {
            var st = $('#PaperRead .study-t');
            if (st) title = trim(st.innerText);
        }

        var authors = '';
        var authorEls = $$('a[href*="/author/"]');
        if (authorEls.length) {
            authors = Array.prototype.map.call(authorEls, function (a) { return trim(a.innerText); }).join('; ');
        }

        var journalEl = $('a.xmlhref, a[class*="xmlhref"]');
        var journal = journalEl ? trim(journalEl.innerText) : '';

        var yearIssue = '';
        if (boxEl) {
            var yi = (boxEl.innerText || '').match(/(\d{4})\s*(\d+)/);
            if (yi) {
                yearIssue = yi[1];
                if (yi[2]) yearIssue += ';' + yi[2];
            }
        }

        var abstract = '';
        var xmlContent = $('#XMLContent');
        var sourceText = xmlContent ? xmlContent.innerText
            : (document.body ? (document.body.innerText || '') : '');
        var cnMatch = sourceText.match(/摘要\s*[：:]\s*([\s\S]*?)\s*关键词\s*[：:]/i);
        if (cnMatch && trim(cnMatch[1]).length > 10) {
            abstract = squashWS(cnMatch[1]);
        } else {
            var enMatch = sourceText.match(/Abstract\s*:\s*([\s\S]*?)\s*Keyword\s*:/i);
            if (enMatch && trim(enMatch[1]).length > 10) abstract = squashWS(enMatch[1]);
            else if (xmlContent) abstract = squashWS(xmlContent.innerText).slice(0, 500);
        }

        return makeMetadata({
            title: title, authors: authors, journal: journal,
            yearIssue: yearIssue, doi: extractDOIFromText(), pmid: '', abstract: abstract
        });
    }

    function extractPubMed() {
        var title = pickFirstText(['h1.heading-title', 'h1']);

        var authors = '';
        var aEls = $$('.authors-list .full-name, .author-name, a[class*="author"]');
        if (aEls.length) {
            authors = Array.prototype.map.call(aEls, function (e) { return trim(e.innerText); }).join('; ');
        }

        var journal = '', yearIssue = '';
        var citeEl = $('.cit, .citation, [class*="cit"]');
        if (citeEl) {
            var cm = citeEl.innerText.match(/(.+?)\.\s*(\d{4})\s*.*?;\s*(\d+)(?:$(\d+)$)?/);
            if (cm) {
                journal = trim(cm[1]);
                yearIssue = cm[2];
                if (cm[3]) yearIssue += ';' + cm[3];
                if (cm[4]) yearIssue += '(' + cm[4] + ')';
            }
        }

        var doi = '';
        var doiEl = $('a[href*="doi.org"], [class*="doi"]');
        if (doiEl) doi = findDOI(doiEl.href || doiEl.innerText || '');
        if (!doi) doi = extractDOIFromText();

        var pmid = extractPMIDFromURL();
        if (!pmid) {
            var pmidEl = $('.current-id, [class*="pmid"], [class*="current-id"]');
            if (pmidEl) {
                var pm = pmidEl.innerText.match(/\d{7,8}/);
                if (pm) pmid = pm[0];
            }
        }

        var abstract = '';
        var absEl = $('#eng-abstract p, .abstract-content, #abstract');
        if (absEl) abstract = squashWS(absEl.innerText);

        return makeMetadata({
            title: title, authors: authors, journal: journal,
            yearIssue: yearIssue, doi: doi, pmid: pmid, abstract: abstract
        });
    }

    function extractPMC() {
        var title = pickFirstText(['h1']) || getMetaContent('citation_title') || '';

        var authors = '';
        var cs = $('section[aria-label="Article citation and metadata"]');
        if (cs) {
            var links = cs.querySelectorAll('a.usa-link:not(.usa-link--external)');
            if (links.length) {
                authors = Array.prototype.map.call(links, function (a) { return trim(a.innerText); })
                    .filter(Boolean).join('; ');
            }
        }
        if (!authors) authors = metaJoinAll('citation_author');

        var journal = getMetaContent('citation_journal_title') || '';
        if (!journal && cs) {
            var jb = cs.querySelector('button');
            if (jb) journal = trim(jb.innerText);
        }

        var doi = getMetaContent('citation_doi') || '';
        if (!doi) {
            var dl = $('a.usa-link.usa-link--external[href*="doi.org"], a[href*="doi.org"]');
            if (dl) doi = findDOI(trim(dl.innerText) || dl.href);
        }
        if (!doi) doi = extractDOIFromText();

        var pmid = getMetaContent('citation_pmid') || '';
        if (!pmid) {
            var pmcM = window.location.href.match(/\/articles\/(PMC\d+)/);
            if (pmcM) pmid = pmcM[1];
        }
        if (!pmid) pmid = extractPMIDFromURL();

        var abstract = '';
        var absS = $('section[id*="-abs-"]');
        if (absS) abstract = squashWS(absS.innerText);
        if (!abstract || abstract.length < 50) {
            var desc = getMetaContent('description') || getMetaContent('dc.description') || '';
            if (desc.length >= 50) abstract = desc;
        }

        return makeMetadata({
            title: title, authors: authors, journal: journal,
            yearIssue: metaYearIssue(), doi: doi, pmid: pmid, abstract: abstract
        });
    }

    // ScienceDirect 作者节点的通用拼装：取 .given-name + .text.surname，否则取整段文本
    function sdAuthorName(el) {
        var g = el.querySelector('.given-name');
        var s = el.querySelector('.text.surname');
        var gn = g ? trim(g.innerText) : '';
        var sn = s ? trim(s.innerText) : '';
        return (gn || sn) ? trim(gn + ' ' + sn) : trim(el.innerText);
    }

    function extractScienceDirect() {
        var title = '';
        var h1El = $('h1');
        if (h1El) title = trim((h1El.innerText || '').split('\n')[0]);

        var authors = '';
        var aLinks = $$('a.anchor-secondary.anchor-underline[href*="/author/"]');
        if (aLinks.length) {
            authors = Array.prototype.map.call(aLinks, sdAuthorName).join('; ');
        }
        if (!authors) {
            var aBtns = $$('button.button-link-secondary.button-link-underline, button.button-link-underline');
            if (aBtns.length) authors = Array.prototype.map.call(aBtns, sdAuthorName).join('; ');
        }

        var journal = '';
        var ptl = $('a.publication-title-link');
        if (ptl) journal = trim(ptl.innerText);
        if (!journal) {
            var jl = $('a.anchor-secondary[href*="/journal/"]');
            if (jl) journal = trim(jl.innerText);
        }
        if (!journal) journal = getMetaContent('citation_journal_title') || getMetaContent('dc.source') || '';

        var doi = '';
        var dls = $('a.doi');
        if (dls) doi = findDOI(trim(dls.innerText) || dls.href);
        if (!doi) {
            var dc = $('div.content-actions-doi-link');
            if (dc) {
                var dca = dc.querySelector('a');
                if (dca) doi = findDOI(trim(dca.innerText) || dca.href);
            }
        }
        if (!doi) doi = getMetaContent('citation_doi') || '';
        if (!doi) doi = extractDOIFromText();

        var pmid = getMetaContent('citation_pmid') || extractPMIDFromURL() || '';

        var abstract = '';
        var absById = $('section#abstract');
        if (absById) abstract = squashWS(absById.innerText);
        if (!abstract || abstract.length < 50) {
            var absDiv = $('div.abstract');
            if (absDiv) {
                var t2 = squashWS(absDiv.innerText);
                if (t2.length >= 50) abstract = t2;
            }
        }
        if (!abstract || abstract.length < 50) {
            var descSD = getMetaContent('description') || getMetaContent('dc.description') || '';
            if (descSD.length >= 50) abstract = descSD;
        }

        return makeMetadata({
            title: title, authors: authors, journal: journal,
            yearIssue: metaYearIssue(), doi: doi, pmid: pmid, abstract: abstract
        });
    }

    function extractJAMA() {
        var title = getMetaContent('citation_title') || '';
        if (!title) {
            var h1J = $('h1, .article-title, [class*="article-title"]');
            if (h1J) title = trim(h1J.innerText);
        }

        var authors = metaJoinAll('citation_author');
        if (!authors) {
            var alJ = $$('.author-name, a[href*="search?author"], a[href*="/author/"], [class*="author-link"], [class*="article-author"]');
            if (alJ.length) {
                authors = Array.prototype.map.call(alJ, function (a) { return trim(a.innerText); }).join('; ');
            }
        }

        var doi = getMetaContent('citation_doi') || '';
        if (!doi) {
            var bodyText = document.body ? (document.body.innerText || '') : '';
            var dm5 = bodyText.match(/doi:\s*(10\.\d{4,}\/[^\s]+)/i);
            if (dm5) doi = dm5[1];
        }
        if (!doi) doi = extractDOIFromText();

        var pmid = getMetaContent('citation_pmid') || extractPMIDFromURL() || '';

        var abstract = '';
        var descJAMA = getMetaContent('description') || getMetaContent('dc.description') || '';
        if (descJAMA && descJAMA.length > 100) abstract = descJAMA;
        if (!abstract || abstract.length < 100) {
            var absC = $('.abstract, #abstract, [class*="abstract-content"], [class*="abstractSection"], section[id*="abstract"]');
            if (absC) abstract = squashWS(absC.innerText);
        }

        return makeMetadata({
            title: title,
            authors: authors,
            journal: getMetaContent('citation_journal_title') || getMetaContent('dc.source') || '',
            yearIssue: metaYearIssue(),
            doi: doi, pmid: pmid, abstract: abstract
        });
    }

    var SITE_EXTRACTORS = [
        { match: 'cnki.net',                 fn: extractCNKI },
        { match: 'pubmed.ncbi.nlm.nih.gov',  fn: extractPubMed },
        { match: 'pmc.ncbi.nlm.nih.gov',     fn: extractPMC },
        { match: 'sciencedirect.com',        fn: extractScienceDirect },
        { match: 'jamanetwork.com',          fn: extractJAMA }
    ];

    function extractMetadata() {
        var url = window.location.href;
        for (var i = 0; i < SITE_EXTRACTORS.length; i++) {
            if (url.indexOf(SITE_EXTRACTORS[i].match) > -1) return SITE_EXTRACTORS[i].fn();
        }
        return extractGeneric();
    }

    // ===== 复制监听 =====
    function isInOwnUI(node) {
        if (!node || !node.parentElement) return false;
        return !!node.parentElement.closest(OWN_UI_SELECTOR);
    }

    function isEditableTarget(el) {
        if (!el) return false;
        return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable;
    }

    // 三秒内同一段文本不重复弹窗
    function dedupAndShow(text) {
        if (!text || text.length < MIN_SELECTION_LENGTH) return;
        if (window.__excerptLastCopied === text) return;
        window.__excerptLastCopied = text;
        setTimeout(function () { window.__excerptLastCopied = ''; }, 3000);
        showCopyConfirmDialog(text);
    }

    // 从 ClipboardEvent 中尽力取出 text/plain
    function readEventClipboardText(e) {
        try {
            if (e && e.clipboardData && typeof e.clipboardData.getData === 'function') {
                return trim(e.clipboardData.getData('text/plain') || '');
            }
        } catch (err) { /* ignore */ }
        return '';
    }

    // 通用 copy 事件处理：选区 + clipboardData 双兜底
    function genericCopyHandler(skipEditableCheck) {
        return function (e) {
            var clipText = readEventClipboardText(e);
            setTimeout(function () {
                if (!skipEditableCheck && isEditableTarget(document.activeElement)) return;
                var selection = window.getSelection();
                var hasSel = selection && !selection.isCollapsed;
                if (hasSel && isInOwnUI(selection.anchorNode)) return;
                var selText = hasSel ? trim(selection.toString()) : '';
                var effective = selText.length >= MIN_SELECTION_LENGTH ? selText : clipText;
                dedupAndShow(effective);
            }, 150);
        };
    }

    function isCNKI() { return window.location.href.indexOf('kns.cnki.net/reader/') > -1; }

    function setupCopyListener() {
        if (isCNKI()) {
            setupCNKIClipboardHijack();
            return;
        }
        document.addEventListener('copy', genericCopyHandler(false), true);
    }

    function readClipboardText() {
        if (!navigator.clipboard || typeof navigator.clipboard.readText !== 'function') {
            return Promise.reject(new Error('clipboard.readText unavailable'));
        }
        return navigator.clipboard.readText().then(function (t) { return trim(t || ''); });
    }

    var __clipboardBaseline = '';

    function tryReadClipboardAndShow() {
        readClipboardText().then(function (text) {
            if (text === __clipboardBaseline) return;
            dedupAndShow(text);
        }).catch(function () { /* 静默 */ });
    }

    function setupCNKIClipboardHijack() {
        readClipboardText().then(function (t) { __clipboardBaseline = t; }).catch(function () {});

        document.addEventListener('copy', genericCopyHandler(true), true);

        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
            var originalWriteText = navigator.clipboard.writeText.bind(navigator.clipboard);
            navigator.clipboard.writeText = function (text) {
                var result = originalWriteText(text);
                var selection = window.getSelection();
                if (selection && !selection.isCollapsed && isInOwnUI(selection.anchorNode)) return result;
                var selText = selection && !selection.isCollapsed ? trim(selection.toString()) : '';
                var effective = selText.length >= MIN_SELECTION_LENGTH ? selText : trim(text || '');
                dedupAndShow(effective);
                return result;
            };
        } else {
            console.warn('[学术文献摘录助手] 当前环境不支持 Clipboard API，CNKI 退回 copy 事件 + 按钮监听。');
        }

        document.addEventListener('click', function (e) {
            var target = e.target;
            if (!target || isInOwnUI(target)) return;
            var hit = false;
            var node = target.closest ? target.closest('button, a, [role="button"], [class*="copy" i], [class*="Copy"], [id*="copy" i], [title*="复制"], [aria-label*="复制"]') : null;
            if (node) {
                var txt = (node.innerText || '') + ' ' + (node.title || '') + ' ' + (node.getAttribute && (node.getAttribute('aria-label') || '')) + ' ' + (node.className || '') + ' ' + (node.id || '');
                if (/复制|copy/i.test(txt)) hit = true;
            }
            if (!hit) return;
            setTimeout(tryReadClipboardAndShow, 120);
            setTimeout(tryReadClipboardAndShow, 450);
        }, true);

        console.log('[学术文献摘录助手] CNKI 剪贴板监听已启用（writeText 劫持 + copy 事件 + 按钮兜底）。');
    }

    // ===== 阶段一：复制确认框 =====
    function showCopyConfirmDialog(selectedText) {
        if (!document.body) return;
        var old = document.getElementById('excerpt-copy-confirm');
        if (old) old.remove();

        var overlay = createOverlay('excerpt-copy-confirm', 'rgba(0,0,0,.3)', 2147483645);
        var dialog = document.createElement('div');
        dialog.style.cssText =
            'background:#fff;border-radius:10px;padding:28px 32px;max-width:520px;width:88%;' +
            'box-shadow:0 6px 30px rgba(0,0,0,.25);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;' +
            'font-size:15px;line-height:1.6;color:#333;';

        var previewText = selectedText.length > 300 ? selectedText.slice(0, 300) + '...' : selectedText;
        dialog.innerHTML =
            '<div style="font-size:17px;font-weight:600;margin-bottom:14px;color:#1976d2;">是否将此文本加入摘录？</div>' +
            '<div style="background:#f5f5f5;border-radius:6px;padding:14px 16px;margin-bottom:20px;' +
            'max-height:180px;overflow-y:auto;font-size:14px;color:#555;line-height:1.7;white-space:pre-wrap;">' +
            escapeHTML(previewText) + '</div>' +
            '<div style="display:flex;justify-content:flex-end;gap:12px;">' +
            '<button id="excerpt-confirm-no" style="padding:9px 22px;border:1px solid #ccc;border-radius:6px;' +
            'background:#fff;color:#555;cursor:pointer;font-size:14px;">取消</button>' +
            '<button id="excerpt-confirm-yes" style="padding:9px 22px;border:none;border-radius:6px;' +
            'background:#1976d2;color:#fff;cursor:pointer;font-size:14px;font-weight:500;">是，摘录此文</button>' +
            '</div>';

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        var close = bindDismiss(overlay);
        $('#excerpt-confirm-no').addEventListener('click', close);
        $('#excerpt-confirm-yes').addEventListener('click', function () {
            close();
            showExcerptDialog(extractMetadata(), selectedText);
        });
    }

    // ===== 阶段二：摘录对话框 =====
    var DIALOG_FIELDS = [
        { label: '标题',      key: 'title' },
        { label: '作者',      key: 'authors' },
        { label: '期刊',      key: 'journal' },
        { label: '年份/期号', key: 'yearIssue' },
        { label: 'DOI',       key: 'doi' },
        { label: 'PMID',      key: 'pmid' },
        { label: '摘要',      key: 'abstract' }
    ];

    function previewAbstract(s) {
        if (!s) return '';
        return s.length > 300 ? s.slice(0, 300) + '...' : s;
    }

    function modelOptionsHTML(currentModel) {
        var html = '';
        for (var i = 0; i < AVAILABLE_MODELS.length; i++) {
            var m = AVAILABLE_MODELS[i];
            html += '<option value="' + escapeAttr(m.id) + '"' +
                (m.id === currentModel ? ' selected' : '') + '>' + escapeHTML(m.label) + '</option>';
        }
        return html;
    }

    function showExcerptDialog(metadata, selectedText) {
        if (!document.body) return;
        var oldDialog = document.getElementById('excerpt-dialog-overlay');
        if (oldDialog) oldDialog.remove();

        var sufficient = isMetadataSufficient(metadata);
        var currentModel = getModel();

        var overlay = createOverlay('excerpt-dialog-overlay', 'rgba(0,0,0,.4)', 2147483646);
        var dialog = document.createElement('div');
        dialog.style.cssText =
            'background:#fff;border-radius:8px;padding:24px;max-width:620px;width:92%;max-height:82vh;' +
            'overflow-y:auto;box-shadow:0 4px 24px rgba(0,0,0,.2);' +
            'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:14px;' +
            'line-height:1.6;color:#333;';

        var fieldsHTML = '';
        for (var fi = 0; fi < DIALOG_FIELDS.length; fi++) {
            var f = DIALOG_FIELDS[fi];
            var raw = metadata[f.key] || '';
            if (f.key === 'abstract') {
                fieldsHTML += '<div style="margin-bottom:8px;"><strong>' + escapeHTML(f.label) + '：</strong>' +
                    '<textarea id="excerpt-field-' + f.key + '" style="width:100%;padding:6px 8px;border:1px solid #ddd;border-radius:4px;font-size:13px;margin-top:4px;resize:vertical;box-sizing:border-box;" rows="3">' +
                    escapeHTML(raw) + '</textarea></div>';
            } else {
                fieldsHTML += '<div style="margin-bottom:8px;"><strong>' + escapeHTML(f.label) + '：</strong>' +
                    '<input id="excerpt-field-' + f.key + '" type="text" value="' + escapeAttr(raw) + '" placeholder="（未提取到，可手动填写）" ' +
                    'style="width:100%;padding:5px 8px;border:1px solid #ddd;border-radius:4px;font-size:13px;margin-top:4px;box-sizing:border-box;"></div>';
            }
        }

        var warningHTML = sufficient ? '' :
            '<div id="excerpt-warning" style="margin-bottom:12px;background:#fff3e0;border-left:4px solid #ff9800;padding:10px 14px;border-radius:4px;font-size:13px;color:#e65100;">' +
            '⚠ 自动提取的题录信息不完整（缺少标题/作者/期刊关键字段）。可尝试使用 DeepSeek AI 增强提取，或手动补全下方字段。' +
            '</div>';

        var deepseekSectionHTML =
            '<div style="margin-top:16px;padding:14px;background:#f9f9f9;border-radius:6px;">' +
            '<div style="font-weight:600;margin-bottom:10px;">DeepSeek AI 增强提取</div>' +
            '<div style="margin-bottom:8px;">' +
            '<label style="font-size:13px;color:#666;">API Key：</label>' +
            '<input id="excerpt-api-key" type="password" placeholder="sk-..." value="' + escapeAttr(getAPIKey()) + '" ' +
            'style="width:100%;padding:6px 10px;border:1px solid #ddd;border-radius:4px;font-size:13px;margin-top:2px;box-sizing:border-box;">' +
            '</div>' +
            '<div style="margin-bottom:8px;">' +
            '<label style="font-size:13px;color:#666;">模型：</label>' +
            '<select id="excerpt-model-select" style="width:100%;padding:6px 10px;border:1px solid #ddd;border-radius:4px;font-size:13px;margin-top:2px;box-sizing:border-box;">' +
            modelOptionsHTML(currentModel) +
            '</select>' +
            '</div>' +
            '<button id="excerpt-deepseek-extract" style="padding:8px 16px;border:none;border-radius:4px;background:#4caf50;color:#fff;cursor:pointer;font-size:13px;">使用 AI 提取</button>' +
            '<span id="excerpt-deepseek-status" style="margin-left:10px;font-size:12px;color:#999;"></span>' +
            '</div>';

        var selectedPreview = selectedText.length > 200 ? selectedText.slice(0, 200) + '...' : selectedText;
        var selectedHTML =
            '<div style="margin-bottom:12px;margin-top:16px;">' +
            '<strong>选中的话：</strong>' +
            '<div style="background:#f5f5f5;border-radius:4px;padding:10px;margin-top:4px;font-size:13px;color:#555;white-space:pre-wrap;max-height:100px;overflow-y:auto;">' +
            escapeHTML(selectedPreview) + '</div>' +
            '</div>';

        var reasonHTML =
            '<div style="margin-bottom:12px;">' +
            '<strong>选中的理由：</strong>' +
            '<textarea id="excerpt-reason" placeholder="（可选）记录为什么摘录这段话" ' +
            'style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;font-size:13px;margin-top:4px;resize:vertical;box-sizing:border-box;" rows="2"></textarea>' +
            '</div>';

        dialog.innerHTML =
            '<div style="font-size:17px;font-weight:600;margin-bottom:16px;color:#1976d2;">文献摘录</div>' +
            warningHTML + fieldsHTML + deepseekSectionHTML + selectedHTML + reasonHTML +
            '<div style="display:flex;justify-content:flex-end;gap:12px;margin-top:16px;">' +
            '<button id="excerpt-dialog-cancel" style="padding:9px 22px;border:1px solid #ccc;border-radius:6px;background:#fff;color:#555;cursor:pointer;font-size:14px;">取消</button>' +
            '<button id="excerpt-dialog-save" style="padding:9px 22px;border:none;border-radius:6px;background:#1976d2;color:#fff;cursor:pointer;font-size:14px;font-weight:500;">保存摘录</button>' +
            '</div>';

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        var close = bindDismiss(overlay);
        $('#excerpt-dialog-cancel').addEventListener('click', close);

        var deepseekBtn = $('#excerpt-deepseek-extract');
        if (deepseekBtn) {
            deepseekBtn.addEventListener('click', function () {
                var inputKey = trim($('#excerpt-api-key').value);
                var selectedModel = $('#excerpt-model-select').value;
                var statusEl = $('#excerpt-deepseek-status');

                if (!inputKey || inputKey.indexOf(API_KEY_VALID_PREFIX) !== 0) {
                    statusEl.textContent = '请先输入有效的 API Key（以 sk- 开头）';
                    statusEl.style.color = '#f44336';
                    return;
                }
                setAPIKey(inputKey);
                setModel(selectedModel);
                statusEl.textContent = '正在提取...';
                statusEl.style.color = '#1976d2';
                deepseekBtn.disabled = true;

                extractWithDeepSeek(inputKey, getPageTextForLLM(), selectedModel)
                    .then(function (result) {
                        for (var i = 0; i < DIALOG_FIELDS.length; i++) {
                            var f = DIALOG_FIELDS[i];
                            var v = result[f.key];
                            if (!v) continue;
                            var el = document.getElementById('excerpt-field-' + f.key);
                            if (!el) continue;
                            if (el.tagName === 'TEXTAREA') el.value = v;
                            else el.value = v;
                            metadata[f.key] = v;
                        }
                        if (isMetadataSufficient(metadata)) {
                            var warnEl = document.getElementById('excerpt-warning');
                            if (warnEl) warnEl.style.display = 'none';
                        }
                        statusEl.textContent = '提取完成';
                        statusEl.style.color = '#4caf50';
                        deepseekBtn.disabled = false;
                    })
                    .catch(function (err) {
                        statusEl.textContent = '提取失败: ' + err.message;
                        statusEl.style.color = '#f44336';
                        deepseekBtn.disabled = false;
                    });
            });
        }

        $('#excerpt-dialog-save').addEventListener('click', function () {
            var entry = {};
            for (var i = 0; i < DIALOG_FIELDS.length; i++) {
                var f = DIALOG_FIELDS[i];
                var el = document.getElementById('excerpt-field-' + f.key);
                entry[f.key] = el ? trim(el.value) : (metadata[f.key] || '');
            }
            entry.selectedText = selectedText;
            entry.reason = trim($('#excerpt-reason').value);
            addEntry(entry);
            close();
            showToast('摘录已保存！共 ' + getEntries().length + ' 条记录。');
        });
    }

    // =====================================================================
    // ==== 管理面板 =======================================================
    // =====================================================================

    function showDashboard() {
        if (!document.body) return;
        if (document.getElementById(DASHBOARD_PREFIX + 'overlay')) return;

        var entries = getEntries();
        var totalExcerpts = entries.length;
        var uniqueArticles = countUniqueArticles(entries);
        var currentModel = getModel();

        var overlay = createOverlay(DASHBOARD_PREFIX + 'overlay', 'rgba(0,0,0,.45)', 2147483646);
        var panel = document.createElement('div');
        panel.style.cssText =
            'background:#fff;border-radius:10px;padding:28px 32px 24px;' +
            'max-width:480px;width:90%;max-height:85vh;overflow-y:auto;' +
            'box-shadow:0 8px 36px rgba(0,0,0,.25);' +
            'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;' +
            'font-size:14px;line-height:1.6;color:#333;';

        var titleHTML =
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">' +
            '<div style="font-size:18px;font-weight:700;color:#1976d2;">学术文献摘录助手 — 管理面板</div>' +
            '<button id="' + DASHBOARD_PREFIX + 'close" style="background:none;border:none;font-size:22px;cursor:pointer;color:#999;padding:0;line-height:1;">&times;</button>' +
            '</div>';

        var statsHTML =
            '<div style="display:flex;gap:16px;margin-bottom:20px;">' +
            '<div style="flex:1;background:#e3f2fd;border-radius:8px;padding:16px;text-align:center;">' +
            '<div style="font-size:28px;font-weight:700;color:#1565c0;">' + totalExcerpts + '</div>' +
            '<div style="font-size:12px;color:#555;margin-top:4px;">摘录条目</div>' +
            '</div>' +
            '<div style="flex:1;background:#e8f5e9;border-radius:8px;padding:16px;text-align:center;">' +
            '<div style="font-size:28px;font-weight:700;color:#2e7d32;">' + uniqueArticles + '</div>' +
            '<div style="font-size:12px;color:#555;margin-top:4px;">去重文献数</div>' +
            '</div>' +
            '</div>';

        var statsNoteHTML = '';
        if (totalExcerpts > 0 && uniqueArticles < totalExcerpts) {
            var avg = (totalExcerpts / uniqueArticles).toFixed(1);
            statsNoteHTML =
                '<div style="font-size:12px;color:#888;margin-bottom:18px;margin-top:-12px;">' +
                '平均每篇文献 ' + avg + ' 条摘录（部分文献包含多条摘录记录）。' +
                '</div>';
        }

        var apiSettingsHTML =
            '<div style="margin-bottom:18px;padding:14px;background:#fafafa;border-radius:8px;">' +
            '<div style="font-weight:600;margin-bottom:10px;font-size:14px;">DeepSeek API 设置</div>' +
            '<div style="margin-bottom:8px;">' +
            '<label style="font-size:12px;color:#666;">API Key</label>' +
            '<input id="' + DASHBOARD_PREFIX + 'api-key" type="password" placeholder="sk-..." value="' + escapeAttr(getAPIKey()) + '" ' +
            'style="width:100%;padding:7px 10px;border:1px solid #ddd;border-radius:4px;font-size:13px;margin-top:3px;box-sizing:border-box;">' +
            '</div>' +
            '<div style="margin-bottom:10px;">' +
            '<label style="font-size:12px;color:#666;">默认模型</label>' +
            '<select id="' + DASHBOARD_PREFIX + 'model-select" style="width:100%;padding:7px 10px;border:1px solid #ddd;border-radius:4px;font-size:13px;margin-top:3px;box-sizing:border-box;">' +
            modelOptionsHTML(currentModel) +
            '</select>' +
            '</div>' +
            '<div style="display:flex;gap:8px;">' +
            '<button id="' + DASHBOARD_PREFIX + 'save-api" style="flex:1;padding:7px 0;border:none;border-radius:4px;background:#4caf50;color:#fff;cursor:pointer;font-size:13px;">保存设置</button>' +
            '<button id="' + DASHBOARD_PREFIX + 'clear-api" style="flex:1;padding:7px 0;border:1px solid #ddd;border-radius:4px;background:#fff;color:#888;cursor:pointer;font-size:13px;">清除 API Key</button>' +
            '</div>' +
            '</div>';

        var syncSettingsHTML =
            '<div style="margin-bottom:18px;padding:14px;background:#f3e5f5;border-radius:8px;">' +
            '<div style="font-weight:600;margin-bottom:10px;font-size:14px;">云同步设置（GitHub Gist）</div>' +
            '<div style="margin-bottom:10px;">' +
            '<label style="font-size:12px;color:#666;">GitHub 私人令牌</label>' +
            '<input id="' + DASHBOARD_PREFIX + 'sync-token" type="password" placeholder="ghp_... (Settings → Developer settings → Personal access tokens)" value="' + escapeAttr(getGithubToken()) + '" ' +
            'style="width:100%;padding:7px 10px;border:1px solid #ddd;border-radius:4px;font-size:13px;margin-top:3px;box-sizing:border-box;">' +
            '</div>' +
            '<div style="display:flex;gap:8px;">' +
            '<button id="' + DASHBOARD_PREFIX + 'sync-save" style="flex:1;padding:7px 0;border:none;border-radius:4px;background:#6a1b9a;color:#fff;cursor:pointer;font-size:13px;">保存令牌</button>' +
            '<button id="' + DASHBOARD_PREFIX + 'sync-now" style="flex:1;padding:7px 0;border:none;border-radius:4px;background:#00796b;color:#fff;cursor:pointer;font-size:13px;">立即同步</button>' +
            '</div>' +
            '</div>';

        var actionsHTML =
            '<div style="display:flex;flex-direction:column;gap:10px;">' +
            '<button id="' + DASHBOARD_PREFIX + 'export" style="width:100%;padding:10px 0;border:1px solid #1976d2;border-radius:6px;background:#fff;color:#1976d2;cursor:pointer;font-size:14px;font-weight:500;">导出 CSV</button>' +
            '<button id="' + DASHBOARD_PREFIX + 'export-json" style="width:100%;padding:10px 0;border:1px solid #6a1b9a;border-radius:6px;background:#fff;color:#6a1b9a;cursor:pointer;font-size:14px;font-weight:500;">导出全部数据（JSON）</button>' +
            '<button id="' + DASHBOARD_PREFIX + 'import-json" style="width:100%;padding:10px 0;border:1px solid #00796b;border-radius:6px;background:#fff;color:#00796b;cursor:pointer;font-size:14px;font-weight:500;">导入数据（JSON）</button>' +
            '<button id="' + DASHBOARD_PREFIX + 'clear" style="width:100%;padding:10px 0;border:1px solid #e53935;border-radius:6px;background:#fff;color:#e53935;cursor:pointer;font-size:14px;font-weight:500;">清除全部摘录数据</button>' +
            '</div>';

        panel.innerHTML = titleHTML + statsHTML + statsNoteHTML + apiSettingsHTML + syncSettingsHTML + actionsHTML;
        overlay.appendChild(panel);
        document.body.appendChild(overlay);

        var close = bindDismiss(overlay);
        $('#' + DASHBOARD_PREFIX + 'close').addEventListener('click', close);

        $('#' + DASHBOARD_PREFIX + 'save-api').addEventListener('click', function () {
            var newKey = trim($('#' + DASHBOARD_PREFIX + 'api-key').value);
            if (newKey && newKey.indexOf(API_KEY_VALID_PREFIX) !== 0) {
                showToast('API Key 应以 sk- 开头，请检查后重新输入。');
                return;
            }
            if (newKey) setAPIKey(newKey);
            setModel($('#' + DASHBOARD_PREFIX + 'model-select').value);
            showToast('API 设置已保存。');
        });

        $('#' + DASHBOARD_PREFIX + 'clear-api').addEventListener('click', function () {
            clearAPIKey();
            $('#' + DASHBOARD_PREFIX + 'api-key').value = '';
            showToast('API Key 已清除。');
        });

        $('#' + DASHBOARD_PREFIX + 'sync-save').addEventListener('click', function () {
            var t = trim($('#' + DASHBOARD_PREFIX + 'sync-token').value);
            if (!t) {
                showToast('请填写 GitHub 私人令牌。');
                return;
            }
            setGithubToken(t);
            showToast('GitHub 令牌已保存。');
        });

        $('#' + DASHBOARD_PREFIX + 'sync-now').addEventListener('click', function () {
            var btn = $('#' + DASHBOARD_PREFIX + 'sync-now');
            btn.disabled = true;
            btn.textContent = '同步中...';
            doSync().then(function (result) {
                btn.disabled = false;
                btn.textContent = '立即同步';
                showToast('同步完成！' + (result.added > 0 ? '从云端新增 ' + result.added + ' 条摘录。' : '数据已是最新。'));
            }).catch(function (err) {
                btn.disabled = false;
                btn.textContent = '立即同步';
                showToast('同步失败: ' + err.message);
            });
        });

        $('#' + DASHBOARD_PREFIX + 'export').addEventListener('click', exportCSV);

        $('#' + DASHBOARD_PREFIX + 'export-json').addEventListener('click', function () {
            var data = {
                version: 1,
                apiKey: getAPIKey(),
                model: getModel(),
                entries: getEntries()
            };
            var json = JSON.stringify(data, null, 2);
            var blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = '文献摘录助手_全部数据_' + new Date().toISOString().slice(0, 10) + '.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast('全部数据已导出为 JSON 文件。');
        });

        $('#' + DASHBOARD_PREFIX + 'import-json').addEventListener('click', function () {
            var input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json,application/json';
            input.style.display = 'none';
            input.addEventListener('change', function () {
                var file = input.files && input.files[0];
                if (!file) return;
                var reader = new FileReader();
                reader.onload = function () {
                    try {
                        var data = JSON.parse(reader.result);
                        var imported = 0;
                        if (data.apiKey && trim(data.apiKey).indexOf(API_KEY_VALID_PREFIX) === 0) {
                            setAPIKey(data.apiKey);
                        }
                        if (data.model) setModel(data.model);
                        if (Array.isArray(data.entries) && data.entries.length > 0) {
                            var existing = getEntries();
                            var existingSet = {};
                            for (var i = 0; i < existing.length; i++) {
                                existingSet[existing[i].timestamp + '|' + (existing[i].selectedText || '').slice(0, 50)] = true;
                            }
                            for (var j = 0; j < data.entries.length; j++) {
                                var e = data.entries[j];
                                var key = (e.timestamp || '') + '|' + (e.selectedText || '').slice(0, 50);
                                if (!existingSet[key]) {
                                    existing.push(e);
                                    imported++;
                                }
                            }
                            saveEntries(existing);
                        }
                        overlay.remove();
                        showToast('导入完成！API 设置已更新' + (imported > 0 ? '，新增 ' + imported + ' 条摘录。' : '，无新增摘录（已去重）。'));
                    } catch (err) {
                        showToast('导入失败：文件格式不正确。');
                    }
                };
                reader.readAsText(file);
            });
            document.body.appendChild(input);
            input.click();
            document.body.removeChild(input);
        });

        $('#' + DASHBOARD_PREFIX + 'clear').addEventListener('click', function () {
            var confirmed = confirm(
                '确认清除全部摘录数据？\n\n' +
                '当前共有 ' + totalExcerpts + ' 条摘录条目（来自 ' + uniqueArticles + ' 篇文献）。\n' +
                '此操作不可撤销，建议先导出 CSV 备份。\n\n是否继续？'
            );
            if (confirmed) {
                saveEntries([]);
                close();
                showToast('全部摘录数据已清除。');
            }
        });
    }

    // ===== 右下角悬浮管理按钮 =====
    function injectFloatingButton() {
        if (!document.body || document.getElementById('excerpt-main-btn')) return;

        var btn = document.createElement('div');
        btn.id = 'excerpt-main-btn';
        btn.title = '学术文献摘录助手 — 管理面板';
        btn.style.cssText =
            'position:fixed;bottom:24px;right:24px;z-index:2147483640;' +
            'width:44px;height:44px;border-radius:50%;background:#1976d2;color:#fff;' +
            'display:flex;align-items:center;justify-content:center;cursor:pointer;' +
            'box-shadow:0 2px 12px rgba(25,118,210,.4);transition:transform .2s,box-shadow .2s;' +
            'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;user-select:none;';
        btn.innerHTML = '<span style="font-size:20px;line-height:1;">&#9881;</span>';

        btn.addEventListener('mouseenter', function () {
            btn.style.transform = 'scale(1.1)';
            btn.style.boxShadow = '0 4px 18px rgba(25,118,210,.55)';
        });
        btn.addEventListener('mouseleave', function () {
            btn.style.transform = 'scale(1)';
            btn.style.boxShadow = '0 2px 12px rgba(25,118,210,.4)';
        });
        btn.addEventListener('click', showDashboard);

        document.body.appendChild(btn);
    }

    // ===== 启动 =====
    onDOMReady(function () {
        setupCopyListener();
        injectFloatingButton();
        showToast('学术文献摘录助手已启动 — 选中文本并复制即可摘录');
        console.log('[学术文献摘录助手] 已启动 | 页面: ' + window.location.href);

        if (isSyncConfigured() && getEntries().length === 0) {
            doSync().then(function (result) {
                if (result.added > 0) {
                    console.log('[学术文献摘录助手] 自动同步完成，从云端拉取 ' + result.added + ' 条摘录。');
                }
            }).catch(function () { /* 静默失败 */ });
        }
    });

})();