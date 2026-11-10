// 『なつまつり、ふたりで』 — Saku (original character), the viewer's childhood friend and heir of the shrine. A summer festival night:
// the crowded stalls (warm crowd, a hot griddle on the right), the quiet shrine steps where he fans you (the uchiwa's cool air sweeps
// around your head), shaved ice and his cold breath at your left ear, then fireworks — a line drowned by the boom, repeated at your
// right ear — and his confession. DUAL thermal: his voice is always warm at the ear he speaks at; the crowd, griddle, fan, ice and breath
// are the ambient layer. Picture = layers like Gaku's Demo27 (user 2026-11-08): empty plates + cut-out poses + drawn mouth / blink
// patches, composed by ../../shared/layers.js wherever this code draws a still (media/art/saku_<view>.jpg = the flat fallback). No video.
(() => {
  const $ = (id) => document.getElementById(id);
  const QS = new URLSearchParams(location.search);
  const AUTO = QS.has('auto');   // testing: every choice / action answers itself after a moment (?pick=0|1 fixes the branch)
  const SND = window.SKAudio, LINES = window.SAKU_LINES, W = 1920, H = 1080;
  const cv = $('scene'), ctx = cv.getContext('2d'), stage = $('stage');
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const sleep = (s) => new Promise((r) => setTimeout(r, s * 1000));

  // ---------------------------------------------------------------- art: one still per view
  const VIEWS = ['stalls', 'fan', 'kakigori', 'breath_L', 'whisper_R', 'fireworks'];
  const IMG = {};
  const artReady = Promise.all(VIEWS.map((n) => new Promise((res) => { const im = new Image(); im.onload = () => { IMG[n] = im; res(); }; im.onerror = () => res(); im.src = `media/art/saku_${n}.jpg?v=1`; })));

  // ---------------------------------------------------------------- state
  const fresh = () => ({ started: false, t: 0, clock: 0, view: 'stalls', crowd: 0, grill: null, fan: null, ice: 0, breath: 0, ear: null, flash: 0, flashC: '255,190,120', fw: false, fade: 0, lv: 0, env: 0, pos: { az: 0, dist: .8 } });
  let S = fresh(), run = 0;
  const STEPS = [['stalls', '屋台', 'The stalls'], ['steps', '石段', 'The shrine steps'], ['ice', 'かき氷', 'Shaved ice'], ['fireworks', '花火', 'Fireworks'], ['answer', '返事', 'Your answer']];
  function setStep(i) { if (i > 0 && S.started) S.restUntil = S.clock + 1.2; const el = $('steps'); if (el) el.innerHTML = STEPS.map((s, k) => `<li class="${k < i ? 'done' : k === i ? 'now' : ''}">${s[1]} · <small>${s[2]}</small></li>`).join(''); }
  const alive = (my) => { if (my !== run) throw new Error('stopped'); };

  // ---------------------------------------------------------------- subtitles + voice
  const subJa = $('subJa'), subEn = $('subEn'), subs = $('subs');
  function sub(ja, en, muffled) { subJa.textContent = ja || ''; subEn.textContent = en || ''; subs.classList.toggle('show', !!ja); subs.classList.toggle('muffled', !!muffled); }
  let talking = 0;
  async function say(id, where = { az: 0, dist: .8 }, opt = {}) {
    const my = run; const [ja, en] = LINES[id]; S.pos = where;
    if (opt.muffled) sub('（花火の音で、よく聞こえない…）', '(You can\'t hear him over the fireworks…)', true); else sub(ja, en);
    talking++;
    await SND.say(id, where, opt.gain ?? (where.dist < .2 ? 1.8 : where.dist > 1 ? 1.7 : 1.45));
    talking--; alive(my);
    await sleep(.35); sub('', '');
  }

  // ---------------------------------------------------------------- your turn: choices, actions, hold (as Demo29)
  const choiceEl = $('choices'), actEl = $('act');
  function choice(opts, timeout = 20) {
    return new Promise((res) => {
      choiceEl.innerHTML = opts.map((o, i) => `<button class="ch" data-i="${i}"${o[2] ? ` data-voice="${o[2]}"` : ''}><b>${o[0]}</b><span>${o[1]}</span></button>`).join('');
      choiceEl.classList.add('show');
      const done = (i) => { clearTimeout(tm); clearTimeout(au); choiceEl.classList.remove('show'); choiceEl.innerHTML = ''; res(i); };
      choiceEl.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => done(+b.dataset.i)));
      const tm = setTimeout(() => done(0), timeout * 1000), au = AUTO ? setTimeout(() => done(QS.has('pick') ? +QS.get('pick') : Math.random() < .5 ? 0 : 1), 1200) : 0;
    });
  }
  function action(icon, ja, en, voice, timeout = 20) {
    return new Promise((res) => {
      actEl.innerHTML = `<button class="act-btn"${voice ? ` data-voice="${voice}"` : ''}><i>${icon}</i><b>${ja}</b><span>${en}</span></button>`; actEl.classList.add('show');
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
        const n = performance.now(), dt = (n - last) / 1000; last = n; const on = down || AUTO || n - t0 > 18000;
        if (on) k = Math.min(1, k + dt / sec); onTick?.(on, k); bar.style.width = `${k * 100}%`;
        if (k >= 1) { removeEventListener('keydown', kd); removeEventListener('keyup', ku); actEl.classList.remove('show'); actEl.innerHTML = ''; res(); return; }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  // ---------------------------------------------------------------- the uchiwa fan + fireworks
  // fan: centre / span = where his strokes sweep (az), boost = how hard he fans; the strokes (≈2 per second) pulse the air.
  function fanOn(centre, span, boost = .8) { S.fan = { centre, span, boost, k: 0, ph: 0, az: centre - span, on: true }; SND.loop('fan'); }
  function fanOff() { if (S.fan) S.fan.on = false; }
  let fwTimer = 0;
  function firework(az = rnd(-.5, .6), big = 1) {
    SND.fx.firework(az, big);
    // light first, sound later: the burst lights the sky 0.4 s in, its boom (audio.js, 1.05 s) arrives 0.65 s after (≈ 220 m away)
    setTimeout(() => { if (!S.started) return; S.flash = big; S.flashC = ['255,190,120', '255,120,90', '180,200,255', '255,230,150', '200,150,255'][Math.floor(Math.random() * 5)]; }, 400);
  }
  const rnd = (a, b) => a + Math.random() * (b - a);
  function fireworksOn() { S.fw = true; clearInterval(fwTimer); fwTimer = setInterval(() => { if (S.fw && S.started && !talking) firework(rnd(-.5, .6), rnd(.5, .9)); }, 3400); }
  function fireworksOff() { S.fw = false; clearInterval(fwTimer); }

  // ---------------------------------------------------------------- the story
  const FRONT_FAR = { az: 0, dist: 1.4 }, CLOSE = { az: 0, dist: .45 }, BESIDE_L = { az: -.9, dist: .5 }, LEFT_EAR = { az: -1.35, dist: .12 }, RIGHT_EAR = { az: 1.35, dist: .12 };
  async function story() {
    const my = ++run;
    try {
      // 1 · the crowded stalls: warm crowd on both sides, the yakisoba griddle hissing on your right
      setStep(0); S.view = 'stalls';
      const crowd = SND.loop('crowd'); crowd?.set(.5, .6); S.crowd = 1;
      const grill = SND.loop('sizzle'); grill?.at(1.2, 1.1); grill?.set(.45, .6); S.grill = { az: 1.2, s: .3 };
      await sleep(1.4); alive(my);
      await say('k01', FRONT_FAR);
      SND.fx.steps(0, 3); await sleep(1.1); alive(my);
      await say('k02', CLOSE);
      await action('🤝', '手を取る', 'Take his hand', '手|手を取る|手をつなぐ|つなぐ|take his hand|hold hands|牵手|拉住');
      SND.fx.rustle(-.3, .4);
      // walking away together: the griddle slides past behind you and fades
      walkPast(my);
      await say('k03', { az: -.4, dist: .6 });
      SND.fx.steps(-.2, 6); crowd?.set(.12, 2); crowd?.tone(400); S.crowd = 0; await sleep(2.2); alive(my);
      grill?.stop(); S.grill = null;
      // 2 · the shrine steps: quiet, insects, he fans you
      setStep(1); S.view = 'fan'; const bugs = SND.loop('insects'); bugs?.set(.5, 1);
      await sleep(.8); alive(my);
      await say('k04', BESIDE_L);
      await say('k05', BESIDE_L);
      fanOn(-.9, .5, .7);   // starts on your left side, near him
      await hold('🎐', 'あおいでもらう（長押し）', 'Let him fan you (press and hold)', 4, (on) => { if (S.fan) S.fan.boost = on ? 1 : .55; });
      S.fan.centre = 0; S.fan.span = 1.3;   // now the breeze sweeps across your whole face, ear to ear
      await say('k06', BESIDE_L);
      const more = await choice([['もっと', 'More', 'もっと|もっとあおいで|more|keep going|再来点|多扇一会'], ['自分でやる', 'I\'ll do it myself', 'じぶん|自分で|自分でやる|myself|my own|我自己来|自己来']]);
      await say(more ? 'k07b' : 'k07a', BESIDE_L);
      await sleep(1.5); alive(my);
      fanOff();
      // 3 · shaved ice right in front of your face, then his cold breath at your right ear
      setStep(2); S.view = 'kakigori'; S.ice = 1; SND.fx.ice(0, .3); await sleep(.7); alive(my);
      await say('k08', CLOSE);
      const shy = await choice([['あーん', 'Say "aah"', 'あーん|あーんする|あーん して|aah|ah|open|啊|张嘴'], ['自分で食べる', 'I\'ll eat it myself', 'じぶんでたべる|自分で食べる|自分で|myself|eat it myself|我自己吃|自己吃']]);
      SND.fx.ice(0, .25); await sleep(.5); alive(my);
      await say(shy ? 'k09b' : 'k09a', CLOSE);
      await say('k10', { az: -.6, dist: .35 });
      S.view = 'breath_L'; S.ice = 0; SND.fx.rustle(-1.1, .2); await sleep(.8); alive(my);
      SND.fx.breath(-1.4, .06, 1.4); S.breath = 1; await sleep(1.5); S.breath = 0; alive(my);
      S.ear = { az: -1.4, s: 1 }; await say('k11', LEFT_EAR); S.ear = null;
      // 4 · fireworks: the first boom drowns his words; he repeats them at your left ear
      setStep(3); S.view = 'fireworks'; bugs?.set(.15, 1); fanOn(-1.1, .35, .4);
      firework(.1, 1); await sleep(3); alive(my);
      firework(-.2, 1.1);
      await sleep(.7); alive(my);
      await say('k12', BESIDE_L, { muffled: true, gain: .6 });
      await action('❓', 'え、なに？', 'What?', 'え|なに|なんて|え なに|what|pardon|什么|你说什么');
      fanOff(); S.view = 'whisper_R'; SND.fx.rustle(1.2, .25); await sleep(.6); alive(my);
      S.ear = { az: 1.4, s: 1 }; await say('k13', RIGHT_EAR); S.ear = null;
      fireworksOn();
      // 5 · your answer
      setStep(4); await sleep(1.2); alive(my); S.view = 'fireworks';
      await say('k14', { az: -.6, dist: .5 });
      const yes = await choice([['来年も、一緒に見たい', 'I want to watch them with you next year too', 'らいねん|来年|来年も|next year|明年|明年也'], ['ずっと、隣にいて', 'Stay beside me forever', 'ずっと|隣|となり|forever|always|beside me|一直|永远']]);
      fireworksOff(); S.view = 'whisper_R'; SND.fx.rustle(1.2, .25); await sleep(.7); alive(my);
      S.ear = { az: 1.4, s: 1 }; await say(yes ? 'k15b' : 'k15a', RIGHT_EAR); S.ear = { az: 1.4, s: .4 };
      await sleep(.6); S.view = 'fireworks'; firework(0, 1.3); await sleep(3.2); alive(my);
      S.ear = null; S.fade = 1; crowd?.set(.05, 1.5); bugs?.set(.3, 1.5); await sleep(3.4); finish(yes);
    } catch (e) { if (e.message !== 'stopped') console.error(e); }
  }
  async function walkPast(my) {   // the griddle: right → behind-right, fading as you walk away
    const t0 = performance.now();
    while (S.grill && performance.now() - t0 < 6000 && my === run) {
      const u = (performance.now() - t0) / 6000; S.grill.az = 1.2 + 1.4 * u; S.grill.s = .3 * (1 - u);
      SND.loop('sizzle')?.at(S.grill.az, 1.1 + 2 * u); SND.loop('sizzle')?.set(.45 * (1 - u), .1); await sleep(.05);
    }
  }

  // ---------------------------------------------------------------- per-frame state + thermal
  function update(dt) {
    S.t += dt; if (!S.started) return;
    S.clock += dt; S.lv = SND.voiceLevel(); S.vlv = (S.vlv || 0) + (S.lv - (S.vlv || 0)) * (1 - Math.exp(-dt / (S.lv > (S.vlv || 0) ? .05 : .8)));   // voice warmth = the speech envelope, not each syllable (no sub-second hot ↔ cold flicker, guide §3 节奏)
    const vt = talking ? clamp((S.lv - .005) / .06) : 0;   // voice envelope (attack 0.06 s, release 0.3 s) — the mouth patches follow it
    S.env += (vt - S.env) * (1 - Math.exp(-dt / (vt > S.env ? .06 : .3)));
    const f = S.fan;
    if (f) {
      f.k = f.on ? Math.min(1, f.k + dt / .5) : Math.max(0, f.k - dt / .6);
      f.ph += dt; f.az = f.centre + f.span * Math.sin(f.ph * 2 * Math.PI / 5);
      f.stroke = .5 + .5 * Math.sin(f.ph * 2 * Math.PI * 1.8);
      const L = SND.loop('fan'); L?.at(f.az, .3); L?.set(.35 * f.k * f.boost * f.stroke, .03);
      if (!f.on && f.k <= 0) { SND.loop('fan')?.stop(); S.fan = null; }
    }
    S.flash = Math.max(0, S.flash - dt / 1.4);
  }
  // Thermal, two layers (firmware DUAL: cool and heat independent on each ear — CLAUDE.md, 2026-11-08).
  //  · VOICE: a voice is warm. His loudness (0.1 + 0.8 × level) warms the ear he speaks at — × 1 right at your ear, × 0.6 within
  //    50 cm, × 0.28 further; halved when he is straight in front.
  //  · AMBIENT: the summer-night crowd (mild warmth both sides), the yakisoba griddle (right, ≈1 m, slides behind you as you walk on),
  //    the uchiwa fan (real moving air: cool on the side it sweeps, pulsing with his strokes), the cup of shaved ice right in front of
  //    your face, his cold breath after the ice (left ear), his warm breath when he whispers. Fireworks are far away: sound and light only.
  //    Holding hands: no heat (not at your ear).
  function sources() {
    const out = [], add = (az, k, s, icon) => { if (s > .01) out.push({ az, k, s, icon }); };
    if (!S.started) return out;
    const P = S.pos;
    if (talking) add(P.az, 'h', (.1 + .8 * clamp(S.vlv * 8)) * (P.dist < .15 ? 1 : P.dist <= .5 ? .6 : .28) * (Math.abs(P.az) < .5 ? .5 : 1), '💬');
    if (S.crowd) { add(-1.5, 'h', .15 * S.crowd, '🏮'); add(1.5, 'h', .15 * S.crowd, '🏮'); }
    if (S.grill) add(S.grill.az, 'h', S.grill.s, '🔥');
    if (S.fan) add(S.fan.az, 'c', S.fan.k * S.fan.boost * (.3 + .3 * S.fan.stroke), '🎐');
    if (S.ice) add(0, 'c', .22 * S.ice, '🍧');
    if (S.breath) add(-1.45, 'c', .6 * S.breath, '🌬');
    if (S.ear) add(S.ear.az, 'h', .25 * S.ear.s, '🤍');
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

  // ---------------------------------------------------------------- drawing: stills with a slow breathing drift, cross-fades, light
  // layered stills (demos/shared/layers.js) breathe / sway on their own: no page zoom / bob on top (the background would breathe with her)
  const LIVE = () => !!(window.MoHeatLayers && window.MoHeatLayers.live);
  let viewA = 'stalls', viewB = 'stalls', mix = 1;
  function drawView(view, alpha, t) {
    const im = IMG[view]; ctx.globalAlpha = alpha;
    if (!im) { ctx.fillStyle = '#120f1f'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; return; }
    const z = 1.02 + (LIVE() ? 0 : .008 * Math.sin(t * 1.1)), dh = W * im.height / im.width;
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.drawImage(im, -W / 2, -dh / 2 + (LIVE() ? 0 : 4 * Math.sin(t * .9)), W, dh); ctx.restore();
    ctx.globalAlpha = 1;
  }
  addEventListener('moheat:pause', (e) => { if (e.detail && S.started && (mix < 1 || S.view !== viewB)) { viewA = viewB = S.view; mix = 1; try { draw(S.t ?? 0, 0); } catch {} } });   // paused mid cross-fade: show the new view only (shell.js moheat:pause, Demo21 2026-11-11)
  function draw(t, dt) {
    if (S.view !== viewB) { viewA = viewB; viewB = S.view; mix = 0; }
    mix = Math.min(1, mix + dt / .6);
    if (mix < 1) drawView(viewA, 1, t);
    drawView(viewB, mix < 1 ? mix : 1, t);
    if (S.view === 'stalls') {   // lantern light breathing
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,140,60,${.035 + .02 * Math.sin(t * 7) * Math.sin(t * 2.3)})`; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over';
    }
    if (S.fan && S.fan.k > 0) {   // a faint cool haze on the side the fan's breeze reaches
      const x = W / 2 + Math.sin(S.fan.az) * W * .5, g = ctx.createRadialGradient(x, H * .45, 40, x, H * .45, 650);
      g.addColorStop(0, `rgba(160,215,255,${.12 * S.fan.k * S.fan.boost * (.5 + .5 * S.fan.stroke)})`); g.addColorStop(1, 'rgba(160,215,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    if (S.flash > 0) {   // fireworks light up the whole scene for a moment
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(W * .7, 0, 50, W * .7, 0, W); g.addColorStop(0, `rgba(${S.flashC},${.32 * S.flash})`); g.addColorStop(1, `rgba(${S.flashC},${.06 * S.flash})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over';
    }
    if (S.fade) { S.fadeA = Math.min(1, (S.fadeA || 0) + dt / 3); ctx.fillStyle = `rgba(10,8,20,${S.fadeA})`; ctx.fillRect(0, 0, W, H); }
  }

  // ---------------------------------------------------------------- side panel + device (same protocol as every demo)
  const rc = $('radar').getContext('2d');
  function radar(src, th) {
    const cx = 240, cy = 220, R = 160; rc.clearRect(0, 0, 480, 420);
    rc.strokeStyle = 'rgba(255,255,255,.08)'; rc.lineWidth = 1.5; for (const r of [R * .5, R]) { rc.beginPath(); rc.arc(cx, cy, r, 0, 7); rc.stroke(); }
    rc.fillStyle = '#8f87a3'; rc.font = '600 13px Inter'; rc.textAlign = 'center'; rc.fillText('front', cx, cy - R - 10); rc.fillText('L', cx - R - 18, cy + 5); rc.fillText('R', cx + R + 18, cy + 5);
    for (const [e, sx] of [['L', -1], ['R', 1]]) {
      rc.fillStyle = '#28243a'; rc.beginPath(); rc.ellipse(cx + sx * 46, cy, 12, 24, 0, 0, 7); rc.fill();
      for (const [k, col, dy] of [['h', '255,122,69', -12], ['c', '79,179,255', 12]]) if (th[e + k] > .02) { rc.fillStyle = `rgba(${col},${.25 + .75 * th[e + k]})`; rc.beginPath(); rc.ellipse(cx + sx * 46, cy + dy, 11, 12, 0, 0, 7); rc.fill(); }
    }
    rc.fillStyle = '#383250'; rc.beginPath(); rc.arc(cx, cy, 40, 0, 7); rc.fill();
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
  const cmdLog = [];
  function output(th, live) {
    const sc = Object.fromEntries(Object.entries(th).map(([k, v]) => [k, live && !tripped ? v * intensity : 0]));
    for (const [k, [bar, val]] of Object.entries(meterEls)) { bar.style.width = `${sc[k] * 100}%`; val.textContent = Math.round(sc[k] * 100); }
    const cmd = command(sc); $('cmd').textContent = cmd;
    for (const [e, el] of [['L', $('glowL')], ['R', $('glowR')]]) {
      const c = sc[e + 'c'], h = sc[e + 'h'], v = Math.max(c, h), dir = e === 'L' ? 'right' : 'left';
      el.style.opacity = v.toFixed(2); el.style.background = c > .03 && h > .03 ? `linear-gradient(to bottom, rgba(255,122,69,${(.6 * Math.sqrt(h / v)).toFixed(2)}) 0 38%, rgba(79,179,255,${(.6 * Math.sqrt(c / v)).toFixed(2)}) 62% 100%)` : `linear-gradient(to ${dir}, rgba(255,122,69,${(.55 * h / (v || 1)).toFixed(2)}), rgba(255,122,69,0)), linear-gradient(to ${dir}, rgba(79,179,255,${(.55 * c / (v || 1)).toFixed(2)}), rgba(79,179,255,0))`;   // cool AND heat on one ear: warm on top, cool below, blended over the middle; the .glow mask fades it inward (layered, they read as grey: Demo19 2026-11-10)
    }
    if (AUTO && cmd !== cmdLog[cmdLog.length - 1]?.[1]) cmdLog.push([+S.clock.toFixed(2), cmd, S.view]);
    if (!device.isConnected() || !$('sendOn').checked) return;
    const n = performance.now(); if (cmd !== lastSent && n - lastSendAt >= SEND_INTERVAL) { device.send(cmd); lastSent = cmd; lastSendAt = n; }
  }
  const PLACE = { stalls: 'the festival stalls', fan: 'the shrine steps', kakigori: 'the shrine steps', breath_L: 'the shrine steps', whisper_R: 'fireworks', fireworks: 'fireworks' };

  // ---------------------------------------------------------------- loop / start / end
  let last = performance.now(), hidden = false;
  function loop() {
    const n = performance.now(), dt = clamp((n - last) / 1000, 0, .05); last = n;
    if (!hidden) {
      update(dt);
      if (S.started || S.fade) draw(S.t, dt); else drawCover();
      const { th, src } = thermal(dt); output(th, S.started); radar(S.started ? src : [], th);
      $('posInfo').textContent = S.started ? PLACE[S.view] : '';
    }
    requestAnimationFrame(loop);
  }
  document.addEventListener('visibilitychange', () => { hidden = document.hidden; if (hidden) { stopOutput(); SND.ctx()?.suspend(); } else { last = performance.now(); SND.ctx()?.resume(); } });
  document.addEventListener('keydown', (e) => { if (e.code === 'Escape') emergencyStop(); });
  let ended = null;
  function finish(yes) {
    S.started = false; run++; stopOutput(); fireworksOff();
    for (const k of ['crowd', 'sizzle', 'insects', 'fan']) SND.loop(k)?.stop();
    S.fan = null; S.fade = 0; S.fadeA = 0; sub('', '');   // back to the cover picture
    const c = $('cleared'); c.hidden = false; c.textContent = yes ? '🎆 もう、幼なじみには戻らない · Not just childhood friends anymore' : '🎆 来年も、彼の隣で · Next year, beside him again';
    $('startBtn').textContent = '↺ もう一度 · Play again'; $('intro').classList.remove('hidden'); ended = yes ? 'forever' : 'next-year';
  }
  function start() {
    SND.init(); SND.loadVoices(Object.keys(LINES));
    S = fresh(); S.started = true; viewA = viewB = 'stalls'; mix = 1; ended = null; cmdLog.length = 0; $('cleared').hidden = true;
    $('intro').classList.add('hidden');
    story();
  }
  $('startBtn').addEventListener('click', start);
  $('lrBtn').addEventListener('click', () => { SND.lrCheck(); const b = $('lrBtn'); b.textContent = '🎧 Left…'; setTimeout(() => { b.textContent = '🎧 …Right'; }, 900); setTimeout(() => { b.textContent = '🎧 Left / Right check'; }, 1900); });
  $('soundBtn').addEventListener('click', (e) => { SND.setMuted(!SND.isMuted()); e.target.textContent = SND.isMuted() ? '🔇' : '🔊'; });
  function drawCover() {}   // UI v2: the cover is the finished image (media/cover/, tools/web/covers.py)
  // layered picture (../../shared/layers.js, as Demo27): the mouth follows his voice, blinks, breathing, parallax
  if (window.MoHeatLayers) Object.assign(window.MoHeatLayers, { level: () => S.env, raw: () => S.lv, current: () => S.view });
  window.SAKU = { get S() { return S; }, thermal: () => thermal(.05), cmdLog, get ended() { return ended; } };
  setStep(0);
  if (QS.has('cover')) { document.body.classList.add('cover-only'); artReady.then(drawCover); return; }
  if (QS.has('autoplay') || AUTO) { const ac = SND.init(); if (ac.state === 'running') start(); else ac.resume().then(() => { if (ac.state === 'running' && !S.started) start(); }).catch(() => {}); }
  requestAnimationFrame(loop);
})();
