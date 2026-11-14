// Diva Diary — all content and rules as data. Texts: { zh, ja, en } (Korean: l10n.ko.js). No DOM in this file (tools/sim.js runs the rules in node).
// To change the game, edit here: START (first numbers), CHAPTERS (one song per two weeks), ACTS (the nine week activities),
// EVENTS (story per week), SONGS / RANKS / ENDING, UI (texts), rules.
// Story (v0.4, user 2026-11-13): four chapters of two weeks, one song each. Lessons practise the chapter's song as short rhythm parts, the
// second week of chapters 1–3 ends with a small stage (30 s of that song in costume), the concert = a part of three songs + the main song in full.
// Thermal (ambient per place, 0..1): c = cool, h = heat, per ear. Matches what the picture shows on that side.
// Per place also: bgm = music loop (game/bgm.js), fx = particles in the air (engine pg.fx.js), rays = stage light rays.
(function (root) {
  const WEEKS = 8, SLOTS = 3;
  // m_<song> = how well she knows that song (0–100): lessons, gigs, stages and some choices raise it; the best one becomes the main song
  const START = { vocal: 12, dance: 12, charm: 12, stamina: 80, mood: 60, bond: 10, fans: 120, m_q1: 0, m_q2: 0, m_q3: 0, m_q4: 0 };
  const STATS = {
    vocal: { zh: '歌唱', ja: 'うた', en: 'Vocal' }, dance: { zh: '舞蹈', ja: 'ダンス', en: 'Dance' }, charm: { zh: '魅力', ja: 'みりょく', en: 'Charm' },
    stamina: { zh: '体力', ja: 'たいりょく', en: 'Energy' }, mood: { zh: '心情', ja: 'きぶん', en: 'Mood' }, bond: { zh: '亲密', ja: 'きずな', en: 'Bond' },
    fans: { zh: '粉丝', ja: 'ファン', en: 'Fans' },
  };
  // weeks 1–2, 3–4, 5–6, 7–8
  const CHAPTERS = [
    { song: 'q1', name: { zh: '出道', ja: 'デビュー', en: 'Debut' } },
    { song: 'q4', name: { zh: '夏天', ja: '夏', en: 'Summer' } },
    { song: 'q2', name: { zh: '风暴', ja: 'あらし', en: 'Storm' } },
    { song: 'q3', name: { zh: '心声', ja: 'こころの声', en: 'Her Own Words' } },
  ];

  const SCENES = {
    fan_room:   { x: 50, bgm: 'day', fx: 'dust', amb: { Lh: .15, Rh: .15 }, name: { zh: '事务所', ja: '事務所', en: 'The office' } },
    music_hall: { x: 68, bgm: 'night', fx: 'dust', amb: { Lc: .35, Rh: .4 },  name: { zh: '音乐室 · 窗外下雪，壁炉烧着', ja: '音楽室 · 窓に雪、だんろの火', en: 'Music room · snow outside, fire inside' } },
    rehearsal:  { x: 42, bgm: 'lesson', fx: 'dust', rays: true, amb: { Lh: .4, Rc: .3 },   name: { zh: '排练舞台 · 灯很烫，门口有风', ja: 'リハーサル · あついライト、とびらの風', en: 'Rehearsal stage · hot lights, a breeze from the door' } },
    rooftop:    { x: 30, bgm: 'storm', fx: 'rain', amb: { Lh: .4, Rc: .45 },  name: { zh: '天台 · 音箱发烫，暴雨将至', ja: '屋上 · あついアンプ、あらしの前', en: 'Rooftop · hot amps, a storm coming' } },
    attic:      { x: 62, bgm: 'night', fx: 'dust', amb: { Lc: .4, Rh: .35 },  name: { zh: '阁楼 · 雪窗和小暖炉', ja: '屋根裏 · 雪の窓と小さなストーブ', en: 'Attic · a snowy window and a little heater' } },
    seaside:    { x: 22, bgm: 'fest', fx: 'embers', amb: { Lh: .3, Rc: .35 },  name: { zh: '海边舞台 · 灯笼和海风', ja: '海辺のステージ · ちょうちんと海風', en: 'Seaside stage · lanterns and sea wind' } },
    radio:      { x: 30, bgm: 'night', fx: 'dust', amb: { Lh: .3, Rc: .3 },   name: { zh: '电台 · 台灯和雨夜的窗', ja: 'ラジオ局 · ランプと雨の窓', en: 'Radio booth · a lamp and a rainy window' } },
    cafe:       { x: 70, bgm: 'walk', fx: 'sparkle', amb: { Lh: .25, Rc: .25 }, name: { zh: '温室咖啡 · 阳光和喷泉', ja: '温室カフェ · ひだまりと噴水', en: 'Greenhouse café · sunshine and a fountain' } },
    riverside:  { x: 24, bgm: 'walk', fx: 'petals', amb: { Lh: .3, Rc: .2 },   name: { zh: '樱花河畔 · 夕阳和河风', ja: '桜の川べり · 夕日と川風', en: 'Cherry riverside · sunset and river breeze' } },
  };

  // lesson: practised as a rhythm part of the chapter's song (→ that song's m_) · gig: a rhythm part of a song she has already put on a stage
  // tap: the ring tap game · gain: grows with mood × how well the game went · flat: always
  const ACTS = [
    { id: 'vocal', lesson: true, scene: 'music_hall', pose: 'vocal', gain: { vocal: 8 }, flat: { stamina: -14 },
      name: { zh: '声乐课', ja: 'ボイトレ', en: 'Voice lesson' }, hint: { zh: '歌唱↑ 体力-14', ja: 'うた↑ 体力-14', en: 'Vocal↑ −14' },
      line: { zh: '啊——♪ 这个高音，刚才是不是稳了一点？', ja: 'あー♪ いまの高い音、ちょっと安定したかな？', en: 'Aah— ♪ That high note felt steadier, right?' } },
    { id: 'dance', lesson: true, scene: 'rehearsal', pose: 'dance', gain: { dance: 8 }, flat: { stamina: -18 },
      name: { zh: '舞蹈课', ja: 'ダンス', en: 'Dance lesson' }, hint: { zh: '舞蹈↑ 体力-18', ja: 'ダンス↑ 体力-18', en: 'Dance↑ −18' },
      line: { zh: '一、二、三、转！……呼，这次没踩错拍！', ja: 'ワン、ツー、スリー、ターン！…ふう、まちがえなかった！', en: 'One, two, three, turn! …Phew, right on the beat this time!' } },
    { id: 'acting', scene: 'fan_room', pose: 'photo', tap: true, gain: { charm: 7 }, flat: { stamina: -9 },
      name: { zh: '表情练习', ja: '表情レッスン', en: 'Smile practice' }, hint: { zh: '魅力↑ 体力-9', ja: 'みりょく↑ 体力-9', en: 'Charm↑ −9' },
      line: { zh: '看镜头——比心！嘿嘿，这个角度可爱吗？', ja: 'カメラ見て——ハート！えへへ、この角度かわいい？', en: 'Eyes on the camera — heart! Hehe, is this my cute angle?' } },
    { id: 'band', scene: 'rooftop', pose: 'band', tap: true, gain: { vocal: 4, dance: 4 }, flat: { stamina: -16, mood: 3 },
      name: { zh: '乐队合练', ja: 'バンド練習', en: 'Band session' }, hint: { zh: '歌唱舞蹈↑ 心情↑', ja: 'うた・ダンス↑ きぶん↑', en: 'Vocal+Dance↑ Mood↑' },
      line: { zh: '音箱开到最大！把雷声也盖过去！', ja: 'アンプ全開！かみなりにも負けないよ！', en: 'Amps all the way up! Louder than the thunder!' } },
    { id: 'write', scene: 'attic', pose: 'write', gain: { vocal: 5, charm: 4 }, flat: { stamina: -8, mood: -3 },
      name: { zh: '深夜写歌', ja: '夜の作詞', en: 'Night writing' }, hint: { zh: '歌唱魅力↑ 心情↓', ja: 'うた・みりょく↑ きぶん↓', en: 'Vocal+Charm↑ Mood↓' },
      line: { zh: '……雪落下来没有声音。这一句，我想写进歌里。', ja: '…雪って、音がしないんだね。この一行、歌に入れたいな。', en: '…Snow falls without a sound. I want that line in the song.' } },
    { id: 'street', gig: true, scene: 'seaside', pose: 'street', gain: { charm: 3 }, flat: { stamina: -14 }, fans: true,
      name: { zh: '海边路演', ja: '海辺ライブ', en: 'Seaside gig' }, hint: { zh: '粉丝↑↑ 体力-14', ja: 'ファン↑↑ 体力-14', en: 'Fans↑↑ −14' },
      line: { zh: '大家——！我是绫音！请听到最后哦！', ja: 'みんなー！綾音です！さいごまで聴いてね！', en: "Everyone—! I'm Ayane! Stay till the end, okay?" } },
    { id: 'radio', scene: 'radio', pose: 'radio', gain: { charm: 4 }, flat: { stamina: -6 }, fans: .5,
      name: { zh: '电台嘉宾', ja: 'ラジオ出演', en: 'Radio guest' }, hint: { zh: '魅力↑ 粉丝↑', ja: 'みりょく↑ ファン↑', en: 'Charm↑ Fans↑' },
      line: { zh: '晚上好，这里是绫音。……小声说话的感觉，有点紧张呢。', ja: 'こんばんは、綾音です。…小さい声でしゃべるの、ちょっとドキドキするね。', en: "Good evening, this is Ayane. …Talking this softly makes my heart race." } },
    { id: 'rest', scene: 'cafe', pose: 'drink', gain: {}, flat: { stamina: 42, mood: 8 },
      name: { zh: '咖啡店休息', ja: 'カフェで休む', en: 'Café break' }, hint: { zh: '体力+42 心情↑', ja: '体力+42 きぶん↑', en: 'Energy +42 Mood↑' },
      line: { zh: '给，冰汽水。贴一下脸——凉吧？', ja: 'はい、つめたいラムネ。ほっぺに——ひんやり？', en: 'Here, an ice-cold soda. Against your cheek — chilly?' }, cold: 'R' },
    { id: 'outing', scene: 'riverside', pose: 'gift', gain: {}, flat: { stamina: 12, mood: 12, bond: 8 },
      name: { zh: '河边散步', ja: '川べりさんぽ', en: 'Riverside walk' }, hint: { zh: '亲密↑ 心情↑', ja: 'きずな↑ きぶん↑', en: 'Bond↑ Mood↑' },
      line: { zh: '今天不谈工作！……帽子借你戴，夕阳有点晒。', ja: '今日はお仕事の話なし！…ぼうし貸してあげる、夕日まぶしいから。', en: "No work talk today! …Borrow my hat, the sunset's bright." } },
  ];

  const TIRED = { zh: '……对不起，腿有点软。今天让我休息一下好吗？', ja: '…ごめんね、足がふらふら。今日は休ませて？', en: "…Sorry, my legs are wobbly. Can I rest today?" };

  // The story beat of a week, after its three activities.
  //   lines: [pose, text, ear?, thermal?]   ear 'L' / 'R' = she speaks at that ear (it warms with her voice)
  //   choices: { t, fx: { number: change, m_q2: … }, re: line }   ·   stage: true = the chapter's small stage follows   ·   after: lines after the stage
  const EVENTS = {
    0: { scene: 'fan_room', lines: [
        ['wave', { zh: '制作人！从今天起请多关照！', ja: 'プロデューサーさん！今日からよろしくね！', en: "Producer! I'm in your hands from today!" }],
        ['front', { zh: '八周之后，就是我的第一场个人演唱会。', ja: '8週間後は、わたしのはじめてのソロライブ。', en: 'Eight weeks from now is my very first solo concert.' }],
        ['front', { zh: '我有四首歌，每两周练一首。哪一首当主打，就看这八周了。', ja: '歌は4曲。2週間に1曲ずつ練習するの。どれがメインになるかは、この8週間しだい。', en: 'I have four songs — one for every two weeks. Which one becomes the main song depends on these eight weeks.' }],
        ['earL', { zh: '……我会努力的。所以，要一直看着我哦。', ja: '…がんばるから。ずっと、見ててね。', en: "…I'll do my best. So keep your eyes on me." }, 'L'],
      ] },
    // ---- chapter 1 · Debut · Sparkling Ice & Fire
    1: { scene: 'rehearsal', lines: [
        ['front', { zh: '「闪闪的冰与火」……副歌那个转身，我还是跳不好。', ja: '「きらきら こおりとほのお」…サビのターン、まだうまくできない。', en: '"Sparkling Ice & Fire"… I still can\'t land the turn in the chorus.' }],
        ['front', { zh: '大家都回去了。制作人，你说我该怎么办？', ja: 'みんな帰っちゃった。プロデューサーさん、どうしたらいい？', en: "Everyone's gone home. Producer, what should I do?" }],
      ], choices: [
        { t: { zh: '我陪你，再来一次', ja: 'つきあうよ、もう一回', en: "I'll stay. Once more" }, fx: { dance: 4, bond: 4, stamina: -8, m_q1: 6 }, re: ['hands', { zh: '……成功了！你看见了吗！刚才那个！', ja: '…できた！見てた！？いまの！', en: '…I did it! Did you see that?!' }] },
        { t: { zh: '今天到这里，明天会更好', ja: '今日はここまで。明日はもっとできる', en: 'Enough for today. Tomorrow will be better' }, fx: { stamina: 12, mood: 8, bond: 2 }, re: ['front', { zh: '……嗯。谢谢你没有让我硬撑。', ja: '…うん。むりさせないでくれて、ありがとう。', en: '…Okay. Thanks for not letting me push too hard.' }] },
      ] },
    2: { scene: 'fan_room', stage: true, lines: [
        ['front', { zh: '今天是事务所的小公演……第一次在别人面前唱这首歌。', ja: '今日は事務所のミニライブ…この歌を人の前で歌うの、はじめて。', en: "Today's the little show at the office… my first time singing this song in front of people." }],
        ['earR', { zh: '……心跳好快。制作人，听得见吗？', ja: '…心臓、すごくはやい。プロデューサーさん、聞こえる？', en: '…My heart is racing. Producer, can you hear it?' }, 'R'],
      ], choices: [
        { t: { zh: '听得见。去吧', ja: '聞こえるよ。いっておいで', en: 'I can hear it. Go on' }, fx: { mood: 10, bond: 3 }, re: ['hands', { zh: '……嗯！我去了！', ja: '…うん！いってくる！', en: '…Right! Here I go!' }] },
        { t: { zh: '就像练习时那样', ja: '練習どおりにね', en: 'Just like in practice' }, fx: { vocal: 2, dance: 2, m_q1: 4 }, re: ['front', { zh: '练习时那样……好。深呼吸。', ja: '練習どおり…うん。しんこきゅう。', en: 'Like practice… okay. Deep breath.' }] },
      ], after: [
        ['photo', { zh: '大家都鼓掌了……！嘿嘿，给第一位粉丝——比心。', ja: 'みんな拍手してくれた…！えへへ、いちばん最初のファンに——ハート。', en: 'Everyone clapped…! Hehe, for my very first fan — a heart.' }],
      ] },
    // ---- chapter 2 · Summer · Summer Night Festival
    3: { scene: 'riverside', lines: [
        ['fan', { zh: '下一首是「夏宵祭」。夏日祭典请我去当嘉宾呢！', ja: 'つぎの歌は「なつよい まつり」。夏祭りのゲストに呼ばれたんだよ！', en: 'Next is "Summer Night Festival". I\'ve been invited to sing at the summer festival!' }],
        ['fan', { zh: '今天好热……我给你扇扇风吧。左边——右边——凉快吗？', ja: '今日あついね…あおいであげる。ひだり——みぎ——すずしい？', en: "It's so hot today… let me fan you. Left — right — is that cooler?" }, null, [{ Lc: .8, Rc: .1 }, { Rc: .8, Lc: .1 }]],
      ], choices: [
        { t: { zh: '换我给你扇', ja: 'こんどは、こっちがあおぐよ', en: 'My turn to fan you' }, fx: { bond: 6, mood: 6 }, re: ['front', { zh: '哇……好舒服。再、再扇一会儿。', ja: 'わあ…きもちいい。も、もうちょっとだけ。', en: 'Wow… that feels nice. J-just a little longer.' }] },
        { t: { zh: '这把扇子，舞台上用吧', ja: 'そのうちわ、ステージで使おう', en: "Let's use that fan on stage" }, fx: { charm: 4, m_q4: 6 }, re: ['fan', { zh: '好主意！我要练一个扇子的动作！', ja: 'いいね！うちわのふり、考えてみる！', en: "Great idea! I'll work out a fan move!" }] },
      ] },
    4: { scene: 'seaside', stage: true, lines: [
        ['front', { zh: '灯笼都亮起来了……来了好多人。', ja: 'ちょうちんに火がついた…たくさん来てる。', en: 'The lanterns are all lit… so many people came.' }],
        ['earR', { zh: '……手在抖。制作人，跟我说句话吧。', ja: '…手がふるえてる。プロデューサーさん、なにか言って。', en: '…My hands are shaking. Producer, say something.' }, 'R'],
      ], choices: [
        { t: { zh: '你一定可以', ja: 'きみならできる', en: 'You can do this' }, fx: { mood: 12, bond: 3 }, re: ['hands', { zh: '……嗯！你看着吧！', ja: '…うん！見ててね！', en: '…Right! Watch me!' }] },
        { t: { zh: '我在最前面看着你', ja: 'いちばん前で見てるよ', en: "I'll be watching from the front row" }, fx: { bond: 7, mood: 6 }, re: ['earR', { zh: '……那我只唱给你听。', ja: '…じゃあ、きみだけに歌うね。', en: "…Then I'll sing just for you." }, 'R'] },
      ], after: [
        ['drink', { zh: '呼——唱完了！给，冰汽水。贴你脸上——凉不凉？', ja: 'ふう——歌いきった！はい、つめたいラムネ。ほっぺに——つめたい？', en: 'Phew — done! Here, an ice-cold soda. On your cheek — cold?' }, null, { Rc: .9 }],
      ] },
    // ---- chapter 3 · Storm · Storm Heart
    5: { scene: 'radio', lines: [
        ['front', { zh: '……今天电台的人说，“绫音只会可爱吧”。', ja: '…今日ラジオの人に言われたの。「綾音は、かわいいだけでしょ」って。', en: '…Someone at the radio station said, "Ayane can only do cute, right?"' }],
        ['front', { zh: '我不甘心。下一首「风暴之心」，我想唱得很帅。……很奇怪吗？', ja: 'くやしい。つぎの「ストーム・ハート」は、かっこよく歌いたい。…へんかな？', en: 'It stung. I want to sing the next one, "Storm Heart", and be cool. …Is that weird?' }],
      ], choices: [
        { t: { zh: '一点都不奇怪，我想看', ja: 'ぜんぜん変じゃない。見たい', en: 'Not weird at all. I want to see it' }, fx: { mood: 8, bond: 3, m_q2: 8 }, re: ['hands', { zh: '……真的？那我要把音箱开到最大！', ja: '…ほんと？じゃあ、アンプ全開でいくね！', en: '…Really? Then I\'m turning the amps all the way up!' }] },
        { t: { zh: '可爱也是你的武器', ja: 'かわいいのも、きみの武器だよ', en: 'Being cute is your weapon too' }, fx: { charm: 4, bond: 2, m_q1: 4 }, re: ['front', { zh: '……嗯。可是，我两样都想要。', ja: '…うん。でも、どっちもほしいの。', en: '…Mm. But I want both.' }] },
      ] },
    6: { scene: 'rooftop', stage: true, lines: [
        ['front', { zh: '要下暴雨了。……正好。', ja: 'あらしが来るね。…ちょうどいい。', en: "A storm's coming. …Perfect." }],
        ['earL', { zh: '制作人，站近一点。今天的我，可能有点吓人哦。', ja: 'プロデューサーさん、もっと近くに来て。今日のわたし、ちょっとこわいかもよ。', en: 'Producer, come closer. I might be a little scary today.' }, 'L'],
      ], choices: [
        { t: { zh: '让我看看', ja: '見せて', en: 'Show me' }, fx: { bond: 4, mood: 6 }, re: ['front', { zh: '那就别眨眼。', ja: 'じゃあ、まばたきしないでね。', en: "Then don't blink." }] },
        { t: { zh: '淋湿了会感冒的', ja: 'ぬれたら風邪ひくよ', en: "You'll catch a cold in the rain" }, fx: { stamina: 8, bond: 2 }, re: ['hands', { zh: '唱完再说！', ja: '歌ってから考える！', en: "I'll think about that after the song!" }] },
      ], after: [
        ['hands', { zh: '哈……哈……！你听见雷声了吗？被我盖过去了！', ja: 'はあ…はあ…！かみなり、聞こえた？わたしのほうが大きかったよ！', en: 'Hah… hah…! Did you hear the thunder? I was louder!' }],
      ] },
    // ---- chapter 4 · Her Own Words · Snow by the Window
    7: { scene: 'attic', lines: [
        ['front', { zh: '……睡不着。还有一周了。', ja: '…ねむれない。あと1週間。', en: "…I can't sleep. One week left." }],
        ['front', { zh: '最后一首「窗边的雪」，歌词是我自己写的。', ja: 'さいごの歌「まどべの ゆき」は、わたしが歌詞を書いたの。', en: 'The last song, "Snow by the Window" — I wrote the words myself.' }],
        ['earL', { zh: '……写的是，一直在旁边看着我的人。', ja: '…ずっと、そばで見ていてくれた人のこと。', en: "…They're about someone who has been watching over me the whole time." }, 'L'],
      ], choices: [
        { t: { zh: '握住她的手', ja: '手をにぎる', en: 'Take her hands' }, fx: { bond: 7, mood: 10, m_q3: 6 }, re: ['hands', { zh: '……好暖。嗯，不怕了。', ja: '…あったかい。うん、もうこわくない。', en: "…So warm. Okay. I'm not scared now." }] },
        { t: { zh: '那就练到安心为止', ja: '安心できるまで、練習しよう', en: 'Then we practise until you feel sure' }, fx: { vocal: 3, dance: 3, stamina: -10, bond: 2, m_q3: 8 }, re: ['front', { zh: '……你也陪我熬夜呀。谢谢。', ja: '…いっしょに夜ふかししてくれるんだ。ありがとう。', en: "…You'd stay up with me. Thank you." }] },
      ] },
    8: { scene: 'fan_room', stage: true, lines: [   // the stage here = the last rehearsal of chapter 4's song
        ['gift', { zh: '这个……送给你。是我自己挑的帽子。……不许笑。', ja: 'これ…あげる。わたしが選んだぼうし。…笑わないでね。', en: "This… is for you. I picked the hat myself. …Don't laugh." }],
        ['front', { zh: '八周，一下子就过去了。四首歌，都是和你一起练出来的。', ja: '8週間、あっというまだったね。4曲ぜんぶ、きみといっしょに練習した歌だよ。', en: 'Eight weeks went by in a blink. All four songs — we practised every one together.' }],
        ['front', { zh: '出发之前，再陪我彩排一次「窗边的雪」吧。', ja: '出発のまえに、もう一回だけ「まどべの ゆき」のリハーサル、つきあって。', en: 'Before we go, rehearse "Snow by the Window" with me one more time.' }],
      ], after: [
        ['earR', { zh: '今晚，把四首都唱给你听。最后一首，是我们最拿手的那一首。', ja: '今夜は4曲ぜんぶ、きみに歌うね。さいごの1曲は、ふたりのいちばん得意な歌。', en: "Tonight I'll sing all four for you. The last one is the song we're best at." }, 'R'],
        ['wave', { zh: '我出发了——在最前面等我！', ja: 'いってきます——いちばん前で待ってて！', en: "I'm off — wait for me in the front row!" }],
      ] },
  };

  const SONGS = {
    q1: { type: { zh: '闪耀偶像', ja: 'きらきらアイドル', en: 'Sparkling Idol' }, song: { zh: '闪闪的冰与火', ja: 'きらきら こおりとほのお', en: 'Sparkling Ice & Fire' }, short: { zh: '冰与火', ja: 'こおりとほのお', en: 'Ice & Fire' } },
    q2: { type: { zh: '暴风摇滚', ja: 'あらしのロック', en: 'Storm Rocker' }, song: { zh: '风暴之心', ja: 'ストーム・ハート', en: 'Storm Heart' }, short: { zh: '风暴之心', ja: 'ストーム', en: 'Storm' } },
    q3: { type: { zh: '雪夜抒情', ja: '雪夜のバラード', en: 'Snow-night Balladeer' }, song: { zh: '窗边的雪', ja: 'まどべの ゆき', en: 'Snow by the Window' }, short: { zh: '窗边的雪', ja: 'まどべのゆき', en: 'Snow' } },
    q4: { type: { zh: '夏夜祭典', ja: '夏まつりの歌姫', en: 'Summer-festival Diva' }, song: { zh: '夏宵祭', ja: 'なつよい まつり', en: 'Summer Night Festival' }, short: { zh: '夏宵祭', ja: 'なつまつり', en: 'Festival' } },
  };
  const RANKS = {
    S: { min: 245, title: { zh: '传说的歌姬', ja: '伝説の歌姫', en: 'Legendary Diva' }, fans: 6 },
    A: { min: 215, title: { zh: '人气歌姬', ja: '人気の歌姫', en: 'Star Diva' }, fans: 4 },
    B: { min: 180, title: { zh: '闪亮新星', ja: 'かがやく新星', en: 'Rising Star' }, fans: 2.5 },
    C: { min: 0, title: { zh: '明日之星', ja: 'あしたの星', en: "Tomorrow's Star" }, fans: 1.5 },
  };
  const ENDING = {
    S: [['bust', { zh: '……你听见了吗？全场都在喊我的名字。', ja: '…聞こえた？みんなが、わたしの名前を呼んでる。', en: '…Did you hear that? The whole hall is calling my name.' }], ['bust', { zh: '是你把我带到这里的。谢谢你，制作人。', ja: 'ここまで連れてきてくれたのは、きみだよ。ありがとう、プロデューサーさん。', en: 'You brought me here. Thank you, Producer.' }]],
    A: [['bust', { zh: '成功了……！我、我没有哭哦。', ja: 'やった…！な、泣いてないよ。', en: 'We did it…! I-I\'m not crying.' }], ['bust', { zh: '下一次，要在更大的舞台。还请多关照。', ja: 'つぎは、もっと大きいステージで。これからもよろしくね。', en: 'Next time, a bigger stage. Stay with me, okay?' }]],
    B: [['bust', { zh: '有几个地方失误了……但是，好开心。', ja: 'ちょっとミスしちゃった…でも、たのしかった。', en: 'I slipped in a few places… but it was so much fun.' }], ['bust', { zh: '我还能变得更好。再陪我练练吧。', ja: 'もっとうまくなれる。また、いっしょに練習してね。', en: 'I can get better. Practise with me again.' }]],
    C: [['bust', { zh: '……对不起，没能唱好。', ja: '…ごめんね、うまく歌えなかった。', en: '…I\'m sorry. I couldn\'t sing it well.' }], ['bust', { zh: '可是我不想放弃。再给我八周，好吗？', ja: 'でも、あきらめたくない。もう8週間、くれる？', en: "But I don't want to give up. Give me eight more weeks?" }]],
    secret: [['bust', { zh: '……还有一首安可，不在节目单上。', ja: '…アンコールが、もうひとつ。セットリストにはないやつ。', en: '…One more encore. Not on the set list.' }, 'L'], ['bust', { zh: '只唱给你一个人听。——最喜欢你了。', ja: 'きみだけに歌うね。——だいすき。', en: 'Only for you. — I love you so much.' }, 'R']],
  };
  const SECRET = { bond: 60, title: { zh: '只属于你的歌姬', ja: 'きみだけの歌姫', en: 'Your One and Only Diva' } };

  const UI = {
    kicker: { zh: 'MoHeat Evo · 养成', ja: 'MoHeat Evo · 育成', en: 'MoHeat Evo · raising sim' },
    title: { zh: '歌姬养成日记', ja: '歌姫プロデュース', en: 'Diva Diary' },
    sub: { zh: '绫音的八周', ja: 'あやねの 8 週間', en: "Ayane's 8 Weeks" },
    start: { zh: '开始', ja: 'はじめる', en: 'Start' }, cont: { zh: '继续（第 {w} 周）', ja: 'つづきから（{w} 週目）', en: 'Continue (week {w})' },
    fine: { zh: '画面两侧的橙 / 蓝 = 左右耳的暖 / 凉。连接 MoHeat Evo 耳机可以真的感觉到。', ja: '画面の左右のオレンジ / 青 = 左右の耳のあたたかさ / つめたさ。MoHeat Evo をつなぐと本当に感じられます。', en: 'Orange / blue at the screen edges = warm / cool on your left and right ear. Connect MoHeat Evo to really feel it.' },
    ayane: { zh: '绫音', ja: '綾音', en: 'Ayane' },
    week: { zh: '第 {w} / 8 周', ja: '{w} / 8 週目', en: 'Week {w} / 8' },
    plan: { zh: '这一周做什么？', ja: '今週の予定は？', en: 'What shall we do this week?' },
    stamAfter: { zh: '体力 {a} → {b}', ja: '体力 {a} → {b}', en: 'Energy {a} → {b}' },
    planHint: { zh: '选 3 项', ja: '3 つえらぶ', en: 'Pick 3' },
    go: { zh: '出发', ja: 'スタート', en: 'Go' }, slot: { zh: '空', ja: '—', en: '—' },
    tired: { zh: '太累了，改为休息', ja: 'つかれすぎ → 休み', en: 'Too tired → rest' },
    chapter: { zh: '第 {n} 章 · {t}', ja: '第 {n} 章 · {t}', en: 'Chapter {n} · {t}' }, chapterSong: { zh: '这两周练习「{s}」。', ja: 'この2週間は「{s}」を練習します。', en: 'These two weeks: practising "{s}".' },
    practice: { zh: '{a} · 练习', ja: '{a} · れんしゅう', en: '{a} · practice' },
    lessonResult: { zh: '完成度 {p}%　练习效果 ×{m}', ja: '達成度 {p}%　レッスン効果 ×{m}', en: 'Accuracy {p}%   training effect ×{m}' }, stageKicker: { zh: '小舞台 · 第 {n} 章', ja: 'ミニステージ · 第 {n} 章', en: 'Small stage · chapter {n}' },
    stageFans: { zh: '小舞台成功！粉丝 +{n}', ja: 'ミニステージ成功！ファン +{n}', en: 'Small stage done! Fans +{n}' },
    medley: { zh: '个人演唱会 · 第 {i} / 4 首', ja: 'ソロライブ · {i} / 4 曲目', en: 'Solo concert · song {i} of 4' }, mainSong: { zh: '个人演唱会 · 主打歌', ja: 'ソロライブ · メイン曲', en: 'Solo concert · main song' },
    mastery: { zh: '歌曲熟练度', ja: '歌のじゅくれん度', en: 'How well she knows each song' },
    liveResult: { zh: '演出完成度 {p}% · 最大连击 {c}', ja: 'ライブ達成度 {p}% · 最大コンボ {c}', en: 'Show {p}% · max combo {c}' }, cardLive: { zh: '演出完成度 {p}%', ja: 'ライブ達成度 {p}%', en: 'Show {p}%' },
    save: { zh: '保存结果图', ja: '結果を保存', en: 'Save card' }, again: { zh: '再养一次', ja: 'もう一度', en: 'Play again' },
    cardLine: { zh: '我培养出了', ja: 'わたしが育てたのは', en: 'I raised a' }, cardSong: { zh: '演唱曲', ja: '歌った曲', en: 'Song' },
  };

  // ---------------------------------------------------------------- rules (pure)
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const CAP = { vocal: 100, dance: 100, charm: 100, stamina: 100, mood: 100, bond: 100, m_q1: 100, m_q2: 100, m_q3: 100, m_q4: 100 };
  function add(s, fx) { const d = {}; for (const [k, v] of Object.entries(fx || {})) { const before = s[k]; s[k] = k in CAP ? clamp(s[k] + v, 0, CAP[k]) : k === 'fans' ? Math.max(0, Math.round(s[k] + v)) : s[k] + v; d[k] = s[k] - before; } return d; }
  const TAPMUL = { perfect: 1.3, good: 1.05, miss: .75 };
  /** One activity. grade: 'perfect' | 'good' | 'miss' (how the rhythm part / ring game went; 'good' when there is none). Returns { tired, delta } and changes s. */
  function act(s, a, grade = 'good') {
    if (a.flat.stamina < 0 && s.stamina + a.flat.stamina < 0) return { tired: true, delta: add(s, { stamina: 30, mood: -8 }) };
    const mul = (.75 + s.mood / 100 * .5) * (a.lesson || a.gig || a.tap ? TAPMUL[grade] : 1);
    const fx = { ...a.flat }; for (const [k, v] of Object.entries(a.gain)) fx[k] = Math.max(1, Math.round(v * mul));
    if (a.fans) fx.fans = Math.round((s.vocal + s.dance + s.charm) * 1.6 * (a.fans === true ? 1 : a.fans) * mul);
    return { tired: false, delta: add(s, fx) };
  }
  const chapterOf = (week) => clamp(Math.floor((week - 1) / 2), 0, CHAPTERS.length - 1);
  /** The song a gig plays in this week: the newest one that has already been on a small stage (week 1–2: the first song). */
  const gigSong = (week) => CHAPTERS[Math.max(0, chapterOf(week) - 1)].song;
  /** Practising a song: acc 0..1 from the rhythm part (null = skipped). kind: 'lesson' | 'gig' | 'stage'. Returns the change of m_<q>. */
  const PRACTICE = { lesson: 15, gig: 8, stage: 22 };
  const practise = (s, q, acc, kind) => add(s, { ['m_' + q]: Math.round(PRACTICE[kind] * (acc == null ? .25 : .35 + .65 * acc)) })['m_' + q];
  /** The main song of the concert: the one she knows best (a tie goes to the later chapter). */
  const mainSong = (s) => CHAPTERS.map((c) => c.song).reduce((best, q) => (s['m_' + q] >= s['m_' + best] ? q : best));
  const stageFans = (s, acc) => Math.round((s.vocal + s.dance + s.charm) * 4 * (.75 + s.mood / 200) * (acc == null ? .6 : .6 + acc * .8));
  const score = (s) => Math.round(s.vocal + s.dance + s.charm + s.bond * .25 + (s.mood - 50) * .2);
  // bonus = points from how well the concert was played (liveBonus)
  const rank = (s, bonus = 0) => { const v = score(s) + bonus; return ['S', 'A', 'B', 'C'].find((r) => v >= RANKS[r].min); };
  const secret = (s, bonus = 0) => s.bond >= SECRET.bond && ['S', 'A'].includes(rank(s, bonus));
  /** Concert accuracy 0..1 → points: 75 % changes nothing, a perfect show +25, a poor one down to −25. */
  const liveBonus = (acc) => Math.round(clamp((acc - .75) * 100, -25, 25));
  /** Timing windows in the rhythm parts: 1 at the start, up to 1.35 after eight good weeks. */
  const leniency = (s) => clamp(.95 + (s.vocal + s.dance + s.charm) / 600, 1, 1.35);

  /** Every line Ayane speaks: [{ id, text, ear }]. Ids: e<week>_<n> · e<week>_c<choice> · e<week>_a<n> (after the stage) · act_<activity> · tired · end_<rank>_<n>. */
  function lines() {
    const out = [], put = (id, l) => out.push({ id, text: l[1], ear: l[2] || null });
    for (const [n, ev] of Object.entries(EVENTS)) { ev.lines.forEach((l, i) => put(`e${n}_${i}`, l)); (ev.choices || []).forEach((c, j) => put(`e${n}_c${j}`, c.re)); (ev.after || []).forEach((l, i) => put(`e${n}_a${i}`, l)); }
    for (const a of ACTS) out.push({ id: `act_${a.id}`, text: a.line, ear: null });
    out.push({ id: 'tired', text: TIRED, ear: null });
    for (const [r, ls] of Object.entries(ENDING)) ls.forEach((l, i) => put(`end_${r}_${i}`, l));
    return out;
  }

  root.DP_GAME = { WEEKS, SLOTS, START, STATS, CHAPTERS, SCENES, ACTS, TIRED, EVENTS, SONGS, RANKS, ENDING, SECRET, UI,
    lines, TAPMUL, rules: { add, act, chapterOf, gigSong, practise, mainSong, stageFans, score, rank, secret, liveBonus, leniency } };
})(typeof window !== 'undefined' ? window : globalThis);
