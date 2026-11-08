#!/usr/bin/env python3
"""THE script of Demo44 『まちがい召喚と、まほう学院の三人』 (Summoned by Mistake) — one source for every line: the tagged Japanese
(ElevenLabs v4 delivery tags), the English and the 中文. `python3 scripts/script_data.py` writes ../lines.js (ja + en for the page,
bridges, keep-talking beats, topics, interactions), project/zh_lines.json and ../l10n.js (zh lines, answer labels, names, voice
phrasings — the cover / page texts are added at the build stage); scripts/voice.py reads TAGGED (+ SAY readings) from here.

Who: T = 椿 (tsubaki), C = ココア (cocoa), L = ルナ (luna) — their confirmed ElevenLabs voices, unchanged (docs/characters/*.md).
Everyone speaks Japanese in this land (t04 says it once). Design + thermal plan: project/script.md. Story (≈ 2:50 + three short
free-talk windows): 1 召喚の大広間 (Tsubaki summons you instead of a dragon) · 2 学院の上空 (her broom: wind by speed, dive, sharp turn
left → right, window ①) · 3 錬金工房 (Cocoa: furnace flare, cold cabinet left / furnace right, hot mug on the right cheek → her
blow cools the same ear in < 1 s, window ②) · 4 塔の上の夜のお茶会 (Luna: fireplace left, a real ice crystal shown slowly, then
crystals orbit your head 360° — over the left ear together with the fire — whisper at the right ear in the cold night air, window ③)
· 5 夜明けの塔 (pick one token → her last whisper → you wake up in the present with it)."""
import json, os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# id: (who, tagged ja, en, zh)
L = {
    # ---- 1 召喚の大広間 (stone hall, braziers left + right, the summoning circle's light has NO temperature)
    't01': ('T', '[excited] 来たれ、天翔ける竜よ…！ …えっ。', 'Come forth, dragon of the skies…! …Eh?', '降临吧，翱翔天际的龙…！…诶？'),
    't02': ('T', '[surprised] …あら？ ドラゴン…では、ありませんわね。 …人、ですの？', '…Oh? You are not… a dragon. …A person?', '…哎呀？不是…龙呢。…是人吗？'),
    't03a': ('T', '[flustered] た、大変失礼いたしました…！ 竜をお呼びしたはずなのですが…。', "I-I'm terribly sorry…! I was supposed to be summoning a dragon…", '真、真是太失礼了…！我明明召唤的是龙才对…。'),
    't03b': ('T', '[softly] ここは、王立セレスタ魔法学院。 召喚の大広間ですわ。', 'This is the Royal Celesta Academy of Magic. The great summoning hall.', '这里是王立塞莱斯塔魔法学院。召唤大厅。'),
    't03c': ('T', '[warmly] わたくし、召喚科の椿と申します。', "I am Tsubaki, of the summoning class.", '我是召唤科的椿。'),
    't04': ('T', '[surprised] …まあ。 言葉が、通じますのね。 [giggles] ふふ、よかった。', '…My. We understand each other. Hehe, how lovely.', '…哎呀。语言是通的呢。呵呵，太好了。'),
    't05': ('T', '[curious] その不思議なお召し物…。 もしかして、別の世界の方…？', 'Those curious clothes… Could you be from another world…?', '这身奇特的衣服…。难道您是，别的世界的人…？'),
    't06': ('T', '[warmly] ご安心くださいませ。 お帰りの魔法陣は、天文塔のてっぺんに。 夜明けに、開きますの。', 'Please, rest easy. The circle to send you home is at the top of the astronomy tower. It opens at dawn.', '请放心。送您回去的魔法阵，在天文塔的最顶端。黎明时分就会开启。'),
    't07': ('T', '[whispers] …ほんとうは、召喚に成功したの、はじめてなんです。 …ないしょ、ですわ。', '…The truth is, this is the first time a summoning of mine has ever worked. …Our secret.', '…其实，我召唤成功，这还是第一次。…要保密哦。'),
    't08': ('T', '[cheerful] さあ、夜明けまでに参りましょう。 わたくしのほうきに、お乗りになって。', "Now, let's be on our way before dawn. Please, ride on my broom.", '那么，在黎明之前出发吧。请坐上我的扫帚。'),
    # ---- 2 学院の上空 (wind by speed; a dive = the cold peak; the sharp turn sweeps the wind left → right)
    't09': ('T', '[cheerful] しっかり、つかまっていてくださいね。 …参りますわ！', 'Hold on tight, please. …Here we go!', '请抓紧哦。…出发啦！'),
    't10': ('T', '[excited] ご覧になって。 あれが学院、あちらが星見の湖ですの。', 'Look — that is the academy, and over there, the Stargazing Lake.', '请看。那是学院，那边是观星湖。'),
    't11': ('T', '[curious] 速さは、いかがなさいます？', 'How fast would you like to go?', '速度要怎么样呢？'),
    't12a': ('T', '[excited] かしこまりました！ 最高速で、参りますわ！', 'Certainly! Full speed it is!', '遵命！以最高速度出发！'),
    't12b': ('T', '[warmly] かしこまりました。 では、ていねいに…。 [excited] 最高速で、参りますわ！', 'Certainly. Then, very gently… Full speed it is!', '遵命。那么，温柔地…以最高速度出发！'),
    't13x': ('T', '[surprised] あら、お手が…！ だ、大丈夫ですか？ もう一度、まいりますね。', 'Oh, your hands…! A-are you all right? Once more, then.', '哎呀，您的手…！没、没事吧？那我们再来一次。'),
    't14': ('T', '[laughs] ふふっ、ふふふ！ 風が、気持ちいいですわね！', 'Hehe, hehehe! The wind feels wonderful, doesn\'t it!', '呵呵，呵呵呵！风好舒服呀！'),
    't15': ('T', '[shouting] 左に、曲がりますわー！', "Turning left-!", '要向左转弯啦——！'),
    't16': ('T', '[curious] …あなたの世界にも、空を飛ぶものはありますの？', '…Are there things that fly in your world too?', '…您的世界里，也有能在天上飞的东西吗？'),
    't17': ('T', '[softly] 地下の工房に、降りますわね。 ココアさんなら、きっと助けてくださいます。', "We'll land at the workshop underground. Cocoa will surely help us.", '我们降落到地下的工房吧。可可的话，一定会帮我们的。'),
    # ---- 3 錬金工房 (furnace + cauldron RIGHT, cold cabinet LEFT; flare = the hot peak; mug on the right cheek → her blow)
    'c01': ('C', '[cheerful] いらっしゃ〜い！ …あら、椿ちゃん。 また何か、召喚しちゃった？', 'Welcome~! …Oh, Tsubaki. Did you summon something again?', '欢迎光临～！…哎呀，椿。又召唤出什么了？'),
    't18': ('T', '[flustered] ち、違いますの…！ いえ、違わないのですが…。', "I-It's not like that…! Well, it is, but…", '不、不是的…！不，其实也没错啦…。'),
    'c02': ('C', '[giggles] ふふ、かわいいお客さん。 わたし、ココア。 ここの工房長だよ。', 'Hehe, what a cute guest. I\'m Cocoa. I run this workshop.', '呵呵，好可爱的客人。我是可可，这间工房的主人哦。'),
    'c03': ('C', '[softly] 左の氷室には、近づきすぎないでね。 雪の結晶の材料、しまってあるの。', "Don't get too close to the ice cabinet on the left. I keep snow-crystal ingredients in there.", '别太靠近左边的冰柜哦。里面放着雪结晶的材料。'),
    'c04': ('C', '[playful] 冷えてるでしょ？ 今夜のお薬は〜…「なんでも甘くなる薬」！ 火トカゲのうろこを、ひとつまみ…。', "You're chilled, aren't you? Tonight's potion is… the 'makes-everything-sweet potion'! A pinch of fire-salamander scale…", '冻坏了吧？今晚的药是～…「什么都会变甜的药」！放一小撮火蜥蜴的鳞片…。'),
    'c05': ('C', '[surprised] きゃっ…！ [giggles] …えへへ、ちょっと入れすぎちゃった。 あったかかったでしょ？', "Eek…! …Ehehe, I put in a bit too much. That was warm, wasn't it?", '呀…！…嘿嘿，放得有点太多了。很暖和吧？'),
    'c06': ('C', '[softly] はい、できあがり。 …って、ほんとは、ただのホットココアなんだけどね。', "Here, all done. …Though really, it's just hot cocoa.", '好啦，做好了。…不过，其实只是普通的热可可啦。'),
    'c07': ('C', '[warmly] …ほっぺ、つめたい。 カップ、ここに当てててね。', '…Your cheek is cold. Hold the cup right here.', '…脸好冰。把杯子贴在这里吧。'),
    'c08': ('C', '[surprised] あ、熱すぎた？', 'Ah, too hot?', '啊，太烫了？'),
    'c09': ('C', '[whispers] …ほら、すずしくなった。 …飲む前に、いただきます、言って？', '…There, it\'s cooler now. …Before you drink, say "itadakimasu"?', '…你看，凉下来了。…喝之前，要说「我开动了」哦？'),
    'c10': ('C', '[cheerful] めしあがれ！ …おいしい？ えへへ、よかったぁ。', 'Enjoy! …Is it good? Ehehe, I\'m so glad.', '请享用！…好喝吗？嘿嘿，太好了～。'),
    'c11': ('C', '[whispers] …ねえ。 甘くなる薬なんて、ほんとはないの。 甘いのは…あなたに、だけ。', '…Hey. There\'s no such thing as a sweetening potion. The only thing that\'s sweet… is me, to you.', '…呐。什么变甜的药，其实根本没有。甜的…只有对你而已。'),
    'c12': ('C', '[curious] …ねえ、あなたの世界の甘いもの、教えて？', '…Hey, tell me about the sweets in your world?', '…呐，告诉我你那个世界的甜食吧？'),
    'c13': ('C', '[softly] …ルナ先生のところへ、行くんでしょ。 塔の上は冷えるから、気をつけてね。 …いってらっしゃい。', "…You're off to Professor Luna's, right? It's cold up the tower, so take care. …See you.", '…你要去露娜老师那里吧。塔顶很冷，要小心哦。…路上小心。'),
    # ---- 4 塔の上の夜のお茶会 (fireplace LEFT, open window RIGHT; ice crystals = real ice: slow demo first, then the orbit)
    'l01': ('L', '[softly] …いらっしゃい。 ここまで登ってくる人は、めずらしいの。', '…Welcome. Not many people climb all the way up here.', '…欢迎。会爬到这里来的人，很少见。'),
    'l02': ('L', '[softly] わたし、ルナ。 氷と夜の魔法を教えてる。 …座って。 暖炉のそばが、あったかいわ。', "I'm Luna. I teach ice and night magic. …Sit. It's warm by the fire.", '我是露娜。教冰与夜的魔法。…坐吧。壁炉旁边比较暖和。'),
    'l03': ('L', '[playful] …お茶、冷やしてあげる。 見てて。', "…I'll chill your tea. Watch.", '…我帮你把茶冰一下。看好了。'),
    'l04': ('L', '[softly] …これが、氷の魔法。 本物の氷だから、近づくと…つめたいでしょ。', '…This is ice magic. It\'s real ice, so when it comes close… it\'s cold, isn\'t it.', '…这就是冰的魔法。是真的冰，所以靠近的话…很冰吧。'),
    'l05': ('L', '[softly] じっとしてて。 …あなたのまわりを、ひとまわり。', 'Hold still. …Once around you.', '别动。…绕着你，转一圈。'),
    'l06x': ('L', '[softly] …動いちゃ、だめ。 …もう一度。', "…Don't move. …Once more.", '…不许动。…再来一次。'),
    'l07': ('L', '[whispers] …ほら、左の耳。 暖炉と、氷。 あったかいのと、つめたいの。 …変な感じ？', '…There, your left ear. The fire and the ice. Warm and cold together. …Strange feeling?', '…你看，左耳。壁炉和冰。暖的和冰的。…感觉很奇妙吧？'),
    'l08': ('L', '[softly] …はい、できあがり。 星見のアイスティー。', '…There. Stargazer iced tea.', '…好了。观星冰茶。'),
    'l09a': ('L', '[laughs softly] …ふふ。 すぐ溶けちゃうから、きれいなの。', '…Heh. It\'s beautiful because it melts so soon.', '…呵呵。因为很快就会融化，所以才美。'),
    'l09b': ('L', '[playful] …ふふ。 氷だもの。 …わたしが、あっためてあげましょうか。', "…Heh. It's ice, after all. …Shall I warm you up?", '…呵呵。毕竟是冰嘛。…要我来帮你暖一暖吗？'),
    'l10': ('L', '[whispers] …夜明けまで、ここにいていいわ。 …あなたが帰るのは、ちょっと、さみしいけど。', '…You can stay here until dawn. …Though it\'s a little lonely, you going home.', '…可以待到天亮。…虽然你要回去，有点寂寞。'),
    'l11': ('L', '[curious] …ねえ。 あなたの世界の夜は、星が見える？', '…Tell me. In your world, can you see the stars at night?', '…呐。你那个世界的夜晚，看得见星星吗？'),
    # ---- 5 夜明けの塔 (dawn sun in front, morning air; pick one token)
    't19': ('T', '[excited] 夜が明けますわ！ 魔法陣が、開きます！', 'Dawn is breaking! The circle is opening!', '天亮了！魔法阵要开启了！'),
    'c14': ('C', '[cheerful] おみやげ、持ってって！ …って、なにがいいかな。', 'Take a souvenir! …Hmm, what should it be?', '带件纪念品走吧！…嗯，送什么好呢。'),
    'l12': ('L', '[softly] …ひとつだけ、選んで。 わたしたちの、どれか。', '…Choose just one. From one of us.', '…只能选一样。从我们之中选一个。'),
    't20': ('T', '[whispers] …椿の髪飾り。 …次は、ちゃんとあなたを、お呼びしますわ。 竜ではなく、あなたを。', "…My camellia ornament. …Next time I'll summon you properly. Not a dragon — you.", '…山茶花发饰。…下次，我会好好地召唤你。不是龙，是你。'),
    'c15': ('C', '[whispers] …わたしのリボン。 …甘いもの食べるとき、思い出してね。 約束だよ？', '…My ribbon. …Think of me whenever you eat something sweet. Promise?', '…我的缎带。…吃甜食的时候，要想起我哦。约好了？'),
    'l13': ('L', '[whispers] …月の耳飾り。 …眠れない夜は、空を見て。 …同じ月よ。', "…My moon earring. …On nights you can't sleep, look at the sky. …It's the same moon.", '…月亮耳坠。…睡不着的夜里，就看看天空。…是同一个月亮哦。'),
    # ---- bridges (free-talk windows): one per topic and character
    'bt_future': ('T', '[curious] すまほ…？ まあ、手のひらで遠くとお話できますの？ …魔法、ですのね。', "A smartphone…? You can talk to faraway people from your palm? …Why, that's magic.", '手机…？哎呀，在手心里就能和远方的人说话吗？…这就是魔法呢。'),
    'bt_magic': ('T', '[warmly] 魔法のことでしたら、おまかせくださいませ。 …召喚以外でしたら。', 'If it\'s about magic, leave it to me. …Anything but summoning.', '魔法的事情，就交给我吧。…召唤除外。'),
    'bt_food': ('T', '[curious] 学院の食堂の焼き菓子、とってもおいしいんですのよ。 今度、ご一緒に。', "The academy dining hall's pastries are delicious, you know. Let's go together next time.", '学院食堂的烤点心，非常好吃哦。下次一起去吧。'),
    'bt_cold': ('T', '[softly] お寒いですか？ わたくしのケープを、どうぞ。', 'Are you cold? Please, take my capelet.', '冷吗？请用我的披肩吧。'),
    'bt_sleep': ('T', '[softly] お疲れでしたら、どうぞ、わたくしの肩に。 落としたりは、いたしませんわ。', "If you're tired, please, rest on my shoulder. I won't drop you.", '累了的话，请靠在我肩上。我不会让你掉下去的。'),
    'bt_praise': ('T', '[flustered] ま、まあ…。 そのようなこと、はじめて言われましたわ…。', 'G-goodness… No one has ever said that to me before…', '哎、哎呀…。第一次有人这样对我说…。'),
    'bt_name': ('T', '[warmly] 椿、ですわ。 冬に咲く、赤いお花の名前ですの。', "Tsubaki. It's the name of a red flower that blooms in winter.", '椿。是冬天盛开的红色花朵的名字。'),
    'bt_thanks': ('T', '[warmly] お礼なんて。 わたくしがお呼びしたのですもの。 責任は、とりますわ。', "No need to thank me. I'm the one who summoned you. I'll take responsibility.", '不用道谢。是我把您召唤来的。我会负责到底的。'),
    'bt_leave': ('T', '[softly] …お帰りになりたいですわよね。 夜明けまで、少しだけ、お待ちくださいませ。', "…Of course you want to go home. Please, wait just a little until dawn.", '…您一定想回去吧。请再稍等一会儿，等到黎明。'),
    'bt_yes': ('T', '[excited] まあ、本当に！？ ぜひ、乗ってみたいですわ！', 'Oh my, really?! I would love to ride one!', '哎呀，真的吗！？我真想坐坐看！'),
    'bt_no': ('T', '[surprised] まあ…。 では、空を飛ぶのは、これがはじめて？ …光栄ですわ。', 'My… Then this is your first time flying? …What an honour.', '哎呀…。那么，这是您第一次在天上飞？…真是荣幸。'),
    'bt_gen1': ('T', '[curious] まあ…。 あなたの世界のお話、もっと聞きたいですわ。', 'My… I would love to hear more about your world.', '哎呀…。我还想多听听您那个世界的事。'),
    'bt_gen2': ('T', '[giggles] ふふ…。 ごめんなさい、半分くらいしか、わかりませんでしたわ。', 'Hehe… Forgive me, I only understood about half of that.', '呵呵…。对不起，我只听懂了一半左右。'),
    'bt_silence': ('T', '[softly] …ふふ。 空の上では、言葉が風に飛ばされてしまいますわね。', '…Hehe. Up in the sky, the wind carries our words away.', '…呵呵。在天上，话语都会被风吹走呢。'),
    'bc_future': ('C', '[curious] へえ〜、未来のお菓子！？ レシピ、こっそり教えてくれない？', 'Ooh, sweets from the future?! Won\'t you secretly tell me the recipe?', '诶～，未来的点心！？能偷偷告诉我食谱吗？'),
    'bc_magic': ('C', '[playful] 錬金術はね、魔法とお料理のあいだなの。 失敗すると、ボンッてなるけど。', "Alchemy is halfway between magic and cooking. When it fails, it goes boom, though.", '炼金术呀，介于魔法和料理之间。失败的话，会「嘭」一下就是了。'),
    'bc_food': ('C', '[cheerful] でしょ〜！ 甘いものは、わたしの専門！ おかわり、あるよ？', "Right~! Sweet things are my speciality! There's more if you want?", '对吧～！甜食是我的专长！还要再来一杯吗？'),
    'bc_cold': ('C', '[softly] 寒いなら、カップ、両手でぎゅってして。 …ほら、あったかいでしょ？', "If you're cold, hold the cup tight in both hands. …See, warm, right?", '冷的话，两只手紧紧捧住杯子。…你看，很暖和吧？'),
    'bc_sleep': ('C', '[giggles] あら、おねむ？ ココア飲むと、眠くなっちゃうよね。', 'Aww, sleepy? Cocoa does make you drowsy.', '哎呀，困了？喝了可可就会犯困呢。'),
    'bc_praise': ('C', '[flustered] えっ…！ も、もう、そういうのずるい〜。', "Eh…! G-geez, that's not fair~.", '诶…！真、真是的，这样太狡猾了～。'),
    'bc_name': ('C', '[cheerful] ココアだよ！ 甘くて、あったかい、ココア。 覚えやすいでしょ？', "I'm Cocoa! Sweet and warm, like cocoa. Easy to remember, right?", '我叫可可！甜甜的、暖暖的可可。很好记吧？'),
    'bc_thanks': ('C', '[warmly] どういたしまして。 お代は〜…また遊びに来ること！', "You're welcome. The price is… coming to visit again!", '不客气。费用嘛～…就是要再来玩！'),
    'bc_leave': ('C', '[softly] …帰っちゃうの、さみしいな。 でも、夜明けまでは、ここにいてね。', "…I'll miss you when you go. But stay here until dawn, okay?", '…你要回去，好寂寞。不过，在天亮之前，就待在这里吧。'),
    'bc_yes': ('C', '[excited] ほんと！？ じゃあ今度、いっしょに作ろ！', 'Really?! Then next time, let\'s make some together!', '真的！？那下次，我们一起做吧！'),
    'bc_no': ('C', '[pouting] ええ〜、ないの？ …じゃあ、わたしが最初の一個、作ってあげる。', "Eh~, there aren't any? …Then I'll make you your very first one.", '诶～，没有吗？…那我来给你做第一个。'),
    'bc_gen1': ('C', '[giggles] ふふ、あなたって、おもしろいね。', 'Hehe, you\'re a funny one.', '呵呵，你这个人真有意思。'),
    'bc_gen2': ('C', '[curious] うんうん…？ よくわかんないけど、楽しそう！', 'Uh-huh…? I don\'t really get it, but it sounds fun!', '嗯嗯…？不太懂，不过听起来很有趣！'),
    'bc_silence': ('C', '[softly] …ふふ、照れてる？ いいよ、ゆっくり飲んで。', '…Hehe, shy? It\'s fine, drink slowly.', '…呵呵，害羞了？没关系，慢慢喝。'),
    'bl_future': ('L', '[softly] …未来の夜は、明るすぎるのね。 星が、かわいそう。', '…Nights in the future are too bright. Poor stars.', '…未来的夜晚，太亮了吧。星星真可怜。'),
    'bl_magic': ('L', '[playful] …魔法の授業なら、夜だけ。 …あなたなら、個人授業でもいいわ。', '…My magic lessons are only at night. …For you, a private lesson would do.', '…魔法课只在晚上上。…是你的话，单独授课也可以。'),
    'bl_food': ('L', '[softly] …お茶菓子は、ココアの焼いたクッキー。 …甘すぎるのが、ちょうどいいの。', "…The tea biscuits are Cocoa's. …Too sweet is just right.", '…茶点是可可烤的饼干。…甜过头，刚刚好。'),
    'bl_cold': ('L', '[softly] …寒い？ 暖炉のほうに、もっと寄って。 …それとも、わたしのほうに？', '…Cold? Move closer to the fire. …Or closer to me?', '…冷吗？往壁炉那边再靠一点。…还是说，往我这边？'),
    'bl_sleep': ('L', '[whispers] …眠いなら、眠って。 夜明けには、起こしてあげる。', "…If you're sleepy, sleep. I'll wake you at dawn.", '…困了就睡吧。天亮的时候，我会叫醒你。'),
    'bl_praise': ('L', '[laughs softly] …ふふ。 口がうまいのね。 …きらいじゃないわ。', "…Heh. Smooth talker. …I don't mind it.", '…呵呵。嘴真甜。…我不讨厌。'),
    'bl_name': ('L', '[softly] …ルナ。 月、っていう意味。 …夜にしか、会えない名前。', '…Luna. It means the moon. …A name you can only meet at night.', '…露娜。是月亮的意思。…只有在夜里才能遇见的名字。'),
    'bl_thanks': ('L', '[softly] …お礼は、いらない。 …ここに来てくれたことが、お礼。', "…No thanks needed. …You coming up here is thanks enough.", '…不用谢。…你来到这里，就是谢礼了。'),
    'bl_leave': ('L', '[softly] …帰りたいのね。 …夜明けまで、あと少し。 それまでは、わたしのお客さん。', "…You want to go home. …Dawn isn't far. Until then, you're my guest.", '…你想回去了吧。…离天亮不远了。在那之前，你是我的客人。'),
    'bl_yes': ('L', '[softly] …そう。 よかった。 …どこにいても、空はつながってるのね。', '…I see. Good. …Wherever you are, the sky is the same sky.', '…这样啊。太好了。…无论在哪里，天空都是相连的呢。'),
    'bl_no': ('L', '[softly] …そう。 じゃあ、今夜の星は、ぜんぶあなたにあげる。', "…I see. Then tonight's stars are all yours.", '…这样啊。那今晚的星星，全部送给你。'),
    'bl_gen1': ('L', '[softly] …ふうん。 …あなたの話し方、好きよ。', '…Hmm. …I like the way you talk.', '…嗯。…我喜欢你说话的方式。'),
    'bl_gen2': ('L', '[laughs softly] …ふふ。 半分も、わからなかった。 …でも、聞いていたい。', "…Heh. I didn't understand half of it. …But I want to keep listening.", '…呵呵。一半都没听懂。…不过，还想继续听。'),
    'bl_silence': ('L', '[softly] …黙っているのも、いい夜ね。', '…Being quiet together makes a good night too.', '…一起沉默，也是个好夜晚。'),
    # ---- もっと話す · place × cast: new lines (story lines are reused where they fit)
    # 召喚の大広間 (braziers left + right; the circle's light is only light)
    'ht1': ('T', '[warmly] まあ、また大広間に？ ふふ、ここは、わたくしの一番好きな場所ですの。', 'Oh, back in the great hall? Hehe, this is my favourite place.', '哎呀，又来大厅了？呵呵，这里是我最喜欢的地方。'),
    'ht2': ('T', '[softly] 魔法陣の光は、あたたかくも、つめたくもありませんの。 ただの、光。 …でも、きれいでしょう？', "The circle's light is neither warm nor cold. Just light. …But pretty, isn't it?", '魔法阵的光，既不暖也不冷。只是光。…不过，很美吧？'),
    'ht3': ('T', '[curious] 火鉢のそばへどうぞ。 この大広間、石造りで、冷えますでしょう？', "Please, come by the brazier. This stone hall gets cold, doesn't it?", '请到火盆旁边来。这个大厅是石头砌的，很冷吧？'),
    'ht4': ('T', '[whispers] …つぎに召喚するときは、あなたのことを思って、呪文を唱えますわね。', '…The next time I summon, I will think of you while I chant.', '…下次召唤的时候，我会想着你念咒语的。'),
    'hc1': ('C', '[cheerful] わあ、ここが召喚の大広間かぁ。 地下にこもってばかりだから、ひさしぶり！', "Wow, the summoning hall. I'm always shut away underground, so it's been ages!", '哇，这就是召唤大厅啊。我总是待在地下，好久没来了！'),
    'hc2': ('C', '[whispers] …椿ちゃんの召喚、失敗しててよかった。 …じゃなきゃ、会えなかったもんね。', "…I'm glad Tsubaki's summoning went wrong. …Or we'd never have met.", '…还好椿的召唤失败了。…不然，就遇不到你了呢。'),
    'hl1': ('L', '[softly] …大広間は、天井が高すぎて、落ち着かないの。', "…The great hall's ceiling is too high. I can't settle here.", '…大厅的天花板太高了，让人静不下心。'),
    'hl2': ('L', '[whispers] …でも、あなたが現れた場所だから。 …少しだけ、好きになったわ。', "…But it's where you appeared. …So I've come to like it, a little.", '…不过，这是你出现的地方。…所以，稍微喜欢上了一点。'),
    # 学院の上空 (wind by speed)
    'st1': ('T', '[excited] また空のお散歩ですのね！ 今度は、どちらへ参りましょう？', 'Another stroll in the sky! Where shall we go this time?', '又要去空中散步了呢！这次要去哪里？'),
    'st2': ('T', '[laughs] ふふ、ほうきの免許は、学年で一番でしたのよ。 …安全運転は、二番目でしたけれど。', 'Hehe, I had the best broom licence in my year. …Safe flying was second, though.', '呵呵，扫帚驾照我可是全年级第一哦。…安全驾驶是第二就是了。'),
    'st3': ('T', '[softly] 夕焼けが、右の空に残っていますわ。 …あちらが、西の国ですの。', 'The sunset still lingers in the sky on the right. …That way lies the western kingdom.', '晚霞还留在右边的天空。…那边是西方的国家。'),
    'st4': ('T', '[whispers] …落ちないように、ぎゅっと。 …はい、そのまま。', "…Hold tight so you don't fall. …Yes, just like that.", '…抓紧，别掉下去。…对，就这样。'),
    'sc1': ('C', '[surprised] ひゃっ…！ た、高い〜！ 椿ちゃん、もっとゆっくり〜！', 'Eek…! S-so high~! Tsubaki, slower~!', '呀…！好、好高～！椿，再慢一点～！'),
    'sc2': ('C', '[whispers] …怖いから、手、にぎってて。 …ほんとに怖いんだからね？', "…I'm scared, so hold my hand. …I really am scared, okay?", '…好可怕，握住我的手。…我是真的害怕哦？'),
    'sl1': ('L', '[softly] …夜の空は、わたしの庭みたいなもの。 星の名前、ぜんぶ言えるわ。', '…The night sky is like my garden. I can name every star.', '…夜空就像是我的庭院。星星的名字，我全都叫得出来。'),
    'sl2': ('L', '[whispers] …風、つめたいでしょう。 …わたしのマントに、入って。', "…The wind is cold, isn't it. …Come under my cloak.", '…风很冷吧。…进到我的斗篷里来。'),
    # 錬金工房 (furnace right, cold cabinet left)
    'lc1': ('C', '[cheerful] おかえり〜！ また来てくれたんだ。 今日は、なに作ろっか。', 'Welcome back~! You came again. What shall we make today?', '欢迎回来～！你又来啦。今天要做什么呢？'),
    'lc2': ('C', '[playful] このかまど、火トカゲの子が住んでるの。 名前はね、マシュマロ。', "A baby fire salamander lives in this furnace. Her name is Marshmallow.", '这个炉子里，住着一只小火蜥蜴哦。名字叫棉花糖。'),
    'lc3': ('C', '[softly] 左の氷室は、ルナ先生が凍らせてくれたの。 夏でも、雪がとけないんだよ。', 'Professor Luna froze the cabinet on the left for me. Even in summer, the snow never melts.', '左边的冰柜，是露娜老师帮我冻上的。就算夏天，雪也不会化哦。'),
    'lc4': ('C', '[curious] ねえ、あなたの世界にも、錬金術ってある？', 'Hey, is there alchemy in your world too?', '呐，你的世界里，也有炼金术吗？'),
    'lc5': ('C', '[whispers] …また、ココア飲みにおいで。 いつでも、あっためておくから。', "…Come again for cocoa. I'll always keep it warm for you.", '…再来喝可可吧。我随时都会帮你温着。'),
    'lt1': ('T', '[curious] まあ、ココアさんの工房は、いつも甘い香りがいたしますわね。', "My, Cocoa's workshop always smells so sweet.", '哎呀，可可的工房总是有甜甜的香味呢。'),
    'lt2': ('T', '[flustered] あの…わたくし、前にここで鍋を爆発させてしまって…。 ないしょ、ですわよ？', "Um… I once made a pot explode in here… That's a secret, all right?", '那个…我以前在这里把锅弄爆炸过…。要保密哦？'),
    'll1': ('L', '[softly] …ココアの工房は、あったかすぎる。 …でも、ここのクッキーは好き。', "…Cocoa's workshop is too warm. …But I like the biscuits here.", '…可可的工房太热了。…不过，我喜欢这里的饼干。'),
    'll2': ('L', '[whispers] …氷室の氷、ときどき、わたしが足しに来てるの。 …ココアには、ないしょ。', "…I sometimes come and top up the ice in her cabinet. …Don't tell Cocoa.", '…冰柜里的冰，我有时候会来补。…别告诉可可。'),
    # 塔の上のお茶会 (fireplace left, night air right)
    'wl1': ('L', '[softly] …また来たの。 …いいわ。 お茶、淹れる。', '…You came again. …All right. I\'ll make tea.', '…又来了啊。…好吧。我来泡茶。'),
    'wl2': ('L', '[softly] …この塔の窓は、一年じゅう開けてあるの。 星が、よく見えるように。', '…The windows of this tower stay open all year. So the stars can be seen.', '…这座塔的窗，一年到头都开着。为了能看清星星。'),
    'wl3': ('L', '[playful] …氷、もうひとつ、まわしてあげましょうか。', '…Shall I send another piece of ice around you?', '…要不要，再让一块冰绕你转一圈？'),
    'wl4': ('L', '[curious] …あなたの世界で、いちばん好きな夜は、どんな夜？', '…In your world, what is your favourite kind of night?', '…在你的世界里，你最喜欢的夜晚，是什么样的？'),
    'wl5': ('L', '[whispers] …おやすみ。 …月が、見てるわ。', '…Good night. …The moon is watching.', '…晚安。…月亮在看着你。'),
    'wt1': ('T', '[curious] ルナ先生のお茶会…！ わたくし、はじめて招かれましたわ。', "Professor Luna's tea party…! This is my first time being invited.", '露娜老师的茶会…！我还是第一次被邀请呢。'),
    'wt2': ('T', '[whispers] …先生、こわそうに見えて、ほんとうはおやさしいんですのよ。', '…The professor looks stern, but she is truly kind, you know.', '…老师看起来很可怕，其实很温柔的哦。'),
    'wc1': ('C', '[cheerful] ルナ先生〜、クッキー焼いてきたよ！ …あ、あなたも来てたんだ！', "Professor Luna~, I baked biscuits! …Oh, you're here too!", '露娜老师～，我烤了饼干来！…啊，你也在呀！'),
    'wc2': ('C', '[whispers] …先生の氷、すっごくつめたいでしょ。 …あっためてあげるね。', "…The professor's ice is super cold, right? …Let me warm you up.", '…老师的冰，超级冰吧。…我来帮你暖一暖。'),
    # 夜明けの塔 (the sun rising in front, the circle open)
    'dt1': ('T', '[softly] 朝日ですわ…。 夜通し、お付き合いくださって、ありがとうございました。', "The morning sun… Thank you for staying with us all night.", '是朝阳…。谢谢您陪了我们一整夜。'),
    'dc1': ('C', '[softly] 朝ごはん、食べてから帰ったら？ …だめ？ そっかぁ。', "Why not have breakfast before you go? …No? I see.", '吃了早饭再回去吧？…不行吗？这样啊～。'),
    'dl1': ('L', '[softly] …朝は、ちょっと苦手。 …でも、今日の朝日は、悪くないわ。', "…I'm not much of a morning person. …But today's sunrise isn't bad.", '…早上，我有点不擅长。…不过，今天的朝阳，还不错。'),
    'tt1': ('T', '[excited] みなさん、そろいましたわ！', 'Everyone is here!', '大家都到齐了！'),
    'tt2': ('C', '[cheerful] 帰る前に、ちょっとだけ、おしゃべりしよ？', "Before you go, let's chat a little?", '回去之前，再聊一会儿吧？'),
    'tt3': ('L', '[softly] …言いたいことがあるなら、今のうちに。', "…If there's something you want to say, now's the time.", '…有想说的话，就趁现在。'),
    'tt4': ('T', '[warmly] あなたの世界でも、どうか、お元気で。', 'Please stay well, in your world too.', '在您的世界里，也请保重。'),
    'tt5': ('C', '[whispers] …またね。', '…See you.', '…下次见。'),
    'tt6': ('L', '[whispers] …また、夜に。', '…Until another night.', '…夜里再见。'),
    # place bridges: what you said was about the place itself
    'bt_p_circle': ('T', '[warmly] 魔法陣の光には、温度がありませんの。 あたたかいのは、火鉢の火ですわ。', "The circle's light has no warmth of its own. What's warm is the brazier fire.", '魔法阵的光没有温度。暖和的是火盆里的火。'),
    'bc_p_circle': ('C', '[curious] 魔法陣って、近くで見ると、こんなにきらきらしてるんだ…。', 'So up close, a magic circle sparkles this much…', '魔法阵近看，原来这么闪闪发亮啊…。'),
    'bl_p_circle': ('L', '[softly] …召喚の光は、ただの光。 …つめたいのは、石の床のほう。', '…Summoning light is only light. …What\'s cold is the stone floor.', '…召唤的光只是光。…冰的是石头地板。'),
    'bt_p_wind': ('T', '[laughs] ふふ、風が強いほど、速く飛んでいる証拠ですわ！', 'Hehe, the stronger the wind, the faster we are flying!', '呵呵，风越大，就说明我们飞得越快！'),
    'bc_p_wind': ('C', '[pouting] 風、つめたい〜！ 帰ったら、すぐココアだからね！', "The wind's so cold~! When we're back, it's cocoa right away!", '风好冷～！回去之后，马上喝可可！'),
    'bl_p_wind': ('L', '[softly] …高い空の風は、氷みたいにつめたいの。 …耳を、かくして。', '…The wind up high is as cold as ice. …Cover your ears.', '…高空的风，像冰一样冷。…把耳朵捂住。'),
    'bt_p_lab': ('T', '[curious] あの大きなかまど、いつも火が入っていますのね。 あたたかい…。', 'That big furnace always has a fire in it. So warm…', '那个大炉子，总是生着火呢。好暖和…。'),
    'bc_p_lab': ('C', '[cheerful] 右はかまどで、左は氷室。 だからここ、あったかいのとつめたいのが、半分こなの！', "The furnace on the right, the ice cabinet on the left. So here it's half warm, half cold!", '右边是炉子，左边是冰柜。所以这里呀，暖的冷的各一半！'),
    'bl_p_lab': ('L', '[softly] …かまどの火と、わたしの氷。 …この工房は、いつも喧嘩してるわね。', '…The furnace fire and my ice. …This workshop is always quarrelling.', '…炉火和我的冰。…这个工房总是在吵架呢。'),
    'bt_p_tower': ('T', '[softly] 塔の上は、星が近いですわね。 …手が、届きそう。', 'The stars are close up on the tower. …As if I could reach them.', '塔顶离星星好近呢。…好像伸手就能碰到。'),
    'bc_p_tower': ('C', '[softly] 窓から入る夜風、つめたいね。 …でも暖炉があるから、へいき。', 'The night wind through the window is cold. …But with the fire, it\'s fine.', '从窗户吹进来的夜风好冷。…不过有壁炉，没事。'),
    'bl_p_tower': ('L', '[softly] …左は暖炉、右は夜空。 …あなたの耳、いま、どっちが好き？', '…The fire on the left, the night sky on the right. …Which one do your ears like right now?', '…左边是壁炉，右边是夜空。…你的耳朵，现在喜欢哪一边？'),
    'bt_p_dawn': ('T', '[excited] 朝日が昇れば、魔法陣は開きますの。 学院の言い伝えですわ！', "When the sun rises, the circle opens. That's what the academy says!", '太阳升起，魔法阵就会开启。这是学院的传说！'),
    'bc_p_dawn': ('C', '[softly] 朝日、あったかいね。 …帰る前に、もう一回、ほっぺ、あっためてあげる。', 'The morning sun is warm. …Before you go, let me warm your cheek once more.', '朝阳好暖和。…回去之前，再帮你暖一次脸吧。'),
    'bl_p_dawn': ('L', '[softly] …夜が終わるのは、少しさみしい。 …でも、あなたが帰れるなら、いい朝ね。', "…It's a little sad when the night ends. …But if you can go home, it's a good morning.", '…夜晚结束，有点寂寞。…不过，如果你能回去，那就是个好早晨。'),
}

# readings for ElevenLabs only (the page shows the kanji; voice.py speaks these) — names / rare readings checked for Japanese
SAY = {'天翔ける': 'あまかける', '来たれ': 'きたれ', '氷室': 'ひむろ', '星見': 'ほしみ', '火トカゲ': 'ひトカゲ', '天文塔': 'てんもんとう',
       '工房長': 'こうぼうちょう', '大広間': 'おおひろま', '召喚科': 'しょうかんか', '髪飾り': 'かみかざり', '耳飾り': 'みみかざり',
       '呪文': 'じゅもん', '唱えます': 'となえます', '西の国': 'にしのくに', '言い伝え': 'いいつたえ', 'お召し物': 'おめしもの'}

# free-talk topics (checked in this order; "yes" / "no" only after a yes-no question) — regexes over ja / en / zh
TOPICS = [
    ['leave', r'帰りたい|帰る|かえりたい|かえる|go home|going home|leave|回家|回去|想回'],
    ['thanks', r'ありがと|有難|感謝|thank|谢谢|感谢|多谢'],
    ['future', r'未来|みらい|スマホ|携帯|電車|電話|飛行機|ひこうき|インターネット|ネット|future|phone|internet|computer|car|train|plane|airplane|手机|网络|电脑|电话|飞机'],
    ['magic', r'魔法|まほう|魔女|ほうき|箒|召喚|錬金|呪文|杖|magic|witch|broom|spell|wand|alchemy|summon|魔法|扫帚|召唤|炼金|咒语|魔杖'],
    ['food', r'ココア|甘い|あまい|お菓子|おかし|ケーキ|チョコ|お茶|紅茶|クッキー|食べ|たべ|おいし|美味|cocoa|sweet|cake|chocolate|tea|cookie|biscuit|eat|delicious|可可|甜|点心|蛋糕|巧克力|茶|饼干|吃|好吃'],
    ['sleep', r'眠|寝|ねむ|ねる|sleep|tired|dream|nap|睡|困|梦|累'],
    ['cold', r'寒|さむ|冷|つめた|氷|こおり|風|かぜ|あったか|暖|温|cold|ice|wind|warm|freez|chill|冷|冰|风|暖|热|冻'],
    ['praise', r'かわいい|可愛|きれい|綺麗|すごい|凄い|かっこい|好き|すき|美人|cute|pretty|beautiful|cool|amazing|love|like you|lovely|可爱|漂亮|好看|厉害|帅|喜欢|美'],
    ['name', r'名前|なまえ|name|名字|叫什么|你是谁'],
    ['no', r'いいえ|いや|ちがう|違う|ううん|ない|no\b|nope|not|不|没有'],
    ['yes', r'はい|うん|そう|ええ|もちろん|ほんと|本当|ある|見える|yes|yeah|yep|sure|of course|really|是|对|嗯|当然|真的|有'],
]
YN_ONLY = ['yes', 'no']
CAST = 'TCL'
BRIDGES = {c: {k: f'b{c.lower()}_{k}' for k in ['future', 'magic', 'food', 'cold', 'sleep', 'praise', 'name', 'thanks', 'leave', 'yes', 'no', 'silence']
               if f'b{c.lower()}_{k}' in L} for c in CAST}
for c in CAST: BRIDGES[c]['generic'] = [f'b{c.lower()}_gen1', f'b{c.lower()}_gen2']

# the story as data: steps → beats. A beat = a line [id, position] · an interaction {…} · an '@event' (a real warm / cool thing,
# project/thermal_plan.json) · ['window', who, question id] (free-talk window). Positions: front / near / left / right / left_ear /
# right_ear / behind_front (on the broom: her head in front-left of you). The page builder turns this into main.js.
STEPS = [
    {'id': 'hall', 'ja': '召喚の大広間', 'en': 'The summoning hall', 'zh': '召唤大厅', 'view': ['hall_T'], 'beats': [
        ['@hall'], ['@circle'], ['t01', 'front'], ['t02', 'front'],
        {'type': 'choice', 'ask': None, 'options': [{'ja': 'ドラゴンじゃないです', 'en': "I'm not a dragon", 'zh': '我不是龙', 'then': ['t03a', 't03b']},
                                                    {'ja': 'ここ、どこ？', 'en': 'Where am I?', 'zh': '这是哪里？', 'then': ['t03b']}]},
        ['t03c', 'front'], ['t04', 'front'], ['t05', 'near'], ['t06', 'near'], ['@lean_left'], ['t07', 'left_ear'], ['t08', 'front'],
        {'type': 'action', 'ja': 'ほうきに乗る', 'en': 'Get on the broom', 'zh': '坐上扫帚'}]},
    {'id': 'sky', 'ja': '学院の上空', 'en': 'Above the academy', 'zh': '学院上空', 'view': ['sky_T'], 'beats': [
        ['@takeoff'], ['t09', 'behind_front'], ['@cruise'], ['t10', 'behind_front'], ['t11', 'behind_front'],
        {'type': 'choice', 'options': [{'ja': 'もっと速く！', 'en': 'Faster!', 'zh': '再快一点！', 'then': ['t12a']},
                                       {'ja': 'ゆっくりで…', 'en': 'Slowly, please…', 'zh': '慢一点…', 'then': ['t12b']}]},
        {'type': 'hold', 'ja': 'しがみつく（長押し）', 'en': 'Hold on tight (press and hold)', 'zh': '抓紧（长按）', 'event': '@dive', 'secs': 4,
         'let_go': ['t13x']},
        ['t14', 'behind_front'], ['t15', 'behind_front'], ['@turn_left'], ['@cruise'],
        ['window', 'T', 't16'], ['@descend'], ['t17', 'behind_front']]},
    {'id': 'lab', 'ja': '錬金工房', 'en': 'The alchemy workshop', 'zh': '炼金工房', 'view': ['lab_C', 'lab_C_ear'], 'beats': [
        ['@lab'], ['c01', 'front'], ['t18', 'left'], ['c02', 'front'], ['c03', 'front'], ['c04', 'front'], ['@flare'], ['c05', 'front'],
        ['c06', 'near'], ['@mug_right'], ['c07', 'right_ear'], ['c08', 'right_ear'], ['@blow_right'], ['c09', 'right_ear'],
        {'type': 'say', 'ja': '「いただきます」', 'en': '"Itadakimasu"', 'zh': '「我开动了」'},
        ['@sip'], ['c10', 'near'], ['c11', 'right_ear'], ['window', 'C', 'c12'], ['c13', 'near']]},
    {'id': 'tower', 'ja': '塔の上の夜のお茶会', 'en': 'Night tea at the top of the tower', 'zh': '塔顶的夜间茶会', 'view': ['tower_L', 'tower_L_ear'], 'beats': [
        ['@tower'], ['l01', 'front'], ['l02', 'front'], ['l03', 'front'], ['@crystal_show'], ['l04', 'front'], ['l05', 'near'],
        {'type': 'hold', 'ja': 'じっとする（長押し）', 'en': 'Hold still (press and hold)', 'zh': '别动（长按）', 'event': '@orbit', 'secs': 6, 'let_go': ['l06x']},
        ['l07', 'left_ear'], ['@into_glass'], ['l08', 'near'],
        {'type': 'choice', 'options': [{'ja': 'きれい', 'en': 'Beautiful', 'zh': '好美', 'then': ['l09a']},
                                       {'ja': 'つめたい！', 'en': 'Cold!', 'zh': '好冰！', 'then': ['l09b']}]},
        ['@lean_right'], ['l10', 'right_ear'], ['window', 'L', 'l11']]},
    {'id': 'dawn', 'ja': '夜明けの塔', 'en': 'Dawn on the tower', 'zh': '黎明的塔顶', 'view': ['dawn_3'], 'beats': [
        ['@sunrise'], ['t19', 'left'], ['c14', 'right'], ['l12', 'front'],
        {'type': 'choice', 'ending': True, 'options': [
            {'ja': '椿の髪飾り', 'en': "Tsubaki's camellia ornament", 'zh': '椿的山茶花发饰', 'then': ['t20'], 'who': 'T', 'ear': 'left_ear', 'token': '🌺'},
            {'ja': 'ココアのリボン', 'en': "Cocoa's ribbon", 'zh': '可可的缎带', 'then': ['c15'], 'who': 'C', 'ear': 'right_ear', 'token': '🎀'},
            {'ja': 'ルナの耳飾り', 'en': "Luna's moon earring", 'zh': '露娜的月亮耳坠', 'then': ['l13'], 'who': 'L', 'ear': 'right_ear', 'token': '🌙'}]}]},
]
# もっと話す · place × cast (like Demo43): per place the beats for each cast, '@event' = a real warm / cool thing there, own topic + bridges
PLACES = {
    'hall': {'ja': '召喚の大広間', 'en': 'The summoning hall', 'zh': '召唤大厅', 'icon': '✨',
             'topic': ['circle', r'魔法陣|まほうじん|光|ひかり|火鉢|ひばち|石|circle|light|glow|brazier|stone|魔法阵|光|火盆|石头'],
             'cast': {'T': [[['ht1', 'front']], [['ht2', 'front']], [['@brazier'], ['ht3', 'near']], [['t05', 'near']], [['ht4', 'left_ear']]],
                      'C': [[['hc1', 'front']], [['@brazier'], ['bc_p_circle', 'near']], [['hc2', 'right_ear']]],
                      'L': [[['hl1', 'front']], [['bl_p_circle', 'near']], [['hl2', 'right_ear']]],
                      'TCL': [[['tt1', 'front'], ['hc1', 'right']], [['ht2', 'left']], [['@brazier'], ['hl1', 'front']], [['hc2', 'right_ear'], ['ht4', 'left_ear']]]}},
    'sky': {'ja': '学院の上空', 'en': 'Above the academy', 'zh': '学院上空', 'icon': '🧹',
            'topic': ['wind', r'風|かぜ|空|そら|高い|たかい|速|はや|ほうき|wind|sky|high|fast|speed|broom|风|天空|高|快|扫帚'],
            'cast': {'T': [[['@cruise'], ['st1', 'behind_front']], [['st2', 'behind_front']], [['@turn_left'], ['st3', 'behind_front']], [['t16', 'behind_front']], [['st4', 'behind_front']]],
                     'C': [[['@cruise'], ['sc1', 'behind_front']], [['bc_p_wind', 'behind_front']], [['sc2', 'behind_front']]],
                     'L': [[['@cruise'], ['sl1', 'behind_front']], [['@cloak'], ['sl2', 'behind_front']], [['l11', 'behind_front']]],
                     'TCL': [[['st1', 'front'], ['sc1', 'right']], [['@turn_left'], ['sl1', 'left']], [['st2', 'front']], [['@cloak'], ['sl2', 'left']]]}},
    'lab': {'ja': '錬金工房', 'en': 'The alchemy workshop', 'zh': '炼金工房', 'icon': '⚗️',
            'topic': ['lab', r'かまど|釜|鍋|なべ|火|ひ|氷室|ひむろ|湯気|ゆげ|錬金|furnace|cauldron|pot|fire|steam|ice box|cabinet|alchemy|炉|锅|火|冰柜|蒸汽|炼金'],
            'cast': {'C': [[['lc1', 'front']], [['@flare'], ['lc2', 'front']], [['lc3', 'front']], [['@mug_right'], ['lc4', 'near']], [['lc5', 'right_ear']]],
                     'T': [[['lt1', 'front']], [['@flare'], ['bt_p_lab', 'near']], [['lt2', 'left_ear']]],
                     'L': [[['ll1', 'front']], [['@crystal_show'], ['bl_p_lab', 'near']], [['ll2', 'right_ear']]],
                     'TCL': [[['lc1', 'front'], ['lt1', 'left']], [['@flare'], ['lc2', 'front']], [['ll1', 'right']], [['@mug_right'], ['lc5', 'right_ear']]]}},
    'tower': {'ja': '塔の上のお茶会', 'en': 'Tea at the top of the tower', 'zh': '塔顶茶会', 'icon': '🌙',
              'topic': ['tower', r'暖炉|だんろ|窓|まど|星|ほし|月|つき|氷|こおり|お茶|fireplace|fire|window|star|moon|ice|tea|壁炉|窗|星星|月亮|冰|茶'],
              'cast': {'L': [[['wl1', 'front']], [['wl2', 'front']], [['@orbit'], ['wl3', 'near']], [['wl4', 'near']], [['wl5', 'right_ear']]],
                       'T': [[['wt1', 'front']], [['bt_p_tower', 'near']], [['wt2', 'left_ear']]],
                       'C': [[['wc1', 'front']], [['@crystal_show'], ['bc_p_tower', 'near']], [['wc2', 'right_ear']]],
                       'TCL': [[['wl1', 'front'], ['wc1', 'right']], [['wt1', 'left']], [['@orbit'], ['wl3', 'front']], [['wt2', 'left_ear'], ['wl5', 'right_ear']]]}},
    'dawn': {'ja': '夜明けの塔', 'en': 'Dawn on the tower', 'zh': '黎明的塔顶', 'icon': '🌅',
             'topic': ['dawn', r'朝日|あさひ|朝|日の出|太陽|まぶし|魔法陣|sun|sunrise|dawn|morning|bright|circle|太阳|日出|朝阳|早上|魔法阵'],
             'cast': {'TCL': [[['tt1', 'left'], ['@sunrise'], ['tt2', 'right']], [['tt3', 'front']], [['tt4', 'left']], [['tt5', 'right'], ['tt6', 'front']]],
                      'T': [[['@sunrise'], ['dt1', 'near']], [['t19', 'near']], [['tt4', 'near']], [['t20', 'left_ear']]],
                      'C': [[['@sunrise'], ['dc1', 'near']], [['c14', 'near']], [['tt5', 'right_ear']]],
                      'L': [[['@sunrise'], ['dl1', 'near']], [['l12', 'near']], [['tt6', 'right_ear']]]}},
}
for pl, P in PLACES.items():
    k = P['topic'][0]; P['bridges'] = {c: {k: [f'b{c.lower()}_p_{k}']} for c in CAST if f'b{c.lower()}_p_{k}' in L}
NAMES = {'椿': {'en': 'Tsubaki', 'zh': '椿'}, 'ココア': {'en': 'Cocoa', 'zh': '可可'}, 'ルナ': {'en': 'Luna', 'zh': '露娜'}}
WHO = {'T': '椿', 'C': 'ココア', 'L': 'ルナ'}
VOICE = {'all': {   # same-meaning phrasings per answer (voice judging, guide §2.1)
    'ドラゴンじゃないです': ['我不是龙', '不是龙', 'not a dragon', "i'm not a dragon", 'ドラゴンじゃない', '竜じゃない', 'りゅうじゃない'],
    'ここ、どこ？': ['这是哪里', '这是哪', 'where am i', 'where is this', 'ここはどこ', 'どこ'],
    'ほうきに乗る': ['坐上扫帚', '上扫帚', '骑扫帚', 'get on', 'ride the broom', 'okay let us go', 'のる', '乗ります'],
    'もっと速く！': ['再快一点', '快一点', '更快', 'faster', 'go faster', 'speed up', 'はやく', 'もっとはやく'],
    'ゆっくりで…': ['慢一点', '慢慢来', '慢点', 'slowly', 'slow down', 'gently', 'ゆっくり', 'おそく'],
    '「いただきます」': ['我开动了', '开动了', '我要喝了', 'itadakimasu', "let's eat", 'thank you for the drink', 'いただきます'],
    'きれい': ['好美', '漂亮', '好漂亮', '真美', 'beautiful', 'pretty', 'so pretty', '綺麗', 'うつくしい'],
    'つめたい！': ['好冰', '好冷', '冰', 'cold', "it's cold", 'freezing', '冷たい', 'さむい'],
    '椿の髪飾り': ['椿', '发饰', '山茶花', '花', 'tsubaki', 'camellia', 'the flower', 'hair ornament', 'つばき', 'かみかざり'],
    'ココアのリボン': ['可可', '缎带', '丝带', 'cocoa', 'ribbon', 'the ribbon', 'ここあ', 'りぼん'],
    'ルナの耳飾り': ['露娜', '耳坠', '耳环', '月亮', 'luna', 'earring', 'moon', 'the moon', 'るな', 'みみかざり'],
}}
strip = lambda s: re.sub(r'\s+', ' ', re.sub(r'\[[^\]]*\]', '', s)).strip()
TAGGED = {k: v[1] for k, v in L.items()}


def spoken(tagged, lang='ja', lid=None):
    """Text sent to ElevenLabs: ja = tagged line with SAY readings; en / zh = that column (tags kept from the ja line) — for a
    later multilingual dub (voice.py --lang en|zh; not rendered now, user 2026-11-09: Japanese voices only)."""
    if lang == 'ja':
        for k, v in SAY.items(): tagged = tagged.replace(k, v)
        return tagged
    who, ja, en, zh = L[lid]; tags = re.findall(r'^\[[^\]]*\]', ja)
    return ((tags[0] + ' ') if tags else '') + (en if lang == 'en' else zh)


def check():
    used = set()
    def walk(b):
        if isinstance(b, dict):
            for o in b.get('options', []): used.update(o['then'])
            used.update(b.get('let_go', []))
        elif b and b[0] == 'window': used.add(b[2])
        elif b and not b[0].startswith('@'): used.add(b[0])
    for s in STEPS:
        for b in s['beats']: walk(b)
    for P in PLACES.values():
        for beats in P['cast'].values():
            for bt in beats:
                for it in bt:
                    if not it[0].startswith('@'): used.add(it[0])
    for c in CAST:
        for v in BRIDGES[c].values(): used.update(v if isinstance(v, list) else [v])
        for P in PLACES.values():
            for v in P['bridges'].get(c, {}).values(): used.update(v)
    missing = used - set(L); unused = set(L) - used
    assert not missing, missing
    return unused


if __name__ == '__main__':
    unused = check()
    if unused: print('note: lines not used anywhere:', sorted(unused))
    lines = {k: [strip(v[1]), v[2], v[0]] for k, v in L.items()}
    data = {'who': WHO, 'lines': lines, 'steps': STEPS, 'topics': TOPICS, 'yn_only': YN_ONLY, 'bridges': BRIDGES,
            'places': {k: {x: P[x] for x in ('ja', 'en', 'icon', 'topic', 'cast', 'bridges')} for k, P in PLACES.items()}}
    head = ("// 『まちがい召喚と、まほう学院の三人』 lines: id → [ja, en, who]  (T 椿 · C ココア · L ルナ). GENERATED by scripts/script_data.py — edit there.\n"
            "// steps: the story as data (beats, interactions, '@events' = project/thermal_plan.json, free-talk windows); bridges: who → topic → id;\n"
            "// topics: [key, regex] in order; places: もっと話す place × cast (beats per cast, own topic + bridges).\n")
    open(os.path.join(ROOT, 'lines.js'), 'w', encoding='utf-8').write(head + 'window.ACAD_LINES = ' + json.dumps(data, ensure_ascii=False, indent=1) + ';\n')
    zh = {strip(v[1]): v[3] for v in L.values()}
    json.dump(zh, open(os.path.join(ROOT, 'project', 'zh_lines.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    ui = {}
    for s in STEPS:
        ui[s['ja']] = s['zh']
        for b in s['beats']:
            if isinstance(b, dict):
                if 'ja' in b: ui[b['ja']] = b['zh']
                for o in b.get('options', []): ui[o['ja']] = o['zh']
    for P in PLACES.values(): ui[P['ja']] = P['zh']
    for k, v in NAMES.items(): ui[k] = v['zh']
    l10n = {'langs': ['en', 'ja', 'zh'], 'text': {'zh': {**zh, **ui}, 'ja': {}, 'en': {}}, 'names': NAMES, 'voice': VOICE}
    head = ("// Languages of this demo for ../../shared/subs.js and ../../shared/voice.js. GENERATED by scripts/script_data.py (pre-production:\n"
            "// lines + answers + names + voice phrasings; the build stage adds the cover / page texts) — edit there, not this file.\n")
    open(os.path.join(ROOT, 'l10n.js'), 'w', encoding='utf-8').write(head + 'window.MOHEAT_L10N = ' + json.dumps(l10n, ensure_ascii=False, indent=1) + ';\n')
    print(len(L), 'lines,', sum(len(strip(v[1])) for v in L.values()), 'ja chars,', len(ui), 'ui strings')
