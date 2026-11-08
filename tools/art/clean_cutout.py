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

--unmix (v4, 2026-11-08, Demo24 Gaku: v3 left thin dark strands half transparent, fingers with a see-through rim and holes in a
light fur collar): a difference key against the backdrop, only in a 10 px band at the cut-out edge and around enclosed backdrop
blobs. alpha from the distance to the backdrop (dark / coloured pixels stay solid, light grey / white halo goes; on a mid / dark grey backdrop the band is 6 px and the
halo = pixels within 20 of the backdrop), then the mix ratio
along backdrop → neighbouring figure colour (tinted halo next to blue / brown hair), colour = the figure next to it. The backdrop is read
per pose from the corners of the raw pose image (stage.json src), else --bg. --only char_a,char_b limits it to those layers
(re-running on an already clean layer is harmless but not needed).
  python3 tools/art/clean_cutout.py <demo> --unmix [--only char_sit,char_log] [--bg R,G,B]
"""
import json, os
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

import sys
if len(sys.argv) < 2: raise SystemExit('usage: clean_cutout.py <demo folder> [--bg R,G,B] [--unmix] [--only char_a,char_b]')
ROOT = os.path.abspath(sys.argv[1])
# --bg: the studio colour the poses were drawn on (default the grey #c8c8c8; chroma green poses: --bg 8,158,65, Demo39 Luna — thin dark
# hair strands keyed off green come out light / teal without this matting step)
STUDIO = [float(v) for v in sys.argv[sys.argv.index('--bg') + 1].split(',')] if '--bg' in sys.argv else [200., 200., 200.]
ART = os.path.join(ROOT, 'media', 'art')
REACH = 41   # px (odd, MaxFilter size) around transparency where background grey is removed
MIN_AREA = 60   # px: smaller grey blobs are left (highlights, tiny specks inside the drawing)


UNMIX = '--unmix' in sys.argv
ONLY = set(sys.argv[sys.argv.index('--only') + 1].split(',')) if '--only' in sys.argv else None


def unmix(path, BG, reach=10, soft=55., floor=8.):
    """v4: difference key + mix-ratio matting in the edge band (see the docstring)."""
    im = np.asarray(Image.open(path).convert('RGBA'), np.float32)
    rgb, a = im[..., :3], im[..., 3] / 255
    BG = np.array(BG, np.float32)
    d = np.abs(rgb - BG).max(2); sat = rgb.max(2) - rgb.min(2); lum = rgb.mean(2)
    light = BG.mean() > 150; bsat = float(BG.max() - BG.min())
    if not light: reach = min(reach, 6)                               # mid / dark backdrop: grey clothing nearby is ambiguous, stay close
    band = ndimage.binary_dilation(a < .1, iterations=reach) & (a > 0)
    lab, n = ndimage.label((d < 16) & (sat < 12) & (a > 0))          # enclosed backdrop blobs (hair loops, gaps by the ear)
    if n and light:   # not on mid / dark backdrops: there garment shading has the backdrop colour (Demo22 towel lost half its shadow)
        area = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))
        big = np.zeros(n + 1, bool); big[1:] = area >= 40
        band |= ndimage.binary_dilation(big[lab], iterations=4) & (a > 0)
    if light:
        halo = (sat < 22) & (lum > BG.mean() - 28)                    # light grey / white outline + backdrop
        al = np.clip((d - floor) / soft, 0, 1)
        al = np.where((sat >= 26) | (lum < 100), 1, al)
    else:   # mid / dark grey (Demo12 / 21 / 22, 2026-11-08): the halo is the backdrop itself, a dull ring around light hair / skin
        halo = (d < 20) & (sat < 14 + bsat)
        al = np.clip((d - 12) / 40, 0, 1)
        al = np.where(sat >= 26 + bsat, 1, al)
    al = np.where(halo, 0, al)
    na = np.where(band, np.minimum(a, al), a)
    F = BG + (rgb - BG) / np.maximum(al, .05)[..., None]              # C = a F + (1 - a) BG
    solid = ((na > .97) & ~halo).astype(np.float32)
    w = ndimage.gaussian_filter(solid, 2.5)
    fill = np.stack([ndimage.gaussian_filter(rgb[..., c] * solid, 2.5) for c in range(3)], 2) / np.maximum(w, 1e-4)[..., None]
    v = fill - BG; d2 = (v * v).sum(2)                                # tinted halo: mix ratio along BG → figure colour
    proj = np.clip(((rgb - BG) * v).sum(2) / np.maximum(d2, 1), 0, 1)
    na = np.where(band & (w > .06) & (d2 > 45 ** 2) & (na > 0), np.minimum(na, np.clip((proj - .1) / .8, 0, 1)), na)
    sm = ndimage.gaussian_filter(np.where(na < .04, 0, na), .8)        # pixel-wise keying leaves a serrated rim on clean curves
    na = np.where(band, np.minimum(na, sm) * .5 + sm * .5, na); na = np.where(na < .04, 0, na)
    col = np.where((w > .06)[..., None], fill, np.clip(F, 0, 255))
    rgb = np.where((band & (na > 0) & (na < .97))[..., None], col, rgb)
    Image.fromarray(np.dstack([np.clip(rgb, 0, 255), na * 255]).astype(np.uint8)).save(path, quality=90, method=6)
    return int(((a > 0) & (na == 0)).sum())


def pose_key(stem):
    """backdrop colour of the raw pose behind media/art/char_<pose>.webp — the same reading as check_art.py's fringe check (plain raw
    corners, else the stage.json matte colour); --bg overrides; None = unknown (the layer is skipped)."""
    if '--bg' in sys.argv: return STUDIO
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import check_art
    k = check_art.backdrop(ROOT, check_art.stage(ROOT), stem[5:])
    return None if k is None else np.array(k, np.float32)


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
    stem = os.path.splitext(os.path.basename(p))[0]
    if p in done or (ONLY and stem not in ONLY): continue
    if UNMIX:
        k = pose_key(stem)
        if k is None: print('skipped', c['src'], '(backdrop unknown: pass --bg R,G,B)'); continue
        print('unmixed', c['src'], 'backdrop', tuple(int(x) for x in k), unmix(p, k), 'px')
    else: print('cleaned', c['src'], clean(p), 'px')
    done.add(p)
# flat stills, same maths as build_stage.py (fire null → centred zoom). Only views whose char layer was cleaned now (--only), with the
# file name / size stage.json gives (still "x.webp", "small": true — v1 always wrote <stem>.jpg at full size)
FW, FH = 1920, 1080
try: SV = {os.path.splitext(w.get('still', k))[0]: w for k, w in json.load(open(os.path.join(ROOT, 'project', 'stage.json')))['views'].items()}
except Exception: SV = {}
n_flat = 0
for stem, v in D['views'].items():
    if os.path.join(ROOT, 'media', v['char']['src'].split('?')[0]) not in done or v.get('more'): continue   # multi-figure views: build_stage
    # same zoom / offset as build_stage.py: a view with "fire" pins the bg's fire point to the view's fire point (v1 ignored it and
    # rewrote Demo24's fire views with the wrong crop of the plate, 2026-11-08)
    z = v['bg'].get('zoom') or 1; f, bf = v.get('fire'), v['bg'].get('fire')
    if f and bf:
        for k in (0, 1): z = max(z, f[k] / bf[k], (1 - f[k]) / (1 - bf[k]))
        ox, oy = f[0] - bf[0] * z, f[1] - bf[1] * z
    else: ox = oy = (1 - z) / 2
    bg = Image.open(os.path.join(ROOT, 'media', v['bg']['src'].split('?')[0])).convert('RGB')
    flat = bg.resize((round(FW * z), round(FH * z)), Image.LANCZOS).crop((round(-ox * FW), round(-oy * FH), round(-ox * FW) + FW, round(-oy * FH) + FH)).convert('RGBA')
    c = v['char']; ch = Image.open(os.path.join(ROOT, 'media', c['src'].split('?')[0])).convert('RGBA')
    hpx = c['height'] * FH; wpx = hpx * c['w'] / c['h']; ch = ch.resize((round(wpx), round(hpx)), Image.LANCZOS)
    flat.paste(ch, (round(c['x'] * FW - wpx / 2), round(c['y'] * FH - hpx)), ch)
    sv = SV.get(stem, {}); ext = os.path.splitext(sv.get('still', ''))[1] or '.jpg'
    flat = flat.convert('RGB')
    if sv.get('small'): flat = flat.resize((FW // 2, FH // 2), Image.LANCZOS)
    flat.save(os.path.join(ART, stem + ext), quality=80 if sv.get('small') else 88); n_flat += 1
print('flat stills rewritten:', n_flat)
