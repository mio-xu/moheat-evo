#!/usr/bin/env python3
"""Writes ../l10n.js (DEMO_DESIGN_GUIDE §2.2) from lines.js + the tables below: zh subtitles, answer buttons (+ voice phrasings),
cover / side-panel texts in ja / en / zh, speaker names. Same layout as Demo28's make_l10n.py; edit the tables here and re-run."""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(os.path.join(ROOT, 'lines.js'), encoding='utf-8').read()
L = json.loads(src[src.index('= {') + 2:src.rindex('}') + 1])
ZH_LINES = {
    'p01': '喂——！这边，这边——！', 'p02': '你可算来啦！……嗯？这条围巾，是你奶奶织的那条吧。',
    'p03a': '哎，回来啦！……哈哈哈，怪不好意思的。', 'p03b': '那还用说！我一个钟头前就在这儿等着了。',
    'p04': '走吧，天冷，快回家。你奶奶都等急了。', 'g01': '来了来了来了……！哎呀呀呀！',
    'g02': '回来啦……。哎呀，长这么大了……', 'g03': '呵呵，可算回来了。快，快进屋。被炉我早就给你烘暖了。',
    'g04': '来，红豆年糕汤。烫，吹一吹再吃哦。', 'p05': '你奶奶的红豆汤是日本第一。……我的橘子，你也来一个？',
    'p06a': '好嘞，爷爷给你剥。……你看，连白筋都给你摘干净了。', 'g05b': '哎呀，真让人高兴！多吃点。',
    'g06': '暖炉跟前，暖和吧？你右边脸蛋都红透了。', 'p07': '早啊！来，堆雪人！爷爷的雪人可大着呢——！',
    'p08': '……看招！', 'p09': '哈哈哈！没打中啊！', 'p10': '哇！？好、好冰！……可以啊，不愧是我孙子。',
    'g07': '你们俩，要感冒的——！甜酒煮好啦——！', 'g08': '……还没睡？呵呵，奶奶也没睡。',
    'g09': '……你爷爷啊，年轻的时候，在一个下雪天，就说了一句"嫁到我家来吧"，然后脸红得跟什么似的。',
    'g10': '呵呵……。来，被子给你盖到耳朵这儿。', 'g11': '……明天，就要回去了吧？',
    'g12a': '……嗯。我们等着你。爷爷和奶奶都等着。', 'g12b': '……呵呵，说得奶奶心里真高兴。随时回来。这里就是你的家。',
    'p11': '……呼噜……我孙子……日本第一……', 'g13': '呵呵……。晚安。'}
BUTTONS = [   # ja (as in main.js), zh, voice phrasings (None = a hold button: not voice-picked)
    ('ただいま！', '我回来了！', ['我回来了', '回来了', '爷爷我回来了', "i'm home", 'home', 'im back', 'ただいま', 'ただいまー']),
    ('迎えに来てくれたの？', '你来接我啦？', ['来接我', '你来接我了', '接我', 'you came', 'pick me up', 'came to get me', '迎えに来た', 'むかえ']),
    ('「ただいま」と言う', '说「我回来了」', ['我回来了', '回来了', '奶奶我回来了', "i'm home", 'home', 'im back', 'ただいま', 'ただいまー']),
    ('ふーふーする（長押し）', '呼呼吹凉（长按）', None),
    ('みかん、ちょうだい', '给我个橘子', ['橘子', '要橘子', '吃橘子', '蜜柑', 'mandarin', 'orange', 'みかん', 'みかんちょうだい']),
    ('おしるこ、おかわり！', '红豆汤，再来一碗！', ['红豆汤', '再来一碗', '再来', '还要', 'more', 'seconds', 'more oshiruko', 'おかわり', 'おしるこ']),
    ('雪玉を投げ返す', '把雪球扔回去', ['扔回去', '扔', '扔雪球', '打回去', 'throw', 'throw it back', 'throw back', '投げる', 'えい']),
    ('また来るね', '我还会再来的', ['还会再来', '再来', '我会再来', '下次再来', 'come again', 'again', "i'll be back", 'また来る', 'またね']),
    ('ずっとここにいたい', '好想一直待在这里', ['一直待在这', '不想走', '想留下', '一直', 'stay', 'forever', 'stay here', 'ずっと', 'いたい']),
]
PAGE = [   # text on the page → zh, ja, en
    ('ただいま、じいちゃん・ばあちゃん', '爷爷奶奶，我回来了', 'ただいま、じいちゃん・ばあちゃん', 'Home for New Year'),   # the cover title (h1)
    ('MoHeat Evo · Binaural ASMR × Thermal Haptics', 'MoHeat Evo · 双耳ASMR × 冷热触感', 'MoHeat Evo · バイノーラルASMR × 温冷ハプティクス', 'MoHeat Evo · Binaural ASMR × Thermal Haptics'),
    ("Home for New Year — two snowy days at Grandma and Grandpa's", '回乡下的爷爷奶奶家，过两天下雪的新年', '雪の田舎で、じいちゃん・ばあちゃんと過ごす二日間', "Two snowy days at Grandma and Grandpa's"),
    ('🏡 おじいちゃん家へ · Interactive', '🏡 回爷爷奶奶家 · 互动', '🏡 おじいちゃん家へ · インタラクティブ', "🏡 To Grandma and Grandpa's · Interactive"),
    ('🔥 こたつ・ストーブ・耳元の声 · warm', '🔥 被炉・暖炉・耳边的声音 · 温暖', '🔥 こたつ・ストーブ・耳元の声 · あたたか', '🔥 kotatsu · stove · a voice at your ear · warm'),
    ('❄️ 駅の風・雪玉 · cool', '❄️ 车站的风・雪球 · 清凉', '❄️ 駅の風・雪玉 · ひんやり', '❄️ station wind · snowball · cool'),
    ('▶ はじめる · Start', '▶ 开始', '▶ はじめる', '▶ Start'),
    ('🎧 Left / Right check', '🎧 左右声道检查', '🎧 左右チェック', '🎧 Left / Right check'),
    ("Headphones on · tap, hold or say your answer · connect MoHeat Evo to feel the station wind, the warm house, the stove, a snowball whizzing past and Grandma's voice at your ear",
     '请戴上耳机 · 点按、长按或说出你的回答 · 连接 MoHeat Evo，感受车站的寒风、屋里的暖意、暖炉、擦耳而过的雪球，还有奶奶在耳边的声音',
     'ヘッドホンを装着 · タップ・長押し・声で答えよう · MoHeat Evo をつなぐと、駅の風、あたたかい家、ストーブ、耳をかすめる雪玉、耳元のばあちゃんの声を感じられます',
     "Headphones on · tap, hold or say your answer · connect MoHeat Evo to feel the station wind, the warm house, the stove, a snowball whizzing past and Grandma's voice at your ear"),
    ('Hana & Gen are original characters · voices ElevenLabs · art made with Seedance', '花奶奶和源爷爷是原创角色 · 配音 ElevenLabs · 美术 Seedance', 'ハナとゲンはオリジナルキャラクター · 声 ElevenLabs · イラスト Seedance', 'Hana & Gen are original characters · voices ElevenLabs · art made with Seedance'),
    ('ASMR · Home for New Year', 'ASMR · 回家过年', 'ASMR · 帰省', 'ASMR · Home for New Year'),
    ('Live (DUAL): their voices warm the ear they speak at, with their loudness; the station wind, the warm air from the open door, the stove, the steaming bowl, a snowball and the quilt add real cold / warmth.',
     '实时（DUAL）：爷爷奶奶的声音按音量让说话那一侧的耳朵变暖；车站的风、门里涌出的暖气、暖炉、冒热气的碗、雪球和被子带来真实的冷与暖。',
     'リアルタイム（DUAL）：二人の声は話しかける側の耳を、その大きさで温めます。駅の風、開いた戸からの暖気、ストーブ、湯気の立つお椀、雪玉、ふとんが、本当の冷たさ・温かさを加えます。',
     'Live (DUAL): their voices warm the ear they speak at, with their loudness; the station wind, the warm air from the open door, the stove, the steaming bowl, a snowball and the quilt add real cold / warmth.'),
    ('🏡 ここは、あんたの家じゃけん · This is your home', '🏡 这里就是你的家', '🏡 ここは、あんたの家じゃけん', '🏡 This is your home'),
    ("🏡 また来るね、待っとるけんね · Come again — we'll be waiting", '🏡 还会再来的——我们等着你', '🏡 また来るね、待っとるけんね', "🏡 Come again — we'll be waiting"),
    ('↺ もう一度 · Play again', '↺ 再来一次', '↺ もう一度', '↺ Play again'),
    ('the little station · dusk', '小车站 · 傍晚', '小さな駅 · 夕方', 'the little station · dusk'),
    ('the genkan', '玄关', '玄関', 'the genkan'),
    ('the kotatsu', '被炉', 'こたつ', 'the kotatsu'),
    ('the garden · morning', '院子 · 早上', '庭 · 朝', 'the garden · morning'),
    ('bedtime', '睡觉时间', 'おやすみの時間', 'bedtime'),
]
missing = set(L) - set(ZH_LINES)
if missing: raise SystemExit(f'no zh for {sorted(missing)}')
zh = {L[k][1]: v for k, v in ZH_LINES.items()}
zh.update({ja: z for ja, z, _ in BUTTONS})
ja_t, en_t = {}, {}
for k, z, j, e in PAGE: zh[k] = z; ja_t[k] = j; en_t[k] = e
out = {'langs': ['en', 'ja', 'zh'], 'text': {'zh': zh, 'ja': ja_t, 'en': en_t},
       'names': {'ばあば': {'en': 'Grandma', 'zh': '奶奶'}, 'じいじ': {'en': 'Grandpa', 'zh': '爷爷'}},
       'voice': {'all': {ja: [z] + v for ja, z, v in BUTTONS if v}}}
HDR = ('// Languages of this demo for ../../shared/subs.js (subtitles, answers, cover) and ../../shared/voice.js (voice answers).\n'
       '// Generated by scripts/make_l10n.py — edit the tables there and re-run (keys must stay byte-identical to the page text, §2.2).\n')
open(os.path.join(ROOT, 'l10n.js'), 'w', encoding='utf-8').write(HDR + 'window.MOHEAT_L10N = ' + json.dumps(out, ensure_ascii=False, indent=1) + ';\n')
print('l10n.js:', len(zh), 'zh strings,', len(out['voice']['all']), 'voice answers')
