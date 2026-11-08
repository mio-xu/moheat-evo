#!/usr/bin/env python3
"""A Seedance expression edit sometimes also redraws things it should not (hair strands, the other feature). This keeps ONLY the wanted
area: the variant inside a feathered ellipse around (cx, cy), the base everywhere else → <variant>_clean.png, which build_stage.py
(stage.json "talk" / "blink") then reads. Pillow + numpy.

  python3 scripts/clean_variant.py nagisa_ref nagisa_ref_talk 1355 630 110 80      # base variant cx cy rx ry (source pixels)
"""
import os, sys
import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ART = os.path.join(ROOT, 'assets', 'art')
base_n, var_n = sys.argv[1], sys.argv[2]
cx, cy, rx, ry = map(int, sys.argv[3:7])
base = Image.open(os.path.join(ART, base_n + '.png')).convert('RGB')
var = Image.open(os.path.join(ART, var_n + '.png')).convert('RGB').resize(base.size, Image.LANCZOS)
H, W = base.size[1], base.size[0]
yy, xx = np.mgrid[0:H, 0:W]
m = (((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2 <= 1).astype(np.uint8) * 255
mask = Image.fromarray(m).filter(ImageFilter.GaussianBlur(max(4, min(rx, ry) // 5)))
Image.composite(var, base, mask).save(os.path.join(ART, var_n + '_clean.png'))
print('wrote', var_n + '_clean.png')
