# Demo36 · ココアの、バレンタイン前夜 · Valentine's Eve with Cocoa — script draft v1 (2026-11-08)

User pick (2026-11-08): Cocoa story **A** — the night before Valentine's Day, after closing, she teaches you to make chocolate at her
sweets shop. Replaces the stream room Demo17_CocoaStream (old stream not kept; backup outside the repo).
Character unchanged: 甘音ココア, 22 — fluffy wavy chestnut low twin tails with cream ribbons, small cream beret, warm pink eyes;
sweet, soft-spoken, a little teasing (「あまえんぼさん」); voice ElevenLabs `cocoa` r1_a. Outfit for the place: cream blouse + pink
patisserie apron.

Place: her small patisserie 「Café Cocoa」 after closing, snowy February night. Layout seen from you (first person, at the work counter):
oven on your **right**, the walk-in fridge on your **left**, the counter / bain-marie in front, shop window with snow behind her.

Thermal (DUAL, two layers, DEMO_DESIGN_GUIDE §3):
- Voice: warm at the ear she speaks at, `(0.1 + 0.8 × level)` × distance (ear 1 / ≤ 50 cm 0.6 / further 0.28), × 0.5 in front.
- Ambient: cold night outside (both cool 0.4, only stage 1 before the door shuts) · oven on the right (warm 0.2 steady, 0.7 burst
  when the door opens) · bain-marie steam in front (both warm 0.2) · her fu-fu on the spoon / cookie toward your face (both cool puff 0.3)
  · fridge door on the left (cool 0.5 while open) · her cheek close at your left ear in the ending (0.3).
  Not heated: the taste of chocolate, her blush.

Interactions (6, all by tap or voice): choice · choice (taste) · hold (whisk) · action (eat) · choice (eyes) · ending choice.

## Lines (ja / en / 中文意思)

### 1. 閉店後のお店で
- (SE) door bell, wind and snow outside; the door shuts, the wind cuts off.
- **c01** いらっしゃいませ〜…って、あなたか！ ふふ、来てくれたんだ。さむかったでしょ？ / Welcome… oh, it's you! Hehe, you came. Wasn't it cold? / 欢迎光临～…啊，是你呀！嘿嘿，你真的来了。外面很冷吧？
- **c02** あしたはバレンタインでしょ？ だから今夜は、チョコ作り、てつだってほしいの。 / Tomorrow's Valentine's, right? So tonight, I want you to help me make chocolates. / 明天就是情人节了嘛。所以今晚，想请你帮我做巧克力。
- choice 「いいよ、手伝う」 / 「…誰にあげるの？」
- **c03a** やったぁ！ じゃあエプロン、つけてあげるね。…はい、うしろ向いて。 / Yay! Then I'll put an apron on you. …Okay, turn around. / 太好了！那我帮你系围裙。…来，转过去。
- **c03b** えっ…ひ、ひみつ！ …ほら、手伝うの、手伝わないの？ / Huh… th-that's a secret! …Come on, are you helping or not? / 诶…秘、秘密！…快说，你帮不帮？

### 2. チョコを溶かす
- (SE) chopping chocolate, the bain-marie bubbling in front (steam: both warm 0.2).
- **c04** 湯せんでね、ゆーっくり溶かすの。…いいにおい。 / In a water bath, you melt it slooowly. …Smells so good. / 隔水，要慢——慢地融化。…好香呀。
- **c05** ちょっと味見してみて？ …ふーっ、ふーっ。…はい、あーん。 / Try a little? …Fuu, fuu. …Here, say "aah". / 你尝一下？…呼——呼——。…来，啊——。 (fu-fu: cool puff on both ears)
- choice 「ちょうどいい」 / 「もっと甘くして」
- **c06a** でしょ〜？ あなたの好きな甘さ、ちゃんと覚えてるんだから。 / Right? I remember exactly how sweet you like it. / 对吧～？你喜欢的甜度，我可是记得清清楚楚。
- **c06b** えへへ、あまえんぼさんだなあ。…じゃあ、お砂糖もうひとさじ。 / Hehe, you big baby. …Then one more spoon of sugar. / 嘿嘿，真是个爱撒娇的人。…那就再加一勺糖。

### 3. 生クリーム
- (SE) the fridge door on your left opens (left cool 0.5 while open), shuts.
- **c07** さむっ…！ 冷蔵庫、ひんやりだね。…生クリーム、いっしょに泡立てよ？ / Brr…! The fridge is chilly. …Let's whip the cream together? / 好冷…！冰箱好凉呀。…奶油，我们一起打发吧？
- **c08** うしろから、手、そえるね。…そう、そのまま。止めちゃだめだよ？ (at your right ear, behind you) / I'll put my hands over yours from behind. …Yes, just like that. Don't stop, okay? / 我从后面扶着你的手哦。…对，就这样。不可以停下来哦？
- **hold** 「混ぜる」 (whisk sound while held; letting go too early → c09x)
- **c09** わぁ、ツノ立った！ 上手〜！ …あ、ほっぺにクリームついてる。…とってあげる。 / Wow, stiff peaks! You're so good! …Oh, there's cream on your cheek. …I'll get it. / 哇，起尖角了！好厉害～！…啊，你脸上沾到奶油了。…我帮你擦掉。
- **c09x** あっ、まだだよ〜。もうちょっとがんばろ？ / Ah, not yet! Just a little more? / 啊，还没好呢～。再加把劲？ (retry)

### 4. 焼きたてクッキー
- (SE) oven ding on your right; the door opens (right warm burst 0.7, then back to 0.2).
- **c10** 焼けた〜！ ハートのクッキー。…あつあつだから、ふーふーしてあげる。 / They're done! Heart cookies. …They're piping hot, so I'll blow on one. / 烤好啦～！爱心饼干。…很烫，我帮你吹一吹。
- **c11** ふーっ、ふーっ。…はい、あーん。 / Fuu, fuu. …Here, aah. / 呼——呼——。…来，啊——。 (cool puff)
- **action** 「食べる」 (crunch)
- **c12** …おいしい？ よかったぁ。…あのね、これ、ほんとはね…ううん、なんでもない。 / …Is it good? I'm so glad. …You know, this was actually… no, never mind. / …好吃吗？太好了。…那个呀，其实这个…不，没什么。

### 5. メッセージ
- (SE) piping bag, the shop clock; snow on the window behind her.
- **c13** 最後は、ハートのチョコに、メッセージを書くの。…見ちゃだめ！ 目、つぶってて。 / Last, I write a message on the heart chocolate. …No peeking! Close your eyes. / 最后，要在爱心巧克力上写字。…不许看！闭上眼睛。
- choice 「目をつぶる」 / 「…ちょっとだけ見る」
- **c14a** …いい子。 / …Good. / …乖。
- **c14b** こーら、ずるい！ …もう、見えちゃったでしょ。 / Hey, no fair! …Ugh, you saw it, didn't you. / 喂，耍赖！…真是的，被你看到了吧。
- **c15** …さっき、誰にあげるのって聞いたよね。…答え、言うね。 (moves to your left ear) / …Earlier you asked who it's for. …I'll tell you. / …刚才你问我要送给谁吧。…我告诉你答案。
- **c16** (whisper, left ear) …あなた、だよ。 ずっと前から、あなたのために練習してたの。 / …It's you. I've been practising for you all along. / …是你哦。我很早以前，就一直是为你练习的。
- **c17** あしたまで待てなかった。…ねえ、なにか言って？ / I couldn't wait until tomorrow. …Hey, say something? / 我等不到明天了。…呐，说点什么嘛？
- ending choice (say it by voice, judged, or tap) 「…俺も、好き」 / 「来年も、一緒に作ろう」
- **c18a** …ほんと？ …えへへ。 あしたのチョコ、いちばんおっきいの、あなたのだからね。 / …Really? …Hehe. Tomorrow's biggest chocolate is yours, okay? / …真的？…嘿嘿。明天最大的那块巧克力，是你的哦。
- **c18b** …うん。 来年も、さらいねんも、ずっと。 …約束だよ？ / …Yeah. Next year, the year after, always. …Promise? / …嗯。明年、后年，一直一直。…说好了哦？
- (ending: her cheek close at your left ear, snow outside, the bell rings as the clock hits midnight → 「ハッピーバレンタイン」)
- **c19** …あ、12時。 ハッピーバレンタイン。 / …Oh, midnight. Happy Valentine's. / …啊，12 点了。情人节快乐。

## Views (layered, DEMO_DESIGN_GUIDE §6)
Background plates: shop door / counter (bain-marie) / oven side / window with snow. Poses: welcome · melt (spoon) · whisk (behind you,
close) · cookie (aah) · piping (hiding it) · whisper close (left) · ending smile. Each with mouth-open + eyes-closed variants.
≈ 4 plates + 7 poses + 14 variants ≈ 25 images.
