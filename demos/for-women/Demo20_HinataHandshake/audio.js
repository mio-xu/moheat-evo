// Handshake event — Web Audio. Hinata's and the staff's voices are placed binaurally (HRTF) at their positions; the hall
// (crowd murmur, music from the stage speakers, the automatic entrance door on your right) is synthesized live.
// az: rad, 0 = front, + = right. Only Hinata's voice feeds the level meter (lip sync + the voice-driven warmth).
window.HinaAudio = (() => {
  let ac = null, master = null, dry = null, verb = null, noise = null, muted = false, an = null, abuf = null, level = 0;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const voices = {};

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return ac; }
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain(); master.gain.value = muted ? 0 : .95;
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3;
    master.connect(comp).connect(ac.destination);
    dry = ac.createGain(); dry.connect(master);
    verb = ac.createConvolver(); const vg = ac.createGain(); vg.gain.value = .22; verb.connect(vg).connect(master);
    const n = Math.round(ac.sampleRate * 1.4), b = ac.createBuffer(2, n, ac.sampleRate);   // a big hall
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3); }
    verb.buffer = b;
    noise = ac.createBuffer(1, ac.sampleRate * 3, ac.sampleRate);
    const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    an = ac.createAnalyser(); an.fftSize = 512; abuf = new Float32Array(512);
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
  function tone(out, f, dur, amp, at = 0, type = 'sine', f1 = f) {
    const o = new OscillatorNode(ac, { frequency: f, type }), g = ac.createGain(), t = ac.currentTime + at;
    o.frequency.setValueAtTime(f, t); if (f1 !== f) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + .006); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    o.connect(g).connect(out); o.start(t); o.stop(t + dur + .02);
  }

  // ---------------------------------------------------------------- voices
  function loadVoices(ids) {
    if (!ac) return;
    for (const id of ids) if (!voices[id]) voices[id] = fetch(`media/voice/${id}.m4a`).then((r) => r.arrayBuffer()).then((b) => ac.decodeAudioData(b)).then((buf) => (voices[id] = buf)).catch(() => (voices[id] = null));
  }
  // where: { az, dist }; meter: feeds the level analyser (Hinata only) → Promise resolved when the line ends
  function say(id, where, gain = 1.3, meter = true) {
    return new Promise(async (res) => {
      if (voices[id] instanceof Promise) await voices[id];
      const buf = voices[id]; if (!ac || !buf) return res();
      const s = ac.createBufferSource(); s.buffer = buf; const g = ac.createGain(); g.gain.value = gain;
      s.connect(g); if (meter) g.connect(an);
      const c = chain(where.az, where.dist, where.dist < .3 ? .03 : .14); g.connect(c.g);
      setTimeout(() => { c.g.disconnect(); c.p.disconnect(); }, (buf.duration + 2) * 1000);
      s.onended = () => res(); s.start();
    });
  }
  function voiceLevel() {
    if (!an) return 0;
    an.getFloatTimeDomainData(abuf); let s = 0; for (let i = 0; i < abuf.length; i++) s += abuf[i] * abuf[i];
    const v = Math.sqrt(s / abuf.length); level += (v - level) * .35; return level;
  }

  // ---------------------------------------------------------------- loops
  const loops = {};
  function loop(kind, az = 0, dist = 2) {
    if (!ac || loops[kind]) return loops[kind];
    const { g, p } = chain(az, dist, kind === 'music' ? .5 : .25); g.gain.value = 0; const nodes = [];
    const add = (n) => { nodes.push(n); return n; };
    if (kind === 'crowd') {   // murmur of the hall: a few bands of noise with slow, random swells (voices without words)
      for (const [f, q] of [[350, 1.4], [700, 1.6], [1300, 1.8], [2200, 2]]) {
        const bp = new BiquadFilterNode(ac, { type: 'bandpass', frequency: f, Q: q }), am = ac.createGain(); am.gain.value = .5;
        add(noiseSrc()).connect(bp).connect(am).connect(g);
        const lfo = add(new OscillatorNode(ac, { frequency: rnd(1.5, 4) })), lg = ac.createGain(); lg.gain.value = .35; lfo.connect(lg).connect(am.gain); lfo.start();
      }
    }
    if (kind === 'music') {   // soft pop from the stage speakers, far front-left
      const lp = new BiquadFilterNode(ac, { type: 'lowpass', frequency: 1800 }); lp.connect(g);
      const chords = [[523.3, 659.3, 784], [440, 523.3, 659.3], [349.2, 440, 523.3], [392, 493.9, 587.3]]; let k = 0;
      const beat = () => { if (!ac) return; const c = chords[(k >> 2) % 4]; tone(lp, c[k % 3] , .32, .05, 0, 'triangle'); if (k % 2 === 0) tone(lp, c[0] / 2, .5, .05, 0, 'sine'); if (k % 4 === 0) burst(lp, .08, .12, 120, 'lowpass', .7); k++; };
      const iv = setInterval(beat, 250); nodes.push({ stop: () => clearInterval(iv), disconnect() {} });
    }
    if (kind === 'draft') {   // cold air from the entrance doors on the right
      const bp = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 500, Q: .5 }), lp = new BiquadFilterNode(ac, { type: 'lowpass', frequency: 1600 });
      add(noiseSrc()).connect(bp).connect(lp).connect(g);
      const lfo = add(new OscillatorNode(ac, { frequency: .17 })), lg = ac.createGain(); lg.gain.value = 200; lfo.connect(lg).connect(bp.frequency); lfo.start();
    }
    if (kind === 'heart') {
      const iv = setInterval(() => { if (!ac) return; tone(g, 52, .14, .9); tone(g, 48, .16, .6, .26); }, 820); nodes.push({ stop: () => clearInterval(iv), disconnect() {} });
    }
    const L = { g, p, set: (v, a = az, d = dist) => { g.gain.setTargetAtTime(v, ac.currentTime, .3); place(p, a, d, .3); }, stop: () => { g.gain.setTargetAtTime(0, ac.currentTime, .4); setTimeout(() => { for (const n of nodes) try { n.stop(); n.disconnect(); } catch {} g.disconnect(); }, 2000); delete loops[kind]; } };
    loops[kind] = L; return L;
  }
  function tick() {}

  const fx = {
    autodoor: (az = 1.3) => shot(az, 3, .3, (o, t) => {    // the automatic entrance door slides open and closed: motor hum + a gust
      const m = new OscillatorNode(ac, { type: 'sawtooth', frequency: 90 }), mg = ac.createGain(), ml = new BiquadFilterNode(ac, { type: 'lowpass', frequency: 300 });
      mg.gain.setValueAtTime(0, t); mg.gain.linearRampToValueAtTime(.05, t + .2); mg.gain.setValueAtTime(.05, t + 1); mg.gain.linearRampToValueAtTime(0, t + 1.3); m.connect(ml).connect(mg).connect(o); m.start(t); m.stop(t + 1.4);
      const s = noiseSrc(), f = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 600, Q: .5 }), g = ac.createGain();
      g.gain.setValueAtTime(0, t + .3); g.gain.linearRampToValueAtTime(.5, t + .8); g.gain.linearRampToValueAtTime(0, t + 2.6); s.connect(f).connect(g).connect(o); s.stop(t + 2.7);
    }, 2.8),
    steps: (az0, az1, n = 4, dist = 1.2) => { for (let i = 0; i < n; i++) setTimeout(() => shot(az0 + (az1 - az0) * i / Math.max(1, n - 1), dist, .3, (o) => burst(o, .06, .3, 260, 'lowpass', .7), .2), i * 430); },
    rustle: (az, dist = .4) => shot(az, dist, .1, (o, t) => { const s = noiseSrc(), f = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 2600, Q: .6 }), g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.45, t + .15); g.gain.linearRampToValueAtTime(0, t + .7); s.connect(f).connect(g).connect(o); s.stop(t + .8); }, .8),
    clasp: () => shot(0, .4, .05, (o) => { burst(o, .05, .35, 1400, 'bandpass', 1.2); burst(o, .12, .18, 700, 'bandpass', .8, .04); }, .3),
    breath: (az = 0, dist = .3, len = 1.6) => shot(az, dist, .04, (o, t) => {   // a long warm "haaah" on your hands
      const s = noiseSrc(), f = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 1100, Q: .7 }), l = new BiquadFilterNode(ac, { type: 'lowpass', frequency: 2600 }), g = ac.createGain();
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.55, t + .25); g.gain.setValueAtTime(.5, t + len * .6); g.gain.linearRampToValueAtTime(0, t + len); s.connect(f).connect(l).connect(g).connect(o); s.stop(t + len + .1);
    }, 2),
    timer: (az = .8) => shot(az, 1.4, .3, (o) => { tone(o, 2093, .09, .12, 0, 'square'); tone(o, 2093, .09, .12, .16, 'square'); }, .5),
    giggle: (az = -.3) => shot(az, 4, .5, (o) => { for (let i = 0; i < 5; i++) tone(o, rnd(500, 800), .08, .02, i * .11, 'triangle', rnd(400, 900)); }, 1),
    chime: () => shot(0, 1.5, .6, (o) => [659.3, 784, 987.8, 1318.5].forEach((f, i) => tone(o, f, 1.2, .08, i * .14)), 2),
  };
  function setMuted(v) { muted = v; if (master) master.gain.setTargetAtTime(v ? 0 : .95, ac.currentTime, .05); }
  function lrCheck() { init(); shot(-Math.PI / 2, 1, .1, (o) => tone(o, 880, .4, .2), .5); setTimeout(() => shot(Math.PI / 2, 1, .1, (o) => tone(o, 1175, .4, .2), .5), 900); }
  return { init, loadVoices, say, voiceLevel, loop, tick, fx, setMuted, isMuted: () => muted, lrCheck, ctx: () => ac };
})();
