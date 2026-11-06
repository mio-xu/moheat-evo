"""Edit the original song to exactly 150 s at phrase boundaries (the original is never modified).

  python3 scripts/edit_music.py
→ assets/music_edited/shining_smile_150s.wav (48 kHz / 24-bit stereo), assets/music_edited/edit_log.json

Edit decision (from scripts/music_features.py + a bar-similarity search, see README):
  keep  0.000 – 131.331 s   intro, verses, choruses, the big chorus at 95.9 s
  cut   131.331 – 150.411 s 7 bars of the long instrumental interlude (the bar after the cut matches the cut bar best)
  keep  150.411 – end       last section + the song's own fade-out; the final 0.96 s of near-silence is dropped
The join is aligned to the transient (cross-correlation, ±30 ms) and cross-faded (80 ms, equal power).
"""
import json, os, subprocess, sys
import numpy as np
from scipy.io import wavfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import music_features as MF

SRC = os.path.join(ROOT, "assets", "music_original", "ztmusic-shining-smile-melody-jpop-203898.mp3")
OUT_DIR = os.path.join(ROOT, "assets", "music_edited")
CUT_A, CUT_B, TARGET, XFADE, FADE_OUT = 131.331, 150.411, 150.0, 0.08, 2.5
SR = MF.SR


def main():
    x = MF.load(SRC)
    a, b = int(CUT_A * SR), int(CUT_B * SR)
    # fine-align the join on the transient: compare 0.25 s after each point
    w, best, sh = int(.25 * SR), -1e9, 0
    ref = x[a:a + w].mean(1)
    for d in range(-int(.03 * SR), int(.03 * SR) + 1, 24):
        seg = x[b + d:b + d + w].mean(1)
        c = float(np.dot(ref, seg) / (np.linalg.norm(ref) * np.linalg.norm(seg) + 1e-9))
        if c > best: best, sh = c, d
    b += sh
    n = int(XFADE * SR); ramp = np.linspace(0, np.pi / 2, n)
    head, tail = x[:a + n // 2].copy(), x[b - n // 2:].copy()
    mid = head[-n:] * np.cos(ramp)[:, None] + tail[:n] * np.sin(ramp)[:, None]
    y = np.concatenate([head[:-n], mid, tail[n:]])
    y = y[: int(TARGET * SR)]
    if len(y) < int(TARGET * SR): y = np.pad(y, ((0, int(TARGET * SR) - len(y)), (0, 0)))
    fo = int(FADE_OUT * SR); y[-fo:] *= np.linspace(1, 0, fo)[:, None] ** 2
    os.makedirs(OUT_DIR, exist_ok=True)
    tmp = os.path.join(OUT_DIR, "tmp.wav"); wavfile.write(tmp, SR, y.astype(np.float32))
    out = os.path.join(OUT_DIR, "shining_smile_150s.wav")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", tmp, "-c:a", "pcm_s24le", out], check=True); os.remove(tmp)
    log = dict(source=os.path.basename(SRC), source_duration=round(len(x) / SR, 3), keep=[[0, CUT_A], [round(b / SR, 4), round(len(x) / SR, 3)]],
               cut=[CUT_A, round(b / SR, 4)], removed_s=round((b - a) / SR, 4), join_shift_ms=round(sh / SR * 1000, 2), join_correlation=round(best, 3),
               crossfade_s=XFADE, fade_out_s=FADE_OUT, output=os.path.relpath(out, ROOT), output_duration=round(len(y) / SR, 6),
               map="t_original = t_edit if t_edit < %.3f else t_edit + %.4f" % (CUT_A, (b - a) / SR))
    json.dump(log, open(os.path.join(OUT_DIR, "edit_log.json"), "w"), indent=1)
    print(json.dumps(log, indent=1))


if __name__ == "__main__":
    main()
