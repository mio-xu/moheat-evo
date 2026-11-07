"""Demo 7《信長と家康、京都の居酒屋へ》— script + timeline (single source of truth; draft timings, re-laid after voicing).
N = Nobunaga front-LEFT (voice → L heat), I = Ieyasu front-RIGHT (voice → R heat), Y = you (subtitles only).
Shot ids (K01…) match Seedance素材命令.md."""
from cues_common import L, Y, NAMES

DURATION, SR = 150.0, 48000
TITLE = {"ja": "信長と家康、京都の居酒屋へ", "en": "Two Warlords in a Kyoto Izakaya"}

CUES = [
    L(4.2, "N", "say", "……ここは、どこじゃ。灯りが、星のように多い。", "…Where is this? So many lights, like stars.", "soft",
      tts="……ここは、どこじゃ。あかりが、ほしのように、おおい。", shot="K02"),
    L(9.0, "I", "say", "殿、空気が冷とうございます。……されど、良い匂いが。", "My lord, the air is cold… yet something smells good.", "concern",
      tts="との、くうきが、つめとうございます。……されど、よい、においが。", shot="K02"),
    Y(13.2, "寒いでしょう。入りましょう！", "Cold, isn't it? Let's go in!", 2.6),
    L(16.2, "N", "say", "ほう、ここが今の世の酒場か。狭いが、活気があるのう！", "So this is a tavern of the new age. Small, but full of life!", "proud",
      tts="ほう、ここが、いまのよの、さかばか。せまいが、かっきが、あるのう！", shot="K03"),
    L(24.2, "N", "say", "樽から黄金の酒が湧き出ておる！ なんじゃ、この泡は！", "Golden sake pouring from a barrel! What is this foam!?", "excited",
      tts="たるから、おうごんの、さけが、わきでておる！ なんじゃ、このあわは！", shot="K04"),
    Y(30.0, "かんぱーい！", "Cheers!", 1.6),
    L(30.8, "N", "say", "乾杯じゃ！", "Cheers!", "excited", tts="かんぱいじゃ！", shot="K05"),
    L(31.2, "I", "say", "乾杯！", "Cheers!", "polite", tts="かんぱい！", shot="K05"),
    L(36.0, "N", "say", "……冷たい！ だが、うまい！", "…Cold! But delicious!", "excited", tts="……つめたい！ だが、うまい！", shot="K05"),
    L(39.0, "N", "laugh", "わっはっは！", "Ha ha ha!", "laugh", tts="わっはっはっは", shot="K05"),
    L(42.4, "I", "say", "炭の焼き物でございますな。熱いうちに。", "Charcoal-grilled. Eat it while it's hot.", "polite",
      tts="すみの、やきものでございますな。あついうちに。", shot="K06"),
    L(50.0, "I", "whisper", "殿は猫舌ゆえ、ふーふーして差し上げましょう。", "My lord has a cat's tongue — let's blow on it for him.", "whisper",
      tts="とのは、ねこじたゆえ、ふーふーして、さしあげましょう。", tone="close at your RIGHT ear", shot="K07"),
    L(56.4, "N", "say", "聞こえておるぞ、家康！", "I can hear you, Ieyasu!", "tease", tts="きこえておるぞ、いえやす！", shot="K07"),
    L(62.4, "N", "say", "こちらは何じゃ。氷が鳴っておる……しゅわしゅわと。", "And what's this? The ice is singing… fizzing.", "suspicious",
      tts="こちらは、なんじゃ。こおりが、なっておる……しゅわしゅわと。", shot="K08"),
    L(70.0, "N", "say", "喉が、凍るほど爽やかじゃ！", "So refreshing my throat could freeze!", "excited",
      tts="のどが、こおるほど、さわやかじゃ！", shot="K08"),
    L(76.2, "I", "say", "わしは熱燗を。……ああ、腹の底から温まる。", "Hot sake for me… ah, it warms me to the core.", "calm",
      tts="わしは、あつかんを。……ああ、はらのそこから、あたたまる。", shot="K09"),
    L(84.2, "N", "whisper", "家康め、四百年経っても慎重よのう。", "Ieyasu — still cautious after four hundred years.", "whisper",
      tts="いえやすめ、よんひゃくねん、たっても、しんちょうよのう。", tone="close at your LEFT ear", shot="K10"),
    Y(92.0, "窓を開けると、鴨川が見えますよ。", "Open the window and you can see the Kamo River.", 3.0),
    L(98.2, "I", "say", "京の灯りが、川に映って……天下は、こうなったか。", "The lights of Kyoto on the river… so this is what the realm became.", "thoughtful",
      tts="きょうの、あかりが、かわに、うつって……てんかは、こうなったか。", shot="K11"),
    L(108.2, "N", "say", "誰も刀を差しておらぬ。……良い世じゃ。", "No one carries a sword… It is a good age.", "soft",
      tts="だれも、かたなを、さしておらぬ。……よいよじゃ。", shot="K11"),
    Y(116.2, "最後に、ハイボールで乾杯しましょう！", "One last toast, with a highball!", 3.0),
    L(124.2, "N", "say", "未来に、乾杯じゃ！", "To the future!", "excited", tts="みらいに、かんぱいじゃ！", shot="K12"),
    L(125.0, "I", "say", "未来に、乾杯！", "To the future!", "polite", tts="みらいに、かんぱい！", shot="K12"),
    L(127.4, "N", "laugh", "わっはっは！", "Ha ha ha!", "laugh", tts="わっはっはっは", shot="K12"),
    L(128.0, "I", "laugh", "ほっほっほ。", "Ho ho ho.", "chuckle", tts="ほっほっほ", shot="K12"),
    L(132.2, "I", "say", "楽しい夜でございました。また、呼んでくだされ。", "It was a joyful night. Call us again.", "polite",
      tts="たのしい、よるで、ございました。また、よんでくだされ。", shot="K13"),
    L(140.0, "N", "say", "次は、わしの城に来い。うまい酒を持ってな！", "Next time, come to my castle — and bring good sake!", "invite",
      tts="つぎは、わしの、しろにこい。うまいさけを、もってな！", shot="K13"),
]
