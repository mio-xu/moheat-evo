// 『ルナの、ひみつのカクテル』 — Luna (宵月ルナ, original character; the late-night streamer of the old live-stream demo), 25, cool and
// quietly teasing. After last orders in a small basement bar on a rainy night she is the secret bartender: she shakes a drink and presses
// the iced shaker to your right cheek, makes a cocktail from one word you give her and sets it alight (a blue flame in front of you —
// don't blink), closes the bar, sits on your left with two Irish coffees, toasts with you (say it), and tells you her real name at your
// left ear. Script: project/script.md (v1, approved).
// DUAL thermal shows off MoHeat Evo: the iced shaker cools your right cheek WHILE her whisper warms the same ear; the blue flame warms
// both ears from the front, then the door bangs open and the rainy draft cools the left (warm → cool in a second); the hot Irish coffee
// in front + her shoulder at your left + her whisper at the left ear. Built on Demo17's main.js (choices / action / hold, thermal model,
// device panel); art = the layered standard (media/layers.js + shared/layers.js).
// Runs on the shared engine (demos/shared/engine: UI wiring, choices / action / hold, clip player, thermal model, device panel —
// engine P3, 2026-11-11); this file holds the story, its sounds' timing, its thermal sources and its overlays.
(() => {
  const ME = window.MoHeatEngine, $ = ME.$, QS = ME.QS, AUTO = ME.AUTO, ALT = ME.ALT, clamp = ME.clamp, sleep = ME.sleep;
  const SND = window.HTAudio, LINES = window.LUNA_LINES, W = 1920, H = 1080;

  // ---------------------------------------------------------------- art: one still per view (layered: shared/layers.js draws the live composite)
  const FLAME_AT = [.488, .612];   // the drink in her hand in the flame view (frame fraction) — the code flame / glow sits on it

  // ---------------------------------------------------------------- state
  const fresh = () => ({ started: false, t: 0, clock: 0, view: 'counter', door: 0, shaker: 0, flame: 0, coffee: 0, beside: 0, dim: 0,
    fade: 0, lv: 0, env: 0, pos: { az: 0, dist: .8 }, end: 0 });
  let S = fresh();
  const STEPS = [['counter', 'ラストオーダーのあと', 'After last orders'], ['shake', 'シェイカー', 'The shaker'], ['flame', 'あなたのためのカクテル', 'A cocktail for you'],
    ['sit', 'カウンターのこっち側', 'This side of the counter'], ['whisper', '本当の名前', 'Her real name']];
  const PLACE = { counter: 'the counter · after last orders', shake: 'the counter · the shaker', lean: 'the counter · at your right cheek',
    flame: 'the counter · lights down', sit: 'the stool on your left', whisper: 'at your left ear' };

  // ---------------------------------------------------------------- the engine (demos/shared/engine): art, UI, voice, choices, thermal, device
  const E = ME.create({
    ns: 'LUNA', sound: SND, lines: LINES, state: () => S,
    reset() { S = fresh(); doorK = shakerK = flameK = coffeeK = besideK = dimK = 0; },
    steps: STEPS, place: PLACE, restSec: 1.5,
    views: ['counter', 'shake', 'lean', 'flame', 'sit', 'whisper'], src: (n) => `media/art/luna_${n}.jpg?v=1`, blank: '#0e1122',
    thermal: { modeGuard: 0, timing: true },   // the per-ear timing rules of shared/story.js (as this demo had them)
    sources, update, draw, story,
    onFinish() { for (const k of ['rain', 'room', 'jazz', 'flame']) SND.loop(k)?.stop(); },
    endText: (S) => (S.end ? '🍸 いちばん端の席 · The end seat, kept for you' : '🌙 「つき」と呼んだ夜 · The night you called her Tsuki'),
  });
  const { say, choice, action, go, alive } = E, ctx = E.ctx, actEl = $('act');

  // ---------------------------------------------------------------- your turn: the engine's choice / action + this demo's own
  // watching the flame: hold to keep your eyes on it until it burns down; let go part-way and you "blinked" → resolves false (she shows it
  // again), finishing resolves true. No touch at all for 18 s also finishes (the story never stalls).
  function watchHold(sec, allowSlip) {
    return new Promise((res) => {
      actEl.classList.add('act-side'); actEl.innerHTML = `<button class="act-btn hold"><i>👁</i><b>見つめる（長押し）</b><span>Watch the flame (press and hold)</span><em class="bar"><u></u></em></button>`; actEl.classList.add('show');
      const b = actEl.querySelector('button'), bar = b.querySelector('u'); let down = false, k = 0, upFor = 0, last = performance.now(); const t0 = last;
      const set = (v) => (e) => { e?.preventDefault?.(); down = v; b.classList.toggle('down', v); };
      b.addEventListener('pointerdown', set(true)); for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, set(false));
      const key = (v) => (e) => { if (e.code === 'Space') { e.preventDefault(); down = v; b.classList.toggle('down', v); } };
      const kd = key(true), ku = key(false); addEventListener('keydown', kd); addEventListener('keyup', ku);
      const end = (ok) => { removeEventListener('keydown', kd); removeEventListener('keyup', ku); actEl.classList.remove('show', 'act-side'); actEl.innerHTML = ''; res(ok); };
      const tick = () => {
        const n = performance.now(), dt = (n - last) / 1000; last = n;
        const holding = down || (AUTO && !(ALT && allowSlip && k > .35)) || (k === 0 && n - t0 > 18000);
        if (holding) { k = Math.min(1, k + dt / sec); upFor = 0; } else if (k > .08) upFor += dt;
        bar.style.width = `${k * 100}%`; S.watch = holding ? 1 : 0;
        if (allowSlip && upFor > .5) return end(false);
        if (!allowSlip && !holding && n - t0 > 18000) k = Math.min(1, k + dt / sec);
        if (k >= 1) return end(true);
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  // ---------------------------------------------------------------- the story
  // you sit at the counter: she is across it in front of you, leans in to your right cheek, then sits on your LEFT (the door side)
  const FRONT = { az: 0, dist: .9 }, NEAR = { az: .05, dist: .5 }, CHEEK_R = { az: .9, dist: .3 }, LEFT = { az: -.9, dist: .45 },
    LEFT_EAR = { az: -1.35, dist: .12 };
  async function story(my) {   // the engine starts it (run token my) and catches the stop when a new run / finish begins
    // 1 · after last orders: jazz from the jukebox (right), rain behind the door (left) — the last guest leaves: the door opens (the
    //     rainy draft on your left), the bell, it shuts
    E.setStep(0); S.view = 'counter';
    const rain = SND.loop('rain'), room = SND.loop('room'), jazz = SND.loop('jazz');
    rain?.set(.18, .5); room?.set(.35, 1); jazz?.set(.5, 1.5);
    await sleep(1.2); SND.fx.steps(6); await sleep(.8);
    SND.fx.door(); S.door = 1; rain?.set(.6, .3); rain?.tone(4200); await sleep(.25); SND.fx.bell(); await sleep(2.4); alive(my);
    SND.fx.doorShut(); S.door = 0; rain?.set(.18, .4); rain?.tone(700); await sleep(1.2); alive(my);
    await say('l01', FRONT);
    await say('l02', FRONT);
    await say('l03', FRONT);
    const a = await choice([['おまかせで', 'Leave it to you'], ['いちばん強いのを', 'Your strongest one']]);

    // 2 · the shaker: ice in, shaken in front of you — then she leans across and presses the frosted shaker to your RIGHT cheek
    //     (cool) while her whisper warms the same ear (DUAL), and slides the glass over
    E.setStep(1); await go(null, 'shake'); await sleep(.2);
    await say(a ? 'l04b' : 'l04a', FRONT);
    SND.fx.ice(); S.chill = 1; await sleep(1.1); SND.fx.shake(-.2, 16); await sleep(3); S.chill = 0; alive(my);   // the iced shaker in front of your face: a cool breath on both ears, then the warm whisper (cold → warm)
    await go(null, 'lean', () => { SND.fx.rustle(.3, .5); });
    SND.fx.touch(); S.shaker = 1;
    await say('l05', CHEEK_R, { gain: 1.6 });
    await sleep(1.4); alive(my);
    await say('l06', CHEEK_R, { gain: 1.6 });
    S.shaker = 0; SND.fx.rustle(.4, .5);
    await go(null, 'counter'); SND.fx.pour(-.05, 1.3); await sleep(1.5); SND.fx.slide(); await sleep(.4); alive(my);
    await action('🍸', 'グラスを受け取る', 'Take the glass', 15);
    alive(my); await sleep(.4);

    // 3 · a cocktail from one word: the lights dim, the drink catches — a blue flame in front of you (warm on both ears, flickering);
    //     hold to keep watching (let go = you blinked, she lights it again); then the door bangs open in the wind: the rainy draft on
    //     your left right after the flame (warm → cool)
    E.setStep(2);
    await say('l07', FRONT);
    const b = await choice([['月', 'The moon', 'つき|月|ムーン|moon'], ['夜明け', 'Dawn', 'よあけ|夜明け|あけがた|dawn|sunrise']]);
    await say(b ? 'l08b' : 'l08a', FRONT);
    SND.fx.click(); S.dim = 1; jazz?.set(.3, 1); await go(null, 'flame'); await sleep(.5);
    SND.fx.ignite(); await sleep(.3); S.flame = 1; const fl = SND.loop('flame'); fl?.set(.35, .3);
    await say('l09', NEAR);
    let ok = await watchHold(5, true); alive(my);
    if (!ok) {
      SND.fx.snuff(); S.flame = 0; fl?.set(0, .2); await sleep(.6);
      await say('l10x', NEAR);
      SND.fx.ignite(); await sleep(.3); S.flame = 1; fl?.set(.35, .3);
      ok = await watchHold(4, false); alive(my);
    }
    await say('l10', NEAR);
    SND.fx.snuff(); S.flame = 0; fl?.set(0, .3); await sleep(.7); alive(my);
    SND.fx.door(); S.door = 1; rain?.set(.75, .2); rain?.tone(5000); await sleep(2.6); alive(my);   // the draft right after the flame
    SND.fx.steps(3); await sleep(.9); SND.fx.doorShut(); S.door = 0; rain?.set(.14, .5); rain?.tone(700);
    setTimeout(() => SND.loop('flame')?.stop(), 800);
    await sleep(.8); alive(my);

    // 4 · this side of the counter: closed for tonight — she sits on the stool on your LEFT (her shoulder warm), two Irish coffees,
    //     the hot glass in front of your face; a toast — say it
    E.setStep(3); S.dim = .5; jazz?.set(.38, 1);
    await go(null, 'sit', () => { SND.fx.stool(); S.beside = 1; });
    await say('l11', LEFT);
    SND.fx.pour(-.4, 1.8); await sleep(1.6); S.coffee = 1; alive(my);
    await say('l12', LEFT);
    await say('l13', LEFT);
    const c = await choice([['「ふたりの夜に」', '"To our night"', 'ふたりの夜に|二人の夜に|ふたりのよる|our night|to us'], ['「ルナに」', '"To Luna"', 'ルナに|るなに|ルナ|to luna|luna']]);
    SND.fx.cheers(); await sleep(.9); alive(my);
    await say(c ? 'l14b' : 'l14a', LEFT);

    // 5 · her real name, at your left ear (her whisper warm on the left; the coffee still warm in your hands)
    E.setStep(4);
    await go(null, 'whisper', () => { SND.fx.rustle(-1.3, .2); S.coffee = .6; });
    await sleep(.3);
    await say('l15', LEFT_EAR);
    await say('l16', LEFT_EAR);
    S.end = await choice([['「つき」と呼ぶ', 'Call her "Tsuki"', 'つき|月|ツキ|tsuki|つきさん'], ['また来てもいい？', 'Can I come again?', 'またきてもいい|また来る|また来ていい|come again|again']]);
    await say(S.end ? 'l17b' : 'l17a', LEFT_EAR);
    await sleep(2.2); S.fade = 1; jazz?.set(.15, 2); rain?.set(.1, 2); await sleep(3.2); alive(my); E.finish();
  }

  // ---------------------------------------------------------------- per-frame state + thermal
  let chillK = 0, doorK = 0, shakerK = 0, flameK = 0, coffeeK = 0, besideK = 0, dimK = 0;
  function update(dt) {   // while the story runs (the engine has already moved S.t / S.clock / S.lv / S.vlv / S.env)
    const ease = (cur, tgt, up, down) => cur + (tgt - cur) * (1 - Math.exp(-dt / (tgt > cur ? up : down)));
    doorK = ease(doorK, S.door, .25, .9); chillK = ease(chillK, S.chill || 0, .3, .6); shakerK = ease(shakerK, S.shaker, .15, .5); flameK = ease(flameK, S.flame, .3, .4);
    coffeeK = ease(coffeeK, S.coffee, .8, 1.2); besideK = ease(besideK, S.beside, 1, 1); dimK = ease(dimK, S.dim, .6, 1);
  }
  // Thermal, two layers (firmware DUAL: cool and heat independent on each ear — CLAUDE.md, 2026-11-08).
  //  · VOICE: a voice is warm. Her loudness (0.1 + 0.8 × level) warms the ear she speaks at — × 1 right at your ear, × 0.6 within
  //    50 cm, × 0.28 further; halved when she is straight in front.
  //  · AMBIENT (real things next to your ears): the rainy draft while the door at the foot of the stairs on your left is open (left cool
  //    0.4–0.5), the frosted shaker pressed to your right cheek (right cool 0.65 — while her voice warms the right ear), the blue flame
  //    on the drink in front of you (both warm 0.35, flickering), the hot Irish coffee held in front of your face (both warm 0.25), her
  //    shoulder against yours on the left (left warm 0.2).
  //    Not heated: the alcohol, her blush, the "strong" drink.
  function sources() {
    const out = [], add = (az, k, s, icon) => { if (s > .01) out.push({ az, k, s, icon }); };
    if (!S.started) return out;
    const P = S.pos;
    if (E.talking()) add(P.az, 'h', ME.thermal.voice(P, S.vlv), '💬');
    if (doorK > .02) { add(-1.3, 'c', .45 * doorK, '🌧'); add(1.3, 'c', .15 * doorK, '🌧'); }   // the draft fills the room: strong on the left (the door), faint on the right
    if (chillK > .02) add(0, 'c', .25 * chillK, '🧊');   // the frosted shaker shaken a hand's width in front of you
    if (shakerK > .02) add(1.35, 'c', .65 * shakerK, '🧊');
    if (flameK > .02) add(0, 'h', flameK * (.3 + .1 * Math.sin(S.t * 13) * Math.sin(S.t * 7.3)), '🔥');
    if (coffeeK > .02) add(0, 'h', .25 * coffeeK, '☕');
    if (besideK > .02) add(-1.3, 'h', .2 * besideK, '🤍');
    return out;
  }

  // ---------------------------------------------------------------- drawing: stills (layered), cross-fades, the flame, the dark
  function drawFlame(t) {   // the blue flame on her drink: a flickering glow + a few tongues (code, over the still)
    if (flameK < .02 || S.view !== 'flame') return;
    const x = FLAME_AT[0] * W, y = FLAME_AT[1] * H, k = flameK, f = .85 + .15 * Math.sin(t * 17) * Math.sin(t * 5.3);
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    let g = ctx.createRadialGradient(x, y, 0, x, y, 360 * f); g.addColorStop(0, `rgba(90,150,255,${.42 * k})`); g.addColorStop(1, 'rgba(40,60,160,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 400, y - 400, 800, 800);
    for (let i = 0; i < 3; i++) {
      const h = (70 + 30 * Math.sin(t * (9 + i * 3) + i)) * k, w = 22 - i * 5, dx = (i - 1) * 9 + 5 * Math.sin(t * 11 + i);
      g = ctx.createLinearGradient(x, y, x, y - h); g.addColorStop(0, `rgba(120,180,255,${.75 * k})`); g.addColorStop(.6, `rgba(150,200,255,${.4 * k})`); g.addColorStop(1, 'rgba(200,230,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x + dx - w, y); ctx.quadraticCurveTo(x + dx - w * .6, y - h * .6, x + dx + 3 * Math.sin(t * 13 + i), y - h);
      ctx.quadraticCurveTo(x + dx + w * .6, y - h * .6, x + dx + w, y); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  function draw(t, dt) {
    E.stage.draw(t, dt);   // the stills, cross-faded (shared/engine/stage.js; no video clips in this demo, §6.3)
    drawFlame(t);
    if (doorK > .02 && (S.view === 'counter' || S.view === 'flame')) {   // the cold blue rain light from the open door on the left
      const g = ctx.createLinearGradient(0, 0, W * .35, 0); g.addColorStop(0, `rgba(90,130,220,${.22 * doorK})`); g.addColorStop(1, 'rgba(90,130,220,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W * .35, H);
    }
    if (S.fade) { S.fadeA = Math.min(1, (S.fadeA || 0) + dt / 3); ctx.fillStyle = `rgba(14,17,34,${S.fadeA})`; ctx.fillRect(0, 0, W, H); }
  }

  E.boot();
})();
