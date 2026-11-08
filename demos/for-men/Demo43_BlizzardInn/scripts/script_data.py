#!/usr/bin/env python3
"""THE script of Demo43 『白嶺の峠、ひと晩の宿』 — one source for every line: the tagged Japanese (ElevenLabs v4 delivery tags), the
English and the 中文. `python3 scripts/script_data.py` writes ../lines.js (ja + en for the page, bridges, keep-talking beats, topics) and
the zh table read by scripts/make_l10n.py; scripts/voice.py reads TAGGED from here.

Who: M = ミント (mint r1_a), H = ひなた (hinata_s r1_b), N = 渚 (nagisa r1_b) — their confirmed ElevenLabs voices, unchanged.
Everyone speaks Japanese in this land (n04 says it once). Story (≈ 2:40 + three short free-talk windows):
 1 吹雪の峠 (Nagisa finds you) · 2 宿・火鍋 (Hinata: hotpot + dice, window ①) · 3 女医の手当て (Mint: moxa warm + mint balm cool on the
 SAME right ear, window ②) · 4 夜番 (the door bursts open, Nagisa stands on your left in the wind, window ③) · 5 夜明けの峠 (pick one
 token → her last whisper → you wake up in the present with it)."""
import json, os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# id: (who, tagged ja, en, zh)
L = {
    # ---- 1 吹雪の峠
    'n01': ('N', '[shouting] おい！ …おい、生きてるか！', 'Hey! …Hey, are you alive?!', '喂！…喂，你还活着吗！'),
    'n02': ('N', '[annoyed] …なんだその変な服。 どこの国のやつだ？', "…What's with those weird clothes? Where are you from?", '…你这身怪衣服是怎么回事。哪个国家来的？'),
    'n03a': ('N', '[sighs] …言われなくても、助けるっつーの。 …バカ。', "…I'd help you without being asked. …Idiot.", '…不用你说，我也会救你的。…笨蛋。'),
    'n03b': ('N', '[gruff] あたしは渚。 この峠で荷を守る、用心棒だ。 …で、あんたは迷子。', "I'm Nagisa. I guard the caravans on this pass. …And you're lost.", '我是渚。在这座山口护送货物的镖师。…而你，是迷路的人。'),
    'n04': ('N', '[surprised] …ていうか、言葉、通じるんだな。 [gruff] …ま、いいや。', '…Wait, we speak the same language. …Whatever.', '…话说，语言居然是通的。…算了，无所谓。'),
    'n05': ('N', '[gruff] ほら、手。 …つかまれ。', 'Here. Your hand. …Grab on.', '来，手。…抓住。'),
    'n06': ('N', '[surprised] …つめてっ。 [gruff] …これ、羽織ってろ。', '…You\'re ice-cold. …Put this on.', '…好冰。…把这个披上。'),
    'n07': ('N', '[gruff] 下に宿がある。 …背負ってくから、黙ってつかまってろ。', "There's an inn below. …I'll carry you, so shut up and hold on.", '下面有家客栈。…我背你下去，闭嘴抓紧。'),
    # ---- 2 宿・火鍋
    'h01': ('H', '[excited] いらっしゃーい！ …って、渚！ また拾いもの？', 'Welcome! …Oh, Nagisa! Picked up another stray?', '欢迎光临——！…咦，渚！又捡东西回来了？'),
    'n08': ('N', '[gruff] 峠に落ちてた。 …ひなた、なんか温かいもん。', 'Found him lying on the pass. …Hinata, something hot.', '在山口捡到的。…日向，来点热的。'),
    'h02': ('H', '[cheerful] まかせて！ 雪見亭名物、ぐつぐつ火鍋！ はい、湯気ごとどうぞ！', "Leave it to me! Yukimi Inn's famous bubbling hotpot! Here — steam and all!", '包在我身上！雪见亭招牌，咕嘟咕嘟的火锅！来，连热气一起享用吧！'),
    'h03': ('H', '[playful] でも、タダじゃないよ？ …うちはね、勝負で払うの！', "But it isn't free, you know? …Here, you pay with a bet!", '不过，可不是免费的哦？…我们这儿，用赌局来付账！'),
    'h04': ('H', '[excited] 大か、小か！ さあ、どっち！', 'Big or small! Come on, which is it?', '大还是小！来，选哪个！'),
    'h05a': ('H', '[pouting] うそっ、負けた！？ …今のなし！ [laughs] …なーんてね。 はい、熱々のスープ、勝った人から！', "No way, I lost?! …That didn't count! …Just kidding. Here — scalding soup, winner first!", '不会吧，我输了！？…刚才不算！…开玩笑的啦。来，滚烫的汤，赢的人先喝！'),
    'h05b': ('H', '[laughs] あっはは！ あたしの勝ちー！ 負けたほうは、熱々のスープ、一気飲みね！', 'Ahaha! I win! The loser drinks the scalding soup in one go!', '啊哈哈！我赢啦——！输的人，把滚烫的汤一口气喝掉！'),
    'h06': ('H', '[whispers] …ねえ。 今の、ほんとはね、サイコロ、ちょっといじってたの。 …ないしょね。', "…Hey. Truth is, I fiddled with the dice a bit just now. …Keep it secret.", '…呐。其实刚才，骰子我稍微动了点手脚。…要保密哦。'),
    'h07': ('H', '[laughs] あはは、顔、真っ赤！ [curious] …ねえ、未来の人って、どんな勝負するの？', 'Ahaha, your face is bright red! …Hey, what kind of games do people play in the future?', '啊哈哈，脸好红！…呐，未来的人，都玩什么样的游戏？'),
    'n09': ('N', '[gruff] …ひなた。 そいつ、耳が真っ白だ。 ミント先生、呼んでこい。', "…Hinata. His ears are white. Go get Doctor Mint.", '…日向。这家伙耳朵冻得发白了。去叫薄荷大夫来。'),
    'h08': ('H', '[shouting] はーい！ ミント先生ー！ 起きてー！', 'Okay! Doctor Mint! Wake up!', '好——！薄荷大夫——！快起来——！'),
    # ---- 3 女医の手当て
    'm01': ('M', '[sleepy] …ふぁ…。 …ん。 患者さん…？', '…Haah… …Mm. A patient…?', '…呼啊…。…嗯。病人…？'),
    'm02': ('M', '[softly] …わたし、ミント。 旅のお医者さん…。 寝てても治せるから、だいじょうぶ…。', "…I'm Mint. A travelling doctor… I can heal you even half asleep, so don't worry…", '…我是薄荷。四处行医的大夫…。睡着了也能治病，放心吧…。'),
    'm03': ('M', '[softly] …あら。 耳、冷えきってる…。 しもやけに、なりかけ…。', '…Oh. Your ears are frozen through… nearly frostbitten…', '…哎呀。耳朵冻透了…。快要冻伤了…。'),
    'm04': ('M', '[whispers] …お灸、するね。 少し離して、くるくる…。 …あったかいでしょ。', "…I'll do moxa. Held a little away, round and round… …Warm, isn't it.", '…给你做艾灸。稍微离远一点，一圈一圈…。…很暖和吧。'),
    'm05': ('M', '[whispers] …それと、薄荷の軟膏。 …すーっとするよ。', '…And some mint balm. …It feels cool.', '…还有，薄荷膏。…会凉凉的哦。'),
    'm06': ('M', '[softly] …あったかいのと、つめたいの。 いっしょだと、血がめぐるの…。 …動かないでね。', "…Warm and cool together get the blood flowing… …Don't move.", '…暖的和凉的，一起用，血就会流通…。…别动哦。'),
    'm07x': ('M', '[softly] …あ、動いた…。 …もういっかい、ね…。', '…Ah, you moved… …Once more…', '…啊，动了…。…再来一次哦…。'),
    'm07': ('M', '[whispers] …いい子。 …ふーっ。', '…Good. …Fuu.', '…乖。…呼——。'),
    'm08': ('M', '[softly] …こっちの耳も…。 …目、閉じてて…。', '…This ear too… …Close your eyes…', '…这边的耳朵也…。…把眼睛闭上…。'),
    'm09': ('M', '[whispers] …眠くなったら、寝ていいよ…。 わたしも、ちょっと…ねむい…。', "…If you get sleepy, you can sleep… I'm a little… sleepy too…", '…困了的话，睡也没关系哦…。我也，有点…困…。'),
    'm10': ('M', '[softly] …ふふ。 未来の人も、耳はおんなじ…。 …ねえ、未来では、よく眠れてる…？', '…Heh. Future people have the same ears… …Tell me, do you sleep well in the future…?', '…呵呵。未来的人，耳朵也一样呢…。…呐，在未来，你睡得好吗…？'),
    # ---- 4 夜番
    'n10': ('N', '[shouting] っ…戸が！', 'Tch… the door!', '啧…门！'),
    'n11': ('N', '[gruff] …風、こっちから来る。 あたしの後ろにいろ。', "…The wind's coming from this side. Stay behind me.", '…风从这边来。待在我后面。'),
    'n12': ('N', '[softly] …あんた、変なやつだな。 未来から来たって…ほんとか？', '…You\'re a strange one. From the future… seriously?', '…你这人真奇怪。说是从未来来的…真的吗？'),
    'n13': ('N', '[softly] …あたしさ、ずっと誰かを守ってばっかで。 …守られたこと、ないんだ。', "…I've always been the one guarding someone. …Nobody's ever guarded me.", '…我啊，一直都在保护别人。…从来没被谁保护过。'),
    'n14': ('N', '[curious] …未来じゃ、こういうとき、なんて言うんだ？', '…What do people say at times like this, in the future?', '…在未来，这种时候，会说什么？'),
    'n15a': ('N', '[embarrassed] …おつかれ、さま。 …へへ。 なんか、いいな、それ。', '…Otsukare-sama — "thanks for your hard work." …Heh. I kinda like that.', '…辛苦了。…嘿嘿。这句话，挺好的。'),
    'n15b': ('N', '[embarrassed] …っ、礼なんかいいって。 …バカ。 [softly] …でも、ありがと。', "…Don't thank me. …Idiot. …But, thanks.", '…啧，不用谢啦。…笨蛋。…不过，谢谢。'),
    'n16': ('N', '[whispers] …朝まで、ここにいる。 …寝ていいぞ。', "…I'll stay right here till morning. …You can sleep.", '…我会在这里待到天亮。…你睡吧。'),
    # ---- 5 夜明けの峠
    'h09': ('H', '[excited] 晴れたー！ 峠、越えられるよ！', "It's cleared up! You can cross the pass!", '放晴啦——！可以翻过山口了！'),
    'm11': ('M', '[sleepy] …あの門をくぐったら…たぶん、帰れる…。', '…Go through that gate… and you can probably go home…', '…穿过那道门…大概，就能回去了…。'),
    'n17': ('N', '[gruff] …ほら、最後に。 誰かひとつ、持ってけ。', "…Here. Before you go — take something from one of us.", '…喂，最后。从我们谁那儿，拿一样走吧。'),
    'm12': ('M', '[whispers] …星の簪。 …眠れない夜は、これ、にぎってね。 …夢で、また診てあげる。', "…My star hairpin. …On nights you can't sleep, hold it. …I'll treat you again in your dreams.", '…星星发簪。…睡不着的夜里，就握着它。…在梦里，我再给你看病。'),
    'h10': ('H', '[whispers] …あたしのサイコロ！ …次に会ったら、ぜったい勝つから。 …待ってて、ね？', "…My dice! …Next time we meet, I'm winning for sure. …Wait for me, okay?", '…我的骰子！…下次见面，我一定会赢。…等着我哦？'),
    'n18': ('N', '[whispers] …髪紐。 …なくすなよ。 …今度は、あたしがあんたの国に、迎えに行くから。', "…My hair tie. …Don't lose it. …Next time, I'll come to your country to get you.", '…发绳。…别弄丢了。…下次，换我去你的国家接你。'),
    # ---- bridges (free-talk windows): one per topic and character
    'bm_future': ('M', '[sleepy] …すまほ…？ ふしぎな言葉…。 未来のお薬、いつか教えてね…。', "…Smartphone…? What a strange word… Teach me future medicine someday…", '…手机…？好奇怪的词…。未来的药，哪天教教我吧…。'),
    'bm_game': ('M', '[softly] …勝負は、ひなたちゃんの担当…。 わたしは、見てるだけ…。', "…Games are Hinata's thing… I just watch…", '…赌局是日向负责的…。我只在旁边看…。'),
    'bm_food': ('M', '[softly] …ひなたちゃんのお鍋、おいしいよね…。 生姜が入ってて、からだがあったまるの…。', "…Hinata's hotpot is good, isn't it… there's ginger in it, it warms you up…", '…日向的火锅很好吃吧…。放了生姜，身子会暖起来…。'),
    'bm_cold': ('M', '[softly] …寒いの、つらいよね…。 冷えは、耳から来るの…。 だから、耳はたいせつにね…。', '…The cold is hard, isn\'t it… The chill comes in through the ears… so take care of them…', '…冷很难受吧…。寒气是从耳朵进来的…。所以要好好保护耳朵哦…。'),
    'bm_sleep': ('M', '[sleepy] …ねむい…？ わかる…。 わたしも、ずっとねむい…。', '…Sleepy…? I know… I\'m always sleepy too…', '…困了…？我懂…。我也一直很困…。'),
    'bm_praise': ('M', '[softly] …ふふ…。 ほめても、お薬は甘くならないよ…。', "…Heh… Flattery won't make the medicine any sweeter…", '…呵呵…。夸我，药也不会变甜哦…。'),
    'bm_name': ('M', '[softly] …ミント。 薄荷の、ミント…。 すーっとする、あれ…。', '…Mint. Mint as in peppermint… the cool one…', '…薄荷。就是薄荷的那个…。凉凉的那个…。'),
    'bm_thanks': ('M', '[softly] …どういたしまして…。 お代は、ぐっすり眠ること…。', "…You're welcome… The fee is a good night's sleep…", '…不客气…。诊费嘛，就是好好睡一觉…。'),
    'bm_leave': ('M', '[softly] …帰りたいよね…。 でも、今夜は休まないと…。 峠は、朝まで待って…。', "…You want to go home… But tonight you need rest… Wait for the pass until morning…", '…想回家吧…。可是今晚得先休息…。山口，等到天亮再说…。'),
    'bm_yes': ('M', '[softly] …よかった…。 眠れるのが、いちばんのお薬…。', "…Good… Sleep is the best medicine…", '…太好了…。能睡好，就是最好的药…。'),
    'bm_no': ('M', '[softly] …そう…。 じゃあ今夜は、ぐっすり眠らせてあげる…。', "…I see… Then tonight I'll make sure you sleep soundly…", '…这样啊…。那今晚，我让你好好睡一觉…。'),
    'bm_gen1': ('M', '[softly] …ん…。 そっか…。 …ちゃんと、聞いてるよ…。', '…Mm… I see… …I\'m listening…', '…嗯…。这样啊…。…我有在听哦…。'),
    'bm_gen2': ('M', '[sleepy] …ふぁ…。 ごめんね、ちょっと、うとうと…。 …うん、そうだね…。', "…Haah… Sorry, I dozed off a little… …Mm, you're right…", '…呼啊…。对不起，有点打瞌睡…。…嗯，说得对…。'),
    'bm_silence': ('M', '[softly] …しずか…。 …それも、いいね…。', "…Quiet… …That's nice too…", '…好安静…。…这样也不错呢…。'),
    'bh_future': ('H', '[excited] へえー！ 未来って、そんなのあるの！？ …でも勝負なら、あたし負けないよ！', "Whoa! The future has stuff like that?! …But in a game, I won't lose!", '哇——！未来还有那种东西！？…不过比输赢的话，我可不会输！'),
    'bh_game': ('H', '[excited] 勝負！？ いいね、乗った！ …あとで、もう一回やろ！', "A game?! Nice, I'm in! …Let's play again later!", '比一局！？好啊，我奉陪！…待会儿再来一次！'),
    'bh_food': ('H', '[cheerful] でしょー！ うちの鍋は峠いち！ おかわりもあるよ！', "Right?! Our hotpot is the best on the pass! There's seconds too!", '对吧——！我们的火锅是山口第一！还可以再添哦！'),
    'bh_cold': ('H', '[laughs] あはは、外は吹雪だもんね！ ここにいれば、あったかいって！', "Ahaha, it's a blizzard out there! In here you'll stay warm!", '啊哈哈，外面在下暴风雪嘛！待在这里就暖和了！'),
    'bh_sleep': ('H', '[playful] えー、もう眠いの？ 夜はこれからだよ！', 'Eh, sleepy already? The night is just starting!', '诶——，已经困了？夜晚才刚开始呢！'),
    'bh_praise': ('H', '[flustered] え、えへへ…。 …ほめても、サイコロは手加減しないからね！', "Eh, ehehe… …Flattery won't make me go easy with the dice!", '诶、嘿嘿…。…夸我也没用，骰子可不会手下留情！'),
    'bh_name': ('H', '[cheerful] あたし、ひなた！ この雪見亭の看板娘、兼、胴元！', "I'm Hinata! The face of Yukimi Inn — and the house dealer!", '我是日向！雪见亭的招牌姑娘，兼庄家！'),
    'bh_thanks': ('H', '[cheerful] いいって、いいって！ 困ったときは、おたがいさま！', "It's nothing, nothing! We all help each other in a pinch!", '没事没事！有困难的时候，大家互相帮忙嘛！'),
    'bh_leave': ('H', '[softly] …帰りたいか。 …だよね。 [cheerful] 峠が晴れたら、あたしが送り出してあげる！', "…You want to go home. …Of course. When the pass clears, I'll see you off!", '…想回家啊。…也是呢。等山口放晴了，我来送你！'),
    'bh_gen1': ('H', '[laughs] あはは、なにそれ！ あんた、おもしろいね！', "Ahaha, what's that! You're funny!", '啊哈哈，那是什么！你这人真有意思！'),
    'bh_gen2': ('H', '[curious] ふーん…？ よくわかんないけど、まあいっか！', "Hmm…? I don't really get it, but whatever!", '嗯——…？不太懂，不过算了！'),
    'bh_silence': ('H', '[playful] あれ、照れてる？ …いいよいいよ、あたしがしゃべるから！', "Huh, shy? …That's fine, I'll do the talking!", '咦，害羞了？…没事没事，我来说就好！'),
    'bn_future': ('N', '[gruff] …すまほ？ 知らねえ。 [softly] …でも、あんたの国、ちょっと見てみたい気もする。', "…Smartphone? Never heard of it. …But I kinda want to see your country.", '…手机？不知道。…不过，有点想去你的国家看看。'),
    'bn_game': ('N', '[sighs] …ひなたの勝負には乗るなよ。 あいつ、イカサマするから。', "…Don't take Hinata's bets. She cheats.", '…别跟日向赌。那家伙会出老千。'),
    'bn_food': ('N', '[gruff] …食えるうちに食っとけ。 峠じゃ、それが一番大事だ。', "…Eat while you can. On the pass, that's what matters most.", '…能吃的时候就多吃点。在山口，这比什么都重要。'),
    'bn_cold': ('N', '[gruff] 寒いなら、もっとこっち寄れ。 [embarrassed] …べ、別に変な意味じゃねえ。', "If you're cold, come closer. …I-it doesn't mean anything weird.", '冷的话，往我这边靠一点。…我、我可没别的意思。'),
    'bn_sleep': ('N', '[softly] …眠いなら寝ろ。 見張りは、あたしの仕事だ。', "…If you're sleepy, sleep. Keeping watch is my job.", '…困了就睡。守夜是我的活儿。'),
    'bn_praise': ('N', '[embarrassed] …っ、なに言ってんだ、バカ。', "…Tch, what are you saying, idiot.", '…啧，你在胡说什么，笨蛋。'),
    'bn_name': ('N', '[gruff] 渚だ。 …二回も言わせんな。', "Nagisa. …Don't make me say it twice.", '渚。…别让我说第二遍。'),
    'bn_thanks': ('N', '[embarrassed] …礼なんかいらねえよ。 仕事だ、仕事。', "…No need to thank me. It's my job, that's all.", '…不用谢。这是工作，工作而已。'),
    'bn_leave': ('N', '[softly] …帰りたいよな。 …わかってる。 朝になったら、峠まで連れてってやる。', "…You want to go home. …I know. In the morning I'll take you up to the pass.", '…想回去吧。…我知道。天亮了，我带你到山口。'),
    'bn_yes': ('N', '[surprised] …マジかよ。 [softly] …いや、あんたが嘘つくやつには、見えねえ。', "…No way. …No — you don't look like someone who lies.", '…真的假的。…不，你看起来不像会说谎的人。'),
    'bn_no': ('N', '[gruff] …だよな。 [curious] …でも、その服は、どう見てもこの辺のじゃねえ。', "…Figured. …But those clothes sure aren't from around here.", '…我就说嘛。…可是你那身衣服，怎么看都不是这一带的。'),
    'bn_gen1': ('N', '[gruff] …ふーん。 …変なやつ。', '…Huh. …Weirdo.', '…哼。…怪人。'),
    'bn_gen2': ('N', '[sighs] …あんたの話、半分もわかんねえ。 [softly] …でも、まあ、聞いてやる。', "…I don't get half of what you say. …But fine, I'll listen.", '…你说的我一半都听不懂。…不过，算了，我听着。'),
    'bn_silence': ('N', '[softly] …黙ってると、風の音しか聞こえねえな。', '…When we\'re quiet, all you hear is the wind.', '…一安静下来，就只听得见风声了。'),
    # ---- もっと話す · keep talking (after the story; the scripted version of the live talk)
    'tm1': ('M', '[sleepy] …あら。 また来たの…？ 耳、もういっかい、診てあげる…。', '…Oh. You came back…? I\'ll look at your ears once more…', '…哎呀。又来了…？耳朵，我再给你看看…。'),
    'tm2': ('M', '[softly] …この薬箱ね、お師匠さまにもらったの。 引き出しが、四十八こ…。', '…I got this medicine box from my teacher. Forty-eight little drawers…', '…这个药箱，是师父给我的。抽屉有四十八个…。'),
    'tm3': ('M', '[whispers] …薄荷は北の谷、もぐさは南の野原…。 旅をしながら、集めるの…。', '…Mint from the northern valleys, mugwort from the southern fields… I gather them as I travel…', '…薄荷采自北边的山谷，艾草采自南边的原野…。一边旅行一边收集…。'),
    'tm4': ('M', '[curious] …あなたの国には、どんな薬草があるの…？', '…What herbs grow in your country…?', '…你的国家，有什么样的草药呢…？'),
    'tm5': ('M', '[whispers] …今日は、おしまい…。 …おやすみ。 いい夢、見てね…。', "…That's all for today… …Good night. Sweet dreams…", '…今天就到这里…。…晚安。做个好梦…。'),
    'th1': ('H', '[excited] あ、来た来た！ よーし、今夜も勝負だよ！', "Oh, there you are! Alright, tonight we play again!", '啊，来了来了！好——，今晚也来一局！'),
    'th2': ('H', '[playful] このサイコロね、母ちゃんの形見なんだ。 …だから、負けるわけにいかないの！', "These dice were my mum's. …So I can't afford to lose!", '这对骰子，是我娘留下的。…所以，我可不能输！'),
    'th3': ('H', '[cheerful] 雪見亭はね、峠でいちばんあったかい宿！ 鍋の火は、ひと晩じゅう消さないんだから！', "Yukimi Inn is the warmest inn on the pass! The hotpot fire stays lit all night!", '雪见亭可是山口最暖和的客栈！火锅的火，一整晚都不会熄！'),
    'th4': ('H', '[curious] ねえ、未来にも宿屋ってある？ うちより楽しい？', 'Hey, are there inns in the future too? More fun than ours?', '呐，未来也有客栈吗？比我们这儿好玩吗？'),
    'th5': ('H', '[whispers] …また来てね。 次は、イカサマなしで勝負しよ？', "…Come again. Next time, let's play with no cheating?", '…还要再来哦。下次，我们不出老千地比一局？'),
    'tn1': ('N', '[gruff] …なんだ、また起きてきたのか。 …座れよ。', '…What, up again? …Sit.', '…怎么，又起来了？…坐吧。'),
    'tn2': ('N', '[softly] この棒な、ガキのころ親父にもらった。 …刃物より、人を傷つけなくていい。', "My dad gave me this staff when I was a kid. …Better than a blade — it doesn't kill.", '这根棍子，是我小时候我爹给的。…比刀好，不会伤人性命。'),
    'tn3': ('N', '[gruff] 峠の風は、左から来る。 …だから、あたしはいつも左に立つ。', "The wind on the pass comes from the left. …So I always stand on the left.", '山口的风从左边来。…所以，我总是站在左边。'),
    'tn4': ('N', '[curious] …あんたの国にも、こういう雪、降るのか？', '…Does snow like this fall in your country too?', '…你的国家，也会下这样的雪吗？'),
    'tn5': ('N', '[whispers] …もう寝ろ。 …ここに、いるから。', "…Go to sleep. …I'm right here.", '…快睡吧。…我就在这里。'),
    'tt1': ('H', '[excited] みんなで見送りに来たよー！', "We all came to see you off!", '大家一起来送你啦——！'),
    'tt2': ('M', '[softly] …朝日、あったかいね…。 帰る前に、すこしだけ、お話ししよ…。', '…The morning sun is warm… Let\'s talk a little before you go…', '…朝阳好暖和…。回去之前，再聊一会儿吧…。'),
    'tt3': ('N', '[gruff] …ほら。 言いたいことあんなら、今のうちに言っとけ。', "…Go on. If there's something you want to say, say it now.", '…喂。有什么想说的，趁现在说。'),
    'tt4': ('H', '[laughs] 未来に帰っても、雪見亭のこと、忘れないでね！', "Even back in the future, don't forget Yukimi Inn!", '回到未来以后，也别忘了雪见亭哦！'),
    'tt5': ('N', '[whispers] …またな。', '…See you.', '…再见。'),
    'tt6': ('M', '[whispers] …またね…。', '…Bye for now…', '…下次见…。'),
}

# free-talk topics (checked in this order; "yes" / "no" only after a yes-no question) — regexes over ja / en / zh
TOPICS = [
    ['leave', r'帰りたい|帰る|かえりたい|かえる|go home|going home|leave|回家|回去|想回'],
    ['thanks', r'ありがと|有難|感謝|thank|谢谢|感谢|多谢'],
    ['future', r'未来|みらい|スマホ|携帯|電車|電話|インターネット|ネット|ゲーム機|future|phone|internet|computer|car|train|手机|网络|电脑|电话'],
    ['game', r'勝負|ゲーム|賭け|かけ|サイコロ|遊|game|bet|dice|play|游戏|赌|骰子|比赛|玩'],
    ['food', r'鍋|なべ|スープ|ご飯|ごはん|食べ|たべ|おいし|美味|お腹|おなか|food|soup|hotpot|eat|delicious|hungry|火锅|汤|吃|好吃|饿|生姜'],
    ['sleep', r'眠|寝|ねむ|ねる|sleep|tired|dream|nap|睡|困|梦|累'],
    ['cold', r'寒|さむ|冷|つめた|雪|ゆき|あったか|暖|温|cold|snow|warm|freez|chill|冷|雪|暖|热|冻'],
    ['praise', r'かわいい|可愛|きれい|綺麗|すごい|凄い|かっこい|好き|すき|美人|cute|pretty|beautiful|cool|amazing|love|like you|lovely|可爱|漂亮|好看|厉害|帅|喜欢|美'],
    ['name', r'名前|なまえ|name|名字|叫什么|你是谁'],
    ['no', r'いいえ|いや|ちがう|違う|ううん|眠れない|no\b|nope|not|不|没有|睡不'],
    ['yes', r'はい|うん|そう|ええ|もちろん|ほんと|本当|眠れ|よく寝|yes|yeah|yep|sure|of course|really|是|对|嗯|当然|真的'],
]
YN_ONLY = ['yes', 'no']
BRIDGES = {c: {k: f'b{c.lower()}_{k}' for k in ['future', 'game', 'food', 'cold', 'sleep', 'praise', 'name', 'thanks', 'leave', 'yes', 'no', 'silence']
               if f'b{c.lower()}_{k}' in L} for c in 'MHN'}
for c in 'MHN': BRIDGES[c]['generic'] = [f'b{c.lower()}_gen1', f'b{c.lower()}_gen2']
# keep talking: per who, beats (lists of [id, position]); your turn after each beat but the last
TALK = {
    'M': [[['tm1', 'near']], [['tm2', 'near']], [['tm3', 'right_ear']], [['tm4', 'near']], [['tm5', 'right_ear']]],
    'H': [[['th1', 'front']], [['th2', 'front']], [['th3', 'front']], [['th4', 'near']], [['th5', 'right_ear']]],
    'N': [[['tn1', 'left']], [['tn2', 'left']], [['tn3', 'left']], [['tn4', 'left']], [['tn5', 'left_ear']]],
    'MHN': [[['tt1', 'front'], ['tt2', 'right']], [['tt3', 'left']], [['tt4', 'front']], [['tt5', 'left'], ['tt6', 'right']]],
}
strip = lambda s: re.sub(r'\s+', ' ', re.sub(r'\[[^\]]*\]', '', s)).strip()
TAGGED = {k: v[1] for k, v in L.items()}

if __name__ == '__main__':
    lines = {k: [strip(v[1]), v[2], v[0]] for k, v in L.items()}
    data = {'lines': lines, 'topics': TOPICS, 'yn_only': YN_ONLY, 'bridges': BRIDGES, 'talk': TALK}
    head = ("// 『白嶺の峠、ひと晩の宿』 lines: id → [ja, en, who]  (M ミント · H ひなた · N 渚). GENERATED by scripts/script_data.py — edit there.\n"
            "// bridges: who → topic → id (the free-talk windows), topics: [key, regex] in order, talk: keep-talking beats per who ([id, position]).\n")
    open(os.path.join(ROOT, 'lines.js'), 'w', encoding='utf-8').write(head + 'window.INN_LINES = ' + json.dumps(data, ensure_ascii=False, indent=1) + ';\n')
    json.dump({strip(v[1]): v[3] for v in L.values()}, open(os.path.join(ROOT, 'project', 'zh_lines.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(len(L), 'lines,', sum(len(strip(v[1])) for v in L.values()), 'ja chars')
