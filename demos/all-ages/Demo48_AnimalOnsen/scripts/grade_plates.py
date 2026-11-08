#!/usr/bin/env python3
"""The onsen plates came out a little muted for the all-ages fairy series (style_card check: mean saturation 0.33 vs the anchor 0.55,
tolerance 0.2) → bg_<plate>_g.png = the plate with colour × 1.2 / rain × 1.3 (a grade only: same drawing; the rain plate stays greyer than the
sunny one, as it should). scripts/make_stage.py uses the graded plates. python3 scripts/grade_plates.py"""
import os
from PIL import Image, ImageEnhance
ART = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'assets', 'art')
for p, k in (('bg_onsen', 1.2), ('bg_onsen_rain', 1.3)):   # the rain plate a bit more: it measured 0.35 at × 1.2 (the tolerance edge)
    ImageEnhance.Color(Image.open(os.path.join(ART, p + '.png')).convert('RGB')).enhance(k).save(os.path.join(ART, p + '_g.png')); print('wrote', p + '_g.png')
