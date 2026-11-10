// shared/story.js — MoHeatStory: the data-driven story engine for the interactive layered demos (crossovers 43-style, healing
// stories). Extracted from Demo43 白嶺の峠 (main.js + audio.js), 2026-11-09, so that a new story demo writes only content:
//   lines.js     window.<X>_LINES = { who, lines: {id: [ja, en, who]}, steps: [{ id, ja, en, zh, view: [base, ear?], pos?, beats }],
//                topics, yn_only, bridges, places }   (scripts/script_data.py of the demo; the same file tools/thermal/plan_sim.py reads)
//                beats: [id, pos] a line · ['@event'] · ['window', who, id] a free-talk window · { type: choice | action | say | hold }
//   media/plan.js   window.MOHEAT_PLAN (tools/thermal/plan_js.py ← project/thermal_plan.json): the thermal events (set / pulse /
//                sweep / then), voice distances, smoothing, step_start, places (もっと話す ambient), reuse (talk views)
//   media/voice.js  window.<X>_VOICE = { langs, dur: {lang: {id: s}} } + media/voice/<id>.m4a (ja) · media/voice/<lang>/<id>.m4a (en / zh)
//   media/layers.js the layered stills (shared/layers.js animates them; hooks <ns>.S.view / lv / who)
//   main.js      MoHeatStory.run({ ns, data, voice, ... per-demo FX: draw / sfx / loops / beds / icons / eventView / lineView })
// What it does (same behaviour as Demo43): subtitles (#subs, translated by shared/subs.js), voices placed with HRTF, choices / actions
// / say-it gates / press-and-hold (judged by shared/voice.js), free-talk windows + もっと話す place × cast (shared/talk.js), chapters
// (#steps → shared/shell.js), DUAL thermal from the plan (voice layer: (0.1 + 0.8 × loudness) × distance at the speaker's position;
// ambient layer: the plan's sources), radar + meters + device output (device.js), cross-faded stills, end on its own cover.
// Voice language: the shared setting (MoHeatVoice in shared/shell.js, default = the subtitle language); a dub that is missing plays ja (404 fallback).
// Tests: ?auto=1 (answers itself) · &alt=1 (last options, let-go paths) · &end=N (that ending) · ?talk=<cast>&place=<place> · &sample.
(() => {
  if (window.MoHeatStory) return;
  const QS = new URLSearchParams(location.search);
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const sleep = (s) => new Promise((r) => setTimeout(r, s * 1000));
  const RAD = Math.PI / 180;

  // ================================================================ audio: voices (per language) + a synthesized sound library
  const A = (() => {
    let ac = null, master = null, dry = null, verb = null, noise = null, muted = false, an = null, abuf = null, level = 0;
    const voices = {};
    function init() {
      if (ac) { if (ac.state === 'suspended') ac.resume(); return ac; }
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain(); master.gain.value = muted ? 0 : .95;
      const comp = ac.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3;
      master.connect(comp).connect(ac.destination);
      dry = ac.createGain(); dry.connect(master);
      verb = ac.createConvolver(); const vg = ac.createGain(); vg.gain.value = .14; verb.connect(vg).connect(master);
      const n = Math.round(ac.sampleRate * 1.2), b = ac.createBuffer(2, n, ac.sampleRate);
      for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 4); }
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
    // ---- voices through MoHeatVoice (shared/shell.js): the voice language setting, media/voice/<id>.m4a (ja) · media/voice/<lang>/<id>.m4a, ja on 404
    const VF = (id, base = 'media/voice/', q = '') => (window.MoHeatVoice ? window.MoHeatVoice.fetch(id, base, q) : fetch(`${base}${id}.m4a${q}`));
    const VK = (id) => (window.MoHeatVoice ? window.MoHeatVoice.key(id) : id);
    function load(id) {
      const k = VK(id); if (voices[k] !== undefined || !ac) return;
      voices[k] = VF(id, 'media/voice/').then((r) => { if (!r.ok) throw 0; return r.arrayBuffer(); }).then((b) => ac.decodeAudioData(b)).then((buf) => (voices[k] = buf)).catch(() => (voices[k] = null));
    }
    function loadVoices(ids) { if (ac) for (const id of ids) load(id); }
    function play(buf, where, gain) {
      return new Promise((res) => {
        if (!ac || !buf) return setTimeout(res, 2200);
        const s = ac.createBufferSource(); s.buffer = buf; const g = ac.createGain(); g.gain.value = gain;
        const c = chain(where.az, where.dist, where.dist < .3 ? .03 : .15);
        s.connect(g); g.connect(c.g); g.connect(an);
        setTimeout(() => { c.g.disconnect(); c.p.disconnect(); }, (buf.duration + 2) * 1000);
        s.onended = () => res(); s.start();
      });
    }
    async function say(id, where, gain) {   // a line in the current voice language (loaded on demand after a language switch)
      const k = VK(id); if (voices[k] === undefined) load(id);
      if (voices[k] instanceof Promise) await voices[k];
      return play(voices[k], where, gain);
    }
    function voiceLevel() {
      if (!an) return 0;
      an.getFloatTimeDomainData(abuf); let s = 0; for (let i = 0; i < abuf.length; i++) s += abuf[i] * abuf[i];
      const v = Math.sqrt(s / abuf.length); level += (v - level) * .35; return level;
    }
    // ---- loops: one per name; kind = the synthesized sound (wind · fire · room · water · rain · night · cicada · bubble · hum · fan · waves)
    const loops = {};
    function loop(name, kind = name, az = 0, dist = 1.5) {
      if (!ac) return null; if (loops[name]) return loops[name];
      const nodes = [], { g, p } = chain(az, dist, kind === 'room' ? .25 : .12); g.gain.value = 0; let lp = null;
      const every = (ms, fn) => { const iv = setInterval(() => { if (ac && g.gain.value > .005) fn(); }, ms); nodes.push({ stop: () => clearInterval(iv), disconnect() {} }); };
      const bed = (f, type, q, amp) => { const s = noiseSrc(), fl = new BiquadFilterNode(ac, { type, frequency: f, Q: q }), sg = ac.createGain(); sg.gain.value = amp; s.connect(fl).connect(sg).connect(g); nodes.push(s); return fl; };
      if (kind === 'wind') {
        lp = new BiquadFilterNode(ac, { type: 'lowpass', frequency: 1400 });
        const s = noiseSrc(), bp = new BiquadFilterNode(ac, { type: 'bandpass', frequency: 500, Q: .5 }); s.connect(bp).connect(lp).connect(g); nodes.push(s);
        const wf = bed(900, 'bandpass', 9, .3); every(900, () => wf.frequency.setTargetAtTime(rnd(600, 1500), ac.currentTime, .6));
      }
      if (kind === 'fire') { bed(300, 'lowpass', .7, .22); every(130, () => { if (Math.random() < .6) burst(g, .006, rnd(.12, .42), rnd(1800, 5000), 'bandpass', 3); }); }
      if (kind === 'room') { bed(180, 'lowpass', .7, .25); every(2600, () => { if (Math.random() < .2) burst(g, .3, .02, rnd(500, 900), 'bandpass', 8); }); }
      if (kind === 'water') { const f = bed(1300, 'bandpass', .6, .25); every(160, () => { f.frequency.setTargetAtTime(rnd(900, 2200), ac.currentTime, .08); if (Math.random() < .35) tone(g, rnd(500, 1300), .07, .03, 0, 'sine', .004); }); }
      if (kind === 'rain') { bed(4200, 'highpass', .5, .2); bed(900, 'lowpass', .5, .1); every(45, () => { if (Math.random() < .7) burst(g, .004, rnd(.04, .14), rnd(2500, 7000), 'bandpass', 4); }); }
      if (kind === 'night') { every(380, () => { if (Math.random() < .7) { const f = rnd(4200, 4800); for (let i = 0; i < 3; i++) tone(g, f, .035, .03, i * .055, 'sine', .004); } }); bed(250, 'lowpass', .7, .04); }
      if (kind === 'cicada') { const f = bed(5200, 'bandpass', 6, .18), lfo = new OscillatorNode(ac, { frequency: 11 }), lg = ac.createGain(); lg.gain.value = 1400; lfo.connect(lg).connect(f.frequency); lfo.start(); nodes.push(lfo); }
      if (kind === 'bubble') { bed(2400, 'bandpass', .7, .1); every(130, () => { for (let i = 0; i < 2; i++) { const fr = rnd(180, 420), o = new OscillatorNode(ac, { frequency: fr }), gg = ac.createGain(), t = ac.currentTime + rnd(0, .1); o.frequency.exponentialRampToValueAtTime(fr * 2.2, t + .06); gg.gain.setValueAtTime(0, t); gg.gain.linearRampToValueAtTime(.1, t + .01); gg.gain.exponentialRampToValueAtTime(.001, t + .08); o.connect(gg).connect(g); o.start(t); o.stop(t + .1); } }); }
      if (kind === 'hum') { for (const [f, a] of [[110, .05], [165, .03], [220, .02]]) { const o = new OscillatorNode(ac, { frequency: f }), og = ac.createGain(); og.gain.value = a; o.connect(og).connect(g); o.start(); nodes.push(o); } every(500, () => { if (Math.random() < .5) tone(g, rnd(1800, 3200), .6, .012, 0, 'sine', .05); }); }
      if (kind === 'fan') { bed(420, 'bandpass', 1.2, .18); const o = new OscillatorNode(ac, { frequency: 100, type: 'triangle' }), og = ac.createGain(); og.gain.value = .015; o.connect(og).connect(g); o.start(); nodes.push(o); }
      if (kind === 'waves') { const f = bed(700, 'lowpass', .5, .3), lfo = new OscillatorNode(ac, { frequency: .12 }), lg = ac.createGain(); lg.gain.value = 500; lfo.connect(lg).connect(f.frequency); lfo.start(); nodes.push(lfo); }
      const L = { g, p, kind,
        set: (v, tc = .2) => { if (ac) g.gain.setTargetAtTime(v, ac.currentTime, tc); },
        at: (a, d, tc) => place(p, a, d, tc ?? .05),
        tone: (f) => lp?.frequency.setTargetAtTime(f, ac.currentTime, .3),
        stop: () => { g.gain.setTargetAtTime(0, ac.currentTime, .15); setTimeout(() => { for (const n of nodes) try { n.stop?.(); n.disconnect(); } catch {} g.disconnect(); }, 1200); delete loops[name]; } };
      loops[name] = L; return L;
    }
    // ---- one-shots (az: rad, 0 = front, + = right; dist: m)
    const fx = {
      rustle: (az = 0, dist = .3) => shot(az, dist, .05, (o) => swell(o, .7, .35, 1800, 'bandpass', .6), .9),
      steps: (from = 1, to = 0, n = 4, dist = 1.5, soft = false) => { if (!ac) return; for (let i = 0; i < n; i++) setTimeout(() => shot(from + (to - from) * i / Math.max(1, n - 1), dist, .2, (o) => { burst(o, .08, soft ? .18 : .3, soft ? 300 : 420, 'lowpass', 1); burst(o, .02, .1, 1600, 'bandpass', 3, .01); }, .4), i * 360); },
      whoosh: (az = 0, dur = 1.2, dist = .6) => shot(az, dist, .1, (o) => swell(o, dur, .45, 400, 'bandpass', .6, 0, 2400), dur + .2),
      gust: (az0 = -1.4, az1 = 1.4, dur = 1.8) => { if (!ac) return; const { g, p } = chain(az0, .5, .05); swell(g, dur, .55, 600, 'bandpass', .5, 0, 1500); const t0 = performance.now(); const iv = setInterval(() => { const k = Math.min(1, (performance.now() - t0) / (dur * 1000)); place(p, az0 + (az1 - az0) * k, .5, .05); if (k >= 1) clearInterval(iv); }, 50); setTimeout(() => { g.disconnect(); p.disconnect(); }, (dur + 1.5) * 1000); },
      sparkle: (az = 0, dist = .8, n = 7) => shot(az, dist, .4, (o) => { for (let i = 0; i < n; i++) tone(o, rnd(2200, 4200), .5, .03, i * .07, 'sine', .003); }, 1.4),
      chime: (az = 0) => shot(az, 1, .4, (o) => { for (const [f, at] of [[1568, 0], [2093, .12], [2637, .24]]) tone(o, f, 1.6, .05, at, 'sine', .003); }, 2),
      bell: (az = 0, dist = 1.2) => shot(az, dist, .4, (o) => { const f = rnd(1900, 2600); tone(o, f, 1.4, .04, 0, 'sine', .002); tone(o, f * 2.76, .6, .012, 0, 'sine', .002); }, 1.6),
      bang: (az = -1.25) => shot(az, 2, .3, (o) => { burst(o, .25, .9, 160, 'lowpass', .7); burst(o, .05, .4, 1200, 'bandpass', 2, .02); }, 1.4),
      thud: (az = 0, dist = 1) => shot(az, dist, .15, (o) => burst(o, .18, .6, 140, 'lowpass', .8), .6),
      knock: (az = 0, dist = 1.5, n = 3) => shot(az, dist, .25, (o) => { for (let i = 0; i < n; i++) burst(o, .06, .5, 500, 'bandpass', 2, i * .22); }, 1.2),
      blow: (az = 1.35, dur = 1.8) => shot(az, .1, 0, (o) => swell(o, dur, .32, 1100, 'bandpass', .5), dur + .2),
      sip: () => shot(0, .25, .02, (o) => { swell(o, .5, .12, 1500, 'bandpass', 1); tone(o, 300, .12, .03, .45, 'sine', .01); }, 1),
      clink: (az = 0, dist = .5) => shot(az, dist, .15, (o) => { tone(o, 3100, .35, .04, 0, 'sine', .002); tone(o, 4650, .25, .02, .01, 'sine', .002); }, .6),
      crack: (az = 0, dist = .5) => shot(az, dist, .15, (o) => { burst(o, .03, .4, 3000, 'bandpass', 3); burst(o, .02, .25, 5500, 'bandpass', 4, .05); }, .5),
      splash: (az = 0, dist = .8) => shot(az, dist, .2, (o) => { burst(o, .35, .45, 1600, 'bandpass', .6); for (let i = 0; i < 5; i++) tone(o, rnd(500, 1200), .06, .03, .05 + i * .05, 'sine', .004); }, 1),
      pour: (az = 0, dist = .5, dur = 1.6) => shot(az, dist, .1, (o) => swell(o, dur, .2, 2200, 'bandpass', 1.5), dur + .2),
      flare: (az = .5, dist = 1.2) => shot(az, dist, .2, (o) => { swell(o, 1.3, .6, 250, 'lowpass', .7, 0, 900); for (let i = 0; i < 8; i++) burst(o, .006, rnd(.2, .45), rnd(2000, 5000), 'bandpass', 3, i * .09); }, 1.6),
      swish: (az = 0, dist = .3) => shot(az, dist, .03, (o) => swell(o, .35, .3, 900, 'bandpass', .7), .5),
      slide: (az = -.6, dist = 2) => shot(az, dist, .2, (o) => { swell(o, .7, .35, 300, 'bandpass', 1); burst(o, .1, .3, 220, 'lowpass', 1, .7); }, 1),
      page: (az = 0, dist = .5) => shot(az, dist, .05, (o) => { burst(o, .12, .25, 3500, 'highpass', .7); burst(o, .1, .15, 2500, 'bandpass', 1, .1); }, .5),
      thunder: (az = -.6) => shot(az, 6, .6, (o) => { burst(o, 2.6, .9, 90, 'lowpass', .7); burst(o, .5, .5, 300, 'lowpass', .7, .1); }, 3.5),
      magic: (az = 0, dist = 1) => shot(az, dist, .5, (o) => { swell(o, 1.6, .25, 800, 'bandpass', 1.5, 0, 3200); for (let i = 0; i < 6; i++) tone(o, 880 * Math.pow(1.26, i), .9, .025, i * .1, 'sine', .01); }, 2.2),
      wake: () => shot(0, 1.5, .4, (o) => swell(o, 3, .45, 600, 'bandpass', .6, 0, 3000), 3.2),
      pop: (az = 0, dist = .6) => shot(az, dist, .1, (o) => tone(o, 600, .12, .08, 0, 'sine', .002), .3),
    };
    function setMuted(v) { muted = v; if (master) master.gain.setTargetAtTime(v ? 0 : .95, ac.currentTime, .05); }
    function lrCheck() { init(); shot(-Math.PI / 2, 1, .1, (o) => tone(o, 880, .4, .2), .5); setTimeout(() => shot(Math.PI / 2, 1, .1, (o) => tone(o, 1175, .4, .2), .5), 900); }
    function stopAll() { for (const k of Object.keys(loops)) loops[k].stop(); }
    return { init, loadVoices, say, play, decode: (ab) => ac.decodeAudioData(ab), voiceLevel, loop, loops, fx, setMuted, isMuted: () => muted, lrCheck, stopAll, ctx: () => ac,
      lib: { chain, shot, burst, swell, tone, noiseSrc, place } };
  })();

  // ================================================================ the story engine
  function run(cfg) {
    const D = cfg.data, LINES = D.lines, PLAN = cfg.plan || window.MOHEAT_PLAN || { events: {}, voice: { az: {}, distance: {} }, smoothing: {} };
    const EV = PLAN.events || {}, VO = PLAN.voice, SM = { warm_rise: .4, warm_fall: .5, cool_rise: .2, cool_fall: .35, ...(PLAN.smoothing || {}) };
    const LAY = window.MOHEAT_LAYERS || { views: {} }, VOICE = cfg.voice || {}, LIVE = cfg.live || null, W = 1920, H = 1080;
    const AUTO = QS.has('auto'), ALT = QS.has('alt');
    const cv = $('scene'), ctx = cv.getContext('2d'), stage = $('stage');
    const NAME = D.who || {};
    // the demo's l10n.js (names) arrives after this runs (shared/subs.js loads it): read it when needed
    const nm = (who, l) => (l === 'ja' ? NAME[who] : ((window.MOHEAT_L10N || {}).names?.[NAME[who]] || {})[l]) || NAME[who] || who;
    const PURE = () => !!(window.MoHeatPlay && window.MoHeatPlay.pure) || QS.has('sample');

    // ---- texts the engine writes on the page get their 中文 here (data has zh: steps, answers, places; names from l10n names)
    // (the demo's l10n.js is loaded later by shared/subs.js and replaces window.MOHEAT_L10N: these strings are merged into it then)
    const EXTRA = {}, mergeL10 = (v) => { if (v && typeof v === 'object') { v.text = v.text || {}; v.text.zh = v.text.zh || {}; for (const w of Object.keys(NAME)) { const z = v.names?.[NAME[w]]?.zh; if (z) { EXTRA[`${NAME[w]}に答えてみよう`] = `回答${z}吧`; EXTRA[NAME[w]] = z; } } for (const [k, z] of Object.entries(EXTRA)) if (!(k in v.text.zh)) v.text.zh[k] = z; } return v; };
    { let cur = mergeL10(window.MOHEAT_L10N); try { Object.defineProperty(window, 'MOHEAT_L10N', { configurable: true, get: () => cur, set: (v) => { cur = mergeL10(v); } }); } catch {} }
    const zh = (ja, z) => { if (ja && z && !EXTRA[ja]) { EXTRA[ja] = z; mergeL10(window.MOHEAT_L10N); } };
    const PROMPT = (who) => [`${NAME[who]}に答えてみよう`, `Answer ${nm(who, 'en')}`, `回答${nm(who, 'zh')}吧`];
    for (const w of Object.keys(NAME)) { const p = PROMPT(w); zh(p[0], p[2]); zh(NAME[w], nm(w, 'zh')); }
    for (const st of D.steps) {
      zh(st.ja, st.zh);
      for (const b of st.beats) if (!Array.isArray(b)) { zh(b.ja, b.zh); for (const o of b.options || []) { zh(o.ja, o.zh); if (b.ending) zh(endText(o)[0], endText(o)[2]); } }
    }
    for (const P of Object.values(D.places || {})) zh(P.ja, P.zh);
    zh('みんな', '大家'); zh('あなた', '你');
    function endText(o) {   // the ending line on the cover: the token you took (crossovers) or the answer you gave
      return o.token ? [`${o.ja}を、手のひらに`, `${o.en} — in your hand`, `${o.zh}，在你手心`] : [`${o.ja}`, `${o.en}`, `${o.zh}`];
    }

    // ---- art: one still per view (shared/layers.js draws the live layered composite wherever a still is drawn)
    const STILL = {}; for (const [stem, v] of Object.entries(LAY.views || {})) { STILL[v.view] = stem; for (const a of v.alias || []) STILL[a] = stem; }
    const IMG = {};
    const need = (v) => new Promise((res) => { if (!v || IMG[v] || !STILL[v]) return res(); const im = new Image(); im.onload = () => { IMG[v] = im; res(); }; im.onerror = () => res(); im.src = `media/art/${STILL[v]}.jpg?v=1`; });
    const STORY_IDS = []; if (cfg.script) STORY_IDS.push(...Object.keys(LINES)); else { const add = (id) => { if (LINES[id] && !STORY_IDS.includes(id)) STORY_IDS.push(id); };
      for (const st of D.steps) for (const b of st.beats) { if (Array.isArray(b)) { if (b[0] === 'window') { add(b[2]); for (const v of Object.values(D.bridges?.[b[1]] || {})) [].concat(v).forEach(add); } else add(b[0]); } else { for (const o of b.options || []) (o.then || []).forEach(add); (b.let_go || []).forEach(add); } } }
    const storyViews = new Set(); for (const st of D.steps) for (const v of st.view || []) storyViews.add(v);
    for (const v of cfg.preload || []) storyViews.add(v);
    const artReady = Promise.all([...storyViews].map(need));
    const LIVEL = () => !!(window.MoHeatLayers && window.MoHeatLayers.live);
    const has = (v) => !!STILL[v];

    // ---- state
    const fresh = () => ({ started: false, t: 0, clock: 0, view: cfg.firstView || D.steps[0].view?.[0] || Object.keys(STILL)[0], step: null, fade: 0, fadeA: 0, dark: 0, white: 0,
      lv: 0, env: 0, pos: { az: 0, dist: 1 }, posName: 'front', who: '', end: -1, mode: 'story', place: '', cast: '', hold: 0, ev: {} });
    let S = fresh(), run_ = 0;
    const E = { get S() { return S; }, A, fx: A.fx, W, H, ctx, K: {}, src: [], pulses: [], cfg, event, sleep, IMG, has, need, place: () => placeOf(S.view) };
    // the place a view shows (story steps and t_<place>_* talk views): ambient sound and FX follow it
    const PLACE_OF = {}; for (const st of D.steps) for (const v of st.view || []) PLACE_OF[v] = st.id;
    Object.assign(PLACE_OF, cfg.placeOf || {});
    for (const [k, v] of Object.entries(PLAN.reuse || {})) PLACE_OF[v] = PLACE_OF[v] || k.split('|')[0];
    const placeOf = (v) => PLACE_OF[v] || (/^t_([a-z]+)_/.exec(v) || [])[1] || (/^end_/.test(v) ? 'dawn' : '');
    E.placeOf = placeOf;

    // ---- chapters (#steps → shared/shell.js)
    function setStep(i) { if (i > 0 && S?.started) S.restUntil = S.clock + 1.2; $('steps').innerHTML = D.steps.map((s, k) => `<li class="${k < i ? 'done' : k === i ? 'now' : ''}">${s.ja} · <small>${s.en}</small></li>`).join(''); }

    // ---- positions: the plan's voice table (az in degrees, distance factor) → HRTF place (az rad, metres)
    const POS = (name) => {
      if (cfg.pos?.[name]) return cfg.pos[name];
      const az = (VO.az?.[name] ?? 0), f = VO.distance?.[name] ?? .28;
      return { az: Math.abs(az) >= 85 ? Math.sign(az) * 1.35 : az * RAD, dist: f >= .99 ? .12 : .3 / Math.max(.05, f) };
    };
    E.POS = POS;

    // ---- subtitles + voice
    const subJa = $('subJa'), subEn = $('subEn'), subWho = $('subWho'), subs = $('subs');
    function sub(who, ja, en) { subWho.textContent = who ? NAME[who] || who : ''; subWho.className = `who w${who || ''}`; subJa.textContent = ja || ''; subEn.textContent = en || ''; subs.classList.toggle('show', !!ja); }
    let talking = 0;
    const alive = (my) => { if (my !== run_) throw new Error('stopped'); };
    async function say(id, posName = 'front') {
      const my = run_, L = LINES[id]; if (!L) { console.warn('[story] no line', id); return; }
      const [ja, en, who] = L; S.posName = posName; S.pos = POS(posName); S.who = who;
      sub(who, ja, en); talking++;
      await A.say(id, S.pos, S.pos.dist < .2 ? 1.8 : 1.45);
      talking--; alive(my);
      await sleep(.3); sub('', '', '');
    }
    async function sayLive(it) {   // a line written by the live AI (private page): voiced by the server, same placement / thermal
      if (it.ev) { event(it.ev); return; }
      const my = run_; S.posName = it.pos; S.pos = POS(it.pos); S.who = it.who; if (S.mode === 'talk') S.view = talkView(it.who, it.pos) || S.view;
      const buf = await it.audio; alive(my);
      sub(it.who, it.ja, it.en); talking++;
      await A.play(buf, S.pos, S.pos.dist < .2 ? 1.8 : 1.45);
      talking--; alive(my);
      await sleep(.25); sub('', '', '');
    }

    // ---- your turn: choices, actions, say-it, hold (Demo19 / 43 framework; shared/voice.js judges what you say)
    const choiceEl = $('choices'), actEl = $('act');
    const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    function choice(opts, timeout = 20, auto = 0) {
      return new Promise((res) => {
        choiceEl.innerHTML = opts.map((o, i) => `<button class="ch" data-i="${i}"${o.voice ? ` data-voice="${esc(o.voice)}"` : ''}><b>${esc(o.ja)}</b><span>${esc(o.en)}</span></button>`).join('');
        choiceEl.classList.add('show');
        const done = (i) => { clearTimeout(tm); clearTimeout(au); choiceEl.classList.remove('show'); choiceEl.innerHTML = ''; res(i); };
        choiceEl.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => done(+b.dataset.i)));
        const tm = setTimeout(() => done(0), timeout * 1000), au = AUTO ? setTimeout(() => done(Math.min(auto, opts.length - 1)), 1200) : 0;
      });
    }
    function action(icon, ja, en, timeout = 20, voice = '') {
      return new Promise((res) => {
        actEl.innerHTML = `<button class="act-btn"${voice ? ` data-voice="${esc(voice)}"` : ''}>${icon ? `<i>${icon}</i>` : ''}<b>${esc(ja)}</b><span>${esc(en)}</span></button>`; actEl.classList.add('show');
        const done = () => { clearTimeout(tm); clearTimeout(au); actEl.classList.remove('show'); actEl.innerHTML = ''; res(); };
        actEl.querySelector('button').addEventListener('click', done); const tm = setTimeout(done, timeout * 1000), au = AUTO ? setTimeout(done, 900) : 0;
      });
    }
    // press and hold for `sec`; let go part-way → false (the story says the let-go line and asks again); 18 s untouched finishes it
    function stillHold(sec, allowSlip, icon = '', ja = 'じっとする（長押し）', en = 'Keep still (press and hold)', side = '') {
      return new Promise((res) => {
        actEl.classList.toggle('act-side', !!side); actEl.classList.toggle('side-r', side === 'right');
        actEl.innerHTML = `<button class="act-btn hold">${icon ? `<i>${icon}</i>` : ''}<b>${esc(ja)}</b><span>${esc(en)}</span><em class="bar"><u></u></em></button>`; actEl.classList.add('show');
        const b = actEl.querySelector('button'), bar = b.querySelector('u'); let down = false, k = 0, upFor = 0, last = performance.now(); const t0 = last;
        const set = (v) => (e) => { e?.preventDefault?.(); down = v; b.classList.toggle('down', v); };
        b.addEventListener('pointerdown', set(true)); for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, set(false));
        const key = (v) => (e) => { if (e.code === 'Space' && !e.repeat) { e.preventDefault(); e.stopPropagation(); down = v; b.classList.toggle('down', v); } };
        const kd = key(true), ku = key(false); addEventListener('keydown', kd, true); addEventListener('keyup', ku, true);
        const end = (ok) => { removeEventListener('keydown', kd, true); removeEventListener('keyup', ku, true); actEl.classList.remove('show', 'act-side', 'side-r'); actEl.innerHTML = ''; S.hold = 0; res(ok); };
        const my = run_;
        const tick = () => {
          if (my !== run_) return end(false);
          const n = performance.now(), dt = Math.min(.5, (n - last) / 1000); last = n;
          const holding = down || PURE() || (AUTO && !(ALT && allowSlip && k > .35)) || (k === 0 && n - t0 > 18000);
          if (holding) { k = Math.min(1, k + dt / sec); upFor = 0; } else if (k > .08) upFor += dt;
          bar.style.width = `${k * 100}%`; S.hold = holding ? 1 : 0;
          if (allowSlip && upFor > .5) return end(false);
          if (!allowSlip && !holding && n - t0 > 18000) k = Math.min(1, k + dt / sec);
          if (k >= 1) return end(true);
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }

    // ---- free talk (shared/talk.js): a short window, then the story goes on
    const BR = window.MoHeatTalk ? window.MoHeatTalk.bridges(D.bridges || {}) : { pick: () => null, reset() {} };
    async function listenTurn(opt) { if (PURE()) { await sleep(2.2); return null; } return window.MoHeatTalk ? window.MoHeatTalk.listen(opt) : (await sleep(1), null); }
    async function talkWindow(who, posName, yn) {
      const my = run_, p = PROMPT(who);
      const said = await listenTurn({ host: stage, prompt: [p[0], p[1]], silenceSec: 10 }); alive(my);
      if (said) { sub('あなた', said, said); await sleep(.9); }
      if (LIVE) { for (const it of await LIVE.turn({ mode: 'window', who, place: S.step?.id || S.view, said, kind: said ? 'user' : 'silent' })) await sayLive(it); return; }
      const id = BR.pick(who, window.MoHeatTalk.topic(said, D.topics || [], { yn, yn_only: D.yn_only }));
      if (id) { lineView(who, posName); await say(id, posName); }
    }

    // ---- thermal plan: ambient 'set' sources stay, 'pulse' rises / holds / fades, 'sweep' moves, 'then' sets later
    let amb = {}, pulses = [], pend = [];
    function applySet(set) { for (const [nm_, [kind, az, lev]] of Object.entries(set || {})) { if (lev <= 0) delete amb[nm_]; else amb[nm_] = [kind, az, lev]; } }
    function event(name) {
      if (name[0] !== '@') name = '@' + name;
      const e = EV[name]; S.ev[name] = S.t;
      if (cfg.eventView?.[name] && has(cfg.eventView[name])) S.view = cfg.eventView[name];
      try { cfg.sfx?.[name]?.(A.fx, E); cfg.onEvent?.(name, E); } catch (err) { console.error(err); }
      if (!e) return;
      applySet(e.set);
      if (e.pulse) { const [kind, az, lev, rise, hold, fade] = e.pulse; pulses.push({ name, type: 'pulse', t0: S.t, kind, az, lev, rise, hold, fade }); }
      for (const [kind, az, lev, rise, hold, fade, delay = 0] of e.pulses || []) pulses.push({ name, type: 'pulse', t0: S.t + delay, kind, az, lev, rise, hold, fade });   // several strokes in one event (a fan, a wing)
      if (e.sweep) { const [kind, a0, a1, secs, lev] = e.sweep; pulses.push({ name, type: 'sweep', t0: S.t, kind, a0, a1, secs, lev }); }
      if (e.then) pend.push([S.t + e.then.after, e.then.set]);
    }
    const resetThermal = () => { amb = {}; pulses = []; pend = []; };

    // ---- the picture for a line: the step's base view, its close view for a line at an ear (cfg.lineView decides when given)
    function lineView(who, posName) {
      if (S.mode === 'talk') { S.view = talkView(who, posName) || S.view; return; }
      const st = S.step; if (!st) return;
      const v = cfg.lineView ? cfg.lineView(st, who, posName, S, E) : (() => { const vs = st.view || []; return (/_ear$/.test(posName) && vs[1]) || vs[0]; })();
      if (v && has(v)) S.view = v;
    }

    // ---- the story
    async function playLines(ids, posName) { for (const id of ids || []) { lineView(LINES[id]?.[2], posName); await say(id, posName); } }
    async function beat(b, st, my) {
      if (Array.isArray(b)) {
        if (b[0] === 'window') { lineView(b[1], st.pos || 'near'); await say(b[2], st.pos || 'near'); await talkWindow(b[1], st.pos || 'near', true); return; }
        if (b[0][0] === '@') { event(b[0]); await sleep(EV[b[0]]?.secs ?? .6); alive(my); return; }
        lineView(LINES[b[0]]?.[2], b[1]); await say(b[0], b[1]); return;
      }
      if (b.type === 'choice') {
        const pick = b.ending ? (QS.has('end') ? +QS.get('end') : ALT ? 0 : AUTO ? b.options.length - 1 : 0) : ALT ? b.options.length - 1 : 0;
        const i = await choice(b.options.map((o) => ({ ja: o.ja, en: o.en, voice: o.voice })), b.ending ? 25 : 20, pick); alive(my);
        const o = b.options[i];
        if (b.ending) { S.end = i; if (o.who) { const v = cfg.endView ? cfg.endView(o, S) : `end_${o.who}`; if (has(v)) S.view = v; A.fx.rustle(POS(o.ear || 'near').az, .3); await sleep(.4); } }
        cfg.onChoice?.(st, b, i, E);
        for (const id of o.then || []) { if (!(b.ending && o.who)) lineView(LINES[id]?.[2], o.ear || o.pos || st.pos || 'front'); await say(id, o.ear || o.pos || st.pos || 'front'); }
        return;
      }
      if (b.type === 'action' || b.type === 'say') {
        await action(b.icon || cfg.actionIcon?.(st, b) || '', b.ja, b.en, 20, b.voice || ''); alive(my);
        cfg.onAction?.(st, b, E); return;
      }
      if (b.type === 'hold') {
        const label = [b.icon || cfg.holdIcon?.(st, b) || '', b.ja, b.en, cfg.holdSide?.(st, b) || ''];
        if (b.event) event(b.event);
        let ok = await stillHold(b.secs || 4, !!(b.let_go && b.let_go.length), ...label); alive(my);
        if (!ok) {
          for (const id of b.let_go) { lineView(LINES[id]?.[2], st.pos || 'near'); await say(id, st.pos || 'near'); }
          if (b.event) event(b.event);
          ok = await stillHold(b.secs || 4, false, ...label); alive(my);
        }
        cfg.onHold?.(st, b, E); return;
      }
    }
    async function story() {
      const my = ++run_;
      try {
        if (cfg.script) {   // a game: its own flow instead of the steps (cfg.script(E, my): uses E.say / choice / action / hold / setStep / amb / pulse …)
          await cfg.script(E, my); alive(my);
          await sleep(.6); alive(my);
          try { sessionStorage.setItem(`moheat.${cfg.ns}.cleared`, '1'); } catch {}
          return finish();
        }
        for (let i = 0; i < D.steps.length; i++) {
          const st = D.steps[i]; S.step = st; setStep(i);
          S.fade = 0;
          if (st.view?.[0] && has(st.view[0])) S.view = st.view[0];
          beds(st.id);
          if (PLAN.step_start?.[st.id]) event(PLAN.step_start[st.id]);
          await cfg.onStep?.(st, i, E); alive(my);
          await sleep(.6); alive(my);
          for (const b of st.beats) await beat(b, st, my);
          if (i < D.steps.length - 1) { S.fade = 1; await sleep(1.4); alive(my); }
        }
        await sleep(1.2); alive(my);
        await (cfg.outro ? cfg.outro(E) : (async () => { S.white = 1; A.fx.wake(); await sleep(2.4); A.fx.chime(); await sleep(1.6); })()); alive(my);
        try { sessionStorage.setItem(`moheat.${cfg.ns}.cleared`, '1'); } catch {}
        if (PURE() && !LIVE && D.places && cfg.sample !== false) { S.white = 0; return keepTalking(cfg.samplePlace?.(S.end, D) || Object.keys(D.places).pop(), multiCast(Object.keys(D.places).pop()), true); }
        finish();
      } catch (e) { if (e.message !== 'stopped') console.error(e); }
    }

    // ---- もっと話す · keep talking: place × cast (Demo43 / Demo23), scripted here; the private live page sends the same choices to the AI
    const multiCast = (place) => Object.keys(D.places?.[place]?.cast || {}).find((c) => c.length > 1) || Object.keys(D.places?.[place]?.cast || {})[0];
    function talkView(who, posName) {
      const ear = /_ear$/.test(posName || ''), pl = S.place, R = PLAN.reuse || {}, multi = S.cast.length > 1;
      const cands = ear ? [R[`${pl}|${who}e`], `t_${pl}_${who}e`] : [];
      if (multi) cands.push(R[`${pl}|3`], `t_${pl}_3`);
      cands.push(R[`${pl}|${who}`], `t_${pl}_${who}`);
      if (multi) cands.push(R[`${pl}|3`]);
      return cands.find((v) => v && has(v)) || null;
    }
    async function playBeat(bt, my) {
      for (const it of bt) {
        if (it[0][0] === '@') { event(it[0]); continue; }
        const [id, pos] = it; lineView(LINES[id]?.[2], pos); await say(id, pos); alive(my);
      }
    }
    async function keepTalking(place, cast, sample = false) {
      const my = ++run_; S.mode = 'talk'; S.place = place;
      const P = D.places[place]; if (!P.cast[cast]) cast = Object.keys(P.cast).find((c) => c.length === 1 && cast.includes(c)) || multiCast(place);
      S.cast = cast;
      const views = new Set(); for (const w of cast) for (const pos of ['front', 'left_ear']) { const v = talkView(w, pos); if (v) views.add(v); }
      const topics = [D.topics[0], P.topic, ...D.topics.slice(1)];
      const BRP = window.MoHeatTalk.bridges(Object.fromEntries(Object.keys(NAME).map((c) => [c, { ...(D.bridges?.[c] || {}), ...(P.bridges?.[c] || {}) }])));
      const pick = (who, said, yn) => BRP.pick(who, window.MoHeatTalk.topic(said, topics, { yn, yn_only: D.yn_only }));
      try {
        await Promise.all([...views].map(need)); alive(my);
        resetThermal(); for (const e of PLAN.places?.[place] || []) event(e);
        beds(place); S.view = talkView(cast[0], 'front') || S.view; S.white = 0; await sleep(1); alive(my);
        if (LIVE) {
          let kind = 'open', said = null;
          for (let turn = 0; turn < 6; turn++) {
            const lines = await LIVE.turn({ mode: 'talk', who: cast, place, said, kind: turn === 5 ? 'close' : kind });
            for (const it of lines) await sayLive(it);
            if (turn === 5 || LIVE.ended()) break;
            said = await listenTurn({ host: stage, silenceSec: 12 }); alive(my); kind = said ? 'user' : 'silent';
            if (said) { sub('あなた', said, said); await sleep(.6); }
          }
        } else {
          let bs = P.cast[cast];
          if (sample) bs = [bs[0], bs[1], bs[bs.length - 1]];
          for (let i = 0; i < bs.length; i++) {
            await playBeat(bs[i], my);
            if (i === bs.length - 1) break;
            const said = await listenTurn({ host: stage, silenceSec: 10 }); alive(my);
            if (said) { sub('あなた', said, said); await sleep(.8); }
            const first = bs[i + 1].find((x) => x[0][0] !== '@'), nx = LINES[first[0]][2], id = pick(nx, said, false);
            if (id) { lineView(nx, first[1]); await say(id, first[1]); }
          }
        }
        await sleep(1.2); S.fade = 1; await sleep(2); alive(my); finish(!sample);
      } catch (e) { if (e.message !== 'stopped') console.error(e); }
    }

    // ---- sound beds (per step / place: cfg.beds) + loops that follow a thermal source (cfg.loops: source name → sound)
    function beds(key) {
      const want = cfg.beds?.[key] || [];
      const names = new Set(want.map((b) => b[0]));
      for (const [n, L] of Object.entries(A.loops)) if (n.startsWith('bed:') && !names.has(n.slice(4))) L.set(0, .8);
      for (const [n, kind, az = 0, dist = 2, gain = .3] of want) { const L = A.loop('bed:' + n, kind, az, dist); L?.at(az, dist, .5); L?.set(gain, 1); }
    }

    // ---- per frame: ease each source (FX / loops), the thermal sum, the talking envelope
    const K = E.K;
    Object.assign(E, { say, choice, action, hold: stillHold, setStep, alive, sub, lineView, listen: listenTurn, zh, AUTO, ALT, pure: PURE, my: () => run_,
      amb: (name, kind, az, lev) => applySet({ [name]: [kind, az, lev] }),
      pulse: (name, kind, az, lev, rise = .1, hold = .4, fade = .5) => pulses.push({ name, type: 'pulse', t0: S.t, kind, az, lev, rise, hold, fade }),
      sweep: (name, kind, a0, a1, secs, lev) => pulses.push({ name, type: 'sweep', t0: S.t, kind, a0, a1, secs, lev }) });
    function update(dt) {
      S.t += dt; if (!S.started) return;
      S.clock += dt; S.lv = A.voiceLevel(); S.vlv = (S.vlv || 0) + (S.lv - (S.vlv || 0)) * (1 - Math.exp(-dt / (S.lv > (S.vlv || 0) ? .05 : .8)));   // voice warmth = the speech envelope, not each syllable (no sub-second hot ↔ cold flicker, guide §3 节奏)
      { const vt = talking ? 1 : 0; S.env += (vt - S.env) * (1 - Math.exp(-dt / (vt > S.env ? .06 : .3))); }
      for (const [at, set] of pend.filter((p) => p[0] <= S.t)) { applySet(set); pend = pend.filter((p) => p[0] !== at || p[1] !== set); }
      const live = {}; for (const [n, [, , lev]] of Object.entries(amb)) live[n] = lev;
      const cur = [];
      for (const p of pulses) {
        const dtp = S.t - p.t0;
        if (p.type === 'pulse') { if (dtp >= 0 && dtp < p.rise + p.hold + p.fade) { const f = dtp < p.rise ? dtp / p.rise : dtp < p.rise + p.hold ? 1 : 1 - (dtp - p.rise - p.hold) / p.fade; cur.push({ name: p.name, kind: p.kind, az: p.az, lev: p.lev * f }); } }
        else if (dtp >= 0 && dtp <= p.secs) cur.push({ name: p.name, kind: p.kind, az: p.a0 + (p.a1 - p.a0) * dtp / p.secs, lev: p.lev * Math.min(1, dtp / .3, (p.secs - dtp) / .3 + .0001), k: dtp / p.secs });
      }
      pulses = pulses.filter((p) => S.t - p.t0 < (p.type === 'pulse' ? p.rise + p.hold + p.fade : p.secs) + .1);
      E.pulses = cur;
      for (const n of new Set([...Object.keys(K), ...Object.keys(live)])) { const tg = live[n] || 0, c = K[n] || 0; K[n] = c + (tg - c) * (1 - Math.exp(-dt / (tg > c ? .35 : .6))); }
      for (const p of cur) K[p.name] = Math.max(K[p.name] || 0, p.lev);
      for (const [n, spec] of Object.entries(cfg.loops || {})) {   // a sound that follows its thermal source
        const lev = K[n] || 0, L = lev > .01 || A.loops[n] ? A.loop(n, spec.kind, (spec.az ?? amb[n]?.[1] ?? 0) * (spec.az != null ? 1 : RAD), spec.dist ?? 1.5) : null;
        L?.set(clamp(lev * (spec.gain ?? 1)), .3);
      }
      cfg.update?.(dt, E);
    }
    // Thermal, two layers (firmware DUAL: cool and heat independent on each ear).
    //  · VOICE: warm. (0.1 + 0.8 × loudness) × the plan's distance factor at the speaker's position, × front_split in front / near.
    //  · AMBIENT: the plan's sources (set / pulse / sweep) — every one a real thing next to your ears, visible on screen.
    function sources() {
      const out = [], add = (azDeg, k, s, icon) => { if (s > .01) out.push({ az: azDeg * RAD, k, s, icon }); };
      if (!S.started) return out;
      const pn = S.posName;
      if (talking) add(VO.az?.[pn] ?? 0, cfg.voiceKind?.(S.who) === 'cool' ? 'c' : 'h', (.1 + .8 * clamp(S.vlv * 8)) * (VO.distance?.[pn] ?? .28) * (pn === 'front' || pn === 'near' ? (VO.front_split ?? .5) : 1), '');
      for (const [n, [kind, az, lev]] of Object.entries(amb)) add(az, kind === 'warm' ? 'h' : 'c', lev, cfg.icons?.[n] || '');
      for (const p of E.pulses) add(p.az, p.kind === 'warm' ? 'h' : 'c', p.lev, cfg.icons?.[p.name] || '');
      cfg.sources?.((az, kind, s, icon = '') => add(az, kind === 'warm' || kind === 'h' ? 'h' : 'c', s, icon), E);
      return out;
    }
    const ear = { Lc: 0, Lh: 0, Rc: 0, Rh: 0 };
    function thermal(dt) {
      const sum = { L: { h: 0, c: 0 }, R: { h: 0, c: 0 } }, src = sources(); E.src = src;
      for (const s of src) { const sn = Math.sin(s.az), wL = clamp(1 - 1.2 * Math.max(0, sn)), wR = clamp(1 - 1.2 * Math.max(0, -sn)); sum.L[s.k] += s.s * wL; sum.R[s.k] += s.s * wR; }
      const rest = S.clock < (S.restUntil || 0);   // a short rest at each chapter change (guide §3 节奏): every channel off for a moment, so the next scene is felt on its own
      for (const e of ['L', 'R']) for (const k of ['c', 'h']) {
        const target = rest ? 0 : k === 'h' ? Math.min(.9, sum[e].h) : Math.min(1, sum[e].c), cur = ear[e + k];
        const tau = rest ? .15 : target > cur ? (k === 'h' ? SM.warm_rise : SM.cool_rise) : (k === 'h' ? SM.warm_fall : SM.cool_fall);
        ear[e + k] = cur + (target - cur) * (1 - Math.exp(-dt / tau));
      }
      return { th: { ...ear }, src };
    }

    // ---- drawing: stills (layered) with cross-fades, the demo's FX (cfg.draw), particles, fades
    let viewA = S.view, viewB = S.view, mix = 1;
    function drawView(view, alpha) {
      const im = IMG[view]; ctx.globalAlpha = alpha;
      if (!im) { if (view && STILL[view]) need(view); ctx.fillStyle = cfg.bg || '#0d1018'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; return; }
      if (LIVEL()) ctx.drawImage(im, 0, 0, W, H);
      else { const z = 1.02 + .006 * Math.sin(S.t * 1.1); ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.drawImage(im, -W / 2, -H / 2, W, H); ctx.restore(); }
      ctx.globalAlpha = 1;
    }
    // particles (DEMO_DESIGN_GUIDE §6.4): puffs (steam / smoke / mist / frost) rise or sink, slow and spread; sparks rise and fade
    const puffs = [];
    E.puff = (p) => puffs.push({ vx: 0, vy: -60, r: 30, grow: 20, life: 0, max: 3, rgb: '255,248,240', a: .22, drag: .5, ...p });
    E.steam = (dt, x, y, rate, spread = 60, o = {}) => { if (Math.random() < rate * dt) E.puff({ x: x + (Math.random() - .5) * spread, y, vx: (Math.random() - .5) * 8, vy: -70 - Math.random() * 30, r: 24 + Math.random() * 18, max: 2.6 + Math.random() * 1.4, ...o }); };
    E.spark = (x, y, o = {}) => E.puff({ x, y, vx: rnd(-30, 30), vy: rnd(-160, -80), r: rnd(2, 4), grow: 0, max: rnd(.8, 1.6), rgb: '255,170,80', a: .9, spark: true, drag: .3, ...o });
    E.glow = (x, y, r, rgb, a) => { if (a <= .005) return; const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); };
    E.edge = (side, rgb, a, wFrac = .4) => { if (a <= .005) return; const x0 = side === 'left' ? 0 : W * (1 - wFrac), g = side === 'left' ? ctx.createLinearGradient(0, 0, W * wFrac, 0) : ctx.createLinearGradient(W, 0, W * (1 - wFrac), 0); g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`); ctx.fillStyle = g; ctx.fillRect(x0, 0, W * wFrac, H); };
    E.toFrame = (stem, x, y, layer) => (window.MoHeatLayers?.toFrame ? window.MoHeatLayers.toFrame(stem, x, y, layer) : [x, y]);
    function drawPuffs(dt) {
      ctx.save();
      for (let i = puffs.length - 1; i >= 0; i--) {
        const p = puffs[i]; p.life += dt; if (p.life > p.max) { puffs.splice(i, 1); continue; }
        p.vy *= Math.exp(-dt * p.drag); p.vx *= Math.exp(-dt * p.drag * .5); if (p.g) p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.grow * dt;
        const k = p.life / p.max, a = p.a * (p.spark ? 1 - k : Math.sin(Math.PI * Math.min(1, k * 1.2)));
        if (p.spark) { ctx.fillStyle = `rgba(${p.rgb},${a})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); continue; }
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r); g.addColorStop(0, `rgba(${p.rgb},${a})`); g.addColorStop(1, `rgba(${p.rgb},0)`);
        ctx.fillStyle = g; ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
      }
      ctx.restore();
    }
    // falling things (snow, petals, rain, ice dust): E.fall(dt, amount, { wind, rgb, size, speed, streak })
    const flakes = Array.from({ length: 240 }, () => ({ x: Math.random() * W, y: Math.random() * H, z: .3 + Math.random() * .7, ph: Math.random() * 6 }));
    E.fall = (dt, amount, o = {}) => {
      if (amount < .02) return; const { wind = 0, rgb = '255,255,255', size = 1, speed = 1, streak = 0 } = o;
      ctx.save(); ctx.strokeStyle = ctx.fillStyle = `rgb(${rgb})`; ctx.lineWidth = 1.5;
      for (const f of flakes) {
        f.y += (60 + 120 * f.z) * speed * dt; f.x += (wind * 520 * f.z + 18 * Math.sin(S.t * 1.3 + f.ph)) * dt;
        if (f.y > H + 10) { f.y = -10; f.x = Math.random() * W; } if (f.x > W + 20) f.x = -20; if (f.x < -20) f.x = W + 20;
        ctx.globalAlpha = amount * (.35 + .55 * f.z);
        if (streak) { ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x - wind * 30 * f.z, f.y - streak * f.z); ctx.stroke(); }
        else { ctx.beginPath(); ctx.arc(f.x, f.y, (1.2 + 3.2 * f.z) * size, 0, 7); ctx.fill(); }
      }
      ctx.restore();
    };
    function draw(dt) {
      if (S.view !== viewB) { viewA = viewB; viewB = S.view; mix = 0; }
      mix = Math.min(1, mix + dt / .6);
      if (mix < 1) drawView(viewA, 1);
      drawView(viewB, mix < 1 ? mix : 1);
      try { cfg.draw?.(E, dt); } catch (e) { console.error(e); }
      drawPuffs(dt);
      try { cfg.drawTop?.(E, dt); } catch (e) { console.error(e); }
      S.whiteA = (S.whiteA || 0) + ((S.white ? 1 : 0) - (S.whiteA || 0)) * Math.min(1, dt * 1.6);
      if (S.whiteA > .01) { ctx.fillStyle = `rgba(${cfg.whiteRGB || '236,240,248'},${.92 * S.whiteA})`; ctx.fillRect(0, 0, W, H); }
      S.darkA = (S.darkA || 0) + ((S.dark ? 1 : 0) - (S.darkA || 0)) * Math.min(1, dt * 2);
      if (S.darkA > .01) { ctx.fillStyle = `rgba(8,8,14,${.94 * S.darkA})`; ctx.fillRect(0, 0, W, H); }
      S.fadeA = S.fade ? Math.min(1, (S.fadeA || 0) + dt / 1.2) : Math.max(0, (S.fadeA || 0) - dt / .8);
      if (S.fadeA > .01) { ctx.fillStyle = `rgba(10,12,20,${S.fadeA})`; ctx.fillRect(0, 0, W, H); }
    }

    // ---- side panel + device (same protocol as every demo)
    const rc = $('radar').getContext('2d');
    function radar(src, th) {
      const cx = 240, cy = 220, R = 160; rc.clearRect(0, 0, 480, 420);
      rc.strokeStyle = 'rgba(255,255,255,.08)'; rc.lineWidth = 1.5; for (const r of [R * .5, R]) { rc.beginPath(); rc.arc(cx, cy, r, 0, 7); rc.stroke(); }
      rc.fillStyle = '#8f9ab8'; rc.font = '600 13px Inter'; rc.textAlign = 'center'; rc.fillText('front', cx, cy - R - 10); rc.fillText('L', cx - R - 18, cy + 5); rc.fillText('R', cx + R + 18, cy + 5);
      for (const [e, sx] of [['L', -1], ['R', 1]]) {
        rc.fillStyle = '#28304a'; rc.beginPath(); rc.ellipse(cx + sx * 46, cy, 12, 24, 0, 0, 7); rc.fill();
        for (const [k, col, dy] of [['h', '255,122,69', -12], ['c', '79,179,255', 12]]) if (th[e + k] > .02) { rc.fillStyle = `rgba(${col},${.25 + .75 * th[e + k]})`; rc.beginPath(); rc.ellipse(cx + sx * 46, cy + dy, 11, 12, 0, 0, 7); rc.fill(); }
      }
      rc.fillStyle = '#323d5c'; rc.beginPath(); rc.arc(cx, cy, 40, 0, 7); rc.fill();
      rc.font = '26px sans-serif'; rc.textBaseline = 'middle';
      for (const s of src) { const x = cx + Math.sin(s.az) * R, y = cy - Math.cos(s.az) * R; rc.globalAlpha = clamp(.35 + s.s); rc.fillStyle = s.k === 'h' ? 'rgba(255,122,69,.25)' : 'rgba(79,179,255,.25)'; rc.beginPath(); rc.arc(x, y, 18 + 18 * s.s, 0, 7); rc.fill(); rc.fillText(s.icon, x, y + 1); rc.globalAlpha = 1; }
      rc.textBaseline = 'alphabetic';
    }
    const DEFAULT_RANGE = { heatMin: 0, heatMax: 200, coolMin: 35, coolMax: 80 }, SEND_INTERVAL = 100, OFF = .03;
    const store = { get: (k, d) => { try { return JSON.parse(localStorage.getItem(`moheat.${k}`)) ?? d; } catch { return d; } }, set: (k, v) => { try { localStorage.setItem(`moheat.${k}`, JSON.stringify(v)); } catch {} } };
    const range = { ...DEFAULT_RANGE, ...store.get('range', {}) };
    let lastSent = '', lastSendAt = 0, tripped = false, intensity = +store.get('asmr.intensity', 100) / 100;
    const device = window.MoHeatDevice.create({ select: $('portSelect'), addBtn: $('addPort'), connectBtn: $('connectBtn'), status: $('deviceStatus') }, { log: (l) => console.log('[MoHeat]', l), onConnect: () => { lastSent = ''; } });
    if (!window.MoHeatDevice.supported) $('deviceStatus').querySelector('span').textContent = 'Web Serial needs desktop Chrome / Edge';
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
      if (AUTO && cmd !== cmdLog[cmdLog.length - 1]?.[1]) cmdLog.push([+S.clock.toFixed(2), cmd]);
      if (!device.isConnected() || !$('sendOn').checked) return;
      const n = performance.now(); if (cmd !== lastSent && n - lastSendAt >= SEND_INTERVAL) { device.send(cmd); lastSent = cmd; lastSendAt = n; }
    }
    const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    const where = () => { if (!S.started) return ''; const P = D.places?.[S.place]; if (S.mode === 'talk' && P) return P.en; const st = S.step; return (cfg.where?.(S) || (st ? st.en : '')) + (/_ear$/.test(S.posName) && talking ? ` · at your ${S.posName.startsWith('left') ? 'left' : 'right'} ear` : ''); };

    // ---- loop / start / end
    let last = performance.now(), hidden = false;
    function loop() {
      const n = performance.now(), dt = clamp((n - last) / 1000, 0, .25); last = n;
      if (!hidden) {
        update(dt);
        if (S.started || S.fadeA > .01) draw(dt);
        const { th, src } = thermal(dt); output(th, S.started); radar(S.started ? src : [], th);
        $('clock').textContent = fmt(S.clock);
        $('posInfo').textContent = where();
      }
      requestAnimationFrame(loop);
    }
    document.addEventListener('visibilitychange', () => { hidden = document.hidden; if (hidden) { stopOutput(); A.ctx()?.suspend(); } else { last = performance.now(); A.ctx()?.resume(); } });
    document.addEventListener('keydown', (e) => { if (e.code === 'Escape') emergencyStop(); });
    function finish(talk = false) {   // back to this demo's own cover (user: never an "ended / next demo" card)
      const end = S.end;
      S.started = false; S.fade = 0; S.fadeA = 0; run_++; stopOutput(); A.stopAll(); LIVE?.end(); resetThermal();
      for (const k in ear) ear[k] = 0; $('cmd').textContent = 'stop'; if (AUTO) cmdLog.push([+S.clock.toFixed(2), 'stop']);
      sub('', '', ''); actEl.classList.remove('show'); choiceEl.classList.remove('show'); document.querySelectorAll('.mh-turn').forEach((e) => e.remove());
      const endB = D.steps.flatMap((s) => s.beats).find((b) => b && b.ending), c = $('cleared');
      const note = cfg.endText?.(S); c.hidden = talk || (!note && (!endB || end < 0)); if (!c.hidden) { if (note) c.textContent = note; else { const t = endText(endB.options[end]); c.textContent = `${t[0]} · ${t[1]}`; } }
      $('startBtn').textContent = '↺ もう一度 · Play again'; $('intro').classList.remove('hidden');
      talkUI(); API.done = true; cfg.onFinish?.(E);
    }
    function begin(mode) {
      A.init(); A.loadVoices(mode === 'talk' ? Object.keys(LINES) : STORY_IDS);
      S = fresh(); S.started = true; S.mode = mode; S.fadeA = 1; viewA = viewB = S.view; mix = 1; puffs.length = 0; resetThermal(); for (const k in K) K[k] = 0;
      BR.reset(); $('cleared').hidden = true;
      $('intro').classList.add('hidden'); API.done = false; cfg.onBegin?.(E);
    }
    async function start() { if (LIVE && !(await LIVE.begin())) return; begin('story'); story(); }
    async function startTalk(cast, place = talkPlace) { if (LIVE && !(await LIVE.begin({ place, cast }))) return; begin('talk'); keepTalking(place, cast); }
    // もっと話す: after the story (or always on the private live page) — where (a place from the story) × who; buttons driven by cover.json options
    let talkPlace = QS.get('place') || Object.keys(D.places || {})[0] || '';
    const box = $('talkPick');
    if (box && D.places) {
      const casts = [...new Set(Object.values(D.places).flatMap((P) => Object.keys(P.cast)))].sort((a, b) => a.length - b.length);
      box.innerHTML = `<small>もっと話す · Keep talking</small><span class="tp-row" role="group" aria-label="Place">${Object.entries(D.places).map(([k, P]) => `<button class="tpl" type="button" data-place="${k}" aria-pressed="false">${esc(P.ja)} · ${esc(P.en)}</button>`).join('')}</span>`
        + `<span class="tp-row" role="group" aria-label="Who">${casts.map((c) => `<button class="tp" type="button" data-who="${c}">${c.length > 1 ? 'みんな · Everyone' : `${esc(NAME[c])} · ${esc(nm(c, 'en'))}`}</button>`).join('')}</span>`;
    }
    const paintPlaces = () => document.querySelectorAll('#talkPick .tpl').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.place === talkPlace)));
    document.querySelectorAll('#talkPick .tpl').forEach((b) => b.addEventListener('click', () => { talkPlace = b.dataset.place; paintPlaces(); }));
    paintPlaces();
    function talkUI() {
      if (!box) return; let cleared = false; try { cleared = sessionStorage.getItem(`moheat.${cfg.ns}.cleared`) === '1'; } catch {}
      box.hidden = !(cleared || LIVE || QS.has('talk'));
    }
    $('startBtn').addEventListener('click', start);
    document.querySelectorAll('#talkPick .tp').forEach((b) => b.addEventListener('click', () => startTalk(b.dataset.who)));
    $('lrBtn')?.addEventListener('click', () => { A.lrCheck(); const b = $('lrBtn'), t = b.textContent; b.textContent = 'Left…'; setTimeout(() => { b.textContent = '…Right'; }, 900); setTimeout(() => { b.textContent = t; }, 1900); });
    $('soundBtn')?.addEventListener('click', (e) => { A.setMuted(!A.isMuted()); e.target.textContent = A.isMuted() ? '🔇' : '🔊'; });
    // tests: show(view, ...events) stops the story and holds one picture with its events running (tools: scratch shots / sheets)
    const show = (v, ...evs) => { run_++; if (!S.started) begin('story'); resetThermal(); S.mode = 'story'; S.view = v; S.fade = 0; S.white = 0; S.dark = 0; for (const e of evs) event(e); };
    const API = window[cfg.ns] = { get S() { return S; }, E, thermal: () => thermal(.05), both: () => both, log: cmdLog, done: false, start, startTalk, event, show, finish };
    setStep(0); talkUI();
    if (QS.has('cover')) { document.body.classList.add('cover-only'); return API; }
    if (QS.has('autoplay') || AUTO) {
      const go = () => (QS.has('talk') ? startTalk(QS.get('talk') || multiCast(talkPlace)) : start());
      const ac = A.init(); if (ac.state === 'running') go(); else ac.resume().then(() => { if (ac.state === 'running' && !S.started) go(); }).catch(() => {});
    }
    artReady.then(() => {});
    requestAnimationFrame(loop);
    return API;
  }

  window.MoHeatStory = { run, audio: A };
})();
