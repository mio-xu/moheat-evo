"""Demo 2 art prep — reuses Demo 1's aligner / face compositor (Demo01_SnowFoxfire/tools/prepare_art.py) with Ayane's groups.
  python3 tools/prepare_art.py   → media/art/*.webp + faces.json   (originals in art/chatgpt/ are never modified)"""
import os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from demo1 import load
P = load("prepare_art")   # Demo 1 module

P.ART, P.OUT = os.path.join(ROOT, "art", "chatgpt"), os.path.join(ROOT, "media", "art")
P.GROUPS = {
    "A_bust": dict(base="A_bust_base", probe=["A_bust_blink", "A_bust_mouth_open", "A_bust_mouth_half"]),
    "A_ear": dict(base="A_ear", probe=["A_ear_blow", "A_ear_happy"]),
}
FULL_FRAME = ["A_ear_fan"]   # the hand / fan change too → keep the whole image, not just the face


def main():
    P.main()
    from PIL import Image
    for name in FULL_FRAME:
        src = os.path.join(P.ART, name + ".png")
        if os.path.exists(src): P.save(Image.open(src).convert("RGBA"), name); print(f"{name}: kept as a full frame")


if __name__ == "__main__":
    main()
