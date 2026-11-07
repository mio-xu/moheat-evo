// MoHeatFullscreen — a ⛶ button next to the 🌐 language button on every demo's stage (user 2026-11-08: "增加全屏功能"). Loaded by nav.js.
//   · tap ⛶ or press F: the page goes fullscreen and shows only the picture — the largest 16:9 that fits, black around it; a film
//     demo's play bar (.transport) stays at the bottom. Esc / ⛶ / F again: back. Also inside the site's iframe (allow="fullscreen").
//   · browsers without element fullscreen (iPhone Safari): the same picture-only layout fills the window instead.
//   · works by a class on <html> (html.mfs) + the CSS below, so the demos' own code is untouched; the stage keeps its cqw sizing.
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
  html.mfs.mfs body .stage { position: fixed !important; left: 50% !important; top: calc((100dvh - var(--fs-below, 0px)) / 2) !important; transform: translate(-50%, -50%) !important;
    width: min(100vw, calc((100dvh - var(--fs-below, 0px)) * 16 / 9)) !important; max-width: none !important; margin: 0 !important;
    border-radius: 0 !important; border: 0 !important; box-shadow: none !important; z-index: 40; }
  html.mfs .transport { position: fixed !important; left: 0; right: 0; bottom: 0; z-index: 41; margin: 0 !important; padding: 6px 14px !important; background: rgba(0, 0, 0, .7); }
  .mfs-btn { min-width: 2.2em; text-align: center; }`;
  document.head.appendChild(css);

  let btn = null;
  const label = () => { if (btn) { const on = root.classList.contains('mfs'); btn.textContent = on ? '⤡' : '⛶'; btn.title = on ? 'Exit fullscreen (Esc / F)' : 'Fullscreen (F)'; } };
  function below() { const t = document.querySelector('.stage-col .transport'); root.style.setProperty('--fs-below', `${t ? t.offsetHeight : 0}px`); }
  function set(on) {
    if (on === root.classList.contains('mfs')) return;
    root.classList.toggle('mfs', on); below(); label();
    const el = document.documentElement;
    if (on && !document.fullscreenElement) (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el)?.catch?.(() => {});
    if (!on && document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    dispatchEvent(new Event('resize'));   // the demos re-measure (nav.js fit, canvases)
  }
  const toggle = () => set(!root.classList.contains('mfs'));
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && root.classList.contains('mfs')) set(false); });
  addEventListener('keydown', (e) => {
    if (e.repeat || e.metaKey || e.ctrlKey || e.altKey || /input|textarea|select/i.test(e.target.tagName) || e.target.isContentEditable) return;
    if (e.key === 'f' || e.key === 'F') { e.preventDefault(); toggle(); }
    else if (e.key === 'Escape' && root.classList.contains('mfs')) set(false);   // pseudo-fullscreen (no Fullscreen API) also leaves with Esc
  });
  addEventListener('resize', () => { if (root.classList.contains('mfs')) below(); });

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
  window.MoHeatFullscreen = { set, toggle, get on() { return root.classList.contains('mfs'); } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => place()); else place();
})();
