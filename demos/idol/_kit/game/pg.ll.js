// PG.ll — a LivLiv character for the PG engine (2026-11-14; generic: no character in here — faces from CHAR_PACK, numbers from engine/rules.js). Replaces the drawn stills of PG.stage for a character
// that is a LivLiv package: one model per outfit, the body pose = a model expression x_<pose>, a face expression on top, LivLiv's own
// built-in actions (nod · shake · tilt · hop · shy · lookL / lookR — never 'away': it hides every expression, so the body vanishes),
// mouth from the voice line that is playing (PG.voice.level), our own blinks, and a camera (full body … ear push-in).
// Player: ./livliv/ (@livliv-dev/player 0.5.0, Apache-2.0). Drawn on <canvas id="ll"> right above #char (under FX, thermal edges, sheets).
//   await PG.ll.show(modelUrl, { pose: 'x_clasp', face: 'smile' | null, cam, extra: ['x_phones'], cut })   (resolves when she is on screen)
//   PG.ll.set({ pose, face, cam, extra, prop })  (same model) · prop = { src, h, dy, dx } a scene prop under her face (sizes in face heights), null = none · PG.ll.act('nod') · PG.ll.hop() · PG.ll.hide() · PG.ll.ok (false = no WebGL2 → use stills)
//   cam = { x, y, fh }: face centre (fractions of the frame) + face height (fraction of the frame height); or { p: cam, w: cam } (portrait / wide)
//        PG.ll.fig(top, bottom, x): a cam that shows the whole figure (head top … feet) between those heights (fractions of the frame)
//   PG.ll.drive(fn): a per-frame driver for songs; fn(now, dt) → { pose?, face?, cam?, hopPx?, nod?, sq?, mouth? } (null = off)
// Face names: whatever the character pack defines (CHAR_PACK.faces: name → model expression id); an unknown name is used as an expression id.
// Rules (characters/ART_RULES.md): head turns only small (X ±5°, Y ±4°, Z ±3°), idle off, hair still; ear lines = camera push-in.
(() => {
  const PG = window.PG, SRC = document.currentScript.src;
  // every number here comes from engine/rules.js (PG_RULES.ll); the character's face names come from its pack (CHAR_PACK.faces)
  const RL = Object.assign({ angle: { x: 5, y: 4, z: 3 }, poseCross: 180, bounce: 220, camEase: .24, closeFh: { p: .17, w: .24 }, actSecs: 2.6, lookSecs: 2.2, lookK: .6, mouth: { floor: .06, span: .55 }, blink: [2200, 2800], hopTap: 22 }, (window.PG_RULES || {}).ll || {});
  // the figure in model px: read from each model's own anchors after it loads (head top, feet, face box); this default is only until then
  const FIG = { top: 563, bottom: 3423, face: { x: 904, y: 1005, h: 322 } };
  const EX = (n) => (n ? ((window.CHAR_PACK || {}).faces || {})[n] || n : null);
  const prof = (v) => ({ input: [-30, 30], output: [-v, v], curve: 1, smoothing: 0 }), PROFILE = { angleX: prof(RL.angle.x), angleY: prof(RL.angle.y), angleZ: prof(RL.angle.z) };
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  let cv = null, propEl = null, p = null, booting = null, model = null, loading = null, loadTok = 0, driver = null, lastNow = performance.now();
  const blobs = new Map();
  const S = { pose: 'x_idle', prev: null, dropAt: 0, bounceAt: -1, hopAt: -1, face: null, extra: [], cam: null, cur: { x: .5, y: .3, fh: .1, ok: false }, offsets: {}, off: 0, act: null, actUntil: 0, exprKey: '', mS: 0, shown: false };
  const L = { K: 2, UX: 1000, UY: 1000, C0: { x: 0, y: 0 }, cal: true, pr: 2 };

  const fig = (top, bot, x = .5) => { const fh = (bot - top) * FIG.face.h / (FIG.bottom - FIG.top); return { x, y: top + (FIG.face.y - FIG.top) / FIG.face.h * fh, fh }; };
  const camOf = (c) => (!c ? null : c.p || c.w ? (PG.wide ? c.w || c.p : c.p || c.w) : c);
  const twoFrames = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  async function calibrate() {   // model px per CSS px at zoom 1 (K) and CSS px per unit of view.x / view.y at this canvas size
    const cw = cv.clientWidth, ch = cv.clientHeight; if (!p || !cw || !ch) return;
    L.cal = true; await twoFrames();   // the player sizes its drawing buffer to the canvas box on a frame: measure after it
    Object.assign(p.view, { x: 0, y: 0, zoom: 1 }); await twoFrames();
    const c = p.canvasToModel(cw / 2, ch / 2), r = p.canvasToModel(cw / 2 + 100, ch / 2);
    Object.assign(p.view, { x: .1, y: .1, zoom: 1 }); await twoFrames();
    const s = p.canvasToModel(cw / 2, ch / 2);
    L.K = (r[0] - c[0]) / 100; L.C0 = { x: c[0], y: c[1] }; L.UX = (c[0] - s[0]) / L.K / .1; L.UY = (s[1] - c[1]) / L.K / .1;
    L.cal = false; S.cur.ok = false;
  }
  const place = (P, X, Y, Z) => ({ x: (X - (P.x - L.C0.x) * Z / L.K) / L.UX, y: -(Y - (P.y - L.C0.y) * Z / L.K) / L.UY, zoom: Z });
  let blinkAt = performance.now() + 2500;
  function blink() { const n = performance.now(); if (n > blinkAt + 140) blinkAt = n + RL.blink[0] + Math.random() * RL.blink[1]; const k = (n - blinkAt) / 140; return k < 0 || k > 1 ? 1 : Math.abs(1 - 2 * k); }
  function act(id, secs) {
    if (!p || !id || id === 'away') return; if (S.act) actEnd();
    S.act = id; p.parameterProfile = {};
    try { if (id === 'lookL' || id === 'lookR') { p.idle = true; p.lookAt((id === 'lookL' ? -1 : 1) * RL.lookK, 0); } else p.act(id); } catch (e) { console.warn('[LivLiv act]', id, e); }
    S.actUntil = performance.now() + 1000 * (secs || (id.startsWith('look') ? RL.lookSecs : RL.actSecs));
  }
  function actEnd() { const id = S.act; S.act = null; if (!p) return; if (id === 'lookL' || id === 'lookR') { try { p.lookAt(null); } catch {} p.idle = false; } p.parameterProfile = PROFILE; }
  function setPose(id, cut) { if (!id || id === S.pose) return; S.prev = cut ? null : S.pose; S.pose = id; S.dropAt = performance.now() + RL.poseCross; if (!cut) S.bounceAt = performance.now(); }

  function update(f) {
    if (L.cal || !model) return;
    const now = performance.now(), dt = Math.min(.1, (now - lastNow) / 1000); lastNow = now;
    const D = driver ? driver(now, dt) || {} : {};
    if (D.pose) setPose(D.pose);
    const face = 'face' in D ? EX(D.face) : S.face, cam = camOf(D.cam || S.cam) || fig(.15, .9);
    const e = { [S.pose]: 1 }; if (S.prev && now < S.dropAt) e[S.prev] = 1; if (face) e[face] = 1; for (const x of S.extra) e[x] = 1;
    const key = Object.entries(e).map(([k]) => k).sort().join(','); if (key !== S.exprKey) { S.exprKey = key; p.expr = e; }
    if (S.act && now > S.actUntil) actEnd();
    // mouth: the song's own track (driver) or the voice line that is playing; a line without a voice file flaps softly while it types
    let m = 0;
    if (D.mouth != null) m = D.mouth;
    else if (PG.stage.talking) m = PG.voice.playing ? clamp((PG.voice.level - RL.mouth.floor) / RL.mouth.span) : PG.AUTO ? 0 : .35 + .3 * Math.sin(now / 70);
    S.mS += (m - S.mS) * (m > S.mS ? .6 : .3);
    const vowel = .35 * Math.sin(now / 160);
    if (S.act) Object.assign(f.params, { mouthOpen: S.mS, vowel });
    else Object.assign(f.params, { angleX: 0, angleY: D.nod || 0, angleZ: 0, bodyX: 0, bodyZ: 0, breath: 0, eyeBallX: 0, eyeBallY: 0, mouthOpen: S.mS, vowel });
    f.params.eyeLOpen = f.params.eyeROpen = Math.min(f.params.eyeLOpen ?? 1, blink());
    // camera: eases toward the target (a model change / first show snaps)
    const C = S.cur;
    if (!C.ok) { Object.assign(C, cam, { ok: true }); }
    else { const k = 1 - Math.exp(-dt / RL.camEase); C.x += (cam.x - C.x) * k; C.y += (cam.y - C.y) * k; C.fh *= Math.pow(cam.fh / C.fh, k); }
    let s = D.sq || 1, dip = 0, hop = D.hopPx || 0;
    if (S.bounceAt >= 0) { const b = (now - S.bounceAt) / RL.bounce; if (b >= 1) S.bounceAt = -1; else { s *= 1 + .03 * Math.sin(Math.PI * b); dip = 6 * Math.sin(2 * Math.PI * b); } }
    if (S.hopAt >= 0) { const b = (now - S.hopAt) / 420; if (b >= 1) S.hopAt = -1; else hop += RL.hopTap * Math.sin(Math.PI * b); }
    S.off += ((S.offsets[S.pose] || 0) - S.off) * (1 - Math.exp(-dt / RL.camEase));   // eases with the pose switch
    const cw = cv.clientWidth, ch = cv.clientHeight, Z = (C.fh * ch / FIG.face.h) * L.K * s, oy = S.off * C.fh / FIG.face.h;
    const v = place(FIG.face, (C.x - .5) * cw, (C.y + oy - .5) * ch, Z); v.y += (hop - dip) / L.UY;
    Object.assign(p.view, v);
    // the face on screen (CSS px in the frame): particles keep out of it (pg.css #fxcv / #fx mask), the UI steps aside in a close-up, a scene prop sits under the chin
    const fx = C.x * cw, fy = (C.y + oy) * ch - (hop - dip), fr = C.fh * ch * .95, st = PG.app.style;
    st.setProperty('--llfx', `${fx.toFixed(1)}px`); st.setProperty('--llfy', `${fy.toFixed(1)}px`); st.setProperty('--llfr', `${fr.toFixed(1)}px`);
    const close = C.fh > (PG.wide ? RL.closeFh.w : RL.closeFh.p); if (close !== S.close) { S.close = close; PG.app.classList.toggle('llClose', close); }
    if (S.prop && propEl) { const P = S.prop; Object.assign(propEl.style, { height: `${P.h * C.fh * ch}px`, left: `${fx + (P.dx || 0) * C.fh * ch}px`, top: `${fy + P.dy * C.fh * ch}px` }); }
    const pr = C.fh > .14 ? Math.min(3, Math.max(2, devicePixelRatio || 2)) : Math.min(2, Math.max(1.5, devicePixelRatio || 1)); if (pr !== L.pr) { L.pr = pr; p.maxPixelRatio = pr; }
  }

  function boot() {
    if (booting) return booting;
    booting = (async () => {
      try {
        cv = document.createElement('canvas'); cv.id = 'll'; PG.$('char').insertAdjacentElement('afterend', cv);
        propEl = document.createElement('img'); propEl.id = 'llProp'; propEl.alt = ''; cv.insertAdjacentElement('afterend', propEl);
        const { Player } = await import(window.PG_LIVLIV ? new URL(window.PG_LIVLIV, location.href).href : new URL('livliv/index.js?v=050', SRC).href);   // PG_LIVLIV: a page may point at a player copy that already exists on its site
        if (!Player.isSupported() || PG.Q.has('nowebgl')) throw new Error('WebGL2 not supported');   // ?nowebgl: test the fallback stills
        p = new Player(cv, { followPointer: false, idle: false, maxPixelRatio: 2, renderWhenHidden: true });
        p.parameterProfile = PROFILE; p.use({ order: 20, update });
        let rt = 0; const re = () => { clearTimeout(rt); rt = setTimeout(() => model && calibrate(), 120); };
        new ResizeObserver(re).observe(cv); addEventListener('orientationchange', re);
        return true;
      } catch (err) { console.warn('[LivLiv]', err); PG.ll.ok = false; PG.ll.error = String(err); return false; }
    })();
    return booting;
  }
  const blob = (url) => { if (!blobs.has(url)) blobs.set(url, fetch(url).then((r) => { if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.blob(); })); return blobs.get(url); };
  async function loadModel(url) {
    if (model === url) return; if (loading && loading.url === url) return loading.p;
    const tok = ++loadTok; cv.classList.remove('on');
    const job = (async () => {
      const b = await blob(url); if (tok !== loadTok) return;
      await p.load(b); if (tok !== loadTok) return;
      const first = !model; model = url; S.exprKey = ''; S.prev = null; if (S.act) actEnd(); p.play();
      const A = ((p.seen && p.seen().model) || {}).anchors; if (A && A.face) Object.assign(FIG, { top: A.top_y, bottom: A.bottom_y, face: { x: (A.face[0] + A.face[2]) / 2, y: (A.face[1] + A.face[3]) / 2, h: A.face[3] - A.face[1] } });
      await calibrate(); S.cur.ok = false; if (first) setTimeout(() => calibrate(), 600);
      await new Promise((r) => setTimeout(r, PG.AUTO ? 120 : 320));   // expression weights ease in after a load: let them settle before she is shown
    })();
    loading = { url, p: job }; try { await job; } finally { if (loading && loading.url === url) loading = null; }
  }
  function apply(o) {
    if ('pose' in o) setPose(o.pose, o.cut); if ('face' in o) S.face = EX(o.face); if ('extra' in o) S.extra = o.extra || [];
    if ('prop' in o) { S.prop = o.prop || null; if (propEl) { if (S.prop) { if (propEl.getAttribute('src') !== S.prop.src) propEl.src = S.prop.src; } propEl.classList.toggle('on', !!S.prop && S.shown); } }
    if (o.cam) { S.cam = o.cam; if (o.cut) S.cur.ok = false; }
    if ('offsets' in o) S.offsets = o.offsets || {};   // per-pose vertical offset (model px, + = down): a seated pose sits lower (pack poseOffset)
    if (o.act) setTimeout(() => act(o.act, o.secs), (o.at ?? .25) * 1000);
  }
  const stageHide = PG.stage.hide.bind(PG.stage), stagePose = PG.stage.pose.bind(PG.stage), stageHop = PG.stage.hop.bind(PG.stage);

  PG.ll = {
    ok: true, error: null, FIG, fig,
    get model() { return model; }, get pose() { return S.pose; }, get shown() { return S.shown; },
    /** Load (once) and show this model with these settings. Resolves when she is on screen (false = LivLiv not available). */
    async show(url, o = {}) {
      if (!await boot()) return false;
      apply(o); S.shown = true;
      if (model !== url) { if (o.cut !== false) S.cur.ok = false; try { await loadModel(url); } catch (e) { console.warn('[LivLiv load]', e); PG.ll.error = String(e); return false; } }
      if (model !== url || !S.shown) return true;
      stageHide(); cv.classList.add('on'); PG.app.classList.add('llFace'); if (propEl) propEl.classList.toggle('on', !!S.prop); return true;
    },
    set(o) { apply(o); },
    act, hop() { S.hopAt = performance.now(); },
    hide() { S.shown = false; if (cv) cv.classList.remove('on'); if (propEl) propEl.classList.remove('on'); PG.app?.classList.remove('llFace', 'llClose'); S.close = false; },
    drive(fn) { driver = fn; },
    preload(url) { blob(url).catch(() => {}); },
    /** Without WebGL2: where a fallback still (tools/still_tool.py entry { w, h, y0, y1, cx }, model px) goes for this camera, as a PG.stage.pose layout. */
    stillLay(e, cam, fig, off = 0) {
      const c = camOf(cam), F = fig || FIG, u = c.fh / F.face.h, W = PG.app.clientWidth || 1, H = PG.app.clientHeight || 1;
      const top = c.y + (e.y0 + off - F.face.y) * u, bot = c.y + (e.y1 + off - F.face.y) * u;
      return { h: +((bot - top) * 100).toFixed(2), b: +((1 - bot) * 100).toFixed(2), x: +((c.x * W + (e.cx - F.face.x) * u * H) / W * 100).toFixed(2) };
    },
    debug: () => ({ model, pose: S.pose, face: S.face, expr: S.exprKey, act: S.act, cam: { ...S.cur }, shown: S.shown, cal: L.cal, mouth: +S.mS.toFixed(2), on: !!cv && cv.classList.contains('on') }),
    get player() { return p; },
  };
  // the stills and the LivLiv view never show together
  PG.stage.pose = (...a) => { PG.ll.hide(); return stagePose(...a); };
  PG.stage.hide = () => { PG.ll.hide(); stageHide(); };
  PG.stage.hop = () => { PG.ll.hop(); stageHop(); };
})();
