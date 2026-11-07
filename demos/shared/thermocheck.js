// MoHeatThermoCheck — device output check on every demo cover (user 2026-11-08: "设备输出检查…左热，右热，左冷，右冷").
// A "🌡 Thermal check" button next to "🎧 Left / Right check": left warm → right warm → left cool → right cool, ~4 s each, then stop.
//   · uses the page's device (device.js: MoHeatDevice.current) and the per-ear protocol (LH / RH = heat PWM, LC / RC = cool PWM);
//     moderate levels (heat 120 / 200, cool 60 within 35–80) so it is clearly felt but never hot.
//   · stops at once on: a second click, ■ STOP, the Start button, leaving the page. Not connected → a short "connect first" note.
//   · text in the display language (shared/subs.js). Loaded by nav.js; demos need no code for it.
(() => {
  if (window.MoHeatThermoCheck) return;
  const QS = new URLSearchParams(location.search);
  if (['cover', 'render', 'auto'].some((k) => QS.has(k))) return;
  const STEP_S = 4;
  const STEPS = [
    { cmd: 'LH120 RH0', t: { en: 'Left · warm', ja: '左 · あたたかい', zh: '左耳 · 暖' } },
    { cmd: 'LH0 RH120', t: { en: 'Right · warm', ja: '右 · あたたかい', zh: '右耳 · 暖' } },
    { cmd: 'LC60 RH0', t: { en: 'Left · cool', ja: '左 · つめたい', zh: '左耳 · 凉' } },
    { cmd: 'LH0 RC60', t: { en: 'Right · cool', ja: '右 · つめたい', zh: '右耳 · 凉' } },
  ];
  const TXT = { btn: { en: '🌡 Thermal check', ja: '🌡 温冷チェック', zh: '🌡 温冷检查' }, stop: { en: '■ Stop check', ja: '■ チェック終了', zh: '■ 停止检查' },
    need: { en: 'Connect MoHeat Evo first (top right)', ja: '先に MoHeat Evo をつないでください（右上）', zh: '请先连接 MoHeat Evo（右上角）' },
    done: { en: '✓ All four channels checked', ja: '✓ 4 チャンネルのチェック完了', zh: '✓ 四个通道检查完毕' } };
  const T = (o) => (window.MoHeatSub ? window.MoHeatSub.pick(o) : o.en) || o.en;
  const css = document.createElement('style');
  css.textContent = `.mtc-note { display: block; margin-top: .5cqw; font: 600 clamp(10px, 1cqw, 14px)/1.3 Inter, "Noto Sans JP", "PingFang SC", sans-serif; color: #ffd58a; text-align: center; }
  .mtc-note:empty { display: none; }`;
  document.head.appendChild(css);

  let btn = null, note = null, timer = 0, run = 0, step = -1, noteTimer = 0;
  const dev = () => window.MoHeatDevice?.current;
  const say = (text, ms = 0) => { if (!note) return; note.textContent = text; clearTimeout(noteTimer); if (ms) noteTimer = setTimeout(() => { if (step < 0) note.textContent = ''; }, ms); };
  function label() { if (btn) btn.textContent = step >= 0 ? `${T(TXT.stop)} · ${T(STEPS[step].t)}` : T(TXT.btn); }
  function stop(send = true) {
    if (step < 0 && !timer) return;
    clearTimeout(timer); timer = 0; run++; step = -1;
    if (send && dev()?.isConnected()) dev().send('stop');
    label(); say('');
  }
  function next(my) {
    if (my !== run) return;
    step++;
    if (step >= STEPS.length) { step = -1; timer = 0; dev()?.send('stop'); label(); say(T(TXT.done), 3500); return; }
    dev()?.send(STEPS[step].cmd); label(); say(`${step + 1} / ${STEPS.length} · ${T(STEPS[step].t)}`);
    timer = setTimeout(() => next(my), STEP_S * 1000);
  }
  function start() {
    if (!dev()?.isConnected()) { say(T(TXT.need), 3500); return; }
    stop(false); const my = ++run; step = -1; next(my);
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
