// Gaku's campfire stream — Web Audio (copied from Demo 14's audio.js, plus campfire / lake wind / snow / log / foil).
// His binaural mic is YOUR head: his voice and every sound are placed with HRTF around you (az: rad, 0 = front, − = left, + = right).
// Triggers are synthesized; the voice is ElevenLabs clips (media/voice).
window.StreamAudio = (() => {
  let ac = null, master = null, dry = null, verb = null, ui = null, noise = null, muted = false;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const voices = {};
  let level = 0, an = null, abuf = null;

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return ac; }
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain(); master.gain.value = muted ? 0 : .95;
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3;
    master.connect(comp).connect(ac.destination);
    dry = ac.createGain(); dry.connect(master);
    ui = ac.createGain(); ui.gain.value = .5; ui.connect(master);
    verb = ac.createConvolver(); const vg = ac.createGain(); vg.gain.value = .1; verb.connect(vg).connect(master);
    const n = Math.round(ac.sampleRate * .4), b = ac.createBuffer(2, n, ac.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 5); }
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
  function chain(az, dist, send = .2) { const g = ac.createGain(), p = panner(az, dist), s = ac.createGain(); s.gain.value = send; g.connect(p); p.connect(dry); p.connect(s); s.connect(verb); return { g, p }; }
  function noiseSrc() { const s = ac.createBufferSource(); s.buffer = noise; s.loop = true; s.start(0, rnd(0, 2.5)); return s; }
  function shot(az, dist, send, build, len) { if (!ac) return; const { g, p } = chain(az, dist, send); build(g, ac.currentTime); setTimeout(() => { g.disconnect(); p.disconnect(); }, (len + 1.5) * 1000); }
  function burst(out, dur, amp, f, type = 'bandpass', q = .8, at = 0) {
    const s = ac.createBufferSource(); s.buffer = noise; const fl = new BiquadFilterNode(ac, { type, frequency: f, Q: q }), g = ac.createGain(), t = ac.currentTime + at;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + Math.min(.008, dur / 3)); g.gain.exponentialRampToValueAtTime(.001, t + dur + .01);
    s.connect(fl).connect(g).connect(out); s.start(t, rnd(0, 2.5), dur + .03);
  }
  function swell(out, dur, amp, f, q = .7, type = 'bandpass', at = 0, up = .3) {   // soft breath-like noise envelope
    const s = ac.createBufferSource(); s.buffer = noise; const fl = new BiquadFilterNode(ac, { type, frequency: f, Q: q }), g = ac.createGain(), t = ac.currentTime + at;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + dur * up); g.gain.linearRampToValueAtTime(0, t + dur);
    s.connect(fl).connect(g).connect(out); s.start(t, rnd(0, 2), dur + .05); return fl;
  }
  function tone(out, f, dur, amp, at = 0, type = 'sine', f1 = f) {
    const o = new OscillatorNode(ac, { frequency: f, type }), g = ac.createGain(), t = ac.currentTime + at;
    o.frequency.setValueAtTime(f, t); if (f1 !== f) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + .004); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    o.connect(g).connect(out); o.start(t); o.stop(t + dur + .02);
  }

  // ---------------------------------------------------------------- voices
  function loadVoices(ids) {
    if (!ac) return;
    for (const id of ids) if (!voices[id]) voices[id] = fetch(`media/voice/${id}.m4a`).then((r) => r.arrayBuffer()).then((b) => ac.decodeAudioData(b)).then((buf) => (voices[id] = buf)).catch(() => (voices[id] = null));
  }
  let cur = null;   // the line now playing (its panner follows her when she moves)
  function say(id, at = { az: 0, dist: 1 }, gain = 1.4) {
    return new Promise(async (res) => {
      if (voices[id] instanceof Promise) await voices[id];
      const buf = voices[id]; if (!ac || !buf) return res();
      const s = ac.createBufferSource(); s.buffer = buf; const g = ac.createGain(); g.gain.value = gain;
      const c = chain(at.az, at.dist, at.dist < .3 ? .03 : .15);
      s.connect(g); g.connect(an); g.connect(c.g); cur = c;
      s.onended = () => { if (cur === c) cur = null; setTimeout(() => { c.g.disconnect(); c.p.disconnect(); }, 600); res(); };
      s.start();
    });
  }
  function moveVoice(az, dist) { if (cur) place(cur.p, az, dist, .25); }
  function stopVoices() { cur = null; }
  function voiceLevel() {
    if (!an) return 0;
    an.getFloatTimeDomainData(abuf); let s = 0; for (let i = 0; i < abuf.length; i++) s += abuf[i] * abuf[i];
    const v = Math.sqrt(s / abuf.length); level += (v - level) * .35; return level;
  }

  // ---------------------------------------------------------------- loops (room tone, rain on the window, heater, brushing)
  const loops = {};
  function loop(kind, az = 0, dist = 2) {
    if (!ac || loops[kind]) return loops[kind];
    const { g, p } = chain(az, dist, .15); g.gain.value = 0; const nodes = [], Lh = { crack: 1 }, L0 = Lh;
    const add = (n) => { nodes.push(n); return n; };
    if (kind === 'room') { const lp = new BiquadFilterNode(ac, { type: 'lowpass', frequency: 180 }); add(noiseSrc()).connect(lp).connect(g); }
    if (kind === 'rain') {
      const bp = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 3200, Q: .4 }), lp = new BiquadFilterNode(ac, { type: 'lowpass', frequency: 900 }), g2 = ac.createGain(); g2.gain.value = .6;
      add(noiseSrc()).connect(bp).connect(g); add(noiseSrc()).connect(lp).connect(g2).connect(g);
      const iv = setInterval(() => { if (ac && Math.random() < .7) burst(g, .02, rnd(.2, .6), rnd(2500, 6000), 'bandpass', 2); }, 70); nodes.push({ stop: () => clearInterval(iv), disconnect() {} });
    }
    if (kind === 'heater') {
      const o = add(new OscillatorNode(ac, { frequency: 100, type: 'triangle' })), og = ac.createGain(); og.gain.value = .05; o.connect(og).connect(g); o.start();
      const lp = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 500, Q: .4 }); add(noiseSrc()).connect(lp).connect(g);
    }
    if (kind === 'fan') {   // a small desk fan: motor hum + airy blade noise
      const o = add(new OscillatorNode(ac, { frequency: 118, type: 'sawtooth' })), lp0 = new BiquadFilterNode(ac, { type: 'lowpass', frequency: 300 }), og = ac.createGain(); og.gain.value = .05; o.connect(lp0).connect(og).connect(g); o.start();
      const bp = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 1100, Q: .5 }), am = ac.createGain(); add(noiseSrc()).connect(bp).connect(am).connect(g);
      const lfo = add(new OscillatorNode(ac, { frequency: 22 })), lg = ac.createGain(); lg.gain.value = .25; am.gain.value = .75; lfo.connect(lg).connect(am.gain); lfo.start();
    }
    if (kind === 'wind') {  // night wind through the open window
      const bp = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 500, Q: .7 }); add(noiseSrc()).connect(bp).connect(g);
      const lfo = add(new OscillatorNode(ac, { frequency: .17 })), lg = ac.createGain(); lg.gain.value = 260; lfo.connect(lg).connect(bp.frequency); lfo.start();
    }
    if (kind === 'musicbox') {   // a small original lullaby on a music box (comb + tines), looping
      const mel = [76, 79, 81, 79, 76, 74, 72, 74, 76, 79, 76, 72, 74, 72, 69, 72];
      let i = 0; const iv = setInterval(() => { if (!ac) return; const f = 440 * Math.pow(2, (mel[i % mel.length] - 69) / 12); tone(g, f, 1.6, .12); tone(g, f * 3.01, .5, .02); if (i % 4 === 0) tone(g, f / 2, 1.8, .05); i++; }, 520);
      nodes.push({ stop: () => clearInterval(iv), disconnect() {} });
    }
    if (kind === 'fire') {   // campfire: low roar + random crackles and pops
      const lp = new BiquadFilterNode(ac, { type: 'lowpass', frequency: 260 }), rg = ac.createGain(); rg.gain.value = .5; add(noiseSrc()).connect(lp).connect(rg).connect(g);
      const bp = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 1200, Q: .5 }), hg = ac.createGain(); hg.gain.value = .12; add(noiseSrc()).connect(bp).connect(hg).connect(g);
      const iv = setInterval(() => { if (!ac) return; if (Math.random() < .55) burst(g, rnd(.004, .02), rnd(.3, 1) * L0.crack, rnd(1500, 5000), 'bandpass', rnd(1, 4)); if (Math.random() < .05) { burst(g, .03, .9 * L0.crack, rnd(600, 1400), 'bandpass', 2); burst(g, .01, .6 * L0.crack, 4500, 'highpass', 1, .03); } }, 60);
      nodes.push({ stop: () => clearInterval(iv), disconnect() {} });
    }
    if (kind === 'lake') {   // cold wind off the lake, gusting (0.17 Hz, the same phase the thermal uses: gust(t))
      const bp = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 420, Q: .6 }), am = ac.createGain(); add(noiseSrc()).connect(bp).connect(am).connect(g);
      const hp = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 1800, Q: 1.2 }), hg = ac.createGain(); hg.gain.value = .25; add(noiseSrc()).connect(hp).connect(hg).connect(am);
      const lfo = add(new OscillatorNode(ac, { frequency: .17 })), lg = ac.createGain(), fg = ac.createGain(); lg.gain.value = .35; fg.gain.value = 220; am.gain.value = .65;
      lfo.connect(lg).connect(am.gain); lfo.connect(fg).connect(bp.frequency); lfo.start();
    }
    if (kind === 'heart') { const iv = setInterval(() => { if (!ac) return; tone(g, 54, .14, .9); tone(g, 49, .16, .6, .26); }, 950); nodes.push({ stop: () => clearInterval(iv), disconnect() {} }); }
    const L = Object.assign(Lh, { g, p, set: (v, a = az, d = dist) => { g.gain.setTargetAtTime(v, ac.currentTime, .3); place(p, a, d); }, stop: () => { g.gain.setTargetAtTime(0, ac.currentTime, .4); setTimeout(() => { for (const n of nodes) try { n.stop(); n.disconnect(); } catch {} g.disconnect(); }, 1800); delete loops[kind]; } });
    loops[kind] = L; return L;
  }
  function stopLoops() { for (const k of Object.keys(loops)) loops[k].stop(); }

  // ---------------------------------------------------------------- ASMR triggers + stream UI sounds
  const fx = {
    // a long, close breath on one ear (Mint's "fuuu"): airy noise right at the ear, low rumble of air on the mic
    blow: (az, dur = 1.8) => shot(az, .06, .01, (o) => { swell(o, dur, .5, 1400, .35, 'bandpass', 0, .25); swell(o, dur, .45, 260, .5, 'lowpass', 0, .2); }, dur),
    puff: (az) => shot(az, .12, .02, (o) => { swell(o, .45, .45, 1100, .4, 'bandpass', 0, .2); swell(o, .45, .35, 220, .6, 'lowpass', 0, .15); }, .6),
    // ice in a glass at the ear: clinks (inharmonic glass partials) and a little swirl
    clink: (az, dist = .15) => shot(az, dist, .08, (o) => { const f = rnd(2300, 3400); for (const [k, a] of [[1, .14], [2.32, .07], [4.1, .04]]) tone(o, f * k, rnd(.25, .5), a); burst(o, .015, .3, 5000, 'highpass'); }, .7),
    swirl: (az) => { for (let i = 0; i < 5; i++) setTimeout(() => fx.clink(az + rnd(-.1, .1), .14), i * rnd(140, 260)); shot(az, .15, .05, (o) => swell(o, 1.2, .08, 3000, 1.5), 1.3); },
    // cloth: towel / blanket wrapping
    cloth: (az, dist = .12, dur = 1) => shot(az, dist, .05, (o) => { const f = swell(o, dur, .35, 2600, .5, 'bandpass', 0, .4); const t = ac.currentTime; f.frequency.setValueAtTime(1800, t); f.frequency.linearRampToValueAtTime(3600, t + dur); }, dur),
    steam: (az = 0) => shot(az, .4, .1, (o) => swell(o, 1.6, .05, 6000, .5, 'highpass'), 1.7),
    // café: pouring, stirring, sipping, a marshmallow plop
    pour: (az = .15) => shot(az, .5, .2, (o, t) => {
      const s = noiseSrc(), f = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 900, Q: 2.5 }), g = ac.createGain();
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.45, t + .2); g.gain.setValueAtTime(.45, t + 2.2); g.gain.linearRampToValueAtTime(0, t + 2.6);
      f.frequency.setValueAtTime(600, t); f.frequency.linearRampToValueAtTime(1500, t + 2.4);
      const lfo = new OscillatorNode(ac, { frequency: 11 }), lg = ac.createGain(); lg.gain.value = 260; lfo.connect(lg).connect(f.frequency); lfo.start(t); lfo.stop(t + 2.7);
      s.connect(f).connect(g).connect(o); s.stop(t + 2.7);
    }, 2.8),
    stir: (az = .1) => { for (let i = 0; i < 7; i++) setTimeout(() => shot(az + Math.sin(i) * .15, .4, .1, (o) => { tone(o, rnd(3900, 4300), .18, .07); tone(o, rnd(6100, 6600), .1, .025); }, .3), i * 230); },
    sip: (az = 0) => shot(az, .3, .05, (o) => { swell(o, .5, .25, 1800, 2, 'bandpass', 0, .7); burst(o, .03, .25, 700, 'bandpass', 3, .55); }, .8),
    plop: (az = 0) => shot(az, .35, .1, (o) => { tone(o, 520, .12, .3, 0, 'sine', 170); burst(o, .04, .2, 1200, 'bandpass', 2, .02); }, .3),
    taps: (az, n = 3) => { for (let i = 0; i < n; i++) setTimeout(() => shot(az, .08, .02, (o) => burst(o, .03, .35, 600, 'lowpass', .7), .2), i * 180); },
    // Hinata: noodle slurp, a gulp of milk, a paper fan
    slurp: (az = 0) => shot(az, .3, .05, (o, t) => { const f = swell(o, 1.1, .35, 1500, 1.2, 'bandpass', 0, .5); f.frequency.setValueAtTime(900, t); f.frequency.linearRampToValueAtTime(2600, t + 1); for (let i = 0; i < 6; i++) burst(o, .03, .18, rnd(700, 1600), 'bandpass', 3, .1 + i * .14); }, 1.2),
    gulp: (az = 0) => { for (let i = 0; i < 3; i++) setTimeout(() => shot(az, .3, .05, (o) => { tone(o, 210, .12, .25, 0, 'sine', 120); burst(o, .05, .12, 500, 'lowpass', .7); }, .3), i * 420); },
    flap: (az) => shot(az, .25, .03, (o) => { swell(o, .35, .5, 700, .5, 'bandpass', 0, .35); burst(o, .02, .15, 2500, 'bandpass', 2, .1); }, .5),
    // Luna: window sliding, a cup on a saucer
    slide: (az = -1.3, open = true) => shot(az, 1.4, .3, (o, t) => { const f = swell(o, .8, .35, open ? 500 : 650, 3, 'bandpass', 0, .5); f.frequency.linearRampToValueAtTime(open ? 750 : 450, t + .8); burst(o, .04, .5, 900, 'bandpass', 2, .82); }, 1),
    saucer: (az = .1) => shot(az, .4, .1, (o) => { tone(o, 2900, .3, .08); tone(o, 4700, .2, .03); burst(o, .02, .25, 3000, 'bandpass', 2); }, .5),
    // camp: a log onto the fire, footsteps in the snow, foil, a kettle pour
    log: (az = .8) => shot(az, .9, .2, (o) => { tone(o, 90, .25, .6, 0, 'sine', 55); burst(o, .12, .5, 400, 'lowpass', .7); for (let i = 0; i < 9; i++) burst(o, rnd(.005, .02), rnd(.3, .8), rnd(1500, 5000), 'bandpass', 2, .1 + Math.random() * .9); }, 1.2),
    steps: (az0, az1, n = 4, dist = .8) => { for (let i = 0; i < n; i++) setTimeout(() => shot(az0 + (az1 - az0) * i / Math.max(1, n - 1), dist, .1, (o) => { burst(o, .14, .35, 1100, 'bandpass', .6); burst(o, .06, .25, 3500, 'highpass', .7, .03); }, .4), i * 420); },
    foil: (az = .3) => { for (let i = 0; i < 14; i++) setTimeout(() => shot(az + rnd(-.1, .1), .3, .05, (o) => burst(o, rnd(.01, .04), rnd(.15, .4), rnd(3000, 8000), 'highpass', 1), .2), i * rnd(40, 90)); },
    // stream UI (not spatial)
    pop: () => ac && tone(ui, 1320, .08, .06, 0, 'sine', 1760),
    you: () => ac && (tone(ui, 990, .1, .09), tone(ui, 1480, .14, .08, .07)),
    superchat: () => ac && [784, 988, 1175, 1568].forEach((f, i) => { tone(ui, f, .5, .07, i * .08, 'triangle'); tone(ui, f * 2, .3, .02, i * .08); }),
    heart: () => ac && tone(ui, 1760, .07, .03, 0, 'sine', 2200),
    end: () => ac && [880, 698, 523].forEach((f, i) => tone(ui, f, .6, .06, i * .18, 'triangle')),
  };
  function setMuted(v) { muted = v; if (master) master.gain.setTargetAtTime(v ? 0 : .95, ac.currentTime, .05); }
  function lrCheck() { init(); shot(-Math.PI / 2, 1, .1, (o) => tone(o, 880, .4, .2), .5); setTimeout(() => shot(Math.PI / 2, 1, .1, (o) => tone(o, 1175, .4, .2), .5), 900); }
  return { init, loadVoices, say, moveVoice, stopVoices, voiceLevel, loop, stopLoops, fx, setMuted, isMuted: () => muted, lrCheck, ctx: () => ac };
})();
