#!/usr/bin/env python3
"""Writes ../l10n.js (DEMO_DESIGN_GUIDE §2.2) from the tables below. Keys for the story lines are read from lines.js, so they stay
byte-identical to what the page shows; everything else is checked against index.html / main.js before writing.
  python3 scripts/make_l10n.py"""
import json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(os.path.join(ROOT, 'lines.js'), encoding='utf-8').read()
LINES = json.loads(src[src.index('= {') + 2:src.index('};') + 1])
MUFFLED = ['']

ZH_LINES = {
    'h01': '太——慢啦！…骗你的骗你的，我也刚到！嘿嘿，今天休息，所以我变装了。',
    'h02': '认得出来吗？这顶帽子，可爱吧？',
    'h03a': '对吧对吧～！好——，今天我要全部赢下来！',
    'h03b': '诶——不是吧！…算啦，被你认出来就好。好——，来比赛！',
    'h04': '先打太鼓！输的人请喝饮料！…预备——开始！',
    'h05w': '不会吧！？输了…！再来一次！…虽然很想这么说，愿赌服输，饮料我请。',
    'h05l': '耶——！我赢啦！嘿嘿，饮料就拜托你啦！',
    'h06': '下一个，赛车！坐我旁边！…这台会吹风的哦。',
    'h07a': '喂、好快！不会吧，被超了——！',
    'h07b': '喂！不许撞！…耍赖～，我也要撞回去！',
    'h08': '哈、哈…太好玩了。…和你一起，就算输了也开心，为什么呢。',
    'h09': '啊，你看！那个猫咪玩偶，好想要…！…帮我抓好不好？',
    'h10x': '啊——差一点！爪子太松啦！…再来一次！',
    'h10': '抓到啦——！好厉害好厉害！…谢谢。…我会好好珍惜它的。',
    'h11': '呐，去拍大头贴吧！…好挤。…再靠过来一点？',
    'h12': '…上面要写什么？',
    'h13a': '…诶，朋友？…哼——。…我要写别的。…不许看！',
    'h13b': '…！？你、你写什么呢…！…那我也写一样的。',
    'h14': '好冷！…给，玉米浓汤。代替刚才的饮料。…贴。',
    'h15': '…呐。今天的大头贴，直播里绝对不给别人看。…是只属于你和我的秘密。',
    'h16a': '嗯！下次我绝——对不会输！',
    'h16b': '诶…！？那、那样的话…大家都会知道的啦…！…不过，有点开心。',
}
UI = {
    'かわいい': '可爱', 'バレバレ': '一眼就认出来了', 'インから抜く': '从内道超车', 'ひなたにぶつける': '撞日向',
    'ずっと友だち': '永远是朋友', '…ひなたが好き': '……我喜欢日向', 'また来よう': '下次再来吧', '次は、ひなたの配信に出る': '下次我要上日向的直播',
    'ドン！（連打）': '咚！（连打）', 'アームを動かす（長押し）': '移动爪子（长按）', 'ピース': '比耶', '受け取る': '接过来',
    'ゲーセン到着': '到达游戏厅', '太鼓で勝負': '太鼓比赛', 'レースゲーム': '赛车游戏', 'クレーンゲーム': '抓娃娃机', 'プリクラ': '大头贴', '帰り道': '回家路上',
    '🎮 ひなたの、ひみつのファン': '🎮 日向的秘密粉丝', '🎮 また、ふたりで。': '🎮 下次，还是我们俩。', '↺ もう一度': '↺ 再来一次',
}
MIXED = {   # key: [zh, ja, en]
    'MoHeat Evo · Binaural ASMR × Thermal Haptics': ['MoHeat Evo · 双耳ASMR × 冷热触感', 'MoHeat Evo · バイノーラルASMR × 温冷ハプティクス', 'MoHeat Evo · Binaural ASMR × Thermal Haptics'],
    'ひなたと、ゲーセンデート': ['和日向的游戏厅约会', 'ひなたと、ゲーセンデート', 'Arcade Date with Hinata'],
    'Arcade Date with Hinata — taiko, racing, a crane game and purikura with the gamer girl in disguise': ['和变装的游戏少女一起：太鼓、赛车、抓娃娃、拍大头贴', '変装したゲーマー女子と、太鼓・レース・クレーン・プリクラ', 'Taiko, racing, a crane game and purikura with the gamer girl in disguise'],
    '🎮 ゲーマー女子とデート · Interactive': ['🎮 和游戏少女约会 · 互动', '🎮 ゲーマー女子とデート · インタラクティブ', '🎮 A date with a gamer girl · Interactive'],
    '🥫 コーンスープ・耳元の声 · warm': ['🥫 玉米浓汤・耳边的声音 · 温暖', '🥫 コーンスープ・耳元の声 · あたたか', '🥫 hot corn soup · her voice at your ear · warm'],
    '🌀 レースの風・冬の夜風 · cool': ['🌀 赛车的风・冬夜寒风 · 清凉', '🌀 レースの風・冬の夜風 · ひんやり', '🌀 racing fans · winter night wind · cool'],
    '▶ はじめる · Start': ['▶ 开始', '▶ はじめる', '▶ Start'],
    '🎧 Left / Right check': ['🎧 左右声道检查', '🎧 左右チェック', '🎧 Left / Right check'],
    'Headphones on · tap / hold or answer her by voice · connect MoHeat Evo to feel the racing fans, the winter street, a hot can on your cheek and her voice':
        ['请戴上耳机 · 点按 / 长按或用声音回应她 · 连接 MoHeat Evo，感受赛车的风、冬夜的街道、贴在脸颊的热罐和她的声音',
         'ヘッドホンを装着 · タップ / 長押し、または声で答えよう · MoHeat Evo をつなぐと、レースの風、冬の街、頬の熱い缶、彼女の声を感じられます',
         'Headphones on · tap / hold or answer her by voice · connect MoHeat Evo to feel the racing fans, the winter street, a hot can on your cheek and her voice'],
    'Hinata is an original character · voice ElevenLabs · art made with OpenAI image generation': ['日向是原创角色 · 配音 ElevenLabs · 美术 OpenAI 图像生成', 'ひなたはオリジナルキャラクターです · 声 ElevenLabs · 絵 OpenAI 画像生成', 'Hinata is an original character · voice ElevenLabs · art made with OpenAI image generation'],
    'ASMR · Arcade date': ['ASMR · 游戏厅约会', 'ASMR · ゲーセンデート', 'ASMR · Arcade date'],
    'Live (DUAL): her voice warms the ear she speaks at, with its loudness; the warm arcade, the racing fans, the cold street and the hot can on your left cheek add real cold / warmth — often both at once.':
        ['实时（DUAL）：她的声音按音量让她说话那一侧的耳朵变暖；温暖的游戏厅、赛车的风、寒冷的街道、贴在你左脸的热罐带来真实的冷与暖——常常是冷热同时。',
         'リアルタイム（DUAL）：彼女の声は、話しかける側の耳をその音量で温めます。暖かいゲーセン、レースの風、冬の街、左頬の熱い缶が、本当の冷たさ・温かさを——ときには同時に——加えます。',
         'Live (DUAL): her voice warms the ear she speaks at, with its loudness; the warm arcade, the racing fans, the cold street and the hot can on your left cheek add real cold / warmth — often both at once.'],
    "🎮 ひなたの、ひみつのファン · Hinata's secret fan": ['🎮 日向的秘密粉丝', '🎮 ひなたの、ひみつのファン', "🎮 Hinata's secret fan"],
    'ひなたの、ひみつのファン': ['日向的秘密粉丝', 'ひなたの、ひみつのファン', "Hinata's secret fan"],
    '🎮 また、ふたりで。 · Again, just us two': ['🎮 下次，还是我们俩。', '🎮 また、ふたりで。', '🎮 Again, just us two'],
    'また、ふたりで。': ['下次，还是我们俩。', 'また、ふたりで。', 'Again, just us two'],
}
EN_UI = {'ゲーセン到着': 'At the arcade', '太鼓で勝負': 'Taiko match', 'レースゲーム': 'Racing', 'クレーンゲーム': 'Crane game', 'プリクラ': 'Purikura', '帰り道': 'The way home',
         '🎮 ひなたの、ひみつのファン': "🎮 Hinata's secret fan", '🎮 また、ふたりで。': '🎮 Again, just us two', '↺ もう一度': '↺ Play again'}
VOICE = {
    'かわいい': ['可爱', '很可爱', '好看', '适合你', 'cute', "it's cute", 'looks good', 'かわいいよ', '似合ってる'],
    'バレバレ': ['一眼就认出来', '认出来了', '太明显了', '露馅了', 'obvious', 'totally obvious', 'i can tell', 'バレてる', 'すぐわかる'],
    'インから抜く': ['从内道超车', '超车', '内道', '超过去', 'overtake', 'inside', 'pass her', '抜く', 'インから'],
    'ひなたにぶつける': ['撞日向', '撞她', '撞上去', '撞过去', 'ram', 'ram her', 'crash into her', 'ぶつける', '体当たり'],
    'ずっと友だち': ['永远是朋友', '朋友', '一直是朋友', 'friends forever', 'friends', 'best friends', '友だち', 'ずっと友達'],
    '…ひなたが好き': ['我喜欢日向', '喜欢你', '我喜欢你', 'i like you', 'i like hinata', 'love you', '好き', 'ひなたが好き'],
    'また来よう': ['下次再来', '再来吧', '还要来', 'come again', "let's come again", 'again', 'また来よう', 'また来ようね'],
    '次は、ひなたの配信に出る': ['上日向的直播', '上你的直播', '直播', '出演直播', 'on your stream', 'your stream', 'stream', '配信に出る', '配信'],
    'ピース': ['比耶', '耶', '剪刀手', 'peace', 'peace sign', 'cheese', 'ピース', 'はいチーズ'],
    '受け取る': ['接过来', '谢谢', '拿着', 'take it', 'thanks', 'thank you', 'ありがとう', 'もらう'],
}
page = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read() + open(os.path.join(ROOT, 'main.js'), encoding='utf-8').read()
for k in list(UI) + list(MIXED) + list(VOICE):
    if k in ('ゲーセン到着', '太鼓で勝負', 'レースゲーム', 'クレーンゲーム', 'プリクラ', '帰り道', 'ドン！（連打）', 'アームを動かす（長押し）'): continue   # written by main.js (checked by the page scan)
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
