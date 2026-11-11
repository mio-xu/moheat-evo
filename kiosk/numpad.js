// On-screen number keypad for the exhibition kiosk (touch only at the booth: no keyboard, 2026-11-11).
//   MoHeatNumpad.inline(input, { onEnter, okBtn })  → a 3 × 4 keypad (1–9 · ⌫ 0 ✓) under the input, always visible (the staff PIN box).
//     okBtn = an existing button that becomes the ✓ key (keeps its id, its listeners and its label).
//   MoHeatNumpad.steppers(root)                     → every <input type="number"> under root gets − / + buttons, and a tap on the
//                                                     field opens the keypad in a pop-up (✓ writes the number, ✕ keeps the old one).
// The fields stay real inputs: a physical keyboard still types into them. inputmode="none" keeps Windows' own touch keyboard away.
// Digits never appear in plain text in a password field (the browser draws dots). Works with touch and mouse (click events).
(() => {
  const LBL = { ja: { del: '1 文字消す', ok: 'OK', cancel: 'キャンセル', minus: '減らす', plus: '増やす' }, en: { del: 'Delete', ok: 'OK', cancel: 'Cancel', minus: 'Less', plus: 'More' },
    zh: { del: '删除', ok: '确定', cancel: '取消', minus: '减少', plus: '增加' } };
  const lang = () => { const on = document.querySelector('.sh-lang button.on, .sh-lang button[aria-pressed="true"]'); const l = on?.dataset.sl || document.documentElement.lang || 'ja'; return LBL[l] ? l : 'ja'; };
  const T = (k) => LBL[lang()][k];
  const css = `
.np-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 12px 0 4px; }
.np-grid button, .np-step { min-width: 64px; min-height: 64px; height: clamp(64px, 8.4vh, 84px); border-radius: 18px; border: 1px solid rgba(255,255,255,.28);
  background: rgba(255,255,255,.08); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); color: inherit; font: 600 clamp(24px, 3.4vh, 32px)/1 var(--head, var(--ff, Inter, "Noto Sans JP", sans-serif));
  display: flex; align-items: center; justify-content: center; padding: 0; cursor: pointer; touch-action: manipulation; -webkit-user-select: none; user-select: none; -webkit-tap-highlight-color: transparent; }
.np-grid button:active, .np-step:active { background: rgba(255,255,255,.22); transform: scale(.97); }
.np-grid button.np-ok, .np-grid button.go { background: var(--paper, #f4efe6) !important; color: #161214 !important; border-color: var(--paper, #f4efe6) !important; font-size: clamp(20px, 2.8vh, 26px); }
.np-grid button.np-del { font-size: clamp(22px, 3vh, 28px); }
.np-dots { letter-spacing: .35em !important; }
.np-num { display: inline-flex; align-items: center; gap: 8px; vertical-align: middle; }
.np-num .np-step { min-height: 64px; height: 64px; width: 64px; font-size: 30px; }
.np-num input { min-height: 56px; font-size: 22px; text-align: center; }
.np-pop { position: fixed; inset: 0; z-index: 300; display: flex; align-items: center; justify-content: center; background: rgba(4,3,8,.55); }
.np-pop[hidden] { display: none; }
.np-card { width: min(380px, 92vw); padding: 24px; border-radius: 28px; border: 1px solid rgba(255,255,255,.2); background: rgba(24,20,30,.72); -webkit-backdrop-filter: blur(18px); backdrop-filter: blur(18px); color: #f4efe6; text-align: center; }
.np-card .np-show { min-height: 64px; border-radius: 18px; border: 1px solid rgba(255,255,255,.2); background: rgba(255,255,255,.06); font: 600 34px/64px var(--head, Inter, sans-serif); letter-spacing: .08em; }
.np-card .np-label { font-size: 18px; opacity: .8; margin-bottom: 10px; }
.np-card .np-cancel { width: 100%; margin-top: 8px; min-height: 64px; border-radius: 999px; border: 1px solid rgba(255,255,255,.28); background: transparent; color: inherit; font: 600 20px/1 var(--head, Inter, sans-serif); cursor: pointer; }
`;
  const style = () => { if (document.getElementById('np-css')) return; const s = document.createElement('style'); s.id = 'np-css'; s.textContent = css; document.head.appendChild(s); };
  const key = (txt, cls, aria) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = txt; if (cls) b.className = cls; if (aria) b.setAttribute('aria-label', aria); return b; };
  const fire = (el, t) => el.dispatchEvent(new Event(t, { bubbles: true }));

  // a keypad that edits get() / set(); returns the grid element
  function grid(get, set, max, onEnter, okBtn) {
    const g = document.createElement('div'); g.className = 'np-grid';
    for (const d of '123456789') g.appendChild(key(d)).addEventListener('click', () => { const v = get(); if (v.length < max) set(v + d); });
    const del = g.appendChild(key('⌫', 'np-del')); del.addEventListener('click', () => set(get().slice(0, -1)));
    g.appendChild(key('0')).addEventListener('click', () => { const v = get(); if (v.length < max) set(v + '0'); });
    if (okBtn) { okBtn.classList.add('np-ok'); g.appendChild(okBtn); } else g.appendChild(key(T('ok'), 'np-ok')).addEventListener('click', () => onEnter?.());
    g.addEventListener('pointerdown', () => { del.setAttribute('aria-label', T('del')); });
    del.setAttribute('aria-label', T('del'));
    return g;
  }

  function inline(input, o = {}) {
    style(); if (input.dataset.np) return; input.dataset.np = '1';
    input.setAttribute('inputmode', 'none'); input.classList.add('np-dots');
    const max = +input.maxLength > 0 ? +input.maxLength : 8;
    const g = grid(() => input.value, (v) => { input.value = v; fire(input, 'input'); }, max, o.onEnter, o.okBtn);
    input.insertAdjacentElement('afterend', g);
    return g;
  }

  let pop = null;
  function popup(input) {
    style();
    if (!pop) { pop = document.createElement('div'); pop.className = 'np-pop'; pop.hidden = true; document.body.appendChild(pop); }
    let v = '';
    const lab = input.closest('label')?.firstChild?.textContent?.trim() || '';
    const secret = input.type === 'password', max = secret ? (+input.maxLength > 0 ? +input.maxLength : 8) : Math.max(2, String(input.max || '9999').length);
    pop.innerHTML = `<div class="np-card" role="dialog"><div class="np-label"></div><div class="np-show"></div></div>`;
    const card = pop.firstChild, show = card.querySelector('.np-show'); card.querySelector('.np-label').textContent = lab;
    const paint = () => { show.textContent = secret ? '•'.repeat(v.length) || '·' : v || input.value || '0'; show.style.opacity = v ? 1 : .45; };
    const close = () => { pop.hidden = true; };
    const ok = () => { if (secret) { input.value = v; fire(input, 'input'); fire(input, 'change'); close(); return; } if (v !== '') { let n = +v; if (input.min !== '') n = Math.max(+input.min, n); if (input.max !== '') n = Math.min(+input.max, n); input.value = n; fire(input, 'input'); fire(input, 'change'); } close(); };
    card.appendChild(grid(() => v, (x) => { v = secret ? x : x.replace(/^0+(?=\d)/, ''); paint(); }, max, ok));
    const c = card.appendChild(key(T('cancel'), 'np-cancel')); c.addEventListener('click', close);
    pop.onclick = (e) => { if (e.target === pop) close(); };
    paint(); pop.hidden = false;
  }

  // a TAP (touch / pen) on the field opens the keypad pop-up — on 'click', after the tap is over (opening it on pointerup let the same
  // tap's click land on the pop-up's backdrop and close it again); a mouse click still just focuses the field (physical keyboard)
  function onTap(input) {
    let pt = '';
    input.addEventListener('pointerdown', (e) => { pt = e.pointerType; });
    input.addEventListener('click', () => { if (pt === 'touch' || pt === 'pen') { input.blur(); popup(input); } pt = ''; });
  }

  function steppers(root) {
    style();
    root.querySelectorAll('input[type="password"][inputmode="numeric"]').forEach((input) => {   // e.g. the staff panel's "New PIN": the keypad in a pop-up (dots only)
      if (input.dataset.np) return; input.dataset.np = '1'; input.setAttribute('inputmode', 'none');
      onTap(input);
    });
    root.querySelectorAll('input[type="number"]').forEach((input) => {
      if (input.dataset.np) return; input.dataset.np = '1'; input.setAttribute('inputmode', 'none');
      const wrap = document.createElement('span'); wrap.className = 'np-num'; input.replaceWith(wrap);
      const minus = key('−', 'np-step', T('minus')), plus = key('+', 'np-step', T('plus'));
      wrap.append(minus, input, plus);
      const step = (dir) => { const s = +input.step || 1; let n = (+input.value || 0) + dir * s; if (input.min !== '') n = Math.max(+input.min, n); if (input.max !== '') n = Math.min(+input.max, n); input.value = n; fire(input, 'input'); fire(input, 'change'); };
      minus.addEventListener('click', () => step(-1)); plus.addEventListener('click', () => step(1));
      onTap(input);
    });
  }

  window.MoHeatNumpad = { inline, popup, steppers };
})();
