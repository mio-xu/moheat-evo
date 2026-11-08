// The unified UI shell for every MoHeat Evo demo (DEMO_DESIGN_GUIDE §2 + §7.3 "统一外壳", user 2026-11-08). Load it BEFORE main.js
// (right after device.js):   <script src="../../shared/shell.js?v=1"></script>   — it has to wrap the clock before the demo starts.
// What every demo gets from it, with no per-demo code:
//   · PURE listening mode (default) / INTERACTIVE mode, picked on the cover (and on the end cover). Pure: no microphone
//     (shared/voice.js reads MoHeatPlay.pure), every choice / action / hold resolves itself after a short natural pause on the
//     default answer (the first button). window.MoHeatPlay = { pure, mode }, event 'moheat:playmode'.
//   · Pause: Space or a tap on the picture while the story plays — the demo's clock, timers, animation frames, Web Audio and
//     <audio>/<video> all stop, the device gets "stop" and nothing else until resume.
//   · Thermal quick on / off on the stage (next to the intensity slider's value), intensity remembered.
//   · ← / → keys and left / right swipes switch demos ONLY on the cover (before start / after the end), never during playback.
//   · Settings remembered (try / catch): mode, thermal on / off, intensity, subtitles on / off + size S / M / L, reduced motion.
//   · Loading veil until the page's art / voices / fonts are in; unified error toasts (device lost, mic denied, load failure).
//   · Subtitles on / off + size, reduced motion (also prefers-reduced-motion: html.reduce-motion, MoHeatPlay.reduced), visible focus.
// Per-demo hooks are optional: window.MoHeatShell.chapters = [{ t: seconds | step index, ja, en, zh }] + .seek(i) for the seek bar.
(() => {
  if (window.MoHeatShell) return;
  const SH = window.MoHeatShell = { chapters: null, current: null, seek: null };   // optional demo hooks (set before Start)
  const QS = new URLSearchParams(location.search), EXPORT = QS.has('cover') || QS.has('render') || QS.has('embed');
  const LS = { get(k, d) { try { const v = localStorage.getItem('moheat.' + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('moheat.' + k, JSON.stringify(v)); } catch {} } };
  const T = {   // shell texts: en / ja / zh (ko: add a column — subs.js LANGS decides which ones are offered)
    pure: ['Just listen', 'きくだけ', '纯聆听'], inter: ['Interactive', 'いっしょに参加', '互动'],
    pureHint: ['plays through by itself · no mic', '操作なしで最後まで · マイクなし', '无需操作，自动播完 · 不用麦克风'],
    interHint: ['answer, tap and hold · voice too', '答える・タップ・長押し · 声でも', '回答、点按、长按 · 也可用声音'],
    paused: ['Paused — Space or tap to resume', '一時停止中 — Space / タップで再開', '已暂停 — 按空格或点按继续'],
    loading: ['Loading…', '読み込み中…', '加载中…'], heatOn: ['Thermal on', '温冷 ON', '温冷 开'], heatOff: ['Thermal off', '温冷 OFF', '温冷 关'],
    subs: ['Subtitles', '字幕', '字幕'], off: ['off', 'オフ', '关'], motion: ['Reduce motion', '動きを減らす', '减少动态'],
    devLost: ['Device disconnected — plug it back in and press Connect.', 'デバイスが切断されました — つなぎ直して Connect を押してください。', '设备已断开 — 请重新连接后点 Connect。'],
    micDenied: ['Microphone blocked — answers work by tapping; allow the mic in the address bar to speak.', 'マイクが使えません — タップで答えられます。話すにはアドレスバーで許可してください。', '麦克风被拒绝 — 可以点按回答；要用声音请在地址栏允许麦克风。'],
    loadFail: ['Some files did not load — check the connection and reload the page.', '一部のファイルを読み込めませんでした — 接続を確かめて再読み込みしてください。', '部分文件加载失败 — 请检查网络后刷新页面。'],
  };
  const L = () => { const l = window.MoHeatSub?.lang || 'en'; return l === 'ja' ? 1 : l === 'zh' ? 2 : 0; };
  const t = (k) => T[k][L()] || T[k][0];

  // ---------------------------------------------------------------- the clock: pause freezes time for the demo
  const real = { now: performance.now.bind(performance), dnow: Date.now, st: setTimeout.bind(window), ct: clearTimeout.bind(window),
    raf: requestAnimationFrame.bind(window) };
  // virtual time = vbase + (real − rbase) × rate; rate 0 = paused, > 1 = fast-forward to a chapter (seek)
  let paused = false, warp = 1, vbase = real.now(), rbase = vbase;
  const rate = () => (paused ? 0 : warp);
  const vnow = () => vbase + (real.now() - rbase) * rate();
  const rebase = (fn) => { vbase = vnow(); rbase = real.now(); fn(); };
  const timers = new Map(); let tid = 1e6, wake = 0;
  const pump = () => {   // fire the virtual timers that are due, then sleep until the next one
    wake = 0; if (!rate()) return;
    const n = vnow(); let next = Infinity;
    for (const [id, tm] of [...timers]) {
      if (!timers.has(id)) continue;
      if (tm.at <= n) { if (tm.every != null) tm.at = n + tm.every; else timers.delete(id); try { tm.fn(...tm.args); } catch (e) { real.st(() => { throw e; }); } }
      if (timers.has(id)) next = Math.min(next, timers.get(id).at);
    }
    if (next < Infinity) wake = real.st(pump, Math.max(0, (next - vnow()) / rate()));
  };
  const arm = () => { if (wake) real.ct(wake); wake = real.st(pump, 0); };
  if (!EXPORT) {
    performance.now = vnow;
    const d0 = real.dnow() - real.now(); Date.now = () => Math.round(d0 + vnow());
    window.setTimeout = (fn, ms = 0, ...args) => { if (typeof fn !== 'function') return real.st(fn, ms); const id = ++tid; timers.set(id, { fn, args, at: vnow() + (+ms || 0) }); arm(); return id; };
    window.setInterval = (fn, ms = 0, ...args) => { const id = ++tid; timers.set(id, { fn, args, every: Math.max(4, +ms || 0), at: vnow() + Math.max(4, +ms || 0) }); arm(); return id; };
    window.clearTimeout = window.clearInterval = (id) => { if (timers.has(id)) timers.delete(id); else real.ct(id); };
    const held = [];
    window.requestAnimationFrame = (cb) => real.raf(() => { if (paused) held.push(cb); else cb(vnow()); });
    window.MoHeatShell_resumeFrames = () => { const h = held.splice(0); h.forEach((cb) => real.raf(() => cb(vnow()))); };
  }
  const ctxs = new Set(), masters = new WeakMap(), sources = new Set();   // Web Audio: suspended on pause, sped up + muted while seeking
  for (const k of ['AudioContext', 'webkitAudioContext']) {
    const A = window[k]; if (!A) continue;
    window[k] = class extends A { constructor(...a) { super(...a); ctxs.add(this); } };
  }
  if (window.AudioNode && !EXPORT) {
    const connect = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function (dst, ...a) {
      if (dst instanceof AudioDestinationNode) { let m = masters.get(dst.context); if (!m) { m = dst.context.createGain(); connect.call(m, dst); masters.set(dst.context, m); m.gain.value = warp > 1 ? 0 : 1; } return connect.call(this, m, ...a); }
      return connect.call(this, dst, ...a);
    };
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...a) { sources.add(this); this.addEventListener('ended', () => sources.delete(this)); if (warp > 1) this.playbackRate.value = warp; return start.apply(this, a); };
  }
  const setWarp = (w) => rebase(() => {
    warp = w; arm();
    ctxs.forEach((c) => { const m = masters.get(c); if (m) m.gain.value = w > 1 ? 0 : 1; });
    sources.forEach((n) => { try { n.playbackRate.value = w; } catch {} });
    document.querySelectorAll('audio, video').forEach((m) => { try { m.playbackRate = Math.min(w, 16); m.muted = w > 1 ? true : m.dataset.shMuted === '1'; } catch {} });
    if (w > 1) stopDevice();
  });
  const media = new Set();

  // ---------------------------------------------------------------- device: pause / thermal off = "stop" and nothing else
  let heat = LS.get('heat', true), devSend = new Set();
  const gate = () => !paused && heat;
  if (window.MoHeatDevice?.create) {
    const create = MoHeatDevice.create;
    MoHeatDevice.create = (...a) => { const inst = create(...a); const send = inst.send; devSend.add(send);
      inst.send = (line) => (gate() || /^stop$/i.test(line) ? send(line) : undefined); return inst; };
  }
  const stopDevice = () => devSend.forEach((s) => { try { s('stop'); } catch {} });

  // ---------------------------------------------------------------- mode
  let mode = QS.has('interactive') ? 'interactive' : QS.has('pure') ? 'pure' : LS.get('mode', 'pure');
  const Play = window.MoHeatPlay = { get mode() { return mode; }, get pure() { return mode === 'pure' && !QS.has('auto'); }, reduced: false };
  const setMode = (m) => { mode = m; LS.set('mode', m); document.documentElement.dataset.playmode = m; paint(); dispatchEvent(new CustomEvent('moheat:playmode', { detail: m })); };

  // pure mode: answer for the listener after a natural pause (the default = first button; holds are held)
  const SEL = '.stage .choices .ch, .stage .act .act-btn, .stage #micGate button, .stage .mic-gate button, .stage .chips .chip-c, .stage .ix-btn';
  const seen = new WeakMap();
  const vis = (e) => e.isConnected && e.offsetParent !== null && getComputedStyle(e).visibility !== 'hidden' && !e.disabled && e.getBoundingClientRect().width > 0;
  const playing = () => { const i = document.getElementById('intro'); return !!i && i.classList.contains('hidden'); };
  if (!EXPORT) setInterval(() => {
    if (!Play.pure || !playing()) return;
    const els = [...document.querySelectorAll(SEL)].filter(vis); if (!els.length) return;
    const e = els[0], n = vnow(); if (!seen.has(e)) { seen.set(e, n); return; }
    if (seen.get(e) < 0 || n - seen.get(e) < 2200) return;
    seen.set(e, -1);
    if (e.classList.contains('hold')) {
      const r = e.getBoundingClientRect(), o = { bubbles: true, pointerId: 7, pointerType: 'mouse', isPrimary: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, button: 0, buttons: 1 };
      e.dispatchEvent(new PointerEvent('pointerdown', o)); e.dispatchEvent(new MouseEvent('mousedown', o));
      setTimeout(() => { e.dispatchEvent(new PointerEvent('pointerup', { ...o, buttons: 0 })); e.dispatchEvent(new MouseEvent('mouseup', { ...o, buttons: 0 })); }, 3200);
    } else e.click();
  }, 300);

  // pure mode never opens the microphone, also for games that read the mic level themselves (blowing, calling): they get the
  // same answer as a denied mic and fall back to taps / their own timers
  if (navigator.mediaDevices?.getUserMedia && !EXPORT) {
    const gum = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = (c) => (Play.pure && c?.audio ? Promise.reject(new DOMException('pure listening mode', 'NotAllowedError')) : gum(c));
  }

  // ---------------------------------------------------------------- pause
  const pause = (on) => {
    if (on === paused || EXPORT) return;
    rebase(() => { paused = on; });
    if (on) { stopDevice(); ctxs.forEach((c) => c.state === 'running' && c.suspend().catch(() => {}));
      document.querySelectorAll('audio, video').forEach((m) => { if (!m.paused) { media.add(m); m.pause(); } }); }
    else { ctxs.forEach((c) => c.state === 'suspended' && c.resume().catch(() => {}));
      media.forEach((m) => m.play().catch(() => {})); media.clear(); window.MoHeatShell_resumeFrames?.(); arm(); }
    document.documentElement.classList.toggle('shell-paused', paused); paint();
  };

  // ---------------------------------------------------------------- chapters + seek bar
  // chapters: the demo's MoHeatShell.chapters (labels) + chapter() (current index), or — no code needed — its progress list #steps
  // (li.now = current; series.css hides the card). Seek: forward = fast-forward ×16 muted (choices take the default), back = restart + forward.
  // Pure mode: any chapter; interactive mode: back, or chapters already reached.
  let reached = 0, target = null, since = 0;
  const stepsLis = () => [...document.querySelectorAll('#steps li')];
  const chapters = () => SH.chapters || stepsLis().map((li) => ({ label: li.textContent.split(' · ')[0] }));
  const chapter = () => (SH.current ? SH.current() : stepsLis().findIndex((li) => li.classList.contains('now')));
  const seek = (i) => {
    if (!playing()) return; const cur = chapter();
    if (Play.mode === 'interactive' && i > reached) return;
    if (paused) pause(false);
    if (SH.seek) return SH.seek(i);
    since = real.now();
    if (i <= cur) { target = i; document.getElementById('startBtn')?.click(); if (i > 0) setWarp(16); else target = null; return; }   // back: from the top, then forward
    target = i; setWarp(16);
  };
  if (!EXPORT) setInterval(() => {   // follow the story: reached chapters, end of a seek, the bar
    if (!ui.bar) return;
    const cs = chapters(), cur = chapter(); if (playing() && cur > reached) reached = cur;
    if (target != null && real.now() - since > 700 && (cur >= target || !playing())) { target = null; setWarp(1); }
    if (ui.bar.dataset.n !== String(cs.length) || ui.bar.dataset.l !== String(L())) {
      ui.bar.dataset.n = cs.length; ui.bar.dataset.l = L();
      ui.bar.innerHTML = cs.map((c, k) => `<button type="button" data-i="${k}" title="${c.label}"><i>${'①②③④⑤⑥⑦⑧⑨⑩'[k] || k + 1}</i><span>${c.label}</span></button>`).join('');
    }
    ui.bar.hidden = !playing() || cs.length < 2 || FILM();
    [...ui.bar.children].forEach((b, k) => { b.classList.toggle('done', k < cur); b.classList.toggle('now', k === cur);
      b.disabled = Play.mode === 'interactive' && k > reached; });
  }, 250);
  addEventListener('moheat:playmode', () => { reached = Math.max(reached, chapter()); });
  document.addEventListener('click', (e) => { if (e.target.closest?.('#startBtn') && target == null) reached = 0; }, true);

  // ---------------------------------------------------------------- UI
  const css = `
  .intro .intro-actions:has(.sh-mode) { flex-wrap: wrap; }
  .sh-mode { display: flex; gap: .5cqw; justify-content: center; flex-basis: 100%; margin: .2cqw 0 0; position: relative; z-index: 5; }
  @container (max-width: 420px) { .sh-mode { flex-basis: auto; margin: 0; gap: 6px; } }
  .sh-mode button { font: 600 clamp(9px, 1cqw, 19px)/1.2 inherit; min-height: 2.6em; box-sizing: border-box; justify-content: center; padding: .45em 1em; border-radius: 999px; cursor: pointer; color: #f4eef8;
    border: 1px solid rgba(255,255,255,.4); background: rgba(10,8,16,.45); display: inline-flex; flex-direction: column; align-items: center; }
  .sh-mode button small { font-weight: 400; font-size: .72em; opacity: .8; }
  .sh-mode button[aria-pressed=true] { background: rgba(255,255,255,.92); color: #17121f; border-color: transparent; }
  body.cover-only .sh-mode { display: none; }
  @container (max-width: 620px) { .sh-mode button small { display: none; } .sh-mode button { font-size: max(11px, 2.6cqw); min-height: 44px; } }
  .sh-pause { position: absolute; inset: 0; z-index: 30; display: none; align-items: center; justify-content: center; background: rgba(6,6,12,.45);
    color: #fff; font: 600 clamp(12px, 1.6cqw, 26px) / 1.3 inherit; cursor: pointer; text-align: center; padding: 0 4cqw; }
  html.shell-paused .sh-pause { display: flex; }
  .sh-heat { position: absolute; z-index: 9; left: 1cqw; bottom: 1cqw; font: 600 clamp(9px, .95cqw, 16px)/1 inherit; padding: .45em .8em; border-radius: 999px;
    border: 1px solid rgba(255,255,255,.35); background: rgba(10,8,16,.5); color: #fff; cursor: pointer; }
  .sh-heat[aria-pressed=false] { opacity: .7; text-decoration: line-through; }
  .sh-bar { position: absolute; z-index: 9; left: 12cqw; right: 12cqw; bottom: .9cqw; display: flex; gap: .3cqw; }
  .sh-bar[hidden] { display: none; }
  .sh-bar button { flex: 1 1 0; min-width: 0; height: 2.2cqw; min-height: 18px; border: 0; border-radius: 99px; cursor: pointer; padding: 0 .6em; display: flex; align-items: center; gap: .4em;
    background: rgba(255,255,255,.16); color: rgba(255,255,255,.8); font: 600 clamp(8px, .8cqw, 14px)/1 inherit; overflow: hidden; white-space: nowrap; }
  .sh-bar button span { overflow: hidden; text-overflow: ellipsis; }
  .sh-bar button.done { background: rgba(255,255,255,.42); color: #fff; } .sh-bar button.now { background: rgba(255,214,120,.85); color: #241a08; }
  .sh-bar button:disabled { opacity: .45; cursor: not-allowed; }
  @container (max-width: 620px) { .sh-bar { left: 2cqw; right: 2cqw; } .sh-bar button span { display: none; } .sh-bar button { justify-content: center; height: 5cqw; } }
  .stage:has(.intro:not(.hidden)) .sh-heat { display: none; }
  .sh-veil { position: absolute; inset: 0; z-index: 40; display: flex; align-items: center; justify-content: center; background: #0b0a12; color: #d8d0e4;
    font: 500 clamp(11px, 1.3cqw, 22px)/1 inherit; transition: opacity .35s; }
  .sh-veil.gone { opacity: 0; pointer-events: none; }
  .sh-veil i { width: 1.1em; height: 1.1em; margin-right: .6em; border: 2px solid currentColor; border-right-color: transparent; border-radius: 50%; animation: shspin .8s linear infinite; }
  @keyframes shspin { to { transform: rotate(1turn); } }
  .sh-toast { position: fixed; left: 50%; bottom: 18px; transform: translateX(-50%); z-index: 99; max-width: min(92vw, 560px); padding: 12px 16px; border-radius: 12px;
    background: #2a1620; color: #ffe9ee; border: 1px solid #ff7a90; font: 500 14px/1.4 system-ui, sans-serif; box-shadow: 0 8px 30px rgba(0,0,0,.4); }
  .sh-set { display: flex; flex-wrap: wrap; gap: 6px 10px; align-items: center; margin-top: 8px; font-size: 12px; }
  .sh-set button { font: inherit; padding: 4px 9px; border-radius: 8px; border: 1px solid rgba(255,255,255,.25); background: transparent; color: inherit; cursor: pointer; min-height: 30px; }
  .sh-set button[aria-pressed=true] { background: rgba(255,255,255,.85); color: #17121f; }
  html[data-subs=off] .stage .subs { visibility: hidden !important; }
  html[data-subs=s] .stage .subs { font-size: 82%; } html[data-subs=l] .stage .subs { font-size: 125%; }
  html[data-subs=s] .stage .subs :is(.ja, .en) { transform-origin: bottom center; }
  html.reduce-motion *, html.reduce-motion *::before, html.reduce-motion *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; }
  :is(.stage, .side, .bar) :is(button, a, input, [tabindex]):focus-visible { outline: 3px solid #ffd479 !important; outline-offset: 2px; }`;
  let ui = {};
  const paint = () => {
    if (ui.mode) for (const b of ui.mode.children) { const p = b.dataset.m === 'pure'; b.setAttribute('aria-pressed', String((mode === 'pure') === p));
      b.innerHTML = `${t(p ? 'pure' : 'inter')}<small>${t(p ? 'pureHint' : 'interHint')}</small>`; }
    if (ui.pause) ui.pause.textContent = t('paused');
    if (ui.heat) { ui.heat.setAttribute('aria-pressed', String(heat)); ui.heat.textContent = `🌡 ${t(heat ? 'heatOn' : 'heatOff')}`; }
    if (ui.veil) ui.veil.lastChild.textContent = t('loading');
    if (ui.set) {
      ui.set.querySelector('[data-k=label]').textContent = t('subs');
      ui.set.querySelector('[data-s=off]').textContent = t('off'); ui.set.querySelector('[data-k=motion]').textContent = t('motion');
      const sv = LS.get('subs', 'm'); ui.set.querySelectorAll('[data-s]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.s === sv)));
      ui.set.querySelector('[data-k=motion]').setAttribute('aria-pressed', String(Play.reduced));
    }
  };
  let toastT = 0;
  const toast = (k) => { let el = document.querySelector('.sh-toast'); if (!el) { el = document.createElement('div'); el.className = 'sh-toast'; el.setAttribute('role', 'alert'); document.body.appendChild(el); }
    el.textContent = t(k); el.hidden = false; real.ct(toastT); toastT = real.st(() => { el.hidden = true; }, 7000); };
  const setSubs = (v) => { LS.set('subs', v); document.documentElement.dataset.subs = v; paint(); };
  const setMotion = (v) => { Play.reduced = v; LS.set('reduce', v); document.documentElement.classList.toggle('reduce-motion', v); paint(); dispatchEvent(new CustomEvent('moheat:motion', { detail: v })); };

  const init = () => {
    const stage = document.querySelector('.stage-col .stage') || document.querySelector('.stage'), intro = document.getElementById('intro');
    if (!stage) return;
    const st = document.createElement('style'); st.id = 'moheat-shell'; st.textContent = css; document.head.appendChild(st);
    document.documentElement.dataset.playmode = mode; setSubs(LS.get('subs', 'm'));
    setMotion(LS.get('reduce', matchMedia('(prefers-reduced-motion: reduce)').matches));
    if (EXPORT) return;
    // loading veil: until the page (images, fonts, scripts) is in; never longer than 10 s
    ui.veil = document.createElement('div'); ui.veil.className = 'sh-veil'; ui.veil.innerHTML = '<i></i><span></span>'; stage.appendChild(ui.veil);
    const lift = () => ui.veil.classList.add('gone');
    Promise.all([new Promise((r) => (document.readyState === 'complete' ? r() : addEventListener('load', r))), document.fonts?.ready]).then(() => real.st(lift, 300));
    real.st(lift, 10000);
    // mode switch on the cover (under Start; the end cover is the same element)
    const actions = intro?.querySelector('.intro-actions');
    if (actions) { ui.mode = document.createElement('div'); ui.mode.className = 'sh-mode'; ui.mode.setAttribute('role', 'group');
      ui.mode.innerHTML = '<button type="button" data-m="pure"></button><button type="button" data-m="interactive"></button>';
      ui.mode.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setMode(b.dataset.m); });
      actions.appendChild(ui.mode); }
    // pause layer + tap to pause
    ui.pause = document.createElement('div'); ui.pause.className = 'sh-pause'; ui.pause.setAttribute('role', 'button'); ui.pause.tabIndex = -1; stage.appendChild(ui.pause);
    ui.pause.addEventListener('click', () => pause(false));
    const canvas = stage.querySelector('canvas, video');
    if (!FILM()) canvas?.addEventListener('click', () => { if (playing() && !QS.has('auto')) pause(true); });
    film(stage);
    // the demo's progress list (#steps, written by its setStep()) is the chapter list; demos without one still get it
    if (!document.getElementById('steps')) { const ol = document.createElement('ol'); ol.id = 'steps'; ol.hidden = true; ol.className = 'sh-steps'; document.body.appendChild(ol); }
    // the chapter bar (bottom of the picture, only while the story plays)
    ui.bar = document.createElement('nav'); ui.bar.className = 'sh-bar'; ui.bar.hidden = true; ui.bar.setAttribute('aria-label', 'Chapters');
    ui.bar.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b && !b.disabled) seek(+b.dataset.i); }); stage.appendChild(ui.bar);
    // thermal on / off on the stage
    ui.heat = document.createElement('button'); ui.heat.type = 'button'; ui.heat.className = 'sh-heat';
    ui.heat.addEventListener('click', () => { heat = !heat; LS.set('heat', heat); if (!heat) stopDevice(); paint(); }); stage.appendChild(ui.heat);
    // settings card: subtitles on / off + size, reduced motion (in the side panel's last card)
    const card = [...document.querySelectorAll('aside.side .card')].pop();
    if (card) { ui.set = document.createElement('div'); ui.set.className = 'sh-set';
      ui.set.innerHTML = '<span data-k="label"></span><button type="button" data-s="off"></button><button type="button" data-s="s">S</button><button type="button" data-s="m">M</button><button type="button" data-s="l">L</button><button type="button" data-k="motion"></button>';
      ui.set.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.s) setSubs(b.dataset.s); else setMotion(!Play.reduced); });
      card.appendChild(ui.set); }
    // intensity remembered
    const inten = document.getElementById('intensity');
    if (inten) { const v = LS.get('intensity', null); if (v != null) { inten.value = v; inten.dispatchEvent(new Event('input', { bubbles: true })); }
      inten.addEventListener('input', () => LS.set('intensity', +inten.value)); }
    paint(); addEventListener('moheat:sublang', paint);
  };

  // ---------------------------------------------------------------- films (Demo 1–9: media/data.js timeline + #timelineWrap + interact.js)
  // the mode drives interact.js's own "join in" switch (hidden: the shell's two buttons replace it); the chapter bar is merged into
  // the film's timeline as numbered marks (DEMO_DATA.anim.scenes); interactive mode cannot jump past the furthest point heard.
  const FILM = () => !!(window.DEMO_DATA?.anim && document.getElementById('timelineWrap'));
  const film = (stage) => {
    if (!FILM()) return;
    const A = DEMO_DATA.anim, wrap = document.getElementById('timelineWrap'), media = ['mix', 'film'].map((k) => document.getElementById(k)).find((e) => e instanceof HTMLMediaElement);   // the soundtrack is the clock
    const st = document.createElement('style'); st.textContent = `.intro .ix-toggle, .stage .ix-chip { display: none !important; }
      .sh-marks { position: absolute; inset: 0; pointer-events: none; z-index: 2; } .sh-marks i { position: absolute; top: 0; bottom: 0; width: 2px; background: #fff; box-shadow: 0 0 0 1px rgba(0,0,0,.5); }
      .sh-marks b { position: absolute; top: 1px; transform: translateX(3px); text-shadow: 0 0 3px #000; font: 700 11px/1 system-ui, sans-serif; color: #ffd679; pointer-events: auto; cursor: pointer; }`;
    document.head.appendChild(st);
    const sync = () => { const box = document.querySelector('.ix-toggle input'); if (box && box.checked === Play.pure) { box.checked = !Play.pure; box.dispatchEvent(new Event('change', { bubbles: true })); } };
    addEventListener('moheat:playmode', sync); addEventListener('load', sync); real.st(sync, 800);
    if (getComputedStyle(wrap).position === 'static') wrap.style.position = 'relative';
    const marks = document.createElement('div'); marks.className = 'sh-marks';
    marks.innerHTML = (A.scenes || []).map((c, k) => `<i style="left:${100 * c.t / A.duration}%"></i><b data-t="${c.t}" style="left:${100 * c.t / A.duration}%" title="${c.en}">${'①②③④⑤⑥⑦⑧⑨⑩'[k] || k + 1}</b>`).join('');
    wrap.appendChild(marks);
    let far = 0; real.st(function track() { if (media && !media.paused) far = Math.max(far, media.currentTime); real.st(track, 500); }, 500);
    const jump = (t) => { const r = wrap.getBoundingClientRect(), x = r.left + r.width * (t + .05) / A.duration, y = r.top + r.height / 2;
      marks.style.display = 'none'; const el = document.elementFromPoint(x, y) || wrap; marks.style.display = '';   // the timeline's own element under that point
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: x, clientY: y })); };
    // films end on their own cover too (§7.3): the cover comes back with Play again when the soundtrack ends
    media?.addEventListener('ended', () => { const i = document.getElementById('intro'), b = document.getElementById('startBtn');
      if (i?.classList.contains('hidden')) { try { media.currentTime = 0; } catch {} if (b) b.textContent = '↺ もう一度 · Play again'; i.classList.remove('hidden'); window.MoHeatSub?.set?.(window.MoHeatSub.lang); } });
    marks.addEventListener('click', (e) => { const b = e.target.closest('b'); if (b) { e.stopPropagation(); if (Play.mode === 'interactive' && +b.dataset.t > far + 1) return; jump(+b.dataset.t); } });
    wrap.addEventListener('click', (e) => { if (Play.mode !== 'interactive' || !e.isTrusted) return; const r = wrap.getBoundingClientRect(), t = (e.clientX - r.left) / r.width * A.duration;
      if (t > far + 1) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);   // interactive: back, or up to where you have been
    SH.chapters = (A.scenes || []).map((c) => ({ label: c.en, t: c.t })); SH.current = () => { const t = media?.currentTime || 0; let k = 0; (A.scenes || []).forEach((c, i) => { if (t >= c.t) k = i; }); return k; };
    SH.seek = (i) => jump(A.scenes[i].t);
  };

  // ---------------------------------------------------------------- keys / swipes
  const step = (dir) => { const a = document.querySelectorAll('.dnav .dn-step')[dir > 0 ? 1 : 0]; if (a && a.getAttribute('aria-disabled') !== 'true' && a.href && !a.href.endsWith('#')) location.href = a.href; };
  addEventListener('keydown', (e) => {
    if (EXPORT || e.metaKey || e.ctrlKey || e.altKey || /input|textarea|select/i.test(e.target.tagName) || e.target.isContentEditable) return;
    if (e.code === 'Space' && FILM()) return;   // films: their own Space = play / pause (time comes from the media element)
    if (e.code === 'Space' && playing()) { e.preventDefault(); e.stopImmediatePropagation(); pause(!paused); return; }
    if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !playing() && !e.repeat) { e.preventDefault(); step(e.key === 'ArrowRight' ? 1 : -1); }
  }, true);
  let sx = null, sy = 0;
  addEventListener('touchstart', (e) => { const p = e.touches[0]; sx = e.touches.length === 1 && !playing() && e.target.closest?.('.stage') ? p.clientX : null; sy = p.clientY; }, { passive: true });
  addEventListener('touchend', (e) => { if (sx == null) return; const p = e.changedTouches[0], dx = p.clientX - sx, dy = p.clientY - sy; sx = null;
    if (Math.abs(dx) > 70 && Math.abs(dx) > 2 * Math.abs(dy) && !playing()) step(dx < 0 ? 1 : -1); }, { passive: true });

  // ---------------------------------------------------------------- error toasts
  addEventListener('error', (e) => { const el = e.target; if (el && el !== window && /^(IMG|AUDIO|VIDEO|SCRIPT|SOURCE)$/.test(el.tagName)) toast('loadFail'); }, true);
  navigator.serial?.addEventListener('disconnect', () => toast('devLost'));
  navigator.permissions?.query({ name: 'microphone' }).then((p) => { p.onchange = () => { if (p.state === 'denied' && !Play.pure) toast('micDenied'); }; }).catch(() => {});
  addEventListener('moheat:micdenied', () => toast('micDenied'));

  Object.assign(SH, { pause, setMode, toast, LS, seekTo: seek, chapter }); Object.defineProperty(SH, 'paused', { get: () => paused });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
