#!/usr/bin/env python3
"""Props on chroma green (#00B140) → transparent, cropped webps for the crane game layers (main.js draws and animates them):
  assets/art/prop_claw_open.png, prop_claw_closed.png, prop_cat.png → media/art/prop_*.webp
Green key: alpha from how much greener than red / blue a pixel is, then the green spill removed (g ≤ max(r, b)). The claw pair is
cropped with ONE shared box so the open and closed claws line up exactly when the page swaps them.
  python3 scripts/props.py
"""
import os
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ART, OUT = os.path.join(ROOT, 'assets', 'art'), os.path.join(ROOT, 'media', 'art')


def key(name):
    im = np.asarray(Image.open(os.path.join(ART, name + '.png')).convert('RGB'), np.float32)
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    gm = g - np.maximum(r, b)
    a = 1 - np.clip((gm - 22) / 48, 0, 1)
    g2 = np.where(gm > 0, np.maximum(r, b) + np.clip(gm, 0, None) * 0.1, g)   # despill
    return np.dstack([r, g2, b, a * 255]).clip(0, 255).astype(np.uint8)


def bbox(a, pad=8):
    ys, xs = np.where(a[..., 3] > 20)
    return max(0, xs.min() - pad), max(0, ys.min() - pad), min(a.shape[1], xs.max() + pad), min(a.shape[0], ys.max() + pad)


claw = {n: key(n) for n in ('prop_claw_open', 'prop_claw_closed')}
boxes = [bbox(v) for v in claw.values()]
box = (min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes))
for n, v in claw.items():
    Image.fromarray(v).crop(box).save(os.path.join(OUT, n + '.webp'), quality=90, method=6); print(n, box)
cat = key('prop_cat'); bc = bbox(cat)
Image.fromarray(cat).crop(bc).save(os.path.join(OUT, 'prop_cat.webp'), quality=90, method=6); print('prop_cat', bc)
