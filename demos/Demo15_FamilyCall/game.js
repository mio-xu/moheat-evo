// 『もしもし、おばあちゃん？』 — an interactive phone call home to grandma Hana and grandpa Gen (original characters).
// You call their old landline: the phone is at your left ear (left warm). Grandma shouts for grandpa, he comes running and grabs
// the receiver, they end up sharing it cheek to cheek. Their parcel arrives mid-call: put them on speaker, open the door (cold on the
// left), unwrap grandma's hand-knitted scarf (both ears warm) and grandpa's refrigerated mini snowman (press it to your right cheek:
// right cool, left still warm). Phone back to your ear, a New Year promise, and neither side can hang up first.
// Per ear only the stronger of heat / cool is sent (firmware: one mode per ear) → 0 same-ear conflicts (FAMILY.conflicts()).
(() => {
  const $ = (id) => document.getElementById(id);
  const QS = new URLSearchParams(location.search);
  const SND = window.CallAudio, LINES = window.FAMILY_LINES, W = 1920, H = 1080;
  const cv = $('scene'), ctx = cv.getContext('2d'), stage = $('stage');
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), rnd = (a, b) => a + Math.random() * (b - a);
  const sleep = (s) => new Promise((r) => setTimeout(r, s * 1000));

  // ---------------------------------------------------------------- art (scripts/seedance.py → scripts/prepare_art.py)
  // views: room (your flat), gm (grandma answers), duo (both at the phone), snow (grandpa's snowy yard), knit (grandma knitting),
  // box (the parcel on your table), cooler (the snowman), bye (both waving). Face patches: <base>_<gm|gp>_mouth, <base>_blink.
  const IMG = {};
  const PATCH = window.FAMILY_PATCHES || {};
  const BASES = ['bg_room', 'gm_call', 'duo_call', 'gp_snow', 'gm_knit', 'box_open', 'cooler', 'duo_bye'];
  const artReady = Promise.all([...BASES, ...Object.keys(PATCH)].map((n) => new Promise((res) => { const im = new Image(); im.onload = () => { IMG[n] = im; res(); }; im.onerror = () => res(); im.src = `media/art/${n}.webp?v=1`; })));
  const VIEW = { room: 'bg_room', gm: 'gm_call', duo: 'duo_call', snow: 'gp_snow', knit: 'gm_knit', box: 'box_open', cooler: 'cooler', bye: 'duo_bye' };
  const FALLBACK = { room: ['#2c3150', '#f2c38b', '🏠'], gm: ['#f6d9b8', '#e9a87c', '👵'], duo: ['#f6d9b8', '#e9a87c', '👵👴'], snow: ['#dfe9f5', '#9fb7d6', '⛄'],
    knit: ['#f6d9b8', '#d77a6a', '🧶'], box: ['#e8d3b0', '#b98a5a', '📦'], cooler: ['#d8ecf5', '#7fb4d6', '⛄'], bye: ['#f9dcc0', '#f0a07a', '👋'] };

  // ---------------------------------------------------------------- state
  const fresh = () => ({ started: false, done: false, t: 0, clock: 0, callT: 0, inCall: false, ear: 0, speaker: false, view: 'room',
    doorCold: 0, scarf: 0, scarfOn: false, snow: 0, snowOn: false, who: '', step: 0, fade: 0, lv: 0, gift: false });
  let S = fresh(), run = 0;
  // two episodes of the same call: part 1 (call → grandpa → parcel → scarf) and part 2 (snowman → New Year → nobody hangs up).
  // Part 2's page (demos/Demo16_FamilyCall2/) sets <body data-part="2"> and <base href="../Demo15_FamilyCall/">, so all files are shared.
  const PART = +(document.body.dataset.part || QS.get('part') || 1);
  const STEPS = PART === 2 ? [
    ['snowman', 'じいちゃんの雪だるま', "Grandpa's snowman"], ['phone', '受話器を耳に', 'Phone back to your ear'],
    ['newyear', 'お正月の約束', 'A New Year promise'], ['bye', 'なかなか切れない', 'Nobody hangs up'],
  ] : [
    ['call', 'おばあちゃんちに電話', 'Call home'], ['hello', 'おばあちゃんが出た', 'Grandma answers'], ['gp', 'おじいちゃんも', 'Grandpa too'],
    ['parcel', '荷物が届いた', 'A parcel arrives'], ['scarf', 'ばあばのマフラー', "Grandma's scarf"],
  ];
  function setStep(i) { S.step = i; $('steps').innerHTML = STEPS.map((s, k) => `<li class="${k < i ? 'done' : k === i ? 'now' : ''}">${s[1]} · <small>${s[2]}</small></li>`).join(''); }

  // ---------------------------------------------------------------- subtitles
  const subJa = $('subJa'), subEn = $('subEn'), subs = $('subs');
  function sub(ja, en, who = '') { subJa.textContent = ja || ''; subEn.textContent = en || ''; subs.dataset.who = who; subs.classList.toggle('show', !!ja); }
  const NAME = { gm: 'ばあば', gp: 'じいじ' };

  // ---------------------------------------------------------------- they speak (through the phone; far = shouting away from it)
  let talking = 0;
  async function say(id, far = false) {
    const my = run; const [who, ja, en] = LINES[id];
    S.who = who; sub(ja, en, who); talking++;
    await SND.say(id, 'phone', far ? .9 : 1.45, far);
    talking--; if (my !== run) throw new Error('stopped');
    await sleep(.3); sub('', '');
  }

  // ---------------------------------------------------------------- your turn: choices, your voice, actions (as Demo 12)
  const choiceEl = $('choices'), actEl = $('act'), micEl = $('micGate');
  function choice(opts, timeout = 20) {
    return new Promise((res) => {
      choiceEl.innerHTML = opts.map((o, i) => `<button class="ch" data-i="${i}"><b>${o[0]}</b><span>${o[1]}</span></button>`).join('');
      choiceEl.classList.add('show');
      const done = (i) => { clearTimeout(tm); choiceEl.classList.remove('show'); choiceEl.innerHTML = ''; res(i); };
      choiceEl.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => done(+b.dataset.i)));
      const tm = setTimeout(() => done(0), timeout * 1000);
    });
  }
  let hot = null;
  function action(icon, ja, en, hotspot = null) {
    return new Promise((res) => {
      actEl.innerHTML = `<button class="act-btn"><i>${icon}</i><b>${ja}</b><span>${en}</span></button>`; actEl.classList.add('show');
      const done = () => { actEl.classList.remove('show'); actEl.innerHTML = ''; hot = null; stage.classList.remove('pointer'); res(); };
      actEl.querySelector('button').addEventListener('click', done);
      hot = hotspot ? { ...hotspot, done } : null;
    });
  }
  const at = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; };
  const inHot = (x, y) => hot && x > hot.x0 && x < hot.x1 && y > hot.y0 && y < hot.y1;
  cv.addEventListener('pointerdown', (e) => { const [x, y] = at(e); if (inHot(x, y)) hot.done(); });
  cv.addEventListener('pointermove', (e) => { const [x, y] = at(e); stage.classList.toggle('pointer', !!inHot(x, y)); });
  let mic = null, micState = 'none', floor = .01; const mbuf = new Float32Array(1024);
  function ensureMic() {
    if (micState !== 'none' || !$('micOn').checked || !navigator.mediaDevices?.getUserMedia) return;
    micState = 'asking';
    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false } })
      .then((st) => { const ac = SND.ctx() || SND.init(); const an = ac.createAnalyser(); an.fftSize = 1024; ac.createMediaStreamSource(st).connect(an); mic = { an, st }; micState = 'on'; })
      .catch(() => { micState = 'denied'; });
  }
  $('micOn').addEventListener('change', (e) => { if (e.target.checked) ensureMic(); else { mic?.st.getTracks().forEach((t) => t.stop()); mic = null; micState = 'none'; } });
  function micLevel() { if (!mic) return 0; mic.an.getFloatTimeDomainData(mbuf); let s = 0; for (let i = 0; i < mbuf.length; i++) s += mbuf[i] * mbuf[i]; return Math.sqrt(s / mbuf.length); }
  let micWait = null;
  function speak(ja, en, btnJa, btnEn, timeout = 20) {
    return new Promise((res) => {
      micEl.querySelector('.say b').textContent = ja; micEl.querySelector('.say span').textContent = en;
      micEl.querySelector('button').innerHTML = `${btnJa} · ${btnEn}`; micEl.classList.add('show');
      const done = () => { clearTimeout(tm); micWait = null; micEl.classList.remove('show'); res(); };
      micEl.querySelector('button').onclick = done;
      micWait = { talk: 0, quiet: 0, done };
      const tm = setTimeout(done, timeout * 1000);
    });
  }
  $('micBars').innerHTML = '<i></i>'.repeat(6);
  function caption(ja, en, s = 2.2) { sub(ja, en, 'fx'); return sleep(s).then(() => sub('', '')); }

  // ---------------------------------------------------------------- the story
  async function story() {
    const my = ++run;
    const L = -1.45, R = 1.45;
    try {
      if (PART === 2) return await part2(my, L, R);
      // your flat on a winter evening; their number is in your favourites
      S.view = 'room'; setStep(0); SND.loop('heater', -.3, 2.4)?.set(.035); SND.loop('room', 0, 3)?.set(.04);
      await sleep(.8);
      $('dialer').classList.add('show');
      await new Promise((res) => { $('callBtn').onclick = res; });
      $('dialer').classList.remove('show');
      SND.fx.rustle(L, .3); S.inCall = true; S.ear = -1; SND.phoneOn(L);
      await sleep(.4); SND.fx.dial(L); await sleep(1.8);
      for (let i = 0; i < 3; i++) { SND.fx.ringback(); await sleep(3); if (my !== run) return; }
      SND.fx.pickup(); SND.loop('home')?.set(.25);
      S.view = 'gm'; setStep(1); await sleep(.6);
      await say('g01');
      await choice([['おばあちゃん、ひさしぶり！', "Grandma, it's been a while!"], ['もしもし、元気〜？', 'Hello, how are you?']]);
      S.happy = 1; await say('g02');
      // grandma shouts for grandpa — he comes running and grabs the receiver
      setStep(2);
      await say('g03', true);
      await say('p00', true);
      SND.fx.running(8); await sleep(1.9); SND.fx.fumble(); await sleep(.5);
      S.view = 'duo';
      await say('p01'); await say('g04'); await say('p02'); await say('g05');
      await say('g06');
      const eat = await choice([['ちゃんと食べてるよ！', "I'm eating properly!"], ['…カップ麺ばっかり', '…Mostly instant noodles']]);
      await say(eat ? 'g07b' : 'g07a');
      S.view = 'snow'; await say('p03');
      const sn = await choice([['こっちも寒いよ', "It's cold here too"], ['雪、見たいなあ', 'I wish I could see the snow']]);
      await say(sn ? 'p04b' : 'p04a');
      S.view = 'duo'; await say('g08');
      // the parcel arrives mid-call
      setStep(3);
      SND.fx.bellHome(-.8); await sleep(1.6);
      await say('g09');
      await action('🔈', 'スピーカーにして置く', 'Put them on speaker');
      SND.fx.beep(); SND.fx.rustle(L, .3); SND.phoneSpeaker(); S.speaker = true; S.ear = 0; S.view = 'room';
      await sleep(.5);
      await action('🚪', '玄関をあける', 'Open the door', { x0: 0, x1: 700, y0: 0, y1: 1000 });
      SND.fx.steps(.1, -.8, 5); await sleep(2.1); SND.fx.door(-.8); S.doorCold = 1; SND.fx.gust();
      await caption('📦 お届けものでーす！', 'Delivery for you!', 1.6);
      SND.fx.thud(-.8); await sleep(.9); SND.fx.door(-.8); await sleep(.8);
      SND.fx.steps(-.8, .05, 5); await sleep(2);
      await action('📦', '箱をあける', 'Open the box');
      SND.fx.tape(.05); await sleep(.9); SND.fx.cardboard(.05); S.view = 'box'; await sleep(.8);
      // grandma's scarf: both ears warm
      setStep(4);
      await say('g10');
      await action('🧣', 'マフラーを巻く', 'Wrap the scarf around your neck');
      SND.fx.scarf(); S.scarfOn = true; S.view = 'knit';
      await sleep(1.2); await say('g11');
      await speak('「あったかい！」って言ってみて', 'Tell her "It\'s so warm!"', '🧣 あったかい！', "It's so warm!");
      await say('g12');
      // to be continued: grandpa wants you to open his blue box
      S.view = 'box'; await say('p05'); await sleep(.6);
      await caption('⛄ つづく — 第2話「じいちゃんの、ゆきだるま」', "To be continued — Part 2: Grandpa's Little Snowman", 3);
      S.fade = 1; await sleep(2.6); finish();
    } catch (e) { if (e.message !== 'stopped') console.error(e); }
  }
  async function part2(my, L, R) {
    try {
      // the same call, a minute later: they are on speaker on your table, grandma's scarf is round your neck, the parcel is open
      S.view = 'box'; setStep(0); SND.loop('heater', -.3, 2.4)?.set(.035); SND.loop('room', 0, 3)?.set(.04);
      S.inCall = true; SND.phoneOn(L); SND.phoneSpeaker(); S.speaker = true; S.ear = 0; S.scarfOn = true; SND.loop('home')?.set(.25);
      await caption('🧣 ばあばのマフラーを巻いたまま、電話はスピーカーで…', "Still wrapped in Grandma's scarf, the call on speaker…", 2.6);
      // grandpa's refrigerated snowman: right cheek cool, the scarf keeps the left warm
      await say('p05');
      await action('🧊', '青い箱をあける', 'Open the blue box', { x0: 900, x1: 1920, y0: 200, y1: 1080 });
      SND.fx.cooler(.1); S.view = 'cooler'; await sleep(1.4);
      S.view = 'snow'; await say('p06'); await say('g13');
      S.view = 'cooler'; await say('p07'); await say('p08');
      await action('⛄', '右のほっぺにピタッ', 'Press it to your right cheek', { x0: 960, x1: 1920, y0: 0, y1: 1080 });
      SND.fx.squish(R); S.snowOn = true; await sleep(1.4);
      await say('p08b');
      await choice([['つめたーい！', 'So cold!'], ['かわいい！', 'So cute!']]);
      await say('p09');
      // phone back to your ear (the snowman goes back in its box)
      S.snowOn = false; SND.fx.cooler(.1);
      setStep(1); S.view = 'duo'; await say('g14');
      await action('📱', '受話器を耳にあてる', 'Hold the phone to your ear');
      SND.fx.beep(); SND.fx.rustle(L, .3); SND.phoneEar(L); S.speaker = false; S.ear = -1;
      setStep(2); await sleep(.4);
      await say('p10');
      const ny = await choice([['帰るよ！', "I'll come home!"], ['…まだわからない', "…I'm not sure yet"]]);
      if (!ny) { await say('g15a'); await say('p11a'); } else await say('g15b');
      await say('g16'); await say('p12');
      // nobody wants to hang up first
      setStep(3);
      await say('g17'); await say('p13'); await sleep(1.6);
      await say('g18'); await say('p14'); await say('g19');
      await speak('「またね、大好きだよ」って言ってみて', 'Say "See you soon, love you"', '💗 またね、大好き', 'See you, love you');
      S.view = 'bye'; S.gift = true;
      await say('g20'); await say('p15'); await sleep(.8);
      await say('p16');
      await action('📴', '電話を切る', 'Hang up');
      SND.fx.hangup(L); await sleep(.4); SND.phoneOff(); S.inCall = false; S.ear = 0; SND.loop('home')?.stop();
      S.view = 'room'; await sleep(2.2); SND.fx.chime();
      S.fade = 1; await sleep(3.2); finish();
    } catch (e) { if (e.message !== 'stopped') console.error(e); }
  }

  // ---------------------------------------------------------------- per-frame state + thermal
  function update(dt) {
    S.t += dt; if (!S.started) return;
    S.clock += dt; if (S.inCall) S.callT += dt;
    S.lv = SND.voiceLevel();
    S.doorCold = Math.max(0, S.doorCold - dt / 6);
    S.scarf += ((S.scarfOn ? 1 : 0) - S.scarf) * (1 - Math.exp(-dt / 2.5));    // wool warms up slowly
    S.snow += ((S.snowOn ? 1 : 0) - S.snow) * (1 - Math.exp(-dt / (S.snowOn ? .4 : 1.2)));
    if (micWait) {
      const ml = micState === 'on' ? micLevel() : 0; floor = ml < floor ? ml : floor + (ml - floor) * dt * .05;
      const loud = micState === 'on' && ml > Math.max(.02, floor * 4);
      if (loud) { micWait.talk += dt; micWait.quiet = 0; } else if (micWait.talk > .25) { micWait.quiet += dt; if (micWait.quiet > .5) micWait.done(); }
      micEl.querySelectorAll('.mic i').forEach((b, i) => { const on = ml * 9 > (i + 1) / 7; b.style.height = `${on ? 35 + 65 * Math.min(1, ml * 9 - i / 7) : 15}%`; b.style.opacity = on ? 1 : .35; });
      micEl.querySelector('.mic').hidden = micState !== 'on';
    }
    SND.tick(dt);
  }
  function sources() {
    const out = [], add = (az, k, s, icon) => { if (s > .01) out.push({ az, k, s, icon }); };
    if (!S.started) return out;
    if (S.inCall && S.ear) add(S.ear * 1.45, 'h', .4 + clamp(S.lv * 6) * .2, '📱');
    if (S.doorCold > 0) add(-1.0, 'c', .75 * S.doorCold, '🚪');
    if (S.scarf > .01) { add(-1.3, 'h', .5 * S.scarf, '🧣'); add(1.3, 'h', .5 * S.scarf, '🧣'); }
    if (S.snow > .01) add(1.45, 'c', .85 * S.snow, '⛄');
    return out;
  }
  const ear = { L: { mode: '', v: 0 }, R: { mode: '', v: 0 } };
  function thermal(dt) {
    const sum = { L: { h: 0, c: 0 }, R: { h: 0, c: 0 } }, src = sources();
    for (const s of src) { const sn = Math.sin(s.az), wL = clamp(1 - 1.2 * Math.max(0, sn)), wR = clamp(1 - 1.2 * Math.max(0, -sn)); sum.L[s.k] += s.s * wL; sum.R[s.k] += s.s * wR; }
    const th = { Lc: 0, Lh: 0, Rc: 0, Rh: 0 };
    for (const e of ['L', 'R']) {
      const E = ear[e], hh = Math.min(1, sum[e].h), cc = Math.min(1, sum[e].c);
      let mode = E.mode;
      if (!mode) mode = hh > cc ? 'h' : 'c'; else if (mode === 'h' && cc > hh + .06) mode = 'c'; else if (mode === 'c' && hh > cc + .06) mode = 'h';
      if (mode !== E.mode) { E.v = 0; E.mode = mode; }
      const target = mode === 'h' ? Math.min(.9, hh) : cc, tau = target > E.v ? (mode === 'h' ? .4 : .2) : .35;
      E.v += (target - E.v) * (1 - Math.exp(-dt / tau)); th[e + mode] = E.v;
    }
    return { th, src };
  }

  // ---------------------------------------------------------------- drawing: base picture + small face patches faded in / out
  let blinkAt = 2, blinkUntil = 0, viewA = 'room', viewB = 'room', mix = 1;
  const FW = { gm: 0, gp: 0, blink: 0 };
  const ease = (k, target, dt, up, down) => k + (target - k) * (1 - Math.exp(-dt / (target > k ? up : down)));
  function faces(t, dt) {
    const open = talking ? clamp((S.lv - .008) * 45) : 0;
    FW.gm = ease(FW.gm, S.who === 'gm' ? open : 0, dt, .035, .07);
    FW.gp = ease(FW.gp, S.who === 'gp' ? open : 0, dt, .035, .07);
    FW.blink = ease(FW.blink, t < blinkUntil ? 1 : 0, dt, .025, .05);
  }
  function drawView(view, t, alpha) {
    const name = VIEW[view], im = IMG[name];
    const z = 1.0 + .006 * Math.sin(t * .4), ox = W / 2 - W * z / 2, oy = H / 2 - H * z / 2;
    ctx.globalAlpha = alpha;
    if (!im) { drawFallback(view, t); ctx.globalAlpha = 1; return; }
    ctx.drawImage(im, ox, oy, W * z, H * z);
    const patch = (pn, w) => { const p = IMG[pn], a = PATCH[pn]; if (!p || !a || w < .01) return; ctx.globalAlpha = alpha * Math.min(1, w); ctx.drawImage(p, ox + a[0] * z, oy + a[1] * z, p.width * z, p.height * z); };
    patch(`${name}_blink`, FW.blink); patch(`${name}_blink2`, FW.blink); patch(`${name}_gm_mouth`, FW.gm); patch(`${name}_gp_mouth`, FW.gp);
    ctx.globalAlpha = 1;
  }
  function drawFallback(view, t) {   // until the painted art is in: a soft gradient + emoji, so the game is playable
    const [a, b, e] = FALLBACK[view], g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, a); g.addColorStop(1, b);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.font = '220px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(e, W / 2, H / 2 - 40 + 8 * Math.sin(t * 2)); ctx.textBaseline = 'alphabetic';
  }
  let flakes = [], hearts = [];
  function draw(t, dt) {
    if (t > blinkAt) { blinkUntil = t + .13; blinkAt = t + rnd(2.5, 5); }
    faces(t, dt);
    if (S.view !== viewB) { viewA = viewB; viewB = S.view; mix = 0; }
    mix = Math.min(1, mix + dt / .6);
    if (mix < 1) drawView(viewA, t, 1);
    drawView(viewB, t, mix < 1 ? mix : 1);
    if (viewB === 'snow' || viewB === 'cooler' || (S.doorCold > .2 && viewB === 'room')) {        // snow / cold mist drifting
      if (Math.random() < dt * 24) flakes.push({ x: viewB === 'room' ? rnd(0, 700) : rnd(0, W), y: -10, vx: rnd(-20, 20), vy: rnd(40, 110), r: rnd(3, 7), life: 0 });
    }
    for (const f of flakes) { f.life += dt; f.x += f.vx * dt + Math.sin(f.life * 2) * .4; f.y += f.vy * dt; }
    flakes = flakes.filter((f) => f.life < 12 && f.y < H);
    const snowy = viewB === 'snow' || viewB === 'cooler' || (viewB === 'room' && S.doorCold > .05);
    if (!snowy) flakes = flakes.filter((f) => (f.life = Math.max(f.life, 11)) && f.life < 12);   // indoors: let them melt away quickly
    ctx.fillStyle = 'rgba(255,255,255,.85)'; for (const f of flakes) { ctx.globalAlpha = clamp(12 - f.life); ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 7); ctx.fill(); } ctx.globalAlpha = 1;
    if (S.scarf > .05) {     // a warm glow around the neck while the scarf is on
      const g = ctx.createRadialGradient(W / 2, H + 120, 100, W / 2, H + 120, 900); g.addColorStop(0, `rgba(255,140,90,${.32 * S.scarf})`); g.addColorStop(1, 'rgba(255,140,90,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    if (S.snow > .05) {      // cool tint on the right where the snowman is
      const g = ctx.createLinearGradient(W, 0, W * .55, 0); g.addColorStop(0, `rgba(140,200,255,${.4 * S.snow})`); g.addColorStop(1, 'rgba(140,200,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    if (S.gift && Math.random() < dt * 5) hearts.push({ x: rnd(300, W - 300), y: H + 20, vy: rnd(90, 150), s: rnd(.6, 1.2), life: 0 });
    for (const h of hearts) { h.life += dt; h.y -= h.vy * dt; }
    hearts = hearts.filter((h) => h.life < 8);
    ctx.font = '64px sans-serif'; ctx.textAlign = 'center';
    for (const h of hearts) { ctx.globalAlpha = clamp(1 - h.life / 8); ctx.fillText('💗', h.x + Math.sin(h.life * 2) * 20, h.y); } ctx.globalAlpha = 1;
    if (S.fade) { S.fadeA = Math.min(1, (S.fadeA || 0) + dt / 3); ctx.fillStyle = `rgba(30,18,10,${S.fadeA})`; ctx.fillRect(0, 0, W, H); }
    const pill = $('callPill');
    pill.classList.toggle('show', S.inCall);
    if (S.inCall) pill.innerHTML = `<i class="dot"></i><b>おばあちゃんち</b><span>${fmt(S.callT)}</span><em>${S.speaker ? '🔈 speaker' : S.ear < 0 ? '📱 L' : S.ear > 0 ? 'R 📱' : '⇄'}</em>`;
  }

  // ---------------------------------------------------------------- side panel + device (same protocol as every demo)
  const rc = $('radar').getContext('2d');
  function radar(src, th) {
    const cx = 240, cy = 220, R = 160; rc.clearRect(0, 0, 480, 420);
    rc.strokeStyle = 'rgba(255,255,255,.08)'; rc.lineWidth = 1.5; for (const r of [R * .5, R]) { rc.beginPath(); rc.arc(cx, cy, r, 0, 7); rc.stroke(); }
    rc.fillStyle = '#9a8a7a'; rc.font = '600 13px Inter'; rc.textAlign = 'center'; rc.fillText('front', cx, cy - R - 10); rc.fillText('L', cx - R - 18, cy + 5); rc.fillText('R', cx + R + 18, cy + 5);
    for (const [e, sx] of [['L', -1], ['R', 1]]) {
      const v = Math.max(th[e + 'c'], th[e + 'h']), col = th[e + 'c'] > th[e + 'h'] ? '79,179,255' : '255,122,69';
      rc.fillStyle = v > .02 ? `rgba(${col},${.25 + .75 * v})` : '#33291f'; rc.beginPath(); rc.ellipse(cx + sx * 46, cy, 12, 24, 0, 0, 7); rc.fill();
    }
    rc.fillStyle = '#463a2e'; rc.beginPath(); rc.arc(cx, cy, 40, 0, 7); rc.fill();
    rc.font = '26px sans-serif'; rc.textBaseline = 'middle';
    for (const s of src) { const x = cx + Math.sin(s.az) * R, y = cy - Math.cos(s.az) * R; rc.globalAlpha = clamp(.35 + s.s); rc.fillStyle = s.k === 'h' ? 'rgba(255,122,69,.25)' : 'rgba(79,179,255,.25)'; rc.beginPath(); rc.arc(x, y, 18 + 18 * s.s, 0, 7); rc.fill(); rc.fillText(s.icon, x, y + 1); rc.globalAlpha = 1; }
    if (S.speaker && S.inCall) { const x = cx, y = cy - R * .55; rc.globalAlpha = .8; rc.fillText('🔈', x, y); rc.globalAlpha = 1; }
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
    if ((sc.Lc > OFF && sc.Lh > OFF) || (sc.Rc > OFF && sc.Rh > OFF)) conflicts++;
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

  // ---------------------------------------------------------------- loop / start / end
  let last = performance.now(), hidden = false;
  function loop() {
    const n = performance.now(), dt = clamp((n - last) / 1000, 0, .05); last = n;
    if (!hidden) {
      update(dt);
      if (S.started) draw(S.t, dt); else drawCover();
      const { th, src } = thermal(dt); output(th, S.started); radar(S.started ? src : [], th);
      $('clock').textContent = fmt(S.clock);
      $('posInfo').textContent = S.inCall ? (S.speaker ? 'Speaker · on the table' : S.ear < 0 ? 'Phone · left ear' : 'Phone · right ear') : S.started ? 'Your room' : '';
    }
    requestAnimationFrame(loop);
  }
  document.addEventListener('visibilitychange', () => { hidden = document.hidden; if (hidden) { stopOutput(); SND.ctx()?.suspend(); } else { last = performance.now(); SND.ctx()?.resume(); } });
  document.addEventListener('keydown', (e) => { if (e.code === 'Escape') emergencyStop(); });
  function finish() {
    S.done = true; S.started = false; run++; stopOutput(); SND.phoneOff();
    for (const k of ['room', 'heater', 'home']) SND.loop(k)?.stop();
    sub('', ''); $('callPill').classList.remove('show'); $('dialer').classList.remove('show');
    const c = $('cleared'); c.hidden = false;
    if (PART === 2) c.textContent = '💗 また電話してね · Call them again soon';
    else c.innerHTML = '⛄ つづく · To be continued → <a href="../Demo16_FamilyCall2/">第2話「じいちゃんの、ゆきだるま」 · Part 2</a>';
    $('startBtn').textContent = '↺ もう一度 · Play again'; $('intro').classList.remove('hidden');
  }
  function start() {
    SND.init(); ensureMic(); SND.loadVoices(Object.keys(LINES));
    S = fresh(); S.started = true; flakes = []; hearts = []; viewA = viewB = 'room'; mix = 1; $('cleared').hidden = true;
    for (const e of ['L', 'R']) { ear[e].mode = ''; ear[e].v = 0; }
    $('intro').classList.add('hidden');
    story();
  }
  $('startBtn').addEventListener('click', start);
  $('lrBtn').addEventListener('click', () => { SND.lrCheck(); const b = $('lrBtn'); b.textContent = '🎧 Left…'; setTimeout(() => { b.textContent = '🎧 …Right'; }, 900); setTimeout(() => { b.textContent = '🎧 Left / Right check'; }, 1900); });
  $('soundBtn').addEventListener('click', (e) => { SND.setMuted(!SND.isMuted()); e.target.textContent = SND.isMuted() ? '🔇' : '🔊'; });
  let coverCv = null;
  function drawCover() {   // the couple moved to the right half (title on the left): blurred copy behind, sharp copy with a feathered left edge
    const im = PART === 2 ? IMG.duo_bye : IMG.duo_call; if (!im) { drawFallback('duo', S.t); return; }
    if (!coverCv) {
      coverCv = document.createElement('canvas'); coverCv.width = W; coverCv.height = H; const c = coverCv.getContext('2d');
      c.filter = 'blur(18px) brightness(.8)'; c.drawImage(im, -60, -60, W + 120, H + 120); c.filter = 'none';
      const off = document.createElement('canvas'); off.width = W; off.height = H; const o = off.getContext('2d');
      const dx = 520; o.drawImage(im, dx, 0, W, H);
      o.globalCompositeOperation = 'destination-in'; const g = o.createLinearGradient(dx, 0, dx + 380, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, '#000'); o.fillStyle = g; o.fillRect(0, 0, W, H);
      c.drawImage(off, 0, 0);
    }
    ctx.drawImage(coverCv, 0, 0);
  }
  window.FAMILY = { get S() { return S; }, FW, thermal: () => thermal(.05), conflicts: () => conflicts };
  setStep(0);
  if (QS.has('cover')) { document.body.classList.add('cover-only'); artReady.then(drawCover); return; }
  if (QS.has('autoplay')) { const ac = SND.init(); if (ac.state === 'running') start(); else ac.resume().then(() => { if (ac.state === 'running' && !S.started) start(); }).catch(() => {}); }
  requestAnimationFrame(loop);
})();
