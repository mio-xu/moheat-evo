#!/usr/bin/env python3
"""Writes project/stage.json for tools/art/build_stage.py (Demo46) from the tables below + project/face_points.json + project/placement.json.
Story views (script.md shot list) + もっと話す place × cast views + the dawn group (three layers, own mouth sets / blinks; hooks.who).
First build: NOLP=1 python3 scripts/make_stage.py && build_stage (lp_mouths.py needs media/layers.js), then lp_mouths, then rebuild."""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FP = json.load(open(os.path.join(ROOT, 'project', 'face_points.json')))
POSES = ['hinata_base', 'hinata_ear', 'gaku_base', 'gaku_wing', 'ren_base', 'ren_ear']
BGS = {'study': [.9, .7], 'valley': None, 'lake': None, 'dawn': [.9, .72]}
MATTE = {'hinata': 'green', 'gaku': None, 'ren': 'green'}
LP = {p: {"view": {"rotate": "auto"}, "teeth": {"alpha": .75, "band": .05, "tongue_a": .5}} for p in POSES}   # men: subtle teeth (Demo24 / 30)
LP['hinata_base']['fang'] = [[[1329, 371], [1343, 371], [1336, 389]]]   # his tiny drawn fang (it vanished at lv2 / lv3 in the first sheet)
VIEWS = {   # view: (still, pose, bg)
    'study_H': ('hinata_study', 'hinata_base', 'study'), 'study_H_ear': ('hinata_whisper', 'hinata_ear', 'study'),
    'valley_G': ('gaku_valley', 'gaku_base', 'valley'), 'valley_G_wing': ('gaku_wing', 'gaku_wing', 'valley'),
    'lake_R': ('ren_lake', 'ren_base', 'lake'), 'lake_R_ear': ('ren_song', 'ren_ear', 'lake'),
    'night_H': ('hinata_night', 'hinata_base', 'study'), 'night_H_ear': ('hinata_night_ear', 'hinata_ear', 'study'),
    'end_H': ('hinata_dawn', 'hinata_ear', 'dawn'), 'end_G': ('gaku_dawn', 'gaku_wing', 'dawn'), 'end_R': ('ren_dawn', 'ren_ear', 'dawn'),
}
WHO = {'hinata': 'H', 'gaku': 'G', 'ren': 'R'}
BASE = {'H': 'hinata_base', 'G': 'gaku_base', 'R': 'ren_base'}; EAR = {'H': 'hinata_ear', 'G': 'gaku_wing', 'R': 'ren_ear'}
REUSE = {('study', 'H'): 'study_H', ('valley', 'G'): 'valley_G', ('lake', 'R'): 'lake_R', ('study', 'He'): 'study_H_ear',
         ('valley', 'Ge'): 'valley_G_wing', ('lake', 'Re'): 'lake_R_ear', ('dawn', 'He'): 'end_H', ('dawn', 'Ge'): 'end_G', ('dawn', 'Re'): 'end_R',
         ('dawn', '3'): 'dawn_3'}
EAR_AT = {'G': ('valley', 'dawn')}   # his wing pose only where the wing closes (valley) and in the ending
ONLY = {}
TRIO = [('gaku_base', .22, .95, 'G'), ('hinata_base', .8, .9, 'H')]   # main figure = ren_base x .5, height .92
for pl in ('study', 'valley', 'lake', 'dawn'):
    for c in ONLY.get(pl, 'HGR'):
        if (pl, c) not in REUSE: VIEWS[f't_{pl}_{c}'] = (f't_{pl}_{c}', BASE[c], pl)
        if (pl, c + 'e') not in REUSE and pl in EAR_AT.get(c, ('study', 'valley', 'lake', 'dawn')): VIEWS[f't_{pl}_{c}e'] = (f't_{pl}_{c}e', EAR[c], pl)
    if pl not in ONLY and (pl, '3') not in REUSE: VIEWS[f't_{pl}_3'] = (f't_{pl}_3', 'ren_base', pl)
VIEWS['dawn_3'] = ('trio_dawn', 'ren_base', 'dawn')
PLACE = json.load(open(os.path.join(ROOT, 'project', 'placement.json'))) if os.path.exists(os.path.join(ROOT, 'project', 'placement.json')) else {}
cfg = {"src": "assets/art", "hooks": {"view": "DRAGON.S.view", "lv": "DRAGON.S.lv", "who": "DRAGON.S.who"},
       "bgs": {k: {"src": f"bg_{k}", "fire": v or [.5, .5]} for k, v in BGS.items()}, "poses": {}, "views": {}}
for p in POSES:
    f = FP[p]; c = p.split('_')[0]
    cfg["poses"][p] = {"src": p, "blink": f"{p}_blink", "matte": MATTE[c], "character": c, "look": "crossover_dragon",
                       "centre_mouth": f["mouth"][:2], "radius_mouth": [round(f["mouth"][2] * .8), round(f["mouth"][3] * .8)],
                       "regions_eyes": [[e[0], e[1], round(e[2] * 1.05), round(e[3] * 1.05)] for e in f["eyes"]]}
    if p in LP: cfg["poses"][p]["lp"] = {k: v for k, v in LP[p].items() if v != []}
    if cfg["poses"][p]["matte"] is None: cfg["poses"][p].pop("matte")
    if not os.environ.get('NOLP'): cfg["poses"][p]["mouth"] = "lp"   # NOLP=1: first build only (lp_mouths.py needs media/layers.js first)
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
