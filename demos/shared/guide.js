// MoHeatGuide — a short tour of the demo page UI (user 2026-11-08: "加个界面使用引导，熟悉的人可以选择跳过"). Loaded by nav.js.
//   · first visit of any demo page: steps highlight the UI one by one (device, STOP, language, fullscreen, start / voice, radar,
//     thermal meters, intensity) with Next / Back / Skip. Done or skipped → not shown again (localStorage 'moheat.guide').
//   · the "?" button in the top bar replays it. Text follows the display language (shared/subs.js; missing → English).
//   · not in ?embed (site menu) / ?cover / ?render / ?auto / ?autoplay, and steps whose element is hidden are skipped.
//   · to add a step: one entry in STEPS (selector + text in en / ja / zh). New UI elements of the standard (§7.3) are covered automatically.
(() => {
  if (window.MoHeatGuide) return;
  const QS = new URLSearchParams(location.search);
  if (['embed', 'cover', 'render', 'auto', 'autoplay'].some((k) => QS.has(k))) return;
  const KEY = 'moheat.guide';
  const STEPS = [
    { sel: null, en: 'Welcome! Put on headphones: you will hear the story in 3D and, with MoHeat Evo, feel warmth and coolness on each ear. Here is a 30-second tour.',
      ja: 'ようこそ！ヘッドホンをつけてください。立体音響で物語を聴き、MoHeat Evo をつなぐと左右の耳で温かさ・冷たさを感じられます。30 秒で画面の使い方をご紹介します。',
      zh: '欢迎！请戴上耳机：你会听到立体声的故事，连接 MoHeat Evo 后还能在左右耳感受到冷和热。下面用 30 秒介绍一下界面。' },
    { sel: 'header .device, #connectBtn', en: 'Connect MoHeat Evo here (desktop Chrome / Edge, USB or Bluetooth). Without it you can still watch and listen.',
      ja: 'ここで MoHeat Evo をつなぎます（パソコンの Chrome / Edge、USB または Bluetooth）。つながなくても、見る・聴くことはできます。',
      zh: '在这里连接 MoHeat Evo（电脑上的 Chrome / Edge，USB 或蓝牙）。不连接也可以观看和收听。' },
    { sel: '#estop', en: '■ STOP turns all heating and cooling off at once (also the Esc key).',
      ja: '■ STOP で温冷をすぐに全部止められます（Esc キーでも）。', zh: '按 ■ 停止 立即关闭所有冷热输出（也可以按 Esc 键）。' },
    { sel: '.msub-btn:not(.mfs-btn)', en: 'Language: tap to switch English / 日本語 / 中文. Subtitles, buttons and voice answers follow.',
      ja: '言語：タップで English / 日本語 / 中文 を切り替え。字幕・ボタン・声での回答もその言語になります。',
      zh: '语言：点一下在 English / 日本語 / 中文 之间切换，字幕、按钮和语音回答都会跟着变。' },
    { sel: '.mfs-btn', en: 'Fullscreen (or press F). Esc to leave.', ja: '全画面表示（F キーでも）。Esc で戻ります。', zh: '全屏（也可以按 F 键），按 Esc 退出。' },
    { sel: '#startBtn', en: 'Start here. When it is your turn, tap an answer — or simply say it out loud (microphone).',
      ja: 'ここからスタート。あなたの番では、ボタンをタップするか、声に出して答えてもOK（マイク）。',
      zh: '从这里开始。轮到你时，点选答案，或者直接说出来也可以（麦克风）。' },
    { sel: 'aside .card:has(#radar)', en: 'Where the voices and sounds are around your head.', ja: '声や音が、頭のまわりのどこにあるかを表示します。', zh: '显示声音在你头部周围的位置。' },
    { sel: 'aside .card:has(.meters), aside .card:has(#cmd)', en: 'What the headphones do on each ear right now: blue = cool, orange = warm.',
      ja: 'いま左右の耳で何が起きているか：青＝冷たい、オレンジ＝温かい。', zh: '耳机此刻在左右耳的输出：蓝色 = 凉，橙色 = 暖。' },
    { sel: 'aside label:has(#intensity), #intensity', en: 'Make the warm / cool effect weaker or stronger. Enjoy!', ja: '温冷の強さを調整できます。お楽しみください！', zh: '可以调节冷热的强弱。祝你玩得开心！' },
  ];
  const BTN = { next: { en: 'Next', ja: '次へ', zh: '下一步' }, back: { en: 'Back', ja: '戻る', zh: '上一步' }, skip: { en: 'Skip', ja: 'スキップ', zh: '跳过' },
    done: { en: 'Got it', ja: 'はじめる', zh: '开始体验' }, help: { en: 'How to use this page', ja: '使い方', zh: '使用说明' } };
  const T = (o) => (window.MoHeatSub ? window.MoHeatSub.pick(o) : o.en) || o.en;
  const css = document.createElement('style');
  css.textContent = `
  .mg-veil { position: fixed; inset: 0; z-index: 9998; }
  .mg-hole { position: fixed; z-index: 9999; border-radius: 12px; box-shadow: 0 0 0 9999px rgba(5, 4, 10, .66); outline: 2px solid #ffd58a; pointer-events: none; transition: all .25s ease; }
  .mg-tip { position: fixed; z-index: 10000; width: min(340px, calc(100vw - 32px)); background: #17121f; color: #f5eefb; border: 1px solid rgba(255, 213, 138, .5); border-radius: 14px;
    padding: 14px 16px 12px; font: 500 14px/1.55 Inter, "Noto Sans JP", "PingFang SC", system-ui, sans-serif; box-shadow: 0 18px 50px rgba(0, 0, 0, .55); transition: top .25s, left .25s; }
  .mg-tip p { margin: 0 0 12px; } .mg-tip .mg-n { font-size: 11px; color: #b8a9c9; letter-spacing: .06em; margin-bottom: 6px; }
  .mg-tip .mg-row { display: flex; gap: 8px; align-items: center; }
  .mg-tip button { cursor: pointer; border-radius: 999px; padding: 6px 14px; font-family: inherit; font-weight: 600; font-size: 13px; line-height: 1; border: 1px solid rgba(255, 255, 255, .25); background: transparent; color: #e9dff3; }
  .mg-tip button.mg-go { background: linear-gradient(135deg, #ffd58a, #ff9f6e); color: #2a1606; border: 0; margin-left: auto; }
  .mg-tip button.mg-skip { border: 0; color: #b8a9c9; padding-left: 0; }
  .mg-help { min-width: 30px; }`;
  document.head.appendChild(css);

  let i = 0, list = [], veil, hole, tip;
  const visible = (el) => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 4 && r.height > 4 && getComputedStyle(el).visibility !== 'hidden'; };
  const target = (s) => (s.sel ? s.sel.split(', ').map((q) => document.querySelector(q)).find(visible) : null);
  function close(done = true) {
    veil?.remove(); hole?.remove(); tip?.remove(); veil = hole = tip = null;
    removeEventListener('resize', place); removeEventListener('keydown', key, true);
    if (done) try { localStorage.setItem(KEY, 'done'); } catch {}
  }
  function key(e) {
    if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); close(); }
    else if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); go(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
  }
  function go(d) { i += d; if (i >= list.length) { close(); return; } if (i < 0) i = 0; render(); }
  function render() {
    const s = list[i], last = i === list.length - 1;
    tip.innerHTML = `<div class="mg-n">${i + 1} / ${list.length}</div><p></p><div class="mg-row">
      ${last ? '' : `<button type="button" class="mg-skip">${T(BTN.skip)}</button>`}${i ? `<button type="button" class="mg-back">${T(BTN.back)}</button>` : ''}
      <button type="button" class="mg-go">${T(last ? BTN.done : BTN.next)}</button></div>`;
    tip.querySelector('p').textContent = T(s);
    tip.querySelector('.mg-go').onclick = () => go(1);
    tip.querySelector('.mg-back')?.addEventListener('click', () => go(-1));
    tip.querySelector('.mg-skip')?.addEventListener('click', () => close());
    place();
    tip.querySelector('.mg-go').focus({ preventScroll: true });
  }
  function place() {
    if (!tip) return;
    const el = target(list[i]), W = innerWidth, H = innerHeight, tw = tip.offsetWidth, th = tip.offsetHeight;
    if (!el) { Object.assign(hole.style, { left: `${W / 2}px`, top: `${H / 2}px`, width: '0px', height: '0px' }); Object.assign(tip.style, { left: `${(W - tw) / 2}px`, top: `${(H - th) / 2}px` }); return; }
    const r = el.getBoundingClientRect(), pad = 6;
    Object.assign(hole.style, { left: `${r.left - pad}px`, top: `${r.top - pad}px`, width: `${r.width + pad * 2}px`, height: `${r.height + pad * 2}px` });
    let top = r.bottom + 14; if (top + th > H - 12) top = r.top - th - 14; if (top < 12) top = Math.min(H - th - 12, Math.max(12, r.top + r.height / 2 - th / 2));
    let left = r.left + r.width / 2 - tw / 2; left = Math.max(12, Math.min(W - tw - 12, left));
    if (r.width > W * .5 && r.height > H * .5) { top = H - th - 24; }   // a big target (the stage): bubble at the bottom
    Object.assign(tip.style, { left: `${left}px`, top: `${top}px` });
  }
  function start() {
    close(false);
    if (window.MoHeatFullscreen?.on) window.MoHeatFullscreen.set(false);
    list = STEPS.filter((s) => !s.sel || target(s)); i = 0;
    veil = document.createElement('div'); veil.className = 'mg-veil'; veil.addEventListener('click', (e) => e.stopPropagation());
    hole = document.createElement('div'); hole.className = 'mg-hole';
    tip = document.createElement('div'); tip.className = 'mg-tip'; tip.setAttribute('role', 'dialog');
    document.body.append(veil, hole, tip);
    addEventListener('resize', place); addEventListener('keydown', key, true);
    render();
  }
  function helpButton() {   // "?" in the top bar, before ■ STOP
    const bar = document.querySelector('header.bar'), stop = document.getElementById('estop');
    if (!bar || bar.querySelector('.mg-help')) return;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn sm mg-help'; b.textContent = '?'; b.title = T(BTN.help);
    b.addEventListener('click', start);
    stop ? stop.before(b) : bar.appendChild(b);
  }
  window.MoHeatGuide = { start, close, reset: () => { try { localStorage.removeItem(KEY); } catch {} } };
  function init() {
    helpButton();
    let seen = false; try { seen = localStorage.getItem(KEY) === 'done'; } catch {}
    if (!seen) setTimeout(() => { if (!document.querySelector('.intro.hidden')) start(); }, 900);   // only on the cover, before the demo starts
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
