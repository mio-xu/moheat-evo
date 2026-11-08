#!/usr/bin/env python3
"""Clean the cut-outs that tools/art/build_stage.py wrote, for a NIGHT scene (DEMO_DESIGN_GUIDE §11.1): the plain grey studio
background (#c8c8c8) survives as a light fringe on hair strands and in gaps enclosed by lineart — invisible on light backgrounds,
obvious on a dark-blue night. Run after every build_stage.py:

  python3 tools/art/build_stage.py <demo> && python3 tools/art/clean_cutout.py <demo>
(moved here from Demo31's scripts/ on 2026-11-08: the demo folder is now a required argument — running Demo31's copy from another
demo silently re-cleaned Demo31 instead.)

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

import sys
if len(sys.argv) < 2: raise SystemExit('usage: clean_cutout.py <demo folder> [--bg R,G,B]')
ROOT = os.path.abspath(sys.argv[1])
# --bg: the studio colour the poses were drawn on (default the grey #c8c8c8; chroma green poses: --bg 8,158,65, Demo39 Luna — thin dark
# hair strands keyed off green come out light / teal without this matting step)
STUDIO = [float(v) for v in sys.argv[sys.argv.index('--bg') + 1].split(',')] if '--bg' in sys.argv else [200., 200., 200.]
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
    if max(STUDIO) - min(STUDIO) > 30: grey = np.zeros_like(grey)   # chroma-key studio (--bg): no studio grey to remove — light-grey shirt shadows must stay (Demo19 Luna)
    near = grow(a < .35, REACH)
    for _ in range(2):   # grey that touches what was just removed goes too (enclosed gaps reached through the fringe)
        kill = grey & near & (a > 0)
        a = np.where(kill, 0, a); near = near | grow(kill, 9)
    # enclosed background patches anywhere (between hair and shoulder, between fingers, collar gaps): every connected blob of the
    # studio grey that is big enough goes, wherever it is (v1 only looked within REACH of the edge — user: 还是有些地方抠图细节有问题)
    strict = (sat < 18) & (lum > 165) & (lum < 218) & (a > 0)
    if max(STUDIO) - min(STUDIO) > 30: strict = np.zeros_like(strict)
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
    # MATTING near the edge (v3, user: 头发抠图部分还是有些没处理好的 — v2's thresholds left a light fuzz on every strand and a grey
    # wedge inside a loop of hair): the picture was drawn on the known studio grey BG, so each edge pixel is C = α·F + (1−α)·BG with
    # F = the figure colour next to it. Rebuild C, project it onto the BG→F line → the true α; colour = F. A pixel that is really
    # background (≈ BG) gets α ≈ 0 by itself, wherever it is near the edge.
    BG = np.array(STUDIO)
    band = grow(a < .5, 25) & (a > 0) & (w > .08)
    C = a[..., None] * im[..., :3] + (1 - a[..., None]) * BG          # the original pixel over the studio grey
    v = fill - BG; d2 = (v * v).sum(2)
    alpha = np.clip(((C - BG) * v).sum(2) / np.maximum(d2, 1), 0, 1)
    ok = band & (d2 > 45 ** 2)   # only where the figure colour is clearly unlike the grey (light skin / pale props keep their alpha)
    a = np.where(ok, np.minimum(a, np.clip((alpha - .08) / .84, 0, 1)), a)
    rgb = np.where(ok[..., None], fill, rgb)
    out = np.dstack([np.clip(rgb, 0, 255), np.clip(a * 255, 0, 255)]).astype(np.uint8)
    Image.fromarray(out).save(path, quality=88, method=6)
    return int(((im[..., 3] > 0) & (a == 0)).sum())


src = open(os.path.join(ROOT, 'media', 'layers.js')).read()
D = json.loads(src[src.index('= {') + 2:src.rindex('}') + 1])
done = set()
for stem, v in D['views'].items():
    c = v['char']; p = os.path.join(ROOT, 'media', c['src'].split('?')[0])   # build_stage adds ?v=<hash> to the paths
    if p not in done: print('cleaned', c['src'], clean(p), 'px'); done.add(p)
# flat stills, same maths as build_stage.py (fire null → centred zoom)
FW, FH = 1920, 1080
for stem, v in D['views'].items():
    z = v['bg'].get('zoom') or 1; ox = oy = (1 - z) / 2
    bg = Image.open(os.path.join(ROOT, 'media', v['bg']['src'].split('?')[0])).convert('RGB')
    flat = bg.resize((round(FW * z), round(FH * z)), Image.LANCZOS).crop((round(-ox * FW), round(-oy * FH), round(-ox * FW) + FW, round(-oy * FH) + FH)).convert('RGBA')
    c = v['char']; ch = Image.open(os.path.join(ROOT, 'media', c['src'].split('?')[0])).convert('RGBA')
    hpx = c['height'] * FH; wpx = hpx * c['w'] / c['h']; ch = ch.resize((round(wpx), round(hpx)), Image.LANCZOS)
    flat.paste(ch, (round(c['x'] * FW - wpx / 2), round(c['y'] * FH - hpx)), ch)
    flat.convert('RGB').save(os.path.join(ART, stem + '.jpg'), quality=88)
print('flat stills rewritten:', len(D['views']))
