#!/usr/bin/env node
// Which on-screen Japanese strings of each demo have no translation yet in its l10n.js (+ demos/shared/l10n_common.js)?
//   node tools/l10n/check_missing.js [lang=zh] [DemoFolder…]
// Reads the string literals of main.js / lines.js / art.js / scenes.js and the media/data.js subtitles; prints the missing ones per demo.
// Not every hit is shown on screen (TTS readings, chat comments, canvas text, code keys) — translate the visible ones into text.<lang>.
// A NEW LANGUAGE: add it to LANGS in demos/shared/subs.js, then run this with its code and fill text.<code> in each l10n.js.
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..', 'demos');
const [lang = 'zh', ...only] = process.argv.slice(2);
const J = /[぀-ヿ一-鿿]/, norm = (s) => s.replace(/\s+/g, ' ').trim();
const core = (s) => s.replace(/^[^\p{L}\p{N}「]+/u, '').replace(/[^\p{L}\p{N}」！？!?…。]+$/u, '').trim();
const load = (f) => { const window = {}; try { eval(fs.readFileSync(f, 'utf8')); } catch {} return window; };
const common = load(path.join(ROOT, 'shared', 'l10n_common.js')).MOHEAT_L10N_COMMON?.text?.[lang] || {};
let total = 0;
for (const cat of fs.readdirSync(ROOT).filter((c) => c !== 'shared' && fs.statSync(path.join(ROOT, c)).isDirectory())) {
  for (const d of fs.readdirSync(path.join(ROOT, cat))) {
    const dir = path.join(ROOT, cat, d);
    if (only.length && !only.includes(d)) continue;
    if (!fs.existsSync(path.join(dir, 'l10n.js'))) continue;
    const T = { ...common, ...(load(path.join(dir, 'l10n.js')).MOHEAT_L10N?.text?.[lang] || {}) };
    const keys = new Set(Object.keys(T).flatMap((k) => [norm(k), core(norm(k))]));
    const miss = new Set(), check = (s) => { s = norm(s.replace(/<[^>]+>/g, ' ')); const ja = s.split(/\s[·・]\s/)[0]; if (J.test(ja) && !keys.has(ja) && !keys.has(core(ja))) miss.add(ja); };
    for (const f of ['main.js', 'lines.js', 'art.js', 'scenes.js']) {
      const p = path.join(dir, f); if (!fs.existsSync(p)) continue;
      const src = fs.readFileSync(p, 'utf8').replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
      for (const m of src.matchAll(/(['"`])((?:\\.|(?!\1).)*?)\1/g)) for (const part of m[2].split(/\$\{[^}]*\}/)) if (J.test(part)) check(part);
    }
    for (const s of load(path.join(dir, 'media', 'data.js')).DEMO_DATA?.anim?.subs || []) if (s.ja) check(s.ja);
    if (miss.size) { console.log(`\n${cat}/${d}: ${miss.size}`); for (const m of miss) console.log('  ', m); total += miss.size; }
  }
}
console.log(`\n${total} strings without ${lang} (review: only visible ones need a translation)`);
