// End sting for every demo page (the same 2.4 s "MoHeat Evo" sting the exhibition package plays after a demo, version B).
// shared/shell.js loads this file when a demo has finished and its own cover comes back; the sting plays over the player,
// then fades and the cover is there as before. Picture = canvas 2D, sound = Web Audio, thermal = a short cool → warm touch
// sent only to a connected device and only when window.MOHEAT_STING_THERMAL is true (off by default: everything stays at 0 during the sting).
// A tap or a key ends it at once.
(() => {
  if (window.MoHeatSting) return;
// MoHeat Evo end sting: picture = canvas 2D only, sound = Web Audio only (no image, video or audio assets).
// Picture: a cold-to-warm line sweeps under the wordmark; each letter rises from behind it as the line passes.
const STING = { bg: '#11161a', ink: '#e9edeb', cold: '#4a9eff', warm: '#ff7a4d', text: 'MoHeat Evo', size: 140, track: -0.01, sweep: 0.9, rise: 0.45 };
const clamp01 = x => Math.max(0, Math.min(1, x));
const easeIO = u => (1 - Math.cos(Math.PI * clamp01(u))) / 2, easeIOinv = x => Math.acos(1 - 2 * clamp01(x)) / Math.PI, easeOut = u => 1 - Math.pow(1 - clamp01(u), 3);
function layout(c) {
  c.font = `800 ${STING.size}px Archivo`;
  const t = STING.text, ls = STING.track * STING.size, xs = [];
  for (let i = 0; i < t.length; i++) xs.push(c.measureText(t.slice(0, i + 1)).width - c.measureText(t[i]).width + i * ls);
  return { xs, w: c.measureText(t).width + (t.length - 1) * ls };
}
// t in seconds; o = { t0: line start, bg: paint the background, dim: [from, to] fade to the background over footage }
function drawSting(c, t, o) {
  const W = c.canvas.width, H = c.canvas.height, S = STING; c.clearRect(0, 0, W, H);
  if (o.bg) { c.fillStyle = S.bg; c.fillRect(0, 0, W, H); }
  else if (o.dim) { c.globalAlpha = easeIO((t - o.dim[0]) / (o.dim[1] - o.dim[0])); c.fillStyle = S.bg; c.fillRect(0, 0, W, H); c.globalAlpha = 1; }
  if (t < o.t0) return;
  const L = layout(c), x0 = (W - L.w) / 2, x1 = x0 + L.w, base = 572, lineY = base + 30, cap = S.size * 0.7;
  const head = x0 + (x1 - x0) * easeIO((t - o.t0) / S.sweep);
  c.save(); c.beginPath(); c.rect(0, 0, W, lineY - 1); c.clip(); c.fillStyle = S.ink; c.textBaseline = 'alphabetic';
  [...S.text].forEach((ch, i) => {
    if (ch === ' ') return;
    const k = (t - (o.t0 + S.sweep * easeIOinv(L.xs[i] / L.w))) / S.rise; if (k <= 0) return;
    c.globalAlpha = clamp01(k * 3); c.fillText(ch, x0 + L.xs[i], base + (1 - easeOut(k)) * cap * 1.15);
  });
  c.restore(); c.globalAlpha = 1;
  const g = c.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, S.cold); g.addColorStop(1, S.warm);
  c.fillStyle = g; c.fillRect(x0, lineY, Math.max(0, head - x0), 3);
}
// Sound: open fifth A5 + E6 (high, cool, left) resolving to D major (low, warm, right), on the line's arrival. Deterministic.
function stingAudio(ac, when, level) {
  const out = ac.createGain(); out.gain.value = level; out.connect(ac.destination);
  const dry = ac.createGain(); dry.connect(out);
  const len = Math.floor(1.2 * ac.sampleRate), ir = ac.createBuffer(2, len, ac.sampleRate); let s = 12345;
  for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; d[i] = (s / 0x3fffffff - 1) * Math.exp(-i / ac.sampleRate / 0.3); } }
  const rev = ac.createConvolver(); rev.buffer = ir; const wet = ac.createGain(); wet.gain.value = 0.22; dry.connect(rev); rev.connect(wet); wet.connect(out);
  function tone(f, a, t0, atk, tau, pan, lp) {
    const o = ac.createOscillator(), g = ac.createGain(), p = ac.createStereoPanner(); o.frequency.value = f; p.pan.value = pan;
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(a, t0 + atk); g.gain.setTargetAtTime(0, t0 + atk, tau);
    let n = o; if (lp) { const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp; n.connect(fl); n = fl; }
    n.connect(g); g.connect(p); p.connect(dry); o.start(t0); o.stop(t0 + atk + tau * 9);
  }
  tone(880, .20, when, .03, .32, -.4); tone(1318.51, .10, when, .03, .26, -.4);                       // cool, high
  const low = when + .82; [[73.42, .34], [146.83, .30], [185, .12], [220, .16], [293.66, .07]].forEach(([f, a]) => tone(f, a, low, .09, .45, .35, 1100)); // warm, low
}
  // thermal: [s, L cool, R cool, L heat, R heat] (0–1), ends at zero by 2.3 s
  const CURVE = [[0,0,0,0,0],[0.05,0,0,0,0],[0.1,0,0,0,0],[0.15,0.023,0,0,0],[0.2,0.062,0,0,0],[0.25,0.101,0,0,0],[0.3,0.14,0,0,0],[0.35,0.178,0,0,0],[0.4,0.217,0,0,0],[0.45,0.256,0,0,0],[0.5,0.295,0,0,0],[0.55,0.334,0,0,0],[0.6,0.372,0,0,0],[0.65,0.411,0,0,0],[0.7,0.45,0,0,0],[0.75,0.45,0,0,0],[0.8,0.45,0,0,0],[0.85,0.45,0,0,0.025],[0.9,0.45,0,0,0.05],[0.95,0.45,0,0,0.075],[1,0.45,0,0,0.1],[1.05,0.43,0,0,0.125],[1.1,0.409,0,0,0.15],[1.15,0.389,0,0,0.175],[1.2,0.368,0,0,0.2],[1.25,0.348,0,0,0.225],[1.3,0.327,0,0,0.25],[1.35,0.307,0,0,0.275],[1.4,0.286,0,0,0.3],[1.45,0.266,0,0,0.325],[1.5,0.245,0,0,0.35],[1.55,0.225,0,0,0.375],[1.6,0.205,0,0,0.4],[1.65,0.184,0,0,0.425],[1.7,0.164,0,0,0.45],[1.75,0.143,0,0,0.475],[1.8,0.123,0,0,0.5],[1.85,0.102,0,0,0.5],[1.9,0.082,0,0,0.444],[1.95,0.061,0,0,0.389],[2,0.041,0,0,0.333],[2.05,0.02,0,0,0.278],[2.1,0,0,0,0.222],[2.15,0,0,0,0.167],[2.2,0,0,0,0.111],[2.25,0,0,0,0.056],[2.3,0,0,0,0]];
  const FONT = new URL('sting/Archivo-800-subset.woff2', document.currentScript?.src || location.href).href;
  const css = document.createElement('style');
  css.textContent = `.sting-box{position:absolute;inset:0;z-index:70;border-radius:inherit;overflow:hidden;cursor:pointer;
    background:radial-gradient(circle at 78% -8%,#43202a 0,transparent 40%),radial-gradient(circle at 12% 108%,#1a2d3b 0,transparent 42%),#090708;opacity:1;transition:opacity .22s ease-out}
  .stage:has(> .u2) > .sting-box.sting-box.sting-box{visibility:visible!important}   /* ui2.css hides everything but its cover on the cover; the sting sits on top of it */
  .sting-box.out{opacity:0;pointer-events:none}.sting-box canvas{display:block;width:100%;height:100%;object-fit:contain}`;
  document.head.appendChild(css);
  const LEN = 2.4, wait = (ms) => new Promise((r) => setTimeout(r, ms));
  let busy = false;
  // play(host, { intensity: 0–1, reduced }) → Promise that resolves when it is over (never rejects)
  function play(host, o = {}) {
    if (busy || !host) return Promise.resolve('busy');
    busy = true;
    return new Promise((resolve) => {
      let over = false, box = null, ac = null; const timers = [];
      const dev = () => window.MoHeatDevice?.current, send = (c) => { try { if (dev()?.isConnected()) dev().send(c); } catch {} };
      const key = () => finish('stopped');
      const finish = (why) => { if (over) return; over = true; timers.forEach(clearTimeout); removeEventListener('keydown', key, true); send('stop'); try { ac?.close(); } catch {}
        if (box) { box.classList.add('out'); setTimeout(() => box.remove(), 260); } busy = false; resolve(why); };
      (async () => {
        timers.push(setTimeout(() => finish('limit'), 5500));
        box = document.createElement('div'); box.className = 'sting-box'; box.innerHTML = '<canvas width="1920" height="1080"></canvas>'; host.appendChild(box);
        box.addEventListener('pointerdown', (e) => { e.stopPropagation(); finish('stopped'); }); addEventListener('keydown', key, true);
        const cx = box.querySelector('canvas').getContext('2d');
        try { const f = new FontFace('Archivo', `url(${FONT}) format('woff2')`, { weight: '800' }); await Promise.race([f.load().then((x) => document.fonts.add(x)), wait(900)]); } catch {}
        if (over) return;
        if (![...document.fonts].some((f) => f.family.replace(/"/g, '') === 'Archivo' && f.status === 'loaded')) return finish('font');
        if (o.reduced) { drawSting(cx, 9, { t0: 0, bg: false }); timers.push(setTimeout(() => finish('done'), LEN * 1000)); return; }
        try { ac = new (window.AudioContext || window.webkitAudioContext)(); await Promise.race([ac.resume(), wait(400)]); } catch {}
        if (over) return;
        if (ac && ac.state === 'running') stingAudio(ac, ac.currentTime + .12, .7);
        const k = Math.max(0, Math.min(1, o.intensity ?? 1)), cool = (f) => (f * k > .005 ? Math.round(35 + f * k * 45) : 0), heat = (f) => Math.round(f * k * 200);
        let last = '';
        send('stop');   // whatever the demo left on is off
        if (window.MOHEAT_STING_THERMAL) for (const [t, lc, rc, lh, rh] of CURVE) timers.push(setTimeout(() => { if (over) return;   // the cool → warm touch: off unless a page turns it on (user 2026-11-10: no thermal in the sting)
          const p = [cool(lc), heat(lh), cool(rc), heat(rh)], c = p.some(Boolean) ? `DUAL LC${p[0]} LH${p[1]} RC${p[2]} RH${p[3]}` : 'stop';
          if (c !== last) { last = c; send(c); } }, t * 1000));
        timers.push(setTimeout(() => finish('done'), LEN * 1000));
        const T0 = performance.now(), frame = () => { if (over) return; try { drawSting(cx, (performance.now() - T0) / 1000, { t0: .12, bg: false }); } catch { return finish('draw'); } requestAnimationFrame(frame); }; frame();
      })().catch(() => finish('error'));
    });
  }
  window.MoHeatSting = { play, get playing() { return busy; } };
})();
