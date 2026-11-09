// 『なつやすみ、じいちゃんちの すいかわり』 Summer at Grandpa's: Watermelon Split — healing ⑧. Story data = lines.js; thermal = media/plan.js;
// art = media/layers.js; engine = ../../shared/story.js. Real-world sources only (heat, well-water towel, stream, cold melon, uchiwa, night fields, fan, voices).
(() => {
  const S = window.MoHeatStory, W = 1920, H = 1080, rnd = (a, b) => a + Math.random() * (b - a);
  const flies = Array.from({ length: 34 }, () => ({ x: Math.random() * W, y: rnd(.3, .95) * H, ph: rnd(0, 6), vx: rnd(-16, 16), vy: rnd(-10, 10), s: rnd(2, 3.4) }));
  const FIRST = { bus: 'bus_H', river: 'river_G', suika: 'yard_G', engawa: 'engawa_H', night: 'night_G' };
  let fanNext = 0, chimeNext = 3;
  function melonHalf(c, x, y, r, flip) {   // half a watermelon on the mat, cut face up
    c.save(); c.translate(x, y); c.scale(flip, 1);
    c.fillStyle = '#2f6b2a'; c.beginPath(); c.ellipse(0, 0, r, r * .62, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#d9efb0'; c.beginPath(); c.ellipse(0, -r * .03, r * .93, r * .55, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#e8413a'; c.beginPath(); c.ellipse(0, -r * .05, r * .86, r * .49, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#23180f'; for (const [a, d] of [[.4, .5], [1.2, .62], [2, .55], [2.8, .48], [3.6, .6], [4.3, .4], [5.1, .58], [5.8, .46]]) { c.beginPath(); c.ellipse(Math.cos(a) * r * d, -r * .05 + Math.sin(a) * r * d * .55, r * .05, r * .03, a, 0, 7); c.fill(); }
    c.restore();
  }
  S.run({
    ns: 'SUIKA', data: window.SUIKA_LINES, voice: window.SUIKA_VOICE, bg: '#12180f', sample: false, firstView: 'bus_H',
    preload: ['bus_H', 'bus_H_ear', 'river_G', 'river_G_melon', 'river_duo', 'yard_G', 'yard_duo', 'engawa_H', 'engawa_fan', 'engawa_duo', 'night_G', 'night_H', 'night_duo'],
    placeOf: { bus_H: 'bus', bus_H_ear: 'bus', river_G: 'river', river_G_melon: 'river', river_duo: 'river', yard_G: 'suika', yard_duo: 'suika', engawa_H: 'engawa', engawa_fan: 'engawa', engawa_duo: 'engawa', night_G: 'night', night_H: 'night', night_duo: 'night' },
    eventView: { '@melon_right': 'river_G_melon', '@fan_left': 'engawa_fan' },
    onStep: (st, i, E) => { E.S.view = FIRST[st.id]; },
    lineView: (st, who, pos, Sx) => {
      if (st.id === 'bus') return /_ear$/.test(pos) ? 'bus_H_ear' : 'bus_H';
      if (st.id === 'river') return who === 'H' ? 'river_duo' : Sx.ev['@melon_right'] != null ? 'river_G_melon' : 'river_G';
      if (st.id === 'suika') return Sx.split ? 'yard_duo' : 'yard_G';
      if (st.id === 'engawa') return who === 'G' ? 'engawa_duo' : /_ear$/.test(pos) ? 'engawa_fan' : 'engawa_H';
      return who === 'H' ? 'night_H' : 'night_G';
    },
    loops: { water: { kind: 'water', az: .5, dist: 2.4, gain: 1.6 }, fan: { kind: 'fan', dist: 1.2, gain: 1 } },
    beds: { bus: [['cicada', 'cicada', -.6, 4, .3]], river: [['cicada', 'cicada', -.6, 6, .12]], suika: [['cicada', 'cicada', .7, 5, .25]], engawa: [['crickets', 'night', 1, 4, .3]], night: [['crickets', 'night', -.8, 4, .5], ['frogs', 'night', 1, 6, .3]] },
    sfx: {
      '@towel_left': (f) => { f.pour(-1.2, .4, .7); setTimeout(() => f.rustle(-1.3, .15), 500); },
      '@splash_right': (f) => f.splash(1.2, .9), '@melon_right': (f) => f.thud(1.2, .3),
      '@blindfold': (f, E) => { E.S.dark = 1; f.rustle(0, .2); },
      '@fan_left': () => { fanNext = 0; }, '@net': (f) => f.rustle(0, .4),
    },
    onHold: (st, b, E) => { if (st.id === 'suika') { E.fx.thud(0, .8); E.fx.crack(0, .8); E.S.dark = 0; E.S.split = 1; E.S.view = 'yard_duo'; } if (st.id === 'night') { E.fx.bell(0, 1); } },
    outro: async (E) => { E.S.fade = 1; await E.sleep(2.4); E.fx.chime(0); await E.sleep(1.4); },
    update(dt, E) {
      const u = E.K.uchiwa || 0; if (u > .03) { fanNext -= dt; if (fanNext <= 0) { fanNext = .7; E.fx.swish(-1.2, .3); } }
      if (E.place() === 'engawa') { chimeNext -= dt; if (chimeNext <= 0) { chimeNext = rnd(4, 9); E.fx.bell(.1, 2.4); } }
    },
    draw(E, dt) {
      const c = E.ctx, Sx = E.S, K = E.K, pl = E.place(), t = Sx.t;
      if (pl === 'bus' || pl === 'suika') { E.glow(W * .6, 0, W * .7, '255,235,170', .16 * Math.min(1, (K.heat || 0) * 4)); }
      if (pl === 'bus' && (K.towel || 0) > .05) { E.edge('left', '120,190,255', .5 * Math.min(1, K.towel * 1.5), .3); if (Math.random() < 6 * dt) E.puff({ x: W * rnd(.02, .2), y: H * rnd(.5, .9), vx: rnd(4, 20), vy: 20, r: 18, grow: 18, max: 1.6, rgb: '200,230,255', a: .2 }); }
      if (pl === 'river') {
        c.save(); c.globalCompositeOperation = 'lighter'; for (let i = 0; i < 12; i++) { const x = W * (.1 + (i * 73 % 80) / 100), y = H * (.62 + (i * 41 % 34) / 100), a = .1 + .1 * Math.sin(t * 3 + i * 1.7); c.fillStyle = `rgba(255,255,230,${Math.max(0, a)})`; c.beginPath(); c.ellipse(x + 16 * Math.sin(t + i), y, 46, 5, 0, 0, 7); c.fill(); } c.restore();
        const sp = E.pulses.find((p) => p.name === '@splash_right'); if (sp && Math.random() < 90 * dt) E.spark(W * rnd(.7, .98), H * rnd(.55, .95), { rgb: '200,230,255', vy: rnd(-520, -200), vx: rnd(-160, 160), g: 900, max: rnd(.6, 1.1), r: rnd(3, 6) });
        if ((K.melon || 0) > .05) E.edge('right', '120,190,255', .5, .3);
      }
      if (pl === 'suika' && Sx.split) { melonHalf(c, W * .44, H * .86, 150, -1); melonHalf(c, W * .58, H * .87, 150, 1); }
      if (pl === 'engawa') {
        c.fillStyle = 'rgba(255,150,70,.12)'; c.fillRect(0, 0, W, H);
        const u = K.uchiwa || 0; if (u > .03) E.edge('left', '140,200,255', .36 * (.6 + .4 * Math.sin(t * 9)), .24);
      }
      if (pl === 'night') {
        c.save(); c.globalCompositeOperation = 'lighter';
        for (const f of flies) { f.x += (f.vx + 12 * Math.sin(t + f.ph)) * dt; f.y += (f.vy + 8 * Math.cos(t * 1.3 + f.ph)) * dt; if (f.x < 0) f.x = W; if (f.x > W) f.x = 0; const a = Math.max(0, Math.sin(t * 2.2 + f.ph)); E.glow(f.x, f.y, 26 * f.s * .4, '190,255,120', .9 * a); c.fillStyle = `rgba(230,255,170,${a})`; c.beginPath(); c.arc(f.x, f.y, f.s * .6, 0, 7); c.fill(); }
        if (Sx.hold) { E.glow(W * .5, H * .62, 220, '190,255,120', .6 + .2 * Math.sin(t * 5)); c.fillStyle = 'rgba(240,255,180,.95)'; c.beginPath(); c.arc(W * .5, H * .62, 7, 0, 7); c.fill(); }   // the firefly you cup
        c.restore();
        if (Sx.ev['@net'] != null) { c.save(); c.strokeStyle = 'rgba(210,225,255,.09)'; c.lineWidth = 1; for (let x = 0; x < W; x += 14) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); } for (let y = 0; y < H; y += 14) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); } c.restore(); }
      }
    },
  });
})();
