// PG.ui — what the player touches: tap-to-continue lines, choices, toasts, floating numbers, the ring tap game.
// Everything returns a Promise, so a game's flow reads top to bottom:  await say(…); const i = await choose([…]);
(() => {
  const PG = window.PG, sheets = ['dlg', 'choices']; let fx, toastTimer = 0;

  PG.ui = {
    onTap: null,          // the current "tap anywhere" handler (one at a time)
    speaker: () => '',    // name shown for a character line; the game sets it
    init() {
      fx = PG.$('fx');
      PG.app.addEventListener('pointerdown', (ev) => { PG.audioOn(); if (ev.target.closest('button:not(:disabled)')) { try { navigator.vibrate && navigator.vibrate(8); } catch {} }   // a small buzz on every button (phones that have it)
        if (ev.target.closest('button, select, input, #gear, [data-notap]')) return; if (PG.ui.onTap) PG.ui.onTap(ev); });
      // keyboard (desktop): Space / Enter = tap to go on, or the main button on screen; 1–9 = a choice; Esc = close ⚙
      addEventListener('keydown', (ev) => {
        if (ev.defaultPrevented || ev.target.closest?.('input, select, textarea')) return;
        if (ev.key === 'Escape' && !PG.$('gear').hidden) { PG.$('gear').hidden = true; return; }
        if (!PG.$('gear').hidden || (PG.rhythm && PG.rhythm.active)) return;
        if (ev.key === ' ' || ev.key === 'Enter') {
          if (ev.repeat) { ev.preventDefault(); return; }
          if (PG.ui.onTap) { ev.preventDefault(); PG.ui.onTap(ev); return; }
          const go = [...PG.app.querySelectorAll('.go:not(:disabled)')].find((b) => b.offsetParent && !b.closest('[hidden], #gear')); if (go) { ev.preventDefault(); go.click(); }
          return;
        }
        if (/^[1-9]$/.test(ev.key) && !PG.$('choices').hidden) { const b = PG.$('choices').children[+ev.key - 1]; if (b) { ev.preventDefault(); b.click(); } }
      });
    },
    /** A game adds its own bottom sheets (ids) so that only one is ever shown. */
    addSheets(...ids) { sheets.push(...ids); },
    sheet(id) { sheets.forEach((s) => { PG.$(s).hidden = s !== id; }); },

    /** One line, typed out; tap = finish typing, tap again = go on.
     *  o.name: undefined = the character speaks (mouth moves, voice warms) · '' or a string = narration / someone else
     *  o.ear: 'L' | 'R' = she is at that ear · o.th: thermal pulse while the line shows (one state, or a list that alternates every second)
     *  o.voice: url of the spoken line (the mouth moves while it plays; tapping on skips it) · o.voiceDur: its length in s (typing keeps pace) */
    say(text, o = {}) {
      return new Promise((done) => {
        const $ = PG.$, box = $('dlg'), el = $('dlgText'), s = PG.T(text), speaks = o.name === undefined; PG.ui.sheet('dlg');
        $('dlgName').textContent = speaks ? PG.ui.speaker() : o.name; box.classList.remove('done'); el.textContent = ''; PG.stage.talking = speaks;
        // a voice is warm: in front of you both ears (up to .6), at one ear that ear (up to 1) and a little on the other. It follows how loud
        // she is right now; a line without a voice file is warm while it types. Silent again when she has finished.
        let i = 0, timer = 0, voiced = false; const chars = [...s];
        const warm = (k) => { if (!speaks) return; if (o.ear) { PG.Therm.voice(o.ear === 'L' ? 'R' : 'L', .22 * k); PG.Therm.voice(o.ear, (.45 + .55 * k) * (k > 0)); } else PG.Therm.voice(null, (.25 + .35 * k) * (k > 0)); };
        const heat = setInterval(() => warm(voiced ? PG.voice.level : i < chars.length ? .8 : 0), 80);
        if (o.th) PG.Therm.pulse(o.th, 60000);
        warm(.8); if (o.voice && speaks && !PG.AUTO) { voiced = true; PG.voice.play(o.voice).then(() => { voiced = false; if (i >= chars.length) PG.stage.talking = false; }); }
        const finish = () => { clearInterval(timer); el.textContent = s; box.classList.add('done'); PG.stage.talking = voiced; i = chars.length; if (PG.AUTO) setTimeout(tap, 10); };
        const tap = () => { if (i < chars.length) { finish(); return; } PG.ui.onTap = null; clearInterval(heat); PG.voice.stop(); PG.stage.talking = false; PG.sfx.next(); PG.Therm.quiet(); PG.Therm.pulse({}, 0); done(); };
        PG.ui.onTap = tap; if (PG.AUTO) { finish(); return; }
        timer = setInterval(() => { el.textContent += chars[i++]; if (i >= chars.length) finish(); }, o.voiceDur ? PG.clamp(o.voiceDur * 850 / chars.length, 26, 95) : 34);
      });
    },
    /** Buttons, one per entry ({ t: text }). Resolves with the index. (?auto picks at random, or ?pick=n.) */
    choose(list) {
      return new Promise((done) => {
        const box = PG.$('choices'); box.innerHTML = ''; PG.ui.sheet('choices'); PG.stage.talking = false;
        list.forEach((c, i) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.key = i + 1; b.textContent = PG.T(c.t); b.onclick = () => { PG.sfx.pick(); done(i); }; box.append(b); });
        if (PG.AUTO && PG.HOLD !== 'choice') setTimeout(() => done(PG.Q.get('pick') != null ? Math.min(list.length - 1, +PG.Q.get('pick')) : Math.floor(Math.random() * list.length)), 10);
      });
    },
    toast(text, ms = 1800) { const t = PG.$('toast'); t.textContent = text; t.classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), ms); },
    /** A number that floats up. i = position in a batch (two columns). */
    pop(text, i = 0, color = '') { const p = document.createElement('div'); p.className = 'pop'; p.textContent = text; if (color) p.style.color = color;
      // a LivLiv character on screen: the numbers float up beside her face, never over it (pg.ll.js sets the face zone --llfx / --llfy / --llfr)
      const st = PG.app.style, cx = parseFloat(st.getPropertyValue('--llfx')), fy = parseFloat(st.getPropertyValue('--llfy')), fr = parseFloat(st.getPropertyValue('--llfr')), W = PG.app.clientWidth, H = PG.app.clientHeight;
      if (PG.app.classList.contains('llFace') && fr > 0 && W) {
        const side = i % 2 ? 1 : -1, x = cx + side * fr * 1.25, y = fy + fr * (.9 + Math.floor(i / 2) * .5);   // left / right of the face, from the chin down
        p.style.left = `${PG.clamp(x / W * 100, 2, 98)}%`; p.style.top = `${PG.clamp(y / H * 100, 8, 70)}%`; p.style.translate = side < 0 ? '-100% 0' : '0 0';   // (translate, not transform: the rise animation owns transform)
      } else { p.style.left = `${22 + (i % 2) * 34}%`; p.style.top = `${34 + Math.floor(i / 2) * 6}%`; } p.style.animationDelay = `${i * .12}s`; fx.append(p); setTimeout(() => p.remove(), 1700 + i * 120); },
    /** A sparkle at frame pixels (x, y), or at a pointer event. */
    spark(x, y) { if (x && x.clientX != null) { const r = PG.app.getBoundingClientRect(); y = x.clientY - r.top; x = x.clientX - r.left; } const s = document.createElement('i'); s.className = 'spark'; s.style.left = `${x}px`; s.style.top = `${y}px`; fx.append(s); setTimeout(() => s.remove(), 720); },

    /** Three shrinking rings; tap when the ring meets the target. level 0… makes it faster. Resolves 'perfect' | 'good' | 'miss'. (?auto → ?grade or 'good') */
    tapGame(level = 0) {
      return new Promise((done) => {
        if (PG.AUTO && PG.HOLD !== 'tap') { done(PG.Q.get('grade') || 'good'); return; }
        const $ = PG.$, box = $('tapGame'), mv = $('tapMove'), word = $('tapWord'); PG.ui.sheet(null); box.hidden = false; $('tapMsg').textContent = PG.t('tap'); word.textContent = '';
        const grades = [], DUR = Math.max(760, 1250 - level * 45), FROM = 1.5, TO = .15, AT = .5; let t0 = 0, raf = 0, live = false;
        const scaleAt = (now) => FROM + (TO - FROM) * PG.clamp((now - t0) / DUR, 0, 1);
        const round = () => { if (grades.length >= 3) { end(); return; } t0 = performance.now() + 380; live = true; mv.style.opacity = .9; loop(); };
        const loop = () => { const now = performance.now(); mv.style.transform = `scale(${now < t0 ? FROM : scaleAt(now)})`; if (now - t0 >= DUR) { judge(TO); return; } raf = requestAnimationFrame(loop); };
        const judge = (sc) => {
          if (!live) return; live = false; cancelAnimationFrame(raf); const d = Math.abs(sc - AT), g = d < .075 ? 'perfect' : d < .2 ? 'good' : 'miss'; grades.push(g); word.textContent = PG.t(g); PG.sfx[g](); mv.style.opacity = .2;
          if (g === 'perfect') { PG.fx.burst('star', 50, 76, 10); PG.fx.flash('#fff', 220, .25); }
          if (g !== 'miss') { PG.stage.hop(); const r = PG.app.getBoundingClientRect(), b = $('tapRing').getBoundingClientRect(); for (let i = 0; i < (g === 'perfect' ? 6 : 2); i++) PG.ui.spark(b.left - r.left + b.width / 2 + (Math.random() - .5) * b.width, b.top - r.top + b.height / 2 + (Math.random() - .5) * b.height); }
          setTimeout(round, 520);
        };
        const end = () => { PG.ui.onTap = null; box.hidden = true; const n = (g) => grades.filter((x) => x === g).length; done(n('perfect') >= 2 ? 'perfect' : n('miss') >= 2 ? 'miss' : 'good'); };
        PG.ui.onTap = () => { const now = performance.now(); if (live && now >= t0) judge(scaleAt(now)); };
        round();
      });
    },
  };
})();
