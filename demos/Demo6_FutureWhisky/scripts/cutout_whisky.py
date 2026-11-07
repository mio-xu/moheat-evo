"""Cut the user's Suntory whisky renders (black background) out to transparent PNGs.
  python3 scripts/cutout_whisky.py   (sources: ../suntory/*.png → assets/whisky/*.png)
Flood-fills near-black pixels connected to the border (so dark lines inside the bottle stay), then feathers the edge."""
import os, sys
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(os.path.dirname(ROOT), "suntory")
PICK = {   # source file → asset name
    "image_batch_8b.png": "yamazaki",            # 山崎 12
    "image_batch_2e.png": "hakushu",             # 白州 12
    "image_batch_79 (1).png": "hibiki",          # 響
    "image_batch_79 (6).png": "hibiki_glass",    # 響 + rocks glass
    "image_batch_79 (5).png": "hibiki_tray",     # 響 on a lacquer tray with plum blossom (finale / cover)
    "image_batch_8b (4).png": "yamazaki_sake",   # 山崎 with tokkuri and sakazuki (cover)
    "image_batch_27.png": "hibiki_box_glass",
}


def cut(path):
    im = np.asarray(Image.open(path).convert("RGB")).astype(np.int16)
    dark = im.max(-1) < 22
    lab, _ = ndimage.label(dark)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(border))
    bg = ndimage.binary_opening(bg, iterations=1, border_value=1)
    alpha = Image.fromarray(((~bg) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))
    rgba = Image.fromarray(im.astype(np.uint8)).convert("RGBA"); rgba.putalpha(alpha)
    box = rgba.getchannel("A").point(lambda a: 255 if a > 24 else 0).getbbox()
    return rgba.crop((max(0, box[0] - 6), max(0, box[1] - 6), box[2] + 6, box[3] + 6))


if __name__ == "__main__":
    out = os.path.join(ROOT, "assets", "whisky"); os.makedirs(out, exist_ok=True)
    for src, name in PICK.items():
        im = cut(os.path.join(SRC, src)); im.save(os.path.join(out, name + ".png")); print(name, im.size)
