// PG audio — everything the player hears besides a game's own song files:
//   PG.sfx.<name>()          small synthesized sounds (no files): tap · next · pick · confirm · up · heart · perfect · good · miss · whoosh · fanfare
//   PG.bgm.play(url, vol, [a, b])  background music: gapless loop (between a and b s of the file), cross-fades when the track changes, same url = keeps playing · PG.bgm.stop()
//   PG.voice.play(url[, { ear, dist }])  one voice line at a time (placed at an ear / in front when given) (stops the one before), lowers the music while it speaks → Promise (ended / stopped)
//   PG.voice.stop() · PG.voice.playing · PG.voice.level (0..1, how loud she is right now)
// Volumes (0..1, saved, sliders in ⚙): PG.vol.bgm / PG.vol.voice / PG.vol.sfx — set with PG.setVol(kind, v).
// Phones: sound starts only after the first touch (PG.audioOn, called by the engine on every touch); on iPhones the audio session is
// set to "playback" so the ring / silent switch does not mute the game's effects.
(() => {
  const PG = window.PG; let ac = null, bus = null, wet = null, noiseBuf = null;
  PG.vol = { bgm: .5, voice: 1, sfx: .8 };
  PG.setVol = (k, v) => { PG.vol[k] = PG.clamp(v, 0, 1); PG.store.set('vol', PG.vol); if (bus) bus.gain.value = PG.vol.sfx; bgm.level(); if (vo) vo.volume = PG.vol.voice; };

  // one short silent sound played inside the first touch: afterwards iPhones let the voice element play lines that start later, outside a touch
  const SILENT = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=';
  PG.audioOn = () => {
    if (!vo) { vo = new Audio(SILENT); vo.play().catch(() => {}); }
    try {
      if (!ac) {
        try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch {}
        ac = new (window.AudioContext || window.webkitAudioContext)();
        bus = ac.createGain(); bus.gain.value = PG.vol.sfx; bus.connect(ac.destination);
        const delay = ac.createDelay(.5), fb = ac.createGain(); wet = ac.createGain(); delay.delayTime.value = .17; fb.gain.value = .28; wet.gain.value = .22;   // a little tail on the bright sounds
        wet.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(bus);
        noiseBuf = ac.createBuffer(1, ac.sampleRate * .6, ac.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        bgm.resume();
      }
      if (ac.state === 'suspended') ac.resume();
    } catch {}
  };
  PG.audioCtx = () => ac;

  /** One note. o: { type, when (s from now), to (glide to this frequency), tail (send to the echo) } */
  function blip(freq = 880, dur = .08, vol = .08, type = 'sine', when = 0, o = {}) {
    if (!ac || PG.AUTO) return; const t = ac.currentTime + when, osc = ac.createOscillator(), g = ac.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, t); if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .008); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    osc.connect(g); g.connect(bus); if (o.tail) g.connect(wet); osc.start(t); osc.stop(t + dur + .03);
  }
  const bell = (f, when = 0, vol = .07, dur = .32) => { blip(f, dur, vol, 'sine', when, { tail: true }); blip(f * 2, dur * .6, vol * .35, 'sine', when, { tail: true }); blip(f * 3.01, dur * .3, vol * .15, 'sine', when); };
  function noise(dur = .3, vol = .06, f0 = 600, f1 = 4000, when = 0) {
    if (!ac || PG.AUTO) return; const t = ac.currentTime + when, src = ac.createBufferSource(), flt = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = noiseBuf; flt.type = 'bandpass'; flt.Q.value = 1.2; flt.frequency.setValueAtTime(f0, t); flt.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + dur * .35); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    src.connect(flt); flt.connect(g); g.connect(bus); src.start(t); src.stop(t + dur + .02);
  }
  const C = 523.25, N = (semi) => C * 2 ** (semi / 12);   // notes above C5
  PG.sfx = {
    blip,
    tap: () => blip(540, .07, .07, 'sine', 0, { to: 380 }),                                        // a soft pop
    next: () => { blip(N(12), .05, .035, 'triangle'); },                                           // dialogue goes on
    pick: () => { bell(N(7), 0, .06, .22); bell(N(12), .06, .05, .26); },                          // choose something
    confirm: () => { bell(N(0), 0, .06); bell(N(4), .07, .06); bell(N(7), .14, .06); bell(N(12), .21, .07, .5); },
    up: () => { bell(N(4), 0, .05, .2); bell(N(7), .06, .05, .2); bell(N(11), .12, .06, .34); },   // a number went up
    heart: () => { bell(N(9), 0, .055, .3); bell(N(16), .11, .06, .5); },
    perfect: () => { [12, 16, 19, 24].forEach((s, i) => bell(N(s), i * .045, .05, .28)); },
    good: () => bell(N(7), 0, .06, .2),
    miss: () => { blip(220, .16, .06, 'triangle', 0, { to: 150 }); },
    whoosh: () => noise(.34, .05, 500, 5000),                                                      // scene change
    fanfare: () => { [0, 4, 7, 12, 7, 12, 16].forEach((s, i) => bell(N(s), i * .11, .065, i === 6 ? .9 : .3)); noise(.5, .03, 3000, 9000, .66); },
  };

  // ---------------------------------------------------------------- music: decoded once, looped without a gap, cross-faded
  const bgm = (() => {
    const bufs = new Map(); let cur = null, want = null, duck = 1;
    const load = (url) => { if (!bufs.has(url)) bufs.set(url, fetch(url).then((r) => r.arrayBuffer()).then((b) => new Promise((ok, no) => ac.decodeAudioData(b, ok, no))).catch(() => null)); return bufs.get(url); };
    const fade = (node, to, s) => { const t = ac.currentTime; node.gain.cancelScheduledValues(t); node.gain.setValueAtTime(Math.max(.0001, node.gain.value), t); node.gain.linearRampToValueAtTime(to, t + s); };
    async function start() {
      if (!ac || !want || (cur && cur.url === want.url)) { if (cur && want) { cur.vol = want.vol; fade(cur.g, cur.vol * PG.vol.bgm * duck, .5); } return; }
      const w = want, buf = await load(w.url); if (!buf || want !== w) return;
      if (cur) { const old = cur; fade(old.g, 0, 1.2); setTimeout(() => { try { old.src.stop(); } catch {} }, 1400); }
      const src = ac.createBufferSource(), g = ac.createGain(); src.buffer = buf; src.loop = true; g.gain.value = .0001; src.connect(g); g.connect(ac.destination);
      if (w.loop) { src.loopStart = w.loop[0]; src.loopEnd = w.loop[1]; src.start(0, w.loop[0]); } else src.start();
      cur = { url: w.url, vol: w.vol, src, g }; fade(g, w.vol * PG.vol.bgm * duck, 1.4);
    }
    return {
      /** loop = [a, b] seconds inside the file to repeat (a file with spare audio around the loop never gaps); none = the whole file */
      play(url, vol = .5, loop = null) { want = { url, vol, loop }; if (PG.AUTO) return; start(); },
      stop(s = .8) { want = null; if (cur && ac) { const old = cur; cur = null; fade(old.g, 0, s); setTimeout(() => { try { old.src.stop(); } catch {} }, s * 1000 + 200); } },
      resume() { start(); },   // the first touch arrived after play() was asked for
      duck(on) { duck = on ? .4 : 1; if (cur && ac) fade(cur.g, cur.vol * PG.vol.bgm * duck, on ? .25 : .7); },
      level() { if (cur && ac) fade(cur.g, cur.vol * PG.vol.bgm * duck, .2); },
    };
  })();
  PG.bgm = bgm;

  // ---------------------------------------------------------------- voice lines
  let vo = null, voDone = null, an = null, anBuf = null, env = 0, envAt = 0;
  // the voice goes through an analyser, so the game knows how loud she is right now (her warmth on the ears follows it), then either
  // straight out (default, as before) or through a placer: PG.voice.play(url, { ear, dist }) = an ASMR line at your left / right ear or in
  // front, near or far (HRTF). ear 'L' | 'R' | 'C' | 'L>R' (moves over the line); dist 'close' | 'mid' | 'far'. Numbers: PG_RULES.voice.
  let dryG = null, panG = null, pan = null;
  const VP = () => Object.assign({ at: { close: .25, mid: 1, far: 2.5 }, gain: { close: 1.6, mid: 1.25, far: 1 }, ref: 1, rolloff: .6 }, (window.PG_RULES || {}).voice || {});
  const wire = () => { if (an || !ac || !vo) return; try { const src = ac.createMediaElementSource(vo); an = ac.createAnalyser(); an.fftSize = 1024; anBuf = new Float32Array(an.fftSize); src.connect(an);
      dryG = ac.createGain(); an.connect(dryG); dryG.connect(ac.destination); } catch { an = null; return; }
    try {   // the placer on its own: a browser without it keeps the dry path (the voice must never go silent)
      const v = VP(); pan = ac.createPanner(); Object.assign(pan, { panningModel: 'HRTF', distanceModel: 'inverse', refDistance: v.ref, rolloffFactor: v.rolloff });
      panG = ac.createGain(); panG.gain.value = 0; an.connect(panG); panG.connect(pan); pan.connect(ac.destination); } catch { pan = null; } };
  const spot = (e, r) => (e === 'L' ? [-r, 0, 0] : e === 'R' ? [r, 0, 0] : [0, 0, -r]);   // listener at 0, facing -z
  function placeVoice(o, a) {
    if (!pan || !dryG) return;
    const placed = !!(o && (o.ear || o.dist)), v = VP(), now = ac.currentTime;
    dryG.gain.setValueAtTime(placed ? 0 : 1, now); panG.gain.setValueAtTime(placed ? (v.gain[o.dist || 'mid'] ?? 1) : 0, now);
    if (!placed) return;
    const r = v.at[o.dist || 'mid'] ?? 1, [e0, e1] = String(o.ear || 'C').split('>'), p0 = spot(e0, r), p1 = spot(e1 || e0, r);
    const setP = (p, t, ramp) => ['positionX', 'positionY', 'positionZ'].forEach((k, i) => { const ap = pan[k]; if (!ap) return; if (ramp) ap.linearRampToValueAtTime(p[i], t); else { ap.cancelScheduledValues(t); ap.setValueAtTime(p[i], t); } });
    if (!pan.positionX) { pan.setPosition(...p0); return; }   // old Safari: no ramp
    setP(p0, now, false);
    if (e1 && e1 !== e0) { const go = () => { const d = isFinite(a.duration) ? a.duration : 2; setP(p0, ac.currentTime, false); setP(p1, ac.currentTime + d, true); }; if (a.readyState >= 1) go(); else a.addEventListener('loadedmetadata', go, { once: true }); }
  }
  PG.voice = {
    get playing() { return !!vo && !vo.paused && !vo.ended; },
    /** 0..1: how loud the voice is now (fast up, slow down over about half a second, so the pauses between syllables do not flicker). */
    get level() {
      if (!PG.voice.playing) { env = 0; return 0; } if (!an) return .7;
      an.getFloatTimeDomainData(anBuf); let q = 0; for (let i = 0; i < anBuf.length; i++) q += anBuf[i] * anBuf[i];
      const now = performance.now(), v = PG.clamp(Math.sqrt(q / anBuf.length) / .1, 0, 1); env = Math.max(v, env * Math.pow(.25, (now - envAt) / 500)); envAt = now; return env;
    },
    /** o (optional): { ear: 'L' | 'R' | 'C' | 'L>R' …, dist: 'close' | 'mid' | 'far' } places the line around you; no o = as before (straight out). */
    play(url, o) {
      PG.voice.stop(); if (PG.AUTO || !url) return Promise.resolve();
      return new Promise((done) => {
        const a = vo = vo || new Audio(); let over = false; const end = () => { if (over) return; over = true; bgm.duck(false); if (voDone === end) voDone = null; done(); };
        wire(); voDone = end; a.onended = end; a.onerror = end; a.src = url; a.volume = PG.vol.voice; placeVoice(o, a); bgm.duck(true); a.play().catch(end);
      });
    },
    stop() { if (vo) { try { vo.pause(); } catch {} } if (voDone) voDone(); },
  };

  PG.audioInit = () => {
    Object.assign(PG.vol, PG.store.get('vol', {}));
    for (const k of ['bgm', 'voice', 'sfx']) { const el = PG.$('vol_' + k); if (!el) continue; el.value = Math.round(PG.vol[k] * 100); el.addEventListener('input', () => { PG.setVol(k, +el.value / 100); if (k === 'sfx') PG.sfx.pick(); }); }
    document.addEventListener('visibilitychange', () => { if (!ac) return; if (document.hidden) { ac.suspend(); PG.voice.stop(); } else ac.resume(); });
  };
})();
