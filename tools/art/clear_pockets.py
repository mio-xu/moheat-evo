#!/usr/bin/env python3
"""Remove the plain studio background that build_stage.py left INSIDE a figure (DEMO_DESIGN_GUIDE §11.1): pockets enclosed by the
figure — between a phone and the neck, between fingers and sunglasses, behind a ponytail (a grey "halo"), between a leg and the
body — survive the cut-out ("matte": "ai" fills the whole outline) and show as a grey / greenish block on the night scene.

  python3 tools/art/clear_pockets.py <demo> [pose …] [--tol 22] [--min 120] [--dry]

  · run AFTER tools/art/build_stage.py (it rewrites media/art/char_<pose>.webp); poses default = all in project/stage.json
    (list them when a pose has a prop of the same grey as the studio, e.g. a steel can);
  · studio colour = median of the pose's source border (assets/art/<src>.png);
  · a pixel is "studio" when every channel is within --tol of it and it is unsaturated; only THICK areas count (a 3 px opening drops
    lineart and hair strands) of at least --min px; their anti-aliased rim (the same colour, a little looser) goes too;
  · then the content hash (?v=) of each changed char layer in media/layers.js and the flat fallback stills (media/art/<still>) are
    redone with build_stage.py's placement maths. Writes assets/pockets/<pose>.jpg (before | after on the night colour) to check 2×.
Pillow + numpy + scipy.
"""
import argparse, hashlib, json, os, re
import numpy as np
from PIL import Image
from scipy import ndimage

ap = argparse.ArgumentParser(); ap.add_argument('demo'); ap.add_argument('poses', nargs='*')
ap.add_argument('--tol', type=float, default=22); ap.add_argument('--min', type=int, default=120); ap.add_argument('--dry', action='store_true')
A = ap.parse_args()
D = os.path.abspath(A.demo); ART = os.path.join(D, 'media', 'art')
cfg = json.load(open(os.path.join(D, 'project', 'stage.json'), encoding='utf-8'))
SRC = os.path.join(D, cfg.get('src', 'assets/art'))
poses = A.poses or list(cfg['poses'])
os.makedirs(os.path.join(D, 'assets', 'pockets'), exist_ok=True)
changed = set()
for pn in poses:
    p = cfg['poses'][pn]; cpath = os.path.join(ART, f'char_{pn}.webp')
    src = np.asarray(Image.open(os.path.join(SRC, p['src'] + '.png')).convert('RGB'), np.float32)
    bg = np.median(np.concatenate([src[:6].reshape(-1, 3), src[:, :6].reshape(-1, 3), src[:, -6:].reshape(-1, 3)]), 0)
    im = np.asarray(Image.open(cpath).convert('RGBA'), np.float32); rgb, a = im[..., :3], im[..., 3]
    dist = np.abs(rgb - bg).max(2); sat = rgb.max(2) - rgb.min(2); bsat = bg.max() - bg.min()
    core = (a > 0) & (dist < A.tol) & (np.abs(sat - bsat) < 14)
    thick = ndimage.binary_opening(core, structure=np.ones((7, 7), bool))
    lab, n = ndimage.label(thick)
    if not n: print(f'{pn}: studio {bg.astype(int)} — no pockets'); continue
    area = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))
    keep = np.zeros(n + 1, bool); keep[1:] = area >= A.min
    pocket = keep[lab]
    if not pocket.any(): print(f'{pn}: studio {bg.astype(int)} — no pockets ≥ {A.min} px'); continue
    loose = (a > 0) & (dist < A.tol + 10) & (np.abs(sat - bsat) < 20)
    kill = pocket
    for _ in range(3):   # the anti-aliased rim and the small specks of the same grey right next to a pocket (between strands)
        kill = kill | (ndimage.binary_dilation(kill, iterations=4) & loose)
    # soft 1–2 px edge instead of a pixel staircase: alpha × (blurred keep mask), only next to what was cleared
    near = ndimage.binary_dilation(kill, iterations=3)
    soft = ndimage.gaussian_filter((~kill).astype(np.float32), 1.0)
    na = a.copy(); na[kill] = 0; na[near & ~kill] = na[near & ~kill] * soft[near & ~kill]
    out = np.dstack([rgb, na]).clip(0, 255).astype(np.uint8)
    print(f'{pn}: studio {bg.astype(int)} — {int(keep.sum())} pocket(s), {int(kill.sum())} px cleared')
    night = np.array([24, 22, 56, 255], np.uint8)
    def on(x):
        b = Image.new('RGBA', (x.shape[1], x.shape[0]), tuple(int(v) for v in night)); b.alpha_composite(Image.fromarray(x)); return b.convert('RGB')
    ys, xs = np.nonzero(kill); x0, x1, y0, y1 = max(0, xs.min() - 60), min(a.shape[1], xs.max() + 60), max(0, ys.min() - 60), min(a.shape[0], ys.max() + 60)
    bef, aft = on(im.astype(np.uint8)).crop((x0, y0, x1, y1)), on(out).crop((x0, y0, x1, y1))
    sh = Image.new('RGB', (bef.width * 2 + 10, bef.height), (255, 0, 0)); sh.paste(bef, (0, 0)); sh.paste(aft, (bef.width + 10, 0))
    sh.save(os.path.join(D, 'assets', 'pockets', f'{pn}.jpg'), quality=88)
    mk = np.asarray(on(im.astype(np.uint8))).copy(); mk[kill] = (255, 0, 255)   # where it cut, on the whole layer
    Image.fromarray(mk).resize((mk.shape[1] // 2, mk.shape[0] // 2)).save(os.path.join(D, 'assets', 'pockets', f'{pn}_mask.jpg'), quality=85)
    if not A.dry: Image.fromarray(out).save(cpath, quality=90, method=6); changed.add(pn)

if changed and not A.dry:
    lj = os.path.join(D, 'media', 'layers.js'); s = open(lj, encoding='utf-8').read()
    data = json.loads(s[s.index('= {') + 2:s.rindex('}') + 1])
    for pn in changed:
        h = hashlib.md5(open(os.path.join(ART, f'char_{pn}.webp'), 'rb').read()).hexdigest()[:8]
        s = re.sub(rf'art/char_{pn}\.webp\?v=[0-9a-f]+', f'art/char_{pn}.webp?v={h}', s)
    open(lj, 'w', encoding='utf-8').write(s)
    # flat stills: build_stage.py's maths (bg zoom about the centre or the fire point, figure at x / y / height)
    FW, FH = 1920, 1080
    for vname, v in cfg['views'].items():
        if v['pose'] not in changed: continue
        stem, ext = os.path.splitext(v['still']); ext = ext or '.jpg'
        L = data['views'][stem]; b, c = L['bg'], L['char']
        f, bf = L.get('fire'), b['fire']; z = b.get('zoom', 1) or 1
        if f:
            for k in (0, 1): z = max(z, f[k] / bf[k], (1 - f[k]) / (1 - bf[k]))
            ox, oy = f[0] - bf[0] * z, f[1] - bf[1] * z
        else: ox = oy = (1 - z) / 2
        bim = Image.open(os.path.join(D, 'media', b['src'].split('?')[0])).convert('RGB')
        flat = bim.resize((round(FW * z), round(FH * z)), Image.LANCZOS).crop((round(-ox * FW), round(-oy * FH), round(-ox * FW) + FW, round(-oy * FH) + FH)).convert('RGBA')
        ch = Image.open(os.path.join(ART, f"char_{v['pose']}.webp")).convert('RGBA')
        hpx = c['height'] * FH; wpx = hpx * c['w'] / c['h']; ch = ch.resize((round(wpx), round(hpx)), Image.LANCZOS)
        flat.paste(ch, (round(c['x'] * FW - wpx / 2), round(c['y'] * FH - hpx)), ch)
        flat.convert('RGB').save(os.path.join(ART, stem + ext), quality=88)
        print(f'  still media/art/{stem}{ext} redone')
    print('media/layers.js: ?v= of', ', '.join(sorted(changed)), 'updated — bump media/layers.js?v= in the page if it is live')
