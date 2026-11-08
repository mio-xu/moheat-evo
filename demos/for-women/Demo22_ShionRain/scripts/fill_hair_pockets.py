#!/usr/bin/env python3
"""Run after tools/art/build_stage.py + tools/art/clear_pockets.py on this demo. clear_pockets removes the studio grey inside the figure,
but between "your" out-of-focus hair strands (bottom left of the dryer / window views) that left small holes showing the dark floor,
and half of the lower glasses lens stayed grey (QA 2026-11-08). Here, on media/art/char_<pose>.webp:
  · small enclosed holes in the hair zone are filled with the nearest strand's colour, darkened (the shadow between strands);
  · inside the lens rim the remaining grey is cleared, so the lens is see-through everywhere.
Also puts the towel back at the top of the towel view (the matte had dropped it). Then ?v= in media/layers.js and the flat stills are redone (same maths as build_stage.py). Pillow + numpy + scipy.
  python3 demos/for-women/Demo22_ShionRain/scripts/fill_hair_pockets.py
"""
import hashlib, json, os, re
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); ART = os.path.join(D, 'media', 'art')
# pose: hair zone (char px: x0, y0, x1, y1), largest hole filled (px), lens ellipse (cx, cy, rx, ry) or None
JOBS = {'window': ((0, 430, 330, 1150), 7000, (732, 992, 47, 61)), 'dryer': ((0, 330, 185, 954), 7000, None)}
for pose, (zone, maxa, lens) in JOBS.items():
    p = os.path.join(ART, f'char_{pose}.webp'); im = np.asarray(Image.open(p).convert('RGBA')).copy(); a = im[..., 3]
    x0, y0, x1, y1 = zone; hole = a < 200; lab, n = ndimage.label(hole); fill = np.zeros_like(hole); cnt = 0
    for i, sl in enumerate(ndimage.find_objects(lab), 1):
        ys, xs = sl; area = int((lab[sl] == i).sum())
        if area <= maxa and area >= 12 and xs.start >= x0 and xs.stop <= x1 and ys.start >= y0 and ys.stop <= y1: fill[sl] |= lab[sl] == i; cnt += 1
    if fill.any():
        idx = ndimage.distance_transform_edt(a < 235, return_distances=False, return_indices=True)
        rgb = im[..., :3][idx[0], idx[1]].astype(np.float32) * .78
        for c in range(3): rgb[..., c] = ndimage.gaussian_filter(rgb[..., c], 2.5)
        for c in range(3): im[..., c][fill] = rgb[..., c][fill].astype(np.uint8)
        im[..., 3][fill] = 255
    if lens:
        cx, cy, rx, ry = lens; yy, xx = np.ogrid[:a.shape[0], :a.shape[1]]; inside = ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2 < 1; inside &= xx < 745   # right of x 745 the shirt shows through the lens: leave it
        r, g, b = [im[..., c].astype(int) for c in range(3)]; grey = (np.maximum(np.maximum(r, g), b) - np.minimum(np.minimum(r, g), b) < 26) & (r + g + b < 3 * 195)
        im[..., 3][inside & grey] = 0
        l2, m = ndimage.label((im[..., 3] > 20) & inside)   # specks of grey left floating inside the rim
        for i, sz in enumerate(ndimage.sum(np.ones_like(l2), l2, range(1, m + 1)), 1):
            if sz < 500: im[..., 3][l2 == i] = 0
    Image.fromarray(im).save(p, quality=90, method=6); print(f'{pose}: {cnt} holes filled ({int(fill.sum())} px)')
# towel: the matte dropped the towel draped over the top of the picture ("your" towel, drawn light on the dark studio grey), the arms then ended
# in a ragged cut in mid-air. Everything light above this polyline in the source (px) goes back into the character layer.
TOWEL_EDGE = [(0, 530), (150, 505), (262, 400), (340, 215), (620, 130), (1280, 95), (1950, 130), (2230, 215), (2320, 420), (2430, 520), (2560, 545)]
_t = open(os.path.join(D, 'media', 'layers.js'), encoding='utf-8').read(); _c = json.loads(_t[_t.index('= {') + 2:_t.rindex('}') + 1])['views']['shion_towel']['char']
_src = Image.open(os.path.join(D, 'assets', 'art', json.load(open(os.path.join(D, 'project', 'stage.json'), encoding='utf-8'))['poses']['towel']['src'] + '.png')).convert('RGB')
_m = Image.new('L', _src.size, 0); ImageDraw.Draw(_m).polygon(TOWEL_EDGE + [(_src.width, 0), (0, 0)], fill=255)
_lum = np.asarray(_src, np.float32).mean(2); _mask = (np.asarray(_m) > 127) & (_lum > 112)
_mask = ndimage.binary_closing(ndimage.binary_opening(_mask, iterations=1), iterations=3)
_soft = ndimage.gaussian_filter(_mask.astype(np.float32), 1.0) * 255
x0, y0, x1, y1 = _c['box']; _size = (_c['w'], _c['h'])
_crop = Image.fromarray(np.dstack([np.asarray(_src), _soft.clip(0, 255).astype(np.uint8)]).astype(np.uint8), 'RGBA').crop((x0, y0, x1, y1)).resize(_size, Image.LANCZOS)
_p = os.path.join(ART, 'char_towel.webp'); _ch = np.asarray(Image.open(_p).convert('RGBA')).copy(); _n = np.asarray(_crop)
_take = (_n[..., 3] > _ch[..., 3]) & (_ch[..., 3] < 250)   # only where the figure is not already there (arms and hair stay in front)
_ch[_take] = _n[_take]; Image.fromarray(_ch).save(_p, quality=90, method=6); print('towel restored', int(_take.sum()), 'px'); JOBS = {**JOBS, 'towel': None}
# ?v= + flat stills
lj = os.path.join(D, 'media', 'layers.js'); s = open(lj, encoding='utf-8').read(); cfg = json.load(open(os.path.join(D, 'project', 'stage.json'), encoding='utf-8'))
for pose in JOBS: s = re.sub(rf'art/char_{pose}\.webp\?v=[0-9a-f]+', f'art/char_{pose}.webp?v=' + hashlib.md5(open(os.path.join(ART, f'char_{pose}.webp'), 'rb').read()).hexdigest()[:8], s)
open(lj, 'w', encoding='utf-8').write(s); data = json.loads(s[s.index('= {') + 2:s.rindex('}') + 1]); FW, FH = 1920, 1080
for vname, v in cfg['views'].items():
    if v['pose'] not in JOBS: continue
    stem, ext = os.path.splitext(v['still']); ext = ext or '.jpg'; L = data['views'][stem]; b, c = L['bg'], L['char']; f, bf = L.get('fire'), b['fire']; z = b.get('zoom', 1) or 1
    if f:
        for k in (0, 1): z = max(z, f[k] / bf[k], (1 - f[k]) / (1 - bf[k]))
        ox, oy = f[0] - bf[0] * z, f[1] - bf[1] * z
    else: ox = oy = (1 - z) / 2
    flat = Image.open(os.path.join(D, 'media', b['src'].split('?')[0])).convert('RGB').resize((round(FW * z), round(FH * z)), Image.LANCZOS).crop((round(-ox * FW), round(-oy * FH), round(-ox * FW) + FW, round(-oy * FH) + FH)).convert('RGBA')
    ch = Image.open(os.path.join(ART, f"char_{v['pose']}.webp")).convert('RGBA'); hpx = c['height'] * FH; wpx = hpx * c['w'] / c['h']; ch = ch.resize((round(wpx), round(hpx)), Image.LANCZOS)
    flat.paste(ch, (round(c['x'] * FW - wpx / 2), round(c['y'] * FH - hpx)), ch); flat.convert('RGB').save(os.path.join(ART, stem + ext), quality=88); print('still', stem + ext)
