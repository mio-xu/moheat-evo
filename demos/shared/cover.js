// The cover standard for every MoHeat Evo demo (DEMO_DESIGN_GUIDE §7.3 "封面构图标准", user 2026-11-08: "the cover style — e.g. how
// much of the frame the character takes up — must also be consistent"). Load it before main.js:
//   <script src="../../shared/cover.js?v=1"></script>
// It gives the cover (.intro) the standard layout for free — copy block in the LEFT column, a left-to-right shade in the demo's tone
// colour, the phone variant — and, for canvas covers, a helper that puts the character's face on the standard spot:
//   MoHeatCover.fit(ctx, { eye: [x, y], face: h }, () => { …the old cover drawing… }, { tone: '#0f2226' })
//     eye  = the eye-line centre in the frame the old drawing makes (0–1 of the canvas; for two people the middle between them)
//     face = that face's height (hairline → chin, 0–1 of the canvas height; two people: the average)
//     opt  = { duo: true (two people), tone: '#rrggbb' (shade colour), covers: [x0, y0, x1, y1] (what the old drawing fills, default
//              the whole frame), free: true (the drawing is a cut-out character over a background drawn before: no fill, no
//              edge rules), at: { y, face } (a nudge inside the check's tolerance, e.g. chibi busts whose cut-off bottom would show),
//              fade: y (free cut-outs only: where the cut-outs end, 0–1 of the canvas height in the OLD drawing — their bottom edge
//              fades out over 16 % of the frame instead of showing as a hard cut), scene: true (no lead character: only the copy column + shade) }
//   The helper scales / moves the drawing (never smaller than the frame it filled, never leaving a gap at the top, bottom or right),
//   feathers a left edge that comes into view, and records MoHeatCover.placed (tools/web/check_cover.py reads it).
// No canvas / no lead character (film demos): <div class="intro" data-cover="scene" data-cover-tone="#rrggbb"> on the cover.
// Layered demos: MoHeatCover.layered(ctx, { bg, char, x, y, height }, { eye, face }, { tone, at, redraw }) — plate + pose cut-out.
// HTML covers (<img class="hero"> in .intro): give the image where its face is and cover.js places it on the standard spot too —
//   <img class="hero" data-eye=".47 .21" data-face=".165" [data-slot="0|1" for two people: 0 = the left one] [data-target-face=".24"]>
//   (data-eye = eye-line centre, data-face = hairline → chin height, both as fractions of the image itself).
(() => {
  const STD = {
    solo: { x: .72, y: .30, face: .27 },   // eye-line centre at 72 % across, 30 % down; face (hairline → chin) 27 % of the frame height
    duo: { x: .72, y: .30, face: .21 },    // two people: the middle between their eyes at the same spot, each face 21 %
    slots: [.61, .83],                     // two <img> heroes: their eyes at 61 % and 83 % across (middle 72 %)
  };
  const hex = (c) => { const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(c || ''); return m ? m.slice(1).map((v) => parseInt(v, 16)).join(' ') : null; };
  const C = window.MoHeatCover = { STD, placed: null, tone: null,
    setTone(tone) { const t = hex(tone); if (!t || t === C.tone) return; C.tone = t; document.documentElement.style.setProperty('--cover-tone', t); },
    fit(ctx, from, draw, o = {}) {
      const W = ctx.canvas.width, H = ctx.canvas.height, T = { ...(o.duo ? STD.duo : STD.solo), ...(o.at || {}) }, R = o.covers || [0, 0, 1, 1];
      if (o.tone) C.setTone(o.tone);
      let s = 1, tx = 0, ty = 0;
      if (from && !o.scene) {
        s = o.free ? T.face / from.face : Math.max(T.face / from.face, 1 / (R[3] - R[1]));   // the face at the standard size, but a full picture still fills the height
        tx = T.x * W - s * from.eye[0] * W; ty = T.y * H - s * from.eye[1] * H;
        if (!o.free) {
          ty = Math.min(-s * R[1] * H, Math.max(H - s * R[3] * H, ty));   // no gap at the top / bottom
          tx = Math.max(W - s * R[2] * W, tx);                             // …nor at the right
        }
      }
      ctx.save(); if (!o.free) { ctx.fillStyle = `rgb(${C.tone || '8 10 20'})`; ctx.fillRect(0, 0, W, H); }
      if (o.free && o.fade != null) {   // cut-outs that end inside the frame: the background drawn before is laid back over their bottom edge
        const B = C._layer || (C._layer = document.createElement('canvas')); B.width = W; B.height = H; const b = B.getContext('2d'); b.drawImage(ctx.canvas, 0, 0);
        ctx.transform(s, 0, 0, s, tx, ty); draw(); ctx.restore();
        const end = ty + s * o.fade * H, g = b.createLinearGradient(0, end - H * .16, 0, end);
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, '#000'); b.globalCompositeOperation = 'destination-in'; b.fillStyle = g; b.fillRect(0, 0, W, H);
        ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(B, 0, 0); ctx.restore();
      } else { ctx.transform(s, 0, 0, s, tx, ty); draw(); ctx.restore(); }
      const left = tx + s * R[0] * W;
      if (left > 1 && !o.free) {   // the drawing's left edge is in the picture: feather it into the tone (the shade covers the rest)
        const g = ctx.createLinearGradient(left - 2, 0, left + W * .1, 0), t = C.tone || '8 10 20';
        g.addColorStop(0, `rgb(${t} / 1)`); g.addColorStop(1, `rgb(${t} / 0)`); ctx.fillStyle = g; ctx.fillRect(0, 0, left + W * .1, H);
      }
      C.placed = from && !o.scene ? { eye: [+(100 * (tx / W + s * from.eye[0])).toFixed(1), +(100 * (ty / H + s * from.eye[1])).toFixed(1)], face: +(100 * s * from.face).toFixed(1), duo: !!o.duo }
        : { scene: true };
      return { s, tx, ty };
    },
  };
  // layered demos (media/layers.js + project/stage.json): the cover is composed from the empty plate + the pose cut-out, so the
  // character can be scaled to the standard without new art. view = { bg, char, x, y, height } (the stage.json view: char anchored at
  // its bottom centre); from / opt as fit() (from = where the face is when the pose stands at the view's own place).
  const imgs = {};
  const img = (src, redraw) => { let i = imgs[src]; if (!i) { i = imgs[src] = new Image(); i.onload = () => redraw && redraw(); i.src = src; } return i.complete && i.naturalWidth ? i : null; };
  C.layered = (ctx, view, from, o = {}) => {
    const W = ctx.canvas.width, H = ctx.canvas.height, bg = img(view.bg, o.redraw), ch = img(view.char, o.redraw);
    if (!bg || !ch) return false;
    if (o.tone) C.setTone(o.tone);
    const r = W / H, ir = bg.width / bg.height, bw = ir > r ? H * ir : W, bh = ir > r ? H : W / ir;
    ctx.drawImage(bg, (W - bw) / 2, (H - bh) / 2, bw, bh);
    const hh = view.height * H, ww = hh * ch.width / ch.height;
    C.fit(ctx, from, () => ctx.drawImage(ch, view.x * W - ww / 2, view.y * H - hh, ww, hh), { ...o, free: true });
    return true;
  };
  const css = `
  .intro.cv-std { justify-content: flex-start !important; align-items: center !important; }
  .intro.cv-std > .cover-shade { position: absolute; inset: 0; z-index: 4; pointer-events: none;
    background: linear-gradient(90deg, rgb(var(--cover-tone, 8 10 20) / .84) 0%, rgb(var(--cover-tone, 8 10 20) / .72) 32%, rgb(var(--cover-tone, 8 10 20) / .32) 50%, rgb(var(--cover-tone, 8 10 20) / 0) 62%); }
  html body .intro.cv-std .cover-copy, html body.cover-only .intro.cv-std .cover-copy {   /* html body: beats a demo's own body[data-ch] .intro .cover-copy */
    position: relative; z-index: 5; margin: 0 0 0 4cqw !important; width: 50cqw !important; max-width: 50cqw !important; box-sizing: border-box; }
  @container (max-width: 620px) {
    html body .intro.cv-std .cover-copy { margin: 0 0 0 2cqw !important; width: 64cqw !important; max-width: 64cqw !important; } }
  @container (max-width: 420px) {   /* phone portrait (≈ 374 × 210 player): the copy takes the whole width and starts below the 🌐 ⛶ corner: title · Start + mode · languages */
    html body .intro.cv-std { justify-content: center !important; align-items: flex-start !important; padding-top: 12cqw !important; box-sizing: border-box; }
    html body .intro.cv-std .cover-copy { margin: 0 auto !important; width: 94cqw !important; max-width: 94cqw !important; gap: 1.6cqw !important; }
    .intro.cv-std #lrBtn { display: none !important; }   /* one row: ▶ Start + the two modes (shared/shell.js); the L / R check is on bigger screens */
    .intro.cv-std > .cover-shade { background: linear-gradient(90deg, rgb(var(--cover-tone, 8 10 20) / .7), rgb(var(--cover-tone, 8 10 20) / .45) 70%, rgb(var(--cover-tone, 8 10 20) / .3)); } }`;
  const st = document.createElement('style'); st.id = 'moheat-cover'; st.textContent = css; document.head.appendChild(st);
  const heroes = (intro) => {   // <img class="hero" data-eye data-face>: height / position in % of the cover from where the face is in the image
    const els = [...intro.querySelectorAll('.hero[data-eye]')]; if (!els.length) return;
    const r = intro.getBoundingClientRect(); if (!r.width || els.some((e) => !e.naturalWidth)) return;
    const duo = els.length > 1, T = duo ? STD.duo : STD.solo, A = r.width / r.height, eyes = [], faces = [];
    for (const e of els) {
      const [ex, ey] = e.dataset.eye.split(/[ ,]+/).map(Number), f = +e.dataset.face, tf = +(e.dataset.targetFace || T.face);
      const h = tf / f, w = h * (e.naturalWidth / e.naturalHeight) / A, x = duo ? STD.slots[+e.dataset.slot || 0] : T.x;   // h, w: fractions of the cover height / width
      const left = x - ex * w, top = T.y - ey * h;
      for (const [k, v] of [['height', h * 100 + '%'], ['width', 'auto'], ['max-width', 'none'], ['left', left * 100 + '%'], ['top', top * 100 + '%'], ['right', 'auto'], ['bottom', 'auto'], ['opacity', '1']]) e.style.setProperty(k, v, 'important');
      eyes.push([x, T.y]); faces.push(tf);
    }
    C.placed = { eye: [+(100 * eyes.reduce((a, e) => a + e[0], 0) / eyes.length).toFixed(1), +(100 * T.y).toFixed(1)], face: +(100 * faces.reduce((a, b) => a + b, 0) / faces.length).toFixed(1), duo };
  };
  const init = () => { const intro = document.getElementById('intro') || document.querySelector('.stage .intro'); if (!intro || intro.classList.contains('cv-std')) return;
    intro.classList.add('cv-std'); if (intro.dataset.coverTone) C.setTone(intro.dataset.coverTone);
    if (intro.dataset.cover === 'scene' && !C.placed) C.placed = { scene: true };   // <div class="intro" data-cover="scene">: a place, no lead character
    const place = () => heroes(intro); intro.querySelectorAll('.hero[data-eye]').forEach((e) => e.complete ? 0 : e.addEventListener('load', place));
    place(); addEventListener('resize', place); addEventListener('load', place); const sh = document.createElement('i'); sh.className = 'cover-shade'; sh.setAttribute('aria-hidden', 'true'); intro.prepend(sh); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
