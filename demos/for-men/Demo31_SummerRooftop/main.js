// 『なつの、おくじょうで』 — Nagisa (original character), 20, your tomboyish childhood friend, home for the summer. A hot summer night
// on the roof of the old apartment block you both grew up in: she turns up — for once — in a yukata (and hates being looked at),
// presses half a soda popsicle to your right cheek, fans you from your left, lights two senko-hanabi for a who-drops-first contest,
// and when the fireworks over the town drown out what she says, she says it again at your left ear. Half of it, anyway.
// DUAL thermal: her voice is always warm at the ear she speaks at; the sea breeze, the popsicle, the paper fan, the two sparklers in
// front of you and her head on your shoulder are the ambient layer. Stills first (video last, user 2026-11-08).
// Built on Demo25's main.js (same UI, choices / action / hold, clip player, thermal model, device panel) — user 2026-11-08: same final
// result and production standard as the hatsumode date.
(() => {
  const $ = (id) => document.getElementById(id);
  const QS = new URLSearchParams(location.search);
  const SND = window.HTAudio, LINES = window.NAGISA_LINES, MUFFLED = window.NAGISA_MUFFLED, W = 1920, H = 1080;
  const AUTO = QS.has('auto');   // testing: every choice / action answers itself after a moment (?alt = take the other branch)
  const ALT = QS.has('alt');
  const cv = $('scene'), ctx = cv.getContext('2d'), stage = $('stage');
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const sleep = (s) => new Promise((r) => setTimeout(r, s * 1000));

  // ---------------------------------------------------------------- art: one still per view
  const VIEWS = ['arrive', 'popsicle', 'fan', 'sparkler', 'fireworks', 'whisper', 'shoulder', 'laugh'];
  const IMG = {};
  const artReady = Promise.all(VIEWS.map((n) => new Promise((res) => { const im = new Image(); im.onload = () => { IMG[n] = im; res(); }; im.onerror = () => res(); im.src = `media/art/nagisa_${n}.jpg?v=1`; })));

  // ---------------------------------------------------------------- state
  const fresh = () => ({ started: false, t: 0, clock: 0, view: 'arrive', ice: 0, fan: 0, fanOn: false, fanStrong: false, balls: [0, 0], near: 0,
    lean: 0, breeze: null, flash: 0, fade: 0, lv: 0, env: 0, pos: { az: 0, dist: .8 }, end: 0 });
  let S = fresh(), run = 0;
  const STEPS = [['arrive', '屋上で', 'On the roof'], ['popsicle', 'ソーダアイス', 'Soda popsicle'], ['fan', 'うちわ', 'The paper fan'],
    ['sparkler', '線香花火', 'Sparklers'], ['fireworks', '花火の夜', 'Fireworks']];
  function setStep(i) { if (i > 0 && S.started) S.restUntil = S.clock + 1.2; $('steps').innerHTML = STEPS.map((s, k) => `<li class="${k < i ? 'done' : k === i ? 'now' : ''}">${s[1]} · <small>${s[2]}</small></li>`).join(''); }

  // ---------------------------------------------------------------- subtitles + voice
  const subJa = $('subJa'), subEn = $('subEn'), subs = $('subs');
  function sub(ja, en) { subJa.textContent = ja || ''; subEn.textContent = en || ''; subs.classList.toggle('show', !!ja); }
  let talking = 0;
  async function say(id, where = { az: 0, dist: .8 }, opt = {}) {
    const my = run; const [ja, en] = opt.sub || LINES[id]; S.pos = where;
    sub(ja, en); talking++;
    await SND.say(id, where, opt.gain ?? (where.dist < .2 ? 1.8 : 1.45));
    talking--; if (my !== run) throw new Error('stopped');
    await sleep(.35); sub('', '');
  }
  const alive = (my) => { if (my !== run) throw new Error('stopped'); };

  // ---------------------------------------------------------------- your turn: choices, actions, hold (from Demo25)
  const choiceEl = $('choices'), actEl = $('act');
  function choice(opts, timeout = 20) {
    return new Promise((res) => {
      choiceEl.innerHTML = opts.map((o, i) => `<button class="ch" data-i="${i}"><b>${o[0]}</b><span>${o[1]}</span></button>`).join('');
      choiceEl.classList.add('show');
      const done = (i) => { clearTimeout(tm); clearTimeout(au); choiceEl.classList.remove('show'); choiceEl.innerHTML = ''; res(i); };
      choiceEl.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => done(+b.dataset.i)));
      const tm = setTimeout(() => done(0), timeout * 1000), au = AUTO ? setTimeout(() => done(ALT ? 1 : 0), 1200) : 0;
    });
  }
  function action(icon, ja, en, timeout = 20) {
    return new Promise((res) => {
      actEl.innerHTML = `<button class="act-btn"><i>${icon}</i><b>${ja}</b><span>${en}</span></button>`; actEl.classList.add('show');
      const done = () => { clearTimeout(tm); clearTimeout(au); actEl.classList.remove('show'); actEl.innerHTML = ''; res(); };
      actEl.querySelector('button').addEventListener('click', done); const tm = setTimeout(done, timeout * 1000), au = AUTO ? setTimeout(done, 900) : 0;
    });
  }
  function hold(icon, ja, en, sec, onTick) {
    return new Promise((res) => {
      actEl.innerHTML = `<button class="act-btn hold"><i>${icon}</i><b>${ja}</b><span>${en}</span><em class="bar"><u></u></em></button>`; actEl.classList.add('show');
      const b = actEl.querySelector('button'), bar = b.querySelector('u'); let down = false, k = 0, last = performance.now(); const t0 = last;
      const set = (v) => (e) => { e?.preventDefault?.(); down = v; b.classList.toggle('down', v); };
      b.addEventListener('pointerdown', set(true)); for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, set(false));
      const key = (v) => (e) => { if (e.code === 'Space') { e.preventDefault(); down = v; b.classList.toggle('down', v); } };
      const kd = key(true), ku = key(false); addEventListener('keydown', kd); addEventListener('keyup', ku);
      const tick = () => {
        const n = performance.now(), dt = (n - last) / 1000; last = n;
        if (down || AUTO || n - t0 > 18000) k = Math.min(1, k + dt / sec); onTick?.(down || AUTO, k); bar.style.width = `${k * 100}%`;
        if (k >= 1) { removeEventListener('keydown', kd); removeEventListener('keyup', ku); actEl.classList.remove('show'); actEl.innerHTML = ''; res(); return; }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }
  // the sparkler contest: hold still (press and hold) until hers drops. Let go after you started → yours drops first. → true = you win
  function stillHold(sec) {
    return new Promise((res) => {
      actEl.innerHTML = `<button class="act-btn hold"><i>🎇</i><b>動かない（長押し）</b><span>Don't move (press and hold)</span><em class="bar"><u></u></em></button>`; actEl.classList.add('show');
      const b = actEl.querySelector('button'), bar = b.querySelector('u'); let down = false, k = 0, upFor = 0, last = performance.now(); const t0 = last;
      const autoLose = AUTO && ALT;
      const set = (v) => (e) => { e?.preventDefault?.(); down = v; b.classList.toggle('down', v); };
      b.addEventListener('pointerdown', set(true)); for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, set(false));
      const key = (v) => (e) => { if (e.code === 'Space') { e.preventDefault(); down = v; b.classList.toggle('down', v); } };
      const kd = key(true), ku = key(false); addEventListener('keydown', kd); addEventListener('keyup', ku);
      const end = (win) => { removeEventListener('keydown', kd); removeEventListener('keyup', ku); actEl.classList.remove('show'); actEl.innerHTML = ''; res(win); };
      const tick = () => {
        const n = performance.now(), dt = (n - last) / 1000; last = n;
        const holding = down || (AUTO && !(autoLose && k > .45)) || (k === 0 && n - t0 > 15000);   // never pressed in 15 s: she starts anyway
        if (holding) { k = Math.min(1, k + dt / sec); upFor = 0; } else if (k > .04) upFor += dt;
        bar.style.width = `${k * 100}%`;
        if (k >= 1) return end(true);
        if (upFor > .35) return end(false);   // you moved: your ball falls
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  // ---------------------------------------------------------------- weather: a warm sea breeze that sweeps across your head
  async function breeze(from, to, sec, peak = 1) {
    const my = run, t0 = performance.now(), B = SND.loop('breeze');
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
  FWS.onBurst = (b) => { S.flash = Math.max(S.flash, .8 * b.big); fwCol = b.col.join(','); fwAt = [b.x, b.y]; const my = run;   // the light at once, the boom ~0.6 s later (far away)
    setTimeout(() => { if (my === run) SND.fx.firework(.9 + Math.random() * .4, .6 + .4 * b.big); }, 550 + Math.random() * 250); };
  let fwAt = [W * .7, H * .25];
  const salvo = (n, big) => { const m = fwMask(FW_VIEWS.includes(S.view) ? S.view : 'fireworks'); if (m?.area) FWS.salvo(m.area, n, big); };
  function fireworks(on) {
    clearTimeout(fwTimer); if (!on) return;
    const my = run;
    const one = () => { if (my !== run) return; salvo(1 + (Math.random() * 3 | 0), Math.random() < .2 ? 1.3 : 1); fwTimer = setTimeout(one, 2600 + Math.random() * 2400); };
    one();
  }

  // ---------------------------------------------------------------- the story
  const FRONT = { az: 0, dist: .8 }, NEAR = { az: .1, dist: .45 }, LEFT = { az: -.9, dist: .5 }, LEFT_EAR = { az: -1.35, dist: .12 },
    CHEEK_R = { az: .9, dist: .28 }, FACE = { az: -.15, dist: .35 };
  async function story() {
    const my = ++run;
    try {
      // 1 · the roof: crickets, the town far below; the steel door opens behind the water tank, geta on concrete — Nagisa in a yukata
      setStep(0); S.view = 'arrive';
      const night = SND.loop('night'), wind = SND.loop('breeze');
      night?.set(.5, 1); wind?.set(.12, 1.5);
      setTimeout(() => { if (my === run) SND.fx.train(); }, 400);
      await sleep(1.4); SND.fx.door(-.6); await sleep(1.4); SND.fx.furin(-.7);
      SND.fx.geta(-.6, .15, 9, .3); await sleep(2.6); alive(my);
      await say('n01', { az: .15, dist: 1 });
      await say('n02', FRONT);
      const a = await choice([['浴衣、似合ってる', 'The yukata suits you'], ['…誰かと思った', '…I didn\'t recognise you']]);
      await say(a ? 'n03b' : 'n03a', FRONT);
      breeze(1.6, -1.6, 4, .7); SND.fx.furin(-.7);

      // 2 · a soda popsicle, snapped in two — her half in her mouth, yours against your right cheek
      setStep(1);
      await say('n04', NEAR);
      SND.fx.snap(.4, .4); await sleep(.5);
      await go('t_arrive_popsicle', 'popsicle', () => { S.ice = 1; SND.fx.rustle(.9, .3); });
      await say('n05', CHEEK_R);
      await action('🍦', '受け取る', 'Take it', 15);
      S.ice = 0; SND.fx.rustle(.6, .35);   // in your hand now, away from your face
      await say('n06', { az: .45, dist: .5 });

      // 3 · the paper fan: she squeezes onto the bench and fans you from your left — "not for you"
      setStep(2); SND.fx.rustle(-.6, .45);
      await go('t_popsicle_fan', 'fan', () => { S.fanOn = true; });
      await say('n07', { az: -.3, dist: .5 });
      await say('n08', { az: -.3, dist: .5 });
      const b = await choice([['もっと', 'More, please'], ['もういいよ', 'That\'s enough']]);
      if (b) { S.fanOn = false; await say('n09b', { az: -.3, dist: .5 }); }
      else { S.fanStrong = true; await say('n09a', { az: -.3, dist: .5 }); await sleep(2.5); S.fanOn = false; S.fanStrong = false; }
      alive(my); await sleep(.6);

      // 4 · senko-hanabi: two tiny fireballs a hand's width in front of your face — whoever's drops first does what the other says
      setStep(3);
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
      setStep(4);
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
      await sleep(2); fireworks(false); S.fade = 1; night?.set(.15, 2); wind?.set(.06, 2); setTimeout(() => SND.fx.firework(1, .8), 500); await sleep(3.4); alive(my); finish();
    } catch (e) { if (e.message !== 'stopped') console.error(e); }
  }

  // ---------------------------------------------------------------- per-frame state + thermal
  let iceK = 0, fanK = 0, ballK = [0, 0], nearK = 0, leanK = 0, fanPhase = 0;
  function update(dt) {
    S.t += dt; if (!S.started) return;
    S.clock += dt; S.lv = SND.voiceLevel(); S.vlv = (S.vlv || 0) + (S.lv - (S.vlv || 0)) * (1 - Math.exp(-dt / (S.lv > (S.vlv || 0) ? .05 : .8)));   // voice warmth = the speech envelope, not each syllable (no sub-second hot ↔ cold flicker, guide §3 节奏)
    { const vt = talking ? 1 : 0; S.env += (vt - S.env) * (1 - Math.exp(-dt / (vt > S.env ? .06 : .3))); }   // talking envelope (shared/layers.js mouth)
    iceK += (S.ice - iceK) * (1 - Math.exp(-dt / .25));
    for (let i = 0; i < 2; i++) ballK[i] += (S.balls[i] - ballK[i]) * (1 - Math.exp(-dt / (S.balls[i] ? .8 : .25)));
    nearK += (S.near - nearK) * (1 - Math.exp(-dt / .4)); leanK += (S.lean - leanK) * (1 - Math.exp(-dt / 1));
    // the fan: one stroke every ~0.65 s (0.45 s when you asked for more); each stroke a puff of air past your left ear
    if (S.fanOn) { fanPhase += dt / (S.fanStrong ? .45 : .65); if (fanPhase >= 1) { fanPhase -= 1; SND.fx.fan(-.95, .3); } fanK = Math.max(0, Math.sin(Math.PI * fanPhase)) * (S.fanStrong ? 1 : .75); }
    else fanK += (0 - fanK) * (1 - Math.exp(-dt / .3));
    if (S.drop) S.drop.k = Math.min(1, S.drop.k + dt / .6);
    S.flash = Math.max(0, S.flash - dt * 1.4);
  }
  // Thermal, two layers (firmware DUAL: cool and heat independent on each ear — CLAUDE.md, 2026-11-08).
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
    if (talking) add(P.az, 'h', (.1 + .8 * clamp(S.vlv * 8)) * (P.dist < .15 ? 1 : P.dist <= .5 ? .6 : .28) * (Math.abs(P.az) < .5 ? .5 : 1), '💬');
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
  const ear = { Lc: 0, Lh: 0, Rc: 0, Rh: 0 };
  const modeOn = {}, modeLast = { Lc: -9, Lh: -9, Rc: -9, Rh: -9 };
  function thermal(dt) {
    const sum = { L: { h: 0, c: 0 }, R: { h: 0, c: 0 } }, src = sources();
    for (const s of src) { const sn = Math.sin(s.az), wL = clamp(1 - 1.2 * Math.max(0, sn)), wR = clamp(1 - 1.2 * Math.max(0, -sn)); sum.L[s.k] += s.s * wL; sum.R[s.k] += s.s * wR; }
    const rest = S.clock < (S.restUntil || 0);   // a short rest between scenes (guide §3 节奏): every channel off for a moment, so the next scene is felt on its own
    for (const e of ['L', 'R']) for (const k of ['c', 'h']) {
      const target = rest ? 0 : k === 'h' ? Math.min(.9, sum[e].h) : Math.min(1, sum[e].c), cur = ear[e + k];
      const tau = rest ? .15 : target > cur ? (k === 'h' ? .4 : .2) : (k === 'h' ? .5 : .35);
      ear[e + k] = cur + (target - cur) * (1 - Math.exp(-dt / tau));
    }
    for (const e of ['L', 'R']) for (const [k, o] of [['c', 'h'], ['h', 'c']]) {   // a 1 s rest between the two modes on one ear (both on = DUAL is fine)
      const K = e + k, O = e + o;
      if (ear[K] > OFF && !modeOn[K] && ear[O] <= OFF && performance.now() / 1000 - modeLast[O] < 1.15) ear[K] = 0;
    }
    for (const K in ear) { modeOn[K] = ear[K] > OFF; if (modeOn[K]) modeLast[K] = performance.now() / 1000; }
    return { th: { ...ear }, src };
  }

  // ---------------------------------------------------------------- drawing: stills with a slow breathing drift, cross-fades between views
  let viewA = 'arrive', viewB = 'arrive', mix = 1;
  // ---- animation (handoff §4b, as Demo20 / 22): Seedance 2.5 Lite 1080p clips whose first and last frames are EXACTLY the stills
  // (scripts/prepare_video.py), so clips are only switched at a clip's end — a hard cut between identical frames, no ghosting.
  // One loop per view; one transition per cut, asked for with go(): it starts when the current loop reaches its end. ?stills = no video.
  const CLIP_NAMES = [];   // add v_<view> loops and t_<from>_<to> transitions here once clips exist (handoff §4b)
  const ONCE = new Set(CLIP_NAMES.filter((n) => n.startsWith('t_')));
  const CLIP = {};
  if (!QS.has('stills') && !QS.has('cover')) for (const n of CLIP_NAMES) {
    const v = document.createElement('video'); Object.assign(v, { muted: true, loop: false, playsInline: true, preload: 'auto', src: `media/video/${n}.mp4?v=1` });
    v.setAttribute('playsinline', ''); v.addEventListener('error', () => { delete CLIP[n]; }); CLIP[n] = v;
  }
  const clipOK = (n) => n && CLIP[n] && CLIP[n].readyState >= 2;
  let cur = null, curView = null, pending = null;
  const loopFor = (view) => 'v_' + view;
  function go(name, view, onStart) {   // a one-shot transition at the next clip end, then continue in `view`; onStart() when the transition starts
    if (!clipOK(name) || !cur) { onStart?.(); S.view = view; return sleep(.6); }
    const my = run;
    return new Promise((done, fail) => { pending = { name, view, onStart, done: () => (my === run ? done() : fail(new Error('stopped'))), started: false }; });
  }
  function playClip(name, view) { const v = CLIP[name]; cur = name; curView = view; v.currentTime = 0; v.play().catch(() => {}); }
  function startLoop() { const w = loopFor(S.view); if (clipOK(w)) playClip(w, S.view); else cur = null; }
  function clips() {
    if (QS.has('stills')) return;
    if (!cur) { startLoop(); return; }
    if (!ONCE.has(cur) && curView !== S.view && !pending) { startLoop(); return; }
    const v = CLIP[cur];
    if (!v.ended && v.currentTime < v.duration - .03) return;   // mid-clip: never switch
    if (ONCE.has(cur) && pending && pending.started) { const p = pending; pending = null; S.view = curView; viewA = viewB = curView; mix = 1; p.done(); }
    if (pending && !pending.started) { pending.started = true; pending.onStart?.(); playClip(pending.name, pending.view); return; }
    startLoop();
  }
  function drawClip(view, alpha) {
    if (!(cur && clipOK(cur) && (view === curView || (view === S.view && ONCE.has(cur))))) return false;
    ctx.globalAlpha = alpha; ctx.drawImage(CLIP[cur], 0, 0, W, H); ctx.globalAlpha = 1; return true;
  }
  // layered stills (demos/shared/layers.js) breathe / sway on their own: no page zoom / bob on top (the background would breathe with her)
  const LIVE = () => !!(window.MoHeatLayers && window.MoHeatLayers.live);
  function drawView(view, alpha, t) {
    if (drawClip(view, alpha)) return;
    const exact = !QS.has('stills') && Object.keys(CLIP).length > 0;   // with video the still must match the clips' frames exactly (no drift)
    const im = IMG[view];
    ctx.globalAlpha = alpha;
    if (!im) { ctx.fillStyle = '#0d1630'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; return; }
    const z = exact ? 1 : 1.02 + (LIVE() ? 0 : .008 * Math.sin(t * 1.1)), dh = W * im.height / im.width;
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.drawImage(im, -W / 2, -dh / 2 + (exact || LIVE() ? 0 : 4 * Math.sin(t * .9)), W, dh); ctx.restore();
    ctx.globalAlpha = 1;
  }
  // sparkler balls in the still (1920×1080): ball 0 = hers, ball 1 = yours
  const BALL = [[837, 938], [1187, 1030]];   // the tips of the two strings in the layered sparkler still (no flame drawn in the art)
  const sparks = Array.from({ length: 60 }, () => ({ b: 0, x: 0, y: 0, vx: 0, vy: 0, life: 0 }));
  addEventListener('moheat:pause', (e) => { if (e.detail && S.started && (mix < 1 || S.view !== viewB)) { viewA = viewB = S.view; mix = 1; try { draw(S.t ?? 0, 0); } catch {} } });   // paused mid cross-fade: show the new view only (shell.js moheat:pause, Demo21 2026-11-11)
  function draw(t, dt) {
    if (S.view !== viewB) { viewA = viewB; viewB = S.view; mix = 0; }
    clips();
    mix = Math.min(1, mix + dt / .6);
    if (mix < 1) drawView(viewA, 1, t);
    drawView(viewB, mix < 1 ? mix : 1, t);
    const exact = Object.keys(CLIP).length > 0, z = exact ? 1 : 1.02 + (LIVE() ? 0 : .008 * Math.sin(t * 1.1)), dy = exact || LIVE() ? 0 : 4 * Math.sin(t * .9);   // same as drawView
    // a point of the sparkler still: with layers it follows her hand (parallax, breathing, the 1.02 over-scan) — the fireball stays on the string tip
    const at = (p) => { const [x, y] = LIVE() && window.MoHeatLayers.toFrame ? window.MoHeatLayers.toFrame('nagisa_sparkler', p[0], p[1]) : p; return [W / 2 + (x - W / 2) * z, H / 2 + (y - H / 2) * z + dy]; };
    if (S.view === 'sparkler' && mix >= 1) {
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

  // ---------------------------------------------------------------- side panel + device (same protocol as every demo)
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
  const device = MoHeatDevice.create({ select: $('portSelect'), addBtn: $('addPort'), connectBtn: $('connectBtn'), status: $('deviceStatus') }, { log: (l) => console.log('[MoHeat]', l), onConnect: () => { lastSent = ''; } });
  if (!MoHeatDevice.supported) $('deviceStatus').querySelector('span').textContent = 'Web Serial needs desktop Chrome / Edge';
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
    if (QS.has('auto') && cmd !== cmdLog[cmdLog.length - 1]?.[1]) cmdLog.push([+S.clock.toFixed(2), cmd]);
    if (!device.isConnected() || !$('sendOn').checked) return;
    const n = performance.now(); if (cmd !== lastSent && n - lastSendAt >= SEND_INTERVAL) { device.send(cmd); lastSent = cmd; lastSendAt = n; }
  }
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const PLACE = { arrive: 'the rooftop · summer night', popsicle: 'the rooftop · soda popsicle', fan: 'the bench · paper fan', sparkler: 'the bench · sparklers',
    fireworks: 'the bench · fireworks', whisper: 'the bench · at your ear', shoulder: 'the bench · fireworks', laugh: 'the bench · fireworks' };

  // ---------------------------------------------------------------- loop / start / end
  let last = performance.now(), hidden = false;
  function loop() {
    const n = performance.now(), dt = clamp((n - last) / 1000, 0, .05); last = n;
    if (!hidden) {
      update(dt);
      if (S.started || S.fade) draw(S.t, dt); else drawCover();
      const { th, src } = thermal(dt); output(th, S.started); radar(S.started ? src : [], th);
      $('clock').textContent = fmt(S.clock);
      $('posInfo').textContent = S.started ? PLACE[S.view] : '';
    }
    requestAnimationFrame(loop);
  }
  document.addEventListener('visibilitychange', () => { hidden = document.hidden; if (hidden) { stopOutput(); SND.ctx()?.suspend(); } else { last = performance.now(); SND.ctx()?.resume(); } });
  document.addEventListener('keydown', (e) => { if (e.code === 'Escape') emergencyStop(); });
  function finish() {
    S.started = false; run++; stopOutput(); S.fade = 0; S.fadeA = 0; fireworks(false); FWS.clear();   // the end fade must not stay over the cover (the loop draws the story while S.fade is set → black cover)
    for (const k of ['night', 'breeze', 'sparkler']) SND.loop(k)?.stop();
    sub('', ''); actEl.classList.remove('show'); choiceEl.classList.remove('show');
    const c = $('cleared'); c.hidden = false;
    c.textContent = S.end ? '🎆 ずるいのは、どっち？ · Who\'s the unfair one?' : '🎆 遅いよ、バカ。 · Took you long enough, idiot';
    $('startBtn').textContent = '↺ もう一度 · Play again'; $('intro').classList.remove('hidden');
    window.NAGISA.done = true;
  }
  function start() {
    SND.init(); SND.loadVoices(Object.keys(LINES));
    FW_VIEWS.forEach(fwMask);   // build the fireworks masks early (needs the layer data + images)
    S = fresh(); S.started = true; viewA = viewB = 'arrive'; mix = 1; cur = null; pending = null; iceK = fanK = nearK = leanK = 0; ballK = [0, 0]; $('cleared').hidden = true;
    $('intro').classList.add('hidden'); window.NAGISA.done = false;
    story();
  }
  $('startBtn').addEventListener('click', start);
  $('lrBtn').addEventListener('click', () => { SND.lrCheck(); const b = $('lrBtn'); b.textContent = '🎧 Left…'; setTimeout(() => { b.textContent = '🎧 …Right'; }, 900); setTimeout(() => { b.textContent = '🎧 Left / Right check'; }, 1900); });
  $('soundBtn').addEventListener('click', (e) => { SND.setMuted(!SND.isMuted()); e.target.textContent = SND.isMuted() ? '🔇' : '🔊'; });
  function drawCover() {}   // UI v2: the cover is the finished image (media/cover/, tools/web/covers.py)
  window.NAGISA = { get S() { return S; }, thermal: () => thermal(.05), both: () => both, log: cmdLog, done: false, fw: (n = 3, big = 1) => salvo(n, big) };   // fw: testing
  setStep(0);
  if (QS.has('cover')) { document.body.classList.add('cover-only'); artReady.then(drawCover); return; }
  if (QS.has('autoplay') || AUTO) { const ac = SND.init(); if (ac.state === 'running') start(); else ac.resume().then(() => { if (ac.state === 'running' && !S.started) start(); }).catch(() => {}); }
  requestAnimationFrame(loop);
})();
