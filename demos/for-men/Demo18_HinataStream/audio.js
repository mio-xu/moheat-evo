// Hinata's arcade date — Web Audio. Her voice (HRTF, at the side she speaks from) and the night around you: the arcade (a muffled
// chiptune beat, game jingles and coin sounds all around), the cold street with its wind, the racing cabinet (engine + the fans'
// blast from the front), and the sound effects (automatic door, taiko don / ka, crash, crane claw, purikura countdown + shutter, a can
// dropping out of the vending machine). Base (voices, HRTF chain, helpers) copied from Demo31's audio.js. az: rad, 0 = front, + = right.
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
    const n = Math.round(ac.sampleRate * 1.6), b = ac.createBuffer(2, n, ac.sampleRate);   // a busy arcade: a short room tail
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
    if (kind === 'arcade') {       // the arcade: a muffled four-on-the-floor chiptune beat from far cabinets + random jingles / coins around you
      ({ g, p } = chain(0, 3, .4)); g.gain.value = 0;
      const crowd = noiseSrc(), cf = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 700, Q: .5 }), cg = ac.createGain(); cg.gain.value = .25;
      crowd.connect(cf).connect(cg).connect(g); nodes.push(crowd);
      let beat = 0;
      const iv = setInterval(() => {
        if (!ac || g.gain.value < .01) return;
        beat++; tone(g, 55, .18, .5, 0, 'sine', .004); if (beat % 2 === 0) burst(g, .05, .18, 6000, 'highpass', .7);
        if (beat % 4 === 0) { const f = [523, 659, 784, 1047][Math.random() * 4 | 0]; tone(g, f, .12, .05, 0, 'square', .003); tone(g, f * 1.5, .12, .04, .12, 'square', .003); }
        if (Math.random() < .12) { const az = (Math.random() - .5) * 5, c = chain(az, 2 + Math.random() * 3, .3); [1319, 1568, 2093].forEach((f, i) => tone(c.g, f, .16, .05, i * .07, 'square', .002)); setTimeout(() => { c.g.disconnect(); c.p.disconnect(); }, 1200); }
        if (Math.random() < .08) { const c = chain((Math.random() - .5) * 5, 2.5, .2); tone(c.g, 3900, .25, .04, 0); tone(c.g, 5200, .2, .03, .08); setTimeout(() => { c.g.disconnect(); c.p.disconnect(); }, 900); }
      }, 260);
      nodes.push({ stop: () => clearInterval(iv), disconnect() {} });
    }
    if (kind === 'street') {       // the winter street: wind + a distant city hum
      ({ g, p } = chain(1.2, 1.5, .2)); g.gain.value = 0;
      lp = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 480, Q: .5 });
      const s = noiseSrc(); s.connect(lp).connect(g); nodes.push(s);
      const hum = noiseSrc(), hf = new BiquadFilterNode(ac, { type: 'lowpass', frequency: 180 }), hg = ac.createGain(); hg.gain.value = .5; hum.connect(hf).connect(hg).connect(g); nodes.push(hum);
    }
    if (kind === 'engine') {       // the racing cabinet: an engine whine that revs + the fans' broadband blast from the front
      ({ g, p } = chain(0, .7, .1)); g.gain.value = 0;
      const o = new OscillatorNode(ac, { type: 'sawtooth', frequency: 90 }), of = new BiquadFilterNode(ac, { type: 'lowpass', frequency: 900 }), og = ac.createGain(); og.gain.value = .08;
      const lfo = new OscillatorNode(ac, { frequency: .35 }), lg = ac.createGain(); lg.gain.value = 60; lfo.connect(lg).connect(o.frequency); lfo.start();
      o.connect(of).connect(og).connect(g); o.start(); nodes.push(o, lfo);
      const fan = noiseSrc(), ff = new BiquadFilterNode(ac, { type: 'lowpass', frequency: 1400 }), fg = ac.createGain(); fg.gain.value = .55;
      const flfo = new OscillatorNode(ac, { frequency: .43 }), flg = ac.createGain(); flg.gain.value = .25; flfo.connect(flg).connect(fg.gain); flfo.start();
      fan.connect(ff).connect(fg).connect(g); nodes.push(fan, flfo);
    }
    const L = { g, p, lp,
      set: (v, tc = .2) => g.gain.setTargetAtTime(v, ac.currentTime, tc),
      at: (az, dist, tc) => place(p, az, dist, tc ?? .05),
      tone: (f) => lp?.frequency.setTargetAtTime(f, ac.currentTime, .3),
      stop: () => { g.gain.setTargetAtTime(0, ac.currentTime, .15); setTimeout(() => { for (const n of nodes) try { n.stop(); n.disconnect(); } catch {} g.disconnect(); }, 1200); delete loops[kind]; } };
    loops[kind] = L; return L;
  }


  const fx = {
    door: () => shot(-.1, 2.2, .3, (o, t) => { [880, 1175].forEach((f, i) => tone(o, f, .35, .07, i * .18)); const s = noiseSrc(), f = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 900, Q: .6 }), g = ac.createGain(); g.gain.setValueAtTime(0, t + .3); g.gain.linearRampToValueAtTime(.3, t + .5); g.gain.linearRampToValueAtTime(0, t + 1.3); s.connect(f).connect(g).connect(o); s.stop(t + 1.4); }, 2),
    don: (v = 1) => shot(.45, 1.4, .15, (o) => { tone(o, 88, .32, .55 * v, 0, 'sine', .003); burst(o, .05, .35 * v, 260, 'lowpass', .8); }, .6),
    cheer: (az = 0) => shot(az, 1.2, .2, (o) => { [784, 988, 1175, 1568].forEach((f, i) => tone(o, f, .25, .06, i * .09, 'square', .003)); }, 1),
    crash: (az = .5) => shot(az, 1.2, .2, (o) => { burst(o, .4, .7, 500, 'lowpass', .8); burst(o, .2, .4, 2500, 'bandpass', 1); }, 1),
    coin: (az = -.3) => shot(az, 1, .2, (o) => { tone(o, 3900, .3, .05, 0); tone(o, 5200, .25, .04, .09); burst(o, .04, .2, 2500, 'bandpass', 3, .25); }, 1),
    whirr: () => shot(-.5, 1.2, .1, (o) => { const s = new OscillatorNode(ac, { type: 'square', frequency: 140 }), f = new BiquadFilterNode(ac, { type: 'lowpass', frequency: 600 }), g = ac.createGain(); g.gain.value = .03; s.connect(f).connect(g).connect(o); s.start(); s.stop(ac.currentTime + .25); }, .5),
    drop: () => shot(-.5, 1.3, .15, (o) => { tone(o, 300, .6, .04, 0, 'square', .01); burst(o, .08, .3, 800, 'bandpass', 1, .7); }, 1.2),
    clack: () => shot(-.5, 1.2, .15, (o) => { burst(o, .03, .6, 2600, 'bandpass', 3); tone(o, 900, .12, .05, .02, 'square', .002); }, .6),
    plop: () => shot(-.6, 1.3, .15, (o) => { burst(o, .12, .45, 380, 'lowpass', .8); burst(o, .06, .2, 900, 'bandpass', 1, .12); }, .8),
    jingle: () => shot(-.3, 1.4, .3, (o) => [1047, 1319, 1568, 2093, 1568, 2093].forEach((f, i) => tone(o, f, .22, .06, i * .1, 'square', .003)), 1.5),
    beep: (k = 1) => shot(0, 1, .1, (o) => tone(o, 1200 * k, .15, .08, 0, 'sine', .003), .4),
    shutter: () => shot(0, .8, .1, (o) => { burst(o, .03, .6, 3200, 'bandpass', 2); burst(o, .04, .45, 1800, 'bandpass', 2, .07); }, .5),
    can: (az = -.9) => shot(az, 1.6, .2, (o) => { burst(o, .12, .7, 300, 'lowpass', .8); tone(o, 170, .25, .25, 0, 'triangle', .005); burst(o, .05, .3, 2200, 'bandpass', 3, .5); }, 1),
    rustle: (az = 0, dist = .3) => shot(az, dist, .05, (o, t) => { const s = noiseSrc(), f = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 1800, Q: .6 }), g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.4, t + .12); g.gain.linearRampToValueAtTime(0, t + .7); s.connect(f).connect(g).connect(o); s.stop(t + .8); }, .9),
  };
  function setMuted(v) { muted = v; if (master) master.gain.setTargetAtTime(v ? 0 : .95, ac.currentTime, .05); }
  function lrCheck() { init(); shot(-Math.PI / 2, 1, .1, (o) => tone(o, 880, .4, .2), .5); setTimeout(() => shot(Math.PI / 2, 1, .1, (o) => tone(o, 1175, .4, .2), .5), 900); }
  return { init, loadVoices, say, voiceLevel, loop, fx, setMuted, isMuted: () => muted, lrCheck, ctx: () => ac };
})();
