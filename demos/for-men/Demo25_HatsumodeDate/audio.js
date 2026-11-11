// Tsubaki's first hatsumode — Web Audio. Her voice (in front, beside you, at your ear), the New Year's Eve shrine around you:
// night wind that gusts past (moves across your head), the crowd murmur, the bonfire crackling on your left, the temple bell at
// midnight, the shrine bell (suzu), claps, geta on the stone path, the omikuji box. Adapted from Demo22's audio.js.
// az: rad, 0 = front, + = right. dist: metres.
window.HTAudio = MoHeatEngine.audio({ verbSec: 1.6, verbGain: .16 }, (B) => {   // the base (voices, HRTF chain, helpers, mute, L/R check): demos/shared/engine/audio.js
  const { chain, noiseSrc, shot, burst, tone, rnd, loops, makeLoop } = B;
  function loop(kind) {
    if (!B.ac) return null; if (loops[kind]) return loops[kind];
    const nodes = []; let g, p, lp;
    if (kind === 'wind') {         // winter night wind: low rumble + a whistle; gusts are set from main.js (set + at)
      ({ g, p } = chain(-1.2, 1.5, .2)); g.gain.value = 0;
      lp = new BiquadFilterNode(B.ac, { type: 'bandpass', frequency: 520, Q: .5 });
      const s = noiseSrc(); s.connect(lp).connect(g); nodes.push(s);
      const wh = noiseSrc(), wf = new BiquadFilterNode(B.ac, { type: 'bandpass', frequency: 1500, Q: 8 }), wg = B.ac.createGain(); wg.gain.value = .25;
      const lfo = new OscillatorNode(B.ac, { frequency: .13 }), lg = B.ac.createGain(); lg.gain.value = 400; lfo.connect(lg).connect(wf.frequency); lfo.start();
      wh.connect(wf).connect(wg).connect(g); nodes.push(wh, lfo);
    }
    if (kind === 'crowd') {        // the crowd: a murmur of many voices (formant-filtered noise, slowly breathing) all around and behind
      ({ g, p } = chain(Math.PI, 3, .5)); g.gain.value = 0;
      for (const f of [420, 850, 1500]) {
        const s = noiseSrc(), bp = new BiquadFilterNode(B.ac, { type: 'bandpass', frequency: f, Q: 3 }), am = B.ac.createGain(); am.gain.value = .35;
        const lfo = new OscillatorNode(B.ac, { frequency: rnd(2.5, 4.5) }), lg = B.ac.createGain(); lg.gain.value = .25; lfo.connect(lg).connect(am.gain); lfo.start();
        s.connect(bp).connect(am).connect(g); nodes.push(s, lfo);
      }
      lp = null;
      const iv = setInterval(() => { if (!B.ac || g.gain.value < .01) return; if (Math.random() < .35) for (let i = 0; i < 3; i++) burst(g, .05, rnd(.05, .14), rnd(700, 1600), 'bandpass', 5, i * .07); }, 500);   // a laugh / a call far off
      nodes.push({ stop: () => clearInterval(iv), disconnect() {} });
    }
    if (kind === 'fire') {         // the bonfire: low roar + random crackles and pops
      ({ g, p } = chain(-1.0, 1.4, .15)); g.gain.value = 0;
      const s = noiseSrc(); lp = new BiquadFilterNode(B.ac, { type: 'lowpass', frequency: 380 }); const rg = B.ac.createGain(); rg.gain.value = .9; s.connect(lp).connect(rg).connect(g); nodes.push(s);
      const iv = setInterval(() => { if (!B.ac || g.gain.value < .01) return; const n = Math.random() < .3 ? 3 : 1; for (let i = 0; i < n; i++) burst(g, rnd(.004, .02), rnd(.3, .9), rnd(1500, 5000), 'bandpass', 2, rnd(0, .12)); }, 140);
      nodes.push({ stop: () => clearInterval(iv), disconnect() {} });
    }
    return makeLoop(kind, g, p, lp, nodes);
  }

  const fx = {
    // geta (wooden sandals) on stone, hurrying: az0 → az1 over the steps
    geta: (az0 = 1.2, az1 = 0, n = 8, gap = .2) => { if (!B.ac) return; for (let i = 0; i < n; i++) setTimeout(() => shot(az0 + (az1 - az0) * i / (n - 1), 2 - 1.2 * i / (n - 1), .2, (o) => { burst(o, .03, .55, 1900, 'bandpass', 4); burst(o, .02, .3, 900, 'bandpass', 3, .012); }, .3), i * gap * 1000); },
    // the temple bell far away (joya no kane): a deep inharmonic bong with a long hum
    bell: (az = .7) => shot(az, 30, .7, (o) => { for (const [f, a, d] of [[73.4, .32, 9], [146.8, .12, 7], [201, .1, 6], [282, .06, 4], [415, .04, 3]]) tone(o, f, d, a, 0, 'sine', .02); burst(o, .06, .25, 300, 'lowpass', .7); }, 10),
    // the shrine bell rope: a rattle of small brass bells above
    suzu: (az = 0) => shot(az, 1.6, .35, (o) => { for (let i = 0; i < 14; i++) { const at = i * .07 + rnd(0, .03); for (const f of [2350, 3130, 4120]) tone(o, f * rnd(.98, 1.02), .35, .05, at, 'sine', .002); } }, 2),
    clap: (az = -.4, dist = .5) => shot(az, dist, .3, (o) => burst(o, .05, .9, 1300, 'bandpass', 1.1), .4),
    coin: (az = 0) => shot(az, 1.5, .3, (o) => { tone(o, 3900, .3, .05, 0); tone(o, 5200, .25, .04, .09); burst(o, .04, .2, 2500, 'bandpass', 3, .25); }, 1),
    shake: (az = 0, dist = .4) => shot(az, dist, .1, (o) => { for (let i = 0; i < 8; i++) { burst(o, .03, .35, 1600, 'bandpass', 2, i * .11); burst(o, .02, .2, 3200, 'bandpass', 3, i * .11 + .04); } }, 1.2),
    paper: (az = 0, dist = .4) => shot(az, dist, .05, (o, t) => { const s = noiseSrc(), f = new BiquadFilterNode(B.ac, { type: 'bandpass', frequency: 3400, Q: .7 }), g = B.ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.35, t + .05); g.gain.linearRampToValueAtTime(0, t + .5); s.connect(f).connect(g).connect(o); s.stop(t + .6); }, .8),
    rustle: (az = 0, dist = .3) => shot(az, dist, .05, (o, t) => { const s = noiseSrc(), f = new BiquadFilterNode(B.ac, { type: 'bandpass', frequency: 1800, Q: .6 }), g = B.ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.45, t + .12); g.gain.linearRampToValueAtTime(0, t + .7); s.connect(f).connect(g).connect(o); s.stop(t + .8); }, .9),
    sip: (az = .9, dist = .3) => shot(az, dist, .05, (o) => { burst(o, .25, .12, 900, 'bandpass', 1.5); }, .5),
    cheer: () => shot(Math.PI, 3, .6, (o, t) => { const s = noiseSrc(), f = new BiquadFilterNode(B.ac, { type: 'bandpass', frequency: 1100, Q: .6 }), g = B.ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.55, t + .3); g.gain.linearRampToValueAtTime(0, t + 3); s.connect(f).connect(g).connect(o); s.stop(t + 3.1); for (let i = 0; i < 24; i++) burst(o, .03, rnd(.2, .5), 1300, 'bandpass', 1.2, rnd(.2, 2.2)); }, 3.5),
    tick: (az = 0) => shot(az, 1, .1, (o) => tone(o, 1320, .12, .08), .3),
    chime: () => shot(0, 1.5, .6, (o) => [659.3, 784, 987.8, 1318.5].forEach((f, i) => tone(o, f, 1.2, .08, i * .14)), 2),
  };
  return { loop, fx };
});
