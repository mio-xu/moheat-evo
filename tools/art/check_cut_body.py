#!/usr/bin/env python3
"""Find character layers whose body is visibly cut off inside the frame (user 2026-11-08: "人物在画面中全出现，但是身体只有半截").

A char layer is anchored at its bottom centre (x, y = frame fractions, height = fraction of the frame; shared/layers.js).
If the picture's bottom / left / right / top edge is opaque (the body was cut there) and that edge lands INSIDE the frame,
the viewer sees a body that stops in mid-air. Fix: extend the pose (outpaint the missing body with the image API) or
move / scale the layer so the cut edge sits outside the frame.

  python3 tools/art/check_cut_body.py                 # every demos/*/*/media/layers.js
  python3 tools/art/check_cut_body.py demos/for-men/Demo31_SummerRooftop
"""
import json, re, sys, glob, os
from PIL import Image
import numpy as np

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MARGIN = -0.005         # the page zooms the frame 1.02×, so an edge flush with the frame (±0.005) stays hidden even with parallax / talking bob


def load_layers(path):
    s = open(path, encoding='utf-8').read()
    s = s[s.index('{'):s.rindex('}') + 1]
    return json.loads(s)


def edge_fill(a, side):
    band = {'bottom': a[-3:, :], 'left': a[:, :3].T, 'right': a[:, -3:].T, 'top': a[:3, :]}[side]
    return float((band > 128).any(axis=0).mean())


def straight_cuts(a, min_h=0.25, min_v=0.2):
    """Cut-out sprite (alpha): long straight horizontal / vertical edges INSIDE the picture where the body stops along a ruler
    line (Nobunaga _kit/art I_ear 2026-11-08: right side and bottom cut straight, shown mid-screen in the talk demos)."""
    H, W = a.shape; o, t = a > 200, a < 30; out = []
    def runs(edge, n):
        best = 0
        for line in edge:
            if not line.any(): continue
            d = np.diff(np.concatenate([[0], line.astype(np.int8), [0]])); st, en = np.where(d == 1)[0], np.where(d == -1)[0]
            best = max(best, int((en - st).max()))
        return best / n
    for name, e, n, lim in (('bottom', o[:-3] & t[3:], W, min_h), ('top', t[:-3] & o[3:], W, min_h),
                             ('right', (o[:, :-3] & t[:, 3:]).T, H, min_v), ('left', (t[:, :-3] & o[:, 3:]).T, H, min_v)):
        f = runs(e, n)
        if f >= lim: out.append((name, f))
    return out


def check_kit_sprites(demo):
    """Demos without layers.js that draw cut-out sprites from their category kit (demos/<cat>/_kit/art: Nobunaga films + talk)."""
    idx = os.path.join(demo, 'index.html')
    kit = os.path.join(os.path.dirname(demo), '_kit', 'art')
    if not (os.path.exists(idx) and os.path.isdir(kit) and '_kit' in open(idx, encoding='utf-8', errors='ignore').read()):
        return []
    out = []
    # only the sprites meant to be cropped by the frame bottom (busts, ear close-ups); full-figure poses and props end on purpose
    for f in sorted(glob.glob(os.path.join(kit, '*.webp')) + glob.glob(os.path.join(kit, '*.png'))):
        if not re.search(r'_bust|_ear|_close', os.path.basename(f)): continue
        im = Image.open(f)
        if im.mode not in ('RGBA', 'LA', 'PA') and 'transparency' not in im.info: continue
        a = np.array(im.convert('RGBA'))[:, :, 3]
        if (a < 30).mean() < 0.05: continue          # full-frame plate, not a cut-out
        if edge_fill(a, 'bottom') < 0.3:
            out.append((os.path.basename(f), 'bottom', f'_kit/art/{os.path.basename(f)}: the body ends above the picture bottom ({edge_fill(a, "bottom"):.0%} of the bottom edge) — floats when anchored at the frame bottom → tools/art/complete_cutout.py'))
        for side, frac in straight_cuts(a):
            out.append((os.path.basename(f), side, f'_kit/art/{os.path.basename(f)}: straight {side} cut {frac:.0%} long inside the picture → tools/art/complete_cutout.py'))
    return out


def check(demo):
    lj = os.path.join(demo, 'media', 'layers.js')
    if not os.path.exists(lj):
        return check_kit_sprites(demo)
    try:
        data, out, seen = load_layers(lj), [], {}
    except ValueError:      # empty / half-written layers.js (another session is building it)
        return [('-', 'unreadable', 'media/layers.js has no JSON yet')]
    for name, v in data.get('views', {}).items():
        c = v.get('char')
        if not c:
            continue
        src = os.path.join(demo, 'media', c['src'].split('?')[0])
        if src not in seen:
            try:
                seen[src] = np.array(Image.open(src).convert('RGBA'))[:, :, 3]
            except Exception as e:
                out.append((name, 'missing', str(e))); continue
        a = seen[src]
        hf = c['height']; wf = hf * (c['w'] / c['h']) * (9 / 16)
        bottom, left, right, top = c['y'], c['x'] - wf / 2, c['x'] + wf / 2, c['y'] - hf
        # top: hair cut flat by the picture's top edge, hanging 2 % below the frame top (Ren / Shion: "y": 1.02 with "height": 1.0)
        for side, pos, inside in (('bottom', bottom, bottom < 1 + MARGIN), ('left', left, left > -MARGIN), ('right', right, right < 1 + MARGIN), ('top', top, top > -MARGIN)):
            f = edge_fill(a, side)
            if f > 0.04 and inside:
                out.append((name, side, f'{os.path.basename(src)}: {f:.0%} of the {side} edge is body, edge at {pos:.3f} of the frame'))
    return out


if __name__ == '__main__':
    demos = sys.argv[1:] or sorted(os.path.dirname(os.path.dirname(p)) for p in glob.glob(os.path.join(REPO, 'demos/*/*/media/layers.js')))
    bad = 0
    for d in demos:
        for name, side, msg in check(os.path.abspath(d)):
            bad += 1; print(f'{os.path.relpath(d, REPO)}  {name}  CUT {side}: {msg}')
    print(f'{bad} cut edge(s) inside the frame' if bad else 'no cut bodies inside the frame')
    sys.exit(1 if bad else 0)
