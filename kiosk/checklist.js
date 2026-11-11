// Operator checklists for the exhibition kiosk (user 2026-11-11): touch only, big tick boxes, the action runs only when every box is ticked.
//   OPEN  — staff press 開始 (start the visitor session) for the first time of the day: LED supply at 26 V, mist intake tube in the right port.
//   CLOSE — staff press 終了 / Quit / Exit kiosk mode (end of the day): LED supply off, mist off + intake tube out. Also shown (not blocking) on the daily report.
//   MoHeatChecklist.guard(button, 'open' | 'close')  → a REAL tap on the button shows the list first; the button's own handlers run after ✓.
//     (Script clicks — app.js chaining buttons, the idle timer — are not stopped.)
//   MoHeatChecklist.panel(el, 'close')               → the same list drawn inside el (no buttons), e.g. report.html.
// Language: the staff screen's choice (localStorage 'moheat.staff.lang'), else the kiosk language, else Japanese.
(() => {
  const TX = {
    ja: { open: '開場前の確認', close: '終了前の確認', hint: 'すべてにチェックすると進めます', go_open: '開始', go_close: '終了', back: '戻る', break: '休憩前の確認', go_break: '休憩に入る', resume: '再開前の確認', go_resume: '再開', mins: '再開予定（何分後・0 = 表示しない）',
      o1: 'LED の電源を 26 V に設定しましたか？', o2: '冷却ミスト（エタノール）の吸水チューブを、ミストの正しい差し込み口に差しましたか？',
      c1: 'LED の電源を切りましたか？', c2: '冷却ミストの電源を切り、吸水チューブを取り出しましたか？', devOn: 'ヘッドセット: 接続中', devOff: 'ヘッドセット: 未接続（開場前チェックで接続できます）' },
    en: { open: 'Before opening', close: 'Before closing', hint: 'Tick every item to continue', go_open: 'Start', go_close: 'Finish', back: 'Back', break: 'Before the break', go_break: 'Start break', resume: 'Before resuming', go_resume: 'Resume', mins: 'Back in (minutes, 0 = not shown)',
      o1: 'Is the LED power supply set to 26 V?', o2: 'Is the cooling-mist (ethanol) intake tube plugged into the correct port on the mist unit?',
      c1: 'Is the LED power supply switched off?', c2: 'Is the cooling mist switched off, and the intake tube taken out?', devOn: 'Headset: connected', devOff: 'Headset: not connected (connect it in the pre-show check)' },
    zh: { open: '开场前确认', close: '结束前确认', hint: '全部勾选后才能继续', go_open: '开始', go_close: '结束', back: '返回', break: '休息前确认', go_break: '开始休息', resume: '恢复前确认', go_resume: '恢复', mins: '预计几分钟后恢复（0 = 不显示）',
      o1: 'LED 电源已经设为 26 V 了吗？', o2: '冷却雾（乙醇）的吸水管，已经插在雾化器正确的接口上了吗？',
      c1: 'LED 电源关掉了吗？', c2: '冷却雾的电源关掉了、吸水管取出来了吗？', devOn: '头戴设备：已连接', devOff: '头戴设备：未连接（可在开场前检查里连接）' },
    ko: { open: '오픈 전 확인', close: '종료 전 확인', hint: '모두 체크하면 진행할 수 있어요', go_open: '시작', go_close: '종료', back: '뒤로', break: '휴식 전 확인', go_break: '휴식 시작', resume: '재개 전 확인', go_resume: '재개', mins: '재개 예정 (몇 분 후, 0 = 표시 안 함)',
      o1: 'LED 전원을 26 V로 설정했나요?', o2: '냉각 미스트(에탄올) 흡수 튜브를 미스트의 올바른 연결구에 꽂았나요?',
      c1: 'LED 전원을 껐나요?', c2: '냉각 미스트 전원을 끄고 흡수 튜브를 빼냈나요?', devOn: '헤드셋: 연결됨', devOff: '헤드셋: 연결 안 됨 (오픈 전 점검에서 연결)' } };
  const ITEMS = { open: ['o1', 'o2'], close: ['c1', 'c2'], break: ['c1', 'c2'], resume: ['o1', 'o2'] };   // break = the closing list, resume = the opening list
  const lang = () => { let l = ''; try { l = localStorage.getItem('moheat.staff.lang') || JSON.parse(localStorage.getItem('moheat.kiosk.cfg') || '{}').lang || ''; } catch {} return TX[l] ? l : 'ja'; };
  const DAY = 'moheat.kiosk.openedDay', CLOSED = 'moheat.kiosk.closedAt';
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
  const get = (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch {} };
  const css = `
.ck-pop { position: fixed; inset: 0; z-index: 320; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgba(4,3,8,.6); }
.ck-pop[hidden] { display: none; }
.ck-card { width: min(760px, 96vw); max-height: 96vh; overflow: auto; padding: clamp(20px, 3.4vh, 36px); border-radius: 28px; border: 1px solid rgba(255,255,255,.2); background: rgba(24,20,30,.74);
  -webkit-backdrop-filter: blur(18px); backdrop-filter: blur(18px); color: #f4efe6; font-family: var(--ff, Inter, "Noto Sans JP", "PingFang SC", sans-serif); }
.ck-card h3, .ck-panel h3 { margin: 0 0 6px; font: 700 clamp(24px, 3.6vh, 36px)/1.15 var(--head, Inter, "Noto Sans JP", "PingFang SC", "Apple SD Gothic Neo", sans-serif); letter-spacing: -.02em; }
.ck-hint { margin: 0 0 clamp(12px, 2vh, 20px); font-size: clamp(15px, 2vh, 19px); opacity: .7; }
.ck-item { display: flex; align-items: center; gap: 18px; width: 100%; min-height: 84px; margin: 0 0 12px; padding: 14px 20px; border-radius: 20px; border: 1px solid rgba(255,255,255,.26);
  background: rgba(255,255,255,.07); color: inherit; text-align: left; font: 600 clamp(18px, 2.6vh, 24px)/1.35 Inter, "Noto Sans JP", "PingFang SC", "Apple SD Gothic Neo", sans-serif; cursor: pointer; touch-action: manipulation; -webkit-tap-highlight-color: transparent; user-select: none; }
.ck-item .ck-box { flex: 0 0 auto; width: 52px; height: 52px; border-radius: 14px; border: 2px solid rgba(255,255,255,.6); display: flex; align-items: center; justify-content: center; font-size: 34px; line-height: 1; }
.ck-item[aria-checked="true"] { background: rgba(120,220,160,.16); border-color: rgba(140,230,170,.7); }
.ck-item[aria-checked="true"] .ck-box { background: #8fe3aa; border-color: #8fe3aa; color: #10261a; }
.ck-item[aria-checked="true"] .ck-box::before { content: ""; width: 14px; height: 26px; margin-top: -6px; border: solid #10261a; border-width: 0 5px 5px 0; transform: rotate(45deg); }
.ck-mins { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; margin: 4px 0 14px; font-size: clamp(16px, 2.2vh, 20px); }
.ck-mins input { width: 4.5em; }
.ck-dev { margin: 4px 0 14px; font-size: clamp(15px, 2vh, 19px); opacity: .8; }
.ck-row { display: flex; gap: 14px; margin-top: 8px; }
.ck-row button { flex: 1; min-height: 72px; border-radius: 999px; border: 1px solid rgba(255,255,255,.3); background: transparent; color: inherit; font: 700 clamp(20px, 2.8vh, 26px)/1 var(--head, Inter, "Noto Sans JP", "PingFang SC", "Apple SD Gothic Neo", sans-serif); cursor: pointer; touch-action: manipulation; }
.ck-row .ck-go { flex: 1.6; background: #f4efe6; color: #161214; border-color: #f4efe6; }
.ck-row .ck-go:disabled { opacity: .3; cursor: default; }
.ck-panel { margin: 0 0 18px; padding: 18px 20px; border-radius: 22px; border: 1px solid rgba(127,127,127,.35); }
.ck-panel .ck-item { color: inherit; background: transparent; border-color: rgba(127,127,127,.45); }
.ck-panel .ck-item .ck-box { border-color: currentColor; }
@media print { .ck-panel { display: none; } }
`;
  const style = () => { if (document.getElementById('ck-css')) return; const s = document.createElement('style'); s.id = 'ck-css'; s.textContent = css; document.head.appendChild(s); };
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const items = (kind, T) => ITEMS[kind].map((k) => `<button type="button" class="ck-item" role="checkbox" aria-checked="false" data-ck="${k}"><span class="ck-box" aria-hidden="true"></span><span>${esc(T[k])}</span></button>`).join('');
  const wire = (root, onChange) => root.querySelectorAll('.ck-item').forEach((b) => b.addEventListener('click', () => { b.setAttribute('aria-checked', b.getAttribute('aria-checked') === 'true' ? 'false' : 'true'); onChange?.(); }));

  let pop = null;
  function show(kind, done, cancel) {
    style(); const T = TX[lang()];
    if (!pop) { pop = document.createElement('div'); pop.className = 'ck-pop'; pop.hidden = true; document.body.appendChild(pop); }
    const on = !!window.MoHeatDevice?.state?.connected;
    pop.dataset.kind = kind;
    pop.innerHTML = `<div class="ck-card" role="dialog" aria-modal="true"><h3>${esc(T[kind])}</h3><p class="ck-hint">${esc(T.hint)}</p>${items(kind, T)}
      ${kind === 'break' ? `<div class="ck-mins"><span>${esc(T.mins)}</span><input type="number" class="ck-min" min="0" max="120" step="5" value="15" /></div>` : ''}
      ${kind === 'open' || kind === 'resume' ? `<p class="ck-dev">${esc(on ? T.devOn : T.devOff)}</p>` : ''}
      <div class="ck-row"><button type="button" class="ck-back">${esc(T.back)}</button><button type="button" class="ck-go" disabled>${esc(T['go_' + kind])}</button></div></div>`;
    const go = pop.querySelector('.ck-go');
    wire(pop, () => { go.disabled = [...pop.querySelectorAll('.ck-item')].some((b) => b.getAttribute('aria-checked') !== 'true'); });
    pop.querySelector('.ck-back').addEventListener('click', () => { pop.hidden = true; cancel?.(); });
    if (kind === 'break') window.MoHeatNumpad?.steppers(pop);
    go.addEventListener('click', () => { if (go.disabled) return; pop.hidden = true; done({ minutes: +(pop.querySelector('.ck-min')?.value || 0) }); });
    pop.hidden = false;
  }

  function guard(btn, kind) {
    if (!btn || btn.dataset.ck) return; btn.dataset.ck = kind;
    btn.addEventListener('click', (e) => {
      if (!e.isTrusted) return;   // app.js chaining (終了 → start screen), the idle timer: never stopped
      if (kind === 'open' && get(DAY) === today()) return;   // only before the first visitor of the day
      if (kind === 'close' && Date.now() - (+get(CLOSED) || 0) < 30 * 60000) return;   // just confirmed (e.g. 終了, then Quit)
      e.stopImmediatePropagation(); e.preventDefault();
      show(kind, () => { if (kind === 'open') set(DAY, today()); else { set(CLOSED, String(Date.now())); set(DAY, null); } btn.click(); });
    }, true);
  }

  function panel(el, kind) {
    if (!el) return; style(); const T = TX[lang()];
    el.classList.add('ck-panel'); el.innerHTML = `<h3>${esc(T[kind])}</h3>${items(kind, T)}`; wire(el);
  }

  window.MoHeatChecklist = { guard, panel, show, TX };
})();
