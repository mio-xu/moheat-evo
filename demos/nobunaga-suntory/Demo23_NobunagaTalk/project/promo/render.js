#!/usr/bin/env node
// Pass 2 — deterministic frames of the REAL page (virtual time, see hooks.js) at deviceScaleFactor 2 (3840 × 2160 per frame).
//   node render.js <page url path> <outdir> --scene tea [--say "はい|茶器です|…"] [--say-delay 1,1,3.1] [--ranges 10-20,30-41] [--fix-stand]
//        → a public scripted page (Demo23 / 41 / 42; the scripted brain steers any answer back to its lines). Your turns are typed
//          through the page's own input path (TALKDEMO.say) --say-delay s after "your turn" opens (= the length of your spoken line);
//          without --say the page runs in "just listen" mode (it answers for you).
//        --base http://127.0.0.1:8790 (any static server on the repo root, e.g. python3 -m http.server 8790)
// Writes <outdir>/frames/<frame>.jpg only inside --ranges (virtual seconds; none = no pictures, state only),
// <outdir>/state.jsonl (every frame: meters L/R cool/warm 0–1, #cmd, subtitle, phase, turn panel, characters, events, stage box),
// <outdir>/audio.json (voice / move / fx / ambience calls with their virtual time) and <outdir>/voices/<key>.(mp3|m4a).
const fs = require('fs'), path = require('path');
const { launch, sleep } = require('./cdp.js');
const REPO = path.resolve(__dirname, '../../../../..');
const argv = process.argv.slice(2), opt = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d; };
const [src, out] = argv, BASE = opt('--base', 'http://127.0.0.1:8790');
const said = (opt('--say', '') || '').split('|').filter(Boolean);
const SAY = (opt('--say-delay', '') || '').split(',').filter(Boolean).map(Number);   // s from "your turn" to the typed line, per turn (default 1.5; = the length of your spoken line)
const FPS = +opt('--fps', 30), MAX = +opt('--max', 150), SEED = +opt('--seed', 7);
const RANGES = (opt('--ranges', '') || '').split(',').filter(Boolean).map((r) => r.split('-').map(Number));
const DPR = +opt('--dpr', 2), KEEP_UI = argv.includes('--keep-ui');   // --keep-ui: the whole page as it runs (only the page's subtitles are off; ours are burned in)
const SPEAK = opt('--speak', '') ? JSON.parse(fs.readFileSync(opt('--speak'), 'utf8')) : [];   // per turn: null | { text, dur, lv } — while you "speak", the page's own turn panel shows the words coming in and its mic bars move
const inRange = (t) => RANGES.some(([a, b]) => t >= a - 1e-6 && t < b);
fs.mkdirSync(path.join(out, 'frames'), { recursive: true }); fs.mkdirSync(path.join(out, 'voices'), { recursive: true });

const SEEDED = `(() => { let a = ${SEED} >>> 0 || 1; Math.random = function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; })();`;
// page tweaks for the footage: our own subtitles are burned in by the compositor (bigger, EN + JA), so the page's are hidden
const CSS = `#subs{display:none!important} .vv{display:none!important} #stage .hud-top{display:none!important} #turn{visibility:hidden!important} #behind{visibility:hidden!important} html:not(.u2-on) .stage > #scene, html:not(.u2-on) .stage > .glow { visibility: visible !important; }`;

(async () => {
  const cfg = { mode: 'script', fixStand: argv.includes('--fix-stand'), ls: { 'moheat.talk.scene': JSON.stringify(opt('--scene', 'tea')), 'moheat.sublang': 'en', 'moheat.voicelang': 'ja' } };
  const url = `${BASE}${src}?nomic${said.length ? '' : '&pure'}`;
  const B = await launch({ dpr: DPR, onEvent: (m) => { if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') console.error('[console]', m.params.args.map((a) => a.description || a.value).join(' ').slice(0, 300)); } });
  await B.cdp('Page.addScriptToEvaluateOnNewDocument', { source: `window.__PROMO=${JSON.stringify(cfg)};\n${SEEDED}\n` + fs.readFileSync(path.join(__dirname, 'hooks.js'), 'utf8') });
  await B.cdp('Page.navigate', { url });
  // load: step the virtual clock (no frames needed) until the page is ready
  for (let i = 0; i < 200; i++) { await B.ev(`window.__step && __step(50)`); await sleep(40); if (await B.ev(`document.readyState === 'complete' && !!document.getElementById('startBtn') && !document.getElementById('startBtn').disabled`)) break; }
  await B.ev(`(() => { const s = document.createElement('style'); s.textContent = ${JSON.stringify(KEEP_UI ? '#subs{display:none!important}' : CSS)}; document.head.append(s); })()`);
  await document_fonts(B);
  for (let i = 0; i < 30; i++) await B.ev(`__step(${1000 / FPS})`);
  const stage = await B.ev(`(() => { const r = document.getElementById('stage').getBoundingClientRect(), s = document.querySelector('.side')?.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, side: s ? { x: s.x, y: s.y, w: s.width, h: s.height } : null }; })()`);
  fs.writeFileSync(path.join(out, 'layout.json'), JSON.stringify({ dpr: 2, vw: 1920, vh: 1080, stage }, null, 1));
  // start
  await B.ev(`document.getElementById('startBtn').click()`);
  const t0 = await B.ev(`__vt()`) / 1000;
  const st = fs.createWriteStream(path.join(out, 'state.jsonl'));
  let k = 0, listenSince = -1, ended = false, endT = -1, shots = 0;
  const STATE = `(() => { const D = window.TALKDEMO, S = D && D.S, q = (id) => document.getElementById(id), w = (id) => parseFloat(q(id).style.width) / 100 || 0;
    return { m: [w('mLc'), w('mLh'), w('mRc'), w('mRh')], cmd: q('cmd').textContent, who: q('subWho').textContent, ja: q('subJa').textContent, en: q('subEn').textContent,
      sub: q('subs').classList.contains('show'), phase: D && D.phase, turn: q('turn').classList.contains('show') ? [q('turnK').textContent, q('turnText').textContent] : null,
      ch: S ? Object.fromEntries(S.cast.map((c) => { const h = S.ch[c]; return [c, { key: h.key, az: +h.az.toFixed(3), d: h.dist, talk: h.talking, lv: +h.lv.toFixed(4), x: h.d.x, y: h.d.y, h: h.d.h, kind: h.d.kind, a: h.d.a, flip: !!h.d.flip }]; })) : null,
      ev: S ? S.events.map((e) => [e.k, e.c, +e.az.toFixed(2), +((S.t - e.t0) / e.dur).toFixed(3)]) : [], done: !!(S && S.done), intro: !q('intro').classList.contains('hidden') }; })()`;
  for (let f = 0; f < MAX * FPS; f++) {
    const vt = +(f / FPS).toFixed(4);
    await B.ev(`__step(${1000 / FPS})`);
    const s = await B.ev(STATE); s.f = f; s.t = vt; st.write(JSON.stringify(s) + '\n');
    const sp = SPEAK[k];
    if (sp && s.phase === 'listen' && listenSince >= 0) {
      const x = vt - listenSince - .35, pr = Math.max(0, Math.min(1, x / sp.dur)), lv = x >= 0 && x < sp.dur ? (sp.lv[Math.floor(x * 20)] || 0) : 0;
      await B.ev(`(() => { const t = document.getElementById('turnText'); if (${pr} > 0) { t.textContent = ${JSON.stringify(sp.text)}.slice(0, Math.ceil(${pr} * ${sp.text.length})); t.className = ${pr} < 1 ? 'interim' : ''; }
        document.querySelectorAll('#mic i').forEach((el, i) => { const v = Math.max(0, Math.min(1, ${lv} * 1.3 - i * .1)); el.style.height = (15 + 85 * v) + '%'; el.style.opacity = .4 + .6 * v; }); })()`);
    }
    if (inRange(vt)) { await B.shot(path.join(out, 'frames', `${String(f).padStart(5, '0')}.jpg`), { quality: +opt('--q', 93) }); shots++; }
    // your turn: the next --say line, typed --say-delay s after the turn opens; after the last one, End
    if (said.length) {
      if (s.done) { if (endT < 0) endT = vt; if (vt - endT > 3) break; continue; }
      if (s.phase === 'listen') {
        if (listenSince < 0) listenSince = vt;
        if (vt - listenSince >= (SAY[k] || 1.5)) { listenSince = -1; if (k < said.length) { const x = said[k++]; await B.ev(`TALKDEMO.say(${JSON.stringify(x)})`); console.log(`${vt.toFixed(2)} you: ${x}`); } else if (!ended) { ended = true; await B.ev(`document.getElementById('endBtn')?.click()`); } }
      } else listenSince = -1;
    } else if (s.done && vt > 5) { if (endT < 0) endT = vt; if (vt - endT > 3) break; }
    if (f % 300 === 0) console.log(`t=${vt}s frames=${shots} ${s.phase} ${s.cmd}`);
  }
  st.end();
  if (process.env.PROBE) // debug: is the stage canvas painted?
    console.log('probe', await B.ev(`(() => { const c = document.getElementById('scene'), s = getComputedStyle(c); return [[...c.getContext('2d').getImageData(960, 540, 1, 1).data], s.visibility, s.opacity, s.display, c.width, c.getBoundingClientRect().width, document.getElementById('intro').className] })()`));
  fs.writeFileSync(path.join(out, 'audio.json'), JSON.stringify({ t0, log: await B.ev(`__LOG`) }));
  {   // save the scripted voices that were played (m4a from the kit) for the offline mix
    const keys = [...new Set((await B.ev(`__LOG`)).filter((e) => e.k === 'voice' && e.key).map((e) => e.key))];
    for (const key of keys) { const id = key.slice(4); fs.copyFileSync(path.join(REPO, 'demos/nobunaga-suntory/_kit/talk/media/voice', id + '.m4a'), path.join(out, 'voices', `m4a_${id}.m4a`)); }
  }
  console.log(`done: ${shots} frames → ${out}`);
  B.close(); process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });

async function document_fonts(B) { for (let i = 0; i < 40; i++) { if (await B.ev(`document.fonts.status === 'loaded'`)) return; await sleep(100); } }
