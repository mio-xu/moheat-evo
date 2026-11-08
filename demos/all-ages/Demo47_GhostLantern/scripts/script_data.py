#!/usr/bin/env python3
"""THE script of Demo47 『ひやっと！おばけやしきの ちょうちんばん』 (Lantern Keeper of the Spooky House, all-ages ⑤, proposal A2) — every line
(tagged Japanese for ElevenLabs + English + 中文) and the game stages as data. `python3 scripts/script_data.py` writes ../lines.js
(window.LANTERN_LINES), project/zh_lines.json and ../l10n.js; scripts/voice.py reads L (+ SAY).

Who: B = ぼんちゃん (bonchan, the talking lantern you carry: its candle is WARM), Y = ゆらり (yurari, the lonely ghost girl: special setting —
ghosts are cool; told in b03 / y02). The small ghosts (karakasa umbrella yokai, white ghost, blue will-o'-wisp) only giggle (procedural SFX).
Game (≈ 2:30, a reaction / direction game: a ghost approaching = that ear turns cool 1.5–2 s early; turn the warm lantern to it):
 1 門の前 (tutorial: one ghost slowly from the left) · 2 ろうか (left / right, faster; pick up 3 sweets) · 3 和室 (ghosts from BEHIND = both
 ears cool → hold the lantern up; false alarms = a draught + wind chime without giggles) · 4 土蔵 (screen dark: only ears and sound) ·
 5 ゆらり (she floats to your left ear and asks to play → fireworks together)."""
import json, os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

L = {
    # 1 門の前
    'b01': ('B', '[excited] やっほー！ ぼく、ちょうちんの ぼんちゃん！ きょうは きみが、ちょうちんばん だよ！', "Hiya! I'm Bon-chan the lantern! Tonight YOU are the lantern keeper!", '哈喽！我是灯笼小盆！今晚，你就是提灯守护者啦！'),
    'b02': ('B', '[playful] この おやしきの おばけはね、みーんな いたずらっこ なんだ。 こわくないよ！', "All the ghosts in this house are little pranksters. Nothing scary!", '这座宅子里的鬼呀，全都是爱恶作剧的小家伙。一点都不可怕哦！'),
    'b03': ('B', '[curious] でもね、おばけって ひんやり してるの。 ちかづくと、そっちの みみが つめたくなるよ。', "But ghosts are chilly. When one comes close, that ear goes cold.", '不过呀，鬼是凉凉的。它们一靠近，那边的耳朵就会变凉哦。'),
    'b04': ('B', '[excited] そしたら ぼくを、そっちに むけて！ ぼくの あかりは あったかいから、おばけは にげちゃうんだ！', "Then turn me that way! My light is warm, so the ghosts run away!", '那时候就把我转过去！我的光是暖的，鬼就会逃走啦！'),
    'b05': ('B', '[whispers] …ほら、ひだりの みみ。 ひやっと したでしょ？', "…There, your left ear. Felt that chill?", '…你看，左耳。是不是凉飕飕的？'),
    'b06': ('B', '[laughs] やったー！ にげてった！ そのちょうし！', "Yay! It ran off! Just like that!", '耶——！逃走啦！就是这样！'),
    # 2 ろうか
    'b07': ('B', '[excited] つぎは ろうか！ おばけが みぎから、ひだりから、どんどん くるよ！', "Next, the corridor! Ghosts from the right and the left, faster and faster!", '接下来是走廊！鬼会从右边、左边，一个接一个地来！'),
    'b08': ('B', '[happy] あっ、あめだま！ ひろって ひろって！ あと で みんなに あげよう！', "Oh, candies! Pick them up! We'll share them later!", '啊，糖果！快捡快捡！待会儿分给大家！'),
    'b09': ('B', '[surprised] わわっ、さわられちゃった！ つめたーい！ …だいじょうぶ、まだ いけるよ！', "Whoa, it touched you! So cold! …It's fine, we can still do this!", '哇哇，被碰到了！好冰——！…没事，还能继续！'),
    # 3 和室
    'b10': ('B', '[whispers] …しーっ。 ここは わしつ。 ふすまの うしろから、くることも あるんだ。', "…Shh. This is the tatami room. They sometimes come from behind the sliding doors.", '…嘘——。这里是和室。它们有时候会从隔扇后面来。'),
    'b11': ('B', '[serious] りょうほうの みみが つめたくなったら、うしろだよ！ ぼくを たかく あげて！', "If both ears go cold, it's behind you! Hold me up high!", '如果两只耳朵都变凉，就是在后面！把我举高！'),
    'b12': ('B', '[curious] …あれ？ いまの は、かぜ と ふうりん だけ かも。 わらいごえ、した？', "…Huh? That might have been just the draught and the wind chime. Did you hear giggling?", '…咦？刚才那个，可能只是风和风铃。有听到笑声吗？'),
    'b13': ('B', '[laughs] せいかい！ ただの すきまかぜ でした〜！', "Right! Just a draught~!", '答对啦！只是漏进来的风而已～！'),
    # 4 土蔵
    'b14': ('B', '[nervous] …つぎは どぞう。 まっくら だよ。 ぼくの あかり だけ。', "…Next, the old storehouse. It's pitch dark. Only my light.", '…接下来是土仓。一片漆黑哦。只有我的光。'),
    'b15': ('B', '[whispers] めを とじても いいよ。 みみで きいて、みみで かんじて。', "You can close your eyes. Listen with your ears, feel with your ears.", '闭上眼睛也没关系。用耳朵听，用耳朵感受。'),
    'b16': ('B', '[excited] すごい！ くらやみでも、ぜんぶ おいはらった！ きみ、てんさい！', "Amazing! You chased them all off in the dark! You're a genius!", '好厉害！在黑暗里也全部赶跑了！你是天才！'),
    # 5 ゆらり
    'y01': ('Y', '[softly] …あの。 …こわがらないで。 わたし、ゆらり。', "…Um. …Please don't be scared. I'm Yurari.", '…那个。…别害怕。我是悠悠。'),
    'y02': ('Y', '[whispers] …わたし、つめたいでしょ。 だから みんな、にげちゃうの。', "…I'm cold, aren't I. That's why everyone runs away.", '…我很凉吧。所以大家都会逃走。'),
    'y03': ('Y', '[whispers] …いっしょに、あそんでくれる？', "…Will you play with me?", '…可以，陪我一起玩吗？'),
    'y04a': ('Y', '[happy] …ほんと？ …うれしい。 みんなー、でておいで！', "…Really? …I'm so happy. Everyone, come out!", '…真的？…好开心。大家——，出来吧！'),
    'y04b': ('Y', '[softly] …こわく、ないの？ …ありがとう。 [happy] みんなー、でておいで！', "…You're not scared? …Thank you. Everyone, come out!", '…你不怕吗？…谢谢。大家——，出来吧！'),
    'b17': ('B', '[excited] みてみて、はなび！ おまつりの はなびが、まどから みえる！', "Look, look, fireworks! You can see the festival fireworks from the window!", '快看快看，烟花！从窗户能看到祭典的烟花！'),
    'y05': ('Y', '[whispers] …きれい。 …ちょうちんの あかりも、あったかいね。', "…Pretty. …The lantern's light is warm, too.", '…好美。…灯笼的光，也好暖和呢。'),
    'b18': ('B', '[proud] えへへ、でしょ！ …また きてね。 つぎの なつも、ちょうちんばん！', "Ehehe, right?! …Come again. Next summer, you're the lantern keeper too!", '嘿嘿，对吧！…还要再来哦。明年夏天，也是提灯守护者！'),
    'y06': ('Y', '[whispers] …またね。', "…See you.", '…下次见。'),
    # small reactions (reused by the game)
    'b19': ('B', '[shouting] ひだり！', "Left!", '左边！'),
    'b20': ('B', '[shouting] みぎ！', "Right!", '右边！'),
    'b21': ('B', '[shouting] うしろ！', "Behind!", '后面！'),
    'b22': ('B', '[cheerful] ナイス！', "Nice!", '漂亮！'),
}
SAY = {'土蔵': 'どぞう', '和室': 'わしつ'}
STAGES = [
    {'id': 'gate', 'ja': '門の前', 'en': 'At the gate', 'zh': '大门前', 'lines': ['b01', 'b02', 'b03', 'b04', 'b05'], 'ghosts': [{'from': 'left', 'speed': 'slow'}], 'after': ['b06']},
    {'id': 'hall', 'ja': 'ろうか', 'en': 'The corridor', 'zh': '走廊', 'lines': ['b07'], 'ghosts': [{'from': s, 'speed': v} for s, v in [('left', 'mid'), ('right', 'mid'), ('left', 'fast'), ('right', 'fast'), ('left', 'fast'), ('right', 'fast')]],
     'sweets': 3, 'sweets_line': 'b08', 'hit_line': 'b09'},
    {'id': 'room', 'ja': '和室', 'en': 'The tatami room', 'zh': '和室', 'lines': ['b10', 'b11'], 'ghosts': [{'from': 'behind'}, {'from': 'left'}, {'from': 'false_right', 'line': 'b12', 'ok': 'b13'}, {'from': 'behind'}, {'from': 'right'}],
     'choice': {'ja_a': '風だ', 'en_a': "It's the wind", 'zh_a': '是风', 'ja_b': 'おばけだ', 'en_b': "It's a ghost", 'zh_b': '是鬼'}},
    {'id': 'kura', 'ja': '土蔵', 'en': 'The dark storehouse', 'zh': '土仓', 'lines': ['b14', 'b15'], 'dark': True, 'ghosts': [{'from': s} for s in ['left', 'right', 'behind', 'right', 'left', 'left']], 'after': ['b16']},
    {'id': 'yurari', 'ja': 'ゆらり', 'en': 'Yurari', 'zh': '悠悠', 'lines': ['y01', 'y02', 'y03'],
     'choice': {'ja_a': 'いいよ、あそぼう', 'en_a': "Sure, let's play", 'zh_a': '好啊，一起玩', 'then_a': ['y04a'], 'ja_b': 'こわくないよ', 'en_b': "I'm not scared", 'zh_b': '我不怕', 'then_b': ['y04b']},
     'after': ['b17', 'y05', 'b18', 'y06']},
]
VOICE = {'all': {
    '風だ': ['是风', '风', 'wind', "it's the wind", 'just wind', 'かぜ'], 'おばけだ': ['是鬼', '鬼', 'ghost', "it's a ghost", 'おばけ'],
    'いいよ、あそぼう': ['好啊', '一起玩', '玩吧', "let's play", 'sure', 'okay', 'あそぼう', 'いいよ'],
    'こわくないよ': ['不怕', '我不怕', '不可怕', "i'm not scared", 'not scared', "you're not scary", 'こわくない'],
}}
NAMES = {'ぼんちゃん': {'en': 'Bon-chan', 'zh': '灯笼小盆'}, 'ゆらり': {'en': 'Yurari', 'zh': '悠悠'}}
strip = lambda s: re.sub(r'\s+', ' ', re.sub(r'\[[^\]]*\]', '', s)).strip()


def spoken(tagged, lang='ja', lid=None):
    if lang == 'ja':
        for k, v in SAY.items(): tagged = tagged.replace(k, v)
        return tagged
    who, ja, en, zh = L[lid]; tags = re.findall(r'^\[[^\]]*\]', ja)
    return ((tags[0] + ' ') if tags else '') + (en if lang == 'en' else zh)


if __name__ == '__main__':
    used = {i for s in STAGES for k in ('lines', 'after') for i in s.get(k, [])} | {s.get('sweets_line') for s in STAGES} | {s.get('hit_line') for s in STAGES}
    used |= {g.get(k) for s in STAGES for g in s.get('ghosts', []) for k in ('line', 'ok')} | {i for s in STAGES for i in s.get('choice', {}).get('then_a', []) + s.get('choice', {}).get('then_b', [])}
    used.discard(None); assert not used - set(L), used - set(L)
    lines = {k: [strip(v[1]), v[2], v[0]] for k, v in L.items()}
    open(os.path.join(ROOT, 'lines.js'), 'w', encoding='utf-8').write(
        "// 『ひやっと！おばけやしきの ちょうちんばん』 lines id → [ja, en, who] (B ぼんちゃん · Y ゆらり) + game stages. GENERATED by scripts/script_data.py.\n"
        "window.LANTERN_LINES = " + json.dumps({'who': {'B': 'ぼんちゃん', 'Y': 'ゆらり'}, 'lines': lines, 'stages': STAGES}, ensure_ascii=False, indent=1) + ";\n")
    zh = {strip(v[1]): v[3] for v in L.values()}
    json.dump(zh, open(os.path.join(ROOT, 'project', 'zh_lines.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    ui = {}
    for s in STAGES:
        ui[s['ja']] = s['zh']
        c = s.get('choice')
        if c: ui[c['ja_a']] = c['zh_a']; ui[c['ja_b']] = c['zh_b']
    for k, v in NAMES.items(): ui[k] = v['zh']
    open(os.path.join(ROOT, 'l10n.js'), 'w', encoding='utf-8').write(
        "// Languages of this demo (pre-production: lines + answers + names + voice phrasings). GENERATED by scripts/script_data.py.\n"
        "window.MOHEAT_L10N = " + json.dumps({'langs': ['en', 'ja', 'zh'], 'text': {'zh': {**zh, **ui}, 'ja': {}, 'en': {}}, 'names': NAMES, 'voice': VOICE}, ensure_ascii=False, indent=1) + ";\n")
    print(len(L), 'lines,', sum(len(strip(v[1])) for v in L.values()), 'ja chars')
