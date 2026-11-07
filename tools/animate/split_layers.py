"""Split a finished scene still into layers: character (RGBA) + empty background (inpainted).

  ~/ml/layers/bin/python tools/animate/split_layers.py <still.jpg> <out_dir> [--model isnet-anime|birefnet-general]

Writes <out_dir>/char.png (RGBA, full frame size so it lines up with the still), mask.png, bg.jpg.
Setup: uv venv -p 3.11 ~/ml/layers && uv pip install -p ~/ml/layers/bin/python "rembg[cpu]" simple-lama-inpainting opencv-python-headless
"""
import os, argparse
import numpy as np, cv2
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument("img"); ap.add_argument("out")
ap.add_argument("--model", default="isnet-anime")
ap.add_argument("--grow", type=int, default=24, help="px the hole is grown past the outline before inpainting")
a = ap.parse_args()
os.makedirs(a.out, exist_ok=True)

from rembg import remove, new_session
im = Image.open(a.img).convert("RGB")
alpha = np.array(remove(im, session=new_session(a.model), only_mask=True))
# keep only the biggest blob (the character + chair), drop stray bits
_, lab, st, _ = cv2.connectedComponentsWithStats((alpha > 128).astype(np.uint8))
if len(st) > 1:
    keep = 1 + np.argmax(st[1:, cv2.CC_STAT_AREA])
    blob = cv2.dilate((lab == keep).astype(np.uint8), np.ones((9, 9), np.uint8))
    alpha = (alpha * blob).astype(np.uint8)
rgba = np.dstack([np.array(im), alpha])
Image.fromarray(rgba).save(f"{a.out}/char.png")
cv2.imwrite(f"{a.out}/mask.png", alpha)

# background: inpaint where the character was (hole grown so no hair halo survives)
import torch
from simple_lama_inpainting.models.model import download_model, LAMA_MODEL_URL
lama = torch.jit.load(download_model(LAMA_MODEL_URL), map_location="cpu").eval()  # traced on CUDA → load on CPU
hole = cv2.dilate((alpha > 8).astype(np.uint8) * 255, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (a.grow * 2 + 1,) * 2))
H, W = hole.shape
ph, pw = (8 - H % 8) % 8, (8 - W % 8) % 8
img_t = torch.from_numpy(np.pad(np.array(im), ((0, ph), (0, pw), (0, 0)), mode="reflect")).permute(2, 0, 1)[None].float() / 255
msk_t = torch.from_numpy(np.pad(hole, ((0, ph), (0, pw)))).float()[None, None] / 255
with torch.no_grad():
    res = lama(img_t, (msk_t > 0).float())[0].permute(1, 2, 0).numpy()[:H, :W]
bg = Image.fromarray(np.clip(res * 255, 0, 255).astype(np.uint8))
bg = bg.resize(im.size)
bg.save(f"{a.out}/bg.jpg", quality=92)
print("wrote", a.out, "char coverage %.1f%%" % (100 * (alpha > 128).mean()))
