// 『あと10秒だけ、ね？』 — Hinata (陽向, original character), 19, the sweet younger member of an idol group, at his handshake event.
// Sweet in public, a little dark and teasing at your ear. You queue in a winter hall (cold air from the entrance doors on your right),
// take his hand, he warms your cold hands with his breath, leans to your left ear ("you were in another member's line…"),
// refuses to let go when the staff calls time, leans to your right ear for a promise, then waves you off.
// Thermal (firmware DUAL: cool and heat independent on each ear):
//  · VOICE: his voice warms the ear it is close to, following its loudness (at your ear: strong; across the table: mild, both ears).
//  · BREATH: he blows on your hands, his face close to yours (both ears, a warm swell). Holding hands alone adds nothing at the ears.
//  · AMBIENT: cold draft from the automatic doors on your right (stronger in the queue, a gust when the doors open).
(() => {
  const $ = (id) => document.getElementById(id);
  const QS = new URLSearchParams(location.search);
  const SND = window.HinaAudio, LINES = window.HINA_LINES, W = 1920, H = 1080;
  const cv = $('scene'), ctx = cv.getContext('2d'), stage = $('stage');
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), rnd = (a, b) => a + Math.random() * (b - a);
  const sleep = (s) => new Promise((r) => setTimeout(r, s * 1000));

  // ---------------------------------------------------------------- art
  const IMG = {}, PATCH = window.HINA_PATCHES || {};
  const NAMES = ['bg_queue', 'hina_booth', 'hina_hands', 'hina_lean', 'hina_lean_r', 'hina_wave', ...Object.keys(PATCH)];
  const artReady = Promise.all(NAMES.map((n) => new Promise((res) => { const im = new Image(); im.onload = () => { IMG[n] = im; res(); }; im.onerror = () => res(); im.src = `media/art/${n}.webp?v=1`; })));
  const BASE = { queue: 'bg_queue', booth: 'hina_booth', hands: 'hina_hands', leanL: 'hina_lean', leanR: 'hina_lean_r', wave: 'hina_wave' };
  // where his voice is for each view (az rad, + = right; dist m)
  const POS = { queue: { az: .15, dist: 6 }, booth: { az: .1, dist: .8 }, hands: { az: 0, dist: .45 }, leanL: { az: -1.35, dist: .12 }, leanR: { az: 1.35, dist: .12 }, wave: { az: 0, dist: 2.2 } };
  const STAFF = { az: .8, dist: 1.4 };

  // ---------------------------------------------------------------- state
  const fresh = () => ({ started: false, t: 0, clock: 0, view: 'queue', hold: 0, breath: 0, draft: .5, gust: 0, shake: null, step: 0, fade: 0, lv: 0, heart: 0 });
  let S = fresh(), run = 0;
  const STEPS = [
    ['queue', '列に並ぶ', 'In line'], ['hello', 'ごあいさつ', 'Say hi'], ['hands', '握手', 'The handshake'],
    ['secret', '耳元で', 'At your ear'], ['over', '時間オーバー', 'Over time'], ['bye', 'またね', 'See you'],
  ];
  function setStep(i) { if (i > 0 && S.started) S.restUntil = S.clock + 1.2; S.step = i; $('steps').innerHTML = STEPS.map((s, k) => `<li class="${k < i ? 'done' : k === i ? 'now' : ''}">${s[1]} · <small>${s[2]}</small></li>`).join(''); }

  // ---------------------------------------------------------------- subtitles
  const subJa = $('subJa'), subEn = $('subEn'), subs = $('subs');
  function sub(ja, en, who = '') { subJa.textContent = ja || ''; subEn.textContent = en || ''; subs.classList.toggle('show', !!ja); subs.dataset.who = who; }

  // ---------------------------------------------------------------- voices
  let talking = 0;
  async function say(id) {
    const my = run, [ja, en, style] = LINES[id], at = POS[S.view] || POS.booth;
    S.dark = style === 'd'; sub(ja, en, 'hina'); talking++;
    await SND.say(id, at, at.dist < .3 ? .75 : 1.35, true);
    talking--; if (my !== run) throw new Error('stopped');
    await sleep(.3); sub('', '');
  }
  async function staff(id) {
    const my = run, [ja, en] = LINES[id];
    sub(ja, en, 'staff');
    await SND.say(id, STAFF, 1.0, false);
    if (my !== run) throw new Error('stopped');
    await sleep(.25); sub('', '');
  }

  // ---------------------------------------------------------------- your turn: choices, actions, your voice
  const choiceEl = $('choices'), actEl = $('act'), micEl = $('micGate');
  function choice(opts, timeout = 20) {
    return new Promise((res) => {
      choiceEl.innerHTML = opts.map((o, i) => `<button class="ch" data-i="${i}"><b>${o[0]}</b><span>${o[1]}</span></button>`).join('');
      choiceEl.classList.add('show');
      const done = (i) => { clearTimeout(tm); choiceEl.classList.remove('show'); choiceEl.innerHTML = ''; res(i); };
      choiceEl.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => done(+b.dataset.i)));
      const tm = setTimeout(() => done(0), timeout * 1000);
    });
  }
  let hot = null;
  function action(icon, ja, en, hotspot = null) {
    return new Promise((res) => {
      actEl.innerHTML = `<button class="act-btn"><i>${icon}</i><b>${ja}</b><span>${en}</span></button>`; actEl.classList.add('show');
      const done = () => { actEl.classList.remove('show'); actEl.innerHTML = ''; hot = null; stage.classList.remove('pointer'); res(); };
      actEl.querySelector('button').addEventListener('click', done);
      hot = hotspot ? { ...hotspot, done } : null;
    });
  }
  const at = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; };
  const inHot = (x, y) => hot && x > hot.x0 && x < hot.x1 && y > hot.y0 && y < hot.y1;
  cv.addEventListener('pointerdown', (e) => { const [x, y] = at(e); if (inHot(x, y)) hot.done(); });
  cv.addEventListener('pointermove', (e) => { const [x, y] = at(e); stage.classList.toggle('pointer', !!inHot(x, y)); });
  let mic = null, micState = 'none', floor = .01; const mbuf = new Float32Array(1024);
  function ensureMic() {
    if (micState !== 'none' || !$('micOn').checked || !navigator.mediaDevices?.getUserMedia) return;
    micState = 'asking';
    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false } })
      .then((st) => { const ac = SND.ctx() || SND.init(); const an = ac.createAnalyser(); an.fftSize = 1024; ac.createMediaStreamSource(st).connect(an); mic = { an, st }; micState = 'on'; })
      .catch(() => { micState = 'denied'; });
  }
  $('micOn').addEventListener('change', (e) => { if (e.target.checked) ensureMic(); else { mic?.st.getTracks().forEach((t) => t.stop()); mic = null; micState = 'none'; } });
  function micLevel() { if (!mic) return 0; mic.an.getFloatTimeDomainData(mbuf); let s = 0; for (let i = 0; i < mbuf.length; i++) s += mbuf[i] * mbuf[i]; return Math.sqrt(s / mbuf.length); }
  let micWait = null;
  function speak(ja, en, btnJa, btnEn, timeout = 20) {
    return new Promise((res) => {
      micEl.querySelector('.say b').textContent = ja; micEl.querySelector('.say span').textContent = en;
      micEl.querySelector('button').innerHTML = `${btnJa} · ${btnEn}`; micEl.classList.add('show');
      const done = () => { clearTimeout(tm); micWait = null; micEl.classList.remove('show'); res(); };
      micEl.querySelector('button').onclick = done;
      micWait = { talk: 0, quiet: 0, done };
      const tm = setTimeout(done, timeout * 1000);
    });
  }
  $('micBars').innerHTML = '<i></i>'.repeat(6);

  // ---------------------------------------------------------------- the story
  function door() { SND.fx.autodoor(1.35); setTimeout(() => { S.gust = 1; }, 500); }
  async function story() {
    const my = ++run;
    try {
      // the queue: crowd murmur, music from the stage, the automatic doors on your right let the winter in
      S.view = 'queue'; setStep(0);
      SND.loop('crowd', 0, 3)?.set(.32); SND.loop('music', -.5, 7)?.set(.4); SND.loop('draft', 1.4, 2.2)?.set(.22);
      await sleep(1.4); door(); await sleep(2.6);
      await choice([['前へすすむ', 'Step up to the booth'], ['深呼吸してから', 'Take a deep breath first']]);   // two options, same reply (user)
      SND.fx.steps(0, 0, 4, .6); await sleep(1.2);
      await staff('s01');
      S.view = 'booth'; S.draft = .22; setStep(1);
      SND.loop('crowd')?.set(.2); SND.loop('music')?.set(.25); SND.loop('draft')?.set(.12);
      await sleep(.8);
      await say('h01'); await say('h02');
      // the handshake: his warm hands (both ears, mild)
      await choice([['手をにぎる', 'Take his hand'], ['両手でにぎる', 'Hold it with both hands']]);
      SND.fx.clasp(); S.hold = 1; S.shake = S.clock; setStep(2);
      await go('v_take_hand', 'hands');   // he takes your hand (booth → hands)
      await sleep(.3);
      await say('h03');
      const a = await choice([['ずっと並んでたから', 'I was in line for ages'], ['陽向くんに、会いたくて', 'I just wanted to see you']]);
      await say(a ? 'h04b' : 'h04a');
      let h5 = null;   // he blows on your hands: the breath clip, the breath sound and his line start together
      await go('v_hands_breath', 'hands', () => { SND.fx.breath(0, .3, 1.9); S.breath = 1; h5 = say('h05'); });
      await h5;
      SND.fx.timer(); await staff('s02');
      await say('h06');
      // he leans to your LEFT ear: the dark side
      setStep(3); await go('v_lean_in', 'leanL'); SND.fx.rustle(-1.1, .3); SND.loop('heart', 0, .3)?.set(.35); S.heart = 1;
      SND.loop('crowd')?.set(.12); SND.loop('music')?.set(.15);
      await sleep(.9);
      await say('h07'); await say('h08');
      const b = await choice([['ち、ちがうの！', "N-no, it's not like that!"], ['…ごめんね', '…Sorry']]);
      await say(b ? 'h09b' : 'h09a');
      // time's up — but he does not let go
      await go('v_lean_back', 'hands'); setStep(4); SND.loop('heart')?.set(.15); setTimeout(() => { if (my === run) door(); }, 1600);   // the next fan comes in: the cold rolls past both ears again
      SND.fx.timer(); await staff('s03');
      const c = await choice([['手をはなす', 'Let go'], ['…もうちょっとだけ', '…Just a little longer']]);
      if (c === 0) { SND.fx.rustle(0, .45); S.hold = .3; await sleep(.5); SND.fx.clasp(); S.hold = 1; await say('h10a'); }
      else await say('h10b');
      // his RIGHT ear promise — and someone comes in through the doors on your right: warm voice + cold gust on the same ear
      await go('v_lean_in_r', 'leanR'); SND.fx.rustle(1.1, .3); SND.loop('heart')?.set(.35);
      await sleep(.8);
      await say('h11'); door(); await sleep(.3); await say('h12');
      await speak('「約束する」と言ってみて', 'Tell him "I promise"', '🤙 約束する', 'I promise');
      await say('h13');
      // bye
      setStep(5); SND.loop('heart')?.stop(); S.heart = 0;
      SND.fx.timer(); await staff('s04');
      S.hold = 0; SND.fx.rustle(0, .5); SND.fx.steps(0, 0, 3, .8); await go('v_leave', 'wave'); S.shake = null;
      SND.loop('crowd')?.set(.3); SND.loop('music')?.set(.35); S.draft = .3;
      await sleep(1.1); await say('h14');
      await sleep(2.4); SND.fx.chime();
      S.fade = 1; await sleep(3.2); finish();
    } catch (e) { if (e.message !== 'stopped') console.error(e); }
  }

  // ---------------------------------------------------------------- per frame
  function update(dt) {
    S.t += dt; if (!S.started) return;
    S.clock += dt;
    S.lv = SND.voiceLevel();
    S.breath = Math.max(0, S.breath - dt / 3.2);
    S.gust = Math.max(0, S.gust - dt / 3);
    if (micWait) {
      const ml = micState === 'on' ? micLevel() : 0; floor = ml < floor ? ml : floor + (ml - floor) * dt * .05;
      const loud = micState === 'on' && ml > Math.max(.02, floor * 4);
      if (loud) { micWait.talk += dt; micWait.quiet = 0; } else if (micWait.talk > .25) { micWait.quiet += dt; if (micWait.quiet > .5 && !window.MoHeatVoice?.judging()) micWait.done(); }   // speech recognition (shared/voice.js) judges the words; the level is the fallback
      micEl.querySelectorAll('.mic i').forEach((b, i) => { const on = ml * 9 > (i + 1) / 7; b.style.height = `${on ? 35 + 65 * Math.min(1, ml * 9 - i / 7) : 15}%`; b.style.opacity = on ? 1 : .35; });
      micEl.querySelector('.mic').hidden = micState !== 'on';
    }
  }
  let vEnv = 0;
  function layers(dt) {
    const out = [], add = (az, k, s, icon, layer) => { if (s > .01) out.push({ az, k, s, icon, layer }); };
    if (!S.started) return out;
    const lv = talking ? clamp((S.lv - .008) * 4.5) : 0;
    vEnv += (lv - vEnv) * (1 - Math.exp(-dt / (lv > vEnv ? .06 : .8)));   // slow release: voice warmth follows the phrase, not each syllable (guide §3 节奏)
    const p = POS[S.view];
    if (p.dist < .3) add(p.az, 'h', .1 + .8 * vEnv, '💬', 'voice');            // at your ear
    else if (p.dist < .6) add(0, 'h', .05 + .4 * vEnv, '💬', 'voice');        // holding your hands, face close
    else if (p.dist < 1) add(0, 'h', .3 * vEnv, '💬', 'voice');               // across the table
    if (S.breath) add(0, 'h', .65 * Math.sin(Math.min(1, S.breath) * Math.PI / 2 + (1 - S.breath) * .9), '💨', 'touch');
    add(1.4, 'c', S.draft + .3 * S.gust, '🚪', 'env');
    if (S.gust > .05) add(1.4 - 2.8 * Math.min(1, (1 - S.gust) * 1.6), 'c', .5 * Math.sqrt(S.gust), '🌬', 'env');   // the winter air rolls in from the doors on your right and across the hall to your left ear
    return out;
  }
  const chan = { Lc: 0, Lh: 0, Rc: 0, Rh: 0 };
  function thermal(dt) {
    const sum = { Lc: 0, Lh: 0, Rc: 0, Rh: 0 }, src = layers(dt);
    for (const s of src) { const sn = Math.sin(s.az), wL = clamp(1 - 1.2 * Math.max(0, sn)), wR = clamp(1 - 1.2 * Math.max(0, -sn)); sum['L' + s.k] += s.s * wL; sum['R' + s.k] += s.s * wR; }
    for (const k of Object.keys(chan)) {
      const rest = S.clock < (S.restUntil || 0), target = rest ? 0 : Math.min(k[1] === 'h' ? .95 : 1, sum[k]);   // rest: a short pause between scenes (guide §3 节奏)
      chan[k] += (target - chan[k]) * (1 - Math.exp(-dt / (rest ? .15 : target > chan[k] ? .08 : .25)));
    }
    return { th: { ...chan }, src };
  }

  // ---------------------------------------------------------------- drawing
  let blinkAt = 2, blinkUntil = 0, viewA = 'queue', viewB = 'queue', mix = 1;
  const FW = { mouth: 0, blink: 0 };
  const ease = (k, target, dt, up, down) => k + (target - k) * (1 - Math.exp(-dt / (target > k ? up : down)));
  function faces(t, dt) {
    const open = talking ? clamp((S.lv - .008) * 45) : 0;
    FW.mouth = ease(FW.mouth, open, dt, .035, .07);
    FW.blink = ease(FW.blink, t < blinkUntil && !talking ? 1 : 0, dt, .025, .05);
  }
  // ---- animation (handoff §4b): every clip starts and ends EXACTLY on a still (scripts/prepare_video.py), so clips are only ever
  // switched at a clip's end — a hard cut between two identical frames, no cross-fade, no ghosting. Loops: one per view (hands: talk /
  // quiet / breath). Transitions: one per cut (booth→hands, hands→left ear, left ear→hands, hands→right ear, right ear→wave);
  // the story asks for one with go() and it starts when the current loop reaches its end. ?stills = stills + mouth patches.
  const CLIP_NAMES = ['v_booth_talk', 'v_take_hand', 'v_hands_talk', 'v_hands_idle', 'v_hands_breath', 'v_lean_in', 'v_lean_whisper', 'v_lean_back', 'v_lean_in_r', 'v_leave', 'v_wave'];
  const CLIP = {};
  if (!QS.has('stills')) for (const n of CLIP_NAMES) {
    const v = document.createElement('video'); Object.assign(v, { muted: true, loop: false, playsInline: true, preload: 'auto', src: `media/video/${n}.mp4?v=2` });
    v.setAttribute('playsinline', ''); v.addEventListener('error', () => { delete CLIP[n]; }); CLIP[n] = v;
  }
  const clipOK = (n) => n && CLIP[n] && CLIP[n].readyState >= 2;
  const MIRROR = { leanR: ['v_lean_whisper'] };   // the right-ear loop = the left one mirrored (its still is the mirrored still)
  let cur = null, curView = null, pending = null;  // pending: { name, view, done } — a transition waiting for the loop's end
  const listening = () => !talking && ['choices', 'act', 'micGate'].some((id) => $(id).classList.contains('show'));
  function loopFor(view) {
    if (view === 'booth') return 'v_booth_talk';
    if (view === 'hands') return listening() ? 'v_hands_idle' : 'v_hands_talk';   // quiet only while he waits for your answer
    if (view === 'leanL' || view === 'leanR') return 'v_lean_whisper';
    if (view === 'wave') return 'v_wave';
    return null;
  }
  function go(name, view, onStart) {   // play a one-shot clip at the next clip end (onStart when it begins), then continue in `view`
    if (!clipOK(name) || !cur) { S.view = view; onStart && onStart(); return Promise.resolve(); }
    return new Promise((done) => { pending = { name, view, done, onStart, started: false }; });
  }
  function playClip(name, view) {
    const v = CLIP[name]; cur = name; curView = view; v.currentTime = 0; v.play().catch(() => {});
  }
  function startLoop() { const w = loopFor(S.view); if (w && clipOK(w)) playClip(w, S.view); else cur = null; }
  function clips() {
    if (QS.has('stills')) return;
    if (!cur) { startLoop(); return; }
    if (!ONCE.has(cur) && curView !== S.view && !pending) { startLoop(); return; }   // the story changed view without a clip: the view cross-fade covers it
    const v = CLIP[cur];
    if (!v.ended && v.currentTime < v.duration - .03) return;                          // mid-clip: never switch
    if (ONCE.has(cur) && pending && pending.started) {                                 // a one-shot clip just ended on its last still
      const p = pending; pending = null; S.view = curView; viewA = viewB = curView; mix = 1; p.done();
    }
    if (pending && !pending.started) { pending.started = true; playClip(pending.name, pending.view); pending.onStart && pending.onStart(); return; }
    startLoop();
  }
  const ONCE = new Set(['v_take_hand', 'v_lean_in', 'v_lean_back', 'v_lean_in_r', 'v_leave', 'v_hands_breath']);
  // layered stills (demos/shared/layers.js) breathe / sway on their own: no page zoom / bob on top (the background would breathe with her)
  const LIVE = () => !!(window.MoHeatLayers && window.MoHeatLayers.live);
  function drawView(view, t, alpha) {
    if (cur && clipOK(cur) && (view === curView || view === S.view && ONCE.has(cur))) {
      ctx.save(); if ((MIRROR[curView] || []).includes(cur)) { ctx.translate(W, 0); ctx.scale(-1, 1); }
      ctx.globalAlpha = alpha; ctx.drawImage(CLIP[cur], 0, 0, W, H);
      ctx.restore(); ctx.globalAlpha = 1; return;
    }
    drawStill(view, t, alpha);
  }
  function drawStill(view, t, alpha) {
    const name = BASE[view], im = IMG[name] || IMG.bg_queue;
    ctx.globalAlpha = alpha;
    if (!im) { ctx.fillStyle = '#2a2140'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; return; }
    const near = view === 'leanL' || view === 'leanR';
    const lv = LIVE() && name !== 'bg_queue', z = near ? 1.02 + (lv ? 0 : .008 * Math.sin(t * .6)) : view === 'queue' ? 1.0 + .004 * Math.sin(t * .3) : 1.0 + (lv ? 0 : .005 * Math.sin(t * .45));
    const ox = W / 2 - W * z / 2, oy = H / 2 - H * z / 2 + (near && !lv ? 2 * Math.sin(t * 1.1) : 0);
    ctx.save();
    // the right-ear lean is its own still (hina_lean_r: the pose mirrored WITHOUT the star stud — he wears one, on his left ear — over
    // the unmirrored booth plate); mirroring the whole canvas swapped the stud and the room (same-character rule, fix4 2026-11-09)
    ctx.drawImage(im, ox, oy, W * z, H * z);
    const patch = (pn, w) => { const p = IMG[pn], a = PATCH[pn]; if (!p || !a || w < .01) return; ctx.globalAlpha = alpha * Math.min(1, w); ctx.drawImage(p, ox + a[0] * z, oy + a[1] * z, p.width * z, p.height * z); };
    if (name !== 'bg_queue') {
      patch(`${name}_blink_eyeL`, FW.blink); patch(`${name}_blink_eyeR`, FW.blink);
      patch(`${name}_talk_mouth`, FW.mouth);
      patch(`${name}_quiet_mouth`, 1 - FW.mouth);   // the booth picture is drawn mid-laugh: a closed-mouth patch when he is quiet
    }
    ctx.restore(); ctx.globalAlpha = 1;
  }
  let snow = [];
  function draw(t, dt) {
    if (t > blinkAt) { blinkUntil = t + .13; blinkAt = t + rnd(2.5, 5); }
    faces(t, dt);
    if (S.view !== viewB) { viewA = viewB; viewB = S.view; mix = 0; }
    clips(dt);
    mix = Math.min(1, mix + dt / .55);
    if (mix < 1) drawView(viewA, t, 1);
    drawView(viewB, t, mix < 1 ? mix : 1);
    // a few snowflakes blown in through the doors on the right when they open
    if (S.gust > .3 && Math.random() < dt * 40) snow.push({ x: W + 10, y: rnd(80, 700), vx: rnd(-420, -200), vy: rnd(20, 90), r: rnd(3, 6), life: 0 });
    for (const f of snow) { f.life += dt; f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= 1 - dt * .8; }
    snow = snow.filter((f) => f.life < 3.2 && f.x > -20);
    for (const f of snow) { ctx.fillStyle = `rgba(255,255,255,${.85 * (1 - f.life / 3.2)})`; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 7); ctx.fill(); }
    if (S.heart) { const g = ctx.createRadialGradient(W / 2, H / 2, 300, W / 2, H / 2, 1150), k = .22 + .06 * Math.sin(t * 7.6); g.addColorStop(0, 'rgba(255,170,210,0)'); g.addColorStop(1, `rgba(255,140,190,${k})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    if (S.fade) { S.fadeA = Math.min(1, (S.fadeA || 0) + dt / 3); ctx.fillStyle = `rgba(20,12,28,${S.fadeA})`; ctx.fillRect(0, 0, W, H); }
    // the handshake timer: 10 s… and then it keeps going (he does not let go)
    const pill = $('timerPill'); pill.classList.toggle('show', S.shake != null);
    if (S.shake != null) {
      const left = 10 - (S.clock - S.shake), over = left < 0;
      pill.classList.toggle('over', over);
      pill.innerHTML = over ? `<i class="dot"></i><b>延長</b><span>+${fmt(-left)}</span><em>overtime</em>` : `<i class="dot"></i><b>握手</b><span>${fmt(left + .99)}</span><em>handshake</em>`;
    }
  }

  // ---------------------------------------------------------------- side panel + device (DUAL protocol)
  const rc = $('radar').getContext('2d');
  function radar(src, th) {
    const cx = 240, cy = 220, R = 160; rc.clearRect(0, 0, 480, 420);
    rc.strokeStyle = 'rgba(255,255,255,.08)'; rc.lineWidth = 1.5; for (const r of [R * .5, R]) { rc.beginPath(); rc.arc(cx, cy, r, 0, 7); rc.stroke(); }
    rc.fillStyle = '#8a7d93'; rc.font = '600 13px Inter'; rc.textAlign = 'center'; rc.fillText('front', cx, cy - R - 10); rc.fillText('L', cx - R - 18, cy + 5); rc.fillText('R', cx + R + 18, cy + 5);
    for (const [e, sx] of [['L', -1], ['R', 1]]) {   // each ear: warm half on top, cool half below (both can be on)
      const h = th[e + 'h'], c = th[e + 'c'];
      rc.fillStyle = h > .02 ? `rgba(255,122,69,${.25 + .75 * h})` : '#2a2333'; rc.beginPath(); rc.ellipse(cx + sx * 46, cy - 6, 12, 14, 0, Math.PI, 0); rc.fill();
      rc.fillStyle = c > .02 ? `rgba(79,179,255,${.25 + .75 * c})` : '#2a2333'; rc.beginPath(); rc.ellipse(cx + sx * 46, cy - 4, 12, 22, 0, 0, Math.PI); rc.fill();
    }
    rc.fillStyle = '#3a3046'; rc.beginPath(); rc.arc(cx, cy, 40, 0, 7); rc.fill();
    rc.font = '26px sans-serif'; rc.textBaseline = 'middle';
    for (const s of src) { const r = s.layer === 'voice' && POS[S.view].dist < .3 ? R * .55 : R, x = cx + Math.sin(s.az) * r, y = cy - Math.cos(s.az) * r; rc.globalAlpha = clamp(.35 + s.s); rc.fillStyle = s.k === 'h' ? 'rgba(255,122,69,.25)' : 'rgba(79,179,255,.25)'; rc.beginPath(); rc.arc(x, y, 18 + 18 * s.s, 0, 7); rc.fill(); rc.fillText(s.icon, x, y + 1); rc.globalAlpha = 1; }
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
  let both = 0;   // frames where one ear is warm and cool at once (allowed with DUAL)
  function output(th, live) {
    const sc = Object.fromEntries(Object.entries(th).map(([k, v]) => [k, live && !tripped ? v * intensity : 0]));
    if ((sc.Lc > OFF && sc.Lh > OFF) || (sc.Rc > OFF && sc.Rh > OFF)) both++;
    for (const [k, [bar, val]] of Object.entries(meterEls)) { bar.style.width = `${sc[k] * 100}%`; val.textContent = Math.round(sc[k] * 100); }
    const cmd = command(sc); $('cmd').textContent = cmd;
    for (const [e, el] of [['L', $('glowL')], ['R', $('glowR')]]) {
      const c = sc[e + 'c'], h = sc[e + 'h'], dir = e === 'L' ? 'right' : 'left';
      el.style.opacity = Math.max(c, h) > .01 ? 1 : 0;   // warm from the top, cool from the bottom
      el.style.background = `linear-gradient(to ${dir}, rgba(255,122,69,${(.55 * h).toFixed(2)}), rgba(255,122,69,0)) top / 100% ${c > OFF ? 55 : 100}% no-repeat, linear-gradient(to ${dir}, rgba(79,179,255,${(.55 * c).toFixed(2)}), rgba(79,179,255,0)) bottom / 100% ${h > OFF ? 55 : 100}% no-repeat`;
    }
    if (!device.isConnected() || !$('sendOn').checked) return;
    const n = performance.now(); if (cmd !== lastSent && n - lastSendAt >= SEND_INTERVAL) { device.send(cmd); lastSent = cmd; lastSendAt = n; }
  }
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  // ---------------------------------------------------------------- loop / start / end
  let last = performance.now(), hidden = false;
  const WHERE = { queue: 'In line', booth: 'Across the table', hands: 'Holding your hands', leanL: 'At your left ear', leanR: 'At your right ear', wave: 'Waving goodbye' };
  function loop() {
    const n = performance.now(), dt = clamp((n - last) / 1000, 0, .05); last = n;
    if (!hidden) {
      update(dt);
      if (S.started) draw(S.t, dt); else drawCover();
      const { th, src } = thermal(dt); output(th, S.started); radar(S.started ? src : [], th);
      $('clock').textContent = fmt(S.clock);
      $('posInfo').textContent = S.started ? WHERE[S.view] : '';
    }
    requestAnimationFrame(loop);
  }
  document.addEventListener('visibilitychange', () => { hidden = document.hidden; if (hidden) { stopOutput(); SND.ctx()?.suspend(); } else { last = performance.now(); SND.ctx()?.resume(); } });
  document.addEventListener('keydown', (e) => { if (e.code === 'Escape') emergencyStop(); });
  function finish() {
    S.started = false; run++; stopOutput();
    for (const k of ['crowd', 'music', 'draft', 'heart']) SND.loop(k)?.stop();
    sub('', ''); $('timerPill').classList.remove('show');
    for (const el of [choiceEl, actEl, micEl]) el.classList.remove('show');
    const c = $('cleared'); c.hidden = false; c.textContent = '💗 次も、陽向の列でね · Next time, only his line';
    $('startBtn').textContent = '↺ もう一度 · Play again'; $('intro').classList.remove('hidden');
  }
  function start() {
    SND.init(); ensureMic(); SND.loadVoices(Object.keys(LINES));
    S = fresh(); S.started = true; snow = []; viewA = viewB = 'queue'; mix = 1; $('cleared').hidden = true;
    $('intro').classList.add('hidden');
    story();
  }
  $('startBtn').addEventListener('click', start);
  $('lrBtn').addEventListener('click', () => { SND.lrCheck(); const b = $('lrBtn'); b.textContent = '🎧 Left…'; setTimeout(() => { b.textContent = '🎧 …Right'; }, 900); setTimeout(() => { b.textContent = '🎧 Left / Right check'; }, 1900); });
  $('soundBtn').addEventListener('click', (e) => { SND.setMuted(!SND.isMuted()); e.target.textContent = SND.isMuted() ? '🔇' : '🔊'; });
  function drawCover() {}   // UI v2: the cover is the finished image (media/cover/, tools/web/covers.py)
  window.HINA = { get S() { return S; }, FW, get cur() { return cur; }, CLIP, thermal: () => thermal(.05), both: () => both, skip: (v) => { S.view = v; } };
  setStep(0);
  if (QS.has('cover')) { document.body.classList.add('cover-only'); artReady.then(drawCover); return; }
  if (QS.has('autoplay')) { const ac = SND.init(); if (ac.state === 'running') start(); else ac.resume().then(() => { if (ac.state === 'running' && !S.started) start(); }).catch(() => {}); }
  requestAnimationFrame(loop);
})();
