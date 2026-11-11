// shared/engine/stage.js — MoHeatEngine.stage(o): the 16:9 picture of an own-engine demo: one still per view, cross-fades between
// views, an optional Seedance clip player (handoff §4b: clips whose first / last frames are exactly the stills, switched only at a
// clip's end), and the moheat:pause fix (paused mid cross-fade → show the new view only, shell.js, 2026-11-11).
//   o.state()   → S (S.view, S.started, S.t)       o.run() → the story run token        o.draw(t, dt) → the demo's whole draw (pause fix)
//   o.ctx       the #scene 2D context               o.views [names]   o.src(name) → still URL   o.blank  fill colour without a still
//   o.clips     clip names: v_<view> loops + t_<from>_<to> transitions (media/video/<name>.mp4?v=1; ?stills / ?cover = none)
//   o.drawView(view, alpha, t, isNew) / o.onViewChange() / o.beforeViews(t, dt): a demo's own still staging (default: the engine's)
//   o.fade      cross-fade seconds (.6)          o.zoomExtra(view) → extra still zoom (a push-in, Demo25 'close'; 0)
// Returns { IMG, artReady, draw(t, dt) (cross-fade + clips, call first in the demo's draw), drawView(view, alpha, t), go(name, view,
// onStart) → Promise, live() (shared/layers.js draws), zoom(t) → { z, dy } (the still's breathing drift, for overlays), mix(), viewA / viewB
// (the cross-fade pair: B = the view fading in),
// reset() (on start), CLIP }.
(() => {
  const ME = window.MoHeatEngine = window.MoHeatEngine || {};
  if (ME.stage) return;
  ME.stage = (o) => {
    const QS = new URLSearchParams(location.search), W = 1920, H = 1080, ctx = o.ctx, FADE = o.fade ?? .6;
    const sleep = (s) => new Promise((r) => setTimeout(r, s * 1000));
    const IMG = {};
    const artReady = Promise.all(o.views.map((n) => new Promise((res) => { const im = new Image(); im.onload = () => { IMG[n] = im; res(); }; im.onerror = () => res(); im.src = o.src(n); })));
    let viewA = o.views[0], viewB = o.views[0], mix = 1;
    const CLIP_NAMES = o.clips || [];
    const ONCE = new Set(CLIP_NAMES.filter((n) => n.startsWith('t_')));
    const CLIP = {};
    if (!QS.has('stills') && !QS.has('cover')) for (const n of CLIP_NAMES) {
      const v = document.createElement('video'); Object.assign(v, { muted: true, loop: false, playsInline: true, preload: 'auto', src: `media/video/${n}.mp4?v=1` });
      v.setAttribute('playsinline', ''); v.addEventListener('error', () => { delete CLIP[n]; }); CLIP[n] = v;
    }
    const clipOK = (n) => n && CLIP[n] && CLIP[n].readyState >= 2;
    let cur = null, curView = null, pending = null;
    const loopFor = (view) => 'v_' + view;
    function go(name, view, onStart) {   // a one-shot transition at the next clip end, then continue in `view`; onStart() when the transition starts
      const S = o.state();
      if (!clipOK(name) || !cur) { onStart?.(); S.view = view; return sleep(.6); }
      const my = o.run();
      return new Promise((done, fail) => { pending = { name, view, onStart, done: () => (my === o.run() ? done() : fail(new Error('stopped'))), started: false }; });
    }
    function playClip(name, view) { const v = CLIP[name]; cur = name; curView = view; v.currentTime = 0; v.play().catch(() => {}); }
    function startLoop() { const w = loopFor(o.state().view); if (clipOK(w)) playClip(w, o.state().view); else cur = null; }
    function clips() {
      if (QS.has('stills')) return;
      const S = o.state();
      if (!cur) { startLoop(); return; }
      if (!ONCE.has(cur) && curView !== S.view && !pending) { startLoop(); return; }
      const v = CLIP[cur];
      if (!v.ended && v.currentTime < v.duration - .03) return;   // mid-clip: never switch
      if (ONCE.has(cur) && pending && pending.started) { const p = pending; pending = null; S.view = curView; viewA = viewB = curView; mix = 1; p.done(); }
      if (pending && !pending.started) { pending.started = true; pending.onStart?.(); playClip(pending.name, pending.view); return; }
      startLoop();
    }
    function drawClip(view, alpha) {
      if (!(cur && clipOK(cur) && (view === curView || (view === o.state().view && ONCE.has(cur))))) return false;
      ctx.globalAlpha = alpha; ctx.drawImage(CLIP[cur], 0, 0, W, H); ctx.globalAlpha = 1; return true;
    }
    // layered stills (demos/shared/layers.js) breathe / sway on their own: no page zoom / bob on top (the background would breathe with her)
    const LIVE = () => !!(window.MoHeatLayers && window.MoHeatLayers.live);
    function drawView(view, alpha, t) {
      if (drawClip(view, alpha)) return;
      const exact = !QS.has('stills') && Object.keys(CLIP).length > 0;   // with video the still must match the clips' frames exactly (no drift)
      const im = IMG[view];
      ctx.globalAlpha = alpha;
      if (!im) { ctx.fillStyle = o.blank || '#000'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; return; }
      const z = exact ? 1 : 1.02 + (LIVE() ? 0 : .008 * Math.sin(t * 1.1)) + (o.zoomExtra ? o.zoomExtra(view) : 0), dh = W * im.height / im.width;
      ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.drawImage(im, -W / 2, -dh / 2 + (exact || LIVE() ? 0 : 4 * Math.sin(t * .9)), W, dh); ctx.restore();
      ctx.globalAlpha = 1;
    }
    function zoom(t) {   // the same drift as drawView, for code overlays that must stay on a point of the still
      const exact = Object.keys(CLIP).length > 0;
      return { z: exact ? 1 : 1.02 + (LIVE() ? 0 : .008 * Math.sin(t * 1.1)), dy: exact || LIVE() ? 0 : 4 * Math.sin(t * .9) };
    }
    function draw(t, dt) {
      const S = o.state();
      if (S.view !== viewB) { viewA = viewB; viewB = S.view; mix = 0; o.onViewChange?.(); }
      clips();
      mix = Math.min(1, mix + dt / FADE);
      o.beforeViews?.(t, dt);
      const dv = o.drawView || drawView;   // o.drawView(view, alpha, t, isNew): a demo's own still staging (Demo28 / 29: push-in toward the speaker)
      if (mix < 1) dv(viewA, 1, t, false);
      dv(viewB, mix < 1 ? mix : 1, t, true);
    }
    if (o.pauseFix !== false) addEventListener('moheat:pause', (e) => { const S = o.state(); if (e.detail && S.started && (mix < 1 || S.view !== viewB)) { viewA = viewB = S.view; mix = 1; try { o.draw(S.t ?? 0, 0); } catch {} } });   // paused mid cross-fade: show the new view only (shell.js moheat:pause, Demo21 2026-11-11)
    function reset(view) { viewA = viewB = view; mix = 1; cur = null; pending = null; }
    return { IMG, artReady, draw, drawView, go, live: LIVE, zoom, mix: () => mix, get viewA() { return viewA; }, get viewB() { return viewB; }, reset, CLIP };
  };
})();
