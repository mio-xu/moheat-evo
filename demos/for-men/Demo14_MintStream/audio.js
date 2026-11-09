// Mint's ear salon (a live stream) — Web Audio. Her whisper (beside the chair, at one ear of the dummy head = your ears) and the little
// salon: a quiet room tone with a soft aquarium bubble, her warmed hands rubbing an ear, the ear pick scratching, a steamed towel, a
// chilled spoon's tink, a warm stone set down, her mint breath, a cool mist spray, the blanket. Base copied from Demo17 Cocoa's audio.js.
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
    const n = Math.round(ac.sampleRate * .9), b = ac.createBuffer(2, n, ac.sampleRate);   // a small soft room: a short, dry tail
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
    if (kind === 'room') {         // the salon at night: a very low room tone + the soft bubbling of a small tank on the right
      ({ g, p } = chain(1.1, 2.2, .2)); g.gain.value = 0;
      const s = noiseSrc(); lp = new BiquadFilterNode(ac, { type: 'lowpass', frequency: 220 }); const sg = ac.createGain(); sg.gain.value = .3; s.connect(lp).connect(sg).connect(g); nodes.push(s);
      const iv = setInterval(() => { if (!ac || g.gain.value < .01) return; if (Math.random() < .6) tone(g, rnd(700, 1400), .06, rnd(.01, .03), 0, 'sine', .003); }, 260);
      nodes.push({ stop: () => clearInterval(iv), disconnect() {} });
    }
    if (kind === 'scratch') {      // the bamboo ear pick right inside the ear: tiny dry scratches (placed at the ear with .at())
      ({ g, p } = chain(1.35, .08, 0)); g.gain.value = 0;
      const iv = setInterval(() => { if (!ac || g.gain.value < .01) return; const n = 1 + (Math.random() * 3 | 0); for (let i = 0; i < n; i++) burst(g, rnd(.01, .04), rnd(.15, .45), rnd(2500, 6000), 'bandpass', 2.5, rnd(0, .12)); }, 140);
      nodes.push({ stop: () => clearInterval(iv), disconnect() {} });
    }
    const L = { g, p, lp,
      set: (v, tc = .2) => g.gain.setTargetAtTime(v, ac.currentTime, tc),
      at: (az, dist, tc) => place(p, az, dist, tc ?? .05),
      tone: (f) => lp?.frequency.setTargetAtTime(f, ac.currentTime, .3),
      stop: () => { g.gain.setTargetAtTime(0, ac.currentTime, .15); setTimeout(() => { for (const n of nodes) try { n.stop(); n.disconnect(); } catch {} g.disconnect(); }, 1200); delete loops[kind]; } };
    loops[kind] = L; return L;
  }

  const ear = (side) => 1.35 * Math.sign(side || 1);
  const fx = {
    // warm hands rubbing the outer ear (squish, squish) — a few soft strokes right at that ear
    massage: (side = 1) => { if (!ac) return; for (let i = 0; i < 8; i++) setTimeout(() => shot(ear(side), .06, 0, (o, t) => { const s = noiseSrc(), f = new BiquadFilterNode(ac, { type: 'lowpass', frequency: 900 }), gg = ac.createGain(); gg.gain.setValueAtTime(0, t); gg.gain.linearRampToValueAtTime(.35, t + .18); gg.gain.linearRampToValueAtTime(0, t + .5); s.connect(f).connect(gg).connect(o); s.stop(t + .55); }, .7), i * 620); },
    // the steamed towel laid over both ears: cloth + a soft hiss of steam, then muffled
    towel: () => { if (!ac) return; for (const a of [-1.4, 1.4]) shot(a, .08, 0, (o, t) => { const s = noiseSrc(), f = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 1200, Q: .5 }), gg = ac.createGain(); gg.gain.setValueAtTime(0, t + 2.4); gg.gain.linearRampToValueAtTime(.4, t + 2.6); gg.gain.linearRampToValueAtTime(.05, t + 3.4); gg.gain.linearRampToValueAtTime(0, t + 5); s.connect(f).connect(gg).connect(o); s.stop(t + 5.1); }, 5.5); },
    // the chilled spoon touching the ear: a tiny metallic tink
    tink: (side = 1) => shot(ear(side), .06, 0, (o) => { tone(o, 3800, .25, .05, 0, 'sine', .001); tone(o, 6100, .15, .02, 0, 'sine', .001); burst(o, .01, .2, 4000, 'bandpass', 4); }, .5),
    // a warm smooth stone set down on the cushion by the ear
    stone: (side = 1) => shot(ear(side), .15, .02, (o) => { burst(o, .05, .5, 500, 'lowpass', 1); burst(o, .2, .1, 900, 'bandpass', .7, .05); }, .6),
    // her mint breath on the ear: a long soft "fuuu" right at the ear
    blow: (side = 1) => shot(ear(side), .05, 0, (o, t) => { const s = noiseSrc(), f = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 900, Q: .4 }), gg = ac.createGain(); gg.gain.setValueAtTime(0, t); gg.gain.linearRampToValueAtTime(.45, t + .2); gg.gain.linearRampToValueAtTime(.2, t + 1.2); gg.gain.linearRampToValueAtTime(0, t + 1.7); s.connect(f).connect(gg).connect(o); s.stop(t + 1.8); }, 2),
    // a cool mist sprayed over both ears: psst
    mist: () => { for (const a of [-1.2, 1.2]) shot(a, .25, 0, (o, t) => { const s = noiseSrc(), f = new BiquadFilterNode(ac, { type: 'highpass', frequency: 3500 }), gg = ac.createGain(); gg.gain.setValueAtTime(0, t); gg.gain.linearRampToValueAtTime(.35, t + .03); gg.gain.linearRampToValueAtTime(0, t + .45); s.connect(f).connect(gg).connect(o); s.stop(t + .5); }, .8); },
    rustle: (az = 0, dist = .3) => shot(az, dist, .05, (o, t) => { const s = noiseSrc(), f = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 1800, Q: .6 }), gg = ac.createGain(); gg.gain.setValueAtTime(0, t); gg.gain.linearRampToValueAtTime(.4, t + .12); gg.gain.linearRampToValueAtTime(0, t + .7); s.connect(f).connect(gg).connect(o); s.stop(t + .8); }, .9),
  };
  function setMuted(v) { muted = v; if (master) master.gain.setTargetAtTime(v ? 0 : .95, ac.currentTime, .05); }
  function lrCheck() { init(); shot(-Math.PI / 2, 1, .1, (o) => tone(o, 880, .4, .2), .5); setTimeout(() => shot(Math.PI / 2, 1, .1, (o) => tone(o, 1175, .4, .2), .5), 900); }
  return { init, loadVoices, say, voiceLevel, loop, fx, setMuted, isMuted: () => muted, lrCheck, ctx: () => ac };
})();
