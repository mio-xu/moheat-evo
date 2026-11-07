"""Demo 9《信長の岐阜城へようこそ》— script + timeline (draft timings, re-laid after voicing).
N = Nobunaga front-LEFT (voice → L heat), I = Ieyasu front-RIGHT (voice → R heat), Y = you, a guest from the future
(subtitles only). Shot ids (G01…) match Seedance素材命令.md."""
from cues_common import L, Y, NAMES

DURATION, SR = 150.0, 48000
TITLE = {"ja": "信長の岐阜城へようこそ", "en": "Welcome to Nobunaga's Gifu Castle"}

CUES = [
    L(7.2, "N", "say", "よう来た、未来の客人よ！ ここが、わしの岐阜じゃ。", "Welcome, guest from the future! This is my Gifu.", "invite",
      tts="ようきた、みらいの、きゃくじんよ！ ここが、わしの、ぎふじゃ。", shot="G02"),
    L(15.2, "I", "say", "わしも招かれた身でござる。殿の自慢話は長うございますぞ。", "I am a guest too. My lord's boasting runs long, I warn you.", "polite",
      tts="わしも、まねかれた、みで、ござる。とのの、じまんばなしは、ながうございますぞ。", shot="G02"),
    L(21.4, "N", "say", "見よ、この庭と滝を。南蛮の伴天連も、口を開けて驚いておったわ。",
      "Look at this garden and waterfall. Even the southern missionary stood here open-mouthed.", "proud",
      tts="みよ、このにわと、たきを。なんばんの、ばてれんも、くちを、あけて、おどろいておったわ。", shot="G03"),
    L(30.4, "I", "whisper", "殿は客人に見せびらかすのが、何よりお好きで。", "Nothing pleases my lord more than showing off to guests.", "whisper",
      tts="とのは、きゃくじんに、みせびらかすのが、なにより、おすきで。", tone="close at your RIGHT ear", shot="G03"),
    Y(38.2, "山の上のお城にも、行ってみたいです！", "I'd love to see the castle on the mountaintop!", 3.2),
    L(44.2, "N", "say", "よかろう！ 険しい道じゃ、遅れるなよ！", "Very well! It is a steep path — keep up!", "excited",
      tts="よかろう！ けわしい、みちじゃ、おくれるなよ！", shot="G04"),
    L(52.2, "N", "say", "……見よ。濃尾の平野が、すべて見渡せる。ここから天下を取るのじゃ。",
      "…Behold. The whole Nōbi plain. From here I shall take the realm.", "proud",
      tts="……みよ。のうびの、へいやが、すべて、みわたせる。ここから、てんかを、とるのじゃ。", shot="G05"),
    L(62.2, "I", "say", "風が強うございますな。……良き眺めにござる。", "The wind is strong… A fine view indeed.", "calm",
      tts="かぜが、つようございますな。……よき、ながめに、ござる。", shot="G05"),
    L(68.2, "N", "say", "茶を点ててやろう。わし自ら、な。……熱いぞ。", "Let me make you tea — with my own hands. …It's hot.", "soft",
      tts="ちゃを、たててやろう。わし、みずから、な。……あついぞ。", shot="G06"),
    L(78.2, "I", "say", "おお、夏に氷とは……氷室の氷でございますか！", "Oh, ice in summer… ice from the ice-house!", "surprise",
      tts="おお、なつに、こおりとは……ひむろの、こおりで、ございますか！", shot="G06"),
    L(92.2, "N", "say", "鵜飼じゃ。篝火の舟が来るぞ！", "Cormorant fishing! Here come the fire boats!", "excited",
      tts="うかいじゃ。かがりびの、ふねが、くるぞ！", shot="G07"),
    L(95.4, "N", "laugh", "わっはっは！", "Ha ha ha!", "laugh", tts="わっはっはっは", shot="G07"),
    L(114.2, "I", "say", "火と水が、こんなにも美しいとは……。", "Who knew fire and water could be so beautiful…", "thoughtful",
      tts="ひと、みずが、こんなにも、うつくしいとは……。", shot="G08"),
    L(122.2, "N", "whisper", "……天下が治まったら、また、こうして皆で舟を出したいものよ。",
      "…When the realm is at peace, I'd like us all out on the boats again, like this.", "whisper",
      tts="……てんかが、おさまったら、また、こうして、みなで、ふねを、だしたいものよ。", tone="close at your LEFT ear", shot="G09"),
    L(132.2, "N", "say", "土産じゃ。わしの印を押してやろう。「天下布武」！", "A gift for you. Let me stamp my seal: \"Tenka Fubu\"!", "proud",
      tts="みやげじゃ。わしの、いんを、おしてやろう。てんかふぶ！", shot="G10"),
    L(142.2, "I", "say", "また、お会いしましょうぞ。", "Until we meet again.", "polite", tts="また、おあいしましょうぞ。", shot="G11"),
]
