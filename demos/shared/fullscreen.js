// MoHeatFullscreen — a ⛶ button next to the 🌐 language button on every demo's stage (user 2026-11-08: "增加全屏功能"). Loaded by nav.js.
//   · tap ⛶ or press F: the page goes fullscreen and shows only the picture — the largest 16:9 that fits, black around it, no play bar
//     (film demos pause with Space). Esc / ⛶ / F again: back. Also inside the site's iframe (allow="fullscreen").
//   · browsers without element fullscreen (iPhone Safari): the same picture-only layout fills the window instead.
//   · works by a class on <html> (html.mfs) + the CSS below, so the demos' own code is untouched; the stage keeps its cqw sizing.
//   · PHONES (user 2026-11-08: "手机上点全屏时自动提示横屏，让用户把手机横过来"; touch + short screen side ≤ 600 px):
//     ⛶ also tries screen.orientation.lock('landscape') (Android Chrome in real fullscreen; iPhone has no lock → ignored). If the phone
//     is still upright afterwards, a full-screen "turn your phone sideways" card (animated phone, text in the display language via
//     MoHeatSub.pick — add a language = one more key in ROT) covers the page; it goes away by itself as soon as the phone is landscape,
//     and "Continue in portrait" dismisses it for this fullscreen session. Nothing is paused or reloaded (only resize events, as for any
//     rotation). The picture sits inside the safe area (notch). Leaving fullscreen unlocks the orientation. Desktop: unchanged.
(() => {
  if (window.MoHeatFullscreen) return;
  const QS = new URLSearchParams(location.search);
  if (QS.has('cover') || QS.has('render')) return;
  const root = document.documentElement;
  const css = document.createElement('style');
  css.textContent = `
  html.mfs body { background: #000 !important; overflow: hidden !important; }
  html.mfs header.bar, html.mfs aside.side, html.mfs .legend { display: none !important; }
  html.mfs .layout { display: block !important; padding: 0 !important; margin: 0 !important; max-width: none !important; height: 100dvh !important; }
  html.mfs.mfs body .stage { --fs-l: env(safe-area-inset-left, 0px); --fs-r: env(safe-area-inset-right, 0px); --fs-t: env(safe-area-inset-top, 0px);
    --fs-b: calc(env(safe-area-inset-bottom, 0px) + var(--fs-below, 0px));
    position: fixed !important; left: calc(var(--fs-l) + (100vw - var(--fs-l) - var(--fs-r)) / 2) !important; top: calc(var(--fs-t) + (100dvh - var(--fs-t) - var(--fs-b)) / 2) !important;
    transform: translate(-50%, -50%) !important;
    width: min(100vw - var(--fs-l) - var(--fs-r), (100dvh - var(--fs-t) - var(--fs-b)) * 16 / 9) !important; max-width: none !important; margin: 0 !important;
    border-radius: 0 !important; border: 0 !important; box-shadow: none !important; z-index: 40; }
  html.mfs .transport { display: none !important; }   /* picture only (user): film demos pause with Space */
  .mfs-btn { min-width: 2.2em; text-align: center; }
  .mfs-rot { position: fixed; inset: 0; z-index: 9000; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px;
    padding: max(24px, env(safe-area-inset-top)) max(24px, env(safe-area-inset-right)) max(24px, env(safe-area-inset-bottom)) max(24px, env(safe-area-inset-left));
    background: rgba(5, 4, 10, .88); -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px); color: #f5eefb; text-align: center; touch-action: none;
    font: 500 15px/1.5 Inter, "Noto Sans JP", "PingFang SC", "Apple SD Gothic Neo", system-ui, sans-serif; -webkit-user-select: none; user-select: none; }
  .mfs-rot svg { width: 120px; height: 120px; overflow: visible; }
  .mfs-rot .mfs-ph { transform-origin: 60px 60px; animation: mfs-turn 2.4s ease-in-out infinite; }
  .mfs-rot .mfs-arr { animation: mfs-arr 2.4s ease-in-out infinite; }
  @keyframes mfs-turn { 0%, 18% { transform: rotate(0deg); } 48%, 78% { transform: rotate(-90deg); } 100% { transform: rotate(0deg); } }
  @keyframes mfs-arr { 0%, 12% { opacity: 0; } 22%, 50% { opacity: 1; } 62%, 100% { opacity: 0; } }
  @media (prefers-reduced-motion: reduce) { .mfs-rot .mfs-ph { animation: none; transform: rotate(-90deg); } .mfs-rot .mfs-arr { animation: none; opacity: 1; } }
  .mfs-rot h2 { margin: 0; font-size: 21px; font-weight: 700; letter-spacing: .01em; }
  .mfs-rot p { margin: 0; max-width: 320px; font-size: 14px; color: #c9bcd8; }
  .mfs-rot button { margin-top: 10px; min-height: 44px; padding: 0 18px; border: 0; background: none; color: #ffd58a; font: inherit; font-size: 14px;
    text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }`;
  document.head.appendChild(css);

  // ---- phones: ask for landscape (strings: one key per language, missing → English through MoHeatSub's fallback chain)
  const ROT = {
    title: { en: 'Turn your phone sideways for a better experience', ja: 'スマホを横向きにすると、もっと楽しめます', zh: '请把手机横过来，体验更好', ko: '휴대폰을 가로로 돌리면 더 잘 즐길 수 있어요' },
    sub: { en: 'The picture fills the screen in landscape. If it does not turn, switch off the rotation lock.',
      ja: '横向きにすると画面いっぱいに表示されます。回転しないときは、画面の回転ロックをオフにしてください。',
      zh: '横屏时画面会铺满整个屏幕。如果画面没有跟着转，请关闭屏幕旋转锁定。',
      ko: '가로로 돌리면 화면 가득 표시됩니다. 돌아가지 않으면 화면 회전 잠금을 꺼 주세요.' },
    skip: { en: 'Continue in portrait', ja: '縦向きのまま続ける', zh: '继续竖屏观看', ko: '세로로 계속 보기' },
  };
  const T = (o) => (window.MoHeatSub ? window.MoHeatSub.pick(o) : o.en) || o.en;
  let testPhone = false;   // tools/web/check_mobile.html (iframes on a desktop) sets MoHeatFullscreen.testPhone = true
  const isPhone = () => testPhone || (navigator.maxTouchPoints > 0 || matchMedia('(pointer: coarse)').matches) && Math.min(screen.width, screen.height) <= 600;
  const portrait = () => matchMedia('(orientation: portrait)').matches;
  let rot = null, armed = false, dismissed = false, locked = false;
  function rotText() {
    if (!rot) return;
    rot.lang = window.MoHeatSub ? (window.MoHeatSub.LANGS[window.MoHeatSub.lang]?.bcp || 'en') : 'en';
    rot.querySelector('h2').textContent = T(ROT.title); rot.querySelector('p').textContent = T(ROT.sub); rot.querySelector('button').textContent = T(ROT.skip);
  }
  function showRot(v) {
    if (!v) { rot?.remove(); rot = null; return; }
    if (rot) return;
    rot = document.createElement('div'); rot.className = 'mfs-rot'; rot.setAttribute('role', 'dialog'); rot.setAttribute('aria-live', 'polite');
    rot.innerHTML = `<svg viewBox="0 0 120 120" aria-hidden="true"><g class="mfs-ph"><rect x="38" y="16" width="44" height="88" rx="9" fill="none" stroke="#f5eefb" stroke-width="4"/>
      <rect x="45" y="27" width="30" height="62" rx="3" fill="#ffd58a" opacity=".35"/><circle cx="60" cy="96" r="2.6" fill="#f5eefb"/></g>
      <path class="mfs-arr" d="M98 34 A44 44 0 0 1 104 70" fill="none" stroke="#ffd58a" stroke-width="4" stroke-linecap="round"/>
      <path class="mfs-arr" d="M96 64 L104 72 L110 62" fill="none" stroke="#ffd58a" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <h2></h2><p></p><button type="button"></button>`;
    for (const t of ['click', 'pointerdown', 'touchstart']) rot.addEventListener(t, (e) => e.stopPropagation());   // the stage underneath never gets these taps
    rot.querySelector('button').addEventListener('click', () => { dismissed = true; showRot(false); });
    rotText(); document.body.appendChild(rot);
  }
  function rotCheck() { showRot(armed && !dismissed && root.classList.contains('mfs') && isPhone() && portrait()); }
  function lockLandscape() {   // Android Chrome: only in real fullscreen; iPhone / desktop: no lock → rejected / undefined, ignored
    try { const p = screen.orientation?.lock?.('landscape'); if (p?.then) return p.then(() => { locked = true; }, () => {}); } catch {}
    return Promise.resolve();
  }
  function unlock() { if (!locked) return; locked = false; try { screen.orientation?.unlock?.(); } catch {} }
  const lmq = matchMedia('(orientation: landscape)');
  lmq.addEventListener?.('change', rotCheck);
  addEventListener('orientationchange', rotCheck);
  addEventListener('moheat:sublang', rotText);

  let btn = null;
  const label = () => { if (btn) { const on = root.classList.contains('mfs'); btn.textContent = on ? '⤡' : '⛶'; btn.title = on ? 'Exit fullscreen (Esc / F)' : 'Fullscreen (F)'; } };
  function below() { root.style.setProperty('--fs-below', '0px'); }   // nothing under the picture in fullscreen
  function set(on) {
    if (on === root.classList.contains('mfs')) return;
    root.classList.toggle('mfs', on); below(); label();
    const el = document.documentElement;
    if (on) {
      armed = false; dismissed = false;
      let p = null;
      if (!document.fullscreenElement) try { p = (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el); } catch {}
      if (isPhone()) {   // lock after the fullscreen request settles (the lock needs real fullscreen), then ask only if still upright
        const go = () => (root.classList.contains('mfs') ? lockLandscape() : Promise.resolve());
        let fired = false;
        const arm = () => { if (fired) return; fired = true; armed = true; rotCheck(); };
        Promise.resolve(p).catch(() => {}).then(go).then(() => setTimeout(arm, 250));
        setTimeout(arm, 1500);   // a lock that never settles
      } else p?.catch?.(() => {});
    } else {
      armed = false; showRot(false); unlock();
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    }
    dispatchEvent(new Event('resize'));   // the demos re-measure (nav.js fit, canvases)
  }
  const toggle = () => set(!root.classList.contains('mfs'));
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && root.classList.contains('mfs')) set(false); });
  addEventListener('keydown', (e) => {
    if (e.repeat || e.metaKey || e.ctrlKey || e.altKey || /input|textarea|select/i.test(e.target.tagName) || e.target.isContentEditable) return;
    if (e.key === 'f' || e.key === 'F') { e.preventDefault(); toggle(); }
    else if (e.key === 'Escape' && root.classList.contains('mfs')) set(false);   // pseudo-fullscreen (no Fullscreen API) also leaves with Esc
  });
  addEventListener('resize', () => { if (root.classList.contains('mfs')) { below(); rotCheck(); } });

  function place(tries = 0) {   // next to the 🌐 language button (shared/subs.js); its own corner button if there is none
    const sub = document.querySelector('.stage .msub-btn:not(.mfs-btn)');
    if (!sub && tries < 20) { setTimeout(() => place(tries + 1), 150); return; }
    btn = document.createElement('button'); btn.type = 'button';
    btn.className = `msub-btn mfs-btn${sub?.classList.contains('hud-btn') ? ' hud-btn' : ''}`;
    btn.addEventListener('click', (e) => { e.stopPropagation(); toggle(); });
    if (sub) sub.after(btn);
    else { const stage = document.querySelector('#stage, .stage'); if (!stage) return; const w = document.createElement('div'); w.className = 'msub-hud'; w.appendChild(btn); stage.appendChild(w); }
    label();
  }
  window.MoHeatFullscreen = { set, toggle, get on() { return root.classList.contains('mfs'); }, get phone() { return isPhone(); },
    get askingRotate() { return !!rot; }, get locked() { return locked; }, set testPhone(v) { testPhone = !!v; } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => place()); else place();
})();
