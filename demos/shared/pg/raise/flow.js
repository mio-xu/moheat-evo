// PG.raise — the generic idol-raising game (2026-11-14; was diva-diary/game/flow.js). A game folder gives only DATA (see ../../ENGINE.md):
//   window.GAME_SETUP  this game: id, langs, which live object, home / title places, folders (setup.js)
//   window.DP_GAME     the story and the rules (content.js: weeks, chapters, acts, events, songs, ranks, endings, UI texts) — pure data + functions
//   window.CHAR_PACK   the character (packs/<name>/pack.js: models, poses, faces, actions, head layers, colours)
//   window.STORY_LL    per-line faces / actions, scene layers and props, lesson poses (story_ll.js) · window.DP_BGM / DP_VOICE (optional) · CHAR_STILLS / SONG_STILLS (fallback stills, built)
//   the concert = a song pack (window[GAME_SETUP.live], made by engine/pg.live.js). Cameras / timings / layout / keys: engine/rules.js.
// Screens: title → (week: [chapter card] → plan → 3 activities (lessons = rhythm parts of the chapter's song) → story beat [→ small stage]) × N
//          → concert (a part of the other songs + the main song) → ending → result card.
// Debug: ?night=H1&inv=scarf (asmr-love: one night alone) · ?ending=q2&rank=A&secret (ending picture + result card) · ?auto (plays itself; &acts=vocal,dance… &pick=0 &grade=perfect &hold=choice|tap|live) · ?week=5&main=q3&card (jump ahead; card = show the chapter card) · ?live=q1…q4&t=50&mode=watch (concert only) · ?lang=zh|ja|en
// PG_READY: a published page may fetch its song data first (the kit's songs/<id>/timeline.json); locally it is not set.
(window.PG_READY || Promise.resolve()).then(() => {
  const PG = window.PG, G = window.DP_GAME, R = G.rules, SET = window.GAME_SETUP || {}, Live = (SET.live && window[SET.live]) || null;
  // the genre's preset (engine/rules.js presets[genre]: e.g. asmr-love = thermal safety scheduler on, talk camera, dist → camera) over the rules, before anything reads them
  { const RU = window.PG_RULES || {}, pre = (RU.presets || {})[SET.genre || G.GENRE];
    const deep = (a, b) => { for (const [k, v] of Object.entries(b || {})) { if (v && typeof v === 'object' && !Array.isArray(v) && a[k] && typeof a[k] === 'object') deep(a[k], v); else a[k] = v; } return a; };
    if (pre) deep(RU, pre); }
  const CP = window.CHAR_PACK || null, SL = window.STORY_LL || {}, RULES = window.PG_RULES || {}, DIR = Object.assign({ scenes: 'art/scenes', cg: 'art/cg', voice: 'audio/voice' }, SET.dirs || {});
  const HOME = Object.assign({ scene: Object.keys(G.SCENES)[0], pose: 'front' }, SET.home || {}), TITLE = Object.assign({ scene: HOME.scene, x: 50, amb: {}, pose: HOME.pose, fx: 'petals', bgm: 'day' }, SET.title || {});
  if (CP && CP.colours) { const st = document.documentElement.style; if (CP.colours.accent) st.setProperty('--accent', CP.colours.accent); if (CP.colours.accent2) st.setProperty('--accent2', CP.colours.accent2); if (CP.colours.go) st.setProperty('--go', CP.colours.go); }
  // pictures change without changing their names (eyebrow fix, new poses): a version on every everyday-pose file keeps phones from showing an old one
  const { $, T, Q, AUTO, sleep, clamp, store, sfx, stage, ui, Therm, fx } = PG, U = (k, vars) => T(G.UI[k], vars);
  let app, S = null, run = 0;   // S = { week, s: numbers } · run = id of the current playthrough (a reset cancels the old one)

  // where each pose stands: h = height (% of the frame height), b = bottom, x = centre
  const BUST = { h: 58, b: 27 };   // her head stays under the two rows of numbers at the top
  const HALF = { h: 74, b: 7 };   // the lesson poses are drawn down to the hips: bigger and lower, so the head is as large as in the bust poses (the dialogue sheet covers the rest)
  const LAY = SET.stillLay || { vocal: HALF, dance: { h: 70, b: 8 }, tired: HALF, band: HALF, write: HALF, street: HALF, radio: HALF, front: BUST, hands: BUST, fan: BUST, drink: BUST, gift: BUST, wave: BUST, photo: { h: 70, b: 25, x: 54 }, earL: { h: 82, b: 17, x: 40 }, earR: { h: 82, b: 17, x: 60 },
    plan: { h: 34, b: 53 }, title: { h: 60, b: 20, x: 60 }, liveBust: { h: 50, b: 22 }, lesson: { h: 44, b: 34 }, lessonHalf: { h: 52, b: 27, fade: true }, planWide: { h: 84, b: -8, x: 30 }, titleWide: { h: 96, b: -12, x: 30 } };   // wide screen: she stands left of the week plan   // a half-body pose standing free during a rhythm part: its cut lower edge fades out
  // ---- the character as a LivLiv model: one model per outfit (CHAR_PACK), story pose names → LivLiv poses + faces; ear lines = camera push-in
  // toward that ear; per line a face and a LivLiv action (STORY_LL.lines); mouth from the voice. Without WebGL2: the pack's fallback stills (same poses and cameras).
  // cameras: engine rule ← the character's body type (pack) ← this story
  const CAMS = Object.assign({}, RULES.cams || {}, (CP && CP.cams) || {}, SL.cams || {}), FULL_POSES = (RULES.talk || {}).fullPoses || [], LLS = (Live && Live.stageLL) || {};
  const packUrl = (p) => (CP.base || '') + p + (CP.ver || ''), useLL = () => !!(PG.ll && PG.ll.ok !== false && CP);
  let outfit = CP && CP.defaultOutfit, llSeen = null;   // llSeen: the place whose first talk line was already shown full figure
  const poseOf = (name) => { const e = CP.poses[name] || CP.poses[HOME.pose]; return Array.isArray(e) ? e : e[outfit] || e['*']; };
  // without WebGL2 (PG.ll.ok false): the pack's fallback stills (tools/still_tool.py → CHAR_STILLS / SONG_STILLS), same poses, same cameras
  const CST = window.CHAR_STILLS, SST = window.SONG_STILLS;
  const still = (set, outfit, pose, extra) => { const o = set && set.outfits[outfit]; return o && (o[[pose, ...extra].join('+')] || o[pose] || o.x_idle || o.base || Object.values(o)[0]); };
  const stillShow = (set, e, cam) => { if (e) return stage.pose(e, PG.ll.stillLay(e, cam, set.fig)); };
  let stillPose = null;
  // a scene prop: a name = the character pack's own prop (in that character's style), an object = the story's own picture
  const propOf = (p) => (!p ? null : typeof p === 'string' ? (CP.props && CP.props[p] ? { ...CP.props[p], src: packUrl(CP.props[p].src) } : null) : p);
  async function llDay(name, o = {}) {
    const P = poseOf(name), L = (o.line && (SL.lines || {})[o.line]) || {}, o2 = P[0] || outfit, ear = name === 'earL' || name === 'earR' ? name : null;
    const extra = Object.entries(CP.layers || {}).filter(([k, v]) => ((SL.layersAt || {})[here] || []).includes(k) && (!v.outfits || v.outfits.includes(o2))).map(([, v]) => v.expr);
    const pose = L.pose || P[1] || (PG.ll.ok !== false ? PG.ll.pose : stillPose) || 'x_idle';
    // framing: ear lines push in; the first line in a new place and the full-figure poses show all of her; other talk = medium shot (eased by PG.ll)
    const cam = o.cam || ear || (((RULES.talk || {}).fullFirstLineInPlace !== false && here !== llSeen) || FULL_POSES.includes(pose) ? 'full' : 'talk'); if (!o.cam) llSeen = here;
    if (useLL() && await PG.ll.show(packUrl(CP.models[o2]), { pose, face: 'face' in L ? L.face : P[2], cam: CAMS[cam], extra, prop: propOf((SL.propAt || {})[here]), offsets: CP.poseOffset || {} })) { outfit = o2; return true; }
    outfit = o2; stillPose = pose; await stillShow(CST, still(CST, o2, pose, extra), CAMS[cam]); return true;
  }
  // the stage outfit of a song (the ending lines after the concert): push-in at the ear, otherwise a close bust view
  async function llStage(q, ear, id) {
    const L = (id && (SL.lines || {})[id]) || {}, pose = L.pose || 'x_clasp', cam = CAMS[ear ? 'ear' + ear : 'bust'];
    if (useLL() && await PG.ll.show(Live.base + LLS[q].model + Live.ver, { pose, face: L.face || 'smile', cam, extra: [], prop: null, offsets: LLS[q].poseOffset || {} })) return true;
    await stillShow(SST, still(SST, LLS[q].model, pose, []), cam); return true;
  }
  const day = async (name, lay, o = {}) => { if (CP && CP.poses[name]) await llDay(name, o); };
  const BGM = window.DP_BGM || {}, music = (name, vol = (RULES.music || {}).vol ?? .42) => { if (name === 'none') return PG.bgm.stop(1); const m = BGM[name]; if (m) PG.bgm.play(m.src, vol, [m.a, m.b]); };   // 'none' = silence (an explicit choice)
  let here = null;   // the place on screen: a change gets a whoosh and a soft flash; each place has its music and its air
  const scene = (key) => { const s = G.SCENES[key]; if (here !== key) { if (here) { sfx.whoosh(); fx.flash('#fff', 320, .35); } here = key; }
    stage.place(`${DIR.scenes}/${key}.webp`, s.x, T(s.name)); Therm.ambient(s.amb); fx.ambient(s.fx); fx.rays(s.rays); music(s.bgm); };
  // voice files (tools/voice.py): audio/voice/ja/<id>.m4a — Japanese in every subtitle language (user 2026-11-13). game/voice.js lists only
  // the lines whose recording matches the current text; a line that was rewritten stays silent until voice.py is run again.
  const VL = (CP && CP.voice && CP.voice.lang) || 'ja', VOICE = (window.DP_VOICE || {})[VL] || {}, IDS = new Map(G.lines().map((l) => [l.text, l.id]));
  const spoken = (text) => { const id = IDS.get(text), DV = window.DP_VOICE || {}, lg = id && DV[PG.lang] && DV[PG.lang][id] ? PG.lang : VL, d = id && (DV[lg] || {})[id]; return d ? { voice: `${DIR.voice}/${lg}/${id}.m4a`, voiceDur: d } : {}; };   // the subtitle language's recording when there is one (en), else the pack's voice language
  const say = (text, o = {}) => {
    const id = IDS.get(text), L = id && (SL.lines || {})[id];
    if (L && useLL() && PG.ll.shown) PG.ll.set({ ...('face' in L ? { face: L.face } : {}), ...(L.act ? { act: L.act, at: L.at, secs: L.secs } : {}) });
    return ui.say(text, { ...spoken(text), ...(text && text.me ? { name: '' } : {}), ...o });   // text.me = your own thought / narration: no speaker name, never voiced
  };

  // ---------------------------------------------------------------- numbers on screen
  const BARS = G.BARS || Object.keys(G.STATS).filter((k) => k !== 'fans');
  function hud() {
    if (!S) return;
    $('hudWeek').textContent = S.week > G.WEEKS ? '♪' : U('week', { w: Math.max(1, S.week) }); $('hudFans').textContent = `♥ ${S.s.fans.toLocaleString()}`;
    const box = $('hudBars'); if (!box.children.length) for (const k of BARS) { const d = document.createElement('div'); d.className = 'bar'; d.dataset.k = k; d.innerHTML = '<span></span><u><i></i></u><em></em>'; box.append(d); }
    for (const d of box.children) { const k = d.dataset.k, v = Math.round(S.s[k]); d.children[0].textContent = T(G.STATS[k]); d.querySelector('i').style.width = `${v}%`; d.children[2].textContent = v; d.classList.toggle('low', k === 'stamina' && v < 20); }
  }
  function showDelta(d) {
    let i = 0, up = false, bond = false;
    for (const [k, v] of Object.entries(d)) { if (!G.STATS[k] || !v) continue; ui.pop(`${T(G.STATS[k])} ${v > 0 ? '+' : ''}${Math.round(v)}`, i++, v < 0 ? '#ffd0d0' : ''); if (v > 0) { up = true; if (k === 'bond') bond = true; flashBar(k); } }
    if (bond) { sfx.heart(); fx.burst('heart', 50, 40, 9); } else if (up) { sfx.up(); fx.burst('star', 50, 40, 8); } else if (i) sfx.miss();
    hud();
  }
  const flashBar = (k) => { const el = $('hudBars').querySelector(`[data-k="${k}"]`); if (!el) return; el.classList.remove('gain'); void el.offsetWidth; el.classList.add('gain'); };
  addEventListener('pg:thermal', (e) => { const t = e.detail, dot = (c, h) => (c > .03 && c >= h ? `rgba(63,168,255,${.35 + c * .65})` : h > .03 ? `rgba(255,122,60,${.35 + h * .65})` : 'rgba(255,255,255,.28)'); $('tL').style.background = dot(t.Lc, t.Lh); $('tR').style.background = dot(t.Rc, t.Rh); });

  // ---------------------------------------------------------------- one week: (chapter card) → plan → three activities → story beat
  const chapterSong = (week) => (G.CHAPTERS && G.CHAPTERS.length ? G.CHAPTERS[R.chapterOf(week)].song : null);
  // weeks 1, 3, 5, 7 open a chapter: its name and the song of these two weeks
  async function chapterCard(week) {
    const n = R.chapterOf(week), c = G.CHAPTERS[n]; scene(HOME.scene); await day(HOME.pose); fx.flash('#fff', 500, .6); sfx.confirm(); fx.burst('star', 50, 30, 14);
    await say(`${U('chapter', { n: n + 1, t: T(c.name) })}\n♪ ${T(G.SONGS[c.song].song)}\n${U('chapterSong', { s: T(G.SONGS[c.song].song) })}`, { name: '' });
  }
  // one small line drawing per activity (24 × 24, stroke = text colour)
  const ICON = {
    vocal: '<path d="M12 3a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM6 11a6 6 0 0 0 12 0M12 17v4M9 21h6"/>',
    dance: '<circle cx="13" cy="4.5" r="2"/><path d="M13 7.5l-3 4.5 4 2.5-1 6M10 12l-4.5 1M14 9.5l4.5 2M10.5 13l-2.5 7"/>',
    acting: '<circle cx="12" cy="12" r="9"/><path d="M8 14a4.5 4.5 0 0 0 8 0M9 9.5v.6M15 9.5v.6"/>',
    band: '<path d="M13 2L5 13h6l-1 9 8-11h-6z"/>',
    write: '<path d="M4 20l1-4L16 5l3 3L8 19zM14 7l3 3M12 20h8"/>',
    street: '<path d="M4 10v4h3l8 4V6l-8 4zM18 9a4 4 0 0 1 0 6M8 14l1 5h2"/>',
    radio: '<path d="M4 15v-3a8 8 0 0 1 16 0v3M4 15a2 2 0 0 1 2-2h1v6H6a2 2 0 0 1-2-2zM20 15a2 2 0 0 0-2-2h-1v6h1a2 2 0 0 0 2-2z"/>',
    rest: '<path d="M5 8h12v6a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5zM17 10h1.5a2.5 2.5 0 0 1 0 5H17M8 3v2M12 3v2"/>',
    outing: '<circle cx="12" cy="12" r="2.2"/><path d="M12 9.8V4M12 20v-5.8M9.8 12H4M20 12h-5.8M7 7l3.4 3.4M17 17l-3.4-3.4M17 7l-3.4 3.4M7 17l3.4-3.4"/>',
  };
  function paintMastery(box, now) {
    box.innerHTML = ''; for (const c of G.CHAPTERS || []) { const q = c.song, v = Math.round(S.s['m_' + q]), d = document.createElement('div'); d.className = 'ms' + (q === now ? ' now' : '');
      d.innerHTML = '<span></span><u><i></i></u>'; d.firstChild.textContent = `${q === now ? '♪ ' : ''}${T(G.SONGS[q].short)} ${v}`; d.querySelector('i').style.width = `${v}%`; box.append(d); }
  }
  function plan() {
    return new Promise((done) => {
      scene(HOME.scene); day(HOME.pose, PG.wide ? LAY.planWide : LAY.plan, { cam: 'plan' }); if (useLL()) PG.ll.set({ face: 'smile' }); ui.sheet('plan'); app.dataset.screen = 'plan';
      const picks = [], cards = $('cards'), slots = $('slots'), go = $('planGo'), now = chapterSong(S.week), gig = R.gigSong ? R.gigSong(S.week) : null; $('planTitle').textContent = U('plan'); $('planHint').textContent = U('planHint'); paintMastery($('mastery'), now);
      const tooTired = (a, st) => a.flat.stamina < 0 && st + a.flat.stamina < 0;
      const paint = () => {
        let st = S.s.stamina; picks.forEach((a) => { st = tooTired(a, st) ? st + 30 : clamp(st + a.flat.stamina, 0, 100); });
        $('planHint').textContent = picks.length ? U('stamAfter', { a: Math.round(S.s.stamina), b: Math.round(st) }) : U('planHint');   // what the picks will cost, before going
        cards.innerHTML = ''; for (const a of G.ACTS) {
          const b = document.createElement('button'), n = picks.filter((p) => p === a).length, q = a.lesson ? now : a.gig ? gig : null; b.type = 'button'; b.dataset.key = G.ACTS.indexOf(a) + 1; b.className = 'card' + (tooTired(a, st) ? ' tired' : '');
          b.className += (n ? ' picked' : '') + (q ? ' song' : ''); b.innerHTML = `<svg viewBox="0 0 24 24">${ICON[a.id] || ''}</svg><b></b><small></small>${n ? `<sup>${n}</sup>` : ''}`; b.children[1].textContent = T(a.name); b.children[2].textContent = T(a.hint);   // ♪ in the corner = a rhythm part of a song
          b.onclick = () => { if (picks.length >= G.SLOTS) return; sfx.pick(); picks.push(a); paint(); }; cards.append(b);
        }
        slots.innerHTML = ''; for (let i = 0; i < G.SLOTS; i++) { const d = document.createElement('button'); d.type = 'button'; d.className = 'slot' + (picks[i] ? ' full' : ''); d.textContent = picks[i] ? T(picks[i].name) : `${i + 1}`; d.onclick = () => { if (picks[i]) { sfx.tap(); picks.splice(i, 1); paint(); } }; slots.append(d); }
        go.disabled = picks.length < G.SLOTS;
      };
      go.onclick = () => { removeEventListener('keydown', keys); sfx.confirm(); app.dataset.screen = 'play'; done(picks.slice()); };
      // keyboard: 1–9 = that activity, Backspace = take the last one back (Enter = Go: the engine presses the main button)
      const keys = (ev) => { if (!$('gear').hidden || $('plan').hidden) return; if (/^[1-9]$/.test(ev.key)) { const c = cards.children[+ev.key - 1]; if (c) { ev.preventDefault(); c.click(); } } else if (ev.key === 'Backspace' && picks.length) { ev.preventDefault(); sfx.tap(); picks.pop(); paint(); } };
      addEventListener('keydown', keys);
      paint();
      if (AUTO) {   // test player: ?acts=a,b,c cycles through that list, rests first when tired
        const want = (Q.get('acts') || '').split(',').filter(Boolean), byId = (id) => G.ACTS.find((a) => a.id === id);
        while (picks.length < G.SLOTS) picks.push(S.s.stamina < 30 && !picks.length ? byId('rest') : byId(want[(S.week * G.SLOTS + picks.length) % (want.length || 1)]) || G.ACTS[Math.floor(Math.random() * G.ACTS.length)]);
        paint(); setTimeout(() => go.onclick(), 10);
      }
    });
  }
  // One rhythm part of a song. stage: false = in the place of the lesson, in her everyday clothes. Returns the kit's result.
  async function songPart(q, part, kicker, onStage, ll) {
    app.dataset.screen = 'live'; if (onStage) fx.flash('#fff', 500, .7);
    const r = await Live.play({ q, mode: 'rhythm', from: part[0], to: part[1], stage: onStage, kicker, leniency: R.leniency(S.s), ll });
    app.dataset.screen = 'play'; return r;
  }
  const songUp = (q, d) => { if (d > 0) ui.pop(`♪ ${T(G.SONGS[q].short)} +${d}`, 4, '#ffe9a8'); };
  // a lesson or a gig = about 15 s of a song: the first week of a chapter practises the verses, the second week the chorus
  async function practice(a, slot) {
    const q = a.lesson ? chapterSong(S.week) : R.gigSong(S.week), ps = Live.parts(q, 15), sc = G.SCENES[a.scene];
    const order = a.gig ? [3, 4, 1] : S.week % 2 ? [0, 1, 2] : [3, 4, 2], p = ps[order[slot % 3] % ps.length];
    await day(a.pose, LAY[a.pose] === HALF || a.pose === 'dance' ? LAY.lessonHalf : LAY.lesson, { cam: 'lesson' });
    const r = await songPart(q, p, U('practice', { a: T(a.name) }), false, CP && { seq: (SL.lessonSeq || {})[a.id] || CP.seq || ['x_idle'], cam: CAMS.lesson });
    music(sc.bgm); fx.rays(sc.rays); Therm.ambient(sc.amb);
    const acc = r.skipped ? null : r.acc; songUp(q, R.practise(S.s, q, AUTO ? .8 : acc, a.gig ? 'gig' : 'lesson'));
    if (r.skipped) return AUTO ? Q.get('grade') || 'good' : 'miss';   // skipping = hardly any practice
    const grade = r.acc >= .9 ? 'perfect' : r.acc >= .6 ? 'good' : 'miss';
    ui.toast(U('lessonResult', { p: Math.round(r.acc * 100), m: G.TAPMUL[grade] }), 2200); if (grade === 'perfect') { sfx.perfect(); fx.burst('star', 50, 40, 14); }   // the player sees what the practice was worth
    return grade;
  }
  async function runAct(a, slot = 0) {
    scene(a.scene); await day(a.pose, null, { line: `act_${a.id}` }); ui.sheet(null); ui.toast(T(a.name), 1100); await sleep(900);
    const tired = a.flat.stamina < 0 && S.s.stamina + a.flat.stamina < 0;
    const grade = tired ? 'good' : a.lesson || a.gig ? await practice(a, slot) : a.tap ? await ui.tapGame(S.week) : 'good', r = R.act(S.s, a, grade);
    await day(a.pose, null, { line: `act_${a.id}` }); showDelta(r.delta);
    if (r.tired) { ui.toast(U('tired')); await day('tired', null, { line: 'tired' }); await say(G.TIRED); return; }
    if (a.fans) fx.burst('note', 50, 34, 8);
    await say(a.line, a.cold ? { th: { [a.cold + 'c']: .9 } } : {});   // a.cold: the cold bottle against that cheek
    if (a.msg) { ui.toast(U('voiceMsg'), 1200); await say(a.msg); }   // a place may bring his voice message (content ACTS[].msg; UI.voiceMsg)
    if (a.gift) { (S.inv = S.inv || []).push(a.gift); const pr = (CP && CP.props || {})[a.gift]; ui.toast(U('gotGift', { g: pr && pr.label ? T(pr.label) : a.gift }), 1800); sfx.up(); }   // a day place gives an item: a gift for the night (asmr-love)
  }
  // the night: an ASMR episode (story.json via PG.story, engine/raise/night.js) — gifts from the inventory, its choices move the numbers
  async function night(ev) {
    app.dataset.screen = 'night'; ui.sheet(null); here = null;
    // music under the call: the game's night theme (G.MUSIC.night, a story may name its own), quiet; off while he is at your ear (rules.music.closeOff)
    const MU = RULES.music || {}, nm = (window.PG_STORIES[ev.night] || {}).bgm || (G.MUSIC || {}).night || 'none';
    const under = (b) => { music(nm, MU.closeOff && b && b.dist === 'close' ? 0 : MU.night ?? .16); };
    under(null);
    const r = await PG.night.run(ev.night, { inventory: (S.inv = S.inv || []), onStat: (fx2) => { const d = R.add(S.s, fx2); showDelta(d); hud(); }, onBeat: under });
    app.dataset.screen = 'play'; Therm.direct(null); return r;
  }
  // a story line: [pose, text, ear?, thermal?]
  const line = async (l, poseFn) => { await poseFn(l[0], null, { line: IDS.get(l[1]), ear: l[2] }); if (l[2]) fx.burst('heart', l[2] === 'L' ? 22 : 78, 30, 3); await say(l[1], { ear: l[2], th: l[3] }); };
  async function event(n) {
    const ev = G.EVENTS[n]; if (!ev) return; if (ev.scene) scene(ev.scene);
    for (const l of ev.lines || []) await line(l, day);
    if (ev.night) await night(ev);
    if (ev.choices) { const c = ev.choices[await ui.choose(ev.choices)]; const d = R.add(S.s, c.fx); showDelta(d); for (const cq of G.CHAPTERS) songUp(cq.song, d['m_' + cq.song] || 0); await line(c.re, day); }
    if (ev.stage) {   // the chapter's small stage: 30 s of its song, in costume
      const ch = R.chapterOf(n), q = G.CHAPTERS[ch].song, ps = Live.parts(q, 30), r = await songPart(q, ps[1] || ps[0], U('stageKicker', { n: ch + 1 }), true), acc = r.skipped ? null : r.acc;
      here = null; scene(ev.scene); const up = R.practise(S.s, q, AUTO ? .8 : acc, 'stage'), fans = R.stageFans(S.s, acc); R.add(S.s, { fans }); hud(); ui.sheet(null);
      ui.toast(U('stageFans', { n: fans }), 2400); songUp(q, up); sfx.fanfare(); fx.rays(true); fx.burst('confetti', 50, 30, 36); await day('wave'); await sleep(1100); fx.burst('confetti', 30, 28, 20); fx.burst('confetti', 70, 28, 20); await sleep(1300); fx.rays(G.SCENES[ev.scene].rays);
    }
    if (ev.night && ev.after && ev.scene) { here = null; scene(ev.scene); }
    for (const l of ev.after || []) await line(l, day);
  }

  // ---------------------------------------------------------------- the concert: a part of the three other songs, then the main song in full → ending
  // a story without songs (no CHAPTERS / no song pack): straight to the ending, ranked on the numbers alone
  async function quietFinale(my) {
    S.week = G.WEEKS + 1; hud(); const rank = R.rank(S.s, 0); here = null; scene(HOME.scene); if ((G.MUSIC || {}).ending) music(G.MUSIC.ending);
    for (const l of (G.ENDING || {})[rank] || []) await line(l, day); if (my !== run) return;
    await showCG(rank, T(G.RANKS[rank].title)); store.set('save', null); await result(null, rank, false, null);
  }
  const hasSongs = () => !!(Live && G.CHAPTERS && G.CHAPTERS.length);
  async function finale(my) {
    if (!hasSongs()) return quietFinale(my);
    const main = R.mainSong(S.s), others = G.CHAPTERS.map((c) => c.song).filter((q) => q !== main); S.week = G.WEEKS + 1; hud(); app.dataset.screen = 'live';
    PG.bgm.stop(1); fx.ambient('sparkle'); fx.rays(true); fx.flash('#fff', 600, .8); here = null;
    // the weeks of training make the timing more forgiving; how well the concert is played moves the final rank (main song 70 %, the three parts 10 % each)
    let sum = 0, w = 0, combo = 0;
    for (let i = 0; i < others.length; i++) { const ps = Live.parts(others[i], 15), r = await songPart(others[i], ps[3] || ps[ps.length - 1], U('medley', { i: i + 1 }), true); if (my !== run) return; if (!r.skipped) { sum += r.acc * .1; w += .1; combo = Math.max(combo, r.maxCombo); } }
    app.dataset.screen = 'live'; fx.flash('#fff', 600, .8);
    const full = await Live.play({ q: main, mode: 'rhythm', kicker: U('mainSong'), leniency: R.leniency(S.s) }); if (my !== run) return;
    if (!full.skipped) { sum += full.acc * .7; w += .7; combo = Math.max(combo, full.maxCombo); }
    const live = { skipped: !w, acc: w ? sum / w : 0, maxCombo: combo }, q = main;
    const bonus = live.skipped ? 0 : R.liveBonus(live.acc), rank = R.rank(S.s, bonus), secret = R.secret(S.s, bonus);
    app.dataset.screen = 'play'; stage.place(Live.songs[q].bg, 50);
    fx.burst('confetti', 50, 25, 40); sfx.fanfare(); music('heart', .4);
    if (!live.skipped) { ui.toast(U('liveResult', { p: Math.round(live.acc * 100), c: live.maxCombo }), 2600); await sleep(1600); }
    const bust = async (name, _, o) => { if (LLS[q]) await llStage(q, o.ear, o.line); };
    for (const l of G.ENDING[rank]) await line(l, bust);
    if (my !== run) return; await showCG(q, `${PG.lang === 'en' ? T(G.SONGS[q].type) : `「${T(G.SONGS[q].type)}」`}\n${T(G.RANKS[rank].title)}`);
    if (secret) { stage.place(Live.songs[q].bg, 50); for (const l of G.ENDING.secret) await line(l, bust); if (my !== run) return; await showCG('secret', T(G.SECRET.title)); }
    if (my !== run) return;
    R.add(S.s, { fans: Math.round((R.score(S.s) + bonus) * 40 * G.RANKS[rank].fans) }); store.set('save', null);
    store.set('best', { ...store.get('best', {}), [q + (secret ? '*' : '')]: rank });
    await result(q, rank, secret, live);
  }

  // the ending's own picture (art/cg/<name>.webp), the whole frame, until a tap. Missing file = nothing happens.
  // ending pictures: the portrait one on a phone held upright, the wide one (drawn for 16:9, ENDING.wideDir) in landscape / on desktop (engine/rules.js ending)
  const END = Object.assign({ wideDir: 'wide', card: { portrait: [1080, 1440], wide: [1920, 1080] }, panel: .58 }, RULES.ending || {});
  async function cgImage(name) {
    if (SET.cg === false) return null;
    if (PG.wide) { const w = await PG.load(`${DIR.cg}/${END.wideDir}/${name}.webp`); if (w.naturalWidth) return w; }
    const p = await PG.load(`${DIR.cg}/${name}.webp`); return p.naturalWidth ? p : null;
  }
  async function showCG(name, caption) {
    const im = await cgImage(name); if (!im) return;   // setup cg: false / no file = this game has no ending picture here
    ui.sheet(null); stage.hide(); fx.flash('#fff', 800, .95); sfx.fanfare(); fx.rays(false); const el = $('cg'); el.firstElementChild.src = im.src; el.style.setProperty('--cg', `url("${im.src}")`);
    el.classList.toggle('wideArt', im.naturalWidth > im.naturalHeight); $('cgCap').textContent = caption; el.hidden = false;
    setTimeout(() => fx.burst('confetti', 50, 18, 40), 500);
    await sleep(900); await new Promise((r) => { ui.onTap = () => { ui.onTap = null; sfx.next(); r(); }; if (AUTO) setTimeout(() => ui.onTap && ui.onTap(), 30); });
    el.hidden = true;
  }

  // ---------------------------------------------------------------- result card: portrait 3:4 (1080 × 1440) on a phone held upright, 16:9 (1920 × 1080)
  // in landscape / on desktop (picture left, numbers in a panel on the right, the buttons under the panel). "Save" saves the card as shown.
  let lastCard = null;
  async function result(q, rank, secret, live) {
    app.dataset.screen = 'result'; ui.sheet(null); stage.hide(); $('result').hidden = false; Therm.ambient({}); Therm.quiet();
    lastCard = [q, rank, secret, live]; await drawCard(q, rank, secret, live);
    sfx.fanfare(); fx.rays(false); fx.ambient('sparkle'); fx.burst('confetti', 50, 20, 50);
  }
  addEventListener('pg:wide', () => { if (lastCard && !$('result').hidden) drawCard(...lastCard); });
  async function drawCard(q, rank, secret, live) {
    const wide = PG.wide, [W, H] = wide ? END.card.wide : END.card.portrait, cv = $('card'); cv.width = W; cv.height = H; $('result').classList.toggle('wide', wide);
    const c = cv.getContext('2d'), info = (q && G.SONGS && G.SONGS[q]) || null, font = getComputedStyle(app).fontFamily, accent = (CP && CP.colours && CP.colours.accent) || '#d6457d';
    const cg = await cgImage(secret ? 'secret' : q || rank), hasCG = !!cg;
    const st = Live && q && LLS[q] && still(SST, LLS[q].model, 'x_sing', []), [bg, ch] = hasCG ? [cg, { naturalWidth: 0 }] : st ? await Promise.all([PG.load(Live.songs[q].bg), PG.load(st.src)]) : [{ naturalWidth: 0 }, { naturalWidth: 0 }];
    const text = (s, x, y, size, weight = 700, align = 'center', color = '#fff') => { c.font = `${weight} ${size}px ${font}`; c.textAlign = align; c.fillStyle = color; c.shadowColor = 'rgba(20,0,30,.85)'; c.shadowBlur = color === '#fff' ? 14 : 0; c.fillText(s, x, y); c.shadowBlur = 0; };
    const fit = (s, max, size, weight = 700) => { c.font = `${weight} ${size}px ${font}`; const m = c.measureText(s).width; return m > max ? Math.floor(size * max / m) : size; };   // a long stat name shrinks to its column
    const cover = (im, x, y, w, h, top) => { const s = Math.max(w / im.naturalWidth, h / im.naturalHeight), sw = w / s, sh = h / s; c.drawImage(im, (im.naturalWidth - sw) / 2, top ? 0 : (im.naturalHeight - sh) / 2, sw, sh, x, y, w, h); };
    const stats = G.CARD_STATS || BARS.filter((k) => !['stamina', 'mood'].includes(k)).slice(0, 4);
    const typeLine = info ? (PG.lang === 'en' ? T(info.type) : `「${T(info.type)}」`) : T(G.RANKS[rank].title), titleLine = secret ? T(G.SECRET.title) : info ? T(G.RANKS[rank].title) : '';   // no song: the rank title is the big line, said once
    c.fillStyle = '#1b1420'; c.fillRect(0, 0, W, H);
    if (!wide) {
      if (bg.naturalWidth) cover(bg, 0, 0, W, H, hasCG);
      let g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(30,10,40,.72)'); g.addColorStop(.26, 'rgba(30,10,40,0)'); g.addColorStop(.6, 'rgba(30,10,40,0)'); g.addColorStop(.8, 'rgba(30,10,40,.86)'); g.addColorStop(1, 'rgba(30,10,40,.96)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
      if (ch.naturalWidth) { const h = 800, w = h * ch.naturalWidth / ch.naturalHeight; c.save(); c.shadowColor = 'rgba(20,0,30,.5)'; c.shadowBlur = 40; c.drawImage(ch, (W - w) / 2, 1096 - h, w, h); c.restore(); }
      g = c.createLinearGradient(0, 960, 0, 1110); g.addColorStop(0, 'rgba(30,10,40,0)'); g.addColorStop(1, 'rgba(30,10,40,.92)'); c.fillStyle = g; c.fillRect(0, 960, W, 150); c.fillStyle = 'rgba(30,10,40,.92)'; c.fillRect(0, 1110, W, H - 1110);
      text(U('cardLine'), W / 2, 96, 40, 600); text(typeLine, W / 2, 186, 84, 900); text(titleLine, W / 2, 252, 44, 700);
      c.beginPath(); c.arc(940, 1010, 80, 0, Math.PI * 2); c.fillStyle = 'rgba(255,255,255,.94)'; c.fill(); text(rank, 940, 1048, 108, 900, 'center', accent);   // low on the right: not over the face
      stats.forEach((k, i) => { const y = 1128 + i * 48; text(T(G.STATS[k]), 90, y + 13, fit(T(G.STATS[k]), 168, 36), 700, 'left'); c.fillStyle = 'rgba(255,255,255,.28)'; c.beginPath(); c.roundRect(270, y - 10, 300, 22, 11); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.roundRect(270, y - 10, Math.max(22, 300 * S.s[k] / 100), 22, 11); c.fill(); text(String(Math.round(S.s[k])), 590, y + 13, 36, 700, 'left'); });
      text(`♥ ${S.s.fans.toLocaleString()}`, 990, 1176, 56, 900, 'right'); text(T(G.STATS.fans), 990, 1226, 32, 500, 'right');
      if (info) text(`${U('cardSong')}  ♪ ${T(info.song)}`, 90, 1336, 36, 700, 'left'); if (live && !live.skipped) text(U('cardLive', { p: Math.round(live.acc * 100) }), 990, 1336, 32, 700, 'right');
      c.fillStyle = 'rgba(255,255,255,.3)'; c.fillRect(90, 1362, 900, 2); text(`${U('title')} · ${U('sub')}`, 90, 1410, 32, 800, 'left'); text('MoHeat Evo', 990, 1410, 30, 600, 'right');
      return;
    }
    // ---- wide: the picture fills the card (a wide CG as drawn; a portrait one fills the left part), the panel on the right
    const px = Math.round(W * END.panel), pw = W - px;
    // the picture's middle part in the left area (the character is there in every ending picture, wide or portrait); a blurred copy behind the panel
    if (bg.naturalWidth) { c.save(); c.filter = 'blur(28px) brightness(.55)'; cover(bg, 0, 0, W, H); c.restore(); cover(bg, 0, 0, px + 160, H, bg.naturalWidth < bg.naturalHeight); }
    if (ch.naturalWidth) { const h = 900, w = h * ch.naturalWidth / ch.naturalHeight; c.save(); c.shadowColor = 'rgba(20,0,30,.5)'; c.shadowBlur = 40; c.drawImage(ch, px / 2 - w / 2, H - h - 20, w, h); c.restore(); }
    let g = c.createLinearGradient(px - 260, 0, px + 40, 0); g.addColorStop(0, 'rgba(30,10,40,0)'); g.addColorStop(1, 'rgba(30,10,40,.9)'); c.fillStyle = g; c.fillRect(px - 260, 0, 300, H);
    c.fillStyle = 'rgba(30,10,40,.9)'; c.fillRect(px + 40, 0, pw - 40, H);
    const cx = px + pw / 2 + 20, L = px + 90, R = W - 70;
    text(U('cardLine'), cx, 92, 36, 600); text(typeLine, cx, 172, 70, 900); text(titleLine, cx, 226, 38, 700);   // the lower part of the panel is left for the buttons (raise.css)
    c.beginPath(); c.arc(cx, 330, 70, 0, Math.PI * 2); c.fillStyle = 'rgba(255,255,255,.94)'; c.fill(); text(rank, cx, 364, 94, 900, 'center', accent);
    stats.forEach((k, i) => { const y = 462 + i * 52, bx = L + 170, bw = R - bx - 90; text(T(G.STATS[k]), L, y + 13, fit(T(G.STATS[k]), 158, 33), 700, 'left'); c.fillStyle = 'rgba(255,255,255,.28)'; c.beginPath(); c.roundRect(bx, y - 10, bw, 22, 11); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.roundRect(bx, y - 10, Math.max(22, bw * S.s[k] / 100), 22, 11); c.fill(); text(String(Math.round(S.s[k])), R, y + 13, 33, 700, 'right'); });
    text(`♥ ${S.s.fans.toLocaleString()}`, L, 712, 50, 900, 'left'); text(T(G.STATS.fans), L + 6, 750, 26, 500, 'left');
    if (live && !live.skipped) text(U('cardLive', { p: Math.round(live.acc * 100) }), R, 712, 30, 700, 'right');
    if (info) text(`${U('cardSong')}  ♪ ${T(info.song)}`, L, 796, 28, 700, 'left');
    c.fillStyle = 'rgba(255,255,255,.3)'; c.fillRect(L, 826, R - L, 2); text(`${U('title')} · ${U('sub')}`, L, 864, 26, 800, 'left'); text('MoHeat Evo', R, 864, 24, 600, 'right');
  }
  function saveCard() {
    $('card').toBlob(async (blob) => {
      const fn = `${SET.id || 'raise'}-${PG.wide ? 'wide' : 'card'}.png`, file = new File([blob], fn, { type: 'image/png' });
      try { if (navigator.canShare && navigator.canShare({ files: [file] }) && matchMedia('(pointer: coarse)').matches) { await navigator.share({ files: [file] }); return; } } catch (e) { if (e.name === 'AbortError') return; }
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = fn; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }, 'image/png');
  }

  // ---------------------------------------------------------------- flow
  async function game(saved) {
    const my = ++run; S = saved || { week: 0, s: { ...G.START } }; $('title').hidden = true; app.dataset.screen = 'play'; hud();
    if (S.week === 0) { await event(0); S.week = 1; }
    while (S.week <= G.WEEKS) {
      if (my !== run) return; store.set('save', S); hud();
      if (hasSongs() && S.week % 2 && S.card !== S.week) { await chapterCard(S.week); if (my !== run) return; S.card = S.week; store.set('save', S); }
      const picks = await plan(); for (let i = 0; i < picks.length; i++) { if (my !== run) return; await runAct(picks[i], i); }
      if (my !== run) return; await event(S.week); S.week++;
    }
    if (my === run) await finale(my);
  }
  function paintTitle() {
    for (const [id, k] of [['tKicker', 'kicker'], ['tName', 'title'], ['tSub', 'sub'], ['btnStart', 'start'], ['tFine', 'fine'], ['btnSave', 'save'], ['btnAgain', 'again'], ['planGo', 'go']]) $(id).textContent = U(k);
    const sv = store.get('save', null); $('btnContinue').hidden = !sv; if (sv) $('btnContinue').textContent = U('cont', { w: sv.week });
    document.title = `${U('title')} · ${U('sub')}`; PG.fit($('tName')); PG.fit($('tSub')); hud();
  }
  function toTitle() {
    run++; ui.onTap = null; S = null; app.dataset.screen = 'title'; ui.sheet(null); for (const id of ['result', 'tapGame', 'cg']) $(id).hidden = true; $('title').hidden = false; if (Live) Live.stop(); Therm.direct(null); Therm.quiet();
    here = null; fx.rays(false); fx.ambient(TITLE.fx); music(TITLE.bgm, .42);
    stage.place(`${DIR.scenes}/${TITLE.scene}.webp`, TITLE.x); Therm.ambient(TITLE.amb); day(TITLE.pose, PG.wide ? LAY.titleWide : LAY.title, { cam: 'title' }); paintTitle();
  }

  PG.mount({ id: SET.id || 'raise', langs: SET.langs || ['zh', 'ja', 'en'], onReset: () => { store.set('save', null); toTitle(); } });
  app = PG.app; ui.addSheets('plan'); ui.speaker = () => (G.UI.speaker ? U('speaker') : CP ? T(CP.name) : ''); addEventListener('pg:lang', paintTitle);
  $('btnStart').onclick = () => { PG.audioOn(); sfx.confirm(); fx.flash('#fff', 400, .6); store.set('save', null); game(null); };
  $('btnContinue').onclick = () => { PG.audioOn(); sfx.confirm(); fx.flash('#fff', 400, .6); game(store.get('save', null)); };
  $('btnGear').onclick = PG.openSettings; $('btnSave').onclick = saveCard; $('btnAgain').onclick = toTitle;
  if (PG.ll && CP) Object.values(CP.models).forEach((m) => PG.ll.preload(packUrl(m)));
  toTitle();
  if (Live && Live.songs[Q.get('live')]) { S = { week: G.WEEKS, s: { ...G.START } }; $('title').hidden = true; run++; app.dataset.screen = 'live'; Live.play({ q: Q.get('live'), mode: Q.get('mode') || 'rhythm', kicker: U('mainSong') }).then(toTitle); }
  else if (Q.has('week')) { const w = clamp(+Q.get('week') || 1, 1, G.WEEKS), k = (w - 1) * 9, st = { ...G.START, vocal: 12 + k, dance: 12 + k, charm: 12 + k, bond: 10 + (w - 1) * 8 }; (G.CHAPTERS || []).forEach((c, i) => { st['m_' + c.song] = i < R.chapterOf(w) ? 55 : 0; }); if (Q.get('main')) st['m_' + Q.get('main')] = 90; game({ week: w, card: Q.has('card') ? 0 : w, s: st }); }
  else if (Q.has('ending')) {   // test: ?ending=q2&rank=A[&secret] → the ending picture, then the result card (tap to go on)
    run++; $('title').hidden = true; S = { week: G.WEEKS + 1, s: { ...G.START, vocal: 80, dance: 78, charm: 82, bond: 66, fans: 52000 } };
    const q = Q.get('ending'), rank = Q.get('rank') || 'A', sec = Q.has('secret');
    showCG(sec ? 'secret' : q, `${G.SONGS[q] ? T(G.SONGS[q].type) : ''}\n${T(G.RANKS[rank].title)}`).then(() => result(q, rank, sec, { skipped: false, acc: .91, maxCombo: 88 }));
  }
  else if (Q.has('night') && window.PG_STORIES) {   // test: ?night=H1[&inv=scarf,porridge] → that night episode alone, then the title
    run++; $('title').hidden = true; S = { week: 1, s: { ...G.START }, inv: (Q.get('inv') || '').split(',').filter(Boolean) }; app.dataset.screen = 'play'; hud();
    night({ night: Q.get('night') }).then(toTitle);
  }
  else if (AUTO || Q.has('start')) game(null);
  window.DP = { get S() { return S; }, toTitle, get here() { return here; } };   // (tests)
});
