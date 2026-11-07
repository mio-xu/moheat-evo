"""assets/art/*.png (Seedance / GPT Image 2 raw outputs) → media/art/*.webp for the game.

  python3 scripts/prepare_art.py

- Backgrounds: resized to 1920×1080.
- Sprites: cut out (real alpha if the PNG has it, else macOS Vision subject lifting via Demo 1's tools/lift_subject.swift),
  cropped to the subject, light de-fringe on the edge.
- Kohaku: kohaku_base is the only body. talk / blink / happy are aligned to it (scale + offset search on the head) and only
  their face is blended in, so switching frames never moves the fox.
- Writes media/art/art_meta.json (sprite sizes, hand-candle wick position).
"""
import json, os, subprocess, tempfile
import numpy as np
from PIL import Image, ImageFilter, ImageChops

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC, DST = os.path.join(ROOT, 'assets', 'art'), os.path.join(ROOT, 'media', 'art')
LIFT = os.path.join(os.path.dirname(ROOT), '../all-ages/Demo1_SnowFoxfire', 'tools', 'lift_subject.swift')
BGS = ['bg_hut_night', 'bg_hut_fire', 'bg_gate_open', 'bg_tunnel_fork', 'bg_spring_glow']
PROPS = {'prop_gate_door': 1000, 'prop_candle': 700, 'prop_hand_candle': 800, 'prop_straw': 700, 'prop_flint': 500, 'prop_drawer': 800}
FOX = ['kohaku_base', 'kohaku_talk', 'kohaku_blink', 'kohaku_happy']
FOX_H = 1000


def cutout(name):
    im = Image.open(os.path.join(SRC, name + '.png'))
    if im.mode == 'RGBA' and im.getchannel('A').getextrema()[0] < 10:   # real transparency
        out = im
    else:
        with tempfile.TemporaryDirectory() as d:
            o = os.path.join(d, 'o.png')
            r = subprocess.run(['swift', LIFT, os.path.join(SRC, name + '.png'), o], capture_output=True, text=True)
            if r.returncode: raise SystemExit(f'{name}: lift failed {r.stdout} {r.stderr}')
            out = Image.open(o).convert('RGBA'); out.load()
    a = np.asarray(out.getchannel('A')).astype(np.float32)
    a[a < 24] = 0                                                           # drop faint halo
    out.putalpha(Image.fromarray(a.astype(np.uint8)).filter(ImageFilter.MinFilter(3)))   # 1-px erode: no light fringe
    return out.crop(out.getchannel('A').getbbox())


def fit_h(im, h):
    return im.resize((round(im.width * h / im.height), h), Image.LANCZOS)


def save(im, name):
    im.save(os.path.join(DST, name + '.webp'), quality=90, method=6)


def align_face(base, frame, face):
    """Find the scale/offset that puts frame's head on base's head; return frame warped into base's canvas."""
    bx0, by0, bx1, by1 = face
    B = np.asarray(base.convert('L').crop(face), dtype=np.float32)
    best = None
    for s in np.linspace(.9, 1.1, 21):
        f = frame.resize((round(frame.width * s), round(frame.height * s)), Image.LANCZOS)
        g = np.asarray(f.convert('L'), dtype=np.float32)
        for dy in range(-40, 41, 4):
            for dx in range(-40, 41, 4):
                x0, y0 = bx0 + dx, by0 + dy
                if x0 < 0 or y0 < 0 or x0 + B.shape[1] > g.shape[1] or y0 + B.shape[0] > g.shape[0]: continue
                d = np.mean(np.abs(g[y0:y0 + B.shape[0], x0:x0 + B.shape[1]] - B))
                if best is None or d < best[0]: best = (d, s, dx, dy)
    d, s, dx, dy = best
    f = frame.resize((round(frame.width * s), round(frame.height * s)), Image.LANCZOS)
    canvas = Image.new('RGBA', base.size, (0, 0, 0, 0)); canvas.paste(f, (-dx, -dy), f)
    return canvas, best


def main():
    os.makedirs(DST, exist_ok=True); meta = {}
    for n in BGS:
        if os.path.exists(os.path.join(SRC, n + '.png')):
            Image.open(os.path.join(SRC, n + '.png')).convert('RGB').resize((1920, 1080), Image.LANCZOS).save(os.path.join(DST, n + '.webp'), quality=86, method=6)
    for n, h in PROPS.items():
        if not os.path.exists(os.path.join(SRC, n + '.png')): print('missing', n); continue
        im = fit_h(cutout(n), h) if cutout else None
        if n == 'prop_hand_candle' or n == 'prop_candle':   # wick tip = topmost opaque pixel near the centre column band
            a = np.asarray(im.getchannel('A')); ys, xs = np.nonzero(a > 128); top = ys.min(); xt = int(np.median(xs[ys < top + 12]))
            meta[n] = {'wick': [round(xt / im.width, 4), round(top / im.height, 4)]}
        save(im, n); print('sprite', n, im.size)
    if os.path.exists(os.path.join(SRC, 'kohaku_base.png')):
        base = fit_h(cutout('kohaku_base'), FOX_H); save(base, 'kohaku_base')
        W, H = base.size
        face = (round(W * .04), round(H * .12), round(W * .70), round(H * .54))   # head box (both eyes, muzzle) used for alignment and for the face mask
        meta['kohaku'] = {'size': [W, H], 'face': face}
        for n in FOX[1:]:
            if not os.path.exists(os.path.join(SRC, n + '.png')): print('missing', n); continue
            fr = fit_h(cutout(n), FOX_H)
            warped, best = align_face(base, fr, face)
            m = Image.new('L', base.size, 0)                                    # feathered face mask (eyes, cheeks, mouth)
            from PIL import ImageDraw
            fx0, fy0, fx1, fy1 = face
            ImageDraw.Draw(m).ellipse((fx0 - 10, fy0 + (fy1 - fy0) * .30, fx1 + 10, fy1 + (fy1 - fy0) * .06), fill=255)
            m = m.filter(ImageFilter.GaussianBlur(12))
            m = ImageChops.multiply(m, warped.getchannel('A'))
            out = base.copy(); out.paste(warped.convert('RGB'), (0, 0), m)
            out.putalpha(base.getchannel('A'))
            save(out, n); print('face', n, 'diff %.1f scale %.2f dx %d dy %d' % best)
    json.dump(meta, open(os.path.join(DST, 'art_meta.json'), 'w'), indent=1)
    print(json.dumps(meta))


if __name__ == '__main__':
    main()
