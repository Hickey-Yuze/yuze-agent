(function() {
'use strict';
if (!document.getElementById('__TAB_APP_MOUNTED_GUARD__')) return;
if (window.__tbQuickLinksLoaded) return;
window.__tbQuickLinksLoaded = true;
function isStillHomePage() {
return !!document.getElementById('__TAB_APP_MOUNTED_GUARD__');
}
const CONFIG = {
STORAGE_KEY: 'quickLinksConfig',
ICON_SOURCES_KEY: 'iconSourcesConfig',
GITHUB_ICON_LIBS_KEY: 'githubIconLibsCache',
GITHUB_LIBRARIES_KEY: 'githubLibrariesConfig',
GAP_CONFIG_KEY: 'quickLinksGapConfig',
BTN_SIZE_KEY: 'quickLinksBtnSizeConfig',
BTN_RADIUS_KEY: 'quickLinksBtnRadiusConfig',
BTN_HEIGHT_KEY: 'quickLinksBtnHeightConfig',
PANEL_OPEN_KEY: 'quickLinksPanelOpen',
BTN_SIZE: 100,
GAP: 20,
MIN_GAP: 0,
MAX_GAP: 60,
MIN_SIZE: 60,
MAX_SIZE: 140,
MIN_RADIUS: 8,
MAX_RADIUS: 50,
MIN_HEIGHT: 60,
MAX_HEIGHT: 140,
RENDER_DELAY: 200,
MAX_RETRY: 20,
RETRY_INTERVAL: 500,
MAX_CONCURRENT_REQUESTS: 3,
CACHE_TTL: 24 * 60 * 60 * 1000,
DEFAULT_LINKS: [
{ name: 'GitHub',  url: 'https://github.com',       icon: 'https://www.google.com/s2/favicons?domain=github.com&sz=128',      openMethod: 'newTab' }
],
OPEN_METHODS: [
{ id: 'newTab',     label: '新标签页打开', icon: '🔗' },
{ id: 'currentTab', label: '当前页面打开', icon: '📄' }
],
DEFAULT_GITHUB_LIBRARIES: [
{ id: 'github-mini',   name: 'Mini Icons (Orz-3)', enabled: true, url: 'https://raw.githubusercontent.com/Orz-3/mini/master/mini.json', type: 'github-library' },
{ id: 'github-fmz200', name: 'fmz200 图标库',      enabled: true, url: 'https://raw.githubusercontent.com/fmz200/wool_scripts/main/icons/icons-all.json', type: 'github-library' },
{ id: 'github-fmz200', name: 'Hand Painted Icon',  enabled: true, url: 'https://raw.githubusercontent.com/Semporia/Hand-Painted-icon/master/Semporia.json', type: 'github-library' }
],
DEFAULT_ICON_SOURCES: [
{ id: 'google',    name: 'Google Favicon', enabled: true, urlTemplate: 'https://www.google.com/s2/favicons?domain={domain}&sz=128' },
{ id: 'iconhorse', name: 'IconHorse',       enabled: true, urlTemplate: 'https://icon.horse/icon/{domain}' },
{ id: 'splitbee',  name: 'Splitbee',        enabled: true, urlTemplate: 'https://favicon.splitbee.io/?url={domain}' },
{ id: 'allesedv',  name: 'Alles Edv',       enabled: true, urlTemplate: 'https://f1.allesedv.com/128/{domain}' },
{ id: 'unavatar',  name: 'Unavatar',        enabled: true, urlTemplate: 'https://unavatar.io/{domain}?fallback=false' },
{ id: 'direct',    name: 'Direct Favicon',  enabled: true, urlTemplate: 'https://{domain}/favicon.ico' }
]
};
const NOISE_NAME_RE = /^(\d+|[a-z]|test\d*|demo\d*|icon\d*|img\d*|image\d*|logo\d*|default\d*|unnamed|untitled)$/i;
const STATE = {
configCache: null,
iconSourcesCache: null,
githubLibsCache: null,
githubLibrariesCache: null,
gapCache: null,
btnSizeCache: null,
btnRadiusCache: null,
btnHeightCache: null,
containerRef: null,
retryCount: 0,
dragState: null,
currentSearchController: null,
isDestroyed: false,
retryTimer: null,
debounceTimer: null,
activeRequests: new Set(),
eventListeners: new Map(),
domObservers: new Set(),
imageCache: new Map(),
isDark: false
};
const UTILS = {
isNoisyIconName: function(rawName) {
if (!rawName) return true;
var base = rawName.replace(/\.[^.]+$/, '').replace(/[_\-\s]+/g, '').toLowerCase();
return NOISE_NAME_RE.test(base);
},
isValidUrl: function(url) {
try { var u = new URL(url); return u.protocol === 'http:' || u.protocol === 'https:'; } catch(e) { return false; }
},
isIconUrl: function(icon) {
return icon && (icon.startsWith('http://') || icon.startsWith('https://') || icon.startsWith('data:'));
},
generateId: function() {
return 'custom_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
},
extractDomainInfo: function(url) {
try {
var parsedUrl = new URL(url);
var hostname = parsedUrl.hostname.replace(/^www\./, '');
var parts = hostname.split('.');
var twoLevelTlds = ['.co.uk', '.com.cn', '.net.cn', '.org.cn', '.ac.uk', '.gov.uk', '.edu.cn'];
var domainName = '';
for (var i = 0; i < twoLevelTlds.length; i++) {
if (hostname.endsWith(twoLevelTlds[i])) { domainName = parts[parts.length - 3] || parts[0]; break; }
}
if (!domainName) domainName = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
return { hostname: hostname, domainName: domainName, fullDomain: hostname };
} catch(e) { return null; }
},
extractNameFromUrl: function(url) {
try {
var info = UTILS.extractDomainInfo(url);
if (!info) return '';
return info.domainName.charAt(0).toUpperCase() + info.domainName.slice(1);
} catch(e) { return ''; }
},
getFaviconFallback: function(url) {
try {
var info = UTILS.extractDomainInfo(url);
if (!info) return '';
return 'https://www.google.com/s2/favicons?domain=' + info.hostname + '&sz=128';
} catch(e) { return ''; }
},
normalizeIconName: function(name) {
return name.toLowerCase().replace(/\.[^.]+$/, '').replace(/[_\-\s]+/g, '').replace(/副本|copy/gi, '').replace(/\d+$/, '').trim();
}
};
const STORAGE = {
getAllConfigKeys: function() {
return [
CONFIG.STORAGE_KEY, CONFIG.ICON_SOURCES_KEY, CONFIG.GITHUB_ICON_LIBS_KEY,
CONFIG.GITHUB_LIBRARIES_KEY, CONFIG.GAP_CONFIG_KEY, CONFIG.BTN_SIZE_KEY,
CONFIG.BTN_RADIUS_KEY, CONFIG.BTN_HEIGHT_KEY
];
},
loadConfig: function() {
if (STATE.configCache) return STATE.configCache;
try {
var raw = localStorage.getItem(CONFIG.STORAGE_KEY);
var data = raw ? JSON.parse(raw) : CONFIG.DEFAULT_LINKS;
STATE.configCache = Array.isArray(data) ? data.filter(function(item) { return item && item.url && item.url.trim(); }) : CONFIG.DEFAULT_LINKS.slice();
} catch(e) { STATE.configCache = CONFIG.DEFAULT_LINKS.slice(); }
return STATE.configCache;
},
saveConfig: function(config) {
STATE.configCache = config;
try { localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(config)); return true; } catch(e) { return false; }
},
loadGapConfig: function() {
if (STATE.gapCache !== null) return STATE.gapCache;
try { var r = localStorage.getItem(CONFIG.GAP_CONFIG_KEY); STATE.gapCache = Math.max(CONFIG.MIN_GAP, Math.min(CONFIG.MAX_GAP, r ? parseInt(r, 10) : CONFIG.GAP)); } catch(e) { STATE.gapCache = CONFIG.GAP; }
return STATE.gapCache;
},
saveGapConfig: function(gap) {
STATE.gapCache = Math.max(CONFIG.MIN_GAP, Math.min(CONFIG.MAX_GAP, gap));
try { localStorage.setItem(CONFIG.GAP_CONFIG_KEY, String(STATE.gapCache)); return true; } catch(e) { return false; }
},
loadBtnSizeConfig: function() {
if (STATE.btnSizeCache !== null) return STATE.btnSizeCache;
try { var r = localStorage.getItem(CONFIG.BTN_SIZE_KEY); STATE.btnSizeCache = Math.max(CONFIG.MIN_SIZE, Math.min(CONFIG.MAX_SIZE, r ? parseInt(r, 10) : CONFIG.BTN_SIZE)); } catch(e) { STATE.btnSizeCache = CONFIG.BTN_SIZE; }
return STATE.btnSizeCache;
},
saveBtnSizeConfig: function(size) {
STATE.btnSizeCache = Math.max(CONFIG.MIN_SIZE, Math.min(CONFIG.MAX_SIZE, size));
try { localStorage.setItem(CONFIG.BTN_SIZE_KEY, String(STATE.btnSizeCache)); return true; } catch(e) { return false; }
},
loadBtnRadiusConfig: function() {
if (STATE.btnRadiusCache !== null) return STATE.btnRadiusCache;
try { var r = localStorage.getItem(CONFIG.BTN_RADIUS_KEY); STATE.btnRadiusCache = Math.max(CONFIG.MIN_RADIUS, Math.min(CONFIG.MAX_RADIUS, r ? parseInt(r, 10) : 28)); } catch(e) { STATE.btnRadiusCache = 28; }
return STATE.btnRadiusCache;
},
saveBtnRadiusConfig: function(radius) {
STATE.btnRadiusCache = Math.max(CONFIG.MIN_RADIUS, Math.min(CONFIG.MAX_RADIUS, radius));
try { localStorage.setItem(CONFIG.BTN_RADIUS_KEY, String(STATE.btnRadiusCache)); return true; } catch(e) { return false; }
},
loadBtnHeightConfig: function() {
if (STATE.btnHeightCache !== null) return STATE.btnHeightCache;
try { var r = localStorage.getItem(CONFIG.BTN_HEIGHT_KEY); STATE.btnHeightCache = Math.max(CONFIG.MIN_HEIGHT, Math.min(CONFIG.MAX_HEIGHT, r ? parseInt(r, 10) : CONFIG.BTN_SIZE)); } catch(e) { STATE.btnHeightCache = CONFIG.BTN_SIZE; }
return STATE.btnHeightCache;
},
saveBtnHeightConfig: function(height) {
STATE.btnHeightCache = Math.max(CONFIG.MIN_HEIGHT, Math.min(CONFIG.MAX_HEIGHT, height));
try { localStorage.setItem(CONFIG.BTN_HEIGHT_KEY, String(STATE.btnHeightCache)); return true; } catch(e) { return false; }
},
loadIconSources: function() {
if (STATE.iconSourcesCache) return STATE.iconSourcesCache;
try { var r = localStorage.getItem(CONFIG.ICON_SOURCES_KEY); var d = r ? JSON.parse(r) : null; STATE.iconSourcesCache = (d && Array.isArray(d)) ? d : CONFIG.DEFAULT_ICON_SOURCES.slice(); } catch(e) { STATE.iconSourcesCache = CONFIG.DEFAULT_ICON_SOURCES.slice(); }
return STATE.iconSourcesCache;
},
saveIconSources: function(sources) {
STATE.iconSourcesCache = sources;
try { localStorage.setItem(CONFIG.ICON_SOURCES_KEY, JSON.stringify(sources)); return true; } catch(e) { return false; }
},
loadGithubLibraries: function() {
if (STATE.githubLibrariesCache) return STATE.githubLibrariesCache;
try { var r = localStorage.getItem(CONFIG.GITHUB_LIBRARIES_KEY); var d = r ? JSON.parse(r) : null; STATE.githubLibrariesCache = (d && Array.isArray(d)) ? d : CONFIG.DEFAULT_GITHUB_LIBRARIES.slice(); } catch(e) { STATE.githubLibrariesCache = CONFIG.DEFAULT_GITHUB_LIBRARIES.slice(); }
return STATE.githubLibrariesCache;
},
saveGithubLibraries: function(libraries) {
STATE.githubLibrariesCache = libraries;
try { localStorage.setItem(CONFIG.GITHUB_LIBRARIES_KEY, JSON.stringify(libraries)); return true; } catch(e) { return false; }
},
loadGithubLibs: function() {
if (STATE.githubLibsCache) return STATE.githubLibsCache;
try { var r = localStorage.getItem(CONFIG.GITHUB_ICON_LIBS_KEY); STATE.githubLibsCache = r ? JSON.parse(r) : {}; } catch(e) { STATE.githubLibsCache = {}; }
return STATE.githubLibsCache;
},
saveGithubLibs: function(libs) {
STATE.githubLibsCache = libs;
try { localStorage.setItem(CONFIG.GITHUB_ICON_LIBS_KEY, JSON.stringify(libs)); return true; } catch(e) { return false; }
},
clearAll: function() {
STORAGE.getAllConfigKeys().forEach(function(k) { localStorage.removeItem(k); });
STATE.configCache = null; STATE.iconSourcesCache = null;
STATE.githubLibsCache = null; STATE.githubLibrariesCache = null;
STATE.gapCache = null; STATE.btnSizeCache = null;
STATE.btnRadiusCache = null; STATE.btnHeightCache = null;
}
};
const ICON = {
cleanExpiredCache: function() {
var libs = STORAGE.loadGithubLibs(), now = Date.now();
Object.keys(libs).forEach(function(key) { if (libs[key] && libs[key].timestamp && now - libs[key].timestamp > CONFIG.CACHE_TTL * 7) delete libs[key]; });
STORAGE.saveGithubLibs(libs);
if (STATE.imageCache.size > 100) Array.from(STATE.imageCache.entries()).slice(0, 50).forEach(function(entry) { STATE.imageCache.delete(entry[0]); });
},
fetchGithubIconLibrary: async function(url) {
if (STATE.isDestroyed) return null;
var libs = STORAGE.loadGithubLibs();
if (libs[url] && libs[url].timestamp && Date.now() - libs[url].timestamp < CONFIG.CACHE_TTL) return libs[url].data;
while (STATE.activeRequests.size >= CONFIG.MAX_CONCURRENT_REQUESTS) {
await new Promise(function(r) { setTimeout(r, 100); });
if (STATE.isDestroyed) return null;
}
var requestId = Date.now() + Math.random();
STATE.activeRequests.add(requestId);
try {
var response = await fetch(url);
if (STATE.isDestroyed) return null;
var data = await response.json();
libs[url] = { data: data, timestamp: Date.now() };
STORAGE.saveGithubLibs(libs);
return data;
} catch(error) { return null; }
finally { STATE.activeRequests.delete(requestId); }
},
matchIconFromLibrary: function(iconLibrary, domainInfo) {
if (!iconLibrary || !iconLibrary.icons || !domainInfo) return [];
var results = [];
var normalizedDomainName = UTILS.normalizeIconName(domainInfo.domainName);
var normalizedHostname   = UTILS.normalizeIconName(domainInfo.hostname);
var searchPatterns = [normalizedDomainName, normalizedHostname, domainInfo.domainName.toLowerCase(), domainInfo.hostname.toLowerCase()];
for (var i = 0; i < iconLibrary.icons.length; i++) {
var icon = iconLibrary.icons[i];
if (UTILS.isNoisyIconName(icon.name)) continue;
var normalizedIconName = UTILS.normalizeIconName(icon.name);
if (normalizedIconName.length < 2) continue;
for (var j = 0; j < searchPatterns.length; j++) {
var pattern = searchPatterns[j];
if (!pattern || pattern.length < 2) continue;
if (normalizedIconName.includes(pattern) || pattern.includes(normalizedIconName)) {
results.push({
id: 'github-lib-' + icon.name,
url: icon.url,
source: iconLibrary.name || 'GitHub Library',
type: 'github-library',
originalName: icon.name,
matchType: normalizedIconName === pattern ? 'exact' : 'partial',
matchScore: normalizedIconName === pattern ? 100 : normalizedIconName.includes(pattern) ? 80 : 60
});
break;
}
}
}
return results.sort(function(a, b) { return b.matchScore - a.matchScore; });
},
searchIcons: async function(urlHint) {
var results = [];
if (!urlHint || STATE.isDestroyed) return results;
var domainInfo = UTILS.extractDomainInfo(urlHint);
if (!domainInfo) return results;
var sources = STORAGE.loadIconSources(), enabledSources = sources.filter(function(s) { return s.enabled && s.urlTemplate; });
enabledSources.forEach(function(source) {
var u1 = source.urlTemplate.replace(/{domain}/g, domainInfo.hostname);
var u2 = source.urlTemplate.replace(/{domain}/g, domainInfo.hostname).replace(/{domainName}/g, domainInfo.domainName);
results.push({ id: source.id + '-domain', url: u1, source: source.name, type: 'api', priority: 2, matchScore: 50 });
if (u2 !== u1) results.push({ id: source.id + '-domainName', url: u2, source: source.name, type: 'api', priority: 2, matchScore: 50 });
});
var githubLibraries = STORAGE.loadGithubLibraries(), enabledLibraries = githubLibraries.filter(function(lib) { return lib.enabled; });
for (var k = 0; k < enabledLibraries.length; k++) {
if (STATE.isDestroyed) break;
var lib = enabledLibraries[k];
try {
var iconData = await ICON.fetchGithubIconLibrary(lib.url);
if (iconData && !STATE.isDestroyed) {
var matchedIcons = ICON.matchIconFromLibrary(iconData, domainInfo);
matchedIcons.forEach(function(icon) {
icon.source = lib.name; icon.priority = 1;
if (!results.find(function(r) { return r.url === icon.url; })) results.push(icon);
});
}
} catch(error) {}
}
return results.sort(function(a, b) { return (a.priority || 2) - (b.priority || 2) || (b.matchScore || 0) - (a.matchScore || 0); });
}
};
const UI = {
applyDarkToEl: function(el) {
if (!el) return;
if (STATE.isDark) el.classList.add('ql-dark');
else el.classList.remove('ql-dark');
},
addManagedListener: function(target, event, handler, options) {
if (STATE.isDestroyed) return null;
target.addEventListener(event, handler, options);
if (!STATE.eventListeners.has(target)) STATE.eventListeners.set(target, []);
STATE.eventListeners.get(target).push({ event: event, handler: handler, options: options });
return handler;
},
removeAllListeners: function() {
STATE.eventListeners.forEach(function(listeners, target) {
listeners.forEach(function(item) { target.removeEventListener(item.event, item.handler, item.options); });
});
STATE.eventListeners = new Map();
},
findAnchor: function() {
var el = document.querySelector('.theme-input-container');
if (el) return el;
var candidates = document.querySelectorAll('[class*="input"]');
for (var i = 0; i < candidates.length; i++) {
var c = candidates[i];
if (c.tagName === 'INPUT' || c.tagName === 'TEXTAREA') continue;
var cls = c.className || '';
if (typeof cls === 'string' && cls.indexOf('tbb-') !== -1) continue;
if (typeof cls === 'string' && cls.indexOf('ql-') !== -1) continue;
return c;
}
return null;
},
injectStyle: function() {
if (document.getElementById('ql-style') || STATE.isDestroyed) return;
var style = document.createElement('style');
style.id = 'ql-style';
style.textContent =
'.ql-container { display: flex; flex-wrap: wrap; gap: 20px; margin: 12px auto 16px; max-width: 900px; justify-content: center; align-items: center; }'+'.ql-btn { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 28px; border: 1px solid rgba(142,142,160,0.2); background: rgba(255,255,255,0.7); cursor: grab; transition: background 0.2s cubic-bezier(.4,0,.2,1), border-color 0.2s, box-shadow 0.2s, opacity 0.2s; padding: 8px 4px; box-sizing: border-box; flex-shrink: 0; overflow: hidden; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); outline: none; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; user-select: none; }'+'.ql-btn:hover { background: rgba(255,255,255,0.95); border-color: rgba(99,102,241,0.4); box-shadow: 0 6px 20px rgba(99,102,241,0.15); transform: translateY(-3px); }'+'.ql-btn:active { box-shadow: 0 2px 8px rgba(0,0,0,0.1); }'+'.ql-btn.configured { border-color: rgba(99,102,241,0.25); background: rgba(238,240,255,0.6); }'+'.ql-btn.configured:hover { border-color: rgba(99,102,241,0.5); background: rgba(238,240,255,0.9); }'+'.ql-btn.ql-dragging { visibility: hidden; cursor: grabbing; z-index: 10; }'+'.ql-btn.ql-flip-animating { transition: transform 0.22s cubic-bezier(.4,0,.2,1) !important; }'+'.ql-btn.ql-flip-animating:hover { transform: none !important; }'+'.ql-btn .ql-icon { font-size: 28px; line-height: 1; margin-bottom: 6px; pointer-events: none; }'+'.ql-btn .ql-icon-img { width: 32px; height: 32px; object-fit: contain; margin-bottom: 6px; pointer-events: none; }'+'.ql-btn .ql-plus { font-size: 32px; color: #b0b4c0; font-weight: 300; line-height: 1; pointer-events: none; }'+'.ql-btn .ql-name { font-size: 12px; color: #6b7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; text-align: center; line-height: 1.2; pointer-events: none; }'+'.ql-add-btn { border-style: dashed; border-color: rgba(142,142,160,0.3); cursor: pointer; }'+'.ql-add-btn:hover { border-color: rgba(99,102,241,0.5); background: rgba(238,240,255,0.4); }'+'.ql-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 2147483647; animation: ql-fadeIn 0.15s ease; }'+'@keyframes ql-fadeIn { from { opacity: 0 } to { opacity: 1 } }'+'@keyframes ql-slideUp { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: translateY(0) } }'+'@keyframes ql-spin { to { transform: rotate(360deg); } }'+'.ql-modal { background: #fff; border-radius: 20px; padding: 24px 24px 16px; width: 420px; max-width: 90vw; max-height: 90vh; overflow-y: auto; box-shadow: 0 24px 80px rgba(0,0,0,0.2); animation: ql-slideUp 0.2s ease; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; box-sizing: border-box; position: relative; }'+'.ql-modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }'+'.ql-modal-title { font-size: 16px; font-weight: 600; color: #1f2937; margin: 0; flex: 1; }'+'.ql-modal label { display: block; font-size: 12px; font-weight: 500; color: #6b7280; margin-bottom: 6px; }'+'.ql-modal input[type="text"] { width: 100%; padding: 10px 14px; border: 1.5px solid #e5e7eb; border-radius: 12px; font-size: 14px; outline: none; transition: border-color 0.15s; box-sizing: border-box; background: #fafbfc; margin-bottom: 12px; height: 44px; }'+'.ql-modal input[type="text"]:focus { border-color: #6366f1; background: #fff; }'+'.ql-modal-divider { height: 1px; background: #e5e7eb; margin: 4px 0 16px; }'+'.ql-icon-suggestions { margin-bottom: 12px; display: none; }'+'.ql-icon-suggestions.visible { display: block; animation: ql-fadeIn 0.2s ease; }'+'.ql-suggestion-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }'+'.ql-suggestion-header label { margin-bottom: 0; }'+'.ql-suggestion-status { font-size: 11px; color: #9ca3af; display: flex; align-items: center; gap: 4px; }'+'.ql-suggestion-status.loading { color: #6366f1; }'+'.ql-suggestion-status.loading::before { content: ""; width: 10px; height: 10px; border: 2px solid #e0e7ff; border-top-color: #6366f1; border-radius: 50%; animation: ql-spin 0.8s linear infinite; }'+'.ql-suggestion-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(52px, 1fr)); gap: 8px; margin-bottom: 8px; max-height: 320px; overflow-y: auto; padding: 10px; background: #f9fafb; border-radius: 14px; }'+'.ql-suggestion-grid::-webkit-scrollbar { width: 5px; }'+'.ql-suggestion-grid::-webkit-scrollbar-track { background: transparent; }'+'.ql-suggestion-grid::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.2); border-radius: 3px; }'+'.ql-suggestion-grid::-webkit-scrollbar-thumb:hover { background: rgba(99,102,241,0.4); }'+'.ql-suggestion-item { width: 100%; aspect-ratio: 1; border-radius: 12px; border: 2px solid #e5e7eb; background: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s ease; padding: 6px; box-sizing: border-box; overflow: hidden; position: relative; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }'+'.ql-suggestion-item:hover { border-color: #a5b4fc; background: #eef2ff; transform: scale(1.08); box-shadow: 0 3px 10px rgba(99,102,241,0.18); }'+'.ql-suggestion-item.selected { border-color: #6366f1; background: #e0e7ff; box-shadow: 0 0 0 3px rgba(99,102,241,0.2); }'+'.ql-suggestion-item.github-library { border-color: #f59e0b; background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); }'+'.ql-suggestion-item.github-library:hover { border-color: #d97706; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); }'+'.ql-suggestion-item.github-library.selected { border-color: #d97706; background: linear-gradient(135deg, #fde68a 0%, #fcd34d 100%); }'+'.ql-suggestion-item img { width: 100%; height: 100%; object-fit: contain; display: block; }'+'.ql-suggestion-badge { position: absolute; top: 2px; right: 2px; font-size: 7px; padding: 1px 3px; border-radius: 3px; background: rgba(245,158,11,0.9); color: #fff; font-weight: 600; line-height: 1; }'+'.ql-suggestion-empty { font-size: 12px; color: #9ca3af; text-align: center; padding: 16px; background: transparent; border-radius: 10px; grid-column: 1 / -1; }'+'.ql-open-method-section { margin-bottom: 16px; padding: 12px; background: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb; }'+'.ql-open-method-label { font-size: 12px; font-weight: 500; color: #6b7280; margin-bottom: 10px; display: block; }'+'.ql-open-method-grid { display: flex; gap: 8px; }'+'.ql-open-method-item { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 12px 8px; border-radius: 10px; border: 2px solid #e5e7eb; background: #fff; cursor: pointer; transition: all 0.15s ease; gap: 6px; }'+'.ql-open-method-item:hover { border-color: #a5b4fc; background: #eef2ff; }'+'.ql-open-method-item.selected { border-color: #6366f1; background: #e0e7ff; box-shadow: 0 0 0 2px rgba(99,102,241,0.2); }'+'.ql-open-method-item .ql-method-icon { font-size: 20px; line-height: 1; }'+'.ql-open-method-item .ql-method-text { font-size: 11px; color: #6b7280; text-align: center; line-height: 1.2; }'+'.ql-open-method-item.selected .ql-method-text { color: #6366f1; font-weight: 500; }'+'.ql-url-row { display: flex; align-items: stretch; gap: 8px; margin-bottom: 12px; }'+'.ql-url-row input { flex: 1; margin-bottom: 0; }'+'.ql-search-btn { height: 44px; padding: 0 16px; border-radius: 12px; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.15s; border: 1.5px solid #6366f1; background: #fff; color: #6366f1; white-space: nowrap; display: flex; align-items: center; justify-content: center; gap: 4px; flex-shrink: 0; }'+'.ql-search-btn:hover { background: #6366f1; color: #fff; box-shadow: 0 2px 8px rgba(99,102,241,0.3); }'+'.ql-search-btn.loading { pointer-events: none; opacity: 0.7; }'+'.ql-search-btn .ql-search-spinner { width: 14px; height: 14px; border: 2px solid #e0e7ff; border-top-color: #6366f1; border-radius: 50%; animation: ql-spin 0.8s linear infinite; display: none; }'+'.ql-search-btn.loading .ql-search-spinner { display: inline-block; }'+'.ql-search-btn.loading .ql-search-text { display: none; }'+'.ql-modal-actions { display: flex; gap: 10px; margin-top: 16px; }'+'.ql-modal-actions button { flex: 1; padding: 10px 0; border-radius: 12px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.15s; border: none; }'+'.ql-modal-actions .ql-cancel { background: #f3f4f6; color: #6b7280; }'+'.ql-modal-actions .ql-cancel:hover { background: #e5e7eb; }'+'.ql-modal-actions .ql-save { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #fff; }'+'.ql-modal-actions .ql-save:hover { box-shadow: 0 4px 12px rgba(99,102,241,0.3); }'+'.ql-modal-actions .ql-delete { flex: none; width: 40px; background: #fef2f2; color: #ef4444; font-size: 16px; }'+'.ql-modal-actions .ql-delete:hover { background: #fee2e2; }'+'.ql-settings-panel { background: #fff; border-radius: 20px; width: 420px; max-width: 90vw; max-height: 90vh; box-shadow: 0 24px 80px rgba(0,0,0,0.2); animation: ql-slideUp 0.2s ease; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; box-sizing: border-box; display: flex; flex-direction: column; overflow: hidden; }'+'.ql-settings-header { display: flex; align-items: center; gap: 12px; padding: 24px 24px 16px; background: #fff; position: sticky; top: 0; z-index: 10; flex-shrink: 0; border-bottom: 1px solid #f3f4f6; }'+'.ql-back-btn { width: 32px; height: 32px; border-radius: 8px; border: 1.5px solid #e5e7eb; background: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 18px; transition: all 0.15s; flex-shrink: 0; }'+'.ql-back-btn:hover { background: #f3f4f6; border-color: #6366f1; }'+'.ql-settings-title { font-size: 16px; font-weight: 600; color: #1f2937; margin: 0; }'+'.ql-settings-content { flex: 1; overflow-y: auto; padding: 16px 24px 24px; }'+'.ql-settings-section { margin-bottom: 20px; }'+'.ql-settings-section-title { font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; gap: 6px; }'+'.ql-settings-item { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border-radius: 12px; background: #f9fafb; margin-bottom: 8px; cursor: pointer; transition: all 0.15s; border: 1.5px solid transparent; }'+'.ql-settings-item:hover { background: #eef2ff; border-color: #a5b4fc; }'+'.ql-settings-item-info { display: flex; align-items: center; gap: 12px; }'+'.ql-settings-item-icon { font-size: 20px; }'+'.ql-settings-item-text { display: flex; flex-direction: column; gap: 2px; }'+'.ql-settings-item-name { font-size: 14px; font-weight: 500; color: #1f2937; }'+'.ql-settings-item-desc { font-size: 11px; color: #9ca3af; }'+'.ql-settings-arrow { font-size: 16px; color: #9ca3af; }'+'.ql-interface-panel { background: #fff; border-radius: 20px; width: 420px; max-width: 90vw; max-height: 90vh; box-shadow: 0 24px 80px rgba(0,0,0,0.2); animation: ql-slideUp 0.2s ease; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; box-sizing: border-box; overflow-y: auto; }'+'.ql-interface-header { display: flex; align-items: center; gap: 12px; padding: 24px 24px 16px; border-bottom: 1px solid #f3f4f6; }'+'.ql-interface-title { font-size: 16px; font-weight: 600; color: #1f2937; margin: 0; }'+'.ql-interface-body { padding: 20px 24px 24px; }'+'.ql-interface-preview { background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 16px; padding: 20px; margin-bottom: 24px; border: 1px solid #e5e7eb; }'+'.ql-interface-preview-label { font-size: 11px; color: #9ca3af; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }'+'.ql-interface-preview-container { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 20px; min-height: 80px; }'+'.ql-interface-preview-btn { width: 60px; height: 60px; border-radius: 16px; background: rgba(255,255,255,0.8); border: 1px solid rgba(99,102,241,0.2); display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 20px; box-shadow: 0 2px 8px rgba(99,102,241,0.1); }'+'.ql-interface-preview-btn span { font-size: 10px; color: #6b7280; margin-top: 2px; }'+'.ql-interface-slider-section { margin-bottom: 20px; }'+'.ql-interface-slider-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }'+'.ql-interface-slider-label { font-size: 13px; font-weight: 500; color: #374151; }'+'.ql-interface-value { font-size: 14px; font-weight: 600; color: #6366f1; background: #eef2ff; padding: 4px 12px; border-radius: 8px; min-width: 50px; text-align: center; }'+'.ql-interface-slider-wrapper { position: relative; padding: 8px 0; }'+'.ql-interface-slider { width: 100%; height: 8px; border-radius: 4px; background: #e5e7eb; outline: none; -webkit-appearance: none; appearance: none; cursor: pointer; }'+'.ql-interface-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 24px; height: 24px; border-radius: 50%; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); cursor: pointer; box-shadow: 0 2px 8px rgba(99,102,241,0.4); transition: transform 0.15s, box-shadow 0.15s; }'+'.ql-interface-slider::-webkit-slider-thumb:hover { transform: scale(1.1); box-shadow: 0 4px 12px rgba(99,102,241,0.5); }'+'.ql-interface-slider::-moz-range-thumb { width: 24px; height: 24px; border-radius: 50%; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); cursor: pointer; border: none; box-shadow: 0 2px 8px rgba(99,102,241,0.4); }'+'.ql-interface-slider-marks { display: flex; justify-content: space-between; padding: 4px 4px 0; margin-top: 8px; }'+'.ql-interface-slider-mark { font-size: 10px; color: #9ca3af; }'+'.ql-interface-actions { display: flex; gap: 10px; margin-top: 20px; padding-top: 16px; border-top: 1px solid #f3f4f6; }'+'.ql-interface-actions button { flex: 1; padding: 12px 16px; border-radius: 12px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.15s; border: none; }'+'.ql-interface-actions .ql-reset-btn { background: #f3f4f6; color: #6b7280; }'+'.ql-interface-actions .ql-reset-btn:hover { background: #e5e7eb; }'+'.ql-interface-actions .ql-save-btn { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #fff; box-shadow: 0 2px 8px rgba(99,102,241,0.2); }'+'.ql-interface-actions .ql-save-btn:hover { box-shadow: 0 4px 16px rgba(99,102,241,0.35); transform: translateY(-1px); }'+'.ql-icon-library-list { display: flex; flex-direction: column; gap: 8px; }'+'.ql-icon-source-item { display: flex; align-items: center; padding: 12px 16px; border-radius: 12px; border: 1.5px solid #e5e7eb; background: #fff; transition: all 0.15s; gap: 12px; }'+'.ql-icon-source-item:hover { border-color: #a5b4fc; background: #fafbfc; }'+'.ql-icon-source-item.disabled { opacity: 0.5; background: #f9fafb; }'+'.ql-source-edit-btn { width: 28px; height: 28px; border-radius: 6px; border: 1.5px solid #e5e7eb; background: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #9ca3af; transition: all 0.15s; flex-shrink: 0; }'+'.ql-source-edit-btn:hover { background: #f3f4f6; border-color: #6366f1; color: #6366f1; }'+'.ql-icon-source-name { font-size: 13px; font-weight: 500; color: #1f2937; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }'+'.ql-toggle { position: relative; width: 40px; height: 22px; background: #e5e7eb; border-radius: 11px; cursor: pointer; transition: background 0.2s; flex-shrink: 0; }'+'.ql-toggle.active { background: #6366f1; }'+'.ql-toggle::after { content: ""; position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; background: #fff; border-radius: 50%; transition: transform 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }'+'.ql-toggle.active::after { transform: translateX(18px); }'+'.ql-toggle:hover { background: #d1d5db; }'+'.ql-toggle.active:hover { background: #4f46e5; }'+'.ql-add-source-btn { width: 100%; padding: 14px 16px; margin-top: 12px; border-radius: 12px; border: 1.5px dashed #d1d5db; background: transparent; cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.15s; display: flex; align-items: center; justify-content: center; gap: 8px; color: #6b7280; }'+'.ql-add-source-btn:hover { border-color: #6366f1; color: #6366f1; background: #fafbfc; border-style: solid; }'+'.ql-source-modal { background: #fff; border-radius: 20px; width: 420px; max-width: 90vw; max-height: 90vh; box-shadow: 0 24px 80px rgba(0,0,0,0.2); animation: ql-slideUp 0.2s ease; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; box-sizing: border-box; overflow-y: auto; }'+'.ql-source-modal-header { display: flex; align-items: center; gap: 12px; padding: 24px 24px 16px; border-bottom: 1px solid #f3f4f6; }'+'.ql-source-modal-title { font-size: 16px; font-weight: 600; color: #1f2937; margin: 0; }'+'.ql-source-modal-body { padding: 16px 24px 24px; }'+'.ql-source-field { margin-bottom: 16px; }'+'.ql-source-field label { display: block; font-size: 12px; font-weight: 500; color: #6b7280; margin-bottom: 6px; }'+'.ql-source-field input[type="text"] { width: 100%; padding: 10px 14px; border: 1.5px solid #e5e7eb; border-radius: 12px; font-size: 14px; outline: none; transition: border-color 0.15s; box-sizing: border-box; background: #fafbfc; height: 44px; }'+'.ql-source-field input[type="text"]:focus { border-color: #6366f1; background: #fff; }'+'.ql-source-hint { font-size: 11px; color: #9ca3af; margin-top: 6px; line-height: 1.5; padding: 8px 10px; background: #f9fafb; border-radius: 8px; border-left: 3px solid #e5e7eb; }'+'.ql-source-modal-actions { display: flex; gap: 10px; margin-top: 20px; padding-top: 16px; border-top: 1px solid #f3f4f6; }'+'.ql-source-modal-actions button { flex: 1; padding: 12px 16px; border-radius: 12px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.15s; border: none; display: flex; align-items: center; justify-content: center; gap: 6px; }'+'.ql-source-modal-actions .ql-cancel { background: #f3f4f6; color: #6b7280; }'+'.ql-source-modal-actions .ql-cancel:hover { background: #e5e7eb; }'+'.ql-source-modal-actions .ql-save { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #fff; }'+'.ql-source-modal-actions .ql-save:hover { box-shadow: 0 4px 16px rgba(99,102,241,0.35); transform: translateY(-1px); }'+'.ql-source-modal-actions .ql-delete-btn { flex: none; width: 48px; background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); color: #ef4444; border: 1.5px solid #fecaca; }'+'.ql-source-modal-actions .ql-delete-btn:hover { background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); border-color: #f87171; }'+'.ql-panel-gear{width:24px;height:24px;border-radius:6px;border:1px solid rgba(0,0,0,.08);background:rgba(0,0,0,.03);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:13px;margin-left:auto;margin-right:10px;flex-shrink:0;transition:background .2s ease,border-color .2s ease;user-select:none;}'+'.ql-panel-gear:hover{background:rgba(99,102,241,.1);border-color:rgba(99,102,241,.3);}'+'.ql-panel-gear.active{background:#6366f1;color:#fff;border-color:#6366f1;}'+'.ql-panel-settings{display:none;}'+'.ql-panel-settings.show{display:block;animation:ql-ps-fade .2s ease;}'+'@keyframes ql-ps-fade{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}'+'.ql-dark .ql-btn { background: rgba(50,50,60,0.6); border-color: rgba(255,255,255,0.1); }'+'.ql-dark .ql-btn:hover { background: rgba(60,60,75,0.9); border-color: rgba(129,140,248,0.4); box-shadow: 0 6px 20px rgba(0,0,0,0.35); }'+'.ql-dark .ql-btn.configured { background: rgba(67,56,202,0.15); border-color: rgba(129,140,248,0.2); }'+'.ql-dark .ql-btn .ql-name { color: #a1a1aa; }'+'.ql-dark .ql-btn .ql-plus { color: #71717a; }'+'.ql-dark .ql-modal { background: #1e1e2e; }'+'.ql-dark .ql-modal-title { color: #e5e7eb; }'+'.ql-dark .ql-modal label { color: #9ca3af; }'+'.ql-dark .ql-modal input[type="text"] { background: #2a2a3a; border-color: #3f3f5a; color: #e5e7eb; }'+'.ql-dark .ql-modal input[type="text"]:focus { border-color: #818cf8; background: #2a2a3a; }'+'.ql-dark .ql-modal-divider { background: #3f3f5a; }'+'.ql-dark .ql-search-btn { background: #2a2a3a; border-color: #818cf8; color: #818cf8; }'+'.ql-dark .ql-search-btn:hover { background: #818cf8; color: #fff; }'+'.ql-dark .ql-suggestion-grid { background: #2a2a3a; }'+'.ql-dark .ql-suggestion-item { border-color: #3f3f5a; background: #1e1e2e; }'+'.ql-dark .ql-suggestion-item:hover { border-color: #818cf8; background: #3730a3; }'+'.ql-dark .ql-suggestion-item.selected { border-color: #818cf8; background: #4338ca; }'+'.ql-dark .ql-suggestion-item.github-library { border-color: #f59e0b; background: linear-gradient(135deg, #451a03 0%, #78350f 100%); }'+'.ql-dark .ql-suggestion-empty { color: #71717a; }'+'.ql-dark .ql-open-method-section { background: #2a2a3a; border-color: #3f3f5a; }'+'.ql-dark .ql-open-method-item { background: #1e1e2e; border-color: #3f3f5a; }'+'.ql-dark .ql-open-method-item:hover { border-color: #818cf8; background: #3730a3; }'+'.ql-dark .ql-open-method-item.selected { border-color: #818cf8; background: #4338ca; }'+'.ql-dark .ql-open-method-item .ql-method-text { color: #9ca3af; }'+'.ql-dark .ql-open-method-item.selected .ql-method-text { color: #c4b5fd; }'+'.ql-dark .ql-modal-actions .ql-cancel { background: #2a2a3a; color: #9ca3af; }'+'.ql-dark .ql-modal-actions .ql-cancel:hover { background: #3a3a4a; }'+'.ql-dark .ql-settings-panel { background: #1e1e2e; }'+'.ql-dark .ql-settings-header { background: #1e1e2e; border-bottom-color: #2a2a3a; }'+'.ql-dark .ql-settings-title { color: #e5e7eb; }'+'.ql-dark .ql-settings-section-title { color: #c4b5fd; border-bottom-color: #3f3f5a; }'+'.ql-dark .ql-back-btn { background: #2a2a3a; border-color: #3f3f5a; color: #9ca3af; }'+'.ql-dark .ql-back-btn:hover { background: #3730a3; border-color: #818cf8; color: #fff; }'+'.ql-dark .ql-settings-item { background: #2a2a3a; }'+'.ql-dark .ql-settings-item:hover { background: #3730a3; }'+'.ql-dark .ql-settings-item-name { color: #e5e7eb; }'+'.ql-dark .ql-settings-item-desc { color: #6b7280; }'+'.ql-dark .ql-interface-panel { background: #1e1e2e; }'+'.ql-dark .ql-interface-header { border-bottom-color: #2a2a3a; }'+'.ql-dark .ql-interface-title { color: #e5e7eb; }'+'.ql-dark .ql-interface-preview { background: linear-gradient(135deg, #2a2a3a 0%, #1e1e2e 100%); border-color: #3f3f5a; }'+'.ql-dark .ql-interface-preview-label { color: #71717a; }'+'.ql-dark .ql-interface-preview-btn { background: rgba(60,60,75,0.8); border-color: rgba(129,140,248,0.2); }'+'.ql-dark .ql-interface-preview-btn span { color: #a1a1aa; }'+'.ql-dark .ql-interface-slider-label { color: #c4b5fd; }'+'.ql-dark .ql-interface-value { background: #3730a3; color: #c4b5fd; }'+'.ql-dark .ql-interface-slider { background: #3f3f5a; }'+'.ql-dark .ql-interface-slider-mark { color: #71717a; }'+'.ql-dark .ql-interface-actions { border-top-color: #2a2a3a; }'+'.ql-dark .ql-interface-actions .ql-reset-btn { background: #2a2a3a; color: #9ca3af; }'+'.ql-dark .ql-interface-actions .ql-reset-btn:hover { background: #3a3a4a; }'+'.ql-dark .ql-icon-source-item { background: #2a2a3a; border-color: #3f3f5a; }'+'.ql-dark .ql-icon-source-item:hover { border-color: #818cf8; }'+'.ql-dark .ql-icon-source-item.disabled { background: #1e1e2e; }'+'.ql-dark .ql-icon-source-name { color: #e5e7eb; }'+'.ql-dark .ql-source-edit-btn { background: #2a2a3a; border-color: #3f3f5a; color: #71717a; }'+'.ql-dark .ql-source-edit-btn:hover { background: #3730a3; border-color: #818cf8; color: #818cf8; }'+'.ql-dark .ql-toggle { background: #3f3f5a; }'+'.ql-dark .ql-toggle:hover { background: #4b5563; }'+'.ql-dark .ql-toggle.active { background: #818cf8; }'+'.ql-dark .ql-toggle.active:hover { background: #6366f1; }'+'.ql-dark .ql-add-source-btn { border-color: #4b5563; color: #9ca3af; }'+'.ql-dark .ql-add-source-btn:hover { border-color: #818cf8; color: #818cf8; background: #2a2a3a; }'+'.ql-dark .ql-source-modal { background: #1e1e2e; }'+'.ql-dark .ql-source-modal-header { border-bottom-color: #2a2a3a; }'+'.ql-dark .ql-source-modal-title { color: #e5e7eb; }'+'.ql-dark .ql-source-field label { color: #9ca3af; }'+'.ql-dark .ql-source-field input[type="text"] { background: #2a2a3a; border-color: #3f3f5a; color: #e5e7eb; }'+'.ql-dark .ql-source-field input[type="text"]:focus { border-color: #818cf8; background: #2a2a3a; }'+'.ql-dark .ql-source-hint { background: #2a2a3a; border-left-color: #3f3f5a; color: #71717a; }'+'.ql-dark .ql-source-modal-actions { border-top-color: #2a2a3a; }'+'.ql-dark .ql-source-modal-actions .ql-cancel { background: #2a2a3a; color: #9ca3af; }'+'.ql-dark .ql-source-modal-actions .ql-cancel:hover { background: #3a3a4a; }'+'.ql-dark .ql-source-modal-actions .ql-delete-btn { background: linear-gradient(135deg, #450a0a 0%, #7f1d1d 100%); border-color: #991b1b; color: #fca5a5; }'+'.ql-dark .ql-source-modal-actions .ql-delete-btn:hover { background: linear-gradient(135deg, #7f1d1d 0%, #991b1d 100%); border-color: #dc2626; }'+'.ql-dark .ql-panel-gear{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.1);color:#cbd5e1;}'+'.ql-dark .ql-panel-gear:hover{background:rgba(99,102,241,.15);}'+'.ql-dark .ql-panel-gear.active{background:#6366f1;color:#fff;}';
if (!STATE.isDestroyed) document.head.appendChild(style);
}
};
const WIDGET = {
createButton: function(item, index) {
var btn = document.createElement('button');
btn.type = 'button';
btn.className = 'ql-btn configured';
btn.dataset.index = String(index);
btn.draggable = true;
var size = STORAGE.loadBtnSizeConfig(), height = STORAGE.loadBtnHeightConfig(), radius = STORAGE.loadBtnRadiusConfig();
btn.style.width = size + 'px';
btn.style.height = height + 'px';
btn.style.borderRadius = radius + 'px';
btn.style.setProperty('--ql-btn-w', size + 'px');
var iconEl;
if (UTILS.isIconUrl(item.icon)) {
iconEl = document.createElement('img');
iconEl.className = 'ql-icon-img';
iconEl.src = item.icon;
iconEl.alt = '';
iconEl.loading = 'lazy';
iconEl.onerror = function() { this.onerror = null; this.outerHTML = '<span class="ql-icon">🌐</span>'; };
} else {
iconEl = document.createElement('span');
iconEl.className = 'ql-icon';
iconEl.textContent = item.icon || '🌐';
}
var name = document.createElement('span');
name.className = 'ql-name';
name.textContent = item.name || '未命名';
btn.appendChild(iconEl);
btn.appendChild(name);
return btn;
},
createAddButton: function() {
var btn = document.createElement('button');
btn.type = 'button';
btn.className = 'ql-btn ql-add-btn';
btn.dataset.action = 'add';
var size = STORAGE.loadBtnSizeConfig(), height = STORAGE.loadBtnHeightConfig(), radius = STORAGE.loadBtnRadiusConfig();
btn.style.width = size + 'px';
btn.style.height = height + 'px';
btn.style.borderRadius = radius + 'px';
var plus = document.createElement('span');
plus.className = 'ql-plus';
plus.textContent = '+';
btn.appendChild(plus);
return btn;
},
exportConfig: function() {
var defaultName = 'quick-links-config-' + new Date().toISOString().slice(0, 10);
var inputName = window.prompt('请输入导出文件名（无需填写扩展名）', defaultName);
if (inputName === null) return;
var fileName = (inputName.trim() || defaultName) + '.json';
var data = {};
STORAGE.getAllConfigKeys().forEach(function(k) {
var v = localStorage.getItem(k);
if (v !== null) data[k] = v;
});
var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
var url = URL.createObjectURL(blob);
var a = document.createElement('a');
a.href = url;
a.download = fileName;
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
URL.revokeObjectURL(url);
},
importConfig: function(onSuccess, onError) {
var fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.accept = '.json,application/json';
fileInput.style.display = 'none';
document.body.appendChild(fileInput);
fileInput.addEventListener('change', function() {
var file = fileInput.files && fileInput.files[0];
if (!file) { document.body.removeChild(fileInput); return; }
var reader = new FileReader();
reader.onload = function(e) {
document.body.removeChild(fileInput);
try {
var data = JSON.parse(e.target.result);
if (typeof data !== 'object' || Array.isArray(data)) throw new Error('invalid format');
var validKeys = STORAGE.getAllConfigKeys();
var imported = 0;
validKeys.forEach(function(k) {
if (Object.prototype.hasOwnProperty.call(data, k) && typeof data[k] === 'string') {
localStorage.setItem(k, data[k]);
imported++;
}
});
if (imported === 0) throw new Error('no valid keys found');
STORAGE.clearAll();
CORE.render();
if (typeof onSuccess === 'function') onSuccess();
} catch(err) {
if (typeof onError === 'function') onError();
}
};
reader.onerror = function() { document.body.removeChild(fileInput); };
reader.readAsText(file);
});
fileInput.click();
}
};
const CORE = {
render: function() {
if (STATE.isDestroyed) return false;
if (!isStillHomePage()) return false;
var anchor = UI.findAnchor();
if (!anchor || !anchor.parentNode) return false;
document.querySelectorAll('.ql-container').forEach(function(el) { el.remove(); });
if (STATE.containerRef && STATE.containerRef.parentNode) STATE.containerRef.remove();
STATE.containerRef = null;
var gap = STORAGE.loadGapConfig();
var container = document.createElement('div');
container.className = 'ql-container';
container.id = 'ql-container-root';
container.dataset.widgetId = 'quick-links';
container.style.gap = gap + 'px';
container.style.setProperty('--ql-gap', gap + 'px');
var fragment = document.createDocumentFragment();
var config = STORAGE.loadConfig();
for (var i = 0; i < config.length; i++) {
var btn = WIDGET.createButton(config[i], i);
fragment.appendChild(btn);
}
fragment.appendChild(WIDGET.createAddButton());
container.appendChild(fragment);
CORE.bindContainerEvents(container);
anchor.parentNode.insertBefore(container, anchor.nextSibling);
STATE.containerRef = container;
requestAnimationFrame(function() {
window.dispatchEvent(new CustomEvent('tb-widget:reorder'));
});
return true;
},
tryRender: function() {
if (STATE.isDestroyed) return;
if (!isStillHomePage()) return;
if (CORE.render()) { STATE.retryCount = 0; return; }
STATE.retryCount++;
if (STATE.retryCount < CONFIG.MAX_RETRY) {
STATE.retryTimer = setTimeout(CORE.tryRender, CONFIG.RETRY_INTERVAL);
}
},
closeExistingModal: function() {
var existing = document.querySelector('.ql-overlay');
if (existing) existing.remove();
if (STATE.currentSearchController) { STATE.currentSearchController.abort(); STATE.currentSearchController = null; }
},
bindContainerEvents: function(container) {
if (container.dataset.bound === '1') return;
container.dataset.bound = '1';
var previewOrder = null;
var draggedOrigIdx = null;
function getConfigButtons() {
return Array.from(container.querySelectorAll('.ql-btn[data-index]'));
}
function flipReorder(newOrder) {
var btns = getConfigButtons();
var btnMap = {};
btns.forEach(function(b) { btnMap[Number(b.dataset.index)] = b; });
var firstRects = {};
btns.forEach(function(b) { firstRects[Number(b.dataset.index)] = b.getBoundingClientRect(); });
btns.forEach(function(b) { b.style.transition = 'none'; b.style.transform = ''; });
var addBtn = container.querySelector('.ql-add-btn');
newOrder.forEach(function(origIdx) { var b = btnMap[origIdx]; if (b) container.insertBefore(b, addBtn); });
var lastRects = {};
btns.forEach(function(b) { lastRects[Number(b.dataset.index)] = b.getBoundingClientRect(); });
btns.forEach(function(b) {
var idx = Number(b.dataset.index);
if (idx === draggedOrigIdx) return;
var first = firstRects[idx], last = lastRects[idx];
var dx = first.left - last.left, dy = first.top - last.top;
if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
b.style.transition = 'none';
b.style.transform = 'translate(' + dx + 'px, ' + dy + 'px)';
b.getBoundingClientRect();
b.classList.add('ql-flip-animating');
b.style.transition = 'transform 0.22s cubic-bezier(.4,0,.2,1)';
b.style.transform = '';
var cleanup = function() { b.classList.remove('ql-flip-animating'); b.style.transition = ''; b.style.transform = ''; b.removeEventListener('transitionend', cleanup); };
b.addEventListener('transitionend', cleanup, { once: true });
});
}
function findNearestButton(clientX, clientY) {
var btns = getConfigButtons(), nearest = null, minDist = Infinity;
btns.forEach(function(b) {
var rect = b.getBoundingClientRect();
var cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
var dist = Math.hypot(clientX - cx, clientY - cy);
if (dist < minDist) { minDist = dist; nearest = b; }
});
return nearest;
}
UI.addManagedListener(container, 'contextmenu', function(e) {
var btn = e.target.closest('.ql-btn');
if (!btn || !container.contains(btn)) return;
e.preventDefault();
if (btn.dataset.action === 'add') { CORE.openModal(null); return; }
var index = Number(btn.dataset.index);
if (!isNaN(index) && index >= 0) CORE.openModal(index);
});
UI.addManagedListener(container, 'dragstart', function(e) {
var btn = e.target.closest('.ql-btn');
if (!btn || !container.contains(btn) || btn.dataset.action === 'add') return;
draggedOrigIdx = Number(btn.dataset.index);
previewOrder = STORAGE.loadConfig().map(function(_, i) { return i; });
e.dataTransfer.effectAllowed = 'move';
e.dataTransfer.setData('text/plain', String(draggedOrigIdx));
requestAnimationFrame(function() { if (!STATE.isDestroyed) btn.classList.add('ql-dragging'); });
});
UI.addManagedListener(container, 'dragend', function(e) {
var btn = e.target.closest('.ql-btn');
if (btn) btn.classList.remove('ql-dragging');
if (previewOrder !== null && draggedOrigIdx !== null) {
flipReorder(STORAGE.loadConfig().map(function(_, i) { return i; }));
}
previewOrder = null; draggedOrigIdx = null; STATE.dragState = null;
});
UI.addManagedListener(container, 'dragover', function(e) {
e.preventDefault();
e.dataTransfer.dropEffect = 'move';
if (previewOrder === null || draggedOrigIdx === null) return;
var nearest = findNearestButton(e.clientX, e.clientY);
if (!nearest) return;
var overOrigIdx = Number(nearest.dataset.index);
if (overOrigIdx === draggedOrigIdx) return;
var fromPos = previewOrder.indexOf(draggedOrigIdx), toPos = previewOrder.indexOf(overOrigIdx);
if (fromPos === toPos || fromPos === -1 || toPos === -1) return;
var newOrder = previewOrder.slice();
newOrder.splice(fromPos, 1);
newOrder.splice(toPos, 0, draggedOrigIdx);
previewOrder = newOrder;
flipReorder(previewOrder);
});
UI.addManagedListener(container, 'dragleave', function(e) {
if (!container.contains(e.relatedTarget) && previewOrder !== null) {
var originalOrder = STORAGE.loadConfig().map(function(_, i) { return i; });
previewOrder = originalOrder;
flipReorder(originalOrder);
}
});
UI.addManagedListener(container, 'drop', function(e) {
e.preventDefault();
if (previewOrder === null || draggedOrigIdx === null) return;
var finalOrder = previewOrder.slice();
previewOrder = null; draggedOrigIdx = null; STATE.dragState = null;
var config = STORAGE.loadConfig();
STORAGE.saveConfig(finalOrder.map(function(i) { return config[i]; }));
CORE.render();
});
UI.addManagedListener(container, 'click', function(e) {
if (STATE.isDestroyed) return;
var btn = e.target.closest('.ql-btn');
if (!btn || !container.contains(btn)) return;
if (btn.dataset.action === 'add') { CORE.openModal(null); return; }
var index = Number(btn.dataset.index);
var config = STORAGE.loadConfig();
var item = config[index];
if (!item) return;
if (!item.url || !UTILS.isValidUrl(item.url)) return;
if (item.openMethod === 'currentTab') window.location.href = item.url;
else window.open(item.url, '_blank', 'noopener');
});
},
openModal: function(editIndex) {
if (STATE.isDestroyed) return;
CORE.closeExistingModal();
var config = STORAGE.loadConfig();
var item = editIndex !== null ? config[editIndex] : null;
var selectedIcon = item ? item.icon || '' : '';
var selectedMethod = item ? (item.openMethod || 'newTab') : 'newTab';
var overlay = document.createElement('div');
overlay.className = 'ql-overlay';
UI.applyDarkToEl(overlay);
var modal = document.createElement('div');
modal.className = 'ql-modal';
modal.innerHTML =
'<div class="ql-modal-header"><h3 class="ql-modal-title">' + (item ? '编辑快捷方式' : '添加快捷方式') + '</h3></div>'+'<div class="ql-url-row"><input type="text" id="ql-url-input" placeholder="https://example.com" value="' + (item ? item.url || '' : '') + '"><button type="button" class="ql-search-btn" id="ql-search-btn"><span class="ql-search-spinner"></span><span class="ql-search-text">搜索图标</span></button></div>'+'<input type="text" id="ql-name-input" placeholder="网站名称" value="' + (item ? item.name || '' : '') + '">'+'<div class="ql-modal-divider"></div>'+'<div class="ql-icon-suggestions" id="ql-icon-suggestions"><div class="ql-suggestion-header"><label>图标建议</label><span class="ql-suggestion-status" id="ql-suggestion-status"></span></div><div class="ql-suggestion-grid" id="ql-suggestion-grid"></div></div>'+'<label>图标 URL（可选）</label>'+'<input type="text" id="ql-icon-input" placeholder="留空自动获取" value="' + (item ? item.icon || '' : '') + '">'+'<div class="ql-open-method-section"><span class="ql-open-method-label">打开方式</span><div class="ql-open-method-grid">' +
CONFIG.OPEN_METHODS.map(function(m) {
return '<div class="ql-open-method-item' + (selectedMethod === m.id ? ' selected' : '') + '" data-method="' + m.id + '"><span class="ql-method-icon">' + m.icon + '</span><span class="ql-method-text">' + m.label + '</span></div>';
}).join('') +
'</div></div>'+'<div class="ql-modal-actions">' + (item ? '<button type="button" class="ql-delete">🗑</button>' : '') + '<button type="button" class="ql-cancel">取消</button><button type="button" class="ql-save">✓ 保存</button></div>';
overlay.appendChild(modal);
document.body.appendChild(overlay);
var nameInput = modal.querySelector('#ql-name-input');
var urlInput = modal.querySelector('#ql-url-input');
var iconInput = modal.querySelector('#ql-icon-input');
var suggestionsEl = modal.querySelector('#ql-icon-suggestions');
var suggestionGrid = modal.querySelector('#ql-suggestion-grid');
var suggestionStatus = modal.querySelector('#ql-suggestion-status');
var searchBtn = modal.querySelector('#ql-search-btn');
function selectSuggestion(url, itemEl) {
selectedIcon = url;
iconInput.value = url;
suggestionGrid.querySelectorAll('.ql-suggestion-item').forEach(function(el) { el.classList.remove('selected'); });
if (itemEl) itemEl.classList.add('selected');
}
async function doSearch(urlVal) {
if (!urlVal || !UTILS.isValidUrl(urlVal)) return;
if (STATE.currentSearchController) STATE.currentSearchController.abort();
STATE.currentSearchController = { aborted: false, abort: function() { this.aborted = true; } };
var ctrl = STATE.currentSearchController;
suggestionsEl.classList.add('visible');
suggestionStatus.textContent = '搜索中...';
suggestionStatus.className = 'ql-suggestion-status loading';
suggestionGrid.innerHTML = '';
var results = await ICON.searchIcons(urlVal);
if (ctrl.aborted || STATE.isDestroyed) return;
suggestionStatus.className = 'ql-suggestion-status';
if (!results || results.length === 0) {
suggestionStatus.textContent = '未找到图标';
suggestionGrid.innerHTML = '<div class="ql-suggestion-empty">未找到匹配图标</div>';
return;
}
suggestionStatus.textContent = '找到 ' + results.length + ' 个';
results.forEach(function(r) {
var itemEl = document.createElement('div');
itemEl.className = 'ql-suggestion-item' + (r.type === 'github-library' ? ' github-library' : '');
if (selectedIcon === r.url) itemEl.classList.add('selected');
if (r.type === 'github-library') {
var badge = document.createElement('span');
badge.className = 'ql-suggestion-badge';
badge.textContent = 'GH';
itemEl.appendChild(badge);
}
var img = document.createElement('img');
img.src = r.url;
img.title = r.source || '';
img.loading = 'lazy';
img.onerror = function() { if (itemEl.parentNode) itemEl.remove(); };
itemEl.appendChild(img);
itemEl.addEventListener('click', function() { selectSuggestion(r.url, itemEl); });
suggestionGrid.appendChild(itemEl);
});
}
UI.addManagedListener(iconInput, 'input', function() { selectedIcon = this.value.trim(); });
UI.addManagedListener(urlInput, 'input', function() {
var urlVal = this.value.trim();
if (!urlVal || !UTILS.isValidUrl(urlVal)) return;
if (!nameInput.value.trim()) {
var autoName = UTILS.extractNameFromUrl(urlVal);
if (autoName) nameInput.value = autoName;
}
});
UI.addManagedListener(searchBtn, 'click', async function() {
var urlVal = urlInput.value.trim();
if (!urlVal) { urlInput.focus(); return; }
searchBtn.classList.add('loading');
await doSearch(urlVal);
searchBtn.classList.remove('loading');
});
modal.querySelectorAll('.ql-open-method-item').forEach(function(el) {
UI.addManagedListener(el, 'click', function() {
selectedMethod = el.dataset.method;
modal.querySelectorAll('.ql-open-method-item').forEach(function(e) { e.classList.remove('selected'); });
el.classList.add('selected');
});
});
UI.addManagedListener(modal.querySelector('.ql-cancel'), 'click', function() { overlay.remove(); });
UI.addManagedListener(overlay, 'mousedown', function(e) { if (e.target === overlay) overlay.remove(); });
if (item) {
UI.addManagedListener(modal.querySelector('.ql-delete'), 'click', function() {
config.splice(editIndex, 1);
STORAGE.saveConfig(config);
overlay.remove();
CORE.render();
});
}
UI.addManagedListener(modal.querySelector('.ql-save'), 'click', function() {
var newName = nameInput.value.trim();
var newUrl = urlInput.value.trim();
var newIcon = iconInput.value.trim() || selectedIcon || UTILS.getFaviconFallback(newUrl);
nameInput.style.borderColor = '';
urlInput.style.borderColor = '';
if (!newName) { nameInput.style.borderColor = '#ef4444'; nameInput.focus(); return; }
if (!newUrl || !UTILS.isValidUrl(newUrl)) { urlInput.style.borderColor = '#ef4444'; urlInput.focus(); return; }
var entry = { name: newName, url: newUrl, icon: newIcon, openMethod: selectedMethod };
if (item) { config[editIndex] = entry; } else { config.push(entry); }
STORAGE.saveConfig(config);
overlay.remove();
CORE.render();
});
requestAnimationFrame(function() { urlInput.focus(); });
},
openSettingsPanel: function(overlay, goBack) {
var existingPanel = overlay.querySelector('.ql-settings-panel, .ql-source-modal, .ql-interface-panel');
if (existingPanel) existingPanel.remove();
var panel = document.createElement('div');
panel.className = 'ql-settings-panel';
UI.applyDarkToEl(panel);
panel.innerHTML =
'<div class="ql-settings-header"><button type="button" class="ql-back-btn">←</button><h3 class="ql-settings-title">设置</h3></div>'+'<div class="ql-settings-content">'+'<div class="ql-settings-section"><div class="ql-settings-section-title"><span>界面设置</span></div><div class="ql-settings-item" data-action="interface-settings"><div class="ql-settings-item-info"><span class="ql-settings-item-icon">🎨</span><div class="ql-settings-item-text"><span class="ql-settings-item-name">界面设置</span><span class="ql-settings-item-desc">调整大小、圆角、高度和间距</span></div></div><span class="ql-settings-arrow">›</span></div></div>'+'<div class="ql-settings-section"><div class="ql-settings-section-title"><span>图标源管理</span></div><div class="ql-settings-item" data-action="icon-library"><div class="ql-settings-item-info"><span class="ql-settings-item-icon">📦</span><div class="ql-settings-item-text"><span class="ql-settings-item-name">图标库配置</span><span class="ql-settings-item-desc">API 搜索源 + GitHub 图标库</span></div></div><span class="ql-settings-arrow">›</span></div></div>'+'</div>';
overlay.appendChild(panel);
UI.addManagedListener(panel.querySelector('.ql-back-btn'), 'click', goBack);
UI.addManagedListener(panel.querySelector('[data-action="interface-settings"]'), 'click', function() {
CORE.openInterfacePanel(overlay, function() { CORE.openSettingsPanel(overlay, goBack); });
});
UI.addManagedListener(panel.querySelector('[data-action="icon-library"]'), 'click', function() {
CORE.openIconLibraryPanel(overlay, function() { CORE.openSettingsPanel(overlay, goBack); });
});
},
openInterfacePanel: function(overlay, goBack) {
var existingPanel = overlay.querySelector('.ql-settings-panel, .ql-source-modal, .ql-interface-panel');
if (existingPanel) existingPanel.remove();
var currentGap = STORAGE.loadGapConfig(), currentSize = STORAGE.loadBtnSizeConfig(),
currentRadius = STORAGE.loadBtnRadiusConfig(), currentHeight = STORAGE.loadBtnHeightConfig();
var panel = document.createElement('div');
panel.className = 'ql-interface-panel';
UI.applyDarkToEl(panel);
panel.innerHTML =
'<div class="ql-interface-header"><button type="button" class="ql-back-btn">←</button><h3 class="ql-interface-title">界面设置</h3></div>'+'<div class="ql-interface-body">'+'<div class="ql-interface-preview"><div class="ql-interface-preview-label">预览</div><div class="ql-interface-preview-container" id="ql-interface-preview"><div class="ql-interface-preview-btn"><span>🔗</span><span>链接</span></div><div class="ql-interface-preview-btn"><span>📧</span><span>邮箱</span></div><div class="ql-interface-preview-btn"><span>📺</span><span>视频</span></div></div></div>'+'<div class="ql-interface-slider-section"><div class="ql-interface-slider-header"><span class="ql-interface-slider-label">宽度</span><span class="ql-interface-value" id="ql-size-value">' + currentSize + 'px</span></div><div class="ql-interface-slider-wrapper"><input type="range" class="ql-interface-slider" id="ql-size-slider" min="' + CONFIG.MIN_SIZE + '" max="' + CONFIG.MAX_SIZE + '" value="' + currentSize + '" step="1"></div><div class="ql-interface-slider-marks"><span class="ql-interface-slider-mark">紧凑 ' + CONFIG.MIN_SIZE + 'px</span><span class="ql-interface-slider-mark">宽松 ' + CONFIG.MAX_SIZE + 'px</span></div></div>'+'<div class="ql-interface-slider-section"><div class="ql-interface-slider-header"><span class="ql-interface-slider-label">高度</span><span class="ql-interface-value" id="ql-height-value">' + currentHeight + 'px</span></div><div class="ql-interface-slider-wrapper"><input type="range" class="ql-interface-slider" id="ql-height-slider" min="' + CONFIG.MIN_HEIGHT + '" max="' + CONFIG.MAX_HEIGHT + '" value="' + currentHeight + '" step="1"></div><div class="ql-interface-slider-marks"><span class="ql-interface-slider-mark">紧凑 ' + CONFIG.MIN_HEIGHT + 'px</span><span class="ql-interface-slider-mark">宽松 ' + CONFIG.MAX_HEIGHT + 'px</span></div></div>'+'<div class="ql-interface-slider-section"><div class="ql-interface-slider-header"><span class="ql-interface-slider-label">圆角</span><span class="ql-interface-value" id="ql-radius-value">' + currentRadius + 'px</span></div><div class="ql-interface-slider-wrapper"><input type="range" class="ql-interface-slider" id="ql-radius-slider" min="' + CONFIG.MIN_RADIUS + '" max="' + CONFIG.MAX_RADIUS + '" value="' + currentRadius + '" step="1"></div><div class="ql-interface-slider-marks"><span class="ql-interface-slider-mark">方正 ' + CONFIG.MIN_RADIUS + 'px</span><span class="ql-interface-slider-mark">圆润 ' + CONFIG.MAX_RADIUS + 'px</span></div></div>'+'<div class="ql-interface-slider-section"><div class="ql-interface-slider-header"><span class="ql-interface-slider-label">间距</span><span class="ql-interface-value" id="ql-gap-value">' + currentGap + 'px</span></div><div class="ql-interface-slider-wrapper"><input type="range" class="ql-interface-slider" id="ql-gap-slider" min="' + CONFIG.MIN_GAP + '" max="' + CONFIG.MAX_GAP + '" value="' + currentGap + '" step="1"></div><div class="ql-interface-slider-marks"><span class="ql-interface-slider-mark">紧凑 ' + CONFIG.MIN_GAP + 'px</span><span class="ql-interface-slider-mark">宽松 ' + CONFIG.MAX_GAP + 'px</span></div></div>'+'<div class="ql-interface-actions"><button type="button" class="ql-reset-btn">恢复默认</button><button type="button" class="ql-save-btn">✓ 保存</button></div>'+'</div>';
overlay.appendChild(panel);
var previewContainer = panel.querySelector('#ql-interface-preview');
var sizeSlider = panel.querySelector('#ql-size-slider'), heightSlider = panel.querySelector('#ql-height-slider');
var radiusSlider = panel.querySelector('#ql-radius-slider'), gapSlider = panel.querySelector('#ql-gap-slider');
var sizeValue = panel.querySelector('#ql-size-value'), heightValue = panel.querySelector('#ql-height-value');
var radiusValue = panel.querySelector('#ql-radius-value'), gapValue = panel.querySelector('#ql-gap-value');
var updatePreview = function(size, height, radius, gap) {
previewContainer.style.gap = gap + 'px';
previewContainer.querySelectorAll('.ql-interface-preview-btn').forEach(function(btn) {
btn.style.width = size + 'px'; btn.style.height = height + 'px'; btn.style.borderRadius = radius + 'px';
});
};
UI.addManagedListener(sizeSlider, 'input', function() { sizeValue.textContent = this.value + 'px'; updatePreview(+this.value, +heightSlider.value, +radiusSlider.value, +gapSlider.value); });
UI.addManagedListener(heightSlider, 'input', function() { heightValue.textContent = this.value + 'px'; updatePreview(+sizeSlider.value, +this.value, +radiusSlider.value, +gapSlider.value); });
UI.addManagedListener(radiusSlider, 'input', function() { radiusValue.textContent = this.value + 'px'; updatePreview(+sizeSlider.value, +heightSlider.value, +this.value, +gapSlider.value); });
UI.addManagedListener(gapSlider, 'input', function() { gapValue.textContent = this.value + 'px'; updatePreview(+sizeSlider.value, +heightSlider.value, +radiusSlider.value, +this.value); });
UI.addManagedListener(panel.querySelector('.ql-reset-btn'), 'click', function() {
sizeSlider.value = CONFIG.BTN_SIZE; sizeValue.textContent = CONFIG.BTN_SIZE + 'px';
heightSlider.value = CONFIG.BTN_SIZE; heightValue.textContent = CONFIG.BTN_SIZE + 'px';
radiusSlider.value = 28; radiusValue.textContent = '28px';
gapSlider.value = CONFIG.GAP; gapValue.textContent = CONFIG.GAP + 'px';
updatePreview(CONFIG.BTN_SIZE, CONFIG.BTN_SIZE, 28, CONFIG.GAP);
});
UI.addManagedListener(panel.querySelector('.ql-save-btn'), 'click', function() {
STORAGE.saveBtnSizeConfig(+sizeSlider.value); STORAGE.saveBtnHeightConfig(+heightSlider.value);
STORAGE.saveBtnRadiusConfig(+radiusSlider.value); STORAGE.saveGapConfig(+gapSlider.value);
CORE.render(); goBack();
});
UI.addManagedListener(panel.querySelector('.ql-back-btn'), 'click', goBack);
updatePreview(currentSize, currentHeight, currentRadius, currentGap);
},
openIconLibraryPanel: function(overlay, goBack) {
var existingPanel = overlay.querySelector('.ql-settings-panel, .ql-source-modal, .ql-interface-panel');
if (existingPanel) existingPanel.remove();
var panel = document.createElement('div');
panel.className = 'ql-settings-panel';
UI.applyDarkToEl(panel);
var renderList = function() {
if (STATE.isDestroyed) return;
var sources = STORAGE.loadIconSources(), githubLibraries = STORAGE.loadGithubLibraries();
var content = panel.querySelector('.ql-settings-content');
if (!content) return;
content.innerHTML =
'<div class="ql-settings-section"><div class="ql-settings-section-title"><span>GitHub 图标库</span></div><div class="ql-icon-library-list" id="ql-github-list"></div><button type="button" class="ql-add-source-btn" data-action="add-github"><span>+</span> 添加图标库</button></div>'+'<div class="ql-settings-section"><div class="ql-settings-section-title">API 搜索源</div><div class="ql-icon-library-list" id="ql-api-list"></div><button type="button" class="ql-add-source-btn" data-action="add-api"><span>+</span> 添加 API 源</button></div>';
var githubList = content.querySelector('#ql-github-list');
githubLibraries.forEach(function(lib) {
var item = document.createElement('div');
item.className = 'ql-icon-source-item' + (lib.enabled ? '' : ' disabled');
item.innerHTML = '<button type="button" class="ql-source-edit-btn" title="编辑">✎</button><span class="ql-icon-source-name">' + lib.name + '</span><div class="ql-toggle' + (lib.enabled ? ' active' : '') + '"></div>';
UI.addManagedListener(item.querySelector('.ql-source-edit-btn'), 'click', function(e) { e.stopPropagation(); CORE.openGithubLibraryModal(overlay, lib.id, function() { CORE.openIconLibraryPanel(overlay, goBack); }); });
UI.addManagedListener(item.querySelector('.ql-toggle'), 'click', function(e) { e.stopPropagation(); lib.enabled = !lib.enabled; STORAGE.saveGithubLibraries(githubLibraries); e.currentTarget.classList.toggle('active'); item.classList.toggle('disabled', !lib.enabled); });
githubList.appendChild(item);
});
var apiList = content.querySelector('#ql-api-list');
sources.forEach(function(source) {
var item = document.createElement('div');
item.className = 'ql-icon-source-item' + (source.enabled ? '' : ' disabled');
item.innerHTML = '<button type="button" class="ql-source-edit-btn" title="编辑">✎</button><span class="ql-icon-source-name">' + source.name + '</span><div class="ql-toggle' + (source.enabled ? ' active' : '') + '"></div>';
UI.addManagedListener(item.querySelector('.ql-source-edit-btn'), 'click', function(e) { e.stopPropagation(); CORE.openSourceModal(overlay, source.id, function() { CORE.openIconLibraryPanel(overlay, goBack); }); });
UI.addManagedListener(item.querySelector('.ql-toggle'), 'click', function(e) { e.stopPropagation(); source.enabled = !source.enabled; STORAGE.saveIconSources(sources); e.currentTarget.classList.toggle('active'); item.classList.toggle('disabled', !source.enabled); });
apiList.appendChild(item);
});
content.querySelectorAll('.ql-add-source-btn').forEach(function(btn) {
UI.addManagedListener(btn, 'click', function(e) {
e.stopPropagation();
if (btn.dataset.action === 'add-github') CORE.openGithubLibraryModal(overlay, null, function() { CORE.openIconLibraryPanel(overlay, goBack); });
else CORE.openSourceModal(overlay, null, function() { CORE.openIconLibraryPanel(overlay, goBack); });
});
});
};
panel.innerHTML = '<div class="ql-settings-header"><button type="button" class="ql-back-btn">←</button><h3 class="ql-settings-title">图标库</h3></div><div class="ql-settings-content"></div>';
overlay.appendChild(panel);
UI.addManagedListener(panel.querySelector('.ql-back-btn'), 'click', goBack);
renderList();
},
openGithubLibraryModal: function(overlay, libraryId, goBack) {
if (STATE.isDestroyed) return;
var existingPanel = overlay.querySelector('.ql-settings-panel, .ql-source-modal, .ql-interface-panel');
if (existingPanel) existingPanel.remove();
var libraries = STORAGE.loadGithubLibraries();
var library = libraryId ? libraries.find(function(l) { return l.id === libraryId; }) : null;
var isNew = !library;
var modal = document.createElement('div');
modal.className = 'ql-source-modal';
UI.applyDarkToEl(modal);
modal.innerHTML =
'<div class="ql-source-modal-header"><button type="button" class="ql-back-btn">←</button><h3 class="ql-source-modal-title">' + (isNew ? '添加图标库' : '编辑图标库') + '</h3></div>'+'<div class="ql-source-modal-body"><div class="ql-source-field"><label>图标库链接 (JSON 格式)</label><input type="text" id="ql-lib-url" placeholder="https://example.com/icons.json" value="' + (library ? library.url || '' : '') + '"><div class="ql-source-hint">图标库需为 JSON 格式，包含 icons 数组，每项包含 name 和 url 字段</div></div><div class="ql-source-field"><label>名称 (可自动获取)</label><input type="text" id="ql-lib-name" placeholder="图标库名称" value="' + (library ? library.name || '' : '') + '"></div><div class="ql-source-modal-actions">' + (isNew ? '' : '<button type="button" class="ql-delete-btn">🗑</button>') + '<button type="button" class="ql-cancel">取消</button><button type="button" class="ql-save">✓ 保存</button></div></div>';
overlay.appendChild(modal);
var urlInput = modal.querySelector('#ql-lib-url'), nameInput = modal.querySelector('#ql-lib-name'), autoFilled = false;
if (!isNew) {
var deleteBtn = modal.querySelector('.ql-delete-btn');
if (deleteBtn) UI.addManagedListener(deleteBtn, 'click', function() {
var index = libraries.findIndex(function(l) { return l.id === libraryId; });
if (index !== -1) { libraries.splice(index, 1); STORAGE.saveGithubLibraries(libraries); }
goBack();
});
}
UI.addManagedListener(urlInput, 'input', async function() {
var url = this.value.trim();
if (!url || autoFilled || STATE.isDestroyed) return;
try { var data = await ICON.fetchGithubIconLibrary(url); if (data && data.name && !nameInput.value.trim() && !STATE.isDestroyed) { nameInput.value = data.name; autoFilled = true; } } catch(err) {}
});
UI.addManagedListener(modal.querySelector('.ql-back-btn'), 'click', goBack);
UI.addManagedListener(modal.querySelector('.ql-cancel'), 'click', goBack);
UI.addManagedListener(modal.querySelector('.ql-save'), 'click', async function() {
if (STATE.isDestroyed) return;
var url = urlInput.value.trim(), name = nameInput.value.trim();
urlInput.style.borderColor = ''; nameInput.style.borderColor = '';
if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) { urlInput.style.borderColor = '#ef4444'; urlInput.focus(); return; }
var libraryName = name;
try { var data = await ICON.fetchGithubIconLibrary(url); if (data && !STATE.isDestroyed && !libraryName && data.name) libraryName = data.name; } catch(err) {}
if (!libraryName) { nameInput.style.borderColor = '#ef4444'; nameInput.focus(); return; }
if (isNew) libraries.push({ id: UTILS.generateId(), name: libraryName, enabled: true, url: url, type: 'github-library' });
else { var existingLib = libraries.find(function(l) { return l.id === libraryId; }); if (existingLib) { existingLib.name = libraryName; existingLib.url = url; } }
STORAGE.saveGithubLibraries(libraries);
goBack();
});
},
openSourceModal: function(overlay, sourceId, goBack) {
if (STATE.isDestroyed) return;
var existingPanel = overlay.querySelector('.ql-settings-panel, .ql-source-modal, .ql-interface-panel');
if (existingPanel) existingPanel.remove();
var sources = STORAGE.loadIconSources();
var source = sourceId ? sources.find(function(s) { return s.id === sourceId; }) : null;
var isNew = !source;
var modal = document.createElement('div');
modal.className = 'ql-source-modal';
UI.applyDarkToEl(modal);
modal.innerHTML =
'<div class="ql-source-modal-header"><button type="button" class="ql-back-btn">←</button><h3 class="ql-source-modal-title">' + (isNew ? '添加 API 源' : '编辑 API 源') + '</h3></div>'+'<div class="ql-source-modal-body"><div class="ql-source-field"><label>名称</label><input type="text" id="ql-source-name" placeholder="图标源名称" value="' + (source ? source.name || '' : '') + '"></div><div class="ql-source-field"><label>URL 模板</label><input type="text" id="ql-source-url" placeholder="https://example.com/icon/{domain}" value="' + (source ? source.urlTemplate || '' : '') + '"><div class="ql-source-hint">支持变量: {domain} - 完整域名 (如 google.com), {domainName} - 主域名 (如 google)</div></div><div class="ql-source-modal-actions">' + (isNew ? '' : '<button type="button" class="ql-delete-btn">🗑</button>') + '<button type="button" class="ql-cancel">取消</button><button type="button" class="ql-save">✓ 保存</button></div></div>';
overlay.appendChild(modal);
var nameInput = modal.querySelector('#ql-source-name'), urlInput = modal.querySelector('#ql-source-url');
if (!isNew) {
var deleteBtn = modal.querySelector('.ql-delete-btn');
if (deleteBtn) UI.addManagedListener(deleteBtn, 'click', function() {
var index = sources.findIndex(function(s) { return s.id === sourceId; });
if (index !== -1) { sources.splice(index, 1); STORAGE.saveIconSources(sources); }
goBack();
});
}
UI.addManagedListener(modal.querySelector('.ql-back-btn'), 'click', goBack);
UI.addManagedListener(modal.querySelector('.ql-cancel'), 'click', goBack);
UI.addManagedListener(modal.querySelector('.ql-save'), 'click', function() {
if (STATE.isDestroyed) return;
var newName = nameInput.value.trim(), newUrl = urlInput.value.trim();
nameInput.style.borderColor = ''; urlInput.style.borderColor = '';
if (!newName) { nameInput.style.borderColor = '#ef4444'; nameInput.focus(); return; }
if (!newUrl) { urlInput.style.borderColor = '#ef4444'; urlInput.focus(); return; }
if (isNew) sources.push({ id: UTILS.generateId(), name: newName, enabled: true, urlTemplate: newUrl });
else { source.name = newName; source.urlTemplate = newUrl; }
STORAGE.saveIconSources(sources);
goBack();
});
},
init: function() {
if (STATE.isDestroyed) return;
if (!isStillHomePage()) return;
UI.injectStyle();
ICON.cleanExpiredCache();
STATE.retryTimer = setTimeout(function() {
if (!STATE.isDestroyed) CORE.tryRender();
}, CONFIG.RENDER_DELAY);
},
destroy: function() {
STATE.isDestroyed = true;
if (STATE.retryTimer) { clearTimeout(STATE.retryTimer); STATE.retryTimer = null; }
if (STATE.debounceTimer) { clearTimeout(STATE.debounceTimer); STATE.debounceTimer = null; }
if (STATE.currentSearchController) { STATE.currentSearchController.abort(); STATE.currentSearchController = null; }
STATE.activeRequests.clear();
STATE.domObservers.forEach(function(ob) { try { ob.disconnect(); } catch(e) {} });
STATE.domObservers.clear();
UI.removeAllListeners();
CORE.closeExistingModal();
if (STATE.containerRef && STATE.containerRef.parentNode) STATE.containerRef.remove();
STATE.containerRef = null;
document.querySelectorAll('.ql-container').forEach(function(el) { el.remove(); });
STATE.imageCache.clear();
}
};
UI.addManagedListener(window, 'storage', function(e) {
if (STATE.isDestroyed) return;
if (e.key === CONFIG.STORAGE_KEY) { STATE.configCache = null; CORE.render(); }
else if ([CONFIG.GAP_CONFIG_KEY, CONFIG.BTN_SIZE_KEY, CONFIG.GITHUB_ICON_LIBS_KEY,
CONFIG.BTN_RADIUS_KEY, CONFIG.BTN_HEIGHT_KEY].indexOf(e.key) !== -1) {
STATE.gapCache = null; STATE.btnSizeCache = null;
STATE.btnRadiusCache = null; STATE.btnHeightCache = null;
CORE.render();
}
});
UI.addManagedListener(window, 'beforeunload', CORE.destroy);
UI.addManagedListener(document, 'visibilitychange', function() {
if (document.hidden && STATE.currentSearchController) STATE.currentSearchController.abort();
});
window.quickLinksDestroy = CORE.destroy;
window.quickLinksClearData = function() { STORAGE.clearAll(); };
function register() {
window.__tbWidgetRegistry.add({
id: 'quick-links',
label: '快捷方式',
icon: '🔗',
order: 1,
mount: function(ctx) {
STATE.isDestroyed = false;
STATE.retryCount = 0;
STATE.isDark = !!(ctx && ctx.dark);
if (STATE.retryTimer) { clearTimeout(STATE.retryTimer); STATE.retryTimer = null; }
if (STATE.debounceTimer) { clearTimeout(STATE.debounceTimer); STATE.debounceTimer = null; }
CORE.init();
return {
destroy: CORE.destroy,
onDarkChange: function(isDark) {
STATE.isDark = isDark;
if (STATE.containerRef) {
if (isDark) STATE.containerRef.classList.add('ql-dark');
else STATE.containerRef.classList.remove('ql-dark');
}
var overlay = document.querySelector('.ql-overlay');
if (overlay) UI.applyDarkToEl(overlay);
}
};
},
panelSections: [
{
render: function(container) {
var qlPanelOpen = false;
try { qlPanelOpen = localStorage.getItem(CONFIG.PANEL_OPEN_KEY) === 'true'; } catch(e) {}
container.classList.add('ql-panel-settings');
container.classList.toggle('show', qlPanelOpen);
var tries = 0;
function injectGear() {
if (!container.isConnected) {
if (++tries < 30) return requestAnimationFrame(injectGear);
return;
}
var row = container.previousElementSibling;
while (row && !(row.querySelector && row.querySelector('[class*="widget-toggle"]'))) {
row = row.previousElementSibling;
}
var toggle = row && row.querySelector ? row.querySelector('[class*="widget-toggle"]') : null;
if (toggle && !row.querySelector('.ql-panel-gear')) {
var gear = document.createElement('div');
gear.className = 'ql-panel-gear' + (qlPanelOpen ? ' active' : '');
gear.title = '设置';
gear.textContent = '⚙';
gear.addEventListener('click', function(e) {
e.stopPropagation();
var on = container.classList.toggle('show');
gear.classList.toggle('active', on);
qlPanelOpen = on;
try { localStorage.setItem(CONFIG.PANEL_OPEN_KEY, String(on)); } catch(e) {}
});
toggle.parentNode.insertBefore(gear, toggle);
return;
}
if (!container.querySelector('.ql-panel-gear')) {
var gear2 = document.createElement('div');
gear2.className = 'ql-panel-gear' + (qlPanelOpen ? ' active' : '');
gear2.title = '设置';
gear2.textContent = '⚙';
gear2.style.cssText = 'position:absolute;top:6px;right:10px;';
gear2.addEventListener('click', function(e) {
e.stopPropagation();
var on = container.classList.toggle('show');
gear2.classList.toggle('active', on);
qlPanelOpen = on;
try { localStorage.setItem(CONFIG.PANEL_OPEN_KEY, String(on)); } catch(e) {}
});
if (getComputedStyle(container).position === 'static') {
container.style.position = 'relative';
}
container.insertBefore(gear2, container.firstChild);
}
}
requestAnimationFrame(injectGear);
container.innerHTML = '';
function makeSlider(label, id, min, max, val, unit, onInput) {
var sec = document.createElement('div');
sec.style.cssText = 'margin-bottom:10px;';
sec.innerHTML =
'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;"><span style="font-size:12px;color:#374151;font-weight:500;">' + label + '</span><span id="' + id + '-val" style="font-size:11px;color:#6366f1;font-weight:600;background:#eef2ff;padding:1px 6px;border-radius:5px;min-width:36px;text-align:center;">' + val + unit + '</span></div>'+'<input type="range" id="' + id + '" min="' + min + '" max="' + max + '" value="' + val + '" step="1" style="width:100%;accent-color:#6366f1;cursor:pointer;height:4px;">'+'<div style="display:flex;justify-content:space-between;margin-top:2px;"><span style="font-size:10px;color:#9ca3af;">' + min + unit + '</span><span style="font-size:10px;color:#9ca3af;">' + max + unit + '</span></div>';
var slider = sec.querySelector('#' + id);
var valEl = sec.querySelector('#' + id + '-val');
UI.addManagedListener(slider, 'input', function() {
valEl.textContent = this.value + unit;
onInput(+this.value);
});
return sec;
}
var sliderWrap = document.createElement('div');
sliderWrap.style.cssText = 'margin-bottom:8px;';
sliderWrap.appendChild(makeSlider('宽度', 'ql-ps-size', CONFIG.MIN_SIZE, CONFIG.MAX_SIZE, STORAGE.loadBtnSizeConfig(), 'px', function(v) {
STORAGE.saveBtnSizeConfig(v);
if (STATE.containerRef) STATE.containerRef.querySelectorAll('.ql-btn').forEach(function(b) { b.style.width = v + 'px'; });
}));
sliderWrap.appendChild(makeSlider('高度', 'ql-ps-height', CONFIG.MIN_HEIGHT, CONFIG.MAX_HEIGHT, STORAGE.loadBtnHeightConfig(), 'px', function(v) {
STORAGE.saveBtnHeightConfig(v);
if (STATE.containerRef) STATE.containerRef.querySelectorAll('.ql-btn').forEach(function(b) { b.style.height = v + 'px'; });
}));
sliderWrap.appendChild(makeSlider('圆角', 'ql-ps-radius', CONFIG.MIN_RADIUS, CONFIG.MAX_RADIUS, STORAGE.loadBtnRadiusConfig(), 'px', function(v) {
STORAGE.saveBtnRadiusConfig(v);
if (STATE.containerRef) STATE.containerRef.querySelectorAll('.ql-btn').forEach(function(b) { b.style.borderRadius = v + 'px'; });
}));
sliderWrap.appendChild(makeSlider('间距', 'ql-ps-gap', CONFIG.MIN_GAP, CONFIG.MAX_GAP, STORAGE.loadGapConfig(), 'px', function(v) {
STORAGE.saveGapConfig(v);
if (STATE.containerRef) STATE.containerRef.style.gap = v + 'px';
}));
container.appendChild(sliderWrap);
var btnRow = document.createElement('div');
btnRow.style.cssText = 'display:flex;gap:6px;margin-bottom:6px;';
var btnExport = document.createElement('button');
btnExport.textContent = '📤 导出配置';
btnExport.style.cssText = 'flex:1;padding:8px 12px;border-radius:7px;border:1px solid rgba(0,0,0,0.08);background:transparent;color:#64748b;font-size:12px;font-weight:500;cursor:pointer;text-align:center;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;transition:background .15s,color .15s;';
UI.addManagedListener(btnExport, 'mouseover', function() { this.style.background = 'rgba(16,185,129,0.06)'; this.style.color = '#10b981'; });
UI.addManagedListener(btnExport, 'mouseout', function() { this.style.background = 'transparent'; this.style.color = '#64748b'; });
UI.addManagedListener(btnExport, 'click', function() { WIDGET.exportConfig(); });
var btnImport = document.createElement('button');
btnImport.textContent = '📥 导入配置';
btnImport.style.cssText = 'flex:1;padding:8px 12px;border-radius:7px;border:1px solid rgba(0,0,0,0.08);background:transparent;color:#64748b;font-size:12px;font-weight:500;cursor:pointer;text-align:center;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;transition:background .15s,color .15s;';
UI.addManagedListener(btnImport, 'mouseover', function() { this.style.background = 'rgba(99,102,241,0.06)'; this.style.color = '#6366f1'; });
UI.addManagedListener(btnImport, 'mouseout', function() { this.style.background = 'transparent'; this.style.color = '#64748b'; });
UI.addManagedListener(btnImport, 'click', function() {
WIDGET.importConfig(
function() {
btnImport.textContent = '✅ 导入成功';
var idMap = {'ql-ps-size': STORAGE.loadBtnSizeConfig(), 'ql-ps-height': STORAGE.loadBtnHeightConfig(), 'ql-ps-radius': STORAGE.loadBtnRadiusConfig(), 'ql-ps-gap': STORAGE.loadGapConfig()};
Object.keys(idMap).forEach(function(id) {
var sl = container.querySelector('#' + id);
var vl = container.querySelector('#' + id + '-val');
if (sl && vl) { sl.value = idMap[id]; vl.textContent = idMap[id] + 'px'; }
});
setTimeout(function() { if (!STATE.isDestroyed) btnImport.textContent = '📥 导入配置'; }, 2000);
},
function() {
btnImport.textContent = '❌ 格式错误';
setTimeout(function() { if (!STATE.isDestroyed) btnImport.textContent = '📥 导入配置'; }, 2000);
}
);
});
btnRow.appendChild(btnExport);
btnRow.appendChild(btnImport);
container.appendChild(btnRow);
var btnLib = document.createElement('button');
btnLib.textContent = '📦 图标库配置';
btnLib.style.cssText = 'width:100%;padding:8px 12px;border-radius:7px;border:1px solid rgba(0,0,0,0.08);background:transparent;color:#64748b;font-size:12px;font-weight:500;cursor:pointer;text-align:left;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;transition:background .15s,color .15s;margin-bottom:6px;';
UI.addManagedListener(btnLib, 'mouseover', function() { this.style.background = 'rgba(99,102,241,0.06)'; this.style.color = '#6366f1'; });
UI.addManagedListener(btnLib, 'mouseout', function() { this.style.background = 'transparent'; this.style.color = '#64748b'; });
UI.addManagedListener(btnLib, 'click', function() {
var fakeOverlay = document.createElement('div');
fakeOverlay.className = 'ql-overlay';
UI.applyDarkToEl(fakeOverlay);
document.body.appendChild(fakeOverlay);
CORE.openIconLibraryPanel(fakeOverlay, function() {
if (fakeOverlay.parentNode) fakeOverlay.remove();
});
UI.addManagedListener(fakeOverlay, 'mousedown', function(e) {
if (e.target === fakeOverlay) fakeOverlay.remove();
});
});
container.appendChild(btnLib);
var divider = document.createElement('div');
divider.style.cssText = 'height:1px;background:rgba(0,0,0,0.06);margin:4px 0 8px;';
container.appendChild(divider);
var btnReset = document.createElement('button');
btnReset.textContent = '↩ 恢复默认';
btnReset.style.cssText = 'width:100%;padding:8px 12px;border-radius:7px;border:1px solid rgba(0,0,0,0.08);background:transparent;color:#94a3b8;font-size:12px;font-weight:500;cursor:pointer;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;transition:background .15s,color .15s,border-color .15s;';
UI.addManagedListener(btnReset, 'mouseover', function() { this.style.background = 'rgba(239,68,68,0.06)'; this.style.color = '#ef4444'; this.style.borderColor = 'rgba(239,68,68,0.20)'; });
UI.addManagedListener(btnReset, 'mouseout', function() { this.style.background = 'transparent'; this.style.color = '#94a3b8'; this.style.borderColor = 'rgba(0,0,0,0.08)'; });
UI.addManagedListener(btnReset, 'click', function() {
STORAGE.clearAll();
CORE.render();
var idMap = {'ql-ps-size': CONFIG.BTN_SIZE, 'ql-ps-height': CONFIG.BTN_SIZE, 'ql-ps-radius': 28, 'ql-ps-gap': CONFIG.GAP};
Object.keys(idMap).forEach(function(id) {
var sl = container.querySelector('#' + id);
var vl = container.querySelector('#' + id + '-val');
if (sl && vl) { sl.value = idMap[id]; vl.textContent = idMap[id] + 'px'; }
});
});
container.appendChild(btnReset);
}
}
]
});
}
function tryRegister() {
if (window.__tbWidgetRegistry) {
register();
return;
}
window.addEventListener('tb-skill:master-online', function wake() {
window.removeEventListener('tb-skill:master-online', wake);
if (!isStillHomePage()) return;
tryRegister();
});
var ob = new MutationObserver(function() {
if (window.__tbWidgetRegistry) {
ob.disconnect();
if (!isStillHomePage()) return;
tryRegister();
}
});
ob.observe(document.documentElement, { childList: true, subtree: true });
}
function onDestroyAll() {
window.removeEventListener('tb-skill:destroy-all', onDestroyAll);
CORE.destroy();
}
window.addEventListener('tb-skill:destroy-all', onDestroyAll);
tryRegister();
})();