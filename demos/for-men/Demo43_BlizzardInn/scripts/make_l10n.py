#!/usr/bin/env python3
"""Writes ../l10n.js (DEMO_DESIGN_GUIDE §2.2): the story / bridge / keep-talking lines' 中文 come from scripts/script_data.py
(project/zh_lines.json, keys byte-identical to what the page shows); the page texts below are checked against index.html / main.js
before writing (a key that is not on the page = a typo → stop).  python3 scripts/script_data.py && python3 scripts/make_l10n.py"""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ZH_LINES = json.load(open(os.path.join(ROOT, 'project', 'zh_lines.json'), encoding='utf-8'))
UI = {   # ja shown on the page → zh
    '助けて…': '救救我…', 'あなたは…？': '你是…？', '手をとる': '握住她的手', '大！': '大！', '小！': '小！', 'じっとする（長押し）': '别动（长按）',
    '「おつかれさま」': '「辛苦了」', '「ありがとう」': '「谢谢」', 'ミントの星の簪': '薄荷的星星发簪', 'ひなたのサイコロ': '日向的骰子', '渚の髪紐': '渚的发绳',
    '吹雪の峠': '暴风雪的山口', '宿・火鍋': '客栈・火锅', '女医の手当て': '女大夫的治疗', '夜番': '守夜', '夜明けの峠': '黎明的山口',
    'ひなたに答えてみよう（何でも）': '回答日向吧（说什么都行）', 'ミントに答えてみよう': '回答薄荷吧', '渚に答えてみよう': '回答渚吧',
    '⭐ 星の簪を、手のひらに': '⭐ 星星发簪，在你手心', '🎲 サイコロを、手のひらに': '🎲 骰子，在你手心', '🧡 橙の髪紐を、手のひらに': '🧡 橙色发绳，在你手心',
    '↺ もう一度': '↺ 再来一次', '💬 もっと話す': '💬 继续聊天', 'ミント': '薄荷', 'ひなた': '日向', '渚': '渚', '三人': '三个人',
}
MIXED = {   # key (as written on the page): [zh, ja, en]
    'MoHeat Evo · Binaural ASMR × Thermal Haptics': ['MoHeat Evo · 双耳ASMR × 冷热触感', 'MoHeat Evo · バイノーラルASMR × 温冷ハプティクス', 'MoHeat Evo · Binaural ASMR × Thermal Haptics'],
    '白嶺の峠、ひと晩の宿': ['白岭山口，一夜客栈', '白嶺の峠、ひと晩の宿', 'The White-Ridge Inn'],
    'One Night at the White-Ridge Inn — a guard, an innkeeper and a sleepy doctor':
        ['女镖师、客栈小老板娘和爱犯困的女大夫', '用心棒と、宿の看板娘と、ねむたがりのお医者さん', 'One night in a snowbound inn — a guard, an innkeeper and a sleepy doctor'],
    '🏮 吹雪の山の宿 · Interactive': ['🏮 暴风雪中的山间客栈 · 互动', '🏮 吹雪の山の宿 · インタラクティブ', '🏮 A mountain inn in a blizzard · Interactive'],
    '🔥 お灸・火鍋・耳元の声 · warm': ['🔥 艾灸・火锅・耳边的声音 · 温暖', '🔥 お灸・火鍋・耳元の声 · あたたか', '🔥 moxa · hotpot · voices at your ear · warm'],
    '🌿 薄荷の軟膏・吹雪・夜風 · cool': ['🌿 薄荷膏・暴风雪・夜风 · 清凉', '🌿 薄荷の軟膏・吹雪・夜風 · ひんやり', '🌿 mint balm · blizzard · night wind · cool'],
    '▶ はじめる · Start': ['▶ 开始', '▶ はじめる', '▶ Start'],
    '🎧 Left / Right check': ['🎧 左右声道检查', '🎧 左右チェック', '🎧 Left / Right check'],
    '💬 もっと話す · Keep talking': ['💬 继续聊天', '💬 もっと話す', '💬 Keep talking'],
    'ミント · Mint': ['薄荷', 'ミント', 'Mint'], 'ひなた · Hinata': ['日向', 'ひなた', 'Hinata'], '渚 · Nagisa': ['渚', '渚', 'Nagisa'], '三人 · All three': ['三个人', '三人', 'All three'],
    'Headphones on · tap / hold or answer by voice, and talk with them freely · connect MoHeat Evo to feel the blizzard, a hotpot, moxa and mint balm on the same ear, and their voices':
        ['请戴上耳机 · 点按 / 长按或用声音回答，也可以和她们自由聊天 · 连接 MoHeat Evo，感受暴风雪、火锅、同一只耳朵上的艾灸与薄荷膏，以及她们的声音',
         'ヘッドホンを装着 · タップ / 長押し、または声で答えて、自由に話しかけることもできます · MoHeat Evo をつなぐと、吹雪、火鍋、同じ耳のお灸と薄荷の軟膏、そして彼女たちの声を感じられます',
         'Headphones on · tap / hold or answer by voice, and talk with them freely · connect MoHeat Evo to feel the blizzard, a hotpot, moxa and mint balm on the same ear, and their voices'],
    'Original characters in a special version · everyone speaks Japanese there · voices ElevenLabs · art OpenAI gpt-image · layered stills · free talk = scripted preview':
        ['原创角色的特别版 · 那里的人都说日语 · 配音 ElevenLabs · 美术 OpenAI gpt-image · 分层静帧 · 自由对话为剧本预览版',
         'オリジナルキャラクターの特別版 · その国ではみんな日本語を話します · 声 ElevenLabs · 絵 OpenAI gpt-image · レイヤー静止画 · 自由会話は台本プレビュー',
         'Original characters in a special version · everyone speaks Japanese there · voices ElevenLabs · art OpenAI gpt-image · layered stills · free talk = scripted preview'],
    'ASMR · Crossover': ['ASMR · 穿越篇', 'ASMR · クロスオーバー', 'ASMR · Crossover'],
    'Live (DUAL): each voice warms the ear it speaks at, with its loudness; blizzard gusts sweep left → right, the hotpot and the brazier warm you, moxa circles your right ear while mint balm cools the same ear, and the door bursts open on your left.':
        ['实时（DUAL）：每个人的声音按音量让她说话那一侧的耳朵变暖；暴风雪的阵风从左扫到右，火锅和火盆让你暖和，艾灸在右耳边画圈的同时薄荷膏让同一只耳朵变凉，夜里门在你左边被风撞开。',
         'リアルタイム（DUAL）：声はその音量で、話しかける側の耳を温めます。吹雪の突風は左から右へ、火鍋と火鉢があたたかく、お灸が右耳のまわりを回るあいだ薄荷の軟膏が同じ耳を冷やし、夜には左の戸が風で開きます。',
         'Live (DUAL): each voice warms the ear it speaks at, with its loudness; blizzard gusts sweep left → right, the hotpot and the brazier warm you, moxa circles your right ear while mint balm cools the same ear, and the door bursts open on your left.'],
    'ミント・ひなた・渚 ElevenLabs': ['薄荷・日向・渚 ElevenLabs', 'ミント・ひなた・渚 ElevenLabs', 'Mint · Hinata · Nagisa — ElevenLabs'],
}
NAMES = {'ミント': {'en': 'Mint', 'zh': '薄荷'}, 'ひなた': {'en': 'Hinata', 'zh': '日向'}, '渚': {'en': 'Nagisa', 'zh': '渚'}}
VOICE = {'all': {   # same-meaning phrasings per answer (voice judging, §2.1)
    '助けて…': ['救命', '帮帮我', '救我', 'help me', 'please help', 'たすけて'],
    'あなたは…？': ['你是谁', '你是哪位', 'who are you', 'what is your name', 'あなたはだれ', 'あなたは誰', 'だれなの'],
    '手をとる': ['握住', '握手', '抓住', '拉住她的手', 'take her hand', 'grab', 'hold her hand', 'つかむ', '握る'],
    '大！': ['大', '选大', '押大', 'big', 'large', 'おおきい', 'だい'],
    '小！': ['小', '选小', '押小', 'small', 'little', 'ちいさい', 'しょう'],
    '「おつかれさま」': ['辛苦了', '辛苦你了', '你辛苦了', 'otsukare', 'good work', 'thanks for your hard work', 'well done', 'お疲れ様'],
    '「ありがとう」': ['谢谢', '谢谢你', '多谢', 'thank you', 'thanks', 'thank you so much', '感謝'],
    'ミントの星の簪': ['薄荷', '发簪', '星星', '簪子', 'mint', 'hairpin', 'the star', 'ほし', 'かんざし'],
    'ひなたのサイコロ': ['日向', '骰子', '色子', 'hinata', 'dice', 'the dice', 'さいころ'],
    '渚の髪紐': ['渚', '发绳', '头绳', 'nagisa', 'hair tie', 'ribbon', 'かみひも', 'ひも'],
}}
if __name__ == '__main__':
    page = '白嶺の峠、ひと晩の宿' + ''.join(open(os.path.join(ROOT, f), encoding='utf-8').read() for f in ('index.html', 'main.js'))
    for k in list(UI) + list(MIXED):
        if k not in page: raise SystemExit(f'not on the page: {k!r}')
    zh = {**ZH_LINES, **UI, **{k: v[0] for k, v in MIXED.items()}}
    data = {'langs': ['en', 'ja', 'zh'], 'text': {'zh': zh, 'ja': {k: v[1] for k, v in MIXED.items()}, 'en': {k: v[2] for k, v in MIXED.items()}},
            'names': NAMES, 'voice': VOICE}
    head = ("// Languages of this demo for ../../shared/subs.js (subtitles, answers, cover) and ../../shared/voice.js (voice answers).\n"
            "// Generated by scripts/make_l10n.py (DEMO_DESIGN_GUIDE §2.2) — edit the tables there (lines: scripts/script_data.py), not this file.\n")
    open(os.path.join(ROOT, 'l10n.js'), 'w', encoding='utf-8').write(head + 'window.MOHEAT_L10N = ' + json.dumps(data, ensure_ascii=False, indent=1) + ';\n')
    print(len(zh), 'zh strings')
