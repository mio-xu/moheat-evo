// 『てんにょ様は、未来から』 A Celestial from the Future — crossover ③, for-women, an invented palace of the East.
// Story, answers, free talk = lines.js; thermal = media/plan.js; art = media/layers.js; engine = ../../shared/story.js. Rule card:
// project/script.md §2 (the mirror's flash and the ring of light have NO temperature; every other warm / cool is a real thing).
(() => {
  const S = window.MoHeatStory; const W = 1920, H = 1080;
  const rnd = (a, b) => a + Math.random() * (b - a), cf = () => window.MoHeatLayers?.flicker?.() ?? 1;
  const ribbons = Array.from({ length: 16 }, () => ({ x: Math.random() * W * .55, y: rnd(.1, .85) * H, s: rnd(.6, 1.2), ph: rnd(0, 6) }));
  S.run({
    ns: 'PALACE', live: window.PALACE_LIVE, data: window.PALACE_LINES, voice: window.PALACE_VOICE, bg: '#0c1020',
    samplePlace: (end) => ['chamber', 'terrace', 'corridor'][end] || 'dawn',
    loops: { window: { kind: 'wind', dist: 3, gain: .5 }, brazier: { kind: 'fire', dist: 1.6, gain: 1.1 }, wind: { kind: 'wind', dist: 1, gain: .85 }, night: { kind: 'wind', dist: 3, gain: .4 } },
    beds: { pond: [], chamber: [['room', 'room', 0, 3, .28]], terrace: [['room', 'room', 0, 4, .12]], corridor: [['room', 'room', 0, 4, .2]], dawn: [] },
    sfx: {
      '@mirror': (f) => f.magic(0, 1), '@plunge': (f) => { f.splash(0, .4); f.thud(0, .4); setTimeout(() => f.whoosh(0, 1.6, .3), 150); },
      '@pulled_out': (f) => f.splash(0, .5), '@cloak': (f) => { f.rustle(-1.2, .25); setTimeout(() => f.rustle(1.2, .25), 180); },
      '@stoke': (f) => f.flare(.7, 1.2), '@warmer_right': (f) => f.rustle(1.2, .25), '@warmer_off': (f) => f.rustle(1.2, .3),
      '@by_incense': (f) => f.rustle(.6, .4), '@fan_right': (f) => { for (const t of [0, 420, 840]) setTimeout(() => f.swish(1.2, .25), t); },
      '@lean_left': (f) => f.rustle(-1.2, .3), '@torches': (f) => { f.steps(-1.4, 1.4, 12, 3.5, true); }, '@sunrise': (f) => f.chime(0),
    },
    draw(E, dt) {
      const c = E.ctx, Sx = E.S, K = E.K, v = Sx.view, pl = E.place(), t = Sx.t, fl = cf();
      if (pl === 'pond' || pl === 'dawn') E.fall(dt, pl === 'pond' ? .45 : .15, { wind: .05 });
      if (pl === 'pond') {
        const f = Math.exp(-Math.max(0, t - (Sx.ev['@mirror'] ?? -9)) * 1.1); if (f > .02) { E.glow(W * .5, H * .5, W * .7, '205,225,255', .8 * f); }
        const w = K.water || 0, pk = K['@plunge'] || 0;                        // under the ice: dark blue water and bubbles, lifting as he pulls you out
        if (w > .02) { c.fillStyle = `rgba(16,44,110,${Math.min(.72, w * 1.2 + pk * .6)})`; c.fillRect(0, 0, W, H);
          if (Math.random() < 44 * dt * Math.min(1, w * 2)) E.puff({ x: W * rnd(.05, .95), y: H * 1.02, vx: rnd(-14, 14), vy: rnd(-300, -150), r: rnd(6, 20), grow: 3, max: 2.4, rgb: '210,235,255', a: .4, drag: .1 }); }
      }
      if (pl === 'chamber') {
        E.edge('left', '120,170,250', .45 * (K.window || 0) * 2, .28);
        const st = K['@stoke'] || 0;
        E.glow(W * .84, H * .62, W * (.16 + .34 * st), '255,130,50', (.3 * fl) * Math.min(1, (K.brazier || 0) * 3) + .85 * st);
        if ((K.brazier || 0) > .05 && Math.random() < (5 + 90 * st) * dt) E.spark(W * rnd(.78, .9), H * .6, { vy: rnd(-280 - 300 * st, -120), max: rnd(.7, 1.5) });
        if (st > .05) E.edge('right', '255,120,40', .55 * st, .5);
        if (v === 'chamber_J_ear' && (K.warmer || 0) > .05) { const [x, y] = E.toFrame('jin_warmer', W * .56, H * .62, 'char'); E.glow(x, y, 170, '255,150,70', .32 * fl); E.steam(dt, x, y - 40, 4, 30, { a: .14, r: 12 }); }
      }
      if (pl === 'terrace') {
        const w = K.wind || 0; c.save(); c.strokeStyle = '#d4e4ff'; c.lineCap = 'round';                   // the north wind from the left, in ribbons
        for (const r of ribbons) { r.x += (260 + 900 * w) * r.s * dt; if (r.x > W * .62) r.x = -200; c.globalAlpha = Math.min(1, w * 1.1) * .26 * (1 - r.x / (W * .7)); c.lineWidth = 2 * r.s; c.beginPath(); for (let i = 0; i <= 8; i++) { const x = r.x + i * 26, y = r.y + 12 * Math.sin(i * .7 + t * 2 + r.ph); i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); }
        c.restore();
        const inc = K.incense || 0, [x, y] = v === 'terrace_S_ear' ? [W * .745, H * .73] : [W * .765, H * .72];
        E.glow(x, y, 80, '255,140,60', (.5 * fl) * Math.min(1, inc * 4));
        if (inc > .03 && Math.random() < 13 * dt) E.puff({ x: x + rnd(-3, 3), y: y - 18, vx: 7 + Math.sin(t * 2) * 12 + (w > .2 ? 40 : 0), vy: -60, r: 6, grow: 8, max: 2.4, a: .33 });
        const fan = E.pulses.find((p) => p.name === '@fan_right');
        if (fan) { const k = 1 - fan.lev / .7; E.edge('right', '150,200,255', .55 * Math.min(1, fan.lev / .4), .4); if (Math.random() < 30 * dt) E.puff({ x: W * rnd(.6, .95), y: H * rnd(.25, .75), vx: rnd(300, 620), vy: rnd(-30, 30), r: 10, grow: 26, max: .8, rgb: '200,226,255', a: .3, drag: .4 }); void k; }
      }
      if (pl === 'corridor') {
        E.edge('right', '110,160,250', .4 * (K.night || 0) * 2, .3);
        const tr = E.pulses.find((p) => p.name === '@torches');
        if (tr) { const x = W * (.5 + Math.sin(tr.az * Math.PI / 180) * .48), a = Math.min(1, tr.lev / .2);                 // torches passing beyond the railing, left → right
          for (const dx of [-160, 0, 170]) { E.glow(x + dx, H * .58, 260, '255,140,60', .34 * a * fl); if (Math.random() < 10 * dt) E.spark(x + dx, H * .55, { vy: rnd(-90, -40), max: .7, r: 2.2 }); } }
      }
      if (pl === 'dawn') {
        E.glow(W * .5, H * .12, W * .7, '255,190,140', .28 * Math.min(1, (K.sun || 0) * 5));
        E.glow(W * .5, H * 1.02, W * .42, '180,220,255', .3 + .1 * Math.sin(t * 2));   // the ring of light in the thawing pond: a glow from below the frame (no temperature), never drawn across a person
      }
    },
  });
})();
