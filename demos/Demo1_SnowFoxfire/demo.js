// 雪と狐火のひそひそ話 — MoHeat Evo ASMR demo.
// Clock = the binaural mix . Everything else is a function of that time:
//   characters (positions + lip sync from media/data.js), subtitles, and the 4-channel thermal track
//   (media/thermal.csv, already latency-compensated and conflict-resolved by tools/thermal.py).
'use strict';

const W = 1920, H = 1080, HORIZON = 470;
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
const azAt = (who, t) => {
  const a = A.chars[who].az, x = clamp(t * A.fps, 0, a.length - 1), i = Math.floor(x), f = x - i;
  if (i + 1 >= a.length) return a[i];
  let d = a[i + 1] - a[i]; if (d > 180) d -= 360; if (d < -180) d += 360;
  return ((a[i] + d * f + 540) % 360) - 180;
};
const dAt = (who, t) => sample(A.chars[who].d, A.fps, t);
const mouthAt = (who, t) => sample(A.chars[who].mouth, A.fps, t);
const cuesBy = { K: [], H: [] };
A.cues.forEach((c) => cuesBy[c.who].push(c));
const activeCue = (who, t) => {
  let best = null;
  for (const c of cuesBy[who]) if (t >= c.t - 0.1 && t <= c.t + c.dur + (c.kind === 'breath' ? 0.15 : 0.8)) best = c;
  return best;
};

// ---------------------------------------------------------------- room (static layer, drawn once)
const RW = W + 240;
const room = document.createElement('canvas'); room.width = RW; room.height = H;
(function drawRoom() {
  const c = room.getContext('2d'), cx = RW / 2;
  let g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#24170f'); g.addColorStop(.75, '#1b120c'); g.addColorStop(1, '#120c08');
  c.fillStyle = g; c.fillRect(0, 0, RW, H);
  // wall planks
  c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 2;
  for (let x = 0; x < RW; x += 70) { c.beginPath(); c.moveTo(x, 170); c.lineTo(x, 830); c.stroke(); }
  // window opening: night sky
  const wx0 = cx - 420, wx1 = cx + 420, wy0 = 190, wy1 = 640;
  g = c.createLinearGradient(0, wy0, 0, wy1); g.addColorStop(0, '#0a1530'); g.addColorStop(.7, '#1d3260'); g.addColorStop(1, '#2d4675');
  c.fillStyle = g; c.fillRect(wx0, wy0, wx1 - wx0, wy1 - wy0);
  g = c.createRadialGradient(cx + 230, 280, 10, cx + 230, 280, 160); g.addColorStop(0, 'rgba(255,250,230,.95)'); g.addColorStop(.12, 'rgba(255,250,230,.9)'); g.addColorStop(.14, 'rgba(200,220,255,.25)'); g.addColorStop(1, 'rgba(200,220,255,0)');
  c.fillStyle = g; c.fillRect(wx0, wy0, wx1 - wx0, wy1 - wy0);
  c.fillStyle = '#c9d8f0'; c.beginPath(); c.moveTo(wx0, 560);
  for (let x = wx0; x <= wx1; x += 40) c.lineTo(x, 545 + Math.sin(x / 90) * 22 + Math.sin(x / 37) * 6);
  c.lineTo(wx1, wy1); c.lineTo(wx0, wy1); c.fill();
  c.fillStyle = '#0f1c36';
  for (let i = 0; i < 9; i++) { const x = wx0 + 60 + i * 92 + (i % 2) * 20, h = 70 + (i % 3) * 30; c.beginPath(); c.moveTo(x, 590 - h); c.lineTo(x - 28, 600); c.lineTo(x + 28, 600); c.fill(); c.fillStyle = '#e6eefb'; c.beginPath(); c.moveTo(x, 590 - h); c.lineTo(x - 10, 590 - h + 26); c.lineTo(x + 10, 590 - h + 26); c.fill(); c.fillStyle = '#0f1c36'; }
  c.fillStyle = '#dfe8f7'; c.fillRect(wx0, 600, wx1 - wx0, 40);
  // shoji side panels (lit paper)
  for (const [x0, x1] of [[cx - 720, wx0], [wx1, cx + 720]]) {
    g = c.createLinearGradient(0, wy0, 0, wy1); g.addColorStop(0, '#d9c49a'); g.addColorStop(1, '#b89c6c');
    c.fillStyle = g; c.fillRect(x0, wy0, x1 - x0, wy1 - wy0);
    c.strokeStyle = '#4a3020'; c.lineWidth = 5;
    for (let x = x0; x <= x1; x += (x1 - x0) / 4) { c.beginPath(); c.moveTo(x, wy0); c.lineTo(x, wy1); c.stroke(); }
    for (let y = wy0; y <= wy1; y += (wy1 - wy0) / 6) { c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke(); }
  }
  c.strokeStyle = '#3b2617'; c.lineWidth = 6;
  c.beginPath(); c.moveTo(cx, wy0); c.lineTo(cx, wy1); c.stroke();
  c.lineWidth = 16; c.strokeRect(wx0, wy0, wx1 - wx0, wy1 - wy0);
  // beams & posts
  c.fillStyle = '#3a2618'; c.fillRect(0, 120, RW, 60); c.fillRect(0, 640, RW, 26);
  c.fillStyle = '#2b1b10'; c.fillRect(cx - 760, 0, 46, 840); c.fillRect(cx + 714, 0, 46, 840);
  c.fillStyle = '#4a3222'; c.fillRect(0, 168, RW, 8);
  // hanging scroll (left)
  c.fillStyle = '#e9e1cf'; c.fillRect(120, 230, 130, 360); c.fillStyle = '#5b3c26'; c.fillRect(112, 222, 146, 12); c.fillRect(112, 588, 146, 12);
  c.strokeStyle = '#33415e'; c.lineWidth = 4; c.save(); c.translate(185, 360);
  for (let k = 0; k < 6; k++) { c.rotate(Math.PI / 3); c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 44); c.moveTo(0, 26); c.lineTo(10, 36); c.moveTo(0, 26); c.lineTo(-10, 36); c.stroke(); }
  c.restore(); c.fillStyle = '#b8402c'; c.fillRect(176, 470, 18, 18);
  // floor (tatami) in perspective
  g = c.createLinearGradient(0, 830, 0, H); g.addColorStop(0, '#5e5233'); g.addColorStop(1, '#3a321e');
  c.fillStyle = g; c.fillRect(0, 830, RW, H - 830);
  c.strokeStyle = 'rgba(20,14,6,.55)'; c.lineWidth = 3;
  for (let i = -8; i <= 8; i++) { c.beginPath(); c.moveTo(cx + i * 120, 830); c.lineTo(cx + i * 360, H); c.stroke(); }
  c.beginPath(); c.moveTo(0, 900); c.lineTo(RW, 900); c.stroke();
  c.fillStyle = '#2b1b10'; c.fillRect(0, 822, RW, 12);
  // irori (hearth) frame at the bottom
  c.fillStyle = '#2a170c'; c.beginPath(); c.moveTo(cx - 330, 1000); c.lineTo(cx + 330, 1000); c.lineTo(cx + 420, H); c.lineTo(cx - 420, H); c.fill();
  c.fillStyle = '#4a4440'; c.beginPath(); c.moveTo(cx - 280, 1014); c.lineTo(cx + 280, 1014); c.lineTo(cx + 350, H); c.lineTo(cx - 350, H); c.fill();
  // andon lantern (right)
  c.fillStyle = '#2b1b10'; c.fillRect(cx + 820, 640, 90, 180);
  c.fillStyle = '#f2d39a'; c.fillRect(cx + 830, 650, 70, 150);
  c.strokeStyle = '#2b1b10'; c.lineWidth = 3; c.beginPath(); c.moveTo(cx + 865, 650); c.lineTo(cx + 865, 800); c.moveTo(cx + 830, 725); c.lineTo(cx + 900, 725); c.stroke();
})();

const snow = Array.from({ length: 170 }, (_, i) => ({ x: hash(i) , y: hash(i + 99), s: 1 + hash(i + 7) * 3, v: .03 + hash(i + 3) * .06, w: hash(i + 5) * 6 }));

function drawRoomFrame(ctx, t, shift) {
  if (typeof ok === 'function' && ok('art.room_bg')) return drawArtRoom(ctx, t, shift);
  const ox = -120 + shift;
  ctx.drawImage(room, ox, 0);
  const cx = RW / 2 + ox;
  // snow through the window
  ctx.save(); ctx.beginPath(); ctx.rect(cx - 412, 198, 824, 434); ctx.clip();
  ctx.fillStyle = 'rgba(240,246,255,.9)';
  for (const f of snow) {
    const y = ((f.y + t * f.v) % 1) * 460 + 190, x = cx - 420 + ((f.x * 840 + Math.sin(t * .8 + f.w) * 14) % 840);
    ctx.globalAlpha = .4 + f.s / 6; ctx.beginPath(); ctx.arc(x, y, f.s, 0, 7); ctx.fill();
  }
  ctx.restore(); ctx.globalAlpha = 1;
  // fire glow from the hearth + lantern flicker
  const fl = .85 + .1 * Math.sin(t * 7.3) + .06 * Math.sin(t * 13.1 + 1);
  let g = ctx.createRadialGradient(cx, H + 40, 20, cx, H + 40, 700);
  g.addColorStop(0, `rgba(255,150,60,${.55 * fl})`); g.addColorStop(.35, `rgba(255,110,40,${.18 * fl})`); g.addColorStop(1, 'rgba(255,100,30,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = `rgba(255,${120 + 40 * fl},40,${.8 * fl})`;
  for (let i = 0; i < 12; i++) { const x = cx - 220 + i * 40 + Math.sin(i * 3) * 10; ctx.beginPath(); ctx.arc(x, 1052 + Math.sin(i) * 8, 6 + 4 * hash(i + Math.floor(t * 6)), 0, 7); ctx.fill(); }
  g = ctx.createRadialGradient(cx + 865, 725, 10, cx + 865, 725, 260);
  g.addColorStop(0, `rgba(255,200,120,${.35 * fl})`); g.addColorStop(1, 'rgba(255,180,90,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // vignette
  g = ctx.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, H * .95);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,10,.6)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

// ---------------------------------------------------------------- character
function blinkAmt(t, seed) {
  const p = 3.4 + seed, k = Math.floor(t / p), off = hash(k * 7 + seed * 31) * (p - .5), dt = t - k * p - off;
  return dt >= 0 && dt < .16 ? Math.abs(Math.cos((dt / .16) * Math.PI)) : 1;
}

// character glow colours (aura, breath tint)
const PAL = { K: { glow: '120,190,255' }, H: { glow: '255,140,60' } };

function wisp(ctx, x, y, r, alpha, t) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.2);
  g.addColorStop(0, `rgba(255,245,200,${alpha})`); g.addColorStop(.35, `rgba(255,170,70,${alpha * .8})`); g.addColorStop(1, 'rgba(255,90,30,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(x, y - r * 2.6 - Math.sin(t * 9) * r * .4);
  ctx.quadraticCurveTo(x + r * 1.6, y, x, y + r * 1.2); ctx.quadraticCurveTo(x - r * 1.6, y, x, y - r * 2.6 - Math.sin(t * 9) * r * .4); ctx.fill();
}

// ---------------------------------------------------------------- particles (breath, magic)
let parts = [];
function spawn(o) { if (parts.length < 900) parts.push(o); }
function updateParts(dt) {
  for (const q of parts) { q.life += dt; if (q.seed !== undefined && (q.kind === 'frost' || q.kind === 'haze')) { q.vx += Math.sin(q.life * 5 + q.seed) * 40 * dt; q.vy += Math.cos(q.life * 4 + q.seed) * 30 * dt + (q.kind === 'haze' ? -20 : 12) * dt; } q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 1 - 1.4 * dt; q.vy *= 1 - 1.4 * dt; if (q.spin) q.rot += q.spin * dt; if (q.grow) q.size += q.grow * dt; }
  parts = parts.filter((q) => q.life < q.max);
}
function drawParts(ctx) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const q of parts) {
    const k = q.life / q.max, a = Math.sin(Math.PI * Math.min(1, k * 1.2)) * q.a;
    if (q.kind === 'frost' || q.kind === 'haze') {
      const fa = q.a * Math.min(1, k * 2.6) * Math.pow(1 - k, 1.3);
      ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(Math.atan2(q.vy, q.vx)); ctx.scale(1.9, 1);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, q.size);
      if (q.kind === 'frost') { g.addColorStop(0, `rgba(228,242,255,${fa * .42})`); g.addColorStop(.6, `rgba(200,228,255,${fa * .16})`); g.addColorStop(1, 'rgba(190,225,255,0)'); }
      else { g.addColorStop(0, `rgba(255,222,190,${fa * .4})`); g.addColorStop(.6, `rgba(255,180,140,${fa * .16})`); g.addColorStop(1, 'rgba(255,170,120,0)'); }
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, q.size, 0, 7); ctx.fill(); ctx.restore();
    } else if (q.kind === 'glint') {
      ctx.fillStyle = `rgba(240,250,255,${a})`; ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot);
      ctx.beginPath(); for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.lineTo(0, q.size); ctx.lineTo(q.size * .2, q.size * .2); } ctx.fill(); ctx.restore();
    } else if (q.kind === 'mist') {
      const g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, q.size);
      g.addColorStop(0, `rgba(210,235,255,${a * .5})`); g.addColorStop(1, 'rgba(180,220,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(q.x, q.y, q.size, 0, 7); ctx.fill();
    } else if (q.kind === 'warm') {
      const g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, q.size);
      g.addColorStop(0, `rgba(255,190,110,${a * .45})`); g.addColorStop(1, 'rgba(255,120,50,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(q.x, q.y, q.size, 0, 7); ctx.fill();
    } else if (q.kind === 'ember') {
      ctx.fillStyle = `rgba(255,${150 + 80 * (1 - k)},60,${a})`; ctx.beginPath(); ctx.arc(q.x, q.y, q.size, 0, 7); ctx.fill();
    } else if (q.kind === 'flake') {
      ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.strokeStyle = `rgba(220,240,255,${a})`; ctx.lineWidth = Math.max(1.5, q.size / 6);
      for (let i = 0; i < 6; i++) { ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, q.size); ctx.moveTo(0, q.size * .55); ctx.lineTo(q.size * .25, q.size * .8); ctx.moveTo(0, q.size * .55); ctx.lineTo(-q.size * .25, q.size * .8); ctx.stroke(); }
      ctx.restore();
    } else if (q.kind === 'spark') {
      ctx.fillStyle = `rgba(230,250,255,${a})`; ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot);
      ctx.beginPath(); for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.lineTo(0, q.size); ctx.lineTo(q.size * .22, q.size * .22); } ctx.fill(); ctx.restore();
    } else if (q.kind === 'wisp') {
      wisp(ctx, q.x, q.y, q.size, a, q.life + q.seed);
    }
  }
  ctx.restore();
}

// ---------------------------------------------------------------- figures: designer art (art/chatgpt → tools/prepare_art.py → media/art)
// Bust frames (blink / mouth / expressions) are face-composited onto one base, so swapping them changes only the face.
// Live2D-style motion on top: breathing, talk bounce, strip-mesh sway of hair and sleeves, lean, mirroring, cross-fades.
const ART = new Set(D.art || []);
const FACES = D.artFaces || {};
const IMG = {};
for (const f of ART) { const im = new Image(); im.src = `media/art/${f}.webp`; IMG[`art.${f}`] = im; }
const ok = (key) => IMG[key] && IMG[key].complete && IMG[key].naturalWidth > 0;
const POSE_FILE = { front: 'idle', near: 'idle', side: 'walk', run: 'run', blow: 'blow', magic: 'magic', rest: 'rest', appear: 'appear', hug: 'hug' };
const FACING_R = new Set(['K_pose_walk', 'K_pose_run', 'K_pose_blow', 'H_pose_run', 'H_pose_blow', 'K_ear', 'K_ear_blow', 'H_ear', 'H_ear_blow']);
const xOf = (az) => W / 2 + Math.sin(rad(clamp(az, -118, 118))) * W * .43 + (Math.abs(az) > 90 ? Math.sign(az) * (Math.abs(az) - 90) * 9 : 0);

function chooseLook(st, t) {
  const who = st.who, c = st.cue;
  let pose;
  if (c && c.kind === 'magic' && c.style !== 'whoosh' && t < c.t + c.dur) pose = 'magic';
  else if (st.running) pose = 'run';
  else if (st.d < .55 && bustReachesBottom(st)) pose = 'bust';
  else if (who === 'H' && t >= 49.8 && t < 54) pose = 'appear';
  else if (st.blowing) pose = 'blow';
  else if (who === 'K' && c && c.kind === 'pant') pose = 'rest';
  else if (who === 'H' && c && Math.abs(c.t - 119.4) < .01) pose = 'hug';
  else if (Math.abs(st.vel) > 18) pose = who === 'K' ? 'side' : 'front';
  else pose = 'front';
  let name;
  if (pose === 'bust') {
    const ear = st.d < .3 && Math.abs(st.az) > 55 && ART.has(`${who}_ear`);
    name = ear ? `${who}_ear${st.blowing && ART.has(`${who}_ear_blow`) ? '_blow' : ''}` : bustFrame(st);
  } else {
    name = `${who}_pose_${POSE_FILE[pose] || 'idle'}`;
    if (!ART.has(name)) name = `${who}_pose_idle`;
  }
  const kind = name.includes('_ear') ? 'ear' : name.includes('_bust') ? 'bust' : 'pose';
  // face the direction of travel; when still, face the centre of the screen
  const dx = xOf(azAt(who, t + .1)) - xOf(azAt(who, t - .1));
  const want = Math.abs(dx) > 6 ? (dx > 0 ? 'R' : 'L') : (st.x > W / 2 ? 'L' : 'R');
  return { img: `art.${name}`, kind, pose, flip: FACING_R.has(name) && want === 'L' };
}

function bustReachesBottom(st) {   // a waist-up image must continue below the frame, otherwise the cut-off body shows
  const F = FACES[`${st.who}_bust`], im = IMG[`art.${st.who}_bust_base`];
  if (!F || !im || !im.naturalHeight) return true;
  const k = (240 * st.s) / (F.rx * 1.25);
  return st.y + (im.naturalHeight - F.cy) * k > H + 40;
}

function bustFrame(st) {   // blink > talking mouth > expression > base
  const w = st.who, has = (s) => ART.has(`${w}_bust_${s}`);
  const exprMap = { shy: 'shy', happy: 'happy', laugh: 'happy', surprise: 'surprise', whisper: 'whisper', sleepy: 'whisper', pout: 'pout', smug: 'smug', blow: 'blow' };
  if (st.blowing && has('blow')) return `${w}_bust_blow`;
  if (st.blink < .5 && has('blink')) return `${w}_bust_blink`;
  if (st.mouth > .45 && has('mouth_open')) return `${w}_bust_mouth_open`;
  if (st.mouth > .15 && has('mouth_half')) return `${w}_bust_mouth_half`;
  const ex = exprMap[st.expr];
  if (ex && has(ex)) return `${w}_bust_${ex}`;
  if (st.expr === 'smug' && has('happy')) return `${w}_bust_happy`;
  return `${w}_bust_base`;
}

// strip-mesh draw: the lower a slice, the more it sways (hair ends, sleeves, tail) — a cheap Live2D-style deformation
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

const figState = { K: { cur: null, prev: null, since: -9, lastT: -9 }, H: { cur: null, prev: null, since: -9, lastT: -9 } };

function layout(look, st) {
  const img = IMG[look.img], iw = img.naturalWidth, ih = img.naturalHeight;
  if (look.kind === 'bust') {
    const F = FACES[`${st.who}_bust`] || { cx: iw * .5, cy: ih * .38, rx: iw * .27, ry: ih * .11 };
    const k = (240 * st.s) / (F.rx * 1.25);
    return { k, pivotX: F.cx, top: -F.cy * k, mouth: [F.cx, F.cy + F.ry * .45] };
  }
  if (look.kind === 'ear') {
    const fx = iw * .52, fy = ih * .42, k = (240 * st.s) / (iw * .42);
    const M = FACES[`${st.who}_ear`];
    return { k, pivotX: fx, top: -fy * k, mouth: M ? [M.cx, M.cy] : [fx + iw * .12, fy + ih * .07] };
  }
  const h = 780 * st.s * (look.pose === 'rest' ? .85 : 1), k = h / ih;   // full-body pose, head ≈ 26 % from the top
  return { k, pivotX: iw / 2, top: -.26 * h, mouth: [iw * .55, ih * .33] };
}

function drawFigure(st, t) {
  const fs = figState[st.who];
  const look = chooseLook(st, t);
  if (!ok(look.img)) return false;
  const key = look.img + (look.flip ? ':f' : '');
  const jumped = Math.abs(t - fs.lastT) > .5;
  const sameGroup = fs.cur && fs.cur.look.kind === look.kind && look.kind !== 'pose' && fs.cur.look.flip === look.flip;
  if (!fs.cur || jumped) { fs.cur = { look, key }; fs.prev = null; fs.since = -9; }
  else if (key !== fs.cur.key) {
    // face frames (blink / mouth) swap instantly; pose changes cross-fade
    if (sameGroup) { fs.cur = { look, key }; } else { fs.prev = fs.cur; fs.cur = { look, key }; fs.since = t; }
  }
  fs.lastT = t;
  const fade = clamp((t - fs.since) / .22, 0, 1);

  const p = PAL[st.who];   // soft aura behind the figure
  const g = ctx.createRadialGradient(st.x, st.y + 60 * st.s, 30 * st.s, st.x, st.y + 60 * st.s, 380 * st.s);
  g.addColorStop(0, `rgba(${p.glow},${.2 * st.alpha})`); g.addColorStop(1, `rgba(${p.glow},0)`);
  ctx.fillStyle = g; ctx.fillRect(st.x - 400 * st.s, st.y - 340 * st.s, 800 * st.s, 800 * st.s);

  if (fs.cur.look.kind === 'pose') {   // soft contact shadow so the figure stands on the tatami
    const L0 = layout(fs.cur.look, st), img0 = IMG[fs.cur.look.img];
    const feetY = st.y + L0.top + img0.naturalHeight * L0.k * .975, hw = 130 * st.s * (st.running ? .8 : 1);
    const lift = st.running ? Math.max(0, -(st.bob || 0)) : 0;
    ctx.save(); ctx.globalAlpha = st.alpha * (.5 - Math.min(.3, lift / 80)); ctx.translate(st.x, feetY); ctx.scale(1, .22);
    const sg = ctx.createRadialGradient(0, 0, 0, 0, 0, hw);
    sg.addColorStop(0, 'rgba(20,10,5,.55)'); sg.addColorStop(1, 'rgba(20,10,5,0)');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(0, 0, hw, 0, 7); ctx.fill(); ctx.restore();
  }
  const breath = .012 * Math.sin((t / 3.4) * Math.PI * 2 + (st.who === 'K' ? 0 : 1.7));
  const talk = st.mouth * 6 * st.s;
  const sway = (Math.sin(t * 1.7 + (st.who === 'K' ? 0 : 1.3)) * 10 - clamp(st.vel * .35, -40, 40)) * st.s;
  for (const [layer, a] of [[fs.prev, 1 - fade], [fs.cur, fade < 1 && fs.prev ? fade : 1]]) {
    if (!layer || a <= .01 || !ok(layer.look.img)) continue;
    const lk = layer.look, img = IMG[lk.img], L = layout(lk, st);
    const pivotY = st.y - talk;
    drawWarped(img, st.x, L.pivotX, pivotY, L.top, L.k, lk.flip, st.alpha * a, st.rot * .6, sway * (lk.kind === 'pose' ? 1 : .5), breath + st.mouth * .006);
    if (layer === fs.cur) {
      st.mx = st.x + (L.mouth[0] - L.pivotX) * L.k * (lk.flip ? -1 : 1);
      st.my = pivotY + L.top + L.mouth[1] * L.k;
    }
  }

  if (st.who === 'H') {   // foxfire wisps orbiting Homura
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 3; k++) {
      const a = t * 1.3 + (k * Math.PI * 2) / 3, x = st.x + Math.cos(a) * 230 * st.s, y = st.y - 20 * st.s + Math.sin(a) * 80 * st.s;
      wisp(ctx, x, y, 22 * st.s * (1 + .15 * Math.sin(t * 6 + k)), st.alpha * .9, t + k);
    }
    ctx.restore();
  }
  return true;
}

// background art (room_bg) with live snow in the open window, hearth and lantern flicker
function drawArtRoom(ctx, t, shift) {
  const img = IMG['art.room_bg'], BW = W + 80, k = BW / img.naturalWidth, BH = img.naturalHeight * k;
  const ox = -40 + clamp(shift, -40, 40), oy = -(BH - H) * .55;
  ctx.drawImage(img, ox, oy, BW, BH);
  const wx0 = ox + .335 * BW, wx1 = ox + .738 * BW, wy0 = oy + .12 * BH, wy1 = oy + .58 * BH;
  ctx.save(); ctx.beginPath(); ctx.rect(wx0, wy0, wx1 - wx0, wy1 - wy0); ctx.clip();
  ctx.fillStyle = 'rgba(245,248,255,.9)';
  for (const f of snow) {
    const y = wy0 + ((f.y + t * f.v * .8) % 1) * (wy1 - wy0), x = wx0 + ((f.x * (wx1 - wx0) + Math.sin(t * .8 + f.w) * 14) % (wx1 - wx0));
    ctx.globalAlpha = .35 + f.s / 7; ctx.beginPath(); ctx.arc(x, y, f.s * .9, 0, 7); ctx.fill();
  }
  ctx.restore(); ctx.globalAlpha = 1;
  const fl = .85 + .1 * Math.sin(t * 7.3) + .06 * Math.sin(t * 13.1 + 1);
  let g = ctx.createRadialGradient(W / 2, H + 60, 20, W / 2, H + 60, 620);
  g.addColorStop(0, `rgba(255,150,60,${.32 * fl})`); g.addColorStop(1, 'rgba(255,100,30,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const lx = ox + .94 * BW, ly = oy + .52 * BH;
  g = ctx.createRadialGradient(lx, ly, 10, lx, ly, 240);
  g.addColorStop(0, `rgba(255,200,120,${.22 * fl})`); g.addColorStop(1, 'rgba(255,180,90,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  g = ctx.createRadialGradient(W / 2, H / 2, H * .4, W / 2, H / 2, H * .95);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,10,.45)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

// ---------------------------------------------------------------- scene state per frame
function charState(who, t) {
  const [t0, t1] = A.present[who];
  if (t < t0) return null;
  const az = azAt(who, t), d = dAt(who, t);
  const v = (azAt(who, t + .1) - azAt(who, t - .1));
  const vel = clamp(((v + 540) % 360 - 180) / .2, -150, 150);
  const absAz = Math.abs(az);
  const alpha = clamp((t - t0) / .6, 0, 1) * clamp((t1 + .3 - t) / .6, 0, 1) * clamp((5 - d) / 1.5, 0, 1) * clamp((118 - absAz) / 14, 0, 1);
  const s = clamp(.62 * Math.pow(1 / d, .55), .26, 1.75);
  const near = clamp((1.3 - d) / 1.1, 0, 1);
  const cue = activeCue(who, t);
  const running = Math.abs(vel) > 45 && d < 1.2;
  const expr = cue ? (cue.kind === 'breath' ? 'blow' : cue.kind === 'pant' ? 'pant' : cue.expr) : 'idle';
  const blowing = !!cue && cue.kind === 'breath' && t < cue.t + cue.dur;
  const side = Math.sin(rad(az));
  const x = W / 2 + Math.sin(rad(clamp(az, -118, 118))) * W * .43 + (absAz > 90 ? Math.sign(az) * (absAz - 90) * 9 : 0);
  const bob = running ? Math.abs(Math.sin(t * 13)) * -22 * s : Math.sin(t * 1.6 + (who === 'K' ? 0 : 2)) * 6 * s;
  return {
    who, az, d, vel, alpha, s, near, cue, expr, blowing, running, t, bob,
    x, y: lerp(HORIZON, 540, near) + bob + (expr === 'pant' ? Math.sin(t * 9) * 5 * s : 0),
    rot: -side * .22 * near * (absAz > 50 ? 1 : .3) + clamp(vel / 900, -.12, .12),
    turn: clamp(-side * .7, -.7, .7) * (absAz > 100 ? .5 : 1),
    sway: Math.sin(t * 1.7 + (who === 'K' ? 0 : 1.3)) * 7 - clamp(vel * .25, -30, 30),
    blink: blinkAmt(t, who === 'K' ? 0 : 1.1),
    mouth: mouthAt(who, t),
  };
}

function emit(st, t, dt) {
  const mx = st.mx ?? st.x + st.turn * 18 * st.s, my = st.my ?? st.y + 76 * st.s;
  const dir = Math.sin(rad(st.az));
  if (st.blowing) {
    // breath follows the loudness of the character's own breath track; drifts toward the ear on that side
    const env = A.chars[st.who].breath ? sample(A.chars[st.who].breath, A.fps, t) : .7;
    const cold = st.who === 'K', side = Math.sin(rad(st.az));
    const n = env > .04 ? Math.ceil(dt * 150 * env) : 0;
    for (let i = 0; i < n; i++) {
      const sp = (160 + 260 * env) * Math.max(.5, st.s) * (.7 + Math.random() * .6);
      const vx = (side * .9 + (Math.random() - .5) * .55) * sp, vy = ((cold ? .12 : -.18) + (Math.random() - .5) * .35) * sp;
      const off = 22 * st.s / Math.max(1, Math.hypot(vx, vy));   // start just past the lips, so no fog piles up on the face
      spawn({ kind: cold ? 'frost' : 'haze', x: mx + vx * off + (Math.random() - .5) * 6 * st.s, y: my + vy * off, vx, vy, size: 7 * st.s, grow: (cold ? 120 : 105) * st.s,
              life: 0, max: .9 + Math.random() * .7, a: .25 + .5 * env, seed: Math.random() * 6.3 });
      if (cold && Math.random() < .08 * env) spawn({ kind: 'glint', x: mx, y: my, vx: vx * 1.1, vy: vy + (Math.random() - .5) * 60, size: 3 + Math.random() * 4, rot: Math.random() * 3, spin: 2, life: 0, max: .9, a: .9 });
    }
  }
  if (st.cue && st.cue.kind === 'magic' && t < st.cue.t + st.cue.dur) {
    const n = Math.ceil(dt * (st.cue.style === 'whoosh' ? 140 : 50));
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 7, r = (120 + Math.random() * 260) * st.s;
      if (st.cue.style === 'ice') spawn({ kind: Math.random() < .6 ? 'flake' : 'spark', x: st.x + Math.cos(a) * r, y: st.y + Math.sin(a) * r * .7, vx: -Math.sin(a) * 160, vy: Math.cos(a) * 110 + 30, size: 8 + Math.random() * 18, rot: a, spin: 1.5, life: 0, max: 2.2, a: 1 });
      else if (st.cue.style === 'fire') spawn({ kind: Math.random() < .3 ? 'wisp' : 'ember', x: st.x + Math.cos(a) * r, y: st.y + Math.sin(a) * r * .7, vx: -Math.sin(a) * 120, vy: -80 - Math.random() * 120, size: Math.random() < .3 ? 12 + Math.random() * 10 : 2 + Math.random() * 4, seed: Math.random() * 9, life: 0, max: 1.8, a: 1 });
      else spawn({ kind: 'ember', x: W + 20, y: 200 + Math.random() * 700, vx: -900 - Math.random() * 700, vy: (Math.random() - .5) * 200, size: 2 + Math.random() * 5, life: 0, max: 1.2, a: 1 });
    }
  }
}

function jointMagic(ctx, t) {
  const t0 = 132.6, t1 = 138.8;
  if (t < t0 || t > t1 + 1) return;
  const k = clamp((t - t0) / 1, 0, 1) * clamp((t1 + 1 - t) / 1.4, 0, 1);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 46; i++) {
    const a = t * 1.4 + i * .41, r = 80 + ((i * 37) % 420) + Math.sin(t * 2 + i) * 20, x = W / 2 + Math.cos(a) * r * 1.4, y = 470 + Math.sin(a) * r * .55;
    if (i % 2) { ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.strokeStyle = `rgba(210,240,255,${.85 * k})`; ctx.lineWidth = 3; for (let j = 0; j < 6; j++) { ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 16); ctx.stroke(); } ctx.restore(); }
    else wisp(ctx, x, y, 14, .8 * k, t + i);
  }
  const g = ctx.createRadialGradient(W / 2, 470, 10, W / 2, 470, 520);
  g.addColorStop(0, `rgba(255,240,220,${.25 * k})`); g.addColorStop(.5, `rgba(160,200,255,${.12 * k})`); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function thermalEdges(ctx, th) {
  for (const [side, c, h] of [[-1, th.Lc, th.Lh], [1, th.Rc, th.Rh]]) {
    const v = Math.max(c, h); if (v < .02) continue;
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
  const sd = Math.sign(st.az) || 1, x = sd < 0 ? 60 : W - 60, p = PAL[st.who];
  ctx.save(); ctx.globalAlpha = a;
  const g = ctx.createRadialGradient(x, H * .55, 0, x, H * .55, 260); g.addColorStop(0, `rgba(${p.glow},.45)`); g.addColorStop(1, `rgba(${p.glow},0)`);
  ctx.fillStyle = g; ctx.fillRect(x - 260, H * .55 - 260, 520, 520);
  ctx.fillStyle = '#fff'; ctx.font = '600 34px "Zen Maru Gothic", sans-serif'; ctx.textAlign = sd < 0 ? 'left' : 'right';
  ctx.fillText(`${st.who === 'K' ? '小雪' : '焔'} ${absAz > 150 ? '↻ うしろ' : sd < 0 ? '← ひだり' : 'みぎ →'}`, sd < 0 ? 30 : W - 30, H * .55);
  ctx.restore();
}

// ---------------------------------------------------------------- render loop
const cv = $('scene'), ctx = cv.getContext('2d');
let camYaw = 0, lastT = 0, lastFrame = performance.now();

function frame(t, dt) {
  const states = ['K', 'H'].map((w) => charState(w, t)).filter(Boolean);
  // camera follows whoever is speaking, a little
  let target = 0, wsum = 0;
  for (const st of states) { const w = st.mouth + (st.blowing ? .6 : 0); target += clamp(st.az, -60, 60) * w; wsum += w; }
  target = wsum > .05 ? target / wsum * .18 : 0;
  camYaw += (target - camYaw) * clamp(dt * 1.5, 0, 1);
  drawRoomFrame(ctx, t, -camYaw * 6);
  ctx.save(); ctx.translate(-camYaw * 10, 0);
  states.sort((a, b) => b.d - a.d).forEach((st) => { if (st.alpha > .01) drawFigure(st, t); emit(st, t, dt); });
  ctx.restore();
  jointMagic(ctx, t);
  updateParts(dt); drawParts(ctx);
  const th = thermalAt(t + offsetMs / 1000);
  thermalEdges(ctx, th);
  states.forEach((st) => offscreenHint(ctx, st));
  return { states, th };
}

// ---------------------------------------------------------------- radar + meters + timeline
const radar = $('radar'), rctx = radar.getContext('2d');
function drawRadar(states, th) {
  const c = rctx, w = radar.width, h = radar.height, cx = w / 2, cy = h / 2 + 6, R = 170;
  c.clearRect(0, 0, w, h);
  c.strokeStyle = '#26324f'; c.lineWidth = 2;
  for (const r of [.33, .66, 1]) { c.beginPath(); c.arc(cx, cy, R * r, 0, 7); c.stroke(); }
  c.fillStyle = '#6f7b96'; c.font = '20px Inter'; c.textAlign = 'center'; c.fillText('front', cx, cy - R - 10);
  for (const [sd, cl, hh] of [[-1, th.Lc, th.Lh], [1, th.Rc, th.Rh]]) {
    const v = Math.max(cl, hh), col = cl >= hh ? '79,179,255' : '255,122,69';
    const g = c.createRadialGradient(cx + sd * 44, cy, 0, cx + sd * 44, cy, 90); g.addColorStop(0, `rgba(${col},${.8 * v})`); g.addColorStop(1, `rgba(${col},0)`);
    c.fillStyle = g; c.beginPath(); c.arc(cx + sd * 44, cy, 90, 0, 7); c.fill();
    c.fillStyle = v > .02 ? `rgb(${col})` : '#3a4766'; c.beginPath(); c.roundRect(cx + sd * 44 - 9, cy - 22, 18, 44, 8); c.fill();
  }
  c.fillStyle = '#1b2542'; c.strokeStyle = '#6f7b96'; c.beginPath(); c.arc(cx, cy, 36, 0, 7); c.fill(); c.stroke();
  c.fillStyle = '#6f7b96'; c.beginPath(); c.moveTo(cx - 7, cy - 34); c.lineTo(cx, cy - 46); c.lineTo(cx + 7, cy - 34); c.fill();
  for (const st of states) {
    const r = 44 + (R - 44) * clamp(Math.log(st.d / .15) / Math.log(5 / .15), 0, 1);
    const x = cx + Math.sin(rad(st.az)) * r, y = cy - Math.cos(rad(st.az)) * r;
    const col = st.who === 'K' ? '#9fdcff' : '#ffb26b';
    c.fillStyle = col; c.globalAlpha = clamp(st.alpha + .35, 0, 1);
    c.beginPath(); c.arc(x, y, 13 + st.mouth * 6, 0, 7); c.fill();
    c.fillStyle = '#fff'; c.font = '600 20px "Noto Sans JP"'; c.fillText(st.who === 'K' ? '小雪' : '焔', x, y - 20); c.globalAlpha = 1;
  }
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


// headphone check
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

// ---------------------------------------------------------------- subtitles & scene titles
const subsEl = $('subs'), sceneEl = $('sceneTitle');
let subKey = '', sceneIdx = -1, sceneTimer = 0;
const NAME = { K: { ja: '小雪', en: 'Koyuki' }, H: { ja: '焔', en: 'Homura' }, KH: { ja: '小雪＆焔', en: 'Koyuki & Homura' } };
const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
function updateSubs(t) {
  const mode = $('subMode').value;
  const act = mode === 'off' ? [] : A.subs.filter((s) => t >= s.t0 && t < s.t1).slice(-2);
  const key = mode + act.map((s) => s.t0 + s.who).join('|');
  if (key === subKey) return; subKey = key;
  subsEl.innerHTML = act.map((s) => {
    const br = s.kind === 'breath' || s.kind === 'pant' ? ' breath' : '';
    const ja = mode !== 'en' ? `<div class="ja${br}"><span class="who ${s.who}">${NAME[s.who].ja}</span>${esc(s.ja)}</div>` : '';
    const en = mode !== 'ja' ? `<div class="en${br}">${mode === 'en' ? `<span class="who ${s.who}">${NAME[s.who].en}</span>` : ''}${esc(s.en)}</div>` : '';
    return `<div class="line">${ja}${en}</div>`;
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

// voice credits (required by the VOICEVOX terms) / draft notice
$('credits').textContent = A.voice && A.voice.backend === 'voicevox'
  ? `Voices: ${A.voice.credits.join(' / ')}`
  : 'Draft build: synthesized voice (macOS Kyoko).';

// ---------------------------------------------------------------- device output
const DEFAULT_RANGE = { heatMin: 0, heatMax: 200, coolMin: 35, coolMax: 80 };   // firmware HOT/COLD_PWM_MIN/MAX
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
$('subMode').value = store.get('asmr.subs', 'both');
$('subMode').addEventListener('change', () => { store.set('asmr.subs', $('subMode').value); subKey = ''; });

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
  drawRadar(states, live ? th : { Lc: 0, Lh: 0, Rc: 0, Rh: 0 });
  updateOutput(th, live);
  updateSubs(t); updateScene(t);
  $('time').textContent = `${fmt(t)} / ${fmt(A.duration)}`;
  $('playhead').style.left = `${(t / A.duration) * 100}%`;
  const near = states.filter((s) => s.alpha > .05).map((s) => `${s.who === 'K' ? '小雪' : '焔'} ${Math.round(s.az)}° ${s.d.toFixed(2)} m`);
  $('posInfo').textContent = near.join(' · ');
  requestAnimationFrame(loop);
}

// ---------------------------------------------------------------- offline render (tools/render_mp4.py)
// ?render=1 → step through the timeline at 30 fps, draw ja/en subtitles into the canvas, PUT JPEG frames to the local render server.
const RENDER = new URLSearchParams(location.search).has('render');
function drawSubsCanvas(t) {
  const act = A.subs.filter((s) => t >= s.t0 && t < s.t1).slice(-2);
  let y = H - 60 - (act.length - 1) * 118;
  ctx.textAlign = 'center';
  for (const s of act) {
    const col = s.who === 'K' ? '#9fdcff' : s.who === 'H' ? '#ffb26b' : '#ffe0c0';
    ctx.font = '700 46px "Zen Maru Gothic", "Noto Sans JP", sans-serif';
    const ja = `${NAME[s.who].ja}　${s.ja}`, wj = ctx.measureText(ja).width;
    ctx.font = '500 30px Inter, sans-serif';
    const wE = ctx.measureText(s.en).width, bw = Math.max(wj, wE) + 60;
    ctx.fillStyle = 'rgba(6,10,22,.6)'; ctx.beginPath(); ctx.roundRect(W / 2 - bw / 2, y - 64, bw, 108, 16); ctx.fill();
    ctx.font = '700 46px "Zen Maru Gothic", "Noto Sans JP", sans-serif'; ctx.fillStyle = '#fff';
    const nm = NAME[s.who].ja + '　'; const wn = ctx.measureText(nm).width;
    ctx.textAlign = 'left'; const x0 = W / 2 - wj / 2;
    ctx.fillStyle = col; ctx.fillText(nm, x0, y - 12); ctx.fillStyle = '#fff'; ctx.fillText(s.ja, x0 + wn, y - 12);
    ctx.textAlign = 'center'; ctx.font = '500 30px Inter, sans-serif'; ctx.fillStyle = '#dfe6f5'; ctx.fillText(s.en, W / 2, y + 30);
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
    if (t < 3.6 && cover.naturalWidth) {   // opening title card (the cover), fades out before the first line
      ctx.globalAlpha = t < 2.6 ? 1 : 3.6 - t; ctx.drawImage(cover, 0, 0, W, H); ctx.globalAlpha = 1;
    }
    let si = -1; A.scenes.forEach((s, k) => { if (t >= s.t) si = k; });
    const st = A.scenes[si], age = t - st.t;
    const sAge = si === 0 ? t - 3.6 : age;   // scene 1's title waits for the cover card to fade
    if (sAge >= 0 && sAge < 3.4) {
      ctx.globalAlpha = clamp(Math.min(sAge / .5, (3.4 - sAge) / .6), 0, 1);
      ctx.fillStyle = 'rgba(6,10,22,.5)'; ctx.fillRect(70, 60, 560, 96); ctx.fillStyle = '#ffb26b'; ctx.fillRect(70, 60, 5, 96);
      ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = '700 38px "Zen Maru Gothic", sans-serif'; ctx.fillText(`${st.n}　${st.ja}`, 96, 106);
      ctx.fillStyle = '#a8b3cc'; ctx.font = '500 24px Inter, sans-serif'; ctx.fillText(st.en, 96, 140); ctx.globalAlpha = 1;
    }
    drawSubsCanvas(t);
    const blob = await new Promise((r) => cv.toBlob(r, 'image/jpeg', .92));
    await fetch(`/frame/${String(i).padStart(5, '0')}.jpg`, { method: 'PUT', body: blob });
  }
  await fetch('/done', { method: 'PUT' });
}
if (RENDER) { document.body.classList.add('rendering'); renderAll(); } else requestAnimationFrame(loop);
