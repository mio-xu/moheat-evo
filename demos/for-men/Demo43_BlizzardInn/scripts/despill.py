#!/usr/bin/env python3
"""Magenta-screen spill on Mint's white fur / hair highlights (gpt-image lit her with the screen colour; the matte itself is clean): any pixel
where red AND blue stand above green is pulled back toward neutral, in her cut-outs only (skin has blue below green, so it stays).
Run after tools/art/build_stage.py, before scripts/make_trio.py; updates the content hash in media/layers.js.  python3 scripts/despill.py"""
import hashlib, os, re
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); ART = os.path.join(ROOT, 'media', 'art'); LJ = os.path.join(ROOT, 'media', 'layers.js')
layers = open(LJ, encoding='utf-8').read()
for n in ('char_mint_base', 'char_mint_ear'):
    p = os.path.join(ART, n + '.webp'); a = np.asarray(Image.open(p).convert('RGBA'), np.float32).copy()
    sp = np.clip(np.minimum(a[..., 0], a[..., 2]) - a[..., 1], 0, None)          # how far red and blue both sit above green
    sp = np.where(sp > 1.5, sp, 0); a[..., 0] -= sp; a[..., 2] -= sp * .85
    print(n, 'pixels corrected:', int((sp > 0).sum()))
    Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).save(p, quality=88, method=6)
    h = hashlib.md5(open(p, 'rb').read()).hexdigest()[:8]; layers = re.sub(rf'({n}\.webp\?v=)[0-9a-f]+', rf'\g<1>{h}', layers)
t = LJ + '.tmp'; open(t, 'w', encoding='utf-8').write(layers); os.replace(t, LJ)
