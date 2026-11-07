"""Demo 8《信長と家康、山崎蒸溜所へ》Two Warlords at the Yamazaki Distillery — single source of truth (script + timeline).

Same cast, voices and controller as the Sengoku banquet demo (Demo 9), loaded by path:
  N = Oda Nobunaga  — front-LEFT  (voice → mostly L heat)
  I = Tokugawa Ieyasu — front-RIGHT (voice → mostly R heat)
  Y = you, their guide — subtitles only, no voice
Cold (C): valley mist, the cool cask warehouse, spring water, highball ice.  Warm (F): fermentation steam, the copper pot stills.
The pot-still heat sits on the side of the lord who is talking about it (so each lord's heat still follows his voice).
Visual-only cues: bg, prop, slip.  Times laid out on the real take lengths (then stretched ×1.08 after 16 s for breathing room).
"""
import numpy as np
from cues_common import L, Y, NAMES

DURATION, SR = 150.0, 48000
TITLE = {"ja": "信長と家康、山崎蒸溜所へ", "en": "Two Warlords at the Yamazaki Distillery"}
SCENES = [(0.0, "一", "霧の谷", "A misty valley"), (20.2, "二", "蒸留釜の熱", "The heat of the stills"), (58.6, "三", "眠る樽", "Sleeping casks"),
          (82.0, "四", "山崎の名水", "Yamazaki's spring water"), (94.0, "五", "あの夜の香り", "The scent of that night"), (119.6, "六", "樽を安土へ", "A cask for Azuchi")]

CUES = [
    # ── 一  Misty valley ─────────────────────────────────────────────────────────────────────
    L(0.0, "-", "bg", name="d8_bg_valley", dur=20.2),
    L(0.3, "-", "koto", dur=16.0),
    L(0.5, "-", "slip", dur=2.2),
    L(1.2, "C", "wind", dur=5.4, az=62, d=1.6, gain=.55),                    # morning mist RIGHT while Nobunaga (LEFT) speaks
    L(1.6, "N", "say", "霧の谷か……妙に、良い香りがするのう。", "A misty valley… and a strangely good scent.", "suspicious",
      tts="きりの、たにか……みょうに、よい、かおりがするのう。", pose="alert"),
    L(7.4, "C", "wind", dur=8.4, az=-62, d=1.6, gain=.55),                   # … LEFT while Ieyasu (RIGHT) speaks
    L(7.6, "I", "say", "水の音がいたします。名水の地でございますな。", "I hear water. This must be a land of fine springs.", "calm",
      tts="みずの、おとが、いたします。めいすいの、ちで、ございますな。", pose="calm"),
    Y(16.2, "ようこそ。ここは、ウイスキーが生まれる場所です。", "Welcome. This is where whisky is born.", 3.6),

    # ── 二  Fermentation and the copper pot stills (the hottest part) ──────────────────────────
    L(20.2, "-", "bg", name="d8_bg_stillhouse", dur=38.4),
    L(16.2, "C", "wind", dur=3.6, az=-30, az1=40, d=1.8, gain=.5),           # mist drifting across as you welcome them
    L(20.6, "F", "steam", dur=6.4, az=-50, d=0.7, gain=.8),                 # fermentation steam LEFT while Ieyasu (RIGHT) talks
    L(21.0, "I", "say", "大きな桶が、ぷくぷくと息をしておる。", "Great tubs, breathing and bubbling.", "surprise",
      tts="おおきな、おけが、ぷくぷくと、いきを、しておる。", pose="offer"),
    L(28.4, "I", "whisper", "麦の、甘い香りでございますよ。", "It smells of sweet barley.", "whisper",
      tts="むぎの、あまい、かおりで、ございますよ。", tone="close at your RIGHT ear"),
    Y(34.4, "こちらが、蒸留釜です。", "And these are the pot stills.", 2.4),
    L(35.0, "F", "brazier", dur=10.6, az=-58, d=1.0, gain=1.0),             # radiant heat of the stills on Nobunaga's side (LEFT) as he marvels
    L(35.4, "N", "say", "なんと！ 銅の巨大な兜が、ずらりと並んでおる！", "Look! Giant copper helmets, all in a row!", "excited",
      tts="なんと！ どうの、きょだいな、かぶとが、ずらりと、ならんでおる！", pose="alert"),
    L(41.2, "N", "say", "熱い！ 鍛冶場より熱いぞ！", "Hot! Hotter than a smithy!", "excited", tts="あつい！ かじばより、あついぞ！"),
    L(44.2, "N", "laugh", "わっはっは！", "Ha ha ha!", "laugh", tts="わっはっはっは", pose="laugh"),
    L(46.4, "F", "brazier", dur=10.4, az=58, d=1.0, gain=1.0),              # … then on Ieyasu's side (RIGHT) as he explains
    L(46.6, "I", "say", "炎で酒を……雲に変えて、また雫に戻すのか。", "Turning sake into cloud with fire… and back into drops.", "thoughtful",
      tts="ほのおで、さけを……くもに、かえて、また、しずくに、もどすのか。"),
    Y(57.0, "次は、熟成庫です。", "Next, the cask warehouse.", 2.4),
    L(57.2, "C", "wind", dur=2.2, az=-60, d=1.4, gain=.6),                   # the warehouse door: cool air LEFT

    # ── 三  The cool, quiet cask warehouse: whispers left and right ───────────────────────────
    L(58.6, "-", "bg", name="d8_bg_warehouse", dur=23.4),
    L(59.6, "C", "wind", dur=6.6, az=60, d=1.4, gain=.6),                    # cool air RIGHT while Nobunaga (LEFT) looks around
    L(60.2, "N", "say", "……静かじゃ。樽が、眠っておる。", "…So quiet. The casks are sleeping.", "soft", tts="……しずかじゃ。たるが、ねむっておる。", pose="stand"),
    Y(64.0, "樽の中で、何年も眠らせるんです。", "They sleep in the casks for years.", 3.0),
    L(67.6, "C", "chill", dur=6.4, az=-72, d=0.5, gain=.85),                 # cool LEFT under Ieyasu's RIGHT whisper
    L(68.0, "I", "whisper", "天使の分け前、と申すそうです。", "They call it the angels' share.", "whisper",
      tts="てんしの、わけまえ、と、もうすそうです。", tone="close at your RIGHT ear"),
    L(74.0, "C", "chill", dur=5.4, az=72, d=0.5, gain=.85),                  # cool RIGHT under Nobunaga's LEFT whisper
    L(74.4, "N", "whisper", "天使め、わしより先に飲むとは。", "Those angels drink before me?", "whisper",
      tts="てんしめ、わしより、さきに、のむとは。", tone="close at your LEFT ear"),
    Y(79.2, "おいしい水も、見てください。", "Come and see the spring water, too.", 2.6),
    L(79.4, "C", "chill", dur=2.4, az=66, d=0.8, gain=.6),

    # ── 四  The spring water ────────────────────────────────────────────────────────────────
    L(82.0, "-", "bg", name="d8_bg_valley", dur=12.0),
    L(82.4, "-", "prop", name="d8_prop_ladle", dur=11.0),
    L(82.4, "C", "chill", dur=8.2, az=-50, d=0.6, gain=1.0),                 # cold spring water LEFT while Ieyasu (RIGHT) tastes it
    L(82.6, "I", "say", "冷たい……澄んだ水じゃ。この水が、酒の命か。", "Cold… such clear water. This water is the soul of the sake.", "surprise",
      tts="つめたい……すんだ、みずじゃ。このみずが、さけの、いのちか。"),
    Y(91.0, "最後に、試飲をどうぞ。まずはそのまま、香りを。", "Finally, a tasting. First, just smell it, neat.", 3.4),

    # ── 五  Tasting room: the scent from Azuchi (time loop with Demo 6) ───────────────────────
    L(94.0, "-", "bg", name="d8_bg_tasting", dur=25.6),
    L(94.4, "-", "prop", name="d8_prop_yamazaki", dur=18.0),
    L(94.4, "F", "steam", dur=4.4, az=55, d=0.6, gain=.5),                   # the warm scent of a neat dram, RIGHT
    L(95.0, "N", "say", "……待て。この香り、覚えがあるぞ。", "…Wait. I know this scent.", "suspicious", tts="……まて。このかおり、おぼえが、あるぞ。"),
    L(99.6, "C", "chill", dur=7.6, az=-64, d=0.5, gain=.8),                  # Nobunaga's glass on ice, LEFT, while Ieyasu (RIGHT) remembers
    L(99.6, "I", "say", "殿、あの夜……安土で、この方が持ってきた酒では！", "My lord — that night at Azuchi… the sake this one brought us!", "surprise",
      tts="との、あのよる……あづちで、このかたが、もってきた、さけでは！"),
    L(107.8, "C", "fizz", dur=6.0, az=66, d=0.45, gain=1.0),                # Ieyasu's highball fizzing RIGHT while Nobunaga (LEFT) realises
    L(107.8, "N", "say", "そうか、ここで生まれておったのか！", "So this is where it was born!", "excited", tts="そうか、ここで、うまれておったのか！", pose="invite"),
    L(111.0, "N", "laugh", "わっはっは！", "Ha ha ha!", "laugh", tts="わっはっはっは", pose="laugh"),
    Y(112.6, "乾杯しましょう！", "Let's have a toast!", 1.8),
    L(113.0, "-", "prop", name="d8_prop_highball", dur=6.6),
    L(114.4, "N", "say", "乾杯じゃ！", "Cheers!", "excited", tts="かんぱいじゃ！"),
    L(114.6, "I", "say", "乾杯！", "Cheers!", "polite", tts="かんぱい！"),
    L(115.3, "-", "clink", dur=1.0),
    L(115.6, "C", "fizz", dur=5.0, az=-70, az1=70, d=0.45, gain=1.0),        # ice clinks travel LEFT → RIGHT
    L(116.6, "I", "laugh", "ほっほっほ。", "Ho ho ho.", "chuckle", tts="ほっほっほ"),

    # ── 六  The glowing cask, goodbye ─────────────────────────────────────────────────────────
    L(119.6, "-", "bg", name="d8_bg_warehouse", dur=30.4),
    L(120.0, "-", "prop", name="d8_prop_cask", dur=20.0),
    L(120.4, "C", "chill", dur=6.4, az=-64, d=0.8, gain=.7),                 # cool warehouse air LEFT while Ieyasu (RIGHT) speaks
    L(120.6, "I", "say", "一樽、安土へ持ち帰りとうございますな。", "I would like to take a cask home to Azuchi.", "polite",
      tts="ひとたる、あづちへ、もちかえりとう、ございますな。", pose="offer"),
    Y(127.2, "次は、この樽を持って、安土へ伺います。", "Next time, I'll bring this cask to Azuchi.", 3.6),
    L(127.4, "C", "chill", dur=3.4, az=64, d=0.8, gain=.6),
    L(131.6, "-", "slip", dur=6.0),
    L(132.0, "-", "koto", dur=18.0, outro=True),
]
for _c in CUES:                                   # breathing room: stretch everything after 16 s by 8 %
    if _c["t"] > 16.0: _c["t"] = round(16.0 + (_c["t"] - 16.0) * 1.08, 2)
SCENES = [(t if t <= 16 else round(16.0 + (t - 16.0) * 1.08, 2), n, ja, en) for t, n, ja, en in SCENES]

# ---------------------------------------------------------------- player config (read by the shared demo.js)
VIS = dict(
    bgfx={"d8_bg_valley": "mist", "d8_bg_warehouse": "dust"},
    propNames={"d8_prop_ladle": ["山崎の名水", "Yamazaki spring water"], "d8_prop_yamazaki": ["山崎", "Yamazaki"],
               "d8_prop_highball": ["ハイボール", "Highball"], "d8_prop_cask": ["ねむる樽", "A sleeping cask"]},
    propSize={"d8_prop_yamazaki": 380, "d8_prop_ladle": 260, "d8_prop_cask": 300}, steamy=[], steamDx={}, nightGrade=0.0)

# ---------------------------------------------------------------- positions (t, az, d)
SEAT = {"N": (-38.0, 1.15), "I": (38.0, 1.15)}
EAR = {"N": (-87.0, 0.17), "I": (87.0, 0.17)}
PRESENT = {"N": (1.0, 145.0), "I": (1.2, 145.0)}
COOL_KINDS = ("wind", "ice", "fizz", "chill")
WARM_KINDS = ("brazier", "steam")


def _durs():
    import json, os
    p = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "audio", "takes.json")
    return {int(k): v["dur"] for k, v in json.load(open(p)).items()} if os.path.exists(p) else {}


def _visits(who):
    s, e = SEAT[who], EAR[who]
    dur = _durs()
    ks = [(0.0, *s)]
    for i, c in enumerate(CUES):
        if c["who"] == who and c["kind"] == "whisper":
            t0, t1 = c["t"] - 1.0, c["t"] + dur.get(i, 6.0)
            ks += [(t0 - .05, *s), (t0 + .85, *e), (t1, *e), (t1 + 1.0, *s)]
    ks.append((DURATION, *s))
    out = []
    for k in sorted(ks):
        if out and k[0] <= out[-1][0] + .05: continue
        out.append(k)
    return out


def _src_keys(kinds, rest=(0.0, 3.0)):
    ks = []
    for c in CUES:
        if c["kind"] in kinds:
            ks.append((c["t"] - 0.05, c["az"], c["d"]))
            ks.append((c["t"] + c["dur"], c.get("az1", c["az"]), c["d"]))
    return ks or [(0.0, *rest), (DURATION, *rest)]


def _interp(keys, times):
    from scipy.interpolate import PchipInterpolator
    ks = []
    for k in sorted(keys):
        if ks and k[0] <= ks[-1][0] + 1e-3: continue
        ks.append(k)
    t = np.array([k[0] for k in ks]); az = np.array([k[1] for k in ks], float); d = np.array([k[2] for k in ks], float)
    tc = np.clip(times, t[0], t[-1])
    a = PchipInterpolator(t, az)(tc)
    dd = np.clip(PchipInterpolator(t, d)(tc), 0.12, 8.0)
    return ((a + 180.0) % 360.0) - 180.0, dd


def positions(times):
    return {"N": _interp(_visits("N"), times), "I": _interp(_visits("I"), times),
            "C": _interp(_src_keys(COOL_KINDS), times), "F": _interp(_src_keys(WARM_KINDS), times)}
