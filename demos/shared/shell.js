// The unified UI shell for every MoHeat Evo demo (DEMO_DESIGN_GUIDE §2 + §7.3 "统一外壳", user 2026-11-08). Load it BEFORE main.js
// (right after device.js):   <script src="../../shared/shell.js?v=1"></script>   — it has to wrap the clock before the demo starts.
// What every demo gets from it, with no per-demo code:
//   · INTERACTIVE mode (default) / PURE listening mode, picked on the cover (and on the end cover). Pure: no microphone
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
  // ONE switch for the progress / chapter bar on every demo (user 2026-11-08: all demos have it or none). false = the unified bar AND the
  // films' own play bar (.transport / .legend) are hidden everywhere; the chapter data, seek API, keys and pause keep working.
  // ?bar=1 shows it for testing. Flip to true in ONE release once every demo in nav.js DEMOS shows the same bar (tools/web/check_shell.js).
  SH.BAR_ENABLED = false;
  // UI v2 (DEMO_DESIGN_GUIDE §7.3 "UI v2", user 2026-11-08): the finished-cover image + the one control bar + ⚙ (demos/shared/ui2.js).
  // ONE switch for every demo; until the release flips it, ?ui=2 turns it on for this browser (remembered, so ‹ › keeps it) and ?ui=1 off.
  SH.UI_V2 = false;
  const QS = new URLSearchParams(location.search), EXPORT = QS.has('cover') || QS.has('render') || QS.has('embed');
  try { if (QS.get('ui') === '2') localStorage.setItem('moheat.ui', '2'); else if (QS.get('ui') === '1') localStorage.removeItem('moheat.ui'); } catch {}
  const V2 = !EXPORT && (SH.UI_V2 || (() => { try { return localStorage.getItem('moheat.ui') === '2'; } catch { return false; } })());
  SH.v2 = V2;
  // the finished cover is the first thing this page fetches (cover first, everything else after — fix2's speed plan)
  const PAGE = new URL('.', location.href).href, COVER_BASE = PAGE + 'media/cover/';
  if (V2) {
    document.documentElement.classList.add('ui2');
    const lang0 = (() => { try { return QS.get('sub') || localStorage.getItem('moheat.sublang') || 'en'; } catch { return 'en'; } })();
    const w = Math.min(innerWidth, 1920), sz = w < 820 ? 'c1200' : w * (devicePixelRatio || 1) > 1500 ? 'w1920' : 'w1280';
    const pl = document.createElement('link'); pl.rel = 'preload'; pl.as = 'image'; pl.href = `${COVER_BASE}${['en', 'ja', 'zh'].includes(lang0) ? lang0 : 'en'}.${sz}.webp`; pl.fetchPriority = 'high';
    document.head.appendChild(pl);
    const hide = document.createElement('style'); hide.id = 'moheat-ui2-early';   // nothing old shows, not even for one frame (the old cover HTML, the 🌐 ⛶ corner…)
    hide.textContent = `html.ui2 .stage .intro { opacity: 0 !important; pointer-events: none !important; }
      html.ui2 .stage { background: #0b0a12; }`;
    document.head.appendChild(hide);
  }
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
      if (dst instanceof AudioDestinationNode) { let m = masters.get(dst.context); if (!m) { m = dst.context.createGain(); connect.call(m, dst); masters.set(dst.context, m); m.gain.value = warp > 1 ? 0 : (SH.volume ?? 1); } return connect.call(this, m, ...a); }
      return connect.call(this, dst, ...a);
    };
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...a) { sources.add(this); this.addEventListener('ended', () => sources.delete(this)); if (warp > 1) this.playbackRate.value = warp; return start.apply(this, a); };
  }
  const setWarp = (w) => rebase(() => {
    warp = w; arm();
    ctxs.forEach((c) => { const m = masters.get(c); if (m) m.gain.value = w > 1 ? 0 : (SH.volume ?? 1); });
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
  let mode = QS.has('interactive') ? 'interactive' : QS.has('pure') ? 'pure' : LS.get('mode', 'interactive');   // default = interactive (user 2026-11-08); pure (just listen) is the option, a remembered choice wins
  const Play = window.MoHeatPlay = { get mode() { return mode; }, get pure() { return mode === 'pure' && !QS.has('auto'); }, reduced: false };
  const setMode = (m) => { mode = m; LS.set('mode', m); document.documentElement.dataset.playmode = m; paint(); dispatchEvent(new CustomEvent('moheat:playmode', { detail: m })); };

  // pure mode: answer for the listener after a natural pause (the default = first button; holds are held)
  // what pure mode presses: the standard answer markup (§7.3 3) + any element marked data-auto (a demo's own gate, e.g. a ringing
  // phone's answer button) + the known gates in SH.AUTO (add a selector there instead of a per-demo workaround)
  SH.AUTO = ['#answerBtn'];
  const SEL = () => ['.stage .choices .ch', '.stage .act .act-btn', '.stage #micGate button', '.stage .mic-gate button', '.stage .chips .chip-c', '.stage .ix-btn', '.stage [data-auto]', ...SH.AUTO].join(', ');
  const seen = new WeakMap();
  const vis = (e) => e.isConnected && e.offsetParent !== null && getComputedStyle(e).visibility !== 'hidden' && !e.disabled && e.getBoundingClientRect().width > 0;
  const playing = () => { const i = document.getElementById('intro'); return !!i && i.classList.contains('hidden'); };
  if (!EXPORT) setInterval(() => {
    if (!Play.pure || !playing()) return;
    if (SH.autoplay) { if (!G.busy) { let r; try { r = SH.autoplay(G); } catch (e) { real.st(() => { throw e; }); } if (r) return; } else return; }   // the game plays itself (below)
    // the first visible control that was not pressed in the last 5 s (a press that did nothing — e.g. the demo was not listening
    // yet — is repeated instead of waiting forever); it is pressed after a natural 2.2 s pause
    const n = vnow(), els = [...document.querySelectorAll(SEL())].filter(vis).filter((x) => !(seen.get(x) < 0 && n + seen.get(x) < 5000)); if (!els.length) return;
    const e = els[0]; if (!seen.has(e) || seen.get(e) < 0) { seen.set(e, n); return; }
    if (n - seen.get(e) < 2200) return;
    seen.set(e, -n);
    if (SH.autoplay) { G.run(async () => { e.classList.contains('hold') ? await G.hold(e, .5, .5, 3.4) : await G.tap(e); }); return; }   // games: the same default answer, by the visible hand
    if (e.classList.contains('hold')) {
      const r = e.getBoundingClientRect(), o = { bubbles: true, pointerId: 7, pointerType: 'mouse', isPrimary: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, button: 0, buttons: 1 };
      e.dispatchEvent(new PointerEvent('pointerdown', o)); e.dispatchEvent(new MouseEvent('mousedown', o));
      setTimeout(() => { e.dispatchEvent(new PointerEvent('pointerup', { ...o, buttons: 0 })); e.dispatchEvent(new MouseEvent('mouseup', { ...o, buttons: 0 })); }, 3200);
    } else e.click();
  }, 300);

  // ---------------------------------------------------------------- games: the visible hand (pure mode plays the game by itself)
  // A game sets   MoHeatShell.autoplay = (G) => { … }   (in its main.js, guarded by `if (window.MoHeatShell)`). In pure mode, while the
  // story plays, the shell calls it every 0.4 s whenever the hand is idle; it looks at the game's own state and starts ONE action
  // (returns truthy), or returns falsy to let the shell press the default button (by the same hand). The hand is a soft cursor on
  // the picture that really moves and sends real pointer / mouse events, so every step is visible and the game's own input code runs
  // (strokes through shared/gesture.js or the demo's pointer handlers, taps, holds, wand / laser aiming by hover). Virtual time:
  // pause freezes it, a chapter seek fast-forwards it. Coordinates: x, y = 0–1 of the element (canvas: canvas px ÷ W / H).
  //   G.tap(el, x, y) · G.hold(el, x, y, secs) · G.drag(el, [[x, y], …], secs) (pressed) · G.move(el, [[x, y], …], secs) (hover)
  //   G.wait(secs, until?) · G.hold(…, secs, until?) — until = () => <game state reached> · G.run(async () => { … }) (several steps
  //   as one action) · G.busy · G.hide()
  // A restart / mode change / the end cancels a running action (its promise rejects quietly inside G.run).
  const GID = 77, caps = new Map();
  for (const [k, fn] of [['setPointerCapture', (el, id) => caps.set(id, el)], ['releasePointerCapture', (el, id) => caps.delete(id)]]) {
    const o = Element.prototype[k]; Element.prototype[k] = function (id) { if (id === GID) return fn(this, id); return o.call(this, id); };
  }
  const hasCap = Element.prototype.hasPointerCapture; Element.prototype.hasPointerCapture = function (id) { return id === GID ? caps.get(id) === this : hasCap.call(this, id); };
  const G = { busy: false, gen: 0, x: -1, y: -1, down: false };
  const vwait = (s) => new Promise((r) => window.setTimeout(r, s * 1000));
  let hand = null;
  const handEl = () => { if (hand?.isConnected) return hand; const st = document.querySelector('.stage-col .stage') || document.querySelector('.stage'); if (!st) return null;
    hand = document.createElement('div'); hand.className = 'sh-hand'; hand.setAttribute('aria-hidden', 'true'); st.appendChild(hand); return hand; };
  const place = (cx, cy) => { const h = handEl(); if (!h) return; const r = h.parentElement.getBoundingClientRect(); h.style.left = `${cx - r.left}px`; h.style.top = `${cy - r.top}px`; h.classList.add('on'); G.x = cx; G.y = cy; };
  G.hide = () => { hand?.classList.remove('on', 'down'); };
  const pt = (el, x = .5, y = .5) => { const r = el.getBoundingClientRect(); return [r.left + r.width * x, r.top + r.height * y]; };
  const under = (el, cx, cy) => { const h = document.elementFromPoint(cx, cy); return h && el.contains(h) ? h : el; };   // the element under the hand inside el (overlays on top do not swallow it)
  const fire = (el, type, cx, cy, buttons) => {
    const o = { bubbles: true, cancelable: true, composed: true, clientX: cx, clientY: cy, button: 0, buttons, pointerId: GID, pointerType: 'mouse', isPrimary: true, view: window };
    if (type.startsWith('pointer')) el.dispatchEvent(new PointerEvent(type, o)); else el.dispatchEvent(new MouseEvent(type, o));
  };
  const live = (my) => { if (my !== G.gen || !Play.pure || !playing()) throw new Error('ghost-cancel'); };
  const glide = async (el, cx, cy, secs, pressed, my) => {   // move the hand from where it is to (cx, cy), sending moves
    const x0 = G.x < 0 ? cx + 80 : G.x, y0 = G.y < 0 ? cy + 60 : G.y, n = Math.max(1, Math.round(secs * 30));
    for (let i = 1; i <= n; i++) { live(my); const k = i / n, e = k < .5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2, x = x0 + (cx - x0) * e, y = y0 + (cy - y0) * e;
      place(x, y); fire(caps.get(GID) || under(el, x, y), 'pointermove', x, y, pressed ? 1 : 0); if (!pressed) fire(under(el, x, y), 'mousemove', x, y, 0); await vwait(secs / n); }
  };
  const press = (el, cx, cy, on) => { const t = on ? under(el, cx, cy) : (caps.get(GID) || G.downEl || el); G.down = on; hand?.classList.toggle('down', on);
    fire(t, on ? 'pointerdown' : 'pointerup', cx, cy, on ? 1 : 0); fire(t, on ? 'mousedown' : 'mouseup', cx, cy, on ? 1 : 0); if (on) G.downEl = t; else { caps.delete(GID); G.downEl = null; } return t; };
  // until: a check of the game's own state — hold / wait at least `secs`, then on until it is true (games clamp their frame step, so
  // while a seek fast-forwards ×16 their state moves slower than the clock: a fixed duration would not be enough), at most 15 s real
  const hang = async (my, secs, until) => { await vwait(secs); live(my); const r0 = real.now(); while (until && !until() && real.now() - r0 < 15000) { await vwait(.1); live(my); } };
  G.wait = async (s, until) => { const my = G.gen; await hang(my, s, until); };
  G.tap = async (el, x, y) => { const my = G.gen, [cx, cy] = pt(el, x, y); await glide(el, cx, cy, .55, false, my); await vwait(.12); live(my);
    const t = press(el, cx, cy, true); await vwait(.09); press(el, cx, cy, false); fire(t, 'click', cx, cy, 0); ripple(cx, cy); await vwait(.25); };
  G.hold = async (el, x, y, secs = 2, until) => { const my = G.gen, [cx, cy] = pt(el, x, y); await glide(el, cx, cy, .55, false, my); await vwait(.1); live(my);
    const t = press(el, cx, cy, true); try { await hang(my, secs, until); } finally { press(el, cx, cy, false); } if (t.closest?.('button')) fire(t, 'click', cx, cy, 0); await vwait(.2); };
  G.drag = async (el, pts, secs = 1.5) => { const my = G.gen, P = pts.map(([x, y]) => pt(el, x, y)); await glide(el, P[0][0], P[0][1], .5, false, my); await vwait(.08); live(my);
    press(el, P[0][0], P[0][1], true); try { const seg = secs / Math.max(1, P.length - 1); for (const [cx, cy] of P.slice(1)) await glide(el, cx, cy, seg, true, my); }
    finally { press(el, G.x, G.y, false); } await vwait(.15); };
  G.move = async (el, pts, secs = 1) => { const my = G.gen, seg = secs / pts.length; for (const [x, y] of pts) { const [cx, cy] = pt(el, x, y); await glide(el, cx, cy, seg, false, my); } };
  G.run = (fn) => { if (G.busy) return false; G.busy = true; const my = G.gen;
    Promise.resolve().then(fn).catch((e) => { if (e?.message !== 'ghost-cancel') real.st(() => { throw e; }); }).finally(() => { if (G.down && my === G.gen) press(document.body, G.x, G.y, false); if (my === G.gen) G.busy = false; }); return true; };
  const ripple = (cx, cy) => { const h = handEl(); if (!h) return; const r = h.parentElement.getBoundingClientRect(), d = document.createElement('i'); d.className = 'sh-tap';
    d.style.left = `${cx - r.left}px`; d.style.top = `${cy - r.top}px`; h.parentElement.appendChild(d); real.st(() => d.remove(), 700); };
  const cancelHand = () => { G.gen++; G.busy = false; if (G.down) { G.down = false; caps.delete(GID); } G.hide(); };
  addEventListener('moheat:playmode', cancelHand);
  document.addEventListener('click', (e) => { if (e.target.closest?.('#startBtn')) cancelHand(); }, true);
  if (!EXPORT) setInterval(() => { if (hand && (!Play.pure || !playing())) { if (G.busy || hand.classList.contains('on')) cancelHand(); } }, 500);
  SH.hand = G;

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
  let reached = 0, target = null, since = 0, back = false;
  const stepsLis = () => [...document.querySelectorAll('#steps li')];
  const chapters = () => SH.chapters || stepsLis().map((li) => { const [ja, en] = (li.dataset.morig || li.textContent).split(' · '); return { label: ja, ja, en: (en || ja).trim() }; });
  const chapter = () => (SH.current ? SH.current() : stepsLis().findIndex((li) => li.classList.contains('now')));
  const seek = (i) => {
    if (!playing()) return; const cur = chapter();
    if (Play.mode === 'interactive' && i > reached) return;
    if (paused) pause(false);
    if (SH.seek) return SH.seek(i);
    since = real.now();
    if (i <= cur) { target = i; back = true; document.getElementById('startBtn')?.click(); if (i > 0) setWarp(16); else target = null; return; }   // back: from the top, then forward
    target = i; back = false; setWarp(16);
  };
  if (!EXPORT) setInterval(() => {   // follow the story: reached chapters, end of a seek, the bar
    if (!ui.bar) return;
    const cs = chapters(), cur = chapter(); if (playing() && cur > reached) reached = cur;
    if (back && cur < target) back = false;   // the restart has registered (a game's steps can be short: stop at once, no overshoot)
    if (target != null && real.now() - since > (back ? 1500 : 100) && (cur >= target || !playing())) { target = null; back = false; setWarp(1); }
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
  .sh-hand { position: absolute; z-index: 28; left: 0; top: 0; width: clamp(22px, 2.6cqw, 44px); height: clamp(22px, 2.6cqw, 44px); margin: calc(clamp(22px, 2.6cqw, 44px) / -2) 0 0 calc(clamp(22px, 2.6cqw, 44px) / -2);
    border-radius: 50%; pointer-events: none; opacity: 0; transition: opacity .3s, transform .12s; background: radial-gradient(circle, rgba(255,255,255,.95) 0 22%, rgba(255,255,255,.35) 26% 60%, rgba(255,255,255,0) 64%);
    box-shadow: 0 0 0 2px rgba(255,255,255,.75), 0 2px 10px rgba(0,0,0,.45); }
  .sh-hand.on { opacity: .9; } .sh-hand.down { transform: scale(.78); background: radial-gradient(circle, rgba(255,236,170,1) 0 30%, rgba(255,214,120,.5) 34% 62%, rgba(255,214,120,0) 66%); }
  .sh-tap { position: absolute; z-index: 27; width: 10px; height: 10px; margin: -5px 0 0 -5px; border-radius: 50%; pointer-events: none; border: 2px solid rgba(255,255,255,.9); animation: shtap .6s ease-out forwards; }
  @keyframes shtap { to { transform: scale(7); opacity: 0; } }
  html.shell-paused .sh-hand { opacity: .5; }
  html.sh-nobar .sh-bar, html.sh-nobar .stage-col > .transport, html.sh-nobar .stage-col > .legend, html.sh-nobar .sh-marks { display: none !important; }
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
    if (!(SH.BAR_ENABLED || QS.has('bar'))) document.documentElement.classList.add('sh-nobar');
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
    if (!FILM()) canvas?.addEventListener('click', (e) => { if (e.isTrusted && playing() && !QS.has('auto') && (Play.pure || !SH.autoplay)) pause(true); });   // games in interactive mode: a tap is a move, not a pause
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
    const A = DEMO_DATA.anim, wrap = document.getElementById('timelineWrap'),
      SC = A.scenes || (A.segments || []).map((g) => ({ t: g.t0, ja: g.name, en: g.en || g.name, zh: g.zh })),   /* Demo03 / 04: their segments are the chapters */ media = ['mix', 'film'].map((k) => document.getElementById(k)).find((e) => e instanceof HTMLMediaElement);   // the soundtrack is the clock
    const st = document.createElement('style'); st.textContent = `.intro .ix-toggle, .stage .ix-chip { display: none !important; }
      .sh-marks { position: absolute; inset: 0; pointer-events: none; z-index: 2; } .sh-marks i { position: absolute; top: 0; bottom: 0; width: 2px; background: #fff; box-shadow: 0 0 0 1px rgba(0,0,0,.5); }
      .sh-marks b { position: absolute; top: 1px; transform: translateX(3px); text-shadow: 0 0 3px #000; font: 700 11px/1 system-ui, sans-serif; color: #ffd679; pointer-events: auto; cursor: pointer; }`;
    document.head.appendChild(st);
    const sync = () => { const box = document.querySelector('.ix-toggle input'); if (box && box.checked === Play.pure) { box.checked = !Play.pure; box.dispatchEvent(new Event('change', { bubbles: true })); } };
    addEventListener('moheat:playmode', sync); addEventListener('load', sync); real.st(sync, 800);
    if (getComputedStyle(wrap).position === 'static') wrap.style.position = 'relative';
    const marks = document.createElement('div'); marks.className = 'sh-marks';
    marks.innerHTML = SC.map((c, k) => `<i style="left:${100 * c.t / A.duration}%"></i><b data-t="${c.t}" style="left:${100 * c.t / A.duration}%" title="${c.en}">${'①②③④⑤⑥⑦⑧⑨⑩'[k] || k + 1}</b>`).join('');
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
    SH.chapters = SC.map((c) => ({ label: c.en, t: c.t, ja: c.ja, en: c.en, zh: c.zh })); SH.current = () => { const t = media?.currentTime || 0; let k = 0; SC.forEach((c, i) => { if (t >= c.t) k = i; }); return k; };
    SH.seek = (i) => jump(SC[i].t);
  };

  // ---------------------------------------------------------------- keys / swipes
  const step = (dir) => { const a = document.querySelectorAll('.dnav .dn-step')[dir > 0 ? 1 : 0]; if (a && a.getAttribute('aria-disabled') !== 'true' && a.href && !a.href.endsWith('#')) location.href = a.href; };
  addEventListener('keydown', (e) => {
    if (EXPORT || e.metaKey || e.ctrlKey || e.altKey || /input|textarea|select/i.test(e.target.tagName) || e.target.isContentEditable) return;
    if (e.code === 'Space' && FILM()) return;   // films: their own Space = play / pause (time comes from the media element)
    if (e.code === 'Space' && SH.autoplay && !Play.pure) return;   // games, interactive: Space is the game's key (blow / talk); P pauses
    if ((e.code === 'Space' || (e.code === 'KeyP' && !e.repeat)) && playing()) { e.preventDefault(); e.stopImmediatePropagation(); pause(!paused); return; }
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

  // ---------------------------------------------------------------- volume (one master for Web Audio + <audio>/<video>; ⚙ / bar slider, kiosk)
  // the demo's own levels stay as they are: a media element's volume becomes (what the demo set) × master; Web Audio gets one master gain
  let vol = LS.get('volume', 1);
  const vdesc = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'volume'), want = new WeakMap(), clamp01 = (x) => Math.max(0, Math.min(1, x));
  if (vdesc && !EXPORT) Object.defineProperty(HTMLMediaElement.prototype, 'volume', { configurable: true,
    get() { return want.has(this) ? want.get(this) : vdesc.get.call(this); }, set(v) { want.set(this, +v); vdesc.set.call(this, clamp01(+v * vol)); } });
  const applyVol = () => { ctxs.forEach((c) => { const m = masters.get(c); if (m) m.gain.value = warp > 1 ? 0 : vol; });
    if (vdesc) document.querySelectorAll('audio, video').forEach((m) => { try { vdesc.set.call(m, clamp01((want.has(m) ? want.get(m) : 1) * vol)); } catch {} }); };
  const setVolume = (v) => { vol = clamp01(+v || 0); LS.set('volume', vol); applyVol(); };
  if (!EXPORT) document.addEventListener('play', (e) => { if (vol !== 1 && vdesc && e.target instanceof HTMLMediaElement) vdesc.set.call(e.target, clamp01((want.has(e.target) ? want.get(e.target) : 1) * vol)); }, true);

  Object.assign(SH, { pause, setMode, toast, LS, seekTo: seek, chapter, setVolume, chapterList: chapters, setSubs, setMotion,
    reached: () => reached, setHeat: (on) => { heat = !!on; LS.set('heat', heat); if (!heat) stopDevice(); paint(); } });
  Object.defineProperty(SH, 'paused', { get: () => paused }); Object.defineProperty(SH, 'warp', { get: () => warp });
  Object.defineProperty(SH, 'volume', { get: () => vol }); Object.defineProperty(SH, 'heat', { get: () => heat });

  // ---------------------------------------------------------------- UI v2: the live adapter for demos/shared/ui2.js
  if (V2) {
    const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = new URL('ui2.css', document.currentScript?.src || PAGE).href; document.head.appendChild(css);
    const js = document.createElement('script'); js.src = new URL('ui2.js', document.currentScript?.src || PAGE).href; document.head.appendChild(js);
    let started = false, cover = null, ui = null;
    document.addEventListener('click', (e) => { if (e.target.closest?.('#startBtn')) started = true; }, true);
    fetch(PAGE + 'cover.json').then((r) => (r.ok ? r.json() : null)).catch(() => null).then((c) => { cover = c || {}; mount(); });
    js.addEventListener('load', () => mount());
    const loadedFrac = () => { if (document.readyState === 'complete') return 1; const im = [...document.images]; return im.length ? Math.min(.99, im.filter((i) => i.complete).length / im.length) : .5; };
    const intro = () => document.getElementById('intro') || document.querySelector('.stage .intro');
    const film = () => FILM() && ['mix', 'film'].map((k) => document.getElementById(k)).find((e) => e instanceof HTMLMediaElement);
    const optEl = (k, v) => { const i = intro(); if (!i) return null; return i.querySelector(`button[data-k="${k}"][data-v="${v}"]`) || i.querySelector(`button[data-${k}="${v}"]`); };
    // Start is offered when the page has loaded — or 5 s after its HTML at the latest (the demo streams the rest; nothing waits for every voice file)
    let ready = false; const isReady = () => { ready = true; ui?.paint(); };
    Promise.all([new Promise((r) => (document.readyState === 'complete' ? r() : addEventListener('load', r))), document.fonts?.ready]).then(isReady);
    const late = () => real.st(isReady, 5000); if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', late); else late();
    const A = {
      get cat() { return location.pathname.split('/demos/')[1]?.split('/')[0]; },
      get cover() { return { base: COVER_BASE, langs: window.MoHeatSub?.langs || ['en', 'ja', 'zh'] }; },
      state: () => (playing() ? (paused ? 'paused' : 'playing') : !ready ? 'loading' : started ? 'ended' : 'cover'),
      lang: () => window.MoHeatSub?.lang || 'en', setLang: (l) => window.MoHeatSub?.set?.(l),
      mode: () => mode, setMode: (m) => setMode(m),
      start: () => { if (!ready) return; document.getElementById('startBtn')?.click(); },
      togglePause: () => { const f = film(); if (FILM() && f) { f.paused ? f.play().catch(() => {}) : f.pause(); return; } pause(!paused); },
      // chapter labels: cover.json "chapters" (per language) > the demo's own { ja, en, zh } > its label text
      chapters: () => chapters().map((c, i) => ({ label: cover?.chapters?.[i] || (c.ja || c.zh ? { en: c.en || c.label, ja: c.ja, zh: c.zh || (c.ja && window.MoHeatSub?.tr?.(c.ja, 'zh', false)) || c.en || c.label } : c.label) })), chapter: () => chapter(), reached: () => reached,
      progress: () => { const f = film(), sc = SH.chapters; if (!f || !sc?.[0] || sc[0].t == null) return .5; const k = chapter(), t0 = sc[k]?.t ?? 0, t1 = sc[k + 1]?.t ?? DEMO_DATA.anim.duration; return Math.max(0, Math.min(1, (f.currentTime - t0) / Math.max(1, t1 - t0))); },
      seek: (i) => seek(i),
      volume: () => vol, setVolume,
      heat: () => heat, setHeat: SH.setHeat,
      intensity: () => { const i = document.getElementById('intensity'); return i ? (+i.value - +i.min) / ((+i.max || 100) - +i.min) : LS.get('intensity', 100) / 100; },
      setIntensity: (v) => { const i = document.getElementById('intensity'); if (i) { i.value = Math.round(+i.min + v * ((+i.max || 100) - +i.min)); i.dispatchEvent(new Event('input', { bubbles: true })); } },
      subs: () => LS.get('subs', 'm'), setSubs: (v) => setSubs(v),
      reduced: () => Play.reduced, setReduced: (v) => setMotion(v),
      autohide: () => LS.get('autohide', false), setAutohide: (v) => LS.set('autohide', !!v),
      device: () => { const d = window.MoHeatDevice?.current; return { serial: 'serial' in navigator, connected: !!(d && (d.connected || d.port)), name: d?.name || '' }; },
      connect: () => document.getElementById('connectBtn')?.click(),
      fullscreen: () => !!window.MoHeatFullscreen?.on, toggleFullscreen: () => window.MoHeatFullscreen?.toggle?.(),
      endings: () => SH.endings?.() || null, openEndings: () => SH.openEndings?.(),
      options: () => (cover?.options || []).filter((o) => !o.when || o.when === A.state()).map((o) => ({ key: o.key, label: o.label,
        items: o.items.map((it) => { const el = optEl(o.key, it.v); return { v: it.v, label: it.label, on: !!el && (el.getAttribute('aria-pressed') === 'true' || el.classList.contains('on')) }; }) })),
      pick: (k, v) => optEl(k, v)?.click(),
      loaded: () => (ready ? 1 : loadedFrac()), ready: () => ready,
    };
    SH.ui2 = A;
    function mount() {
      if (ui || !cover || !window.MoHeatUI2) return;
      const go = () => { const stage = document.querySelector('.stage-col .stage') || document.querySelector('.stage'); if (!stage) return;
        ui = SH.ui2view = MoHeatUI2.mount(stage, A); real.st(function tick() { try { ui.paint(); } catch (e) { real.st(() => { throw e; }); } real.st(tick, 250); }, 250);
        addEventListener('moheat:sublang', () => ui.paint()); addEventListener('moheat:playmode', () => ui.paint()); };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
