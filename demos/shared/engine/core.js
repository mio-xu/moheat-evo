// shared/engine/core.js — MoHeatEngine: the engine for the demos that still had their own copy of the story runner in main.js +
// audio.js (the ~20 "copied from the last demo" date / story / stream demos: Demo12 · 14 · 17–22 · 24–26 · 28–31 · 43).
// docs/engine/2026-11-08_engine_plan.md (P2) + docs/engine/MIGRATION.md (per-family recipe). Pilot: for-men/Demo31_SummerRooftop.
//
// What is NOT here because demos/shared already does it: the UI (shell.js + ui2.js: cover, control bar, pause / clock, play modes,
// same-ear thermal guard on the device line, volume, chapters from #steps), subtitles / languages (subs.js + l10n), voice answers
// (voice.js), layered stills (layers.js), fireworks (fireworks.js), the data-driven story engine for new demos (story.js — Demo44+).
// What IS here (the part every own-engine main.js / audio.js repeated):
//   core.js    this file: namespace + small helpers (QS, AUTO / ALT, $, clamp, sleep, rnd, store, fmt)
//   audio.js   MoHeatEngine.audio(opt, build) → window.HTAudio: AudioContext, compressor, reverb, HRTF chain, noise, shot / burst /
//              tone / swell, voices in the voice language (MoHeatVoice), voice level, loop registry helper, mute, L/R check
//   thermal.js MoHeatEngine.thermal(o) → thermal(dt): sources → per-ear cool / heat with smoothing, scene rest, 1 s mode guard
//   panel.js   MoHeatEngine.panel(o): device (device.js), DUAL command, output (meters, glows, #cmd, ?auto log), STOP, intensity, radar
//   stage.js   MoHeatEngine.stage(o): one still per view, cross-fades, optional clip player (go / clips), moheat:pause cross-fade fix
//   play.js    MoHeatEngine.play(o): subtitles, say (run token), choice / action / hold / stillHold (?auto / ?alt answer themselves)
//   app.js     MoHeatEngine.create(cfg): wires the above + the main loop, start / finish, buttons, ?auto / ?autoplay / ?cover
// Load order in index.html: device.js · engine/core.js · engine/audio.js · audio.js · … · shell.js · engine/{thermal,panel,stage,
// play,app}.js · main.js. Defaults = the behaviour of the most common copy (Demo31 / 25 / 14 / 17 / 18); a demo that differs passes
// an option (never edits the engine for itself; a new option defaults to the old behaviour so migrated demos do not change).
(() => {
  const ME = window.MoHeatEngine = window.MoHeatEngine || {};
  if (ME.version) return;
  const QS = new URLSearchParams(location.search);
  Object.assign(ME, {
    version: 1, QS, AUTO: QS.has('auto'), ALT: QS.has('alt'),
    $: (id) => document.getElementById(id),
    clamp: (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)),
    sleep: (s) => new Promise((r) => setTimeout(r, s * 1000)),
    rnd: (a, b) => a + Math.random() * (b - a),
    fmt: (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`,
    store: { get: (k, d) => { try { return JSON.parse(localStorage.getItem(`moheat.${k}`)) ?? d; } catch { return d; } }, set: (k, v) => { try { localStorage.setItem(`moheat.${k}`, JSON.stringify(v)); } catch {} } },
  });
})();
