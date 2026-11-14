// PG.rhythm — a two-lane rhythm layer (left half of the screen = left ear, right half = right ear) drawn on one canvas.
// A note: [time s, lane 0 | 1, 'w' warm (orange) | 'c' cool (blue)]  ·  a hold: [time, lane, kind, length s, beats]
//                                                             ·  a slide: a hold + [[seconds after its start, lane], …] = it crosses to that side then
//   tap  = touch when the note reaches the ring
//   hold = touch when its head reaches the ring and keep the finger down to its end; every beat inside counts (and keeps the combo),
//          lifting early loses the beats that are left, pressing late still catches the rest.
//   slide = a hold whose ribbon crosses to the other side: keep a finger down and move it across (or press there with the other hand).
//          The warmth / coolness moves from ear to ear with it.
// The game owns the music, the picture behind and the thermal output; this module draws, judges and reports the state every frame.
//   const r = await PG.rhythm.play({ audio, notes, end, leniency, onFrame(t, state) });   → { perfect, good, miss, maxCombo, acc, total, skipped }
//   state.combo · state.hold[lane] = 'w' | 'c' | null (a hold being held on that side right now)
// Bonus time: a combo of BONUS.at starts BONUS.sec seconds in which every note is hit by itself (perfect, with its pulse); state.bonus is
//   true then. The next one needs BONUS.at more combo after it ends. o.bonus: false switches it off.
//   PG.rhythm.stop()   ends the current play early (skipped: true)
// Keys (2026-11-14): one key per lane, set in ⚙ and saved (default F = left, J = right; ← / → always work too): PG.rhythm.keys, PG.rhythm.keyNames(). Sound delay (Bluetooth earbuds): PG.rhythm.offset (ms, saved) · PG.rhythm.calibrate() measures it by tapping.
(() => {
  const PG = window.PG, WARM = '255,122,60', COOL = '63,168,255';
  const TRAVEL = 1.5, HIT_Y = .76, TOP_Y = .12, WIN = { perfect: .07, good: .145 }, RELEASE = .16;   // RELEASE: a hold may be let go this early
  let cv, c, box, cur = null, offset = 0;

  function size() { const r = PG.app.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1); if (cv.width !== Math.round(r.width * d)) { cv.width = Math.round(r.width * d); cv.height = Math.round(r.height * d); } return { W: cv.width, H: cv.height, d }; }
  // the audio clock, smoothed between its coarse updates
  function clock(audio) { let aT = audio.currentTime, aP = performance.now(); return () => { const t = audio.currentTime, now = performance.now(); if (t !== aT) { aT = t; aP = now; } return audio.paused ? t : Math.min(aT + (now - aP) / 1000, aT + .25); }; }
  const rgbOf = (n) => (n.kind === 'c' ? COOL : WARM);
  const BONUS = { at: 24, sec: 7 };
  const CROSS = .22;   // s around a crossing where either side counts
  // which side a hold / slide is on at time t, and where its ribbon is drawn (the crossing is a short diagonal)
  const laneAt = (n, t) => { let l = n.lane; if (n.path) for (const [dt, ln] of n.path) if (t - n.t >= dt) l = ln; return l; };
  const nearCross = (n, t) => !!n.path && n.path.some(([dt]) => Math.abs(t - n.t - dt) <= CROSS);
  const posAt = (n, t) => { let l = n.lane; if (n.path) for (const [dt, ln] of n.path) { const k = (t - n.t - dt) / .24 + .5; if (k >= 1) l = ln; else if (k > 0) return l + (ln - l) * k; } return l; };

  // ---- pictures drawn once per size and reused every frame (glows are expensive to paint live on a phone)
  const sprites = new Map();
  function sprite(key, size, paint) { const k = `${key}:${Math.round(size)}`; if (!sprites.has(k)) { const cv2 = document.createElement('canvas'); cv2.width = cv2.height = Math.ceil(size); paint(cv2.getContext('2d'), size); sprites.set(k, cv2); } return sprites.get(k); }
  // a note: soft halo in its colour, a glossy body, a white rim, a bright core
  const noteSprite = (rgb, R) => sprite('n' + rgb, R * 4.4, (g, sz) => {
    const m = sz / 2; let gr = g.createRadialGradient(m, m, R * .7, m, m, R * 2.1); gr.addColorStop(0, `rgba(${rgb},.75)`); gr.addColorStop(.45, `rgba(${rgb},.28)`); gr.addColorStop(1, `rgba(${rgb},0)`); g.fillStyle = gr; g.fillRect(0, 0, sz, sz);
    gr = g.createRadialGradient(m - R * .3, m - R * .4, R * .1, m, m, R); gr.addColorStop(0, '#fff'); gr.addColorStop(.3, `rgba(${rgb},1)`); gr.addColorStop(1, `rgba(${rgb.split(',').map((v) => Math.round(v * .62)).join(',')},1)`); g.fillStyle = gr; g.beginPath(); g.arc(m, m, R, 0, 7); g.fill();
    g.lineWidth = R * .11; g.strokeStyle = 'rgba(255,255,255,.95)'; g.stroke();
    gr = g.createRadialGradient(m, m, 0, m, m, R * .46); gr.addColorStop(0, '#fff'); gr.addColorStop(.7, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(m, m, R * .46, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.ellipse(m - R * .42, m - R * .5, R * .2, R * .1, -.6, 0, 7); g.fill();   // a small highlight
  });
  // the ring to hit: a glass disc with a glowing white rim
  const ringSprite = (R) => sprite('ring', R * 4, (g, sz) => {
    const m = sz / 2; let gr = g.createRadialGradient(m, m, R * .8, m, m, R * 1.9); gr.addColorStop(0, 'rgba(255,255,255,.4)'); gr.addColorStop(.35, 'rgba(255,255,255,.12)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, sz, sz);
    gr = g.createRadialGradient(m, m - R * .3, R * .1, m, m, R); gr.addColorStop(0, 'rgba(255,255,255,.3)'); gr.addColorStop(1, 'rgba(255,255,255,.05)'); g.fillStyle = gr; g.beginPath(); g.arc(m, m, R, 0, 7); g.fill();
    g.lineWidth = R * .1; g.strokeStyle = '#fff'; g.stroke(); g.lineWidth = R * .035; g.strokeStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.arc(m, m, R * .72, 0, 7); g.stroke();
  });
  const blit = (im, x, y, a = 1, k = 1) => { c.globalAlpha = a; c.drawImage(im, x - im.width * k / 2, y - im.height * k / 2, im.width * k, im.height * k); c.globalAlpha = 1; };

  function draw(t, S) {
    const { W, H, d } = size(), U = PG.unit(W, H) * (PG.wide ? 1.2 : 1), hitY = H * HIT_Y, topY = H * TOP_Y, R = U * .07, X = PG.wide ? [W * .12, W * .88] : [W / 2 - U * .3, W / 2 + U * .3],   // landscape (phone, tablet and desktop alike, user 2026-11-14: one layout): the rings sit at the two sides, under the thumbs
       font = getComputedStyle(PG.app).fontFamily, now = performance.now();   // U: sizes and lane distance follow the base unit (wide screen: the lanes stay together in the middle)
    const yAt = (time) => hitY - (hitY - topY) * ((time - t) / TRAVEL), ring = ringSprite(R);
    c.clearRect(0, 0, W, H);
    let g = c.createLinearGradient(0, H * .3, 0, H); g.addColorStop(0, 'rgba(20,10,30,0)'); g.addColorStop(.75, 'rgba(20,10,30,.5)'); g.addColorStop(1, 'rgba(20,10,30,.72)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    // ---- the two lanes: a beam of light down to each ring (brighter, and in the note's colour, while that side is pressed), the rings themselves
    for (const ln of [0, 1]) {
      const press = S.held[ln] ? 1 : Math.max(0, 1 - (now - S.press[ln]) / 220), hold = S.hold[ln], tint = hold ? (hold === 'c' ? COOL : WARM) : '255,255,255', x = X[ln];
      c.globalCompositeOperation = 'lighter';
      g = c.createLinearGradient(0, topY, 0, hitY); g.addColorStop(0, `rgba(${tint},0)`); g.addColorStop(1, `rgba(${tint},${.07 + press * .16 + (hold ? .12 : 0)})`); c.fillStyle = g; c.fillRect(x - R * 1.15, topY, R * 2.3, hitY - topY);
      g = c.createLinearGradient(0, topY, 0, hitY); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,.35)'); c.fillStyle = g; c.fillRect(x - d, topY, 2 * d, hitY - topY);
      c.globalCompositeOperation = 'source-over';
      const breathe = 1 + .03 * Math.sin(now / 420 + ln * 2);
      if (hold || press > 0) { g = c.createRadialGradient(x, hitY, 0, x, hitY, R * 1.7); g.addColorStop(0, `rgba(${tint},${hold ? .7 : .55 * press})`); g.addColorStop(1, `rgba(${tint},0)`); c.fillStyle = g; c.fillRect(x - R * 1.7, hitY - R * 1.7, R * 3.4, R * 3.4); }
      blit(ring, x, hitY, 1, breathe * (1 - press * .06));
      if (!PG.touch) { const kn = PG.rhythm.keyNames()[ln], kh = U * .06; c.font = `800 ${U * .042}px ${font}`; const tw = Math.max(kh, c.measureText(kn).width + kh * .7), ky = PG.wide ? hitY - kh / 2 : hitY + R * 1.55, kx = PG.wide ? x + (ln ? -1 : 1) * (R * 1.75 + tw / 2) : x;   // wide: beside the ring on the inner side (the skip button sits under the right one)   // the key for this lane, as a key cap
        c.fillStyle = 'rgba(255,255,255,.92)'; c.beginPath(); c.roundRect(kx - tw / 2, ky, tw, kh, kh * .22); c.fill(); c.fillStyle = '#2a1d2c'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(kn, kx, ky + kh * .54); c.textBaseline = 'alphabetic'; }
      c.save(); c.translate(x, hitY); c.rotate(now / 1400 * (ln ? -1 : 1)); c.setLineDash([R * .42, R * .5]); c.lineWidth = 2 * d; c.strokeStyle = `rgba(${tint},.75)`; c.beginPath(); c.arc(0, 0, R * 1.28, 0, 7); c.stroke(); c.restore();   // a slow dashed orbit
      if (hold) for (const off of [0, .5]) { const k = ((now / 700) + off) % 1; c.beginPath(); c.arc(x, hitY, R * (1.1 + k * .9), 0, 7); c.lineWidth = 4 * d * (1 - k); c.strokeStyle = `rgba(${tint},${1 - k})`; c.stroke(); }
    }
    // ---- the notes
    for (let i = S.first; i < S.notes.length; i++) {
      const n = S.notes[i], dt = n.t - t; if (dt > TRAVEL) break; if (n.done) continue;
      const x = X[n.lane], rgb = rgbOf(n), spr = noteSprite(rgb, R);
      if (n.dur) {   // the ribbon from head to tail (a slide crosses between the lanes); the head waits at the ring while it runs
        const a = n.broken ? .3 : 1, w = R * 1.15, tA = Math.max(n.t, t), tB = Math.min(n.t + n.dur, t + TRAVEL), xOf = (tt) => X[0] + (X[1] - X[0]) * posAt(n, tt);
        if (tB > tA) {
          const pts = [[tA, xOf(tA)]]; if (n.path) for (const [dt2] of n.path) for (const tt of [n.t + dt2 - .12, n.t + dt2 + .12]) if (tt > tA && tt < tB) pts.push([tt, xOf(tt)]); pts.push([tB, xOf(tB)]);
          const trace = () => { c.beginPath(); pts.forEach(([tt, xx], k) => (k ? c.lineTo(xx, yAt(tt)) : c.moveTo(xx, yAt(tt)))); };
          c.lineCap = c.lineJoin = 'round';
          c.globalCompositeOperation = 'lighter'; trace(); c.lineWidth = w * 1.9; c.strokeStyle = `rgba(${rgb},${.22 * a})`; c.stroke(); c.globalCompositeOperation = 'source-over';   // glow
          trace(); c.lineWidth = w + 5 * d; c.strokeStyle = `rgba(255,255,255,${.9 * a})`; c.stroke(); trace(); c.lineWidth = w; c.strokeStyle = `rgba(${rgb},${n.broken ? .5 : .95})`; c.stroke();
          trace(); c.lineWidth = w * .28; c.strokeStyle = `rgba(255,255,255,${.5 * a})`; c.stroke();   // a bright line down the middle
          if (n.held) { c.setLineDash([w * .5, w * 2.2]); c.lineDashOffset = -now / 6; trace(); c.lineWidth = w * .6; c.strokeStyle = 'rgba(255,255,255,.55)'; c.stroke(); c.setLineDash([]); }   // light running along it while it is held
          c.lineCap = c.lineJoin = 'butt';
        }
        for (let k = 1; k < n.beats; k++) { const tt = n.t + n.dur * k / (n.beats - 1), ty = yAt(tt); if (tt > t + .03 && ty > topY) { c.beginPath(); c.arc(xOf(tt), ty, R * .17, 0, 7); c.fillStyle = `rgba(255,255,255,${a})`; c.fill(); } }
        if (dt > -WIN.good || n.held) blit(spr, xOf(Math.max(n.t, t)), Math.min(hitY, yAt(n.t)), n.broken ? .45 : 1, n.held ? 1.08 + .05 * Math.sin(now / 90) : 1);
        continue;
      }
      const y = yAt(n.t), a = PG.clamp(1.2 - dt / TRAVEL, .35, 1) * (dt < 0 ? Math.max(0, 1 + dt / WIN.good) : 1);
      c.globalCompositeOperation = 'lighter'; g = c.createLinearGradient(0, y - R * 3.2, 0, y); g.addColorStop(0, `rgba(${rgb},0)`); g.addColorStop(1, `rgba(${rgb},${.4 * a})`); c.fillStyle = g; c.beginPath(); c.moveTo(x - R * .18, y - R * 3.2); c.lineTo(x + R * .18, y - R * 3.2); c.lineTo(x + R * .8, y); c.lineTo(x - R * .8, y); c.fill(); c.globalCompositeOperation = 'source-over';   // a tail of light
      blit(spr, x, y, a, dt < .12 && dt > -.05 ? 1.1 : 1);
    }
    // ---- what a hit looks like: a flash, two shock rings, rays and sparks in the note's colour (bigger for a perfect), the word above
    S.fx = S.fx.filter((f) => now - f.at < 560);
    for (const f of S.fx) {
      const k = (now - f.at) / 560, x = X[f.lane], e = 1 - (1 - k) * (1 - k), big = f.grade === 'perfect' ? 1 : .7;
      if (f.grade !== 'miss') {
        c.globalCompositeOperation = 'lighter';
        if (k < .35) { const fl = 1 - k / .35; g = c.createRadialGradient(x, hitY, 0, x, hitY, R * 2.4 * big); g.addColorStop(0, `rgba(255,255,255,${.9 * fl})`); g.addColorStop(.4, `rgba(${f.rgb},${.6 * fl})`); g.addColorStop(1, `rgba(${f.rgb},0)`); c.fillStyle = g; c.fillRect(x - R * 2.4, hitY - R * 2.4, R * 4.8, R * 4.8); }
        for (const [s0, wd] of [[1, 7], [.6, 4]]) { c.beginPath(); c.arc(x, hitY, R * (1 + e * 1.7 * s0 * big), 0, 7); c.lineWidth = wd * d * (1 - k); c.strokeStyle = `rgba(${f.rgb},${1 - k})`; c.stroke(); }
        if (!f.quiet) { const rays = f.grade === 'perfect' ? 10 : 6; c.lineCap = 'round';
          for (let r = 0; r < rays; r++) { const an = r / rays * 6.283 + f.at % 6, r0 = R * (1.15 + e * 1.3 * big), r1 = r0 + R * .55 * (1 - k) * big; c.beginPath(); c.moveTo(x + Math.cos(an) * r0, hitY + Math.sin(an) * r0); c.lineTo(x + Math.cos(an) * r1, hitY + Math.sin(an) * r1); c.lineWidth = 3.5 * d * (1 - k); c.strokeStyle = `rgba(255,255,255,${1 - k})`; c.stroke();
            const pr = R * (1.3 + e * 2.3 * big), px = x + Math.cos(an + .3) * pr, py = hitY + Math.sin(an + .3) * pr + k * k * R * 1.2; c.beginPath(); c.arc(px, py, R * .1 * (1 - k), 0, 7); c.fillStyle = `rgba(${f.rgb},${1 - k})`; c.fill(); }
          c.lineCap = 'butt'; }
        c.globalCompositeOperation = 'source-over';
      }
      if (f.quiet) continue;
      const pop = k < .14 ? .7 + .5 * (k / .14) : 1.2 - .2 * Math.min(1, (k - .14) / .2);
      c.font = `900 ${U * .052 * pop}px ${font}`; c.textAlign = 'center'; c.fillStyle = `rgba(255,255,255,${1 - k * k})`; c.shadowColor = f.grade === 'miss' ? 'rgba(20,0,30,.9)' : `rgba(${f.rgb},.95)`; c.shadowBlur = 12 * d;
      c.fillText(PG.t(f.grade), x, hitY - R * 1.7 - e * R * .5); c.shadowBlur = 0;
    }
    if (S.bonusOn) {   // towards the next bonus: a thin bar between the rings · during it: a white frame, the words and the time left
      const bw = U * .26, bx = W / 2 - bw / 2, by = hitY + R * .75, left = PG.clamp((S.bonusEnd - S.t) / BONUS.sec, 0, 1), fill = S.bonus ? left : PG.clamp(1 - (S.bonusAt - S.combo) / BONUS.at, 0, 1);
      c.fillStyle = 'rgba(255,255,255,.25)'; c.beginPath(); c.roundRect(bx, by, bw, 5 * d, 3 * d); c.fill(); c.fillStyle = S.bonus ? '#fff6c8' : 'rgba(255,255,255,.9)'; c.beginPath(); c.roundRect(bx, by, Math.max(5 * d, bw * fill), 5 * d, 3 * d); c.fill();
      if (S.bonus) {
        const pulse = .5 + .5 * Math.sin(performance.now() / 160), g2 = c.createLinearGradient(0, 0, W, 0); g2.addColorStop(0, `rgba(255,246,200,${.3 + .2 * pulse})`); g2.addColorStop(.12, 'rgba(255,246,200,0)'); g2.addColorStop(.88, 'rgba(255,246,200,0)'); g2.addColorStop(1, `rgba(255,246,200,${.3 + .2 * pulse})`);
        c.fillStyle = g2; c.fillRect(0, 0, W, H);
        c.font = `900 ${U * .07}px ${font}`; c.textAlign = 'center'; c.fillStyle = '#fff6c8'; c.shadowColor = 'rgba(20,0,30,.95)'; c.shadowBlur = 12 * d; c.fillText(PG.t('bonus'), W / 2, hitY - R * 3.7 - Math.max(0, 1 - (performance.now() - S.bonusStart) / 400) * R); c.shadowBlur = 0;
      }
    }
    if (S.combo >= 3) { c.font = `900 ${U * .1}px ${font}`; c.textAlign = 'center'; c.fillStyle = 'rgba(255,255,255,.95)'; c.shadowColor = 'rgba(20,0,30,.9)'; c.shadowBlur = 10 * d; c.fillText(String(S.combo), W / 2, hitY + R * .35); c.shadowBlur = 0; }
  }

  const hit = (S, n, grade, quiet) => { S[grade]++; S.combo++; S.maxCombo = Math.max(S.maxCombo, S.combo); if (S.bonusOn && S.t >= S.bonusEnd && S.combo >= S.bonusAt) { S.bonusEnd = S.t + BONUS.sec; S.bonusStart = performance.now(); PG.sfx.fanfare(); if (PG.fx) { PG.fx.flash('#fff', 500, .6); PG.fx.burst('star', 50, 50, 24); } } const lane = n.laneNow ?? n.lane; if (S.onHit) S.onHit(lane, n.kind, grade, quiet); if (S.combo % 10 === 0 && PG.fx) { PG.fx.burst('star', 50, 74, 12); PG.sfx.perfect(); } S.fx.push({ lane, grade, at: performance.now(), rgb: rgbOf(n), quiet }); };
  const miss = (S, n, count = 1) => { S.miss += count; S.combo = 0; S.fx.push({ lane: n.laneNow ?? n.lane, grade: 'miss', at: performance.now() }); };

  function down(S, lane, t) {
    S.held[lane]++; S.press[lane] = performance.now();
    const win = WIN.good * S.len, n = S.notes.find((v, i) => i >= S.first && !v.done && !v.head && v.lane === lane && Math.abs(v.t - t) <= win);
    if (!n) { PG.sfx.tap(); return; }
    hit(S, n, Math.abs(n.t - t) <= WIN.perfect * S.len ? 'perfect' : 'good'); n.head = true; if (n.dur) n.held = true; else n.done = true;
    PG.sfx.blip(n.kind === 'c' ? 1320 : 660, .05, .04, 'triangle');
  }
  const up = (S, lane) => { S.held[lane] = Math.max(0, S.held[lane] - 1); };

  // every frame: late notes become misses; the beats inside a hold are judged by "is that side held right now"
  function advance(S, t, auto) {
    S.t = t; const was = S.bonus; S.bonus = t < S.bonusEnd; if (was && !S.bonus) S.bonusAt = S.combo + BONUS.at; auto = auto || S.bonus;
    S.hold = [null, null];
    for (let i = S.first; i < S.notes.length; i++) {
      const n = S.notes[i]; if (n.t > t + .01) break; if (n.done) continue;
      if (auto && !n.head) { down(S, n.lane, n.t); S.held[n.lane]--; if (n.dur) n.auto = S.bonus ? 'bonus' : true; }
      if (S.bonus && n.dur && n.head && !n.auto) n.auto = 'bonus';   // a hold already running when the bonus starts
      if (!n.head && t - n.t > WIN.good * S.len) { n.head = true; miss(S, n); if (!n.dur) n.done = true; else n.broken = true; }
      if (!n.dur || !n.head) continue;
      if (n.auto === 'bonus' && !S.bonus) n.auto = false;
      // a slide on a wide screen (thumbs far apart, or two keys): keeping any finger / key down is enough; the warmth still moves from ear to ear
      const on = (tt) => n.auto || S.held[laneAt(n, tt)] > 0 || ((nearCross(n, tt) || (n.path && PG.wide)) && S.held[0] + S.held[1] > 0), holding = on(t), end = n.t + n.dur;
      while (n.next < n.beats && n.t + n.dur * n.next / (n.beats - 1) <= t) {
        const last = n.next === n.beats - 1; n.laneNow = laneAt(n, n.t + n.dur * n.next / (n.beats - 1));
        if (holding || (last && n.held && t - n.letGo <= RELEASE)) { hit(S, n, 'perfect', !last); n.held = true; n.broken = false; } else { miss(S, n); n.held = false; n.broken = true; }
        n.next++;
      }
      if (n.held && !holding && n.letGo == null) n.letGo = t; if (holding) n.letGo = null;
      if (n.held && !holding && t - n.letGo > RELEASE && end - t > RELEASE) { n.held = false; n.broken = true; }   // let go in the middle
      if (n.next >= n.beats || t >= end) n.done = true; else if (n.held && holding) S.hold[laneAt(n, t)] = n.kind;
    }
    while (S.first < S.notes.length && S.notes[S.first].done) S.first++;
  }

  const KEYS0 = Object.assign({ L: 'f', R: 'j' }, (window.PG_RULES || {}).keys || {}); let keys2 = { ...KEYS0 }, waiting = null;   // default lane keys: engine/rules.js
  const keyName = (k) => ({ ' ': 'Space', enter: 'Enter', shift: 'Shift', control: 'Ctrl', alt: 'Alt', meta: '⌘', backspace: '⌫' })[k] || (k.length === 1 ? k.toUpperCase() : k[0].toUpperCase() + k.slice(1));
  function paintKeys() { for (const s of ['L', 'R']) { const b = PG.$('key' + s); if (b) b.textContent = keyName(keys2[s]); } }

  PG.rhythm = {
    get keys() { return { ...keys2 }; },
    /** The lane keys as shown to the player: [left, right]. */
    keyNames: () => [keyName(keys2.L), keyName(keys2.R)],
    get active() { return !!cur; },
    get offset() { return offset; },
    set offset(v) { offset = PG.clamp(Math.round(v), -100, 400); PG.store.set('offset', offset); const el = PG.$('offset'); if (el) { el.value = offset; PG.$('offsetVal').textContent = `${offset} ms`; } },
    init() {
      box = PG.$('rhythm'); cv = box.querySelector('canvas'); c = cv.getContext('2d'); offset = PG.store.get('offset', 0);
      PG.$('offset').value = offset; PG.$('offsetVal').textContent = `${offset} ms`; PG.$('offset').addEventListener('input', (e) => { PG.rhythm.offset = +e.target.value; });
      PG.$('btnCalib').onclick = () => PG.rhythm.calibrate();
      const fingers = new Map(), keys = new Set();   // which side each finger / key holds
      box.addEventListener('pointerdown', (ev) => { if (!cur) return; ev.preventDefault(); PG.audioOn(); const r = PG.app.getBoundingClientRect(), lane = ev.clientX - r.left < r.width / 2 ? 0 : 1; fingers.set(ev.pointerId, lane); try { box.setPointerCapture(ev.pointerId); } catch {} down(cur.S, lane, cur.time()); });
      // a finger that slides across the middle now holds the other side (slides)
      box.addEventListener('pointermove', (ev) => { if (!cur || !fingers.has(ev.pointerId)) return; const r = PG.app.getBoundingClientRect(), lane = ev.clientX - r.left < r.width / 2 ? 0 : 1, was = fingers.get(ev.pointerId); if (lane === was) return; fingers.set(ev.pointerId, lane); up(cur.S, was); cur.S.held[lane]++; cur.S.press[lane] = performance.now(); });
      const lift = (ev) => { if (!fingers.has(ev.pointerId)) return; const lane = fingers.get(ev.pointerId); fingers.delete(ev.pointerId); if (cur) up(cur.S, lane); };
      box.addEventListener('touchstart', (ev) => { if (cur) ev.preventDefault(); }, { passive: false });   // iOS: no long-press menu, no text selection, no scroll while playing
      box.addEventListener('pointerup', lift); box.addEventListener('pointercancel', lift); box.addEventListener('contextmenu', (ev) => ev.preventDefault());
      keys2 = { ...KEYS0, ...PG.store.get('keys', {}) }; paintKeys();
      const laneOf = (ev) => { const k = ev.key.toLowerCase(); return k === keys2.L || k === 'arrowleft' ? 0 : k === keys2.R || k === 'arrowright' ? 1 : -1; };
      // ⚙: press a lane button, then the key for that lane (Esc = keep)
      for (const side of ['L', 'R']) { const b = PG.$('key' + side); if (b) b.onclick = () => { if (waiting) return; waiting = side; b.textContent = '…'; b.classList.add('wait'); }; }
      addEventListener('keydown', (ev) => {
        if (!waiting) return; ev.preventDefault(); ev.stopImmediatePropagation(); const k = ev.key.toLowerCase(), side = waiting; waiting = null; PG.$('key' + side).classList.remove('wait');
        if (k !== 'escape' && k !== 'tab' && !k.startsWith('arrow')) { const other = side === 'L' ? 'R' : 'L'; if (keys2[other] === k) keys2[other] = keys2[side]; keys2[side] = k; PG.store.set('keys', keys2); }
        paintKeys();
      }, true);
      addEventListener('keydown', (ev) => { const lane = laneOf(ev); if (!cur || lane < 0) return; ev.preventDefault(); if (ev.repeat || keys.has(ev.code)) return; keys.add(ev.code); down(cur.S, lane, cur.time()); });
      addEventListener('keyup', (ev) => { const lane = laneOf(ev); if (lane < 0 || !keys.delete(ev.code)) return; if (cur) up(cur.S, lane); });
      PG.rhythm._clear = () => { fingers.clear(); keys.clear(); };
    },
    /** How many beats a chart holds (a hold counts all its beats). */
    count: (notes) => notes.reduce((a, n) => a + (n[3] ? n[4] || 2 : 1), 0),
    /** o: { audio (playing or about to), notes, end (s), leniency (1 = normal, bigger = easier), bonus (false = no bonus time), onFrame(t, state), onHit(lane, kind, grade, insideHold): the moment a note is hit (for a pulse in sync with the finger),
     *       auto (plays itself), from (s: the audio starts there, not at 0) } */
    play(o) {
      return new Promise((done) => {
        const notes = o.notes.map((n) => ({ t: n[0], lane: n[1], kind: n[2], dur: n[3] || 0, beats: n[3] ? Math.max(2, n[4] || 2) : 1, path: n[3] && n[5] && n[5].length ? n[5] : null, next: 1, head: false, done: false, held: false, letGo: null }));
        const S = { notes, first: 0, len: o.leniency || 1, perfect: 0, good: 0, miss: 0, combo: 0, maxCombo: 0, fx: [], press: [0, 0], held: [0, 0], hold: [null, null], onHit: o.onHit, t: 0, bonus: false, bonusOn: o.bonus !== false, bonusAt: BONUS.at, bonusEnd: -1, bonusStart: 0 };
        const total = notes.reduce((a, n) => a + n.beats, 0), audioTime = clock(o.audio), time = () => audioTime() - offset / 1000; let raf = 0, over = false; box.hidden = false; PG.rhythm._clear();
        const finish = (skipped) => { if (over) return; over = true; cancelAnimationFrame(raf); cur = null; box.hidden = true; const judged = S.perfect + S.good + S.miss;
          done({ perfect: S.perfect, good: S.good, miss: S.miss, maxCombo: S.maxCombo, total, judged, acc: judged ? (S.perfect + S.good * .6) / judged : 0, skipped: !!skipped }); };
        const loop = () => {
          if (over) return; const t = time(); if (o.from && audioTime() < o.from - .5) { raf = requestAnimationFrame(loop); return; }   // the audio has not jumped to its start yet
          advance(S, t, o.auto); draw(t, S); if (o.onFrame) o.onFrame(audioTime(), S);
          if (o.audio.ended || audioTime() >= o.end) { finish(false); return; }
          raf = requestAnimationFrame(loop);
        };
        cur = { S, time, finish }; loop();
      });
    },
    stop() { if (cur) cur.finish(true); },
    /** Twelve clicks, the player taps along; the middle lateness of the taps becomes the offset. Resolves with the ms (or null when too few taps). */
    calibrate() {
      return new Promise((done) => {
        PG.audioOn(); const N = 12, GAP = .6, perf0 = performance.now() + 700, taps = [];
        for (let i = 0; i < N; i++) PG.sfx.blip(i % 4 ? 880 : 1320, .05, .12, 'square', .7 + i * GAP);
        PG.ui.toast(PG.t('calibGo'), N * GAP * 1000 + 600);
        const onDown = (ev) => { if (ev.target.closest('#btnClose')) return; taps.push(performance.now()); };
        addEventListener('pointerdown', onDown, true);
        setTimeout(() => {
          removeEventListener('pointerdown', onDown, true);
          const diffs = taps.map((p) => { const s = (p - perf0) / 1000, k = Math.round(s / GAP); return k >= 3 && k < N ? (s - k * GAP) * 1000 : null; }).filter((v) => v != null && Math.abs(v) < 280).sort((a, b) => a - b);
          if (diffs.length < 5) { PG.ui.toast(PG.t('calibFail')); done(null); return; }
          PG.rhythm.offset = diffs[Math.floor(diffs.length / 2)]; PG.ui.toast(PG.t('calibDone', { n: offset })); done(offset);
        }, 700 + N * GAP * 1000 + 300);
      });
    },
  };
})();
