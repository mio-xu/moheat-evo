// 『ただいま、じいちゃん・ばあちゃん』 (Home for New Year) — Demo15/16's grandparents Hana and Gen, this time in person: grandpa
// waits at the snowy little station (the wind blows in from the open left side; you wear the red scarf grandma knitted in Part 1),
// grandma flies out of the genkan to hug you (warm air from the house in front, a whisper at your left ear), the kotatsu with the
// kerosene stove on your right and a steaming bowl of oshiruko, a snowball fight next morning (grandpa's snowball whizzes past your
// right ear), and at night grandma's story at your pillow while grandpa snores next door — she tucks the quilt up to your ears.
// Stills first (DEMO_DESIGN_GUIDE §6.3): one Seedance still per scene + L0 staging (slow drift, a push-in toward whoever speaks)
// + L1 code effects (snow, steam, stove glow, the snowball, lamp flicker). Structure from Demo28's main.js.
// DUAL thermal: voices are warm at the ear they speak at (loudness × distance); the ambient layer = real things by your ears.
(() => {
  const $ = (id) => document.getElementById(id);
  const QS = new URLSearchParams(location.search);
  const SND = window.FVAudio, LINES = window.VISIT_LINES, W = 1920, H = 1080;
  const AUTO = QS.has('auto');   // testing: every choice / action answers itself after a moment (?pick=0|1 fixes the branch)
  const cv = $('scene'), ctx = cv.getContext('2d');
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const sleep = (s) => new Promise((r) => setTimeout(r, s * 1000));

  // ---------------------------------------------------------------- art: one still per scene
  const VIEWS = ['station', 'genkan', 'kotatsu', 'yard', 'futon'];
  const IMG = {};
  const artReady = Promise.all(VIEWS.map((n) => new Promise((res) => { const im = new Image(); im.onload = () => { IMG[n] = im; res(); }; im.onerror = () => res(); im.src = `media/art/visit_${n}.jpg?v=1`; })));
  // where each one's face is in the still (0..1), for the push-in toward the speaker
  const FACE = { station: { gp: [.64, .32] }, genkan: { gm: [.36, .32] }, kotatsu: { gm: [.35, .3], gp: [.66, .3] }, yard: { gp: [.72, .3], gm: [.2, .16] }, futon: { gm: [.34, .33], gp: [.75, .3] } };

  // ---------------------------------------------------------------- state
  const fresh = () => ({ started: false, t: 0, clock: 0, view: 'station', fade: 0, wind: 1, outdoor: 1, scarf: 1, door: 0, hug: 0, stove: 0, steam: 0,
    ball: null, quilt: 0, ending: null, treat: null, at: { gm: null, gp: null }, lv: { gm: 0, gp: 0 }, talk: { gm: 0, gp: 0 }, focus: null });
  let S = fresh(), run = 0;

  // ---------------------------------------------------------------- subtitles + voice
  const subJa = $('subJa'), subEn = $('subEn'), subs = $('subs');
  const WHO = { gm: 'ばあば', gp: 'じいじ' };
  function sub(id) {
    if (!id) { subJa.textContent = subEn.textContent = ''; subs.classList.remove('show'); return; }
    const [who, ja, en] = LINES[id];
    subJa.innerHTML = `<span class="who ${who}">${WHO[who]}</span>`; subJa.append(ja); subEn.textContent = en; subs.classList.add('show');
  }
  const alive = (my) => { if (my !== run) throw new Error('stopped'); };
  async function say(id, where, gain) {
    const my = run, who = LINES[id][0];
    sub(id); S.at[who] = where; S.talk[who]++; S.focus = who;
    await SND.say(id, who, where, gain ?? (where.dist < .25 ? 1.8 : where.dist > 3 ? 1.7 : 1.45)); S.talk[who]--;
    alive(my); await sleep(.35); sub(null);
  }

  // ---------------------------------------------------------------- your turn: choices, actions, hold (as Demo28)
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

  // ---------------------------------------------------------------- the story
  // chapters for the shared control bar (shared/shell.js, DEMO_DESIGN_GUIDE §7.3): the numbered sections of story() below
  let chap = 0;
  if (window.MoHeatShell) { MoHeatShell.chapters = [{ label: 'The station', ja: '雪の駅', en: 'The station', zh: '雪中车站' }, { label: 'The genkan', ja: '玄関', en: 'The genkan', zh: '玄关' }, { label: 'The kotatsu', ja: 'こたつ', en: 'The kotatsu', zh: '被炉' }, { label: 'The snowy garden', ja: '雪の庭', en: 'The snowy garden', zh: '雪中庭院' }, { label: 'At the pillow', ja: 'おふとん', en: 'At the pillow', zh: '枕边' }]; MoHeatShell.current = () => chap; }
  async function story() {
    const my = ++run;
    chap = 0;
    try {
      // 1 · the snowy little station at dusk: the train leaves behind you, the wind blows in from the open left side, grandpa waves
      S.view = 'station';
      const wind = SND.loop('wind'), snow = SND.loop('snow');
      wind?.at(-1.3, 3); wind?.set(.35, 1); snow?.set(.15, 2); SND.fx.train();
      await sleep(2.4); alive(my);
      await say('p01', { az: .3, dist: 6 });
      SND.fx.steps(.3, .22, 7, .38, 5, 1, true); await sleep(2.6); alive(my);
      await say('p02', { az: .22, dist: .9 });
      S.treat = null;
      const hi = await choice([['ただいま！', "I'm home!", 'ただいま|ただいまー|im home|home|我回来了'], ['迎えに来てくれたの？', 'You came to pick me up?', 'むかえ|迎え|pick me up|came|来接我']]);
      await say(hi ? 'p03b' : 'p03a', { az: .22, dist: .9 });
      await say('p04', { az: .3, dist: 1 });

      chap = 1;
      // 2 · the genkan: the door slides open, warm air from the house, grandma's hug at your left ear
      SND.fx.steps(.1, .1, 6, .4, 1, 1, true); S.outdoor = .6; wind?.set(.18, 1.5); await sleep(1.6); alive(my);
      S.view = 'genkan'; SND.fx.door(0, 1.4); S.door = 1; S.wind = .5; await sleep(.9); alive(my);
      SND.fx.steps(-.2, -.4, 5, .22, 3, 1); await sleep(.4);
      await say('g01', { az: -.3, dist: 2.6 });
      S.hug = 1; SND.fx.rustle(-1.2, .15); await sleep(.3); alive(my);
      await say('g02', { az: -1.3, dist: .14 });
      await action('🏠', '「ただいま」と言う', 'Say "I\'m home"', 'ただいま|ただいまー|im home|home|我回来了|回来了');
      S.hug = 0;
      await say('g03', { az: -.35, dist: .6 });

      chap = 2;
      // 3 · the kotatsu: the kerosene stove on your right, a steaming bowl of oshiruko held out to you
      SND.fx.door(0, 2.5); S.door = 0; S.outdoor = 0; S.wind = 0; wind?.set(0, 1); snow?.set(0, 1); await sleep(.6); alive(my);
      S.view = 'kotatsu'; const stove = SND.loop('stove'); stove?.set(.3, 1.5); S.stove = 1; await sleep(.8); alive(my);
      S.steam = 1;
      await say('g04', { az: -.35, dist: .9 });
      await hold('🥣', 'ふーふーする（長押し）', 'Blow on it (press and hold)', 2.6, (on, k) => { if (on && Math.random() < .03) SND.fx.blow(); S.steam = on ? 1 + .6 * k : 1; });
      S.steam = .6;
      await say('p05', { az: .35, dist: .9 });
      S.treat = await choice([['みかん、ちょうだい', 'A mandarin, please', 'みかん|蜜柑|mandarin|orange|橘子|桔子'], ['おしるこ、おかわり！', 'More oshiruko!', 'おしるこ|おかわり|more|seconds|红豆汤|再来一碗']]);
      if (S.treat === 0) await say('p06a', { az: .35, dist: .8 }); else await say('g05b', { az: -.35, dist: .9 });
      await say('g06', { az: -.35, dist: .9 });

      chap = 3;
      // 4 · next morning in the snowy garden: grandpa's snowball whizzes past your right ear; you throw one back
      S.view = 'yard'; S.stove = 0; S.steam = 0; stove?.set(0, 1); S.outdoor = 1; S.wind = .5; wind?.at(-.8, 5); wind?.set(.15, 1.5); snow?.set(.2, 1.5);
      await sleep(1.2); alive(my);
      await say('p07', { az: .45, dist: 2 });
      await say('p08', { az: .45, dist: 2 });
      S.ball = { t0: S.clock }; SND.fx.whoosh(); await sleep(1.4); S.ball = null; alive(my);
      await say('p09', { az: .45, dist: 2 });
      await action('⛄', '雪玉を投げ返す', 'Throw one back', 'なげる|投げる|投げ返す|throw|throw it back|扔回去|扔');
      SND.fx.thud(.45, 2); await sleep(.4);
      await say('p10', { az: .45, dist: 2 });
      await say('g07', { az: -.7, dist: 6 });

      chap = 4;
      // 5 · night: grandma's story at your pillow (left), grandpa snoring next door (right); the quilt up to your ears
      S.view = 'futon'; S.outdoor = 0; S.wind = 0; wind?.set(0, 1.5); snow?.set(0, 1.5); const snore = SND.loop('snore'); snore?.set(.35, 2);
      await sleep(1.6); alive(my);
      await say('g08', { az: -1.25, dist: .22 });
      await say('g09', { az: -1.25, dist: .22 });
      SND.fx.quilt(); S.quilt = 1; await sleep(.4);
      await say('g10', { az: -1.25, dist: .2 });
      await say('g11', { az: -1.3, dist: .16 });
      S.ending = await choice([['また来るね', "I'll come again", 'またくる|また来る|come again|again|还会再来|再来'], ['ずっとここにいたい', 'I want to stay here forever', 'ずっと|いたい|stay|forever|一直|不想走']]);
      await say(S.ending ? 'g12b' : 'g12a', { az: -1.3, dist: .14 });
      snore?.set(.15, .5); await say('p11', { az: 1.25, dist: 4 }); snore?.set(.35, 1);
      await say('g13', { az: -1.35, dist: .12 });
      await sleep(1.5); S.fade = 1; SND.fx.chime(); await sleep(3.5); alive(my); finish();
    } catch (e) { if (e.message !== 'stopped') console.error(e); }
  }

  // ---------------------------------------------------------------- per-frame state + thermal
  const K = { wind: 1, outdoor: 1, door: 0, hug: 0, stove: 0, steam: 0, quilt: 0 }, TAU = { wind: 1, outdoor: 1.5, door: .8, hug: .4, stove: 2, steam: .6, quilt: 2.5 };
  function update(dt) {
    S.t += dt; if (!S.started) return;
    S.clock += dt; S.lv.gm = SND.voiceLevel('gm'); S.lv.gp = SND.voiceLevel('gp');
    for (const k in K) K[k] += (S[k] - K[k]) * (1 - Math.exp(-dt / TAU[k]));
  }
  // Thermal, two layers (firmware DUAL: cool and heat independent on each ear).
  //  · VOICE (DEMO_DESIGN_GUIDE §3): (0.1 + 0.8 × loudness) at the ear they speak at — × 1 at your ear, × 0.6 within 50 cm, × 0.28 further;
  //    halved straight in front. Grandpa shouting from 6 m is barely warm; grandma's whispers at your left ear are the warmest.
  //  · AMBIENT (real things by your ears): the winter air outdoors (cool, both ears) and the station wind from the open left side (with
  //    gusts); the red scarf round your neck (mild warmth, both ears); the warm air from the open genkan door in front; grandma's cheek
  //    on your left ear in the hug; the kerosene stove on your right; the steaming bowl held up to your face; grandpa's snowball
  //    whizzing past your right ear; the quilt tucked up to both ears. Not heated: the kotatsu (it warms your legs, not your ears).
  function sources() {
    const out = [], add = (az, k, s, icon) => { if (s > .01) out.push({ az, k, s, icon }); };
    if (!S.started) return out;
    const vf = (P, lv) => (.1 + .8 * clamp(lv * 8)) * (P.dist < .15 ? 1 : P.dist <= .5 ? .6 : .28) * (Math.abs(P.az) < .5 ? .5 : 1);
    for (const w of ['gm', 'gp']) if (S.talk[w] && S.at[w]) add(S.at[w].az, 'h', vf(S.at[w], S.lv[w]), w === 'gm' ? '👵' : '👴');
    add(-1.5, 'c', .16 * K.outdoor, '❄️'); add(1.5, 'c', .16 * K.outdoor, '❄️');
    const gust = .75 + .25 * Math.sin(S.t * .9) * Math.sin(S.t * .37);
    if (S.view === 'station' || S.view === 'genkan') add(-1.35, 'c', .4 * K.wind * gust, '🌬');
    else add(-.8, 'c', .18 * K.wind * gust, '🌬');
    if (K.outdoor > .05 && S.scarf) { add(-1.5, 'h', .1 * K.outdoor, '🧣'); add(1.5, 'h', .1 * K.outdoor, '🧣'); }
    add(0, 'h', .3 * K.door, '🏠');
    add(-1.35, 'h', .25 * K.hug, '🤗');
    add(1.2, 'h', .42 * K.stove * (.92 + .08 * Math.sin(S.t * 3.1)), '🔥');
    add(0, 'h', .22 * K.steam, '♨️');
    if (S.ball) { const u = (S.clock - S.ball.t0) / .7; if (u < 1) add(1.4, 'c', .85 * Math.sin(Math.PI * clamp(u * 1.2)), '⛄'); }
    add(-1.5, 'h', .2 * K.quilt, '🛏'); add(1.5, 'h', .2 * K.quilt, '🛏');
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

  // ---------------------------------------------------------------- drawing: stills + staging (L0) + code effects (L1)
  let viewA = 'station', viewB = 'station', mix = 1, push = 0, fx = .5, fy = .4;
  function drawView(view, alpha, t, focusOn) {
    const im = IMG[view]; ctx.globalAlpha = alpha;
    if (!im) { ctx.fillStyle = '#20160f'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; return; }
    const z = 1.03 + .008 * Math.sin(t * .5) + (focusOn ? .035 * push : 0), cx = focusOn ? lerp(.5, fx, push * .5) : .5, cy = focusOn ? lerp(.5, fy, push * .5) : .5;
    ctx.save(); ctx.translate(W * cx, H * cy); ctx.scale(z, z); ctx.translate(-W * cx, -H * cy + 3 * Math.sin(t * .9));
    ctx.drawImage(im, 0, 0, W, H); ctx.restore(); ctx.globalAlpha = 1;
  }
  const flakes = Array.from({ length: 140 }, () => ({ x: Math.random() * W, y: Math.random() * H, v: 50 + Math.random() * 80, r: 1.5 + Math.random() * 3.5, p: Math.random() * 6 }));
  const steamP = Array.from({ length: 24 }, () => ({ life: 0 }));
  function draw(t, dt) {
    if (S.view !== viewB) { viewA = viewB; viewB = S.view; mix = 0; push = 0; }
    mix = Math.min(1, mix + dt / .8);
    // the push-in toward whoever is speaking (VN staging)
    const talker = S.talk.gm ? 'gm' : S.talk.gp ? 'gp' : null, f = talker && FACE[S.view]?.[talker];
    if (f) { fx += (f[0] - fx) * Math.min(1, dt * 2); fy += (f[1] - fy) * Math.min(1, dt * 2); }
    push += ((f ? 1 : 0) - push) * Math.min(1, dt * 1.2);
    if (mix < 1) drawView(viewA, 1, t, false);
    drawView(viewB, mix, t, true);
    const out = S.view === 'station' || S.view === 'yard' || S.view === 'genkan';
    if (out) {   // falling snow, blown to the right by the station wind
      const drift = S.view === 'station' ? 140 : S.view === 'genkan' ? 40 : 30;
      ctx.fillStyle = `rgba(255,255,255,${S.view === 'genkan' ? .45 : .8})`; ctx.beginPath();
      for (const fl of flakes) { fl.y += fl.v * dt; fl.x += (drift + 25 * Math.sin(t + fl.p)) * dt; if (fl.y > H) { fl.y = -10; fl.x = Math.random() * W; } if (fl.x > W + 20) fl.x -= W + 40;
        if (S.view === 'genkan' && fl.x > W * .2 && fl.x < W * .8) continue; ctx.moveTo(fl.x + fl.r, fl.y); ctx.arc(fl.x, fl.y, fl.r, 0, 7); }
      ctx.fill();
    }
    if (K.door > .05 && S.view === 'genkan') { const g = ctx.createRadialGradient(W * .5, H * .45, 50, W * .5, H * .45, 900); g.addColorStop(0, `rgba(255,170,90,${.18 * K.door})`); g.addColorStop(1, 'rgba(255,170,90,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    if (S.view === 'kotatsu') {
      const fl = .8 + .2 * Math.sin(t * 5.3) * Math.sin(t * 2.1), g = ctx.createRadialGradient(W * .93, H * .6, 40, W * .93, H * .6, 700);   // stove glow from the right edge
      g.addColorStop(0, `rgba(255,140,60,${.25 * fl * K.stove})`); g.addColorStop(1, 'rgba(255,140,60,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      if (K.steam > .05) for (const p of steamP) {   // steam rising from the bowl toward your face (bottom centre)
        if (p.life <= 0) { p.x = W * (.27 + Math.random() * .08); p.y = H * .56; p.vx = (Math.random() - .5) * 30; p.life = 1.6 + Math.random(); p.r = 30 + Math.random() * 30; }
        p.life -= dt; p.y -= 70 * dt * K.steam; p.x += p.vx * dt; const a = clamp(p.life / 2.5) * .22 * clamp(K.steam);
        const g2 = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * (2 - p.life / 2)); g2.addColorStop(0, `rgba(255,255,255,${a})`); g2.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g2; ctx.fillRect(p.x - 150, p.y - 150, 300, 300);
      }
    }
    if (S.ball) {   // grandpa's snowball, growing as it flies past the right side of your head
      const u = clamp((S.clock - S.ball.t0) / .6), x = lerp(W * .6, W * 1.15, u * u), y = lerp(H * .2, H * .3, u), r = lerp(14, 220, u * u);
      ctx.fillStyle = 'rgba(250,252,255,.95)'; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    }
    if (S.view === 'futon') {   // the andon flicker + the quilt rising at the bottom of the frame
      const fl = .85 + .15 * Math.sin(t * 4.1) * Math.sin(t * 1.7), g = ctx.createRadialGradient(W * .06, H * .47, 30, W * .06, H * .47, 800);
      g.addColorStop(0, `rgba(255,190,110,${.12 * fl})`); g.addColorStop(1, 'rgba(255,190,110,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      if (K.quilt > .02) { const g2 = ctx.createLinearGradient(0, H, 0, H * (1 - .3 * K.quilt)); g2.addColorStop(0, 'rgba(120,60,50,.85)'); g2.addColorStop(1, 'rgba(120,60,50,0)'); ctx.fillStyle = g2; ctx.fillRect(0, H * (1 - .3 * K.quilt), W, H * .3 * K.quilt); }
    }
    if (S.fade) { S.fadeA = Math.min(1, (S.fadeA || 0) + dt / 3); ctx.fillStyle = `rgba(14,9,6,${S.fadeA})`; ctx.fillRect(0, 0, W, H); }
  }

  // ---------------------------------------------------------------- side panel + device (same protocol as every demo)
  const rc = $('radar').getContext('2d');
  function radar(src, th) {
    const cx = 240, cy = 220, R = 160; rc.clearRect(0, 0, 480, 420);
    rc.strokeStyle = 'rgba(255,255,255,.08)'; rc.lineWidth = 1.5; for (const r of [R * .5, R]) { rc.beginPath(); rc.arc(cx, cy, r, 0, 7); rc.stroke(); }
    rc.fillStyle = '#b8a38f'; rc.font = '600 13px Inter'; rc.textAlign = 'center'; rc.fillText('front', cx, cy - R - 10); rc.fillText('L', cx - R - 18, cy + 5); rc.fillText('R', cx + R + 18, cy + 5);
    for (const [e, sx] of [['L', -1], ['R', 1]]) {
      rc.fillStyle = '#3a2a1e'; rc.beginPath(); rc.ellipse(cx + sx * 46, cy, 12, 24, 0, 0, 7); rc.fill();
      for (const [k, col, dy] of [['h', '255,122,69', -12], ['c', '79,179,255', 12]]) if (th[e + k] > .02) { rc.fillStyle = `rgba(${col},${.25 + .75 * th[e + k]})`; rc.beginPath(); rc.ellipse(cx + sx * 46, cy + dy, 11, 12, 0, 0, 7); rc.fill(); }
    }
    rc.fillStyle = '#4a3726'; rc.beginPath(); rc.arc(cx, cy, 40, 0, 7); rc.fill();
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
  const PLACE = { station: 'the little station · dusk', genkan: 'the genkan', kotatsu: 'the kotatsu', yard: 'the garden · morning', futon: 'bedtime' };

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
  function finish() {
    S.started = false; run++; stopOutput();
    for (const k of ['wind', 'snow', 'stove', 'snore']) SND.loop(k)?.stop();
    sub(null); actEl.classList.remove('show'); choiceEl.classList.remove('show');
    const c = $('cleared'); c.hidden = false;
    c.textContent = S.ending ? '🏡 ここは、あんたの家じゃけん · This is your home' : '🏡 また来るね、待っとるけんね · Come again — we\'ll be waiting';
    $('startBtn').textContent = '↺ もう一度 · Play again'; $('intro').classList.remove('hidden');
    window.VISIT.done = true;
  }
  function start() {
    SND.init(); SND.loadVoices(Object.keys(LINES));
    S = fresh(); S.started = true; viewA = viewB = 'station'; mix = 1; for (const k in K) K[k] = S[k]; $('cleared').hidden = true;
    $('intro').classList.add('hidden'); window.VISIT.done = false;
    story();
  }
  $('startBtn').addEventListener('click', start);
  $('lrBtn').addEventListener('click', () => { SND.lrCheck(); const b = $('lrBtn'); b.textContent = '🎧 Left…'; setTimeout(() => { b.textContent = '🎧 …Right'; }, 900); setTimeout(() => { b.textContent = '🎧 Left / Right check'; }, 1900); });
  $('soundBtn').addEventListener('click', (e) => { SND.setMuted(!SND.isMuted()); e.target.textContent = SND.isMuted() ? '🔇' : '🔊'; });
  function drawCover() {   // cover standard (shared/cover.js): the genkan still (grandma rushing to hug you), her face on the standard spot
    const im = IMG.genkan || IMG.kotatsu, C = window.MoHeatCover; if (!im) { ctx.fillStyle = '#20160f'; ctx.fillRect(0, 0, W, H); return; }
    const pic = () => ctx.drawImage(im, 760, 0, W, H);
    if (C) C.fit(ctx, { eye: [.79, .31], face: .23 }, pic, { tone: '#20160f', covers: [.396, 0, 1.396, 1] }); else pic();
  }
  // testing: VISIT.peek('kotatsu') shows one scene without the story
  const peek = (v) => { run++; S = fresh(); S.started = true; S.view = v; viewA = viewB = v; mix = 1; $('intro').classList.add('hidden'); };
  window.VISIT = { get S() { return S; }, thermal: () => thermal(.05), both: () => both, log: cmdLog, done: false, peek };
  if (QS.has('cover')) { document.body.classList.add('cover-only'); artReady.then(drawCover); return; }
  if (QS.has('autoplay') || AUTO) { const ac = SND.init(); if (ac.state === 'running') start(); else ac.resume().then(() => { if (ac.state === 'running' && !S.started) start(); }).catch(() => {}); }
  requestAnimationFrame(loop);
})();
