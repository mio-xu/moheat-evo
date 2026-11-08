#!/usr/bin/env python3
"""Writes project/stage.json for tools/art/build_stage.py from the tables below + project/face_points.json (the measured mouth / eye
ellipses → fixed patch regions, so the patch search is never pulled onto hair or hands). python3 scripts/make_stage.py"""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FP = json.load(open(os.path.join(ROOT, 'project', 'face_points.json')))
EYE = {'hinata_ear': 1.08}   # bangs cross her eyes and were redrawn inside the whole mask: the patch covers the full mask so its rim is untouched
LP_SKIP = {'hinata_ear'}   # LivePortrait finds no face in this tilted close-up (lp_mouths.py --probe): it keeps the drawn mouth variant
MOUTH = {}
# hinata_ear: her smile-mouth slants up to the right — one ellipse fades its ends (pale, doubled fang): three overlapping ellipses along it
MOUTH_REG = {'hinata_ear': [[1650, 671, 46, 32], [1702, 650, 46, 32], [1754, 629, 46, 32]]}
MATTE = {'mint': 'magenta', 'hinata': 'green', 'nagisa': 'green'}
POSES = ['nagisa_base', 'nagisa_guard', 'hinata_base', 'hinata_dice', 'hinata_ear', 'mint_base', 'mint_ear']
BGS = {'pass': None, 'dawn': None, 'hall': [.725, .64], 'room': None, 'door': [.81, .62]}
# view: (still, pose, bg, placement or None = as in its own picture)
SHIFT_MINT = {'x': None}   # filled from the first build (mint_ear is drawn centred; her voice is at your RIGHT ear → moved right)
VIEWS = {
    'pass': ('nagisa_pass', 'nagisa_base', 'pass'), 'hall': ('hinata_hall', 'hinata_base', 'hall'), 'dice': ('hinata_dice', 'hinata_dice', 'hall'),
    'hear': ('hinata_hear', 'hinata_ear', 'hall'), 'room': ('mint_room', 'mint_base', 'room'), 'mear': ('mint_mear', 'mint_ear', 'room'),
    'door': ('nagisa_door', 'nagisa_guard', 'door'),
    'end_m': ('mint_dawn', 'mint_ear', 'dawn'), 'end_h': ('hinata_dawn', 'hinata_ear', 'dawn'), 'end_n': ('nagisa_dawn', 'nagisa_guard', 'dawn'),
}
PLACE = json.load(open(os.path.join(ROOT, 'project', 'placement.json'))) if os.path.exists(os.path.join(ROOT, 'project', 'placement.json')) else {}
cfg = {"src": "assets/art", "hooks": {"view": "INN.S.view", "lv": "INN.S.lv"},
       "bgs": {k: ({"src": f"bg_{k}", "fire": v} if v else {"src": f"bg_{k}", "fire": [.5, .5]}) for k, v in BGS.items()}, "poses": {}, "views": {}}
for p in POSES:
    f = FP[p]; c = p.split('_')[0]
    cfg["poses"][p] = {"src": p, "talk": f"{p}_talk", "blink": f"{p}_blink", "matte": MATTE[c],
                       "centre_mouth": f["mouth"][:2], "radius_mouth": [round(f["mouth"][2] * .8), round(f["mouth"][3] * .8)],
                       "regions_eyes": [[e[0], e[1], round(e[2] * EYE.get(p, .8)), round(e[3] * EYE.get(p, .8))] for e in f["eyes"]]}
    if p not in LP_SKIP: cfg["poses"][p]["mouth"] = "lp"   # mouth = a LivePortrait set from the pose itself (tools/art/lp_mouths.py, guide §6, 2026-11-08); the drawn _talk variants are the fallback
    if p in MOUTH_REG: cfg["poses"][p]["regions_mouth"] = MOUTH_REG[p]; cfg["poses"][p].pop("centre_mouth"); cfg["poses"][p].pop("radius_mouth")
for v, (still, pose, bg) in VIEWS.items():
    d = {"still": still, "pose": pose, "bg": bg, "fire": BGS[bg]}
    d.update(PLACE.get(pose, {}))
    if v == 'pass': d['alias'] = ['white']   # the white-out at the start draws the pass still under a white veil
    cfg["views"][v] = d
json.dump(cfg, open(os.path.join(ROOT, 'project', 'stage.json'), 'w'), indent=1)
print(len(cfg['views']), 'views')
