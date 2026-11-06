"""《星光偶像的特别见面会》 Your Special Idol Fan Meeting — single source of truth (timeline).

Two thermal sources with their OWN positions:
  "A" = Ayane's voice (lines, whispers, laughs, song, warm breaths)  → HEAT, follows Ayane
  "C" = cooling SFX (fan flaps, big swishes, ice clinks, fizz, cool breath, cool magic) → COOL, follows each cue's spot
So she can talk into the right ear while fanning the left ear (left cool + right heat at the same time).

Coordinates: az degrees (0 front, −90 left ear, +90 right ear, unwrapped in key-frames), d metres from head centre.
"""
import numpy as np

DURATION = 150.0
SR = 48000

CHARACTERS = {   # Kyoko fallback only (VOICEVOX is the real voice)
    "A": {"name_ja": "綾音", "name_en": "Ayane", "name_zh": "绫音", "voice": "Kyoko", "rate": 175, "pitch": 1.12, "whisper_rate": 155},
}
VOICE = dict(speaker="ずんだもん", speed=1.0, pitch=0.0, inton=1.0, pause=0.32, tone=None,   # her original voice: no pitch / intonation / EQ changes
             styles=dict(default="ノーマル", smile="ノーマル", happy="ノーマル", laugh="ノーマル", shy="ノーマル", playful="ノーマル",
                         smug="ノーマル", curious="ノーマル", surprise="ノーマル", determined="ノーマル",
                         whisper="ささやき", sleepy="ささやき", sing="ノーマル"))

SCENES = [  # (t, no, ja, zh, en)
    (0.0, "1", "アイドル登場", "偶像登场", "Idol entrance"),
    (25.0, "2", "ないしょ話", "贴耳悄悄话", "A secret, just for you"),
    (50.0, "3", "ひんやりサプライズ", "清凉小惊喜", "A cool surprise"),
    (75.0, "4", "どっちでしょうゲーム", "左右耳猜位置游戏", "Left or right?"),
    (105.0, "5", "キミだけのミニライブ", "专属小表演", "A mini live for you"),
    (130.0, "6", "またね", "温柔告别", "See you again"),
]


def L(t, kind, ja="", zh="", en="", expr="smile", tts=None, pose=None, **kw):
    c = dict(t=t, kind=kind, ja=ja, zh=zh, en=en, expr=expr, tts=tts or ja, pose=pose)
    c.update(kw); return c


# kind: say / whisper / warm (breath) ......................... HEAT (Ayane)
#       fan / swish / ice / coolbreath / magic .................. COOL (own az/d; az1 = end of a sweep)
#       sing (melody phrase) ....................................... HEAT
#       jingle / bgm / steps ....................................... neither (music / foley)
CUES = [
    # ── 1  0:00–0:25  Idol entrance: far → left ear → right ear ──────────────────
    L(0.4, "jingle", dur=4.0),
    L(2.0, "steps", dur=3.6),
    L(3.0, "say", "はーい！ みんな、おまたせ〜！", "大家久等啦～！", "Hi everyone, sorry to keep you waiting~!", "happy", pose="run"),
    L(6.4, "say", "…あれ？ もう来てくれてたの？", "…诶？你已经来啦？", "…Huh? You're already here?", "curious",
      tts="…あれ？ もうきてくれてたの？", pose="peek"),
    L(9.6, "say", "えへへ、うれしいな。今日はキミだけの、特別なファンミーティングだよ！", "嘿嘿，好开心。今天是只属于你的特别见面会哦！",
      "Ehehe, I'm so happy. Today is a special fan meeting just for you!", "happy",
      tts="えへへ、うれしいな。きょうはキミだけの、とくべつなファンミーティングだよ！", pose="wave"),
    L(15.8, "whisper", "こっちの耳から…こんにちは。", "从这边的耳朵…你好呀。", "Hello… from this ear.", "whisper", tts="こっちのみみから…こんにちは。"),
    L(19.0, "warm", "（はぁ…）", "（哈…）", "(haa…)", "whisper", dur=1.4, gain=0.9),
    L(22.2, "say", "こっちからも、こんにちは〜！", "这边也，你好～！", "And hello from this side too~!", "playful"),

    # ── 2  0:25–0:50  Secret whisper: left whisper → dash → right, louder ─────────
    L(25.8, "say", "ねえねえ…キミにだけ、ひみつ教えてあげる。", "呐呐…只告诉你一个秘密哦。", "Hey hey… I'll tell you a secret. Just you.", "shy",
      tts="ねえねえ…キミにだけ、ひみつおしえてあげる。"),
    L(31.0, "whisper", "じつはね…今日のステージ、すっごく緊張してたの。", "其实呀…今天的舞台，我超紧张的。", "Actually… I was super nervous about today's stage.", "whisper",
      tts="じつはね…きょうのステージ、すっごくきんちょうしてたの。"),
    L(35.9, "whisper", "でも、キミの顔を見たら…ぜんぶ忘れちゃった。", "可是看到你的脸…就全忘掉了。", "But when I saw your face… I forgot all about it.", "shy",
      tts="でも、キミのかおをみたら…ぜんぶわすれちゃった。"),
    L(39.8, "whisper", "ふふっ。", "呵呵。", "Hehe.", "happy"),
    L(42.4, "say", "だから今日は、キミのためだけに歌っちゃうね！", "所以今天，我只为你一个人唱歌！", "So today, I'll sing just for you!", "happy",
      tts="だからきょうは、キミのためだけにうたっちゃうね！"),
    L(46.4, "whisper", "…ないしょだよ？", "…要保密哦？", "…It's our secret, okay?", "playful"),
    L(48.2, "say", "えへへ。", "嘿嘿。", "Ehehe.", "happy"),

    # ── 3  0:50–1:15  Cool surprise: fan left → fan right → iced drink (both) ─────
    L(50.6, "say", "ふぅ…ステージのライト、ちょっと暑いね。", "呼…舞台的灯光有点热呢。", "Phew… the stage lights are kinda hot.", "smile",
      tts="ふぅ…ステージのライト、ちょっとあついね。"),
    L(54.4, "say", "そうだ！ 扇いであげる！", "对了！我来帮你扇扇风！", "I know! Let me fan you!", "happy", tts="そうだ！ あおいであげる！", pose="fan"),
    L(56.4, "fan", dur=4.6, az=-86, d=0.2, gain=1.0),
    L(58.2, "say", "パタパタ〜。すずしい？", "啪嗒啪嗒～凉快吗？", "Flap, flap~ Nice and cool?", "smile", pose="fan"),
    L(61.6, "fan", dur=4.4, az=86, d=0.2, gain=1.0),
    L(63.0, "say", "こっちも、パタパタ〜。", "这边也，啪嗒啪嗒～", "This side too, flap, flap~", "playful", pose="fan"),
    L(66.6, "say", "それから…じゃーん！ つめた〜いドリンク！", "然后…铛铛～！冰冰凉的饮料！", "And then… ta-da! An ice-cold drink!", "happy",
      tts="それから…じゃーん！ つめたーいドリンク！", pose="drink"),
    L(69.8, "ice", dur=2.8, az=0, d=0.26, gain=1.0),
    L(72.8, "say", "はい、どうぞ。…カランって、いい音でしょ？", "给，请用。…冰块咔啷一声，很好听吧？", "Here you go. …Hear that clink? Nice, right?", "smile",
      tts="はい、どうぞ。…カランって、いいおとでしょ？", pose="drink"),

    # ── 4  1:15–1:45  Left or right? (the main thermal showcase) ──────────────────
    L(76.7, "say", "じゃあ次は…どっちから話しかけるか、当てるゲーム！", "接下来…猜猜我从哪边跟你说话的游戏！", "Next… a game! Guess which side I'll talk from!", "happy",
      tts="じゃあつぎは…どっちからはなしかけるか、あてるゲーム！", pose="wave"),
    L(79.6, "steps", dur=1.4),
    L(81.2, "whisper", "…右でした♪", "…是右边哦♪", "…Right side ♪", "playful", tts="…みぎでした。"),
    L(82.9, "swish", dur=1.1, az=-86, d=0.24, gain=1.0),            # left COOL while right HEAT decays
    L(84.4, "say", "あ、今の風は…ひみつの魔法！", "啊，刚才那阵风…是秘密魔法！", "Oh, that breeze just now… secret magic!", "playful",
      tts="あ、いまのかぜは…ひみつのまほう！"),
    L(87.3, "steps", dur=1.2),
    L(88.6, "whisper", "つぎは…ひだり。", "下一次…左边。", "Next… left.", "whisper"),
    L(90.0, "swish", dur=1.1, az=86, d=0.24, gain=1.0),             # right COOL while left HEAT
    L(91.6, "say", "ふふっ、くすぐったい？", "呵呵，痒不痒？", "Hehe, does it tickle?", "happy"),
    L(94.2, "steps", dur=1.0),
    L(95.4, "whisper", "みぎ…", "右边…", "Right…", "whisper"),
    L(96.6, "coolbreath", "（ふぅ〜）", "（呼～）", "(fuu~)", "blow", dur=1.6, az=88, d=0.18, gain=1.0),   # right: heat → cool
    L(98.4, "steps", dur=1.0),
    L(99.6, "say", "ひだり！", "左边！", "Left!", "playful"),
    L(100.4, "swish", dur=1.1, az=86, d=0.24, gain=0.95),           # right COOL while left HEAT
    L(102.2, "say", "ぜんぶ当たった？ キミ、すごーい！", "全都猜中了？你好厉害！", "Did you get them all? You're amazing!", "happy",
      tts="ぜんぶあたった？ キミ、すごーい！", pose="dance"),

    # ── 5  1:45–2:10  Mini live: song (heat) moves L → R, cool magic on the other side ─
    L(105.6, "say", "それじゃあ…キミだけのための、ミニライブ！", "那么…只为你一个人的迷你演唱会！", "And now… a mini live, just for you!", "happy", pose="sing"),
    L(108.8, "bgm", dur=22.0),
    L(110.0, "sing", "きらきら ひかる ほしのした", "闪闪发光的 星空下", "Twinkling, shining, under the stars", "sing", phrase=0, pose="sing"),
    L(115.1, "sing", "キミとの ひみつ ふたりだけ", "和你的秘密 只属于我们俩", "A secret with you, just us two", "sing", phrase=1, pose="sing"),
    L(116.8, "magic", dur=2.8, az=72, d=0.45, gain=0.9),            # right COOL while she sings left
    L(120.5, "sing", "ドキドキ とまらない", "心跳 停不下来", "My heart won't stop racing", "sing", phrase=2, pose="dance"),
    L(124.1, "sing", "このきもち とどけ キミに", "这份心意 传达给你", "This feeling — reach you", "sing", phrase=3, pose="sing"),
    L(125.2, "magic", dur=2.8, az=-72, d=0.45, gain=0.9),           # left COOL while she sings right

    # ── 6  2:10–2:30  Goodbye: left → right → fading breeze ─────────────────────
    L(130.6, "say", "…えへへ、聞いてくれて、ありがとう。", "…嘿嘿，谢谢你听我唱。", "…Ehehe, thanks for listening.", "shy", tts="…えへへ、きいてくれて、ありがとう。", pose="bow"),
    L(135.4, "whisper", "今日は、来てくれて…ほんとうにありがとう。", "今天你能来…真的谢谢你。", "Thank you so much… for coming today.", "whisper",
      tts="きょうは、きてくれて…ほんとうにありがとう。"),
    L(141.0, "whisper", "また、会いに来てね。…やくそく。", "下次也要来见我哦。…约定好了。", "Come see me again. …Promise.", "shy", tts="また、あいにきてね。…やくそく。"),
    L(144.9, "say", "ばいばい〜！", "拜拜～！", "Bye-bye~!", "happy", pose="bye"),
    L(145.8, "fan", dur=3.6, az=-40, az1=40, d=0.55, gain=0.55, fade=True),
]

# Song (original melody, C major, 100 BPM; eighth = 0.3 s). MIDI notes per mora and lengths in eighths.
EIGHTH = 0.3
SONG = [
    dict(kana="きらきら ひかる ほしのした", notes=[67, 67, 69, 67, 64, 62, 64, 60, 62, 64, 67, 64], lens=[1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 3]),
    dict(kana="キミとの ひみつ ふたりだけ", notes=[65, 64, 62, 60, 62, 64, 67, 69, 67, 65, 64, 60], lens=[1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 4]),
    dict(kana="ドキドキ とまらない", notes=[64, 64, 67, 67, 69, 69, 67, 65, 64], lens=[1, 1, 1, 1, 1, 1, 1, 1, 2]),
    dict(kana="このきもち とどけ キミに", notes=[65, 65, 64, 62, 60, 62, 64, 67, 69, 67, 72], lens=[1, 1, 1, 1, 2, 1, 1, 2, 1, 1, 5]),
]
CHORDS = ["C", "Am", "F", "G", "C", "Am", "F", "G", "C"]   # one per bar (2.4 s) from 110.0 s
BAR = 2.4

# Ayane's path (t, az_unwrapped, d)
A_KEYS = [
    (0.0, 0, 5.0), (2.0, 0, 4.5), (5.2, 0, 2.6), (8.5, -5, 2.0), (12.5, -15, 1.2), (15.0, -80, 0.3), (18.2, -88, 0.17),
    (20.4, -88, 0.18), (21.2, -180, 0.6), (22.0, -272, 0.2), (24.6, -272, 0.22),
    (25.6, -335, 0.65), (29.8, -345, 0.6), (30.8, -448, 0.17), (40.2, -448, 0.18), (41.2, -360, 0.5), (42.2, -272, 0.2), (49.0, -272, 0.22),
    (50.4, -335, 0.9), (55.4, -345, 0.8), (56.6, -410, 0.42), (60.8, -410, 0.42), (61.8, -310, 0.42), (65.8, -310, 0.42),
    (66.8, -360, 0.7), (75.0, -360, 0.8),
    (79.6, -360, 0.9), (80.4, -180 - 360, 0.7), (81.0, -272 - 360, 0.2), (86.8, -272 - 360, 0.2),
    (87.6, -360 - 360, 0.55), (88.4, -448 - 360, 0.18), (93.8, -448 - 360, 0.18),
    (94.6, -540 - 360, 0.55), (95.2, -632 - 360, 0.18), (98.0, -632 - 360, 0.18),
    (98.8, -720 - 360, 0.55), (99.4, -808 - 360, 0.2), (101.4, -808 - 360, 0.25),
    (102.4, -1080, 0.9), (105.0, -1080, 1.3), (108.8, -1080, 1.4),
    (110.4, -1130, 0.6), (113.0, -1145, 0.45), (119.6, -1140, 0.45),     # left side while singing (−65°)
    (120.6, -1080, 0.7), (122.0, -1020, 0.45), (129.2, -1015, 0.45),     # right side (+65°)
    (130.4, -1080, 0.8), (134.0, -1080, 0.75), (135.0, -1168, 0.17), (139.4, -1168, 0.18),
    (140.2, -1260, 0.6), (140.9, -1352, 0.17), (144.4, -1352, 0.2), (145.0, -1440, 0.75), (148.4, -1440, 1.0), (150.0, -1440, 2.0),
]
PRESENT = {"A": (1.6, 150.0)}


def cool_keys():
    """Key-frames for the cooling source: each cool cue sits at its own spot (optionally sweeping)."""
    ks = []
    for c in CUES:
        if c["kind"] in ("fan", "swish", "ice", "coolbreath", "magic"):
            ks.append((c["t"] - 0.05, c["az"], c["d"]))
            ks.append((c["t"] + c["dur"], c.get("az1", c["az"]), c["d"]))
    return ks


def _interp(keys, times):
    from scipy.interpolate import PchipInterpolator
    ks = sorted(keys)
    t = np.array([k[0] for k in ks]); az = np.array([k[1] for k in ks], float); d = np.array([k[2] for k in ks], float)
    a = PchipInterpolator(t, az, extrapolate=True)(np.clip(times, t[0], t[-1]))
    dd = np.clip(PchipInterpolator(t, d)(np.clip(times, t[0], t[-1])), 0.12, 8.0)
    return ((a + 180.0) % 360.0) - 180.0, dd


def positions(times):
    """{source: (az wrapped, d)} — used by the binaural renderer, the thermal controller and the player."""
    ck = cool_keys()
    # the cool source rests where the previous cue ended; linear between cues (it is silent there anyway)
    return {"A": _interp(A_KEYS, times), "C": _interp(ck, times) if ck else _interp(A_KEYS, times)}
