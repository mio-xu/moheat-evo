#!/usr/bin/env python3
"""Light / style grade of the layers (G4), pixels only — no redraw:
1. plates bg_room_<t>_nob → bg_room_<t>_soft: a soft depth of field (Gaussian 3.5 px on 2560): the cat is the sharp subject, the tatami weave
   no longer reads as hard detail (style_card: line density 0.178 vs the cat anchor Demo11 0.066 — the plate's weave, not Naomi).
2. Naomi + the bottle were drawn in daylight → <pose>_rain / <pose>_night copies for the dusk shower (cool grey) and the lamp-lit night
   (dim, warm from the lamp), the magenta screen kept exactly (chroma key unchanged); blinks graded the same.
python3 scripts/grade.py"""
import os
import numpy as np
from PIL import Image, ImageFilter
ART = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'assets', 'art')
for t in ('day', 'rain', 'night'):
    Image.open(os.path.join(ART, f'bg_room_{t}_nob.png')).convert('RGB').filter(ImageFilter.GaussianBlur(3.5)).save(os.path.join(ART, f'bg_room_{t}_soft.png'))
# (gain, lift, desaturation): her fur is a warm mauve-grey in every reference — a colour gain alone pushed it to violet (rain) / pink (night),
# so the grade first pulls the colour toward its own grey, then dims and tints only a little
GRADE = {'rain': (np.array([.70, .70, .71], np.float32), np.array([3, 3, 5], np.float32), .55),
         'night': (np.array([.74, .70, .66], np.float32), np.array([4, 3, 4], np.float32), .3)}
USE = {'rain': ['naomi_startle', 'prop_bottle'], 'night': ['naomi_shoulder', 'naomi_pancake', 'prop_bottle']}
for t, poses in USE.items():
    gain, lift, de = GRADE[t]
    for pose in poses:
        for suf in ('', '_blink'):
            p = os.path.join(ART, pose + suf + '.png')
            if not os.path.exists(p): continue
            im = np.asarray(Image.open(p).convert('RGB')).astype(np.float32)
            # each pixel = fur × (1 − a) + screen × a (a from how magenta it is): un-mix, grade only the fur part, re-mix — so the soft fur
            # tips are graded too (grading only the solid pixels left a pale ungraded rim; grading the screen mix gave the keyer a green fringe)
            scr = np.median(np.concatenate([im[0], im[-1], im[:, 0], im[:, -1]]), 0); key = np.minimum(im[..., 0], im[..., 2]) - im[..., 1]
            a = np.clip((key - 8) / max(40.0, float(min(scr[0], scr[2]) - scr[1]) - 8), 0, 1)[..., None]
            fur = np.clip((im - scr * a) / np.maximum(1 - a, .05), 0, 255)
            g = fur.mean(2, keepdims=True); f = fur + (g - fur) * de
            out = (f * gain + lift) * (1 - a) + scr * a
            Image.fromarray(out.clip(0, 255).astype(np.uint8)).save(os.path.join(ART, f'{pose}_{t}{suf}.png'))
    print(t, poses)
