// 『響の、きみだけのファンミーティング』 Hibiki's Fan Meeting Just for You (Demo66, 2026-11-13): 響 Hibiki, a gentle princely idol (blond
// "little prince"; fan-meeting look FM-a: lavender hoodie, jeans, tiny crown hair clip, user 2026-11-13) meets only you in a flower-filled greenhouse café (casual fan-meeting look; outfit picked by the user). Modelled on Ayane's fan meeting
// (Demo02 remake). Picture-book layered stills (media/layers.js + shared/layers.js), engine ../../shared/story.js (cfg.script = this flow),
// lines lines.js, voice ElevenLabs hibiki r4_a (scripts/voice.py), script project/script.md.
// Thermal (DUAL, every source visible): his voice warms the ear he is at (strong at the ear, mild in front, faint from afar); the afternoon
// sun through the glass on your LEFT warms a little; a choice — a soft café blanket around your shoulders (warm both ears, slowly) or the fountain
// (its cool mist on your RIGHT ear while he whispers into the LEFT); both end with the mist on the right and his whisper there too.
(() => {
  let VE = 0;
  const ST = window.MoHeatStory, RAW = window.HFM_LINES, W = 1920, H = 1080;
  const LINES = Object.fromEntries(Object.entries(RAW).map(([k, [ja, en]]) => [k, [ja, en, 'H']]));
  const STEPS = [
    { id: 'hello', ja: 'ようこそ', en: 'Welcome', zh: '欢迎', ko: '어서 와', beats: [] },
    { id: 'hand', ja: '握手', en: 'Handshake', zh: '握手', ko: '악수', beats: [] },
    { id: 'secret', ja: 'ひみつの話', en: 'A secret', zh: '秘密', ko: '비밀 이야기', beats: [] },
    { id: 'sun', ja: 'ひだまりとミスト', en: 'Sunlight or mist', zh: '阳光与水雾', ko: '햇살과 물안개', beats: [] },
    { id: 'photo', ja: 'ツーショット', en: 'A photo together', zh: '合影', ko: '투샷', beats: [] },
    { id: 'gift', ja: 'プレゼント', en: 'A present', zh: '礼物', ko: '선물', beats: [] },
    { id: 'bye', ja: 'またね', en: 'See you', zh: '下次见', ko: '또 봐', beats: [] },
  ];
  const LR = [{ ja: 'ひだり', en: 'Left', zh: '左边', voice: 'ひだり|左|左側|left|左边|왼쪽|왼' }, { ja: 'みぎ', en: 'Right', zh: '右边', voice: 'みぎ|右|右側|right|右边|오른쪽|오른' }];
  const G = { lights: 0, flash: -9, open: 0 };

  async function flow(E, my) {
    const say = async (id, pos) => { await E.say(id, pos); E.alive(my); };
    const wait = async (s) => { await E.sleep(s); E.alive(my); };
    Object.assign(G, { lights: 0, flash: -9, open: 0 });
    E.A.loop('bg:room', 'room', 0, 3)?.set(.16, 2);
    // ① ようこそ — in the flowers behind the tables, in the sunbeams from the left; he notices you and comes to your table
    E.setStep(0); E.S.view = 'stage'; G.lights = 1;
    await wait(1.6);
    await say('h01', 'stage');
    await wait(.5);
    await say('h02', 'stage');
    E.fx.steps(.15, 0, 5, 2.2, true); await wait(1.4); G.lights = 0; E.S.view = 'front'; await wait(.8);
    await say('h03', 'near');
    await E.action('', 'うん、会いに来たよ！', 'Yes, I came to see you!', 20, 'うん|会いに来た|来たよ|きたよ|来た|はい|yes|yeah|i came|i\'m here|来了|我来了|嗯|응|왔어|보러 왔어'); E.alive(my);
    await wait(.4);
    await say('h04', 'near');
    await wait(.6);
    // ② 握手 — his hand is not at your ears: no heat from the handshake itself
    E.setStep(1); E.S.view = 'hands';
    await wait(.6);
    await say('h05', 'near');
    await E.action('🤝', '握手する', 'Shake hands', 20, 'あくしゅ|握手|よろしく|はい|お願いします|shake|handshake|nice to meet you|你好|악수|잘 부탁해'); E.alive(my);
    E.fx.rustle(0, .4); await wait(.7);
    await say('h06', 'near');
    await wait(.3);
    await say('h07', 'near');
    await wait(.5);
    // ③ ひみつの話 — left ear + a warm breath, the right ear, a guessing game, a quick left-right
    E.setStep(2); E.fx.rustle(-1.2, .3); E.S.view = 'earL';
    await wait(1.5);
    await say('h08', 'left_ear');
    await wait(.3);
    await say('h09', 'left_ear');
    await wait(.3); E.fx.blow(-1.35, 1.6); E.pulse('breath', 'warm', -90, .85, .3, .6, 1.2);
    await say('h10', 'left_ear');
    await wait(1.4); E.fx.rustle(-.4, .4); await wait(.4); E.fx.rustle(.6, .35); E.S.view = 'earR'; await wait(.9);
    await say('h11', 'right_ear');
    await wait(.3);
    await say('h12', 'right_ear');
    await wait(1.2); E.S.view = 'front';
    await say('h13', 'near');
    E.S.dark = 1; await wait(1.8); E.fx.rustle(1.1, .3); await wait(.5);
    await say('h14', 'right_ear');
    const lr = await E.choice(LR, 20, 1); E.alive(my);
    E.S.dark = 0; E.S.view = 'earR';
    await say(lr === 1 ? 'h15' : 'h16', 'right_ear');
    await wait(1.3); E.S.view = 'earL'; await say('h17', 'left_ear');
    await wait(1.1); E.S.view = 'earR'; await say('h18', 'right_ear');
    await wait(1.1); E.S.view = 'earL'; await say('h19', 'left_ear');
    await wait(1.3); E.fx.blow(-1.35, 1.2); E.pulse('coolbreath', 'cool', -90, .75, .15, .5, .5);   // a cool "fuu" on the same ear right after the warm whisper (DUAL: fast same-ear warm → cool, breath is not voice: guide §0 rule 2)
    await wait(2.2);
    // ④ ひだまりとミスト — cold or warm? a soft café blanket (both ears warm, slowly) or the fountain mist (cool on the RIGHT, his whisper on the LEFT)
    E.setStep(3); E.S.view = 'front';
    await wait(1.2);
    await say('h20', 'near');
    const pick = await E.choice([{ ja: 'ちょっと寒い', en: 'A little cold', zh: '有点冷', voice: '寒い|さむい|さむ|冷たい|cold|a little cold|chilly|冷|有点冷|好冷|추워|춥다' },
      { ja: 'ちょっと暑い', en: 'A little warm', zh: '有点热', voice: '暑い|あつい|あつ|熱い|warm|hot|a little warm|热|有点热|好热|더워|덥다' }], 20, 0); E.alive(my);
    if (pick === 0) {   // a soft café blanket around your shoulders up to your ears — both ears warm, building slowly
      E.S.view = 'blanket'; await wait(.4); await say('c1', 'near');
      E.fx.rustle(-1.2, .25); setTimeout(() => E.fx.rustle(1.2, .25), 160);
      for (const lev of [.25, .4, .55]) { E.amb('blanket', 'warm', 0, lev); await wait(1); }
      await say('c2', 'near');
      await wait(1.2); E.amb('blanket', 'warm', 0, .3);
      await say('c3', 'near');
      E.fx.steps(0, .6, 3, 1.2, true); G.open = 1; E.S.view = 'fountain'; await wait(.8);
      E.sweep('mist0', 'cool', 75, 90, 1.6, .5); E.A.loop('mist', 'water', 1.2, 1.2)?.set(.22, .8); await wait(1.6); E.amb('mist', 'cool', 90, .4);
      await wait(1.2);
    } else {   // the fountain: its cool mist drifts over from the right
      await say('b1', 'near');
      E.fx.steps(0, .6, 3, 1.2, true); G.open = 1; E.S.view = 'fountain'; await wait(.8);
      E.sweep('mist0', 'cool', 75, 90, 1.6, .65); E.A.loop('mist', 'water', 1.2, 1.2)?.set(.22, .8); await wait(1.6); E.amb('mist', 'cool', 90, .45);
      await wait(1.6); E.fx.rustle(-1.2, .3); E.S.view = 'earL'; await wait(1.2);
      await say('b2', 'left_ear');   // warm LEFT + cool RIGHT
      await wait(1.4);
    }
    E.fx.rustle(1.2, .3); E.S.view = 'earR'; await wait(1.2);
    await say('h21', 'right_ear');   // his whisper at the ear in the mist: warm + cool on one ear (DUAL)
    await wait(1.2); E.fx.steps(.6, 0, 3, 1.2, true); E.amb('mist', 'cool', 90, 0); E.A.loops.mist?.set(0, .8); G.open = 0; await wait(.6); E.amb('blanket', 'warm', 0, 0);
    // ⑤ ツーショット — he leans in at your LEFT cheek for a selfie
    E.setStep(4); E.S.view = 'front';
    await wait(.6);
    await say('h22', 'near');
    E.fx.rustle(-1, .3); E.S.view = 'photo'; E.amb('cheek', 'warm', -75, .22); await wait(.8);
    await say('h23', 'left');
    await E.action('📸', 'チーズ！', 'Cheese!', 20, 'チーズ|ちーず|cheese|はい チーズ|茄子|치즈|김치'); E.alive(my);
    G.flash = E.S.t; E.fx.pop(0, .5); E.fx.sparkle(0, .6, 5);
    await wait(1);
    await say('h24', 'left');
    E.amb('cheek', 'warm', -75, 0);
    await wait(.8);
    // ⑥ プレゼント — a white rose (no thermal)
    E.setStep(5); E.S.view = 'rose';
    await wait(.8);
    await say('h25', 'near');
    await wait(.3);
    await say('h26', 'near');
    await wait(.8);
    // ⑦ またね — call his name, a thank-you at the left ear, a promise at the right, back to the stage
    E.setStep(6); E.S.view = 'front';
    await wait(.6);
    await say('h27', 'near');
    await E.action('', '響！', 'Hibiki!', 20, 'ひびき|響|ヒビキ|ひびきくん|響くん|hibiki|响|響|히비키'); E.alive(my);
    E.fx.rustle(-1.2, .3); E.S.view = 'earL'; await wait(1.2);
    await say('h28', 'left_ear');
    await wait(1.4); E.fx.rustle(1.2, .3); E.S.view = 'earR'; await wait(1.2);
    await say('h29', 'right_ear');
    await E.action('', 'うん、約束！', 'I promise!', 20, 'やくそく|約束|うん|また来る|また来るね|promise|i promise|see you|yes|约定|一定|我会再来|약속|또 올게'); E.alive(my);
    await wait(.4); E.fx.steps(0, .15, 5, 2.2, true); E.S.view = 'stage'; G.lights = 1; await wait(1.4);
    await say('h30', 'stage');
    await wait(1.6); G.lights = 0; E.S.fade = 1; await wait(2);
  }

  const API = ST.run({
    ns: 'HFM', data: { who: { H: '響' }, lines: LINES, steps: STEPS }, voice: window.HFM_VOICE, bg: '#141a2e', firstView: 'stage', sample: false,
    preload: ['stage', 'front', 'hands', 'earL', 'earR', 'blanket', 'fountain', 'photo', 'rose'],
    plan: { events: {}, smoothing: { warm_rise: .4, warm_fall: .8 }, voice: { az: {}, distance: { stage: 0, near: 0, left: 0, left_ear: 0, right_ear: 0 }, front_split: .5 } },
    pos: { stage: { az: .25, dist: 3 }, near: { az: 0, dist: .7 }, left: { az: -1.15, dist: .3 }, left_ear: { az: -1.35, dist: .12 }, right_ear: { az: 1.35, dist: .12 } },
    icons: { breath: '💨', coolbreath: '🌬', blanket: '🧶', mist0: '💧', mist: '💧', cheek: '☺', sun: '☀' },
    update(dt, E) { VE = VE + ((E.S.started ? E.S.lv || 0 : 0) - VE) * (1 - Math.exp(-dt / ((E.S.lv || 0) > VE ? .3 : .8))); },
    sources(add, E) {
      const S = E.S; if (!S.started) return;
      if (G.lights > .01 && (S.view === 'stage' || S.view === 'front')) add(-60, 'warm', .15 * G.lights, '☀');   // the afternoon sun through the glass on your left (low base)
      if (S.env < .5) return; const k = (r) => Math.min(1, VE / r), pn = S.posName;
      if (pn === 'left_ear' || pn === 'right_ear') add(pn === 'left_ear' ? -90 : 90, 'warm', .1 + .7 * k(.09));
      else if (pn === 'left') add(-70, 'warm', .08 + .32 * k(.15));
      else if (pn === 'near') add(0, 'warm', .04 + .2 * k(.2));
      else add(15, 'warm', .02 + .06 * k(.2));
    },
    script: flow,
    draw(E, dt) {
      const K = E.K, S = E.S, t = S.t;
      if (G.lights > .01 && (S.view === 'stage' || S.view === 'front')) { E.edge('left', '255,210,130', .22 * G.lights, .35); if (Math.random() < dt * 8 * G.lights) E.spark(rnd(.05, .35) * W, rnd(.1, .7) * H, { rgb: '255,230,170', vy: rnd(-10, 20), vx: rnd(-10, 10), max: rnd(1.5, 2.5), r: rnd(1.5, 2.5), a: .7 }); }
      const v = Math.min(1, VE / .09) * (S.env || 0);
      if (S.posName === 'left_ear' || S.posName === 'right_ear') E.edge(S.posName === 'left_ear' ? 'left' : 'right', '255,150,110', .3 * v, .22);
      for (const pl of E.pulses) if (pl.name === 'coolbreath') { E.edge('left', '140,205,255', .4 * pl.lev, .28); if (Math.random() < .5) E.puff({ x: rnd(20, 260), y: rnd(.35, .65) * H, vx: -60, vy: -10, r: 26, grow: 50, max: 1.2, rgb: '210,238,255', a: .18 }); }
      for (const pl of E.pulses) if (pl.name === 'breath') { E.edge('left', '255,170,120', .4 * pl.lev, .28); if (Math.random() < .5) E.puff({ x: rnd(20, 260), y: rnd(.35, .65) * H, vx: -40, vy: -15, r: 30, grow: 50, max: 1.4, rgb: '255,210,180', a: .16 }); }
      // a soft café blanket around your shoulders: a warm glow at both edges
      if ((K.blanket || 0) > .02) { E.edge('left', '255,160,110', .3 * K.blanket, .2); E.edge('right', '255,160,110', .3 * K.blanket, .2); }
      // the fountain mist (right): blue edge + fine mist drifting in from the right
      const br = Math.max(K.mist || 0, ...E.pulses.filter((p) => p.name === 'mist0').map((p) => p.lev));
      if (br > .02) {
        E.edge('right', '120,200,255', .34 * br, .3);
        if (Math.random() < dt * 30 * br) E.puff({ x: W + 30, y: rnd(.2, .9) * H, vx: -rnd(120, 260), vy: rnd(-25, 10), r: rnd(30, 60), grow: 60, drag: .6, max: 2.2, rgb: '215,240,255', a: .2 });
        if (Math.random() < dt * 40 * br) E.spark(W - rnd(10, 380), rnd(.2, .85) * H, { rgb: '220,245,255', vy: rnd(-20, 30), vx: -rnd(20, 80), max: rnd(.6, 1.2), r: rnd(1.5, 3) });
      }
      if ((K.cheek || 0) > .02) E.edge('left', '255,170,130', .22 * K.cheek / .22, .2);
      const fl = t - G.flash; if (fl >= 0 && fl < .5) { E.ctx.fillStyle = `rgba(255,255,255,${.85 * (1 - fl / .5)})`; E.ctx.fillRect(0, 0, W, H); }
    },
  });
  function rnd(a, b) { return a + Math.random() * (b - a); }
  API.E.zh('うん、会いに来たよ！', '嗯，我来见你了！'); API.E.zh('握手する', '握手'); API.E.zh('チーズ！', '茄子！'); API.E.zh('響！', '响！'); API.E.zh('うん、約束！', '嗯，一言为定！');
})();
