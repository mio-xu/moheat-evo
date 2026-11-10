// 『ナオミ、いまなにしてる？』 — Naomi through the pet camera at home. You're out; the camera on the shelf is your eyes and ears.
// find her (pan the camera toward her sleepy breathing) → call her through the speaker → she comes right up to the lens
// (cold nose on the lens, cheek rubs on the camera) → laser pointer → food dispenser → night: IR night vision, rain,
// say good night → you come home: keys at the door, she runs off to greet you.
// Everything is heard and felt relative to the camera: sounds are placed with HRTF at their direction from where the
// camera looks, and the thermal output uses the same directions (pan the camera and her warmth turns with it).
(() => {
  const $ = (id) => document.getElementById(id);
  const QS = new URLSearchParams(location.search);
  const SND = window.NaomiAudio, CA = window.CamAudio, W = 1920, H = 1080;
  const cv = $('scene'), osd = $('osd'), oc = osd.getContext('2d'), stage = $('stage');
  const off = document.createElement('canvas'); off.width = W; off.height = H;
  const ctx = off.getContext('2d');
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const ease = (k) => k < .5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;

  // ---------------------------------------------------------------- art: Demo 11's Seedance art, read by path (never modified)
  const ART = '../_kit/naomi/art/', IMG = {};
  const ART_NAMES = ['bg_room_day', 'bg_room_night', 'prop_bowl', 'naomi_sit', 'naomi_sit_blink', 'naomi_sit_meow', 'naomi_sit_happy',
    'naomi_close', 'naomi_close_blink', 'naomi_close_happy', 'naomi_walk', 'naomi_pounce', 'naomi_eat', 'naomi_loaf', 'naomi_sleep', 'naomi_belly'];
  const artReady = Promise.all(ART_NAMES.map((n) => new Promise((res) => { const im = new Image(); im.onload = () => { IMG[n] = im; res(); }; im.onerror = () => res(); im.src = `${ART}${n}.webp?v=1`; })));
  const WORLD_H = { sit: 560, walk: 400, pounce: 600, eat: 380, loaf: 340, sleep: 340, belly: 330 };   // drawn height at the nearest floor line
  const FACES = { sit: ['blink', 'meow', 'happy'], close: ['blink', 'happy'] };

  // ---------------------------------------------------------------- the camera: a 1.5× view into the room picture, pans left / right
  const Z = 1.5, HALF = W / (2 * Z), CAM_Y = 700, CAM_MIN = HALF, CAM_MAX = W - HALF;
  const cam = { x: CAM_MAX, tx: CAM_MAX, v: 0, shake: 0, ir: 0, irTo: 0, stat: 0, fog: 0, smudge: 0, flash: 0, manualT: -9, track: false, therm: 0, thermTo: 0 };
  const toWorld = (sx, sy) => [cam.x + (sx - W / 2) / Z, CAM_Y + (sy - H / 2) / Z];
  const toScreen = (wx, wy) => [W / 2 + (wx - cam.x) * Z, H / 2 + (wy - CAM_Y) * Z];
  const AZ = (wx) => clamp((wx - cam.x) / HALF * .62, -1.45, 1.45);      // world x → azimuth from the camera (rad, + = right)
  const depth = (wy) => clamp((wy - 780) / 280);                            // 0 = back of the rug, 1 = right under the camera
  const DIST = (wy) => lerp(4.2, 1, depth(wy));
  const scaleAt = (wy) => lerp(.45, 1, depth(wy));
  const P = { nap: [330, 880], bowl: [1440, 1012], feeder: [1585, 1012], windowDay: 390, windowNight: 360, blanket: [1330, 852], door: 2350,
    house: [1683, 612], houseFront: [1660, 800], fan: [520, 1000], lampDay: [1367, 407], lampNight: [1351, 407],
    glassDay: [60, 0, 727, 547], glassNight: [120, 0, 613, 535], blanketMid: [1340, 790] };

  // ---------------------------------------------------------------- text
  const STEPS = [
    ['find', 'サーモで ナオミを さがそう', 'Find Naomi with the thermal view'],
    ['call', 'カメラから よんでみよう', 'Call her through the camera'],
    ['lens', 'レンズごしに なでなで', 'Stroke her through the lens'],
    ['laser', 'レーザーで あそぼう', 'Play with the laser'],
    ['cool', '扇風機で すずしく', 'Cool her down with the fan'],
    ['feed', 'ごはんを あげよう', 'Give her dinner'],
    ['night', 'あたためて、おやすみ', 'Warm her up, say good night'],
    ['home', 'ただいま', 'Coming home'],
  ];
  const HINTS = {
    connect: ['カメラに接続中…', 'Connecting to the camera…'],
    find: ['どこかに かくれてる… 🌡 サーモにして、あたたかい所を さがして', 'She is hiding somewhere. Turn on 🌡 Thermal and look for the warm spot'],
    call: ['🎤 を押しながら「ナオミ〜」（マイクなしでも OK）', 'Hold 🎤 and say "Naomi!" (works without a mic too)'],
    lens: ['画面の ナオミの顔を ゆっくりドラッグ', 'Drag slowly over her face on the screen'],
    laser: ['🔴 をオンにして、床をタップ・ドラッグ（3回 つかまえたら OK）', 'Turn on 🔴, then tap or drag on the floor (3 catches)'],
    cool: ['🌀 をつけて、画面をドラッグ。風を ナオミに あてて', 'Turn on 🌀, then drag on the picture to aim the wind at her'],
    feed: ['🍚 を押して、ごはんを出してあげて', 'Press 🍚 to drop her dinner'],
    night: ['🔥 ホットカーペットを つけて あたためてあげて', 'Turn on 🔥 the heated blanket to warm her up'],
    night2: ['🎤 を押しながら「おやすみ」', 'Hold 🎤 and say "good night"'],
    home: ['耳をすませて…', 'Listen…'],
  };
  const HEART_STEPS = ['find', 'call', 'lens', 'laser', 'cool', 'feed', 'night'];

  // ---------------------------------------------------------------- state
  const fresh = () => ({ step: 'connect', bg: 'day', started: false, done: false, t: 0, clock: 0, st: 0, sim: 14 * 3600 + 32 * 60,
    hearts: 0, found: -1, calls: 0, lens: 0, lensReady: false, stroke: 0, rubs: 0, catches: 0, food: -1, eatT: -1, said: -1, endT: -1, fan: false, aim: 1500, fanV: 0, carpet: 0, heater: false, warmT: -1 });
  let S = fresh();
  const N = { pose: 'sleep', x: P.nap[0], y: P.nap[1], flip: false, face: '', faceUntil: 0, blinkAt: 2, blinkUntil: 0, squish: 0, jump: 0, tilt: 0,
    show: true, purr: .35, purrT: .35, tx: null, ty: null, spd: 300, stepAcc: 0, pounce: null, screen: false, zoom: 0, lunge: 0, ox: 0, oxT: 0, tiltT: 0, eyes: 0, after: null, hidden: false, heat: 0, cold: 0 };
  const laser = { on: false, x: 900, y: 940, tx: 900, ty: 940, still: 0, hide: 0, need: false, cx: 0, cy: 0 };

  // ---------------------------------------------------------------- HUD
  const toastEl = $('toast'), goalEl = $('goal'), invEl = $('inv'), pushEl = $('push');
  let toastTimer = 0, pushTimer = 0;
  function toast(ja, en, ms = 3000) { toastEl.querySelector('b').textContent = ja; toastEl.querySelector('span').textContent = en; toastEl.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('show'), ms); }
  function push(icon, ja, en, ms = 4200) {
    pushEl.querySelector('i').textContent = icon; pushEl.querySelector('b').textContent = ja; pushEl.querySelector('div > span').textContent = en;
    $('pushTime').textContent = simTime().slice(0, 5); pushEl.classList.add('show'); clearTimeout(pushTimer); pushTimer = setTimeout(() => pushEl.classList.remove('show'), ms);
  }
  function setStep(id) { if (id !== 'cool') CA.fan(0); S.step = id; S.st = 0; renderGoal(); renderSteps(); dockUI(); }
  const goalTag = () => { const P = window.MoHeatSub?.pick; const t = S.done ? { ja: 'おかえり', en: 'Welcome home', zh: '欢迎回家' } : { ja: 'ナオミカメラ', en: 'Naomi Cam', zh: '直美摄像头' }; return P ? P(t) : t.en; };
  addEventListener('moheat:sublang', () => { if (S?.started) renderGoal(); });
  function renderGoal() {
    const s = STEPS.find((x) => x[0] === S.step) || ['connect', '接続中…', 'Connecting…'];
    let sub = s[2];
    if (S.step === 'laser') sub += ` · 🐾 ${S.catches} / 3`;
    if (S.step === 'cool') sub += ` · 🌡 ${naomiTemp().toFixed(1)}℃`;
    goalEl.innerHTML = `<small>${goalTag()}</small><b>${s[1]}</b><span>${sub}</span>`;
  }
  function renderSteps() { const i = STEPS.findIndex((x) => x[0] === S.step); $('steps').innerHTML = STEPS.map((s, k) => `<li class="${k < i || S.done ? 'done' : k === i ? 'now' : ''}">${s[1]} · <small>${s[2]}</small></li>`).join(''); }
  function renderHearts() { invEl.innerHTML = `<div class="hearts" title="なかよし度 · Bond">${HEART_STEPS.map((_, i) => `<i class="${i < S.hearts ? 'on' : ''}">♥</i>`).join('')}<em>なかよし · bond</em></div>`; }
  function heart() { S.hearts = Math.min(HEART_STEPS.length, S.hearts + 1); renderHearts(); SND.fx.heart(N.screen ? 0 : AZ(N.x)); const [hx, hy] = headWorld(); for (let i = 0; i < 8; i++) hearts(hx, hy); }
  function hint() { const h = HINTS[S.step === 'night' && S.carpet > .9 ? 'night2' : S.step]; if (h) toast(h[0], h[1], 4200); }
  $('hintBtn').addEventListener('click', hint);
  const sbtn = $('soundBtn');
  sbtn.addEventListener('click', () => { const m = !SND.isMuted(); SND.setMuted(m); CA.setMuted(m); sbtn.textContent = m ? '🔇' : '🔊'; sbtn.classList.toggle('off', m); });
  const simTime = () => { const s = Math.floor(S.sim) % 86400; return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };

  // ---------------------------------------------------------------- dock (camera app buttons)
  const btn = { panL: $('panL'), panR: $('panR'), therm: $('thermBtn'), talk: $('talkBtn'), laser: $('laserBtn'), fan: $('fanBtn'), feed: $('feedBtn'), heat: $('heatBtn'), snap: $('snapBtn') };
  function dockUI() {
    const st = S.step, live = S.started && !S.done && st !== 'connect';
    const show = { panL: 1, panR: 1, therm: 1, snap: 1, talk: st === 'call' || st === 'night', laser: st === 'laser', fan: st === 'cool', feed: st === 'feed', heat: st === 'night' };
    const en = { panL: live && st !== 'lens', panR: live && st !== 'lens', therm: live, talk: live && (st === 'call' || (st === 'night' && S.carpet > .9)) && S.said < 0,
      laser: live && st === 'laser', fan: live && st === 'cool', feed: live && st === 'feed' && S.food < 0, heat: live && st === 'night' && !S.heater, snap: live };
    for (const [k, b] of Object.entries(btn)) { b.disabled = !en[k]; b.hidden = !show[k]; }
    btn.talk.classList.toggle('want', en.talk);
    btn.therm.classList.toggle('on', cam.thermTo > 0); btn.therm.classList.toggle('want', st === 'find' && S.found < 0 && !cam.thermTo);
    btn.fan.classList.toggle('on', S.fan); btn.fan.classList.toggle('want', en.fan && !S.fan);
    btn.heat.classList.toggle('on', S.heater); btn.heat.classList.toggle('want', en.heat);
    btn.laser.classList.toggle('want', en.laser && !laser.on); btn.laser.classList.toggle('on', laser.on);
    btn.feed.classList.toggle('want', en.feed);
    stage.classList.toggle('aim', (st === 'laser' && laser.on) || (st === 'cool' && S.fan));
    stage.classList.toggle('stroke', st === 'lens');
    stage.classList.toggle('grab', live && !['lens', 'laser', 'cool'].includes(st));
  }
  let panDir = 0;
  for (const [b, d] of [[btn.panL, -1], [btn.panR, 1]]) {
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); if (!b.disabled) panDir = d; });
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, () => { if (panDir === d) panDir = 0; });
  }
  // talk: hold to talk (button or Space). Counts as a call when you hold it ~0.6 s or the mic hears your voice.
  const talk = { on: false, held: 0, voice: 0 };
  function talkDown() { if (btn.talk.disabled || talk.on) return; talk.on = true; talk.held = 0; talk.voice = 0; btn.talk.classList.add('holding'); CA.fx.talkOn(); ensureMic(); }
  function talkUp() {
    if (!talk.on) return; talk.on = false; btn.talk.classList.remove('holding'); CA.fx.talkOff();
    if (talk.held > .6 || talk.voice > .25) onTalk();
  }
  btn.talk.addEventListener('pointerdown', (e) => { e.preventDefault(); talkDown(); });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) btn.talk.addEventListener(ev, talkUp);
  btn.laser.addEventListener('click', () => { if (btn.laser.disabled) return; laser.on = !laser.on; CA.fx.laser(); if (laser.on) { laser.x = laser.tx = clamp(cam.x - 120, 140, 1780); laser.y = laser.ty = 960; laser.still = 0; } dockUI(); });
  btn.feed.addEventListener('click', () => { if (!btn.feed.disabled) feed(); });
  btn.snap.addEventListener('click', () => { if (!btn.snap.disabled) snapshot(); });
  btn.therm.addEventListener('click', () => {
    if (btn.therm.disabled) return; cam.thermTo = cam.thermTo ? 0 : 1; CA.fx.irClick(); dockUI();
    if (cam.thermTo && S.step === 'find' && S.found < 0) toast('サーモグラフィー：あたたかい所ほど 明るく見える', 'Thermal view: the warmer, the brighter', 2800);
  });
  btn.fan.addEventListener('click', () => {
    if (btn.fan.disabled) return; S.fan = !S.fan; CA.fx.laser(); dockUI();
    if (S.fan && S.st < 40) toast('画面をドラッグして、風の向きを かえよう', 'Drag on the picture to aim the wind', 2800);
  });
  btn.heat.addEventListener('click', () => {
    if (btn.heat.disabled) return; S.heater = true; CA.fx.laser(); setTimeout(() => CA.fx.laser(), 160); dockUI();
    push('🔥', 'ホットカーペット ON', 'Heated blanket on · 28℃', 3200);
    toast('ブランケットの下から、じんわり あたたかく…', 'Warmth spreads from under the blanket…', 3000);
  });

  // ---------------------------------------------------------------- microphone (level only, nothing recorded)
  let mic = null, micState = 'none';
  const buf = new Float32Array(1024);
  function ensureMic() {
    if (micState !== 'none' || !$('micOn').checked) return;
    if (!navigator.mediaDevices?.getUserMedia) { micState = 'denied'; return; }
    micState = 'asking';
    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false } })
      .then((st) => { const ac = SND.ctx() || SND.init(); const an = ac.createAnalyser(); an.fftSize = 1024; ac.createMediaStreamSource(st).connect(an); mic = { an, st }; micState = 'on'; })
      .catch(() => { micState = 'denied'; });
  }
  $('micOn').addEventListener('change', (e) => { if (e.target.checked) ensureMic(); else { mic?.st.getTracks().forEach((t) => t.stop()); mic = null; micState = 'none'; } });
  function micLevel() {
    if (!mic) return 0;
    mic.an.getFloatTimeDomainData(buf); let s = 0; for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
    return Math.sqrt(s / buf.length);
  }

  // ---------------------------------------------------------------- particles + thermal pulses (world coordinates)
  let parts = [], pulses = [];
  const pulse = (az, k, s, dur = .8) => pulses.push({ az, k, s, age: 0, dur });
  function hearts(x, y) { parts.push({ k: 'heart', x: x + rnd(-50, 50), y: y + rnd(-20, 20), vx: rnd(-25, 25), vy: rnd(-100, -50), life: 0, max: rnd(1.1, 1.8), s: rnd(.6, 1.1) }); }
  function sparkle(x, y, n = 8) { for (let i = 0; i < n; i++) parts.push({ k: 'spark', x, y, vx: rnd(-160, 160), vy: rnd(-200, -40), life: 0, max: rnd(.4, .8), s: 1 }); }
  function kibble(n) { for (let i = 0; i < n; i++) parts.push({ k: 'kib', x: P.feeder[0] - 70 + rnd(-6, 6), y: P.feeder[1] - 95, vx: rnd(-90, -40), vy: rnd(-40, 20), life: -i * .05, max: 1.2, s: 1 }); }

  // ---------------------------------------------------------------- audio loops (re-placed every frame: the camera can turn)
  let L = {};
  function setLoops() {
    const want = { room: 1, purr: 1, birds: S.bg === 'day', rain: S.bg === 'night' };
    for (const k of Object.keys(L)) if (!want[k]) { L[k].stop(); delete L[k]; }
    for (const [k, on] of Object.entries(want)) if (on && !L[k]) L[k] = SND.loop(k);
  }
  function placeLoops() {
    if (!S.started) return;
    L.room?.set(.22, 0, 2);
    const near = N.screen ? 1 : .35 + .65 * depth(N.y);
    L.purr?.set(N.show ? N.purr * near * (N.screen ? 1 : .8) : 0, N.screen ? 0 : AZ(N.x), N.screen ? .35 : DIST(N.y));
    if (L.purr?.rate) L.purr.rate.setTargetAtTime(N.pose === 'sleep' ? .85 : 1, SND.ctx().currentTime, .3);
    L.birds?.set(.45, AZ(P.windowDay), 4.5);
    L.rain?.set(.6, AZ(P.windowNight), 3.5);
  }

  // ---------------------------------------------------------------- Naomi
  function img(pose, face) { return (face && IMG[`naomi_${pose}_${face}`]) || IMG[`naomi_${pose}`]; }
  function sizeW() { const im = img(N.pose), h = (WORLD_H[N.pose] || 400) * scaleAt(N.y); return [im ? h * im.width / im.height : h * .9, h]; }
  function headWorld() {
    if (N.screen) return toWorld(960 + N.ox, 420);
    const [w, h] = sizeW(), fy = { sit: .2, walk: .3, pounce: .2, eat: .45, loaf: .3, sleep: .4, belly: .5 }[N.pose] || .3;
    return [N.x + (N.pose === 'walk' || N.pose === 'eat' ? (N.flip ? 1 : -1) * w * .28 : 0), N.y - N.jump - h * (1 - fy)];
  }
  function setPose(p, x = N.x, y = N.y) { N.pose = p; N.x = x; N.y = y; N.face = ''; }
  function faceNow() { if (S.t < N.faceUntil && N.face) return N.face; if (S.t < N.blinkUntil) return 'blink'; return ''; }
  function say(kind, face = 'meow', ja, en) {
    const dur = SND.meow(kind, N.screen ? 0 : AZ(N.x), N.screen ? .4 : DIST(N.y));
    const pose = N.screen ? 'close' : N.pose;
    if (FACES[pose]?.includes(face)) { N.face = face; N.faceUntil = S.t + Math.max(.5, dur); }
    if (ja) toast(ja, en, 2200);
    N.squish = .05;
  }
  function walkTo(x, y, spd = 300, after = null) { N.tx = x; N.ty = y; N.spd = spd; N.pose = 'walk'; N.flip = x > N.x; N.after = after; }

  let fading = 0;
  function go(bg, after) {
    fading = 1; $('fade').classList.add('on');
    setTimeout(() => { S.bg = bg; after(); setLoops(); setTimeout(() => { $('fade').classList.remove('on'); fading = 0; }, 200); }, 750);
  }

  // ---------------------------------------------------------------- actions
  function onTalk() {
    if (S.step === 'call') {
      S.calls++;
      if (S.calls === 1) {
        setTimeout(() => { setPose('loaf'); N.squish = .06; N.purrT = .1; }, 500);
        setTimeout(() => say('ask', '', 'ナオミ「…にゃ？」', 'Naomi: "...mew?"'), 1100);
        setTimeout(() => toast('声に気づいた！ もう一回 よんでみて', 'She heard you! Call her once more', 3200), 2700);
      } else if (S.calls === 2) {
        S.said = 1; dockUI();
        setTimeout(() => { setPose('sit'); say('trill', 'meow', 'ナオミ「んにゃっ」', 'Naomi: "Mrrp!"'); }, 400);
        setTimeout(() => { cam.track = true; walkTo(clamp(cam.x + 40, 520, 1400), 1062, 230, () => toLens()); toast('カメラのほうへ 歩いてくる…', 'She is walking toward the camera…', 2600); }, 1700);
      }
    } else if (S.step === 'night') {
      S.said = 1; dockUI();
      setTimeout(() => { N.squish = .05; SND.meow('trill', AZ(N.x), DIST(N.y) * .9); N.purrT = .7; toast('ナオミ「…んる」', 'Naomi: "...mrr"', 2400); }, 900);
      setTimeout(() => { heart(); toast('しっぽで おへんじ。もうすぐ帰るね', 'A flick of her tail. I\'ll be home soon', 3400); }, 2600);
      setTimeout(() => setStep('home'), 5200);
    }
  }
  function toLens() {
    N.screen = true; N.zoom = 0; N.ox = 0; N.oxT = 0; N.tilt = 0; N.tiltT = 0; N.lunge = 0; N.purrT = .4; cam.track = false;
    setStep('lens'); S.lensReady = false; S.stroke = 0; S.rubs = 0; heart();
  }
  function feed() {
    S.food = 0; dockUI();
    CA.fx.feeder(AZ(P.feeder[0]), DIST(P.feeder[1]));
    setTimeout(() => kibble(16), 250);
    setTimeout(() => say('long', 'meow', 'ナオミ「にゃーん！」', 'Naomi: "Meow!"'), 700);
    setTimeout(() => {
      const [w] = [(WORLD_H.eat * scaleAt(P.bowl[1])) * 794 / 700];
      cam.track = true;
      walkTo(P.bowl[0] + w * .37, P.bowl[1] - 2, 330, () => { setPose('eat', N.x, N.y); N.flip = false; S.eatT = 0; N.purrT = .35; });
    }, 1500);
  }
  function snapshot() {
    CA.fx.shutter(); cam.flash = 1;
    try {
      const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
      g.drawImage(gl ? cv : off, 0, 0); g.drawImage(osd, 0, 0);
      c.toBlob((b) => { if (!b) return; const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `naomi_cam_${simTime().replace(/:/g, '')}.jpg`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }, 'image/jpeg', .92);
      toast('📸 保存しました', 'Snapshot saved', 1800);
    } catch { toast('📸', 'Snapshot', 1200); }
  }

  // ---------------------------------------------------------------- coach bubble: what to press / tap next
  const coachEl = $('coach');
  const COACH = { thermBtn: ['👇 ここを タップ！', 'Tap: thermal view'], talkBtn: ['👇 おしたまま 話しかけて', 'Hold and talk to her'], laserBtn: ['👇 レーザー ON', 'Turn on the laser'],
    fanBtn: ['👇 扇風機 ON', 'Turn on the fan'], feedBtn: ['👇 ごはんを 出す', 'Drop her dinner'], heatBtn: ['👇 ホットカーペット ON', 'Turn on the heated blanket'] };
  let coachKey = '';
  function coach() {
    let tgt = null, txt = null;
    if (S.started && !S.done && !fading) {
      const b = [...document.querySelectorAll('.dk.want')].find((x) => !x.hidden && !x.disabled);
      if (S.step === 'find' && S.found < 0 && cam.thermTo) {
        const [hx, hy] = toScreen(P.house[0], P.house[1]);
        if (hx > 120 && hx < W - 120) { tgt = ['pt', hx, hy - 70]; txt = ['👇 あたたかい所を タップ', 'Tap the warm spot']; }
        else { tgt = ['el', btn.panR]; txt = ['👇 みぎへ まわす', 'Turn the camera right']; }
      } else if (S.step === 'cool' && S.fan && !S.cooled && Math.abs(S.aim - N.x) > 200) {
        const [nx, ny] = toScreen(N.x, N.y - 160); tgt = ['pt', nx, ny]; txt = ['👇 ドラッグして 風を ここへ', 'Drag to blow the wind here'];
      } else if (b && COACH[b.id] && S.st > 1) { tgt = ['el', b]; txt = COACH[b.id]; }
    }
    coachEl.classList.toggle('show', !!tgt); if (!tgt) return;
    const sr = stage.getBoundingClientRect();
    let x, y;
    if (tgt[0] === 'el') { const r = tgt[1].getBoundingClientRect(); x = r.left + r.width / 2 - sr.left; y = r.top - sr.top; }
    else { x = tgt[1] / W * sr.width; y = tgt[2] / H * sr.height; }
    coachEl.style.left = `${clamp(x, 90, sr.width - 90)}px`; coachEl.style.top = `${y}px`;
    const key = txt.join('|'); if (key !== coachKey) { coachKey = key; coachEl.querySelector('b').textContent = txt[0]; coachEl.querySelector('span').textContent = txt[1]; }
  }

  // ---------------------------------------------------------------- input on the picture
  const ptr = { down: false, x: 0, y: 0, lx: 0, ly: 0 };
  function toCanvas(e) { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; }
  function aimLaser(sx, sy) { const [wx, wy] = toWorld(sx, sy); laser.tx = clamp(wx, 120, 1800); laser.ty = clamp(wy, 860, 1060); }
  cv.addEventListener('pointerdown', (e) => {
    if (!S.started) return;
    const [x, y] = toCanvas(e); Object.assign(ptr, { down: true, x, y, lx: x, ly: y }); cv.setPointerCapture?.(e.pointerId);
    if (S.step === 'laser' && laser.on) aimLaser(x, y);
    if (S.step === 'cool' && S.fan) S.aim = clamp(toWorld(x, y)[0], 150, 1850);
    if (S.step === 'find' && S.found < 0 && N.hidden) {
      const [hx, hy] = toScreen(P.house[0], P.house[1]);
      if (Math.hypot(x - hx, y - hy) < 190) { if (cam.therm > .5 || Math.sin(S.t * .8) > .15) found(); else toast('なにか いる…？ 🌡 サーモで 見てみよう', 'Something in there? Try 🌡 Thermal', 2600); }
    }
  });
  cv.addEventListener('pointermove', (e) => {
    if (!S.started) return;
    const [x, y] = toCanvas(e), dx = x - ptr.lx, dy = y - ptr.ly; ptr.lx = x; ptr.ly = y;
    if (S.step === 'laser' && laser.on) { if (ptr.down || e.pointerType === 'mouse') aimLaser(x, y); return; }
    if (S.step === 'cool' && S.fan) { if (ptr.down || e.pointerType === 'mouse') S.aim = clamp(toWorld(x, y)[0], 150, 1850); return; }
    if (!ptr.down) return;
    if (S.step === 'lens') { if (S.lensReady && x > 520 && x < 1400 && y > 120 && y < 960) strokeLens(Math.hypot(dx, dy)); return; }
    if (!btn.panL.disabled) { cam.tx = clamp(cam.tx - dx / Z, CAM_MIN, CAM_MAX); cam.manualT = S.t; }
  });
  for (const ev of ['pointerup', 'pointercancel']) cv.addEventListener(ev, () => { ptr.down = false; });
  function strokeLens(d) {
    S.stroke = Math.min(1, S.stroke + d / 3600); N.purrT = Math.max(N.purrT, .55 + .4 * S.stroke);
    if (S.rubs === 0 && S.stroke > .34) rub(-1);
    else if (S.rubs === 1 && S.stroke > .67) rub(1);
    else if (S.rubs === 2 && S.stroke >= 1) {
      S.rubs = 3; N.face = 'happy'; N.faceUntil = S.t + 3.5; heart();
      toast('ゴロゴロ… カメラに すりすり', 'Purring, and rubbing her cheeks on the camera', 3400);
      setTimeout(() => { N.screen = false; N.hidden = false; setPose('sit', clamp(cam.x - 60, 400, 1500), 990); N.purrT = .3; N.oxT = 0; N.tiltT = 0; setStep('laser'); hint(); }, 3800);
    }
  }
  function rub(side) {
    S.rubs++; N.oxT = side * 150; N.tiltT = side * -.1; cam.shake = .9;
    SND.fx.rub(side * .9, .3); pulse(side * 1.05, 'h', .65, 2);
    toast(side < 0 ? 'ほっぺで すりすり（ひだり）' : 'こんどは みぎの ほっぺ', side < 0 ? 'Cheek rub, left side' : 'Now the right cheek', 2200);
    setTimeout(() => { N.oxT = 0; N.tiltT = 0; }, 1500);
  }

  // ---------------------------------------------------------------- update
  let blowing = false;
  function update(dt) {
    if (!S.started) return;
    S.t += dt; S.st += dt; S.sim += dt; if (!S.done) S.clock += dt;
    SND.tick(dt);
    // camera
    const keyPan = (keys.ArrowLeft ? -1 : 0) + (keys.ArrowRight ? 1 : 0), pd = panDir || (btn.panL.disabled ? 0 : keyPan);
    if (pd) { cam.tx = clamp(cam.tx + pd * 520 * dt, CAM_MIN, CAM_MAX); cam.manualT = S.t; }
    if (cam.track && S.t - cam.manualT > 2.5 && N.show && !N.screen) cam.tx += (clamp(N.x, CAM_MIN, CAM_MAX) - cam.tx) * (1 - Math.exp(-dt / .9));
    const px = cam.x; cam.x += (cam.tx - cam.x) * (1 - Math.exp(-dt / .16)); cam.v = (cam.x - px) / Math.max(dt, 1e-3);
    CA.motorLevel(Math.abs(cam.v) / 450);
    cam.shake = Math.max(0, cam.shake - dt * 1.4); cam.flash = Math.max(0, cam.flash - dt * 3); cam.fog = Math.max(0, cam.fog - dt * .25); cam.smudge = Math.max(0, cam.smudge - dt / 90);
    cam.ir += (cam.irTo - cam.ir) * (1 - Math.exp(-dt / .25));
    cam.therm += (cam.thermTo - cam.therm) * (1 - Math.exp(-dt / .18));
    // talk
    if (talk.on) { talk.held += dt; if (micLevel() > .03) talk.voice += dt; }
    // Naomi idle: breathing, blinking, purr easing
    N.squish = Math.max(0, N.squish - dt * .25);
    N.purr += (N.purrT - N.purr) * (1 - Math.exp(-dt / .6));
    if (S.t > N.blinkAt) { N.blinkUntil = S.t + .16; N.blinkAt = S.t + rnd(2.5, 5); }
    N.ox += (N.oxT - N.ox) * (1 - Math.exp(-dt / .25)); N.tilt += (N.tiltT - N.tilt) * (1 - Math.exp(-dt / .25));
    N.zoom = Math.min(1, N.zoom + dt * 1.6); N.lunge = Math.max(0, N.lunge - dt * 1.8);
    if (N.tx !== null && N.pose === 'walk') {
      const dx = N.tx - N.x, dy = N.ty - N.y, d = Math.hypot(dx, dy), stepD = N.spd * dt * lerp(.6, 1.2, depth(N.y));
      if (d <= stepD) { N.x = N.tx; N.y = N.ty; N.tx = null; const a = N.after; N.after = null; if (a) a(); else setPose('sit'); }
      else {
        N.x += dx / d * stepD; N.y += dy / d * stepD; if (Math.abs(dx) > 6) N.flip = dx > 0;
        N.stepAcc += stepD; if (N.stepAcc > 60) { N.stepAcc = 0; SND.fx.step(AZ(N.x), DIST(N.y), .45); }
      }
    }
    for (const q of pulses) q.age += dt; pulses = pulses.filter((q) => q.age < q.dur);
    for (const p of parts) { p.life += dt; if (p.life < 0) continue; p.x += p.vx * dt; p.y += p.vy * dt; if (p.k === 'kib') { p.vy += 900 * dt; if (p.y > P.bowl[1] - 30) { p.y = P.bowl[1] - 30; p.vx = 0; p.vy = 0; } } }
    parts = parts.filter((p) => p.life < p.max);

    const st = S.st;
    switch (S.step) {
      case 'connect':
        cam.stat = st < .9 ? 1 : clamp(1 - (st - .9) / .5);
        if (st > 1.5) { setStep('find'); push('🐾', 'ナオミが 見当たりません…', 'LIVE · CAM 1 · Naomi is not in view', 3000); setTimeout(hint, 1200); }
        break;
      case 'find': {
        const inView = Math.abs(N.x - cam.x) < HALF * .5;
        if (S.found < 0) {
          S.dwell = inView && cam.therm > .5 ? (S.dwell || 0) + dt : 0;
          if (S.dwell > 3) found();                                   // seen long enough in the thermal view
          S.cue = (S.cue || 0) + dt;
          if (S.cue > 5.5) {                                          // little sounds from her hiding place, on the right
            S.cue = 0; const az = AZ(P.house[0]), d = DIST(870), r = Math.random();
            if (r < .4) SND.meow('tiny', az, d); else if (r < .75) SND.fx.rub(az, d); else SND.fx.bell(az, d);
            N.purrT = .45;
          }
          if (st > 6 && st - dt <= 6 && !cam.thermTo) toast('いまの音… みぎの ほう？ ◀ ▶ で カメラを まわしてみて', 'That sound came from the right? Turn the camera with ◀ ▶', 3400);
          if (st > 13 && st - dt <= 13) toast('みぎのほうから、すー すー… あたたかいのも みぎ', 'Soft breathing from the right, and the warmth is on the right too', 3400);
          if (st > 22 && st - dt <= 22 && !cam.thermTo) hint();
        } else {
          S.found += dt;
          if (S.found > 3.6 && S.step === 'find') { setStep('call'); hint(); }
        }
        break;
      }
      case 'cool': updateCool(dt); break;
      case 'night':
        if (S.heater) {
          const was = S.carpet; S.carpet = Math.min(1, S.carpet + dt / 5); N.cold = 1 - S.carpet; N.purrT = .3 + .5 * S.carpet;
          if (was < 1 && S.carpet >= 1) {
            setPose('belly', P.blanket[0], P.blanket[1] + 6); N.squish = .06; SND.meow('trill', AZ(N.x), DIST(N.y));
            toast('ぽかぽか… おなかを出して のび〜', 'Toasty. She rolls over and stretches out', 3200); dockUI(); setTimeout(hint, 3600);
          }
        } else if (st > 9 && st - dt <= 9) toast('ぶるぶる… ちょっと さむそう', 'Brr… she looks a little cold', 2800);
        break;
      case 'lens':
        if (st > .5 && st - dt <= .5) { SND.fx.sniff(0, .25); cam.fog = Math.min(1, cam.fog + .35); N.purrT = .45; }
        if (st > 1.2 && st - dt <= 1.2) { SND.fx.sniff(0, .22); cam.fog = Math.min(1, cam.fog + .35); }
        if (st > 2 && st - dt <= 2) {
          N.lunge = 1; cam.shake = .7; cam.smudge = 1; SND.fx.boop(0, .2); pulse(0, 'c', .8, 1.4); N.coolUntil = S.t + 1.6;
          toast('つめたい お鼻が、レンズに ぴと', 'Her cold little nose, right on the lens', 2600);
        }
        if (st > 3.6 && !S.lensReady) { S.lensReady = true; hint(); }
        break;
      case 'laser': updateLaser(dt); break;
      case 'feed':
        if (S.eatT >= 0) {
          S.eatT += dt;
          if (S.eatT < 5 && Math.random() < dt * 3.6) SND.fx.crunch(AZ(N.x), DIST(N.y));
          if (S.eatT >= 5 && S.eatT - dt < 5) { setPose('sit'); N.flip = false; SND.fx.lick(AZ(N.x), DIST(N.y)); N.face = 'happy'; N.faceUntil = S.t + 2.5; heart(); toast('ごちそうさま！', 'All gone. Thank you!', 2600); }
          if (S.eatT >= 8.2 && S.eatT - dt < 8.2) toNight();
        }
        break;
      case 'home': updateHome(st, dt); break;
    }
  }
  function updateLaser(dt) {
    const k = 1 - Math.exp(-dt / .07), ox = laser.x, oy = laser.y;
    laser.x += (laser.tx - laser.x) * k; laser.y += (laser.ty - laser.y) * k;
    const sp = Math.hypot(laser.x - ox, laser.y - oy) / Math.max(dt, 1e-3);
    laser.still = sp < 40 ? laser.still + dt : 0; laser.hide = Math.max(0, laser.hide - dt);
    if (!laser.on || laser.hide > 0 || S.catches >= 3) { if (N.pose === 'walk' && N.tx !== null && !N.after) { N.tx = null; setPose('sit'); } return; }
    cam.track = true;
    if (N.pounce) {
      const p = N.pounce; p.t += dt; const k2 = clamp(p.t / .55);
      N.x = lerp(p.x0, p.x1, ease(k2)); N.y = lerp(p.y0, p.y1, ease(k2)); N.jump = Math.sin(Math.PI * k2) * 120;
      if (k2 >= 1) {
        N.pounce = null; N.jump = 0; setPose('sit'); N.flip = false; SND.fx.pounce(AZ(N.x), DIST(N.y));
        if (Math.hypot(laser.x - N.x, laser.y - N.y) < 110) {
          S.catches++; renderGoal(); laser.hide = 1.1; laser.need = true; laser.cx = laser.x; laser.cy = laser.y; sparkle(laser.x, laser.y);
          if (S.catches < 3) say(S.catches === 1 ? 'tiny' : 'trill', 'happy', S.catches === 1 ? 'つかまえた！' : 'また つかまえた！', S.catches === 1 ? 'Got it!' : 'Got it again!');
          else {
            say('mew', 'happy'); laser.on = false; dockUI(); heart(); N.purrT = .35;
            toast('レーザー名人！ 3回 つかまえた', 'Laser champion: three catches!', 2800);
            setTimeout(() => {
              cam.track = true; N.heat = 1; setStep('cool');
              walkTo(1000, 985, 240, () => { setPose('belly', N.x, N.y); N.squish = .08; SND.fx.flop(AZ(N.x), DIST(N.y)); toast('はぁ… あつい… ぺたーん', 'Phew, too hot… she flops down flat', 3000); setTimeout(hint, 3200); });
            }, 2600);
          }
        }
      }
      return;
    }
    if (laser.need) { if (Math.hypot(laser.tx - laser.cx, laser.ty - laser.cy) < 170) return; laser.need = false; }
    const d = Math.hypot(laser.x - N.x, laser.y - N.y);
    if (d > 190) {
      const side = laser.x > N.x ? -70 : 70;
      if (N.pose !== 'walk' || Math.abs(N.tx - (laser.x + side)) > 40) { walkTo(laser.x + side, laser.y, 620); }
    } else {
      if (N.pose === 'walk') { N.tx = null; setPose('sit'); }
      if (laser.still > .35) {
        N.pose = 'pounce'; N.flip = laser.x > N.x;
        N.pounce = { t: 0, x0: N.x, y0: N.y, x1: laser.x, y1: laser.y };
        SND.fx.step(AZ(N.x), DIST(N.y), .5);
      }
    }
  }
  function found() {
    S.found = 0; N.hidden = false; S.dwell = 0;
    setPose('sit', P.houseFront[0], P.houseFront[1]); N.squish = .08;
    say('ask', 'meow', 'ナオミ「にゃ？」', 'Naomi: "Mew?"'); heart(); dockUI();
    setTimeout(() => toast('みつけた！ ネコハウスの中で ぬくぬく', 'Found her, cosy inside the cat house', 3000), 900);
  }
  function updateCool(dt) {
    S.fanV += ((S.fan ? 1 : 0) - S.fanV) * (1 - Math.exp(-dt / .5));
    CA.fan(S.fanV, AZ(P.fan[0]), AZ(S.aim), DIST(P.fan[1]));
    const hit = Math.exp(-(((S.aim - N.x) / 210) ** 2)) * S.fanV;
    if (S.fanV > .3 && Math.random() < dt * 26) {
      const hx = P.fan[0], hy = P.fan[1] - 250 * scaleAt(P.fan[1]), tx = S.aim + rnd(-90, 90), ty = N.y - rnd(40, 200), d = Math.hypot(tx - hx, ty - hy), v = rnd(700, 950);
      parts.push({ k: 'wind', x: hx, y: hy + rnd(-20, 20), vx: (tx - hx) / d * v, vy: (ty - hy) / d * v, life: 0, max: d / v, s: rnd(.6, 1.2) });
    }
    if (N.pose === 'belly' && !S.cooled) {
      N.heat = Math.max(0, N.heat - dt * .085 * hit);
      if (hit > .5 && Math.random() < dt * .8) { N.squish = .04; N.purrT = .45; }
      if (hit > .5 && !S.feltWind) { S.feltWind = true; SND.meow('tiny', AZ(N.x), DIST(N.y)); toast('風が あたって、きもちよさそう', 'She loves the breeze', 2200); }
      if (N.heat < .12) {
        S.cooled = true; setPose('sit'); N.flip = false; say('trill', 'happy', 'すずしい〜！', 'Ahh, so cool!'); heart();
        setTimeout(() => { S.fan = false; dockUI(); cam.track = true; walkTo(P.bowl[0] - 220, 1000, 260); setStep('feed'); hint(); }, 3200);
      }
      renderGoal();
    }
  }
  const naomiTemp = () => 36.4 + 2.4 * N.heat - 1.6 * N.cold + .8 * S.carpet;
  const roomTemp = () => (S.bg === 'night' ? 17.2 : S.step === 'cool' && !S.cooled ? 27.8 : 25.4);
  function toNight() {
    go('night', () => {
      S.sim = 21 * 3600 + 8 * 60; cam.irTo = 1; CA.fx.irClick();
      setPose('sleep', P.blanket[0], P.blanket[1]); N.flip = false; N.purrT = .3; N.tx = null; N.cold = 1; N.heat = 0; S.carpet = 0; S.heater = false; S.said = -1;
      cam.x = cam.tx = clamp(P.blanket[0] - 180, CAM_MIN, CAM_MAX); cam.track = false; S.said = -1;
      setStep('night');
      setTimeout(() => push('🌙', '夜間モード（赤外線）に切り替えました', 'Night vision (IR) is on'), 900);
      setTimeout(() => toast('外は雨。へやが ひえてきた… ナオミは ちいさく まるくなってる', 'Rain outside, the room is getting cold. Naomi is curled up small', 4000), 2400);
      setTimeout(hint, 6500);
    });
  }
  function updateHome(st, dt) {
    const once = (t) => st >= t && st - dt < t;
    if (once(2)) CA.fx.door(1.45, 5.5);
    if (once(3.2)) push('🔑', '玄関の鍵が あきました', 'Front door unlocked');
    if (once(4.6)) { setPose('sit'); N.flip = true; N.eyes = 1; say('ask', 'meow', 'ナオミ「…！」', 'Naomi: "...!"'); N.purrT = 0; }
    if (once(5.2)) pulse(1.3, 'c', .45, 3);   // the hallway's cool air
    if (once(6.4)) { cam.track = true; cam.manualT = -9; walkTo(P.door, 1000, 560, () => { N.show = false; }); }
    if (once(7.4)) SND.meow('long', AZ(N.x), DIST(N.y));
    if (once(10)) { SND.meow('long', AZ(P.door + 150), 6); SND.meow('trill', AZ(P.door + 150), 6); toast('「にゃーん」… 玄関で おでむかえ', '"Meow!" She\'s at the door to greet you', 3600); }
    if (once(11.5)) { cam.irTo = 0; CA.fx.irClick(); push('🏠', 'おかえりなさい', 'Welcome home. Naomi is greeting you at the door', 4600); }
    if (once(16) && !S.done) finish();
  }

  // ---------------------------------------------------------------- thermal: sources at their direction from the camera
  function sources() {
    const out = [], add = (az, k, s, icon) => { if (s > .01) out.push({ az, k, s, icon }); };
    if (!S.started || S.step === 'connect') return out;
    if (N.show) {
      const az = N.screen ? clamp(N.ox / 150, -1, 1) * .95 : AZ(N.x), warm = (N.screen ? 1 : .3 + .6 * depth(N.y)) * (S.t < (N.coolUntil || 0) ? .15 : 1) * (1 + .6 * N.heat) * (1 - .45 * N.cold);
      add(az, 'h', .42 * warm, '🐈');
      add(az, 'h', .32 * N.purr * warm, '💗');
    }
    if (S.bg === 'day') add(AZ(P.windowDay), 'c', .16, '🪟');
    if (S.bg === 'night') add(AZ(P.windowNight), 'c', .26, '🌧');
    if (S.bg === 'night' && S.step !== 'home') add(0, 'c', .2 * N.cold, '🥶');                 // the room cooling down
    if (S.carpet > .01) add(AZ(P.blanketMid[0]), 'h', .55 * S.carpet, '🔥');
    if (S.step === 'cool' && S.fanV > .05) add(AZ(S.aim), 'c', .7 * S.fanV, '🌀');
    for (const q of pulses) add(q.az, q.k, q.s * Math.min(1, q.age / .08) * (1 - q.age / q.dur), q.k === 'c' ? (S.step === 'home' ? '🚪' : '👃') : '✨');
    return out;
  }
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
      else if (!MoHeatDwell.may(E, dt)) { /* keep the current direction */ }
      else if (mode === 'h' && cc > hh + .06) mode = 'c'; else if (mode === 'c' && hh > cc + .06) mode = 'h';
      if (mode !== E.mode) { E.v = 0; E.mode = mode; E.held = 0; }
      const target = mode === 'h' ? Math.min(.9, hh) : cc;
      const tau = target > E.v ? (mode === 'h' ? .35 : .18) : .3;
      E.v += (target - E.v) * (1 - Math.exp(-dt / tau));
      th[e + mode] = E.v;
    }
    return { th, src };
  }

  // ---------------------------------------------------------------- drawing: the room (world), then the camera look (WebGL), then the OSD
  function drawBg(c, bg) {
    const im = IMG[`bg_room_${bg}`];
    if (im) c.drawImage(im, 0, 0, W, H);
    else { const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, bg === 'night' ? '#2a2f55' : '#fde7c4'); g.addColorStop(1, bg === 'night' ? '#1a1830' : '#e7b98d'); c.fillStyle = g; c.fillRect(0, 0, W, H); }
  }
  function drawFeeder(c) {
    if (S.bg !== 'day') return;
    const [fx, fy] = P.feeder, s = scaleAt(fy), w = 120 * s, h = 210 * s;
    c.save(); c.fillStyle = 'rgba(40,20,40,.18)'; c.beginPath(); c.ellipse(fx, fy - 2, w * .7, 14, 0, 0, 7); c.fill();
    const g = c.createLinearGradient(fx - w / 2, 0, fx + w / 2, 0); g.addColorStop(0, '#e9e4ea'); g.addColorStop(.5, '#ffffff'); g.addColorStop(1, '#cfc6d3');
    c.fillStyle = g; c.beginPath(); c.roundRect(fx - w / 2, fy - h, w, h, 18 * s); c.fill();
    c.fillStyle = 'rgba(190,225,240,.55)'; c.beginPath(); c.roundRect(fx - w * .36, fy - h * .92, w * .72, h * .42, 12 * s); c.fill();   // window on the hopper
    c.fillStyle = '#b07a4a'; for (let i = 0; i < 9; i++) { c.beginPath(); c.arc(fx - w * .25 + (i % 5) * w * .12, fy - h * .56 - Math.floor(i / 5) * 10 * s, 5 * s, 0, 7); c.fill(); }
    c.fillStyle = '#d7cdd9'; c.beginPath(); c.roundRect(fx - w * .62, fy - h * .38, w * .3, h * .14, 6 * s); c.fill();                 // chute
    c.fillStyle = S.food >= 0 && S.eatT < 0 ? '#5fe0b8' : '#9ad'; c.beginPath(); c.arc(fx + w * .3, fy - h * .2, 5 * s, 0, 7); c.fill();
    c.restore();
  }
  function drawBowl(c) {
    if (S.bg !== 'day' || N.pose === 'eat') return;
    const im = IMG.prop_bowl, s = scaleAt(P.bowl[1]), w = 130 * s;
    if (im) c.drawImage(im, P.bowl[0] - w / 2, P.bowl[1] - w * im.height / im.width, w, w * im.height / im.width);
  }
  function drawTail(c, t) {   // hiding in the cat house: now and then the tip of her tail flicks out of the door
    const k = clamp((Math.sin(t * .8) - .1) * 2.2); if (k <= 0) return;
    const [hx] = P.house, by = 668, sw = Math.sin(t * 3.1) * 26 * k;
    c.save(); c.lineCap = 'round';
    for (const [col, wd] of [['#6f6878', 46], ['#9d96a8', 38], ['#c9c3d2', 18]]) {
      c.strokeStyle = col; c.lineWidth = wd * (.6 + .4 * k); c.beginPath(); c.moveTo(hx + 10, by - 6);
      c.quadraticCurveTo(hx + 40 + 30 * k, by + 4, hx + 30 + 60 * k + sw, by - 40 * k); c.stroke();
    }
    c.fillStyle = '#f4f1f7'; c.beginPath(); c.arc(hx + 30 + 60 * k + sw, by - 40 * k, 10 * k, 0, 7); c.fill();
    c.restore();
  }
  function drawNaomiWorld(c, t, sil = false) {
    if (N.show && N.hidden && !sil && S.started) drawTail(c, t);
    if (!N.show || N.screen || N.hidden) return;
    const im = img(N.pose, faceNow()), [w, h] = sizeW();
    const br = Math.sin(t * (N.pose === 'sleep' ? 1.5 : 2.4)), shiver = N.cold > .25 ? Math.sin(t * 38) * 2.2 * N.cold : 0;
    c.save(); c.translate(N.x + shiver, N.y - N.jump);
    const bob = N.pose === 'walk' ? Math.abs(Math.sin(t * (N.spd > 400 ? 14 : 9))) * 5 : 0;
    c.translate(0, -bob); c.scale((N.flip ? -1 : 1) * (1 + N.squish * .6 - br * .004), 1 - N.squish + br * .012);
    if (!sil) { c.fillStyle = 'rgba(40,20,40,.2)'; c.beginPath(); c.ellipse(0, -3 + bob + N.jump, w * .38 * (1 - N.jump / 400), 12, 0, 0, 7); c.fill(); }
    else { c.filter = 'brightness(0) invert(1) blur(5px)'; c.globalAlpha = clamp(.72 + .28 * N.heat - .25 * N.cold); }
    if (im) c.drawImage(im, -w / 2, -h, w, h);
    c.restore();
    if (sil) return;
    // IR: cat eyes shine back at the camera's infrared light
    if (cam.ir > .3 && N.eyes > 0 && N.pose === 'sit' && faceNow() !== 'blink') {
      const ey = N.y - h * .79, ex = w * .085;
      for (const sx of [-1, 1]) { const g = c.createRadialGradient(N.x + sx * ex, ey, 0, N.x + sx * ex, ey, 14); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.35, 'rgba(255,255,255,.8)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.beginPath(); c.arc(N.x + sx * ex, ey, 14, 0, 7); c.fill(); }
    }
  }
  function drawNaomiClose(c, t, sil = false) {   // right at the lens: drawn in screen space, the room blurred behind
    if (!N.show || !N.screen) return;
    if (sil) { c.filter = 'brightness(0) invert(1) blur(8px)'; }
    const im = img('close', faceNow()); if (!im) return;
    const br = Math.sin(t * 2.4), k = ease(N.zoom), sc = lerp(.55, 1.12, k) * (1 + .12 * Math.sin(Math.PI * N.lunge));
    const h = 1150 * sc, w = h * im.width / im.height;
    c.save(); c.globalAlpha = clamp(N.zoom * 2.5); c.translate(960 + N.ox, 1190 + (1 - k) * 80); c.rotate(N.tilt);
    c.scale(1 - br * .004, 1 + br * .01); c.drawImage(im, -w / 2, -h, w, h); c.restore();
  }
  function drawLaser(c, t) {
    if (S.step !== 'laser' || !laser.on || laser.hide > 0) return;
    const x = laser.x + Math.sin(t * 23) * 1.5, y = laser.y + Math.cos(t * 19) * 1.2;
    const g = c.createRadialGradient(x, y, 0, x, y, 30); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.15, 'rgba(255,40,60,1)'); g.addColorStop(.45, 'rgba(255,30,60,.35)'); g.addColorStop(1, 'rgba(255,30,60,0)');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, 30, 0, 7); c.fill();
  }
  function drawParts(c) {
    for (const p of parts) {
      if (p.life < 0) continue;
      const k = p.life / p.max; c.save();
      if (p.k === 'heart') { c.globalAlpha = 1 - k; c.fillStyle = '#ff8fb8'; c.font = `${Math.round(40 * p.s)}px sans-serif`; c.textAlign = 'center'; c.fillText('♥', p.x, p.y); }
      else if (p.k === 'spark') { c.globalAlpha = 1 - k; c.fillStyle = '#fff6c0'; c.beginPath(); c.arc(p.x, p.y, 5, 0, 7); c.fill(); }
      else if (p.k === 'wind') { c.globalAlpha = .35 * Math.sin(Math.PI * k); c.strokeStyle = '#f4fbff'; c.lineWidth = 3 * p.s; c.lineCap = 'round'; const L = .06; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - p.vx * L, p.y - p.vy * L); c.stroke(); }
      else if (p.k === 'kib') { c.fillStyle = '#9a6233'; c.beginPath(); c.ellipse(p.x, p.y, 5, 4, p.life * 6, 0, 7); c.fill(); }
      c.restore();
    }
  }
  function fanHead() { const s = scaleAt(P.fan[1]); return [P.fan[0], P.fan[1] - 250 * s, s]; }
  function drawFan(c, t) {
    if (S.step !== 'cool') return;
    const [hx, hy, s] = fanHead(), [fx, fy] = P.fan, ang = clamp(Math.atan2(S.aim - hx, 600), -1.1, 1.1);
    c.save();
    c.fillStyle = 'rgba(40,20,40,.18)'; c.beginPath(); c.ellipse(fx, fy - 2, 80 * s, 14, 0, 0, 7); c.fill();
    c.fillStyle = '#f3f0f5'; c.beginPath(); c.ellipse(fx, fy - 8 * s, 70 * s, 16 * s, 0, 0, 7); c.fill();
    c.fillStyle = '#e4dfe8'; c.fillRect(fx - 7 * s, hy, 14 * s, fy - hy - 8 * s);
    c.translate(hx, hy); c.scale(Math.cos(ang) * .75 + .25, 1);
    c.fillStyle = '#d9d3df'; c.beginPath(); c.arc(0, 0, 86 * s, 0, 7); c.fill();
    c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.arc(0, 0, 80 * s, 0, 7); c.fill();
    c.rotate(t * 30 * S.fanV); c.fillStyle = 'rgba(150,200,235,.75)';
    for (let i = 0; i < 4; i++) { c.rotate(Math.PI / 2); c.beginPath(); c.ellipse(0, -40 * s, 18 * s, 38 * s, .3, 0, 7); c.fill(); }
    c.fillStyle = '#9cc9e8'; c.beginPath(); c.arc(0, 0, 14 * s, 0, 7); c.fill();
    c.restore();
    c.save(); c.strokeStyle = 'rgba(160,150,170,.7)'; c.lineWidth = 2; for (let i = 0; i < 9; i++) { c.beginPath(); c.arc(hx, hy, 86 * s * (i + 1) / 9, 0, 7); c.stroke(); } c.restore();
  }
  // heat map for the thermal view: grey = temperature (shader colours it). Same camera transform as the picture.
  const hoff = document.createElement('canvas'); hoff.width = W; hoff.height = H; const hctx = hoff.getContext('2d');
  const heatBg = {};
  artReady.then(() => { for (const bg of ['day', 'night']) { const im = IMG[`bg_room_${bg}`]; if (!im) continue; const c = document.createElement('canvas'); c.width = 960; c.height = 540; const g = c.getContext('2d'); g.filter = 'grayscale(1) contrast(.6) blur(3px)'; g.drawImage(im, 0, 0, 960, 540); heatBg[bg] = c; } });
  function blob(c, x, y, r, a) { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); }
  function drawHeat(t, sx, sy) {
    const c = hctx, night = S.bg === 'night';
    c.setTransform(1, 0, 0, 1, 0, 0); c.filter = 'none'; c.globalAlpha = 1;
    const base = night ? .2 + .04 * S.carpet : S.step === 'cool' && !S.cooled ? .36 : .3;
    c.fillStyle = `rgb(${Math.round(base * 255)},${Math.round(base * 255)},${Math.round(base * 255)})`; c.fillRect(0, 0, W, H);
    c.save(); c.setTransform(Z, 0, 0, Z, W / 2 - cam.x * Z + sx, H / 2 - CAM_Y * Z + sy);
    if (N.screen) c.filter = 'blur(12px)';
    if (heatBg[S.bg]) { c.globalAlpha = .3; c.drawImage(heatBg[S.bg], 0, 0, W, H); c.globalAlpha = 1; }
    const gr = night ? P.glassNight : P.glassDay; c.fillStyle = `rgba(0,0,0,${night ? .6 : .3})`; c.fillRect(gr[0], gr[1], gr[2] - gr[0], gr[3] - gr[1]);
    if (!night) blob(c, 560, 820, 420, .14);                                   // the sunny patch on the rug
    const lp = night ? P.lampNight : P.lampDay; blob(c, lp[0], lp[1], 70, .75);
    if (S.carpet > .01) { c.save(); c.filter = 'blur(14px)'; c.fillStyle = `rgba(255,255,255,${.5 * S.carpet})`; c.beginPath(); c.ellipse(P.blanketMid[0], P.blanketMid[1], 310, 92, 0, 0, 7); c.fill(); c.restore(); }
    if (S.step === 'feed' && S.food >= 0) blob(c, P.bowl[0], P.bowl[1] - 30, 60, .35);
    if (S.step === 'cool' && S.fanV > .05) {
      const [hx, hy] = fanHead(); c.save(); c.filter = 'blur(18px)'; c.fillStyle = `rgba(0,0,40,${.45 * S.fanV})`;
      c.beginPath(); c.moveTo(hx, hy - 60); c.lineTo(S.aim + 170, N.y - 320); c.lineTo(S.aim + 170, N.y + 20); c.lineTo(hx, hy + 60); c.fill(); c.restore();
    }
    if (N.show && N.hidden) { blob(c, P.house[0], P.house[1] + 20, 95, .95); blob(c, P.house[0], P.house[1] + 25, 45, 1); }
    drawNaomiWorld(c, t, true);
    c.restore();
    c.save(); c.translate(sx, sy); drawNaomiClose(c, t, true); c.restore();
    if (cam.smudge > .01) { c.save(); c.globalAlpha = .5 * cam.smudge; c.filter = 'blur(8px)'; c.fillStyle = '#000'; c.beginPath(); c.ellipse(1000, 560, 70, 44, 0, 0, 7); c.fill(); c.restore(); }   // cold nose print
  }
  function drawScene(t) {
    const sh = cam.shake * cam.shake, sx = Math.sin(t * 47) * 14 * sh, sy = Math.cos(t * 39) * 9 * sh;
    ctx.save();
    if (N.screen) ctx.filter = 'blur(12px)';
    ctx.setTransform(Z, 0, 0, Z, W / 2 - cam.x * Z + sx, H / 2 - CAM_Y * Z + sy);
    drawBg(ctx, S.bg);
    if (S.bg === 'day') { ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = `rgba(255,220,150,${.05 + .02 * Math.sin(t * .7)})`; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    drawFeeder(ctx); drawBowl(ctx); drawFan(ctx, t); drawNaomiWorld(ctx, t); drawLaser(ctx, t); drawParts(ctx);
    ctx.restore();
    ctx.save(); ctx.translate(sx, sy); drawNaomiClose(ctx, t); ctx.restore();
    // the lens: her breath fogs it, her nose leaves a print
    if (cam.fog > .01) { const g = ctx.createRadialGradient(960, 600, 60, 960, 600, 700); g.addColorStop(0, `rgba(255,255,255,${.4 * cam.fog})`); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    if (cam.smudge > .01) {
      ctx.save(); ctx.globalAlpha = .2 * cam.smudge; ctx.filter = 'blur(6px)'; ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(1000, 560, 64, 40, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(966, 552, 16, 11, .4, 0, 7); ctx.ellipse(1036, 552, 16, 11, -.4, 0, 7); ctx.fill(); ctx.restore();
    }
    if (S.bg === 'night' && cam.ir < .5) { ctx.fillStyle = `rgba(5,5,25,${.25 * (1 - cam.ir)})`; ctx.fillRect(0, 0, W, H); }
    if (cam.therm > .01) drawHeat(t, sx, sy);
  }

  // WebGL camera look: barrel lens, colour fringes, grain, vignette, IR night vision, connection static
  let gl = null, U = {}, tex = null, htex = null;
  try {
    gl = cv.getContext('webgl', { preserveDrawingBuffer: true, antialias: false });
    if (gl) {
      const vs = 'attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;gl_Position=vec4(p,0.,1.);}';
      const fs = `precision mediump float;varying vec2 v;uniform sampler2D T,HT;uniform float uIR,uTime,uStatic,uK,uTherm;
      vec3 pal(float x){x=clamp(x,0.,1.);vec3 a=vec3(.02,.0,.14),b=vec3(.34,.02,.58),c=vec3(.88,.12,.32),d=vec3(1.,.58,.05),e=vec3(1.,.97,.7);
        if(x<.25)return mix(a,b,x/.25);if(x<.5)return mix(b,c,(x-.25)/.25);if(x<.75)return mix(c,d,(x-.5)/.25);return mix(d,e,(x-.75)/.25);}
      float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
      vec2 warp(vec2 uv,float k){vec2 d=uv-.5;d.x*=1.7778;float r2=dot(d,d);d*=(1.+k*r2)/(1.+k*1.04);d.x/=1.7778;return d+.5;}
      void main(){
        vec3 c=vec3(texture2D(T,warp(v,uK*1.04)).r,texture2D(T,warp(v,uK)).g,texture2D(T,warp(v,uK*.96)).b);
        float l=dot(c,vec3(.3,.59,.11));
        c=mix(vec3(l),c,.88); c=(c-.5)*1.06+.5;
        float li=pow(l,.75)*1.22; vec3 ir=vec3(li)*vec3(.9,1.,.94); c=mix(c,ir,uIR);
        if(uTherm>.001){c=mix(c,pal(texture2D(HT,warp(v,uK)).r),uTherm);}
        c+= (h(v*vec2(1920.,1080.)+fract(uTime)*91.)-.5)*(.045+.07*uIR);
        c*= .97+.03*sin(v.y*1080.*3.1416);
        c*= 1.-.42*smoothstep(.45,1.15,length((v-.5)*vec2(1.7,1.)));
        float s=h(floor(v*vec2(480.,270.))+floor(uTime*30.)); c=mix(c,vec3(s*.8+.1),uStatic);
        gl_FragColor=vec4(c,1.);}`;
      const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
      const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr); gl.useProgram(pr);
      const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      for (const n of ['uIR', 'uTime', 'uStatic', 'uK', 'uTherm', 'T', 'HT']) U[n] = gl.getUniformLocation(pr, n);
      const mk = (unit) => { gl.activeTexture(gl.TEXTURE0 + unit); const tx = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tx);
        for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255])); return tx; };
      htex = mk(1); tex = mk(0); gl.uniform1i(U.T, 0); gl.uniform1i(U.HT, 1);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.viewport(0, 0, W, H);
    }
  } catch (e) { console.warn('[NaomiCam] WebGL off', e); gl = null; }
  const ctx2 = gl ? null : cv.getContext('2d');
  function present(t) {
    if (gl) {
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, off);
      if (cam.therm > .01) { gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, htex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, hoff); }
      gl.uniform1f(U.uTherm, cam.therm * (1 - cam.stat));
      gl.uniform1f(U.uIR, cam.ir * (1 - cam.therm)); gl.uniform1f(U.uTime, t); gl.uniform1f(U.uStatic, cam.stat); gl.uniform1f(U.uK, .2);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    } else {
      ctx2.drawImage(off, 0, 0);
      if (cam.therm > .5) { ctx2.save(); ctx2.filter = 'sepia(1) saturate(4) hue-rotate(-30deg)'; ctx2.drawImage(hoff, 0, 0); ctx2.restore(); }
      else if (cam.ir > .01) { ctx2.save(); ctx2.globalAlpha = cam.ir; ctx2.filter = 'grayscale(1) brightness(1.3)'; ctx2.drawImage(off, 0, 0); ctx2.restore(); }
      if (cam.stat > .01) { ctx2.fillStyle = `rgba(120,120,120,${cam.stat})`; ctx2.fillRect(0, 0, W, H); }
    }
  }
  const DAYS = ['日', '月', '火', '水', '木', '金', '土'];
  function drawOSD(t) {
    oc.clearRect(0, 0, W, H);
    oc.save(); oc.shadowColor = 'rgba(0,0,0,.7)'; oc.shadowBlur = 6; oc.fillStyle = '#fff'; oc.textBaseline = 'middle';
    // viewfinder corners
    oc.strokeStyle = 'rgba(255,255,255,.55)'; oc.lineWidth = 3;
    for (const [x, y, dx, dy] of [[48, 48, 1, 1], [W - 48, 48, -1, 1], [48, H - 48, 1, -1], [W - 48, H - 48, -1, -1]]) { oc.beginPath(); oc.moveTo(x, y + dy * 46); oc.lineTo(x, y); oc.lineTo(x + dx * 46, y); oc.stroke(); }
    const live = S.started ? S.step !== 'connect' || cam.stat < .5 : true;
    oc.font = '700 30px "JetBrains Mono", monospace';
    if (live && Math.floor(t * 1.2) % 2 === 0) { oc.fillStyle = '#ff3b4a'; oc.beginPath(); oc.arc(86, 86, 11, 0, 7); oc.fill(); }
    oc.fillStyle = '#fff'; oc.fillText(live ? 'LIVE' : 'CONNECTING…', 108, 87);
    oc.font = '600 24px "JetBrains Mono", "Noto Sans JP", monospace'; oc.fillText('CAM 1 · リビング Living room', 76, 128);
    const d = new Date(), date = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} (${DAYS[d.getDay()]})`;
    oc.textAlign = 'right'; oc.font = '700 30px "JetBrains Mono", monospace'; oc.fillText(`${date} ${simTime()}`, W - 76, 87);
    // signal bars
    for (let i = 0; i < 4; i++) { oc.fillStyle = i < (cam.stat > .3 ? 1 : 4) ? '#fff' : 'rgba(255,255,255,.3)'; oc.fillRect(W - 120 + i * 11, 140 - i * 7, 7, 10 + i * 7); }
    oc.font = '600 22px "JetBrains Mono", monospace'; oc.fillStyle = '#fff'; oc.fillText('Wi-Fi', W - 134, 133);
    // bottom-left: mode + zoom; bottom-right: pan position
    oc.textAlign = 'left'; oc.font = '700 24px "JetBrains Mono", monospace';
    const tags = [`${Z.toFixed(1)}×`, cam.therm > .5 ? 'THERMAL' : cam.ir > .5 ? 'IR ON' : 'HD 1080p'];
    oc.textAlign = 'right'; oc.font = '600 22px "JetBrains Mono", "Noto Sans JP", monospace'; oc.fillText(`室温 ROOM ${roomTemp().toFixed(1)}℃`, W - 76, 178); oc.textAlign = 'left';
    if (cam.therm > .5 && S.started) {
      // palette bar
      const gx = W - 92, g0 = 300, g1 = 700, g = oc.createLinearGradient(0, g1, 0, g0);
      [[0, '#050024'], [.25, '#570594'], [.5, '#e01f52'], [.75, '#ff940d'], [1, '#fff8b3']].forEach(([o, col]) => g.addColorStop(o, col));
      oc.fillStyle = g; oc.fillRect(gx, g0, 16, g1 - g0); oc.fillStyle = '#fff'; oc.font = '600 18px "JetBrains Mono", monospace'; oc.textAlign = 'right';
      oc.fillText('40℃', gx - 8, g0 + 6); oc.fillText('15℃', gx - 8, g1 - 4); oc.textAlign = 'left';
      // her temperature, next to her
      if (N.show) {
        const [wx, wy] = N.hidden ? P.house : headWorld(), [px, py] = N.screen ? [960 + N.ox, 380] : toScreen(wx, wy);
        if (px > 60 && px < W - 160) {
          oc.strokeStyle = '#fff'; oc.lineWidth = 2.5; oc.beginPath(); oc.moveTo(px - 22, py); oc.lineTo(px + 22, py); oc.moveTo(px, py - 22); oc.lineTo(px, py + 22); oc.stroke();
          oc.font = '700 28px "JetBrains Mono", monospace'; oc.fillText(`${naomiTemp().toFixed(1)}℃`, px + 30, py - 24);
        }
      }
    }
    if (cam.track && S.t - cam.manualT > 2.5 && N.show && !N.screen && S.started) tags.push('AUTO TRACK');
    if (talk.on) tags.push('🎤 TALKING');
    oc.font = '700 22px "JetBrains Mono", monospace'; oc.fillText(tags.join('  ·  '), 76, 166);
    const bx = W - 380, by = H - 82, bw = 300, k = (cam.x - CAM_MIN) / (CAM_MAX - CAM_MIN);
    oc.strokeStyle = 'rgba(255,255,255,.6)'; oc.lineWidth = 2; oc.beginPath(); oc.moveTo(bx, by); oc.lineTo(bx + bw, by); oc.stroke();
    for (const x of [bx, bx + bw / 2, bx + bw]) { oc.beginPath(); oc.moveTo(x, by - 8); oc.lineTo(x, by + 8); oc.stroke(); }
    oc.fillStyle = '#8ff0d0'; oc.beginPath(); oc.moveTo(bx + bw * k, by - 4); oc.lineTo(bx + bw * k - 11, by - 20); oc.lineTo(bx + bw * k + 11, by - 20); oc.fill();
    oc.font = '600 18px "JetBrains Mono", monospace'; oc.fillStyle = '#fff'; oc.fillText('PAN', bx - 54, by + 1);
    oc.restore();
    if (cam.flash > 0) { oc.fillStyle = `rgba(255,255,255,${cam.flash * .8})`; oc.fillRect(0, 0, W, H); }
  }

  // ---------------------------------------------------------------- side panel: radar + meters + device (same as Demo 11)
  const rc = $('radar').getContext('2d');
  function radar(src, th) {
    const w = 480, h = 420, cx = 240, cy = 220, R = 160;
    rc.clearRect(0, 0, w, h);
    rc.strokeStyle = 'rgba(255,255,255,.08)'; rc.lineWidth = 1.5; for (const r of [R * .5, R]) { rc.beginPath(); rc.arc(cx, cy, r, 0, 7); rc.stroke(); }
    rc.fillStyle = 'rgba(143,240,208,.07)'; rc.beginPath(); rc.moveTo(cx, cy); rc.arc(cx, cy, R, -Math.PI / 2 - .62, -Math.PI / 2 + .62); rc.fill();   // camera field of view
    rc.fillStyle = '#7f948d'; rc.font = '600 13px Inter'; rc.textAlign = 'center'; rc.fillText('camera view', cx, cy - R - 10); rc.fillText('L', cx - R - 18, cy + 5); rc.fillText('R', cx + R + 18, cy + 5);
    for (const [e, sx] of [['L', -1], ['R', 1]]) {
      const v = Math.max(th[e + 'c'], th[e + 'h']), col = th[e + 'c'] > th[e + 'h'] ? '79,179,255' : '255,122,69';
      rc.fillStyle = v > .02 ? `rgba(${col},${.25 + .75 * v})` : '#22302f'; rc.beginPath(); rc.ellipse(cx + sx * 46, cy, 12, 24, 0, 0, 7); rc.fill();
      if (v > .02) { rc.shadowColor = `rgb(${col})`; rc.shadowBlur = 22 * v; rc.fill(); rc.shadowBlur = 0; }
    }
    rc.fillStyle = '#2c3a3c'; rc.beginPath(); rc.arc(cx, cy, 40, 0, 7); rc.fill(); rc.fillStyle = '#3e5052'; rc.beginPath(); rc.moveTo(cx - 9, cy - 38); rc.lineTo(cx, cy - 52); rc.lineTo(cx + 9, cy - 38); rc.fill();
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
      el.style.opacity = v.toFixed(2); el.style.background = c > .03 && h > .03 ? `linear-gradient(to bottom, rgba(255,122,69,${(.6 * Math.sqrt(h / v)).toFixed(2)}) 0 38%, rgba(79,179,255,${(.6 * Math.sqrt(c / v)).toFixed(2)}) 62% 100%)` : `linear-gradient(to ${e === 'L' ? 'right' : 'left'}, rgba(${col},.55), rgba(${col},0))`;   // cool AND heat on one ear: warm on top, cool below, blended over the middle; the .glow mask fades it inward (layered, they read as grey: Demo19 2026-11-10)
    }
    if (!device.isConnected() || !$('sendOn').checked) return;
    const n = performance.now(); if (cmd !== lastSent && n - lastSendAt >= SEND_INTERVAL) { device.send(cmd); lastSent = cmd; lastSendAt = n; }
  }
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  // ---------------------------------------------------------------- main loop
  const keys = {};
  let last = performance.now(), hidden = false, wall = 0;
  function frame(t) { drawScene(t); present(t); drawOSD(t); }
  function loop() {
    const n = performance.now(), dt = clamp((n - last) / 1000, 0, .05); last = n; wall += dt;
    if (!hidden) {
      update(dt);
      if (S.started) { placeLoops(); frame(S.t); } else coverFrame(wall);
      coach();
      const { th, src } = thermal(dt);
      output(th, S.started); radar(S.started ? src : [], th);
      $('clock').textContent = fmt(S.clock);
      $('posInfo').textContent = S.bg === 'night' ? (cam.ir > .5 ? 'Night · IR' : 'Night') : 'Afternoon';
      const lv = micState === 'on' ? micLevel() : 0;
      $('micBars').querySelectorAll('i').forEach((b, i) => { const on = lv * 9 > (i + 1) / 7; b.style.height = `${on ? 35 + 65 * Math.min(1, lv * 9 - i / 7) : 15}%`; b.style.opacity = on ? 1 : .35; });
    }
    requestAnimationFrame(loop);
  }
  $('micBars').innerHTML = '<i></i>'.repeat(5);
  document.addEventListener('visibilitychange', () => { hidden = document.hidden; if (hidden) { stopOutput(); SND.ctx()?.suspend(); } else { last = performance.now(); SND.ctx()?.resume(); } });
  document.addEventListener('keydown', (e) => {
    if (e.target.matches?.('input, select')) return;
    if (e.code === 'Escape') emergencyStop();
    else if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) talkDown(); }
    else if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') { e.preventDefault(); keys[e.code] = true; }
    else if (e.code === 'KeyH') hint();
  });
  document.addEventListener('keyup', (e) => { if (e.code === 'Space') talkUp(); if (keys[e.code]) keys[e.code] = false; });

  function finish() {
    S.done = true; renderGoal(); renderSteps(); dockUI();
    setTimeout(() => {
      S.started = false; stopOutput(); for (const l of Object.values(L)) l.stop(); L = {}; CA.motorLevel(0);
      $('startBtn').textContent = '↺ もう一度 · Watch again';
      $('intro').classList.remove('hidden'); dockUI();
    }, 1500);
  }
  function resetAll() {
    Object.assign(N, { pose: 'sleep', x: P.nap[0], y: P.nap[1], flip: false, face: '', squish: 0, jump: 0, tilt: 0, tiltT: 0, ox: 0, oxT: 0, show: true, purr: .35, purrT: .35,
      tx: null, after: null, pounce: null, screen: false, zoom: 0, lunge: 0, eyes: 0, coolUntil: 0,
      hidden: true, heat: 0, cold: 0, x: P.house[0], y: 870 });
    Object.assign(cam, { x: CAM_MAX, tx: CAM_MAX, v: 0, shake: 0, ir: 0, irTo: 0, stat: 1, fog: 0, smudge: 0, flash: 0, manualT: -9, track: false, therm: 0, thermTo: 0 });
    cam.x = cam.tx = CAM_MIN;
    Object.assign(laser, { on: false, hide: 0, still: 0, need: false });
    for (const e of Object.values(ear)) { e.mode = ''; e.v = 0; }
  }
  function start() {
    SND.init(); CA.init();
    S = fresh(); resetAll(); parts = []; pulses = [];
    $('intro').classList.add('hidden'); S.started = true;
    const jump = QS.get('step');
    if (jump && STEPS.some((s) => s[0] === jump)) jumpTo(jump);
    else { setStep('connect'); CA.fx.static(2.1); }
    setLoops(); renderHearts(); renderGoal(); renderSteps(); dockUI();
  }
  // ?step=<id>: start at that step (testing)
  function jumpTo(id) {
    cam.stat = 0; S.hearts = Math.max(0, HEART_STEPS.indexOf(id));
    if (id === 'find') { setStep('find'); hint(); }
    if (id === 'call') { N.hidden = false; setPose('sit', P.houseFront[0], P.houseFront[1]); cam.x = cam.tx = CAM_MAX; S.found = 9; setStep('call'); hint(); }
    if (id === 'cool') { N.hidden = false; N.heat = 1; setPose('belly', 1000, 985); cam.x = cam.tx = 900; setStep('cool'); hint(); }
    if (id === 'lens') { toLens(); S.hearts = 2; }
    if (id !== 'find') N.hidden = false;
    if (id === 'laser') { setPose('sit', 900, 990); cam.x = cam.tx = 900; setStep('laser'); hint(); }
    if (id === 'feed') { setPose('sit', 1200, 1000); cam.x = cam.tx = 1200; setStep('feed'); hint(); }
    if (id === 'night' || id === 'home') { S.bg = 'night'; S.sim = 21 * 3600 + 8 * 60; cam.ir = cam.irTo = 1; setPose('sleep', P.blanket[0], P.blanket[1]); N.cold = id === 'night' ? 1 : 0; S.carpet = id === 'home' ? 1 : 0; S.heater = id === 'home'; cam.x = cam.tx = clamp(P.blanket[0] - 180, CAM_MIN, CAM_MAX); setStep(id); hint(); }
    renderHearts();
  }
  $('startBtn').addEventListener('click', start);
  $('lrBtn').addEventListener('click', () => { SND.lrCheck(); const b = $('lrBtn'); b.textContent = '🎧 Left…'; setTimeout(() => { b.textContent = '🎧 …Right'; }, 900); setTimeout(() => { b.textContent = '🎧 Left / Right check'; }, 1900); });

  // cover: the live feed, Naomi sitting on the right of the picture, looking into the camera
  function coverFrame(t) {
    const keep = { ...N };
    Object.assign(cam, { x: 1000, stat: 0, ir: 0, therm: 0, shake: 0, fog: 0, smudge: 0, flash: 0 });
    Object.assign(N, { show: true, screen: false, hidden: false, cold: 0, heat: 0, pose: 'sit', x: 1330, y: 1040, flip: false, face: '', squish: 0, jump: 0, eyes: 0 });
    const keepBg = S.bg; S.bg = 'day';
    drawScene(t); present(t); drawOSD(t);
    S.bg = keepBg; Object.assign(N, keep);
    // cover standard (shared/cover.js): the camera picture is drawn by WebGL, so it is not refitted — where Naomi's face is (check_cover.py)
    
  }
  // pure listening (shared/shell.js hand): the camera app is used for you — 🌡 thermal, pan right, tap the warm cat house, hold 🎤
  // twice, slow strokes over her face at the lens, the laser dot parked a little away from her (she stalks it, pounces), the fan's
  // wind aimed at her, 🍚, 🔥 the blanket and a held "good night".
  if (window.MoHeatShell) {
    const scr = (wx, wy) => { const [x, y] = toScreen(wx, wy); return [x / W, y / H]; };
    MoHeatShell.autoplay = (G) => {
      if (!S.started || S.done || fading || S.st < 1.2) return true;
      const st = S.step, ok = (b) => !b.hidden && !b.disabled;
      if (st === 'find' && S.found < 0) {
        if (!cam.thermTo && ok(btn.therm)) return G.run(() => G.tap(btn.therm));
        const [hx] = toScreen(P.house[0], P.house[1]);
        if (hx > W - 260 && ok(btn.panR)) return G.run(() => G.hold(btn.panR, .5, .5, Math.min(2.6, (hx - W * .6) / Z / 520 + .2)));
        if (cam.therm > .5) return G.run(async () => { await G.wait(.8); await G.tap(cv, ...scr(P.house[0], P.house[1])); await G.wait(1); });
        return true;
      }
      if (st !== 'find' && cam.thermTo && ok(btn.therm) && !S.thermOff) { S.thermOff = 1; return G.run(async () => { await G.wait(.6); await G.tap(btn.therm); }); }   // found her: back to the normal picture
      if (st === 'call' && S.calls < 2 && ok(btn.talk)) return G.run(async () => { await G.hold(btn.talk, .5, .5, 1.3, () => talk.held > .75); await G.wait(2.6); });
      if (st === 'lens' && S.lensReady && S.rubs < 3) { const P2 = []; for (let i = 0; i < 7; i++) P2.push([(i % 2 ? 1260 : 660) / W, (420 + (i % 3) * 90) / H]); return G.run(() => G.drag(cv, P2, 5.5)); }
      if (st === 'laser' && S.catches < 3) {
        if (!laser.on) return ok(btn.laser) ? G.run(() => G.tap(btn.laser)) : true;
        if (N.pounce || N.pose === 'walk') return true;
        const side = N.x > cam.x ? -1 : 1, wx = clamp(N.x + side * 330, cam.x - HALF * .75, cam.x + HALF * .75);
        const c0 = S.catches; return G.run(async () => { await G.move(cv, [scr(wx, 975)], .9); await G.wait(1.5, () => S.catches > c0 || (!N.pounce && N.pose !== 'walk' && laser.still > 1.5)); await G.wait(.6); });
      }
      if (st === 'cool' && !S.cooled) {
        if (!S.fan) return ok(btn.fan) ? G.run(() => G.tap(btn.fan)) : true;
        if (Math.abs(S.aim - N.x) > 120) return G.run(async () => { await G.drag(cv, [scr(S.aim, N.y - 160), scr(N.x, N.y - 160)], 1.2); await G.wait(2); });
        return true;
      }
      if (st === 'feed' && S.food < 0 && ok(btn.feed)) return G.run(() => G.tap(btn.feed));
      if (st === 'night') {
        if (!S.heater && ok(btn.heat) && S.st > 4) return G.run(() => G.tap(btn.heat));
        if (S.carpet > .9 && S.said < 0 && ok(btn.talk)) return G.run(async () => { await G.wait(1.5); await G.hold(btn.talk, .5, .5, 1.4, () => talk.held > .75); });
      }
      return true;
    };
  }
  window.NAOMICAM = { get S() { return S; }, N, cam, laser, thermal: () => thermal(.05), conflicts: () => conflicts, jumpTo, onTalk };
  renderGoal(); renderSteps(); renderHearts(); dockUI();
  artReady.then(() => document.fonts.ready).then(() => { if (!S.started) coverFrame(0); });
  if (QS.has('cover')) { document.body.classList.add('cover-only'); return; }
  if (QS.has('autoplay') || QS.get('step')) { const ac = SND.init(); CA.init(); if (QS.get('step') || ac.state === 'running') start(); else ac.resume().then(() => { if (ac.state === 'running' && !S.started) start(); }).catch(() => {}); }
  requestAnimationFrame(loop);
})();
