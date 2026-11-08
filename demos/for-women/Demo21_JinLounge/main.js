// 『俺だけ見てろ』 — Jin (original character), the domineering heir and rapper of the group, calls you into his private VIP lounge
// after the concert. He presses an ice-cold can to your right cheek (right cool), grabs your wrist (warm), takes off his sunglasses
// and makes you hold his gaze (his face right in front: both warm), murmurs at your right ear (right warm), then wraps you in his
// leather jacket (both ears warm). His voice always warms (DUAL: cool and heat independent per ear). Every scene is a Seedance loop.
(() => {
  const $ = (id) => document.getElementById(id);
  const QS = new URLSearchParams(location.search);
  const SND = window.JLAudio, LINES = window.JIN_LINES, W = 1920, H = 1080;
  const cv = $('scene'), ctx = cv.getContext('2d'), stage = $('stage');
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), rnd = (a, b) => a + Math.random() * (b - a);
  const sleep = (s) => new Promise((r) => setTimeout(r, s * 1000));

  // ---------------------------------------------------------------- art: stills (fallback / cover) + clips (handoff §4b, 2026-11-08)
  // Seedance 2.5 Lite 1080p clips whose first and last frames are EXACTLY the stills (scripts/prepare_video.py): talk loops
  // v_<view>, quiet loops v_<view>_idle while he waits, and a transition t_<from>_<to> for every cut. Clips only switch at a clip's
  // end (identical frames → hard cut, no ghosting); the story asks for a transition with go(). ?stills = no video.
  const VIEWS = ['lounge', 'can', 'wrist', 'glasses', 'gaze', 'whisper', 'jacket'];
  const IMG = {};
  const artReady = Promise.all(VIEWS.map((n) => new Promise((res) => { const im = new Image(); im.onload = () => { IMG[n] = im; res(); }; im.onerror = () => res(); im.src = `media/art/jin_${n}.jpg?v=2`; })));
  const CLIP_NAMES = ['v_lounge', 'v_lounge_idle', 'v_can', 'v_can_idle', 'v_wrist', 'v_glasses', 'v_gaze_idle', 'v_whisper', 'v_jacket', 'v_jacket_idle',
    't_lounge_can', 't_can_wrist', 't_wrist_glasses', 't_glasses_gaze', 't_gaze_whisper', 't_whisper_jacket'];
  const ONCE = new Set(CLIP_NAMES.filter((n) => n.startsWith('t_')));
  const CLIP = {};
  if (!QS.has('stills')) for (const n of CLIP_NAMES) {
    const v = document.createElement('video'); Object.assign(v, { muted: true, loop: false, playsInline: true, preload: 'auto', src: `media/video/${n}.mp4?v=4` });
    v.setAttribute('playsinline', ''); v.addEventListener('error', () => { delete CLIP[n]; }); CLIP[n] = v;
  }
  const clipOK = (n) => n && CLIP[n] && CLIP[n].readyState >= 2;

  // ---------------------------------------------------------------- state
  const fresh = () => ({ started: false, done: false, t: 0, clock: 0, view: 'lounge', can: 0, grip: 0, gaze: 0, ear: 0, jacket: 0, near: 0, fade: 0, lv: 0, pos: { az: 0, dist: .8 } });
  let S = fresh(), run = 0;
  const STEPS = [['call', '楽屋に呼ばれた', 'Called to his lounge'], ['can', '冷たいいたずら', 'A cold prank'], ['look', '俺だけ見てろ', 'Look only at me'],
    ['ear', '耳元で', 'At your ear'], ['jacket', '彼のジャケット', 'His jacket']];
  function setStep(i) { $('steps').innerHTML = STEPS.map((s, k) => `<li class="${k < i ? 'done' : k === i ? 'now' : ''}">${s[1]} · <small>${s[2]}</small></li>`).join(''); }

  // ---------------------------------------------------------------- subtitles + voice
  const subJa = $('subJa'), subEn = $('subEn'), subs = $('subs');
  function sub(ja, en) { subJa.textContent = ja || ''; subEn.textContent = en || ''; subs.classList.toggle('show', !!ja); }
  let talking = 0;
  async function say(id, where = { az: 0, dist: .8 }) {
    const my = run; const [ja, en, mode] = LINES[id]; S.pos = where;
    sub(ja, en); talking++;
    await SND.say(id, where, mode === 'w' ? 1.8 : 1.45);
    talking--; if (my !== run) throw new Error('stopped');
    await sleep(.35); sub('', '');
  }

  // ---------------------------------------------------------------- your turn: choices, actions, hold
  const choiceEl = $('choices'), actEl = $('act');
  function choice(opts, timeout = 20) {
    return new Promise((res) => {
      choiceEl.innerHTML = opts.map((o, i) => `<button class="ch" data-i="${i}"><b>${o[0]}</b><span>${o[1]}</span></button>`).join('');
      choiceEl.classList.add('show');
      const done = (i) => { clearTimeout(tm); choiceEl.classList.remove('show'); choiceEl.innerHTML = ''; res(i); };
      choiceEl.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => done(+b.dataset.i)));
      const tm = setTimeout(() => done(0), timeout * 1000);
    });
  }
  function action(icon, ja, en) {
    return new Promise((res) => {
      actEl.innerHTML = `<button class="act-btn"><i>${icon}</i><b>${ja}</b><span>${en}</span></button>`; actEl.classList.add('show');
      actEl.querySelector('button').addEventListener('click', () => { actEl.classList.remove('show'); actEl.innerHTML = ''; res(); });
    });
  }
  // press and HOLD (mouse, touch or Space) for `sec` seconds; releasing early pauses the count
  function hold(icon, ja, en, sec, onTick) {
    return new Promise((res) => {
      actEl.innerHTML = `<button class="act-btn hold"><i>${icon}</i><b>${ja}</b><span>${en}</span><em class="bar"><u></u></em></button>`; actEl.classList.add('show');
      const b = actEl.querySelector('button'), bar = b.querySelector('u'); let down = false, k = 0, last = performance.now();
      const set = (v) => (e) => { e?.preventDefault?.(); down = v; b.classList.toggle('down', v); };
      b.addEventListener('pointerdown', set(true)); for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, set(false));
      const key = (v) => (e) => { if (e.code === 'Space') { e.preventDefault(); down = v; b.classList.toggle('down', v); } };
      const kd = key(true), ku = key(false); addEventListener('keydown', kd); addEventListener('keyup', ku);
      const tick = () => {
        const n = performance.now(), dt = (n - last) / 1000; last = n;
        if (down) k = Math.min(1, k + dt / sec); onTick?.(down, k); bar.style.width = `${k * 100}%`;
        if (k >= 1) { removeEventListener('keydown', kd); removeEventListener('keyup', ku); actEl.classList.remove('show'); actEl.innerHTML = ''; res(); return; }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  // ---------------------------------------------------------------- the story
  const FRONT = { az: 0, dist: .8 }, CLOSE = { az: 0, dist: .45 }, RIGHT_EAR = { az: 1.35, dist: .12 };
  async function story() {
    const my = ++run;
    try {
      setStep(0); S.view = 'lounge'; SND.fx.door(); SND.loop('hall')?.set(.25);
      await sleep(1.2);
      await say('j01'); await say('j02');
      await action('👣', '近づく', 'Go to him');
      SND.fx.leather(0, .7); S.near = .5; await sleep(.6);
      // the cold can on your right cheek
      setStep(1); await go('t_lounge_can', 'can');
      await say('j03', CLOSE); SND.fx.can(); S.can = 1; await sleep(.8);
      await say('j04', CLOSE);
      S.can = .4;
      await say('j05', CLOSE);
      const a = await choice([['ずっと迅を見てた', 'I was watching only you'], ['…ほかのメンバーも', '…the other members too']]);
      S.can = 0;
      // he grabs your wrist
      setStep(2); await go('t_can_wrist', 'wrist'); SND.fx.leather(.5, .35); S.grip = 1; S.near = .8;
      await say(a ? 'j06b' : 'j06a', CLOSE);
      await go('t_wrist_glasses', 'glasses'); S.near = 1; SND.fx.leather(.3, .3);
      await say('j07', CLOSE);
      // he pushes his sunglasses up (one shot), then just looks at you, silent, while you hold his gaze
      SND.loop('heart')?.set(.12); await go('t_glasses_gaze', 'gaze');
      await hold('👀', '目をそらさない（長押し）', 'Hold his gaze (press and hold)', 3, (down, k) => { S.gaze = down ? k : S.gaze * .98; SND.loop('heart')?.set(down ? .35 + .35 * k : .15); });
      await sleep(.8);
      // he leans in to your right ear
      setStep(3); await go('t_gaze_whisper', 'whisper'); S.gaze = .5; SND.fx.leather(.8, .3); await sleep(.4);
      await say('j08', { az: .9, dist: .3 });
      S.near = .5; S.gaze = 0; SND.loop('heart')?.set(.12); await sleep(.3);
      S.ear = 1; await say('j10', RIGHT_EAR); await sleep(.6); S.ear = .4;
      // his jacket
      setStep(4); await go('t_whisper_jacket', 'jacket'); S.near = .8; SND.fx.leather(0, .3);
      await say('j09', CLOSE);
      await action('🧥', 'ジャケットにくるまる', 'Wrap yourself in his jacket');
      SND.fx.leather(-.6, .2); setTimeout(() => SND.fx.leather(.6, .2), 200); S.jacket = 1; S.ear = 0;
      await sleep(1.2); await say('j11', CLOSE);
      await sleep(2.2); SND.fx.ice(); S.fade = 1; await sleep(3.2); finish();
    } catch (e) { if (e.message !== 'stopped') console.error(e); }
  }

  // ---------------------------------------------------------------- per-frame state + thermal
  function update(dt) {
    S.t += dt; if (!S.started) return;
    S.clock += dt; S.lv = SND.voiceLevel();
  }
  // Thermal, two layers (firmware DUAL: cool and heat independent on each ear — CLAUDE.md, 2026-11-08).
  //  · VOICE: a voice is warm. His loudness (0.1 + 0.8 × level) warms the ear he speaks at — × 1 right at your ear,
  //    × 0.6 when he is close (≤ 50 cm), × 0.28 from across the room; halved when he is straight in front (shared by both ears).
  //  · AMBIENT: only real warm / cold things at your head: the ice-cold can on your right cheek, his face (and body heat) right
  //    in front of you while he holds your gaze, his breath at your right ear, the leather jacket's warm collar around you.
  //    Nothing for what is only a feeling (no heat for "his hand on your wrist" — it is not at your ears).
  function sources() {
    const out = [], add = (az, k, s, icon) => { if (s > .01) out.push({ az, k, s, icon }); };
    if (!S.started) return out;
    const P = S.pos;
    if (talking) add(P.az, 'h', (.1 + .8 * clamp(S.lv * 8)) * (P.dist < .15 ? 1 : P.dist <= .5 ? .6 : .28) * (Math.abs(P.az) < .5 ? .5 : 1), '💬');
    if (S.can) add(1.4, 'c', .85 * S.can, '🥫');                 // the ice-cold can pressed to your right cheek
    if (S.near > .6) add(0, 'h', .2 * (S.near - .6) / .4 + .25 * S.gaze, '🖤');   // his face a hand's width from yours
    if (S.ear) add(1.4, 'h', .35 * S.ear, '🌬');                 // his breath at your right ear (on top of his voice)
    if (S.jacket) { add(-1.5, 'h', .5 * S.jacket, '🧥'); add(1.5, 'h', .5 * S.jacket, '🧥'); }   // the warm collar around your neck
    return out;
  }
  const ear = { Lc: 0, Lh: 0, Rc: 0, Rh: 0 };
  function thermal(dt) {
    const sum = { L: { h: 0, c: 0 }, R: { h: 0, c: 0 } }, src = sources();
    for (const s of src) { const sn = Math.sin(s.az), wL = clamp(1 - 1.2 * Math.max(0, sn)), wR = clamp(1 - 1.2 * Math.max(0, -sn)); sum.L[s.k] += s.s * wL; sum.R[s.k] += s.s * wR; }
    for (const e of ['L', 'R']) for (const k of ['c', 'h']) {   // each of the four channels on its own (DUAL)
      const target = k === 'h' ? Math.min(.9, sum[e].h) : Math.min(1, sum[e].c), cur = ear[e + k];
      const tau = target > cur ? (k === 'h' ? .4 : .2) : (k === 'h' ? .5 : .35);
      ear[e + k] = cur + (target - cur) * (1 - Math.exp(-dt / tau));
    }
    return { th: { ...ear }, src };
  }

  // ---------------------------------------------------------------- drawing: clips switch only at a clip's end (handoff §4b)
  let viewA = 'lounge', viewB = 'lounge', mix = 1;
  let cur = null, curView = null, pending = null;
  function loopFor(view) {
    const quiet = !talking, idle = `v_${view}_idle`, talk = `v_${view}`;
    if (quiet && clipOK(idle)) return idle;
    return clipOK(talk) ? talk : clipOK(idle) ? idle : null;
  }
  function go(name, view) {   // a one-shot transition at the next clip end, then continue in `view`
    if (!clipOK(name) || !cur) { S.view = view; return Promise.resolve(); }
    const my = run;
    return new Promise((done, fail) => { pending = { name, view, done: () => (my === run ? done() : fail(new Error('stopped'))), started: false }; });
  }
  function playClip(name, view) { const v = CLIP[name]; cur = name; curView = view; v.currentTime = 0; v.play().catch(() => {}); }
  function startLoop() { const w = loopFor(S.view); if (w) playClip(w, S.view); else cur = null; }
  function clips() {
    if (QS.has('stills')) return;
    if (!cur) { startLoop(); return; }
    if (!ONCE.has(cur) && curView !== S.view && !pending) { startLoop(); return; }
    const v = CLIP[cur];
    if (!v.ended && v.currentTime < v.duration - .03) return;   // mid-clip: never switch
    if (ONCE.has(cur) && pending && pending.started) { const p = pending; pending = null; S.view = curView; viewA = viewB = curView; mix = 1; p.done(); return; }   // next frame: the line that follows go() has started, so loopFor picks the talk loop
    if (pending && !pending.started) { pending.started = true; playClip(pending.name, pending.view); return; }
    startLoop();
  }
  function drawView(view, alpha) {
    const src = cur && clipOK(cur) && (view === curView || (view === S.view && ONCE.has(cur))) ? CLIP[cur] : IMG[view];
    if (!src) { ctx.fillStyle = '#1a0f14'; ctx.globalAlpha = alpha; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; return; }
    ctx.globalAlpha = alpha; ctx.drawImage(src, 0, 0, W, H); ctx.globalAlpha = 1;
  }
  function draw(t, dt) {
    if (S.view !== viewB) { viewA = viewB; viewB = S.view; mix = 0; }
    clips();
    mix = Math.min(1, mix + dt / .5);
    if (mix < 1) drawView(viewA, 1);
    drawView(viewB, mix < 1 ? mix : 1);
    if (S.gaze > .05) { const g = ctx.createRadialGradient(W / 2, H / 2, 300, W / 2, H / 2, 1100); g.addColorStop(0, 'rgba(120,0,30,0)'); g.addColorStop(1, `rgba(120,0,30,${.35 * S.gaze})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    if (S.fade) { S.fadeA = Math.min(1, (S.fadeA || 0) + dt / 3); ctx.fillStyle = `rgba(10,4,8,${S.fadeA})`; ctx.fillRect(0, 0, W, H); }
  }

  // ---------------------------------------------------------------- side panel + device (same protocol as every demo)
  const rc = $('radar').getContext('2d');
  function radar(src, th) {
    const cx = 240, cy = 220, R = 160; rc.clearRect(0, 0, 480, 420);
    rc.strokeStyle = 'rgba(255,255,255,.08)'; rc.lineWidth = 1.5; for (const r of [R * .5, R]) { rc.beginPath(); rc.arc(cx, cy, r, 0, 7); rc.stroke(); }
    rc.fillStyle = '#8a7d93'; rc.font = '600 13px Inter'; rc.textAlign = 'center'; rc.fillText('front', cx, cy - R - 10); rc.fillText('L', cx - R - 18, cy + 5); rc.fillText('R', cx + R + 18, cy + 5);
    for (const [e, sx] of [['L', -1], ['R', 1]]) {
      rc.fillStyle = '#2a2333'; rc.beginPath(); rc.ellipse(cx + sx * 46, cy, 12, 24, 0, 0, 7); rc.fill();
      for (const [k, col, dy] of [['h', '255,122,69', -12], ['c', '79,179,255', 12]]) if (th[e + k] > .02) { rc.fillStyle = `rgba(${col},${.25 + .75 * th[e + k]})`; rc.beginPath(); rc.ellipse(cx + sx * 46, cy + dy, 11, 12, 0, 0, 7); rc.fill(); }
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
  let both = 0;
  function output(th, live) {
    const sc = Object.fromEntries(Object.entries(th).map(([k, v]) => [k, live && !tripped ? v * intensity : 0]));
    if ((sc.Lc > OFF && sc.Lh > OFF) || (sc.Rc > OFF && sc.Rh > OFF)) both++;   // the same ear warm and cool at once (allowed with DUAL)
    for (const [k, [bar, val]] of Object.entries(meterEls)) { bar.style.width = `${sc[k] * 100}%`; val.textContent = Math.round(sc[k] * 100); }
    const cmd = command(sc); $('cmd').textContent = cmd;
    for (const [e, el] of [['L', $('glowL')], ['R', $('glowR')]]) {
      const c = sc[e + 'c'], h = sc[e + 'h'], v = Math.max(c, h), dir = e === 'L' ? 'right' : 'left';
      el.style.opacity = v.toFixed(2); el.style.background = `linear-gradient(to ${dir}, rgba(255,122,69,${(.55 * h / (v || 1)).toFixed(2)}), rgba(255,122,69,0)), linear-gradient(to ${dir}, rgba(79,179,255,${(.55 * c / (v || 1)).toFixed(2)}), rgba(79,179,255,0))`;
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
      $('posInfo').textContent = S.started ? 'VIP lounge' : '';
    }
    requestAnimationFrame(loop);
  }
  document.addEventListener('visibilitychange', () => { hidden = document.hidden; if (hidden) { stopOutput(); SND.ctx()?.suspend(); } else { last = performance.now(); SND.ctx()?.resume(); } });
  document.addEventListener('keydown', (e) => { if (e.code === 'Escape') emergencyStop(); });
  function finish() {
    S.done = true; S.started = false; run++; stopOutput();
    for (const k of ['hall', 'heart']) SND.loop(k)?.stop();
    sub('', '');
    const c = $('cleared'); c.hidden = false; c.textContent = '🖤 …次も、俺だけ見てろよ · Next time too, look only at me';
    $('startBtn').textContent = '↺ もう一度 · Play again'; $('intro').classList.remove('hidden');
  }
  function start() {
    SND.init(); SND.loadVoices(Object.keys(LINES));
    S = fresh(); S.started = true; viewA = viewB = 'lounge'; mix = 1; cur = null; pending = null; $('cleared').hidden = true;
    $('intro').classList.add('hidden');
    story();
  }
  $('startBtn').addEventListener('click', start);
  $('lrBtn').addEventListener('click', () => { SND.lrCheck(); const b = $('lrBtn'); b.textContent = '🎧 Left…'; setTimeout(() => { b.textContent = '🎧 …Right'; }, 900); setTimeout(() => { b.textContent = '🎧 Left / Right check'; }, 1900); });
  $('soundBtn').addEventListener('click', (e) => { SND.setMuted(!SND.isMuted()); e.target.textContent = SND.isMuted() ? '🔇' : '🔊'; });
  function drawCover() {   // cover standard (shared/cover.js): the still with the face on the standard spot, the title in the shaded left column
    const im = IMG.lounge, C = window.MoHeatCover; if (!im) { ctx.fillStyle = '#1a0f14'; ctx.fillRect(0, 0, W, H); return; }
    const pic = () => ctx.drawImage(im, 0, 0, W, H);
    if (C) C.fit(ctx, { eye: [.484, .27], face: .273 }, pic, { tone: '#1a0f14', covers: [0, 0, 1, 1] }); else pic();   // eye / face: where the face is in this drawing (tools/web/check_cover.py)
  }
  window.JIN = { get S() { return S; }, thermal: () => thermal(.05), both: () => both };
  setStep(0);
  if (QS.has('cover')) { document.body.classList.add('cover-only'); artReady.then(drawCover); return; }
  if (QS.has('autoplay')) { const ac = SND.init(); if (ac.state === 'running') start(); else ac.resume().then(() => { if (ac.state === 'running' && !S.started) start(); }).catch(() => {}); }
  requestAnimationFrame(loop);
})();
