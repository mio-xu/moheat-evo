#!/usr/bin/env python3
"""Design-option sheet for the coordinator: per character the original (reference) | option A | option B → project/designs_contact.jpg"""
import os
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); A = os.path.join(ROOT, 'assets/art')
W, H = 760, 428
try: F = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 26)
except Exception: F = ImageFont.load_default()
rows = [('mint', 'ref_mint'), ('hinata', 'ref_hinata'), ('nagisa', 'ref_nagisa')]
sheet = Image.new('RGB', (W * 3, (H + 40) * 3), (24, 24, 30)); d = ImageDraw.Draw(sheet)
for r, (c, ref) in enumerate(rows):
    for k, (lab, f) in enumerate([(f'{c} ORIGINAL', ref), (f'{c} option A', f'design_{c}_a'), (f'{c} option B', f'design_{c}_b')]):
        im = Image.open(os.path.join(A, f + '.png')).convert('RGB'); im.thumbnail((W, H))
        x, y = k * W, r * (H + 40); sheet.paste(im, (x + (W - im.width) // 2, y + 40)); d.text((x + 12, y + 6), lab, fill=(255, 230, 160), font=F)
sheet.save(os.path.join(ROOT, 'project/designs_contact.jpg'), quality=86); print('project/designs_contact.jpg')
