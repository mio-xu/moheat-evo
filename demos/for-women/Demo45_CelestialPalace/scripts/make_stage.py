#!/usr/bin/env python3
"""Writes project/stage.json for tools/art/build_stage.py (Demo45) from the tables below + project/face_points.json + project/placement.json.
Story views (script.md shot list) + もっと話す place × cast views + the dawn group (three layers, own mouth sets / blinks; hooks.who).
First build: NOLP=1 python3 scripts/make_stage.py && build_stage (lp_mouths.py needs media/layers.js), then lp_mouths, then rebuild."""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FP = json.load(open(os.path.join(ROOT, 'project', 'face_points.json')))
POSES = ['jin_base', 'jin_ear', 'shion_base', 'shion_ear', 'saku_base', 'saku_ear']
BGS = {'pond': None, 'chamber': [.9, .62], 'terrace': [.74, .62], 'corridor': None, 'dawn': None}
MATTE = {'jin': None, 'shion': 'green', 'saku': 'green'}   # Jin on light grey #c8c8c8 = the default grey flood
LP = {p: {"view": {"rotate": "auto"}, "teeth": {"alpha": .75, "band": .05, "tongue_a": .5}} for p in POSES}   # men: subtle teeth (Demo24 / 30)
VIEWS = {   # view: (still, pose, bg)
    'pond_K': ('saku_pond', 'saku_base', 'pond'), 'chamber_J': ('jin_chamber', 'jin_base', 'chamber'), 'chamber_J_ear': ('jin_warmer', 'jin_ear', 'chamber'),
    'terrace_S': ('shion_terrace', 'shion_base', 'terrace'), 'terrace_S_ear': ('shion_whisper', 'shion_ear', 'terrace'),
    'corridor_K': ('saku_corridor', 'saku_base', 'corridor'), 'corridor_K_ear': ('saku_shh', 'saku_ear', 'corridor'),
    'end_J': ('jin_dawn', 'jin_ear', 'dawn'), 'end_S': ('shion_dawn', 'shion_ear', 'dawn'), 'end_K': ('saku_dawn', 'saku_ear', 'dawn'),
}
WHO = {'jin': 'J', 'shion': 'S', 'saku': 'K'}
BASE = {'J': 'jin_base', 'S': 'shion_base', 'K': 'saku_base'}; EAR = {'J': 'jin_ear', 'S': 'shion_ear', 'K': 'saku_ear'}
REUSE = {('pond', 'K'): 'pond_K', ('chamber', 'J'): 'chamber_J', ('terrace', 'S'): 'terrace_S', ('corridor', 'K'): 'corridor_K',
         ('chamber', 'Je'): 'chamber_J_ear', ('terrace', 'Se'): 'terrace_S_ear', ('corridor', 'Ke'): 'corridor_K_ear',
         ('dawn', 'Je'): 'end_J', ('dawn', 'Se'): 'end_S', ('dawn', 'Ke'): 'end_K', ('dawn', '3'): 'dawn_3'}
EAR_AT = {'J': ('chamber', 'dawn')}   # Jin's close pose holds the hand-warmer: only in his chamber (and the ending)
ONLY = {}
TRIO = [('shion_base', .2, .9, 'S'), ('saku_base', .8, .9, 'K')]   # main figure = jin_base x .5, height .92
for pl in ('pond', 'chamber', 'terrace', 'corridor', 'dawn'):
    for c in ONLY.get(pl, 'JSK'):
        if (pl, c) not in REUSE: VIEWS[f't_{pl}_{c}'] = (f't_{pl}_{c}', BASE[c], pl)
        if (pl, c + 'e') not in REUSE and pl in EAR_AT.get(c, ('pond', 'chamber', 'terrace', 'corridor', 'dawn')): VIEWS[f't_{pl}_{c}e'] = (f't_{pl}_{c}e', EAR[c], pl)
    if pl not in ONLY and (pl, '3') not in REUSE: VIEWS[f't_{pl}_3'] = (f't_{pl}_3', 'jin_base', pl)
VIEWS['dawn_3'] = ('trio_dawn', 'jin_base', 'dawn')
PLACE = json.load(open(os.path.join(ROOT, 'project', 'placement.json'))) if os.path.exists(os.path.join(ROOT, 'project', 'placement.json')) else {}
cfg = {"src": "assets/art", "hooks": {"view": "PALACE.S.view", "lv": "PALACE.S.lv", "who": "PALACE.S.who"},
       "bgs": {k: {"src": f"bg_{k}", "fire": v or [.5, .5]} for k, v in BGS.items()}, "poses": {}, "views": {}}
for p in POSES:
    f = FP[p]; c = p.split('_')[0]
    cfg["poses"][p] = {"src": p, "blink": f"{p}_blink", "matte": MATTE[c], "character": c, "look": "crossover_palace",
                       "centre_mouth": f["mouth"][:2], "radius_mouth": [round(f["mouth"][2] * .8), round(f["mouth"][3] * .8)],
                       "regions_eyes": [[e[0], e[1], round(e[2] * 1.05), round(e[3] * 1.05)] for e in f["eyes"]]}
    if p in LP: cfg["poses"][p]["lp"] = LP[p]
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
