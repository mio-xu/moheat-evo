#!/usr/bin/env node
// Dry run of the live talk's prompt (no server, no key, no cost): prints what live/live.js sends to the ElevenLabs agent for a place
// and cast picked on the cover — the session prompt (scenes.js prompt) and the opening user message (OPEN).
//   node scripts/prompt_dry.js <gifu|tea|kyoto|yamazaki|azuchi> <NI|N|I>
//   node scripts/prompt_dry.js --all      (one line per place × cast: the parts that must change with the choice; + the cast of
//                                          each live entry page: live/index.html = N, ieyasu.html = I, roundtable.html = NI)
const path = require('path');
global.window = {};
require(path.join(__dirname, '..', '..', '_kit', 'talk', 'scenes.js'));
const T = window.TALK;
const build = (id, cast) => { const sc = T.SCENES.find((s) => s.id === id); if (!sc) throw new Error(`no place ${id}`); return { sc, prompt: T.prompt(sc, cast.split('')), open: T.OPEN(sc) }; };
const a = process.argv.slice(2);
if (a[0] === '--all') {
  for (const s of T.SCENES) for (const c of ['NI', 'N', 'I']) {
    const { prompt, open } = build(s.id, c);
    const cast = (prompt.match(/^- (織田信長|徳川家康)：/gm) || []).map((x) => x.slice(2, 6)).join('+');
    const events = (prompt.match(/^ {2}@\|\w+/gm) || []).map((x) => x.trim().slice(2)).join(',');
    const fmt = (prompt.match(/^[NI]\|位置\|/gm) || []).map((x) => x[0]).join('');
    console.log(`${s.id}/${c}: cast=${cast} lines=${fmt} place="${prompt.split('# 場面\n')[1].split('\n')[0].slice(0, 24)}…" events=${events} open-topics=${open.includes(s.topics[0])}`);
  }
  // the three live entry pages (scripts/pages.js) and the cast each one fixes (<body data-cast>)
  const fs = require('fs');
  for (const f of ['index.html', 'ieyasu.html', 'roundtable.html']) {
    const h = fs.readFileSync(path.join(__dirname, '..', 'live', f), 'utf8');
    console.log(`live/${f}: data-cast=${(h.match(/<body data-cast="(\w+)"/) || [])[1] || 'MISSING'} title="${(h.match(/<h1>(.*?)<\/h1>/) || [])[1].replace(/<[^>]+>/g, '')}"`);
  }
} else {
  const { prompt, open } = build(a[0] || 'tea', a[1] || 'NI');
  console.log(prompt); console.log('\n---- first message ----\n' + open);
}
