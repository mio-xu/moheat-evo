#!/usr/bin/env python3
"""Writes ../l10n.js (DEMO_DESIGN_GUIDE §2.2) from the tables below. Keys for the story lines are read from lines.js, so they stay
byte-identical to what the page shows; everything else is checked against index.html / main.js before writing.
  python3 scripts/make_l10n.py"""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(os.path.join(ROOT, 'lines.js'), encoding='utf-8').read()
LINES = json.loads(src[src.index('= {') + 2:src.index('};') + 1])

ZH_LINES = {
    'm01': '……欢迎光临。欢迎来到耳朵专门店「ミント」。',
    'm02': '今晚的客人是……みみくん。……也就是屏幕前的你。',
    'm03': '……先从哪只耳朵开始放松呢？在弹幕里告诉我吧。',
    'm04': '……好的。我要碰这只耳朵了哦。手已经先暖过了。',
    'm05': '……揉、揉。……呵呵，好软。……放松哦。',
    'm06t': '……谢谢点单。热毛巾，盖在两只耳朵上。……呼，好暖和呀。',
    'm06s': '……谢谢点单。冰过的勺子。……贴。……是不是吓了一跳？',
    'm07': '……接下来，掏耳朵。……稍微、别动哦。',
    'm08': '……沙、沙。……唰。……好啦，干净了。乖，乖。',
    'm08x': '……啊，动了。……很危险的，再安静一会儿？',
    'm09w': '……暖暖的石头，放在你耳朵旁边哦。……慢慢暖起来。',
    'm09m': '……我涂了薄荷唇膏。……要来了哦。……呼——。……凉丝丝的吧。',
    'm10': '……另一边也要做哦。……能翻个身吗？',
    'm11': '……这只耳朵也，和刚才一样。……揉、揉。沙、沙。',
    'm12': '……噗。最后，一点清凉喷雾。……辛苦啦。',
    'm13': '……好多弹幕。「开始困了」……呵呵，太好了。',
    'm14a': '……秘密哦。……这家店，其实是为你开的。',
    'm14b': '……嗯、嗯～……。……摇篮曲，ミント原创的。',
    'm15': '……给你盖上毯子。……最后，跟我说声晚安？',
    'm16': '……晚安。……期待你再次光临。',
    'm17a': '……嗯。……说好了哦。',
    'm17b': '……诶，要延长……？……呵呵，真拿你没办法。……那我就陪在这里，直到你睡着。',
}
UI = {   # page text (ja as shown) → zh
    '💬 みぎ': '💬 右边', '💬 ひだり': '💬 左边',
    '💌 蒸しタオル': '💌 热毛巾', '💌 ひんやりスプーン': '💌 冰勺子', '💌 温石': '💌 温石', '💌 ミントの吐息': '💌 薄荷气息',
    '動かない（長押し）': '别动（长按）', '寝返り': '翻身', 'おやすみ': '晚安',
    '💬 ひみつ、ききたい': '💬 想听秘密', '💬 子守唄、ききたい': '💬 想听摇篮曲', '💬 また来るね': '💬 我还会再来', '💌 延長おねがい': '💌 请延长',
    'ご来店': '欢迎光临', 'ほぐす': '放松耳朵', 'おみみかき': '掏耳朵', '反対のおみみ': '另一只耳朵', 'ねかしつけ': '哄睡',
    '🌙 あなたが眠るまで。': '🌙 直到你睡着。', '🌙 またのご来店を。': '🌙 期待再次光临。',
    '↺ もう一度': '↺ 再来一次',
}
MIXED = {   # key: [zh, ja, en]
    'MoHeat Evo · Binaural ASMR × Thermal Haptics': ['MoHeat Evo · 双耳ASMR × 冷热触感', 'MoHeat Evo · バイノーラルASMR × 温冷ハプティクス', 'MoHeat Evo · Binaural ASMR × Thermal Haptics'],
    'ミントの、おみみ専門店': ['薄荷的耳朵专门店', 'ミントの、おみみ専門店', "Mint's Ear Salon"],
    "Mint's Ear Salon — a sleepy role-play stream: the chat orders, your ears get pampered": ['困困的角色扮演直播：弹幕点单，宠爱你的耳朵', '眠たいロールプレイ配信：コメントで注文、あなたの耳をとろとろに', 'A sleepy role-play stream: the chat orders, your ears get pampered'],
    '🌿 おみみ専門店の配信 · Live stream': ['🌿 耳朵专门店直播 · 直播', '🌿 おみみ専門店の配信 · ライブ配信', '🌿 An ear-salon stream · Live stream'],
    '♨️ 蒸しタオル・温石・ささやき · warm': ['♨️ 热毛巾・温石・耳语 · 温暖', '♨️ 蒸しタオル・温石・ささやき · あたたか', '♨️ steamed towel · warm stone · whisper · warm'],
    '🥄 ひんやりスプーン・ミントの吐息・ミスト · cool': ['🥄 冰勺子・薄荷气息・喷雾 · 清凉', '🥄 ひんやりスプーン・ミントの吐息・ミスト · ひんやり', '🥄 chilled spoon · mint breath · mist · cool'],
    '▶ はじめる · Start': ['▶ 开始', '▶ はじめる', '▶ Start'],
    '🎧 Left / Right check': ['🎧 左右声道检查', '🎧 左右チェック', '🎧 Left / Right check'],
    'Headphones on · vote / order by tap or voice · connect MoHeat Evo to feel the towel, the spoon, the warm stone, her mint breath and her whisper':
        ['请戴上耳机 · 点按或用声音投票 / 点单 · 连接 MoHeat Evo，感受热毛巾、冰勺子、温石、她的薄荷气息和耳语',
         'ヘッドホンを装着 · タップか声で投票・注文 · MoHeat Evo をつなぐと、蒸しタオル、スプーン、温石、ミントの吐息、ささやきを感じられます',
         'Headphones on · vote / order by tap or voice · connect MoHeat Evo to feel the towel, the spoon, the warm stone, her mint breath and her whisper'],
    'Mint is an original character · voice ElevenLabs · art made with OpenAI gpt-image · layered stills': ['薄荷是原创角色 · 配音 ElevenLabs · 美术 OpenAI gpt-image · 分层静帧', 'ミントはオリジナルキャラクターです · 声 ElevenLabs · 絵 OpenAI gpt-image · レイヤー静止画', 'Mint is an original character · voice ElevenLabs · art made with OpenAI gpt-image · layered stills'],
    'ASMR · Live stream': ['ASMR · 直播', 'ASMR · ライブ配信', 'ASMR · Live stream'],
    'Live (DUAL): her whisper warms the ear she leans to, with its loudness; her warm hands, the steamed towel, the chilled spoon, the warm stone, her mint breath and the cool mist add real cold / warmth — often on the same ear at once.':
        ['实时（DUAL）：她的耳语按音量让她靠近的那只耳朵变暖；温暖的手、热毛巾、冰勺子、温石、薄荷气息和清凉喷雾带来真实的冷与暖——常常在同一只耳朵上同时出现。',
         'リアルタイム（DUAL）：ささやきは、彼女が寄った側の耳をその音量で温めます。あたためた手、蒸しタオル、ひんやりスプーン、温石、ミントの吐息、ミストが本当の冷たさ・温かさを加えます——同じ耳に同時に来ることも。',
         'Live (DUAL): her whisper warms the ear she leans to, with its loudness; her warm hands, the steamed towel, the chilled spoon, the warm stone, her mint breath and the cool mist add real cold / warmth — often on the same ear at once.'],
    '🌙 あなたが眠るまで。 · Until you fall asleep': ['🌙 直到你睡着。', '🌙 あなたが眠るまで。', '🌙 Until you fall asleep'],
    '🌙 またのご来店を。 · See you at the salon': ['🌙 期待再次光临。', '🌙 またのご来店を。', '🌙 See you at the salon'],
}
EN_UI = {'ご来店': 'Welcome', 'ほぐす': 'Ear massage', 'おみみかき': 'Ear cleaning', '反対のおみみ': 'The other ear', 'ねかしつけ': 'Goodnight',
         '🌙 あなたが眠るまで。': '🌙 Until you fall asleep', '🌙 またのご来店を。': '🌙 See you at the salon', '↺ もう一度': '↺ Play again'}
VOICE = {   # each answer → same-meaning phrasings (zh, en, ja) for shared/voice.js
    '💬 みぎ': ['右边', '右耳', '右', 'right', 'right ear', 'みぎ', '右耳', '右から'],
    '💬 ひだり': ['左边', '左耳', '左', 'left', 'left ear', 'ひだり', '左耳', '左から'],
    '💌 蒸しタオル': ['热毛巾', '毛巾', 'towel', 'steamed towel', 'hot towel', '蒸しタオル', 'タオル'],
    '💌 ひんやりスプーン': ['冰勺子', '勺子', 'spoon', 'chilled spoon', 'cold spoon', 'スプーン', 'ひんやり'],
    '💌 温石': ['温石', '石头', '暖石', 'warm stone', 'stone', 'おんじゃく', '石'],
    '💌 ミントの吐息': ['薄荷', '吹气', '气息', 'mint breath', 'mint', 'blow', 'ミント', '吐息', 'ふーして'],
    '寝返り': ['翻身', '转过去', '换边', 'roll over', 'turn over', 'other side', 'ごろん', '寝返り', '反対'],
    'おやすみ': ['晚安', '睡吧', 'good night', 'goodnight', 'night', 'おやすみ', 'おやすみなさい'],
    '💬 ひみつ、ききたい': ['秘密', '想听秘密', 'secret', 'tell us a secret', 'ひみつ', '秘密'],
    '💬 子守唄、ききたい': ['摇篮曲', '唱歌', 'lullaby', 'sing', '子守唄', '歌って'],
    '💬 また来るね': ['还会再来', '再来', '下次见', "i'll come again", 'see you', 'again', 'また来る', 'またね'],
    '💌 延長おねがい': ['延长', '再一会儿', '不要走', 'extension', 'more', 'stay', '延長', 'もう少し'],
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
