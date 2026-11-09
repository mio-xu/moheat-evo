// 『竜の王と、エルフの王と、小悪魔』 The Dragon King, the Elf King and the Little Devil — crossover ④, for-women, storybook fantasy.
// Story, answers, free talk = lines.js; thermal = media/plan.js; art = media/layers.js; engine = ../../shared/story.js. Rule card:
// project/script.md §2 (black smoke and the glowing book: NO temperature; one special setting: a dragon's wing holds fire inside, told
// by Gaku (g07) and shown as an orange glow through the membrane; everything else is a real warm / cool source).
(() => {
  const S = window.MoHeatStory; const W = 1920, H = 1080;
  const rnd = (a, b) => a + Math.random() * (b - a), cf = () => window.MoHeatLayers?.flicker?.() ?? 1;
  const stars = Array.from({ length: 70 }, () => ({ x: Math.random() * W, y: rnd(.62, .96) * H, s: rnd(.8, 2.4), ph: rnd(0, 6) }));
  // his dark horns read against the night: a cool rim light on each horn (user note on the first art review)
  const HORNS = { valley_G: ['gaku_valley', [[.270, .058], [.345, .052]]], valley_G_wing: ['gaku_wing', [[.205, .04], [.445, .05]]] };
  S.run({
    ns: 'DRAGON', preload: ['end_H', 'end_G', 'end_R'],   /* views the steps don't list: decoded before their first cut */ live: window.DRAGON_LIVE, data: window.DRAGON_LINES, voice: window.DRAGON_VOICE, bg: '#0f0d1c',
    eventView: { '@wing': 'valley_G_wing' },
    holdSide: (st) => (st.id === 'valley' ? 'right' : ''),
    samplePlace: (end) => ['study', 'valley', 'lake'][end] || 'dawn',
    loops: { fire: { kind: 'fire', dist: 1.8, gain: 1.1 }, window: { kind: 'wind', dist: 3, gain: .5 }, wind: { kind: 'wind', dist: 1, gain: .9 }, beacon: { kind: 'fire', dist: 3.2, gain: 1.4 } },
    beds: { study: [['room', 'room', 0, 3, .26]], valley: [], lake: [['hum', 'hum', 0, 5, .12]], night: [['room', 'room', 0, 3, .22]], dawn: [['room', 'room', 0, 3, .12]] },
    sfx: {
      '@smoke': (f) => { f.magic(.2, 1); f.thud(0, 1.2); }, '@tea': (f) => f.clink(0, .4), '@tea_off': (f) => f.clink(.1, .6),
      '@takeoff_gust': (f) => { f.thud(0, .8); f.whoosh(0, 2.2, .3); }, '@breath': (f) => f.flare(0, 3),
      '@wing': (f) => { f.rustle(-1.2, .2); f.thud(-1.2, .4); }, '@song_near': (f) => f.steps(.9, .9, 5, 1.2, true), '@cloak': (f) => { f.rustle(1.2, .25); setTimeout(() => f.rustle(-1.2, .25), 180); },
      '@sunrise': (f) => f.chime(-.5),
    },
    draw(E, dt) {
      const c = E.ctx, Sx = E.S, K = E.K, v = Sx.view, pl = E.place(), t = Sx.t, fl = cf();
      if (pl === 'study' || pl === 'night') {
        if (pl === 'night') { c.fillStyle = 'rgba(8,8,26,.32)'; c.fillRect(0, 0, W, H); }
        const fire = K.fire || 0, win = K.window || 0, ear = /_ear$/.test(v);
        E.glow(W * (ear ? .875 : .885), H * .62, W * .17, '255,150,70', (.34 * fl) * Math.min(1, fire * 3));
        if (fire > .04 && Math.random() < 6 * dt) E.spark(W * rnd(.85, .92), H * .62, { vy: rnd(-200, -100) });
        E.glow(W * .2, H * .28, W * .18, '150,200,255', .34 * Math.min(1, win * 3));
        const sm = Sx.ev['@smoke'] ?? -9;                                                          // he appears in a puff of black smoke (no temperature)
        if (t - sm < 1.3 && Math.random() < 90 * dt) E.puff({ x: W * rnd(.3, .7), y: H * rnd(.4, .9), vx: rnd(-90, 90), vy: rnd(-120, -30), r: 60, grow: 120, max: 1.8, rgb: '18,12,30', a: .85, drag: .5 });
        if ((K.tea || 0) > .05 && v === 'study_H') E.steam(dt, W * .62, H * .6, 8, 40, { a: .26, r: 14 });
      }
      if (pl === 'valley') {
        const w = K.wind || 0, gust = K['@takeoff_gust'] || 0, br = K['@breath'] || 0, wing = K.wing || 0;
        E.fall(dt, .5 + w, { wind: .55 + 1.2 * gust, size: .8 });                                   // snow blown from the left; the downdraft flattens it
        if (gust > .05) { c.fillStyle = `rgba(210,228,255,${.28 * Math.min(1, gust * 2)})`; c.fillRect(0, 0, W, H); if (Math.random() < 40 * dt) E.puff({ x: W * rnd(.2, .8), y: H * .98, vx: rnd(-200, 200), vy: rnd(-120, -40), r: 40, grow: 90, max: 1.2, rgb: '230,238,255', a: .32, drag: .8 }); }
        if (br > .03) { E.glow(W * .47, H * .18, W * (.12 + .3 * br), '255,140,50', .9 * Math.min(1, br * 1.4)); if (Math.random() < 110 * dt * br) E.spark(W * rnd(.4, .55), H * rnd(.1, .3), { vy: rnd(-300, -100), vx: rnd(-140, 140), max: rnd(.6, 1.2) }); }
        if ((K.beacon || 0) > .03) { E.glow(W * .47, H * .18, W * .12, '255,150,60', (.5 * fl) * Math.min(1, K.beacon * 3)); if (Math.random() < 8 * dt) E.spark(W * rnd(.45, .49), H * .17, { vy: rnd(-120, -60), max: 1 }); }
        if (wing > .02) { E.edge('left', '255,120,40', .4 * Math.min(1, wing * 2.2), .28); E.glow(W * .09, H * .58, W * .16, '255,130,50', (.5 * fl) * Math.min(1, wing * 2.2)); }
      }
      if (HORNS[v]) { const [stem, pts] = HORNS[v]; c.save(); c.globalCompositeOperation = 'lighter'; for (const [px, py] of pts) { const [x, y] = E.toFrame(stem, W * px, H * py, 'char'); E.glow(x, y, 30, '160,195,255', .18); } c.restore(); }
      if (pl === 'lake') {
        c.save(); c.globalCompositeOperation = 'lighter';                                          // the aurora breathing; stars under the ice
        for (let i = 0; i < 3; i++) E.glow(W * (.25 + i * .28 + .05 * Math.sin(t * .3 + i)), H * .16, W * .34, i === 1 ? '80,255,170' : '110,120,255', .09 + .05 * Math.sin(t * .7 + i * 2));
        c.restore();
        c.fillStyle = '#dceaff'; for (const s of stars) { c.globalAlpha = .25 + .45 * (.5 + .5 * Math.sin(t * 2 + s.ph)); c.beginPath(); c.arc(s.x, s.y, s.s, 0, 7); c.fill(); } c.globalAlpha = 1;
        if ((K.cloak || 0) > .03) E.edge('right', '255,180,120', .12, .3);
      }
      if (pl === 'dawn') E.glow(W * .22, H * .2, W * .55, '255,196,140', .36 * Math.min(1, (K.sun || 0) * 5));
    },
  });
})();
