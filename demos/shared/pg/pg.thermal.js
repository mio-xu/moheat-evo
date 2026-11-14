// PG.Therm — one thermal state per ear (cool / heat, 0..1), shown at the screen edges and sent to the MoHeat Evo headset when connected.
// Layers, weakest first: ambient (the place) → pulse (a short event: cold bottle, fan) → voice (someone speaking close: warm, wins on that ear)
// → direct (a ready-made track, e.g. a song: replaces everything while set).
(() => {
  const PG = window.PG, RANGE = { heatMin: 0, heatMax: 200, coolMin: 35, coolMax: 80 }, OFF = .03;
  let amb = {}, voice = { L: 0, R: 0 }, pulse = null, direct = null, intensity = 1, lastSent = '', device = null;
  const shown = { Lc: 0, Lh: 0, Rc: 0, Rh: 0 };
  const part = (sd, c, h) => (c > OFF ? `${sd}C${Math.round(RANGE.coolMin + c * (RANGE.coolMax - RANGE.coolMin))}` : h > OFF ? `${sd}H${Math.round(RANGE.heatMin + h * (RANGE.heatMax - RANGE.heatMin))}` : `${sd}H0`);

  function target() {
    if (direct) return direct;
    let src = amb;
    if (pulse) { const now = performance.now(); if (now >= pulse.until) pulse = null; else { const st = pulse.steps, i = st.length > 1 ? Math.floor((now - pulse.t0) / pulse.each) % st.length : 0; src = { ...amb, ...st[i] }; } }
    const t = { Lc: src.Lc || 0, Lh: src.Lh || 0, Rc: src.Rc || 0, Rh: src.Rh || 0 };
    for (const e of ['L', 'R']) if (voice[e] > 0) { t[e + 'h'] = Math.max(t[e + 'h'], voice[e]); if (voice[e] > .3) t[e + 'c'] = 0; }
    return t;
  }
  function tick() {
    const $ = PG.$, t = target(); for (const k in shown) shown[k] += (t[k] - shown[k]) * .45;
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
      device = window.MoHeatDevice.create({ select: $('portSelect'), addBtn: $('addPort'), connectBtn: $('connectBtn'), status: $('deviceStatus') }, { onConnect: () => { lastSent = ''; } });
      if (!window.MoHeatDevice.supported) { $('portSelect').disabled = true; $('addPort').disabled = true; }
      $('intensity').value = Math.round(intensity * 100); $('intensityVal').textContent = `${Math.round(intensity * 100)}%`;
      $('intensity').addEventListener('input', (e) => { intensity = +e.target.value / 100; PG.store.set('intensity', +e.target.value); $('intensityVal').textContent = `${e.target.value}%`; });
      setInterval(tick, 100); addEventListener('pagehide', stop);
      document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else lastSent = ''; });
    },
    /** The place: { Lc, Lh, Rc, Rh } (missing = 0). Stays until the next call. */
    ambient(a) { amb = a || {}; },
    /** A voice. ear 'L' / 'R' = close to that ear; null = both ears (someone in front of you). */
    voice(ear, v) { if (ear) voice[ear] = v; else voice.L = voice.R = v; },
    quiet() { voice.L = voice.R = 0; },
    /** A short event on top of the place for ms. v = one state, or a list of states that alternate every `each` ms (≥ 1000: faster cannot be felt). */
    pulse(v, ms, each = 1000) { pulse = ms > 0 ? { steps: Array.isArray(v) ? v : [v], t0: performance.now(), until: performance.now() + ms, each } : null; },
    /** A ready-made track value (or null to go back to the layers). */
    direct(v) { direct = v; },
    get state() { return target(); },
  };
})();
