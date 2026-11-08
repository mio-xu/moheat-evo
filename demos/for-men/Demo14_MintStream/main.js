// 『ミントの、おみみ専門店』 — Mint (白深ミント, original character), 20, calm and sleepy, the one MoHeat live stream (user 2026-11-08:
// keep one stream, make it richer, the form may change). Tonight she streams a role-play: her little "ear salon". Her binaural dummy
// head 「みみくん」 is your head; the chat votes which ear first and orders treatments by Super Chat: warm hands, a steamed towel or a
// chilled spoon, ear cleaning, a warm stone or her mint-balm breath, a cool mist, then a lullaby or a secret, and goodnight.
// DUAL thermal: her whisper is always warm at the ear she leans to; the treatments are the ambient layer — often cool and warm on the
// same ear at once (mint breath while she whispers, the spoon while she talks). Built on Demo17 Cocoa's main.js (Demo31 / Demo25
// framework); art = the layered standard (media/layers.js + shared/layers.js); a light stream overlay (LIVE, viewers, chat, Super Chats).
(() => {
  const $ = (id) => document.getElementById(id);
  const QS = new URLSearchParams(location.search);
  const SND = window.HTAudio, LINES = window.MINT_LINES, W = 1920, H = 1080;
  const AUTO = QS.has('auto');   // testing: every choice / action answers itself after a moment (?alt = take the other branch)
  const ALT = QS.has('alt');
  const cv = $('scene'), ctx = cv.getContext('2d'), stage = $('stage');
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const sleep = (s) => new Promise((r) => setTimeout(r, s * 1000));
  const T = (en) => { const M = window.MoHeatSub; return (M && M.lang !== 'en' && M.tr(en, M.lang, false)) || en; };   // overlay labels in the viewer's language (l10n.js)

  // ---------------------------------------------------------------- art: one still per view (layered: shared/layers.js draws the live composite)
  const VIEWS = ['greet', 'towel', 'spoon', 'earL', 'earR', 'lullaby', 'goodnight'];
  const IMG = {};
  const artReady = Promise.all(VIEWS.map((n) => new Promise((res) => { const im = new Image(); im.onload = () => { IMG[n] = im; res(); }; im.onerror = () => res(); im.src = `media/art/mint_${n}.jpg?v=1`; })));

  // ---------------------------------------------------------------- state
  const fresh = () => ({ started: false, t: 0, clock: 0, view: 'greet', side: 1, hand: 0, towel: 0, spoon: 0, stone: 0, breath: 0, mist: 0,
    blanket: 0, scratch: 0, fade: 0, lv: 0, env: 0, pos: { az: 0, dist: .5 }, end: 0 });
  let S = fresh(), run = 0;
  const STEPS = [['greet', 'ご来店', 'Welcome'], ['earL', 'ほぐす', 'Ear massage'], ['earR', 'おみみかき', 'Ear cleaning'],
    ['earL', '反対のおみみ', 'The other ear'], ['goodnight', 'ねかしつけ', 'Goodnight']];
  function setStep(i) { $('steps').innerHTML = STEPS.map((s, k) => `<li class="${k < i ? 'done' : k === i ? 'now' : ''}">${s[1]} · <small>${s[2]}</small></li>`).join(''); }

  // ---------------------------------------------------------------- the stream overlay: LIVE badge, viewers, chat, Super Chats
  // viewers write in their own languages (the old stream rooms did the same) — the chat is ambience, not translated.
  const live = document.createElement('div'); live.className = 'live'; live.innerHTML = '<b>● LIVE</b><span id="viewers">0</span>';
  const chat = document.createElement('div'); chat.className = 'chat'; chat.id = 'chat';
  stage.append(live, chat);
  const NAMES = ['ねむねむ', 'yuu', '夜ふかし', 'mimi_fan', 'Haru', 'すやすや', 'Leo', '月見', 'ゆき', 'kaito', 'Mei', 'ぽよ', 'Sam_TW', '星屑', 'Rin'];
  const IDLE = ['こんばんは〜', 'ミントちゃんの声すき', 'ねむい…', '耳がしあわせ', 'good evening from LA 🌙', '今日もおつかれさま', 'ASMR助かる',
    '声ちっちゃくてかわいい', 'みみくん羨ましい', '晚上好～', '사랑해요 민트', 'so relaxing', '明日も仕事だけど聞く', 'zzz', '🌿🌿🌿', 'buenas noches'];
  let viewers = 1284;
  function say_(name, text, sc) {   // one chat line (sc: a Super Chat amount → a coloured card)
    const p = document.createElement('p'); if (sc) p.className = 'sc';
    p.innerHTML = sc ? `<b>${name} · ${sc}</b><span>${text}</span>` : `<b>${name}</b> ${text}`;
    chat.append(p); while (chat.children.length > 9) chat.firstChild.remove();
  }
  const pick = (a) => a[Math.random() * a.length | 0];
  let chatT = 0;
  function chatTick(dt) {
    if (!S.started) return;
    chatT -= dt; if (chatT <= 0) { chatT = 1.6 + Math.random() * 2.6; say_(pick(NAMES), pick(IDLE)); }
    viewers += Math.round((Math.random() - .45) * 6); $('viewers').textContent = `${viewers.toLocaleString()} ${T('watching')}`;
  }
  const flood = (texts, n = 4) => { for (let i = 0; i < n; i++) setTimeout(() => S.started && say_(pick(NAMES), pick(texts)), 250 + i * 380); };

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
  // ear cleaning: hold still (press and hold); let go part-way and she stops you once (m08x) → resolves when she has finished
  function stillHold(sec, onNudge) {
    return new Promise((res) => {
      actEl.innerHTML = `<button class="act-btn hold"><i>🌿</i><b>動かない（長押し）</b><span>Stay still (press and hold)</span><em class="bar"><u></u></em></button>`; actEl.classList.add('show');
      const b = actEl.querySelector('button'), bar = b.querySelector('u'); let down = false, k = 0, upFor = 0, nudged = false, last = performance.now(); const t0 = last;
      const autoLet = AUTO && ALT;
      const set = (v) => (e) => { e?.preventDefault?.(); down = v; b.classList.toggle('down', v); };
      b.addEventListener('pointerdown', set(true)); for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, set(false));
      const key = (v) => (e) => { if (e.code === 'Space') { e.preventDefault(); down = v; b.classList.toggle('down', v); } };
      const kd = key(true), ku = key(false); addEventListener('keydown', kd); addEventListener('keyup', ku);
      const P_ = SND.loop('scratch'); P_?.at(1.35 * S.side, .08);
      const tick = () => {
        const n = performance.now(), dt = (n - last) / 1000; last = n;
        const holding = down || (AUTO && !(autoLet && !nudged && k > .4 && upFor < .8)) || n - t0 > 20000;
        if (holding) { k = Math.min(1, k + dt / sec); upFor = 0; } else if (k > .05) upFor += dt;
        P_?.set(holding ? .55 : 0, .05); S.scratch = holding ? 1 : 0;
        bar.style.width = `${k * 100}%`;
        if (upFor > .6 && !nudged) { nudged = true; onNudge?.(); }
        if (k >= 1) { removeEventListener('keydown', kd); removeEventListener('keyup', ku); P_?.stop(); S.scratch = 0; actEl.classList.remove('show'); actEl.innerHTML = ''; res(); return; }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  // ---------------------------------------------------------------- the story
  // where she is: beside the chair (in front), leaning to one ear (side: −1 left / +1 right)
  const NEAR = { az: 0, dist: .45 }, CLOSE = { az: 0, dist: .3 }, EAR = (s) => ({ az: 1.35 * s, dist: .12 });
  const earView = (s) => (s < 0 ? 'earL' : 'earR');
  async function story() {
    const my = ++run;
    try {
      // 1 · welcome: the salon at night, the chat says hi, the vote: which ear first
      setStep(0); S.view = 'greet';
      const room = SND.loop('room'); room?.set(.45, 1.5);
      flood(['こんばんは〜', '待ってた', 'きたー！', 'hi Mint 🌿', '今日はなに？'], 5);
      await sleep(1.6); alive(my);
      await say('m01', NEAR);
      await say('m02', NEAR);
      await say('m03', NEAR);
      flood(['みぎ！', 'ひだり', 'みぎで', 'left!', 'right pls', '左耳から〜'], 6);
      const v = await choice([['💬 みぎ', 'Right ear'], ['💬 ひだり', 'Left ear']]);
      S.side = v ? -1 : 1; const A = S.side, B = -S.side;

      // 2 · warm hands on ear A, then the first Super Chat menu: a steamed towel or a chilled spoon
      setStep(1);
      await go(null, earView(A), () => { SND.fx.rustle(1.2 * A, .2); });
      S.hand = 1; SND.fx.massage(A);
      await say('m04', EAR(A));
      await say('m05', EAR(A));
      S.hand = 0;
      const t = await choice([['💌 蒸しタオル', 'Super Chat: steamed towel'], ['💌 ひんやりスプーン', 'Super Chat: chilled spoon']]);
      say_(pick(NAMES), t ? 'ひんやりスプーンで！' : '蒸しタオルおねがいします', t ? '¥500' : '¥1,000');
      if (!t) {
        await go(null, 'towel', () => {});
        SND.fx.towel(); setTimeout(() => { if (my === run) S.towel = 1; }, 2600);   // "…ふたつのおみみに" — the towel goes on
        await say('m06t', CLOSE);
        await sleep(1.5);
      } else {
        await go(null, 'spoon', () => {});
        setTimeout(() => { if (my === run) { S.spoon = 1; SND.fx.tink(A); setTimeout(() => (S.spoon = 0), 2200); } }, 2900);   // "…ぴと"
        await say('m06s', EAR(A));
      }
      alive(my); await sleep(.4);

      // 3 · ear cleaning on ear A (hold still), then the second menu: a warm stone or her mint breath
      setStep(2);
      await go(null, earView(A), () => {});
      await say('m07', EAR(A));
      await stillHold(6, () => { if (my === run) say('m08x', EAR(A)).catch(() => {}); });
      alive(my);
      await say('m08', EAR(A));
      const m = await choice([['💌 温石', 'Super Chat: warm stone'], ['💌 ミントの吐息', 'Super Chat: mint breath']]);
      say_(pick(NAMES), m ? 'ミントの吐息ください…！' : '温石で', m ? '¥2,000' : '¥800');
      if (!m) { S.stone = 1; SND.fx.stone(A); await say('m09w', EAR(A)); }
      else {
        setTimeout(() => { if (my === run) { S.breath = 1; SND.fx.blow(A); setTimeout(() => (S.breath = 0), 1800); } }, 3300);   // "…ふぅー"
        await say('m09m', EAR(A));
      }
      alive(my); await sleep(.4);

      // 4 · roll over: ear B gets the same, then a cool mist on both
      setStep(3);
      await say('m10', EAR(A));
      await action('🛏️', '寝返り', 'Roll over', 15);
      S.stone = 0; SND.fx.rustle(0, .15); S.side = B;
      await go(null, earView(B), () => {});
      S.hand = 1; SND.fx.massage(B);
      await say('m11', EAR(B));
      // her warm hands leave ear B and the cool mist goes on at once, a quiet beat before she speaks again:
      // hot → cold on the same ear within ~2 s (DUAL showcase); then her whisper warms that ear again over the mist
      S.hand = 0; S.mist = 1; SND.fx.mist(); setTimeout(() => { if (my === run) S.mist = 0; }, 3000);
      await sleep(1.8); alive(my);
      await say('m12', EAR(B));
      alive(my); await sleep(.4);

      // 5 · goodnight: the chat is sleepy; a secret or a lullaby; the blanket; you say goodnight; the end of the stream
      setStep(4);
      await go(null, 'lullaby', () => {});
      flood(['ねむくなってきた', 'まぶたが重い…', 'zzz', 'sleepy…', 'おやすみ前に聞けてよかった'], 5);
      await say('m13', NEAR);
      const c = await choice([['💬 ひみつ、ききたい', 'Tell us a secret'], ['💬 子守唄、ききたい', 'Sing a lullaby']]);
      await go(null, earView(A), () => {}); S.side = A;
      await say(c ? 'm14b' : 'm14a', EAR(A));
      await go(null, 'goodnight', () => { S.blanket = 1; SND.fx.rustle(0, .2); });
      await say('m15', CLOSE);
      await action('🌙', 'おやすみ', 'Goodnight', 20);
      S.side = B;
      await say('m16', EAR(B));
      flood(['おやすみ〜', 'おやすみなさい', 'good night 🌙', '晚安', '잘 자요'], 6);
      S.end = await choice([['💬 また来るね', 'I\'ll come again'], ['💌 延長おねがい', 'Super Chat: an extension, please']]);
      if (S.end) say_(pick(NAMES), '延長おねがいします🙏', '¥10,000');
      await say(S.end ? 'm17b' : 'm17a', S.end ? EAR(B) : CLOSE);
      await sleep(2.2); S.fade = 1; room?.set(.1, 2.5); await sleep(3.2); alive(my); finish();
    } catch (e) { if (e.message !== 'stopped') console.error(e); }
  }

  // ---------------------------------------------------------------- per-frame state + thermal
  let handK = 0, towelK = 0, spoonK = 0, stoneK = 0, breathK = 0, mistK = 0, blanketK = 0, towelAge = 0;
  function update(dt) {
    S.t += dt; chatTick(dt); if (!S.started) return;
    S.clock += dt; S.lv = SND.voiceLevel();
    { const vt = talking ? 1 : 0; S.env += (vt - S.env) * (1 - Math.exp(-dt / (vt > S.env ? .06 : .3))); }   // talking envelope (shared/layers.js mouth)
    const ease = (cur, tgt, up, down) => cur + (tgt - cur) * (1 - Math.exp(-dt / (tgt > cur ? up : down)));
    handK = ease(handK, S.hand, .6, 1.2); spoonK = ease(spoonK, S.spoon, .12, .5); stoneK = ease(stoneK, S.stone, 1, 1.5);
    breathK = ease(breathK, S.breath, .12, .4); mistK = ease(mistK, S.mist, .1, .6); blanketK = ease(blanketK, S.blanket, 1.2, 2);
    if (S.towel) { towelAge += dt; if (towelAge > 22) S.towel = 0; } towelK = ease(towelK, S.towel ? 1 - .5 * Math.min(1, towelAge / 20) : 0, .4, 1.2);
  }
  // Thermal, two layers (firmware DUAL: cool and heat independent on each ear — CLAUDE.md, 2026-11-08).
  //  · VOICE: her whisper is warm at the ear she leans to — × 1 at the ear (12 cm), × 0.6 within 50 cm; halved straight in front.
  //  · AMBIENT (real things at the dummy head's ears): her warmed hands massaging one ear (warm 0.35), a steamed towel over both ears
  //    (warm 0.6, cooling to 0.3 over ~20 s), a chilled spoon touching one ear (cool 0.6, short), a warm stone by one ear (warm 0.4),
  //    her mint-balm breath on one ear (cool 0.45 — while her whisper warms the same ear: DUAL), a cool mist on both (0.55, right after her warm hands on ear B: a fast hot → cold), the blanket
  //    (both warm 0.2). Not heated: sleepiness, the chat.
  function sources() {
    const out = [], add = (az, k, s, icon) => { if (s > .01) out.push({ az, k, s, icon }); };
    if (!S.started) return out;
    const P = S.pos, sd = 1.35 * S.side;
    if (talking) add(P.az, 'h', (.1 + .8 * clamp(S.lv * 8)) * (P.dist < .15 ? 1 : P.dist <= .5 ? .6 : .28) * (Math.abs(P.az) < .5 ? .5 : 1), '💬');
    if (handK > .02) add(sd, 'h', .35 * handK, '🤲');
    if (towelK > .02) { add(-1.4, 'h', .6 * towelK, '♨️'); add(1.4, 'h', .6 * towelK, '♨️'); }
    if (spoonK > .02) add(sd, 'c', .6 * spoonK, '🥄');
    if (stoneK > .02) add(sd, 'h', .4 * stoneK, '🪨');
    if (breathK > .02) add(sd, 'c', .45 * breathK, '🌿');
    if (mistK > .02) { add(-1.4, 'c', .55 * mistK, '💧'); add(1.4, 'c', .55 * mistK, '💧'); }
    if (blanketK > .02) add(0, 'h', .2 * blanketK, '🧣');
    return out;
  }
  const ear = { Lc: 0, Lh: 0, Rc: 0, Rh: 0 };
  function thermal(dt) {   // sources → each ear's cool / heat (a source at the side reaches mostly that ear), eased like a real element
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
  let viewA = 'greet', viewB = 'greet', mix = 1;
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
    if (!im) { ctx.fillStyle = '#0f2226'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; return; }
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
    if (S.fade) { S.fadeA = Math.min(1, (S.fadeA || 0) + dt / 3); ctx.fillStyle = `rgba(8,18,22,${S.fadeA})`; ctx.fillRect(0, 0, W, H); }
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
  const PLACE = { greet: 'the salon · beside the chair', towel: 'the salon · steamed towel', spoon: 'the salon · chilled spoon',
    earL: 'the salon · at your left ear', earR: 'the salon · at your right ear', lullaby: 'the salon · lullaby', goodnight: 'the salon · goodnight' };

  // ---------------------------------------------------------------- loop / start / end
  let last = performance.now(), hidden = false;
  function loop() {
    const n = performance.now(), dt = clamp((n - last) / 1000, 0, .05); last = n;
    if (!hidden) {
      update(dt);
      if (S.started || S.fade) draw(S.t, dt); else drawCover();
      const { th, src } = thermal(dt); output(th, S.started); radar(S.started ? src : [], th);
      $('clock').textContent = fmt(S.clock);
      $('posInfo').textContent = S.started ? T(PLACE[S.view]) : '';
      chat.classList.toggle('left', S.started && S.view === 'earR');   // keep her face clear
    }
    requestAnimationFrame(loop);
  }
  document.addEventListener('visibilitychange', () => { hidden = document.hidden; if (hidden) { stopOutput(); SND.ctx()?.suspend(); } else { last = performance.now(); SND.ctx()?.resume(); } });
  document.addEventListener('keydown', (e) => { if (e.code === 'Escape') emergencyStop(); });
  function finish() {   // the stream ends; back to this demo's own cover (user: never an "ended / next demo" card)
    S.started = false; S.fade = 0; S.fadeA = 0; run++; stopOutput();   // fade cleared, or the loop keeps drawing the black fade over the cover
    for (const k of ['room', 'scratch']) SND.loop(k)?.stop();
    sub('', ''); actEl.classList.remove('show'); choiceEl.classList.remove('show'); chat.innerHTML = '';
    const c = $('cleared'); c.hidden = false;
    c.textContent = S.end ? '🌙 あなたが眠るまで。 · Until you fall asleep' : '🌙 またのご来店を。 · See you at the salon';
    $('startBtn').textContent = '↺ もう一度 · Play again'; $('intro').classList.remove('hidden');
    window.MINT.done = true;
  }
  function start() {
    SND.init(); SND.loadVoices(Object.keys(LINES));
    S = fresh(); S.started = true; viewA = viewB = 'greet'; mix = 1; cur = null; pending = null; viewers = 1284; chat.innerHTML = '';
    handK = towelK = spoonK = stoneK = breathK = mistK = blanketK = towelAge = 0; $('cleared').hidden = true;
    $('intro').classList.add('hidden'); window.MINT.done = false;
    story();
  }
  $('startBtn').addEventListener('click', start);
  $('lrBtn').addEventListener('click', () => { SND.lrCheck(); const b = $('lrBtn'); b.textContent = '🎧 Left…'; setTimeout(() => { b.textContent = '🎧 …Right'; }, 900); setTimeout(() => { b.textContent = '🎧 Left / Right check'; }, 1900); });
  $('soundBtn').addEventListener('click', (e) => { SND.setMuted(!SND.isMuted()); e.target.textContent = SND.isMuted() ? '🔇' : '🔊'; });
  function drawCover() {   // the greeting still pushed right, the title on the dim salon on the left
    ctx.fillStyle = '#0f2226'; ctx.fillRect(0, 0, W, H);
    const im = IMG.greet; if (!im) return;
    ctx.drawImage(im, 560, 0, W, H);
    const g = ctx.createLinearGradient(480, 0, 1100, 0); g.addColorStop(0, 'rgba(15,34,38,1)'); g.addColorStop(1, 'rgba(15,34,38,0)'); ctx.fillStyle = g; ctx.fillRect(480, 0, 620, H);
  }
  window.MINT = { get S() { return S; }, thermal: () => thermal(.05), both: () => both, log: cmdLog, done: false };
  setStep(0);
  if (QS.has('cover')) { document.body.classList.add('cover-only'); artReady.then(drawCover); return; }
  if (QS.has('autoplay') || AUTO) { const ac = SND.init(); if (ac.state === 'running') start(); else ac.resume().then(() => { if (ac.state === 'running' && !S.started) start(); }).catch(() => {}); }
  requestAnimationFrame(loop);
})();
