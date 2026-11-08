// 『もしもし、きこえる？』 — an interactive late-night phone call with Ren (original character), lead vocalist of an idol group.
// The phone is pressed to one ear: his voice is band-limited and right at that ear, and that ear is warm (phone + breath).
// You answer him (choices / your voice), open the window to the same snow he sees (cool on the window side), switch the phone to
// your other ear (voice and warmth move), he whispers a secret, asks you to say good night… then the doorbell: he is at your door.
// The call ends, his REAL voice is in the room, he asks you to warm him up. Per ear only the stronger of heat / cool is sent.
(() => {
  const $ = (id) => document.getElementById(id);
  const QS = new URLSearchParams(location.search);
  const SND = window.CallAudio, LINES = window.REN_LINES, W = 1920, H = 1080;
  const cv = $('scene'), ctx = cv.getContext('2d'), stage = $('stage');
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k, rnd = (a, b) => a + Math.random() * (b - a);
  const sleep = (s) => new Promise((r) => setTimeout(r, s * 1000));

  // ---------------------------------------------------------------- art
  const IMG = {};
  const PATCH = window.REN_PATCHES || {};   // small face patches (mouth / eyes) laid over the base frame — scripts/prepare_art.py
  const NAMES = ['bg_room', 'bg_room_open', 'ren_call', 'ren_close', 'ren_door', 'ren_hug', ...Object.keys(PATCH)];
  const artReady = Promise.all(NAMES.map((n) => new Promise((res) => { const im = new Image(); im.onload = () => { IMG[n] = im; res(); }; im.onerror = () => res(); im.src = `media/art/${n}.webp?v=3`; })));

  // ---------------------------------------------------------------- state
  const fresh = () => ({ started: false, done: false, t: 0, clock: 0, callT: 0, inCall: false, ear: -1, view: 'room', windowOpen: 0, doorCold: 0, near: 0, hug: 0, shy: 0, whisper: 0, real: null, step: 0, fade: 0 });
  let S = fresh(), run = 0;
  const STEPS = [
    ['ring', '電話が鳴ってる', 'Your phone is ringing'], ['talk', '蓮と話そう', 'Talk with Ren'], ['window', '同じ雪を見よう', 'Watch the same snow'],
    ['switch', '反対の耳で聞いて', 'Listen with your other ear'], ['secret', 'ないしょの話', 'A secret'], ['door', '玄関の向こうに', 'At your door'],
  ];
  function setStep(i) { S.step = i; $('steps').innerHTML = STEPS.map((s, k) => `<li class="${k < i ? 'done' : k === i ? 'now' : ''}">${s[1]} · <small>${s[2]}</small></li>`).join(''); }

  // ---------------------------------------------------------------- subtitles
  const subJa = $('subJa'), subEn = $('subEn'), subs = $('subs');
  function sub(ja, en) { subJa.textContent = ja || ''; subEn.textContent = en || ''; subs.classList.toggle('show', !!ja); }

  // ---------------------------------------------------------------- Ren speaks
  let talking = 0;
  async function say(id, where = 'phone') {
    const my = run; const [ja, en, style] = LINES[id];
    S.whisper = style === 'w' ? 1 : 0;
    sub(ja, en); talking++;
    await SND.say(id, where === 'phone' && !SND.hasPhone() ? { az: S.ear * 1.4, dist: .15 } : where, style === 'w' ? 1.7 : 1.4);
    talking--; if (my !== run) throw new Error('stopped');
    await sleep(.35); sub('', '');
  }

  // ---------------------------------------------------------------- your turn: choices, your voice, actions
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
  function action(icon, ja, en, hotspot = null) {      // a big button (and optionally a hotspot on the picture)
    return new Promise((res) => {
      actEl.innerHTML = `<button class="act-btn"><i>${icon}</i><b>${ja}</b><span>${en}</span></button>`; actEl.classList.add('show');
      const done = () => { actEl.classList.remove('show'); actEl.innerHTML = ''; hot = null; stage.classList.remove('pointer'); res(); };
      actEl.querySelector('button').addEventListener('click', done);
      hot = hotspot ? { ...hotspot, done } : null;
    });
  }
  let hot = null;
  cv.addEventListener('pointerdown', (e) => {
    if (!hot) return; const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H;
    if (x > hot.x0 && x < hot.x1 && y > hot.y0 && y < hot.y1) hot.done();
  });
  cv.addEventListener('pointermove', (e) => {
    if (!hot) return; const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H;
    stage.classList.toggle('pointer', x > hot.x0 && x < hot.x1 && y > hot.y0 && y < hot.y1);
  });
  // your voice: say the line — speech recognition (shared/voice.js) clicks the button when it hears it; without recognition the mic level
  // (speech, then a short silence) counts; or press the button.
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
  async function story() {
    const my = ++run;
    try {
      // the phone buzzes on the nightstand (front right)
      S.view = 'room'; setStep(0); setLoops();
      await sleep(1.2);
      let ringing = true; (async () => { while (ringing && my === run) { SND.fx.vibrate(.55); SND.fx.ring(.55); await sleep(2.4); } })();
      $('incoming').classList.add('show');
      await new Promise((res) => { $('answerBtn').onclick = res; });
      ringing = false; $('incoming').classList.remove('show');
      SND.fx.answer(-1.4); SND.fx.rustle(-1.3, .25);
      S.inCall = true; S.ear = -1; SND.phoneOn(-1.45); S.view = 'call'; setStep(1);
      await sleep(.9);
      await say('c01'); await say('c02');
      const a = await choice([['ううん、起きてたよ', 'No, I was awake'], ['…ちょっと寝てた', '…I was kind of asleep']]);
      await say(a ? 'c03b' : 'c03a');
      await say('c04');
      const b = await choice([['すごくかっこよかった！', 'You were so cool!'], ['最前で見てたよ', 'I was right at the front']]);
      S.shy = 1; await say(b ? 'c05b' : 'c05a'); S.shy = 0;
      SND.loop('street')?.set(.35); await say('c06');
      // the window: the same snow (window on the right of your room → cool on the right, phone warm on the left)
      setStep(2); await say('c07'); S.view = 'room';
      await choice([['窓をあける', 'Open the window'], ['カーテンをあける', 'Open the curtain']]);   // two options, same reply (user: one-option moments → two)
      await go('t_room_open', 'roomOpen', () => { SND.fx.window(1.2, true); S.windowOpen = 1; setLoops(); });
      await sleep(2.2); await say('c08'); await sleep(1.5); await say('c09');
      await action('🪟', '窓をしめる', 'Close the window', { x0: 1250, x1: 1920, y0: 0, y1: 800 });
      await go('t_room_close', 'room', () => { SND.fx.window(1.2, false); S.windowOpen = 0; setLoops(); }); SND.loop('street')?.stop();
      S.view = 'call'; await sleep(.6);
      // switch ears: his voice and the warmth move to your right ear
      setStep(3); await say('c10');
      await action('⇄', 'スマホを持ちかえる', 'Switch the phone to your other ear');
      SND.fx.rustle(-1.2, .3); setTimeout(() => SND.fx.rustle(1.2, .3), 250);
      S.ear = 0; SND.phoneEar(0); await sleep(.4); S.ear = 1; SND.phoneEar(1.45); await sleep(.4);
      S.view = 'close'; setStep(4);
      await say('c11'); await say('c12'); await say('c13'); await say('c14');
      await speak('「おやすみ」って言ってみて', 'Say "good night" to him', '🌙 おやすみ', 'Good night');
      S.shy = 1; await say('c15'); S.shy = 0;
      // the doorbell — on the phone and in your hallway at the same time
      setStep(5); S.view = 'call'; await say('c16'); await sleep(.8);
      SND.fx.bell(-.75, 3.5, true); await sleep(2.2);
      await say('c17'); S.view = 'room';
      await choice([['玄関をあける', 'Open the door'], ['…だれ？', '…Who is it?']]);
      SND.fx.steps(.2, -.7, 5); await sleep(2); SND.fx.door(-.7);
      SND.fx.hangup(S.ear * 1.45); await sleep(.5); SND.phoneOff(); S.inCall = false; S.ear = 0;
      S.doorCold = 1; SND.fx.gust(); S.view = 'door'; S.real = { az: 0, dist: 1 };
      await sleep(1.4); await say('c18', { az: 0, dist: 1 }); await sleep(.4);
      await say('c19', { az: .1, dist: .8 });
      await action('🤍', 'ぎゅっ', 'Hold him');
      await go('t_door_hug', 'hug', () => { S.hug = 1; SND.fx.rustle(-.8, .3); SND.fx.rustle(.8, .3); SND.loop('heart', 0, .3)?.set(.5); });
      await sleep(1.8); await say('c20', { az: -1.35, dist: .12 });   // his face is on the left of the hug picture → your left ear
      await sleep(3); SND.fx.chime();
      S.fade = 1; await sleep(3.2); finish();
    } catch (e) { if (e.message !== 'stopped') console.error(e); }
  }
  function setLoops() {
    SND.loop('room', 0, 3)?.set(.05);
    if (S.windowOpen) SND.loop('snow', 1.2, 2)?.set(.5);
    else SND.loop('snow', 1.2, 2)?.stop();
  }

  // ---------------------------------------------------------------- per-frame state + thermal
  function update(dt) {
    S.t += dt; if (!S.started) return;
    S.clock += dt; if (S.inCall) S.callT += dt;
    const lv = SND.voiceLevel();
    S.near += ((S.inCall ? 1 : 0) - S.near) * (1 - Math.exp(-dt / .6));
    S.doorCold = Math.max(0, S.doorCold - dt / 5);
    S.lv = lv;
    // your voice
    if (micWait) {
      const ml = micState === 'on' ? micLevel() : 0; floor = ml < floor ? ml : floor + (ml - floor) * dt * .05;
      const loud = micState === 'on' && ml > Math.max(.02, floor * 4);
      if (loud) { micWait.talk += dt; micWait.quiet = 0; } else if (micWait.talk > .25) { micWait.quiet += dt; if (micWait.quiet > .5 && !window.MoHeatVoice?.judging()) micWait.done(); }   // speech recognition (shared/voice.js) judges the words; the level is the fallback
      micEl.querySelectorAll('.mic i').forEach((b, i) => { const on = ml * 9 > (i + 1) / 7; b.style.height = `${on ? 35 + 65 * Math.min(1, ml * 9 - i / 7) : 15}%`; b.style.opacity = on ? 1 : .35; });
      micEl.querySelector('.mic').hidden = micState !== 'on';
    }
    SND.tick(dt);
  }
  function sources() {
    const out = [], add = (az, k, s, icon) => { if (s > .01) out.push({ az, k, s, icon }); };
    if (!S.started) return out;
    if (S.inCall && S.ear) add(S.ear * 1.45, 'h', .42 * S.near + clamp(S.lv * 6) * (S.whisper ? .35 : .22), '📱');
    if (S.windowOpen) add(1.25, 'c', .62, '❄');
    if (S.doorCold > 0) add(-.4, 'c', .75 * S.doorCold, '🚪');
    if (S.view === 'door' || S.view === 'hug') add(0, 'h', .28 + clamp(S.lv * 6) * .2, '🧑');
    if (S.hug) add(0, 'h', .42, '🤍');
    if (S.hug && talking) add(1.35, 'h', .45 + clamp(S.lv * 6) * .2, '💬');   // "…会いたかった" right at your right ear
    return out;
  }
  const ear = { L: { mode: '', v: 0 }, R: { mode: '', v: 0 } };
  function thermal(dt) {
    const sum = { L: { h: 0, c: 0 }, R: { h: 0, c: 0 } }, src = sources();
    for (const s of src) { const sn = Math.sin(s.az), wL = clamp(1 - 1.2 * Math.max(0, sn)), wR = clamp(1 - 1.2 * Math.max(0, -sn)); sum.L[s.k] += s.s * wL; sum.R[s.k] += s.s * wR; }
    const th = { Lc: 0, Lh: 0, Rc: 0, Rh: 0 };
    for (const e of ['L', 'R']) {
      const E = ear[e], hh = Math.min(1, sum[e].h), cc = Math.min(1, sum[e].c);
      let mode = E.mode;
      if (!mode) mode = hh > cc ? 'h' : 'c'; else if (mode === 'h' && cc > hh + .06) mode = 'c'; else if (mode === 'c' && hh > cc + .06) mode = 'h';
      if (mode !== E.mode) { E.v = 0; E.mode = mode; }
      const target = mode === 'h' ? Math.min(.9, hh) : cc, tau = target > E.v ? (mode === 'h' ? .4 : .2) : .35;
      E.v += (target - E.v) * (1 - Math.exp(-dt / tau)); th[e + mode] = E.v;
    }
    return { th, src };
  }

  // ---------------------------------------------------------------- drawing
  let blinkAt = 2, blinkUntil = 0, viewA = 'room', viewB = 'room', mix = 1;
  const FW = { mouth: 0, blink: 0, shy: 0 };       // patch weights, smoothed → the mouth and eyes fade, nothing jumps
  const ease = (k, target, dt, up, down) => k + (target - k) * (1 - Math.exp(-dt / (target > k ? up : down)));
  function faces(t, dt) {
    const open = talking ? clamp((S.lv - .008) * 45) : 0;
    FW.mouth = ease(FW.mouth, open, dt, .035, .07);
    FW.shy = ease(FW.shy, S.shy ? 1 : 0, dt, .25, .35);
    FW.blink = ease(FW.blink, t < blinkUntil && !talking ? 1 : 0, dt, .025, .05);
  }
  const BASE = { room: 'bg_room', roomOpen: 'bg_room_open', call: 'ren_call', close: 'ren_close', door: 'ren_door', hug: 'ren_hug' };
  // ---- animation (handoff §4b, 2026-11-08): Seedance 2.5 Lite 1080p clips whose first and last frames are EXACTLY the stills
  // (scripts/prepare_video.py). Loops per view (talk / quiet), transitions within one place (window open / close, door → hug);
  // a change of place (your room ↔ his street ↔ his close-up) cross-fades. Clips only switch at a clip's end. ?stills = stills + patches.
  const CLIP_NAMES = ['v_room', 'v_room_open', 'v_call_talk', 'v_call_idle', 'v_close', 'v_door_talk', 'v_door_idle', 'v_hug', 't_room_open', 't_room_close', 't_door_hug'];
  const ONCE = new Set(CLIP_NAMES.filter((n) => n.startsWith('t_')));
  const CLIP = {};
  if (!QS.has('stills')) for (const n of CLIP_NAMES) {
    const v = document.createElement('video'); Object.assign(v, { muted: true, loop: false, playsInline: true, preload: 'auto', src: `media/video/${n}.mp4?v=3` });
    v.setAttribute('playsinline', ''); v.addEventListener('error', () => { delete CLIP[n]; }); CLIP[n] = v;
  }
  const clipOK = (n) => n && CLIP[n] && CLIP[n].readyState >= 2;
  let cur = null, curView = null, pending = null;
  function loopFor(view) {
    const quiet = !talking;
    const L = { room: ['v_room'], roomOpen: ['v_room_open'], call: quiet ? ['v_call_idle', 'v_call_talk'] : ['v_call_talk'], close: ['v_close'],
      door: quiet ? ['v_door_idle', 'v_door_talk'] : ['v_door_talk', 'v_door_idle'], hug: ['v_hug'] }[view] || [];
    return L.find(clipOK) || null;
  }
  function go(name, view, onStart) {   // a one-shot transition at the next clip end (onStart when it begins), then continue in `view`
    if (!clipOK(name) || !cur) { onStart && onStart(); S.view = view; return Promise.resolve(); }
    const my = run;
    return new Promise((done, fail) => { pending = { name, view, onStart, done: () => (my === run ? done() : fail(new Error('stopped'))), started: false }; });
  }
  function playClip(name, view) { const v = CLIP[name]; cur = name; curView = view; v.currentTime = 0; v.play().catch(() => {}); }
  function startLoop() { const w = loopFor(S.view); if (w) playClip(w, S.view); else cur = null; }
  function clips() {
    if (QS.has('stills')) return;
    if (!cur) { startLoop(); return; }
    if (!ONCE.has(cur) && curView !== S.view && !pending) { startLoop(); return; }   // a change of place: the view cross-fade covers it
    const v = CLIP[cur];
    if (!v.ended && v.currentTime < v.duration - .03) return;   // mid-clip: never switch
    if (ONCE.has(cur) && pending && pending.started) { const p = pending; pending = null; S.view = curView; viewA = viewB = curView; mix = 1; p.done(); return; }   // next frame: the line that follows go() has started, so loopFor picks the talk loop
    if (pending && !pending.started) { pending.started = true; playClip(pending.name, pending.view); pending.onStart && pending.onStart(); return; }
    startLoop();
  }
  function drawView(view, t, alpha) {
    if (cur && clipOK(cur) && (view === curView || (view === S.view && ONCE.has(cur)))) { ctx.globalAlpha = alpha; ctx.drawImage(CLIP[cur], 0, 0, W, H); ctx.globalAlpha = 1; return; }
    const name = BASE[view], im = IMG[name] || IMG.bg_room;
    const exact = !QS.has('stills') && Object.keys(CLIP).length > 0;   // with video the still must match the clips' frames exactly
    const z = exact ? 1 : view === 'close' ? 1.02 + .01 * Math.sin(t * .5) : 1.0 + .004 * Math.sin(t * .4);
    const ox = W / 2 - W * z / 2, oy = H / 2 - H * z / 2;
    ctx.globalAlpha = alpha;
    if (!im) { ctx.fillStyle = '#1b1d36'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; return; }
    ctx.drawImage(im, ox, oy, W * z, H * z);
    const patch = (pn, w) => { const p = IMG[pn], at = PATCH[pn]; if (!p || !at || w < .01) return; ctx.globalAlpha = alpha * Math.min(1, w); ctx.drawImage(p, ox + at[0] * z, oy + at[1] * z, p.width * z, p.height * z); };
    if (view === 'call') { patch('ren_call_blink_eyeL', FW.blink); patch('ren_call_blink_eyeR', FW.blink); patch('ren_call_talk_mouth', FW.mouth); }
    if (view === 'close') patch('ren_close_talk_mouth', FW.mouth);
    if (view === 'door') patch('ren_door_talk_mouth', FW.mouth);
    ctx.globalAlpha = 1;
  }
  let snow = [];
  function draw(t, dt) {
    if (t > blinkAt) { blinkUntil = t + .13; blinkAt = t + rnd(2.5, 5); }
    faces(t, dt);
    if (S.view !== viewB) { viewA = viewB; viewB = S.view; mix = 0; }
    clips();
    mix = Math.min(1, mix + dt / .6);
    if (mix < 1) drawView(viewA, t, 1);
    drawView(viewB, t, mix < 1 ? mix : 1);
    if (S.windowOpen && (viewB === 'room' || viewB === 'roomOpen') && !(cur && clipOK(cur))) {   // snow drifting in from the window
      if (Math.random() < dt * 30) snow.push({ x: rnd(1350, 1900), y: rnd(-20, 300), vx: rnd(-90, -20), vy: rnd(40, 110), r: rnd(3, 7), life: 0 });
    }
    for (const f of snow) { f.life += dt; f.x += f.vx * dt; f.y += f.vy * dt; }
    snow = snow.filter((f) => f.life < 6 && f.y < H);
    ctx.fillStyle = 'rgba(255,255,255,.85)'; for (const f of snow) { ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 7); ctx.fill(); }
    if (S.view === 'hug') { const g = ctx.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, 1100); g.addColorStop(0, 'rgba(255,200,220,0)'); g.addColorStop(1, 'rgba(255,170,200,.35)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    if (S.fade) { S.fadeA = Math.min(1, (S.fadeA || 0) + dt / 3); ctx.fillStyle = `rgba(8,6,16,${S.fadeA})`; ctx.fillRect(0, 0, W, H); }
    // call pill
    const pill = $('callPill');
    pill.classList.toggle('show', S.inCall);
    if (S.inCall) pill.innerHTML = `<i class="dot"></i><b>蓮</b><span>${fmt(S.callT)}</span><em>${S.ear < 0 ? '📱 L' : S.ear > 0 ? 'R 📱' : '⇄'}</em>`;
  }

  // ---------------------------------------------------------------- side panel + device (same protocol as every demo)
  const rc = $('radar').getContext('2d');
  function radar(src, th) {
    const cx = 240, cy = 220, R = 160; rc.clearRect(0, 0, 480, 420);
    rc.strokeStyle = 'rgba(255,255,255,.08)'; rc.lineWidth = 1.5; for (const r of [R * .5, R]) { rc.beginPath(); rc.arc(cx, cy, r, 0, 7); rc.stroke(); }
    rc.fillStyle = '#8a7d93'; rc.font = '600 13px Inter'; rc.textAlign = 'center'; rc.fillText('front', cx, cy - R - 10); rc.fillText('L', cx - R - 18, cy + 5); rc.fillText('R', cx + R + 18, cy + 5);
    for (const [e, sx] of [['L', -1], ['R', 1]]) {
      const v = Math.max(th[e + 'c'], th[e + 'h']), col = th[e + 'c'] > th[e + 'h'] ? '79,179,255' : '255,122,69';
      rc.fillStyle = v > .02 ? `rgba(${col},${.25 + .75 * v})` : '#2a2333'; rc.beginPath(); rc.ellipse(cx + sx * 46, cy, 12, 24, 0, 0, 7); rc.fill();
    }
    rc.fillStyle = '#3a3046'; rc.beginPath(); rc.arc(cx, cy, 40, 0, 7); rc.fill();
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
  function command(th) {
    const part = (sd, c, h) => (c > OFF ? `${sd}C${Math.round(range.coolMin + c * (range.coolMax - range.coolMin))}` : h > OFF ? `${sd}H${Math.round(range.heatMin + h * (range.heatMax - range.heatMin))}` : `${sd}H0`);
    return Math.max(th.Lc, th.Lh, th.Rc, th.Rh) <= OFF ? 'stop' : `${part('L', th.Lc, th.Lh)} ${part('R', th.Rc, th.Rh)}`;
  }
  function stopOutput() { if (device.isConnected()) device.send('stop'); lastSent = 'stop'; }
  function emergencyStop() { tripped = !tripped; const b = $('estop'); if (tripped) { stopOutput(); b.textContent = '↺ Re-arm output'; b.classList.add('tripped'); } else { b.textContent = '■ STOP'; b.classList.remove('tripped'); lastSent = ''; } }
  $('estop').addEventListener('click', emergencyStop); addEventListener('pagehide', stopOutput);
  $('intensity').value = Math.round(intensity * 100); $('intensityVal').textContent = `${Math.round(intensity * 100)}%`;
  $('intensity').addEventListener('input', (e) => { intensity = +e.target.value / 100; $('intensityVal').textContent = `${e.target.value}%`; store.set('asmr.intensity', +e.target.value); });
  const meterEls = Object.fromEntries(['Lc', 'Lh', 'Rc', 'Rh'].map((k) => [k, [$(`m${k}`), $(`v${k}`)]]));
  let conflicts = 0;
  function output(th, live) {
    const sc = Object.fromEntries(Object.entries(th).map(([k, v]) => [k, live && !tripped ? v * intensity : 0]));
    if ((sc.Lc > OFF && sc.Lh > OFF) || (sc.Rc > OFF && sc.Rh > OFF)) conflicts++;
    for (const [k, [bar, val]] of Object.entries(meterEls)) { bar.style.width = `${sc[k] * 100}%`; val.textContent = Math.round(sc[k] * 100); }
    const cmd = command(sc); $('cmd').textContent = cmd;
    for (const [e, el] of [['L', $('glowL')], ['R', $('glowR')]]) {
      const c = sc[e + 'c'], h = sc[e + 'h'], v = Math.max(c, h), col = c > h ? '79,179,255' : '255,122,69';
      el.style.opacity = v.toFixed(2); el.style.background = `linear-gradient(to ${e === 'L' ? 'right' : 'left'}, rgba(${col},.55), rgba(${col},0))`;
    }
    if (!device.isConnected() || !$('sendOn').checked) return;
    const n = performance.now(); if (cmd !== lastSent && n - lastSendAt >= SEND_INTERVAL) { device.send(cmd); lastSent = cmd; lastSendAt = n; }
  }
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  // ---------------------------------------------------------------- loop / start / end
  let last = performance.now(), hidden = false;
  function loop() {
    const n = performance.now(), dt = clamp((n - last) / 1000, 0, .05); last = n;
    if (!hidden) {
      update(dt);
      if (S.started) draw(S.t, dt); else drawCover();
      const { th, src } = thermal(dt); output(th, S.started); radar(S.started ? src : [], th);
      $('clock').textContent = fmt(S.clock);
      $('posInfo').textContent = S.inCall ? (S.ear < 0 ? 'Phone · left ear' : S.ear > 0 ? 'Phone · right ear' : 'Switching…') : S.started ? 'Your room' : '';
    }
    requestAnimationFrame(loop);
  }
  document.addEventListener('visibilitychange', () => { hidden = document.hidden; if (hidden) { stopOutput(); SND.ctx()?.suspend(); } else { last = performance.now(); SND.ctx()?.resume(); } });
  document.addEventListener('keydown', (e) => { if (e.code === 'Escape') emergencyStop(); });
  function finish() {
    S.done = true; S.started = false; run++; stopOutput(); SND.phoneOff();
    for (const k of ['room', 'snow', 'street', 'heart']) SND.loop(k)?.stop();
    sub('', ''); $('callPill').classList.remove('show');
    const c = $('cleared'); c.hidden = false; c.textContent = '💗 また電話してね · Call me again sometime';
    $('startBtn').textContent = '↺ もう一度 · Play again'; $('intro').classList.remove('hidden');
  }
  function start() {
    SND.init(); ensureMic(); SND.loadVoices(Object.keys(LINES));
    S = fresh(); S.started = true; snow = []; viewA = viewB = 'room'; mix = 1; cur = null; pending = null; $('cleared').hidden = true;
    $('intro').classList.add('hidden');
    story();
  }
  $('startBtn').addEventListener('click', start);
  $('lrBtn').addEventListener('click', () => { SND.lrCheck(); const b = $('lrBtn'); b.textContent = '🎧 Left…'; setTimeout(() => { b.textContent = '🎧 …Right'; }, 900); setTimeout(() => { b.textContent = '🎧 Left / Right check'; }, 1900); });
  $('soundBtn').addEventListener('click', (e) => { SND.setMuted(!SND.isMuted()); e.target.textContent = SND.isMuted() ? '🔇' : '🔊'; });
  function drawCover() {   // cover standard (shared/cover.js): the still with the face on the standard spot, the title in the shaded left column
    // a whole painting, no cut-out (the pose's cut top / bottom edge showed inside the frame): the booth / street view widened by
    // tools/art/cover_plate.py (gpt-image-2 outpaint) so the face fits the standard; eye / face measured on the plate (SCRFD)
    const C0 = window.MoHeatCover, plate = C0?.img?.('media/art/cover_plate.jpg?v=1', drawCover);
    if (plate) { C0.fit(ctx, { eye: [.709, .329], face: .227 }, () => ctx.drawImage(plate, 0, 0, W, H), { at: { y: .31, face: .28 }, tone: '#1b1d36' }); return; }
    const im = IMG.ren_call, C = window.MoHeatCover; if (!im) { ctx.fillStyle = '#1b1d36'; ctx.fillRect(0, 0, W, H); return; }
    const pic = () => ctx.drawImage(im, 0, 0, W, H);
    if (C) C.fit(ctx, { eye: [.648, .256], face: .339 }, pic, { tone: '#1b1d36', covers: [0, 0, 1, 1] }); else pic();   // eye / face: where the face is in this drawing (tools/web/check_cover.py)
  }
  window.CALL = { get S() { return S; }, FW, thermal: () => thermal(.05), conflicts: () => conflicts };
  setStep(0);
  if (QS.has('cover')) { document.body.classList.add('cover-only'); artReady.then(drawCover); return; }
  if (QS.has('autoplay')) { const ac = SND.init(); if (ac.state === 'running') start(); else ac.resume().then(() => { if (ac.state === 'running' && !S.started) start(); }).catch(() => {}); }
  requestAnimationFrame(loop);
})();
