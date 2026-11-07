"""《未来の酒と、安土の夜》 Future Whisky at Azuchi — single source of truth (script + timeline).

You have slipped back 400 years into Azuchi Castle with three bottles of modern Suntory whisky.
Same cast, art and voices as the Sengoku banquet demo:
  N = Oda Nobunaga  — front-LEFT  (his voice → mostly L_Heat)
  I = Tokugawa Ieyasu — front-RIGHT (his voice → mostly R_Heat)
  Y = you — subtitles only, no voice
Cold sources (each at its own side, usually the side of the lord who is NOT speaking):
  ice in a rocks glass, highball fizz, a chilled glass held to your ear → COOL
Left/right alternation is the point: heat and cool swap sides many times.

Every line defines speaker, emotion, delivery, position and addressee (always you unless noted).
Coordinates: az degrees (0 front, −90 left ear, +90 right ear), d metres from head centre.
"""
import numpy as np

DURATION = 150.0
SR = 48000

TITLE = {"ja": "未来の酒と、安土の夜", "en": "Future Whisky at Azuchi"}
SCENES = [  # (t, no, ja, en)
    (0.0, "一", "未来からの客人", "A guest from the future"),
    (21.0, "二", "山崎 ― ロックで", "Yamazaki, on the rocks"),
    (50.3, "三", "白州 ― ハイボール", "Hakushu, as a highball"),
    (80.0, "四", "響 ― 左右で利き酒", "Hibiki, left and right"),
    (114.8, "五", "未来への乾杯", "A toast to the future"),
    (133.0, "六", "また、いつか", "Until next time"),
]
NAMES = {"N": {"ja": "信長", "en": "Nobunaga"}, "I": {"ja": "家康", "en": "Ieyasu"}, "Y": {"ja": "あなた", "en": "You"}}


def L(t, who, kind, ja="", en="", emo="calm", tts=None, to="you", tone="", **kw):
    c = dict(t=t, who=who, kind=kind, ja=ja, en=en, emo=emo, tts=tts or ja, to=to, tone=tone)
    c.update(kw); return c


def Y(t, ja, en, dur=3.0):   # your own line: subtitle only, no voice
    return L(t, "Y", "you", ja, en, dur=dur)


# kind: say / whisper / laugh  (N, I voices → HEAT)   you (subtitle only)
#       ice / fizz / chill      (C → COOL at az; az1 = end of a sweep)
#       pour / clink / cork / koto (foley & music, no thermal)
#       bottle                  (visual: which bottle is on the tray)
CUES = [
    # ── 一  0:00–0:21  A guest from the future ───────────────────────────────────────────
    L(0.3, "-", "koto", dur=18.0),
    Y(1.4, "……ここは、安土城？", "…Is this Azuchi Castle?", 2.6),
    L(4.2, "N", "say", "ほう、妙な身なりの客人じゃな。", "Hoh — a guest in strange clothes.", "proud",
      tts="ほう、みょうな、みなりの、きゃくじんじゃな。", tone="amused, sizing you up", pose="sit"),
    L(8.4, "I", "say", "どちらから、参られた？", "Where have you come from?", "polite",
      tts="どちらから、まいられた？", tone="gentle, curious"),
    Y(11.6, "四百年後の未来から。お土産に、お酒を持ってきました。", "From 400 years in the future. I brought you some drinks.", 3.4),
    L(15.2, "N", "say", "未来の酒とな！ 面白い、見せてみよ！", "Drink from the future? Splendid — show me!", "excited",
      tts="みらいの、さけとな！ おもしろい、みせてみよ！", tone="delighted, leaning forward", pose="invite"),
    L(18.9, "I", "laugh", "ほっほっほ。", "Ho ho ho.", "chuckle", tts="ほっほっほ"),

    # ── 二  0:21–0:47  Yamazaki on the rocks — ice LEFT, then Nobunaga warms the LEFT ear ──────
    L(21.0, "-", "bottle", name="yamazaki", dur=29.3),
    Y(21.2, "まずは『山崎』。京の山崎で造られたウイスキーです。", "First, Yamazaki — whisky made at Yamazaki, near Kyoto.", 3.4),
    L(22.4, "-", "cork", dur=.6),
    L(23.2, "-", "pour", dur=2.0),
    L(24.6, "C", "ice", dur=3.6, az=-80, d=0.32, gain=1.0),             # ice for Nobunaga's glass, LEFT
    L(24.8, "I", "say", "ほう…琥珀色に、透きとおっておる。", "Oh… amber, and clear as glass.", "surprise",
      tts="ほう…こはくいろに、すきとおっておる。", tone="admiring, from his seat (RIGHT warm vs LEFT ice)"),
    L(29.4, "N", "say", "山崎…天王山の麓か。どれ。", "Yamazaki… the foot of Mount Tennō. Let's see.", "proud",
      tts="やまざき…てんのうざんの、ふもとか。どれ。", tone="raising the glass", pose="sit"),
    L(34.4, "N", "whisper", "…む。甘い香りが、鼻に抜けるぞ。", "…Mm. A sweet scent, right through the nose.", "whisper",
      tts="…む。あまい、かおりが、はなにぬけるぞ。", tone="close at your LEFT ear, savouring"),
    L(37.0, "C", "chill", dur=2.6, az=84, d=0.25, gain=.9),              # Ieyasu's cold glass by your RIGHT ear
    L(39.0, "N", "laugh", "はっはっは！", "Ha ha ha!", "laugh", tts="はっはっはっはっは", pose="laugh"),
    L(40.8, "N", "say", "喉が熱い！ じゃが、うまい！ 気に入ったぞ！", "My throat's on fire — and it's delicious! I like it!", "excited",
      tts="のどが、あつい！ じゃが、うまい！ きにいったぞ！", tone="loud, delighted"),
    L(45.6, "I", "say", "わしにも、一杯いただけますかな。", "Might I have a glass as well?", "polite",
      tts="わしにも、いっぱい、いただけますかな。", tone="eager but polite", pose="offer"),

    # ── 三  0:47–1:16  Hakushu highball — fizz RIGHT for Ieyasu, Nobunaga warm LEFT ────────────
    L(50.3, "-", "bottle", name="hakushu", dur=29.7),
    Y(50.5, "家康様には『白州』を。森の水で造った、爽やかな一本です。", "For you, Lord Ieyasu: Hakushu — fresh, made with forest water.", 3.6),
    L(52.2, "-", "pour", dur=1.6),
    L(53.4, "C", "fizz", dur=5.2, az=82, d=0.3, gain=1.0),              # highball fizz, RIGHT
    L(54.3, "N", "say", "なんじゃ、その泡は。", "What are those bubbles?", "tease",
      tts="なんじゃ、その、あわは。", tone="curious, from the LEFT while the RIGHT fizzes", to="I"),
    Y(56.9, "炭酸で割った『ハイボール』です。", "It's a highball — whisky with soda.", 2.6),
    L(59.8, "I", "whisper", "…おお、冷たい。若葉の香りじゃ。", "…Oh, so cold. It smells of young leaves.", "whisper",
      tts="…おお、つめたい。わかばの、かおりじゃ。", tone="at your RIGHT ear, pleasantly surprised"),
    L(66.0, "C", "chill", dur=3.0, az=-82, d=0.28, gain=.9),            # Nobunaga grabs the cold glass, LEFT
    L(66.2, "I", "say", "これは良い。夏の陣中に欲しいものじゃ。", "Excellent. I'd want this on a summer campaign.", "calm",
      tts="これはよい。なつのじんちゅうに、ほしいものじゃ。", tone="warm, appreciative"),
    L(72.4, "N", "whisper", "家康ばかり、ずるいぞ。わしにも寄越せ。", "Not fair, Ieyasu hogging it. Hand it here.", "whisper",
      tts="いえやすばかり、ずるいぞ。わしにも、よこせ。", tone="playful, at your LEFT ear"),
    L(72.8, "C", "ice", dur=2.8, az=80, d=0.32, gain=1.0),              # ice into Ieyasu's glass, RIGHT
    L(77.4, "N", "laugh", "ははっ！", "Ha!", "laugh", tts="はっはっは", n=3),
    L(78.4, "I", "laugh", "ほっほっほ。", "Ho ho ho.", "chuckle", tts="ほっほっほ"),

    # ── 四  1:16–1:48  Hibiki, tasted at your ears in turn: L warm / R cool ↔ R warm / L cool ─────
    L(80.0, "-", "bottle", name="hibiki_glass", dur=34.8),
    Y(80.2, "最後は『響』。いろいろな原酒を、ひとつに調和させたお酒です。", "Last, Hibiki — many whiskies blended into one harmony.", 3.6),
    L(82.0, "-", "pour", dur=1.8),
    L(84.0, "N", "say", "調和、か。天下も、かくありたいものよ。", "Harmony, eh. That's how I want the realm to be.", "proud",
      tts="ちょうわ、か。てんかも、かく、ありたいものよ。", tone="thoughtful pride", pose="sit"),
    L(89.0, "I", "say", "まことに。さあ、利いてみましょう。", "Truly. Come — let us taste it.", "calm",
      tts="まことに。さあ、きいてみましょう。", tone="smiling"),
    L(93.6, "C", "chill", dur=2.6, az=84, d=0.25, gain=.9),             # R cool …
    L(94.0, "N", "whisper", "…蜜のようじゃ。", "…Like honey.", "whisper", tts="…みつのようじゃ。", tone="LEFT ear"),
    L(96.2, "C", "chill", dur=2.6, az=-84, d=0.25, gain=.9),            # … L cool
    L(96.6, "I", "whisper", "…花の香りが、いたしますな。", "…It smells of flowers.", "whisper", tts="…はなの、かおりが、いたしますな。", tone="RIGHT ear"),
    L(100.8, "C", "chill", dur=2.6, az=84, d=0.25, gain=.9),             # R cool …
    L(101.2, "N", "whisper", "…後から、ぽっと温かい。", "…and then a warm glow.", "whisper", tts="…あとから、ぽっと、あたたかい。", tone="LEFT ear"),
    L(104.2, "C", "chill", dur=2.6, az=-84, d=0.25, gain=.9),            # … L cool
    L(104.6, "I", "whisper", "…余韻が、長う残りまする。", "…and the finish lingers long.", "whisper", tts="…よいんが、ながう、のこりまする。", tone="RIGHT ear"),
    L(109.4, "N", "laugh", "はっはっは！", "Ha ha ha!", "laugh", tts="はっはっはっはっは", pose="laugh"),
    L(110.4, "I", "laugh", "ほっほっほ。", "Ho ho ho.", "chuckle", tts="ほっほっほ"),
    L(111.6, "N", "say", "見事じゃ！ 未来の酒、天晴れ！", "Magnificent! Future drink — well done!", "excited",
      tts="みごとじゃ！ みらいのさけ、あっぱれ！", tone="triumphant"),

    # ── 五  1:48–2:10  A toast to the future ─────────────────────────────────────────────────
    L(114.8, "-", "bottle", name="hibiki_tray", dur=35.2),
    Y(115.0, "気に入っていただけて、よかった。", "I'm so glad you like it.", 2.6),
    L(117.8, "N", "say", "未来の者は、毎晩こんな酒を飲んでおるのか。", "Do people in the future drink this every night?", "tease",
      tts="みらいのものは、まいばん、こんなさけを、のんでおるのか。", tone="half envious, half teasing"),
    Y(122.4, "……さすがに、毎晩ではないです。", "…Well, not every night.", 2.4),
    L(122.6, "C", "ice", dur=2.6, az=-78, d=0.35, gain=.9),             # fresh ice, LEFT
    L(124.0, "I", "laugh", "ほっほっほ。", "Ho ho ho.", "chuckle", tts="ほっほっほ"),
    L(125.2, "I", "say", "未来も、良き世のようでござるな。", "The future sounds like a fine age.", "calm",
      tts="みらいも、よきよのようで、ござるな。", tone="gentle, content"),
    L(129.6, "C", "ice", dur=2.6, az=78, d=0.35, gain=.9),              # fresh ice, RIGHT
    L(129.8, "N", "say", "この酒の名、しかと覚えたぞ。", "I've got these names by heart.", "proud",
      tts="このさけのな、しかと、おぼえたぞ。", tone="firm, pleased"),

    # ── 六  2:10–2:30  Kanpai and goodbye at both ears ──────────────────────────────────────
    L(133.0, "N", "say", "さあ、皆で乾杯じゃ！", "Now, everyone — kanpai!", "excited",
      tts="さあ、みなで、かんぱいじゃ！", tone="cup raised high", pose="sit"),
    L(135.7, "-", "clink", dur=1.0),
    L(136.0, "N", "laugh", "はっはっは！", "Ha ha ha!", "laugh", tts="はっはっはっは", n=4),
    L(136.5, "I", "laugh", "ほっほっほ。", "Ho ho ho.", "chuckle", tts="ほっほっほ"),
    L(138.0, "C", "chill", dur=2.8, az=-84, d=0.25, gain=.8),           # cold glass LEFT while Ieyasu whispers RIGHT
    L(138.6, "I", "whisper", "…また、未来の酒を頼みますぞ。", "…Do bring us more from the future.", "whisper",
      tts="…また、みらいのさけを、たのみますぞ。", tone="RIGHT ear, fond"),
    L(143.6, "C", "chill", dur=2.8, az=84, d=0.25, gain=.8),            # cold glass RIGHT while Nobunaga whispers LEFT
    L(144.2, "N", "whisper", "…次は、わしが馳走してやろう。", "…Next time, I'll be the one treating you.", "whisper",
      tts="…つぎは、わしが、ちそうしてやろう。", tone="LEFT ear, warm"),
    Y(147.4, "はい。また、いつか。", "Yes. Until next time.", 2.6),
    L(146.0, "-", "koto", dur=4.0, outro=True),
]

# ---------------------------------------------------------------- positions (t, az, d)
SEAT = {"N": (-38.0, 1.15), "I": (38.0, 1.15)}
EAR = {"N": (-87.0, 0.17), "I": (87.0, 0.17)}


def _durs():
    import json, os
    p = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "audio", "takes.json")
    return {int(k): v["dur"] for k, v in json.load(open(p)).items()} if os.path.exists(p) else {}


def _visits(who):
    """Seat ↔ ear keyframes: the lord goes to your ear for each of his whispers."""
    s, e = SEAT[who], EAR[who]
    dur = _durs()
    ks = [(0.0, *s)]
    for i, c in enumerate(CUES):
        if c["who"] == who and c["kind"] == "whisper":
            t0, t1 = c["t"] - 1.0, c["t"] + dur.get(i, 3.6)
            ks += [(t0 - .05, *s), (t0 + .85, *e), (t1, *e), (t1 + 1.0, *s)]
    ks.append((DURATION, *s))
    out = []
    for k in sorted(ks):
        if out and k[0] <= out[-1][0] + .05: continue
        out.append(k)
    return out


PRESENT = {"N": (0.0, 150.0), "I": (0.0, 150.0)}
COOL_KINDS = ("ice", "fizz", "chill")


def _src_keys(kinds, rest=(0.0, 3.0)):
    ks = []
    for c in CUES:
        if c["kind"] in kinds:
            ks.append((c["t"] - 0.05, c["az"], c["d"]))
            ks.append((c["t"] + c["dur"], c.get("az1", c["az"]), c["d"]))
    return ks or [(0.0, *rest), (DURATION, *rest)]


def _interp(keys, times):
    from scipy.interpolate import PchipInterpolator
    ks = sorted(keys)
    t = np.array([k[0] for k in ks]); az = np.array([k[1] for k in ks], float); d = np.array([k[2] for k in ks], float)
    tc = np.clip(times, t[0], t[-1])
    a = PchipInterpolator(t, az)(tc)
    dd = np.clip(PchipInterpolator(t, d)(tc), 0.12, 8.0)
    return ((a + 180.0) % 360.0) - 180.0, dd


def positions(times):
    """{source: (az wrapped, d)} — used by the binaural renderer, the thermal controller and the player."""
    return {"N": _interp(_visits("N"), times), "I": _interp(_visits("I"), times),
            "C": _interp(_src_keys(COOL_KINDS), times), "F": (np.full(len(times), 0.0), np.full(len(times), 3.0))}
