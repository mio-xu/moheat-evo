#!/usr/bin/env python3
"""Writes project/stage.json for tools/art/build_stage.py (G4) from the tables below + project/face_points.json. python3 scripts/make_stage.py
Naomi = the user's real cat: one look in every pose (fur pattern, olive eyes), blinks only — no mouth sets (no human speech; her sounds are
purrs / chirps, project/qa.json). The towel-wrapped ice-water bottle is its own prop layer (the story drags it next to her, part 3), so the
plates are the masked edits without it (bg_room_*_nobottle → 2nd pass for its foot: bg_room_*_nob). The fan stays in the plate (its sweep = cool air in the thermal plan; spinning
blades, if wanted, are a code overlay at G5). Parts (script.md): 1 pancake · 2 batting the fan's streamer · 3 cheek on the cold bottle ·
4 thunder (she squeezes against your LEFT side) · 5 night, on your shoulder at your LEFT ear (her own framing)."""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FP = json.load(open(os.path.join(ROOT, 'project', 'face_points.json')))
BGS = {'day': None, 'rain': None, 'night': None}   # no fire indoors (no flicker / heat shimmer)
EYE = 1.18   # ≥ the edit mask (× 1.12): the patch edge lies on untouched fur (§11.1)
POSES = {p: {"src": p, "blink": p + "_blink", "matte": "magenta", "character": "naomi", "look": "naomi",
             "regions_eyes": [[e[0], e[1], round(e[2] * EYE), round(e[3] * EYE)] for e in f['eyes']]}
         for p, f in FP.items() if not p.startswith('_')}
POSES['prop_bottle'] = {"src": "prop_bottle", "matte": "magenta", "character": "prop_bottle", "look": "prop"}
for t, ps in {'rain': ['naomi_startle'], 'night': ['naomi_shoulder', 'naomi_pancake']}.items():   # graded copies (scripts/grade.py)
    for p in ps: POSES[f'{p}_{t}'] = dict(POSES[p], src=f'{p}_{t}', blink=f'{p}_{t}_blink')
    POSES[f'prop_bottle_{t}'] = dict(POSES['prop_bottle'], src=f'prop_bottle_{t}')
F = lambda pose, x, y, h, who='N': {'pose': pose, 'x': x, 'y': y, 'height': h, 'who': who}
BOT = lambda x, y=.93, h=.5, t='': F('prop_bottle' + t, x, y, h, 'X')      # by the fan at first (x .91), next to her in part 3, set aside after
VIEWS = {   # view: (still, bg, main figure, more figures (back → front))
    'day_pancake': ('naomi_pancake', 'day', F('naomi_pancake', .42, .94, .4), [BOT(.91)]),
    'day_bat': ('naomi_bat', 'day', F('naomi_bat', .62, .975, .62), [BOT(.91)]),               # her raised paw at the fan's streamer (.76, .38)
    'day_bottle': ('naomi_bottle', 'day', BOT(.40, .94), [F('naomi_bottle', .665, .95, .42)]),   # her warm cheek against the cold bottle (she is in front)
    'rain_startle': ('naomi_startle', 'rain', F('naomi_startle_rain', .27, .95, .45), [BOT(.66, t='_rain')]),
    'night_shoulder': ('naomi_shoulder', 'night', {'pose': 'naomi_shoulder_night', 'who': 'N', 'x': .43, 'y': 1.04, 'height': 1.0}, []),   # her ear 4 % below the top edge, the cut shoulder 4 % outside
    'night_pancake': ('naomi_night', 'night', F('naomi_pancake_night', .45, .94, .4), [BOT(.78, t='_night')]),
}
cfg = {"src": "assets/art", "hooks": {"view": "NAOMI.S.view", "who": "NAOMI.S.who"},
       "bgs": {k: {"src": f"bg_room_{k}_soft", "fire": v} for k, v in BGS.items()}, "poses": POSES, "views": {}}
for v, (still, bg, main, more) in VIEWS.items():
    d = {"still": still, "bg": bg, "fire": BGS[bg]}; d.update(main)
    if more: d["more"] = more
    cfg["views"][v] = d
json.dump(cfg, open(os.path.join(ROOT, 'project', 'stage.json'), 'w'), indent=1)
print(len(cfg['views']), 'views,', len(POSES), 'poses')
