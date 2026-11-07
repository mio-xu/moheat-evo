// Naomi demo — every sound is synthesized live (Web Audio) and placed with the browser's HRTF panner, so it comes from the same
// direction the thermal engine uses. az: radians, 0 = straight ahead, + = right. dist: metres (0.25 = right at your ear).
window.NaomiAudio = (() => {
  let ac = null, master = null, dry = null, verb = null, verbGain = null, noise = null, purrBuf = null, muted = false;
  const loops = [];
  const rnd = (a, b) => a + Math.random() * (b - a);

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return ac; }
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain(); master.gain.value = muted ? 0 : .9;
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3;
    master.connect(comp).connect(ac.destination);
    dry = ac.createGain(); dry.connect(master);
    verb = ac.createConvolver(); verbGain = ac.createGain(); verbGain.gain.value = .16; verb.connect(verbGain).connect(master);
    const n = Math.round(ac.sampleRate * .6), b = ac.createBuffer(2, n, ac.sampleRate);          // small furnished room
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 4); }
    verb.buffer = b;
    noise = ac.createBuffer(1, ac.sampleRate * 3, ac.sampleRate);
    const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    purrBuf = makePurr();
    return ac;
  }
  // a purr: ~25 Hz trains of soft noise pulses, inhale (quieter, a bit slower) + exhale, 2.6 s per breath, looped
  function makePurr() {
    const sr = ac.sampleRate, len = 2.6, n = Math.round(sr * len), b = ac.createBuffer(1, n, sr), d = b.getChannelData(0);
    const phase = (t0, t1, rate, amp) => {
      for (let t = t0; t < t1; t += 1 / (rate + rnd(-1.2, 1.2))) {
        const env = Math.sin(Math.PI * (t - t0) / (t1 - t0)) ** .6 * amp * rnd(.75, 1), i0 = Math.round(t * sr), tau = sr * .007;
        for (let k = 0; k < sr * .03 && i0 + k < n; k++) d[i0 + k] += (Math.random() * 2 - 1) * env * Math.exp(-k / tau);
      }
    };
    phase(.05, 1.15, 22.5, .65); phase(1.3, 2.5, 26, 1);
    let lp = 0; for (let i = 0; i < n; i++) { lp += (d[i] - lp) * .06; d[i] = lp * 3.2; }   // one-pole low pass → soft rumble
    return b;
  }
  function panner(az = 0, dist = 1.5) {
    const p = new PannerNode(ac, { panningModel: 'HRTF', distanceModel: 'inverse', refDistance: .6, rolloffFactor: .8 });
    place(p, az, dist, 0); return p;
  }
  function place(p, az, dist, tc = .06) {
    const x = Math.sin(az) * dist, z = -Math.cos(az) * dist, t = ac.currentTime;
    if (p.positionX) { p.positionX.setTargetAtTime(x, t, tc || .001); p.positionY.setTargetAtTime(0, t, .001); p.positionZ.setTargetAtTime(z, t, tc || .001); }
    else p.setPosition(x, 0, z);
  }
  function chain(az, dist, send = .4) {
    const g = ac.createGain(), p = panner(az, dist), s = ac.createGain(); s.gain.value = send;
    g.connect(p); p.connect(dry); p.connect(s); s.connect(verb);
    return { g, p };
  }
  function noiseSrc() { const s = ac.createBufferSource(); s.buffer = noise; s.loop = true; s.start(0, rnd(0, 2.5)); return s; }
  function burst(out, dur, amp, f, type = 'highpass', q = .8, at = 0) {
    const s = ac.createBufferSource(); s.buffer = noise; const fl = new BiquadFilterNode(ac, { type, frequency: f, Q: q }), g = ac.createGain(), t = ac.currentTime + at;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + Math.min(.006, dur / 3)); g.gain.exponentialRampToValueAtTime(.001, t + dur + .01);
    s.connect(fl).connect(g).connect(out); s.start(t, rnd(0, 2.5), dur + .03);
  }
  function blip(out, f0, dur, amp, f1 = f0, at = 0, type = 'sine') {
    const o = new OscillatorNode(ac, { frequency: f0, type }), g = ac.createGain(), t = ac.currentTime + at;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + .005); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    o.connect(g).connect(out); o.start(t); o.stop(t + dur + .02);
  }

  // ---------------------------------------------------------------- loops: set(level 0..1, az, dist) every frame
  function loop(kind) {
    if (!ac) return { set() {}, stop() {}, level: 0 };
    const { g, p } = chain(0, 1.5, kind === 'purr' ? .08 : .3);
    g.gain.value = 0;
    const L = { kind, g, p, level: 0, az: 0, dist: 1.5, nodes: [], t: 0 };
    const add = (n) => { L.nodes.push(n); return n; };
    if (kind === 'purr') {
      const s = add(ac.createBufferSource()); s.buffer = purrBuf; s.loop = true; L.rate = s.playbackRate;
      const lp = new BiquadFilterNode(ac, { type: 'lowpass', frequency: 520 }), pk = new BiquadFilterNode(ac, { type: 'peaking', frequency: 140, Q: 1, gain: 6 });
      s.connect(lp).connect(pk).connect(g); s.start();
    } else if (kind === 'fur') {                 // fur brushing under your hand
      const bp = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 3200, Q: .5 }), lp = new BiquadFilterNode(ac, { type: 'lowpass', frequency: 7000 });
      add(noiseSrc()).connect(bp).connect(lp).connect(g); L.bp = bp;
    } else if (kind === 'rain') {               // rain on the window: hiss + droplets (in tick)
      const hp = new BiquadFilterNode(ac, { type: 'highpass', frequency: 900 }), lp = new BiquadFilterNode(ac, { type: 'lowpass', frequency: 5200 }), ng = ac.createGain(); ng.gain.value = .35;
      add(noiseSrc()).connect(hp).connect(lp).connect(ng).connect(g);
      L.crack = ac.createGain(); L.crack.gain.value = .6; L.crack.connect(g);
    } else if (kind === 'birds') {              // morning / afternoon birds outside the window (chirps in tick)
      L.crack = ac.createGain(); L.crack.connect(g);
      const hp = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 500, Q: .4 }), ng = ac.createGain(); ng.gain.value = .05;
      add(noiseSrc()).connect(hp).connect(ng).connect(g);                     // faint outdoor air
    } else if (kind === 'steam') {
      const bp = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 2400, Q: .7 }), ng = ac.createGain(); ng.gain.value = .25;
      add(noiseSrc()).connect(bp).connect(ng).connect(g);
    } else if (kind === 'feather') {            // swish of the teaser wand; level = speed
      const bp = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 1800, Q: .7 });
      add(noiseSrc()).connect(bp).connect(g); L.bp = bp;
    } else if (kind === 'room') {               // quiet room tone: fridge-ish hum + air
      const lp = new BiquadFilterNode(ac, { type: 'lowpass', frequency: 260 }), ng = ac.createGain(); ng.gain.value = .5;
      add(noiseSrc()).connect(lp).connect(ng).connect(g);
    }
    L.set = (level, az = L.az, dist = L.dist) => {
      L.level = level;
      if (Math.abs(az - L.az) > .002 || Math.abs(dist - L.dist) > .01) { L.az = az; L.dist = dist; place(p, az, dist); }
      g.gain.setTargetAtTime(level, ac.currentTime, .08);
    };
    L.stop = () => { g.gain.setTargetAtTime(0, ac.currentTime, .2); setTimeout(() => { for (const n of L.nodes) try { n.stop?.(); n.disconnect(); } catch {} g.disconnect(); }, 1200); const i = loops.indexOf(L); if (i >= 0) loops.splice(i, 1); };
    loops.push(L);
    return L;
  }
  function tick(dt) {
    if (!ac) return;
    for (const L of loops) {
      L.t += dt;
      if (L.kind === 'fur' && L.bp) L.bp.frequency.setTargetAtTime(2600 + 1400 * Math.sin(L.t * 7), ac.currentTime, .05);
      if (!L.crack || L.level < .01) continue;
      if (L.kind === 'rain' && Math.random() < dt * 26) blip(L.crack, rnd(2500, 6000), rnd(.01, .03), rnd(.03, .12), rnd(1500, 3000));
      if (L.kind === 'birds' && Math.random() < dt * .7) {
        const f = rnd(2600, 4200), n = Math.floor(rnd(2, 6)), dur = rnd(.05, .09);
        for (let i = 0; i < n; i++) blip(L.crack, f * rnd(.95, 1.08), dur, .1, f * rnd(1.15, 1.4), i * (dur + rnd(.02, .05)));
      }
    }
  }

  // ---------------------------------------------------------------- Naomi's voice: formant-filtered sawtooth with a pitch contour
  // kind: mew | long | ask (rising "mew?") | tiny (shy squeak) | trill ("mrrp") | yawn
  const MEOW = {
    mew: { dur: .42, f0: [620, 930, 700], F1: [650, 950, 520], F2: [1900, 1500, 1100], amp: .5 },
    long: { dur: .85, f0: [520, 840, 560], F1: [560, 980, 420], F2: [2000, 1450, 950], amp: .55 },
    ask: { dur: .48, f0: [560, 640, 980], F1: [600, 820, 900], F2: [1900, 1600, 1900], amp: .45 },
    tiny: { dur: .24, f0: [880, 1120, 900], F1: [700, 900, 700], F2: [2200, 1900, 1700], amp: .3 },
    trill: { dur: .36, f0: [380, 470, 520], F1: [450, 600, 600], F2: [1500, 1400, 1500], amp: .45, trill: 30 },
    yawn: { dur: 1.1, f0: [420, 700, 380], F1: [500, 1000, 380], F2: [1500, 1200, 800], amp: .35 },
  };
  function meow(kind = 'mew', az = 0, dist = 1) {
    if (!ac) return 0;
    const m = MEOW[kind] || MEOW.mew, dur = m.dur * rnd(.92, 1.1), pitch = rnd(.94, 1.07);
    shot(az, dist, .3, (out, t) => {
      const o = new OscillatorNode(ac, { type: 'sawtooth' }), vib = new OscillatorNode(ac, { frequency: 6.5 }), vg = ac.createGain(); vg.gain.value = 14;
      vib.connect(vg).connect(o.frequency);
      const env = ac.createGain(), mix = ac.createGain(); mix.gain.value = 1;
      o.frequency.setValueAtTime(m.f0[0] * pitch, t); o.frequency.linearRampToValueAtTime(m.f0[1] * pitch, t + dur * .35); o.frequency.linearRampToValueAtTime(m.f0[2] * pitch, t + dur);
      env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(m.amp, t + .04); env.gain.setValueAtTime(m.amp, t + dur * .7); env.gain.linearRampToValueAtTime(0, t + dur);
      const f1 = new BiquadFilterNode(ac, { type: 'bandpass', Q: 5 }), f2 = new BiquadFilterNode(ac, { type: 'bandpass', Q: 7 }), g2 = ac.createGain(); g2.gain.value = .6;
      for (const [f, key] of [[f1, 'F1'], [f2, 'F2']]) { f.frequency.setValueAtTime(m[key][0], t); f.frequency.linearRampToValueAtTime(m[key][1], t + dur * .4); f.frequency.linearRampToValueAtTime(m[key][2], t + dur); }
      o.connect(f1).connect(mix); o.connect(f2).connect(g2).connect(mix);
      if (m.trill) { const tr = new OscillatorNode(ac, { frequency: m.trill }), tg = ac.createGain(); tg.gain.value = .5; const am = ac.createGain(); am.gain.value = .5; tr.connect(tg).connect(am.gain); mix.connect(am).connect(env); tr.start(t); tr.stop(t + dur + .05); }
      else mix.connect(env);
      const hp = new BiquadFilterNode(ac, { type: 'highpass', frequency: 300 }); env.connect(hp).connect(out);
      const br = ac.createBufferSource(); br.buffer = noise; const bf = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 3000, Q: .8 }), bg = ac.createGain();   // breathiness
      bg.gain.setValueAtTime(0, t); bg.gain.linearRampToValueAtTime(m.amp * .12, t + .05); bg.gain.linearRampToValueAtTime(0, t + dur);
      br.connect(bf).connect(bg).connect(out); br.start(t, rnd(0, 2), dur + .05);
      o.start(t); vib.start(t); o.stop(t + dur + .05); vib.stop(t + dur + .05);
    }, dur);
    return dur;
  }
  function shot(az, dist, send, build, len) {
    if (!ac) return;
    const { g, p } = chain(az, dist, send); build(g, ac.currentTime);
    setTimeout(() => { g.disconnect(); p.disconnect(); }, (len + 1.5) * 1000);
  }
  const fx = {
    step: (az, dist = 1.5, amp = .5) => shot(az, dist, .3, (o) => { burst(o, .05, amp, 260, 'lowpass', .7); burst(o, .02, amp * .25, 1800, 'bandpass', 1); }, .2),   // soft paw pad
    sniff: (az, dist = .35) => shot(az, dist, .1, (o) => { for (let i = 0; i < 3; i++) burst(o, .07, .35, 4200, 'bandpass', 1.4, i * .13); }, .5),
    boop: (az, dist = .3) => shot(az, dist, .1, (o) => { blip(o, 900, .07, .35, 1500); burst(o, .02, .2, 2500, 'bandpass', 2, .01); }, .2),
    lick: (az, dist = .3) => shot(az, dist, .1, (o) => { for (let i = 0; i < 2; i++) burst(o, .06, .3, 2600, 'bandpass', 3, i * .16); }, .4),
    rub: (az, dist = .3) => shot(az, dist, .1, (o, t) => {
      const s = noiseSrc(), f = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 2400, Q: .6 }), g = ac.createGain();
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.55, t + .25); g.gain.linearRampToValueAtTime(.4, t + .9); g.gain.linearRampToValueAtTime(0, t + 1.4);
      f.frequency.setValueAtTime(1800, t); f.frequency.linearRampToValueAtTime(3600, t + 1.4);
      s.connect(f).connect(g).connect(o); s.stop(t + 1.5);
    }, 1.5),
    poke: (az, dist = .8) => shot(az, dist, .2, (o) => { burst(o, .05, .4, 700, 'bandpass', 1.2); blip(o, 420, .08, .12, 300); }, .2),
    bell: (az, dist = 1) => shot(az, dist, .4, (o) => { for (let i = 0; i < 3; i++) blip(o, rnd(3800, 4600), .25, .08, rnd(3700, 4500), i * rnd(.04, .08)); }, .5),
    pounce: (az, dist = 1) => shot(az, dist, .3, (o) => { burst(o, .09, .7, 180, 'lowpass', .7); burst(o, .12, .2, 2500, 'bandpass', .7); }, .3),
    crunch: (az, dist = .9) => shot(az, dist, .2, (o) => { const n = Math.floor(rnd(2, 4)); for (let i = 0; i < n; i++) burst(o, rnd(.015, .035), rnd(.25, .45), rnd(1500, 3200), 'bandpass', 1.4, i * rnd(.05, .09)); }, .4),
    bowl: (az = 0) => shot(az, 1, .4, (o) => { blip(o, 1250, .9, .12, 1240); blip(o, 2810, .5, .05, 2800); burst(o, .03, .3, 1200, 'bandpass', 2); }, 1),
    flop: (az, dist = .8) => shot(az, dist, .2, (o) => { burst(o, .14, .5, 220, 'lowpass', .7); burst(o, .25, .15, 2400, 'bandpass', .6, .03); }, .4),
    yay: () => shot(0, 1.5, .5, (o) => [659.3, 784, 1046.5].forEach((f, i) => blip(o, f, .5, .12, f, i * .1)), 1),
    heart: (az = 0) => shot(az, 1.2, .5, (o) => { blip(o, 1568, .25, .08, 1568); blip(o, 2093, .35, .07, 2093, .09); }, .5),
    night: () => shot(0, 2, .7, (o) => [523.3, 392, 329.6, 261.6].forEach((f, i) => blip(o, f, 1.6, .09, f, i * .45)), 3.5),
  };
  function setMuted(v) { muted = v; if (master) master.gain.setTargetAtTime(v ? 0 : .9, ac.currentTime, .05); }
  function lrCheck() {
    const c = init();
    setTimeout(() => meow('mew', -Math.PI / 2, .8), 0); setTimeout(() => meow('mew', Math.PI / 2, .8), 900);
    return c;
  }
  return { init, loop, tick, meow, fx, setMuted, isMuted: () => muted, lrCheck, ctx: () => ac };
})();
