// Same-ear thermal timing guard for pages WITHOUT shared/shell.js (the private live/ talk pages). Load it right after device.js.
// The same rules as the guard inside shell.js (guide §3 节奏; QA 2026-11-10/11) — keep the two in step:
//  · the dominant mode of one ear (heat − cool, ±.15) flips at most once per MINSW: a too-early new mode's channel waits at 0;
//  · a mode that starts while the other mode is off but was on less than MINSW ago waits at 0 (both on at once = DUAL is fine);
//  · a channel that stopped does not restart within MINSW (no cut-and-restart stutter).
// `stop` always passes at once. A held line is re-sent the moment the hold is over. Pages that load shell.js are left alone.
(() => {
  const D = window.MoHeatDevice; if (!D?.create || D.__thermGuard) return;
  D.__thermGuard = true;
  const MINSW = 950, now = () => performance.now();
  const create = D.create;
  D.create = (...a) => {
    const inst = create(...a); if (window.MoHeatShell) return inst;   // shell.js has its own copy of these rules
    const send = inst.send;
    const dom = { L: { s: '', t: -1e9 }, R: { s: '', t: -1e9 } }, lastOn = { LC: -1e9, LH: -1e9, RC: -1e9, RH: -1e9 }, isOn = {};
    let retry = 0;
    const offAll = (t) => { for (const k in isOn) if (isOn[k]) { isOn[k] = false; lastOn[k] = t; } };
    const filter = (line, t) => {
      const v = {}; line.replace(/\b([LR][CH])(\d+)\b/g, (m, k, n) => { v[k] = +n; return m; });
      let wait = 0; const hold = {};
      for (const e of ['L', 'R']) for (const [x, y] of [['C', 'H'], ['H', 'C']]) {
        const k = e + x, o = e + y; if (!(v[k] > 0) || isOn[k]) continue;
        const sinceSelf = t - lastOn[k], sinceOther = isOn[o] ? 0 : t - lastOn[o];
        if (sinceSelf < MINSW) { hold[k] = 1; wait = Math.max(wait, MINSW - sinceSelf); }                     // stutter
        else if (!(v[o] > 0) && sinceOther < MINSW) { hold[k] = 1; wait = Math.max(wait, MINSW - sinceOther); }   // rest between modes
      }
      for (const e of ['L', 'R']) {
        const h = Math.min(1, (v[e + 'H'] || 0) / 200), c = v[e + 'C'] ? Math.max(0, v[e + 'C'] - 35) / 45 : 0, d = h - c;
        const s = d >= .15 ? 'H' : d <= -.15 ? 'C' : '', st = dom[e];
        if (!s || s === st.s) continue;
        if (st.s && t - st.t < MINSW) { hold[e + s] = 1; wait = Math.max(wait, MINSW - (t - st.t)); }
        else { st.s = s; st.t = t; }
      }
      const out = wait ? line.replace(/\b([LR][CH])(\d+)\b/g, (m, k) => (hold[k] ? `${k}0` : m)) : line;
      out.replace(/\b([LR][CH])(\d+)\b/g, (m, k, n) => { const on = +n > 0; if (isOn[k] && !on) lastOn[k] = t; if (on) lastOn[k] = t; isOn[k] = on; return m; });
      return { wait, out };
    };
    inst.send = (line) => {
      clearTimeout(retry);
      if (/^stop/i.test(line)) { offAll(now()); return send(line); }
      const { wait, out } = filter(line, now());
      if (wait) retry = setTimeout(() => inst.send(line), wait + 2);
      return send(out);
    };
    return inst;
  };
})();
