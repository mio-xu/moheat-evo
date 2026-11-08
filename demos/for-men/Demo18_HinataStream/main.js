// 『ひなたと、ゲーセンデート』 — Hinata (original character; the gamer streamer of the old live-stream demo), 21, on her day off, in a
// cap as a light disguise: a winter Friday night in a neon arcade with you — taiko (tap fast), a racing game whose fans blow in your
// face, a crane game for a cat plushie, a cramped purikura booth (her cheek at your right ear), and the cold street outside, where she
// presses a hot can of corn soup to your left cheek and tells you a secret at your right ear. Script: project/script.md (v1, approved).
// DUAL thermal shows off what MoHeat Evo can do: cold street ↔ warm arcade (fast switching), racing-fan gusts on both ears while her
// excited voice warms the right ear, and the street: cold on both ears + the hot can on the left = cool and warm at once on one ear.
// Built on Demo31's main.js (choices / action / hold, clip player, layered stills via shared/layers.js, thermal model, device panel).
(() => {
  const $ = (id) => document.getElementById(id);
  const QS = new URLSearchParams(location.search);
  const SND = window.HTAudio, LINES = window.HINATA_LINES, W = 1920, H = 1080;
  const AUTO = QS.has('auto');   // testing: every choice / action answers itself (?alt = the other branch)
  const ALT = QS.has('alt');
  const cv = $('scene'), ctx = cv.getContext('2d'), stage = $('stage');
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const sleep = (s) => new Promise((r) => setTimeout(r, s * 1000));

  // ---------------------------------------------------------------- art: one still per view (layered by shared/layers.js)
  const VIEWS = ['arrive', 'taiko', 'race', 'crane', 'booth', 'street'];
  const IMG = {};
  const artReady = Promise.all(VIEWS.map((n) => new Promise((res) => { const im = new Image(); im.onload = () => { IMG[n] = im; res(); }; im.onerror = () => res(); im.src = `media/art/hinata_${n}.jpg?v=1`; })));

  // ---------------------------------------------------------------- state
  const fresh = () => ({ started: false, t: 0, clock: 0, view: 'arrive', inside: 0, cold: 1, fans: 0, fanK: 0, cheek: 0, can: 0, gust: null,
    tap: null, crane: null, shots: null, flash: 0, fade: 0, lv: 0, env: 0, pos: { az: 0, dist: .8 }, end: 0, youWon: false });
  let S = fresh(), run = 0;
  const STEPS = [['arrive', 'ゲーセン到着', 'At the arcade'], ['taiko', '太鼓で勝負', 'Taiko match'], ['race', 'レースゲーム', 'Racing'],
    ['crane', 'クレーンゲーム', 'Crane game'], ['booth', 'プリクラ', 'Purikura'], ['street', '帰り道', 'The way home']];
  function setStep(i) { $('steps').innerHTML = STEPS.map((s, k) => `<li class="${k < i ? 'done' : k === i ? 'now' : ''}">${s[1]} · <small>${s[2]}</small></li>`).join(''); }

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
  // the taiko match: tap 「ドン！」 as fast as you can for 10 s; she always ends close to your score (no voice: it is a speed game)
  function taikoGame(sec = 10) {
    return new Promise((res) => {
      actEl.innerHTML = `<button class="act-btn tapper"><i>🥁</i><b>ドン！（連打）</b><span>Don! (tap fast)</span></button>`; actEl.classList.add('show');
      const b = actEl.querySelector('button'); const t0 = performance.now(); S.tap = { you: 0, her: 0, left: sec };
      const hit = (e) => { e?.preventDefault?.(); if (!S.tap) return; S.tap.you++; S.tap.hitT = performance.now(); SND.fx.don(); };
      b.addEventListener('pointerdown', hit); const kd = (e) => { if (e.code === 'Space' || e.code === 'Enter') hit(e); }; addEventListener('keydown', kd);
      const herRate = 2.6 + Math.random() * .6;   // taps per second, she speeds up if you are ahead
      const au = AUTO ? setInterval(() => { if (!ALT || S.tap.you < 12) hit(); }, ALT ? 300 : 230) : 0;
      const iv = setInterval(() => {
        const t = (performance.now() - t0) / 1000; if (!S.tap) return;
        const lead = S.tap.you - S.tap.her; const target = herRate * t + clamp(lead * .55, 0, 6);
        if (S.tap.her < target) { S.tap.her++; SND.fx.don(.7); }
        S.tap.left = Math.max(0, sec - t);
        if (t >= sec) { clearInterval(iv); clearInterval(au); removeEventListener('keydown', kd); actEl.classList.remove('show'); actEl.innerHTML = '';
          const win = S.tap.you > S.tap.her; setTimeout(() => { S.tap = null; }, 1600); res(win); }
      }, 100);
    });
  }

  // cold street air: a gust that sweeps across your head (moves the sound and the cool)
  async function gust(from, to, sec, peak = 1) {
    const my = run, t0 = performance.now(), Wd = SND.loop('street');
    S.gust = { az: from, k: 0 };
    while (performance.now() - t0 < sec * 1000) {
      alive(my); const u = (performance.now() - t0) / (sec * 1000);
      S.gust.az = from + (to - from) * u; S.gust.k = peak * Math.sin(Math.PI * u);
      Wd?.at(S.gust.az, 1.3 - .6 * Math.sin(Math.PI * u)); await sleep(.05);
    }
    S.gust = null;
  }

  // ---------------------------------------------------------------- the story (you stand at her LEFT: her close lines come at your RIGHT ear)
  const FRONT = { az: 0, dist: .8 }, FRONT_R = { az: .35, dist: .6 }, RIGHT = { az: .8, dist: .5 }, RIGHT_NEAR = { az: 1.05, dist: .22 },
    RIGHT_EAR = { az: 1.35, dist: .12 }, FRONT_L = { az: -.35, dist: .4 };
  async function story() {
    const my = ++run;
    try {
      // 1 · the cold street, the automatic door opens: the arcade's warm noise — Hinata in a cap
      setStep(0); S.view = 'arrive';
      const street = SND.loop('street'); street?.set(.5, .4); S.cold = 1; S.inside = 0;
      await sleep(1.6); SND.fx.door(); await sleep(.4);
      const arcade = SND.loop('arcade'); arcade?.set(.42, 1.2); street?.set(.06, 1.2); S.cold = 0; S.inside = 1;   // inside: warm crowded air
      await sleep(1.2); alive(my);
      await say('h01', FRONT);
      await say('h02', FRONT);
      const a = await choice([['かわいい', 'It\'s cute'], ['バレバレ', 'Totally obvious']]);
      await say(a ? 'h03b' : 'h03a', FRONT);

      // 2 · taiko: tap as fast as you can
      setStep(1); await go(null, 'taiko'); await sleep(.3);
      await say('h04', RIGHT);
      S.youWon = await taikoGame(10); alive(my);
      SND.fx.cheer(S.youWon ? -.2 : .5); await sleep(.6);
      await say(S.youWon ? 'h05w' : 'h05l', RIGHT);

      // 3 · racing: the cabinet fans blow in your face (cool, gusting with the speed) while she yells at your right ear (warm)
      setStep(2); await go(null, 'race'); await sleep(.2);
      await say('h06', RIGHT);
      const eng = SND.loop('engine'); eng?.set(.5, .6); S.fans = 1;
      await sleep(1.6); alive(my);
      const b = await choice([['インから抜く', 'Overtake on the inside'], ['ひなたにぶつける', 'Ram Hinata']]);
      if (b) SND.fx.crash(.6);
      await say(b ? 'h07b' : 'h07a', RIGHT, { gain: 1.7 });
      await sleep(1.2); S.fans = 0; eng?.set(0, .8); setTimeout(() => SND.loop('engine')?.stop(), 1500);
      await say('h08', RIGHT_NEAR);

      // 4 · the crane game: hold to move the claw, let go to drop it — the first try slips, the second wins the cat
      setStep(3); await go(null, 'crane'); await sleep(.3);
      await say('h09', FRONT_R);
      for (let tryN = 1; tryN <= 2; tryN++) {
        const C = CR; C.tryN = tryN; C.label = true; C.won = false;
        SND.fx.coin(-.3);
        // hold: the claw glides along the rail toward the cat (eased), whirring; it sways a little when it stops
        await hold('🕹', 'アームを動かす（長押し）', 'Move the claw (press and hold)', 2.2, (down, k) => {
          C.x = CLAW.park.x + (CAT.pile.x - CLAW.park.x) * ease(k); if (down && Math.random() < .2) SND.fx.whirr(); });
        C.swing = .12; alive(my);
        SND.fx.drop(); await tween(C, 'y', grabY(), 1.3); alive(my);          // down
        SND.fx.clack(); await tween(C, 'closeK', 1, .35); C.swing = .05;
        C.carry = true; SND.fx.whirr();
        if (tryN === 1) {   // up — then the cat slips halfway and bounces back into the pile
          await tween(C, 'y', CLAW.park.y + 150, .9); alive(my);
          C.carry = false; C.swing = .18; SND.fx.plop();
          await tween(CR, 'catY', CAT.pile.y, .55, bounce); await tween(C, 'closeK', 0, .3); alive(my);
          await tween(C, 'y', CLAW.park.y, .6); await tween(C, 'x', CLAW.park.x, .9);
          await say('h10x', FRONT_R);
        } else {           // up, across to the prize chute, open: the cat drops in
          await tween(C, 'y', CLAW.park.y, 1.0); alive(my);
          await tween(C, 'x', CLAW.chute.x, 1.1); C.swing = .1; alive(my);
          C.carry = false; tween(C, 'closeK', 0, .3); SND.fx.plop();
          await tween(CR, 'catY', CLAW.chute.dropY, .6, (u) => u * u); CR.catGone = true; C.won = true;
          SND.fx.jingle(); await sleep(.6); await say('h10', FRONT_R);
        }
      }
      CR.label = false;

      // 5 · purikura: cramped — her cheek right next to your right ear; three flashes
      setStep(4); await go(null, 'booth'); arcade?.set(.18, .8); await sleep(.3);
      await say('h11', RIGHT_NEAR); S.cheek = 1;
      await action('✌️', 'ピース', 'Peace sign');
      for (let i = 3; i >= 1; i--) { S.shots = { n: i }; SND.fx.beep(i === 1 ? 1.4 : 1); await sleep(.75); }
      for (let i = 0; i < 3; i++) { S.shots = { n: 0 }; S.flash = 1; SND.fx.shutter(); await sleep(.7); }
      S.shots = null; alive(my);
      await say('h12', RIGHT_NEAR);
      const c = await choice([['ずっと友だち', 'Friends forever'], ['…ひなたが好き', '…I like you, Hinata']]);
      await say(c ? 'h13b' : 'h13a', RIGHT_NEAR);
      S.cheek = 0;

      // 6 · the street: the door, the cold on both ears, a hot can of corn soup on your LEFT cheek (cool + warm on one ear), a secret
      setStep(5); SND.fx.door(); await go(null, 'street'); arcade?.set(0, .8); street?.set(.55, .8); S.inside = 0; S.cold = 1;
      gust(-1.5, 1.5, 3.2, .8); await sleep(.8); alive(my);
      SND.fx.can(-.9);
      await say('h14', FRONT_L); S.can = 1; SND.fx.rustle(-1.2, .25);
      await sleep(1.2); alive(my);   // the can stays on your cheek a moment (cool both ears + hot on the left: DUAL)
      await action('🥫', '受け取る', 'Take it');
      S.can = 0; SND.fx.rustle(-.6, .4);   // in your hands now, away from your cheek
      await sleep(.4);
      await say('h15', RIGHT_EAR);
      S.end = await choice([['また来よう', 'Let\'s come again'], ['次は、ひなたの配信に出る', 'Next time I\'ll be on your stream']]);
      await say(S.end ? 'h16b' : 'h16a', FRONT);
      await sleep(1.6); S.fade = 1; street?.set(.15, 2); await sleep(3.2); alive(my); finish();
    } catch (e) { if (e.message !== 'stopped') console.error(e); }
  }

  // ---------------------------------------------------------------- per-frame state + thermal
  let inK = 0, coldK = 1, fanK = 0, cheekK = 0, canK = 0, fanPhase = 0;
  function update(dt) {
    S.t += dt; if (!S.started) return;
    S.clock += dt; S.lv = SND.voiceLevel();
    { const vt = talking ? 1 : 0; S.env += (vt - S.env) * (1 - Math.exp(-dt / (vt > S.env ? .06 : .3))); }   // talking envelope (shared/layers.js mouth)
    const ease = (cur, tgt, tau) => cur + (tgt - cur) * (1 - Math.exp(-dt / tau));
    inK = ease(inK, S.inside, 1.2); coldK = ease(coldK, S.cold, .6); cheekK = ease(cheekK, S.cheek, .5); canK = ease(canK, S.can, .25);
    // racing fans: a gusting blast whose strength follows the "speed" (two overlapping waves → uneven gusts)
    if (S.fans) { fanPhase += dt; fanK = .55 + .45 * Math.max(0, Math.sin(fanPhase * 2.7) * .6 + Math.sin(fanPhase * 5.3 + 1) * .4); }
    else fanK = ease(fanK, 0, .35);
    S.flash = Math.max(0, S.flash - dt * 2.5);
  }
  // Thermal, two layers (firmware DUAL: cool and heat independent on each ear).
  //  · VOICE: warm at the ear she speaks at, (0.1 + 0.8 × level) × distance (ear 1 / ≤ 50 cm 0.6 / further 0.28), × 0.5 in front.
  //  · AMBIENT: the arcade's warm crowded air (both warm 0.12) · the winter street (both cool 0.4) and its gusts (moving) · the racing
  //    cabinet's fans (both cool up to 0.35, gusting) · the photo booth: her cheek at your right ear (warm 0.35) · the hot can of corn
  //    soup on your left cheek (warm 0.6). Not heated: her excitement, the screens' light, the booth flash.
  function sources() {
    const out = [], add = (az, k, s, icon) => { if (s > .01) out.push({ az, k, s, icon }); };
    if (!S.started) return out;
    const P = S.pos;
    if (talking) add(P.az, 'h', (.1 + .8 * clamp(S.lv * 8)) * (P.dist < .15 ? 1 : P.dist <= .5 ? .6 : .28) * (Math.abs(P.az) < .5 ? .5 : 1), '💬');
    add(-1.5, 'h', .12 * inK, '🎮'); add(1.5, 'h', .12 * inK, '🎮');
    add(-1.5, 'c', .4 * coldK, '❄️'); add(1.5, 'c', .4 * coldK, '❄️');
    if (S.gust) add(S.gust.az, 'c', .35 * S.gust.k, '🌬');
    if (fanK > .02) add(0, 'c', .35 * fanK, '🌀');   // straight ahead: the az weights give both ears the full value
    if (cheekK > .02) add(1.25, 'h', .35 * cheekK, '🤍');
    if (canK > .02) add(-1.25, 'h', .6 * canK, '🥫');
    return out;
  }
  const ear = { Lc: 0, Lh: 0, Rc: 0, Rh: 0 };
  function thermal(dt) {
    const sum = { L: { h: 0, c: 0 }, R: { h: 0, c: 0 } }, src = sources();
    for (const s of src) { const sn = Math.sin(s.az), wL = clamp(1 - 1.2 * Math.max(0, sn)), wR = clamp(1 - 1.2 * Math.max(0, -sn)); sum.L[s.k] += s.s * wL; sum.R[s.k] += s.s * wR; }
    for (const e of ['L', 'R']) for (const k of ['c', 'h']) {
      const target = k === 'h' ? Math.min(.9, sum[e].h) : Math.min(1, sum[e].c), cur = ear[e + k];
      const tau = target > cur ? (k === 'h' ? .4 : .2) : (k === 'h' ? .5 : .35);
      ear[e + k] = cur + (target - cur) * (1 - Math.exp(-dt / tau));
    }
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
  function drawView(view, alpha, t) {
    if (drawClip(view, alpha)) return;
    const exact = !QS.has('stills') && Object.keys(CLIP).length > 0;   // with video the still must match the clips' frames exactly (no drift)
    const im = IMG[view];
    ctx.globalAlpha = alpha;
    if (!im) { ctx.fillStyle = '#0d1630'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; return; }
    const z = exact ? 1 : 1.02 + .008 * Math.sin(t * 1.1), dh = W * im.height / im.width;
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.drawImage(im, -W / 2, -dh / 2 + (exact ? 0 : 4 * Math.sin(t * .9)), W, dh); ctx.restore();
    ctx.globalAlpha = 1;
  }
  // ---------------------------------------------------------------- the crane game as layers (user: "make it with high-quality generated
  // assets"): a generated claw (closing = its prongs squeezed in code; the generated closed claw redrew the housing) + cat plushie (scripts/props.py), the plate without its painted claw and cat
  // (bg_crane_empty), animated here — eased moves, a cable from the ceiling, a pendulum sway, grab / lift / slip / prize chute.
  const PROP = {}; for (const n of ['prop_claw_open', 'prop_cat']) { const im = new Image(); im.onload = () => { PROP[n] = im; }; im.src = `media/art/${n}.webp?v=1`; }
  const CLAW = { w: 300, park: { x: 600, y: 150 }, ceiling: 118, chute: { x: 610, dropY: 1060 } };   // frame px (1920×1080), the glass box is x 15–720, y 115–750
  const CAT = { w: 215, pile: { x: 172, y: 628 } };
  const SPLIT = .635;   // housing bottom in prop_claw_open (measured): the prongs below it close by squeezing
  const GLASS = [15, 115, 720, 750];
  const freshCrane = () => ({ x: CLAW.park.x, y: CLAW.park.y, closeK: 0, carry: false, swing: 0, ang: 0, catX: CAT.pile.x, catY: CAT.pile.y, catGone: false, label: false, tryN: 0, won: false });
  let CR = freshCrane();
  const ease = (u) => (u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);
  const bounce = (u) => { const n = 7.5625, d = 2.75; if (u < 1 / d) return n * u * u; if (u < 2 / d) return n * (u -= 1.5 / d) * u + .75; if (u < 2.5 / d) return n * (u -= 2.25 / d) * u + .9375; return n * (u -= 2.625 / d) * u + .984375; };
  const tween = (o, k, to, sec, fn = ease) => new Promise((res) => { const from = o[k], t0 = performance.now();
    const step = () => { const u = Math.min(1, (performance.now() - t0) / (sec * 1000)); o[k] = from + (to - from) * fn(u); if (u < 1) requestAnimationFrame(step); else res(); }; requestAnimationFrame(step); });
  const clawH = () => (PROP.prop_claw_open ? CLAW.w * PROP.prop_claw_open.height / PROP.prop_claw_open.width : 260);
  const catH = () => (PROP.prop_cat ? CAT.w * PROP.prop_cat.height / PROP.prop_cat.width : 230);
  const HEAD = -.02;   // the housing stops just above the cat's top (× cat height); the prongs hang down round the head and clamp its sides
  const grabY = () => CR.catY - catH() / 2 + catH() * HEAD - clawH() * SPLIT;
  function drawCrane(t, dt) {
    const C = CR, ch = clawH(), cth = catH();
    C.swing *= Math.exp(-dt * 1.6); C.ang = C.swing * Math.sin(t * 5.2);
    if (C.carry) { C.catX = C.x; C.catY = C.y + ch * SPLIT - cth * HEAD + cth / 2; }
    ctx.save(); ctx.beginPath(); ctx.rect(GLASS[0], GLASS[1], GLASS[2] - GLASS[0], GLASS[3] - GLASS[1]); ctx.clip();
    const cat = PROP.prop_cat, claw = PROP.prop_claw_open;
    const drawCat = () => { if (cat && !C.catGone) { ctx.save(); ctx.translate(C.catX, C.catY); ctx.rotate(C.carry ? C.ang * .6 : 0); ctx.drawImage(cat, -CAT.w / 2, -cth / 2, CAT.w, cth); ctx.restore(); } };
    // cat → prongs → cable → housing. The prongs close by squeezing toward the centre, only to the head's width (prong span ≈ .9 × pw),
    // so they clamp its sides. v1 squeezed them onto the face (looked like wires on the cat); v2 hid them behind it (no grip seen)
    const ph = ch * SPLIT, pw = CLAW.w * (1 - .2 * C.closeK);
    const part = (which) => { if (!claw) return; const sh = claw.height * SPLIT; ctx.save(); ctx.translate(C.x, C.y); ctx.rotate(C.ang);
      if (which === 'top') ctx.drawImage(claw, 0, 0, claw.width, sh, -CLAW.w / 2, 0, CLAW.w, ph);
      else for (const [u0, u1] of which === 'mid' ? [[.4, .6]] : [[0, .4], [.6, 1]])   // the front-centre prong (x .47–.52) goes BEHIND the cat
        ctx.drawImage(claw, claw.width * u0, sh, claw.width * (u1 - u0), claw.height - sh, -pw / 2 + pw * u0, ph, pw * (u1 - u0), ch - ph);
      ctx.restore(); };
    part('mid'); drawCat(); part('side');
    ctx.strokeStyle = 'rgba(40,30,50,.85)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(C.x, CLAW.ceiling); ctx.lineTo(C.x, C.y); ctx.stroke();
    part('top');
    ctx.restore();
    if (C.label) label(`TRY ${C.tryN} / 2`, 370, 70, 52, '#9ff3ff');
    if (C.won) label('GET!', 370, 420, 110, '#ffd36b');
  }

  // ---------------------------------------------------------------- effects drawn on top of the layered still
  const speed = Array.from({ length: 70 }, () => ({ a: Math.random() * 7, r: Math.random(), v: .6 + Math.random() }));
  const steam = Array.from({ length: 24 }, () => ({ x: 0, y: 0, life: 0, v: 0 }));
  function label(txt, x, y, size = 64, col = '#fff') {
    ctx.save(); ctx.font = `800 ${size}px "Zen Maru Gothic", "Noto Sans JP", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = size / 6; ctx.strokeStyle = 'rgba(20,10,40,.85)'; ctx.strokeText(txt, x, y); ctx.fillStyle = col; ctx.fillText(txt, x, y); ctx.restore();
  }
  function draw(t, dt) {
    if (S.view !== viewB) { viewA = viewB; viewB = S.view; mix = 0; }
    clips();
    mix = Math.min(1, mix + dt / .6);
    if (mix < 1) drawView(viewA, 1, t);
    drawView(viewB, mix < 1 ? mix : 1, t);
    const lang = window.MoHeatSub?.lang || 'en', L3 = (ja, en, zh) => (lang === 'ja' ? ja : lang === 'zh' ? zh : en);
    if (S.tap) {   // the taiko scoreboard + a ring on every hit
      const flashK = S.tap.hitT ? Math.max(0, 1 - (performance.now() - S.tap.hitT) / 180) : 0;
      if (flashK > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(W * .3, H * .62, 20, W * .3, H * .62, 380);
        g.addColorStop(0, `rgba(255,140,60,${.5 * flashK})`); g.addColorStop(1, 'rgba(255,140,60,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore(); }
      label(`${L3('あなた', 'YOU', '你')} ${S.tap.you}  :  ${S.tap.her} ${L3('ひなた', 'HINATA', '日向')}`, W / 2, H * .13, 70, '#ffe28a');
      label(S.tap.left.toFixed(1), W / 2, H * .24, 48, '#fff');
    }
    if (fanK > .05) {   // racing: speed lines rushing out of the screen with the fans
      ctx.save(); ctx.strokeStyle = `rgba(220,240,255,${.35 * fanK})`; ctx.lineWidth = 3; ctx.beginPath();
      for (const s of speed) { s.r += dt * s.v * (.8 + fanK); if (s.r > 1) { s.r = .05; s.a = Math.random() * 7; } const r0 = 300 + s.r * 900, r1 = r0 + 120 * fanK;
        ctx.moveTo(W / 2 + Math.cos(s.a) * r0, H / 2 + Math.sin(s.a) * r0 * .6); ctx.lineTo(W / 2 + Math.cos(s.a) * r1, H / 2 + Math.sin(s.a) * r1 * .6); }
      ctx.stroke(); ctx.restore();
    }
    if (S.view === 'crane' || viewB === 'crane') drawCrane(t, dt);
    if (S.shots && S.shots.n) label(String(S.shots.n), W * .5, H * .3, 220, '#ffffff');
    if (S.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${S.flash * .85})`; ctx.fillRect(0, 0, W, H); }
    if (canK > .05) {   // steam from the hot can at the left edge
      ctx.save(); ctx.fillStyle = 'rgba(255,255,255,.18)';
      for (const p of steam) { if (p.life <= 0) { p.x = W * (.1 + Math.random() * .08); p.y = H * .55; p.v = 40 + Math.random() * 50; p.life = 1 + Math.random(); } p.life -= dt; p.y -= p.v * dt; p.x += 12 * Math.sin(t * 2 + p.v) * dt;
        ctx.globalAlpha = canK * Math.max(0, p.life) * .7; ctx.beginPath(); ctx.arc(p.x, p.y, 14 + 18 * clamp(1 - p.life / 2), 0, 7)   /* life is 1–2 s: v1 gave a negative radius */; ctx.fill(); }
      ctx.restore();
    }
    if (S.fade) { S.fadeA = Math.min(1, (S.fadeA || 0) + dt / 3); ctx.fillStyle = `rgba(10,6,24,${S.fadeA})`; ctx.fillRect(0, 0, W, H); }
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
      el.style.opacity = v.toFixed(2); el.style.background = `linear-gradient(to ${dir}, rgba(255,122,69,${(.55 * h / (v || 1)).toFixed(2)}), rgba(255,122,69,0)), linear-gradient(to ${dir}, rgba(79,179,255,${(.55 * c / (v || 1)).toFixed(2)}), rgba(79,179,255,0))`;
    }
    if (QS.has('auto') && cmd !== cmdLog[cmdLog.length - 1]?.[1]) cmdLog.push([+S.clock.toFixed(2), cmd]);
    if (!device.isConnected() || !$('sendOn').checked) return;
    const n = performance.now(); if (cmd !== lastSent && n - lastSendAt >= SEND_INTERVAL) { device.send(cmd); lastSent = cmd; lastSendAt = n; }
  }
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const PLACE = { arrive: 'arcade · entrance', taiko: 'arcade · taiko', race: 'arcade · racing', crane: 'arcade · crane game', booth: 'purikura booth', street: 'the street · winter night' };

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
  function finish() {   // back to this demo's own cover (user rule: never an "ended" card / next-demo button)
    S.started = false; run++; stopOutput();
    for (const k of ['arcade', 'street', 'engine']) SND.loop(k)?.stop();
    sub('', ''); actEl.classList.remove('show'); choiceEl.classList.remove('show');
    const c = $('cleared'); c.hidden = false;
    c.textContent = S.end ? '🎮 ひなたの、ひみつのファン · Hinata\'s secret fan' : '🎮 また、ふたりで。 · Again, just us two';
    $('startBtn').textContent = '↺ もう一度 · Play again'; $('intro').classList.remove('hidden');
    window.ARCADE.done = true;
  }
  function start() {
    SND.init(); SND.loadVoices(Object.keys(LINES));
    CR = freshCrane();
    S = fresh(); S.started = true; viewA = viewB = 'arrive'; mix = 1; cur = null; pending = null; inK = 0; coldK = 1; fanK = cheekK = canK = 0; $('cleared').hidden = true;
    $('intro').classList.add('hidden'); window.ARCADE.done = false;
    story();
  }
  $('startBtn').addEventListener('click', start);
  $('lrBtn').addEventListener('click', () => { SND.lrCheck(); const b = $('lrBtn'); b.textContent = '🎧 Left…'; setTimeout(() => { b.textContent = '🎧 …Right'; }, 900); setTimeout(() => { b.textContent = '🎧 Left / Right check'; }, 1900); });
  $('soundBtn').addEventListener('click', (e) => { SND.setMuted(!SND.isMuted()); e.target.textContent = SND.isMuted() ? '🔇' : '🔊'; });
  function drawCover() {   // the arrive still pushed right (she stands in the middle of it), title on the arcade on the left
    ctx.fillStyle = '#140c26'; ctx.fillRect(0, 0, W, H);
    const im = IMG.arrive; if (!im) return;
    ctx.drawImage(im, 640, 0, W, H);   // far enough right that her waving hand clears the title
    const g = ctx.createLinearGradient(560, 0, 1180, 0); g.addColorStop(0, 'rgba(20,12,38,1)'); g.addColorStop(1, 'rgba(20,12,38,0)'); ctx.fillStyle = g; ctx.fillRect(560, 0, 620, H);
  }
  window.ARCADE = { get S() { return S; }, get crane() { return CR; }, thermal: () => thermal(.05), both: () => both, log: cmdLog, done: false };
  setStep(0);
  if (QS.has('cover')) { document.body.classList.add('cover-only'); artReady.then(drawCover); return; }
  if (QS.has('autoplay') || AUTO) { const ac = SND.init(); if (ac.state === 'running') start(); else ac.resume().then(() => { if (ac.state === 'running' && !S.started) start(); }).catch(() => {}); }
  requestAnimationFrame(loop);
})();
