// 『ふたりの、こもりうた』 — Web Audio. Two voices (小雪 / 焔), each with its own level meter (they can speak at the same time, at
// different ears), placed with HRTF; the snowy-night room around you: the irori hearth crackling in front of you, the night wind
// and falling snow through the open garden doors behind it, footsteps on tatami, Homura's little bells, the sliding doors.
// Structure adapted from Demo25's audio.js. az: rad, 0 = front, + = right. dist: metres.
window.LBAudio = (() => {
  let ac = null, master = null, dry = null, verb = null, noise = null, muted = false;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const voices = {}, meter = {}, level = { K: 0, H: 0 };

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return ac; }
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain(); master.gain.value = muted ? 0 : .95;
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3;
    master.connect(comp).connect(ac.destination);
    dry = ac.createGain(); dry.connect(master);
    verb = ac.createConvolver(); const vg = ac.createGain(); vg.gain.value = .12; verb.connect(vg).connect(master);
    const n = Math.round(ac.sampleRate * .9), b = ac.createBuffer(2, n, ac.sampleRate);   // a small wooden tatami room
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 5); }
    verb.buffer = b;
    noise = ac.createBuffer(1, ac.sampleRate * 3, ac.sampleRate);
    const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    for (const w of ['K', 'H']) { const an = ac.createAnalyser(); an.fftSize = 512; meter[w] = { an, buf: new Float32Array(512) }; }
    return ac;
  }
  function panner(az, dist) { const p = new PannerNode(ac, { panningModel: 'HRTF', distanceModel: 'inverse', refDistance: .5, rolloffFactor: .7 }); place(p, az, dist, 0); return p; }
  function place(p, az, dist, tc = .08) {
    const x = Math.sin(az) * dist, z = -Math.cos(az) * dist, t = ac.currentTime;
    if (p.positionX) { p.positionX.setTargetAtTime(x, t, tc || .001); p.positionY.setTargetAtTime(0, t, .001); p.positionZ.setTargetAtTime(z, t, tc || .001); } else p.setPosition(x, 0, z);
  }
  function chain(az, dist, send = .3) { const g = ac.createGain(), p = panner(az, dist), s = ac.createGain(); s.gain.value = send; g.connect(p); p.connect(dry); p.connect(s); s.connect(verb); return { g, p }; }
  function noiseSrc() { const s = ac.createBufferSource(); s.buffer = noise; s.loop = true; s.start(0, rnd(0, 2.5)); return s; }
  function shot(az, dist, send, build, len) { if (!ac) return; const { g, p } = chain(az, dist, send); build(g, ac.currentTime); setTimeout(() => { g.disconnect(); p.disconnect(); }, (len + 1.5) * 1000); }
  function burst(out, dur, amp, f, type = 'bandpass', q = .8, at = 0) {
    const s = ac.createBufferSource(); s.buffer = noise; const fl = new BiquadFilterNode(ac, { type, frequency: f, Q: q }), g = ac.createGain(), t = ac.currentTime + at;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + Math.min(.008, dur / 3)); g.gain.exponentialRampToValueAtTime(.001, t + dur + .01);
    s.connect(fl).connect(g).connect(out); s.start(t, rnd(0, 2.5), dur + .03);
  }
  function tone(out, f, dur, amp, at = 0, type = 'sine', attack = .006) {
    const o = new OscillatorNode(ac, { frequency: f, type }), g = ac.createGain(), t = ac.currentTime + at;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + attack); g.gain.exponentialRampToValueAtTime(.0005, t + dur);
    o.connect(g).connect(out); o.start(t); o.stop(t + dur + .02);
  }

  // ---------------------------------------------------------------- voices (file id: "k01", or "kh1_k" / "kh1_h" for lines said together)
  function loadVoices(ids) {
    if (!ac) return;
    for (const id of ids) if (!voices[id]) voices[id] = fetch(`media/voice/${id}.m4a?v=1`).then((r) => { if (!r.ok) throw 0; return r.arrayBuffer(); }).then((b) => ac.decodeAudioData(b)).then((buf) => (voices[id] = buf)).catch(() => (voices[id] = null));
  }
  function say(id, who, where = { az: 0, dist: .8 }, gain = 1.4) {   // → Promise, resolves when the line ends (no file yet: a pause)
    return new Promise(async (res) => {
      if (voices[id] instanceof Promise) await voices[id];
      const buf = voices[id]; if (!ac || !buf) return setTimeout(res, 2200);
      const s = ac.createBufferSource(); s.buffer = buf; const g = ac.createGain(); g.gain.value = gain;
      const c = chain(where.az, where.dist, where.dist < .3 ? .03 : .15);
      s.connect(g); g.connect(c.g); g.connect(meter[who].an);
      setTimeout(() => { c.g.disconnect(); c.p.disconnect(); }, (buf.duration + 2) * 1000);
      s.onended = () => res(); s.start();
    });
  }
  function voiceLevel(who) {
    const m = meter[who]; if (!m) return 0;
    m.an.getFloatTimeDomainData(m.buf); let s = 0; for (let i = 0; i < m.buf.length; i++) s += m.buf[i] * m.buf[i];
    const v = Math.sqrt(s / m.buf.length); level[who] += (v - level[who]) * .35; return level[who];
  }

  // ---------------------------------------------------------------- loops
  const loops = {};
  function loop(kind) {
    if (!ac) return null; if (loops[kind]) return loops[kind];
    const nodes = []; let g, p, lp = null;
    if (kind === 'fire') {         // the irori hearth in front of you, low: soft roar + crackles and the odd pop
      ({ g, p } = chain(0, 1.3, .15)); g.gain.value = 0;
      const s = noiseSrc(); lp = new BiquadFilterNode(ac, { type: 'lowpass', frequency: 320 }); s.connect(lp).connect(g); nodes.push(s);
      const iv = setInterval(() => { if (!ac || g.gain.value < .01) return; const n = Math.random() < .25 ? 3 : 1; for (let i = 0; i < n; i++) burst(g, rnd(.004, .018), rnd(.25, .7), rnd(1500, 4500), 'bandpass', 2, rnd(0, .12)); }, 190);
      nodes.push({ stop: () => clearInterval(iv), disconnect() {} });
    }
    if (kind === 'wind') {         // night wind through the open garden doors (behind the hearth): a low hush with a slow swell
      ({ g, p } = chain(.15, 4, .3)); g.gain.value = 0;
      lp = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 420, Q: .45 });
      const s = noiseSrc(), am = ac.createGain(); am.gain.value = .7; const lfo = new OscillatorNode(ac, { frequency: .09 }), lg = ac.createGain(); lg.gain.value = .3;
      lfo.connect(lg).connect(am.gain); lfo.start(); s.connect(lp).connect(am).connect(g); nodes.push(s, lfo);
    }
    if (kind === 'snow') {         // "the sound of falling snow": a very soft, airy high hiss all across the garden
      ({ g, p } = chain(0, 3, .5)); g.gain.value = 0;
      for (const az of [-.6, .6]) { const s = noiseSrc(), hp = new BiquadFilterNode(ac, { type: 'highpass', frequency: 5200 }), pg = panner(az, 3), a = ac.createGain(); a.gain.value = .35; s.connect(hp).connect(a).connect(pg).connect(g); nodes.push(s); }
      const iv = setInterval(() => { if (!ac || g.gain.value < .01) return; if (Math.random() < .4) burst(g, rnd(.02, .05), rnd(.05, .12), rnd(6000, 9000), 'bandpass', 4); }, 260);   // flakes ticking on the veranda
      nodes.push({ stop: () => clearInterval(iv), disconnect() {} });
    }
    const L = { g, p, lp,
      set: (v, tc = .2) => g.gain.setTargetAtTime(v, ac.currentTime, tc),
      at: (az, dist, tc) => place(p, az, dist, tc ?? .05),
      tone: (f) => lp?.frequency.setTargetAtTime(f, ac.currentTime, .3),
      stop: () => { g.gain.setTargetAtTime(0, ac.currentTime, .15); setTimeout(() => { for (const n of nodes) try { n.stop(); n.disconnect(); } catch {} g.disconnect(); }, 1200); delete loops[kind]; } };
    loops[kind] = L; return L;
  }

  const fx = {
    // soft steps on tatami (snow spirit, socks): az0 → az1
    steps: (az0 = .3, az1 = .1, n = 6, gap = .42, d0 = 3, d1 = 1.2) => { if (!ac) return; for (let i = 0; i < n; i++) setTimeout(() => shot(az0 + (az1 - az0) * i / (n - 1), d0 + (d1 - d0) * i / (n - 1), .25, (o) => { burst(o, .07, .35, 380, 'lowpass', .7); burst(o, .05, .12, 1800, 'bandpass', 1.5, .02); }, .4), i * gap * 1000); },
    // Homura's little bells (the two on her hair ribbons)
    bells: (az = -.4, dist = 1) => shot(az, dist, .3, (o) => { for (let i = 0; i < 6; i++) { const at = i * .09 + rnd(0, .03); for (const f of [2650, 3510]) tone(o, f * rnd(.98, 1.02), .4, .045, at, 'sine', .002); } }, 1.5),
    // foxfire "poof" out of the hearth: a rising airy whoosh + sparkle + her bells
    poof: (az = -.3, dist = 1.2) => shot(az, dist, .35, (o, t) => {
      const s = noiseSrc(), f = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 500, Q: .9 }), g = ac.createGain();
      f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(3200, t + .45); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.5, t + .12); g.gain.exponentialRampToValueAtTime(.001, t + .7);
      s.connect(f).connect(g).connect(o); s.stop(t + .8);
      [1568, 2093, 2637, 3136].forEach((fr, i) => tone(o, fr, .5, .05, .2 + i * .06));
      for (let i = 0; i < 5; i++) for (const fr of [2650, 3510]) tone(o, fr * rnd(.98, 1.02), .35, .04, .35 + i * .08, 'sine', .002);
    }, 1.5),
    rustle: (az = 0, dist = .3) => shot(az, dist, .05, (o, t) => { const s = noiseSrc(), f = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 1800, Q: .6 }), g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.4, t + .12); g.gain.linearRampToValueAtTime(0, t + .7); s.connect(f).connect(g).connect(o); s.stop(t + .8); }, .9),
    // the sliding garden doors (fusuma/glass doors on wooden rails) closing far in front of you
    door: (az = .1, dist = 3.5) => shot(az, dist, .35, (o, t) => { const s = noiseSrc(), f = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 260, Q: 1.2 }), g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.55, t + .2); g.gain.linearRampToValueAtTime(.4, t + 1); g.gain.linearRampToValueAtTime(0, t + 1.2); s.connect(f).connect(g).connect(o); s.stop(t + 1.3); burst(o, .06, .7, 900, 'bandpass', 2, 1.2); }, 2),
    // the embers settling (a log shifting)
    settle: () => shot(0, 1.3, .15, (o) => { burst(o, .25, .35, 300, 'lowpass', .7); for (let i = 0; i < 6; i++) burst(o, .01, .4, rnd(2000, 4500), 'bandpass', 2, .1 + i * .07); }, 1),
    chime: () => shot(0, 1.5, .6, (o) => [659.3, 784, 987.8, 1318.5].forEach((f, i) => tone(o, f, 1.2, .07, i * .14)), 2),
  };
  function setMuted(v) { muted = v; if (master) master.gain.setTargetAtTime(v ? 0 : .95, ac.currentTime, .05); }
  function lrCheck() { init(); shot(-Math.PI / 2, 1, .1, (o) => tone(o, 880, .4, .2), .5); setTimeout(() => shot(Math.PI / 2, 1, .1, (o) => tone(o, 1175, .4, .2), .5), 900); }
  return { init, loadVoices, say, voiceLevel, loop, fx, setMuted, isMuted: () => muted, lrCheck, ctx: () => ac };
})();
