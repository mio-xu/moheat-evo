// 白嶺の峠、ひと晩の宿 — Web Audio. Three voices (Mint, Hinata, Nagisa: pre-rendered ElevenLabs lines, media/voice/<id>.m4a) placed
// with HRTF where each one is, and the inn around you, all synthesized: the blizzard on the pass (gusts sweep left → right), snow
// crunching under boots, the inn's sliding door, the hotpot bubbling in front, the charcoal brazier on the right, dice rattling in a
// cup, a soup bowl set down, the moxa stick's tiny crackle, the balm tin, the front door bursting open in the night wind (left).
// Base (voices, HRTF chain, helpers) from Demo19's audio.js. az: rad, 0 = front, + = right. dist: metres.
window.INNAudio = (() => {
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
    verb = ac.createConvolver(); const vg = ac.createGain(); vg.gain.value = .14; verb.connect(vg).connect(master);
    const n = Math.round(ac.sampleRate * 1.2), b = ac.createBuffer(2, n, ac.sampleRate);   // a small wooden inn: short warm tail
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

  // ---------------------------------------------------------------- voices (a story line by id, or any decoded buffer: the live talk)
  function loadVoices(ids) {
    if (!ac) return;
    for (const id of ids) for (const k of [VK(id)]) if (!voices[k]) voices[k] = VF(id, 'media/voice/', '').then((r) => { if (!r.ok) throw 0; return r.arrayBuffer(); }).then((b) => ac.decodeAudioData(b)).then((buf) => (voices[k] = buf)).catch(() => (voices[k] = null));
  }
  const decode = (ab) => ac.decodeAudioData(ab);
  function play(buf, where, gain) {
    return new Promise((res) => {
      if (!ac || !buf) return setTimeout(res, 2200);
      const s = ac.createBufferSource(); s.buffer = buf; const g = ac.createGain(); g.gain.value = gain;
      const c = chain(where.az, where.dist, where.dist < .3 ? .03 : .15);
      s.connect(g); g.connect(c.g); g.connect(an);
      setTimeout(() => { c.g.disconnect(); c.p.disconnect(); }, (buf.duration + 2) * 1000);
      s.onended = () => res(); s.start();
    });
  }
  async function say(id, where = { az: 0, dist: .8 }, gain = 1.4) {   // → resolves when the line ends (no file: a pause)
    if (!voices[VK(id)]) loadVoices([id]);
    if (voices[VK(id)] instanceof Promise) await voices[VK(id)];
    return play(voices[VK(id)], where, gain);
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
    if (kind === 'blizzard') {     // the wind on the pass: a broadband roar + whistling, gusts (main.js moves it left → right with the gust)
      ({ g, p } = chain(-.6, 2, .1)); g.gain.value = 0;
      lp = new BiquadFilterNode(ac, { type: 'lowpass', frequency: 1400 });
      const s = noiseSrc(), bp = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 500, Q: .5 }); s.connect(bp).connect(lp).connect(g); nodes.push(s);
      const w = noiseSrc(), wf = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 900, Q: 9 }), wg = ac.createGain(); wg.gain.value = .35; w.connect(wf).connect(wg).connect(g); nodes.push(w);
      const iv = setInterval(() => { if (ac) wf.frequency.setTargetAtTime(rnd(600, 1500), ac.currentTime, .6); }, 900); nodes.push({ stop: () => clearInterval(iv), disconnect() {} });
    }
    if (kind === 'room') {         // the inn at night: low room tone, the odd creak of the timber
      ({ g, p } = chain(.3, 3, .25)); g.gain.value = 0;
      const hum = noiseSrc(), hf = new BiquadFilterNode(ac, { type: 'lowpass', frequency: 180 }), hg = ac.createGain(); hg.gain.value = .25; hum.connect(hf).connect(hg).connect(g); nodes.push(hum);
      const iv = setInterval(() => { if (ac && g.gain.value > .01 && Math.random() < .25) { const o = new OscillatorNode(ac, { type: 'sawtooth', frequency: rnd(90, 160) }), f = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 700, Q: 8 }), gg = ac.createGain(), t = ac.currentTime; gg.gain.setValueAtTime(0, t); gg.gain.linearRampToValueAtTime(.01, t + .15); gg.gain.linearRampToValueAtTime(0, t + .5); o.connect(f).connect(gg).connect(g); o.start(t); o.stop(t + .55); } }, 2400);
      nodes.push({ stop: () => clearInterval(iv), disconnect() {} });
    }
    if (kind === 'hotpot') {       // the hotpot on the table in front of you: bubbling + a soft simmer hiss
      ({ g, p } = chain(0, .7, .08)); g.gain.value = 0;
      const s = noiseSrc(), f = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 2400, Q: .7 }), sg = ac.createGain(); sg.gain.value = .12; s.connect(f).connect(sg).connect(g); nodes.push(s);
      const iv = setInterval(() => { if (!ac || g.gain.value < .01) return; for (let i = 0; i < 2; i++) { const t0 = rnd(0, .12), fr = rnd(180, 420); const o = new OscillatorNode(ac, { type: 'sine', frequency: fr }), gg = ac.createGain(), t = ac.currentTime + t0; o.frequency.exponentialRampToValueAtTime(fr * 2.2, t + .06); gg.gain.setValueAtTime(0, t); gg.gain.linearRampToValueAtTime(.12, t + .01); gg.gain.exponentialRampToValueAtTime(.001, t + .08); o.connect(gg).connect(g); o.start(t); o.stop(t + .1); } }, 120);
      nodes.push({ stop: () => clearInterval(iv), disconnect() {} });
    }
    if (kind === 'brazier') {      // the charcoal brazier: crackles (placed by main.js: right in the hall, right in the entrance)
      ({ g, p } = chain(1.1, 1.6, .15)); g.gain.value = 0;
      const s = noiseSrc(), f = new BiquadFilterNode(ac, { type: 'lowpass', frequency: 300 }), sg = ac.createGain(); sg.gain.value = .2; s.connect(f).connect(sg).connect(g); nodes.push(s);
      const iv = setInterval(() => { if (ac && g.gain.value > .01 && Math.random() < .6) burst(g, .006, rnd(.15, .45), rnd(1800, 5000), 'bandpass', 3); }, 140);
      nodes.push({ stop: () => clearInterval(iv), disconnect() {} });
    }
    if (kind === 'moxa') {         // the moxa stick circling your right ear: a whisper of embers (main.js moves it with the stick)
      ({ g, p } = chain(1.35, .15, 0)); g.gain.value = 0;
      const s = noiseSrc(), f = new BiquadFilterNode(ac, { type: 'highpass', frequency: 3500 }), sg = ac.createGain(); sg.gain.value = .05; s.connect(f).connect(sg).connect(g); nodes.push(s);
      const iv = setInterval(() => { if (ac && g.gain.value > .01 && Math.random() < .4) burst(g, .004, rnd(.08, .2), rnd(3000, 6000), 'bandpass', 4); }, 200);
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
    // boots in deep snow coming toward you from the front-left (n steps)
    crunch: (az = -.3, dist = 2.5, n = 6, to = .9) => { if (!ac) return; for (let i = 0; i < n; i++) setTimeout(() => shot(az * (1 - i / n), dist + (to - dist) * i / n, .1, (o) => { burst(o, .12, .4, 900, 'lowpass', .8); burst(o, .06, .18, 2400, 'bandpass', 1.5, .02); }, .4), i * 480); },
    // the fur cape put round your shoulders: a heavy soft rustle at both ears
    cape: () => { shot(-1.2, .25, .02, (o) => burst(o, .5, .35, 700, 'lowpass', .7), .8); setTimeout(() => shot(1.2, .25, .02, (o) => burst(o, .5, .3, 700, 'lowpass', .7), .8), 180); },
    // the inn's sliding wooden door (az) rolling open / shut
    slide: (az = -.6, open = true) => shot(az, 2, .2, (o, t) => { const s = noiseSrc(), f = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 300, Q: 1 }), gg = ac.createGain(); gg.gain.setValueAtTime(0, t); gg.gain.linearRampToValueAtTime(.4, t + .1); gg.gain.linearRampToValueAtTime(0, t + .7); s.connect(f).connect(gg).connect(o); s.stop(t + .8); burst(o, .1, open ? .2 : .5, 220, 'lowpass', 1, .7); }, 1),
    // the front door burst open by the wind on your left: a bang, the doors hitting the wall
    bang: (az = -1.25) => shot(az, 2, .3, (o) => { burst(o, .25, .9, 160, 'lowpass', .7); burst(o, .05, .4, 1200, 'bandpass', 2, .02); burst(o, .2, .5, 200, 'lowpass', .7, .35); }, 1.4),
    // dice shaken in the wooden cup, the cup slammed down, the reveal
    dice: (az = .1) => { if (!ac) return; for (let i = 0; i < 10; i++) setTimeout(() => shot(az, .7, .06, (o) => { burst(o, .015, rnd(.2, .35), rnd(1800, 3200), 'bandpass', 3); burst(o, .01, .15, 900, 'bandpass', 2, .02); }, .3), i * 85); setTimeout(() => shot(az, .7, .1, (o) => { burst(o, .12, .7, 260, 'lowpass', .8); burst(o, .02, .3, 2400, 'bandpass', 2, .01); }, .5), 1000); },
    reveal: (az = .1) => shot(az, .7, .05, (o) => { burst(o, .05, .25, 1500, 'bandpass', 1.5); burst(o, .02, .2, 2800, 'bandpass', 3, .06); }, .4),
    // a hot soup bowl set down right in front of you
    bowl: () => shot(0, .4, .05, (o) => { burst(o, .05, .35, 600, 'bandpass', 2); tone(o, 820, .5, .04, 0, 'sine', .002); }, .8),
    // the balm tin: the lid twisted off
    tin: (az = 1.2) => shot(az, .25, .02, (o) => { burst(o, .03, .25, 3800, 'bandpass', 4); tone(o, 2600, .25, .03, .03, 'sine', .002); }, .5),
    // footsteps on the floorboards (az, n steps, moving from → to)
    boards: (from = 1.2, to = -1, n = 4, dist = 1.5) => { if (!ac) return; for (let i = 0; i < n; i++) setTimeout(() => shot(from + (to - from) * i / Math.max(1, n - 1), dist, .2, (o) => { burst(o, .08, .3, 380, 'lowpass', 1); burst(o, .02, .1, 1600, 'bandpass', 3, .01); }, .4), i * 330); },
    // cloth (a sleeve, her hair falling forward, kneeling beside you)
    rustle: (az = 0, dist = .3) => shot(az, dist, .05, (o, t) => { const s = noiseSrc(), f = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 1800, Q: .6 }), gg = ac.createGain(); gg.gain.setValueAtTime(0, t); gg.gain.linearRampToValueAtTime(.4, t + .12); gg.gain.linearRampToValueAtTime(0, t + .7); s.connect(f).connect(gg).connect(o); s.stop(t + .8); }, .9),
    // her breath blown softly on the balm at your right ear (a breath, not her voice: no warmth from it)
    blow: (az = 1.35) => shot(az, .1, 0, (o, t) => { const s = noiseSrc(), f = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 1100, Q: .5 }), gg = ac.createGain(); gg.gain.setValueAtTime(0, t); gg.gain.linearRampToValueAtTime(.35, t + .25); gg.gain.setValueAtTime(.3, t + 1.3); gg.gain.linearRampToValueAtTime(0, t + 1.9); s.connect(f).connect(gg).connect(o); s.stop(t + 2); }, 2),
    // waking up: a rush of wind fading into silence
    wake: () => shot(0, 1.5, .4, (o, t) => { const s = noiseSrc(), f = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 600, Q: .6 }), gg = ac.createGain(); f.frequency.exponentialRampToValueAtTime(3000, t + 2.5); gg.gain.setValueAtTime(0, t); gg.gain.linearRampToValueAtTime(.45, t + 1); gg.gain.linearRampToValueAtTime(0, t + 3); s.connect(f).connect(gg).connect(o); s.stop(t + 3.1); }, 3.2),
    chime: () => shot(0, 1, .4, (o) => { for (const [f, at] of [[1568, 0], [2093, .12], [2637, .24]]) tone(o, f, 1.6, .05, at, 'sine', .003); }, 2),
  };
  function setMuted(v) { muted = v; if (master) master.gain.setTargetAtTime(v ? 0 : .95, ac.currentTime, .05); }
  function lrCheck() { init(); shot(-Math.PI / 2, 1, .1, (o) => tone(o, 880, .4, .2), .5); setTimeout(() => shot(Math.PI / 2, 1, .1, (o) => tone(o, 1175, .4, .2), .5), 900); }
  function stopAll() { for (const k of Object.keys(loops)) loops[k].stop(); }
  return { init, loadVoices, say, play, decode, voiceLevel, loop, fx, setMuted, isMuted: () => muted, lrCheck, stopAll, ctx: () => ac };
})();
