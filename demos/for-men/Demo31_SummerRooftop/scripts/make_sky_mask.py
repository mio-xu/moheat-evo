#!/usr/bin/env python3
"""The open night sky of the rooftop plate (assets/art/bg_roof.png) → media/art/sky_roof.png (grey mask, 1280×720): where the
fireworks layer may show (user 2026-11-08: fireworks only where no building hides them, Nagisa on top). main.js scales it with each
view's background zoom and cuts Nagisa's silhouette out of it every frame.

The plate is fixed, so the occluders are traced by hand as polygons (1280×720 coordinates) — automatic detection failed: the whole
night scene is blue-tinted and the wall / tank are as smooth and as blue as the sky (tried colour and gradient flood fills).
  python3 scripts/make_sky_mask.py [--preview]"""
import os, sys
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W, H = 1280, 720
RIDGE = [(0, 349), (300, 349), (318, 346), (340, 348), (370, 356), (400, 364), (430, 368), (460, 372), (490, 377), (520, 380),
         (880, 380), (910, 377), (950, 373), (990, 370), (1040, 368), (1280, 368)]   # mountain ridge + sea horizon, traced (1280×720)
# v1 used one straight line at y 342 — up to 40 px above the real ridge, so bursts were cut along an invisible line in open sky
OCCLUDERS = {   # polygons over the sky (1280×720)
    'building':   [(0, 36), (236, 146), (236, 188), (300, 186), (300, 720), (0, 720)],
    'water_tank': [(1040, 268), (1048, 255), (1068, 250), (1068, 112), (1090, 88), (1112, 74), (1140, 64), (1172, 64), (1200, 74),
                   (1214, 80), (1246, 80), (1256, 96), (1256, 208), (1280, 206), (1280, 720), (1040, 720)],
}
m = Image.new('L', (W, H), 0); d = ImageDraw.Draw(m)
d.polygon([(0, 0), (W, 0)] + RIDGE[::-1], fill=255)
for poly in OCCLUDERS.values(): d.polygon(poly, fill=0)
m = m.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(4))   # feathered ~8 px: bursts sink softly behind the ridge / tank
rgba = Image.new('RGBA', (W, H), (255, 255, 255, 0)); rgba.putalpha(m)   # the page clips with ALPHA (destination-in): a greyscale PNG is opaque everywhere (v1 showed fireworks over the door / tank)
rgba.save(os.path.join(ROOT, 'media', 'art', 'sky_roof.png'), optimize=True)
print('wrote media/art/sky_roof.png')
if '--preview' in sys.argv:
    vis = Image.open(os.path.join(ROOT, 'assets', 'art', 'bg_roof.png')).convert('RGB').resize((W, H)); red = Image.new('RGB', (W, H), (255, 0, 80))
    Image.composite(Image.blend(vis, red, .45), vis, m).save(os.path.join(ROOT, 'assets', 'sky_preview.jpg'))
