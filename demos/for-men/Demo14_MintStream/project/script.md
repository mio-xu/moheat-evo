# Demo37 · ミントの、おみみ専門店 · Mint's Ear Salon (stream) — script draft v1 (2026-11-08)

User pick (2026-11-08): Mint stays the one live stream, but in a new, richer form: **C — a role-play stream where she runs an "ear
salon"** and the chat orders the treatments. Replaces Demo14_MintStream (old stream not kept; backup outside the repo).
Character unchanged: 白深ミント — long silky mint-green hair fading to white, thin low side braid, sleepy pale aqua eyes, small star
hair clip, oversized white cable-knit cardigan; calm, sleepy, whispery; voice ElevenLabs `mint` r1_a. Outfit for the place: the cardigan
over a mint salon apron.

Stream frame (same UI family as the old stream rooms: chat, Super Chats, viewer count): her small salon set at night — a reclining
chair seen from above it (you = the dummy head 「みみくん」 lying back; her face above you), shelf with towels warmer, a little steam
kettle, a lamp. Her binaural mic is your head, so every treatment happens at your ears.

Thermal (DUAL):
- Voice: warm at the ear she speaks at, `(0.1 + 0.8 × level)` × distance (ear 1 / ≤ 30 cm 0.6 / desk 0.28).
- Ambient: steamed towel over both ears (warm 0.6, cooling to 0.3 over ~20 s) · her warmed hands massaging one ear (warm 0.35, that ear)
  · cooled steel spoon touching an ear (cool 0.6, short) · mint lip balm + blowing (cool 0.45 at that ear, a breath = 1.5 s) · warm
  stone (温石) by the ear (warm 0.4) · a cool mist spray (both cool 0.3) · blanket at the end (both warm 0.2).
  Not heated: what she says feels nice, sleepiness.

Interactions (8): chat vote (which ear first) · menu order 1 (Super Chat: warm towel / cool spoon) · hold 「動かないでね」 (ear pick)
· menu order 2 (warm stone / mint breath) · action 「寝返り」 (turn to the other ear) · chat choice (what to whisper) · say it
「おやすみ」 (voice, judged) · ending choice.

## Lines (ja / en / 中文意思)

### 1. ご来店
- **m01** …いらっしゃいませ。おみみ専門店、ミントへ、ようこそ。 / …Welcome. Welcome to Mint, the ear salon. / …欢迎光临。欢迎来到耳朵专门店「ミント」。
- **m02** 今夜のお客さまは…みみくん。…つまり、画面のまえの、あなたです。 / Tonight's guest is… Mimi-kun. …Which means, you, in front of the screen. / 今晚的客人是…みみくん。…也就是屏幕前的你。
- **m03** …まずは、どっちのおみみから、ほぐしましょうか。コメントで、おしえてね。 / …Which ear shall I start on? Tell me in the chat. / …先从哪只耳朵开始放松呢？在弹幕里告诉我吧。
- chat vote 「みぎ」 / 「ひだり」 (= side A for the rest; the other ear = side B)

### 2. ほぐす
- **m04** …はーい。こっちのおみみ、さわりますね。手、あっためておいたから。 (side A, massage) / …Okay. I'll touch this ear. I warmed my hands first. / …好的。我要碰这只耳朵了哦。手已经先暖过了。
- **m05** …むに、むに。…ふふ、やわらかい。…ちから、ぬいてね。 / …Squish, squish. …Heh, so soft. …Let yourself relax. / …揉、揉。…呵呵，好软。…放松哦。
- Super Chat menu: 「蒸しタオル」(warm) / 「ひんやりスプーン」(cool)
- **m06t** …ご注文ありがとう。蒸しタオル、ふたつのおみみに。…ふわぁ、あったかい、ね。 / …Thank you for your order. Steamed towels, on both ears. …Mm, warm, isn't it. / …谢谢点单。热毛巾，盖在两只耳朵上。…呼，好暖和呀。
- **m06s** …ご注文ありがとう。冷やしておいた、スプーン。…ぴと。…ひゃっ、てなった？ / …Thank you for your order. A spoon I chilled. …Tap. …Did you jump? / …谢谢点单。冰过的勺子。…贴。…是不是吓了一跳？

### 3. おみみかき
- **m07** …つぎは、おみみかき。…ちょっとだけ、動かないでね。 / …Next, ear cleaning. …Stay still for just a bit. / …接下来，掏耳朵。…稍微、别动哦。
- **hold** 「動かない」 (scratch / bonten sounds at side A while held; let go → m08x)
- **m08** …かり、かり。…すー。…はい、きれいになりました。いいこ、いいこ。 / …Scritch, scritch. …Swish. …There, all clean. Good, good. / …沙、沙。…唰。…好啦，干净了。乖，乖。
- **m08x** …あ、うごいた。…あぶないから、もうすこし、じっとしてて？ / …Ah, you moved. …It's not safe, so stay still a little longer? / …啊，动了。…很危险的，再安静一会儿？ (retry)
- Super Chat menu: 「温石」(warm stone) / 「ミントの吐息」(mint breath)
- **m09w** …あったかい石、おみみのそばに、おいておくね。…じんわり。 / …I'll leave a warm stone by your ear. …Slowly warming. / …暖暖的石头，放在你耳朵旁边哦。…慢慢暖起来。
- **m09m** …ミントのリップ、ぬったの。…いくよ。…ふぅー。…すーすー、するでしょ。 / …I put on mint lip balm. …Here it comes. …Fuuu. …Tingly, right? / …我涂了薄荷唇膏。…要来了哦。…呼——。…凉丝丝的吧。

### 4. 反対のおみみ
- **m10** …はんたいがわも、しないとね。…ごろん、ってしてくれる？ / …I have to do the other side too. …Can you roll over? / …另一边也要做哦。…能翻个身吗？
- **action** 「寝返り」 (sound image swaps; side B now)
- **m11** …こっちのおみみも、さっきと、おなじに。…むに、むに。かり、かり。 / …This ear too, just like before. …Squish, squish. Scritch, scritch. / …这只耳朵也，和刚才一样。…揉、揉。沙、沙。
- **m12** …しゅっ。ひんやりミスト、さいごに。…おつかれさま、でした。 / …Psst. A cool mist, to finish. …All done. / …噗。最后，一点清凉喷雾。…辛苦啦。

### 5. ねかしつけ
- **m13** …コメント、いっぱい。「ねむくなってきた」…ふふ、よかった。 / …So many comments. "I'm getting sleepy"… heh, good. / …好多弹幕。「开始困了」…呵呵，太好了。
- chat choice: 「ひみつ、ききたい」 / 「子守唄、ききたい」
- **m14a** (whisper at side A) …ひみつ。…このお店、ほんとは、あなたのために、ひらいたの。 / (whisper) …A secret. …I actually opened this salon for you. / （耳语）…秘密哦。…这家店，其实是为你开的。
- **m14b** (hum at side A, then whisper) …ん、ん〜…。…こもりうた、ミントの、オリジナル。 / …Mm, mm… …A lullaby, Mint's own. / …嗯、嗯～…。…摇篮曲，ミント原创的。
- **m15** …ブランケット、かけるね。…さいごに、おやすみって、いって？ / …I'll put a blanket on you. …Last of all, say goodnight? / …给你盖上毯子。…最后，跟我说声晚安？
- **say it** 「おやすみ」 (voice, judged; or tap)
- **m16** (whisper, side B) …おやすみなさい。…またのご来店、まってます。 / …Goodnight. …I'll be waiting for your next visit. / …晚安。…期待你再次光临。
- ending choice: 「また来るね」 / Super Chat 「延長おねがい」
- **m17a** …うん。…やくそく、ね。 (stream ends, lamp off) / …Mm. …It's a promise. / …嗯。…说好了哦。
- **m17b** …えっ、延長…？ …ふふ、しかたないなあ。…じゃあ、あなたが眠るまで、ここにいるね。 / …Huh, an extension…? …Heh, can't be helped. …Then I'll stay here until you fall asleep. / …诶，要延长…？…呵呵，真拿你没办法。…那我就陪在这里，直到你睡着。

## Views (layered)
Plate: salon set from above the chair (no Mint) + a closer plate. Poses: greeting (above, smiling) · massage (leaning to the left ear) ·
massage mirrored (right ear; flip the pose if it reads naturally) · ear pick (concentrated, close) · blowing (lips pursed) · lullaby (eyes
half closed) · goodnight (very close, soft smile). Mouth / eyes variants. ≈ 2 plates + 6 poses + 12 variants ≈ 20 images.
