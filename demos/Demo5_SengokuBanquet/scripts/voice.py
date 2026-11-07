"""Demo 5 dialogue voices — the two LOCKED personas from voice_personas.py (FINAL), one voice per character for the whole film.

  python3 scripts/voice.py        → audio/takes/<line>_t{0,1,2}.wav  (+ takes.json with durations)

Each line is performed in 3 takes (designed prosody, slower/more expressive, brisker/flatter); TAKE picks the one used
in the film (default 0). Listen in audio/takes/ and change TAKE to swap a take. Needs the VOICEVOX engine.
"""
import hashlib, json, os, sys
import numpy as np
from scipy.io import wavfile

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
TAKE_VARIANTS = [(1.0, 1.0), (.93, 1.15), (1.06, .88)]
TAKE = {}          # line index → chosen take (default 0)


def lines():
    return [(i, c) for i, c in enumerate(BQ.CUES) if c["kind"] in ("say", "whisper", "laugh")]


def _key(*a): return hashlib.md5(json.dumps(a, ensure_ascii=False, sort_keys=True, default=str).encode()).hexdigest()[:12]


_last_path = [None]


def perform(c, take=0):
    """→ dry mono float voice for one line (persona post-processing applied, peak-normalised later by the mixer)."""
    who, p = c["who"], PERSONA[c["who"]]
    sm, im = TAKE_VARIANTS[take]
    path = os.path.join(CACHE, f"{who}_{_key(c['tts'], c['emo'], c['kind'], c.get('n'), take, VP.FINAL[who], PROS[who].get(c['emo']))}.wav")
    if not os.path.exists(path):
        if c["kind"] == "laugh":
            lp = dict(p); L = dict(p["laugh"]); L.update(LAUGH[c["emo"]][who]); L["n"] = c.get("n") or len(c["tts"]) // 2
            L["base"] *= (1.0, 1.04, .96)[take]; lp["laugh"] = L
            x = VP.laugh(lp, c["tts"])
            if c["emo"] == "earlaugh": x = .55 * x + .6 * B.whisperize(x)
        else:
            st, sp, pi, it, vol, wmix = PROS[who][c["emo"]]
            VV.CAST["X"] = dict(speaker=p["speaker"], speed=sp * sm * p.get("speed_mul", 1), pitch=p["pitch"] + pi, inton=it * im,
                                pause=.42, tone=None, styles=dict(default=st, smile=st, whisper=st, sleepy=st))
            x, _ = VV.synth(c["tts"], "X", "say", "smile")
            if wmix: x = (1 - .45 * wmix) * x + .6 * wmix * B.whisperize(x)
            x = x * vol
        x = VP.post(x, p)
        e = B.env_follow(x, 40); idx = np.where(e > .008 * np.max(e))[0]
        if len(idx): x = x[max(0, idx[0] - 960): idx[-1] + 2400]
        os.makedirs(CACHE, exist_ok=True)
        wavfile.write(path, SR, (np.clip(x / (np.max(np.abs(x)) + 1e-9) * .9, -1, 1) * 32767).astype(np.int16))
    _last_path[0] = path
    return wavfile.read(path)[1].astype(np.float64) / 32768


def main():
    os.makedirs(TAKES_DIR, exist_ok=True)
    info = []
    for i, c in lines():
        durs = []
        for k in range(len(TAKE_VARIANTS)):
            x = perform(c, k); durs.append(round(len(x) / SR, 2))
            dst = os.path.join(TAKES_DIR, f"{i:02d}_{c['who']}_{c['emo']}_t{k}.wav")     # readable name → symlink to the cached take (no copy)
            if os.path.lexists(dst): os.remove(dst)
            os.symlink(os.path.relpath(_last_path[0], TAKES_DIR), dst)
        nxt = next((d["t"] for d in BQ.CUES[i + 1:] if d["kind"] in ("say", "whisper", "laugh") and d["who"] == c["who"]), BQ.DURATION)
        use = TAKE.get(i, 0)
        flag = "  ! overlaps his next line" if c["t"] + durs[use] > nxt - .15 else ""
        print(f"{i:02d} {c['t']:6.1f}s {c['who']} {c['emo']:10s} takes {durs}  ends {c['t'] + durs[use]:6.1f}  next {nxt:6.1f}{flag}  {c['ja']}")
        info.append(dict(i=i, who=c["who"], t=c["t"], emo=c["emo"], ja=c["ja"], durs=durs, take=use))
    json.dump(info, open(os.path.join(ROOT, "audio", "takes.json"), "w"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
