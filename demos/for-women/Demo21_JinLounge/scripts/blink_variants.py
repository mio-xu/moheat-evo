#!/usr/bin/env python3
"""Blink variants for the views that had none (user 2026-11-08 "Jin's demo still doesn't seem to move": lounge — the long first view — and
whisper had no eyes patch, so between lines nothing but a 6 px breath moved). The extended poses are wider than 16:9, so the masked edit
gets a 2560×1440 window and the answer is pasted back into a full-size copy.
  python3 scripts/blink_variants.py windows · python3 ../../../tools/openai/images.py . <job> · python3 scripts/blink_variants.py paste
"""
import os, sys
from PIL import Image
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); ART = os.path.join(D, 'assets', 'art')
WIN = {'jin_lounge_ext': ('jin_lounge_win', 0), 'jin_whisper_ext': ('jin_whisper_win', 200)}
if sys.argv[1:] == ['windows']:
    for base, (win, x0) in WIN.items(): Image.open(os.path.join(ART, base + '.png')).convert('RGB').crop((x0, 0, x0 + 2560, 1440)).save(os.path.join(ART, win + '.png')); print('wrote', win)
elif sys.argv[1:] == ['paste']:
    for base, (win, x0) in WIN.items():
        p = os.path.join(ART, win + '_blink.png')
        if not os.path.exists(p): continue
        full = Image.open(os.path.join(ART, base + '.png')).convert('RGB'); full.paste(Image.open(p).convert('RGB').resize((2560, 1440), Image.LANCZOS), (x0, 0))
        full.save(os.path.join(ART, base + '_blink.png')); print('wrote', base + '_blink')
else: raise SystemExit(__doc__)
