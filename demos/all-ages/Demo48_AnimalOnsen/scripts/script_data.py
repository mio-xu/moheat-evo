#!/usr/bin/env python3
"""THE script of Demo48 『ゆけむり どうぶつおんせん』 (Steamy Animal Hot Spring, all-ages ⑥, proposal B3) — tagged Japanese + English + 中文
and the game stages as data. `python3 scripts/script_data.py` → ../lines.js (window.ONSEN_LINES), project/zh_lines.json, ../l10n.js.

Who: Y = ゆずじい (yuzujii, the slow capybara owner), P = ペンギン (penguin guest), M = おさる (monkey mother; voice = staff_f reused with
a livelier delivery), F = キツネ (fox guest, light-blue yukata + towel on its head). Game (≈ 2:30): the hot pipe is on your LEFT (open = hot
steam from the left), the cold mountain-spring pipe on your RIGHT (open = cold splash from the right); the little bath in front shows its
temperature as warm / cool on both ears. Guests want different temperatures; keep it in their band for 3 s.
 1 開店 (Yuzu-jii teaches the two valves) · 2 ペンギン (almost cold) · 3 おさる親子 (mother HOT left bath, child lukewarm right bath) ·
 4 秋の雨 (cold rain into the bath → add hot; steam + rain = cool + warm together; the fox arrives) · 5 じぶんの番 (after closing you set
 your own bath by voice: 「もうちょっと あつく / ぬるく」)."""
import json, os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

L = {
    'y01': ('Y', '[slowly] …ようこそ、ようこそ。 わしは この ゆけむりおんせんの あるじ、ゆずじい じゃ。', "…Welcome, welcome. I'm Yuzu-jii, owner of this steamy hot spring.", '…欢迎，欢迎。我是这座热气腾腾温泉的主人，柚子爷爷。'),
    'y02': ('Y', '[warmly] きょうは おてつだい、たのんだぞい。', "Thank you for helping out today.", '今天就拜托你帮忙啦。'),
    'y03': ('Y', '[slowly] ひだりの くだからは、あつーい おゆ。 ひらくと、ひだりから ゆげが くるぞい。', "From the pipe on the left: hot water. Open it and steam comes from the left.", '左边的管子里，是热热的温泉水。一打开，左边就会冒出热气。'),
    'y04': ('Y', '[slowly] みぎからは、つめたい やまの みず。 しぶきが みぎに とんでくる。', "From the right: cold mountain water. The splash comes from the right.", '右边，是冰凉的山泉水。水花会溅到右边。'),
    'y05': ('Y', '[warmly] おきゃくさんの すきな おんどに、ゆっくり あわせておくれ。 みみで、かんじるんじゃ。', "Match each guest's favourite temperature, slowly. Feel it with your ears.", '慢慢地调到客人喜欢的温度吧。用耳朵去感受。'),
    'p01': ('P', '[cheerful] こんにちは！ ペンギンの ペンです！ おゆは、つめたいぐらいで おねがいします！', "Hello! I'm Pen the penguin! Almost cold water, please!", '你好！我是企鹅小笨！水温，要凉凉的那种，拜托了！'),
    'p02': ('P', '[flustered] わわっ、あつい あつい！ とけちゃいますー！', "Whoa, hot hot! I'm melting!", '哇哇，好烫好烫！要化掉啦——！'),
    'p03': ('P', '[happy] ひんやり、ちょうど いいです！ ありがとうございます！', "Nice and chilly, just right! Thank you!", '凉飕飕的，刚刚好！谢谢你！'),
    'm01': ('M', '[playful] あらあら、いいおんせん！ うちは あつーいのが すきなのよ！', "Oh my, what a lovely spring! I like it HOT!", '哎呀哎呀，好温泉！我呀，就喜欢烫烫的！'),
    'm02': ('M', '[softly] …でもね、この子は ぬるめが すきなの。 おふろ、ふたつ おねがいね。', "…But this little one likes it lukewarm. Two baths, please.", '…不过呀，这孩子喜欢温温的。麻烦准备两个池子哦。'),
    'm03': ('M', '[laughs] あっはは、さいこう！ ほら、あんたも ごきげんね！', "Ahaha, perfect! See, you're happy too!", '啊哈哈，太棒了！你看，你也很开心吧！'),
    'm04': ('M', '[surprised] ひゃっ、ぬるい！ もっと あつく、もっと あつく！', "Eek, lukewarm! Hotter, hotter!", '呀，温吞吞的！再烫一点，再烫一点！'),
    'y06': ('Y', '[slowly] …おや。 あきの あめじゃ。 おゆが さめてしまうぞい。', "…Oh. Autumn rain. The water will cool down.", '…哎呀。秋雨来了。水要凉了。'),
    'y07': ('Y', '[warmly] あついのを たして、ゆげで あったまるんじゃ。 …あめは つめたい、ゆげは あたたかい。', "Add hot water and warm up in the steam. …The rain is cold, the steam is warm.", '加点热水，在热气里暖暖身子。…雨是冷的，热气是暖的。'),
    'f01': ('F', '[playful] ごきげんよう。 キツネの コン でございます。 しっぽが ぬれないように、ぬるめで そーっと ね。', "Good day. I'm Kon the fox. Lukewarm and gentle, please, so my tail stays dry.", '日安。我是狐狸小康。为了不弄湿尾巴，请调得温温的、轻轻的哦。'),
    'f02': ('F', '[worried] あら、しっぽが…！ あつすぎるわ。', "Oh, my tail…! Too hot.", '哎呀，尾巴…！太烫了。'),
    'f03': ('F', '[proud] ふふ、ちょうど いいわ。 この しっぽ、ふわっふわでしょう？', "Heh, just right. Isn't my tail fluffy?", '呵呵，刚刚好。我的尾巴，蓬蓬松松的吧？'),
    'y08': ('Y', '[slowly] …きょうも おしまいじゃ。 さいごは、おまえさんの ばんじゃよ。', "…That's it for today. The last bath is yours.", '…今天也结束啦。最后，轮到你泡了。'),
    'y09': ('Y', '[warmly] すきな おんどを、こえで いうてみなされ。 「もうちょっと あつく」か、「もうちょっと ぬるく」じゃ。', "Say the temperature you like. 'A little hotter' or 'a little cooler'.", '用声音说出你喜欢的温度吧。「再热一点」或者「再凉一点」。'),
    'y10': ('Y', '[sighs contentedly] …ふぅ。 いい ゆじゃのう…。', "…Haah. What a good bath…", '…呼。真是好温泉啊…。'),
    'y11': ('Y', '[slowly] …また おいで。 ゆずの かおりと、まっとるぞい。', "…Come again. I'll be waiting, with the scent of yuzu.", '…再来哦。我会带着柚子的香味，等着你。'),
}
SAY = {}
STAGES = [
    {'id': 'open', 'ja': '開店', 'en': 'Opening', 'zh': '开店', 'lines': ['y01', 'y02', 'y03', 'y04', 'y05'], 'target': None},
    {'id': 'penguin', 'ja': 'ペンギン', 'en': 'The penguin', 'zh': '企鹅', 'lines': ['p01'], 'target': [0.0, 0.25], 'hot_line': 'p02', 'ok_line': 'p03'},
    {'id': 'monkeys', 'ja': 'おさる親子', 'en': 'The monkey family', 'zh': '猴子母子', 'lines': ['m01', 'm02'], 'target_left': [0.75, 1.0], 'target_right': [0.4, 0.6], 'cold_line': 'm04', 'ok_line': 'm03'},
    {'id': 'rain', 'ja': '秋の雨', 'en': 'Autumn rain', 'zh': '秋雨', 'lines': ['y06', 'y07', 'f01'], 'rain': True, 'target': [0.4, 0.6], 'hot_line': 'f02', 'ok_line': 'f03'},
    {'id': 'yours', 'ja': 'じぶんの番', 'en': 'Your turn', 'zh': '轮到你', 'lines': ['y08', 'y09'], 'voice_control': ['もうちょっと あつく', 'もうちょっと ぬるく'], 'after': ['y10', 'y11']},
]
VOICE = {'all': {'もうちょっと あつく': ['再热一点', '热一点', '再烫一点', 'a little hotter', 'hotter', 'warmer', 'あつく', 'もっとあつく'],
                 'もうちょっと ぬるく': ['再凉一点', '凉一点', '温一点', 'a little cooler', 'cooler', 'colder', 'ぬるく', 'もっとぬるく'],
                 'いらっしゃいませ': ['欢迎光临', '欢迎', 'welcome', 'come in', 'いらっしゃい']}}
NAMES = {'ゆずじい': {'en': 'Yuzu-jii', 'zh': '柚子爷爷'}, 'ペン': {'en': 'Pen', 'zh': '小笨'}, 'おさる': {'en': 'Monkey mum', 'zh': '猴妈妈'}, 'コン': {'en': 'Kon', 'zh': '小康'}}
strip = lambda s: re.sub(r'\s+', ' ', re.sub(r'\[[^\]]*\]', '', s)).strip()


def spoken(tagged, lang='ja', lid=None):
    if lang == 'ja':
        for k, v in SAY.items(): tagged = tagged.replace(k, v)
        return tagged
    who, ja, en, zh = L[lid]; tags = re.findall(r'^\[[^\]]*\]', ja)
    return ((tags[0] + ' ') if tags else '') + (en if lang == 'en' else zh)


if __name__ == '__main__':
    used = {i for s in STAGES for k in ('lines', 'after') for i in s.get(k, [])} | {s.get(k) for s in STAGES for k in ('hot_line', 'cold_line', 'ok_line')}
    used.discard(None); assert not used - set(L), used - set(L)
    lines = {k: [strip(v[1]), v[2], v[0]] for k, v in L.items()}
    open(os.path.join(ROOT, 'lines.js'), 'w', encoding='utf-8').write(
        "// 『ゆけむり どうぶつおんせん』 lines id → [ja, en, who] (Y ゆずじい · P ペンギン · M おさる · F キツネ) + game stages. GENERATED by scripts/script_data.py.\n"
        "window.ONSEN_LINES = " + json.dumps({'who': {'Y': 'ゆずじい', 'P': 'ペン', 'M': 'おさる', 'F': 'コン'}, 'lines': lines, 'stages': STAGES}, ensure_ascii=False, indent=1) + ";\n")
    zh = {strip(v[1]): v[3] for v in L.values()}
    json.dump(zh, open(os.path.join(ROOT, 'project', 'zh_lines.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    ui = {s['ja']: s['zh'] for s in STAGES}; ui.update({'もうちょっと あつく': '再热一点', 'もうちょっと ぬるく': '再凉一点', 'いらっしゃいませ': '欢迎光临'})
    for k, v in NAMES.items(): ui[k] = v['zh']
    open(os.path.join(ROOT, 'l10n.js'), 'w', encoding='utf-8').write(
        "// Languages of this demo (pre-production: lines + answers + names + voice phrasings). GENERATED by scripts/script_data.py.\n"
        "window.MOHEAT_L10N = " + json.dumps({'langs': ['en', 'ja', 'zh'], 'text': {'zh': {**zh, **ui}, 'ja': {}, 'en': {}}, 'names': NAMES, 'voice': VOICE}, ensure_ascii=False, indent=1) + ";\n")
    print(len(L), 'lines,', sum(len(strip(v[1])) for v in L.values()), 'ja chars')
