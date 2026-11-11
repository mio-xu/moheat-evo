// The Runaway Seasons Express (MoHeat Evo Demo 4) — v2 (2026-11-09): the magic × cyber transforming carriage + the Season Spirit Conductor.
// Clock = the binaural mix (#mix). Layers, back to front (DEMO_DESIGN_GUIDE §6.2, everything animated in code, no video):
//   seasons in the two window halves (parallax scenery, weather, glass layers, the ice shield) → the wooden carriage (media/art/car_base,
//   glass keyed) with its rune panels flipping open (car_runes_ice / car_runes_fire, coloured by what each ear feels) → window frames that
//   glow with the thermal output → hologram screen (the conductor announcing), roof-hatch toys, lamp, vents' hot air, tea → particles →
//   the conductor in person (whisper at your right ear in the power cut, goodbye on your table at the station).
// World rule (project/script.md §2): a window's season reaches the car only through that side's OPEN rune panels (A.runeOpen);
// the hologram is light only (no warmth); the conductor in person is warm like any voice.
// Gates (interactive = default; pure mode answers itself through shared/shell.js): hold the tea (winter), open the LEFT / RIGHT window
// (tunnel), shout "Spring!" (power cut, voice-judged by shared/voice.js, tap fallback). Output: DUAL LC.. LH.. RC.. RH.. (firmware DUAL).
'use strict';

const W = 1920, H = 1080;
const D = window.DEMO_DATA, A = D.anim, G = window.D04_GEO, VO = window.D04_VOICE, LY = (window.MOHEAT_LAYERS || {}).views || {};
const TW = (x) => { const o = A.warp.old, n = A.warp.new; for (let i = 1; i < o.length; i++) if (x <= o[i]) return n[i - 1] + (x - o[i - 1]) * (n[i] - n[i - 1]) / (o[i] - o[i - 1]); return n[n.length - 1]; };
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const rad = (d) => (d * Math.PI) / 180;
const hash = (n) => { const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
const interp = (keys, t) => { if (t <= keys[0][0]) return keys[0][1]; for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) { const [a, va] = keys[i - 1], [b, vb] = keys[i]; return b > a ? va + (vb - va) * (t - a) / (b - a) : vb; } return keys[keys.length - 1][1]; };
const QS = new URLSearchParams(location.search);
const RENDER = QS.has('render'), COVERART = QS.has('coverart'), LINEAR = RENDER || COVERART || QS.has('embed');

// ---------------------------------------------------------------- data
const parseCsv = (txt) => {
  const lines = txt.trim().split('\n'), head = lines[0].split(',');
  const cols = Object.fromEntries(head.map((h) => [h, []]));
  for (const l of lines.slice(1)) l.split(',').forEach((v, i) => cols[head[i]].push(head[i] === 'command' ? v : +v));
  return { rate: 20, Lc: cols.L_cool, Rc: cols.R_cool, Lh: cols.L_heat, Rh: cols.R_heat };
};
const TH = parseCsv(D.thermalCsv);
const sample = (arr, rate, t) => { const x = clamp(t * rate, 0, arr.length - 1), i = Math.floor(x), f = x - i; return i + 1 < arr.length ? arr[i] * (1 - f) + arr[i + 1] * f : arr[i]; };
const thermalAt = (t) => ({ Lc: sample(TH.Lc, TH.rate, t), Rc: sample(TH.Rc, TH.rate, t), Lh: sample(TH.Lh, TH.rate, t), Rh: sample(TH.Rh, TH.rate, t) });
const segAt = (t) => A.segments.find((s) => t >= s.t0 && t < s.t1) || A.segments[A.segments.length - 1];
const inSilence = (t) => t >= A.silence[0] && t < A.silence[1];
const runeOpen = (side, t) => interp(A.runeOpen[side], t);
const T_TUNNEL = [62, 90], T_CHAOS = [90, A.silence[0]], T_SPRING = TW(125);

// train speed (same law as build_audio.py) and its integral
const speed = (t) => Math.pow(clamp((146 - t) / 7, 0, 1), 1.3) * (1 + (t > TW(95) && t < TW(125) ? .25 : 0) + (t < TW(20) ? .2 : 0));
const POS = (() => { const r = 100, n = Math.ceil(A.duration * r) + 2, p = new Float64Array(n); for (let i = 1; i < n; i++) p[i] = p[i - 1] + speed((i - .5) / r) / r; return p; })();
const posAt = (t) => sample(POS, 100, clamp(t, 0, A.duration));

// ---------------------------------------------------------------- art
const ART = ['car_base', 'car_runes_ice', 'car_runes_fire', 'runes_glow', 'frame_glow', 'toy_snowman', 'toy_sun', 'tea_cup', 'props_rest',
  'winter_far', 'winter_mid', 'winter_near', 'summer_far', 'summer_mid', 'summer_near', 'rainforest_far', 'rainforest_mid', 'rainforest_near', 'rainforest_storm_far',
  'spring_far', 'spring_mid', 'spring_near', 'spring_station', 'tunnel_ice_wall', 'tunnel_lava_wall', 'night_aurora_far',
  'frost_corner', 'frost_overlay', 'heat_haze_overlay', 'raindrops_overlay', 'fog_overlay',
  'fx_flame', 'fx_ice_crystal', 'fx_icicle', 'fx_lava_bubble', 'fx_sakura_petal', 'fx_season_swirl', 'fx_snowflake', 'fx_star', 'fx_steam', 'fx_sun_glare'];
const IMG = {};
for (const f of ART) { const im = new Image(); im.src = `media/art/${f}.webp`; IMG[f] = im; }
const FIG = {};   // the conductor's layers (tools/art/build_stage.py → media/layers.js data; drawn here, not by shared/layers.js)
for (const [stem, v] of Object.entries(LY)) {
  const ld = (src) => { const im = new Image(); im.src = `media/${src}`; return im; };
  FIG[v.view] = { c: v.char, im: ld(v.char.src), eyes: (v.patches || []).filter((p) => p.kind === 'eyes').map((p) => ({ ...p, im: ld(p.src) })),
    mouth: (v.patches || []).filter((p) => p.kind === 'mouth_lv').sort((a, b) => a.level - b.level).map((p) => ({ ...p, im: ld(p.src) })), blinkAt: 2 + Math.random() * 3, blinkTo: 0 };
}
const ok = (k) => IMG[k] && IMG[k].complete && IMG[k].naturalWidth > 0;
const okI = (im) => im && im.complete && im.naturalWidth > 0;
const BOX = { L: { x0: 0, y0: 0, x1: W / 2, y1: H }, R: { x0: W / 2, y0: 0, x1: W, y1: H } };
const EYE = G.eye;
const WINS = G.windows;

// ---------------------------------------------------------------- window "looks" (scenery behind the glass)
const V = 660;
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
  dark: { layers: [['night_aurora_far', .15]], glass: [], wx: 'stars', tint: '150,180,255', fill: '#24317e' },
  spring: { layers: L3('spring'), glass: [], wx: 'petals', tint: '255,205,225' },
};
const CHAOS_LOOK = { winter: 'winter', summer: 'summer', lava: 'lava', ice: 'ice', storm: 'storm', steam: 'steam', spring: 'spring', dark: 'dark' };
const TRACK = { L: [[0, 'winter', 0], [20, 'winter_thaw', 0], [45, 'storm', 2.5], [63, 'after_rain', 3], [70, 'ice', .7]],
                R: [[0, 'winter', 0], [20, 'summer', 2.0], [45, 'rainforest_sun', 2.5], [57, 'storm', 4], [70, 'lava', .7]] };   // v2: no tunnel swap
for (const s of ['L', 'R']) TRACK[s] = TRACK[s].map(([t, k, f]) => [TW(t), k, f]);
for (const c of A.chaos) { const f = c.t0 === A.chaos[0].t0 ? .6 : c.t1 - c.t0 <= 1.01 ? .12 : .22; TRACK.L.push([c.t0, CHAOS_LOOK[c.left], f]); TRACK.R.push([c.t0, CHAOS_LOOK[c.right], f]); }
for (const s of ['L', 'R']) TRACK[s].sort((a, b) => a[0] - b[0]);
function lookAt(side, t) {
  const tr = TRACK[side]; let i = 0;
  for (let k = 0; k < tr.length; k++) if (tr[k][0] <= t) i = k;
  const [t0, key, fade] = tr[i], a = fade > 0 ? smooth((t - t0) / fade) : 1;
  return { cur: key, prev: i > 0 && a < 1 ? tr[i - 1][1] : null, a };
}
const evalA = (v, t) => (typeof v === 'function' ? v(t) : v);
function drawLayer(c, name, box, f, dir, tv, k, top) {
  if (!ok(name)) return;
  const lw = 1536 * k, lh = 1024 * k, shift = dir * posAt(tv) * V * f;
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
  if (kind === 'snow' || kind === 'snow_light') {   // terminal velocity, drifting with the train's wind, a slight sway
    const n = kind === 'snow' ? 90 : 35; c.fillStyle = '#fff';
    for (let i = 0; i < n; i++) {
      const r = 1.5 + hash(i) * 3.5, x = box.x0 + (((hash(i + 3) * bw + dir * sp * (.3 + r * .12)) % bw) + bw) % bw, y = box.y0 + ((hash(i + 9) * bh + t * (40 + r * 18)) % bh);
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
  } else if (kind === 'embers') {   // rise from the lava, slowing as they leave the hot air
    for (let i = 0; i < 45; i++) {
      const life = (t * (.35 + hash(i) * .3) + hash(i + 6)) % 1, x = box.x0 + (((hash(i) * bw + dir * sp * 1.4 + Math.sin(t + i) * 20) % bw) + bw) % bw, y = box.y1 - bh * (1 - Math.pow(1 - life, 2)) * .9;
      c.fillStyle = `rgba(255,${170 + hash(i) * 70 | 0},90,${.85 * Math.sin(Math.PI * life)})`; c.beginPath(); c.arc(x, y, 2 + hash(i + 2) * 3, 0, 7); c.fill();
    }
  } else if (kind === 'sun') {
    if (ok('fx_sun_glare')) { c.globalCompositeOperation = 'screen'; c.globalAlpha = alpha * (.3 + .06 * Math.sin(t * 2)); const s = bh * 1.1; c.drawImage(IMG.fx_sun_glare, (dir > 0 ? box.x1 - s * .75 : box.x0 - s * .25), box.y0 - s * .35, s, s); }
  } else if (kind === 'petals') {
    for (let i = 0; i < 30; i++) {
      if (!ok('fx_sakura_petal')) break;
      const x = box.x0 + (((hash(i) * bw + dir * sp * .7 + t * 30) % bw) + bw) % bw, y = box.y0 + ((hash(i + 3) * bh + t * (30 + hash(i) * 30)) % bh), s = 14 + hash(i + 8) * 14;
      c.save(); c.translate(x, y); c.rotate(t * (1 + hash(i)) + i); c.drawImage(IMG.fx_sakura_petal, -s / 2, -s / 2, s, s); c.restore();
    }
  } else if (kind === 'stars') {
    for (let i = 0; i < 200; i++) {
      const r = 1 + hash(i + 2) * 2.6, x = box.x0 + (((hash(i) * bw + dir * sp * (.15 + r * .25)) % bw) + bw) % bw, y = box.y0 + hash(i + 5) * bh;
      c.fillStyle = `rgba(230,236,255,${.35 + .65 * (.5 + .5 * Math.sin(t * (2 + hash(i) * 4) + i))})`; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
    }
  }
  c.restore();
}
const WX_SRC = { snow: 'winter_wind', snow_light: 'snow', rain: 'tropical_rain', embers: 'fire_crackling', sun: 'summer_breeze', petals: 'spring_breeze' };
const gust = (kind, t) => { const s = WX_SRC[kind] && A.sources[WX_SRC[kind]]; return s ? clamp(.35 + .9 * sample(s.env, A.radarRate, t), .35, 1.15) : 1; };
function drawLook(c, key, side, t, tv, alpha) {
  const L = LOOKS[key]; if (!L || alpha <= .005) return;
  const box = BOX[side], dir = side === 'L' ? -1 : 1, bh = box.y1 - box.y0;
  c.save(); c.globalAlpha = alpha;
  if (L.fill) { c.fillStyle = L.fill; c.fillRect(box.x0, box.y0, box.x1 - box.x0, bh); }
  const wall = L.layers.length === 1 && key !== 'dark', k = wall ? bh * 1.1 / 1024 : 1.35, top = wall ? box.y0 - bh * .05 : EYE - 590 * k;
  for (const [name, f] of L.layers) drawLayer(c, name, box, f, dir, tv, k, top);
  if (key === 'spring' && side === 'R') drawStation(c, box, t, k, top);
  c.restore();
  drawWeather(c, L.wx, box, tv, dir, alpha * gust(L.wx, t));
  for (const [name, a0, mode] of L.glass) {
    const a = evalA(a0, t) * alpha; if (a <= .01 || !ok(name)) continue;
    c.save(); c.globalAlpha = a; if (name === 'heat_haze_overlay') { c.globalCompositeOperation = 'screen'; c.globalAlpha = a * .4; }
    const bw = box.x1 - box.x0;
    if (mode === 'drip') { const o = (tv * 45) % bh; c.drawImage(IMG[name], box.x0, box.y0 + o - bh, bw, bh); c.drawImage(IMG[name], box.x0, box.y0 + o, bw, bh); }
    else if (mode === 'drift') { const o = Math.sin(tv * .7) * 40; c.drawImage(IMG[name], box.x0 - 60 + o, box.y0 - 30, bw + 120, bh + 60); }
    else c.drawImage(IMG[name], box.x0, box.y0, bw, bh);
    c.restore();
  }
}
function drawStation(c, box, t, k, top) {
  if (t < 138.5 || !ok('spring_station')) return;
  const lw = 1536 * k, remaining = posAt(146) - posAt(t), cx = (box.x0 + box.x1) / 2, x = cx - 1000 * k - remaining * V * 1.2;
  c.save(); c.globalAlpha *= smooth((t - 138.5) / 1.2);
  c.drawImage(IMG.spring_station, x, top + 120 * k, lw, 1024 * k);
  c.save(); c.translate(x, top + 120 * k); c.scale(-1, 1); c.drawImage(IMG.spring_station, 0, 0, lw, 1024 * k); c.restore();
  c.restore();
}
function lightning(side, t) {
  let v = 0;
  for (const q of A.cues) if (q.kind === 'lightning' && (q.side === side || q.side === 'B')) { const d = t - q.t; if (d >= 0 && d < 1) v = Math.max(v, Math.exp(-d * 9) + .6 * Math.exp(-Math.abs(d - .18) * 25)); }
  return clamp(v, 0, 1);
}

// ---------------------------------------------------------------- the ice shield (winter): a crystal lattice rising over the glass, drawn once
const ICE = (() => {
  const cv = document.createElement('canvas'); cv.width = W / 2; cv.height = H; const c = cv.getContext('2d');
  const g = c.createLinearGradient(0, H, 0, 0); g.addColorStop(0, 'rgba(225,245,255,.42)'); g.addColorStop(.6, 'rgba(190,230,255,.22)'); g.addColorStop(1, 'rgba(190,230,255,.12)');
  c.fillStyle = g; c.fillRect(0, 0, W / 2, H);
  c.lineCap = 'round';
  for (let i = 0; i < 70; i++) {   // frost ferns: branching strokes growing up from the sill
    let x = hash(i) * W / 2, y = H - hash(i + 1) * 200, a = -Math.PI / 2 + (hash(i + 2) - .5) * 1.2, L = 40 + hash(i + 3) * 80;
    for (let k = 0; k < 7; k++) {
      const nx = x + Math.cos(a) * L, ny = y + Math.sin(a) * L;
      c.strokeStyle = `rgba(245,252,255,${.55 - k * .05})`; c.lineWidth = 2.6 - k * .3; c.beginPath(); c.moveTo(x, y); c.lineTo(nx, ny); c.stroke();
      for (const s of [-1, 1]) { const ba = a + s * .7, bl = L * .45; c.lineWidth = 1.4; c.beginPath(); c.moveTo((x + nx) / 2, (y + ny) / 2); c.lineTo((x + nx) / 2 + Math.cos(ba) * bl, (y + ny) / 2 + Math.sin(ba) * bl); c.stroke(); }
      x = nx; y = ny; a += (hash(i * 7 + k) - .5) * .6; L *= .88;
    }
  }
  for (let i = 0; i < 180; i++) { c.fillStyle = `rgba(255,255,255,${.3 + hash(i + 50) * .5})`; c.beginPath(); c.arc(hash(i + 60) * W / 2, hash(i + 70) * H, 1 + hash(i + 80) * 2, 0, 7); c.fill(); }
  return cv;
})();
const shieldAt = (side, t) => { if (COVERART) return side === 'L' ? .62 : 0; const t0 = side === 'L' ? 2.6 : 5.4; return smooth((t - t0) / 2.6) * (1 - smooth((t - 12.5) / 2.5)); };
function openWin(side) { const ws = WINS.filter((w) => w.side === side); return ws.reduce((a, w) => ((w.box[2] - w.box[0]) * (w.box[3] - w.box[1]) > (a.box[2] - a.box[0]) * (a.box[3] - a.box[1]) ? w : a), ws[0]); }
function drawSash(c, side, t) {   // the window you chose in the tunnel: its upper sash slides down (wood + brass), wind streaks in the opening
  if (win.side !== side || t < 66 || t > T_TUNNEL[1] + 1) return;
  const w = openWin(side); if (!w) return;
  const [x0, y0, x1, y1] = w.box, k = smooth((t - 66) / 1.2) * (1 - smooth((t - T_TUNNEL[1]) / 1)), y = y0 + (y1 - y0) * .55 * k;
  c.save(); c.beginPath(); c.rect(x0, y0, x1 - x0, y1 - y0); c.clip();
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 8; i++) { const yy = y0 + ((i * 53 + t * 420) % Math.max(1, y - y0)), a = .25 * k; c.strokeStyle = side === 'L' ? `rgba(220,245,255,${a})` : `rgba(255,190,120,${a})`;
    c.lineWidth = 2; c.beginPath(); c.moveTo(side === 'L' ? x0 : x1, yy); c.lineTo(side === 'L' ? x1 : x0, yy + 30); c.stroke(); }
  c.globalCompositeOperation = 'source-over';
  const g = c.createLinearGradient(0, y - 14, 0, y + 14); g.addColorStop(0, '#6b3d1c'); g.addColorStop(.45, '#c98c4a'); g.addColorStop(.55, '#e2b46a'); g.addColorStop(1, '#5a3216');
  c.fillStyle = g; c.fillRect(x0, y - 14, x1 - x0, 28); c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(x0, y + 14, x1 - x0, (y1 - y) - 14);   // the lowered glass below the sash
  c.restore();
}
function drawShield(c, side, t) {
  const h = shieldAt(side, t); if (h <= .01) return;
  const b = BOX[side], top = H * (1 - h);
  c.save(); c.beginPath(); c.rect(b.x0, top, b.x1 - b.x0, H - top); c.clip();
  c.globalAlpha = .95; c.drawImage(ICE, b.x0, 0, W / 2, H);
  const g = c.createLinearGradient(0, top - 4, 0, top + 30); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.3, 'rgba(235,250,255,.9)'); g.addColorStop(1, 'rgba(200,235,255,0)');
  c.fillStyle = g; c.fillRect(b.x0, top - 4, b.x1 - b.x0, 34);   // the growing edge glints
  c.restore();
}

// ---------------------------------------------------------------- the carriage (offscreen: base + rune panels + light), then window frames
const car = document.createElement('canvas'); car.width = W; car.height = H; const cc = car.getContext('2d');
const PANELS = G.panels.map((p, i) => ({ ...p, i }));
for (const s of ['L', 'R']) { const list = PANELS.filter((p) => p.side === s && p.kind !== 'vent'); list.forEach((p, k) => { p.d = k / Math.max(1, list.length - 1); }); }
PANELS.filter((p) => p.kind === 'vent').forEach((p) => { p.d = 0; });
const VENT = [[0, 0], [13.6, 0], [15.0, 1], [36.6, 1], [37.6, 0], [90.0, 0], [90.8, 1], [118.4, 1], [118.6, 0]];
function panelOpen(p, t) {   // each panel flips within its side's opening ramp, outer (near you) first; vents follow VENT
  if (p.kind === 'vent') return interp(VENT, t);
  const k = A.runeOpen[p.side], o = runeOpen(p.side, t);
  const [ta, tb] = [k[1][0], k[2][0]];   // the opening ramp
  if (t < tb + .1 && t > ta - .1) return smooth((t - (ta + p.d * (tb - ta - .6))) / .6);
  const [tc, td] = [k[3][0], k[4][0]];   // the closing ramp (spring)
  if (t > tc - .1 && t < td + .1) return 1 - smooth((t - (tc + p.d * (td - tc - .6))) / .6);
  return o;
}
const TINT = {};
function tinted(name, rgb) {   // a white glow layer recoloured once per colour (cached)
  const key = name + rgb; if (TINT[key]) return TINT[key]; if (!ok(name)) return null;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
  c.drawImage(IMG[name], 0, 0, W, H); c.globalCompositeOperation = 'source-in'; c.fillStyle = `rgb(${rgb})`; c.fillRect(0, 0, W, H);
  return (TINT[key] = cv);
}
function lightWeights(t) {
  const w = { day: 0, dusk: 0, night: 0 }, a = TW(45), b = TW(68), c = TW(122);
  if (t < a) w.day = 1; else if (t < a + 3) { w.dusk = smooth((t - a) / 3); w.day = 1 - w.dusk; }
  else if (t < b) w.dusk = 1; else if (t < b + 3) { w.night = smooth((t - b) / 3); w.dusk = 1 - w.night; }
  else if (t < c) w.night = 1; else if (t < c + 5) { w.day = smooth((t - c) / 5); w.night = 1 - w.day; } else w.day = 1;
  return w;
}
function powerDim(t) {   // 0 = lights on … 1 = power cut
  const [s0, s1] = A.silence;
  if (t >= s0 && t < s1) return 1;
  if (t >= s0 - .6 && t < s0) return hash(Math.floor(t * 18)) > .5 ? .75 : .1;
  if (t >= s1 && t < s1 + .8) return hash(Math.floor(t * 14) + 7) > .45 ? 0 : .8;
  return 0;
}
const chaosOn = (t) => t >= T_CHAOS[0] && t < T_CHAOS[1];
function sideColour(th, side) {   // what this ear feels → ice / fire share and brightness of that side's runes and frames
  const c = side === 'L' ? th.Lc : th.Rc, h = side === 'L' ? th.Lh : th.Rh, s = c + h;
  return { ice: s > .04 ? c / s : 1, fire: s > .04 ? h / s : 0, v: Math.max(c, h), c, h };
}
function drawCar(t, th, tv) {
  const c = cc; c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; c.filter = 'none';
  c.clearRect(0, 0, W, H);
  if (ok('car_base')) c.drawImage(IMG.car_base, 0, 0, W, H);
  for (const p of PANELS) {
    const o = panelOpen(p, t); if (o <= .002) continue;
    const sc = p.kind === 'vent' ? { ice: 0, fire: 1, v: .7 } : sideColour(th, p.side);
    const [x0, y0, x1, y1] = p.box, w = x1 - x0, h = y1 - y0;
    c.save(); c.beginPath(); c.rect(x0, y0, w, h); c.clip();
    if (sc.ice > .01 && ok('car_runes_ice')) { c.globalAlpha = sc.ice; c.drawImage(IMG.car_runes_ice, 0, 0, W, H); }
    if (sc.fire > .01 && ok('car_runes_fire')) { c.globalAlpha = sc.fire; c.drawImage(IMG.car_runes_fire, 0, 0, W, H); }
    c.globalAlpha = 1;
    if (o < .999 && ok('car_base')) {   // the wooden panel still turning on its hinge
      const k = 1 - o, hx = (p.side === 'L') === (p.hinge === 'out') ? x0 : x1, nw = Math.max(1, w * k);
      c.drawImage(IMG.car_base, x0, y0, w, h, hx === x0 ? x0 : x1 - nw, y0, nw, h);
      c.globalCompositeOperation = 'source-atop'; c.fillStyle = `rgba(30,15,5,${.45 * o})`; c.fillRect(hx === x0 ? x0 : x1 - nw, y0, nw, h); c.globalCompositeOperation = 'source-over';   // shade only the wood, never the glass
    }
    c.restore();
  }
  // light: dusk / night / the power cut darken the wood (source-atop: only the carriage's own pixels)
  const lw = lightWeights(t), dim = powerDim(t);
  const dark = clamp(.18 * lw.dusk + .42 * lw.night + .45 * dim, 0, .8);
  c.globalCompositeOperation = 'source-atop';
  if (dark > .01) { c.fillStyle = `rgba(${lw.night > .5 || dim > .5 ? '18,20,52' : '60,35,40'},${dark})`; c.fillRect(0, 0, W, H); }
  if (t >= T_TUNNEL[0] + 1 && t < T_TUNNEL[1] + 1) {   // split cabins: the left half chilled blue, the right half lit orange
    const k = splitAt(t) / SPLIT;
    let g = c.createLinearGradient(0, 0, W / 2, 0); g.addColorStop(0, `rgba(120,190,255,${.28 * k})`); g.addColorStop(1, 'rgba(120,190,255,0)'); c.fillStyle = g; c.fillRect(0, 0, W / 2, H);
    g = c.createLinearGradient(W, 0, W / 2, 0); g.addColorStop(0, `rgba(255,130,50,${.28 * k})`); g.addColorStop(1, 'rgba(255,130,50,0)'); c.fillStyle = g; c.fillRect(W / 2, 0, W / 2, H);
  }
  // the runes emit their own light (also in the dark)
  c.globalCompositeOperation = 'lighter';
  for (const side of ['L', 'R']) {
    const sc = sideColour(th, side), open = runeOpen(side, t);
    if (open < .01 || dim > .9) continue;
    const b = (.25 + .75 * clamp(sc.v / .6, 0, 1)) * open * (1 - dim) * (chaosOn(t) ? .6 + .4 * hash(Math.floor(tv * 12) + (side === 'L' ? 0 : 5)) : 1);
    c.save(); c.beginPath(); for (const p of PANELS) if (p.side === side && p.kind !== 'vent' && panelOpen(p, t) > .5) c.rect(...[p.box[0], p.box[1], p.box[2] - p.box[0], p.box[3] - p.box[1]]); c.clip();
    if (chaosOn(t)) {   // seasons out of control: the rune light itself cycles neon colours (only the glowing lines, never the wood)
      const NEON = ['255,60,200', '60,240,255', '170,255,60', '180,90,255'], g = tinted('runes_glow', NEON[(Math.floor(tv * 3) + (side === 'L' ? 0 : 2)) % 4]);
      if (g) { c.globalAlpha = Math.min(1, b * 1.3); c.drawImage(g, 0, 0); }
    } else {
      if (sc.ice > .01) { const g = tinted('runes_glow', '150,215,255'); if (g) { c.globalAlpha = b * sc.ice; c.drawImage(g, 0, 0); } }
      if (sc.fire > .01) { const g = tinted('runes_glow', '255,140,60'); if (g) { c.globalAlpha = b * sc.fire; c.drawImage(g, 0, 0); } }
    }
    c.restore();
  }
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
}
let LINEAR_MOTION = false;
function frameGlow(c, th, t, side) {   // window frames glow blue / orange with what each ear feels right now (inside the side's clip)
  if (powerDim(t) > .9) return;
  c.save(); c.globalCompositeOperation = 'lighter';
  {
    const sc = sideColour(th, side);
    c.save();
    if (sc.c > .03) { const g = tinted('frame_glow', '90,180,255'); if (g) { c.globalAlpha = clamp(sc.c * 1.1, 0, 1); c.drawImage(g, 0, 0); } }
    if (sc.h > .03) { const g = tinted('frame_glow', '255,120,40'); if (g) { c.globalAlpha = clamp(sc.h * 1.1, 0, 1); c.drawImage(g, 0, 0); } }
    c.restore();
  }
  c.restore();
}
// icicles along the window tops (winter; the ice cabin in the tunnel) — they grow, then drip away
function drawIcicles(c, t) {
  if (!ok('fx_icicle')) return;
  for (const w of WINS) {
    const side = w.side, k = side === 'L' && t >= T_TUNNEL[0] + 1 && t < T_TUNNEL[1] ? smooth((t - T_TUNNEL[0] - 1) / 3) * (1 - smooth((t - T_TUNNEL[1] + 1.5) / 1.5))
      : smooth((t - (side === 'L' ? 3.5 : 6)) / 3) * (1 - smooth((t - 13) / 4));
    if (k <= .02) continue;
    const [x0, y0, x1] = w.box, n = Math.max(1, Math.round((x1 - x0) / 70));
    for (let i = 0; i < n; i++) {
      const x = x0 + (i + .5) * (x1 - x0) / n, s = (40 + hash(i + x0) * 50) * k * Math.min(1, (x1 - x0) / 200 + .4);
      c.globalAlpha = .9; c.drawImage(IMG.fx_icicle, x - s * .3, y0 - s * .15, s * .6, s);
    }
  }
  c.globalAlpha = 1;
}

// ---------------------------------------------------------------- tunnel: the carriage splits in two (ice cabin left / fire cabin right)
const SPLIT = 30;
const splitAt = (t) => SPLIT * smooth((t - (T_TUNNEL[0] + 1.2)) / 1.6) * (1 - smooth((t - (T_TUNNEL[1] - 1.2)) / 1.4));
let SEAM_CV = null;
function drawSeam(c, s, t, tv) {   // the gap between the two cabins: a soft, wide frosted-air seam (no hard pole), ice light left, fire light right
  if (s < .5) return;
  const k = s / SPLIT, x0 = W / 2 - s - 110, x1 = W / 2 + s + 110;
  // no hole between the cabins (critic 2026-11-11: it read as a blue divider pole): the car's own middle strip fills the gap, and a soft
  // band of light (ice blue left, fire orange right, white in the middle) glows over it, fading out ±(gap + 140 px) and at ceiling / floor
  const gx0 = W / 2 - s - 1, gw = 2 * s + 2; c.drawImage(car, gx0, 0, gw, H, gx0, 0, gw, H);
  { c.save(); c.globalCompositeOperation = 'screen'; const R = s + 140, lg = c.createLinearGradient(W / 2 - R, 0, W / 2 + R, 0);
    lg.addColorStop(0, 'rgba(120,190,255,0)'); lg.addColorStop(.38, `rgba(150,205,255,${.3 * k})`); lg.addColorStop(.5, `rgba(235,240,255,${.38 * k})`); lg.addColorStop(.62, `rgba(255,170,100,${.3 * k})`); lg.addColorStop(1, 'rgba(255,150,80,0)');
    c.fillStyle = lg; c.fillRect(W / 2 - R, 0, 2 * R, H); c.restore(); }
  const sc = SEAM_CV || (SEAM_CV = document.createElement('canvas')); sc.width = Math.ceil(x1 - x0); sc.height = 270; const q = sc.getContext('2d');
  c.save();
  const g = q.createLinearGradient(0, 0, sc.width, 0);
  g.addColorStop(0, 'rgba(150,215,255,0)'); g.addColorStop(.36, `rgba(170,225,255,${.34 * k})`); g.addColorStop(.5, `rgba(250,246,255,${.42 * k})`);
  g.addColorStop(.64, `rgba(255,175,110,${.34 * k})`); g.addColorStop(1, 'rgba(255,160,90,0)');   // a bright band of light over the gap's edges (no seam)
  q.fillStyle = g; q.fillRect(0, 0, sc.width, sc.height);
  const v = q.createLinearGradient(0, 0, 0, sc.height); v.addColorStop(0, 'rgba(0,0,0,.6)'); v.addColorStop(.25, 'rgba(0,0,0,0)'); v.addColorStop(.8, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.5)');
  q.globalCompositeOperation = 'destination-out'; q.fillStyle = v; q.fillRect(0, 0, sc.width, sc.height);   // the glow fades out at the ceiling and the floor
  c.drawImage(sc, x0, 0, x1 - x0, H);
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 40; i++) {   // frost sparkles drift right, embers drift left, crossing the seam and fading as they leave their cabin
    const ice = i % 2 === 0, ph = (tv * (.09 + hash(i) * .08) + hash(i + 3)) % 1, x = ice ? lerp(W / 2 - 160, W / 2 + 120, ph) : lerp(W / 2 + 160, W / 2 - 120, ph);
    const y = H * (.15 + .7 * hash(i + 7)) + Math.sin(tv * 1.3 + i) * 18 - (ice ? 0 : 40 * ph), a = k * .75 * Math.sin(Math.PI * ph);
    c.fillStyle = ice ? `rgba(225,245,255,${a})` : `rgba(255,190,120,${a})`; c.beginPath(); c.arc(x, y, 1.6 + hash(i + 9) * 2.4, 0, 7); c.fill();
  }
  c.restore();
}

// ---------------------------------------------------------------- hologram screen, toys, lamp, vents, tea
const SCR = { x: G.screen[0], y: G.screen[1], w: G.screen[2], h: G.screen[3] };
const ICON = { winter: '❄', summer: '☀', storm: '🌧', tunnel: '🧊🔥', chaos: '🌀', spring: '🌸' };
function drawHolo(c, t, tv, th) {
  const dim = powerDim(t), on = 1 - dim; if (on <= .02) return;
  c.save(); c.beginPath(); c.rect(SCR.x, SCR.y, SCR.w, SCR.h); c.clip();
  const flick = (.9 + .1 * Math.sin(tv * 31) * Math.sin(tv * 7)) * on * (chaosOn(t) && hash(Math.floor(tv * 3)) > .8 ? .6 : 1);
  c.globalAlpha = flick; c.fillStyle = 'rgba(14,70,96,.92)'; c.fillRect(SCR.x, SCR.y, SCR.w, SCR.h);
  const ln = lineNow(t), holo = ln && ln.where === 'holo';
  let gx = 0; if (chaosOn(t) && hash(Math.floor(tv * 14)) > .75) gx = (hash(Math.floor(tv * 14) + 3) - .5) * 30;
  // the conductor stays on the hologram for the whole ride (critic 2026-11-11: she was only there while speaking, so most frames had
  // no one in them); she leaves it only while she is in person (aisle / your ear). Between lines: listening, a small season icon in the corner
  const away = (ln && ln.where !== 'holo') || AISLE.some((ap) => t >= ap.t0 - .2 && t <= ap.t1 + .2) || (t >= A.silence[0] && t < A.silence[1] + .5);
  if (FIG.holo && !away) {
    drawFig(c, 'holo', SCR.x + SCR.w / 2, SCR.y + SCR.h * 1.9, SCR.h * 2.3, { talk: holo ? ln.e : 0, alpha: (holo ? .95 : .82) * Math.max(.75, flick), tv });   // a big bust: the face fills the screen
    if (!holo) { c.textAlign = 'center'; c.textBaseline = 'middle'; c.globalAlpha = .9 * flick; c.font = `${Math.round(SCR.h * .2)}px "Apple Color Emoji","Noto Color Emoji",sans-serif`; c.fillText(ICON[segAt(t).key] || '🚂', SCR.x + SCR.h * .18, SCR.y + SCR.h * .18); c.globalAlpha = flick; }
  } else {   // she is away (in person): the season and where it is warm / cool (icons only: no language needed)
    const seg = segAt(t).key, sl = sideColour(th, 'L'), sr = sideColour(th, 'R');
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = `${Math.round(SCR.h * .5)}px "Apple Color Emoji","Noto Color Emoji",sans-serif`; c.fillText(ICON[seg] || '🚂', SCR.x + SCR.w / 2 + gx, SCR.y + SCR.h * .5);
    c.font = `700 ${Math.round(SCR.h * .3)}px Inter, sans-serif`;
    for (const [sc, x, arrow] of [[sl, SCR.x + SCR.w * .14, '◀'], [sr, SCR.x + SCR.w * .86, '▶']]) {
      if (sc.v < .05) continue; c.fillStyle = sc.c >= sc.h ? `rgba(140,210,255,${.4 + .6 * sc.v})` : `rgba(255,150,70,${.4 + .6 * sc.v})`; c.fillText(arrow, x + gx, SCR.y + SCR.h * .5);
    }
  }
  c.globalCompositeOperation = 'source-over';   // scanlines + cyan sheen
  c.globalAlpha = .2 * on; c.fillStyle = '#021018'; for (let y = SCR.y + ((tv * 40) % 4); y < SCR.y + SCR.h; y += 4) c.fillRect(SCR.x, y, SCR.w, 1.5);
  c.globalCompositeOperation = 'screen'; c.globalAlpha = .22 * flick; c.fillStyle = '#4fd8ff'; c.fillRect(SCR.x, SCR.y, SCR.w, SCR.h);
  c.restore();
  // the projector beam from the crystal lens above
  c.save(); c.globalCompositeOperation = 'lighter'; const lx = SCR.x + SCR.w / 2, ly = SCR.y - 18;
  const g = c.createLinearGradient(0, ly, 0, SCR.y + SCR.h * .4); g.addColorStop(0, `rgba(120,230,255,${.28 * flick})`); g.addColorStop(1, 'rgba(120,230,255,0)');
  c.fillStyle = g; c.beginPath(); c.moveTo(lx - 6, ly); c.lineTo(lx + 6, ly); c.lineTo(SCR.x + SCR.w * .95, SCR.y + SCR.h * .4); c.lineTo(SCR.x + SCR.w * .05, SCR.y + SCR.h * .4); c.closePath(); c.fill();
  c.restore();
}
// roof-hatch toys on springs (damped spring: they pop down, bounce, settle; retract at the end of their season)
function spring(dt0, out) { if (dt0 < 0) return 0; const x = 1 - Math.exp(-dt0 * 3.2) * Math.cos(dt0 * 11); return out ? x : x; }
function drawToys(c, t, tv) {
  const toys = [['toy_snowman', G.hatches[0], 6.4, 11.6, 0], ['toy_sun', G.hatches[1], 14.6, 36.0, 1]];
  for (const [name, [hx, hy], t0, t1, spin] of toys) {
    if (!ok(name) || t < t0 || t > t1 + 1.2 || powerDim(t) > .9) continue;
    const down = t < t1 ? spring(t - t0) : Math.max(0, 1 - smooth((t - t1) / 1.0));
    const L = 120 * down, s = 120, y = hy + 30 + L;
    c.save(); c.strokeStyle = '#c9a24a'; c.lineWidth = 3; c.beginPath();   // the spring coil
    for (let k = 0; k <= 16; k++) { const yy = hy + 20 + (L + 10) * k / 16, xx = hx + (k % 2 ? 7 : -7); k ? c.lineTo(xx, yy) : c.moveTo(hx, yy); } c.stroke();
    c.translate(hx, y + s * .5); c.rotate(Math.sin(tv * 2.3) * .08 * down);
    if (spin) { const sp = (A.sources.summer_breeze ? sample(A.sources.summer_breeze.env, A.radarRate, t) : .5); c.rotate(0); c.save(); c.rotate(tv * (2 + 9 * sp)); c.drawImage(IMG[name], -s / 2, -s / 2, s, s); c.restore(); }
    else c.drawImage(IMG[name], -s / 2, -s / 2, s, s);
    c.restore();
  }
}
function lampGlow(c, t, th) {
  const k = interp(A.designed.lamp_left.keys, t) / .35, n = lightWeights(t).night * .6 + lightWeights(t).dusk * .3, v = clamp(Math.max(k, n), 0, 1) * (1 - powerDim(t));
  if (v < .02) return;
  const [x, y] = G.lamp, R = 260;
  c.save(); c.globalCompositeOperation = 'lighter';
  const g = c.createRadialGradient(x, y, 0, x, y, R); g.addColorStop(0, `rgba(255,200,120,${.5 * v})`); g.addColorStop(1, 'rgba(255,200,120,0)');
  c.fillStyle = g; c.fillRect(x - R, y - R, 2 * R, 2 * R); c.restore();
}
function ventAir(c, t, tv) {   // hot air pouring down from the open vents: orange wisps that slow and spread as they fall
  const v = interp(VENT, t) * (1 - powerDim(t)); if (v < .05) return;
  c.save(); c.globalCompositeOperation = 'lighter';
  for (const p of PANELS) {
    if (p.kind !== 'vent') continue;
    const cx = (p.box[0] + p.box[2]) / 2, cy = p.box[3];
    for (let i = 0; i < 7; i++) {
      const life = (tv * .45 + i / 7) % 1, y = cy + 260 * (1 - Math.pow(1 - life, 1.8)), x = cx + Math.sin(tv * 1.7 + i) * 20 * life, r = 30 + 70 * life;
      const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(255,150,70,${.16 * v * Math.sin(Math.PI * life)})`); g.addColorStop(1, 'rgba(255,150,70,0)');
      c.fillStyle = g; c.fillRect(x - r, y - r, 2 * r, 2 * r);
    }
  }
  c.restore();
}
const CUP = { x: 560, y: 1080 - 200, h: 190 };
let teaLift = 0;
function drawTable(c, t, tv) {
  if (ok('props_rest')) c.drawImage(IMG.props_rest, 1230, 1080 - 230, 230 * (584 / 874), 230);
  if (!ok('tea_cup')) return;
  const lift = smooth(teaLift), h = CUP.h * (1 + .35 * lift), w = h * (560 / 535), x = CUP.x - w / 2 + 40 * lift, y = CUP.y - 70 * lift - (h - CUP.h);
  if (lift > .02) {   // warm glow on your hands round the cup
    c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(x + w * .45, y + h * .6, 0, x + w * .45, y + h * .6, w * .9);
    g.addColorStop(0, `rgba(255,170,90,${.35 * lift})`); g.addColorStop(1, 'rgba(255,170,90,0)'); c.fillStyle = g; c.fillRect(x - w, y - h, w * 3, h * 3); c.restore();
  }
  c.drawImage(IMG.tea_cup, x, y, w, h);
  if (!ok('fx_steam') || powerDim(t) > .9) return;
  const n = 4 + Math.round(5 * lift), rich = .14 + .2 * lift + (t >= T_TUNNEL[0] && t < T_TUNNEL[1] ? .08 : 0);
  c.save(); c.globalCompositeOperation = 'screen';
  for (let i = 0; i < n; i++) {   // steam: rises, slows, spreads, drifts with the car's air
    const ph = (tv * .3 + i / n) % 1, sx = x + w * .42 + Math.sin(tv * 1.3 + i * 2) * 14 * ph, sy = y + h * .22 - 170 * (1 - Math.pow(1 - ph, 1.6)), r = 26 + 60 * ph;
    puff(c, sx, sy, r, rich * Math.sin(Math.PI * ph));
  }
  c.restore();
}
function puff(c, x, y, r, a) {   // a soft vapour blob (no hard edge)
  if (a <= .005) return; const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(.55, `rgba(255,255,255,${a * .45})`); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(x - r, y - r, 2 * r, 2 * r);
}
function breath(c, t, tv) {   // your own breath in the cold: a white cloud every ~3.2 s at the bottom of the picture
  const cold = (t < 12.5 ? runeOpen('L', t) * .5 + runeOpen('R', t) * .5 : 0) + (t >= T_TUNNEL[0] + 2 && t < T_TUNNEL[1] ? .6 : 0);
  if (cold < .05 || !ok('fx_steam')) return;
  const ph = (tv % 3.2) / 3.2; if (ph > .55) return;
  const k = ph / .55;
  c.save(); c.globalCompositeOperation = 'screen';
  for (let j = 0; j < 3; j++) puff(c, W / 2 - 60 * k + (j - 1) * 50 * k, H - 40 - 160 * k - j * 20, 70 + 130 * k, .3 * cold * Math.sin(Math.PI * k));
  c.restore();
}

// ---------------------------------------------------------------- the conductor (pose layers from media/layers.js: cut-out, blink, mouth set)
function drawFig(c, view, cx, bottom, height, o = {}) {
  const F = FIG[view]; if (!F || !okI(F.im)) return;
  const k = height / F.c.h, w = F.c.w * k, x0 = cx - w / 2, br = 1 + .008 * Math.sin((o.tv || 0) * Math.PI * 2 / 4);   // breathing ~15 / min
  c.save(); c.globalAlpha = o.alpha ?? 1;
  c.translate(cx, bottom); c.scale(o.flip ? -1 : 1, br); c.translate(-cx, -bottom);
  c.drawImage(F.im, x0, bottom - height, w, height);
  const tv = o.tv || 0;
  if (!(tv - (F.lastDrawn ?? -9) < .25)) F.appear = tv;   // (re)appearing: no blink in the first 0.7 s (guide §6.4)
  if (tv - VIS.last > 0 && tv - VIS.last < .1) VIS.t += tv - VIS.last; VIS.last = tv;
  F.lastDrawn = tv; LAST_FIG = view;
  if (tv > F.blinkAt + 8 || tv < F.blinkAt - 8) F.blinkAt = tv + 1 + Math.random() * 3;   // after a seek / pause
  if (tv >= F.blinkAt && tv - F.appear > .7) { F.blinkTo = tv + .11 + Math.random() * .04; BLINKS.push([tv, F.blinkTo, view, VIS.t]); F.blinkAt = tv + (Math.random() < .15 ? .32 : 2 + Math.random() * 4); }
  if (API_DEBUG && API_DEBUG.blink != null) F.blinkTo = API_DEBUG.blink ? tv + 1 : 0;
  const at = (p) => [x0 + p.rect[0] * k, bottom - height + p.rect[1] * k, p.rect[2] * k, p.rect[3] * k];
  if (tv < F.blinkTo) for (const p of F.eyes) if (okI(p.im)) c.drawImage(p.im, ...at(p));
  const e = o.talk || 0, lv = e < .12 ? 0 : e < .55 ? 1 : e < .85 ? 2 : 3, mp = F.mouth[Math.min(lv, F.mouth.length - 1)];
  if (mp && lv > 0 && okI(mp.im)) c.drawImage(mp.im, ...at(mp));
  F.state = { lv, e, blink: tv < F.blinkTo, tv };
  c.restore();
}
// MoHeatLayers-compatible test API (tools/art/check_mouth.js / check_motion.js): this page draws its own conductor layers (no parallax:
// the figure sits still in the carriage; the scenery moves behind the glass), so check the same mouth / blink / breathing rules here.
let LAST_FIG = null, API_DEBUG = null; const BLINKS = [], VIS = { t: 0, last: -1 };
const VIEW_STEM = Object.fromEntries(Object.entries(LY).map(([stem, v]) => [v.view, stem]));
const curView = () => { const ln = lineNow(lastT), w = ln && { holo: 'holo', ear: 'ear', aisle: 'wave' }[ln.where]; if (w) return w;
  return LAST_FIG && FIG[LAST_FIG]?.state && tvClock - FIG[LAST_FIG].state.tv < .3 ? LAST_FIG : 'none'; };
window.MoHeatLayers = {
  live: true,
  get debug() { return API_DEBUG; }, set debug(v) { API_DEBUG = v; if (!v) for (const F of Object.values(FIG)) { F.state = null; F.blinkTo = 0; } },
  render(stem) {
    const v = LY[stem]; if (!v || !okI(FIG[v.view]?.im)) return null;
    const g = document.createElement('canvas'); g.width = W; g.height = H; const x = g.getContext('2d');
    x.fillStyle = API_DEBUG?.solid ? '#ff00ff' : '#0e4660'; x.fillRect(0, 0, W, H);
    const P = [v.char.x * W, v.char.y * H, v.char.height * H];   // the placement media/layers.js declares (check_motion crops its eye shots from it)
    drawFig(x, v.view, P[0], P[1], P[2], { tv: tvClock, alpha: 1 }); return g;
  },
  state() { const view = curView(), f = view !== 'none' && FIG[view]?.state, st = (f && tvClock - f.tv < .3 && f) || { lv: 0, e: 0, blink: false }, ln = lineNow(lastT), e = ln ? ln.e : 0;
    return { mouth: st.lv > 0 ? 1 : 0, open: st.lv > 0, level: st.lv, tgt: e, rel: e, env: e, blink: st.blink, view, stem: VIEW_STEM[view] || '', speaker: null, figs: null,
      patches: view !== 'none' ? (LY[VIEW_STEM[view]]?.patches || []).map((p) => p.kind) : [] }; },
  motion() { const view = curView(), f = view !== 'none' && FIG[view]?.state, st = f && tvClock - f.tv < .3 && f; return { t: tvClock, liveT: tvClock, blink: !!(st && st.blink), blinks: BLINKS.slice(-400),
    breath: 0, phase: (tvClock * Math.PI * 2 / 4) % (Math.PI * 2), view, stem: VIEW_STEM[view] || '', draw: null, live: true }; },
};
// in person in the aisle, right behind your table (cut at the knees by the table edge): the tea, the storm lamp, "next stop, spring!", goodbye
const TABLE_Y = 946;
const AISLE = [{ t0: 7.6, t1: 12.0, x: .62, gate: 'tea' }, { t0: 37.1, t1: 41.9, x: .4 }, { t0: 126.0, t1: 130.4, x: .6 }, { t0: 145.6, t1: 999, x: .6 }];
function aisleFigure(c, t, tv) {
  const ln = lineNow(t);
  for (const ap of AISLE) {
    const hold = ap.gate && gate.cur && gate.cur.id === ap.gate;
    if (!hold && (t < ap.t0 || t > ap.t1)) continue;
    const a = hold ? 1 : smooth((t - ap.t0) / .45) * (1 - smooth((t - (ap.t1 - .45)) / .45)); if (a <= .01) continue;
    const hop = Math.sin(Math.PI * clamp((t - ap.t0) / .5, 0, 1)) * 40 * (hold ? 0 : 1), x = W * ap.x;
    if (a < .98) {   // pop-in / pop-out sparkle
      c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(x, H * .62, 0, x, H * .62, 260 * (1.2 - a));
      g.addColorStop(0, `rgba(255,236,190,${.7 * (1 - a)})`); g.addColorStop(1, 'rgba(255,236,190,0)'); c.fillStyle = g; c.fillRect(x - 320, H * .62 - 320, 640, 640); c.restore();
    }
    drawFig(c, 'wave', x, H * 1.0 - hop, H * .5, { talk: ln && ln.where === 'aisle' ? ln.e : 0, alpha: a, tv });
  }
  c.save(); c.beginPath(); c.rect(0, TABLE_Y, W, H - TABLE_Y + 40); c.clip(); c.drawImage(car, 0, 0); c.restore();   // the table stays in front of it
}
function conductorInPerson(c, t, tv) {
  const ln = lineNow(t), [s0, s1] = A.silence;
  // the power cut: a spark leaves the dead screen and becomes the conductor at your right ear (warm voice)
  const waiting = gate.cur && gate.cur.id === 'spring';
  if ((t >= s0 + .1 && t < s1 + .5) || waiting) {
    const fly = smooth((t - s0 - .1) / .8), back = waiting ? 0 : smooth((t - (s1 - .2)) / .6);
    if (fly < 1) {   // the spark flying from the screen to your ear
      const x = lerp(SCR.x + SCR.w / 2, W * .9, fly), y = lerp(SCR.y + SCR.h / 2, H * .55, fly) - Math.sin(Math.PI * fly) * 120;
      c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(x, y, 0, x, y, 90); g.addColorStop(0, 'rgba(255,230,170,.95)'); g.addColorStop(1, 'rgba(255,170,90,0)');
      c.fillStyle = g; c.fillRect(x - 90, y - 90, 180, 180); c.restore();
    }
    const a = smooth((fly - .85) / .15) * (1 - back), pop = 1 - .12 * (1 - smooth((t - s0 - .8) / .35));
    if (a > .01) {
      c.save(); c.globalCompositeOperation = 'lighter'; const gx = W * .86, gy = H * .55, g = c.createRadialGradient(gx, gy, 0, gx, gy, 520);   // its own warm glow in the dark
      g.addColorStop(0, `rgba(255,170,90,${.32 * a})`); g.addColorStop(1, 'rgba(255,170,90,0)'); c.fillStyle = g; c.fillRect(gx - 520, gy - 520, 1040, 1040); c.restore();
      drawFig(c, 'ear', W * .83 + 60 * (1 - a), H * 1.06, H * 1.0 * pop, { talk: ln && ln.where === 'ear' ? ln.e : 0, alpha: a, tv });
    }
  }
}

// ---------------------------------------------------------------- particles in the car
let parts = [];
function spawn(o) { if (parts.length < 400) parts.push(o); }
function updateParts(dt) {
  for (const q of parts) { q.life += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += (q.g || 0) * dt; q.vx *= (1 - (q.drag || 0) * dt); q.rot += (q.spin || 0) * dt; }
  parts = parts.filter((q) => q.life < q.max);
}
function drawParts(c) {
  for (const q of parts) {
    const k = q.life / q.max, a = Math.sin(Math.PI * Math.min(1, k * 1.3)) * q.a;
    if (q.mist) {   // soft see-through mist: a radial gradient, never an opaque sprite disc (critic 2026-11-11: flat white cloud discs at the window)
      const s = q.size * (1 + k * q.grow) / 2; c.save(); const g = c.createRadialGradient(q.x, q.y, 0, q.x, q.y, s);
      g.addColorStop(0, `rgba(238,244,255,${.32 * a})`); g.addColorStop(.55, `rgba(230,238,250,${.14 * a})`); g.addColorStop(1, 'rgba(230,238,250,0)');
      c.fillStyle = g; c.fillRect(q.x - s, q.y - s, 2 * s, 2 * s); c.restore(); continue;
    }
    if (!ok(q.img)) continue;
    c.save(); c.globalAlpha = a; if (q.blend) c.globalCompositeOperation = q.blend; else if (q.add) c.globalCompositeOperation = 'lighter';
    c.translate(q.x, q.y); c.rotate(q.rot); const s = q.size * (q.grow ? 1 + k * q.grow : 1); c.drawImage(IMG[q.img], -s / 2, -s / 2, s, s); c.restore();
  }
}
const winPt = (side) => { const ws = WINS.filter((w) => w.side === side); const w = ws[Math.floor(Math.random() * ws.length)] || { box: [0, 0, W / 2, H] }; return [lerp(w.box[0], w.box[2], .2 + Math.random() * .6), lerp(w.box[1], w.box[3], .2 + Math.random() * .6)]; };
let cueDone = new Set();
function emitFx(t, dt) {
  if (dt <= 0 || inSilence(t)) return;
  for (const q of A.cues) {
    if (q.kind !== 'steam' || cueDone.has(q.t) || t < q.t || t > q.t + .5) continue;
    cueDone.add(q.t);
    for (let i = 0; i < 10; i++) { const [x, y] = winPt(q.side); spawn({ mist: true, img: 'fx_steam', x, y, vx: (q.side === 'L' ? 1 : -1) * (80 + Math.random() * 160), vy: -30 - Math.random() * 50, drag: .8, size: 160 + Math.random() * 120, grow: 1.2, rot: Math.random() * 6, spin: .3, life: 0, max: 2.4, a: .55 }); }
  }
  for (const s of [90.2, A.silence[1] + .1]) if (t >= s && !cueDone.has(s) && t < s + .5) { cueDone.add(s); spawn({ img: 'fx_season_swirl', x: W / 2, y: 560, vx: 0, vy: 0, size: 300, grow: 1.4, rot: 0, spin: 4, life: 0, max: 2.4, a: .9, blend: 'screen' }); }
  const seg = segAt(t).key, R = (rate) => Math.random() < dt * rate, boost = (side) => (win.side === side && t >= 66 && t < T_TUNNEL[1] ? 2.2 : 1);
  if (seg === 'spring' && t > T_SPRING && R(4)) { const [x, y] = winPt(Math.random() < .5 ? 'L' : 'R'); spawn({ img: 'fx_sakura_petal', x, y, vx: (x < W / 2 ? 1 : -1) * (60 + Math.random() * 90), vy: 30 + Math.random() * 40, size: 26 + Math.random() * 18, rot: Math.random() * 6, spin: 2, life: 0, max: 6, a: .95 }); }
  if (seg === 'winter') for (const side of ['L', 'R']) if (R(1.6 * runeOpen(side, t))) { const [x, y] = winPt(side); spawn({ img: 'fx_snowflake', x, y, vx: (side === 'L' ? 1 : -1) * (40 + Math.random() * 60), vy: 40, size: 24 + Math.random() * 20, rot: 0, spin: 1, life: 0, max: 3, a: .7, add: true }); }
  if (seg === 'tunnel') {
    if (R(3 * boost('L'))) { const [x, y] = winPt('L'); spawn({ img: Math.random() < .5 ? 'fx_ice_crystal' : 'fx_snowflake', x, y, vx: 60 + Math.random() * 80, vy: 20, size: 30 + Math.random() * 30, rot: 0, spin: 1.5, life: 0, max: 2, a: .8, add: true }); }
    if (R(3 * boost('R'))) { const [x, y] = winPt('R'); spawn({ img: Math.random() < .5 ? 'fx_flame' : 'fx_lava_bubble', x, y: y + 60, vx: -(40 + Math.random() * 60), vy: -70, drag: .5, size: 30 + Math.random() * 26, rot: 0, life: 0, max: 1.4, a: .8, add: true }); }
  }
  if (t > 145.5 && t < 147.5 && R(6)) spawn({ img: 'fx_star', x: W * .2 + Math.random() * W * .6, y: 150 + Math.random() * 300, vx: 0, vy: 15, size: 30 + Math.random() * 30, rot: 0, spin: 2, life: 0, max: 1.2, a: .9, add: true });
}

// ---------------------------------------------------------------- voices (Web Audio: the subtitle language; holo = front, ear = right ear, aisle = front)
const LANG = () => (window.MoHeatSub && ['en', 'ja', 'zh'].includes(window.MoHeatSub.lang) ? window.MoHeatSub.lang : 'en');   // subtitle / UI language
const voiceLang = () => { const l = window.MoHeatVoice?.lang() || LANG(); return VO.lines.a1.dur[l] ? l : 'ja'; };   // user 2026-11-09 (latest): the voice follows the subtitle language (ja / en / zh), ja fallback; the MP4 stays Japanese
let ac = null; const BUF = {}; let playingLine = null;
function audio() { if (!ac) { const C = window.AudioContext || window.webkitAudioContext; ac = new C(); } if (ac.state === 'suspended') ac.resume().catch(() => {}); return ac; }
function loadLang(l) {
  for (const id of Object.keys(VO.lines)) {
    const k = `${id}.${l}`; if (BUF[k]) continue;
    BUF[k] = fetch(`media/voice/${k}.m4a`).then((r) => r.arrayBuffer()).then((b) => audio().decodeAudioData(b)).then((d) => (BUF[k] = d)).catch(() => (BUF[k] = null));
  }
}
function startLine(id, offset) {
  let l = voiceLang(), buf = BUF[`${id}.${l}`];
  if (!buf || buf instanceof Promise) { l = 'ja'; buf = BUF[`${id}.ja`]; }   // that language not decoded yet: Japanese if (!buf || buf instanceof Promise) return;
  const a = audio(), src = a.createBufferSource(), g = a.createGain(), where = VO.lines[id].where;
  src.buffer = buf; g.gain.value = where === 'ear' ? 1.0 : where === 'holo' ? .85 : .9;
  const pan = a.createStereoPanner(); pan.pan.value = where === 'ear' ? .9 : 0;
  src.connect(g).connect(pan).connect(a.destination);
  src.start(0, Math.max(0, offset));
  stopLine(); playingLine = { id, l, src, at: a.currentTime - Math.max(0, offset), dur: buf.duration };
  src.onended = () => { if (playingLine && playingLine.src === src) playingLine = null; };
  showSub(id, l);
}
function stopLine() { if (playingLine) { try { playingLine.src.stop(); } catch {} playingLine = null; } hideSub(); }
function lineNow(t) {   // { id, where, e } of the line being spoken right now (render: by film time, English)
  if (LINEAR) {
    for (const [id, L] of Object.entries(VO.lines)) { const p = t - L.t, d = L.dur.ja; if (p >= 0 && p < d) return { id, where: L.where, e: envAt(id, 'ja', p), pos: p }; }
    return null;
  }
  if (!playingLine || !ac) return null;
  const p = ac.currentTime - playingLine.at; if (p < 0 || p > playingLine.dur) return null;
  return { id: playingLine.id, where: VO.lines[playingLine.id].where, e: envAt(playingLine.id, playingLine.l, p), pos: p };
}
const envAt = (id, l, p) => { const e = VO.lines[id].env[l] || []; return sample(e, VO.rate, p) || 0; };
const fired = new Set();
let linearSub = null;
function voiceTick(t, lastT, playing) {
  // the home page's player (?embed): the voices are in the mix, no startLine() runs — the subtitle follows the film time instead
  if (LINEAR && !RENDER && !COVERART) { const cur = lineNow(t), id = cur ? cur.id : null; if (id !== linearSub) { linearSub = id; if (id) showSub(id); else hideSub(); } return; }
  if (LINEAR || !playing) return;
  for (const [id, L] of Object.entries(VO.lines)) {
    if (fired.has(id)) continue;
    if (lastT <= L.t && t > L.t && t - L.t < .6) { fired.add(id); startLine(id, t - L.t); }
  }
}
function voiceSeek(t) {   // after a jump: re-arm the lines ahead, stop the one playing
  stopLine(); fired.clear();
  for (const [id, L] of Object.entries(VO.lines)) if (L.t < t) fired.add(id);
}
// subtitles: the shown line in ja + en (shared/subs.js picks the language; zh from l10n.js)
const subsEl = $('subs');
function showSub(id) { const L = VO.lines[id]; if (!subsEl) return; subsEl.innerHTML = `<div class="line"><span class="ja"><span class="who A">車掌</span>${L.text.ja}</span><span class="en"><span class="who A">Conductor</span>${L.text.en}</span></div>`; subsEl.classList.add('show'); }   // speaker name (critic 2026-11-11); zh / ko from l10n.js names
function hideSub() { if (subsEl) { subsEl.innerHTML = ''; subsEl.classList.remove('show'); } }

// ---------------------------------------------------------------- gates (interactive default; shared/shell.js answers them in pure mode)
const GATES = [
  { id: 'tea', t: 11.0, after: 'a2' },
  { id: 'window', t: 66.2, after: 'a5' },
  { id: 'spring', t: 125.6, after: 'a7' },
];
const gate = { cur: null, done: new Set(), holdT: 0, holding: false, el: null, shownAt: 0 };
const win = { side: null };
const gateBox = $('gate');
const GIVE_UP = 25;
function gateHTML(id) {
  if (id === 'tea') return `<div class="act"><p class="ask"><span class="ja">あったかい紅茶で、手をあたためよう</span><span class="en">Warm your hands on the tea</span></p>
    <button class="act-btn hold" type="button" data-auto><i>☕</i><b>ながおしで、カップを持つ</b><span>Press and hold the cup</span></button><div class="meter"><i></i></div></div>`;
  if (id === 'window') return `<div class="choices"><p class="ask"><span class="ja">どっちの窓を開ける？</span><span class="en">Which window will you open?</span></p>
    <button class="ch" type="button" data-side="L" data-voice="left|ice|cold|ひだり|左|こおり|氷|左边|冰"><b>❄ ひだりの窓（氷）</b><span>❄ LEFT window · ice</span></button>
    <button class="ch" type="button" data-side="R" data-voice="right|fire|hot|みぎ|右|ほのお|炎|右边|火"><b>🔥 みぎの窓（炎）</b><span>🔥 RIGHT window · fire</span></button></div>`;
  return `<div id="micGate"><p class="ask"><span class="ja">いっしょに「春！」ってさけんで</span><span class="en">Shout “Spring!” with the conductor</span></p>
    <button type="button" data-voice="spring|haru|はる|春|春天|チュンティエン"><b>🌸「春！」</b><span>🌸 “Spring!”</span></button></div>`;
}
const stageWait = (on) => $('stage').classList.toggle('ix-wait', on);
function openGate(g) {
  gate.cur = g; gate.holdT = 0; gate.holding = false; gate.shownAt = 0;
  stageWait(true); media.pause(); gate.pausedForGate = true;   // .ix-wait as in shared/interact.js: a pause by the story, not by the viewer (shell.js)
}
function showGate() {
  const g = gate.cur; gateBox.innerHTML = gateHTML(g.id); gateBox.hidden = false; gate.shownAt = performance.now();
  window.MoHeatSub?.set?.(window.MoHeatSub.lang);   // translate the new answer buttons
  if (g.id === 'tea') {
    const b = gateBox.querySelector('.act-btn');
    const on = (v) => (e) => { e.preventDefault(); gate.holding = v; b.classList.toggle('holding', v); };
    b.addEventListener('pointerdown', on(true)); for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, on(false));
    b.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); gate.holding = true; } });
    b.addEventListener('keyup', () => { gate.holding = false; });
  } else if (g.id === 'window') {
    gateBox.querySelectorAll('.ch').forEach((b) => b.addEventListener('click', () => { win.side = b.dataset.side; closeGate(true, b.dataset.side === 'L' ? ['ひだりの窓が開いた！', 'The LEFT window slides open!'] : ['みぎの窓が開いた！', 'The RIGHT window slides open!']); }));
  } else {
    gateBox.querySelector('button').addEventListener('click', () => { springFlash = performance.now(); closeGate(true, ['「春！」', '“Spring!”']); });
  }
}
function closeGate(okk, msg) {
  const g = gate.cur; if (!g) return;
  gate.done.add(g.id); gate.cur = null; gateBox.innerHTML = ''; gateBox.hidden = true;
  if (g.id === 'window' && !win.side) win.side = 'L';
  if (okk && msg) pop(...msg);
  setTimeout(() => { stageWait(false); media.play().catch(() => {}); }, okk ? 500 : 0);
}
function pop(ja, en) {
  const d = document.createElement('div'); d.className = 'pop'; d.innerHTML = `<span class="ja">${ja}</span><span class="en">${en}</span>`;
  $('stage').appendChild(d); window.MoHeatSub?.set?.(window.MoHeatSub.lang); setTimeout(() => d.remove(), 1600);
}
let springFlash = 0;
function gateTick(t, lastT, playing, dt) {
  if (LINEAR) return;
  if (!gate.cur) {
    if (playing && !window.MoHeatScrubbing) for (const g of GATES) if (!gate.done.has(g.id) && lastT < g.t && t >= g.t && t - lastT < .6) { openGate(g); break; }
    return;
  }
  const g = gate.cur;
  if (!gate.shownAt) { const speaking = playingLine && playingLine.id === g.after; if (!speaking) showGate(); return; }
  if (QS.has('auto') && (performance.now() - gate.shownAt) / 1000 > 1.2) {   // ?auto=1 (QA drivers): answer like a player (alt=1: the other window)
    if (g.id === 'tea') gate.holding = true;
    else if (g.id === 'window') gateBox.querySelectorAll('.ch')[QS.has('alt') ? 1 : 0]?.click();
    else gateBox.querySelector('button')?.click();
    if (!gate.cur) return;
  }
  if (g.id === 'tea') {
    if (gate.holding) gate.holdT += dt;
    teaLift = clamp(teaLift + (gate.holding ? dt * 2 : -dt * 1.5), 0, 1);
    const m = gateBox.querySelector('.meter i'); if (m) m.style.width = `${clamp(gate.holdT / 2.5, 0, 1) * 100}%`;
    if (gate.holdT >= 2.5) closeGate(true, ['あったか〜い', 'So warm~']);
  }
  if ((performance.now() - gate.shownAt) / 1000 > GIVE_UP) closeGate(false);
}

// ---------------------------------------------------------------- frame
const cv = $('scene'), ctx = cv.getContext('2d');
let lastT = 0, lastFrame = performance.now(), tvClock = 0;
function rock(t) {
  const ph = posAt(t) / 1.05, f = ph - Math.floor(ph), sp = speed(t);
  return { y: (Math.exp(-f * 1.05 / .06) * 3 + Math.sin(t * 1.7) * 1.2) * sp, r: Math.sin(t * .9) * .0012 * sp };
}
function thermalEdges(c, th) {
  for (const [side, cl, h] of [[-1, th.Lc, th.Lh], [1, th.Rc, th.Rh]]) {
    for (const [v, col] of [[cl, '70,170,255'], [h, '255,110,50']]) {
      if (v < .02) continue; const x0 = side < 0 ? 0 : W, x1 = side < 0 ? 380 : W - 380;
      const g = c.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, `rgba(${col},${.22 * v})`); g.addColorStop(1, `rgba(${col},0)`);
      c.fillStyle = g; c.fillRect(Math.min(x0, x1), 0, 380, H);
    }
  }
}
function glitch(c, t, tv) {   // seasons out of control: a short stylised signal tear now and then (≤ .25 s every ~2.5 s)
  if (!chaosOn(t) || QS.has('clean') || window.MoHeatPlay?.reduced) return;
  const slot = Math.floor(tv / 2.5), ph = tv - slot * 2.5 - hash(slot) * 1.5; if (ph < 0 || ph > .25) return;
  c.save();
  for (let i = 0; i < 2; i++) {
    const y = (.2 + .5 * hash(slot * 3 + i)) * H, h = 26 + 40 * hash(slot * 5 + i), dx = (i ? -1 : 1) * 22;
    c.drawImage(cv, 0, y, W, h, dx, y, W, h);
    c.fillStyle = i ? 'rgba(255,60,200,.18)' : 'rgba(60,240,255,.18)'; c.fillRect(0, y, W, h);
  }
  c.fillStyle = 'rgba(0,0,0,.14)'; for (let y = 0; y < H; y += 4) c.fillRect(0, y, W, 2);
  c.restore();
}
function frame(t, dt, thOut) {
  const c = ctx, rk = rock(t), tv = tvClock, th = thOut || thermalAt(t);
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
  c.save(); c.translate(W / 2, H / 2 + rk.y); c.rotate(rk.r); c.scale(1.012, 1.012); c.translate(-W / 2, -H / 2);
  const s = splitAt(t);
  drawCar(t, th, tv);
  for (const side of ['L', 'R']) {
    c.save(); c.translate(side === 'L' ? -s : s, 0);
    c.beginPath(); const b = BOX[side]; c.rect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0); c.clip();
    const { cur, prev, a } = lookAt(side, t);
    if (prev) drawLook(c, prev, side, t, tv, 1);
    drawLook(c, cur, side, t, tv, prev ? a : 1);
    drawShield(c, side, t);
    drawSash(c, side, t);
    const fl = lightning(side, t); if (fl > .01) { c.fillStyle = `rgba(245,248,255,${.8 * fl})`; c.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0); }
    c.drawImage(car, b.x0, 0, b.x1 - b.x0, H, b.x0, 0, b.x1 - b.x0, H);
    frameGlow(c, th, t, side);
    c.restore();
  }
  drawSeam(c, s, t, tv);
  drawIcicles(c, t);
  drawHolo(c, t, tv, th);
  drawToys(c, t, tv);
  lampGlow(c, t, th);
  ventAir(c, t, tv);
  if (!splitAt(t)) aisleFigure(c, t, tv);
  drawTable(c, t, tv);
  breath(c, t, tv);
  emitFx(t, dt); updateParts(dt); drawParts(c);
  conductorInPerson(c, t, tv);
  if (springFlash && performance.now() - springFlash < 900) { c.fillStyle = `rgba(255,250,240,${.7 * (1 - (performance.now() - springFlash) / 900)})`; c.fillRect(0, 0, W, H); }
  c.restore();
  glitch(c, t, tv);
  if (!QS.has('clean') && !COVERART) thermalEdges(c, th);
}

// ---------------------------------------------------------------- thermal: the DUAL CSV + interactions + the conductor's voice in person
function thermalOut(t) {
  let th = thermalAt(t + offsetMs / 1000);
  if (gate.cur && gate.cur.id === 'tea') {   // the winter cold stays (×.6); only the steam of the cup you lift toward your face is felt, faintly (critic 2026-11-11: a cup in the hand does not heat the ears — was .36 both): ≤ .2, the cup is on your left
    th = { Lc: th.Lc * .6, Rc: th.Rc * .6, Lh: Math.max(th.Lh, .2 * smooth(teaLift)), Rh: Math.max(th.Rh, .12 * smooth(teaLift)) };
  } else if (gate.cur) th = { Lc: th.Lc * .5, Rc: th.Rc * .5, Lh: th.Lh * .5, Rh: th.Rh * .5 };   // waiting: the scene lingers, softer
  if (win.side && t >= 66 && t < T_TUNNEL[1]) {   // the window you opened: a real draft, stronger on that side
    const k = smooth((t - 66) / 1.2), up = (v) => Math.min(.95, v * (1 + .3 * k)), dn = (v) => v * (1 - .15 * k);
    th = win.side === 'L' ? { Lc: up(th.Lc), Lh: th.Lh, Rc: dn(th.Rc), Rh: dn(th.Rh) } : { Lc: dn(th.Lc), Lh: dn(th.Lh), Rc: th.Rc, Rh: up(th.Rh) };
  }
  const ln = lineNow(t);
  if (ln && ln.where === 'ear') th = { ...th, Rh: Math.max(th.Rh, (.1 + .8 * ln.e) * .9 * (ln.e > .05 ? 1 : .4)) };          // a voice at your ear is warm
  if (ln && ln.where === 'aisle') { const v = (.1 + .8 * ln.e) * .28 * .5; th = { ...th, Lh: Math.max(th.Lh, v), Rh: Math.max(th.Rh, v) }; }   // in front, ~1 m
  return { Lc: clamp(th.Lc, 0, 1), Rc: clamp(th.Rc, 0, 1), Lh: clamp(th.Lh, 0, .9), Rh: clamp(th.Rh, 0, .9) };
}

// ---------------------------------------------------------------- radar, timeline
const radar = $('radar'), rctx = radar.getContext('2d');
const SRC = A.sources;
function drawRadar(th, t) {
  const c = rctx, w = radar.width, h = radar.height, cx = w / 2, cy = h / 2 + 8, R = 170;
  c.clearRect(0, 0, w, h); c.strokeStyle = '#3a3150'; c.lineWidth = 2;
  for (const r of [.4, .7, 1]) { c.beginPath(); c.arc(cx, cy, R * r, 0, 7); c.stroke(); }
  c.fillStyle = '#8f86a8'; c.font = '18px Inter'; c.textAlign = 'center'; c.fillText('front · hologram', cx, cy - R - 10);
  for (const [sd, cl, hh] of [[-1, th.Lc, th.Lh], [1, th.Rc, th.Rh]]) {
    for (const [v, col, dy] of [[cl, '79,179,255', -12], [hh, '255,122,69', 12]]) {
      const g = c.createRadialGradient(cx + sd * 44, cy + dy, 0, cx + sd * 44, cy + dy, 80); g.addColorStop(0, `rgba(${col},${.8 * v})`); g.addColorStop(1, `rgba(${col},0)`);
      c.fillStyle = g; c.beginPath(); c.arc(cx + sd * 44, cy + dy, 80, 0, 7); c.fill();
    }
    c.fillStyle = Math.max(cl, hh) > .02 ? '#e8e0f4' : '#3a4766'; c.beginPath(); c.roundRect(cx + sd * 44 - 9, cy - 22, 18, 44, 8); c.fill();
  }
  c.fillStyle = '#231a33'; c.strokeStyle = '#8f86a8'; c.beginPath(); c.arc(cx, cy, 34, 0, 7); c.fill(); c.stroke();
  const i = clamp(Math.round(t * A.radarRate), 0, A.duration * A.radarRate), list = [];
  for (const [, s] of Object.entries(SRC)) {
    const e = s.env[i] || 0; if (e < .06) continue;
    const az = s.az[i], r = 50 + (R - 50) * clamp(Math.log(s.d / .4) / Math.log(7 / .4), 0, 1), x = cx + Math.sin(rad(az)) * r, y = cy - Math.cos(rad(az)) * r;
    const col = s.role === 'cool' ? '124,196,255' : s.role === 'heat' ? '255,140,90' : '200,200,220';
    c.fillStyle = `rgba(${col},${.25 + .5 * e})`; c.beginPath(); c.arc(x, y, 12 + 12 * e, 0, 7); c.fill();
    c.font = '22px "Noto Color Emoji", "Apple Color Emoji", sans-serif'; c.globalAlpha = .4 + .6 * e; c.fillText(s.icon, x, y + 8); c.globalAlpha = 1; list.push(s.icon);
  }
  const ln = lineNow(t); if (ln && ln.where !== 'holo') { const x = ln.where === 'ear' ? cx + 70 : cx, y = ln.where === 'ear' ? cy : cy - 90; c.font = '26px "Apple Color Emoji", sans-serif'; c.fillText('🎩', x, y + 9); list.push('🎩'); }
  return list.join(' ');
}
const tl = $('timeline'), tlctx = tl.getContext('2d');
function drawTimeline() {
  const c = tlctx, w = tl.width, h = tl.height, n = TH.Lc.length;
  c.fillStyle = '#120e1c'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * w, bw = w / n + 1;
    for (const [row, cl, hh] of [[0, TH.Lc[i], TH.Lh[i]], [1, TH.Rc[i], TH.Rh[i]]]) {
      const y0 = row ? h / 2 + 1 : 2, hh2 = (h / 2 - 3) / 2;
      if (cl > .02) { c.fillStyle = `rgba(79,179,255,${.15 + .85 * cl})`; c.fillRect(x, y0, bw, hh2); }
      if (hh > .02) { c.fillStyle = `rgba(255,122,69,${.15 + .85 * hh})`; c.fillRect(x, y0 + hh2, bw, hh2); }
    }
  }
  c.fillStyle = 'rgba(255,255,255,.45)'; c.font = '600 14px Inter';
  A.segments.forEach((s, i) => { const x = (s.t0 / A.duration) * w; c.fillRect(x, 0, 1.5, h); c.fillText(String(i + 1), x + 4, 15); });
}
drawTimeline();

// ---------------------------------------------------------------- media / clock / UI
const mix = $('mix'), media = mix, playBtn = $('playBtn');
let previewT = QS.get('t') != null ? +QS.get('t') : null;
if (previewT != null) { $('intro').classList.add('hidden'); mix.addEventListener('play', () => { previewT = null; }, { once: true }); }
const now = () => (previewT != null ? previewT : media.currentTime || 0);
const reset = () => { parts = []; cueDone = new Set(); };
const play = () => { $('intro').classList.add('hidden'); if (previewT != null) { media.currentTime = previewT; previewT = null; } media.play().catch(() => {}); };
const pause = () => media.pause();
const toggle = () => (media.paused ? play() : pause());
playBtn?.addEventListener('click', toggle);
$('startBtn').addEventListener('click', () => {
  media.currentTime = 0; reset(); gate.done.clear(); gate.cur = null; stageWait(false); gateBox.innerHTML = ''; gateBox.hidden = true; win.side = null; teaLift = 0;
  audio(); loadLang('ja'); loadLang(voiceLang()); voiceSeek(0); lastT = 0; play();
});

mix.addEventListener('play', () => { if (playBtn) playBtn.textContent = '❚❚'; });
for (const ev of ['pause', 'ended']) mix.addEventListener(ev, () => { if (playBtn) playBtn.textContent = '▶'; if (!gate.cur) stopOutput(); });
mix.addEventListener('ended', () => { stopLine(); gate.cur = null; stageWait(false); gateBox.hidden = true; });
function seekTo(t) {
  media.currentTime = clamp(t, 0, A.duration); reset(); voiceSeek(t); lastT = t;
  if (gate.cur) { gate.cur = null; stageWait(false); gateBox.innerHTML = ''; gateBox.hidden = true; }
  for (const g of GATES) { if (g.t < t) { gate.done.add(g.id); if (g.id === 'window' && !win.side) win.side = 'L'; } else gate.done.delete(g.id); }
  if (t < 66) win.side = null;
  $('intro').classList.add('hidden');
}
$('timelineWrap').addEventListener('click', (e) => { const r = e.currentTarget.getBoundingClientRect(); seekTo(clamp((e.clientX - r.left) / r.width, 0, 1) * A.duration); if (media.paused && !gate.cur) media.play().catch(() => {}); });
document.addEventListener('keydown', (e) => {
  if (e.target.matches('input, select')) return;
  if (e.code === 'Escape') emergencyStop();
});
document.addEventListener('visibilitychange', () => { if (document.hidden) { pause(); stopOutput(); } });
$('lrBtn').addEventListener('click', () => {
  const a = new (window.AudioContext || window.webkitAudioContext)();
  [[-1, 0], [1, .9]].forEach(([pan, at]) => { for (const [f, d] of [[1318.5, 0], [1760, .14]]) {
    const o = a.createOscillator(), g = a.createGain(), p = new StereoPannerNode(a, { pan });
    o.frequency.value = pan < 0 ? f : f * 1.25; o.connect(g).connect(p).connect(a.destination);
    const t0 = a.currentTime + at + d; g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(.25, t0 + .01); g.gain.exponentialRampToValueAtTime(.001, t0 + .5); o.start(t0); o.stop(t0 + .55);
  } });
  setTimeout(() => a.close(), 1900);
});
const sceneEl = $('sceneTitle'); let segIdx = -1, segTimer = 0;
function updateScene(t) {
  const i = A.segments.indexOf(segAt(t));
  if (i !== segIdx) { segIdx = i; const s = A.scenes[i]; sceneEl.textContent = `${i + 1}　${s[LANG()] || s.en}`; sceneEl.classList.add('show'); clearTimeout(segTimer); segTimer = setTimeout(() => sceneEl.classList.remove('show'), 3200); }
}
// chapters for the UI v2 bar: one per season (shell.js reads DEMO_DATA.anim.scenes for films)

// ---------------------------------------------------------------- device output: DUAL LC LH RC RH (firmware DUAL, cool + warm per ear)
const DEFAULT_RANGE = { heatMin: 0, heatMax: 200, coolMin: 35, coolMax: 80 };
const SEND_INTERVAL = 100, OFF = .03;
const store = { get: (k, d) => { try { return JSON.parse(localStorage.getItem(`moheat.${k}`)) ?? d; } catch { return d; } }, set: (k, v) => { try { localStorage.setItem(`moheat.${k}`, JSON.stringify(v)); } catch {} } };
const range = { ...DEFAULT_RANGE, ...store.get('range', {}) };
let lastSent = '', lastSendAt = 0, tripped = false, offsetMs = +store.get('asmr.offset', 0), intensity = +store.get('asmr.intensity', 100) / 100;
const device = MoHeatDevice.create({ select: $('portSelect'), addBtn: $('addPort'), connectBtn: $('connectBtn'), status: $('deviceStatus') }, { log: (l) => console.log('[MoHeat]', l), onConnect: () => { lastSent = ''; } });
if (!MoHeatDevice.supported) $('deviceStatus').querySelector('span').textContent = 'Web Serial needs desktop Chrome / Edge';
function command(th) {
  if (Math.max(th.Lc, th.Lh, th.Rc, th.Rh) <= OFF) return 'stop';
  const cp = (v) => (v > OFF ? Math.round(range.coolMin + v * (range.coolMax - range.coolMin)) : 0), hp = (v) => (v > OFF ? Math.round(range.heatMin + v * (range.heatMax - range.heatMin)) : 0);
  return `DUAL LC${cp(th.Lc)} LH${hp(th.Lh)} RC${cp(th.Rc)} RH${hp(th.Rh)}`;
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
function updateOutput(th, live) {
  const scaled = Object.fromEntries(Object.entries(th).map(([k, v]) => [k, live && !tripped ? v * intensity : 0]));
  for (const [k, [bar, val]] of Object.entries(meterEls)) { bar.style.width = `${scaled[k] * 100}%`; val.textContent = Math.round(scaled[k] * 100); }
  const cmd = command(scaled); $('cmd').textContent = cmd;
  if (!device.isConnected() || !$('sendOn').checked) return;
  const n = performance.now(); if (cmd !== lastSent && n - lastSendAt >= SEND_INTERVAL) { device.send(cmd); lastSent = cmd; lastSendAt = n; }
}
function loop() {
  const n = performance.now(), dt = clamp((n - lastFrame) / 1000, 0, .05); lastFrame = n;
  const t = now(); if (Math.abs(t - lastT) > .7) { reset(); voiceSeek(t); for (const g of GATES) if (g.t < t - .2) gate.done.add(g.id); }
  const playing = (!media.paused && !media.ended) || previewT != null, waiting = !!gate.cur;
  if (playing || waiting) tvClock += dt;
  voiceTick(t, lastT, playing && !media.seeking);
  gateTick(t, lastT, playing, dt);
  if (!gate.cur) teaLift = Math.max(0, teaLift - dt * .8);
  lastT = t;
  const th = thermalOut(t), live = (playing || waiting) && $('intro').classList.contains('hidden');
  frame(t, playing || waiting ? dt : 0, th);
  const icons = drawRadar(live ? th : { Lc: 0, Lh: 0, Rc: 0, Rh: 0 }, t); updateOutput(th, live); updateScene(t);
  $('posInfo').textContent = `${segAt(t).en}${icons ? ' · ' + icons : ''}`;
  $('playhead').style.left = `${(t / A.duration) * 100}%`;
  window.D04 = { t, th, gate: gate.cur && gate.cur.id, win: win.side, line: lineNow(t), fig: Object.fromEntries(Object.entries(FIG).map(([k, f]) => [k, f.state || null])) };
  requestAnimationFrame(loop);
}

// ---------------------------------------------------------------- offline render (scripts/render_mp4.py) and the cover art (?coverart=1)
function titleCard(c, t) {
  const si = A.segments.indexOf(segAt(t)), s = A.segments[si], age = si === 0 ? t - 1.8 : t - s.t0;
  if (age >= 0 && age < 3.4) {
    c.globalAlpha = clamp(Math.min(age / .5, (3.4 - age) / .6), 0, 1);
    c.fillStyle = 'rgba(40,20,40,.5)'; c.fillRect(70, 60, 660, 96); c.fillStyle = '#ffb3cf'; c.fillRect(70, 60, 5, 96);
    c.textAlign = 'left'; c.fillStyle = '#fff'; c.font = '700 38px "Zen Maru Gothic", sans-serif'; c.fillText(`${si + 1}　${s.ja}`, 96, 106);
    c.fillStyle = '#f2e3ee'; c.font = '500 24px Inter, sans-serif'; c.fillText(s.en, 96, 140); c.globalAlpha = 1;
  }
  const ln = lineNow(t);   // the conductor's line as a subtitle (English film)
  if (ln) { const L = VO.lines[ln.id]; c.textAlign = 'center'; c.font = '700 42px "Zen Maru Gothic", sans-serif'; const tj = c.measureText(L.text.ja).width; c.font = '500 28px Inter, sans-serif'; const te = c.measureText(L.text.en).width, tw = Math.max(tj, te);
    c.fillStyle = 'rgba(10,8,20,.55)'; c.fillRect(W / 2 - tw / 2 - 24, H - 178, tw + 48, 104); c.fillStyle = '#fff'; c.font = '700 42px "Zen Maru Gothic", sans-serif'; c.fillText(L.text.ja, W / 2, H - 128);
    c.fillStyle = '#e6e0f2'; c.font = '500 28px Inter, sans-serif'; c.fillText(L.text.en, W / 2, H - 88); }
  if (t > 125.65 && t < 126.9) { c.textAlign = 'center'; c.globalAlpha = clamp(Math.min((t - 125.65) / .2, (126.9 - t) / .3), 0, 1); c.font = '800 96px "Zen Maru Gothic", sans-serif'; c.fillStyle = '#ffd6e8'; c.fillText('🌸「春！」', W / 2, H / 2); c.globalAlpha = 1; }
  if (t > 147.5) {
    c.globalAlpha = clamp((t - 147.5) / .8, 0, 1); c.textAlign = 'center';
    c.textAlign = 'left'; c.fillStyle = 'rgba(40,20,40,.5)'; c.fillRect(70, 60, 620, 120); c.fillStyle = '#ffb3cf'; c.fillRect(70, 60, 5, 120);
    c.fillStyle = '#fff'; c.font = '700 50px "Zen Maru Gothic", sans-serif'; c.fillText('終点・さくら駅', 96, 122);
    c.fillStyle = '#f7dceb'; c.font = '500 26px Inter, sans-serif'; c.fillText('Last stop — Cherry Blossom Station', 96, 160); c.globalAlpha = 1;
  }
}
async function ready() { await document.fonts.ready; await Promise.all([...Object.values(IMG), ...Object.values(FIG).flatMap((f) => [f.im, ...f.eyes.map((p) => p.im), ...f.mouth.map((p) => p.im)])].map((im) => im.decode().catch(() => {}))); }
async function renderAll() {
  await ready(); LINEAR_MOTION = true;
  const cover = new Image(); cover.src = 'media/cover.jpg'; await cover.decode().catch(() => {});
  const fps = A.fps, n = Math.round(A.duration * fps); reset();
  const AT = QS.get('at') ? QS.get('at').split(',').map(Number) : null;
  const list = AT ? AT.map((x) => Math.round(x * fps)) : [...Array(n).keys()];
  win.side = 'L';
  for (const i of list) {
    const t = i / fps;
    if (AT) { reset(); for (let k = 45; k > 0; k--) { tvClock = Math.max(0, t - k / fps); frame(Math.max(0, t - k / fps), 1 / fps, thermalOut(Math.max(0, t - k / fps))); } }
    tvClock = t; frame(t, 1 / fps, thermalOut(t));
    if (t < 1.8 && cover.naturalWidth && !QS.has('clean')) { ctx.globalAlpha = t < 1.2 ? 1 : (1.8 - t) / .6; ctx.drawImage(cover, 0, 0, W, H); ctx.globalAlpha = 1; }
    if (!QS.has('clean')) titleCard(ctx, t);
    const blob = await new Promise((r) => cv.toBlob(r, 'image/jpeg', .92));
    await fetch(`/frame/${String(i).padStart(5, '0')}.jpg`, { method: 'PUT', body: blob });
  }
  await fetch('/done', { method: 'PUT' });
}
async function coverArt() {   // media/cover/art.webp: the split carriage (winter left / summer right) + the conductor waving from the aisle on the right
  await ready(); LINEAR_MOTION = true; reset();
  const t = 26.0, th = { Lc: .8, Lh: 0, Rc: 0, Rh: .85 };
  for (let k = 60; k > 0; k--) { tvClock = 30 - k / 30; frame(t, 1 / 30, th); }
  tvClock = 30; frame(t, 1 / 30, th);
  drawIcicles(ctx, 9);
  const F = FIG.wave, eye = [(723 - F.c.box[0]), (450 - F.c.box[1])], face = 230, k = (+QS.get('face') || .22) * H / face;
  const hgt = F.c.h * k, ex = (+QS.get('ex') || .72) * W, ey = (+QS.get('ey') || .35) * H, x0 = ex - eye[0] * k, top = ey - eye[1] * k;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(ex, ey + 120, 0, ex, ey + 120, 520); g.addColorStop(0, 'rgba(255,220,170,.22)'); g.addColorStop(1, 'rgba(255,220,170,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
  drawFig(ctx, 'wave', x0 + F.c.w * k / 2, top + hgt, hgt, { tv: 0 });
  ctx.save(); ctx.beginPath(); ctx.rect(0, TABLE_Y, W, H - TABLE_Y); ctx.clip(); ctx.drawImage(car, 0, 0); ctx.restore(); drawTable(ctx, t, 30);   // in the aisle behind your table
  const blob = await new Promise((r) => cv.toBlob(r, 'image/png'));
  await fetch('/frame/cover_art.png', { method: 'PUT', body: blob }); await fetch('/done', { method: 'PUT' });
}
if (RENDER) { document.body.classList.add('rendering'); renderAll(); }
else if (COVERART) { document.body.classList.add('rendering'); coverArt(); }
else if (QS.has('cover') && previewT == null) mix.preload = 'none';
else { requestAnimationFrame(loop); if (!LINEAR) { loadLang('ja'); loadLang(voiceLang()); addEventListener('moheat:voicelang', () => loadLang(voiceLang())); } }   // decode the voices early (a suspended context decodes too)
