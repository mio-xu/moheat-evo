"""Demo 8《信長と家康、山崎蒸溜所へ》— script + timeline (draft timings, re-laid after voicing).
N = Nobunaga front-LEFT (voice → L heat), I = Ieyasu front-RIGHT (voice → R heat), Y = you, the guide (subtitles only).
Shot ids (Y01…) match Seedance素材命令.md."""
from cues_common import L, Y, NAMES

DURATION, SR = 150.0, 48000
TITLE = {"ja": "信長と家康、山崎蒸溜所へ", "en": "Two Warlords at the Yamazaki Distillery"}

CUES = [
    L(6.2, "N", "say", "霧の谷か……妙に、良い香りがするのう。", "A misty valley… and a strangely good scent.", "suspicious",
      tts="きりの、たにか……みょうに、よい、かおりがするのう。", shot="Y02"),
    L(12.2, "I", "say", "水の音がいたします。名水の地でございますな。", "I hear water. This must be a land of fine springs.", "calm",
      tts="みずの、おとが、いたします。めいすいの、ちで、ございますな。", shot="Y02"),
    Y(17.2, "ここは、ウイスキーが生まれる場所です。", "This is where whisky is born.", 3.4),
    L(21.4, "I", "say", "大きな桶が、ぷくぷくと息をしておる。", "Great tubs, breathing and bubbling.", "surprise",
      tts="おおきな、おけが、ぷくぷくと、いきを、しておる。", shot="Y03"),
    L(30.2, "I", "whisper", "麦の、甘い香りでございますよ。", "It smells of sweet barley.", "whisper",
      tts="むぎの、あまい、かおりで、ございますよ。", tone="close at your RIGHT ear", shot="Y03"),
    L(38.2, "N", "say", "なんと！ 銅の巨大な兜が、ずらりと並んでおる！", "Look! Giant copper helmets, all in a row!", "excited",
      tts="なんと！ どうの、きょだいな、かぶとが、ずらりと、ならんでおる！", shot="Y04"),
    L(46.2, "N", "say", "熱い！ 鍛冶場より熱いぞ！", "Hot! Hotter than a smithy!", "excited",
      tts="あつい！ かじばより、あついぞ！", shot="Y04"),
    L(49.6, "N", "laugh", "わっはっは！", "Ha ha ha!", "laugh", tts="わっはっはっは", shot="Y04"),
    L(54.2, "I", "say", "炎で酒を……雲に変えて、また雫に戻すのか。", "Turning sake into cloud with fire… and back into drops.", "thoughtful",
      tts="ほのおで、さけを……くもに、かえて、また、しずくに、もどすのか。", shot="Y05"),
    Y(60.4, "次は、熟成庫です。", "Next, the cask warehouse.", 2.6),
    L(64.4, "N", "say", "……静かじゃ。樽が、眠っておる。", "…So quiet. The casks are sleeping.", "soft",
      tts="……しずかじゃ。たるが、ねむっておる。", shot="Y06"),
    L(74.2, "I", "whisper", "天使の分け前、と申すそうです。", "They call it the angels' share.", "whisper",
      tts="てんしの、わけまえ、と、もうすそうです。", tone="close at your RIGHT ear", shot="Y07"),
    L(82.2, "N", "whisper", "天使め、わしより先に飲むとは。", "Those angels drink before me?", "whisper",
      tts="てんしめ、わしより、さきに、のむとは。", tone="close at your LEFT ear", shot="Y07"),
    L(90.2, "I", "say", "冷たい……澄んだ水じゃ。この水が、酒の命か。", "Cold… such clear water. This water is the soul of the sake.", "surprise",
      tts="つめたい……すんだ、みずじゃ。このみずが、さけの、いのちか。", shot="Y08"),
    Y(100.2, "一杯目は、そのまま香りを。", "First, just smell it, neat.", 2.8),
    L(108.2, "N", "say", "……待て。この香り、覚えがあるぞ。", "…Wait. I know this scent.", "suspicious",
      tts="……まて。このかおり、おぼえが、あるぞ。", shot="Y09"),
    L(116.2, "I", "say", "殿、あの夜……安土で、この方が持ってきた酒では！", "My lord — that night at Azuchi… the sake this one brought us!", "surprise",
      tts="との、あのよる……あづちで、このかたが、もってきた、さけでは！", shot="Y10"),
    L(124.2, "N", "say", "そうか、ここで生まれておったのか！", "So this is where it was born!", "excited",
      tts="そうか、ここで、うまれておったのか！", shot="Y10"),
    L(127.6, "N", "laugh", "わっはっは！", "Ha ha ha!", "laugh", tts="わっはっはっは", shot="Y10"),
    L(132.2, "N", "say", "乾杯じゃ！", "Cheers!", "excited", tts="かんぱいじゃ！", shot="Y11"),
    L(132.6, "I", "say", "乾杯！", "Cheers!", "polite", tts="かんぱい！", shot="Y11"),
    L(134.6, "I", "laugh", "ほっほっほ。", "Ho ho ho.", "chuckle", tts="ほっほっほ", shot="Y11"),
    L(140.2, "I", "say", "一樽、安土へ持ち帰りとうございますな。", "I would like to take a cask home to Azuchi.", "polite",
      tts="ひとたる、あづちへ、もちかえりとう、ございますな。", shot="Y12"),
]
