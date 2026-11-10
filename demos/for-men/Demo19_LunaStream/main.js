// 『ルナの、ひみつのカクテル』 — Luna (宵月ルナ, original character; the late-night streamer of the old live-stream demo), 25, cool and
// quietly teasing. After last orders in a small basement bar on a rainy night she is the secret bartender: she shakes a drink and presses
// the iced shaker to your right cheek, makes a cocktail from one word you give her and sets it alight (a blue flame in front of you —
// don't blink), closes the bar, sits on your left with two Irish coffees, toasts with you (say it), and tells you her real name at your
// left ear. Script: project/script.md (v1, approved).
// DUAL thermal shows off MoHeat Evo: the iced shaker cools your right cheek WHILE her whisper warms the same ear; the blue flame warms
// both ears from the front, then the door bangs open and the rainy draft cools the left (warm → cool in a second); the hot Irish coffee
// in front + her shoulder at your left + her whisper at the left ear. Built on Demo17's main.js (choices / action / hold, thermal model,
// device panel); art = the layered standard (media/layers.js + shared/layers.js).
(() => {
  const $ = (id) => document.getElementById(id);
  const QS = new URLSearchParams(location.search);
  const SND = window.HTAudio, LINES = window.LUNA_LINES, W = 1920, H = 1080;
  const AUTO = QS.has('auto');   // testing: every choice / action answers itself after a moment (?alt = take the other branch)
  const ALT = QS.has('alt');
  const cv = $('scene'), ctx = cv.getContext('2d'), stage = $('stage');
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const sleep = (s) => new Promise((r) => setTimeout(r, s * 1000));

  // ---------------------------------------------------------------- art: one still per view (layered: shared/layers.js draws the live composite)
  const VIEWS = ['counter', 'shake', 'lean', 'flame', 'sit', 'whisper'];
  const IMG = {};
  const artReady = Promise.all(VIEWS.map((n) => new Promise((res) => { const im = new Image(); im.onload = () => { IMG[n] = im; res(); }; im.onerror = () => res(); im.src = `media/art/luna_${n}.jpg?v=1`; })));
  const FLAME_AT = [.488, .612];   // the drink in her hand in the flame view (frame fraction) — the code flame / glow sits on it

  // ---------------------------------------------------------------- state
  const fresh = () => ({ started: false, t: 0, clock: 0, view: 'counter', door: 0, shaker: 0, flame: 0, coffee: 0, beside: 0, dim: 0,
    fade: 0, lv: 0, env: 0, pos: { az: 0, dist: .8 }, end: 0 });
  let S = fresh(), run = 0;
  const STEPS = [['counter', 'ラストオーダーのあと', 'After last orders'], ['shake', 'シェイカー', 'The shaker'], ['flame', 'あなたのためのカクテル', 'A cocktail for you'],
    ['sit', 'カウンターのこっち側', 'This side of the counter'], ['whisper', '本当の名前', 'Her real name']];
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

  // ---------------------------------------------------------------- your turn: choices, actions, hold (from Demo17)
  const choiceEl = $('choices'), actEl = $('act');
  function choice(opts, timeout = 20) {   // opts: [ja, en, data-voice?]
    return new Promise((res) => {
      choiceEl.innerHTML = opts.map((o, i) => `<button class="ch" data-i="${i}"${o[2] ? ` data-voice="${o[2]}"` : ''}><b>${o[0]}</b><span>${o[1]}</span></button>`).join('');
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
  async function story() {
    const my = ++run;
    try {
      // 1 · after last orders: jazz from the jukebox (right), rain behind the door (left) — the last guest leaves: the door opens (the
      //     rainy draft on your left), the bell, it shuts
      setStep(0); S.view = 'counter';
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
      setStep(1); await go(null, 'shake'); await sleep(.2);
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
      setStep(2);
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
      setStep(3); S.dim = .5; jazz?.set(.38, 1);
      await go(null, 'sit', () => { SND.fx.stool(); S.beside = 1; });
      await say('l11', LEFT);
      SND.fx.pour(-.4, 1.8); await sleep(1.6); S.coffee = 1; alive(my);
      await say('l12', LEFT);
      await say('l13', LEFT);
      const c = await choice([['「ふたりの夜に」', '"To our night"', 'ふたりの夜に|二人の夜に|ふたりのよる|our night|to us'], ['「ルナに」', '"To Luna"', 'ルナに|るなに|ルナ|to luna|luna']]);
      SND.fx.cheers(); await sleep(.9); alive(my);
      await say(c ? 'l14b' : 'l14a', LEFT);

      // 5 · her real name, at your left ear (her whisper warm on the left; the coffee still warm in your hands)
      setStep(4);
      await go(null, 'whisper', () => { SND.fx.rustle(-1.3, .2); S.coffee = .6; });
      await sleep(.3);
      await say('l15', LEFT_EAR);
      await say('l16', LEFT_EAR);
      S.end = await choice([['「つき」と呼ぶ', 'Call her "Tsuki"', 'つき|月|ツキ|tsuki|つきさん'], ['また来てもいい？', 'Can I come again?', 'またきてもいい|また来る|また来ていい|come again|again']]);
      await say(S.end ? 'l17b' : 'l17a', LEFT_EAR);
      await sleep(2.2); S.fade = 1; jazz?.set(.15, 2); rain?.set(.1, 2); await sleep(3.2); alive(my); finish();
    } catch (e) { if (e.message !== 'stopped') console.error(e); }
  }

  // ---------------------------------------------------------------- per-frame state + thermal
  let chillK = 0, doorK = 0, shakerK = 0, flameK = 0, coffeeK = 0, besideK = 0, dimK = 0;
  function update(dt) {
    S.t += dt; if (!S.started) return;
    S.clock += dt; S.lv = SND.voiceLevel(); S.vlv = (S.vlv || 0) + (S.lv - (S.vlv || 0)) * (1 - Math.exp(-dt / (S.lv > (S.vlv || 0) ? .05 : .8)));   // voice warmth = the speech envelope, not each syllable (no sub-second hot ↔ cold flicker, guide §3 节奏)
    { const vt = talking ? 1 : 0; S.env += (vt - S.env) * (1 - Math.exp(-dt / (vt > S.env ? .06 : .3))); }   // talking envelope (shared/layers.js mouth)
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
    if (talking) add(P.az, 'h', (.1 + .8 * clamp(S.vlv * 8)) * (P.dist < .15 ? 1 : P.dist <= .5 ? .6 : .28) * (Math.abs(P.az) < .5 ? .5 : 1), '💬');
    if (doorK > .02) { add(-1.3, 'c', .45 * doorK, '🌧'); add(1.3, 'c', .15 * doorK, '🌧'); }   // the draft fills the room: strong on the left (the door), faint on the right
    if (chillK > .02) add(0, 'c', .25 * chillK, '🧊');   // the frosted shaker shaken a hand's width in front of you
    if (shakerK > .02) add(1.35, 'c', .65 * shakerK, '🧊');
    if (flameK > .02) add(0, 'h', flameK * (.3 + .1 * Math.sin(S.t * 13) * Math.sin(S.t * 7.3)), '🔥');
    if (coffeeK > .02) add(0, 'h', .25 * coffeeK, '☕');
    if (besideK > .02) add(-1.3, 'h', .2 * besideK, '🤍');
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

  // ---------------------------------------------------------------- drawing: stills (layered), cross-fades, the flame, the dark
  let viewA = 'counter', viewB = 'counter', mix = 1;
  const go = (name, view, onStart) => { onStart?.(); S.view = view; return sleep(.6); };   // no video clips in this demo (§6.3): a cross-fade
  const LIVE = () => !!(window.MoHeatLayers && window.MoHeatLayers.live);
  function drawView(view, alpha, t) {
    const im = IMG[view];
    ctx.globalAlpha = alpha;
    if (!im) { ctx.fillStyle = '#0e1122'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; return; }
    const live = LIVE(), z = 1.02 + (live ? 0 : .008 * Math.sin(t * 1.1)), dh = W * im.height / im.width;   // layered: no page drift (guide §6.4)
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.drawImage(im, -W / 2, -dh / 2 + (live ? 0 : 4 * Math.sin(t * .9)), W, dh); ctx.restore();
    ctx.globalAlpha = 1;
  }
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
    if (S.view !== viewB) { viewA = viewB; viewB = S.view; mix = 0; }
    mix = Math.min(1, mix + dt / .6);
    if (mix < 1) drawView(viewA, 1, t);
    drawView(viewB, mix < 1 ? mix : 1, t);
    drawFlame(t);
    if (doorK > .02 && (S.view === 'counter' || S.view === 'flame')) {   // the cold blue rain light from the open door on the left
      const g = ctx.createLinearGradient(0, 0, W * .35, 0); g.addColorStop(0, `rgba(90,130,220,${.22 * doorK})`); g.addColorStop(1, 'rgba(90,130,220,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W * .35, H);
    }
    if (S.fade) { S.fadeA = Math.min(1, (S.fadeA || 0) + dt / 3); ctx.fillStyle = `rgba(14,17,34,${S.fadeA})`; ctx.fillRect(0, 0, W, H); }
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
  const PLACE = { counter: 'the counter · after last orders', shake: 'the counter · the shaker', lean: 'the counter · at your right cheek',
    flame: 'the counter · lights down', sit: 'the stool on your left', whisper: 'at your left ear' };

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
    S.started = false; S.fade = 0; S.fadeA = 0; run++; stopOutput();
    for (const k of ['rain', 'room', 'jazz', 'flame']) SND.loop(k)?.stop();
    sub('', ''); actEl.classList.remove('show'); choiceEl.classList.remove('show');
    const c = $('cleared'); c.hidden = false;
    c.textContent = S.end ? '🍸 いちばん端の席 · The end seat, kept for you' : '🌙 「つき」と呼んだ夜 · The night you called her Tsuki';
    $('startBtn').textContent = '↺ もう一度 · Play again'; $('intro').classList.remove('hidden');
    window.LUNA.done = true;
  }
  function start() {
    SND.init(); SND.loadVoices(Object.keys(LINES));
    S = fresh(); S.started = true; viewA = viewB = 'counter'; mix = 1;
    doorK = shakerK = flameK = coffeeK = besideK = dimK = 0; $('cleared').hidden = true;
    $('intro').classList.add('hidden'); window.LUNA.done = false;
    story();
  }
  $('startBtn').addEventListener('click', start);
  $('lrBtn').addEventListener('click', () => { SND.lrCheck(); const b = $('lrBtn'); b.textContent = '🎧 Left…'; setTimeout(() => { b.textContent = '🎧 …Right'; }, 900); setTimeout(() => { b.textContent = '🎧 Left / Right check'; }, 1900); });
  $('soundBtn').addEventListener('click', (e) => { SND.setMuted(!SND.isMuted()); e.target.textContent = SND.isMuted() ? '🔇' : '🔊'; });
  function drawCover() {}   // UI v2: the cover is the finished image (media/cover/, tools/web/covers.py)
  window.LUNA = { get S() { return S; }, thermal: () => thermal(.05), both: () => both, log: cmdLog, done: false };
  setStep(0);
  if (QS.has('cover')) { document.body.classList.add('cover-only'); artReady.then(drawCover); return; }
  if (QS.has('autoplay') || AUTO) { const ac = SND.init(); if (ac.state === 'running') start(); else ac.resume().then(() => { if (ac.state === 'running' && !S.started) start(); }).catch(() => {}); }
  requestAnimationFrame(loop);
})();
