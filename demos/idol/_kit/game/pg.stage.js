// PG.stage — the picture: one place (16:9 plate, cropped to the portrait frame with a slow pan) + one character cut-out with blink / mouth patches.
// A character entry (from a game's chars.js): { src, w, h, eyes?: { src, rect }, mouth: [{ src, rect }, …] }  rect = [x, y, w, h] in the cut-out.
(() => {
  const PG = window.PG; let plates, plateI = 0, placeTimer = 0, charEl, baseImg, eyesImg, mouthImg, cur = null;
  // Which sides of a cut-out are cut straight (the picture ends there with the body still going on): 'l', 'r', 'b', 't'.
  // Found once per picture by looking at the alpha along its border on a small copy.
  const edgeCache = new Map();
  function edgesOf(im) {
    if (edgeCache.has(im.src)) return edgeCache.get(im.src);
    let out = '';
    try {
      const w = 96, h = Math.max(8, Math.round(96 * im.naturalHeight / im.naturalWidth)), cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      const g = cv.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0, w, h); const a = g.getImageData(0, 0, w, h).data, A = (x, y) => a[(y * w + x) * 4 + 3];
      const solid = (n, f) => { let k = 0; for (let i = 0; i < n; i++) if (f(i) > 200) k++; return k / n; };
      if (solid(h, (y) => A(0, y)) > .08) out += 'l'; if (solid(h, (y) => A(w - 1, y)) > .08) out += 'r';
      if (solid(w, (x) => A(x, h - 1)) > .08) out += 'b'; if (solid(w, (x) => A(x, 0)) > .08) out += 't';
    } catch {}
    edgeCache.set(im.src, out); return out;
  }
  const patch = (img, p, e) => { img.src = p.src; Object.assign(img.style, { left: `${p.rect[0] / e.w * 100}%`, top: `${p.rect[1] / e.h * 100}%`, width: `${p.rect[2] / e.w * 100}%` }); };

  PG.stage = {
    talking: false,   // true while the character speaks or sings: the mouth moves
    init() {
      const $ = PG.$; plates = [$('bgA'), $('bgB')]; charEl = $('char'); baseImg = charEl.querySelector('.base'); eyesImg = charEl.querySelector('.eyes'); mouthImg = charEl.querySelector('.mouth');
      setInterval(() => { if (!cur || !cur.e.eyes || charEl.hidden) return; if (Math.random() < .3) { eyesImg.classList.add('on'); setTimeout(() => eyesImg.classList.remove('on'), 130); } }, 900);
      setInterval(() => {
        if (!cur || !cur.e.mouth.length || !PG.stage.talking) { mouthImg.classList.remove('on'); return; }
        const m = cur.e.mouth, i = Math.floor(Math.random() * (m.length + 1)); if (i >= m.length) { mouthImg.classList.remove('on'); return; }
        patch(mouthImg, m[i], cur.e); mouthImg.classList.add('on');
      }, 120);
    },
    /** Cross-fade to a plate. x = which part of the wide picture the portrait frame shows (0 left … 100 right). label = a caption that slides in. */
    place(src, x = 50, label = '') {
      const next = plates[plateI ^= 1], prev = plates[plateI ^ 1];
      if (next.dataset.src !== src) { next.style.backgroundImage = `url("${src}")`; next.dataset.src = src; }
      next.style.backgroundPosition = `${x}% 50%`; next.classList.add('on'); prev.classList.remove('on');
      const p = PG.$('place'); clearTimeout(placeTimer); p.classList.remove('on');
      if (label) { p.textContent = label; requestAnimationFrame(() => p.classList.add('on')); placeTimer = setTimeout(() => p.classList.remove('on'), 3200); }
    },
    /** Show a character entry. lay: { h: height in % of the frame height, b: bottom %, x: centre % (default 50), fade: soft lower edge } — for a
     *  completed picture (e.view) h / b / x describe its view part.  o.cut: no fade when the picture is loaded (fast pose changes in a song). */
    async pose(e, lay, o = {}) {
      if (!e) return; const L = { x: 50, ...lay }, key = `${e.src}/${L.h}/${L.b}/${L.x}/${L.fade ? 1 : 0}/${PG.wide ? 1 : 0}`; if (cur && cur.key === key && !charEl.hidden) return;
      const swap = !cur || cur.e !== e || charEl.hidden; cur = { key, e };
      if (swap && !(o.cut && PG.load.ready(e.src))) { charEl.classList.add('swap'); await Promise.all([PG.load(e.src), PG.sleep(PG.AUTO ? 0 : 140)]); if (cur.key !== key) return; }
      baseImg.src = e.src; eyesImg.classList.remove('on'); mouthImg.classList.remove('on');
      if (e.eyes) patch(eyesImg, e.eyes, e); if (e.mouth.length) patch(mouthImg, e.mouth[e.mouth.length - 1], e);
      // On a wide screen the frame shows much more around her, so a cut side would be seen in the middle of the stage (user 2026-11-13: 「画面没补全」):
      // a cut bottom melts away, a cut left / right side goes to that edge of the frame; cut on both sides = those sides melt away too.
      // e.view = [x, y, w, h]: the part of a completed picture that the layout means (the old, cut picture); the rest of her goes on around it
      const V = e.view || [0, 0, e.w, e.h], k = L.h / V[3], wdt = e.w * k;
      let left = `calc(${L.x}% + ${(e.w / 2 - (V[0] + V[2] / 2)) * k}cqh)`, bottom = `${L.b - (e.h - V[1] - V[3]) * k}cqh`, sides = '', fadeB = false;
      if (PG.wide && e.view) { const ed = edgesOf(await PG.load(e.src)); if (cur.key !== key) return; fadeB = ed.includes('b'); }
      else if (PG.wide) {
        const ed = edgesOf(await PG.load(e.src)); if (cur.key !== key) return;
        if (ed.includes('b')) fadeB = true;   // keep her height (the face must stay above the dialogue), the cut lower edge melts away instead
        if (ed.includes('l') && ed.includes('r')) sides = 'lr'; else if (ed.includes('l')) left = `${wdt / 2}cqh`; else if (ed.includes('r')) left = `calc(100% - ${wdt / 2}cqh)`;
      }
      Object.assign(charEl.style, { width: `${wdt}cqh`, bottom, left });
      charEl.classList.toggle('fadeSides', sides === 'lr');
      charEl.classList.toggle('fade', PG.wide ? fadeB && sides !== 'lr' : !!L.fade && !e.view);   // a completed picture has a real lower body: no fade over it on phones
      charEl.classList.toggle('fadeAll', PG.wide && fadeB && sides === 'lr');   // lay.fade: the lower edge melts away (a half-body picture standing free in the frame)
      charEl.hidden = false; charEl.classList.remove('swap');
      if (swap && !o.cut) { charEl.classList.remove('enter'); void charEl.offsetWidth; charEl.classList.add('enter'); }   // a new picture pops in
      if (e.eyes) PG.load(e.eyes.src); e.mouth.forEach((m) => PG.load(m.src));
    },
    hide() { charEl.hidden = true; cur = null; },
    hop() { charEl.classList.remove('hop'); void charEl.offsetWidth; charEl.classList.add('hop'); },
  };
})();
