#!/usr/bin/env python3
"""THE script of Demo50 『なつやすみ、じいちゃんちの すいかわり』 (Summer at Grandpa's: Watermelon Split, healing ⑧, proposal G1) — tagged
Japanese (ElevenLabs, the confirmed hana / gen voices; their countryside dialect 〜じゃ / 〜けえ / 〜じゃろ) + English + 中文, story as data.
`python3 scripts/script_data.py` → ../lines.js (window.SUIKA_LINES), project/zh_lines.json, ../l10n.js.

Who: H = ばあちゃん (hana), G = じいちゃん (gen). User picks: grandma C (housedress + white apron + uchiwa), grandpa A (jinbei + straw hat).
Story (≈ 2:40): 1 バス停 (noon heat; grandma's cold wet towel on the LEFT of your neck) · 2 小川 (grandpa lifts the watermelon out of the river,
splash from the RIGHT, the cold melon held to your right cheek) · 3 すいかわり (blindfolded: the screen goes dark; grandpa calls from the
melon's side, grandma teases from the other side; turn, walk, hold to swing — 3 tries) · 4 縁側の夕方 (eating, a seed-spitting contest;
grandma fans you with the uchiwa on your LEFT while telling a story at your left ear = cool puffs + warm voice on one ear) · 5 夜の田んぼ
(fireflies; mosquito net, the fan; goodnights)."""
import json, os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

L = {
    'h01': ('H', '[warmly] よう来たねえ！ あつかったじゃろ。 ほれ、つめたかろう？', "You made it! It's hot, isn't it. There — nice and cold?", '你来啦！很热吧。来，凉不凉？'),
    'h02': ('H', '[softly] 井戸水で しぼった てぬぐいよ。 くびすじ、ひやしときんさい。', "A towel wrung out in well water. Cool your neck with it.", '用井水拧的毛巾哦。贴在脖子上凉一凉。'),
    'g01': ('G', '[laughs] わっはっは！ 来たか来たか！ じいちゃんはのう、川で すいか 冷やしとるんじゃ！', "Ha ha ha! You're here, you're here! Grandpa's cooling a watermelon in the river!", '哈哈哈！来啦来啦！爷爷在河里冰着西瓜呢！'),
    'g02': ('G', '[excited] よいしょお！ ほれ、見てみい、この でっかいの！', "Heave-ho! Look at this, look how big!", '嘿哟！来，看看，这么大一个！'),
    'g03': ('G', '[proud] どうじゃ、つめたいじゃろ！ ほっぺに ぴたーっと！', "How's that, cold, eh? Right on your cheek!", '怎么样，冰吧！贴在脸上——！'),
    'h03': ('H', '[laughs] これ、じいちゃん。 びっくりしよるがね。', "Now, Grandpa. You'll give them a fright.", '哎呀，老头子。会吓到孩子的。'),
    'g04': ('G', '[excited] よーし、すいかわりじゃ！ てぬぐいで 目かくし しての。', "Right, watermelon splitting! Blindfold on with the towel.", '好——，劈西瓜啦！用毛巾蒙上眼睛。'),
    'g05': ('G', '[shouting] もうちょい みぎじゃ！ みぎ、みぎ！', "A bit more to the right! Right, right!", '再往右一点！右边，右边！'),
    'h04': ('H', '[playful] ひだりよ〜。 ばあちゃんの ほうじゃけえ〜。', "Left~. This way, to Grandma~.", '左边哟～。到奶奶这边来～。'),
    'g06': ('G', '[shouting] まっすぐじゃ！ そこじゃ、ふりおろせえ！', "Straight ahead! There — swing!", '直走！就是那儿，劈下去！'),
    'g07': ('G', '[laughs] わっはっは！ おしい、おしい！ もういっかいじゃ！', "Ha ha ha! So close! One more time!", '哈哈哈！可惜可惜！再来一次！'),
    'g08': ('G', '[excited] パカーッと いったのう！ ようやった！', "Split it clean in two! Well done!", '啪——地劈开了！干得好！'),
    'h05': ('H', '[softly] さあさ、たべんさい。 たねは にわに とばしてええけえね。', "Come, eat up. You can spit the seeds into the garden.", '来来，吃吧。籽可以吐到院子里哦。'),
    'g09': ('G', '[proud] たね とばしなら、じいちゃんは 村いちばんじゃ！', "At seed-spitting, Grandpa's the best in the village!", '要说吐西瓜籽，爷爷可是村里第一！'),
    'h06': ('H', '[softly] …ほれ、あおいであげようね。 ぱたぱた。', "…Here, let me fan you. Flap, flap.", '…来，奶奶给你扇扇。啪嗒啪嗒。'),
    'h07': ('H', '[whispers] …じいちゃんはね、わかいころ、すいかわりで 一回も 当たらんかったんよ。 …ないしょじゃけえね。', "…You know, when Grandpa was young, he never once hit the melon. …That's our secret.", '…告诉你哦，爷爷年轻的时候，劈西瓜一次都没劈中过。…要保密哦。'),
    'g10': ('G', '[annoyed] ばあさん、なんか いうたか！', "Granny, did you say something?!", '老太婆，你说什么了！'),
    'h08': ('H', '[laughs] なーんも。 ふふふ。', "Nothing at all. Hehehe.", '什——么都没有。呵呵呵。'),
    'g11': ('G', '[softly] …ほれ、見てみい。 ほたるじゃ。', "…Look there. Fireflies.", '…你看。是萤火虫。'),
    'g12': ('G', '[softly] てのひらで そーっと つつんでみい。 …つぶさんようにの。', "Cup one gently in your hands. …Don't squash it.", '用手心轻轻地捧住。…别捏坏了。'),
    'h09': ('H', '[softly] かやの なかは すずしいよ。 せんぷうき、まわしとくけえね。', "It's cool inside the mosquito net. I'll leave the fan running.", '蚊帐里很凉快哦。电风扇给你开着。'),
    'h10': ('H', '[whispers] …ええ ゆめ みんさいよ。 おやすみ。', "…Sweet dreams. Good night.", '…做个好梦。晚安。'),
    'g13': ('G', '[whispers] …あしたも あそぼうな。 おやすみ。', "…Let's play again tomorrow. Good night.", '…明天也一起玩吧。晚安。'),
}
SAY = {'井戸水': 'いどみず', '村': 'むら'}
STEPS = [
    {'id': 'bus', 'ja': 'バス停', 'en': 'The bus stop', 'zh': '公交站', 'beats': [['@heat'], ['h01', 'near'], ['@towel_left'], ['h02', 'left_ear'],
        {'type': 'choice', 'options': [{'ja': 'ただいま！', 'en': "I'm home!", 'zh': '我回来了！'}, {'ja': 'あつ〜い！', 'en': "So hot!", 'zh': '好热～！'}]}]},
    {'id': 'river', 'ja': '小川', 'en': 'The stream', 'zh': '小河', 'beats': [['@river'], ['g01', 'front'], ['@splash_right'], ['g02', 'right'], ['@melon_right'], ['g03', 'right_ear'], ['h03', 'left']]},
    {'id': 'suika', 'ja': 'すいかわり', 'en': 'Watermelon split', 'zh': '劈西瓜', 'beats': [['@yard'], ['g04', 'front'], ['@blindfold'], ['g05', 'right'], ['h04', 'left'],
        {'type': 'hold', 'ja': 'ふりおろす（長押し）', 'en': 'Swing (press and hold)', 'zh': '劈下去（长按）', 'secs': 2, 'let_go': ['g07']}, ['g06', 'front'], ['g08', 'front']]},
    {'id': 'engawa', 'ja': '縁側の夕方', 'en': 'Evening on the veranda', 'zh': '傍晚的檐廊', 'beats': [['@evening'], ['h05', 'near'], ['g09', 'right'], ['@fan_left'], ['h06', 'left_ear'], ['h07', 'left_ear'], ['g10', 'right'], ['h08', 'left_ear'],
        {'type': 'say', 'ja': '「ありがとう」', 'en': '"Thank you"', 'zh': '「谢谢」'}]},
    {'id': 'night', 'ja': '夜の田んぼ', 'en': 'Rice fields at night', 'zh': '夜晚的稻田', 'beats': [['@night'], ['g11', 'near'], ['g12', 'near'],
        {'type': 'hold', 'ja': 'ほたるを つつむ（長押し）', 'en': 'Cup the firefly (press and hold)', 'zh': '捧住萤火虫（长按）', 'secs': 3}, ['@net'], ['h09', 'near'],
        {'type': 'choice', 'ending': True, 'options': [{'ja': '夏休みの日記に書くね', 'en': "I'll write it in my summer diary", 'zh': '我会写进暑假日记里'}, {'ja': 'あしたも遊ぼう', 'en': "Let's play tomorrow too", 'zh': '明天也一起玩吧'}]},
        ['h10', 'left_ear'], ['g13', 'right_ear']]},
]
VOICE = {'all': {'ただいま！': ['我回来了', '回来了', "i'm home", "i'm back", 'ただいま'], 'あつ〜い！': ['好热', '热死了', 'so hot', "it's hot", 'あつい'],
                 '「ありがとう」': ['谢谢', '谢谢奶奶', 'thank you', 'thanks', 'ありがとう'],
                 '夏休みの日記に書くね': ['写进日记', '日记', 'diary', 'write it in my diary', 'にっき'], 'あしたも遊ぼう': ['明天也玩', '明天一起玩', 'play tomorrow', 'tomorrow', 'あした']}}
NAMES = {'ばあちゃん': {'en': 'Grandma', 'zh': '奶奶'}, 'じいちゃん': {'en': 'Grandpa', 'zh': '爷爷'}}
strip = lambda s: re.sub(r'\s+', ' ', re.sub(r'\[[^\]]*\]', '', s)).strip()


def spoken(tagged, lang='ja', lid=None):
    if lang == 'ja':
        for k, v in SAY.items(): tagged = tagged.replace(k, v)
        return tagged
    who, ja, en, zh = L[lid]; tags = re.findall(r'^\[[^\]]*\]', ja)
    return ((tags[0] + ' ') if tags else '') + (en if lang == 'en' else zh)


if __name__ == '__main__':
    used = set()
    for s in STEPS:
        for b in s['beats']:
            if isinstance(b, dict): used.update(b.get('let_go', []))
            elif not b[0].startswith('@'): used.add(b[0])
    assert not used - set(L), used - set(L)
    lines = {k: [strip(v[1]), v[2], v[0]] for k, v in L.items()}
    open(os.path.join(ROOT, 'lines.js'), 'w', encoding='utf-8').write(
        "// 『なつやすみ、じいちゃんちの すいかわり』 lines id → [ja, en, who] (H ばあちゃん · G じいちゃん) + steps. GENERATED by scripts/script_data.py.\n"
        "window.SUIKA_LINES = " + json.dumps({'who': {'H': 'ばあちゃん', 'G': 'じいちゃん'}, 'lines': lines, 'steps': STEPS}, ensure_ascii=False, indent=1) + ";\n")
    zh = {strip(v[1]): v[3] for v in L.values()}
    json.dump(zh, open(os.path.join(ROOT, 'project', 'zh_lines.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    ui = {}
    for s in STEPS:
        ui[s['ja']] = s['zh']
        for b in s['beats']:
            if isinstance(b, dict):
                if 'ja' in b: ui[b['ja']] = b['zh']
                for o in b.get('options', []): ui[o['ja']] = o['zh']
    for k, v in NAMES.items(): ui[k] = v['zh']
    open(os.path.join(ROOT, 'l10n.js'), 'w', encoding='utf-8').write(
        "// Languages of this demo (pre-production: lines + answers + names + voice phrasings). GENERATED by scripts/script_data.py.\n"
        "window.MOHEAT_L10N = " + json.dumps({'langs': ['en', 'ja', 'zh'], 'text': {'zh': {**zh, **ui}, 'ja': {}, 'en': {}}, 'names': NAMES, 'voice': VOICE}, ensure_ascii=False, indent=1) + ";\n")
    print(len(L), 'lines,', sum(len(strip(v[1])) for v in L.values()), 'ja chars')
