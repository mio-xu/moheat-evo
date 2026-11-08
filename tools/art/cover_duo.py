#!/usr/bin/env python3
"""Cover art (UI v2 media/cover/art.webp) composed from EXISTING layers, $0 (DEMO_DESIGN_GUIDE §7.3 2b + UI v2):
one background plate + one or two pose cut-outs placed by the 2b numbers (two people: eyes at x 61 % / 83 %, y 30 %, each face 21 %
of the height; one person: eye x 72 %, face 27 %) + optional props in front. Face positions come from SCRFD (pass them with --faces
JSON from a measuring run, or give eye / face in the recipe).

  python3 tools/art/cover_duo.py <recipe.json>          # writes each recipe's out (1920×1080 webp) and prints the placements

recipe = [{ "out": "demos/…/media/cover/art.webp", "bg": "…webp", "bg_focus": [x, y] (0–1, what stays in frame when cropping),
            "people": [{ "src": "…pose.webp", "eye": [x, y], "face": h }, …]   (eye / face = fractions of the cut-out),
            "props": [{ "src": "…webp", "x": .5, "bottom": 1.0, "h": .3 }] }]"""
import json, sys
from PIL import Image

W, H = 1920, 1080
SLOTS = {1: [(.72, .30, .27)], 2: [(.61, .30, .21), (.83, .30, .21)]}


def cover(bg, focus=(.5, .5)):
    im = Image.open(bg).convert('RGB'); s = max(W / im.width, H / im.height); im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    x = min(max(0, round(focus[0] * im.width - W / 2)), im.width - W); y = min(max(0, round(focus[1] * im.height - H / 2)), im.height - H)
    return im.crop((x, y, x + W, y + H))


def main():
    for r in json.load(open(sys.argv[1])):
        frame = cover(r['bg'], r.get('bg_focus', (.5, .5))).convert('RGBA'); log = []
        ppl = r['people']; slots = SLOTS[len(ppl)]
        for p, (sx, sy, sf) in sorted(zip(ppl, slots), key=lambda t: t[0].get('z', 0)):
            im = Image.open(p['src']).convert('RGBA'); k = sf * H / (p['face'] * im.height)
            im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
            ox, oy = round(sx * W - p['eye'][0] * im.width), round(sy * H - p['eye'][1] * im.height)
            frame.alpha_composite(im, (max(0, ox), max(0, oy)), (max(0, -ox), max(0, -oy)))
            log.append(f"{p['src'].split('/')[-1]}: x {ox}..{ox + im.width}, y {oy}..{oy + im.height}")
        for q in r.get('props', []):
            im = Image.open(q['src']).convert('RGBA'); k = q['h'] * H / im.height; im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
            ox, oy = round(q['x'] * W - im.width / 2), round(q.get('bottom', 1) * H - im.height)
            frame.alpha_composite(im, (max(0, ox), max(0, oy)), (max(0, -ox), max(0, -oy)))
        frame.convert('RGB').save(r['out'], 'WEBP', quality=78, method=6); print(r['out'], '·', ' · '.join(log))


if __name__ == '__main__':
    main()
