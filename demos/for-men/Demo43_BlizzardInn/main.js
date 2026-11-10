// 『白嶺の峠、ひと晩の宿』 One Night at the White-Ridge Inn — crossover ①, for-men, unnamed fictional East (霧蓮国・白嶺の峠・雪見亭;
// docs/proposals/2026-11-08_crossover.md M1-East). Special versions of three heroines (face, hair colour, personality, voice
// unchanged): 渚 a woman escort-guard finds you in a blizzard on the pass and carries you down; ひなた, the inn's young landlady,
// feeds you hotpot and makes you bet on dice; ミント, a sleepy travelling doctor, treats your frozen ears with moxa (warm) and mint
// balm (cool) on the SAME ear; at night the door bursts open and 渚 stands in the wind on your left; at dawn you take one token
// home (3 endings). Three short free-talk windows in the story + 「もっと話す」 after it (scripted bridges here — the live AI version
// is the private live/ page through tools/talk/server.py, same choices).
// DUAL thermal: voices warm the ear they speak at (loudness × distance); ambient = the blizzard gusts sweeping left → right, the fur
// cape, the hotpot steam, the brazier, the soup bowl, the moxa stick circling your right ear + the mint balm on the same ear, her
// cool breath on the balm (heat → cool in a second), the front door bursting open on your left, Nagisa's shoulder blocking it, the
// dawn sun and the snow. Art = the layered standard (media/layers.js + ../../shared/layers.js); talk engine = ../../shared/talk.js.
(() => {
  const $ = (id) => document.getElementById(id);
  const QS = new URLSearchParams(location.search);
  const SND = window.INNAudio, D = window.INN_LINES, LINES = D.lines, LIVE = window.INN_LIVE || null, W = 1920, H = 1080;
  const AUTO = QS.has('auto'), ALT = QS.has('alt');
  const PICK3 = QS.has('end') ? +QS.get('end') : ALT ? 1 : AUTO ? 2 : 0;   // tests: ?end=0|1|2 takes that token
  const cv = $('scene'), ctx = cv.getContext('2d'), stage = $('stage');
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const sleep = (s) => new Promise((r) => setTimeout(r, s * 1000));
  const NAME = { M: 'ミント', H: 'ひなた', N: '渚' };

  // ---------------------------------------------------------------- art: one still per view (layered stills: shared/layers.js)
  const STILL = { pass: 'nagisa_pass', hall: 'hinata_hall', dice: 'hinata_dice', hear: 'hinata_hear', room: 'mint_room', mear: 'mint_mear',
    door: 'nagisa_door', trio: 'trio_dawn', cover: 'cover_trio', end_m: 'mint_dawn', end_h: 'hinata_dawn', end_n: 'nagisa_dawn' };
  const IMG = {};
  const artReady = Promise.all(Object.entries(STILL).map(([v, n]) => new Promise((res) => { const im = new Image(); im.onload = () => { IMG[v] = im; res(); }; im.onerror = () => res(); im.src = `media/art/${n}.jpg?v=1`; })));
  const LIVEL = () => !!(window.MoHeatLayers && window.MoHeatLayers.live);
  // もっと話す views (place × cast, lines.js views): loaded only when a talk starts there
  const TV = D.views, need = (v) => { if (IMG[v] || !TV.still[v]) return; const im = new Image(); im.onload = () => { IMG[v] = im; }; im.src = `media/art/${TV.still[v]}.jpg?v=1`; };
  // the place a view shows (story views + t_<place>_* talk views): snow, steam, wind and the ambient warm / cool follow it
  const PLACE_OF = { white: 'pass', pass: 'pass', hall: 'hall', dice: 'hall', hear: 'hall', room: 'room', mear: 'room', door: 'door', trio: 'dawn', end_m: 'dawn', end_h: 'dawn', end_n: 'dawn' };
  const placeOf = (v) => PLACE_OF[v] || (/^t_([a-z]+)_/.exec(v) || [])[1] || '';
  const PURE = () => !!(window.MoHeatPlay && window.MoHeatPlay.pure) || QS.has('sample');   // the shell's "just listen" mode (?sample = test it)

  // ---------------------------------------------------------------- state
  const fresh = () => ({ started: false, t: 0, clock: 0, view: 'white', white: 1, dark: 0, snow: 1, gust: 0, cape: 0, pot: 0, brazier: 0, bowl: 0,
    moxa: 0, balm: 0, blow: 0, lamp: 0, door: 0, guard: 0, sun: 0, hands: 0, stone: 0, coat: 0, place: '', cast: '', fade: 0, lv: 0, env: 0, pos: { az: 0, dist: 1 }, who: '', end: -1, mode: 'story' });
  let S = fresh(), run = 0;
  const STEPS = [['pass', '吹雪の峠', 'The blizzard pass'], ['hall', '宿・火鍋', 'Hotpot at the inn'], ['room', '女医の手当て', "The doctor's care"],
    ['door', '夜番', 'Night watch'], ['trio', '夜明けの峠', 'Dawn on the pass']];
  function setStep(i) { $('steps').innerHTML = STEPS.map((s, k) => `<li class="${k < i ? 'done' : k === i ? 'now' : ''}">${s[1]} · <small>${s[2]}</small></li>`).join(''); }

  // ---------------------------------------------------------------- subtitles + voice
  const subJa = $('subJa'), subEn = $('subEn'), subWho = $('subWho'), subs = $('subs');
  function sub(who, ja, en) { subWho.textContent = who ? NAME[who] || who : ''; subWho.className = `who w${who || ''}`; subJa.textContent = ja || ''; subEn.textContent = en || ''; subs.classList.toggle('show', !!ja); }
  const POS = { front: { az: 0, dist: 1.1 }, near: { az: .05, dist: .5 }, left: { az: -.9, dist: .45 }, right: { az: .9, dist: .45 },
    left_ear: { az: -1.35, dist: .12 }, right_ear: { az: 1.35, dist: .12 }, far: { az: -.15, dist: 2.6 }, trio_n: { az: -.5, dist: 1.2 },
    trio_m: { az: 0, dist: 1.3 }, trio_h: { az: .5, dist: 1.2 } };
  let talking = 0;
  async function say(id, where = POS.front, opt = {}) {
    const my = run; const [ja, en, who] = LINES[id]; S.pos = typeof where === 'string' ? POS[where] : where; S.who = who;
    sub(who, ja, en); talking++;
    await SND.say(id, S.pos, opt.gain ?? (S.pos.dist < .2 ? 1.8 : 1.45));
    talking--; if (my !== run) throw new Error('stopped');
    await sleep(.3); sub('', '', '');
  }
  async function sayLive(it) {   // a line written by the live AI (private page): voiced by the server, same placement / thermal
    if (it.ev) { event(it.ev); return; }   // "@|moxa" … a warm / cool thing of this place (EVENTS)
    const my = run; S.pos = S.mode === 'talk' ? posFor(it.who, it.pos) : POS[it.pos] || POS.front; S.who = it.who; viewFor(it.who, it.pos);
    const buf = await it.audio; if (my !== run) throw new Error('stopped');
    sub(it.who, it.ja, it.en); talking++;
    await SND.play(buf, S.pos, S.pos.dist < .2 ? 1.8 : 1.45);
    talking--; if (my !== run) throw new Error('stopped');
    await sleep(.25); sub('', '', '');
  }
  const alive = (my) => { if (my !== run) throw new Error('stopped'); };

  // ---------------------------------------------------------------- your turn: choices, actions, hold (Demo19 framework)
  const choiceEl = $('choices'), actEl = $('act');
  function choice(opts, timeout = 20, auto = ALT ? 1 : 0) {   // opts: [ja, en, data-voice?]
    return new Promise((res) => {
      choiceEl.innerHTML = opts.map((o, i) => `<button class="ch" data-i="${i}"${o[2] ? ` data-voice="${o[2]}"` : ''}><b>${o[0]}</b><span>${o[1]}</span></button>`).join('');
      choiceEl.classList.add('show');
      const done = (i) => { clearTimeout(tm); clearTimeout(au); choiceEl.classList.remove('show'); choiceEl.innerHTML = ''; res(i); };
      choiceEl.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => done(+b.dataset.i)));
      const tm = setTimeout(() => done(0), timeout * 1000), au = AUTO ? setTimeout(() => done(Math.min(auto, opts.length - 1)), 1200) : 0;
    });
  }
  function action(icon, ja, en, timeout = 20, voice = '') {
    return new Promise((res) => {
      actEl.innerHTML = `<button class="act-btn"${voice ? ` data-voice="${voice}"` : ''}><i>${icon}</i><b>${ja}</b><span>${en}</span></button>`; actEl.classList.add('show');
      const done = () => { clearTimeout(tm); clearTimeout(au); actEl.classList.remove('show'); actEl.innerHTML = ''; res(); };
      actEl.querySelector('button').addEventListener('click', done); const tm = setTimeout(done, timeout * 1000), au = AUTO ? setTimeout(done, 900) : 0;
    });
  }
  // keep still while she treats your ear: hold; let go part-way → false (she starts again); 18 s without a touch finishes on its own
  function stillHold(sec, allowSlip) {
    return new Promise((res) => {
      actEl.classList.add('act-side'); actEl.innerHTML = `<button class="act-btn hold"><i>🤲</i><b>じっとする（長押し）</b><span>Keep still (press and hold)</span><em class="bar"><u></u></em></button>`; actEl.classList.add('show');
      const b = actEl.querySelector('button'), bar = b.querySelector('u'); let down = false, k = 0, upFor = 0, last = performance.now(); const t0 = last;
      const set = (v) => (e) => { e?.preventDefault?.(); down = v; b.classList.toggle('down', v); };
      b.addEventListener('pointerdown', set(true)); for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, set(false));
      const key = (v) => (e) => { if (e.code === 'Space') { e.preventDefault(); down = v; b.classList.toggle('down', v); } };
      const kd = key(true), ku = key(false); addEventListener('keydown', kd); addEventListener('keyup', ku);
      const end = (ok) => { removeEventListener('keydown', kd); removeEventListener('keyup', ku); actEl.classList.remove('show', 'act-side'); actEl.innerHTML = ''; S.hold = 0; res(ok); };
      const tick = () => {
        const n = performance.now(), dt = (n - last) / 1000; last = n;
        const holding = down || (AUTO && !(ALT && allowSlip && k > .35)) || (k === 0 && n - t0 > 18000);
        if (holding) { k = Math.min(1, k + dt / sec); upFor = 0; } else if (k > .08) upFor += dt;
        bar.style.width = `${k * 100}%`; S.hold = holding ? 1 : 0;
        if (allowSlip && upFor > .5) return end(false);
        if (!allowSlip && !holding && n - t0 > 18000) k = Math.min(1, k + dt / sec);
        if (k >= 1) return end(true);
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  // ---------------------------------------------------------------- free talk (shared/talk.js): a short window, then the story goes on
  const BR = window.MoHeatTalk.bridges(D.bridges);
  async function talkWindow(who, at, yn, prompt) {
    const my = run;
    const said = await listenTurn({ host: stage, prompt, silenceSec: 10 }); alive(my);
    if (said) { sub('あなた', said, said); await sleep(.9); }
    if (LIVE) { for (const it of await LIVE.turn({ mode: 'window', who, place: S.view, said, kind: said ? 'user' : 'silent' })) await sayLive(it); return; }
    const id = BR.pick(who, window.MoHeatTalk.topic(said, D.topics, { yn, yn_only: D.yn_only }));
    if (id) await say(id, at);
  }

  // ---------------------------------------------------------------- the story
  async function story() {
    const my = ++run;
    try {
      // 1 · the blizzard pass: white-out, the wind (gusts sweep left → right), boots in the snow — Nagisa
      setStep(0); S.view = 'white'; S.snow = 1;
      const wind = SND.loop('blizzard'); wind?.set(.55, 1);
      await sleep(1.6); SND.fx.crunch(-.3, 3, 6, 1.4); await sleep(2.2); alive(my);
      await say('n01', POS.far);
      S.view = 'pass'; S.white = 0; await sleep(.6);
      await say('n02', POS.front);
      const a = await choice([['助けて…', 'Help me…', 'たすけて|助けて|help me|please help|救命|帮帮我'], ['あなたは…？', 'Who are you…?', 'あなたは誰|あなたはだれ|だれなの|who are you|你是谁']]);
      await say(a ? 'n03b' : 'n03a', POS.front);
      await say('n04', POS.front);
      await say('n05', POS.near);
      await action('🤝', '手をとる', 'Take her hand', 15, 'て|手|とる|取る|hand|take|握|手');
      alive(my); SND.fx.rustle(0, .4);
      await say('n06', POS.near);
      SND.fx.cape(); S.cape = 1; await sleep(1); alive(my);
      await say('n07', POS.near);
      // carried down the mountain on her back: the white-out, her steps, the wind dropping
      S.white = 1; SND.fx.crunch(0, .5, 8, .5); await sleep(3.6); alive(my); wind?.set(.15, 1.5);
      SND.fx.slide(-.3, true); await sleep(.5);

      // 2 · the inn: hotpot in front, brazier on the right — Hinata, dice, a bet; window ①
      setStep(1); S.white = 0; S.snow = 0; S.cape = .3; wind?.set(.05, .8);
      const room = SND.loop('room'), pot = SND.loop('hotpot'), braz = SND.loop('brazier'); room?.set(.35, 1); braz?.at(1.1, 1.6); braz?.set(.35, 1);
      S.view = 'hall'; S.brazier = 1; await sleep(.8);
      SND.fx.slide(-.3, false);
      await say('h01', POS.front);
      await say('n08', POS.left);
      await say('h02', POS.front);
      S.pot = 1; pot?.set(.45, 1); SND.fx.bowl(); await sleep(1); alive(my);
      S.view = 'dice'; await sleep(.4);
      await say('h03', POS.front);
      await say('h04', POS.front);
      const b = await choice([['大！', 'Big!', 'だい|大|おおきい|big|大的'], ['小！', 'Small!', 'しょう|小|ちいさい|small|小的']]);
      SND.fx.dice(.1); await sleep(1.6); SND.fx.reveal(); await sleep(.6); alive(my);
      await say(b ? 'h05b' : 'h05a', POS.front);
      SND.fx.bowl(); S.bowl = 1; await sleep(.5);
      S.view = 'hear'; SND.fx.rustle(1.2, .3); await sleep(.3);
      await say('h06', POS.right_ear);
      S.bowl = 0;
      S.view = 'hall'; await sleep(.3);
      await say('h07', POS.front);
      await talkWindow('H', POS.front, false, ['ひなたに答えてみよう（何でも）', 'Answer Hinata (anything)']);
      await say('n09', POS.left);
      SND.fx.boards(.2, 1.3, 4, 1.6);
      await say('h08', { az: 1.1, dist: 2.2 });
      S.fade = 1; await sleep(1.2); alive(my);

      // 3 · the doctor's room: Mint; moxa (moving warmth) + mint balm (cool) on the SAME right ear; eyes closed, left whisper; window ②
      setStep(2); S.fade = 0; S.fadeA = 0; S.pot = 0; S.brazier = 0; pot?.set(0, .5); braz?.set(.12, .8); S.lamp = 1;
      S.view = 'room'; SND.fx.slide(.6, false); await sleep(.8);
      await say('m01', POS.front);
      await say('m02', POS.front);
      SND.fx.rustle(.3, .5);
      await say('m03', POS.near);
      S.view = 'mear'; SND.fx.rustle(1.2, .25); await sleep(.4);
      S.moxa = 1; const mx = SND.loop('moxa'); mx?.set(.5, .3);
      await say('m04', POS.right_ear);
      await sleep(2.2); alive(my);                                   // the moxa alone circling your right ear (warm)
      S.moxa = 0; mx?.set(0, .2); SND.fx.tin(1.2); await sleep(.3);   // she lifts it away, dabs the mint balm on and blows on it:
      S.balm = 1; S.blow = 1; SND.fx.blow(1.35); await sleep(2.2); S.blow = 0; alive(my);   // right ear warm → cool in about a second
      await say('m05', POS.right_ear);
      S.moxa = 1; mx?.set(.5, .3);                                   // the moxa back over the balm: warm + cool on the SAME ear
      await say('m06', POS.right_ear);
      let ok = await stillHold(5, true); alive(my);
      if (!ok) { S.moxa = .3; await say('m07x', POS.right_ear); S.moxa = 1; ok = await stillHold(4, false); alive(my); }
      S.moxa = 0; mx?.set(0, .3); S.blow = 1;
      await say('m07', POS.right_ear);
      await sleep(1.2); S.blow = 0; alive(my);
      await say('m08', POS.near);
      S.dark = 1; await sleep(1);
      await say('m09', POS.left_ear);
      await sleep(.6); S.dark = 0; S.view = 'room'; S.balm = .5; await sleep(.6);
      await say('m10', POS.near);
      await talkWindow('M', POS.near, true, ['ミントに答えてみよう', 'Answer Mint']);
      S.balm = 0; mx?.stop(); S.fade = 1; await sleep(1.4); alive(my);

      // 4 · night watch: the front door bursts open on your LEFT (cold gust) — Nagisa stands in the wind there; window ③
      setStep(3); S.lamp = 0; S.dark = 1; S.fade = 0; S.fadeA = 0; room?.set(.2, 1); braz?.at(1.2, 2.2); braz?.set(.2, 1); wind?.at(-1.25, 2.5); wind?.set(.12, 1);
      S.view = 'door'; S.brazier = .6; await sleep(1.6); alive(my);
      SND.fx.bang(-1.25); S.door = 1; wind?.set(.8, .15); S.snow = .6; S.dark = 0; await sleep(.5);
      SND.fx.boards(1.2, -.8, 5, 1.4);
      await say('n10', { az: -.3, dist: 1.4 });
      SND.fx.rustle(-.9, .4); S.guard = 1; wind?.set(.4, .6);
      await say('n11', POS.left);
      await say('n12', POS.left);
      await talkWindow('N', POS.left, true, ['渚に答えてみよう', 'Answer Nagisa']);
      await say('n13', POS.left);
      await say('n14', POS.left);
      const c = await choice([['「おつかれさま」', '"Otsukare-sama" (thanks for your hard work)', 'おつかれさま|お疲れ様|おつかれ|辛苦了|good work|hard work|well done'], ['「ありがとう」', '"Thank you"', 'ありがとう|有難う|thank you|thanks|谢谢']]);
      await say(c ? 'n15b' : 'n15a', POS.left);
      await say('n16', POS.left_ear);
      S.fade = 1; wind?.set(.1, 2); await sleep(1.8); alive(my);

      // 5 · dawn on the pass: all three; take one token → her last whisper → you wake up in the present with it
      setStep(4); S.fade = 0; S.fadeA = 0; S.door = 0; S.guard = 0; S.brazier = 0; braz?.set(0, .5); room?.set(0, 1); wind?.at(-.6, 2); wind?.set(.18, 1);
      S.view = 'trio'; S.sun = 1; S.snow = .35; SND.fx.crunch(0, 1.5, 4, 1.2); await sleep(1.2); alive(my);
      await say('h09', POS.trio_h);
      await say('m11', POS.trio_m);
      await say('n17', POS.trio_n);
      S.end = await choice([['ミントの星の簪', "Mint's star hairpin", 'ミント|みんと|星|ほし|簪|かんざし|mint|hairpin|star|薄荷|发簪|星星'],
        ['ひなたのサイコロ', "Hinata's dice", 'ひなた|日向|サイコロ|さいころ|dice|hinata|骰子'],
        ['渚の髪紐', "Nagisa's hair tie", 'なぎさ|渚|髪紐|かみひも|ひも|nagisa|hair tie|发绳']], 25, PICK3);
      const END = [['end_m', 'm12', POS.right_ear], ['end_h', 'h10', POS.right_ear], ['end_n', 'n18', POS.left_ear]][S.end];
      S.view = END[0]; SND.fx.rustle(END[2].az, .3); await sleep(.4);
      await say(END[1], END[2]);
      await sleep(1.2); S.white = 1; SND.fx.wake(); wind?.set(.4, .8); await sleep(2.4); wind?.set(0, 1.2); SND.fx.chime(); await sleep(1.6); alive(my);
      try { sessionStorage.setItem('moheat.inn.cleared', '1'); } catch {}
      // just-listen mode (shared/shell.js): one short もっと話す sample plays by itself — all three in the place of the token you took
      if (PURE() && !LIVE) { S.white = 0; return keepTalking(['room', 'hall', 'door'][S.end] || 'dawn', 'MHN', true); }
      finish();
    } catch (e) { if (e.message !== 'stopped') console.error(e); }
  }

  // ---------------------------------------------------------------- もっと話す · keep talking: place × cast (user 2026-11-08, like Demo23)
  // 5 places from the story × ミント / ひなた / 渚 / 三人 (lines.js places: beats per cast, '@events', the place's own topic + bridges).
  // Scripted here (pre-rendered voices, 0 cost); the private live page sends the same place + cast to the AI (live/live.js).
  async function listenTurn(opt) {   // one turn of yours; in just-listen mode a short natural pause instead (no microphone)
    if (PURE()) { await sleep(2.2); return null; }
    return window.MoHeatTalk.listen(opt);
  }
  function viewFor(who, pos) {   // the picture for this line: her close pose at an ear (where one exists there), else her / the group's view
    if (S.mode !== 'talk') return;
    const P = TV.place[S.place], ear = /_ear$/.test(pos || '');
    S.view = (ear && P.ear[who]) || (S.cast === 'MHN' ? P.trio : P.base[who] || P.base[S.cast]);
  }
  const TRIO_POS = { M: POS.trio_m, H: POS.trio_h, N: POS.trio_n };
  const posFor = (who, pos) => (S.cast === 'MHN' && !/_ear$/.test(pos || '') ? TRIO_POS[who] : POS[pos] || POS.front);
  // the place around you: what is really warm / cool there (DUAL; same sources as in the story)
  const PLACE_AMB = {
    pass: () => { S.snow = 1; S.cape = 1; SND.loop('blizzard')?.set(.45, 1); },                       // blizzard + gusts left → right, her fur cape on you
    hall: () => { S.pot = 1; S.brazier = 1; SND.loop('room')?.set(.3, 1); SND.loop('hotpot')?.set(.4, 1); SND.loop('brazier')?.at(1.1, 1.6); SND.loop('brazier')?.set(.3, 1); },
    room: () => { S.lamp = 1; SND.loop('room')?.set(.25, 1); SND.loop('brazier')?.set(.1, 1); },     // the paper lamp on the left
    door: () => { S.door = .25; S.brazier = .6; S.guard = S.cast.includes('N') ? 1 : 0; SND.loop('room')?.set(.2, 1); SND.loop('blizzard')?.at(-1.25, 2.5); SND.loop('blizzard')?.set(.18, 1); SND.loop('brazier')?.at(1.2, 2.2); SND.loop('brazier')?.set(.2, 1); },
    dawn: () => { S.sun = 1; S.snow = .35; SND.loop('blizzard')?.at(-.6, 2); SND.loop('blizzard')?.set(.15, 1); },
  };
  // '@events' in the beats (and '@|event' lines of the live AI): a real thing near your ears, for a few seconds
  const EVENTS = {
    hands: [5, () => { S.hands = 1; SND.fx.rustle(1.3, .2); }, () => { S.hands = 0; }],                // Mint cups your right ear (warm, in the cold wind)
    stone: [5, () => { S.stone = 1; SND.fx.rustle(.9, .3); }, () => { S.stone = 0; }],                 // Hinata's warming stone on your right cheek
    guard: [0, () => { S.guard = 1; SND.fx.rustle(-.9, .4); }],                                       // Nagisa steps to your left: blocks the wind
    stoke: [6, () => { S.brazier = 1.6; SND.fx.boards(1.1, 1.1, 2, 1.2); }, () => { S.brazier = 1; }],   // more charcoal on the brazier (right)
    bowl: [5, () => { S.bowl = 1; SND.fx.bowl(); }, () => { S.bowl = 0; }],                            // a steaming bowl at your face
    moxa: [6, () => { S.moxa = 1; SND.loop('moxa')?.set(.5, .3); }, () => { S.moxa = 0; SND.loop('moxa')?.set(0, .3); }],   // circling your right ear
    balm: [6, () => { S.balm = 1; SND.fx.tin(1.2); }, () => { S.balm = .4; }],                        // mint balm on the same ear (cool)
    gust: [3, () => { S.door = 1; SND.fx.bang(-1.25); SND.loop('blizzard')?.set(.6, .2); }, () => { S.door = .25; SND.loop('blizzard')?.set(.18, 1); }],   // the door rattles open (left)
    coat: [0, () => { S.coat = 1; SND.fx.cape(); }],                                                  // Mint's coat over your shoulders
    shut: [0, () => { S.door = .05; SND.fx.slide(-1.2, false); SND.loop('blizzard')?.set(.06, 1); }],  // Hinata wedges the door shut
    sun: [6, () => { S.sun = 1.8; }, () => { S.sun = 1; }],                                            // the sun clears the ridge in front
  };
  function event(name) {
    const e = EVENTS[name]; if (!e) return; const my = run; e[1]();
    if (e[2]) setTimeout(() => { if (my === run) e[2](); }, e[0] * 1000);
  }
  async function playBeat(beat) {
    for (const it of beat) {
      if (it[0][0] === '@') { event(it[0].slice(1)); continue; }
      const [id, pos] = it; viewFor(LINES[id][2], pos); await say(id, posFor(LINES[id][2], pos));
    }
  }
  async function keepTalking(place, cast, sample = false) {
    const my = ++run; S.mode = 'talk'; S.place = place; S.cast = cast;
    const P = D.places[place], T = TV.place[place];
    for (const v of [...Object.values(T.base), ...Object.values(T.ear), T.trio]) if (v) need(v);
    // topics: leave → the place's own → the shared ones; bridges: the place's pool for its topic, else the shared ones
    const topics = [D.topics[0], P.topic, ...D.topics.slice(1)];
    const pick = (who, said, yn) => { const k = window.MoHeatTalk.topic(said, topics, { yn, yn_only: D.yn_only }); return BRP.pick(who, k); };
    const BRP = window.MoHeatTalk.bridges(Object.fromEntries(['M', 'H', 'N'].map((c) => [c, { ...D.bridges[c], ...(P.bridges[c] || {}) }])));
    try {
      for (const k of ['snow', 'cape', 'pot', 'brazier', 'bowl', 'moxa', 'balm', 'blow', 'lamp', 'door', 'guard', 'sun', 'hands', 'stone', 'coat']) S[k] = 0;   // only this place's things
      for (const l of ['room', 'hotpot', 'brazier', 'blizzard', 'moxa']) SND.loop(l)?.set(0, .5);
      PLACE_AMB[place](); S.view = cast === 'MHN' ? T.trio : T.base[cast]; S.white = 0; await sleep(1); alive(my);
      if (LIVE) {
        let kind = 'open', said = null;
        for (let turn = 0; turn < 6; turn++) {
          const lines = await LIVE.turn({ mode: 'talk', who: cast, place, said, kind: turn === 5 ? 'close' : kind });
          for (const it of lines) await sayLive(it);
          if (turn === 5 || LIVE.ended()) break;
          said = await listenTurn({ host: stage, silenceSec: 12 }); alive(my); kind = said ? 'user' : 'silent';
          if (said) { sub('あなた', said, said); await sleep(.6); }
        }
      } else {
        let beats = P.cast[cast];
        if (sample) beats = [beats[0], beats[1], beats[beats.length - 1]];   // the just-listen sample: opening, one exchange, the goodbye
        for (let i = 0; i < beats.length; i++) {
          await playBeat(beats[i]);
          if (i === beats.length - 1) break;
          const said = await listenTurn({ host: stage, silenceSec: 10 }); alive(my);
          if (said) { sub('あなた', said, said); await sleep(.8); }
          const first = beats[i + 1].find((x) => x[0][0] !== '@'), nx = LINES[first[0]][2], id = pick(nx, said, false);
          if (id) { viewFor(nx, first[1]); await say(id, posFor(nx, first[1])); }
        }
      }
      await sleep(1.2); S.fade = 1; await sleep(2); alive(my); finish(!sample);
    } catch (e) { if (e.message !== 'stopped') console.error(e); }
  }

  // ---------------------------------------------------------------- per-frame state + thermal
  const K = {}; for (const k of ['cape', 'pot', 'brazier', 'bowl', 'moxa', 'balm', 'blow', 'lamp', 'door', 'guard', 'sun', 'snow', 'hands', 'stone', 'coat']) K[k] = 0;
  let gustT = 0, gustAz = -1.4, gustS = 0;
  function update(dt) {
    S.t += dt; if (!S.started) return;
    S.clock += dt; S.lv = SND.voiceLevel();
    { const vt = talking ? 1 : 0; S.env += (vt - S.env) * (1 - Math.exp(-dt / (vt > S.env ? .06 : .3))); }   // talking envelope (layers.js mouth)
    const ease = (cur, tgt, up, down) => cur + (tgt - cur) * (1 - Math.exp(-dt / (tgt > cur ? up : down)));
    const tau = { cape: [.6, .6], pot: [.8, 1], brazier: [1, 1], bowl: [.3, .8], moxa: [.25, .3], balm: [.2, .9], blow: [.12, .5], lamp: [1, 1], door: [.15, .6], guard: [.5, .8], sun: [2, 1], snow: [1, 1], hands: [.4, .8], stone: [.25, .9], coat: [.6, .6] };
    for (const k in K) K[k] = ease(K[k], S[k] || 0, ...tau[k]);
    // blizzard gusts on the pass / through the door: a gust sweeps from your left to your right in ~2.5 s, every 4–6 s
    gustT -= dt;
    if (gustT <= 0) { gustT = 4 + Math.random() * 2; gustAz = -1.45; gustS = 1; }
    gustAz = Math.min(1.45, gustAz + dt * 1.15); gustS = Math.max(0, gustS - dt * .3);
    const w = SND.loop('blizzard'); if (w && placeOf(S.view) === 'pass') w.at(gustAz * .8, 2, .3);
  }
  // Thermal, two layers (firmware DUAL: cool and heat independent on each ear).
  //  · VOICE: warm. (0.1 + 0.8 × loudness) at the ear the speaker is at — × 1 at the ear, × 0.6 within 50 cm, × 0.28 further; halved in front.
  //  · AMBIENT (real things next to your ears): the blizzard (both cool 0.3) + gusts sweeping left → right (moving cool 0.45, much less
  //    under the fur cape), the hotpot steam in front (both warm 0.3), the brazier on the right (right warm 0.18), the soup bowl at your
  //    face (both warm 0.45), the moxa stick circling your right ear (moving warmth 0.55 around az 1.35), the mint balm on the same ear
  //    (right cool 0.45), her breath on the balm (right cool 0.85, heat → cool in a second), the paper lamp on the left (0.1), the front
  //    door blown open on your left (left cool 0.65), Nagisa blocking it (left cool → 0.15, her shoulder warm 0.18), the dawn sun in
  //    front (warm 0.15) and the snow (cool 0.12). Not heated: the bet, a blush, the hotpot's "spice".
  function sources() {
    const out = [], add = (az, k, s, icon) => { if (s > .01) out.push({ az, k, s, icon }); };
    if (!S.started) return out;
    const P = S.pos;
    if (talking) add(P.az, 'h', (.1 + .8 * clamp(S.lv * 8)) * (P.dist < .15 ? 1 : P.dist <= .5 ? .6 : .28) * (Math.abs(P.az) < .5 ? .5 : 1), '💬');
    const capeCut = 1 - .65 * K.cape;
    if (placeOf(S.view) === 'pass') {   // the blizzard; Nagisa on your left (talk) takes the gust's left half
      if (K.snow > .02) { add(0, 'c', .3 * K.snow * capeCut, '❄️'); add(gustAz, 'c', .45 * gustS * K.snow * capeCut * (gustAz < 0 ? 1 - .6 * K.guard : 1), '🌬'); }
    } else if (K.snow > .02) add(0, 'c', .12 * K.snow, '❄️');
    if (K.pot > .02) add(0, 'h', .3 * K.pot, '🍲');
    if (K.brazier > .02) add(1.15, 'h', .18 * K.brazier, '🔥');
    if (K.bowl > .02) add(0, 'h', .45 * K.bowl, '🥣');
    if (K.moxa > .02) add(1.35 + .35 * Math.sin(S.t * 2.4), 'h', .55 * K.moxa, '🪔');   // circling: the warmth moves with the stick
    if (K.balm > .02) add(1.4, 'c', .45 * K.balm, '🌿');
    if (K.blow > .02) add(1.35, 'c', .85 * K.blow, '💨');
    if (K.lamp > .02) add(-1.1, 'h', .1 * K.lamp, '🏮');
    if (K.door > .02) add(-1.25, 'c', (.65 - .5 * K.guard) * K.door * (.85 + .15 * gustS) * (1 - .5 * K.coat), '🌬');
    if (K.guard > .02) add(-1.3, 'h', .18 * K.guard, '🧡');
    if (K.sun > .02) add(0, 'h', .15 * K.sun, '🌅');
    if (K.hands > .02) add(1.35, 'h', .3 * K.hands, '🤲');     // talk: Mint's warm hands round your right ear
    if (K.stone > .02) add(1.0, 'h', .45 * K.stone, '🪨');     // talk: a warming stone on your right cheek
    return out;
  }
  const ear = { Lc: 0, Lh: 0, Rc: 0, Rh: 0 };
  function thermal(dt) {
    const sum = { L: { h: 0, c: 0 }, R: { h: 0, c: 0 } }, src = sources();
    for (const s of src) { const sn = Math.sin(s.az), wL = clamp(1 - 1.2 * Math.max(0, sn)), wR = clamp(1 - 1.2 * Math.max(0, -sn)); sum.L[s.k] += s.s * wL; sum.R[s.k] += s.s * wR; }
    for (const e of ['L', 'R']) for (const k of ['c', 'h']) {
      const target = k === 'h' ? Math.min(.9, sum[e].h) : Math.min(1, sum[e].c), cur = ear[e + k];
      const tau = target > cur ? (k === 'h' ? .4 : .2) : (k === 'h' ? .5 : .35);
      ear[e + k] = cur + (target - cur) * (1 - Math.exp(-dt / tau));
    }
    return { th: { ...ear }, src };
  }

  // ---------------------------------------------------------------- drawing: stills (layered), cross-fades, snow, steam, smoke, the dark
  let viewA = 'white', viewB = 'white', mix = 1;
  function drawView(view, alpha, t) {
    const im = IMG[view === 'white' ? 'pass' : view];
    ctx.globalAlpha = alpha;
    if (!im) { ctx.fillStyle = '#0d1018'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; return; }
    if (LIVEL()) ctx.drawImage(im, 0, 0, W, H);   // layered: shared/layers.js animates it (no page drift, §6.4)
    else { const z = 1.02 + .006 * Math.sin(t * 1.1); ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.drawImage(im, -W / 2, -H / 2, W, H); ctx.restore(); }
    ctx.globalAlpha = 1;
  }
  // particles (DEMO_DESIGN_GUIDE §6.4): snow falls at terminal speed and drifts with the wind (gusts blow left → right); steam rises,
  // slows and spreads; moxa smoke rises in a thin wavering line from the ember
  const EMBER = [1718, 604];   // the lit tip of the moxa stick in media/art/mint_mear.jpg (1920 × 1080)
  const flakes = Array.from({ length: 260 }, () => ({ x: Math.random() * W, y: Math.random() * H, z: .3 + Math.random() * .7, ph: Math.random() * 6 }));
  const puffs = [];
  function drawSnow(dt, t, amount, wind) {
    if (amount < .02) return;
    ctx.save(); ctx.fillStyle = '#fff';
    for (const f of flakes) {
      f.y += (60 + 120 * f.z) * dt; f.x += (wind * 520 * f.z + 18 * Math.sin(t * 1.3 + f.ph)) * dt;
      if (f.y > H + 10) { f.y = -10; f.x = Math.random() * W; } if (f.x > W + 20) f.x = -20; if (f.x < -20) f.x = W + 20;
      ctx.globalAlpha = amount * (.35 + .55 * f.z); ctx.beginPath(); ctx.arc(f.x, f.y, 1.2 + 3.2 * f.z, 0, 7); ctx.fill();
    }
    ctx.restore();
  }
  function emitSteam(dt, x, y, rate, spread = 60) {
    if (Math.random() < rate * dt) puffs.push({ x: x + (Math.random() - .5) * spread, y, vx: (Math.random() - .5) * 8, vy: -70 - Math.random() * 30, r: 30 + Math.random() * 20, a: 0, life: 0, max: 3 + Math.random() * 1.5, kind: 'steam' });
  }
  function drawPuffs(dt) {
    ctx.save();
    for (let i = puffs.length - 1; i >= 0; i--) {
      const p = puffs[i]; p.life += dt; if (p.life > p.max) { puffs.splice(i, 1); continue; }
      p.vy *= Math.exp(-dt * .5); p.x += p.vx * dt; p.y += p.vy * dt; p.r += (p.kind === 'smoke' ? 6 : 22) * dt;
      const k = p.life / p.max, a = (p.kind === 'smoke' ? .35 : .22) * Math.sin(Math.PI * Math.min(1, k * 1.2));
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r); g.addColorStop(0, `rgba(255,248,240,${a})`); g.addColorStop(1, 'rgba(255,248,240,0)');
      ctx.fillStyle = g; ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
    }
    ctx.restore();
  }
  function draw(t, dt) {
    if (S.view !== viewB) { viewA = viewB; viewB = S.view; mix = 0; }
    mix = Math.min(1, mix + dt / .6);
    if (mix < 1) drawView(viewA, 1, t);
    drawView(viewB, mix < 1 ? mix : 1, t);
    const v = S.view;
    // steam from the hotpot (just below the frame, in front of you) and the soup bowl; the moxa ember's smoke follows her hand
    const pl = placeOf(v);
    if (K.pot > .05 && pl === 'hall') emitSteam(dt, W * .5, H * 1.02, 6 * K.pot, 500);
    if (K.bowl > .05) emitSteam(dt, W * .5, H * .98, 10 * K.bowl, 200);
    if (K.moxa > .1 && v === 'mear') {
      const [x, y] = window.MoHeatLayers?.toFrame ? window.MoHeatLayers.toFrame('mint_mear', EMBER[0], EMBER[1]) : EMBER;   // follows her hand (parallax / breathing, guide §6.4)
      if (Math.random() < 14 * dt) puffs.push({ x: x + (Math.random() - .5) * 4, y, vx: 6 + Math.sin(t * 2) * 10, vy: -55, r: 5, a: 0, life: 0, max: 2.2, kind: 'smoke' });
      const g = ctx.createRadialGradient(x, y, 0, x, y, 40); g.addColorStop(0, `rgba(255,150,60,${.55 * K.moxa})`); g.addColorStop(1, 'rgba(255,120,40,0)'); ctx.fillStyle = g; ctx.fillRect(x - 40, y - 40, 80, 80);
    }
    drawPuffs(dt);
    const wind = pl === 'pass' ? .35 + .5 * gustS : pl === 'door' ? .25 + .55 * K.door * (1 - .4 * K.guard) : .05;
    drawSnow(dt, t, (pl === 'pass' || pl === 'dawn') ? K.snow : pl === 'door' ? .7 * K.door : 0, wind);
    if (K.door > .02 && pl === 'door') { const g = ctx.createLinearGradient(0, 0, W * .4, 0); g.addColorStop(0, `rgba(90,140,230,${.25 * K.door})`); g.addColorStop(1, 'rgba(90,140,230,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W * .4, H); }
    if (K.sun > .02 && pl === 'dawn') { const g = ctx.createRadialGradient(W * .62, H * .3, 0, W * .62, H * .3, W * .5); g.addColorStop(0, `rgba(255,200,130,${.16 * K.sun})`); g.addColorStop(1, 'rgba(255,200,130,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    S.whiteA = (S.whiteA || 0) + ((S.white ? 1 : 0) - (S.whiteA || 0)) * Math.min(1, dt * 1.6);
    if (S.whiteA > .01) { ctx.fillStyle = `rgba(232,238,246,${.92 * S.whiteA})`; ctx.fillRect(0, 0, W, H); }
    S.darkA = (S.darkA || 0) + ((S.dark ? 1 : 0) - (S.darkA || 0)) * Math.min(1, dt * 2);
    if (S.darkA > .01) { ctx.fillStyle = `rgba(8,8,14,${.94 * S.darkA})`; ctx.fillRect(0, 0, W, H); }
    if (S.fade) { S.fadeA = Math.min(1, (S.fadeA || 0) + dt / 1.2); ctx.fillStyle = `rgba(10,12,20,${S.fadeA})`; ctx.fillRect(0, 0, W, H); }
  }

  // ---------------------------------------------------------------- side panel + device (same protocol as every demo)
  const rc = $('radar').getContext('2d');
  function radar(src, th) {
    const cx = 240, cy = 220, R = 160; rc.clearRect(0, 0, 480, 420);
    rc.strokeStyle = 'rgba(255,255,255,.08)'; rc.lineWidth = 1.5; for (const r of [R * .5, R]) { rc.beginPath(); rc.arc(cx, cy, r, 0, 7); rc.stroke(); }
    rc.fillStyle = '#8f9ab8'; rc.font = '600 13px Inter'; rc.textAlign = 'center'; rc.fillText('front', cx, cy - R - 10); rc.fillText('L', cx - R - 18, cy + 5); rc.fillText('R', cx + R + 18, cy + 5);
    for (const [e, sx] of [['L', -1], ['R', 1]]) {
      rc.fillStyle = '#28304a'; rc.beginPath(); rc.ellipse(cx + sx * 46, cy, 12, 24, 0, 0, 7); rc.fill();
      for (const [k, col, dy] of [['h', '255,122,69', -12], ['c', '79,179,255', 12]]) if (th[e + k] > .02) { rc.fillStyle = `rgba(${col},${.25 + .75 * th[e + k]})`; rc.beginPath(); rc.ellipse(cx + sx * 46, cy + dy, 11, 12, 0, 0, 7); rc.fill(); }
    }
    rc.fillStyle = '#323d5c'; rc.beginPath(); rc.arc(cx, cy, 40, 0, 7); rc.fill();
    rc.font = '26px sans-serif'; rc.textBaseline = 'middle';
    for (const s of src) { const x = cx + Math.sin(s.az) * R, y = cy - Math.cos(s.az) * R; rc.globalAlpha = clamp(.35 + s.s); rc.fillStyle = s.k === 'h' ? 'rgba(255,122,69,.25)' : 'rgba(79,179,255,.25)'; rc.beginPath(); rc.arc(x, y, 18 + 18 * s.s, 0, 7); rc.fill(); rc.fillText(s.icon, x, y + 1); rc.globalAlpha = 1; }
    rc.textBaseline = 'alphabetic';
  }
  const DEFAULT_RANGE = { heatMin: 0, heatMax: 200, coolMin: 35, coolMax: 80 }, SEND_INTERVAL = 100, OFF = .03;
  const store = { get: (k, d) => { try { return JSON.parse(localStorage.getItem(`moheat.${k}`)) ?? d; } catch { return d; } }, set: (k, v) => { try { localStorage.setItem(`moheat.${k}`, JSON.stringify(v)); } catch {} } };
  const range = { ...DEFAULT_RANGE, ...store.get('range', {}) };
  let lastSent = '', lastSendAt = 0, tripped = false, intensity = +store.get('asmr.intensity', 100) / 100;
  const device = MoHeatDevice.create({ select: $('portSelect'), addBtn: $('addPort'), connectBtn: $('connectBtn'), status: $('deviceStatus') }, { log: (l) => console.log('[MoHeat]', l), onConnect: () => { lastSent = ''; } });
  if (!MoHeatDevice.supported) $('deviceStatus').querySelector('span').textContent = 'Web Serial needs desktop Chrome / Edge';
  function command(th) {   // DUAL: each ear's cool and heat set independently (firmware 2026-11-08)
    const c = (v) => (v > OFF ? Math.round(range.coolMin + v * (range.coolMax - range.coolMin)) : 0), h = (v) => (v > OFF ? Math.round(range.heatMin + v * (range.heatMax - range.heatMin)) : 0);
    return Math.max(th.Lc, th.Lh, th.Rc, th.Rh) <= OFF ? 'stop' : `DUAL LC${c(th.Lc)} LH${h(th.Lh)} RC${c(th.Rc)} RH${h(th.Rh)}`;
  }
  function stopOutput() { if (device.isConnected()) device.send('stop'); lastSent = 'stop'; }
  function emergencyStop() { tripped = !tripped; const b = $('estop'); if (tripped) { stopOutput(); b.textContent = '↺ Re-arm output'; b.classList.add('tripped'); } else { b.textContent = '■ STOP'; b.classList.remove('tripped'); lastSent = ''; } }
  $('estop').addEventListener('click', emergencyStop); addEventListener('pagehide', stopOutput);
  $('intensity').value = Math.round(intensity * 100); $('intensityVal').textContent = `${Math.round(intensity * 100)}%`;
  $('intensity').addEventListener('input', (e) => { intensity = +e.target.value / 100; $('intensityVal').textContent = `${e.target.value}%`; store.set('asmr.intensity', +e.target.value); });
  const meterEls = Object.fromEntries(['Lc', 'Lh', 'Rc', 'Rh'].map((k) => [k, [$(`m${k}`), $(`v${k}`)]]));
  let both = 0; const cmdLog = [];
  function output(th, live) {
    const sc = Object.fromEntries(Object.entries(th).map(([k, v]) => [k, live && !tripped ? v * intensity : 0]));
    if ((sc.Lc > OFF && sc.Lh > OFF) || (sc.Rc > OFF && sc.Rh > OFF)) both++;
    for (const [k, [bar, val]] of Object.entries(meterEls)) { bar.style.width = `${sc[k] * 100}%`; val.textContent = Math.round(sc[k] * 100); }
    const cmd = command(sc); $('cmd').textContent = cmd;
    for (const [e, el] of [['L', $('glowL')], ['R', $('glowR')]]) {
      const c = sc[e + 'c'], h = sc[e + 'h'], v = Math.max(c, h), dir = e === 'L' ? 'right' : 'left';
      el.style.opacity = v.toFixed(2); el.style.background = c > .03 && h > .03 ? `linear-gradient(to bottom, rgba(255,122,69,${(.6 * Math.sqrt(h / v)).toFixed(2)}) 0 38%, rgba(79,179,255,${(.6 * Math.sqrt(c / v)).toFixed(2)}) 62% 100%)` : `linear-gradient(to ${dir}, rgba(255,122,69,${(.55 * h / (v || 1)).toFixed(2)}), rgba(255,122,69,0)), linear-gradient(to ${dir}, rgba(79,179,255,${(.55 * c / (v || 1)).toFixed(2)}), rgba(79,179,255,0))`;   // cool AND heat on one ear: warm on top, cool below, blended over the middle; the .glow mask fades it inward (layered, they read as grey: Demo19 2026-11-10)
    }
    if (AUTO && cmd !== cmdLog[cmdLog.length - 1]?.[1]) cmdLog.push([+S.clock.toFixed(2), cmd]);
    if (!device.isConnected() || !$('sendOn').checked) return;
    const n = performance.now(); if (cmd !== lastSent && n - lastSendAt >= SEND_INTERVAL) { device.send(cmd); lastSent = cmd; lastSendAt = n; }
  }
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const PLACE = { white: 'the pass · white-out', pass: 'the White-Ridge pass', hall: 'Yukimi Inn · the hotpot table', dice: 'Yukimi Inn · big or small',
    hear: 'at your right ear', room: "the doctor's room", mear: 'at your right ear · moxa + mint balm', door: 'the entrance · night watch',
    trio: 'the pass at dawn', end_m: 'at your right ear', end_h: 'at your right ear', end_n: 'at your left ear' };

  // ---------------------------------------------------------------- loop / start / end
  let last = performance.now(), hidden = false;
  function loop() {
    const n = performance.now(), dt = clamp((n - last) / 1000, 0, .05); last = n;
    if (!hidden) {
      update(dt);
      if (S.started || S.fade) draw(S.t, dt); else drawCover();
      const { th, src } = thermal(dt); output(th, S.started); radar(S.started ? src : [], th);
      $('clock').textContent = fmt(S.clock);
      $('posInfo').textContent = S.started ? PLACE[S.view] || (S.place ? D.places[S.place].en : '') : '';
    }
    requestAnimationFrame(loop);
  }
  document.addEventListener('visibilitychange', () => { hidden = document.hidden; if (hidden) { stopOutput(); SND.ctx()?.suspend(); } else { last = performance.now(); SND.ctx()?.resume(); } });
  document.addEventListener('keydown', (e) => { if (e.code === 'Escape') emergencyStop(); });
  const ENDS = ['⭐ 星の簪を、手のひらに · A star hairpin in your hand', '🎲 サイコロを、手のひらに · Her dice in your hand', '🧡 橙の髪紐を、手のひらに · An orange hair tie in your hand'];
  function finish(talk = false) {   // back to this demo's own cover (user: never an "ended / next demo" card)
    const end = S.end;
    S.started = false; S.fade = 0; S.fadeA = 0; run++; stopOutput(); SND.stopAll(); LIVE?.end();
    for (const k in ear) ear[k] = 0; $('cmd').textContent = 'stop'; if (AUTO) cmdLog.push([+S.clock.toFixed(2), 'stop']);   // the device and the panel end on stop at once
    sub('', '', ''); actEl.classList.remove('show'); choiceEl.classList.remove('show'); document.querySelectorAll('.mh-turn').forEach((e) => e.remove());
    const c = $('cleared'); c.hidden = talk; if (!talk && end >= 0) c.textContent = ENDS[end];
    $('startBtn').textContent = '↺ もう一度 · Play again'; $('intro').classList.remove('hidden');
    talkUI(); window.INN.done = true;
  }
  function begin(mode) {
    SND.init(); SND.loadVoices(Object.keys(LINES));
    S = fresh(); S.started = true; S.mode = mode; viewA = viewB = 'white'; mix = 1; puffs.length = 0; if (mode === 'talk') S.white = 0;
    for (const k in K) K[k] = 0; BR.reset(); $('cleared').hidden = true;
    $('intro').classList.add('hidden'); window.INN.done = false;
  }
  async function start() { if (LIVE && !(await LIVE.begin())) return; begin('story'); story(); }
  async function startTalk(cast, place = talkPlace) { if (LIVE && !(await LIVE.begin({ place, cast }))) return; begin('talk'); keepTalking(place, cast); }
  // もっと話す: after the story (or always on the private live page) — where (a place from the story) × who (one of them, or all three)
  let talkPlace = QS.get('place') || 'hall';
  const paintPlaces = () => document.querySelectorAll('#talkPick .tpl').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.place === talkPlace)));
  document.querySelectorAll('#talkPick .tpl').forEach((b) => b.addEventListener('click', () => { talkPlace = b.dataset.place; paintPlaces(); }));
  paintPlaces();
  function talkUI() {
    let cleared = false; try { cleared = sessionStorage.getItem('moheat.inn.cleared') === '1'; } catch {}
    const box = $('talkPick'); box.hidden = !(cleared || LIVE || QS.has('talk'));
  }
  $('startBtn').addEventListener('click', start);
  document.querySelectorAll('#talkPick .tp').forEach((b) => b.addEventListener('click', () => startTalk(b.dataset.who)));
  $('lrBtn').addEventListener('click', () => { SND.lrCheck(); const b = $('lrBtn'); b.textContent = '🎧 Left…'; setTimeout(() => { b.textContent = '🎧 …Right'; }, 900); setTimeout(() => { b.textContent = '🎧 Left / Right check'; }, 1900); });
  $('soundBtn').addEventListener('click', (e) => { SND.setMuted(!SND.isMuted()); e.target.textContent = SND.isMuted() ? '🔇' : '🔊'; });
  function drawCover() {}   // UI v2: the cover is the finished image (media/cover/, tools/web/covers.py)
  window.INN = { get S() { return S; }, thermal: () => thermal(.05), both: () => both, log: cmdLog, done: false, startTalk, event };
  setStep(0); talkUI();
  if (QS.has('cover')) { document.body.classList.add('cover-only'); artReady.then(drawCover); return; }
  if (QS.has('autoplay') || AUTO) {
    const go = () => (QS.has('talk') ? startTalk(QS.get('talk') || 'MHN') : start());
    const ac = SND.init(); if (ac.state === 'running') go(); else ac.resume().then(() => { if (ac.state === 'running' && !S.started) go(); }).catch(() => {});
  }
  requestAnimationFrame(loop);
})();
