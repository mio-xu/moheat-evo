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
# もっと話す · place × cast (2026-11-08): every place with each of the three (her base pose; at your ear her close pose) and all three
# together (trio = the dawn group: Mint a step behind in the middle, Nagisa left, Hinata right — each its own layer, own mouth / blinks).
# Stills of these extra views are small (960×540 flat fallback only: they are always drawn live). Views that exist in the story are reused.
WHO = {'mint': 'M', 'hinata': 'H', 'nagisa': 'N'}
TPLACE = {'pass': 'pass', 'hall': 'hall', 'room': 'room', 'door': 'door', 'dawn': 'dawn'}
BASE = {'M': 'mint_base', 'H': 'hinata_base', 'N': 'nagisa_base'}; EAR = {'M': 'mint_ear', 'H': 'hinata_ear', 'N': 'nagisa_guard'}
REUSE = {('pass', 'N'): 'pass', ('hall', 'H'): 'hall', ('room', 'M'): 'room', ('door', 'N'): 'door', ('hall', 'He'): 'hear', ('room', 'Me'): 'mear',
         ('door', 'Ne'): 'door', ('dawn', 'Me'): 'end_m', ('dawn', 'He'): 'end_h', ('dawn', 'Ne'): 'end_n', ('dawn', '3'): 'trio'}
EAR_AT = {'M': ('room', 'dawn')}   # Mint's close pose holds the moxa stick + balm: only in her room (and the dawn ending as before); elsewhere her base view
TRIO = [('nagisa_base', .22, 1.0, 'N'), ('hinata_base', .78, .86, 'H')]   # main figure = mint_base x .5, height .8 (scripts/make_trio.py spots)
for pl, bg in TPLACE.items():
    for c in 'MHN':
        if (pl, c) not in REUSE: VIEWS[f't_{pl}_{c}'] = (f't_{pl}_{c}', BASE[c], bg)
        if (pl, c + 'e') not in REUSE and pl in EAR_AT.get(c, TPLACE): VIEWS[f't_{pl}_{c}e'] = (f't_{pl}_{c}e', EAR[c], bg)
    if (pl, '3') not in REUSE: VIEWS[f't_{pl}_3'] = (f't_{pl}_3', 'mint_base', bg)
VIEWS['trio'] = ('trio_dawn', 'mint_base', 'dawn')
PLACE = json.load(open(os.path.join(ROOT, 'project', 'placement.json'))) if os.path.exists(os.path.join(ROOT, 'project', 'placement.json')) else {}
cfg = {"src": "assets/art", "hooks": {"view": "INN.S.view", "lv": "INN.S.lv", "who": "INN.S.who"},
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
    d['who'] = WHO[pose.split('_')[0]]   # the speaker key (hooks.who): her mouth moves only while she speaks
    if v == 'trio' or v.endswith('_3'):
        d.update({'x': .5, 'y': 1.0, 'height': .8, 'more': [{'pose': p_, 'x': x, 'y': 1.0, 'height': h, 'who': w} for p_, x, h, w in TRIO]})
    if v.startswith('t_'): d['small'] = True
    cfg["views"][v] = d
json.dump(cfg, open(os.path.join(ROOT, 'project', 'stage.json'), 'w'), indent=1)
json.dump({'views': {k: v[0] for k, v in VIEWS.items()}, 'reuse': {f'{a}|{b}': v for (a, b), v in REUSE.items()}},
          open(os.path.join(ROOT, 'project', 'talk_views.json'), 'w'), indent=0)   # read by scripts/script_data.py (place × cast → view)
print(len(cfg['views']), 'views')
