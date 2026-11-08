#!/usr/bin/env python3
"""(+ the stream plate's soft depth of field: bg_stream_soft.png, Gaussian 3 px — its sharp pebble / leaf detail measured 0.22 line density vs the family anchor 0.09)
Night in the rice fields (part 5): the grandparents' poses were drawn in daylight → <pose>_night.png (+ _blink) = the same pixels graded to
the moonlit plate (cooler, darker; the screen colour is kept exactly so the chroma key still works). Same size / coordinates → same face
points, its own mouth set. python3 scripts/night_grade.py"""
import os
import numpy as np
from PIL import Image
ART = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'assets', 'art')
GAIN = np.array([.5, .56, .74], np.float32); LIFT = np.array([4, 8, 22], np.float32)   # moonlight: blue-grey, a little lifted shadows
Image.open(os.path.join(ART, 'bg_stream.png')).convert('RGB').filter(__import__('PIL.ImageFilter', fromlist=['x']).GaussianBlur(3)).save(os.path.join(ART, 'bg_stream_soft.png'))
for pose in ('grandma_base', 'grandpa_base'):
    for suf in ('', '_blink'):
        p = os.path.join(ART, pose + suf + '.png')
        if not os.path.exists(p): continue
        im = np.asarray(Image.open(p).convert('RGB')).astype(np.float32)
        key = im[..., 1] - np.maximum(im[..., 0], im[..., 2]); a = np.clip((key - 30) / 40, 0, 1)[..., None]   # 1 = screen green
        out = im * (1 - a) * GAIN + LIFT * (1 - a) + im * a
        Image.fromarray(out.clip(0, 255).astype(np.uint8)).save(os.path.join(ART, f'{pose}_night{suf}.png')); print('wrote', f'{pose}_night{suf}.png')
