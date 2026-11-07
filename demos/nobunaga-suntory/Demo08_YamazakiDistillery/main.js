// 未来の酒と、安土の夜 Future Whisky at Azuchi — MoHeat Evo ASMR demo 6.
// Built on the Sengoku banquet player (same cast and room art, loaded from that demo's media/art). Clock = the binaural mix. Everything is a function of that time:
//   Nobunaga (left) and Ieyasu (right): positions, lip sync, expressions, poses; warm sources (steam, brazier) and
//   cold sources (ice, wind, rain) at their own positions; subtitles (ja + en); the 4-channel thermal track.
'use strict';

const W = 1920, H = 1080;
const D = window.DEMO_DATA, A = D.anim;
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (k) => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
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
const srcAt = (s, t) => ({ az: wrapAz(s.az, t), d: sample(s.d, A.fps, t), env: sample(s.env, A.fps, t) });
const VOICE = new Set(['say', 'whisper', 'laugh']);
const cueOf = (t, test, tail = .8) => { let best = null; for (const c of A.cues) if (test(c) && t >= c.t - .15 && t <= c.t + c.dur + tail) best = c; return best; };
const lineOf = (who, t, tail = 1.0) => cueOf(t, (c) => c.who === who && VOICE.has(c.kind), tail);
const ambOf = (t, kinds, tail = .3) => cueOf(t, (c) => kinds.includes(c.kind), tail);

// ---------------------------------------------------------------- art (assets → scripts/prepare_art.py → media/art)
const ART = new Set(D.art || []);
const FACES = D.artFaces || {};
const IMG = {};
for (const f of ART) { const im = new Image(); im.src = `${D.artBase || 'media/art/'}${f}.webp`; IMG[f] = im; }   // shared cast & room
for (const f of D.ownArt || []) { const im = new Image(); im.src = `media/art/${f}.webp`; IMG[f] = im; ART.add(f); }   // whisky bottles
const ok = (k) => IMG[k] && IMG[k].complete && IMG[k].naturalWidth > 0;
const xOf = (az) => W / 2 + Math.sin(rad(clamp(az, -100, 100))) * W * .43;
const PAL = { N: '255,96,60', I: '120,225,170' };

// ---------------------------------------------------------------- background (bg 1536×1024): scene bgs from the cues
const BGW = 1536, BGH = 1024;
let BGX = { ox: 0, oy: 0, k: 1 };
const bx = (x) => BGX.ox + x * BGX.k, by = (y) => BGX.oy + y * BGX.k;
const WINDOW = A.zoomRect || null;              // camera push target in bg coords (Demo 8: the window on the Kamo River)
const BGFX = A.bgfx || {};                      // per background: snow / mist / dust / fireflies
const BGS = A.cues.filter((c) => c.kind === 'bg');
const zoomAt = (t) => { const c = cueOf(t, (x) => x.kind === 'zoom', 0); return c ? smooth((t - c.t) / 2.6) * smooth((c.t + c.dur - t) / 2.2) : 0; };
function fxAt(t) {   // weather of the current background, cross-faded with the previous one
  const out = {}; let cur = null, prev = null;
  for (const c of BGS) if (c.t <= t) { prev = cur; cur = c; }
  const f = cur ? smooth((t - cur.t) / 1.4) : 0;
  if (prev && BGFX[prev.name]) out[BGFX[prev.name]] = (out[BGFX[prev.name]] || 0) + (1 - f);
  if (cur && BGFX[cur.name]) out[BGFX[cur.name]] = (out[BGFX[cur.name]] || 0) + f;
  if (A.zoomFx) out[A.zoomFx] = Math.max(out[A.zoomFx] || 0, zoomAt(t) * .8);
  return out;
}

function drawBg(ctx, name, alpha, shift, z) {
  if (!ok(name) || alpha <= 0) return;
  const k0 = (W + 90) / BGW, ox0 = -45 + clamp(shift, -45, 45), oy0 = -(BGH * k0 - H) * .3;
  const [wx0, wy0, wx1, wy1] = WINDOW || [0, 0, BGW, BGH], k1 = W / (wx1 - wx0), ox1 = -wx0 * k1, oy1 = -wy0 * k1 - ((wy1 - wy0) * k1 - H) / 2;
  const k = lerp(k0, k1, z), ox = lerp(ox0, ox1, z), oy = lerp(oy0, oy1, z);
  BGX = { ox, oy, k };
  ctx.save(); ctx.globalAlpha = alpha; ctx.drawImage(IMG[name], ox, oy, BGW * k, BGH * k); ctx.restore();
}
function drawBackground(ctx, t, shift) {
  let cur = BGS[0], prev = null;
  for (const c of BGS) if (c.t <= t) { prev = cur !== c ? cur : prev; cur = c; }
  const fade = cur && prev && cur !== prev ? smooth((t - cur.t) / 1.4) : 1, z = zoomAt(t);
  ctx.fillStyle = '#0b0d16'; ctx.fillRect(0, 0, W, H);
  if (prev && fade < 1) drawBg(ctx, prev.name, 1, shift, 0);
  if (cur) drawBg(ctx, cur.name, fade, shift, z);
  const fx = fxAt(t), snow = fx.snow || 0;
  if (snow > .01) {   // snow falling / blowing in, drifting with the cold wind
    const wind = sample(A.cool.az, A.fps, t) / 90;
    ctx.save(); ctx.fillStyle = 'rgba(245,248,255,.85)';
    for (let i = 0; i < 220 * snow; i++) {
      const sp = 60 + hash(i + 11) * 90, x = ((hash(i) * (W + 400) + t * (wind * 120 + Math.sin(t * .7 + i) * 20)) % (W + 400) + W + 400) % (W + 400) - 200;
      const y = ((hash(i + 5) * H + t * sp) % (H + 40)) - 20, r = 1.2 + hash(i + 3) * 2.8;
      ctx.globalAlpha = .45 + .5 * hash(i + 9); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    }
    ctx.restore();
  }
  if ((fx.mist || 0) > .01) {   // slow banks of mist (valley morning, waterfall spray)
    ctx.save();
    for (let i = 0; i < 7; i++) {
      const x = ((hash(i) * (W + 800) + t * (18 + 10 * hash(i + 2))) % (W + 800)) - 400, y = H * (.3 + .45 * hash(i + 4)), r = 260 + 200 * hash(i + 6);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(235,242,245,${.22 * fx.mist})`); g.addColorStop(1, 'rgba(235,242,245,0)');
      ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
    }
    ctx.restore();
  }
  if ((fx.dust || 0) > .01) {   // dust motes in the warehouse light shafts
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 90; i++) {
      const x = hash(i) * W + Math.sin(t * .3 + i) * 30, y = ((hash(i + 3) * H - t * (6 + 8 * hash(i + 5))) % H + H) % H;
      ctx.fillStyle = `rgba(255,230,180,${.35 * fx.dust * (.5 + .5 * Math.sin(t * 1.3 + i))})`; ctx.beginPath(); ctx.arc(x, y, 1 + 1.6 * hash(i + 7), 0, 7); ctx.fill();
    }
    ctx.restore();
  }
  if ((fx.fireflies || 0) > .01) {   // fireflies over the reeds
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 40; i++) {
      const x = hash(i) * W + Math.sin(t * .5 + i * 1.7) * 60, y = H * (.45 + .3 * hash(i + 2)) + Math.sin(t * .8 + i) * 25;
      const on = Math.max(0, Math.sin(t * (1.2 + hash(i + 4)) + i * 2.3)) ** 3 * fx.fireflies;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 16); g.addColorStop(0, `rgba(210,255,140,${.9 * on})`); g.addColorStop(1, 'rgba(210,255,140,0)');
      ctx.fillStyle = g; ctx.fillRect(x - 16, y - 16, 32, 32);
    }
    ctx.restore();
  }
  // gentle night grade + vignette (the art is already warm)
  ctx.fillStyle = `rgba(12,24,48,${.06 + .1 * snow + (A.nightGrade || 0)})`; ctx.fillRect(0, 0, W, H);
  const v = ctx.createRadialGradient(W / 2, H / 2, H * .4, W / 2, H / 2, H * .98);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(8,4,0,.42)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
}
const STORM = () => 0;

// ---------------------------------------------------------------- particles
let parts = [];
const spawn = (o) => { if (parts.length < 1400) parts.push(o); };
function updateParts(dt) {
  for (const q of parts) {
    q.life += dt;
    if (q.kind === 'steam' || q.kind === 'mist') { q.vx += Math.sin(q.life * 3 + q.seed) * 30 * dt; q.vy += (q.kind === 'steam' ? -30 : 6) * dt; }
    if (q.kind === 'leaf' || q.kind === 'petal' || q.kind === 'gold') { q.vy += Math.sin(q.life * 2 + q.seed) * 40 * dt; q.vx += Math.cos(q.life * 1.7 + q.seed) * 20 * dt; }
    q.x += q.vx * dt; q.y += q.vy * dt;
    const damp = q.kind === 'drop' ? 0 : q.kind === 'ember' ? .4 : .9;
    q.vx *= 1 - damp * dt; q.vy *= 1 - damp * dt;
    if (q.spin) q.rot += q.spin * dt; if (q.grow) q.size += q.grow * dt;
  }
  parts = parts.filter((q) => q.life < q.max && q.x > -300 && q.x < W + 300 && q.y < H + 200);
}
function drawParts(ctx) {
  ctx.save();
  for (const q of parts) {
    const k = q.life / q.max, a = Math.sin(Math.PI * Math.min(1, k * 1.15)) * q.a;
    if (q.kind === 'steam' || q.kind === 'mist') {   // normal blend: soft translucent wisps, never a glowing blob
      ctx.globalCompositeOperation = 'source-over';
      const g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, q.size);
      const c = q.kind === 'steam' ? '250,246,238' : '214,232,250';
      g.addColorStop(0, `rgba(${c},${a * (q.kind === "steam" ? .34 : .16)})`); g.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(q.x, q.y, q.size, 0, 7); ctx.fill();
    } else if (q.kind === 'streak' || q.kind === 'drop') {
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = q.kind === 'drop' ? `rgba(200,222,255,${a})` : `rgba(215,235,255,${a})`; ctx.lineWidth = q.size; ctx.lineCap = 'round';
      const L = q.kind === 'drop' ? 46 : 120 + 120 * (1 - k), sp = Math.hypot(q.vx, q.vy) || 1;
      ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - q.vx / sp * L, q.y - q.vy / sp * L); ctx.stroke();
    } else if (q.kind === 'ember') {
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(255,${150 + 80 * (1 - k)},60,${a})`; ctx.beginPath(); ctx.arc(q.x, q.y, q.size * (1 - k * .6), 0, 7); ctx.fill();
    } else if (q.kind === 'flame') {
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, q.size);
      g.addColorStop(0, `rgba(255,230,140,${a * .7})`); g.addColorStop(.45, `rgba(255,120,40,${a * .45})`); g.addColorStop(1, 'rgba(200,40,10,0)');
      ctx.fillStyle = g; ctx.save(); ctx.translate(q.x, q.y); ctx.scale(.6, 1.3); ctx.translate(-q.x, -q.y); ctx.beginPath(); ctx.arc(q.x, q.y, q.size, 0, 7); ctx.fill(); ctx.restore();
    } else if (q.kind === 'bubble') {
      ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = `rgba(225,245,255,${a * .85})`; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(q.x, q.y, q.size, 0, 7); ctx.stroke();
    } else if (q.kind === 'glint') {
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(235,248,255,${a})`;
      ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot);
      ctx.beginPath(); for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.lineTo(0, q.size); ctx.lineTo(q.size * .2, q.size * .2); } ctx.fill(); ctx.restore();
    } else if (q.kind === 'leaf' || q.kind === 'petal' || q.kind === 'gold') {
      ctx.globalCompositeOperation = q.kind === 'gold' ? 'lighter' : 'source-over';
      ctx.save(); ctx.globalAlpha = clamp(a, 0, 1); ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.scale(1, .55 + .45 * Math.sin(q.life * 5 + q.seed));
      if (q.kind === 'gold') { ctx.fillStyle = `rgba(246,205,110,${.9})`; ctx.fillRect(-q.size / 2, -q.size / 3, q.size, q.size * .66); }
      else { const im = IMG[q.kind === 'leaf' ? 'fx_leaf' : 'fx_petal']; if (im && im.naturalWidth) ctx.drawImage(im, -q.size / 2, -q.size / 2, q.size, q.size); }
      ctx.restore();
    }
  }
  ctx.restore(); ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- characters (Live2D-style motion on the ukiyo-e art)
function blinkAmt(t, seed) {
  const p = 3.6 + seed, k = Math.floor(t / p), off = hash(k * 7 + seed * 31) * (p - .5), dt = t - k * p - off;
  return dt >= 0 && dt < .16 ? Math.abs(Math.cos((dt / .16) * Math.PI)) : 1;
}
const EXPR = {
  N: { proud: 'proud', invite: 'grin', tease: 'grin', excited: 'grin', laugh: 'laugh', suspicious: 'suspicious', whisper: 'whisper', soft: 'base', earlaugh: 'laugh' },
  I: { polite: 'polite', calm: 'base', concern: 'concern', surprise: 'surprise', thoughtful: 'thoughtful', chuckle: 'chuckle', laugh: 'chuckle', whisper: 'whisper' },
};
const ACTION = { N: new Set(['invite', 'laugh', 'alert', 'stand', 'sit']), I: new Set(['pour', 'offer', 'wind', 'calm']) };

function poseCue(who, t) {   // gesture poses shown during (and just after) the line that asks for them
  return cueOf(t, (c) => c.who === who && VOICE.has(c.kind) && c.pose && ACTION[who].has(c.pose) && (c.pose !== 'sit' || ['excited', 'invite'].includes(c.emo)), .9);
}

function bustFrame(st) {
  const has = (s) => ART.has(`${st.who}_bust_${s}`);
  const c = st.line, ex = c ? EXPR[st.who][c.emo] : null, talking = c && st.t <= c.t + c.dur + .1;
  if (talking && c.kind === 'laugh') return `${st.who}_bust_${has('laugh') ? 'laugh' : 'chuckle'}`;
  if (st.blink < .5 && !(talking && st.mouth > .3)) return `${st.who}_bust_blink`;
  if (talking) {
    if (c.kind === 'whisper') return st.mouth > .55 ? `${st.who}_bust_mouth_half` : `${st.who}_bust_whisper`;
    if (st.mouth > .5) return `${st.who}_bust_mouth_open`;
    if (st.mouth > .18) return `${st.who}_bust_mouth_half`;
  }
  return ex && has(ex) ? `${st.who}_bust_${ex}` : `${st.who}_bust_base`;
}

function chooseLook(st) {
  const who = st.who, c = st.line;
  if (st.d < .45 && ART.has(`${who}_ear`)) {
    const alt = who === 'N' ? 'N_ear_laugh' : 'I_ear_smile';
    const laughing = c && c.kind === 'laugh' && st.t <= c.t + c.dur + .2;
    return { img: laughing || (c && st.mouth > .62) ? alt : `${who}_ear`, kind: 'ear' };
  }
  const p = poseCue(who, st.t);
  if (p && ART.has(`${who}_pose_${p.pose}`)) return { img: `${who}_pose_${p.pose}`, kind: 'pose' };
  return { img: bustFrame(st), kind: 'bust' };
}

function layout(look, st) {
  const im = IMG[look.img], iw = im.naturalWidth, ih = im.naturalHeight, who = st.who;
  if (look.kind === 'ear') {
    const F = FACES[`${who}_ear`] || { cx: iw * .5, cy: ih * .35, rx: 240 };
    const k = 330 / F.rx, fx = who === 'N' ? 330 : W - 330;
    return { k, cx: fx, pivotX: F.cx, top: 520 - F.cy * k, mouth: [F.cx + (who === 'N' ? 120 : -120), F.cy + 90] };
  }
  if (look.kind === 'bust') {
    const F = FACES[`${who}_bust`] || { cx: iw * .45, cy: ih * .22, rx: 200 };
    const sc = clamp(Math.pow(1.15 / st.d, .45), 1, 1.35), k = (970 / ih) * sc;    // bottom stays anchored below the frame
    return { k, cx: st.x, pivotX: F.cx, top: H + 14 - ih * k, mouth: [F.cx + (who === 'N' ? 30 : -30), F.cy + 120] };
  }
  const sc = clamp(Math.pow(1.15 / st.d, .45), .9, 1.6), standing = /stand|invite/.test(look.img);
  const h = (standing ? 1060 : 940) * sc, k = h / ih;
  return { k, cx: st.x + (who === 'N' ? 40 : -40), pivotX: iw / 2, top: H + 12 - h, mouth: [iw * (who === 'N' ? .55 : .45), ih * .2] };
}

function drawWarped(ctx, img, cx, pivotX, top, k, alpha, rot, sway, breath) {
  const iw = img.naturalWidth, ih = img.naturalHeight, N = 24, pivotY = top + ih * k;
  ctx.save(); ctx.globalAlpha = alpha;
  ctx.translate(cx, pivotY); ctx.rotate(rot); ctx.scale(1 - breath * .4, 1 + breath);
  for (let i = 0; i < N; i++) {
    const v0 = i / N, v1 = (i + 1) / N, off = sway * Math.pow(1 - (v0 + v1) / 2, 2.2);
    ctx.drawImage(img, 0, ih * v0, iw, ih * (v1 - v0) + 1, -pivotX * k + off, -ih * k + ih * k * v0, iw * k, ih * k * (v1 - v0) + 1);
  }
  ctx.restore();
}

const CUP = { I_pose_pour: [368, 826] };   // cup position in the pose image (px) → steam origin
const CUP_AT = {};
const fig = { N: { cur: null, prev: null, since: -9, lastT: -9 }, I: { cur: null, prev: null, since: -9, lastT: -9 } };

const presence = (who, t) => { const [a, b] = A.present[who]; return smooth((t - a) / .9) * smooth((b - t) / 1.6); };
function drawChar(ctx, st) {
  const fs = fig[st.who], look = chooseLook(st), vis = presence(st.who, st.t);
  if (!ok(look.img) || vis <= .01) return;
  const jumped = Math.abs(st.t - fs.lastT) > .5;
  const same = fs.cur && fs.cur.kind === look.kind && look.kind === 'bust';
  if (!fs.cur || jumped) { fs.cur = look; fs.prev = null; fs.since = -9; }
  else if (look.img !== fs.cur.img) { if (same) fs.cur = look; else { fs.prev = fs.cur; fs.cur = look; fs.since = st.t; } }
  fs.lastT = st.t;
  const age = st.t - fs.since, pop = age >= 0 && age < .3 ? Math.sin(Math.PI * age / .3) : 0;   // hard cut + a small settle bounce
  // warm aura behind the speaker
  const glow = .1 + .35 * st.mouth;
  const g = ctx.createRadialGradient(st.x, 420, 40, st.x, 420, 520);
  g.addColorStop(0, `rgba(${PAL[st.who]},${glow * .5 * vis})`); g.addColorStop(1, `rgba(${PAL[st.who]},0)`);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(st.x - 520, -100, 1040, 1100); ctx.restore();
  const breath = .008 * Math.sin((st.t / 3.8 + (st.who === 'N' ? 0 : .5)) * Math.PI * 2);
  const laughBob = st.line && st.line.kind === 'laugh' && st.t < st.line.t + st.line.dur ? Math.abs(Math.sin((st.t - st.line.t) * 14)) * 10 : 0;
  const sway = Math.sin(st.t * 1.3 + (st.who === 'N' ? 0 : 2)) * 6 + STORM(st.t) * Math.sin(st.t * 3.1) * 5;
  // no cross-fade: two different silhouettes blended at partial alpha read as a see-through ghost
  const layer = fs.cur, L = layout(layer, st), img = IMG[layer.img];
  const lift = st.mouth * 5 + laughBob + pop * 10;
  drawWarped(ctx, img, L.cx, L.pivotX, L.top - lift, L.k, vis, st.rot, sway * (layer.kind === 'pose' ? 1 : .6), breath + st.mouth * .005 + pop * .012);
  st.mx = L.cx + (L.mouth[0] - L.pivotX) * L.k; st.my = L.top + L.mouth[1] * L.k; st.kind = layer.kind;
  const c = CUP[layer.img];
  CUP_AT[st.who] = c ? [L.cx + (c[0] - L.pivotX) * L.k - camYaw * 8, L.top - lift + c[1] * L.k] : null;
}

function charState(who, t) {
  const C = A.chars[who];
  const az = wrapAz(C.az, t), d = sample(C.d, A.fps, t);
  const line = lineOf(who, t, 1.4);
  const near = clamp((1.15 - d) / .9, 0, 1);
  return { who, t, az, d, line, x: xOf(az), mouth: sample(C.env, A.fps, t), blink: blinkAmt(t, who === 'N' ? .3 : .9),
           rot: (who === 'N' ? 1 : -1) * near * .05 };
}

function emit(st, t, dt) {   // gold sparkle on big laughs (no breath haze on whispers: it read as a glare on the face)
  if (!st.line || t > st.line.t + st.line.dur) return;
  if (st.line.kind === 'laugh' && st.line.emo === 'laugh' && Math.random() < dt * 22)
    spawn({ kind: 'gold', x: st.x + (Math.random() - .5) * 400, y: 200 + Math.random() * 300, vx: (Math.random() - .5) * 120, vy: -60 - Math.random() * 80, size: 7 + Math.random() * 7, rot: Math.random() * 3, spin: 3, life: 0, max: 2, a: 1, seed: Math.random() * 6 });
}

// ---------------------------------------------------------------- ambience visuals at their own positions
const PROP = A.propNames || {}, PSIZE = A.propSize || {};       // name card (ja with kana, en) and height per prop
const STEAMY = new Set(A.steamy || []);
function drawProp(ctx, t) {   // today's drink / dish on the tatami between the two lords
  const c = cueOf(t, (x) => x.kind === 'prop', 0); if (!c || !ok(c.name)) return;
  const age = t - c.t, rest = c.t + c.dur - t, vis = smooth(age / .8) * smooth(rest / .8);
  const im = IMG[c.name], h = PSIZE[c.name] || 330, w = im.naturalWidth * h / im.naturalHeight;
  const x = W / 2, y = H - 175 + (1 - vis) * 60 + Math.sin(t * 1.1) * 3;
  ctx.save(); ctx.globalAlpha = vis;
  const g = ctx.createRadialGradient(x, y - h * .45, 10, x, y - h * .45, h * .9);
  g.addColorStop(0, 'rgba(255,190,90,.3)'); g.addColorStop(1, 'rgba(255,170,80,0)');
  ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(x - h, y - h * 1.4, h * 2, h * 1.6); ctx.globalCompositeOperation = 'source-over';
  ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12;
  ctx.drawImage(im, x - w / 2, y - h, w, h);
  ctx.restore();
  if (STEAMY.has(c.name)) steamWisps(ctx, x + (A.steamDx || {})[c.name] || x, y - h * .62, t, vis * .9);
  if (age < 3.2 && PROP[c.name]) {   // name card (ja with kana + en)
    ctx.save(); ctx.globalAlpha = vis * smooth((3.2 - age) / .6); ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,.8)'; ctx.shadowBlur = 12;
    ctx.font = '800 32px "Shippori Mincho B1", serif'; ctx.fillStyle = '#f6d27a'; ctx.fillText(PROP[c.name][0], x, y - h - 40);
    ctx.font = 'italic 600 22px "Cormorant Garamond", serif'; ctx.fillStyle = '#f3e6c8'; ctx.fillText(PROP[c.name][1], x, y - h - 12);
    ctx.restore();
  }
}

function drawWarmth(ctx, t, dt) {   // charcoal grill / hot-sake steam at the warm source's own side
  const warm = srcAt(A.warm, t), wc = ambOf(t, ['brazier', 'steam'], .3);
  if (!wc || t > wc.t + wc.dur + .3) return;
  const side = Math.sign(warm.az) || 1, p = clamp((t - wc.t) / wc.dur, 0, 1), vis = smooth(p * 6) * smooth((1 - p) * 5 + .2);
  const gx = side < 0 ? 300 : W - 300, gy = 760;
  const g = ctx.createRadialGradient(gx, gy, 20, gx, gy, 420);
  g.addColorStop(0, `rgba(255,140,60,${(wc.kind === 'brazier' ? .26 : .14) * vis * (.8 + .2 * Math.sin(t * 9))})`); g.addColorStop(1, 'rgba(255,120,40,0)');
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(gx - 420, gy - 420, 840, 840); ctx.restore();
  if (wc.kind === 'brazier' && Math.random() < dt * 22 * vis)
    spawn({ kind: 'ember', x: gx + (Math.random() - .5) * 220, y: gy + 80, vx: (Math.random() - .5) * 40, vy: -120 - Math.random() * 140, size: 2 + Math.random() * 3, life: 0, max: 1.6, a: 1 });
  if (Math.random() < dt * (wc.kind === 'steam' ? 6 : 3) * vis)
    spawn({ kind: 'steam', x: gx + (Math.random() - .5) * 160, y: gy, vx: (Math.random() - .5) * 20, vy: -40, size: 40, grow: 70, life: 0, max: 2.6, a: .8, seed: Math.random() * 6 });
}

function drawBoat(ctx, t, dt) {   // e.g. the cormorant-fishing fire boat gliding from left to right
  const c = cueOf(t, (x) => x.kind === 'boat', 0); if (!c || !ok(c.name)) return;
  const p = clamp((t - c.t) / c.dur, 0, 1), im = IMG[c.name], h = c.h || 240, w = im.naturalWidth * h / im.naturalHeight;
  const x = lerp(-w, W, p), y = (c.y || 560) + Math.sin(t * 1.6) * 5;
  const fx = x + w * (c.fireX || .88), fy = y + h * (c.fireY || .3);
  const g = ctx.createRadialGradient(fx, fy, 10, fx, fy, 420); g.addColorStop(0, 'rgba(255,170,70,.55)'); g.addColorStop(1, 'rgba(255,120,40,0)');
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(fx - 420, fy - 420, 840, 840);
  const r = ctx.createLinearGradient(0, y + h, 0, y + h + 220); r.addColorStop(0, 'rgba(255,150,60,.35)'); r.addColorStop(1, 'rgba(255,150,60,0)');   // reflection
  ctx.fillStyle = r; ctx.fillRect(fx - 60, y + h, 120, 220); ctx.restore();
  ctx.drawImage(im, x, y, w, h);
  if (Math.random() < dt * 40) spawn({ kind: 'ember', x: fx + (Math.random() - .5) * 40, y: fy, vx: (Math.random() - .5) * 60, vy: -80 - Math.random() * 120, size: 2 + Math.random() * 3, life: 0, max: 1.6, a: 1 });
}

function drawSlip(ctx, t, dt) {   // the golden time slip: they appear in it at the start and vanish in it at the end
  const c = cueOf(t, (x) => x.kind === 'slip', 0); if (!c) return;
  const p = (t - c.t) / c.dur, a = Math.sin(Math.PI * clamp(p, 0, 1));
  const g = ctx.createRadialGradient(W / 2, H * .45, 30, W / 2, H * .45, W * .6);
  g.addColorStop(0, `rgba(255,230,160,${.45 * a})`); g.addColorStop(1, 'rgba(255,200,110,0)');
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
  if (Math.random() < dt * 80 * a)
    spawn({ kind: 'gold', x: W * (.2 + Math.random() * .6), y: H * (.25 + Math.random() * .5), vx: (Math.random() - .5) * 220, vy: -40 - Math.random() * 120, size: 6 + Math.random() * 8, rot: Math.random() * 3, spin: 4, life: 0, max: 2.2, a: 1, seed: Math.random() * 6 });
}

function drawAmbience(ctx, t, dt) {   // cold whisky moments, drawn at the cold source's own side
  const cold = srcAt(A.cool, t), cc = ambOf(t, ['ice', 'fizz', 'chill', 'wind'], .2);
  if (!cc || t > cc.t + cc.dur + .2) return;
  const side = Math.sign(cold.az) || 1, env = cold.env;
  const p = clamp((t - cc.t) / cc.dur, 0, 1), vis = smooth(p * 6) * smooth((1 - p) * 5 + .2);
  const gx = side < 0 ? 250 : W - 250, gy = 600;
  // frosty light at the ear the cold comes from
  const g = ctx.createRadialGradient(gx, gy, 20, gx, gy, 380);
  g.addColorStop(0, `rgba(170,215,255,${.22 * vis})`); g.addColorStop(1, 'rgba(170,215,255,0)');
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(gx - 380, gy - 380, 760, 760); ctx.restore();
  if (cc.kind === 'wind') {   // snow gusting in from the cold side
    if (Math.random() < dt * 40 * vis * (env + .3)) spawn({ kind: 'streak', x: side < 0 ? -40 : W + 40, y: 120 + Math.random() * 640, vx: -side * (700 + Math.random() * 500), vy: 80 + Math.random() * 120, size: 2, life: 0, max: 1.6, a: .55 });
    return;
  }
  if (Math.random() < dt * (cc.kind === 'chill' ? 14 : 26) * (env + .25) * vis)
    spawn({ kind: 'glint', x: gx + (Math.random() - .5) * 260, y: gy + (Math.random() - .5) * 300, vx: 0, vy: 0, size: 6 + Math.random() * 10, rot: Math.random(), spin: 4, life: 0, max: .5, a: 1 });
  if (Math.random() < dt * 8 * vis)
    spawn({ kind: 'mist', x: gx + (Math.random() - .5) * 220, y: gy + 40 + Math.random() * 120, vx: -side * (20 + Math.random() * 30), vy: 12, size: 40, grow: 90, life: 0, max: 2, a: .8, seed: Math.random() * 6 });
  if (cc.kind === 'fizz' && Math.random() < dt * 60 * vis)   // highball bubbles
    spawn({ kind: 'bubble', x: gx + (Math.random() - .5) * 160, y: gy + 160, vx: (Math.random() - .5) * 18, vy: -140 - Math.random() * 120, size: 2 + Math.random() * 4, life: 0, max: 1.6, a: .9 });
}

function steamWisps(ctx, x, y, t, amt) {   // ukiyo-e style steam: a few thin curling strokes, no glow
  if (amt < .02) return;
  ctx.save(); ctx.lineCap = 'round';
  for (let j = 0; j < 3; j++) {
    const ph = t * 1.6 + j * 2.1, x0 = x + (j - 1) * 14, H0 = 120 + 30 * Math.sin(t * .7 + j);
    const g = ctx.createLinearGradient(0, y, 0, y - H0);
    g.addColorStop(0, `rgba(252,249,242,${.75 * amt})`); g.addColorStop(1, 'rgba(250,246,236,0)');
    ctx.strokeStyle = g; ctx.lineWidth = 5.5 - j * 1.2;
    ctx.beginPath(); ctx.moveTo(x0, y);
    for (let k = 1; k <= 12; k++) { const u = k / 12; ctx.lineTo(x0 + Math.sin(ph + u * 5) * 12 * u + u * 8, y - H0 * u); }
    ctx.stroke();
  }
  ctx.restore();
}

function drawYourCup(ctx, t) {   // your own cup rises into view at each toast, sake ripples
  for (const c of A.cues) {
    if (c.kind !== 'clink') continue;
    const d = t - c.t; if (d < -1 || d > 2.6) continue;
    const vis = smooth((d + 1) / .8) * smooth((2.6 - d) / .8), x = W / 2, y = H - 150 + (1 - vis) * 260;
    const pc = cueOf(c.t, (q) => q.kind === 'prop', 0), key = pc && ok(pc.name) ? pc.name : 'prop_sakazuki';
    if (ok(key)) { ctx.save(); ctx.globalAlpha = vis; ctx.shadowColor = 'rgba(255,190,90,.7)'; ctx.shadowBlur = 30; const s2 = key === 'prop_sakazuki' ? 420 : 360; ctx.drawImage(IMG[key], x - s2 / 2, y - s2 * .55, s2, s2); ctx.restore(); }
    if (d > 0 && key === 'prop_sakazuki' && ok('fx_sake_ripple')) {
      for (let r = 0; r < 2; r++) {
        const rr = (d - r * .35); if (rr < 0) continue;
        const s = 90 + rr * 120; ctx.save(); ctx.globalAlpha = clamp(1 - rr / 1.6, 0, 1) * vis; ctx.globalCompositeOperation = 'lighter';
        ctx.translate(x, y - 20); ctx.scale(1, .32); ctx.drawImage(IMG.fx_sake_ripple, -s, -s, s * 2, s * 2); ctx.restore();
      }
    }
  }
}

function goldDrift(t, dt) {   // gold-leaf flakes drifting in the lantern light (calm scenes)
  const calm = 1 - STORM(t) * .85;
  if (Math.random() < dt * 2.2 * calm) spawn({ kind: 'gold', x: Math.random() * W, y: -20, vx: (Math.random() - .5) * 40, vy: 40 + Math.random() * 40, size: 5 + Math.random() * 6, rot: Math.random() * 3, spin: (Math.random() - .5) * 3, life: 0, max: 14, a: .7, seed: Math.random() * 6 });
}

function thermalEdges(ctx, th) {
  for (const [side, c, h] of [[-1, th.Lc, th.Lh], [1, th.Rc, th.Rh]]) {
    const v = Math.max(c, h); if (v < .02) continue;
    const col = c >= h ? '70,170,255' : '255,110,50';
    const x0 = side < 0 ? 0 : W, x1 = side < 0 ? 460 : W - 460;
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, `rgba(${col},${.34 * v})`); g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g; ctx.fillRect(Math.min(x0, x1), 0, 460, H);
  }
}

// ---------------------------------------------------------------- frame
const cv = $('scene'), ctx = cv.getContext('2d');
let camYaw = 0, lastT = 0, lastFrame = performance.now();

function frame(t, dt) {
  const sts = ['N', 'I'].map((w) => charState(w, t));
  const talker = sts.filter((s) => s.line && t <= s.line.t + s.line.dur).sort((a, b) => b.mouth - a.mouth)[0];
  camYaw += ((talker ? clamp(talker.az, -50, 50) * .12 : 0) - camYaw) * clamp(dt * 1.2, 0, 1);
  drawBackground(ctx, t, -camYaw * 5);
  drawBoat(ctx, t, dt);
  goldDrift(t, dt);
  ctx.save(); ctx.translate(-camYaw * 8, 0);
  // the one at your ear is drawn last (closest)
  for (const st of [...sts].sort((a, b) => b.d - a.d)) { drawChar(ctx, st); emit(st, t, dt); }
  ctx.restore();
  drawProp(ctx, t);
  drawWarmth(ctx, t, dt);
  drawAmbience(ctx, t, dt);
  drawSlip(ctx, t, dt);
  drawYourCup(ctx, t);
  updateParts(dt); drawParts(ctx);
  const th = thermalAt(t + offsetMs / 1000);
  thermalEdges(ctx, th);
  return { sts, th };
}

// ---------------------------------------------------------------- radar + meters + timeline
const radar = $('radar'), rctx = radar.getContext('2d');
function drawRadar(sts, th, t) {
  const c = rctx, w = radar.width, h = radar.height, cx = w / 2, cy = h / 2 + 6, R = 170;
  c.clearRect(0, 0, w, h);
  c.strokeStyle = '#3a2a14'; c.lineWidth = 2;
  for (const r of [.33, .66, 1]) { c.beginPath(); c.arc(cx, cy, R * r, 0, 7); c.stroke(); }
  c.fillStyle = '#8a7552'; c.font = '20px Inter'; c.textAlign = 'center'; c.fillText('garden', cx, cy - R - 10);
  for (const [sd, cl, hh] of [[-1, th.Lc, th.Lh], [1, th.Rc, th.Rh]]) {
    const v = Math.max(cl, hh), col = cl >= hh ? '79,179,255' : '255,122,69';
    const g = c.createRadialGradient(cx + sd * 44, cy, 0, cx + sd * 44, cy, 90); g.addColorStop(0, `rgba(${col},${.8 * v})`); g.addColorStop(1, `rgba(${col},0)`);
    c.fillStyle = g; c.beginPath(); c.arc(cx + sd * 44, cy, 90, 0, 7); c.fill();
    c.fillStyle = v > .02 ? `rgb(${col})` : '#4a3a22'; c.beginPath(); c.roundRect(cx + sd * 44 - 9, cy - 22, 18, 44, 8); c.fill();
  }
  c.fillStyle = '#24180c'; c.strokeStyle = '#8a7552'; c.beginPath(); c.arc(cx, cy, 36, 0, 7); c.fill(); c.stroke();
  c.fillStyle = '#8a7552'; c.beginPath(); c.moveTo(cx - 7, cy - 34); c.lineTo(cx, cy - 46); c.lineTo(cx + 7, cy - 34); c.fill();
  const dot = (az, d, col, label, r0) => {
    const r = 44 + (R - 44) * clamp(Math.log(d / .15) / Math.log(5 / .15), 0, 1);
    const x = cx + Math.sin(rad(az)) * r, y = cy - Math.cos(rad(az)) * r;
    c.fillStyle = col; c.beginPath(); c.arc(x, y, r0, 0, 7); c.fill();
    c.fillStyle = '#fff'; c.font = '600 20px "Noto Sans JP"'; c.fillText(label, x, y - r0 - 6);
  };
  for (const st of sts) dot(st.az, st.d, st.who === 'N' ? '#ff7a5c' : '#7fdcae', st.who === 'N' ? '信長' : '家康', 12 + st.mouth * 7);
  const w2 = srcAt(A.warm, t), c2 = srcAt(A.cool, t);
  if (w2.env > .05) { c.globalAlpha = clamp(w2.env * 1.5, 0, 1); dot(w2.az, w2.d, '#ffb050', '🔥', 9 + w2.env * 7); c.globalAlpha = 1; }
  if (c2.env > .05) { c.globalAlpha = clamp(c2.env * 1.5, 0, 1); dot(c2.az, c2.d, '#7cc4ff', '❄', 9 + c2.env * 7); c.globalAlpha = 1; }
}

const tl = $('timeline'), tlctx = tl.getContext('2d');
(function drawTimeline() {
  const c = tlctx, w = tl.width, h = tl.height, n = TH.Lc.length;
  c.fillStyle = '#160e06'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * w, bw = w / n + 1;
    for (const [row, cl, hh] of [[0, TH.Lc[i], TH.Lh[i]], [1, TH.Rc[i], TH.Rh[i]]]) {
      const v = Math.max(cl, hh); if (v < .02) continue;
      c.fillStyle = cl >= hh ? `rgba(79,179,255,${.15 + .85 * v})` : `rgba(255,122,69,${.15 + .85 * v})`;
      c.fillRect(x, row ? h / 2 + 1 : 2, bw, h / 2 - 3);
    }
  }
  c.fillStyle = 'rgba(255,240,210,.45)'; c.font = '600 15px "Noto Sans JP"';
  for (const s of A.scenes) { const x = (s.t / A.duration) * w; c.fillRect(x, 0, 1.5, h); c.fillText(s.n, x + 5, 17); }
})();

// ---------------------------------------------------------------- media / clock
const mix = $('mix'), media = mix, playBtn = $('playBtn');
const QS = new URLSearchParams(location.search);
if (QS.has('cover')) document.body.classList.add('cover-only');
let previewT = QS.get('t') != null ? +QS.get('t') : null;     // ?t=95 → still frame at 1:35 (for checks)
if (previewT != null) $('intro').classList.add('hidden');
const now = () => (previewT != null ? previewT : media.currentTime || 0);
const play = () => { $('intro').classList.add('hidden'); if (previewT != null) { media.currentTime = previewT; previewT = null; } media.play().catch(() => {}); };
const pause = () => media.pause();
const toggle = () => (media.paused ? play() : pause());
playBtn.addEventListener('click', toggle);
$('startBtn').addEventListener('click', () => { media.currentTime = 0; parts = []; play(); });
media.addEventListener('play', () => { playBtn.textContent = '❚❚'; });
media.addEventListener('pause', () => { playBtn.textContent = '▶'; stopOutput(); });
media.addEventListener('ended', () => { playBtn.textContent = '▶'; stopOutput(); });
$('timelineWrap').addEventListener('click', (e) => {
  const r = e.currentTarget.getBoundingClientRect();
  previewT = null; media.currentTime = clamp((e.clientX - r.left) / r.width, 0, 1) * A.duration; parts = [];
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

// ---------------------------------------------------------------- subtitles & scene titles (Japanese + English only)
const subsEl = $('subs'), sceneEl = $('sceneTitle');
let subKey = '', sceneIdx = -1, sceneTimer = 0;
const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
const SUB_LANGS = { jaen: ['ja', 'en'], ja: ['ja'], en: ['en'], off: [] };
function updateSubs(t) {
  const mode = $('subMode').value, langs = SUB_LANGS[mode] || ['ja', 'en'];
  const act = langs.length ? A.subs.filter((s) => t >= s.t0 && t < s.t1).slice(-2) : [];
  const key = mode + act.map((s) => s.t0).join('|');
  if (key === subKey) return; subKey = key;
  subsEl.innerHTML = act.map((s) => `<div class="line">${langs.map((l, i) => `<div class="${i === 0 ? 'ja' : 'en'}${s.kind === 'laugh' ? ' laugh' : ''}${s.who === 'Y' ? ' you' : ''}">${i === 0 || s.who === 'Y' ? `<span class="who ${s.who}">${A.names[s.who][l]}</span>` : ''}${esc(s[l])}</div>`).join('')}</div>`).join('');
}
function updateScene(t) {
  let i = -1; A.scenes.forEach((s, k) => { if (t >= s.t) i = k; });
  if (i !== sceneIdx && i >= 0) {
    sceneIdx = i; const s = A.scenes[i];
    sceneEl.innerHTML = `${s.n}　${s.ja}<small>${s.en}</small>`;
    sceneEl.classList.add('show'); clearTimeout(sceneTimer);
    sceneTimer = setTimeout(() => sceneEl.classList.remove('show'), 3200);
  }
}
$('credits').textContent = A.voice ? `Voice: ${A.voice.credits.join(' / ')} · your lines are subtitles only · original script, koto & SFX` : '';

// ---------------------------------------------------------------- device output (same protocol as Demo 1–3)
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
$('subMode').value = SUB_LANGS[store.get('asmr4.subs', 'jaen')] ? store.get('asmr4.subs', 'jaen') : 'jaen';
$('subMode').addEventListener('change', () => { store.set('asmr4.subs', $('subMode').value); subKey = ''; });
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
  const ix = window.MoHeatInteract && previewT == null ? window.MoHeatInteract.tick(t) : null;   // ../../shared/interact.js: waiting for your line / breath
  const playing = (!media.paused && !media.ended) || previewT != null;
  const { sts, th } = frame(t, playing || ix ? dt : 0);
  const out = (ix && ix.th) || th, live = (playing && previewT == null) || !!(ix && ix.th);
  drawRadar(sts, playing || live ? out : { Lc: 0, Lh: 0, Rc: 0, Rh: 0 }, t);
  updateOutput(out, live);
  updateSubs(t); updateScene(t);
  $('time').textContent = `${fmt(t)} / ${fmt(A.duration)}`;
  $('playhead').style.left = `${(t / A.duration) * 100}%`;
  $('posInfo').textContent = sts.map((s) => `${A.names[s.who].ja} ${Math.round(s.az)}° ${s.d.toFixed(2)} m`).join(' · ');
  requestAnimationFrame(loop);
}

// ---------------------------------------------------------------- offline render (scripts/render_mp4.py): ja + en subtitles burned in
const RENDER = QS.has('render');
function drawSubsCanvas(t) {
  const act = A.subs.filter((s) => t >= s.t0 && t < s.t1).slice(-2);
  let y = H - 58 - (act.length - 1) * 118;
  for (const s of act) {
    const nm = A.names[s.who].ja + '　';
    ctx.font = '800 46px "Shippori Mincho B1", "Noto Sans JP", serif';
    const wj = ctx.measureText(nm + s.ja).width, wn = ctx.measureText(nm).width;
    ctx.font = '500 30px Inter, sans-serif';
    const en = `${A.names[s.who].en}: ${s.en}`, we = ctx.measureText(en).width, bw = Math.max(wj, we) + 64;
    ctx.fillStyle = 'rgba(18,10,4,.66)'; ctx.strokeStyle = 'rgba(217,168,74,.45)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(W / 2 - bw / 2, y - 64, bw, 110, 12); ctx.fill(); ctx.stroke();
    ctx.textAlign = 'left'; const x0 = W / 2 - wj / 2;
    ctx.font = '800 46px "Shippori Mincho B1", "Noto Sans JP", serif';
    ctx.fillStyle = { N: '#ff8a6a', I: '#8fe0b4', Y: '#f6d27a' }[s.who]; ctx.fillText(nm, x0, y - 12); ctx.fillStyle = s.who === 'Y' ? '#f9ecd0' : '#fff'; ctx.fillText(s.ja, x0 + wn, y - 12);
    ctx.textAlign = 'center'; ctx.font = `${s.kind === 'laugh' ? 'italic ' : ''}500 30px Inter, sans-serif`; ctx.fillStyle = '#efe3c8'; ctx.fillText(en, W / 2, y + 32);
    y += 118;
  }
}
async function renderAll() {
  await document.fonts.load('800 46px "Shippori Mincho B1"'); await document.fonts.ready;
  const cover = new Image(); cover.src = 'media/cover.jpg'; await cover.decode().catch(() => {});
  await Promise.all(Object.values(IMG).map((im) => im.decode().catch(() => {})));
  const fps = 30, n = Math.round(A.duration * fps);
  parts = [];
  const AT = QS.get('at') ? QS.get('at').split(',').map(Number) : null;      // preview stills: ?render=1&at=10,30
  const list = AT ? AT.map((x) => Math.round(x * fps)) : [...Array(n).keys()];
  for (const i of list) {
    const t = i / fps;
    if (AT) { parts = []; for (let k = 45; k > 0; k--) frame(Math.max(0, t - k / fps), 1 / fps); }   // warm up particles
    frame(t, 1 / fps);
    if (t < 3.0 && cover.naturalWidth) { ctx.globalAlpha = t < 2.2 ? 1 : (3.0 - t) / .8; ctx.drawImage(cover, 0, 0, W, H); ctx.globalAlpha = 1; }
    let si = -1; A.scenes.forEach((s, k) => { if (t >= s.t) si = k; });
    const st = A.scenes[si], sAge = si === 0 ? t - 3.0 : t - st.t;
    if (sAge >= 0 && sAge < 3.4) {
      ctx.globalAlpha = clamp(Math.min(sAge / .5, (3.4 - sAge) / .6), 0, 1);
      ctx.fillStyle = 'rgba(18,10,4,.55)'; ctx.fillRect(70, 60, 560, 96); ctx.fillStyle = '#d9a84a'; ctx.fillRect(70, 60, 5, 96);
      ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = '800 38px "Shippori Mincho B1", serif'; ctx.fillText(`${st.n}　${st.ja}`, 96, 106);
      ctx.fillStyle = '#e6d6b6'; ctx.font = '500 24px Inter, sans-serif'; ctx.fillText(st.en, 96, 140); ctx.globalAlpha = 1;
    }
    drawSubsCanvas(t);
    const blob = await new Promise((r) => cv.toBlob(r, 'image/jpeg', .92));
    await fetch(`/frame/${String(i).padStart(5, '0')}.jpg`, { method: 'PUT', body: blob });
  }
  await fetch('/done', { method: 'PUT' });
}
if (RENDER) renderAll(); else requestAnimationFrame(loop);
