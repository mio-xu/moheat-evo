// Pet-cam extras on top of Demo 11's NaomiAudio (loaded by path): the camera's own sounds (static, pan motor, talk chime,
// laser, food dispenser, IR-cut click, shutter) and the front door. Same AudioContext, HRTF placement, own output gain (muted together).
window.CamAudio = (() => {
  const NA = window.NaomiAudio;
  let ac = null, out = null, noise = null, motor = null;
  const rnd = (a, b) => a + Math.random() * (b - a);
  function init() {
    ac = NA.ctx() || NA.init();
    if (out) return ac;
    out = ac.createGain(); out.gain.value = .8; out.connect(ac.destination);
    const n = ac.sampleRate * 2; noise = ac.createBuffer(1, n, ac.sampleRate);
    const d = noise.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return ac;
  }
  function at(az = 0, dist = 1) {   // a placed one-shot bus
    const g = ac.createGain(), p = new PannerNode(ac, { panningModel: 'HRTF', distanceModel: 'inverse', refDistance: .6, rolloffFactor: .8 });
    p.positionX.value = Math.sin(az) * dist; p.positionZ.value = -Math.cos(az) * dist; p.positionY.value = 0;
    g.connect(p).connect(out); setTimeout(() => { g.disconnect(); p.disconnect(); }, 6000);
    return g;
  }
  function burst(o, dur, amp, f, type = 'bandpass', q = 1, t0 = 0) {
    const s = ac.createBufferSource(); s.buffer = noise; const fl = new BiquadFilterNode(ac, { type, frequency: f, Q: q }), g = ac.createGain(), t = ac.currentTime + t0;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + .004); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    s.connect(fl).connect(g).connect(o); s.start(t, rnd(0, 1.5), dur + .05);
  }
  function blip(o, f0, dur, amp, f1 = f0, t0 = 0, type = 'sine') {
    const osc = new OscillatorNode(ac, { frequency: f0, type }), g = ac.createGain(), t = ac.currentTime + t0;
    osc.frequency.setValueAtTime(f0, t); osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + .006); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    osc.connect(g).connect(o); osc.start(t); osc.stop(t + dur + .02);
  }
  const fx = {
    // connecting: radio static sweeping into the picture
    static(dur = 1.8) {
      if (!ac) return; const o = at(0, 1), s = ac.createBufferSource(); s.buffer = noise; s.loop = true;
      const f = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 2500, Q: .4 }), g = ac.createGain(), t = ac.currentTime;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.22, t + .08); g.gain.setValueAtTime(.22, t + dur - .3); g.gain.linearRampToValueAtTime(0, t + dur);
      f.frequency.setValueAtTime(4200, t); f.frequency.linearRampToValueAtTime(1200, t + dur);
      s.connect(f).connect(g).connect(o); s.start(t); s.stop(t + dur + .05);
      for (let i = 0; i < 4; i++) blip(o, rnd(700, 1400), .05, .05, rnd(500, 900), rnd(.1, dur - .2), 'square');
    },
    talkOn() { if (!ac) return; const o = at(0, 1); blip(o, 880, .09, .12, 880); blip(o, 1320, .12, .12, 1320, .09); },
    talkOff() { if (!ac) return; const o = at(0, 1); blip(o, 1320, .08, .1, 1320); blip(o, 880, .1, .1, 880, .08); },
    laser() { if (!ac) return; blip(at(0, 1), 2600, .08, .06, 2400); },
    shutter() { if (!ac) return; const o = at(0, .7); burst(o, .03, .5, 3500, 'highpass', .7); burst(o, .05, .35, 1800, 'bandpass', 1, .07); },
    irClick() { if (!ac) return; const o = at(0, .6); burst(o, .025, .6, 2200, 'bandpass', 2); burst(o, .02, .35, 1400, 'bandpass', 2, .11); },
    // automatic feeder next to the bowl: motor, kibble rattling down the chute, landing in the bowl
    feeder(az, dist) {
      if (!ac) return; const o = at(az, dist), t = ac.currentTime;
      const m = new OscillatorNode(ac, { type: 'sawtooth', frequency: 95 }), mf = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 420, Q: 1.2 }), mg = ac.createGain();
      mg.gain.setValueAtTime(0, t); mg.gain.linearRampToValueAtTime(.12, t + .1); mg.gain.setValueAtTime(.12, t + 1.3); mg.gain.linearRampToValueAtTime(0, t + 1.5);
      m.connect(mf).connect(mg).connect(o); m.start(t); m.stop(t + 1.6);
      for (let i = 0; i < 26; i++) burst(o, rnd(.012, .03), rnd(.12, .32), rnd(2200, 4800), 'bandpass', 3, .25 + rnd(0, 1.2));
      blip(o, 1250, .5, .06, 1240, .4); blip(o, 2810, .3, .03, 2800, .45);
    },
    // you, coming home: footsteps in the hall, keys, the lock, the door
    door(az, dist) {
      if (!ac) return 3; const o = at(az, dist);
      for (let i = 0; i < 4; i++) burst(o, .06, .35, 180, 'lowpass', .7, i * .42);
      for (let i = 0; i < 7; i++) blip(o, rnd(3800, 6200), rnd(.08, .16), .05, rnd(3600, 6000), 1.8 + rnd(0, .5), 'triangle');
      burst(o, .04, .6, 900, 'bandpass', 2, 2.5); burst(o, .05, .7, 600, 'bandpass', 2, 2.62);
      const t = ac.currentTime + 2.95, c = new OscillatorNode(ac, { type: 'sawtooth', frequency: 160 }), cf = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 900, Q: 6 }), cg = ac.createGain();
      c.frequency.setValueAtTime(160, t); c.frequency.linearRampToValueAtTime(240, t + .5); c.frequency.linearRampToValueAtTime(190, t + .9);
      cg.gain.setValueAtTime(0, t); cg.gain.linearRampToValueAtTime(.05, t + .1); cg.gain.linearRampToValueAtTime(0, t + .95);
      c.connect(cf).connect(cg).connect(o); c.start(t); c.stop(t + 1);
      return 3;
    },
  };
  // pan motor: a soft whirr while the camera turns (level = speed 0..1); it sits inside the camera, so in front of you
  function motorLevel(v) {
    if (!ac) return;
    if (!motor) {
      const s = ac.createBufferSource(); s.buffer = noise; s.loop = true;
      const f = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 1300, Q: 2 }), g = ac.createGain(); g.gain.value = 0;
      const osc = new OscillatorNode(ac, { type: 'triangle', frequency: 180 }), og = ac.createGain(); og.gain.value = .25;
      const p = new PannerNode(ac, { panningModel: 'HRTF' }); p.positionZ.value = -.5;
      s.connect(f).connect(g); osc.connect(og).connect(g); g.connect(p).connect(out); s.start(); osc.start();
      motor = { g, osc };
    }
    motor.g.gain.setTargetAtTime(.05 * Math.min(1, v), ac.currentTime, .05);
    motor.osc.frequency.setTargetAtTime(150 + 90 * Math.min(1, v), ac.currentTime, .05);
  }
  // the electric fan: motor hum + blade swish at the fan, and its breeze at the direction it blows
  let fanN = null;
  function fan(level = 0, az = 0, aimAz = 0, dist = 2) {
    if (!ac) return;
    if (!fanN) {
      if (!level) return;
      const mk = () => { const p = new PannerNode(ac, { panningModel: 'HRTF', distanceModel: 'inverse', refDistance: .6, rolloffFactor: .8 }); p.connect(out); return p; };
      const p1 = mk(), p2 = mk(), g1 = ac.createGain(), g2 = ac.createGain(); g1.gain.value = 0; g2.gain.value = 0; g1.connect(p1); g2.connect(p2);
      const n1 = ac.createBufferSource(); n1.buffer = noise; n1.loop = true; const f1 = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 700, Q: .8 });
      const hum = new OscillatorNode(ac, { type: 'triangle', frequency: 100 }), hg = ac.createGain(); hg.gain.value = .15;
      const am = new OscillatorNode(ac, { frequency: 18 }), amg = ac.createGain(); amg.gain.value = .25; const swish = ac.createGain(); swish.gain.value = .75; am.connect(amg).connect(swish.gain);
      n1.connect(f1).connect(swish).connect(g1); hum.connect(hg).connect(g1);
      const n2 = ac.createBufferSource(); n2.buffer = noise; n2.loop = true; const f2 = new BiquadFilterNode(ac, { type: 'lowpass', frequency: 1100 });
      n2.connect(f2).connect(g2); n1.start(); n2.start(0, .7); hum.start(); am.start();
      fanN = { p1, p2, g1, g2 };
    }
    const t = ac.currentTime, put = (p, a, d) => { p.positionX.setTargetAtTime(Math.sin(a) * d, t, .08); p.positionZ.setTargetAtTime(-Math.cos(a) * d, t, .08); };
    put(fanN.p1, az, dist); put(fanN.p2, aimAz, 1.3);
    fanN.g1.gain.setTargetAtTime(.22 * level, t, .15); fanN.g2.gain.setTargetAtTime(.32 * level, t, .15);
  }
  function setMuted(m) { if (out) out.gain.setTargetAtTime(m ? 0 : .8, ac.currentTime, .05); }
  return { init, fx, motorLevel, fan, setMuted };
})();
