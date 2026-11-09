// Nagisa on the summer rooftop — Web Audio. Her voice (in front, beside you, at your ear) and the summer night around you: crickets
// in the potted plants, the town far below, a wind chime, the sea breeze (moves across your head), the steel roof door, geta on
// concrete, a popsicle snapped in two, the paper fan, a match, two senko-hanabi crackling in front of you, far fireworks over the town.
// Base (voices, HRTF chain, helpers) copied from Demo25's audio.js. az: rad, 0 = front, + = right. dist: metres.
window.HTAudio = (() => {
  let ac = null, master = null, dry = null, verb = null, noise = null, muted = false;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const voices = {};
  // voice language (shared/shell.js MoHeatVoice; tools/web/voice_lang.py): one cache entry per language, ja fallback, a switch preloads the lines used so far
  const VF = (id, base, q = '') => (window.MoHeatVoice ? MoHeatVoice.fetch(id, base, q) : fetch(`${base}${id}.m4a${q}`));
  const VIDS = new Set(), VK = (id) => (VIDS.add(id), window.MoHeatVoice ? MoHeatVoice.key(id) : id);
  addEventListener('moheat:voicelang', () => loadVoices([...VIDS]));
  let level = 0, an = null, abuf = null;

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return ac; }
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain(); master.gain.value = muted ? 0 : .95;
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3;
    master.connect(comp).connect(ac.destination);
    dry = ac.createGain(); dry.connect(master);
    verb = ac.createConvolver(); const vg = ac.createGain(); vg.gain.value = .16; verb.connect(vg).connect(master);
    const n = Math.round(ac.sampleRate * 1.6), b = ac.createBuffer(2, n, ac.sampleRate);   // an open rooftop: a short, thin tail
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 4); }
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
  function tone(out, f, dur, amp, at = 0, type = 'sine', attack = .006) {
    const o = new OscillatorNode(ac, { frequency: f, type }), g = ac.createGain(), t = ac.currentTime + at;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + attack); g.gain.exponentialRampToValueAtTime(.0005, t + dur);
    o.connect(g).connect(out); o.start(t); o.stop(t + dur + .02);
  }

  // ---------------------------------------------------------------- voices
  function loadVoices(ids) {
    if (!ac) return;
    for (const id of ids) for (const k of [VK(id)]) if (!voices[k]) voices[k] = VF(id, 'media/voice/', '').then((r) => { if (!r.ok) throw 0; return r.arrayBuffer(); }).then((b) => ac.decodeAudioData(b)).then((buf) => (voices[k] = buf)).catch(() => (voices[k] = null));
  }
  function say(id, where = { az: 0, dist: .8 }, gain = 1.4) {   // → Promise, resolves when the line ends (no file yet: a pause)
    return new Promise(async (res) => {
      if (voices[VK(id)] === undefined) loadVoices([id]);   // not loaded in this voice language yet
      if (voices[VK(id)] instanceof Promise) await voices[VK(id)];
      const buf = voices[VK(id)]; if (!ac || !buf) return setTimeout(res, 2200);
      const s = ac.createBufferSource(); s.buffer = buf; const g = ac.createGain(); g.gain.value = gain;
      const c = chain(where.az, where.dist, where.dist < .3 ? .03 : .15);
      s.connect(g); g.connect(c.g); g.connect(an);
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
  function loop(kind) {
    if (!ac) return null; if (loops[kind]) return loops[kind];
    const nodes = []; let g, p, lp = null;
    if (kind === 'breeze') {       // a warm sea breeze over the roof: soft band noise; gusts are set from main.js (set + at)
      ({ g, p } = chain(1.2, 1.5, .2)); g.gain.value = 0;
      lp = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 420, Q: .45 });
      const s = noiseSrc(); s.connect(lp).connect(g); nodes.push(s);
    }
    if (kind === 'night') {        // the summer night: crickets (suzumushi) in the planters left and right + the town's low hum far below
      ({ g, p } = chain(0, 4, .3)); g.gain.value = 0;
      const hum = noiseSrc(), hf = new BiquadFilterNode(ac, { type: 'lowpass', frequency: 260 }), hg = ac.createGain(); hg.gain.value = .35; hum.connect(hf).connect(hg).connect(g); nodes.push(hum);
      const bugs = [[-1.3, 1.6, 4300], [1.2, 2.2, 4700], [-.4, 3.5, 3900]].map(([az, d, f]) => { const c = chain(az, d, .25); c.g.gain.value = 0; return { ...c, f }; });
      const iv = setInterval(() => {
        if (!ac || g.gain.value < .01) return;
        for (const b of bugs) if (Math.random() < .55) { b.g.gain.value = g.gain.value * .9; for (let i = 0; i < 3; i++) tone(b.g, b.f * rnd(.99, 1.01), .09, .05, i * .11, 'sine', .01); }
      }, 700);
      nodes.push({ stop: () => { clearInterval(iv); for (const b of bugs) { b.g.disconnect(); b.p.disconnect(); } }, disconnect() {} });
    }
    if (kind === 'sparkler') {     // two senko-hanabi right in front of you: a soft hiss + fine crackles (matsuba sparks)
      ({ g, p } = chain(0, .35, .05)); g.gain.value = 0;
      const s = noiseSrc(); lp = new BiquadFilterNode(ac, { type: 'highpass', frequency: 3500 }); const hg = ac.createGain(); hg.gain.value = .05; s.connect(lp).connect(hg).connect(g); nodes.push(s);
      const iv = setInterval(() => { if (!ac || g.gain.value < .01) return; const n = 1 + (Math.random() * 4 | 0); for (let i = 0; i < n; i++) burst(g, rnd(.002, .008), rnd(.15, .5), rnd(3000, 8000), 'bandpass', 3, rnd(0, .09)); }, 90);
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
    // geta (wooden sandals) on the concrete roof: az0 → az1 over the steps
    geta: (az0 = -2.4, az1 = 0, n = 8, gap = .3) => { if (!ac) return; for (let i = 0; i < n; i++) setTimeout(() => shot(az0 + (az1 - az0) * i / (n - 1), 3 - 2.2 * i / (n - 1), .15, (o) => { burst(o, .03, .5, 1500, 'bandpass', 3); burst(o, .02, .25, 700, 'bandpass', 3, .012); }, .3), i * gap * 1000); },
    // the steel roof door: a creak, then a heavy clunk
    door: (az = -2.4) => shot(az, 3, .25, (o, t) => { const s = new OscillatorNode(ac, { type: 'sawtooth', frequency: 210 }), f = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 900, Q: 6 }), gg = ac.createGain(); s.frequency.setValueAtTime(210, t); s.frequency.linearRampToValueAtTime(330, t + .5); s.frequency.linearRampToValueAtTime(180, t + .9); gg.gain.setValueAtTime(0, t); gg.gain.linearRampToValueAtTime(.06, t + .1); gg.gain.linearRampToValueAtTime(0, t + .95); s.connect(f).connect(gg).connect(o); s.start(t); s.stop(t + 1); tone(o, 70, .5, .35, 1.05); burst(o, .12, .5, 400, 'lowpass', .7, 1.05); }, 2),
    // a glass wind chime (furin) hanging by the door
    furin: (az = -1.9) => shot(az, 2.5, .3, (o) => { const f0 = rnd(2600, 2900); tone(o, f0, 1.6, .05, 0, 'sine', .002); tone(o, f0 * 2.76, .8, .015, 0, 'sine', .002); }, 2),
    // the popsicle snapped in two (paki!)
    snap: (az = .5, dist = .4) => shot(az, dist, .05, (o) => { burst(o, .015, .9, 2400, 'bandpass', 2); burst(o, .03, .4, 1200, 'bandpass', 2, .01); }, .5),
    // one stroke of the paper fan past your ear
    fan: (az = -.9, dist = .3) => shot(az, dist, .03, (o, t) => { const s = noiseSrc(), f = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 700, Q: .6 }), g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.4, t + .12); g.gain.linearRampToValueAtTime(0, t + .4); s.connect(f).connect(g).connect(o); s.stop(t + .45); }, .6),
    // a match struck and catching
    match: (az = .2, dist = .4) => shot(az, dist, .05, (o, t) => { burst(o, .08, .6, 3000, 'bandpass', 1); const s = noiseSrc(), f = new BiquadFilterNode(ac, { type: 'lowpass', frequency: 900 }), g = ac.createGain(); g.gain.setValueAtTime(0, t + .08); g.gain.linearRampToValueAtTime(.35, t + .2); g.gain.linearRampToValueAtTime(0, t + 1.4); s.connect(f).connect(g).connect(o); s.stop(t + 1.5); }, 1.6),
    // a sparkler ball dropping onto the concrete: a tiny tick and a hiss out
    drop: (az = 0, dist = .5) => shot(az, dist, .05, (o) => { burst(o, .01, .3, 2500, 'bandpass', 4, .25); burst(o, .25, .08, 5000, 'highpass', .7, .27); }, .8),
    // a firework over the town (~1.5 km, so the boom is low and late): thump of the launch, a deep boom, a crackling tail
    firework: (az = 1, big = 1) => shot(az, 40, .8, (o) => { burst(o, .5, .55 * big, 120, 'lowpass', .7); tone(o, 48, 1.4, .5 * big, 0, 'sine', .01); for (let i = 0; i < 30; i++) burst(o, .02, rnd(.05, .18) * big, rnd(1500, 4000), 'bandpass', 2, .6 + rnd(0, 1.6)); }, 3),
    rustle: (az = 0, dist = .3) => shot(az, dist, .05, (o, t) => { const s = noiseSrc(), f = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 1800, Q: .6 }), g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.4, t + .12); g.gain.linearRampToValueAtTime(0, t + .7); s.connect(f).connect(g).connect(o); s.stop(t + .8); }, .9),
    train: () => shot(1.9, 60, .6, (o, t) => { const s = noiseSrc(), f = new BiquadFilterNode(ac, { type: 'lowpass', frequency: 500 }), g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.3, t + 3); g.gain.linearRampToValueAtTime(0, t + 8); s.connect(f).connect(g).connect(o); s.stop(t + 8.2); for (let i = 0; i < 8; i++) { burst(o, .05, .12, 300, 'lowpass', 1, 1.5 + i * .75); burst(o, .05, .1, 300, 'lowpass', 1, 1.65 + i * .75); } }, 9),
  };
  function setMuted(v) { muted = v; if (master) master.gain.setTargetAtTime(v ? 0 : .95, ac.currentTime, .05); }
  function lrCheck() { init(); shot(-Math.PI / 2, 1, .1, (o) => tone(o, 880, .4, .2), .5); setTimeout(() => shot(Math.PI / 2, 1, .1, (o) => tone(o, 1175, .4, .2), .5), 900); }
  return { init, loadVoices, say, voiceLevel, loop, fx, setMuted, isMuted: () => muted, lrCheck, ctx: () => ac };
})();
