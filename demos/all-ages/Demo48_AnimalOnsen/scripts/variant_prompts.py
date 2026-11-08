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
WHO = {   # pose → (who, blink wording, quiet wording)
 'yuzujii_base': ("his", "BOTH of the capybara's sleepy half-closed eyes: now FULLY closed — each becomes one thin, gently curved closed-lid line with a few lashes (no dark eye showing at all), same place and length, same fur around them", None),
 'penguin_base': ("its", "BOTH of the penguin chick's eyes: FULLY closed in a soft blink (a curved closed eyelid line with lashes on each eye, no iris, no white of the eye visible), same fur around them. Nothing of the open eye remains: no eye outline, no arc, no grey shadow above or around the closed lid — just the plain white face feathers and one curved closed-lid line with lashes per eye", None),
 'monkeys_base': ("their", "ALL FOUR eyes (the mother monkey's two and the child monkey's two): FULLY closed in a soft blink (a curved closed eyelid line with lashes on each eye, no iris, no white of the eye visible), each in its own place and size", None),
 'fox_base2': ("its", "BOTH of its eyes: FULLY closed in a soft blink (a curved closed eyelid line with lashes on each eye, no iris, no white of the eye visible), same fur around them", None),
}
ell = lambda es: ";".join(",".join(str(v) for v in e) for e in es)
for pose, (_, blink, quiet) in WHO.items():
    f = FP[pose]
    P[pose + '_blink'] = {"ref": pose, "prompt": KEEP.format(what=blink), "mask": ell(f["eyes"]), "composite": True}
    if quiet:
        m = f["mouth"]; P[pose + '_quiet'] = {"ref": pose, "prompt": KEEP.format(what=quiet), "mask": ell([[m[0], m[1], round(m[2] * 1.2), round(m[3] * 1.2)]]), "composite": True}
json.dump(P, open(WP + '.tmp', 'w'), ensure_ascii=False, indent=1); os.replace(WP + '.tmp', WP)
print(sorted(k for k in P if k.endswith(('_blink', '_quiet'))))
