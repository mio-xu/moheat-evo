#!/usr/bin/env python3
"""G4 masked blink jobs → project/web_prompts.json from project/face_points.json (grandpa only: grandma's eyes are drawn closed in her
smile, her look since Demo15). Then: python3 tools/openai/images.py <demo> grandpa_base_blink grandpa_melon_blink --quality high --composite"""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); WP = os.path.join(ROOT, 'project', 'web_prompts.json')
P = json.load(open(WP)); FP = json.load(open(os.path.join(ROOT, 'project', 'face_points.json')))
KEEP = ("Edit this exact image. Keep EVERYTHING identical — same pose, framing, size, position, straw hat, eyebrows, moustache, clothes, colours, "
        "lighting and background — and change ONLY {what}. Do not move, zoom or crop the picture.")
B = "BOTH of grandpa's eyes: closed in a natural soft blink (a short curved closed-lid line on each eye, no pupil visible), same skin, his bushy white eyebrows unchanged"
for p in ('grandpa_base', 'grandpa_melon'):
    P[p + '_blink'] = {"ref": p, "prompt": KEEP.format(what=B), "mask": ";".join(",".join(map(str, e)) for e in FP[p]['eyes']), "composite": True}
json.dump(P, open(WP + '.tmp', 'w'), ensure_ascii=False, indent=1); os.replace(WP + '.tmp', WP)
