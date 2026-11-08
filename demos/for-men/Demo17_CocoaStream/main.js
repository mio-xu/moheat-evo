// 『ココアの、バレンタイン前夜』 — Cocoa (甘音ココア, original character), 22, sweet and a little teasing, runs a tiny patisserie.
// The night before Valentine's Day, after closing, snow outside: she lets you in, asks you to help her make chocolates, melts them
// in a bain-marie in front of you, whips cream with her hands over yours from behind, feeds you a heart cookie fresh from the oven,
// writes a message she won't let you see — and tells you, at your left ear, who it was for.
// DUAL thermal: her voice is always warm at the ear she speaks at; the snowy night at the door, the oven on your RIGHT (steady, then a
// hot rush when it opens), the bain-marie steam in front, her fu-fu (a cool puff), the fridge on your LEFT are the ambient layer —
// often on the same ear at once (oven-warm right + cool puff, fridge-cool left + her voice). Built on Demo31's main.js (Demo25's
// framework: choices / action / hold, thermal model, device panel); art = the layered standard (media/layers.js + shared/layers.js).
(() => {
  const $ = (id) => document.getElementById(id);
  const QS = new URLSearchParams(location.search);
  const SND = window.HTAudio, LINES = window.COCOA_LINES, W = 1920, H = 1080;
  const AUTO = QS.has('auto');   // testing: every choice / action answers itself after a moment (?alt = take the other branch)
  const ALT = QS.has('alt');
  const cv = $('scene'), ctx = cv.getContext('2d'), stage = $('stage');
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const sleep = (s) => new Promise((r) => setTimeout(r, s * 1000));

  // ---------------------------------------------------------------- art: one still per view (layered: shared/layers.js draws the live composite)
  const VIEWS = ['welcome', 'melt', 'whisk', 'cookie', 'piping', 'whisper', 'ending'];
  const IMG = {};
  const artReady = Promise.all(VIEWS.map((n) => new Promise((res) => { const im = new Image(); im.onload = () => { IMG[n] = im; res(); }; im.onerror = () => res(); im.src = `media/art/cocoa_${n}.jpg?v=1`; })));

  // ---------------------------------------------------------------- state
  const fresh = () => ({ started: false, t: 0, clock: 0, view: 'welcome', cold: 1, oven: 0, ovenBurst: 0, steam: 0, puff: 0, fridge: 0,
    cheek: 0, fade: 0, lv: 0, env: 0, pos: { az: 0, dist: .8 }, end: 0 });
  let S = fresh(), run = 0;
  const STEPS = [['welcome', '閉店後のお店で', 'After closing'], ['melt', 'チョコを溶かす', 'Melting chocolate'], ['whisk', '生クリーム', 'Whipped cream'],
    ['cookie', '焼きたてクッキー', 'Fresh cookies'], ['piping', 'メッセージ', 'The message']];
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
  async function story() {
    const my = ++run;
    try {
      // 1 · after closing: snowy wind at the door, the bell — she lets you in, the door shuts, the oven hums on your right
      setStep(0); S.view = 'welcome';
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
      setStep(1);
      await go(null, 'melt', () => {});
      SND.fx.chop(7); await sleep(2.2); alive(my);
      const bain = SND.loop('bain'); bain?.set(.4, 1); S.steam = 1;
      await say('c04', NEAR);
      setTimeout(() => { if (my === run) S.puff = 1; }, 2300); setTimeout(() => { if (my === run) S.puff = 1; }, 3000);   // her two fu-fu on the spoon
      await say('c05', SPOON);
      const b = await choice([['ちょうどいい', 'It\'s just right'], ['もっと甘くして', 'Make it sweeter']]);
      await say(b ? 'c06b' : 'c06a', NEAR);
      bain?.set(0, 1); S.steam = 0; alive(my); await sleep(.4);

      // 3 · the fridge on your left (a cold breath on the left ear), then she whisks with you from behind — at your right ear
      setStep(2);
      SND.fx.fridgeOpen(-1.35); S.fridge = 1; await sleep(.6);
      await say('c07', LEFT);
      SND.fx.fridgeClose(-1.35); S.fridge = 0;
      await go(null, 'whisk', () => { SND.fx.rustle(1.6, .25); });
      await say('c08', RIGHT_EAR);
      await whiskHold(6, () => { if (my === run) say('c09x', RIGHT_EAR).catch(() => {}); });
      alive(my); await sleep(.3);
      await say('c09', RIGHT_EAR);
      alive(my); await sleep(.5);

      // 4 · the oven timer: the door opens on your right (a hot rush), a heart cookie — fu-fu, cool — "aah"
      setStep(3);
      SND.fx.ding(1.35); await sleep(1.2);
      SND.fx.ovenOpen(1.35); S.ovenBurst = 1; setTimeout(() => { if (my === run) S.ovenBurst = 0; }, 3500);
      await go(null, 'cookie', () => {});
      await say('c10', NEAR);
      setTimeout(() => { if (my === run) S.puff = 1; }, 250); setTimeout(() => { if (my === run) S.puff = 1; }, 950);
      await say('c11', SPOON);
      await action('🍪', '食べる', 'Eat it', 15);
      SND.fx.crunch(); await sleep(.9); alive(my);
      await say('c12', NEAR);
      alive(my); await sleep(.4);

      // 5 · the message: close your eyes (or peek) — then her answer at your left ear, and midnight
      setStep(4);
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
      await sleep(2.5); S.fade = 1; oven?.set(.1, 2); shop?.set(.15, 2); await sleep(3.2); alive(my); finish();
    } catch (e) { if (e.message !== 'stopped') console.error(e); }
  }

  // ---------------------------------------------------------------- per-frame state + thermal
  let coldK = 1, ovenK = 0, burstK = 0, steamK = 0, puffK = 0, fridgeK = 0, cheekK = 0;
  function update(dt) {
    S.t += dt; if (!S.started) return;
    S.clock += dt; S.lv = SND.voiceLevel();
    { const vt = talking ? 1 : 0; S.env += (vt - S.env) * (1 - Math.exp(-dt / (vt > S.env ? .06 : .3))); }   // talking envelope (shared/layers.js mouth)
    const ease = (cur, tgt, up, down) => cur + (tgt - cur) * (1 - Math.exp(-dt / (tgt > cur ? up : down)));
    coldK = ease(coldK, S.cold, .3, 1.2); ovenK = ease(ovenK, S.oven, 2, 2); burstK = ease(burstK, S.ovenBurst, .25, 1.4);
    steamK = ease(steamK, S.steam, .8, 1); fridgeK = ease(fridgeK, S.fridge, .2, .6); cheekK = ease(cheekK, S.cheek, .5, .8);
    puffK = Math.max(0, puffK - dt * 1.6); if (S.puff) { puffK = 1; S.puff = 0; }
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
    if (talking) add(P.az, 'h', (.1 + .8 * clamp(S.lv * 8)) * (P.dist < .15 ? 1 : P.dist <= .5 ? .6 : .28) * (Math.abs(P.az) < .5 ? .5 : 1), '💬');
    if (coldK > .02) add(0, 'c', .4 * coldK, '❄️');
    if (ovenK > .02) add(1.35, 'h', .2 * ovenK + .5 * burstK, '♨️');
    if (steamK > .02) add(0, 'h', .2 * steamK, '🍫');
    if (puffK > .02) add(0, 'c', .3 * Math.sin(Math.PI * Math.min(1, puffK * 1.2)), '💨');
    if (fridgeK > .02) add(-1.35, 'c', .5 * fridgeK, '🧊');
    if (cheekK > .02) add(-1.3, 'h', .3 * cheekK, '🤍');
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
  let viewA = 'welcome', viewB = 'welcome', mix = 1;
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
    if (!im) { ctx.fillStyle = '#2a1a16'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; return; }
    const z = exact ? 1 : 1.02 + (LIVE() ? 0 : .008 * Math.sin(t * 1.1)), dh = W * im.height / im.width;
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.drawImage(im, -W / 2, -dh / 2 + (exact || LIVE() ? 0 : 4 * Math.sin(t * .9)), W, dh); ctx.restore();
    ctx.globalAlpha = 1;
  }
  function draw(t, dt) {
    if (S.view !== viewB) { viewA = viewB; viewB = S.view; mix = 0; }
    clips();
    mix = Math.min(1, mix + dt / .6);
    if (mix < 1) drawView(viewA, 1, t);
    drawView(viewB, mix < 1 ? mix : 1, t);
    if (S.fade) { S.fadeA = Math.min(1, (S.fadeA || 0) + dt / 3); ctx.fillStyle = `rgba(30,18,14,${S.fadeA})`; ctx.fillRect(0, 0, W, H); }
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
  const PLACE = { welcome: 'the shop · after closing', melt: 'the counter · bain-marie', whisk: 'the counter · she is behind you',
    cookie: 'the counter · oven on your right', piping: 'the counter · the message', whisper: 'the counter · at your ear', ending: 'the window · midnight' };

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
  function finish() {   // back to this demo's own cover (user: never an "ended / next demo" card)
    S.started = false; run++; stopOutput();
    for (const k of ['wind', 'shop', 'oven', 'bain', 'whisk']) SND.loop(k)?.stop();
    sub('', ''); actEl.classList.remove('show'); choiceEl.classList.remove('show');
    const c = $('cleared'); c.hidden = false;
    c.textContent = S.end ? '🍫 来年も、いっしょに。 · Next year too, together' : '🍫 いちばんおっきいの、あなたの。 · The biggest one is yours';
    $('startBtn').textContent = '↺ もう一度 · Play again'; $('intro').classList.remove('hidden');
    window.COCOA.done = true;
  }
  function start() {
    SND.init(); SND.loadVoices(Object.keys(LINES));
    S = fresh(); S.started = true; viewA = viewB = 'welcome'; mix = 1; cur = null; pending = null;
    coldK = 1; ovenK = burstK = steamK = puffK = fridgeK = cheekK = 0; $('cleared').hidden = true;
    $('intro').classList.add('hidden'); window.COCOA.done = false;
    story();
  }
  $('startBtn').addEventListener('click', start);
  $('lrBtn').addEventListener('click', () => { SND.lrCheck(); const b = $('lrBtn'); b.textContent = '🎧 Left…'; setTimeout(() => { b.textContent = '🎧 …Right'; }, 900); setTimeout(() => { b.textContent = '🎧 Left / Right check'; }, 1900); });
  $('soundBtn').addEventListener('click', (e) => { SND.setMuted(!SND.isMuted()); e.target.textContent = SND.isMuted() ? '🔇' : '🔊'; });
  function drawCover() {   // the ending still pushed right (she is on the right of it), the title on the warm shop on the left
    ctx.fillStyle = '#2a1a16'; ctx.fillRect(0, 0, W, H);
    const im = IMG.ending || IMG.welcome; if (!im) return;
    ctx.drawImage(im, 560, 0, W, H);
    const g = ctx.createLinearGradient(480, 0, 1100, 0); g.addColorStop(0, 'rgba(42,26,22,1)'); g.addColorStop(1, 'rgba(42,26,22,0)'); ctx.fillStyle = g; ctx.fillRect(480, 0, 620, H);
  }
  window.COCOA = { get S() { return S; }, thermal: () => thermal(.05), both: () => both, log: cmdLog, done: false };
  setStep(0);
  if (QS.has('cover')) { document.body.classList.add('cover-only'); artReady.then(drawCover); return; }
  if (QS.has('autoplay') || AUTO) { const ac = SND.init(); if (ac.state === 'running') start(); else ac.resume().then(() => { if (ac.state === 'running' && !S.started) start(); }).catch(() => {}); }
  requestAnimationFrame(loop);
})();
