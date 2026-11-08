# Demo38 · ひなたと、ゲーセンデート · Arcade Date with Hinata — script draft v1 (2026-11-08)

User pick (2026-11-08): Hinata story **B — an arcade date** (a gamer girl: you play games together). Replaces Demo18_HinataStream
(old stream not kept; backup outside the repo).
Character unchanged: 火野ひなた — bright orange short bob, one small side ponytail with a red ribbon, sparkling golden eyes, a tiny fang,
red-and-white zip hoodie, white gaming headset round her neck; genki, competitive, sore loser, laughs loudly; voice ElevenLabs `hinata_s`
r1_b. Outfit for the date: the hoodie + a cap pulled low (light disguise — she is a streamer), headset round the neck.

Place: a neon arcade on a winter Friday night, then the street outside. You stand at her **left** most of the time (so she leans to your
**right** ear when she whispers); the racing cabinet fans blow from the front.

Thermal (DUAL):
- Voice: warm at the ear she speaks at, `(0.1 + 0.8 × level)` × distance (ear 1 / ≤ 50 cm 0.6 / further 0.28), × 0.5 in front.
- Ambient: the arcade's warm crowded air (both warm 0.12) · winter street at the door (both cool 0.4, stage 1 start + stage 5) · racing
  cabinet wind fans (both cool 0.35, gusting with the speed) · photo booth: cramped, her cheek next to your right ear (warm 0.35) and the
  booth flash (no heat) · hot canned corn soup from the vending machine pressed to your left cheek (warm 0.6).
  Not heated: her excitement, the screens' light.

Interactions (8): choice · rapid tap (taiko) · choice (which car / lane) · hold (crane) · action (pose / 'peace') · choice (what to
write on the photo) · action (take the can) · ending choice.

## Lines (ja / en / 中文意思)

### 1. ゲーセン到着
- (SE) cold street → the automatic door opens: arcade noise, music, coin sounds.
- **h01** おっそーい！ …って、うそうそ、ひなたも今来たとこ！ へへ、今日はオフだから、変装してきたっ。 / You're late! …Kidding, kidding, I just got here too! Hehe, it's my day off, so I came in disguise. / 太——慢啦！…骗你的骗你的，我也刚到！嘿嘿，今天休息，所以我变装了。
- **h02** ばれない？ この帽子、かわいくない？ / Can you tell it's me? Isn't this cap cute? / 认得出来吗？这顶帽子，可爱吧？
- choice 「かわいい」 / 「バレバレ」
- **h03a** でしょでしょ〜！ よーし、今日はぜんぶ勝つからねっ！ / Right, right?! Okay, I'm winning everything today! / 对吧对吧～！好——，今天我要全部赢下来！
- **h03b** えーっ、うそ！ …まあいっか、あなたにバレるなら。 よーし、勝負だっ！ / What, no way! …Well, fine, as long as it's only you. Okay, let's go! / 诶——不是吧！…算啦，被你认出来就好。好——，来比赛！

### 2. 太鼓で勝負
- **h04** まずは太鼓！ 負けたほうがジュースおごりね！ …よーい、ドン！ / Taiko first! Loser buys drinks! …Ready, go! / 先打太鼓！输的人请喝饮料！…预备——开始！
- **rapid tap** 「ドン！」 (10 s; your score vs hers, she always ends close)
- **h05w** うそーっ!? 負けた…！ もう一回！ …って言いたいけど、約束は約束。ジュース、おごるよ。 / No way!? I lost…! One more! …Is what I want to say, but a deal's a deal. Drinks on me. / 不会吧！？输了…！再来一次！…虽然很想这么说，愿赌服输，饮料我请。
- **h05l** やったー！ ひなたの勝ちー！ へへーん、ジュースよろしくっ！ / Yay! I win! Hehe, drinks are on you! / 耶——！我赢啦！嘿嘿，饮料就拜托你啦！

### 3. レースゲーム
- **h06** つぎ、レース！ となり座って！ …風、出るやつだよ、これ。 / Next, racing! Sit next to me! …This one blows wind at you. / 下一个，赛车！坐我旁边！…这台会吹风的哦。
- (racing: cabinet fans blow from the front, gusting)
- choice 「インから抜く」 / 「ひなたにぶつける」
- **h07a** ちょ、はやっ！ うそ、抜かれたー！ / Whoa, fast! No way, you passed me! / 喂、好快！不会吧，被超了——！
- **h07b** ちょっと！ ぶつけるのナシ！ …ずるい〜っ、ひなたもやり返す！ / Hey! No ramming! …Unfair! I'm getting you back! / 喂！不许撞！…耍赖～，我也要撞回去！
- **h08** はぁ、はぁ…楽しすぎ。…あなたとだと、負けても楽しいの、なんでだろ。 / Haa, haa… that was too fun. …Why is it fun even when I lose, with you? / 哈、哈…太好玩了。…和你一起，就算输了也开心，为什么呢。

### 4. クレーンゲーム
- **h09** あっ、見て！ あのネコのぬいぐるみ、ほしい…！ …取ってくれる？ / Oh, look! I want that cat plushie…! …Will you get it for me? / 啊，你看！那个猫咪玩偶，好想要…！…帮我抓好不好？
- **hold** 「アーム」 (hold to move, release to drop; 2 tries, the second always wins)
- **h10x** あー、おしい！ アーム弱すぎっ！ …もう一回！ / Ah, so close! The claw's too weak! …One more! / 啊——差一点！爪子太松啦！…再来一次！
- **h10** 取れたー！ すごいすごい！ …ありがと。…この子、だいじにするね。 / Got it! Amazing! …Thank you. …I'll treasure this one. / 抓到啦——！好厉害！…谢谢。…我会好好珍惜它的。

### 5. プリクラ
- **h11** ねえ、プリ撮ろ！ …せまっ。…もっとこっち寄って？ (cheek next to your right ear) / Hey, let's take purikura! …Cramped. …Come closer? / 呐，去拍大头贴吧！…好挤。…再靠过来一点？
- **action** 「ピース」 (shutter + flash, three shots)
- **h12** …落書き、なんて書く？ / …What should we write on it? / …上面要写什么？
- choice 「ずっと友だち」 / 「…ひなたが好き」
- **h13a** …えー、友だち？ …ふーん。 …ひなたは、ちがうこと書いちゃお。…見ちゃだめ！ / …Huh, friends? …Hmm. …I'm writing something else. …No peeking! / …诶，朋友？…哼——。…我要写别的。…不许看！
- **h13b** …っ!? な、なに書いてんの…！ …じゃあ、ひなたも、同じこと書く。 / …!? Wh-what are you writing…! …Then I'm writing the same thing. / …！？你、你写什么呢…！…那我也写一样的。

### 6. 帰り道
- (SE) automatic door → cold street, wind (both cool).
- **h14** さむっ！ …はい、コーンスープ。さっきのジュースの代わり。…ぴとっ。 (hot can on your left cheek) / Brr! …Here, corn soup. Instead of that drink. …Boop. / 好冷！…给，玉米浓汤。代替刚才的饮料。…贴。
- **action** 「受け取る」
- **h15** (right ear, quieter) …ねえ。今日のプリ、配信では、ぜったい見せないからね。…あなたとひなただけの、ひみつ。 / …Hey. I'm never showing today's purikura on stream. …It's a secret, just yours and mine. / …呐。今天的大头贴，直播里绝对不给别人看。…是只属于你和我的秘密。
- ending choice 「また来よう」 / 「次は、ひなたの配信に出る」
- **h16a** うんっ！ つぎは、ぜーったい負けないから！ / Yeah! Next time I'm totally not losing! / 嗯！下次我绝——对不会输！
- **h16b** えっ…!? そ、それは…みんなにバレちゃうじゃん…！ …でも、ちょっとうれしい。 / Huh…!? Th-that'd… give it away to everyone…! …But I'm kind of happy. / 诶…！？那、那样的话…大家都会知道的啦…！…不过，有点开心。

## Views (layered)
Plates: arcade entrance · taiko / racing row · crane game · photo booth inside · night street. Poses: wave hello · taiko (drumsticks) · racing
(seated, side view) · crane (pressed to the glass) · photo booth (close, peace sign) · street with the can. Variants: mouth / eyes +
'win' and 'pout' expressions. ≈ 5 plates + 6 poses + 14 variants ≈ 25 images.
