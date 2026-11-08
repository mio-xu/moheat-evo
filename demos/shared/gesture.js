// MoHeatGesture — drag-type touch gestures (stroke / pet / rub / swipe / aim / scrub) that work on phones and tablets.
// User 2026-11-08: "手机上做抚摸动作很难，网页会跟着手指移动". Loaded by nav.js on every full demo page (not in ?embed / ?cover /
// ?render: inside the site's menu iframe a finger on the picture must still scroll the site). DEMO_DESIGN_GUIDE §7.1 "拖动手势".
//
// What it does by itself (no demo code needed), for every .stage (+ the film timeline #timelineWrap):
//   · CSS: touch-action: none on the stage and everything in it (no page pan / pinch / double-tap zoom started on the picture —
//     pinch-zoom elsewhere on the page stays), no text selection, no long-press callout / magnifier, no image drag;
//     html / body overscroll-behavior: none (no pull-to-refresh, no bounce, no swipe-navigation overscroll on Android).
//   · JS: a non-passive touchmove on the stage is preventDefault()-ed (iOS Safari < 13 / any browser that still starts a pan),
//     iOS gesturestart (pinch) on the stage is cancelled, contextmenu / selectstart / dragstart on the stage are cancelled,
//     a touch that STARTS within EDGE px of the screen's left / right edge on the picture is cancelled at touchstart so iOS
//     swipe-back / Chrome swipe-navigation does not take it (buttons there still work: they are skipped).
//   · page lock while a finger is down on the stage: html.mgs-drag (overflow hidden) + the scroll position is held.
// For demo code (optional helpers):
//   MoHeatGesture.guard(el)                       the same protection for any other drag target (idempotent)
//   MoHeatGesture.drag(el, { start, move, end })  Pointer Events + setPointerCapture (the drag continues outside el);
//       p = { x, y (0–1 of el), cx, cy (client px), dx, dy (px since the last move), dist (px in total), turns, ms, type }
//   MoHeatGesture.stroke()                        a tolerant stroke recogniser: r.feed(x, y) with 0–1 coords → gained amount
//       (distance in el widths, + a little for every back-and-forth turn); r.amount, r.turns, r.reset(). No exact paths.
//   MoHeatGesture.hint(stage, { x, y, text, dir }) an animated 👆 ↔ on the target (x, y = 0–1 of the stage) with a caption in the
//       display language (text = { ja, en, zh } or [ja, en]); returns { hide() }.
// Test: node tools/qa/page_probe.js <demo> --no-play --no-mobile (the "drag" probe: CDP touch at 390×844 / 844×390).
(() => {
  if (window.MoHeatGesture) return;
  const QS = new URLSearchParams(location.search);
  const off = QS.has('embed') || QS.has('cover') || QS.has('render');
  const root = document.documentElement, EDGE = 20;
  const INTERACTIVE = 'button, a, input, textarea, select, label, [role=button], .act-btn, .ch, .chip-c';

  const css = document.createElement('style');
  css.textContent = `
  html.mgs-touch, html.mgs-touch body { overscroll-behavior: none; }
  html.mgs-touch .stage, html.mgs-touch .stage *, html.mgs-touch #timelineWrap, html.mgs-touch .mgs-guard, html.mgs-touch .mgs-guard * {
    touch-action: none; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent; }
  html.mgs-touch .stage :is(img, canvas, video), html.mgs-touch .mgs-guard :is(img, canvas, video) { -webkit-user-drag: none; }
  html.mgs-touch .stage :is(input, textarea, [contenteditable]) { -webkit-user-select: text; user-select: text; touch-action: manipulation; }
  html.mgs-drag, html.mgs-drag body { overflow: hidden !important; }
  .mgs-hint { position: absolute; z-index: 5; transform: translate(-50%, -50%); pointer-events: none; text-align: center; opacity: 0; transition: opacity .35s; }
  .mgs-hint.on { opacity: 1; }
  .mgs-hint i { display: block; font-style: normal; font-size: max(26px, 4.2cqw); line-height: 1; filter: drop-shadow(0 2px 6px rgba(0,0,0,.6)); animation: mgSwipe 1.3s ease-in-out infinite; }
  .mgs-hint.v i { animation-name: mgSwipeV; }
  .mgs-hint b { display: inline-block; margin-top: .6cqw; padding: .35cqw 1cqw; border-radius: 999px; background: rgba(10,8,16,.62); color: #fff; white-space: nowrap;
    font: 700 max(11px, 1.3cqw)/1.3 "Zen Maru Gothic", "Noto Sans JP", Inter, sans-serif; }
  .mgs-hint b:empty { display: none; }
  @keyframes mgSwipe { 0%, 100% { transform: translateX(-2.6cqw) rotate(-8deg); } 50% { transform: translateX(2.6cqw) rotate(8deg); } }
  @keyframes mgSwipeV { 0%, 100% { transform: translateY(-1.6cqw); } 50% { transform: translateY(1.6cqw); } }`;
  document.head.appendChild(css);

  // ---------------------------------------------------------------- guard
  const guarded = new WeakSet();
  let lock = null;   // { x, y } while a finger is down on a guarded element
  const scrollable = (t, el) => {   // an element inside the guarded one that really scrolls keeps its own touch scrolling
    for (let n = t; n && n !== el && n.nodeType === 1; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (/(auto|scroll)/.test(s.overflowY + s.overflowX) && (n.scrollHeight > n.clientHeight + 1 || n.scrollWidth > n.clientWidth + 1)) return true;
    }
    return false;
  };
  function lockPage() {
    if (lock) return;
    lock = { x: scrollX, y: scrollY }; root.classList.add('mgs-drag');
  }
  function unlockPage() { if (!lock) return; root.classList.remove('mgs-drag'); lock = null; }
  addEventListener('scroll', () => { if (lock && (scrollX !== lock.x || scrollY !== lock.y)) scrollTo(lock.x, lock.y); }, { passive: true });
  for (const ev of ['pointerup', 'pointercancel']) addEventListener(ev, (e) => { if (e.pointerType !== 'mouse' && e.isPrimary) unlockPage(); }, true);
  addEventListener('touchend', (e) => { if (!e.touches.length) unlockPage(); }, true);
  addEventListener('blur', unlockPage);

  function guard(el) {
    if (!el || guarded.has(el)) return el;
    guarded.add(el); el.classList.add('mgs-guard');
    el.addEventListener('touchstart', (e) => {
      const t = e.changedTouches[0];
      if (t && (t.clientX < EDGE || t.clientX > innerWidth - EDGE) && !e.target.closest?.(INTERACTIVE) && e.cancelable) e.preventDefault();   // iOS swipe-back
    }, { passive: false });
    el.addEventListener('touchmove', (e) => { if (e.cancelable && !scrollable(e.target, el)) e.preventDefault(); }, { passive: false });
    el.addEventListener('gesturestart', (e) => e.preventDefault());   // iOS pinch on the picture
    el.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') lockPage(); });
    for (const ev of ['contextmenu', 'selectstart', 'dragstart']) el.addEventListener(ev, (e) => { if (!e.target.closest?.('input, textarea, [contenteditable]')) e.preventDefault(); });
    return el;
  }

  // ---------------------------------------------------------------- drag: pointer events + capture
  function drag(el, h = {}) {
    guard(el);
    let p = null;
    const pos = (e) => { const r = el.getBoundingClientRect(); return { x: (e.clientX - r.left) / (r.width || 1), y: (e.clientY - r.top) / (r.height || 1), cx: e.clientX, cy: e.clientY }; };
    const down = (e) => {
      if (p || (e.pointerType === 'mouse' && e.button !== 0)) return;
      try { el.setPointerCapture(e.pointerId); } catch {}
      p = { id: e.pointerId, type: e.pointerType, ...pos(e), dx: 0, dy: 0, dist: 0, turns: 0, t0: performance.now(), ms: 0, lx: 0, ly: 0 };
      h.start?.(p, e);
    };
    const move = (e) => {
      if (!p || e.pointerId !== p.id) return;
      const q = pos(e), dx = q.cx - p.cx, dy = q.cy - p.cy;
      if (dx * p.lx + dy * p.ly < 0 && Math.hypot(dx, dy) > 2) p.turns++;
      if (Math.hypot(dx, dy) > 2) { p.lx = dx; p.ly = dy; }
      Object.assign(p, q, { dx, dy, dist: p.dist + Math.hypot(dx, dy), ms: performance.now() - p.t0 });
      h.move?.(p, e);
    };
    const end = (e) => { if (!p || e.pointerId !== p.id) return; const q = p; p = null; h.end?.(q, e, e.type === 'pointercancel'); };
    el.addEventListener('pointerdown', down); el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end); el.addEventListener('lostpointercapture', end);
    return () => { for (const [ev, f] of [['pointerdown', down], ['pointermove', move], ['pointerup', end], ['pointercancel', end], ['lostpointercapture', end]]) el.removeEventListener(ev, f); };
  }

  // ---------------------------------------------------------------- stroke: distance + back-and-forth, not an exact path
  function stroke({ turnBonus = .02, minStep = .002 } = {}) {
    let last = null, dir = null;
    const r = { amount: 0, turns: 0,
      reset() { last = null; dir = null; r.amount = 0; r.turns = 0; },
      lift() { last = null; dir = null; },
      feed(x, y) {
        if (!last) { last = [x, y]; return 0; }
        const dx = x - last[0], dy = y - last[1], d = Math.hypot(dx, dy);
        if (d < minStep) return 0;
        let g = d;
        if (dir && dx * dir[0] + dy * dir[1] < 0) { r.turns++; g += turnBonus; }   // a small back-and-forth on the target counts too
        dir = [dx, dy]; last = [x, y]; r.amount += g; return g;
      } };
    return r;
  }

  // ---------------------------------------------------------------- hint: 👆 ↔ on the target + a caption in the display language
  function hint(stage, { x = .5, y = .5, text = null, dir = 'h', icon = '👆' } = {}) {
    stage = stage || document.querySelector('.stage');
    const d = document.createElement('div'); d.className = `mgs-hint${dir === 'v' ? ' v' : ''}`;
    d.style.left = `${x * 100}%`; d.style.top = `${y * 100}%`;
    const cap = () => { const L = window.MoHeatSub?.lang || 'en'; const t = !text ? '' : Array.isArray(text) ? (L === 'ja' ? text[0] : text[1]) : (text[L] || text.en || ''); return t; };
    d.innerHTML = `<i>${icon}</i><b></b>`; d.querySelector('b').textContent = cap();
    const relang = () => { d.querySelector('b').textContent = cap(); };
    addEventListener('moheat:sublang', relang);
    stage.appendChild(d); requestAnimationFrame(() => d.classList.add('on'));
    return { el: d, hide() { removeEventListener('moheat:sublang', relang); d.classList.remove('on'); setTimeout(() => d.remove(), 400); } };
  }

  window.MoHeatGesture = { guard, drag, stroke, hint, EDGE, get locked() { return !!lock; } };
  if (off) return;
  root.classList.add('mgs-touch');
  const auto = () => document.querySelectorAll('.stage, #timelineWrap').forEach(guard);
  auto(); if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto); addEventListener('load', auto);
})();
