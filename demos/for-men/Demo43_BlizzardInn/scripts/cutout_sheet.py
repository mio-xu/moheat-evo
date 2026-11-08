#!/usr/bin/env python3
"""Review sheet: every cut-out (media/art/char_*.webp) on a dark plate at 2× at three edge spots (top of the hair, left and right outline at
45 % of its height), so fringes show. → project/cutouts_2x.jpg"""
import glob, os
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
fs = sorted(glob.glob(os.path.join(ROOT, 'media/art/char_*.webp'))); T, C = 360, 180
sheet = Image.new('RGB', (T * 3, T * len(fs)), (16, 19, 28))
for k, f in enumerate(fs):
    im = Image.open(f).convert('RGBA'); a = np.asarray(im.getchannel('A')) > 128; ys, xs = np.where(a); h = im.height
    y45 = int(ys.min() + .45 * (ys.max() - ys.min())); row = np.where(a[y45])[0]; top = int(ys.min()); tx = int(xs[ys == top].mean()) if (ys == top).any() else im.width // 2
    spots = [(tx, top + C // 3), (int(row.min()), y45), (int(row.max()), y45)]
    for j, (cx, cy) in enumerate(spots):
        box = (cx - C // 2, cy - C // 2, cx + C // 2, cy + C // 2); c = im.crop(box).resize((T, T), Image.LANCZOS)
        bg = Image.new('RGBA', (T, T), (16, 19, 28, 255)); bg.alpha_composite(c); sheet.paste(bg.convert('RGB'), (j * T, k * T))
sheet.save(os.path.join(ROOT, 'project/cutouts_2x.jpg'), quality=86); print(len(fs), [os.path.basename(f) for f in fs])
