// 『キミだけのスペシャルファンミーティング』 Your Special Fan Meeting — remake (2026-11-13): 綾音 Ayane meets only you, in the Q4 picnic
// outfit (cream cardigan, pink skirt; the straw hat is her present to you). Picture-book layered stills (media/layers.js + shared/layers.js),
// engine ../../shared/story.js (cfg.script = this flow), lines lines.js, voice ElevenLabs ayane (scripts/voice.py), script project/script.md.
// Thermal (DUAL, every source visible): her voice warms the ear she is at (strong at the ear, mild in front, faint from the stage), the
// stage spotlights warm you a little while you sit under them, the ice-cold soda at your cheek / the uchiwa breeze cool ONE ear while she
// whispers into the other (warm L + cool R), then she moves to the cool ear (warm + cool on one ear), a fast left-right guessing game.
(() => {
  let VE = 0;   // her voice envelope for the heat (fast up, slower down)
  const ST = window.MoHeatStory, RAW = window.AFM_LINES, W = 1920, H = 1080;
  const LINES = Object.fromEntries(Object.entries(RAW).map(([k, [ja, en]]) => [k, [ja, en, 'A']]));
  const STEPS = [
    { id: 'hello', ja: 'ようこそ', en: 'Welcome', zh: '欢迎', ko: '어서 와', beats: [] },
    { id: 'hand', ja: '握手', en: 'Handshake', zh: '握手', ko: '악수', beats: [] },
    { id: 'secret', ja: 'ないしょ話', en: 'A secret', zh: '悄悄话', ko: '비밀 이야기', beats: [] },
    { id: 'cool', ja: 'ひんやりタイム', en: 'Cool down', zh: '清凉时间', ko: '시원한 시간', beats: [] },
    { id: 'photo', ja: 'ツーショット', en: 'A photo together', zh: '合影', ko: '투샷', beats: [] },
    { id: 'gift', ja: 'プレゼント', en: 'A present', zh: '礼物', ko: '선물', beats: [] },
    { id: 'bye', ja: 'またね', en: 'See you', zh: '下次见', ko: '또 봐', beats: [] },
  ];
  const LR = [{ ja: 'ひだり', en: 'Left', zh: '左边', voice: 'ひだり|左|左側|left|左边|왼쪽|왼' }, { ja: 'みぎ', en: 'Right', zh: '右边', voice: 'みぎ|右|右側|right|右边|오른쪽|오른' }];
  const G = { lights: 0, flash: -9, flaps: [], frost: 0, hat: -9 };   // picture state for the FX

  async function flow(E, my) {
    const say = async (id, pos) => { await E.say(id, pos); E.alive(my); };
    const wait = async (s) => { await E.sleep(s); E.alive(my); };
    Object.assign(G, { lights: 0, flash: -9, flaps: [], frost: 0, hat: -9 });
    E.A.loop('bg:room', 'room', 0, 3)?.set(.16, 2);
    // ① ようこそ — she is on the little stage under the spotlights, notices you, comes down to your table
    E.setStep(0); E.S.view = 'stage'; G.lights = 1;
    await wait(1.6);
    await say('a01', 'stage');
    await wait(.5);
    await say('a02', 'stage');
    E.fx.steps(.15, 0, 5, 2.2, true); await wait(1.4); G.lights = 0; E.S.view = 'front'; await wait(.8);
    await say('a03', 'near');
    await E.action('', 'うん、来たよ！', "Yep, I'm here!", 20, 'うん|来たよ|きたよ|来た|会いに来た|はい|yes|yeah|i came|i\'m here|here|来了|我来了|嗯|응|왔어'); E.alive(my);
    await wait(.4);
    await say('a04', 'near');
    await wait(.6);
    // ② 握手 — her hands are not at your ears: no heat from the handshake itself (guide §3)
    E.setStep(1); E.S.view = 'hands';
    await wait(.6);
    await say('a05', 'near');
    await E.action('🤝', '握手する', 'Shake hands', 20, 'あくしゅ|握手|よろしく|はい|お願いします|shake|handshake|nice to meet you|握手|你好|악수|잘 부탁해'); E.alive(my);
    E.fx.rustle(0, .4); await wait(.7);
    await say('a06', 'near');
    await wait(.3);
    await say('a07', 'near');
    await wait(.5);
    // ③ ないしょ話 — left ear, a warm breath, then round to the right ear; a guessing game with closed eyes; a quick left-right
    E.setStep(2); E.fx.rustle(-1.2, .3); E.S.view = 'earL';
    await wait(1.5);
    await say('a08', 'left_ear');
    await wait(.3);
    await say('a09', 'left_ear');
    await wait(.3); E.fx.blow(-1.35, 1.6); E.pulse('breath', 'warm', -90, .85, .3, .6, 1.2);
    await say('a10', 'left_ear');
    await wait(1.4); E.fx.rustle(-.4, .4); await wait(.4); E.fx.rustle(.6, .35); E.S.view = 'earR'; await wait(.9);
    await say('a11', 'right_ear');
    await wait(.3);
    await say('a12', 'right_ear');
    await wait(1.2); E.S.view = 'front';
    await say('a13', 'near');
    E.S.dark = 1; await wait(1.8); E.fx.rustle(1.1, .3); await wait(.5);
    await say('a14', 'right_ear');
    const lr = await E.choice(LR, 20, 1); E.alive(my);
    E.S.dark = 0; E.S.view = 'earR';
    await say(lr === 1 ? 'a15' : 'a16', 'right_ear');
    await wait(1.3); E.S.view = 'earL'; await say('a17', 'left_ear');
    await wait(1.1); E.S.view = 'earR'; await say('a18', 'right_ear');
    await wait(1.1); E.S.view = 'earL'; await say('a19', 'left_ear');
    await wait(1.3); E.fx.blow(-1.35, 1.2); E.pulse('coolbreath', 'cool', -90, .75, .15, .5, .5);   // a cool "fuu" on the same ear right after the warm whisper (DUAL: fast same-ear warm → cool, breath is not voice: guide §0 rule 2)
    await wait(2.2);
    // ④ ひんやりタイム — the spotlights made you both warm; the cold thing is on the RIGHT, her whisper on the LEFT, then on the right too
    E.setStep(3); E.S.view = 'front'; G.lights = .6;
    await wait(1.2);
    await say('a20', 'near');
    await wait(.3);
    await say('a21', 'near');
    const pick = await E.choice([{ ja: 'つめたいドリンク', en: 'An ice-cold drink', zh: '冰饮料', voice: 'ドリンク|飲み物|のみもの|ソーダ|ジュース|つめたい|冷たい|drink|soda|cold drink|饮料|冰的|喝的|음료|드링크' },
      { ja: 'うちわ', en: 'The fan', zh: '扇子', voice: 'うちわ|団扇|扇子|せんす|あおいで|風|fan|breeze|扇子|扇风|风|부채|바람' }], 20, 0); E.alive(my);
    G.lights = 0;
    if (pick === 0) {   // the soda: frosty bottle, then at your right cheek (cool R, strong and quick), you keep holding it there
      E.S.view = 'drink'; E.fx.clink(0, .6); G.frost = 1;
      await wait(.4); await say('d1', 'near');
      E.fx.swish(1.2, .25); E.fx.clink(1.2, .2); E.pulse('soda', 'cool', 90, 1, .15, 1.2, .6); E.amb('bottle', 'cool', 90, .55);
      await say('d2', 'right');
      await wait(1.6); E.fx.rustle(-1.2, .3); E.S.view = 'earL'; await wait(1.2);
      await say('d3', 'left_ear');   // warm LEFT + cool RIGHT at the same moment
    } else {   // the uchiwa: flaps from your right, then your left, then it keeps fanning your right
      E.S.view = 'fan';
      await wait(.4); await say('f1', 'near');
      await flaps(E, my, 90, 5);
      await say('f2', 'near');
      await flaps(E, my, -90, 4);
      await wait(1.4); E.fx.rustle(-1.2, .3); E.S.view = 'earL'; await wait(1.2);
      G.fanR = true; E.amb('fanR', 'cool', 90, .45);
      await say('f3', 'left_ear');   // warm LEFT + cool RIGHT
    }
    await wait(1.4); E.fx.rustle(1.2, .3); E.S.view = 'earR'; await wait(1.2);
    await say('a22', 'right_ear');   // her whisper at the ear that is still cool: warm + cool on one ear (DUAL)
    await wait(1.4); E.amb('bottle', 'cool', 90, 0); E.amb('fanR', 'cool', 90, 0); G.fanR = false; G.frost = 0;
    // ⑤ ツーショット — she leans in at your right cheek for a selfie
    E.setStep(4); E.S.view = 'front';
    await wait(.6);
    await say('a23', 'near');
    E.fx.rustle(1, .3); E.S.view = 'photo'; E.amb('cheek', 'warm', 75, .22); await wait(.8);
    await say('a24', 'right');
    await E.action('📸', 'チーズ！', 'Cheese!', 20, 'チーズ|ちーず|cheese|はい チーズ|茄子|茄子！|cheese！|치즈|김치'); E.alive(my);
    G.flash = E.S.t; E.fx.pop(0, .5); E.fx.sparkle(0, .6, 5);
    await wait(1);
    await say('a25', 'right');
    E.amb('cheek', 'warm', 75, 0);
    await wait(.8);
    // ⑥ プレゼント — her straw hat, put on your head (no thermal: a hat is not warm or cold)
    E.setStep(5); E.S.view = 'gift';
    await wait(.8);
    await say('a26', 'near');
    await wait(.3); E.fx.rustle(0, .2); G.hat = E.S.t;
    await say('a27', 'near');
    await wait(.8);
    // ⑦ またね — call her name, a thank-you at the right ear, a promise at the left, then back to the stage
    E.setStep(6); E.S.view = 'front';
    await wait(.6);
    await say('a28', 'near');
    await E.action('', '綾音！', 'Ayane!', 20, 'あやね|綾音|アヤネ|あやねちゃん|ayane|绫音|綾音|아야네'); E.alive(my);
    E.fx.rustle(1.2, .3); E.S.view = 'earR'; await wait(1.2);
    await say('a29', 'right_ear');
    await wait(1.4); E.fx.rustle(-1.2, .3); E.S.view = 'earL'; await wait(1.2);
    await say('a30', 'left_ear');
    await E.action('', 'うん、約束！', 'I promise!', 20, 'やくそく|約束|うん|また来る|また来るね|promise|i promise|see you|yes|约定|一定|我会再来|약속|또 올게'); E.alive(my);
    await wait(.4); E.fx.steps(0, .15, 5, 2.2, true); E.S.view = 'stage'; G.lights = 1; await wait(1.4);
    await say('a31', 'stage');
    await wait(1.6); G.lights = 0; E.S.fade = 1; await wait(2);
  }
  async function flaps(E, my, az, n) {   // uchiwa flaps: a short cool puff on that ear each time, ~0.75 s apart
    for (let i = 0; i < n; i++) { E.fx.whoosh(az * Math.PI / 180, .4, .35); E.pulse('fan', 'cool', az, .55 + .35 * (i % 2), .12, .15, .35); G.flaps.push({ t: E.S.t, side: az < 0 ? 'left' : 'right' }); await E.sleep(.75); E.alive(my); }
  }

  const API = ST.run({
    ns: 'AFM', data: { who: { A: '綾音' }, lines: LINES, steps: STEPS }, voice: window.AFM_VOICE, bg: '#2a1a26', firstView: 'stage', sample: false,
    preload: ['stage', 'front', 'hands', 'earL', 'earR', 'fan', 'drink', 'photo', 'gift'],
    // voice heat computed in sources() (the built-in curve saturates, Demo52): built-in layer off (distance 0), cfg.pos places the voices
    plan: { events: {}, smoothing: { warm_rise: .4, warm_fall: .8 }, voice: { az: {}, distance: { stage: 0, near: 0, right: 0, left_ear: 0, right_ear: 0 }, front_split: .5 } },
    pos: { stage: { az: -.25, dist: 3 }, near: { az: 0, dist: .7 }, right: { az: 1.15, dist: .3 }, left_ear: { az: -1.35, dist: .12 }, right_ear: { az: 1.35, dist: .12 } },
    icons: { breath: '💨', coolbreath: '🌬', soda: '🥤', bottle: '🥤', fan: '🪭', fanR: '🪭', cheek: '☺', lights: '💡' },
    update(dt, E) { VE = VE + ((E.S.started ? E.S.lv || 0 : 0) - VE) * (1 - Math.exp(-dt / ((E.S.lv || 0) > VE ? .3 : .8))); },
    sources(add, E) {
      const S = E.S; if (!S.started) return;
      if (G.lights > .01 && (S.view === 'stage' || S.view === 'front')) add(0, 'warm', .12 * G.lights, '💡');   // the warm spotlights over the stage / your table (low base)
      if (S.env < .5) return; const k = (r) => Math.min(1, VE / r), pn = S.posName;
      if (pn === 'left_ear' || pn === 'right_ear') add(pn === 'left_ear' ? -90 : 90, 'warm', .1 + .7 * k(.09));   // at the ear: the felt peak
      else if (pn === 'right') add(70, 'warm', .08 + .32 * k(.15));   // her cheek next to yours (photo / the soda)
      else if (pn === 'near') add(0, 'warm', .04 + .2 * k(.2));
      else add(-15, 'warm', .02 + .06 * k(.2));   // from the stage: faint
    },
    script: flow,
    draw(E, dt) {   // every warmth / coolness has a visible source in the frame
      const K = E.K, S = E.S, t = S.t;
      if (G.lights > .01 && (S.view === 'stage' || S.view === 'front')) for (const x of [.33, .42, .5, .58, .67]) E.glow(x * W, .1 * H, 220, '255,200,120', .12 * G.lights);
      // her voice at your ear: a soft warm glow on that side, with the loudness
      const v = Math.min(1, VE / .09) * (S.env || 0);
      if (S.posName === 'left_ear' || S.posName === 'right_ear') E.edge(S.posName === 'left_ear' ? 'left' : 'right', '255,150,110', .3 * v, .22);
      for (const pl of E.pulses) if (pl.name === 'coolbreath') { E.edge('left', '140,205,255', .4 * pl.lev, .28); if (Math.random() < .5) E.puff({ x: rnd(20, 260), y: rnd(.35, .65) * H, vx: -60, vy: -10, r: 26, grow: 50, max: 1.2, rgb: '210,238,255', a: .18 }); }
      for (const pl of E.pulses) if (pl.name === 'breath') { E.edge('left', '255,170,120', .4 * pl.lev, .28); if (Math.random() < .5) E.puff({ x: rnd(20, 260), y: rnd(.35, .65) * H, vx: -40, vy: -15, r: 30, grow: 50, max: 1.4, rgb: '255,210,180', a: .16 }); }
      // the cold soda at your right cheek: frost glints + a blue edge on the right
      const cold = Math.max(K.soda || 0, K.bottle || 0);
      if (cold > .02) { E.edge('right', '120,200,255', .38 * cold, .26); if (Math.random() < dt * 30 * cold) E.spark(W - rnd(20, 300), rnd(.25, .8) * H, { rgb: '210,240,255', vy: rnd(-30, 30), max: rnd(.5, 1), r: rnd(1.5, 3) }); }
      if (G.frost && S.view === 'drink' && Math.random() < dt * 14) E.spark(W * rnd(.42, .58), H * rnd(.55, .78), { rgb: '220,245,255', vy: rnd(-20, 20), max: rnd(.6, 1.1), r: rnd(1.5, 3) });
      // the uchiwa breeze: blue streaks blowing in from that side
      const fanL = Math.max(0, ...E.pulses.filter((p) => p.name === 'fan' && p.az < 0).map((p) => p.lev)), fanR = Math.max(K.fanR || 0, ...E.pulses.filter((p) => p.name === 'fan' && p.az > 0).map((p) => p.lev));
      for (const [side, lev] of [['left', fanL], ['right', fanR]]) if (lev > .02) {
        E.edge(side, '120,200,255', .3 * lev, .24);
        if (Math.random() < dt * 40 * lev) E.puff({ x: side === 'left' ? -20 : W + 20, y: rnd(.15, .85) * H, vx: (side === 'left' ? 1 : -1) * rnd(700, 1100), vy: rnd(-20, 20), r: rnd(6, 12), grow: 30, drag: 1.2, max: .7, rgb: '200,235,255', a: .35 });
      }
      // her cheek next to yours (photo): a faint warm glow on the right
      if ((K.cheek || 0) > .02) E.edge('right', '255,170,130', .22 * K.cheek / .22, .2);
      const fl = t - G.flash; if (fl >= 0 && fl < .5) { E.ctx.fillStyle = `rgba(255,255,255,${.85 * (1 - fl / .5)})`; E.ctx.fillRect(0, 0, W, H); }
    },
  });
  function rnd(a, b) { return a + Math.random() * (b - a); }
  API.E.zh('うん、来たよ！', '嗯，我来了！'); API.E.zh('握手する', '握手'); API.E.zh('チーズ！', '茄子！'); API.E.zh('綾音！', '绫音！'); API.E.zh('うん、約束！', '嗯，一言为定！');
})();
