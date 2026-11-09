// Demo 10 — every sound is synthesized live (Web Audio) and placed with the browser's HRTF panner, so its direction is the
// same direction the thermal engine uses. az: radians, 0 = straight ahead, + = right. dist: metres.
window.CaveAudio = (() => {
  let ac = null, master = null, dry = null, verb = null, verbGain = null, noise = null, muted = false;
  const loops = [];
  const rnd = (a, b) => a + Math.random() * (b - a);

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return ac; }
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain(); master.gain.value = muted ? 0 : .9;
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3;
    master.connect(comp).connect(ac.destination);
    dry = ac.createGain(); dry.connect(master);
    verb = ac.createConvolver(); verbGain = ac.createGain(); verbGain.gain.value = .35; verb.connect(verbGain).connect(master);
    noise = ac.createBuffer(1, ac.sampleRate * 3, ac.sampleRate);
    const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    setRoom('hut');
    return ac;
  }
  function setRoom(kind) {
    if (!ac) return;
    const [len, decay, wet] = { hut: [.7, 3.5, .18], out: [1.6, 2.5, .22], cave: [3.6, 1.6, .5] }[kind] || [1, 3, .2];
    const n = Math.round(ac.sampleRate * len), b = ac.createBuffer(2, n, ac.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay); }
    verb.buffer = b; verbGain.gain.setTargetAtTime(wet, ac.currentTime, .3);
  }
  function panner(az = 0, dist = 1.5) {
    const p = new PannerNode(ac, { panningModel: 'HRTF', distanceModel: 'inverse', refDistance: 1, rolloffFactor: .6 });
    place(p, az, dist, 0); return p;
  }
  function place(p, az, dist, tc = .06) {
    const x = Math.sin(az) * dist, z = -Math.cos(az) * dist, t = ac.currentTime;
    if (p.positionX) { p.positionX.setTargetAtTime(x, t, tc || .001); p.positionY.setTargetAtTime(0, t, .001); p.positionZ.setTargetAtTime(z, t, tc || .001); }
    else p.setPosition(x, 0, z);
  }
  // output chain for one source: gain → panner → dry + reverb send
  function chain(az, dist, send = .5) {
    const g = ac.createGain(), p = panner(az, dist), s = ac.createGain(); s.gain.value = send;
    g.connect(p); p.connect(dry); p.connect(s); s.connect(verb);
    return { g, p };
  }
  function noiseSrc() { const s = ac.createBufferSource(); s.buffer = noise; s.loop = true; s.start(0, rnd(0, 2.5)); return s; }

  // ---------------------------------------------------------------- loops: set(level 0..1, az, dist) each frame
  function loop(kind) {
    if (!ac) return { set() {}, stop() {} };
    const { g, p } = chain(0, 2, kind === 'wind' ? .3 : .55);
    g.gain.value = 0;
    const L = { kind, g, p, level: 0, az: 0, dist: 2, nodes: [], t: 0, next: 0 };
    const add = (n) => { L.nodes.push(n); return n; };
    if (kind === 'wind') {
      const bp = add(new BiquadFilterNode(ac, { type: 'bandpass', frequency: 600, Q: 1.1 })), lp = new BiquadFilterNode(ac, { type: 'lowpass', frequency: 2200 });
      add(noiseSrc()).connect(bp).connect(lp).connect(g); L.bp = bp;
    } else if (kind === 'fire') {               // low roar; crackles are scheduled in tick()
      const lp = new BiquadFilterNode(ac, { type: 'lowpass', frequency: 320 }), rg = ac.createGain(); rg.gain.value = .55;
      add(noiseSrc()).connect(lp).connect(rg).connect(g);
      L.crack = ac.createGain(); L.crack.connect(g);
    } else if (kind === 'candle') {
      const lp = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 260, Q: .8 }), rg = ac.createGain(); rg.gain.value = .25;
      add(noiseSrc()).connect(lp).connect(rg).connect(g);
      L.crack = ac.createGain(); L.crack.gain.value = .5; L.crack.connect(g);
    } else if (kind === 'fox') {                // foxfire: a cold glassy shimmer instead of a crackle
      const trem = ac.createGain(); trem.gain.value = .5; trem.connect(g);
      const lfo = add(new OscillatorNode(ac, { frequency: 5.2 })), lg = ac.createGain(); lg.gain.value = .45; lfo.connect(lg).connect(trem.gain); lfo.start();
      for (const [f, a] of [[1318.5, .16], [1975.5, .1], [2637, .06], [1320.8, .12]]) {
        const o = add(new OscillatorNode(ac, { frequency: f })), og = ac.createGain(); og.gain.value = a; o.connect(og).connect(trem); o.start();
      }
      const hp = new BiquadFilterNode(ac, { type: 'highpass', frequency: 5000 }), ng = ac.createGain(); ng.gain.value = .05;
      add(noiseSrc()).connect(hp).connect(ng).connect(g);
    } else if (kind === 'stream') {
      const bp = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 1100, Q: .6 }), ng = ac.createGain(); ng.gain.value = .5;
      add(noiseSrc()).connect(bp).connect(ng).connect(g);
      L.crack = ac.createGain(); L.crack.gain.value = .5; L.crack.connect(g);      // bubbles
    } else if (kind === 'waterfall') {
      const lp = new BiquadFilterNode(ac, { type: 'lowpass', frequency: 1600 }), hp = new BiquadFilterNode(ac, { type: 'highpass', frequency: 90 });
      add(noiseSrc()).connect(hp).connect(lp).connect(g);
    } else if (kind === 'drone') {
      const lp = new BiquadFilterNode(ac, { type: 'lowpass', frequency: 420 }); lp.connect(g);
      for (const [f, a] of [[55, .4], [82.4, .25], [110.3, .12], [164.8, .06]]) { const o = add(new OscillatorNode(ac, { type: 'triangle', frequency: f })), og = ac.createGain(); og.gain.value = a; o.connect(og).connect(lp); o.start(); }
    }
    L.set = (level, az = L.az, dist = L.dist) => {
      L.level = level;
      if (Math.abs(az - L.az) > .002 || Math.abs(dist - L.dist) > .01) { L.az = az; L.dist = dist; place(p, az, dist); }
      g.gain.setTargetAtTime(level, ac.currentTime, .08);
    };
    L.stop = () => { g.gain.setTargetAtTime(0, ac.currentTime, .15); setTimeout(() => { for (const n of L.nodes) try { n.stop?.(); n.disconnect(); } catch {} g.disconnect(); }, 900); loops.splice(loops.indexOf(L), 1); };
    loops.push(L);
    return L;
  }
  // per frame: gusts and crackles
  function tick(dt) {
    if (!ac) return;
    const t = ac.currentTime;
    for (const L of loops) {
      L.t += dt;
      if (L.kind === 'wind' && L.bp) L.bp.frequency.setTargetAtTime(450 + 380 * (.5 + .5 * Math.sin(L.t * .9) * Math.sin(L.t * .37)), t, .2);
      if (!L.crack || L.level < .01) continue;
      const rate = L.kind === 'fire' ? 9 : L.kind === 'candle' ? 2.2 : 7;
      if (Math.random() < dt * rate) {
        if (L.kind === 'stream') blip(L.crack, rnd(500, 1300), rnd(.03, .07), rnd(.05, .14));
        else burst(L.crack, rnd(.004, L.kind === 'fire' ? .03 : .012), rnd(.15, L.kind === 'fire' ? .9 : .5), rnd(1500, 5000));
      }
    }
  }
  function burst(out, dur, amp, hpf) {
    const s = ac.createBufferSource(); s.buffer = noise; const f = new BiquadFilterNode(ac, { type: 'highpass', frequency: hpf }), g = ac.createGain(), t = ac.currentTime;
    g.gain.setValueAtTime(amp, t); g.gain.exponentialRampToValueAtTime(.001, t + dur + .01);
    s.connect(f).connect(g).connect(out); s.start(t, rnd(0, 2.5), dur + .03);
  }
  function blip(out, f0, dur, amp, f1 = f0 * 1.6) {
    const o = new OscillatorNode(ac, { frequency: f0 }), g = ac.createGain(), t = ac.currentTime;
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + .005); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    o.connect(g).connect(out); o.start(t); o.stop(t + dur + .02);
  }
  // one-shots at a direction; auto-disconnect
  function shot(az, dist, send, build, len) {
    if (!ac) return;
    const { g, p } = chain(az, dist, send); build(g, ac.currentTime);
    setTimeout(() => { g.disconnect(); p.disconnect(); }, (len + 1.5) * 1000);
  }
  const fx = {
    spark: (az) => shot(az, .9, .3, (o) => { for (let i = 0; i < 3; i++) setTimeout(() => burst(o, .02, .9, 3000 + i * 1500), i * 18); blip(o, 2400, .05, .2, 1800); }, .3),
    ignite: (az) => shot(az, 1, .4, (o, t) => {
      const s = noiseSrc(), f = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 300, Q: .7 }), g = ac.createGain();
      f.frequency.exponentialRampToValueAtTime(1400, t + .5); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.9, t + .15); g.gain.exponentialRampToValueAtTime(.001, t + 1.1);
      s.connect(f).connect(g).connect(o); s.stop(t + 1.2);
    }, 1.2),
    snuff: (az) => shot(az, .8, .3, (o, t) => {
      const s = noiseSrc(), f = new BiquadFilterNode(ac, { type: 'lowpass', frequency: 900 }), g = ac.createGain();
      g.gain.setValueAtTime(.6, t); g.gain.exponentialRampToValueAtTime(.001, t + .45); s.connect(f).connect(g).connect(o); s.stop(t + .5);
    }, .5),
    drip: (az, dist = 2.5) => shot(az, dist, .9, (o) => blip(o, rnd(1500, 2300), .07, .5, rnd(700, 1000)), .2),
    splash: (az) => shot(az, 1.4, .7, (o, t) => {
      const s = noiseSrc(), f = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 1800, Q: .9 }), g = ac.createGain();
      g.gain.setValueAtTime(.7, t); g.gain.exponentialRampToValueAtTime(.001, t + .6); s.connect(f).connect(g).connect(o); s.stop(t + .7);
      for (let i = 0; i < 5; i++) setTimeout(() => blip(o, rnd(700, 1600), .06, .25), 60 + i * rnd(40, 90));
    }, .8),
    rumble: () => shot(0, 3, .8, (o, t) => {
      const s = noiseSrc(), f = new BiquadFilterNode(ac, { type: 'lowpass', frequency: 140 }), g = ac.createGain(), sub = new OscillatorNode(ac, { frequency: 42 }), sg = ac.createGain();
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1.6, t + .4); g.gain.setValueAtTime(1.6, t + 2.2); g.gain.linearRampToValueAtTime(0, t + 3);
      sg.gain.setValueAtTime(0, t); sg.gain.linearRampToValueAtTime(.5, t + .4); sg.gain.linearRampToValueAtTime(0, t + 3);
      s.connect(f).connect(g).connect(o); sub.connect(sg).connect(o); sub.start(t); sub.stop(t + 3.1); s.stop(t + 3.1);
    }, 3.2),
    bats: (az) => shot(az, 2.5, .6, (o) => { for (let i = 0; i < 26; i++) setTimeout(() => burst(o, .03, .5, 900), i * rnd(30, 70)); for (let i = 0; i < 4; i++) setTimeout(() => blip(o, 7000, .03, .05, 9000), i * 140); }, 2),
    step: (az = 0) => shot(az, 1.2, .5, (o) => burst(o, .06, .5, 200), .3),
    drawer: (az) => shot(az, 1.4, .3, (o, t) => {
      const s = noiseSrc(), f = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 500, Q: 2 }), g = ac.createGain();
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.5, t + .05); g.gain.linearRampToValueAtTime(0, t + .35); s.connect(f).connect(g).connect(o); s.stop(t + .4);
      setTimeout(() => burst(o, .03, .6, 400), 330);
    }, .5),
    pick: (az = 0) => shot(az, 1, .4, (o) => { blip(o, 880, .12, .2, 880); setTimeout(() => blip(o, 1318, .2, .18, 1318), 90); }, .4),
    chime: () => shot(0, 1.5, .8, (o) => [523.3, 659.3, 784, 1046.5].forEach((f, i) => setTimeout(() => blip(o, f, .9, .18, f), i * 120)), 1.6),
    wrong: (az = 0) => shot(az, 1.5, .9, (o) => [1318.5, 1244.5, 1174.7, 1108.7].forEach((f, i) => setTimeout(() => blip(o, f, .5, .12, f * .98), i * 90)), 1),
    yip: (az) => shot(az, 1.3, .4, (o) => { blip(o, 1150, .09, .22, 1650); setTimeout(() => blip(o, 1500, .12, .18, 980), 110); }, .4),
    bloom: () => shot(0, 2.5, 1, (o) => [392, 523.3, 587.3, 784, 1046.5, 1174.7, 1568].forEach((f, i) => setTimeout(() => blip(o, f, 2.2, .1, f), i * 220)), 3.5),
  };
  // Kohaku's voice lines (media/voice/<id>.m4a): decoded up front, played dry-ish and close, at the fox's direction
  const voices = {};
  // voice language (shared/shell.js MoHeatVoice; tools/web/voice_lang.py): one cache entry per language, ja fallback, a switch preloads the lines used so far
  const VF = (id, base, q = '') => (window.MoHeatVoice ? MoHeatVoice.fetch(id, base, q) : fetch(`${base}${id}.m4a${q}`));
  const VIDS = new Set(), VK = (id) => (VIDS.add(id), window.MoHeatVoice ? MoHeatVoice.key(id) : id);
  addEventListener('moheat:voicelang', () => loadVoices([...VIDS]));
  function loadVoices(ids) {
    if (!ac) return;
    for (const id of ids) for (const k of [VK(id)]) if (!voices[k]) voices[k] = VF(id, 'media/voice/', '').then((r) => r.arrayBuffer()).then((b) => ac.decodeAudioData(b)).then((buf) => (voices[k] = buf)).catch(() => (voices[k] = null));
  }
  const voicePending = (id) => voices[VK(id)] instanceof Promise;
  function voice(id, az = 0) {   // → duration in s, or 0 when not loaded yet
    if (voices[VK(id)] === undefined) loadVoices([id]);   // not loaded in this voice language yet
    const buf = voices[VK(id)];
    if (!ac || !buf || buf instanceof Promise) return 0;
    shot(az, .9, .25, (o) => { const s = ac.createBufferSource(); s.buffer = buf; const g = ac.createGain(); g.gain.value = 1.6; s.connect(g).connect(o); s.start(); }, buf.duration);
    return buf.duration;
  }
  function setMuted(v) { muted = v; if (master) master.gain.setTargetAtTime(v ? 0 : .9, ac.currentTime, .05); }
  function lrCheck() {
    const c = init();
    [[-Math.PI / 2, 0], [Math.PI / 2, .9]].forEach(([az, at]) => setTimeout(() => shot(az, 1, .1, (o) => { blip(o, az < 0 ? 1318.5 : 1648, .45, .35, az < 0 ? 1318.5 : 1648); }, .6), at * 1000));
    return c;
  }
  return { init, setRoom, loop, tick, fx, loadVoices, voice, voicePending, setMuted, isMuted: () => muted, lrCheck, ctx: () => ac };
})();
