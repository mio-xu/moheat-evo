#!/usr/bin/env python3
"""THE script of Demo46 『竜の王と、エルフの王と、小悪魔』 (The Dragon King, the Elf King and the Little Devil) — one source for every
line: tagged Japanese (ElevenLabs v4 delivery tags), English and 中文. `python3 scripts/script_data.py` writes ../lines.js
(window.DRAGON_LINES), project/zh_lines.json and ../l10n.js; scripts/voice.py reads L (+ SAY readings) from here.

Who: H = 陽向 (hinata, for-women voice — card docs/characters/hinata_m.md), G = 岳 (gaku), R = 蓮 (ren) — their confirmed ElevenLabs
voices, unchanged. "You" = the woman player (お姉さん / きみ / お前). Everyone speaks Japanese there (h04 says it once). Design + thermal:
project/script.md. Story (≈ 3:00 + three free-talk windows): 1 契約の書斎 (an old book in a bookshop = a devil's contract; Hinata the
little-devil butler appears; tea; his dark whisper at your right ear) · 2 竜の谷 (Gaku the Black Dragon King: cliff wind from the LEFT, his
take-off gust = cold peak, his breath lights the beacon ahead = warm peak, then his wing closes around you on the LEFT — told and
shown: a dragon's wing holds fire inside — left ear cold → warm in < 1 s, window ①) · 3 氷の湖 (Ren the elf king of the snow forest:
cold ice under you, his song comes closer from the right — warmer as he nears, his cloak, window ②) · 4 書斎・夜更け (Hinata: granting
your wish would make him vanish, window ③) · 5 夜明け (pick one token → his last whisper → the bookshop again)."""
import json, os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

L = {
    # ---- 1 契約の書斎 (fireplace RIGHT, frosted window LEFT; a puff of black smoke = no temperature)
    'h01': ('H', '[cheerful] はじめまして、ご主人様っ。 [giggles] …えへへ、契約、成立〜。', 'Nice to meet you, Master. …Ehehe, the contract is sealed~.', '初次见面，主人。…嘿嘿，契约，成立～。'),
    'h02': ('H', '[playful] さっき、古い本、開いたでしょ？ あれ、悪魔の契約書なんだよ。', 'You opened an old book just now, right? That was a devil\'s contract.', '刚才，你打开了一本旧书吧？那是恶魔的契约书哦。'),
    'h03a': ('H', '[cheerful] お姉さんの願い事をひとつ叶えるまで、おれがお仕えするの。 執事の陽向です！', "Until I grant one wish of yours, I serve you. I'm Hinata, your butler!", '在实现姐姐的一个愿望之前，由我来侍奉你。我是执事陽向！'),
    'h03b': ('H', '[pouting] だーめ。 願い事を叶えるまでは、帰れないよ？ [cheerful] …あ、おれ、執事の陽向です！', "Nope. You can't go home until I grant your wish. …Oh, I'm Hinata, your butler!", '不——行。在实现愿望之前，你回不去哦？…啊，我是执事陽向！'),
    'h04': ('H', '[surprised] …あれ、言葉、通じてる。 [giggles] さすが、おれの契約。', '…Huh, we understand each other. Just what you\'d expect from my contract.', '…咦，语言是通的。不愧是我的契约。'),
    'h05': ('H', '[warmly] 寒かったでしょ。 熱い紅茶、どうぞ。 湯気ごと、召し上がれ。', 'You must be cold. Hot black tea — steam and all, please enjoy.', '很冷吧。热红茶，请用。连热气一起享用吧。'),
    'h06': ('H', '[whispers] …ねえ、お姉さん。 契約はね…解除、できないよ？', '…Hey, big sis. The contract… can\'t be undone, you know?', '…呐，姐姐。契约啊…是解除不了的哦？'),
    'h07': ('H', '[cheerful] さ、願い事を探しに行こ！ まずは竜の谷！ …おれの羽じゃ小さいから、竜の王様に迎えに来てもらったよ。', "Now, let's go find your wish! First, the dragon valley! …My wings are too small, so I asked the Dragon King to fetch us.", '那么，去找愿望吧！先去龙之谷！…我的翅膀太小了，所以请龙王来接我们了。'),
    # ---- 2 竜の谷 (cliff wind from the LEFT; take-off gust; dragon fire lights the beacon ahead; the warm wing)
    'g01': ('G', '[softly] …お前が、悪魔の新しい主か。', '…So you\'re the devil\'s new master.', '…你就是恶魔的新主人吗。'),
    'g02': ('G', '[softly] …岳。 この谷の、竜の王だ。', '…Gaku. King of the dragons of this valley.', '…岳。这座山谷的龙王。'),
    'h08': ('H', '[playful] 竜の王様、顔はいいけど、愛想ないんだよね〜。', 'The Dragon King has a great face, but zero charm~.', '龙王大人呀，脸是很好看，就是不讨人喜欢～。'),
    'g03': ('G', '[sighs] …顔の話は、いいって。', '…Enough about my face.', '…别再说脸的事了。'),
    'g04': ('G', '[softly] …寒いか。', '…Cold?', '…冷吗。'),
    'g05a': ('G', '[softly] …だろうな。 ここの風は、北の山から来る。', '…Figured. The wind here comes down from the northern peaks.', '…我想也是。这里的风，是从北边的山上吹下来的。'),
    'g05b': ('G', '[softly] …嘘つけ。 唇が、青い。', '…Liar. Your lips are blue.', '…骗人。你嘴唇都发青了。'),
    'g06': ('G', '[firmly] 烽火を灯す。 …下がってろ。', "I'll light the beacon. …Stand back.", '我去点烽火。…退后。'),
    'g07': ('G', '[softly] …竜の翼は、内側に火を持ってる。 …入れ。', "…A dragon's wing holds fire inside. …Get in.", '…龙的翅膀，内侧藏着火。…进来。'),
    'g08x': ('G', '[softly] …出るな。 風が強い。', "…Don't go out. The wind is strong.", '…别出去。风很大。'),
    'g09': ('G', '[whispers] …静かだろ。 俺の翼の中なら、風は来ない。', "…Quiet, right? Inside my wing, the wind can't reach you.", '…很安静吧。在我的翅膀里，风吹不进来。'),
    'g10': ('G', '[curious] …お前の世界にも、竜はいるのか。', '…Are there dragons in your world too?', '…你的世界里，也有龙吗。'),
    'g11': ('G', '[softly] …湖の向こうで、エルフの王が待ってる。 …背中に乗れ。', '…Beyond the lake, the Elf King is waiting. …Get on my back.', '…湖的另一边，精灵王在等着。…骑到我背上来。'),
    # ---- 3 氷の湖 (cold ice under you; his song from the far RIGHT coming closer; his cloak)
    'r01': ('R', '[singing] …ゆきの、もりに… ひかりが、ふる… ねむる、みずうみ… ほしを、だいて…', '…In the snowy forest… light comes falling… the sleeping lake… holds the stars…', '…雪之森林里…光在飘落…沉睡的湖泊…怀抱着星星…'),
    'r02': ('R', '[shy] …あ、聞こえてた？ …ちょっと、恥ずかしいな。', '…Ah, you heard that? …That\'s a little embarrassing.', '…啊，你听到了？…有点不好意思呢。'),
    'r03': ('R', '[warmly] 僕は、蓮。 この雪の森の、エルフの…一応、王様。', "I'm Ren. Of this snowy forest's elves… the king, I suppose.", '我是蓮。这片雪之森林的精灵的…姑且算是，国王。'),
    'r04': ('R', '[softly] 氷の上、冷たいでしょ。 …僕のマント、半分どうぞ。', "It's cold on the ice, isn't it. …Here, half of my cloak.", '冰面上很冷吧。…我的斗篷，分你一半。'),
    'r05a': ('R', '[singing] …ゆきの、もりに… きみが、きた… とけない、よるに… ひとつ、ひかり…', '…In the snowy forest… you came along… in a night that won\'t melt… a single light…', '…雪之森林里…你来到了…在不会融化的夜里…一道光…'),
    'r05b': ('R', '[softly] …この湖の氷はね、千年とけないんだ。 星の光が、閉じこめられてる。', '…The ice on this lake hasn\'t melted for a thousand years. Starlight is sealed inside it.', '…这湖面上的冰啊，一千年都没有融化。星光被封在里面了。'),
    'r06': ('R', '[whispers] …きみが来てくれて、森が、少しあったかくなった気がする。', '…Since you came, the forest feels a little warmer.', '…你来了以后，森林好像变得暖和了一点。'),
    'r07': ('R', '[curious] …ねえ。 きみの世界では、どんな歌が好き？', '…Hey. What kind of songs do you like in your world?', '…呐。在你的世界里，你喜欢什么样的歌？'),
    'r08': ('R', '[softly] …夜が明けたら、書斎に戻ろう。 陽向くんが、待ってる。', "…When dawn comes, let's go back to the study. Hinata is waiting.", '…天亮了，就回书房吧。陽向在等着呢。'),
    # ---- 4 書斎・夜更け (the fire burned low, Hinata's honest side)
    'h09': ('H', '[cheerful] おかえり、ご主人様っ。 願い事、決まった？', 'Welcome back, Master. Decided on your wish?', '欢迎回来，主人。愿望决定好了吗？'),
    'h10': ('H', '[whispers] …ねえ。 願い事を叶えたら、おれ、消えちゃうんだ。 …だから、ゆっくり決めて？', '…Hey. Once I grant your wish, I disappear. …So take your time deciding?', '…呐。实现了愿望，我就会消失。…所以，慢慢决定好吗？'),
    'h11a': ('H', '[surprised] …え。 [softly] …そんなこと言われたの、はじめて。 …ずるいよ、お姉さん。', "…Eh. …No one's ever said that to me. …That's not fair, big sis.", '…诶。…第一次有人这样对我说。…太狡猾了，姐姐。'),
    'h11b': ('H', '[giggles] …えへへ。 じゃあ、契約はまだまだ続くね。 …作戦どおり。', '…Ehehe. Then the contract goes on and on. …Just as planned.', '…嘿嘿。那契约就还要继续下去了呢。…正中下怀。'),
    'h12': ('H', '[curious] …ねえ、お姉さんの世界のこと、教えて？', '…Hey, tell me about your world?', '…呐，给我讲讲姐姐的世界吧？'),
    # ---- 5 夜明け (sunrise through the frosted window, embers; pick one token)
    'h13': ('H', '[softly] …朝だ。 帰り道の本、光ってる。', "…It's morning. The book home is glowing.", '…早上了。回去的那本书，在发光。'),
    'g12': ('G', '[softly] …行くのか。 …なら、ひとつ持っていけ。', '…You\'re going. …Then take one thing with you.', '…要走了吗。…那，带一样东西走。'),
    'r09': ('R', '[softly] …ひとつだけ、選んで。 僕たちの、どれか。', '…Choose just one. From one of us.', '…只能选一样。从我们之中选一个。'),
    'g13': ('G', '[whispers] …俺の鱗だ。 寒い夜は、握れ。 …少し、あったかい。', '…My scale. On cold nights, hold it. …It\'s a little warm.', '…我的鳞片。冷的夜里，就握着它。…会有点暖。'),
    'r10': ('R', '[whispers] …とけない、氷の花。 …僕の歌、覚えててね。', "…An ice flower that never melts. …Remember my song.", '…不会融化的冰之花。…要记得我的歌哦。'),
    'h14': ('H', '[whispers] …契約書の切れ端。 …ね、だから言ったでしょ。 解除、できないって。', '…A scrap of the contract. …See, I told you. It can\'t be undone.', '…契约书的碎片。…你看，我早说过了吧。解除不了的。'),
    # ---- bridges
    'bh_future': ('H', '[surprised] すまほ？ なにそれ、新しい魔導具？ …おれにも一個ちょうだい！', 'A smartphone? What, a new magic tool? …Give me one too!', '手机？那是什么，新的魔导具？…也给我一个嘛！'),
    'bh_food': ('H', '[cheerful] お腹すいた？ 執事におまかせ！ 焼きたてのスコーン、持ってくるね。', 'Hungry? Leave it to your butler! I\'ll bring fresh scones.', '饿了？交给执事吧！我去拿刚烤好的司康。'),
    'bh_cold': ('H', '[playful] 寒いの？ じゃあ、おれがくっついてあげる。 …悪魔って、体温高いんだよ？', "Cold? Then I'll snuggle up. …Devils run warm, you know?", '冷吗？那我贴着你吧。…恶魔的体温，可是很高的哦？'),
    'bh_sleep': ('H', '[whispers] …眠いの？ いいよ。 おれ、ずーっと見てるから。', "…Sleepy? It's fine. I'll be watching you the whole time.", '…困了吗？没关系哦。我会一直、一直看着你。'),
    'bh_praise': ('H', '[giggles] えへへ、知ってる〜。 …でも、お姉さんに言われると、ちょっと照れる。', 'Ehehe, I know~. …But when you say it, I get a little shy.', '嘿嘿，我知道～。…不过被姐姐这么说，有点害羞。'),
    'bh_name': ('H', '[cheerful] 陽向！ ひなたぼっこの、ひなた。 …悪魔なのに、変でしょ？', "Hinata! As in basking in the sun. …Weird for a devil, right?", '陽向！就是晒太阳的那个陽向。…明明是恶魔，很奇怪吧？'),
    'bh_thanks': ('H', '[playful] お礼？ じゃあ…契約、延長ね。', 'Thanks? Then… the contract is extended.', '道谢？那就…契约延长咯。'),
    'bh_leave': ('H', '[pouting] 帰りたいの？ …だーめ。 [softly] …夜明けまでは、おれのご主人様でいて。', "You want to go home? …Nope. …Until dawn, stay my master.", '想回去？…不——行。…在天亮之前，继续当我的主人吧。'),
    'bh_yes': ('H', '[excited] ほんと！？ じゃあ今度、おれをそっちに召喚してよ！', 'Really?! Then summon me over there sometime!', '真的！？那下次，把我召唤到你那边去吧！'),
    'bh_no': ('H', '[playful] ふーん。 じゃあ、おれが最初の悪魔だね。 …光栄でしょ？', 'Hmm. Then I\'m your very first devil. …Honoured, right?', '哼——嗯。那我就是你的第一个恶魔咯。…很荣幸吧？'),
    'bh_gen1': ('H', '[giggles] えへへ、お姉さん、変なの〜。 …好きだけど。', 'Ehehe, you\'re weird, big sis~. …I like it though.', '嘿嘿，姐姐好奇怪～。…不过我喜欢。'),
    'bh_gen2': ('H', '[curious] ん〜？ よくわかんないけど、お姉さんが楽しいなら、いっか！', "Hmm~? I don't really get it, but if you're having fun, that's fine!", '嗯～？不太懂，不过姐姐开心就好！'),
    'bh_silence': ('H', '[whispers] …黙っちゃった。 …かわいいね、お姉さん。', '…You went quiet. …You\'re cute, big sis.', '…不说话了。…姐姐，真可爱。'),
    'bg_future': ('G', '[softly] …空を飛ぶ鉄の箱、か。 …竜より速いのか。 …少し、悔しいな。', "…An iron box that flies, huh. …Faster than a dragon? …That stings a little.", '…会飞的铁箱子吗。…比龙还快？…有点不甘心。'),
    'bg_food': ('G', '[softly] …腹が減ったのか。 谷の果実がある。 …甘いぞ。', '…Hungry? There\'s fruit in the valley. …It\'s sweet.', '…饿了吗。山谷里有果子。…很甜。'),
    'bg_cold': ('G', '[softly] …寒いなら、もっと翼の奥に来い。', '…If you\'re cold, come deeper into the wing.', '…冷的话，往翅膀里面再靠一点。'),
    'bg_sleep': ('G', '[softly] …眠いなら、寝ていい。 竜は、夜通し起きていられる。', "…If you're sleepy, sleep. Dragons can stay up all night.", '…困了就睡吧。龙可以整夜不睡。'),
    'bg_praise': ('G', '[sighs] …顔の話は、いいって。 [softly] …でも、悪い気はしない。', "…Enough about my face. …Though I don't mind it.", '…都说了别提脸的事。…不过，感觉不坏。'),
    'bg_name': ('G', '[softly] …岳。 山、って意味だ。 …動かない。 お前がどこにいても。', "…Gaku. It means mountain. …It doesn't move. Wherever you are.", '…岳。是山的意思。…不会动。无论你在哪里。'),
    'bg_thanks': ('G', '[softly] …礼はいい。 …お前が寒くなければ、それでいい。', "…No need for thanks. …As long as you're not cold.", '…不用谢。…只要你不冷就好。'),
    'bg_leave': ('G', '[softly] …帰りたいか。 …朝になったら、送ってやる。', '…You want to go home. …I\'ll take you in the morning.', '…想回去吗。…天亮了，我送你。'),
    'bg_yes': ('G', '[curious] …そうか。 なら、いつか会ってみたい。', '…I see. Then I\'d like to meet them someday.', '…是吗。那总有一天，想见见他们。'),
    'bg_no': ('G', '[softly] …そうか。 …なら、俺が最初の竜だな。', '…I see. …Then I\'m your first dragon.', '…是吗。…那我就是你的第一条龙了。'),
    'bg_gen1': ('G', '[softly] …ふうん。 …お前の話は、悪くない。', '…Hm. …Your stories aren\'t bad.', '…嗯。…你说的话，不坏。'),
    'bg_gen2': ('G', '[softly] …よく、わからん。 …でも、聞いてる。', "…I don't really get it. …But I'm listening.", '…不太懂。…不过，我在听。'),
    'bg_silence': ('G', '[softly] …黙ってるのも、いい。 …風の音だけ、聞いてろ。', '…Silence is fine too. …Just listen to the wind.', '…不说话也好。…只听着风声就好。'),
    'br_future': ('R', '[curious] …未来の歌は、小さな板から聞こえるの？ …ふしぎだね。', '…Future songs come out of a little slab? …How strange.', '…未来的歌，是从小板子里传出来的吗？…真奇妙。'),
    'br_food': ('R', '[softly] お腹すいた？ …森の木の実の蜜、少しなめてみて。', 'Hungry? …Try a little of the forest\'s nut honey.', '饿了吗？…尝一点森林里的果蜜吧。'),
    'br_cold': ('R', '[softly] …寒いよね。 マント、もっと引き寄せていいよ。', "…It's cold, isn't it. Pull the cloak closer if you like.", '…很冷吧。斗篷，可以再拉近一点哦。'),
    'br_sleep': ('R', '[whispers] …眠いなら、子守唄、歌おうか。', '…If you\'re sleepy, shall I sing a lullaby?', '…困了的话，我给你唱摇篮曲吧。'),
    'br_praise': ('R', '[shy] …っ、そんなこと…。 …ありがとう。 僕、照れると耳が赤くなるんだ。', "…Ah, you don't have to… …Thank you. My ears go red when I'm embarrassed.", '…啊，那种话…。…谢谢。我一害羞，耳朵就会变红。'),
    'br_name': ('R', '[softly] …蓮。 水の上に咲く花。 …氷の湖には、咲けないけど。', "…Ren. A flower that blooms on water. …Though it can't bloom on an icy lake.", '…蓮。开在水上的花。…虽然在冰湖上开不了。'),
    'br_thanks': ('R', '[warmly] …どういたしまして。 聞いてくれて、ありがとう。', "…You're welcome. Thank you for listening.", '…不客气。谢谢你听我唱歌。'),
    'br_leave': ('R', '[softly] …帰りたいよね。 …夜明けまで、もう一曲だけ、いい？', '…You want to go home. …One more song until dawn, okay?', '…想回去吧。…在天亮之前，再唱一首，好吗？'),
    'br_yes': ('R', '[warmly] …そっか。 じゃあ、いつかその歌、僕にも教えて。', '…I see. Then teach me that song someday.', '…这样啊。那总有一天，也教我那首歌吧。'),
    'br_no': ('R', '[softly] …そっか。 じゃあ、僕の歌を、きみの最初の一曲にして。', '…I see. Then let my song be your first.', '…这样啊。那就把我的歌，当作你的第一首吧。'),
    'br_gen1': ('R', '[laughs softly] …ふふ。 きみの話し方、歌みたい。', '…Heh. The way you talk sounds like a song.', '…呵呵。你说话的样子，像唱歌一样。'),
    'br_gen2': ('R', '[softly] …ごめん、半分くらいしか、わからなかった。 …でも、もっと聞きたい。', "…Sorry, I only understood about half. …But I want to hear more.", '…对不起，我只听懂了一半。…不过，还想多听一些。'),
    'br_silence': ('R', '[softly] …静かな夜だね。 …氷の鳴る音、聞こえる？', '…A quiet night. …Can you hear the ice singing?', '…真是安静的夜晚。…听得到冰在鸣响吗？'),
    # ---- もっと話す · place × cast (new lines)
    'sh1': ('H', '[cheerful] おかえりなさいませ、ご主人様っ！ 紅茶、淹れなおすね。', 'Welcome home, Master! I\'ll make fresh tea.', '欢迎回来，主人！我重新泡一壶红茶。'),
    'sh2': ('H', '[playful] この書斎の本、ぜーんぶ契約書なんだよ。 …うそ。 半分だけ。', 'Every book in this study is a contract. …Kidding. Only half.', '这书房里的书，全部都是契约书哦。…骗你的。只有一半。'),
    'sh3': ('H', '[whispers] …暖炉の火、おれがつけたの。 悪魔の火だけど、ちゃんとあったかいでしょ？', "…I lit the fire. It's devil fire, but it's properly warm, right?", '…壁炉的火是我点的。虽然是恶魔之火，但很暖和吧？'),
    'sg1': ('G', '[softly] …ここの本は、読めん。 …竜の手には、小さすぎる。', "…I can't read these books. …Too small for a dragon's hands.", '…这里的书，我读不了。…对龙的手来说太小了。'),
    'sg2': ('G', '[whispers] …暖炉の前にいろ。 お前は、すぐ冷える。', '…Stay by the fire. You get cold so easily.', '…待在壁炉前。你很容易着凉。'),
    'sr1': ('R', '[softly] …本の匂い、好きなんだ。 雪の森には、紙がないから。', "…I love the smell of books. There's no paper in the snow forest.", '…我喜欢书的味道。雪之森林里没有纸。'),
    'sr2': ('R', '[whispers] …暖炉のそばで歌うと、声がやわらかくなる気がする。', '…Singing by the fire, my voice feels softer.', '…在壁炉旁唱歌，声音好像会变得柔和。'),
    'vg1': ('G', '[softly] …また、谷に来たのか。 …風が強い。 こっちだ。', '…Back in the valley? …The wind\'s strong. This way.', '…又来山谷了吗。…风很大。这边。'),
    'vg2': ('G', '[softly] …あの烽火は、千年、竜が守ってきた。 …消えたことはない。', "…Dragons have kept that beacon for a thousand years. …It's never gone out.", '…那座烽火，龙守护了一千年。…从来没有熄灭过。'),
    'vg3': ('G', '[curious] …飛びたいか。 …背中に乗れ。 落とさない。', "…Want to fly? …Get on my back. I won't drop you.", '…想飞吗。…骑到我背上。不会让你掉下去。'),
    'vg4': ('G', '[whispers] …谷の夜は長い。 …翼の中で、休め。', '…Nights in the valley are long. …Rest inside my wing.', '…山谷的夜很长。…在翅膀里休息吧。'),
    'vh1': ('H', '[surprised] うわっ、風つよっ！ おれの羽じゃ、飛ばされちゃう〜！', "Whoa, the wind's strong! My little wings would get blown away~!", '哇，风好大！我的翅膀会被吹飞的～！'),
    'vh2': ('H', '[whispers] …竜の王様の翼の中、ずるいくらいあったかいね。 …おれも入れて。', "…Inside the Dragon King's wing it's unfairly warm. …Let me in too.", '…龙王大人的翅膀里，暖和得狡猾呢。…也让我进去嘛。'),
    'vr1': ('R', '[softly] …竜の谷は、ちょっと苦手。 雪の森より、風が乱暴なんだ。', "…I'm not fond of the dragon valley. The wind here is rougher than in the snow forest.", '…龙之谷，我有点不擅长。这里的风比雪之森林粗暴。'),
    'vr2': ('R', '[whispers] …岳の烽火、ここから見ると、星みたいだね。', "…Gaku's beacon looks like a star from here.", '…岳的烽火，从这里看，像星星一样呢。'),
    'lr1': ('R', '[warmly] …また来てくれたんだ。 湖が、喜んでる。', '…You came again. The lake is happy.', '…你又来了。湖泊很高兴呢。'),
    'lr2': ('R', '[softly] 見て。 空の光のカーテン。 …今夜は、緑と紫。', 'Look. The curtain of light in the sky. …Green and violet tonight.', '你看。天上的光之帘幕。…今晚是绿色和紫色。'),
    'lr3': ('R', '[curious] …歌の続き、聞きたい？', '…Do you want to hear the rest of the song?', '…想听歌的后半段吗？'),
    'lr4': ('R', '[whispers] …おやすみ。 …夢の中でも、歌ってあげる。', '…Good night. …I\'ll sing to you in your dreams too.', '…晚安。…在梦里，我也为你唱歌。'),
    'lh1': ('H', '[surprised] つめたっ！ 氷の上、すべる〜！ お姉さん、手、つないで！', "Cold! The ice is slippery~! Big sis, hold my hand!", '好冰！冰面好滑～！姐姐，牵着我的手！'),
    'lh2': ('H', '[whispers] …エルフの王様の歌、ちょっと妬けるな。 …おれも、歌おっか？', "…The Elf King's song makes me a little jealous. …Shall I sing too?", '…精灵王的歌，让我有点嫉妒。…我也来唱吧？'),
    'lg1': ('G', '[softly] …湖の氷は、厚い。 …だが、俺の後ろを歩け。', "…The ice is thick. …But walk behind me.", '…湖面的冰很厚。…不过，走在我后面。'),
    'lg2': ('G', '[whispers] …蓮の歌は、いい。 …竜にも、わかる。', "…Ren's song is good. …Even a dragon can tell.", '…蓮的歌很好听。…连龙都听得懂。'),
    'dh1': ('H', '[softly] …朝になっちゃった。 …契約の夜、楽しかったね。', "…It's morning already. …The night of the contract was fun, wasn't it.", '…已经早上了。…契约之夜，很开心呢。'),
    'dg1': ('G', '[softly] …朝日か。 …竜は、朝が少し苦手だ。 …まぶしい。', "…The sunrise. …Dragons aren't fond of mornings. …Too bright.", '…朝阳啊。…龙有点不喜欢早上。…太刺眼了。'),
    'dr1': ('R', '[softly] …朝の光で、氷の花が光ってる。 …きれいだね。', '…The ice flower is shining in the morning light. …Beautiful.', '…冰之花在晨光中闪耀。…真美呢。'),
    'tt1': ('H', '[cheerful] みんな、そろったよ〜！ ご主人様のお見送り！', "Everyone's here~! Seeing our master off!", '大家都到齐啦～！为主人送行！'),
    'tt2': ('R', '[softly] 帰る前に、少しだけ、話そう。', "Let's talk a little before you go.", '回去之前，再聊一会儿吧。'),
    'tt3': ('G', '[softly] …言いたいことがあるなら、今だ。', "…If there's something you want to say, now's the time.", '…有想说的，就趁现在。'),
    'tt4': ('R', '[warmly] きみの世界でも、歌を忘れないで。', "Don't forget the songs in your world either.", '在你的世界里，也别忘了歌。'),
    'tt5': ('H', '[whispers] …またね、ご主人様。', '…See you, Master.', '…下次见，主人。'),
    'tt6': ('G', '[whispers] …またな。', '…See you.', '…再见。'),
    # place bridges
    'bh_p_study': ('H', '[playful] 右は暖炉、左は霜の窓。 …おれの書斎、あったかいとつめたいが半分こ。', "The fire on the right, the frosted window on the left. …My study is half warm, half cold.", '右边是壁炉，左边是结霜的窗。…我的书房，暖和冰冷各一半。'),
    'bg_p_study': ('G', '[softly] …人の部屋は、狭い。 …だが、暖炉はいい。', "…Human rooms are cramped. …But the fireplace is good.", '…人类的房间太窄了。…不过，壁炉不错。'),
    'br_p_study': ('R', '[softly] …暖炉の薪、雪の森のだね。 …いい匂い。', "…The firewood is from the snow forest. …Smells nice.", '…壁炉的柴，是雪之森林的呢。…好香。'),
    'bh_p_valley': ('H', '[surprised] この谷の風、左からびゅーって来るの！ 耳、ちぎれそう〜！', "The wind in this valley comes whooshing from the left! My ears are going to fall off~!", '这山谷的风，从左边呼呼地吹过来！耳朵都要被吹掉了～！'),
    'bg_p_valley': ('G', '[softly] …風は左から。 火は前に。 …俺は、お前の左に立つ。', "…The wind comes from the left. The fire is ahead. …I'll stand on your left.", '…风从左边来。火在前方。…我站在你左边。'),
    'br_p_valley': ('R', '[softly] …烽火の火、ここまで、あったかいね。', '…The beacon fire is warm even from here.', '…烽火的热，连这里都感觉得到呢。'),
    'bh_p_lake': ('H', '[playful] 氷の上って、下からひんやりするよね。 …おれのしっぽ、巻いてあげよっか？', "Ice chills you from below, right? …Shall I wrap my tail around you?", '冰面上，从下面凉飕飕的吧。…要我用尾巴卷着你吗？'),
    'bg_p_lake': ('G', '[softly] …氷の下に、星がある。 …蓮の湖だ。', '…There are stars under the ice. …Ren\'s lake.', '…冰的下面有星星。…蓮的湖。'),
    'br_p_lake': ('R', '[softly] …氷の下の星はね、僕が子どものころから、ずっと同じ場所にあるんだ。', "…The stars under the ice have been in the same place since I was a child.", '…冰下的星星啊，从我小时候起，就一直在同样的位置。'),
    'bh_p_dawn': ('H', '[softly] 朝日が出たら、本が開いちゃう。 …ちぇっ。', "When the sun comes up, the book opens. …Tch.", '太阳一出来，书就会打开。…切。'),
    'bg_p_dawn': ('G', '[softly] …朝の光は、竜には眩しい。 …だが、お前の顔がよく見える。', "…Morning light is dazzling for a dragon. …But I can see your face clearly.", '…晨光对龙来说太刺眼了。…不过，能清楚地看见你的脸。'),
    'br_p_dawn': ('R', '[softly] 朝の風は、まだ冷たいね。 …でも、日差しはあったかい。', 'The morning wind is still cold. …But the sunshine is warm.', '早上的风还很冷呢。…不过，阳光很暖和。'),
}
SAY = {'陽向': 'ひなた', '岳': 'がく', '蓮': 'れん', '烽火': 'のろし', '鱗': 'うろこ', '執事': 'しつじ', '書斎': 'しょさい', '召し上がれ': 'めしあがれ',
       '魔導具': 'まどうぐ', '子守唄': 'こもりうた', '妬ける': 'やける', '眩しい': 'まぶしい', '薪': 'まき', '千年': 'せんねん'}

TOPICS = [
    ['leave', r'帰りたい|帰る|かえりたい|かえる|go home|going home|leave|回家|回去|想回'],
    ['thanks', r'ありがと|有難|感謝|thank|谢谢|感谢|多谢'],
    ['future', r'未来|みらい|スマホ|携帯|電車|飛行機|電話|インターネット|ネット|future|phone|internet|computer|car|train|plane|手机|网络|电脑|电话|飞机'],
    ['food', r'お腹|おなか|ご飯|ごはん|紅茶|お茶|スコーン|果物|食べ|たべ|おいし|美味|food|eat|hungry|delicious|tea|scone|fruit|饿|吃|好吃|茶|红茶|果子'],
    ['sleep', r'眠|寝|ねむ|ねる|sleep|tired|dream|nap|睡|困|梦|累'],
    ['cold', r'寒|さむ|冷|つめた|氷|こおり|風|かぜ|雪|ゆき|あったか|暖|温|cold|ice|wind|snow|warm|freez|chill|冷|冰|风|雪|暖|热|冻'],
    ['praise', r'かっこい|格好い|きれい|綺麗|すてき|素敵|イケメン|好き|すき|かわいい|cool|handsome|beautiful|gorgeous|love|like you|cute|帅|好看|漂亮|喜欢|可爱|迷人'],
    ['name', r'名前|なまえ|name|名字|叫什么|你是谁'],
    ['no', r'いいえ|いや|ちがう|違う|ううん|いない|ない|no\b|nope|not|不|没有'],
    ['yes', r'はい|うん|そう|ええ|もちろん|ほんと|本当|いる|ある|yes|yeah|yep|sure|of course|really|是|对|嗯|当然|真的|有'],
]
YN_ONLY = ['yes', 'no']
CAST = 'HGR'
BRIDGES = {c: {k: f'b{c.lower()}_{k}' for k in ['future', 'food', 'cold', 'sleep', 'praise', 'name', 'thanks', 'leave', 'yes', 'no', 'silence']
               if f'b{c.lower()}_{k}' in L} for c in CAST}
for c in CAST: BRIDGES[c]['generic'] = [f'b{c.lower()}_gen1', f'b{c.lower()}_gen2']

STEPS = [
    {'id': 'study', 'ja': '契約の書斎', 'en': 'The contract study', 'zh': '契约书房', 'view': ['study_H', 'study_H_ear'], 'beats': [
        ['@study'], ['@smoke'], ['h01', 'front'], ['h02', 'front'],
        {'type': 'choice', 'options': [{'ja': '契約って、なに？', 'en': 'What contract?', 'zh': '什么契约？', 'then': ['h03a']},
                                       {'ja': '帰して', 'en': 'Send me home', 'zh': '让我回去', 'then': ['h03b']}]},
        ['h04', 'front'], ['@tea'], ['h05', 'near'],
        {'type': 'action', 'ja': '紅茶を飲む', 'en': 'Drink the tea', 'zh': '喝红茶'},
        ['@tea_off'], ['h06', 'right_ear'], ['h07', 'near']]},
    {'id': 'valley', 'ja': '竜の谷', 'en': 'The dragon valley', 'zh': '龙之谷', 'view': ['valley_G', 'valley_G_wing'], 'beats': [
        ['@valley'], ['g01', 'front'], ['g02', 'front'], ['h08', 'right'], ['g03', 'front'], ['g04', 'near'],
        {'type': 'choice', 'options': [{'ja': '寒い', 'en': "I'm cold", 'zh': '好冷', 'then': ['g05a']},
                                       {'ja': '平気', 'en': "I'm fine", 'zh': '没事', 'then': ['g05b']}]},
        ['g06', 'front'], ['@takeoff_gust'], ['@breath'], ['g07', 'near'], ['@wing'],
        {'type': 'hold', 'ja': '翼の中にいる（長押し）', 'en': 'Stay inside his wing (press and hold)', 'zh': '待在翅膀里（长按）', 'event': '@wing_hold', 'secs': 4, 'let_go': ['g08x']},
        ['g09', 'left_ear'], ['window', 'G', 'g10'], ['g11', 'near']]},
    {'id': 'lake', 'ja': '氷の湖', 'en': 'The frozen lake', 'zh': '冰湖', 'view': ['lake_R', 'lake_R_ear'], 'beats': [
        ['@lake'], ['@song_far'], ['r01', 'far_right'], ['@song_near'], ['r02', 'right'], ['r03', 'front'], ['@cloak'], ['r04', 'near'],
        {'type': 'choice', 'options': [{'ja': '歌って', 'en': 'Sing for me', 'zh': '唱首歌吧', 'then': ['r05a'], 'ear': 'right_ear'},
                                       {'ja': 'お話しして', 'en': 'Tell me a story', 'zh': '讲点什么吧', 'then': ['r05b']}]},
        ['r06', 'right_ear'], ['window', 'R', 'r07'], ['r08', 'near']]},
    {'id': 'night', 'ja': '書斎・夜更け', 'en': 'The study, late at night', 'zh': '深夜的书房', 'view': ['night_H', 'night_H_ear'], 'beats': [
        ['@night'], ['h09', 'front'], ['h10', 'right_ear'],
        {'type': 'choice', 'options': [{'ja': '消えないで', 'en': "Don't disappear", 'zh': '不要消失', 'then': ['h11a'], 'ear': 'right_ear'},
                                       {'ja': 'じゃあ、まだ決めない', 'en': "Then I won't decide yet", 'zh': '那我先不决定', 'then': ['h11b'], 'ear': 'right_ear'}]},
        ['window', 'H', 'h12']]},
    {'id': 'dawn', 'ja': '夜明け', 'en': 'Dawn', 'zh': '黎明', 'view': ['dawn_3'], 'beats': [
        ['@sunrise'], ['h13', 'right'], ['g12', 'left'], ['r09', 'front'],
        {'type': 'choice', 'ending': True, 'options': [
            {'ja': '陽向の契約書', 'en': "Hinata's contract scrap", 'zh': '陽向的契约书', 'then': ['h14'], 'who': 'H', 'ear': 'right_ear', 'token': '📜'},
            {'ja': '岳の鱗', 'en': "Gaku's scale", 'zh': '岳的鳞片', 'then': ['g13'], 'who': 'G', 'ear': 'left_ear', 'token': '🐉'},
            {'ja': '蓮の氷の花', 'en': "Ren's ice flower", 'zh': '蓮的冰之花', 'then': ['r10'], 'who': 'R', 'ear': 'right_ear', 'token': '❄️'}]}]},
]
PLACES = {
    'study': {'ja': '契約の書斎', 'en': 'The study', 'zh': '契约书房', 'icon': '📜',
              'topic': ['study', r'本|ほん|書斎|暖炉|だんろ|窓|まど|契約|book|study|fireplace|window|contract|书|书房|壁炉|窗|契约'],
              'cast': {'H': [[['sh1', 'front']], [['@tea'], ['h05', 'near']], [['sh2', 'front']], [['@tea_off'], ['sh3', 'right_ear']], [['h06', 'right_ear']]],
                       'G': [[['sg1', 'front']], [['bg_p_study', 'near']], [['sg2', 'left_ear']]],
                       'R': [[['sr1', 'front']], [['br_p_study', 'near']], [['sr2', 'right_ear']]],
                       'HGR': [[['sh1', 'right'], ['sg1', 'left']], [['@tea'], ['sr1', 'front']], [['sh2', 'right']], [['@tea_off'], ['sg2', 'left_ear'], ['sh3', 'right_ear']]]}},
    'valley': {'ja': '竜の谷', 'en': 'The dragon valley', 'zh': '龙之谷', 'icon': '🐉',
               'topic': ['valley', r'竜|りゅう|ドラゴン|翼|つばさ|風|かぜ|烽火|のろし|火|dragon|wing|wind|beacon|fire|龙|翅膀|风|烽火|火'],
               'cast': {'G': [[['vg1', 'front']], [['vg2', 'front']], [['@breath'], ['vg3', 'near']], [['@wing'], ['vg4', 'left_ear']], [['g09', 'left_ear']]],
                        'H': [[['vh1', 'near']], [['bh_p_valley', 'near']], [['vh2', 'right_ear']]],
                        'R': [[['vr1', 'front']], [['@breath'], ['br_p_valley', 'near']], [['vr2', 'right_ear']]],
                        'HGR': [[['vg1', 'front'], ['vh1', 'right']], [['@breath'], ['vg2', 'front']], [['vr1', 'right']], [['@wing'], ['vg4', 'left_ear']]]}},
    'lake': {'ja': '氷の湖', 'en': 'The frozen lake', 'zh': '冰湖', 'icon': '❄️',
             'topic': ['lake', r'湖|みずうみ|氷|こおり|歌|うた|星|ほし|オーロラ|lake|ice|song|sing|star|aurora|湖|冰|歌|星星|极光'],
             'cast': {'R': [[['lr1', 'front']], [['lr2', 'front']], [['@cloak'], ['lr3', 'near']], [['r05a', 'right_ear']], [['lr4', 'right_ear']]],
                      'H': [[['lh1', 'near']], [['bh_p_lake', 'near']], [['lh2', 'right_ear']]],
                      'G': [[['lg1', 'front']], [['bg_p_lake', 'near']], [['lg2', 'left_ear']]],
                      'HGR': [[['lr1', 'front'], ['lh1', 'right']], [['lg1', 'left']], [['@cloak'], ['lr2', 'front']], [['lr4', 'right_ear']]]}},
    'dawn': {'ja': '夜明け', 'en': 'Dawn', 'zh': '黎明', 'icon': '🌅',
             'topic': ['dawn', r'朝日|あさひ|朝|日の出|太陽|まぶし|本|sun|sunrise|dawn|morning|bright|book|太阳|日出|朝阳|早上|书'],
             'cast': {'HGR': [[['tt1', 'right'], ['@sunrise'], ['tt2', 'front']], [['tt3', 'left']], [['tt4', 'front']], [['tt5', 'right'], ['tt6', 'left']]],
                      'H': [[['@sunrise'], ['dh1', 'near']], [['h13', 'near']], [['tt5', 'right_ear']]],
                      'G': [[['@sunrise'], ['dg1', 'near']], [['g12', 'near']], [['tt6', 'left_ear']]],
                      'R': [[['@sunrise'], ['dr1', 'near']], [['r09', 'near']], [['tt4', 'right_ear']]]}},
}
for pl, P in PLACES.items():
    k = P['topic'][0]; P['bridges'] = {c: {k: [f'b{c.lower()}_p_{k}']} for c in CAST if f'b{c.lower()}_p_{k}' in L}
NAMES = {'陽向': {'en': 'Hinata', 'zh': '陽向'}, '岳': {'en': 'Gaku', 'zh': '岳'}, '蓮': {'en': 'Ren', 'zh': '蓮'}}
WHO = {'H': '陽向', 'G': '岳', 'R': '蓮'}
VOICE = {'all': {
    '契約って、なに？': ['什么契约', '契约是什么', 'what contract', "what's the contract", 'けいやくってなに', 'なんの契約'],
    '帰して': ['让我回去', '送我回去', '我要回家', 'send me home', 'let me go home', 'かえして', '帰りたい'],
    '紅茶を飲む': ['喝红茶', '喝茶', '我喝', 'drink the tea', 'drink', 'thank you', 'こうちゃをのむ', 'いただきます'],
    '寒い': ['好冷', '冷', '我冷', "i'm cold", 'cold', 'freezing', 'さむい'],
    '平気': ['没事', '我没事', '不冷', "i'm fine", 'fine', "i'm okay", 'へいき', 'だいじょうぶ'],
    '翼の中にいる（長押し）': ['待在翅膀里', '翅膀', 'stay inside', 'wing', 'stay', 'つばさ', 'なかにいる'],
    '歌って': ['唱首歌', '唱歌', '唱吧', 'sing for me', 'sing', 'sing a song', 'うたって', '歌'],
    'お話しして': ['讲点什么', '说说话', '聊天', 'tell me a story', 'talk to me', 'talk', 'おはなし', 'はなして'],
    '消えないで': ['不要消失', '别消失', '别走', "don't disappear", "don't go", 'stay', 'きえないで'],
    'じゃあ、まだ決めない': ['先不决定', '还不决定', '不决定', "i won't decide yet", 'not yet', 'later', 'まだきめない', 'まだ'],
    '陽向の契約書': ['陽向', '契约书', '契约', 'hinata', 'contract', 'the contract', 'ひなた', 'けいやくしょ'],
    '岳の鱗': ['岳', '鳞片', '鳞', 'gaku', 'scale', 'dragon scale', 'がく', 'うろこ'],
    '蓮の氷の花': ['蓮', '冰之花', '冰花', 'ren', 'ice flower', 'flower', 'れん', 'こおりのはな'],
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
    head = ("// 『竜の王と、エルフの王と、小悪魔』 lines: id → [ja, en, who]  (H 陽向 · G 岳 · R 蓮). GENERATED by scripts/script_data.py — edit there.\n"
            "// steps: the story as data (beats, interactions, '@events' = project/thermal_plan.json, free-talk windows); bridges: who → topic → id;\n"
            "// topics: [key, regex] in order; places: もっと話す place × cast (beats per cast, own topic + bridges).\n")
    open(os.path.join(ROOT, 'lines.js'), 'w', encoding='utf-8').write(head + 'window.DRAGON_LINES = ' + json.dumps(data, ensure_ascii=False, indent=1) + ';\n')
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
