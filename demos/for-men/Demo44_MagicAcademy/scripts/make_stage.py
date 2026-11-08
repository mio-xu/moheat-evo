#!/usr/bin/env python3
"""Writes project/stage.json for tools/art/build_stage.py from the tables below + project/face_points.json (measured mouth / eye
ellipses → fixed patch regions) + project/placement.json (x / y / height per pose where it must move). python3 scripts/make_stage.py
Story views (script.md shot list) + もっと話す place × cast views (sky = Tsubaki only: her broom) + the dawn group (three layers,
each its own LivePortrait mouth set and blinks; hooks.who = the speaker). hooks point at the page state the build stage will write
(ACAD.S.view / lv / who)."""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FP = json.load(open(os.path.join(ROOT, 'project', 'face_points.json')))
POSES = ['tsubaki_base', 'tsubaki_broom', 'cocoa_base', 'cocoa_ear', 'luna_base', 'luna_ear']
BGS = {'hall': [.5, .5], 'sky': None, 'lab': [.78, .86], 'tower': [.07, .84], 'dawn': None}
LP = {'tsubaki_broom': {"view": {"rotate": "auto"}}, 'cocoa_ear': {"view": {"rotate": "auto"}}, 'luna_ear': {"view": {"rotate": "auto"}}}
VIEWS = {   # view: (still, pose, bg)
    'hall_T': ('tsubaki_hall', 'tsubaki_base', 'hall'), 'sky_T': ('tsubaki_sky', 'tsubaki_broom', 'sky'),
    'lab_C': ('cocoa_lab', 'cocoa_base', 'lab'), 'lab_C_ear': ('cocoa_mug', 'cocoa_ear', 'lab'), 'lab_C_blow': ('cocoa_blow', 'cocoa_blow', 'lab'),
    'tower_L': ('luna_tower', 'luna_base', 'tower'), 'tower_L_ear': ('luna_whisper', 'luna_ear', 'tower'),
    'end_T': ('tsubaki_dawn', 'tsubaki_base', 'dawn'), 'end_C': ('cocoa_dawn', 'cocoa_ear', 'dawn'), 'end_L': ('luna_dawn', 'luna_ear', 'dawn'),
}
WHO = {'tsubaki': 'T', 'cocoa': 'C', 'luna': 'L'}
BASE = {'T': 'tsubaki_base', 'C': 'cocoa_base', 'L': 'luna_base'}; EAR = {'T': 'tsubaki_base', 'C': 'cocoa_ear', 'L': 'luna_ear'}
REUSE = {('hall', 'T'): 'hall_T', ('sky', 'T'): 'sky_T', ('lab', 'C'): 'lab_C', ('tower', 'L'): 'tower_L', ('lab', 'Ce'): 'lab_C_ear',
         ('tower', 'Le'): 'tower_L_ear', ('dawn', 'Te'): 'end_T', ('dawn', 'Ce'): 'end_C', ('dawn', 'Le'): 'end_L', ('dawn', '3'): 'dawn_3',
         ('hall', 'Te'): 'hall_T', ('sky', 'Te'): 'sky_T'}
EAR_AT = {'C': ('lab', 'dawn'), 'L': ('tower', 'dawn')}   # the close poses hold the mug / the iced tea: only where that exists
ONLY = {'sky': 'T'}
TRIO = [('tsubaki_base', .2, .9, 'T'), ('cocoa_base', .8, .9, 'C')]   # main figure = luna_base x .5, height .92
for pl in ('hall', 'sky', 'lab', 'tower', 'dawn'):
    for c in ONLY.get(pl, 'TCL'):
        if (pl, c) not in REUSE: VIEWS[f't_{pl}_{c}'] = (f't_{pl}_{c}', BASE[c], pl)
        if (pl, c + 'e') not in REUSE and pl in EAR_AT.get(c, ()): VIEWS[f't_{pl}_{c}e'] = (f't_{pl}_{c}e', EAR[c], pl)
    if pl not in ONLY and (pl, '3') not in REUSE: VIEWS[f't_{pl}_3'] = (f't_{pl}_3', 'luna_base', pl)
VIEWS['dawn_3'] = ('trio_dawn', 'luna_base', 'dawn')
PLACE = json.load(open(os.path.join(ROOT, 'project', 'placement.json'))) if os.path.exists(os.path.join(ROOT, 'project', 'placement.json')) else {}
cfg = {"src": "assets/art", "hooks": {"view": "ACAD.S.view", "lv": "ACAD.S.lv", "who": "ACAD.S.who"},
       "bgs": {k: {"src": f"bg_{k}", "fire": v or [.5, .5]} for k, v in BGS.items()}, "poses": {}, "views": {}}
for p in POSES:
    f = FP[p]; c = p.split('_')[0]
    cfg["poses"][p] = {"src": p, "blink": f"{p}_blink", "matte": "green", "character": c, "look": "crossover_academy", "mouth": "lp",
                       "centre_mouth": f["mouth"][:2], "radius_mouth": [round(f["mouth"][2] * .8), round(f["mouth"][3] * .8)],
                       "regions_eyes": [[e[0], e[1], round(e[2] * 1.05), round(e[3] * 1.05)] for e in f["eyes"]]}
    if p in LP: cfg["poses"][p]["lp"] = LP[p]
# her blow (pursed lips, a silent moment: no line plays) = the mug pose's own masked edit; shares its blink (same face, same pixels)
fe = FP['cocoa_ear']
cfg["poses"]["cocoa_blow"] = {"src": "cocoa_ear_blow", "blink": "cocoa_ear_blink", "matte": "green", "character": "cocoa", "look": "crossover_academy",
                              "regions_eyes": [[e[0], e[1], round(e[2] * 1.05), round(e[3] * 1.05)] for e in fe["eyes"]]}
for v, (still, pose, bg) in VIEWS.items():
    d = {"still": still, "pose": pose, "bg": bg, "fire": BGS[bg]}
    d.update(PLACE.get(pose, {}))
    d['who'] = WHO[pose.split('_')[0]]
    if v == 'dawn_3' or v.endswith('_3'):
        d.update({'x': .5, 'y': 1.0, 'height': .92, 'more': [{'pose': p_, 'x': x, 'y': 1.0, 'height': h, 'who': w} for p_, x, h, w in TRIO]})
    if v.startswith('t_'): d['small'] = True
    cfg["views"][v] = d
json.dump(cfg, open(os.path.join(ROOT, 'project', 'stage.json'), 'w'), indent=1)
json.dump({'views': {k: v[0] for k, v in VIEWS.items()}, 'reuse': {f'{a}|{b}': v for (a, b), v in REUSE.items()}},
          open(os.path.join(ROOT, 'project', 'talk_views.json'), 'w'), indent=0)
print(len(cfg['views']), 'views')
