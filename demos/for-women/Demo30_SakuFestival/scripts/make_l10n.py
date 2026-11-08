#!/usr/bin/env python3
"""Writes ../l10n.js (DEMO_DESIGN_GUIDE §2.2): zh for every Japanese line / button (keys taken from lines.js + main.js so they stay
byte-identical), ja / en / zh for the cover and side panel, and voice phrasings per answer."""
import json, os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(os.path.join(ROOT, 'lines.js'), encoding='utf-8').read()
LINES = json.loads(src[src.index('= {') + 2:src.rindex('}') + 1])
ZH_LINES = {
    'k01': '喂——这边！…真是的，你每年都会走散啊。', 'k02': '来，手给我。…别走散了。',
    'k03': '炒面摊那边好热啊。…人也太多了。我们去上面吧。', 'k04': '呼。…这里，以前我们俩常来呢。',
    'k05': '很热吧。我帮你扇扇。', 'k06': '怎么样，凉快吗？…来，另一边也扇。',
    'k07a': '好好好，公主殿下。…真拿你没办法。', 'k07b': '不——行。今天，让我来。',
    'k08': '刨冰，我买来了。抹茶红豆的。…来，啊——', 'k09a': '…今天这么听话嘛。凉吗？', 'k09b': '别害羞啦。…快点，要化了。',
    'k10': '喂。你知道吗，吃完刨冰之后，呼出来的气是凉的。', 'k11': '…看吧？凉吧。…脸，红了哦。',
    'k12': '烟花，我们每年都一起看，不过啊。今年——', 'k13': '…今年，我不想再以青梅竹马的身份看了。…想在你身边。',
    'k14': '…让我听听你的回答。', 'k15a': '…明年，后年也是。我身边的位置，给我留着。', 'k15b': '…那就，一直。我已经不会再只当你的青梅竹马了。',
}
ANSWERS = {   # ja → (zh, voice phrasings)
    '手を取る': ('牵住他的手', ['牵手', '拉住他的手', '握住', '好', 'take his hand', 'hold hands', '手をつなぐ', 'つなぐ']),
    'あおいでもらう（長押し）': ('让他帮你扇风（长按）', []),
    'もっと': ('再扇一会儿', ['再来', '多扇一会', '还要', '继续', 'more', 'keep going', 'もっとあおいで', 'もっと']),
    '自分でやる': ('我自己来', ['自己来', '我自己扇', '不用了', 'myself', "I'll do it", '自分で', '大丈夫']),
    'あーん': ('啊——', ['啊', '张嘴', '喂我', '好', 'aah', 'ah', 'feed me', 'あーん']),
    '自分で食べる': ('我自己吃', ['自己吃', '我自己来', '不用喂', 'myself', 'I can eat it myself', '自分で', '自分で食べる']),
    'え、なに？': ('欸，什么？', ['什么', '你说什么', '没听清', '再说一遍', 'what', 'pardon', 'sorry', 'え', 'なに', 'なんて']),
    '来年も、一緒に見たい': ('明年也想一起看', ['明年', '明年也一起看', '明年还要', '一起看', 'next year', 'again next year', '来年', '来年も']),
    'ずっと、隣にいて': ('一直待在我身边', ['一直', '永远', '在我身边', '别离开', 'forever', 'always', 'stay with me', 'ずっと', '隣にいて']),
}
COVER = {   # page text → (en, ja, zh)
    'MoHeat Evo · Binaural ASMR × Thermal Haptics': ('MoHeat Evo · Binaural ASMR × Thermal Haptics', 'MoHeat Evo · バイノーラルASMR × 温冷ハプティクス', 'MoHeat Evo · 双耳ASMR × 冷热触感'),
    'なつまつり、ふたりで': ('Summer Festival, Just Us', 'なつまつり、ふたりで', '夏日祭典，只有我们俩'),
    'Summer Festival, Just Us — a summer night, the shrine steps and your childhood friend': ('a summer night, the shrine steps and your childhood friend', '夏の夜、神社の石段で、幼なじみと', '夏夜，神社的石阶上，和青梅竹马一起'),
    '🏮 夏祭りの朔 · Interactive': ('🏮 Saku at the summer festival · Interactive', '🏮 夏祭りの朔 · インタラクティブ', '🏮 夏日祭典的朔 · 互动'),
    '🔥 屋台の熱気・耳元の声 · warm': ('🔥 festival heat · his voice at your ear · warm', '🔥 屋台の熱気・耳元の声 · あたたか', '🔥 小摊的热气・耳边的声音 · 温暖'),
    '🎐 うちわの風・かき氷の息 · cool': ('🎐 uchiwa breeze · a breath after shaved ice · cool', '🎐 うちわの風・かき氷の息 · ひんやり', '🎐 团扇的风・刨冰后的气息 · 清凉'),
    '▶ はじめる · Start': ('▶ Start', '▶ はじめる', '▶ 开始'),
    '🎧 Left / Right check': ('🎧 Left / Right check', '🎧 左右チェック', '🎧 左右声道检查'),
    "Headphones on · tap, hold or say your answer · connect MoHeat Evo to feel the festival heat, his fan's cool breeze circling your head, a cold breath after shaved ice and his voice at your ear":
        ("Headphones on · tap, hold or say your answer · connect MoHeat Evo to feel the festival heat, his fan's cool breeze circling your head, a cold breath after shaved ice and his voice at your ear",
         'ヘッドホンを装着 · タップ・長押し・声で答えよう · MoHeat Evo をつなぐと、屋台の熱気、頭のまわりを流れるうちわの風、かき氷のあとの冷たい息、耳元の声を感じられます',
         '请戴上耳机 · 点按、长按或说出你的回答 · 连接 MoHeat Evo，感受小摊的热气、环绕头部的团扇凉风、吃完刨冰后的凉凉气息和耳边的声音'),
    'Saku is an original character · voice ElevenLabs · art made with Seedance': ('Saku is an original character · voice ElevenLabs · art made with Seedance', '朔はオリジナルキャラクターです · 声 ElevenLabs · 美術 Seedance', '朔是原创角色 · 配音 ElevenLabs · 美术 Seedance'),
    'ASMR · Summer festival': ('ASMR · Summer festival', 'ASMR · 夏祭り', 'ASMR · 夏日祭典'),
    "Live (DUAL): his voice warms the ear he speaks at, with its loudness; the warm crowd, a hot griddle, the uchiwa fan's breeze (it sweeps around your head), the shaved ice and his cold breath after it add real warmth / cold.":
        ("Live (DUAL): his voice warms the ear he speaks at, with its loudness; the warm crowd, a hot griddle, the uchiwa fan's breeze (it sweeps around your head), the shaved ice and his cold breath after it add real warmth / cold.",
         'リアルタイム（DUAL）：彼の声は話しかける側の耳をその音量で温めます。人混みの熱気、鉄板の熱、頭のまわりを流れるうちわの風、かき氷と、そのあとの冷たい息が、本当の温かさ・冷たさを加えます。',
         '实时（DUAL）：他的声音按音量让他说话那一侧的耳朵变暖；人群的热气、铁板的热、环绕头部的团扇凉风、刨冰和吃完后的凉气，带来真实的暖与凉。'),
    'the festival stalls': ('the festival stalls', '屋台通り', '小摊街'),
    'the shrine steps': ('the shrine steps', '神社の石段', '神社的石阶'),
    'fireworks': ('fireworks', '花火', '烟花'),
    '🎆 もう、幼なじみには戻らない · Not just childhood friends anymore': ('🎆 Not just childhood friends anymore', '🎆 もう、幼なじみには戻らない', '🎆 再也不只是青梅竹马'),
    '🎆 来年も、彼の隣で · Next year, beside him again': ('🎆 Next year, beside him again', '🎆 来年も、彼の隣で', '🎆 明年，也在他身边'),
}
ZH_MISC = {'（花火の音で、よく聞こえない…）': '（烟花声太大，听不太清…）', '↺ もう一度': '↺ 再来一次',
           'もう、幼なじみには戻らない': '再也不只是青梅竹马', '来年も、彼の隣で': '明年，也在他身边',
           '屋台': '小摊', '石段': '石阶', 'かき氷': '刨冰', '花火': '烟花', '返事': '回答'}
main = open(os.path.join(ROOT, 'main.js'), encoding='utf-8').read()
for ja in ANSWERS: assert f"'{ja}'" in main, ja
zh = {LINES[k][0]: v for k, v in ZH_LINES.items()}
zh.update({ja: v[0] for ja, v in ANSWERS.items()}); zh.update(ZH_MISC); zh.update({k: v[2] for k, v in COVER.items()})
out = {'langs': ['en', 'ja', 'zh'], 'text': {'zh': zh, 'ja': {k: v[1] for k, v in COVER.items()}, 'en': {k: v[0] for k, v in COVER.items()}},
       'names': {}, 'voice': {'all': {ja: v[1] + [v[0]] for ja, v in ANSWERS.items() if v[1]}}}
open(os.path.join(ROOT, 'l10n.js'), 'w', encoding='utf-8').write(
    '// Languages of this demo for ../../shared/subs.js and ../../shared/voice.js — generated by scripts/make_l10n.py (edit there).\n'
    'window.MOHEAT_L10N = ' + json.dumps(out, ensure_ascii=False, indent=1) + ';\n')
print(len(zh), 'zh strings')
