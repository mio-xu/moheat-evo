// Nagisa on the summer rooftop — Web Audio. Her voice (in front, beside you, at your ear) and the summer night around you: crickets
// in the potted plants, the town far below, a wind chime, the sea breeze (moves across your head), the steel roof door, geta on
// concrete, a popsicle snapped in two, the paper fan, a match, two senko-hanabi crackling in front of you, far fireworks over the town.
// The base (voices, HRTF chain, helpers, mute, L/R check) is the engine's: demos/shared/engine/audio.js. az: rad, 0 = front, + = right. dist: metres.
window.HTAudio = MoHeatEngine.audio({ verbSec: 1.6, verbGain: .16 }, (B) => {   // an open rooftop: a short, thin reverb tail
  const { chain, noiseSrc, shot, burst, tone, rnd, loops, makeLoop } = B;
  function loop(kind) {
    if (!B.ac) return null; if (loops[kind]) return loops[kind];
    const nodes = []; let g, p, lp = null;
    if (kind === 'breeze') {       // a warm sea breeze over the roof: soft band noise; gusts are set from main.js (set + at)
      ({ g, p } = chain(1.2, 1.5, .2)); g.gain.value = 0;
      lp = new BiquadFilterNode(B.ac, { type: 'bandpass', frequency: 420, Q: .45 });
      const s = noiseSrc(); s.connect(lp).connect(g); nodes.push(s);
    }
    if (kind === 'night') {        // the summer night: crickets (suzumushi) in the planters left and right + the town's low hum far below
      ({ g, p } = chain(0, 4, .3)); g.gain.value = 0;
      const hum = noiseSrc(), hf = new BiquadFilterNode(B.ac, { type: 'lowpass', frequency: 260 }), hg = B.ac.createGain(); hg.gain.value = .35; hum.connect(hf).connect(hg).connect(g); nodes.push(hum);
      const bugs = [[-1.3, 1.6, 4300], [1.2, 2.2, 4700], [-.4, 3.5, 3900]].map(([az, d, f]) => { const c = chain(az, d, .25); c.g.gain.value = 0; return { ...c, f }; });
      const iv = setInterval(() => {
        if (!B.ac || g.gain.value < .01) return;
        for (const b of bugs) if (Math.random() < .55) { b.g.gain.value = g.gain.value * .9; for (let i = 0; i < 3; i++) tone(b.g, b.f * rnd(.99, 1.01), .09, .05, i * .11, 'sine', .01); }
      }, 700);
      nodes.push({ stop: () => { clearInterval(iv); for (const b of bugs) { b.g.disconnect(); b.p.disconnect(); } }, disconnect() {} });
    }
    if (kind === 'sparkler') {     // two senko-hanabi right in front of you: a soft hiss + fine crackles (matsuba sparks)
      ({ g, p } = chain(0, .35, .05)); g.gain.value = 0;
      const s = noiseSrc(); lp = new BiquadFilterNode(B.ac, { type: 'highpass', frequency: 3500 }); const hg = B.ac.createGain(); hg.gain.value = .05; s.connect(lp).connect(hg).connect(g); nodes.push(s);
      const iv = setInterval(() => { if (!B.ac || g.gain.value < .01) return; const n = 1 + (Math.random() * 4 | 0); for (let i = 0; i < n; i++) burst(g, rnd(.002, .008), rnd(.15, .5), rnd(3000, 8000), 'bandpass', 3, rnd(0, .09)); }, 90);
      nodes.push({ stop: () => clearInterval(iv), disconnect() {} });
    }
    return makeLoop(kind, g, p, lp, nodes);
  }


  const fx = {
    // geta (wooden sandals) on the concrete roof: az0 → az1 over the steps
    geta: (az0 = -2.4, az1 = 0, n = 8, gap = .3) => { if (!B.ac) return; for (let i = 0; i < n; i++) setTimeout(() => shot(az0 + (az1 - az0) * i / (n - 1), 3 - 2.2 * i / (n - 1), .15, (o) => { burst(o, .03, .5, 1500, 'bandpass', 3); burst(o, .02, .25, 700, 'bandpass', 3, .012); }, .3), i * gap * 1000); },
    // the steel roof door: a creak, then a heavy clunk
    door: (az = -2.4) => shot(az, 3, .25, (o, t) => { const s = new OscillatorNode(B.ac, { type: 'sawtooth', frequency: 210 }), f = new BiquadFilterNode(B.ac, { type: 'bandpass', frequency: 900, Q: 6 }), gg = B.ac.createGain(); s.frequency.setValueAtTime(210, t); s.frequency.linearRampToValueAtTime(330, t + .5); s.frequency.linearRampToValueAtTime(180, t + .9); gg.gain.setValueAtTime(0, t); gg.gain.linearRampToValueAtTime(.06, t + .1); gg.gain.linearRampToValueAtTime(0, t + .95); s.connect(f).connect(gg).connect(o); s.start(t); s.stop(t + 1); tone(o, 70, .5, .35, 1.05); burst(o, .12, .5, 400, 'lowpass', .7, 1.05); }, 2),
    // a glass wind chime (furin) hanging by the door
    furin: (az = -1.9) => shot(az, 2.5, .3, (o) => { const f0 = rnd(2600, 2900); tone(o, f0, 1.6, .05, 0, 'sine', .002); tone(o, f0 * 2.76, .8, .015, 0, 'sine', .002); }, 2),
    // the popsicle snapped in two (paki!)
    snap: (az = .5, dist = .4) => shot(az, dist, .05, (o) => { burst(o, .015, .9, 2400, 'bandpass', 2); burst(o, .03, .4, 1200, 'bandpass', 2, .01); }, .5),
    // one stroke of the paper fan past your ear
    fan: (az = -.9, dist = .3) => shot(az, dist, .03, (o, t) => { const s = noiseSrc(), f = new BiquadFilterNode(B.ac, { type: 'bandpass', frequency: 700, Q: .6 }), g = B.ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.4, t + .12); g.gain.linearRampToValueAtTime(0, t + .4); s.connect(f).connect(g).connect(o); s.stop(t + .45); }, .6),
    // a match struck and catching
    match: (az = .2, dist = .4) => shot(az, dist, .05, (o, t) => { burst(o, .08, .6, 3000, 'bandpass', 1); const s = noiseSrc(), f = new BiquadFilterNode(B.ac, { type: 'lowpass', frequency: 900 }), g = B.ac.createGain(); g.gain.setValueAtTime(0, t + .08); g.gain.linearRampToValueAtTime(.35, t + .2); g.gain.linearRampToValueAtTime(0, t + 1.4); s.connect(f).connect(g).connect(o); s.stop(t + 1.5); }, 1.6),
    // a sparkler ball dropping onto the concrete: a tiny tick and a hiss out
    drop: (az = 0, dist = .5) => shot(az, dist, .05, (o) => { burst(o, .01, .3, 2500, 'bandpass', 4, .25); burst(o, .25, .08, 5000, 'highpass', .7, .27); }, .8),
    // a firework over the town (~1.5 km, so the boom is low and late): thump of the launch, a deep boom, a crackling tail
    firework: (az = 1, big = 1) => shot(az, 40, .8, (o) => { burst(o, .5, .55 * big, 120, 'lowpass', .7); tone(o, 48, 1.4, .5 * big, 0, 'sine', .01); for (let i = 0; i < 30; i++) burst(o, .02, rnd(.05, .18) * big, rnd(1500, 4000), 'bandpass', 2, .6 + rnd(0, 1.6)); }, 3),
    rustle: (az = 0, dist = .3) => shot(az, dist, .05, (o, t) => { const s = noiseSrc(), f = new BiquadFilterNode(B.ac, { type: 'bandpass', frequency: 1800, Q: .6 }), g = B.ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.4, t + .12); g.gain.linearRampToValueAtTime(0, t + .7); s.connect(f).connect(g).connect(o); s.stop(t + .8); }, .9),
    train: () => shot(1.9, 60, .6, (o, t) => { const s = noiseSrc(), f = new BiquadFilterNode(B.ac, { type: 'lowpass', frequency: 500 }), g = B.ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.3, t + 3); g.gain.linearRampToValueAtTime(0, t + 8); s.connect(f).connect(g).connect(o); s.stop(t + 8.2); for (let i = 0; i < 8; i++) { burst(o, .05, .12, 300, 'lowpass', 1, 1.5 + i * .75); burst(o, .05, .1, 300, 'lowpass', 1, 1.65 + i * .75); } }, 9),
  };
  return { loop, fx };
});
