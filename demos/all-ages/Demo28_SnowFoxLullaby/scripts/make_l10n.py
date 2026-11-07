#!/usr/bin/env python3
"""Writes ../l10n.js (DEMO_DESIGN_GUIDE §2.2) from lines.js + the tables below: zh subtitles, answer buttons (+ voice phrasings),
cover / side-panel texts in ja / en / zh, speaker names. Keys are taken from the page text, so edit the tables here and re-run."""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(os.path.join(ROOT, 'lines.js'), encoding='utf-8').read()
L = json.loads(src[src.index('= {') + 2:src.rindex('}') + 1])
ZH_LINES = {
    'k01': '晚上好……。你还没睡呀？', 'h01': '来啦来啦！找到你了，小夜猫子！', 'k02': '小焰，嘘……。这孩子说睡不着呢。',
    'h02': '那就比一比，看谁先哄你睡着！', 'k03': '呐……睡不着，是因为太热？还是太冷？', 'k04': '呵呵，那就先轮到我。',
    'h04': '你看吧！轮到我出场啦！', 'k05': '闭上眼睛……。听得到雪落下的声音吗？', 'k06': '呼——……。呵呵，凉凉的吗？',
    'h05': '这边的耳朵，就让我来帮你暖暖。', 'h06': '哈——……。暖乎乎的，对吧？', 'k07': '……小焰，太近了。',
    'h07': '小雪才是呢！……那，一人一半吧。', 'k08': '凉凉的……', 'h08': '暖暖的……', 'kh1': '……刚刚好，对吧？',
    'k10': '……开始困了吗？最后，想让谁陪在你身边？', 'h11a': '切——。……那，地炉的火，我帮你看到天亮。',
    'k11a': '……谢谢你。我会一直陪在你身边，直到天亮。', 'k11b': '呵呵，那我去把门关上哦。', 'h11b': '……我会紧紧抱着你，直到天亮。',
    'kh2': '晚安。'}
BUTTONS = [   # ja (as in main.js), zh, voice phrasings (None = a hold button: not voice-picked)
    ('…ちょっと、暑くて', '……有点热', ['有点热', '太热了', '好热', '热', '我觉得热', 'too warm', 'too hot', "it's hot", 'hot', '暑い', 'あつい', 'ちょっと暑い']),
    ('…ちょっと、寒くて', '……有点冷', ['有点冷', '太冷了', '好冷', '冷', '我觉得冷', 'too cold', "it's cold", 'cold', 'chilly', '寒い', 'さむい', 'ちょっと寒い']),
    ('目を閉じる（長押し）', '闭上眼睛（长按）', None),
    ('右の耳を、焔に向ける', '把右耳转向小焰', ['右耳', '把右耳给她', '转过去', '耳朵给你', '好的', 'turn my ear', 'right ear', 'here', 'okay', '右の耳', '耳をかす', 'どうぞ']),
    ('小雪、そばにいて', '小雪，陪着我', ['小雪', '雪', '选小雪', '小雪陪我', 'koyuki', 'snow', 'stay koyuki', 'こゆき', '小雪がいい']),
    ('焔、そばにいて', '小焰，陪着我', ['小焰', '焰', '选小焰', '小焰陪我', 'homura', 'fox', 'fire', 'ほむら', '焔がいい']),
    ('「おやすみ」と言う', '说「晚安」', ['晚安', '晚安啦', 'good night', 'goodnight', 'night night', 'おやすみ', 'おやすみなさい']),
]
PAGE = [   # text on the page → zh, ja, en ("" = hide in that language)
    ('MoHeat Evo · Binaural ASMR × Thermal Haptics', 'MoHeat Evo · 双耳ASMR × 冷热触感', 'MoHeat Evo · バイノーラルASMR × 温冷ハプティクス', 'MoHeat Evo · Binaural ASMR × Thermal Haptics'),
    ('A Lullaby for Two — Koyuki and Homura put you to sleep on a snowy night', '雪夜里，小雪和小焰来哄你入睡', '雪の夜、小雪と焔があなたを寝かしつけ', 'Koyuki and Homura put you to sleep on a snowy night'),
    ('🌙 寝かしつけ勝負 · Interactive', '🌙 哄睡大比拼 · 互动', '🌙 寝かしつけ勝負 · インタラクティブ', '🌙 The bedtime contest · Interactive'),
    ('❄️ 小雪の声と吐息 · cool', '❄️ 小雪的声音与气息 · 清凉', '❄️ 小雪の声と吐息 · ひんやり', "❄️ Koyuki's voice and breath · cool"),
    ('🔥 焔の声と囲炉裏 · warm', '🔥 小焰的声音与地炉 · 温暖', '🔥 焔の声と囲炉裏 · あたたか', "🔥 Homura's voice and the hearth · warm"),
    ('▶ はじめる · Start', '▶ 开始', '▶ はじめる', '▶ Start'),
    ('🎧 Left / Right check', '🎧 左右声道检查', '🎧 左右チェック', '🎧 Left / Right check'),
    ('Headphones on · tap, hold or say your answer · connect MoHeat Evo to feel a cool voice at one ear, a warm one at the other — and both on the same ear',
     '请戴上耳机 · 点按、长按或说出你的回答 · 连接 MoHeat Evo，感受一只耳朵凉、一只耳朵暖的声音——还有同一只耳朵上的冷与暖',
     'ヘッドホンを装着 · タップ・長押し・声で答えよう · MoHeat Evo をつなぐと、片耳にひんやりした声、もう片耳にあたたかい声、そして同じ耳に両方を感じられます',
     'Headphones on · tap, hold or say your answer · connect MoHeat Evo to feel a cool voice at one ear, a warm one at the other — and both on the same ear'),
    ('Koyuki and Homura are original characters · voices ElevenLabs · art: ChatGPT (OpenAI), from “Whispers of Snow and Flame”',
     '小雪和小焰是原创角色 · 配音 ElevenLabs · 美术：ChatGPT（OpenAI），沿用《雪与狐火的悄悄话》',
     '小雪と焔はオリジナルキャラクター · 声 ElevenLabs · イラスト：ChatGPT（OpenAI）、『雪と狐火のひそひそ話』より',
     'Koyuki and Homura are original characters · voices ElevenLabs · art: ChatGPT (OpenAI), from “Whispers of Snow and Flame”'),
    ('ASMR · Snowy night', 'ASMR · 雪夜', 'ASMR · 雪の夜', 'ASMR · Snowy night'),
    ('Live (DUAL): Koyuki (snow spirit) cools the ear she speaks at, Homura warms hers, both with their loudness; their breath, the hearth in front of you and the night air from the open doors add real warmth / cold.',
     '实时（DUAL）：雪精灵小雪说话的那一侧耳朵变凉，小焰说话的那一侧变暖，强弱随音量变化；她们的气息、你面前的地炉和敞开的门外吹进的夜风带来真实的冷与暖。',
     'リアルタイム（DUAL）：雪の精・小雪は話しかける側の耳を冷やし、焔は話しかける側の耳を温めます（声の大きさに合わせて）。二人の吐息、目の前の囲炉裏、開いた戸から入る夜気が、本当の冷たさ・温かさを加えます。',
     'Live (DUAL): Koyuki (snow spirit) cools the ear she speaks at, Homura warms hers, both with their loudness; their breath, the hearth in front of you and the night air from the open doors add real warmth / cold.'),
    ('🔥 焔が、朝までぽかぽか · Homura keeps you warm till morning', '🔥 小焰陪你暖暖地睡到天亮', '🔥 焔が、朝までぽかぽか', '🔥 Homura keeps you warm till morning'),
    ('❄️ 小雪が、朝までそばに · Koyuki stays by you till morning', '❄️ 小雪陪在你身边直到天亮', '❄️ 小雪が、朝までそばに', '❄️ Koyuki stays by you till morning'),
    ('↺ もう一度 · Play again', '↺ 再来一次', '↺ もう一度', '↺ Play again'),
    ('小雪 · 焔 ElevenLabs', '小雪 · 小焰 ElevenLabs', '小雪 · 焔 ElevenLabs', 'Koyuki · Homura ElevenLabs'),
    # the place shown on the radar card (main.js PLACE)
    ('a snowy night · your room', '雪夜 · 你的房间', '雪の夜 · あなたの部屋', 'a snowy night · your room'),
    ('Koyuki & Homura arrive', '小雪和小焰来了', '小雪と焔がやってきた', 'Koyuki & Homura arrive'),
    ('by the hearth', '地炉边', '囲炉裏のそば', 'by the hearth'),
    ('Koyuki · left ear', '小雪 · 左耳', '小雪 · 左耳', 'Koyuki · left ear'),
    ('Homura · right ear', '小焰 · 右耳', '焔 · 右耳', 'Homura · right ear'),
    ('both · left ear', '两人 · 左耳', '二人 · 左耳', 'both · left ear'),
    ('Koyuki left · Homura right', '小雪在左 · 小焰在右', '小雪は左 · 焔は右', 'Koyuki left · Homura right'),
]
zh = {L[k][0]: v for k, v in ZH_LINES.items()}
missing = set(L) - set(ZH_LINES)
if missing: raise SystemExit(f'no zh for {sorted(missing)}')
zh.update({ja: z for ja, z, _ in BUTTONS})
ja_t, en_t = {}, {}
for k, z, j, e in PAGE: zh[k] = z; ja_t[k] = j; en_t[k] = e
out = {'langs': ['en', 'ja', 'zh'], 'text': {'zh': zh, 'ja': ja_t, 'en': en_t},
       'names': {'小雪': {'en': 'Koyuki', 'zh': '小雪'}, '焔': {'en': 'Homura', 'zh': '小焰'}, '小雪・焔': {'en': 'Koyuki & Homura', 'zh': '小雪・小焰'}},
       'voice': {'all': {ja: [z] + v for ja, z, v in BUTTONS if v}}}
HDR = ('// Languages of this demo for ../../shared/subs.js (subtitles, answers, cover) and ../../shared/voice.js (voice answers).\n'
       '// Generated by scripts/make_l10n.py — edit the tables there and re-run (keys must stay byte-identical to the page text, §2.2).\n')
open(os.path.join(ROOT, 'l10n.js'), 'w', encoding='utf-8').write(HDR + 'window.MOHEAT_L10N = ' + json.dumps(out, ensure_ascii=False, indent=1) + ';\n')
print('l10n.js:', len(zh), 'zh strings,', len(out['voice']['all']), 'voice answers')
