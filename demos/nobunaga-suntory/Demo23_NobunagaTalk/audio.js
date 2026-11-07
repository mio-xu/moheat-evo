// Web Audio for the live talk: each character has his own HRTF panner (moves while he talks) and his own level meter;
// synthesized room sounds per scene (wind, birds, hearth, kettle, izakaya murmur, crickets), footsteps, gusts. Adapted from Demo21's audio.js.
// az: rad, 0 = front, + = right. dist: metres.
window.TKAudio = (() => {
  let ac = null, master = null, dry = null, verb = null, noise = null, muted = false;
  const rnd = (a, b) => a + Math.random() * (b - a);

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return ac; }
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain(); master.gain.value = muted ? 0 : .95;
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3;
    master.connect(comp).connect(ac.destination);
    dry = ac.createGain(); dry.connect(master);
    verb = ac.createConvolver(); const vg = ac.createGain(); vg.gain.value = .16; verb.connect(vg).connect(master);
    const n = Math.round(ac.sampleRate * .9), b = ac.createBuffer(2, n, ac.sampleRate);   // a wooden hall
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3.2); }
    verb.buffer = b;
    noise = ac.createBuffer(1, ac.sampleRate * 3, ac.sampleRate);
    const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return ac;
  }
  function place(p, az, dist, tc = .08) {
    const x = Math.sin(az) * dist, z = -Math.cos(az) * dist, t = ac.currentTime;
    if (p.positionX) { p.positionX.setTargetAtTime(x, t, tc); p.positionY.setTargetAtTime(0, t, .01); p.positionZ.setTargetAtTime(z, t, tc); } else p.setPosition(x, 0, z);
  }
  function panner(az, dist) { const p = new PannerNode(ac, { panningModel: 'HRTF', distanceModel: 'inverse', refDistance: .5, rolloffFactor: .8 }); place(p, az, dist, .001); return p; }
  function chain(az, dist, send = .3) { const g = ac.createGain(), p = panner(az, dist), s = ac.createGain(); s.gain.value = send; g.connect(p); p.connect(dry); p.connect(s); s.connect(verb); return { g, p, s }; }
  function noiseSrc() { const s = ac.createBufferSource(); s.buffer = noise; s.loop = true; s.start(0, rnd(0, 2.5)); return s; }
  function shot(az, dist, send, build, len) { if (!ac) return; const { g, p } = chain(az, dist, send); build(g, ac.currentTime); setTimeout(() => { g.disconnect(); p.disconnect(); }, (len + 1.5) * 1000); }
  function burst(out, dur, amp, f, type = 'bandpass', q = .8, at = 0) {
    const s = ac.createBufferSource(); s.buffer = noise; const fl = new BiquadFilterNode(ac, { type, frequency: f, Q: q }), g = ac.createGain(), t = ac.currentTime + at;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + Math.min(.01, dur / 3)); g.gain.exponentialRampToValueAtTime(.001, t + dur + .01);
    s.connect(fl).connect(g).connect(out); s.start(t, rnd(0, 2.5), dur + .03);
  }
  function tone(out, f, dur, amp, at = 0, type = 'sine', f2) {
    const o = new OscillatorNode(ac, { frequency: f, type }), g = ac.createGain(), t = ac.currentTime + at;
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + .006); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    o.connect(g).connect(out); o.start(t); o.stop(t + dur + .02);
  }

  // ---------------------------------------------------------------- characters
  const CH = {};   // id → { c: chain, an, buf, lv, src, az, dist }
  function char(id) {
    if (CH[id] || !ac) return CH[id];
    const c = chain(0, 1.3, .18), an = ac.createAnalyser(); an.fftSize = 512; c.g.connect(an);
    return (CH[id] = { c, an, buf: new Float32Array(512), lv: 0, src: null, az: 0, dist: 1.3 });
  }
  // move a character; tc = time constant (s) of the glide — the voice moves with him while he walks and talks
  function move(id, az, dist, tc = .5) {
    const h = char(id); if (!h) return; h.az = az; h.dist = dist; place(h.c.p, az, dist, tc);
    h.c.s.gain.setTargetAtTime(dist < .3 ? .03 : dist > 2.5 ? .45 : .18, ac.currentTime, tc);   // more room at a distance, dry at the ear
  }
  async function decode(arrayBuf) { return ac.decodeAudioData(arrayBuf); }
  function play(id, buf, gain = 1.5) {   // → Promise (resolves at the end, or when stopped)
    return new Promise((res) => {
      const h = char(id); if (!h || !buf) return res();
      const s = ac.createBufferSource(); s.buffer = buf; const g = ac.createGain(); g.gain.value = gain;
      s.connect(g).connect(h.c.g); h.src = s;
      let done = false; const end = () => { if (done) return; done = true; clearTimeout(tm); if (h.src === s) h.src = null; g.disconnect(); res(); };
      const tm = setTimeout(end, (buf.duration + 1.5) * 1000);   // never hang (e.g. audio context suspended)
      if (ac.state === 'suspended') ac.resume();
      s.onended = end; s.start();
    });
  }
  function stopVoices() { for (const h of Object.values(CH)) if (h.src) try { h.src.stop(); } catch {} }
  addEventListener('pointerdown', () => { if (ac && ac.state === 'suspended') ac.resume(); });
  function level(id) {
    const h = CH[id]; if (!h) return 0;
    h.an.getFloatTimeDomainData(h.buf); let s = 0; for (let i = 0; i < h.buf.length; i++) s += h.buf[i] * h.buf[i];
    const v = Math.sqrt(s / h.buf.length); h.lv += (v - h.lv) * .35; return h.lv;
  }

  // ---------------------------------------------------------------- room sounds (one set per scene)
  let amb = [];
  function ambience(spec) {
    stopAmbience(); if (!ac) return;
    const add = (az, dist, send, build) => { const c = chain(az, dist, send); c.g.gain.value = 0; c.g.gain.setTargetAtTime(1, ac.currentTime, 1.2); const stop = build(c.g); amb.push({ c, stop }); };
    const iv = (fn, ms) => { const h = setInterval(fn, ms); return () => clearInterval(h); };
    for (const [k, v] of Object.entries(spec || {})) {
      if (k === 'wind') add(.6, 4, .2, (o) => {   // slow swelling wind, a band of noise whose level breathes
        const s = noiseSrc(), f = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 420, Q: .5 }), g = ac.createGain(); g.gain.value = .25 * v;
        const lfo = new OscillatorNode(ac, { frequency: .09 }), lg = ac.createGain(); lg.gain.value = .2 * v; lfo.connect(lg).connect(g.gain); lfo.start();
        s.connect(f).connect(g).connect(o); return () => { s.stop(); lfo.stop(); };
      });
      if (k === 'birds') add(-.9, 8, .5, (o) => iv(() => { if (Math.random() < .5) { const f = rnd(2600, 4200); for (let i = 0; i < 3; i++) tone(o, f, .09, .05 * v, i * .13, 'sine', f * 1.25); } }, 2300));
      if (k === 'crickets') add(-1.3, 6, .4, (o) => iv(() => { for (let i = 0; i < 4; i++) tone(o, 4300, .03, .04 * v, i * .06); }, 900));
      if (k === 'fire') add(0, 1.6, .15, (o) => {   // hearth: a low rumble + crackles
        const s = noiseSrc(), f = new BiquadFilterNode(ac, { type: 'lowpass', frequency: 260 }), g = ac.createGain(); g.gain.value = .35 * v; s.connect(f).connect(g).connect(o);
        const stop = iv(() => { const n = Math.random() < .3 ? 3 : 1; for (let i = 0; i < n; i++) burst(o, .012, rnd(.15, .5) * v, rnd(1800, 4200), 'bandpass', 1.5, i * rnd(.03, .09)); }, 260);
        return () => { s.stop(); stop(); };
      });
      if (k === 'kettle') add(-.15, 1.4, .15, (o) => { const s = noiseSrc(), f = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 5200, Q: 2 }), g = ac.createGain(); g.gain.value = .05 * v; s.connect(f).connect(g).connect(o); return () => s.stop(); });
      if (k === 'chatter') add(2.4, 5, .6, (o) => {   // a busy little izakaya behind you: murmur, a laugh, a cup
        const s = noiseSrc(), f = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 520, Q: .9 }), g = ac.createGain(); g.gain.value = .3 * v; s.connect(f).connect(g).connect(o);
        const lfo = new OscillatorNode(ac, { frequency: 3.1 }), lg = ac.createGain(); lg.gain.value = .12 * v; lfo.connect(lg).connect(g.gain); lfo.start();
        const stop = iv(() => { if (Math.random() < .35) tone(o, rnd(2400, 3400), .3, .04 * v, 0, 'triangle'); }, 1700);
        return () => { s.stop(); lfo.stop(); stop(); };
      });
    }
  }
  function stopAmbience() { for (const a of amb) { a.c.g.gain.setTargetAtTime(0, ac.currentTime, .5); setTimeout(() => { try { a.stop(); } catch {} a.c.g.disconnect(); a.c.p.disconnect(); }, 2000); } amb = []; }

  const fx = {
    steps: (az, dist, n = 3) => shot(az, dist, .25, (o) => { for (let i = 0; i < n; i++) { burst(o, .07, .35, 700, 'lowpass', .7, i * .42); burst(o, .05, .12, 2400, 'bandpass', 1, i * .42 + .02); } }, n * .45),   // tatami / socks
    rustle: (az, dist) => shot(az, dist, .1, (o, t) => { const s = noiseSrc(), f = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 2400, Q: .6 }), g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.35, t + .12); g.gain.linearRampToValueAtTime(0, t + .7); s.connect(f).connect(g).connect(o); s.stop(t + .8); }, .9),   // silk robes
    gust: (az) => shot(az, 1.5, .3, (o, t) => { const s = noiseSrc(), f = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 600, Q: .4 }), g = ac.createGain(); f.frequency.setValueAtTime(300, t); f.frequency.linearRampToValueAtTime(1100, t + 1.6); f.frequency.linearRampToValueAtTime(400, t + 3.5); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.9, t + 1.2); g.gain.linearRampToValueAtTime(0, t + 3.8); s.connect(f).connect(g).connect(o); s.stop(t + 4); }, 4),
    fire: (az) => shot(az, 1.3, .15, (o) => { burst(o, .5, .4, 300, 'lowpass', .7); for (let i = 0; i < 12; i++) burst(o, .012, rnd(.2, .6), rnd(1800, 4500), 'bandpass', 1.5, rnd(0, 1.6)); }, 2),
    chime: () => shot(0, 2, .6, (o) => [523.3, 659.3, 784, 1046.5].forEach((f, i) => tone(o, f, 1.1, .06, i * .12)), 2),
    tick: () => shot(0, 1, .2, (o) => tone(o, 1320, .1, .05), .3),
  };
  function setMuted(v) { muted = v; if (master) master.gain.setTargetAtTime(v ? 0 : .95, ac.currentTime, .05); }
  function lrCheck() { init(); shot(-Math.PI / 2, 1, .1, (o) => tone(o, 880, .4, .2), .5); setTimeout(() => shot(Math.PI / 2, 1, .1, (o) => tone(o, 1175, .4, .2), .5), 900); }
  return { init, char, move, decode, play, stopVoices, level, ambience, stopAmbience, fx, setMuted, isMuted: () => muted, lrCheck, ctx: () => ac };
})();
