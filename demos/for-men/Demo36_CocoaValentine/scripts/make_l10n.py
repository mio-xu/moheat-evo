#!/usr/bin/env python3
"""Writes ../l10n.js (DEMO_DESIGN_GUIDE §2.2) from the tables below. Keys for the story lines are read from lines.js, so they stay
byte-identical to what the page shows; everything else is checked against index.html / main.js before writing.
  python3 scripts/make_l10n.py"""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(os.path.join(ROOT, 'lines.js'), encoding='utf-8').read()
LINES = json.loads(src[src.index('= {') + 2:src.index('};') + 1])

ZH_LINES = {
    'c01': '欢迎光临～……啊，是你呀！嘿嘿，你真的来了。外面很冷吧？',
    'c02': '明天就是情人节了嘛。所以今晚，想请你帮我做巧克力。',
    'c03a': '太好了！那我帮你系围裙。……来，转过去。',
    'c03b': '诶……秘、秘密！……快说，你帮不帮？',
    'c04': '隔水，要慢——慢地融化。……好香呀。',
    'c05': '你尝一下？……呼——呼——。……来，啊——。',
    'c06a': '对吧～？你喜欢的甜度，我可是记得清清楚楚。',
    'c06b': '嘿嘿，真是个爱撒娇的人。……那就再加一勺糖。',
    'c07': '好冷……！冰箱好凉呀。……奶油，我们一起打发吧？',
    'c08': '我从后面扶着你的手哦。……对，就这样。不可以停下来哦？',
    'c09': '哇，起尖角了！好厉害～！……啊，你脸上沾到奶油了。……我帮你擦掉。',
    'c09x': '啊，还没好呢～。再加把劲？',
    'c10': '烤好啦～！爱心饼干。……很烫，我帮你吹一吹。',
    'c11': '呼——呼——。……来，啊——。',
    'c12': '……好吃吗？太好了。……那个呀，其实这个……不，没什么。',
    'c13': '最后，要在爱心巧克力上写字。……不许看！闭上眼睛。',
    'c14a': '……乖。',
    'c14b': '喂，耍赖！……真是的，被你看到了吧。',
    'c15': '……刚才你问我要送给谁吧。……我告诉你答案。',
    'c16': '……是你哦。我很早以前，就一直是为你练习的。',
    'c17': '我等不到明天了。……呐，说点什么嘛？',
    'c18a': '……真的？……嘿嘿。明天最大的那块巧克力，是你的哦。',
    'c18b': '……嗯。明年、后年，一直一直。……说好了哦？',
    'c19': '……啊，12 点了。情人节快乐。',
}
UI = {   # page text (ja as shown) → zh
    'いいよ、手伝う': '好啊，我来帮忙', '…誰にあげるの？': '……要送给谁？',
    'ちょうどいい': '刚刚好', 'もっと甘くして': '再甜一点',
    '混ぜる（長押し）': '搅拌（长按）', '食べる': '吃',
    '目をつぶる': '闭上眼睛', '…ちょっとだけ見る': '……偷看一点点',
    '…俺も、好き': '……我也喜欢你', '来年も、一緒に作ろう': '明年也一起做吧',
    '閉店後のお店で': '打烊后的店里', 'チョコを溶かす': '融化巧克力', '生クリーム': '鲜奶油', '焼きたてクッキー': '刚出炉的饼干', 'メッセージ': '留言',
    '🍫 来年も、いっしょに。': '🍫 明年也要一起。', '🍫 いちばんおっきいの、あなたの。': '🍫 最大的那块，是你的。',
    '↺ もう一度': '↺ 再来一次',
}
MIXED = {   # key: [zh, ja, en]
    'MoHeat Evo · Binaural ASMR × Thermal Haptics': ['MoHeat Evo · 双耳ASMR × 冷热触感', 'MoHeat Evo · バイノーラルASMR × 温冷ハプティクス', 'MoHeat Evo · Binaural ASMR × Thermal Haptics'],
    'ココアの、バレンタイン前夜': ['可可的情人节前夜', 'ココアの、バレンタイン前夜', "Valentine's Eve with Cocoa"],
    "Valentine's Eve with Cocoa — making chocolates after closing in her little sweets shop": ['打烊后，在她的小甜品店里一起做巧克力', '閉店後の小さなお菓子屋さんで、ふたりでチョコ作り', 'Making chocolates after closing in her little sweets shop'],
    '🍫 閉店後のお菓子作り · Interactive': ['🍫 打烊后的点心时间 · 互动', '🍫 閉店後のお菓子作り · インタラクティブ', '🍫 Baking after closing · Interactive'],
    '♨️ オーブン・湯気・耳元の声 · warm': ['♨️ 烤箱・热气・耳边的声音 · 温暖', '♨️ オーブン・湯気・耳元の声 · あたたか', '♨️ oven · steam · her voice at your ear · warm'],
    '🧊 冷蔵庫・ふーふー・雪の夜 · cool': ['🧊 冰箱・呼呼吹气・雪夜 · 清凉', '🧊 冷蔵庫・ふーふー・雪の夜 · ひんやり', '🧊 fridge · her fu-fu · snowy night · cool'],
    '▶ はじめる · Start': ['▶ 开始', '▶ はじめる', '▶ Start'],
    '🎧 Left / Right check': ['🎧 左右声道检查', '🎧 左右チェック', '🎧 Left / Right check'],
    'Headphones on · tap / hold or answer her by voice · connect MoHeat Evo to feel the oven, the steam, the fridge, her fu-fu and her voice':
        ['请戴上耳机 · 点按 / 长按或用声音回应她 · 连接 MoHeat Evo，感受烤箱、热气、冰箱、她的呼呼吹气和她的声音',
         'ヘッドホンを装着 · タップ / 長押し、または声で答えよう · MoHeat Evo をつなぐと、オーブン、湯気、冷蔵庫、ふーふー、彼女の声を感じられます',
         'Headphones on · tap / hold or answer her by voice · connect MoHeat Evo to feel the oven, the steam, the fridge, her fu-fu and her voice'],
    'Cocoa is an original character · voice ElevenLabs · art made with OpenAI gpt-image · layered stills': ['可可是原创角色 · 配音 ElevenLabs · 美术 OpenAI gpt-image · 分层静帧', 'ココアはオリジナルキャラクターです · 声 ElevenLabs · 絵 OpenAI gpt-image · レイヤー静止画', 'Cocoa is an original character · voice ElevenLabs · art made with OpenAI gpt-image · layered stills'],
    "ASMR · Valentine's Eve": ['ASMR · 情人节前夜', 'ASMR · バレンタイン前夜', "ASMR · Valentine's Eve"],
    'Live (DUAL): her voice warms the ear she speaks at, with its loudness; the snowy night at the door, the oven on your right, the steam in front, her cool fu-fu and the fridge on your left add real cold / warmth — often on the same ear at once.':
        ['实时（DUAL）：她的声音按音量让她说话那一侧的耳朵变暖；门口的雪夜、你右边的烤箱、面前的热气、她凉凉的吹气和你左边的冰箱带来真实的冷与暖——常常在同一只耳朵上同时出现。',
         'リアルタイム（DUAL）：彼女の声は、話しかける側の耳をその音量で温めます。入口の雪の夜、右のオーブン、目の前の湯気、ひんやりした「ふーふー」、左の冷蔵庫が本当の冷たさ・温かさを加えます——同じ耳に同時に来ることも。',
         'Live (DUAL): her voice warms the ear she speaks at, with its loudness; the snowy night at the door, the oven on your right, the steam in front, her cool fu-fu and the fridge on your left add real cold / warmth — often on the same ear at once.'],
    '🍫 来年も、いっしょに。 · Next year too, together': ['🍫 明年也要一起。', '🍫 来年も、いっしょに。', '🍫 Next year too, together'],
    '🍫 いちばんおっきいの、あなたの。 · The biggest one is yours': ['🍫 最大的那块，是你的。', '🍫 いちばんおっきいの、あなたの。', '🍫 The biggest one is yours'],
}
EN_UI = {'閉店後のお店で': 'After closing', 'チョコを溶かす': 'Melting chocolate', '生クリーム': 'Whipped cream', '焼きたてクッキー': 'Fresh cookies', 'メッセージ': 'The message',
         '🍫 来年も、いっしょに。': '🍫 Next year too, together', '🍫 いちばんおっきいの、あなたの。': '🍫 The biggest one is yours', '↺ もう一度': '↺ Play again'}
VOICE = {   # each answer → same-meaning phrasings (zh, en, ja) for shared/voice.js
    'いいよ、手伝う': ['好啊', '我来帮忙', '帮你', '可以', 'sure', "i'll help", 'okay', 'yes', 'いいよ', '手伝う', 'もちろん'],
    '…誰にあげるの？': ['送给谁', '给谁的', '谁', 'who are they for', 'who is it for', 'for who', '誰にあげる', '誰に', '誰の'],
    'ちょうどいい': ['刚刚好', '正好', '好吃', '很好', 'just right', 'perfect', 'good', 'ちょうどいい', 'おいしい', 'いい感じ'],
    'もっと甘くして': ['再甜一点', '更甜', '甜一点', 'sweeter', 'more sugar', 'make it sweeter', 'もっと甘く', '甘くして', '甘いのがいい'],
    '食べる': ['吃', '我吃', '啊', '谢谢', 'eat', 'aah', 'thank you', 'いただきます', '食べる', 'あーん'],
    '目をつぶる': ['闭上眼睛', '闭眼', '我不看', '好的', 'close my eyes', "i won't look", 'okay', '目をつぶる', '見ない', 'つぶった'],
    '…ちょっとだけ見る': ['偷看', '看一点', '我要看', 'peek', 'just a little', 'let me see', 'ちょっと見る', '見たい', 'のぞく'],
    '…俺も、好き': ['我也喜欢你', '喜欢你', '我也是', 'i like you too', 'me too', 'i love you', '俺も好き', '好き', '私も'],
    '来年も、一緒に作ろう': ['明年也一起做', '明年也一起', '一起做', 'next year too', "let's make them together", 'together next year', '来年も', 'また一緒に', '一緒に作ろう'],
}

page = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read() + open(os.path.join(ROOT, 'main.js'), encoding='utf-8').read()
for k in list(UI) + list(MIXED) + list(VOICE):
    probe = k.split(' · ')[0] if k not in page else k
    if probe not in page: raise SystemExit(f'not on the page: {k!r}')
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
