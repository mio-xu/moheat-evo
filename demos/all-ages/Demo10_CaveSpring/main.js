// Demo 10 《火をともして、ひみつの泉へ》 — an interactive puzzle with Kohaku the guide fox.
// hut: find straw + flint → strike at the hearth → blow the ember into a fire → light the hand candle → out the door
// gate: four candles, one true flame (warm) and three foxfires (cold) — feel which is which, blow out the foxfires
// tunnel: two forks — follow the water sound / cool air; spring: blow out your candle and the water lights up.
// Every fire, draught and water sound is a heat / cool source at its own direction (the same direction as its HRTF sound);
// your breath cools both ears. Per ear only the stronger mode is sent (firmware: one mode per ear).
(() => {
  const $ = (id) => document.getElementById(id);
  const QS = new URLSearchParams(location.search);
  const ART = window.CaveArt, SND = window.CaveAudio, { W, H, GEO } = ART;
  const cv = $('scene'), ctx = cv.getContext('2d'), stage = $('stage');
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k;
  const AZ = (x, k = 1) => clamp((x - W / 2) / (W / 2), -1, 1) * 1.15 * k;      // screen x → azimuth (rad, + = right)
  const rnd = (a, b) => a + Math.random() * (b - a);

  // ---------------------------------------------------------------- text
  const STEPS = [
    ['find', '火をおこす道具をさがそう', 'Find what you need to make a fire'],
    ['strike', 'いろりで火打ち石を打とう', 'Strike the flint at the hearth'],
    ['ember', '火種に、そっと息を', 'Blow gently on the ember'],
    ['candle', 'ろうそくに火をうつして、外へ', 'Light the candle and head outside'],
    ['gate', 'きつね火を、ぜんぶ吹き消そう', 'Blow out every foxfire'],
    ['enter', '石の扉の中へ', 'Go through the stone door'],
    ['fork', '水の音がするほうへ', 'Follow the sound of water'],
    ['spring', '灯りを吹き消してみて', 'Blow out your light'],
    ['end', 'ひみつの泉', 'The hidden spring'],
  ];
  const HINTS = {
    find: ['h_find1', 'h_find2'], strike: ['h_strike'], ember: ['h_ember'], candle: ['h_candle1', 'h_candle2'], gate: ['h_gate1', 'h_gate2'],
    enter: ['h_enter'], fork: ['h_fork1', 'h_fork2'], spring: ['h_spring'], end: ['touchWater'],
  };

  // ---------------------------------------------------------------- state
  const fresh = () => ({
    scene: 'hut', step: 'find', started: false, t: 0, clock: 0, done: false,
    hut: { tinder: false, flint: false, candle: false, lit: false, drawers: [0, 0, 0], open: [false, false, false], flintIn: 1 + (Math.random() < .5 ? 1 : 0) * 1, strikes: 0, need: 3, ember: 0, fire: 0, blow: 0 },
    gate: { cands: [], focus: -1, open: 0, opening: false, wrong: 0, blow: 0 },
    tunnel: { fork: 0, water: [Math.random() < .5 ? -1 : 1, Math.random() < .5 ? -1 : 1], dead: 0, deadSide: 0 },
    spring: { out: false, outT: 0, glow: 0, blow: 0, touches: 0, endAt: 0 },
    hint: {},
  });
  let S = fresh();
  function initGate() {
    const t = Math.floor(Math.random() * 4);
    S.gate.cands = GEO.gate.candles.map((x, i) => ({ x, fox: i !== t, lit: 1, out: 0, smoke: 0 }));
  }
  initGate();

  // ---------------------------------------------------------------- HUD
  const toastEl = $('toast'), goalEl = $('goal'), invEl = $('inv'), blowEl = $('blow'), bubble = $('bubble'), fadeEl = $('fade');
  let toastTimer = 0;
  function toast(ja, en, ms = 2600) { toastEl.querySelector('b').textContent = ja; toastEl.querySelector('span').textContent = en; toastEl.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('show'), ms); }
  function setStep(id) { S.step = id; renderGoal(); renderSteps(); }
  function renderGoal() {
    const s = STEPS.find((x) => x[0] === S.step);
    let sub = s[2];
    if (S.step === 'find') sub += ` · ${S.hut.tinder ? '✓' : '○'} 🌾 ${S.hut.flint ? '✓' : '○'} 🪨`;
    if (S.step === 'gate') { const left = S.gate.cands.filter((c) => c.fox && c.lit > .5).length; sub += ` · 🦊🔥 × ${left}`; }
    if (S.step === 'fork') sub += ` · ${S.tunnel.fork + 1} / 2`;
    goalEl.innerHTML = `<small>${S.step === 'end' ? 'Clear' : 'Goal'}</small><b>${s[1]}</b><span>${sub}</span>`;
  }
  function renderSteps() { const i = STEPS.findIndex((x) => x[0] === S.step); $('steps').innerHTML = STEPS.map((s, k) => `<li class="${k < i ? 'done' : k === i ? 'now' : ''}">${s[1]} · <small>${s[2]}</small></li>`).join(''); }
  function renderInv() {
    const h = S.hut, slot = (has, used, icon, ja, en) => `<div class="slot${has ? ' has' : ''}${used ? ' used' : ''}" title="${ja} · ${en}">${has ? icon : ''}<em>${has ? ja : ''}</em></div>`;
    invEl.innerHTML = slot(h.tinder, h.ember > 0 || h.fire > 0, '🌾', 'かれ草', 'Straw') + slot(h.flint, h.fire > 0, '🪨', '火打ち石', 'Flint')
      + slot(h.candle, false, h.lit && !S.spring.out ? '🕯️' : '🕯', h.lit && !S.spring.out ? '手燭 🔥' : '手燭', 'Candle');
  }
  // blow control: visible when blowing does something
  const blowWanted = () => S.started && !S.done && ((S.step === 'ember') || (S.scene === 'gate' && !S.gate.opening) || (S.step === 'spring' && !S.spring.out));
  let holding = false, keyHold = false;
  const bb = $('blowBtn');
  const hold = (v) => (e) => { e.preventDefault(); holding = v; bb.classList.toggle('holding', v); };
  bb.addEventListener('pointerdown', hold(true)); for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) bb.addEventListener(ev, hold(false));
  $('micBars').innerHTML = '<i></i>'.repeat(6);

  // ---------------------------------------------------------------- Kohaku: speech queue
  let say = [], sayUntil = 0, talking = 0, waitV = 0;
  function fox(lines, interrupt = false) {
    if (interrupt) { say = []; sayUntil = 0; }
    say.push(...lines);
  }
  function foxPos() {
    const p = { hut: [500, 1040, .92], gate: [235, 1040, .95], tunnel: [960, 1012, .95], spring: ART.hasArt('spring') ? [330, 1015, 1] : [560, 1000, 1] }[S.scene];
    if (stage.clientWidth < 700) { const sr = stage.getBoundingClientRect(), ir = invEl.getBoundingClientRect(); if (ir.width) p[0] = Math.max(p[0], (ir.right - sr.left) / sr.width * W + 165 * p[2]); }   // phones: the inventory takes the bottom-left, she sits clear of it
    return p;
  }
  function tickBubble(now) {
    if (now < sayUntil) return;
    if (typeof say[0] === 'string' && SND.voicePending(say[0])) { waitV = waitV || now; if (now - waitV < 2500) return; }   // voice still decoding: wait a moment
    waitV = 0;
    const next = say.shift();
    if (!next) { bubble.classList.remove('show'); talking = 0; return; }
    const id = typeof next === 'string' ? next : null, [ja, en] = id ? window.KOHAKU_LINES[id] : next;
    bubble.querySelector('b').textContent = ja; bubble.querySelector('span').textContent = en;
    const [x, y, s] = foxPos();
    bubble.style.left = `${clamp(x / W, .17, .83) * 100}%`; bubble.style.top = `${(y - 290 * s) / H * 100}%`;
    bubble.classList.add('show');
    const vd = id && SND.voice(id, AZ(x) * .8), dur = vd ? vd + .45 : clamp(1.6 + ja.length * .1, 2.2, 5.2);   // Kohaku's voice from where he sits
    sayUntil = now + dur * 1000; talking = vd || dur; if (!vd) SND.fx.yip(AZ(x));
  }
  function hint() {
    const list = HINTS[S.step] || [];
    const n = S.hint[S.step] = (S.hint[S.step] || 0) + 1;
    const h = list[Math.min(n, list.length) - 1]; if (h) fox([h], true);
  }
  $('hintBtn').addEventListener('click', hint);
  const sbtn = $('soundBtn');
  sbtn.addEventListener('click', () => { SND.setMuted(!SND.isMuted()); sbtn.textContent = SND.isMuted() ? '🔇' : '🔊'; sbtn.classList.toggle('off', SND.isMuted()); });

  // ---------------------------------------------------------------- microphone (level only)
  let mic = null, micState = 'none', floor = .01;
  const buf = new Float32Array(1024);
  function ensureMic() {
    if (micState !== 'none' || !$('micOn').checked) return;
    if (!navigator.mediaDevices?.getUserMedia) { micState = 'denied'; return; }
    micState = 'asking';
    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false } })
      .then((st) => { const ac = SND.ctx() || SND.init(); const an = ac.createAnalyser(); an.fftSize = 1024; ac.createMediaStreamSource(st).connect(an); mic = { an, st }; micState = 'on'; })
      .catch(() => { micState = 'denied'; });
  }
  $('micOn').addEventListener('change', (e) => { if (e.target.checked) ensureMic(); else { mic?.st.getTracks().forEach((t) => t.stop()); mic = null; micState = 'none'; } });
  function micLevel() {
    if (!mic) return 0;
    mic.an.getFloatTimeDomainData(buf); let s = 0; for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
    return Math.sqrt(s / buf.length);
  }

  // ---------------------------------------------------------------- particles + thermal pulses
  let parts = [], pulses = [];
  const pulse = (az, k, s, dur = .8) => pulses.push({ az, k, s, age: 0, dur });
  function sparks(x, y, n = 14) { for (let i = 0; i < n; i++) parts.push({ k: 'spark', x, y, vx: rnd(-260, 260), vy: rnd(-420, -80), life: 0, max: rnd(.3, .7) }); }
  function smoke(x, y, n = 10, col = '220,220,235') { for (let i = 0; i < n; i++) parts.push({ k: 'smoke', x: x + rnd(-6, 6), y, vx: rnd(-14, 14), vy: rnd(-70, -40), life: 0, max: rnd(1.4, 2.4), col }); }
  function ripple(x, y) { parts.push({ k: 'ripple', x, y, life: 0, max: 1.8 }); }

  // ---------------------------------------------------------------- scenes: audio loops
  let loops = {};
  function setLoops(scene) {
    for (const L of Object.values(loops)) L.stop(); loops = {};
    if (!SND.ctx()) return;
    SND.setRoom({ hut: 'hut', gate: 'out', tunnel: 'cave', spring: 'cave' }[scene]);
    const mk = (k, kind) => (loops[k] = SND.loop(kind));
    if (scene === 'hut') { mk('wind', 'wind'); mk('fire', 'fire'); mk('hand', 'candle'); }
    if (scene === 'gate') { mk('wind', 'wind'); S.gate.cands.forEach((c, i) => mk(`c${i}`, c.fox ? 'fox' : 'candle')); mk('gust', 'wind'); }
    if (scene === 'tunnel') { mk('stream', 'stream'); mk('drone', 'drone'); mk('hand', 'candle'); }
    if (scene === 'spring') { mk('fall', 'waterfall'); mk('lake', 'stream'); mk('drone', 'drone'); mk('hand', 'candle'); }
  }
  let busy = false;
  function go(scene, after) {
    if (busy) return; busy = true;
    fadeEl.classList.add('on'); SND.fx.step(-.2); setTimeout(() => SND.fx.step(.2), 260);
    setTimeout(() => {
      S.scene = scene; parts = []; pulses = []; setLoops(scene); after?.();
      setTimeout(() => { fadeEl.classList.remove('on'); busy = false; }, 150);
    }, 750);
  }

  // ---------------------------------------------------------------- hit areas
  const inRect = (x, y, [x0, y0, x1, y1]) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
  const inEll = (x, y, cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
  const drawerRect = (k) => { if (GEO.hut.drawers) return GEO.hut.drawers[k]; const [x0, y0, x1] = GEO.hut.chest; return [x0 + 18, y0 + 26 + k * 116, x1 - 18, y0 + 126 + k * 116]; };
  function foxHit(x, y) { const [fx, fy, s] = foxPos(); return inEll(x, y, fx + 30 * s, fy - 130 * s, 120 * s, 150 * s); }
  function hitHut(x, y, act) {
    const h = S.hut, G = GEO.hut;
    if (foxHit(x, y)) return act ? hint() : true;
    if (inRect(x, y, G.window)) { if (act) { fox(['window'], true); pulse(AZ(310), 'c', .7, 1.2); } return true; }
    const [bx, by] = G.basket;
    if (!h.tinder && inRect(x, y, [bx - 150, by - 110, bx + 150, by + 80])) { if (act) { h.tinder = true; SND.fx.pick(AZ(bx)); toast('かれ草を手に入れた', 'Got some dry straw'); fox(['straw'], true); checkFound(); } return true; }
    for (let k = 0; k < 3; k++) if (inRect(x, y, drawerRect(k))) {
      if (act) {
        if (h.open[k] && k === h.flintIn && !h.flint) { h.flint = true; SND.fx.pick(AZ(1300)); toast('火打ち石を手に入れた', 'Got a flint'); fox(['flint'], true); checkFound(); }
        else { h.open[k] = !h.open[k]; SND.fx.drawer(AZ(1300)); if (h.open[k] && (k !== h.flintIn || h.flint)) fox(['empty'], true); else if (h.open[k]) fox(['glint'], true); }
      }
      return true;
    }
    const [cx, cy] = G.candle;
    if (!h.candle && inRect(x, y, [cx - 70, cy - 170, cx + 70, cy + 20])) { if (act) { h.candle = true; SND.fx.pick(AZ(cx)); toast('手燭を手に入れた', 'Got a hand candle'); if (h.fire > .5) fox(['candleFromFire'], true); renderInv(); } return true; }
    const [hx, hy] = G.hearth;
    if (inEll(x, y, hx, hy, 330, 120)) { if (act) hearth(); return true; }
    if (inRect(x, y, G.door)) {
      if (act) {
        if (h.lit) go('gate', () => { setStep('gate'); fox(['gateA', 'gateB', 'gateC', 'gateD'], true); });
        else { SND.fx.drawer(AZ(1700)); fox(['dark'], true); }
      }
      return true;
    }
    return false;
  }
  function checkFound() { renderInv(); renderGoal(); if (S.hut.tinder && S.hut.flint && S.step === 'find') { setStep('strike'); fox(['allset']); } }
  function hearth() {
    const h = S.hut, [hx, hy] = GEO.hut.hearth;
    if (S.step === 'find') { fox([!h.tinder && !h.flint ? 'needBoth' : !h.tinder ? 'needStraw' : 'needFlint'], true); return; }
    if (S.step === 'strike') {
      h.strikes++; sparks(hx, hy - 10, 16); SND.fx.spark(AZ(hx)); pulse(0, 'h', .35, .35);
      if (h.strikes >= h.need) { h.ember = 1; setStep('ember'); SND.fx.ignite(0); renderInv(); fox(['ember1', 'ember2'], true); }
      else toast(h.strikes === 1 ? 'カチッ！' : 'カチッ… もう一回！', h.strikes === 1 ? 'Clack!' : 'Clack… once more!', 1200);
      return;
    }
    if (S.step === 'ember') { fox(['blowIt'], true); return; }
    if (h.candle && !h.lit) { h.lit = true; SND.fx.ignite(.4); toast('手燭に火がついた', 'The candle is lit'); renderInv(); fox(['letsgo', 'springDeep', 'doorRight'], true); return; }
    if (!h.candle) { fox(['warmCandle'], true); return; }
    fox(['warm'], true);
  }
  function candleAt(x, y) { return S.gate.cands.findIndex((c) => Math.abs(x - c.x) < 90 && y > GEO.gate.ledgeY - 260 && y < GEO.gate.ledgeY + 60); }
  function hitGate(x, y, act) {
    const g = S.gate;
    if (foxHit(x, y)) return act ? hint() : true;
    if (!g.opening) { const i = candleAt(x, y); if (i >= 0 && g.cands[i].lit > .5) { if (act) { g.focus = i; g.focusT = 0; } return true; } return false; }
    const [x0, y0, x1, y1] = GEO.gate.door;
    if (g.open > .9 && inRect(x, y, [x0, y0, x1, y1])) { if (act) go('tunnel', () => { setStep('fork'); fox(['tunnel1', 'tunnel2'], true); }); return true; }
    return false;
  }
  function hitTunnel(x, y, act) {
    const t = S.tunnel;
    if (foxHit(x, y)) return act ? hint() : true;
    if (t.dead > 0) return false;
    for (const [k, side] of [['left', -1], ['right', 1]]) {
      const [ox, oy, rx, ry] = GEO.tunnel[k];
      if (!inEll(x, y, ox, oy, rx, ry)) continue;
      if (!act) return true;
      if (side === t.water[t.fork]) {
        if (t.fork === 0) go('tunnel', () => { t.fork = 1; renderGoal(); fox(['closer', 'fork2'], true); });
        else go('spring', () => { setStep('spring'); fox(['here', 'blowLight'], true); });
      } else { t.dead = 2.2; t.deadSide = side; SND.fx.bats(side * 1.1); pulse(side * 1.1, 'h', .55, 1.6); fox(['dead1', 'dead2'], true); }
      return true;
    }
    return false;
  }
  function hitSpring(x, y, act) {
    const s = S.spring;
    if (foxHit(x, y)) return act ? hint() : true;
    if (s.glow > .6 && y > GEO.spring.lakeY + 40) {
      if (act) { ripple(x, y); SND.fx.splash(AZ(x)); pulse(AZ(x), 'c', .85, 1.3); s.touches++;
        if (s.touches === 1) fox(['touch1'], true);
        if (s.touches >= 3) s.endAt = Math.min(s.endAt || 1e9, S.t + 3); }
      return true;
    }
    return false;
  }
  function hit(x, y, act) {
    if (!S.started || busy || S.done && S.scene !== 'spring') return false;
    return ({ hut: hitHut, gate: hitGate, tunnel: hitTunnel, spring: hitSpring }[S.scene])(x, y, act);
  }
  const toCanvas = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; };
  cv.addEventListener('click', (e) => { const [x, y] = toCanvas(e); hit(x, y, true); });
  cv.addEventListener('pointermove', (e) => {
    const [x, y] = toCanvas(e); stage.classList.toggle('pointer', !!hit(x, y, false));
    if (S.scene === 'gate' && e.pointerType === 'mouse' && !S.gate.opening) { const i = candleAt(x, y); if (i >= 0 && S.gate.cands[i].lit > .5 && i !== S.gate.focus) { S.gate.focus = i; S.gate.focusT = 0; } }
  });

  // ---------------------------------------------------------------- update (per frame)
  let blowing = false, breath = 0;
  function update(dt) {
    S.t += dt; if (S.started && !S.done) S.clock += dt;
    const lv = micState === 'on' ? micLevel() : 0, loudMic = lv > Math.max(.035, floor * 5);
    if (!loudMic) floor = floor * .97 + lv * .03;
    blowing = blowWanted() && (holding || keyHold || loudMic);
    breath += ((blowing ? 1 : 0) - breath) * Math.min(1, dt * 6);
    const h = S.hut, g = S.gate, sp = S.spring, tu = S.tunnel;
    // hut
    for (let k = 0; k < 3; k++) h.drawers[k] += ((h.open[k] ? 1 : 0) - h.drawers[k]) * Math.min(1, dt * 8);
    if (S.step === 'ember' && blowing) {
      h.blow += dt; h.fire = clamp(h.blow / 2.4);
      if (Math.random() < dt * 12) sparks(GEO.hut.hearth[0] + rnd(-40, 40), GEO.hut.hearth[1] - 20, 2);
      if (h.fire >= 1) { setStep('candle'); SND.fx.ignite(0); SND.fx.chime(); renderInv(); fox(['burning', h.candle ? 'lightYours' : 'lightChest'], true); }
    }
    // gate: blow out the focused candle
    if (S.scene === 'gate') {
      g.focusT = (g.focusT || 0) + dt;
      const c = g.cands[g.focus];
      if (c && c.lit > .5 && blowing && !g.opening && g.wrong <= 0) {
        c.out += dt;
        if (c.out > .9) {
          c.lit = 0; c.out = 0; smoke(c.x, GEO.gate.ledgeY - 130, 14, c.fox ? '170,220,255' : '220,220,235'); SND.fx.snuff(AZ(c.x, 1.6)); g.focus = -1;
          if (c.fox) {
            const left = g.cands.filter((x) => x.fox && x.lit > .5).length; renderGoal();
            if (!left) { g.opening = true; g.openAt = S.t; SND.fx.rumble(); setTimeout(() => SND.fx.chime(), 1500); fox(['opened', 'coolBreeze', 'inside'], true); setStep('enter'); }
            else fox([left > 1 ? 'out1' : 'out2'], true);
          } else { g.wrong = 2.6; SND.fx.wrong(AZ(c.x)); fox(['wrong1', 'wrong2'], true); }
        }
      } else if (c) c.out = Math.max(0, c.out - dt * .8);
      if (g.wrong > 0) { g.wrong -= dt; if (g.wrong <= 0) { for (const x of g.cands) { x.lit = 1; x.out = 0; } SND.fx.ignite(0); renderGoal(); } }
      if (g.opening) g.open = clamp((S.t - g.openAt) / 3);
    }
    if (S.scene === 'tunnel') {
      if (tu.dead > 0) tu.dead -= dt;
      if (Math.random() < dt * .55) { const x = rnd(200, 1720), az = AZ(x); parts.push({ k: 'drip', x, y: rnd(80, 200), vy: 0, life: 0, max: 3, az }); }
    }
    if (S.scene === 'spring') {
      if (!sp.out && blowing) { sp.blow += dt; if (sp.blow > 1.1) { sp.out = true; sp.outT = S.t; const [hx, hy] = GEO.hand; smoke(hx, hy - 20, 16); SND.fx.snuff(.6); renderInv(); setTimeout(() => SND.fx.bloom(), 1600); } }
      if (sp.out) sp.glow = clamp((S.t - sp.outT - 1.4) / 4);
      if (sp.out && sp.glow >= 1 && S.step === 'spring') { setStep('end'); fox(['see', 'touchWater'], true); sp.endAt = S.t + 16; }
      if (sp.endAt && S.t > sp.endAt && !S.done) finish();
      if (sp.glow > .2 && Math.random() < dt * 3) parts.push({ k: 'mote', x: rnd(0, W), y: rnd(620, 1060), vy: rnd(-30, -10), life: 0, max: rnd(2, 4) });
    }
    if (S.scene === 'gate' && Math.random() < dt * 30) parts.push({ k: 'snow', x: rnd(-50, W), y: -10, vx: rnd(10, 40), vy: rnd(60, 130), life: 0, max: 12, r: rnd(2, 5) });
    // particles
    for (const p of parts) {
      p.life += dt;
      if (p.k === 'spark') { p.vy += 900 * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
      else if (p.k === 'smoke' || p.k === 'mote') { p.x += (p.vx || Math.sin(p.life * 2) * 8) * dt; p.y += p.vy * dt; }
      else if (p.k === 'snow') { p.x += p.vx * dt + Math.sin(p.life * 2 + p.r) * .6; p.y += p.vy * dt; if (p.y > H) p.life = p.max; }
      else if (p.k === 'drip') { p.vy += 1600 * dt; p.y += p.vy * dt; if (p.y > 960 && !p.hit) { p.hit = true; p.life = p.max; SND.fx.drip(p.az, 2); pulse(p.az, 'c', .45, .6); ripple(p.x, 970); } }
    }
    parts = parts.filter((p) => p.life < p.max);
    for (const q of pulses) q.age += dt; pulses = pulses.filter((q) => q.age < q.dur);
    // sounds: levels and directions
    const gust = .65 + .35 * Math.sin(S.t * .9) * Math.sin(S.t * .37);
    const L = loops;
    if (S.scene === 'hut') {
      L.wind?.set(.32 * gust, AZ(310), 1.6);
      L.fire?.set(.15 * h.ember * (h.fire < .05 ? 1 : 0) + .8 * h.fire, 0, 1.4);
      L.hand?.set(h.lit ? .5 : 0, .55, .55);
    }
    if (S.scene === 'gate') {
      L.wind?.set(.22 * gust, -1, 3);
      g.cands.forEach((c, i) => L[`c${i}`]?.set(c.lit * (i === g.focus ? (c.fox ? .7 : 1) : (c.fox ? .1 : .14)), AZ(c.x, 1.6), i === g.focus ? .8 : 1.6));
      L.gust?.set(g.opening ? .55 * Math.max(.4, 1 - (S.t - g.openAt) / 8) : 0, 0, 2);
    }
    if (S.scene === 'tunnel') {
      const ws = tu.water[tu.fork];
      L.stream?.set(.75, ws * 1.15, 3); L.drone?.set(.28, 0, 4); L.hand?.set(.45, .55, .55);
    }
    if (S.scene === 'spring') {
      L.fall?.set(.35 + .35 * sp.glow, AZ(1505), 3.2); L.lake?.set(.25 + .2 * sp.glow, -.3, 2.5); L.drone?.set(.25 * (1 - sp.glow * .5), 0, 4); L.hand?.set(sp.out ? 0 : .45, .55, .55);
    }
    SND.tick(dt);
  }

  // ---------------------------------------------------------------- thermal sources (direction + heat/cool + strength)
  function sources() {
    const out = [], h = S.hut, g = S.gate, tu = S.tunnel, sp = S.spring;
    const add = (az, k, s, icon) => { if (s > .01) out.push({ az, k, s, icon }); };
    if (!S.started) return out;
    const gust = .65 + .35 * Math.sin(S.t * .9) * Math.sin(S.t * .37);
    if (S.scene === 'hut') {
      add(AZ(310), 'c', .38 * gust * (1 - .5 * h.fire), '🌬');
      add(0, 'h', .25 * h.ember * (1 - h.fire) + .78 * h.fire, '🔥');
      if (h.lit) add(.55, 'h', .15, '🕯');
    }
    if (S.scene === 'gate') {
      const c = g.cands[g.focus];
      if (c && c.lit > .5 && g.wrong <= 0) add(AZ(c.x, 1.6), c.fox ? 'c' : 'h', .82 * clamp((g.focusT || 0) / .35) * (1 - c.out * .6), c.fox ? '🦊' : '🔥');
      if (g.opening) add(0, 'c', .8 * Math.max(.35, 1 - (S.t - g.openAt) / 6), '🌬');
    }
    if (S.scene === 'tunnel') {
      const ws = tu.water[tu.fork];
      add(ws * 1.15, 'c', .48 + .1 * Math.sin(S.t * 1.7), '💧');
      add(-ws * 1.15, 'h', .3, '♨');
      add(.55, 'h', .15, '🕯');
    }
    if (S.scene === 'spring') {
      add(AZ(1505), 'c', .3 + .3 * sp.glow, '💧');
      add(0, 'c', .32 * sp.glow, '🌊');
      if (!sp.out) add(.55, 'h', .16, '🕯');
    }
    for (const q of pulses) add(q.az, q.k, q.s * Math.min(1, q.age / .08) * (1 - q.age / q.dur), q.k === 'c' ? '💧' : '✨');
    if (breath > .03) add(0, 'c', .6 * breath, '🌬');
    return out;
  }
  // per ear: sum heat and cool separately, keep the stronger one (with a little hysteresis), smooth
  const ear = { L: { mode: '', v: 0 }, R: { mode: '', v: 0 } };
  function thermal(dt) {
    const sum = { L: { h: 0, c: 0 }, R: { h: 0, c: 0 } }, src = sources();
    for (const s of src) {
      const sn = Math.sin(s.az), wL = clamp(1 - 1.2 * Math.max(0, sn)), wR = clamp(1 - 1.2 * Math.max(0, -sn));
      sum.L[s.k] += s.s * wL; sum.R[s.k] += s.s * wR;
    }
    const th = { Lc: 0, Lh: 0, Rc: 0, Rh: 0 };
    for (const e of ['L', 'R']) {
      const E = ear[e], hh = Math.min(1, sum[e].h), cc = Math.min(1, sum[e].c);
      let mode = E.mode;
      if (!mode) mode = hh > cc ? 'h' : 'c';
      else if (mode === 'h' && cc > hh + .06) mode = 'c'; else if (mode === 'c' && hh > cc + .06) mode = 'h';
      if (mode !== E.mode) { E.v = 0; E.mode = mode; }                     // switching mode: the other channel goes to 0 first
      const target = mode === 'h' ? Math.min(.9, hh) : cc;
      const tau = target > E.v ? (mode === 'h' ? .35 : .18) : .3;
      E.v += (target - E.v) * (1 - Math.exp(-dt / tau));
      th[e + mode] = E.v;
    }
    return { th, src };
  }

  // ---------------------------------------------------------------- drawing
  function drawFox(c, x, y, s, t, speaking) {
    if (ART.pic('kohaku_base')) {   // painted Kohaku: talk / blink / happy frames on the same pose, gentle bob and a soft warm glow
      const bob = Math.sin(t * 2.2) * 3, blink = (t % 3.7) < .14, happy = S.scene === 'spring' && S.spring.glow > .6 && !speaking;
      const n = speaking && Math.sin(t * 22) > -.2 ? 'kohaku_talk' : blink && ART.pic('kohaku_blink') ? 'kohaku_blink' : happy && ART.pic('kohaku_happy') ? 'kohaku_happy' : 'kohaku_base';
      c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = ART.rad(c, x, y - 130 * s, 10, 240 * s, [[0, 'rgba(255,214,140,.18)'], [1, 'rgba(255,214,140,0)']]); c.fillRect(x - 260 * s, y - 380 * s, 520 * s, 420 * s); c.restore();
      c.save(); c.fillStyle = 'rgba(20,10,20,.28)'; c.beginPath(); c.ellipse(x, y - 4, 110 * s, 16 * s, 0, 0, 7); c.fill(); c.restore();
      ART.sprite(c, ART.pic(n) ? n : 'kohaku_base', x + 20 * s, y + bob * .3, 300 * s + bob);
      return;
    }
    const bob = Math.sin(t * 2.2) * 3, blink = (t % 3.7) < .12, ink = ART.INK, sh = ART.shape;
    c.save(); c.translate(x, y + bob); c.scale(s, s);
    c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = ART.rad(c, 0, -120, 10, 230, [[0, 'rgba(255,214,140,.22)'], [1, 'rgba(255,214,140,0)']]); c.fillRect(-240, -360, 480, 480); c.restore();
    c.save(); c.translate(30, -30); c.rotate(Math.sin(t * 2) * .12);            // tail
    sh(c, '#f59a4a', (p) => { p.moveTo(0, 10); p.bezierCurveTo(150, -10, 170, -190, 90, -205); p.bezierCurveTo(110, -130, 70, -60, -10, -30); p.closePath(); }, 5);
    sh(c, '#fff4e2', (p) => { p.moveTo(90, -205); p.bezierCurveTo(150, -190, 150, -120, 128, -100); p.bezierCurveTo(118, -140, 100, -170, 76, -176); p.closePath(); }, 4);
    c.restore();
    sh(c, '#f59a4a', (p) => p.ellipse(0, -62, 62, 64, 0, 0, 7), 5);              // body
    sh(c, '#fff4e2', (p) => p.ellipse(-4, -50, 36, 44, 0, 0, 7), 0);
    for (const px of [-26, 20]) sh(c, '#fff4e2', (p) => p.ellipse(px, -6, 18, 12, 0, 0, 7), 4);
    sh(c, '#d9473f', (p) => { p.moveTo(-46, -112); p.quadraticCurveTo(0, -92, 46, -112); p.lineTo(44, -100); p.quadraticCurveTo(0, -80, -44, -100); p.closePath(); }, 3);   // red cord
    sh(c, '#ffd36a', (p) => p.arc(0, -86, 11, 0, 7), 3);                         // bell
    const tw = Math.sin(t * 5) > .96 ? .15 : 0;
    for (const d of [-1, 1]) { c.save(); c.translate(d * 40, -190); c.rotate(d * (.15 + (d > 0 ? tw : 0)));
      sh(c, '#f59a4a', (p) => { p.moveTo(-26, 10); p.lineTo(d * 4, -66); p.lineTo(26, 10); p.closePath(); }, 5);
      sh(c, '#ffc3c8', (p) => { p.moveTo(-13, 4); p.lineTo(d * 3, -42); p.lineTo(13, 4); p.closePath(); }, 0);
      sh(c, '#5a3a3a', (p) => { p.moveTo(d * 4 - 10, -44); p.lineTo(d * 4, -66); p.lineTo(d * 4 + 10, -44); p.closePath(); }, 0); c.restore(); }
    sh(c, '#f59a4a', (p) => p.ellipse(0, -152, 76, 62, 0, 0, 7), 5);             // head
    sh(c, '#fff4e2', (p) => { p.moveTo(-70, -140); p.quadraticCurveTo(-40, -96, 0, -96); p.quadraticCurveTo(40, -96, 70, -140); p.quadraticCurveTo(30, -118, 0, -126); p.quadraticCurveTo(-30, -118, -70, -140); }, 0);
    c.fillStyle = 'rgba(255,120,140,.45)'; for (const d of [-1, 1]) { c.beginPath(); c.ellipse(d * 46, -128, 13, 8, 0, 0, 7); c.fill(); }
    c.fillStyle = ink; c.strokeStyle = ink; c.lineWidth = 4; c.lineCap = 'round';
    for (const d of [-1, 1]) {
      if (blink) { c.beginPath(); c.arc(d * 26, -152, 9, .2, Math.PI - .2); c.stroke(); }
      else { c.beginPath(); c.ellipse(d * 26, -152, 8, 11, 0, 0, 7); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(d * 26 + 3, -156, 3.2, 0, 7); c.fill(); c.fillStyle = ink; }
    }
    c.beginPath(); c.ellipse(0, -134, 6, 4, 0, 0, 7); c.fill();
    if (speaking && Math.sin(t * 22) > -.2) { c.fillStyle = '#b8424a'; c.beginPath(); c.ellipse(0, -120, 7, 6, 0, 0, 7); c.fill(); c.stroke(); }
    else { c.lineWidth = 3; c.beginPath(); c.moveTo(-9, -124); c.quadraticCurveTo(-4, -118, 0, -124); c.quadraticCurveTo(4, -118, 9, -124); c.stroke(); }
    c.restore();
  }
  function ring(c, x, y, r) {   // hint highlight
    const k = (S.t * 1.2) % 1;
    c.save(); c.strokeStyle = `rgba(255,224,150,${.8 * (1 - k)})`; c.lineWidth = 6; c.beginPath(); c.arc(x, y, r * (.8 + .4 * k), 0, 7); c.stroke(); c.restore();
  }
  const filmDark = (k) => (ART.hasClip(k) ? .45 : ART.hasArt(k) ? .72 : 1);   // painted backgrounds are already moody: lighter darkness
  function drawHut(c, t) {
    const h = S.hut, G = GEO.hut, [hx, hy] = G.hearth;
    const fireArt = ART.hasClip('hutFire') || ART.hasArt('hutFire');
    ART.drawBg(c, 'hut'); if (fireArt) ART.drawBg(c, 'hutFire', clamp(h.fire * 1.2));
    if (!h.tinder && ART.pic('prop_straw')) { const [bx, by] = G.basket; ART.sprite(c, 'prop_straw', bx, by - 22, 150); }
    else if (!h.tinder) { const [bx, by] = G.basket; c.strokeStyle = '#e9cf7a'; c.lineWidth = 5; for (let i = 0; i < 26; i++) { const a = -2.4 + i * .07; c.beginPath(); c.moveTo(bx - 90 + i * 7, by - 40); c.lineTo(bx - 90 + i * 7 + Math.cos(a) * 60, by - 40 + Math.sin(a) * 60 - 20); c.stroke(); } }
    for (let k = 0; k < 3; k++) {            // drawers: slide toward you when open
      const [x0, y0, x1, y1] = drawerRect(k), o = h.drawers[k], dy = o * 46, gw = o * 14;
      if (ART.pic('prop_drawer') || (ART.hasArt('hut') && o <= .02)) {   // painted: closed drawers are in the background; an opening one slides toward you
        if (o <= .02) continue;
        ART.shape(c, '#1c100c', (p) => p.rect(x0 + 4, y0 + 4, x1 - x0 - 8, y1 - y0 - 8), 0);
        if (k === h.flintIn && !h.flint && o > .4) ART.sprite(c, 'prop_flint', (x0 + x1) / 2, y0 + 44 + dy * .5, 70);
        if (ART.pic('prop_drawer')) { c.save(); c.filter = 'brightness(0.72) saturate(0.85)'; c.drawImage(ART.pic('prop_drawer'), x0 - gw, y0 + dy, x1 - x0 + gw * 2, y1 - y0 + gw); c.restore(); }   // match the dim painted chest
        else ART.shape(c, ART.lin(c, 0, y0 + dy, 0, y1 + dy, [[0, '#7a4a32'], [1, '#5a3422']]), (p) => p.rect(x0 - gw, y0 + dy, x1 - x0 + gw * 2, y1 - y0 + gw), 3);
        continue;
      }
      if (o > .02) { ART.shape(c, '#2c1a14', (p) => p.rect(x0 + 6, y0 + 6, x1 - x0 - 12, 30 + dy), 3);
        if (k === h.flintIn && !h.flint && o > .4) { ART.shape(c, '#8e96a8', (p) => ART.blob(p, (x0 + x1) / 2, y0 + 26 + dy * .5, 34, 18, 7, .25), 4); c.fillStyle = 'rgba(255,255,255,.6)'; c.fillRect((x0 + x1) / 2 - 14, y0 + 16 + dy * .5, 12, 4); } }
      ART.shape(c, ART.lin(c, 0, y0 + dy, 0, y1 + dy, [[0, '#9a6240'], [1, '#7a4a2e']]), (p) => p.rect(x0 - gw, y0 + dy, x1 - x0 + gw * 2, y1 - y0 + gw), 4);
      ART.shape(c, '#d8b56a', (p) => p.ellipse((x0 + x1) / 2, (y0 + y1) / 2 + dy, 30, 12, 0, 0, 7), 3);
    }
    if (!h.candle) ART.candle(c, G.candle[0], G.candle[1], 96, 28);
    if (h.ember > 0 && h.fire < 1) { const p = .7 + .3 * Math.sin(t * 6); c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = ART.rad(c, hx, hy, 4, 60, [[0, `rgba(255,170,60,${p})`], [1, 'rgba(255,90,30,0)']]); c.fillRect(hx - 80, hy - 80, 160, 160); c.restore(); }
    for (let i = 0; i < 5; i++) ART.flame(c, hx - 100 + i * 50, hy + 22 - Math.abs(i - 2) * 6, (1.2 + (i % 2) * .5 - Math.abs(i - 2) * .15) * h.fire, t, 'warm', clamp(h.fire * 2) * (fireArt ? .55 : 1), i);   // over the painted fire: lighter, for the flicker
  }
  function drawGate(c, t) {
    const g = S.gate;
    ART.drawBg(c, 'gate');
    if (ART.hasClip('gateOpen') && g.opening) { const v = ART.video.gate_open; if (v.paused && !v.ended) v.play().catch(() => {}); ART.drawBg(c, 'gateOpen'); }
    else ART.gateSlab(c, g.open);
    const ly = GEO.gate.ledgeY, hint2 = (S.hint.gate || 0) >= 2;
    g.cands.forEach((cd, i) => {
      const [fx, fy] = ART.candle(c, cd.x, ly, 120, 34);
      if (i === g.focus && cd.lit > .5) { c.save(); c.strokeStyle = 'rgba(255,240,200,.7)'; c.setLineDash([10, 10]); c.lineWidth = 4; c.beginPath(); c.ellipse(cd.x, ly - 80, 80, 150, 0, 0, 7); c.stroke(); c.restore(); }
      const kind = cd.fox && (hint2 || g.wrong > 0) ? 'fox' : 'warm';
      ART.flame(c, fx, fy, 1 - cd.out * .7, t, kind, cd.lit, i * 1.7);
    });
  }
  function drawTunnel(c, t) {
    const tu = S.tunnel, ws = tu.water[tu.fork], key = tu.fork ? 'tunnel1' : 'tunnel0';
    ART.drawBg(c, key);
    const [ox, oy, rx, ry] = GEO.tunnel[ws < 0 ? 'left' : 'right'], mist = .1 + ((S.hint.fork || 0) >= 2 ? .3 : 0) + .05 * Math.sin(t * 1.3);
    c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = ART.rad(c, ox, oy + 80, 10, ry, [[0, `rgba(110,200,255,${mist})`], [1, 'rgba(110,200,255,0)']]); c.fillRect(ox - rx, oy - ry, rx * 2, ry * 2); c.restore();
    if (tu.dead > 0) { c.save(); c.globalAlpha = clamp(tu.dead); c.fillStyle = 'rgba(255,150,80,.12)'; c.fillRect(0, 0, W, H); c.restore(); }
  }
  function drawSpring(c, t) {
    const sp = S.spring;
    ART.drawBg(c, 'spring'); ART.drawBg(c, 'springGlow', sp.glow);
    if (sp.glow > 0) { c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = sp.glow;
      for (let i = 0; i < 18; i++) { const x = (i * 211 + t * 20 * (i % 3 + 1)) % W, y = 720 + (i * 97) % 330; c.fillStyle = `rgba(200,255,255,${.25 + .25 * Math.sin(t * 2 + i)})`; c.fillRect(x, y, 60 + (i % 4) * 30, 3); }
      c.restore(); }
  }
  function drawParts(c) {
    for (const p of parts) {
      const a = 1 - p.life / p.max;
      if (p.k === 'spark') { c.fillStyle = `rgba(255,${180 + 60 * a | 0},90,${a})`; c.fillRect(p.x - 3, p.y - 3, 6, 6); }
      else if (p.k === 'smoke') { c.fillStyle = `rgba(${p.col},${.35 * a})`; c.beginPath(); c.arc(p.x, p.y, 10 + 30 * (1 - a), 0, 7); c.fill(); }
      else if (p.k === 'snow') { c.fillStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.arc(p.x, p.y, p.r, 0, 7); c.fill(); }
      else if (p.k === 'drip') { c.fillStyle = 'rgba(190,230,255,.9)'; c.beginPath(); c.ellipse(p.x, p.y, 5, 9, 0, 0, 7); c.fill(); }
      else if (p.k === 'ripple') { c.strokeStyle = `rgba(210,250,255,${.8 * a})`; c.lineWidth = 4; c.beginPath(); c.ellipse(p.x, p.y, 20 + 160 * (1 - a), 6 + 40 * (1 - a), 0, 0, 7); c.stroke(); }
      else if (p.k === 'mote') { c.fillStyle = `rgba(190,255,250,${a * .9})`; c.beginPath(); c.arc(p.x, p.y, 3, 0, 7); c.fill(); }
    }
  }
  function lighting(c, t) {
    const fl = 1 + .06 * Math.sin(t * 11) + .04 * Math.sin(t * 17), [hx, hy] = GEO.hand, h = S.hut;
    const handLit = S.scene !== 'gate' && h.lit && !(S.scene === 'spring' && S.spring.out);
    const hand = handLit ? [{ x: hx, y: hy - 40, r: 520 * fl, a: .95 }] : [];
    const handW = handLit ? [{ x: hx, y: hy - 40, r: 360 * fl, a: .16 }] : [];
    if (S.scene === 'hut') {
      const [fx, fy] = GEO.hut.hearth, f = h.fire;
      ART.light(c, .74 * filmDark('hut'), [{ x: 310, y: 380, r: 640, a: .55 }, { x: fx, y: fy - 80, r: (260 + 1100 * f) * fl, a: .25 + .75 * f }, { x: fx, y: fy, r: 160, a: h.ember * .6 }, ...hand],
        [{ x: fx, y: fy - 100, r: 900 * f * fl, a: .28 * f }, { x: 310, y: 360, r: 500, a: .08, col: '140,170,255' }, ...handW]);
    } else if (S.scene === 'gate') {
      const g = S.gate, L = g.cands.filter((x) => x.lit > .5).map((x) => ({ x: x.x, y: GEO.gate.ledgeY - 150, r: 330 * fl, a: .7 }));
      const dc = (GEO.gate.door[0] + GEO.gate.door[2]) / 2;
      ART.light(c, .5 * filmDark('gate'), [{ x: 1640, y: 170, r: 900, a: .5 }, ...L, { x: dc, y: 640, r: 700, a: g.open * .8 }],
        [...L.map((x) => ({ ...x, r: 260, a: .14 })), { x: dc, y: 640, r: 650, a: g.open * .3, col: '110,210,255' }]);
    } else if (S.scene === 'tunnel') {
      ART.light(c, .8 * filmDark('tunnel0'), [{ x: 960, y: 640, r: 900, a: .35 }, ...hand], handW);
    } else if (S.scene === 'spring') {
      const g = S.spring.glow;
      ART.light(c, (.82 - .72 * g) * filmDark('spring'), [...hand, { x: 1505, y: 500, r: 700, a: .3 + .7 * g }, { x: 960, y: 860, r: 1300, a: g }],
        [...handW, { x: 960, y: 840, r: 1000, a: .22 * g, col: '90,220,255' }]);
    }
    if (handLit) { const [x, y] = ART.handCandle(c, t, true); ART.flame(c, x, y, 1, t, 'warm', 1, 9); }
    else if (S.scene !== 'gate' && h.lit) ART.handCandle(c, t, false);
  }
  function draw(t) {
    ctx.save();
    if (S.scene === 'tunnel' && S.tunnel.dead > 1.6) ctx.translate(rnd(-8, 8), rnd(-6, 6));
    ({ hut: drawHut, gate: drawGate, tunnel: drawTunnel, spring: drawSpring })[S.scene](ctx, t);
    drawParts(ctx);
    lighting(ctx, t);
    // hint rings at level 2
    const lvl = S.hint[S.step] || 0;
    if (lvl >= 2 && S.step === 'find') { if (!S.hut.tinder) ring(ctx, GEO.hut.basket[0], GEO.hut.basket[1] - 40, 150); if (!S.hut.flint) { const r = drawerRect(S.hut.flintIn); ring(ctx, (r[0] + r[2]) / 2, (r[1] + r[3]) / 2, 140); } }
    if (lvl >= 2 && S.step === 'candle') ring(ctx, ...(S.hut.lit ? [1700, 560, 200] : S.hut.candle ? [GEO.hut.hearth[0], GEO.hut.hearth[1], 240] : [GEO.hut.candle[0], GEO.hut.candle[1] - 60, 110]));
    if (S.step === 'enter' && S.gate.open > .9 && S.t % 2 < 1.3) ring(ctx, 960, 600, 220);
    const [fx, fy, fs] = foxPos();
    if (S.started) drawFox(ctx, fx, fy, fs, t, talking > 0 && bubble.classList.contains('show'));
    ctx.restore();
  }

  // ---------------------------------------------------------------- side panel: radar + meters + device
  const rc = $('radar').getContext('2d');
  function radar(src, th) {
    const w = 480, h = 420, cx = 240, cy = 220, R = 160;
    rc.clearRect(0, 0, w, h);
    rc.strokeStyle = 'rgba(255,255,255,.08)'; rc.lineWidth = 1.5; for (const r of [R * .5, R]) { rc.beginPath(); rc.arc(cx, cy, r, 0, 7); rc.stroke(); }
    rc.fillStyle = '#776d86'; rc.font = '600 13px Inter'; rc.textAlign = 'center'; rc.fillText('front', cx, cy - R - 10); rc.fillText('L', cx - R - 18, cy + 5); rc.fillText('R', cx + R + 18, cy + 5);
    for (const [e, sx] of [['L', -1], ['R', 1]]) {
      const v = Math.max(th[e + 'c'], th[e + 'h']), col = th[e + 'c'] > th[e + 'h'] ? '79,179,255' : '255,122,69';
      rc.fillStyle = v > .02 ? `rgba(${col},${.25 + .75 * v})` : '#2a2333'; rc.beginPath(); rc.ellipse(cx + sx * 46, cy, 12, 24, 0, 0, 7); rc.fill();
      if (v > .02) { rc.shadowColor = `rgb(${col})`; rc.shadowBlur = 22 * v; rc.fill(); rc.shadowBlur = 0; }
    }
    rc.fillStyle = '#3a3046'; rc.beginPath(); rc.arc(cx, cy, 40, 0, 7); rc.fill(); rc.fillStyle = '#4c4058'; rc.beginPath(); rc.moveTo(cx - 9, cy - 38); rc.lineTo(cx, cy - 52); rc.lineTo(cx + 9, cy - 38); rc.fill();
    rc.font = '26px sans-serif'; rc.textBaseline = 'middle';
    const seen = new Set();
    for (const s of src) {
      const key = s.icon + Math.round(s.az * 10); if (seen.has(key)) continue; seen.add(key);
      const x = cx + Math.sin(s.az) * R, y = cy - Math.cos(s.az) * R;
      rc.globalAlpha = clamp(.35 + s.s); rc.fillStyle = s.k === 'h' ? 'rgba(255,122,69,.25)' : 'rgba(79,179,255,.25)'; rc.beginPath(); rc.arc(x, y, 18 + 18 * s.s, 0, 7); rc.fill();
      rc.fillText(s.icon, x, y + 1); rc.globalAlpha = 1;
    }
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
    if ((sc.Lc > OFF && sc.Lh > OFF) || (sc.Rc > OFF && sc.Rh > OFF)) conflicts++;          // must stay 0
    for (const [k, [bar, val]] of Object.entries(meterEls)) { bar.style.width = `${sc[k] * 100}%`; val.textContent = Math.round(sc[k] * 100); }
    const cmd = command(sc); $('cmd').textContent = cmd;
    for (const [e, el] of [['L', $('glowL')], ['R', $('glowR')]]) {
      const c = sc[e + 'c'], h = sc[e + 'h'], v = Math.max(c, h), col = c > h ? '79,179,255' : '255,122,69';
      el.style.opacity = v.toFixed(2); el.style.background = c > .03 && h > .03 ? `linear-gradient(to bottom, rgba(255,122,69,${(.6 * Math.sqrt(h / v)).toFixed(2)}) 0 38%, rgba(79,179,255,${(.6 * Math.sqrt(c / v)).toFixed(2)}) 62% 100%)` : `linear-gradient(to ${e === 'L' ? 'right' : 'left'}, rgba(${col},.55), rgba(${col},0))`;   // cool AND heat on one ear: warm on top, cool below, blended over the middle; the .glow mask fades it inward (layered, they read as grey: Demo19 2026-11-10)
    }
    if (!device.isConnected() || !$('sendOn').checked) return;
    const n = performance.now(); if (cmd !== lastSent && n - lastSendAt >= SEND_INTERVAL) { device.send(cmd); lastSent = cmd; lastSendAt = n; }
  }
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  // ---------------------------------------------------------------- main loop
  let last = performance.now(), hidden = false;
  function loop() {
    const n = performance.now(), dt = clamp((n - last) / 1000, 0, .05); last = n;
    if (!hidden) {
      update(dt); tickBubble(n); if (talking > 0) talking -= dt;
      if (!S.started && window.MoHeatCover && coverArt()) {} else draw(S.t);   // before Start: the story cover (Kohaku at the spring)
      const { th, src } = thermal(dt);
      output(th, S.started); radar(S.started ? src : [], th);
      $('clock').textContent = fmt(S.clock);
      $('posInfo').textContent = { hut: 'Mountain hut', gate: 'Cave mouth', tunnel: `Cave · fork ${S.tunnel.fork + 1}`, spring: 'Hidden spring' }[S.scene];
      blowEl.hidden = !blowWanted(); blowEl.classList.toggle('hot', blowing); blowEl.style.right = S.step === 'spring' ? '24cqw' : '';   // the candle stands at the bottom right of the spring
      const lv = micState === 'on' ? micLevel() : 0;
      blowEl.querySelectorAll('.mic i').forEach((b, i) => { const on = lv * 9 > (i + 1) / 7; b.style.height = `${on ? 35 + 65 * Math.min(1, lv * 9 - i / 7) : 15}%`; b.style.opacity = on ? 1 : .35; });
      $('micBars').hidden = micState !== 'on';
    }
    requestAnimationFrame(loop);
  }
  document.addEventListener('visibilitychange', () => { hidden = document.hidden; if (hidden) { stopOutput(); SND.ctx()?.suspend(); } else { last = performance.now(); SND.ctx()?.resume(); } });
  document.addEventListener('keydown', (e) => {
    if (e.target.matches?.('input, select')) return;
    if (e.code === 'Escape') emergencyStop();
    else if (e.code === 'Space' || e.code === 'KeyB') { e.preventDefault(); keyHold = true; }
    else if (e.code === 'KeyH') hint();
  });
  document.addEventListener('keyup', (e) => { if (e.code === 'Space' || e.code === 'KeyB') keyHold = false; });

  // the end: Kohaku thanks you, the glowing spring stays a moment, then back to the cover with the device output off
  function finish() {
    S.done = true; renderGoal(); fox(['thanks'], true);
    setTimeout(() => {
      S.started = false; stopOutput(); for (const L of Object.values(loops)) L.stop(); loops = {};
      bubble.classList.remove('show'); say = [];
      $('startBtn').textContent = '↺ もう一度 · Play again';
      $('intro').classList.remove('hidden');
    }, 5000);
  }
  function start() {
    SND.init(); ensureMic(); SND.loadVoices(Object.keys(window.KOHAKU_LINES || {}));
    const again = S.done;
    if (again || S.started) { S = fresh(); initGate(); parts = []; pulses = []; busy = false; fadeEl.classList.remove('on'); }   // also a restart mid-game (the shell's chapter seek)
    $('intro').classList.add('hidden'); S.started = true; setLoops(S.scene); renderInv(); renderGoal(); renderSteps();
    fox(again ? ['again', 'intro3'] : ['intro1', 'intro2', 'intro3'], true);
  }
  $('startBtn').addEventListener('click', start);
  $('lrBtn').addEventListener('click', () => { SND.lrCheck(); const b = $('lrBtn'); b.textContent = '🎧 Left…'; setTimeout(() => { b.textContent = '🎧 …Right'; }, 900); setTimeout(() => { b.textContent = '🎧 Left / Right check'; }, 1900); });

  // the cover (DEMO_DESIGN_GUIDE §7.3 2b): Kohaku, happy, in front of the glowing spring — plate + his cut-out, on the standard spot
  const coverArt = () => false;   // UI v2: the cover is the finished image
  // ---------------------------------------------------------------- pure listening: the puzzle solves itself, step by step (shared/shell.js hand)
  // Kohaku speaks first, then the hand acts: straw from the basket, drawers opened one by one until the flint, three strikes at the
  // hearth, a held breath on the ember, candle → hearth → door; at the gate it "feels" each candle in turn and blows out only the
  // cold foxfires; in the tunnel it listens, then takes the side with the water; at the spring it blows out the candle and touches the water.
  if (window.MoHeatShell) {
    let quietSince = 0;
    const at = (x, y) => [x / W, y / H], mid = ([x0, y0, x1, y1]) => at((x0 + x1) / 2, (y0 + y1) / 2);
    MoHeatShell.autoplay = (G) => {
      if (!S.started || S.done && S.scene !== 'spring' || busy) return true;
      const n = performance.now(), quiet = !say.length && n > sayUntil;
      if (!quiet) { quietSince = 0; return true; } if (!quietSince) quietSince = n; if (n - quietSince < 700) return true;   // let Kohaku finish
      const h = S.hut, g = S.gate, tu = S.tunnel, sp = S.spring, { tried, felt } = S.ap || (S.ap = { tried: new Set(), felt: new Set() });   // per run
      if (S.step === 'find') {
        if (!h.tinder) return G.run(() => G.tap(cv, ...at(GEO.hut.basket[0], GEO.hut.basket[1] - 40)));
        if (h.open[h.flintIn]) return G.run(() => G.tap(cv, ...mid(drawerRect(h.flintIn))));
        const k = [0, 1, 2].find((i) => !tried.has(i) && i !== h.flintIn && i < h.flintIn) ?? h.flintIn; tried.add(k);
        return G.run(async () => { await G.tap(cv, ...mid(drawerRect(k))); if (k !== h.flintIn) { await G.wait(1.4); if (h.open[k]) await G.tap(cv, ...mid(drawerRect(k))); } });
      }
      if (S.step === 'strike') return G.run(async () => { await G.tap(cv, ...at(GEO.hut.hearth[0], GEO.hut.hearth[1] - 10)); await G.wait(.5); });
      if (S.step === 'ember') return G.run(() => G.hold(bb, .5, .5, 2.6, () => S.step !== 'ember'));
      if (S.step === 'candle') {
        if (!h.candle) return G.run(() => G.tap(cv, ...at(GEO.hut.candle[0], GEO.hut.candle[1] - 60)));
        if (!h.lit) return G.run(() => G.tap(cv, ...at(GEO.hut.hearth[0], GEO.hut.hearth[1])));
        return G.run(() => G.tap(cv, ...mid(GEO.hut.door)));
      }
      if (S.step === 'gate' && !g.opening && g.wrong <= 0) {
        const i = g.cands.findIndex((c, k) => c.lit > .5 && !felt.has(k)); if (i < 0) { felt.clear(); return true; }
        felt.add(i); const c = g.cands[i];
        return G.run(async () => { await G.tap(cv, ...at(c.x, GEO.gate.ledgeY - 120)); await G.wait(1.3); if (c.fox) await G.hold(bb, .5, .5, 1.1, () => c.lit <= .5); });   // feel it: warm = keep, cold = blow
      }
      if (S.step === 'enter' && g.open > .9) return G.run(() => G.tap(cv, ...mid(GEO.gate.door)));
      if (S.step === 'fork' && tu.dead <= 0) {
        const [ox, oy] = GEO.tunnel[tu.water[tu.fork] < 0 ? 'left' : 'right'];
        return G.run(async () => { await G.wait(1.2); await G.tap(cv, ...at(ox, oy)); });
      }
      if (S.step === 'spring' && !sp.out) return G.run(() => G.hold(bb, .5, .5, 1.3, () => sp.out));
      if (S.step === 'end' && sp.glow > .6 && sp.touches < 3) return G.run(async () => { await G.tap(cv, ...at(560 + sp.touches * 380, GEO.spring.lakeY + 160 + (sp.touches % 2) * 90)); await G.wait(1.6); });
      return true;
    };
  }

  // ---------------------------------------------------------------- special modes
  // ?scene=gate|tunnel|spring — jump ahead (testing); ?cover=1 — poster; ?shot=<bg> — clean background (Seedance layout reference)
  window.CAVE = { get S() { return S; }, go, hit, thermal: () => thermal(.05), conflicts: () => conflicts };
  const jump = QS.get('scene');
  if (jump) { Object.assign(S.hut, { tinder: true, flint: true, candle: true, lit: true, ember: 1, fire: 1 }); S.scene = jump; S.step = { gate: 'gate', tunnel: 'fork', spring: 'spring' }[jump] || 'find'; }
  if (QS.has('cover')) {
    document.body.classList.add('cover-only');
    S.scene = 'gate'; S.started = false; S.gate.open = .5;
    S.gate.cands.forEach((c, i) => { c.fox = i >= 2; });
    S.hint.gate = 2;
    const poster = () => {
      if (window.MoHeatCover && coverArt()) return;
      ART.drawBg(ctx, 'gate'); drawGate(ctx, 1.3); lighting(ctx, 1.3);
      S.gate.cands.forEach((cd, i) => ART.flame(ctx, cd.x, GEO.gate.ledgeY - 128, 1.5, 1.3, cd.fox ? 'fox' : 'warm', 1, i * 1.7));   // poster: bright flames, warm left / foxfire right
      drawFox(ctx, 235, 1040, .95, .3, false);
    };
    document.fonts.ready.then(poster); addEventListener('load', () => setTimeout(poster, 50));   // again once the painted art has loaded
    return;
  }
  if (QS.get('shot')) {
    document.body.classList.add('cover-only', 'shot'); $('intro').classList.add('hidden');
    const k = QS.get('shot');
    if (k === 'hutFire') { Object.assign(S.hut, { tinder: true, flint: true, candle: true, ember: 1, fire: 1 }); S.scene = 'hut'; drawHut(ctx, 1.1); lighting(ctx, 1.1); return; }   // layout ref: hearth burning
    ART.drawBg(ctx, k === 'gateOpen' ? 'gate' : k, 1);
    if (k === 'gateOpen') { ART.gateSlab(ctx, 1); }
    else if (k === 'gate') ART.gateSlab(ctx, 0);
    return;
  }
  ART.loadClips();
  renderGoal(); renderSteps(); renderInv();
  if (QS.has('autoplay') || jump) { const ac = SND.init(); if (jump || ac.state === 'running') start(); else ac.resume().then(() => { if (ac.state === 'running' && !S.started) start(); }).catch(() => {}); }
  requestAnimationFrame(loop);
})();
