"""assets/art/*.png (Seedance, not in git) → media/art/*.webp (1920×1080) + small face PATCHES (as Demo 12, its aligner by path).

  python3 scripts/prepare_art.py

The expression frames (grandma talking, grandpa talking, grandpa blinking) are separate drawings; only a small feathered patch is taken
from each — the mouth or the eyes — aligned to the base on its own, so nothing else in the picture jumps. The game draws the base and
fades the patches (named <base>_gm_mouth / <base>_gp_mouth / <base>_blink). Writes media/art/patches.js: {name: [x, y]}.
"""
import importlib.util, json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location('d12_prep', os.path.join(os.path.dirname(ROOT), 'Demo12_LateCall', 'scripts', 'prepare_art.py'))
P = importlib.util.module_from_spec(spec); spec.loader.exec_module(P)
from PIL import ImageChops
SRC, DST = os.path.join(ROOT, 'assets', 'art'), os.path.join(ROOT, 'media', 'art')
P.SRC, P.DST = SRC, DST
FULL = ['bg_room', 'gm_call', 'duo_call', 'gp_snow', 'gm_knit', 'box_open', 'cooler', 'duo_bye']
# patch: (base, source frame, centre x, y, radius x, y, tilt in degrees) — measured on the 1920×1080 base
PATCHES = {   # measured from the difference to the base (scripts: see README)
    'duo_call_gm_mouth': ('duo_call', 'duo_call_gm', 872, 438, 78, 44, 0),
    'duo_call_gp_mouth': ('duo_call', 'duo_call_gp', 1046, 442, 82, 46, 0),
    'duo_call_blink': ('duo_call', 'duo_call_blink', 1106, 318, 62, 58, 0),     # grandpa's right eye (left one: _blink2, kept off grandma's glasses)
    'duo_call_blink2': ('duo_call', 'duo_call_blink', 991, 306, 30, 32, 0),
    'gm_call_gm_mouth': ('gm_call', 'gm_call_gm', 0, 0, 78, 44, 0),      # centre found automatically (largest difference)
}
WIDE = {'duo_call_gp_mouth'}
FIXED = {'duo_call_blink': (1.0, -3, 1), 'duo_call_blink2': (1.0, 0, 0)}   # (scale, dx, dy) of the whole blink frame: a search on closed eyes drifts   # that frame came back zoomed in: search a wider scale / offset range
has = lambda n: os.path.exists(os.path.join(SRC, n + '.png'))


def align_wide(base, frame, box):
    """the zoomed frame: find scale + offset on grandpa's eyes and nose (they do not change), then cut the mouth with that transform."""
    from PIL import Image
    grid = lambda r, st, c=(0, 0): [(c[0] + dy, c[1] + dx) for dy in range(-r, r + 1, st) for dx in range(-r, r + 1, st)]
    ref = (980, 270, 1130, 400)
    _, s0, dx0, dy0 = P.NP.search(base, frame, ref, [.70 + i * .02 for i in range(16)], grid(256, 8), k=4)
    _, s1, dx1, dy1 = P.NP.search(base, frame, ref, [s0 - .02, s0 - .01, s0, s0 + .01, s0 + .02], grid(12, 2, (dy0, dx0)), k=2)
    best = P.NP.search(base, frame, ref, [s1 - .005, s1, s1 + .005], grid(3, 1, (dy1, dx1)))
    d, s, dx, dy = best
    f = frame.resize((round(frame.width * s), round(frame.height * s)), Image.LANCZOS)
    canvas = Image.new('RGBA', base.size, (0, 0, 0, 0)); canvas.paste(f, (-dx, -dy), f)
    return canvas, best


def auto_centre(bn, fn):
    import numpy as np
    from PIL import ImageFilter
    a, b = P.load(bn).convert('L'), P.load(fn).convert('L')
    d = np.asarray(ImageChops.difference(a, b).filter(ImageFilter.GaussianBlur(6)), float)
    ys, xs = np.where(d > d.max() * .5); return int(xs.mean()), int(ys.mean())


def main():
    os.makedirs(DST, exist_ok=True)
    for n in FULL:
        if has(n): P.load(n).save(os.path.join(DST, n + '.webp'), quality=86, method=6); print('full', n)
    meta, bases = {}, {}
    for name, (bn, fn, cx, cy, rx, ry, deg) in PATCHES.items():
        if not (has(bn) and has(fn)): print('missing', name); continue
        base = bases.setdefault(bn, P.load(bn).convert('RGBA'))
        if not cx: cx, cy = auto_centre(bn, fn); print('  auto centre', name, cx, cy)
        pad = 1.6; box = (round(cx - rx * pad), round(cy - ry * pad), round(cx + rx * pad), round(cy + ry * pad))
        frame = P.load(fn).convert('RGBA')
        if name in FIXED:
            from PIL import Image
            sc, dx, dy = FIXED[name]; f = frame.resize((round(frame.width * sc), round(frame.height * sc)), Image.LANCZOS)
            warped = Image.new('RGBA', base.size, (0, 0, 0, 0)); warped.paste(f, (-dx, -dy), f); best = (0, sc, dx, dy)
        elif name in WIDE: warped, best = align_wide(base, frame, box)
        else: warped, best = P.align_near(base, frame, box)
        feather = max(6, round(min(rx, ry) * .28))
        m = P.ellipse_mask(base.size, cx, cy, rx - feather * .6, ry - feather * .6, deg, feather)
        patch = warped.copy(); patch.putalpha(ImageChops.multiply(m, warped.getchannel('A')))
        bb = m.point(lambda v: 255 if v > 2 else 0).getbbox()
        patch.crop(bb).save(os.path.join(DST, name + '.webp'), quality=90, method=6)
        meta[name] = [bb[0], bb[1]]
        print('patch', name, bb, 'diff %.1f scale %.2f dx %d dy %d' % best)
    open(os.path.join(DST, 'patches.js'), 'w').write('window.FAMILY_PATCHES = ' + json.dumps(meta) + ';\n')


if __name__ == '__main__':
    main()
