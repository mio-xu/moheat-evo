// asmr-love — the page glue every demo of this category shares (built pages load it after the engine, the pack and the demo's data).
// Stage = the PG engine mounted stage-only inside #app (LivLiv character, plates, props, fx, edge glows); the site's UI v2 shell owns the bar,
// cover, chapters (#steps), language and voice language; subtitles #subJa / #subEn (shared/subs.js); asks = .ch buttons (shared/voice.js).
// The story itself: PG.story.run(window.STORY, …) — nothing here knows a character or a story.
(() => {
  const PG = window.PG, $ = (id) => document.getElementById(id), me = document.currentScript, CHAR = me.dataset.char;
  const QS = new URLSearchParams(location.search), STORY = window.STORY, V = window.STORY_VOICE;
  PG.mount({ id: `asmr.${STORY.id}`, langs: ['en', 'ja', 'zh', 'ko'], stage: true });
  // the side card meters + the command line follow the engine's thermal state (the device itself is driven by PG.Therm)
  const meters = Object.fromEntries(['Lc', 'Lh', 'Rc', 'Rh'].map((k) => [k, [$(`m${k}`), $(`v${k}`)]]));
  addEventListener('pg:thermal', (e) => {
    const t = e.detail || {}; for (const [k, [bar, val]] of Object.entries(meters)) { if (bar) bar.style.width = `${(t[k] || 0) * 100}%`; if (val) val.textContent = Math.round((t[k] || 0) * 100); }
    const c = (v) => Math.round(35 + v * 45), h = (v) => Math.round(v * 200), on = Math.max(t.Lc || 0, t.Lh || 0, t.Rc || 0, t.Rh || 0) > .03;
    if ($('cmd')) $('cmd').textContent = on ? `DUAL LC${t.Lc > .03 ? c(t.Lc) : 0} LH${h(t.Lh || 0)} RC${t.Rc > .03 ? c(t.Rc) : 0} RH${h(t.Rh || 0)}` : 'stop';
  });
  let tripped = false;
  $('estop')?.addEventListener('click', () => { tripped = !tripped; PG.Therm.trip?.(tripped); $('estop').textContent = tripped ? '↺ Re-arm output' : '■ STOP'; });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') $('estop')?.click(); });
  if (STORY.steps) { const el = $('steps'); if (el) el.innerHTML = STORY.steps.map((s) => `<li>${s.ja} · <small>${s.en}</small></li>`).join(''); }
  let t0 = 0, clock = 0; setInterval(() => { if (t0 && $('clock')) { const s = (performance.now() - t0) / 1000; $('clock').textContent = `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`; } }, 500);
  $('lrBtn')?.addEventListener('click', () => { PG.audioOn(); PG.sfx?.pick?.(); });
  let running = false;
  async function start() {
    if (running) return; running = true; PG.audioOn(); $('intro')?.classList.add('hidden'); t0 = performance.now();
    try {
      await PG.story.run(STORY, {
        pack: window.CHAR_PACK, base: new URL(CHAR, location.href).href, ui: 'site', warmOnly: document.documentElement.hasAttribute('data-warm-only'),
        media: { voice: 'media/voice/', dur: V.dur, env: V.env }, text: STORY.text,
        lang: () => (window.MoHeatVoice?.lang?.() === 'en' ? 'en' : 'ja'),
      });
    } catch (e) { console.error('[asmr]', e); }
    running = false; t0 = 0;
    try { sessionStorage.setItem(`moheat.asmr.${STORY.id}.cleared`, '1'); } catch {}
    $('intro')?.classList.remove('hidden');   // back to this demo's own cover (never an "ended" card)
  }
  $('startBtn')?.addEventListener('click', start);
  if (QS.has('autoplay') || QS.has('auto')) setTimeout(start, 400);
})();
