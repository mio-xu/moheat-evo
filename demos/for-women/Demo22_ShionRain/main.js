// 『雨が止むまで』 — Shion (original character), the soft-spoken keyboardist of the group. A rainy night: you arrive at his flat
// soaked (both ears cool from wet hair), he towels your hair, then dries it with a hair dryer — the hot air circles your head (you can
// aim it), he says something you can't hear over the dryer and repeats it at your left ear, finishes with cool air, takes off his glasses,
// and asks you to stay until the rain stops. DUAL thermal: his voice is always warm at the ear he speaks at; the dryer, the wet hair and
// the towel are the ambient layer. Stills first (video last, user 2026-11-08): each view is a still with a slow breathing drift.
(() => {
  const $ = (id) => document.getElementById(id);
  const QS = new URLSearchParams(location.search);
  const SND = window.SRAudio, LINES = window.SHION_LINES, W = 1920, H = 1080;
  const cv = $('scene'), ctx = cv.getContext('2d'), stage = $('stage');
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const sleep = (s) => new Promise((r) => setTimeout(r, s * 1000));

  // ---------------------------------------------------------------- art: one still per view ('dryerR' = the dryer still mirrored)
  const VIEWS = ['door', 'towel', 'dryer', 'glasses', 'whisper', 'window'];
  const IMG = {};
  const artReady = Promise.all(VIEWS.map((n) => new Promise((res) => { const im = new Image(); im.onload = () => { IMG[n] = im; res(); }; im.onerror = () => res(); im.src = `media/art/shion_${n}.jpg?v=1`; })));

  // ---------------------------------------------------------------- state
  const fresh = () => ({ started: false, t: 0, clock: 0, view: 'door', wet: 1, rub: 0, dryer: null, near: 0, ear: 0, fade: 0, lv: 0, pos: { az: 0, dist: .8 } });
  let S = fresh(), run = 0;
  const STEPS = [['rain', '雨の夜', 'A rainy night'], ['towel', 'タオル', 'The towel'], ['dryer', 'ドライヤー', 'The hair dryer'],
    ['ear', '耳元で', 'At your ear'], ['stay', '雨が止むまで', 'Until the rain stops']];
  function setStep(i) { $('steps').innerHTML = STEPS.map((s, k) => `<li class="${k < i ? 'done' : k === i ? 'now' : ''}">${s[1]} · <small>${s[2]}</small></li>`).join(''); }

  // ---------------------------------------------------------------- subtitles + voice
  const subJa = $('subJa'), subEn = $('subEn'), subs = $('subs');
  function sub(ja, en, muffled) { subJa.textContent = ja || ''; subEn.textContent = en || ''; subs.classList.toggle('show', !!ja); subs.classList.toggle('muffled', !!muffled); }
  let talking = 0;
  async function say(id, where = { az: 0, dist: .8 }, opt = {}) {
    const my = run; const [ja, en] = LINES[id]; S.pos = where;
    if (opt.muffled) sub('（ドライヤーの音で、よく聞こえない…）', '(You can\'t hear him over the dryer…)', true); else sub(ja, en);
    talking++;
    await SND.say(id, where, opt.gain ?? (where.dist < .2 ? 1.8 : 1.45));
    talking--; if (my !== run) throw new Error('stopped');
    await sleep(.35); sub('', '');
  }

  // ---------------------------------------------------------------- your turn: choices, actions, hold, aim the dryer
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
  function action(icon, ja, en, timeout = 25) {
    return new Promise((res) => {
      actEl.innerHTML = `<button class="act-btn"><i>${icon}</i><b>${ja}</b><span>${en}</span></button>`; actEl.classList.add('show');
      const done = () => { clearTimeout(tm); actEl.classList.remove('show'); actEl.innerHTML = ''; res(); };
      actEl.querySelector('button').addEventListener('click', done); const tm = setTimeout(done, timeout * 1000);
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
        if (down || n - t0 > 20000) k = Math.min(1, k + dt / sec); onTick?.(down, k); bar.style.width = `${k * 100}%`;
        if (k >= 1) { removeEventListener('keydown', kd); removeEventListener('keyup', ku); actEl.classList.remove('show'); actEl.innerHTML = ''; res(); return; }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }
  // aim the dryer: drag across the picture (or ← →) — the nozzle follows, left edge = your left ear, right edge = your right ear.
  // The meter fills while the air moves over still-wet hair; it fills by itself after 14 s.
  function aim(sec = 6) {
    return new Promise((res) => {
      actEl.innerHTML = `<div class="act-btn aim"><i>💨</i><b>ドラッグして温風を当てる</b><span>Drag across the picture to aim the warm air</span><em class="bar"><u></u></em></div>`; actEl.classList.add('show');
      const bar = actEl.querySelector('u'); let k = 0, last = performance.now(), prevAz = S.dryer.az; const t0 = last;
      const move = (e) => { if (e.buttons === 0 && e.pointerType === 'mouse') return; const r = stage.getBoundingClientRect(); S.dryer.target = clamp((e.clientX - r.left) / r.width, 0, 1) * 3 - 1.5; };
      const key = (e) => { if (e.code === 'ArrowLeft') S.dryer.target = Math.max(-1.5, S.dryer.target - .3); if (e.code === 'ArrowRight') S.dryer.target = Math.min(1.5, S.dryer.target + .3); };
      stage.addEventListener('pointermove', move); stage.addEventListener('pointerdown', move); addEventListener('keydown', key);
      stage.classList.add('aiming');
      const tick = () => {
        const n = performance.now(), dt = (n - last) / 1000; last = n;
        const moved = Math.abs(S.dryer.az - prevAz); prevAz = S.dryer.az;
        k = Math.min(1, k + moved / (sec * 1.5) + (n - t0 > 14000 ? dt / 3 : dt / (sec * 4))); bar.style.width = `${k * 100}%`;
        S.wet = Math.max(.15, S.wet - dt * .05);
        if (k >= 1) { stage.removeEventListener('pointermove', move); stage.removeEventListener('pointerdown', move); removeEventListener('keydown', key); stage.classList.remove('aiming'); actEl.classList.remove('show'); actEl.innerHTML = ''; res(); return; }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  // ---------------------------------------------------------------- the dryer
  function dryerOn(az, hot = true) {
    S.dryer = { az, target: az, hot, k: 0 };
    SND.fx.switchOn(az, .3); const L = SND.loop('dryer'); L?.at(az, .28); L?.set(.55, .08); L?.tone(hot ? 1400 : 1900);
  }
  function dryerOff() { if (!S.dryer) return; SND.fx.switchOn(S.dryer.az, .3); SND.loop('dryer')?.stop(); S.dryer = null; }
  async function circle(from, to, sec) {   // he sweeps the nozzle around the back of your head
    const my = run, t0 = performance.now();
    while (performance.now() - t0 < sec * 1000) { if (my !== run) throw new Error('stopped'); const u = (performance.now() - t0) / (sec * 1000); S.dryer.target = from + (to - from) * (.5 - .5 * Math.cos(Math.PI * u)); S.wet = Math.max(0, S.wet - .004); await sleep(.05); }
  }

  // ---------------------------------------------------------------- the story
  const FRONT = { az: 0, dist: .8 }, CLOSE = { az: 0, dist: .45 }, LEFT_EAR = { az: -1.35, dist: .12 }, BESIDE_L = { az: -.9, dist: .5 };
  async function story() {
    const my = ++run;
    try {
      setStep(0); S.view = 'door';
      const rain = SND.loop('rain'); rain?.at(Math.PI, 2.5); rain?.set(.55, .5);
      SND.fx.door(0); await sleep(1.4);
      await say('s01', FRONT);
      await action('🚪', '部屋に入る', 'Step inside');
      SND.fx.steps(0); SND.fx.door(Math.PI); rain?.set(.18, .4); rain?.tone(1300); rain?.at(1.0, 4); await sleep(1);
      // the towel
      setStep(1); S.near = .7; await go('t_door_towel', 'towel'); SND.fx.rustle(0, .2); await sleep(.4);
      SND.loop('rub')?.set(.5); S.rub = 1;
      await say('s02', CLOSE);
      SND.loop('rub')?.set(0); S.rub = 0; S.wet = .7;
      await say('s03', CLOSE);
      // the hair dryer: left side first, then you aim it
      setStep(2); S.near = .4; SND.fx.steps(.3); await go('t_towel_dryer', 'dryer'); await sleep(.3);
      await say('s04', { az: .3, dist: .5 });
      dryerOn(-1.3); await sleep(2);
      await aim(6);
      S.dryer.target = -.8; await sleep(.8);
      await say('s05', { az: .2, dist: .4 }, { muffled: true, gain: .55 });   // drowned by the dryer
      await sleep(.6); dryerOff(); await sleep(.7);
      await say('s06', CLOSE);
      await choice([['…なんて言ったの？', '…What did you say?'], ['もう一回、言って', 'Say it again']]);
      // he repeats it at your left ear
      setStep(3); S.near = .3; await go('t_dryer_whisper', 'whisper'); SND.fx.rustle(-1.2, .25); await sleep(.6);
      S.ear = 1; await say('s07', LEFT_EAR); S.ear = .3; await sleep(.8); S.ear = 0;
      // the other side: the warm air circles round the back of your head to your right ear, then cool air to finish
      await go('t_whisper_dryer_r', 'dryerR'); await say('s08', { az: -.3, dist: .5 });
      await action('↪', '右を向く', 'Turn your head');
      dryerOn(-1.3); await circle(-1.3, -Math.PI + .2, 2.4); S.dryer.az = Math.PI - .2; S.dryer.target = Math.PI - .2; await circle(Math.PI - .2, 1.3, 2.4);
      await sleep(2.5); S.wet = 0;
      S.dryer.hot = false; SND.fx.switchOn(1.3, .3); SND.loop('dryer')?.tone(1900); await sleep(1);
      await circle(1.3, -1.3, 4);
      S.dryer.target = .6; await say('s09', { az: .9, dist: .3 });   // close to your right ear, under the cool air
      dryerOff(); await sleep(.8);
      // the glasses
      setStep(4); await go('t_dryer_r_glasses', 'glasses'); S.near = 1;
      await say('s10', CLOSE);
      await hold('👀', '見つめ返す（長押し）', 'Look back at him (press and hold)', 2.5, (down, k) => { S.near = 1 + .4 * (down ? k : 0); });
      SND.fx.click(.2, .4); await sleep(.6);
      // beside you on the sofa, the rain on the window
      S.near = 0; rain?.set(.3, .8); await go('t_glasses_window', 'window'); await sleep(.4);
      await say('s11', BESIDE_L);
      const a = await choice([['…そろそろ帰らなきゃ', '…I should go home'], ['…もう少しだけ、いてもいい？', '…Can I stay a little longer?']]);
      await say(a ? 's12b' : 's12a', BESIDE_L);
      await sleep(.6); S.ear = 1; await say('s13', LEFT_EAR); S.ear = .3;
      await sleep(2.4); S.fade = 1; rain?.set(.5, 1.5); await sleep(3.4); finish(a);
    } catch (e) { if (e.message !== 'stopped') console.error(e); }
  }

  // ---------------------------------------------------------------- per-frame state + thermal
  function update(dt) {
    S.t += dt; if (!S.started) return;
    S.clock += dt; S.lv = SND.voiceLevel();
    if (S.dryer) { const d = S.dryer; d.az += (d.target - d.az) * (1 - Math.exp(-dt / .18)); d.k = Math.min(1, d.k + dt / .6); SND.loop('dryer')?.at(d.az, .28); if (d.hot) S.wet = Math.max(0, S.wet - dt * .035); }
  }
  // Thermal, two layers (firmware DUAL: cool and heat independent on each ear — CLAUDE.md, 2026-11-08).
  //  · VOICE: a voice is warm. His loudness (0.1 + 0.8 × level) warms the ear he speaks at — × 1 right at your ear, × 0.6 within
  //    50 cm, × 0.28 further; halved when he is straight in front. Muffled under the dryer it is still his voice (same rule).
  //  · AMBIENT: the rain-wet hair at your ears (cool on both, dries off with the towel and the dryer), the towel rubbing (mild friction
  //    warmth), the hair dryer (hot or cool air on the side the nozzle points at — it moves, you aim it, it circles behind your head),
  //    his breath at your left ear, his face a hand's width away when he takes off his glasses.
  function sources() {
    const out = [], add = (az, k, s, icon) => { if (s > .01) out.push({ az, k, s, icon }); };
    if (!S.started) return out;
    const P = S.pos;
    if (talking) add(P.az, 'h', (.1 + .8 * clamp(S.lv * 8)) * (P.dist < .15 ? 1 : P.dist <= .5 ? .6 : .28) * (Math.abs(P.az) < .5 ? .5 : 1), '💬');
    if (S.wet > .02) { add(-1.5, 'c', .35 * S.wet, '💧'); add(1.5, 'c', .35 * S.wet, '💧'); }
    if (S.rub) { add(-1.5, 'h', .15, '🧺'); add(1.5, 'h', .15, '🧺'); }
    if (S.dryer) add(S.dryer.az, S.dryer.hot ? 'h' : 'c', (S.dryer.hot ? .75 : .7) * S.dryer.k, S.dryer.hot ? '🔥' : '❄️');
    if (S.ear) add(-1.4, 'h', .3 * S.ear, '🌬');
    if (S.near > .9) add(0, 'h', .15 + .2 * (S.near - 1), '🤍');
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
  let viewA = 'door', viewB = 'door', mix = 1;
  // ---- animation (handoff §4b, as Demo20): Seedance 2.5 Lite 1080p clips whose first and last frames are EXACTLY the stills
  // (scripts/prepare_video.py), so clips are only switched at a clip's end — a hard cut between identical frames, no ghosting.
  // Loops: one per view (dryer / glasses / window also a quiet one while he is silent); the right-side dryer loops are the left
  // ones mirrored. Transitions: one per cut, asked for with go(); it starts when the current loop reaches its end. ?stills = no video.
  const CLIP_NAMES = ['v_door', 'v_towel', 'v_dryer', 'v_dryer_idle', 'v_whisper', 'v_glasses', 'v_glasses_idle', 'v_window', 'v_window_idle',
    't_door_towel', 't_towel_dryer', 't_dryer_whisper', 't_whisper_dryer_r', 't_dryer_r_glasses', 't_glasses_window'];
  const ONCE = new Set(CLIP_NAMES.filter((n) => n.startsWith('t_')));
  const CLIP = {};
  if (!QS.has('stills')) for (const n of CLIP_NAMES) {
    const v = document.createElement('video'); Object.assign(v, { muted: true, loop: false, playsInline: true, preload: 'auto', src: `media/video/${n}.mp4?v=1` });
    v.setAttribute('playsinline', ''); v.addEventListener('error', () => { delete CLIP[n]; }); CLIP[n] = v;
  }
  const clipOK = (n) => n && CLIP[n] && CLIP[n].readyState >= 2;
  let cur = null, curView = null, pending = null;
  function loopFor(view) {
    const quiet = !talking;
    if (view === 'dryer' || view === 'dryerR') return quiet ? 'v_dryer_idle' : 'v_dryer';
    if (view === 'glasses') return quiet ? 'v_glasses_idle' : 'v_glasses';
    if (view === 'window') return quiet ? 'v_window_idle' : 'v_window';
    return { door: 'v_door', towel: 'v_towel', whisper: 'v_whisper' }[view] || null;
  }
  function go(name, view) {   // a one-shot transition at the next clip end, then continue in `view`
    if (!clipOK(name) || !cur) { S.view = view; return Promise.resolve(); }
    const my = run;
    return new Promise((done, fail) => { pending = { name, view, done: () => (my === run ? done() : fail(new Error('stopped'))), started: false }; });
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
    if (pending && !pending.started) { pending.started = true; playClip(pending.name, pending.view); return; }
    startLoop();
  }
  function drawClip(view, alpha) {
    if (!(cur && clipOK(cur) && (view === curView || (view === S.view && ONCE.has(cur))))) return false;
    ctx.save(); if (curView === 'dryerR' && !ONCE.has(cur)) { ctx.translate(W, 0); ctx.scale(-1, 1); }
    ctx.globalAlpha = alpha; ctx.drawImage(CLIP[cur], 0, 0, W, H); ctx.restore(); ctx.globalAlpha = 1; return true;
  }
  function drawView(view, alpha, t) {
    if (drawClip(view, alpha)) return;
    const exact = !QS.has('stills') && Object.keys(CLIP).length > 0;   // with video the still must match the clips' frames exactly (no drift)
    const mirror = view === 'dryerR', im = IMG[mirror ? 'dryer' : view];
    ctx.globalAlpha = alpha;
    if (!im) { ctx.fillStyle = '#16121e'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; return; }
    const z = exact ? 1 : 1.02 + .008 * Math.sin(t * 1.1) + (view === 'glasses' ? .03 * clamp(S.near - 1, 0, .4) / .4 : 0), dh = W * im.height / im.width;
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(mirror ? -z : z, z); ctx.drawImage(im, -W / 2, -dh / 2 + (exact ? 0 : 4 * Math.sin(t * .9)), W, dh); ctx.restore();
    ctx.globalAlpha = 1;
  }
  const drops = Array.from({ length: 70 }, () => ({ x: Math.random() * W, y: Math.random() * H, v: 900 + Math.random() * 700, l: 20 + Math.random() * 30 }));
  function draw(t, dt) {
    if (S.view !== viewB) { viewA = viewB; viewB = S.view; mix = 0; }
    clips();
    mix = Math.min(1, mix + dt / .6);
    if (mix < 1) drawView(viewA, 1, t);
    drawView(viewB, mix < 1 ? mix : 1, t);
    if (S.view === 'door') {   // rain falling between you and the door
      ctx.strokeStyle = 'rgba(190,200,255,.28)'; ctx.lineWidth = 2; ctx.beginPath();
      for (const d of drops) { d.y += d.v * dt; d.x -= d.v * dt * .08; if (d.y > H) { d.y = -40; d.x = Math.random() * W * 1.1; } ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - d.l * .08, d.y + d.l); }
      ctx.stroke();
    }
    if (S.dryer) {   // a soft haze of air from the side the nozzle points at
      const x = W / 2 + Math.sin(S.dryer.az) * W * .5, g = ctx.createRadialGradient(x, H * .45, 40, x, H * .45, 700);
      const c = S.dryer.hot ? '255,170,110' : '150,210,255'; g.addColorStop(0, `rgba(${c},${.22 * S.dryer.k * Math.abs(Math.cos(S.dryer.az / 2) + .2)})`); g.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    if (S.fade) { S.fadeA = Math.min(1, (S.fadeA || 0) + dt / 3); ctx.fillStyle = `rgba(12,8,18,${S.fadeA})`; ctx.fillRect(0, 0, W, H); }
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
  let both = 0;
  function output(th, live) {
    const sc = Object.fromEntries(Object.entries(th).map(([k, v]) => [k, live && !tripped ? v * intensity : 0]));
    if ((sc.Lc > OFF && sc.Lh > OFF) || (sc.Rc > OFF && sc.Rh > OFF)) both++;
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
      if (S.started || S.fade) draw(S.t, dt); else drawCover();
      const { th, src } = thermal(dt); output(th, S.started); radar(S.started ? src : [], th);
      $('clock').textContent = fmt(S.clock);
      $('posInfo').textContent = S.started ? (S.view === 'door' ? 'his door · rain' : 'his flat · rainy night') : '';
    }
    requestAnimationFrame(loop);
  }
  document.addEventListener('visibilitychange', () => { hidden = document.hidden; if (hidden) { stopOutput(); SND.ctx()?.suspend(); } else { last = performance.now(); SND.ctx()?.resume(); } });
  document.addEventListener('keydown', (e) => { if (e.code === 'Escape') emergencyStop(); });
  function finish(stayed) {
    S.started = false; run++; stopOutput(); dryerOff();
    for (const k of ['rain', 'rub']) SND.loop(k)?.stop();
    sub('', '');
    const c = $('cleared'); c.hidden = false; c.textContent = stayed ? '☔ …雨が止むまで、ここにいればいい · Stay until the rain stops' : '☂ 傘は明日、返しにおいで · Bring the umbrella back tomorrow';
    $('startBtn').textContent = '↺ もう一度 · Play again'; $('intro').classList.remove('hidden');
  }
  function start() {
    SND.init(); SND.loadVoices(Object.keys(LINES));
    S = fresh(); S.started = true; viewA = viewB = 'door'; mix = 1; cur = null; pending = null; $('cleared').hidden = true;
    $('intro').classList.add('hidden');
    story();
  }
  $('startBtn').addEventListener('click', start);
  $('lrBtn').addEventListener('click', () => { SND.lrCheck(); const b = $('lrBtn'); b.textContent = '🎧 Left…'; setTimeout(() => { b.textContent = '🎧 …Right'; }, 900); setTimeout(() => { b.textContent = '🎧 Left / Right check'; }, 1900); });
  $('soundBtn').addEventListener('click', (e) => { SND.setMuted(!SND.isMuted()); e.target.textContent = SND.isMuted() ? '🔇' : '🔊'; });
  function drawCover() {   // the door still pushed to the right third, so the title sits on the dark rain on the left
    ctx.fillStyle = '#100c18'; ctx.fillRect(0, 0, W, H);
    const im = IMG.door || IMG.window; if (!im) return;
    ctx.drawImage(im, 460, 0, W, H);
    const g = ctx.createLinearGradient(380, 0, 1000, 0); g.addColorStop(0, 'rgba(16,12,24,1)'); g.addColorStop(1, 'rgba(16,12,24,0)'); ctx.fillStyle = g; ctx.fillRect(380, 0, 620, H);
  }
  window.SHION = { get S() { return S; }, thermal: () => thermal(.05), both: () => both };
  setStep(0);
  if (QS.has('cover')) { document.body.classList.add('cover-only'); artReady.then(drawCover); return; }
  if (QS.has('autoplay')) { const ac = SND.init(); if (ac.state === 'running') start(); else ac.resume().then(() => { if (ac.state === 'running' && !S.started) start(); }).catch(() => {}); }
  requestAnimationFrame(loop);
})();
