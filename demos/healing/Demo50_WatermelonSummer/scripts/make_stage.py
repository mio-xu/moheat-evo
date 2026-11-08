#!/usr/bin/env python3
"""Writes project/stage.json for tools/art/build_stage.py (G4) from the tables below + project/face_points.json. python3 scripts/make_stage.py
Shot list = scripts/script_data.py STEPS (who speaks where: near / left / right / left_ear / front). H = grandma (hana), G = grandpa (gen).
Grandma's eyes are drawn closed in her smile (her look since Demo15): no blink. Grandpa's mouth is a short line UNDER his moustache →
"warp": false on that line + "hide" = the moustache polygon (the opening never draws over the moustache). Busts cut at the knees in
their source sit with the cut ≥ 4 % below the frame (y 1.05); grandpa with the melon is a full figure (feet inside, y .97).
Night (part 5): moon-graded copies of the poses (scripts/night_grade.py)."""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FP = json.load(open(os.path.join(ROOT, 'project', 'face_points.json')))
BGS = {'busstop': None, 'stream': None, 'yard': None, 'field_night': None}
NOLP = os.environ.get('NOLP')


def pose(src, fpk, who, lp):
    f = FP[fpk]; d = {"src": src, "matte": "green", "character": who, "look": "summer"}
    if f.get('eyes'): d.update({"blink": src + "_blink", "regions_eyes": [[e[0], e[1], round(e[2] * 1.1), round(e[3] * 1.1)] for e in f['eyes']]})
    if not NOLP: d.update({"mouth": "lp", "lp": lp})
    return d


GM = lambda f: {"view": {"rotate": "auto"}, "lips": [.08, .16, .26], "light": .3}   # soft cel adult face: small openings (§6 ④)
GP = lambda f: {"warp": False, "centre": [f['mouth'][0], f['mouth'][1] + 2], "radius": [round(f['mouth'][2] * 2.4), 30], "lift": .06, "drop": .32,
                "dark": 20, "hide": [f['moustache']], "teeth": {"alpha": .75, "band": .05, "tongue_a": .5},
                "search": [round(f['mouth'][2] * 1.6), 9]}   # look for the mouth line only right around it (the moustache's lower outline is darker and longer)
GMN = lambda f: {"warp": False, "centre": f['mouth'][:2], "radius": [round(f['mouth'][2] * 2.2), 34], "lift": .08, "drop": .26, "dark": 7, "light": .65}   # graded copy (dimmer: low "dark"): LP's render opened only the middle
POSES = {
    'grandma_base': pose('grandma_base', 'grandma_base', 'grandma', GM(FP['grandma_base'])),
    'grandma_fan': pose('grandma_fan', 'grandma_fan', 'grandma', GM(FP['grandma_fan'])),
    'grandpa_base': pose('grandpa_base', 'grandpa_base', 'grandpa', GP(FP['grandpa_base'])),
    'grandpa_melon': pose('grandpa_melon', 'grandpa_melon', 'grandpa', GP(FP['grandpa_melon'])),
    'grandma_night': pose('grandma_base_night', 'grandma_base', 'grandma', GMN(FP['grandma_base'])),
    'grandpa_night': pose('grandpa_base_night', 'grandpa_base', 'grandpa', dict(GP(FP["grandpa_base"]), dark=7, light=.65)),   # moon-graded: fainter line
}
F = lambda p, x, y, h, who: {'pose': p, 'x': x, 'y': y, 'height': h, 'who': who}
H = lambda x=.5, h=.95, p='grandma_base': F(p, x, 1.05, h, 'H')
G = lambda x=.5, h=.95, p='grandpa_base': F(p, x, 1.05, h, 'G')
MELK = 116 * 1349 / (1395 * 87)   # same face size as grandpa_base: eye distance 116 vs 87 px, layer heights 1395 vs 1349 px
MEL = lambda x=.66, hb=.95: F('grandpa_melon', x, .09 + hb * MELK, hb * MELK, 'G')   # full figure at the base's scale: head 9 % from the top, his feet below the frame
VIEWS = {   # view: (still, bg, main figure, more figures)
    'bus_H': ('gm_busstop', 'busstop', H(.55), []),
    'bus_H_ear': ('gm_busstop_ear', 'busstop', F('grandma_base', .3, 1.1, 1.06, 'H'), []),   # h02 at your LEFT ear (closer, left; head 4 % below the top)
    'river_G': ('gp_stream', 'stream', G(), []),
    'river_G_melon': ('gp_melon', 'stream', MEL(), []),                          # g02 / g03 from the RIGHT, the cold melon
    'river_duo': ('stream_duo', 'stream', H(.2, .86), [MEL(.72, .86)]),            # h03 on the left
    'yard_G': ('gp_yard', 'yard', G(.45), []),
    'yard_duo': ('yard_duo', 'yard', H(.2, .82), [G(.78, .86)]),                  # blindfold calls: grandpa right, grandma left
    'engawa_H': ('gm_engawa', 'yard', H(.45), []),
    'engawa_fan': ('gm_fan', 'yard', F('grandma_fan', .3, 1.04, .95, 'H'), []),   # h06–h08 at your LEFT ear with the uchiwa
    'engawa_duo': ('engawa_duo', 'yard', H(.25, .84), [G(.76, .88)]),
    'night_G': ('gp_night', 'field_night', G(.55, .95, 'grandpa_night'), []),
    'night_H': ('gm_night', 'field_night', H(.45, .95, 'grandma_night'), []),
    'night_duo': ('night_duo', 'field_night', H(.25, .84, 'grandma_night'), [G(.76, .88, 'grandpa_night')]),
}
# ground contact (build_stage "shadow"): the busts are cut at the knees below the frame → only the ambient-occlusion pool at the frame
# bottom; coloured by each plate's light (noon dirt, dappled stream, low evening sun from the left on the yard, moonlit field)
SHADOW = {'busstop': {"color": [86, 70, 52], "ao": .3}, 'stream': {"color": [60, 72, 58], "ao": .3},
          'yard': {"color": [92, 60, 36], "ao": .32, "dx": .02}, 'field_night': {"color": [26, 34, 62], "ao": .35}}
cfg = {"src": "assets/art", "hooks": {"view": "SUIKA.S.view", "who": "SUIKA.S.who"},
       "bgs": {k: {"src": f"bg_{k}" + ("_soft" if k == "stream" else ""), "fire": v} for k, v in BGS.items()}, "poses": POSES, "views": {}}
for v, (still, bg, main, more) in VIEWS.items():
    d = {"still": still, "bg": bg, "fire": BGS[bg], "shadow": SHADOW[bg]}; d.update(main)
    if more: d["more"] = more
    cfg["views"][v] = d
json.dump(cfg, open(os.path.join(ROOT, 'project', 'stage.json'), 'w'), indent=1)
print(len(cfg['views']), 'views,', len(POSES), 'poses')
