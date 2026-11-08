#!/usr/bin/env python3
"""assets/art/visit_*.png (Seedance 2K) → media/art/visit_*.jpg (1920×1080, what the page loads)."""
import glob, os
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
for p in sorted(glob.glob(os.path.join(ROOT, 'assets', 'art', 'visit_*.png'))):
    im = Image.open(p).convert('RGB')
    w, h = im.size; t = round(w * 9 / 16)
    if t != h: im = im.crop((0, (h - t) // 2, w, (h - t) // 2 + t)) if t < h else im
    dst = os.path.join(ROOT, 'media', 'art', os.path.basename(p)[:-4] + '.jpg')
    im.resize((1920, 1080), Image.LANCZOS).save(dst, quality=86); print(os.path.basename(dst))
