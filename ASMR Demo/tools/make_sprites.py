"""Cut the character sprites straight out of the approved design sheet (Character.jpg) with macOS Vision.
  python3 tools/make_sprites.py      → media/sprites/{K,H}_<pose>.png  (transparent, 3× Lanczos upscaled)
"""
import os, subprocess, tempfile
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BOXES = {   # (left, top, right, bottom) in Character.jpg (1536×1024)
    "K_portrait": (0, 0, 335, 500), "K_front": (455, 40, 610, 292),
    "K_near": (440, 314, 600, 452), "K_side": (600, 303, 762, 452), "K_run": (762, 303, 910, 452),
    "K_blow": (910, 303, 1082, 452), "K_magic": (1082, 303, 1212, 452), "K_rest": (1210, 303, 1348, 452),
    "H_portrait": (0, 500, 335, 1024), "H_front": (455, 528, 612, 792),
    "H_near": (440, 806, 592, 968), "H_appear": (592, 800, 742, 968), "H_run": (740, 800, 898, 968),
    "H_blow": (898, 800, 1065, 968), "H_magic": (1065, 800, 1208, 968), "H_hug": (1205, 800, 1345, 968),
}
SCALE = 3

def main():
    sheet = Image.open(os.path.join(ROOT, "Character.jpg")).convert("RGB")
    out_dir = os.path.join(ROOT, "media", "sprites"); os.makedirs(out_dir, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        for name, box in BOXES.items():
            c = sheet.crop(box)
            c = c.resize((c.width * SCALE, c.height * SCALE), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=2, percent=60, threshold=2))
            src, dst = os.path.join(tmp, "in.png"), os.path.join(out_dir, f"{name}.png")
            c.save(src)
            r = subprocess.run(["swift", os.path.join(ROOT, "tools", "lift_subject.swift"), src, dst], capture_output=True, text=True)
            im = Image.open(dst).convert("RGBA")
            # remove the light fringe left from the sheet background: shrink the alpha by ~2 px, soften 1 px
            a = im.getchannel("A").filter(ImageFilter.MinFilter(5)).filter(ImageFilter.GaussianBlur(1))
            im.putalpha(a); im = im.crop(im.getbbox()); im.save(dst, optimize=True)
            print(f"{name:12s} {im.size}  {r.stdout.strip()}")

if __name__ == "__main__":
    main()
