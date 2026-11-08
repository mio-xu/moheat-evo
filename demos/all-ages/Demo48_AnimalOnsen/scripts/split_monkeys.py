#!/usr/bin/env python3
"""monkeys_base(.png / _blink.png) holds the mother and the child side by side on chroma green (two separate figures, they do not
touch) → one source each at the same size and position (the other figure painted over with the screen colour), so they can sit in
two different baths (script: mother HOT left, child lukewarm right): assets/art/monkey_mum[_blink].png, monkey_kid[_blink].png.
The split mask comes from the base and is used for the blink too (same pixels outside the eyes). python3 scripts/split_monkeys.py"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); ART = os.path.join(ROOT, 'assets', 'art')
base = np.asarray(Image.open(os.path.join(ART, 'monkeys_base.png')).convert('RGB')).astype(int)
fg = (base[..., 1] - np.maximum(base[..., 0], base[..., 2])) < 40
lab, n = ndimage.label(fg); sz = ndimage.sum(fg, lab, range(1, n + 1)); big = 1 + np.argsort(sz)[::-1][:2]
cx = [np.where(lab == k)[1].mean() for k in big]; mum, kid = (big if cx[0] < cx[1] else big[::-1])
# every pixel goes to the nearer figure (so the soft edge / spill pixels around each figure stay with it)
dm = ndimage.distance_transform_edt(lab != mum); dk = ndimage.distance_transform_edt(lab != kid)
own = {'monkey_mum': dm <= dk, 'monkey_kid': dk < dm}
for suf in ('', '_blink'):
    p = os.path.join(ART, f'monkeys_base{suf}.png')
    if not os.path.exists(p): print('missing', p); continue
    im = np.asarray(Image.open(p).convert('RGB')).copy()
    screen = np.median(np.concatenate([im[0], im[-1], im[:, 0], im[:, -1]]), 0).astype(np.uint8)
    for name, m in own.items():
        o = im.copy(); o[~m] = screen; Image.fromarray(o).save(os.path.join(ART, f'{name}{suf}.png')); print('wrote', f'{name}{suf}.png')
