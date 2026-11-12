// EXHIBITION 120 s cut (kiosk only, 2026-11-11): whispered intro → the song cut to ≈ 79 s → whispered thank-you (+ a read gate, ix.js).
// 2026-11-13 (user): sound, picture and temperature come from ONE energy analysis of the song (scripts/energy.py → media/energy.js +
// the thermal track): warm energy (low + mid), sparkle (highs over the body), the mix's L / R balance, transients. The stage FX
// below (stage layers, colour temperature, LED wall, beams, the light sweep, snow / ice, flames, flash + confetti) read those curves. Based on:
// Ice & Fire Concert (MoHeat Evo Demo 3; song: the original 「きらきら こおりとほのお / Sparkling Ice & Fire」). Built on Demo 2's player.
// Clock = the edited song. Stage state, Ayane's dance (beat-synced poses), the LED wall, glow sticks, particles and the
// 4-channel thermal track (Mode B: music energy × stage positions; Mode A: music only) all follow that one timeline.
'use strict';

const W = 1920, H = 1080, HORIZON = 505;
const D = window.DEMO_DATA, A = D.anim;
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const rad = (d) => (d * Math.PI) / 180;
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const hash = (n) => { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); };

// ---------------------------------------------------------------- data
const parseCsv = (txt) => {
  const lines = txt.trim().split('\n'), head = lines[0].split(',');
  const cols = Object.fromEntries(head.map((h) => [h, []]));
  for (const l of lines.slice(1)) l.split(',').forEach((v, i) => cols[head[i]].push(head[i] === 'command' ? v : +v));
  return { rate: 20, Lc: cols.L_cool, Rc: cols.R_cool, Lh: cols.L_heat, Rh: cols.R_heat };
};
const MODES = { B: parseCsv(D.thermalCsv), A: parseCsv(D.thermalCsvA) };   // B = each ear from its own channel, A = the same on the mono mix
let TH = MODES.B;
const sample = (arr, rate, t) => {
  const x = clamp(t * rate, 0, arr.length - 1), i = Math.floor(x), f = x - i;
  return i + 1 < arr.length ? arr[i] * (1 - f) + arr[i + 1] * f : arr[i];
};
const thermalAt = (t) => ({ Lc: sample(TH.Lc, TH.rate, t), Rc: sample(TH.Rc, TH.rate, t), Lh: sample(TH.Lh, TH.rate, t), Rh: sample(TH.Rh, TH.rate, t) });
const wrapAz = (arr, t) => {
  const x = clamp(t * A.fps, 0, arr.length - 1), i = Math.floor(x), f = x - i;
  if (i + 1 >= arr.length) return arr[i];
  let d = arr[i + 1] - arr[i]; if (d > 180) d -= 360; if (d < -180) d += 360;
  return ((arr[i] + d * f + 540) % 360) - 180;
};
const azAt = (t) => wrapAz(A.chars.A.az, t);
const dAt = (t) => sample(A.chars.A.d, A.fps, t);
const feat = (k, t) => sample(A.features[k], A.featureRate, t);
const segAt = (t) => A.segments.find((s) => t >= s.t0 && t < s.t1) || A.segments[A.segments.length - 1];
const beatPhase = (t) => {   // 0 at each beat, rising to 1 just before the next
  const b = A.beats; let i = 0, lo = 0, hi = b.length - 1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (b[m] <= t) { i = m; lo = m + 1; } else hi = m - 1; }
  const p = b[i + 1] ? (t - b[i]) / (b[i + 1] - b[i]) : 0;
  return { i, p: clamp(p, 0, 1), on: t >= b[0] ? Math.exp(-((t - b[i]) / .09)) : 0 };
};
const poseAt = (t) => { let p = A.poses[0][1]; for (const [pt, name] of A.poses) { if (pt <= t) p = name; else break; } return p; };
const coolCueAt = (t) => A.coolCues.find((c) => t >= c.t && t <= c.t + c.dur) || null;
const coolAzAt = (t) => wrapAz(A.cool.az, t);
const EN = window.ENERGY || { rate: 25, warm: [0], spark: [0], bal: [0], low: [0], mid: [0], high: [0], trans: [], drops: [] };
const en = (k, t) => sample(EN[k], EN.rate, t);
const ICE = '150,215,255', FIRE = '255,140,60', PINK = '255,120,210';
// the song's title on the stage screen, in the chosen language (D11: our own song 「きらきら こおりとほのお」, not the old licensed title)
const SONG_TITLE = () => ({ ja: 'きらきら こおりとほのお', zh: '闪闪发光的冰与火', ko: '반짝반짝 얼음과 불꽃' }[window.MoHeatSub?.lang] || 'Sparkling Ice & Fire');
const tempAt = (t) => clamp(en('warm', t) * 1.2 - en('spark', t) * .9, -1, 1);   // + warm-dominant, − icy
const tempCol = (t, alt = PINK) => { const k = tempAt(t); return k > .15 ? FIRE : k < -.15 ? ICE : alt; };
let flash = 0, transI = 0, lastFxT = -1;   // (kept for the LED pulse) and the next hit to fire
// per-side stage state = exactly what each ear feels (scripts/energy.py builds the thermal track FROM these, user 2026-11-13):
// side 'L' / 'R' → { h: warm 0..1, c: cool 0..1 }. Ice / snow / icy light only where c > 0, fire / warm beams only where h > 0.
const sideAt = (e, t) => ({ h: en(e + 'h', t), c: en(e + 'c', t) });
const inSong = (t) => t >= EN.song[0] && t < EN.song[1];
const hitFx = { L: { w: 0, c: 0 }, R: { w: 0, c: 0 } };   // decaying hit flashes per side

// ---------------------------------------------------------------- art
const ART = new Set(D.art || []);
const FACES = D.artFaces || {};
const IMG = {};
for (const f of ART) { const im = new Image(); im.src = `media/art/${f}.webp`; IMG[f] = im; }
const ok = (k) => IMG[k] && IMG[k].complete && IMG[k].naturalWidth > 0;
const FACING_R = new Set(['A_pose_side', 'A_pose_run', 'A_dance_step', 'A_dance_kick']);
const xOf = (az) => W / 2 + Math.sin(rad(clamp(az, -60, 60))) * W * .62;

// ---------------------------------------------------------------- stage: one stage, four states as cross-faded layers
const BW = W + 80;
const stageGeom = () => { const k = BW / 1536, BH = 1024 * k; return { k, BH, oy: -(BH - H) * .5 }; };
function stageMix(t) {
  // weights of base / ice / warm / split (+ mirrored split) with a one-bar cross-fade at section changes
  const at = (tt) => {
    const s = segAt(tt).stage;
    if (s === 'climax') { const side = Math.sign(azAt(tt)) || 1; return side > 0 ? { splitM: 1 } : { split: 1 }; }   // ice on the side opposite Ayane
    return { normal: { base: 1 }, ice: { ice: 1 }, split: { split: 1 }, split_swap: { splitM: 1 } }[s];
  };
  const out = { base: 0, ice: 0, warm: 0, split: 0, splitM: 0 }, n = 7, span = segAt(t).stage === 'climax' ? .6 : 2.73;
  for (let i = 0; i < n; i++) { const w = at(t - span / 2 + (span * i) / (n - 1)); for (const k in w) out[k] += w[k] / n; }
  return out;
}
function drawStage(ctx, t, shift) {
  const { BH, oy } = stageGeom(), ox = -40 + clamp(shift, -40, 40);
  const S = { L: sideAt('L', t), R: sideAt('R', t) }, song = inSong(t), bp = beatPhase(t);
  const act = song ? Math.max(S.L.h, S.L.c, S.R.h, S.R.c) : 0;   // how much is going on (0 = calm stage)
  if (ok('concert_stage_base')) ctx.drawImage(IMG.concert_stage_base, ox, oy, BW, BH);
  // each half of the stage takes the warm-lit or the icy version of the set, exactly as much as that ear is warm / cool
  for (const [e, x0] of [['L', 0], ['R', W / 2]]) {
    ctx.save(); ctx.beginPath(); ctx.rect(x0, 0, W / 2, H); ctx.clip();
    if (song && S[e].h > .02 && ok('concert_stage_warm')) { ctx.globalAlpha = clamp(S[e].h * 1.1, 0, 1); ctx.drawImage(IMG.concert_stage_warm, ox, oy, BW, BH); }
    if (song && S[e].c > .02 && ok('concert_stage_ice')) { ctx.globalAlpha = clamp(S[e].c * 1.15, 0, 1); ctx.drawImage(IMG.concert_stage_ice, ox, oy, BW, BH); }
    ctx.restore();
  }
  if (act < .25) { ctx.fillStyle = `rgba(10,6,22,${.38 * (1 - act / .25)})`; ctx.fillRect(0, 0, W, H); }   // both ears neutral → a calmer, darker stage
  // LED wall: the left half of the bars in the left ear's colour, the right half in the right ear's
  const sx = ox + .195 * BW, sy = oy + .245 * BH, sw = .61 * BW, sh = .32 * BH;
  const colOf = (e) => (S[e].c > S[e].h && S[e].c > .05 ? ICE : S[e].h > .05 ? FIRE : PINK);
  ctx.save(); ctx.beginPath(); ctx.rect(sx, sy, sw, sh); ctx.clip();
  ctx.fillStyle = 'rgba(16,8,34,.6)'; ctx.fillRect(sx, sy, sw, sh);
  const nb = 32;
  for (let i = 0; i < nb; i++) {
    const u = (i + .5) / nb, e = u < .5 ? 'L' : 'R', band = i % 3 === 0 ? 'low' : i % 3 === 1 ? 'mid' : 'high';
    const v = clamp(en(band, t - (i % 4) * .03) * (.35 + .65 * Math.max(S[e].h, S[e].c)) * (.75 + .25 * Math.sin(t * 5 + i)), 0, 1), bh = v * sh * .92, x = sx + u * sw;
    const g = ctx.createLinearGradient(0, sy + sh, 0, sy + sh - bh); g.addColorStop(0, `rgba(${colOf(e)},.92)`); g.addColorStop(1, 'rgba(255,255,255,.85)');
    ctx.fillStyle = g; ctx.fillRect(x - sw / nb * .35, sy + sh - bh, sw / nb * .7, bh);
  }
  ctx.font = `800 ${Math.round(sh * .16)}px "Zen Maru Gothic", sans-serif`; ctx.textAlign = 'center'; ctx.fillStyle = `rgba(255,255,255,${.3 + .5 * act})`;
  ctx.fillText(SONG_TITLE(), sx + sw / 2, sy + sh * .28);
  ctx.restore();
  // beams: the left three belong to the left ear, the right three to the right ear (warm orange / icy white-blue / dim)
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 6; i++) {
    const e = i < 3 ? 'L' : 'R', v = song ? Math.max(S[e].h, S[e].c) : 0, col = colOf(e);
    const bx = ox + (.24 + i * .104) * BW, by = oy + .1 * BH, ang = Math.sin(t * (.5 + i * .11) + i * 1.3) * .22 + (e === 'L' ? .18 : -.18);
    const a = .02 + .55 * v + .35 * hitFx[e].w + .1 * bp.on * v;
    const g = ctx.createLinearGradient(bx, by, bx + Math.sin(ang) * 820, by + 820); g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(bx - 10, by); ctx.lineTo(bx + 10, by);
    ctx.lineTo(bx + Math.sin(ang) * 820 + 170, by + 820); ctx.lineTo(bx + Math.sin(ang) * 820 - 170, by + 820); ctx.fill();
  }
  ctx.restore();
}

// audience silhouettes + glow sticks waving on the beat, coloured by the stage state
const STICKS = Array.from({ length: 46 }, (_, i) => ({ u: (i + hash(i) * .8) / 46, h: hash(i + 7), ph: hash(i + 3) * 6.28 }));
function drawAudience(ctx, t) {
  const bp = beatPhase(t), S = { L: sideAt('L', t), R: sideAt('R', t) }, song = inSong(t);
  const ah = (W + 80) / 1536 * 512 * .62, top = H - ah;
  if (ok('audience_fg')) ctx.drawImage(IMG.audience_fg, -40, top, W + 80, ah);
  const ay = top + ah * .52;   // glow sticks: each half in its ear's colour; they swing harder the more that side is going on
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  for (const s of STICKS) {
    const e = s.u < .5 ? 'L' : 'R', v = song ? Math.max(S[e].h, S[e].c) : 0;
    const c = S[e].c > S[e].h && S[e].c > .05 ? ICE : S[e].h > .05 ? FIRE : s.h > .5 ? PINK : '140,160,255';
    const x = s.u * W, y = ay + s.h * 40, sw = Math.sin((bp.i + bp.p) * Math.PI + s.ph * .2) * (.15 + .6 * v);
    const x2 = x + Math.sin(sw) * 60, y2 = y - Math.cos(sw) * 60;
    ctx.strokeStyle = `rgba(${c},${.45 + .5 * v})`; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.strokeStyle = `rgba(${c},${.08 + .25 * v})`; ctx.lineWidth = 26; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- particles (FX sprites)
let parts = [];
function spawn(o) { if (parts.length < 900) parts.push(o); }
function updateParts(dt) {
  for (const q of parts) { q.life += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += (q.g || 0) * dt; q.rot += (q.spin || 0) * dt; }
  parts = parts.filter((q) => q.life < q.max);
}
function drawParts(ctx) {
  for (const q of parts) {
    const k = q.life / q.max, a = Math.sin(Math.PI * Math.min(1, k * 1.3)) * q.a;
    if (q.rect) { ctx.save(); ctx.globalAlpha = a; ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.fillStyle = q.rect; ctx.fillRect(-q.size / 2, -q.size / 4, q.size, q.size / 2); ctx.restore(); continue; }
    if (!ok(q.img)) continue;
    ctx.save(); ctx.globalAlpha = a; if (q.add) ctx.globalCompositeOperation = 'lighter';
    ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.drawImage(IMG[q.img], -q.size / 2, -q.size / 2, q.size, q.size); ctx.restore();
  }
}
function emitFx(t, dt, st) {
  const song = inSong(t), S = { L: sideAt('L', t), R: sideAt('R', t) };
  const half = (e) => (e === 'L' ? Math.random() * W * .5 : W * .5 + Math.random() * W * .5);
  for (const e of ['L', 'R']) {
    if (!song) continue;
    // ice / snow fill the cool half (only there), flames rise only in the warm half
    if (S[e].c > .05 && Math.random() < dt * 70 * S[e].c) spawn({ img: Math.random() < .5 ? 'fx_snowflake' : 'fx_ice_crystal', x: half(e), y: -40, vx: (Math.random() - .5) * 50, vy: 150 + Math.random() * 120, size: 34 + Math.random() * 56, rot: Math.random() * 6, spin: (Math.random() - .5) * 2, life: 0, max: 4.5, a: .95, add: true, side: e });
    if (S[e].h > .2 && Math.random() < dt * 34 * (S[e].h - .2)) spawn({ img: 'fx_flame', x: half(e), y: H * .6 + Math.random() * 80, vx: (Math.random() - .5) * 40, vy: -170 - Math.random() * 90, size: 56 + Math.random() * 80 * S[e].h, rot: 0, life: 0, max: 1.2, a: .95, add: true, side: e });
  }
  // a side that stops being cool / warm loses its ice / flames at once (nothing icy on a warm side, nothing fiery on a cool side)
  parts = parts.filter((q) => !q.side || (q.img === 'fx_flame' ? S[q.side].h > .03 : q.img === 'fx_snowflake' || q.img === 'fx_ice_crystal' ? S[q.side].c > .02 || q.life < .2 : true));
  // the hits = the thermal pulses (same list, same frame): warm → flash + sparks + confetti on that half; cool → a frost burst there
  if (t < lastFxT - .05 || t > lastFxT + 1) { transI = EN.hits.findIndex((x) => x[0] >= t); if (transI < 0) transI = EN.hits.length; }
  lastFxT = t;
  while (transI < EN.hits.length && EN.hits[transI][0] <= t) {
    const [, e, kind, s] = EN.hits[transI++], cx = e === 'L' ? W * .25 : W * .75;
    if (kind === 'w') {
      hitFx[e].w = Math.max(hitFx[e].w, s);
      for (let i = 0; i < Math.round(16 + 30 * s); i++) spawn({ rect: ['#ffd23f', '#ff8a3d', '#ff6fb5', '#ffffff'][i % 4], x: cx + (Math.random() - .5) * W * .45, y: -20 - Math.random() * 100, vx: (Math.random() - .5) * 100, vy: 130 + Math.random() * 160, g: 40, size: 14 + Math.random() * 14, rot: Math.random() * 6, spin: (Math.random() - .5) * 8, life: 0, max: 3, a: 1 });
      for (let i = 0; i < 8; i++) spawn({ img: 'fx_star', x: cx + (Math.random() - .5) * W * .4, y: 180 + Math.random() * 300, vx: (Math.random() - .5) * 60, vy: -30, size: 44 + Math.random() * 40, rot: 0, spin: 2, life: 0, max: .9, a: 1, add: true });
    } else {
      hitFx[e].c = Math.max(hitFx[e].c, s);
      for (let i = 0; i < 26; i++) { const a = Math.random() * 6.28, v = 200 + Math.random() * 380; spawn({ img: 'fx_ice_crystal', x: cx, y: H * .45, vx: Math.cos(a) * v * .9, vy: Math.sin(a) * v * .6, size: 40 + Math.random() * 60, rot: Math.random() * 6, spin: 2, life: 0, max: 1.3, a: 1, add: true, side: e }); }
    }
  }
  for (const e of ['L', 'R']) { hitFx[e].w = Math.max(0, hitFx[e].w - dt * 1.8); hitFx[e].c = Math.max(0, hitFx[e].c - dt * 1.5); }
  flash = Math.max(hitFx.L.w, hitFx.R.w);
  if (st && en('mid', t) > .6 && Math.random() < dt * 3) spawn({ img: Math.random() < .5 ? 'fx_note' : 'fx_heart', x: st.x + (Math.random() - .5) * 240 * st.s, y: st.y - 140 * st.s, vx: (Math.random() - .5) * 50, vy: -100 - Math.random() * 60, size: 50 + Math.random() * 30, rot: (Math.random() - .5) * .5, life: 0, max: 2, a: 1 });
}

// ---------------------------------------------------------------- Ayane
function blinkAmt(t) { const p = 3.6, k = Math.floor(t / p), off = hash(k * 7) * (p - .5), dt = t - k * p - off; return dt >= 0 && dt < .16 ? Math.abs(Math.cos((dt / .16) * Math.PI)) : 1; }
function bustFrame(st) {
  if (st.blink < .5) return 'A_bust_blink';
  const m = st.mouth;
  return m > .7 ? 'A_bust_sing_wide' : m > .45 ? 'A_bust_sing_mid' : m > .25 ? 'A_bust_mouth_open' : m > .1 ? 'A_bust_mouth_half' : 'A_bust_happy';
}
function drawWarped(img, cx, pivotX, pivotY, top, k, flip, alpha, rot, sway, breath) {
  const iw = img.naturalWidth, ih = img.naturalHeight, N = 26;
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(cx, pivotY); ctx.rotate(rot); ctx.scale((flip ? -1 : 1) * (1 - breath * .5), 1 + breath);
  const ox = -pivotX * k;
  for (let i = 0; i < N; i++) {
    const v0 = i / N, v1 = (i + 1) / N, off = sway * Math.pow((v0 + v1) / 2, 2.2) * (flip ? -1 : 1);
    ctx.drawImage(img, 0, ih * v0, iw, ih * (v1 - v0) + 1, ox + off, top + ih * k * v0, iw * k, ih * k * (v1 - v0) + 1);
  }
  ctx.restore();
}
const fig = { cur: null, prev: null, since: -9, lastT: -9 };
function charState(t) {
  if (t < A.present.A[0]) return null;
  const az = azAt(t), d = dAt(t), v = azAt(t + .1) - azAt(t - .1), vel = clamp(v / .2, -150, 150);
  const s = clamp(.9 * Math.pow(1 / d, .55), .3, 1.6), near = clamp((1.4 - d) / 1.1, 0, 1), bp = beatPhase(t);
  const bounce = t > A.song[0] && t < A.song[1] - 11 ? Math.pow(1 - bp.p, 3) * 16 * s : Math.sin(t * 1.6) * 5 * s;
  return { az, d, vel, s, near, x: xOf(az), y: lerp(HORIZON, 560, near) - bounce, alpha: clamp((t - A.present.A[0]) / .6, 0, 1),
           mouth: clamp(A.chars.A.mouth[Math.round(t * A.fps)] || 0, 0, 1), blink: blinkAmt(t), bp };
}
function look(st, t) {
  if (st.d < .75 && ok('A_bust_base')) return { img: bustFrame(st), kind: 'bust', flip: false };
  const name = poseAt(t), dx = xOf(azAt(t + .1)) - xOf(azAt(t - .1));
  const want = Math.abs(dx) > 5 ? (dx > 0 ? 'R' : 'L') : (st.x > W / 2 ? 'L' : 'R');
  return { img: ok(name) ? name : 'A_pose_front', kind: 'pose', flip: FACING_R.has(name) && want === 'L' };
}
function layout(lk, st) {
  const img = IMG[lk.img], iw = img.naturalWidth, ih = img.naturalHeight;
  if (lk.kind === 'bust') { const F = FACES.A_bust; const k = (240 * st.s) / (F.rx * 1.25); return { k, pivotX: F.cx, top: -F.cy * k }; }
  const h = 780 * st.s, k = h / ih; return { k, pivotX: iw / 2, top: -.26 * h };
}
function drawAyane(st, t) {
  const lk = look(st, t); if (!ok(lk.img)) return;
  const key = lk.img + (lk.flip ? ':f' : ''), jumped = Math.abs(t - fig.lastT) > .5;
  const same = fig.cur && fig.cur.lk.kind === 'bust' && lk.kind === 'bust';
  if (!fig.cur || jumped) { fig.cur = { lk, key }; fig.prev = null; fig.since = -9; }
  else if (key !== fig.cur.key) { if (same) fig.cur = { lk, key }; else { fig.prev = fig.cur; fig.cur = { lk, key }; fig.since = t; } }
  fig.lastT = t;
  const fade = clamp((t - fig.since) / .12, 0, 1);
  const g = ctx.createRadialGradient(st.x, st.y + 60 * st.s, 30 * st.s, st.x, st.y + 60 * st.s, 380 * st.s);
  g.addColorStop(0, `rgba(255,150,210,${.22 * st.alpha})`); g.addColorStop(1, 'rgba(255,150,210,0)');
  ctx.fillStyle = g; ctx.fillRect(st.x - 400 * st.s, st.y - 340 * st.s, 800 * st.s, 800 * st.s);
  if (fig.cur.lk.kind === 'pose') {
    const L0 = layout(fig.cur.lk, st), feetY = st.y + L0.top + IMG[fig.cur.lk.img].naturalHeight * L0.k * .975, hw = 130 * st.s;
    ctx.save(); ctx.globalAlpha = .45 * st.alpha; ctx.translate(st.x, feetY); ctx.scale(1, .22);
    const sg = ctx.createRadialGradient(0, 0, 0, 0, 0, hw); sg.addColorStop(0, 'rgba(30,0,40,.65)'); sg.addColorStop(1, 'rgba(30,0,40,0)');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(0, 0, hw, 0, 7); ctx.fill(); ctx.restore();
  }
  const sway = (Math.sin(t * 2.2) * 12 - clamp(st.vel * .3, -40, 40)) * st.s;
  // the new pose is always fully opaque and the old one fades out ON TOP (critic 2026-11-11: two poses at 50 % each read as a see-through
  // Ayane, and a pause mid-fade froze it); paused → only the new pose
  for (const [layer, a] of [[fig.cur, 1], [fig.prev, media.paused ? 0 : 1 - fade]]) {
    if (!layer || a <= .01 || !ok(layer.lk.img)) continue;
    const L = layout(layer.lk, st);
    drawWarped(IMG[layer.lk.img], st.x, L.pivotX, st.y, L.top, L.k, layer.lk.flip, st.alpha * a, clamp(st.vel / 900, -.12, .12), sway, .01 * Math.sin(t * 2) + st.mouth * .008);
  }
}

// ---------------------------------------------------------------- frame
const cv = $('scene'), ctx = cv.getContext('2d');
let camYaw = 0, lastT = 0, lastFrame = performance.now();
function thermalEdges(ctx, t) {   // the side glow on each stage edge = that ear's temperature (orange warm / icy blue cool), on the picture's clock
  for (const [e, side] of [['L', -1], ['R', 1]]) {
    const S = sideAt(e, t), v = Math.max(S.c, S.h), hw = hitFx[e];
    const x0 = side < 0 ? 0 : W, x1 = side < 0 ? 620 : W - 620;
    if (v > .02) {
      const col = S.c >= S.h ? '90,185,255' : '255,120,45';
      const g = ctx.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, `rgba(${col},${.62 * v})`); g.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = g; ctx.fillRect(Math.min(x0, x1), 0, 620, H);
    }
    for (const [k, col] of [['w', '255,235,200'], ['c', '200,235,255']]) if (hw[k] > .01) {   // the hit flash on that half
      const g = ctx.createRadialGradient(side < 0 ? W * .25 : W * .75, H * .45, 30, side < 0 ? W * .25 : W * .75, H * .45, W * .4);
      g.addColorStop(0, `rgba(${col},${.5 * hw[k]})`); g.addColorStop(1, `rgba(${col},0)`);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(side < 0 ? 0 : W / 2, 0, W / 2, H); ctx.restore();
    }
  }
}
function frame(t, dt) {
  const st = charState(t);
  camYaw += ((st ? clamp(st.az, -40, 40) * .12 : 0) - camYaw) * clamp(dt * 1.2, 0, 1);
  drawStage(ctx, t, -camYaw * 6);
  { const dim = t < A.song[0] ? .5 * clamp((A.song[0] - .6 - t) / 1.2, 0, 1) : .32 * clamp((t - A.song[1] - .5) / 1.5, 0, 1); if (dim > .005) { ctx.fillStyle = `rgba(8,4,18,${dim})`; ctx.fillRect(0, 0, W, H); } }   // the house lights: down before / after the song
  const front = st && st.d < 1.2;
  if (st && !front) { ctx.save(); ctx.translate(-camYaw * 8, 0); drawAyane(st, t); ctx.restore(); }
  drawAudience(ctx, t);
  if (st && front) { ctx.save(); ctx.translate(-camYaw * 8, 0); drawAyane(st, t); ctx.restore(); }
  emitFx(t, dt, st); updateParts(dt); drawParts(ctx);
  const th = thermalAt(t + offsetMs / 1000);
  thermalEdges(ctx, t);
  return { st, th };
}

// ---------------------------------------------------------------- radar, timeline
const radar = $('radar'), rctx = radar.getContext('2d');
function drawRadar(st, th, t) {
  const c = rctx, w = radar.width, h = radar.height, cx = w / 2, cy = h / 2 + 6, R = 170;
  c.clearRect(0, 0, w, h); c.strokeStyle = '#3a2850'; c.lineWidth = 2;
  for (const r of [.33, .66, 1]) { c.beginPath(); c.arc(cx, cy, R * r, 0, 7); c.stroke(); }
  c.fillStyle = '#8a7aa6'; c.font = '20px Inter'; c.textAlign = 'center'; c.fillText('stage', cx, cy - R - 10);
  for (const [sd, cl, hh] of [[-1, th.Lc, th.Lh], [1, th.Rc, th.Rh]]) {
    const v = Math.max(cl, hh), col = cl >= hh ? '79,179,255' : '255,122,69';
    const g = c.createRadialGradient(cx + sd * 44, cy, 0, cx + sd * 44, cy, 90); g.addColorStop(0, `rgba(${col},${.8 * v})`); g.addColorStop(1, `rgba(${col},0)`);
    c.fillStyle = g; c.beginPath(); c.arc(cx + sd * 44, cy, 90, 0, 7); c.fill();
    c.fillStyle = v > .02 ? `rgb(${col})` : '#3a4766'; c.beginPath(); c.roundRect(cx + sd * 44 - 9, cy - 22, 18, 44, 8); c.fill();
  }
  c.fillStyle = '#251836'; c.strokeStyle = '#8a7aa6'; c.beginPath(); c.arc(cx, cy, 36, 0, 7); c.fill(); c.stroke();
  const dot = (az, d, col, label, r0) => {
    const r = 44 + (R - 44) * clamp(Math.log(d / .3) / Math.log(5 / .3), 0, 1), x = cx + Math.sin(rad(az)) * r, y = cy - Math.cos(rad(az)) * r;
    c.fillStyle = col; c.beginPath(); c.arc(x, y, r0, 0, 7); c.fill(); c.fillStyle = '#fff'; c.font = '600 20px "Noto Sans JP"'; c.fillText(label, x, y - r0 - 6);
  };
  if (st) dot(st.az, st.d, '#ff8cc6', '綾音 ', 13 + st.mouth * 6);
  if (coolCueAt(t)) dot(coolAzAt(t), 1.2, '#7cc4ff', '', 12);
}
const tl = $('timeline'), tlctx = tl.getContext('2d');
function drawTimeline() {
  const c = tlctx, w = tl.width, h = tl.height, n = TH.Lc.length;
  c.fillStyle = '#160e22'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * w, bw = w / n + 1;
    for (const [row, cl, hh] of [[0, TH.Lc[i], TH.Lh[i]], [1, TH.Rc[i], TH.Rh[i]]]) {
      const v = Math.max(cl, hh); if (v < .02) continue;
      c.fillStyle = cl >= hh ? `rgba(79,179,255,${.15 + .85 * v})` : `rgba(255,122,69,${.15 + .85 * v})`; c.fillRect(x, row ? h / 2 + 1 : 2, bw, h / 2 - 3);
    }
  }
  c.fillStyle = 'rgba(255,255,255,.4)'; c.font = '600 14px Inter';
  A.segments.forEach((s, i) => { const x = (s.t0 / A.duration) * w; c.fillRect(x, 0, 1.5, h); c.fillText(String(i + 1), x + 4, 15); });
}
drawTimeline();

// ---------------------------------------------------------------- media / clock / UI
const mix = $('mix'), film = $('film');
const media = mix;
const playBtn = $('playBtn');
if (new URLSearchParams(location.search).has('cover')) document.body.classList.add('cover-only');
const preview = new URLSearchParams(location.search).get('t');
let previewT = preview != null ? +preview : null;
if (previewT != null) { $('intro').classList.add('hidden'); mix.addEventListener('play', () => { previewT = null; }, { once: true }); }
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
// whispered lines (exhibition cut): #subs .line > .ja / .en — shared/subs.js shows the chosen language
const subsEl = $('subs'); let subKey = '';
const escH = (x) => x.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
function updateSubs(t) {
  const act = (A.subs || []).filter((s) => t >= s.t0 && t < s.t1).slice(-1), key = act.map((s) => s.t0).join('|');
  if (key === subKey) return; subKey = key;
  subsEl.innerHTML = act.map((s) => `<div class="line"><div class="ja"><span class="who A">綾音</span>${escH(s.ja)}</div><div class="en">${escH(s.en)}</div></div>`).join('');
}
const sceneEl = $('sceneTitle'); let segIdx = -1, segTimer = 0;
function updateScene(t) {
  const i = A.segments.indexOf(segAt(t));
  if (i !== segIdx) { segIdx = i; const s = A.segments[i]; sceneEl.innerHTML = `${i + 1}　${s.ja}<small>${s.en}</small>`; sceneEl.classList.add('show'); clearTimeout(segTimer); segTimer = setTimeout(() => sceneEl.classList.remove('show'), 3200); }
}
$('credits').textContent = `Music: ${A.credits.music} · ${A.credits.art}`;
$('thermalMode').addEventListener('change', () => { TH = MODES[$('thermalMode').value]; drawTimeline(); lastSent = ''; });

// ---------------------------------------------------------------- device output (same protocol as Demo 1 / 2)
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
  const ix = window.MoHeatInteract && previewT == null ? window.MoHeatInteract.tick(t, media) : null;   // ../../shared/interact.js: waits for you / cheer mode
  const playing = (!media.paused && !media.ended) || previewT != null;
  const { st, th: th0 } = frame(t, playing || ix ? dt : 0);
  const io = window.MoHeatInteract ? window.MoHeatInteract.out(th0, ix) : { th: th0, live: null }, th = io.th, live = io.live ?? playing;
  drawRadar(st, live ? th : { Lc: 0, Lh: 0, Rc: 0, Rh: 0 }, t); updateOutput(th, live); updateScene(t); updateSubs(t);
  $('time').textContent = `${fmt(t)} / ${fmt(A.duration)}`; $('playhead').style.left = `${(t / A.duration) * 100}%`;
  $('posInfo').textContent = st ? `${(window.MoHeatSub?.name || String)('綾音')} ${Math.round(st.az)}° · ${segAt(t).en} · ${Math.round(A.bpm * 2)} BPM` : '';
  requestAnimationFrame(loop);
}

// ---------------------------------------------------------------- offline render (scripts/render_mp4.py)
const RENDER = new URLSearchParams(location.search).has('render');
async function renderAll() {
  await document.fonts.ready;
  const cover = new Image(); cover.src = 'media/cover.jpg'; await cover.decode().catch(() => {});
  await Promise.all(Object.values(IMG).map((im) => im.decode().catch(() => {})));
  const fps = 30, n = Math.round(A.duration * fps); parts = [];
  for (let i = 0; i < n; i++) {
    const t = i / fps; frame(t, 1 / fps);
    if (t < 2.6 && cover.naturalWidth) { ctx.globalAlpha = t < 1.8 ? 1 : (2.6 - t) / .8; ctx.drawImage(cover, 0, 0, W, H); ctx.globalAlpha = 1; }
    const si = A.segments.indexOf(segAt(t)), s = A.segments[si], age = si === 0 ? t - 2.6 : t - s.t0;
    if (age >= 0 && age < 3.4) {
      ctx.globalAlpha = clamp(Math.min(age / .5, (3.4 - age) / .6), 0, 1);
      ctx.fillStyle = 'rgba(20,6,30,.55)'; ctx.fillRect(70, 60, 640, 96); ctx.fillStyle = '#ff8cc6'; ctx.fillRect(70, 60, 5, 96);
      ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = '700 38px "Zen Maru Gothic", sans-serif'; ctx.fillText(`${si + 1}　${s.ja}`, 96, 106);
      ctx.fillStyle = '#e6d6ef'; ctx.font = '500 24px Inter, sans-serif'; ctx.fillText(s.en, 96, 140); ctx.globalAlpha = 1;
    }
    if (t > A.duration - 6) {   // end credit
      ctx.globalAlpha = clamp((t - (A.duration - 6)) / 1, 0, 1); ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = '600 30px Inter, sans-serif';
      ctx.fillText(({ ja: '音楽：オリジナル曲（ElevenLabs Music）', zh: '音乐：原创歌曲（ElevenLabs Music）', ko: '음악: 오리지널 곡 (ElevenLabs Music)' })[window.MoHeatSub?.lang] || 'Music: original song (ElevenLabs Music)', W / 2, H - 70); ctx.globalAlpha = 1;
    }
    const blob = await new Promise((r) => cv.toBlob(r, 'image/jpeg', .92));
    await fetch(`/frame/${String(i).padStart(5, '0')}.jpg`, { method: 'PUT', body: blob });
  }
  await fetch('/done', { method: 'PUT' });
}
if (RENDER) { document.body.classList.add('rendering'); renderAll(); } else requestAnimationFrame(loop);
