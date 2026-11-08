#!/usr/bin/env python3
"""Bon-chan is the warm light you carry (a real candle): every plate gets his light where he stands in that view (coordinator
2026-11-09: the storehouse plate has it, the room / corridor / gate must too). bg_<place>_b<xx>.png = the plate + a warm pool on the
floor around his feet (file bg_<place>_b<x %>h<height %>: x = his centre, feet at FEET of the frame height) and a faint halo behind his body, screen-blended (only brightens,
falls off smoothly). The storehouse plate already has its light pool baked in the centre (x .50) → no extra pool there.
Called by scripts/make_stage.py for each (place, x) it uses."""
import os, sys
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); ART = os.path.join(ROOT, 'assets', 'art')
WARM = np.array([255, 176, 92], np.float32) / 255
FEET = .96


def make(place, x, h=.62):
    out = os.path.join(ART, f'bg_{place}_b{round(x * 100):02d}h{round(h * 100):02d}.png')
    src = os.path.join(ART, f'bg_{place}.png')
    if os.path.exists(out) and os.path.getmtime(out) > max(os.path.getmtime(src), os.path.getmtime(__file__)): return os.path.basename(out)[:-4]
    im = np.asarray(Image.open(src).convert('RGB')).astype(np.float32) / 255; H, W, _ = im.shape
    yy, xx = np.mgrid[0:H, 0:W]; fx, fy = x * W, FEET * H
    pool = np.exp(-(((xx - fx) / (W * .17 * h / .62)) ** 2 + ((yy - fy + H * .035) / (H * .09 * h / .62)) ** 2) * 1.4) * .62   # the lit floor
    cy = fy - H * h * .45
    halo = np.exp(-(((xx - fx) / (W * .22 * h / .62)) ** 2 + ((yy - cy) / (H * .38 * h / .62)) ** 2) * 1.4) * .22   # air / walls near him
    a = np.clip(pool + halo, 0, .7)[..., None]
    o = 1 - (1 - im) * (1 - a * WARM)   # screen: only brightens, warm
    Image.fromarray((o * 255).clip(0, 255).astype(np.uint8)).save(out); return os.path.basename(out)[:-4]


if __name__ == '__main__':
    print(make(sys.argv[1], float(sys.argv[2])))
