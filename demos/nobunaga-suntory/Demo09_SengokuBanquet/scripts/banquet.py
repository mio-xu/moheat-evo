"""《安土最後の酒宴》 The Last Banquet at Azuchi — single source of truth (script + timeline).

Azuchi Castle, spring 1582 (weeks before Honnō-ji). You sit between the two lords:
  N = Oda Nobunaga  — front-LEFT  (his voice → mostly L_Heat)
  I = Tokugawa Ieyasu — front-RIGHT (his voice → mostly R_Heat)
Ambient thermal sources, each with its own position:
  F = fire / warmth : hot-sake steam, charcoal brazier                 → HEAT
  C = cold          : ice bucket, night wind, rain blowing in           → COOL

Every line defines: speaker, emotion, delivery, where he is, who he is talking to.
Coordinates: az degrees (0 front, −90 left ear, +90 right ear), d metres from head centre.
"""
import numpy as np

DURATION = 150.0
SR = 48000

SCENES = [  # (t, no, ja, en)
    (0.0, "一", "安土の宴", "The banquet at Azuchi"),
    (24.0, "二", "熱燗で乾杯", "A toast of warm sake"),
    (50.0, "三", "耳元の密談", "Secrets at your ear"),
    (82.0, "四", "風が変わる", "The wind turns"),
    (104.0, "五", "雨の夜", "A night of rain"),
    (129.0, "六", "最後の盃", "The last cup"),
]
NAMES = {"N": {"ja": "信長", "en": "Nobunaga"}, "I": {"ja": "家康", "en": "Ieyasu"}, "Y": {"ja": "あなた", "en": "You"}}


def L(t, who, kind, ja="", en="", emo="calm", tts=None, to="you", tone="", **kw):
    c = dict(t=t, who=who, kind=kind, ja=ja, en=en, emo=emo, tts=tts or ja, to=to, tone=tone)
    c.update(kw); return c


# kind: say / whisper / laugh  (voice, HEAT of that speaker)
#       steam / brazier       (F, HEAT at their own spot)
#       ice / wind / rain     (C, COOL at their own spot; az1 = end of a sweep)
#       clink / pour / thunder / koto  (foley & music, no thermal)
CUES = [
    # ── 一  0:00–0:24  The banquet at Azuchi — both lords at their seats ─────────────────────
    L(0.3, "-", "koto", dur=20.0),
    L(2.4, "N", "say", "おお、来たか。待ちかねたぞ。", "Ah, you've come. I've been waiting.", "proud",
      tts="おお、きたか。まちかねたぞ。", tone="warm, commanding, a grin in the voice", pose="sit"),
    L(6.4, "N", "say", "さあ、そこへ座れ。今宵は、わしの宴じゃ。", "Come, sit there. Tonight is my banquet.", "invite",
      tts="さあ、そこへすわれ。こよいは、わしのうたげじゃ。", tone="generous host, broad gesture", pose="invite"),
    L(12.0, "I", "say", "ようこそ、お越しくだされた。", "Welcome. We are honoured you came.", "polite",
      tts="ようこそ、おこしくだされた。", tone="gentle bow, soft and low"),
    L(15.6, "I", "say", "この家康、今宵はお相伴つかまつる。", "I, Ieyasu, shall keep you company tonight.", "calm",
      tts="このいえやす、こよいは、おしょうばん、つかまつる。", tone="calm, formal"),
    L(22.0, "N", "say", "堅いのう、家康。", "So stiff, Ieyasu.", "tease", to="I",
      tts="かたいのう、いえやす。", tone="teasing, amused"),

    # ── 二  0:24–0:50  Warm sake: steam on the right, toast, Nobunaga's big laugh ─────────────
    L(24.6, "I", "pour", dur=2.2),
    L(24.8, "F", "steam", dur=7.0, az=48, d=0.5, gain=1.0),
    L(25.4, "I", "say", "まずは熱燗を一献。…湯気が、立っておりましょう。", "First, a cup of warm sake. …See the steam rising?", "polite",
      tts="まずは、あつかんを、いっこん。…ゆげが、たっておりましょう。", tone="hospitable, leaning toward you", pose="pour"),
    L(33.4, "N", "say", "よし、皆で飲もうぞ！ 乾杯じゃ！", "Right — let us all drink! Kanpai!", "excited",
      tts="よし、みなでのもうぞ！ かんぱいじゃ！", tone="loud, festive, cup raised", pose="sit"),
    L(36.3, "-", "clink", dur=1.0),
    L(36.9, "N", "laugh", "はっはっは！", "Ha ha ha!", "laugh", tts="はっはっはっはっは", tone="hearty, head thrown back", pose="laugh"),
    L(39.6, "N", "say", "どうした、まだ飲めるであろう？", "What's this? Surely you can drink more?", "tease",
      tts="どうした、まだのめるであろう？", tone="playful provocation", pose="lean"),
    L(42.8, "I", "say", "無理はなさらず。まずは、ひとくち。", "Don't push yourself. Just a sip, to start.", "concern",
      tts="むりはなさらず。まずは、ひとくち。", tone="kind, protective, close on your right", pose="offer"),
    L(47.5, "I", "laugh", "ほっほっほ。", "Ho ho ho.", "chuckle", tts="ほっほっほ", tone="soft chuckle"),

    # ── 三  0:50–1:22  Nobunaga at your LEFT ear (warm) while the ice bucket clinks RIGHT (cool) ─
    L(50.8, "N", "whisper", "…近う寄れ。そなたにだけ、教えてやろう。", "…Come closer. I'll tell you alone.", "whisper",
      tts="…ちこうよれ。そなたにだけ、おしえてやろう。", tone="low, conspiratorial, at your left ear"),
    L(54.8, "C", "ice", dur=5.0, az=70, d=0.5, gain=1.0),
    L(55.8, "N", "whisper", "わしはな、この国の、その先を見ておる。", "I am looking past this land — to what lies beyond.", "whisper",
      tts="わしはな、このくにの、そのさきをみておる。", tone="quiet ambition, almost tender"),
    L(61.4, "I", "say", "こちらは冷や酒。氷で冷やしてござる。", "And this is chilled sake, kept on ice.", "polite",
      tts="こちらは、ひやざけ。こおりで、ひやしてござる。", tone="calm, from his seat", pose="offer"),
    L(68.2, "I", "whisper", "…信長様は、ああ見えて寂しがりでな。", "…For all his bluster, Lord Nobunaga gets lonely.", "whisper",
      tts="…のぶながさまは、ああみえて、さびしがりでな。", tone="confiding, at your right ear, hand by his mouth"),
    L(74.0, "I", "whisper", "今宵は、ゆるりと付き合うてくだされ。", "So stay with him tonight, at your ease.", "whisper",
      tts="こよいは、ゆるりと、つきおうてくだされ。", tone="warm, fatherly"),
    L(79.0, "N", "say", "何をこそこそ話しておる。", "What are you two whispering about?", "suspicious", to="I",
      tts="なにを、こそこそ、はなしておる。", tone="mock-suspicious, from his seat"),

    # ── 四  1:22–1:44  The wind turns: cold gusts LEFT then RIGHT, each against a warm voice ──────
    L(82.0, "C", "wind", dur=6.0, az=0, az1=-20, d=1.6, gain=.8),      # first gust from the garden: both ears, mildly
    L(83.2, "I", "say", "おや……風が、強うなりましたな。", "Oh… the wind has grown strong.", "surprise",
      tts="おや……かぜが、つようなりましたな。", tone="turning to the garden", pose="wind"),
    L(88.0, "N", "say", "……妙な気配じゃ。", "……Something feels wrong.", "suspicious",
      tts="……みょうな、けはいじゃ。", tone="low, alert, hand on his sword", pose="alert"),
    L(90.0, "C", "wind", dur=6.0, az=-62, d=0.9, gain=1.0),           # gust through the LEFT shoji while Ieyasu (right) speaks
    L(90.8, "I", "say", "ご案じなさるな。ただの夜風にござる。", "Do not worry. It is only the night wind.", "calm",
      tts="ごあんじなさるな。ただの、よかぜにござる。", tone="steady, raising a calming hand", pose="calm"),
    L(96.4, "C", "wind", dur=6.0, az=62, d=0.9, gain=1.0),            # the wind swings to the RIGHT shoji while Nobunaga (left) speaks
    L(97.2, "N", "say", "ふん。風ごときで、わしの宴は終わらぬ。", "Hmph. A little wind won't end my banquet.", "proud",
      tts="ふん。かぜごときで、わしのうたげは、おわらぬ。", tone="defiant, standing tall", pose="stand"),
    L(101.9, "N", "laugh", "ははっ！", "Ha!", "laugh", tts="はっはっは", tone="short defiant laugh", pose="stand", n=3),

    # ── 五  1:44–2:09  Rain: left cold + right brazier → reversal: Nobunaga warm at LEFT ear, rain RIGHT ─
    L(104.0, "C", "rain", dur=9.0, az=-60, d=1.4, gain=1.0),         # damp air from the LEFT
    L(105.0, "-", "thunder", dur=4.0),
    L(106.0, "I", "say", "雨にござる。…炭を、足しましょう。", "Rain. …Let me add more charcoal.", "thoughtful",
      tts="あめにござる。…すみを、たしましょう。", tone="quiet, practical", pose="sit"),
    L(108.6, "F", "brazier", dur=5.6, az=52, d=0.55, gain=1.0),
    L(114.6, "C", "rain", dur=14.8, az=55, az1=65, d=1.3, gain=1.0),     # the wind swings across the front: rain now from the RIGHT
    L(115.0, "N", "whisper", "…雨の音を聞け。悪くなかろう。", "…Listen to the rain. Not bad, is it?", "whisper",
      tts="…あめのおとをきけ。わるくなかろう。", tone="intimate, at your left ear"),
    L(119.0, "N", "whisper", "この一夜は、二度とは来ぬ。", "A night like this never comes twice.", "whisper",
      tts="このいちやは、にどとは、こぬ。", tone="wistful — a hint of foreboding"),
    L(122.6, "N", "laugh", "ふっふっふ…", "Heh heh heh…", "earlaugh", tts="ふっふっふ", tone="soft laugh into your ear", n=3),

    # ── 六  2:09–2:30  The last cup — rain stops, both back at their seats, calm ending ───────────
    L(129.4, "I", "say", "雨も、上がってまいりましたな。", "The rain is letting up.", "calm",
      tts="あめも、あがってまいりましたな。", tone="relieved, looking out", pose="sit"),
    L(133.4, "N", "say", "最後の一杯じゃ。そなたも、盃を取れ。", "One last cup. You too — take yours.", "invite",
      tts="さいごの、いっぱいじゃ。そなたも、さかずきをとれ。", tone="warm, raising his cup", pose="sit"),
    L(138.6, "I", "say", "…この夜のこと、決して忘れませぬ。", "…I shall never forget this night.", "calm",
      tts="…このよるのこと、けっして、わすれませぬ。", tone="moved, quiet", pose="offer"),
    L(144.0, "N", "say", "うむ。…また、飲もうぞ。", "Mm. …Let us drink again.", "soft",
      tts="うむ。…また、のもうぞ。", tone="gentle, unusually soft"),
    L(147.0, "-", "clink", dur=1.0),
    L(146.0, "-", "koto", dur=4.0, outro=True),
    # ── you (first person): subtitles only, no voice — placed in the gaps, answering the lords (user, 2026-11-07) ──
    L(0.4, "Y", "you", "失礼します……。", "Excuse me…", dur=1.9),
    L(5.1, "Y", "you", "約束の樽です。", "The cask, as promised.", dur=1.3),       # from Demo 8 (Yamazaki)
    L(36.2, "Y", "you", "乾杯！", "Cheers!", dur=1.4),
    L(48.6, "Y", "you", "……では、ひとくちだけ。", "…Just a sip, then.", dur=2.1),
    L(59.7, "Y", "you", "その先……ですか？", "Beyond…?", dur=1.7),
    L(111.0, "Y", "you", "……あったかい。", "…So warm.", dur=2.4),
    L(124.4, "Y", "you", "……ずっと、ここにいたいです。", "…I wish I could stay here forever.", dur=3.6),
    L(146.9, "Y", "you", "はい、必ず。", "Yes — I promise.", dur=2.6),
]

# ---------------------------------------------------------------- positions (t, az, d)
SEAT = {"N": (-38.0, 1.15), "I": (38.0, 1.15)}
N_KEYS = [
    (0.0, -38, 1.15), (33.0, -38, 1.15), (33.8, -36, 1.0), (39.0, -36, 0.95), (39.8, -46, 0.75), (42.0, -46, 0.8),   # leans in for the tease
    (42.8, -38, 1.15), (49.4, -38, 1.1), (50.4, -86, 0.18), (59.8, -86, 0.18),                                       # → LEFT ear
    (61.0, -38, 1.15), (87.6, -38, 1.15), (88.4, -40, 1.25), (101.0, -42, 1.3), (103.0, -38, 1.15),                  # alert / standing
    (113.6, -38, 1.15), (114.6, -87, 0.17), (124.4, -87, 0.18), (125.8, -38, 1.15), (150.0, -38, 1.15),              # → LEFT ear in the rain
]
I_KEYS = [
    (0.0, 38, 1.15), (24.6, 38, 1.15), (25.4, 42, 0.7), (32.4, 42, 0.7), (33.4, 38, 1.15),                           # leans in to pour
    (42.0, 38, 1.15), (42.8, 50, 0.6), (48.6, 50, 0.62), (49.6, 38, 1.15),                                            # close for the concern line
    (67.2, 38, 1.15), (68.0, 87, 0.17), (78.8, 87, 0.18), (79.8, 38, 1.15),                                           # → RIGHT ear
    (150.0, 38, 1.15),
]
PRESENT = {"N": (0.0, 150.0), "I": (0.0, 150.0)}

# cool / warm ambience: each cue sits at its own spot (optionally sweeping az → az1)
COOL_KINDS = ("ice", "wind", "rain")
WARM_KINDS = ("steam", "brazier")


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
    return {"N": _interp(N_KEYS, times), "I": _interp(I_KEYS, times),
            "C": _interp(_src_keys(COOL_KINDS), times), "F": _interp(_src_keys(WARM_KINDS), times)}


# ---------------------------------------------------------------- retime (2026-11-08)
# The film follows the ElevenLabs voices' natural length (no need to keep 150 s): scripts/voice.py writes audio/retime.json =
# [(old t, extra s)]; every time above (cues, ambience durations, scenes, position keys, presence, duration) goes through W().
import copy as _copy, json as _json, os as _os
CUES0, DURATION0 = _copy.deepcopy(CUES), DURATION
_RT = _os.path.join(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))), "audio", "retime.json")
RETIME = _json.load(open(_RT)) if _os.path.exists(_RT) else []


def W(t):
    """old script time → film time."""
    return t + sum(e for p, e in RETIME if t >= p)


if RETIME:
    for _c in CUES:
        if "dur" in _c: _c["dur"] = W(_c["t"] + _c["dur"]) - W(_c["t"])
        _c["t"] = W(_c["t"])
    SCENES = [(W(t), *r) for t, *r in SCENES]
    N_KEYS = [(W(t), *r) for t, *r in N_KEYS]
    I_KEYS = [(W(t), *r) for t, *r in I_KEYS]
    PRESENT = {k: (W(a), W(b)) for k, (a, b) in PRESENT.items()}
    DURATION = W(DURATION)
