#!/usr/bin/env python3
"""Yurari's smile is a thin pink line with a highlight gap in the middle; the mouth-set finder (lp_mouths warp:false) then sees only
one half and opens at one corner. This writes <pose>_m.png = the pose with ONLY that 3–6 px gap bridged (each gap column gets the
line colour interpolated from both sides, on the line's own row) — the closed mouth looks the same, the opening spans both corners.
The pose layers use <pose>_m as their source. python3 scripts/bridge_mouth.py"""
import json, os
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); ART = os.path.join(ROOT, 'assets', 'art')
FP = json.load(open(os.path.join(ROOT, 'project', 'face_points.json')))
for pose in ('yurari_base', 'yurari_ear', 'yurari_happy'):
    cx, cy, rx, ry = FP[pose]['mouth']; im = np.asarray(Image.open(os.path.join(ART, pose + '.png')).convert('RGB')).astype(np.float32).copy()
    g = im.mean(2); y0, y1, x0, x1 = cy - ry * 2, cy + ry * 2, cx - rx - 8, cx + rx + 8
    med = np.median(g[y0:y1, x0:x1]); prof = [(x, med - g[y0:y1, x].min(), y0 + int(g[y0:y1, x].argmin())) for x in range(x0, x1)]
    on = [p for p in prof if p[1] > 15]; n = 0
    for (xa, da, ya), (xb, db, yb) in zip(on, on[1:]):
        if 1 < xb - xa <= 14:   # a gap inside the line
            ca, cb = im[ya, xa], im[yb, xb]
            for x in range(xa + 1, xb):
                t = (x - xa) / (xb - xa); y = round(ya + (yb - ya) * t); c = ca * (1 - t) + cb * t
                for dy, w in ((-1, .45), (0, 1.0), (1, .45)): im[y + dy, x] = im[y + dy, x] * (1 - w) + c * w
                n += 1
    Image.fromarray(im.clip(0, 255).astype(np.uint8)).save(os.path.join(ART, pose + '_m.png')); print(pose, n, 'gap columns bridged')
