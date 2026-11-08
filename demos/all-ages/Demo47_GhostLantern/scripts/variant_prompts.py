#!/usr/bin/env python3
"""Masked variant jobs (G4: blinks for every pose with eyes, a closed-mouth "quiet" for poses drawn with the mouth open) from
project/face_points.json → project/web_prompts.json. Run: python3 scripts/variant_prompts.py, then
python3 tools/openai/images.py <demo> <job…> --quality high --composite (only the mask ellipses change; guide §11.1)."""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FP = json.load(open(os.path.join(ROOT, 'project', 'face_points.json'))); WP = os.path.join(ROOT, 'project', 'web_prompts.json')
P = json.load(open(WP))
KEEP = ("Edit this exact image. Keep EVERYTHING identical — same pose, framing, size, position, outline, colours, lighting and background — "
        "and change ONLY {what}. Do not move, zoom or crop the picture.")
WHO = {   # pose → (who / what, blink wording, quiet wording)
 'bonchan_base': ("the lantern's", "BOTH of the lantern's eyes: closed in a soft happy blink (a curved closed eyelid line with lashes on each eye, no iris, no white of the eye visible), same orange paper around them",
                  "the lantern's mouth only: CLOSED, a small cute closed cat smile (a little 'ω' line under the nose), no open mouth, no tongue, the same orange-cream paper where the open mouth was"),
 'bonchan_scared': ("the lantern's", "BOTH of the lantern's eyes: closed tight in a soft blink (a curved closed eyelid line with lashes on each eye, no iris, no white visible)",
                    "the lantern's mouth only: CLOSED, a small worried closed mouth (a short wavy line), no open mouth, the same paper colour where the open mouth was"),
 'ghosts_base': ("the ghosts'", "ALL FIVE eyes of the three little ghosts (the umbrella yokai's one big eye, the white ghost's two eyes, the blue wisp's two eyes): closed in a soft blink (a curved closed eyelid line with lashes, no iris, no white of the eye visible), each in its own place and size", None),
 'yurari_base': ("her", "BOTH of her eyes: FULLY closed in a natural soft blink (upper eyelids all the way down, lashes visible, no iris visible, same skin); her white bangs stay exactly as they are", None),
 'yurari_ear': ("her", "BOTH of her eyes: FULLY closed in a natural soft blink (upper eyelids all the way down, lashes visible, no iris visible, same skin); her white bangs stay exactly as they are", None),
 'yurari_happy': ("her", "BOTH of her eyes: FULLY closed in a natural soft blink (upper eyelids all the way down, lashes visible, no iris visible, same skin); her white bangs stay exactly as they are", None),
}
ell = lambda es: ";".join(",".join(str(v) for v in e) for e in es)
for pose, (_, blink, quiet) in WHO.items():
    f = FP[pose]
    P[pose + '_blink'] = {"ref": pose, "prompt": KEEP.format(what=blink), "mask": ell(f["eyes"]), "composite": True}
    if quiet:
        m = f["mouth"]; P[pose + '_quiet'] = {"ref": pose, "prompt": KEEP.format(what=quiet), "mask": ell([[m[0], m[1], round(m[2] * 1.2), round(m[3] * 1.2)]]), "composite": True}
json.dump(P, open(WP + '.tmp', 'w'), ensure_ascii=False, indent=1); os.replace(WP + '.tmp', WP)
print(sorted(k for k in P if k.endswith(('_blink', '_quiet'))))
