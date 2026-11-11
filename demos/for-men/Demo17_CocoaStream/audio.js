// Cocoa's patisserie after closing — Web Audio. Her voice (across the counter, behind you, at your ear) and the little shop around you:
// the door bell and the snowy wind outside, the wall clock, the oven humming on your RIGHT, the walk-in fridge on your LEFT, the
// bain-marie bubbling in front of you, the whisk, the oven timer, a cookie's crunch, the piping bag, the clock striking midnight.
// Base (voices, HRTF chain, helpers) copied from Demo31's / Demo25's audio.js. az: rad, 0 = front, + = right. dist: metres.
window.HTAudio = MoHeatEngine.audio({ verbSec: 1.1, verbGain: .16 }, (B) => {   // the base (voices, HRTF chain, helpers, mute, L/R check): demos/shared/engine/audio.js
  const { chain, noiseSrc, shot, burst, tone, rnd, loops, makeLoop } = B;
  function loop(kind) {
    if (!B.ac) return null; if (loops[kind]) return loops[kind];
    const nodes = []; let g, p, lp = null;
    if (kind === 'wind') {         // the snowy night outside the door: band noise, gusting (set from main.js)
      ({ g, p } = chain(-.2, 3, .2)); g.gain.value = 0;
      lp = new BiquadFilterNode(B.ac, { type: 'bandpass', frequency: 380, Q: .5 });
      const s = noiseSrc(); s.connect(lp).connect(g); nodes.push(s);
    }
    if (kind === 'shop') {         // the shop at night: the wall clock ticking behind her + a low room hum
      ({ g, p } = chain(-.4, 3, .25)); g.gain.value = 0;
      const hum = noiseSrc(), hf = new BiquadFilterNode(B.ac, { type: 'lowpass', frequency: 180 }), hg = B.ac.createGain(); hg.gain.value = .25; hum.connect(hf).connect(hg).connect(g); nodes.push(hum);
      let k = 0; const iv = setInterval(() => { if (!B.ac || g.gain.value < .01) return; k ^= 1; burst(g, .012, .22, k ? 3200 : 2700, 'bandpass', 6); }, 1000);
      nodes.push({ stop: () => clearInterval(iv), disconnect() {} });
    }
    if (kind === 'oven') {         // the convection oven on your right: a fan hum + the odd tick of the metal
      ({ g, p } = chain(1.35, .9, .1)); g.gain.value = 0;
      const s = noiseSrc(); lp = new BiquadFilterNode(B.ac, { type: 'lowpass', frequency: 420 }); s.connect(lp).connect(g); nodes.push(s);
      const o = new OscillatorNode(B.ac, { type: 'sine', frequency: 96 }), og = B.ac.createGain(); og.gain.value = .05; o.connect(og).connect(g); o.start(); nodes.push(o);
      const iv = setInterval(() => { if (B.ac && g.gain.value > .01 && Math.random() < .3) burst(g, .01, .25, 4200, 'bandpass', 5); }, 1400);
      nodes.push({ stop: () => clearInterval(iv), disconnect() {} });
    }
    if (kind === 'bain') {         // the bain-marie in front of you: water simmering, small bubbles
      ({ g, p } = chain(0, .5, .05)); g.gain.value = 0;
      const s = noiseSrc(); lp = new BiquadFilterNode(B.ac, { type: 'lowpass', frequency: 700 }); const sg = B.ac.createGain(); sg.gain.value = .25; s.connect(lp).connect(sg).connect(g); nodes.push(s);
      const iv = setInterval(() => { if (!B.ac || g.gain.value < .01) return; const n = 1 + (Math.random() * 3 | 0); for (let i = 0; i < n; i++) tone(g, rnd(500, 1300), .05, rnd(.03, .08), rnd(0, .2), 'sine', .003); }, 160);
      nodes.push({ stop: () => clearInterval(iv), disconnect() {} });
    }
    if (kind === 'whisk') {        // whisking cream in a steel bowl just below your face: one stroke per tick while you hold
      ({ g, p } = chain(.2, .4, .04)); g.gain.value = 0;
      let k = 0; const iv = setInterval(() => { if (!B.ac || g.gain.value < .01) return; k ^= 1; burst(g, .07, .5, k ? 2600 : 3300, 'bandpass', 1.4); tone(g, rnd(1900, 2300), .05, .02, .02, 'triangle'); }, 115);
      nodes.push({ stop: () => clearInterval(iv), disconnect() {} });
    }
    return makeLoop(kind, g, p, lp, nodes);
  }

  const fx = {
    // the brass bell over the shop door (behind you, a little left)
    bell: (az = -2.6) => shot(az, 2.5, .3, (o) => { for (let i = 0; i < 5; i++) { const f = rnd(2100, 2500); tone(o, f, .7, .07, i * .07, 'sine', .002); tone(o, f * 2.7, .3, .02, i * .07, 'sine', .002); } }, 1.5),
    // the glass door swinging shut: a soft thud, the wind cut off
    doorShut: (az = -2.6) => shot(az, 2.5, .2, (o) => { burst(o, .12, .5, 300, 'lowpass', .7); burst(o, .03, .25, 1800, 'bandpass', 3, .01); }, 1),
    steps: (az0 = -2.4, az1 = 0, n = 5, gap = .38) => { if (!B.ac) return; for (let i = 0; i < n; i++) setTimeout(() => shot(az0 + (az1 - az0) * i / (n - 1), 2.5 - 1.6 * i / (n - 1), .15, (o) => { burst(o, .04, .3, 900, 'bandpass', 2); }, .3), i * gap * 1000); },
    // chopping a chocolate bar on the board in front of you
    chop: (n = 6) => { if (!B.ac) return; for (let i = 0; i < n; i++) setTimeout(() => shot(rnd(-.1, .15), .5, .05, (o) => { burst(o, .02, .7, 1600, 'bandpass', 1.5); burst(o, .05, .25, 400, 'lowpass', 1, .005); }, .3), i * 260); },
    // the walk-in fridge on your left: the seal popping open + its hum; close = a heavy padded thump
    fridgeOpen: (az = -1.35) => shot(az, 1.2, .1, (o, t) => { burst(o, .06, .45, 900, 'bandpass', 1); const s = noiseSrc(), f = new BiquadFilterNode(B.ac, { type: 'lowpass', frequency: 300 }), gg = B.ac.createGain(); gg.gain.setValueAtTime(0, t); gg.gain.linearRampToValueAtTime(.25, t + .3); gg.gain.setValueAtTime(.25, t + 3); gg.gain.linearRampToValueAtTime(0, t + 3.6); s.connect(f).connect(gg).connect(o); s.stop(t + 3.7); }, 4),
    fridgeClose: (az = -1.35) => shot(az, 1.2, .1, (o) => { burst(o, .15, .6, 220, 'lowpass', .7); burst(o, .04, .2, 1200, 'bandpass', 2, .01); }, 1),
    // the oven timer (ding!) and its door opening: a hinge squeak + a rush of hot air
    ding: (az = 1.35) => shot(az, 1, .2, (o) => { tone(o, 1568, 1.4, .12, 0, 'sine', .002); tone(o, 1568 * 2.4, .6, .03, 0, 'sine', .002); }, 1.6),
    ovenOpen: (az = 1.35) => shot(az, .9, .1, (o, t) => { const s = new OscillatorNode(B.ac, { type: 'sawtooth', frequency: 300 }), f = new BiquadFilterNode(B.ac, { type: 'bandpass', frequency: 1100, Q: 8 }), gg = B.ac.createGain(); s.frequency.linearRampToValueAtTime(220, t + .35); gg.gain.setValueAtTime(0, t); gg.gain.linearRampToValueAtTime(.03, t + .05); gg.gain.linearRampToValueAtTime(0, t + .4); s.connect(f).connect(gg).connect(o); s.start(t); s.stop(t + .45); const n = noiseSrc(), nf = new BiquadFilterNode(B.ac, { type: 'bandpass', frequency: 500, Q: .5 }), ng = B.ac.createGain(); ng.gain.setValueAtTime(0, t + .2); ng.gain.linearRampToValueAtTime(.35, t + .45); ng.gain.linearRampToValueAtTime(0, t + 1.8); n.connect(nf).connect(ng).connect(o); n.stop(t + 1.9); }, 2),
    // her fu-fu: a soft breath toward you (in front, close)
    blow: (az = 0, dist = .3) => shot(az, dist, .02, (o, t) => { for (let i = 0; i < 2; i++) { const s = noiseSrc(), f = new BiquadFilterNode(B.ac, { type: 'bandpass', frequency: 1100, Q: .5 }), gg = B.ac.createGain(), t0 = t + i * .55; gg.gain.setValueAtTime(0, t0); gg.gain.linearRampToValueAtTime(.3, t0 + .1); gg.gain.linearRampToValueAtTime(0, t0 + .45); s.connect(f).connect(gg).connect(o); s.stop(t0 + .5); } }, 1.4),
    // a crisp cookie bitten (your own mouth: centre, very close)
    crunch: () => shot(0, .08, 0, (o) => { for (let i = 0; i < 7; i++) burst(o, rnd(.01, .03), rnd(.3, .6), rnd(1800, 4200), 'bandpass', 1.5, i * .05 + rnd(0, .02)); }, .8),
    // the piping bag squeezed, slowly, on the counter in front
    pipe: (az = .1) => shot(az, .5, .05, (o, t) => { const s = noiseSrc(), f = new BiquadFilterNode(B.ac, { type: 'lowpass', frequency: 500 }), gg = B.ac.createGain(); gg.gain.setValueAtTime(0, t); gg.gain.linearRampToValueAtTime(.18, t + .3); gg.gain.linearRampToValueAtTime(.12, t + 2.2); gg.gain.linearRampToValueAtTime(0, t + 2.6); s.connect(f).connect(gg).connect(o); s.stop(t + 2.7); }, 3),
    // the wall clock striking midnight (soft chimes)
    chime: (az = -.5) => shot(az, 3, .45, (o) => { for (let i = 0; i < 4; i++) { tone(o, 659, 2.2, .07, i * 1.1, 'sine', .003); tone(o, 1318, 1, .02, i * 1.1, 'sine', .003); } }, 6),
    // cloth (her apron, the apron tied on you, hair)
    rustle: (az = 0, dist = .3) => shot(az, dist, .05, (o, t) => { const s = noiseSrc(), f = new BiquadFilterNode(B.ac, { type: 'bandpass', frequency: 1800, Q: .6 }), gg = B.ac.createGain(); gg.gain.setValueAtTime(0, t); gg.gain.linearRampToValueAtTime(.4, t + .12); gg.gain.linearRampToValueAtTime(0, t + .7); s.connect(f).connect(gg).connect(o); s.stop(t + .8); }, .9),
  };
  return { loop, fx };
});
