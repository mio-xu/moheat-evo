// MoHeatIntro — the 30-second thermal intro (TASKS #50 ① + #52 ⑦ + #54; DEMO_DESIGN_GUIDE §7.4 "展示模式"). Used by the kiosk
// (kiosk/index.html, every new visitor) and by the stand-alone page kiosk/intro.html (anyone, outside kiosk mode).
//   0 opening sting (2.4 s): MoHeat Evo logo, a cold → warm sweep across both ears (also confirms the device works)
//   1 put the headset on (L on the left ear)          2 left · warm            3 right · cool
//   4 fast hot ↔ cold switch (both ears)               5 cool + warm on the SAME ear (DUAL)
//   6 "is the intensity comfortable?" softer / just right / stronger (warm sample at the chosen level) → done
// Skip is always there. Text: en / ja / zh (+ ko falls back to en until a column is added). Thermal: old per-ear commands
// (LH / RH / LC / RC, one mode per ear) except step 5 (DUAL LC.. LH.. RC.. RH..). Levels scale with the visitor's intensity k:
// heat PWM = 150·k, cool PWM = 35 + 45·k (35–80, never colder than the device's own range).
//   const intro = MoHeatIntro.mount(el, { send(line), level: .5, cap: .8, lang: () => 'en', onDone({ level, skipped }) });
//   intro.start(); intro.skip(); intro.stop();  — everything stops (device "stop") on done, skip and stop.
(() => {
  if (window.MoHeatIntro) return;
  const T = {
    stingSub: { en: 'Binaural ASMR × thermal haptics', ja: '立体音響 ASMR × 温冷ハプティクス', zh: '立体声 ASMR × 冷热触感' },
    wear: { en: 'Put the headset on', ja: 'ヘッドホンをつけてください', zh: '请戴上耳机' },
    vol: { en: 'Set the volume', ja: '音量を合わせてください', zh: '调节音量' },
    volSub: { en: 'Slide until the chime is clearly audible but soft.', ja: 'チャイムが、はっきり・やさしく聞こえるように。', zh: '拖动滑块，让提示音清楚又柔和。' },
    wearSub: { en: 'L on your left ear, R on your right. Then just relax.', ja: 'L を左耳、R を右耳に。あとはリラックス。', zh: 'L 戴左耳，R 戴右耳，然后放松就好。' },
    ready: { en: 'It’s on', ja: 'つけました', zh: '戴好了' },
    left: { en: 'Left ear · warm', ja: '左耳 · あたたかい', zh: '左耳 · 暖' },
    leftSub: { en: 'A gentle warmth on your LEFT ear.', ja: '左耳に、じんわりとした温かさ。', zh: '左耳会感到一阵温暖。' },
    right: { en: 'Right ear · cool', ja: '右耳 · つめたい', zh: '右耳 · 凉' },
    rightSub: { en: 'Now a fresh coolness on your RIGHT ear.', ja: 'こんどは右耳に、ひんやり。', zh: '现在右耳会有一丝清凉。' },
    swap: { en: 'Hot ↔ cold, fast', ja: '温 ↔ 冷、すばやく', zh: '冷热快速切换' },
    swapSub: { en: 'Both ears flip between warm and cool.', ja: '両耳が、温かい ↔ 冷たいを行き来します。', zh: '两只耳朵在暖和凉之间来回切换。' },
    dual: { en: 'Cool + warm on the same ear', ja: '同じ耳に、冷たいと温かいを同時に', zh: '同一只耳朵，冷和热同时' },
    dualSub: { en: 'Like a warm voice in cool night air: MoHeat Evo can do both at once.', ja: '夜の冷たい空気の中の、温かい声。MoHeat Evo は両方を同時に出せます。', zh: '就像凉夜里耳边温暖的声音：MoHeat Evo 能同时做到。' },
    level: { en: 'Is the intensity comfortable?', ja: '強さはちょうどいいですか？', zh: '强度舒服吗？' },
    levelSub: { en: 'You can change it any time during the demo.', ja: 'デモの途中でもいつでも変えられます。', zh: '体验中也可以随时调整。' },
    softer: { en: 'Softer', ja: '弱く', zh: '弱一点' }, ok: { en: 'Just right', ja: 'ちょうどいい', zh: '刚刚好' }, stronger: { en: 'Stronger', ja: '強く', zh: '强一点' },
    skip: { en: 'Skip intro', ja: 'スキップ', zh: '跳过' }, L: { en: 'L', ja: '左', zh: '左' }, R: { en: 'R', ja: '右', zh: '右' },
    noDev: { en: 'No headset connected: the colours show what you would feel.', ja: 'ヘッドホン未接続：色で温冷を表示しています。', zh: '未连接耳机：用颜色显示你会感受到的冷热。' },
  };
  const css = `
  .mi { --ff: Inter, "Noto Sans JP", "PingFang SC", system-ui, sans-serif; position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2.2vmin; text-align: center; color: #f6f0fa;
    font-family: Inter, "Noto Sans JP", "PingFang SC", system-ui, sans-serif; padding: 4vmin; box-sizing: border-box; }
  .mi h2 { margin: 0; font: 800 clamp(22px, 5vmin, 54px)/1.15 var(--ff); letter-spacing: .01em; }
  .mi p.sub { margin: 0; max-width: 34em; font: 500 clamp(14px, 2.4vmin, 24px)/1.45 var(--ff); color: #d6cbe2; min-height: 2.9em; }
  .mi .head { position: relative; width: min(46vmin, 380px); aspect-ratio: 1.45; }
  .mi .head svg { position: absolute; inset: 0; width: 100%; height: 100%; }
  .mi .ear { position: absolute; top: 50%; width: 26%; aspect-ratio: 1; border-radius: 50%; transform: translate(-50%, -50%); display: grid; place-items: center;
    font: 800 clamp(14px, 3vmin, 30px)/1 var(--ff); color: rgba(255,255,255,.75); background: rgba(255,255,255,.08); border: 2px solid rgba(255,255,255,.25); transition: background .5s, box-shadow .5s, border-color .5s; }
  .mi .ear.l { left: 9%; } .mi .ear.r { left: 91%; }
  .mi .ear.warm { background: radial-gradient(circle, #ffb070 0%, #ff7a3a 55%, #d8461c 100%); border-color: #ffc89a; box-shadow: 0 0 6vmin 1vmin rgba(255,120,50,.65); color: #fff; }
  .mi .ear.cool { background: radial-gradient(circle, #bfe9ff 0%, #5cb8ff 55%, #2a7ee0 100%); border-color: #cdeeff; box-shadow: 0 0 6vmin 1vmin rgba(80,170,255,.65); color: #fff; }
  .mi .ear.dual { background: conic-gradient(from 200deg, #5cb8ff 0 50%, #ff7a3a 50% 100%); border-color: #fff; box-shadow: -2vmin 0 5vmin rgba(80,170,255,.55), 2vmin 0 5vmin rgba(255,120,50,.55); color: #fff; }
  .mi .logo { font: 800 clamp(34px, 9vmin, 110px)/1 var(--ff); letter-spacing: -.02em; background: linear-gradient(90deg, #6cc4ff 0%, #6cc4ff var(--p, 0%), #ff8a4a calc(var(--p, 0%) + 18%), #ff8a4a 100%);
    -webkit-background-clip: text; background-clip: text; color: transparent; }
  .mi .logo span { font-weight: 300; }
  .mi .row { display: flex; gap: 1.6vmin; flex-wrap: wrap; justify-content: center; }
  .mi button { font: 700 clamp(15px, 2.6vmin, 26px)/1 var(--ff); min-height: 56px; padding: 0 1.4em; border-radius: 999px; border: 2px solid rgba(255,255,255,.35); background: rgba(255,255,255,.06); color: #fff; cursor: pointer; }
  .mi button.go { background: linear-gradient(135deg, #ffd58a, #ff9f6e); color: #2a1606; border-color: transparent; }
  .mi .lvl { font: 700 clamp(13px, 2vmin, 20px)/1 var(--ff); color: #ffd58a; letter-spacing: .1em; }
  .mi .lvl i { display: inline-block; width: 1.6em; height: .55em; margin: 0 .12em; border-radius: 3px; background: rgba(255,255,255,.18); vertical-align: middle; }
  .mi .lvl i.on { background: linear-gradient(90deg, #ffb070, #ff7a3a); }
  .mi .dots { position: absolute; bottom: 3.2vmin; left: 50%; transform: translateX(-50%); display: flex; gap: 8px; }
  .mi .dots b { width: 9px; height: 9px; border-radius: 50%; background: rgba(255,255,255,.22); } .mi .dots b.on { background: #ffd58a; }
  .mi .skip { position: absolute; right: 3vmin; bottom: 2.2vmin; font-size: clamp(14px, 2vmin, 20px); min-height: 48px; border-color: rgba(255,255,255,.2); color: #cfc3dc; }
  .mi .nodev { position: absolute; left: 3vmin; bottom: 3vmin; max-width: 40%; text-align: left; font: 500 clamp(11px, 1.6vmin, 15px)/1.35 var(--ff); color: #a99ab8; }
  .mi .vol { display: flex; align-items: center; gap: 3vmin; } .mi .vol svg { width: clamp(64px, 12vmin, 120px); }
  .mi .vol input { width: min(56vmin, 520px); height: 56px; accent-color: #ffd58a; cursor: pointer; }
  .mi .bar { width: min(50vmin, 420px); height: 6px; border-radius: 3px; background: rgba(255,255,255,.12); overflow: hidden; }
  .mi .bar i { display: block; height: 100%; width: 0; background: #ffd58a; transition: width linear; }
  @media (prefers-reduced-motion: reduce) { .mi .ear { transition: none; } }`;
  const STEPS = [
    { id: 'sting', s: 2.4 }, { id: 'wear', s: 6 }, { id: 'volume', s: 9 }, { id: 'left', s: 4 }, { id: 'right', s: 4 }, { id: 'swap', s: 6 }, { id: 'dual', s: 5 }, { id: 'level', s: 12 },
  ];

  function mount(el, o = {}) {
    if (!document.getElementById('mi-css')) { const st = document.createElement('style'); st.id = 'mi-css'; st.textContent = css; document.head.appendChild(st); }
    const send = (line) => { try { o.send?.(line); } catch {} log.push(line); };
    const log = [];
    const lang = () => (o.lang ? o.lang() : 'en');
    const tx = (k) => T[k][lang()] || T[k].en;
    let volume = Math.max(0, Math.min(1, o.volume ? o.volume() : .7)); const vol = () => volume;
    const cap = Math.max(.2, Math.min(1, o.cap ?? 1));
    let k = Math.min(cap, Math.max(.2, o.level ?? .5)), i = -1, timers = [], over = false, ac = null;
    const H = () => Math.round(150 * k), C = () => Math.round(35 + 45 * k);
    const at = (ms, fn) => timers.push(setTimeout(fn, ms));
    const clear = () => { timers.forEach((x) => { clearTimeout(x); clearInterval(x); }); timers = []; };
    // a soft panned tone confirms left / right by ear too (no tone in the sting: the logo is enough)
    const tone = (pan, f = 523) => {
      try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); ac.resume?.();
        const g = ac.createGain(), os = ac.createOscillator(), p = ac.createStereoPanner ? ac.createStereoPanner() : null; os.type = 'sine'; os.frequency.value = f;
        g.gain.setValueAtTime(0, ac.currentTime); g.gain.linearRampToValueAtTime(.0001 + .2 * vol(), ac.currentTime + .05); g.gain.exponentialRampToValueAtTime(.0001, ac.currentTime + 1.2);
        os.connect(g); if (p) { p.pan.value = pan; g.connect(p); p.connect(ac.destination); } else g.connect(ac.destination); os.start(); os.stop(ac.currentTime + 1.3); } catch {}
    };
    el.innerHTML = `<div class="mi" role="dialog" aria-live="polite"><div class="stage-a"></div><div class="dots">${STEPS.map(() => '<b></b>').join('')}</div>
      <button type="button" class="skip"></button><p class="nodev"></p></div>`;
    const root = el.firstElementChild, A = root.querySelector('.stage-a');
    root.querySelector('.skip').addEventListener('click', () => finish(true));
    const head = () => `<div class="head"><svg viewBox="0 0 145 100" aria-hidden="true"><ellipse cx="72.5" cy="52" rx="34" ry="40" fill="rgba(255,255,255,.07)" stroke="rgba(255,255,255,.3)" stroke-width="1.5"/>
      <path d="M22 44 Q22 6 72.5 6 Q123 6 123 44" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="4" stroke-linecap="round"/></svg>
      <span class="ear l">${tx('L')}</span><span class="ear r">${tx('R')}</span></div>`;
    const ears = (l, r) => { const [a, b] = A.querySelectorAll('.ear'); if (a) a.className = `ear l ${l || ''}`; if (b) b.className = `ear r ${r || ''}`; };
    const bar = (s) => `<div class="bar"><i style="transition-duration:${s}s"></i></div>`;
    const runBar = () => requestAnimationFrame(() => requestAnimationFrame(() => { const b = A.querySelector('.bar i'); if (b) b.style.width = '100%'; }));
    const lvl = () => { const n = Math.round(k * 10); return `<div class="lvl">${Array.from({ length: 10 }, (_, j) => `<i class="${j < n ? 'on' : ''}"></i>`).join('')}</div>`; };
    const paintChrome = () => {
      root.querySelector('.skip').textContent = tx('skip');
      root.querySelectorAll('.dots b').forEach((b, j) => b.classList.toggle('on', j <= i));
      root.querySelector('.nodev').textContent = o.connected && !o.connected() ? tx('noDev') : '';
    };
    function show(n) {
      clear(); i = n; if (i >= STEPS.length) return finish(false);
      const st = STEPS[i]; paintChrome(); root.dataset.step = st.id;
      const next = () => show(i + 1);
      if (st.id === 'sting') {
        A.innerHTML = `<div class="logo" style="--p:0%">MoHeat <span>Evo</span></div>${head()}<p class="sub">${tx('stingSub')}</p>`;
        const logo = A.querySelector('.logo');
        send(`LC${C()} RC${C()}`); ears('cool', 'cool');
        let p = 0; const sweep = setInterval(() => { p = Math.min(100, p + 4); logo.style.setProperty('--p', `${p}%`); if (p >= 100) clearInterval(sweep); }, 60); timers.push(sweep);
        at(1000, () => { send(`LH${H()} RC${C()}`); ears('warm', 'cool'); });
        at(1600, () => { send(`LH${H()} RH${H()}`); ears('warm', 'warm'); });
        at(st.s * 1000, () => { send('stop'); next(); });
      } else if (st.id === 'wear') {
        send('stop');
        A.innerHTML = `<h2>${tx('wear')}</h2>${head()}<p class="sub">${tx('wearSub')}</p><div class="row"><button type="button" class="go">${tx('ready')}</button></div>`;
        A.querySelector('.go').addEventListener('click', next);
        at(st.s * 1000, next);
      } else if (st.id === 'volume') {   // a big slider + a soft chime every second (pictogram, readable without sound)
        A.innerHTML = `<h2>${tx('vol')}</h2><div class="vol"><svg viewBox="0 0 64 48" aria-hidden="true"><path d="M6 17h10l14-11v36L16 31H6z" fill="#fff"/><path d="M38 14q8 10 0 20M45 8q14 16 0 32" stroke="#ffd58a" stroke-width="4" fill="none" stroke-linecap="round"/></svg>
          <input type="range" min="0" max="100" value="${Math.round(volume * 100)}" aria-label="${tx('vol')}"></div><p class="sub">${tx('volSub')}</p><div class="row"><button type="button" class="go">✓</button></div>`;
        const r = A.querySelector('input'); r.addEventListener('input', () => { volume = +r.value / 100; o.onVolume?.(volume); clearTimeout(auto); auto = setTimeout(next, st.s * 1000); timers.push(auto); });
        A.querySelector('.go').addEventListener('click', next);
        const beep = () => tone(0, 587); beep(); const iv = setInterval(beep, 1100); timers.push(iv);
        let auto = setTimeout(next, st.s * 1000); timers.push(auto);
      } else if (st.id === 'left' || st.id === 'right') {
        const L = st.id === 'left';
        A.innerHTML = `<h2>${tx(st.id)}</h2>${head()}<p class="sub">${tx(st.id + 'Sub')}</p>${bar(st.s)}`; runBar();
        send(L ? `LH${H()} RH0` : `LH0 RC${C()}`); ears(L ? 'warm' : '', L ? '' : 'cool'); tone(L ? -1 : 1, L ? 440 : 660);
        at(st.s * 1000, next);
      } else if (st.id === 'swap') {
        A.innerHTML = `<h2>${tx('swap')}</h2>${head()}<p class="sub">${tx('swapSub')}</p>${bar(st.s)}`; runBar();
        const flips = 4; for (let f = 0; f < flips; f++) at(f * st.s * 1000 / flips, () => { const w = f % 2 === 0; send(w ? `LH${H()} RH${H()}` : `LC${C()} RC${C()}`); ears(w ? 'warm' : 'cool', w ? 'warm' : 'cool'); });
        at(st.s * 1000, next);
      } else if (st.id === 'dual') {
        A.innerHTML = `<h2>${tx('dual')}</h2>${head()}<p class="sub">${tx('dualSub')}</p>${bar(st.s)}`; runBar();
        send(`DUAL LC${C()} LH${H()} RC${C()} RH${H()}`); ears('dual', 'dual');
        at(st.s * 1000, () => { send('stop'); next(); });
      } else if (st.id === 'level') {
        const paint = () => {
          A.innerHTML = `<h2>${tx('level')}</h2>${head()}${lvl()}<div class="row"><button type="button" data-d="-1">${tx('softer')}</button><button type="button" class="go" data-d="0">${tx('ok')}</button><button type="button" data-d="1">${tx('stronger')}</button></div><p class="sub">${tx('levelSub')}</p>`;
          ears('warm', 'warm'); send(`LH${H()} RH${H()}`);
          A.querySelector('.row').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; const d = +b.dataset.d;
            if (!d) return finish(false);
            k = Math.round(Math.min(cap, Math.max(.2, k + d * .15)) * 100) / 100; o.onLevel?.(k); clear(); paint(); at(st.s * 1000, () => finish(false)); });
        };
        paint(); at(st.s * 1000, () => finish(false));
      }
    }
    function finish(skipped) {
      if (over) return; over = true; clear(); send('stop');
      o.onDone?.({ level: k, skipped, step: STEPS[i]?.id || 'end' });
    }
    return { start: () => { over = false; show(0); }, skip: () => finish(true), stop: () => { over = true; clear(); send('stop'); },
      get step() { return STEPS[i]?.id; }, get level() { return k; }, log, repaint: () => { if (i >= 0 && !over) show(i); } };
  }
  window.MoHeatIntro = { mount, T, STEPS };
})();
