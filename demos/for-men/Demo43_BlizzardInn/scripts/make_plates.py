#!/usr/bin/env python3
"""Free plate edits (Pillow, no image API): bg_dawn = bg_pass graded to sunrise (warm low sun from the right of the gate, lighter
sky, warm snow) — guide §6.3 "time of day by grading, not a new picture".  python3 scripts/make_plates.py"""
import os
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); A = os.path.join(ROOT, 'assets', 'art')
im = np.asarray(Image.open(os.path.join(A, 'bg_pass.png')).convert('RGB'), np.float32) / 255
H, W, _ = im.shape
y, x = np.mgrid[0:H, 0:W]; y = y / H; x = x / W
grade = im * np.array([1.08, .98, .86]) + np.array([.05, .02, -.02])          # warm the whole plate
sun = np.exp(-(((x - .62) / .28) ** 2 + ((y - .30) / .22) ** 2))               # low sun glow behind / right of the gate
sky = np.clip(1 - y / .55, 0, 1)
glow = sun[..., None] * np.array([1.0, .72, .42]) * .55 + (sky * .18)[..., None] * np.array([1.0, .78, .55])
out = 1 - (1 - np.clip(grade, 0, 1)) * (1 - np.clip(glow, 0, 1))             # screen
Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8)).save(os.path.join(A, 'bg_dawn.png'))
print('bg_dawn.png')
