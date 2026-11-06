"""《雪与焰的悄悄话》 Whispers of Snow and Flame — single source of truth.

Every other tool reads this file: voice generation, binaural mix, thermal CSV,
subtitles and the web demo (via media/anim.json).

Coordinates (listener at the origin, looking forward):
  az  azimuth in degrees, 0 = front, +90 = right ear, -90 = left ear, ±180 = behind.
      Key-frames use *unwrapped* angles (e.g. 270 == -90) so motion direction is explicit.
  d   distance from the centre of the head in metres (0.15 ≈ whispering into the ear).
Characters: "K" = Koyuki 小雪 (cold), "H" = Homura 焔 (warm).
"""

DURATION = 150.0
SR = 48000

CHARACTERS = {
    "K": {"name_ja": "小雪", "name_en": "Koyuki", "name_zh": "小雪", "thermal": "cool",
          # macOS TTS (draft voice): Kyoko, slower and slightly raised
          "voice": "Kyoko", "rate": 150, "pitch": 1.05, "whisper_rate": 138},
    "H": {"name_ja": "焔", "name_en": "Homura", "name_zh": "小焰", "thermal": "heat",
          "voice": "Kyoko", "rate": 178, "pitch": 1.17, "whisper_rate": 160},
}

SCENES = [
    (0.0, "1", "小雪、はじめての登場", "Koyuki arrives"),
    (25.0, "2", "小雪のいたずら", "Koyuki's little trick"),
    (50.0, "3", "焔、乱入", "Homura bursts in"),
    (70.0, "4", "冷たい？あったかい？", "Cool vs. warm"),
    (95.0, "5", "冷と熱の追いかけっこ", "The chase"),
    (125.0, "6", "ないしょの魔法", "Secret magic"),
    (140.0, "7", "おやすみ", "Good night"),
]

# ---------------------------------------------------------------------------
# Cues.  kind:
#   say / whisper   spoken line (tts = reading for the synthesizer when it differs)
#   breath          style cold|warm, dur seconds, gain 0..1  (cold: "ふぅー", warm: "はぁ〜")
#   pant            tired breathing (character's own style)
#   magic           style ice|fire|whoosh, dur, gain
# expr drives the face in the web demo.
# ---------------------------------------------------------------------------
def L(t, who, kind, ja="", en="", zh="", expr="smile", tts=None, **kw):
    c = dict(t=t, who=who, kind=kind, ja=ja, en=en, zh=zh, expr=expr, tts=tts or ja)
    c.update(kw)
    return c

CUES = [
    # ── 1  0:00–0:25  Koyuki arrives ────────────────────────────────────────
    L(4.0, "K", "say", "こんばんは…。あ、まだ起きてたんだ。", "Good evening… Oh, you're still awake.", "晚上好…啊，你还醒着呀。", "smile"),
    L(7.8, "K", "say", "雪の音がきれいだったから…ちょっとだけ、遊びに来ちゃった。",
      "The snow sounded so pretty… so I came to play, just for a bit.", "雪的声音太好听了…所以就稍微过来玩一下。", "shy",
      tts="ゆきのおとがきれいだったから…ちょっとだけ、あそびにきちゃった。"),
    L(13.1, "K", "say", "わたし、小雪。雪女なの。", "I'm Koyuki. A snow spirit.", "我是小雪，是雪女哦。", "smile",
      tts="わたし、こゆき。ゆきおんななの。"),
    L(16.3, "K", "whisper", "ねえ…こっちの耳、ちょっと貸して？", "Hey… can I borrow this ear for a moment?", "呐…这边的耳朵，借我一下好吗？", "whisper",
      tts="ねえ…こっちのみみ、ちょっとかして？"),
    L(19.5, "K", "breath", "（ふぅー…）", "(fuuu…)", "（呼——…）", "blow", style="cold", dur=2.2, gain=1.0),
    L(22.1, "K", "say", "ふふっ…つめたかった？", "Hehe… was that cold?", "呵呵…凉不凉？", "happy"),

    # ── 2  0:25–0:50  Koyuki's trick: left / right ──────────────────────────
    L(25.0, "K", "say", "じゃあ…次はどっちから来るか、当ててみて。", "Then… guess which side I'll come from next.", "那…猜猜我下次从哪边来？", "smug",
      tts="じゃあ…つぎはどっちからくるか、あててみて。"),
    L(31.6, "K", "whisper", "…こっちでした。", "…This side.", "…是这边哦。", "whisper"),
    L(33.2, "K", "breath", "（ふっ…）", "(fuu…)", "（呼…）", "blow", style="cold", dur=1.1, gain=0.85),
    L(37.0, "K", "say", "えへへ、今度は左！", "Ehehe, now the left!", "嘿嘿，这次是左边！", "happy", tts="えへへ、こんどはひだり！"),
    L(39.0, "K", "breath", "（ふっ…）", "(fuu…)", "（呼…）", "blow", style="cold", dur=0.9, gain=0.75),
    L(41.4, "K", "whisper", "右…と見せかけて…", "Right… or so you thought…", "右边…才怪…", "smug", tts="みぎ…とみせかけて…"),
    L(44.5, "K", "whisper", "…ひだり。", "…Left.", "…左边。", "whisper"),
    L(45.5, "K", "breath", "（ふぅー…）", "(fuuu…)", "（呼——…）", "blow", style="cold", dur=1.9, gain=1.0),
    L(48.0, "K", "say", "ふふふっ。", "Fufufu.", "呵呵呵。", "laugh"),

    # ── 3  0:50–1:10  Homura bursts in ──────────────────────────────────────
    L(50.0, "H", "magic", "", "", "", "smug", style="whoosh", dur=1.6, gain=0.8),
    L(50.6, "H", "say", "ちょっとちょっと〜！ 小雪ばっかりずるいよ！", "Hey, hey! Not fair, Koyuki gets all the fun!", "喂喂～！只有小雪玩，太狡猾了吧！", "determined",
      tts="ちょっとちょっと〜！ こゆきばっかりずるいよ！"),
    L(54.4, "K", "say", "きゃっ！？", "Eek!?", "呀！？", "surprise"),
    L(55.4, "H", "say", "はいはい、ちょっと詰めて〜。", "Okay, okay, scoot over a little~", "好啦好啦，往那边挪一挪～", "smug", tts="はいはい、ちょっとつめて〜。"),
    L(58.2, "K", "say", "ほ、焔ちゃん…押さないでよぉ…", "H-Homura… don't push me…", "小、小焰…别挤我嘛…", "pout", tts="ほ、ほむらちゃん…おさないでよぉ…"),
    L(61.6, "H", "whisper", "はじめまして。わたしは焔。狐火の精だよ。", "Nice to meet you. I'm Homura, a foxfire spirit.", "初次见面，我是小焰，是狐火精灵哦。", "smile",
      tts="はじめまして。わたしは、ほむら。きつねびのせいだよ。"),
    L(65.8, "H", "whisper", "ほら…あったかいでしょ？", "See… nice and warm, right?", "你看…很暖和吧？", "smile"),
    L(67.2, "H", "magic", "", "", "", "smile", style="fire", dur=2.6, gain=0.55),
    L(67.4, "H", "breath", "（はぁ〜…）", "(haaa…)", "（哈——…）", "blow", style="warm", dur=2.2, gain=1.0),
    L(69.8, "H", "say", "にひひっ。", "Nihihi.", "嘻嘻。", "laugh"),

    # ── 4  1:10–1:35  Cool vs. warm (both ears at once, then swap) ──────────
    L(71.0, "K", "say", "つ、冷たいほうが気持ちいいよね…？", "C-cool feels nicer, right…?", "凉、凉凉的更舒服吧…？", "shy",
      tts="つ、つめたいほうがきもちいいよね…？"),
    L(74.0, "H", "say", "えー、あったかいほうがいいに決まってるでしょ！", "Nope, warm is obviously better!", "诶～当然是暖和的更好啦！", "determined",
      tts="えー、あったかいほうがいいにきまってるでしょ！"),
    L(77.4, "K", "breath", "（ふぅー…）", "(fuuu…)", "（呼——…）", "blow", style="cold", dur=2.0, gain=1.0),
    L(77.4, "H", "breath", "（はぁ〜…）", "(haaa…)", "（哈——…）", "blow", style="warm", dur=2.0, gain=1.0),
    L(80.0, "H", "say", "じゃあ交代！ 今度はわたしが左ね！", "Then let's switch! I get the left this time!", "那就交换！这次我在左边！", "happy",
      tts="じゃあこうたい！ こんどはわたしがひだりね！"),
    L(85.0, "K", "whisper", "こっち側も…ひんやり。", "This side's… nice and cool too.", "这边也…凉丝丝的。", "whisper", tts="こっちがわも…ひんやり。"),
    L(86.9, "K", "breath", "（ふぅ…）", "(fuu…)", "（呼…）", "blow", style="cold", dur=1.3, gain=0.85),
    L(88.5, "H", "whisper", "こっちも、ぽかぽか〜。", "And this side's toasty~", "这边也暖洋洋的～", "smile"),
    L(90.1, "H", "breath", "（はぁ…）", "(haa…)", "（哈…）", "blow", style="warm", dur=1.4, gain=0.85),
    L(91.8, "K", "say", "むぅ…負けないもん。", "Hmph… I won't lose.", "哼…我才不会输呢。", "pout", tts="むぅ…まけないもん。"),
    L(93.4, "H", "say", "ふふん、勝負だね！", "Heh, it's a contest then!", "哼哼，那就比一比吧！", "smug", tts="ふふん、しょうぶだね！"),

    # ── 5  1:35–2:05  The chase (continuous orbit) ──────────────────────────
    L(95.5, "H", "say", "まて〜っ！", "Get back here!", "站住～！", "determined"),
    L(96.6, "K", "say", "きゃー！ こないで〜！", "Eek! Don't chase me~!", "呀～！别过来～！", "laugh"),
    L(99.6, "H", "say", "つかまえちゃうぞ〜！", "I'm gonna catch you~!", "我要抓住你啦～！", "happy"),
    L(102.4, "K", "say", "あはは！ こっちこっち〜！", "Ahaha! Over here, over here~!", "啊哈哈！这边这边～！", "laugh"),
    L(105.0, "H", "breath", "（はぁっ）", "(haa!)", "（哈！）", "blow", style="warm", dur=0.9, gain=0.9),
    L(105.6, "K", "breath", "（ふっ）", "(fuu!)", "（呼！）", "blow", style="cold", dur=0.9, gain=0.9),
    L(107.6, "H", "say", "すばしっこいなぁ、もう！", "Ugh, you're so quick!", "真是的，跑得好快！", "pout"),
    L(110.1, "H", "breath", "（はぁっ）", "(haa!)", "（哈！）", "blow", style="warm", dur=0.9, gain=0.9),
    L(110.8, "K", "breath", "（ふっ）", "(fuu!)", "（呼！）", "blow", style="cold", dur=0.9, gain=0.9),
    L(112.6, "K", "say", "こっちだよ〜！", "Over here~!", "在这边哦～！", "happy"),
    L(114.4, "H", "say", "あっ、そっちか！", "Ah, there you are!", "啊，在那边！", "surprise"),
    L(117.0, "K", "pant", "（はぁ…はぁ…）", "(pant… pant…)", "（呼…呼…）", "pant", dur=2.2, gain=0.8),
    L(119.4, "H", "say", "つかまえた〜！ …なんてね。", "Gotcha~! …Just kidding.", "抓到啦～！…开玩笑的。", "smug"),
    L(122.2, "K", "say", "もう…ふふっ、楽しかった。", "Geez… hehe, that was fun.", "真是的…呵呵，好开心。", "happy",
      tts="もう…ふふっ、たのしかった。"),

    # ── 6  2:05–2:20  Secret magic together ─────────────────────────────────
    L(125.2, "H", "say", "ねえ小雪、いっしょにやろっか。", "Hey Koyuki, shall we do it together?", "呐小雪，我们一起来吧。", "smile",
      tts="ねえこゆき、いっしょにやろっか。"),
    L(128.0, "K", "say", "…うん。せーのっ…", "…Okay. Ready…", "…嗯。预备…", "shy"),
    L(130.0, "K", "say", "雪と焔の、ないしょの魔法！", "Our secret magic of snow and flame!", "雪与焰的秘密魔法！", "determined",
      tts="ゆきとほむらの、ないしょのまほう！", duet=True),
    L(130.0, "H", "say", "雪と焔の、ないしょの魔法！", "", "", "determined",
      tts="ゆきとほむらの、ないしょのまほう！", duet=True, nosub=True),
    L(132.6, "K", "magic", "", "", "", "happy", style="ice", dur=6.2, gain=0.9),
    L(132.6, "H", "magic", "", "", "", "happy", style="fire", dur=6.2, gain=0.9),
    L(135.6, "K", "say", "わぁ…きれい…", "Wow… so pretty…", "哇…好漂亮…", "happy"),
    L(137.6, "H", "say", "でしょ〜？", "Right~?", "对吧～？", "smug"),

    # ── 7  2:20–2:30  Good night ────────────────────────────────────────────
    L(140.3, "K", "whisper", "今夜は、遊んでくれて…ありがとう。", "Thank you… for playing with us tonight.", "今晚陪我们玩…谢谢你。", "sleepy",
      tts="こんやは、あそんでくれて…ありがとう。"),
    L(143.4, "H", "whisper", "また遊ぼうね。", "Let's play again sometime.", "下次再一起玩吧。", "smile", tts="また、あそぼうね。"),
    L(145.2, "K", "whisper", "おやすみなさい…", "Good night…", "晚安…", "sleepy"),
    L(146.6, "K", "breath", "（ふぅ…）", "(fuu…)", "（呼…）", "blow", style="cold", dur=1.8, gain=0.5),
    L(146.9, "H", "whisper", "おやすみ〜。", "Night-night~", "晚安～", "sleepy"),
    L(148.0, "H", "breath", "（はぁ…）", "(haa…)", "（哈…）", "blow", style="warm", dur=1.6, gain=0.45),
]

# Ambience / foley — spatialised but NEVER used for thermal control.
AMBIENCE_EVENTS = [
    dict(t=1.8, kind="door", az=0, d=3.2),
]
FOOTSTEPS = [(95.4, 117.2)]   # both characters patter on the tatami during the chase

# ---------------------------------------------------------------------------
# Spatial key-frames (t, az_unwrapped_deg, d_m).  Interpolated with PCHIP.
# ---------------------------------------------------------------------------
def _chase(az0, t0=96.0, t1=116.0, rate=36.0, step=0.25):
    """Orbit around the listener at `rate` deg/s; closer at the ears, farther front/back."""
    import math
    out, t = [], t0
    while t <= t1 + 1e-9:
        az = az0 + rate * (t - t0)
        d = 0.22 + 0.42 * math.cos(math.radians(az)) ** 2
        out.append((round(t, 3), az, d))
        t += step
    return out

KEYS = {
    "K": [
        (0.0, 0, 6.0), (1.8, 0, 3.4), (4.0, 0, 2.8), (8.0, -10, 2.0), (11.6, -20, 1.2),
        (15.4, -80, 0.32), (18.6, -88, 0.18), (21.6, -88, 0.16), (23.6, -60, 0.45),
        (25.0, -50, 0.6), (28.4, -90, 0.5), (30.2, -180, 0.7), (31.3, -270, 0.28), (34.6, -270, 0.22),
        (35.6, -180, 0.6), (36.8, -90, 0.3), (39.8, -86, 0.28), (40.5, -20, 0.6), (41.3, 80, 0.3),
        (43.4, 82, 0.3), (43.9, 0, 0.5), (44.4, -85, 0.2), (47.2, -88, 0.18), (48.6, -40, 0.6),
        (54.2, -30, 0.6), (55.4, -70, 0.9), (60.0, -60, 1.0), (68.0, -50, 0.9),
        (70.4, -80, 0.3), (81.6, -82, 0.26),
        (83.0, 0, 0.8), (84.5, 82, 0.24), (94.0, 85, 0.25), (95.6, 88, 0.35),
        *_chase(90.0),
        (118.5, 790, 0.7), (121.0, 780, 0.5), (125.0, 765, 0.5), (132.4, 765, 0.45),
        (139.0, 675, 0.45), (140.2, 635, 0.2), (147.4, 635, 0.18), (150.0, 635, 1.6),
    ],
    "H": [
        (0.0, 110, 6.0), (49.6, 110, 4.0), (50.0, 110, 2.5), (52.6, 60, 1.0), (55.4, 15, 0.55),
        (58.4, 20, 0.6), (61.2, 85, 0.25), (69.0, 88, 0.2), (70.4, 85, 0.3), (81.6, 85, 0.26),
        (83.0, 180, 0.8), (84.5, 275, 0.24), (94.0, 275, 0.25), (95.6, 285, 0.35),
        *_chase(290.0),
        (118.5, 1015, 0.7), (121.0, 1020, 0.5), (125.0, 1035, 0.5), (132.4, 1035, 0.45),
        (139.0, 765, 0.45), (140.2, 805, 0.2), (147.4, 805, 0.18), (150.0, 805, 1.6),
    ],
}

# When each character is on stage (for visuals; fades 0.6 s at the edges).
PRESENT = {"K": (1.6, 150.0), "H": (49.8, 150.0)}


def positions(times):
    """Return {who: (az_deg_wrapped[-180,180), d_m)} arrays sampled at `times`."""
    import numpy as np
    from scipy.interpolate import PchipInterpolator
    out = {}
    for who, keys in KEYS.items():
        ks = sorted(keys)
        t = np.array([k[0] for k in ks]); az = np.array([k[1] for k in ks], float); d = np.array([k[2] for k in ks], float)
        a = PchipInterpolator(t, az)(times)
        dd = np.clip(PchipInterpolator(t, d)(times), 0.12, 8.0)
        out[who] = (((a + 180.0) % 360.0) - 180.0, dd)
    return out
