"""Demo 3 art prep → media/art/*.webp (+ faces.json).  python3 scripts/prepare_art.py

Sources (read-only): Demo 2's ChatGPT art (via symlinks in project/art_src) + Demo 3's new assets.
Reuses Demo 1's aligner / face compositor. The new singing mouths (A_bust_sing_mid / _wide) are aligned to Demo 2's
A_bust_base and face-composited, so they swap cleanly with Demo 2's blink / mouth frames.
"""
import os, sys
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from demo1 import load
P = load("prepare_art")
P.ART, P.OUT = os.path.join(ROOT, "project", "art_src"), os.path.join(ROOT, "media", "art")
P.GROUPS = {
    "A_bust": dict(base="A_bust_base", probe=["A_bust_blink", "A_bust_mouth_open", "A_bust_mouth_half"]),
    "A_ear": dict(base="A_ear", probe=["A_ear_blow", "A_ear_happy"]),
}
FULL_FRAME = ["A_ear_fan"]          # hand + fan change too
SKIP = ["A_Character"]              # design sheet: reference only

if __name__ == "__main__":
    P.main()
    for name in FULL_FRAME:
        P.save(Image.open(os.path.join(P.ART, name + ".png")).convert("RGBA"), name)
    for name in SKIP:
        p = os.path.join(P.OUT, name + ".webp")
        if os.path.exists(p): os.remove(p)
