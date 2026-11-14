// asmr-love — the page glue every demo of this category shares (built pages load it after the engine, the pack and the demo's data).
// Stage = the PG engine mounted stage-only inside #app (LivLiv character, plates, props, fx, edge glows); the site's UI v2 shell owns the bar,
// cover, chapters (#steps), language and voice language; subtitles #subJa / #subEn (shared/subs.js); asks = .ch buttons (shared/voice.js).
// The story itself: PG.story.run(window.STORY, …) — nothing here knows a character or a story.
(() => {
  const PG = window.PG, $ = (id) => document.getElementById(id), me = document.currentScript, CHAR = me.dataset.char;
  const QS = new URLSearchParams(location.search), STORY = window.STORY, V = window.STORY_VOICE;
  PG.mount({ id: `asmr.${STORY.id}`, langs: ['en', 'ja', 'zh', 'ko'], stage: true, genre: 'asmr-love' });
  // the side card meters + the command line follow the engine's thermal state (the device itself is driven by PG.Therm)
  const meters = Object.fromEntries(['Lc', 'Lh', 'Rc', 'Rh'].map((k) => [k, [$(`m${k}`), $(`v${k}`)]]));
  addEventListener('pg:thermal', (e) => {
    const t = e.detail || {}; for (const [k, [bar, val]] of Object.entries(meters)) { if (bar) bar.style.width = `${(t[k] || 0) * 100}%`; if (val) val.textContent = Math.round((t[k] || 0) * 100); }
    const c = (v) => Math.round(35 + v * 45), h = (v) => Math.round(v * 200), on = Math.max(t.Lc || 0, t.Lh || 0, t.Rc || 0, t.Rh || 0) > .03;
    if ($('cmd')) $('cmd').textContent = on ? `DUAL LC${t.Lc > .03 ? c(t.Lc) : 0} LH${h(t.Lh || 0)} RC${t.Rc > .03 ? c(t.Rc) : 0} RH${h(t.Rh || 0)}` : 'stop';
  });
  // ■ STOP (QA 2026-11-14 M2): the engine's halt (every channel 0, `stop` sent at once, nothing more until re-armed — ▶ does not re-arm it)
  // + the site's 'tripped' state on the button (shell.js / kiosk.js read that class). Re-arm = the same button again.
  const estop = $('estop');
  const trip = (on) => { PG.Therm.halt(on); if (on) { try { window.MoHeatDevice?.current?.send?.('stop'); } catch {} }
    estop.classList.toggle('tripped', on); estop.textContent = on ? '↺ Re-arm output' : '■ STOP'; };
  // output off at the TOUCH (no 0.75 s of warm / cool after pressing on a phone); the tripped state at the click, after shell.js has paused
  // A press that never becomes a click (the finger slides off, QA n2) still completes the STOP 0.8 s later — safety first: tripped + paused.
  // A long press that does end in a click does not toggle it back (done = this press already tripped it).
  let pending = 0, done = false;
  estop?.addEventListener('pointerdown', (e) => { if (e.button !== 0 || estop.classList.contains('tripped')) return;
    PG.Therm.halt(true); try { window.MoHeatDevice?.current?.send?.('stop'); } catch {}
    clearTimeout(pending); done = false; pending = setTimeout(() => { if (estop.classList.contains('tripped')) return; trip(true); done = true; window.MoHeatShell?.pause?.(true); }, 800); });
  estop?.addEventListener('click', () => { clearTimeout(pending); if (done) { done = false; return; } trip(!estop.classList.contains('tripped')); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && estop) { e.preventDefault(); trip(!estop.classList.contains('tripped')); } });
  // warm only (the visitor's choice: device.js MoHeatDevice.warmOnly(), or <html data-warm-only>): the engine drops every cool for the
  // device AND the picture (edge glow, meters) — QA m5; the two cool meter rows are hidden like on the other demos
  const warmOnly = () => document.documentElement.hasAttribute('data-warm-only') || !!window.MoHeatDevice?.warmOnly?.();
  const applyWO = () => { const on = warmOnly(); ((window.PG_RULES = window.PG_RULES || {}).thermal = window.PG_RULES.thermal || {}).warmOnly = on;
    for (const k of ['Lc', 'Rc']) { const r = $(`m${k}`)?.closest('.meter-row'); if (r) r.hidden = on; } };
  applyWO(); setInterval(applyWO, 1000);
  if (STORY.steps) { const el = $('steps'); if (el) el.innerHTML = STORY.steps.map((s) => `<li>${s.ja} · <small>${s.en}</small></li>`).join(''); }
  let t0 = 0, clock = 0; setInterval(() => { if (t0 && $('clock')) { const s = (performance.now() - t0) / 1000; $('clock').textContent = `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`; } }, 500);
  $('lrBtn')?.addEventListener('click', () => { PG.audioOn(); PG.sfx?.pick?.(); });
  let running = false;
  async function start() {
    if (running) return; running = true; PG.audioOn(); $('intro')?.classList.add('hidden'); t0 = performance.now();
    try {
      await PG.story.run(STORY, {
        pack: window.CHAR_PACK, base: new URL(CHAR, location.href).href, ui: 'site', warmOnly: warmOnly(),
        media: { voice: 'media/voice/', dur: V.dur, env: V.env }, text: STORY.text,
        lang: () => (window.MoHeatVoice?.lang?.() === 'en' ? 'en' : 'ja'),
      });
    } catch (e) { console.error('[asmr]', e); }
    running = false; t0 = 0;
    try { sessionStorage.setItem(`moheat.asmr.${STORY.id}.cleared`, '1'); } catch {}
    $('intro')?.classList.remove('hidden');   // back to this demo's own cover (never an "ended" card)
  }
  // preload behind the cover (QA m6: the model loaded only after Start, 4–6 s): the first scene's plate and the story's outfit
  (() => { const P = window.CHAR_PACK, base = new URL(CHAR, location.href).href, sc = P.scenes?.[STORY.scene], m = P.models?.[STORY.outfit || P.defaultOutfit];
    if (sc) PG.stage.place(base + sc.src);
    if (m && PG.ll) setTimeout(() => PG.ll.show(base + m, { pose: (P.poses?.idle || [])[1] || null, cam: ((window.PG_RULES || {}).cams || {}).talk }).catch(() => {}), 50); })();
  $('startBtn')?.addEventListener('click', start);
  if (QS.has('autoplay') || QS.has('auto')) setTimeout(start, 400);
})();
