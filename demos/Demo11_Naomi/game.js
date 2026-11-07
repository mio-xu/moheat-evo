// 『ナオミと、ふわふわの一日』 — a healing interactive game with Naomi, a soft, gentle, easy-to-tease long-haired cat.
// morning: her footsteps, a sniff and a cold nose boop at your left ear → stroke her head → she nuzzles your left, then right cheek
// day: call her name (mic or button) → she answers from the cat tower and walks over → teaser wand → blow on her warm food
// afternoon: poke her (she never gets angry) → she rolls over → rub her belly · night: rain on the window, she sleeps on your lap.
// Every sound is placed with HRTF; her body, purr and breath are warm sources at her direction, her nose / the feather's wind /
// the rain / your breath are cool ones. Per ear only the stronger mode is sent (firmware: one mode per ear).
(() => {
  const $ = (id) => document.getElementById(id);
  const QS = new URLSearchParams(location.search);
  const SND = window.NaomiAudio, W = 1920, H = 1080;
  const cv = $('scene'), ctx = cv.getContext('2d'), stage = $('stage');
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k;
  const AZ = (x) => clamp((x - W / 2) / (W / 2), -1, 1) * 1.15;      // screen x → azimuth (rad, + = right)
  const rnd = (a, b) => a + Math.random() * (b - a);
  const ease = (k) => k < .5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;

  // ---------------------------------------------------------------- art (Seedance → scripts/prepare_art.py → media/art/*.webp)
  const IMG = {};
  const ART_NAMES = ['bg_room_morning', 'bg_room_day', 'bg_room_night', 'prop_bowl', 'naomi_sit', 'naomi_sit_blink', 'naomi_sit_meow', 'naomi_sit_happy',
    'naomi_close', 'naomi_close_blink', 'naomi_close_happy', 'naomi_walk', 'naomi_pounce', 'naomi_eat', 'naomi_loaf', 'naomi_belly', 'naomi_sleep'];
  const artReady = Promise.all(ART_NAMES.map((n) => new Promise((res) => { const im = new Image(); im.onload = () => { IMG[n] = im; res(); }; im.onerror = () => res(); im.src = `media/art/${n}.webp?v=1`; })));
  // pose → drawn height in canvas px (anchor = bottom centre of the sprite)
  const POSE_H = { sit: 560, close: 1060, walk: 400, pounce: 600, eat: 380, loaf: 330, belly: 360, sleep: 560 };
  const FACES = { sit: ['blink', 'meow', 'happy'], close: ['blink', 'happy'] };

  // ---------------------------------------------------------------- text
  const STEPS = [
    ['wake', 'おはよう、ナオミ', 'Good morning, Naomi'],
    ['pet', '頭を なでなで してあげて', 'Stroke her head'],
    ['call', '名前を呼んでみて「ナオミ〜」', 'Call her name: "Naomi!"'],
    ['play', 'ねこじゃらしで あそぼう', 'Play with the teaser wand'],
    ['feed', 'ごはんを ふーふー してあげて', 'Blow on her food to cool it'],
    ['poke', 'ちょっとだけ、つんつん', 'Give her a gentle poke'],
    ['belly', 'ふわふわのおなかを なでなで', 'Rub her fluffy tummy'],
    ['sleep', 'いっしょに、おやすみ', 'Rest together'],
  ];
  const HINTS = {
    wake: ['目をとじて、耳をすませて', 'Close your eyes and listen'],
    pet: ['ナオミの頭の上を、ゆっくりドラッグ', 'Drag slowly over her head'],
    call: ['マイクに「ナオミ〜」、またはボタン', 'Say "Naomi!" into the mic, or press the button'],
    play: ['ねこじゃらしを動かして、ナオミの前でふりふり', 'Move the wand and wiggle it in front of her'],
    feed: ['マイクに息を吹きかけるか、ボタンを長押し', 'Blow into the mic, or hold the button'],
    poke: ['ナオミをタップ（3回）', 'Tap Naomi (3 times)'],
    belly: ['おなかの上を、ゆっくりドラッグ', 'Drag slowly over her tummy'],
    sleep: ['そっとなでても、ただ聞いていてもいいよ', 'Stroke her softly — or just listen'],
  };
  const HEART_STEPS = ['pet', 'call', 'play', 'feed', 'belly', 'sleep'];

  // ---------------------------------------------------------------- state
  const fresh = () => ({
    step: 'wake', bg: 'morning', started: false, done: false, t: 0, clock: 0, st: 0,        // st = time in this step
    hearts: 0, eyes: 0, dark: 0, fadeBg: null,
    pet: 0, rub: -1, calls: 0, callHold: 0, callCool: 0, catches: 0, food: 1, eatT: -1, pokes: 0, belly: 0, calm: 0, endT: -1,
  });
  let S = fresh();
  const N = { pose: 'close', x: 960, y: 1150, s: 1, flip: false, face: '', faceUntil: 0, blinkAt: 2, blinkUntil: 0, tilt: 0, squish: 0, jump: 0,
    show: false, near: 0, purr: 0, purrT: 0, tx: null, walkSpd: 300, stepAcc: 0, pounceT: -1, cool: 0, alpha: 1 };
  const wand = { x: 1400, y: 560, vx: 0, vy: 0, px: 1400, py: 560, fx: 1400, fy: 700, speed: 0, wig: 0, seen: false };
  const ptr = { x: 0, y: 0, down: false, sx: 0, sy: 0, st: 0, moved: 0, strokeV: 0, lastT: 0, over: false };

  // ---------------------------------------------------------------- HUD
  const toastEl = $('toast'), goalEl = $('goal'), invEl = $('inv'), actEl = $('blow'), bubble = $('bubble');
  let toastTimer = 0, bubbleTimer = 0;
  function toast(ja, en, ms = 3000) { toastEl.querySelector('b').textContent = ja; toastEl.querySelector('span').textContent = en; toastEl.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('show'), ms); }
  function mew(ja, en, ms = 1600) {
    bubble.querySelector('b').textContent = ja; bubble.querySelector('span').textContent = en;
    const [hx, hy] = headPos(); bubble.style.left = `${clamp(hx / W, .12, .88) * 100}%`; bubble.style.top = `${clamp((hy - 40) / H, .14, .9) * 100}%`;
    bubble.classList.add('show'); clearTimeout(bubbleTimer); bubbleTimer = setTimeout(() => bubble.classList.remove('show'), ms);
  }
  function setStep(id) { S.step = id; S.st = 0; renderGoal(); renderSteps(); }
  function renderGoal() {
    const s = STEPS.find((x) => x[0] === S.step);
    let sub = s[2];
    if (S.step === 'play') sub += ` · 🪶 ${S.catches} / 3`;
    if (S.step === 'poke') sub += ` · 👉 ${S.pokes} / 3`;
    goalEl.innerHTML = `<small>${S.done ? 'Good night' : 'Naomi'}</small><b>${s[1]}</b><span>${sub}</span>`;
  }
  function renderSteps() { const i = STEPS.findIndex((x) => x[0] === S.step); $('steps').innerHTML = STEPS.map((s, k) => `<li class="${k < i || S.done ? 'done' : k === i ? 'now' : ''}">${s[1]} · <small>${s[2]}</small></li>`).join(''); }
  function renderHearts() { invEl.innerHTML = `<div class="hearts" title="なかよし度 · Bond">${HEART_STEPS.map((_, i) => `<i class="${i < S.hearts ? 'on' : ''}">♥</i>`).join('')}<em>なかよし · bond</em></div>`; }
  function heart() { S.hearts = Math.min(HEART_STEPS.length, S.hearts + 1); renderHearts(); SND.fx.heart(AZ(N.x)); const [hx, hy] = headPos(); for (let i = 0; i < 8; i++) hearts(hx, hy, 1); }
  function hint() { const h = HINTS[S.step]; if (h) toast(h[0], h[1], 3800); }
  $('hintBtn').addEventListener('click', hint);
  const sbtn = $('soundBtn');
  sbtn.addEventListener('click', () => { SND.setMuted(!SND.isMuted()); sbtn.textContent = SND.isMuted() ? '🔇' : '🔊'; sbtn.classList.toggle('off', SND.isMuted()); });

  // action widget (bottom right): "call" button for the call step, "blow" for the food
  let holding = false, keyHold = false, callTap = false;
  const ab = $('blowBtn');
  ab.addEventListener('pointerdown', (e) => { e.preventDefault(); holding = true; ab.classList.add('holding'); if (S.step === 'call') callTap = true; });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) ab.addEventListener(ev, () => { holding = false; ab.classList.remove('holding'); });
  $('micBars').innerHTML = '<i></i>'.repeat(6);
  function actionUI() {
    const want = S.started && !S.done && (S.step === 'call' || (S.step === 'feed' && S.food > 0));
    actEl.hidden = !want; if (!want) return;
    const call = S.step === 'call';
    actEl.querySelector('.lbl').textContent = call ? '🎤 声 · voice' : '🌬 息 · breath';
    ab.textContent = call ? '📣 ナオミ〜 · Call' : 'ふーふー · Blow';
    actEl.classList.toggle('call', call);
  }

  // ---------------------------------------------------------------- microphone (level only, nothing recorded)
  let mic = null, micState = 'none', floor = .01;
  const buf = new Float32Array(1024);
  function ensureMic() {
    if (micState !== 'none' || !$('micOn').checked) return;
    if (!navigator.mediaDevices?.getUserMedia) { micState = 'denied'; return; }
    micState = 'asking';
    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false } })
      .then((st) => { const ac = SND.ctx() || SND.init(); const an = ac.createAnalyser(); an.fftSize = 1024; ac.createMediaStreamSource(st).connect(an); mic = { an, st }; micState = 'on'; })
      .catch(() => { micState = 'denied'; });
  }
  $('micOn').addEventListener('change', (e) => { if (e.target.checked) ensureMic(); else { mic?.st.getTracks().forEach((t) => t.stop()); mic = null; micState = 'none'; } });
  function micLevel() {
    if (!mic) return 0;
    mic.an.getFloatTimeDomainData(buf); let s = 0; for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
    return Math.sqrt(s / buf.length);
  }

  // ---------------------------------------------------------------- particles + thermal pulses
  let parts = [], pulses = [];
  const pulse = (az, k, s, dur = .8) => pulses.push({ az, k, s, age: 0, dur });
  function hearts(x, y, n = 1) { for (let i = 0; i < n; i++) parts.push({ k: 'heart', x: x + rnd(-60, 60), y: y + rnd(-20, 20), vx: rnd(-30, 30), vy: rnd(-120, -60), life: 0, max: rnd(1.1, 1.8), s: rnd(.7, 1.3) }); }
  function steam(x, y) { parts.push({ k: 'steam', x: x + rnd(-50, 50), y, vx: rnd(-10, 10), vy: rnd(-70, -45), life: 0, max: rnd(1.6, 2.4), s: rnd(.8, 1.4) }); }
  function sparkle(x, y, n = 6) { for (let i = 0; i < n; i++) parts.push({ k: 'spark', x, y, vx: rnd(-200, 200), vy: rnd(-260, -40), life: 0, max: rnd(.4, .8), s: 1 }); }
  function zzz(x, y) { parts.push({ k: 'z', x, y, vx: rnd(10, 30), vy: -40, life: 0, max: 2.6, s: rnd(.8, 1.2) }); }

  // ---------------------------------------------------------------- audio loops
  let L = {};
  function setLoops() {
    const want = { room: 1, purr: 1, fur: 1, birds: S.bg !== 'night', rain: S.bg === 'night', steam: S.step === 'feed', feather: S.step === 'play' };
    for (const k of Object.keys(L)) if (!want[k]) { L[k].stop(); delete L[k]; }
    for (const [k, on] of Object.entries(want)) if (on && !L[k]) L[k] = SND.loop(k);
  }

  // ---------------------------------------------------------------- Naomi
  function img(pose, face) { return (face && IMG[`naomi_${pose}_${face}`]) || IMG[`naomi_${pose}`]; }
  function size() { const im = img(N.pose), h = POSE_H[N.pose] * N.s; return [im ? h * im.width / im.height : h * .9, h]; }
  function rect() { const [w, h] = size(); return { x0: N.x - w / 2, y0: N.y - h - N.jump, w, h }; }
  function headPos() {
    const r = rect();
    const fy = { sit: .22, close: .38, walk: .3, pounce: .2, eat: .45, loaf: .3, belly: .55, sleep: .35 }[N.pose] || .3;
    return [N.x + (N.pose === 'walk' || N.pose === 'eat' ? (N.flip ? 1 : -1) * r.w * .28 : 0), r.y0 + r.h * fy];
  }
  function setPose(p, x = N.x, y = N.y, s = 1) { N.pose = p; N.x = x; N.y = y; N.s = s; N.face = ''; }
  function faceNow() {
    if (S.t < N.faceUntil && N.face) return N.face;
    if (S.t < N.blinkUntil) return 'blink';
    return '';
  }
  function say(kind, ja, en, face = 'meow') {
    const az = AZ(N.x), d = N.pose === 'close' || N.pose === 'sleep' ? .5 : lerp(2.4, .8, N.near);
    const dur = SND.meow(kind, az, d);
    if (FACES[N.pose]?.includes(face)) { N.face = face; N.faceUntil = S.t + Math.max(.45, dur); }
    if (ja) mew(ja, en);
    N.squish = .05;
  }
  function walkTo(x, spd = 300) { N.tx = x; N.walkSpd = spd; N.pose = 'walk'; N.flip = x > N.x; }

  // ---------------------------------------------------------------- scene changes (fade to black, swap, fade in)
  let fading = 0;
  function go(bg, after) {
    fading = 1; $('fade').classList.add('on');
    setTimeout(() => { S.bg = bg; after(); setLoops(); setTimeout(() => { $('fade').classList.remove('on'); fading = 0; }, 150); }, 750);
  }

  // ---------------------------------------------------------------- input
  function toCanvas(e) { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; }
  function inRect(x, y, fx0, fy0, fx1, fy1) { const r = rect(); return x > r.x0 + r.w * fx0 && x < r.x0 + r.w * fx1 && y > r.y0 + r.h * fy0 && y < r.y0 + r.h * fy1; }
  const petZone = (x, y) => {
    if (!N.show) return false;
    if (S.step === 'pet') return inRect(x, y, .12, .02, .88, .62);
    if (S.step === 'belly') return inRect(x, y, .15, .15, .85, .85);
    if (S.step === 'sleep') return inRect(x, y, .05, .05, .95, .9);
    return false;
  };
  cv.addEventListener('pointerdown', (e) => {
    if (!S.started) return; cv.setPointerCapture?.(e.pointerId);
    const [x, y] = toCanvas(e); Object.assign(ptr, { down: true, x, y, sx: x, sy: y, st: performance.now(), moved: 0, lastT: performance.now() });
    if (S.step === 'play') aimWand(x, y);
  });
  cv.addEventListener('pointermove', (e) => {
    const [x, y] = toCanvas(e), n = performance.now(), dt = Math.max(1, n - ptr.lastT) / 1000, d = Math.hypot(x - ptr.x, y - ptr.y);
    if (S.started && S.step === 'play' && (ptr.down || e.pointerType === 'mouse')) aimWand(x, y);
    if (ptr.down) {
      ptr.moved += d;
      if (petZone(x, y)) ptr.strokeV = Math.min(1, ptr.strokeV * .7 + .3 * clamp(d / dt / 900));      // slow, gentle strokes count the most
    }
    ptr.over = S.started && (petZone(x, y) || (S.step === 'poke' && inRect(x, y, .05, .05, .95, 1)));
    stage.classList.toggle('pointer', ptr.over); stage.classList.toggle('wanding', S.started && S.step === 'play');
    ptr.x = x; ptr.y = y; ptr.lastT = n;
  });
  const up = (e) => {
    if (!ptr.down) return; ptr.down = false;
    const [x, y] = toCanvas(e);
    if (ptr.moved < 18 && performance.now() - ptr.st < 450) tap(x, y);
  };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', () => { ptr.down = false; });

  // the wand tip follows the pointer, kept inside the picture so the feather (hanging below it) never leaves the screen
  function aimWand(x, y) { wand.seen = true; wand.px = clamp(x, 140, 1780); wand.py = clamp(y, 120, 720); }
  function tap(x, y) {
    if (!S.started || S.done || fading) return;
    if (S.step === 'pet' && N.show && inRect(x, y, .35, .3, .65, .62)) {           // touch noses → she boops back: a cold little dot
      SND.fx.boop(AZ(N.x) * .3, .3); pulse(0, 'c', .55, .7); N.cool = .8; say('tiny', 'ちゅっ', '*boop*', 'blink'); return;
    }
    if (S.step === 'poke' && inRect(x, y, .05, .05, .95, 1)) poke();
    else if (S.step === 'call') callTap = true;
  }
  function poke() {
    S.pokes++; N.squish = .16; SND.fx.poke(AZ(N.x)); pulse(AZ(N.x), 'h', .35, .5); renderGoal();
    if (S.pokes === 1) { setTimeout(() => say('tiny', '…にゃ？', '…mew?'), 250); toast('…おこらない。やさしい子', "…She doesn't get angry. Such a gentle girl.", 2600); }
    else if (S.pokes === 2) setTimeout(() => say('ask', 'にゃう…？', 'Mrr…?'), 250);
    else if (S.pokes >= 3) {
      setTimeout(() => {
        setPose('belly', 960, 1000, 1.25); SND.fx.flop(AZ(960)); say('trill', 'ごろーん', '*flop*');
        toast('おなかを見せてくれた…', "She's showing you her tummy…", 3000); setStep('belly');
      }, 350);
    }
  }

  // ---------------------------------------------------------------- update
  let breath = 0, blowing = false, voiceLv = 0;
  function update(dt) {
    S.t += dt;
    const lv = micState === 'on' ? micLevel() : 0;
    if (!S.started) return;
    S.clock += dt; S.st += dt;
    floor = lv < floor ? lv : floor + (lv - floor) * dt * .05;
    const loud = micState === 'on' && lv > Math.max(.03, floor * 5);
    blowing = (S.step === 'feed' && S.food > 0) && (holding || keyHold || loud);
    breath += ((blowing ? 1 : 0) - breath) * (1 - Math.exp(-dt / (blowing ? .15 : .35)));
    voiceLv = loud ? lv : 0;

    // blink + breathing
    if (S.t > N.blinkAt) { N.blinkUntil = S.t + .14; N.blinkAt = S.t + rnd(2.5, 5.5); }
    N.squish *= Math.exp(-dt * 7);
    N.purr += (N.purrT - N.purr) * (1 - Math.exp(-dt / (N.purrT > N.purr ? .8 : 1.6)));
    N.cool = Math.max(0, N.cool - dt);

    // stroking
    const stroking = ptr.down && petZone(ptr.x, ptr.y) && ptr.strokeV > .02;
    ptr.strokeV *= Math.exp(-dt * 6);
    if (stroking && Math.random() < dt * 5) { const [hx] = headPos(); hearts(ptr.x, ptr.y - 30); }

    // walking
    if (N.tx !== null) {
      const d = N.tx - N.x, stepX = Math.sign(d) * Math.min(Math.abs(d), N.walkSpd * dt);
      N.x += stepX; N.flip = d > 0;
      N.stepAcc += Math.abs(stepX);
      if (N.stepAcc > 70) { N.stepAcc = 0; SND.fx.step(AZ(N.x), lerp(2.6, 1, N.near), .45); }
      if (Math.abs(d) < 2) { N.tx = null; N.onArrive?.(); N.onArrive = null; }
    }

    const sx = S.st;
    if (S.step === 'wake') {
      // eyes closed: she pads in from the left, sniffs your left ear, boops it with her cold nose, mews; then your eyes open
      const az0 = -1.25, steps = [.6, 1.0, 1.4, 1.8, 2.2, 2.6, 3.0];
      for (const ts of steps) if (sx - dt < ts && sx >= ts) SND.fx.step(lerp(az0, -.9, ts / 3), lerp(2.6, .7, ts / 3), .55);
      N.near = clamp((sx - 1.5) / 2.8) * .6; N.az = lerp(az0, -1, clamp(sx / 3));
      if (sx - dt < 3.4 && sx >= 3.4) SND.fx.sniff(-1.05, .32);
      if (sx - dt < 3.95 && sx >= 3.95) SND.fx.sniff(-1.1, .26);
      if (sx - dt < 4.6 && sx >= 4.6) { SND.fx.boop(-1.15, .22); pulse(-1.25, 'c', .95, 1.2); N.cool = 1.2; toast('ひゃっ、つめたい！ …ナオミのお鼻？', "Eek, cold! …Naomi's nose?", 3200); }
      if (sx - dt < 5.3 && sx >= 5.3) SND.meow('long', -.45, .5);
      S.eyes = ease(clamp((sx - 5.8) / 1.6));
      if (sx > 5.8 && !N.show) { N.show = true; setPose('close', 960, 1150, 1); }
      if (N.show) N.near = 1;
      if (sx > 7.6) { setStep('pet'); hint(); N.purrT = .25; }
    } else if (S.step === 'pet') {
      if (S.rub < 0) {
        if (stroking) { S.pet = Math.min(1, S.pet + dt * (.12 + .25 * ptr.strokeV)); N.face = 'happy'; N.faceUntil = S.t + .5; N.purrT = .35 + .65 * S.pet; }
        else N.purrT = Math.max(.25, N.purrT - dt * .05);
        if (S.pet >= 1) { S.rub = 0; toast('すりすり…', 'Nuzzle, nuzzle…', 3600); }
      } else {
        // nuzzles: left cheek, then right cheek — warm on that side
        S.rub += dt; const r = S.rub;
        const side = r < 2 ? -1 : r < 4 ? 1 : 0, k = side ? Math.sin(Math.PI * clamp(((r % 2) - .1) / 1.8)) : 0;
        N.x = 960 + side * 380 * k; N.tilt = -side * .2 * k; N.face = 'happy'; N.faceUntil = S.t + .3;
        if ((r - dt < .2 && r >= .2) || (r - dt < 2.2 && r >= 2.2)) { const az = r < 2 ? -1.2 : 1.2; SND.fx.rub(az, .26); pulse(az, 'h', .9, 1.8); }
        if (r - dt < 4.3 && r >= 4.3) { heart(); say('trill', 'ごろごろ…', '*purr purr*', 'happy'); }
        if (r > 5.6) go('day', () => { S.rub = -1; setStep('call'); N.show = true; N.tilt = 0; N.purrT = 0; setPose('loaf', 1540, 735, .5); N.near = .1; hint(); });
      }
    } else if (S.step === 'call') {
      S.callCool -= dt;
      S.callHold = loud ? S.callHold + dt : Math.max(0, S.callHold - dt * 2);
      if ((callTap || S.callHold > .3) && S.callCool <= 0 && N.tx === null) {
        callTap = false; S.callHold = 0; S.callCool = 1.6; S.calls++;
        if (S.calls === 1) setTimeout(() => { say('ask', 'にゃ？', 'Mew?'); toast('お返事してくれた！ もういちど呼んでみて', 'She answered! Call her once more', 3000); }, 450);
        else if (S.calls === 2) setTimeout(() => {
          say('mew', 'にゃ〜ん', 'Meow~');
          setTimeout(() => { setPose('walk', 1540, 735, .55); walkTo(1000, 240); N.onArrive = () => { setPose('sit', 1000, 1000, 1); say('trill', 'なぁに？', 'Mrrp?'); heart(); setTimeout(() => { setStep('play'); hint(); setLoops(); }, 900); }; }, 700);
        }, 400);
      }
      callTap = false;
      if (N.pose === 'walk') { const k = clamp((1540 - N.x) / 540); N.y = lerp(735, 1000, k); N.s = lerp(.55, 1, k); N.near = lerp(.15, .5, k); }
    } else if (S.step === 'play') {
      tickWand(dt);
      N.near = .5;
      if (N.pounceT >= 0) {
        N.pounceT += dt; const k = N.pounceT / .75;
        N.jump = Math.sin(Math.PI * clamp(k)) * 170;
        if (N.pounceT - dt < .38 && N.pounceT >= .38) {
          if (Math.abs(wand.fx - N.x) < 230 && wand.fy < N.y - 250) {
            S.catches++; renderGoal(); SND.fx.bell(AZ(wand.fx), .9); sparkle(wand.fx, wand.fy, 10); pulse(AZ(N.x), 'h', .5, .8);
            if (S.catches < 3) mew(['つかまえた！', 'もういっかい！'][S.catches - 1], ['Got it!', 'Again!'][S.catches - 1], 1200);
          }
        }
        if (k >= 1) {
          N.pounceT = -1; N.jump = 0; setPose('sit', N.x, 1000, 1); SND.fx.pounce(AZ(N.x)); N.cd = S.t + 1.6; wand.wig = 0;
          if (S.catches >= 3) { say('trill', 'たのしかった！', 'That was fun!'); heart(); S.catches = 3; setTimeout(() => go('day', () => { setStep('feed'); S.food = 1; setPose('sit', 1330, 1000, .95); hint(); SND.fx.bowl(0); }), 1600); N.cd = 1e9; }
        }
      } else if (S.catches < 3) {
        const d = wand.fx - N.x;
        if (Math.abs(d) > 240 && N.tx === null && (N.cd || 0) < S.t) walkTo(clamp(wand.fx - Math.sign(d) * 120, 260, 1660), 420);
        if (N.tx !== null && Math.abs(N.tx - (wand.fx - Math.sign(d) * 120)) > 200) N.tx = clamp(wand.fx - Math.sign(d) * 120, 260, 1660);
        if (N.tx === null && N.pose === 'walk') setPose('sit', N.x, 1000, 1);
        if (N.tx === null && N.pose !== 'pounce' && Math.abs(d) < 260 && wand.fy < 820 && wand.fy > 260 && wand.wig > .5 && (N.cd || 0) < S.t) {
          N.pounceT = 0; N.pose = 'pounce'; N.flip = d > 0; SND.meow('trill', AZ(N.x), 1);
        }
      }
    } else if (S.step === 'feed') {
      N.near = .45;
      if (S.food > 0) {
        if (Math.random() < dt * 8 * (.25 + S.food)) steam(960, 935);
        S.food = Math.max(0, S.food - dt * .26 * breath);
        if (S.st > 2 && Math.floor(S.st / 4.5) !== Math.floor((S.st - dt) / 4.5)) say('ask', ['にゃ…', 'まだ？'][Math.floor(S.st / 4.5) % 2], ['Mew…', 'Is it ready?'][Math.floor(S.st / 4.5) % 2]);
        if (S.food <= 0) { toast('もう熱くないよ', 'Not too hot anymore', 2400); S.eatT = 0; walkTo(1125, 220); N.onArrive = () => { setPose('eat', 1085, 1012, 1.05); N.flip = false; }; }
      } else if (S.eatT >= 0) {
        if (N.pose === 'eat' || S.eatT > 5) {
          S.eatT += dt;
          if (N.pose === 'eat' && Math.random() < dt * 2.6) SND.fx.crunch(AZ(N.x) * .6, .9);
          if (S.eatT > 5 && S.eatT - dt <= 5) { setPose('sit', 1100, 1000, 1); say('mew', 'ごちそうさま！', 'Thank you for the food!'); heart(); }
          if (S.eatT > 7.2) { S.eatT = -1; setLoops(); setPose('loaf', 960, 990, 1.3); setStep('poke'); hint(); toast('おなかいっぱいで、うとうと…', 'Full tummy, getting sleepy…', 2800); }
        }
      }
    } else if (S.step === 'poke') {
      N.near = .6; N.purrT = .15;
    } else if (S.step === 'belly') {
      N.near = .65;
      if (stroking) { S.belly = Math.min(1, S.belly + dt * (.11 + .22 * ptr.strokeV)); N.purrT = .4 + .6 * S.belly; }
      else N.purrT = Math.max(.3, N.purrT - dt * .05);
      if (S.belly >= 1) {
        S.belly = 2; heart(); toast('ふわっふわ…', 'Sooo fluffy…', 2600);
        setTimeout(() => go('night', () => { setStep('sleep'); setPose('sleep', 1000, 1135, 1.15); N.near = 1; N.purrT = .7; hint(); }), 2200);
      }
    } else if (S.step === 'sleep') {
      N.near = 1; N.purrT = stroking ? 1 : .7;
      if (stroking) S.calm = Math.min(1, S.calm + dt / 8);
      if (Math.random() < dt * .5) { const [hx, hy] = headPos(); zzz(hx + 60, hy - 40); }
      if (S.endT < 0 && (S.calm >= 1 || S.st > 28)) { S.endT = 0; heart(); SND.fx.night(); toast('おやすみ、ナオミ', 'Good night, Naomi', 6000); }
      if (S.endT >= 0) { S.endT += dt; S.dark = clamp(S.endT / 6) * .75; N.purrT = lerp(.7, .35, clamp(S.endT / 6)); if (S.endT > 7.5) finish(); }
    }

    // particles / pulses / loops
    for (const p of parts) { p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.k === 'spark') p.vy += 500 * dt; }
    parts = parts.filter((p) => p.life < p.max);
    for (const q of pulses) q.age += dt; pulses = pulses.filter((q) => q.age < q.dur);
    const az = N.show ? AZ(N.x) : (N.az || -1), dist = N.pose === 'close' || N.pose === 'sleep' ? .45 : lerp(2.4, .8, N.near);
    L.purr?.set(N.show ? N.purr * .9 : 0, az, dist); if (L.purr?.rate) L.purr.rate.value = S.step === 'sleep' ? .9 : 1;
    L.fur?.set(stroking ? .35 * ptr.strokeV + .12 : 0, AZ(ptr.x), .35);
    L.room?.set(.05);
    L.birds?.set(S.bg === 'morning' ? .5 : .3, -1.1, 4);
    L.rain?.set(.45, -1.15, 2.6);
    L.steam?.set(S.food > 0 ? .5 * S.food : 0, 0, .9);
    L.feather?.set(S.step === 'play' ? clamp(wand.speed / 2500) * .7 : 0, AZ(wand.fx), 1);
    SND.tick(dt);
  }
  // the teaser wand: the stick follows your pointer, the feather swings on a string beneath it
  function tickWand(dt) {
    if (!wand.seen) { wand.px = clamp(N.x + 330, 300, 1700) + Math.sin(S.t * 1.3) * 120; wand.py = 470 + Math.sin(S.t * 2.1) * 50; }
    const ox = wand.x, oy = wand.y;
    wand.x += (wand.px - wand.x) * (1 - Math.exp(-dt / .06)); wand.y += (wand.py - wand.y) * (1 - Math.exp(-dt / .06));
    const ax = (wand.x - wand.fx) * 40 - wand.vx * 4, ay = (wand.y + 110 - wand.fy) * 40 - wand.vy * 4 + 300;
    wand.vx += ax * dt; wand.vy += ay * dt; wand.fx += wand.vx * dt; wand.fy += wand.vy * dt;
    const sp = Math.hypot(wand.x - ox, wand.y - oy) / dt;
    wand.speed += (sp - wand.speed) * (1 - Math.exp(-dt / .12));
    wand.wig = clamp(wand.wig + (wand.speed > 350 ? dt * 2.5 : -dt * .8));
    if (wand.speed > 900 && Math.random() < dt * 4) SND.fx.bell(AZ(wand.fx), 1);
  }

  // ---------------------------------------------------------------- thermal sources
  function sources() {
    const out = [], add = (az, k, s, icon) => { if (s > .01) out.push({ az, k, s, icon }); };
    if (!S.started) return out;
    const az = N.show ? AZ(N.x) : (N.az ?? -1);
    const body = (N.cool > 0 ? .15 : 1) * N.near;
    if (S.step !== 'sleep') add(az, 'h', .42 * body, '🐈');
    else add(.25, 'h', .5 + .08 * Math.sin(S.t * 2.4), '🐈');                     // asleep on your lap, a little to the right
    add(az, 'h', .3 * N.purr * N.near, '💗');
    if (S.bg === 'morning' && S.step !== 'wake') add(-1.15, 'c', .14, '🪟');
    if (S.bg === 'night') add(-1.15, 'c', .26, '🌧');
    if (S.step === 'play') add(AZ(wand.fx), 'c', clamp(wand.speed / 2200) * .55, '🪶');
    if (S.step === 'feed' && S.food > 0) add(0, 'h', .5 * S.food, '🍲');
    for (const q of pulses) add(q.az, q.k, q.s * Math.min(1, q.age / .08) * (1 - q.age / q.dur), q.k === 'c' ? '👃' : '✨');
    if (breath > .03) add(0, 'c', .6 * breath, '🌬');
    return out;
  }
  // per ear: sum heat and cool separately, keep the stronger one (with a little hysteresis), smooth
  const ear = { L: { mode: '', v: 0 }, R: { mode: '', v: 0 } };
  function thermal(dt) {
    const sum = { L: { h: 0, c: 0 }, R: { h: 0, c: 0 } }, src = sources();
    for (const s of src) {
      const sn = Math.sin(s.az), wL = clamp(1 - 1.2 * Math.max(0, sn)), wR = clamp(1 - 1.2 * Math.max(0, -sn));
      sum.L[s.k] += s.s * wL; sum.R[s.k] += s.s * wR;
    }
    const th = { Lc: 0, Lh: 0, Rc: 0, Rh: 0 };
    for (const e of ['L', 'R']) {
      const E = ear[e], hh = Math.min(1, sum[e].h), cc = Math.min(1, sum[e].c);
      let mode = E.mode;
      if (!mode) mode = hh > cc ? 'h' : 'c';
      else if (mode === 'h' && cc > hh + .06) mode = 'c'; else if (mode === 'c' && hh > cc + .06) mode = 'h';
      if (mode !== E.mode) { E.v = 0; E.mode = mode; }
      const target = mode === 'h' ? Math.min(.9, hh) : cc;
      const tau = target > E.v ? (mode === 'h' ? .35 : .18) : .3;
      E.v += (target - E.v) * (1 - Math.exp(-dt / tau));
      th[e + mode] = E.v;
    }
    return { th, src };
  }

  // ---------------------------------------------------------------- drawing
  const BG_COL = { morning: ['#f6d6dc', '#c9a7c4'], day: ['#fde7c4', '#e7b98d'], night: ['#2a2f55', '#1a1830'] };
  function drawBg(c, bg) {
    const im = IMG[`bg_room_${bg}`];
    if (im) { c.drawImage(im, 0, 0, W, H); return; }
    const [a, b] = BG_COL[bg], g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, a); g.addColorStop(1, b); c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.ellipse(1000, 850, 700, 150, 0, 0, 7); c.fill();
  }
  function drawNaomi(c, t) {
    if (!N.show) return;
    const pose = N.pose, im = img(pose, faceNow()), [w, h] = size();
    const br = Math.sin(t * (S.step === 'sleep' ? 1.6 : 2.4));
    c.save();
    c.globalAlpha = N.alpha;
    c.translate(N.x, N.y - N.jump); c.rotate(N.tilt);
    const walkBob = pose === 'walk' ? Math.abs(Math.sin(t * 9)) * 6 : 0;
    c.translate(0, -walkBob);
    c.scale((N.flip ? -1 : 1) * (1 + N.squish * .6 - br * .004), 1 - N.squish + br * .012);
    if (pose !== 'close') { c.fillStyle = 'rgba(40,20,40,.18)'; c.beginPath(); c.ellipse(0, -4 + walkBob + N.jump, w * .38 * (1 - N.jump / 500), 18, 0, 0, 7); c.fill(); }
    if (im) c.drawImage(im, -w / 2, -h, w, h);
    else {   // placeholder until the art is in
      c.fillStyle = '#a9a3b4'; c.beginPath(); c.ellipse(0, -h * .35, w * .38, h * .35, 0, 0, 7); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.ellipse(0, -h * .3, w * .2, h * .25, 0, 0, 7); c.fill();
      c.fillStyle = '#a9a3b4'; c.beginPath(); c.arc(0, -h * .78, w * .24, 0, 7); c.fill();
      c.beginPath(); c.moveTo(-w * .22, -h * .86); c.lineTo(-w * .14, -h); c.lineTo(-w * .04, -h * .9); c.moveTo(w * .22, -h * .86); c.lineTo(w * .14, -h); c.lineTo(w * .04, -h * .9); c.fill();
      c.fillStyle = '#7c9a3a'; for (const s of [-1, 1]) { c.beginPath(); c.arc(s * w * .08, -h * .8, w * .03, 0, 7); c.fill(); }
    }
    c.restore();
  }
  function drawWand(c, t) {
    if (S.step !== 'play') return;
    const tipX = wand.x, tipY = wand.y, ox = Math.min(W + 60, tipX + 900), oy = H + 80;   // the stick comes in from the bottom right
    c.save(); c.lineCap = 'round';
    const stick = (col, lw, dy = 0) => { c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); c.moveTo(ox, oy); c.quadraticCurveTo((ox + tipX) / 2, (oy + tipY) / 2 - 50 + dy, tipX, tipY + dy); c.stroke(); };
    stick('rgba(60,30,40,.35)', 24); stick('#b9844c', 16); stick('#f1cf9c', 5, -4);
    c.strokeStyle = '#7a3d5c'; c.lineWidth = 4; c.beginPath(); c.moveTo(tipX, tipY); c.quadraticCurveTo((tipX + wand.fx) / 2, Math.max(tipY, wand.fy) + 14, wand.fx, wand.fy); c.stroke();
    c.translate(wand.fx, wand.fy); c.rotate(Math.atan2(wand.vx, 600));
    if (!wand.seen || S.st < 3) {   // "here!": a pulsing ring until you take the wand
      const k = (t * 1.4) % 1; c.strokeStyle = `rgba(255,120,170,${1 - k})`; c.lineWidth = 6; c.beginPath(); c.arc(0, 60, 90 + 80 * k, 0, 7); c.stroke();
    }
    c.shadowColor = 'rgba(255,90,150,.75)'; c.shadowBlur = 26;
    for (let i = 0; i < 7; i++) {   // feathers hanging from the pom-pom
      const a = (i - 3) * .3 + Math.sin(t * 7 + i) * .08 - Math.atan2(wand.vx, 900) * .8;
      c.save(); c.rotate(a);
      c.fillStyle = ['#ff5f9e', '#ffffff', '#ff9cc4', '#b58cff'][i % 4]; c.strokeStyle = '#8c2f5c'; c.lineWidth = 3;
      c.beginPath(); c.ellipse(0, 62, 16, 62, 0, 0, 7); c.fill(); c.stroke();
      c.strokeStyle = 'rgba(140,47,92,.55)'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(0, 10); c.lineTo(0, 118); c.stroke();
      c.restore();
    }
    c.shadowBlur = 0;
    c.fillStyle = '#ff4f93'; c.strokeStyle = '#8c2f5c'; c.lineWidth = 4; c.beginPath(); c.arc(0, 0, 28, 0, 7); c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.arc(-10, -10, 10, 0, 7); c.fill();
    c.fillStyle = '#ffd04d'; c.strokeStyle = '#a8761c'; c.lineWidth = 3; c.beginPath(); c.arc(0, -34, 14, 0, 7); c.fill(); c.stroke(); c.fillStyle = '#7a5410'; c.fillRect(-8, -31, 16, 3);
    c.restore();
  }
  function drawBowl(c) {
    if (S.step !== 'feed' || N.pose === 'eat') return;
    const im = IMG.prop_bowl, w = 210;
    if (im) c.drawImage(im, 960 - w / 2, 1010 - w * im.height / im.width, w, w * im.height / im.width);
    else { c.fillStyle = '#f7b6c9'; c.beginPath(); c.ellipse(960, 990, 140, 40, 0, 0, 7); c.fill(); c.fillRect(840, 920, 240, 70); c.fillStyle = '#a5683c'; c.beginPath(); c.ellipse(960, 925, 115, 26, 0, 0, 7); c.fill(); }
    if (S.food > 0) { c.fillStyle = `rgba(255,140,80,${.25 * S.food})`; c.beginPath(); c.ellipse(960, 930, 150, 60, 0, 0, 7); c.fill(); }
  }
  function drawParts(c) {
    for (const p of parts) {
      const k = p.life / p.max;
      c.save(); c.globalAlpha = (1 - k) * (p.k === 'steam' ? .45 : 1);
      if (p.k === 'heart') { c.fillStyle = '#ff8fb8'; c.font = `${Math.round(44 * p.s)}px sans-serif`; c.textAlign = 'center'; c.fillText('♥', p.x, p.y); }
      else if (p.k === 'steam') { const x = p.x + Math.sin(p.life * 3) * 12, r = 30 * p.s * (1 + k), g = c.createRadialGradient(x, p.y, 0, x, p.y, r); g.addColorStop(0, 'rgba(255,255,255,.8)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, p.y, r, 0, 7); c.fill(); }
      else if (p.k === 'spark') { c.fillStyle = '#fff6c0'; c.beginPath(); c.arc(p.x, p.y, 6, 0, 7); c.fill(); }
      else if (p.k === 'z') { c.fillStyle = '#dfe6ff'; c.font = `700 ${Math.round(50 * p.s * (1 + k * .6))}px "Zen Maru Gothic", sans-serif`; c.fillText('z', p.x, p.y); }
      c.restore();
    }
  }
  function drawEyes(c) {   // waking up: eyelids
    if (S.step !== 'wake' && S.eyes >= 1) return;
    const open = S.step === 'wake' ? S.eyes : 1, gap = open * H * .62;
    c.save(); c.fillStyle = '#0b0710';
    c.beginPath(); c.moveTo(0, 0); c.lineTo(W, 0); c.lineTo(W, H / 2 - gap); c.quadraticCurveTo(W / 2, H / 2 - gap * 1.5, 0, H / 2 - gap); c.fill();
    c.beginPath(); c.moveTo(0, H); c.lineTo(W, H); c.lineTo(W, H / 2 + gap); c.quadraticCurveTo(W / 2, H / 2 + gap * 1.5, 0, H / 2 + gap); c.fill();
    c.restore();
  }
  function draw(t) {
    const close = N.show && (N.pose === 'close' || N.pose === 'sleep');
    if (close) { ctx.save(); ctx.filter = 'blur(10px)'; drawBg(ctx, S.bg); ctx.restore(); ctx.fillStyle = S.bg === 'night' ? 'rgba(10,8,30,.25)' : 'rgba(255,240,245,.12)'; ctx.fillRect(0, 0, W, H); }
    else drawBg(ctx, S.bg);
    if (S.bg === 'day' && !close) {   // sunbeam shimmer
      ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = `rgba(255,220,150,${.06 + .03 * Math.sin(t * .7)})`; ctx.fillRect(0, 0, W, H); ctx.restore();
    }
    drawBowl(ctx);
    drawNaomi(ctx, t);
    drawWand(ctx, t);
    drawParts(ctx);
    if (S.bg === 'night') { const g = ctx.createRadialGradient(1000, 900, 200, 960, 600, 1300); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(5,5,25,.35)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    if (S.dark > 0) { ctx.fillStyle = `rgba(4,3,12,${S.dark})`; ctx.fillRect(0, 0, W, H); }
    if (S.started) drawEyes(ctx);
  }

  // ---------------------------------------------------------------- side panel: radar + meters + device
  const rc = $('radar').getContext('2d');
  function radar(src, th) {
    const w = 480, h = 420, cx = 240, cy = 220, R = 160;
    rc.clearRect(0, 0, w, h);
    rc.strokeStyle = 'rgba(255,255,255,.08)'; rc.lineWidth = 1.5; for (const r of [R * .5, R]) { rc.beginPath(); rc.arc(cx, cy, r, 0, 7); rc.stroke(); }
    rc.fillStyle = '#8a7d93'; rc.font = '600 13px Inter'; rc.textAlign = 'center'; rc.fillText('front', cx, cy - R - 10); rc.fillText('L', cx - R - 18, cy + 5); rc.fillText('R', cx + R + 18, cy + 5);
    for (const [e, sx] of [['L', -1], ['R', 1]]) {
      const v = Math.max(th[e + 'c'], th[e + 'h']), col = th[e + 'c'] > th[e + 'h'] ? '79,179,255' : '255,122,69';
      rc.fillStyle = v > .02 ? `rgba(${col},${.25 + .75 * v})` : '#2a2333'; rc.beginPath(); rc.ellipse(cx + sx * 46, cy, 12, 24, 0, 0, 7); rc.fill();
      if (v > .02) { rc.shadowColor = `rgb(${col})`; rc.shadowBlur = 22 * v; rc.fill(); rc.shadowBlur = 0; }
    }
    rc.fillStyle = '#3a3046'; rc.beginPath(); rc.arc(cx, cy, 40, 0, 7); rc.fill(); rc.fillStyle = '#4c4058'; rc.beginPath(); rc.moveTo(cx - 9, cy - 38); rc.lineTo(cx, cy - 52); rc.lineTo(cx + 9, cy - 38); rc.fill();
    rc.font = '26px sans-serif'; rc.textBaseline = 'middle';
    const seen = new Set();
    for (const s of src) {
      const key = s.icon + Math.round(s.az * 10); if (seen.has(key)) continue; seen.add(key);
      const x = cx + Math.sin(s.az) * R, y = cy - Math.cos(s.az) * R;
      rc.globalAlpha = clamp(.35 + s.s); rc.fillStyle = s.k === 'h' ? 'rgba(255,122,69,.25)' : 'rgba(79,179,255,.25)'; rc.beginPath(); rc.arc(x, y, 18 + 18 * s.s, 0, 7); rc.fill();
      rc.fillText(s.icon, x, y + 1); rc.globalAlpha = 1;
    }
    rc.textBaseline = 'alphabetic';
  }
  const DEFAULT_RANGE = { heatMin: 0, heatMax: 200, coolMin: 35, coolMax: 80 }, SEND_INTERVAL = 100, OFF = .03;
  const store = { get: (k, d) => { try { return JSON.parse(localStorage.getItem(`moheat.${k}`)) ?? d; } catch { return d; } }, set: (k, v) => { try { localStorage.setItem(`moheat.${k}`, JSON.stringify(v)); } catch {} } };
  const range = { ...DEFAULT_RANGE, ...store.get('range', {}) };
  let lastSent = '', lastSendAt = 0, tripped = false, intensity = +store.get('asmr.intensity', 100) / 100;
  const device = MoHeatDevice.create({ select: $('portSelect'), addBtn: $('addPort'), connectBtn: $('connectBtn'), status: $('deviceStatus') }, { log: (l) => console.log('[MoHeat]', l), onConnect: () => { lastSent = ''; } });
  if (!MoHeatDevice.supported) $('deviceStatus').querySelector('span').textContent = 'Web Serial needs desktop Chrome / Edge';
  function command(th) {
    const part = (sd, c, h) => (c > OFF ? `${sd}C${Math.round(range.coolMin + c * (range.coolMax - range.coolMin))}` : h > OFF ? `${sd}H${Math.round(range.heatMin + h * (range.heatMax - range.heatMin))}` : `${sd}H0`);
    return Math.max(th.Lc, th.Lh, th.Rc, th.Rh) <= OFF ? 'stop' : `${part('L', th.Lc, th.Lh)} ${part('R', th.Rc, th.Rh)}`;
  }
  function stopOutput() { if (device.isConnected()) device.send('stop'); lastSent = 'stop'; }
  function emergencyStop() { tripped = !tripped; const b = $('estop'); if (tripped) { stopOutput(); b.textContent = '↺ Re-arm output'; b.classList.add('tripped'); } else { b.textContent = '■ STOP'; b.classList.remove('tripped'); lastSent = ''; } }
  $('estop').addEventListener('click', emergencyStop); addEventListener('pagehide', stopOutput);
  $('intensity').value = Math.round(intensity * 100); $('intensityVal').textContent = `${Math.round(intensity * 100)}%`;
  $('intensity').addEventListener('input', (e) => { intensity = +e.target.value / 100; $('intensityVal').textContent = `${e.target.value}%`; store.set('asmr.intensity', +e.target.value); });
  const meterEls = Object.fromEntries(['Lc', 'Lh', 'Rc', 'Rh'].map((k) => [k, [$(`m${k}`), $(`v${k}`)]]));
  let conflicts = 0;
  function output(th, live) {
    const sc = Object.fromEntries(Object.entries(th).map(([k, v]) => [k, live && !tripped ? v * intensity : 0]));
    if ((sc.Lc > OFF && sc.Lh > OFF) || (sc.Rc > OFF && sc.Rh > OFF)) conflicts++;          // must stay 0
    for (const [k, [bar, val]] of Object.entries(meterEls)) { bar.style.width = `${sc[k] * 100}%`; val.textContent = Math.round(sc[k] * 100); }
    const cmd = command(sc); $('cmd').textContent = cmd;
    for (const [e, el] of [['L', $('glowL')], ['R', $('glowR')]]) {
      const c = sc[e + 'c'], h = sc[e + 'h'], v = Math.max(c, h), col = c > h ? '79,179,255' : '255,122,69';
      el.style.opacity = v.toFixed(2); el.style.background = `linear-gradient(to ${e === 'L' ? 'right' : 'left'}, rgba(${col},.55), rgba(${col},0))`;
    }
    if (!device.isConnected() || !$('sendOn').checked) return;
    const n = performance.now(); if (cmd !== lastSent && n - lastSendAt >= SEND_INTERVAL) { device.send(cmd); lastSent = cmd; lastSendAt = n; }
  }
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  // ---------------------------------------------------------------- main loop
  let last = performance.now(), hidden = false;
  function loop() {
    const n = performance.now(), dt = clamp((n - last) / 1000, 0, .05); last = n;
    if (!hidden) {
      update(dt);
      if (S.started) draw(S.t); else drawCover();
      const { th, src } = thermal(dt);
      output(th, S.started); radar(S.started ? src : [], th);
      $('clock').textContent = fmt(S.clock);
      $('posInfo').textContent = { morning: 'Morning', day: 'Afternoon', night: 'Rainy night' }[S.bg];
      actionUI(); actEl.classList.toggle('hot', blowing);
      const lv = micState === 'on' ? micLevel() : 0;
      actEl.querySelectorAll('.mic i').forEach((b, i) => { const on = lv * 9 > (i + 1) / 7; b.style.height = `${on ? 35 + 65 * Math.min(1, lv * 9 - i / 7) : 15}%`; b.style.opacity = on ? 1 : .35; });
      $('micBars').hidden = micState !== 'on';
    }
    requestAnimationFrame(loop);
  }
  document.addEventListener('visibilitychange', () => { hidden = document.hidden; if (hidden) { stopOutput(); SND.ctx()?.suspend(); } else { last = performance.now(); SND.ctx()?.resume(); } });
  document.addEventListener('keydown', (e) => {
    if (e.target.matches?.('input, select')) return;
    if (e.code === 'Escape') emergencyStop();
    else if (e.code === 'Space' || e.code === 'KeyB') { e.preventDefault(); keyHold = true; if (S.step === 'call' && !e.repeat) callTap = true; }
    else if (e.code === 'KeyH') hint();
  });
  document.addEventListener('keyup', (e) => { if (e.code === 'Space' || e.code === 'KeyB') keyHold = false; });

  function finish() {
    if (S.done) return;
    S.done = true; renderGoal(); renderSteps();
    setTimeout(() => {
      S.started = false; stopOutput(); for (const l of Object.values(L)) l.stop(); L = {};
      bubble.classList.remove('show');
      const c = $('cleared'); c.hidden = false; c.textContent = `💤 ナオミと、ふわふわの一日 · A fluffy day together (${fmt(S.clock)})`;
      $('startBtn').textContent = '↺ もう一度 · Play again';
      $('intro').classList.remove('hidden'); drawCover();
    }, 1200);
  }
  function resetNaomi() { Object.assign(N, { pose: 'close', x: 960, y: 1150, s: 1, flip: false, face: '', tilt: 0, squish: 0, jump: 0, show: false, near: 0, purr: 0, purrT: 0, tx: null, pounceT: -1, cool: 0, cd: 0, az: -1.25 }); }
  function start() {
    SND.init(); ensureMic();
    S = fresh(); resetNaomi(); parts = []; pulses = []; $('cleared').hidden = true;
    $('intro').classList.add('hidden'); S.started = true;
    const jump = QS.get('step');
    if (jump && STEPS.some((s) => s[0] === jump) && jump !== 'wake') jumpTo(jump);
    else { setStep('wake'); toast(HINTS.wake[0], HINTS.wake[1], 4000); }
    setLoops(); renderHearts(); renderGoal(); renderSteps();
  }
  // ?step=<id>: start at that step (testing)
  function jumpTo(id) {
    S.eyes = 1; N.show = true; S.hearts = Math.max(0, HEART_STEPS.indexOf(id)); if (S.hearts < 0) S.hearts = 0;
    if (id === 'pet') { S.bg = 'morning'; setPose('close', 960, 1150, 1); N.near = 1; N.purrT = .25; }
    if (id === 'call') { S.bg = 'day'; setPose('loaf', 1540, 735, .5); N.near = .1; }
    if (id === 'play') { S.bg = 'day'; setPose('sit', 1000, 1000, 1); S.catches = 0; N.cd = 0; }
    if (id === 'feed') { S.bg = 'day'; setPose('sit', 1330, 1000, .95); S.food = 1; }
    if (id === 'poke') { S.bg = 'day'; setPose('loaf', 960, 990, 1.3); }
    if (id === 'belly') { S.bg = 'day'; setPose('belly', 960, 1000, 1.25); }
    if (id === 'sleep') { S.bg = 'night'; setPose('sleep', 1000, 1135, 1.15); N.near = 1; N.purrT = .7; }
    setStep(id); hint(); renderHearts();
  }
  $('startBtn').addEventListener('click', start);
  $('lrBtn').addEventListener('click', () => { SND.lrCheck(); const b = $('lrBtn'); b.textContent = '🎧 Left…'; setTimeout(() => { b.textContent = '🎧 …Right'; }, 900); setTimeout(() => { b.textContent = '🎧 Left / Right check'; }, 1900); });

  // cover: the sunny room, Naomi sitting on the right (also behind the cover before Start)
  function drawCover() {
    drawBg(ctx, 'day');
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = 'rgba(255,220,150,.08)'; ctx.fillRect(0, 0, W, H); ctx.restore();
    const im = IMG.naomi_sit; if (!im) return;
    const h = 900, w = h * im.width / im.height;
    ctx.fillStyle = 'rgba(40,20,40,.16)'; ctx.beginPath(); ctx.ellipse(1450, 1035, w * .36, 22, 0, 0, 7); ctx.fill();
    ctx.drawImage(im, 1450 - w / 2, 1040 - h, w, h);
  }
  window.NAOMI = { get S() { return S; }, N, thermal: () => thermal(.05), conflicts: () => conflicts, jumpTo, poke };
  renderGoal(); renderSteps(); renderHearts();
  artReady.then(() => document.fonts.ready).then(() => { if (!S.started) drawCover(); });
  if (QS.has('cover')) { document.body.classList.add('cover-only'); return; }
  if (QS.has('autoplay') || QS.get('step')) { const ac = SND.init(); if (QS.get('step') || ac.state === 'running') start(); else ac.resume().then(() => { if (ac.state === 'running' && !S.started) start(); }).catch(() => {}); }
  requestAnimationFrame(loop);
})();
