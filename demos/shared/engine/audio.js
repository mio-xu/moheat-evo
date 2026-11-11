// shared/engine/audio.js — MoHeatEngine.audio(opt, build): the Web Audio base every own-engine demo copied into its audio.js.
//   window.HTAudio = MoHeatEngine.audio({ verbSec: 1.6, verbGain: .16 }, (B) => ({ loop(kind) {…}, fx: {…} }));
// B (for the demo's own sounds): B.ac (getter, null before init) · panner(az, dist) · place(p, az, dist, tc) · chain(az, dist, send)
// → { g, p } · noiseSrc() · shot(az, dist, send, build(out, t), len) · burst(out, dur, amp, f, type, q, at) · swell(…) ·
// tone(out, f, dur, amp, at, type, attack) · rnd · loops (registry) · makeLoop(kind, g, p, lp, nodes) → the usual { g, p, lp, set,
// at, tone, stop } handle, registered in B.loops.
// Returned (what main.js uses): init · loadVoices(ids) · say(id, where, gain) → Promise at the line's end (no file: a 2.2 s pause) ·
// voiceLevel() · setMuted · isMuted · lrCheck · ctx() + whatever build() returns (loop, fx, …).
// az: rad, 0 = front, + = right. dist: metres. Voices: media/voice/<id>.m4a in the voice language (shared/shell.js MoHeatVoice; ja on 404).
(() => {
  const ME = window.MoHeatEngine = window.MoHeatEngine || {};
  if (ME.audio) return;
  ME.audio = (opt = {}, build = null) => {
    const VERB_SEC = opt.verbSec ?? 1.2, VERB_GAIN = opt.verbGain ?? .16, VERB_POW = opt.verbPow ?? 4, MASTER = opt.master ?? .95;
    let ac = null, master = null, dry = null, verb = null, noise = null, muted = false;
    const rnd = (a, b) => a + Math.random() * (b - a);
    const voices = {};
    // voice language: one cache entry per language, ja fallback, a switch preloads the lines used so far
    const VF = (id, base, q = '') => (window.MoHeatVoice ? MoHeatVoice.fetch(id, base, q) : fetch(`${base}${id}.m4a${q}`));
    const VIDS = new Set(), VK = (id) => (VIDS.add(id), window.MoHeatVoice ? MoHeatVoice.key(id) : id);
    addEventListener('moheat:voicelang', () => loadVoices([...VIDS]));
    let level = 0, an = null, abuf = null;

    function init() {
      if (ac) { if (ac.state === 'suspended') ac.resume(); return ac; }
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain(); master.gain.value = muted ? 0 : MASTER;
      const comp = ac.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3;
      master.connect(comp).connect(ac.destination);
      dry = ac.createGain(); dry.connect(master);
      verb = ac.createConvolver(); const vg = ac.createGain(); vg.gain.value = VERB_GAIN; verb.connect(vg).connect(master);
      const n = Math.round(ac.sampleRate * VERB_SEC), b = ac.createBuffer(2, n, ac.sampleRate);
      for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, VERB_POW); }
      verb.buffer = b;
      noise = ac.createBuffer(1, ac.sampleRate * 3, ac.sampleRate);
      const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      an = ac.createAnalyser(); an.fftSize = 512; abuf = new Float32Array(512);
      return ac;
    }
    function panner(az, dist) { const p = new PannerNode(ac, { panningModel: 'HRTF', distanceModel: 'inverse', refDistance: .5, rolloffFactor: .7 }); place(p, az, dist, 0); return p; }
    function place(p, az, dist, tc = .08) {
      const x = Math.sin(az) * dist, z = -Math.cos(az) * dist, t = ac.currentTime;
      if (p.positionX) { p.positionX.setTargetAtTime(x, t, tc || .001); p.positionY.setTargetAtTime(0, t, .001); p.positionZ.setTargetAtTime(z, t, tc || .001); } else p.setPosition(x, 0, z);
    }
    function chain(az, dist, send = .3) { const g = ac.createGain(), p = panner(az, dist), s = ac.createGain(); s.gain.value = send; g.connect(p); p.connect(dry); p.connect(s); s.connect(verb); return { g, p }; }
    function noiseSrc() { const s = ac.createBufferSource(); s.buffer = noise; s.loop = true; s.start(0, rnd(0, 2.5)); return s; }
    function shot(az, dist, send, build, len) { if (!ac) return; const { g, p } = chain(az, dist, send); build(g, ac.currentTime); setTimeout(() => { g.disconnect(); p.disconnect(); }, (len + 1.5) * 1000); }
    function burst(out, dur, amp, f, type = 'bandpass', q = .8, at = 0) {
      const s = ac.createBufferSource(); s.buffer = noise; const fl = new BiquadFilterNode(ac, { type, frequency: f, Q: q }), g = ac.createGain(), t = ac.currentTime + at;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + Math.min(.008, dur / 3)); g.gain.exponentialRampToValueAtTime(.001, t + dur + .01);
      s.connect(fl).connect(g).connect(out); s.start(t, rnd(0, 2.5), dur + .03);
    }
    function swell(out, dur, amp, f, type = 'bandpass', q = .7, at = 0, f2 = null) {   // a noise that rises and falls (wind, breath, whoosh)
      const s = ac.createBufferSource(); s.buffer = noise; const fl = new BiquadFilterNode(ac, { type, frequency: f, Q: q }), g = ac.createGain(), t = ac.currentTime + at;
      if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + dur * .4); g.gain.linearRampToValueAtTime(0, t + dur);
      s.connect(fl).connect(g).connect(out); s.start(t, rnd(0, 2.5), dur + .05);
    }
    function tone(out, f, dur, amp, at = 0, type = 'sine', attack = .006) {
      const o = new OscillatorNode(ac, { frequency: f, type }), g = ac.createGain(), t = ac.currentTime + at;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + attack); g.gain.exponentialRampToValueAtTime(.0005, t + dur);
      o.connect(g).connect(out); o.start(t); o.stop(t + dur + .02);
    }

    // ---------------------------------------------------------------- voices
    function loadVoices(ids) {
      if (!ac) return;
      for (const id of ids) for (const k of [VK(id)]) if (!voices[k]) voices[k] = VF(id, 'media/voice/', '').then((r) => { if (!r.ok) throw 0; return r.arrayBuffer(); }).then((b) => ac.decodeAudioData(b)).then((buf) => (voices[k] = buf)).catch(() => (voices[k] = null));
    }
    function say(id, where = { az: 0, dist: .8 }, gain = 1.4) {   // → Promise, resolves when the line ends (no file yet: a pause)
      return new Promise(async (res) => {
        if (voices[VK(id)] === undefined) loadVoices([id]);   // not loaded in this voice language yet
        if (voices[VK(id)] instanceof Promise) await voices[VK(id)];
        const buf = voices[VK(id)]; if (!ac || !buf) return setTimeout(res, 2200);
        const s = ac.createBufferSource(); s.buffer = buf; const g = ac.createGain(); g.gain.value = gain;
        const c = chain(where.az, where.dist, where.dist < .3 ? .03 : .15);
        s.connect(g); g.connect(c.g); g.connect(an);
        setTimeout(() => { c.g.disconnect(); c.p.disconnect(); }, (buf.duration + 2) * 1000);
        s.onended = () => res(); s.start();
      });
    }
    function voiceLevel() {
      if (!an) return 0;
      an.getFloatTimeDomainData(abuf); let s = 0; for (let i = 0; i < abuf.length; i++) s += abuf[i] * abuf[i];
      const v = Math.sqrt(s / abuf.length); level += (v - level) * .35; return level;
    }

    // ---------------------------------------------------------------- loops: the demo builds the sound, makeLoop gives the usual handle
    const loops = {};
    function makeLoop(kind, g, p, lp, nodes) {
      const L = { g, p, lp,
        set: (v, tc = .2) => g.gain.setTargetAtTime(v, ac.currentTime, tc),
        at: (az, dist, tc) => place(p, az, dist, tc ?? .05),
        tone: (f) => lp?.frequency.setTargetAtTime(f, ac.currentTime, .3),
        stop: () => { g.gain.setTargetAtTime(0, ac.currentTime, .15); setTimeout(() => { for (const n of nodes) try { n.stop(); n.disconnect(); } catch {} g.disconnect(); }, 1200); delete loops[kind]; } };
      loops[kind] = L; return L;
    }

    function setMuted(v) { muted = v; if (master) master.gain.setTargetAtTime(v ? 0 : MASTER, ac.currentTime, .05); }
    function lrCheck() { init(); shot(-Math.PI / 2, 1, .1, (o) => tone(o, 880, .4, .2), .5); setTimeout(() => shot(Math.PI / 2, 1, .1, (o) => tone(o, 1175, .4, .2), .5), 900); }
    const B = { get ac() { return ac; }, init, panner, place, chain, noiseSrc, shot, burst, swell, tone, rnd, loops, makeLoop, loadVoices, say, voiceLevel };
    const api = { init, loadVoices, say, voiceLevel, setMuted, isMuted: () => muted, lrCheck, ctx: () => ac };
    return Object.assign(api, build ? build(B) : {});
  };
})();
