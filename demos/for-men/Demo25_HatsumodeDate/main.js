// 『はじめての、初詣』 — Tsubaki (original character), 20, the sheltered young lady of an old ryokan family, on her very first crowded
// New Year shrine visit — with you. New Year's Eve at the torii (cold night wind on both ears), the countdown and the temple bell,
// the food stalls (she only has a black card; a hot amazake pressed to your right cheek), the bonfire on your left (steady warmth),
// the crowd pushes her to your right ear, the prayer (bell, two claps, hold your hands together), the omikuji (she draws 凶 for the
// first time in her life), a cold gust while you tie it — and she wraps her fur stole round you both and whispers at your left ear.
// DUAL thermal: her voice is always warm at the ear she speaks at; the night wind, gusts, the bonfire, the amazake cup and the stole
// are the ambient layer. Stills first (video last, user 2026-11-08): each view is a still with a slow breathing drift.
// Runs on the shared engine (demos/shared/engine: UI wiring, choices / action / hold, clip player, thermal model, device panel —
// engine P3, 2026-11-11); this file holds the story, its sounds' timing, its thermal sources and its overlays.
(() => {
  const ME = window.MoHeatEngine, $ = ME.$, AUTO = ME.AUTO, clamp = ME.clamp, sleep = ME.sleep;
  const SND = window.HTAudio, LINES = window.TSUBAKI_LINES, W = 1920, H = 1080;

  // ---------------------------------------------------------------- state
  const fresh = () => ({ started: false, t: 0, clock: 0, view: 'torii', cold: 1, fire: 0, cup: 0, near: 0, nearAz: 1.2, stole: 0, gust: null,
    count: null, slip: null, fade: 0, lv: 0, pos: { az: 0, dist: .8 }, wish: 0 });
  let S = fresh();
  const STEPS = [['torii', '鳥居の前で', 'At the torii'], ['stall', '屋台と甘酒', 'Stalls & amazake'], ['fire', '焚き火', 'The bonfire'],
    ['pray', 'お参り', 'The prayer'], ['omikuji', 'おみくじ', 'The fortune']];
  const PLACE = { torii: 'the torii · New Year\'s Eve', stall: 'food stalls', amazake: 'food stalls · amazake', fire: 'the bonfire', close: 'the bonfire · crowded', pray: 'the main hall', omikuji: 'omikuji', stole: 'omikuji · cold wind' };
  // ---- animation (handoff §4b, as Demo20 / 22): Seedance 2.5 Lite 1080p clips whose first and last frames are EXACTLY the stills
  // (scripts/prepare_video.py): one loop per view, one transition per cut (go()); the engine's clip player switches only at a clip's end.
  const CLIP_NAMES = ['v_torii', 'v_stall', 'v_amazake', 'v_fire', 'v_close', 'v_pray', 'v_omikuji', 'v_stole',
    't_torii_stall', 't_stall_amazake', 't_amazake_fire', 't_fire_close', 't_close_pray', 't_pray_omikuji', 't_omikuji_stole'];

  // ---------------------------------------------------------------- the engine (demos/shared/engine): art, UI, voice, choices, thermal, device
  const E = ME.create({
    ns: 'TSUBAKI', sound: SND, lines: LINES, state: () => S,
    reset() { S = fresh(); fireK = cupK = stoleK = nearK = 0; coldK = 1; },
    steps: STEPS, place: PLACE, restSec: 1.5,   // a 1.5 s all-off rest at each new chapter (as Demo12 / 14 / 17 / 18 / 19)
    views: ['torii', 'stall', 'amazake', 'fire', 'close', 'pray', 'omikuji', 'stole'], src: (n) => `media/art/tsubaki_${n}.jpg?v=2`, blank: '#140d14', clips: CLIP_NAMES,
    zoomExtra: (view) => (view === 'close' ? .03 * clamp(nearK - 1, 0, .4) / .4 : 0),   // pressed against you by the crowd: a slow push-in
    radar: { text: '#a38f97', ear: '#3a2830', head: '#4a3540' },
    thermal: { modeGuard: 0, timing: true },   // the per-ear timing rules of shared/story.js (QA thermal-timing-live, 2026-11-11)
    autoPick: () => (Math.random() < .5 ? 0 : 1),   // ?auto answers at random (this demo's own rule)
    talkEnv: false,
    sources, update, draw, story,
    onFinish() { for (const k of ['wind', 'crowd', 'fire']) SND.loop(k)?.stop(); },
    endText: (S) => (S.wish ? '🎍 来年も、その次の年も。 · Next year, and the year after' : '🎍 願いごとは、二人だけの秘密 · Your wishes stay a secret for two'),
  });
  const { say, choice, action, hold, go, alive } = E, ctx = E.ctx, actEl = $('act');

  // ---------------------------------------------------------------- your turn: the engine's choices / action / hold + this demo's taps
  // tap the shrine bell rope: each tap rings it, three taps fill the meter (auto after 12 s)
  function taps(icon, ja, en, n, onTap) {
    return new Promise((res) => {
      actEl.innerHTML = `<button class="act-btn hold"><i>${icon}</i><b>${ja}</b><span>${en}</span><em class="bar"><u></u></em></button>`; actEl.classList.add('show');
      const b = actEl.querySelector('button'), bar = b.querySelector('u'); let k = 0;
      const hit = () => { k++; onTap?.(k); bar.style.width = `${Math.min(1, k / n) * 100}%`; if (k >= n) { clearInterval(iv); clearTimeout(tm); setTimeout(() => { actEl.classList.remove('show'); actEl.innerHTML = ''; res(); }, 250); } };
      b.addEventListener('click', hit);
      const tm = setTimeout(() => { const f = setInterval(() => { if (k >= n) clearInterval(f); else hit(); }, 350); }, 12000);
      const iv = AUTO ? setInterval(() => { if (k < n) hit(); }, 500) : 0;
    });
  }

  // ---------------------------------------------------------------- weather: a cold gust that sweeps across your head
  async function gust(from, to, sec, peak = 1) {
    const my = E.run, t0 = performance.now(), W_ = SND.loop('wind');
    S.gust = { az: from, k: 0 };
    while (performance.now() - t0 < sec * 1000) {
      alive(my); const u = (performance.now() - t0) / (sec * 1000);
      S.gust.az = from + (to - from) * u; S.gust.k = peak * Math.sin(Math.PI * u);
      W_?.at(S.gust.az, 1.2 - .7 * Math.sin(Math.PI * u)); W_?.set(.25 + .55 * S.gust.k, .1);
      await sleep(.05);
    }
    S.gust = null; W_?.set(.25, .6);
  }

  // ---------------------------------------------------------------- the story
  const FRONT = { az: 0, dist: .8 }, CLOSE = { az: .15, dist: .45 }, RIGHT = { az: .8, dist: .5 }, LEFT = { az: -.9, dist: .5 },
    RIGHT_EAR = { az: 1.35, dist: .12 }, LEFT_EAR = { az: -1.35, dist: .12 }, CHEEK_R = { az: .9, dist: .28 };
  async function story(my) {   // the engine starts it (run token my) and catches the stop when a new run / finish begins
    // 1 · the torii, New Year's Eve: wind and the crowd; she hurries in from the right on geta
    E.setStep(0); S.view = 'torii';
    const wind = SND.loop('wind'), crowd = SND.loop('crowd');
    wind?.set(.25, .8); crowd?.set(.32, 1.2);
    await sleep(.8); SND.fx.geta(1.3, .2, 9, .17); await sleep(1.5); alive(my);
    await say('t01', { az: .25, dist: .9 });
    await say('t02', FRONT);
    const a = await choice([['…すごく、綺麗だ', '…You look beautiful'], ['…寒くない？', '…Aren\'t you cold?']]);
    await say(a ? 't03b' : 't03a', FRONT);
    gust(-1.5, 1.5, 3.2, .8);   // a gust across the precinct
    await sleep(.5);
    await say('t04', CLOSE);
    for (let n = 5; n >= 1; n--) { alive(my); S.count = n; SND.fx.tick(0); await sleep(.85); }
    S.count = 0; SND.fx.cheer(); await sleep(.3); SND.fx.bell(.7);
    await choice([['「あけましておめでとう！」', 'Say "Happy New Year!"'], ['「今年もよろしく！」', 'Say "Here\'s to this year!"']]);   // two options, same reply (user)
    S.count = null;
    await say('t05', FRONT);
    setTimeout(() => { if (my === E.run) SND.fx.bell(.7); }, 2500);

    // 2 · the food stalls: she has no cash; a hot amazake at your right cheek
    E.setStep(1); SND.fx.geta(.3, .5, 6, .25); await go('t_torii_stall', 'stall'); await sleep(.4);
    await say('t07', CLOSE);
    const b = await choice([['僕がおごるよ', 'My treat'], ['…カード、使えるか聞いてみたら？', '…Ask if they take cards?']]);
    await say(b ? 't08b' : 't08a', CLOSE);
    SND.fx.coin(.3); await sleep(.8);
    await go('t_stall_amazake', 'amazake'); await sleep(.2);
    S.cup = 1; SND.fx.rustle(.9, .25);
    await say('t09', CHEEK_R);
    await sleep(.9); S.cup = .5;   // she eases it off your cheek a little (still in the picture)
    SND.fx.sip(.3, .45);
    await say('t10', { az: .3, dist: .45 });

    // 3 · the bonfire on your left; the crowd pushes her to your right ear
    E.setStep(2); const fire = SND.loop('fire'); fire?.at(-1.0, 1.4);
    await go('t_amazake_fire', 'fire', () => { S.cup = 0; S.fire = 1; fire?.set(.55, 1.2); }); await sleep(.4); alive(my);
    await say('t11', RIGHT);
    crowd?.set(.6, .5); crowd?.at(1.8, 1.2); SND.fx.rustle(1.4, .3); await sleep(.4);
    await go('t_fire_close', 'close'); S.near = 1; S.nearAz = 1.3;
    await say('t12', RIGHT_EAR);
    await hold('🤝', '支えてあげる（長押し）', 'Steady her (press and hold)', 2.8, (down, k) => { S.near = 1 + .4 * (down ? k : 0); });
    crowd?.set(.32, 1); crowd?.at(Math.PI, 3); S.near = 1;   // still pressed against you until she steps back

    // 4 · the prayer: coin, the bell rope, two bows two claps, hold your hands together
    E.setStep(3); await go('t_close_pray', 'pray', () => { S.near = 0; S.fire = 0; fire?.set(0, 1.5); SND.fx.geta(.4, -.6, 6, .3); }); fire?.stop(); await sleep(.2);
    await choice([['お賽銭を入れる', 'Toss in a coin'], ['五円玉を入れる', 'Toss a lucky 5-yen coin']]); SND.fx.coin(0); await sleep(.6);
    await taps('🔔', '鈴を鳴らす（タップ）', 'Ring the shrine bell (tap)', 3, () => SND.fx.suzu(0));
    await sleep(.4); for (let i = 0; i < 2; i++) { SND.fx.clap(-.8, .5); SND.fx.clap(0, .3); await sleep(.55); }
    crowd?.set(.12, 1.5); wind?.set(.12, 1.5); S.cold = .6;
    await hold('🙏', '手を合わせて、お願いする（長押し）', 'Hands together, make a wish (press and hold)', 3.5);
    crowd?.set(.3, 1.5); wind?.set(.25, 1.5); S.cold = 1; await sleep(.3);
    await say('t14', LEFT);
    S.wish = await choice([['…秘密', '…It\'s a secret'], ['椿さんと、また来られますように', 'That I can come here with you again']]);
    await say(S.wish ? 't15b' : 't15a', LEFT);

    // 5 · the omikuji: you draw 大吉, she draws 凶; tie it in the cold wind; she shares her stole
    E.setStep(4); await go('t_pray_omikuji', 'omikuji');
    await choice([['おみくじを引く', 'Draw a fortune'], ['二人で一緒に引く', 'Draw one together']]); SND.fx.shake(0, .4); await sleep(1.2); SND.fx.paper(0, .4);
    S.slip = { k: 0, text: '大吉', en: 'Excellent luck' }; await sleep(1.9); S.slip = null; alive(my);
    await say('t16', CLOSE);
    const c = await choice([['僕の大吉と、交換しよう', 'Swap with my great luck'], ['一緒に、結びに行こう', 'Let\'s tie it up together']]);
    await say(c ? 't17b' : 't17a', CLOSE);
    SND.fx.paper(-.3, .5); await sleep(.5);
    await gust(-1.6, 1.6, 3.6, 1);
    await go('t_omikuji_stole', 'stole', () => { SND.fx.rustle(-1.1, .25); S.stole = 1; });
    await say('t18', { az: -.7, dist: .3 });
    SND.fx.rustle(0, .15); await sleep(1);
    S.near = 1; S.nearAz = -1.3;
    await say(S.wish ? 't19b' : 't19a', LEFT_EAR);
    await sleep(2); S.fade = 1; crowd?.set(.15, 2); wind?.set(.1, 2); setTimeout(() => SND.fx.bell(.7), 600); await sleep(3.2); alive(my); E.finish();
  }

  // ---------------------------------------------------------------- per-frame state + thermal
  let fireK = 0, cupK = 0, stoleK = 0, nearK = 0, coldK = 1;
  function update(dt) {   // while the story runs (the engine has already moved S.t / S.clock / S.lv / S.vlv)
    fireK += (S.fire - fireK) * (1 - Math.exp(-dt / 1.2));
    cupK += (S.cup - cupK) * (1 - Math.exp(-dt / .3)); coldK += (S.cold - coldK) * (1 - Math.exp(-dt / 1.5));
    stoleK += (S.stole - stoleK) * (1 - Math.exp(-dt / 1)); nearK += ((S.near ? S.near : 0) - nearK) * (1 - Math.exp(-dt / .4));
    if (S.slip) S.slip.k = Math.min(1, S.slip.k + dt / .5);
  }
  // Thermal, two layers (firmware DUAL: cool and heat independent on each ear — CLAUDE.md, 2026-11-08); shared/engine/thermal.js sums them per ear.
  //  · VOICE: a voice is warm. Her loudness (0.1 + 0.8 × level) warms the ear she speaks at — × 1 right at your ear, × 0.6 within
  //    50 cm, × 0.28 further; halved when she is straight in front.
  //  · AMBIENT (all real things next to your ears): the winter night air (mild cool on both ears — less on the side facing the
  //    bonfire, and almost none once the fur stole is round your neck), gusts that sweep across your head, the bonfire on your left,
  //    the hot amazake cup pressed to your right cheek, her face a hand's width from your ear, the fur stole round both of you
  //    (insulation + her body on your left: left warmer). Under the main hall's eaves the wind chill drops. Timed to the picture: each
  //    source starts when its transition clip starts (go(..., onStart)). Not heated: her blush, her burnt tongue, the steam of her
  //    own cup (45 cm away), the food stalls (metres away).
  function sources() {
    const out = [], add = (az, k, s, icon) => { if (s > .01) out.push({ az, k, s, icon }); };
    if (!S.started) return out;
    const P = S.pos;
    if (E.talking()) add(P.az, 'h', ME.thermal.voice(P, S.vlv), '💬');
    const air = .24 * coldK * (1 - .85 * stoleK);
    add(-1.5, 'c', air * (1 - .75 * fireK), '❄️'); add(1.5, 'c', air, '❄️');
    if (S.gust) add(S.gust.az, 'c', .6 * S.gust.k * (1 - .5 * stoleK), '🌬');
    if (fireK > .02) add(-1.1, 'h', .5 * fireK * (.88 + .12 * Math.sin(S.t * 7.3) * Math.sin(S.t * 3.1)), '🔥');
    if (cupK > .02) add(1.3, 'h', .65 * cupK, '🍵');
    if (nearK > .5) add(S.nearAz, 'h', .15 + .2 * clamp(nearK - 1, 0, .4) / .4, '🤍');
    if (stoleK > .02) { add(-1.5, 'h', .3 * stoleK, '🧣'); add(1.5, 'h', .12 * stoleK, '🧣'); }   // fur keeps the warmth in; she leans on your left
    return out;
  }
  // ---------------------------------------------------------------- drawing: the engine's stills + this demo's overlays (snow, embers, countdown, omikuji)
  const flakes = Array.from({ length: 90 }, () => ({ x: Math.random() * W, y: Math.random() * H, v: 40 + Math.random() * 70, r: 1.5 + Math.random() * 3.5, p: Math.random() * 6 }));
  const sparks = Array.from({ length: 26 }, () => ({ x: 0, y: H + 10, v: 0, life: 0 }));
  function draw(t, dt) {
    E.stage.draw(t, dt);   // the stills, cross-faded (shared/engine/stage.js)
    // light snow, pushed sideways by a gust
    const push = S.gust ? Math.sin(S.gust.az) * S.gust.k * 500 + S.gust.k * 300 : 30;
    ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath();
    for (const f of flakes) { f.y += f.v * dt; f.x += (push + 20 * Math.sin(t + f.p)) * dt; if (f.y > H) { f.y = -10; f.x = Math.random() * W; } if (f.x > W + 20) f.x -= W + 40; if (f.x < -20) f.x += W + 40; ctx.moveTo(f.x + f.r, f.y); ctx.arc(f.x, f.y, f.r, 0, 7); }
    ctx.fill();
    if (fireK > .05) {   // sparks rising from the bonfire on the left + a warm glow
      const g = ctx.createRadialGradient(0, H * .75, 50, 0, H * .75, 900); g.addColorStop(0, `rgba(255,150,70,${.22 * fireK})`); g.addColorStop(1, 'rgba(255,150,70,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = `rgba(255,190,110,${.85 * fireK})`;
      // embers: born in the fire, lifted by the hot air (the lift fades as they leave the plume), carried by the same wind as the
      // snow, flutter, cool and fade out (no popping in mid-air)
      for (const s of sparks) {
        if (s.life <= 0) { s.x = 80 + Math.random() * 380; s.y = H * (.9 + Math.random() * .08); s.v = 150 + Math.random() * 170; s.vx = 0; s.max = s.life = 1.2 + Math.random() * 1.6; }
        s.life -= dt; s.v *= Math.exp(-dt * .8); s.vx += (push * .6 - s.vx) * Math.min(1, dt * 1.5);
        s.y -= s.v * dt; s.x += (s.vx + 30 * Math.sin(t * 3 + s.max * 9)) * dt;
        ctx.globalAlpha = Math.max(0, Math.min(1, 1.6 * s.life / s.max, 8 * (s.max - s.life))); ctx.fillRect(s.x, s.y, 3, 3);
      }
      ctx.globalAlpha = 1;
    }
    if (S.count != null) {   // the countdown
      ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = S.count ? '700 190px "Shippori Mincho B1", serif' : '700 120px "Shippori Mincho B1", serif';
      ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 30; ctx.fillStyle = S.count ? 'rgba(255,248,236,.92)' : '#ffe3a6';
      ctx.fillText(S.count ? String(S.count) : '謹賀新年', S.count ? W * .17 : W / 2, H * .2);   // the numbers sit beside her face
      if (!S.count) { ctx.font = '600 44px Inter, sans-serif'; ctx.fillText('Happy New Year', W / 2, H * .2 + 100); }
      ctx.restore();
    }
    if (S.slip) {   // your omikuji slip
      const k = S.slip.k, w = 230, h = 620, x = W / 2 - w / 2, y = H * .12 + (1 - k) * 60;
      ctx.save(); ctx.globalAlpha = k; ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 40; ctx.fillStyle = '#fbf6ea'; ctx.fillRect(x, y, w, h); ctx.shadowBlur = 0;
      ctx.strokeStyle = '#b8323a'; ctx.lineWidth = 6; ctx.strokeRect(x + 14, y + 14, w - 28, h - 28);
      ctx.fillStyle = '#b8323a'; ctx.textAlign = 'center'; ctx.font = '700 40px "Shippori Mincho B1", serif';
      ['御', '神', '籤'].forEach((ch, i) => ctx.fillText(ch, W / 2, y + 80 + i * 48));
      ctx.font = '800 120px "Shippori Mincho B1", serif'; ctx.fillText('大', W / 2, y + 330); ctx.fillText('吉', W / 2, y + 460);
      ctx.font = '600 26px Inter, sans-serif'; ctx.fillStyle = '#7a5a4a'; ctx.fillText(S.slip.en, W / 2, y + h - 40);
      ctx.restore();
    }
    if (S.fade) { S.fadeA = Math.min(1, (S.fadeA || 0) + dt / 3); ctx.fillStyle = `rgba(14,8,14,${S.fadeA})`; ctx.fillRect(0, 0, W, H); }
  }

  E.boot();
})();
