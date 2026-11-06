// 雪と狐火のひそひそ話 — MoHeat Evo ASMR demo.
// Clock = the binaural mix (or a loaded final film). Everything else is a function of that time:
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

// Cel (セル画) palettes, matched to the character sheet (Character.jpg): base / shadow / deep shadow / highlight,
// coloured line art. Light comes from the upper left (window). Chibi (Q版) proportions ≈ 2.5 heads.
const PAL = {
  K: { hair: '#e7e5fb', hairS: '#c3c1ec', hairS2: '#a3a0da', hairHi: '#ffffff', line: '#6764a6',
       skin: '#fff5ef', skinS: '#f4d0c8', skinLine: '#c98f80',
       eyeD: '#1c3c9c', eyeM: '#3b72e0', eyeL: '#a3d6ff', eyeLine: '#252c58', lid: '120,120,200', sparkle: '#d6f3ff',
       kimTop: '#f7faff', kim: '#c3d8f8', kimS: '#a2bdec', kimS2: '#8aa4dd', pattern: '#ffffff',
       trim: '#ffffff', trimS: '#d8e1f3', inner: '#9db7ea',
       obi: '#3e63c9', obiS: '#2b4697', bow: '#4a70d6', bowS: '#2f4ea8', gold: '#e9b949', goldS: '#b88a26',
       skirt: '#ffffff', skirtS: '#dde5f5', leg: '#ffffff', legS: '#dfe6f4', shoe: '#2c3157', shoeHi: '#ffffff',
       blush: '255,140,165', glow: '120,190,255' },
  H: { hair: '#ff8a3d', hairS: '#e7622b', hairS2: '#c1461e', hairHi: '#ffc58c', line: '#86310f',
       skin: '#fff2e8', skinS: '#f6c8b5', skinLine: '#c98470',
       eyeD: '#97400a', eyeM: '#ec8f1c', eyeL: '#ffe48a', eyeLine: '#45170a', lid: '170,90,60', sparkle: '#fff3b8',
       kimTop: '#e2412d', kim: '#d83429', kimS: '#a8261e', kimS2: '#7d1a15', pattern: '#f4c24f',
       trim: '#f4c24f', trimS: '#c4932b', inner: '#4a1419',
       obi: '#3a1418', obiS: '#220b0d', bow: '#cf2d2b', bowS: '#8f1d1d', gold: '#f4c24f', goldS: '#c4932b',
       skirt: '#fff8f1', skirtS: '#f1dccb', leg: '#fff6f0', legS: '#f0dcd2', shoe: '#8a4a2a', shoeHi: '#c07a4a',
       blush: '255,110,100', glow: '255,140,60' },
};

// path helpers --------------------------------------------------------------------------------
const BANG = [[96, 2], [82, -38], [66, -2], [48, -42], [30, -6], [12, -46], [-6, -8], [-24, -44], [-42, -4], [-60, -40], [-78, 0], [-92, -36], [-106, 40]];
function bangsPath(ctx, fx, dx = 0, dy = 0) {
  ctx.beginPath(); ctx.moveTo(-106 + dx, 40 + dy);
  ctx.bezierCurveTo(-116, -92, -60, -134, 0, -134); ctx.bezierCurveTo(60, -134, 116, -92, 106 + dx, 40 + dy);
  let px = 106 + dx, py = 40 + dy;
  for (const [x0, y0] of BANG) {
    const x = x0 + fx * .4 + dx, y = y0 + dy;
    ctx.quadraticCurveTo((px + x) / 2 + 3, (py + y) / 2 - 4, x, y); px = x; py = y;
  }
  ctx.closePath();
}
const bandPath = (ctx, x0, y0, x1, y1, w) => {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), nx = (-dy / L) * w / 2, ny = (dx / L) * w / 2;
  ctx.beginPath(); ctx.moveTo(x0 + nx, y0 + ny); ctx.lineTo(x1 + nx, y1 + ny); ctx.lineTo(x1 - nx, y1 - ny); ctx.lineTo(x0 - nx, y0 - ny); ctx.closePath();
};
// wavy edge from (x0,y0) to (x1,y1), `n` waves of amplitude `amp` (perpendicular)
function waveTo(ctx, x0, y0, x1, y1, n, amp) {
  const dx = (x1 - x0) / n, dy = (y1 - y0) / n, L = Math.hypot(dx, dy), nx = (-dy / L) * amp, ny = (dx / L) * amp;
  for (let i = 0; i < n; i++) {
    const s = i % 2 ? -1 : 1;
    ctx.quadraticCurveTo(x0 + dx * (i + .5) + nx * s, y0 + dy * (i + .5) + ny * s, x0 + dx * (i + 1), y0 + dy * (i + 1));
  }
}

function drawChar(ctx, who, st) {
  const p = PAL[who], t = st.t, sway = st.sway, turn = st.turn;
  // sheet mapping: Koyuki 调皮 = wink; Homura 得意 = closed eyes + cat mouth
  const e = st.expr === 'smug' && who === 'K' ? 'wink' : st.expr;
  const LW = 5, lw = 2.6;
  const fill = (path, color) => { path(); ctx.fillStyle = color; ctx.fill(); };
  const line = (path, w = LW, color = p.line) => { path(); ctx.lineWidth = w; ctx.strokeStyle = color; ctx.stroke(); };
  const within = (clip, draw) => { ctx.save(); clip(); ctx.clip(); draw(); ctx.restore(); };
  const part = (path, base, shade, w = LW) => { fill(path, base); if (shade) within(path, shade); line(path, w); };
  const vgrad = (y0, y1, c0, c1) => { const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, c0); g.addColorStop(1, c1); return g; };
  const snowflake = (x, y, r, color, w = 3) => {
    ctx.strokeStyle = color; ctx.lineWidth = w;
    for (let k = 0; k < 3; k++) { const a = (k * Math.PI) / 3; ctx.beginPath(); ctx.moveTo(x - Math.cos(a) * r, y - Math.sin(a) * r); ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); ctx.stroke(); }
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r * .22, 0, 7); ctx.fill();
  };
  const goldFlower = (x, y, r) => {
    ctx.fillStyle = p.pattern;
    for (let k = 0; k < 5; k++) { const a = k * 1.2566 + .3; ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * r * .55, y + Math.sin(a) * r * .55, r * .42, r * .26, a, 0, 7); ctx.fill(); }
    ctx.fillStyle = p.kimS; ctx.beginPath(); ctx.arc(x, y, r * .2, 0, 7); ctx.fill();
  };

  ctx.save();
  ctx.globalAlpha = st.alpha;
  ctx.translate(st.x, st.y); ctx.rotate(st.rot); ctx.scale(st.s, st.s);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';

  // aura
  let g = ctx.createRadialGradient(0, 40, 40, 0, 40, 340);
  g.addColorStop(0, `rgba(${p.glow},.2)`); g.addColorStop(1, `rgba(${p.glow},0)`);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 40, 340, 0, 7); ctx.fill();

  // ── Homura's tail (behind everything) ────────────────────────────────────────────
  if (who === 'H') {
    const tw = Math.sin(t * 2.4) * 26 + sway * 1.5;
    ctx.save(); ctx.translate(110, 400); ctx.rotate(-.35 + Math.sin(t * 2.4) * .12);
    const tail = () => { ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(70, -20, 150 + tw, -40, 220 + tw, -210); ctx.bezierCurveTo(270 + tw, -320, 360 + tw, -200, 300 + tw, -100); ctx.bezierCurveTo(250 + tw, 0, 130, 70, 10, 55); ctx.closePath(); };
    const tip = (r0, ox = 0, oy = 0) => () => { ctx.beginPath(); for (let i = 0; i <= 22; i++) { const a = (i / 22) * Math.PI * 2, r = i % 2 ? r0 : r0 - 16; ctx.lineTo(282 + tw + ox + Math.cos(a) * r, -205 + oy + Math.sin(a) * r); } ctx.closePath(); };
    part(tail, p.hair, () => {
      fill(() => { ctx.beginPath(); ctx.moveTo(10, 55); ctx.bezierCurveTo(130, 50, 240 + tw, -10, 320 + tw, -120); ctx.lineTo(440 + tw, -120); ctx.lineTo(440, 140); ctx.lineTo(0, 140); ctx.closePath(); }, p.hairS);
      fill(tip(92), '#fff8ef');
      within(tip(92), () => fill(tip(76, 24, 28), '#f0d9c4'));
      for (let k = 0; k < 4; k++) line(() => { ctx.beginPath(); ctx.moveTo(40 + k * 40, 15 - k * 25); ctx.quadraticCurveTo(80 + k * 40 + tw * .4, -25 - k * 35, 110 + k * 40 + tw * .6, -45 - k * 45); }, 2, p.hairS2);
    });
    ctx.restore();
  }

  // ── back hair: long and wavy ─────────────────────────────────────────────────────
  const backHair = () => {
    ctx.beginPath(); ctx.moveTo(-100, -40);
    ctx.quadraticCurveTo(-150, 30, -150, 110);
    waveTo(ctx, -150, 110, -170 + sway, 470, 6, 14);
    const tips = 7;
    for (let i = 1; i <= tips; i++) {
      const x = -170 + (340 * i) / tips + sway;
      ctx.quadraticCurveTo(x - 340 / tips / 2, 505, x, i % 2 ? 470 : 488);
    }
    waveTo(ctx, 170 + sway, 470, 150, 110, 6, 14);
    ctx.quadraticCurveTo(150, 30, 100, -40);
    ctx.bezierCurveTo(96, -142, -96, -142, -100, -40); ctx.closePath();
  };
  part(backHair, p.hair, () => {
    fill(() => { ctx.beginPath(); ctx.moveTo(-95, 40); ctx.bezierCurveTo(-60, 120, -70, 300, -50 + sway, 520); ctx.lineTo(80 + sway, 520); ctx.bezierCurveTo(85, 300, 75, 120, 95, 40); ctx.closePath(); }, p.hairS2);
    fill(() => { ctx.beginPath(); ctx.moveTo(110, -60); ctx.bezierCurveTo(140, 80, 150, 250, 130 + sway, 520); ctx.lineTo(240, 520); ctx.lineTo(240, -60); ctx.closePath(); }, p.hairS);
    for (const sx of [-140, -122, -104, 108, 126]) line(() => { ctx.beginPath(); ctx.moveTo(sx * .85, 50); ctx.bezierCurveTo(sx * 1.1, 180, sx * .95 + sway * .5, 300, sx * 1.05 + sway, 450); }, 2, p.hairS2);
  });

  // ── fox ears (big, white fluffy insides) ─────────────────────────────────────────
  if (who === 'H') {
    for (const sd of [-1, 1]) {
      ctx.save(); ctx.translate(sd * 66, -92); ctx.rotate(sd * (.32 + Math.max(0, Math.sin(t * 3 + sd)) * .08));
      const ear = () => { ctx.beginPath(); ctx.moveTo(-46, 16); ctx.quadraticCurveTo(-30, -78, 0, -128); ctx.quadraticCurveTo(30, -78, 46, 16); ctx.closePath(); };
      part(ear, p.hair, () => {
        fill(() => { ctx.beginPath(); ctx.moveTo(4, -140); ctx.lineTo(70, 30); ctx.lineTo(10, 30); ctx.closePath(); }, p.hairS);
        fill(() => { ctx.beginPath(); ctx.moveTo(-26, 10); ctx.quadraticCurveTo(-14, -50, 0, -88); ctx.quadraticCurveTo(14, -50, 26, 10); ctx.closePath(); }, '#ffd9c0');
        ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#e8cdbd'; ctx.lineWidth = 2;
        for (const [x, y, r] of [[-12, 0, 16], [10, -4, 15], [-2, -22, 14], [-14, -40, 10], [8, -44, 10], [0, 8, 14]]) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.stroke(); }
      });
      ctx.restore();
    }
  }

  // ── legs & shoes (visible in far shots) ──────────────────────────────────────────
  for (const sd of [-1, 1]) {
    const leg = () => { ctx.beginPath(); ctx.rect(sd * 34 - 17, 470, 34, 140); };
    part(leg, p.leg, () => fill(() => { ctx.beginPath(); ctx.rect(sd * 34 + 4, 470, 14, 140); }, p.legS), 3.5);
    const shoe = () => { ctx.beginPath(); ctx.moveTo(sd * 34 - 22, who === 'H' ? 560 : 590); ctx.lineTo(sd * 34 + 22, who === 'H' ? 560 : 590); ctx.lineTo(sd * 34 + 24, 628); ctx.quadraticCurveTo(sd * 34, 640, sd * 34 - 26, 628); ctx.closePath(); };
    part(shoe, p.shoe, () => fill(() => { ctx.beginPath(); ctx.rect(sd * 34 + 6, 550, 30, 90); }, who === 'H' ? '#5e3019' : '#1b1f3c'), 3.5);
    if (who === 'K') part(() => { ctx.beginPath(); ctx.ellipse(sd * 34, 590, 26, 9, 0, 0, 7); }, '#ffffff', null, 2.5);
    else for (let k = 0; k < 3; k++) line(() => { ctx.beginPath(); ctx.moveTo(sd * 34 - 10, 572 + k * 16); ctx.lineTo(sd * 34 + 10, 580 + k * 16); }, 2.5, p.gold);
  }

  // ── frilled underskirt ───────────────────────────────────────────────────────────
  const skirt = () => {
    ctx.beginPath(); ctx.moveTo(-150, 380); ctx.lineTo(-168, 480);
    for (let i = 0; i < 9; i++) { const x0 = -168 + i * 37.3; ctx.quadraticCurveTo(x0 + 18.6, 506, x0 + 37.3, 480); }
    ctx.lineTo(150, 380); ctx.closePath();
  };
  part(skirt, p.skirt, () => {
    fill(() => { ctx.beginPath(); ctx.rect(60, 380, 140, 140); }, p.skirtS);
    for (let i = 1; i < 9; i++) line(() => { ctx.beginPath(); ctx.moveTo(-168 + i * 37.3, 482); ctx.lineTo(-160 + i * 35, 455); }, 1.6, p.skirtS);
  }, 3.5);

  // ── neck ──────────────────────────────────────────────────────────────────────────
  const neck = () => { ctx.beginPath(); ctx.rect(-22, 60, 44, 80); };
  part(neck, p.skin, () => fill(() => { ctx.beginPath(); ctx.ellipse(turn * 6, 70, 60, 36, 0, 0, 7); }, p.skinS), 3);

  // ── kimono (short, chibi) ────────────────────────────────────────────────────────
  const torso = () => {
    ctx.beginPath(); ctx.moveTo(-52, 118); ctx.quadraticCurveTo(-120, 126, -142, 172); ctx.bezierCurveTo(-152, 260, -150, 360, -162, 445);
    ctx.quadraticCurveTo(0, 462, 162, 445); ctx.bezierCurveTo(150, 360, 152, 260, 142, 172); ctx.quadraticCurveTo(120, 126, 52, 118); ctx.closePath();
  };
  part(torso, vgrad(120, 450, p.kimTop, p.kim), () => {
    fill(() => { ctx.beginPath(); ctx.moveTo(84, 130); ctx.bezierCurveTo(110, 260, 100, 380, 120, 470); ctx.lineTo(260, 470); ctx.lineTo(260, 100); ctx.closePath(); }, who === 'K' ? 'rgba(130,160,225,.45)' : p.kimS);
    for (const [x0, x1, w] of [[-90, -108, 12], [-20, -28, 10], [50, 58, 12]])
      fill(() => { ctx.beginPath(); ctx.moveTo(x0, 372); ctx.quadraticCurveTo(x0 - 4, 410, x1, 455); ctx.lineTo(x1 + w, 455); ctx.quadraticCurveTo(x0 + w * .4, 410, x0 + 4, 372); ctx.closePath(); }, who === 'K' ? 'rgba(120,150,215,.5)' : p.kimS2);
    if (who === 'K') for (const [x, y, r] of [[-110, 230, 13], [100, 250, 15], [-70, 405, 14], [90, 410, 16], [-130, 330, 10], [20, 430, 11], [125, 330, 10]]) snowflake(x, y, r, p.pattern, 3);
    else for (const [x, y, r] of [[-110, 230, 18], [100, 250, 20], [-70, 410, 18], [90, 415, 20], [-125, 330, 14], [20, 430, 14]]) goldFlower(x, y, r);
  });

  // sleeves (wide furisode, white→blue / red with dark lining)
  for (const sd of [-1, 1]) {
    const sw = Math.sin(t * 1.4 + sd) * 6 + sway * .3;
    const sleeve = () => {
      ctx.beginPath(); ctx.moveTo(sd * 132, 168); ctx.quadraticCurveTo(sd * 230, 190, sd * 262 + sw, 270);
      ctx.lineTo(sd * 282 + sw, 470); ctx.quadraticCurveTo(sd * 276 + sw, 498, sd * 240 + sw, 496); ctx.lineTo(sd * 158, 488);
      ctx.quadraticCurveTo(sd * 170, 330, sd * 132, 168); ctx.closePath();
    };
    part(sleeve, vgrad(170, 500, p.kimTop, p.kim), () => {
      fill(() => { ctx.beginPath(); ctx.moveTo(sd * 132, 168); ctx.quadraticCurveTo(sd * 180, 330, sd * 172, 500); ctx.lineTo(sd * 120, 500); ctx.lineTo(sd * 120, 168); ctx.closePath(); }, who === 'K' ? p.inner : p.inner);
      if (sd > 0) fill(() => { ctx.beginPath(); ctx.moveTo(sd * 228, 190); ctx.quadraticCurveTo(sd * 250, 340, sd * 245 + sw, 500); ctx.lineTo(sd * 320, 500); ctx.lineTo(sd * 320, 190); ctx.closePath(); }, who === 'K' ? 'rgba(120,150,215,.45)' : p.kimS);
      if (who === 'K') { snowflake(sd * 215 + sw * .5, 340, 15, p.pattern); snowflake(sd * 245 + sw, 430, 18, p.pattern); snowflake(sd * 195, 450, 10, p.pattern); }
      else { goldFlower(sd * 215 + sw * .5, 340, 20); goldFlower(sd * 248 + sw, 440, 22); }
      fill(() => { ctx.beginPath(); ctx.moveTo(sd * 300 + sw, 462); ctx.quadraticCurveTo(sd * 282 + sw, 488, sd * 240 + sw, 486); ctx.lineTo(sd * 160, 478); ctx.lineTo(sd * 160, 520); ctx.lineTo(sd * 300, 520); ctx.closePath(); }, who === 'K' ? '#7e9ee0' : p.inner);
    });
    if (who === 'H') {   // red tassel at the sleeve corner
      const tx = sd * 270 + sw, ty = 492;
      line(() => { ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx, ty + 14); }, 3, p.gold);
      part(() => { ctx.beginPath(); ctx.moveTo(tx - 8, ty + 14); ctx.lineTo(tx + 8, ty + 14); ctx.lineTo(tx + 6, ty + 44); ctx.lineTo(tx - 6, ty + 44); ctx.closePath(); }, p.bow, null, 2);
    }
  }

  // collar: under-lapel then over-lapel (left over right)
  for (const [a, b] of [[[-44, 108, 14, 290], [-64, 116, 0, 300]], [[44, 108, -8, 276], [64, 116, -20, 286]]]) {
    part(() => bandPath(ctx, ...a, 28), '#fffaf3', () => fill(() => bandPath(ctx, a[0] + 8, a[1], a[2] + 8, a[3], 12), '#e7e1d8'), lw);
    part(() => bandPath(ctx, ...b, 14), who === 'K' ? '#8fb3ee' : p.trim, () => fill(() => bandPath(ctx, b[0] + 5, b[1], b[2] + 5, b[3], 5), who === 'K' ? '#6f93d8' : p.trimS), lw);
  }

  // obi + big front bow (Koyuki: blue bow with gold knot; Homura: red bow with gold bell)
  const obi = () => { ctx.beginPath(); ctx.rect(-150, 300, 300, 70); };
  part(obi, p.obi, () => {
    fill(() => { ctx.beginPath(); ctx.rect(-160, 348, 320, 30); }, p.obiS);
    fill(() => { ctx.beginPath(); ctx.rect(-160, 318, 320, 8); }, p.gold);
  }, 4);
  const bx = 0, by = 330, bw = Math.sin(t * 2) * 3;
  for (const sd of [-1, 1]) {
    const loop = () => { ctx.beginPath(); ctx.moveTo(bx, by); ctx.bezierCurveTo(bx + sd * 40, by - 60 + bw, bx + sd * 110, by - 50, bx + sd * 100, by); ctx.bezierCurveTo(bx + sd * 110, by + 50, bx + sd * 40, by + 60 - bw, bx, by); ctx.closePath(); };
    part(loop, p.bow, () => { fill(() => { ctx.beginPath(); ctx.ellipse(bx + sd * 60, by + 28, 60, 26, 0, 0, 7); }, p.bowS); if (who === 'K') snowflake(bx + sd * 62, by - 6, 12, '#ffffff', 2.5); }, 3.5);
    const tail = () => { ctx.beginPath(); ctx.moveTo(bx + sd * 6, by + 6); ctx.quadraticCurveTo(bx + sd * 40, by + 60, bx + sd * 30 + bw, by + 120); ctx.lineTo(bx + sd * 52 + bw, by + 112); ctx.quadraticCurveTo(bx + sd * 50, by + 50, bx + sd * 18, by + 2); ctx.closePath(); };
    part(tail, p.bow, () => fill(() => { ctx.beginPath(); ctx.rect(bx + sd * 30 - (sd < 0 ? 30 : 0), by + 20, 30, 120); }, p.bowS), 3.5);
  }
  part(() => { ctx.beginPath(); ctx.ellipse(bx, by, 18, 20, 0, 0, 7); }, p.gold, () => fill(() => { ctx.beginPath(); ctx.ellipse(bx + 7, by + 7, 14, 16, 0, 0, 7); }, p.goldS), 3);
  if (who === 'H') {
    part(() => { ctx.beginPath(); ctx.arc(bx, by + 34, 15, 0, 7); }, p.gold, () => { fill(() => { ctx.beginPath(); ctx.arc(bx + 6, by + 40, 13, 0, 7); }, p.goldS); fill(() => { ctx.beginPath(); ctx.arc(bx - 5, by + 29, 4, 0, 7); }, '#fff6d6'); }, 3);
    line(() => { ctx.beginPath(); ctx.moveTo(bx - 10, by + 38); ctx.lineTo(bx + 10, by + 38); }, 2.5, '#7a5310');
  } else {
    line(() => { ctx.beginPath(); ctx.moveTo(bx, by + 18); ctx.lineTo(bx, by + 60); }, 3, p.gold);
    part(() => { ctx.beginPath(); ctx.moveTo(bx - 9, by + 58); ctx.lineTo(bx + 9, by + 58); ctx.lineTo(bx + 7, by + 96); ctx.lineTo(bx - 7, by + 96); ctx.closePath(); }, '#ffffff', null, 2);
  }

  // Koyuki's fluffy fur collar
  if (who === 'K') {
    for (let i = 0; i <= 12; i++) {
      const a = Math.PI * (1.08 - (i / 12) * 1.16), x = Math.cos(a) * 140, y = 150 + Math.sin(a) * -36 + (i % 2) * 6 + 16;
      const puff = () => { ctx.beginPath(); ctx.arc(x, y, 28, 0, 7); };
      part(puff, '#ffffff', () => fill(() => { ctx.beginPath(); ctx.arc(x + 11, y + 13, 25, 0, 7); }, x > 40 ? '#cfd6ef' : '#e0e6f6'), 2.5);
    }
  }

  // ── face ──────────────────────────────────────────────────────────────────────────
  const fx = turn * 18;
  const face = () => { ctx.beginPath(); ctx.moveTo(-96, -20); ctx.bezierCurveTo(-98, 58, -48, 104, turn * 6, 113); ctx.bezierCurveTo(48, 104, 98, 58, 96, -20); ctx.bezierCurveTo(96, -122, -96, -122, -96, -20); ctx.closePath(); };
  fill(face, p.skin);
  within(face, () => {
    fill(() => { ctx.beginPath(); ctx.moveTo(78, -40); ctx.bezierCurveTo(96, 40, 72, 92, 22, 116); ctx.lineTo(150, 150); ctx.lineTo(150, -40); ctx.closePath(); }, p.skinS);
    fill(() => bangsPath(ctx, fx, 7, 17), p.skinS);
  });
  line(face, 3.5, p.skinLine);

  // blush: soft + hatch lines
  const blush = e === 'shy' || e === 'pout' ? .6 : e === 'whisper' || e === 'sleepy' ? .45 : .3;
  for (const sd of [-1, 1]) {
    const bxx = fx + sd * 60;
    g = ctx.createRadialGradient(bxx, 58, 2, bxx, 58, 32);
    g.addColorStop(0, `rgba(${p.blush},${blush})`); g.addColorStop(1, `rgba(${p.blush},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(bxx, 58, 34, 20, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = `rgba(${p.blush},${Math.min(1, blush + .25)})`; ctx.lineWidth = 2.2;
    for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(bxx - 13 + k * 9, 64); ctx.lineTo(bxx - 7 + k * 9, 52); ctx.stroke(); }
  }

  // eyes (big, sparkly — like the sheet)
  const closedHappy = e === 'happy' || e === 'laugh' || (e === 'smug' && who === 'H');
  const open = st.blink * (e === 'surprise' ? 1.12 : e === 'whisper' || e === 'blow' ? .62 : e === 'sleepy' ? .42 : e === 'pant' ? .55 : 1);
  for (const sd of [-1, 1]) {
    const ex = fx + sd * 41, ey = 16;
    const shut = closedHappy || (e === 'wink' && sd > 0);
    if (shut || open < .12) {
      ctx.fillStyle = p.eyeLine; ctx.beginPath();
      if (shut) { ctx.moveTo(ex - 24, ey + 10); ctx.quadraticCurveTo(ex, ey - 20, ex + 24, ey + 10); ctx.quadraticCurveTo(ex, ey - 10, ex - 24, ey + 10); }
      else { ctx.moveTo(ex - 25, ey + 6); ctx.quadraticCurveTo(ex, ey + 20, ex + 25, ey + 6); ctx.quadraticCurveTo(ex, ey + 13, ex - 25, ey + 6); }
      ctx.fill();
      line(() => { ctx.beginPath(); ctx.moveTo(ex + sd * 22, ey + (shut ? 6 : 8)); ctx.lineTo(ex + sd * 32, ey - 2); }, 3, p.eyeLine);
      continue;
    }
    const ry = 33 * open, cy = ey + (1 - open) * 14;
    const eye = () => { ctx.beginPath(); ctx.ellipse(ex, cy, 26, ry, 0, 0, 7); };
    fill(eye, '#ffffff');
    within(eye, () => {
      const ir = e === 'surprise' ? 18 : 23, ix = ex + turn * 6, iy = ey + 4;
      const iris = () => { ctx.beginPath(); ctx.ellipse(ix, iy, ir, ir * 1.22, 0, 0, 7); };
      fill(iris, p.eyeM);
      within(iris, () => {
        fill(() => { ctx.beginPath(); ctx.ellipse(ix, iy - ir * 1.15, ir * 1.5, ir * 1.05, 0, 0, 7); }, p.eyeD);
        fill(() => { ctx.beginPath(); ctx.ellipse(ix, iy + ir * 1.3, ir * .95, ir * .72, 0, 0, 7); }, p.eyeL);
        fill(() => { ctx.beginPath(); ctx.ellipse(ix, iy + 1, ir * .36, ir * .58, 0, 0, 7); }, p.eyeLine);
        ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.5;
        for (let k = 0; k < 8; k++) { const a = k * .785; ctx.beginPath(); ctx.moveTo(ix + Math.cos(a) * ir * .45, iy + Math.sin(a) * ir * .7); ctx.lineTo(ix + Math.cos(a) * ir * .85, iy + Math.sin(a) * ir * 1.05); ctx.stroke(); }
      });
      line(iris, 2.2, p.eyeLine);
      fill(() => { ctx.beginPath(); ctx.ellipse(ex, cy - ry * .98, 33, ry * .55, 0, 0, 7); }, `rgba(${p.lid},.45)`);
      fill(() => { ctx.beginPath(); ctx.ellipse(ix - ir * .4, iy - ir * .5, ir * .38, ir * .3, -.5, 0, 7); }, '#ffffff');
      fill(() => { ctx.beginPath(); ctx.arc(ix + ir * .45, iy + ir * .55, ir * .14, 0, 7); }, '#ffffff');
      fill(() => { ctx.beginPath(); ctx.arc(ix + ir * .35, iy - ir * .55, ir * .09, 0, 7); }, '#ffffff');
      ctx.save(); ctx.translate(ix - ir * .05, iy + ir * .45); ctx.rotate(t * .8); ctx.fillStyle = p.sparkle; ctx.beginPath();
      for (let k = 0; k < 4; k++) { ctx.rotate(Math.PI / 2); ctx.lineTo(0, 5.5); ctx.lineTo(1.5, 1.5); } ctx.fill(); ctx.restore();
    });
    ctx.fillStyle = p.eyeLine; ctx.beginPath();
    const N = 14, top = [], bot = [];
    for (let i = 0; i <= N; i++) {
      const a = Math.PI + (i / N) * Math.PI, outer = sd > 0 ? i / N : 1 - i / N;
      const x = ex + 28 * Math.cos(a), y = cy + (ry + 1.5) * Math.sin(a);
      bot.push([x, y]); top.push([x, y - (2.5 + 7 * outer * outer)]);
    }
    top.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    const oc = sd > 0 ? top[N] : top[0];
    ctx.lineTo(oc[0] + sd * 10, oc[1] - 4); ctx.lineTo(oc[0] + sd * 2, oc[1] + 6); ctx.lineTo(oc[0] + sd * 9, oc[1] + 8);
    bot.reverse().forEach(([x, y]) => ctx.lineTo(x, y)); ctx.closePath(); ctx.fill();
    line(() => { ctx.beginPath(); ctx.ellipse(ex, cy - 7, 26, ry + 4, 0, Math.PI * 1.2, Math.PI * 1.7); }, 1.6, `rgba(${p.lid},.8)`);
    line(() => { ctx.beginPath(); ctx.ellipse(ex, cy, 24, ry, 0, sd > 0 ? Math.PI * .08 : Math.PI * .7, sd > 0 ? Math.PI * .32 : Math.PI * .92); }, 2.4, p.eyeLine);
  }

  // nose & mouth
  line(() => { ctx.beginPath(); ctx.moveTo(fx + 3, 46); ctx.lineTo(fx, 52); }, 2.6, p.skinLine);
  const mx = fx, my = 76, m = st.mouth;
  if (e === 'blow' && st.blowing) {
    part(() => { ctx.beginPath(); ctx.ellipse(mx, my, 7, 8, 0, 0, 7); }, '#6b1f2a', null, 3);
  } else if (m > .07) {
    const w = 12 + 9 * m, h = 3 + 19 * m;
    const mo = () => { ctx.beginPath(); ctx.moveTo(mx - w, my - h * .3); ctx.quadraticCurveTo(mx, my - h * .55, mx + w, my - h * .3); ctx.quadraticCurveTo(mx + w * .8, my + h * 1.2, mx, my + h * 1.15); ctx.quadraticCurveTo(mx - w * .8, my + h * 1.2, mx - w, my - h * .3); ctx.closePath(); };
    part(mo, '#6b1f2a', () => {
      fill(() => { ctx.beginPath(); ctx.ellipse(mx, my + h * 1.2, w * .75, h * .6, 0, 0, 7); }, '#ff8f9a');
      if (h > 9) fill(() => { ctx.beginPath(); ctx.rect(mx - w, my - h, w * 2, h * .62); }, '#ffffff');
    }, 3);
    if (who === 'H') fill(() => { ctx.beginPath(); ctx.moveTo(mx + w * .4, my - h * .42); ctx.lineTo(mx + w * .4 + 5, my - h * .42 + 9); ctx.lineTo(mx + w * .4 + 10, my - h * .42); ctx.closePath(); }, '#ffffff');
  } else if (e === 'wink') {
    line(() => { ctx.beginPath(); ctx.moveTo(mx - 13, my - 2); ctx.quadraticCurveTo(mx, my + 9, mx + 13, my - 2); }, 3.2, '#8b3b3b');
    part(() => { ctx.beginPath(); ctx.ellipse(mx + 3, my + 6, 6, 6, 0, 0, Math.PI); ctx.closePath(); }, '#ff8f9a', null, 2);
  } else {
    const mouth = () => {
      ctx.beginPath();
      if (e === 'smug' && who === 'H') { ctx.moveTo(mx - 16, my - 2); ctx.quadraticCurveTo(mx - 8, my + 9, mx, my); ctx.quadraticCurveTo(mx + 8, my + 9, mx + 16, my - 2); }
      else if (e === 'pout') { ctx.moveTo(mx - 10, my + 4); ctx.quadraticCurveTo(mx, my - 5, mx + 10, my + 4); }
      else if (e === 'surprise') { ctx.ellipse(mx, my + 2, 6, 7, 0, 0, 7); }
      else { ctx.moveTo(mx - 13, my - 2); ctx.quadraticCurveTo(mx, my + 9, mx + 13, my - 2); }
    };
    line(mouth, 3.2, '#8b3b3b');
  }

  // ── front hair ────────────────────────────────────────────────────────────────────
  const bangs = () => bangsPath(ctx, fx);
  part(bangs, p.hair, () => {
    fill(() => { ctx.beginPath(); ctx.moveTo(28, -140); ctx.bezierCurveTo(62, -100, 74, -40, 62, 70); ctx.lineTo(170, 70); ctx.lineTo(170, -140); ctx.closePath(); }, p.hairS);
    for (const [x0, y0] of BANG.filter(([, y]) => y < -30)) {
      const x = x0 + fx * .4;
      fill(() => { ctx.beginPath(); ctx.moveTo(x - 4, y0 + 2); ctx.quadraticCurveTo(x * .7, -80, x * .45 - 2, -118); ctx.lineTo(x * .45 + 4, -118); ctx.quadraticCurveTo(x * .7 + 6, -80, x + 5, y0 + 2); ctx.closePath(); }, p.hairS2);
    }
    ctx.beginPath();
    const R = (a, r) => [Math.cos(a) * 76 * r, -82 + Math.sin(a) * 24 * r];
    for (let i = 0; i <= 20; i++) { const a = Math.PI * (1.12 + (i / 20) * .76); ctx.lineTo(...R(a, 1.12)); }
    for (let i = 20; i >= 0; i--) { const a = Math.PI * (1.12 + (i / 20) * .76); ctx.lineTo(...R(a, i % 2 ? .62 : .82)); }
    ctx.closePath(); ctx.fillStyle = p.hairHi; ctx.fill();
  });

  // side locks (long, wavy)
  for (const sd of [-1, 1]) {
    const bx0 = sd * 98, sw = sway * .8;
    const lock = () => {
      ctx.beginPath(); ctx.moveTo(bx0, -30);
      ctx.quadraticCurveTo(bx0 + sd * 26, 40, bx0 + sd * 22, 90);
      waveTo(ctx, bx0 + sd * 22, 90, bx0 + sd * 16 + sw, 290, 4, 10);
      ctx.quadraticCurveTo(bx0 - sd * 4 + sw, 230, bx0 - sd * 14, 160);
      waveTo(ctx, bx0 - sd * 14, 160, bx0 - sd * 22, -10, 3, 7);
      ctx.closePath();
    };
    part(lock, p.hair, () => {
      fill(() => { ctx.beginPath(); ctx.moveTo(bx0 - sd * 30, -20); ctx.bezierCurveTo(bx0 - sd * 16, 70, bx0 - sd * 2 + sw, 190, bx0 + sd * 10 + sw, 300); ctx.lineTo(bx0 - sd * 60, 300); ctx.lineTo(bx0 - sd * 60, -20); ctx.closePath(); }, sd > 0 ? p.hairS2 : p.hairS);
      fill(() => bandPath(ctx, bx0 + sd * 10, 10, bx0 + sd * 14 + sw * .6, 130, 5), p.hairHi);
    });
  }

  // brows
  const by0 = e === 'surprise' ? -38 : -28;
  const inner = e === 'pout' || e === 'determined' ? 8 : e === 'shy' || e === 'sleepy' ? -8 : 0;
  ctx.globalAlpha = st.alpha * .8;
  for (const sd of [-1, 1]) {
    const ex = fx + sd * 41;
    ctx.fillStyle = p.eyeLine; ctx.beginPath(); ctx.moveTo(ex - sd * 19, by0 + inner);
    ctx.quadraticCurveTo(ex, by0 - 8, ex + sd * 21, by0 + 2); ctx.quadraticCurveTo(ex, by0 - 3, ex - sd * 19, by0 + inner + 3); ctx.closePath(); ctx.fill();
  }
  ctx.globalAlpha = st.alpha;

  // ── hair ornaments ────────────────────────────────────────────────────────────────
  if (who === 'K') {
    // blue snowflake + white flower + gold cord + white tassel, on her right side (viewer's left)
    ctx.save(); ctx.translate(-82, -70);
    ctx.save(); ctx.translate(-18, -14); ctx.rotate(.3);
    for (let k = 0; k < 6; k++) { ctx.rotate(Math.PI / 3); part(() => bandPath(ctx, 0, 0, 0, 40, 9), '#8cc4f4', () => fill(() => bandPath(ctx, 3, 0, 3, 40, 3), '#5e98dc'), 2); part(() => bandPath(ctx, 0, 24, 10, 34, 6), '#8cc4f4', null, 1.5); part(() => bandPath(ctx, 0, 24, -10, 34, 6), '#8cc4f4', null, 1.5); }
    ctx.restore();
    for (let k = 0; k < 5; k++) {
      const a = k * 1.2566 - 1.57;
      const petal = () => { ctx.beginPath(); ctx.ellipse(Math.cos(a) * 18, Math.sin(a) * 18, 18, 12, a, 0, 7); };
      part(petal, '#ffffff', () => fill(() => { ctx.beginPath(); ctx.ellipse(Math.cos(a) * 22 + 4, Math.sin(a) * 22 + 5, 12, 8, a, 0, 7); }, '#e4e8f6'), 2.5);
    }
    part(() => { ctx.beginPath(); ctx.arc(0, 0, 8, 0, 7); }, '#f6cf4a', null, 2);
    line(() => { ctx.beginPath(); ctx.moveTo(-6, 18); ctx.quadraticCurveTo(-14, 40, -4, 52); }, 3, p.gold);
    const tas = () => { ctx.beginPath(); ctx.moveTo(-12, 50); ctx.lineTo(4, 50); ctx.lineTo(6 + Math.sin(t * 2) * 3, 104); ctx.lineTo(-14 + Math.sin(t * 2) * 3, 104); ctx.closePath(); };
    part(tas, '#ffffff', () => fill(() => { ctx.beginPath(); ctx.rect(-2, 50, 12, 60); }, '#e6e2d6'), 2);
    part(() => { ctx.beginPath(); ctx.rect(-14, 46, 20, 9); }, p.gold, null, 2);
    ctx.restore();
  } else {
    // two red ribbons with gold bells at the ear bases
    for (const sd of [-1, 1]) {
      ctx.save(); ctx.translate(sd * 88, -64); ctx.scale(sd, 1);
      for (const s2 of [-1, 1]) {
        const lp = () => { ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(s2 * 20, -34, s2 * 52, -26, s2 * 46, 0); ctx.bezierCurveTo(s2 * 52, 24, s2 * 20, 30, 0, 0); ctx.closePath(); };
        part(lp, p.bow, () => { fill(() => { ctx.beginPath(); ctx.ellipse(s2 * 30, 14, 28, 12, 0, 0, 7); }, p.bowS); line(() => { ctx.beginPath(); ctx.moveTo(s2 * 8, -6); ctx.lineTo(s2 * 40, -10); }, 2, p.gold); }, 3);
      }
      for (const s2 of [-1, 1]) part(() => { ctx.beginPath(); ctx.moveTo(s2 * 4, 6); ctx.quadraticCurveTo(s2 * 16, 40, s2 * 10 + Math.sin(t * 2 + s2) * 4, 76); ctx.lineTo(s2 * 24 + Math.sin(t * 2 + s2) * 4, 72); ctx.quadraticCurveTo(s2 * 24, 36, s2 * 10, 2); ctx.closePath(); }, p.bow, null, 2.5);
      part(() => { ctx.beginPath(); ctx.ellipse(0, 0, 10, 11, 0, 0, 7); }, p.bowS, null, 2.5);
      const bell = () => { ctx.beginPath(); ctx.arc(0, 22, 15, 0, 7); };
      part(bell, p.gold, () => { fill(() => { ctx.beginPath(); ctx.arc(6, 28, 13, 0, 7); }, p.goldS); fill(() => { ctx.beginPath(); ctx.arc(-5, 16, 4, 0, 7); }, '#fff6d6'); }, 2.5);
      line(() => { ctx.beginPath(); ctx.moveTo(-9, 26); ctx.lineTo(9, 26); ctx.moveTo(0, 26); ctx.lineTo(0, 35); }, 2.2, '#7a5310');
      ctx.restore();
    }
  }
  ctx.restore();

  // Homura: foxfire wisps orbiting
  if (who === 'H') {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 3; k++) {
      const a = t * 1.3 + (k * Math.PI * 2) / 3, x = st.x + Math.cos(a) * 210 * st.s, y = st.y - 40 * st.s + Math.sin(a) * 70 * st.s;
      wisp(ctx, x, y, 22 * st.s * (1 + .15 * Math.sin(t * 6 + k)), st.alpha * .9, t + k);
    }
    ctx.restore();
  }
}

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
  for (const q of parts) { q.life += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 1 - .6 * dt; q.vy *= 1 - .6 * dt; if (q.spin) q.rot += q.spin * dt; if (q.grow) q.size += q.grow * dt; }
  parts = parts.filter((q) => q.life < q.max);
}
function drawParts(ctx) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const q of parts) {
    const k = q.life / q.max, a = Math.sin(Math.PI * Math.min(1, k * 1.2)) * q.a;
    if (q.kind === 'mist') {
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

// ---------------------------------------------------------------- original-art figures (sprites from Character.jpg)
// Each character is drawn from the approved design sheet: a portrait for close-ups and the sheet's action poses for
// medium/far shots, with Live2D-style motion (breathing, talk bounce, strip-mesh sway of hair/sleeves, lean, mirroring).
// Drop-in upgrade: files listed in DEMO_DATA.art (the ASMR Demo/art/ folder, see production/04) take priority, incl.
// blink / mouth / expression frames for the bust.
const SPRITES = {   // key: [file, facing ('R' | 'L' | 'F'), faceCenter (bust only), faceWidth (bust only)]
  K: { bust: ['K_portrait', 'R', [690, 580], 460], front: ['K_front', 'F'], near: ['K_near', 'R'], side: ['K_side', 'R'],
       run: ['K_run', 'R'], blow: ['K_blow', 'R'], magic: ['K_magic', 'R'], rest: ['K_rest', 'F'] },
  H: { bust: ['H_portrait', 'L', [690, 710], 460], front: ['H_front', 'F'], near: ['H_near', 'R'], appear: ['H_appear', 'R'],
       run: ['H_run', 'R'], blow: ['H_blow', 'R'], magic: ['H_magic', 'R'], hug: ['H_hug', 'R'] },
};
const ART_POSES = { front: 'idle', side: 'walk', run: 'run', blow: 'blow', magic: 'magic', rest: 'rest', appear: 'appear', hug: 'hug', near: 'idle' };
const ART = new Set((D.art || []).map((f) => f.replace(/\.png$/i, '')));
const IMG = {};
const loadImg = (key, src) => { const im = new Image(); im.src = src; IMG[key] = im; };
for (const [who, m] of Object.entries(SPRITES)) for (const [k, [file]] of Object.entries(m)) loadImg(`${who}.${k}`, `media/sprites/${file}.png`);
for (const f of ART) loadImg(`art.${f}`, `art/${f}.png`);
const ok = (key) => IMG[key] && IMG[key].complete && IMG[key].naturalWidth > 0;
const spritesReady = () => ['K.bust', 'H.bust', 'K.front', 'H.front'].every(ok);
const xOf = (az) => W / 2 + Math.sin(rad(clamp(az, -118, 118))) * W * .43 + (Math.abs(az) > 90 ? Math.sign(az) * (Math.abs(az) - 90) * 9 : 0);

function chooseLook(st, t) {
  const who = st.who, c = st.cue;
  let pose;
  if (c && c.kind === 'magic' && c.style !== 'whoosh' && t < c.t + c.dur) pose = 'magic';
  else if (st.running) pose = 'run';
  else if (st.d < .55) pose = 'bust';
  else if (who === 'H' && t >= 49.8 && t < 54) pose = 'appear';
  else if (st.blowing) pose = 'blow';
  else if (who === 'K' && c && c.kind === 'pant') pose = 'rest';
  else if (who === 'H' && c && Math.abs(c.t - 119.4) < .01) pose = 'hug';
  else if (Math.abs(st.vel) > 18) pose = who === 'K' ? 'side' : 'near';
  else pose = st.d < 1.3 ? 'near' : 'front';
  if (!SPRITES[who][pose]) pose = 'near';
  // which image: designer art (art/) first, then the sheet cut-out
  let img = `${who}.${pose}`, facing = SPRITES[who][pose][1], kind = pose === 'bust' ? 'bust' : 'pose';
  if (kind === 'bust') {
    const ear = st.d < .3 && Math.abs(st.az) > 55 && ART.has(`${who}_ear`);
    if (ear) { img = `art.${who}_ear${st.blowing && ART.has(`${who}_ear_blow`) ? '_blow' : ''}`; facing = 'R'; kind = 'ear'; }
    else if (ART.has(`${who}_bust_base`)) { img = `art.${bustFrame(st)}`; facing = 'F'; kind = 'artbust'; }
  } else if (ART.has(`${who}_pose_${ART_POSES[pose]}`)) { img = `art.${who}_pose_${ART_POSES[pose]}`; facing = pose === 'front' || pose === 'near' ? 'F' : 'R'; }
  // face the direction of travel; when still, face the centre of the screen
  const dx = xOf(azAt(who, t + .1)) - xOf(azAt(who, t - .1));
  const want = Math.abs(dx) > 6 ? (dx > 0 ? 'R' : 'L') : (st.x > W / 2 ? 'L' : 'R');
  return { img, kind, pose, flip: facing !== 'F' && facing !== want };
}

function bustFrame(st) {   // pick the designer's bust frame: blink > talking mouth > expression > base
  const w = st.who, has = (s) => ART.has(`${w}_bust_${s}`);
  const exprMap = { shy: 'shy', happy: 'happy', laugh: 'happy', surprise: 'surprise', whisper: 'whisper', sleepy: 'whisper', pout: 'pout', smug: 'smug', blow: 'blow' };
  if (st.blowing && has('blow')) return `${w}_bust_blow`;
  if (st.blink < .5 && has('blink')) return `${w}_bust_blink`;
  if (st.mouth > .45 && has('mouth_open')) return `${w}_bust_mouth_open`;
  if (st.mouth > .15 && has('mouth_half')) return `${w}_bust_mouth_half`;
  const ex = exprMap[st.expr];
  return ex && has(ex) ? `${w}_bust_${ex}` : `${w}_bust_base`;
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
    const [, , [fx, fy], fw] = SPRITES[st.who].bust, k = (230 * st.s) / fw;
    return { k, pivotX: fx, top: -fy * k, mouth: [fx + 30, fy + 90] };
  }
  if (look.kind === 'artbust' || look.kind === 'ear') {   // designer art: face assumed near the upper middle
    const fx = iw * (look.kind === 'ear' ? .55 : .5), fy = ih * (look.kind === 'ear' ? .4 : .3), k = (230 * st.s) / (iw * .42);
    return { k, pivotX: fx, top: -fy * k, mouth: [fx, fy + ih * .07] };
  }
  const h = 780 * st.s * (look.pose === 'rest' ? .82 : 1), k = h / ih;   // full-body pose, head ≈ 26 % from the top
  return { k, pivotX: iw / 2, top: -.26 * h, mouth: [iw * .55, ih * .33] };
}

function drawFigure(st, t) {
  const fs = figState[st.who];
  const look = chooseLook(st, t);
  if (!ok(look.img)) return false;
  const key = look.img + (look.flip ? ':f' : '');
  const jumped = Math.abs(t - fs.lastT) > .5;
  if (!fs.cur || jumped) { fs.cur = { look, key }; fs.prev = null; fs.since = -9; }
  else if (key !== fs.cur.key) { fs.prev = fs.cur; fs.cur = { look, key }; fs.since = t; }
  fs.lastT = t;
  const fade = clamp((t - fs.since) / .22, 0, 1);

  // aura behind the figure
  const p = PAL[st.who];
  const g = ctx.createRadialGradient(st.x, st.y + 60 * st.s, 30 * st.s, st.x, st.y + 60 * st.s, 380 * st.s);
  g.addColorStop(0, `rgba(${p.glow},${.22 * st.alpha})`); g.addColorStop(1, `rgba(${p.glow},0)`);
  ctx.fillStyle = g; ctx.fillRect(st.x - 400 * st.s, st.y - 340 * st.s, 800 * st.s, 800 * st.s);

  const breath = .012 * Math.sin((t / 3.4) * Math.PI * 2 + (st.who === 'K' ? 0 : 1.7));
  const talk = st.mouth * 8 * st.s;
  const sway = (Math.sin(t * 1.7 + (st.who === 'K' ? 0 : 1.3)) * 10 - clamp(st.vel * .35, -40, 40)) * st.s;
  for (const [layer, a] of [[fs.prev, 1 - fade], [fs.cur, fade < 1 && fs.prev ? fade : 1]]) {
    if (!layer || a <= .01) continue;
    const lk = layer.look, img = IMG[lk.img], L = layout(lk, st);
    const pivotY = st.y - talk;                       // head centre
    drawWarped(img, st.x, L.pivotX, pivotY, L.top, L.k, lk.flip, st.alpha * a, st.rot * .6, sway, breath + st.mouth * .01);
    if (layer === fs.cur) {
      const mx = (L.mouth[0] - L.pivotX) * L.k * (lk.flip ? -1 : 1);
      st.mx = st.x + mx; st.my = pivotY + L.top + L.mouth[1] * L.k;
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
    who, az, d, vel, alpha, s, near, cue, expr, blowing, running, t,
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
    const n = Math.ceil(dt * 90);
    for (let i = 0; i < n; i++) {
      const sp = 300 + Math.random() * 260;
      if (st.who === 'K') {
        spawn({ kind: 'mist', x: mx, y: my, vx: (dir * .9 + (Math.random() - .5) * .5) * sp, vy: (Math.random() - .2) * 120, size: 18 * st.s, grow: 140 * st.s, life: 0, max: 1.6, a: .9 });
        if (Math.random() < .5) spawn({ kind: 'spark', x: mx, y: my, vx: (dir + (Math.random() - .5) * .8) * sp * 1.2, vy: (Math.random() - .5) * 160, size: 8 + Math.random() * 10, rot: Math.random() * 3, spin: 3, life: 0, max: 1.2, a: 1 });
      } else {
        spawn({ kind: 'warm', x: mx, y: my, vx: (dir * .9 + (Math.random() - .5) * .5) * sp, vy: -40 - Math.random() * 120, size: 20 * st.s, grow: 120 * st.s, life: 0, max: 1.5, a: .9 });
        if (Math.random() < .6) spawn({ kind: 'ember', x: mx, y: my, vx: (dir + (Math.random() - .5)) * sp, vy: -100 - Math.random() * 200, size: 2 + Math.random() * 4, life: 0, max: 1.3, a: 1 });
      }
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
  states.sort((a, b) => b.d - a.d).forEach((st) => { if (st.alpha > .01 && !(spritesReady() && drawFigure(st, t))) drawChar(ctx, st.who, st); emit(st, t, dt); });
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

// final film
$('filmFile').addEventListener('change', () => {
  const f = $('filmFile').files[0]; if (!f) return;
  const t = now(); mix.pause();
  if (film.src) URL.revokeObjectURL(film.src);
  film.src = URL.createObjectURL(f); film.hidden = false; media = film;
  film.addEventListener('loadedmetadata', () => { film.currentTime = Math.min(t, film.duration || t); }, { once: true });
  $('filmState').textContent = f.name; $('filmClear').hidden = false;
});
$('filmClear').addEventListener('click', () => {
  const t = now(); film.pause(); film.hidden = true; media = mix; mix.currentTime = t;
  $('filmState').textContent = 'animatic'; $('filmClear').hidden = true;
});

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
  ? `Voices: ${A.voice.credits.join(' / ')} · cel-shaded animatic (final film pending)`
  : 'Draft build: cel-shaded animatic + synthesized voice (macOS Kyoko). Replace with the final film and voices.';

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
  const playing = (!media.paused && !media.ended) || previewT != null;
  const { states, th } = frame(t, playing ? dt : 0);
  drawRadar(states, playing ? th : { Lc: 0, Lh: 0, Rc: 0, Rh: 0 });
  updateOutput(th, playing);
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
  await Promise.all(Object.values(IMG).map((im) => im.decode().catch(() => {})));
  const fps = 30, n = Math.round(A.duration * fps);
  parts = [];
  for (let i = 0; i < n; i++) {
    const t = i / fps;
    frame(t, 1 / fps);
    let si = -1; A.scenes.forEach((s, k) => { if (t >= s.t) si = k; });
    const st = A.scenes[si], age = t - st.t;
    if (age < 3.4) {
      ctx.globalAlpha = clamp(Math.min(age / .5, (3.4 - age) / .6), 0, 1);
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
