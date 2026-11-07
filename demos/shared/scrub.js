// Drag-to-scrub for every demo's timeline (#timelineWrap). Each demo.js already jumps on 'click' (clientX → time);
// while you drag we replay that click at the pointer, so every player's own seek logic (particles reset etc.) is reused.
// Playback pauses during the drag and resumes on release; a bubble shows the target time. Works with mouse and touch.
// window.MoHeatScrubbing is true while dragging (interact.js does not open a gate then).
(() => {
  const wrap = document.getElementById('timelineWrap');
  const A = window.DEMO_DATA && window.DEMO_DATA.anim;
  if (!wrap || !A) return;
  const els = [document.getElementById('mix'), document.getElementById('film')].filter(Boolean);
  const css = document.createElement('style');
  css.textContent = `#timelineWrap{touch-action:none;user-select:none;-webkit-user-select:none}
  #timelineWrap.scrubbing{cursor:grabbing}
  .scrub-tip{position:absolute;top:2px;transform:translateX(-50%);z-index:3;pointer-events:none;padding:2px 7px;border-radius:6px;
    background:rgba(0,0,0,.78);color:#fff;font:600 12px/1.3 "JetBrains Mono",ui-monospace,monospace;white-space:nowrap}`;
  document.head.appendChild(css);
  const tip = document.createElement('span'); tip.className = 'scrub-tip'; tip.hidden = true; wrap.appendChild(tip);
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  let drag = null, raf = 0, lastX = 0;
  const seek = () => {
    raf = 0; const r = wrap.getBoundingClientRect(), k = Math.min(1, Math.max(0, (lastX - r.left) / r.width));
    wrap.dispatchEvent(new MouseEvent('click', { clientX: lastX, clientY: r.top + r.height / 2, bubbles: true }));
    tip.hidden = false; tip.style.left = `${Math.min(r.width - 24, Math.max(24, k * r.width))}px`; tip.textContent = fmt(k * A.duration);
  };
  wrap.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    drag = { id: e.pointerId, moved: false, resume: els.filter((m) => !m.paused && !m.ended) };
    drag.resume.forEach((m) => m.pause());
    wrap.setPointerCapture(e.pointerId); wrap.classList.add('scrubbing'); window.MoHeatScrubbing = true;
    lastX = e.clientX; seek();
  });
  wrap.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    drag.moved = true; lastX = e.clientX; if (!raf) raf = requestAnimationFrame(seek);
  });
  const end = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag; drag = null; wrap.classList.remove('scrubbing'); tip.hidden = true;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    lastX = e.clientX; seek(); tip.hidden = true;
    setTimeout(() => { window.MoHeatScrubbing = false; d.resume.forEach((m) => m.play().catch(() => {})); }, 60);
  };
  wrap.addEventListener('pointerup', end); wrap.addEventListener('pointercancel', end);
})();
