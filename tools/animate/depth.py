"""Depth map for 2.5D parallax (Depth Anything V2). Run with the LivePortrait venv:
  ~/ml/LivePortrait/.venv/bin/python tools/animate/depth.py <still.jpg> <out_depth.png> [--model large]
Output: 8-bit grayscale, white = near, same size as the still, lightly smoothed so the WebGL warp has no tearing."""
import os, sys, argparse
os.environ.setdefault("PYTORCH_ENABLE_MPS_FALLBACK", "1")
import numpy as np, torch, cv2
from PIL import Image
from transformers import pipeline
ap = argparse.ArgumentParser(); ap.add_argument("img"); ap.add_argument("out"); ap.add_argument("--model", default="base")
a = ap.parse_args()
dev = "mps" if torch.backends.mps.is_available() else "cpu"
pipe = pipeline("depth-estimation", model=f"depth-anything/Depth-Anything-V2-{a.model.capitalize()}-hf", device=dev)
im = Image.open(a.img).convert("RGB")
d = np.array(pipe(im)["depth"], dtype=np.float32)
d = cv2.resize(d, im.size, interpolation=cv2.INTER_CUBIC)
d = (d - d.min()) / (d.max() - d.min() + 1e-6)
d = cv2.bilateralFilter((d * 255).astype(np.uint8), 9, 30, 9)
d = cv2.dilate(d, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (17, 17)))  # near layer grows past its outline: stretch lands on background
d = cv2.GaussianBlur(d, (0, 0), 4)
cv2.imwrite(a.out, d)
print("wrote", a.out, d.shape)
