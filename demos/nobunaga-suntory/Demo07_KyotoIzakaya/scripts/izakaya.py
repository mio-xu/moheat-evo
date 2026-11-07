"""Demo 7《信長と家康、京都の居酒屋へ》Two Warlords in a Kyoto Izakaya — single source of truth (script + timeline).

Same cast, voices and controller as the Sengoku banquet demo (Demo 9), loaded by path:
  N = Oda Nobunaga  — front-LEFT  (voice → mostly L heat)
  I = Tokugawa Ieyasu — front-RIGHT (voice → mostly R heat)
  Y = you — subtitles only, no voice
Cold (C): snowy night wind (Pontocho, the open window on the Kamo River), ice-cold beer, highball fizz / ice.
Warm (F): the charcoal yakitori grill, hot-sake steam.
Visual-only cues: bg (background), zoom (camera to the window), prop (object on the table), slip (time-slip sparkles).
Coordinates: az degrees (0 front, −90 left ear, +90 right ear), d metres.  Times were laid out on the real take lengths.
"""
import numpy as np
from cues_common import L, Y, NAMES

DURATION, SR = 150.0, 48000
TITLE = {"ja": "信長と家康、京都の居酒屋へ", "en": "Two Warlords in a Kyoto Izakaya"}
SCENES = [  # (t, no, ja, en)
    (0.0, "一", "雪の先斗町", "Snow in Pontocho"),
    (20.6, "二", "はじめての生ビール", "Their first draft beer"),
    (59.6, "三", "ハイボールと熱燗", "Highball and hot sake"),
    (84.4, "四", "鴨川の灯り", "Lights on the Kamo River"),
    (107.2, "五", "未来に乾杯", "A toast to the future"),
]

CUES = [
    # ── 一  0:00–0:21  Snow in Pontocho: they appear in a burst of gold ────────────────────────
    L(0.0, "-", "bg", name="d7_bg_pontocho", dur=20.6),
    L(1.2, "C", "wind", dur=5.4, az=62, d=1.4, gain=.8),                     # snowy gusts from the alley: RIGHT while Nobunaga (LEFT) speaks …
    L(7.2, "C", "wind", dur=8.4, az=-62, d=1.4, gain=.8),                    # … LEFT while Ieyasu (RIGHT) speaks …
    L(16.0, "C", "wind", dur=4.4, az=-20, az1=40, d=1.8, gain=.6),           # … and across the front as you open the door
    L(0.3, "-", "koto", dur=16.0),
    L(0.5, "-", "slip", dur=2.2),
    L(1.6, "N", "say", "……ここは、どこじゃ。灯りが、星のように多い。", "…Where is this? So many lights, like stars.", "soft",
      tts="……ここは、どこじゃ。あかりが、ほしのように、おおい。", tone="awed, looking around", pose="alert"),
    L(7.3, "I", "say", "殿、空気が冷とうございます。……されど、良い匂いが。", "My lord, the air is cold… yet something smells good.", "concern",
      tts="との、くうきが、つめとうございます。……されど、よい、においが。", tone="hugging his sleeves, then sniffing", pose="calm"),
    Y(16.2, "寒いでしょう。入りましょう！", "Cold, isn't it? Let's go in!", 2.8),

    # ── 二  0:21–0:60  The izakaya: draft beer, kanpai, yakitori, a whisper ─────────────────────
    L(20.6, "-", "bg", name="d7_bg_izakaya", dur=63.8),
    L(20.6, "-", "murmur", dur=86.0),
    L(21.2, "N", "say", "ほう、ここが今の世の酒場か。狭いが、活気があるのう！", "So this is a tavern of the new age. Small, but full of life!", "proud",
      tts="ほう、ここが、いまのよの、さかばか。せまいが、かっきが、あるのう！", pose="invite"),
    L(27.9, "-", "pour", dur=3.0),
    L(28.0, "-", "prop", name="d7_prop_beer", dur=12.4),
    L(28.4, "C", "chill", dur=5.2, az=74, d=0.4, gain=.8),                   # frosted mugs set down on the RIGHT while Nobunaga marvels
    L(28.3, "N", "say", "樽から黄金の酒が湧き出ておる！ なんじゃ、この泡は！", "Golden sake pouring from a barrel! What is this foam!?", "excited",
      tts="たるから、おうごんの、さけが、わきでておる！ なんじゃ、このあわは！", pose="alert"),
    Y(34.2, "かんぱーい！", "Cheers!", 1.4),
    L(34.5, "N", "say", "乾杯じゃ！", "Cheers!", "excited", tts="かんぱいじゃ！"),
    L(34.7, "I", "say", "乾杯！", "Cheers!", "polite", tts="かんぱい！"),
    L(35.4, "-", "clink", dur=1.0),
    L(35.6, "C", "chill", dur=5.0, az=76, d=0.32, gain=1.0),                # an ice-cold mug by your RIGHT ear …
    L(36.4, "N", "say", "……冷たい！ だが、うまい！", "…Cold! But delicious!", "excited", tts="……つめたい！ だが、うまい！"),   # … while Nobunaga warms the LEFT
    L(39.0, "N", "laugh", "わっはっは！", "Ha ha ha!", "laugh", tts="わっはっはっは", pose="laugh"),
    L(40.6, "-", "prop", name="d7_prop_yakitori", dur=18.6),
    L(40.6, "F", "brazier", dur=7.2, az=-44, d=0.75, gain=1.0),             # the charcoal grill, front-LEFT, while Ieyasu (RIGHT) offers
    L(41.0, "I", "say", "炭の焼き物でございますな。熱いうちに。", "Charcoal-grilled. Eat it while it's hot.", "polite",
      tts="すみの、やきものでございますな。あついうちに。", pose="offer"),
    Y(46.6, "いただきます！", "Let's eat!", 1.8),
    L(48.4, "C", "ice", dur=4.6, az=-74, d=0.4, gain=.9),                    # Nobunaga's beer ice, LEFT, while Ieyasu whispers RIGHT
    L(48.8, "I", "whisper", "殿は猫舌ゆえ、ふーふーして差し上げましょう。", "My lord has a cat's tongue — let's blow on it for him.", "whisper",
      tts="とのは、ねこじたゆえ、ふーふーして、さしあげましょう。", tone="close at your RIGHT ear"),
    L(56.0, "C", "chill", dur=3.2, az=74, d=0.35, gain=.8),                  # Ieyasu's cold mug RIGHT while Nobunaga protests LEFT
    L(56.0, "N", "say", "聞こえておるぞ、家康！", "I can hear you, Ieyasu!", "tease", tts="きこえておるぞ、いえやす！", pose="alert"),

    # ── 三  1:00–1:24  Highball (cold LEFT) and hot sake (warm RIGHT) ──────────────────────────
    L(59.6, "-", "prop", name="d7_prop_highball", dur=10.6),
    L(59.8, "C", "fizz", dur=6.6, az=66, d=0.42, gain=1.0),                  # the highball fizzing on the RIGHT of the table
    L(60.4, "N", "say", "こちらは何じゃ。氷が鳴っておる……しゅわしゅわと。", "And what's this? The ice is singing… fizzing.", "suspicious",
      tts="こちらは、なんじゃ。こおりが、なっておる……しゅわしゅわと。"),
    L(67.0, "N", "say", "喉が、凍るほど爽やかじゃ！", "So refreshing my throat could freeze!", "excited", tts="のどが、こおるほど、さわやかじゃ！"),
    L(70.2, "-", "prop", name="d7_prop_atsukan", dur=14.0),
    L(70.4, "F", "steam", dur=11.0, az=48, d=0.55, gain=1.0),
    L(70.8, "I", "say", "わしは熱燗を。……ああ、腹の底から温まる。", "Hot sake for me… ah, it warms me to the core.", "calm",
      tts="わしは、あつかんを。……ああ、はらのそこから、あたたまる。", pose="pour"),
    L(79.2, "C", "chill", dur=4.4, az=72, d=0.5, gain=.7),                   # a cold draft from the window, RIGHT, under Nobunaga's LEFT whisper
    L(79.0, "N", "whisper", "家康め、四百年経っても慎重よのう。", "Ieyasu — still cautious after four hundred years.", "whisper",
      tts="いえやすめ、よんひゃくねん、たっても、しんちょうよのう。", tone="close at your LEFT ear"),

    # ── 四  1:24–1:47  The window on the Kamo River: cold river wind LEFT, then RIGHT ─────────────
    Y(84.4, "窓を開けると、鴨川が見えますよ。", "Open the window and you can see the Kamo River.", 2.6),
    L(85.0, "-", "zoom", dur=22.0),                                          # camera to the window (snow blowing in)
    L(86.0, "C", "wind", dur=8.6, az=-58, d=1.1, gain=1.0),                  # river wind on the LEFT while Ieyasu (RIGHT) speaks
    L(87.0, "I", "say", "京の灯りが、川に映って……天下は、こうなったか。", "The lights of Kyoto on the river… so this is what the realm became.", "thoughtful",
      tts="きょうの、あかりが、かわに、うつって……てんかは、こうなったか。", pose="wind"),
    L(96.0, "C", "wind", dur=7.0, az=58, d=1.1, gain=1.0),                   # the wind swings RIGHT while Nobunaga (LEFT) speaks
    L(96.6, "N", "say", "誰も刀を差しておらぬ。……良い世じゃ。", "No one carries a sword… It is a good age.", "soft",
      tts="だれも、かたなを、さしておらぬ。……よいよじゃ。"),
    Y(101.8, "……はい。とても、平和な時代です。", "…Yes. It's a very peaceful age.", 3.2),

    # ── 五  1:47–2:30  A highball toast to the future, goodbye, golden slip ───────────────────────
    Y(107.2, "最後に、ハイボールで乾杯しましょう！", "One last toast, with a highball!", 3.0),
    L(107.6, "-", "prop", name="d7_prop_highball", dur=8.0),
    L(108.0, "C", "fizz", dur=6.4, az=-72, az1=72, d=0.45, gain=1.0),        # ice clinks travel LEFT → RIGHT
    L(110.2, "N", "say", "未来に、乾杯じゃ！", "To the future!", "excited", tts="みらいに、かんぱいじゃ！", pose="invite"),
    L(112.2, "I", "say", "未来に、乾杯！", "To the future!", "polite", tts="みらいに、かんぱい！"),
    L(114.6, "-", "clink", dur=1.0),
    L(115.0, "N", "laugh", "わっはっは！", "Ha ha ha!", "laugh", tts="わっはっはっは", pose="laugh"),
    L(115.6, "I", "laugh", "ほっほっほ。", "Ho ho ho.", "chuckle", tts="ほっほっほ"),
    L(118.6, "C", "wind", dur=6.4, az=-60, d=1.3, gain=.75),                 # night air from the river, LEFT, while Ieyasu (RIGHT) says goodbye
    L(118.4, "I", "say", "楽しい夜でございました。また、呼んでくだされ。", "It was a joyful night. Call us again.", "polite",
      tts="たのしい、よるで、ございました。また、よんでくだされ。"),
    L(126.2, "C", "wind", dur=5.2, az=60, d=1.3, gain=.75),                  # … RIGHT while Nobunaga (LEFT) invites you
    L(126.0, "N", "say", "次は、うまい酒の生まれる所へ、連れて行ってくれ！", "Next time, take us to where good sake is born!", "invite",
      tts="つぎは、うまいさけの、うまれるところへ、つれていってくれ！", pose="invite"),
    Y(132.4, "はい！ 約束します。", "Yes! I promise.", 2.6),
    L(134.6, "-", "slip", dur=6.0),
    L(135.0, "-", "koto", dur=15.0, outro=True),
]

# ---------------------------------------------------------------- player config (read by the shared main.js)
VIS = dict(
    bgfx={"d7_bg_pontocho": "snow"}, zoomRect=[430, 100, 1090, 540], zoomFx="snow",      # camera push to the window, snow blowing in
    propNames={"d7_prop_beer": ["生ビール", "Draft beer"], "d7_prop_yakitori": ["焼き鳥", "Yakitori"],
               "d7_prop_highball": ["ハイボール", "Highball"], "d7_prop_atsukan": ["あつかん", "Hot sake"]},
    propSize={"d7_prop_yakitori": 250}, steamy=["d7_prop_yakitori", "d7_prop_atsukan"], steamDx={"d7_prop_atsukan": -60}, nightGrade=0.0)

# ---------------------------------------------------------------- positions (t, az, d)
SEAT = {"N": (-38.0, 1.15), "I": (38.0, 1.15)}
EAR = {"N": (-87.0, 0.17), "I": (87.0, 0.17)}
PRESENT = {"N": (1.0, 139.5), "I": (1.2, 139.5)}       # they appear in the slip at the start and vanish in the last one
COOL_KINDS = ("wind", "ice", "fizz", "chill")
WARM_KINDS = ("brazier", "steam")


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
    """{source: (az wrapped, d)} — used by the binaural renderer, the thermal controller and the player."""
    return {"N": _interp(_visits("N"), times), "I": _interp(_visits("I"), times),
            "C": _interp(_src_keys(COOL_KINDS), times), "F": _interp(_src_keys(WARM_KINDS), times)}


# ---------------------------------------------------------------- retime (2026-11-08): the film follows the ElevenLabs voices' natural
# length (no need to keep 150 s); make_voice.py writes audio/retime.json, every time above goes through W(). Script times: CUES0 / DURATION0.
import importlib.util as _iu, os as _os
_ROOT = _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__)))
_s = _iu.spec_from_file_location("retime", _os.path.join(_ROOT, "..", "..", "..", "tools", "eleven", "retime.py"))
_R = _iu.module_from_spec(_s); _s.loader.exec_module(_R); _R.apply(globals(), _ROOT)
