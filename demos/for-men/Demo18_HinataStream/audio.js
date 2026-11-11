// Hinata's arcade date — Web Audio. Her voice (HRTF, at the side she speaks from) and the night around you: the arcade (a muffled
// chiptune beat, game jingles and coin sounds all around), the cold street with its wind, the racing cabinet (engine + the fans'
// blast from the front), and the sound effects (automatic door, taiko don / ka, crash, crane claw, purikura countdown + shutter, a can
// dropping out of the vending machine). Base (voices, HRTF chain, helpers) copied from Demo31's audio.js. az: rad, 0 = front, + = right.
window.HTAudio = MoHeatEngine.audio({ verbSec: 1.6, verbGain: .16 }, (B) => {   // the base (voices, HRTF chain, helpers, mute, L/R check): demos/shared/engine/audio.js
  const { chain, noiseSrc, shot, burst, tone, loops, makeLoop } = B;
  function loop(kind) {
    if (!B.ac) return null; if (loops[kind]) return loops[kind];
    const nodes = []; let g, p, lp = null;
    if (kind === 'arcade') {       // the arcade: a muffled four-on-the-floor chiptune beat from far cabinets + random jingles / coins around you
      ({ g, p } = chain(0, 3, .4)); g.gain.value = 0;
      const crowd = noiseSrc(), cf = new BiquadFilterNode(B.ac, { type: 'bandpass', frequency: 700, Q: .5 }), cg = B.ac.createGain(); cg.gain.value = .25;
      crowd.connect(cf).connect(cg).connect(g); nodes.push(crowd);
      let beat = 0;
      const iv = setInterval(() => {
        if (!B.ac || g.gain.value < .01) return;
        beat++; tone(g, 55, .18, .5, 0, 'sine', .004); if (beat % 2 === 0) burst(g, .05, .18, 6000, 'highpass', .7);
        if (beat % 4 === 0) { const f = [523, 659, 784, 1047][Math.random() * 4 | 0]; tone(g, f, .12, .05, 0, 'square', .003); tone(g, f * 1.5, .12, .04, .12, 'square', .003); }
        if (Math.random() < .12) { const az = (Math.random() - .5) * 5, c = chain(az, 2 + Math.random() * 3, .3); [1319, 1568, 2093].forEach((f, i) => tone(c.g, f, .16, .05, i * .07, 'square', .002)); setTimeout(() => { c.g.disconnect(); c.p.disconnect(); }, 1200); }
        if (Math.random() < .08) { const c = chain((Math.random() - .5) * 5, 2.5, .2); tone(c.g, 3900, .25, .04, 0); tone(c.g, 5200, .2, .03, .08); setTimeout(() => { c.g.disconnect(); c.p.disconnect(); }, 900); }
      }, 260);
      nodes.push({ stop: () => clearInterval(iv), disconnect() {} });
    }
    if (kind === 'street') {       // the winter street: wind + a distant city hum
      ({ g, p } = chain(1.2, 1.5, .2)); g.gain.value = 0;
      lp = new BiquadFilterNode(B.ac, { type: 'bandpass', frequency: 480, Q: .5 });
      const s = noiseSrc(); s.connect(lp).connect(g); nodes.push(s);
      const hum = noiseSrc(), hf = new BiquadFilterNode(B.ac, { type: 'lowpass', frequency: 180 }), hg = B.ac.createGain(); hg.gain.value = .5; hum.connect(hf).connect(hg).connect(g); nodes.push(hum);
    }
    if (kind === 'engine') {       // the racing cabinet: an engine whine that revs + the fans' broadband blast from the front
      ({ g, p } = chain(0, .7, .1)); g.gain.value = 0;
      const o = new OscillatorNode(B.ac, { type: 'sawtooth', frequency: 90 }), of = new BiquadFilterNode(B.ac, { type: 'lowpass', frequency: 900 }), og = B.ac.createGain(); og.gain.value = .08;
      const lfo = new OscillatorNode(B.ac, { frequency: .35 }), lg = B.ac.createGain(); lg.gain.value = 60; lfo.connect(lg).connect(o.frequency); lfo.start();
      o.connect(of).connect(og).connect(g); o.start(); nodes.push(o, lfo);
      const fan = noiseSrc(), ff = new BiquadFilterNode(B.ac, { type: 'lowpass', frequency: 1400 }), fg = B.ac.createGain(); fg.gain.value = .55;
      const flfo = new OscillatorNode(B.ac, { frequency: .43 }), flg = B.ac.createGain(); flg.gain.value = .25; flfo.connect(flg).connect(fg.gain); flfo.start();
      fan.connect(ff).connect(fg).connect(g); nodes.push(fan, flfo);
    }
    return makeLoop(kind, g, p, lp, nodes);
  }


  const fx = {
    door: () => shot(-.1, 2.2, .3, (o, t) => { [880, 1175].forEach((f, i) => tone(o, f, .35, .07, i * .18)); const s = noiseSrc(), f = new BiquadFilterNode(B.ac, { type: 'bandpass', frequency: 900, Q: .6 }), g = B.ac.createGain(); g.gain.setValueAtTime(0, t + .3); g.gain.linearRampToValueAtTime(.3, t + .5); g.gain.linearRampToValueAtTime(0, t + 1.3); s.connect(f).connect(g).connect(o); s.stop(t + 1.4); }, 2),
    don: (v = 1) => shot(.45, 1.4, .15, (o) => { tone(o, 88, .32, .55 * v, 0, 'sine', .003); burst(o, .05, .35 * v, 260, 'lowpass', .8); }, .6),
    cheer: (az = 0) => shot(az, 1.2, .2, (o) => { [784, 988, 1175, 1568].forEach((f, i) => tone(o, f, .25, .06, i * .09, 'square', .003)); }, 1),
    crash: (az = .5) => shot(az, 1.2, .2, (o) => { burst(o, .4, .7, 500, 'lowpass', .8); burst(o, .2, .4, 2500, 'bandpass', 1); }, 1),
    coin: (az = -.3) => shot(az, 1, .2, (o) => { tone(o, 3900, .3, .05, 0); tone(o, 5200, .25, .04, .09); burst(o, .04, .2, 2500, 'bandpass', 3, .25); }, 1),
    whirr: () => shot(-.5, 1.2, .1, (o) => { const s = new OscillatorNode(B.ac, { type: 'square', frequency: 140 }), f = new BiquadFilterNode(B.ac, { type: 'lowpass', frequency: 600 }), g = B.ac.createGain(); g.gain.value = .03; s.connect(f).connect(g).connect(o); s.start(); s.stop(B.ac.currentTime + .25); }, .5),
    drop: () => shot(-.5, 1.3, .15, (o) => { tone(o, 300, .6, .04, 0, 'square', .01); burst(o, .08, .3, 800, 'bandpass', 1, .7); }, 1.2),
    clack: () => shot(-.5, 1.2, .15, (o) => { burst(o, .03, .6, 2600, 'bandpass', 3); tone(o, 900, .12, .05, .02, 'square', .002); }, .6),
    plop: () => shot(-.6, 1.3, .15, (o) => { burst(o, .12, .45, 380, 'lowpass', .8); burst(o, .06, .2, 900, 'bandpass', 1, .12); }, .8),
    jingle: () => shot(-.3, 1.4, .3, (o) => [1047, 1319, 1568, 2093, 1568, 2093].forEach((f, i) => tone(o, f, .22, .06, i * .1, 'square', .003)), 1.5),
    beep: (k = 1) => shot(0, 1, .1, (o) => tone(o, 1200 * k, .15, .08, 0, 'sine', .003), .4),
    shutter: () => shot(0, .8, .1, (o) => { burst(o, .03, .6, 3200, 'bandpass', 2); burst(o, .04, .45, 1800, 'bandpass', 2, .07); }, .5),
    can: (az = -.9) => shot(az, 1.6, .2, (o) => { burst(o, .12, .7, 300, 'lowpass', .8); tone(o, 170, .25, .25, 0, 'triangle', .005); burst(o, .05, .3, 2200, 'bandpass', 3, .5); }, 1),
    rustle: (az = 0, dist = .3) => shot(az, dist, .05, (o, t) => { const s = noiseSrc(), f = new BiquadFilterNode(B.ac, { type: 'bandpass', frequency: 1800, Q: .6 }), g = B.ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.4, t + .12); g.gain.linearRampToValueAtTime(0, t + .7); s.connect(f).connect(g).connect(o); s.stop(t + .8); }, .9),
  };
  return { loop, fx };
});
