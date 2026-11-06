"""VOICEVOX backend for the character voices (emotional anime voices, whisper styles).

Run the VOICEVOX engine first (see README → Voices), it listens on http://127.0.0.1:50021.
  python3 tools/tts_voicevox.py --speakers      list voices and styles
  python3 tools/tts_voicevox.py --audition      write output/audition/*.wav to compare candidate voices

Credits are required by the voice terms: shown in the demo as "VOICEVOX:<name>".
"""
import io, json, os, sys, urllib.parse, urllib.request
import numpy as np
from scipy import signal
from scipy.io import wavfile

URL = os.environ.get("VOICEVOX_URL", "http://127.0.0.1:50021")

# Character → VOICEVOX speaker, style per expression, prosody.  Change speakers here (see --audition).
CAST = {
    "K": dict(speaker="九州そら", speed=1.02, pitch=0.02, inton=1.25,
              styles=dict(default="あまあま", smile="あまあま", happy="あまあま", laugh="あまあま", shy="あまあま",
                          smug="ノーマル", surprise="ノーマル", pout="ツンツン", determined="ノーマル",
                          whisper="ささやき", sleepy="ささやき")),
    "H": dict(speaker="四国めたん", speed=1.08, pitch=0.04, inton=1.4,
              styles=dict(default="ノーマル", smile="あまあま", happy="ノーマル", laugh="あまあま", shy="あまあま",
                          smug="ツンツン", surprise="ノーマル", pout="ツンツン", determined="ツンツン",
                          whisper="ささやき", sleepy="ささやき")),
}
WHISPER_STYLES = ("ささやき", "ヒソヒソ")
PAUSE_MAX = 0.4   # s


def _get(path):
    with urllib.request.urlopen(URL + path, timeout=5) as r: return json.load(r)


def available():
    try: _get("/version"); return True
    except Exception: return False


_SPK = None
def style_id(speaker, style):
    global _SPK
    _SPK = _SPK or _get("/speakers")
    for s in _SPK:
        if s["name"] == speaker:
            for st in s["styles"]:
                if st["name"] == style: return st["id"]
            return s["styles"][0]["id"]
    raise KeyError(f"VOICEVOX speaker not installed: {speaker}")


def pick_style(who, kind, expr):
    c = CAST[who]
    if kind == "whisper": return c["styles"].get(expr if expr in ("sleepy",) else "whisper", "ささやき")
    return c["styles"].get(expr, c["styles"]["default"])


def synth(text, who, kind="say", expr="smile", sr=48000):
    """→ float mono at `sr`, plus the style used."""
    c = CAST[who]
    style = pick_style(who, kind, expr)
    sid = style_id(c["speaker"], style)
    q = urllib.parse.urlencode({"text": text, "speaker": sid})
    req = urllib.request.Request(f"{URL}/audio_query?{q}", method="POST")
    with urllib.request.urlopen(req, timeout=60) as r: query = json.load(r)
    whisper = style in WHISPER_STYLES
    # cap the pauses at "…" / "、" / "。" (some voices hold them ~1.7 s) so lines keep their timing
    cap = PAUSE_MAX * (1.25 if whisper else 1.0)
    for ph in query["accent_phrases"]:
        if ph.get("pause_mora"): ph["pause_mora"]["vowel_length"] = min(ph["pause_mora"]["vowel_length"], cap)
    query.update(speedScale=c["speed"] * (0.92 if whisper else 1.0), pitchScale=c["pitch"],
                 intonationScale=c["inton"] * (0.9 if whisper else 1.0), volumeScale=1.0,
                 prePhonemeLength=0.05, postPhonemeLength=0.12, outputSamplingRate=sr, outputStereo=False)
    req = urllib.request.Request(f"{URL}/synthesis?speaker={sid}", data=json.dumps(query).encode(),
                                 headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=120) as r: data = r.read()
    rate, x = wavfile.read(io.BytesIO(data))
    x = x.astype(np.float64) / 32768.0 if x.dtype == np.int16 else x.astype(np.float64)
    if x.ndim > 1: x = x.mean(axis=1)
    if rate != sr: x = signal.resample_poly(x, sr, rate)
    return x, style


def credits():
    return [f"VOICEVOX:{CAST[w]['speaker']}" for w in "KH"]


if __name__ == "__main__":
    if not available(): sys.exit(f"VOICEVOX engine not reachable at {URL}")
    if "--speakers" in sys.argv:
        for s in _get("/speakers"): print(s["name"], "—", ", ".join(f"{st['name']}({st['id']})" for st in s["styles"]))
    if "--audition" in sys.argv:
        out = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "output", "audition"); os.makedirs(out, exist_ok=True)
        lines = [("say", "smile", "はじめまして。わたしは、ほむら。きつねびのせいだよ。"), ("whisper", "whisper", "ほら…あったかいでしょ？"), ("say", "determined", "えー、あったかいほうがいいにきまってるでしょ！")]
        for name in ["四国めたん", "ずんだもん", "九州そら", "春日部つむぎ", "冥鳴ひまり", "WhiteCUL"]:
            CAST["X"] = dict(CAST["H"], speaker=name)
            try:
                y = np.concatenate([np.concatenate([synth(t, "X", k, e)[0], np.zeros(24000)]) for k, e, t in lines])
                wavfile.write(os.path.join(out, f"{name}.wav"), 48000, (y * 32767).astype(np.int16)); print("wrote", name)
            except KeyError as err: print(err)
