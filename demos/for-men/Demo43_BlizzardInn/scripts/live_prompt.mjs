// Dry run of the PRIVATE live talk's prompt (no server, no request, no cost): prints the prompt live/live.js sends for a place × cast.
//   node demos/for-men/Demo43_BlizzardInn/scripts/live_prompt.mjs [place=hall] [cast=MHN]     (repo root; "all" = check every combination)
import fs from 'fs'; import vm from 'vm';
const win = { location: { search: '' }, document: { getElementById: () => ({ hidden: false }), querySelector: () => null, createElement: () => ({}), head: { append() {} } }, INNAudio: {} };
win.window = win; win.URLSearchParams = URLSearchParams; win.console = console; win.setTimeout = setTimeout;
const ctx = vm.createContext(win);
vm.runInContext(fs.readFileSync('demos/shared/talk.js', 'utf8'), ctx);
vm.runInContext(fs.readFileSync('demos/for-men/Demo43_BlizzardInn/live/live.js', 'utf8'), ctx);
const [place = 'hall', cast = 'MHN'] = process.argv.slice(2), L = win.INN_LIVE;
if (place === 'all') {
  let bad = 0;
  for (const p of ['pass', 'hall', 'room', 'door', 'dawn']) for (const c of ['M', 'H', 'N', 'MHN']) {
    const t = L.prompt({ place: p, cast: c }), names = { M: 'ミント', H: 'ひなた', N: '渚' };
    const ok = t.includes('# 場面') && t.includes('# 出力形式') && [...'MHN'].every((w) => c.includes(w) === t.includes(`- ${names[w]}：`)) && !t.includes('undefined');
    if (!ok) bad++; console.log(`${p.padEnd(5)} ${c.padEnd(3)} ${t.length} chars ${ok ? 'ok' : 'BAD'}`);
  }
  console.log(`story prompt ${L.prompt(null).length} chars`); process.exit(bad ? 1 : 0);
}
console.log(L.prompt({ place, cast }));
