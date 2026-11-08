// The scripted (public) version of 『信長と、語らう』: one place (the Gifu tea room by the hearth), Nobunaga + Ieyasu, about two minutes.
// Pure data (JSON after "= ", read by scripts/voice.py too). Draft with notes: project/script_scripted.md.
// beats: what they say between your turns. line = { id, who: N | I, pos (scenes.js POS), ja (with one [tag]), en, zh } · { ev: gust | fire }
//   ask: 'yn' = a yes / no question (the yes / no bridges come first) · final: the farewell (ends the talk).
// bridges.<who>.<kind>: short lines that acknowledge whatever you said and lead back to the next beat. The bridge is spoken by
//   whoever opens the next beat. kind = a topic from "topics" (regex over ja / en / zh, first match wins), else generic; silence → silence.
// Audio: media/voice/<id>.m4a (scripts/voice.py, ElevenLabs once — no cost at run time).
window.TALK_SCRIPT = {
 "scene": "tea",
 "cast": "NI",
 "silence_seconds": 9,
 "beats": [
  { "ask": "yn", "lines": [
   { "id": "s01", "who": "N", "pos": "seat", "ja": "[warmly] おお、来たか、未来の客人。ちょうど湯が沸いたところじゃ。", "en": "Ah, you've come, guest from the future. The water has just come to the boil.", "zh": "哦，来了啊，未来的客人。水正好烧开了。" },
   { "id": "s02", "who": "I", "pos": "seat", "ja": "[chuckles softly] ほっほっほ。外は冷えましたろう。さ、囲炉裏のそばへ。", "en": "Ho ho. It's cold out there, isn't it? Come, sit by the hearth.", "zh": "呵呵呵。外面很冷吧。来，坐到地炉旁边。" },
   { "ev": "fire" },
   { "id": "s03", "who": "N", "pos": "near", "ja": "[curious] して、そなた。茶は好きか？", "en": "So, tell me. Do you like tea?", "zh": "那么，你喜欢喝茶吗？" }
  ] },
  { "lines": [
   { "id": "s04", "who": "N", "pos": "right", "ja": "[proud] これを見よ。つくも茄子じゃ。一国にも代えがたい茶入れよ。", "en": "Look at this. Tsukumo-nasu, a tea caddy worth more than a province.", "zh": "看这个。九十九茄子，一国都换不来的茶入。" },
   { "id": "s05", "who": "I", "pos": "seat", "ja": "[softly] 信長殿は、茶器を家臣への褒美になさるのです。", "en": "Lord Nobunaga gives tea wares to his retainers as rewards.", "zh": "信长大人会把茶器赏给家臣。" },
   { "id": "s06", "who": "N", "pos": "right_ear", "ja": "[whispers] …土地より、こちらを欲しがる者も多いのじゃ。", "en": "…Many want these more than land.", "zh": "……比起领地，更想要这个的人也不少。" },
   { "id": "s07", "who": "N", "pos": "right", "ja": "[playful] そなたなら、土地と茶器、どちらを取る？", "en": "And you? Land or a tea caddy, which would you take?", "zh": "换作是你，领地和茶器，你选哪个？" }
  ] },
  { "lines": [
   { "ev": "gust" },
   { "id": "s08", "who": "I", "pos": "behind", "ja": "[surprised] おっと、障子からすきま風が。…寒うはござらぬか。", "en": "Oh, a draught through the shoji. …Aren't you cold?", "zh": "哎呀，纸拉门漏风了。……你不冷吗？" },
   { "id": "s09", "who": "I", "pos": "left_ear", "ja": "[whispers] 実はそれがし、寒いのが苦手でしてな。", "en": "To tell the truth, I can't stand the cold.", "zh": "其实在下最怕冷了。" },
   { "id": "s10", "who": "N", "pos": "seat", "ja": "[laughs] はっはっは！竹千代は昔から寒がりじゃ。", "en": "Ha ha ha! Takechiyo has always hated the cold.", "zh": "哈哈哈！竹千代从小就怕冷。" },
   { "id": "s11", "who": "I", "pos": "left", "ja": "[curious] お客人の世では、冬はどうやって暖をとるのですかな？", "en": "In your time, how do people keep warm in winter?", "zh": "在客人的时代，冬天是怎么取暖的呢？" }
  ] },
  { "ask": "yn", "lines": [
   { "id": "s12", "who": "N", "pos": "window", "ja": "[curious] 四百年後か…。この丸窓の外も、すっかり変わっておるのであろうな。", "en": "Four hundred years… The view from this round window must be quite different.", "zh": "四百年后啊……这圆窗外的景色，想必也完全变了样吧。" },
   { "id": "s14", "who": "N", "pos": "left", "ja": "[serious] では聞こう。わしの「天下布武」は、そなたの世まで伝わっておるか？", "en": "Then tell me. My \"Tenka Fubu\": has it reached your time?", "zh": "那我问你。我的“天下布武”，有流传到你的时代吗？" }
  ] },
  { "lines": [
   { "id": "s15", "who": "N", "pos": "seat", "ja": "[warmly] よし、一服点ててやろう。竹千代、炭を足せ。", "en": "Right, let me make you a bowl. Takechiyo, more charcoal.", "zh": "好，给你点一碗茶。竹千代，添点炭。" },
   { "ev": "fire" },
   { "id": "s16", "who": "I", "pos": "near", "ja": "[chuckles softly] 信長殿の茶は荒々しいが、不思議とうまいのです。", "en": "Lord Nobunaga's tea is rough, but somehow it's good.", "zh": "信长大人点的茶很豪放，却不知为何很好喝。" },
   { "id": "s17", "who": "N", "pos": "left_ear", "ja": "[whispers] …熱いぞ。ゆっくり飲め。", "en": "…It's hot. Drink it slowly.", "zh": "……很烫哦。慢慢喝。" },
   { "id": "s18", "who": "N", "pos": "left", "ja": "[playful] どうじゃ、わしの茶の味は？", "en": "Well? How do you like my tea?", "zh": "怎么样，我点的茶味道如何？" }
  ] },
  { "final": true, "lines": [
   { "id": "s19", "who": "I", "pos": "seat", "ja": "[warmly] さて、日も暮れました。今宵はよい茶会でござった。", "en": "Well, the sun has set. It was a fine tea gathering tonight.", "zh": "好了，天也黑了。今晚真是一场好茶会。" },
   { "id": "s20", "who": "N", "pos": "right_ear", "ja": "[whispers] …また来い。次は、そなたの世の話をもっと聞かせよ。", "en": "…Come again. Next time, tell me more about your world.", "zh": "……下次再来。到时候，多讲讲你那个时代的事。" },
   { "id": "s21", "who": "N", "pos": "seat", "ja": "[laughs] はっはっは！さらばじゃ、未来の客人！", "en": "Ha ha ha! Farewell, guest from the future!", "zh": "哈哈哈！再会了，未来的客人！" }
  ] }
 ],
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
   "generic": [
    { "id": "bN_g1", "ja": "[chuckles] ほう、面白きことを申す。…じゃが、", "en": "Heh, you say interesting things. …But,", "zh": "哦，你说的话挺有意思。……不过，" },
    { "id": "bN_g2", "ja": "[laughs] はっはっは、それもよい。さて——", "en": "Ha ha ha, that's fine too. Now then—", "zh": "哈哈哈，那也不错。那么——" },
    { "id": "bN_g3", "ja": "[curious] ふむ…未来の者は、そう考えるか。", "en": "Hmm… so that's how people of the future think.", "zh": "嗯……未来的人是这么想的啊。" },
    { "id": "bN_g4", "ja": "[playful] なるほどのう。覚えておこう。", "en": "I see. I'll remember that.", "zh": "原来如此。我记住了。" },
    { "id": "bN_g5", "ja": "[proud] うむ、よう申した。", "en": "Hm, well said.", "zh": "嗯，说得好。" }
   ],
   "silence": [
    { "id": "bN_q1", "ja": "[chuckles] ふっ、照れておるのか。まあよい。", "en": "Heh, feeling shy? Never mind.", "zh": "哼，害羞了吗？算了。" },
    { "id": "bN_q2", "ja": "[playful] 黙っておっても、顔に書いてあるわ。", "en": "You may be silent, but it's written all over your face.", "zh": "不说话也没用，都写在脸上了。" }
   ],
   "yes": [ { "id": "bN_yes", "ja": "[laughs] はっはっは、そうであろう！", "en": "Ha ha ha, I thought so!", "zh": "哈哈哈，我就知道！" } ],
   "no": [ { "id": "bN_no", "ja": "[chuckles] ふっ、正直な奴じゃ。気に入った。", "en": "Heh, an honest one. I like that.", "zh": "哼，真是个老实人。我喜欢。" } ],
   "tea": [ { "id": "bN_tea", "ja": "[proud] 茶の話なら、わしに任せよ。", "en": "When it comes to tea, leave it to me.", "zh": "说到茶，交给我就对了。" } ],
   "sake": [ { "id": "bN_sake", "ja": "[laughs] 酒か！それは後でじっくりじゃ。", "en": "Sake! We'll get to that later, properly.", "zh": "酒啊！那个之后再慢慢来。" } ],
   "tenka": [ { "id": "bN_tenka", "ja": "[proud] 天下か。ふっ、そなたも大きいことを言う。", "en": "The realm, is it? Heh, you think big too.", "zh": "天下吗？哼，你口气也不小。" } ],
   "warm": [ { "id": "bN_warm", "ja": "[playful] 寒さ暖かさは、この囲炉裏に聞くのが一番じゃ。", "en": "For cold and warmth, ask this hearth.", "zh": "冷暖的事，问这地炉最清楚。" } ],
   "future": [ { "id": "bN_future", "ja": "[excited] 未来の話か！あとでもっと聞かせよ。", "en": "Tales of the future! Tell me more later.", "zh": "未来的事吗！待会儿多讲给我听。" } ],
   "praise": [ { "id": "bN_praise", "ja": "[laughs] はっはっは！褒めても何も出んぞ。", "en": "Ha ha ha! Flattery won't get you anything.", "zh": "哈哈哈！夸我也没有赏哦。" } ],
   "leave": [ { "id": "bN_leave", "ja": "[surprised] なんじゃ、もう行くのか。", "en": "What, leaving already?", "zh": "什么，这就要走了？" } ]
  },
  "I": {
   "generic": [
    { "id": "bI_g1", "ja": "[chuckles softly] ほっほっほ、なるほど、なるほど。", "en": "Ho ho ho, I see, I see.", "zh": "呵呵呵，原来如此，原来如此。" },
    { "id": "bI_g2", "ja": "[warmly] ふむ、お客人らしいお答えですな。", "en": "Hm, an answer just like our guest.", "zh": "嗯，真像客人会说的话。" },
    { "id": "bI_g3", "ja": "[softly] ほう…それは興味深い。さて、", "en": "Oh… how interesting. Now then,", "zh": "哦……真有意思。那么，" },
    { "id": "bI_g4", "ja": "[chuckles] これは一本取られましたな。", "en": "You've got me there.", "zh": "这下被你将了一军。" }
   ],
   "silence": [
    { "id": "bI_q1", "ja": "[softly] ほっほっ、ゆっくりで構いませぬぞ。", "en": "Ho ho, take your time.", "zh": "呵呵，慢慢来，不着急。" },
    { "id": "bI_q2", "ja": "[warmly] 言葉にせずとも、伝わりますぞ。", "en": "Even unspoken, it comes across.", "zh": "不用说出口，我也明白。" }
   ],
   "yes": [ { "id": "bI_yes", "ja": "[chuckles softly] ほっほっ、それは何より。", "en": "Ho ho, nothing could be better.", "zh": "呵呵，那再好不过了。" } ],
   "no": [ { "id": "bI_no", "ja": "[softly] ほう、それもまた一つの道。", "en": "Oh, that too is a path.", "zh": "哦，那也是一条路。" } ],
   "tea": [ { "id": "bI_tea", "ja": "[warmly] 茶の湯は、心を静めますからな。", "en": "Tea does calm the heart.", "zh": "茶道能让人心静下来。" } ],
   "sake": [ { "id": "bI_sake", "ja": "[chuckles] 酒の話は、日が暮れてからにしましょうぞ。", "en": "Let's save the sake talk for after dark.", "zh": "酒的事，等天黑了再说吧。" } ],
   "tenka": [ { "id": "bI_tenka", "ja": "[serious] 天下のこととなると、それがしも黙ってはおれませぬな。", "en": "When it comes to the realm, even I can't stay quiet.", "zh": "说到天下，在下也没法不吭声了。" } ],
   "warm": [ { "id": "bI_warm", "ja": "[softly] 火のそばは、ありがたいものですな。", "en": "A seat by the fire is a blessing.", "zh": "能待在火边，真是难得。" } ],
   "future": [ { "id": "bI_future", "ja": "[surprised] なんと、四百年後にはそのような…。", "en": "My, four hundred years from now, such things…", "zh": "竟然，四百年后会有那样的……" } ],
   "praise": [ { "id": "bI_praise", "ja": "[chuckles softly] ほっほっ、かたじけない。", "en": "Ho ho, how kind of you.", "zh": "呵呵，不敢当。" } ],
   "leave": [ { "id": "bI_leave", "ja": "[softly] おや、もうお帰りですかな。", "en": "Oh, are you leaving already?", "zh": "哎呀，这就要回去了吗？" } ]
  }
 }
};
