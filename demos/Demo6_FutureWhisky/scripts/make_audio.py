"""Demo 6 audio: Nobunaga / Ieyasu voices (locked personas), cold whisky sounds (ice, highball fizz, chilled glass)
at their own side, foley (cork, pour, kanpai clink), koto, night insects → HRTF binaural → 48 kHz master.
Your own lines are subtitles only (no audio).   python3 scripts/make_audio.py

Outputs: audio/stems/{N_voice,I_voice,C_cool}.wav (dry, read by thermal / export / QA), audio/final/mix_48k.wav,
         media/mix.m4a, audio/voice_timing.json
"""
import json, os, subprocess, sys
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import whisky as WK
from sengoku import V, BA, B, ROOT
B.S = WK                                   # renderer positions from this demo's timeline
SR, N = WK.SR, int(WK.DURATION * WK.SR)
AUD, MEDIA = os.path.join(ROOT, "audio"), os.path.join(ROOT, "media")
STEMS, FINAL = os.path.join(AUD, "stems"), os.path.join(AUD, "final")
rng = np.random.default_rng(1923)          # Suntory's first distillery, Yamazaki
db, filt, place, norm_to, adsr = B.db, B.filt, B.place, B.norm_to, B.adsr
LEVEL = {"say": -19.0, "whisper": -27.5, "laugh": -16.0}
TAKE = {}


def noise(n): return rng.standard_normal(n)


def fizz(dur):
    """Highball: soda poured over ice — a crackling carbonation hiss that slowly settles, plus a few ice knocks."""
    n = int(dur * SR); tt = np.arange(n) / SR
    pops = np.zeros(n); k = rng.choice(n, int(dur * 1400), replace=False)
    pops[k] = rng.uniform(.1, 1, len(k)) * np.exp(-tt[k] / (dur * .6))
    hiss = filt(B.sos_bp(4000, 12000), pops) * 2.2 + filt(B.sos_bp(5000, 11000), noise(n)) * .05 * np.exp(-tt / dur)
    return norm_to(hiss * adsr(n, .05, .8) + BA.ice(dur) * .35, -29)


def chill(dur):
    """A chilled glass held by your ear: ice settling, faint condensation hiss."""
    n = int(dur * SR)
    frost = filt(B.sos_bp(2500, 9000), noise(n)) * .25 * adsr(n, .4, .8)
    return norm_to(BA.ice(dur) * .7 + frost, -30)


def cork(dur=.6):
    n = int(dur * SR); tt = np.arange(n) / SR
    pop = np.sin(2 * np.pi * (520 - 260 * tt / dur) * tt) * np.exp(-tt / .03) + filt(B.sos_bp(800, 4000), noise(n)) * np.exp(-tt / .015) * .6
    return norm_to(pop, -24)


def main():
    for d in (STEMS, FINAL, MEDIA): os.makedirs(d, exist_ok=True)
    VO = {w: np.zeros(N) for w in "NI"}
    cool, foley, music = np.zeros(N), np.zeros(N), np.zeros((N, 2))
    timing = []
    for i, c in enumerate(WK.CUES):
        k, dur = c["kind"], c.get("dur", 0.0)
        if k in ("say", "whisper", "laugh"):
            x = norm_to(V.perform(c, TAKE.get(i, 0)), LEVEL[k] + (2.0 if c["emo"] == "excited" else 0))
            if k == "whisper": place(VO[c["who"]], c["t"] - .45, B.inhale() * .7)
            place(VO[c["who"]], c["t"], x); dur = len(x) / SR
        elif k == "ice": place(cool, c["t"], norm_to(BA.ice(c["dur"]), -29) * c["gain"])
        elif k == "fizz": place(cool, c["t"], fizz(c["dur"]) * c["gain"])
        elif k == "chill": place(cool, c["t"], chill(c["dur"]) * c["gain"])
        elif k == "pour": place(foley, c["t"], BA.pour(c["dur"]))
        elif k == "cork": place(foley, c["t"], cork(c["dur"]))
        elif k == "clink": place(foley, c["t"], BA.clink(c["dur"]) * 1.2)
        elif k == "koto":
            x = BA.koto(c["dur"], c.get("outro", False)); i0 = int(c["t"] * SR); music[i0:i0 + len(x)] += x[:N - i0]
        timing.append(dict(i=i, t=c["t"], who=c["who"], kind=k, dur=round(dur, 3)))
    json.dump(timing, open(os.path.join(AUD, "voice_timing.json"), "w"), indent=1)
    credits = [f"VOICEVOX:{V.PERSONA[w]['speaker']}" for w in "NI"]
    json.dump(dict(backend="voicevox", credits=credits), open(os.path.join(MEDIA, "voice.json"), "w"), ensure_ascii=False)
    for name, x in [("N_voice", VO["N"]), ("I_voice", VO["I"]), ("C_cool", cool)]:
        B.write_wav(os.path.join(STEMS, name + ".wav"), x)
    print("rendering binaural…", flush=True)
    t = np.arange(N) / SR
    nb, ib, cb = B.render(VO["N"], who="N"), B.render(VO["I"], who="I"), B.render(cool, who="C")
    ob = B.render(foley, az=0, d=0.6)
    mb = B.render(music[:, 0], az=-30, d=3.5) + B.render(music[:, 1], az=30, d=3.5)
    ins = BA.insects(np.interp(t, [0, 3, 147, 150], [0, .8, .8, 0])) * db(-31)
    room = np.stack([filt(B.sos_lp(300), noise(N)) for _ in range(2)], 1)
    room = room / np.sqrt(np.mean(room ** 2)) * db(-50) * (np.clip(t / 2, 0, 1) * np.clip((WK.DURATION - t) / 3, 0, 1))[:, None]
    mix = nb + ib + cb * .9 + ob + mb * .5 + ins + room
    mix = mix / np.max(np.abs(mix)) * db(-1)
    pre = os.path.join(FINAL, "mix_premaster.wav"); B.write_wav(pre, mix)
    out = os.path.join(FINAL, "mix_48k.wav")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", pre, "-af",
                    "acompressor=threshold=-30dB:ratio=2.5:attack=5:release=180:makeup=5,alimiter=limit=0.84:attack=3:release=60:level=disabled,loudnorm=I=-19:TP=-1.5:LRA=9",
                    "-ar", str(SR), "-c:a", "pcm_s24le", out], check=True)
    os.remove(pre)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", out, "-c:a", "aac", "-b:a", "192k", os.path.join(MEDIA, "mix.m4a")], check=True)
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", out, "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
    print("mix loudness:", " ".join(l.strip() for l in r[r.rfind("Summary:"):].splitlines() if l.strip().startswith(("I:", "Peak:"))))


if __name__ == "__main__":
    main()
