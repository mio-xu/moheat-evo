// Staff BREAK mode for the exhibition kiosk (user 2026-11-11). Touch only.
//   Staff screen → 休憩 → the switch-off checklist (LED off, mist off + tube out) + "back in N minutes" (keypad / − +) → break:
//   the standby covers loop silently underneath (the attract view: thermal off), a full-screen notice on top in JA (big) + EN / ZH / KO,
//   every visitor tap / key is swallowed, 'stop' is re-sent every 5 s. The ONLY way out: 5 taps in the top-left corner → password on the
//   on-screen keypad → the opening checklist (LED 26 V, mist tube) → back to the start screen. Survives a page reload (localStorage).
//   MoHeatBreak.init({ go, send, reset, checkPin, beforeEnter })   — called by app.js with its own functions.
(() => {
  const TX = {
    ja: { btn: '休憩', btnS: 'スタッフ休憩', t: 'ただいまスタッフ休憩中です', b: '機器・パソコンには触れないでください。まもなく再開します。', at: '再開予定', pin: 'スタッフ', cancel: 'キャンセル', wrong: 'パスワードが違います' },
    en: { btn: 'Break', btnS: 'staff break', t: 'Staff are on a short break', b: 'Please do not touch the equipment or the computer. We will be back soon.', at: 'Back at', pin: 'Staff', cancel: 'Cancel', wrong: 'Wrong password' },
    zh: { btn: '休息', btnS: '工作人员休息', t: '工作人员正在休息', b: '请勿触碰设备和电脑，我们马上回来。', at: '预计恢复', pin: '工作人员', cancel: '取消', wrong: '密码错误' },
    ko: { btn: '휴식', btnS: '스태프 휴식', t: '지금은 스태프 휴식 중입니다', b: '기기와 컴퓨터를 만지지 마세요. 곧 다시 시작합니다.', at: '재개 예정', pin: '스태프', cancel: '취소', wrong: '비밀번호가 틀렸어요' } };
  const KEY = 'moheat.kiosk.break';
  const lang = () => { let l = ''; try { l = localStorage.getItem('moheat.staff.lang') || JSON.parse(localStorage.getItem('moheat.kiosk.cfg') || '{}').lang || ''; } catch {} return TX[l] ? l : 'ja'; };
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const css = `
.brk { position: fixed; inset: 0; z-index: 60; display: flex; align-items: center; justify-content: center; padding: 4vmin; background: rgba(8,6,14,.58); touch-action: none; -webkit-user-select: none; user-select: none; }
.brk[hidden] { display: none; }
.brk-card { width: min(1100px, 94vw); padding: clamp(24px, 5vh, 64px) clamp(24px, 5vw, 72px); border-radius: 32px; border: 1px solid rgba(255,255,255,.22); background: rgba(20,16,26,.66);
  -webkit-backdrop-filter: blur(20px); backdrop-filter: blur(20px); color: #f4efe6; text-align: center; font-family: var(--ff, Inter, "Noto Sans JP", "PingFang SC", sans-serif); }
.brk-card .brk-ic { font-size: clamp(40px, 8vh, 84px); line-height: 1; margin-bottom: 1.6vh; }
.brk-card h2 { margin: 0; font: 800 clamp(30px, 6vh, 68px)/1.15 var(--head, Inter, "Noto Sans JP", "PingFang SC", "Apple SD Gothic Neo", sans-serif); letter-spacing: -.02em; }
.brk-card .brk-b { margin: 1.6vh 0 0; font-size: clamp(20px, 3.2vh, 36px); line-height: 1.45; font-weight: 600; }
.brk-card .brk-at { display: inline-block; margin-top: 2.4vh; padding: .35em 1em; border-radius: 999px; border: 1px solid rgba(255,255,255,.3); font: 700 clamp(20px, 3.4vh, 38px)/1.2 var(--head, Inter, "Noto Sans JP", "PingFang SC", "Apple SD Gothic Neo", sans-serif); }
.brk-card .brk-at[hidden] { display: none; }
.brk-other { margin-top: 3vh; display: grid; gap: .9vh; font-size: clamp(14px, 2.1vh, 22px); line-height: 1.4; opacity: .78; }
.brk-other b { font-weight: 700; }
.brk-pin { position: fixed; inset: 0; z-index: 110; display: flex; align-items: center; justify-content: center; background: rgba(4,3,8,.6); }
.brk-pin[hidden] { display: none; }
.brk-pin .brk-pcard { width: min(400px, 92vw); padding: 28px; border-radius: 28px; border: 1px solid rgba(255,255,255,.2); background: rgba(24,20,30,.78); -webkit-backdrop-filter: blur(18px); backdrop-filter: blur(18px); color: #f4efe6; text-align: center; }
.brk-pin h3 { margin: 0 0 12px; font: 700 28px/1.1 var(--head, Inter, sans-serif); }
.brk-pin input { width: 100%; min-height: 64px; font-size: 30px; text-align: center; border-radius: 18px; border: 1px solid rgba(255,255,255,.25); background: rgba(255,255,255,.06); color: inherit; box-sizing: border-box; }
.brk-pin .brk-err { min-height: 1.4em; margin: 6px 0 0; color: #ff9b8f; font-size: 17px; }
.brk-pin .brk-cancel { width: 100%; min-height: 64px; margin-top: 6px; border-radius: 999px; border: 1px solid rgba(255,255,255,.28); background: transparent; color: inherit; font: 600 20px/1 var(--head, Inter, sans-serif); cursor: pointer; }
`;
  let H = null, el = null, pinEl = null, stopT = 0, taps = [];
  const state = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } };
  const save = (v) => { try { if (v) localStorage.setItem(KEY, JSON.stringify(v)); else localStorage.removeItem(KEY); } catch {} };
  const active = () => !!state();
  const hhmm = (t) => { const d = new Date(t); return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`; };

  function paint() {
    const st = state() || {}, L = lang(), T = TX[L], until = st.until || 0;
    const others = Object.keys(TX).filter((k) => k !== L).map((k) => `<div><b>${esc(TX[k].t)}</b> · ${esc(TX[k].b)}${until ? ` · ${esc(TX[k].at)} ${hhmm(until)}` : ''}</div>`).join('');
    el.innerHTML = `<div class="brk-card" role="alert"><h2>${esc(T.t)}</h2><p class="brk-b">${esc(T.b)}</p>
      <div class="brk-at"${until ? '' : ' hidden'}>${esc(T.at)} ${until ? hhmm(until) : ''}</div><div class="brk-other">${others}</div></div>`;
  }

  function show() {
    if (!el) { el = document.createElement('div'); el.className = 'brk'; el.id = 'breakBox'; document.body.appendChild(el);
      // every tap on the break screen is swallowed; 5 taps in the top-left corner within 3 s → password
      el.addEventListener('click', (e) => { e.stopPropagation(); e.preventDefault(); if (e.clientX > 96 || e.clientY > 96) return; const n = Date.now(); taps = taps.filter((x) => n - x < 3000).concat(n); if (taps.length >= 5) { taps = []; askPin(); } }, true);
      for (const t of ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'mousedown', 'mouseup', 'dblclick', 'contextmenu']) el.addEventListener(t, (e) => { e.stopPropagation(); if (t === 'contextmenu') e.preventDefault(); }, true); }
    paint(); el.hidden = false;
    H.go?.('attract'); H.send?.('stop'); clearInterval(stopT); stopT = setInterval(() => { if (active()) H.send?.('stop'); }, 5000);
  }

  function askPin() {
    const T = TX[lang()];
    if (!pinEl) { pinEl = document.createElement('div'); pinEl.className = 'brk-pin'; pinEl.hidden = true; document.body.appendChild(pinEl); }
    pinEl.innerHTML = `<div class="brk-pcard" role="dialog"><h3>${esc(T.pin)}</h3><input type="password" inputmode="numeric" maxlength="8" autocomplete="off" class="brk-in" /><p class="brk-err"></p>
      <button type="button" class="brk-cancel">${esc(T.cancel)}</button></div>`;
    const inp = pinEl.querySelector('.brk-in'), err = pinEl.querySelector('.brk-err');
    const tryIt = async () => { const v = inp.value; inp.value = ''; if (await H.checkPin(v)) { pinEl.hidden = true; resume(); } else err.textContent = T.wrong; };
    window.MoHeatNumpad?.inline(inp, { onEnter: tryIt });
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') tryIt(); });
    pinEl.querySelector('.brk-cancel').addEventListener('click', () => { pinEl.hidden = true; });
    pinEl.hidden = false; setTimeout(() => inp.focus(), 50);
  }

  function resume() {   // after the password: the opening checklist, then the start screen
    window.MoHeatChecklist.show('resume', () => { save(null); clearInterval(stopT); if (el) el.hidden = true; try { const d = new Date(); localStorage.setItem('moheat.kiosk.openedDay', `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`); } catch {} H.reset?.(); }, () => {});
  }

  function start() {   // the staff button
    window.MoHeatChecklist.show('break', (x) => { const m = Math.max(0, Math.min(120, +x?.minutes || 0)); H.beforeEnter?.(); save({ at: Date.now(), until: m ? Date.now() + m * 60000 : 0 }); show(); });
  }

  function button(btn) {   // label the staff button (4 languages) whenever the staff screen opens
    if (!btn) return; const T = TX[lang()];
    btn.innerHTML = btn.closest('.sh-actions') ? `<b>${esc(T.btn)}</b><small>${esc(T.btnS)}</small>` : esc(T.btn);
  }

  function init(hooks) {
    H = hooks; const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s);
    const btn = document.getElementById('breakBtn');
    if (btn) { btn.addEventListener('click', start); button(btn); const st = document.getElementById('staff'); if (st) new MutationObserver(() => { if (!st.hidden) button(btn); }).observe(st, { attributes: true, attributeFilter: ['hidden'] });
      document.querySelectorAll('.sh-lang button').forEach((b) => b.addEventListener('click', () => setTimeout(() => button(btn), 0))); }
    // keys do nothing during the break (the password field still types)
    addEventListener('keydown', (e) => { if (!active() || e.target.closest?.('.brk-pin')) return; e.stopImmediatePropagation(); e.preventDefault(); }, true);
    if (active()) setTimeout(show, 300);   // a reload during the break stays in the break
  }

  window.MoHeatBreak = { init, active, start, show, askPin };
})();
