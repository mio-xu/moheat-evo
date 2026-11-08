#!/usr/bin/env python3
"""Clean the cut-outs that tools/art/build_stage.py wrote, for a NIGHT scene (DEMO_DESIGN_GUIDE §11.1): the plain grey studio
background (#c8c8c8) survives as a light fringe on hair strands and in gaps enclosed by lineart — invisible on light backgrounds,
obvious on a dark-blue night. Run after every build_stage.py:

  python3 tools/art/build_stage.py demos/for-men/Demo31_SummerRooftop && python3 demos/for-men/Demo31_SummerRooftop/scripts/clean_cutout.py

1. alpha 0 for background-grey pixels (low saturation, 150–220 grey) within REACH px of transparency (fringe + hair gaps; the white
   firework pattern on the yukata is brighter and far from the edge, so it stays);
2. edge pixels (alpha < 1) recoloured from the solid figure next to them (no grey halo), alpha eased in by 1 px;
3. the flat fallback stills media/art/<still>.jpg recomposed with build_stage's placement maths from the cleaned char_*.webp.
Pillow + numpy only.
"""
import json, os
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ART = os.path.join(ROOT, 'media', 'art')
REACH = 41   # px (odd, MaxFilter size) around transparency where background grey is removed
MIN_AREA = 60   # px: smaller grey blobs are left (highlights, tiny specks inside the drawing)


def grow(mask, size):
    return np.asarray(Image.fromarray(mask.astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(size))) > 127


def clean(path):
    im = np.asarray(Image.open(path).convert('RGBA'), np.float32)
    rgb, a = im[..., :3], im[..., 3] / 255
    sat = rgb.max(2) - rgb.min(2); lum = rgb.mean(2)
    grey = (sat < 24) & (lum > 150) & (lum < 222)
    near = grow(a < .35, REACH)
    for _ in range(2):   # grey that touches what was just removed goes too (enclosed gaps reached through the fringe)
        kill = grey & near & (a > 0)
        a = np.where(kill, 0, a); near = near | grow(kill, 9)
    # enclosed background patches anywhere (between hair and shoulder, between fingers, collar gaps): every connected blob of the
    # studio grey that is big enough goes, wherever it is (v1 only looked within REACH of the edge — user: 还是有些地方抠图细节有问题)
    strict = (sat < 18) & (lum > 165) & (lum < 218) & (a > 0)
    lab, n = ndimage.label(strict)
    if n:
        area = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1)); mlum = ndimage.mean(lum, lab, range(1, n + 1))
        big = np.zeros(n + 1, bool); big[1:] = (area >= MIN_AREA) & (mlum < 214)
        kill = big[lab]; kill = kill | (grow(kill, 5) & grey)   # and the anti-aliased grey ring around each blob
        a = np.where(kill, 0, a)
    a = np.where(grow(a < .02, 3) & (a < .999), a * .6, a)   # ease the outermost ring in
    # recolour edge pixels from the solid figure: blur of solid colour / blur of solid mask
    solid = (a > .97).astype(np.float32)
    def blur(x, r): return np.asarray(Image.fromarray(np.clip(x, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r)), np.float32)
    w = blur(solid * 255, 5) / 255 + 1e-4
    fill = np.stack([blur(rgb[..., c] * solid, 5) for c in range(3)], 2) / w[..., None]
    edge = (a < .97)[..., None]
    rgb = np.where(edge & (w[..., None] > .08), fill, rgb)
    a = np.where((a < .97) & (w < .08), a * .3, a)   # a lone edge pixel with no solid figure nearby: mostly background → fade it
    # light specks along thin strands: pixels next to transparency that are clearly lighter than the figure around them are mixed
    # with the studio grey (anti-aliasing) → take the figure's colour and fade them (v2 left a dotted light outline on hair)
    band = grow(a < .3, 7) & (a > 0)
    flum = fill.mean(2)
    light = band & (rgb.mean(2) > flum + 18) & (w > .08)
    rgb = np.where(light[..., None], fill, rgb); a = np.where(light, a * .55, a)
    out = np.dstack([np.clip(rgb, 0, 255), np.clip(a * 255, 0, 255)]).astype(np.uint8)
    Image.fromarray(out).save(path, quality=88, method=6)
    return int(((im[..., 3] > 0) & (a == 0)).sum())


src = open(os.path.join(ROOT, 'media', 'layers.js')).read()
D = json.loads(src[src.index('= {') + 2:src.rindex('}') + 1])
done = set()
for stem, v in D['views'].items():
    c = v['char']; p = os.path.join(ROOT, 'media', c['src'])
    if p not in done: print('cleaned', c['src'], clean(p), 'px'); done.add(p)
# flat stills, same maths as build_stage.py (fire null → centred zoom)
FW, FH = 1920, 1080
for stem, v in D['views'].items():
    z = v['bg'].get('zoom') or 1; ox = oy = (1 - z) / 2
    bg = Image.open(os.path.join(ROOT, 'media', v['bg']['src'])).convert('RGB')
    flat = bg.resize((round(FW * z), round(FH * z)), Image.LANCZOS).crop((round(-ox * FW), round(-oy * FH), round(-ox * FW) + FW, round(-oy * FH) + FH)).convert('RGBA')
    c = v['char']; ch = Image.open(os.path.join(ROOT, 'media', c['src'])).convert('RGBA')
    hpx = c['height'] * FH; wpx = hpx * c['w'] / c['h']; ch = ch.resize((round(wpx), round(hpx)), Image.LANCZOS)
    flat.paste(ch, (round(c['x'] * FW - wpx / 2), round(c['y'] * FH - hpx)), ch)
    flat.convert('RGB').save(os.path.join(ART, stem + '.jpg'), quality=88)
print('flat stills rewritten:', len(D['views']))
