#!/usr/bin/env python3
"""Local pose fixes before tools/art/build_stage.py (no credits): the cold-breath close-up is used MIRRORED for the left ear
(saku_breath2 + its talk variant → saku_breathL / saku_breathL_talk). The mask and the mole swap sides there (a ~5 s close-up)."""
import os
from PIL import Image, ImageOps
A = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'assets', 'art')
for src, dst in (('saku_breath2', 'saku_breathL'), ('saku_breath_talk', 'saku_breathL_talk')):
    ImageOps.mirror(Image.open(os.path.join(A, src + '.png')).convert('RGB')).save(os.path.join(A, dst + '.png')); print(dst)
