# Demo39 · ルナの、ひみつのカクテル · Luna's Secret Cocktail — script draft v1 (2026-11-08)

User pick (2026-11-08): Luna story **B — she is the bar's secret bartender** (late-night, mature: a bar). Replaces Demo19_LunaStream
(old stream not kept; backup outside the repo).
Character unchanged: 宵月ルナ — long straight black hair with deep-blue inner streaks, dark sapphire eyes, long lashes, thin black choker,
small crescent-moon earring; cool, mature, teasing in a quiet way; voice ElevenLabs `luna` r1_b. Outfit for the place: white shirt with
rolled sleeves, black vest, the choker.

Place: a small basement bar after the last order, rain outside. You sit at the counter; she works behind it in front of you; the door /
stairs (cold air) on your **left**, the jukebox on your **right**.

Thermal (DUAL):
- Voice: warm at the ear she speaks at, `(0.1 + 0.8 × level)` × distance (ear 1 / ≤ 50 cm 0.6 / across the counter 0.28), × 0.5 in front.
- Ambient: rainy night at the door when the last guest leaves (left cool 0.4 for a few s) · iced shaker pressed to your right cheek
  (cool 0.65, short — her tease) · flambé / blue flame cocktail in front (both warm 0.35, flicker, then off) · Irish coffee: hot glass
  held near your face (both warm 0.25) · her sitting down on your left, shoulder to shoulder (left warm 0.2) · her whisper.
  Not heated: alcohol, her blush.

Interactions (7): choice (order) · action (wipe the frost / take the glass) · choice (a word for a cocktail) · hold (watch the flame — don't
blink) · choice · say it (her real name / a toast, voice judged) · ending choice.

## Lines (ja / en / 中文意思)

### 1. ラストオーダーのあと
- (SE) rain, the door on the left: the last guest leaves (cold draft left), the bell, the door shuts. Jazz from the jukebox (right).
- **l01** …ラストオーダー、もう過ぎてるけど。…あなたは、特別。 / …Last orders are long gone. …But you're special. / …最后点单的时间早就过了。…不过，你是特别的。
- **l02** ここ、昼間はただのバー。夜中のこの時間だけ…わたしがシェイカーを振るの。…ないしょね。 / By day this is just a bar. Only at this hour… I'm the one with the shaker. …Keep it secret. / 白天这里只是普通的酒吧。只有深夜这个时候…才是我来摇酒。…要保密哦。
- **l03** …ご注文は？ / …What'll it be? / …要点什么？
- choice 「おまかせで」 / 「いちばん強いのを」

### 2. シェイカー
- **l04a** …おまかせ、ね。いい答え。 / …Leave it to me, then. Good answer. / …交给我，是吗。好答案。
- **l04b** …ふふ。強がらなくていいのに。…ちゃんと帰れる強さにしてあげる。 / …Heh. No need to act tough. …I'll make it strong enough that you still get home. / …呵。不用逞强。…我会调成你还能自己回家的程度。
- (SE) ice into the shaker, shaking in front
- **l05** …つめたいの、好き？ (presses the frosted shaker to your right cheek) / …Do you like cold things? / …喜欢冰的吗？
- **l06** …ふふ。いい顔。…それが見たかったの。 / …Heh. Nice face. …That's what I wanted to see. / …呵呵。好表情。…我就是想看这个。
- **action** 「グラスを受け取る」 (glass slides across the counter)

### 3. あなたのためのカクテル
- **l07** …ねえ。ひとつ言葉をちょうだい。その言葉で、一杯つくってあげる。 / …Hey. Give me one word. I'll make you a drink out of it. / …呐。给我一个词。我用这个词，为你调一杯。
- choice 「月」 / 「夜明け」
- **l08a** …月。…わたしの名前、知ってて言ってる？ …ずるい人。 / …The moon. …Are you saying that knowing my name? …Sly. / …月亮。…你是知道我的名字才这么说的吗？…狡猾的人。
- **l08b** …夜明け。…わたしがいちばん苦手な時間。…でも、あなたとなら、見てみたいかも。 / …Dawn. …The hour I like least. …But with you, I might want to see it. / …黎明。…我最不擅长的时间。…不过和你的话，也许会想看看。
- (SE) the lights dim; she lights the drink: a blue flame in front of you (both warm, flicker)
- **l09** …灯り、落とすね。…よく見てて。まばたき、しないで。 / …I'll dim the lights. …Watch closely. Don't blink. / …我把灯调暗。…好好看着。不要眨眼。
- **hold** 「見つめる」 (flame burns while held; release = it goes out early → l10x)
- **l10** …きれいでしょ。…すぐ消えちゃうから、きれいなの。 / …Beautiful, isn't it. …It's beautiful because it goes out so soon. / …很美吧。…正因为很快就会熄灭，才美。
- **l10x** …あ、まばたきした。…ふふ、もう一回、見せてあげる。 / …Ah, you blinked. …Heh, I'll show you again. / …啊，你眨眼了。…呵，再给你看一次。

### 4. カウンターのこっち側
- **l11** …今夜はもう、閉店。…となり、座ってもいい？ (comes round, sits on your left) / …We're closed for tonight. …Mind if I sit next to you? / …今晚已经打烊了。…我可以坐你旁边吗？
- **l12** …わたしも一杯だけ。アイリッシュコーヒー。…あったかいの、持ってて。 (hot glass in front of your face) / …Just one for me too. Irish coffee. …Hold the warm one. / …我也喝一杯就好。爱尔兰咖啡。…热的这杯，你拿着。
- **l13** …乾杯、しよっか。なにに乾杯する？ / …Shall we toast? To what? / …干个杯吧。为什么干杯？
- **say it** 「ふたりの夜に」 / 「ルナに」 (voice, judged; or tap)
- **l14a** …ふたりの夜に。…乾杯。 / …To our night. …Cheers. / …为我们两个人的夜晚。…干杯。
- **l14b** …わたしに？ …ふふ、ずるい。…乾杯。 / …To me? …Heh, sly. …Cheers. / …为我？…呵，狡猾。…干杯。

### 5. 本当の名前
- **l15** (left ear, whisper) …ねえ。ルナって、本当の名前じゃないの。…本当の名前、あなたにだけ、教えてあげる。 / …Hey. Luna isn't my real name. …I'll tell my real name only to you. / …呐。ルナ不是我的真名。…我的真名，只告诉你一个人。
- **l16** (whisper) …「つき」。…宵月、つき。…ほかの人には、ないしょよ。 / …"Tsuki." …Yoizuki Tsuki. …It's a secret from everyone else. / …「つき」。…宵月，つき。…对别人要保密哦。
- ending choice 「つき」 (call her by name) / 「また来てもいい？」
- **l17a** …っ。…ずるい。…もう一回、呼んで。 / …! …Unfair. …Say it again. / …！…狡猾。…再叫一次。
- **l17b** …毎晩、この時間。カウンターの、いちばん端の席、空けておくわ。 / …Every night, at this hour. I'll keep the end seat at the counter free for you. / …每晚，这个时间。吧台最边上的位子，我会给你留着。

## Views (layered)
Plates: bar from your stool (counter, bottles, door on the left) · close counter (flame) · the stool next to you. Poses: greeting behind the
counter · shaking · leaning in with the shaker (close) · lighting the flame · sitting beside you (left, profile) · whisper (very close).
Variants: mouth / eyes + smirk. ≈ 3 plates + 6 poses + 12 variants ≈ 21 images.
