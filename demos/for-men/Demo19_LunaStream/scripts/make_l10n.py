#!/usr/bin/env python3
"""Writes ../l10n.js (DEMO_DESIGN_GUIDE §2.2) from the tables below. Keys for the story lines are read from lines.js, so they stay
byte-identical to what the page shows; everything else is checked against index.html / main.js before writing.
  python3 scripts/make_l10n.py"""
import json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(os.path.join(ROOT, 'lines.js'), encoding='utf-8').read()
LINES = json.loads(src[src.index('window.LUNA_LINES = {') + 20:src.index('};') + 1])
MUFFLED = ['']

ZH_LINES = {
    'l01': '…最后点单的时间早就过了。…不过，你是特别的。',
    'l02': '白天这里只是普通的酒吧。只有深夜这个时候…才是我来摇酒。…要保密哦。',
    'l03': '…要点什么？',
    'l04a': '…交给我，是吗。好答案。',
    'l04b': '…呵。不用逞强。…我会调成你还能自己回家的程度。',
    'l05': '…喜欢冰的吗？',
    'l06': '…呵呵。好表情。…我就是想看这个。',
    'l07': '…呐。给我一个词。我用这个词，为你调一杯。',
    'l08a': '…月亮。…你是知道我的名字才这么说的吗？…狡猾的人。',
    'l08b': '…黎明。…我最不擅长的时间。…不过和你的话，也许会想看看。',
    'l09': '…我把灯调暗。…好好看着。不要眨眼。',
    'l10': '…很美吧。…正因为很快就会熄灭，才美。',
    'l10x': '…啊，你眨眼了。…呵，再给你看一次。',
    'l11': '…今晚已经打烊了。…我可以坐你旁边吗？',
    'l12': '…我也喝一杯就好。爱尔兰咖啡。…热的这杯，你拿着。',
    'l13': '…干个杯吧。为什么干杯？',
    'l14a': '…为我们两个人的夜晚。…干杯。',
    'l14b': '…为我？…呵，狡猾。…干杯。',
    'l15': '…呐。露娜不是我的真名。…我的真名，只告诉你一个人。',
    'l16': '…「月」。…宵月，月。…对别人要保密哦。',
    'l17a': '…！…狡猾。…再叫一次。',
    'l17b': '…每晚，这个时间。吧台最边上的位子，我会给你留着。',
}
UI = {
    'おまかせで': '交给你了', 'いちばん強いのを': '来杯最烈的', '月': '月亮', '夜明け': '黎明',
    '「ふたりの夜に」': '「为我们两个人的夜晚」', '「ルナに」': '「为露娜」', '「つき」と呼ぶ': '叫她「月」', 'また来てもいい？': '我还可以再来吗？',
    'グラスを受け取る': '接过酒杯', '見つめる（長押し）': '凝视火焰（长按）',
    'ラストオーダーのあと': '最后点单之后', 'シェイカー': '雪克杯', 'あなたのためのカクテル': '为你调的鸡尾酒', 'カウンターのこっち側': '吧台的这一边', '本当の名前': '真正的名字',
    '🍸 いちばん端の席': '🍸 最边上的位子', '🌙 「つき」と呼んだ夜': '🌙 叫她「月」的夜晚', '↺ もう一度': '↺ 再来一次',
}
MIXED = {   # key: [zh, ja, en]
    'MoHeat Evo · Binaural ASMR × Thermal Haptics': ['MoHeat Evo · 双耳ASMR × 冷热触感', 'MoHeat Evo · バイノーラルASMR × 温冷ハプティクス', 'MoHeat Evo · Binaural ASMR × Thermal Haptics'],
    'ルナの、ひみつのカクテル': ['露娜的秘密鸡尾酒', 'ルナの、ひみつのカクテル', "Luna's Secret Cocktail"],
    "Luna's Secret Cocktail — after last orders in a basement bar, the late-night streamer mixes a drink just for you": ['最后点单之后的地下酒吧，深夜主播只为你调一杯酒', 'ラストオーダーのあとの地下のバー。深夜の配信者が、あなただけに一杯つくる', 'After last orders in a basement bar, the late-night streamer mixes a drink just for you'],
    '🍸 閉店後のバー · Interactive': ['🍸 打烊后的酒吧 · 互动', '🍸 閉店後のバー · インタラクティブ', '🍸 A bar after closing · Interactive'],
    '🔥 青い炎・コーヒー・耳元の声 · warm': ['🔥 蓝色火焰・咖啡・耳边的声音 · 温暖', '🔥 青い炎・コーヒー・耳元の声 · あたたか', '🔥 blue flame · Irish coffee · her voice at your ear · warm'],
    '🧊 冷えたシェイカー・雨の夜風 · cool': ['🧊 冰镇雪克杯・雨夜的风 · 清凉', '🧊 冷えたシェイカー・雨の夜風 · ひんやり', '🧊 iced shaker · rainy night draft · cool'],
    '▶ はじめる · Start': ['▶ 开始', '▶ はじめる', '▶ Start'],
    '🎧 Left / Right check': ['🎧 左右声道检查', '🎧 左右チェック', '🎧 Left / Right check'],
    'Headphones on · tap / hold or answer her by voice · connect MoHeat Evo to feel an iced shaker on your cheek, a blue flame, the rainy draft from the door and her voice':
        ['请戴上耳机 · 点按 / 长按或用声音回应她 · 连接 MoHeat Evo，感受贴在脸颊的冰镇雪克杯、蓝色火焰、门口的雨夜冷风和她的声音',
         'ヘッドホンを装着 · タップ / 長押し、または声で答えよう · MoHeat Evo をつなぐと、頬の冷たいシェイカー、青い炎、ドアからの雨の夜風、彼女の声を感じられます',
         'Headphones on · tap / hold or answer her by voice · connect MoHeat Evo to feel an iced shaker on your cheek, a blue flame, the rainy draft from the door and her voice'],
    'Luna is an original character · voice ElevenLabs · art made with OpenAI gpt-image · layered stills': ['露娜是原创角色 · 配音 ElevenLabs · 美术 OpenAI gpt-image · 分层静帧', 'ルナはオリジナルキャラクターです · 声 ElevenLabs · 絵 OpenAI gpt-image · レイヤー静止画', 'Luna is an original character · voice ElevenLabs · art made with OpenAI gpt-image · layered stills'],
    'ASMR · Secret bar': ['ASMR · 秘密酒吧', 'ASMR · ひみつのバー', 'ASMR · Secret bar'],
    'Live (DUAL): her voice warms the ear she speaks at, with its loudness; the rainy draft from the door on your left, an iced shaker on your right cheek, a blue flame and a hot Irish coffee in front add real cold / warmth — often on the same ear at once.':
        ['实时（DUAL）：她的声音按音量让她说话那一侧的耳朵变暖；左边门口的雨夜冷风、贴在右脸的冰镇雪克杯、面前的蓝色火焰和热爱尔兰咖啡带来真实的冷与暖——常常在同一只耳朵上同时出现。',
         'リアルタイム（DUAL）：彼女の声は、話しかける側の耳をその音量で温めます。左のドアからの雨の夜風、右頬の冷えたシェイカー、目の前の青い炎と熱いアイリッシュコーヒーが、本当の冷たさ・温かさを——ときには同じ耳に同時に——加えます。',
         'Live (DUAL): her voice warms the ear she speaks at, with its loudness; the rainy draft from the door on your left, an iced shaker on your right cheek, a blue flame and a hot Irish coffee in front add real cold / warmth — often on the same ear at once.'],
    '🍸 いちばん端の席 · The end seat, kept for you': ['🍸 最边上的位子', '🍸 いちばん端の席', '🍸 The end seat, kept for you'],
    'いちばん端の席': ['最边上的位子', 'いちばん端の席', 'The end seat, kept for you'],
    '🌙 「つき」と呼んだ夜 · The night you called her Tsuki': ['🌙 叫她「月」的夜晚', '🌙 「つき」と呼んだ夜', '🌙 The night you called her Tsuki'],
    '「つき」と呼んだ夜': ['叫她「月」的夜晚', '「つき」と呼んだ夜', 'The night you called her Tsuki'],
    'the counter · after last orders': ['吧台 · 最后点单之后', 'カウンター · ラストオーダーのあと', 'the counter · after last orders'],
    'the counter · the shaker': ['吧台 · 雪克杯', 'カウンター · シェイカー', 'the counter · the shaker'],
    'the counter · at your right cheek': ['吧台 · 贴在你的右脸', 'カウンター · 右の頬に', 'the counter · at your right cheek'],
    'the counter · lights down': ['吧台 · 灯光调暗', 'カウンター · 灯りを落として', 'the counter · lights down'],
    'the stool on your left': ['你左边的高脚凳', '左どなりのスツール', 'the stool on your left'],
    'at your left ear': ['在你的左耳边', '左の耳もとで', 'at your left ear'],
}
EN_UI = {'ラストオーダーのあと': 'After last orders', 'シェイカー': 'The shaker', 'あなたのためのカクテル': 'A cocktail for you', 'カウンターのこっち側': 'This side of the counter', '本当の名前': 'Her real name',
         '🍸 いちばん端の席': '🍸 The end seat, kept for you', '🌙 「つき」と呼んだ夜': '🌙 The night you called her Tsuki', '↺ もう一度': '↺ Play again'}
VOICE = {
    'おまかせで': ['交给你', '你决定', '随便', '你推荐的', 'leave it to you', 'surprise me', "bartender's choice", 'おまかせ', 'おすすめで'],
    'いちばん強いのを': ['最烈的', '最强的', '来杯烈的', '烈酒', 'strongest', 'the strongest one', 'something strong', '強いの', '一番強いやつ'],
    '月': ['月亮', '月', '月光', 'moon', 'the moon', 'moonlight', 'つき', 'お月さま'],
    '夜明け': ['黎明', '天亮', '日出', '拂晓', 'dawn', 'sunrise', 'daybreak', 'よあけ', '朝'],
    '「ふたりの夜に」': ['为我们的夜晚', '为两个人的夜晚', '为今晚', '为我们', 'to our night', 'to us', 'to tonight', 'ふたりの夜に', '二人の夜に'],
    '「ルナに」': ['为露娜', '为你', '敬露娜', '敬你', 'to luna', 'to you', 'cheers to luna', 'ルナに', 'きみに'],
    '「つき」と呼ぶ': ['月', '小月', '叫她月', '月亮', 'tsuki', 'call her tsuki', 'つき', 'ツキ', 'つきさん'],
    'また来てもいい？': ['我还可以再来吗', '还能再来吗', '我会再来', '下次再来', 'can i come again', 'come again', 'see you again', 'また来る', 'また来ていい'],
    'グラスを受け取る': ['接过来', '谢谢', '拿着', '干杯', 'take it', 'thanks', 'thank you', 'ありがとう', 'いただきます'],
}
page = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read() + open(os.path.join(ROOT, 'main.js'), encoding='utf-8').read()
for k in list(UI) + list(MIXED) + list(VOICE):
    if k in ('見つめる（長押し）',): continue   # written by main.js (checked by the page scan)
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
