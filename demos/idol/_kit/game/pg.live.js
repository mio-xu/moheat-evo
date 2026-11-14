// PG.live — the generic concert module (2026-11-14; was shared/ayane-live/live.js): songs with stage, costume poses, subtitles, per-ear thermal
// track and (mode 'rhythm') the two-lane rhythm chart. A SONG PACK (e.g. shared/ayane-live/pack.js) hands its data to PG.live.create(...) and
// gets the object games use (window.AyaneLive): play / parts / stop / grade / songs / charts / stageLL. Stage behaviour numbers: engine/rules.js (stage).
//   const r = await Live.play({ q: 'q4', mode: 'rhythm' | 'watch', kicker: 'text above the title', leniency: 1 });
//   a part only (lesson, mini show): + { from, to } from Live.parts(q, seconds) · stage: false = keep the game's own place and pose (ll: { seq, cam })
//   bonus time (notes hit themselves after a long combo) is only for a whole song; a part has none (user 2026-11-13) — bonus: true / false overrides
//   r = { perfect, good, miss, maxCombo, acc, total, skipped, cheers }
// Thermal in rhythm mode — the strong stimulus comes only from the notes (user 2026-11-13):
//   background  the song's own per-ear track (its energy) × 50 %: weak, the same whatever the combo
//   a hit       that ear at 100 % in the note's colour at once, 0.6 s, then 0.4 s back down to the background (+ phone vibration)
//   a hold      75 % on that ear while the finger stays down (after the hit pulse of its head); a slide moves it to the other ear
//   bonus time  only in a whole song: after a 24 combo every note is hit by itself for 7 s
//   her spoken lines before and after the song (no notes): the track at full strength (her voice at your ear)
// Debug: ?auto ends after 1.5 s (&hold=live keeps playing by itself) · &t=50 starts at that second.
//        &fake = no sound, a stopwatch instead of the audio clock (headless screenshots: audio does not advance there).
(() => {
  const PG = window.PG, ENGINE = new URL('.', document.currentScript.src).href, ENGINE_VER = new URL(document.currentScript.src).search;
  const audio = new Audio(); audio.preload = 'auto'; let el = null;
  function mount() {
    if (el) return; const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = ENGINE + 'pg.live.css' + ENGINE_VER; document.head.append(link);
    PG.app.insertAdjacentHTML('beforeend', '<section id="live" hidden><div id="liveTitle"><small id="liveKicker"></small><span id="liveSong"></span></div><p id="liveSub"></p><p id="liveHow"></p><div id="liveBar"><i></i></div><button type="button" id="liveSkip"></button><div id="liveCheer"></div></section>');
    el = PG.$('live');
  }
  /** P = { base (pack folder URL), ver, songs, chars (old stills, optional), charts, stage (LivLiv per song), mouth (singing mouth + sections) } */
  function create(P) {
  const base = P.base, ver = P.ver || '', RS = (window.PG_RULES || {}).stage || {};   // ver: the page's ?v= of this file, passed on to live.css (a stylesheet without it is served from the browser cache after a change)
  const SONGS = P.songs, CHARTS = P.charts || {};
  // make every path of the kit absolute once, so a game can use the entries directly (PG.stage.pose, canvas, …)
  for (const s of Object.values(SONGS)) for (const k of ['bg', 'audio']) if (s[k]) s[k] = base + s[k];
  const TEXT = {
    howKeys: { zh: '{L} 键 = 左耳 · {R} 键 = 右耳　长条和斜条：按住不放就行', ja: '{L} キー = 左耳 · {R} キー = 右耳　長いノーツ・ななめは押したままで OK', en: '{L} = left ear · {R} = right ear   long and slanted notes: just keep holding' },
    howWide: { zh: '左边 = 左耳 · 右边 = 右耳　长条和斜条：按住不放就行', ja: '左 = 左耳 · 右 = 右耳　長いノーツ・ななめは押したままで OK', en: 'Left = left ear · right = right ear   long and slanted notes: just keep holding' }, skip: { zh: '跳过 ▶', ja: 'スキップ ▶', en: 'Skip ▶' }, cheer: { zh: '点屏幕应援！ {n}', ja: '画面をタップで応援！ {n}', en: 'Tap to cheer! {n}' },
    how: { zh: '左半屏 = 左耳 · 右半屏 = 右耳　长条按住 · 斜条滑过去', ja: '左 = 左耳 · 右 = 右耳　長いノーツは押したまま · ななめはスライド', en: 'Left = left ear · right = right ear   hold the long notes · slide along the slanted ones' } };
  const LAY = { stand: { h: 60, b: 18 }, standRhythm: { h: 44, b: 34 }, bust: { h: 50, b: 22 }, bustRhythm: { h: 44, b: 36 }, standWide: { h: 62, b: 24 } };   // wide screen: there is room, she stands taller between the lanes
  const BASE = .5, HOLD = .75;   // strengths while the song plays: background = the song's own track × 50 % (measured: the tracks sit at 0.67–0.94 most of the time, so about 35–47 % on the ear), a hold being held = 75 %, a hit = 100 %
  const PAN_RANGE = 30;   // landscape: how far from the middle she goes (% of the frame) when her voice is fully on one side
  const LEAD = 2.4, PULSE_HOLD = 600, PULSE_FADE = 400;   // a hit pulse on the ear: full strength for 0.6 s, then fades over 0.4 s (user 2026-11-13: at least 0.6 s, up to 1 s; shorter cannot be felt)   // s of music before the first note of a part


  // ---- LivLiv Ayane on stage (2026-11-14): one model per outfit (ll_stage.js), hop on each beat, a pose every 2 bars with a bounce, small
  // nods, mouth from the vocal (ll_songs.js), LivLiv actions on the song clock, ear-whisper lines = camera push-in toward that ear.
  // Without WebGL2 (PG.ll.ok false) the old stills are used.
  const LLS = P.stage || {}, LLM = P.mouth || {};
  const llOn = () => !!PG.ll && PG.ll.ok !== false;
  // where she stands (fractions of the frame): portrait between the lanes / over the words; wide: big in the middle between the side lanes
  const ST = RS.stand || { rhythm: [.21, .72], watch: [.17, .8], wide: [.24, .97] }, CL = RS.close || { p: { dx: .1, y: .4, fh: .2 }, w: { dx: .1, y: .45, fh: .3 } };
  const standCam = (rhythm, x = .5) => (PG.wide ? PG.ll.fig(ST.wide[0], ST.wide[1], x) : rhythm ? PG.ll.fig(...ST.rhythm) : PG.ll.fig(...ST.watch));
  const closeCam = (side) => { const c = PG.wide ? CL.w : CL.p; return { x: .5 + side * c.dx, y: c.y, fh: c.fh }; };
  const sample = (arr, rate, t) => { const f = Math.max(0, Math.min(arr.length - 1.001, t * rate)), i = Math.floor(f); return arr[i] + (arr[i + 1] - arr[i]) * (f - i); };
  /** The stage driver for PG.ll (one song). ll = the game's own settings when it keeps its place (lessons): { seq: [x_<pose>…], cam }. */
  function llDriver(q, song, rhythm, onStage, ll, clock) {
    const cfg = LLS[q] || {}, ch = CHARTS[q] || { bpm: 120, beat0: song.song[0] }, B = 60 / ch.bpm, mo = LLM[q], acts = cfg.acts || [];
    const closes = song.close.map(([c, side]) => [c, song.lines.find((l) => Math.abs(l.t0 - c) < .5)?.t1 ?? c + 4, side === 'R' ? 1 : -1]);
    let actI = -1, lastB = null, xS = .5, panX = .5, closeAt = 0, closeI = -1;
    const segAt = (t) => (mo?.segments.find(([, a, b]) => t >= a && t < b) || [''])[0];
    return (now, dt) => {
      const t = clock(), out = {}, inSong = t >= song.song[0] - .05 && t <= song.song[1], seg = segAt(t);
      if (actI < 0) { actI = acts.findIndex((a) => a[0] >= t - .05); if (actI < 0) actI = acts.length; }
      const x = (t - ch.beat0) / B, b = Math.floor(x), ph = x - b, pair = Math.floor(b / (4 * (RS.poseBars || 2)));
      const cw = closes.findIndex(([a, e]) => t >= a - (RS.closeLead ?? .6) && t < e), cl = cw >= 0;
      // pose
      if (onStage) {
        let mk = song.poses[0]; for (const e of song.poses) if (e[0] <= t) mk = e;
        let pose = (cfg.marks || {})[mk[1]] || 'x_idle';
        if (inSong && mk[1] !== 'jump' && t - mk[0] > 2 * B && pair % 2) { const list = cfg.varySeg?.[seg] || cfg.vary || []; if (list.length) pose = list[(pair >> 1) % list.length]; }
        out.pose = cl ? 'x_clasp' : pose;
      } else if (ll?.seq?.length) out.pose = inSong ? ll.seq[((pair % ll.seq.length) + ll.seq.length) % ll.seq.length] : ll.seq[0];
      // face: the section's, a wink as she arrives at your ear, then shy while she whispers
      if (cl && closeI !== cw) { closeI = cw; closeAt = now; }
      if (onStage || cl) out.face = cl ? (now - closeAt < (RS.winkSec ?? 1.1) * 1000 ? 'wink' : 'shy') : cfg.faces?.[seg] || null;   // a lesson keeps the game's face
      // camera (PG.ll eases toward it): her place on a wide stage follows her voice in the mix, like the song pages
      if (PG.wide && song.pan && song.pan.length) { const v = song.pan[Math.min(song.pan.length - 1, Math.max(0, Math.floor(t * 10)))]; if (v > .02) panX = v; xS += (.5 + (panX - .5) * (RS.panRange ?? .3) - xS) * Math.min(1, dt * 2.5); } else xS = .5;
      if (onStage) out.cam = cl ? closeCam(closes[cw][2]) : standCam(rhythm, xS);
      else if (ll?.cam) out.cam = ll.cam;
      // hop on each beat (a bar start higher), much less at your ear; a small nod with it
      if (inSong) {
        const th = song.th[Math.min(song.th.length - 1, Math.max(0, Math.floor(t * 10)))] || [0, 0, 0, 0], E = Math.min(1, Math.max(...th)), bar = ((b % 4) + 4) % 4 === 0, k = (ph * B) / (RS.hopSec ?? .15), HP = RS.hopPx || [4, 5], ND = RS.nodDeg || [18, 12];
        const scale = (cfg.hop ?? 1) * (PG.app.clientHeight / 800);
        if (k < 1) { const qq = bar ? 1.5 : 1; out.hopPx = (HP[0] + HP[1] * E) * (bar ? RS.barHop ?? 1.8 : 1) * (cl ? .25 : 1) * scale * Math.sin(Math.PI * k); out.sq = k < .25 ? 1 - .010 * qq * Math.sin(Math.PI * k / .25) : 1 + .007 * qq * Math.sin(Math.PI * (k - .25) / .75); }
        const kn = (ph * B) / .24; if (kn < 1) out.nod = -(bar ? ND[0] : ND[1]) * (cl ? .5 : 1) * Math.sin(Math.PI * kn);
      }
      lastB = b;
      if (mo) out.mouth = Math.min(1, sample(mo.mouth, mo.fps, t + .03) * .95);
      while (actI < acts.length && acts[actI][0] <= t) { if (t - acts[actI][0] < .6 && !cl) PG.ll.act(acts[actI][1], acts[actI][2]); actI++; }
      return out;
    };
  }

  function play(o) {
    return new Promise(async (done) => {
      mount(); const { $, T, stage, ui, Therm } = PG, q = o.q, song = SONGS[q], lang = PG.lang, rhythm = o.mode === 'rhythm' && CHARTS[q];
      // a part of the song (lesson, mini show): [from, to]; the music starts a little earlier so the first notes can be seen coming
      const part = o.from != null, t0 = part ? Math.max(0, o.from - LEAD) : +PG.Q.get('t') || 0, tEnd = part ? Math.min(song.dur - .05, o.to + .6) : song.dur - .05, onStage = o.stage !== false;
      const notes = !rhythm ? [] : !part ? CHARTS[q].notes : CHARTS[q].notes.filter((n) => n[0] >= o.from - .01 && n[0] + (n[3] || 0) <= o.to + .01);
      ui.sheet(null); el.hidden = false; el.classList.toggle('rhythm', !!rhythm); Therm.ambient({}); PG.bgm.stop(.5); PG.fx.rays(true); $('place').classList.remove('on');   // the place caption would sit under the song title
      $('liveKicker').textContent = o.kicker || ''; $('liveSong').textContent = `♪ ${T(song.name)}`; $('liveSkip').textContent = T(TEXT.skip);
      const keys = PG.rhythm && PG.rhythm.keyNames ? PG.rhythm.keyNames() : ['F', 'J'];
      $('liveHow').textContent = rhythm ? (PG.touch ? T(PG.wide ? TEXT.howWide : TEXT.how) : T(TEXT.howKeys, { L: keys[0], R: keys[1] })) : '';
      // her on the stage: the LivLiv model of this song's outfit (falls back to the stills)
      let LL = false, sT = t0, sAt = performance.now(), running = false; const clock = () => sT + (running ? (performance.now() - sAt) / 1000 : 0);
      if (onStage) { stage.place(song.bg, 50); PG.fx.ambient('sparkle'); }
      if (llOn() && (onStage ? LLS[q] : o.ll)) {
        if (onStage) { let mk = song.poses[0]; for (const e of song.poses) if (e[0] <= t0) mk = e; LL = await PG.ll.show(base + LLS[q].model + ver, { pose: LLS[q].marks[mk[1]] || 'x_idle', face: null, extra: [], prop: null, offsets: LLS[q].poseOffset || {}, cam: standCam(!!rhythm), cut: true }); }
        else LL = PG.ll.shown;
        if (LL) PG.ll.drive(llDriver(q, song, !!rhythm, onStage, o.ll, clock));
      }
      const STILLS = P.stills, stillDrv = onStage && !LL && STILLS && LLS[q] ? llDriver(q, song, !!rhythm, true, null, clock) : null; let stillAt = performance.now();
      if (stillDrv) Object.values(STILLS.outfits[LLS[q].model] || {}).forEach((e) => PG.load(e.src));
      const pulses = [null, null], onHit = (lane, kind, grade, inHold) => { pulses[lane] = { kind, at: performance.now() }; if (!inHold) { try { navigator.vibrate && navigator.vibrate(grade === 'perfect' ? 18 : 10); } catch {} } };
      let panX = .5, xS = 50, panAt = performance.now();   // her place on a wide stage (0 … 1 = left … right of the mix)
      let cheers = 0, raf = 0, over = false; const paintCheer = () => { $('liveCheer').textContent = rhythm ? '' : T(TEXT.cheer, { n: cheers || '' }); }; paintCheer();
      const end = (r) => { if (over) return; over = true; running = false; cancelAnimationFrame(raf); audio.pause(); ui.onTap = null; Therm.direct(null); stage.talking = false; el.hidden = true; PG.fx.rays(false); if (LL) PG.ll.drive(null); done({ perfect: 0, good: 0, miss: 0, maxCombo: 0, acc: 0, total: 0, skipped: false, ...r, cheers }); };
      const frame = (t, S) => {
        sT = t; sAt = performance.now(); running = true;
        const th = song.th[Math.min(song.th.length - 1, Math.floor(t * 10))] || [0, 0, 0, 0], inSong = t >= song.song[0] && t <= song.song[1];
        const k = rhythm && inSong ? BASE : 1, out = { Lc: th[0] * k, Lh: th[1] * k, Rc: th[2] * k, Rh: th[3] * k };
        if (S.hold) ['L', 'R'].forEach((e, i) => { const h = S.hold[i]; if (h) { out[e + (h === 'c' ? 'c' : 'h')] = Math.max(out[e + (h === 'c' ? 'c' : 'h')], HOLD); out[e + (h === 'c' ? 'h' : 'c')] = 0; } });   // a hold being held: that ear clearly warm / cool
        // the moment a note is hit: a pulse on that ear in the note's colour, in sync with the finger (full strength at once for PULSE_HOLD ms, then fading)
        const now = performance.now(); ['L', 'R'].forEach((e, i) => { const p = pulses[i]; if (!p) return; const age = now - p.at, k2 = age <= PULSE_HOLD ? 1 : 1 - (age - PULSE_HOLD) / PULSE_FADE; if (k2 <= 0) { pulses[i] = null; return; }
          const on = e + (p.kind === 'c' ? 'c' : 'h'), off = e + (p.kind === 'c' ? 'h' : 'c'); out[on] = Math.max(out[on], out[on] + (1 - out[on]) * k2); if (k2 > .4) out[off] = 0; });
        Therm.direct(out);
        const ln = song.lines.find((l) => t >= l.t0 && t <= l.t1); $('liveSub').textContent = ln ? ln[lang] || ln.ja : ''; stage.talking = !!ln;
        if (onStage && !LL && stillDrv && STILLS) {   // without WebGL2: the same poses and cameras as stills (tools/still_tool.py)
          const now2 = performance.now(), D2 = stillDrv(now2, Math.min(.1, (now2 - stillAt) / 1000)), set = STILLS.outfits[(LLS[q] || {}).model] || {}; stillAt = now2;
          const e = set[D2.pose] || set.x_idle; if (e) stage.pose(e, PG.ll.stillLay(e, D2.cam, STILLS.fig, (LLS[q].poseOffset || {})[D2.pose] || 0), { cut: true });
        }
        $('liveBar').firstElementChild.style.width = `${PG.clamp((t - t0) / (tEnd - t0), 0, 1) * 100}%`; $('liveHow').hidden = !!ln || (part ? t > o.from - .3 : t >= song.song[0] - 1);   // the how-to line and the words share one place: never both
        if (o.onFrame) o.onFrame(t, S);   // a page that draws her itself (stage: false) follows the song clock here
      };
      $('liveSkip').onclick = () => { if (rhythm) PG.rhythm.stop(); else end({ skipped: true }); };
      audio.onerror = () => setTimeout(() => (rhythm ? PG.rhythm.stop() : end({ skipped: true })), 1500);
      let clk = audio;
      if (PG.Q.has('fake')) { const p0 = performance.now(); clk = { get currentTime() { return t0 + (performance.now() - p0) / 1000; }, paused: false, ended: false }; }
      else { audio.src = song.audio; const go = () => { try { audio.currentTime = t0; } catch {} audio.play().catch(() => {}); }; if (t0 > 0) { audio.addEventListener('loadedmetadata', go, { once: true }); audio.load(); } else go(); }   // her spoken lines in the mix are Japanese in every subtitle language
      if (rhythm) PG.rhythm.play({ audio: clk, notes, end: tEnd, leniency: o.leniency || 1, onFrame: frame, onHit, auto: PG.AUTO, from: t0, bonus: o.bonus ?? !part }).then(end);
      else {
        const loop = () => { if (over) return; const t = clk.currentTime; frame(t, { combo: 0 }); if (clk.ended || t >= tEnd) { end({}); return; } raf = requestAnimationFrame(loop); };
        ui.onTap = (ev) => { cheers++; paintCheer(); PG.sfx.tap(); if (ev.clientX != null) ui.spark(ev); if (cheers % 4 === 0) stage.hop(); }; loop();
      }
      if (PG.AUTO && PG.HOLD !== 'live') setTimeout(() => (rhythm ? PG.rhythm.stop() : end({ skipped: true })), 1500);
    });
  }
  /** The sung part of a song cut into parts of about `sec` seconds on bar lines: [[from, to, beats], …] (only parts with enough notes). For lessons and mini shows. */
  function parts(q, sec = 15) {
    const song = SONGS[q], ch = CHARTS[q]; if (!ch) return []; const bar = 240 / ch.bpm, n = Math.max(2, Math.round(sec / bar)), out = [];
    for (let a = ch.beat0; a + n * bar <= song.song[1] + .5; a += n * bar) { const b = a + n * bar, beats = ch.notes.reduce((k, v) => k + (v[0] >= a - .01 && v[0] + (v[3] || 0) <= b + .01 ? (v[3] ? v[4] || 2 : 1) : 0), 0); if (beats >= Math.max(6, sec * .5)) out.push([+a.toFixed(3), +b.toFixed(3), beats]); }
    return out;
  }
  const stop = () => { audio.pause(); if (PG.rhythm) PG.rhythm.stop(); };
  /** Grade of a rhythm result by accuracy (perfect = 1, good = .6, miss = 0). */
  const grade = (acc) => (acc >= .95 ? 'S' : acc >= .85 ? 'A' : acc >= .7 ? 'B' : 'C');

  return { base, ver, songs: SONGS, stills: P.stills, charts: CHARTS, stageLL: LLS, play, parts, stop, grade, LAY, standCam: (r, x) => standCam(r, x), closeCam };
  }
  PG.live = { create };
})();
