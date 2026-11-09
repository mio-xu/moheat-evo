// Shion's rainy night — Web Audio. His voice (in front, beside you, or right at your ear), the rain (outside the open door, then on
// the window), the hair dryer (a moving HRTF source that circles your head, hot or cool), towel rubbing, door, glasses. Adapted from
// Demo21's audio.js. az: rad, 0 = front, + = right. dist: metres.
window.SRAudio = (() => {
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
    verb = ac.createConvolver(); const vg = ac.createGain(); vg.gain.value = .12; verb.connect(vg).connect(master);
    const n = Math.round(ac.sampleRate * .6), b = ac.createBuffer(2, n, ac.sampleRate);   // a quiet living room
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
  function tone(out, f, dur, amp, at = 0, type = 'sine') {
    const o = new OscillatorNode(ac, { frequency: f, type }), g = ac.createGain(), t = ac.currentTime + at;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + .006); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    o.connect(g).connect(out); o.start(t); o.stop(t + dur + .02);
  }

  // ---------------------------------------------------------------- voices
  function loadVoices(ids) {
    if (!ac) return;
    for (const id of ids) for (const k of [VK(id)]) if (!voices[k]) voices[k] = VF(id, 'media/voice/', '').then((r) => { if (!r.ok) throw 0; return r.arrayBuffer(); }).then((b) => ac.decodeAudioData(b)).then((buf) => (voices[k] = buf)).catch(() => (voices[k] = null));
  }
  function say(id, where = { az: 0, dist: .8 }, gain = 1.4) {   // → Promise, resolves when the line ends (no file yet: a pause of its length)
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
    const nodes = []; let g, p, lp;
    if (kind === 'rain') {         // rain: open (outside the door behind you) → muffled on the window (front right)
      ({ g, p } = chain(Math.PI, 2.5, .25)); g.gain.value = 0;
      lp = new BiquadFilterNode(ac, { type: 'lowpass', frequency: 6000 });
      const hp = new BiquadFilterNode(ac, { type: 'highpass', frequency: 400 });
      const s = noiseSrc(); s.connect(hp).connect(lp).connect(g); nodes.push(s);
      const iv = setInterval(() => { if (!ac || g.gain.value < .01) return; for (let i = 0; i < 3; i++) burst(g, .02, rnd(.15, .4), rnd(2500, 6000), 'bandpass', 2, rnd(0, .3)); }, 300); nodes.push({ stop: () => clearInterval(iv), disconnect() {} });
    }
    if (kind === 'dryer') {        // hair dryer: motor whine + broadband air; position follows the nozzle around your head
      ({ g, p } = chain(-1.3, .3, .05)); g.gain.value = 0;
      const air = noiseSrc(), bp = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 1400, Q: .35 }), ag = ac.createGain(); ag.gain.value = .9;
      air.connect(bp).connect(ag).connect(g); nodes.push(air);
      const motor = new OscillatorNode(ac, { type: 'sawtooth', frequency: 230 }), mf = new BiquadFilterNode(ac, { type: 'lowpass', frequency: 900 }), mg = ac.createGain(); mg.gain.value = .05;
      motor.connect(mf).connect(mg).connect(g); motor.start(); nodes.push(motor);
      lp = bp;
    }
    if (kind === 'rub') {          // towel rubbing your hair, both sides of your head
      ({ g, p } = chain(0, .15, .02)); g.gain.value = 0;
      const s = noiseSrc(), f = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 2200, Q: .5 }), am = ac.createGain(); am.gain.value = .3;
      const lfo = new OscillatorNode(ac, { frequency: 2.6 }), lg = ac.createGain(); lg.gain.value = .28; lfo.connect(lg).connect(am.gain); lfo.start();
      s.connect(f).connect(am).connect(g); nodes.push(s, lfo);
    }
    const L = { g, p, lp,
      set: (v, tc = .2) => g.gain.setTargetAtTime(v, ac.currentTime, tc),
      at: (az, dist) => place(p, az, dist, .05),
      tone: (f) => lp?.frequency.setTargetAtTime(f, ac.currentTime, .3),
      stop: () => { g.gain.setTargetAtTime(0, ac.currentTime, .15); setTimeout(() => { for (const n of nodes) try { n.stop(); n.disconnect(); } catch {} g.disconnect(); }, 1200); delete loops[kind]; } };
    loops[kind] = L; return L;
  }

  const fx = {
    door: (az = Math.PI) => shot(az, 1.5, .3, (o) => { burst(o, .05, .6, 1200, 'bandpass', 3); burst(o, .25, .5, 140, 'lowpass', .7, .05); tone(o, 1800, .08, .05, .1, 'triangle'); }, .8),
    steps: (az = 0) => shot(az, 1.2, .3, (o) => { for (let i = 0; i < 4; i++) burst(o, .06, .25, 500, 'lowpass', .7, i * .42); }, 2),
    click: (az = 0, dist = .5) => shot(az, dist, .05, (o) => { burst(o, .015, .5, 4200, 'bandpass', 4); burst(o, .012, .3, 3000, 'bandpass', 4, .08); }, .3),
    switchOn: (az, dist) => shot(az, dist, .02, (o) => burst(o, .02, .6, 2800, 'bandpass', 5), .2),
    rustle: (az = 0, dist = .3) => shot(az, dist, .05, (o, t) => { const s = noiseSrc(), f = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 2600, Q: .6 }), g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.4, t + .12); g.gain.linearRampToValueAtTime(0, t + .6); s.connect(f).connect(g).connect(o); s.stop(t + .7); }, .8),
    chime: () => shot(0, 1.5, .6, (o) => [659.3, 784, 987.8, 1318.5].forEach((f, i) => tone(o, f, 1.2, .08, i * .14)), 2),
  };
  function setMuted(v) { muted = v; if (master) master.gain.setTargetAtTime(v ? 0 : .95, ac.currentTime, .05); }
  function lrCheck() { init(); shot(-Math.PI / 2, 1, .1, (o) => tone(o, 880, .4, .2), .5); setTimeout(() => shot(Math.PI / 2, 1, .1, (o) => tone(o, 1175, .4, .2), .5), 900); }
  return { init, loadVoices, say, voiceLevel, loop, fx, setMuted, isMuted: () => muted, lrCheck, ctx: () => ac };
})();
