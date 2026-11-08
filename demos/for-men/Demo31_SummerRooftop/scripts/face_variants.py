#!/usr/bin/env python3
"""Mouth / blink variants for the poses that had none (mouth QA 2026-11-08): shoulder (talk + blink — she speaks n17a there),
laugh + whisper (drawn mid-word → a CLOSED-mouth variant, registered as "quiet" = patch kind mouth_quiet, shown in silence).

The extended poses are 2900–2920 px wide; gpt-image-2 answers in 16:9, so the edit gets a 2560×1440 window (x0 = 200) and the
answer is pasted back into a full-size copy (same size as the base, as build_stage / face_patches expect).
  python3 scripts/face_variants.py windows          # writes assets/art/<base>_win.png
  python3 ../../../tools/openai/images.py . <job> [--quality …]   # jobs in project/web_prompts.json (masked edits)
  python3 scripts/face_variants.py paste            # assets/art/<job>.png (window) → assets/art/<target>.png (full size)
"""
import os, sys
from PIL import Image
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); ART = os.path.join(D, 'assets', 'art')
X0 = 200
WIN = {'nagisa_shoulder2_flat_ext': 'nagisa_shoulder2_win', 'nagisa_whisper2_flat_ext': 'nagisa_whisper2_win'}
# job (OpenAI answer, window or full frame) → (base it was made from, target file build_stage reads)
JOBS = {'nagisa_shoulder2_win_talk': ('nagisa_shoulder2_flat_ext', 'nagisa_shoulder2_flat_ext_talk'),
        'nagisa_shoulder2_win_blink': ('nagisa_shoulder2_flat_ext', 'nagisa_shoulder2_flat_ext_blink'),
        'nagisa_whisper2_win_quiet': ('nagisa_whisper2_flat_ext', 'nagisa_whisper2_flat_ext_quiet'),
        'nagisa_laugh_quiet': ('nagisa_laugh', None)}
if sys.argv[1:] == ['windows']:
    for base, win in WIN.items():
        im = Image.open(os.path.join(ART, base + '.png')).convert('RGB'); im.crop((X0, 0, X0 + 2560, 1440)).save(os.path.join(ART, win + '.png')); print('wrote', win)
elif sys.argv[1:] == ['paste']:
    for job, (base, target) in JOBS.items():
        p = os.path.join(ART, job + '.png')
        if not target or not os.path.exists(p): continue
        full = Image.open(os.path.join(ART, base + '.png')).convert('RGB'); ans = Image.open(p).convert('RGB').resize((2560, 1440), Image.LANCZOS)
        full.paste(ans, (X0, 0)); full.save(os.path.join(ART, target + '.png')); print('wrote', target)
else: raise SystemExit(__doc__)
