// Interactive mode for the full demo pages: the film pauses at "your" moments and waits for you.
//   read   — a line for you (your subtitle, or a reply written here): say it aloud (mic hears speech, then a short silence)
//   toast  — say it or tap the big button (乾杯 / 拍手)
//   blow   — blow into the mic to cool something hot; your breath cools both ears while you blow
//   choice — tap one of two answers (which side? cool or warm?); `answer` → 正解 / ざんねん; `hold` keeps the current
//            thermal on while you decide (fades out after HOLD s), so you can feel which side is cold
//   cheer  — Demo 3 (a song: never paused): cheer or tap 👏 any time → hearts on stage and a little extra warmth
// No mic (denied / unsupported): every gate becomes a tap (blow = press and hold). Each gate auto-continues after GIVE_UP s.
// Hook: each demo.js loop calls MoHeatInteract.tick(t, media) → { waiting, th, hold, boost } and MoHeatInteract.out(th, ix).
// Off in ?embed (site menu), ?cover and ?render (MP4) — those stay linear. Gates sit on gaps of the existing mix, so the
// audio and thermal tracks are unchanged. Mic: level only, nothing is recorded or sent anywhere.
(() => {
  const QS = new URLSearchParams(location.search);
  if (QS.has('embed') || QS.has('cover') || QS.has('render')) return;
  const LR = ['⬅ ひだり · Left', 'みぎ ➡ · Right'];
  const GATES = {
    Demo1_SnowFoxfire: [
      { t: 25.75, kind: 'read', what: ['うん、つめたい！', "Yes — it's cold!"] },
      { t: 31.0, kind: 'choice', what: ['小雪は、どっちから来る？', 'Which side will Koyuki come from?'], options: LR, answer: 1 },
      { t: 76.85, kind: 'choice', what: ['どっちが好き？', 'Which do you like better?'], options: ['❄ つめたい · Cool', '🔥 あったかい · Warm'],
        fb: [['小雪、うれしそう！', 'Koyuki is delighted!'], ['焔、うれしそう！', 'Homura is delighted!']] },
      { t: 129.95, kind: 'read', tag: '✨ いっしょに · Together', how: ['ふたりと一緒に、唱えてみて', 'Chant it with them'], what: ['雪と焔の、ないしょの魔法！', 'Our secret magic of snow and flame!'] },
      { t: 149.65, kind: 'read', what: ['おやすみ、小雪、焔。', 'Good night, Koyuki, Homura.'] },
    ],
    Demo2_FanMeeting: [
      { t: 8.95, kind: 'read', what: ['うん、来たよ！', "Yep, I'm here!"] },
      { t: 60.1, kind: 'read', what: ['すずしい〜！', 'So cool~!'] },
      { t: 80.85, kind: 'choice', what: ['綾音は、どっちから話しかける？', 'Which side will Ayane talk from?'], options: LR, answer: 1 },
      { t: 129.6, kind: 'toast', icon: '👏', btn: '👏 拍手！', what: ['さいこう！', 'That was amazing!'], how: ['拍手するか、「さいこう！」と言ってみて · Clap, cheer — or tap', '拍手ボタンをタップ · Tap to applaud'], done: 'ありがとう〜！' },
      { t: 143.9, kind: 'read', what: ['うん、やくそく！', 'Yes — I promise!'] },
    ],
    Demo3_ShiningSmileConcert: 'cheer',
    Demo4_SeasonsExpress: [
      { t: 24.0, kind: 'blow', what: ['暑い…！ ふーっと涼しい風を送ろう', 'So hot! Blow a cool breeze'] },
      { t: 66.0, kind: 'choice', hold: true, what: ['冷たいのは、どっちの耳？', 'Which ear feels cold?'], options: LR, answer: 0 },
      { t: 82.0, kind: 'choice', hold: true, what: ['今度は？ 冷たいのは、どっち？', 'And now — which ear is cold?'], options: LR, answer: 1 },
      { t: 109.3, kind: 'read', tag: '💡 まっくら！ · Power cut!', what: ['ライト、ついて！', 'Lights on!'], resume: 110.3 },
      { t: 146.4, kind: 'read', what: ['ありがとう、魔法の列車！', 'Thank you, magic train!'] },
    ],
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
  const stage = document.getElementById('stage');
  let media = document.getElementById('mix');
  const A = window.DEMO_DATA && window.DEMO_DATA.anim;
  if (!dir || !stage || !media || !A) return;
  const CHEER = GATES[dir] === 'cheer';
  const GIVE_UP = 15, BLOW_NEED = 2.4, HOLD = 10;

  // each gate: pause at t; for your own subtitle line, just after it appears, and resume near its end (skip the silent rest)
  const subs = A.subs || [], voices = subs.filter((s) => s.who !== 'Y');
  const list = CHEER ? [] : [...GATES[dir]];
  if (/^Demo[5-9]_/.test(dir)) {   // Nobunaga series: every line of yours is a read-aloud gate (unless a toast / blow is already there)
    for (const s of subs) if (s.who === 'Y' && !list.some((g) => Math.abs(g.t - s.t0) < .5)) list.push({ t: s.t0, kind: 'read' });
    list.sort((a, b) => a.t - b.t);
  }
  const gates = list.map((g) => {
    const sub = subs.find((s) => s.who === 'Y' && Math.abs(s.t0 - g.t) < .3);
    const t = sub && g.kind === 'read' ? Math.max(g.t, sub.t0 + .12) : g.t;
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
  .ix-row{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:1.2cqw;margin-top:1.1cqw}
  .ix-mic{display:flex;align-items:flex-end;gap:3px;height:clamp(14px,2cqw,28px)}
  .ix-mic i{width:clamp(3px,.45cqw,6px);height:15%;border-radius:2px;background:#f6d27a;opacity:.35;transition:height .06s,opacity .06s}
  .ix-btn{cursor:pointer;border:1px solid rgba(246,210,122,.6);background:rgba(246,210,122,.12);color:#f9ecd0;border-radius:999px;
    padding:.55cqw 1.4cqw;font:700 clamp(11px,1.3cqw,17px)/1.2 "Noto Sans JP",Inter,sans-serif;touch-action:manipulation;user-select:none;-webkit-user-select:none}
  .ix-btn:hover{background:rgba(246,210,122,.25)}
  .ix-btn.big{font-size:clamp(14px,2cqw,28px);padding:.8cqw 2.4cqw;background:linear-gradient(135deg,#f6d27a,#e0913c);color:#2a1606;border:0}
  .ix-btn.opt{font-size:clamp(13px,1.8cqw,24px);padding:.8cqw 2.2cqw;min-width:22cqw}
  .ix-btn.skip{border-color:rgba(255,255,255,.25);background:transparent;color:#cbbfb8;font-weight:600}
  .ix-btn.holding{background:#7cc8ff;color:#06223a}
  .ix-gauge{position:relative;height:clamp(8px,1cqw,14px);margin:1cqw auto 0;width:70%;border-radius:999px;background:rgba(124,200,255,.25);overflow:hidden}
  .ix-gauge i{position:absolute;inset:0 auto 0 0;background:linear-gradient(90deg,#ff7a45,#ffb36b);border-radius:999px;transition:width .08s}
  .ix-gauge b{position:absolute;right:6px;top:50%;transform:translateY(-50%);font:700 clamp(8px,.8cqw,11px)/1 Inter,sans-serif;color:#fff}
  .ix-timer{position:absolute;left:0;bottom:0;height:3px;background:rgba(246,210,122,.55);border-radius:0 0 0 1.4cqw}
  .ix-done{position:absolute;left:50%;bottom:9cqw;transform:translateX(-50%);z-index:6;font:800 clamp(16px,3cqw,44px)/1.2 "Shippori Mincho B1","Noto Sans JP",serif;color:#f6d27a;
    text-align:center;white-space:nowrap;text-shadow:0 2px 12px rgba(0,0,0,.8);animation:ixPop 1.1s ease-out forwards;pointer-events:none}
  .ix-done small{display:block;font:600 clamp(10px,1.4cqw,20px)/1.3 Inter,sans-serif;color:#efe3c8}
  @keyframes ixPop{0%{opacity:0;transform:translate(-50%,10px) scale(.9)}20%{opacity:1;transform:translate(-50%,0) scale(1.05)}75%{opacity:1}100%{opacity:0;transform:translate(-50%,-14px)}}
  .stage.ix-wait .subs{visibility:hidden}
  .ix-chip{position:absolute;top:1.2cqw;right:1.2cqw;z-index:5;cursor:pointer;border-radius:999px;padding:.45cqw 1cqw;border:1px solid rgba(246,210,122,.45);
    background:rgba(18,10,4,.6);color:#f9ecd0;font:700 clamp(9px,1cqw,14px)/1.2 "Noto Sans JP",Inter,sans-serif}
  .ix-chip.off{opacity:.55;border-color:rgba(255,255,255,.2)}
  .intro .ix-toggle{display:inline-flex;align-items:center;gap:.6em;margin-top:1.1cqw;cursor:pointer;padding:.5em 1em;border-radius:999px;
    border:1px solid rgba(246,210,122,.5);background:rgba(18,10,4,.5);font:600 clamp(10px,1.25cqw,16px)/1.2 "Noto Sans JP",Inter,sans-serif;color:#f9ecd0}
  .intro .ix-toggle input{accent-color:#e0913c;width:1.1em;height:1.1em;margin:0}
  .intro:not(.hidden) ~ .ix-chip,.intro:not(.hidden) ~ .ix-cheer{display:none}
  .stage canvas.ix-fx{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:4;background:transparent}
  .ix-cheer{position:absolute;right:1.2cqw;bottom:1.2cqw;z-index:5;display:flex;align-items:center;gap:.8cqw;padding:.5cqw .6cqw .5cqw 1.1cqw;border-radius:999px;
    background:rgba(30,12,30,.6);border:1px solid rgba(255,170,210,.5);color:#ffe3f0;font:700 clamp(9px,1cqw,14px)/1.2 "Noto Sans JP",Inter,sans-serif}
  .ix-cheer .bar{width:8cqw;height:.7cqw;min-height:5px;border-radius:999px;background:rgba(255,255,255,.15);overflow:hidden}
  .ix-cheer .bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,#ff8fc8,#ffd36b);border-radius:999px}
  .ix-cheer button{cursor:pointer;border:0;border-radius:999px;padding:.5cqw 1.1cqw;background:linear-gradient(135deg,#ff8fc8,#ffb36b);color:#3a0a22;
    font:800 clamp(11px,1.3cqw,17px)/1.2 "Noto Sans JP",sans-serif;touch-action:manipulation}
  @container (max-width:620px){.ix-card{width:90cqw;bottom:4cqw;padding:2.4cqw 3cqw}.ix-line{font-size:4.6cqw}.ix-en{font-size:3cqw}.ix-how{font-size:3cqw}
    .ix-btn{font-size:3.2cqw;padding:1.2cqw 3cqw}.ix-btn.big,.ix-btn.opt{font-size:4cqw}.ix-chip{font-size:2.6cqw;padding:1cqw 2cqw}.intro .ix-toggle{font-size:3cqw}
    .ix-cheer{font-size:2.8cqw}.ix-cheer button{font-size:3.4cqw;padding:1.2cqw 2.6cqw}.ix-cheer .bar{width:14cqw}}`;
  document.head.appendChild(css);

  // ---------------------------------------------------------------- toggles: on the cover and a chip on the stage
  const toggle = document.createElement('label'); toggle.className = 'ix-toggle';
  toggle.innerHTML = `<input type="checkbox"> <span>${CHEER ? '📣 声援で参加する · Cheer along (mic or tap)' : '🎙 あなたも参加する · Interactive — answer &amp; play along'}</span>`;
  const actions = stage.querySelector('.intro-actions');
  if (actions) actions.after(toggle);
  const chip = document.createElement('button'); chip.type = 'button'; chip.className = 'ix-chip'; stage.appendChild(chip);
  const sync = () => {
    toggle.querySelector('input').checked = enabled;
    chip.textContent = `${CHEER ? '📣 声援' : '🎙 参加'}モード ${enabled ? 'ON' : 'OFF'}`; chip.classList.toggle('off', !enabled);
    chip.title = enabled ? 'Interactive mode on' : 'Interactive mode off: plays straight through';
    if (cheerEl) cheerEl.style.display = enabled ? '' : 'none';
  };
  const setEnabled = (v) => { enabled = v; store.set('moheat.interact', v); sync(); if (!v && cur) finish(false); if (v) ensureMic(); };
  toggle.querySelector('input').addEventListener('change', (e) => setEnabled(e.target.checked));
  chip.addEventListener('click', () => setEnabled(!enabled));

  // ---------------------------------------------------------------- microphone (level only)
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
  document.getElementById('startBtn')?.addEventListener('click', () => { fired.clear(); cheerCount = 0; thanked = false; ensureMic(); });
  for (const m of [document.getElementById('mix'), document.getElementById('film')]) m?.addEventListener('play', ensureMic);

  // ---------------------------------------------------------------- cheer mode (Demo 3): hearts + a little extra warmth, never pauses
  let cheerEl = null, fx = null, fxc = null, hearts = [], cheer = 0, cheerCount = 0, thanked = false, wasLoud = false;
  if (CHEER) {
    fx = document.createElement('canvas'); fx.className = 'ix-fx'; fxc = fx.getContext('2d');
    const intro = stage.querySelector('.intro'); stage.insertBefore(fx, intro || null);
    cheerEl = document.createElement('div'); cheerEl.className = 'ix-cheer';
    cheerEl.innerHTML = '<span>📣 声援</span><span class="bar"><i></i></span><button type="button">👏 フレー！</button>';
    stage.appendChild(cheerEl);
    cheerEl.querySelector('button').addEventListener('click', () => burst(1));
  }
  function burst(k) {
    cheer = Math.min(1, cheer + .35 * k); cheerCount++;
    const w = fx.clientWidth, h = fx.clientHeight;
    for (let i = 0; i < 6 + 6 * k; i++) hearts.push({ x: w * (.15 + Math.random() * .7), y: h * (.95 + Math.random() * .1), vx: (Math.random() - .5) * 40,
      vy: -(h * .25 + Math.random() * h * .3), life: 0, max: 1.6 + Math.random(), s: (14 + Math.random() * 18) * w / 1000 + 10, c: ['💖', '✨', '💗', '⭐', '🩷'][i % 5] });
  }
  function drawFx(dt) {
    const r = devicePixelRatio || 1, w = fx.clientWidth, h = fx.clientHeight;
    if (fx.width !== Math.round(w * r)) { fx.width = Math.round(w * r); fx.height = Math.round(h * r); }
    fxc.setTransform(r, 0, 0, r, 0, 0); fxc.clearRect(0, 0, w, h);
    if (cheer > .02) {   // penlight glow rising from the crowd
      const g = fxc.createLinearGradient(0, h, 0, h * .55);
      g.addColorStop(0, `rgba(255,120,190,${.35 * cheer})`); g.addColorStop(1, 'rgba(255,120,190,0)');
      fxc.fillStyle = g; fxc.fillRect(0, h * .55, w, h * .45);
    }
    fxc.textAlign = 'center';
    hearts = hearts.filter((p) => (p.life += dt) < p.max);
    for (const p of hearts) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy *= .985;
      fxc.globalAlpha = Math.min(1, (p.max - p.life) / .5, p.life / .15); fxc.font = `${p.s}px sans-serif`; fxc.fillText(p.c, p.x, p.y);
    }
    fxc.globalAlpha = 1;
  }

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
    const head = (tag) => `<div class="ix-tag">${g.tag || tag}</div><div class="ix-line">${ja}</div><div class="ix-en">${en}</div>`;
    if (g.kind === 'blow') {
      card.innerHTML = `${head('🌬 あなたの番 · Your turn')}<div class="ix-gauge"><i></i><b>熱い · HOT</b></div>
        <div class="ix-how">${hasMic ? 'マイクに「ふーっ」と息を吹きかけて · Blow into the mic — feel the cool on both ears' : 'ボタンを長押しして「ふーっ」 · Press and hold to blow'}</div>
        <div class="ix-row">${meter}${hasMic ? '' : '<button class="ix-btn big" data-a="hold" type="button">🌬 ふーっ</button>'}${skip}</div><i class="ix-timer"></i>`;
    } else if (g.kind === 'choice') {
      card.innerHTML = `${head(g.hold ? '🎧 感じてみて · Feel it' : '❓ あなたの番 · Your turn')}
        ${g.hold ? '<div class="ix-how">耳で感じて、選んでね · Feel it on your ears, then choose</div>' : ''}
        <div class="ix-row">${g.options.map((o, i) => `<button class="ix-btn opt" data-a="opt" data-i="${i}" type="button">${o}</button>`).join('')}</div>
        <div class="ix-row">${skip}</div><i class="ix-timer"></i>`;
    } else if (g.kind === 'toast') {
      const how = g.how || ['声に出して乾杯！ または グラスをタップ · Say it — or tap the glass', 'グラスをタップして乾杯！ · Tap the glass to toast'];
      card.innerHTML = `${head(`${g.icon || '🥂'} あなたの番 · Your turn`)}<div class="ix-how">${hasMic ? how[0] : how[1]}</div>
        <div class="ix-row">${meter}<button class="ix-btn big" data-a="go" type="button">${g.btn || '🥂 乾杯！'}</button>${skip}</div><i class="ix-timer"></i>`;
    } else {
      const how = g.how ? `${g.how[0]} · ${g.how[1]}` : g.sub ? '声に出して読んでください · Read it aloud' : '声に出して言ってみて · Say it aloud';
      card.innerHTML = `${head(g.sub ? '🎙 あなたのセリフ · Your line' : '🎙 あなたの番 · Your turn')}
        <div class="ix-how">${hasMic ? how : asking ? 'マイクを許可してください · Allow the microphone (or tap to continue)' : '声に出して言ったら、タップ · Say it aloud, then tap'}</div>
        <div class="ix-row">${meter}${hasMic ? '' : '<button class="ix-btn big" data-a="go" type="button">▶ 言いました · Said it</button>'}${skip}</div><i class="ix-timer"></i>`;
    }
    card.addEventListener('click', (e) => {
      const b = e.target.closest('[data-a]'), a = b?.dataset.a;
      if (a === 'skip') finish(false); else if (a === 'go') finish(true); else if (a === 'opt') finish(true, +b.dataset.i);
    });
    const hold = card.querySelector('[data-a="hold"]');
    if (hold) {
      const on = (v) => (e) => { e.preventDefault(); if (cur) { cur.holding = v; hold.classList.toggle('holding', v); } };
      hold.addEventListener('pointerdown', on(true)); for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) hold.addEventListener(ev, on(false));
    }
    stage.appendChild(card);
  }
  function pop(ja, en) {
    const d = document.createElement('div'); d.className = 'ix-done';
    d.innerHTML = `${ja}${en ? `<small>${en}</small>` : ''}`; stage.appendChild(d); setTimeout(() => d.remove(), 1150);
  }
  function finish(ok, pick) {
    if (!cur) return;
    const { g } = cur; cur = null; card?.remove(); card = null; stage.classList.remove('ix-wait');
    let wait = 0;
    if (ok) {
      wait = 450;
      if (g.kind === 'choice') {
        wait = 900;
        if (g.answer != null) (pick === g.answer ? pop('正解！', 'Correct!') : pop('ざんねん…', 'Not quite — listen!'));
        else if (g.fb) pop(...g.fb[pick]);
      } else pop(g.done || (g.kind === 'toast' ? '乾杯！' : g.kind === 'blow' ? 'ちょうどいい！' : 'いいね！'), g.kind === 'blow' ? 'Just right!' : g.kind === 'read' ? 'Nice!' : '');
    }
    setTimeout(() => { if (Math.abs(media.currentTime - g.resume) > .05) media.currentTime = g.resume; lastT = g.resume; media.play().catch(() => {}); }, wait);
  }

  // ---------------------------------------------------------------- per frame (called by demo.js)
  function tick(t, m) {
    if (m) media = m;
    const n = performance.now(), dt = Math.min(.1, (n - lastNow) / 1000); lastNow = n;
    const playing = !media.paused && !media.ended;
    if (CHEER) {
      const lv = enabled && playing ? level() : 0, loud = lv > Math.max(.03, floor * 4);
      if (!loud) floor = floor * .97 + lv * .03;
      if (loud && !wasLoud) burst(.6);
      if (loud && Math.random() < dt * 6) burst(.25);
      wasLoud = loud;
      cheer = Math.max(0, cheer - dt * .35);
      if (enabled) drawFx(dt);
      const bar = cheerEl.querySelector('.bar i'); bar.style.width = `${cheer * 100}%`;
      if (enabled && t > 146 && cheerCount > 0 && !thanked) { thanked = true; pop(`声援ありがとう！ ×${cheerCount}`, 'Thanks for cheering!'); }
      return enabled && playing ? { waiting: false, boost: cheer } : null;
    }
    if (!cur) {
      if (enabled && playing && !window.MoHeatScrubbing && t > lastT && t - lastT < .6) {
        const g = gates.find((x) => !fired.has(x) && lastT < x.t && t >= x.t);
        if (g) start(g);
      }
      if (t < lastT - .3) for (const x of gates) if (x.t > t + .2) fired.delete(x);   // jumped back: re-arm the gates ahead
      lastT = t;
      if (!cur) return null;
    }
    if (!media.paused) { cur = null; card?.remove(); card = null; stage.classList.remove('ix-wait'); return null; }   // ▶ pressed: skip
    const c = cur, g = c.g, waited = (n - c.t0) / 1000;
    const lv = g.kind === 'choice' ? 0 : level(), loud = lv > Math.max(.018, floor * 3.2);
    if (!loud) floor = floor * .97 + lv * .03;
    const bars = card?.querySelectorAll('.ix-mic i');
    if (bars) bars.forEach((b, i) => { const on = lv * 9 > (i + 1) / 8; b.style.height = `${on ? 30 + 70 * Math.min(1, lv * 9 - i / 8) : 15}%`; b.style.opacity = on ? 1 : .35; });
    const timer = card?.querySelector('.ix-timer'); if (timer) timer.style.width = `${Math.max(0, 1 - waited / GIVE_UP) * 100}%`;
    let th = null, hold = 0;
    if (g.kind === 'blow') {
      const blowing = c.holding || lv > Math.max(.035, floor * 5);
      c.b += ((blowing ? 1 : 0) - c.b) * Math.min(1, dt * 6);
      c.blow = Math.min(BLOW_NEED, c.blow + (blowing ? dt : 0));
      const heat = 1 - c.blow / BLOW_NEED, gi = card?.querySelector('.ix-gauge i'), gb = card?.querySelector('.ix-gauge b');
      if (gi) gi.style.width = `${heat * 100}%`;
      if (gb) gb.textContent = heat > .5 ? '熱い · HOT' : heat > 0 ? 'もう少し · almost' : 'OK';
      if (c.b > .03) th = { Lc: .85 * c.b, Rc: .85 * c.b, Lh: 0, Rh: 0 };   // your breath: cool on both ears
      if (heat <= 0 && !c.done) { c.done = true; setTimeout(() => cur === c && finish(true), 250); }
    } else if (g.kind === 'choice') {
      if (g.hold) hold = waited < HOLD * .6 ? 1 : Math.max(0, 1 - (waited - HOLD * .6) / (HOLD * .4));   // keep the current thermal on, then fade
    } else if (micState === 'on') {
      if (loud) { c.speech += dt; c.silence = 0; if (c.speech > .25) c.heard = true; } else c.silence += dt;
      const len = (g.sub ? g.sub.ja : (g.what || [''])[0]).length;
      const need = g.kind === 'toast' ? .25 : Math.min(1.2, .35 + len * .04);
      if (c.heard && c.speech >= need && c.silence > (g.kind === 'toast' ? .15 : .55) && !c.done) { c.done = true; finish(true); }
    }
    if (waited > GIVE_UP && !c.done) { c.done = true; finish(false); }
    return { waiting: true, th, hold };
  }
  // thermal the player should send: your breath overrides; a held choice keeps the frozen frame's thermal; cheering adds warmth
  function out(th, ix) {
    if (!ix) return { th, live: null };
    if (ix.th) return { th: ix.th, live: true };
    if (ix.hold > 0) return { th: { Lc: th.Lc * ix.hold, Rc: th.Rc * ix.hold, Lh: th.Lh * ix.hold, Rh: th.Rh * ix.hold }, live: true };
    if (ix.boost > 0) { const k = 1 + .3 * ix.boost; return { th: { ...th, Lh: Math.min(1, th.Lh * k), Rh: Math.min(1, th.Rh * k) }, live: null }; }   // heat only where it already is: no new same-ear conflict
    return { th, live: ix.waiting ? false : null };
  }
  window.MoHeatInteract = { tick, out, gates };
  sync();
})();
