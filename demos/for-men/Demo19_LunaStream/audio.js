// Luna's basement bar after last orders — Web Audio. Her voice (across the counter, leaning in, beside you, at your left ear) and the
// bar around you: rain and the heavy door at the foot of the stairs on your LEFT, the jukebox playing soft jazz on your RIGHT, ice
// and the shaker, the glass sliding over the counter, the lighter and the blue flame, the coffee poured, two glasses clinking.
// Base (voices, HRTF chain, helpers) copied from Demo17's audio.js. az: rad, 0 = front, + = right. dist: metres.
window.HTAudio = (() => {
  let ac = null, master = null, dry = null, verb = null, noise = null, muted = false;
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
    verb = ac.createConvolver(); const vg = ac.createGain(); vg.gain.value = .16; verb.connect(vg).connect(master);
    const n = Math.round(ac.sampleRate * 1.1), b = ac.createBuffer(2, n, ac.sampleRate);   // a small wood-panelled basement: a short, warm tail
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
    for (const id of ids) if (!voices[id]) voices[id] = fetch(`media/voice/${id}.m4a`).then((r) => { if (!r.ok) throw 0; return r.arrayBuffer(); }).then((b) => ac.decodeAudioData(b)).then((buf) => (voices[id] = buf)).catch(() => (voices[id] = null));
  }
  function say(id, where = { az: 0, dist: .8 }, gain = 1.4) {   // → Promise, resolves when the line ends (no file yet: a pause)
    return new Promise(async (res) => {
      if (voices[id] instanceof Promise) await voices[id];
      const buf = voices[id]; if (!ac || !buf) return setTimeout(res, 2200);
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
    if (kind === 'rain') {         // rain outside the door on your left: muffled while it is shut (main.js opens the filter with the door)
      ({ g, p } = chain(-1.2, 2.5, .15)); g.gain.value = 0;
      lp = new BiquadFilterNode(ac, { type: 'lowpass', frequency: 700 });
      const s = noiseSrc(), hp = new BiquadFilterNode(ac, { type: 'highpass', frequency: 300 }); s.connect(hp).connect(lp).connect(g); nodes.push(s);
      const iv = setInterval(() => { if (!ac || g.gain.value < .01) return; for (let i = 0; i < 3; i++) burst(g, .008, rnd(.05, .14), rnd(2500, 6000), 'bandpass', 3, rnd(0, .25)); }, 260);
      nodes.push({ stop: () => clearInterval(iv), disconnect() {} });
    }
    if (kind === 'room') {         // the bar itself: a low fridge / room hum behind the counter
      ({ g, p } = chain(.2, 2.5, .2)); g.gain.value = 0;
      const hum = noiseSrc(), hf = new BiquadFilterNode(ac, { type: 'lowpass', frequency: 160 }), hg = ac.createGain(); hg.gain.value = .3; hum.connect(hf).connect(hg).connect(g); nodes.push(hum);
      const o = new OscillatorNode(ac, { type: 'sine', frequency: 60 }), og = ac.createGain(); og.gain.value = .02; o.connect(og).connect(g); o.start(); nodes.push(o);
    }
    if (kind === 'jazz') {         // the jukebox on your right: soft late-night jazz (Rhodes-like chords, walking bass, brushes), ii–V–I in F
      ({ g, p } = chain(1.25, 2.2, .3)); g.gain.value = 0;
      lp = new BiquadFilterNode(ac, { type: 'lowpass', frequency: 2400 }); lp.connect(g);
      const BAR = [[[55, 60, 64, 67], 43], [[55, 59, 62, 65], 36], [[52, 57, 60, 64], 41], [[52, 57, 60, 62], 38]];   // Gm9 · C13 · Fmaj9 · Dm9 (midi)
      const hz = (m) => 440 * Math.pow(2, (m - 69) / 12), beat = .62; let b = 0;
      const step = () => {
        if (!ac || g.gain.value < .005) { b++; return; }
        const [ch, root] = BAR[Math.floor(b / 4) % 4], k = b % 4;
        if (k === 0) for (const m of ch) tone(lp, hz(m), 1.6, .028, rnd(0, .03), 'triangle', .01);
        if (k === 2 && Math.random() < .6) for (const m of ch) tone(lp, hz(m), .5, .016, .31, 'triangle', .01);
        const walk = [0, 7, 12, 10][k] + (Math.random() < .3 ? -1 : 0); tone(lp, hz(root + walk - 12), beat * .9, .09, 0, 'sine', .01);
        burst(lp, .18, k % 2 ? .05 : .03, 6000, 'highpass', .7); if (k % 2) burst(lp, .05, .04, 5000, 'highpass', .7, beat * .66);
        b++;
      };
      const iv = setInterval(step, beat * 1000); nodes.push({ stop: () => clearInterval(iv), disconnect() {} });
    }
    if (kind === 'flame') {        // the blue flame on the drink in front of you: a soft roar + tiny crackles
      ({ g, p } = chain(0, .55, .05)); g.gain.value = 0;
      const s = noiseSrc(); lp = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 420, Q: .6 }); s.connect(lp).connect(g); nodes.push(s);
      const iv = setInterval(() => { if (ac && g.gain.value > .01 && Math.random() < .5) burst(g, .006, .3, rnd(2500, 5000), 'bandpass', 4); }, 180);
      nodes.push({ stop: () => clearInterval(iv), disconnect() {} });
    }
    const L = { g, p, lp,
      set: (v, tc = .2) => g.gain.setTargetAtTime(v, ac.currentTime, tc),
      at: (az, dist, tc) => place(p, az, dist, tc ?? .05),
      tone: (f) => lp?.frequency.setTargetAtTime(f, ac.currentTime, .3),
      stop: () => { g.gain.setTargetAtTime(0, ac.currentTime, .15); setTimeout(() => { for (const n of nodes) try { n.stop(); n.disconnect(); } catch {} g.disconnect(); }, 1200); delete loops[kind]; } };
    loops[kind] = L; return L;
  }

  const clink = (o, at = 0, f = 2900, amp = .12) => { tone(o, f, .9, amp, at, 'sine', .001); tone(o, f * 2.76, .4, amp * .35, at, 'sine', .001); tone(o, f * 1.5, .6, amp * .25, at, 'sine', .001); };
  const fx = {
    // the heavy wooden door at the foot of the stairs on your left: opens (rain rushes in), the bell over it, shuts with a thud
    door: (az = -1.3) => shot(az, 2.4, .25, (o) => { const t = ac.currentTime, s = new OscillatorNode(ac, { type: 'sawtooth', frequency: 140 }), f = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 600, Q: 6 }), gg = ac.createGain(); s.frequency.linearRampToValueAtTime(95, t + .5); gg.gain.setValueAtTime(0, t); gg.gain.linearRampToValueAtTime(.025, t + .08); gg.gain.linearRampToValueAtTime(0, t + .55); s.connect(f).connect(gg).connect(o); s.start(t); s.stop(t + .6); }, 1),
    bell: (az = -1.3) => shot(az, 2.4, .3, (o) => { for (let i = 0; i < 4; i++) { const f = rnd(2200, 2600); tone(o, f, .7, .06, i * .08, 'sine', .002); tone(o, f * 2.7, .3, .018, i * .08, 'sine', .002); } }, 1.5),
    doorShut: (az = -1.3) => shot(az, 2.4, .2, (o) => { burst(o, .14, .55, 260, 'lowpass', .7); burst(o, .03, .2, 1600, 'bandpass', 3, .01); }, 1),
    // the last guest's steps going up the stone stairs (left, moving away)
    steps: (n = 6) => { if (!ac) return; for (let i = 0; i < n; i++) setTimeout(() => shot(-1.1 - .3 * i / n, 1.8 + 1.5 * i / n, .25, (o) => { burst(o, .05, .32, 700, 'bandpass', 1.6); burst(o, .02, .12, 2600, 'bandpass', 3, .01); }, .3), i * 420); },
    // ice cubes dropped into the steel shaker in front of you
    ice: (az = -.15) => { if (!ac) return; for (let i = 0; i < 6; i++) setTimeout(() => shot(az, .7, .08, (o) => { clink(o, 0, rnd(2600, 4200), .06); burst(o, .03, .25, 3500, 'bandpass', 2); }, .8), i * rnd(70, 140) + i * 30); },
    // shaking: ice rattling in the shaker, back and forth beside her shoulder (n strokes)
    shake: (az = -.2, n = 14) => { if (!ac) return; for (let i = 0; i < n; i++) setTimeout(() => shot(az + (i % 2 ? .06 : -.06), .75, .06, (o) => { for (let k = 0; k < 4; k++) burst(o, .02, rnd(.12, .25), rnd(2500, 5200), 'bandpass', 2.5, k * .018); burst(o, .04, .2, 900, 'bandpass', 1.5); }, .5), i * 170); },
    // the frosted shaker set against your right cheek: a faint cold metal touch
    touch: (az = 1.3) => shot(az, .1, 0, (o) => { burst(o, .12, .25, 1200, 'bandpass', 1); clink(o, .02, 1800, .02); }, .6),
    // the glass sliding across the counter to you
    slide: (az = .05) => shot(az, .5, .05, (o, t) => { const s = noiseSrc(), f = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 1400, Q: .7 }), gg = ac.createGain(); gg.gain.setValueAtTime(0, t); gg.gain.linearRampToValueAtTime(.2, t + .1); gg.gain.linearRampToValueAtTime(0, t + .8); s.connect(f).connect(gg).connect(o); s.stop(t + .9); burst(o, .05, .3, 500, 'lowpass', 1, .82); }, 1.2),
    pour: (az = 0, dur = 1.6) => shot(az, .6, .08, (o, t) => { const s = noiseSrc(), f = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 900, Q: 1.2 }), gg = ac.createGain(); f.frequency.linearRampToValueAtTime(1500, t + dur); gg.gain.setValueAtTime(0, t); gg.gain.linearRampToValueAtTime(.22, t + .1); gg.gain.setValueAtTime(.22, t + dur - .2); gg.gain.linearRampToValueAtTime(0, t + dur); s.connect(f).connect(gg).connect(o); s.stop(t + dur + .05); }, dur + .2),
    // the long lighter clicks and the drink catches: a soft whoomp
    ignite: (az = 0) => shot(az, .6, .05, (o, t) => { burst(o, .01, .4, 4000, 'bandpass', 3); const s = noiseSrc(), f = new BiquadFilterNode(ac, { type: 'lowpass', frequency: 900 }), gg = ac.createGain(); gg.gain.setValueAtTime(0, t + .25); gg.gain.linearRampToValueAtTime(.55, t + .32); gg.gain.exponentialRampToValueAtTime(.01, t + 1.1); s.connect(f).connect(gg).connect(o); s.stop(t + 1.2); }, 1.4),
    // the flame snuffed: a little puff
    snuff: (az = 0) => shot(az, .5, .03, (o) => { burst(o, .2, .25, 900, 'bandpass', .8); }, .5),
    // the lights dimmed (a small switch on the wall behind the bar)
    click: (az = .5) => shot(az, 2, .2, (o) => { burst(o, .008, .4, 3000, 'bandpass', 4); }, .3),
    // two glasses clinking (cheers), right in front of you
    cheers: () => shot(-.1, .35, .1, (o) => { clink(o, 0, 2700, .16); clink(o, .01, 3150, .1); }, 1.4),
    // the bar stool next to you (left): pulled out, she sits
    stool: (az = -.9) => shot(az, .6, .08, (o) => { burst(o, .25, .2, 300, 'lowpass', 1); burst(o, .05, .15, 1500, 'bandpass', 3, .25); }, .8),
    // cloth (her waistcoat, her hair falling forward)
    rustle: (az = 0, dist = .3) => shot(az, dist, .05, (o, t) => { const s = noiseSrc(), f = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 1800, Q: .6 }), gg = ac.createGain(); gg.gain.setValueAtTime(0, t); gg.gain.linearRampToValueAtTime(.4, t + .12); gg.gain.linearRampToValueAtTime(0, t + .7); s.connect(f).connect(gg).connect(o); s.stop(t + .8); }, .9),
  };
  function setMuted(v) { muted = v; if (master) master.gain.setTargetAtTime(v ? 0 : .95, ac.currentTime, .05); }
  function lrCheck() { init(); shot(-Math.PI / 2, 1, .1, (o) => tone(o, 880, .4, .2), .5); setTimeout(() => shot(Math.PI / 2, 1, .1, (o) => tone(o, 1175, .4, .2), .5), 900); }
  return { init, loadVoices, say, voiceLevel, loop, fx, setMuted, isMuted: () => muted, lrCheck, ctx: () => ac };
})();
