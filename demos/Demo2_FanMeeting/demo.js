// キミだけのスペシャルファンミーティング — MoHeat Evo ASMR demo 2.
// Built on Demo 1's player. Clock = the binaural mix . Everything is a function of that time:
//   Ayane (positions, lip sync, poses), the cooling source (its own position), subtitles, and the 4-channel thermal
//   track (media/thermal.csv: voice → heat, cooling SFX → cool, each split left/right by its own position).
'use strict';

const W = 1920, H = 1080, HORIZON = 520;
const D = window.DEMO_DATA, A = D.anim;
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const rad = (d) => (d * Math.PI) / 180;
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const hash = (n) => { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); };

// ---------------------------------------------------------------- data access
const TH = (() => {
  const lines = D.thermalCsv.trim().split('\n');
  const head = lines[0].split(',');
  const cols = Object.fromEntries(head.map((h) => [h, []]));
  for (const l of lines.slice(1)) l.split(',').forEach((v, i) => cols[head[i]].push(head[i] === 'command' ? v : +v));
  return { rate: 20, Lc: cols.L_cool, Rc: cols.R_cool, Lh: cols.L_heat, Rh: cols.R_heat };
})();
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
const azAt = (who, t) => wrapAz(A.chars[who].az, t);
const dAt = (who, t) => sample(A.chars[who].d, A.fps, t);
const mouthAt = (who, t) => sample(A.chars[who].mouth, A.fps, t);
const coolAt = (t) => ({ az: wrapAz(A.cool.az, t), d: sample(A.cool.d, A.fps, t), env: sample(A.cool.env, A.fps, t) });
const HEAT_KINDS = new Set(['say', 'whisper', 'warm', 'sing']);
const COOL_KINDS = new Set(['fan', 'swish', 'ice', 'coolbreath', 'magic']);
const lastCue = (t, kinds, tail = .8) => {
  let best = null;
  for (const c of A.cues) if (kinds.has(c.kind) && t >= c.t - .1 && t <= c.t + c.dur + tail) best = c;
  return best;
};

// ---------------------------------------------------------------- art (art/chatgpt → tools/prepare_art.py → media/art)
const ART = new Set(D.art || []);
const FACES = D.artFaces || {};
const IMG = {};
for (const f of ART) { const im = new Image(); im.src = `media/art/${f}.webp`; IMG[`art.${f}`] = im; }
const ok = (key) => IMG[key] && IMG[key].complete && IMG[key].naturalWidth > 0;
const FACING_R = new Set(['A_pose_side', 'A_pose_run', 'A_pose_fan', 'A_pose_whisper', 'A_pose_peek', 'A_ear', 'A_ear_blow', 'A_ear_fan', 'A_ear_happy']);
const PROP_POSES = new Set(['fan', 'drink', 'dance', 'bow', 'bye', 'wave', 'peek']);   // always shown full-body (prop / gesture)
const xOf = (az) => W / 2 + Math.sin(rad(clamp(az, -118, 118))) * W * .43 + (Math.abs(az) > 90 ? Math.sign(az) * (Math.abs(az) - 90) * 9 : 0);
const PAL = { A: { glow: '255,150,210' } };

// ---------------------------------------------------------------- stage background
const STARS = Array.from({ length: 70 }, (_, i) => ({ x: hash(i), y: hash(i + 50) * .55, s: 2 + hash(i + 9) * 4, p: hash(i + 3) * 6.3 }));
function liveAmount(t) { return clamp((t - 105.2) / 1.6, 0, 1) * clamp((131.5 - t) / 1.6, 0, 1); }

function drawStage(ctx, t, shift) {
  const live = liveAmount(t);
  const base = IMG['art.stage_bg'], lit = IMG['art.stage_bg_live'];
  const BW = W + 80, k = BW / (base?.naturalWidth || 1536), BH = (base?.naturalHeight || 1024) * k;
  const ox = -40 + clamp(shift, -40, 40), oy = -(BH - H) * .5;
  if (ok('art.stage_bg')) ctx.drawImage(base, ox, oy, BW, BH);
  if (live > 0 && ok('art.stage_bg_live')) { ctx.globalAlpha = live; ctx.drawImage(lit, ox, oy, BW, BH); ctx.globalAlpha = 1; }
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const s of STARS) {   // twinkling backdrop stars
    const a = (.25 + .35 * live) * (.5 + .5 * Math.sin(t * 2.2 + s.p)) * fxFade;
    const x = ox + (.2 + s.x * .6) * BW, y = oy + (.12 + s.y * .5) * BH;
    ctx.fillStyle = `rgba(255,240,250,${a})`; ctx.beginPath();
    for (let j = 0; j < 4; j++) { const r = j % 2 ? s.s * .35 : s.s * 1.6, an = j * Math.PI / 2 + t * .5; ctx.lineTo(x + Math.cos(an) * r, y + Math.sin(an) * r); }
    ctx.fill();
  }
  if (live > 0) {   // sweeping spotlight beams during the mini live
    const cols = ['255,120,220', '120,170,255', '255,220,150', '200,140,255'];
    for (let i = 0; i < 4; i++) {
      const sx = ox + (.22 + i * .19) * BW, sy = oy + .06 * BH, ang = Math.sin(t * (.6 + i * .13) + i) * .45;
      const g = ctx.createLinearGradient(sx, sy, sx + Math.sin(ang) * 900, sy + 900);
      g.addColorStop(0, `rgba(${cols[i]},${.28 * live})`); g.addColorStop(1, `rgba(${cols[i]},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(sx - 12, sy); ctx.lineTo(sx + 12, sy);
      ctx.lineTo(sx + Math.sin(ang) * 900 + 170, sy + 900); ctx.lineTo(sx + Math.sin(ang) * 900 - 170, sy + 900); ctx.fill();
    }
  }
  ctx.restore();
  const g = ctx.createRadialGradient(W / 2, H / 2, H * .4, W / 2, H / 2, H * .95);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(10,0,20,${.35 + .2 * live})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

// ---------------------------------------------------------------- particles
let parts = [];
function spawn(o) { if (parts.length < 1100) parts.push(o); }
const LAST_OUT = A.present.A[1], CLEAN = LAST_OUT < A.duration ? LAST_OUT + .6 : Infinity;   // after she is gone: no subtitles, no effects, only the stage picture
let fxFade = 1;
function updateParts(dt) {
  for (const q of parts) {
    q.life += dt;
    if (q.seed !== undefined && (q.kind === 'frost' || q.kind === 'haze' || q.kind === 'wind')) {
      q.vx += Math.sin(q.life * 5 + q.seed) * 40 * dt; q.vy += Math.cos(q.life * 4 + q.seed) * 30 * dt + (q.kind === 'haze' ? -20 : q.kind === 'frost' ? 12 : 0) * dt;
    }
    q.x += q.vx * dt; q.y += q.vy * dt;
    const damp = q.kind === 'note' || q.kind === 'heart' || q.kind === 'bubble' ? .3 : 1.4;
    q.vx *= 1 - damp * dt; q.vy *= 1 - damp * dt;
    if (q.spin) q.rot += q.spin * dt; if (q.grow) q.size += q.grow * dt;
  }
  parts = parts.filter((q) => q.life < q.max);
}
function drawParts(ctx) {
  if (fxFade <= .001) return;
  ctx.save();
  for (const q of parts) {
    const k = q.life / q.max, a = Math.sin(Math.PI * Math.min(1, k * 1.2)) * q.a * fxFade;
    ctx.globalCompositeOperation = q.kind === 'note' || q.kind === 'heart' ? 'source-over' : 'lighter';
    if (q.kind === 'frost' || q.kind === 'haze') {
      const fa = q.a * Math.min(1, k * 2.6) * Math.pow(1 - k, 1.3) * fxFade;
      ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(Math.atan2(q.vy, q.vx)); ctx.scale(1.9, 1);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, q.size);
      if (q.kind === 'frost') { g.addColorStop(0, `rgba(228,242,255,${fa * .42})`); g.addColorStop(.6, `rgba(200,228,255,${fa * .16})`); g.addColorStop(1, 'rgba(190,225,255,0)'); }
      else { g.addColorStop(0, `rgba(255,222,200,${fa * .4})`); g.addColorStop(.6, `rgba(255,170,190,${fa * .16})`); g.addColorStop(1, 'rgba(255,170,190,0)'); }
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, q.size, 0, 7); ctx.fill(); ctx.restore();
    } else if (q.kind === 'wind') {   // fan breeze: soft curved streaks
      const fa = q.a * Math.min(1, k * 3) * (1 - k) * fxFade;
      ctx.strokeStyle = `rgba(215,238,255,${fa})`; ctx.lineWidth = q.size; ctx.lineCap = 'round';
      const ang = Math.atan2(q.vy, q.vx), L = 60 + 140 * (1 - k);
      ctx.beginPath(); ctx.moveTo(q.x, q.y);
      ctx.quadraticCurveTo(q.x - Math.cos(ang) * L * .5 + Math.sin(q.life * 6 + q.seed) * 14, q.y - Math.sin(ang) * L * .5 + 12, q.x - Math.cos(ang) * L, q.y - Math.sin(ang) * L);
      ctx.stroke();
    } else if (q.kind === 'glint' || q.kind === 'spark') {
      ctx.fillStyle = q.kind === 'spark' ? `rgba(200,235,255,${a})` : `rgba(240,250,255,${a})`;
      ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot);
      ctx.beginPath(); for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.lineTo(0, q.size); ctx.lineTo(q.size * .2, q.size * .2); } ctx.fill(); ctx.restore();
    } else if (q.kind === 'flake') {
      ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.strokeStyle = `rgba(215,238,255,${a})`; ctx.lineWidth = Math.max(1.5, q.size / 6);
      for (let i = 0; i < 6; i++) { ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, q.size); ctx.moveTo(0, q.size * .55); ctx.lineTo(q.size * .25, q.size * .8); ctx.moveTo(0, q.size * .55); ctx.lineTo(-q.size * .25, q.size * .8); ctx.stroke(); }
      ctx.restore();
    } else if (q.kind === 'bubble') {
      ctx.strokeStyle = `rgba(230,248,255,${a * .8})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(q.x, q.y, q.size, 0, 7); ctx.stroke();
    } else if (q.kind === 'note' || q.kind === 'heart') {
      ctx.save(); ctx.globalAlpha = a; ctx.translate(q.x, q.y); ctx.rotate(Math.sin(q.life * 3 + q.seed) * .25);
      ctx.font = `700 ${q.size}px "Zen Maru Gothic", sans-serif`; ctx.textAlign = 'center';
      ctx.fillStyle = q.kind === 'heart' ? '#ff6fae' : q.col; ctx.shadowColor = 'rgba(255,255,255,.8)'; ctx.shadowBlur = 8;
      ctx.fillText(q.kind === 'heart' ? '♥' : q.glyph, 0, 0); ctx.restore();
    }
  }
  ctx.restore();
}

// ---------------------------------------------------------------- figure (Live2D-style motion on the designer art)
function blinkAmt(t, seed) {
  const p = 3.4 + seed, k = Math.floor(t / p), off = hash(k * 7 + seed * 31) * (p - .5), dt = t - k * p - off;
  return dt >= 0 && dt < .16 ? Math.abs(Math.cos((dt / .16) * Math.PI)) : 1;
}

function bustReachesBottom(st) {
  const F = FACES.A_bust, im = IMG['art.A_bust_base'];
  if (!F || !im || !im.naturalHeight) return true;
  const k = (240 * st.s) / (F.rx * 1.25);
  return st.y + (im.naturalHeight - F.cy) * k > H + 40;
}

function bustFrame(st) {   // blink > singing / talking mouth > expression > base
  const has = (s) => ART.has(`A_bust_${s}`);
  const ex = { happy: 'happy', laugh: 'happy', shy: 'shy', surprise: 'surprise', playful: 'playful', smug: 'smug', curious: 'curious', whisper: 'whisper', sleepy: 'whisper', blow: 'blow' }[st.expr];
  if (st.blowing && has('blow')) return 'A_bust_blow';
  if (st.singing) return st.mouth > .5 ? 'A_bust_sing' : st.mouth > .15 ? 'A_bust_mouth_open' : (st.blink < .5 ? 'A_bust_blink' : 'A_bust_happy');
  if (st.blink < .5 && has('blink')) return 'A_bust_blink';
  if (st.mouth > .45 && has('mouth_open')) return 'A_bust_mouth_open';
  if (st.mouth > .15 && has('mouth_half')) return 'A_bust_mouth_half';
  return ex && has(ex) ? `A_bust_${ex}` : 'A_bust_base';
}

function chooseLook(st, t) {
  const c = st.cue, cool = st.coolCue;
  let name, kind = 'pose', want = null;
  const nearEar = st.d < .3 && Math.abs(st.az) > 55;
  if (st.running) name = 'A_pose_run';
  else if (nearEar && ART.has('A_ear')) {
    kind = 'ear';
    if (cool && cool.kind === 'fan' && Math.sign(cool.az) === Math.sign(st.az)) name = 'A_ear_fan';
    else if (st.blowing) name = 'A_ear_blow';
    else if (c && c.kind === 'say' && st.mouth > .25) name = 'A_ear_happy';
    else name = 'A_ear';
  } else if (c && c.pose && PROP_POSES.has(c.pose) && ART.has(`A_pose_${c.pose}`)) {
    name = `A_pose_${c.pose}`;
    if (c.pose === 'fan' && cool) want = cool.az < 0 ? 'L' : 'R';     // fan toward the ear she is cooling
  } else if (st.d < .55 && bustReachesBottom(st)) { name = bustFrame(st); kind = 'bust'; }
  else if (st.singing || (c && c.pose === 'sing')) name = 'A_pose_sing';
  else if (Math.abs(st.vel) > 18) name = 'A_pose_side';
  else name = st.d > 2.2 ? 'A_pose_wave' : 'A_pose_front';
  if (!ART.has(name)) name = 'A_pose_front';
  const dx = xOf(azAt('A', t + .1)) - xOf(azAt('A', t - .1));
  want = want || (Math.abs(dx) > 6 ? (dx > 0 ? 'R' : 'L') : (st.x > W / 2 ? 'L' : 'R'));
  return { img: `art.${name}`, kind, flip: FACING_R.has(name) && want === 'L' };
}

function drawWarped(img, cx, pivotX, pivotY, top, k, flip, alpha, rot, sway, breath) {
  const iw = img.naturalWidth, ih = img.naturalHeight, N = 26;
  ctx.save(); ctx.globalAlpha = alpha;
  ctx.translate(cx, pivotY); ctx.rotate(rot); ctx.scale((flip ? -1 : 1) * (1 - breath * .5), 1 + breath);
  const ox = -pivotX * k;
  for (let i = 0; i < N; i++) {
    const v0 = i / N, v1 = (i + 1) / N, off = sway * Math.pow((v0 + v1) / 2, 2.2) * (flip ? -1 : 1);
    ctx.drawImage(img, 0, ih * v0, iw, ih * (v1 - v0) + 1, ox + off, top + ih * k * v0, iw * k, ih * k * (v1 - v0) + 1);
  }
  ctx.restore();
}

const figState = { cur: null, prev: null, since: -9, lastT: -9 };

function layout(look, st) {
  const img = IMG[look.img], iw = img.naturalWidth, ih = img.naturalHeight;
  if (look.kind === 'bust') {
    const F = FACES.A_bust || { cx: iw * .5, cy: ih * .38, rx: iw * .27, ry: ih * .11 };
    const k = (240 * st.s) / (F.rx * 1.25);
    return { k, pivotX: F.cx, top: -F.cy * k, mouth: [F.cx, F.cy + F.ry * .45] };
  }
  if (look.kind === 'ear') {
    const F = FACES.A_ear || { cx: iw * .6, cy: ih * .44 };
    const fx = iw * .5, fy = ih * .42, k = (240 * st.s) / (iw * .42);
    return { k, pivotX: fx, top: -fy * k, mouth: [F.cx, F.cy + 40] };
  }
  const h = 780 * st.s, k = h / ih;
  return { k, pivotX: iw / 2, top: -.26 * h, mouth: [iw * .55, ih * .3] };
}

function drawFigure(st, t) {
  const fs = figState, look = chooseLook(st, t);
  if (!ok(look.img)) return;
  const key = look.img + (look.flip ? ':f' : '');
  const jumped = Math.abs(t - fs.lastT) > .5;
  const sameGroup = fs.cur && fs.cur.look.kind === look.kind && look.kind !== 'pose' && fs.cur.look.flip === look.flip;
  if (!fs.cur || jumped) { fs.cur = { look, key }; fs.prev = null; fs.since = -9; }
  else if (key !== fs.cur.key) { if (sameGroup) fs.cur = { look, key }; else { fs.prev = fs.cur; fs.cur = { look, key }; fs.since = t; } }
  fs.lastT = t;
  const fade = clamp((t - fs.since) / .22, 0, 1);

  const g = ctx.createRadialGradient(st.x, st.y + 60 * st.s, 30 * st.s, st.x, st.y + 60 * st.s, 380 * st.s);
  g.addColorStop(0, `rgba(${PAL.A.glow},${.18 * st.alpha})`); g.addColorStop(1, `rgba(${PAL.A.glow},0)`);
  ctx.fillStyle = g; ctx.fillRect(st.x - 400 * st.s, st.y - 340 * st.s, 800 * st.s, 800 * st.s);
  if (fs.cur.look.kind === 'pose') {   // contact shadow on the stage floor
    const L0 = layout(fs.cur.look, st), img0 = IMG[fs.cur.look.img];
    const feetY = st.y + L0.top + img0.naturalHeight * L0.k * .975, hw = 130 * st.s * (st.running ? .8 : 1);
    ctx.save(); ctx.globalAlpha = st.alpha * .45; ctx.translate(st.x, feetY); ctx.scale(1, .22);
    const sg = ctx.createRadialGradient(0, 0, 0, 0, 0, hw); sg.addColorStop(0, 'rgba(40,10,40,.6)'); sg.addColorStop(1, 'rgba(40,10,40,0)');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(0, 0, hw, 0, 7); ctx.fill(); ctx.restore();
  }
  const beat = st.singing ? Math.max(0, Math.sin(((t - 110) / .6) * Math.PI)) : 0;     // bob on the beat while singing (100 BPM)
  const breath = .012 * Math.sin((t / 3.4) * Math.PI * 2) + beat * .01;
  const talk = st.mouth * 6 * st.s + beat * 10 * st.s;
  const sway = (Math.sin(t * 1.7) * 10 - clamp(st.vel * .35, -40, 40)) * st.s + (st.singing ? Math.sin(((t - 110) / 1.2) * Math.PI) * 18 * st.s : 0);
  for (const [layer, a] of [[fs.prev, 1 - fade], [fs.cur, fade < 1 && fs.prev ? fade : 1]]) {
    if (!layer || a <= .01 || !ok(layer.look.img)) continue;
    const lk = layer.look, img = IMG[lk.img], L = layout(lk, st), pivotY = st.y - talk;
    drawWarped(img, st.x, L.pivotX, pivotY, L.top, L.k, lk.flip, st.alpha * a, st.rot * .6, sway * (lk.kind === 'pose' ? 1 : .5), breath + st.mouth * .006);
    if (layer === fs.cur) { st.mx = st.x + (L.mouth[0] - L.pivotX) * L.k * (lk.flip ? -1 : 1); st.my = pivotY + L.top + L.mouth[1] * L.k; }
  }
}

// ---------------------------------------------------------------- state per frame
function charState(t) {
  const [t0, t1] = A.present.A;
  if (t < t0) return null;
  const az = azAt('A', t), d = dAt('A', t);
  const v = azAt('A', t + .1) - azAt('A', t - .1);
  const vel = clamp(((v + 540) % 360 - 180) / .2, -150, 150);
  const absAz = Math.abs(az);
  const alpha = clamp((t - t0) / .6, 0, 1) * clamp((t1 + .3 - t) / .6, 0, 1) * clamp((6 - d) / 1.5, 0, 1) * clamp((118 - absAz) / 14, 0, 1);
  const s = clamp(.62 * Math.pow(1 / d, .55), .26, 1.75), near = clamp((1.3 - d) / 1.1, 0, 1);
  const cue = lastCue(t, HEAT_KINDS), coolCue = lastCue(t, COOL_KINDS, .2);
  const running = Math.abs(vel) > 45 && d < 1.4;
  const singing = !!cue && cue.kind === 'sing' && t < cue.t + cue.dur + .2;
  const blowing = (!!cue && cue.kind === 'warm' && t < cue.t + cue.dur) || (!!coolCue && coolCue.kind === 'coolbreath' && t < coolCue.t + coolCue.dur);
  const expr = blowing ? 'blow' : cue ? cue.expr : 'smile';
  const bob = running ? Math.abs(Math.sin(t * 13)) * -22 * s : Math.sin(t * 1.6) * 6 * s;
  const side = Math.sin(rad(az));
  return {
    who: 'A', az, d, vel, alpha, s, near, cue, coolCue, expr, blowing, running, singing, t, bob,
    x: xOf(az), y: lerp(HORIZON, 560, near) + bob,
    rot: -side * .2 * near * (absAz > 50 ? 1 : .3) + clamp(vel / 900, -.12, .12),
    blink: blinkAmt(t, .4), mouth: mouthAt('A', t),
  };
}

function emit(st, t, dt) {
  const mx = st.mx ?? st.x, my = st.my ?? st.y + 76 * st.s;
  if (LAST_OUT < A.duration && t > LAST_OUT - .35 && t < LAST_OUT + .3) {   // the goodbye: she dissolves into starlight and little hearts
    const n = Math.ceil(dt * 150), R = 230 * st.s;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 7, r = R * Math.sqrt(Math.random()), x = st.x + Math.cos(a) * r, y = st.y + Math.sin(a) * r * 1.3;
      if (Math.random() < .12) spawn({ kind: 'heart', x, y, vx: Math.cos(a) * 40, vy: -70 - Math.random() * 60, size: 18 + Math.random() * 14, seed: Math.random() * 6, life: 0, max: 1.2, a: .9 });
      else spawn({ kind: Math.random() < .6 ? 'spark' : 'glint', x, y, vx: Math.cos(a) * 80, vy: -50 - Math.random() * 100, size: 5 + Math.random() * 10, rot: a, spin: 3, life: 0, max: 1 + Math.random() * .5, a: 1 });
    }
  }
  if (st.blowing) {   // warm "haa" or cool "fuu" from her lips toward the ear on that side
    const warm = st.cue && st.cue.kind === 'warm' && t < st.cue.t + st.cue.dur;
    const env = warm ? sample(A.chars.A.breath, A.fps, t) : coolAt(t).env;
    const side = Math.sin(rad(st.az)), n = env > .04 ? Math.ceil(dt * 150 * env) : 0;
    for (let i = 0; i < n; i++) {
      const sp = (160 + 260 * env) * Math.max(.5, st.s) * (.7 + Math.random() * .6);
      const vx = (side * .9 + (Math.random() - .5) * .55) * sp, vy = ((warm ? -.18 : .12) + (Math.random() - .5) * .35) * sp;
      const off = 22 * st.s / Math.max(1, Math.hypot(vx, vy));
      spawn({ kind: warm ? 'haze' : 'frost', x: mx + vx * off, y: my + vy * off, vx, vy, size: 7 * st.s, grow: 115 * st.s, life: 0, max: .9 + Math.random() * .7, a: .25 + .5 * env, seed: Math.random() * 6.3 });
      if (!warm && Math.random() < .08 * env) spawn({ kind: 'glint', x: mx, y: my, vx: vx * 1.1, vy, size: 3 + Math.random() * 4, rot: Math.random() * 3, spin: 2, life: 0, max: .9, a: .9 });
    }
  }
  if (st.singing && Math.random() < dt * 3.2) {   // music notes while singing
    const glyphs = ['♪', '♫', '♬'], cols = ['#ff6fae', '#7aa8ff', '#ffb54d', '#b88cff'];
    spawn({ kind: 'note', x: st.x + (Math.random() - .5) * 260 * st.s, y: st.y - 120 * st.s, vx: (Math.random() - .5) * 60, vy: -120 - Math.random() * 80,
            size: 34 + Math.random() * 30, glyph: glyphs[Math.floor(Math.random() * 3)], col: cols[Math.floor(Math.random() * 4)], seed: Math.random() * 6, life: 0, max: 2.4, a: 1 });
  }
  if (st.cue && (st.expr === 'happy' || st.expr === 'playful') && st.mouth > .3 && Math.random() < dt * 1.5)
    spawn({ kind: 'heart', x: st.x + (Math.random() - .5) * 300 * st.s, y: st.y - 60 * st.s, vx: (Math.random() - .5) * 40, vy: -90, size: 30 + Math.random() * 20, seed: Math.random() * 6, life: 0, max: 1.8, a: .9 });
}

// cooling source visuals: breeze, flying fan, iced drink, cool magic — drawn at the cooling source's own position
function drawCool(ctx, t, dt, st) {
  const c = lastCue(t, COOL_KINDS, 0), cs = coolAt(t);
  if (!c || t > c.t + c.dur || cs.env < .02 || fxFade <= .001) return;
  const ex = xOf(cs.az), side = Math.sign(cs.az) || 0, env = cs.env * fxFade;
  if (c.kind === 'fan' || c.kind === 'swish') {
    // breeze streaks flowing toward the ear the cooling comes from (off-screen on that side)
    const n = Math.ceil(dt * 90 * env);
    for (let i = 0; i < n; i++) {
      const y = 260 + Math.random() * 520, x0 = side ? W / 2 + side * (120 + Math.random() * 360) : W / 2 + (Math.random() - .5) * 700;
      spawn({ kind: 'wind', x: x0, y, vx: side ? side * (700 + Math.random() * 500) : (Math.random() - .5) * 600, vy: (Math.random() - .5) * 80, size: 2 + Math.random() * 3, seed: Math.random() * 6, life: 0, max: .7 + Math.random() * .4, a: .55 * env });
    }
    // a magic fan sweeping by the ear when Ayane is on the other side (or far): the "secret magic" breeze
    const herSide = Math.sign(st?.az || 0);
    if (c.kind === 'swish' || !st || herSide !== side || st.d > .6) {
      const fan = IMG['art.A_prop_fan'];
      if (ok('art.A_prop_fan')) {
        const p = clamp((t - c.t) / c.dur, 0, 1), flap = c.kind === 'fan' ? Math.sin((t - c.t) * 2 * Math.PI * 3.3) * .35 : (p - .5) * 1.6;
        const fx = side ? (side < 0 ? 170 : W - 170) : lerp(W * .3, W * .7, p), fy = 470 + Math.sin(p * Math.PI) * -60, sz = 380;
        ctx.save(); ctx.globalAlpha = clamp(env * 1.4, 0, .95) * Math.sin(Math.PI * clamp(p * 1.1, 0, 1)); ctx.translate(fx, fy); ctx.rotate(flap - side * .3);
        ctx.shadowColor = 'rgba(160,220,255,.9)'; ctx.shadowBlur = 30; ctx.drawImage(fan, -sz / 2, -sz / 2, sz, sz); ctx.restore();
        if (Math.random() < dt * 25) spawn({ kind: 'spark', x: fx + (Math.random() - .5) * 200, y: fy + (Math.random() - .5) * 200, vx: side * 200, vy: 40, size: 6 + Math.random() * 8, rot: 0, spin: 3, life: 0, max: .9, a: 1 });
      }
    }
  } else if (c.kind === 'ice') {
    // the iced drink right in front of you, clinking and fizzing
    const p = clamp((t - c.t) / c.dur, 0, 1), cup = IMG['art.A_prop_drink'];
    const vis = clamp(p * 6, 0, 1) * clamp((1 - p) * 4 + .4, 0, 1);
    const cx = W / 2 + 330 + Math.sin(t * 18) * 4 * env, cy = H - 190 + (1 - vis) * 200, sz = 430;   // in your hand, lower right, so Ayane stays visible
    if (ok('art.A_prop_drink')) {
      ctx.save(); ctx.globalAlpha = vis; ctx.translate(cx, cy); ctx.rotate(Math.sin(t * 9) * .03 * env);
      ctx.shadowColor = 'rgba(150,215,255,.9)'; ctx.shadowBlur = 40; ctx.drawImage(cup, -sz / 2, -sz / 2, sz, sz); ctx.restore();
    }
    if (Math.random() < dt * 30 * env) spawn({ kind: 'glint', x: cx + (Math.random() - .5) * 220, y: cy - 60 + (Math.random() - .5) * 160, vx: 0, vy: 0, size: 6 + Math.random() * 10, rot: Math.random(), spin: 4, life: 0, max: .5, a: 1 });
    if (Math.random() < dt * 40) spawn({ kind: 'bubble', x: cx + (Math.random() - .5) * 160, y: cy + 60, vx: (Math.random() - .5) * 20, vy: -140 - Math.random() * 80, size: 3 + Math.random() * 6, life: 0, max: 1.2, a: .9 });
    if (Math.random() < dt * 20) spawn({ kind: 'frost', x: cx + (Math.random() - .5) * 240, y: cy - 200, vx: (Math.random() - .5) * 120, vy: -40, size: 20, grow: 90, life: 0, max: 1.4, a: .5, seed: Math.random() * 6 });
  } else if (c.kind === 'magic') {
    const n = Math.ceil(dt * 70 * env);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 7, r = 80 + Math.random() * 280;
      spawn({ kind: Math.random() < .55 ? 'flake' : 'spark', x: ex + Math.cos(a) * r, y: 470 + Math.sin(a) * r * .7, vx: -Math.sin(a) * 150 + side * 120, vy: Math.cos(a) * 100 + 30,
              size: 8 + Math.random() * 18, rot: a, spin: 1.5, life: 0, max: 2, a: 1 });
    }
    const g = ctx.createRadialGradient(ex, 470, 10, ex, 470, 420);
    g.addColorStop(0, `rgba(140,200,255,${.25 * env})`); g.addColorStop(1, 'rgba(140,200,255,0)');
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
  }
}

function thermalEdges(ctx, th) {
  for (const [side, c, h] of [[-1, th.Lc, th.Lh], [1, th.Rc, th.Rh]]) {
    const v = Math.max(c, h) * fxFade; if (v < .02) continue;
    const col = c >= h ? '70,170,255' : '255,110,50';
    const x0 = side < 0 ? 0 : W, x1 = side < 0 ? 520 : W - 520;
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, `rgba(${col},${.36 * v})`); g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g; ctx.fillRect(Math.min(x0, x1), 0, 520, H);
  }
}

function offscreenHint(ctx, st) {
  const absAz = Math.abs(st.az); if (absAz < 105) return;
  const a = clamp((absAz - 105) / 15, 0, 1) * clamp((5 - st.d) / 1.5, 0, 1);
  const sd = Math.sign(st.az) || 1, x = sd < 0 ? 60 : W - 60;
  ctx.save(); ctx.globalAlpha = a;
  const g = ctx.createRadialGradient(x, H * .55, 0, x, H * .55, 260); g.addColorStop(0, `rgba(${PAL.A.glow},.45)`); g.addColorStop(1, `rgba(${PAL.A.glow},0)`);
  ctx.fillStyle = g; ctx.fillRect(x - 260, H * .55 - 260, 520, 520);
  ctx.fillStyle = '#fff'; ctx.font = '600 34px "Zen Maru Gothic", sans-serif'; ctx.textAlign = sd < 0 ? 'left' : 'right';
  ctx.fillText(`綾音 ${absAz > 150 ? '↻ うしろ' : sd < 0 ? '← ひだり' : 'みぎ →'}`, sd < 0 ? 30 : W - 30, H * .55);
  ctx.restore();
}

// ---------------------------------------------------------------- render loop
const cv = $('scene'), ctx = cv.getContext('2d');
let camYaw = 0, lastT = 0, lastFrame = performance.now();

function frame(t, dt) {
  { const k = clamp((t - CLEAN) / .45, 0, 1); fxFade = 1 - k * k * (3 - 2 * k); }   // clean stage on the last frames
  const st = charState(t);
  const target = st && st.mouth > .05 ? clamp(st.az, -60, 60) * .16 : 0;
  camYaw += (target - camYaw) * clamp(dt * 1.5, 0, 1);
  drawStage(ctx, t, -camYaw * 6);
  ctx.save(); ctx.translate(-camYaw * 10, 0);
  if (st && st.alpha > .01) drawFigure(st, t);
  if (st) emit(st, t, dt);
  ctx.restore();
  drawCool(ctx, t, dt, st);
  updateParts(dt); drawParts(ctx);
  const th = thermalAt(t + offsetMs / 1000);
  thermalEdges(ctx, th);
  if (st && t < LAST_OUT + .3) offscreenHint(ctx, st);
  return { states: st ? [st] : [], th };
}

// ---------------------------------------------------------------- radar + meters + timeline
const radar = $('radar'), rctx = radar.getContext('2d');
function drawRadar(states, th, t) {
  const c = rctx, w = radar.width, h = radar.height, cx = w / 2, cy = h / 2 + 6, R = 170;
  c.clearRect(0, 0, w, h);
  c.strokeStyle = '#26324f'; c.lineWidth = 2;
  for (const r of [.33, .66, 1]) { c.beginPath(); c.arc(cx, cy, R * r, 0, 7); c.stroke(); }
  c.fillStyle = '#6f7b96'; c.font = '20px Inter'; c.textAlign = 'center'; c.fillText('stage', cx, cy - R - 10);
  for (const [sd, cl, hh] of [[-1, th.Lc, th.Lh], [1, th.Rc, th.Rh]]) {
    const v = Math.max(cl, hh), col = cl >= hh ? '79,179,255' : '255,122,69';
    const g = c.createRadialGradient(cx + sd * 44, cy, 0, cx + sd * 44, cy, 90); g.addColorStop(0, `rgba(${col},${.8 * v})`); g.addColorStop(1, `rgba(${col},0)`);
    c.fillStyle = g; c.beginPath(); c.arc(cx + sd * 44, cy, 90, 0, 7); c.fill();
    c.fillStyle = v > .02 ? `rgb(${col})` : '#3a4766'; c.beginPath(); c.roundRect(cx + sd * 44 - 9, cy - 22, 18, 44, 8); c.fill();
  }
  c.fillStyle = '#1b2542'; c.strokeStyle = '#6f7b96'; c.beginPath(); c.arc(cx, cy, 36, 0, 7); c.fill(); c.stroke();
  c.fillStyle = '#6f7b96'; c.beginPath(); c.moveTo(cx - 7, cy - 34); c.lineTo(cx, cy - 46); c.lineTo(cx + 7, cy - 34); c.fill();
  const dot = (az, d, col, label, r0) => {
    const r = 44 + (R - 44) * clamp(Math.log(d / .15) / Math.log(5 / .15), 0, 1);
    const x = cx + Math.sin(rad(az)) * r, y = cy - Math.cos(rad(az)) * r;
    c.fillStyle = col; c.beginPath(); c.arc(x, y, r0, 0, 7); c.fill();
    c.fillStyle = '#fff'; c.font = '600 20px "Noto Sans JP"'; c.fillText(label, x, y - r0 - 6);
  };
  for (const st of states) { c.globalAlpha = clamp(st.alpha + .35, 0, 1); dot(st.az, st.d, '#ff8cc6', '綾音 🔥', 13 + st.mouth * 6); c.globalAlpha = 1; }
  const cs = coolAt(t);
  if (cs.env > .05) { c.globalAlpha = clamp(cs.env * 1.5, 0, 1); dot(cs.az, cs.d, '#7cc4ff', '❄', 10 + cs.env * 8); c.globalAlpha = 1; }
}

const tl = $('timeline'), tlctx = tl.getContext('2d');
(function drawTimeline() {
  const c = tlctx, w = tl.width, h = tl.height, n = TH.Lc.length;
  c.fillStyle = '#0e1529'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * w, bw = w / n + 1;
    for (const [row, cl, hh] of [[0, TH.Lc[i], TH.Lh[i]], [1, TH.Rc[i], TH.Rh[i]]]) {
      const v = Math.max(cl, hh); if (v < .02) continue;
      c.fillStyle = cl >= hh ? `rgba(79,179,255,${.15 + .85 * v})` : `rgba(255,122,69,${.15 + .85 * v})`;
      c.fillRect(x, row ? h / 2 + 1 : 2, bw, h / 2 - 3);
    }
  }
  c.fillStyle = 'rgba(255,255,255,.35)'; c.font = '600 15px Inter';
  for (const s of A.scenes) { const x = (s.t / A.duration) * w; c.fillRect(x, 0, 1.5, h); c.fillText(s.n, x + 5, 16); }
})();

// ---------------------------------------------------------------- media / clock
const mix = $('mix'), film = $('film');
let media = mix;
const playBtn = $('playBtn');
if (new URLSearchParams(location.search).has('cover')) document.body.classList.add('cover-only');
const preview = new URLSearchParams(location.search).get('t');   // ?t=95 → still frame at 1:35 (for checks)
let previewT = preview != null ? +preview : null;
if (previewT != null) { document.getElementById('intro').classList.add('hidden'); mix.addEventListener('play', () => { previewT = null; }, { once: true }); }
const now = () => (previewT != null ? previewT : media.currentTime || 0);
const play = () => { $('intro').classList.add('hidden'); if (previewT != null) { media.currentTime = previewT; previewT = null; } media.play().catch(() => {}); };
const pause = () => media.pause();
const toggle = () => (media.paused ? play() : pause());
playBtn.addEventListener('click', toggle);
$('startBtn').addEventListener('click', () => { media.currentTime = 0; parts = []; play(); });
for (const m of [mix, film]) {
  m.addEventListener('play', () => { if (m === media) playBtn.textContent = '❚❚'; });
  m.addEventListener('pause', () => { if (m === media) { playBtn.textContent = '▶'; stopOutput(); } });
  m.addEventListener('ended', () => { if (m === media) { playBtn.textContent = '▶'; stopOutput(); } });
}
$('timelineWrap').addEventListener('click', (e) => {
  const r = e.currentTarget.getBoundingClientRect();
  media.currentTime = clamp((e.clientX - r.left) / r.width, 0, 1) * A.duration; parts = [];
  $('intro').classList.add('hidden');
});
document.addEventListener('keydown', (e) => {
  if (e.target.matches('input, select')) return;
  if (e.code === 'Space') { e.preventDefault(); toggle(); }
  else if (e.code === 'Escape') emergencyStop();
  else if (e.code === 'ArrowRight') { media.currentTime = Math.min(A.duration, now() + 5); parts = []; }
  else if (e.code === 'ArrowLeft') { media.currentTime = Math.max(0, now() - 5); parts = []; }
});
document.addEventListener('visibilitychange', () => { if (document.hidden) { pause(); stopOutput(); } });


$('lrBtn').addEventListener('click', () => {
  const ac = new AudioContext();
  [[-1, 0], [1, .9]].forEach(([pan, at]) => {
    for (const [f, d] of [[1318.5, 0], [1760, .14]]) {
      const o = ac.createOscillator(), g = ac.createGain(), p = new StereoPannerNode(ac, { pan });
      o.frequency.value = pan < 0 ? f : f * 1.25; o.connect(g).connect(p).connect(ac.destination);
      const t0 = ac.currentTime + at + d; g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(.25, t0 + .01); g.gain.exponentialRampToValueAtTime(.001, t0 + .5);
      o.start(t0); o.stop(t0 + .55);
    }
  });
  const b = $('lrBtn'); b.textContent = '🎧 Left…'; setTimeout(() => { b.textContent = '🎧 …Right'; }, 900); setTimeout(() => { b.textContent = '🎧 Left / Right check'; ac.close(); }, 1900);
});

// ---------------------------------------------------------------- subtitles & scene titles (ja / zh / en)
const subsEl = $('subs'), sceneEl = $('sceneTitle');
let subKey = '', sceneIdx = -1, sceneTimer = 0;
const NAME = { ja: '綾音', zh: '绫音', en: 'Ayane' };
const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
const SUB_LANGS = { jaen: ['ja', 'en'], ja: ['ja'], en: ['en'], off: [] };   // Japanese + English only
function updateSubs(t) {
  const mode = $('subMode').value, langs = SUB_LANGS[mode] || ['ja', 'en'];
  const act = langs.length && t < CLEAN ? A.subs.filter((s) => t >= s.t0 && t < s.t1).slice(-2) : [];
  const key = mode + act.map((s) => s.t0).join('|');
  if (key === subKey) return; subKey = key;
  subsEl.innerHTML = act.map((s) => {
    const br = s.kind === 'warm' || s.kind === 'coolbreath' ? ' breath' : '', sing = s.kind === 'sing' ? '♪ ' : '';
    return `<div class="line">${langs.map((l, i) => `<div class="${i === 0 ? 'ja' : 'en'}${br}">${i === 0 ? `<span class="who A">${NAME[l]}</span>` : ''}${sing}${esc(s[l])}</div>`).join('')}</div>`;
  }).join('');
}
function updateScene(t) {
  let i = -1; A.scenes.forEach((s, k) => { if (t >= s.t) i = k; });
  if (i !== sceneIdx) {
    sceneIdx = i; const s = A.scenes[i];
    sceneEl.innerHTML = `${s.n}　${s.ja}<small>${s.en}</small>`;
    sceneEl.classList.add('show'); clearTimeout(sceneTimer);
    sceneTimer = setTimeout(() => sceneEl.classList.remove('show'), 3200);
  }
}
$('credits').textContent = A.voice && A.voice.backend === 'voicevox' ? `Voice: ${A.voice.credits.join(' / ')} · original song & SFX` : 'Draft build: synthesized voice (macOS Kyoko).';

// ---------------------------------------------------------------- device output (same protocol as Demo 1)
const DEFAULT_RANGE = { heatMin: 0, heatMax: 200, coolMin: 35, coolMax: 80 };
const SEND_INTERVAL = 100, OFF = .03;
const store = {
  get: (k, d) => { try { return JSON.parse(localStorage.getItem(`moheat.${k}`)) ?? d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(`moheat.${k}`, JSON.stringify(v)); } catch {} },
};
const range = { ...DEFAULT_RANGE, ...store.get('range', {}) };
let lastSent = '', lastSendAt = 0, tripped = false, offsetMs = +store.get('asmr.offset', 0), intensity = +store.get('asmr.intensity', 100) / 100;
const device = MoHeatDevice.create(
  { select: $('portSelect'), addBtn: $('addPort'), connectBtn: $('connectBtn'), status: $('deviceStatus') },
  { log: (l) => console.log('[MoHeat]', l), onConnect: () => { lastSent = ''; } },
);
if (!MoHeatDevice.supported) $('deviceStatus').querySelector('span').textContent = 'Web Serial needs desktop Chrome / Edge';
function command(th) {
  const part = (sd, c, h) => (c > OFF ? `${sd}C${Math.round(range.coolMin + c * (range.coolMax - range.coolMin))}`
    : h > OFF ? `${sd}H${Math.round(range.heatMin + h * (range.heatMax - range.heatMin))}` : `${sd}H0`);
  if (Math.max(th.Lc, th.Lh, th.Rc, th.Rh) <= OFF) return 'stop';
  return `${part('L', th.Lc, th.Lh)} ${part('R', th.Rc, th.Rh)}`;
}
function stopOutput() { if (device.isConnected()) device.send('stop'); lastSent = 'stop'; }
function emergencyStop() {
  tripped = !tripped;
  const b = $('estop');
  if (tripped) { pause(); stopOutput(); b.textContent = '↺ Re-arm output'; b.classList.add('tripped'); }
  else { b.textContent = '■ STOP'; b.classList.remove('tripped'); lastSent = ''; }
}
$('estop').addEventListener('click', emergencyStop);
addEventListener('pagehide', stopOutput);
const bindRange = (id, valId, fmtV, set) => { const el = $(id); el.addEventListener('input', () => { set(+el.value); $(valId).textContent = fmtV(+el.value); }); };
$('intensity').value = Math.round(intensity * 100); $('intensityVal').textContent = `${Math.round(intensity * 100)}%`;
$('offset').value = offsetMs; $('offsetVal').textContent = `${offsetMs >= 0 ? '+' : ''}${offsetMs} ms`;
bindRange('intensity', 'intensityVal', (v) => `${v}%`, (v) => { intensity = v / 100; store.set('asmr.intensity', v); });
bindRange('offset', 'offsetVal', (v) => `${v >= 0 ? '+' : ''}${v} ms`, (v) => { offsetMs = v; store.set('asmr.offset', v); });
$('subMode').value = SUB_LANGS[store.get('asmr2.subs', 'jaen')] ? store.get('asmr2.subs', 'jaen') : 'jaen';
$('subMode').addEventListener('change', () => { store.set('asmr2.subs', $('subMode').value); subKey = ''; });
const meterEls = Object.fromEntries(['Lc', 'Lh', 'Rc', 'Rh'].map((k) => [k, [$(`m${k}`), $(`v${k}`)]]));
function updateOutput(th, playing) {
  const scaled = Object.fromEntries(Object.entries(th).map(([k, v]) => [k, playing && !tripped ? v * intensity : 0]));
  for (const [k, [bar, val]] of Object.entries(meterEls)) { bar.style.width = `${scaled[k] * 100}%`; val.textContent = Math.round(scaled[k] * 100); }
  const cmd = command(scaled);
  $('cmd').textContent = cmd;
  if (!device.isConnected() || !$('sendOn').checked) return;
  const n = performance.now();
  if (cmd !== lastSent && n - lastSendAt >= SEND_INTERVAL) { device.send(cmd); lastSent = cmd; lastSendAt = n; }
}

// ---------------------------------------------------------------- main loop
function loop() {
  const n = performance.now(), dt = clamp((n - lastFrame) / 1000, 0, .05); lastFrame = n;
  const t = now();
  if (Math.abs(t - lastT) > .5) parts = [];
  lastT = t;
  const ix = window.MoHeatInteract && previewT == null ? window.MoHeatInteract.tick(t, media) : null;   // ../shared/interact.js: waits for you / cheer mode
  const playing = (!media.paused && !media.ended) || previewT != null;
  const { states, th: th0 } = frame(t, playing || ix ? dt : 0);
  const io = window.MoHeatInteract ? window.MoHeatInteract.out(th0, ix) : { th: th0, live: null }, th = io.th, live = io.live ?? playing;
  drawRadar(states, live ? th : { Lc: 0, Lh: 0, Rc: 0, Rh: 0 }, t);
  updateOutput(th, live);
  updateSubs(t); updateScene(t);
  $('time').textContent = `${fmt(t)} / ${fmt(A.duration)}`;
  $('playhead').style.left = `${(t / A.duration) * 100}%`;
  const cs = coolAt(t);
  $('posInfo').textContent = [...states.map((s) => `綾音 ${Math.round(s.az)}° ${s.d.toFixed(2)} m`), ...(cs.env > .05 ? [`❄ ${Math.round(cs.az)}°`] : [])].join(' · ');
  requestAnimationFrame(loop);
}

// ---------------------------------------------------------------- offline render (tools/render_mp4.py): ja + en subtitles burned in
const RENDER = new URLSearchParams(location.search).has('render');
function drawSubsCanvas(t) {
  const act = t >= CLEAN ? [] : A.subs.filter((s) => t >= s.t0 && t < s.t1).slice(-2);
  let y = H - 60 - (act.length - 1) * 118;
  for (const s of act) {
    const sing = s.kind === 'sing' ? '♪ ' : '';
    ctx.font = '700 46px "Zen Maru Gothic", "Noto Sans JP", sans-serif';
    const nm = NAME.ja + '　', ja = nm + sing + s.ja, wj = ctx.measureText(ja).width, wn = ctx.measureText(nm).width;
    ctx.font = '500 30px Inter, sans-serif';
    const en = sing + s.en, wz = ctx.measureText(en).width, bw = Math.max(wj, wz) + 60;
    ctx.fillStyle = 'rgba(20,6,30,.6)'; ctx.beginPath(); ctx.roundRect(W / 2 - bw / 2, y - 64, bw, 110, 16); ctx.fill();
    ctx.textAlign = 'left'; const x0 = W / 2 - wj / 2;
    ctx.font = '700 46px "Zen Maru Gothic", "Noto Sans JP", sans-serif';
    ctx.fillStyle = '#ff9fd0'; ctx.fillText(nm, x0, y - 12); ctx.fillStyle = '#fff'; ctx.fillText(sing + s.ja, x0 + wn, y - 12);
    ctx.textAlign = 'center'; ctx.font = '500 30px Inter, sans-serif'; ctx.fillStyle = '#f2e6f7'; ctx.fillText(en, W / 2, y + 32);
    y += 118;
  }
}
async function renderAll() {
  await document.fonts.ready;
  const cover = new Image(); cover.src = 'media/cover.jpg'; await cover.decode().catch(() => {});
  await Promise.all(Object.values(IMG).map((im) => im.decode().catch(() => {})));
  const fps = 30, n = Math.round(A.duration * fps);
  parts = [];
  for (let i = 0; i < n; i++) {
    const t = i / fps;
    frame(t, 1 / fps);
    if (t < 3.0 && cover.naturalWidth) { ctx.globalAlpha = t < 2.2 ? 1 : (3.0 - t) / .8; ctx.drawImage(cover, 0, 0, W, H); ctx.globalAlpha = 1; }
    let si = -1; A.scenes.forEach((s, k) => { if (t >= s.t) si = k; });
    const st = A.scenes[si], sAge = si === 0 ? t - 3.0 : t - st.t;
    if (sAge >= 0 && sAge < 3.4) {
      ctx.globalAlpha = clamp(Math.min(sAge / .5, (3.4 - sAge) / .6), 0, 1);
      ctx.fillStyle = 'rgba(20,6,30,.5)'; ctx.fillRect(70, 60, 620, 96); ctx.fillStyle = '#ff8cc6'; ctx.fillRect(70, 60, 5, 96);
      ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = '700 38px "Zen Maru Gothic", sans-serif'; ctx.fillText(`${st.n}　${st.ja}`, 96, 106);
      ctx.fillStyle = '#e6d6ef'; ctx.font = '500 24px Inter, sans-serif'; ctx.fillText(st.en, 96, 140); ctx.globalAlpha = 1;
    }
    drawSubsCanvas(t);
    const blob = await new Promise((r) => cv.toBlob(r, 'image/jpeg', .92));
    await fetch(`/frame/${String(i).padStart(5, '0')}.jpg`, { method: 'PUT', body: blob });
  }
  await fetch('/done', { method: 'PUT' });
}
if (RENDER) { document.body.classList.add('rendering'); renderAll(); } else requestAnimationFrame(loop);
