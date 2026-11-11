// shared/engine/thermal.js — MoHeatEngine.thermal(o) → thermal(dt): the DUAL ear model every own-engine demo copied.
//   o.sources()  → [{ az, k: 'h' | 'c', s, icon }]   the demo's heat / cool sources this frame (voice layer + ambient layer)
//   o.rest()     → true during the short rest between scenes (guide §3 节奏): every channel goes to 0 for a moment
//   o.off        level counted as "off" (.03, = panel OFF)          o.spread  ear weighting 1 − spread × sin(az) on the far side (1.2)
//   o.cap        { h: .9, c: 1 } per-mode maximum                    o.tau     { hRise .4, hFall .5, cRise .2, cFall .35, rest .15 } s
//   o.modeGuard  s; a mode that starts on an ear whose other mode stopped less than this ago waits at 0 (1.15; 0 = off). Both modes
//                on at once is fine (DUAL). shell.js applies the same rule again on the device line.
//   o.timing     true = the per-ear timing rules of shared/story.js (thermal agent 2026-11-11: Demo12 · 14 · 17 · 18 · 24 · 43 …): a stopped
//                channel stays off ~1 s, a mode waits 1.5 s after the other mode on that ear, the dominant mode flips at most once per 1.5 s.
//                Use with modeGuard: 0 (that is how those demos run).
// Returns { th: { Lc, Lh, Rc, Rh }, src }.  MoHeatEngine.thermal.voice(P, vlv): the shared "a voice is warm" rule (guide §3):
// (0.1 + 0.8 × loudness) × (1 at the ear < .15 m · .6 within 50 cm · .28 further) × (.5 when straight in front).
(() => {
  const ME = window.MoHeatEngine = window.MoHeatEngine || {};
  if (ME.thermal) return;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  ME.thermal = (o) => {
    const OFF = o.off ?? .03, SPREAD = o.spread ?? 1.2, CAP = { h: .9, c: 1, ...(o.cap || {}) }, GUARD = o.modeGuard ?? 1.15;
    const TAU = { hRise: .4, hFall: .5, cRise: .2, cFall: .35, rest: .15, ...(o.tau || {}) };
    const ear = { Lc: 0, Lh: 0, Rc: 0, Rh: 0 };
    const modeOn = {}, modeLast = { Lc: -9, Lh: -9, Rc: -9, Rh: -9 };
    const TIMING = !!o.timing, chOn = {}, chLast = { Lc: -9, Lh: -9, Rc: -9, Rh: -9 }, dom = { L: { s: '', t: -9 }, R: { s: '', t: -9 } };
    function thermal(dt) {
      const sum = { L: { h: 0, c: 0 }, R: { h: 0, c: 0 } }, src = o.sources();
      for (const s of src) { const sn = Math.sin(s.az), wL = clamp(1 - SPREAD * Math.max(0, sn)), wR = clamp(1 - SPREAD * Math.max(0, -sn)); sum.L[s.k] += s.s * wL; sum.R[s.k] += s.s * wR; }
      const rest = o.rest ? o.rest() : false;
      for (const e of ['L', 'R']) for (const k of ['c', 'h']) {
        const target = rest ? 0 : k === 'h' ? Math.min(CAP.h, sum[e].h) : Math.min(CAP.c, sum[e].c), cur = ear[e + k];
        const tau = rest ? TAU.rest : target > cur ? (k === 'h' ? TAU.hRise : TAU.cRise) : (k === 'h' ? TAU.hFall : TAU.cFall);
        ear[e + k] = cur + (target - cur) * (1 - Math.exp(-dt / tau));
      }
      if (GUARD) {
        for (const e of ['L', 'R']) for (const [k, oo] of [['c', 'h'], ['h', 'c']]) {   // a ~1 s rest between the two modes on one ear (both on = DUAL is fine)
          const K = e + k, O = e + oo;
          if (ear[K] > OFF && !modeOn[K] && ear[O] <= OFF && performance.now() / 1000 - modeLast[O] < GUARD) ear[K] = 0;
        }
        for (const K in ear) { modeOn[K] = ear[K] > OFF; if (modeOn[K]) modeLast[K] = performance.now() / 1000; }
      }
      if (TIMING) {
        // timing on each ear (guide §3 节奏, as shared/story.js): a channel that stopped does not come back for ~1 s, a mode does not start within
        // 1.5 s of the other mode on that ear (both on = DUAL is fine; a fading other mode ≤ .1 is not), the dominant mode flips at most once per 1.5 s
        const nowS = performance.now() / 1000;
        for (const K in ear) {
          const O = K[0] + (K[1] === 'c' ? 'h' : 'c');
          if (ear[K] > .03 && !chOn[K] && (nowS - chLast[K] < 1.1 || (ear[O] <= .1 && nowS - chLast[O] < 1.5))) ear[K] = 0;
        }
        for (const e of ['L', 'R']) {
          const h = ear[e + 'h'], c = ear[e + 'c'], s = h - c >= .12 ? 'H' : c - h >= .12 ? 'C' : '', st = dom[e];
          if (!s || s === st.s) continue;
          if (st.s && nowS - st.t < 1.5) { if (s === 'H') ear[e + 'h'] = c + .1; else ear[e + 'c'] = h + .1; } else { st.s = s; st.t = nowS; }
        }
        for (const K in ear) { chOn[K] = ear[K] > .03; if (chOn[K]) chLast[K] = nowS; }
      }
      return { th: { ...ear }, src };
    }
    return thermal;
  };
  ME.thermal.voice = (P, vlv) => (.1 + .8 * clamp(vlv * 8)) * (P.dist < .15 ? 1 : P.dist <= .5 ? .6 : .28) * (Math.abs(P.az) < .5 ? .5 : 1);
})();
