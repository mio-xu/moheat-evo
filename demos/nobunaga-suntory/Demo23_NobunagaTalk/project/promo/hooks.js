// Injected before any page script (Page.addScriptToEvaluateOnNewDocument) by render.js, configured by window.__PROMO = { mode: 'script', ls, fixStand }:
// the page clock becomes virtual (performance.now / Date.now / timers / rAF / CSS animations) and is advanced by window.__step(ms)
// one video frame at a time, so the REAL engine (main.js: pictures, mouths, voice-driven DUAL warmth, radar, meters, #cmd) renders
// deterministic frames of the public scripted pages. TKAudio.play / level are replaced: the level comes from the voice PCM at the
// virtual playhead (same smoothing as the analyser), and every voice / move / fx / ambience call is logged for the offline mix.
(() => {
  const P = window.__PROMO || {}; if (!P.mode) return;
  try { localStorage.setItem('moheat.guide', 'done'); for (const [k, v] of Object.entries(P.ls || {})) localStorage.setItem(k, v); } catch {}
  const LOG = (window.__LOG = []);
  const trap = (name, wrap) => { let v; Object.defineProperty(window, name, { configurable: true, get: () => v, set: (x) => { v = x && !x.__wrapped ? wrap(x) : x; if (v) v.__wrapped = true; } }); };

  // ------------------------------------------------------------------ virtual clock
  const RT = { setTimeout: window.setTimeout.bind(window), now: performance.now.bind(performance) };
  let VT = 0; const D0 = Date.now(); const timers = new Map(); let tid = 1, rafs = [];
  performance.now = () => VT; Date.now = () => D0 + VT;
  window.setTimeout = (fn, ms = 0, ...a) => { const id = tid++; timers.set(id, { t: VT + Math.max(0, +ms || 0), fn, a }); return id; };
  window.setInterval = (fn, ms = 0, ...a) => { const id = tid++; timers.set(id, { t: VT + Math.max(1, +ms || 0), fn, a, every: Math.max(1, +ms || 0) }); return id; };
  window.clearTimeout = window.clearInterval = (id) => { timers.delete(id); };
  window.requestAnimationFrame = (fn) => { const id = tid++; rafs.push([id, fn]); return id; };
  window.cancelAnimationFrame = (id) => { rafs = rafs.filter((r) => r[0] !== id); };
  const flush = () => new Promise((r) => RT.setTimeout(r, 0));
  window.__vt = () => VT;
  window.__step = async (ms, frame = true) => {
    const target = VT + ms;
    for (let g = 0; g < 5000; g++) {
      let best = null; for (const [id, t] of timers) if (t.t <= target && (!best || t.t < best[1].t)) best = [id, t];
      if (!best) break;
      const [id, t] = best; VT = Math.max(VT, t.t);
      if (t.every) t.t += t.every; else timers.delete(id);
      try { typeof t.fn === 'function' ? t.fn(...t.a) : (0, eval)(t.fn); } catch (e) { console.error(e); }
      await flush();
    }
    VT = target;
    if (frame) { const rs = rafs; rafs = []; for (const [, fn] of rs) { try { fn(VT); } catch (e) { console.error(e); } } }
    await flush();
    for (const a of document.getAnimations()) { if (a.__v0 === undefined) { a.__v0 = VT - (a.currentTime || 0); a.pause(); } a.currentTime = Math.max(0, VT - a.__v0); }
    return VT;
  };

  // framing fix for the footage (P.fixStand): the engine draws the standing pose (left / right of you) 1.2 × the stage height from
  // 1.12 H, which cuts his head off at the top; draw it 14 % smaller from the same feet line so the face stays in the picture.
  // (Reported as a kit bug: _kit/talk/main.js frame() 'left' / 'right'.)
  if (P.fixStand) {
    const di = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (im, ...a) {
      if (a.length === 4 && im && /pose_invite/.test(im.src || '') && this.canvas.id === 'scene') { const k = .86, [x, y, w, h] = a; return di.call(this, im, x * k, y * k + (1 - k) * 0, w * k, h * k); }
      return di.call(this, im, ...a);
    };
  }

  // ------------------------------------------------------------------ audio (no sound in the browser; levels from the PCM)
  const BUF = (window.__BUF = {});   // key → AudioBuffer (pre-decoded recorded voices)
  const PLAY = {};
  trap('TKAudio', (A) => {
    const log = (k, o) => LOG.push({ vt: +(VT / 1000).toFixed(4), k, ...o });
    const play = A.play, move = A.move;
    A.play = (id, buf, gain = 1.5) => {
      log('voice', { id, key: buf && buf.__key, gain, dur: buf && buf.duration });
      if (!buf) return Promise.resolve();
      PLAY[id] = { buf, t0: VT, gain, lv: (PLAY[id] && PLAY[id].lv) || 0 };
      return new Promise((res) => setTimeout(() => { if (PLAY[id] && PLAY[id].buf === buf) PLAY[id].buf = null; res(); }, buf.duration * 1000));
    };
    A.level = (id) => {
      const p = PLAY[id]; if (!p) return 0;
      let v = 0;
      if (p.buf) {
        const d = p.buf.getChannelData(0), end = Math.floor((VT - p.t0) / 1000 * p.buf.sampleRate), st = Math.max(0, end - 512);
        let s = 0, n = 0; for (let i = st; i < Math.min(end, d.length); i++) { const x = d[i] * p.gain; s += x * x; n++; }
        v = n ? Math.sqrt(s / 512) : 0;
      }
      p.lv += (v - p.lv) * .35; return p.lv;
    };
    A.move = (id, az, dist, tc) => { log('move', { id, az, dist, tc }); return move(id, az, dist, tc); };
    const amb = A.ambience; A.ambience = (spec) => { log('ambience', { spec }); return amb(spec); };
    const sa = A.stopAmbience; A.stopAmbience = () => { log('ambience_stop', {}); return sa(); };
    for (const k of Object.keys(A.fx)) { const f = A.fx[k]; A.fx[k] = (...a) => { log('fx', { fx: k, a }); return f(...a); }; }
    const dec = A.decode; A.decode = (ab) => (ab && ab.__key && BUF[ab.__key] ? Promise.resolve(BUF[ab.__key]) : dec(ab).then((b) => { if (b && ab.__key) b.__key = ab.__key; return b; }));
    return A;
  });
  // the scripted brain fetches m4a voices: tag each decoded buffer with its file name (key = voice id)
  const fetch0 = window.fetch.bind(window);
  window.fetch = async (u, o) => { const r = await fetch0(u, o); const m = String(u).match(/media\/voice\/([^/?]+)\.m4a/); if (!m) return r; const ab = await r.arrayBuffer(); ab.__key = 'm4a:' + m[1]; return { ok: r.ok, status: r.status, arrayBuffer: async () => ab }; };

})();
