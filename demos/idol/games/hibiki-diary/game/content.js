// Prince Diary (Hibiki, 2026-11-14) — all content and rules as data (same rules and balance as diva-diary; story written for Hibiki). Texts: { zh, ja, en } (Korean: l10n.ko.js). No DOM in this file (tools/sim.js runs the rules in node).
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
    { song: 'q4', name: { zh: '春日', ja: '春', en: 'Spring' } },
    { song: 'q2', name: { zh: '风暴', ja: 'あらし', en: 'Storm' } },
    { song: 'q3', name: { zh: '心声', ja: 'こころの声', en: 'His Own Words' } },
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


  const ACTS = [
    { id: 'vocal', lesson: true, scene: 'music_hall', pose: 'vocal', gain: { vocal: 8 }, flat: { stamina: -14 },
      name: { zh: '声乐课', ja: 'ボイトレ', en: 'Voice lesson' }, hint: { zh: '歌唱↑ 体力-14', ja: 'うた↑ 体力-14', en: 'Vocal↑ −14' },
      line: { zh: '♪……刚才那个高音，传到你耳朵里了吗？', ja: '♪…いまの高い音、君の耳まで届いた？', en: '♪… Did that high note reach your ears?' } },
    { id: 'dance', lesson: true, scene: 'rehearsal', pose: 'dance', gain: { dance: 8 }, flat: { stamina: -18 },
      name: { zh: '舞蹈课', ja: 'ダンス', en: 'Dance lesson' }, hint: { zh: '舞蹈↑ 体力-18', ja: 'ダンス↑ 体力-18', en: 'Dance↑ −18' },
      line: { zh: '一、二……转身。呵呵，看呆了？', ja: 'ワン、ツー…ターン。ふふ、見とれてた？', en: 'One, two… turn. Heh, were you staring?' } },
    { id: 'acting', scene: 'fan_room', pose: 'peace', tap: true, gain: { charm: 7 }, flat: { stamina: -9 },
      name: { zh: '表情练习', ja: '表情レッスン', en: 'Smile practice' }, hint: { zh: '魅力↑ 体力-9', ja: 'みりょく↑ 体力-9', en: 'Charm↑ −9' },
      line: { zh: '镜头在这边？……那我只对你笑哦。', ja: 'カメラはこっち？…じゃあ、君だけに笑うね。', en: "Camera's over here? …Then I'll smile just for you." } },
    { id: 'band', scene: 'rooftop', pose: 'guitar', tap: true, gain: { vocal: 4, dance: 4 }, flat: { stamina: -16, mood: 3 },
      name: { zh: '乐队合练', ja: 'バンド練習', en: 'Band session' }, hint: { zh: '歌唱舞蹈↑ 心情↑', ja: 'うた・ダンス↑ きぶん↑', en: 'Vocal+Dance↑ Mood↑' },
      line: { zh: '吉他再大声一点。连雷声也不会输。', ja: 'ギター、もっと鳴らそう。かみなりにも負けないよ。', en: "Let's make the guitar louder. I won't lose to the thunder." } },
    { id: 'write', scene: 'attic', pose: 'write', gain: { vocal: 5, charm: 4 }, flat: { stamina: -8, mood: -3 },
      name: { zh: '深夜写歌', ja: '夜の作詞', en: 'Night writing' }, hint: { zh: '歌唱魅力↑ 心情↓', ja: 'うた・みりょく↑ きぶん↓', en: 'Vocal+Charm↑ Mood↓' },
      line: { zh: '……数着星星，写出了一行。是关于你的。', ja: '…星を数えてたら、一行できた。君のこと、だけど。', en: "…I was counting stars and wrote a line. It's about you, though." } },
    { id: 'street', gig: true, scene: 'seaside', pose: 'street', gain: { charm: 3 }, flat: { stamina: -14 }, fans: true,
      name: { zh: '海边路演', ja: '海辺ライブ', en: 'Seaside gig' }, hint: { zh: '粉丝↑↑ 体力-14', ja: 'ファン↑↑ 体力-14', en: 'Fans↑↑ −14' },
      line: { zh: '大家，谢谢你们来！一直陪我到最后哦！', ja: 'みんな、来てくれてありがとう！さいごまで一緒にいてね！', en: 'Thank you all for coming! Stay with me till the end!' } },
    { id: 'radio', scene: 'radio', pose: 'radio', gain: { charm: 4 }, flat: { stamina: -6 }, fans: .5,
      name: { zh: '电台嘉宾', ja: 'ラジオ出演', en: 'Radio guest' }, hint: { zh: '魅力↑ 粉丝↑', ja: 'みりょく↑ ファン↑', en: 'Charm↑ Fans↑' },
      line: { zh: '晚上好，我是响。……这个声音，到你耳边了吗？', ja: 'こんばんは、響です。…この声、君の耳元に届いてる？', en: 'Good evening, this is Hibiki. …Is my voice reaching your ear?' } },
    { id: 'rest', scene: 'cafe', pose: 'drink', gain: {}, flat: { stamina: 42, mood: 8 },
      name: { zh: '咖啡店休息', ja: 'カフェで休む', en: 'Café break' }, hint: { zh: '体力+42 心情↑', ja: '体力+42 きぶん↑', en: 'Energy +42 Mood↑' },
      line: { zh: '给，冰苏打。贴在脸上……凉凉的吧？', ja: 'はい、つめたいソーダ。ほっぺに当てると…ひんやりするでしょ？', en: 'Here, an ice-cold soda. On your cheek… chilly, right?' }, cold: 'R' },
    { id: 'outing', scene: 'riverside', pose: 'rose', gain: {}, flat: { stamina: 12, mood: 12, bond: 8 },
      name: { zh: '河边散步', ja: '川べりさんぽ', en: 'Riverside walk' }, hint: { zh: '亲密↑ 心情↑', ja: 'きずな↑ きぶん↑', en: 'Bond↑ Mood↑' },
      line: { zh: '今天不谈工作。……这朵玫瑰，我觉得很适合你。', ja: '今日はお仕事の話なし。…このバラ、君に似合うと思って。', en: 'No work talk today. …I thought this rose suits you.' } },
  ];

  const TIRED = { zh: '……抱歉，让我休息一下。本来想在你面前帅一点的。', ja: '…ごめん、少しだけ休ませて。君の前では、かっこつけたかったんだけど。', en: '…Sorry, let me rest a little. I wanted to look cool in front of you.' };

  const EVENTS = {
    0: { scene: 'fan_room', lines: [
        ['wave', { zh: '初次见面，制作人。我是响。从今天起请多关照。', ja: 'はじめまして、プロデューサーさん。響です。今日からよろしくね。', en: "Nice to meet you, Producer. I'm Hibiki. I'm in your hands from today." }],
        ['front', { zh: '八周之后，是我的第一场个人演唱会。', ja: '8週間後に、僕のはじめてのソロライブがあるんだ。', en: 'Eight weeks from now is my very first solo concert.' }],
        ['front', { zh: '一共四首歌，每两周练一首。哪一首当主打……就看你和我了。', ja: '歌は4曲。2週間に1曲ずつ。どれがメインになるかは…君と僕しだい、かな。', en: 'Four songs, one every two weeks. Which becomes the main song… is up to you and me.' }],
        ['earL', { zh: '……呐。要好好地，只看着我哦？', ja: '…ねえ。ちゃんと、僕だけを見ててね？', en: '…Hey. Keep your eyes on me — only me, okay?' }, 'L'],
      ] },
    // ---- chapter 1 · Debut · Starfall Parade
    1: { scene: 'rehearsal', lines: [
        ['front', { zh: '「星落游行」……副歌伸手的那一段，我还是觉得够不到。', ja: '「ほしふる パレード」…サビで手を伸ばすところ、まだ遠く感じるんだ。', en: '"Starfall Parade"… the part where I reach out in the chorus still feels far away.' }],
        ['front', { zh: '大家都回去了呢。制作人，你觉得该怎么办？', ja: 'みんな帰っちゃったね。プロデューサーさん、どうしたらいいと思う？', en: "Everyone's gone home. Producer, what do you think I should do?" }],
      ], choices: [
        { t: { zh: '我陪你，再来一次', ja: 'つきあうよ、もう一回', en: "I'll stay. Once more" }, fx: { dance: 4, bond: 4, stamina: -8, m_q1: 6 }, re: ['hands', { zh: '……够到了。感觉够到你的手了。', ja: '…届いた。君の手まで、届いた気がする。', en: '…I reached it. It felt like I reached your hand.' }] },
        { t: { zh: '今天到这里，明天会更好', ja: '今日はここまで。明日はもっとできる', en: 'Enough for today. Tomorrow will be better' }, fx: { stamina: 12, mood: 8, bond: 2 }, re: ['front', { zh: '……嗯。谢谢你没让我硬撑。你真温柔。', ja: '…うん。むりさせないでくれて、ありがとう。君って優しいね。', en: "…Okay. Thanks for not letting me push too hard. You're kind." }] },
      ] },
    2: { scene: 'fan_room', stage: true, lines: [
        ['front', { zh: '今天是事务所的小公演。第一次在别人面前唱这首歌。', ja: '今日は事務所のミニライブ。この歌を人の前で歌うの、はじめてなんだ。', en: "Today's the little show at the office — my first time singing this song for an audience." }],
        ['earR', { zh: '……手有点凉。制作人，能帮我暖一暖吗？', ja: '…手、少しつめたい。プロデューサーさん、あたためてくれる？', en: '…My hands are a little cold. Producer, will you warm them?' }, 'R'],
      ], choices: [
        { t: { zh: '握住他的手', ja: '手をにぎる', en: 'Take his hand' }, fx: { mood: 10, bond: 4 }, re: ['hands', { zh: '……好暖。好，我去了。', ja: '…あったかい。よし、行ってくるね。', en: '…Warm. Okay, here I go.' }] },
        { t: { zh: '就像练习时那样', ja: '練習どおりにね', en: 'Just like in practice' }, fx: { vocal: 2, dance: 2, m_q1: 4 }, re: ['front', { zh: '像练习时那样……嗯。深呼吸。', ja: '練習どおり…うん。しんこきゅう。', en: 'Like practice… right. Deep breath.' }] },
      ], after: [
        ['peace', { zh: '听见掌声了吗？……谢谢我的第一位粉丝。', ja: '拍手、聞こえた？…いちばん最初のファンに、ありがとう。', en: 'Did you hear the applause? …Thank you, my very first fan.' }],
      ] },
    // ---- chapter 2 · Spring · The Sunny Bench
    3: { scene: 'cafe', lines: [
        ['drink', { zh: '下一首是「向阳的长椅」。是在春天的公园里慢慢唱的歌。', ja: 'つぎの歌は「ひだまりの ベンチ」。春の公園で、ゆっくり歌う歌なんだ。', en: 'Next is "The Sunny Bench" — a slow song for a park in spring.' }],
        ['drink', { zh: '给，冰柠檬水。……脸颊凉了一下吧？', ja: 'はい、つめたいレモネード。…ほっぺ、ひやっとした？', en: 'Here, a cold lemonade. …Did your cheek feel that?' }, null, { Rc: .85 }],
      ], choices: [
        { t: { zh: '一起去公园走走', ja: 'いっしょに公園を歩こう', en: "Let's walk in the park together" }, fx: { bond: 6, mood: 6 }, re: ['rose', { zh: '……那这朵花送给你。像约会一样呢。', ja: '…じゃあ、この花をどうぞ。デートみたい、だね。', en: "…Then this flower is for you. Feels like a date, doesn't it?" }] },
        { t: { zh: '舞台上也用这个笑容', ja: 'ステージでもその笑顔で', en: 'Bring that smile to the stage' }, fx: { charm: 4, m_q4: 6 }, re: ['peace', { zh: '明白。只要想着你在看，我就能自然地笑。', ja: '了解。君が見てるって思えば、自然に笑えるよ。', en: 'Got it. If I think of you watching, the smile comes on its own.' }] },
      ] },
    4: { scene: 'riverside', stage: true, lines: [
        ['front', { zh: '河边来了这么多人……春风好舒服。', ja: '川べりに、こんなにたくさん来てくれた…春の風、気持ちいいね。', en: 'So many people came to the riverside… The spring breeze feels nice.' }],
        ['earR', { zh: '……有一点紧张。制作人，跟我说句话吧。', ja: '…少しだけ緊張してる。プロデューサーさん、なにか言って。', en: "…I'm a little nervous. Producer, say something." }, 'R'],
      ], choices: [
        { t: { zh: '你一定可以', ja: '君ならできる', en: 'You can do this' }, fx: { mood: 12, bond: 3 }, re: ['hands', { zh: '……嗯。看着我哦。', ja: '…うん。見ててね。', en: '…Mm. Watch me.' }] },
        { t: { zh: '我在最前面看着你', ja: 'いちばん前で見てるよ', en: "I'll be watching from the front row" }, fx: { bond: 7, mood: 6 }, re: ['earR', { zh: '……那我只唱给你听。', ja: '…じゃあ、君にだけ歌うね。', en: "…Then I'll sing just for you." }, 'R'] },
      ], after: [
        ['drink', { zh: '呼……唱完了！给，冰汽水。贴脸上……怎么样？', ja: 'ふう…歌えた！はい、つめたいラムネ。ほっぺに…どう？', en: "Phew… I made it! Here, a cold soda. On your cheek… how's that?" }, null, { Rc: .9 }],
      ] },
    // ---- chapter 3 · Storm · Crown of Ice
    5: { scene: 'radio', lines: [
        ['front', { zh: '……今天电台的人说，“响只会演王子吧”。', ja: '…今日ラジオで言われたんだ。「響は王子様キャラだけでしょ」って。', en: '…On the radio today they said, "Hibiki\'s just the prince type, right?"' }],
        ['front', { zh: '有点不甘心。下一首「冰之王冠」，我想唱得很有力。……不适合我吗？', ja: 'くやしいな。つぎの「こおりの おうかん」は、強く歌いたい。…似合わないかな？', en: 'It stings. I want to sing the next one, "Crown of Ice", with real strength. …Doesn\'t that suit me?' }],
      ], choices: [
        { t: { zh: '一点也不，我想看', ja: 'ぜんぜん。見たいよ', en: 'Not at all. I want to see it' }, fx: { mood: 8, bond: 3, m_q2: 8 }, re: ['hands', { zh: '……真的？那我就连王冠一起打碎地去唱。', ja: '…ほんと？じゃあ、王冠ごとこわすくらいで行くよ。', en: "…Really? Then I'll go at it hard enough to break the crown." }] },
        { t: { zh: '温柔也是你的武器', ja: 'やさしさも、君の武器だよ', en: 'Gentleness is your weapon too' }, fx: { charm: 4, bond: 2, m_q1: 4 }, re: ['front', { zh: '……谢谢。可是，两样我都想给你看。', ja: '…ありがとう。でも、どっちも見せたいんだ。', en: '…Thank you. But I want to show you both.' }] },
      ] },
    6: { scene: 'rooftop', stage: true, lines: [
        ['front', { zh: '暴风雨要来了。……正好。', ja: 'あらしが来るね。…ちょうどいい。', en: "A storm's coming. …Perfect timing." }],
        ['earL', { zh: '再靠近一点。今天的我，可能有点坏哦。', ja: 'もっと近くにおいで。今日の僕は、ちょっと意地悪かもよ。', en: 'Come closer. I might be a little wicked today.' }, 'L'],
      ], choices: [
        { t: { zh: '让我看看', ja: '見せて', en: 'Show me' }, fx: { bond: 4, mood: 6 }, re: ['front', { zh: '那就别移开视线。', ja: 'じゃあ、目をそらさないで。', en: "Then don't look away." }] },
        { t: { zh: '淋湿了会感冒的', ja: 'ぬれたら風邪ひくよ', en: "You'll catch a cold in the rain" }, fx: { stamina: 8, bond: 2 }, re: ['hands', { zh: '你在担心我啊。……唱完以后，让我进你的伞。', ja: '心配してくれるんだ。…歌い終わったら、傘に入れて。', en: "You're worried about me. …After the song, let me under your umbrella." }] },
      ], after: [
        ['hands', { zh: '哈……哈……听见雷声了吗？是我的声音更大吧。', ja: 'はあ…はあ…かみなり、聞こえた？僕の声のほうが大きかったでしょ。', en: 'Hah… hah… Did you hear the thunder? My voice was louder, right?' }],
      ] },
    // ---- chapter 4 · His Own Words · Snowlight
    7: { scene: 'attic', lines: [
        ['front', { zh: '……睡不着。还有一周。', ja: '…ねむれないんだ。あと1週間。', en: "…I can't sleep. One week left." }],
        ['write', { zh: '最后一首「雪光」，歌词是我自己写的。', ja: 'さいごの歌「ゆきあかり」は、僕が歌詞を書いたんだ。', en: 'The last song, "Snowlight" — I wrote the words myself.' }],
        ['earL', { zh: '……写的是一直在身边照亮我的人。你知道是谁吧。', ja: '…ずっと隣で照らしてくれた人のこと。だれのことか、わかるよね。', en: '…It\'s about someone who has lit my way, right beside me. You know who.' }, 'L'],
      ], choices: [
        { t: { zh: '握住他的手', ja: '手をにぎる', en: 'Take his hands' }, fx: { bond: 7, mood: 10, m_q3: 6 }, re: ['hands', { zh: '……好暖。嗯，已经没事了。', ja: '…あったかい。うん、もう大丈夫。', en: "…Warm. Yeah, I'm alright now." }] },
        { t: { zh: '那就练到安心为止', ja: '安心できるまで、練習しよう', en: 'Then we practise until you feel sure' }, fx: { vocal: 3, dance: 3, stamina: -10, bond: 2, m_q3: 8 }, re: ['front', { zh: '……你要陪我熬夜啊。谢谢。', ja: '…夜ふかしにつきあってくれるんだ。ありがとう。', en: "…You'd stay up with me. Thank you." }] },
      ] },
    8: { scene: 'fan_room', stage: true, lines: [   // the stage here = the last rehearsal of chapter 4's song
        ['rose', { zh: '这个……给你。是我挑的玫瑰。……不许笑哦。', ja: 'これ…君に。僕がえらんだバラ。…笑わないでね。', en: "This… is for you. A rose I chose myself. …Don't laugh." }],
        ['front', { zh: '八周一下子就过去了。四首歌，全都是和你一起完成的。', ja: '8週間、あっというまだったね。4曲ぜんぶ、君といっしょに作った歌だよ。', en: 'Eight weeks flew by. All four songs — we made every one together.' }],
        ['front', { zh: '出发之前，再陪我彩排一次「雪光」吧。', ja: '出発のまえに、もう一回だけ「ゆきあかり」のリハ、つきあって。', en: 'Before we go, rehearse "Snowlight" with me one more time.' }],
      ], after: [
        ['earR', { zh: '今晚，四首都唱给你听。最后一首，是我们最拿手的那一首。', ja: '今夜は4曲ぜんぶ、君に歌うよ。さいごの1曲は、ふたりのいちばん得意な歌。', en: "Tonight I'll sing all four for you. The last one is the song we're best at." }, 'R'],
        ['wave', { zh: '我出发了。在最前面等我哦，制作人。', ja: '行ってきます。いちばん前で待っててね、プロデューサーさん。', en: "I'm off. Wait for me in the front row, Producer." }],
      ] },
  };

  const SONGS = {
    q1: { type: { zh: '星落王子', ja: '星降る王子', en: 'Starfall Prince' }, song: { zh: '星落游行', ja: 'ほしふる パレード', en: 'Starfall Parade' }, short: { zh: '星落游行', ja: 'パレード', en: 'Parade' } },
    q2: { type: { zh: '冰之叛逆者', ja: '氷の反逆者', en: 'Rebel of Ice' }, song: { zh: '冰之王冠', ja: 'こおりの おうかん', en: 'Crown of Ice' }, short: { zh: '冰之王冠', ja: 'おうかん', en: 'Crown' } },
    q3: { type: { zh: '雪光诗人', ja: '雪あかりの詩人', en: 'Snowlight Poet' }, song: { zh: '雪光', ja: 'ゆきあかり', en: 'Snowlight' }, short: { zh: '雪光', ja: 'ゆきあかり', en: 'Snowlight' } },
    q4: { type: { zh: '春日王子', ja: 'ひだまりの王子', en: 'Spring-sun Prince' }, song: { zh: '向阳的长椅', ja: 'ひだまりの ベンチ', en: 'The Sunny Bench' }, short: { zh: '长椅', ja: 'ベンチ', en: 'Bench' } },
  };
  const RANKS = {
    S: { min: 245, title: { zh: '传说的王子', ja: '伝説の王子', en: 'Legendary Prince' }, fans: 6 },
    A: { min: 215, title: { zh: '人气王子', ja: '人気の王子', en: 'Star Prince' }, fans: 4 },
    B: { min: 180, title: { zh: '闪亮新星', ja: 'かがやく新星', en: 'Rising Star' }, fans: 2.5 },
    C: { min: 0, title: { zh: '明日之星', ja: 'あしたの星', en: "Tomorrow's Star" }, fans: 1.5 },
  };
  const ENDING = {
    S: [['bust', { zh: '……听见了吗？大家在喊我的名字。', ja: '…聞こえる？みんなが、僕の名前を呼んでる。', en: "…Hear that? Everyone's calling my name." }], ['bust', { zh: '带我走到这里的，是你。谢谢你，制作人。', ja: 'ここまで連れてきてくれたのは、君だよ。ありがとう、プロデューサーさん。', en: "You're the one who brought me here. Thank you, Producer." }]],
    A: [['bust', { zh: '成功了……！我、我没哭哦。', ja: 'やった…！な、泣いてないからね。', en: "We did it…! I-I'm not crying." }], ['bust', { zh: '下次，要在更大的舞台。以后也请多关照。', ja: 'つぎは、もっと大きいステージで。これからもよろしくね。', en: 'Next time, a bigger stage. Stay with me, okay?' }]],
    B: [['bust', { zh: '有几个地方失误了……但是，好开心。', ja: 'ちょっとミスしちゃった…でも、楽しかった。', en: 'I slipped a few times… but it was fun.' }], ['bust', { zh: '我还能更好。再陪我练练吧。', ja: 'もっとうまくなれる。また、いっしょに練習しよう。', en: "I can get better. Let's practise together again." }]],
    C: [['bust', { zh: '……对不起，没能唱好。', ja: '…ごめん、うまく歌えなかった。', en: "…Sorry. I couldn't sing it well." }], ['bust', { zh: '可是我不想放弃。再给我八周，好吗？', ja: 'でも、あきらめたくない。もう8週間、僕にくれる？', en: "But I don't want to give up. Will you give me eight more weeks?" }]],
    secret: [['bust', { zh: '……还有一首安可，不在歌单上。', ja: '…アンコールが、もうひとつ。セットリストにはない歌。', en: "…One more encore. A song that isn't on the set list." }, 'L'], ['bust', { zh: '只唱给你一个人听。——我一直都喜欢你。', ja: '君だけに歌うよ。——ずっと、君が好きだった。', en: "I'll sing it only for you. — I've loved you all along." }, 'R']],
  };
  const SECRET = { bond: 60, title: { zh: '只属于你的王子', ja: '君だけの王子さま', en: 'Your One and Only Prince' } };

  const UI = {
    kicker: { zh: 'MoHeat Evo · 养成', ja: 'MoHeat Evo · 育成', en: 'MoHeat Evo · raising sim' },
    title: { zh: '王子养成日记', ja: 'プリンス・プロデュース', en: 'Prince Diary' },
    sub: { zh: '响的八周', ja: 'ひびきの 8 週間', en: "Hibiki's 8 Weeks" },
    start: { zh: '开始', ja: 'はじめる', en: 'Start' }, cont: { zh: '继续（第 {w} 周）', ja: 'つづきから（{w} 週目）', en: 'Continue (week {w})' },
    fine: { zh: '画面两侧的橙 / 蓝 = 左右耳的暖 / 凉。连接 MoHeat Evo 耳机可以真的感觉到。', ja: '画面の左右のオレンジ / 青 = 左右の耳のあたたかさ / つめたさ。MoHeat Evo をつなぐと本当に感じられます。', en: 'Orange / blue at the screen edges = warm / cool on your left and right ear. Connect MoHeat Evo to really feel it.' },
    speaker: { zh: '响', ja: '響', en: 'Hibiki' },
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
