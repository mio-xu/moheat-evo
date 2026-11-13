// _kit/diva/ll/diva_ll.js — the Ayane Diva engine with Ayane as a LivLiv model (all-ages kit, 2026-11-14).
// Generalised from Demo03_ShiningSmileRemake_LL/diva_ll.js (itself a copy of ../diva.js, which stays untouched for the old layered pages).
// Stage / thermal / FX / transport = diva.js. Ayane = a LivLiv package drawn by the official player (./livliv/, @livliv-dev/player 0.5.0,
// Apache-2.0) on a transparent <canvas id="ll"> over #scene. Everything demo-specific comes from DIVA_THEME.ll in the demo's theme.js:
//   model (page-relative .livliv path, required) · fig { top, bottom, cx, face { x, y, h }, raiseTop, half { x_<pose>: px } } (model px)
//   beat0 (first downbeat, s; default A.song[0]) · range (pan width share) · hop / nod (scales, default 1)
//   seq / chorus (2-bar pose rotations) · chorusKeys (segment keys that use `chorus`) · marks { <old pose name>: x_<pose> | [x_<pose>, …] (in turn) } (the demo's
//   own A.poses moments that keep a fixed pose) · jumpPose (old pose name of the drops → `jump` pose + a jump arc) · intro · whisper · ask · bow
//   faces { whisper, first, arrive: [visit idx], visitEnd, poses { x_<pose>: face }, segs { <segment key>: face } } (face names below)
//   acts [[t s, id, secs?], …] LivLiv's own built-in actions on the song clock (2026-11-14 user: use them): nod (agree) · shake (no) · tilt
//   (question) · hop (excitement) · shy (shy, looks down) · lookL / lookR (look to that side, lookAt). Never 'away' (it hides every expression,
//   so our pose body vanishes). lookEar (default true): a look toward the ear on each whisper line; lookK (look strength, default .6).
// Original diva.js header:
// _kit/diva/diva.js — the Ayane Diva series engine (all-ages kit; Demo63 rock · Demo64 和風 · Demo65 ballad).
// The Demo03 concert engine (one song analysis → thermal + stage FX, each ear from its own channel), pictured the standard layered
// way: one empty plate + cut-out poses of the same Ayane (tools/art/build_stage.py) with LivePortrait mouth blocks and drawn blinks.
// Ayane stands where her voice is in the mix (the vocal pan); each half of the stage shows exactly what that ear feels.
// A demo writes NO engine code: only media/* (built by _kit/diva/tools/build_page.py) and window.DIVA_THEME in its theme.js:
//   plate (required), floor, height, range (her stage width), spots (truss spotlights), warm: { style: 'amp' | 'glow', at: { L: [x, y], R: [x, y] },
//   flames, ember }, cool: { style: 'wind' | 'chime' | 'snow', at }, hits: { w: 'flame' | 'firework' | 'flare', c: 'gust' | 'chime' | 'snow' },
//   spot: under-figure light colour, jumpPose (the pose that jumps), singer (the subtitle speaker label, default '綾音'). Positions are fractions of the 16:9 frame.
const LL_SRC = document.currentScript?.src || location.href;
const W = 1920, H = 1080;
const D = window.DEMO_DATA, A = D.anim, LY = window.MOHEAT_LAYERS || { views: {} };
const TM = Object.assign({ plate: null, floor: .86, height: .74, range: .5, spots: false, jumpPose: 'jump', spot: '255,150,210',
  warm: { style: 'glow', at: { L: [.12, .6], R: [.88, .6] }, flames: false, ember: '255,190,90' }, cool: { style: 'wind', at: { L: [.12, .4], R: [.88, .4] } },
  hits: { w: 'flare', c: 'gust' } }, window.DIVA_THEME || {});
const $ = (id) => document.getElementById(id);
// the part of the 1920×1080 frame the viewer can actually see (canvas px): the canvas box after object-fit ∩ the stage ∩ the viewport;
// she is kept inside it with a 4 % margin (bug 2026-11-13: on phones she sometimes walked partly out of the picture)
let VIS = { x0: 0, y0: 0, x1: W, y1: H };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const hash = (n) => { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); };

// ---------------------------------------------------------------- thermal track + song analysis
const parseCsv = (txt) => {
  const rows = txt.trim().split(/\r?\n/).slice(1).map((l) => l.split(','));
  const col = (i) => rows.map((r) => +r[i]);
  return { rate: 1 / (rows[1][0] - rows[0][0]), Lc: col(1), Rc: col(2), Lh: col(3), Rh: col(4) };
};
// voice language (shared/shell.js MoHeatVoice: ja | en): a page built with "voice" lines has one mix / thermal track / mouth per language
const VL = () => (window.MoHeatVoice?.lang?.() === 'en' && D.thermalCsvEn ? 'en' : 'ja');
const THS = { ja: parseCsv(D.thermalCsv), en: D.thermalCsvEn ? parseCsv(D.thermalCsvEn) : null };
let TH = THS[VL()];
const sample = (arr, rate, t) => { const x = t * rate, i = Math.floor(x); if (i < 0) return arr[0] || 0; if (i >= arr.length - 1) return arr[arr.length - 1] || 0; return lerp(arr[i], arr[i + 1], x - i); };
const thermalAt = (t) => ({ Lc: sample(TH.Lc, TH.rate, t), Rc: sample(TH.Rc, TH.rate, t), Lh: sample(TH.Lh, TH.rate, t), Rh: sample(TH.Rh, TH.rate, t) });
const EN = window.ENERGY;
const en = (k, t) => sample((VL() === 'en' && EN.en?.[k]) || EN[k], EN.rate, t);   // per-side h / c follow the voice language (her whispers)
const sideAt = (e, t) => ({ h: en(e + 'h', t), c: en(e + 'c', t) });   // what that ear feels, on the picture's clock
const segAt = (t) => A.segments.find((s) => t >= s.t0 && t < s.t1) || A.segments[A.segments.length - 1];
const beatPhase = (t) => { const b = 60 / A.bpm, p = ((t % b) + b) % b / b; return { p, on: Math.pow(1 - p, 4) }; };
const poseAt = (t) => { let p = A.poses[0]; for (const q of A.poses) { if (q[0] <= t) p = q; else break; } return p; };
const FIRE = '255,130,45', ICE = '120,200,255', PINK = '255,120,200';

// ---------------------------------------------------------------- art (build_stage.py output + the diva kit's FX sprites)
const IMG = {};
const load = (k, src) => { const im = new Image(); im.src = src; IMG[k] = im; };
if (TM.plate) load('bg', TM.plate);   // the theme names its plate
for (const f of ['fx_flame', 'fx_star', 'fx_note']) load(f, `../_kit/diva/fx/${f}.webp`);
const ok = (k) => IMG[k] && IMG[k].complete && IMG[k].naturalWidth > 0;
// where things are in the plate (fractions of the 16:9 frame): the warm / cool sources of each side and the floor line
const AMP = TM.warm.at, COOLAT = TM.cool.at, FLOOR = TM.floor;

// ---------------------------------------------------------------- particles
let parts = [];
const spawn = (o) => { if (parts.length < 900) parts.push(o); };
function updateParts(dt) {
  for (const q of parts) { q.life += dt; q.x += q.vx * dt; q.y += q.vy * dt; if (q.g) q.vy += q.g * dt; q.rot += (q.spin || 0) * dt; }
  parts = parts.filter((q) => q.life < q.max && q.y < H + 120 && q.x > -200 && q.x < W + 200);
}
function drawParts(ctx) {
  for (const q of parts) {
    const k = q.life / q.max, a = q.a * (k < .15 ? k / .15 : 1 - Math.max(0, (k - .55) / .45));
    if (a <= .01) continue;
    ctx.save(); ctx.globalAlpha = a; if (q.add) ctx.globalCompositeOperation = 'lighter';
    if (q.streak) {   // wind streak: a thin bright line along its motion
      const g = ctx.createLinearGradient(q.x, q.y, q.x - q.vx * .09, q.y - q.vy * .09); g.addColorStop(0, `rgba(${q.streak},.9)`); g.addColorStop(1, `rgba(${q.streak},0)`);
      ctx.strokeStyle = g; ctx.lineWidth = q.size; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - q.vx * .09, q.y - q.vy * .09); ctx.stroke();
    } else if (q.bolt) {   // lightning: a jagged line, bright core + glow
      ctx.lineJoin = 'round'; for (const [lw, col] of [[14, 'rgba(120,170,255,.35)'], [4, 'rgba(230,240,255,1)']]) {
        ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); q.bolt.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); }
    } else if (q.dot) { ctx.fillStyle = `rgba(${q.dot},1)`; ctx.beginPath(); ctx.arc(q.x, q.y, q.size, 0, 7); ctx.fill(); }
    else if (q.rect) { ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.fillStyle = q.rect; ctx.fillRect(-q.size / 2, -q.size / 4, q.size, q.size / 2); }
    else if (ok(q.img)) { ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.drawImage(IMG[q.img], -q.size / 2, -q.size / 2, q.size, q.size); }
    ctx.restore();
  }
}

// ---------------------------------------------------------------- FX recipes (per style; every particle carries its side and warm / cool,
// so it vanishes the moment that ear stops being warm / cool)
const rnd = Math.random;
const EMIT = {
  warm: {
    amp(e, h, dt, ax, ay) {   // rock: flames lick up from the amp top and the floor of that half, sparks
      if (h > .2 && rnd() < dt * 30 * (h - .1)) spawn({ img: 'fx_flame', x: ax * W + (rnd() - .5) * 200, y: (ay - .14) * H, vx: (rnd() - .5) * 40, vy: -150 - rnd() * 110, size: 60 + rnd() * 90 * h, rot: 0, life: 0, max: 1.1, a: .95, add: true, side: e, warm: 1 });
      if (h > .45 && rnd() < dt * 14 * h) spawn({ img: 'fx_flame', x: (e === 'L' ? rnd() * .5 : .5 + rnd() * .5) * W, y: FLOOR * H, vx: (rnd() - .5) * 30, vy: -120 - rnd() * 80, size: 50 + rnd() * 60, rot: 0, life: 0, max: .9, a: .8, add: true, side: e, warm: 1 });
      if (h > .3 && rnd() < dt * 40 * h) spawn({ dot: '255,190,90', x: ax * W + (rnd() - .5) * 220, y: ay * H, vx: (rnd() - .5) * 160, vy: -200 - rnd() * 200, g: 220, size: 2 + rnd() * 3, life: 0, max: 1.4, a: 1, add: true, side: e, warm: 1 });
    },
    glow(e, h, dt, ax, ay) {   // lanterns / a fireplace: embers drifting up from the light (+ small flames when the source is a fire)
      if ((TM.warm.embers ?? true) !== false && (TM.warm.embers?.[e] ?? true) && rnd() < dt * 26 * h) spawn({ dot: TM.warm.ember, x: ax * W + (rnd() - .5) * 260, y: ay * H + (rnd() - .3) * 120, vx: (rnd() - .5) * 50, vy: -50 - rnd() * 70, size: 1.6 + rnd() * 2.6, life: 0, max: 2.6, a: .9, add: true, side: e, warm: 1 });
      if ((TM.warm.flames === true || TM.warm.flames?.[e]) && h > .35 && rnd() < dt * 10 * h) spawn({ img: 'fx_flame', x: ax * W + (rnd() - .5) * 90, y: ay * H, vx: (rnd() - .5) * 20, vy: -70 - rnd() * 50, size: 40 + rnd() * 50 * h, rot: 0, life: 0, max: .9, a: .85, add: true, side: e, warm: 1 });
    },
  },
  cool: {
    wind(e, c, dt, dir, half) {   // rock: wind streaks blowing in from that ear's edge + rain glinting in the lights
      if (c > .05 && rnd() < dt * 70 * c) spawn({ streak: '170,220,255', x: e === 'L' ? -60 : W + 60, y: rnd() * H * .85, vx: dir * (900 + rnd() * 600), vy: 60 + rnd() * 60, size: 1.5 + rnd() * 2.5, life: 0, max: 1.2, a: .55 + .4 * c, add: true, side: e, cool: 1 });
      if (c > .05 && rnd() < dt * 160 * c) spawn({ streak: '200,235,255', x: half(e), y: -20, vx: dir * 120, vy: 900 + rnd() * 400, size: 1.2 + rnd() * 1.2, life: 0, max: 1.3, a: .5 + .4 * c, add: true, side: e, cool: 1 });
      if (c > .2 && rnd() < dt * 30 * c) spawn({ dot: '210,240,255', x: half(e), y: H * (.15 + rnd() * .6), vx: dir * 90, vy: 60, size: 1.5 + rnd() * 2.5, life: 0, max: .8, a: 1, add: true, side: e, cool: 1 });
    },
    chime(e, c, dt, dir, half) {   // 和風: a night breeze from that side, glints on the wind chimes / the river, cool fireflies drifting
      const [cx, cy] = COOLAT[e];
      if (rnd() < dt * 90 * c) spawn({ dot: '210,245,255', x: cx * W + (rnd() - .5) * 320, y: cy * H + (rnd() - .5) * 260, vx: 0, vy: 0, size: 2 + rnd() * 3, life: 0, max: .5, a: 1, add: true, side: e, cool: 1 });
      if (rnd() < dt * 20 * c) spawn({ dot: '150,255,220', x: half(e), y: H * (.35 + rnd() * .4), vx: dir * (20 + rnd() * 40), vy: (rnd() - .5) * 30, size: 2.5 + rnd() * 2, life: 0, max: 3.2, a: .85, add: true, side: e, cool: 1 });
      if (c > .2 && rnd() < dt * 22 * c) spawn({ streak: '190,230,255', x: e === 'L' ? -40 : W + 40, y: H * (.1 + rnd() * .7), vx: dir * (500 + rnd() * 300), vy: 20, size: 1 + rnd() * 1.5, life: 0, max: 1.5, a: .35 + .3 * c, add: true, side: e, cool: 1 });
    },
    ice(e, c, dt, dir, half) {   // Q1 ice & fire: snow drifting down over that half, ice glints sparkling at that side's ice ornaments
      if (rnd() < dt * 70 * c) spawn({ dot: '235,248,255', x: half(e), y: -10, vx: (rnd() - .5) * 40 + dir * 20, vy: 80 + rnd() * 90, size: 1.8 + rnd() * 2.8, life: 0, max: 7, a: .95, add: true, side: e, cool: 1 });
      const [cx, cy] = COOLAT[e]; if (rnd() < dt * 40 * c) spawn({ dot: '200,240,255', x: cx * W + (rnd() - .5) * 380, y: cy * H + (rnd() - .5) * 420, vx: 0, vy: 0, size: 2 + rnd() * 3, life: 0, max: .5, a: 1, add: true, side: e, cool: 1 });
    },
    storm(e, c, dt, dir, half) {   // Q2 storm: driving rain slanting in from that ear's side, gusts, splashes on the floor
      if (rnd() < dt * 260 * c) spawn({ streak: '190,215,255', x: half(e) - dir * 200, y: -20, vx: dir * 260, vy: 1300 + rnd() * 500, size: 1.2 + rnd() * 1.4, life: 0, max: 1, a: .45 + .45 * c, add: true, side: e, cool: 1 });
      if (c > .2 && rnd() < dt * 40 * c) spawn({ streak: '170,210,255', x: e === 'L' ? -60 : W + 60, y: rnd() * H * .85, vx: dir * (1000 + rnd() * 600), vy: 120, size: 1.5 + rnd() * 2, life: 0, max: 1.2, a: .5 + .3 * c, add: true, side: e, cool: 1 });
      if (rnd() < dt * 50 * c) spawn({ dot: '200,225,255', x: half(e), y: FLOOR * H + (rnd() - .5) * 40, vx: (rnd() - .5) * 60, vy: -60 - rnd() * 60, g: 400, size: 1.2 + rnd() * 1.5, life: 0, max: .35, a: .9, add: true, side: e, cool: 1 });
    },
    snow(e, c, dt, dir, half) {   // ballad: snow falling past the window on that side (cool.box[e] = [x0, y0, x1, y1]); a side without a window: cold glints
      const bx = TM.cool.box?.[e];
      if (bx && rnd() < dt * 110 * c) { const vy = 45 + rnd() * 45; spawn({ dot: '240,248,255', x: (bx[0] + rnd() * (bx[2] - bx[0])) * W, y: bx[1] * H, vx: (rnd() - .5) * 24, vy, size: 2 + rnd() * 3.2, life: 0, max: (bx[3] - bx[1]) * H / vy, a: .95, add: true, side: e, cool: 1 }); }
      if (c > .25 && rnd() < dt * 12 * c) { const [cx, cy] = COOLAT[e]; spawn({ dot: '210,235,255', x: cx * W + (rnd() - .5) * 240, y: cy * H + (rnd() - .5) * 300, vx: 0, vy: 10, size: 1.5 + rnd() * 2, life: 0, max: .6, a: 1, add: true, side: e, cool: 1 }); }
    },
  },
};
const HIT = {
  w: {
    flame(e, s, ax, ay, dir) {   // the amp blasts flames + sparks, the stage shakes
      shake = Math.max(shake, 6 * s);
      for (let i = 0; i < 10; i++) spawn({ img: 'fx_flame', x: ax * W + (rnd() - .5) * 240, y: (ay - .12) * H, vx: dir * rnd() * 120, vy: -260 - rnd() * 200, size: 90 + rnd() * 110, rot: 0, life: 0, max: 1, a: 1, add: true, side: e, warm: 1 });
      for (let i = 0; i < 40; i++) { const a = -Math.PI / 2 + (rnd() - .5) * 1.8; spawn({ dot: '255,210,120', x: ax * W, y: (ay - .1) * H, vx: Math.cos(a) * 520 * rnd(), vy: Math.sin(a) * 620, g: 500, size: 2 + rnd() * 3, life: 0, max: 1.5, a: 1, add: true, side: e, warm: 1 }); }
    },
    firework(e, s) {   // 和風: a firework blooms in the sky above that half (a flash + glowing trails falling)
      const fx = (e === 'L' ? .14 + rnd() * .26 : .6 + rnd() * .26) * W, fy = H * (.1 + rnd() * .12), cols = [['255,210,110', '255,150,80'], ['255,140,170', '255,220,150'], ['255,190,90', '255,255,220']][Math.floor(rnd() * 3)];
      spawn({ dot: '255,230,180', x: fx, y: fy, vx: 0, vy: 0, size: 22, life: 0, max: .3, a: .5, add: true, side: e, warm: 1 });
      for (let i = 0; i < 110; i++) { const a = rnd() * 6.283, v = (190 + rnd() * 120) * (.75 + .4 * s); spawn({ streak: cols[i % 2], x: fx, y: fy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 90, size: 2.2 + rnd() * 2, life: 0, max: 1.6 + rnd() * .8, a: 1, add: true, side: e, warm: 1 }); }
    },
    flare(e, s, ax, ay) {   // ballad: the fire / candles flare, a puff of embers
      for (let i = 0; i < 30; i++) spawn({ dot: TM.warm.ember, x: ax * W + (rnd() - .5) * 160, y: ay * H, vx: (rnd() - .5) * 180, vy: -120 - rnd() * 200, g: 60, size: 2 + rnd() * 2.5, life: 0, max: 2, a: 1, add: true, side: e, warm: 1 });
    },
  },
  c: {
    gust(e, s, dir) {   // rock: a gust of wind and glinting rain
      for (let i = 0; i < 26; i++) spawn({ streak: '200,235,255', x: e === 'L' ? -40 : W + 40, y: rnd() * H * .9, vx: dir * (1400 + rnd() * 700), vy: 80, size: 2 + rnd() * 3, life: 0, max: 1, a: .9, add: true, side: e, cool: 1 });
      for (let i = 0; i < 60; i++) spawn({ dot: '220,245,255', x: (e === 'L' ? .25 : .75) * W + (rnd() - .5) * 700, y: H * (.1 + rnd() * .7), vx: dir * (250 + rnd() * 250), vy: 120 + rnd() * 120, size: 2 + rnd() * 3, life: 0, max: 1, a: 1, add: true, side: e, cool: 1 });
    },
    chime(e, s, dir) {   // 和風: the wind chimes ring — a ring of glints and a breeze
      const [cx, cy] = COOLAT[e];
      for (let i = 0; i < 40; i++) { const a = rnd() * 6.283, v = 80 + rnd() * 220; spawn({ dot: '210,245,255', x: cx * W, y: cy * H, vx: Math.cos(a) * v, vy: Math.sin(a) * v * .6, size: 1.6 + rnd() * 2.4, life: 0, max: 1.1, a: 1, add: true, side: e, cool: 1 }); }
      for (let i = 0; i < 14; i++) spawn({ streak: '200,235,255', x: e === 'L' ? -40 : W + 40, y: H * (.15 + rnd() * .6), vx: dir * (900 + rnd() * 500), vy: 30, size: 1.5 + rnd() * 2, life: 0, max: 1.1, a: .7, add: true, side: e, cool: 1 });
    },
    lightning(e, s, dir) {   // Q2 storm: a bolt strikes behind the stage on that side, the whole half flashes (hitFx.c), a gust of rain
      const x0 = (e === 'L' ? .12 + rnd() * .28 : .6 + rnd() * .28) * W, pts = [[x0, -10]]; let x = x0, y = -10;
      while (y < H * .58) { y += 40 + rnd() * 60; x += (rnd() - .5) * 90; pts.push([x, y]); }
      spawn({ bolt: pts, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: .35, a: 1, add: true, side: e, cool: 1 });
      spawn({ bolt: pts.slice(0, 4).map(([px, py], i) => [px + i * dir * 25, py]), x: 0, y: 0, vx: 0, vy: 0, life: 0, max: .25, a: .8, add: true, side: e, cool: 1 });
      for (let i = 0; i < 40; i++) spawn({ streak: '200,230,255', x: e === 'L' ? -40 : W + 40, y: rnd() * H * .9, vx: dir * (1500 + rnd() * 700), vy: 200, size: 2 + rnd() * 2.5, life: 0, max: .9, a: .9, add: true, side: e, cool: 1 });
    },
    snow(e, s, dir) {   // ballad: the glass ornaments / the frosted window flash: a ring of cold glints around that side's cool source
      const [cx, cy] = COOLAT[e];
      for (let i = 0; i < 50; i++) { const a = rnd() * 6.283, v = 60 + rnd() * 200; spawn({ dot: '225,240,255', x: cx * W, y: cy * H, vx: Math.cos(a) * v, vy: Math.sin(a) * v * .7, size: 1.5 + rnd() * 2.5, life: 0, max: 1.4, a: 1, add: true, side: e, cool: 1 }); }
    },
  },
};

// ---------------------------------------------------------------- stage
const hitFx = { L: { w: 0, c: 0 }, R: { w: 0, c: 0 } };
let hitI = 0, lastFxT = -1, shake = 0;
function plate(ctx, shift) {
  if (!ok('bg')) { ctx.fillStyle = '#0b0820'; ctx.fillRect(0, 0, W, H); return; }
  const bw = W + 90, bh = bw * IMG.bg.naturalHeight / IMG.bg.naturalWidth;
  ctx.drawImage(IMG.bg, -45 + clamp(shift, -45, 45), (H - bh) / 2, bw, bh);
}
const inSong = (t) => t >= EN.song[0] && t < EN.song[1];
const bandSide = (e, t) => (inSong(t) ? sideAt(e, t) : { h: 0, c: 0 });   // amp flames / wind / rain = the band; her whispers only glow at the edge
function drawStage(ctx, t, shift) {
  plate(ctx, shift);
  const S = { L: bandSide('L', t), R: bandSide('R', t) }, bp = beatPhase(t);
  const act = Math.max(S.L.h, S.L.c, S.R.h, S.R.c);
  if (act < .25) { ctx.fillStyle = `rgba(6,4,20,${.3 * (1 - act / .25)})`; ctx.fillRect(0, 0, W, H); }   // both ears neutral → a calmer, darker stage
  if (TM.sideDim) for (const e of ['L', 'R']) {   // lit plates (lanterns, a fireplace): a half that is not warm sinks into the night
    const d = TM.sideDim * (1 - clamp(S[e].h * 1.6, 0, 1)); if (d < .01) continue;
    const g = ctx.createLinearGradient(e === 'L' ? 0 : W, 0, W / 2, 0); g.addColorStop(0, `rgba(4,4,16,${d})`); g.addColorStop(.75, `rgba(4,4,16,${d * .6})`); g.addColorStop(1, 'rgba(4,4,16,0)');
    ctx.fillStyle = g; ctx.fillRect(e === 'L' ? 0 : W / 2, 0, W / 2, H);
  }
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const e of ['L', 'R']) {
    const s = S[e], x0 = e === 'L' ? 0 : W / 2, [ax, ay] = AMP[e];
    // warm: that side's amp stack glows from inside its grille and floods its half of the floor in orange
    if (s.h > .02) {
      const k = s.h * (TM.warm.style === 'amp' ? .8 + .2 * bp.on : .9 + .1 * Math.sin(t * 7 + (e === 'L' ? 0 : 2))) + .6 * hitFx[e].w;   // glow: a lantern / fire flicker, not the beat
      let g = ctx.createRadialGradient(ax * W, ay * H, 10, ax * W, ay * H, 330); g.addColorStop(0, `rgba(255,150,60,${.75 * k})`); g.addColorStop(.5, `rgba(255,90,30,${.3 * k})`); g.addColorStop(1, 'rgba(255,60,20,0)');
      ctx.fillStyle = g; ctx.fillRect(ax * W - 340, ay * H - 340, 680, 680);
      g = ctx.createLinearGradient(0, H * .7, 0, H); g.addColorStop(0, 'rgba(255,110,40,0)'); g.addColorStop(1, `rgba(255,110,40,${.32 * k})`);
      ctx.fillStyle = g; ctx.fillRect(x0, H * .7, W / 2, H * .3);
    }
    // cool: a blue night wash and rain glinting in the spotlights on that half
    if (s.c > .02) {
      const k = s.c + .5 * hitFx[e].c, g = ctx.createLinearGradient(e === 'L' ? 0 : W, 0, W / 2, 0);
      g.addColorStop(0, `rgba(${TM.cool.wash || '80,160,255'},${(TM.cool.washK || .28) * k})`); g.addColorStop(1, `rgba(${TM.cool.wash || '80,160,255'},0)`); ctx.fillStyle = g; ctx.fillRect(x0, 0, W / 2, H);
    }
    // the three spotlights of each half (truss stages only): orange on a warm ear, icy white-blue on a cool one, pink when neither
    if (!TM.spots) continue;
    const col = s.c > s.h && s.c > .05 ? ICE : s.h > .05 ? FIRE : PINK, v = Math.max(s.h, s.c);
    for (let i = 0; i < 3; i++) {
      const bx = (e === 'L' ? .22 + i * .11 : .56 + i * .11) * W, by = H * .17, ang = Math.sin(t * (.6 + i * .13) + i * 1.7 + (e === 'L' ? 0 : 2)) * .25;
      const a = .03 + .38 * v + .25 * bp.on * v + .3 * Math.max(hitFx[e].w, hitFx[e].c);
      const ex = bx + Math.sin(ang) * 760, gg = ctx.createLinearGradient(bx, by, ex, by + 760); gg.addColorStop(0, `rgba(${col},${a})`); gg.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = gg; ctx.beginPath(); ctx.moveTo(bx - 8, by); ctx.lineTo(bx + 8, by); ctx.lineTo(ex + 150, by + 760); ctx.lineTo(ex - 150, by + 760); ctx.fill();
    }
  }
  ctx.restore();
}
function emitFx(t, dt, st) {
  const S = { L: bandSide('L', t), R: bandSide('R', t) };
  const half = (e) => (e === 'L' ? Math.random() * W * .5 : W * .5 + Math.random() * W * .5);
  for (const e of ['L', 'R']) {
    const s = S[e], [ax, ay] = AMP[e], dir = e === 'L' ? 1 : -1;
    if (s.h > .02) EMIT.warm[TM.warm.style](e, s.h, dt, ax, ay, dir, half);
    if (s.c > .02) EMIT.cool[TM.cool.style](e, s.c, dt, dir, half);
  }
  // a side that stops being warm / cool loses its flames / wind at once (nothing fiery on a cool side, nothing icy on a warm one)
  parts = parts.filter((q) => !q.side || (q.warm ? S[q.side].h > .03 || q.life < .15 : q.cool ? S[q.side].c > .02 || q.life < .2 : true));
  // the hits = the thermal pulses (same list): warm → the amp blasts flames + sparks; cool → a gust and a burst of glints
  if (t < lastFxT - .05 || t > lastFxT + 1) { hitI = EN.hits.findIndex((x) => x[0] >= t); if (hitI < 0) hitI = EN.hits.length; }
  lastFxT = t;
  while (hitI < EN.hits.length && EN.hits[hitI][0] <= t) {
    const [, e, kind, s] = EN.hits[hitI++], [ax, ay] = AMP[e], dir = e === 'L' ? 1 : -1;
    if (kind === 'w') { hitFx[e].w = Math.max(hitFx[e].w, s); HIT.w[TM.hits.w](e, s, ax, ay, dir); }
    else { hitFx[e].c = Math.max(hitFx[e].c, s); HIT.c[TM.hits.c](e, s, dir); }
  }
  for (const e of ['L', 'R']) { hitFx[e].w = Math.max(0, hitFx[e].w - dt * 1.8); hitFx[e].c = Math.max(0, hitFx[e].c - dt * 1.5); }
  shake = Math.max(0, shake - dt * 20);
  if (st && st.mouth > .4 && Math.random() < dt * 2.5) spawn({ img: Math.random() < .6 ? 'fx_note' : 'fx_star', x: st.x + (Math.random() - .5) * 220, y: st.top + 120, vx: (Math.random() - .5) * 60, vy: -110 - Math.random() * 60, size: 46 + Math.random() * 26, rot: (Math.random() - .5) * .5, life: 0, max: 1.8, a: .95 });
}

// ---------------------------------------------------------------- Ayane = a LivLiv model (DIVA_THEME.ll)
// This 2D engine still draws the stage, her floor spot / shadow, the FX and the camera push-in of the stage; every frame it hands the
// player a target (LLT, scene px) and the player's driver (bottom of this file) turns it into the view: rigid hop on each beat (bigger on
// bar starts), small nods only (no turns / tilts), a pose every 2 bars with a 220 ms bounce, mouth + vowel from the voice, the ear push-in.
const LLX = Object.assign({ model: null, beat0: null, range: .6, hop: 1, nod: 1,
  seq: ['x_sing', 'x_wave', 'x_heart', 'x_raise', 'x_sing', 'x_cheer', 'x_heart', 'x_wave'], chorus: ['x_raise', 'x_point', 'x_raise', 'x_cheer'],
  chorusKeys: ['climax'], marks: {}, jumpPose: TM.jumpPose, jump: 'x_cheer', intro: 'x_wave', whisper: 'x_clasp', ask: 'x_shy', bow: 'x_bow', idle: 'x_idle' }, TM.ll || {});
const LLM = Object.assign({ top: 563, bottom: 3551, cx: 906, face: { x: 904, y: 1005, h: 322 }, raiseTop: 425,   // model px (model.json anchors; idol defaults)
  half: { x_idle: 520, x_sing: 600, x_wave: 640, x_cheer: 510, x_raise: 840, x_heart: 510, x_point: 720, x_clasp: 390, x_bow: 380, x_shy: 440 } }, LLX.fig || {});
const LLF = Object.assign({ whisper: 'shy', first: 'surprise', arrive: [1], visitEnd: 'wink', poses: { x_raise: 'smile', x_cheer: 'smile', x_bow: 'smile' }, segs: {} }, LLX.faces || {});
const LLC = { beat0: LLX.beat0 ?? A.song[0], range: LLX.range };
const BEAT = 60 / A.bpm, BAR = 4 * BEAT;
const SEQ = LLX.seq, CHORUS = LLX.chorus;
const JUMPS = LLX.jumpPose ? A.poses.filter((p) => p[1] === LLX.jumpPose).map((p) => p[0]) : [];   // the song's drops (the old engine's jump marks)
// the demo's own pose moments that keep a fixed pose (e.g. ballad reach → point): [t0, t1, x_pose]
const MARKS = (() => { const n = {}; return A.poses.map((p, i) => { const v = LLX.marks[p[1]], k = n[p[1]] = (n[p[1]] ?? -1) + 1;   // a list = used in turn
  return [p[0], (A.poses[i + 1] || [A.duration])[0], Array.isArray(v) ? v[k % v.length] : v]; }).filter((m) => m[2] && m[1] - m[0] >= .6); })();
const EXID = { smile: 'smile', shy: 'x_9a6503', surprise: 'x_40056d', sad: 'x_ba0413', tired: 'x_221c59', pout: 'x_d7dec3', serious: 'x_13c45e', wink: 'x_051b17' };   // 笑顔 照れ 驚き 悲しみ 疲れ ぷんぷん 真剣 ウインク
const EX = (n) => (n ? EXID[n] || n : null);
const closeWin = (t) => CLOSE.find((w) => t >= w.t0 && t <= w.t1) || null;
const markAt = (t) => MARKS.find((m) => t >= m[0] && t < m[1]) || null;
function llPose(t) {   // deterministic from the song clock (seek / scrub safe)
  if (t < 1) return LLX.bow;   // the very start: a bow before she comes to you
  const w = closeWin(t);
  if (w) { const lines = w.lines.map((l) => l[0]); let cur = null; for (const lt of lines) if (lt - .7 <= t) cur = lt;   // at your ear: hands clasped, nothing near the face
    return CLOSE.indexOf(w) === CLOSE.length - 1 && cur === lines[1] ? LLX.ask : LLX.whisper; }   // the ask line (「なまえを よんで」)
  if (!inSong(t)) return t < A.song[0] ? (A.song[0] - t < 1.2 ? llPose(A.song[0] + .01) : LLX.idle) : LLX.bow;   // no short idle flash just before the song   // after the song: the curtain-call bow
  if (JUMPS.some((x) => t >= x && t < x + 1.5)) return LLX.jump;
  const mk = markAt(t); if (mk) return mk[2];
  const b = Math.floor((t - LLC.beat0) / BAR); if (b < 2) return LLX.intro;
  const slot = Math.floor(b / 2), slotEnd = LLC.beat0 + (slot + 1) * 2 * BAR;
  // a whisper / a drop jump / a mark that ends shortly before the next 2-bar line: go straight to the next pose (no short flash of a pose)
  const back = Math.max(-9, ...CLOSE.map((w) => w.t1).filter((x) => x <= t), ...JUMPS.map((x) => x + 1.5).filter((x) => x <= t), ...MARKS.map((m) => m[1]).filter((x) => x <= t));
  if (back > slotEnd - 2 * BAR && slotEnd - back < Math.min(1.2, BAR * .5)) return slotPoseOf(slot + 1, slotEnd + .01);
  const slotStart = slotEnd - 2 * BAR;   // a drop jump / a mark just after a 2-bar line: keep the previous pose until it
  const next = [...JUMPS, ...MARKS.map((m) => m[0])];
  if (slot > 1 && next.some((x) => x > t && x - slotStart < 1.0)) return slotPoseOf(slot - 1, slotStart - .01);
  const p = slotPoseOf(slot, t), nx = next.filter((x) => x > t).sort((a, b) => a - b)[0];
  if (nx != null && nx - Math.max(slotStart, back) < .6) return slotPoseOf(slot - 1, slotStart - .01);   // never a < 0.6 s pose before a mark
  return p;
}
const slotPoseOf = (slot, t) => (LLX.chorusKeys.includes(segAt(t).key) ? CHORUS[slot % CHORUS.length] : SEQ[slot % SEQ.length]);
const lineEnd = (lt) => (A.lyrics.find((l) => Math.abs(l.t0 - lt) < .3) || { t1: lt + 4 }).t1;
function llFace(t, pose) {   // the expression cues (the old art had them baked into its bust / poses)
  const w = closeWin(t);
  if (w) {
    const wi = CLOSE.indexOf(w), lines = w.lines.map((l) => l[0]); let cur = null; for (const lt of lines) if (lt - .7 <= t) cur = lt;
    if (cur == null) return EX(LLF.whisper);
    if (LLF.first && wi === 0 && cur === lines[0] && t < cur + 1.3) return EX(LLF.first);       // 「…あ、来てくれた」
    if (LLF.arrive.includes(wi) && t < cur + .2) return EX('wink');                            // mid-song: a wink as she arrives at your ear
    const end = lineEnd(cur); if (LLF.visitEnd && cur === lines[lines.length - 1] && t > end - .2) return EX(LLF.visitEnd);   // the last line of a visit
    return EX(LLF.whisper);
  }
  if (LLF.poses[pose]) return EX(LLF.poses[pose]);
  return inSong(t) ? EX(LLF.segs[segAt(t).key]) : null;
}
function keepIn(x, half, m) {   // x so that [x − half, x + half] stays inside the visible width with margin m (centred when it cannot)
  const lo = VIS.x0 + m + half, hi = VIS.x1 - m - half;
  return lo > hi ? (VIS.x0 + VIS.x1) / 2 : clamp(x, lo, hi);
}
function charState(t) {
  const pose = llPose(t), cl = closeWin(t), song = inSong(t);
  const hgt = H * TM.height, k = hgt / (LLM.bottom - LLM.top);   // scene px per model px
  const xp = (tt) => VIS.x0 + (VIS.x1 - VIS.x0) * (.5 + (sample(A.pan, A.panRate, tt) - .5) * LLC.range);   // where her voice is in the mix
  let x = xp(t); const vel = (xp(t + .1) - xp(t - .1)) / .2;
  const j = JUMPS.find((s) => t >= s && t < s + .75), jump = j != null ? Math.sin(Math.PI * (t - j) / .75) * 110 : 0;
  // the whole picture hops on each beat (rigid), bar starts higher; less while she is at your ear; a gentle nod on each beat
  const bt = (t - LLC.beat0) / BEAT, bi = Math.floor(bt), ph = bt - bi, barStart = ((bi % 4) + 4) % 4 === 0;
  let hop = 0, sq = 1, nod = 0;
  if (song && t >= LLC.beat0 && !jump) {
    const kh = (ph * BEAT) / .15;
    if (kh < 1) { const E = clamp(Math.max(en('low', t), en('mid', t)), 0, 1), q = barStart ? 1.5 : 1;
      hop = LLX.hop * (6 + 9 * E) * (barStart ? 1.8 : 1) * (cl ? .25 : 1) * Math.sin(Math.PI * kh);
      sq = kh < .25 ? 1 - .010 * q * Math.sin(Math.PI * kh / .25) : 1 + .007 * q * Math.sin(Math.PI * (kh - .25) / .75); }
    const kn = (ph * BEAT) / .24; if (kn < 1) nod = -LLX.nod * (barStart ? 27 : 18) * (cl ? .5 : 1) * Math.sin(Math.PI * kn);   // 30 = 6° → 5.4° / 3.6°
  }
  if (pose === LLX.bow) nod = -30;   // the bow: head down too (≈ 6°)
  const pw = 2 * (LLM.half[pose] || 600) * k, ph_ = (LLM.bottom - (pose === 'x_raise' ? LLM.raiseTop : LLM.top)) * k;
  const m = .04 * (VIS.x1 - VIS.x0), my = .04 * (VIS.y1 - VIS.y0);
  x = keepIn(x, pw / 2 + 24, m);
  let foot = FLOOR * H + 6 - jump - hop;
  if (foot - ph_ < VIS.y0 + my) foot = VIS.y0 + my + ph_;   // a jump never leaves the top of the picture
  const mouth = sample((VL() === 'en' && A.mouthEn) || A.mouth, A.fps, t);
  return { x, vel, pw, ph: ph_, pose, foot, hgt, k, top: foot - hgt, sq, nod, jump, hop, mouth, md: { lv: mouth > .1 ? 1 : 0, prev: 0, a: 1, env: mouth }, blink: false };
}
function drawAyane(ctx, st, t) {   // only what stays in the 2D picture: the pink spot under her + the contact shadow (she is the LivLiv layer)
  const g = ctx.createRadialGradient(st.x, FLOOR * H, 20, st.x, FLOOR * H, 360); g.addColorStop(0, `rgba(${TM.spot},${.22 * figAlpha})`); g.addColorStop(1, `rgba(${TM.spot},0)`);
  ctx.fillStyle = g; ctx.fillRect(st.x - 380, FLOOR * H - 380, 760, 760);
  ctx.save(); ctx.globalAlpha = .5 * figAlpha * (1 - clamp((st.jump + st.hop) / 200, 0, .7)); ctx.translate(st.x, FLOOR * H + 4); ctx.scale(1, .16);
  const sg = ctx.createRadialGradient(0, 0, 0, 0, 0, 190); sg.addColorStop(0, 'rgba(20,0,30,.8)'); sg.addColorStop(1, 'rgba(20,0,30,0)'); ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(0, 0, 190, 0, 7); ctx.fill(); ctx.restore();
}

window.DIVA_DEBUG = { llPose, llFace, marks: MARKS, vis: () => VIS, fig: () => lastSt && { x: lastSt.x, pw: lastSt.pw, ph: lastSt.ph, foot: lastSt.foot, close: lastSt.close?.k || 0 }, bust: () => null };
window.MoHeatLayers = { state: () => { const st = lastSt; if (!st) return { mouth: 0, tgt: 0, blink: false, view: 'ayane_ll', stem: '', patches: [] };
  return { mouth: st.mouth > .1 ? 1 : 0, tgt: st.mouth, open: st.mouth > .1, level: st.md.lv, blink: false, view: 'ayane_ll', stem: 'ayane_ll', patches: [] }; } };
let lastSt = null;
// ---------------------------------------------------------------- frame
const cv = $('scene'), ctx = cv.getContext('2d');
function measureVisible() {
  const c = cv.getBoundingClientRect(); if (!c.width || !c.height) return;
  const fit = getComputedStyle(cv).objectFit, s = fit === 'cover' ? Math.max(c.width / W, c.height / H) : fit === 'fill' ? 0 : Math.min(c.width / W, c.height / H);
  const sx = s || c.width / W, sy = s || c.height / H, ox = c.left + (c.width - W * sx) / 2, oy = c.top + (c.height - H * sy) / 2;
  const sb = ($('stage') || cv).getBoundingClientRect(), vv = window.visualViewport;
  const L = Math.max(c.left, sb.left, 0), T = Math.max(c.top, sb.top, 0), R = Math.min(c.right, sb.right, vv ? vv.width : innerWidth), B = Math.min(c.bottom, sb.bottom, vv ? vv.height : innerHeight);
  const v = { x0: clamp((L - ox) / sx, 0, W), y0: clamp((T - oy) / sy, 0, H), x1: clamp((R - ox) / sx, 0, W), y1: clamp((B - oy) / sy, 0, H) };
  if (v.x1 - v.x0 > W * .2 && v.y1 - v.y0 > H * .2) VIS = v;
}
for (const e of ['resize', 'orientationchange', 'fullscreenchange']) addEventListener(e, () => setTimeout(measureVisible, 60));
window.visualViewport?.addEventListener('resize', measureVisible); setInterval(measureVisible, 1000); measureVisible();
let camX = 0, lastT = 0, lastFrame = performance.now();
function thermalEdges(ctx, t) {   // the side glow on each edge = that ear's temperature (orange warm / icy blue cool)
  for (const [e, side] of [['L', -1], ['R', 1]]) {
    const S = sideAt(e, t), v = Math.max(S.c, S.h), hw = hitFx[e];
    const x0 = side < 0 ? 0 : W, x1 = side < 0 ? 560 : W - 560;
    if (v > .02) {
      const col = S.c >= S.h ? '90,185,255' : '255,120,45';
      const g = ctx.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, `rgba(${col},${.55 * v})`); g.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = g; ctx.fillRect(Math.min(x0, x1), 0, 560, H);
    }
    for (const [k, col] of [['w', '255,225,180'], ['c', '200,235,255']]) if (hw[k] > .01) {
      const cx = side < 0 ? W * .25 : W * .75, g = ctx.createRadialGradient(cx, H * .5, 30, cx, H * .5, W * .4);
      g.addColorStop(0, `rgba(${col},${.4 * hw[k]})`); g.addColorStop(1, `rgba(${col},0)`);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(side < 0 ? 0 : W / 2, 0, W / 2, H); ctx.restore();
    }
  }
}
// ---------------------------------------------------------------- close-up: she comes to your ear (_kit/diva/STORY.md)
// A.close = [{ t0, t1, lines: [[t, 'L' | 'R'], …] }]: the stage pushes in and blurs; the LivLiv camera pushes in to her face, shifted to
// the ear of the line being whispered (ART_RULES: no special drawing, the head stays sharp), holds while she talks, then eases out.
const CLOSE = A.close || [];
const ease = (x) => x * x * (3 - 2 * x);
let figAlpha = 1, LLT = null;
function closeAt(t) {
  for (const w of CLOSE) if (t >= w.t0 && t <= w.t1) {
    let ear = w.lines[0][1]; for (const [lt, e] of w.lines) if (lt - .7 <= t) ear = e;   // she moves over just before the next line
    return { k: ease(clamp(Math.min((t - w.t0) / 1.1, (w.t1 - t) / 1.1), 0, 1)), ear };
  }
  return null;
}
let llEarX = null, llEarT = -9;
function frame(t, dt) {
  const st = charState(t); lastSt = st;
  const cl = closeAt(t), ck = cl ? cl.k : 0; st.close = cl;
  camX += ((st.x - W / 2) * .025 - camX) * clamp(dt * 1.5, 0, 1);
  const sx = (Math.random() - .5) * shake, sy = (Math.random() - .5) * shake;
  let fx = W / 2, z = 1;
  ctx.save(); ctx.translate(sx, sy);
  if (ck > 0) {   // push in toward the ear she comes to (+ a soft blur of the stage behind her)
    fx = VIS.x0 + (VIS.x1 - VIS.x0) * (cl.ear === 'L' ? .3 : .7); z = 1 + .28 * ck;
    st.x = fx + (keepIn(fx + (st.x - fx) * z, st.pw * z / 2 + 24, .04 * (VIS.x1 - VIS.x0)) - fx) / z;   // the push-in keeps her inside too
    ctx.translate(fx, H * .5); ctx.scale(z, z); ctx.translate(-fx, -H * .5); ctx.filter = `blur(${(3.5 * ck).toFixed(1)}px)`;
  }
  drawStage(ctx, t, -camX);
  figAlpha = 1 - ck;
  if (figAlpha > .01) { ctx.save(); ctx.translate(-camX * 1.6, 0); drawAyane(ctx, st, t); ctx.restore(); }
  ctx.filter = 'none';
  emitFx(t, dt, ck > .5 ? null : st); updateParts(dt); drawParts(ctx);
  ctx.restore();
  if (ck > 0) {
    const g = ctx.createRadialGradient(W / 2, H * .55, H * .3, W / 2, H * .55, W * .7); g.addColorStop(0, 'rgba(6,4,16,0)'); g.addColorStop(1, `rgba(6,4,16,${.55 * ck})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  // house lights: down before the song (her whispers), half down after
  const s0 = A.song[0], s1 = A.song[1], dim = t < s0 ? .45 * clamp((s0 - .2 - t) / 1.2, 0, 1) + .3 * clamp(1 - t / .6, 0, 1) : t > s1 ? .35 * clamp((t - s1) / 1.5, 0, 1) : 0;
  if (dim * (1 - ck) > .005) { ctx.fillStyle = `rgba(6,4,16,${dim * (1 - ck)})`; ctx.fillRect(0, 0, W, H); }
  thermalEdges(ctx, t);
  // the LivLiv target: her stage place in the (pushed-in) picture, and the ear-side face spot of the close-up
  const zx = (x) => fx + (x - fx) * z, zy = (y) => H * .5 + (y - H * .5) * z, bx = st.x - camX * 1.6;
  let ear = null;
  if (cl) {
    const vw = VIS.x1 - VIS.x0, tx = VIS.x0 + vw * (cl.ear === 'L' ? .36 : .64);
    if (llEarX == null || Math.abs(t - llEarT) > .5) llEarX = tx; else llEarX += (tx - llEarX) * clamp(dt * 2.6, 0, 1);
    ear = { x: llEarX, y: VIS.y0 + (VIS.y1 - VIS.y0) * .5, fh: .32 * (VIS.y1 - VIS.y0) };
  }
  llEarT = t;
  const vs = window.LL_VOWEL, lead = .03;
  LLT = { t, x: zx(bx) + sx, foot: zy(st.foot) + sy, k: st.k * z, sq: st.sq, nod: st.nod, pose: st.pose, face: llFace(t, st.pose), ck, ear,
    mouth: clamp(sample((VL() === 'en' && A.mouthEn) || A.mouth, A.fps, t + lead) * 1.1, 0, 1),
    vowel: vs ? sample(vs[VL()] || vs.ja, vs.fps, t + lead) : 0, dim: dim * (1 - ck) };
  return { st, th: thermalAt(t + offsetMs / 1000) };
}

// ---------------------------------------------------------------- radar, timeline
const radar = $('radar'), rctx = radar.getContext('2d');
function drawRadar(st, th) {
  const c = rctx, w = radar.width, h = radar.height, cx = w / 2, cy = h / 2 + 6, R = 170;
  c.clearRect(0, 0, w, h); c.strokeStyle = '#3a2850'; c.lineWidth = 2;
  for (const r of [.33, .66, 1]) { c.beginPath(); c.arc(cx, cy, R * r, 0, 7); c.stroke(); }
  c.fillStyle = '#8a7aa6'; c.font = '20px Inter'; c.textAlign = 'center'; c.fillText('stage', cx, cy - R - 10);
  for (const [sd, cl, hh] of [[-1, th.Lc, th.Lh], [1, th.Rc, th.Rh]]) {
    const v = Math.max(cl, hh); if (v < .02) continue;
    const g = c.createRadialGradient(cx + sd * 150, cy, 5, cx + sd * 150, cy, 90); g.addColorStop(0, `rgba(${cl > hh ? ICE : FIRE},${.85 * v})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.beginPath(); c.arc(cx + sd * 150, cy, 90, 0, 7); c.fill();
  }
  c.fillStyle = '#ffd6ec'; c.beginPath(); c.arc(cx + ((st.x / W) - .5) * 2 * R * .9, cy - R * .55, 13, 0, 7); c.fill();
  c.fillStyle = '#fff'; c.beginPath(); c.arc(cx, cy, 9, 0, 7); c.fill(); c.fillStyle = '#8a7aa6'; c.font = '17px Inter'; c.fillText('you', cx, cy + 32);
}
const tl = $('timeline'), tlctx = tl.getContext('2d');
function drawTimeline() {
  const c = tlctx, w = tl.width, h = tl.height, n = TH.Lc.length; c.clearRect(0, 0, w, h);
  for (const [row, kc, kh] of [[0, 'Lc', 'Lh'], [1, 'Rc', 'Rh']]) for (let x = 0; x < w; x++) {
    const i = Math.floor((x / w) * n), cv_ = TH[kc][i], hv = TH[kh][i], y = row * h / 2;
    if (cv_ > .02) { c.fillStyle = `rgba(${ICE},${.25 + .75 * cv_})`; c.fillRect(x, y + 2, 1, h / 2 - 4); } else if (hv > .02) { c.fillStyle = `rgba(${FIRE},${.25 + .75 * hv})`; c.fillRect(x, y + 2, 1, h / 2 - 4); }
  }
}

// ---------------------------------------------------------------- transport
const mix = $('mix'), media = mix, playBtn = $('playBtn');
const MIXSRC = { ja: mix.getAttribute('src'), en: D.mixEn || null };
function applyVoice() {
  const l = VL(), src = MIXSRC[l] || MIXSRC.ja; TH = THS[l] || THS.ja; drawTimeline(); lastSent = '';
  if (mix.getAttribute('src') !== src) { const t = mix.currentTime, playing = !mix.paused; mix.setAttribute('src', src); mix.load(); mix.currentTime = t; if (playing) mix.play().catch(() => {}); }
}
addEventListener('moheat:voicelang', applyVoice);
const preview = new URLSearchParams(location.search).get('t');
let previewT = preview != null ? +preview : null;
if (previewT != null) addEventListener('load', () => $('intro').classList.add('hidden'));   // ?t=<s>: a still of that moment (dev / screenshots)
const now = () => (previewT != null ? previewT : media.currentTime || 0);
const play = () => { $('intro').classList.add('hidden'); if (previewT != null) { media.currentTime = previewT; previewT = null; } media.play().catch(() => {}); };
const pause = () => media.pause();
const toggle = () => (media.paused ? play() : pause());
playBtn.addEventListener('click', toggle);
$('startBtn').addEventListener('click', () => { media.currentTime = 0; parts = []; play(); });
mix.addEventListener('play', () => { playBtn.textContent = '❚❚'; });
for (const ev of ['pause', 'ended']) mix.addEventListener(ev, () => { playBtn.textContent = '▶'; stopOutput(); });
$('timelineWrap').addEventListener('click', (e) => { const r = e.currentTarget.getBoundingClientRect(); media.currentTime = clamp((e.clientX - r.left) / r.width, 0, 1) * A.duration; parts = []; $('intro').classList.add('hidden'); });
document.addEventListener('keydown', (e) => {
  if (e.target.matches('input, select')) return;
  if (e.code === 'Space') { e.preventDefault(); toggle(); } else if (e.code === 'Escape') emergencyStop();
  else if (e.code === 'ArrowRight') { media.currentTime = Math.min(A.duration, now() + 5); parts = []; } else if (e.code === 'ArrowLeft') { media.currentTime = Math.max(0, now() - 5); parts = []; }
});
document.addEventListener('visibilitychange', () => { if (document.hidden) { pause(); stopOutput(); } });
$('lrBtn').addEventListener('click', () => {
  const ac = new AudioContext();
  [[-1, 0], [1, .9]].forEach(([pan, at]) => { for (const [f, d] of [[1318.5, 0], [1760, .14]]) {
    const o = ac.createOscillator(), g = ac.createGain(), p = new StereoPannerNode(ac, { pan });
    o.frequency.value = pan < 0 ? f : f * 1.25; o.connect(g).connect(p).connect(ac.destination);
    const t0 = ac.currentTime + at + d; g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(.25, t0 + .01); g.gain.exponentialRampToValueAtTime(.001, t0 + .5); o.start(t0); o.stop(t0 + .55);
  } });
  const b = $('lrBtn'); b.textContent = 'Left…'; setTimeout(() => { b.textContent = '…Right'; }, 900); setTimeout(() => { b.textContent = 'Left / Right check'; ac.close(); }, 1900);
});
// sung lyrics: #subs .line > .ja / .en — shared/subs.js shows the chosen language (zh / ko from l10n.js)
const subsEl = $('subs'); let subKey = '';
const escH = (x) => x.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
function updateSubs(t) {
  const act = A.lyrics.filter((s) => t >= s.t0 && t < s.t1).slice(-1), key = act.map((s) => s.t0).join('|');
  if (key === subKey) return; subKey = key;
  subsEl.innerHTML = act.map((s) => `<div class="line"><div class="ja"><span class="who A">${s.who ? ((window.DIVA_THEME && DIVA_THEME.singer) || '綾音') : '♪'}</span>${escH(s.ja)}</div><div class="en">${escH(s.en)}</div></div>`).join('');
}
const sceneEl = $('sceneTitle'); let segIdx = -1, segTimer = 0;
function updateScene(t) {
  const i = A.segments.indexOf(segAt(t));
  if (i !== segIdx) { segIdx = i; const s = A.segments[i]; sceneEl.innerHTML = `${i + 1}　${s.ja}<small>${s.en}</small>`; sceneEl.classList.add('show'); clearTimeout(segTimer); segTimer = setTimeout(() => sceneEl.classList.remove('show'), 3000); }
}
$('credits').textContent = `Music: ${A.credits.music} · ${A.credits.art}`;

// ---------------------------------------------------------------- device output (same protocol as Demo 1 / 2 / 3)
const DEFAULT_RANGE = { heatMin: 0, heatMax: 200, coolMin: 35, coolMax: 80 };
const SEND_INTERVAL = 100, OFF = .03;
const store = { get: (k, d) => { try { return JSON.parse(localStorage.getItem(`moheat.${k}`)) ?? d; } catch { return d; } }, set: (k, v) => { try { localStorage.setItem(`moheat.${k}`, JSON.stringify(v)); } catch {} } };
const range = { ...DEFAULT_RANGE, ...store.get('range', {}) };
let lastSent = '', lastSendAt = 0, tripped = false, offsetMs = +store.get('asmr.offset', 0), intensity = +store.get('asmr.intensity', 100) / 100;
const device = MoHeatDevice.create({ select: $('portSelect'), addBtn: $('addPort'), connectBtn: $('connectBtn'), status: $('deviceStatus') }, { log: (l) => console.log('[MoHeat]', l), onConnect: () => { lastSent = ''; } });
if (!MoHeatDevice.supported) $('deviceStatus').querySelector('span').textContent = 'Web Serial needs desktop Chrome / Edge';
function command(th) {
  const part = (sd, c, h) => (c > OFF ? `${sd}C${Math.round(range.coolMin + c * (range.coolMax - range.coolMin))}` : h > OFF ? `${sd}H${Math.round(range.heatMin + h * (range.heatMax - range.heatMin))}` : `${sd}H0`);
  return Math.max(th.Lc, th.Lh, th.Rc, th.Rh) <= OFF ? 'stop' : `${part('L', th.Lc, th.Lh)} ${part('R', th.Rc, th.Rh)}`;
}
function stopOutput() { if (device.isConnected()) device.send('stop'); lastSent = 'stop'; }
function emergencyStop() { tripped = !tripped; const b = $('estop'); if (tripped) { pause(); stopOutput(); b.textContent = '↺ Re-arm output'; b.classList.add('tripped'); } else { b.textContent = '■ STOP'; b.classList.remove('tripped'); lastSent = ''; } }
$('estop').addEventListener('click', emergencyStop); addEventListener('pagehide', stopOutput);
const bindRange = (id, valId, fmtV, set) => { const el = $(id); el.addEventListener('input', () => { set(+el.value); $(valId).textContent = fmtV(+el.value); }); };
$('intensity').value = Math.round(intensity * 100); $('intensityVal').textContent = `${Math.round(intensity * 100)}%`;
$('offset').value = offsetMs; $('offsetVal').textContent = `${offsetMs >= 0 ? '+' : ''}${offsetMs} ms`;
bindRange('intensity', 'intensityVal', (v) => `${v}%`, (v) => { intensity = v / 100; store.set('asmr.intensity', v); });
bindRange('offset', 'offsetVal', (v) => `${v >= 0 ? '+' : ''}${v} ms`, (v) => { offsetMs = v; store.set('asmr.offset', v); });
const meterEls = Object.fromEntries(['Lc', 'Lh', 'Rc', 'Rh'].map((k) => [k, [$(`m${k}`), $(`v${k}`)]]));
function updateOutput(th, playing) {
  const scaled = Object.fromEntries(Object.entries(th).map(([k, v]) => [k, playing && !tripped ? v * intensity : 0]));
  for (const [k, [bar, val]] of Object.entries(meterEls)) { bar.style.width = `${scaled[k] * 100}%`; val.textContent = Math.round(scaled[k] * 100); }
  const cmd = command(scaled); $('cmd').textContent = cmd;
  if (!device.isConnected() || !$('sendOn').checked) return;
  const n = performance.now(); if (cmd !== lastSent && n - lastSendAt >= SEND_INTERVAL) { device.send(cmd); lastSent = cmd; lastSendAt = n; }
}
function loop() {
  const n = performance.now(), dt = clamp((n - lastFrame) / 1000, 0, .05); lastFrame = n;
  const t = now(); if (Math.abs(t - lastT) > .5) parts = []; lastT = t;
  const ix = window.MoHeatInteract && previewT == null ? window.MoHeatInteract.tick(t, media) : null;   // _kit/diva/ix.js: cheer any time + the name call
  const playing = (!media.paused && !media.ended) || previewT != null;
  const { st, th: th0 } = frame(t, playing || ix ? dt : 0);
  const io = window.MoHeatInteract ? window.MoHeatInteract.out(th0, ix) : { th: th0, live: null }, th = io.th, live = io.live ?? playing;
  drawRadar(st, live ? th : { Lc: 0, Lh: 0, Rc: 0, Rh: 0 }); updateOutput(th, live); updateScene(t); updateSubs(t);
  $('time').textContent = `${fmt(t)} / ${fmt(A.duration)}`; $('playhead').style.left = `${(t / A.duration) * 100}%`;
  $('posInfo').textContent = `${segAt(t).en} · ${A.bpm} BPM`;
  requestAnimationFrame(loop);
}
applyVoice();
requestAnimationFrame(loop);

// ---------------------------------------------------------------- LivLiv player: Ayane on the transparent overlay canvas #ll (same box as #scene)
// Pro-plan package (commercial use OK, no mark). idle OFF, no pointer follow, small head angles only (ART_RULES §6); the view is set from LLT.
const LL_BASE = new URL('.', LL_SRC).href;   // this file's folder (the kit), for the player import
// LivLiv built-in actions (DIVA_THEME.ll.acts + lookEar): fired when the clock passes the cue while playing (never on a seek). While one runs our
// head locks are lifted (parameterProfile = {}, no angle / body overrides; lookL / R also turn idle on for lookAt), then restored.
const ACTS = [...(LLX.acts || []), ...(LLX.lookEar === false ? [] : (A.close || []).flatMap((w) => w.lines.map(([lt, e]) => [lt - .15, e === 'L' ? 'lookL' : 'lookR', 2.2])))]
  .filter((c) => c[1] !== 'away').sort((a, b) => a[0] - b[0]);
const LL = { act: null, actUntil: 0, prof: null, p: null, K: 2, UX: 1000, UY: 1000, C0: { x: 0, y: 0 }, cal: true, map: null, pose: null, prev: null, dropAt: 0, bounceAt: -1, lastT: null, exprKey: '', pr: 0 };
const llc = $('ll');
const BASE_PR = 2, CLOSE_PR = Math.min(3, Math.max(2, devicePixelRatio || 2));   // sharper head while the camera is pushed in
function llMap() {   // scene px → CSS px inside the overlay (it has #scene's box; #scene draws with object-fit)
  const c = cv.getBoundingClientRect(), fit = getComputedStyle(cv).objectFit;
  const s = fit === 'cover' ? Math.max(c.width / W, c.height / H) : Math.min(c.width / W, c.height / H);
  const m = { s, ox: (c.width - W * s) / 2, oy: (c.height - H * s) / 2, w: c.width, h: c.height };
  llc.style.clipPath = `inset(${Math.max(0, m.oy)}px ${Math.max(0, m.ox)}px ${Math.max(0, m.oy)}px ${Math.max(0, m.ox)}px)`;   // never in the letterbox
  return m;
}
const twoFrames = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
async function llCalibrate() {   // model px per CSS px at zoom 1 (K) and CSS px per unit of view.x / view.y, measured on this canvas size
  const p = LL.p, cw = llc.clientWidth, ch = llc.clientHeight; if (!p || !cw || !ch) return;
  LL.cal = true; llc.style.opacity = 0;
  Object.assign(p.view, { x: 0, y: 0, zoom: 1 }); await twoFrames();
  const c = p.canvasToModel(cw / 2, ch / 2), r = p.canvasToModel(cw / 2 + 100, ch / 2);
  Object.assign(p.view, { x: .1, y: .1, zoom: 1 }); await twoFrames();
  const s = p.canvasToModel(cw / 2, ch / 2);
  LL.K = (r[0] - c[0]) / 100; LL.C0 = { x: c[0], y: c[1] }; LL.UX = (c[0] - s[0]) / LL.K / .1; LL.UY = (s[1] - c[1]) / LL.K / .1;
  LL.map = llMap(); LL.cal = false; llc.style.opacity = '';
}
// view that puts model point P at S (CSS px from the canvas centre, y down) at zoom Z
const llPlace = (P, S, Z) => ({ x: (S.x - (P.x - LL.C0.x) * Z / LL.K) / LL.UX, y: -(S.y - (P.y - LL.C0.y) * Z / LL.K) / LL.UY, zoom: Z });
let llBlinkAt = performance.now() + 2500;
function llBlink() {   // 1 open … 0 closed: a 140 ms blink every 2.5–5 s (idle is off, so we blink ourselves)
  const n = performance.now(); if (n > llBlinkAt + 140) llBlinkAt = n + 2500 + Math.random() * 2500;
  const k = (n - llBlinkAt) / 140; return k < 0 || k > 1 ? 1 : Math.abs(1 - 2 * k);
}
function llUpdate(f) {
  const T = LLT, p = LL.p; if (LL.cal || !T || !LL.map) return;
  const now = performance.now(), m = LL.map;
  // pose: the new body in at full weight over the old for 180 ms, + a 220 ms bounce (not on a seek)
  if (T.pose !== LL.pose) { const seek = LL.lastT == null || Math.abs(T.t - LL.lastT) > .5; LL.prev = seek ? null : LL.pose; LL.pose = T.pose; LL.dropAt = now + 180; if (!seek) LL.bounceAt = now; }
  { const seekA = LL.lastT == null || T.t < LL.lastT || T.t - LL.lastT > .5;   // action cues passed since the last frame
    if (seekA) { if (LL.act) llActEnd(); } else for (const c of ACTS) if (c[0] > LL.lastT && c[0] <= T.t) llAct(c[1], c[2]);
    if (LL.act && now > LL.actUntil) llActEnd(); }
  LL.lastT = T.t;
  const e = { [LL.pose]: 1 }; if (LL.prev && now < LL.dropAt) e[LL.prev] = 1; if (T.face) e[T.face] = 1;
  const key = Object.keys(e).sort().join(','); if (key !== LL.exprKey) { LL.exprKey = key; p.expr = e; }
  // head: nods only (no left / right turn, no tilt), no body sway / breath; mouth + vowel from the voice track; our own blinks
  if (LL.act) Object.assign(f.params, { mouthOpen: T.mouth, vowel: T.vowel });   // a built-in action plays as designed (no head locks)
  else Object.assign(f.params, { angleX: 0, angleY: T.nod, angleZ: 0, bodyX: 0, bodyZ: 0, breath: 0, eyeBallX: 0, eyeBallY: 0, mouthOpen: T.mouth, vowel: T.vowel });
  f.params.eyeLOpen = f.params.eyeROpen = Math.min(f.params.eyeLOpen ?? 1, llBlink());
  // camera: full figure standing at her stage place (feet on the floor line) → the ear close-up (face toward that ear)
  let s = T.sq, dip = 0;
  if (LL.bounceAt >= 0) { const k = (now - LL.bounceAt) / 220; if (k >= 1) LL.bounceAt = -1; else { s *= 1 + .03 * Math.sin(Math.PI * k); dip = 8 * Math.sin(2 * Math.PI * k); } }
  const toS = (x, y) => ({ x: m.ox + x * m.s - m.w / 2, y: m.oy + y * m.s - m.h / 2 });
  const Zb = T.k * m.s * LL.K * s, base = llPlace({ x: LLM.cx, y: LLM.bottom }, toS(T.x, T.foot + dip), Zb);
  let v = base;
  if (T.ear && T.ck > 0) {
    const Zc = Math.max(Zb, (T.ear.fh * m.s / LLM.face.h) * LL.K), c = llPlace(LLM.face, toS(T.ear.x, T.ear.y), Zc), k = T.ck;
    v = { x: base.x + (c.x - base.x) * k, y: base.y + (c.y - base.y) * k, zoom: Zb * Math.pow(Zc / Zb, k) };
  }
  Object.assign(p.view, v);
  const pr = T.ck > .05 ? CLOSE_PR : BASE_PR; if (pr !== LL.pr) { LL.pr = pr; p.maxPixelRatio = pr; }
  const br = (1 - T.dim).toFixed(3); if (llc.dataset.br !== br) { llc.dataset.br = br; llc.style.filter = +br < .995 ? `brightness(${br})` : ''; }   // house lights
}
function llAct(id, secs) {   // start one built-in action (ends the running one first)
  const p = LL.p; if (!p) return; if (LL.act) llActEnd();
  LL.act = id; p.parameterProfile = {};
  try { if (id === 'lookL' || id === 'lookR') { p.idle = true; p.lookAt((id === 'lookL' ? -1 : 1) * (LLX.lookK ?? .6), 0); } else p.act(id); } catch (e) { console.warn('[LivLiv act]', id, e); }
  LL.actUntil = performance.now() + 1000 * (secs || (id.startsWith('look') ? 2.2 : 2.6));
}
function llActEnd() {
  const p = LL.p, id = LL.act; LL.act = null; if (!p) return;
  if (id === 'lookL' || id === 'lookR') { p.lookAt(null); p.idle = false; }
  p.parameterProfile = LL.prof;
}
(async () => {
  try {
    const { Player } = await import(LL_BASE + 'livliv/index.js?v=050');
    if (!Player.isSupported()) throw new Error('WebGL2 not supported');
    const p = new Player(llc, { followPointer: false, idle: false, maxPixelRatio: BASE_PR });
    p.parameterProfile = { angleX: { input: [-30, 30], output: [-5, 5], curve: 1, smoothing: 0 }, angleY: { input: [-30, 30], output: [-6, 6], curve: 1, smoothing: 0 }, angleZ: { input: [-30, 30], output: [-3, 3], curve: 1, smoothing: 0 } };
    LL.prof = p.parameterProfile;
    if (!LLX.model) throw new Error('DIVA_THEME.ll.model missing'); await p.load(LLX.model);
    LL.p = p; p.use({ order: 20, update: llUpdate });
    await llCalibrate();
    let rt = 0; const re = () => { clearTimeout(rt); rt = setTimeout(llCalibrate, 120); };
    new ResizeObserver(re).observe(cv); addEventListener('orientationchange', re); addEventListener('fullscreenchange', re);
    window.LL_DEBUG = { ready: true, target: () => LLT, pose: () => LL.pose, expr: () => LL.exprKey, view: () => ({ ...p.view }), cal: () => ({ K: LL.K, UX: LL.UX, UY: LL.UY, C0: LL.C0, map: LL.map }), player: p, act: (id, s) => llAct(id, s), acts: ACTS, current: () => LL.act };
  } catch (err) { console.warn('[LivLiv]', err); window.LL_DEBUG = { ready: false, error: String(err) }; }
})();
