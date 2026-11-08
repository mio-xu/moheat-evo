#!/usr/bin/env python3
"""Find character layers whose body is visibly cut off inside the frame (user 2026-11-08: "人物在画面中全出现，但是身体只有半截").

A char layer is anchored at its bottom centre (x, y = frame fractions, height = fraction of the frame; shared/layers.js).
If the picture's bottom / left / right edge is opaque (the body was cut there) and that edge lands INSIDE the frame,
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
    band = {'bottom': a[-3:, :], 'left': a[:, :3].T, 'right': a[:, -3:].T}[side]
    return float((band > 128).any(axis=0).mean())


def check(demo):
    lj = os.path.join(demo, 'media', 'layers.js')
    if not os.path.exists(lj):
        return []
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
        bottom, left, right = c['y'], c['x'] - wf / 2, c['x'] + wf / 2
        for side, pos, inside in (('bottom', bottom, bottom < 1 + MARGIN), ('left', left, left > -MARGIN), ('right', right, right < 1 + MARGIN)):
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
