// 『ふたりの、こもりうた』 (A Lullaby for Two) — 小雪 Koyuki (snow spirit) and 焔 Homura (foxfire spirit) from Demo 1, back on a snowy
// night when you can't sleep. They turn putting you to sleep into a contest: Koyuki's cool whisper and breath at your left ear,
// Homura's warm whisper and breath at your right ear (your answer picks who goes first), then both squeeze into the SAME ear —
// cool and warm on one ear at once (firmware DUAL) — and at the end you choose who stays beside you till morning.
// Art: Demo 1's approved sprites + room background, reused BY PATH (never copied, never changed) and stacked in layers
// (DEMO_DESIGN_GUIDE §6.2): background (zoom / blur / tint) → characters (VN-style frame swaps: blink, mouth from her own voice
// level, expressions) → code effects (snow in the window, hearth glow, foxfire wisps, snow sparkles, closing eyelids). 0 Seedance.
// DUAL thermal: Koyuki's voice is COOL (snow spirit: the special case in DEMO_DESIGN_GUIDE §0.2), Homura's voice is warm; the irori
// hearth in front of you (mild warmth, both ears) and the night air through the open garden doors behind it (mild cool, both ears)
// are the ambient layer; their breath at your ear (cool / warm) and their closeness add the rest.
(() => {
  const $ = (id) => document.getElementById(id);
  const QS = new URLSearchParams(location.search);
  const SND = window.LBAudio, LINES = window.LULLABY_LINES, W = 1920, H = 1080;
  const AUTO = QS.has('auto');   // testing: every choice / action answers itself after a moment
  const cv = $('scene'); let ctx = cv.getContext('2d');
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const sleep = (s) => new Promise((r) => setTimeout(r, s * 1000));

  // ---------------------------------------------------------------- art: Demo 1's sprites (transparent WebP, all frames of one pose aligned)
  const ART = '../_kit/snowfox/art/';   // all-ages category kit (shared with Demo01)
  const FRAMES = ['room_bg',
    ...['base', 'blink', 'mouth_half', 'mouth_open', 'happy', 'shy', 'surprise', 'whisper', 'pout'].map((f) => 'K_bust_' + f),
    ...['base', 'blink', 'mouth_half', 'mouth_open', 'happy', 'shy', 'surprise', 'whisper', 'smug'].map((f) => 'H_bust_' + f),
    'K_ear', 'K_ear_blow', 'H_ear', 'H_ear_blow', 'K_pose_walk', 'K_pose_idle', 'K_pose_rest', 'H_pose_appear', 'H_pose_idle'];
  const IMG = {};
  const artReady = Promise.all(FRAMES.map((n) => new Promise((res) => { const im = new Image(); im.onload = () => { IMG[n] = im; res(); }; im.onerror = () => res(); im.src = `${ART}${n}.webp`; })));

  // ---------------------------------------------------------------- state
  const fresh = () => ({ started: false, t: 0, clock: 0, view: 'room', fire: 1, draft: 1, eyes: 0, fade: 0, first: null, stay: null,
    kAt: null, hAt: null, breath: null, expr: { K: 'base', H: 'base' }, lv: { K: 0, H: 0 }, talk: { K: 0, H: 0 }, walk: 0, poof: -9, hSettle: 0 });
  let S = fresh(), run = 0;

  // ---------------------------------------------------------------- subtitles + voice
  const subJa = $('subJa'), subEn = $('subEn'), subs = $('subs');
  const WHO = { K: '小雪', H: '焔', KH: '小雪・焔' };
  function sub(id) {
    if (!id) { subJa.textContent = subEn.textContent = ''; subs.classList.remove('show'); return; }
    const [ja, en, who] = LINES[id];
    subJa.innerHTML = `<span class="who ${who.toLowerCase()}">${WHO[who]}</span>`; subJa.append(ja); subEn.textContent = en; subs.classList.add('show');
  }
  const alive = (my) => { if (my !== run) throw new Error('stopped'); };
  // say(id, where, expr): one speaker (from lines.js). Both at once (who "KH"): where = { K: {...}, H: {...} }.
  async function say(id, where, expr) {
    const my = run, who = LINES[id][2];
    sub(id);
    const one = async (w, file, at) => {
      if (expr) S.expr[w] = expr; S[w === 'K' ? 'kAt' : 'hAt'] = at; S.talk[w]++;
      await SND.say(file, w, at, at.dist < .2 ? 1.8 : 1.45); S.talk[w]--;
    };
    if (who === 'KH') await Promise.all([one('K', id + '_k', where.K), one('H', id + '_h', where.H)]);
    else await one(who, id, where);
    alive(my); await sleep(.35); sub(null);
  }

  // ---------------------------------------------------------------- your turn: choices, actions, hold (same as Demo25)
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
        const n = performance.now(), dt = (n - last) / 1000; last = n;
        if (down || AUTO || n - t0 > 18000) k = Math.min(1, k + dt / sec); onTick?.(down || AUTO || n - t0 > 18000, k); bar.style.width = `${k * 100}%`;
        if (k >= 1) { removeEventListener('keydown', kd); removeEventListener('keyup', ku); actEl.classList.remove('show'); actEl.innerHTML = ''; res(); return; }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }
  const breath = (who, az, sec) => { S.breath = { who, az, t0: S.clock, sec }; };

  // ---------------------------------------------------------------- the story
  const K_FAR = { az: .3, dist: 2.2 }, H_FAR = { az: -.25, dist: 1.3 }, K_TALK = { az: .4, dist: .8 }, H_TALK = { az: -.4, dist: .8 },
    L_EAR = { az: -1.35, dist: .12 }, R_EAR = { az: 1.35, dist: .12 }, L_EAR2 = { az: -1.2, dist: .16 };
  async function koyukiTurn(my) {   // left ear: close your eyes, the sound of snow, her cool breath
    S.view = 'kear'; SND.fx.steps(.3, -1.1, 3, .3, 1, .5); await sleep(1.1); alive(my);
    await say('k05', L_EAR, 'whisper');
    const snow = SND.loop('snow');
    await hold('😌', '目を閉じる（長押し）', 'Close your eyes (press and hold)', 3, (down, k) => { S.eyes = down ? Math.max(S.eyes, k) : S.eyes * .97; snow?.set(.15 + .5 * S.eyes, .3); });
    S.eyes = 1; snow?.set(.6, .5); await sleep(1.2); alive(my);
    breath('K', -1.35, 1.9); S.expr.K = 'blow';
    await say('k06', L_EAR, 'blow');
    S.eyes = 0; snow?.set(.12, 1.5); S.expr.K = 'happy';
  }
  async function homuraTurn(my) {   // right ear: turn your ear to her, her warm whisper and breath
    S.view = 'hear'; SND.fx.bells(1.2, .4); await sleep(.8); alive(my);
    await action('👂', '右の耳を、焔に向ける', 'Turn your right ear to Homura', 'みみ|耳|右|ほむら|向ける');
    SND.fx.rustle(1.3, .2); await sleep(.4);
    await say('h05', R_EAR, 'whisper');
    breath('H', 1.35, 1.6); S.expr.H = 'blow';
    await say('h06', R_EAR, 'blow');
    S.expr.H = 'happy';
  }
  async function story() {
    const my = ++run;
    try {
      // 1 · a snowy night, you can't sleep: the hearth crackles in front, the garden doors are open to the snow
      S.view = 'room';
      const fire = SND.loop('fire'), wind = SND.loop('wind'), snow = SND.loop('snow');
      fire?.set(.4, 1); wind?.set(.22, 1.5); snow?.set(.12, 2);
      await sleep(2.2); alive(my);
      S.view = 'arrive'; S.walk = 0; SND.fx.steps(.35, .25, 5, .45, 3.2, 2.2); await sleep(2); alive(my);
      await say('k01', K_FAR, 'happy');
      S.poof = S.t; SND.fx.poof(-.25, 1.3); await sleep(.6); alive(my);
      await say('h01', H_FAR, 'happy');
      S.view = 'talk'; SND.fx.steps(.3, .4, 3, .35, 2, .9); SND.fx.bells(-.4, .9); await sleep(.6);
      await say('k02', K_TALK, 'shy');
      await say('h02', H_TALK, 'smug');
      await say('k03', K_TALK, 'base');
      S.first = await choice([['…ちょっと、暑くて', '…It\'s a bit too warm', 'あつい|暑い|熱い|hot|warm'], ['…ちょっと、寒くて', '…It\'s a bit too cold', 'さむい|寒い|cold|chilly']]);
      if (S.first === 0) { await say('k04', K_TALK, 'happy'); await koyukiTurn(my); await homuraTurn(my); }
      else { await say('h04', H_TALK, 'smug'); await homuraTurn(my); await koyukiTurn(my); }

      // 2 · both want the same ear: Homura squeezes in next to Koyuki — cool and warm on your LEFT ear at once (DUAL)
      S.view = 'share'; SND.fx.bells(-1.2, .3); SND.fx.rustle(-1.3, .2); await sleep(.5); alive(my);
      S.hAt = L_EAR2;
      await say('k07', L_EAR, 'pout');
      await say('h07', L_EAR2, 'smug');
      await say('k08', L_EAR, 'whisper');
      await say('h08', L_EAR2, 'whisper');
      await say('kh1', { K: L_EAR, H: L_EAR2 }, 'whisper');

      // 3 · getting sleepy: the embers settle; who stays beside you?
      S.view = 'both'; SND.fx.rustle(1.3, .25); SND.fx.settle(); fire?.set(.3, 2); S.fire = .8; await sleep(.6); alive(my);
      S.hAt = R_EAR;
      await say('k10', L_EAR, 'whisper');
      S.stay = await choice([['小雪、そばにいて', 'Koyuki, stay with me', 'こゆき|小雪|ゆき|koyuki|snow'], ['焔、そばにいて', 'Homura, stay with me', 'ほむら|焔|homura|fox|fire']]);
      if (S.stay === 0) {   // Homura pouts and goes to tend the hearth (more warmth from the front); Koyuki stays at your left ear
        S.view = 'talk'; S.kAt = K_TALK; await say('h11a', H_TALK, 'smug');
        SND.fx.bells(-.3, 1.3); S.hSettle = 1; S.fire = 1.5; fire?.set(.55, 1.5); S.view = 'kear'; await sleep(.8); alive(my);
        await say('k11a', L_EAR, 'happy');
      } else {              // Koyuki goes to close the garden doors (the cold draft stops); Homura stays at your right ear
        S.view = 'talk'; S.hAt = H_TALK; await say('k11b', K_TALK, 'happy');
        SND.fx.steps(.3, .2, 4, .4, 1.2, 3.2); await sleep(1.5); SND.fx.door(.1, 3.5); S.draft = 0; wind?.set(0, .8); snow?.set(0, .8); await sleep(1); alive(my);
        S.view = 'hear'; SND.fx.rustle(1.3, .2); await sleep(.4);
        await say('h11b', R_EAR, 'happy');
      }

      // 4 · good night: you say it — and they both answer, one at each ear (left cool, right warm)
      await action('🌙', '「おやすみ」と言う', 'Say "Good night"', 'おやすみ|おやすみなさい|good night|night|晚安');
      S.view = 'both'; SND.fx.rustle(-1.3, .2); await sleep(.5); alive(my);
      await say('kh2', { K: L_EAR, H: R_EAR }, 'whisper');
      S.eyes = 1; fire?.set(.2, 3); await sleep(2.5); S.fade = 1; SND.fx.chime(); await sleep(3.5); alive(my); finish();
    } catch (e) { if (e.message !== 'stopped') console.error(e); }
  }

  // ---------------------------------------------------------------- per-frame state + thermal
  let fireK = 1, draftK = 1, eyesK = 0, kNear = 0, hNear = 0;
  const NEAR_VIEWS = { kear: ['K'], hear: ['H'], share: ['K', 'H'], both: ['K', 'H'] };
  function update(dt) {
    S.t += dt; if (!S.started) return;
    S.clock += dt; S.lv.K = SND.voiceLevel('K'); S.lv.H = SND.voiceLevel('H');
    fireK += (S.fire - fireK) * (1 - Math.exp(-dt / 1.5)); draftK += (S.draft - draftK) * (1 - Math.exp(-dt / 1.2));
    eyesK += (S.eyes - eyesK) * (1 - Math.exp(-dt / .35));
    const near = NEAR_VIEWS[S.view] || [];
    kNear += ((near.includes('K') ? 1 : 0) - kNear) * (1 - Math.exp(-dt / .5)); hNear += ((near.includes('H') ? 1 : 0) - hNear) * (1 - Math.exp(-dt / .5));
    if (S.view === 'arrive') S.walk = Math.min(1, S.walk + dt / 2.6);
    if (S.breath && S.clock - S.breath.t0 > S.breath.sec) S.breath = null;
  }
  // Thermal, two layers (firmware DUAL: cool and heat independent on each ear).
  //  · VOICE (DEMO_DESIGN_GUIDE §3): loudness (0.1 + 0.8 × level) at the ear she speaks at — × 1 right at your ear, × 0.6 within 50 cm,
  //    × 0.28 further; halved when she is straight in front. Homura's voice is warm (every voice is); Koyuki's is COOL — she is a snow
  //    spirit, the one special case the guide allows (§0.2).
  //  · AMBIENT (real things by your ears): the irori hearth in front of you (mild warmth on both ears; more when Homura tends it),
  //    the night air through the open garden doors behind it (mild cool on both ears; gone once Koyuki closes them), their breath at
  //    your ear (Koyuki's cool "fuu", Homura's warm "haa"), and their closeness: a snow spirit's cheek by your ear is cool, a foxfire
  //    spirit's is warm (≤ 0.2). Nothing heats because of blushing, teasing or the contest itself.
  function sources() {
    const out = [], add = (az, k, s, icon) => { if (s > .01) out.push({ az, k, s, icon }); };
    if (!S.started) return out;
    const vf = (P, lv) => (.1 + .8 * clamp(lv * 8)) * (P.dist < .15 ? 1 : P.dist <= .5 ? .6 : .28) * (Math.abs(P.az) < .5 ? .5 : 1);
    if (S.talk.K && S.kAt) add(S.kAt.az, 'c', vf(S.kAt, S.lv.K), '❄️');
    if (S.talk.H && S.hAt) add(S.hAt.az, 'h', vf(S.hAt, S.lv.H), '🦊');
    add(0, 'h', .14 * fireK * (.9 + .1 * Math.sin(S.t * 6.1) * Math.sin(S.t * 2.3)), '🔥');
    add(0, 'c', .12 * draftK, '🌨');
    if (S.breath) { const u = (S.clock - S.breath.t0) / S.breath.sec; add(S.breath.az, S.breath.who === 'K' ? 'c' : 'h', (S.breath.who === 'K' ? .75 : .6) * Math.sin(Math.PI * clamp(u)), S.breath.who === 'K' ? '💨' : '♨️'); }
    if (kNear > .05) add(-1.35, 'c', .18 * kNear, '⛄');
    if (hNear > .05) add(S.view === 'share' ? -1.2 : 1.35, 'h', .18 * hNear, '🏮');
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

  // ---------------------------------------------------------------- drawing: background layer → characters → effects
  // background: Demo 1's room (1536×1024) scaled to 1920 wide, shifted up 200 px so the hearth sits at the bottom of the frame.
  const WIN = { x: 640, y: -40, w: 785, h: 585 }, HEARTH = { x: 956, y: 1000 }, LANTERN = { x: 1810, y: 470 };
  const flakes = Array.from({ length: 120 }, () => ({ x: Math.random(), y: Math.random(), v: .04 + Math.random() * .06, r: 1.5 + Math.random() * 3, p: Math.random() * 6 }));
  function drawBg(t, dt, z, blur, dark) {
    const im = IMG.room_bg; if (!im) { ctx.fillStyle = '#0d1222'; ctx.fillRect(0, 0, W, H); return; }
    ctx.save(); ctx.translate(W / 2, H * .45); ctx.scale(z, z); ctx.translate(-W / 2, -H * .45);
    if (blur) ctx.filter = `blur(${blur}px)`;
    ctx.drawImage(im, 0, -200, W, W * im.height / im.width); ctx.filter = 'none';
    // snow falling in the open garden doors (stops once they're closed: draftK)
    ctx.save(); ctx.beginPath(); ctx.rect(WIN.x, WIN.y, WIN.w, WIN.h); ctx.clip(); ctx.fillStyle = `rgba(255,255,255,${.8 * Math.max(.25, draftK)})`; ctx.beginPath();
    for (const f of flakes) { f.y += f.v * dt; if (f.y > 1) { f.y = 0; f.x = Math.random(); } const x = WIN.x + (f.x + .015 * Math.sin(t * .8 + f.p)) * WIN.w, y = WIN.y + f.y * WIN.h; ctx.moveTo(x + f.r, y); ctx.arc(x, y, f.r, 0, 7); }
    ctx.fill(); if (draftK < .99) { ctx.fillStyle = `rgba(214,196,160,${(1 - draftK) * .92})`; ctx.fillRect(WIN.x, WIN.y, WIN.w, WIN.h); }   // the paper doors slid shut
    ctx.restore();
    // hearth + lantern flicker (code light, on top of the painted glow)
    const fl = .75 + .25 * Math.sin(t * 7.3) * Math.sin(t * 2.9);
    let g = ctx.createRadialGradient(HEARTH.x, HEARTH.y, 30, HEARTH.x, HEARTH.y, 700); g.addColorStop(0, `rgba(255,140,60,${.22 * fl * fireK})`); g.addColorStop(1, 'rgba(255,140,60,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    g = ctx.createRadialGradient(LANTERN.x, LANTERN.y, 10, LANTERN.x, LANTERN.y, 260); g.addColorStop(0, `rgba(255,200,120,${.18 + .06 * fl})`); g.addColorStop(1, 'rgba(255,200,120,0)'); ctx.fillStyle = g; ctx.fillRect(LANTERN.x - 300, LANTERN.y - 300, 600, 600);
    ctx.restore();
    if (dark) { ctx.fillStyle = `rgba(10,12,28,${dark})`; ctx.fillRect(0, 0, W, H); }
  }
  // a character frame: blink / mouth (from her own voice level) / expression, VN style — every frame of one pose is aligned
  const blinkAt = { K: 2, H: 3.3 };
  function face(who, base) {
    const lv = S.lv[who], ex = S.expr[who];
    if (base === 'ear') return `${who}_ear${ex === 'blow' && S.breath?.who === who ? '_blow' : ''}`;
    if (S.talk[who] && ex !== 'blow') { if (lv > .07) return `${who}_bust_mouth_open`; if (lv > .03) return `${who}_bust_mouth_half`; }
    if (S.t > blinkAt[who]) { if (S.t > blinkAt[who] + .13) blinkAt[who] = S.t + 2.5 + Math.random() * 3; else return `${who}_bust_blink`; }
    const f = `${who}_bust_${ex === 'blow' ? 'whisper' : ex}`; return IMG[f] ? f : `${who}_bust_base`;
  }
  function spr(name, cx, bottom, h, { mirror = false, alpha = 1, rot = 0, bob = 0 } = {}) {
    const im = IMG[name]; if (!im || alpha <= 0) return;
    const w = h * im.width / im.height;
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(cx, bottom + bob); if (rot) ctx.rotate(rot); if (mirror) ctx.scale(-1, 1);
    ctx.drawImage(im, -w / 2, -h, w, h); ctx.restore();
  }
  const bob = (who, t, k = 1) => (Math.sin(t * 1.6 + (who === 'K' ? 0 : 1.7)) * 5 + (S.talk[who] ? -10 * clamp(S.lv[who] * 8) : 0)) * k;
  // foxfire wisps around Homura, snow sparkles around Koyuki (L1 code effects)
  function wisps(cx, cy, r, t, n, warm, a = 1) {
    for (let i = 0; i < n; i++) {
      const ph = t * (.5 + i * .07) + i * 2.1, x = cx + Math.cos(ph) * r * (1 + .2 * Math.sin(t + i)), y = cy + Math.sin(ph * 1.3) * r * .45 - 20 * Math.sin(t * 2 + i);
      const s = warm ? 14 + 5 * Math.sin(t * 6 + i) : 5 + 3 * Math.sin(t * 4 + i);
      const g = ctx.createRadialGradient(x, y, 0, x, y, s * 2.4); g.addColorStop(0, warm ? `rgba(255,220,140,${.9 * a})` : `rgba(235,245,255,${.95 * a})`); g.addColorStop(.4, warm ? `rgba(255,120,40,${.45 * a})` : `rgba(150,200,255,${.35 * a})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(x - s * 2.4, y - s * 2.4, s * 4.8, s * 4.8);
    }
  }
  let viewA = 'room', viewB = 'room', mix = 1;
  function drawView(view, t, dt) {
    switch (view) {
      case 'room': drawBg(t, dt, 1.02 + .006 * Math.sin(t * .5), 0, .08); break;
      case 'arrive': {
        drawBg(t, dt, 1.02, 0, .08);
        const k = S.walk, kx = lerp(1420, 1240, k);
        spr(k < 1 ? 'K_pose_walk' : 'K_pose_idle', kx, 860 + (k < 1 ? Math.abs(Math.sin(t * 6)) * -6 : 0), 600, { mirror: k < 1, bob: k < 1 ? 0 : bob('K', t, .5) });
        wisps(kx, 520, 140, t, 6, false, .8);
        const pk = clamp((S.t - S.poof) / .6);
        if (pk > 0) {
          spr(pk < 1 || S.t - S.poof < 3 ? 'H_pose_appear' : 'H_pose_idle', 640, 980 - 60 * (1 - pk), 660 * (.6 + .4 * pk), { alpha: pk, bob: bob('H', t, .5) });
          wisps(640, 640, 200, t, 7, true, pk);
          if (S.t - S.poof < 1) { const g = ctx.createRadialGradient(700, 800, 0, 700, 800, 500); g.addColorStop(0, `rgba(255,170,80,${.6 * (1 - (S.t - S.poof))})`); g.addColorStop(1, 'rgba(255,170,80,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
        }
        break;
      }
      case 'talk': {   // VN-style two-shot: Homura left (by the hearth), Koyuki right
        drawBg(t, dt, 1.08, 2, .18);
        const hx = S.hSettle ? 700 : 560;
        spr(face('H', 'bust'), hx, 1320, 1240, { bob: bob('H', t), alpha: S.hSettle ? .85 : 1 });
        spr(face('K', 'bust'), 1380, 1300, 1240, { bob: bob('K', t) });
        wisps(hx, 420, 330, t, 5, true, .7); wisps(1380, 380, 320, t, 7, false, .7);
        break;
      }
      case 'kear': drawBg(t, dt, 1.18, 6, .35); if (S.hSettle) spr('H_pose_idle', 980, 1000, 380, { alpha: .8, bob: bob('H', t, .3) }); spr(face('K', 'ear'), 430, 1480, 1760, { bob: bob('K', t, .6) }); wisps(500, 520, 380, t, 8, false, .8); break;
      case 'hear': drawBg(t, dt, 1.18, 6, .35); spr(face('H', 'ear'), 1490, 1480, 1760, { mirror: true, bob: bob('H', t, .6) }); wisps(1420, 520, 380, t, 6, true, .8); break;
      case 'share':    // both squeeze in at your left ear: Koyuki right at it, Homura leaning in just beside her
        drawBg(t, dt, 1.18, 6, .4);
        spr(face('K', 'ear'), 400, 1500, 1760, { bob: bob('K', t, .6) });
        spr(face('H', 'bust'), 1000, 1330, 1250, { bob: bob('H', t, .8), rot: -.1 });
        wisps(1000, 420, 330, t, 5, true, .8); wisps(450, 540, 360, t, 7, false, .8);
        break;
      case 'both':     // one at each ear: Koyuki left (cool), Homura right (warm)
        drawBg(t, dt, 1.18, 6, .4);
        spr(face('K', 'ear'), 360, 1480, 1760, { bob: bob('K', t, .6) });
        spr(face('H', 'ear'), 1560, 1480, 1760, { mirror: true, bob: bob('H', t, .6) });
        wisps(420, 520, 320, t, 6, false, .8); wisps(1500, 520, 320, t, 5, true, .8);
        break;
    }
  }
  function draw(t, dt) {
    if (S.view !== viewB) { viewA = viewB; viewB = S.view; mix = 0; }
    mix = Math.min(1, mix + dt / .5);
    if (mix < 1) {   // cross-fade: the old view, then the new one drawn offscreen and laid over it
      drawView(viewA, t, 0);
      const o = off(); o.ctx.clearRect(0, 0, W, H); ctx = o.ctx; drawView(viewB, t, dt); ctx = mainCtx;
      ctx.globalAlpha = mix; ctx.drawImage(o.cv, 0, 0);
    } else drawView(viewB, t, dt);
    ctx.globalAlpha = 1;
    // a cold breath / warm breath at your ear: a little cloud of snow or sparks drifting toward the side of the screen
    if (S.breath) {
      const u = clamp((S.clock - S.breath.t0) / S.breath.sec), left = S.breath.az < 0, x = left ? lerp(700, 120, u) : lerp(1220, 1800, u), y = 560 - 60 * u, a = Math.sin(Math.PI * u);
      const g = ctx.createRadialGradient(x, y, 0, x, y, 260); g.addColorStop(0, S.breath.who === 'K' ? `rgba(200,230,255,${.5 * a})` : `rgba(255,170,90,${.45 * a})`); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(x - 260, y - 260, 520, 520);
    }
    // closing your eyes: eyelids from top and bottom
    if (eyesK > .01) {
      const k = eyesK, lid = H * .5 * k;
      ctx.fillStyle = '#05060c'; ctx.fillRect(0, 0, W, lid * .98); ctx.fillRect(0, H - lid * .98, W, lid);
      const g1 = ctx.createLinearGradient(0, lid - 120, 0, lid + 60); g1.addColorStop(0, 'rgba(5,6,12,1)'); g1.addColorStop(1, 'rgba(5,6,12,0)'); ctx.fillStyle = g1; ctx.fillRect(0, lid - 120, W, 180);
      const g2 = ctx.createLinearGradient(0, H - lid + 120, 0, H - lid - 60); g2.addColorStop(0, 'rgba(5,6,12,1)'); g2.addColorStop(1, 'rgba(5,6,12,0)'); ctx.fillStyle = g2; ctx.fillRect(0, H - lid - 60, W, 180);
    }
    if (S.fade) { S.fadeA = Math.min(1, (S.fadeA || 0) + dt / 3); ctx.fillStyle = `rgba(5,6,12,${S.fadeA})`; ctx.fillRect(0, 0, W, H); }
  }
  // offscreen buffer for the cross-fade between views
  let OFF = null; const off = () => { if (!OFF) { const c = document.createElement('canvas'); c.width = W; c.height = H; OFF = { cv: c, ctx: c.getContext('2d') }; } return OFF; };
  const mainCtx = ctx;

  // ---------------------------------------------------------------- side panel + device (same protocol as every demo)
  const rc = $('radar').getContext('2d');
  function radar(src, th) {
    const cx = 240, cy = 220, R = 160; rc.clearRect(0, 0, 480, 420);
    rc.strokeStyle = 'rgba(255,255,255,.08)'; rc.lineWidth = 1.5; for (const r of [R * .5, R]) { rc.beginPath(); rc.arc(cx, cy, r, 0, 7); rc.stroke(); }
    rc.fillStyle = '#9aa3c2'; rc.font = '600 13px Inter'; rc.textAlign = 'center'; rc.fillText('front', cx, cy - R - 10); rc.fillText('L', cx - R - 18, cy + 5); rc.fillText('R', cx + R + 18, cy + 5);
    for (const [e, sx] of [['L', -1], ['R', 1]]) {
      rc.fillStyle = '#2a3048'; rc.beginPath(); rc.ellipse(cx + sx * 46, cy, 12, 24, 0, 0, 7); rc.fill();
      for (const [k, col, dy] of [['h', '255,122,69', -12], ['c', '79,179,255', 12]]) if (th[e + k] > .02) { rc.fillStyle = `rgba(${col},${.25 + .75 * th[e + k]})`; rc.beginPath(); rc.ellipse(cx + sx * 46, cy + dy, 11, 12, 0, 0, 7); rc.fill(); }
    }
    rc.fillStyle = '#353c5a'; rc.beginPath(); rc.arc(cx, cy, 40, 0, 7); rc.fill();
    rc.font = '26px sans-serif'; rc.textBaseline = 'middle';
    for (const s of src) { const x = cx + Math.sin(s.az) * R, y = cy - Math.cos(s.az) * R; rc.globalAlpha = clamp(.35 + s.s); rc.fillStyle = s.k === 'h' ? 'rgba(255,122,69,.25)' : 'rgba(79,179,255,.25)'; rc.beginPath(); rc.arc(x, y, 18 + 18 * s.s, 0, 7); rc.fill(); rc.fillText(s.icon, x, y + 1); rc.globalAlpha = 1; }
    rc.textBaseline = 'alphabetic';
  }
  const DEFAULT_RANGE = { heatMin: 0, heatMax: 200, coolMin: 35, coolMax: 80 }, SEND_INTERVAL = 100, OFF_V = .03;
  const store = { get: (k, d) => { try { return JSON.parse(localStorage.getItem(`moheat.${k}`)) ?? d; } catch { return d; } }, set: (k, v) => { try { localStorage.setItem(`moheat.${k}`, JSON.stringify(v)); } catch {} } };
  const range = { ...DEFAULT_RANGE, ...store.get('range', {}) };
  let lastSent = '', lastSendAt = 0, tripped = false, intensity = +store.get('asmr.intensity', 100) / 100;
  const device = MoHeatDevice.create({ select: $('portSelect'), addBtn: $('addPort'), connectBtn: $('connectBtn'), status: $('deviceStatus') }, { log: (l) => console.log('[MoHeat]', l), onConnect: () => { lastSent = ''; } });
  if (!MoHeatDevice.supported) $('deviceStatus').querySelector('span').textContent = 'Web Serial needs desktop Chrome / Edge';
  function command(th) {   // DUAL: each ear's cool and heat set independently
    const c = (v) => (v > OFF_V ? Math.round(range.coolMin + v * (range.coolMax - range.coolMin)) : 0), h = (v) => (v > OFF_V ? Math.round(range.heatMin + v * (range.heatMax - range.heatMin)) : 0);
    return Math.max(th.Lc, th.Lh, th.Rc, th.Rh) <= OFF_V ? 'stop' : `DUAL LC${c(th.Lc)} LH${h(th.Lh)} RC${c(th.Rc)} RH${h(th.Rh)}`;
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
    if ((sc.Lc > OFF_V && sc.Lh > OFF_V) || (sc.Rc > OFF_V && sc.Rh > OFF_V)) both++;
    for (const [k, [bar, val]] of Object.entries(meterEls)) { bar.style.width = `${sc[k] * 100}%`; val.textContent = Math.round(sc[k] * 100); }
    const cmd = command(sc); $('cmd').textContent = cmd;
    for (const [e, el] of [['L', $('glowL')], ['R', $('glowR')]]) {
      const c = sc[e + 'c'], h = sc[e + 'h'], v = Math.max(c, h), dir = e === 'L' ? 'right' : 'left';
      el.style.opacity = v.toFixed(2); el.style.background = `linear-gradient(to ${dir}, rgba(255,122,69,${(.55 * h / (v || 1)).toFixed(2)}), rgba(255,122,69,0)), linear-gradient(to ${dir}, rgba(79,179,255,${(.55 * c / (v || 1)).toFixed(2)}), rgba(79,179,255,0))`;
    }
    if (AUTO && cmd !== cmdLog[cmdLog.length - 1]?.[1]) cmdLog.push([+S.clock.toFixed(2), cmd, S.view]);
    if (!device.isConnected() || !$('sendOn').checked) return;
    const n = performance.now(); if (cmd !== lastSent && n - lastSendAt >= SEND_INTERVAL) { device.send(cmd); lastSent = cmd; lastSendAt = n; }
  }
  const PLACE = { room: 'a snowy night · your room', arrive: 'Koyuki & Homura arrive', talk: 'by the hearth', kear: 'Koyuki · left ear', hear: 'Homura · right ear', share: 'both · left ear', both: 'Koyuki left · Homura right' };

  // ---------------------------------------------------------------- loop / start / end
  let last = performance.now(), hidden = false;
  function loop() {
    const n = performance.now(), dt = clamp((n - last) / 1000, 0, .05); last = n;
    if (!hidden) {
      update(dt);
      ctx = mainCtx;
      if (S.started || S.fade) draw(S.t, dt); else drawCover(S.t, dt);
      const { th, src } = thermal(dt); output(th, S.started); radar(S.started ? src : [], th);
      $('posInfo').textContent = S.started ? PLACE[S.view] : '';
    }
    requestAnimationFrame(loop);
  }
  document.addEventListener('visibilitychange', () => { hidden = document.hidden; if (hidden) { stopOutput(); SND.ctx()?.suspend(); } else { last = performance.now(); SND.ctx()?.resume(); } });
  document.addEventListener('keydown', (e) => { if (e.code === 'Escape') emergencyStop(); });
  function finish() {
    S.started = false; run++; stopOutput();
    for (const k of ['fire', 'wind', 'snow']) SND.loop(k)?.stop();
    sub(null); actEl.classList.remove('show'); choiceEl.classList.remove('show');
    const c = $('cleared'); c.hidden = false;
    c.textContent = S.stay === 1 ? '🔥 焔が、朝までぽかぽか · Homura keeps you warm till morning' : '❄️ 小雪が、朝までそばに · Koyuki stays by you till morning';
    $('startBtn').textContent = '↺ もう一度 · Play again'; $('intro').classList.remove('hidden');
    window.LULLABY.done = true;
  }
  function start() {
    SND.init(); SND.loadVoices(Object.keys(window.LULLABY_VOICE?.dur || {}));
    S = fresh(); S.started = true; viewA = viewB = 'room'; mix = 1; fireK = 1; draftK = 1; eyesK = kNear = hNear = 0; $('cleared').hidden = true;
    $('intro').classList.add('hidden'); window.LULLABY.done = false;
    story();
  }
  $('startBtn').addEventListener('click', start);
  $('lrBtn').addEventListener('click', () => { SND.lrCheck(); const b = $('lrBtn'); b.textContent = '🎧 Left…'; setTimeout(() => { b.textContent = '🎧 …Right'; }, 900); setTimeout(() => { b.textContent = '🎧 Left / Right check'; }, 1900); });
  $('soundBtn').addEventListener('click', (e) => { SND.setMuted(!SND.isMuted()); e.target.textContent = SND.isMuted() ? '🔇' : '🔊'; });
  function drawCover(t, dt) {   // cover standard (shared/cover.js): the room, both girls on the right half, the title in the shaded left column
    const C = window.MoHeatCover;
    if (!C) { ctx.save(); ctx.translate(380, 0); drawBg(t, dt, 1.05, 0, .1); ctx.restore(); }
    else drawBg(t, dt, 1.05, 0, .1);
    const girls = () => {
      spr('H_bust_happy', 1560, 1230, 980, { bob: Math.sin(t * 1.6) * 5 }); spr('K_bust_happy', 1820, 1220, 980, { bob: Math.sin(t * 1.6 + 1.7) * 5 });
      wisps(1560, 470, 240, t, 5, true, .8); wisps(1820, 450, 220, t, 7, false, .8);
    };
    if (C) C.fit(ctx, { eye: [.86, .595], face: .22 }, girls, { duo: true, free: true, tone: '#0b0f1e', at: { y: .36, face: .26 }, fade: 1.03 });   // chibi busts: their cut-off bottoms fade into the room
    else girls();
  }
  // testing: LULLABY.peek('share') shows one view without the story (screenshots / layout checks)
  const peek = (v) => { run++; S = fresh(); S.started = true; S.view = v; S.walk = 1; S.poof = -9; S.t = 9; viewA = viewB = v; mix = 1; $('intro').classList.add('hidden'); };
  window.LULLABY = { get S() { return S; }, thermal: () => thermal(.05), both: () => both, log: cmdLog, done: false, peek };
  if (QS.has('cover')) { document.body.classList.add('cover-only'); artReady.then(() => drawCover(0, 0)); return; }
  if (QS.has('autoplay') || AUTO) { const ac = SND.init(); if (ac.state === 'running') start(); else ac.resume().then(() => { if (ac.state === 'running' && !S.started) start(); }).catch(() => {}); }
  requestAnimationFrame(loop);
})();
