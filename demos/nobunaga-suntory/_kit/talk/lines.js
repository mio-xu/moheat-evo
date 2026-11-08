// The scripted (public) version of 『信長と、語らう』: 5 places × 3 casts (Nobunaga + Ieyasu / Nobunaga only / Ieyasu only), about two
// minutes each. Pure data (the JSON object of window.TALK_SCRIPT, read by scripts/voice.py too). Draft with notes: project/script_scripted.md.
// scenes.<place>.beats: what they say between your turns. line = { id, who: N | I, pos (scenes.js POS), ja (with one [tag]), en, zh, in? } ·
//   { ev: <event of that place in scenes.js> }. in = the casts the line plays in ("NI" both, "N", "I"); without "in" a line plays
//   whenever its speaker is there (so a solo reuses its character's duo lines, plus a few solo-only lines). A beat left without
//   speech for a cast is skipped. ask: 'yn' = a yes / no question (the yes / no bridges come first) · final: the farewell.
// bridges.<who>.<kind>: short lines that acknowledge whatever you said and lead back to the next beat, spoken by whoever opens the
//   next beat. kind = a topic matched by regex over ja / en / zh (leave, no / yes on yes-no beats, then the place's own topics, then
//   the shared ones; first match wins), else generic; silence → silence. scenes.<place>.bridges.<who>.<kind> replaces the shared
//   pool of that kind in that place (e.g. "sake" while they are drinking).
// Audio: media/voice/<id>.m4a (scripts/voice.py, ElevenLabs once — no cost at run time). An id may appear in several places only
//   with the same text (the farewells s21 / byeI).
window.TALK_SCRIPT = {
 "silence_seconds": 9,
 "topics": [
  ["leave", "そろそろ失礼|失礼します|帰ります|帰らな|さようなら|good ?bye|\\bbye\\b|have to go|再见|告辞|走了"],
  ["no", "じゃない|ではない|ません|いいえ|いや|嫌い|苦手|まだ|\\bno\\b|\\bnot\\b|n't|nope|never|不喜欢|不是|不要|不用|没有|不太|不知道"],
  ["yes", "はい|うん|ええ|もちろん|ぜひ|好き|そう|伝わ|有名|知って|\\byes|yeah|yep|sure|of course|\\bok|i do|\\bright\\b|famous|好|是|对|喜欢|嗯|当然|可以|知道|有名"],
  ["tea", "茶|ちゃ|\\btea|matcha"],
  ["sake", "酒|さけ|ビール|ワイン|ウイスキー|sake|beer|wine|whisk|drink|喝酒|啤酒"],
  ["tenka", "天下|戦|いくさ|統一|領地|土地|realm|unif|\\bwar\\b|power|conquer|land|统一|打仗|战|领地|土地"],
  ["warm", "寒|暖|温|火|囲炉裏|エアコン|ストーブ|こたつ|暖房|cold|warm|heat|fire|hearth|冷|暖气|空调|热"],
  ["future", "未来|現代|スマホ|電話|電気|インターネット|ネット|ロボ|車|飛行機|phone|internet|future|electric|\\bcar|plane|robot|\\bai\\b|手机|网络|电|汽车|飞机|现代"],
  ["praise", "ありがと|すご|かっこ|おいし|美味|うま|すばらし|素晴|最高|thank|great|cool|awesome|amazing|delicious|tasty|good|nice|love|谢谢|厉害|好喝|好吃|好棒|帅|棒"]
 ],
 "yn_only": ["yes", "no"],
 "bridges": {
  "N": {
   "generic": [ {"id": "bN_g1", "ja": "[chuckles] ほう、面白きことを申す。…じゃが、", "en": "Heh, you say interesting things. …But,", "zh": "哦，你说的话挺有意思。……不过，"}, {"id": "bN_g2", "ja": "[laughs] はっはっは、それもよい。さて——", "en": "Ha ha ha, that's fine too. Now then—", "zh": "哈哈哈，那也不错。那么——"}, {"id": "bN_g3", "ja": "[curious] ふむ…未来の者は、そう考えるか。", "en": "Hmm… so that's how people of the future think.", "zh": "嗯……未来的人是这么想的啊。"}, {"id": "bN_g4", "ja": "[playful] なるほどのう。覚えておこう。", "en": "I see. I'll remember that.", "zh": "原来如此。我记住了。"}, {"id": "bN_g5", "ja": "[proud] うむ、よう申した。", "en": "Hm, well said.", "zh": "嗯，说得好。"} ],
   "silence": [ {"id": "bN_q1", "ja": "[chuckles] ふっ、照れておるのか。まあよい。", "en": "Heh, feeling shy? Never mind.", "zh": "哼，害羞了吗？算了。"}, {"id": "bN_q2", "ja": "[playful] 黙っておっても、顔に書いてあるわ。", "en": "You may be silent, but it's written all over your face.", "zh": "不说话也没用，都写在脸上了。"} ],
   "yes": [ {"id": "bN_yes", "ja": "[laughs] はっはっは、そうであろう！", "en": "Ha ha ha, I thought so!", "zh": "哈哈哈，我就知道！"} ],
   "no": [ {"id": "bN_no", "ja": "[chuckles] ふっ、正直な奴じゃ。気に入った。", "en": "Heh, an honest one. I like that.", "zh": "哼，真是个老实人。我喜欢。"} ],
   "tea": [ {"id": "bN_tea", "ja": "[proud] 茶の話なら、わしに任せよ。", "en": "When it comes to tea, leave it to me.", "zh": "说到茶，交给我就对了。"} ],
   "tenka": [ {"id": "bN_tenka", "ja": "[proud] 天下か。ふっ、そなたも大きいことを言う。", "en": "The realm, is it? Heh, you think big too.", "zh": "天下吗？哼，你口气也不小。"} ],
   "future": [ {"id": "bN_future", "ja": "[excited] 未来の話か！あとでもっと聞かせよ。", "en": "Tales of the future! Tell me more later.", "zh": "未来的事吗！待会儿多讲给我听。"} ],
   "praise": [ {"id": "bN_praise", "ja": "[laughs] はっはっは！褒めても何も出んぞ。", "en": "Ha ha ha! Flattery won't get you anything.", "zh": "哈哈哈！夸我也没有赏哦。"} ],
   "leave": [ {"id": "bN_leave", "ja": "[surprised] なんじゃ、もう行くのか。", "en": "What, leaving already?", "zh": "什么，这就要走了？"} ],
   "warm": [ {"id": "bN_warm2", "ja": "[playful] ふっ、暑い寒いは、そなたの耳が一番知っておろう。", "en": "Heh, your ears know best what's warm and what's cold.", "zh": "哼，冷暖如何，你的耳朵最清楚。"} ],
   "sake": [ {"id": "bN_sake2", "ja": "[laughs] 酒の話なら、いくらでも付き合うぞ！", "en": "Talk of drink? I'm with you all night!", "zh": "说到酒，我奉陪到底！"} ]
  },
  "I": {
   "generic": [ {"id": "bI_g1", "ja": "[chuckles softly] ほっほっほ、なるほど、なるほど。", "en": "Ho ho ho, I see, I see.", "zh": "呵呵呵，原来如此，原来如此。"}, {"id": "bI_g2", "ja": "[warmly] ふむ、お客人らしいお答えですな。", "en": "Hm, an answer just like our guest.", "zh": "嗯，真像客人会说的话。"}, {"id": "bI_g3", "ja": "[softly] ほう…それは興味深い。さて、", "en": "Oh… how interesting. Now then,", "zh": "哦……真有意思。那么，"}, {"id": "bI_g4", "ja": "[chuckles] これは一本取られましたな。", "en": "You've got me there.", "zh": "这下被你将了一军。"} ],
   "silence": [ {"id": "bI_q1", "ja": "[softly] ほっほっ、ゆっくりで構いませぬぞ。", "en": "Ho ho, take your time.", "zh": "呵呵，慢慢来，不着急。"}, {"id": "bI_q2", "ja": "[warmly] 言葉にせずとも、伝わりますぞ。", "en": "Even unspoken, it comes across.", "zh": "不用说出口，我也明白。"} ],
   "yes": [ {"id": "bI_yes", "ja": "[chuckles softly] ほっほっ、それは何より。", "en": "Ho ho, nothing could be better.", "zh": "呵呵，那再好不过了。"} ],
   "no": [ {"id": "bI_no", "ja": "[softly] ほう、それもまた一つの道。", "en": "Oh, that too is a path.", "zh": "哦，那也是一条路。"} ],
   "tea": [ {"id": "bI_tea", "ja": "[warmly] 茶の湯は、心を静めますからな。", "en": "Tea does calm the heart.", "zh": "茶道能让人心静下来。"} ],
   "tenka": [ {"id": "bI_tenka", "ja": "[serious] 天下のこととなると、それがしも黙ってはおれませぬな。", "en": "When it comes to the realm, even I can't stay quiet.", "zh": "说到天下，在下也没法不吭声了。"} ],
   "warm": [ {"id": "bI_warm", "ja": "[softly] 火のそばは、ありがたいものですな。", "en": "A seat by the fire is a blessing.", "zh": "能待在火边，真是难得。"} ],
   "future": [ {"id": "bI_future", "ja": "[surprised] なんと、四百年後にはそのような…。", "en": "My, four hundred years from now, such things…", "zh": "竟然，四百年后会有那样的……"} ],
   "praise": [ {"id": "bI_praise", "ja": "[chuckles softly] ほっほっ、かたじけない。", "en": "Ho ho, how kind of you.", "zh": "呵呵，不敢当。"} ],
   "leave": [ {"id": "bI_leave", "ja": "[softly] おや、もうお帰りですかな。", "en": "Oh, are you leaving already?", "zh": "哎呀，这就要回去了吗？"} ],
   "sake": [ {"id": "bI_sake2", "ja": "[chuckles softly] ほっほっ、お酒は、ほどほどに。", "en": "Ho ho, drink in moderation.", "zh": "呵呵，喝酒要适量哦。"} ]
  }
 },
 "scenes": {
  "gifu": {
   "topics": [["view", "景色|眺め|川|山|夕日|夕焼け|夕陽|きれい|綺麗|\\bview|river|mountain|sunset|beautiful|风景|景色|河|山|夕阳|漂亮|美"], ["sweet", "金平糖|甘|お菓子|菓子|ケーキ|チョコ|sweet|candy|cake|chocolate|糖|甜|点心|蛋糕|巧克力"]],
   "bridges": {
    "N": {
     "view": [ {"id": "gifu_bN_view", "ja": "[proud] この眺めは、わしの自慢じゃ。", "en": "This view is my pride.", "zh": "这景色，是我的骄傲。"} ],
     "sweet": [ {"id": "gifu_bN_sweet", "ja": "[excited] 甘いものの話か！わしも好物じゃ。", "en": "Sweets! I love them too.", "zh": "说到甜食！我也最爱吃。"} ],
     "sake": [ {"id": "bN_sake", "ja": "[laughs] 酒か！それは後でじっくりじゃ。", "en": "Sake! We'll get to that later, properly.", "zh": "酒啊！那个之后再慢慢来。"} ]
    },
    "I": {
     "view": [ {"id": "gifu_bI_view", "ja": "[softly] ここからの眺めは、格別でござる。", "en": "The view from here is something special.", "zh": "从这里看出去的景色，格外不同。"} ],
     "sweet": [ {"id": "gifu_bI_sweet", "ja": "[chuckles softly] ほっほっ、甘いものはよいものですな。", "en": "Ho ho, sweet things are a fine thing.", "zh": "呵呵，甜的东西真好啊。"} ],
     "warm": [ {"id": "gifu_bI_warm", "ja": "[softly] 山の風が、心地ようござるな。", "en": "The mountain wind feels pleasant.", "zh": "山风吹着真舒服。"} ],
     "sake": [ {"id": "bI_sake", "ja": "[chuckles] 酒の話は、日が暮れてからにしましょうぞ。", "en": "Let's save the sake talk for after dark.", "zh": "酒的事，等天黑了再说吧。"} ]
    }
   },
   "beats": [
    { "ask": "yn", "lines": [
     {"id": "g01", "who": "N", "pos": "seat", "ja": "[excited] おお、来たか、未来の客人！ここが岐阜城の天守じゃ。", "en": "Ah, you've come, guest from the future! This is the keep of Gifu Castle.", "zh": "哦，来了啊，未来的客人！这里就是岐阜城的天守阁。"},
     {"id": "gI01", "who": "I", "pos": "seat", "ja": "[warmly] ようこそ、お客人。ここが信長殿の岐阜城、その天守でござる。", "en": "Welcome, honoured guest. This is the keep of Lord Nobunaga's Gifu Castle.", "zh": "欢迎，客人。这里就是信长大人的岐阜城天守阁。", "in": ["I"]},
     {"id": "g02", "who": "I", "pos": "seat", "ja": "[chuckles softly] ほっほっ。山の上ゆえ、風が強うござるぞ。", "en": "Ho ho. We're on a mountaintop, so the wind is strong.", "zh": "呵呵。在山顶上，风可大着呢。"},
     {"ev": "gust"},
     {"id": "g03", "who": "N", "pos": "right", "ja": "[laughs] はっはっは！この風がよいのじゃ。そなた、高いところは平気か？", "en": "Ha ha ha! This wind is the best part. Are you all right with heights?", "zh": "哈哈哈！就是这风才好。你不怕高吧？"},
     {"id": "gI02", "who": "I", "pos": "right", "ja": "[curious] おお、冷えますな。…お客人、高いところは平気ですかな？", "en": "Oh, it's chilly. …Are you all right with heights, honoured guest?", "zh": "哦，好冷。……客人，你不怕高吧？", "in": ["I"]}
    ] },
    { "lines": [
     {"id": "g04", "who": "N", "pos": "window", "ja": "[proud] 眼下を流れるのが長良川。その先が濃尾の平野じゃ。", "en": "Below runs the Nagara River, and beyond it the Nobi plain.", "zh": "脚下流过的是长良川，再往前就是浓尾平原。"},
     {"id": "gI03", "who": "I", "pos": "window", "ja": "[softly] 下を流れるのが長良川。信長殿は、この地を「岐阜」と名付けられた。", "en": "Below is the Nagara River. Lord Nobunaga named this place \"Gifu\".", "zh": "下面流过的是长良川。信长大人给这里取名为\"岐阜\"。", "in": ["I"]},
     {"id": "g05", "who": "N", "pos": "near", "ja": "[proud] この地の名、「岐阜」は、わしが付けたのじゃ。", "en": "I gave this place its name, \"Gifu\", myself.", "zh": "这里的名字\"岐阜\"，是我取的。"},
     {"id": "g06", "who": "I", "pos": "seat", "ja": "[softly] 周の文王が岐山から天下を治めた故事にちなんで、とか。", "en": "After King Wen of Zhou, who ruled the realm from Mount Qi, they say.", "zh": "据说取自周文王从岐山平定天下的典故。"},
     {"id": "g07", "who": "N", "pos": "left_ear", "ja": "[whispers] …ここから天下を取る。そういう名よ。", "en": "…From here, I take the realm. That is what the name means.", "zh": "……从这里夺取天下。就是这个意思。"},
     {"id": "gI04", "who": "I", "pos": "left_ear", "ja": "[whispers] …ここから天下を取る、というお覚悟の名でござる。", "en": "…A name that says: from here, he will take the realm.", "zh": "……这名字的意思是，要从这里夺取天下。", "in": ["I"]},
     {"id": "g08", "who": "N", "pos": "left", "ja": "[curious] そなたの町は、どんな名じゃ？由来はあるのか？", "en": "And your town? What is it called, and where does the name come from?", "zh": "你住的地方叫什么名字？有什么由来吗？"},
     {"id": "gI05", "who": "I", "pos": "left", "ja": "[curious] お客人の町は、どんな名ですかな？", "en": "And your town, what is it called?", "zh": "客人住的地方叫什么名字呢？", "in": ["I"]}
    ] },
    { "lines": [
     {"id": "g09", "who": "I", "pos": "left", "ja": "[warmly] 西日が暑うござろう。扇であおいで進ぜよう。", "en": "The evening sun is hot, isn't it? Let me fan you.", "zh": "西晒很热吧。我给你扇扇风。"},
     {"id": "gN01", "who": "N", "pos": "left", "ja": "[playful] 西日が暑かろう。ほれ、扇であおいでやる。", "en": "The evening sun is hot, isn't it? Here, I'll fan you.", "zh": "西晒很热吧。来，我给你扇扇。", "in": ["N"]},
     {"ev": "fanL"},
     {"id": "g10", "who": "N", "pos": "left_ear", "ja": "[whispers] …涼しいか？ではもう一つ、教えてやろう。", "en": "…Cooler? Then let me tell you one more thing.", "zh": "……凉快了吧？那我再告诉你一件事。"},
     {"id": "gI06", "who": "I", "pos": "left_ear", "ja": "[whispers] …涼しゅうござろう。信長殿には、内緒ですぞ。", "en": "…Cooler now? Don't tell Lord Nobunaga.", "zh": "……凉快些了吧。别告诉信长大人哦。", "in": ["I"]},
     {"id": "g11", "who": "N", "pos": "near", "ja": "[proud] 「天下布武」。わしの新しい印じゃ。", "en": "\"Tenka Fubu\", the realm under arms. My new seal.", "zh": "\"天下布武\"。这是我新刻的印。"},
     {"id": "gI07", "who": "I", "pos": "seat", "ja": "[softly] 信長殿は「天下布武」の印を作られたばかり。", "en": "Lord Nobunaga has just had a seal made: \"Tenka Fubu\".", "zh": "信长大人刚刻好\"天下布武\"的印。", "in": ["I"]},
     {"id": "g12", "who": "I", "pos": "seat", "ja": "[serious] 武をもって天下を治める…重いお言葉でござる。", "en": "To bring order to the realm by arms… heavy words.", "zh": "以武治天下……真是分量很重的话。"},
     {"id": "g13", "who": "N", "pos": "right", "ja": "[curious] そなたなら、自分の印にどんな四文字を刻む？", "en": "If you had a seal, what four characters would you carve on it?", "zh": "如果是你，会在自己的印上刻哪四个字？"},
     {"id": "gI08", "who": "I", "pos": "right", "ja": "[curious] お客人なら、ご自分の印にどんな言葉を刻みますかな？", "en": "What words would you carve on your own seal, honoured guest?", "zh": "客人会在自己的印上刻什么字呢？", "in": ["I"]}
    ] },
    { "ask": "yn", "lines": [
     {"id": "g14", "who": "N", "pos": "seat", "ja": "[excited] そうじゃ、南蛮の宣教師から、珍しい菓子をもろうた。", "en": "Oh yes, a missionary from the South gave me a rare sweet.", "zh": "对了，南蛮的传教士送了我一种稀罕的点心。"},
     {"id": "gI09", "who": "I", "pos": "seat", "ja": "[warmly] 信長殿から、南蛮渡りの金平糖を預かっておりまする。", "en": "Lord Nobunaga left me some konpeito, a sweet from the South.", "zh": "信长大人托我带了南蛮来的金平糖。", "in": ["I"]},
     {"ev": "gust"},
     {"id": "g15", "who": "N", "pos": "right_ear", "ja": "[whispers] …金平糖じゃ。甘いぞ。ほれ、口を開けい。", "en": "…Konpeito. It's sweet. Here, open your mouth.", "zh": "……金平糖。很甜的。来，张嘴。"},
     {"id": "gI10", "who": "I", "pos": "right_ear", "ja": "[whispers] …ひと粒、どうぞ。甘うござるぞ。", "en": "…Have one. It's sweet.", "zh": "……请尝一颗。很甜哦。", "in": ["I"]},
     {"id": "g16", "who": "I", "pos": "seat", "ja": "[chuckles softly] ほっほっ、殿は甘いものに目がござらぬ。", "en": "Ho ho, my lord has a sweet tooth.", "zh": "呵呵，主公最爱吃甜的了。"},
     {"id": "g17", "who": "N", "pos": "near", "ja": "[playful] 未来の世にも、こういう甘いものはあるのか？", "en": "Do they have sweets like this in the future?", "zh": "未来也有这样的甜食吗？"},
     {"id": "gI11", "who": "I", "pos": "near", "ja": "[curious] 未来の世にも、このような甘いものはありますかな？", "en": "Are there sweets like this in the future?", "zh": "未来也有这样的甜食吗？", "in": ["I"]}
    ] },
    { "ask": "yn", "lines": [
     {"id": "g18", "who": "N", "pos": "window", "ja": "[softly] 日が沈む…。見よ、川に鵜飼の篝火が灯りはじめた。", "en": "The sun is setting… Look, the cormorant-fishing fires are being lit on the river.", "zh": "太阳落山了……看，河上鹈饲的篝火亮起来了。"},
     {"id": "gI12", "who": "I", "pos": "window", "ja": "[softly] 日が沈みます…。川に鵜飼の篝火が灯りはじめましたぞ。", "en": "The sun is going down… The cormorant-fishing fires are being lit on the river.", "zh": "太阳下山了……河上鹈饲的篝火亮起来了。", "in": ["I"]},
     {"id": "g19", "who": "I", "pos": "window", "ja": "[warmly] 今宵は鵜飼見物でござるな。", "en": "Tonight we watch the cormorant fishing, then.", "zh": "今晚要看鹈饲了吧。"},
     {"ev": "gust"},
     {"id": "g20", "who": "N", "pos": "behind", "ja": "[playful] …後ろから失礼。日が落ちると、山風は冷たいぞ。", "en": "…Pardon me, from behind. Once the sun is down, the mountain wind is cold.", "zh": "……失礼，从后面来。太阳一落山，山风就冷了。"},
     {"id": "g21", "who": "N", "pos": "left_ear", "ja": "[whispers] …どうじゃ、この城、気に入ったか？", "en": "…Well? Do you like my castle?", "zh": "……怎么样，喜欢我这座城吗？"},
     {"id": "gI13", "who": "I", "pos": "left_ear", "ja": "[whispers] …山の夜風は冷えまする。この城、お気に召しましたかな？", "en": "…The mountain night wind is cold. Do you like this castle?", "zh": "……山里的夜风很冷。这座城，您还喜欢吗？", "in": ["I"]}
    ] },
    { "final": true, "lines": [
     {"id": "g22", "who": "I", "pos": "seat", "ja": "[warmly] さて、日も暮れました。お客人、足元にお気をつけて。", "en": "Well, the sun is down. Mind your step, honoured guest.", "zh": "好了，天黑了。客人，小心脚下。"},
     {"id": "g23", "who": "N", "pos": "right_ear", "ja": "[whispers] …次は鵜飼の舟に乗せてやる。必ず来い。", "en": "…Next time I'll take you on a cormorant boat. Be sure to come.", "zh": "……下次带你坐鹈饲的船。一定要来。"},
     {"id": "gI14", "who": "I", "pos": "right_ear", "ja": "[whispers] …またお越しくだされ。信長殿も喜びましょう。", "en": "…Please come again. Lord Nobunaga will be glad too.", "zh": "……请再来。信长大人也会高兴的。", "in": ["I"]},
     {"id": "s21", "who": "N", "pos": "seat", "ja": "[laughs] はっはっは！さらばじゃ、未来の客人！", "en": "Ha ha ha! Farewell, guest from the future!", "zh": "哈哈哈！再会了，未来的客人！"},
     {"id": "byeI", "who": "I", "pos": "seat", "ja": "[chuckles softly] ほっほっほ。では、お達者で、お客人。", "en": "Ho ho ho. Farewell then, honoured guest.", "zh": "呵呵呵。那么，多保重，客人。", "in": ["I"]}
    ] }
   ]
  },
  "tea": {
   "topics": [],
   "bridges": {
    "N": {
     "warm": [ {"id": "bN_warm", "ja": "[playful] 寒さ暖かさは、この囲炉裏に聞くのが一番じゃ。", "en": "For cold and warmth, ask this hearth.", "zh": "冷暖的事，问这地炉最清楚。"} ],
     "sake": [ {"id": "bN_sake", "ja": "[laughs] 酒か！それは後でじっくりじゃ。", "en": "Sake! We'll get to that later, properly.", "zh": "酒啊！那个之后再慢慢来。"} ]
    },
    "I": {
     "sake": [ {"id": "bI_sake", "ja": "[chuckles] 酒の話は、日が暮れてからにしましょうぞ。", "en": "Let's save the sake talk for after dark.", "zh": "酒的事，等天黑了再说吧。"} ]
    }
   },
   "beats": [
    { "ask": "yn", "lines": [
     {"id": "tI1", "who": "I", "pos": "seat", "ja": "[warmly] ようこそ、お客人。ちょうど湯が沸いたところでござる。", "en": "Welcome, honoured guest. The water has just come to the boil.", "zh": "欢迎，客人。水正好烧开了。", "in": ["I"]},
     {"id": "s01", "who": "N", "pos": "seat", "ja": "[warmly] おお、来たか、未来の客人。ちょうど湯が沸いたところじゃ。", "en": "Ah, you've come, guest from the future. The water has just come to the boil.", "zh": "哦，来了啊，未来的客人。水正好烧开了。"},
     {"id": "s02", "who": "I", "pos": "seat", "ja": "[chuckles softly] ほっほっほ。外は冷えましたろう。さ、囲炉裏のそばへ。", "en": "Ho ho. It's cold out there, isn't it? Come, sit by the hearth.", "zh": "呵呵呵。外面很冷吧。来，坐到地炉旁边。"},
     {"ev": "fire"},
     {"id": "s03", "who": "N", "pos": "near", "ja": "[curious] して、そなた。茶は好きか？", "en": "So, tell me. Do you like tea?", "zh": "那么，你喜欢喝茶吗？"},
     {"id": "tI2", "who": "I", "pos": "near", "ja": "[curious] お客人は、茶はお好きですかな？", "en": "Do you like tea, honoured guest?", "zh": "客人喜欢喝茶吗？", "in": ["I"]}
    ] },
    { "lines": [
     {"id": "s04", "who": "N", "pos": "right", "ja": "[proud] これを見よ。つくも茄子じゃ。一国にも代えがたい茶入れよ。", "en": "Look at this. Tsukumo-nasu, a tea caddy worth more than a province.", "zh": "看这个。九十九茄子，一国都换不来的茶入。"},
     {"id": "tI3", "who": "I", "pos": "right", "ja": "[proud] こちらは「つくも茄子」。信長殿ご自慢の茶入れでござる。", "en": "This is Tsukumo-nasu, Lord Nobunaga's prized tea caddy.", "zh": "这是\"九十九茄子\"，信长大人引以为傲的茶入。", "in": ["I"]},
     {"id": "s05", "who": "I", "pos": "seat", "ja": "[softly] 信長殿は、茶器を家臣への褒美になさるのです。", "en": "Lord Nobunaga gives tea wares to his retainers as rewards.", "zh": "信长大人会把茶器赏给家臣。"},
     {"id": "s06", "who": "N", "pos": "right_ear", "ja": "[whispers] …土地より、こちらを欲しがる者も多いのじゃ。", "en": "…Many want these more than land.", "zh": "……比起领地，更想要这个的人也不少。"},
     {"id": "tI4", "who": "I", "pos": "right_ear", "ja": "[whispers] …土地より、こちらを欲しがる者も多いのです。", "en": "…Many want this more than land.", "zh": "……比起领地，更想要这个的人也不少。", "in": ["I"]},
     {"id": "s07", "who": "N", "pos": "right", "ja": "[playful] そなたなら、土地と茶器、どちらを取る？", "en": "And you? Land or a tea caddy, which would you take?", "zh": "换作是你，领地和茶器，你选哪个？"},
     {"id": "tI5", "who": "I", "pos": "right", "ja": "[curious] お客人なら、土地と茶器、どちらを取られますかな？", "en": "And you? Land or a tea caddy, which would you take?", "zh": "换作是客人，领地和茶器，您选哪个？", "in": ["I"]}
    ] },
    { "lines": [
     {"ev": "gust"},
     {"id": "tN1", "who": "N", "pos": "behind", "ja": "[surprised] む、障子からすきま風じゃ。", "en": "Hm, a draught through the shoji.", "zh": "嗯，纸拉门漏风了。", "in": ["N"]},
     {"id": "s08", "who": "I", "pos": "behind", "ja": "[surprised] おっと、障子からすきま風が。…寒うはござらぬか。", "en": "Oh, a draught through the shoji. …Aren't you cold?", "zh": "哎呀，纸拉门漏风了。……你不冷吗？"},
     {"id": "s09", "who": "I", "pos": "left_ear", "ja": "[whispers] 実はそれがし、寒いのが苦手でしてな。", "en": "To tell the truth, I can't stand the cold.", "zh": "其实在下最怕冷了。"},
     {"id": "s10", "who": "N", "pos": "seat", "ja": "[laughs] はっはっは！竹千代は昔から寒がりじゃ。", "en": "Ha ha ha! Takechiyo has always hated the cold.", "zh": "哈哈哈！竹千代从小就怕冷。", "in": ["NI"]},
     {"id": "tN2", "who": "N", "pos": "left_ear", "ja": "[whispers] …寒かろう。そなたの世では、冬はどう暖をとる？", "en": "…Cold, isn't it? In your time, how do you keep warm in winter?", "zh": "……冷吧。你的时代，冬天怎么取暖？", "in": ["N"]},
     {"id": "s11", "who": "I", "pos": "left", "ja": "[curious] お客人の世では、冬はどうやって暖をとるのですかな？", "en": "In your time, how do people keep warm in winter?", "zh": "在客人的时代，冬天是怎么取暖的呢？"}
    ] },
    { "ask": "yn", "lines": [
     {"id": "s12", "who": "N", "pos": "window", "ja": "[curious] 四百年後か…。この丸窓の外も、すっかり変わっておるのであろうな。", "en": "Four hundred years… The view from this round window must be quite different.", "zh": "四百年后啊……这圆窗外的景色，想必也完全变了样吧。"},
     {"id": "tI6", "who": "I", "pos": "window", "ja": "[softly] 四百年後…この丸窓の外も、すっかり変わっておるのでしょうな。", "en": "Four hundred years… The view from this round window must be quite different.", "zh": "四百年后……这圆窗外的景色，想必也完全变了吧。", "in": ["I"]},
     {"id": "s14", "who": "N", "pos": "left", "ja": "[serious] では聞こう。わしの「天下布武」は、そなたの世まで伝わっておるか？", "en": "Then tell me. My \"Tenka Fubu\": has it reached your time?", "zh": "那我问你。我的“天下布武”，有流传到你的时代吗？"},
     {"id": "tI7", "who": "I", "pos": "left", "ja": "[curious] 信長殿の「天下布武」は、お客人の世まで伝わっておりますかな？", "en": "Lord Nobunaga's \"Tenka Fubu\": has it reached your time?", "zh": "信长大人的\"天下布武\"，有流传到客人的时代吗？", "in": ["I"]}
    ] },
    { "lines": [
     {"id": "s15", "who": "N", "pos": "seat", "ja": "[warmly] よし、一服点ててやろう。竹千代、炭を足せ。", "en": "Right, let me make you a bowl. Takechiyo, more charcoal.", "zh": "好，给你点一碗茶。竹千代，添点炭。", "in": ["NI"]},
     {"id": "tN3", "who": "N", "pos": "seat", "ja": "[warmly] よし、一服点ててやろう。炭を足すぞ。", "en": "Right, let me make you a bowl. More charcoal.", "zh": "好，给你点一碗茶。添点炭。", "in": ["N"]},
     {"id": "tI8", "who": "I", "pos": "seat", "ja": "[warmly] では、それがしが一服点てましょう。炭を足しますぞ。", "en": "Then let me make you a bowl. A little more charcoal.", "zh": "那么，在下为您点一碗茶。添点炭。", "in": ["I"]},
     {"ev": "fire"},
     {"id": "s16", "who": "I", "pos": "near", "ja": "[chuckles softly] 信長殿の茶は荒々しいが、不思議とうまいのです。", "en": "Lord Nobunaga's tea is rough, but somehow it's good.", "zh": "信长大人点的茶很豪放，却不知为何很好喝。", "in": ["NI"]},
     {"id": "s17", "who": "N", "pos": "left_ear", "ja": "[whispers] …熱いぞ。ゆっくり飲め。", "en": "…It's hot. Drink it slowly.", "zh": "……很烫哦。慢慢喝。"},
     {"id": "tI9", "who": "I", "pos": "left_ear", "ja": "[whispers] …熱うござる。ゆっくりお飲みなされ。", "en": "…It's hot. Drink it slowly.", "zh": "……很烫。请慢慢喝。", "in": ["I"]},
     {"id": "s18", "who": "N", "pos": "left", "ja": "[playful] どうじゃ、わしの茶の味は？", "en": "Well? How do you like my tea?", "zh": "怎么样，我点的茶味道如何？"},
     {"id": "tI10", "who": "I", "pos": "left", "ja": "[curious] 茶のお味は、いかがですかな？", "en": "How do you find the tea?", "zh": "茶的味道如何？", "in": ["I"]}
    ] },
    { "final": true, "lines": [
     {"id": "tN4", "who": "N", "pos": "seat", "ja": "[warmly] さて、日も暮れた。よい茶会であった。", "en": "Well, the sun has set. A fine tea gathering.", "zh": "好了，天也黑了。真是一场好茶会。", "in": ["N"]},
     {"id": "s19", "who": "I", "pos": "seat", "ja": "[warmly] さて、日も暮れました。今宵はよい茶会でござった。", "en": "Well, the sun has set. It was a fine tea gathering tonight.", "zh": "好了，天也黑了。今晚真是一场好茶会。"},
     {"id": "s20", "who": "N", "pos": "right_ear", "ja": "[whispers] …また来い。次は、そなたの世の話をもっと聞かせよ。", "en": "…Come again. Next time, tell me more about your world.", "zh": "……下次再来。到时候，多讲讲你那个时代的事。"},
     {"id": "tI11", "who": "I", "pos": "right_ear", "ja": "[whispers] …またお越しくだされ。次は、お客人の世の話を。", "en": "…Please come again. Next time, tell us about your world.", "zh": "……请再来。下次讲讲客人那个时代的事。", "in": ["I"]},
     {"id": "s21", "who": "N", "pos": "seat", "ja": "[laughs] はっはっは！さらばじゃ、未来の客人！", "en": "Ha ha ha! Farewell, guest from the future!", "zh": "哈哈哈！再会了，未来的客人！"},
     {"id": "byeI", "who": "I", "pos": "seat", "ja": "[chuckles softly] ほっほっほ。では、お達者で、お客人。", "en": "Ho ho ho. Farewell then, honoured guest.", "zh": "呵呵呵。那么，多保重，客人。", "in": ["I"]}
    ] }
   ]
  },
  "kyoto": {
   "topics": [["food", "焼き鳥|鶏|食べ|うま|美味|料理|ご飯|ラーメン|寿司|yakitori|chicken|food|\\beat|ramen|sushi|吃|烤|鸡|菜|饭|拉面|寿司"], ["snow", "雪|冬|snow|winter|雪|冬天"]],
   "bridges": {
    "N": {
     "food": [ {"id": "kyoto_bN_food", "ja": "[laughs] 食い物の話なら、いくらでも聞くぞ！", "en": "Talk of food? I'll listen all night!", "zh": "说到吃的，我听多少都行！"} ],
     "snow": [ {"id": "kyoto_bN_snow", "ja": "[curious] 雪の京も、なかなかのものじゃ。", "en": "Kyoto in the snow is quite something.", "zh": "雪中的京都，也很不错。"} ],
     "sake": [ {"id": "kyoto_bN_sake", "ja": "[laughs] 熱燗か！もう一本頼むぞ！", "en": "Warm sake! Order another one!", "zh": "热酒啊！再来一壶！"} ]
    },
    "I": {
     "food": [ {"id": "kyoto_bI_food", "ja": "[chuckles softly] ほっほっ、それは旨そうですな。", "en": "Ho ho, that sounds delicious.", "zh": "呵呵，听起来很好吃。"} ],
     "snow": [ {"id": "kyoto_bI_snow", "ja": "[softly] 雪の夜は、人恋しくなりますな。", "en": "A snowy night makes one long for company.", "zh": "下雪的夜晚，总让人想有人陪。"} ],
     "sake": [ {"id": "kyoto_bI_sake", "ja": "[chuckles softly] ほっほっ、まずは一献。", "en": "Ho ho, first, a cup.", "zh": "呵呵，先喝一杯。"} ]
    }
   },
   "beats": [
    { "ask": "yn", "lines": [
     {"id": "k01", "who": "N", "pos": "seat", "ja": "[excited] おお、ここが四百年後の京か！灯りがまぶしいのう。", "en": "So this is Kyoto, four hundred years on! The lights are dazzling.", "zh": "哦，这就是四百年后的京都啊！灯光真耀眼。"},
     {"id": "kI01", "who": "I", "pos": "seat", "ja": "[softly] ほう、ここが四百年後の京…。灯りがまるで昼のようですな。", "en": "So this is Kyoto four hundred years on… The lights make it bright as day.", "zh": "哦，这就是四百年后的京都……灯火通明，跟白天一样。", "in": ["I"]},
     {"id": "k02", "who": "I", "pos": "seat", "ja": "[chuckles softly] ほっほっ。お客人、よい店にお連れくださった。", "en": "Ho ho. You've brought us to a fine place, honoured guest.", "zh": "呵呵。客人带我们来了家好店。"},
     {"ev": "fire"},
     {"id": "k03", "who": "N", "pos": "near", "ja": "[curious] して、この熱燗は…そなたも飲むのか？", "en": "And this warm sake… will you drink too?", "zh": "那么，这热酒……你也喝吗？"},
     {"id": "kI02", "who": "I", "pos": "near", "ja": "[curious] 熱燗が来ましたぞ。お客人も一杯、いかがですかな？", "en": "The warm sake is here. Will you have a cup too?", "zh": "热酒来了。客人也来一杯如何？", "in": ["I"]}
    ] },
    { "lines": [
     {"id": "k04", "who": "N", "pos": "right", "ja": "[surprised] なんと、この品書き。鶏を串に刺して焼くのか！", "en": "What, this menu! You skewer chicken and grill it?", "zh": "什么，这菜单。把鸡肉串起来烤吗？"},
     {"id": "kI03", "who": "I", "pos": "right", "ja": "[surprised] ほう、この品書き…鶏を串に刺して焼くのですか。", "en": "Oh, this menu… You skewer chicken and grill it?", "zh": "哦，这菜单……是把鸡肉串起来烤吗？", "in": ["I"]},
     {"id": "k05", "who": "I", "pos": "seat", "ja": "[softly] 我らの頃は、鶏はあまり口にしませなんだな。", "en": "In our day we hardly ate chicken.", "zh": "我们那个时代，很少吃鸡呢。"},
     {"id": "k06", "who": "N", "pos": "right_ear", "ja": "[whispers] …わしは珍しいものは何でも食う。内緒じゃがな。", "en": "…I'll eat anything unusual. Keep that to yourself.", "zh": "……稀罕的东西我什么都吃。这事别说出去。"},
     {"id": "kI04", "who": "I", "pos": "right_ear", "ja": "[whispers] …実はそれがし、少々腹が減っておりましてな。", "en": "…To tell the truth, I'm rather hungry.", "zh": "……其实在下有点饿了。", "in": ["I"]},
     {"id": "k07", "who": "N", "pos": "right", "ja": "[playful] そなたのおすすめはどれじゃ？選んでみよ。", "en": "Which do you recommend? Go on, choose.", "zh": "你推荐哪个？选一个看看。"},
     {"id": "kI05", "who": "I", "pos": "right", "ja": "[curious] お客人のおすすめは、どれですかな？", "en": "Which would you recommend, honoured guest?", "zh": "客人推荐哪一个呢？", "in": ["I"]}
    ] },
    { "lines": [
     {"id": "k08", "who": "N", "pos": "window", "ja": "[excited] 見よ、雪じゃ！鴨川に雪が降っておる。窓を開けるぞ！", "en": "Look, snow! It's snowing on the Kamo River. I'm opening the window!", "zh": "看，下雪了！鸭川上在下雪。我把窗打开！"},
     {"id": "kI06", "who": "I", "pos": "window", "ja": "[softly] おや、雪ですな。鴨川に雪が…。少し窓を開けてみましょう。", "en": "Oh, snow. Snow on the Kamo River… Let's open the window a little.", "zh": "哎呀，下雪了。鸭川上下雪了……把窗稍微打开看看吧。", "in": ["I"]},
     {"ev": "window"},
     {"id": "k09", "who": "I", "pos": "left_ear", "ja": "[whispers] …お寒うござろう。それがしの側へお寄りなされ。", "en": "…You must be cold. Come closer to me.", "zh": "……很冷吧。往在下这边靠一靠。"},
     {"id": "kN01", "who": "N", "pos": "right_ear", "ja": "[whispers] …冷たかろう。じゃが、この景色は冷たさに値する。", "en": "…Cold, isn't it? But this view is worth the cold.", "zh": "……冷吧。不过这景色值得挨这点冷。", "in": ["N"]},
     {"id": "k10", "who": "N", "pos": "window", "ja": "[laughs] はっはっは！竹千代はすぐ寒がる。", "en": "Ha ha ha! Takechiyo always feels the cold.", "zh": "哈哈哈！竹千代一下就怕冷了。", "in": ["NI"]},
     {"id": "k11", "who": "I", "pos": "left", "ja": "[curious] お客人の世では、雪の夜はどう過ごされるのですかな？", "en": "In your time, how do you spend a snowy night?", "zh": "客人的时代，下雪的夜晚怎么过呢？"},
     {"id": "kN02", "who": "N", "pos": "right", "ja": "[curious] そなたの世では、雪の夜はどう過ごす？", "en": "In your time, how do you spend a snowy night?", "zh": "你的时代，下雪的夜晚怎么过？", "in": ["N"]}
    ] },
    { "ask": "yn", "lines": [
     {"id": "k12", "who": "N", "pos": "seat", "ja": "[curious] ところで、京には本能寺という寺があったな。今もあるか？", "en": "By the way, Kyoto had a temple called Honnoji. Is it still there?", "zh": "对了，京都有座叫本能寺的寺庙。现在还在吗？"},
     {"id": "kI07", "who": "I", "pos": "seat", "ja": "[serious] …京には、本能寺という寺がござった。", "en": "…There was a temple in Kyoto called Honnoji.", "zh": "……京都有座叫本能寺的寺庙。", "in": ["I"]},
     {"id": "k13", "who": "I", "pos": "near", "ja": "[surprised] そ、その話は…また今度にいたしましょう。", "en": "Th-that subject… let's save it for another time.", "zh": "那、那个话题……还是下次再说吧。", "in": ["NI"]},
     {"ev": "gust"},
     {"id": "k14", "who": "N", "pos": "near", "ja": "[curious] …なぜか背筋が寒いのう。そなた、何か知っておるな？", "en": "…Somehow a chill runs down my spine. You know something, don't you?", "zh": "……不知怎么背后发凉。你知道些什么吧？"},
     {"id": "kI08", "who": "I", "pos": "near", "ja": "[sighs] …いや、この話はよしましょう。四百年後の京は、平らかですかな？", "en": "…No, let's leave that be. Is Kyoto at peace, four hundred years on?", "zh": "……算了，不说这个了。四百年后的京都，太平吗？", "in": ["I"]}
    ] },
    { "lines": [
     {"id": "k15", "who": "N", "pos": "seat", "ja": "[curious] この「はいぼうる」とやらは、なんじゃ？泡が立っておる。", "en": "And this \"highball\", what is it? It's fizzing.", "zh": "这个叫\"嗨棒\"的是什么？还冒着泡。"},
     {"id": "kI09", "who": "I", "pos": "seat", "ja": "[curious] この「はいぼうる」とやらは、泡が立っておりますな。", "en": "This \"highball\" is fizzing, isn't it?", "zh": "这个叫\"嗨棒\"的，还冒着泡呢。", "in": ["I"]},
     {"id": "k16", "who": "I", "pos": "seat", "ja": "[chuckles softly] 冷たい酒に泡…。それがしは熱燗で十分でござる。", "en": "Cold liquor with bubbles… Warm sake is plenty for me.", "zh": "冰的酒还冒泡……在下喝热酒就够了。"},
     {"ev": "fire"},
     {"id": "k17", "who": "N", "pos": "left_ear", "ja": "[whispers] …よし、そなたと乾杯じゃ。わしの盃に注いでくれ。", "en": "…Right, a toast with you. Pour for me.", "zh": "……好，跟你干一杯。给我斟上。"},
     {"id": "kI10", "who": "I", "pos": "left_ear", "ja": "[whispers] …お客人と乾杯を。ささ、もう一献。", "en": "…A toast with you. Come, one more cup.", "zh": "……跟客人干一杯。来，再来一杯。", "in": ["I"]},
     {"id": "k18", "who": "N", "pos": "left", "ja": "[playful] そなたは、熱燗と冷たいの、どちらが好みじゃ？", "en": "Which do you like, warm sake or something cold?", "zh": "你喜欢热酒，还是冰的？"},
     {"id": "kI11", "who": "I", "pos": "left", "ja": "[curious] お客人は、熱燗と冷たいの、どちらがお好みで？", "en": "Which do you prefer, warm sake or something cold?", "zh": "客人喜欢热酒，还是冰的？", "in": ["I"]}
    ] },
    { "final": true, "lines": [
     {"id": "k19", "who": "I", "pos": "seat", "ja": "[warmly] 夜も更けました。今宵は、よい酒でござった。", "en": "The night is late. That was fine sake tonight.", "zh": "夜深了。今晚的酒真好。"},
     {"id": "k20", "who": "N", "pos": "right_ear", "ja": "[whispers] …四百年後も、悪くない。また案内せい。", "en": "…Four hundred years on isn't bad. Show me around again.", "zh": "……四百年后也不坏。下次再带我逛逛。"},
     {"id": "kI12", "who": "I", "pos": "right_ear", "ja": "[whispers] …次は、雪の鴨川を歩きましょうぞ。", "en": "…Next time, let's walk along the snowy Kamo River.", "zh": "……下次，一起去雪中的鸭川走走吧。", "in": ["I"]},
     {"id": "s21", "who": "N", "pos": "seat", "ja": "[laughs] はっはっは！さらばじゃ、未来の客人！", "en": "Ha ha ha! Farewell, guest from the future!", "zh": "哈哈哈！再会了，未来的客人！"},
     {"id": "byeI", "who": "I", "pos": "seat", "ja": "[chuckles softly] ほっほっほ。では、お達者で、お客人。", "en": "Ho ho ho. Farewell then, honoured guest.", "zh": "呵呵呵。那么，多保重，客人。", "in": ["I"]}
    ] }
   ]
  },
  "yamazaki": {
   "topics": [["whisky", "ウイスキー|ハイボール|樽|ロック|水割り|whisk|cask|highball|rocks|威士忌|嗨棒|酒桶|加冰|兑水"], ["mist", "霧|朝|mist|fog|morning|雾|早上|早晨"]],
   "bridges": {
    "N": {
     "whisky": [ {"id": "yamazaki_bN_whisky", "ja": "[excited] 南蛮の酒は、奥が深いのう！", "en": "This foreign drink runs deep!", "zh": "南蛮的酒，真是深奥啊！"} ],
     "mist": [ {"id": "yamazaki_bN_mist", "ja": "[curious] 霧の山も、悪くない。", "en": "Misty mountains aren't bad either.", "zh": "雾中的山，也不坏。"} ],
     "sake": [ {"id": "yamazaki_bN_sake", "ja": "[laughs] 朝から酒の話とは、気が合うのう！", "en": "Talking drink in the morning? We get along!", "zh": "一大早就聊酒，咱们真合得来！"} ]
    },
    "I": {
     "whisky": [ {"id": "yamazaki_bI_whisky", "ja": "[softly] 樽で眠る酒…気の長い話でござる。", "en": "A drink that sleeps in a cask… a patient tale.", "zh": "在木桶里沉睡的酒……真是需要耐心的事。"} ],
     "mist": [ {"id": "yamazaki_bI_mist", "ja": "[warmly] 朝の霧は、身が引き締まりますな。", "en": "Morning mist does sharpen the senses.", "zh": "早晨的雾，让人精神一振。"} ],
     "sake": [ {"id": "yamazaki_bI_sake", "ja": "[chuckles softly] 朝から、ほどほどに願いますぞ。", "en": "Not too much this early, if you please.", "zh": "一大早的，还请适量。"} ]
    }
   },
   "beats": [
    { "ask": "yn", "lines": [
     {"id": "y01", "who": "N", "pos": "seat", "ja": "[curious] ここが山崎か。霧が深いのう。…酒の香りがする。", "en": "So this is Yamazaki. Thick mist… and I can smell liquor.", "zh": "这里就是山崎啊。雾真浓。……有酒香。"},
     {"id": "yI01", "who": "I", "pos": "seat", "ja": "[softly] ほう、ここが山崎…霧が深うござるな。", "en": "So this is Yamazaki… The mist is thick.", "zh": "哦，这里就是山崎……雾好浓啊。", "in": ["I"]},
     {"id": "y02", "who": "I", "pos": "seat", "ja": "[softly] 天王山のふもと、名水の湧く地でござるな。", "en": "The foot of Mount Tenno, where famous spring water flows.", "zh": "天王山脚下，涌出名水的地方啊。"},
     {"ev": "gust"},
     {"id": "y03", "who": "N", "pos": "near", "ja": "[excited] 朝から酒蔵とは、気が利くのう！そなたも飲むのか？", "en": "A distillery first thing in the morning, how thoughtful! Will you drink too?", "zh": "一大早就来酒坊，你真懂事啊！你也喝吗？"},
     {"id": "yI02", "who": "I", "pos": "near", "ja": "[curious] 朝の霧は、ひやりといたしますな。お客人は、ここへよく来られるのですか？", "en": "The morning mist is chilly. Do you come here often, honoured guest?", "zh": "早上的雾凉飕飕的。客人常来这里吗？", "in": ["I"]}
    ] },
    { "lines": [
     {"id": "y04", "who": "N", "pos": "window", "ja": "[surprised] なに、この樽の酒は、十年も二十年も眠らせるのか！", "en": "What? The spirit in these casks sleeps ten, twenty years?", "zh": "什么，这木桶里的酒要睡上十年二十年？"},
     {"id": "yI03", "who": "I", "pos": "window", "ja": "[surprised] この樽の酒は、十年、二十年と眠らせるそうな。", "en": "They say the spirit in these casks sleeps ten, twenty years.", "zh": "听说这木桶里的酒，要睡上十年、二十年。", "in": ["I"]},
     {"id": "y05", "who": "I", "pos": "seat", "ja": "[chuckles softly] 待つのは、それがしの得意とするところでござる。", "en": "Waiting happens to be my specialty.", "zh": "等待，正是在下最擅长的。"},
     {"id": "y06", "who": "N", "pos": "right", "ja": "[laughs] はっはっは！竹千代らしいわ。わしは待てん！", "en": "Ha ha ha! How like Takechiyo. I can't wait!", "zh": "哈哈哈！真像竹千代。我可等不了！", "in": ["NI"]},
     {"id": "yN01", "who": "N", "pos": "right", "ja": "[laughs] 二十年も待つなど、わしにはできん！", "en": "Wait twenty years? Not me!", "zh": "等二十年？我可做不到！", "in": ["N"]},
     {"id": "y07", "who": "N", "pos": "right_ear", "ja": "[whispers] …そなたは待てる方か？それとも、わしと同じか？", "en": "…Are you the patient sort? Or like me?", "zh": "……你是能等的人吗？还是跟我一样？"},
     {"id": "yI04", "who": "I", "pos": "right_ear", "ja": "[whispers] …お客人は、待てるお方ですかな？", "en": "…Are you a patient person, honoured guest?", "zh": "……客人是能等的人吗？", "in": ["I"]}
    ] },
    { "lines": [
     {"ev": "still"},
     {"id": "y08", "who": "I", "pos": "left", "ja": "[surprised] おお、蒸溜の釜の熱気が、こちらまで来ますな。", "en": "Oh, the heat from the stills reaches all the way here.", "zh": "哦，蒸馏釜的热气都传到这边来了。"},
     {"id": "yN02", "who": "N", "pos": "left", "ja": "[surprised] おお、蒸溜の釜の熱気が、ここまで来るわ！", "en": "Oh, the heat from the stills comes all the way here!", "zh": "哦，蒸馏釜的热气都冲到这里来了！", "in": ["N"]},
     {"ev": "gust"},
     {"id": "y09", "who": "N", "pos": "window", "ja": "[playful] 左は釜の熱、前は霧の冷え。忙しい朝じゃ。", "en": "Heat from the stills on the left, cold mist in front. A busy morning.", "zh": "左边是釜的热气，前面是雾的凉意。真是个忙碌的早晨。"},
     {"id": "yI05", "who": "I", "pos": "left_ear", "ja": "[whispers] …左は釜で温く、前は霧で冷える。不思議な朝でござる。", "en": "…Warm from the stills on the left, cold from the mist in front. A strange morning.", "zh": "……左边被釜烘得暖，前面被雾吹得凉。真是个奇妙的早晨。", "in": ["I"]},
     {"id": "y10", "who": "N", "pos": "near", "ja": "[curious] この香り…果実のようで、木のようで。そなたには何の香りがする？", "en": "This aroma… like fruit, like wood. What does it smell of to you?", "zh": "这香气……像水果，又像木头。你闻着像什么？"},
     {"id": "yI06", "who": "I", "pos": "near", "ja": "[curious] この香り…お客人には、何の香りがいたしますかな？", "en": "This aroma… what does it smell of to you, honoured guest?", "zh": "这香气……客人闻着像什么呢？", "in": ["I"]}
    ] },
    { "ask": "yn", "lines": [
     {"id": "y11", "who": "N", "pos": "right", "ja": "[playful] ほれ、氷の入った杯じゃ。…耳に当ててやろう。", "en": "Here, a glass with ice in it. …Let me hold it to your ear.", "zh": "来，加了冰的杯子。……贴到你耳朵上。"},
     {"id": "yI07", "who": "I", "pos": "right", "ja": "[softly] 氷の入った杯でござる。…ほれ、ひやりとしますぞ。", "en": "A glass with ice in it. …There, feel how cool it is.", "zh": "这是加了冰的杯子。……来，凉丝丝的哦。", "in": ["I"]},
     {"ev": "glass"},
     {"id": "y12", "who": "N", "pos": "right_ear", "ja": "[whispers] …冷たかろう？はっはっ、驚いたか？", "en": "…Cold, isn't it? Ha, did that startle you?", "zh": "……凉吧？哈哈，吓到了吗？"},
     {"id": "yI08", "who": "I", "pos": "right_ear", "ja": "[whispers] …ほっほっ、驚かれましたかな？", "en": "…Ho ho, did that startle you?", "zh": "……呵呵，吓到您了吗？", "in": ["I"]},
     {"id": "y13", "who": "I", "pos": "seat", "ja": "[sighs] 信長殿、お客人をからかうのはおやめなされ。", "en": "Lord Nobunaga, stop teasing our guest.", "zh": "信长大人，别捉弄客人了。", "in": ["NI"]}
    ] },
    { "lines": [
     {"id": "y14", "who": "I", "pos": "seat", "ja": "[softly] この近くには、千利休殿の茶室「待庵」がござるそうな。", "en": "They say Sen no Rikyu's tea house, Taian, is near here.", "zh": "听说这附近有千利休的茶室\"待庵\"。"},
     {"id": "yN03", "who": "N", "pos": "seat", "ja": "[proud] この近くに、利休の茶室「待庵」があるそうな。", "en": "They say Rikyu's tea house, Taian, is near here.", "zh": "听说这附近有利休的茶室\"待庵\"。", "in": ["N"]},
     {"id": "y15", "who": "N", "pos": "near", "ja": "[proud] 利休か。あやつの茶は、わしが認めた茶じゃ。", "en": "Rikyu! His tea is tea I gave my approval to.", "zh": "利休啊。他的茶，可是我认可的。", "in": ["NI"]},
     {"id": "y16", "who": "N", "pos": "left_ear", "ja": "[whispers] …じゃが今日は、茶より、こちらの酒じゃな。", "en": "…But today, not tea: this.", "zh": "……不过今天比起茶，还是这酒好。"},
     {"id": "yI09", "who": "I", "pos": "left_ear", "ja": "[whispers] …ですが今日は、茶より、こちらの酒ですな。", "en": "…But today, not tea: this.", "zh": "……不过今天，比起茶，还是这酒吧。", "in": ["I"]},
     {"id": "y17", "who": "N", "pos": "left", "ja": "[curious] そなたは、どう飲むのが好きじゃ？水で割るか？", "en": "How do you like to drink it? With water?", "zh": "你喜欢怎么喝？兑水吗？"},
     {"id": "yI10", "who": "I", "pos": "left", "ja": "[curious] お客人は、どう飲むのがお好みで？", "en": "How do you like to drink it, honoured guest?", "zh": "客人喜欢怎么喝？", "in": ["I"]}
    ] },
    { "final": true, "lines": [
     {"id": "y18", "who": "I", "pos": "seat", "ja": "[warmly] 霧が晴れてまいりました。よい朝でござった。", "en": "The mist is lifting. It was a fine morning.", "zh": "雾散了。真是个美好的早晨。"},
     {"id": "y19", "who": "N", "pos": "right_ear", "ja": "[whispers] …この樽が開く時、またそなたと飲もう。", "en": "…When this cask is opened, let's drink together again.", "zh": "……等这桶酒开封的时候，再跟你一起喝。"},
     {"id": "yI11", "who": "I", "pos": "right_ear", "ja": "[whispers] …樽が開く頃、また共に参りましょう。", "en": "…When the casks are opened, let's come again together.", "zh": "……等酒桶开封时，我们再一起来吧。", "in": ["I"]},
     {"id": "s21", "who": "N", "pos": "seat", "ja": "[laughs] はっはっは！さらばじゃ、未来の客人！", "en": "Ha ha ha! Farewell, guest from the future!", "zh": "哈哈哈！再会了，未来的客人！"},
     {"id": "byeI", "who": "I", "pos": "seat", "ja": "[chuckles softly] ほっほっほ。では、お達者で、お客人。", "en": "Ho ho ho. Farewell then, honoured guest.", "zh": "呵呵呵。那么，多保重，客人。", "in": ["I"]}
    ] }
   ]
  },
  "azuchi": {
   "topics": [["moon", "月|満月|moon|月亮|满月"], ["dream", "海|船|夢|南蛮|外国|世界|旅|sea|ship|dream|abroad|world|travel|梦|海|船|外国|世界|旅行"]],
   "bridges": {
    "N": {
     "moon": [ {"id": "azuchi_bN_moon", "ja": "[warmly] 今宵の月は、格別じゃ。", "en": "Tonight's moon is something special.", "zh": "今晚的月亮，格外好。"} ],
     "dream": [ {"id": "azuchi_bN_dream", "ja": "[excited] 海の向こうの話か！血が騒ぐわ。", "en": "Talk of lands across the sea! It stirs my blood.", "zh": "说到海那边！我热血沸腾。"} ],
     "sake": [ {"id": "azuchi_bN_sake", "ja": "[laughs] そうじゃ、飲め飲め！今宵は宴じゃ！", "en": "That's it, drink up! Tonight we feast!", "zh": "对，喝吧喝吧！今晚是宴会！"} ]
    },
    "I": {
     "moon": [ {"id": "azuchi_bI_moon", "ja": "[softly] よい月夜でござるな。", "en": "A fine moonlit night.", "zh": "真是个好月夜。"} ],
     "dream": [ {"id": "azuchi_bI_dream", "ja": "[serious] 殿の夢は、果てがござらぬ。", "en": "My lord's dreams have no end.", "zh": "主公的梦想，没有尽头。"} ],
     "sake": [ {"id": "azuchi_bI_sake", "ja": "[chuckles softly] ほっほっ、盃が進みますな。", "en": "Ho ho, the cups keep emptying.", "zh": "呵呵，酒越喝越顺了。"} ]
    }
   },
   "beats": [
    { "ask": "yn", "lines": [
     {"id": "a01", "who": "N", "pos": "seat", "ja": "[proud] よう来た。今宵は満月、安土の城で酒宴じゃ！", "en": "Welcome. Tonight's a full moon: a banquet at Azuchi Castle!", "zh": "来得好。今晚满月，在安土城摆酒宴！"},
     {"id": "aI01", "who": "I", "pos": "seat", "ja": "[warmly] ようこそ、お客人。今宵は満月、安土の城の宴でござる。", "en": "Welcome, honoured guest. A full moon tonight, and a banquet at Azuchi Castle.", "zh": "欢迎，客人。今晚满月，是安土城的酒宴。", "in": ["I"]},
     {"id": "a02", "who": "I", "pos": "seat", "ja": "[warmly] 信長殿にこのようにもてなされ、それがし果報者でござる。", "en": "Feasted like this by Lord Nobunaga, I am a lucky man.", "zh": "能受信长大人如此款待，在下真是有福之人。", "in": ["NI"]},
     {"id": "a03", "who": "N", "pos": "near", "ja": "[curious] 客人、そなたは酒はいける口か？", "en": "Guest, can you hold your drink?", "zh": "客人，你能喝酒吗？"},
     {"id": "aI02", "who": "I", "pos": "near", "ja": "[curious] お客人は、酒はいける口ですかな？", "en": "Can you hold your drink, honoured guest?", "zh": "客人能喝酒吗？", "in": ["I"]}
    ] },
    { "ask": "yn", "lines": [
     {"id": "a04", "who": "N", "pos": "right", "ja": "[proud] 見よ、この金の屏風。天主は七重、内は金と朱じゃ。", "en": "Look at these gold screens. The keep has seven storeys, gold and vermilion inside.", "zh": "看这金屏风。天主有七层，里面全是金色和朱红。"},
     {"id": "aI03", "who": "I", "pos": "right", "ja": "[softly] この金の屏風、七重の天主…信長殿の城は見事でござる。", "en": "These gold screens, the seven-storey keep… Lord Nobunaga's castle is splendid.", "zh": "这金屏风，七层的天主……信长大人的城真是壮观。", "in": ["I"]},
     {"id": "a05", "who": "I", "pos": "seat", "ja": "[softly] 南蛮の宣教師も、これほどの城は見たことがないと。", "en": "Even the missionaries from the South say they've never seen such a castle.", "zh": "连南蛮的传教士都说没见过这样的城。"},
     {"ev": "gust"},
     {"id": "a06", "who": "N", "pos": "right_ear", "ja": "[whispers] …夜風が冷たいか。わしの側におれば、寒うはない。", "en": "…Is the night wind cold? Stay by me and you won't be.", "zh": "……夜风冷吗？待在我身边就不冷。"},
     {"id": "aI04", "who": "I", "pos": "right_ear", "ja": "[whispers] …夜風が冷えますな。それがしの側へどうぞ。", "en": "…The night wind is cold. Come, stay by me.", "zh": "……夜风有点凉。请到在下身边来。", "in": ["I"]},
     {"id": "a07", "who": "N", "pos": "right", "ja": "[playful] そなたの世に、この安土の城は残っておるか？", "en": "In your time, does Azuchi Castle still stand?", "zh": "你的时代，这安土城还在吗？"},
     {"id": "aI05", "who": "I", "pos": "right", "ja": "[curious] お客人の世に、この安土の城は残っておりますかな？", "en": "In your time, does Azuchi Castle still stand?", "zh": "客人的时代，这安土城还在吗？", "in": ["I"]}
    ] },
    { "ask": "yn", "lines": [
     {"id": "a08", "who": "N", "pos": "window", "ja": "[excited] あの月の下、海の向こうには南蛮の国々がある。", "en": "Under that moon, beyond the sea, lie the lands of the South.", "zh": "那轮月亮下，大海的那一边，是南蛮诸国。"},
     {"id": "a09", "who": "N", "pos": "window", "ja": "[proud] 天下を平らげたら、わしは船を出す。", "en": "Once the realm is at peace, I'll set sail.", "zh": "等平定了天下，我就出海。"},
     {"id": "aI06", "who": "I", "pos": "window", "ja": "[softly] あの月の下、海の向こうへ…信長殿は船を出すおつもりとか。", "en": "Under that moon, across the sea… Lord Nobunaga means to set sail, they say.", "zh": "那轮月亮下，越过大海……听说信长大人打算出海。", "in": ["I"]},
     {"id": "a10", "who": "I", "pos": "left", "ja": "[serious] …殿の夢は、いつも海より大きゅうござる。", "en": "…My lord's dreams are always bigger than the sea.", "zh": "……主公的梦想，总是比大海还大。"},
     {"id": "a11", "who": "N", "pos": "left_ear", "ja": "[whispers] …そなたも乗るか？わしの船に。", "en": "…Will you come aboard? On my ship?", "zh": "……你也来吗？上我的船。"},
     {"id": "aI07", "who": "I", "pos": "left_ear", "ja": "[whispers] …お客人も、その船に乗られますかな？", "en": "…Would you board that ship too, honoured guest?", "zh": "……客人也会上那艘船吗？", "in": ["I"]}
    ] },
    { "lines": [
     {"id": "a12", "who": "I", "pos": "right", "ja": "[warmly] 夜は冷えます。火鉢をお持ちしましたぞ。", "en": "The night grows cold. I've brought a brazier.", "zh": "夜里冷。我给您端来了火盆。"},
     {"id": "aN01", "who": "N", "pos": "right", "ja": "[playful] 夜は冷える。ほれ、火鉢を寄せてやる。", "en": "The night is cold. Here, I'll bring the brazier closer.", "zh": "夜里冷。来，把火盆给你挪近点。", "in": ["N"]},
     {"ev": "fire"},
     {"id": "a13", "who": "N", "pos": "seat", "ja": "[laughs] はっはっは！竹千代は気が利く。さ、盃を干せ！", "en": "Ha ha ha! Takechiyo is thoughtful. Come, drain your cup!", "zh": "哈哈哈！竹千代真贴心。来，干了这杯！", "in": ["NI"]},
     {"ev": "gust"},
     {"id": "a14", "who": "N", "pos": "near", "ja": "[curious] 未来の世で、わしはどう語られておる？正直に申せ。", "en": "In the future, how am I spoken of? Tell me honestly.", "zh": "未来的人是怎么说我的？老实讲。"},
     {"id": "aI08", "who": "I", "pos": "near", "ja": "[curious] 未来の世で、信長殿はどのように語られておりますかな？", "en": "In the future, how is Lord Nobunaga spoken of?", "zh": "未来的人是怎么说信长大人的？", "in": ["I"]}
    ] },
    { "lines": [
     {"id": "a15", "who": "N", "pos": "seat", "ja": "[serious] よし、今宵は満月じゃ。そなたの願いを一つ、聞いてやろう。", "en": "Right, tonight is a full moon. I'll hear one wish of yours.", "zh": "好，今晚满月。我就听你一个愿望。"},
     {"id": "aI09", "who": "I", "pos": "seat", "ja": "[softly] 満月の夜は、願いを口にするものでござる。", "en": "On a full-moon night, one speaks a wish aloud.", "zh": "满月之夜，要把愿望说出口。", "in": ["I"]},
     {"id": "a16", "who": "I", "pos": "seat", "ja": "[chuckles softly] ほっほっ、殿がこう仰る時は、本気でござるぞ。", "en": "Ho ho, when my lord says that, he means it.", "zh": "呵呵，主公这么说的时候，可是认真的。", "in": ["NI"]},
     {"id": "a17", "who": "N", "pos": "right_ear", "ja": "[whispers] …遠慮はいらぬ。言うてみよ。", "en": "…Don't hold back. Say it.", "zh": "……不必客气。说吧。"},
     {"id": "aI10", "who": "I", "pos": "right_ear", "ja": "[whispers] …お客人の願いを、ひとつお聞かせくだされ。", "en": "…Tell me one wish of yours, honoured guest.", "zh": "……请告诉我客人的一个愿望。", "in": ["I"]}
    ] },
    { "final": true, "lines": [
     {"id": "a18", "who": "I", "pos": "seat", "ja": "[warmly] 月も傾きました。まことによい宴でござった。", "en": "The moon is sinking. It was a truly fine banquet.", "zh": "月亮也西斜了。真是一场好宴会。"},
     {"id": "a19", "who": "N", "pos": "left_ear", "ja": "[whispers] …その願い、わしが天下を取ったら叶えてやる。", "en": "…That wish: I'll grant it once the realm is mine.", "zh": "……那个愿望，等我取了天下就帮你实现。"},
     {"id": "aI11", "who": "I", "pos": "left_ear", "ja": "[whispers] …その願い、叶いますように。", "en": "…May that wish come true.", "zh": "……愿你的愿望成真。", "in": ["I"]},
     {"id": "s21", "who": "N", "pos": "seat", "ja": "[laughs] はっはっは！さらばじゃ、未来の客人！", "en": "Ha ha ha! Farewell, guest from the future!", "zh": "哈哈哈！再会了，未来的客人！"},
     {"id": "byeI", "who": "I", "pos": "seat", "ja": "[chuckles softly] ほっほっほ。では、お達者で、お客人。", "en": "Ho ho ho. Farewell then, honoured guest.", "zh": "呵呵呵。那么，多保重，客人。", "in": ["I"]}
    ] }
   ]
  }
 }
};
