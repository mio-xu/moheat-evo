#!/usr/bin/env python3
"""Tiny clean-up of masked edits: a stray dark stroke the model left near the edge of the mask (a remnant of the old open mouth's
corner) → those dark pixels take the median colour of the light pixels around them. python3 scripts/fix_quiet.py (idempotent)."""
import os
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); ART = os.path.join(ROOT, 'assets', 'art')
FIX = {'bonchan_base_quiet': [(1316, 746, 1338, 770)]}
for name, boxes in FIX.items():
    p = os.path.join(ART, name + '.png'); im = np.asarray(Image.open(p).convert('RGB')).astype(np.float32).copy()
    for x0, y0, x1, y1 in boxes:
        blk = im[y0:y1, x0:x1]; lum = blk.mean(2); ring = np.concatenate([im[y0 - 4:y0, x0:x1].reshape(-1, 3), im[y1:y1 + 4, x0:x1].reshape(-1, 3),
                                                                        im[y0:y1, x0 - 4:x0].reshape(-1, 3), im[y0:y1, x1:x1 + 4].reshape(-1, 3)])
        ref = np.median(ring, 0); dark = lum < ref.mean() - 18
        soft = np.clip((ref.mean() - 8 - lum) / 20, 0, 1)[..., None] * (dark[..., None] | (lum < ref.mean() - 8)[..., None])
        im[y0:y1, x0:x1] = blk * (1 - soft) + ref * soft
        print(name, (x0, y0), int(dark.sum()), 'dark px replaced')
    Image.fromarray(im.clip(0, 255).astype(np.uint8)).save(p)
