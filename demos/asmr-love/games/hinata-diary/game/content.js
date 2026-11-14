// Hinata Diary — the asmr-love sample game (2026-11-14, PLACEHOLDER story: proves the genre runs on the raise engine; see ../../ENGINE.md).
// Shape: days. Each day: the day map (pick 2 places: each moves the numbers, some give an item) → the night (an ASMR episode, a story.json
// from game.json "stories": voices, props, thermal all derived; an item from the day can be given at the start) → after 3 nights an ending by the numbers.
// No DOM here (node runs the rules). Pose names = packs/hinata/pack.json poses.
(function (root) {
  const GENRE = 'asmr-love', WEEKS = 3, SLOTS = 2;
  const START = { affection: 10, harmony: 10, stamina: 80, fans: 0 };
  const STATS = { affection: { zh: '好感', ja: 'すき度', en: 'Affection' }, harmony: { zh: '默契', ja: 'いきぴったり', en: 'Harmony' },
    stamina: { zh: '体力', ja: 'たいりょく', en: 'Energy' }, fans: { zh: '心动', ja: 'ときめき', en: 'Heartbeats' } };
  const CHAPTERS = [];
  // the day map: places (art/scenes/<key>.webp); amb = the place's own warm / cool at the ears (low)
  const SCENES = {
    room_day: { x: 50, bgm: 'day', fx: 'dust', amb: {}, name: { zh: '你的房间', ja: 'きみの部屋', en: 'Your room' } },
    snow_street: { x: 50, bgm: 'walk', fx: 'snow', amb: { Rc: .2 }, name: { zh: '雪夜街道', ja: '雪の通り', en: 'Snowy street' } },
    room_night: { x: 50, bgm: 'night', fx: 'dust', amb: {}, name: { zh: '夜晚的房间', ja: '夜の部屋', en: 'Your room at night' } },
  };
  const ACTS = [
    { id: 'shop', scene: 'snow_street', pose: 'wave', gift: 'scarf', gain: { affection: 4 }, flat: { stamina: -10 }, name: { zh: '去杂货店', ja: '雑貨屋さんへ', en: 'Gift shop' }, hint: { zh: '买围巾', ja: 'マフラーを買う', en: 'Buy a scarf' },
      msg: { zh: '今天好冷，要穿暖和一点哦。……晚上给你打电话。', ja: 'きょう寒いから、あったかくしてね。…夜、電話する。', en: "It's cold today, so bundle up, okay? …I'll call you tonight." },
      line: { zh: '这条围巾……他围上一定很好看。', ja: 'このマフラー…ひなたに似合いそう。', en: 'This scarf… it would suit him.' , me: true } },
    { id: 'pharmacy', scene: 'snow_street', pose: 'idle', gift: 'icetowel', gain: { harmony: 3 }, flat: { stamina: -8 }, name: { zh: '去药店', ja: '薬局へ', en: 'Pharmacy' }, hint: { zh: '冰毛巾', ja: 'ひんやりタオル', en: 'A cool towel' },
      msg: { zh: '嗓子好像有点疼……别担心，我没事的。', ja: 'ちょっと喉いたいかも。…心配しないで、だいじょうぶ。', en: "My throat's a little sore. …Don't worry, I'm okay." },
      line: { zh: '他最近好像有点累，备一条冰毛巾吧。', ja: '最近つかれてるみたい。冷たいタオル、用意しよう。', en: 'He looks tired lately. A cool towel, just in case.' , me: true } },
    { id: 'cook', scene: 'room_day', pose: 'cheer', gift: 'porridge', gain: { affection: 3, harmony: 2 }, flat: { stamina: -12 }, name: { zh: '煮粥', ja: 'おかゆを作る', en: 'Cook porridge' }, hint: { zh: '热乎乎', ja: 'あったか', en: 'Something warm' },
      msg: { zh: '好像很香的样子。……真好，我也想吃。', ja: 'いい匂いしそう。…いいなあ、俺も食べたい。', en: 'That sounds like it smells amazing. …Lucky. I want some too.' },
      line: { zh: '慢慢煮，煮得软软的。', ja: 'ことこと、やわらかく。', en: 'Slowly, until it is soft.' , me: true } },
    { id: 'rest', scene: 'room_day', pose: 'shy', gain: {}, flat: { stamina: 30 }, name: { zh: '休息', ja: '休む', en: 'Rest' }, hint: { zh: '体力↑', ja: '体力↑', en: 'Energy↑' },
      msg: { zh: '有好好休息吗？……晚上见，先睡一会儿吧。', ja: 'ちゃんと休んでる？ …夜まで、ひと眠りしてね。', en: 'Are you getting some rest? …Take a little nap till tonight.' },
      line: { zh: '晚上还要和他打电话，先睡一会儿。', ja: '夜はひなたと電話。ちょっと寝ておこう。', en: "A call with him tonight. A short nap first." , me: true } },
  ];
  const TIRED = { zh: '……有点累了。', ja: '…ちょっと疲れた。', en: "…I'm a bit tired.", me: true };
  // the nights: { night: <story id in game.json> } (lines before it are text only)
  const EVENTS = {
    0: { scene: 'room_night', lines: [['wave', { zh: '（今晚，日向说要给你打电话。）', ja: '（今夜、ひなたから電話がくる。）', en: '(Tonight, Hinata said he would call.)', me: true }],
      ['wave', { zh: '喂？……今晚，可以聊一会儿吗？', ja: 'もしもし？ …今夜、ちょっとだけ話せる？', en: 'Hello? …Can we talk for a little bit tonight?' }]] },
    1: { night: 'H1' },
    2: { night: 'H2' },
    3: { night: 'H3' },
  };
  // music per phase (game/bgm.js names, or 'none'): the day map plays each place's own (SCENES[].bgm); under a night call the night theme,
  // quiet and off while he is at your ear (engine rules.music); the ending its own
  const MUSIC = { title: 'night', night: 'night', ending: 'heart' };
  // his answer when you give him an item at the start of a night (voiced: audio/voice/<lang>/gift_<item>.m4a, wired by game.json stories[].gift.react)
  const GIFTS = {
    scarf: { zh: '诶，围巾？……给我的？……嘿嘿，适合我吗？……谢谢，好暖和。', ja: 'え、マフラー？ …俺に？ …ふふ、似合う？ …ありがと。あったかい。', en: "Wait, a scarf? …For me? …Heh, does it suit me? …Thank you. It's warm." },
    icetowel: { zh: '冰毛巾？……嗯，好舒服。……你一直在留意我呀。', ja: 'ひんやりタオル？ …ん、きもちいい。…ちゃんと俺のこと、見ててくれたんだ。', en: 'A cool towel? …Mm, that feels so nice. …You were looking out for me, huh.' },
    porridge: { zh: '你给我煮了粥？……呼、呼。……嗯，好温柔的味道。谢谢。', ja: 'おかゆ、つくってくれたの？ …ふー、ふー。…ん、やさしい味。ありがと。', en: 'You made me porridge? …Fuu, fuu. …Mm. Such a gentle taste. Thank you.' },
  };
  const SONGS = {};
  const RANKS = { S: { min: 60, title: { zh: '心意相通', ja: 'こころ、かさなる', en: 'Hearts in tune' }, fans: 1 }, A: { min: 40, title: { zh: '越来越近', ja: 'すこしずつ近く', en: 'Getting closer' }, fans: 1 },
    B: { min: 0, title: { zh: '新的开始', ja: 'はじまり', en: 'A beginning' }, fans: 1 } };
  const end = (zh, ja, en) => [['heart', { zh, ja, en }]];
  const ENDING = { S: end('……以后，也一直在你身边。', '…これからも、ずっとそばにいる。', '…From now on, I stay right beside you.'),
    A: end('明天也打给你，好吗？', 'あしたも電話していい？', 'Can I call you tomorrow too?'), B: end('慢慢来就好。', 'ゆっくりでいいよ。', "Let's take it slow.") };
  const SECRET = { affection: 999, title: { zh: '秘密', ja: 'ひみつ', en: 'Secret' } };
  const UI = {
    kicker: { zh: 'MoHeat Evo · 恋爱 ASMR', ja: 'MoHeat Evo · 恋愛 ASMR', en: 'MoHeat Evo · romance ASMR' }, title: { zh: '日向日记', ja: 'ひなた日記', en: 'Hinata Diary' }, sub: { zh: '三天，三个夜晚', ja: '3日間と、3つの夜', en: 'Three days, three nights' },
    start: { zh: '开始', ja: 'はじめる', en: 'Start' }, cont: { zh: '继续（第 {w} 天）', ja: 'つづきから（{w} 日目）', en: 'Continue (day {w})' },
    fine: { zh: '画面两侧的橙 / 蓝 = 左右耳的暖 / 凉。■ = 立刻停止温感。', ja: '画面の左右のオレンジ / 青 = 左右の耳のあたたかさ / つめたさ。■ = すぐ止める。', en: 'Orange / blue at the screen edges = warm / cool on each ear. ■ = stop at once.' },
    week: { zh: '第 {w} / 3 天', ja: '{w} / 3 日目', en: 'Day {w} / 3' }, plan: { zh: '今天去哪儿？', ja: 'きょうはどこへ？', en: 'Where to today?' },
    stamAfter: { zh: '体力 {a} → {b}', ja: '体力 {a} → {b}', en: 'Energy {a} → {b}' }, planHint: { zh: '选 2 个地方', ja: '2 か所えらぶ', en: 'Pick 2 places' }, go: { zh: '出发', ja: 'でかける', en: 'Go' },
    tired: { zh: '太累了，改为休息', ja: 'つかれすぎ → 休み', en: 'Too tired → rest' }, save: { zh: '保存结果图', ja: '結果を保存', en: 'Save card' }, again: { zh: '再来一次', ja: 'もう一度', en: 'Play again' },
    cardLine: { zh: '和日向的三个夜晚', ja: 'ひなたとの三つの夜', en: 'Three nights with Hinata' }, cardSong: { zh: '结局', ja: 'エンディング', en: 'Ending' }, cardLive: { zh: '{p}%', ja: '{p}%', en: '{p}%' },
    gotGift: { zh: '得到了：{g}（晚上可以送给他）', ja: '{g} を手に入れた（夜にわたせる）', en: 'Got: {g} (give it to him tonight)' },
    speaker: { zh: '日向', ja: 'ひなた', en: 'Hinata' },
    voiceMsg: { zh: '日向发来一条语音', ja: 'ひなたからボイスメッセージ', en: 'A voice message from Hinata' },
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), CAP = { affection: 100, harmony: 100, stamina: 100 };
  function add(s, fx) { const d = {}; for (const [k, v] of Object.entries(fx || {})) { const b = s[k] || 0; s[k] = k in CAP ? clamp(b + v, 0, CAP[k]) : Math.max(0, Math.round(b + v)); d[k] = s[k] - b; } return d; }
  const TAPMUL = { perfect: 1.3, good: 1, miss: .8 };
  function act(s, a) {
    if (a.flat.stamina < 0 && s.stamina + a.flat.stamina < 0) return { tired: true, delta: add(s, { stamina: 30 }) };
    return { tired: false, delta: add(s, { ...a.flat, ...a.gain, fans: 1 }) };
  }
  const score = (s) => Math.round(s.affection + s.harmony * .6);
  const rank = (s) => ['S', 'A', 'B'].find((r) => score(s) >= RANKS[r].min);
  function lines() {
    const out = [], put = (id, l) => out.push({ id, text: l[1], ear: l[2] || null, me: !!l[1].me });
    for (const [n, ev] of Object.entries(EVENTS)) (ev.lines || []).forEach((l, i) => put(`e${n}_${i}`, l));
    for (const a of ACTS) { out.push({ id: `act_${a.id}`, text: a.line, ear: null, me: !!a.line.me }); if (a.msg) out.push({ id: `msg_${a.id}`, text: a.msg, ear: null }); } out.push({ id: 'tired', text: TIRED, ear: null, me: true });   // me = your own lines: never voiced
    for (const [r, ls] of Object.entries(ENDING)) ls.forEach((l, i) => put(`end_${r}_${i}`, l)); for (const [g, t] of Object.entries(GIFTS)) out.push({ id: `gift_${g}`, text: t, ear: null }); return out;
  }
  root.DP_GAME = { GIFTS, MUSIC, GENRE, WEEKS, SLOTS, START, STATS, CHAPTERS, SCENES, ACTS, TIRED, EVENTS, SONGS, RANKS, ENDING, SECRET, UI, lines, TAPMUL, BARS: ['affection', 'harmony', 'stamina'], CARD_STATS: ['affection', 'harmony'],
    rules: { add, act, score, rank, secret: () => false, liveBonus: () => 0, leniency: () => 1, chapterOf: () => 0 } };
})(typeof window !== 'undefined' ? window : globalThis);
