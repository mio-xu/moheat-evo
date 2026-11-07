// Interactive mode for the Nobunaga series (Demo 5–9): the film pauses at "your" moments and waits for you.
//   read  — your subtitle line: say it aloud (the mic hears you speak, then a short silence) → the lords answer
//   toast — say "乾杯！" or tap the glass
//   blow  — blow into the mic to cool the hot food / tea; your breath cools both ears while you blow
// No mic (denied / unsupported): every gate becomes a tap (blow = press and hold). Each gate auto-continues after GIVE_UP s.
// The player calls MoHeatInteract.tick(t) every frame (one hook in each demo.js); it returns { waiting, th } where th
// overrides the thermal output while you blow. Off in ?embed (site menu), ?cover and ?render (MP4) — those stay linear.
// Gates are chosen by hand per demo below; times are on silent gaps of the existing mix, so audio and thermal are unchanged.
(() => {
  const QS = new URLSearchParams(location.search);
  if (QS.has('embed') || QS.has('cover') || QS.has('render')) return;
  const GATES = {
    Demo5_GifuCastle: [
      { t: 23.0, kind: 'read' },
      { t: 74.35, kind: 'blow', what: ['お茶をふーふーして、冷ましましょう', 'Blow on the tea to cool it'] },
      { t: 116.8, kind: 'read' },
      { t: 136.0, kind: 'read' },
    ],
    Demo6_FutureWhisky: [
      { t: 13.3, kind: 'read' },
      { t: 115.0, kind: 'read' },
      { t: 135.63, kind: 'toast', resume: 135.63, what: ['乾杯！', 'Cheers!'] },
      { t: 147.4, kind: 'read' },
    ],
    Demo7_KyotoIzakaya: [
      { t: 16.2, kind: 'read' },
      { t: 34.3, kind: 'toast', resume: 34.3 },
      { t: 55.5, kind: 'blow', what: ['殿の焼き鳥を、ふーふーしてあげましょう', "Blow on Nobunaga's yakitori to cool it"] },
      { t: 107.2, kind: 'read' },
      { t: 132.4, kind: 'read' },
    ],
    Demo8_YamazakiDistillery: [
      { t: 16.22, kind: 'read' },
      { t: 35.87, kind: 'read' },
      { t: 120.33, kind: 'toast' },
      { t: 136.1, kind: 'read' },
    ],
    Demo9_SengokuBanquet: [
      { t: 5.1, kind: 'read' },
      { t: 36.2, kind: 'toast', resume: 36.2 },
      { t: 111.0, kind: 'read' },
      { t: 146.95, kind: 'read' },
    ],
  };
  const dir = Object.keys(GATES).find((d) => location.pathname.includes(`/${d}/`));
  const stage = document.getElementById('stage'), media = document.getElementById('mix');
  const A = window.DEMO_DATA && window.DEMO_DATA.anim;
  if (!dir || !stage || !media || !A) return;
  const GIVE_UP = 15, BLOW_NEED = 2.4;

  // each gate: pause at t (just after your subtitle appears), resume near the end of your line (skip the silent rest)
  const voices = A.subs.filter((s) => s.who !== 'Y');
  const gates = GATES[dir].map((g) => {
    const sub = A.subs.find((s) => s.who === 'Y' && Math.abs(s.t0 - g.t) < .3);
    const t = sub && g.kind === 'read' ? Math.max(g.t, sub.t0 + .12) : g.t;   // read: let your subtitle appear first
    let resume = g.resume;
    if (resume == null) {
      if (!sub) resume = t;
      else {
        const next = voices.find((v) => v.t0 > sub.t0 + .05);
        resume = Math.max(t, Math.min(sub.t1, next ? next.t0 : sub.t1) - .5);
      }
    }
    return { ...g, t, resume, sub };
  });

  const store = { get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v === '1'; } catch { return d; } },
    set: (k, v) => { try { localStorage.setItem(k, v ? '1' : '0'); } catch {} } };
  let enabled = store.get('moheat.interact', true);

  // ---------------------------------------------------------------- styles
  const css = document.createElement('style');
  css.textContent = `
  .ix-card{position:absolute;left:50%;bottom:7cqw;transform:translateX(-50%);z-index:6;width:min(64cqw,760px);padding:1.6cqw 2.2cqw 1.4cqw;border-radius:1.4cqw;
    background:rgba(18,10,4,.84);border:1px solid rgba(246,210,122,.55);box-shadow:0 1cqw 4cqw rgba(0,0,0,.55);color:#f9ecd0;text-align:center;
    backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);animation:ixIn .35s ease-out}
  @keyframes ixIn{from{opacity:0;transform:translate(-50%,12px)}to{opacity:1;transform:translate(-50%,0)}}
  .ix-tag{font:800 clamp(9px,1.05cqw,15px)/1 Inter,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#f6d27a}
  .ix-line{margin:.9cqw 0 .3cqw;font:800 clamp(15px,2.6cqw,40px)/1.3 "Shippori Mincho B1","Noto Sans JP",serif;color:#fff}
  .ix-en{font:500 clamp(10px,1.35cqw,20px)/1.3 Inter,sans-serif;color:#e6d6b6}
  .ix-how{margin-top:.9cqw;font:600 clamp(10px,1.3cqw,18px)/1.35 "Noto Sans JP",Inter,sans-serif;color:#efe3c8}
  .ix-row{display:flex;align-items:center;justify-content:center;gap:1.2cqw;margin-top:1.1cqw}
  .ix-mic{display:flex;align-items:flex-end;gap:3px;height:clamp(14px,2cqw,28px)}
  .ix-mic i{width:clamp(3px,.45cqw,6px);height:15%;border-radius:2px;background:#f6d27a;opacity:.35;transition:height .06s,opacity .06s}
  .ix-btn{cursor:pointer;border:1px solid rgba(246,210,122,.6);background:rgba(246,210,122,.12);color:#f9ecd0;border-radius:999px;
    padding:.55cqw 1.4cqw;font:700 clamp(11px,1.3cqw,17px)/1.2 "Noto Sans JP",Inter,sans-serif;touch-action:manipulation;user-select:none;-webkit-user-select:none}
  .ix-btn:hover{background:rgba(246,210,122,.25)}
  .ix-btn.big{font-size:clamp(14px,2cqw,28px);padding:.8cqw 2.4cqw;background:linear-gradient(135deg,#f6d27a,#e0913c);color:#2a1606;border:0}
  .ix-btn.skip{border-color:rgba(255,255,255,.25);background:transparent;color:#cbbfb8;font-weight:600}
  .ix-btn.holding{background:#7cc8ff;color:#06223a}
  .ix-gauge{position:relative;height:clamp(8px,1cqw,14px);margin:1cqw auto 0;width:70%;border-radius:999px;background:rgba(124,200,255,.25);overflow:hidden}
  .ix-gauge i{position:absolute;inset:0 auto 0 0;background:linear-gradient(90deg,#ff7a45,#ffb36b);border-radius:999px;transition:width .08s}
  .ix-gauge b{position:absolute;right:6px;top:50%;transform:translateY(-50%);font:700 clamp(8px,.8cqw,11px)/1 Inter,sans-serif;color:#fff}
  .ix-timer{position:absolute;left:0;bottom:0;height:3px;background:rgba(246,210,122,.55);border-radius:0 0 0 1.4cqw}
  .ix-done{position:absolute;left:50%;bottom:9cqw;transform:translateX(-50%);z-index:6;font:800 clamp(16px,3cqw,44px)/1 "Shippori Mincho B1",serif;color:#f6d27a;
    text-shadow:0 2px 12px rgba(0,0,0,.8);animation:ixPop .7s ease-out forwards;pointer-events:none}
  @keyframes ixPop{0%{opacity:0;transform:translate(-50%,10px) scale(.9)}25%{opacity:1;transform:translate(-50%,0) scale(1.05)}100%{opacity:0;transform:translate(-50%,-14px)}}
  .stage.ix-wait .subs{visibility:hidden}
  .ix-chip{position:absolute;top:1.2cqw;right:1.2cqw;z-index:5;cursor:pointer;border-radius:999px;padding:.45cqw 1cqw;border:1px solid rgba(246,210,122,.45);
    background:rgba(18,10,4,.6);color:#f9ecd0;font:700 clamp(9px,1cqw,14px)/1.2 "Noto Sans JP",Inter,sans-serif}
  .ix-chip.off{opacity:.55;border-color:rgba(255,255,255,.2)}
  .intro .ix-toggle{display:inline-flex;align-items:center;gap:.6em;margin-top:1.1cqw;cursor:pointer;padding:.5em 1em;border-radius:999px;
    border:1px solid rgba(246,210,122,.5);background:rgba(18,10,4,.5);font:600 clamp(10px,1.25cqw,16px)/1.2 "Noto Sans JP",Inter,sans-serif;color:#f9ecd0}
  .intro .ix-toggle input{accent-color:#e0913c;width:1.1em;height:1.1em;margin:0}
  .intro:not(.hidden) ~ .ix-chip{display:none}
  @container (max-width:620px){.ix-card{width:90cqw;bottom:4cqw;padding:2.4cqw 3cqw}.ix-line{font-size:4.6cqw}.ix-en{font-size:3cqw}.ix-how{font-size:3cqw}
    .ix-btn{font-size:3.2cqw;padding:1.2cqw 3cqw}.ix-btn.big{font-size:4.4cqw}.ix-chip{font-size:2.6cqw;padding:1cqw 2cqw}.intro .ix-toggle{font-size:3cqw}}`;
  document.head.appendChild(css);

  // ---------------------------------------------------------------- toggles: on the cover and a chip on the stage
  const toggle = document.createElement('label'); toggle.className = 'ix-toggle';
  toggle.innerHTML = '<input type="checkbox"> <span>🎙 あなたも参加する · Interactive — say your lines</span>';
  const actions = stage.querySelector('.intro-actions');
  if (actions) actions.after(toggle);
  const chip = document.createElement('button'); chip.type = 'button'; chip.className = 'ix-chip'; stage.appendChild(chip);
  const sync = () => {
    toggle.querySelector('input').checked = enabled;
    chip.textContent = enabled ? '🎙 参加モード ON' : '🎙 参加モード OFF'; chip.classList.toggle('off', !enabled);
    chip.title = enabled ? 'Interactive mode: the film waits for your lines' : 'Interactive mode off: plays straight through';
  };
  const setEnabled = (v) => { enabled = v; store.set('moheat.interact', v); sync(); if (!v && cur) finish(false); if (v) ensureMic(); };
  toggle.querySelector('input').addEventListener('change', (e) => setEnabled(e.target.checked));
  chip.addEventListener('click', () => setEnabled(!enabled));
  sync();

  // ---------------------------------------------------------------- microphone (level only; nothing is recorded or sent anywhere)
  let mic = null, micState = 'none', floor = .01;   // none | asking | on | denied
  const buf = new Float32Array(1024);
  function ensureMic() {
    if (micState !== 'none' || !enabled) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { micState = 'denied'; return; }
    micState = 'asking';
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false } })
      .then((st) => { const an = ac.createAnalyser(); an.fftSize = 1024; ac.createMediaStreamSource(st).connect(an); mic = { ac, an }; micState = 'on'; ac.resume(); if (cur) render(); })
      .catch(() => { micState = 'denied'; ac.close(); if (cur) render(); });
  }
  function level() {
    if (!mic) return 0;
    if (mic.ac.state === 'suspended') mic.ac.resume();
    mic.an.getFloatTimeDomainData(buf);
    let s = 0; for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
    return Math.sqrt(s / buf.length);
  }
  document.getElementById('startBtn')?.addEventListener('click', () => { fired.clear(); ensureMic(); });
  media.addEventListener('play', ensureMic);

  // ---------------------------------------------------------------- gate state
  const fired = new Set();
  let cur = null, card = null, lastT = media.currentTime || 0, lastNow = performance.now();
  const say = (g) => (g.sub ? [g.sub.ja, g.sub.en] : g.what || ['', '']);
  function start(g) {
    cur = { g, t0: performance.now(), speech: 0, silence: 0, heard: false, blow: 0, b: 0, holding: false, done: false };
    fired.add(g); media.pause(); stage.classList.add('ix-wait'); render();
  }
  function render() {
    if (!cur) return;
    card?.remove();
    const { g } = cur, [ja, en] = say(g), hasMic = micState === 'on', asking = micState === 'asking';
    card = document.createElement('div'); card.className = 'ix-card';
    const meter = hasMic ? `<span class="ix-mic">${'<i></i>'.repeat(7)}</span>` : '';
    const skip = '<button class="ix-btn skip" data-a="skip" type="button">スキップ ›</button>';
    if (g.kind === 'blow') {
      card.innerHTML = `<div class="ix-tag">🌬 あなたの番 · Your turn</div><div class="ix-line">${g.what[0]}</div><div class="ix-en">${g.what[1]}</div>
        <div class="ix-gauge"><i></i><b>熱い · HOT</b></div>
        <div class="ix-how">${hasMic ? 'マイクに「ふーっ」と息を吹きかけて · Blow into the mic — feel the cool on both ears' : 'ボタンを長押しして「ふーっ」 · Press and hold to blow'}</div>
        <div class="ix-row">${meter}${hasMic ? '' : '<button class="ix-btn big" data-a="hold" type="button">🌬 ふーっ</button>'}${skip}</div><i class="ix-timer"></i>`;
    } else if (g.kind === 'toast') {
      card.innerHTML = `<div class="ix-tag">🥂 あなたの番 · Your turn</div><div class="ix-line">${ja}</div><div class="ix-en">${en}</div>
        <div class="ix-how">${hasMic ? '声に出して乾杯！ または グラスをタップ · Say it — or tap the glass' : 'グラスをタップして乾杯！ · Tap the glass to toast'}</div>
        <div class="ix-row">${meter}<button class="ix-btn big" data-a="go" type="button">🥂 乾杯！</button>${skip}</div><i class="ix-timer"></i>`;
    } else {
      card.innerHTML = `<div class="ix-tag">🎙 あなたのセリフ · Your line</div><div class="ix-line">${ja}</div><div class="ix-en">${en}</div>
        <div class="ix-how">${hasMic ? '声に出して読んでください · Read it aloud' : asking ? 'マイクを許可してください · Allow the microphone (or tap to continue)' : '声に出して読んだら、タップ · Read it aloud, then tap'}</div>
        <div class="ix-row">${meter}${hasMic ? '' : '<button class="ix-btn big" data-a="go" type="button">▶ 言いました · Said it</button>'}${skip}</div><i class="ix-timer"></i>`;
    }
    card.addEventListener('click', (e) => { const a = e.target.closest('[data-a]')?.dataset.a; if (a === 'skip') finish(false); else if (a === 'go') finish(true); });
    const hold = card.querySelector('[data-a="hold"]');
    if (hold) {
      const on = (v) => (e) => { e.preventDefault(); if (cur) { cur.holding = v; hold.classList.toggle('holding', v); } };
      hold.addEventListener('pointerdown', on(true)); for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) hold.addEventListener(ev, on(false));
    }
    stage.appendChild(card);
  }
  function finish(ok) {
    if (!cur) return;
    const { g } = cur; cur = null; card?.remove(); card = null; stage.classList.remove('ix-wait');
    if (ok) {
      const d = document.createElement('div'); d.className = 'ix-done';
      d.textContent = g.kind === 'toast' ? '乾杯！' : g.kind === 'blow' ? 'ちょうどいい！ · Just right!' : 'いいね！ · Nice!';
      stage.appendChild(d); setTimeout(() => d.remove(), 800);
    }
    setTimeout(() => { if (Math.abs(media.currentTime - g.resume) > .05) media.currentTime = g.resume; lastT = g.resume; media.play().catch(() => {}); }, ok ? 450 : 0);
  }

  // ---------------------------------------------------------------- per frame (called by demo.js)
  function tick(t) {
    const n = performance.now(), dt = Math.min(.1, (n - lastNow) / 1000); lastNow = n;
    if (!cur) {
      const playing = !media.paused && !media.ended;
      if (enabled && playing && t > lastT && t - lastT < .6) {
        const g = gates.find((x) => !fired.has(x) && lastT < x.t && t >= x.t);
        if (g) start(g);
      }
      if (t < lastT - .3) for (const x of gates) if (x.t > t + .2) fired.delete(x);   // jumped back: re-arm the gates ahead
      lastT = t;
      if (!cur) return null;
    }
    if (!media.paused) { cur = null; card?.remove(); card = null; stage.classList.remove('ix-wait'); return null; }   // ▶ pressed: skip
    const c = cur, g = c.g, waited = (n - c.t0) / 1000;
    const lv = level(), loud = lv > Math.max(.018, floor * 3.2);
    if (!loud) floor = floor * .97 + lv * .03;
    const bars = card?.querySelectorAll('.ix-mic i');
    if (bars) bars.forEach((b, i) => { const on = lv * 9 > (i + 1) / 8; b.style.height = `${on ? 30 + 70 * Math.min(1, lv * 9 - i / 8) : 15}%`; b.style.opacity = on ? 1 : .35; });
    const timer = card?.querySelector('.ix-timer'); if (timer) timer.style.width = `${Math.max(0, 1 - waited / GIVE_UP) * 100}%`;
    let th = null;
    if (g.kind === 'blow') {
      const blowing = c.holding || lv > Math.max(.035, floor * 5);
      c.b += ((blowing ? 1 : 0) - c.b) * Math.min(1, dt * 6);
      c.blow = Math.min(BLOW_NEED, c.blow + (blowing ? dt : 0));
      const heat = 1 - c.blow / BLOW_NEED, gi = card?.querySelector('.ix-gauge i'), gb = card?.querySelector('.ix-gauge b');
      if (gi) gi.style.width = `${heat * 100}%`;
      if (gb) gb.textContent = heat > .5 ? '熱い · HOT' : heat > 0 ? 'もう少し · almost' : 'OK';
      if (c.b > .03) th = { Lc: .85 * c.b, Rc: .85 * c.b, Lh: 0, Rh: 0 };   // your breath: cool on both ears
      if (heat <= 0 && !c.done) { c.done = true; setTimeout(() => cur === c && finish(true), 250); }
    } else if (micState === 'on') {
      if (loud) { c.speech += dt; c.silence = 0; if (c.speech > .25) c.heard = true; } else c.silence += dt;
      const need = g.kind === 'toast' ? .25 : Math.min(1.2, .35 + (g.sub ? g.sub.ja.length * .04 : .4));
      if (c.heard && c.speech >= need && c.silence > (g.kind === 'toast' ? .15 : .55) && !c.done) { c.done = true; finish(true); }
    }
    if (waited > GIVE_UP && !c.done) { c.done = true; finish(false); }
    return { waiting: true, th };
  }
  window.MoHeatInteract = { tick, gates };
})();
