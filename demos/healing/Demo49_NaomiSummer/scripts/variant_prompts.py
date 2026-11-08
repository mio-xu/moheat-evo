#!/usr/bin/env python3
"""G4 jobs → project/web_prompts.json: masked blinks for every Naomi pose (face_points.json, ellipses × 1.12), the ice-water bottle as its
own prop sprite (the story drags it next to her, script.md part 3) and the three room plates without the bottle (masked composite edit,
the rest of the plate pixel-identical). Then: python3 tools/openai/images.py <demo> <jobs> --quality high --composite (the prop: no mask)."""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FP = json.load(open(os.path.join(ROOT, 'project', 'face_points.json'))); WP = os.path.join(ROOT, 'project', 'web_prompts.json')
P = json.load(open(WP))
KEEP = ("Edit this exact image. Keep EVERYTHING identical — same cat, same pose, framing, size, position, fur pattern, colours, lighting and "
        "background — and change ONLY {what}. Do not move, zoom or crop the picture.")
BLINK = ("BOTH of the cat's eyes: closed in a natural relaxed cat blink — the furry upper lids all the way down, each eye a soft closed lid line "
         "with the same grey / white fur around it, no iris, no pupil, no eye-white visible; the fur pattern and whiskers stay exactly as they are")
ell = lambda es: ";".join(",".join(str(v) for v in e) for e in es)
for pose, f in FP.items():
    if pose.startswith('_'): continue
    P[pose + '_blink'] = {"ref": pose, "prompt": KEEP.format(what=BLINK), "mask": ell([[e[0], e[1], round(e[2] * 1.12), round(e[3] * 1.12)] for e in f['eyes']]), "composite": True}
BOTTLE = "2135,915,232,412"   # the towel-wrapped bottle on the tatami in front of the fan (source px of the 2560×1440 plates)
NOB = ("Edit this exact image. Keep EVERYTHING identical and change ONLY the area where the towel-wrapped water bottle stands: REMOVE the bottle "
       "and its towel completely and continue what is behind it — the tatami floor with its sunlight stripes / light, the white fan's round base "
       "and stand, the fan's paper streamer — so the spot is empty floor. No new objects. Do not move, zoom or crop the picture.")
for pl in ('bg_room_day', 'bg_room_rain', 'bg_room_night'):
    P[pl + '_nobottle'] = {"ref": pl, "prompt": NOB, "mask": BOTTLE, "composite": True}
BASE = "2135,1250,265,95"   # 2nd pass: the towel's wide base + its shadow stuck out under the first ellipse
for pl in ('bg_room_day', 'bg_room_rain', 'bg_room_night'):
    P[pl + '_nob'] = {"ref": pl + '_nobottle', "prompt": NOB.replace("REMOVE the bottle", "REMOVE what is left of the bottle (the white towel corners and the curved shadow at its foot)"), "mask": BASE, "composite": True}
P['prop_bottle'] = {"ref": "bg_room_day", "prompt": (
    "Draw ONLY the towel-wrapped glass water bottle of image 1 (a big glass bottle of ice-cold water with condensation drops, a white towel with "
    "small blue dots wrapped and knotted around it, its neck showing at the top), exactly the same design, size proportions and soft daylight, "
    "standing upright, alone, centred, on a plain flat chroma MAGENTA background (#FF00FF), one even colour, no floor, no shadow, nothing magenta "
    "or pink-purple on it. Whole bottle inside the frame with margin. Same painterly high-finish illustration style. Wide 16:9. No text.")}
json.dump(P, open(WP + '.tmp', 'w'), ensure_ascii=False, indent=1); os.replace(WP + '.tmp', WP)
print(sorted(k for k in P if k.endswith(('_blink', '_nobottle')) or k == 'prop_bottle'))
