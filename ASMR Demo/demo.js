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

// ---------------------------------------------------------------- palettes
const PAL = {
  K: { hair: '#eef4fc', shade: '#b8cbe7', line: '#7389ae', ring: '#ffffff', eye1: '#b9e6ff', eye2: '#2a6fc0', lash: '#2f3f60',
       kimono: '#d3eaff', kshade: '#98c2ea', trim: '#ffffff', obi: '#3d5c99', obiTrim: '#cfe6ff', skin: '#fff3ec', blush: '255,150,170', glow: '120,200,255' },
  H: { hair: '#ff8648', shade: '#d24f25', line: '#8a2c10', ring: '#ffd0a8', eye1: '#ffe08a', eye2: '#c7650e', lash: '#4f1d0b',
       kimono: '#dc3f2b', kshade: '#9e2618', trim: '#f6c453', obi: '#2a1715', obiTrim: '#f6c453', skin: '#fff0e6', blush: '255,120,110', glow: '255,140,60' },
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

function drawChar(ctx, who, st) {
  const p = PAL[who], t = st.t, sway = st.sway, turn = st.turn, e = st.expr;
  ctx.save();
  ctx.globalAlpha = st.alpha;
  ctx.translate(st.x, st.y);
  ctx.rotate(st.rot);
  ctx.scale(st.s, st.s);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';

  // aura
  let g = ctx.createRadialGradient(0, 40, 40, 0, 40, 330);
  g.addColorStop(0, `rgba(${p.glow},.22)`); g.addColorStop(1, `rgba(${p.glow},0)`);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 40, 330, 0, 7); ctx.fill();

  // Homura: tail behind the body
  if (who === 'H') {
    const tw = Math.sin(t * 2.4) * 30 + sway * 2;
    ctx.save(); ctx.translate(120, 420); ctx.rotate(-.5 + Math.sin(t * 2.4) * .12);
    g = ctx.createLinearGradient(0, 0, 260, -260); g.addColorStop(0, p.shade); g.addColorStop(.7, p.hair); g.addColorStop(.86, '#ffe7cf'); g.addColorStop(1, '#fff');
    ctx.fillStyle = g; ctx.strokeStyle = p.line; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.bezierCurveTo(60, -40, 120 + tw, -60, 210 + tw, -250);
    ctx.bezierCurveTo(260 + tw, -330, 330 + tw, -200, 280 + tw, -120);
    ctx.bezierCurveTo(230 + tw, -20, 120, 60, 10, 50);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  // back hair
  g = ctx.createLinearGradient(0, -130, 0, 440); g.addColorStop(0, p.hair); g.addColorStop(1, p.shade);
  ctx.fillStyle = g; ctx.strokeStyle = p.line; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(-100, -40);
  ctx.bezierCurveTo(-150, 60, -168, 250, -142 + sway, 430);
  const tips = who === 'K' ? 7 : 9;
  for (let i = 1; i <= tips; i++) {
    const x = -142 + (284 * i) / tips + sway, y = i % 2 ? 452 : 420;
    if (who === 'K') ctx.quadraticCurveTo(x - 284 / tips / 2, 450, x, y - 10); else ctx.lineTo(x, y + (i % 2 ? 14 : -6));
  }
  ctx.bezierCurveTo(168, 250, 150, 60, 100, -40);
  ctx.bezierCurveTo(96, -140, -96, -140, -100, -40);
  ctx.fill(); ctx.stroke();

  // fox ears
  if (who === 'H') {
    for (const sd of [-1, 1]) {
      ctx.save(); ctx.translate(sd * 62, -88); ctx.rotate(sd * (.25 + Math.max(0, Math.sin(t * 3 + sd)) * .08));
      ctx.fillStyle = p.hair; ctx.strokeStyle = p.line; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(-34, 10); ctx.lineTo(0, -100); ctx.lineTo(34, 10); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffe3c8'; ctx.beginPath(); ctx.moveTo(-18, 4); ctx.lineTo(0, -72); ctx.lineTo(18, 4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#5a2410'; ctx.beginPath(); ctx.moveTo(-9, -70); ctx.lineTo(0, -100); ctx.lineTo(9, -70); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }

  // body: kimono
  ctx.fillStyle = p.skin; ctx.fillRect(-22, 60, 44, 80);
  g = ctx.createLinearGradient(-210, 0, 210, 0); g.addColorStop(0, p.kshade); g.addColorStop(.3, p.kimono); g.addColorStop(.7, p.kimono); g.addColorStop(1, p.kshade);
  ctx.fillStyle = g; ctx.strokeStyle = p.line; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(-55, 118); ctx.quadraticCurveTo(-130, 128, -165, 178); ctx.bezierCurveTo(-190, 420, -200, 700, -250, 900);
  ctx.quadraticCurveTo(0, 930, 250, 900); ctx.bezierCurveTo(200, 700, 190, 420, 165, 178); ctx.quadraticCurveTo(130, 128, 55, 118); ctx.closePath(); ctx.fill(); ctx.stroke();
  // hanging furisode sleeves
  for (const sd of [-1, 1]) {
    const sw = Math.sin(t * 1.4 + sd) * 6 + sway * .3;
    g = ctx.createLinearGradient(sd * 160, 0, sd * 290, 0); g.addColorStop(0, p.kimono); g.addColorStop(1, p.kshade);
    ctx.fillStyle = g; ctx.strokeStyle = p.line; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(sd * 150, 175); ctx.quadraticCurveTo(sd * 250, 200, sd * 270 + sw, 300);
    ctx.lineTo(sd * 285 + sw, 600); ctx.quadraticCurveTo(sd * 280 + sw, 650, sd * 225 + sw, 650); ctx.lineTo(sd * 175, 640);
    ctx.quadraticCurveTo(sd * 190, 400, sd * 150, 175); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = p.trim; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(sd * 285 + sw, 600); ctx.quadraticCurveTo(sd * 280 + sw, 650, sd * 225 + sw, 650); ctx.lineTo(sd * 175, 640); ctx.stroke();
  }
  // collar (left over right)
  ctx.lineWidth = 24; ctx.strokeStyle = '#fffaf2';
  ctx.beginPath(); ctx.moveTo(-50, 112); ctx.lineTo(18, 300); ctx.moveTo(50, 112); ctx.lineTo(-6, 270); ctx.stroke();
  ctx.lineWidth = 12; ctx.strokeStyle = p.trim;
  ctx.beginPath(); ctx.moveTo(-64, 118); ctx.lineTo(10, 320); ctx.moveTo(64, 118); ctx.lineTo(4, 280); ctx.stroke();
  // obi
  ctx.fillStyle = p.obi; ctx.fillRect(-200, 340, 400, 86);
  ctx.strokeStyle = p.obiTrim; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-200, 362); ctx.lineTo(200, 362); ctx.moveTo(-200, 404); ctx.lineTo(200, 404); ctx.stroke();
  ctx.fillStyle = p.obiTrim; ctx.beginPath(); ctx.arc(0, 383, 12, 0, 7); ctx.fill();
  // patterns
  if (who === 'K') {
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 3;
    for (const [x, y, r] of [[-120, 470, 16], [90, 520, 20], [-60, 590, 13], [140, 610, 15], [-150, 250, 12], [130, 270, 14], [-100, 760, 18], [60, 700, 14], [150, 820, 16], [-30, 850, 12]]) {
      for (let k = 0; k < 3; k++) { const a = (k * Math.PI) / 3; ctx.beginPath(); ctx.moveTo(x - Math.cos(a) * r, y - Math.sin(a) * r); ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); ctx.stroke(); }
    }
    // fluffy fur collar
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#c5d6ee'; ctx.lineWidth = 3;
    for (let i = 0; i <= 12; i++) {
      const a = Math.PI * (1.08 - i / 12 * 1.16), x = Math.cos(a) * 150, y = 150 + Math.sin(a) * -40 + (i % 2) * 6;
      ctx.beginPath(); ctx.arc(x, y + 18, 30, 0, 7); ctx.fill(); ctx.stroke();
    }
  } else {
    ctx.fillStyle = 'rgba(246,196,83,.85)';
    for (const [x, y, s] of [[-140, 800, 1.3], [-80, 840, .9], [120, 780, 1.1], [170, 850, .8], [40, 860, .8], [-170, 620, .7]]) {
      ctx.beginPath(); ctx.moveTo(x, y + 30 * s); ctx.quadraticCurveTo(x - 26 * s, y, x, y - 50 * s); ctx.quadraticCurveTo(x + 8 * s, y - 14 * s, x + 20 * s, y - 20 * s); ctx.quadraticCurveTo(x + 24 * s, y + 10 * s, x, y + 30 * s); ctx.fill();
    }
    ctx.strokeStyle = p.trim; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(-60, 860); ctx.quadraticCurveTo(0, 875, 60, 860); ctx.stroke();
  }

  // face
  ctx.fillStyle = p.skin; ctx.strokeStyle = '#d9a894'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-96, -20); ctx.bezierCurveTo(-98, 58, -48, 104, turn * 6, 113); ctx.bezierCurveTo(48, 104, 98, 58, 96, -20); ctx.bezierCurveTo(96, -122, -96, -122, -96, -20); ctx.fill(); ctx.stroke();
  const fx = turn * 18;
  // blush
  const blush = e === 'shy' || e === 'pout' ? .55 : e === 'whisper' || e === 'sleepy' ? .4 : .22;
  for (const sd of [-1, 1]) {
    g = ctx.createRadialGradient(fx + sd * 60, 56, 2, fx + sd * 60, 56, 30);
    g.addColorStop(0, `rgba(${p.blush},${blush})`); g.addColorStop(1, `rgba(${p.blush},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(fx + sd * 60, 56, 32, 20, 0, 0, 7); ctx.fill();
    if (blush > .4) { ctx.strokeStyle = `rgba(${p.blush},.7)`; ctx.lineWidth = 2; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(fx + sd * 60 - 14 + k * 10, 62); ctx.lineTo(fx + sd * 60 - 8 + k * 10, 50); ctx.stroke(); } }
  }

  // eyes
  const closedHappy = e === 'happy' || e === 'laugh';
  let open = st.blink * (e === 'surprise' ? 1.12 : e === 'whisper' || e === 'blow' ? .62 : e === 'sleepy' ? .42 : e === 'smug' ? .7 : e === 'pant' ? .55 : 1);
  for (const sd of [-1, 1]) {
    const ex = fx + sd * 41, ey = 16;
    if (closedHappy) {
      ctx.strokeStyle = p.lash; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(ex - 22, ey + 8); ctx.quadraticCurveTo(ex, ey - 18, ex + 22, ey + 8); ctx.stroke();
      continue;
    }
    if (open < .12) {
      ctx.strokeStyle = p.lash; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(ex - 24, ey + 6); ctx.quadraticCurveTo(ex, ey + 16, ex + 24, ey + 6); ctx.stroke();
      continue;
    }
    const ry = 31 * open, cy = ey + (1 - open) * 14;
    ctx.save();
    ctx.beginPath(); ctx.ellipse(ex, cy, 25, ry, 0, 0, 7); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.clip();
    const ir = e === 'surprise' ? 17 : 21, gx = turn * 6, gy = 4;
    g = ctx.createLinearGradient(0, ey - 22, 0, ey + 26); g.addColorStop(0, p.eye2); g.addColorStop(1, p.eye1);
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(ex + gx, ey + gy, ir, ir * 1.18, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(10,15,35,.85)'; ctx.beginPath(); ctx.ellipse(ex + gx, ey + gy + 2, ir * .45, ir * .6, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex + gx - 8, ey + gy - 10, 7, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(ex + gx + 8, ey + gy + 10, 3.5, 0, 7); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = p.lash; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.ellipse(ex, cy, 26, ry + 1, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
    ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(ex + sd * 24, cy - ry * .55); ctx.lineTo(ex + sd * 34, cy - ry * .85); ctx.stroke();
    ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(ex, cy, 22, ry, 0, Math.PI * .25, Math.PI * .75); ctx.stroke();
  }

  // nose & mouth
  ctx.strokeStyle = '#d79a86'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(fx + 2, 46); ctx.lineTo(fx - 1, 52); ctx.stroke();
  const mx = fx, my = 74, m = st.mouth;
  ctx.lineWidth = 4; ctx.strokeStyle = '#8b3b3b';
  if (e === 'blow' && st.blowing) {
    ctx.fillStyle = '#7a2a2a'; ctx.beginPath(); ctx.ellipse(mx, my, 7, 8, 0, 0, 7); ctx.fill(); ctx.stroke();
  } else if (m > .07) {
    const w = 12 + 9 * m, h = 3 + 19 * m;
    ctx.fillStyle = '#7a2a2a'; ctx.beginPath(); ctx.ellipse(mx, my + h * .3, w, h, 0, 0, 7); ctx.fill();
    ctx.save(); ctx.clip(); ctx.fillStyle = '#ff8f9a'; ctx.beginPath(); ctx.ellipse(mx, my + h * 1.1, w * .8, h * .6, 0, 0, 7); ctx.fill(); ctx.restore();
    ctx.stroke();
    if (who === 'H') { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(mx + w * .45, my - h * .62); ctx.lineTo(mx + w * .45 + 5, my - h * .62 + 8); ctx.lineTo(mx + w * .45 + 10, my - h * .62); ctx.fill(); }
  } else if (e === 'smug' && who === 'H') {
    ctx.beginPath(); ctx.moveTo(mx - 16, my - 2); ctx.quadraticCurveTo(mx - 8, my + 8, mx, my); ctx.quadraticCurveTo(mx + 8, my + 8, mx + 16, my - 2); ctx.stroke();
  } else if (e === 'pout') {
    ctx.beginPath(); ctx.moveTo(mx - 10, my + 4); ctx.quadraticCurveTo(mx, my - 4, mx + 10, my + 4); ctx.stroke();
  } else if (e === 'surprise') {
    ctx.beginPath(); ctx.ellipse(mx, my + 2, 6, 7, 0, 0, 7); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(mx - 13, my - 2); ctx.quadraticCurveTo(mx, my + 9, mx + 13, my - 2); ctx.stroke();
  }

  // front hair (bangs)
  g = ctx.createLinearGradient(0, -130, 0, 40); g.addColorStop(0, p.hair); g.addColorStop(1, p.shade);
  ctx.fillStyle = g; ctx.strokeStyle = p.line; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(-106, 40);
  ctx.bezierCurveTo(-116, -92, -60, -132, 0, -132); ctx.bezierCurveTo(60, -132, 116, -92, 106, 40);
  const bang = [[96, 2], [82, -38], [66, -2], [48, -42], [30, -6], [12, -46], [-6, -8], [-24, -44], [-42, -4], [-60, -40], [-78, 0], [-92, -36], [-106, 40]];
  let px = 106, py = 40;
  for (const [x0, y0] of bang) {
    const x = x0 + fx * .4, y = y0;
    ctx.quadraticCurveTo((px + x) / 2 + 3, (py + y) / 2 - 4, x, y); px = x; py = y;
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // angel ring highlight
  ctx.strokeStyle = p.ring; ctx.globalAlpha = st.alpha * .6; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.ellipse(0, -80, 72, 22, 0, Math.PI * 1.12, Math.PI * 1.88); ctx.stroke(); ctx.globalAlpha = st.alpha;
  // side locks
  for (const sd of [-1, 1]) {
    ctx.fillStyle = g; ctx.strokeStyle = p.line; ctx.lineWidth = 4;
    const bx = sd * 98, sw = sway * .8;
    ctx.beginPath(); ctx.moveTo(bx, -30);
    ctx.bezierCurveTo(bx + sd * 26, 60, bx + sd * 20 + sw, 160, bx + sd * 14 + sw, 250);
    ctx.bezierCurveTo(bx - sd * 12 + sw, 180, bx - sd * 30, 70, bx - sd * 22, -10);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  // brows (drawn over the bangs, slightly transparent)
  const by = e === 'surprise' ? -38 : -28;
  const inner = e === 'pout' || e === 'determined' ? 8 : e === 'shy' || e === 'sleepy' ? -8 : 0;
  ctx.strokeStyle = p.lash; ctx.globalAlpha = st.alpha * .75; ctx.lineWidth = 4;
  for (const sd of [-1, 1]) { const ex = fx + sd * 41; ctx.beginPath(); ctx.moveTo(ex - sd * 18, by + inner); ctx.quadraticCurveTo(ex, by - 6, ex + sd * 20, by + 2); ctx.stroke(); }
  ctx.globalAlpha = st.alpha;

  // ornaments
  if (who === 'K') {
    ctx.save(); ctx.translate(74, -74); ctx.rotate(t * .3); ctx.strokeStyle = '#7fd0ff'; ctx.lineWidth = 5;
    for (let k = 0; k < 6; k++) { ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 22); ctx.moveTo(0, 13); ctx.lineTo(6, 19); ctx.moveTo(0, 13); ctx.lineTo(-6, 19); ctx.stroke(); }
    ctx.restore();
  } else {
    ctx.strokeStyle = '#c2261c'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-78, -62); ctx.quadraticCurveTo(-92, -20 + Math.sin(t * 3) * 6, -86, 6); ctx.stroke();
    ctx.fillStyle = '#f6c453'; ctx.strokeStyle = '#9a6b12'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(-86, 14, 11, 0, 7); ctx.fill(); ctx.stroke();
  }
  ctx.restore();

  // Homura: foxfire wisps orbiting
  if (who === 'H') {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 3; k++) {
      const a = t * 1.3 + (k * Math.PI * 2) / 3, x = st.x + Math.cos(a) * 200 * st.s, y = st.y - 40 * st.s + Math.sin(a) * 70 * st.s;
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
  const mx = st.x + st.turn * 18 * st.s, my = st.y + 76 * st.s;
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
    g.addColorStop(0, `rgba(${col},${.62 * v})`); g.addColorStop(1, `rgba(${col},0)`);
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
  states.sort((a, b) => b.d - a.d).forEach((st) => { if (st.alpha > .01) drawChar(ctx, st.who, st); emit(st, t, dt); });
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
