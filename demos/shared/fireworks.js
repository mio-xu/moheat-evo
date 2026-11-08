// shared/fireworks.js — far-away Japanese fireworks (hanabi) for any demo with a night sky, drawn as a MIDDLE LAYER: behind the
// characters and the buildings, only in the open sky (user 2026-11-08: 「烟花在中间层，烟花只能出现在不被建筑遮挡的区域…更加华丽、壮观」).
//
// Each shell rises from the horizon with a sparkling tail and bursts. A burst = one PAINTED firework (a sprite on pure black, made
// with Seedance / GPT: chrysanthemum, peony, willow, ring, heart…) blooming from small to full size, drooping and fading, PLUS code
// sparks flying from the same point (trails, gravity, twinkle), all drawn additively ('lighter': black = invisible).
//
//   const fw = MoHeatFireworks.create({ sprites: [Image…] })      // sprites optional (code sparks only without them)
//   fw.salvo(area, n, big)        // n shells, staggered; big ≈ 1 normal, 1.5 grand. area = { pick: () => [x, y], bottom: y }
//                                 //   (burst point + where shells start) or a rect [x0, y0, x1, y1] / a list of rects
//   fw.update(dt)
//   fw.drawLayer(ctx, mask)       // MIDDLE LAYER: render on an offscreen canvas, keep only where `mask` (a canvas the size of ctx's,
//                                 //   white = open sky not hidden by buildings or people) is opaque, add onto ctx. Draw it after the
//                                 //   picture; the mask already has the characters cut out, so they stay on top.
//   fw.draw(ctx, rects)           // v1: draw clipped to rect(s) (no mask)
//   fw.onBurst = (b) => {}        // {x, y, col, big}: flash light, boom sound…
//   fw.clear()
// First use: Demo31_SummerRooftop.
window.MoHeatFireworks = (() => {
  const rnd = (a, b) => a + Math.random() * (b - a);
  const PAL = [[255, 96, 140], [255, 196, 90], [120, 200, 255], [190, 140, 255], [120, 255, 170], [255, 245, 220], [255, 120, 60]];
  const TYPES = ['peony', 'chrysanthemum', 'willow', 'ring', 'double', 'senrin'];
  const rects = (sky) => (Array.isArray(sky[0]) ? sky : [sky]);
  function create(opt = {}) {
    const shells = [], parts = [], blooms = [], pending = [];
    const api = { onBurst: null, sprites: opt.sprites || [] };
    let off = null, offCtx = null;
    function target(area) {
      if (area.pick) { const [tx, ty] = area.pick(); return { tx, ty, bottom: area.bottom }; }
      const [x0, y0, x1, y1] = rects(area)[0], w = x1 - x0, h = y1 - y0;
      return { tx: x0 + w * rnd(.15, .85), ty: y0 + h * rnd(.18, .45), bottom: y1 + 20 };
    }
    function launch(area, big = 1, type) {
      const { tx, ty, bottom } = target(area), sx = tx + rnd(-30, 30);
      shells.push({ x: sx, y: bottom, tx, ty, vy: -(bottom - ty) / rnd(.8, 1.1), t: 0, big, type: type || TYPES[Math.random() * TYPES.length | 0],
        col: PAL[Math.random() * PAL.length | 0], col2: PAL[Math.random() * PAL.length | 0], trail: [] });
    }
    api.salvo = (area, n = 1, big = 1) => { for (let i = 0; i < n; i++) pending.push({ at: i * rnd(.18, .45), area, big }); };
    api.clear = () => { shells.length = parts.length = blooms.length = pending.length = 0; };
    api.active = () => shells.length + parts.length + blooms.length + pending.length > 0;
    function burst(s) {
      const sprite = api.sprites.length ? api.sprites[Math.random() * api.sprites.length | 0] : null;
      if (sprite) blooms.push({ img: sprite, x: s.x, y: s.y, size: rnd(560, 820) * s.big, t: 0, life: rnd(2.6, 3.4), rot: rnd(-.35, .35),
        flick: Math.random() < .4 });
      const R = (260 + Math.random() * 120) * s.big * (sprite ? 1.15 : 1), base = (s.type === 'senrin' ? 90 : 150) * (sprite ? .6 : 1);
      const n = Math.round(base * Math.min(1.6, s.big));
      const life = s.type === 'willow' ? rnd(2.6, 3.2) : s.type === 'chrysanthemum' ? rnd(1.9, 2.3) : rnd(1.4, 1.8);
      for (let i = 0; i < n; i++) {
        const drag = s.type === 'willow' ? 1.6 : 2.4;
        let a = (i / n) * Math.PI * 2 + rnd(-.04, .04), sp = R * drag;   // with drag d a particle travels v0 / d → it reaches R
        if (s.type === 'peony' || s.type === 'chrysanthemum' || s.type === 'willow' || s.type === 'senrin') sp *= Math.cbrt(rnd(.35, 1));
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
      for (let i = pending.length - 1; i >= 0; i--) { pending[i].at -= dt; if (pending[i].at <= 0) { launch(pending[i].area, pending[i].big); pending.splice(i, 1); } }
      for (let i = shells.length - 1; i >= 0; i--) {
        const s = shells[i]; s.t += dt; s.trail.push([s.x, s.y]); if (s.trail.length > 12) s.trail.shift();
        s.x += (s.tx - s.x) * Math.min(1, dt * 2); s.y += s.vy * dt; s.vy *= 1 - dt * .6;
        if (s.y <= s.ty || s.vy > -40) { burst(s); shells.splice(i, 1); }
      }
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]; p.t += dt; if (p.t >= p.life) { parts.splice(i, 1); continue; }
        p.trail.push([p.x, p.y]); if (p.trail.length > p.tlen) p.trail.shift();
        const k = Math.exp(-p.drag * dt); p.vx *= k; p.vy = p.vy * k + p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      }
      for (let i = blooms.length - 1; i >= 0; i--) { blooms[i].t += dt; if (blooms[i].t >= blooms[i].life) blooms.splice(i, 1); }
    };
    function paint(ctx) {   // everything, additively, no clipping
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      for (const b of blooms) {   // the painted burst: blooms out fast, holds, droops a little and fades
        const u = b.t / b.life, open = 1 - Math.pow(1 - Math.min(1, b.t / .55), 3);
        const fade = u < .35 ? 1 : Math.max(0, 1 - (u - .35) / .65), s = b.size * (.18 + .82 * open) * (1 + .06 * u);
        let a = fade * (b.flick && u > .3 ? .75 + .25 * Math.random() : 1);
        ctx.globalAlpha = Math.min(1, a * (1.15 - .15 * open));
        ctx.save(); ctx.translate(b.x, b.y + 40 * u * u); ctx.rotate(b.rot); ctx.drawImage(b.img, -s / 2, -s / 2, s, s); ctx.restore();
      }
      ctx.globalAlpha = 1;
      for (const s of shells) {   // rising shell: a thin sparkling tail
        ctx.strokeStyle = 'rgba(255,220,170,.6)'; ctx.lineWidth = 2.4; ctx.beginPath();
        s.trail.forEach(([x, y], j) => (j ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.lineTo(s.x, s.y); ctx.stroke();
        ctx.fillStyle = 'rgba(255,240,210,.95)'; ctx.beginPath(); ctx.arc(s.x, s.y, 3, 0, 7); ctx.fill();
        if (Math.random() < .5) { ctx.fillStyle = 'rgba(255,200,120,.8)'; ctx.fillRect(s.x + rnd(-6, 6), s.y + rnd(4, 30), 2, 2); }
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
    }
    api.drawLayer = (ctx, mask) => {
      if (!mask || !api.active()) return;
      const W = ctx.canvas.width, H = ctx.canvas.height;
      if (!off || off.width !== W || off.height !== H) { off = document.createElement('canvas'); off.width = W; off.height = H; offCtx = off.getContext('2d'); }
      offCtx.globalCompositeOperation = 'source-over'; offCtx.clearRect(0, 0, W, H);
      paint(offCtx);
      offCtx.globalCompositeOperation = 'destination-in'; offCtx.drawImage(mask, 0, 0, W, H);   // only the open sky, people cut out
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(off, 0, 0); ctx.restore();
    };
    api.draw = (ctx, sky) => {   // v1: clipped to rect(s)
      if (!sky) return;
      ctx.save(); ctx.beginPath(); for (const r of rects(sky)) ctx.rect(r[0], r[1], r[2] - r[0], r[3] - r[1]); ctx.clip(); paint(ctx); ctx.restore();
    };
    return api;
  }
  return { create };
})();
