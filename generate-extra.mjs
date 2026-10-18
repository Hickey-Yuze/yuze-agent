import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPTS = join(HERE, 'extension', 'scripts');
const CHECK = join(HERE, 'out-scheck');
mkdirSync(CHECK, { recursive: true });
const all = JSON.parse(readFileSync('/tmp/tabbit-all.json', 'utf-8'));
const ICONS = ['🧩','⭐','🚀','🔧','🎯','💡','📦','🛠️','📌','✨','🧠','🗂️','⚡','🌈','🔑','📎'];
const catMap = { '网页脚本': 'script', '任务': 'task', '提示词': 'prompt' };
const sidepanelSrc = readFileSync(join(HERE, 'extension', 'sidepanel.js'), 'utf-8');
const existingNames = [...sidepanelSrc.matchAll(/name: '([^']{1,80})'/g)].map(m => m[1]);
const isDup = (nm) => existingNames.some((ex) => ex === nm || (nm.length > ex.length && nm.startsWith(ex)) || (ex.length > nm.length && ex.startsWith(nm)));
const DUP_NO = new Set([800, 824, 836, 825]);
const SECRET_PATTERNS = [/AKID[A-Za-z0-9]{13,}/, /\bsk-[A-Za-z0-9]{20,}/, /\bghp_[A-Za-z0-9]{20,}/, /AIza[0-9A-Za-z_\-]{30,}/, /xox[bps]-[A-Za-z0-9\-]{10,}/, /secretKey\s*[:=]\s*["'][A-Za-z0-9+\/]{20,}/i];
const hasSecret = (t) => SECRET_PATTERNS.some((re) => re.test(t || ''));
const out = [];
let okScript = 0, badScript = 0, missing = 0, promptWithContent = 0, dup = 0, secret = 0;
for (const item of all) {
  const p = `/tmp/tabbit-api/${item.no}.json`;
  if (!existsSync(p)) { missing++; continue; }
  let j; try { j = JSON.parse(readFileSync(p, 'utf-8')); } catch (_) { missing++; continue; }
  const d = j.data || {};
  const det = d.detail || {};
  const ed = d.editor_data || {};
  const mk = d.marketplace || {};
  const sn = d.publication_snapshot || {};
  const cat = catMap[item.type] || 'prompt';
  const name = String(det.original_title || det.title || item.name || '').slice(0, 80);
  if (DUP_NO.has(item.no) || isDup(name)) { dup++; continue; }
  const desc = String(det.original_description || sn.original_introduction || det.description || item.desc || '来自妙招广场。').slice(0, 300);
  const code = String(ed.code || '');
  const content = String(ed.content || '');
  const entry = {
    id: 'g' + item.no,
    cat,
    icon: cat === 'script' ? '🧩' : ICONS[item.no % ICONS.length],
    name,
    desc,
    prompt: '',
    author: String((det.creator || {}).display_name || item.author || '').slice(0, 30),
    installs: Number(mk.install_user_count || item.installs) || 0,
    src: 'installed',
  };
  if (cat === 'script') {
    if (!code) { badScript++; continue; }
    const tmp = join(CHECK, 'g' + item.no + '.js');
    writeFileSync(tmp, code);
    let ok = false;
    try { execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' }); ok = true; } catch (_) { ok = false; }
    if (!ok) { badScript++; continue; }
    if (hasSecret(code) || hasSecret(desc) || hasSecret(content)) { secret++; continue; }
    writeFileSync(join(SCRIPTS, 'g' + item.no + '.user.js'), code);
    entry.codeFile = 'scripts/g' + item.no + '.user.js';
    if (ed.bind_url && ed.bind_url !== '*') entry.site = String(ed.bind_url).slice(0, 120);
    okScript++;
  } else {
    if (hasSecret(content) || hasSecret(desc)) { secret++; continue; }
    entry.prompt = (content || desc || '按照妙招描述执行任务。').slice(0, 4000);
    if (content) promptWithContent++;
  }
  out.push(entry);
}
import { rmSync } from 'node:fs';
try { rmSync(CHECK, { recursive: true, force: true }); } catch (_) {}
const js = 'window.YUZE_DISCOVER_EXTRA = ' + JSON.stringify(out) + ';\n';
writeFileSync(join(HERE, 'extension', 'skills-extra.js'), js);
console.log(JSON.stringify({ total: all.length, dup, secret, extra: out.length, script: okScript, badScript, missing, promptWithContent, sizeKB: Math.round(js.length / 1024) }));
