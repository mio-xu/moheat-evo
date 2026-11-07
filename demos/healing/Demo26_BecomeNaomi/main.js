// 『ねこになった日』 — you ARE Naomi (the user's cat) for one winter Saturday: the headphones are her ears, the picture is her eyes
// (25 cm above the floor). Waking in the cat bed you turn your ears (the cat-ear radar) to find the kitchen; on the frosted windowsill
// the cold glass and the winter sun share your left ear; the open fridge pours cold air along the floor right into your face; you dive
// into the freshly dried laundry and burrow (warmer and more muffled the deeper you go) until she finds you; at night you lie on her
// chest. DUAL thermal (DEMO_DESIGN_GUIDE §3): the owner's voice is warm at the ear she speaks at, with its loudness; the bed, the glass,
// the sun, the fridge air, the laundry and her chest are the ambient layer. Turning your ears changes what you HEAR, never the heat.
// Stills first (video last): each view is a still with a slow drift.
(() => {
  const $ = (id) => document.getElementById(id);
  const QS = new URLSearchParams(location.search);
  const SND = window.NekoAudio, NA = window.NaomiAudio, LINES = window.NEKO_LINES, W = 1920, H = 1080;
  const cv = $('scene'), ctx = cv.getContext('2d'), stage = $('stage');
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const sleep = (s) => new Promise((r) => setTimeout(r, s * 1000));

  // ---------------------------------------------------------------- art
  const VIEWS = { wake: 'wake_bed', sill: 'window_sill', kitchen: 'kitchen_fridge', pile: 'laundry_pile', inside: 'laundry_inside', sofa: 'sofa_chest' };
  const IMG = {};
  const artReady = Promise.all(Object.entries(VIEWS).map(([k, n]) => new Promise((res) => { const im = new Image(); im.onload = () => { IMG[k] = im; res(); }; im.onerror = () => res(); im.src = `media/art/${n}.jpg?v=1`; })));

  // ---------------------------------------------------------------- state
  const KITCHEN_AZ = .7;   // the kitchen doorway, front right of the cat bed
  const fresh = () => ({ started: false, t: 0, clock: 0, view: 'wake', lv: 0, pos: { az: 0, dist: .8 },
    bed: 0, glass: 0, sun: 0, sunAll: 0, fridge: 0, leg: 0, pile: 0, lw: 0, puff: 0, chest: 0, ear: 0, fade: 0, open: 0,
    earL: -1.9, earR: 1.9, earsOn: false, zoom: { x: .5, y: .5, k: 1, tk: 1, tx: .5, ty: .5 }, spot: null, mist: 0, steam: 0, cloud: 0 });
  let S = fresh(), run = 0;
  const STEPS = [['ears', 'あさ・耳をすませる', 'Morning · listen'], ['sun', 'まどべのひなた', 'Sun on the windowsill'], ['fridge', 'れいぞうこ', 'The fridge'],
    ['laundry', 'ふわふわダイブ', 'The warm laundry'], ['night', 'よる・おなかのうえ', 'Night · on her chest']];
  function setStep(i) { $('steps').innerHTML = STEPS.map((s, k) => `<li class="${k < i ? 'done' : k === i ? 'now' : ''}">${s[1]} · <small>${s[2]}</small></li>`).join(''); }

  // ---------------------------------------------------------------- the cat-ear radar: where your ears point decides what you hear
  const g3 = (d) => Math.pow((1 + Math.cos(d)) / 2, 3);
  const focusOf = (az) => .3 + .7 * Math.max(g3(az - S.earL), g3(az - S.earR));
  function setEar(side, az) {
    if (side === 'L') S.earL = clamp(az, -2.8, -.05); else S.earR = clamp(az, .05, 2.8);
    $('earL').style.setProperty('--a', `${S.earL}rad`); $('earR').style.setProperty('--a', `${S.earR}rad`);
  }
  for (const side of ['L', 'R']) {
    const el = $('ear' + side);
    const move = (e) => { if (e.type === 'pointermove' && !el.hasPointerCapture(e.pointerId)) return; const r = el.getBoundingClientRect(); const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2); setEar(side, Math.atan2(dx, -dy)); e.preventDefault(); };
    el.addEventListener('pointerdown', (e) => { el.setPointerCapture(e.pointerId); move(e); });
    el.addEventListener('pointermove', move);
  }
  addEventListener('keydown', (e) => {
    if (!S.started) return;
    if (e.code === 'KeyA') setEar('L', S.earL - .2); if (e.code === 'KeyD') setEar('L', S.earL + .2);
    if (e.code === 'ArrowLeft') setEar('R', S.earR - .2); if (e.code === 'ArrowRight') setEar('R', S.earR + .2);
  });

  // ---------------------------------------------------------------- subtitles + voice
  const subJa = $('subJa'), subEn = $('subEn'), subs = $('subs');
  function sub(ja, en, muffled) { subJa.textContent = ja || ''; subEn.textContent = en || ''; subs.classList.toggle('show', !!ja); subs.classList.toggle('muffled', !!muffled); }
  let talking = 0;
  async function say(id, where = { az: 0, dist: .8 }, opt = {}) {
    const my = run; const [ja, en] = LINES[id]; S.pos = where;
    sub(ja, en, opt.muffled);
    talking++;
    await SND.say(id, where, opt.gain ?? (where.dist < .2 ? 1.8 : 1.45));
    talking--; if (my !== run) throw new Error('stopped');
    await sleep(.35); sub('', '');
  }
  function hint(ja, en, sec = 3) { sub(ja, en, true); return sleep(sec).then(() => sub('', '')); }

  // ---------------------------------------------------------------- your turn: choices, actions, hold, listen, tap the sunbeam
  const choiceEl = $('choices'), actEl = $('act');
  function choice(opts, timeout = 20) {
    return new Promise((res) => {
      choiceEl.innerHTML = opts.map((o, i) => `<button class="ch" data-i="${i}"><b>${o[0]}</b><span>${o[1]}</span></button>`).join('');
      choiceEl.classList.add('show');
      const done = (i) => { clearTimeout(tm); choiceEl.classList.remove('show'); choiceEl.innerHTML = ''; res(i); };
      choiceEl.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => done(+b.dataset.i)));
      const tm = setTimeout(() => done(0), timeout * 1000);
    });
  }
  function action(icon, ja, en, timeout = 20) {
    return new Promise((res) => {
      actEl.innerHTML = `<button class="act-btn"><i>${icon}</i><b>${ja}</b><span>${en}</span></button>`; actEl.classList.add('show');
      const done = () => { clearTimeout(tm); actEl.classList.remove('show'); actEl.innerHTML = ''; res(); };
      actEl.querySelector('button').addEventListener('click', done); const tm = setTimeout(done, timeout * 1000);
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
        if (down || n - t0 > 20000) k = Math.min(1, k + dt / sec); onTick?.(down, k, dt); bar.style.width = `${k * 100}%`;
        if (k >= 1) { removeEventListener('keydown', kd); removeEventListener('keyup', ku); actEl.classList.remove('show'); actEl.innerHTML = ''; res(); return; }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }
  // listen: turn the right ear to the kitchen (front right); the meter fills while it points there (by itself after 20 s)
  function listen(targetAz, sec = 1.4) {
    return new Promise((res) => {
      actEl.innerHTML = `<div class="act-btn aim"><i>👂</i><b>耳をうごかして、台所の音をさがす</b><span>Drag the ear dials to find the sound from the kitchen</span><em class="bar"><u></u></em></div>`; actEl.classList.add('show');
      const bar = actEl.querySelector('u'); let k = 0, last = performance.now(); const t0 = last; stage.classList.add('listening');
      const tick = () => {
        const n = performance.now(), dt = (n - last) / 1000; last = n;
        const on = Math.abs(S.earR - targetAz) < .35 || Math.abs(S.earL - targetAz) < .35;
        k = clamp(k + (on ? dt / sec : n - t0 > 20000 ? dt / 2 : -dt / 4)); bar.style.width = `${k * 100}%`;
        if (n - t0 > 20000 && !on) setEar('R', S.earR + (targetAz - S.earR) * Math.min(1, dt * 2));   // the ear turns by itself
        if (k >= 1) { stage.classList.remove('listening'); actEl.classList.remove('show'); actEl.innerHTML = ''; res(); return; }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }
  // the sunbeam: a patch of light on the floor; tap it (or wait) to hop into it
  function sunbeam(x, y, timeout = 15) {
    return new Promise((res) => {
      S.spot = { x, y, a: 0 };
      actEl.innerHTML = `<div class="act-btn aim"><i>☀</i><b>ひだまりをタップ</b><span>Tap the patch of sunlight to hop into it</span></div>`; actEl.classList.add('show');
      const tap = (e) => { const r = stage.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height; if (Math.hypot(px - x, (py - y) * .56) < .12) done(); };
      const done = () => { clearTimeout(tm); stage.removeEventListener('pointerdown', tap); actEl.classList.remove('show'); actEl.innerHTML = ''; S.spot = null; res(); };
      stage.addEventListener('pointerdown', tap); const tm = setTimeout(done, timeout * 1000);
    });
  }
  async function to(target, key, sec) { const a = S[key], t0 = performance.now(); while (performance.now() - t0 < sec * 1000) { S[key] = a + (target - a) * (performance.now() - t0) / (sec * 1000); await sleep(.04); } S[key] = target; }
  const zoomTo = (x, y, k) => { S.zoom.tx = x; S.zoom.ty = y; S.zoom.tk = k; };

  // ---------------------------------------------------------------- the story
  const KITCHEN = { az: KITCHEN_AZ, dist: 3 }, STANDING = { az: .35, dist: 1.2 }, LEFT_EAR = { az: -1.35, dist: .12 };
  async function story() {
    const my = ++run;
    const birds = NA.loop('birds'), room = NA.loop('room'), purr = NA.loop('purr');
    const kettle = SND.loop('kettle');
    try {
      // 1 · morning: curled up in the cat bed; birds at the window (left), the kitchen (front right)
      setStep(0); S.view = 'wake'; S.bed = 1; S.earsOn = true; $('ears').classList.add('on');
      birds.set(.5, -.9, 3); room.set(.25, 0, 2); kettle?.set(.25, 1); purr.set(.12, 0, .2);
      await sleep(1.6);
      await hint('（…いいにおい。台所から、何か聞こえる？）', '(…Something smells good. Is that a sound from the kitchen?)', 3);
      let clink = setInterval(() => SND.fx.spoon(KITCHEN_AZ), 3200);
      await listen(KITCHEN_AZ);
      clearInterval(clink); if (my !== run) throw new Error('stopped');
      SND.fx.can(KITCHEN_AZ); await sleep(.9);
      await say('k01', KITCHEN);
      SND.fx.slipper(KITCHEN_AZ, 2.2); await sleep(.6);
      await say('k02', { az: .5, dist: 1.6 });
      await action('🐾', 'おきる', 'Get up');
      NA.fx.step(0, .4, .4); purr.set(0); await to(0, 'bed', 1); kettle?.stop();
      // 2 · the windowsill: cold glass on the left, the winter sun from the upper left
      setStep(1); S.view = 'sill'; S.glass = 1; birds.set(.3, -1.3, 2); NA.fx.pounce(0, .4);
      to(1, 'sun', 1.5); S.sunAll = 1; purr.set(.18, 0, .15);
      await sleep(2.2);
      SND.fx.slipper(1.3, 2); await sleep(1.2);
      NA.fx.rub(.4, .25); await say('k03', { az: .6, dist: .5 });
      await sleep(.8);
      S.cloud = 1; to(.25, 'sun', 2.5); S.sunAll = 0; await sleep(1.6);
      await say('k04', { az: .8, dist: .9 });
      for (const [x, y] of [[.72, .78], [.88, .62]]) {
        await sunbeam(x, y);
        SND.fx.jump(); NA.fx.step(.3, .5, .3); zoomTo(x, clamp(y - .1, .3, .7), S.zoom.tk + .14);
        S.cloud = 0; SND.fx.sun(); S.glass = Math.max(0, S.glass - .5); S.sunAll = 1; to(.6, 'sun', 1); await sleep(2.2);
        if (x < .8) { S.cloud = 1; to(.2, 'sun', 2); S.sunAll = 0; await sleep(1.5); }
      }
      purr.set(.25, 0, .15); await sleep(1.5); purr.set(.1);
      // 3 · the fridge: cold air along the floor, right into a cat's face
      setStep(2); S.glass = 0; S.sun = 0; S.sunAll = 0; zoomTo(.5, .5, 1); S.view = 'kitchen'; birds.set(.08, -1.5, 4);
      await sleep(.8); SND.fx.fridgeOpen(); const fr = SND.loop('fridge'); fr?.set(.5, .3); to(1, 'fridge', 1.2); S.mist = 1;
      await sleep(1.8);
      await say('k05', STANDING);
      const peek = (await choice([['🧊 のぞきこむ', 'Peek inside'], ['🐾 足にすりすり', 'Rub against her leg']])) === 0;
      if (peek) { zoomTo(.3, .55, 1.25); to(1.5, 'fridge', 1); await sleep(1.2); await say('k06a', { az: .25, dist: .7 }); }
      else { zoomTo(.62, .6, 1.15); SND.fx.rustle(.45, .15); S.leg = 1; to(.55, 'fridge', 1); purr.set(.25, 0, .15); await sleep(.6); SND.fx.rustle(.35, .15); await say('k06b', { az: .3, dist: .8 }); }
      SND.fx.fridgeClose(); fr?.stop(); S.mist = 0; zoomTo(.5, .5, 1); await to(0, 'fridge', 1.2); S.leg = 0; purr.set(.08);
      // 4 · the warm laundry
      setStep(3); const dr = SND.loop('dryer'); dr?.set(.4, .5); await sleep(1.5);
      SND.fx.beep(1.4); dr?.set(0, .4); await sleep(1.2);
      SND.fx.slipper(1.2, 2); await sleep(1.4);
      S.view = 'pile'; SND.fx.dump(.15); S.steam = 1; S.pile = 1; await sleep(1.2);
      await say('k07', { az: .55, dist: .9 });
      SND.fx.slipper(1.6, 2.5);
      await action('🐾', 'とびこむ', 'Dive in');
      SND.fx.jump(); SND.fx.rustle(0, .2, .6); S.view = 'inside'; S.steam = 0; S.pile = 0; S.lw = .3; SND.setMuffle(.45); room.set(.15); dr?.stop();
      let rustleAt = 0;
      await hold('🧺', 'もぐる（長押し）', 'Burrow deeper (press and hold)', 4, (down, k, dt) => {
        S.lw = .3 + .5 * k; SND.setMuffle(.45 + .45 * k); S.deep = k;
        rustleAt -= dt; if (down && rustleAt <= 0) { SND.fx.rustle((Math.random() - .5) * 2, .15, .35); rustleAt = .7; }
      });
      purr.set(.3, 0, .1); await sleep(2);
      SND.fx.slipper(1.0, 1.8); await sleep(1.4);
      await say('k08', { az: .5, dist: 1.4 }, { muffled: true, gain: 1.6 });
      await sleep(.8); SND.fx.lift(-.6); S.open = 1; SND.setMuffle(0); S.puff = 1; to(.3, 'lw', 1.2); to(0, 'puff', 2.5); S.deep = 0;
      await sleep(.7);
      S.ear = 1; await say('k09', LEFT_EAR); S.ear = .3;
      await action('🐾', 'にゃっ', 'Meow back');
      NA.meow('ask', 0, .3); await sleep(.8); S.ear = 0;
      await say('k10', { az: -.5, dist: .4 });
      await sleep(.6);
      // 5 · night, on her chest
      setStep(4); S.fade = .9; await sleep(1.2); S.view = 'sofa'; S.lw = 0; S.open = 0; S.fade = 0; S.fadeA = 0;
      birds.set(0); room.set(.2); const night = SND.loop('night'); night?.set(.25, 1); const heart = SND.loop('heart'); heart?.set(.6, 1);
      to(1, 'chest', 1.5); purr.set(.2, 0, .1);
      await sleep(2.2);
      await say('k11', { az: 0, dist: .4 });
      const knead = (await choice([['🐾 ふみふみ', 'Knead her sweater'], ['😪 まるくなる', 'Curl up']])) === 0;
      if (knead) { for (let i = 0; i < 6; i++) { SND.fx.rustle(i % 2 ? .25 : -.25, .25, .3); await sleep(.42); } await say('k12a', { az: 0, dist: .35 }); }
      else { purr.set(.4, 0, .1); await sleep(1.2); await say('k12b', { az: -.2, dist: .3 }); }
      await sleep(.8); S.ear = 1; await say('k13', LEFT_EAR); S.ear = .3;
      purr.set(.3, 0, .1); await sleep(2.6); S.fade = 1; await sleep(3.4); finish(knead);
    } catch (e) { if (e.message !== 'stopped') console.error(e); }
  }

  // ---------------------------------------------------------------- per-frame state + thermal
  function update(dt) {
    S.t += dt; if (!S.started) return;
    S.clock += dt; S.lv = SND.voiceLevel(); NA.tick(dt);
    SND.setFocus(focusOf);
    const z = S.zoom, a = 1 - Math.exp(-dt / .5); z.k += (z.tk - z.k) * a; z.x += (z.tx - z.x) * a; z.y += (z.ty - z.y) * a;
  }
  // Thermal, two layers (firmware DUAL — CLAUDE.md, 2026-11-08). Every ambient source is something really at a cat's ear:
  //  · VOICE: the owner's loudness (0.1 + 0.8 × level) warms the ear she speaks at — × 1 at your ear, × 0.6 within 50 cm, × 0.28
  //    further; halved straight in front.
  //  · AMBIENT: the plush bed you are curled in (both, mild); the frosted window glass beside your left ear (cool) and the winter sun
  //    from the upper left (warm, on the same ear: DUAL); in the sunbeam both ears warm; the open fridge's cold air flowing along the
  //    floor (cool, front-left); her leg when you rub it (mild warm); the freshly dried laundry around you (warmer the deeper you
  //    burrow); room air when the towel is lifted (brief cool); her breath at your left ear; her chest under you at night.
  //  · Not used: eating breakfast, the closed window at night, the phone screen — none of them warms or cools an ear.
  function sources() {
    const out = [], add = (az, k, s, icon) => { if (s > .01) out.push({ az, k, s, icon }); };
    if (!S.started) return out;
    const P = S.pos;
    if (talking) add(P.az, 'h', (.1 + .8 * clamp(S.lv * 8)) * (P.dist < .15 ? 1 : P.dist <= .5 ? .6 : .28) * (Math.abs(P.az) < .5 ? .5 : 1), '💬');
    if (S.bed) { add(-1.5, 'h', .25 * S.bed, '🛏'); add(1.5, 'h', .25 * S.bed, '🛏'); }
    if (S.glass) add(-1.4, 'c', .45 * S.glass, '🪟');
    if (S.sun > .01) { add(-1.1, 'h', .45 * S.sun, '☀'); if (S.sunAll) { add(-1.5, 'h', .15 * S.sun, '☀'); add(1.5, 'h', .3 * S.sun, '☀'); } }
    if (S.fridge) { add(-.4, 'c', .45 * Math.min(S.fridge, 1) + .2 * Math.max(0, S.fridge - 1), '❄️'); add(.1, 'c', .25 * Math.min(S.fridge, 1) + .2 * Math.max(0, S.fridge - 1), '🌫'); }
    if (S.leg) add(.9, 'h', .2 * S.leg, '🦵');
    if (S.pile) add(0, 'h', .15 * S.pile, '♨');
    if (S.lw) { add(-1.5, 'h', S.lw, '🧺'); add(1.5, 'h', S.lw, '🧺'); }
    if (S.puff > .01) { add(-1.5, 'c', .2 * S.puff, '🌬'); add(1.5, 'c', .2 * S.puff, '🌬'); }
    if (S.ear) add(-1.4, 'h', .3 * S.ear, '🌬');
    if (S.chest) { add(-1.5, 'h', .35 * S.chest, '🤍'); add(1.5, 'h', .35 * S.chest, '🤍'); }
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

  // ---------------------------------------------------------------- drawing: stills with a slow drift, cross-fades, code-drawn light / mist / steam
  let viewA = 'wake', viewB = 'wake', mix = 1;
  function drawView(view, alpha, t) {
    const im = IMG[view]; ctx.globalAlpha = alpha;
    if (!im) { ctx.fillStyle = '#1e1625'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; return; }
    const z = S.zoom, breath = view === 'sofa' ? .006 * Math.sin(t * 1.6) : 0, k = (1.02 + .008 * Math.sin(t * 1.1) + breath) * (view === viewB ? z.k : 1);
    const cx = view === viewB ? z.x : .5, cy = view === viewB ? z.y : .5;
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(k, k); ctx.translate(-W * (cx - .5) * (1 - 1 / k) * 1.6, -H * (cy - .5) * (1 - 1 / k) * 1.6);
    ctx.drawImage(im, -W / 2, -H / 2 + 4 * Math.sin(t * .9), W, H); ctx.restore(); ctx.globalAlpha = 1;
  }
  const blobs = Array.from({ length: 26 }, () => ({ x: Math.random(), y: Math.random(), r: 60 + Math.random() * 120, v: .03 + Math.random() * .05 }));
  function draw(t, dt) {
    if (S.view !== viewB) { viewA = viewB; viewB = S.view; mix = 0; }
    mix = Math.min(1, mix + dt / .7);
    if (mix < 1) drawView(viewA, 1, t);
    drawView(viewB, mix < 1 ? mix : 1, t);
    if (S.view === 'sill' && S.cloud) { ctx.fillStyle = `rgba(70,90,140,${.18 * (1 - S.sun)})`; ctx.fillRect(0, 0, W, H); }
    if (S.spot) {   // the patch of sunlight to hop into
      S.spot.a = Math.min(1, S.spot.a + dt / .6); const x = S.spot.x * W, y = S.spot.y * H, p = .75 + .25 * Math.sin(t * 3);
      ctx.save(); ctx.translate(x, y); ctx.scale(1, .42); const g = ctx.createRadialGradient(0, 0, 10, 0, 0, 230);
      g.addColorStop(0, `rgba(255,236,170,${.75 * S.spot.a * p})`); g.addColorStop(.6, `rgba(255,210,120,${.35 * S.spot.a * p})`); g.addColorStop(1, 'rgba(255,200,110,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 230, 0, 7); ctx.fill(); ctx.restore();
    }
    if (S.view === 'sill' && S.sun > .3 && !S.cloud) { const g = ctx.createRadialGradient(0, 0, 50, 0, 0, 1300); g.addColorStop(0, `rgba(255,220,150,${.18 * S.sun})`); g.addColorStop(1, 'rgba(255,220,150,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    if (S.view === 'kitchen' && S.mist) {   // cold air spilling from the fridge along the floor towards you
      for (const b of blobs) { b.y += b.v * dt; if (b.y > 1) { b.y = 0; b.x = .2 + Math.random() * .3; } const x = W * (b.x + (b.y) * (b.x - .3) * .8), y = H * (.62 + .38 * b.y), r = b.r * (1 + b.y);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(220,240,255,${.16 * Math.sin(Math.PI * b.y) * Math.min(1, S.fridge)})`); g.addColorStop(1, 'rgba(220,240,255,0)'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r); }
    }
    if (S.view === 'pile' && S.steam) {   // warm wisps from the laundry
      for (const b of blobs.slice(0, 12)) { b.y -= b.v * dt * .6; if (b.y < 0) { b.y = 1; b.x = .4 + Math.random() * .3; } const x = W * (b.x + .03 * Math.sin(t + b.r)), y = H * (.25 + .45 * b.y), r = b.r * .8;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(255,245,235,${.12 * Math.sin(Math.PI * b.y)})`); g.addColorStop(1, 'rgba(255,245,235,0)'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r); }
    }
    if (S.view === 'inside') {   // deeper = darker and warmer; lifting the towel floods it with light
      const d = (S.deep || 0) * (1 - S.open), g = ctx.createRadialGradient(W / 2, H * .45, 200, W / 2, H * .45, 1100);
      g.addColorStop(0, `rgba(120,60,20,${.25 * d})`); g.addColorStop(1, `rgba(40,18,6,${.75 * d})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      if (S.open) { S.openA = Math.min(1, (S.openA || 0) + dt / .8); ctx.fillStyle = `rgba(255,250,240,${.45 * Math.sin(Math.PI * Math.min(1, S.openA)) })`; ctx.fillRect(0, 0, W, H); }
    }
    if (S.fade) { S.fadeA = Math.min(S.fade, (S.fadeA || 0) + dt / 1.2); ctx.fillStyle = `rgba(14,10,18,${S.fadeA})`; ctx.fillRect(0, 0, W, H); }
  }

  // ---------------------------------------------------------------- side panel + device (same protocol as every demo)
  const rc = $('radar').getContext('2d');
  function radar(src, th) {
    const cx = 240, cy = 220, R = 160; rc.clearRect(0, 0, 480, 420);
    rc.strokeStyle = 'rgba(255,255,255,.08)'; rc.lineWidth = 1.5; for (const r of [R * .5, R]) { rc.beginPath(); rc.arc(cx, cy, r, 0, 7); rc.stroke(); }
    rc.fillStyle = '#9b8aa3'; rc.font = '600 13px Inter'; rc.textAlign = 'center'; rc.fillText('front', cx, cy - R - 10); rc.fillText('L', cx - R - 18, cy + 5); rc.fillText('R', cx + R + 18, cy + 5);
    if (S.started) for (const [a, col] of [[S.earL, '255,170,205'], [S.earR, '255,170,205']]) {   // where your ears point
      rc.strokeStyle = `rgba(${col},.55)`; rc.lineWidth = 3; rc.beginPath(); rc.moveTo(cx + Math.sin(a) * 44, cy - Math.cos(a) * 44); rc.lineTo(cx + Math.sin(a) * R * .95, cy - Math.cos(a) * R * .95); rc.stroke();
    }
    for (const [e, sx] of [['L', -1], ['R', 1]]) {
      rc.fillStyle = '#30263a'; rc.beginPath(); rc.ellipse(cx + sx * 46, cy, 12, 24, 0, 0, 7); rc.fill();
      for (const [k, col, dy] of [['h', '255,122,69', -12], ['c', '79,179,255', 12]]) if (th[e + k] > .02) { rc.fillStyle = `rgba(${col},${.25 + .75 * th[e + k]})`; rc.beginPath(); rc.ellipse(cx + sx * 46, cy + dy, 11, 12, 0, 0, 7); rc.fill(); }
    }
    rc.fillStyle = '#43354d'; rc.beginPath(); rc.arc(cx, cy, 40, 0, 7); rc.fill(); rc.font = '30px sans-serif'; rc.textBaseline = 'middle'; rc.fillText('🐈', cx, cy + 2);
    rc.font = '26px sans-serif';
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
  let both = 0;
  function output(th, live) {
    const sc = Object.fromEntries(Object.entries(th).map(([k, v]) => [k, live && !tripped ? v * intensity : 0]));
    if ((sc.Lc > OFF && sc.Lh > OFF) || (sc.Rc > OFF && sc.Rh > OFF)) both++;
    for (const [k, [bar, val]] of Object.entries(meterEls)) { bar.style.width = `${sc[k] * 100}%`; val.textContent = Math.round(sc[k] * 100); }
    const cmd = command(sc); $('cmd').textContent = cmd;
    for (const [e, el] of [['L', $('glowL')], ['R', $('glowR')]]) {
      const c = sc[e + 'c'], h = sc[e + 'h'], v = Math.max(c, h), dir = e === 'L' ? 'right' : 'left';
      el.style.opacity = v.toFixed(2); el.style.background = `linear-gradient(to ${dir}, rgba(255,122,69,${(.55 * h / (v || 1)).toFixed(2)}), rgba(255,122,69,0)), linear-gradient(to ${dir}, rgba(79,179,255,${(.55 * c / (v || 1)).toFixed(2)}), rgba(79,179,255,0))`;
    }
    if (!device.isConnected() || !$('sendOn').checked) return;
    const n = performance.now(); if (cmd !== lastSent && n - lastSendAt >= SEND_INTERVAL) { device.send(cmd); lastSent = cmd; lastSendAt = n; }
  }
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const PLACE = { wake: 'cat bed · morning', sill: 'windowsill · winter sun', kitchen: 'kitchen · open fridge', pile: 'living room · laundry', inside: 'inside the laundry', sofa: 'sofa · night' };

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
  function stopSounds() { for (const k of ['kettle', 'fridge', 'dryer', 'heart', 'night']) SND.loop(k)?.stop(); SND.setMuffle?.(0); }
  function finish(knead) {
    S.started = false; run++; stopOutput(); stopSounds(); naLoops.forEach((L) => L.stop()); naLoops.length = 0;
    sub('', ''); $('ears').classList.remove('on');
    const c = $('cleared'); c.hidden = false; c.textContent = knead ? '🐾 ずっと、ここがいい。 · I want to stay right here, always.' : '😪 いちばんあったかい場所。 · The warmest place there is.';
    $('startBtn').textContent = '↺ もう一度 · Play again'; $('intro').classList.remove('hidden');
  }
  // NaomiAudio loops made during a run, so they can be stopped on finish / restart
  const naLoops = [], naLoop = NA.loop; NA.loop = (k) => { const L = naLoop(k); naLoops.push(L); return L; };
  function start() {
    SND.init(); SND.loadVoices(Object.keys(LINES));
    run++; naLoops.forEach((L) => L.stop()); naLoops.length = 0; stopSounds();
    S = fresh(); S.started = true; viewA = viewB = 'wake'; mix = 1; $('cleared').hidden = true; setEar('L', S.earL); setEar('R', S.earR);
    $('intro').classList.add('hidden');
    story();
  }
  $('startBtn').addEventListener('click', start);
  $('meowBtn').addEventListener('click', () => { if (!S.started) return; const k = ['mew', 'tiny', 'ask', 'trill'][Math.floor(Math.random() * 4)]; NA.meow(k, 0, .3); });
  $('lrBtn').addEventListener('click', () => { SND.lrCheck(); const b = $('lrBtn'); b.textContent = '🎧 Left…'; setTimeout(() => { b.textContent = '🎧 …Right'; }, 900); setTimeout(() => { b.textContent = '🎧 Left / Right check'; }, 1900); });
  $('soundBtn').addEventListener('click', (e) => { SND.setMuted(!SND.isMuted()); e.target.textContent = SND.isMuted() ? '🔇' : '🔊'; });
  function drawCover() {   // the windowsill mirrored: Naomi's reflection on the right, the warm room under the title on the left
    ctx.fillStyle = '#1e1625'; ctx.fillRect(0, 0, W, H);
    const im = IMG.sill; if (!im) return;
    ctx.save(); ctx.translate(W, 0); ctx.scale(-1, 1); ctx.drawImage(im, -120, 0, W + 120, H); ctx.restore();
  }
  window.NEKO = { get S() { return S; }, thermal: () => thermal(.05), both: () => both, focusOf, setEar };
  setStep(0); setEar('L', S.earL); setEar('R', S.earR);
  if (QS.has('cover')) { document.body.classList.add('cover-only'); artReady.then(drawCover); return; }
  if (QS.has('autoplay')) { const ac = SND.init(); if (ac.state === 'running') start(); else ac.resume().then(() => { if (ac.state === 'running' && !S.started) start(); }).catch(() => {}); }
  requestAnimationFrame(loop);
})();
