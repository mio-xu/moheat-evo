#!/usr/bin/env python3
"""A last sliver of the towel survived both masked removals (x 1935–1955, y 1135–1185, just outside the ellipses) → that box takes the tatami
from 38 px to its left (same rows: the weave and the light stripes line up), feathered 6 px. Runs on bg_room_*_nob.png in place (idempotent)."""
import os
import numpy as np
from PIL import Image
ART = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'assets', 'art')
X0, Y0, X1, Y1, DX, FE = 1926, 1124, 1966, 1196, 40, 6
for pl in ('day', 'rain', 'night'):
    p = os.path.join(ART, f'bg_room_{pl}_nob.png'); a = np.asarray(Image.open(p).convert('RGB')).astype(np.float32).copy()
    src = a[Y0:Y1, X0 - DX:X1 - DX]; h, w = src.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]; m = np.clip(np.minimum.reduce([xx + 1, w - xx, yy + 1, h - yy]) / FE, 0, 1)[..., None]
    a[Y0:Y1, X0:X1] = a[Y0:Y1, X0:X1] * (1 - m) + src * m
    Image.fromarray(a.clip(0, 255).astype(np.uint8)).save(p); print('fixed', os.path.basename(p))
