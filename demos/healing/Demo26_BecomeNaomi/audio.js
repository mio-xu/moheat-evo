// 『ねこになった日』 — Web Audio. You are Naomi: every sound is placed around YOUR head (az: rad, 0 = front, + = right; dist: m).
// Naomi's own sounds (purr, meow, paw steps, birds, room tone) come from Demo 11's audio.js, loaded by path (window.NaomiAudio,
// unchanged). Both modules share ONE AudioContext: NaomiAudio.init() is handed our context, whose `destination` is our master bus,
// so the "inside the laundry" muffle (a low-pass on the bus) applies to everything. New here: the owner's voice (ElevenLabs files),
// the kitchen (kettle, can, fridge door + hum), the dryer (beep + tumble), laundry rustle, heartbeat and breathing on the sofa.
window.NekoAudio = (() => {
  const NA = window.NaomiAudio;
  let ac = null, bus = null, muffle = null, master = null, dry = null, verb = null, noise = null, muted = false;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const voices = {};
  // voice language (shared/shell.js MoHeatVoice; tools/web/voice_lang.py): one cache entry per language, ja fallback, a switch preloads the lines used so far
  const VF = (id, base, q = '') => (window.MoHeatVoice ? MoHeatVoice.fetch(id, base, q) : fetch(`${base}${id}.m4a${q}`));
  const VIDS = new Set(), VK = (id) => (VIDS.add(id), window.MoHeatVoice ? MoHeatVoice.key(id) : id);
  addEventListener('moheat:voicelang', () => loadVoices([...VIDS]));
  let level = 0, an = null, abuf = null;

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return ac; }
    const AC = window.AudioContext || window.webkitAudioContext;
    ac = new AC();
    master = ac.createGain(); master.gain.value = muted ? 0 : .95;
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3;
    muffle = new BiquadFilterNode(ac, { type: 'lowpass', frequency: 20000, Q: .5 });
    bus = ac.createGain(); bus.connect(muffle).connect(master); master.connect(comp).connect(ac.destination);
    // hand the same context to Demo 11's module, with our bus as its destination
    Object.defineProperty(ac, 'destination', { value: bus, configurable: true });
    const real = window.AudioContext, realW = window.webkitAudioContext;
    window.AudioContext = function () { return ac; }; if (realW) window.webkitAudioContext = window.AudioContext;
    try { NA.init(); } finally { window.AudioContext = real; if (realW) window.webkitAudioContext = realW; }
    dry = ac.createGain(); dry.connect(bus);
    verb = ac.createConvolver(); const vg = ac.createGain(); vg.gain.value = .12; verb.connect(vg).connect(bus);
    const n = Math.round(ac.sampleRate * .55), b = ac.createBuffer(2, n, ac.sampleRate);   // a small apartment
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
  // every source gets a `focus` gain the game sets from where your ears point (the cat-ear radar)
  const focused = new Set();
  function chain(az, dist, send = .3) {
    const g = ac.createGain(), f = ac.createGain(), p = panner(az, dist), s = ac.createGain(); s.gain.value = send;
    g.connect(f).connect(p); p.connect(dry); p.connect(s); s.connect(verb);
    const c = { g, f, p, az }; focused.add(c); return c;
  }
  function drop(c) { focused.delete(c); try { c.g.disconnect(); c.f.disconnect(); c.p.disconnect(); } catch {} }
  let focusFn = () => 1;
  function setFocus(fn) { focusFn = fn; for (const c of focused) c.f.gain.setTargetAtTime(fn(c.az), ac.currentTime, .12); }
  function noiseSrc() { const s = ac.createBufferSource(); s.buffer = noise; s.loop = true; s.start(0, rnd(0, 2.5)); return s; }
  function shot(az, dist, send, build, len) {
    if (!ac) return; const c = chain(az, dist, send); c.f.gain.value = focusFn(az); build(c.g, ac.currentTime); setTimeout(() => drop(c), (len + 1.5) * 1000);
  }
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

  // ---------------------------------------------------------------- the owner's voice
  function loadVoices(ids) {
    if (!ac) return;
    for (const id of ids) for (const k of [VK(id)]) if (!voices[k]) voices[k] = VF(id, 'media/voice/', '').then((r) => { if (!r.ok) throw 0; return r.arrayBuffer(); }).then((b) => ac.decodeAudioData(b)).then((buf) => (voices[k] = buf)).catch(() => (voices[k] = null));
  }
  function say(id, where = { az: 0, dist: .8 }, gain = 1.4) {   // → Promise, resolves when the line ends
    return new Promise(async (res) => {
      if (voices[VK(id)] === undefined) loadVoices([id]);   // not loaded in this voice language yet
      if (voices[VK(id)] instanceof Promise) await voices[VK(id)];
      const buf = voices[VK(id)]; if (!ac || !buf) return setTimeout(res, 2200);
      const s = ac.createBufferSource(); s.buffer = buf; const g = ac.createGain(); g.gain.value = gain;
      const c = chain(where.az, where.dist, where.dist < .3 ? .03 : .15); c.f.gain.value = focusFn(where.az);
      s.connect(g); g.connect(c.g); g.connect(an);
      setTimeout(() => drop(c), (buf.duration + 2) * 1000);
      s.onended = () => res(); s.start();
    });
  }
  function voiceLevel() {
    if (!an) return 0;
    an.getFloatTimeDomainData(abuf); let s = 0; for (let i = 0; i < abuf.length; i++) s += abuf[i] * abuf[i];
    const v = Math.sqrt(s / abuf.length); level += (v - level) * .35; return level;
  }

  // ---------------------------------------------------------------- loops: L.set(level), L.at(az, dist)
  const loops = {};
  function loop(kind) {
    if (!ac) return null; if (loops[kind]) return loops[kind];
    const nodes = []; let c, extra = {};
    const mk = (az, dist, send) => { c = chain(az, dist, send); c.g.gain.value = 0; return c.g; };
    if (kind === 'kettle') {          // a kettle starting to sing in the kitchen (front right)
      const o = mk(1.0, 3, .35), s = noiseSrc(), bp = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 3000, Q: 2 }), ng = ac.createGain(); ng.gain.value = .3;
      s.connect(bp).connect(ng).connect(o); const w = new OscillatorNode(ac, { frequency: 2100 }), wg = ac.createGain(); wg.gain.value = .015; w.connect(wg).connect(o); w.start(); nodes.push(s, w);
    }
    if (kind === 'fridge') {          // open fridge: compressor hum + the cold air's soft hiss
      const o = mk(-.4, 1.1, .2), h = new OscillatorNode(ac, { type: 'sawtooth', frequency: 58 }), hl = new BiquadFilterNode(ac, { type: 'lowpass', frequency: 220 }), hg = ac.createGain(); hg.gain.value = .08;
      h.connect(hl).connect(hg).connect(o); h.start();
      const s = noiseSrc(), bp = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 900, Q: .4 }), sg = ac.createGain(); sg.gain.value = .12; s.connect(bp).connect(sg).connect(o); nodes.push(h, s);
    }
    if (kind === 'dryer') {           // tumble dryer behind the wall on the right: drum rumble + tumbling thumps
      const o = mk(1.4, 3, .3), s = noiseSrc(), lp = new BiquadFilterNode(ac, { type: 'lowpass', frequency: 260 }), ng = ac.createGain(); ng.gain.value = .5; s.connect(lp).connect(ng).connect(o); nodes.push(s);
      const iv = setInterval(() => { if (c.g.gain.value > .01) burst(c.g, .08, rnd(.2, .5), 160, 'lowpass', .7); }, 520); nodes.push({ stop: () => clearInterval(iv), disconnect() {} });
    }
    if (kind === 'heart') {           // her heartbeat under your ear + slow breathing (you lie on her chest)
      const o = mk(0, .2, .02);
      let k = 0; const iv = setInterval(() => { if (c.g.gain.value < .01) return; burst(c.g, .09, .7, 70, 'lowpass', 1); burst(c.g, .07, .45, 60, 'lowpass', 1, .24); if (++k % 4 === 0) { const s = ac.createBufferSource(); s.buffer = noise; const f = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 700, Q: .5 }), g = ac.createGain(), t = ac.currentTime; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.08, t + 1.2); g.gain.linearRampToValueAtTime(0, t + 2.6); s.connect(f).connect(g).connect(c.g); s.start(t, rnd(0, 1), 2.7); } }, 950);
      nodes.push({ stop: () => clearInterval(iv), disconnect() {} }); extra.o = o;
    }
    if (kind === 'night') {           // a faint winter wind outside the closed window (left)
      const o = mk(-1.2, 3, .3), s = noiseSrc(), bp = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 420, Q: .6 }), ng = ac.createGain(); ng.gain.value = .25;
      const lfo = new OscillatorNode(ac, { frequency: .13 }), lg = ac.createGain(); lg.gain.value = .15; lfo.connect(lg).connect(ng.gain); lfo.start(); s.connect(bp).connect(ng).connect(o); nodes.push(s, lfo);
    }
    const L = { c,
      set: (v, tc = .2) => c.g.gain.setTargetAtTime(v, ac.currentTime, tc),
      at: (az, dist) => { c.az = az; place(c.p, az, dist, .05); c.f.gain.setTargetAtTime(focusFn(az), ac.currentTime, .1); },
      stop: () => { c.g.gain.setTargetAtTime(0, ac.currentTime, .15); setTimeout(() => { for (const n of nodes) try { n.stop(); n.disconnect(); } catch {} drop(c); }, 1200); delete loops[kind]; } };
    loops[kind] = L; return L;
  }

  const fx = {
    can: (az = 1.0) => shot(az, 3, .35, (o) => { burst(o, .03, .9, 3200, 'bandpass', 2); burst(o, .25, .25, 1800, 'bandpass', .8, .03); tone(o, 2600, .2, .04, .02, 'triangle', 2400); }, .6),   // カシュッ
    spoon: (az = 1.0) => shot(az, 2.5, .35, (o) => { for (let i = 0; i < 3; i++) tone(o, rnd(3000, 3600), .12, .05, i * .22, 'triangle'); }, 1),
    slipper: (az, dist = 1.5) => shot(az, dist, .3, (o) => { for (let i = 0; i < 4; i++) { burst(o, .09, .22, 900, 'bandpass', .7, i * .45); burst(o, .05, .12, 300, 'lowpass', .7, i * .45 + .02); } }, 2.2),
    fridgeOpen: (az = -.4) => shot(az, 1.1, .2, (o) => { burst(o, .05, .6, 600, 'bandpass', 1.5); burst(o, .2, .25, 2500, 'bandpass', .6, .02); tone(o, 140, .15, .1, 0, 'triangle'); }, .6),   // パコッ
    fridgeClose: (az = -.4) => shot(az, 1.1, .2, (o) => { burst(o, .07, .8, 180, 'lowpass', .8); tone(o, 4200, .08, .02, .03, 'triangle'); }, .6),
    beep: (az = 1.4) => shot(az, 3, .3, (o) => { for (let i = 0; i < 3; i++) tone(o, 2350, .14, .1, i * .26, 'square'); }, 1.2),   // ピピッ
    dump: (az = .2) => shot(az, .7, .2, (o, t) => { const s = noiseSrc(), f = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 1300, Q: .5 }), g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.7, t + .15); g.gain.linearRampToValueAtTime(0, t + 1.1); s.connect(f).connect(g).connect(o); s.stop(t + 1.2); burst(o, .2, .4, 160, 'lowpass', .7, .3); }, 1.3),
    rustle: (az = 0, dist = .25, amp = .45) => shot(az, dist, .05, (o, t) => { const s = noiseSrc(), f = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 2400, Q: .6 }), g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + .12); g.gain.linearRampToValueAtTime(0, t + .7); s.connect(f).connect(g).connect(o); s.stop(t + .8); }, .9),
    lift: (az = -.6) => shot(az, .4, .1, (o, t) => { const s = noiseSrc(), f = new BiquadFilterNode(ac, { type: 'highpass', frequency: 1500 }), g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.5, t + .3); g.gain.linearRampToValueAtTime(0, t + 1); s.connect(f).connect(g).connect(o); s.stop(t + 1.1); }, 1.2),
    jump: () => shot(0, .4, .15, (o) => { burst(o, .1, .5, 200, 'lowpass', .7); burst(o, .06, .2, 2200, 'bandpass', 1, .02); }, .3),
    sun: () => shot(0, 1.5, .5, (o) => [784, 987.8, 1318.5].forEach((f, i) => tone(o, f, .6, .06, i * .09)), 1),
  };
  function setMuffle(k) { if (muffle) muffle.frequency.setTargetAtTime(20000 * Math.pow(350 / 20000, Math.max(0, Math.min(1, k))), ac.currentTime, .15); }
  function setMuted(v) { muted = v; if (master) master.gain.setTargetAtTime(v ? 0 : .95, ac.currentTime, .05); }
  function lrCheck() { init(); shot(-Math.PI / 2, 1, .1, (o) => tone(o, 880, .4, .2), .5); setTimeout(() => shot(Math.PI / 2, 1, .1, (o) => tone(o, 1175, .4, .2), .5), 900); }
  return { init, loadVoices, say, voiceLevel, loop, fx, setFocus, setMuffle, setMuted, isMuted: () => muted, lrCheck, ctx: () => ac, NA };
})();
