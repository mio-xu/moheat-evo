"""Demo 9 voice audition: each candidate voice performs the spec's sample lines with a per-line emotion
(style + tempo + pitch + intonation + volume + whisper treatment).  Needs the VOICEVOX engine.
  python3 scripts/voice_audition.py   → audio/audition/{信長,家康}_<voice>.wav
"""
import os, sys
import numpy as np
from scipy.io import wavfile
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from demo1 import load
B = load("build_audio"); VV = B.VV

# (text for the synthesiser, emotion key)
N_LINES = [("そなたも、こちらへ。", "invite"), ("こよいは、ともにのもうぞ！", "excited"), ("どうした、まだのめるであろう？", "tease"),
           ("……みょうな、けはいじゃ。", "suspicious"), ("ふはははは！", "laugh")]
I_LINES = [("さあ、こちらもいっこん。", "hospitality"), ("ゆるりと、おたのしみくだされ。", "calm"), ("むりはなさらず。まずは、ひとくち。", "concern"),
           ("おや……かぜが、つようなりましたな。", "surprise")]
# emotion → prosody (speed, pitch, intonation, volume, whisper?)
PROSODY = {
    "invite": (0.95, 0.0, 1.25, 1.0, False), "excited": (1.08, 0.03, 1.55, 1.25, False), "tease": (1.0, 0.01, 1.4, 0.9, False),
    "suspicious": (0.82, -0.03, 0.8, 0.6, True), "laugh": (1.0, 0.04, 1.6, 1.3, False),
    "hospitality": (0.92, 0.0, 1.15, 0.95, False), "calm": (0.86, -0.01, 1.0, 0.85, False), "concern": (0.92, 0.0, 1.15, 0.75, True),
    "surprise": (0.95, 0.02, 1.3, 0.95, False),
}
# candidate voice → style per emotion (styles that the voice really has; others fall back to its first style)
N_CANDS = {
    "青山龍星": dict(invite="ノーマル", excited="熱血", tease="喜び", suspicious="囁き", laugh="熱血"),
    "玄野武宏": dict(invite="ノーマル", excited="喜び", tease="喜び", suspicious="ノーマル", laugh="喜び"),
    "剣崎雌雄": {}, "麒ヶ島宗麟": {}, "離途": dict(suspicious="シリアス"),
}
I_CANDS = {
    "雀松朱司": {}, "麒ヶ島宗麟": {}, "玄野武宏": dict(surprise="ノーマル", hospitality="ノーマル"),
    "青山龍星": dict(hospitality="しっとり", calm="しっとり", concern="囁き", surprise="ノーマル"),
    "暁記ミタマ": dict(concern="ささやき"), "黒沢冴白": {},
}


def perform(voice, styles, lines):
    out = []
    for text, emo in lines:
        sp, pi, it, vol, whisper = PROSODY[emo]
        st = styles.get(emo, "ノーマル")
        VV.CAST["X"] = dict(speaker=voice, speed=sp, pitch=pi, inton=it, pause=0.45, tone=None,
                            styles=dict(default=st, smile=st, whisper=st, sleepy=st))
        x, _ = VV.synth(text, "X", "say", "smile")
        if whisper and "囁" not in st and "ささやき" not in st:
            x = 0.6 * x + 0.5 * B.whisperize(x)
        out += [x / (np.max(np.abs(x)) + 1e-9) * 0.9 * vol / 1.3, np.zeros(16000)]
    return np.concatenate(out)


def main():
    d = os.path.join(ROOT, "audio", "audition"); os.makedirs(d, exist_ok=True)
    for who, cands, lines in (("信長", N_CANDS, N_LINES), ("家康", I_CANDS, I_LINES)):
        for voice, styles in cands.items():
            try:
                y = perform(voice, styles, lines)
                wavfile.write(os.path.join(d, f"{who}_{voice}.wav"), 48000, (np.clip(y, -1, 1) * 32767).astype(np.int16)); print("wrote", who, voice)
            except Exception as e:
                print("skip", who, voice, e)


if __name__ == "__main__":
    main()
