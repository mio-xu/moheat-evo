// PG.fx — light and particles on one canvas over the picture (under the dialogue sheets): what makes a still scene feel alive.
//   PG.fx.ambient('petals')        the air of a place, runs until changed (null = none)
//       petals · snow · snow_light · snow_heavy · dust (warm motes in a light beam) · fireflies · rain · sparkle · embers · steam (warm air rising) · drops (cool water)
//   PG.fx.light('lamp' | 'morning' | 'night' | null)   the light of the place over the picture: a warm lamp that flickers softly, morning sun, night blue
//   PG.fx.burst('star', 50, 40, 14)   a short burst at x %, y % of the frame: star · heart · note · confetti · spark
//   PG.fx.flash('#fff', 260)       a soft full-screen flash (scene change, perfect hit)
//   PG.fx.rays(true | false)       slow stage light rays behind the character
// Everything is code: no image files. Honour prefers-reduced-motion (ambient off, bursts kept small).
(() => {
  const PG = window.PG, rnd = (a, b) => a + Math.random() * (b - a), pick = (a) => a[Math.floor(Math.random() * a.length)];
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // ambient kinds: n = how many, then per-particle ranges (sizes in % of the frame width, speeds in frame heights / widths per second)
  const AMBIENT = {
    petals:    { n: 26, shape: 'petal', col: ['255,196,214', '255,221,232', '255,170,198'], size: [1.6, 3.2], vy: [.05, .11], vx: [-.06, -.02], sway: .035, spin: 1.6, a: [.55, .95] },
    snow:      { n: 46, shape: 'dot', col: ['255,255,255'], size: [.5, 1.5], vy: [.04, .1], vx: [-.012, .012], sway: .02, a: [.45, .95] },
    dust:      { n: 30, shape: 'glow', col: ['255,236,200', '255,250,235'], size: [.5, 1.3], vy: [-.018, -.004], vx: [-.008, .008], sway: .012, a: [.15, .7], twinkle: 1.2 },
    fireflies: { n: 16, shape: 'glow', col: ['220,255,150', '255,240,150'], size: [.9, 1.7], vy: [-.012, .012], vx: [-.02, .02], sway: .05, a: [.1, .95], twinkle: .7 },
    rain:      { n: 70, shape: 'streak', col: ['200,220,255'], size: [.18, .3], vy: [1.1, 1.6], vx: [-.16, -.1], sway: 0, a: [.2, .5] },
    sparkle:   { n: 20, shape: 'star', col: ['255,255,255', '255,240,200'], size: [.8, 2], vy: [-.006, .006], vx: [-.004, .004], sway: 0, a: [0, .9], twinkle: 1.6 },
    snow_light: { n: 18, shape: 'dot', col: ['255,255,255'], size: [.4, 1.2], vy: [.03, .07], vx: [-.01, .01], sway: .02, a: [.4, .9] },
    snow_heavy: { n: 110, shape: 'dot', col: ['255,255,255'], size: [.5, 1.8], vy: [.08, .17], vx: [-.04, .01], sway: .03, a: [.5, 1] },
    steam:     { n: 14, shape: 'glow', col: ['255,255,255', '255,245,235'], size: [2.2, 4.5], vy: [-.05, -.02], vx: [-.006, .006], sway: .02, a: [.04, .22], twinkle: .5 },
    drops:     { n: 22, shape: 'dot', col: ['190,225,255', '220,240,255'], size: [.35, .8], vy: [.12, .22], vx: [0, 0], sway: 0, a: [.35, .8] },
    embers:    { n: 22, shape: 'glow', col: ['255,170,80', '255,210,120'], size: [.5, 1.2], vy: [-.09, -.03], vx: [-.015, .02], sway: .03, a: [.2, .9], twinkle: 2.4 },
  };
  const BURST = { star: ['255,255,255', '255,236,170'], heart: ['255,130,170', '255,180,205'], note: ['255,255,255'], confetti: ['255,120,160', '255,210,90', '140,200,255', '190,150,255', '255,255,255'], spark: ['255,255,255', '255,225,240'] };
  let cv, c, amb = null, ps = [], bursts = [], raf = 0, last = 0, flashEl, raysEl;

  const size = () => { const r = PG.app.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1); if (cv.width !== Math.round(r.width * d)) { cv.width = Math.round(r.width * d); cv.height = Math.round(r.height * d); } return [cv.width, cv.height]; };
  const spawn = (k, any) => ({ x: Math.random(), y: any ? Math.random() : (k.vy[0] + k.vy[1] > 0 ? -.05 : 1.05), s: rnd(...k.size), vx: rnd(...k.vx), vy: rnd(...k.vy), col: pick(k.col), a: rnd(...k.a), ph: rnd(0, 6.28), rot: rnd(0, 6.28), k });

  function shape(kind, x, y, r, rot, rgb, a) {
    c.save(); c.translate(x, y); c.rotate(rot); c.fillStyle = `rgba(${rgb},${a})`;
    if (kind === 'petal') { c.beginPath(); c.moveTo(0, -r); c.bezierCurveTo(r * .9, -r * .6, r * .7, r * .7, 0, r); c.bezierCurveTo(-r * .7, r * .7, -r * .9, -r * .6, 0, -r); c.fill(); }
    else if (kind === 'glow') { const g = c.createRadialGradient(0, 0, 0, 0, 0, r * 2.6); g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(.35, `rgba(${rgb},${a * .45})`); g.addColorStop(1, `rgba(${rgb},0)`); c.fillStyle = g; c.fillRect(-r * 2.6, -r * 2.6, r * 5.2, r * 5.2); }
    else if (kind === 'streak') { c.fillRect(-r / 2, 0, r, r * 26); }
    else if (kind === 'star') { c.beginPath(); for (let i = 0; i < 8; i++) { const rr = i % 2 ? r * .28 : r, an = i * Math.PI / 4; c.lineTo(Math.cos(an) * rr, Math.sin(an) * rr); } c.fill(); }
    else if (kind === 'heart') { c.beginPath(); c.moveTo(0, r * .9); c.bezierCurveTo(-r * 1.5, -r * .2, -r * .7, -r * 1.2, 0, -r * .45); c.bezierCurveTo(r * .7, -r * 1.2, r * 1.5, -r * .2, 0, r * .9); c.fill(); }
    else if (kind === 'note') { c.font = `700 ${r * 2.6}px sans-serif`; c.textAlign = 'center'; c.fillText('♪', 0, r); }
    else if (kind === 'confetti') { c.fillRect(-r * .5, -r * .9, r, r * 1.8); }
    else { c.beginPath(); c.arc(0, 0, r, 0, 6.3); c.fill(); }
    c.restore();
  }

  function frame(now) {
    raf = 0; const dt = Math.min(.05, (now - last) / 1000 || .016), [W, H] = size(), U = PG.unit(W, H), t = now / 1000; last = now; c.clearRect(0, 0, W, H);
    if (amb) for (let i = 0; i < ps.length; i++) {
      const p = ps[i], k = p.k; p.x += (p.vx + Math.sin(t * 1.3 + p.ph) * k.sway) * dt; p.y += p.vy * dt; if (k.spin) p.rot += k.spin * dt * (p.ph > 3 ? 1 : -1);
      if (p.y > 1.08 || p.y < -.08 || p.x < -.1 || p.x > 1.1) { ps[i] = spawn(k, false); if (k.vx[0] + k.vx[1] < -.05 && Math.random() < .5) { ps[i].x = 1.05; ps[i].y = Math.random() * .8; } continue; }
      const a = k.twinkle ? p.a * (.5 + .5 * Math.sin(t * k.twinkle * 2 + p.ph * 3)) : p.a;
      shape(k.shape, p.x * W, p.y * H, p.s / 100 * U, k.shape === 'streak' ? -.1 : p.rot, p.col, Math.max(0, a));
    }
    bursts = bursts.filter((b) => (b.age += dt) < b.life);
    for (const b of bursts) { b.vy += b.g * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.rot += b.spin * dt; const k = b.age / b.life; shape(b.kind, b.x * W, b.y * H, b.s / 100 * U * (b.kind === 'spark' ? 1 - k : 1), b.rot, b.col, k < .7 ? 1 : (1 - k) / .3); }
    if (amb || bursts.length) raf = requestAnimationFrame(frame);
  }
  const run = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } };

  PG.fx = {
    init() { cv = PG.$('fxcv'); c = cv.getContext('2d'); flashEl = PG.$('flash'); raysEl = PG.$('rays'); },
    ambient(kind) { const k = AMBIENT[kind]; if ((k || null) === amb) return; amb = k || null; ps = amb && !still ? Array.from({ length: amb.n }, () => spawn(amb, true)) : []; if (!amb && !bursts.length && c) c.clearRect(0, 0, cv.width, cv.height); run(); },
    /** kind at x %, y % of the frame; n pieces. A pointer event may be given instead of x, y. */
    burst(kind, x = 50, y = 45, n = 12) {
      if (x && x.clientX != null) { const r = PG.app.getBoundingClientRect(); y = (x.clientY - r.top) / r.height * 100; x = (x.clientX - r.left) / r.width * 100; }
      const up = kind === 'heart' || kind === 'note'; n = still ? Math.min(n, 4) : n;
      for (let i = 0; i < n; i++) { const an = rnd(0, 6.28), sp = rnd(.12, .5) * (kind === 'confetti' ? 1.5 : 1);
        bursts.push({ kind, x: x / 100 + rnd(-.03, .03), y: y / 100 + rnd(-.02, .02), vx: Math.cos(an) * sp * (up ? .35 : .6), vy: up ? -rnd(.12, .32) : Math.sin(an) * sp * .45 - (kind === 'confetti' ? .35 : .1),
          g: up ? -.05 : kind === 'confetti' ? .7 : .35, s: rnd(1.2, 2.8) * (kind === 'spark' ? .6 : 1), rot: rnd(0, 6.28), spin: kind === 'confetti' ? rnd(-9, 9) : kind === 'star' ? rnd(-2, 2) : 0, col: pick(BURST[kind] || BURST.spark), age: 0, life: rnd(.7, 1.3) * (kind === 'confetti' ? 1.8 : 1) }); }
      run();
    },
    flash(color = '#fff', ms = 260, strength = .7) { if (!flashEl) return; flashEl.style.transition = 'none'; flashEl.style.background = color; flashEl.style.opacity = still ? strength * .4 : strength; void flashEl.offsetWidth; flashEl.style.transition = `opacity ${ms}ms ease-out`; flashEl.style.opacity = 0; },
    rays(on) { if (raysEl) raysEl.classList.toggle('on', !!on && !still); },
    light(kind) {
      let el = PG.$('pglight'); if (!el) { el = document.createElement('div'); el.id = 'pglight'; const sh = PG.$('shade'); if (sh) sh.after(el); else return; }
      el.className = kind ? 'on ' + kind : '';
    },
  };
})();
