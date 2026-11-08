#!/usr/bin/env python3
"""ghosts_base(.png / _blink.png) holds the three little ghosts side by side on chroma green (clean gaps at x 1019–1110 and 1727–1781)
→ one source per ghost at the same size and position (the rest filled with the screen colour), so each is its own layer and blink:
assets/art/ghost_kasa[_blink].png, ghost_white[_blink].png, ghost_wisp[_blink].png. Run: python3 scripts/split_ghosts.py"""
import os
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); ART = os.path.join(ROOT, 'assets', 'art')
COLS = {'kasa': (0, 1064), 'white': (1064, 1754), 'wisp': (1754, 2560)}
for suf in ('', '_blink'):
    src = os.path.join(ART, f'ghosts_base{suf}.png')
    if not os.path.exists(src): print('missing', src); continue
    im = np.asarray(Image.open(src).convert('RGB')).copy()
    screen = np.median(np.concatenate([im[0], im[-1], im[:, 0], im[:, -1]]), 0).astype(np.uint8)
    for name, (x0, x1) in COLS.items():
        o = np.empty_like(im); o[:] = screen; o[:, x0:x1] = im[:, x0:x1]
        Image.fromarray(o).save(os.path.join(ART, f'ghost_{name}{suf}.png')); print('wrote', f'ghost_{name}{suf}.png')
