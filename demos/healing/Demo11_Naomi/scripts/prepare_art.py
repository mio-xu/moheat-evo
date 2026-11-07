"""assets/art/*.png (Seedance / GPT Image 2 raw, not in git) → media/art/*.webp for the game.

  python3 scripts/prepare_art.py

- Backgrounds: 1920×1080.
- Sprites: real alpha if present, else macOS Vision subject lifting (Demo 1's tools/lift_subject.swift, by path); halo trimmed,
  cropped to the subject, resized to a fixed height.
- Face frames (naomi_sit_*, naomi_close_*): aligned to their base (scale + offset search on the head) and only the face is
  blended in, so blinking / mewing never moves the cat.
"""
import os, subprocess, tempfile
import numpy as np
from PIL import Image, ImageFilter, ImageChops, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC, DST = os.path.join(ROOT, 'assets', 'art'), os.path.join(ROOT, 'media', 'art')
LIFT = os.path.join(os.path.dirname(ROOT), '../all-ages/Demo1_SnowFoxfire', 'tools', 'lift_subject.swift')
BGS = ['bg_room_morning', 'bg_room_day', 'bg_room_night']
SPRITES = {'naomi_sit': 900, 'naomi_close': 1100, 'naomi_walk': 700, 'naomi_pounce': 900, 'naomi_eat': 700, 'naomi_loaf': 650,
           'naomi_belly': 700, 'naomi_sleep': 800, 'prop_bowl': 400}
FACES = {'naomi_sit': (['blink', 'meow', 'happy'], (.22, .02, .78, .40)),        # face box as fractions of the cropped base
         'naomi_close': (['blink', 'happy'], (.08, .06, .92, .74))}
has = lambda n: os.path.exists(os.path.join(SRC, n + '.png'))


def cutout(name):
    im = Image.open(os.path.join(SRC, name + '.png'))
    if im.mode == 'RGBA' and im.getchannel('A').getextrema()[0] < 10:
        out = im
    else:
        with tempfile.TemporaryDirectory() as d:
            o = os.path.join(d, 'o.png')
            r = subprocess.run(['swift', LIFT, os.path.join(SRC, name + '.png'), o], capture_output=True, text=True)
            if r.returncode: raise SystemExit(f'{name}: lift failed {r.stdout} {r.stderr}')
            out = Image.open(o).convert('RGBA'); out.load()
    a = np.asarray(out.getchannel('A')).astype(np.float32)
    a[a < 24] = 0
    out.putalpha(Image.fromarray(a.astype(np.uint8)).filter(ImageFilter.MinFilter(3)))
    return out.crop(out.getchannel('A').getbbox())


def fit_h(im, h):
    return im.resize((round(im.width * h / im.height), h), Image.LANCZOS)


def save(im, name):
    im.save(os.path.join(DST, name + '.webp'), quality=88, method=6)


def search(base, frame, box, scales, offs, k=1):
    """best (diff, scale, dx, dy) placing frame's head on base's head; images and box shrunk by k for speed."""
    sm = lambda im: im.convert('L').resize((round(im.width / k), round(im.height / k)), Image.BILINEAR)
    bL, fL = sm(base), sm(frame); bx = [round(v / k) for v in box]
    B = np.asarray(bL.crop(bx), dtype=np.float32); pad = 260 // k
    best = None
    for s in scales:
        f = fL.resize((round(fL.width * s), round(fL.height * s)), Image.BILINEAR)
        g = np.full((f.height + 2 * pad, f.width + 2 * pad), 128, np.float32); g[pad:pad + f.height, pad:pad + f.width] = np.asarray(f, dtype=np.float32)
        for dy, dx in offs:
            x0, y0 = bx[0] + round(dx / k) + pad, bx[1] + round(dy / k) + pad
            if x0 < 0 or y0 < 0 or x0 + B.shape[1] > g.shape[1] or y0 + B.shape[0] > g.shape[0]: continue
            d = np.mean(np.abs(g[y0:y0 + B.shape[0], x0:x0 + B.shape[1]] - B))
            if best is None or d < best[0]: best = (d, s, dx, dy)
    return best


def align(base, frame, box):
    grid = lambda r, st: [(dy, dx) for dy in range(-r, r + 1, st) for dx in range(-r, r + 1, st)]
    _, s0, dx0, dy0 = search(base, frame, box, np.linspace(.8, 1.45, 27), grid(200, 8), k=4)                      # coarse
    best = search(base, frame, box, np.linspace(s0 - .02, s0 + .02, 9), [(dy0 + a, dx0 + b) for a, b in grid(8, 2)])   # fine
    d, s, dx, dy = best
    f = frame.resize((round(frame.width * s), round(frame.height * s)), Image.LANCZOS)
    canvas = Image.new('RGBA', base.size, (0, 0, 0, 0)); canvas.paste(f, (-dx, -dy), f)
    return canvas, best


def main():
    os.makedirs(DST, exist_ok=True)
    for n in BGS:
        if has(n): Image.open(os.path.join(SRC, n + '.png')).convert('RGB').resize((1920, 1080), Image.LANCZOS).save(os.path.join(DST, n + '.webp'), quality=86, method=6); print('bg', n)
    bases = {}
    for n, h in SPRITES.items():
        if not has(n): print('missing', n); continue
        im = fit_h(cutout(n), h); bases[n] = im; save(im, n); print('sprite', n, im.size)
    for base_name, (variants, fb) in FACES.items():
        if base_name not in bases: continue
        base = bases[base_name]; W, H = base.size
        box = (round(W * fb[0]), round(H * fb[1]), round(W * fb[2]), round(H * fb[3]))
        for v in variants:
            n = f'{base_name}_{v}'
            if not has(n): print('missing', n); continue
            fr = fit_h(cutout(n), H)
            warped, best = align(base, fr, box)
            m = Image.new('L', base.size, 0)
            ImageDraw.Draw(m).ellipse((box[0], box[1] + (box[3] - box[1]) * .12, box[2], box[3] + (box[3] - box[1]) * .05), fill=255)
            m = ImageChops.multiply(m.filter(ImageFilter.GaussianBlur(14)), warped.getchannel('A'))
            out = base.copy(); out.paste(warped.convert('RGB'), (0, 0), m); out.putalpha(base.getchannel('A'))
            save(out, n); print('face', n, 'diff %.1f scale %.2f dx %d dy %d' % best)


if __name__ == '__main__':
    main()
