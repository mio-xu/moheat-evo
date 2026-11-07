"""Demo 3 audio: the edited song (unchanged, the main listening signal) + a quiet binaural ice-FX layer that moves
with the ice effects on stage (and feeds Cooling_FX_Energy).  Reuses Demo 1's synthesis + HRTF renderer.

  python3 scripts/build_audio.py
→ audio/stems/song_150s.wav, coolfx_dry.wav, coolfx_binaural.wav ; audio/final/final_stereo_150s.wav (48 kHz/24-bit) ; media/mix.m4a
"""
import os, shutil, subprocess, sys
import numpy as np
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import concert as C
import music_features as MF
from demo1 import load
B = load("build_audio")
B.S = C                                   # the HRTF renderer reads positions from the concert timeline
SR, N = C.SR, int(C.DURATION * C.SR)
STEMS, FINAL, MEDIA = (os.path.join(ROOT, *p) for p in (("audio", "stems"), ("audio", "final"), ("media",)))
FX_GAIN_DB = -11.0                        # ice layer sits well under the song
rng = np.random.default_rng(3)


def ice_fx(c):
    dur = c["dur"]; n = int(dur * SR)
    if c["style"] == "sweep":
        x = B.magic("ice", dur, 1.0)
        tt = np.arange(n) / SR; nz = rng.standard_normal(n)
        x += B.norm_to(B.filt(B.sos_bp(6000, 12000), nz) * np.sin(np.pi * tt / dur) ** 2, -26)
    elif c["style"] == "burst":
        x = B.magic("ice", dur, 1.0) * np.r_[np.linspace(1.4, 1, n // 3), np.ones(n - n // 3)][:n]
    else:
        x = B.magic("ice", dur, .7)
    return x * c["gain"]


def main():
    for d in (STEMS, FINAL, MEDIA): os.makedirs(d, exist_ok=True)
    song = MF.load(os.path.join(ROOT, "assets", "music_edited", "shining_smile_150s.wav"))[:N]
    fx = np.zeros(N)
    for c in C.cool_cues(): B.place(fx, c["t"], ice_fx(c))
    fxb = B.render(fx, who="C") * B.db(FX_GAIN_DB)
    B.write_wav(os.path.join(STEMS, "song_150s.wav"), song)
    B.write_wav(os.path.join(STEMS, "coolfx_dry.wav"), fx)
    B.write_wav(os.path.join(STEMS, "coolfx_binaural.wav"), fxb)
    mix = song + fxb
    peak = np.max(np.abs(mix))
    if peak > B.db(-1): mix *= B.db(-1) / peak          # never louder than the original master; only prevent clipping
    out = os.path.join(FINAL, "final_stereo_150s.wav")
    B.write_wav(out, mix)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", out, "-c:a", "aac", "-b:a", "256k", os.path.join(MEDIA, "mix.m4a")], check=True)
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", out, "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
    print("final mix:", " ".join(l.strip() for l in r[r.rfind("Summary:"):].splitlines() if l.strip().startswith(("I:", "Peak:"))),
          f"| {len(C.cool_cues())} ice FX cues")


if __name__ == "__main__":
    main()
