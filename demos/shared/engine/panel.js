// shared/engine/panel.js — MoHeatEngine.panel(o): the side panel + device block every own-engine demo copied ("same protocol as
// every demo"): device.js connection (#portSelect #addPort #connectBtn #deviceStatus), the DUAL command, output() (meters #mLc…,
// values #vLc…, stage glows #glowL / #glowR, #cmd, the ?auto command log), ■ STOP / re-arm (#estop, Esc is wired by app.js),
// intensity slider (#intensity, remembered), send switch (#sendOn), the radar (#radar).
//   o.clock()  → seconds for the ?auto log (S.clock)          o.log  keep the ?auto log (true)
//   o.colors   radar { text '#8f9ab8', ear '#28304a', head '#323d5c' } (the category look)
//   o.range    { heatMin 0, heatMax 200, coolMin 35, coolMax 80 } (+ the remembered moheat.range)   o.sendInterval 100 ms
// Returns { OFF, device, command(th), stopOutput(), emergencyStop(), output(th, live), radar(src, th), both(), log, tripped() }.
(() => {
  const ME = window.MoHeatEngine = window.MoHeatEngine || {};
  if (ME.panel) return;
  ME.panel = (o = {}) => {
    const $ = (id) => document.getElementById(id), clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), QS = new URLSearchParams(location.search);
    const COL = { text: '#8f9ab8', ear: '#28304a', head: '#323d5c', ...(o.colors || {}) };
    const DEFAULT_RANGE = { heatMin: 0, heatMax: 200, coolMin: 35, coolMax: 80, ...(o.range || {}) }, SEND_INTERVAL = o.sendInterval ?? 100, OFF = .03;
    const store = ME.store;
    const range = { ...DEFAULT_RANGE, ...store.get('range', {}) };
    let lastSent = '', lastSendAt = 0, tripped = false, intensity = +store.get('asmr.intensity', 100) / 100;
    const device = MoHeatDevice.create({ select: $('portSelect'), addBtn: $('addPort'), connectBtn: $('connectBtn'), status: $('deviceStatus') }, { log: (l) => console.log('[MoHeat]', l), onConnect: () => { lastSent = ''; } });
    if (!MoHeatDevice.supported) $('deviceStatus').querySelector('span').textContent = 'Web Serial needs desktop Chrome / Edge';
    function command(th) {   // DUAL: each ear's cool and heat set independently (firmware 2026-11-08)
      const c = (v) => (v > OFF ? Math.round(range.coolMin + v * (range.coolMax - range.coolMin)) : 0), h = (v) => (v > OFF ? Math.round(range.heatMin + v * (range.heatMax - range.heatMin)) : 0);
      return Math.max(th.Lc, th.Lh, th.Rc, th.Rh) <= OFF ? 'stop' : `DUAL LC${c(th.Lc)} LH${h(th.Lh)} RC${c(th.Rc)} RH${h(th.Rh)}`;
    }
    function stopOutput() { if (device.isConnected()) device.send('stop'); lastSent = 'stop'; }
    function emergencyStop() { tripped = !tripped; const b = $('estop'); if (tripped) { stopOutput(); b.textContent = '↺ Re-arm output'; b.classList.add('tripped'); } else { b.textContent = '■ STOP'; b.classList.remove('tripped'); lastSent = ''; } }
    $('estop').addEventListener('click', emergencyStop); addEventListener('pagehide', stopOutput);
    $('intensity').value = Math.round(intensity * 100); $('intensityVal').textContent = `${Math.round(intensity * 100)}%`;
    $('intensity').addEventListener('input', (e) => { intensity = +e.target.value / 100; $('intensityVal').textContent = `${e.target.value}%`; store.set('asmr.intensity', +e.target.value); });
    const meterEls = Object.fromEntries(['Lc', 'Lh', 'Rc', 'Rh'].map((k) => [k, [$(`m${k}`), $(`v${k}`)]]));
    let both = 0; const cmdLog = [];
    function output(th, live) {
      const sc = Object.fromEntries(Object.entries(th).map(([k, v]) => [k, live && !tripped ? v * intensity : 0]));
      if ((sc.Lc > OFF && sc.Lh > OFF) || (sc.Rc > OFF && sc.Rh > OFF)) both++;
      for (const [k, [bar, val]] of Object.entries(meterEls)) { bar.style.width = `${sc[k] * 100}%`; val.textContent = Math.round(sc[k] * 100); }
      const cmd = command(sc); $('cmd').textContent = cmd;
      for (const [e, el] of [['L', $('glowL')], ['R', $('glowR')]]) {
        const c = sc[e + 'c'], h = sc[e + 'h'], v = Math.max(c, h), dir = e === 'L' ? 'right' : 'left';
        el.style.opacity = v.toFixed(2); el.style.background = c > .03 && h > .03 ? `linear-gradient(to bottom, rgba(255,122,69,${(.6 * Math.sqrt(h / v)).toFixed(2)}) 0 38%, rgba(79,179,255,${(.6 * Math.sqrt(c / v)).toFixed(2)}) 62% 100%)` : `linear-gradient(to ${dir}, rgba(255,122,69,${(.55 * h / (v || 1)).toFixed(2)}), rgba(255,122,69,0)), linear-gradient(to ${dir}, rgba(79,179,255,${(.55 * c / (v || 1)).toFixed(2)}), rgba(79,179,255,0))`;   // cool AND heat on one ear: warm on top, cool below, blended over the middle; the .glow mask fades it inward (layered, they read as grey: Demo19 2026-11-10)
      }
      if (o.log !== false && QS.has('auto') && cmd !== cmdLog[cmdLog.length - 1]?.[1]) cmdLog.push([+(o.clock ? o.clock() : 0).toFixed(2), cmd]);
      if (!device.isConnected() || !$('sendOn').checked) return;
      const n = performance.now(); if (cmd !== lastSent && n - lastSendAt >= SEND_INTERVAL) { device.send(cmd); lastSent = cmd; lastSendAt = n; }
    }
    const rc = $('radar').getContext('2d');
    function radar(src, th) {
      const cx = 240, cy = 220, R = 160; rc.clearRect(0, 0, 480, 420);
      rc.strokeStyle = 'rgba(255,255,255,.08)'; rc.lineWidth = 1.5; for (const r of [R * .5, R]) { rc.beginPath(); rc.arc(cx, cy, r, 0, 7); rc.stroke(); }
      rc.fillStyle = COL.text; rc.font = '600 13px Inter'; rc.textAlign = 'center'; rc.fillText('front', cx, cy - R - 10); rc.fillText('L', cx - R - 18, cy + 5); rc.fillText('R', cx + R + 18, cy + 5);
      for (const [e, sx] of [['L', -1], ['R', 1]]) {
        rc.fillStyle = COL.ear; rc.beginPath(); rc.ellipse(cx + sx * 46, cy, 12, 24, 0, 0, 7); rc.fill();
        for (const [k, col, dy] of [['h', '255,122,69', -12], ['c', '79,179,255', 12]]) if (th[e + k] > .02) { rc.fillStyle = `rgba(${col},${.25 + .75 * th[e + k]})`; rc.beginPath(); rc.ellipse(cx + sx * 46, cy + dy, 11, 12, 0, 0, 7); rc.fill(); }
      }
      rc.fillStyle = COL.head; rc.beginPath(); rc.arc(cx, cy, 40, 0, 7); rc.fill();
      rc.font = '26px sans-serif'; rc.textBaseline = 'middle';
      for (const s of src) { const x = cx + Math.sin(s.az) * R, y = cy - Math.cos(s.az) * R; rc.globalAlpha = clamp(.35 + s.s); rc.fillStyle = s.k === 'h' ? 'rgba(255,122,69,.25)' : 'rgba(79,179,255,.25)'; rc.beginPath(); rc.arc(x, y, 18 + 18 * s.s, 0, 7); rc.fill(); rc.fillText(s.icon, x, y + 1); rc.globalAlpha = 1; }
      rc.textBaseline = 'alphabetic';
    }
    return { OFF, device, command, stopOutput, emergencyStop, output, radar, both: () => both, log: cmdLog, tripped: () => tripped };
  };
})();
