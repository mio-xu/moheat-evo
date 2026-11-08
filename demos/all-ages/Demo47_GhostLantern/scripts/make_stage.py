#!/usr/bin/env python3
"""Writes project/stage.json for tools/art/build_stage.py (G4) from the tables below + project/face_points.json. python3 scripts/make_stage.py
Game demo: the page (UI v2, built later) moves the sprites itself (ghosts glide in from a side, the lantern turns); the views here are
the layered stills per stage (script.md / scripts/script_data.py STAGES) and give every sprite its own layer, blink and mouth set.
Who: B = Bon-chan (talks in every stage), Y = Yurari (stage 5), G = the small ghosts (giggle SFX only: no mouth, see project/qa.json).
Bon-chan is drawn with an open mouth → his layer is the masked CLOSED edit (<pose>_quiet), the mouth set opens from that line.
Chibi faces → mouths "warp": false (guide §11.1: LivePortrait twists chibi eyes), block under the eyes, low "dark"."""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FP = json.load(open(os.path.join(ROOT, 'project', 'face_points.json')))
BGS = {'gate': [.5, .55], 'corridor': [.5, .45], 'tatami': [.86, .7], 'kura': [.5, .8]}
EYE = 1.05
EYE_POSE = {'yurari_ear': 1.2}   # check_patches OUTER 40.8 at 1.05: the blink redrew hair strands inside its mask → the patch covers the whole mask (§11.1)


def lp(m, k=1.0, dark=12, extra=None, radius=None):
    d = {"lips": [.1, .2, .3], "light": .4, "warp": False, "centre": m[:2], "radius": radius or [round(m[2] * 2.0 * k), round(m[3] * 2.6 * k)],
         "lift": .12, "drop": .3, "dark": dark}
    d.update(extra or {}); return d


POSES = {}
for p, src in (('bonchan_base', 'bonchan_base_quiet'), ('bonchan_scared', 'bonchan_scared_quiet')):
    f = FP[p]
    POSES[p] = {"src": src, "blink": p + "_blink", "matte": "green", "character": "bonchan", "look": "lantern",
                "regions_eyes": [[e[0], e[1], round(e[2] * EYE), round(e[3] * EYE)] for e in f['eyes']],
                "mouth": "lp", "lp": lp(f['lp_block'][:2], dark=14, radius=f['lp_block'][2:], extra={"light": .25})}
GE = FP['ghosts_base']['eyes']
for g, eyes in (('kasa', GE[:1]), ('white', GE[1:3]), ('wisp', GE[3:])):
    POSES['ghost_' + g] = {"src": 'ghost_' + g, "blink": f'ghost_{g}_blink', "matte": "green", "character": 'ghost_' + g, "look": "ghost",
                           "regions_eyes": [[e[0], e[1], round(e[2] * EYE), round(e[3] * EYE)] for e in eyes]}
for p in ('yurari_base', 'yurari_ear', 'yurari_happy'):
    f = FP[p]
    k = EYE_POSE.get(p, EYE)
    POSES[p] = {"src": p + "_m", "blink": p + "_blink", "matte": "green", "character": "yurari", "look": "goldfish_yukata",
                "regions_eyes": [[e[0], e[1], round(e[2] * k), round(e[3] * k)] for e in f['eyes']],
                "mouth": "lp", "lp": lp(f['mouth'], dark=5)}   # her smile is a thin, faint pink line
if os.environ.get('NOLP'):   # first build only: lp_mouths.py needs media/layers.js (guide §11.1)
    for v in POSES.values(): v.pop('mouth', None)

B = lambda pose='bonchan_base', x=.78, h=.5: {'pose': pose, 'x': x, 'y': 1.0, 'height': h, 'who': 'B'}
GH = {'kasa': .6, 'white': .42, 'wisp': .42}
G = lambda g, x, h=None, y=.86: {'pose': 'ghost_' + g, 'x': x, 'y': y, 'height': h or GH[g], 'who': 'G'}
VIEWS = {   # view: (still, bg, main figure, more figures)
    'gate_B': ('lantern_gate', 'gate', B(x=.5, h=.62), []),
    'gate_ghost': ('lantern_gate_ghost', 'gate', B(x=.72), [G('kasa', .22)]),
    'hall_B': ('lantern_hall', 'corridor', B(x=.5, h=.62), []),
    'hall_ghosts': ('lantern_hall_ghosts', 'corridor', B('bonchan_scared', .5), [G('white', .17), G('wisp', .83)]),
    'hall_hit': ('lantern_hall_hit', 'corridor', B('bonchan_scared', .5, .62), []),
    'room_B': ('lantern_room', 'tatami', B(x=.5, h=.62), []),
    'room_behind': ('lantern_room_behind', 'tatami', B('bonchan_scared', .5), [G('kasa', .3, .38, .62), G('white', .5, .3, .58), G('wisp', .7, .3, .62)]),
    'kura_B': ('lantern_kura', 'kura', B('bonchan_scared', .5, .62), []),
    'kura_win': ('lantern_kura_win', 'kura', B(x=.5, h=.62), []),
    'yurari_far': ('yurari_far', 'tatami', {'pose': 'yurari_base', 'x': .5, 'y': .97, 'height': .8, 'who': 'Y'}, [B(x=.84, h=.4)]),
    'yurari_ear': ('yurari_whisper', 'tatami', {'pose': 'yurari_ear', 'who': 'Y'}, []),
    'yurari_happy': ('yurari_happy', 'tatami', {'pose': 'yurari_happy', 'x': .5, 'y': .98, 'height': .8, 'who': 'Y'}, [B(x=.84, h=.4)]),
    'finale': ('lantern_finale', 'tatami', {'pose': 'yurari_happy', 'x': .5, 'y': .98, 'height': .74, 'who': 'Y'},
               [G('kasa', .17, .46, .8), G('white', .32, .3, .62), G('wisp', .7, .3, .6), B(x=.84, h=.42)]),
}
cfg = {"src": "assets/art", "hooks": {"view": "LANTERN.S.view", "who": "LANTERN.S.who"},
       "bgs": {k: {"src": f"bg_{k}", "fire": v} for k, v in BGS.items()}, "poses": POSES, "views": {}}
for v, (still, bg, main, more) in VIEWS.items():
    d = {"still": still, "bg": bg, "fire": BGS[bg]}; d.update(main)
    if more: d["more"] = more
    cfg["views"][v] = d
json.dump(cfg, open(os.path.join(ROOT, 'project', 'stage.json'), 'w'), indent=1)
print(len(cfg['views']), 'views,', len(POSES), 'poses')
