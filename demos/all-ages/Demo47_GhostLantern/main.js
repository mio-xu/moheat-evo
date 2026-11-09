// 『ひやっと！おばけやしきの ちょうちんばん』 Lantern Keeper of the Spooky House — all-ages game (proposal A2). A ghost's cold reaches the ear on its
// side before you see it; point the warm candle lantern that way and it flees. Engine = ../../shared/story.js (cfg.script: the game's own flow);
// lines.js (lines, stages), media/layers.js (art), project/thermal_plan.json (sources, driven by the game state here). Rule card: script.md
// (special setting told in b03 / y02: ghosts are chilly; Yurari's whisper is cool). Colours: ghost cold = blue-white, candle = orange.
(() => {
  const S = window.MoHeatStory, Lines = window.LANTERN_LINES, W = 1920, H = 1080, QS = new URLSearchParams(location.search);
  const rnd = (a, b) => a + Math.random() * (b - a), clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const SP = { slow: 5, mid: 3.8, fast: 2.8 }, AZ = { left: -90, right: 90, behind: 180 };
  const SPR = ['ghost_kasa', 'ghost_white', 'ghost_wisp'].map((n) => { const im = new Image(); im.src = `media/art/char_${n}.webp`; return im; });
  const G = { aim: null, cur: null, hearts: 3, shooed: 0, sweets: 0, touched: 0, ctl: false, night: 0 };
  const stage = document.getElementById('stage');
  // the three lantern buttons + 「あっちいけ〜！」 (say it): plain text, one row above the subtitles; judged by shared/voice.js
  const ctl = document.createElement('div'); ctl.id = 'lanternCtl'; ctl.className = 'choices';
  ctl.innerHTML = [['left', 'ひだり', 'Left', 'ひだり|左|left|左边'], ['up', 'うしろ', 'Behind', 'うしろ|後ろ|たかく|上|behind|back|up|后面|上面'], ['right', 'みぎ', 'Right', 'みぎ|右|right|右边'], ['shoo', 'あっちいけ！', 'Go away!', 'あっちいけ|go away|shoo|走开']]
    .map(([k, ja, en, v]) => `<button class="ch" data-k="${k}" data-voice="${v}"><b>${ja}</b><span>${en}</span></button>`).join('');
  stage.appendChild(ctl);
  function aim(k) {
    if (!G.ctl) return;   // the game is not asking
    if (!G.cur && k === 'shoo') return; if (k === 'shoo') k = G.cur.side === 'behind' ? 'up' : G.cur.side;
    G.aim = k; E0.fx.swish(k === 'left' ? -1.2 : k === 'right' ? 1.2 : 0, .35);
  }
  ctl.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => aim(b.dataset.k)));
  addEventListener('keydown', (e) => { if (!G.ctl || e.repeat) return; const k = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up' }[e.code]; if (k) { e.preventDefault(); e.stopPropagation(); aim(k); } }, true);
  const showCtl = (v) => { G.ctl = v; ctl.classList.toggle('show', v); if (!v) G.aim = null; };
  let E0 = null, spIdx = 0;
  const giggle = (az) => { const { shot, tone } = E0.A.lib; const f = rnd(520, 760); shot(az, 1.6, .3, (o) => { for (let i = 0; i < 5; i++) tone(o, f * (1 + i * .08) * (i % 2 ? 1.2 : 1), .13, .06, i * .12, 'triangle', .01); }, 1); };
  const squeal = (az) => { const { shot, tone } = E0.A.lib; shot(az, 1.2, .3, (o) => { for (let i = 0; i < 6; i++) tone(o, 900 + i * 180, .09, .05, i * .05, 'square', .004); }, .7); };
  function ghost(g, i) {
    return new Promise((res) => { const side = g.from, az = AZ[side]; E0.fx.rustle(az * Math.PI / 180, 3); giggle(Math.sign(az) * 1.2);
      G.cur = { side, az, k: 0, dur: SP[g.speed] || (g.from === 'behind' ? 3.6 : 3.4), sp: spIdx++ % 3, flee: 0, done: res, hurt: false }; if (Math.random() < .5) giggle(Math.sign(az) * 1.2); });
  }
  async function ghosts(E, my, st, calls) {
    showCtl(true);
    let n = 0;
    for (const g of st.ghosts) {
      if (g.from.startsWith('false')) {       // a false alarm: a real draught + wind chime, no giggle
        showCtl(false); E.amb('draught', 'cool', 80, .35); E.fx.bell(1.1, 1.6); await E.sleep(1.2); E.alive(my);
        await E.say(g.line, 'near');
        const c = st.choice, i = await E.choice([{ ja: c.ja_a, en: c.en_a }, { ja: c.ja_b, en: c.en_b }], 18, E.ALT ? 1 : 0); E.alive(my);
        E.amb('draught', 'cool', 80, 0); await E.say(g.ok, 'near'); showCtl(true); await E.sleep(.8); E.alive(my); continue;
      }
      if (calls && n < 2) await E.say(g.from === 'left' ? 'b19' : g.from === 'right' ? 'b20' : 'b21', 'near');
      const hit = await ghost(g, n); E.alive(my); n++;
      if (hit) { E.S.view = st.id === 'hall' ? 'hall_hit' : E.S.view; if (!G.touched++) await E.say(st.hit_line || 'b09', 'near'); E.S.view = st.id + '_B'; }
      else if (G.shooed % 3 === 1) await E.say('b22', 'near');
      await E.sleep(rnd(.8, 1.6)); E.alive(my);
      if (st.sweets && n === 3) await sweets(E, my, st);
    }
    showCtl(false);
  }
  function sweets(E, my, st) {   // three candies roll out: tap them (the voice is free here: b08)
    return new Promise(async (res) => { showCtl(false); await E.say(st.sweets_line, 'near');
      const box = document.createElement('div'); box.id = 'sweets'; box.innerHTML = [[.2, .58], [.5, .48], [.82, .6]].map(([x, y], i) => `<button class="sweet" data-i="${i}" style="left:${x * 100}%;top:${y * 100}%" aria-label="candy"></button>`).join(''); stage.appendChild(box);
      const done = () => { clearTimeout(tm); box.remove(); showCtl(true); res(); }, tm = setTimeout(done, E.pure() || E.AUTO ? 3200 : 10000);
      box.querySelectorAll('button').forEach((b) => b.addEventListener('pointerdown', () => { E.fx.pop(0, .5); G.sweets++; b.remove(); if (!box.children.length) done(); }));
    });
  }
  async function game(E, my) {
    E0 = E; const SS = Lines.stages;
    for (let i = 0; i < SS.length; i++) {
      const st = SS[i]; E.setStep(i); E.S.fade = 0; E.S.step = E.cfg.data.steps[i]; G.dark = !!st.dark; beds(E, st.id); air(E, st.id);
      if (st.id === 'yurari') { await yurari(E, my, st); break; }
      E.S.view = st.id + '_B';
      await E.sleep(.7); E.alive(my);
      for (const id of st.lines) { if (id === 'b07') E.S.view = 'hall_ghosts'; if (id === 'b11') E.S.view = 'room_behind'; if (id === 'b05') { E.S.view = 'gate_ghost'; E.pulse('@tut', 'cool', -90, .45, .8, 1.4, .6); } await E.say(id, 'near'); E.alive(my); }
      if (!st.dark) E.S.view = st.id + '_B';
      await ghosts(E, my, st, !st.dark); E.alive(my);
      for (const id of st.after || []) { if (st.id === 'kura') E.S.view = 'kura_win'; G.dark = false; await E.say(id, 'near'); }
      E.S.fade = 1; await E.sleep(1.3); E.alive(my);
    }
  }
  async function yurari(E, my, st) {
    E.S.view = 'yurari_far'; await E.sleep(.8); E.alive(my);
    await E.say('y01', 'left'); E.S.view = 'yurari_ear'; E.fx.rustle(-1.3, .25); await E.sleep(.4); E.alive(my);
    await E.say('y02', 'left_ear'); await E.say('y03', 'left_ear');
    const c = st.choice, i = await E.choice([{ ja: c.ja_a, en: c.en_a }, { ja: c.ja_b, en: c.en_b }], 22, E.ALT ? 1 : 0); E.alive(my);
    E.S.view = 'yurari_happy'; await E.say(i ? 'y04b' : 'y04a', 'left');
    E.S.view = 'finale'; G.fw = 1; for (const id of ['b17', 'y05', 'b18']) { await E.say(id, id[0] === 'y' ? 'left' : 'near'); }
    E.S.view = 'yurari_ear'; E.fx.rustle(-1.3, .25); await E.sleep(.4); E.alive(my); await E.say('y06', 'left_ear');
    await E.sleep(1.4); E.alive(my); G.fw = 0; E.S.fade = 1; await E.sleep(1.8);
  }
  const BEDS = { gate: [['festival', 'night', -.8, 5, .25]], hall: [['room', 'room', 0, 4, .24]], room: [['room', 'room', 0, 4, .22], ['night', 'night', .9, 5, .18]], kura: [['room', 'room', 0, 3, .3]], yurari: [['night', 'night', 0, 5, .2]] };
  // the air of each place (real, visible): summer night outside; the old house is chilly (ghosts), the andon lamp and the draught have sides, the storehouse is cold
  const AIR = { gate: { night: ['warm', 0, .12], breeze: ['cool', -40, .16] }, hall: { draught: ['cool', 0, .2] }, room: { draught: ['cool', -70, .22], andon: ['warm', 75, .2] }, kura: { cellar: ['cool', 0, .28] }, yurari: { night: ['warm', 0, .12], chill: ['cool', -60, .2] } };
  const air = (E, id) => { for (const n of ['night', 'breeze', 'draught', 'andon', 'cellar', 'chill']) E.amb(n, 'cool', 0, 0); for (const [n, [k, az, l]] of Object.entries(AIR[id] || {})) E.amb(n, k, az, l); };
  const beds = (E, k) => { const want = BEDS[k] || [], names = new Set(want.map((b) => b[0])); for (const [n, L] of Object.entries(E.A.loops)) if (n.startsWith('bg:') && !names.has(n.slice(3))) L.set(0, .6); for (const [n, kind, az, d, g] of want) { const L = E.A.loop('bg:' + n, kind, az, d); L?.at(az, d, .4); L?.set(g, .9); } };
  const API = S.run({
    ns: 'LANTERN', data: { ...Lines, steps: Lines.stages.map((s) => ({ id: s.id, ja: s.ja, en: s.en, zh: s.zh, beats: [] })) }, voice: window.LANTERN_VOICE, bg: '#100f1e', firstView: 'gate_B',
    preload: ['gate_B', 'gate_ghost', 'hall_B', 'hall_ghosts', 'hall_hit', 'room_B', 'room_behind', 'kura_B', 'kura_win', 'yurari_far', 'yurari_ear', 'yurari_happy', 'finale'],
    plan: { events: {}, smoothing: {}, voice: { az: { near: 0, left: -60, left_ear: -90, right_ear: 90 }, distance: { near: .6, left: .28, left_ear: 1, right_ear: 1 }, front_split: 1 } },
    voiceKind: (w) => (w === 'Y' ? 'cool' : 'warm'),       // Yurari is chilly (special setting, y02)
    script: game,
    onBegin: (E) => { E0 = E; Object.assign(G, { aim: null, cur: null, hearts: 3, shooed: 0, sweets: 0, touched: 0, ctl: false, dark: false, fw: 0 }); ctl.classList.remove('show'); },
    onFinish: () => { showCtl(false); document.getElementById('sweets')?.remove(); },
    endText: () => (G.shooed ? `おばけを ${G.shooed} ひき おいはらった · ${G.shooed} ghosts chased away` : ''),
    sources(add, E) {
      const c = G.cur; if (c && !c.flee) add(c.az, 'cool', .55 * clamp(c.k));
      add(G.aim === 'left' ? -90 : G.aim === 'right' ? 90 : G.aim === 'up' ? 0 : 60, 'warm', G.aim === 'up' ? .4 : G.aim ? .5 : .3);   // the candle in your right hand; turned or held up when you aim it
    },
    update(dt, E) {
      const c = G.cur; if (!c) return;
      if (c.flee) { c.flee += dt / .55; if (c.flee >= 1) { G.cur = null; setTimeout(() => { G.aim = null; c.done(c.hit); }, 500); } return; }
      c.k += dt / c.dur;
      if (E.AUTO && (G.shooed + G.touched) % (E.ALT ? 3 : 5) !== 2 && c.k > .38) G.aim = c.side === 'behind' ? 'up' : c.side;
      const want = c.side === 'behind' ? 'up' : c.side;
      if (G.aim === want && c.k > .12) { c.flee = .001; c.hit = false; G.shooed++; squeal(Math.sign(c.az) * 1.2); return; }
      if (c.k >= 1) { c.flee = .001; c.hit = true; G.hearts = Math.max(0, G.hearts - 1); E.pulse('@touch', 'cool', c.az, .9, .05, .3, .3); E.fx.thud(Math.sign(c.az) * 1, .3); giggle(Math.sign(c.az) * 1.2); }
    },
    draw(E, dt) {
      const ctx = E.ctx, Sx = E.S, t = Sx.t, c = G.cur, s = c && SPR[c.sp];
      if (G.dark) { ctx.save(); const g = ctx.createRadialGradient(W * .5, H * .7, 120, W * .5, H * .7, H * .75); g.addColorStop(0, 'rgba(6,6,16,0)'); g.addColorStop(1, 'rgba(6,6,16,.92)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore(); }
      if (c && s?.complete && !G.dark) {
        const k = c.flee ? 1 - c.flee : clamp(c.k), behind = c.side === 'behind', sign = Math.sign(c.az) || 1, h = H * (behind ? .28 + .14 * k : .34 + .3 * k), w = h * s.naturalWidth / s.naturalHeight;
        const x = behind ? W * .5 + Math.sin(t * 1.5) * 60 : W * .5 + sign * W * (.62 - .36 * k), y = (behind ? H * .3 : H * .74) + Math.sin(t * 3) * 14 + (c.flee ? -c.flee * 140 : 0);
        ctx.save(); ctx.globalAlpha = (behind ? .85 * k : 1) * (c.flee && c.hit ? 1 - c.flee : c.flee ? 1 - c.flee : 1); ctx.drawImage(s, x - w / 2, y - h, w, h); ctx.restore();
      }
      if (c && !c.flee && !G.dark) { const a = .55 * clamp(c.k); if (c.side === 'behind') { E.edge('left', '150,205,255', a * .8, .22); E.edge('right', '150,205,255', a * .8, .22); } else E.edge(c.az < 0 ? 'left' : 'right', '150,205,255', a, .32); }
      if (G.aim) { const fl = window.MoHeatLayers?.flicker?.() ?? 1; if (G.aim === 'up') E.glow(W * .5, H * .2, W * .36, '255,160,70', .42 * fl); else E.edge(G.aim === 'left' ? 'left' : 'right', '255,150,60', .5 * fl, .36); }
      const touch = E.pulses.find((p) => p.name === '@touch'); if (touch) { ctx.fillStyle = `rgba(180,220,255,${.55 * touch.lev})`; ctx.fillRect(0, 0, W, H); }
      if (G.fw) { fireworks(E, dt); }
      // hearts (three) in the corner of the picture: drawn shapes (plain interface, no pictographs)
      if (E.S.mode === 'story' && G.ctl) for (let i = 0; i < 3; i++) { const x = 70 + i * 62, y = 74; ctx.save(); ctx.fillStyle = i < G.hearts ? '#ff7a8f' : 'rgba(255,255,255,.22)'; ctx.translate(x, y); ctx.scale(1.15, 1.15); ctx.beginPath(); ctx.moveTo(0, 12); ctx.bezierCurveTo(-24, -8, -12, -24, 0, -12); ctx.bezierCurveTo(12, -24, 24, -8, 0, 12); ctx.fill(); ctx.restore(); }
    },
  });
  for (const [ja, z] of [['ひだり', '左'], ['うしろ', '后面'], ['みぎ', '右'], ['あっちいけ！', '走开！']]) API.E.zh(ja, z);
  for (let n = 1; n <= 30; n++) API.E.zh(`おばけを ${n} ひき おいはらった`, `赶走了 ${n} 只鬼`);
  let fwT = 0;
  function fireworks(E, dt) {
    fwT -= dt; if (fwT > 0) return; fwT = rnd(1, 1.8);
    const x = W * rnd(.42, .76), y = H * rnd(.16, .34), col = ['255,190,120', '255,140,190', '150,220,255', '255,230,140'][Math.floor(rnd(0, 4))];
    for (let i = 0; i < 46; i++) { const a = rnd(0, 6.28), v = rnd(120, 340); E.spark(x, y, { rgb: col, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 220, r: rnd(2.5, 4.5), max: rnd(.8, 1.5), drag: .9 }); }
    E.fx.thud(.6, 4); setTimeout(() => E.fx.sparkle(.6, 3, 5), 150);
  }
  // just-listen mode (shared/shell.js): the visible hand taps the candies; the lantern aims by itself in update()
  if (window.MoHeatShell) window.MoHeatShell.autoplay = (H2) => {
    const sw = document.querySelector('#sweets .sweet');
    if (sw) { H2.run(() => H2.tap(sw)); return true; }
    if (G.ctl) { const c = G.cur, want = c && (c.side === 'behind' ? 'up' : c.side), b = c && !c.flee && G.aim !== want && c.k > .2 ? ctl.querySelector(`[data-k="${want}"]`) : null; if (b) { H2.run(() => H2.tap(b)); } return true; }
    return false;
  };
})();
