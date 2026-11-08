#!/usr/bin/env python3
"""The three at dawn (stage 5 + the cover): a static group still composed from the cut-out base poses (media/art/char_*.webp, written by
tools/art/build_stage.py) on the graded dawn plate — no image API (guide §6.3: the group = the standing layers, no new picture).
Mint stands a step behind in the middle, Nagisa left, Hinata right; a warm dawn tint on the figures. → media/art/trio_dawn.jpg
  python3 scripts/make_trio.py   (after build_stage.py)"""
import os
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); W, H = 1920, 1080
base = Image.open(os.path.join(ROOT, 'assets/art/bg_dawn.png')).convert('RGB').resize((W, H), Image.LANCZOS).convert('RGBA')
def char(n, h, cx, warm=(1.05, 1.0, .93)):
    im = Image.open(os.path.join(ROOT, f'media/art/char_{n}.webp')).convert('RGBA')
    k = h * H / im.height; im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    a = np.asarray(im, np.float32); a[..., :3] = np.clip(a[..., :3] * warm + np.array([6, 2, -4]), 0, 255); im = Image.fromarray(a.astype(np.uint8))
    bg.alpha_composite(im, (round(cx * W - im.width / 2), H - im.height))
def compose(out, spots):
    global bg
    bg = base.copy()
    for n, h, cx, warm in spots: char(n, h, cx, warm)
    bg.convert('RGB').save(os.path.join(ROOT, 'media/art', out), quality=88); print('media/art/' + out)
M, N_, Hn = (1.03, .99, .93), (1.05, 1.0, .93), (1.05, 1.0, .93)
# Nagisa fills the height (her staff runs off the top of the frame, never cut inside it); Mint a step behind
compose('trio_dawn.jpg', [('mint_base', .8, .50, M), ('nagisa_base', 1.0, .22, N_), ('hinata_base', .86, .78, Hn)])
# the cover = DEMO_DESIGN_GUIDE §7.3 cover standard (shared/cover.js STD.duo, the group version): the middle of the eye-lines at (72 %, 30 %),
# every face (hairline → chin) ≈ 19 % (three people; standard range 16–26) of the frame height, all faces on the right half; the title column stays on the dark left.
import json
FP = json.load(open(os.path.join(ROOT, 'project', 'face_points.json')))
LJ = open(os.path.join(ROOT, 'media', 'layers.js')).read(); LD = json.loads(LJ[LJ.index('{'):LJ.rindex('}') + 1])
BOX = {v['char']['src'].split('/')[-1].split('.')[0].replace('char_', ''): v['char'] for v in LD['views'].values()}
def face_spot(n, cx, cy=.30, face=.21, warm=(1.05, 1.0, .93)):
    f, c = FP[n], BOX[n]; ex = sum(e[0] for e in f['eyes']) / 2; ey = sum(e[1] for e in f['eyes']) / 2
    fh = 2.4 * (f['mouth'][1] - ey)                      # hairline → chin ≈ 2.4 × (eye-line → mouth), in source px
    im = Image.open(os.path.join(ROOT, f'media/art/char_{n}.webp')).convert('RGBA'); x0, y0, x1, y1 = c['box']; k0 = im.width / (x1 - x0)
    k = face * H / fh / k0                              # webp px → frame px
    im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    a = np.asarray(im, np.float32); a[..., :3] = np.clip(a[..., :3] * warm + np.array([6, 2, -4]), 0, 255); im = Image.fromarray(a.astype(np.uint8))
    bg.alpha_composite(im, (round(cx * W - (ex - x0) * k0 * k), round(cy * H - (ey - y0) * k0 * k)))
    return [(cx, cy), face]
bg = base.copy(); spots = [face_spot('nagisa_base', .585, .29, .19, N_), face_spot('hinata_base', .88, .29, .19, Hn), face_spot('mint_base', .72, .33, .19, M)]   # Mint in front, a little lower
bg.convert('RGB').save(os.path.join(ROOT, 'media/art', 'cover_trio.jpg'), quality=88); print('media/art/cover_trio.jpg', spots)
