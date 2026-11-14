// _kit/diva/ll/story_ll.js — a LivLiv Ayane for the story pages (../../../shared/story.js), all-ages kit (2026-11-14, staging).
// The story engine keeps everything it does (script, voices, subtitles, choices + voice judging, DUAL thermal, FX, fades, UI v2); this file only
// replaces the drawn character stills: per view it shows one LivLiv pose with a camera framing, per line an expression + a LivLiv built-in
// action, mouth from the playing voice (story's own analyser level) + round / wide vowel shapes (media/vowel.js), our own blinks.
// Ayane is drawn INTO the scene canvas right after the view's plate (cfg.draw is wrapped), so the demo's FX, the dark / fade / flash overlays
// all sit on top of her exactly like the old stills. Player: ./livliv/ (@livliv-dev/player 0.5.0, Apache-2.0) on a hidden <canvas id="ll">.
// Load after the demo's main.js. Config window.STORY_LL (the demo's ll.js):
//   ns (story namespace) · model (page-relative .livliv) · fig { top, bottom, cx, face { x, y, h } } (model px; defaults = the Ayane outfit models)
//   cams { <name>: { x, y, fh } } face centre (fractions of the 16:9 frame) + face height (fraction of the frame height)
//   views { <story view>: [x_<pose>, cam name, face?] } · ear { <view>: 'L' | 'R' } (views that are at an ear: whisper face + look toward it)
//   lines { <line id>: { face, act, at (s after the line starts, default .25), pose, push (0..1 toward cams.push) } }
//   faces { ear } (default face at an ear) · lookEar (default true) · lookK (default .6) · mouth { floor, span } (voice level → mouth open)
// Actions: nod · shake · tilt · hop · shy · lookL / lookR (lookAt). Never 'away' (it hides every expression, so the pose body vanishes).
// While an action plays our head locks are lifted (parameterProfile = {}, no angle / body overrides), then restored.
(() => {
  const C = window.STORY_LL, SRC = document.currentScript?.src || location.href;
  if (!C) return;
  const API = window[C.ns]; if (!API) { console.warn('[story_ll] no story', C.ns); return; }
  const E = API.E, W = 1920, H = 1080, clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const FIG = Object.assign({ top: 563, bottom: 3423, cx: 906, face: { x: 904, y: 1005, h: 322 } }, C.fig || {});
  const CAMS = Object.assign({ full: { x: .22, y: .3, fh: .056 }, half: { x: .5, y: .25, fh: .17 }, push: { x: .5, y: .42, fh: .3 },
    earL: { x: .36, y: .46, fh: .32 }, earR: { x: .64, y: .46, fh: .32 } }, C.cams || {});
  const EXID = { smile: 'smile', shy: 'x_9a6503', surprise: 'x_40056d', sad: 'x_ba0413', tired: 'x_221c59', pout: 'x_d7dec3', serious: 'x_13c45e', wink: 'x_051b17' };   // 笑顔 照れ 驚き 悲しみ 疲れ ぷんぷん 真剣 ウインク
  const EX = (n) => (n ? EXID[n] || n : null);
  const MO = Object.assign({ floor: .012, span: .07 }, C.mouth || {});
  const llc = document.getElementById('ll');

  // ---- which line is playing (story's E.say, wrapped): id + start time (the vowel track and the per-line face / action)
  let LINE = null;
  const say0 = E.say;
  E.say = async function (id, pos) { LINE = { id, t0: performance.now(), pos, acted: false }; try { return await say0.call(this, id, pos); } finally { if (LINE?.id === id) LINE.end = performance.now(); } };

  // ---- the target each frame: pose, face, camera
  const cam = { x: .5, y: .25, fh: .17, ok: false };
  let lastNow = performance.now();
  function target() {
    const S = API.S, v = S.view, V = C.views[v] || C.views.default || ['x_idle', 'half'];
    const L = LINE && C.lines?.[LINE.id], live = LINE && (!LINE.end || performance.now() - LINE.end < 300);
    const pose = (live && L?.pose) || V[0];
    const ear = C.ear?.[v];
    let face = (live && L?.face) || V[2] || (ear ? C.faces?.ear || 'shy' : null);
    const c = CAMS[V[1]] || CAMS.half, P = CAMS.push, k = live && L?.push ? L.push : 0;
    return { pose, face: EX(face), cam: { x: c.x + (P.x - c.x) * k, y: c.y + (P.y - c.y) * k, fh: c.fh * Math.pow(P.fh / c.fh, k) }, ear };
  }

  // ---- LivLiv player (hidden canvas, read back into the scene canvas: preserveDrawingBuffer is on in the player)
  const LL = { p: null, K: 2, UX: 1000, UY: 1000, C0: { x: 0, y: 0 }, cal: true, pose: null, prev: null, dropAt: 0, bounceAt: -1, exprKey: '', act: null, actUntil: 0, prof: null, ready: false };
  const twoFrames = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  async function calibrate() {   // model px per CSS px at zoom 1 (K) and CSS px per unit of view.x / view.y on this canvas size
    const p = LL.p, cw = llc.clientWidth, ch = llc.clientHeight; if (!p || !cw || !ch) return;
    LL.cal = true;
    Object.assign(p.view, { x: 0, y: 0, zoom: 1 }); await twoFrames();
    const c = p.canvasToModel(cw / 2, ch / 2), r = p.canvasToModel(cw / 2 + 100, ch / 2);
    Object.assign(p.view, { x: .1, y: .1, zoom: 1 }); await twoFrames();
    const s = p.canvasToModel(cw / 2, ch / 2);
    LL.K = (r[0] - c[0]) / 100; LL.C0 = { x: c[0], y: c[1] }; LL.UX = (c[0] - s[0]) / LL.K / .1; LL.UY = (s[1] - c[1]) / LL.K / .1;
    LL.cal = false;
  }
  const place = (P, S, Z) => ({ x: (S.x - (P.x - LL.C0.x) * Z / LL.K) / LL.UX, y: -(S.y - (P.y - LL.C0.y) * Z / LL.K) / LL.UY, zoom: Z });
  let blinkAt = performance.now() + 2500;
  function blink() { const n = performance.now(); if (n > blinkAt + 140) blinkAt = n + 2500 + Math.random() * 2500; const k = (n - blinkAt) / 140; return k < 0 || k > 1 ? 1 : Math.abs(1 - 2 * k); }
  function act(id, secs) {
    const p = LL.p; if (!p || id === 'away') return; if (LL.act) actEnd();
    LL.act = id; p.parameterProfile = {};
    try { if (id === 'lookL' || id === 'lookR') { p.idle = true; p.lookAt((id === 'lookL' ? -1 : 1) * (C.lookK ?? .6), 0); } else p.act(id); } catch (e) { console.warn('[LivLiv act]', id, e); }
    LL.actUntil = performance.now() + 1000 * (secs || (id.startsWith('look') ? 2.2 : 2.6));
  }
  function actEnd() { const p = LL.p, id = LL.act; LL.act = null; if (!p) return; if (id === 'lookL' || id === 'lookR') { p.lookAt(null); p.idle = false; } p.parameterProfile = LL.prof; }

  function update(f) {
    const p = LL.p; if (LL.cal || !API.S.started) return;
    const now = performance.now(), dt = Math.min(.1, (now - lastNow) / 1000); lastNow = now;
    const T = target();
    // pose: the new body over the old for 180 ms + a 220 ms bounce
    if (T.pose !== LL.pose) { LL.prev = LL.pose; LL.pose = T.pose; LL.dropAt = now + 180; if (LL.prev) LL.bounceAt = now; }
    const e = { [LL.pose]: 1 }; if (LL.prev && now < LL.dropAt) e[LL.prev] = 1; if (T.face) e[T.face] = 1;
    const key = Object.keys(e).sort().join(','); if (key !== LL.exprKey) { LL.exprKey = key; p.expr = e; }
    // the line's action (once, `at` s after it starts) or a look toward the ear when a line starts there
    if (LINE && !LINE.acted) {
      const L = C.lines?.[LINE.id], at = (L?.at ?? .25) * 1000;
      if (L?.act && now - LINE.t0 >= at) { LINE.acted = true; act(L.act, L.secs); }
      else if (!L?.act) { LINE.acted = true; if (T.ear && C.lookEar !== false) act(T.ear === 'L' ? 'lookL' : 'lookR', 2.2); }
    }
    if (LL.act && now > LL.actUntil) actEnd();
    // mouth: the voice that is playing (story's analyser level), vowel shapes from the line's own track
    const lv = API.S.lv || 0, mouth = clamp((lv - MO.floor) / MO.span);
    let vowel = 0; const VS = window.LL_VOWEL, vl = window.MoHeatVoice?.lang?.() === 'en' ? 'en' : 'ja';
    if (VS && LINE && !LINE.end) { const tr = (VS[vl] || VS.ja)?.[LINE.id] || VS.ja?.[LINE.id]; if (tr) vowel = tr[clamp(Math.floor((now - LINE.t0) / 1000 * VS.fps), 0, tr.length - 1)] || 0; }
    if (LL.act) Object.assign(f.params, { mouthOpen: mouth, vowel });
    else Object.assign(f.params, { angleX: 0, angleY: 0, angleZ: 0, bodyX: 0, bodyZ: 0, breath: 0, eyeBallX: 0, eyeBallY: 0, mouthOpen: mouth, vowel });
    f.params.eyeLOpen = f.params.eyeROpen = Math.min(f.params.eyeLOpen ?? 1, blink());
    // camera: ease toward the view's framing (≈ the 0.6 s still cross-fade of the old pages)
    if (!cam.ok) { Object.assign(cam, T.cam, { ok: true }); }
    else { const k = 1 - Math.exp(-dt / .22); cam.x += (T.cam.x - cam.x) * k; cam.y += (T.cam.y - cam.y) * k; cam.fh *= Math.pow(T.cam.fh / cam.fh, k); }
    let s = 1, dip = 0;
    if (LL.bounceAt >= 0) { const b = (now - LL.bounceAt) / 220; if (b >= 1) LL.bounceAt = -1; else { s = 1 + .03 * Math.sin(Math.PI * b); dip = .006 * Math.sin(2 * Math.PI * b); } }
    const cw = llc.clientWidth, ch = llc.clientHeight;
    const Z = (cam.fh * ch / FIG.face.h) * LL.K * s;
    Object.assign(p.view, place(FIG.face, { x: (cam.x - .5) * cw, y: (cam.y + dip - .5) * ch }, Z));
    const pr = cam.fh > .12 ? Math.min(3, Math.max(2, devicePixelRatio || 2)) : 2; if (pr !== LL.pr) { LL.pr = pr; p.maxPixelRatio = pr; }
  }
  // draw her into the scene canvas right after the plate (under the demo's FX and the fade / dark / flash overlays)
  const cfg = E.cfg, draw0 = cfg.draw;
  cfg.draw = function (E2, dt) {
    if (LL.ready && !LL.cal && API.S.started && llc.width) { try { E2.ctx.drawImage(llc, 0, 0, W, H); } catch {} }
    return draw0?.call(this, E2, dt);
  };
  (async () => {
    try {
      const { Player } = await import(new URL('livliv/index.js?v=050', SRC).href);
      if (!Player.isSupported()) throw new Error('WebGL2 not supported');
      const p = new Player(llc, { followPointer: false, idle: false, maxPixelRatio: 2, renderWhenHidden: true });
      p.parameterProfile = { angleX: { input: [-30, 30], output: [-5, 5], curve: 1, smoothing: 0 }, angleY: { input: [-30, 30], output: [-6, 6], curve: 1, smoothing: 0 }, angleZ: { input: [-30, 30], output: [-3, 3], curve: 1, smoothing: 0 } };
      LL.prof = p.parameterProfile;
      await p.load(C.model);
      LL.p = p; p.use({ order: 20, update });
      await calibrate(); LL.ready = true;
      let rt = 0; const re = () => { clearTimeout(rt); rt = setTimeout(calibrate, 120); };
      new ResizeObserver(re).observe(llc); addEventListener('orientationchange', re); addEventListener('fullscreenchange', re);
      window.LL_DEBUG = { ready: true, pose: () => LL.pose, expr: () => LL.exprKey, current: () => LL.act, line: () => LINE?.id || null, cam: () => ({ ...cam }), act, player: p };
    } catch (err) { console.warn('[LivLiv]', err); window.LL_DEBUG = { ready: false, error: String(err) }; }
  })();
})();
