#!/usr/bin/env python3
"""Writes ../l10n.js (DEMO_DESIGN_GUIDE §2.2) from the tables below. Keys for the story lines are read from lines.js, so they stay
byte-identical to what the page shows; everything else is checked against index.html / main.js before writing.
  python3 scripts/make_l10n.py"""
import json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(os.path.join(ROOT, 'lines.js'), encoding='utf-8').read()
LINES = json.loads(src[src.index('= {') + 2:src.index('};') + 1])
MUFFLED = json.loads(re.search(r'NAGISA_MUFFLED = (\[.*?\]);', src).group(1))

ZH_LINES = {
    'n01': '哟，果然在这儿。……干嘛，一直盯着看。',
    'n02': '我、我才不是穿给你看的！是我妈硬要我穿的！',
    'n03a': '哈……!? 干、干嘛突然这样。……笨蛋。……哼。原来，挺适合的嘛。',
    'n03b': '哈啊!? 你这话什么意思！……好歹也说一句可爱啊。',
    'n04': '不过真热啊……。喏，我买了苏打冰棒。……一人一半。',
    'n05': '给，你的那份。……刚才是不是“呀”了一声？真好骗。',
    'n06': '以前我们也这样，在这儿分着吃吧。你啊，每次都拿大的那一半。',
    'n07': '啊——真是热死了！我给你扇扇，往那边挪一点。',
    'n08': '又不是为了你。只是我自己热而已。',
    'n09a': '别得寸进尺。……好啦好啦，再扇一会儿。',
    'n09b': '……什么嘛。人家好心给你扇。',
    'n10': '当当——线香花火。去年剩下的。……我点火了哦。',
    'n11': '来比赛。先掉的人，要听对方一个要求。……动了就算输。',
    'n12a': '啊……掉了。……切，我输了。行吧，你说什么我都听。……不过在那之前，让我先说一句。',
    'n12b': '好——你输啦！……那，你要听我说。好好听到最后。',
    'n13': '啊……烟花，开始了。……喂。',
    'n14': '我啊，从很久以前，就对你……',
    'n15a': '没、没什么！……虽然很想这么说啦。',
    'n15b': '……你绝对听见了吧。……真是的，拿你没办法。',
    'n16': '……一直，都喜欢你……也说不定。……我可不会再说第二遍。',
    'n17a': '……唔，笨蛋。……太慢了啦。',
    'n17b': '哈!? 什么啊，太狡猾了！……真是的，你真是个大笨蛋。',
}
# page text (ja as shown) → zh / ja / en. ja/en only for the mixed cover / panel strings.
UI = {
    '浴衣、似合ってる': '浴衣很适合你',
    '…誰かと思った': '……我还以为是谁呢',
    '受け取る': '接过来',
    'もっと': '再扇扇',
    'もういいよ': '够了',
    '動かない（長押し）': '别动（长按）',
    '今、なんて？': '你刚才说什么？',
    '…もう一回、言って': '……再说一遍',
    '…俺も': '……我也是',
    '…知ってた': '……我早知道了',
    MUFFLED[0]: '（烟花声太大，听不清）',
    '屋上で': '在屋顶', 'ソーダアイス': '苏打冰棒', 'うちわ': '团扇', '線香花火': '线香花火', '花火の夜': '烟花之夜',
    '🎆 ずるいのは、どっち？': '🎆 到底是谁狡猾？',
    '🎆 遅いよ、バカ。': '🎆 太慢了啦，笨蛋。',
    '↺ もう一度': '↺ 再来一次',
}
MIXED = {   # key: {zh, ja, en}
    'MoHeat Evo · Binaural ASMR × Thermal Haptics': ['MoHeat Evo · 双耳ASMR × 冷热触感', 'MoHeat Evo · バイノーラルASMR × 温冷ハプティクス', 'MoHeat Evo · Binaural ASMR × Thermal Haptics'],
    'なつの、おくじょうで': ['夏日，屋顶上', 'なつの、おくじょうで', 'Up on the Summer Roof'],
    'Up on the Summer Roof — sparklers and fireworks with your childhood friend Nagisa': ['和青梅竹马渚一起，线香花火与烟花', '幼なじみの渚と、線香花火と花火の夜', 'Sparklers and fireworks with your childhood friend Nagisa'],
    '🎆 幼なじみと夏の夜 · Interactive': ['🎆 和青梅竹马的夏夜 · 互动', '🎆 幼なじみと夏の夜 · インタラクティブ', '🎆 A summer night with your childhood friend · Interactive'],
    '🎇 線香花火・耳元の声 · warm': ['🎇 线香花火・耳边的声音 · 温暖', '🎇 線香花火・耳元の声 · あたたか', '🎇 sparklers · her voice at your ear · warm'],
    '🍦 ソーダアイス・うちわ・夜風 · cool': ['🍦 苏打冰棒・团扇・夜风 · 清凉', '🍦 ソーダアイス・うちわ・夜風 · ひんやり', '🍦 soda popsicle · paper fan · night breeze · cool'],
    '▶ はじめる · Start': ['▶ 开始', '▶ はじめる', '▶ Start'],
    '🎧 Left / Right check': ['🎧 左右声道检查', '🎧 左右チェック', '🎧 Left / Right check'],
    'Headphones on · tap / hold or answer her by voice · connect MoHeat Evo to feel a popsicle on your cheek, her paper fan, two sparklers and her voice':
        ['请戴上耳机 · 点按 / 长按或用声音回应她 · 连接 MoHeat Evo，感受贴在脸颊的冰棒、她的团扇、两支线香花火和她的声音',
         'ヘッドホンを装着 · タップ / 長押し、または声で答えよう · MoHeat Evo をつなぐと、頬のアイス、うちわの風、線香花火、彼女の声を感じられます',
         'Headphones on · tap / hold or answer her by voice · connect MoHeat Evo to feel a popsicle on your cheek, her paper fan, two sparklers and her voice'],
    'Nagisa is an original character · voice ElevenLabs · art made with Seedance': ['渚是原创角色 · 配音 ElevenLabs · 美术 Seedance', '渚はオリジナルキャラクターです · 声 ElevenLabs · 絵 Seedance', 'Nagisa is an original character · voice ElevenLabs · art made with Seedance'],
    'ASMR · Summer night': ['ASMR · 夏夜', 'ASMR · 夏の夜', 'ASMR · Summer night'],
    'Live (DUAL): her voice warms the ear she speaks at, with its loudness; the sea breeze, the soda popsicle on your right cheek, her paper fan on your left and the two sparklers in front of you add real cold / warmth.':
        ['实时（DUAL）：她的声音按音量让她说话那一侧的耳朵变暖；海风、贴在你右脸的苏打冰棒、她在你左边扇的团扇、你面前的两支线香花火带来真实的冷与暖。',
         'リアルタイム（DUAL）：彼女の声は、話しかける側の耳をその音量で温めます。海風、右の頬のソーダアイス、左からのうちわの風、目の前の線香花火が、本当の冷たさ・温かさを加えます。',
         'Live (DUAL): her voice warms the ear she speaks at, with its loudness; the sea breeze, the soda popsicle on your right cheek, her paper fan on your left and the two sparklers in front of you add real cold / warmth.'],
    "🎆 ずるいのは、どっち？ · Who's the unfair one?": ['🎆 到底是谁狡猾？', '🎆 ずるいのは、どっち？', "🎆 Who's the unfair one?"],
    'ずるいのは、どっち？': ['到底是谁狡猾？', 'ずるいのは、どっち？', "Who's the unfair one?"],
    '🎆 遅いよ、バカ。 · Took you long enough, idiot': ['🎆 太慢了啦，笨蛋。', '🎆 遅いよ、バカ。', '🎆 Took you long enough, idiot'],
    '遅いよ、バカ。': ['太慢了啦，笨蛋。', '遅いよ、バカ。', 'Took you long enough, idiot'],
}
EN_UI = {'屋上で': 'On the roof', 'ソーダアイス': 'Soda popsicle', 'うちわ': 'The paper fan', '線香花火': 'Sparklers', '花火の夜': 'Fireworks',
         '🎆 ずるいのは、どっち？': "🎆 Who's the unfair one?", '🎆 遅いよ、バカ。': '🎆 Took you long enough, idiot', '↺ もう一度': '↺ Play again'}
VOICE = {   # each answer → same-meaning phrasings (zh first, then en / ja colloquial) for shared/voice.js
    '浴衣、似合ってる': ['浴衣很适合你', '很适合', '好看', '很漂亮', 'suits you', 'you look good', 'looks great', '似合ってる', '似合うね', '可愛い'],
    '…誰かと思った': ['我还以为是谁', '没认出来', '认不出来', '是谁啊', "didn't recognise you", "didn't recognize you", 'who are you', '誰かと思った', '誰？'],
    '受け取る': ['接过来', '拿着', '谢谢', '接住', 'take it', 'thanks', 'thank you', 'もらう', 'ありがとう', 'サンキュー'],
    'もっと': ['再扇扇', '再来', '继续', '多扇一会儿', 'more', 'keep going', 'more please', 'もっと扇いで', 'もうちょっと'],
    'もういいよ': ['够了', '不用了', '可以了', '停', "that's enough", 'enough', 'stop', 'もういい', '大丈夫'],
    '今、なんて？': ['你说什么', '刚才说什么', '什么', '没听清', 'what did you say', 'what', 'pardon', 'なんて言った', 'え？'],
    '…もう一回、言って': ['再说一遍', '再说一次', '再讲一遍', 'say it again', 'one more time', 'again', 'もう一回', 'もう一度言って'],
    '…俺も': ['我也是', '我也喜欢你', '我也一样', 'me too', 'i like you too', 'same here', '俺も好き', '僕も', '私も'],
    '…知ってた': ['我早知道了', '我知道', '早就知道', 'i knew', 'i know', 'i knew it', '知ってる', '知ってたよ'],
}

page = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read() + open(os.path.join(ROOT, 'main.js'), encoding='utf-8').read()
for k in list(UI) + list(MIXED) + list(VOICE):
    probe = k.split(' · ')[0] if k not in page else k
    if probe not in page and k not in MUFFLED: raise SystemExit(f'not on the page: {k!r}')
zh = {LINES[i][0]: t for i, t in ZH_LINES.items()}
zh.update(UI); zh.update({k: v[0] for k, v in MIXED.items()})
ja = {k: v[1] for k, v in MIXED.items()}
en = {k: v[2] for k, v in MIXED.items()}; en.update(EN_UI)
missing = [i for i in LINES if i not in ZH_LINES]
if missing: raise SystemExit(f'no zh for {missing}')
out = {'langs': ['en', 'ja', 'zh'], 'text': {'zh': zh, 'ja': ja, 'en': en}, 'names': {}, 'voice': {'all': VOICE}}
open(os.path.join(ROOT, 'l10n.js'), 'w', encoding='utf-8').write(
    '// Languages of this demo for ../../shared/subs.js (subtitles, answers, cover) and ../../shared/voice.js (voice answers).\n'
    '// Generated by scripts/make_l10n.py (DEMO_DESIGN_GUIDE §2.2) — edit the tables there, not this file.\n'
    'window.MOHEAT_L10N = ' + json.dumps(out, ensure_ascii=False, indent=1) + ';\n')
print('l10n.js:', len(zh), 'zh strings,', len(VOICE), 'voice answers')
