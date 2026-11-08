#!/usr/bin/env python3
"""Night in the rice fields (part 5): the grandparents were drawn in daylight → <pose>_night.png (+ _blink), ONE grade for both (coordinator
QA 2026-11-09: grandma glowed, grandpa read differently graded). Matched to the plate (mean luminance ≈ 43, 99th pct ≈ 82, blue):
 1. half desaturated, then a soft highlight roll-off (1 − e^(−1.6x)) to at most 45 % — her white apron can never out-shine the plate's
    window / fireflies; 2. moonlight tint (blue); 3. a thin pale-blue rim on the edges that face the moon (upper left of the plate).
The green screen is kept exactly (chroma key unchanged). Same size / coordinates → same face points, own mouth sets.
(+ the stream plate's soft depth of field: bg_stream_soft.png, Gaussian 3 px — its sharp pebble / leaf detail measured 0.22 line density
vs the family anchor 0.09.)  python3 scripts/night_grade.py"""
import os
import numpy as np
from PIL import Image, ImageFilter
ART = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'assets', 'art')
Image.open(os.path.join(ART, 'bg_stream.png')).convert('RGB').filter(ImageFilter.GaussianBlur(3)).save(os.path.join(ART, 'bg_stream_soft.png'))
TINT = np.array([.62, .74, 1.0], np.float32); TOP = .45; K = 1.6
RIM = np.array([150, 178, 230], np.float32); RIM_A = .38; MOON = (-1, -1)   # light from the upper left (dx, dy per px)
for pose in ('grandma_base', 'grandpa_base'):
    base = np.asarray(Image.open(os.path.join(ART, pose + '.png')).convert('RGB')).astype(np.float32)
    key = base[..., 1] - np.maximum(base[..., 0], base[..., 2]); scr = np.clip((key - 30) / 40, 0, 1)   # 1 = screen green
    fig = 1 - scr
    # edges facing the moon: figure here, screen a few px toward the light
    sh = np.roll(np.roll(fig, 6 * -MOON[1], 0), 6 * -MOON[0], 1)
    rim = np.clip(fig - sh, 0, 1); rim = np.asarray(Image.fromarray((rim * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2.5)), np.float32) / 255 * fig
    for suf in ('', '_blink'):
        p = os.path.join(ART, pose + suf + '.png')
        if not os.path.exists(p): continue
        im = np.asarray(Image.open(p).convert('RGB')).astype(np.float32) / 255
        g = im.mean(2, keepdims=True); im = im + (g - im) * .5
        im = TOP * (1 - np.exp(-K * im)) / (1 - np.exp(-K)) * TINT
        im = im * 255 * (1 - RIM_A * rim[..., None]) + RIM * RIM_A * rim[..., None]
        out = im * fig[..., None] + np.asarray(Image.open(p).convert('RGB')).astype(np.float32) * scr[..., None]
        Image.fromarray(out.clip(0, 255).astype(np.uint8)).save(os.path.join(ART, f'{pose}_night{suf}.png')); print('wrote', f'{pose}_night{suf}.png')
