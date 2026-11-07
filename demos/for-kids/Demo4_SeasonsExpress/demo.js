// The Runaway Seasons Express (MoHeat Evo Demo 4). Built on Demo 3's player.
// Clock = the binaural mix. The car never changes; behind its two window masks the seasons scroll past (parallax
// far / mid / near), with glass layers (frost, rain, sun haze, fog) and weather particles. Every visual event comes
// from the same timeline as the sound and the 4-channel thermal track (scripts/seasons.py → media/data.js).
'use strict';

const W = 1920, H = 1080;
const D = window.DEMO_DATA, A = D.anim, G = D.geo;
// authored (brief) time → film time, same remap as seasons.tw() (winter shortened to 12 s)
const TW = (x) => { const o = A.warp.old, n = A.warp.new; for (let i = 1; i < o.length; i++) if (x <= o[i]) return n[i - 1] + (x - o[i - 1]) * (n[i] - n[i - 1]) / (o[i] - o[i - 1]); return n[n.length - 1]; };
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const rad = (d) => (d * Math.PI) / 180;
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const hash = (n) => { const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };

// ---------------------------------------------------------------- data
const parseCsv = (txt) => {
  const lines = txt.trim().split('\n'), head = lines[0].split(',');
  const cols = Object.fromEntries(head.map((h) => [h, []]));
  for (const l of lines.slice(1)) l.split(',').forEach((v, i) => cols[head[i]].push(head[i] === 'command' ? v : +v));
  return { rate: 20, Lc: cols.L_cool, Rc: cols.R_cool, Lh: cols.L_heat, Rh: cols.R_heat };
};
const TH = parseCsv(D.thermalCsv);
const sample = (arr, rate, t) => {
  const x = clamp(t * rate, 0, arr.length - 1), i = Math.floor(x), f = x - i;
  return i + 1 < arr.length ? arr[i] * (1 - f) + arr[i + 1] * f : arr[i];
};
const thermalAt = (t) => ({ Lc: sample(TH.Lc, TH.rate, t), Rc: sample(TH.Rc, TH.rate, t), Lh: sample(TH.Lh, TH.rate, t), Rh: sample(TH.Rh, TH.rate, t) });
const segAt = (t) => A.segments.find((s) => t >= s.t0 && t < s.t1) || A.segments[A.segments.length - 1];
const inSilence = (t) => t >= A.silence[0] && t < A.silence[1];

// train speed (same law as build_audio.py: faster in the chaos, brakes into the station 139–146 s) and its integral
const speed = (t) => Math.pow(clamp((146 - t) / 7, 0, 1), 1.3) * (1 + (t > TW(95) && t < TW(125) ? .25 : 0) + (t < TW(20) ? .2 : 0));
const POS = (() => { const r = 100, n = Math.ceil(A.duration * r) + 2, p = new Float64Array(n); for (let i = 1; i < n; i++) p[i] = p[i - 1] + speed((i - .5) / r) / r; return p; })();
const posAt = (t) => sample(POS, 100, clamp(t, 0, A.duration));
// clock: one gentle hour over the film, spinning forward in the chaos, backwards after the blackout, frozen in the dark
const clockRate = (t) => (t >= TW(95) && t < TW(110) ? 40 : t >= TW(110) && t < TW(114) ? 0 : t >= TW(114) && t < TW(122) ? -36 : .4);
const CLK = (() => { const r = 50, n = Math.ceil(A.duration * r) + 2, p = new Float64Array(n); for (let i = 1; i < n; i++) p[i] = p[i - 1] + clockRate((i - .5) / r) / r; return p; })();
const clockMin = (t) => 9 * 60 + sample(CLK, 50, clamp(t, 0, A.duration));

// ---------------------------------------------------------------- art
const IMG = {};
for (const f of D.art) { const im = new Image(); im.src = `media/art/${f}.webp`; IMG[f] = im; }
const ok = (k) => IMG[k] && IMG[k].complete && IMG[k].naturalWidth > 0;
// interior 1536×1024 → canvas (cover-fit, crop 100 px top and bottom)
const IS = W / 1536, IOY = -100;
const P = ([x, y]) => [x * IS, y * IS + IOY];
const GLASS = { L: G.left_glass.map(P), R: G.right_glass.map(P) };
const BOX = Object.fromEntries(Object.entries(GLASS).map(([k, pts]) => {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  return [k, { x0: Math.max(0, Math.min(...xs)), y0: Math.max(0, Math.min(...ys)), x1: Math.min(W, Math.max(...xs)), y1: Math.min(H, Math.max(...ys)) }];   // visible part
}));
const DOOR = G.door_glass.map(P);
const EYE = G.vanishing_point[1] * IS + IOY;   // eye level on the canvas: the scenery horizon sits here
const CLOCK = { x: G.clock.cx * IS, y: G.clock.cy * IS + IOY, r: G.clock.r * IS };

// ---------------------------------------------------------------- window "looks"
const V = 660;   // px/s of the near layer at full speed (far 0.12×, mid 0.45×, near 1.2×)
const L3 = (s, far = `${s}_far`) => [[far, .12], [`${s}_mid`, .45], [`${s}_near`, 1.2]];
const LOOKS = {
  winter: { layers: L3('winter'), glass: [['frost_corner', .85]], wx: 'snow', tint: '170,210,255' },
  winter_thaw: { layers: L3('winter'), glass: [['frost_overlay', (t) => .9 * smooth((31 - t) / 10)], ['frost_corner', (t) => .8 * smooth((34 - t) / 8)]], wx: 'snow_light', tint: '190,220,255' },
  summer: { layers: L3('summer'), glass: [['heat_haze_overlay', (t) => .55 + .2 * Math.sin(t * 1.3)]], wx: 'sun', tint: '255,220,150' },
  storm: { layers: L3('rainforest', 'rainforest_storm_far'), glass: [['raindrops_overlay', .95, 'drip']], wx: 'rain', tint: '120,140,200' },
  rainforest_sun: { layers: L3('rainforest'), glass: [['heat_haze_overlay', .5]], wx: 'sun', tint: '255,230,160' },
  after_rain: { layers: L3('rainforest'), glass: [['raindrops_overlay', .55, 'drip']], wx: null, tint: '220,240,220' },
  ice: { layers: [['tunnel_ice_wall', 1.5]], glass: [['frost_corner', .7]], wx: 'ice', tint: '120,200,255' },
  lava: { layers: [['tunnel_lava_wall', 1.5]], glass: [], wx: 'embers', tint: '255,130,60' },
  steam: { layers: [['tunnel_lava_wall', 1.5]], glass: [['fog_overlay', .9, 'drift']], wx: 'embers', tint: '255,220,210' },
  tunnel_dark: { layers: [], glass: [], wx: 'tunnel_lights', tint: null, fill: '#17141f' },
  dark: { layers: [['night_aurora_far', .15]], glass: [], wx: 'stars', tint: '150,180,255', fill: '#24317e' },   // power cut: lamps off, a bright aurora night streams past (never black)
  spring: { layers: L3('spring'), glass: [], wx: 'petals', tint: '255,205,225' },
};
const CHAOS_LOOK = { winter: 'winter', summer: 'summer', lava: 'lava', ice: 'ice', storm: 'storm', steam: 'steam', spring: 'spring', dark: 'dark' };
// per-side list of [t, look, fade seconds]
const TRACK = { L: [[0, 'winter', 0], [20, 'winter_thaw', 0], [45, 'storm', 2.5], [63, 'after_rain', 3], [70, 'ice', .7], [80, 'tunnel_dark', .6], [83, 'lava', .6]],
                R: [[0, 'winter', 0], [20, 'summer', 2.0], [45, 'rainforest_sun', 2.5], [57, 'storm', 4], [70, 'lava', .7], [80, 'tunnel_dark', .6], [83, 'ice', .6]] };
for (const s of ['L', 'R']) TRACK[s] = TRACK[s].map(([t, k, f]) => [TW(t), k, f]);   // authored on the brief grid
for (const c of A.chaos) { TRACK.L.push([c.t0, CHAOS_LOOK[c.left], c.t0 === A.chaos[0].t0 ? .6 : .22]); TRACK.R.push([c.t0, CHAOS_LOOK[c.right], c.t0 === A.chaos[0].t0 ? .6 : .22]); }
for (const s of ['L', 'R']) { TRACK[s].push([TW(125), 'spring', 2]); TRACK[s].sort((a, b) => a[0] - b[0]); }
function lookAt(side, t) {
  const tr = TRACK[side]; let i = 0;
  for (let k = 0; k < tr.length; k++) if (tr[k][0] <= t) i = k;
  const [t0, key, fade] = tr[i], a = fade > 0 ? smooth((t - t0) / fade) : 1;
  return { cur: key, prev: i > 0 && a < 1 ? tr[i - 1][1] : null, a };
}
const evalA = (v, t) => (typeof v === 'function' ? v(t) : v);

function drawLayer(c, name, box, f, dir, t, k, top) {
  if (!ok(name)) return;
  const lw = 1536 * k, lh = 1024 * k, shift = dir * posAt(t) * V * f;
  // mirror tiling: every other copy is flipped, so the edges always meet pixel-for-pixel (no seam, no cross-fade ghosting)
  for (let i = Math.floor((box.x0 - shift) / lw) - 1, x = shift + i * lw; x < box.x1 + lw; i++, x = shift + i * lw) {
    if (x + lw < box.x0 - 2) continue;
    if (i % 2 === 0) c.drawImage(IMG[name], Math.round(x), top, Math.ceil(lw) + 1, lh);
    else { c.save(); c.translate(Math.round(x + lw), top); c.scale(-1, 1); c.drawImage(IMG[name], 0, 0, Math.ceil(lw) + 1, lh); c.restore(); }
  }
}
function drawWeather(c, kind, box, t, dir, alpha) {
  if (!kind) return;
  const bw = box.x1 - box.x0, bh = box.y1 - box.y0, sp = posAt(t) * V;
  c.save(); c.globalAlpha = alpha;
  if (kind === 'snow' || kind === 'snow_light') {
    const n = kind === 'snow' ? 90 : 35; c.fillStyle = '#fff';
    for (let i = 0; i < n; i++) {
      const r = 1.5 + hash(i) * 3.5, x = box.x0 + (((hash(i + 3) * bw + dir * sp * (.3 + r * .12)) % bw) + bw) % bw;
      const y = box.y0 + ((hash(i + 9) * bh + t * (40 + r * 18)) % bh);
      c.globalAlpha = alpha * (.5 + hash(i + 5) * .5); c.beginPath(); c.arc(x + Math.sin(t * 2 + i) * 6, y, r, 0, 7); c.fill();
    }
  } else if (kind === 'rain') {
    c.strokeStyle = 'rgba(225,235,255,.55)'; c.lineWidth = 2;
    for (let i = 0; i < 120; i++) {
      const x = box.x0 + (((hash(i) * bw + dir * sp * .9 + t * 60 * dir) % bw) + bw) % bw, y = box.y0 + ((hash(i + 7) * bh + t * 900) % bh), L = 22 + hash(i + 2) * 30;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x - dir * L * .35, y + L); c.stroke();
    }
  } else if (kind === 'ice') {
    for (let i = 0; i < 40; i++) {
      const x = box.x0 + (((hash(i) * bw + dir * sp * 1.6) % bw) + bw) % bw, y = box.y0 + hash(i + 4) * bh, tw = .5 + .5 * Math.sin(t * 6 + i);
      c.fillStyle = `rgba(230,250,255,${.8 * tw})`; c.beginPath(); c.arc(x, y, 2 + 2 * tw, 0, 7); c.fill();
    }
  } else if (kind === 'embers') {
    for (let i = 0; i < 45; i++) {
      const x = box.x0 + (((hash(i) * bw + dir * sp * 1.4 + Math.sin(t + i) * 20) % bw) + bw) % bw, y = box.y1 - ((hash(i + 6) * bh + t * (60 + hash(i) * 80)) % bh);
      c.fillStyle = `rgba(255,${170 + hash(i) * 70 | 0},90,${.85 * (.4 + .6 * hash(i + 1))})`; c.beginPath(); c.arc(x, y, 2 + hash(i + 2) * 3, 0, 7); c.fill();
    }
  } else if (kind === 'sun') {
    if (ok('fx_sun_glare')) { c.globalCompositeOperation = 'screen'; c.globalAlpha = alpha * (.22 + .05 * Math.sin(t * 2)); const s = bh * 1.1; c.drawImage(IMG.fx_sun_glare, box.x1 - s * .75, box.y0 - s * .35, s, s); }
  } else if (kind === 'petals') {
    for (let i = 0; i < 30; i++) {
      if (!ok('fx_sakura_petal')) break;
      const x = box.x0 + (((hash(i) * bw + dir * sp * .7 + t * 30) % bw) + bw) % bw, y = box.y0 + ((hash(i + 3) * bh + t * (30 + hash(i) * 30)) % bh), s = 14 + hash(i + 8) * 14;
      c.save(); c.translate(x, y); c.rotate(t * (1 + hash(i)) + i); c.drawImage(IMG.fx_sakura_petal, -s / 2, -s / 2, s, s); c.restore();
    }
  } else if (kind === 'stars') {
    const painted = ok('night_aurora_far');                                   // the painted aurora layer is already drawn underneath
    if (!painted) { const g = c.createLinearGradient(0, box.y0, 0, box.y1); g.addColorStop(0, '#2b3f9e'); g.addColorStop(.6, '#5a4aa8'); g.addColorStop(1, '#8a6ab8');
      c.fillStyle = g; c.fillRect(box.x0, box.y0, bw, bh); }
    c.save(); c.globalCompositeOperation = 'lighter';                         // aurora ribbons drifting with the train (procedural fallback)
    for (let k = 0; k < (painted ? 0 : 3); k++) {
      const col = ['120,255,200', '255,150,230', '150,200,255'][k], y0 = box.y0 + bh * (.18 + k * .14);
      c.beginPath(); c.moveTo(box.x0, y0);
      for (let x = box.x0; x <= box.x1 + 20; x += 20) c.lineTo(x, y0 + Math.sin((x + dir * sp * .2) / 140 + k * 2 + t * .8) * 40);
      c.lineTo(box.x1, y0 + 120); c.lineTo(box.x0, y0 + 120); c.closePath();
      const ag = c.createLinearGradient(0, y0 - 40, 0, y0 + 120); ag.addColorStop(0, `rgba(${col},.45)`); ag.addColorStop(1, `rgba(${col},0)`);
      c.fillStyle = ag; c.fill();
    }
    c.restore();
    for (let i = 0; i < 200; i++) {
      const r = 1 + hash(i + 2) * 2.6, x = box.x0 + (((hash(i) * bw + dir * sp * (.15 + r * .25)) % bw) + bw) % bw, y = box.y0 + hash(i + 5) * bh;
      c.fillStyle = `rgba(230,236,255,${.35 + .65 * (.5 + .5 * Math.sin(t * (2 + hash(i) * 4) + i))})`; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
    }
  } else if (kind === 'tunnel_lights') {
    const gap = 520, off = ((dir * sp * 1.5) % gap + gap) % gap;
    for (let x = box.x0 - gap + off; x < box.x1 + gap; x += gap) {
      const g = c.createRadialGradient(x, box.y0 + bh * .3, 0, x, box.y0 + bh * .3, 120); g.addColorStop(0, 'rgba(255,214,150,.55)'); g.addColorStop(1, 'rgba(255,214,150,0)');
      c.fillStyle = g; c.fillRect(x - 120, box.y0, 240, bh);
    }
  }
  c.restore();
}
const WX_SRC = { snow: 'winter_wind', snow_light: 'snow', rain: 'tropical_rain', embers: 'fire_crackling', sun: 'summer_breeze', petals: 'spring_breeze' };
const gust = (kind, t) => { const s = WX_SRC[kind] && A.sources[WX_SRC[kind]]; return s ? clamp(.35 + .9 * sample(s.env, A.radarRate, t), .35, 1.15) : 1; };   // weather breathes with its sound
function drawLook(c, key, side, t, alpha) {
  const L = LOOKS[key]; if (!L || alpha <= .005) return;
  const box = BOX[side], dir = side === 'L' ? -1 : 1, bh = box.y1 - box.y0;
  c.save(); c.globalAlpha = alpha;
  if (L.fill) { c.fillStyle = L.fill; c.fillRect(box.x0, box.y0, box.x1 - box.x0, bh); }
  const wall = L.layers.length === 1, k = wall ? bh * 1.1 / 1024 : 1.35, top = wall ? box.y0 - bh * .05 : EYE - 590 * k;   // layer horizon (y≈590) at eye level, tall enough for the low sill
  for (const [name, f] of L.layers) drawLayer(c, name, box, f, dir, t, k, top);
  if (key === 'spring' && side === 'R') drawStation(c, box, t, k, top);
  c.restore();
  drawWeather(c, L.wx, box, t, dir, alpha * gust(L.wx, t));
  for (const [name, a0, mode] of L.glass) {
    const a = evalA(a0, t) * alpha; if (a <= .01 || !ok(name)) continue;
    c.save(); c.globalAlpha = a; if (name === 'heat_haze_overlay') { c.globalCompositeOperation = 'screen'; c.globalAlpha = a * .4; }   // the painted haze is dense: soft screen, not additive
    const bw = box.x1 - box.x0;
    if (mode === 'drip') { const o = (t * 45) % bh; c.drawImage(IMG[name], box.x0, box.y0 + o - bh, bw, bh); c.drawImage(IMG[name], box.x0, box.y0 + o, bw, bh); }
    else if (mode === 'drift') { const o = Math.sin(t * .7) * 40; c.drawImage(IMG[name], box.x0 - 60 + o, box.y0 - 30, bw + 120, bh + 60); }
    else c.drawImage(IMG[name], box.x0, box.y0, bw, bh);
    c.restore();
  }
}
// the station slides in on the right as the train brakes (same speed integral as the wheel clacks) and stops at 146 s
function drawStation(c, box, t, k, top) {
  if (t < 138.5 || !ok('spring_station')) return;
  const lw = 1536 * k, remaining = posAt(146) - posAt(t), cx = (box.x0 + box.x1) / 2;
  const x = cx - 1000 * k - remaining * V * 1.2;
  c.save(); c.globalAlpha *= smooth((t - 138.5) / 1.2);
  c.drawImage(IMG.spring_station, x, top + 120 * k, lw, 1024 * k);
  c.save(); c.translate(x, top + 120 * k); c.scale(-1, 1); c.drawImage(IMG.spring_station, 0, 0, lw, 1024 * k); c.restore();   // mirrored lead-in, seamless
  c.restore();
}
function lightning(side, t) {
  let v = 0;
  for (const q of A.cues) if (q.kind === 'lightning' && (q.side === side || q.side === 'B')) { const d = t - q.t; if (d >= 0 && d < 1) v = Math.max(v, Math.exp(-d * 9) + .6 * Math.exp(-Math.abs(d - .18) * 25)); }
  return clamp(v, 0, 1);
}
function drawWindow(c, side, t) {
  const pts = GLASS[side];
  c.save(); c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.clip();
  const { cur, prev, a } = lookAt(side, t);
  if (prev) drawLook(c, prev, side, t, 1);
  drawLook(c, cur, side, t, prev ? a : 1);
  const fl = lightning(side, t);
  if (fl > .01) { c.fillStyle = `rgba(245,248,255,${.8 * fl})`; c.fillRect(BOX[side].x0, BOX[side].y0, BOX[side].x1 - BOX[side].x0, BOX[side].y1 - BOX[side].y0); }
  c.restore();
}

// ---------------------------------------------------------------- interior
function lightWeights(t) {
  const w = { day: 0, dusk: 0, night: 0 };
  const a = TW(45), b = TW(68), c = TW(122);
  if (t < a) w.day = 1; else if (t < a + 3) { w.dusk = smooth((t - a) / 3); w.day = 1 - w.dusk; }
  else if (t < b) w.dusk = 1; else if (t < b + 3) { w.night = smooth((t - b) / 3); w.dusk = 1 - w.night; }
  else if (t < c) w.night = 1; else if (t < c + 5) { w.day = smooth((t - c) / 5); w.night = 1 - w.day; } else w.day = 1;
  return w;
}
function lampFlicker(t) {   // 1 = lamps normal; chaos flicker; 0 in the blackout
  if (inSilence(t)) return 0;
  const s0 = A.silence[0], s1 = A.silence[1];
  if (t >= s0 - .6 && t < s0) return hash(Math.floor(t * 18)) > .5 ? .25 : .9;
  if (t >= s1 && t < s1 + .8) return hash(Math.floor(t * 14) + 7) > .45 ? 1 : .2;
  if (t >= TW(95) && t < TW(125)) return .82 + .18 * (hash(Math.floor(t * 7)) > .2 ? 1 : .2);
  return 1;
}
function drawInterior(c, t) {
  const w = lightWeights(t); let first = true;
  for (const k of ['day', 'dusk', 'night']) {
    if (w[k] < .01 || !ok(`train_interior_${k}`)) continue;
    c.globalAlpha = first ? 1 : w[k]; first = false;
    c.drawImage(IMG[`train_interior_${k}`], 0, IOY, 1536 * IS, 1024 * IS);
  }
  c.globalAlpha = 1;
}
function windowSpill(c, t) {   // the colour of what is outside spills softly into the car
  c.save(); c.globalCompositeOperation = 'screen';
  for (const side of ['L', 'R']) {
    const { cur } = lookAt(side, t), L = LOOKS[cur]; if (!L || !L.tint) continue;
    const b = BOX[side], cx = side === 'L' ? b.x1 : b.x0, cy = (b.y0 + b.y1) / 2 + 120;
    const g = c.createRadialGradient(cx, cy, 20, cx, cy, 700); g.addColorStop(0, `rgba(${L.tint},.20)`); g.addColorStop(1, `rgba(${L.tint},0)`);
    c.fillStyle = g; c.fillRect(cx - 700, cy - 700, 1400, 1400);
    const fl = lightning(side, t); if (fl > .01) { c.fillStyle = `rgba(230,236,255,${.22 * fl})`; c.fillRect(0, 0, W, H); }
  }
  c.restore();
}
function drawDoorGlass(c, t) {   // warm light from the next car, darker in the tunnel
  c.save(); c.beginPath(); DOOR.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.clip();
  const n = lightWeights(t).night, f = lampFlicker(t);
  c.fillStyle = `rgba(${lerp(255, 255, n) | 0},${lerp(226, 190, n) | 0},${lerp(170, 120, n) | 0},${.95 * Math.max(f, .1)})`; c.fillRect(0, 0, W, H); c.restore();
}
function drawClock(c, t) {
  const m = clockMin(t), hA = rad(((m / 60) % 12) * 30), mA = rad((m % 60) * 6), { x, y, r } = CLOCK;
  c.save(); c.lineCap = 'round';
  for (const [ang, L, wdt, col] of [[hA, r * .45, r * .11, '#8a5a4a'], [mA, r * .66, r * .08, '#b5707d']]) {
    c.strokeStyle = col; c.lineWidth = wdt; c.beginPath(); c.moveTo(x - Math.sin(ang) * L * .12, y + Math.cos(ang) * L * .12); c.lineTo(x + Math.sin(ang) * L, y - Math.cos(ang) * L); c.stroke();
  }
  c.fillStyle = '#c99a3e'; c.beginPath(); c.arc(x, y, r * .09, 0, 7); c.fill(); c.restore();
}
function lampGlow(c, t) {
  const f = lampFlicker(t), n = lightWeights(t).night + .5 * lightWeights(t).dusk; if (n < .05) return;
  c.save(); c.globalCompositeOperation = 'lighter';
  for (const [lx, ly, s] of G.lamps) {
    const [x, y] = P([lx, ly]), R = s * IS * 6;
    const g = c.createRadialGradient(x, y, 0, x, y, R); g.addColorStop(0, `rgba(255,214,140,${.32 * n * f})`); g.addColorStop(1, 'rgba(255,214,140,0)');
    c.fillStyle = g; c.fillRect(x - R, y - R, 2 * R, 2 * R);
  }
  c.restore();
}
function drawTableProps(c, t) {
  if (!ok('table_props')) return;
  const s = 400, x = W / 2 - s / 2 + 260, y = H - s * .93;
  c.drawImage(IMG.table_props, x, y, s, s);
  // the tea steams; the snow globe glitters in winter
  c.save(); c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 4; i++) {
    const ph = (t * .35 + i / 4) % 1, sx = x + s * .29 + Math.sin(t * 1.5 + i * 2) * 10, sy = y + s * .45 - ph * 120;
    c.fillStyle = `rgba(255,255,255,${.14 * Math.sin(ph * Math.PI)})`; c.beginPath(); c.arc(sx, sy, 16 + ph * 22, 0, 7); c.fill();
  }
  c.restore();
}

// ---------------------------------------------------------------- particles in the car (FX sprites)
let parts = [];
function spawn(o) { if (parts.length < 400) parts.push(o); }
function updateParts(dt) {
  for (const q of parts) { q.life += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += (q.g || 0) * dt; q.rot += (q.spin || 0) * dt; }
  parts = parts.filter((q) => q.life < q.max);
}
function drawParts(c) {
  for (const q of parts) {
    const k = q.life / q.max, a = Math.sin(Math.PI * Math.min(1, k * 1.3)) * q.a;
    if (!ok(q.img)) continue;
    c.save(); c.globalAlpha = a; if (q.blend) c.globalCompositeOperation = q.blend; else if (q.add) c.globalCompositeOperation = 'lighter';
    c.translate(q.x, q.y); c.rotate(q.rot); const s = q.size * (q.grow ? 1 + k * q.grow : 1); c.drawImage(IMG[q.img], -s / 2, -s / 2, s, s); c.restore();
  }
}
const winPt = (side) => { const b = BOX[side]; return [lerp(b.x0, b.x1, .2 + Math.random() * .6), lerp(b.y0, b.y1, .2 + Math.random() * .6)]; };
let cueDone = new Set();
function emitFx(t, dt) {
  if (dt <= 0 || inSilence(t)) return;
  for (const q of A.cues) {                       // steam bursts out of the window it comes from
    if (q.kind !== 'steam' || cueDone.has(q.t) || t < q.t || t > q.t + .5) continue;
    cueDone.add(q.t);
    for (let i = 0; i < 14; i++) { const [x, y] = winPt(q.side); spawn({ img: 'fx_steam', x, y, vx: (q.side === 'L' ? 1 : -1) * (80 + Math.random() * 160), vy: -30 - Math.random() * 50, size: 160 + Math.random() * 120, grow: 1.2, rot: Math.random() * 6, spin: .3, life: 0, max: 2.4, a: .55 }); }
  }
  for (const s of [TW(95), TW(114.3)]) if (t >= s && !cueDone.has(s) && t < s + .5) {   // the seasons swirl when control is lost
    cueDone.add(s); spawn({ img: 'fx_season_swirl', x: W / 2, y: 330, vx: 0, vy: 0, size: 300, grow: 1.4, rot: 0, spin: 4, life: 0, max: 2.4, a: .9, blend: 'screen' });
  }
  const seg = segAt(t).key, R = (rate) => Math.random() < dt * rate;
  if (seg === 'spring' && t > 126 && R(4)) { const [x, y] = winPt(Math.random() < .5 ? 'L' : 'R'); spawn({ img: 'fx_sakura_petal', x, y, vx: (x < W / 2 ? 1 : -1) * (60 + Math.random() * 90), vy: 30 + Math.random() * 40, size: 26 + Math.random() * 18, rot: Math.random() * 6, spin: 2, life: 0, max: 6, a: .95 }); }
  if (seg === 'winter' && R(1.6)) { const [x, y] = winPt('L'); spawn({ img: 'fx_snowflake', x, y, vx: 40 + Math.random() * 60, vy: 40, size: 24 + Math.random() * 20, rot: 0, spin: 1, life: 0, max: 3, a: .7, add: true }); }
  if (seg === 'tunnel' && !(t > A.tunnelSwap[0] && t < A.tunnelSwap[1])) {
    const mid = (A.tunnelSwap[0] + A.tunnelSwap[1]) / 2, iceSide = t < mid ? 'L' : 'R', fireSide = t < mid ? 'R' : 'L';
    if (R(3)) { const [x, y] = winPt(iceSide); spawn({ img: Math.random() < .5 ? 'fx_ice_crystal' : 'fx_snowflake', x, y, vx: (iceSide === 'L' ? 1 : -1) * (60 + Math.random() * 80), vy: 20, size: 30 + Math.random() * 30, rot: 0, spin: 1.5, life: 0, max: 2, a: .8, add: true }); }
    if (R(3)) { const [x, y] = winPt(fireSide); spawn({ img: Math.random() < .5 ? 'fx_flame' : 'fx_lava_bubble', x, y: y + 60, vx: (fireSide === 'L' ? 1 : -1) * (40 + Math.random() * 60), vy: -70, size: 30 + Math.random() * 26, rot: 0, life: 0, max: 1.4, a: .8, add: true }); }
  }
  if (t > 145.5 && t < 147.5 && R(6)) spawn({ img: 'fx_star', x: W * .2 + Math.random() * W * .6, y: 150 + Math.random() * 300, vx: 0, vy: 15, size: 30 + Math.random() * 30, rot: 0, spin: 2, life: 0, max: 1.2, a: .9, add: true });
}

// ---------------------------------------------------------------- frame
const cv = $('scene'), ctx = cv.getContext('2d');
let lastT = 0, lastFrame = performance.now();
function rock(t) {   // rail-joint bump every 1.05 m of travel, like the wheel clacks in the mix
  const ph = posAt(t) / 1.05, f = ph - Math.floor(ph), sp = speed(t);
  return { y: (Math.exp(-f * 1.05 / .06) * 3 + Math.sin(t * 1.7) * 1.2) * sp, r: Math.sin(t * .9) * .0012 * sp };
}
function thermalEdges(c, th) {
  for (const [side, cl, h] of [[-1, th.Lc, th.Lh], [1, th.Rc, th.Rh]]) {
    const v = Math.max(cl, h); if (v < .02) continue;
    const col = cl >= h ? '70,170,255' : '255,110,50', x0 = side < 0 ? 0 : W, x1 = side < 0 ? 420 : W - 420;
    const g = c.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, `rgba(${col},${.3 * v})`); g.addColorStop(1, `rgba(${col},0)`);
    c.fillStyle = g; c.fillRect(Math.min(x0, x1), 0, 420, H);
  }
}
function frame(t, dt) {
  const c = ctx, rk = rock(t);
  c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
  c.save(); c.translate(W / 2, H / 2 + rk.y); c.rotate(rk.r); c.scale(1.012, 1.012); c.translate(-W / 2, -H / 2);
  drawWindow(c, 'L', t); drawWindow(c, 'R', t);
  drawDoorGlass(c, t);
  // power cut: the lamps die and the car goes dark (the windows stay lit by the stars, so the film clearly goes on)
  const f = lampFlicker(t), dark = inSilence(t) ? .62 : (t >= A.silence[0] - .6 && t < A.silence[0]) || (t >= A.silence[1] && t < A.silence[1] + .8) ? (1 - f) * .75 : 0;
  if (dark > 0) c.filter = `brightness(${(1 - .75 * dark).toFixed(3)}) saturate(${(1 - .35 * dark).toFixed(3)})`;
  drawInterior(c, t);
  if (dark > 0) c.filter = 'none';
  windowSpill(c, t);
  lampGlow(c, t);
  if (dark > 0) c.filter = `brightness(${(1 - .75 * dark).toFixed(3)})`;
  drawClock(c, t);
  drawTableProps(c, t);
  if (dark > 0) c.filter = 'none';
  emitFx(t, dt); updateParts(dt); drawParts(c);
  c.restore();
  const th = thermalAt(t + offsetMs / 1000);
  if (!QS.has('clean')) thermalEdges(c, th);   // ?clean=1: reference stills for video generation (no UI overlays)
  return { th };
}

// ---------------------------------------------------------------- radar (sound sources around the head), timeline
const radar = $('radar'), rctx = radar.getContext('2d');
const SRC = A.sources;
function drawRadar(th, t) {
  const c = rctx, w = radar.width, h = radar.height, cx = w / 2, cy = h / 2 + 8, R = 170;
  c.clearRect(0, 0, w, h); c.strokeStyle = '#3a3150'; c.lineWidth = 2;
  for (const r of [.4, .7, 1]) { c.beginPath(); c.arc(cx, cy, R * r, 0, 7); c.stroke(); }
  c.fillStyle = '#8f86a8'; c.font = '18px Inter'; c.textAlign = 'center'; c.fillText('front · locomotive', cx, cy - R - 10);
  c.fillText('L window', cx - R + 10, cy + R + 4 > h - 4 ? h - 6 : cy + R + 4); c.fillText('R window', cx + R - 10, cy + R + 4 > h - 4 ? h - 6 : cy + R + 4);
  for (const [sd, cl, hh] of [[-1, th.Lc, th.Lh], [1, th.Rc, th.Rh]]) {
    const v = Math.max(cl, hh), col = cl >= hh ? '79,179,255' : '255,122,69';
    const g = c.createRadialGradient(cx + sd * 44, cy, 0, cx + sd * 44, cy, 90); g.addColorStop(0, `rgba(${col},${.8 * v})`); g.addColorStop(1, `rgba(${col},0)`);
    c.fillStyle = g; c.beginPath(); c.arc(cx + sd * 44, cy, 90, 0, 7); c.fill();
    c.fillStyle = v > .02 ? `rgb(${col})` : '#3a4766'; c.beginPath(); c.roundRect(cx + sd * 44 - 9, cy - 22, 18, 44, 8); c.fill();
  }
  c.fillStyle = '#231a33'; c.strokeStyle = '#8f86a8'; c.beginPath(); c.arc(cx, cy, 34, 0, 7); c.fill(); c.stroke();
  const i = clamp(Math.round(t * A.radarRate), 0, A.duration * A.radarRate);
  const list = [];
  for (const [name, s] of Object.entries(SRC)) {
    const e = s.env[i] || 0; if (e < .06) continue;
    const az = s.az[i], r = 50 + (R - 50) * clamp(Math.log(s.d / .4) / Math.log(7 / .4), 0, 1);
    const x = cx + Math.sin(rad(az)) * r, y = cy - Math.cos(rad(az)) * r;
    const col = s.role === 'cool' ? '124,196,255' : s.role === 'heat' ? '255,140,90' : '200,200,220';
    c.fillStyle = `rgba(${col},${.25 + .5 * e})`; c.beginPath(); c.arc(x, y, 12 + 12 * e, 0, 7); c.fill();
    c.font = '22px "Noto Color Emoji", "Apple Color Emoji", sans-serif'; c.globalAlpha = .4 + .6 * e; c.fillText(s.icon, x, y + 8); c.globalAlpha = 1;
    list.push(s.icon);
  }
  return list.join(' ');
}
const tl = $('timeline'), tlctx = tl.getContext('2d');
function drawTimeline() {
  const c = tlctx, w = tl.width, h = tl.height, n = TH.Lc.length;
  c.fillStyle = '#120e1c'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * w, bw = w / n + 1;
    for (const [row, cl, hh] of [[0, TH.Lc[i], TH.Lh[i]], [1, TH.Rc[i], TH.Rh[i]]]) {
      const v = Math.max(cl, hh); if (v < .02) continue;
      c.fillStyle = cl >= hh ? `rgba(79,179,255,${.15 + .85 * v})` : `rgba(255,122,69,${.15 + .85 * v})`; c.fillRect(x, row ? h / 2 + 1 : 2, bw, h / 2 - 3);
    }
  }
  c.fillStyle = 'rgba(255,255,255,.45)'; c.font = '600 14px Inter';
  A.segments.forEach((s, i) => { const x = (s.t0 / A.duration) * w; c.fillRect(x, 0, 1.5, h); c.fillText(String(i + 1), x + 4, 15); });
  c.fillStyle = 'rgba(255,255,255,.08)'; c.fillRect((A.silence[0] / A.duration) * w, 0, ((A.silence[1] - A.silence[0]) / A.duration) * w, h);
}
drawTimeline();

// ---------------------------------------------------------------- media / clock / UI
const mix = $('mix'), media = mix, playBtn = $('playBtn');
const QS = new URLSearchParams(location.search);
if (QS.has('cover')) document.body.classList.add('cover-only');
let previewT = QS.get('t') != null ? +QS.get('t') : null;
if (previewT != null) { $('intro').classList.add('hidden'); mix.addEventListener('play', () => { previewT = null; }, { once: true }); }
const now = () => (previewT != null ? previewT : media.currentTime || 0);
const reset = () => { parts = []; cueDone = new Set(); };
const play = () => { $('intro').classList.add('hidden'); if (previewT != null) { media.currentTime = previewT; previewT = null; } media.play().catch(() => {}); };
const pause = () => media.pause();
const toggle = () => (media.paused ? play() : pause());
playBtn.addEventListener('click', toggle);
$('startBtn').addEventListener('click', () => { media.currentTime = 0; reset(); play(); });
mix.addEventListener('play', () => { playBtn.textContent = '❚❚'; });
for (const ev of ['pause', 'ended']) mix.addEventListener(ev, () => { playBtn.textContent = '▶'; stopOutput(); });
$('timelineWrap').addEventListener('click', (e) => { const r = e.currentTarget.getBoundingClientRect(); media.currentTime = clamp((e.clientX - r.left) / r.width, 0, 1) * A.duration; reset(); $('intro').classList.add('hidden'); });
document.addEventListener('keydown', (e) => {
  if (e.target.matches('input, select')) return;
  if (e.code === 'Space') { e.preventDefault(); toggle(); } else if (e.code === 'Escape') emergencyStop();
  else if (e.code === 'ArrowRight') { media.currentTime = Math.min(A.duration, now() + 5); reset(); } else if (e.code === 'ArrowLeft') { media.currentTime = Math.max(0, now() - 5); reset(); }
});
document.addEventListener('visibilitychange', () => { if (document.hidden) { pause(); stopOutput(); } });
$('lrBtn').addEventListener('click', () => {
  const ac = new AudioContext();
  [[-1, 0], [1, .9]].forEach(([pan, at]) => { for (const [f, d] of [[1318.5, 0], [1760, .14]]) {
    const o = ac.createOscillator(), g = ac.createGain(), p = new StereoPannerNode(ac, { pan });
    o.frequency.value = pan < 0 ? f : f * 1.25; o.connect(g).connect(p).connect(ac.destination);
    const t0 = ac.currentTime + at + d; g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(.25, t0 + .01); g.gain.exponentialRampToValueAtTime(.001, t0 + .5); o.start(t0); o.stop(t0 + .55);
  } });
  const b = $('lrBtn'); b.textContent = '🎧 Left…'; setTimeout(() => { b.textContent = '🎧 …Right'; }, 900); setTimeout(() => { b.textContent = '🎧 Left / Right check'; ac.close(); }, 1900);
});
const sceneEl = $('sceneTitle'); let segIdx = -1, segTimer = 0;
function updateScene(t) {
  const i = A.segments.indexOf(segAt(t));
  if (i !== segIdx) { segIdx = i; const s = A.segments[i]; sceneEl.innerHTML = `${i + 1}　${s.ja}<small>${s.en}</small>`; sceneEl.classList.add('show'); clearTimeout(segTimer); segTimer = setTimeout(() => sceneEl.classList.remove('show'), 3200); }
}
$('credits').textContent = A.credits.art;

// ---------------------------------------------------------------- device output (same protocol as Demo 1–4)
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
  const t = now(); if (Math.abs(t - lastT) > .5) reset(); lastT = t;
  const ix = window.MoHeatInteract && previewT == null ? window.MoHeatInteract.tick(t, media) : null;   // ../../shared/interact.js: waits for you / cheer mode
  const playing = (!media.paused && !media.ended) || previewT != null;
  const { th: th0 } = frame(t, playing || ix ? dt : 0);
  const io = window.MoHeatInteract ? window.MoHeatInteract.out(th0, ix) : { th: th0, live: null }, th = io.th, live = io.live ?? playing;
  const icons = drawRadar(live ? th : { Lc: 0, Lh: 0, Rc: 0, Rh: 0 }, t); updateOutput(th, live); updateScene(t);
  $('time').textContent = `${fmt(t)} / ${fmt(A.duration)}`; $('playhead').style.left = `${(t / A.duration) * 100}%`;
  $('posInfo').textContent = `${segAt(t).en}${icons ? ' · ' + icons : ''}`;
  requestAnimationFrame(loop);
}

// ---------------------------------------------------------------- offline render (scripts/render_mp4.py)
function titleCard(c, t) {
  const si = A.segments.indexOf(segAt(t)), s = A.segments[si], age = si === 0 ? t - 1.8 : t - s.t0;
  if (age >= 0 && age < 3.4) {
    c.globalAlpha = clamp(Math.min(age / .5, (3.4 - age) / .6), 0, 1);
    c.fillStyle = 'rgba(40,20,40,.5)'; c.fillRect(70, 60, 660, 96); c.fillStyle = '#ffb3cf'; c.fillRect(70, 60, 5, 96);
    c.textAlign = 'left'; c.fillStyle = '#fff'; c.font = '700 38px "Zen Maru Gothic", sans-serif'; c.fillText(`${si + 1}　${s.ja}`, 96, 106);
    c.fillStyle = '#f2e3ee'; c.font = '500 24px Inter, sans-serif'; c.fillText(s.en, 96, 140); c.globalAlpha = 1;
  }
  if (t > 146) {
    c.globalAlpha = clamp((t - 146) / .8, 0, 1); c.textAlign = 'center';
    c.fillStyle = 'rgba(40,20,40,.45)'; c.fillRect(W / 2 - 430, H / 2 - 92, 860, 150);
    c.fillStyle = '#fff'; c.font = '700 54px "Zen Maru Gothic", sans-serif'; c.fillText('終点・さくら駅', W / 2, H / 2 - 18);
    c.fillStyle = '#f7dceb'; c.font = '500 28px Inter, sans-serif'; c.fillText('Last stop — Cherry Blossom Station', W / 2, H / 2 + 30); c.globalAlpha = 1;
  }
}
const RENDER = QS.has('render');
async function renderAll() {
  await document.fonts.ready;
  const cover = new Image(); cover.src = 'media/cover.jpg'; await cover.decode().catch(() => {});
  await Promise.all(Object.values(IMG).map((im) => im.decode().catch(() => {})));
  const fps = A.fps, n = Math.round(A.duration * fps); reset();
  const AT = QS.get('at') ? QS.get('at').split(',').map(Number) : null;      // preview stills: ?render=1&at=10,30
  const list = AT ? AT.map((x) => Math.round(x * fps)) : [...Array(n).keys()];
  for (const i of list) {
    const t = i / fps;
    if (AT) { reset(); for (let k = 45; k > 0; k--) frame(Math.max(0, t - k / fps), 1 / fps); }   // warm up particles
    frame(t, 1 / fps);
    if (t < 1.8 && cover.naturalWidth && !QS.has('clean')) { ctx.globalAlpha = t < 1.2 ? 1 : (1.8 - t) / .6; ctx.drawImage(cover, 0, 0, W, H); ctx.globalAlpha = 1; }
    if (!inSilence(t) && !QS.has('clean')) titleCard(ctx, t);
    const blob = await new Promise((r) => cv.toBlob(r, 'image/jpeg', .92));
    await fetch(`/frame/${String(i).padStart(5, '0')}.jpg`, { method: 'PUT', body: blob });
  }
  await fetch('/done', { method: 'PUT' });
}
if (RENDER) { document.body.classList.add('rendering'); renderAll(); }
else if (QS.has('cover') && previewT == null) mix.preload = 'none';   // poster export: static page, no animation loop
else requestAnimationFrame(loop);
