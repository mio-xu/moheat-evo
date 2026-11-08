#!/usr/bin/env python3
"""Writes project/stage.json for tools/art/build_stage.py (G4) from the tables below + project/face_points.json. python3 scripts/make_stage.py
Game demo: the page (UI v2, built later) draws the valves / thermometer / steam in code; the views here are the layered stills per stage
(script_data.py STAGES). Guests SIT in the water: their layers are the bath variants of scripts/bath_cut.py (the body fades out at a
wavy water line / ends at the pail's front rim), placed with the visible bottom (y) on the plate's water surface / on the pail rim
(plate: open bath water y .70–.80, left pail centre x .30, right pail x .72, pail rims at y ≈ .79).
Who: Y Yuzu-jii, P penguin, M monkey mother, F fox; the monkey child never talks (no mouth set, project/qa.json).
Animal faces → mouths "warp": false on the drawn line (the penguin opens its beak along the line between upper and lower beak: no
teeth, beak-dark interior)."""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FP = json.load(open(os.path.join(ROOT, 'project', 'face_points.json')))
BGS = {'onsen': None, 'onsen_rain': None}
EYE = 1.15   # the blink patch must cover the whole edit mask (check_patches OUTER 40–50 at 1.05: fur redrawn inside the mask, §11.1)


def lp(m, dark=12, **extra):
    d = {"lips": [.1, .2, .3], "light": .3, "warp": False, "centre": m[:2], "radius": [round(m[2] * 1.9), round(m[3] * 3.4)], "lift": .12, "drop": .3, "dark": dark}
    d.update(extra); return d


POSES = {}   # pose: (source stem, face points of, character, talks, lp extras)
TABLE = {
    'yuzujii_base': ('yuzujii_base', 'yuzujii_base', 'yuzujii', {}),
    'yuzujii_bath': ('yuzujii_bath', 'yuzujii_base', 'yuzujii', {}),
    'penguin_bath': ('penguin_bath', 'penguin_base', 'penguin', {"teeth": False, "light": 0, "lift": .05, "drop": .18}),
    'monkey_mum_pail': ('monkey_mum_pail', 'monkeys_base', 'monkey_mum', {}),
    'monkey_kid_pail': ('monkey_kid_pail', 'monkeys_base', 'monkey_kid', None),
    'fox_bath': ('fox_bath', 'fox_base2', 'fox', {}),
}
for pose, (src, fpk, ch, ex) in TABLE.items():
    f = FP[fpk]; eyes = f['eyes']
    if ch == 'monkey_mum': eyes = eyes[:2]
    if ch == 'monkey_kid': eyes = eyes[2:]
    d = {"src": src, "blink": src + "_blink", "matte": "green", "character": ch, "look": ch,
         "regions_eyes": [[e[0], e[1], round(e[2] * EYE), round(e[3] * EYE)] for e in eyes]}
    if ex is not None and not os.environ.get('NOLP'): d.update({"mouth": "lp", "lp": lp(f['mouth'], **ex)})
    POSES[pose] = d

F = lambda pose, x, y, h, who: {'pose': pose, 'x': x, 'y': y, 'height': h, 'who': who}
YS = lambda x=.5, h=.7: F('yuzujii_base', x, .97, h, 'Y')   # feet inside the frame with a margin
PAILS = [F('monkey_mum_pail', .30, .795, .23, 'M'), F('monkey_kid_pail', .72, .795, .19, 'K')]
VIEWS = {   # view: (still, bg, main figure, more figures (back → front))
    'open_Y': ('onsen_open', 'onsen', YS(), []),
    'pen_P': ('onsen_penguin', 'onsen', F('penguin_bath', .52, .755, .27, 'P'), [YS(.12, .5)]),
    'mon_M': ('onsen_monkeys', 'onsen', PAILS[0], PAILS[1:]),
    'rain_Y': ('onsen_rain', 'onsen_rain', YS(), []),
    'rain_F': ('onsen_fox', 'onsen_rain', F('fox_bath', .55, .755, .3, 'F'), [YS(.12, .5)]),
    'end_Y': ('onsen_yuzujii', 'onsen', F('yuzujii_bath', .5, .775, .33, 'Y'), []),
    # everyone where their temperature is (physics): the penguin under the COLD pipe (right), the fox in the lukewarm middle,
    # mum in the left (hot-side) pail, the child in the right one; Yuzu-jii a little right of centre
    'end_all': ('onsen_all', 'onsen', F('yuzujii_bath', .585, .755, .27, 'Y'),
                [F('fox_bath', .415, .728, .17, 'F'), F('penguin_bath', .865, .745, .18, 'P')] + PAILS),
}
cfg = {"src": "assets/art", "hooks": {"view": "ONSEN.S.view", "who": "ONSEN.S.who"},
       "bgs": {k: {"src": f"bg_{k}_g", "fire": v} for k, v in BGS.items()}, "poses": POSES, "views": {}}
for v, (still, bg, main, more) in VIEWS.items():
    d = {"still": still, "bg": bg, "fire": BGS[bg]}; d.update(main)
    if more: d["more"] = more
    cfg["views"][v] = d
json.dump(cfg, open(os.path.join(ROOT, 'project', 'stage.json'), 'w'), indent=1)
print(len(cfg['views']), 'views,', len(POSES), 'poses')
