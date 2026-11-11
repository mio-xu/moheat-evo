// MoHeatThermoCheck — device output check on every demo cover (user 2026-11-08: "设备输出检查…左热，右热，左冷，右冷").
// A "🌡 Thermal check" button next to "🎧 Left / Right check": left warm → right warm → left cool → right cool, ~4 s each, then stop.
// Shown on the radar, not in text (user): the active ear glows orange (warm) / blue (cool).
//   · uses the page's device (device.js: MoHeatDevice.current) and the per-ear protocol (LH / RH = heat PWM, LC / RC = cool PWM);
//     moderate levels (heat 120 / 200, cool 60 within 35–80) so it is clearly felt but never hot.
//   · stops at once on: a second click, ■ STOP, the Start button, leaving the page. Not connected → a short "connect first" note.
//   · text in the display language (shared/subs.js). Loaded by nav.js; demos need no code for it.
(() => {
  if (window.MoHeatThermoCheck) return;
  const QS = new URLSearchParams(location.search);
  if (['cover', 'render', 'auto'].some((k) => QS.has(k))) return;
  const STEP_S = 4;
  const ALL = [
    { cmd: 'LH120 RH0', ear: 'l', kind: 'warm', t: { en: 'Left · warm', ja: '左 · あたたかい', zh: '左耳 · 暖', ko: '왼쪽 · 따뜻함' } },
    { cmd: 'LH0 RH120', ear: 'r', kind: 'warm', t: { en: 'Right · warm', ja: '右 · あたたかい', zh: '右耳 · 暖', ko: '오른쪽 · 따뜻함' } },
    { cmd: 'LC60 RH0', ear: 'l', kind: 'cool', t: { en: 'Left · cool', ja: '左 · つめたい', zh: '左耳 · 凉', ko: '왼쪽 · 시원함' } },
    { cmd: 'LH0 RC60', ear: 'r', kind: 'cool', t: { en: 'Right · cool', ja: '右 · つめたい', zh: '右耳 · 凉', ko: '오른쪽 · 시원함' } },
  ];
  // a warm-only demo (<html data-warm-only>, Demo51) or the visitor's "warm only (no mist)" (kiosk): no cool steps at all
  const WO = () => { if (document.documentElement.hasAttribute('data-warm-only')) return true; try { return localStorage.getItem('moheat.warmOnly') === '1'; } catch { return false; } };
  let STEPS = ALL;
  const TXT = { btn: { en: '🌡 Thermal check', ja: '🌡 温冷チェック', zh: '🌡 温冷检查', ko: '🌡 온냉 확인' }, stop: { en: '■ Stop check', ja: '■ チェック終了', zh: '■ 停止检查', ko: '■ 확인 끝내기' },
    need: { en: 'Connect MoHeat Evo first (top right)', ja: '先に MoHeat Evo をつないでください（右上）', zh: '请先连接 MoHeat Evo（右上角）', ko: '먼저 MoHeat Evo를 연결해 주세요 (오른쪽 위)' },
    done: { en: '✓ All four channels checked', ja: '✓ 4 チャンネルのチェック完了', zh: '✓ 四个通道检查完毕', ko: '✓ 4개 채널 확인 완료' } };
  const T = (o) => (window.MoHeatSub ? window.MoHeatSub.pick(o) : o.en) || o.en;
  const css = document.createElement('style');
  css.textContent = `.mtc-note { display: block; margin-top: .5cqw; font: 600 clamp(10px, 1cqw, 14px)/1.3 Inter, "Noto Sans JP", "PingFang SC", sans-serif; color: #ffd58a; text-align: center; }
  .mtc-note:empty { display: none; }
  /* the check is shown on the radar (user: no text): the active ear glows warm orange / cool blue */
  .mtc-ov { position: absolute; pointer-events: none; z-index: 2; }
  .mtc-ov i { position: absolute; top: 50%; width: 34%; aspect-ratio: 1; border-radius: 50%; transform: translate(-50%, -50%) scale(.6); opacity: 0; transition: opacity .3s, transform .3s; }
  .mtc-ov i.l { left: 36%; } .mtc-ov i.r { left: 64%; }
  .mtc-ov i.warm { background: radial-gradient(circle, rgba(255, 150, 70, .95) 0%, rgba(255, 110, 40, .5) 38%, transparent 70%); }
  .mtc-ov i.cool { background: radial-gradient(circle, rgba(110, 200, 255, .95) 0%, rgba(60, 160, 255, .5) 38%, transparent 70%); }
  .mtc-ov i.on { opacity: 1; transform: translate(-50%, -50%) scale(1); animation: mtcPulse 1.1s ease-in-out infinite; }
  @keyframes mtcPulse { 50% { transform: translate(-50%, -50%) scale(1.18); filter: brightness(1.25); } }`;
  document.head.appendChild(css);

  let btn = null, note = null, timer = 0, run = 0, step = -1, noteTimer = 0;
  const dev = () => window.MoHeatDevice?.current;
  const say = (text, ms = 0) => { if (!note) return; note.textContent = text; clearTimeout(noteTimer); if (ms) noteTimer = setTimeout(() => { if (step < 0) note.textContent = ''; }, ms); };
  function label() { if (btn) btn.textContent = step >= 0 ? T(TXT.stop) : T(TXT.btn); }
  // radar overlay: one glow per ear over #radar (left ear = left side of the head)
  let ov = null;
  function radar(st) {
    const cv = document.getElementById('radar'), card = cv?.closest('.card');
    if (!cv || !card) return;
    if (!ov) { ov = document.createElement('div'); ov.className = 'mtc-ov'; ov.innerHTML = '<i class="l"></i><i class="r"></i>'; if (getComputedStyle(card).position === 'static') card.style.position = 'relative'; card.appendChild(ov); }
    const c = cv.getBoundingClientRect(), k = card.getBoundingClientRect();
    Object.assign(ov.style, { left: `${c.left - k.left}px`, top: `${c.top - k.top}px`, width: `${c.width}px`, height: `${c.height}px` });
    const [l, r] = ov.children;
    l.className = `l${st && st.ear === 'l' ? ` on ${st.kind}` : ''}`; r.className = `r${st && st.ear === 'r' ? ` on ${st.kind}` : ''}`;
  }
  function stop(send = true) {
    if (step < 0 && !timer) return;
    clearTimeout(timer); timer = 0; run++; step = -1;
    if (send && dev()?.isConnected()) dev().send('stop');
    label(); say(''); radar(null);
  }
  function next(my) {
    if (my !== run) return;
    step++;
    if (step >= STEPS.length) { step = -1; timer = 0; dev()?.send('stop'); label(); radar(null); return; }
    dev()?.send(STEPS[step].cmd); label(); radar(STEPS[step]);
    const rv = document.getElementById('radar')?.getBoundingClientRect(); say(rv && rv.width > 20 && rv.height > 20 ? '' : T(STEPS[step].t));   // no radar on screen (phone landscape): a short text instead
    timer = setTimeout(() => next(my), STEP_S * 1000);
  }
  function start() {
    if (!dev()?.isConnected()) { say(T(TXT.need), 3500); return; }
    stop(false); STEPS = WO() ? ALL.filter((x) => x.kind !== 'cool') : ALL; const my = ++run; step = -1; next(my);
  }
  function place() {
    const lr = document.getElementById('lrBtn'); if (!lr) return;
    btn = document.createElement('button'); btn.type = 'button'; btn.className = `${lr.className} mtc-btn`;
    btn.addEventListener('click', (e) => { e.stopPropagation(); step >= 0 ? stop() : start(); });
    lr.after(btn);
    note = document.createElement('span'); note.className = 'mtc-note'; note.setAttribute('aria-live', 'polite');
    (lr.closest('.intro-actions') || lr.parentElement).after(note);
    label();
    document.getElementById('estop')?.addEventListener('click', () => stop(false), true);   // ■ STOP sends its own stop
    document.getElementById('startBtn')?.addEventListener('click', () => stop(), true);
    addEventListener('pagehide', () => stop());
    addEventListener('moheat:sublang', label);
  }
  window.MoHeatThermoCheck = { start, stop, get running() { return step >= 0; } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', place); else place();
})();
