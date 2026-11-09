// 『ゆけむり どうぶつおんせん』 Steamy Animal Hot Spring — all-ages game (proposal B3). The hot pipe is on your LEFT, the cold mountain pipe on your RIGHT;
// feel the bath with your ears and match each guest's temperature. Engine = ../../shared/story.js (cfg.script: the game's own flow); lines.js (lines, stages),
// media/layers.js (art), project/thermal_plan.json (sources, game-driven here). Real world only: steam, cold water, rain, voices.
(() => {
  const S = window.MoHeatStory, Lines = window.ONSEN_LINES, W = 1920, H = 1080, rnd = (a, b) => a + Math.random() * (b - a), clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const G = { T: .5, TL: .5, TR: .5, two: false, hot: 0, cold: 0, hotOn: 0, coldOn: 0, rain: 0, ctl: false, target: null, targetL: null, targetR: null, voiceC: 0, steamBase: 1, autoNeed: '' };
  const stage = document.getElementById('stage');
  const val = document.createElement('div'); val.id = 'valves'; val.className = 'choices';
  val.innerHTML = [['hot', 'ひだり：あつい おゆ', 'Left: hot water', 'あつい|あつく|熱い|ひだり|hot|hotter|left|热水|热一点|左边'], ['cold', 'みぎ：つめたい みず', 'Right: cold water', 'つめたい|ぬるく|冷たい|みぎ|cold|colder|cooler|right|冷水|凉一点|右边']].map(([k, ja, en, v]) => `<button class="ch" data-k="${k}" data-voice="${v}"><b>${ja}</b><span>${en}</span></button>`).join('');
  stage.appendChild(val);
  const hold = (k, on) => { G[k + 'On'] = on ? 1 : 0; val.querySelector(`[data-k="${k}"]`).classList.toggle('on', !!on); };
  val.querySelectorAll('button').forEach((b) => { let viaPointer = false; const k = b.dataset.k;
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); viaPointer = true; hold(k, true); });
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, () => hold(k, false));
    b.addEventListener('click', () => { if (viaPointer) { viaPointer = false; return; } hold(k, true); setTimeout(() => hold(k, false), 900); });   // said aloud (voice.js clicks it): a short pour
  });
  addEventListener('keydown', (e) => { if (!G.ctl || e.repeat) return; if (e.code === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); hold('hot', true); } if (e.code === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); hold('cold', true); } }, true);
  addEventListener('keyup', (e) => { if (e.code === 'ArrowLeft') hold('hot', false); if (e.code === 'ArrowRight') hold('cold', false); }, true);
  const showCtl = (v) => { G.ctl = v; val.classList.toggle('show', v); if (!v) { hold('hot', false); hold('cold', false); } };
  let E0 = null;
  const inR = (v, r) => v >= r[0] && v <= r[1];
  const ok = () => (G.two ? inR(G.TL, G.targetL) && inR(G.TR, G.targetR) : inR(G.T, G.target));
  async function adjust(E, my, st, secsOk = 2.4, limit = 26) {   // match the guest's temperature; a reaction when it is far off; 26 s limit (never stuck)
    showCtl(true); let okT = 0, tt = 0, spoke = 0;
    while (true) {
      await E.sleep(.2); E.alive(my); tt += .2;
      if (ok()) okT += .2; else okT = 0;
      if (okT >= secsOk) break;
      if (tt > limit) break;
      if (tt - spoke > 9) { const hotOff = G.two ? G.TL < G.targetL[0] : G.T > G.target[1], line = G.two ? (G.TL < G.targetL[0] ? st.cold_line : null) : (hotOff ? st.hot_line : null); if (line) { showCtl(false); await E.say(line, st.who || 'near'); E.alive(my); showCtl(true); spoke = tt; } else spoke = tt; }
    }
    showCtl(false); await E.say(st.ok_line, 'near');
  }
  async function game(E, my) {
    E0 = E; const SS = Lines.stages;
    for (let i = 0; i < SS.length; i++) {
      const st = SS[i]; E.setStep(i); E.S.step = E.cfg.data.steps[i]; E.S.fade = 0; beds(E, st.id); await E.sleep(.7); E.alive(my);
      if (st.id === 'open') {
        E.S.view = 'open_Y'; await E.say('y01', 'near'); await E.say('y02', 'near');
        G.hot = 1; E.fx.pour(-1.2, 2, 1.8); await E.say('y03', 'near'); await E.sleep(.3); E.alive(my); G.hot = 0;              // steam from the left pipe
        G.cold = 1; E.fx.splash(1.2, 1.6); E.sweep('@spray', 'cool', 80, -80, 1.1, .55); await E.say('y04', 'near'); G.cold = 0;   // the splash carried across: warm left → cool in a moment
        await E.say('y05', 'near'); E.S.fade = 1; await E.sleep(1.2); E.alive(my); continue;
      }
      if (st.id === 'penguin') {
        E.S.view = 'pen_P'; await E.sleep(.4); E.alive(my);
        await E.action('', '「いらっしゃいませ」', '"Welcome!"', 15, 'いらっしゃいませ|いらっしゃい|welcome|欢迎|欢迎光临'); E.alive(my); E.fx.bell(0, 1.2);
        for (const id of st.lines) await E.say(id, 'near');
        G.T = .55; G.two = false; G.target = st.target; G.targetL = G.targetR = null; await adjust(E, my, st); E.S.fade = 1; await E.sleep(1.2); E.alive(my); continue;
      }
      if (st.id === 'monkeys') {
        E.S.view = 'mon_M'; G.two = true; G.TL = .55; G.TR = .86; G.targetL = st.target_left; G.targetR = st.target_right; G.T = .5;
        for (const id of st.lines) await E.say(id, 'near');
        await adjust(E, my, st, 2.6, 28); E.S.fade = 1; await E.sleep(1.2); E.alive(my); G.two = false; continue;
      }
      if (st.id === 'rain') {
        E.S.view = 'rain_Y'; G.rain = 1; G.T = .34; G.two = false; G.target = st.target; E.amb('rain', 'cool', 0, .35); E.fx.thud(0, 8);
        await E.say('y06', 'near'); await E.say('y07', 'near'); E.S.view = 'rain_F'; await E.say('f01', 'near');
        await adjust(E, my, st, 2.4, 28); E.amb('rain', 'cool', 0, 0); G.rain = 0; E.S.fade = 1; await E.sleep(1.2); E.alive(my); continue;
      }
      if (st.id === 'yours') {
        E.S.view = 'open_Y'; G.T = .5; await E.say('y08', 'near'); await E.say('y09', 'near');
        E.S.view = 'end_Y';
        for (let n = 0; n < 3; n++) { const c = await E.choice([{ ja: st.voice_control[0], en: 'A little hotter', voice: 'あつく|あつい|hotter|hot|warmer|热一点|再热' }, { ja: st.voice_control[1], en: 'A little cooler', voice: 'ぬるく|ぬるい|cooler|colder|cool|凉一点|再凉' }], 8, n % 2); E.alive(my); G.T = clamp(G.T + (c ? -.18 : .18)); E.fx.pour(c ? 1.1 : -1.1, 1.8, .9); G[c ? 'cold' : 'hot'] = 1; await E.sleep(1.1); E.alive(my); G.hot = G.cold = 0; }
        await E.say('y10', 'near'); E.S.view = 'end_all'; await E.sleep(.4); E.alive(my); await E.say('y11', 'near'); await E.sleep(1.2); E.alive(my); E.S.fade = 1; await E.sleep(2);
      }
    }
  }
  const BEDS = { open: [['water', 'water', -.4, 2.2, .35], ['wind', 'wind', 0, 4, .05]], penguin: [['water', 'water', -.4, 2.2, .35]], monkeys: [['water', 'water', -.4, 2.2, .35]], rain: [['water', 'water', -.4, 2.2, .25], ['rain', 'rain', 0, 3, .45]], yours: [['water', 'water', -.4, 2.4, .28]] };
  const beds = (E, k) => { const want = BEDS[k] || [], names = new Set(want.map((b) => b[0])); for (const [n, L] of Object.entries(E.A.loops)) if (n.startsWith('bg:') && !names.has(n.slice(3))) L.set(0, .6); for (const [n, kind, az, d, g] of want) { const L = E.A.loop('bg:' + n, kind, az, d); L?.at(az, d, .4); L?.set(g, .9); } };
  const API = S.run({
    ns: 'ONSEN', data: { ...Lines, steps: Lines.stages.map((s) => ({ id: s.id, ja: s.ja, en: s.en, zh: s.zh, beats: [] })) }, voice: window.ONSEN_VOICE, bg: '#121a18', firstView: 'open_Y',
    preload: ['open_Y', 'pen_P', 'mon_M', 'rain_Y', 'rain_F', 'end_Y', 'end_all'],
    plan: { events: {}, smoothing: {}, voice: { az: { near: 0 }, distance: { near: .6 }, front_split: .5 } },
    script: game,
    onBegin: (E) => { E0 = E; Object.assign(G, { T: .5, TL: .5, TR: .5, two: false, hot: 0, cold: 0, hotOn: 0, coldOn: 0, rain: 0, ctl: false }); val.classList.remove('show'); },
    onFinish: () => showCtl(false),
    sources(add) {
      const h = Math.min(.6, G.hotV || 0), c = Math.min(.6, G.coldV || 0);
      const gust = Math.min(1, ((E0?.pulses || []).find((p) => p.name === '@gust')?.lev || 0) / .4); add(-80, 'warm', (.36 + .55 * h) * (1 - .95 * gust)); add(80, 'cool', .3 + .55 * c);   // the pipes always run a little: steam on your left, spray on your right; open = stronger; a gust blows the steam off your left ear for a moment
      if (G.two) { add(-60, 'warm', .7 * G.TL); add(60, 'warm', .3 * G.TR); return; }
      if (G.T >= .5) add(0, 'warm', (G.T - .5) * 1.2); else add(0, 'cool', (.5 - G.T) * .9);
    },
    update(dt, E) {
      const s = (v, tgt, tau) => v + (tgt - v) * (1 - Math.exp(-dt / tau));
      G.hotV = s(G.hotV || 0, (G.hotOn || G.hot) ? .6 : 0, .5); G.coldV = s(G.coldV || 0, (G.coldOn || G.cold) ? .6 : 0, .3);
      if (G.ctl) {
        if (G.two) { if (G.hotOn) G.TL = clamp(G.TL + dt * .12); if (G.coldOn) G.TR = clamp(G.TR - dt * .13); }
        else { if (G.hotOn) G.T = clamp(G.T + dt * .12); if (G.coldOn) G.T = clamp(G.T - dt * .13); if (G.rain) G.T = clamp(G.T - dt * .015); }
        if (E.AUTO) {   // ?auto: the bot pours until it is in range (fast path; a pure run uses the hand below)
          if (G.two) { G.hotOn = G.TL < G.targetL[0] + .06 ? 1 : 0; G.coldOn = G.TR > G.targetR[1] - .06 ? 1 : 0; }
          else if (G.target) { G.hotOn = G.T < G.target[0] + .03 ? 1 : 0; G.coldOn = G.T > G.target[1] - .03 ? 1 : 0; }
        }
      }
      if (E.S.started) { G.gust = (G.gust ?? 4) - dt; if (G.gust <= 0) { G.gust = rnd(6, 8.5); E.pulse('@gust', 'cool', -80, .72, .14, .45, .3); E.fx.gust(-1.45, -.4, 1); } }   // an autumn mountain gust from the left: cold across the steam for a moment
      const y = G.hotV > .02 ? E.A.loop('hotpipe', 'water', -1.2, 1.8) : null; y?.set(G.hotV * .5, .2); const z = G.coldV > .02 ? E.A.loop('coldpipe', 'water', 1.2, 1.8) : null; z?.set(G.coldV * .5, .2);
    },
    draw(E, dt) {
      const c = E.ctx, Sx = E.S, t = Sx.t;
      E.fall(dt, .15, { wind: .1, rgb: '226,92,50', size: 1.4, speed: .35 });   // maple leaves
      if (G.rain) E.fall(dt, .8, { wind: .05, rgb: '186,206,230', streak: 20, speed: 3.4 });
      const st = G.two ? .7 : .15 + .85 * clamp(G.T);
      E.steam(dt, W * rnd(.34, .66), H * .73, 4 + 18 * st, 100, { a: .13, r: 24, vy: -50, max: 3.4 });
      if (G.hotV > .02) { E.steam(dt, W * rnd(.18, .25), H * .6, 28 * G.hotV, 90, { a: .24, r: 22, max: 2.4 }); E.edge('left', '255,140,70', .5 * G.hotV); }
      if (G.coldV > .02) { if (Math.random() < 70 * dt * G.coldV) E.spark(W * rnd(.8, .9), H * .63, { rgb: '200,230,255', vy: rnd(-260, -80), vx: rnd(-120, 60), g: 800, r: rnd(2, 5), max: rnd(.5, .9) }); E.edge('right', '130,190,255', .5 * G.coldV); }
      const spr = E.pulses.find((p) => p.name === '@spray'); if (spr && Math.random() < 60 * dt) E.spark(W * (.5 + Math.sin(spr.az * Math.PI / 180) * .46), H * rnd(.3, .7), { rgb: '200,230,255', vy: rnd(-100, 100), vx: rnd(-240, -100), g: 300, r: rnd(2, 5), max: .7 });
      if (G.ctl) gauge(c, G.two ? [[G.TL, G.targetL, W * .935], [G.TR, G.targetR, W * .97]] : [[G.T, G.target, W * .955]]);
    },
  });
  for (const [ja, z] of [['ひだり：あつい おゆ', '左：热水'], ['みぎ：つめたい みず', '右：冷水'], ['「いらっしゃいませ」', '「欢迎光临」'], ['もうちょっと あつく', '再热一点'], ['もうちょっと ぬるく', '再凉一点']]) API.E.zh(ja, z);
  function gauge(c, list) {   // the thermometer(s): blue → orange, the guest's band, the bath's marker (no text)
    for (const [T, R, x] of list) { const y0 = H * .18, h = H * .5, w = 26;
      const g = c.createLinearGradient(0, y0, 0, y0 + h); g.addColorStop(0, '#ff8a4a'); g.addColorStop(.5, '#f2e2c6'); g.addColorStop(1, '#6cb4ff');
      c.save(); c.fillStyle = 'rgba(10,14,18,.55)'; c.fillRect(x - w, y0 - 16, w * 2, h + 32); c.fillStyle = g; c.fillRect(x - 9, y0, 18, h);
      if (R) { c.strokeStyle = '#ffffff'; c.lineWidth = 3; c.strokeRect(x - 15, y0 + h * (1 - R[1]), 30, h * (R[1] - R[0])); }
      c.fillStyle = '#ffffff'; c.beginPath(); c.arc(x, y0 + h * (1 - T), 13, 0, 7); c.fill(); c.restore(); }
  }
  // just-listen mode (shared/shell.js): the visible hand pours; default buttons otherwise
  if (window.MoHeatShell) window.MoHeatShell.autoplay = (H2) => {
    if (!G.ctl) return false;
    const hotW = G.two ? G.TL < G.targetL[0] + .06 : G.T < (G.target?.[0] ?? 0) + .03, coldW = G.two ? G.TR > G.targetR[1] - .06 : G.T > (G.target?.[1] ?? 1) - .03;
    const b = hotW ? val.querySelector('[data-k="hot"]') : coldW ? val.querySelector('[data-k="cold"]') : null; if (b) H2.run(() => H2.hold(b, .5, .5, .9));
    return true;
  };
})();
