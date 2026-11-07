"""Demo 5《信長の岐阜城へようこそ》Welcome to Nobunaga's Gifu Castle (summer 1569) — single source of truth.

Same cast, voices and controller as the Sengoku banquet demo (Demo 9), loaded by path:
  N = Oda Nobunaga (host) — front-LEFT  (voice → mostly L heat)
  I = Tokugawa Ieyasu (ally) — front-RIGHT (voice → mostly R heat)
  Y = you, a guest from the future — subtitles only, no voice
Cold (C): waterfall mist, summit wind, ice from the ice-house, night river breeze.
Warm (F): tea steam, and the cormorant boat's fire basket, which travels LEFT → RIGHT across your ears.
Warm ambience sits on the side of the lord who is NOT speaking.  Visual-only cues: bg, prop, boat, slip.
"""
import numpy as np
from cues_common import L, Y, NAMES

DURATION, SR = 150.0, 48000
TITLE = {"ja": "信長の岐阜城へようこそ", "en": "Welcome to Nobunaga's Gifu Castle"}
SCENES = [(0.0, "一", "庭と滝", "The garden and the waterfall"), (41.8, "二", "金華山の風", "Wind on Mt. Kinka"), (62.8, "三", "信長の茶", "Tea by Nobunaga's hand"),
          (82.8, "四", "長良川の鵜飼", "Cormorant fishing on the Nagara"), (126.0, "五", "天下布武", "Tenka Fubu")]

CUES = [
    # ── 一  The palace garden and its waterfall ─────────────────────────────────────────────
    L(0.0, "-", "bg", name="d9_bg_palace_garden", dur=41.8),
    L(0.3, "-", "koto", dur=18.0),
    L(0.5, "-", "slip", dur=2.2),
    L(1.4, "C", "wind", dur=6.0, az=60, d=1.4, gain=.55),                    # waterfall spray RIGHT while Nobunaga (LEFT) welcomes you
    L(1.8, "N", "say", "ほう……光の中から人が。未来から来たと申すか。面白い、ここが、わしの岐阜じゃ！", "Hoh… someone stepping out of the light. From the future, you say? Splendid — this is my Gifu!", "invite",
      tts="ほう……ひかりの、なかから、ひとが。みらいから、きたと、もうすか。おもしろい、ここが、わしの、ぎふじゃ！", pose="invite"),
    L(8.0, "C", "wind", dur=10.2, az=-60, d=1.4, gain=.55),                  # … LEFT while Ieyasu (RIGHT) teases
    L(8.0, "I", "say", "わしも招かれた身でござる。殿の自慢話は長うございますぞ。", "I am a guest too. My lord's boasting runs long, I warn you.", "polite",
      tts="わしも、まねかれた、みで、ござる。とのの、じまんばなしは、ながうございますぞ。", pose="calm"),
    Y(18.6, "はじめまして。お会いできて光栄です。", "Nice to meet you. It's an honour.", 2.6),
    L(18.6, "C", "chill", dur=2.4, az=64, d=0.9, gain=.55),
    L(21.4, "C", "wind", dur=8.4, az=62, d=1.2, gain=.7),
    L(21.4, "N", "say", "見よ、この庭と滝を。南蛮の伴天連も、口を開けて驚いておったわ。",
      "Look at this garden and waterfall. Even the southern missionary stood here open-mouthed.", "proud",
      tts="みよ、このにわと、たきを。なんばんの、ばてれんも、くちを、あけて、おどろいておったわ。", pose="stand"),
    L(30.4, "C", "chill", dur=7.8, az=-70, d=0.8, gain=.7),                  # mist LEFT under Ieyasu's RIGHT whisper
    L(30.4, "I", "whisper", "殿は客人に見せびらかすのが、何よりお好きで。", "Nothing pleases my lord more than showing off to guests.", "whisper",
      tts="とのは、きゃくじんに、みせびらかすのが、なにより、おすきで。", tone="close at your RIGHT ear"),
    Y(38.8, "山の上のお城にも、行ってみたいです！", "I'd love to see the castle on the mountaintop!", 2.8),
    L(38.8, "C", "wind", dur=2.6, az=-64, d=1.2, gain=.55),

    # ── 二  The summit of Mt. Kinka: wind over the Nōbi plain ──────────────────────────────────
    L(41.8, "-", "bg", name="d9_bg_summit", dur=21.0),
    L(42.2, "N", "say", "よかろう！ 険しい道じゃ、遅れるなよ！", "Very well! It is a steep path — keep up!", "excited",
      tts="よかろう！ けわしい、みちじゃ、おくれるなよ！", pose="alert"),
    L(46.4, "C", "wind", dur=8.2, az=66, d=1.2, gain=1.0),                   # strong summit wind RIGHT while Nobunaga (LEFT) speaks
    L(46.8, "N", "say", "……見よ。濃尾の平野が、すべて見渡せる。ここから天下を取るのじゃ。",
      "…Behold. The whole Nōbi plain. From here I shall take the realm.", "proud",
      tts="……みよ。のうびの、へいやが、すべて、みわたせる。ここから、てんかを、とるのじゃ。", pose="stand"),
    L(55.0, "C", "wind", dur=7.6, az=-66, d=1.2, gain=1.0),                  # … swinging LEFT while Ieyasu (RIGHT) speaks
    L(55.2, "I", "say", "風が強うございますな。……良き眺めにござる。", "The wind is strong… A fine view indeed.", "calm",
      tts="かぜが、つようございますな。……よき、ながめに、ござる。", pose="wind"),

    # ── 三  Tea by Nobunaga's own hand, ice from the ice-house ─────────────────────────────────
    L(62.8, "-", "bg", name="d9_bg_tearoom", dur=20.0),
    L(63.0, "-", "prop", name="d9_prop_teabowl", dur=7.2),
    L(63.0, "F", "steam", dur=6.6, az=50, d=0.6, gain=1.0),                  # hot tea steam RIGHT while Nobunaga (LEFT) offers it
    L(63.2, "N", "say", "茶を点ててやろう。わし自ら、な。……熱いぞ。", "Let me make you tea — with my own hands. …It's hot.", "soft",
      tts="ちゃを、たててやろう。わし、みずから、な。……あついぞ。"),
    L(70.0, "-", "prop", name="d9_prop_ice", dur=10.0),
    L(70.0, "C", "chill", dur=8.4, az=-66, d=0.5, gain=1.0),                 # ice LEFT while Ieyasu (RIGHT) marvels
    L(70.2, "I", "say", "おお、夏に氷とは……氷室の氷でございますか！", "Oh, ice in summer… ice from the ice-house!", "surprise",
      tts="おお、なつに、こおりとは……ひむろの、こおりで、ございますか！", pose="offer"),
    Y(78.8, "冷たくて、気持ちいい……。", "So cold — it feels wonderful…", 2.6),
    L(78.8, "C", "chill", dur=2.8, az=66, d=0.5, gain=.8),                   # the ice handed to you: now on your RIGHT

    # ── 四  Night on the Nagara River: the fire boats ──────────────────────────────────────────
    L(82.8, "-", "bg", name="d9_bg_nagara_night", dur=67.2),
    L(83.4, "C", "wind", dur=5.0, az=62, d=1.4, gain=.6),                    # river breeze RIGHT while Nobunaga (LEFT) calls out
    L(84.0, "N", "say", "鵜飼じゃ。篝火の舟が来るぞ！", "Cormorant fishing! Here come the fire boats!", "excited",
      tts="うかいじゃ。かがりびの、ふねが、くるぞ！", pose="alert"),
    L(87.6, "N", "laugh", "わっはっは！", "Ha ha ha!", "laugh", tts="わっはっはっは", pose="laugh"),
    L(85.6, "-", "zoom", dur=24.0),                                          # camera pushes up to the open side of the pavilion (VIS zoomRect)
    L(89.0, "-", "boat", name="d9_prop_ukai_boat", dur=16.0, y=318, h=200, bgY=385, bgH=165, fireX=.9, fireY=.3),   # bg coords, clipped to the opening
    L(89.0, "F", "brazier", dur=16.0, az=-80, az1=80, d=1.3, gain=1.0),      # the fire basket's heat travels LEFT → RIGHT with the boat
    L(106.0, "C", "wind", dur=6.0, az=-60, d=1.3, gain=.7),                  # river breeze LEFT while Ieyasu (RIGHT) speaks
    L(106.0, "I", "say", "火と水が、こんなにも美しいとは……。", "Who knew fire and water could be so beautiful…", "thoughtful",
      tts="ひと、みずが、こんなにも、うつくしいとは……。"),
    Y(112.4, "……きれいですね。", "…It's beautiful.", 2.0),
    L(114.8, "C", "chill", dur=7.6, az=70, d=0.9, gain=.6),                  # night air RIGHT under Nobunaga's LEFT whisper
    L(114.8, "N", "whisper", "……天下が治まったら、また、こうして皆で舟を出したいものよ。",
      "…When the realm is at peace, I'd like us all out on the boats again, like this.", "whisper",
      tts="……てんかが、おさまったら、また、こうして、みなで、ふねを、だしたいものよ。", tone="close at your LEFT ear"),
    Y(123.0, "はい。また、みんなで。", "Yes — all of us, again.", 2.4),
    L(123.0, "C", "wind", dur=2.6, az=-60, d=1.3, gain=.55),

    # ── 五  A parting gift: 天下布武 ────────────────────────────────────────────────────────────
    L(126.0, "-", "prop", name="d9_prop_seal_paper", dur=12.0),
    L(126.0, "N", "say", "土産じゃ。わしの印を押してやろう。「天下布武」！", "A gift for you. Let me stamp my seal: \"Tenka Fubu\"!", "proud",
      tts="みやげじゃ。わしの、いんを、おしてやろう。てんかふぶ！", pose="invite"),
    Y(131.6, "……ありがとうございます。大切にします。", "…Thank you. I'll treasure it.", 3.0),
    L(131.6, "C", "wind", dur=3.0, az=62, d=1.3, gain=.55),
    L(135.0, "C", "wind", dur=4.0, az=-60, d=1.4, gain=.5),
    L(135.2, "I", "say", "また、お会いしましょうぞ。", "Until we meet again.", "polite", tts="また、おあいしましょうぞ。"),
    L(138.6, "-", "slip", dur=6.0),
    L(138.0, "-", "koto", dur=12.0, outro=True),
]

for _c in CUES:                                   # the first-meeting line is longer (10 s): everything after it moves 4.4 s later
    if _c["t"] > 7.5: _c["t"] = round(_c["t"] + 4.4, 2)
SCENES = [(t if t <= 7.5 else round(t + 4.4, 2), n, ja, en) for t, n, ja, en in SCENES]

# ---------------------------------------------------------------- player config (read by the shared demo.js)
VIS = dict(
    bgfx={"d9_bg_palace_garden": "mist", "d9_bg_nagara_night": "fireflies"}, zoomRect=[236, 110, 1304, 650],   # the river view between the pillars
    propNames={"d9_prop_teabowl": ["おうすの茶碗", "A bowl of matcha"], "d9_prop_ice": ["ひむろの氷", "Ice from the ice-house"],
               "d9_prop_seal_paper": ["「天下布武」の印", "The 'Tenka Fubu' seal"]},
    propSize={"d9_prop_teabowl": 260, "d9_prop_ice": 280, "d9_prop_seal_paper": 330}, steamy=["d9_prop_teabowl"], steamDx={}, nightGrade=0.0)

# ---------------------------------------------------------------- positions (t, az, d)
SEAT = {"N": (-38.0, 1.15), "I": (38.0, 1.15)}
EAR = {"N": (-87.0, 0.17), "I": (87.0, 0.17)}
PRESENT = {"N": (1.0, 147.6), "I": (1.2, 147.6)}
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


# ---------------------------------------------------------------- retime (2026-11-08): the film follows the ElevenLabs voices' natural
# length (no need to keep 150 s); make_voice.py writes audio/retime.json, every time above goes through W(). Script times: CUES0 / DURATION0.
import importlib.util as _iu, os as _os
_ROOT = _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__)))
_s = _iu.spec_from_file_location("retime", _os.path.join(_ROOT, "..", "..", "..", "tools", "eleven", "retime.py"))
_R = _iu.module_from_spec(_s); _s.loader.exec_module(_R); _R.apply(globals(), _ROOT)
