"""Demo 4 voice personas (v2): historically fitting delivery for Nobunaga (48 in 1582) and Ieyasu (39), plus a natural
laugh built mora-by-mora instead of reading 「ふはははは」 as text.  Needs the VOICEVOX engine.

  python3 scripts/voice_personas.py   → audio/audition/v3/*.wav

Persona = VOICEVOX speaker + per-emotion style/prosody + post-processing:
  chest  : low-shelf warmth (+dB around 120–250 Hz)      → mature, resonant
  grit   : soft saturation of the 300–2500 Hz band, mixed → slightly rough, commanding (Nobunaga)
  dark   : gentle high cut                               → older, softer edge (Ieyasu)
  tremor : slow amplitude / breathy wobble               → age (Ieyasu, very subtle)
"""
import json, os, sys, urllib.parse, urllib.request
import numpy as np
from scipy import signal
from scipy.io import wavfile
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from demo1 import load
B = load("build_audio"); VV = B.VV
SR = 48000

N_LINES = [("そなたも、こちらへ。", "invite"), ("こよいは、ともにのもうぞ！", "excited"), ("どうした、まだのめるであろう？", "tease"),
           ("……みょうな、けはいじゃ。", "suspicious"), ("LAUGH", "laugh")]
I_LINES = [("さあ、こちらもいっこん。", "hospitality"), ("ゆるりと、おたのしみくだされ。", "calm"), ("むりはなさらず。まずは、ひとくち。", "concern"),
           ("おや……かぜが、つようなりましたな。", "surprise"), ("CHUCKLE", "chuckle")]

# emotion → (speed, pitch offset, intonation, volume, whisper)
N_PROS = {"invite": (.92, 0, 1.2, 1.0, False), "excited": (1.02, .02, 1.45, 1.2, False), "tease": (.95, .01, 1.35, .9, False),
          "suspicious": (.8, -.02, .75, .6, True)}
I_PROS = {"hospitality": (.88, 0, 1.05, .95, False), "calm": (.84, -.01, .9, .85, False), "concern": (.86, 0, 1.0, .75, True),
          "surprise": (.9, .02, 1.15, .95, False)}

PERSONAS = {
    # final: Nobunaga = 青山龍星 (user's pick, 2026-11-07)
    "信長_青山龍星": dict(speaker="青山龍星", pitch=-.03, lines=N_LINES, pros=N_PROS, chest=4, grit=.22, dark=0, tremor=0,
                       styles=dict(invite="ノーマル", excited="熱血", tease="喜び", suspicious="囁き"), laugh=dict(base=150, drop=.72, n=5, style="熱血")),
    # deeper Nobunaga (user: "not low enough"): lower VOICEVOX pitch + post pitch shift
    **{f"信長_青山龍星_低沈{st:g}": dict(speaker="青山龍星", pitch=-.06, shift=st, lines=N_LINES, pros=N_PROS, chest=5, grit=.24, dark=0, tremor=0,
                                    styles=dict(invite="ノーマル", excited="熱血", tease="喜び", suspicious="囁き"),
                                    laugh=dict(base=145, drop=.72, n=5, style="熱血")) for st in (-1.5, -3.0, -4.5)},
    # Ieyasu = 黒沢冴白, deeper: VOICEVOX pitch near its floor + post pitch shift (semitones)
    "家康_黒沢冴白_低沈-2": dict(speaker="黒沢冴白", pitch=-.1, shift=-2.0, lines=I_LINES, pros=I_PROS, chest=5, grit=.08, dark=5200, tremor=.02,
                            styles={}, speed_mul=.88, laugh=dict(base=112, drop=.84, n=3, style="ノーマル")),
    "家康_黒沢冴白_低沈-3.5": dict(speaker="黒沢冴白", pitch=-.1, shift=-3.5, lines=I_LINES, pros=I_PROS, chest=5, grit=.1, dark=5000, tremor=.025,
                              styles={}, speed_mul=.86, laugh=dict(base=112, drop=.84, n=3, style="ノーマル")),
    "家康_黒沢冴白_低沈-5": dict(speaker="黒沢冴白", pitch=-.1, shift=-5.0, lines=I_LINES, pros=I_PROS, chest=6, grit=.12, dark=4800, tremor=.03,
                            styles={}, speed_mul=.85, laugh=dict(base=112, drop=.84, n=3, style="ノーマル")),
}


# FINAL voices (chosen by the user, 2026-11-07) — use these for the real dialogue
FINAL = {"N": "信長_青山龍星", "I": "家康_黒沢冴白_低沈-2"}


def shift(x, semis):
    """Lower the pitch by `semis` semitones keeping the tempo (ffmpeg asetrate + atempo). Formants drop too → deeper, older."""
    if not semis: return x
    import subprocess, tempfile
    r = 2 ** (semis / 12)
    with tempfile.TemporaryDirectory() as d:
        a, b = os.path.join(d, "a.wav"), os.path.join(d, "b.wav")
        wavfile.write(a, SR, x.astype(np.float32))
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", a, "-af", f"asetrate={SR * r:.3f},aresample={SR},atempo={1 / r:.5f}",
                        "-c:a", "pcm_f32le", b], check=True)
        return wavfile.read(b)[1].astype(np.float64)


def post(x, p):
    x = shift(x, p.get("shift", 0))
    if p["chest"]:
        lo = signal.sosfilt(signal.butter(2, [110, 260], "bandpass", fs=SR, output="sos"), x)
        x = x + lo * (10 ** (p["chest"] / 20) - 1)
    if p["grit"]:
        band = signal.sosfilt(signal.butter(2, [300, 2500], "bandpass", fs=SR, output="sos"), x)
        sat = np.tanh(band * 6) / 6
        x = x + p["grit"] * (sat - band) * 4
    if p["dark"]:
        x = .55 * x + .45 * signal.sosfilt(signal.butter(2, p["dark"], "lowpass", fs=SR, output="sos"), x)
    if p["tremor"]:
        t = np.arange(len(x)) / SR
        x = x * (1 + p["tremor"] * np.sin(2 * np.pi * 5.2 * t + np.sin(2 * np.pi * .7 * t)))
    return x


def laugh(p, kana):
    """Hearty laugh: 'ha' syllables with falling pitch, short vowels, glottal stops (ッ) between, + exhaled air."""
    L = p["laugh"]; sid = VV.style_id(p["speaker"], L["style"])
    q = urllib.parse.urlencode({"text": kana, "speaker": sid})
    with urllib.request.urlopen(urllib.request.Request(f"{VV.URL}/audio_query?{q}", method="POST"), timeout=60) as r: query = json.load(r)
    k = 0
    for ap in query["accent_phrases"]:
        for m in ap["moras"]:
            if m["vowel"] == "cl":            # ッ: the little catch between laughs
                m["vowel_length"] = .07; m["pitch"] = 0.0; continue
            hz = L["base"] * (L["drop"] ** (k / max(1, L["n"] - 1)))
            m["pitch"] = float(np.log(hz)); m["vowel_length"] = .1 + (.18 if k == L["n"] - 1 else 0)
            if m.get("consonant_length") is not None: m["consonant_length"] = .05
            k += 1
        ap["pause_mora"] = None
    query.update(speedScale=1.0, pitchScale=0, intonationScale=1, volumeScale=1.1, prePhonemeLength=.08, postPhonemeLength=.15, outputSamplingRate=SR, outputStereo=False)
    req = urllib.request.Request(f"{VV.URL}/synthesis?speaker={sid}", data=json.dumps(query).encode(), headers={"Content-Type": "application/json"}, method="POST")
    import io
    with urllib.request.urlopen(req, timeout=120) as r: _, x = wavfile.read(io.BytesIO(r.read()))
    x = x.astype(np.float64) / 32768
    env = B.env_follow(x, 25)
    air = signal.sosfilt(signal.butter(2, [700, 4500], "bandpass", fs=SR, output="sos"), np.random.default_rng(1).standard_normal(len(x))) * env * 1.4
    return x * .85 + air


def perform(name, p):
    out = []
    for text, emo in p["lines"]:
        if text == "LAUGH": x = laugh(p, "はっはっはっはっは")
        elif text == "CHUCKLE": x = laugh(p, "ほっほっほ")
        else:
            sp, pi, it, vol, whisper = p["pros"][emo]
            st = p["styles"].get(emo, "ノーマル")
            VV.CAST["X"] = dict(speaker=p["speaker"], speed=sp * p.get("speed_mul", 1), pitch=p["pitch"] + pi, inton=it, pause=.5, tone=None,
                                styles=dict(default=st, smile=st, whisper=st, sleepy=st))
            x, _ = VV.synth(text, "X", "say", "smile")
            if whisper and "囁" not in st: x = .6 * x + .5 * B.whisperize(x)
            x = x * vol
        x = post(x, p)
        out += [x / (np.max(np.abs(x)) + 1e-9) * .9 * (1.0 if text in ("LAUGH", "CHUCKLE") else 1), np.zeros(16000)]
    return np.concatenate(out)


def main(only=None):
    d = os.path.join(ROOT, "audio", "audition", "v4" if only else "v3"); os.makedirs(d, exist_ok=True)
    for name, p in PERSONAS.items():
        if only and not any(o in name for o in only): continue
        y = perform(name, p)
        wavfile.write(os.path.join(d, f"{name}.wav"), SR, (np.clip(y, -1, 1) * 32767).astype(np.int16)); print("wrote", name)


if __name__ == "__main__":
    main(sys.argv[1:] or None)       # e.g. python3 scripts/voice_personas.py 低沈 → only the matching personas (→ v4/)
