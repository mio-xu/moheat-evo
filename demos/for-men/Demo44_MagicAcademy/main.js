// 『まちがい召喚と、まほう学院の三人』 Summoned by Mistake — crossover ②, for-men, an invented storybook academy of magic.
// Everything but the effects below is data: lines.js (story, answers, free talk), media/plan.js (thermal plan), media/layers.js (art);
// the engine is ../../shared/story.js. World rule card: project/script.md §2 (circle light has NO temperature; fire only from real
// flames; ice magic = real ice crystals; broom wind ∝ speed; colours: cold blue-white, hot orange-red).
(() => {
  const S = window.MoHeatStory, A = S.audio;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const cf = () => window.MoHeatLayers?.flicker?.() ?? 1;
  const W = 1920, H = 1080;
  let orbitNext = 0;
  function crystal(c, x, y, s, a, rot) {   // one ice crystal: a faceted blue-white shard
    if (a <= .01 || s <= 1) return;
    c.save(); c.translate(x, y); c.rotate(rot); c.globalAlpha = a;
    const g = c.createLinearGradient(0, -s, 0, s); g.addColorStop(0, '#f4fbff'); g.addColorStop(.5, '#a8d8ff'); g.addColorStop(1, '#5fa8ee');
    c.fillStyle = g; c.beginPath(); c.moveTo(0, -s); c.lineTo(s * .42, -s * .3); c.lineTo(s * .3, s * .7); c.lineTo(0, s); c.lineTo(-s * .3, s * .7); c.lineTo(-s * .42, -s * .3); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = Math.max(1, s * .05); c.beginPath(); c.moveTo(0, -s); c.lineTo(0, s); c.moveTo(-s * .42, -s * .3); c.lineTo(s * .42, -s * .3); c.stroke();
    c.restore();
  }
  S.run({
    ns: 'ACAD', preload: ['lab_C_blow', 'end_T', 'end_C', 'end_L'],   /* views the steps don't list: decoded before their first cut */ live: window.ACAD_LIVE, data: window.ACAD_LINES, voice: window.ACAD_VOICE, bg: '#0c0e1c',
    eventView: { '@blow_right': 'lab_C_blow' },
    samplePlace: (end) => ['hall', 'lab', 'tower'][end] || 'dawn',
    // sound follows the thermal source
    loops: { brazier_L: { kind: 'fire', dist: 2.2, gain: 1 }, brazier_R: { kind: 'fire', dist: 2.2, gain: 1 }, wind: { kind: 'wind', dist: 1, gain: .9 }, furnace: { kind: 'fire', dist: 1.8, gain: 1.1 }, fire: { kind: 'fire', dist: 1.8, gain: .9 }, night: { kind: 'wind', dist: 2.5, gain: .25 } },
    beds: { hall: [['room', 'room', 0, 3, .3]], lab: [['room', 'room', 0, 3, .22], ['pot', 'bubble', .95, 1.6, .28]], tower: [['room', 'room', 0, 3, .2], ['cricket', 'night', 1.3, 4, .25]], dawn: [['room', 'room', 0, 3, .1]] },
    sfx: {
      '@circle': (f) => f.magic(0, 1.4),
      '@lean_left': (f) => f.rustle(-1.2, .3), '@lean_right': (f) => f.rustle(1.2, .3),
      '@takeoff': (f) => f.whoosh(0, 2, .5),
      '@dive': (f) => f.whoosh(0, 3.2, .4),
      '@turn_left': (f) => f.gust(-1.45, 1.45, 1.7),
      '@flare': (f) => f.flare(.5, 1.2),
      '@mug_right': (f) => f.rustle(1.2, .25),
      '@blow_right': (f) => f.blow(1.35, 1.9),
      '@sip': (f) => f.sip(),
      '@crystal_show': (f) => f.sparkle(0, .8, 10),
      '@orbit': (f) => { f.sparkle(0, .5, 6); orbitNext = 0; },
      '@into_glass': (f) => { f.clink(0, .5); setTimeout(() => f.pour(0, .5, .5), 120); },
      '@sunrise': (f) => f.chime(.5),
      '@brazier': (f) => f.flare(-1, 2),
    },
    update(dt, E) {   // the ice crystals sound where they are as they circle your head
      const o = E.pulses.find((p) => p.name === '@orbit');
      if (o) { orbitNext -= dt; if (orbitNext <= 0) { orbitNext = .55; E.fx.sparkle(o.az * Math.PI / 180, .35, 4); if (Math.random() < .5) E.fx.crack(o.az * Math.PI / 180, .3); } }
    },
    draw(E, dt) {
      const c = E.ctx, Sx = E.S, K = E.K, v = Sx.view, pl = E.place(), t = Sx.t, fl = cf();
      if (pl === 'hall') {
        const flash = Math.exp(-Math.max(0, t - (Sx.ev['@circle'] ?? -9)) * .9);
        E.glow(W * .5, H * .8, W * .5, '130,170,255', .09 + .05 * Math.sin(t * 1.6) + .55 * flash);
        for (const x of [.073, .927]) { E.glow(W * x, H * .46, W * .1, '255,150,70', (.16 + .1 * fl) * ((x < .5 ? K.brazier_L : K.brazier_R) || 0) * 4); if (Math.random() < 5 * dt) E.spark(W * x + rnd(-14, 14), H * .44, { vy: rnd(-200, -110) }); }
      }
      if (pl === 'sky') {   // speed lines from the point you fly towards; thicker and brighter with the wind (dive, peak)
        const w = K.wind || 0, n = Math.round(30 + 90 * w), cx = W * .55, cy = H * .42;
        c.save(); c.strokeStyle = '#e4f0ff'; c.lineCap = 'round';
        for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, r0 = rnd(.2, .9) * W * .6, len = (80 + 560 * w) * rnd(.4, 1); c.globalAlpha = (.08 + .34 * w) * rnd(.3, 1); c.lineWidth = 1 + 2.4 * w * Math.random(); c.beginPath(); c.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0 * .7); c.lineTo(cx + Math.cos(a) * (r0 + len), cy + Math.sin(a) * (r0 + len) * .7); c.stroke(); }
        c.restore();
        const turn = E.pulses.find((p) => p.name === '@turn_left');   // the wind swings across you: a blue band crossing the frame
        if (turn) { const x = W * (.5 + Math.sin(turn.az * Math.PI / 180) * .45); E.glow(x, H * .5, W * .3, '150,200,255', .45 * turn.lev); }
      }
      if (pl === 'lab') {
        E.edge('left', '120,180,255', .55 * (K.cabinet || 0)); E.glow(W * .18, H * .55, W * .17, '150,205,255', .55 * (K.cabinet || 0));
        if ((K.cabinet || 0) > .05 && Math.random() < 9 * dt) E.puff({ x: W * rnd(.09, .27), y: H * rnd(.72, .88), vx: rnd(10, 40), vy: rnd(10, 26), r: 40, grow: 34, max: 3.4, rgb: '205,232,255', a: .26, drag: .2 });   // frost mist sinking out of the cold cabinet
        const flare = K['@flare'] || 0;
        E.glow(W * .86, H * .78, W * (.2 + .34 * flare), '255,130,50', (.32 * fl) * Math.min(1, (K.furnace || 0) * 3) + .85 * flare);
        if (flare > .1 && Math.random() < 90 * dt * flare) E.spark(W * rnd(.72, .96), H * rnd(.62, .9), { vy: rnd(-420, -180), vx: rnd(-160, 40), max: rnd(.6, 1.3) });
        if ((K.furnace || 0) > .05 && Math.random() < 6 * dt) E.spark(W * rnd(.82, .98), H * .9, {});
        if (flare > .05) E.edge('right', '255,120,40', .5 * flare, .5);
        if ((v === 'lab_C_ear' || v === 'lab_C_blow') && (K.mug || 0) > .05) E.steam(dt, W * .655, H * .68, 9, 90, { a: .3, r: 18 });
        if (v === 'lab_C_blow') { const b = E.pulses.find((p) => p.name === '@blow_right'); if (b && Math.random() < 34 * dt) E.puff({ x: W * .615, y: H * .445, vx: rnd(120, 300), vy: rnd(30, 120), r: 10, grow: 44, max: 1.1, rgb: '190,226,255', a: .34, drag: .9 }); }   // her breath, cool blue, towards your right cheek
      }
      if (pl === 'tower' || pl === 'dawn') {
        const fire = K.fire || 0, night = K.night || 0, sun = K.sun || 0;
        E.glow(W * .07, H * .74, W * .17, '255,150,70', (.4 * fl) * Math.min(1, fire * 3));
        if (fire > .05 && Math.random() < 7 * dt) E.spark(W * rnd(.04, .1), H * .72, { vy: rnd(-200, -100) });
        E.edge('right', '110,160,255', .34 * night, .28);
        if (pl === 'dawn') { E.glow(W * .88, H * .24, W * .5, '255,196,130', .34 * Math.min(1, sun * 3)); E.glow(W * .5, H * 1.02, W * .5, '170,205,255', .34 * Math.min(1, sun * 3) * (.8 + .2 * Math.sin(t * 2))); }
        const show = E.pulses.find((p) => p.name === '@crystal_show');
        if (show && v === 'tower_L') {   // the first crystal forms slowly in her palm (real ice: rule card)
          const k = Math.min(1, show.lev / .3), [x, y] = E.toFrame('luna_tower', W * .29, H * .405, 'char');
          E.glow(x, y, 120, '170,215,255', .5 * k); crystal(c, x, y, 62 * k, Math.min(1, k * 1.5), Math.sin(t * 1.2) * .25);
          if (Math.random() < 12 * dt) E.spark(x + rnd(-50, 50), y + rnd(-50, 50), { rgb: '210,235,255', vy: rnd(-40, 20), vx: rnd(-30, 30), max: 1, r: 2 });
        }
        const orb = E.pulses.find((p) => p.name === '@orbit');
        if (orb) for (let i = 0; i < 6; i++) {   // the crystals circling your head: on-screen = an ellipse round you; near your face (front) = bigger
          const a = (orb.az - i * 16) * Math.PI / 180, x = W * .5 + Math.sin(a) * W * .46, y = H * .55 - Math.cos(a) * H * .2 - i * 3, near = .55 + .45 * Math.cos(a);
          crystal(c, x, y, (34 + 44 * near) * (1 - i * .08), Math.min(1, orb.lev / .4) * (.45 + .55 * near) * (1 - i * .1), t * 3 + i); E.glow(x, y, 90 * near + 30, '170,215,255', .2 * near);
          if (i === 0 && Math.random() < 22 * dt) E.spark(x, y, { rgb: '210,235,255', vy: rnd(-30, 40), vx: rnd(-40, 40), max: .8, r: 2.4 });
        }
        if ((K.glass || 0) > .02 && v === 'tower_L_ear' && Math.random() < 5 * dt) E.puff({ x: W * .545, y: H * .7, vx: rnd(-10, 10), vy: rnd(8, 22), r: 12, grow: 14, max: 1.6, rgb: '210,235,255', a: .22 });   // the cold glass: a thread of mist
      }
    },
  });
})();
