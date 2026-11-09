// 『なつやすみ、ナオミと せんぷうき』 Summer Fan Days with Naomi — healing ⑦ (proposal N1). No human voices: you are the owner, Naomi's sounds = the kit's
// purr / chirps (healing/_kit/naomi/audio.js). Engine = ../../shared/story.js (cfg.script); art = media/layers.js; thermal: project/thermal_plan.json, driven by the
// game state here (the fan's cool sweeps left ↔ right and the heat is felt less where it blows, the ice bottle, the uchiwa, the rain air, Naomi's warm body).
(() => {
  const S = window.MoHeatStory, NA = window.NaomiAudio, W = 1920, H = 1080, rnd = (a, b) => a + Math.random() * (b - a), clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const CH = [['午後の暑さ', 'A hot afternoon', '午后的闷热'], ['リボンあそび', 'The streamer', '逗飘带'], ['氷のびんと すいか', 'Ice bottle and melon', '冰瓶和西瓜'], ['夕立', 'Evening shower', '雷阵雨'], ['夜', 'Night', '夜晚']];
  const D = { who: { N: 'ナオミ' }, lines: {}, steps: CH.map((c, i) => ({ id: ['day', 'bat', 'bottle', 'rain', 'night'][i], ja: c[0], en: c[1], zh: c[2], beats: [] })) };
  const G = { fan: 0, fanLow: 0, fanT: 0, rainD: 0, purr: null, uchiwa: 0 };
  const mw = (k, az, d) => { try { NA.meow(k, az, d); } catch {} };
  const purr = (on, az = -1.2) => { try { if (on) { G.purr = G.purr || NA.loop('purr'); G.purr?.at?.(az, .25); G.purr?.set(.5, .5); } else G.purr?.set(0, .6); } catch {} };
  let E0;
  async function game(E, my) {
    E0 = E;
    // 1 the hot afternoon: the cat pancake, then the fan
    E.setStep(0); E.S.step = D.steps[0]; E.S.view = 'day_pancake'; beds(E, 'day'); E.amb('heat_L', 'warm', -80, .36); E.amb('heat_R', 'warm', 80, .36); E.fx.bell(-.7, 2.6); await E.sleep(5); E.alive(my);
    await E.action('', 'せんぷうきを つける', 'Turn on the fan', 18); E.alive(my); E.fx.page(.9, 1.2); G.fan = 1; E.A.loop('fan', 'fan', .9, 1.5)?.set(.32, .8); await E.sleep(12); E.alive(my);
    mw('mew', -.2, 1.1); await E.sleep(3); E.alive(my);
    // 2 the streamer: three taps, she bats it
    E.setStep(1); E.S.step = D.steps[1]; E.S.view = 'day_bat'; await E.sleep(1.5); E.alive(my);
    for (let i = 0; i < 3; i++) { await E.action('', 'くびふり', 'Swing the fan', 15); E.alive(my); E.fx.swish(.6, .8); setTimeout(() => mw('chirp', .4, .8), 300); await E.sleep(2.8); E.alive(my); }
    mw('mew', .1, 1); await E.sleep(1.6); E.alive(my);
    // 3 the ice bottle: she presses her cheek to it; you lean in
    E.setStep(2); E.S.step = D.steps[2]; E.S.view = 'day_pancake'; await E.sleep(.8); E.alive(my);
    await E.action('', 'こおりの びんを おく', 'Set the ice bottle down', 18); E.alive(my); E.fx.clink(.3, .6); E.S.view = 'day_bottle'; await E.sleep(.8); E.alive(my);
    E.amb('bottle', 'cool', 20, .4); E.amb('naomi', 'warm', 80, .3); purr(true, 1.2); await E.sleep(10); E.alive(my);
    for (let i = 0; i < 2; i++) { await E.action('', 'あおぐ', 'Fan yourself', 12); E.alive(my); E.fx.swish(0, .35); G.uchiwa = 1; E.pulse('@uchiwa', 'cool', 0, .35, .1, .3, .4); setTimeout(() => { G.uchiwa = 0; }, 700); await E.sleep(1.3); E.alive(my); }
    purr(false); await E.sleep(1.4); E.alive(my);
    // 4 the evening shower: choose the window; thunder; she squeezes against your left
    E.setStep(3); E.S.step = D.steps[3]; E.amb('bottle', 'cool', 20, 0); E.amb('naomi', 'warm', 80, 0); E.S.fade = 1; await E.sleep(.9); E.alive(my); E.S.fade = 0; E.S.view = 'rain_startle'; G.rainD = 1; beds(E, 'rain'); await E.sleep(1); E.alive(my);
    E.fx.thunder(-.6); await E.sleep(1.2); E.alive(my);
    const open = await E.choice([{ ja: 'すこし あけておく', en: 'Leave it open a little', voice: 'あけて|開けて|open|开着|不关' }, { ja: 'まどを しめる', en: 'Close the window', voice: 'しめる|閉める|close|shut|关窗|关上' }], 18, E.ALT ? 1 : 0); E.alive(my);
    E.amb('rain', 'cool', -80, open ? 0 : .4); E.amb('heat_L', 'warm', -80, open ? .36 : .1); E.amb('heat_R', 'warm', 80, open ? .36 : .1);
    await E.sleep(1.4); E.alive(my); E.fx.thunder(-.5); mw('mew', -1.1, .5); E.amb('naomi', 'warm', -80, .45); await E.sleep(1.2); E.alive(my);
    const ok = await E.hold(3.5, false, '', 'なでる（長押し）', 'Stroke her (press and hold)'); E.alive(my); purr(true, -1.2); await E.sleep(8); E.alive(my); void ok;
    // 5 night: she climbs onto your shoulder, purring at your left ear; the fan on low passes your right
    E.setStep(4); E.S.step = D.steps[4]; purr(false); G.rainD = 0; E.amb('rain', 'cool', -80, 0); E.S.fade = 1; await E.sleep(1); E.alive(my); E.S.fade = 0; E.S.view = 'night_shoulder'; beds(E, 'night');
    E.amb('heat_L', 'warm', -80, .08); E.amb('heat_R', 'warm', 80, .08); E.amb('naomi', 'warm', -90, .5); G.fan = .55; G.fanLow = 1; E.A.loop('fan', 'fan', .9, 1.5)?.set(.18, 1); await E.sleep(1); purr(true, -1.35); await E.sleep(14); E.alive(my);
    await E.action('', '「おやすみ、ナオミ」', '"Good night, Naomi"', 20, 'おやすみ|ナオミ|なおみ|good night|goodnight|晚安|娜奥米'); E.alive(my); mw('chirp', -1.2, .3); E.S.view = 'night_pancake'; await E.sleep(3); E.alive(my); purr(false); E.S.fade = 1; await E.sleep(2.4);
  }
  const BEDS = { day: [['cicada', 'cicada', -.7, 5, .35], ['bird', 'night', -.8, 6, .05]], rain: [['rain', 'rain', -1, 2.6, .5], ['wind', 'wind', -1, 3, .08]], night: [['insect', 'night', -.6, 4, .4]] };
  const beds = (E, k) => { const want = BEDS[k] || [], names = new Set(want.map((b) => b[0])); for (const [n, L] of Object.entries(E.A.loops)) if (n.startsWith('bg:') && !names.has(n.slice(3))) L.set(0, .6); for (const [n, kind, az, d, g] of want) { const L = E.A.loop('bg:' + n, kind, az, d); L?.at(az, d, .4); L?.set(g, .9); } };
  const API = S.run({
    ns: 'NAOMI', data: D, voice: { langs: ['ja'] }, bg: '#17150f', firstView: 'day_pancake', sample: false,
    preload: ['day_pancake', 'day_bat', 'day_bottle', 'rain_startle', 'night_shoulder', 'night_pancake'],
    plan: { events: {}, smoothing: {}, voice: { az: {}, distance: {} } },
    script: game,
    onBegin: () => { Object.assign(G, { fan: 0, fanLow: 0, fanT: 0, rainD: 0, uchiwa: 0 }); try { NA.init(); } catch {} },
    onFinish: () => { try { G.purr?.set(0, .2); } catch {} },
    sources(add) {   // the fan: moving cool air; where it blows the heat is felt less
      if (!G.fan) return; const az = G.fanLow ? 60 + 30 * Math.sin(G.fanT * 1.57) : 90 * Math.sin(G.fanT * 1.57), lev = G.fanLow ? .25 : .45;
      add(az, 'cool', lev * G.fan);
    },
    update(dt, E) {
      G.fanT += dt;
      if (E.S.started && G.fan && !G.fanLow) { const sn = Math.sin(G.fanT * 1.57); const base = (E.S.heatBase = 1); void base;
        const l = .36 * (1 - .96 * clamp(-sn)), r = .36 * (1 - .96 * clamp(sn)); if (E.S.view !== 'rain_startle') { E.amb('heat_L', 'warm', -80, l + .01); E.amb('heat_R', 'warm', 80, r + .01); } }   // the heat eases on the side the fan is blowing at
    },
    draw(E, dt) {
      const c = E.ctx, Sx = E.S, t = Sx.t;
      // the coil smoke rises from the pig on the sill; the fan blades spin (code overlay over the plate's fan)
      if (Sx.view !== 'night_shoulder') { if (Math.random() < 5 * dt) E.puff({ x: W * .337, y: H * .24, vx: 4 + Math.sin(t) * 6, vy: -36, r: 5, grow: 8, max: 3, a: .22 });
        if (G.fan) { const x = W * .864, y = H * .316, R = H * .133, sp = (G.fanLow ? 11 : 26) * t; c.save(); c.translate(x, y); c.rotate(sp % 6.283); c.fillStyle = 'rgba(245,245,240,.22)'; for (let i = 0; i < 3; i++) { c.rotate(2.094); c.beginPath(); c.ellipse(R * .55, 0, R * .42, R * .2, 0, 0, 7); c.fill(); } c.restore(); }
        if (G.fan && !G.fanLow) E.edge(Math.sin(G.fanT * 1.57) > 0 ? 'right' : 'left', '150,205,255', .3 * Math.abs(Math.sin(G.fanT * 1.57)), .25); }
      if (Sx.view === 'day_bottle' && (E.K.bottle || 0) > .05 && Math.random() < 4 * dt) E.puff({ x: W * .29, y: H * .55, vx: rnd(-10, 10), vy: 18, r: 14, grow: 16, max: 1.8, rgb: '200,230,255', a: .2 });
      if (G.rainD) { E.fall(dt, .7, { wind: .12, rgb: '190,205,225', streak: 22, speed: 3.2 }); c.fillStyle = 'rgba(40,50,70,.1)'; c.fillRect(0, 0, W, H); if ((E.K.rain || 0) > .03) E.edge('left', '140,190,255', .42 * Math.min(1, E.K.rain * 2), .3); }
      if ((E.K.naomi || 0) > .05 && Sx.view === 'rain_startle') E.edge('left', '255,170,100', .3 * Math.min(1, E.K.naomi * 2), .26);
      if (Sx.view === 'night_shoulder') { E.edge('left', '255,180,110', .28, .25); E.edge('right', '120,170,240', .22 + .1 * Math.sin(G.fanT * 1.57), .2); }
    },
  });
  for (const [ja, z] of [['せんぷうきを つける', '打开电风扇'], ['くびふり', '让风扇转头'], ['こおりの びんを おく', '放下冰水瓶'], ['あおぐ', '扇扇子'], ['すこし あけておく', '开着一点'], ['まどを しめる', '关上窗'], ['なでる（長押し）', '抚摸（长按）'], ['「おやすみ、ナオミ」', '「晚安，娜奥米」'], ['ナオミ', '娜奥米']]) API.E.zh(ja, z);
})();
