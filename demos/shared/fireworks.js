// shared/fireworks.js — far-away Japanese fireworks (hanabi) drawn on a 2D canvas, for any demo with a night sky.
// Shells rise from the horizon with a sparkling trail and burst into one of several shapes (peony, chrysanthemum with long trails,
// gold willow, ring, two-colour, twinkling senrin), drawn additively with fading trails and gravity. Everything is clipped to a
// "sky" so it never covers characters or props drawn into the picture. A sky is one rect [x0, y0, x1, y1] or a list of rects
// (their union; shells rise in the first one, sparks spreading into the others still show).
//
//   const fw = MoHeatFireworks.create();             // one per page
//   fw.salvo(sky, n, big)                            // sky = [x0, y0, x1, y1] in canvas px: n shells (staggered), big ≈ 1 normal, 1.5 grand
//   fw.update(dt); fw.draw(ctx, sky)                 // every frame, after the picture; sky = the clip rect for the current view (or null = skip)
//   fw.onBurst = (shell) => {}                        // optional: called when a shell opens ({x, y, col, big}) — flash light, boom sound…
//   fw.clear()
// First use: Demo31_SummerRooftop (2026-11-08, user: 「烟花不够华丽」).
window.MoHeatFireworks = (() => {
  const rnd = (a, b) => a + Math.random() * (b - a);
  const PAL = [[255, 96, 140], [255, 196, 90], [120, 200, 255], [190, 140, 255], [120, 255, 170], [255, 245, 220], [255, 120, 60]];
  const TYPES = ['peony', 'chrysanthemum', 'willow', 'ring', 'double', 'senrin'];
  function create() {
    const shells = [], parts = [], pending = [];
    const api = { onBurst: null };
    const rects = (sky) => (Array.isArray(sky[0]) ? sky : [sky]);
    function launch(sky, big = 1, type) {
      const [x0, y0, x1, y1] = rects(sky)[0], w = x1 - x0, h = y1 - y0;
      const tx = x0 + w * rnd(.15, .85), ty = y0 + h * rnd(.18, .45), sx = tx + rnd(-30, 30);
      shells.push({ x: sx, y: y1 + 20, tx, ty, vy: -(y1 + 20 - ty) / rnd(.9, 1.2), t: 0, big, type: type || TYPES[Math.random() * TYPES.length | 0],
        col: PAL[Math.random() * PAL.length | 0], col2: PAL[Math.random() * PAL.length | 0], trail: [] });
    }
    api.salvo = (sky, n = 1, big = 1) => { for (let i = 0; i < n; i++) pending.push({ at: i * rnd(.18, .45), sky, big }); };
    api.clear = () => { shells.length = parts.length = pending.length = 0; };
    api.active = () => shells.length + parts.length + pending.length > 0;
    function burst(s) {
      const R = (260 + Math.random() * 120) * s.big, base = s.type === 'senrin' ? 90 : 150, n = Math.round(base * Math.min(1.6, s.big));
      const life = s.type === 'willow' ? rnd(2.6, 3.2) : s.type === 'chrysanthemum' ? rnd(1.9, 2.3) : rnd(1.4, 1.8);
      for (let i = 0; i < n; i++) {
        const drag = s.type === 'willow' ? 1.6 : 2.4;
        let a = (i / n) * Math.PI * 2 + rnd(-.04, .04), sp = R * drag;   // with drag d a particle travels v0 / d → it reaches R (v1 used R / life · 1.6 and stopped at ~40 % of R)
        if (s.type === 'peony' || s.type === 'chrysanthemum' || s.type === 'willow' || s.type === 'senrin') sp *= Math.cbrt(rnd(.35, 1));   // a filled sphere
        if (s.type === 'ring') sp *= rnd(.95, 1.02);
        const col = s.type === 'willow' ? [255, 200, 110] : s.type === 'double' && i % 2 ? s.col2 : s.col;
        parts.push({ x: s.x, y: s.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * (s.type === 'ring' ? .55 : 1), life, t: 0, col,
          drag, g: s.type === 'willow' ? 70 : 42, trail: [], tlen: s.type === 'chrysanthemum' ? 9 : s.type === 'willow' ? 14 : 5,
          twinkle: s.type === 'senrin' || Math.random() < .12, size: s.type === 'senrin' ? 3.2 : 2.4 });
      }
      if (s.type === 'double' || s.big > 1.2) for (let i = 0; i < 40; i++) {   // an inner core of a second colour
        const a = Math.random() * 7, sp = R * 2.6 * .45 * rnd(.4, 1);
        parts.push({ x: s.x, y: s.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1.3, t: 0, col: s.col2, drag: 2.6, g: 40, trail: [], tlen: 4, twinkle: false, size: 2.2 });
      }
      api.onBurst?.({ x: s.x, y: s.y, col: s.col, big: s.big });
    }
    api.update = (dt) => {
      for (let i = pending.length - 1; i >= 0; i--) { pending[i].at -= dt; if (pending[i].at <= 0) { launch(pending[i].sky, pending[i].big); pending.splice(i, 1); } }
      for (let i = shells.length - 1; i >= 0; i--) {
        const s = shells[i]; s.t += dt; s.trail.push([s.x, s.y]); if (s.trail.length > 10) s.trail.shift();
        s.x += (s.tx - s.x) * Math.min(1, dt * 2); s.y += s.vy * dt; s.vy *= 1 - dt * .6;
        if (s.y <= s.ty || s.vy > -40) { burst(s); shells.splice(i, 1); }
      }
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]; p.t += dt; if (p.t >= p.life) { parts.splice(i, 1); continue; }
        p.trail.push([p.x, p.y]); if (p.trail.length > p.tlen) p.trail.shift();
        const k = Math.exp(-p.drag * dt); p.vx *= k; p.vy = p.vy * k + p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      }
    };
    api.draw = (ctx, sky) => {
      if (!sky) return;
      ctx.save(); ctx.beginPath(); for (const r of rects(sky)) ctx.rect(r[0], r[1], r[2] - r[0], r[3] - r[1]); ctx.clip();
      ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      for (const s of shells) {   // rising shell: a thin sparkling tail
        ctx.strokeStyle = 'rgba(255,220,170,.55)'; ctx.lineWidth = 2; ctx.beginPath();
        s.trail.forEach(([x, y], j) => (j ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.lineTo(s.x, s.y); ctx.stroke();
        ctx.fillStyle = 'rgba(255,240,210,.9)'; ctx.beginPath(); ctx.arc(s.x, s.y, 2.6, 0, 7); ctx.fill();
      }
      for (const p of parts) {
        const u = p.t / p.life, fade = u < .7 ? 1 : 1 - (u - .7) / .3;
        let a = fade * (p.twinkle && u > .35 ? (Math.random() < .5 ? 1 : .15) : 1);
        const [r, g, b] = p.col, warm = Math.max(0, 1 - u * 8);   // a white-hot start, then the colour
        const cr = Math.round(r + (255 - r) * warm), cg = Math.round(g + (255 - g) * warm), cb = Math.round(b + (255 - b) * warm);
        if (p.trail.length > 1) {
          ctx.strokeStyle = `rgba(${cr},${cg},${cb},${a * .45})`; ctx.lineWidth = p.size * .9; ctx.beginPath();
          p.trail.forEach(([x, y], j) => (j ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.lineTo(p.x, p.y); ctx.stroke();
        }
        ctx.fillStyle = `rgba(${cr},${cg},${cb},${a * .18})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 3.2, 0, 7); ctx.fill();   // soft glow
        ctx.fillStyle = `rgba(${cr},${cg},${cb},${a})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 - u * .4), 0, 7); ctx.fill();
      }
      ctx.restore();
    };
    return api;
  }
  return { create };
})();
