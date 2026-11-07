// 『きみだけの、ひみつ配信』 — an interactive live-stream room with two original streamers.
// You watch, comment and send Super Chats; the streamer answers you. Her binaural mic is YOUR head, so her whispers, breath and
// every trigger come from the side she is at, and the headphones answer per ear (one mode per ear, the stronger of heat / cool).
//   Mint  — whisper ASMR with a dummy head: ear blowing with mint lip balm (cool), a glass of ice (cool), a warm towel (warm).
//   Cocoa — cozy café chat: hot cocoa (warm), fu-fu blowing (cool), a topping Super Chat, sharing a blanket, hands on your ear (warm).
(() => {
  const $ = (id) => document.getElementById(id);
  const QS = new URLSearchParams(location.search), AUTO = QS.has('auto');
  const ONE = document.body.dataset.ch || '';   // one demo per streamer (Demo14 Mint, 17 Cocoa, 18 Hinata, 19 Luna)
  const SND = window.StreamAudio, LINES = window.STREAM_LINES, W = 1920, H = 1080;
  const cv = $('scene'), ctx = cv.getContext('2d'), stage = $('stage');
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), rnd = (a, b) => a + Math.random() * (b - a), pick = (a) => a[Math.floor(Math.random() * a.length)];
  const sleep = (s) => new Promise((r) => setTimeout(r, s * 1000));

  // ---------------------------------------------------------------- channels
  const CH = {
    mint: {
      name: '白深ミント', en: 'Shiromi Mint', title: 'ねむれない夜の、ささやき配信 · Whisper ASMR', credit: 'ミント VOICEVOX:四国めたん', viewers: 3412, sc: 'mint',
      art: ['mint_live', 'mint_live_talk', 'mint_live_talk_s', 'mint_live_half', 'mint_live_blink', 'mint_lean_R_talk_s', 'mint_bye_talk', 'mint_lean_L', 'mint_lean_R', 'mint_ice', 'mint_towel', 'mint_bye'],
      steps: [['あいさつ', 'Say hi'], ['耳ふー', 'Ear blowing'], ['こおりのスパチャ', 'Ice Super Chat'], ['あったかタオル', 'Warm towel'], ['おやすみ', 'Good night']],
      pool: ['こんばんは〜', 'waiting for this all day', 'ねむれない…', 'ミントちゃん今日もかわいい', '耳ふーまだ？', 'ASMR time 😌', 'おふとん入った', '声がすき', 'mimi-kun!!', 'first time here too', 'ささやき助かる…', 'zzz', 'good night everyone', 'イヤホン準備OK🎧', 'so relaxing', 'あしたも仕事…', 'ミントの声で寝たい'],
    },
    cocoa: {
      name: '甘音ココア', en: 'Amane Cocoa', title: 'ほっこりカフェ配信 · Cozy café chat', credit: 'ココア VOICEVOX:ユーレイちゃん', viewers: 2876, sc: 'cocoa',
      art: ['cocoa_live', 'cocoa_live_talk', 'cocoa_live_talk_s', 'cocoa_live_half', 'cocoa_live_blink', 'cocoa_blanket_talk', 'cocoa_bye_talk', 'cocoa_fufu', 'cocoa_aan', 'cocoa_blanket', 'cocoa_bye'],
      steps: [['あいさつ', 'Say hi'], ['ふーふー＆あーん', 'Fu-fu & aah'], ['トッピング', 'Topping Super Chat'], ['ブランケット', 'Blanket'], ['またね', 'See you']],
      pool: ['ココアちゃん！', 'こんばんは〜☕', 'I brought my own cocoa', 'さむすぎる…', '配信まってた！', 'cute beret!!', 'あったまる〜', 'tea gang here 🍵', 'くまのマイクかわいい', 'ちょうど仕事おわった', 'cozy vibes ☕', 'マシュマロ派', '声あまい…', 'ふわふわ', 'hello hello', 'こたつから見てる'],
    },
    hinata: {
      name: '火野ひなた', en: 'Hino Hinata', title: '激辛チャレンジ配信 · Super-spicy challenge', credit: 'ひなた VOICEVOX:春日部つむぎ', viewers: 4105, sc: 'hinata',
      art: ['hinata_live', 'hinata_live_talk', 'hinata_live_blink', 'hinata_eat', 'hinata_spicy', 'hinata_cool', 'hinata_fan', 'hinata_whisper', 'hinata_bye'],
      steps: [['あいさつ', 'Say hi'], ['激辛ラーメン', 'Spicy ramen'], ['たすけて！スパチャ', 'Rescue Super Chat'], ['完食＆うちわ', 'All gone & fan'], ['ないしょ話', 'A secret']],
      pool: ['おっはひな〜！', 'レベル10はやばい', 'spicy queen 🌶', 'がんばれー！', 'もう汗かいてる笑', 'I could never', 'ひなたちゃん元気すぎ', '辛いの苦手…', 'w w w', 'let\'s gooo', '牛乳用意して', 'ラーメンおいしそう', 'fang cute', '応援してる！'],
    },
    luna: {
      name: '宵月ルナ', en: 'Yoizuki Luna', title: '深夜のおしゃべり配信 · Late-night chat', credit: 'ルナ VOICEVOX:九州そら', viewers: 1958, sc: 'luna',
      art: ['luna_live', 'luna_live_talk', 'luna_live_talk_s', 'luna_live_blink', 'luna_window', 'luna_window_talk', 'luna_tea', 'luna_tea_talk', 'luna_musicbox', 'luna_musicbox_talk', 'luna_close', 'luna_close_talk', 'luna_bye', 'luna_bye_talk'],
      steps: [['あいさつ', 'Say hi'], ['夜の風', 'Night wind'], ['リクエスト', 'Request'], ['となりで', 'Next to you'], ['夜明け前', 'Before dawn']],
      pool: ['こんばんは', 'ルナさんの声おちつく', 'night owl here 🦉', '眠れない夜', '雨やんだね', 'calm vibes', 'まだ仕事中…', 'その声ずるい', 'from overseas, hi', '月がきれい', '深夜の楽しみ', 'goodnight soon', 'ルナさん…'],
    },
  };
  const HANDLES = ['ねこまる', 'yuki_88', 'とうふ', 'Kai', 'ほしぞら', 'mochi', 'ぬい', 'Leo', 'さくら餅', 'night_owl', 'くま吉', 'Rin', 'ぽてと', 'ami', 'しろくま', 'Sora', 'みかん', 'tomo'];
  const HCOL = ['#ffb3d1', '#a8e6cf', '#ffd59e', '#b8c6ff', '#e0b3ff', '#9fe3ff', '#ffc4a8'];

  // ---------------------------------------------------------------- art
  const IMG = {};
  const ALL = ONE ? CH[ONE].art : Object.values(CH).flatMap((c) => c.art);   // a one-streamer demo loads only her frames
  const artReady = Promise.all(ALL.map((n) => new Promise((res) => { const im = new Image(); im.onload = () => { IMG[n] = im; res(); }; im.onerror = () => res(); im.src = `media/art/${n}.webp?v=1`; })));

  // ---------------------------------------------------------------- state
  const fresh = (ch) => ({ ch, started: true, t: 0, clock: 0, view: 'live', pos: { az: 0, dist: .9 }, lv: 0,
    blow: 0, blowSide: 0, puffSide: 1, spicy: 0, fan: 0, window: 0, tea: 0, near: 0, ice: 0, iceSide: 0, towel: 0, mug: 0, puff: 0, aan: 0, treat: 0, treatK: 'h', rain: 0, blanket: 0, hands: 0, fade: 0, viewers: CH[ch].viewers });
  let S = { started: false, t: 0 }, run = 0, mode = 'title';   // title | lobby | live | ended
  function setStep(i) { S.step = i; $('steps').innerHTML = (S.ch ? CH[S.ch].steps : []).map((s, k) => `<li class="${k < i ? 'done' : k === i ? 'now' : ''}">${s[0]} · <small>${s[1]}</small></li>`).join(''); }

  // ---------------------------------------------------------------- subtitles + her voice
  const subJa = $('subJa'), subEn = $('subEn'), subs = $('subs');
  function sub(ja, en) { subJa.textContent = ja || ''; subEn.textContent = en || ''; subs.classList.toggle('show', !!ja); }
  let talking = 0;
  async function say(id, pause = .35) {
    const my = run; const [ja, en, style] = LINES[id];
    sub(ja, en); talking++;
    await SND.say(id, S.pos, style === 'w' ? 1.6 : 1.35);
    talking--; if (my !== run) throw new Error('stopped');
    await sleep(pause); sub('', '');
  }
  function at(az, dist) { S.pos = { az, dist }; SND.moveVoice(az, dist); }
  const guard = (my) => { if (my !== run) throw new Error('stopped'); };

  // ---------------------------------------------------------------- live chat
  const list = $('chatList');
  function chat(name, text, kind = '', col = pick(HCOL)) {
    const li = document.createElement('li'); li.className = kind;
    if (kind.startsWith('sc')) li.innerHTML = `<span class="sc-top"><b>${name}</b><em>${kind.split(' ')[1] || ''}</em></span><span class="sc-msg">${text}</span>`;
    else li.innerHTML = `<b style="color:${kind === 'you' ? '' : col}">${name}</b> <span>${text}</span>`;
    list.appendChild(li); while (list.children.length > 40) list.firstChild.remove();
    requestAnimationFrame(() => li.classList.add('in'));
  }
  let botT = 2;
  function bots(dt) {   // other viewers chatting in the background
    if (mode !== 'live') return;
    botT -= dt; if (botT > 0) return;
    botT = rnd(1.4, 3.6); chat(pick(HANDLES), pick(CH[S.ch].pool)); if (Math.random() < .3) SND.fx.pop();
  }
  function react(msgs, n = 4) { for (let i = 0; i < n; i++) setTimeout(() => { if (mode === 'live') { chat(pick(HANDLES), msgs[i % msgs.length]); hearts(2); } }, 300 + i * rnd(350, 700)); }
  function hearts(n = 3, icons = ['💗', '💜', '🤍', '✨']) {
    const box = $('hearts');
    for (let i = 0; i < n; i++) setTimeout(() => {
      const h = document.createElement('i'); h.textContent = pick(S.ch === 'mint' ? ['💙', '🤍', '💜', '🫧'] : icons);
      h.style.left = `${rnd(0, 70)}%`; h.style.animationDuration = `${rnd(2.4, 3.6)}s`; box.appendChild(h); setTimeout(() => h.remove(), 3800);
      SND.fx.heart();
    }, i * 140);
  }

  // ---------------------------------------------------------------- your turn: comment chips, Super Chats, big actions
  const chips = $('chips'), hint = $('chatHint'), chatIn = $('chatInput');
  function comment(ja, en, opts, timeout = 30) {
    return new Promise((res) => {
      hint.innerHTML = `${ja} <small>${en}</small>`;
      chips.innerHTML = opts.map((o, i) => `<button class="chip-c" data-i="${i}"><b>${o[0]}</b><span>${o[1]}</span></button>`).join('');
      chatIn.classList.add('turn');
      const done = (i) => {
        clearTimeout(tm); chatIn.classList.remove('turn'); chips.innerHTML = ''; hint.innerHTML = '';
        chat('YOU', opts[i][0], 'you'); SND.fx.you(); hearts(2); res(i);
      };
      chips.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => done(+b.dataset.i)));
      const tm = setTimeout(() => done(0), (AUTO ? 1.2 : timeout) * 1000);
    });
  }
  function gift(ja, en, opts, timeout = 35) {   // opts: [icon, ja, en, price]
    return new Promise((res) => {
      hint.innerHTML = `💝 ${ja} <small>${en}</small>`;
      chips.innerHTML = opts.map((o, i) => `<button class="chip-c gift" data-i="${i}"><b>${o[0]} ${o[1]}</b><span>${o[2]} · ${o[3]}</span></button>`).join('');
      chatIn.classList.add('turn', 'giving'); $('giftBtn').classList.add('pulse');
      const done = (i) => {
        clearTimeout(tm); chatIn.classList.remove('turn', 'giving'); $('giftBtn').classList.remove('pulse'); chips.innerHTML = ''; hint.innerHTML = '';
        const o = opts[i]; chat('YOU', `${o[0]} ${o[1]} · ${o[2]}`, `sc ${o[3]} ${CH[S.ch].sc}`); SND.fx.superchat(); hearts(8); res(i);
      };
      chips.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => done(+b.dataset.i)));
      $('giftBtn').onclick = () => done(0);
      const tm = setTimeout(() => done(0), (AUTO ? 1.2 : timeout) * 1000);
    });
  }
  function action(icon, ja, en) {
    return new Promise((res) => {
      const el = $('act'); el.innerHTML = `<button class="act-btn"><i>${icon}</i><b>${ja}</b><span>${en}</span></button>`; el.classList.add('show');
      const done = () => { clearTimeout(tm); el.classList.remove('show'); el.innerHTML = ''; res(); };
      el.querySelector('button').addEventListener('click', done);
      const tm = setTimeout(done, (AUTO ? 1.2 : 30) * 1000);
    });
  }

  // ---------------------------------------------------------------- Mint: whisper ASMR with Mimi-kun (the dummy head = your head)
  async function mintStory(my) {
    S.view = 'live'; at(0, .9); setStep(0);
    await sleep(1.6); guard(my);
    await say('m01'); await say('m02');
    await comment('ミントにあいさつしよう', 'Say hi to Mint', [['はじめまして！', 'First time here!'], ['こんばんは〜', 'Good evening~']]);
    await sleep(.6); S.shy = 1; await say('m03'); S.shy = 0;
    SND.fx.taps(-1.5, 2); setTimeout(() => SND.fx.taps(1.5, 2), 700);
    await say('m04');
    // ear blowing, the ear you choose first
    setStep(1); await say('m05');
    const s = (await comment('どっちの耳から？', 'Which ear first?', [['ひだり耳で！', 'Left ear!'], ['みぎ耳で！', 'Right ear!']])) ? 1 : -1;
    react(['左派', 'みぎ！', 'both ears pls', 'ドキドキ'], 3);
    await sleep(.8); S.view = s < 0 ? 'lean_L' : 'lean_R'; SND.fx.cloth(s * 1.2, .35, .9); at(s * 1.45, .07);
    await sleep(.9); await say('m06'); await say('m07', .05);
    SND.fx.blow(s * 1.5, 2); S.blow = 1; S.blowSide = s; await sleep(2.4);
    react(['ぞわっ…', 'tingles!!', 'つめたっ', '💙💙💙', 'ear blowing best'], 4);
    await say('m08');
    await say('m09'); S.view = 'live'; at(0, .5); SND.fx.cloth(0, .4, .8); await sleep(.9);
    S.view = s < 0 ? 'lean_R' : 'lean_L'; at(-s * 1.45, .07); SND.fx.cloth(-s * 1.2, .35, .7); await sleep(.8);
    const blowOther = () => { SND.fx.blow(-s * 1.5, 1.4); S.blow = 1; S.blowSide = -s; };
    blowOther(); setTimeout(() => my === run && blowOther(), 1700);
    await say('m10', 1.2);
    react(['反対もきた', 'brain melting', 'すーすーする', '🌿🌿'], 3);
    // the ice Super Chat
    S.view = 'live'; at(0, .9); setStep(2); await sleep(1.2);
    chat(pick(HANDLES), 'スパチャで「こおり」たのめるらしい', ''); chat(pick(HANDLES), 'someone send ice 🧊', '');
    await gift('ミントにスパチャを送ろう', 'Send Mint a Super Chat', [['🧊', 'こおり', 'Ice', '¥500'], ['🫧', 'もっと耳ふー', 'More ear blowing', '¥300']]).then(async (g) => {
      if (g === 1) { await sleep(.6); S.view = s < 0 ? 'lean_L' : 'lean_R'; at(s * 1.45, .07); await sleep(.5); SND.fx.blow(s * 1.5, 1.6); S.blow = 1; S.blowSide = s; await sleep(2); S.view = 'live'; at(0, .9); await sleep(.6); }
    });
    await sleep(.5); await say('m11');
    S.view = 'ice'; at(s * 1.2, .2); await sleep(.6);
    let iceOn = true; S.ice = 1; S.iceSide = s;
    (async () => { while (iceOn && my === run) { SND.fx.swirl(S.iceSide * 1.4); await sleep(rnd(1.4, 2.2)); } })();
    await say('m12'); await sleep(2.5);
    S.iceSide = -s; at(-s * 1.2, .2); SND.fx.cloth(-s * .5, .4, .6); await sleep(3);
    react(['からんからん', 'the ice sounds 🤤', 'ひんやり…', '夏みたい'], 3);
    await say('m13'); iceOn = false; S.ice = 0;
    // warm towel around both ears
    setStep(3); S.view = 'live'; at(0, .8); await sleep(.8);
    await say('m14');
    S.view = 'towel'; at(0, .25); SND.fx.cloth(-1.4, .1, 1.3); setTimeout(() => SND.fx.cloth(1.4, .1, 1.3), 500); await sleep(.9);
    S.towel = 1;
    await say('m15'); await sleep(1.2);
    react(['ぽかぽか', 'warm towel = sleep', 'あったか〜', '😴'], 3);
    await say('m16'); await sleep(1.5);
    // good night, one secret in each ear
    setStep(4); await say('m17');
    await comment('ミントにこたえよう', 'Answer Mint', [['ねむい…', 'So sleepy…'], ['まだおきてる', 'Still awake']]);
    S.shy = 1; await say('m18'); S.shy = 0;
    S.view = 'lean_R'; at(1.45, .07); SND.fx.cloth(1.2, .35, .7); await sleep(.9); await say('m19', .6);
    S.view = 'lean_L'; at(-1.45, .07); SND.fx.cloth(-1.2, .35, .7); await sleep(.9); await say('m20', .8);
    S.view = 'bye'; at(0, .9); await sleep(1);
    react(['おやすみ〜', 'good night Mint 💙', 'おつミント', 'zzz'], 4);
    await say('m21', 1);
    S.towel = .5;
    await endStream(my, '💙 おやすみなさい · Sleep well');
  }

  // ---------------------------------------------------------------- Cocoa: cozy café chat (the bear mic = your head)
  async function cocoaStory(my) {
    S.view = 'live'; at(0, .8); setStep(0); S.mug = 1;
    await sleep(1.4); guard(my);
    await say('c01'); SND.fx.steam(); await say('c02');
    const a = await comment('ココアにこたえよう', 'Answer Cocoa', [['さむい〜', "I'm cold~"], ['あったかいよ', "I'm warm"]]);
    await sleep(.5); await say(a ? 'c03b' : 'c03a');
    S.mug = 0; SND.fx.pour(.2); await sleep(2.9); SND.fx.stir(.15); await sleep(1.9); S.mug = 1; SND.fx.steam();
    react(['いいにおいしそう', 'cocoa ASMR 🤤', 'とくせい！', '☕☕'], 3);
    await say('c04');
    // fu-fu, then aah
    setStep(1);
    await comment('おねだりしてみよう', 'Ask her for something', [['ふーふーして！', 'Blow on it for me!'], ['ふーふーして💕', 'Fu-fu please 💕']]);
    await sleep(.5); S.shy = 1; await say('c05'); S.shy = 0;
    S.view = 'fufu'; at(1.2, .15); await sleep(.9);
    const puffs = [0, .75, 1.7, 2.45];
    for (const t of puffs) setTimeout(() => { if (my !== run) return; SND.fx.puff(1.35); S.puff = 1; }, t * 1000);
    await say('c06', .4); await sleep(1.4);
    react(['みぎ耳つめた', 'fu-fu!!', 'あまえんぼでした', '💗'], 3);
    S.view = 'aan'; at(0, .12); S.aan = 1; await sleep(.8);
    await say('c07', .2); SND.fx.sip(0); await sleep(1);
    S.aan = 0; S.view = 'live'; at(0, .8); await sleep(.5);
    S.shy = 1; await say('c08'); S.shy = 0;
    // topping Super Chat
    setStep(2); chat(pick(HANDLES), 'トッピングのスパチャできるよ〜', '');
    const g = await gift('ココアにトッピングを送ろう', 'Send Cocoa a topping', [['🍡', 'マシュマロ', 'Marshmallows', '¥300'], ['🍨', 'アイス', 'Ice cream', '¥500']]);
    await sleep(.6);
    if (g === 0) { for (let i = 0; i < 3; i++) setTimeout(() => SND.fx.plop(rnd(-.1, .1)), i * 330); S.treatK = 'h'; S.treat = 1; await sleep(1); await say('c09m'); }
    else { SND.fx.plop(0); S.treatK = 'c'; S.treat = 1; await sleep(.6); await say('c09i'); }
    SND.fx.stir(.1); await sleep(1.6);
    // rain → share the blanket → her hands warm your right ear
    setStep(3); S.rain = 1; SND.loop('rain', -1.3, 2.5)?.set(.22); await sleep(2.5);
    await say('c10'); react(['雨の音すき', 'rain + cocoa = perfect', 'こっちも雨'], 3);
    await sleep(1.5); await say('c11');
    await action('🧣', 'ブランケットにはいる', 'Get under the blanket');
    S.view = 'blanket'; SND.fx.cloth(-1.3, .2, 1.2); setTimeout(() => SND.fx.cloth(1.3, .2, 1.2), 400);
    SND.loop('heater', -1, 1.4)?.set(.18); SND.loop('rain')?.set(.1);
    S.blanket = 1; at(1.35, .1); await sleep(1.4);
    await say('c12');
    SND.fx.cloth(1.5, .05, .7); S.hands = 1; at(1.45, .07); await sleep(.6);
    await say('c13'); await sleep(1);
    react(['てあったかそう', 'her hands 🥺', 'みぎ耳しあわせ', '💗💗'], 3);
    await say('c14', 1.2); S.hands = 0;
    // bye
    setStep(4); S.view = 'bye'; at(0, .8); await sleep(.8);
    await say('c15');
    react(['おつココア〜', 'bye bye ☕', 'またあした！', 'thank you!!'], 4);
    await say('c16', 1);
    await endStream(my, '☕ またあしたね · See you tomorrow');
  }

  // ---------------------------------------------------------------- Hinata: super-spicy ramen challenge (the cat-ear mic = your head)
  async function hinataStory(my) {
    S.view = 'live'; at(0, .85); setStep(0);
    await sleep(1.4); guard(my);
    await say('h01'); await say('h02');
    const a = await comment('ひなたを応援しよう', 'Cheer for Hinata', [['がんばれ！', 'You got this!'], ['ムリしないで', "Don't push yourself"]]);
    await sleep(.4); await say(a ? 'h03b' : 'h03a');
    setStep(1); await say('h04', .1);
    S.view = 'eat'; SND.fx.slurp(0); S.spicy = .35; await sleep(1.3); SND.fx.slurp(.1); S.spicy = .55; await sleep(1.4);
    react(['いったー！', 'slurp ASMR 🍜', 'いい音', '顔赤くなってきた笑'], 3);
    S.view = 'spicy'; S.spicy = .85; S.shy = 1; await say('h05'); await sleep(.6);
    react(['がんばれ😂', 'MILK MILK', 'ギブ？', '水はダメらしい'], 4);
    // rescue Super Chat: milk (cool in front) or a desk fan (cool from the left)
    setStep(2);
    const g = await gift('ひなたをたすけよう', 'Rescue Hinata', [['🥛', '牛乳', 'Milk', '¥500'], ['🌀', '扇風機', 'Desk fan', '¥300']]);
    await sleep(.5); S.view = 'cool'; S.shy = 0;
    if (g === 0) { SND.fx.gulp(0); S.treatK = 'c'; S.treat = 1; S.spicy = .4; await sleep(1.4); await say('h06m'); }
    else { SND.loop('fan', -1.2, .8)?.set(.35); S.fan = 1; S.spicy = .4; await sleep(1.2); await say('h06f'); }
    await sleep(1.2);
    // finish the bowl, then she fans you (left / right puffs)
    setStep(3); S.view = 'live'; await say('h07', .1);
    S.view = 'eat'; S.spicy = .7; for (let i = 0; i < 3; i++) { SND.fx.slurp(rnd(-.1, .1)); await sleep(1.1); }
    S.view = 'live'; await say('h08');
    react(['完食おめでとう！！', 'GG 🎉', 'すごすぎ', '👏👏👏'], 5); hearts(8);
    if (S.fan) { SND.loop('fan')?.stop(); S.fan = 0; }
    S.spicy = .3; await say('h09', .2);
    S.view = 'fan';
    for (let i = 0; i < 6; i++) { const sd = i % 2 ? 1 : -1; SND.fx.flap(sd * 1.3); S.puff = 1; S.puffSide = sd; await sleep(.55); }
    S.spicy = 0; await sleep(.8);
    react(['すずしい〜', 'fan ASMR lol', 'ぱたぱた'], 3);
    // a secret in your right ear
    setStep(4); S.view = 'whisper'; at(1.45, .08); SND.fx.cloth(1.2, .3, .6); await sleep(.9);
    S.near = 1; S.shy = 1; await say('h10', .3); await say('h11', .8); S.near = 0; S.shy = 0;
    S.view = 'bye'; at(0, .85); await sleep(.6);
    react(['おつひな〜！', 'otsu-hina!', 'またね〜', '💛💛'], 4);
    await say('h12', 1);
    await endStream(my, '🌶 おつひな〜 · Great job, Hinata!');
  }

  // ---------------------------------------------------------------- Luna: late-night chat by the window (her studio mic; she moves next to you)
  async function lunaStory(my) {
    S.view = 'live'; at(0, .9); setStep(0); S.window = 1;
    SND.loop('wind', -1.35, 2)?.set(.22);
    await sleep(1.6); guard(my);
    await say('l01');
    setStep(1); S.view = 'window'; await sleep(.4); await say('l02');
    const a = await comment('ルナにこたえよう', 'Answer Luna', [['きこえるよ', 'I can hear it'], ['すずしい…', 'So cool…']]);
    react(['夜風いいね', 'the wind ASMR', 'ひだり耳すずしい'], 3);
    await sleep(.6); await say('l03');
    setStep(2); S.view = 'live'; await say('l04');
    const g = await gift('ルナにリクエストを送ろう', 'Send Luna a request', [['🎵', 'オルゴール', 'Music box', '¥300'], ['🍵', 'ホットティー', 'Hot tea', '¥500']]);
    await sleep(.6);
    if (g === 0) { S.view = 'musicbox'; at(.15, .5); await say('l05m', .4); SND.loop('musicbox', .2, .6)?.set(.5); await sleep(14); SND.loop('musicbox')?.stop(); await sleep(1.4); }
    else { S.view = 'tea'; at(0, .5); SND.fx.pour(.15); await sleep(2.8); S.tea = 1; await say('l05t'); SND.fx.sip(0); await sleep(1.2); SND.fx.saucer(.1); await sleep(1.5); }
    react(['しあわせ…', 'so peaceful', 'ねむくなってきた'], 3);
    // she closes the window and sits next to you (left)
    setStep(3); S.view = 'live'; at(0, .9); await say('l06', .2);
    SND.fx.slide(-1.35, false); S.window = 0; SND.loop('wind')?.stop(); await sleep(1.2);
    SND.fx.cloth(-.8, .6, 1); await sleep(.6); S.view = 'close'; at(-1.45, .08); S.near = 1; await sleep(1);
    await say('l07');
    const b = await comment('ルナにこたえよう', 'Answer Luna', [['つかれた…', "I'm tired…"], ['いいことあった', 'Something good happened']]);
    await sleep(.8); await say(b ? 'l08b' : 'l08a', .8);
    S.shy = 1; await say('l09', 1.2); S.shy = 0;
    react(['…', 'ずるい', 'my heart 🌙', 'ルナさん…'], 3);
    setStep(4); S.view = 'bye'; at(0, .9); S.near = .5; await sleep(.8);
    await say('l10', 1);
    react(['おやすみ', 'good night Luna', '🌙🌙'], 3);
    await endStream(my, '🌙 おやすみ、夜ふかしさん · Good night');
  }

  async function endStream(my, msg) {
    guard(my);
    S.fade = 1; SND.fx.end(); await sleep(2.6); guard(my);
    mode = 'ended'; SND.stopLoops(); S.started = false; stopOutput(); sub('', '');
    $('endedSub').textContent = msg;
    if (!ONE) { const order = Object.keys(CH), other = order[(order.indexOf(S.ch) + 1) % order.length]; $('nextBtn').textContent = `▶ ${CH[other].name}の配信へ · ${CH[other].en}`; $('nextBtn').onclick = () => goLive(other); }
    $('ended').classList.add('show');
  }

  // ---------------------------------------------------------------- per-frame state + thermal
  function update(dt) {
    S.t += dt; if (!S.started) return;
    S.clock += dt; S.lv = SND.voiceLevel();
    S.blow = Math.max(0, S.blow - dt / 2.6);
    S.puff = Math.max(0, S.puff - dt / 1.1);
    S.treat = Math.max(0, S.treat - dt / 9);
    if (S.ch === 'luna' && S.tea) S.tea = Math.max(0, S.tea - dt / 40);
    if (Math.random() < dt * .5) S.viewers += Math.round(rnd(-3, 6));
    bots(dt);
  }
  function sources() {
    const out = [], add = (az, k, s, icon) => { if (s > .01) out.push({ az, k, s, icon }); };
    if (!S.started) return out;
    if (S.ch === 'mint') {
      if (S.blow > 0) add(S.blowSide * 1.5, 'c', .9 * Math.min(1, S.blow * 1.6), '💨');
      if (S.ice) add(S.iceSide * 1.45, 'c', .62, '🧊');
      if (S.towel) { add(-1.5, 'h', .7 * S.towel, '♨'); add(1.5, 'h', .7 * S.towel, '♨'); }
    } else if (S.ch === 'hinata') {
      if (S.spicy > 0) { add(-1.5, 'h', S.spicy * .8, '🌶'); add(1.5, 'h', S.spicy * .8, '🌶'); }
      if (S.treat > 0) add(0, 'c', .7 * Math.min(1, S.treat * 2), '🥛');
      if (S.fan) add(-1.2, 'c', .7, '🌀');
      if (S.puff > 0) add(S.puffSide * 1.4, 'c', .75 * Math.min(1, S.puff * 1.8), '🪭');
      if (S.near) add(1.45, 'h', .35, '💛');
    } else if (S.ch === 'luna') {
      if (S.window) add(-1.4, 'c', .45, '🌙');
      if (S.tea) add(0, 'h', .4, '🍵');
      if (S.near) add(-1.45, 'h', .55 * S.near, '🖤');
    } else {
      if (S.mug && !S.blanket) add(0, 'h', .32, '☕');
      if (S.puff > 0) add(1.35, 'c', .85 * Math.min(1, S.puff * 1.8), '💨');
      if (S.aan) add(0, 'h', .55, '🥄');
      if (S.treat > 0) add(0, S.treatK, (S.treatK === 'c' ? .62 : .5) * Math.min(1, S.treat * 2), S.treatK === 'c' ? '🍨' : '🍡');
      if (S.rain && !S.blanket) add(-1.3, 'c', .22, '🌧');
      if (S.blanket) { add(-1.5, 'h', .5, '🧣'); add(1.5, 'h', .5, '🧣'); add(-1, 'h', .35, '🔥'); }
      if (S.hands) add(1.45, 'h', .85, '🤲');
    }
    if (talking && S.pos.dist < .2) add(S.pos.az, 'v', .5, '💬');   // her voice right at your ear (radar only)
    return out;
  }
  const ear = { L: { mode: '', v: 0 }, R: { mode: '', v: 0 } };
  function thermal(dt) {
    const sum = { L: { h: 0, c: 0 }, R: { h: 0, c: 0 } }, src = sources();
    for (const s of src) { if (s.k === 'v') continue; const sn = Math.sin(s.az), wL = clamp(1 - 1.2 * Math.max(0, sn)), wR = clamp(1 - 1.2 * Math.max(0, -sn)); sum.L[s.k] += s.s * wL; sum.R[s.k] += s.s * wR; }
    const th = { Lc: 0, Lh: 0, Rc: 0, Rh: 0 };
    for (const e of ['L', 'R']) {
      const E = ear[e], hh = Math.min(1, sum[e].h), cc = Math.min(1, sum[e].c);
      let m = E.mode;
      if (!m) m = hh > cc ? 'h' : 'c'; else if (m === 'h' && cc > hh + .06) m = 'c'; else if (m === 'c' && hh > cc + .06) m = 'h';
      if (m !== E.mode) { E.v = 0; E.mode = m; }
      const target = m === 'h' ? Math.min(.9, hh) : cc, tau = target > E.v ? (m === 'h' ? .4 : .2) : .35;
      E.v += (target - E.v) * (1 - Math.exp(-dt / tau)); th[e + m] = E.v;
    }
    return { th, src };
  }

  // ---------------------------------------------------------------- drawing
  let blinkAt = 2, blinkT = -1, viewA = '', viewB = '', mix = 1;
  const CHEEKS = { mint_live: [[505, 405], [690, 398], 46], cocoa_live: [[565, 425], [735, 418], 42], hinata_live: [[540, 400], [735, 388], 42], luna_live: [[492, 365], [662, 356], 38], cocoa_blanket: [[535, 420], [715, 412], 40], mint_lean_L: [[400, 505], [585, 500], 40], mint_lean_R: [[455, 500], [615, 492], 40] };   // soft blush spots (px in 1920×1080), drawn only when she is shy
  // Face animation. The base / blink frame is drawn whole; the mouth is then redrawn on top inside its box only (talk frames
  // equal their base outside the mouth — prepare_art.py), cross-faded by a smoothed "openness" that follows her voice level:
  // 0 → closed (base), .5 → small mouth (talk_s), 1 → open (talk). So the mouth opens and closes softly, even mid-blink.
  function frame(view, t) {
    const base = `${S.ch}_${view}`, F = (k) => IMG[`${base}_${k}`];
    const bt = t - blinkT, half = F('half'), shut = F('blink');
    if (bt >= 0 && bt < .2 && shut) return bt < .05 || bt > .14 ? (half || IMG[base]) : shut;
    return IMG[base] || IMG[`${S.ch}_live`];
  }
  let open = 0;
  function lipSync(t, dt) {
    const target = talking ? clamp((S.lv - .006) / .05) : 0;
    open += (target - open) * (1 - Math.exp(-dt / (target > open ? .045 : .075)));   // opens a bit faster than it closes
  }
  function drawView(view, t, alpha) {
    const im = frame(view, t); ctx.globalAlpha = alpha;
    const close = /lean|aan|fufu/.test(view), z = close ? 1.02 + .006 * Math.sin(t * .7) : 1 + .003 * Math.sin(t * .45);
    const dx = W / 2 - W * z / 2, dy = H / 2 - H * z / 2;
    if (im) ctx.drawImage(im, dx, dy, W * z, H * z);
    else { ctx.fillStyle = S.ch === 'mint' ? '#5b5596' : '#a0705a'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.font = '600 48px Inter'; ctx.textAlign = 'center'; ctx.fillText(`${S.ch} · ${view}`, W * .36, H / 2); }
    const key = `${S.ch}_${view}`, box = (window.STREAM_MOUTHS || {})[key], small = IMG[`${key}_talk_s`], big = IMG[`${key}_talk`];
    if (im && box && open > .02 && (small || big)) {
      const mouth = (img, a) => { if (!img || a <= .01) return; const k = img.width / W, [x0, y0, x1, y1] = box;
        ctx.globalAlpha = alpha * Math.min(1, a); ctx.drawImage(img, x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k, dx + x0 * z, dy + y0 * z, (x1 - x0) * z, (y1 - y0) * z); };
      if (small && big) { mouth(small, open * 2); mouth(big, (open - .5) * 2); }
      else mouth(small || big, open * (big ? 1.15 : 1));
    }
    ctx.globalAlpha = 1;
  }
  let parts = [];
  function draw(t, dt) {
    if (t > blinkAt) { blinkT = t; blinkAt = t + (Math.random() < .2 ? .35 : rnd(2.6, 5.5)); }   // sometimes a double blink
    lipSync(t, dt);
    const key = S.ch + ':' + S.view;
    if (key !== viewB) { viewA = viewB; viewB = key; mix = 0; }
    mix = Math.min(1, mix + dt / .5);
    if (mix < 1 && viewA.split(':')[0] === S.ch) drawView(viewA.split(':')[1], t, 1);
    drawView(S.view, t, mix < 1 && viewA.split(':')[0] === S.ch ? mix : 1);
    // a soft blush that fades in and out (never the whole face)
    S.blushA = (S.blushA || 0) + ((S.shy ? 1 : 0) - (S.blushA || 0)) * (1 - Math.exp(-dt / .8));
    const ck = CHEEKS[`${S.ch}_${S.view}`];
    if (ck && S.blushA > .01) for (const [x, y] of ck.slice(0, 2)) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, ck[2]); g.addColorStop(0, `rgba(255,120,150,${.32 * S.blushA})`); g.addColorStop(1, 'rgba(255,120,150,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, ck[2] * 1.3, ck[2] * .75, 0, 0, 7); ctx.fill();
    }
    // particles: steam from the towel / cocoa, rain streaks on the window side
    const steamy = (S.ch === 'mint' && S.view === 'towel') || (S.ch === 'cocoa' && S.mug && /live|fufu/.test(S.view));
    if (steamy && Math.random() < dt * 8) parts.push({ k: 's', x: S.ch === 'mint' ? rnd(380, 820) : rnd(560, 760), y: S.ch === 'mint' ? rnd(560, 720) : rnd(560, 640), vx: rnd(-10, 10), vy: rnd(-50, -30), r: rnd(18, 34), life: 0, max: rnd(2, 3) });
    if (S.ch === 'cocoa' && S.rain && Math.random() < dt * 25) parts.push({ k: 'r', x: rnd(0, 1440), y: rnd(-50, 0), vx: -60, vy: rnd(900, 1200), r: 0, life: 0, max: 1.4 });
    for (const p of parts) { p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    parts = parts.filter((p) => p.life < p.max && p.y < H + 40);
    for (const p of parts) {
      if (p.k === 's') { const a = Math.sin(Math.PI * p.life / p.max) * .16; ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1 + p.life * .6), 0, 7); ctx.fill(); }
      else { ctx.strokeStyle = 'rgba(200,215,255,.14)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - 4, p.y + 40); ctx.stroke(); }
    }
    // warm / cool tint for what you feel
    if (S.ch === 'mint' && (S.blow > 0 || S.ice)) { const v = Math.max(S.blow, S.ice ? .5 : 0) * .22, x = (S.ch === 'mint' && S.blow > 0 ? S.blowSide : S.iceSide) < 0 ? 0 : W; const g = ctx.createRadialGradient(x, H / 2, 50, x, H / 2, 900); g.addColorStop(0, `rgba(150,230,255,${v})`); g.addColorStop(1, 'rgba(150,230,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    if (S.blanket || S.towel) { const g = ctx.createRadialGradient(W * .35, H / 2, 300, W * .35, H / 2, 1200); g.addColorStop(0, 'rgba(255,170,120,0)'); g.addColorStop(1, `rgba(255,160,110,${.18 * Math.max(S.blanket, S.towel)})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    if (S.fade) { S.fadeA = Math.min(1, (S.fadeA || 0) + dt / 2.4); ctx.fillStyle = `rgba(10,8,20,${S.fadeA})`; ctx.fillRect(0, 0, W, H); }
    $('viewers').textContent = `👁 ${S.viewers.toLocaleString()}`;
  }

  // ---------------------------------------------------------------- side panel + device (same protocol as every demo)
  const rc = $('radar').getContext('2d');
  function radar(src, th) {
    const cx = 240, cy = 220, R = 160; rc.clearRect(0, 0, 480, 420);
    rc.strokeStyle = 'rgba(255,255,255,.08)'; rc.lineWidth = 1.5; for (const r of [R * .5, R]) { rc.beginPath(); rc.arc(cx, cy, r, 0, 7); rc.stroke(); }
    rc.fillStyle = '#8a7d93'; rc.font = '600 13px Inter'; rc.textAlign = 'center'; rc.fillText('front', cx, cy - R - 10); rc.fillText('L', cx - R - 18, cy + 5); rc.fillText('R', cx + R + 18, cy + 5);
    for (const [e, sx] of [['L', -1], ['R', 1]]) {
      const v = Math.max(th[e + 'c'], th[e + 'h']), col = th[e + 'c'] > th[e + 'h'] ? '79,179,255' : '255,122,69';
      rc.fillStyle = v > .02 ? `rgba(${col},${.25 + .75 * v})` : '#2a2333'; rc.beginPath(); rc.ellipse(cx + sx * 46, cy, 12, 24, 0, 0, 7); rc.fill();
    }
    rc.fillStyle = '#3a3046'; rc.beginPath(); rc.arc(cx, cy, 40, 0, 7); rc.fill();
    rc.font = '26px sans-serif'; rc.textBaseline = 'middle';
    for (const s of src) {
      const r = s.k === 'v' ? 70 : s.az === 0 && s.k !== 'v' ? R * .62 : R, x = cx + Math.sin(s.az) * r, y = cy - Math.cos(s.az) * r;
      rc.globalAlpha = clamp(.35 + s.s); rc.fillStyle = s.k === 'h' ? 'rgba(255,122,69,.25)' : s.k === 'c' ? 'rgba(79,179,255,.25)' : 'rgba(255,190,220,.25)';
      rc.beginPath(); rc.arc(x, y, 18 + 18 * s.s, 0, 7); rc.fill(); rc.fillText(s.icon, x, y + 1); rc.globalAlpha = 1;
    }
    rc.textBaseline = 'alphabetic';
  }
  const DEFAULT_RANGE = { heatMin: 0, heatMax: 200, coolMin: 35, coolMax: 80 }, SEND_INTERVAL = 100, OFF = .03;
  const store = { get: (k, d) => { try { return JSON.parse(localStorage.getItem(`moheat.${k}`)) ?? d; } catch { return d; } }, set: (k, v) => { try { localStorage.setItem(`moheat.${k}`, JSON.stringify(v)); } catch {} } };
  const range = { ...DEFAULT_RANGE, ...store.get('range', {}) };
  let lastSent = '', lastSendAt = 0, tripped = false, intensity = +store.get('asmr.intensity', 100) / 100;
  const device = MoHeatDevice.create({ select: $('portSelect'), addBtn: $('addPort'), connectBtn: $('connectBtn'), status: $('deviceStatus') }, { log: (l) => console.log('[MoHeat]', l), onConnect: () => { lastSent = ''; } });
  if (!MoHeatDevice.supported) $('deviceStatus').querySelector('span').textContent = 'Web Serial needs desktop Chrome / Edge';
  function command(th) {
    const part = (sd, c, h) => (c > OFF ? `${sd}C${Math.round(range.coolMin + c * (range.coolMax - range.coolMin))}` : h > OFF ? `${sd}H${Math.round(range.heatMin + h * (range.heatMax - range.heatMin))}` : `${sd}H0`);
    return Math.max(th.Lc, th.Lh, th.Rc, th.Rh) <= OFF ? 'stop' : `${part('L', th.Lc, th.Lh)} ${part('R', th.Rc, th.Rh)}`;
  }
  function stopOutput() { if (device.isConnected()) device.send('stop'); lastSent = 'stop'; }
  function emergencyStop() { tripped = !tripped; const b = $('estop'); if (tripped) { stopOutput(); b.textContent = '↺ Re-arm output'; b.classList.add('tripped'); } else { b.textContent = '■ STOP'; b.classList.remove('tripped'); lastSent = ''; } }
  $('estop').addEventListener('click', emergencyStop); addEventListener('pagehide', stopOutput);
  $('intensity').value = Math.round(intensity * 100); $('intensityVal').textContent = `${Math.round(intensity * 100)}%`;
  $('intensity').addEventListener('input', (e) => { intensity = +e.target.value / 100; $('intensityVal').textContent = `${e.target.value}%`; store.set('asmr.intensity', +e.target.value); });
  const meterEls = Object.fromEntries(['Lc', 'Lh', 'Rc', 'Rh'].map((k) => [k, [$(`m${k}`), $(`v${k}`)]]));
  let conflicts = 0, frames = 0, peak = { Lc: 0, Lh: 0, Rc: 0, Rh: 0 };
  function output(th, live) {
    const sc = Object.fromEntries(Object.entries(th).map(([k, v]) => [k, live && !tripped ? v * intensity : 0]));
    if ((sc.Lc > OFF && sc.Lh > OFF) || (sc.Rc > OFF && sc.Rh > OFF)) conflicts++;
    if (live) { frames++; for (const k in peak) peak[k] = Math.max(peak[k], sc[k]); }
    for (const [k, [bar, val]] of Object.entries(meterEls)) { bar.style.width = `${sc[k] * 100}%`; val.textContent = Math.round(sc[k] * 100); }
    const cmd = command(sc); $('cmd').textContent = cmd;
    for (const [e, el] of [['L', $('glowL')], ['R', $('glowR')]]) {
      const c = sc[e + 'c'], h = sc[e + 'h'], v = Math.max(c, h), col = c > h ? '79,179,255' : '255,122,69';
      el.style.opacity = v.toFixed(2); el.style.background = `linear-gradient(to ${e === 'L' ? 'right' : 'left'}, rgba(${col},.55), rgba(${col},0))`;
    }
    if (!device.isConnected() || !$('sendOn').checked) return;
    const n = performance.now(); if (cmd !== lastSent && n - lastSendAt >= SEND_INTERVAL) { device.send(cmd); lastSent = cmd; lastSendAt = n; }
  }
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  // ---------------------------------------------------------------- screens: title → lobby → live → ended
  function show(m) {
    mode = m;
    $('intro').classList.toggle('hidden', m !== 'title');
    $('lobby')?.classList.toggle('show', m === 'lobby');
    $('ended').classList.toggle('show', m === 'ended');
    stage.classList.toggle('on-air', m === 'live' || m === 'ended');
  }
  function goLobby() { run++; SND.stopLoops(); S = { started: false, t: S.t || 0 }; sub('', ''); stopOutput(); setStep(0); show('lobby'); }
  function goLive(ch) {
    SND.init(); SND.loadVoices(Object.keys(LINES).filter((k) => k[0] === ch[0]));
    run++; SND.stopLoops(); const my = run;
    S = fresh(ch); parts = []; viewB = ''; mix = 1; list.innerHTML = ''; botT = 1; $('act').classList.remove('show');
    chatIn.classList.remove('turn', 'giving'); chips.innerHTML = ''; hint.innerHTML = '';
    $('chName').textContent = CH[ch].name; $('chTitle').textContent = CH[ch].title; $('vv').textContent = CH[ch].credit;
    stage.dataset.ch = ch; show('live');
    SND.loop('room', 0, 3)?.set(.05);
    for (let i = 0; i < 5; i++) chat(pick(HANDLES), pick(CH[ch].pool));
    ({ mint: mintStory, cocoa: cocoaStory, hinata: hinataStory, luna: lunaStory })[ch](my).catch((e) => { if (e.message !== 'stopped') console.error(e); });
  }
  document.querySelectorAll('.ch-card').forEach((b) => b.addEventListener('click', () => goLive(b.dataset.ch)));
  $('startBtn').addEventListener('click', () => { SND.init(); if (ONE) goLive(ONE); else goLobby(); });
  $('lobbyBack')?.addEventListener('click', () => show('title'));
  $('againBtn').addEventListener('click', () => goLive(S.ch || ONE || 'mint'));
  $('toLobbyBtn')?.addEventListener('click', goLobby);
  if (ONE && $('nextBtn').tagName === 'A') {   // keep ?embed=1 when hopping to the next streamer's demo (and start it right away)
    const q = new URLSearchParams(location.search); q.delete('cover'); q.delete('auto'); if (q.has('embed')) q.set('autoplay', '1');
    $('nextBtn').href = $('nextBtn').getAttribute('href') + (q.toString() ? '?' + q : '');
  }
  $('lrBtn').addEventListener('click', () => { SND.lrCheck(); const b = $('lrBtn'); b.textContent = '🎧 Left…'; setTimeout(() => { b.textContent = '🎧 …Right'; }, 900); setTimeout(() => { b.textContent = '🎧 Left / Right check'; }, 1900); });
  $('soundBtn').addEventListener('click', (e) => { SND.setMuted(!SND.isMuted()); e.target.textContent = SND.isMuted() ? '🔇' : '🔊'; });

  function drawCover() {
    if (ONE) {   // one streamer: her stream frame, darkened on the right where the title sits
      const im = IMG[`${ONE}_live`]; ctx.fillStyle = '#231c3c'; ctx.fillRect(0, 0, W, H); if (im) ctx.drawImage(im, 0, 0, W, H);
      const g = ctx.createLinearGradient(0, 0, W, 0); g.addColorStop(0, 'rgba(18,12,36,0)'); g.addColorStop(.42, 'rgba(18,12,36,.1)'); g.addColorStop(.6, 'rgba(18,12,36,.62)'); g.addColorStop(1, 'rgba(18,12,36,.8)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); return;
    }
    drawCover4();
  }
  function drawCover4() {   // the four streamers side by side, faces in the upper half; the title sits below them
    ctx.fillStyle = '#231c3c'; ctx.fillRect(0, 0, W, H);
    [['mint_live', 585], ['cocoa_live', 640], ['hinata_live', 630], ['luna_live', 570]].forEach(([n, cx], i) => {
      const im = IMG[n]; if (!im) return; const k = im.width / W, sw = 480, sx = Math.max(0, Math.min(W - sw, cx - sw / 2));
      ctx.drawImage(im, sx * k, 40 * k, sw * k, (H - 40) * k, i * 480, 0, 480, H - 40);
      if (i) { ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(i * 480 - 1, 0, 2, H); }
    });
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(20,14,40,0)'); g.addColorStop(.42, 'rgba(20,14,40,.05)'); g.addColorStop(.62, 'rgba(20,14,40,.72)'); g.addColorStop(1, 'rgba(20,14,40,.9)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }


  let last = performance.now(), hidden = false;
  function loop() {
    const n = performance.now(), dt = clamp((n - last) / 1000, 0, .05); last = n;
    if (!hidden) {
      update(dt);
      if (mode === 'live' || (mode === 'ended' && S.ch)) draw(S.t, dt); else drawCover();
      const { th, src } = thermal(dt); output(th, !!S.started); radar(S.started ? src : [], th);
      $('clock').textContent = fmt(S.clock || 0);
      $('posInfo').textContent = S.started ? (S.pos.dist < .2 ? (S.pos.az < 0 ? 'At your left ear' : S.pos.az > 0 ? 'At your right ear' : 'Right in front') : 'At her desk') : '';
    }
    requestAnimationFrame(loop);
  }
  document.addEventListener('visibilitychange', () => { hidden = document.hidden; if (hidden) { stopOutput(); SND.ctx()?.suspend(); } else { last = performance.now(); SND.ctx()?.resume(); } });
  document.addEventListener('keydown', (e) => { if (e.code === 'Escape') emergencyStop(); });
  window.STREAM = { get S() { return S; }, get mode() { return mode; }, goLive, conflicts: () => conflicts, frames: () => frames, peak: () => ({ ...peak }) };
  setStep(0); show('title');
  if (QS.has('cover')) { document.body.classList.add('cover-only'); artReady.then(drawCover); return; }
  const go = () => (ONE ? goLive(ONE) : goLobby());
  if (QS.has('autoplay')) { const ac = SND.init(); if (ac.state === 'running') go(); else ac.resume().then(() => { if (ac.state === 'running' && mode === 'title') go(); }).catch(() => {}); }
  requestAnimationFrame(loop);
})();
