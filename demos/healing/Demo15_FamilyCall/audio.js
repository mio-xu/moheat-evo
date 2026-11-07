// Family call — Web Audio (Demo 12's CallAudio, copied and extended; Demo 12 itself is unchanged).
// Grandma and grandpa come through the PHONE: pressed against one ear, or on SPEAKER on the table in front of you (thinner, a little room).
// Their side of the line (wall clock, kettle, grandpa's running feet) goes through the same phone path. Your room is HRTF. az: rad, 0 = front, + = right.
window.CallAudio = (() => {
  let ac = null, master = null, dry = null, verb = null, noise = null, muted = false;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const voices = {};
  let level = 0, an = null, abuf = null;      // their voices level (for lip sync + thermal)

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
  function chain(az, dist, send = .3) { const g = ac.createGain(), p = panner(az, dist), s = ac.createGain(); s.gain.value = send; g.connect(p); p.connect(dry); p.connect(s); s.connect(verb); return { g, p, s }; }
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
    const { g, p, s: send } = chain(az, .1, .02);
    const hp = new BiquadFilterNode(ac, { type: 'highpass', frequency: 320, Q: .7 }), lp = new BiquadFilterNode(ac, { type: 'lowpass', frequency: 3600, Q: .7 }),
      pk = new BiquadFilterNode(ac, { type: 'peaking', frequency: 1800, Q: 1, gain: 4 }), sh = new WaveShaperNode(ac, { curve: soft(), oversample: '2x' });
    const inp = ac.createGain(); inp.connect(hp).connect(lp).connect(pk).connect(sh).connect(g);
    const hiss = noiseSrc(), hf = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 2500, Q: .5 }), hg = ac.createGain(); hg.gain.value = .006;
    hiss.connect(hf).connect(hg).connect(inp);
    g.gain.value = 0; g.gain.setTargetAtTime(1, ac.currentTime, .05);
    phone = { g, p, inp, hiss, az, hp, send, spk: false };
  }
  function soft() { const n = 1024, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; c[i] = Math.tanh(x * 1.6) / Math.tanh(1.6); } return c; }
  function phoneEar(az) { if (phone) { phone.az = az; phone.spk = false; place(phone.p, az, .1, .25); phone.hp.frequency.setTargetAtTime(320, ac.currentTime, .1); phone.g.gain.setTargetAtTime(1, ac.currentTime, .1); } }
  function phoneSpeaker() { if (!phone) return; phone.spk = true; place(phone.p, .05, .75, .3); phone.hp.frequency.setTargetAtTime(520, ac.currentTime, .1); phone.g.gain.setTargetAtTime(.85, ac.currentTime, .1); phone.send.gain.setTargetAtTime(.35, ac.currentTime, .1); }
  function phoneOff() { if (!phone) return; const P = phone; phone = null; P.g.gain.setTargetAtTime(0, ac.currentTime, .03); setTimeout(() => { try { P.hiss.stop(); } catch {} P.g.disconnect(); P.p.disconnect(); }, 600); }

  // ---------------------------------------------------------------- their voices
  function loadVoices(ids) {
    if (!ac) return;
    for (const id of ids) if (!voices[id]) voices[id] = fetch(`media/voice/${id}.m4a`).then((r) => r.arrayBuffer()).then((b) => ac.decodeAudioData(b)).then((buf) => (voices[id] = buf)).catch(() => (voices[id] = null));
  }
  const ready = (id) => voices[id] && !(voices[id] instanceof Promise);
  // where: 'phone' or { az, dist } for his real voice → Promise that resolves when the line ends
  function say(id, where = 'phone', gain = 1.4, far = false) {
    return new Promise(async (res) => {
      if (voices[id] instanceof Promise) await voices[id];
      const buf = voices[id]; if (!ac || !buf) return res();
      const s = ac.createBufferSource(); s.buffer = buf; const g = ac.createGain(); g.gain.value = gain;
      s.connect(g); g.connect(an);
      if (where === 'phone' && phone) {
        if (far) { const lp = new BiquadFilterNode(ac, { type: 'lowpass', frequency: 1500 }), d = new DelayNode(ac, { delayTime: .07 }), dg = ac.createGain(); dg.gain.value = .35; g.disconnect(); g.connect(an); g.connect(lp); lp.connect(phone.inp); lp.connect(d).connect(dg).connect(phone.inp); }
        else g.connect(phone.inp);
      }
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
    if (kind === 'home') {     // their side of the line: a slow pendulum clock, through the phone
      const iv = setInterval(() => { if (!ac) return; burst(g, .02, .5, 2600, 'bandpass', 4); burst(g, .02, .35, 2100, 'bandpass', 4, .5); }, 1000); nodes.push({ stop: () => clearInterval(iv), disconnect() {} });
      if (phone) { g.disconnect(); g.connect(phone.inp); }
    }
    if (kind === 'heater') {   // your room: a fan heater hum
      const lp = new BiquadFilterNode(ac, { type: 'lowpass', frequency: 500 }); add(noiseSrc()).connect(lp).connect(g);
    }
    if (kind === 'heart') {    // heartbeat while he holds you
      const iv = setInterval(() => { if (!ac) return; tone(g, 52, .14, .9); tone(g, 48, .16, .6, .26); }, 900); nodes.push({ stop: () => clearInterval(iv), disconnect() {} });
    }
    const L = { g, p, set: (v, a = az, d = dist) => { g.gain.setTargetAtTime(v, ac.currentTime, .15); place(p, a, d); }, stop: () => { g.gain.setTargetAtTime(0, ac.currentTime, .3); setTimeout(() => { for (const n of nodes) try { n.stop(); n.disconnect(); } catch {} g.disconnect(); }, 1500); delete loops[kind]; } };
    loops[kind] = L; return L;
  }
  let tickT = 0;
  function tick(dt) {     // clock on your wall (right)
    if (!ac) return;
    tickT += dt;
    if (tickT > 1) { tickT -= 1; shot(1.1, 2.6, .3, (o) => burst(o, .012, .04, 4000, 'highpass'), .1); }
  }
  const viaPhone = (build, len = 2) => { if (!ac || !phone) return; const s = ac.createGain(); s.gain.value = 1; s.connect(phone.inp); build(s, ac.currentTime); setTimeout(() => s.disconnect(), (len + .5) * 1000); };

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
    dial: (az = -1.45) => shot(az, .12, .02, (o) => [[697, 1336], [770, 1209], [852, 1477], [697, 1209], [941, 1336], [770, 1477], [852, 1209], [697, 1477], [941, 1336], [770, 1336]].forEach(([a, b], i) => { tone(o, a, .09, .05, i * .14); tone(o, b, .09, .05, i * .14); }), 1.6),
    ringback: () => viaPhone((o, t) => {    // Japanese ringback: 400 Hz with a 16 Hz flutter, 1 s on
      const osc = new OscillatorNode(ac, { frequency: 400 }), am = new OscillatorNode(ac, { frequency: 16 }), ag = ac.createGain(), g = ac.createGain(), env = ac.createGain();
      ag.gain.value = .4; g.gain.value = .6; am.connect(ag).connect(g.gain);
      env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(.22, t + .02); env.gain.setValueAtTime(.22, t + 1); env.gain.linearRampToValueAtTime(0, t + 1.03);
      osc.connect(g).connect(env).connect(o); osc.start(t); am.start(t); osc.stop(t + 1.1); am.stop(t + 1.1);
    }, 1.2),
    pickup: () => viaPhone((o) => { burst(o, .05, .8, 900, 'bandpass', 1.5); burst(o, .04, .6, 1500, 'bandpass', 2, .09); burst(o, .1, .3, 400, 'lowpass', 1, .16); }, .5),
    running: (n = 7) => { for (let i = 0; i < n; i++) setTimeout(() => viaPhone((o) => burst(o, .07, .5 + i * .07, 320, 'lowpass', .8), .2), i * 230); },
    fumble: () => viaPhone((o) => { burst(o, .06, .7, 700, 'bandpass', 1); burst(o, .2, .3, 2500, 'bandpass', .6, .08); burst(o, .05, .6, 1100, 'bandpass', 2, .35); }, .7),
    beep: () => viaPhone((o) => { tone(o, 1100, .08, .2); }, .3),
    thud: (az = -.8) => shot(az, 1.4, .4, (o) => { burst(o, .14, .9, 160, 'lowpass', .8); burst(o, .05, .3, 900, 'bandpass', 1, .02); }, .6),
    tape: (az = .1) => shot(az, .7, .2, (o, t) => { const s = noiseSrc(), f = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 3200, Q: 1.2 }), g = ac.createGain(); g.gain.setValueAtTime(0, t); for (let i = 0; i < 9; i++) { g.gain.linearRampToValueAtTime(.55, t + i * .07 + .01); g.gain.linearRampToValueAtTime(.12, t + i * .07 + .05); } g.gain.linearRampToValueAtTime(0, t + .7); s.connect(f).connect(g).connect(o); s.stop(t + .8); }, .9),
    cardboard: (az = 0) => shot(az, .6, .2, (o) => { burst(o, .12, .6, 450, 'bandpass', 1.2); burst(o, .2, .3, 1800, 'bandpass', .7, .1); burst(o, .1, .4, 600, 'bandpass', 1, .35); }, .7),
    scarf: () => { shot(-1.3, .25, .05, (o) => burst(o, .5, .35, 2200, 'bandpass', .5), .6); setTimeout(() => shot(1.3, .25, .05, (o) => burst(o, .5, .35, 2200, 'bandpass', .5), .6), 450); setTimeout(() => shot(0, .3, .05, (o) => burst(o, .4, .25, 1800, 'bandpass', .5), .5), 900); },
    cooler: (az = .1) => shot(az, .6, .2, (o, t) => { burst(o, .02, .7, 2400, 'bandpass', 3); burst(o, .04, .5, 700, 'bandpass', 2, .05); const s = noiseSrc(), f = new BiquadFilterNode(ac, { type: 'highpass', frequency: 5000 }), g = ac.createGain(); g.gain.setValueAtTime(0, t + .1); g.gain.linearRampToValueAtTime(.22, t + .3); g.gain.linearRampToValueAtTime(0, t + 1.6); s.connect(f).connect(g).connect(o); s.stop(t + 1.7); }, 1.8),
    click: (az = -.3) => shot(az, 1.2, .3, (o) => { burst(o, .015, .8, 3000, 'bandpass', 3); burst(o, .02, .5, 1200, 'bandpass', 2, .05); }, .3),   // a switch (the fan heater)
    kairo: (az = -1.4) => shot(az, .3, .05, (o) => { for (let i = 0; i < 6; i++) burst(o, .06, .35, 4200, 'bandpass', 1.2, i * .13); burst(o, .25, .25, 2400, 'bandpass', .6, .85); }, 1.3),   // shaking a disposable hand warmer, then the packet against your cheek
    squish: (az = 1.4) => shot(az, .12, .03, (o) => { burst(o, .12, .5, 1400, 'bandpass', 1.5); burst(o, .2, .25, 5000, 'highpass', .7, .05); }, .4),
    bellHome: (az = -.8) => shot(az, 3.2, .5, (o) => { tone(o, 659, 1.0, .16); tone(o, 1318, .5, .03); tone(o, 523, 1.4, .16, .5); tone(o, 1046, .6, .03, .5); }, 2.2),
    chime: () => shot(0, 1.5, .6, (o) => [659.3, 784, 987.8, 1318.5].forEach((f, i) => tone(o, f, 1.2, .08, i * .14)), 2),
  };
  function setMuted(v) { muted = v; if (master) master.gain.setTargetAtTime(v ? 0 : .95, ac.currentTime, .05); }
  function lrCheck() { init(); shot(-Math.PI / 2, 1, .1, (o) => tone(o, 880, .4, .2), .5); setTimeout(() => shot(Math.PI / 2, 1, .1, (o) => tone(o, 1175, .4, .2), .5), 900); }
  return { init, phoneOn, phoneEar, phoneSpeaker, phoneOff, loadVoices, ready, say, voiceLevel, loop, tick, fx, setMuted, isMuted: () => muted, lrCheck, ctx: () => ac, hasPhone: () => !!phone };
})();
