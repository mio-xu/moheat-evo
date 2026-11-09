// Jin's VIP lounge — Web Audio. Jin's voice (in front, or right at your right ear), the muffled post-concert hall behind the door,
// and small synthesized sounds (cold can, leather, ice, heartbeat). HRTF everywhere. Adapted from Demo16's audio.js.
// az: rad, 0 = front, + = right. dist: metres.
window.JLAudio = (() => {
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
    const n = Math.round(ac.sampleRate * .5), b = ac.createBuffer(2, n, ac.sampleRate);   // a small padded lounge
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
    for (const id of ids) for (const k of [VK(id)]) if (!voices[k]) voices[k] = VF(id, 'media/voice/', '').then((r) => r.arrayBuffer()).then((b) => ac.decodeAudioData(b)).then((buf) => (voices[k] = buf)).catch(() => (voices[k] = null));
  }
  function say(id, where = { az: 0, dist: .8 }, gain = 1.4) {   // → Promise, resolves when the line ends
    return new Promise(async (res) => {
      if (voices[VK(id)] === undefined) loadVoices([id]);   // not loaded in this voice language yet
      if (voices[VK(id)] instanceof Promise) await voices[VK(id)];
      const buf = voices[VK(id)]; if (!ac || !buf) return res();
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
    const nodes = []; let g, p;
    if (kind === 'hall') {         // the arena behind the closed door: muffled crowd + slow bass of the after-show music
      ({ g, p } = chain(Math.PI * .8, 5, .4)); g.gain.value = 0;
      const lp = new BiquadFilterNode(ac, { type: 'lowpass', frequency: 380 });
      const s = noiseSrc(); s.connect(lp).connect(g); nodes.push(s);
      const iv = setInterval(() => { if (!ac || g.gain.value < .01) return; tone(g, 52, .22, .5); tone(g, 104, .12, .12, .02); }, 545); nodes.push({ stop: () => clearInterval(iv), disconnect() {} });
    }
    if (kind === 'heart') {        // heartbeat (yours), in the middle of your head
      ({ g, p } = chain(0, .2, 0)); g.gain.value = 0;
      const iv = setInterval(() => { if (!ac) return; tone(g, 55, .14, .9); tone(g, 50, .16, .6, .24); }, 760); nodes.push({ stop: () => clearInterval(iv), disconnect() {} });
    }
    const L = { g, set: (v) => g.gain.setTargetAtTime(v, ac.currentTime, .2), stop: () => { g.gain.setTargetAtTime(0, ac.currentTime, .3); setTimeout(() => { for (const n of nodes) try { n.stop(); n.disconnect(); } catch {} g.disconnect(); }, 1500); delete loops[kind]; } };
    loops[kind] = L; return L;
  }

  const fx = {
    rustle: (az = 0, dist = .5) => shot(az, dist, .1, (o, t) => { const s = noiseSrc(), f = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 2600, Q: .6 }), g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.45, t + .12); g.gain.linearRampToValueAtTime(0, t + .6); s.connect(f).connect(g).connect(o); s.stop(t + .7); }, .8),
    rub: (dist = .45) => shot(0, dist, .08, (o, t) => { const s = noiseSrc(), f = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 1800, Q: .5 }), g = ac.createGain(); for (let i = 0; i < 4; i++) { g.gain.setValueAtTime(.05, t + i * .35); g.gain.linearRampToValueAtTime(.35, t + i * .35 + .15); g.gain.linearRampToValueAtTime(.05, t + i * .35 + .33); } s.connect(f).connect(g).connect(o); s.stop(t + 1.5); }, 1.6),
    can: () => shot(1.3, .2, .03, (o) => { burst(o, .03, .5, 3000, 'bandpass', 3); tone(o, 2400, .25, .05); for (let i = 0; i < 14; i++) burst(o, .01, .06, rnd(5000, 9000), 'highpass', .7, .05 + i * rnd(.02, .05)); }, .8),   // cold can on the right cheek + fizz
    ice: (az = -.6) => shot(az, 1.2, .3, (o) => { for (let i = 0; i < 3; i++) tone(o, rnd(2500, 4200), .25, .06, i * rnd(.05, .12), 'triangle'); }, .6),
    leather: (az = 0, dist = .4) => shot(az, dist, .1, (o, t) => { const s = noiseSrc(), f = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 900, Q: 1.2 }), g = ac.createGain(); g.gain.setValueAtTime(0, t); for (let i = 0; i < 5; i++) { g.gain.linearRampToValueAtTime(.4, t + i * .16 + .05); g.gain.linearRampToValueAtTime(.05, t + i * .16 + .14); } g.gain.linearRampToValueAtTime(0, t + .9); s.connect(f).connect(g).connect(o); s.stop(t + 1); }, 1.1),
    door: () => shot(Math.PI * .8, 2.5, .4, (o) => { burst(o, .04, .6, 1500, 'bandpass', 3); burst(o, .2, .4, 160, 'lowpass', .7, .3); }, .8),
    chime: () => shot(0, 1.5, .6, (o) => [659.3, 784, 987.8, 1318.5].forEach((f, i) => tone(o, f, 1.2, .08, i * .14)), 2),
    tick: (n) => shot(0, 1, .2, (o) => tone(o, n ? 880 : 1320, .12, .08), .3),
  };
  function setMuted(v) { muted = v; if (master) master.gain.setTargetAtTime(v ? 0 : .95, ac.currentTime, .05); }
  function lrCheck() { init(); shot(-Math.PI / 2, 1, .1, (o) => tone(o, 880, .4, .2), .5); setTimeout(() => shot(Math.PI / 2, 1, .1, (o) => tone(o, 1175, .4, .2), .5), 900); }
  return { init, loadVoices, say, voiceLevel, loop, fx, setMuted, isMuted: () => muted, lrCheck, ctx: () => ac };
})();
