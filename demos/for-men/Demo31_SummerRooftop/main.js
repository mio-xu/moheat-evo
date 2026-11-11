// 『なつの、おくじょうで』 — Nagisa (original character), 20, your tomboyish childhood friend, home for the summer. A hot summer night
// on the roof of the old apartment block you both grew up in: she turns up — for once — in a yukata (and hates being looked at),
// presses half a soda popsicle to your right cheek, fans you from your left, lights two senko-hanabi for a who-drops-first contest,
// and when the fireworks over the town drown out what she says, she says it again at your left ear. Half of it, anyway.
// DUAL thermal: her voice is always warm at the ear she speaks at; the sea breeze, the popsicle, the paper fan, the two sparklers in
// front of you and her head on your shoulder are the ambient layer. Stills first (video last, user 2026-11-08).
// Same final result and production standard as the hatsumode date (user 2026-11-08). Runs on the shared engine
// (demos/shared/engine: UI wiring, choices / action / hold, clip player, thermal model, device panel — engine P2 pilot, 2026-11-11);
// this file holds only the story, its sounds' timing, its thermal sources and its overlays (sparkler balls, fireworks).
(() => {
  const ME = window.MoHeatEngine, sleep = ME.sleep;
  const SND = window.HTAudio, LINES = window.NAGISA_LINES, MUFFLED = window.NAGISA_MUFFLED, W = 1920, H = 1080;

  // ---------------------------------------------------------------- state
  const fresh = () => ({ started: false, t: 0, clock: 0, view: 'arrive', ice: 0, fan: 0, fanOn: false, fanStrong: false, balls: [0, 0], near: 0,
    lean: 0, breeze: null, flash: 0, fade: 0, lv: 0, env: 0, pos: { az: 0, dist: .8 }, end: 0 });
  let S = fresh();
  const STEPS = [['arrive', '屋上で', 'On the roof'], ['popsicle', 'ソーダアイス', 'Soda popsicle'], ['fan', 'うちわ', 'The paper fan'],
    ['sparkler', '線香花火', 'Sparklers'], ['fireworks', '花火の夜', 'Fireworks']];
  const PLACE = { arrive: 'the rooftop · summer night', popsicle: 'the rooftop · soda popsicle', fan: 'the bench · paper fan', sparkler: 'the bench · sparklers',
    fireworks: 'the bench · fireworks', whisper: 'the bench · at your ear', shoulder: 'the bench · fireworks', laugh: 'the bench · fireworks' };

  // ---------------------------------------------------------------- the engine (demos/shared/engine): art, UI, voice, choices, thermal, device
  const E = ME.create({
    ns: 'NAGISA', sound: SND, lines: LINES, state: () => S,
    reset() { FW_VIEWS.forEach(fwMask); S = fresh(); iceK = fanK = nearK = leanK = 0; ballK = [0, 0]; },   // fwMask: build the fireworks masks early (needs the layer data + images)
    steps: STEPS, place: PLACE,
    views: ['arrive', 'popsicle', 'fan', 'sparkler', 'fireworks', 'whisper', 'shoulder', 'laugh'], src: (n) => `media/art/nagisa_${n}.jpg?v=1`, blank: '#0d1630',
    clips: [],   // add v_<view> loops and t_<from>_<to> transitions here once clips exist (handoff §4b); ?stills = no video
    sources, update, draw, story,
    onFinish() { fireworks(false); FWS.clear(); for (const k of ['night', 'breeze', 'sparkler']) SND.loop(k)?.stop(); },
    endText: (S) => (S.end ? '🎆 ずるいのは、どっち？ · Who\'s the unfair one?' : '🎆 遅いよ、バカ。 · Took you long enough, idiot'),
    api: { fw: (n = 3, big = 1) => salvo(n, big) },   // fw: testing
  });
  const { say, choice, action, go, alive, stillHold } = E, ctx = E.ctx;

  // ---------------------------------------------------------------- weather: a warm sea breeze that sweeps across your head
  async function breeze(from, to, sec, peak = 1) {
    const my = E.run, t0 = performance.now(), B = SND.loop('breeze');
    S.breeze = { az: from, k: 0 };
    while (performance.now() - t0 < sec * 1000) {
      alive(my); const u = (performance.now() - t0) / (sec * 1000);
      S.breeze.az = from + (to - from) * u; S.breeze.k = peak * Math.sin(Math.PI * u);
      B?.at(S.breeze.az, 1.4 - .6 * Math.sin(Math.PI * u)); B?.set(.12 + .4 * S.breeze.k, .1);
      await sleep(.05);
    }
    S.breeze = null; B?.set(.12, .6);
  }
  // far fireworks over the town on your right: a bloom of light now, the boom a little later
  let fwTimer = 0, fwCol = '255,196,90';
  // fireworks = a MIDDLE LAYER (user 2026-11-08): painted bursts (media/art/fw_*.jpg, Seedance) + code sparks from shared/fireworks.js,
  // shown only in the open sky of the rooftop plate (media/art/sky_roof.png, scripts/make_sky_mask.py) with Nagisa (and you, in the
  // close-ups) cut out — built per view from the layer data (background zoom, character placement), so she always stays on top.
  const FW_SPRITES = ['fw_kiku_gold', 'fw_botan_pink', 'fw_yanagi_gold', 'fw_yae_blue', 'fw_senrin', 'fw_ring_purple', 'fw_heart_pink', 'fw_kamuro_silver'];
  const FWS = window.MoHeatFireworks.create();
  // each painted burst is cleaned before use so additive blending can never show its square: the JPEG's near-black noise is crushed
  // to pure black and a round falloff takes everything to 0 well inside the image edges (coordinator review: no box edge may show)
  function prepSprite(im) {
    const S = 512, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
    g.drawImage(im, 0, 0, S, S); const d = g.getImageData(0, 0, S, S), p = d.data;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const i = (y * S + x) * 4, r = Math.hypot(x - S / 2, y - S / 2) / (S / 2), fall = Math.max(0, Math.min(1, (0.97 - r) / 0.12));
      for (let k = 0; k < 3; k++) p[i + k] = Math.max(0, (p[i + k] - 14) * 1.06) * fall;
    }
    g.putImageData(d, 0, 0); return c;
  }
  for (const n of FW_SPRITES) { const im = new Image(); im.onload = () => FWS.sprites.push(prepSprite(im)); im.src = `media/art/${n}.jpg?v=1`; }
  const FW_VIEWS = ['fireworks', 'whisper', 'shoulder', 'laugh'], HORIZON = 378 / 720;   // where shells start: the sea horizon (scripts/make_sky_mask.py RIDGE)
  const skyImg = new Image(); skyImg.src = 'media/art/sky_roof.png?v=3';
  const FWM = {};   // view → { mask: canvas, area: { pick, bottom } }
  function fwMask(view) {
    if (FWM[view] !== undefined) return FWM[view];
    const L = window.MOHEAT_LAYERS?.views?.['nagisa_' + view]; if (!L || !skyImg.complete || !skyImg.naturalWidth) return null;
    const z = L.bg.zoom || 1, ox = (1 - z) / 2 * W, oy = (1 - z) / 2 * H;
    const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
    g.drawImage(skyImg, ox, oy, W * z, H * z);
    FWM[view] = null;   // until the character image is in
    const ch = new Image(); ch.onload = () => {
      const C = L.char, hp = C.height * H, wp = hp * C.w / C.h;
      g.globalCompositeOperation = 'destination-out'; g.shadowColor = '#000'; g.shadowBlur = 14;   // a soft margin round her
      g.drawImage(ch, C.x * W - wp / 2, C.y * H - hp, wp, hp);
      const d = g.getImageData(0, 0, W, H).data, pts = [];   // burst points: well inside the open sky, upper part
      for (let y = Math.round(H * .16); y < H * .42; y += 24)   // bursts open in the middle band of the sky (not cut by the top edge)
         for (let x = 30; x < W - 30; x += 24) if (d[(y * W + x) * 4 + 3] > 230) pts.push([x, y]);
      const bottom = oy + HORIZON * H * z;
      FWM[view] = { mask: c, area: pts.length ? { pick: () => { const p = pts[Math.random() * pts.length | 0]; return [p[0] + (Math.random() - .5) * 20, Math.min(p[1], bottom - 140)]; }, bottom } : null };
    };
    ch.src = 'media/' + L.char.src;
    return null;
  }
  FWS.onBurst = (b) => { S.flash = Math.max(S.flash, .8 * b.big); fwCol = b.col.join(','); fwAt = [b.x, b.y]; const my = E.run;   // the light at once, the boom ~0.6 s later (far away)
    setTimeout(() => { if (my === E.run) SND.fx.firework(.9 + Math.random() * .4, .6 + .4 * b.big); }, 550 + Math.random() * 250); };
  let fwAt = [W * .7, H * .25];
  const salvo = (n, big) => { const m = fwMask(FW_VIEWS.includes(S.view) ? S.view : 'fireworks'); if (m?.area) FWS.salvo(m.area, n, big); };
  function fireworks(on) {
    clearTimeout(fwTimer); if (!on) return;
    const my = E.run;
    const one = () => { if (my !== E.run) return; salvo(1 + (Math.random() * 3 | 0), Math.random() < .2 ? 1.3 : 1); fwTimer = setTimeout(one, 2600 + Math.random() * 2400); };
    one();
  }

  // ---------------------------------------------------------------- the story
  const FRONT = { az: 0, dist: .8 }, NEAR = { az: .1, dist: .45 }, LEFT = { az: -.9, dist: .5 }, LEFT_EAR = { az: -1.35, dist: .12 },
    CHEEK_R = { az: .9, dist: .28 }, FACE = { az: -.15, dist: .35 };
  async function story(my) {   // the engine starts it (run token my) and catches the stop when a new run / finish begins
    // 1 · the roof: crickets, the town far below; the steel door opens behind the water tank, geta on concrete — Nagisa in a yukata
    E.setStep(0); S.view = 'arrive';
    const night = SND.loop('night'), wind = SND.loop('breeze');
    night?.set(.5, 1); wind?.set(.12, 1.5);
    setTimeout(() => { if (my === E.run) SND.fx.train(); }, 400);
    await sleep(1.4); SND.fx.door(-.6); await sleep(1.4); SND.fx.furin(-.7);
    SND.fx.geta(-.6, .15, 9, .3); await sleep(2.6); alive(my);
    await say('n01', { az: .15, dist: 1 });
    await say('n02', FRONT);
    const a = await choice([['浴衣、似合ってる', 'The yukata suits you'], ['…誰かと思った', '…I didn\'t recognise you']]);
    await say(a ? 'n03b' : 'n03a', FRONT);
    breeze(1.6, -1.6, 4, .7); SND.fx.furin(-.7);

    // 2 · a soda popsicle, snapped in two — her half in her mouth, yours against your right cheek
    E.setStep(1);
    await say('n04', NEAR);
    SND.fx.snap(.4, .4); await sleep(.5);
    await go('t_arrive_popsicle', 'popsicle', () => { S.ice = 1; SND.fx.rustle(.9, .3); });
    await say('n05', CHEEK_R);
    await action('🍦', '受け取る', 'Take it', 15);
    S.ice = 0; SND.fx.rustle(.6, .35);   // in your hand now, away from your face
    await say('n06', { az: .45, dist: .5 });

    // 3 · the paper fan: she squeezes onto the bench and fans you from your left — "not for you"
    E.setStep(2); SND.fx.rustle(-.6, .45);
    await go('t_popsicle_fan', 'fan', () => { S.fanOn = true; });
    await say('n07', { az: -.3, dist: .5 });
    await say('n08', { az: -.3, dist: .5 });
    const b = await choice([['もっと', 'More, please'], ['もういいよ', 'That\'s enough']]);
    if (b) { S.fanOn = false; await say('n09b', { az: -.3, dist: .5 }); }
    else { S.fanStrong = true; await say('n09a', { az: -.3, dist: .5 }); await sleep(2.5); S.fanOn = false; S.fanStrong = false; }
    alive(my); await sleep(.6);

    // 4 · senko-hanabi: two tiny fireballs a hand's width in front of your face — whoever's drops first does what the other says
    E.setStep(3);
    await go('t_fan_sparkler', 'sparkler', () => { S.near = 1; });
    await say('n10', FACE);
    SND.fx.match(-.1, .35); await sleep(.9); alive(my);
    const sp = SND.loop('sparkler'); sp?.set(.55, .6); S.balls = [1, 1];
    await sleep(1.2);
    await say('n11', FACE, { gain: 1.6 });
    const win = await stillHold(7);
    const lost = win ? 0 : 1;   // ball 0 = hers, ball 1 = yours
    S.balls[lost] = 0; S.drop = { i: lost, k: 0 }; SND.fx.drop(lost ? .25 : -.2, .45); sp?.set(.3, .3);
    await sleep(1.1);
    await say(win ? 'n12a' : 'n12b', FACE);
    S.balls = [0, 0]; sp?.set(0, .6); SND.fx.drop(lost ? -.2 : .25, .45); await sleep(.7); sp?.stop();

    // 5 · the fireworks start over the town — and drown out what she says; she says it again at your left ear
    E.setStep(4);
    await go('t_sparkler_fireworks', 'fireworks', () => { S.near = 0; fireworks(true); night?.set(.25, 2); });
    await sleep(1.5);
    await say('n13', LEFT);
    salvo(4, 1.5);   // a grand salvo right as she says it
    await say('n14', LEFT, { gain: .7, sub: MUFFLED });
    const c = await choice([['今、なんて？', 'What did you just say?'], ['…もう一回、言って', '…Say it again']]);
    await say(c ? 'n15b' : 'n15a', LEFT);
    fireworks(false);
    await go('t_fireworks_whisper', 'whisper', () => { S.near = 2; SND.fx.rustle(-1.2, .2); });
    await sleep(.4);
    breeze(1.6, 1.0, 4.5, .8).catch(() => {});   // the night wind off the sea on your right while she whispers at your left: cool right, warm left
    await say('n16', LEFT_EAR);
    fireworks(true);
    S.end = await choice([['…俺も', '…Me too'], ['…知ってた', '…I knew']]);
    if (S.end === 0) {
      await go('t_whisper_shoulder', 'shoulder', () => { S.near = 0; S.lean = 1; SND.fx.rustle(-.9, .2); });
      await say('n17a', LEFT_EAR);
    } else {
      await go('t_whisper_laugh', 'laugh', () => { S.near = 0; });
      await say('n17b', { az: .6, dist: .6 });
    }
    await sleep(2); fireworks(false); S.fade = 1; night?.set(.15, 2); wind?.set(.06, 2); setTimeout(() => SND.fx.firework(1, .8), 500); await sleep(3.4); alive(my); E.finish();
  }

  // ---------------------------------------------------------------- per-frame state + thermal
  let iceK = 0, fanK = 0, ballK = [0, 0], nearK = 0, leanK = 0, fanPhase = 0;
  function update(dt) {   // while the story runs (the engine has already moved S.t / S.clock / S.lv / S.vlv / S.env)
    iceK += (S.ice - iceK) * (1 - Math.exp(-dt / .25));
    for (let i = 0; i < 2; i++) ballK[i] += (S.balls[i] - ballK[i]) * (1 - Math.exp(-dt / (S.balls[i] ? .8 : .25)));
    nearK += (S.near - nearK) * (1 - Math.exp(-dt / .4)); leanK += (S.lean - leanK) * (1 - Math.exp(-dt / 1));
    // the fan: one stroke every ~0.65 s (0.45 s when you asked for more); each stroke a puff of air past your left ear
    if (S.fanOn) { fanPhase += dt / (S.fanStrong ? .45 : .65); if (fanPhase >= 1) { fanPhase -= 1; SND.fx.fan(-.95, .3); } fanK = Math.max(0, Math.sin(Math.PI * fanPhase)) * (S.fanStrong ? 1 : .75); }
    else fanK += (0 - fanK) * (1 - Math.exp(-dt / .3));
    if (S.drop) S.drop.k = Math.min(1, S.drop.k + dt / .6);
    S.flash = Math.max(0, S.flash - dt * 1.4);
  }
  // Thermal, two layers (firmware DUAL: cool and heat independent on each ear — CLAUDE.md, 2026-11-08); shared/engine/thermal.js sums them per ear.
  //  · VOICE: a voice is warm. Her loudness (0.1 + 0.8 × level) warms the ear she speaks at — × 1 right at your ear, × 0.6 within
  //    50 cm, × 0.28 further; halved when she is straight in front.
  //  · AMBIENT (all real things next to your ears): a summer night is warm, so no standing chill — only the sea breeze when it gusts
  //    across your head (cool, moving), the frozen popsicle on your right cheek (cool, gone the moment you take it), each stroke of
  //    the paper fan from your left (cool puffs on the left ear), the two senko-hanabi a hand's width in front of your face (small, so
  //    a faint warmth on both ears that flickers with the sparks and stops when a ball drops), her face that close (≤ 0.3), her cheek
  //    at your left ear while she whispers, her head on your left shoulder in the ending.
  //    Not heated / cooled: the far fireworks (1.5 km away), the popsicle once it is in your hand, her blush.
  function sources() {
    const out = [], add = (az, k, s, icon) => { if (s > .01) out.push({ az, k, s, icon }); };
    if (!S.started) return out;
    const P = S.pos;
    if (E.talking()) add(P.az, 'h', ME.thermal.voice(P, S.vlv), '💬');
    if (S.breeze) add(S.breeze.az, 'c', .4 * S.breeze.k, '🌬');
    if (iceK > .02) add(1.3, 'c', .7 * iceK, '🍦');
    if (fanK > .02) add(-1.3, 'c', .25 + .35 * fanK, '🪭');
    const sp = (ballK[0] + ballK[1]) / 2;
    if (sp > .02) add(0, 'h', (.3 + .1 * Math.sin(S.t * 11) * Math.sin(S.t * 4.3)) * sp, '🎇');
    if (nearK > .5 && nearK < 1.5) add(-.15, 'h', .2, '🤍');      // her face a hand's width in front of you
    if (nearK > 1.5) add(-1.3, 'h', .3 * (nearK - 1), '🤍');        // her cheek at your left ear
    if (leanK > .02) add(-1.2, 'h', .3 * leanK, '🤍');
    return out;
  }
  // ---------------------------------------------------------------- drawing: the engine's stills + this demo's overlays
  // sparkler balls in the still (1920×1080): ball 0 = hers, ball 1 = yours
  const BALL = [[837, 938], [1187, 1030]];   // the tips of the two strings in the layered sparkler still (no flame drawn in the art)
  const sparks = Array.from({ length: 60 }, () => ({ b: 0, x: 0, y: 0, vx: 0, vy: 0, life: 0 }));
  function draw(t, dt) {
    E.stage.draw(t, dt);   // the stills, cross-faded (shared/engine/stage.js)
    const { z, dy } = E.stage.zoom(t), LIVE = E.stage.live;   // the still's drift, for points on it
    // a point of the sparkler still: with layers it follows her hand (parallax, breathing, the 1.02 over-scan) — the fireball stays on the string tip
    const at = (p) => { const [x, y] = LIVE() && window.MoHeatLayers.toFrame ? window.MoHeatLayers.toFrame('nagisa_sparkler', p[0], p[1]) : p; return [W / 2 + (x - W / 2) * z, H / 2 + (y - H / 2) * z + dy]; };
    if (S.view === 'sparkler' && E.stage.mix() >= 1) {
      // the fireballs are code only (the art has just the strings): a glow + sparks while lit; a dropped one falls as a bead
      for (let i = 0; i < 2; i++) {
        const lit = ballK[i], [x, y] = at(BALL[i]);
        if (lit > .05) {   // living ball: a pulsing glow + matsuba sparks
          const r = 26 + 6 * Math.sin(t * 13 + i), g = ctx.createRadialGradient(x, y, 2, x, y, r * 2.4); g.addColorStop(0, `rgba(255,236,170,${.9 * lit})`); g.addColorStop(.25, `rgba(255,150,60,${.55 * lit})`); g.addColorStop(1, 'rgba(255,120,40,0)');
          ctx.fillStyle = g; ctx.fillRect(x - r * 2.4, y - r * 2.4, r * 4.8, r * 4.8);
        }
      }
      ctx.strokeStyle = 'rgba(255,200,120,.9)'; ctx.lineWidth = 2; ctx.beginPath();
      for (const s of sparks) {
        if (s.life <= 0) { s.b = Math.random() < .5 ? 0 : 1; if (ballK[s.b] < .3) continue; const [x, y] = at(BALL[s.b]), a = Math.random() * 7, v = 120 + Math.random() * 260; Object.assign(s, { x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: .12 + Math.random() * .25 }); }
        s.life -= dt; const nx = s.x + s.vx * dt, ny = s.y + s.vy * dt; ctx.moveTo(s.x, s.y); ctx.lineTo(nx, ny); s.x = nx; s.y = ny; s.vy += 300 * dt;
      }
      ctx.stroke();
      if (S.drop && S.drop.k < 1) { const [x, y] = at(BALL[S.drop.i]); ctx.fillStyle = `rgba(255,170,80,${1 - S.drop.k})`; ctx.beginPath(); ctx.arc(x, y + 260 * S.drop.k * S.drop.k, 7, 0, 7); ctx.fill(); }
    }
    if (S.flash > 0 && ['fireworks', 'whisper', 'shoulder', 'laugh'].includes(S.view)) {   // the burst lights up the night (colour of the last shell)
      const a = Math.min(1, S.flash) * .28, g = ctx.createRadialGradient(fwAt[0], fwAt[1], 40, fwAt[0], fwAt[1], 1300);   // lit from the last burst
      g.addColorStop(0, `rgba(${fwCol},${a})`); g.addColorStop(1, `rgba(${fwCol},0)`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    FWS.update(dt); if (FW_VIEWS.includes(S.view)) FWS.drawLayer(ctx, fwMask(S.view)?.mask);
    if (S.fade) { S.fadeA = Math.min(1, (S.fadeA || 0) + dt / 3); ctx.fillStyle = `rgba(8,12,30,${S.fadeA})`; ctx.fillRect(0, 0, W, H); }
  }

  E.boot();
})();
