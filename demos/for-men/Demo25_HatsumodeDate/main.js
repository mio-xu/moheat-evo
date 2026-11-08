// 『はじめての、初詣』 — Tsubaki (original character), 20, the sheltered young lady of an old ryokan family, on her very first crowded
// New Year shrine visit — with you. New Year's Eve at the torii (cold night wind on both ears), the countdown and the temple bell,
// the food stalls (she only has a black card; a hot amazake pressed to your right cheek), the bonfire on your left (steady warmth),
// the crowd pushes her to your right ear, the prayer (bell, two claps, hold your hands together), the omikuji (she draws 凶 for the
// first time in her life), a cold gust while you tie it — and she wraps her fur stole round you both and whispers at your left ear.
// DUAL thermal: her voice is always warm at the ear she speaks at; the night wind, gusts, the bonfire, the amazake cup and the stole
// are the ambient layer. Stills first (video last, user 2026-11-08): each view is a still with a slow breathing drift.
(() => {
  const $ = (id) => document.getElementById(id);
  const QS = new URLSearchParams(location.search);
  const SND = window.HTAudio, LINES = window.TSUBAKI_LINES, W = 1920, H = 1080;
  const AUTO = QS.has('auto');   // testing: every choice / action answers itself after a moment
  const cv = $('scene'), ctx = cv.getContext('2d'), stage = $('stage');
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const sleep = (s) => new Promise((r) => setTimeout(r, s * 1000));

  // ---------------------------------------------------------------- art: one still per view
  const VIEWS = ['torii', 'stall', 'amazake', 'fire', 'close', 'pray', 'omikuji', 'stole'];
  const IMG = {};
  const artReady = Promise.all(VIEWS.map((n) => new Promise((res) => { const im = new Image(); im.onload = () => { IMG[n] = im; res(); }; im.onerror = () => res(); im.src = `media/art/tsubaki_${n}.jpg?v=1`; })));

  // ---------------------------------------------------------------- state
  const fresh = () => ({ started: false, t: 0, clock: 0, view: 'torii', cold: 1, fire: 0, cup: 0, near: 0, nearAz: 1.2, stole: 0, gust: null,
    count: null, slip: null, fade: 0, lv: 0, pos: { az: 0, dist: .8 }, wish: 0 });
  let S = fresh(), run = 0;
  const STEPS = [['torii', '鳥居の前で', 'At the torii'], ['stall', '屋台と甘酒', 'Stalls & amazake'], ['fire', '焚き火', 'The bonfire'],
    ['pray', 'お参り', 'The prayer'], ['omikuji', 'おみくじ', 'The fortune']];
  function setStep(i) { $('steps').innerHTML = STEPS.map((s, k) => `<li class="${k < i ? 'done' : k === i ? 'now' : ''}">${s[1]} · <small>${s[2]}</small></li>`).join(''); }

  // ---------------------------------------------------------------- subtitles + voice
  const subJa = $('subJa'), subEn = $('subEn'), subs = $('subs');
  function sub(ja, en) { subJa.textContent = ja || ''; subEn.textContent = en || ''; subs.classList.toggle('show', !!ja); }
  let talking = 0;
  async function say(id, where = { az: 0, dist: .8 }, opt = {}) {
    const my = run; const [ja, en] = LINES[id]; S.pos = where;
    sub(ja, en); talking++;
    await SND.say(id, where, opt.gain ?? (where.dist < .2 ? 1.8 : 1.45));
    talking--; if (my !== run) throw new Error('stopped');
    await sleep(.35); sub('', '');
  }
  const alive = (my) => { if (my !== run) throw new Error('stopped'); };

  // ---------------------------------------------------------------- your turn: choices, actions, hold
  const choiceEl = $('choices'), actEl = $('act');
  function choice(opts, timeout = 20) {
    return new Promise((res) => {
      choiceEl.innerHTML = opts.map((o, i) => `<button class="ch" data-i="${i}"><b>${o[0]}</b><span>${o[1]}</span></button>`).join('');
      choiceEl.classList.add('show');
      const done = (i) => { clearTimeout(tm); clearTimeout(au); choiceEl.classList.remove('show'); choiceEl.innerHTML = ''; res(i); };
      choiceEl.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => done(+b.dataset.i)));
      const tm = setTimeout(() => done(0), timeout * 1000), au = AUTO ? setTimeout(() => done(Math.random() < .5 ? 0 : 1), 1200) : 0;
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
  // tap the shrine bell rope: each tap rings it, three taps fill the meter (auto after 12 s)
  function taps(icon, ja, en, n, onTap) {
    return new Promise((res) => {
      actEl.innerHTML = `<button class="act-btn hold"><i>${icon}</i><b>${ja}</b><span>${en}</span><em class="bar"><u></u></em></button>`; actEl.classList.add('show');
      const b = actEl.querySelector('button'), bar = b.querySelector('u'); let k = 0;
      const hit = () => { k++; onTap?.(k); bar.style.width = `${Math.min(1, k / n) * 100}%`; if (k >= n) { clearInterval(iv); clearTimeout(tm); setTimeout(() => { actEl.classList.remove('show'); actEl.innerHTML = ''; res(); }, 250); } };
      b.addEventListener('click', hit);
      const tm = setTimeout(() => { const f = setInterval(() => { if (k >= n) clearInterval(f); else hit(); }, 350); }, 12000);
      const iv = AUTO ? setInterval(() => { if (k < n) hit(); }, 500) : 0;
    });
  }

  // ---------------------------------------------------------------- weather: a cold gust that sweeps across your head
  async function gust(from, to, sec, peak = 1) {
    const my = run, t0 = performance.now(), W_ = SND.loop('wind');
    S.gust = { az: from, k: 0 };
    while (performance.now() - t0 < sec * 1000) {
      alive(my); const u = (performance.now() - t0) / (sec * 1000);
      S.gust.az = from + (to - from) * u; S.gust.k = peak * Math.sin(Math.PI * u);
      W_?.at(S.gust.az, 1.2 - .7 * Math.sin(Math.PI * u)); W_?.set(.25 + .55 * S.gust.k, .1);
      await sleep(.05);
    }
    S.gust = null; W_?.set(.25, .6);
  }

  // ---------------------------------------------------------------- the story
  const FRONT = { az: 0, dist: .8 }, CLOSE = { az: .15, dist: .45 }, RIGHT = { az: .8, dist: .5 }, LEFT = { az: -.9, dist: .5 },
    RIGHT_EAR = { az: 1.35, dist: .12 }, LEFT_EAR = { az: -1.35, dist: .12 }, CHEEK_R = { az: .9, dist: .28 };
  async function story() {
    const my = ++run;
    try {
      // 1 · the torii, New Year's Eve: wind and the crowd; she hurries in from the right on geta
      setStep(0); S.view = 'torii';
      const wind = SND.loop('wind'), crowd = SND.loop('crowd');
      wind?.set(.25, .8); crowd?.set(.32, 1.2);
      await sleep(.8); SND.fx.geta(1.3, .2, 9, .17); await sleep(1.5); alive(my);
      await say('t01', { az: .25, dist: .9 });
      await say('t02', FRONT);
      const a = await choice([['…すごく、綺麗だ', '…You look beautiful'], ['…寒くない？', '…Aren\'t you cold?']]);
      await say(a ? 't03b' : 't03a', FRONT);
      gust(-1.5, 1.5, 3.2, .8);   // a gust across the precinct
      await sleep(.5);
      await say('t04', CLOSE);
      for (let n = 5; n >= 1; n--) { alive(my); S.count = n; SND.fx.tick(0); await sleep(.85); }
      S.count = 0; SND.fx.cheer(); await sleep(.3); SND.fx.bell(.7);
      await choice([['「あけましておめでとう！」', 'Say "Happy New Year!"'], ['「今年もよろしく！」', 'Say "Here\'s to this year!"']]);   // two options, same reply (user)
      S.count = null;
      await say('t05', FRONT);
      setTimeout(() => { if (my === run) SND.fx.bell(.7); }, 2500);

      // 2 · the food stalls: she has no cash; a hot amazake at your right cheek
      setStep(1); SND.fx.geta(.3, .5, 6, .25); await go('t_torii_stall', 'stall'); await sleep(.4);
      await say('t07', CLOSE);
      const b = await choice([['僕がおごるよ', 'My treat'], ['…カード、使えるか聞いてみたら？', '…Ask if they take cards?']]);
      await say(b ? 't08b' : 't08a', CLOSE);
      SND.fx.coin(.3); await sleep(.8);
      await go('t_stall_amazake', 'amazake'); await sleep(.2);
      S.cup = 1; SND.fx.rustle(.9, .25);
      await say('t09', CHEEK_R);
      await sleep(.9); S.cup = .5;   // she eases it off your cheek a little (still in the picture)
      SND.fx.sip(.3, .45);
      await say('t10', { az: .3, dist: .45 });

      // 3 · the bonfire on your left; the crowd pushes her to your right ear
      setStep(2); const fire = SND.loop('fire'); fire?.at(-1.0, 1.4);
      await go('t_amazake_fire', 'fire', () => { S.cup = 0; S.fire = 1; fire?.set(.55, 1.2); }); await sleep(.4); alive(my);
      await say('t11', RIGHT);
      crowd?.set(.6, .5); crowd?.at(1.8, 1.2); SND.fx.rustle(1.4, .3); await sleep(.4);
      await go('t_fire_close', 'close'); S.near = 1; S.nearAz = 1.3;
      await say('t12', RIGHT_EAR);
      await hold('🤝', '支えてあげる（長押し）', 'Steady her (press and hold)', 2.8, (down, k) => { S.near = 1 + .4 * (down ? k : 0); });
      crowd?.set(.32, 1); crowd?.at(Math.PI, 3); S.near = 1;   // still pressed against you until she steps back

      // 4 · the prayer: coin, the bell rope, two bows two claps, hold your hands together
      setStep(3); await go('t_close_pray', 'pray', () => { S.near = 0; S.fire = 0; fire?.set(0, 1.5); SND.fx.geta(.4, -.6, 6, .3); }); fire?.stop(); await sleep(.2);
      await choice([['お賽銭を入れる', 'Toss in a coin'], ['五円玉を入れる', 'Toss a lucky 5-yen coin']]); SND.fx.coin(0); await sleep(.6);
      await taps('🔔', '鈴を鳴らす（タップ）', 'Ring the shrine bell (tap)', 3, () => SND.fx.suzu(0));
      await sleep(.4); for (let i = 0; i < 2; i++) { SND.fx.clap(-.8, .5); SND.fx.clap(0, .3); await sleep(.55); }
      crowd?.set(.12, 1.5); wind?.set(.12, 1.5); S.cold = .6;
      await hold('🙏', '手を合わせて、お願いする（長押し）', 'Hands together, make a wish (press and hold)', 3.5);
      crowd?.set(.3, 1.5); wind?.set(.25, 1.5); S.cold = 1; await sleep(.3);
      await say('t14', LEFT);
      S.wish = await choice([['…秘密', '…It\'s a secret'], ['椿さんと、また来られますように', 'That I can come here with you again']]);
      await say(S.wish ? 't15b' : 't15a', LEFT);

      // 5 · the omikuji: you draw 大吉, she draws 凶; tie it in the cold wind; she shares her stole
      setStep(4); await go('t_pray_omikuji', 'omikuji');
      await choice([['おみくじを引く', 'Draw a fortune'], ['二人で一緒に引く', 'Draw one together']]); SND.fx.shake(0, .4); await sleep(1.2); SND.fx.paper(0, .4);
      S.slip = { k: 0, text: '大吉', en: 'Excellent luck' }; await sleep(1.9); S.slip = null; alive(my);
      await say('t16', CLOSE);
      const c = await choice([['僕の大吉と、交換しよう', 'Swap with my great luck'], ['一緒に、結びに行こう', 'Let\'s tie it up together']]);
      await say(c ? 't17b' : 't17a', CLOSE);
      SND.fx.paper(-.3, .5); await sleep(.5);
      await gust(-1.6, 1.6, 3.6, 1);
      await go('t_omikuji_stole', 'stole', () => { SND.fx.rustle(-1.1, .25); S.stole = 1; });
      await say('t18', { az: -.7, dist: .3 });
      SND.fx.rustle(0, .15); await sleep(1);
      S.near = 1; S.nearAz = -1.3;
      await say(S.wish ? 't19b' : 't19a', LEFT_EAR);
      await sleep(2); S.fade = 1; crowd?.set(.15, 2); wind?.set(.1, 2); setTimeout(() => SND.fx.bell(.7), 600); await sleep(3.2); alive(my); finish();
    } catch (e) { if (e.message !== 'stopped') console.error(e); }
  }

  // ---------------------------------------------------------------- per-frame state + thermal
  let fireK = 0, cupK = 0, stoleK = 0, nearK = 0, coldK = 1;
  function update(dt) {
    S.t += dt; if (!S.started) return;
    S.clock += dt; S.lv = SND.voiceLevel();
    fireK += (S.fire - fireK) * (1 - Math.exp(-dt / 1.2));
    cupK += (S.cup - cupK) * (1 - Math.exp(-dt / .3)); coldK += (S.cold - coldK) * (1 - Math.exp(-dt / 1.5));
    stoleK += (S.stole - stoleK) * (1 - Math.exp(-dt / 1)); nearK += ((S.near ? S.near : 0) - nearK) * (1 - Math.exp(-dt / .4));
    if (S.slip) S.slip.k = Math.min(1, S.slip.k + dt / .5);
  }
  // Thermal, two layers (firmware DUAL: cool and heat independent on each ear — CLAUDE.md, 2026-11-08).
  //  · VOICE: a voice is warm. Her loudness (0.1 + 0.8 × level) warms the ear she speaks at — × 1 right at your ear, × 0.6 within
  //    50 cm, × 0.28 further; halved when she is straight in front.
  //  · AMBIENT (all real things next to your ears): the winter night air (mild cool on both ears — less on the side facing the
  //    bonfire, and almost none once the fur stole is round your neck), gusts that sweep across your head, the bonfire on your left,
  //    the hot amazake cup pressed to your right cheek, her face a hand's width from your ear, the fur stole round both of you
  //    (insulation + her body on your left: left warmer). Under the main hall's eaves the wind chill drops. Timed to the picture: each
  //    source starts when its transition clip starts (go(..., onStart)). Not heated: her blush, her burnt tongue, the steam of her
  //    own cup (45 cm away), the food stalls (metres away).
  function sources() {
    const out = [], add = (az, k, s, icon) => { if (s > .01) out.push({ az, k, s, icon }); };
    if (!S.started) return out;
    const P = S.pos;
    if (talking) add(P.az, 'h', (.1 + .8 * clamp(S.lv * 8)) * (P.dist < .15 ? 1 : P.dist <= .5 ? .6 : .28) * (Math.abs(P.az) < .5 ? .5 : 1), '💬');
    const air = .24 * coldK * (1 - .85 * stoleK);
    add(-1.5, 'c', air * (1 - .75 * fireK), '❄️'); add(1.5, 'c', air, '❄️');
    if (S.gust) add(S.gust.az, 'c', .6 * S.gust.k * (1 - .5 * stoleK), '🌬');
    if (fireK > .02) add(-1.1, 'h', .5 * fireK * (.88 + .12 * Math.sin(S.t * 7.3) * Math.sin(S.t * 3.1)), '🔥');
    if (cupK > .02) add(1.3, 'h', .65 * cupK, '🍵');
    if (nearK > .5) add(S.nearAz, 'h', .15 + .2 * clamp(nearK - 1, 0, .4) / .4, '🤍');
    if (stoleK > .02) { add(-1.5, 'h', .3 * stoleK, '🧣'); add(1.5, 'h', .12 * stoleK, '🧣'); }   // fur keeps the warmth in; she leans on your left
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
  let viewA = 'torii', viewB = 'torii', mix = 1;
  // ---- animation (handoff §4b, as Demo20 / 22): Seedance 2.5 Lite 1080p clips whose first and last frames are EXACTLY the stills
  // (scripts/prepare_video.py), so clips are only switched at a clip's end — a hard cut between identical frames, no ghosting.
  // One loop per view; one transition per cut, asked for with go(): it starts when the current loop reaches its end. ?stills = no video.
  const CLIP_NAMES = ['v_torii', 'v_stall', 'v_amazake', 'v_fire', 'v_close', 'v_pray', 'v_omikuji', 'v_stole',
    't_torii_stall', 't_stall_amazake', 't_amazake_fire', 't_fire_close', 't_close_pray', 't_pray_omikuji', 't_omikuji_stole'];
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
    if (!im) { ctx.fillStyle = '#140d14'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; return; }
    const z = exact ? 1 : 1.02 + (LIVE() ? 0 : .008 * Math.sin(t * 1.1)) + (view === 'close' ? .03 * clamp(nearK - 1, 0, .4) / .4 : 0), dh = W * im.height / im.width;
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.drawImage(im, -W / 2, -dh / 2 + (exact || LIVE() ? 0 : 4 * Math.sin(t * .9)), W, dh); ctx.restore();
    ctx.globalAlpha = 1;
  }
  const flakes = Array.from({ length: 90 }, () => ({ x: Math.random() * W, y: Math.random() * H, v: 40 + Math.random() * 70, r: 1.5 + Math.random() * 3.5, p: Math.random() * 6 }));
  const sparks = Array.from({ length: 26 }, () => ({ x: 0, y: H + 10, v: 0, life: 0 }));
  function draw(t, dt) {
    if (S.view !== viewB) { viewA = viewB; viewB = S.view; mix = 0; }
    clips();
    mix = Math.min(1, mix + dt / .6);
    if (mix < 1) drawView(viewA, 1, t);
    drawView(viewB, mix < 1 ? mix : 1, t);
    // light snow, pushed sideways by a gust
    const push = S.gust ? Math.sin(S.gust.az) * S.gust.k * 500 + S.gust.k * 300 : 30;
    ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath();
    for (const f of flakes) { f.y += f.v * dt; f.x += (push + 20 * Math.sin(t + f.p)) * dt; if (f.y > H) { f.y = -10; f.x = Math.random() * W; } if (f.x > W + 20) f.x -= W + 40; if (f.x < -20) f.x += W + 40; ctx.moveTo(f.x + f.r, f.y); ctx.arc(f.x, f.y, f.r, 0, 7); }
    ctx.fill();
    if (fireK > .05) {   // sparks rising from the bonfire on the left + a warm glow
      const g = ctx.createRadialGradient(0, H * .75, 50, 0, H * .75, 900); g.addColorStop(0, `rgba(255,150,70,${.22 * fireK})`); g.addColorStop(1, 'rgba(255,150,70,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = `rgba(255,190,110,${.85 * fireK})`;
      // embers: born in the fire, lifted by the hot air (the lift fades as they leave the plume), carried by the same wind as the
      // snow, flutter, cool and fade out (no popping in mid-air)
      for (const s of sparks) {
        if (s.life <= 0) { s.x = 80 + Math.random() * 380; s.y = H * (.9 + Math.random() * .08); s.v = 150 + Math.random() * 170; s.vx = 0; s.max = s.life = 1.2 + Math.random() * 1.6; }
        s.life -= dt; s.v *= Math.exp(-dt * .8); s.vx += (push * .6 - s.vx) * Math.min(1, dt * 1.5);
        s.y -= s.v * dt; s.x += (s.vx + 30 * Math.sin(t * 3 + s.max * 9)) * dt;
        ctx.globalAlpha = Math.max(0, Math.min(1, 1.6 * s.life / s.max, 8 * (s.max - s.life))); ctx.fillRect(s.x, s.y, 3, 3);
      }
      ctx.globalAlpha = 1;
    }
    if (S.count != null) {   // the countdown
      ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = S.count ? '700 190px "Shippori Mincho B1", serif' : '700 120px "Shippori Mincho B1", serif';
      ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 30; ctx.fillStyle = S.count ? 'rgba(255,248,236,.92)' : '#ffe3a6';
      ctx.fillText(S.count ? String(S.count) : '謹賀新年', W / 2, H * .2);
      if (!S.count) { ctx.font = '600 44px Inter, sans-serif'; ctx.fillText('Happy New Year', W / 2, H * .2 + 100); }
      ctx.restore();
    }
    if (S.slip) {   // your omikuji slip
      const k = S.slip.k, w = 230, h = 620, x = W / 2 - w / 2, y = H * .12 + (1 - k) * 60;
      ctx.save(); ctx.globalAlpha = k; ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 40; ctx.fillStyle = '#fbf6ea'; ctx.fillRect(x, y, w, h); ctx.shadowBlur = 0;
      ctx.strokeStyle = '#b8323a'; ctx.lineWidth = 6; ctx.strokeRect(x + 14, y + 14, w - 28, h - 28);
      ctx.fillStyle = '#b8323a'; ctx.textAlign = 'center'; ctx.font = '700 40px "Shippori Mincho B1", serif';
      ['御', '神', '籤'].forEach((ch, i) => ctx.fillText(ch, W / 2, y + 80 + i * 48));
      ctx.font = '800 120px "Shippori Mincho B1", serif'; ctx.fillText('大', W / 2, y + 330); ctx.fillText('吉', W / 2, y + 460);
      ctx.font = '600 26px Inter, sans-serif'; ctx.fillStyle = '#7a5a4a'; ctx.fillText(S.slip.en, W / 2, y + h - 40);
      ctx.restore();
    }
    if (S.fade) { S.fadeA = Math.min(1, (S.fadeA || 0) + dt / 3); ctx.fillStyle = `rgba(14,8,14,${S.fadeA})`; ctx.fillRect(0, 0, W, H); }
  }

  // ---------------------------------------------------------------- side panel + device (same protocol as every demo)
  const rc = $('radar').getContext('2d');
  function radar(src, th) {
    const cx = 240, cy = 220, R = 160; rc.clearRect(0, 0, 480, 420);
    rc.strokeStyle = 'rgba(255,255,255,.08)'; rc.lineWidth = 1.5; for (const r of [R * .5, R]) { rc.beginPath(); rc.arc(cx, cy, r, 0, 7); rc.stroke(); }
    rc.fillStyle = '#a38f97'; rc.font = '600 13px Inter'; rc.textAlign = 'center'; rc.fillText('front', cx, cy - R - 10); rc.fillText('L', cx - R - 18, cy + 5); rc.fillText('R', cx + R + 18, cy + 5);
    for (const [e, sx] of [['L', -1], ['R', 1]]) {
      rc.fillStyle = '#3a2830'; rc.beginPath(); rc.ellipse(cx + sx * 46, cy, 12, 24, 0, 0, 7); rc.fill();
      for (const [k, col, dy] of [['h', '255,122,69', -12], ['c', '79,179,255', 12]]) if (th[e + k] > .02) { rc.fillStyle = `rgba(${col},${.25 + .75 * th[e + k]})`; rc.beginPath(); rc.ellipse(cx + sx * 46, cy + dy, 11, 12, 0, 0, 7); rc.fill(); }
    }
    rc.fillStyle = '#4a3540'; rc.beginPath(); rc.arc(cx, cy, 40, 0, 7); rc.fill();
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
  const PLACE = { torii: 'the torii · New Year\'s Eve', stall: 'food stalls', amazake: 'food stalls · amazake', fire: 'the bonfire', close: 'the bonfire · crowded', pray: 'the main hall', omikuji: 'omikuji', stole: 'omikuji · cold wind' };

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
    S.started = false; run++; stopOutput(); S.fade = 0; S.fadeA = 0;   // the end fade must not stay over the cover (the loop draws the story while S.fade is set → black cover)
    for (const k of ['wind', 'crowd', 'fire']) SND.loop(k)?.stop();
    sub('', ''); actEl.classList.remove('show'); choiceEl.classList.remove('show');
    const c = $('cleared'); c.hidden = false;
    c.textContent = S.wish ? '🎍 来年も、その次の年も。 · Next year, and the year after' : '🎍 願いごとは、二人だけの秘密 · Your wishes stay a secret for two';
    $('startBtn').textContent = '↺ もう一度 · Play again'; $('intro').classList.remove('hidden');
    window.TSUBAKI.done = true;
  }
  function start() {
    SND.init(); SND.loadVoices(Object.keys(LINES));
    S = fresh(); S.started = true; viewA = viewB = 'torii'; mix = 1; cur = null; pending = null; fireK = cupK = stoleK = nearK = 0; coldK = 1; $('cleared').hidden = true;
    $('intro').classList.add('hidden'); window.TSUBAKI.done = false;
    story();
  }
  $('startBtn').addEventListener('click', start);
  $('lrBtn').addEventListener('click', () => { SND.lrCheck(); const b = $('lrBtn'); b.textContent = '🎧 Left…'; setTimeout(() => { b.textContent = '🎧 …Right'; }, 900); setTimeout(() => { b.textContent = '🎧 Left / Right check'; }, 1900); });
  $('soundBtn').addEventListener('click', (e) => { SND.setMuted(!SND.isMuted()); e.target.textContent = SND.isMuted() ? '🔇' : '🔊'; });
  function drawCover() {   // cover standard (shared/cover.js): the still with the face on the standard spot, the title in the shaded left column
    const im = IMG.torii || IMG.stole, C = window.MoHeatCover; if (!im) { ctx.fillStyle = '#140d14'; ctx.fillRect(0, 0, W, H); return; }
    const pic = () => ctx.drawImage(im, 460, 0, W, H);
    if (C) C.fit(ctx, { eye: [.819, .256], face: .27 }, pic, { tone: '#140d14', covers: [.24, 0, 1.24, 1] }); else pic();   // eye / face: where the face is in this drawing (tools/web/check_cover.py)
  }
  window.TSUBAKI = { get S() { return S; }, thermal: () => thermal(.05), both: () => both, log: cmdLog, done: false };
  setStep(0);
  if (QS.has('cover')) { document.body.classList.add('cover-only'); artReady.then(drawCover); return; }
  if (QS.has('autoplay') || AUTO) { const ac = SND.init(); if (ac.state === 'running') start(); else ac.resume().then(() => { if (ac.state === 'running' && !S.started) start(); }).catch(() => {}); }
  requestAnimationFrame(loop);
})();
