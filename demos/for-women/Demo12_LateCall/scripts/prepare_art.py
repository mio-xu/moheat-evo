"""assets/art/*.png (Seedance, not in git) → media/art/*.webp (1920×1080) + small face PATCHES.

  python3 scripts/prepare_art.py

The expression frames are separate drawings: the whole face differs a little (eyes, blush, hair strands). Swapping full frames
makes the face jump, so only a small feathered patch is taken from each one — the mouth for talking, the eyes for blinking, eyes +
cheeks for shy — each aligned to the base on its own (Naomi demo's search, loaded by path). The game draws the base and fades the
patches in and out. Writes media/art/patches.json: {name: [x, y]} (top-left of the patch in the 1920×1080 frame).
"""
import importlib.util, json, math, os
from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC, DST = os.path.join(ROOT, 'assets', 'art'), os.path.join(ROOT, 'media', 'art')
spec = importlib.util.spec_from_file_location('naomi_prep', os.path.join(os.path.dirname(ROOT), '../healing/Demo11_Naomi', 'scripts', 'prepare_art.py'))
NP = importlib.util.module_from_spec(spec); spec.loader.exec_module(NP)
FULL = ['bg_room', 'bg_room_open', 'ren_call', 'ren_close', 'ren_door']
# patch: (base, source frame, centre x, y, radius x, y, tilt in degrees) — measured on the 1920×1080 base
PATCHES = {
    'ren_call_talk_mouth': ('ren_call', 'ren_call_talk', 1305, 405, 85, 48, -12),
    'ren_call_blink_eyeL': ('ren_call', 'ren_call_blink', 1188, 300, 58, 30, -12),   # one small patch per eye: no hair strands inside
    'ren_call_blink_eyeR': ('ren_call', 'ren_call_blink', 1328, 244, 54, 28, -14),
    'ren_close_talk_mouth': ('ren_close', 'ren_close_talk', 1305, 568, 112, 56, -10),
    'ren_door_talk_mouth': ('ren_door', 'ren_door_talk', 950, 432, 80, 46, -8),
}
has = lambda n: os.path.exists(os.path.join(SRC, n + '.png'))
load = lambda n: Image.open(os.path.join(SRC, n + '.png')).convert('RGB').resize((1920, 1080), Image.LANCZOS)


def ellipse_mask(size, cx, cy, rx, ry, deg, feather):
    m = Image.new('L', size, 0); a = math.radians(deg)
    pts = [(cx + rx * math.cos(t) * math.cos(a) - ry * math.sin(t) * math.sin(a), cy + rx * math.cos(t) * math.sin(a) + ry * math.sin(t) * math.cos(a))
           for t in [i * 2 * math.pi / 72 for i in range(72)]]
    ImageDraw.Draw(m).polygon(pts, fill=255)
    return m.filter(ImageFilter.GaussianBlur(feather))


def align_near(base, frame, box):
    """the frames share the composition: search only ±48 px and ±5 % scale (a wide search can lock onto plain skin)."""
    grid = lambda r, st: [(dy, dx) for dy in range(-r, r + 1, st) for dx in range(-r, r + 1, st)]
    _, s0, dx0, dy0 = NP.search(base, frame, box, [.95 + i * .01 for i in range(11)], grid(48, 4), k=2)
    best = NP.search(base, frame, box, [s0 - .005, s0, s0 + .005], [(dy0 + a, dx0 + b) for a, b in grid(4, 1)])
    d, s, dx, dy = best
    f = frame.resize((round(frame.width * s), round(frame.height * s)), Image.LANCZOS)
    canvas = Image.new('RGBA', base.size, (0, 0, 0, 0)); canvas.paste(f, (-dx, -dy), f)
    return canvas, best


def main():
    os.makedirs(DST, exist_ok=True)
    for n in FULL:
        if has(n): load(n).save(os.path.join(DST, n + '.webp'), quality=86, method=6); print('full', n)
    for old in os.listdir(DST):                     # whole-frame face swaps from the first version
        if old.endswith(('_talk.webp', '_blink.webp', '_shy.webp', '_eyes.webp')): os.remove(os.path.join(DST, old))
    meta, bases = {}, {}
    for name, (bn, fn, cx, cy, rx, ry, deg) in PATCHES.items():
        if not (has(bn) and has(fn)): print('missing', name); continue
        base = bases.setdefault(bn, load(bn).convert('RGBA'))
        pad = 1.6; box = (round(cx - rx * pad), round(cy - ry * pad), round(cx + rx * pad), round(cy + ry * pad))
        warped, best = align_near(base, load(fn).convert('RGBA'), box)     # aligned on this region only, small range
        feather = max(6, round(min(rx, ry) * .28))
        m = ellipse_mask(base.size, cx, cy, rx - feather * .6, ry - feather * .6, deg, feather)
        patch = warped.copy(); patch.putalpha(ImageChops.multiply(m, warped.getchannel('A')))
        bb = m.point(lambda v: 255 if v > 2 else 0).getbbox()
        patch.crop(bb).save(os.path.join(DST, name + '.webp'), quality=90, method=6, lossless=False)
        meta[name] = [bb[0], bb[1]]
        print('patch', name, bb, 'diff %.1f scale %.2f dx %d dy %d' % best)
    json.dump(meta, open(os.path.join(DST, 'patches.json'), 'w'), indent=1)
    open(os.path.join(DST, 'patches.js'), 'w').write('window.REN_PATCHES = ' + json.dumps(meta) + ';\n')


if __name__ == '__main__':
    main()
