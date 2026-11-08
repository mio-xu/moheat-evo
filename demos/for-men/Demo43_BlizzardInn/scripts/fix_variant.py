#!/usr/bin/env python3
"""Small pixel fixes on variants (Pillow, no API): put back the base's pixels in a box the masked edit changed by mistake.
hinata_ear_talk v3: a stray nostril dot above the lips (box 1690–1750 × 600–640 back from hinata_ear).  python3 scripts/fix_variant.py"""
import os
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); A = os.path.join(ROOT, 'assets/art')
FIX = {'hinata_ear_talk': ('hinata_ear', (1690, 600, 1750, 640))}
for v, (base, box) in FIX.items():
    im = Image.open(os.path.join(A, v + '.png')).convert('RGB'); b = Image.open(os.path.join(A, base + '.png')).convert('RGB')
    im.paste(b.crop(box), box[:2]); im.save(os.path.join(A, v + '.png')); print('fixed', v, box)
