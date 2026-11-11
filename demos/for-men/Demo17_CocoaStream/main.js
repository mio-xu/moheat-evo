// 『ココアの、バレンタイン前夜』 — Cocoa (甘音ココア, original character), 22, sweet and a little teasing, runs a tiny patisserie.
// The night before Valentine's Day, after closing, snow outside: she lets you in, asks you to help her make chocolates, melts them
// in a bain-marie in front of you, whips cream with her hands over yours from behind, feeds you a heart cookie fresh from the oven,
// writes a message she won't let you see — and tells you, at your left ear, who it was for.
// DUAL thermal: her voice is always warm at the ear she speaks at; the snowy night at the door, the oven on your RIGHT (steady, then a
// hot rush when it opens), the bain-marie steam in front, her fu-fu (a cool puff), the fridge on your LEFT are the ambient layer —
// often on the same ear at once (oven-warm right + cool puff, fridge-cool left + her voice). Built on Demo31's main.js (Demo25's
// framework: choices / action / hold, thermal model, device panel); art = the layered standard (media/layers.js + shared/layers.js).
// Runs on the shared engine (demos/shared/engine: UI wiring, choices / action / hold, clip player, thermal model, device panel —
// engine P3, 2026-11-11); this file holds the story, its sounds' timing, its thermal sources and its overlays.
(() => {
  const ME = window.MoHeatEngine, $ = ME.$, QS = ME.QS, AUTO = ME.AUTO, ALT = ME.ALT, clamp = ME.clamp, sleep = ME.sleep;
  const SND = window.HTAudio, LINES = window.COCOA_LINES, W = 1920, H = 1080;

  // ---------------------------------------------------------------- state
  const fresh = () => ({ started: false, t: 0, clock: 0, view: 'welcome', cold: 1, oven: 0, ovenBurst: 0, steam: 0, puff: 0, fridge: 0,
    cheek: 0, fade: 0, lv: 0, env: 0, pos: { az: 0, dist: .8 }, end: 0 });
  let S = fresh();
  const STEPS = [['welcome', '閉店後のお店で', 'After closing'], ['melt', 'チョコを溶かす', 'Melting chocolate'], ['whisk', '生クリーム', 'Whipped cream'],
    ['cookie', '焼きたてクッキー', 'Fresh cookies'], ['piping', 'メッセージ', 'The message']];
  const PLACE = { welcome: 'the shop · after closing', melt: 'the counter · bain-marie', whisk: 'the counter · she is behind you',
    cookie: 'the counter · oven on your right', piping: 'the counter · the message', whisper: 'the counter · at your ear', ending: 'the window · midnight' };

  // ---------------------------------------------------------------- the engine (demos/shared/engine): art, UI, voice, choices, thermal, device
  const E = ME.create({
    ns: 'COCOA', sound: SND, lines: LINES, state: () => S,
    reset() { S = fresh(); coldK = 1; ovenK = burstK = steamK = puffK = fridgeK = cheekK = 0; },
    steps: STEPS, place: PLACE, restSec: 1.5,
    views: ['welcome', 'melt', 'whisk', 'cookie', 'piping', 'whisper', 'ending'], src: (n) => `media/art/cocoa_${n}.jpg?v=1`, blank: '#2a1a16',
    clips: [],   // add v_<view> loops and t_<from>_<to> transitions here once clips exist (handoff §4b); ?stills = no video
    thermal: { modeGuard: 0, timing: true },   // the per-ear timing rules of shared/story.js (as this demo had them)
    sources, update, draw, story,
    onFinish() { for (const k of ['wind', 'shop', 'oven', 'bain', 'whisk']) SND.loop(k)?.stop(); },
    endText: (S) => (S.end ? '🍫 来年も、いっしょに。 · Next year too, together' : '🍫 いちばんおっきいの、あなたの。 · The biggest one is yours'),
  });
  const { say, choice, action, hold, go, alive } = E, ctx = E.ctx, actEl = $('act');

  // ---------------------------------------------------------------- your turn: the engine's choice / action / hold + this demo's own
  // whisking: hold to whisk until the cream stands; let go part-way and she nudges you once (c09x) → resolves when the cream is done
  function whiskHold(sec, onNudge) {
    return new Promise((res) => {
      actEl.innerHTML = `<button class="act-btn hold"><i>🥣</i><b>混ぜる（長押し）</b><span>Whisk (press and hold)</span><em class="bar"><u></u></em></button>`; actEl.classList.add('show');
      const b = actEl.querySelector('button'), bar = b.querySelector('u'); let down = false, k = 0, upFor = 0, nudged = false, last = performance.now(); const t0 = last;
      const autoLet = AUTO && ALT;
      const set = (v) => (e) => { e?.preventDefault?.(); down = v; b.classList.toggle('down', v); };
      b.addEventListener('pointerdown', set(true)); for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, set(false));
      const key = (v) => (e) => { if (e.code === 'Space') { e.preventDefault(); down = v; b.classList.toggle('down', v); } };
      const kd = key(true), ku = key(false); addEventListener('keydown', kd); addEventListener('keyup', ku);
      const W_ = SND.loop('whisk');
      const tick = () => {
        const n = performance.now(), dt = (n - last) / 1000; last = n;
        const holding = down || (AUTO && !(autoLet && !nudged && k > .4 && upFor < .8)) || n - t0 > 20000;
        if (holding) { k = Math.min(1, k + dt / sec); upFor = 0; } else if (k > .05) upFor += dt;
        W_?.set(holding ? .5 : 0, .05); S.whisk = holding ? 1 : 0;
        bar.style.width = `${k * 100}%`;
        if (upFor > .6 && !nudged) { nudged = true; onNudge?.(); }
        if (k >= 1) { removeEventListener('keydown', kd); removeEventListener('keyup', ku); W_?.stop(); S.whisk = 0; actEl.classList.remove('show'); actEl.innerHTML = ''; res(); return; }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  // ---------------------------------------------------------------- the story
  // where she is: across the counter in front, behind you at your right ear (whisking), at your left ear (the answer)
  const DOOR = { az: -.3, dist: 1.4 }, FRONT = { az: 0, dist: .8 }, NEAR = { az: .05, dist: .45 }, SPOON = { az: 0, dist: .3 },
    RIGHT_EAR = { az: 1.35, dist: .14 }, LEFT_EAR = { az: -1.35, dist: .12 }, LEFT = { az: -.7, dist: .5 };
  async function story(my) {   // the engine starts it (run token my) and catches the stop when a new run / finish begins
    // 1 · after closing: snowy wind at the door, the bell — she lets you in, the door shuts, the oven hums on your right
    E.setStep(0); S.view = 'welcome';
    const wind = SND.loop('wind'), shop = SND.loop('shop'), oven = SND.loop('oven');
    wind?.set(.45, .4); shop?.set(.0); await sleep(1.2);
    SND.fx.bell(-2.6); await sleep(.9);
    await say('c01', DOOR);
    SND.fx.doorShut(-2.6); wind?.set(.05, .5); S.cold = 0; shop?.set(.5, 1); oven?.set(.35, 1.5); S.oven = 1;
    SND.fx.steps(-1.2, -.2, 4, .35); await sleep(1.4); alive(my);
    await say('c02', FRONT);
    const a = await choice([['いいよ、手伝う', 'Sure, I\'ll help'], ['…誰にあげるの？', '…Who are they for?']]);
    if (!a) { await say('c03a', FRONT); SND.fx.rustle(2.6, .4); await sleep(.8); SND.fx.rustle(-2.6, .35); }
    else await say('c03b', FRONT);
    alive(my); await sleep(.5);

    // 2 · the bain-marie: chocolate chopped and melted in front of you (steam), a spoonful — fu-fu (a cool puff) — to taste
    E.setStep(1);
    await go(null, 'melt', () => {});
    SND.fx.chop(7); await sleep(2.2); alive(my);
    const bain = SND.loop('bain'); bain?.set(.4, 1); S.steam = 1;
    await say('c04', NEAR);
    setTimeout(() => { if (my === E.run) S.puff = 1; }, 2300); setTimeout(() => { if (my === E.run) S.puff = 1; }, 3000);   // her two fu-fu on the spoon
    await say('c05', SPOON);
    const b = await choice([['ちょうどいい', 'It\'s just right'], ['もっと甘くして', 'Make it sweeter']]);
    await say(b ? 'c06b' : 'c06a', NEAR);
    bain?.set(0, 1); S.steam = 0; alive(my); await sleep(.4);

    // 3 · the fridge on your left (a cold breath on the left ear), then she whisks with you from behind — at your right ear
    E.setStep(2);
    SND.fx.fridgeOpen(-1.35); S.fridge = 1; await sleep(2); alive(my);      // beat 1: the open fridge (left of the picture) — cold on your left ear alone
    SND.fx.fridgeClose(-1.35); S.fridge = 0; await sleep(1); alive(my);       // shut; the cold fades
    await say('c07', LEFT);                                                   // beat 2: "Brr…!" at your left — her voice warms the same ear (cold → warm, ≥ 1 s apart)
    await go(null, 'whisk', () => { SND.fx.rustle(1.6, .25); });
    await say('c08', RIGHT_EAR);
    await whiskHold(6, () => { if (my === E.run) say('c09x', RIGHT_EAR).catch(() => {}); });
    alive(my); await sleep(.3);
    await say('c09', RIGHT_EAR);
    alive(my); await sleep(.5);

    // 4 · the oven timer: the door opens on your right (a hot rush), a heart cookie — fu-fu, cool — "aah"
    E.setStep(3);
    SND.fx.ding(1.35); await sleep(1.2);
    SND.fx.ovenOpen(1.35); S.ovenBurst = 1; setTimeout(() => { if (my === E.run) S.ovenBurst = 0; }, 3500);
    await go(null, 'cookie', () => {});
    await say('c10', NEAR);
    setTimeout(() => { if (my === E.run) S.puff = 1; }, 250); setTimeout(() => { if (my === E.run) S.puff = 1; }, 950);
    await say('c11', SPOON);
    await action('🍪', '食べる', 'Eat it', 15);
    SND.fx.crunch(); await sleep(.9); alive(my);
    await say('c12', NEAR);
    alive(my); await sleep(.4);

    // 5 · the message: close your eyes (or peek) — then her answer at your left ear, and midnight
    E.setStep(4);
    await go(null, 'piping', () => {});
    SND.fx.pipe(.1);
    await say('c13', NEAR);
    const c = await choice([['目をつぶる', 'Close my eyes'], ['…ちょっとだけ見る', '…Just a little peek']]);
    await say(c ? 'c14b' : 'c14a', NEAR);
    await say('c15', NEAR);
    await go(null, 'whisper', () => { S.cheek = 1; SND.fx.rustle(-1.3, .2); });
    await sleep(.3);
    await say('c16', LEFT_EAR);
    await say('c17', LEFT_EAR);
    S.end = await choice([['…俺も、好き', '…I like you too'], ['来年も、一緒に作ろう', 'Let\'s make them together next year too']]);
    await say(S.end ? 'c18b' : 'c18a', LEFT_EAR);
    await go(null, 'ending', () => { S.cheek = 0; });
    SND.fx.chime(-.5); await sleep(2.2);
    await say('c19', { az: -.4, dist: .35 });
    await sleep(2.5); S.fade = 1; oven?.set(.1, 2); shop?.set(.15, 2); await sleep(3.2); alive(my); E.finish();
  }

  // ---------------------------------------------------------------- per-frame state + thermal
  let coldK = 1, ovenK = 0, burstK = 0, steamK = 0, puffK = 0, fridgeK = 0, cheekK = 0;
  function update(dt) {   // while the story runs (the engine has already moved S.t / S.clock / S.lv / S.vlv / S.env)
    const ease = (cur, tgt, up, down) => cur + (tgt - cur) * (1 - Math.exp(-dt / (tgt > cur ? up : down)));
    coldK = ease(coldK, S.cold, .3, 1.2); ovenK = ease(ovenK, S.oven, 2, 2); burstK = ease(burstK, S.ovenBurst, .25, 1.4);
    steamK = ease(steamK, S.steam, .8, 1); fridgeK = ease(fridgeK, S.fridge, .2, .6); cheekK = ease(cheekK, S.cheek, .5, .8);
    puffK = Math.max(0, puffK - dt * .6); if (S.puff) { puffK = 1; S.puff = 0; }   // a puff lasts ~1.6 s: long enough to be felt as cool after the warm steam (guide §3 节奏)
  }
  // Thermal, two layers (firmware DUAL: cool and heat independent on each ear — CLAUDE.md, 2026-11-08).
  //  · VOICE: a voice is warm. Her loudness (0.1 + 0.8 × level) warms the ear she speaks at — × 1 right at your ear, × 0.6 within
  //    50 cm, × 0.28 further; halved when she is straight in front.
  //  · AMBIENT (real things next to your ears): the snowy night while the door is open (both cool), the oven a metre to your right
  //    (steady mild warmth, a hot rush when its door opens), the bain-marie steaming in front of your face (both mildly warm), her
  //    fu-fu toward you (a quick cool puff on both ears — while the oven still warms the right one: DUAL), the fridge door on your
  //    left (cool while open, while her voice warms the left), her cheek at your left ear in the ending.
  //    Not heated / cooled: the taste of chocolate, the cookie in your mouth, her blush.
  function sources() {
    const out = [], add = (az, k, s, icon) => { if (s > .01) out.push({ az, k, s, icon }); };
    if (!S.started) return out;
    const P = S.pos;
    if (E.talking()) add(P.az, 'h', (1 - Math.min(1, puffK * 1.5)) * (.1 + .8 * clamp(S.vlv * 8)) * (P.dist < .15 ? 1 : P.dist <= .5 ? .6 : .28) * (Math.abs(P.az) < .5 ? .5 : 1), '💬');
    if (coldK > .02) add(0, 'c', .4 * coldK, '❄️');
    if (ovenK > .02) add(1.35, 'h', .2 * ovenK + .5 * burstK, '♨️');
    if (steamK > .02) add(0, 'h', .2 * steamK, '🍫');
    if (puffK > .02) add(0, 'c', .65 * Math.min(1, puffK * 2), '💨');   // the two fu-fu are one cool breath (a second puff keeps it up instead of restarting it)
    if (fridgeK > .02) add(-1.35, 'c', .5 * fridgeK, '🧊');
    if (cheekK > .02) add(-1.3, 'h', .3 * cheekK, '🤍');
    return out;
  }

  // ---------------------------------------------------------------- drawing: the engine's stills + this demo's overlays
  function draw(t, dt) {
    E.stage.draw(t, dt);   // the stills, cross-faded (shared/engine/stage.js)
    if (S.fade) { S.fadeA = Math.min(1, (S.fadeA || 0) + dt / 3); ctx.fillStyle = `rgba(30,18,14,${S.fadeA})`; ctx.fillRect(0, 0, W, H); }
  }

  E.boot();
})();
