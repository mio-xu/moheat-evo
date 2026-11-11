// shared/engine/app.js — MoHeatEngine.create(cfg): one own-engine demo = its content + this. Wires panel.js, thermal.js, stage.js
// and play.js, and runs what every copied main.js ran: the frame loop (update → draw → thermal → output → radar → clock / place),
// start / finish (end on the demo's own cover, "Play again"), the run token, chapters (#steps → shell.js), tab hidden = device stop
// + audio suspended, Esc = STOP, the L/R check and mute buttons, ?auto / ?autoplay start, ?cover.
//
//   let S = fresh();
//   const E = MoHeatEngine.create({
//     ns: 'NAGISA', sound: window.HTAudio, lines: window.NAGISA_LINES,
//     state: () => S, reset() { S = fresh(); /* the demo's own smoothed values */ },     // reset() runs on Start
//     steps: [[view, ja, en], …], place: { view: 'where you are' }, restSec: 1.2,       // #steps chapters (+ all-off rest at each new one), #posInfo text
//     views: ['arrive', …], src: (v) => `media/art/x_${v}.jpg?v=1`, blank: '#0d1630', clips: [],   // stage.js
//     radar: { text, ear, head },  thermal: { modeGuard, cap, tau, spread },  sayGain(where),  autoPick(opts),  zoomExtra(view),
//     sources() {…}, update(dt) {…}, draw(t, dt) { E.stage.draw(t, dt); /* overlays */ },
//     story: async (my) => { …; E.finish(); }, onFinish() {}, endText: (S) => 'cover line',
//     api: { … extra test hooks on window[ns] } });
//   …   E.boot();   // last line of main.js: buttons, window[ns], ?cover / ?auto / ?autoplay, the frame loop
//
// Per frame before cfg.update: S.t += dt; while started: S.clock, S.lv (voice level), S.vlv (speech envelope, guide §3 节奏 — no
// sub-second hot ↔ cold flicker), S.env (talking envelope for shared/layers.js mouths). cfg.voiceEnv: false / cfg.talkEnv: false = off.
(() => {
  const ME = window.MoHeatEngine = window.MoHeatEngine || {};
  if (ME.create) return;
  ME.create = (cfg) => {
    const $ = ME.$, QS = ME.QS, AUTO = ME.AUTO, clamp = ME.clamp, fmt = ME.fmt;
    const SND = cfg.sound, LINES = cfg.lines, St = cfg.state, NS = cfg.ns;
    const cv = $('scene'), ctx = cv.getContext('2d');
    let run = 0;
    const E = { get S() { return St(); }, get run() { return run; }, W: 1920, H: 1080, ctx, sound: SND, sleep: ME.sleep, clamp };
    E.stage = ME.stage({ ctx, state: St, run: () => run, draw: (t, dt) => draw(t, dt), views: cfg.views, src: cfg.src, blank: cfg.blank, clips: cfg.clips, fade: cfg.fade, zoomExtra: cfg.zoomExtra });
    E.panel = ME.panel({ clock: () => St().clock, colors: cfg.radar, range: cfg.range, log: cfg.log });
    E.thermal = ME.thermal({ sources: () => cfg.sources(), rest: () => St().clock < (St().restUntil || 0), off: E.panel.OFF, ...(cfg.thermal || {}) });
    const P = ME.play({ lines: LINES, sound: SND, state: St, run: () => run, sayGain: cfg.sayGain, autoPick: cfg.autoPick, subGap: cfg.subGap, autoAfter: cfg.autoAfter, actionAutoAfter: cfg.actionAutoAfter });
    Object.assign(E, { sub: P.sub, say: P.say, talking: P.talking, alive: P.alive, choice: P.choice, action: P.action, hold: P.hold, stillHold: P.stillHold, go: E.stage.go });

    const STEPS = cfg.steps || [];
    function setStep(i) { const S = St(); if (i > 0 && S.started) S.restUntil = S.clock + (cfg.restSec ?? 1.2); $('steps').innerHTML = STEPS.map((s, k) => `<li class="${k < i ? 'done' : k === i ? 'now' : ''}">${s[1]} · <small>${s[2]}</small></li>`).join(''); }
    E.setStep = setStep;

    function update(dt) {
      const S = St();
      S.t += dt; if (!S.started) return;
      S.clock += dt;
      if (cfg.voiceEnv !== false) { S.lv = SND.voiceLevel(); S.vlv = (S.vlv || 0) + (S.lv - (S.vlv || 0)) * (1 - Math.exp(-dt / (S.lv > (S.vlv || 0) ? .05 : .8))); }   // voice warmth = the speech envelope, not each syllable
      if (cfg.talkEnv !== false) { const vt = P.talking() ? 1 : 0; S.env += (vt - S.env) * (1 - Math.exp(-dt / (vt > S.env ? .06 : .3))); }   // talking envelope (shared/layers.js mouth)
      cfg.update?.(dt);
    }
    function draw(t, dt) { if (cfg.draw) cfg.draw(t, dt); else E.stage.draw(t, dt); }

    let last = performance.now(), hidden = false;
    function loop() {
      const n = performance.now(), dt = clamp((n - last) / 1000, 0, .05); last = n;
      if (!hidden) {
        const S = St();
        update(dt);
        if (S.started || S.fade) draw(S.t, dt); else cfg.drawCover?.();   // UI v2: the cover is the finished image (media/cover/, tools/web/covers.py)
        const { th, src } = E.thermal(dt); E.panel.output(th, S.started); E.panel.radar(S.started ? src : [], th);
        $('clock').textContent = fmt(S.clock);
        $('posInfo').textContent = S.started ? (cfg.place || {})[S.view] ?? '' : '';
      }
      requestAnimationFrame(loop);
    }
    document.addEventListener('visibilitychange', () => { hidden = document.hidden; if (hidden) { E.panel.stopOutput(); SND.ctx()?.suspend(); } else { last = performance.now(); SND.ctx()?.resume(); } });
    document.addEventListener('keydown', (e) => { if (e.code === 'Escape') E.panel.emergencyStop(); });

    async function story() {
      const my = ++run;
      try { await cfg.story(my); } catch (e) { if (e.message !== 'stopped') console.error(e); }
    }
    function finish() {
      const S = St();
      S.started = false; run++; E.panel.stopOutput(); S.fade = 0; S.fadeA = 0;   // the end fade must not stay over the cover (the loop draws the story while S.fade is set → black cover)
      cfg.onFinish?.();
      P.sub('', ''); P.actEl.classList.remove('show'); P.choiceEl.classList.remove('show');
      const c = $('cleared'); c.hidden = false;
      c.textContent = cfg.endText ? cfg.endText(S) : '';
      $('startBtn').textContent = '↺ もう一度 · Play again'; $('intro').classList.remove('hidden');
      window[NS].done = true;
    }
    function start() {
      SND.init(); SND.loadVoices(Object.keys(LINES));
      cfg.reset();
      const S = St(); S.started = true; E.stage.reset(S.view); $('cleared').hidden = true;
      $('intro').classList.add('hidden'); window[NS].done = false;
      story();
    }
    E.finish = finish; E.start = start;

    E.boot = () => {
      $('startBtn').addEventListener('click', start);
      $('lrBtn').addEventListener('click', () => { SND.lrCheck(); const b = $('lrBtn'); b.textContent = '🎧 Left…'; setTimeout(() => { b.textContent = '🎧 …Right'; }, 900); setTimeout(() => { b.textContent = '🎧 Left / Right check'; }, 1900); });
      $('soundBtn').addEventListener('click', (e) => { SND.setMuted(!SND.isMuted()); e.target.textContent = SND.isMuted() ? '🔇' : '🔊'; });
      const api = { get S() { return St(); }, thermal: () => E.thermal(.05), both: E.panel.both, log: E.panel.log, done: false };
      window[NS] = Object.defineProperties(api, Object.getOwnPropertyDescriptors(cfg.api || {}));   // keeps getters (Demo18's crane)
      setStep(0);
      if (QS.has('cover')) { document.body.classList.add('cover-only'); E.stage.artReady.then(() => cfg.drawCover?.()); return; }
      if (QS.has('autoplay') || AUTO) { const ac = SND.init(); if (ac.state === 'running') start(); else ac.resume().then(() => { if (ac.state === 'running' && !St().started) start(); }).catch(() => {}); }
      requestAnimationFrame(loop);
    };
    return E;
  };
})();
