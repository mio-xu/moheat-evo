#!/usr/bin/env python3
"""QA of the finished promo: a contact sheet of full-resolution frames (2 × 6 at 960 px plus every frame saved at 1920 for a close
look), loudness / true peak, and the L / R balance of the key moments.  Usage: python3 qa.py <video.mp4> <outdir> [t1,t2,…]"""
import os, subprocess, sys
from PIL import Image, ImageDraw, ImageFont

v, out = sys.argv[1], sys.argv[2]; os.makedirs(out, exist_ok=True)
T = [float(x) for x in sys.argv[3].split(',')] if len(sys.argv) > 3 else [2.5, 7.5, 11.5, 14.3, 17.5, 23.5, 29.5, 35.5, 41.5, 47.3, 53.0, 59.5]
tiles = []
for t in T:
    p = os.path.join(out, f'f_{t:05.1f}.png')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(t), '-i', v, '-frames:v', '1', p], check=True)
    tiles.append((t, p))
cols = 3; tw, th = 960, 540; rows = (len(tiles) + cols - 1) // cols
sheet = Image.new('RGB', (cols * tw, rows * th), '#000'); d = ImageDraw.Draw(sheet)
try: font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 28)
except Exception: font = None
for i, (t, p) in enumerate(tiles):
    im = Image.open(p).convert('RGB').resize((tw, th), Image.LANCZOS); x, y = (i % cols) * tw, (i // cols) * th
    sheet.paste(im, (x, y)); d.rectangle([x, y, x + 110, y + 40], fill='#000'); d.text((x + 8, y + 5), f'{t:.1f}s', fill='#ffcc00', font=font)
sheet.save(os.path.join(out, 'contact_sheet.jpg'), quality=92)
r = subprocess.run(['ffmpeg', '-nostats', '-i', v, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
print('\n'.join(l for l in r.split('Summary:')[-1].splitlines() if any(k in l for k in ('I:', 'Peak:', 'LRA:'))))
print('sheet:', os.path.join(out, 'contact_sheet.jpg'))
