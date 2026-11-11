// shared/engine/play.js — MoHeatEngine.play(o): subtitles, voiced lines and the player's turn (choices / actions / press-and-hold)
// as every own-engine demo copied them. DOM: #subs #subJa #subEn · #choices (.ch buttons) · #act (.act-btn) — the classes
// shared/voice.js (answer by voice), shell.js (pure mode answers itself) and subs.js (translations) work on.
//   o.lines      { id: [ja, en] }               o.sound    window.HTAudio          o.state() → S (say sets S.pos)
//   o.run()      → the story run token (a line that ends after a new start / finish throws 'stopped')
//   o.sayGain(where) → gain (dist < .2 ? 1.8 : 1.45)        o.subGap  pause after a line before the subtitle clears (.35 s)
//   o.autoPick(opts) → the index ?auto picks (?alt ? 1 : 0)  o.autoAfter  s before ?auto answers a choice (1.2) / an action (.9)
// Returns { sub(ja, en), say(id, where, { sub, gain }), talking(), alive(my), choice(opts, timeout), action(icon, ja, en, timeout),
// hold(icon, ja, en, sec, onTick), stillHold(sec, { icon, ja, en, lose, giveUp }) → true = held to the end }.
(() => {
  const ME = window.MoHeatEngine = window.MoHeatEngine || {};
  if (ME.play) return;
  ME.play = (o) => {
    const $ = (id) => document.getElementById(id), QS = new URLSearchParams(location.search), AUTO = QS.has('auto'), ALT = QS.has('alt');
    const sleep = (s) => new Promise((r) => setTimeout(r, s * 1000));
    const SND = o.sound, LINES = o.lines, GAP = o.subGap ?? .35;
    const sayGain = o.sayGain || ((where) => (where.dist < .2 ? 1.8 : 1.45));
    const autoPick = o.autoPick || (() => (ALT ? 1 : 0));
    const subJa = $('subJa'), subEn = $('subEn'), subs = $('subs');
    function sub(ja, en) { subJa.textContent = ja || ''; subEn.textContent = en || ''; subs.classList.toggle('show', !!ja); }
    let talking = 0;
    async function say(id, where = { az: 0, dist: .8 }, opt = {}) {
      const my = o.run(); const [ja, en] = opt.sub || LINES[id]; o.state().pos = where;
      sub(ja, en); talking++;
      await SND.say(id, where, opt.gain ?? sayGain(where));
      talking--; if (my !== o.run()) throw new Error('stopped');
      await sleep(GAP); sub('', '');
    }
    const alive = (my) => { if (my !== o.run()) throw new Error('stopped'); };

    const choiceEl = $('choices'), actEl = $('act');
    function choice(opts, timeout = 20) {
      return new Promise((res) => {
        choiceEl.innerHTML = opts.map((op, i) => `<button class="ch" data-i="${i}"${op[2] ? ` data-voice="${op[2]}"` : ''}><b>${op[0]}</b><span>${op[1]}</span></button>`).join('');   // op[2]: what to say (shared/voice.js)
        choiceEl.classList.add('show');
        const done = (i) => { clearTimeout(tm); clearTimeout(au); choiceEl.classList.remove('show'); choiceEl.innerHTML = ''; res(i); };
        choiceEl.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => done(+b.dataset.i)));
        const tm = setTimeout(() => done(0), timeout * 1000), au = AUTO ? setTimeout(() => done(autoPick(opts)), (o.autoAfter ?? 1.2) * 1000) : 0;
      });
    }
    function action(icon, ja, en, timeout = 20) {
      return new Promise((res) => {
        actEl.innerHTML = `<button class="act-btn"><i>${icon}</i><b>${ja}</b><span>${en}</span></button>`; actEl.classList.add('show');
        const done = () => { clearTimeout(tm); clearTimeout(au); actEl.classList.remove('show'); actEl.innerHTML = ''; res(); };
        actEl.querySelector('button').addEventListener('click', done); const tm = setTimeout(done, timeout * 1000), au = AUTO ? setTimeout(done, (o.actionAutoAfter ?? .9) * 1000) : 0;
      });
    }
    // press and hold until the bar is full (Space works too); never pressed in 18 s: it fills by itself
    function hold(icon, ja, en, sec, onTick) {
      return new Promise((res) => {
        actEl.innerHTML = `<button class="act-btn hold"><i>${icon}</i><b>${ja}</b><span>${en}</span><em class="bar"><u></u></em></button>`; actEl.classList.add('show');
        const b = actEl.querySelector('button'), bar = b.querySelector('u'); let down = false, k = 0, last = performance.now(); const t0 = last;
        const set = (v) => (e) => { e?.preventDefault?.(); down = v; b.classList.toggle('down', v); };
        b.addEventListener('pointerdown', set(true)); for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, set(false));
        const key = (v) => (e) => { if (e.code === 'Space') { e.preventDefault(); down = v; b.classList.toggle('down', v); } };
        const kd = key(true), ku = key(false); addEventListener('keydown', kd); addEventListener('keyup', ku);
        const tick = () => {
          const n = performance.now(), dt = (n - last) / 1000; last = n;
          if (down || AUTO || n - t0 > 18000) k = Math.min(1, k + dt / sec); onTick?.(down || AUTO, k); bar.style.width = `${k * 100}%`;
          if (k >= 1) { removeEventListener('keydown', kd); removeEventListener('keyup', ku); actEl.classList.remove('show'); actEl.innerHTML = ''; res(); return; }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }
    // a contest of keeping still: hold until the bar is full → true; let go (> .35 s) after you started → false.
    // Never pressed in giveUp s: it starts by itself. ?auto holds; ?auto&alt lets go at 45 % (the losing path) unless lose: false.
    function stillHold(sec, opt = {}) {
      const icon = opt.icon ?? '🎇', ja = opt.ja ?? '動かない（長押し）', en = opt.en ?? 'Don\'t move (press and hold)', giveUp = (opt.giveUp ?? 15) * 1000;
      return new Promise((res) => {
        actEl.innerHTML = `<button class="act-btn hold"><i>${icon}</i><b>${ja}</b><span>${en}</span><em class="bar"><u></u></em></button>`; actEl.classList.add('show');
        const b = actEl.querySelector('button'), bar = b.querySelector('u'); let down = false, k = 0, upFor = 0, last = performance.now(); const t0 = last;
        const autoLose = AUTO && ALT && opt.lose !== false;
        const set = (v) => (e) => { e?.preventDefault?.(); down = v; b.classList.toggle('down', v); };
        b.addEventListener('pointerdown', set(true)); for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, set(false));
        const key = (v) => (e) => { if (e.code === 'Space') { e.preventDefault(); down = v; b.classList.toggle('down', v); } };
        const kd = key(true), ku = key(false); addEventListener('keydown', kd); addEventListener('keyup', ku);
        const end = (win) => { removeEventListener('keydown', kd); removeEventListener('keyup', ku); actEl.classList.remove('show'); actEl.innerHTML = ''; res(win); };
        const tick = () => {
          const n = performance.now(), dt = (n - last) / 1000; last = n;
          const holding = down || (AUTO && !(autoLose && k > .45)) || (k === 0 && n - t0 > giveUp);
          if (holding) { k = Math.min(1, k + dt / sec); upFor = 0; } else if (k > .04) upFor += dt;
          bar.style.width = `${k * 100}%`;
          if (k >= 1) return end(true);
          if (upFor > .35) return end(false);   // you moved
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }
    return { sub, say, talking: () => talking, alive, choice, action, hold, stillHold, choiceEl, actEl };
  };
})();
