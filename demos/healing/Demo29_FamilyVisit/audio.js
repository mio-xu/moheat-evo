// 『ただいま、じいちゃん・ばあちゃん』 — Web Audio. Grandma's and grandpa's voices (own level meters), placed with HRTF; the places
// around you: the station (wind from the open left side, the little train leaving), the genkan door, the kerosene stove on your
// right (hum + kettle), the snowy garden, grandpa's snowball whizzing past your right ear, the quilt, grandpa snoring next door.
// Adapted from Demo28's audio.js (same structure). az: rad, 0 = front, + = right. dist: metres.
window.FVAudio = (() => {
  let ac = null, master = null, dry = null, verb = null, noise = null, muted = false;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const voices = {}, meter = {}, level = { gm: 0, gp: 0 };
  // voice language (shared/shell.js MoHeatVoice; tools/web/voice_lang.py): one cache entry per language, ja fallback, a switch preloads the lines used so far
  const VF = (id, base, q = '') => (window.MoHeatVoice ? MoHeatVoice.fetch(id, base, q) : fetch(`${base}${id}.m4a${q}`));
  const VIDS = new Set(), VK = (id) => (VIDS.add(id), window.MoHeatVoice ? MoHeatVoice.key(id) : id);
  addEventListener('moheat:voicelang', () => loadVoices([...VIDS]));

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return ac; }
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain(); master.gain.value = muted ? 0 : .95;
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3;
    master.connect(comp).connect(ac.destination);
    dry = ac.createGain(); dry.connect(master);
    verb = ac.createConvolver(); const vg = ac.createGain(); vg.gain.value = .12; verb.connect(vg).connect(master);
    const n = Math.round(ac.sampleRate * .9), b = ac.createBuffer(2, n, ac.sampleRate);   // an old wooden house
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 5); }
    verb.buffer = b;
    noise = ac.createBuffer(1, ac.sampleRate * 3, ac.sampleRate);
    const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    for (const w of ['gm', 'gp']) { const an = ac.createAnalyser(); an.fftSize = 512; meter[w] = { an, buf: new Float32Array(512) }; }
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

  // ---------------------------------------------------------------- voices (file id = line id)
  function loadVoices(ids) {
    if (!ac) return;
    for (const id of ids) for (const k of [VK(id)]) if (!voices[k]) voices[k] = VF(id, 'media/voice/', '?v=1').then((r) => { if (!r.ok) throw 0; return r.arrayBuffer(); }).then((b) => ac.decodeAudioData(b)).then((buf) => (voices[k] = buf)).catch(() => (voices[k] = null));
  }
  function say(id, who, where = { az: 0, dist: .8 }, gain = 1.4) {   // → Promise, resolves when the line ends (no file yet: a pause)
    return new Promise(async (res) => {
      if (voices[VK(id)] === undefined) loadVoices([id]);   // not loaded in this voice language yet
      if (voices[VK(id)] instanceof Promise) await voices[VK(id)];
      const buf = voices[VK(id)]; if (!ac || !buf) return setTimeout(res, 2200);
      const s = ac.createBufferSource(); s.buffer = buf; const g = ac.createGain(); g.gain.value = gain;
      const c = chain(where.az, where.dist, where.dist < .3 ? .03 : .15);
      s.connect(g); g.connect(c.g); g.connect(meter[who].an);
      setTimeout(() => { c.g.disconnect(); c.p.disconnect(); }, (buf.duration + 2) * 1000);
      s.onended = () => res(); s.start();
    });
  }
  function voiceLevel(who) {
    const m = meter[who]; if (!m) return 0;
    m.an.getFloatTimeDomainData(m.buf); let s = 0; for (let i = 0; i < m.buf.length; i++) s += m.buf[i] * m.buf[i];
    const v = Math.sqrt(s / m.buf.length); level[who] += (v - level[who]) * .35; return level[who];
  }

  // ---------------------------------------------------------------- loops
  const loops = {};
  function loop(kind) {
    if (!ac) return null; if (loops[kind]) return loops[kind];
    const nodes = []; let g, p, lp = null;
    if (kind === 'stove') {        // the kerosene stove on your right: a low burner hum + the kettle's faint hiss on top
      ({ g, p } = chain(1.2, 1.1, .1)); g.gain.value = 0;
      const s = noiseSrc(); lp = new BiquadFilterNode(ac, { type: 'lowpass', frequency: 220 }); s.connect(lp).connect(g); nodes.push(s);
      const k = noiseSrc(), kf = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 5200, Q: 3 }), kg = ac.createGain(); kg.gain.value = .12; k.connect(kf).connect(kg).connect(g); nodes.push(k);
      const iv = setInterval(() => { if (!ac || g.gain.value < .01) return; if (Math.random() < .2) burst(g, .01, .25, rnd(2500, 4000), 'bandpass', 3); }, 400);   // the metal ticking as it heats
      nodes.push({ stop: () => clearInterval(iv), disconnect() {} });
    }
    if (kind === 'snore') {        // grandpa asleep in the next room: a slow snore every ~3.4 s
      ({ g, p } = chain(1.25, 4, .5)); g.gain.value = 0;
      const iv = setInterval(() => { if (!ac || g.gain.value < .01) return; const t = ac.currentTime, s = ac.createBufferSource(); s.buffer = noise;
        const f = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 160, Q: 2 }), a = ac.createGain(), o = new OscillatorNode(ac, { type: 'sawtooth', frequency: 55 }), og = ac.createGain();
        a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(.6, t + .6); a.gain.linearRampToValueAtTime(0, t + 1.4);
        og.gain.setValueAtTime(0, t); og.gain.linearRampToValueAtTime(.05, t + .6); og.gain.linearRampToValueAtTime(0, t + 1.4);
        s.connect(f).connect(a).connect(g); o.connect(og).connect(g); s.start(t, rnd(0, 1.5), 1.5); o.start(t); o.stop(t + 1.5); }, 3400);
      nodes.push({ stop: () => clearInterval(iv), disconnect() {} });
    }
    if (kind === 'wind') {         // winter wind (at the station it blows in from the open left side; set with .at()): a low hush with a slow swell
      ({ g, p } = chain(-1.3, 3, .3)); g.gain.value = 0;
      lp = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 420, Q: .45 });
      const s = noiseSrc(), am = ac.createGain(); am.gain.value = .7; const lfo = new OscillatorNode(ac, { frequency: .09 }), lg = ac.createGain(); lg.gain.value = .3;
      lfo.connect(lg).connect(am.gain); lfo.start(); s.connect(lp).connect(am).connect(g); nodes.push(s, lfo);
    }
    if (kind === 'snow') {         // falling snow: a very soft, airy high hiss all around
      ({ g, p } = chain(0, 3, .5)); g.gain.value = 0;
      for (const az of [-.6, .6]) { const s = noiseSrc(), hp = new BiquadFilterNode(ac, { type: 'highpass', frequency: 5200 }), pg = panner(az, 3), a = ac.createGain(); a.gain.value = .35; s.connect(hp).connect(a).connect(pg).connect(g); nodes.push(s); }
      const iv = setInterval(() => { if (!ac || g.gain.value < .01) return; if (Math.random() < .4) burst(g, rnd(.02, .05), rnd(.05, .12), rnd(6000, 9000), 'bandpass', 4); }, 260);   // flakes ticking on the veranda
      nodes.push({ stop: () => clearInterval(iv), disconnect() {} });
    }
    const L = { g, p, lp,
      set: (v, tc = .2) => g.gain.setTargetAtTime(v, ac.currentTime, tc),
      at: (az, dist, tc) => place(p, az, dist, tc ?? .05),
      tone: (f) => lp?.frequency.setTargetAtTime(f, ac.currentTime, .3),
      stop: () => { g.gain.setTargetAtTime(0, ac.currentTime, .15); setTimeout(() => { for (const n of nodes) try { n.stop(); n.disconnect(); } catch {} g.disconnect(); }, 1200); delete loops[kind]; } };
    loops[kind] = L; return L;
  }

  const fx = {
    // footsteps (on snow: crunchier) from az0 → az1, distance d0 → d1
    steps: (az0 = .3, az1 = .1, n = 6, gap = .42, d0 = 3, d1 = 1.2, snow = false) => { if (!ac) return; for (let i = 0; i < n; i++) setTimeout(() => shot(az0 + (az1 - az0) * i / (n - 1), d0 + (d1 - d0) * i / (n - 1), .25, (o) => { burst(o, snow ? .12 : .07, snow ? .45 : .35, snow ? 900 : 380, snow ? 'bandpass' : 'lowpass', snow ? 1.2 : .7); burst(o, .05, .14, snow ? 3200 : 1800, 'bandpass', 1.5, .02); }, .4), i * gap * 1000); },
    // the little local train pulling out behind you on the left: a rumble that fades, two soft horn notes
    train: () => shot(-1.9, 6, .4, (o, t) => { const s = noiseSrc(), f = new BiquadFilterNode(ac, { type: 'lowpass', frequency: 160 }), g = ac.createGain(); g.gain.setValueAtTime(.9, t); g.gain.linearRampToValueAtTime(0, t + 6); s.connect(f).connect(g).connect(o); s.stop(t + 6.1);
      for (let i = 0; i < 10; i++) { burst(o, .05, .4 * (1 - i / 10), 400, 'bandpass', 1.5, .3 + i * .45); burst(o, .05, .4 * (1 - i / 10), 400, 'bandpass', 1.5, .45 + i * .45); }
      tone(o, 440, .5, .12, 0, 'triangle', .03); tone(o, 554, .7, .1, .5, 'triangle', .03); }, 7),
    // the wooden sliding door (genkan) rolling open in front of you
    door: (az = 0, dist = 1.5) => shot(az, dist, .3, (o, t) => { const s = noiseSrc(), f = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 300, Q: 1.2 }), g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.6, t + .15); g.gain.linearRampToValueAtTime(.45, t + .8); g.gain.linearRampToValueAtTime(0, t + 1); s.connect(f).connect(g).connect(o); s.stop(t + 1.1); burst(o, .05, .6, 900, 'bandpass', 2, 1); }, 2),
    // grandpa's snowball whizzing past your right ear (front → behind on the right)
    whoosh: () => { if (!ac) return; const { g, p } = chain(.5, 3, .05); const t = ac.currentTime, s = noiseSrc(), f = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 900, Q: 1 }), a = ac.createGain();
      a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(.9, t + .35); a.gain.linearRampToValueAtTime(0, t + .6); f.frequency.setValueAtTime(600, t); f.frequency.linearRampToValueAtTime(1800, t + .35);
      s.connect(f).connect(a).connect(g); s.stop(t + .7); for (let i = 0; i <= 12; i++) setTimeout(() => place(p, .5 + i * .2, Math.max(.25, 3 - i * .3), .02), i * 50); setTimeout(() => { g.disconnect(); p.disconnect(); }, 2000);
      setTimeout(() => shot(2.6, 3, .3, (o) => burst(o, .12, .7, 500, 'lowpass', .7), .4), 650); },   // it lands in the snow behind you
    // your snowball hits grandpa
    thud: (az = .5, dist = 2) => shot(az, dist, .25, (o) => { burst(o, .1, .9, 600, 'lowpass', .7); burst(o, .06, .4, 2200, 'bandpass', 1.2, .01); }, .5),
    // blowing on the hot bowl (you): soft breath
    blow: () => shot(0, .35, .05, (o, t) => { const s = noiseSrc(), f = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 1200, Q: .6 }), g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.3, t + .15); g.gain.linearRampToValueAtTime(0, t + .9); s.connect(f).connect(g).connect(o); s.stop(t + 1); }, 1.1),
    rustle: (az = 0, dist = .3) => shot(az, dist, .05, (o, t) => { const s = noiseSrc(), f = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 1800, Q: .6 }), g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.4, t + .12); g.gain.linearRampToValueAtTime(0, t + .7); s.connect(f).connect(g).connect(o); s.stop(t + .8); }, .9),
    // the quilt pulled up to your ears: a long, soft, close rustle on both sides
    quilt: () => { fx.rustle(-1.3, .15); setTimeout(() => fx.rustle(1.3, .15), 250); },
    chime: () => shot(0, 1.5, .6, (o) => [659.3, 784, 987.8, 1318.5].forEach((f, i) => tone(o, f, 1.2, .07, i * .14)), 2),
  };
  function setMuted(v) { muted = v; if (master) master.gain.setTargetAtTime(v ? 0 : .95, ac.currentTime, .05); }
  function lrCheck() { init(); shot(-Math.PI / 2, 1, .1, (o) => tone(o, 880, .4, .2), .5); setTimeout(() => shot(Math.PI / 2, 1, .1, (o) => tone(o, 1175, .4, .2), .5), 900); }
  return { init, loadVoices, say, voiceLevel, loop, fx, setMuted, isMuted: () => muted, lrCheck, ctx: () => ac };
})();
