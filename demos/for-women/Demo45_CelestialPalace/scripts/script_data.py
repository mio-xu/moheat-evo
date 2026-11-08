#!/usr/bin/env python3
"""THE script of Demo45 『てんにょ様は、未来から』 (A Celestial from the Future) — one source for every line: the tagged Japanese
(ElevenLabs v4 delivery tags), the English and the 中文. `python3 scripts/script_data.py` writes ../lines.js (window.PALACE_LINES: lines,
steps, bridges, topics, places), project/zh_lines.json and ../l10n.js (zh lines + answer labels + names + voice phrasings; the cover /
page texts are added at the build stage); scripts/voice.py reads TAGGED (+ SAY readings) from here.

Who: J = 迅 (jin), S = 紫苑 (shion), K = 朔 (saku) — their confirmed ElevenLabs voices, unchanged (docs/characters/*.md). "You" = the
woman player. Everyone speaks Japanese in this land (k06 says it once). Design + thermal plan: project/script.md. Story (≈ 3:00 + three
short free-talk windows): 1 凍った蓮池 (the museum mirror drops you into the palace's frozen lotus pond — cold peak; Saku pulls you out,
his cloak) · 2 寝殿 (Jin, the "tyrant" crown prince: lattice window LEFT cool / brazier RIGHT warm, he stokes the brazier = warm peak,
hand-warmer at your right cheek, window ①) · 3 星見台 (Shion the astrologer: night wind LEFT / incense RIGHT; his feather fan sweeps the
warmth off your right cheek → cool in < 1 s; then his whisper at your LEFT ear in the wind, window ②) · 4 回廊 (assassins' torches pass
left → right while Saku hides you in an alcove, his whisper at your right ear, window ③) · 5 夜明けの池 (pick one token → his last
whisper → you wake up in the museum with it)."""
import json, os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

L = {
    # ---- 1 凍った蓮池 (night, ice; the plunge = cold peak; his cloak)
    'k01': ('K', '[shouting] おい、誰か落ちたぞ…！ …待ってろ、今行く！', "Hey, someone fell in…! …Hold on, I'm coming!", '喂，有人掉下去了…！…等着，我这就来！'),
    'k02': ('K', '[breathing heavily] …ほら、手！ つかまれ！', "…Here, your hand! Grab on!", '…来，手！抓住！'),
    'k03x': ('K', '[annoyed] っ、離すなって！ …もう一回だ！', "Tch, don't let go! …Once more!", '啧，别松手啊！…再来一次！'),
    'k04': ('K', '[laughs softly] …ったく。 空から降ってきたのか？ 天女様。', '…Geez. Did you fall from the sky? Lady Celestial.', '…真是的。你是从天上掉下来的吗？天女大人。'),
    'k05a': ('K', '[teasing] へえ、じゃあ何だよ。 そんな薄着で、真冬の池に飛び込むなんて。', "Oh? Then what are you? Jumping into a frozen pond dressed like that.", '哦？那你是什么？穿这么少，跳进隆冬的池塘里。'),
    'k05b': ('K', '[softly] 蒼月国、白露宮。 …皇太子殿下の、お庭だよ。', "The Kingdom of the Pale Moon, the White Dew Palace. …The crown prince's garden.", '苍月国，白露宫。…皇太子殿下的庭院。'),
    'k06': ('K', '[surprised] …ていうか、言葉、通じるんだな。 [chuckles softly] …ま、話が早くていいや。', "…Wait, we speak the same language. …Well, that makes things easier.", '…话说，语言居然是通的。…算了，这样说话方便。'),
    'k07': ('K', '[softly] これ、羽織っとけ。 …震えてる。', 'Put this on. …You\'re shaking.', '把这个披上。…你在发抖。'),
    'k08': ('K', '[whispers] …俺は朔。 殿下の影だ。 人前では、いないことになってる。 …だから、ないしょな。', "…I'm Saku. The prince's shadow. In public I don't exist. …So keep it secret.", '…我是朔。殿下的影子。在人前，我是不存在的。…所以，要保密哦。'),
    'k09': ('K', '[sighs] 殿下に見つかる前に、どこかに隠して…って、もう遅いか。', "I'll hide you somewhere before the prince finds… too late, huh.", '得在殿下发现之前把你藏起来…算了，已经晚了吧。'),
    # ---- 2 寝殿 (lattice window LEFT cool, brazier RIGHT warm; stoke = warm peak; hand-warmer on the right cheek)
    'j01': ('J', '[firmly] …朔。 その女は、なんだ。', '…Saku. Who is that woman?', '…朔。那个女人是谁。'),
    'k10': ('K', '[teasing] 池に落ちてきた、天女様です。 …たぶん。', 'A celestial who fell into the pond, Your Highness. …Probably.', '是掉进池塘的天女大人。…大概吧。'),
    'j02': ('J', '[smirks] 天女、か。 …なら、俺のものだ。', 'A celestial, huh. …Then she\'s mine.', '天女吗。…那她就是我的了。'),
    'j03a': ('J', '[chuckles] ほう。 この俺に、そう言った女は初めてだ。 …気に入った。', "Hoh. You're the first woman ever to say that to me. …I like it.", '哦？敢这样对我说话的女人，你是第一个。…我中意了。'),
    'j03b': ('J', '[firmly] 迅。 この国の皇太子だ。 …暴君、と呼ぶやつもいるがな。', "Jin. The crown prince of this realm. …Some call me a tyrant.", '迅。这个国家的皇太子。…也有人叫我暴君。'),
    'j04': ('J', '[annoyed] …濡れたままじゃねえか。 こっち来い。 火のそばだ。', "…You're still soaked. Come here. By the fire.", '…你还湿着呢。过来。到火旁边来。'),
    'j05': ('J', '[firmly] 炭を足せ。 …ほら、あったまったか。', 'More charcoal. …There. Warmer?', '加炭。…怎么样，暖和了吗。'),
    'j06': ('J', '[softly] 手炉だ。 頬に、当てとけ。', "A hand-warmer. Hold it to your cheek.", '手炉。贴在脸上。'),
    'j07': ('J', '[whispers] …お前、ずっと震えてたぞ。 …もう大丈夫だ。 俺が、そばにいる。', "…You were shaking the whole time. …You're safe now. I'm right here.", '…你一直在发抖。…已经没事了。我就在你身边。'),
    'j08': ('J', '[curious] …天の国の話を聞かせろ。 未来とやらでは、何が流行っている？', "…Tell me about the heavens. What's in fashion in this 'future' of yours?", '…给我讲讲天上的事。你说的未来，流行什么？'),
    'j09': ('J', '[firmly] 紫苑が、お前に会いたがっている。 星見台だ。 …すぐ戻れよ。', "Shion wants to see you. The star terrace. …Come back quickly.", '紫苑想见你。在观星台。…快点回来。'),
    # ---- 3 星見台 (night wind LEFT, incense burner RIGHT; the fan = fast switch on the right; whisper at the LEFT ear in the wind)
    's01': ('S', '[warmly] …ようこそ、未来からのお客様。 お待ちしていましたよ。', '…Welcome, my guest from the future. I have been expecting you.', '…欢迎，来自未来的客人。我一直在等你。'),
    's02': ('S', '[softly] 僕は紫苑。 この国で、星を読んでいます。 …君が今夜、池に落ちることも、星に書いてありました。', "I am Shion. I read the stars for this realm. …That you would fall into the pond tonight was written in them too.", '我是紫苑。在这个国家观星。…你今晚会掉进池塘，星星上也写着呢。'),
    's03': ('S', '[chuckles softly] …ふふ。 冗談ですよ。 …半分は。', '…Heh. I\'m joking. …Half joking.', '…呵呵。开玩笑的。…一半而已。'),
    's04': ('S', '[softly] こちらへ。 香炉のそばが、あたたかいでしょう。', 'Come this way. It is warm beside the incense burner.', '到这边来。香炉旁边比较暖和吧。'),
    's05': ('S', '[warmly] この子は、玉兎。 月から来た、と言われています。 …君と、おそろいですね。', "This little one is Gyokuto, the jade rabbit. They say it came from the moon. …Just like you.", '这孩子叫玉兔。据说是从月亮上来的。…和你一样呢。'),
    's06': ('S', '[playful] …おや。 頬が、少し熱いようですね。 冷ましてあげましょう。', '…Oh my. Your cheek seems a little warm. Let me cool it.', '…哎呀。你的脸，好像有点烫呢。我帮你降降温吧。'),
    's07': ('S', '[softly] …夜の風は、熱をすぐに奪います。 人の心も、同じですよ。', "…The night wind steals warmth quickly. So it is with hearts.", '…夜风会很快带走热度。人心也是一样的。'),
    's08': ('S', '[whispers] …左から吹くのは、北の風。 …でも、僕の声は、あたたかいでしょう？', "…The wind from the left is the north wind. …But my voice is warm, isn't it?", '…从左边吹来的，是北风。…不过，我的声音很暖和吧？'),
    's09a': ('S', '[chuckles softly] …いい子だね。', '…Good girl.', '…真乖。'),
    's09b': ('S', '[playful] …おや。 では、もう少し、近くで。', '…Oh? Then, a little closer.', '…哎呀。那么，再靠近一点。'),
    's10': ('S', '[curious] …君の時代でも、星は、同じ場所にありますか？', '…In your time, are the stars still in the same places?', '…在你的时代，星星还在同样的位置吗？'),
    's11': ('S', '[softly] …朔が迎えに来ていますよ。 気をつけて。 今夜は、影が騒がしい。', '…Saku has come for you. Take care. The shadows are restless tonight.', '…朔来接你了。小心。今晚，影子很不安分。'),
    # ---- 4 回廊 (moonlit corridor; assassins' torches pass LEFT → RIGHT beyond the railing; whisper at your RIGHT ear)
    'k11': ('K', '[whispers] …しっ。 こっち。', '…Shh. Over here.', '…嘘。这边。'),
    'k12': ('K', '[whispers] …刺客だ。 動くな。 …息も、ひそめとけ。', '…Assassins. Don\'t move. …Keep your breath quiet too.', '…是刺客。别动。…呼吸也放轻。'),
    'k13x': ('K', '[whispers] …っ、動くなって。 …まだだ。', "…Tch, I said don't move. …Not yet.", '…啧，叫你别动。…还没走。'),
    'k14': ('K', '[softly] …行ったな。 …怖かったか？', '…They\'re gone. …Were you scared?', '…走了。…害怕吗？'),
    'k15a': ('K', '[softly] …だよな。 ごめん。 守るって、言ったのにな。', '…Of course. Sorry. I said I\'d protect you.', '…也是。对不起。明明说过要保护你的。'),
    'k15b': ('K', '[laughs softly] …うそつけ。 手、震えてるぞ。', "…Liar. Your hands are shaking.", '…骗人。你手在抖呢。'),
    'k16': ('K', '[softly] …俺さ、ずっと誰かの影で生きてきた。 …でも今夜は、お前の隣にいたい。', "…I've always lived in someone's shadow. …But tonight, I want to be beside you.", '…我啊，一直活在别人的影子里。…但今晚，我想待在你身边。'),
    'k17': ('K', '[curious] …なあ。 お前の世界じゃ、俺みたいなやつ、何してると思う？', "…Hey. In your world, what do you think a guy like me would be doing?", '…呐。在你的世界里，你觉得像我这样的人，会在做什么？'),
    # ---- 5 夜明けの池 (the sun, morning chill; the ring of light in the ice; pick one token)
    'k18': ('K', '[softly] …夜明けだ。 池が、光ってる。', '…It\'s dawn. The pond is glowing.', '…天亮了。池塘在发光。'),
    's12': ('S', '[softly] 星の言う通り。 …帰り道が、開きましたね。', 'Just as the stars said. …Your way home has opened.', '正如星星所说。…回去的路，打开了呢。'),
    'j10': ('J', '[firmly] …行くな、とは言わねえ。 …だが、ひとつ持っていけ。', "…I won't tell you not to go. …But take one thing with you.", '…我不会叫你别走。…但是，带一样东西走。'),
    'j11': ('J', '[whispers] …俺の簪だ。 …次に来たら、もう帰さねえからな。', "…My hairpin. …Next time you come, I'm not letting you go home.", '…我的簪子。…下次你再来，我就不放你回去了。'),
    's13': ('S', '[whispers] …僕の羽根を。 夜空を見上げたら、思い出してください。 …星は、いつも同じ場所に。', "…Take my feather. When you look up at the night sky, remember me. …The stars are always in the same place.", '…拿着我的羽毛。抬头看夜空的时候，请想起我。…星星，永远在同样的位置。'),
    'k19': ('K', '[whispers] …俺の面。 …次は、影じゃなくて、ちゃんと隣で会おうな。', "…My mask. …Next time, let's meet not as a shadow, but right beside you.", '…我的面具。…下次，不是作为影子，而是好好地在你身边见面吧。'),
    # ---- bridges (free-talk windows)
    'bj_future': ('J', '[chuckles] 手の中の板で、遠くと話す…？ 天の国は、妙なものを作るな。', "Talking to faraway people through a slab in your hand…? The heavens make strange things.", '用手里的板子跟远方的人说话…？天上的国度，尽做些奇怪的东西。'),
    'bj_food': ('J', '[firmly] 腹が減ったのか。 …膳を運ばせる。 宮で一番の料理人だ。', "Hungry? …I'll have a meal brought. The best cook in the palace.", '饿了吗。…我叫人送膳来。宫里最好的厨子。'),
    'bj_cold': ('J', '[annoyed] まだ寒いのか。 …火のそばに来い。 俺の隣だ。', "Still cold? …Come by the fire. Next to me.", '还冷吗。…到火边来。我旁边。'),
    'bj_sleep': ('J', '[softly] …眠いなら、ここで寝ろ。 誰も、お前に触れさせねえ。', "…If you're sleepy, sleep here. I won't let anyone touch you.", '…困了就在这里睡。我不会让任何人碰你。'),
    'bj_praise': ('J', '[smirks] …当然だ。 [softly] …だが、お前に言われると、悪くねえな。', "…Naturally. …But coming from you, it's not bad.", '…那当然。…不过，从你嘴里说出来，感觉不坏。'),
    'bj_name': ('J', '[firmly] 迅。 速い風、という意味だ。 …覚えとけ。', "Jin. It means a swift wind. …Remember it.", '迅。迅疾之风的意思。…记住了。'),
    'bj_thanks': ('J', '[chuckles] 礼はいらねえ。 お前は、俺のものだからな。', "No need for thanks. You're mine, after all.", '不用谢。毕竟你是我的人。'),
    'bj_leave': ('J', '[annoyed] …帰りたい、だと。 [softly] …夜明けまでだ。 それまでは、ここにいろ。', "…You want to go home? …Until dawn, then. Until then, stay here.", '…想回去？…到天亮为止。在那之前，待在这里。'),
    'bj_yes': ('J', '[chuckles] ほう。 なら、この宮でも流行らせてみるか。', "Hoh. Then perhaps I'll make it fashionable in this palace too.", '哦？那就在这宫里也流行起来吧。'),
    'bj_no': ('J', '[smirks] なんだ、天の国も退屈だな。 …俺といるほうが、面白いだろう。', "What, the heavens are boring too. …Being with me is more fun, right?", '什么啊，天上的国度也挺无聊的。…还是跟我在一起有意思吧。'),
    'bj_gen1': ('J', '[chuckles] …妙なことを言う女だ。 …嫌いじゃねえ。', "…You say strange things. …I don't hate it.", '…说话真奇怪的女人。…我不讨厌。'),
    'bj_gen2': ('J', '[firmly] …半分もわからん。 だが、お前の声は聞いていたい。', "…I don't get half of it. But I want to keep hearing your voice.", '…一半都听不懂。但我想一直听你的声音。'),
    'bj_silence': ('J', '[softly] …黙るな。 …いや、いい。 炭の音だけでも、悪くねえ。', "…Don't go quiet. …No, it's fine. Just the crackle of the charcoal isn't bad either.", '…别不说话。…不，算了。光听炭火的声音，也不坏。'),
    'bs_future': ('S', '[curious] …ほう。 未来の道具ですか。 星の動きも、それで読めるのでしょうか。', "…Oh. A tool of the future. Can it read the motions of the stars, I wonder?", '…哦。未来的道具吗。也能用它来读星星的运行吗？'),
    'bs_food': ('S', '[softly] 星見の夜には、桂花の蜜湯を。 …あとで、淹れてあげましょう。', "On stargazing nights, osmanthus honey tea. …I'll make you some later.", '观星的夜晚，要喝桂花蜜汤。…待会儿，我泡给你喝。'),
    'bs_cold': ('S', '[softly] 寒いですか。 …香炉のほうへ。 それとも、僕の袖の中に？', "Are you cold? …Over by the incense. Or perhaps inside my sleeve?", '冷吗。…到香炉那边去。还是说，到我的袖子里来？'),
    'bs_sleep': ('S', '[whispers] …眠いのなら、どうぞ。 星が、君の夢を見守ります。', "…If you're sleepy, go ahead. The stars will watch over your dreams.", '…困了的话，请睡吧。星星会守护你的梦。'),
    'bs_praise': ('S', '[chuckles softly] …ふふ。 そういう君こそ、星よりきれいですよ。', "…Heh. You are the one more beautiful than the stars.", '…呵呵。说这话的你，才比星星更美。'),
    'bs_name': ('S', '[softly] 紫苑。 秋に咲く、薄紫の花の名です。 …君を、忘れない、という意味もあるそうですよ。', "Shion. The name of a pale purple autumn flower. …They say it also means 'I won't forget you.'", '紫苑。秋天开的淡紫色花朵的名字。…据说也有「不会忘记你」的意思哦。'),
    'bs_thanks': ('S', '[warmly] どういたしまして。 …お礼は、もう少しここにいてくれること、で。', "You're welcome. …As thanks, stay here a little longer.", '不客气。…谢礼嘛，就是再在这里多待一会儿。'),
    'bs_leave': ('S', '[softly] …帰り道は、夜明けに開きます。 それまで、星を数えていましょう。', "…Your way home opens at dawn. Until then, let us count stars.", '…回去的路，会在黎明时打开。在那之前，我们一起数星星吧。'),
    'bs_yes': ('S', '[warmly] …そうですか。 では、千年先の君も、同じ星を見ているのですね。', "…I see. Then you, a thousand years from now, look at the same stars.", '…是吗。那么，千年之后的你，也在看着同样的星星呢。'),
    'bs_no': ('S', '[softly] …見えないのですか。 それは、さみしい。 …今夜の分を、たくさん見ていってください。', "…You cannot see them? How lonely. …Then see plenty of them tonight.", '…看不见吗。那真寂寞。…那今晚就多看一些吧。'),
    'bs_gen1': ('S', '[chuckles softly] …興味深い。 君の話は、星図よりも読み甲斐がある。', "…Fascinating. Your words are more worth reading than any star chart.", '…真有意思。你的话，比星图还值得细读。'),
    'bs_gen2': ('S', '[softly] …ふふ。 すべては分かりませんが、君が楽しそうなのは、分かります。', "…Heh. I don't understand it all, but I can tell you're enjoying yourself.", '…呵呵。虽然不全懂，但我知道你很开心。'),
    'bs_silence': ('S', '[softly] …言葉がなくても、星は語ります。 …静かな夜ですね。', "…Even without words, the stars speak. …A quiet night.", '…即使没有言语，星星也会诉说。…真是个安静的夜晚。'),
    'bk_future': ('K', '[laughs] すまほ？ なんだそれ。 …それで、俺のこと、呼べるか？', "A smartphone? What's that. …Could you call me with it?", '手机？那是什么。…用那个，能叫我吗？'),
    'bk_food': ('K', '[teasing] 腹減ったのか？ …あとで、厨房から饅頭くすねてきてやるよ。', "Hungry? …Later I'll swipe you some buns from the kitchen.", '饿了？…待会儿，我从厨房给你偷几个包子来。'),
    'bk_cold': ('K', '[softly] 寒いか。 …ほら、マントの中、入れよ。', "Cold? …Here, get under my cloak.", '冷吗。…来，进到斗篷里来。'),
    'bk_sleep': ('K', '[softly] …眠いなら寝とけ。 見張りは、俺の仕事だ。', "…If you're sleepy, sleep. Keeping watch is my job.", '…困了就睡。守夜是我的活儿。'),
    'bk_praise': ('K', '[flustered] …っ、急になんだよ。 [laughs softly] …ったく、調子狂うな。', "…Tch, where did that come from. …Geez, you throw me off.", '…啧，突然说什么呢。…真是的，让人乱了阵脚。'),
    'bk_name': ('K', '[softly] 朔。 新月のことだ。 …見えない月。 影には、ちょうどいいだろ。', "Saku. It means the new moon. …The moon you can't see. Fitting for a shadow, right?", '朔。就是新月。…看不见的月亮。很适合影子吧。'),
    'bk_thanks': ('K', '[teasing] 礼なんかいいって。 …その代わり、あとで俺の話も聞けよ。', "Forget the thanks. …In return, listen to me later.", '不用谢啦。…作为交换，待会儿也听听我说话。'),
    'bk_leave': ('K', '[softly] …帰りたいよな。 夜明けまで、俺が守る。 …ちゃんと帰してやるから。', "…You want to go home. I'll guard you till dawn. …I'll get you home, I promise.", '…想回去吧。到天亮为止，我来保护你。…我一定会送你回去。'),
    'bk_yes': ('K', '[laughs] マジか。 …じゃあ俺、そっちでもやってけそうだな。', "Seriously? …Then I'd get by over there too.", '真的假的。…那我在那边也能混下去啊。'),
    'bk_no': ('K', '[laughs softly] …だよな。 影なんて、どこにいても目立たねえ。', "…Figured. A shadow never stands out, wherever he is.", '…也是。影子这种东西，在哪里都不起眼。'),
    'bk_gen1': ('K', '[laughs] …変なやつ。 [softly] …でも、おもしれえ。', "…Weird girl. …But you're fun.", '…怪人。…不过，挺有意思的。'),
    'bk_gen2': ('K', '[teasing] 天女様の言葉は、難しいな。 …もう一回、ゆっくり言って？', "The celestial's words are hard. …Say it again, slowly?", '天女大人的话，好难懂啊。…再慢慢说一遍？'),
    'bk_silence': ('K', '[whispers] …静かだな。 …お前の息の音、聞こえる。', "…It's quiet. …I can hear you breathing.", '…好安静。…听得见你的呼吸声。'),
    # ---- もっと話す · place × cast: new lines (story lines are reused where they fit)
    # 凍った蓮池
    'pk1': ('K', '[teasing] また池に落ちに来たのか？ …今度は、俺が受け止めてやるよ。', "Came to fall in the pond again? …This time I'll catch you.", '又来掉池塘了？…这次，我来接住你。'),
    'pk2': ('K', '[softly] この池、真冬でも、真ん中だけは凍らないんだ。 …お前が落ちた、あそこ。', "In the depths of winter, the middle of this pond never freezes. …Right where you fell.", '这个池塘，就算隆冬，正中间也不会结冰。…就是你掉下去的那里。'),
    'pk3': ('K', '[whispers] …冷えるな。 マントの中、入れよ。 …今夜だけな。', "…It's freezing. Get under the cloak. …Just for tonight.", '…好冷。进斗篷里来。…只限今晚哦。'),
    'pj1': ('J', '[firmly] …池の氷は、薄い。 俺の腕から、離れるな。', "…The ice on the pond is thin. Don't leave my arm.", '…池塘的冰很薄。别离开我的手臂。'),
    'pj2': ('J', '[whispers] …天から落ちてきたのが、お前でよかった。', "…I'm glad that what fell from the heavens was you.", '…从天上掉下来的，是你，真好。'),
    'ps1': ('S', '[softly] 月が、氷に映っていますね。 …天と地に、ふたつの月。', 'The moon is reflected in the ice. …Two moons, in heaven and on earth.', '月亮映在冰面上呢。…天上地下，两个月亮。'),
    'ps2': ('S', '[whispers] …君がここに落ちた夜を、僕は、ずっと覚えていますよ。', "…I will always remember the night you fell here.", '…你掉进这里的那个夜晚，我会一直记得。'),
    # 寝殿
    'cj1': ('J', '[smirks] …来たか。 座れ。 今夜は、どこにも行かせねえ。', "…You came. Sit. Tonight I'm not letting you go anywhere.", '…来了啊。坐。今晚，哪里都不许去。'),
    'cj2': ('J', '[softly] この屏風の竜は、俺が子どものころ、怖くて眠れなかったやつだ。', "The dragon on this screen kept me awake with fear when I was a child.", '这屏风上的龙，是我小时候怕得睡不着的那条。'),
    'cj3': ('J', '[firmly] 炭は、俺が自分で足す。 …お前のための火だからな。', "I add the charcoal myself. …It's a fire for you.", '炭，我亲手加。…因为这是为你烧的火。'),
    'cj4': ('J', '[curious] …暴君と呼ばれる男の部屋は、どうだ。 思ったより、静かだろう。', "…How is the room of a man they call a tyrant? Quieter than you thought, right?", '…被叫作暴君的男人的房间，怎么样。比你想的安静吧。'),
    'cj5': ('J', '[whispers] …夜が明けても、俺のことを忘れるな。 命令だ。', "…Even when dawn comes, don't forget me. That's an order.", '…就算天亮了，也别忘了我。这是命令。'),
    'ck1': ('K', '[whispers] …殿下の部屋に、勝手に入っちゃだめだって。 …まあ、俺もだけど。', "…You're not supposed to wander into His Highness's room. …Well, neither am I.", '…不能随便进殿下的房间啦。…好吧，我也是。'),
    'ck2': ('K', '[teasing] 殿下、ああ見えて、お前の話ばっかりしてるんだぜ。', "His Highness may not look it, but all he talks about is you.", '殿下别看那样，满嘴都是你的事哦。'),
    'cs1': ('S', '[softly] 殿下の火鉢は、宮で一番あたたかい。 …僕も、ときどき当たりに来ます。', "His Highness's brazier is the warmest in the palace. …I come to warm myself too, sometimes.", '殿下的火盆，是宫里最暖和的。…我有时候也会来烤烤火。'),
    'cs2': ('S', '[whispers] …暴君の心をほどいたのは、君が初めてですよ。', "…You are the first to soften the tyrant's heart.", '…能融化暴君之心的，你是第一个。'),
    # 星見台
    'ts1': ('S', '[warmly] また、星を見に来てくれたのですね。', 'You came to see the stars again.', '你又来看星星了呢。'),
    'ts2': ('S', '[softly] あの渾天儀で、星の位置を測ります。 …君の時代の星図と、比べてみたい。', "I measure the stars' positions with that armillary sphere. …I'd love to compare it with a star chart from your time.", '我用那个浑天仪测量星星的位置。…真想和你那个时代的星图比一比。'),
    'ts3': ('S', '[playful] 玉兎が、君の膝に乗りたがっていますよ。 …僕も、少しうらやましい。', "Gyokuto wants to sit on your lap. …I'm a little jealous.", '玉兔想坐到你腿上呢。…我也有点羡慕。'),
    'ts4': ('S', '[whispers] …今夜の星を、君にあげましょう。 …ひとつ残らず。', "…I'll give you tonight's stars. …Every last one.", '…今晚的星星，都送给你吧。…一颗不剩。'),
    'tj1': ('J', '[annoyed] …紫苑のところか。 …俺から、離れすぎるな。', "…At Shion's, huh. …Don't stray too far from me.", '…在紫苑那里吗。…别离我太远。'),
    'tj2': ('J', '[whispers] …風が冷てえ。 …俺の外套に入れ。', "…The wind's cold. …Get inside my coat.", '…风好冷。…进我的外袍里来。'),
    'tk1': ('K', '[teasing] 星見台、高いだろ。 …落ちるなよ、天女様。', "The star terrace is high, huh. …Don't fall, Lady Celestial.", '观星台很高吧。…别掉下去哦，天女大人。'),
    'tk2': ('K', '[softly] ここ、俺の昼寝の場所なんだ。 …紫苑様には、ないしょな。', "This is where I nap. …Don't tell Lord Shion.", '这里是我午睡的地方。…对紫苑大人要保密哦。'),
    # 回廊
    'rk1': ('K', '[whispers] …夜の回廊は、俺の庭みたいなもんだ。 …ついてこい。', "…The corridor at night is like my garden. …Follow me.", '…夜里的回廊，就像我的庭院。…跟我来。'),
    'rk2': ('K', '[softly] 柱の影、七本目。 …ここが、俺の定位置。', "The shadow of the seventh pillar. …My usual spot.", '第七根柱子的影子里。…这是我的老位置。'),
    'rk3': ('K', '[softly] 遠くの灯りは、夜回りの兵だ。 …今夜は、本物の夜回り。 安心しろ。', "Those far lights are the night guards. …Real ones tonight. Relax.", '远处的灯，是巡夜的士兵。…今晚是真的巡夜。放心吧。'),
    'rk4': ('K', '[whispers] …なあ。 影の中にいると、お前の顔、よく見えないな。 …もうちょい、こっち。', "…Hey. In the shadows I can't see your face well. …A bit closer.", '…呐。在影子里，看不清你的脸。…再靠过来一点。'),
    'rj1': ('J', '[firmly] …夜の回廊は危ねえ。 俺の後ろを歩け。', "…The corridor at night is dangerous. Walk behind me.", '…夜里的回廊很危险。走在我后面。'),
    'rj2': ('J', '[whispers] …朔が守れねえ夜は、俺が守る。', "…On nights Saku can't protect you, I will.", '…朔守护不了的夜晚，就由我来守护。'),
    'rs1': ('S', '[softly] 月明かりが、柱の間に縞を描いていますね。', 'The moonlight is drawing stripes between the pillars.', '月光在柱子之间，画出了条纹呢。'),
    'rs2': ('S', '[whispers] …影が騒ぐ夜は、僕のそばに。 …君の星は、僕が守ります。', "…On restless nights, stay by me. …I'll protect your star.", '…影子不安分的夜晚，待在我身边。…你的星星，由我来守护。'),
    # 夜明けの池
    'dj1': ('J', '[softly] …夜明けか。 …お前と見る朝日は、悪くねえ。', "…Dawn, huh. …The sunrise with you isn't bad.", '…天亮了啊。…和你一起看的朝阳，不坏。'),
    'ds1': ('S', '[softly] 星が消えて、朝が来ます。 …でも、見えなくても、星はそこにありますよ。', "The stars fade and morning comes. …But even unseen, they are still there.", '星星消失，早晨到来。…不过，就算看不见，星星也还在那里哦。'),
    'dk1': ('K', '[softly] …朝だ。 影の時間は、おしまい。 …ちょっと、さみしいな。', "…Morning. Shadow time is over. …A little lonely.", '…早上了。影子的时间结束了。…有点寂寞呢。'),
    'tt1': ('K', '[teasing] おーい、殿下も紫苑様も、そろったぜ。', 'Hey, His Highness and Lord Shion are both here.', '喂——，殿下和紫苑大人都到齐了哦。'),
    'tt2': ('S', '[softly] 帰る前に、少しだけ、お話しましょうか。', 'Before you go, shall we talk a little?', '回去之前，再说一会儿话吧。'),
    'tt3': ('J', '[firmly] …言いたいことがあるなら、今言え。', "…If there's something you want to say, say it now.", '…有想说的，现在就说。'),
    'tt4': ('S', '[warmly] 君の世界でも、どうか、健やかに。', 'Please stay well, in your world too.', '在你的世界里，也请健康平安。'),
    'tt5': ('K', '[whispers] …またな。', '…See you.', '…再见。'),
    'tt6': ('J', '[whispers] …待ってるぞ。', "…I'll be waiting.", '…我等你。'),
    # place bridges
    'bk_p_pond': ('K', '[softly] 池の氷は、朝にはとける。 …お前が来た穴も、きっと消える。', "The ice melts by morning. …The hole you came through will be gone too.", '池塘的冰，到早上就会化。…你来时的那个洞，也一定会消失。'),
    'bj_p_pond': ('J', '[firmly] 二度と、氷の上を歩くな。 …次は、俺が抱えて渡る。', "Never walk on the ice again. …Next time, I'll carry you across.", '别再在冰上走了。…下次，我抱你过去。'),
    'bs_p_pond': ('S', '[softly] 冷たい水は、星の光をいちばんきれいに映すのです。', "Cold water reflects starlight most beautifully.", '冰冷的水，最能美丽地映出星光。'),
    'bj_p_room': ('J', '[firmly] 左の格子窓から雪の風、右は炭の火。 …俺のそばが、一番あったかい。', "Snowy wind from the lattice window on the left, the charcoal fire on the right. …Beside me is the warmest.", '左边格子窗吹来雪风，右边是炭火。…我身边最暖和。'),
    'bk_p_room': ('K', '[whispers] 殿下の火鉢、勝手にあたると怒られるぞ。 …俺はいつもこっそりだけど。', "You'll get scolded for warming yourself at His Highness's brazier. …I always sneak it though.", '擅自烤殿下的火盆会挨骂哦。…不过我总是偷偷烤。'),
    'bs_p_room': ('S', '[softly] 炭の香りに、白檀を混ぜてあります。 …殿下は、ああ見えて香りにうるさいのですよ。', "Sandalwood is mixed into the charcoal. …His Highness is particular about scents, despite appearances.", '炭香里混了白檀。…殿下别看那样，对香味可挑剔了。'),
    'bs_p_stars': ('S', '[softly] 左は北の風、右は香炉。 …この台は、冷たさとあたたかさの境目なのです。', "The north wind on the left, the incense on the right. …This terrace is the border between cold and warm.", '左边是北风，右边是香炉。…这个台子，是冷与暖的分界线。'),
    'bj_p_stars': ('J', '[annoyed] 星なんぞ、紫苑に任せとけ。 …お前は、俺を見てろ。', "Leave the stars to Shion. …You look at me.", '星星什么的，交给紫苑就好。…你看着我。'),
    'bk_p_stars': ('K', '[laughs softly] あの流れ星、願いごとしたか？ …俺は、もうした。', "Did you wish on that shooting star? …I already did.", '那颗流星，你许愿了吗？…我已经许了。'),
    'bk_p_hall': ('K', '[whispers] 松明の灯りが見えたら、柱の影に入れ。 …それだけ覚えとけ。', "When you see torchlight, get into a pillar's shadow. …Just remember that.", '看到火把的光，就躲进柱子的影子里。…记住这一点就好。'),
    'bj_p_hall': ('J', '[firmly] 回廊の刺客は、全部、俺が片付ける。 …お前は、何も見なくていい。', "I'll deal with every assassin in the corridors. …You don't have to see any of it.", '回廊里的刺客，我会全部收拾掉。…你什么都不用看。'),
    'bs_p_hall': ('S', '[softly] 月の縞の中を歩くと、影がふたつになります。 …片方は、朔かもしれませんね。', "Walk through the moon's stripes and you cast two shadows. …One of them might be Saku.", '走在月光的条纹里，影子会变成两个。…其中一个，说不定是朔呢。'),
    'bj_p_dawn': ('J', '[softly] 朝日が出れば、帰り道が開く。 …ちっ、太陽が恨めしいな。', "When the sun rises, your way home opens. …Tch, I resent the sun.", '太阳出来，回去的路就开了。…啧，真恨太阳。'),
    'bs_p_dawn': ('S', '[softly] 朝の光に、池の輪が光っていますね。 …星の門です。', "The ring in the pond shines in the morning light. …The star gate.", '池中的光环，在晨光里闪耀呢。…是星之门。'),
    'bk_p_dawn': ('K', '[softly] 朝の空気、冷てえな。 …でも、お日様はあったかい。', "The morning air's cold. …But the sun is warm.", '早上的空气好冷。…不过，太阳很暖和。'),
}
SAY = {'蒼月国': 'そうげつこく', '白露宮': 'はくろきゅう', '玉兎': 'ぎょくと', '星見台': 'ほしみだい', '手炉': 'しゅろ', '刺客': 'しかく',
       '簪': 'かんざし', '渾天儀': 'こんてんぎ', '桂花': 'けいか', '蜜湯': 'みつゆ', '饅頭': 'まんじゅう', '屏風': 'びょうぶ', '白檀': 'びゃくだん',
       '外套': 'がいとう', '夜回り': 'よまわり', '定位置': 'ていいち', '紫苑': 'しおん', '迅': 'じん', '朔': 'さく', '天女': 'てんにょ',
       '格子窓': 'こうしまど', '松明': 'たいまつ', '縞': 'しま', '恨めしい': 'うらめしい', '健やか': 'すこやか', '香炉': 'こうろ'}

TOPICS = [
    ['leave', r'帰りたい|帰る|かえりたい|かえる|go home|going home|leave|回家|回去|想回'],
    ['thanks', r'ありがと|有難|感謝|thank|谢谢|感谢|多谢'],
    ['future', r'未来|みらい|スマホ|携帯|電車|電話|インターネット|ネット|流行|future|phone|internet|computer|car|train|fashion|trend|手机|网络|电脑|电话|流行'],
    ['food', r'お腹|おなか|ご飯|ごはん|料理|食べ|たべ|おいし|美味|お茶|饅頭|food|eat|hungry|delicious|tea|bun|饿|吃|好吃|茶|包子'],
    ['sleep', r'眠|寝|ねむ|ねる|sleep|tired|dream|nap|睡|困|梦|累'],
    ['cold', r'寒|さむ|冷|つめた|氷|こおり|風|かぜ|雪|ゆき|あったか|暖|温|cold|ice|wind|snow|warm|freez|chill|冷|冰|风|雪|暖|热|冻'],
    ['praise', r'かっこい|格好い|きれい|綺麗|すてき|素敵|イケメン|好き|すき|かわいい|cool|handsome|beautiful|gorgeous|love|like you|cute|帅|好看|漂亮|喜欢|可爱|迷人'],
    ['name', r'名前|なまえ|name|名字|叫什么|你是谁'],
    ['no', r'いいえ|いや|ちがう|違う|ううん|ない|見えない|no\b|nope|not|不|没有|看不见'],
    ['yes', r'はい|うん|そう|ええ|もちろん|ほんと|本当|ある|見える|yes|yeah|yep|sure|of course|really|是|对|嗯|当然|真的|有|看得见'],
]
YN_ONLY = ['yes', 'no']
CAST = 'JSK'
BRIDGES = {c: {k: f'b{c.lower()}_{k}' for k in ['future', 'food', 'cold', 'sleep', 'praise', 'name', 'thanks', 'leave', 'yes', 'no', 'silence']
               if f'b{c.lower()}_{k}' in L} for c in CAST}
for c in CAST: BRIDGES[c]['generic'] = [f'b{c.lower()}_gen1', f'b{c.lower()}_gen2']

STEPS = [
    {'id': 'pond', 'ja': '凍った蓮池', 'en': 'The frozen lotus pond', 'zh': '结冰的莲池', 'view': ['pond_K'], 'beats': [
        ['@mirror'], ['@plunge'], ['k01', 'left'], ['k02', 'near'],
        {'type': 'hold', 'ja': '手をつかむ（長押し）', 'en': 'Grab his hand (press and hold)', 'zh': '抓住他的手（长按）', 'event': '@pulled_out', 'secs': 3, 'let_go': ['k03x']},
        ['k04', 'near'],
        {'type': 'choice', 'options': [{'ja': '天女じゃない…', 'en': "I'm not a celestial…", 'zh': '我不是天女…', 'then': ['k05a', 'k05b']},
                                       {'ja': 'ここは、どこ？', 'en': 'Where am I?', 'zh': '这是哪里？', 'then': ['k05b']}]},
        ['k06', 'near'], ['@cloak'], ['k07', 'near'], ['k08', 'left_ear'], ['k09', 'near']]},
    {'id': 'chamber', 'ja': '寝殿', 'en': "The crown prince's chamber", 'zh': '寝殿', 'view': ['chamber_J', 'chamber_J_ear'], 'beats': [
        ['@chamber'], ['j01', 'front'], ['k10', 'left'], ['j02', 'front'],
        {'type': 'choice', 'options': [{'ja': '誰のものでもない', 'en': "I'm nobody's", 'zh': '我不属于任何人', 'then': ['j03a']},
                                       {'ja': '…あなたは？', 'en': '…And you are?', 'zh': '…你是谁？', 'then': ['j03b']}]},
        ['j04', 'front'], ['@stoke'], ['j05', 'near'], ['@warmer_right'], ['j06', 'right_ear'], ['j07', 'right_ear'],
        ['window', 'J', 'j08'], ['@warmer_off'], ['j09', 'near']]},
    {'id': 'terrace', 'ja': '星見台', 'en': 'The star terrace', 'zh': '观星台', 'view': ['terrace_S', 'terrace_S_ear'], 'beats': [
        ['@terrace'], ['s01', 'front'], ['s02', 'front'], ['s03', 'front'], ['@by_incense'], ['s04', 'right'], ['s05', 'right'], ['s06', 'right'],
        ['@fan_right'], ['s07', 'right'], ['@lean_left'], ['s08', 'left_ear'],
        {'type': 'choice', 'options': [{'ja': 'あたたかい', 'en': "It's warm", 'zh': '很暖和', 'then': ['s09a']},
                                       {'ja': 'つめたい', 'en': "It's cold", 'zh': '好冷', 'then': ['s09b']}]},
        ['window', 'S', 's10'], ['s11', 'near']]},
    {'id': 'corridor', 'ja': '回廊', 'en': 'The moonlit corridor', 'zh': '回廊', 'view': ['corridor_K', 'corridor_K_ear'], 'beats': [
        ['@corridor'], ['k11', 'right_ear'], ['k12', 'right_ear'],
        {'type': 'hold', 'ja': '息をひそめる（長押し）', 'en': 'Hold your breath (press and hold)', 'zh': '屏住呼吸（长按）', 'event': '@torches', 'secs': 5, 'let_go': ['k13x']},
        ['k14', 'near'],
        {'type': 'choice', 'options': [{'ja': 'こわかった', 'en': 'I was scared', 'zh': '好害怕', 'then': ['k15a']},
                                       {'ja': '平気', 'en': "I'm fine", 'zh': '没事', 'then': ['k15b']}]},
        ['k16', 'right_ear'], ['window', 'K', 'k17']]},
    {'id': 'dawn', 'ja': '夜明けの池', 'en': 'The pond at dawn', 'zh': '黎明的池塘', 'view': ['dawn_3'], 'beats': [
        ['@sunrise'], ['k18', 'right'], ['s12', 'left'], ['j10', 'front'],
        {'type': 'choice', 'ending': True, 'options': [
            {'ja': '迅の簪', 'en': "Jin's hairpin", 'zh': '迅的簪子', 'then': ['j11'], 'who': 'J', 'ear': 'right_ear', 'token': '👑'},
            {'ja': '紫苑の羽根', 'en': "Shion's feather", 'zh': '紫苑的羽毛', 'then': ['s13'], 'who': 'S', 'ear': 'left_ear', 'token': '🪶'},
            {'ja': '朔の狐の面', 'en': "Saku's fox mask", 'zh': '朔的狐狸面具', 'then': ['k19'], 'who': 'K', 'ear': 'right_ear', 'token': '🦊'}]}]},
]
PLACES = {
    'pond': {'ja': '凍った蓮池', 'en': 'The frozen pond', 'zh': '结冰的莲池', 'icon': '❄️',
             'topic': ['pond', r'池|いけ|氷|こおり|蓮|はす|月|つき|pond|ice|lotus|moon|池|冰|莲|月亮'],
             'cast': {'K': [[['pk1', 'near']], [['pk2', 'near']], [['@cloak'], ['pk3', 'left_ear']], [['k16', 'near']], [['tt5', 'left_ear']]],
                      'J': [[['pj1', 'near']], [['bj_p_pond', 'near']], [['pj2', 'right_ear']]],
                      'S': [[['ps1', 'front']], [['bs_p_pond', 'near']], [['ps2', 'left_ear']]],
                      'JSK': [[['tt1', 'left'], ['ps1', 'front']], [['pj1', 'right']], [['pk2', 'left']], [['@cloak'], ['pj2', 'right_ear']]]}},
    'chamber': {'ja': '寝殿', 'en': "The prince's chamber", 'zh': '寝殿', 'icon': '🔥',
                'topic': ['room', r'火|ひ|炭|すみ|火鉢|窓|まど|屏風|竜|りゅう|fire|charcoal|brazier|window|screen|dragon|火|炭|火盆|窗|屏风|龙'],
                'cast': {'J': [[['cj1', 'front']], [['cj2', 'front']], [['@stoke'], ['cj3', 'near']], [['@warmer_right'], ['cj4', 'right_ear']], [['cj5', 'right_ear']]],
                         'K': [[['ck1', 'near']], [['bk_p_room', 'near']], [['ck2', 'right_ear']]],
                         'S': [[['cs1', 'front']], [['bs_p_room', 'near']], [['cs2', 'left_ear']]],
                         'JSK': [[['cj1', 'front'], ['ck1', 'right']], [['cs1', 'left']], [['@stoke'], ['cj3', 'front']], [['cs2', 'left_ear'], ['cj5', 'right_ear']]]}},
    'terrace': {'ja': '星見台', 'en': 'The star terrace', 'zh': '观星台', 'icon': '🌙',
                'topic': ['stars', r'星|ほし|風|かぜ|香|こう|兎|うさぎ|空|そら|star|wind|incense|rabbit|sky|星|风|香|兔|天空'],
                'cast': {'S': [[['ts1', 'front']], [['ts2', 'front']], [['@by_incense'], ['ts3', 'right']], [['@fan_right'], ['s07', 'right']], [['@lean_left'], ['ts4', 'left_ear']]],
                         'J': [[['tj1', 'front']], [['bj_p_stars', 'near']], [['tj2', 'right_ear']]],
                         'K': [[['tk1', 'near']], [['bk_p_stars', 'near']], [['tk2', 'right_ear']]],
                         'JSK': [[['ts1', 'front'], ['tk1', 'right']], [['tj1', 'left']], [['@fan_right'], ['ts3', 'front']], [['ts4', 'left_ear'], ['tj2', 'right_ear']]]}},
    'corridor': {'ja': '回廊', 'en': 'The corridor', 'zh': '回廊', 'icon': '🏮',
                 'topic': ['hall', r'回廊|かいろう|柱|はしら|松明|たいまつ|灯|あかり|影|かげ|刺客|corridor|pillar|torch|light|shadow|assassin|回廊|柱|火把|灯|影子|刺客'],
                 'cast': {'K': [[['rk1', 'near']], [['rk2', 'near']], [['@torches'], ['rk3', 'right_ear']], [['rk4', 'right_ear']], [['k16', 'right_ear']]],
                          'J': [[['rj1', 'front']], [['bj_p_hall', 'near']], [['rj2', 'right_ear']]],
                          'S': [[['rs1', 'front']], [['bs_p_hall', 'near']], [['rs2', 'left_ear']]],
                          'JSK': [[['rk1', 'right'], ['rj1', 'front']], [['rs1', 'left']], [['@torches'], ['rk3', 'right_ear']], [['rs2', 'left_ear'], ['rj2', 'right_ear']]]}},
    'dawn': {'ja': '夜明けの池', 'en': 'The pond at dawn', 'zh': '黎明的池塘', 'icon': '🌅',
             'topic': ['dawn', r'朝日|あさひ|朝|日の出|太陽|光|ひかり|輪|門|sun|sunrise|dawn|morning|light|ring|gate|太阳|日出|朝阳|早上|光|门'],
             'cast': {'JSK': [[['tt1', 'right'], ['@sunrise'], ['tt2', 'left']], [['tt3', 'front']], [['tt4', 'left']], [['tt5', 'right'], ['tt6', 'front']]],
                      'J': [[['@sunrise'], ['dj1', 'near']], [['j10', 'near']], [['tt6', 'right_ear']]],
                      'S': [[['@sunrise'], ['ds1', 'near']], [['s12', 'near']], [['tt4', 'left_ear']]],
                      'K': [[['@sunrise'], ['dk1', 'near']], [['k18', 'near']], [['tt5', 'right_ear']]]}},
}
for pl, P in PLACES.items():
    k = P['topic'][0]; P['bridges'] = {c: {k: [f'b{c.lower()}_p_{k}']} for c in CAST if f'b{c.lower()}_p_{k}' in L}
NAMES = {'迅': {'en': 'Jin', 'zh': '迅'}, '紫苑': {'en': 'Shion', 'zh': '紫苑'}, '朔': {'en': 'Saku', 'zh': '朔'}}
WHO = {'J': '迅', 'S': '紫苑', 'K': '朔'}
VOICE = {'all': {
    '手をつかむ（長押し）': ['抓住', '抓住他的手', '握住', 'grab', 'take his hand', 'hold on', 'つかむ', '手'],
    '天女じゃない…': ['我不是天女', '不是天女', "i'm not a celestial", 'not a celestial', 'not an angel', 'てんにょじゃない', '違う'],
    'ここは、どこ？': ['这是哪里', '这是哪', 'where am i', 'where is this', 'ここはどこ', 'どこ'],
    '誰のものでもない': ['我不属于任何人', '我不是你的', '不属于谁', "i'm nobody's", "i'm not yours", 'no one owns me', 'だれのものでもない', 'あなたのものじゃない'],
    '…あなたは？': ['你是谁', '你是哪位', 'who are you', 'and you are', 'あなたはだれ', 'あなたは誰', 'だれ'],
    'あたたかい': ['很暖和', '暖和', '温暖', '好暖', 'warm', "it's warm", 'so warm', '暖かい', 'あったかい'],
    'つめたい': ['好冷', '冷', '好冰', 'cold', "it's cold", 'chilly', '冷たい', 'さむい'],
    '息をひそめる（長押し）': ['屏住呼吸', '别出声', '安静', 'hold my breath', 'quiet', 'hush', 'しずかに', 'いきをとめる'],
    'こわかった': ['好害怕', '害怕', '吓死了', 'i was scared', 'scared', 'frightened', '怖かった', 'こわい'],
    '平気': ['没事', '我没事', '不怕', "i'm fine", 'fine', "i'm okay", 'not scared', 'へいき', 'だいじょうぶ'],
    '迅の簪': ['迅', '簪子', '发簪', 'jin', 'hairpin', 'the hairpin', 'じん', 'かんざし'],
    '紫苑の羽根': ['紫苑', '羽毛', '羽根', 'shion', 'feather', 'the feather', 'しおん', 'はね'],
    '朔の狐の面': ['朔', '面具', '狐狸', 'saku', 'mask', 'fox mask', 'さく', 'きつね', 'おめん'],
}}
strip = lambda s: re.sub(r'\s+', ' ', re.sub(r'\[[^\]]*\]', '', s)).strip()
TAGGED = {k: v[1] for k, v in L.items()}


def spoken(tagged, lang='ja', lid=None):
    """Text sent to ElevenLabs: ja = tagged line with SAY readings; en / zh = that column (tags kept) for a later dub (voice.py --lang)."""
    if lang == 'ja':
        for k, v in SAY.items(): tagged = tagged.replace(k, v)
        return tagged
    who, ja, en, zh = L[lid]; tags = re.findall(r'^\[[^\]]*\]', ja)
    return ((tags[0] + ' ') if tags else '') + (en if lang == 'en' else zh)


def check():
    used = set()
    for s in STEPS:
        for b in s['beats']:
            if isinstance(b, dict):
                for o in b.get('options', []): used.update(o['then'])
                used.update(b.get('let_go', []))
            elif b[0] == 'window': used.add(b[2])
            elif not b[0].startswith('@'): used.add(b[0])
    for P in PLACES.values():
        for beats in P['cast'].values():
            for bt in beats:
                for it in bt:
                    if not it[0].startswith('@'): used.add(it[0])
        for c in CAST:
            for v in P['bridges'].get(c, {}).values(): used.update(v)
    for c in CAST:
        for v in BRIDGES[c].values(): used.update(v if isinstance(v, list) else [v])
    assert not (used - set(L)), used - set(L)
    return set(L) - used


if __name__ == '__main__':
    unused = check()
    if unused: print('note: lines not used anywhere:', sorted(unused))
    lines = {k: [strip(v[1]), v[2], v[0]] for k, v in L.items()}
    data = {'who': WHO, 'lines': lines, 'steps': STEPS, 'topics': TOPICS, 'yn_only': YN_ONLY, 'bridges': BRIDGES,
            'places': {k: {x: P[x] for x in ('ja', 'en', 'icon', 'topic', 'cast', 'bridges')} for k, P in PLACES.items()}}
    head = ("// 『てんにょ様は、未来から』 lines: id → [ja, en, who]  (J 迅 · S 紫苑 · K 朔). GENERATED by scripts/script_data.py — edit there.\n"
            "// steps: the story as data (beats, interactions, '@events' = project/thermal_plan.json, free-talk windows); bridges: who → topic → id;\n"
            "// topics: [key, regex] in order; places: もっと話す place × cast (beats per cast, own topic + bridges).\n")
    open(os.path.join(ROOT, 'lines.js'), 'w', encoding='utf-8').write(head + 'window.PALACE_LINES = ' + json.dumps(data, ensure_ascii=False, indent=1) + ';\n')
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
