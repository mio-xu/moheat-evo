// ---- The thermal safety scheduler and the timeline planner (2026-11-14, asmr-love; node-compatible, no DOM).
// One implementation for the games (live, PG.Therm with rules.thermal.safety) and the demo builds (offline: PG.thermalPlan → thermal.csv).
// Rules (engine/rules.js thermal): an ear that changes mode is OFF ≥ flipOff s first · after an ear goes off it stays off ≥ gap s · caps
// warm capWarm / cool capCool · warmOnly = every cool → 0 · onMax s continuously on → rest s off · ambient ≤ ambientMax.
(function (root) {
  const OFF = .03, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const R0 = { flipOff: 1.2, gap: .4, capWarm: .8, capCool: .7, warmOnly: false, onMax: 120, rest: 10, ambientMax: .3,
    voice: { close: .55, mid: .25, far: .08, both: .8 }, breath: { haa: .6, fuu: .65, blow: .65 } };
  const rulesOf = (r) => { const T = (r || (root.PG_RULES || {}).thermal || {}); return { ...R0, ...T, voice: { ...R0.voice, ...(T.voice || {}) }, breath: { ...R0.breath, ...(T.breath || {}) } }; };
  /** A per-ear safety state machine. step(t s, desired { Lc, Lh, Rc, Rh }) → the safe output. state() / from(state) carry it across segments. */
  function Safety(rules, start) {
    const R = rulesOf(rules), S = JSON.parse(JSON.stringify(start || { L: { mode: null, offAt: -99 }, R: { mode: null, offAt: -99 }, onSince: null, restUntil: -99 }));
    return {
      step(t, d) {
        const out = { Lc: 0, Lh: 0, Rc: 0, Rh: 0 };
        if (t < S.restUntil) { for (const e of ['L', 'R']) if (S[e].mode) { S[e].mode = null; S[e].offAt = t; } return out; }
        let any = false;
        for (const e of ['L', 'R']) {
          let c = R.warmOnly ? 0 : clamp(d[e + 'c'] || 0, 0, R.capCool), h = clamp(d[e + 'h'] || 0, 0, R.capWarm);
          const want = c > OFF && c >= h ? 'c' : h > OFF ? 'h' : null, st = S[e];
          if (want !== st.mode) {
            if (st.mode) { st.mode = null; st.offAt = t; }                                   // switch off first (a mode change, or the end of an event)
            else if (want && t - st.offAt >= (st.lastMode && st.lastMode !== want ? R.flipOff : R.gap)) { st.mode = want; st.lastMode = want; }
          }
          if (st.mode === 'c') { out[e + 'c'] = c; any = any || c > OFF; } else if (st.mode === 'h') { out[e + 'h'] = h; any = any || h > OFF; }
        }
        if (any) { if (S.onSince == null) S.onSince = t; if (t - S.onSince >= R.onMax) { S.restUntil = t + R.rest; S.onSince = null; return this.step(t, d); } }
        else S.onSince = null;
        return out;
      },
      state: () => JSON.parse(JSON.stringify(S)),
    };
  }
  /** Offline plan of a story timeline. tl = { dur, events: [
   *    { type: 'scene', t, ambient: [{ side: 'L'|'R'|'C', mode: 'warm'|'cool', level }] },
   *    { type: 'voice', t, ear: 'L'|'R'|'C'|'L>R'|…, dist: 'close'|'mid'|'far', dur, env: [0..1 @ rate] , over? },
   *    { type: 'prop', t, id, side, on: true|false, mode, cap, rise, fall },
   *    { type: 'breath', t, ear, mode: 'haa'|'fuu'|'blow', dur } ] }
   *  o = { start (a previous plan's end), warmOnly, rate (default 20), rules } → { frames: [[t, Lc, Lh, Rc, Rh], …], end } */
  function thermalPlan(tl, o = {}) {
    const R = rulesOf(o.rules); if (o.warmOnly != null) R.warmOnly = o.warmOnly;
    if (Array.isArray(tl)) {   // pg.story.js compile() format: a list of { t, kind } with a final { kind: 'end' }
      const end = tl.find((e) => e.kind === 'end'); tl = { dur: end ? end.t : Math.max(0, ...tl.map((e) => e.t + (e.dur || 0))), events: tl.filter((e) => e.kind !== 'end').map((e) => ({ ...e, type: e.type || e.kind })) };
    }
    const rate = o.rate || 20, dt = 1 / rate, ev = [...(tl.events || [])].sort((a, b) => a.t - b.t), N = Math.ceil((tl.dur || 0) * rate) + 1;
    const vs = { L: 0, R: 0, ...((o.start && o.start.voice) || {}) }, VR = R.voice.rise || .05, VF = R.voice.fall || .8;   // smoothed voice warmth per ear: fast up, slow down
    const startState = o.start && o.start.safety ? o.start.safety : null, safe = Safety(R, startState && shiftState(startState, 0));
    let amb = (o.start && o.start.ambient) || [], props = { ...((o.start && o.start.props) || {}) }, k = 0; const frames = [];
    const sides = (s) => (s === 'C' ? ['L', 'R'] : s === 'L' || s === 'R' ? [s] : []);
    for (let i = 0; i < N; i++) {
      const t = i * dt;
      while (k < ev.length && ev[k].t <= t + 1e-9) {
        const e = ev[k++];
        if (e.type === 'scene') amb = (e.ambient || []).map((a) => ({ ...a, level: Math.min(a.level, R.ambientMax) }));
        else if (e.type === 'prop') { if (e.on === false) { for (const key of Object.keys(props)) if (key.split(':')[0] === e.id && (!e.side || sides(e.side).some((sd) => key.endsWith(':' + sd)))) props[key].on = false; }
          else for (const sd of sides(e.side)) props[e.id + ':' + sd] = { ...(props[e.id + ':' + sd] || { level: 0 }), side: sd, mode: e.mode, cap: e.cap, rise: e.rise || 2, fall: e.fall || 2, on: true }; }
      }
      const d = { L: { c: 0, h: 0, near: null }, R: { c: 0, h: 0, near: null } };
      for (const a of amb) for (const sd of sides(a.side)) d[sd][a.mode === 'cool' ? 'c' : 'h'] = Math.max(d[sd][a.mode === 'cool' ? 'c' : 'h'], a.level);
      for (const [key, p] of Object.entries(props)) {   // props ramp toward their cap (rise s) / back to 0 (fall s)
        p.level = p.on ? Math.min(p.cap, p.level + p.cap * dt / p.rise) : Math.max(0, p.level - p.cap * dt / p.fall);
        if (!p.on && p.level <= 0) { delete props[key]; continue; }
        const m = p.mode === 'cool' ? 'c' : 'h'; d[p.side][m] = Math.max(d[p.side][m], p.level); d[p.side].near = d[p.side].near || m;   // a near source beats the ambient of the other mode
      }
      const vt = { L: 0, R: 0 }, vOver = { L: false, R: false };
      for (const e of ev) {
        if (e.t > t || e.t + (e.dur || 0) < t) continue;
        if (e.type === 'voice') {
          const env = e.env && e.env.length ? e.env[Math.min(e.env.length - 1, Math.floor((t - e.t) * rate))] : 1, lv = (R.voice[e.dist] ?? R.voice.mid) * env;
          const p = e.dur ? clamp((t - e.t) / e.dur, 0, 1) : 0, [a, b] = String(e.ear || 'C').split('>');
          const w = { L: 0, R: 0 }, add = (s, k2) => { if (s === 'C') { w.L += k2 * R.voice.both; w.R += k2 * R.voice.both; } else if (s) w[s] += k2; };
          if (b) { add(a, 1 - p); add(b, p); } else add(a, 1);
          for (const sd of ['L', 'R']) if (w[sd] > 0) { vt[sd] = Math.max(vt[sd], lv * w[sd]); if (e.over) vOver[sd] = true; }
        } else if (e.type === 'touch') {   // a short close warm / cool with a named source (his breath, him leaning in, a prop): { ear, mode, level ≤ .6, dur | secs, source }
          const m = e.mode === 'cool' ? 'c' : 'h', lv = Math.min(e.level ?? .4, .6), en = e.t + (e.dur || e.secs || 1.5); if (t > en) continue;
          for (const sd of sides(e.ear || 'C')) { d[sd][m] = Math.max(d[sd][m], lv); d[sd].near = m; }
        } else if (e.type === 'breath') {   // mode 'haa' | 'fuu' | 'blow' (or 'warm' | 'cool' + breath name)
          const m = e.mode === 'haa' || e.mode === 'warm' ? 'h' : 'c', lv = R.breath[e.breath || e.mode] ?? R.breath[m === 'h' ? 'haa' : 'fuu'] ?? .6;
          for (const sd of sides(e.ear === 'C' ? 'C' : e.ear)) { d[sd][m] = Math.max(d[sd][m], lv); d[sd].near = m; }
        }
      }
      for (const sd of ['L', 'R']) {   // the voice: smoothed (rules.thermal.voice rise / fall) so the ear stays warm across short pauses; never fights a visible cool source
        vs[sd] += (vt[sd] - vs[sd]) * (1 - Math.exp(-dt / (vt[sd] > vs[sd] ? VR : VF)));
        if (vs[sd] > OFF && !(d[sd].near === 'c' && !vOver[sd])) { d[sd].h = Math.max(d[sd].h, vs[sd]); d[sd].near = d[sd].near || 'h'; }
      }
      const want = {};
      for (const sd of ['L', 'R']) { const x = d[sd]; let c = x.c, h = x.h; if (x.near === 'h') c = 0; if (x.near === 'c') h = 0; /* a near source (prop, voice, breath) beats the other mode's ambient at once */ want[sd + 'c'] = c; want[sd + 'h'] = h; }
      const out = safe.step(t + ((o.start && o.start.t) || 0), want);
      frames.push([+t.toFixed(3), +out.Lc.toFixed(3), +out.Lh.toFixed(3), +out.Rc.toFixed(3), +out.Rh.toFixed(3)]);
    }
    const t0 = (o.start && o.start.t) || 0;
    return { frames, end: { t: t0 + (tl.dur || 0), safety: safe.state(), ambient: amb, props, voice: { ...vs } } };
  }
  const shiftState = (s) => s;   // times in the state are absolute (start.t + local): nothing to shift
  /** thermal_check.json for a plan: flips, the shortest off gap before a flip per ear, maximum levels, time on. */
  function thermalCheck(frames) {
    const res = { maxWarm: 0, maxCool: 0, flips: 0, minFlipOff: null, secondsOn: 0 }, last = { L: null, R: null }, offAt = { L: 0, R: 0 };
    let prevT = 0;
    for (const [t, Lc, Lh, Rc, Rh] of frames) {
      res.maxWarm = Math.max(res.maxWarm, Lh, Rh); res.maxCool = Math.max(res.maxCool, Lc, Rc); if (Math.max(Lc, Lh, Rc, Rh) > OFF) res.secondsOn += t - prevT; prevT = t;
      for (const [sd, c, h] of [['L', Lc, Lh], ['R', Rc, Rh]]) { const m = c > OFF ? 'c' : h > OFF ? 'h' : null;
        if (!m && last[sd + 'on']) { offAt[sd] = t; last[sd + 'on'] = false; }
        if (m) { if (last[sd] && last[sd] !== m) { res.flips++; const g = t - offAt[sd]; res.minFlipOff = res.minFlipOff == null ? g : Math.min(res.minFlipOff, g); } last[sd] = m; last[sd + 'on'] = true; } }
    }
    res.secondsOn = +res.secondsOn.toFixed(1); if (res.minFlipOff != null) res.minFlipOff = +res.minFlipOff.toFixed(2); return res;
  }
  const api = { Safety, thermalPlan, thermalCheck };
  if (root.PG) Object.assign(root.PG, api); else root.PG_THERMAL = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

// PG.Therm — one thermal state per ear (cool / heat, 0..1), shown at the screen edges and sent to the MoHeat Evo headset when connected.
// Layers, weakest first: ambient (the place) → pulse (a short event: cold bottle, fan) → voice (someone speaking close: warm, wins on that ear)
// → direct (a ready-made track, e.g. a song: replaces everything while set).
(() => {
  if (typeof window === 'undefined') return;   // node (demo builds): only the planner above
  const PG = window.PG, RANGE = { heatMin: 0, heatMax: 200, coolMin: 35, coolMax: 80 }, OFF = .03;
  let amb = {}, sources = {}, voice = { L: 0, R: 0 }, pulse = null, direct = null, intensity = 1, lastSent = '', device = null;
  const shown = { Lc: 0, Lh: 0, Rc: 0, Rh: 0 };
  const part = (sd, c, h) => (c > OFF ? `${sd}C${Math.round(RANGE.coolMin + c * (RANGE.coolMax - RANGE.coolMin))}` : h > OFF ? `${sd}H${Math.round(RANGE.heatMin + h * (RANGE.heatMax - RANGE.heatMin))}` : `${sd}H0`);

  function target() {
    if (direct) return direct;
    let src = amb;
    if (pulse) { const now = performance.now(); if (now >= pulse.until) pulse = null; else { const st = pulse.steps, i = st.length > 1 ? Math.floor((now - pulse.t0) / pulse.each) % st.length : 0; src = { ...amb, ...st[i] }; } }
    const t = { Lc: src.Lc || 0, Lh: src.Lh || 0, Rc: src.Rc || 0, Rh: src.Rh || 0 };
    for (const e of ['L', 'R']) {   // lasting near sources (props, gifts): the strongest wins, and a near source beats the other mode's ambient
      const vs = Object.values(sources), h = Math.max(0, ...vs.map((v) => v[e + 'h'] || 0)), c = Math.max(0, ...vs.map((v) => v[e + 'c'] || 0));
      if (h > 0 || c > 0) { if (h >= c) { t[e + 'h'] = Math.max(t[e + 'h'], h); t[e + 'c'] = 0; } else { t[e + 'c'] = Math.max(t[e + 'c'], c); t[e + 'h'] = 0; } }
    }
    for (const e of ['L', 'R']) if (voice[e] > 0 && !Object.values(sources).some((v) => (v[e + 'c'] || 0) > 0)) { t[e + 'h'] = Math.max(t[e + 'h'], voice[e]); if (voice[e] > .3) t[e + 'c'] = 0; }   // the voice never fights a visible cool source on that ear
    return t;
  }
  let halted = false;   // ■ STOP: everything off until pressed again
  let safety = null;   // the ASMR safety scheduler (rules.thermal.safety, set by the genre preset): flip-off, gaps, caps, warm-only, rest
  function tick() {
    const $ = PG.$, TR = (window.PG_RULES || {}).thermal || {};
    let t = halted ? { Lc: 0, Lh: 0, Rc: 0, Rh: 0 } : target();
    if (!halted && TR.warmOnly) t.Lc = t.Rc = 0;   // warm-only mode (the player's setting): every cool → 0 (its picture fx still shows)
    if (TR.safety) { if (!safety) safety = PG.Safety(TR); t = safety.step(performance.now() / 1000, t); } else safety = null;
    for (const k in shown) shown[k] += (t[k] - shown[k]) * .45;
    if (!$('glowL')) return;
    $('glowL').children[0].style.opacity = shown.Lh * .8; $('glowL').children[1].style.opacity = shown.Lc * .8;
    $('glowR').children[0].style.opacity = shown.Rh * .8; $('glowR').children[1].style.opacity = shown.Rc * .8;
    dispatchEvent(new CustomEvent('pg:thermal', { detail: t }));
    if (!device || !device.isConnected()) return;
    const s = Object.fromEntries(Object.entries(t).map(([k, v]) => [k, v * intensity]));
    const cmd = Math.max(s.Lc, s.Lh, s.Rc, s.Rh) <= OFF ? 'stop' : `${part('L', s.Lc, s.Lh)} ${part('R', s.Rc, s.Rh)}`;
    if (cmd !== lastSent) { device.send(cmd); lastSent = cmd; }
  }
  const stop = () => { if (device && device.isConnected()) device.send('stop'); lastSent = 'stop'; };

  PG.Therm = {
    init() {
      const $ = PG.$; intensity = PG.store.get('intensity', 100) / 100;
      // the device / intensity controls: the engine's own ⚙ panel, or (stage-only mount on a site page) the page shell's elements with the same ids
      if (window.MoHeatDevice && $('portSelect')) {
        device = window.MoHeatDevice.create({ select: $('portSelect'), addBtn: $('addPort'), connectBtn: $('connectBtn'), status: $('deviceStatus') }, { onConnect: () => { lastSent = ''; } });
        if (!window.MoHeatDevice.supported) { $('portSelect').disabled = true; if ($('addPort')) $('addPort').disabled = true; }
      }
      if ($('intensity')) {
        $('intensity').value = Math.round(intensity * 100); if ($('intensityVal')) $('intensityVal').textContent = `${Math.round(intensity * 100)}%`;
        $('intensity').addEventListener('input', (e) => { intensity = +e.target.value / 100; PG.store.set('intensity', +e.target.value); if ($('intensityVal')) $('intensityVal').textContent = `${e.target.value}%`; });
      }
      setInterval(tick, 100); addEventListener('pagehide', stop);
      document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else lastSent = ''; });
    },
    /** The place: { Lc, Lh, Rc, Rh } (missing = 0). Stays until the next call. */
    ambient(a) { amb = a || {}; },
    /** A lasting near source (a prop or a gift that is warm / cool): key → { Lc, Lh, Rc, Rh }, or null to remove. */
    source(key, v) { if (v) sources[key] = v; else delete sources[key]; },
    clearSources() { sources = {}; },
    /** A voice. ear 'L' / 'R' = close to that ear; null = both ears (someone in front of you). */
    voice(ear, v) { if (ear) voice[ear] = v; else voice.L = voice.R = v; },
    quiet() { voice.L = voice.R = 0; },
    /** A short event on top of the place for ms. v = one state, or a list of states that alternate every `each` ms (≥ 1000: faster cannot be felt). */
    pulse(v, ms, each = 1000) { pulse = ms > 0 ? { steps: Array.isArray(v) ? v : [v], t0: performance.now(), until: performance.now() + ms, each } : null; },
    /** ■ STOP (the player's button): true = every element off now and until released; the device gets 'stop' at once. */
    halt(on) { halted = !!on; if (halted) stop(); lastSent = halted ? 'stop' : ''; dispatchEvent(new CustomEvent('pg:halt', { detail: halted })); },
    get halted() { return halted; },
    /** A ready-made track value (or null to go back to the layers). */
    direct(v) { direct = v; },
    get state() { return target(); },
    /** Play a planned track (PG.thermalPlan frames [t, Lc, Lh, Rc, Rh]) from now, or null to stop: live = offline. */
    play(frames, rate = 20) { clearInterval(this._pl); if (!frames) { direct = null; return; } const t0 = performance.now();
      this._pl = setInterval(() => { const i = Math.floor((performance.now() - t0) / 1000 * rate); if (i >= frames.length) { clearInterval(this._pl); direct = null; return; } const f = frames[i]; direct = { Lc: f[1], Lh: f[2], Rc: f[3], Rh: f[4] }; }, 1000 / rate); },
  };
})();
