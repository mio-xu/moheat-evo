"""Demo 9 dialogue voices — ElevenLabs since 2026-11-08 (user picks nobunaga r1_a / ieyasu r1_a, tools/eleven/cast.json); before: the\ntwo LOCKED VOICEVOX personas from voice_personas.py (FINAL). One voice per character for the whole film.

  python3 scripts/voice.py        → audio/takes/<line>_t{0,1,2}.wav  (+ takes.json with durations)

Each line is performed in 3 takes (designed prosody, slower/more expressive, brisker/flatter); TAKE picks the one used
in the film (default 0). Listen in audio/takes/ and change TAKE to swap a take. Needs the VOICEVOX engine.
"""
import hashlib, importlib.util, io, json, os, subprocess, sys, tempfile
import numpy as np
from scipy.io import wavfile
from scipy.signal import resample_poly

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import banquet as BQ
import voice_personas as VP
VV, B = VP.VV, VP.B
SR = 48000
CACHE = os.path.join(ROOT, "audio", "cache")
TAKES_DIR = os.path.join(ROOT, "audio", "takes")

PERSONA = {w: VP.PERSONAS[VP.FINAL[w]] for w in "NI"}

# emotion → (VOICEVOX style, speed, pitch offset, intonation, volume, whisper-mix)
PROS = {
    "N": {"proud": ("ノーマル", .92, 0, 1.25, 1.0, 0), "invite": ("ノーマル", .9, 0, 1.2, 1.0, 0),
          "tease": ("喜び", .95, .01, 1.35, .95, 0), "excited": ("熱血", 1.0, .02, 1.45, 1.15, 0),
          "suspicious": ("しっとり", .82, -.02, .85, .8, 0), "soft": ("しっとり", .84, -.01, .95, .8, 0),
          "whisper": ("囁き", .86, -.01, .9, .9, 0)},
    "I": {"polite": ("ノーマル", .9, 0, 1.05, .95, 0), "calm": ("ノーマル", .86, -.01, .9, .85, 0),
          "concern": ("ノーマル", .86, 0, 1.0, .8, .35), "surprise": ("ノーマル", .9, .02, 1.2, .95, 0),
          "thoughtful": ("ノーマル", .84, -.01, .85, .8, 0), "whisper": ("ノーマル", .84, -.01, .85, .8, 1)},
}
LAUGH = {  # per emotion: VOICEVOX style, start pitch (Hz, before the persona's pitch shift), drop per laugh, syllables
    "laugh": dict(N=dict(style="熱血", base=150, drop=.72), I=dict(style="ノーマル", base=118, drop=.84)),
    "chuckle": dict(I=dict(style="ノーマル", base=112, drop=.86)),
    "earlaugh": dict(N=dict(style="囁き", base=128, drop=.84)),
}
# take k → multipliers on (speed, intonation)
TAKE_VARIANTS = [(1.0, 1.0)]   # ElevenLabs: one take per line (was 3 VOICEVOX takes)
TAKE = {}          # line index → chosen take (default 0)


def lines():
    return [(i, c) for i, c in enumerate(BQ.CUES) if c["kind"] in ("say", "whisper", "laugh")]


def lines0():   # the script's own (un-retimed) timeline
    return [(i, c) for i, c in enumerate(BQ.CUES0) if c["kind"] in ("say", "whisper", "laugh")]


def _key(*a): return hashlib.md5(json.dumps(a, ensure_ascii=False, sort_keys=True, default=str).encode()).hexdigest()[:12]


_last_path = [None]


# ElevenLabs (2026-11-08, user's picks nobunaga r1_a / ieyasu r1_a in tools/eleven/cast.json): emotion → audio tag.
# Text = the cue's kana reading (c["tts"]) so archaic words are read right. The VOICEVOX persona code above is kept for reference.
_sp = importlib.util.spec_from_file_location("eleven", os.path.join(ROOT, "..", "..", "..", "tools", "eleven", "tts.py"))
E = importlib.util.module_from_spec(_sp); _sp.loader.exec_module(E)
EL_VOICE = {"N": E.voice("nobunaga"), "I": E.voice("ieyasu")}
TAG = {"proud": "[proudly]", "invite": "[warmly]", "tease": "[teasing]", "excited": "[excited]", "suspicious": "[suspicious]",
       "soft": "[softly]", "whisper": "[whispers]", "polite": "[politely]", "calm": "[calmly]", "concern": "[concerned]",
       "surprise": "[surprised]", "thoughtful": "[thoughtfully]", "laugh": "[laughs heartily]", "chuckle": "[chuckles softly]",
       "earlaugh": "[whispers] [chuckles softly]"}


def el_text(c):
    return f"{TAG.get(c['emo'], '')} {c['tts']}".strip()


def perform(c, take=0):
    """→ dry mono float voice for one line at 48 kHz (ElevenLabs, trimmed; peak-normalised later by the mixer)."""
    who = c["who"]; text = el_text(c)
    path = os.path.join(CACHE, f"{who}_el_{_key(text, EL_VOICE[who], E.MODEL, E.SEED)}.wav")
    if not os.path.exists(path):
        sr, y = wavfile.read(io.BytesIO(E.speak(text, EL_VOICE[who])))
        x = resample_poly(y.astype(np.float64) / 32768, SR, sr)
        e = B.env_follow(x, 40); idx = np.where(e > .008 * np.max(e))[0]
        if len(idx): x = x[max(0, idx[0] - 960): idx[-1] + 2400]
        os.makedirs(CACHE, exist_ok=True)
        wavfile.write(path, SR, (np.clip(x / (np.max(np.abs(x)) + 1e-9) * .9, -1, 1) * 32767).astype(np.int16))
    _last_path[0] = path
    x = wavfile.read(path)[1].astype(np.float64) / 32768
    a, b = int(.01 * SR), int(.06 * SR); x[:a] *= np.linspace(0, 1, a); x[-b:] *= np.linspace(1, 0, b)   # clean edges
    return x


def retime(cues, durs, gap_same=.15, gap_other=.3):
    """The film follows the voices' natural length (user, 2026-11-08: no need to keep 150 s): whenever a line would run into the
    next voiced line, everything from just before that next line on is pushed later. → [(old time, extra seconds)]."""
    vo = sorted([c for c in cues if c["kind"] in ("say", "whisper", "laugh")], key=lambda c: c["t"])
    pts, shift = [], 0.0
    for a, b in zip(vo, vo[1:]):
        inhale = .45 if b["kind"] == "whisper" and a["who"] == b["who"] else 0   # build_audio places an inhale 0.45 s before a whisper
        end = a["t"] + shift + durs[id(a)] + (gap_same if a["who"] == b["who"] else gap_other) + inhale
        over = end - (b["t"] + shift)
        if over > 0: pts.append((round(b["t"] - .01, 3), round(over, 3))); shift += over
    return pts


def main():
    os.makedirs(TAKES_DIR, exist_ok=True)
    info = []
    for i, c in lines0():
        durs = []
        for k in range(len(TAKE_VARIANTS)):
            x = perform(c, k); durs.append(round(len(x) / SR, 2))
            dst = os.path.join(TAKES_DIR, f"{i:02d}_{c['who']}_{c['emo']}_t{k}.wav")     # readable name → symlink to the cached take (no copy)
            if os.path.lexists(dst): os.remove(dst)
            os.symlink(os.path.relpath(_last_path[0], TAKES_DIR), dst)
        nxt = next((d["t"] for d in BQ.CUES0[i + 1:] if d["kind"] in ("say", "whisper", "laugh") and d["who"] == c["who"]), BQ.DURATION0)
        use = TAKE.get(i, 0)
        flag = "  ! overlaps his next line" if c["t"] + durs[use] > nxt - .15 else ""
        print(f"{i:02d} {c['t']:6.1f}s {c['who']} {c['emo']:10s} takes {durs}  ends {c['t'] + durs[use]:6.1f}  next {nxt:6.1f}{flag}  {c['ja']}")
        info.append(dict(i=i, who=c["who"], t=c["t"], emo=c["emo"], ja=c["ja"], durs=durs, take=use))
    json.dump(info, open(os.path.join(ROOT, "audio", "takes.json"), "w"), ensure_ascii=False, indent=1)
    durs = {id(c): len(perform(c, TAKE.get(i, 0))) / SR for i, c in lines0()}
    pts = retime(BQ.CUES0, durs)
    json.dump(pts, open(os.path.join(ROOT, "audio", "retime.json"), "w"))
    print(f"retime: {len(pts)} gaps, +{sum(e for _, e in pts):.1f} s → film {BQ.DURATION0 + sum(e for _, e in pts):.1f} s")


if __name__ == "__main__":
    main()
