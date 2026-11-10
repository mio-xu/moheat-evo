// 『ガクの、焚き火キャンプ配信 · Gaku's Campfire Stream』 — the for-women live-stream room (engine adapted from Demo14_MintStream/main.js).
// Gaku (26, original character): a strikingly handsome, cool and quiet solo-camping streamer who has no idea how good-looking he is.
// His phone streams from a tripod at his eye level with a binaural mic clipped under it = YOUR head: the campfire is on your RIGHT, the cold lake wind comes from your LEFT.
// Signature move: he sits down on your left to be your windbreak — the left ear's cold fades and his voice warms it instead.
// Thermal (firmware DUAL, cool and heat independent per ear), two layers:
//   VOICE  — his loudness (0.1 + 0.8 × envelope) warms the ear he is at: × 1 at the ear, × 0.6 within 30 cm, × 0.28 from the fire.
//   AMBIENT — only real warm / cold things next to the mic: fire (right), lake wind (left, gusting with its sound; his body / the
//             blanket blocks it), coffee steam or the opened sweet potato (front), snow on the mic, his blanket over the mic, his body
//             right beside it (mild). Nothing for being shy or being praised.
(() => {
  const $ = (id) => document.getElementById(id);
  const QS = new URLSearchParams(location.search), AUTO = QS.has('auto'), ALT = QS.has('alt');   // ?auto[&alt]: auto-pick the first [last] option (testing)
  const SND = window.StreamAudio, LINES = window.STREAM_LINES, W = 1920, H = 1080;
  const cv = $('scene'), ctx = cv.getContext('2d'), stage = $('stage');
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), rnd = (a, b) => a + Math.random() * (b - a), pick = (a) => a[Math.floor(Math.random() * a.length)];
  const sleep = (s) => new Promise((r) => setTimeout(r, (AUTO ? Math.min(s, 1.5) : s) * 1000));
  let run = 0;
  const after = (s, fn) => { const my = run; setTimeout(() => { if (my === run) fn(); }, s * 1000); };   // a timed cue inside a transition

  const CH = {
    name: '月嶋ガク', en: 'Tsukishima Gaku', title: '冬の湖畔で、焚き火キャンプ · Winter campfire by the lake', credit: 'ガク ElevenLabs', viewers: 8215,
    views: ['live', 'log', 'left', 'coffee', 'imo', 'blanket', 'whisper_R', 'bye'],
    steps: [['あいさつ', 'Say hi'], ['焚き火', 'Campfire'], ['風よけ', 'Windbreak'], ['差し入れ', 'Super Chat treat'], ['雪の夜', 'Snowy night']],
    pool: ['顔がいい', '顔面国宝…', 'ガクくん今日もかっこいい', '焚き火の音いい…', 'イヤホン推奨🎧', 'こっちも寒い❄', 'the face…', 'ASMRたすかる', '声ひくい…すき', 'キャンプ行きたい', '寝る前の楽しみ', 'インナーカラー見えた', 'pls look at the camera', '無口かわいい', '今日も無自覚イケメン', 'パチパチ癒し', 'good evening from Osaka', '湖きれい'],
  };
  const HANDLES = ['ゆず', 'mika_', 'こはる', 'Rin', 'ねむ子', 'sakura', 'もも', 'Aoi', 'しろ', 'hana', 'ちょこ', 'Mei', 'うさぎ', 'nana', 'つき', 'Yui', 'みかん', 'kaho'];
  const HCOL = ['#ffb3d1', '#a8e6cf', '#ffd59e', '#b8c6ff', '#e0b3ff', '#9fe3ff', '#ffc4a8'];
  const WORLD = [   // viewers from other countries (user 2026-11-08): about a third of the background chat, each in their own language
    ['Emily🇺🇸', "he's so handsome 😳"], ['小美🇨🇳', '好帅啊啊啊'], ['지민🇰🇷', '잘생겼다…'], ['Lucía🇪🇸', 'qué guapo 🔥'], ['Camille🇫🇷', 'trop beau…'],
    ['Sari🇮🇩', 'ganteng banget sih'], ['Trang🇻🇳', 'anh đẹp trai quá'], ['Fah🇹🇭', 'หล่อมากกก'], ['Júlia🇧🇷', 'que fogueira linda'], ['Lena🇩🇪', 'so gemütlich am Feuer'], ['小涵🇹🇼', '營火聲好療癒'],
  ];

  // ---------------------------------------------------------------- art (stills; video comes last)
  const IMG = {};
  const artReady = Promise.all(CH.views.map((n) => new Promise((res) => { const im = new Image(); im.onload = () => { IMG[n] = im; res(); }; im.onerror = () => res(); im.src = `media/art/gaku_${n}.jpg?v=3`; })));
  // where the campfire is in each picture (fraction of width / height) — sparks rise from here; steam spots for the treats
  const FIRE = { live: [.9, .74], log: [.76, .8], left: [.76, .62], coffee: [.92, .55], imo: [.92, .63], blanket: [.94, .63], whisper_R: [.95, .7], bye: [.74, .7] };
  const STEAM = { coffee: [.44, .6], imo: [.2, .62] };

  // ---------------------------------------------------------------- state
  const fresh = () => ({ started: true, t: 0, clock: 0, view: 'live', pos: { az: 0, dist: 1 }, lv: 0, env: 0,
    fire: .32, fireBase: .32, wind: .4, shield: 0, snow: 0, blanket: 0, mug: 0, imo: 0, fade: 0, viewers: CH.viewers });
  let S = { started: false, t: 0 }, mode = 'title';   // title | live | ended
  function setStep(i) { if (i > 0 && S.started) S.restUntil = S.clock + 1.2; S.step = i; $('steps').innerHTML = CH.steps.map((s, k) => `<li class="${k < i ? 'done' : k === i ? 'now' : ''}">${s[0]} · <small>${s[1]}</small></li>`).join(''); }

  // ---------------------------------------------------------------- subtitles + his voice
  const subJa = $('subJa'), subEn = $('subEn'), subs = $('subs');
  function sub(ja, en) { subJa.textContent = ja || ''; subEn.textContent = en || ''; subs.classList.toggle('show', !!ja); }
  let talking = 0;
  async function say(id, pause = .35) {
    const my = run; const [ja, en, style] = LINES[id];
    sub(ja, en); talking++;
    await SND.say(id, S.pos, style === 'w' ? 1.6 : 1.4);
    talking--; if (my !== run) throw new Error('stopped');
    await sleep(pause); sub('', '');
  }
  function at(az, dist) { S.pos = { az, dist }; SND.moveVoice(az, dist); }
  const guard = (my) => { if (my !== run) throw new Error('stopped'); };

  // ---------------------------------------------------------------- live chat
  const list = $('chatList');
  function chat(name, text, kind = '', col = pick(HCOL)) {
    const li = document.createElement('li'); li.className = kind;
    if (kind.startsWith('sc')) li.innerHTML = `<span class="sc-top"><b>${name}</b><em>${kind.split(' ')[1] || ''}</em></span><span class="sc-msg">${text}</span>`;
    else li.innerHTML = `<b style="color:${kind === 'you' ? '' : col}">${name}</b> <span>${text}</span>`;
    list.appendChild(li); while (list.children.length > 40) list.firstChild.remove();
    requestAnimationFrame(() => li.classList.add('in'));
  }
  let botT = 2;
  function bots(dt) {
    if (mode !== 'live') return;
    botT -= dt; if (botT > 0) return;
    botT = rnd(1.3, 3.4); { const [who, msg] = Math.random() < .35 ? pick(WORLD) : [pick(HANDLES), pick(CH.pool)]; chat(who, msg); } if (Math.random() < .3) SND.fx.pop();
  }
  function react(msgs, n = 4) { for (let i = 0; i < n; i++) setTimeout(() => { if (mode === 'live') { chat(pick(HANDLES), msgs[i % msgs.length]); hearts(2); } }, 300 + i * rnd(350, 700)); }
  function hearts(n = 3) {
    const box = $('hearts');
    for (let i = 0; i < n; i++) setTimeout(() => {
      const h = document.createElement('i'); h.textContent = pick(['🔥', '💚', '🤍', '✨', '💗']);
      h.style.left = `${rnd(0, 70)}%`; h.style.animationDuration = `${rnd(2.4, 3.6)}s`; box.appendChild(h); setTimeout(() => h.remove(), 3800);
      SND.fx.heart();
    }, i * 140);
  }

  // ---------------------------------------------------------------- your turn: comment chips, Super Chat, actions
  const chips = $('chips'), hint = $('chatHint'), chatIn = $('chatInput');
  function comment(ja, en, opts, timeout = 22) {
    return new Promise((res) => {
      hint.innerHTML = `${ja} <small>${en}</small>`;
      chips.innerHTML = opts.map((o, i) => `<button class="chip-c" data-i="${i}"><b>${o[0]}</b><span>${o[1]}</span></button>`).join('');
      chatIn.classList.add('turn');
      const done = (i) => { clearTimeout(tm); chatIn.classList.remove('turn'); chips.innerHTML = ''; hint.innerHTML = ''; chat('YOU', opts[i][0], 'you'); SND.fx.you(); hearts(2); res(i); };
      chips.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => done(+b.dataset.i)));
      const tm = setTimeout(() => done(ALT ? opts.length - 1 : 0), (AUTO ? 1.2 : timeout) * 1000);
    });
  }
  function gift(ja, en, opts, timeout = 25) {   // opts: [icon, ja, en, price]
    return new Promise((res) => {
      hint.innerHTML = `💝 ${ja} <small>${en}</small>`;
      chips.innerHTML = opts.map((o, i) => `<button class="chip-c gift" data-i="${i}"><b>${o[0]} ${o[1]}</b><span>${o[2]} · ${o[3]}</span></button>`).join('');
      chatIn.classList.add('turn', 'giving'); $('giftBtn').classList.add('pulse');
      const done = (i) => {
        clearTimeout(tm); chatIn.classList.remove('turn', 'giving'); $('giftBtn').classList.remove('pulse'); chips.innerHTML = ''; hint.innerHTML = ''; $('giftBtn').onclick = null;
        const o = opts[i]; chat('YOU', `${o[0]} ${o[1]} · ${o[2]}`, `sc ${o[3]} gaku`); SND.fx.superchat(); hearts(8); res(i);
      };
      chips.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => done(+b.dataset.i)));
      $('giftBtn').onclick = () => done(0);
      const tm = setTimeout(() => done(ALT ? opts.length - 1 : 0), (AUTO ? 1.2 : timeout) * 1000);
    });
  }
  function hold(icon, ja, en, secs = 1.6, timeout = 22) {   // press and hold (mouse / touch / Space)
    return new Promise((res) => {
      const el = $('act'); el.innerHTML = `<button class="act-btn hold"><i>${icon}</i><b>${ja}</b><span>${en}</span></button>`; el.classList.add('show');
      const b = el.querySelector('button'); let t0 = 0, raf = 0;
      const done = () => { clearTimeout(tm); cancelAnimationFrame(raf); el.classList.remove('show'); el.innerHTML = ''; removeEventListener('keydown', kd); removeEventListener('keyup', ku); hearts(4); res(); };
      const tick = () => { const p = clamp((performance.now() - t0) / (secs * 1000)); b.style.setProperty('--p', p); if (p >= 1) done(); else raf = requestAnimationFrame(tick); };
      const down = (e) => { e.preventDefault?.(); if (t0) return; t0 = performance.now(); tick(); };
      const up = () => { if (!t0) return; t0 = 0; cancelAnimationFrame(raf); b.style.setProperty('--p', 0); };
      const kd = (e) => { if (e.code === 'Space') down(e); }, ku = (e) => { if (e.code === 'Space') up(); };
      b.addEventListener('pointerdown', down); b.addEventListener('pointerup', up); b.addEventListener('pointerleave', up);
      addEventListener('keydown', kd); addEventListener('keyup', ku);
      const tm = setTimeout(done, (AUTO ? 1.2 : timeout) * 1000);
    });
  }

  // ---------------------------------------------------------------- the stream
  async function story(my) {
    S.view = 'live'; at(0, 1); setStep(0);
    await sleep(1.4); guard(my);
    await say('g01', .5);
    react(['きた！', '映ってるよ〜', '顔がいい', 'こんばんは！'], 4);
    await say('g02');
    react(['顔面国宝…', 'the face 😭', '今日もイケメン', 'かっこよすぎる'], 4); await sleep(1.2);
    await say('g03');
    react(['照れてる', '無自覚かわいい', 'はーい焚き火見ます🔥'], 3);
    const hi = await comment('ガクにあいさつしよう', 'Say hi to Gaku', [['はじめまして！', 'First time here!'], ['こんばんは〜', 'Good evening~']]);
    await sleep(.6); await say(hi ? 'g04b' : 'g04a');

    // the campfire (right ear warm), the lake wind (left ear cool). Every cut is a go(transition, view): with video it waits for the
    // current loop to end, plays the 4 s transition, then continues; `onStart` times the sounds to the transition (stills: at once).
    setStep(1); await say('g05', .2);
    let logged = false; const addLog = () => { if (logged) return; logged = true; SND.fx.log(.85); S.fire = .62; fireLoop?.set(.42); if (fireLoop) fireLoop.crack = 2.2; };
    await go('t_live_log', 'log', () => { SND.fx.cloth(.4, .9, .8); at(.75, .7); after(2.2, addLog); });
    at(.75, .7); addLog();
    await sleep(.6);
    react(['火、強くなった', 'パチパチ…', '🔥🔥🔥', '右耳あったかい'], 3);
    await say('g06'); if (fireLoop) fireLoop.crack = 1.2;
    await say('g07');
    S.wind = .55; lakeLoop?.set(.32);
    const cold = await comment('ガクにこたえよう', 'Answer Gaku', [['さむい…', "I'm cold…"], ['あったかい', "I'm warm"]]);
    await sleep(.6); await say(cold ? 'g08b' : 'g08a');
    react(['左から風の音', 'ひだり寒い…', 'wind 🌬'], 3);

    // the windbreak: he sits down on your left — left cool fades, his voice warms it
    setStep(2); await say('g09', .3);
    await go('t_log_left', 'left', () => {
      SND.fx.steps(.6, -1.2, 4, .6); at(-.6, .6);
      after(2.4, () => { SND.fx.cloth(-1.3, .25, 1.1); at(-1.35, .25); S.shield = 1; });
    });
    at(-1.35, .25); S.shield = 1; await sleep(.6);
    await say('g10', .6);
    react(['え', '壁！？', '距離ちかい', 'イケメンの壁…', '💚💚💚'], 5);
    at(-1.4, .1); await sleep(.4);
    await say('g11', .4);
    const near = await comment('ガクにこたえよう', 'Answer Gaku', [['ありがとう…', 'Thank you…'], ['ちかい…！', 'So close…!']]);
    await sleep(.6); await say(near ? 'g12b' : 'g12a', 1);
    react(['どかないって', 'ずるい', '…好き'], 3);

    // Super Chat: a treat in front of the mic (warm steam)
    setStep(3);
    await go('t_left_live', 'live', () => { SND.fx.cloth(-1, .4, .8); after(.8, () => { S.shield = 0; at(-.5, .8); SND.fx.steps(-1, 0, 3, .7); }); after(2.6, () => at(0, 1)); });
    S.shield = 0; at(0, 1); S.wind = .3; lakeLoop?.set(.2); await sleep(1);
    chat(pick(HANDLES), 'スパチャで差し入れできるらしい'); chat(pick(HANDLES), '焼き芋たべてほしい🍠'); chat(pick(HANDLES), 'コーヒー淹れてるとこ見たい☕');
    const g = await gift('ガクに差し入れのスパチャ', 'Send Gaku a treat', [['☕', 'ホットコーヒー', 'Hot coffee', '¥500'], ['🍠', '焼き芋', 'Roasted sweet potato', '¥500']]);
    await sleep(.8);
    if (g === 0) {
      await say('g13c', .3); SND.fx.pour(.5); await sleep(2.6);
      await go('t_live_coffee', 'coffee', () => after(2.4, () => { at(0, .35); S.mug = 1; SND.fx.steam(0); }));
      at(0, .35); S.mug = 1; await sleep(.4);
      await say('g14c', .6);
    } else {
      await say('g13i', .3);
      await go('t_live_imo', 'imo', () => { SND.fx.foil(.6); after(1.6, () => SND.fx.foil(.4)); after(2.6, () => { at(.3, .35); S.imo = 1; SND.fx.steam(.3); }); });
      at(.3, .35); S.imo = 1; await sleep(.4);
      await say('g14i', .6);
    }
    react(['いいなあ', 'ゆげ見える', 'あったかそう', '私も食べたい'], 3);
    await say('g15', 1);
    react(['ひとりじゃないよ', 'みんないるよ〜', '泣く'], 4);

    // snow, his blanket over the mic, the right ear
    setStep(4); S.snow = 1; S.fireBase = .2; S.fire = Math.min(S.fire, .3); fireLoop?.set(.22); await sleep(1);
    await say('g16', .8);
    react(['雪！', '❄❄❄', 'きれい…'], 3);
    await say('g17', .2);
    await go(g === 0 ? 't_coffee_blanket' : 't_imo_blanket', 'blanket', () => {
      after(1, () => { S.mug = 0; S.imo = 0; }); after(1.8, () => { SND.fx.cloth(-1.2, .1, 1.3); setTimeout(() => SND.fx.cloth(1.2, .1, 1.1), 500); });
      after(2.8, () => { at(0, .3); S.blanket = 1; lakeLoop?.set(.05); fireLoop?.set(.12); });
    });
    S.mug = 0; S.imo = 0; at(0, .3); S.blanket = 1; lakeLoop?.set(.05); fireLoop?.set(.12); await sleep(.6);
    await say('g18', .8);
    react(['彼ブランケット…', 'ずるい', 'あったかい…'], 3);
    await say('g19', .6);
    react(['ねむい', 'まだ起きてる', 'zzz'], 3);
    await go('t_blanket_whisper', 'whisper_R', () => { after(1, () => at(.9, .3)); after(2.5, () => { at(1.4, .1); SND.fx.cloth(1.3, .15, .8); }); });
    at(1.4, .1); await sleep(.5);
    await say('g20', .4);
    await hold('🤍', '長押し：まだ見てる', 'Hold: I\'m still here');
    await sleep(.5); await say('g21', 1.4);
    react(['…', '泣いた', '声も好きだよ', '💚'], 4);
    // he takes the blanket back around his own shoulders (as in the picture): the wind and snow reach the mic again
    S.fireBase = .14; S.fire = .14;
    await go('t_whisper_bye', 'bye', () => { after(.6, () => at(.6, .4)); after(1.6, () => { SND.fx.cloth(0, .3, 1.2); S.blanket = 0; S.wind = .2; lakeLoop?.set(.14); }); after(3, () => at(0, 1)); });
    S.blanket = 0; S.wind = .2; lakeLoop?.set(.14); at(0, 1); await sleep(.6);
    await say('g22', 1);
    react(['おやすみ', 'good night Gaku', '🔥🔥', 'またね'], 4);
    await endStream(my, '🔥 …また、焚き火の夜に · See you on another campfire night');
  }

  async function endStream(my, msg) {
    guard(my);
    S.fade = 1; SND.fx.end(); await sleep(2.6); guard(my);
    mode = 'ended'; SND.stopLoops(); stopClips(); S.started = false; stopOutput(); sub('', '');
    $('endedSub').textContent = msg;
    // user 2026-11-08: every demo ends back on its OWN cover (no hop to the next demo); the button text follows the language (subs.js)
    $('startBtn').textContent = '↺ もう一度 · Play again'; show('title');
  }

  // ---------------------------------------------------------------- per-frame state + thermal
  let fireLoop = null, lakeLoop = null;
  const gust = (t) => .7 + .3 * Math.sin(2 * Math.PI * .17 * t);   // the lake loop's LFO (same rate)
  function update(dt) {
    S.t += dt; if (!S.started) return;
    S.clock += dt; S.lv = SND.voiceLevel();
    const vt = talking ? clamp((S.lv - .005) / .06) : 0;   // voice envelope (attack 0.06 s, release 0.3 s)
    S.env += (vt - S.env) * (1 - Math.exp(-dt / (vt > S.env ? .06 : .3)));
    S.henv = (S.henv || 0) + (vt - (S.henv || 0)) * (1 - Math.exp(-dt / (vt > (S.henv || 0) ? .06 : .8)));   // voice warmth: the same envelope, slower release (no sub-second hot ↔ cold flicker, guide §3 节奏)
    if (S.fire > S.fireBase) S.fire = Math.max(S.fireBase, S.fire - dt / 40);   // a fresh log burns down slowly
    if (Math.random() < dt * .5) S.viewers += Math.round(rnd(-4, 9));
    bots(dt);
  }
  function sources() {
    const out = [], add = (az, k, s, icon) => { if (s > .01) out.push({ az, k, s, icon }); };
    if (!S.started) return out;
    const P = S.pos;
    if (talking) add(P.az, 'h', (.1 + .8 * S.henv) * (P.dist < .15 ? 1 : P.dist <= .3 ? .6 : .28) * (Math.abs(P.az) < .5 ? .5 : 1), '💬');   // a voice is warm
    add(.9, 'h', S.fire * (1 - .5 * S.blanket), '🔥');                                                     // the campfire ~1 m to the right
    add(-1.35, 'c', S.wind * gust(S.t) * (1 - .85 * S.shield) * (1 - .9 * S.blanket), '🌬');             // lake wind, blocked by him / the blanket
    if (S.shield) add(-1.4, 'h', .2 * S.shield, '🧥');                                                    // his body right beside the mic
    if (S.snow) { add(-1.5, 'c', .12 * S.snow * (1 - S.blanket), '❄'); add(1.5, 'c', .12 * S.snow * (1 - S.blanket), '❄'); }
    if (S.mug) add(0, 'h', .35 * S.mug, '☕');
    if (S.imo) add(.35, 'h', .4 * S.imo, '🍠');
    if (S.blanket) { add(-1.5, 'h', .4 * S.blanket, '🧣'); add(1.5, 'h', .4 * S.blanket, '🧣'); }
    return out;
  }
  const ear = { Lc: 0, Lh: 0, Rc: 0, Rh: 0 };
  function thermal(dt) {
    const sum = { L: { h: 0, c: 0 }, R: { h: 0, c: 0 } }, src = sources();
    for (const s of src) { const sn = Math.sin(s.az), wL = clamp(1 - 1.2 * Math.max(0, sn)), wR = clamp(1 - 1.2 * Math.max(0, -sn)); sum.L[s.k] += s.s * wL; sum.R[s.k] += s.s * wR; }
    const rest = S.clock < (S.restUntil || 0);   // a short rest between scenes (guide §3 节奏): every channel off for a moment, so the next scene is felt on its own
    for (const e of ['L', 'R']) for (const k of ['c', 'h']) {
      const target = rest ? 0 : k === 'h' ? Math.min(.9, sum[e].h) : Math.min(1, sum[e].c), cur = ear[e + k];
      const tau = rest ? .15 : target > cur ? (k === 'h' ? .4 : .2) : (k === 'h' ? .5 : .35);
      ear[e + k] = cur + (target - cur) * (1 - Math.exp(-dt / tau));
    }
    return { th: { ...ear }, src };
  }

  // ---------------------------------------------------------------- drawing
  let viewA = '', viewB = '', mix = 1, parts = [];
  // ---- animation (handoff §4b, as Demo 20 / 22): Seedance 2.5 Lite 1080p clips whose first and last frames are EXACTLY the stills
  // (scripts/prepare_video.py), so clips only switch at a clip's end — a hard cut between identical frames, no ghosting.
  // Loops: a talk loop per view (+ a quiet one at the fire while he reads the chat); transitions: one per cut, asked for with go().
  // ?stills = no video (stills with a slow drift).
  const CLIP_NAMES = ['v_live', 'v_live_idle', 'v_log', 'v_left', 'v_coffee', 'v_imo', 'v_blanket', 'v_whisper', 'v_bye',
    't_live_log', 't_log_left', 't_left_live', 't_live_coffee', 't_live_imo', 't_coffee_blanket', 't_imo_blanket', 't_blanket_whisper', 't_whisper_bye'];
  const ONCE = new Set(CLIP_NAMES.filter((n) => n.startsWith('t_')));
  const CLIP = {};
  if (!QS.has('stills') && !QS.has('cover')) for (const n of CLIP_NAMES) {
    const v = document.createElement('video'); Object.assign(v, { muted: true, loop: false, playsInline: true, preload: 'auto', src: `media/video/${n}.mp4?v=1` });
    v.setAttribute('playsinline', ''); v.addEventListener('error', () => { delete CLIP[n]; }); CLIP[n] = v;
  }
  const clipOK = (n) => n && CLIP[n] && CLIP[n].readyState >= 2;
  let cur = null, curView = null, pending = null;
  function loopFor(view) {
    if (view === 'live' && !talking) return 'v_live_idle';
    return { live: 'v_live', log: 'v_log', left: 'v_left', coffee: 'v_coffee', imo: 'v_imo', blanket: 'v_blanket', whisper_R: 'v_whisper', bye: 'v_bye' }[view] || null;
  }
  function go(name, view, onStart) {   // a one-shot transition at the next clip end, then continue in `view`
    if (!clipOK(name) || !cur) { S.view = view; return Promise.resolve(); }   // stills: cut at once (the code after go() sets the end state)
    const my = run;
    return new Promise((done, fail) => { pending = { name, view, onStart, done: () => (my === run ? done() : fail(new Error('stopped'))), started: false }; });
  }
  function playClip(name, view) { const v = CLIP[name]; cur = name; curView = view; v.currentTime = 0; v.play().catch(() => {}); }
  function startLoop() { const w = loopFor(S.view); if (w && clipOK(w)) playClip(w, S.view); else cur = null; }
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
  function stopClips() { for (const v of Object.values(CLIP)) v.pause(); cur = null; curView = null; pending = null; }
  // layered stills (demos/shared/layers.js) breathe / sway on their own: no page zoom / bob on top (the background would breathe with her)
  const LIVE = () => !!(window.MoHeatLayers && window.MoHeatLayers.live);
  function drawView(view, t, alpha) {
    if (cur && clipOK(cur) && (view === curView || (view === S.view && ONCE.has(cur)))) { ctx.globalAlpha = alpha; ctx.drawImage(CLIP[cur], 0, 0, W, H); ctx.globalAlpha = 1; return; }
    const exact = !QS.has('stills') && Object.keys(CLIP).length > 0;   // with video the still must match the clips' frames exactly (no drift)
    const im = IMG[view] || IMG.live; ctx.globalAlpha = alpha;
    const close = /left|whisper|coffee|imo|blanket/.test(view), z = exact ? 1 : (close ? 1.025 : 1.012) + (LIVE() ? 0 : .006 * Math.sin(t * .5));
    const dx = W / 2 - W * z / 2, dy = H / 2 - H * z / 2 + (exact || LIVE() ? 0 : 3 * Math.sin(t * .9));
    if (im) ctx.drawImage(im, dx, dy, W * z, H * z); else { ctx.fillStyle = '#16242a'; ctx.fillRect(0, 0, W, H); }
    ctx.globalAlpha = 1;
  }
  function draw(t, dt) {
    if (S.view !== viewB) { viewA = viewB; viewB = S.view; mix = 0; }
    clips();
    mix = Math.min(1, mix + dt / .6);
    if (mix < 1 && viewA) drawView(viewA, t, 1);
    drawView(S.view, t, mix < 1 && viewA ? mix : 1);
    // fire glow flicker + sparks, steam from the treat, snow
    const f = FIRE[S.view];
    if (f) {
      // the glow flickers in step with the fire in the plate (MoHeatLayers.flicker) — two independent flickers looked like two fires
      const fl = LIVE() && window.MoHeatLayers.flicker ? .25 * (window.MoHeatLayers.flicker() - 1) * (.4 + S.fire) : .04 * Math.sin(t * 13) * Math.sin(t * 7.3);
      const [fx, fy] = [f[0] * W, f[1] * H], a = .1 + .25 * S.fire + fl;
      const g = ctx.createRadialGradient(fx, fy, 10, fx, fy, 520); g.addColorStop(0, `rgba(255,150,60,${a})`); g.addColorStop(1, 'rgba(255,150,60,0)');
      ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over';
      if (Math.random() < dt * 22 * S.fire) parts.push({ k: 'k', x: fx + rnd(-60, 60), y: fy - rnd(0, 40), vx: rnd(-25, 25), vy: rnd(-180, -90), r: rnd(1.5, 3.5), life: 0, max: rnd(1.2, 2.4) });
    }
    const st = STEAM[S.view];
    // steam leaves the mug / potato in his hands: with layers its spot follows his hands (parallax, breathing) and the page zoom
    const sp = st && (LIVE() && window.MoHeatLayers.toFrame ? window.MoHeatLayers.toFrame('gaku_' + S.view, st[0] * W, st[1] * H) : [st[0] * W, st[1] * H]);
    const zc = /left|whisper|coffee|imo|blanket/.test(S.view) ? 1.025 : 1.012;
    if (st && (S.mug || S.imo) && Math.random() < dt * 9) parts.push({ k: 's', view: S.view, x: W / 2 + (sp[0] - W / 2) * zc + rnd(-50, 50), y: H / 2 + (sp[1] - H / 2) * zc, vx: rnd(-10, 10), vy: rnd(-55, -30), r: rnd(18, 34), life: 0, max: rnd(2, 3) });
    if (S.snow && Math.random() < dt * 40) parts.push({ k: 'n', x: rnd(0, W), y: -10, vx: rnd(-20, 10), vy: rnd(50, 110), r: rnd(1.5, 4), life: 0, max: 14 });
    // physics: the lake wind blows from your LEFT (→ right in the picture). Embers: the fire's lift fades (drag), the wind takes them;
    // steam: rises slower as it cools and drifts; snow: falls at its terminal speed, eases into the wind, flutters.
    const windX = 70 * S.wind * gust(t);
    for (const p of parts) {
      p.life += dt;
      if (p.k === 'k') { p.vy *= Math.exp(-dt * .9); p.vx += (windX - p.vx) * Math.min(1, dt * 1.2); }
      else if (p.k === 's') { p.vy *= Math.exp(-dt * .5); p.vx += (windX * .8 - p.vx) * Math.min(1, dt * .8); }
      else p.vx += (windX * .8 - p.vx) * Math.min(1, dt * .7);
      p.x += p.vx * dt; p.y += p.vy * dt; if (p.k === 'n') p.x += Math.sin(p.life * 1.3 + p.r) * .4;
    }
    for (const p of parts) if (p.k === 's' && (p.view !== S.view)) p.out = Math.max(0, (p.out ?? 1) - dt / .45);
    parts = parts.filter((p) => p.life < p.max && p.y < H + 20 && p.out !== 0);
    for (const p of parts) {
      if (p.k === 'k') { const a = 1 - p.life / p.max; ctx.fillStyle = `rgba(255,${170 + 60 * a | 0},90,${a})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); }
      else if (p.k === 's') {   // soft puff, gone with the view it belongs to (it used to float over his chin in the next view)
        const a = Math.sin(Math.PI * p.life / p.max) * .16 * (p.out ?? 1), r = p.r * (1 + p.life * .6), g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.fill();
      }
      else { ctx.fillStyle = 'rgba(240,246,255,.8)'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); }
    }
    // a cool wash from the lake side while the wind blows unblocked
    const wv = S.wind * gust(t) * (1 - .85 * S.shield) * (1 - .9 * S.blanket) * .3;
    if (wv > .01) { const g = ctx.createRadialGradient(0, H / 2, 50, 0, H / 2, 900); g.addColorStop(0, `rgba(150,210,255,${wv})`); g.addColorStop(1, 'rgba(150,210,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    if (S.blanket) { const g = ctx.createRadialGradient(W * .38, H / 2, 300, W * .38, H / 2, 1200); g.addColorStop(0, 'rgba(255,170,120,0)'); g.addColorStop(1, `rgba(255,160,110,${.16 * S.blanket})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    if (S.fade) { S.fadeA = Math.min(1, (S.fadeA || 0) + dt / 2.4); ctx.fillStyle = `rgba(6,10,12,${S.fadeA})`; ctx.fillRect(0, 0, W, H); }
    $('viewers').textContent = `👁 ${S.viewers.toLocaleString()}`;
  }

  // ---------------------------------------------------------------- side panel + device (same protocol as every demo)
  const rc = $('radar').getContext('2d');
  function radar(src, th) {
    const cx = 240, cy = 220, R = 160; rc.clearRect(0, 0, 480, 420);
    rc.strokeStyle = 'rgba(255,255,255,.08)'; rc.lineWidth = 1.5; for (const r of [R * .5, R]) { rc.beginPath(); rc.arc(cx, cy, r, 0, 7); rc.stroke(); }
    rc.fillStyle = '#7f938c'; rc.font = '600 13px Inter'; rc.textAlign = 'center'; rc.fillText('front', cx, cy - R - 10); rc.fillText('L', cx - R - 18, cy + 5); rc.fillText('R', cx + R + 18, cy + 5);
    for (const [e, sx] of [['L', -1], ['R', 1]]) {
      const v = Math.max(th[e + 'c'], th[e + 'h']), col = th[e + 'c'] > th[e + 'h'] ? '79,179,255' : '255,122,69';
      rc.fillStyle = v > .02 ? `rgba(${col},${.25 + .75 * v})` : '#223033'; rc.beginPath(); rc.ellipse(cx + sx * 46, cy, 12, 24, 0, 0, 7); rc.fill();
    }
    rc.fillStyle = '#2e3e40'; rc.beginPath(); rc.arc(cx, cy, 40, 0, 7); rc.fill();
    rc.font = '26px sans-serif'; rc.textBaseline = 'middle';
    for (const s of src) {
      const r = s.az === 0 ? R * .62 : R, x = cx + Math.sin(s.az) * r, y = cy - Math.cos(s.az) * r;
      rc.globalAlpha = clamp(.35 + s.s); rc.fillStyle = s.k === 'h' ? 'rgba(255,122,69,.25)' : 'rgba(79,179,255,.25)';
      rc.beginPath(); rc.arc(x, y, 18 + 18 * s.s, 0, 7); rc.fill(); rc.fillText(s.icon, x, y + 1); rc.globalAlpha = 1;
    }
    rc.textBaseline = 'alphabetic';
  }
  const DEFAULT_RANGE = { heatMin: 0, heatMax: 200, coolMin: 35, coolMax: 80 }, SEND_INTERVAL = 100, OFF = .03;
  const store = { get: (k, d) => { try { return JSON.parse(localStorage.getItem(`moheat.${k}`)) ?? d; } catch { return d; } }, set: (k, v) => { try { localStorage.setItem(`moheat.${k}`, JSON.stringify(v)); } catch {} } };
  const range = { ...DEFAULT_RANGE, ...store.get('range', {}) };
  let lastSent = '', lastSendAt = 0, tripped = false, intensity = +store.get('asmr.intensity', 100) / 100;
  const device = MoHeatDevice.create({ select: $('portSelect'), addBtn: $('addPort'), connectBtn: $('connectBtn'), status: $('deviceStatus') }, { log: (l) => console.log('[MoHeat]', l), onConnect: () => { lastSent = ''; } });
  if (!MoHeatDevice.supported) $('deviceStatus').querySelector('span').textContent = 'Web Serial needs desktop Chrome / Edge';
  function command(th) {   // DUAL: each ear's cool and heat set independently
    const c = (v) => (v > OFF ? Math.round(range.coolMin + v * (range.coolMax - range.coolMin)) : 0), h = (v) => (v > OFF ? Math.round(range.heatMin + v * (range.heatMax - range.heatMin)) : 0);
    return Math.max(th.Lc, th.Lh, th.Rc, th.Rh) <= OFF ? 'stop' : `DUAL LC${c(th.Lc)} LH${h(th.Lh)} RC${c(th.Rc)} RH${h(th.Rh)}`;
  }
  function stopOutput() { if (device.isConnected()) device.send('stop'); lastSent = 'stop'; }
  function emergencyStop() { tripped = !tripped; const b = $('estop'); if (tripped) { stopOutput(); b.textContent = '↺ Re-arm output'; b.classList.add('tripped'); } else { b.textContent = '■ STOP'; b.classList.remove('tripped'); lastSent = ''; } }
  $('estop').addEventListener('click', emergencyStop); addEventListener('pagehide', stopOutput);
  $('intensity').value = Math.round(intensity * 100); $('intensityVal').textContent = `${Math.round(intensity * 100)}%`;
  $('intensity').addEventListener('input', (e) => { intensity = +e.target.value / 100; $('intensityVal').textContent = `${e.target.value}%`; store.set('asmr.intensity', +e.target.value); });
  const meterEls = Object.fromEntries(['Lc', 'Lh', 'Rc', 'Rh'].map((k) => [k, [$(`m${k}`), $(`v${k}`)]]));
  let both = 0, frames = 0, peak = { Lc: 0, Lh: 0, Rc: 0, Rh: 0 }; const cmdLog = [];
  function output(th, live) {
    const sc = Object.fromEntries(Object.entries(th).map(([k, v]) => [k, live && !tripped ? v * intensity : 0]));
    if ((sc.Lc > OFF && sc.Lh > OFF) || (sc.Rc > OFF && sc.Rh > OFF)) both++;   // the same ear warm and cool at once (DUAL)
    if (live) { frames++; for (const k in peak) peak[k] = Math.max(peak[k], sc[k]); }
    for (const [k, [bar, val]] of Object.entries(meterEls)) { bar.style.width = `${sc[k] * 100}%`; val.textContent = Math.round(sc[k] * 100); }
    const cmd = command(sc); $('cmd').textContent = cmd;
    for (const [e, el] of [['L', $('glowL')], ['R', $('glowR')]]) {
      const c = sc[e + 'c'], h = sc[e + 'h'], v = Math.max(c, h), col = c > h ? '79,179,255' : '255,122,69';
      el.style.opacity = v.toFixed(2); el.style.background = c > .03 && h > .03 ? `linear-gradient(to bottom, rgba(255,122,69,${(.6 * Math.sqrt(h / v)).toFixed(2)}) 0 38%, rgba(79,179,255,${(.6 * Math.sqrt(c / v)).toFixed(2)}) 62% 100%)` : `linear-gradient(to ${e === 'L' ? 'right' : 'left'}, rgba(${col},.55), rgba(${col},0))`;   // cool AND heat on one ear: warm on top, cool below, blended over the middle; the .glow mask fades it inward (layered, they read as grey: Demo19 2026-11-10)
    }
    const n = performance.now();
    if (cmd !== lastSent && n - lastSendAt >= SEND_INTERVAL) {
      if (cmdLog.length < 4000) cmdLog.push([+(S.clock || 0).toFixed(2), S.view, cmd]);
      if (device.isConnected() && $('sendOn').checked) device.send(cmd);
      lastSent = cmd; lastSendAt = n;
    }
  }
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  // ---------------------------------------------------------------- screens: title → live → ended
  function show(m) {
    mode = m;
    $('intro').classList.toggle('hidden', m !== 'title');
    $('ended').classList.toggle('show', m === 'ended');
    stage.classList.toggle('on-air', m === 'live' || m === 'ended');
  }
  function goLive() {
    SND.init(); SND.loadVoices(Object.keys(LINES));
    run++; SND.stopLoops(); stopClips(); const my = run;
    S = fresh(); parts = []; viewB = ''; mix = 1; list.innerHTML = ''; botT = 1; $('act').classList.remove('show');
    chatIn.classList.remove('turn', 'giving'); chips.innerHTML = ''; hint.innerHTML = '';
    $('chName').textContent = CH.name; $('chTitle').textContent = CH.title; $('vv').textContent = CH.credit;
    stage.dataset.ch = 'gaku'; show('live');
    fireLoop = SND.loop('fire', .9, 1); fireLoop?.set(.3);
    lakeLoop = SND.loop('lake', -1.35, 2.2); lakeLoop?.set(.22);
    for (let i = 0; i < 6; i++) chat(pick(HANDLES), pick(CH.pool));
    story(my).catch((e) => { if (e.message !== 'stopped') console.error(e); });
  }
  $('startBtn').addEventListener('click', () => { SND.init(); goLive(); });
  $('againBtn').addEventListener('click', goLive);
  $('lrBtn').addEventListener('click', () => { SND.lrCheck(); const b = $('lrBtn'); b.textContent = '🎧 Left…'; setTimeout(() => { b.textContent = '🎧 …Right'; }, 900); setTimeout(() => { b.textContent = '🎧 Left / Right check'; }, 1900); });
  $('soundBtn').addEventListener('click', (e) => { SND.setMuted(!SND.isMuted()); e.target.textContent = SND.isMuted() ? '🔇' : '🔊'; });

  function drawCover() {}   // UI v2: the cover is the finished image (media/cover/, tools/web/covers.py)

  let last = performance.now(), hidden = false;
  function loop() {
    const n = performance.now(), dt = clamp((n - last) / 1000, 0, .05); last = n;
    if (!hidden) {
      update(dt);
      if (mode === 'live' || mode === 'ended') draw(S.t, dt); else drawCover();
      const { th, src } = thermal(dt); output(th, !!S.started); radar(S.started ? src : [], th);
      $('clock').textContent = fmt(S.clock || 0);
      $('posInfo').textContent = S.started ? (S.pos.dist < .2 ? (S.pos.az < 0 ? 'At your left ear' : S.pos.az > 0 ? 'At your right ear' : 'Right in front') : S.pos.dist <= .4 ? 'Right beside you' : 'By the fire') : '';
    }
    requestAnimationFrame(loop);
  }
  document.addEventListener('visibilitychange', () => { hidden = document.hidden; if (hidden) { stopOutput(); SND.ctx()?.suspend(); } else { last = performance.now(); SND.ctx()?.resume(); } });
  document.addEventListener('keydown', (e) => { if (e.code === 'Escape') emergencyStop(); });
  window.STREAM = { get S() { return S; }, get mode() { return mode; }, goLive, both: () => both, frames: () => frames, peak: () => ({ ...peak }), log: () => cmdLog };
  setStep(0); show('title');
  if (QS.has('cover')) { document.body.classList.add('cover-only'); artReady.then(drawCover); return; }
  if (QS.has('autoplay')) { const ac = SND.init(); if (ac.state === 'running') goLive(); else ac.resume().then(() => { if (ac.state === 'running' && mode === 'title') goLive(); }).catch(() => {}); }
  requestAnimationFrame(loop);
})();
