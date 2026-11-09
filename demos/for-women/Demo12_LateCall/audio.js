// Late-night call — Web Audio. Ren's voice either through the PHONE (band-limited, a little line hiss, pressed against one ear)
// or REAL (dry, binaural, at his position). Room sounds are synthesized and placed with HRTF. az: rad, 0 = front, + = right.
window.CallAudio = (() => {
  let ac = null, master = null, dry = null, verb = null, noise = null, muted = false;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const voices = {};
  // voice language (shared/shell.js MoHeatVoice; tools/web/voice_lang.py): one cache entry per language, ja fallback, a switch preloads the lines used so far
  const VF = (id, base, q = '') => (window.MoHeatVoice ? MoHeatVoice.fetch(id, base, q) : fetch(`${base}${id}.m4a${q}`));
  const VIDS = new Set(), VK = (id) => (VIDS.add(id), window.MoHeatVoice ? MoHeatVoice.key(id) : id);
  addEventListener('moheat:voicelang', () => loadVoices([...VIDS]));
  let level = 0, an = null, abuf = null;      // Ren's voice level (for lip sync + thermal)

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return ac; }
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain(); master.gain.value = muted ? 0 : .95;
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3;
    master.connect(comp).connect(ac.destination);
    dry = ac.createGain(); dry.connect(master);
    verb = ac.createConvolver(); const vg = ac.createGain(); vg.gain.value = .14; verb.connect(vg).connect(master);
    const n = Math.round(ac.sampleRate * .5), b = ac.createBuffer(2, n, ac.sampleRate);
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
  function tone(out, f, dur, amp, at = 0, type = 'sine', f1 = f) {
    const o = new OscillatorNode(ac, { frequency: f, type }), g = ac.createGain(), t = ac.currentTime + at;
    o.frequency.setValueAtTime(f, t); if (f1 !== f) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + .006); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    o.connect(g).connect(out); o.start(t); o.stop(t + dur + .02);
  }

  // ---------------------------------------------------------------- the phone path: pressed to one ear
  let phone = null;
  function phoneOn(az) {
    if (!ac || phone) return;
    const { g, p } = chain(az, .1, .02);
    const hp = new BiquadFilterNode(ac, { type: 'highpass', frequency: 320, Q: .7 }), lp = new BiquadFilterNode(ac, { type: 'lowpass', frequency: 3600, Q: .7 }),
      pk = new BiquadFilterNode(ac, { type: 'peaking', frequency: 1800, Q: 1, gain: 4 }), sh = new WaveShaperNode(ac, { curve: soft(), oversample: '2x' });
    const inp = ac.createGain(); inp.connect(hp).connect(lp).connect(pk).connect(sh).connect(g);
    const hiss = noiseSrc(), hf = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 2500, Q: .5 }), hg = ac.createGain(); hg.gain.value = .006;
    hiss.connect(hf).connect(hg).connect(inp);
    g.gain.value = 0; g.gain.setTargetAtTime(1, ac.currentTime, .05);
    phone = { g, p, inp, hiss, az };
  }
  function soft() { const n = 1024, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; c[i] = Math.tanh(x * 1.6) / Math.tanh(1.6); } return c; }
  function phoneEar(az) { if (phone) { phone.az = az; place(phone.p, az, .1, .25); } }
  function phoneOff() { if (!phone) return; const P = phone; phone = null; P.g.gain.setTargetAtTime(0, ac.currentTime, .03); setTimeout(() => { try { P.hiss.stop(); } catch {} P.g.disconnect(); P.p.disconnect(); }, 600); }

  // ---------------------------------------------------------------- Ren's voice
  function loadVoices(ids) {
    if (!ac) return;
    for (const id of ids) for (const k of [VK(id)]) if (!voices[k]) voices[k] = VF(id, 'media/voice/', '').then((r) => r.arrayBuffer()).then((b) => ac.decodeAudioData(b)).then((buf) => (voices[k] = buf)).catch(() => (voices[k] = null));
  }
  const ready = (id) => voices[VK(id)] && !(voices[VK(id)] instanceof Promise);
  // where: 'phone' or { az, dist } for his real voice → Promise that resolves when the line ends
  function say(id, where = 'phone', gain = 1.4) {
    return new Promise(async (res) => {
      if (voices[VK(id)] === undefined) loadVoices([id]);   // not loaded in this voice language yet
      if (voices[VK(id)] instanceof Promise) await voices[VK(id)];
      const buf = voices[VK(id)]; if (!ac || !buf) return res();
      const s = ac.createBufferSource(); s.buffer = buf; const g = ac.createGain(); g.gain.value = gain;
      s.connect(g); g.connect(an);
      if (where === 'phone' && phone) g.connect(phone.inp);
      else { const w = where === 'phone' ? { az: -1.4, dist: .15 } : where; const c = chain(w.az, w.dist, .12); g.connect(c.g); setTimeout(() => { c.g.disconnect(); c.p.disconnect(); }, (buf.duration + 2) * 1000); }
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
    const { g, p } = chain(az, dist, .2); g.gain.value = 0; const nodes = [];
    const add = (n) => { nodes.push(n); return n; };
    if (kind === 'room') { const lp = new BiquadFilterNode(ac, { type: 'lowpass', frequency: 220 }); add(noiseSrc()).connect(lp).connect(g); }
    if (kind === 'snow') {   // outside the open window: soft wind + muffled city
      const bp = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 700, Q: .6 }), lp = new BiquadFilterNode(ac, { type: 'lowpass', frequency: 2400 });
      add(noiseSrc()).connect(bp).connect(lp).connect(g);
      const lfo = add(new OscillatorNode(ac, { frequency: .23 })), lg = ac.createGain(); lg.gain.value = 300; lfo.connect(lg).connect(bp.frequency); lfo.start();
    }
    if (kind === 'street') {   // his side of the line: wind through the phone
      const bp = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 900, Q: .5 }); add(noiseSrc()).connect(bp).connect(g);
      if (phone) { g.disconnect(); g.connect(phone.inp); }
    }
    if (kind === 'heart') {    // heartbeat while he holds you
      const iv = setInterval(() => { if (!ac) return; tone(g, 52, .14, .9); tone(g, 48, .16, .6, .26); }, 900); nodes.push({ stop: () => clearInterval(iv), disconnect() {} });
    }
    const L = { g, p, set: (v, a = az, d = dist) => { g.gain.setTargetAtTime(v, ac.currentTime, .15); place(p, a, d); }, stop: () => { g.gain.setTargetAtTime(0, ac.currentTime, .3); setTimeout(() => { for (const n of nodes) try { n.stop(); n.disconnect(); } catch {} g.disconnect(); }, 1500); delete loops[kind]; } };
    loops[kind] = L; return L;
  }
  let tickT = 0;
  function tick(dt) {     // clock on the left wall; snow crunch under his feet through the phone while he walks
    if (!ac) return;
    tickT += dt;
    if (tickT > 1) { tickT -= 1; shot(-1.1, 2.6, .3, (o) => burst(o, .012, .05, 4000, 'highpass'), .1); }
    if (loops.street && phone && Math.random() < dt * 1.7) { const s = ac.createGain(); s.gain.value = 1; s.connect(phone.inp); burst(s, .09, .25, 1500, 'bandpass', 1); setTimeout(() => s.disconnect(), 400); }
  }

  const fx = {
    vibrate: (az = .55) => shot(az, .9, .1, (o, t) => { for (let i = 0; i < 2; i++) { const s = new OscillatorNode(ac, { type: 'sawtooth', frequency: 165 }), g = ac.createGain(), l = new BiquadFilterNode(ac, { type: 'lowpass', frequency: 600 }); g.gain.setValueAtTime(0, t + i * .5); g.gain.linearRampToValueAtTime(.18, t + i * .5 + .02); g.gain.setValueAtTime(.18, t + i * .5 + .35); g.gain.linearRampToValueAtTime(0, t + i * .5 + .38); s.connect(l).connect(g).connect(o); s.start(t); s.stop(t + 1.1); } }, 1.2),
    ring: (az = .55) => shot(az, .9, .25, (o) => [988, 1319, 1175, 1568, 1319, 988].forEach((f, i) => { tone(o, f, .32, .09, i * .16, 'triangle'); tone(o, f * 2, .2, .02, i * .16); }), 1.2),
    answer: (az) => shot(az, .3, .05, (o) => { tone(o, 1400, .05, .12); burst(o, .03, .2, 2000, 'bandpass', 1, .01); }, .2),
    hangup: (az) => shot(az, .12, .02, (o) => { tone(o, 480, .18, .12); tone(o, 480, .18, .12, .3); tone(o, 480, .18, .12, .6); }, 1),
    rustle: (az, dist = .3) => shot(az, dist, .1, (o, t) => { const s = noiseSrc(), f = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 2800, Q: .6 }), g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.5, t + .15); g.gain.linearRampToValueAtTime(0, t + .7); s.connect(f).connect(g).connect(o); s.stop(t + .8); }, .8),
    window: (az = 1.2, open = true) => shot(az, 1.6, .4, (o, t) => { const s = noiseSrc(), f = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 420, Q: 2 }), g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.5, t + .1); g.gain.linearRampToValueAtTime(0, t + .6); s.connect(f).connect(g).connect(o); s.stop(t + .7); burst(o, .04, .5, 900, 'bandpass', 1, open ? .62 : .55); }, .8),
    bell: (az = -.7, dist = 3.5, phoneToo = false) => {
      shot(az, dist, .5, (o) => { tone(o, 784, 1.1, .16, 0, 'sine'); tone(o, 1568, .6, .04); tone(o, 622, 1.4, .16, .55, 'sine'); tone(o, 1244, .7, .04, .55); }, 2.2);
      if (phoneToo && phone) { const s = ac.createGain(); s.gain.value = .5; s.connect(phone.inp); tone(s, 784, 1.1, .3); tone(s, 622, 1.4, .3, .55); setTimeout(() => s.disconnect(), 2500); }
    },
    steps: (az0, az1, n = 6) => { for (let i = 0; i < n; i++) setTimeout(() => shot(az0 + (az1 - az0) * i / (n - 1), 1.2, .3, (o) => burst(o, .06, .35, 240, 'lowpass', .7), .2), i * 420); },
    door: (az = -.7) => shot(az, 1.8, .5, (o, t) => { burst(o, .03, .7, 1800, 'bandpass', 3); burst(o, .04, .6, 1200, 'bandpass', 3, .12); const s = noiseSrc(), f = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 300, Q: 3 }), g = ac.createGain(); g.gain.setValueAtTime(0, t + .4); g.gain.linearRampToValueAtTime(.4, t + .6); g.gain.linearRampToValueAtTime(0, t + 1.2); s.connect(f).connect(g).connect(o); s.stop(t + 1.3); }, 1.4),
    gust: () => shot(0, 1.2, .3, (o, t) => { const s = noiseSrc(), f = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 600, Q: .5 }), g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.9, t + .3); g.gain.linearRampToValueAtTime(0, t + 2.6); s.connect(f).connect(g).connect(o); s.stop(t + 2.7); }, 2.8),
    chime: () => shot(0, 1.5, .6, (o) => [659.3, 784, 987.8, 1318.5].forEach((f, i) => tone(o, f, 1.2, .08, i * .14)), 2),
  };
  function setMuted(v) { muted = v; if (master) master.gain.setTargetAtTime(v ? 0 : .95, ac.currentTime, .05); }
  function lrCheck() { init(); shot(-Math.PI / 2, 1, .1, (o) => tone(o, 880, .4, .2), .5); setTimeout(() => shot(Math.PI / 2, 1, .1, (o) => tone(o, 1175, .4, .2), .5), 900); }
  return { init, phoneOn, phoneEar, phoneOff, loadVoices, ready, say, voiceLevel, loop, tick, fx, setMuted, isMuted: () => muted, lrCheck, ctx: () => ac, hasPhone: () => !!phone };
})();
