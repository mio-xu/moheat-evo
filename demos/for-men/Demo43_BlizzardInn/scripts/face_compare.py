#!/usr/bin/env python3
"""Review sheet: per character the ORIGINAL face (her earlier demo) next to every pose of this demo (same face?) → project/face_compare.jpg
  python3 scripts/face_compare.py"""
import json, os
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); A = os.path.join(ROOT, 'assets/art')
FP = json.load(open(os.path.join(ROOT, 'project/face_points.json')))
ORIG = {'mint': ('ref_mint', 1113, 560, 300), 'hinata': ('ref_hinata', 1250, 430, 260), 'nagisa': ('ref_nagisa', 1178, 560, 300)}   # centre + half size (px)
POSES = {'mint': ['mint_base', 'mint_ear'], 'hinata': ['hinata_base', 'hinata_dice', 'hinata_ear'], 'nagisa': ['nagisa_base', 'nagisa_guard']}
S = 300
F = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 18)
def crop(name, cx, cy, half):
    im = Image.open(os.path.join(A, name + '.png')).convert('RGB'); return im.crop((cx - half, cy - half, cx + half, cy + half)).resize((S, S), Image.LANCZOS)
rows = []
for c, ps in POSES.items():
    tiles = [('ORIGINAL', crop(*ORIG[c]))]
    for p in ps:
        f = FP[p]; ex = sum(e[0] for e in f['eyes']) / 2; ey = sum(e[1] for e in f['eyes']) / 2; half = int(2.0 * (f['mouth'][1] - ey) + 60)
        tiles.append((p, crop(p, int(ex), int(ey + .25 * half), half)))
    rows.append((c, tiles))
W = S * max(len(t) for _, t in rows); sheet = Image.new('RGB', (W, (S + 28) * len(rows)), (24, 24, 30)); d = ImageDraw.Draw(sheet)
for r, (c, tiles) in enumerate(rows):
    for k, (lab, im) in enumerate(tiles):
        sheet.paste(im, (k * S, r * (S + 28) + 28)); d.text((k * S + 6, r * (S + 28) + 4), f'{c} · {lab}', fill=(255, 230, 160), font=F)
sheet.save(os.path.join(ROOT, 'project/face_compare.jpg'), quality=86); print('project/face_compare.jpg')
