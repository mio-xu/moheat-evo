#!/usr/bin/env python3
"""Guests SIT in the water (script.md): a bath variant of a standing sprite = the same picture with everything below a water line
faded into the chroma screen, so the cut-out ends in a soft, slightly wavy water line instead of legs (the plate's water / the pail
show below it). Same cut for the blink source (same pixels) → <pose>_<tag>.png + <pose>_<tag>_blink.png. The stage places the figure
with its bottom (y) ON the water surface of the plate (scripts/make_stage.py).
  'water': the open bath — a wavy line (±5 px, two ripples) and a 26 px fade (the body shows a little through the water's surface)
  'pail' : a wooden pail — the line follows the pail's front rim (an arc, lower in the middle), a short 6 px fade (wood is opaque)
python3 scripts/bath_cut.py"""
import os
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); ART = os.path.join(ROOT, 'assets', 'art')
CUTS = {   # variant: (source pose, kind, water line as a fraction of the figure's height from its top)
    'penguin_bath': ('penguin_base', 'water', .62),
    'yuzujii_bath': ('yuzujii_base', 'water', .56),
    'fox_bath': ('fox_base2', 'water', .6),
    'monkey_mum_pail': ('monkey_mum', 'pail', .6),
    'monkey_kid_pail': ('monkey_kid', 'pail', .58),
}


def bbox(im):
    key = im[..., 1].astype(int) - np.maximum(im[..., 0], im[..., 2]).astype(int); ys, xs = np.where(key < 40)
    return xs.min(), ys.min(), xs.max(), ys.max()


for var, (pose, kind, frac) in CUTS.items():
    src = os.path.join(ART, pose + '.png')
    if not os.path.exists(src): print('missing', src); continue
    im0 = np.asarray(Image.open(src).convert('RGB')); x0, y0, x1, y1 = bbox(im0); H, W = im0.shape[:2]
    line_y = y0 + frac * (y1 - y0); xs = np.arange(W); u = (xs - x0) / max(1, x1 - x0)
    if kind == 'water': line = line_y + 5 * np.sin(u * 2 * np.pi * 2 + .7); fade = 26
    else: line = line_y + 22 * np.sin(np.clip(u, 0, 1) * np.pi); fade = 6     # the pail's front rim seen from above: lowest in the middle
    yy = np.arange(H)[:, None]; a = np.clip((line[None, :] + fade / 2 - yy) / fade, 0, 1)   # 1 above the line → 0 below
    if kind == 'water': a = np.where(yy > line[None, :] - fade / 2, a * .85, a)               # just under the surface: a little see-through
    for suf in ('', '_blink'):
        p = os.path.join(ART, pose + suf + '.png')
        if not os.path.exists(p): print('missing', p); continue
        im = np.asarray(Image.open(p).convert('RGB')).astype(np.float32)
        screen = np.median(np.concatenate([im[0], im[-1], im[:, 0], im[:, -1]]), 0)
        out = im * a[..., None] + screen * (1 - a[..., None])
        Image.fromarray(out.clip(0, 255).astype(np.uint8)).save(os.path.join(ART, f'{var}{suf}.png')); print('wrote', f'{var}{suf}.png')
