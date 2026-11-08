#!/usr/bin/env python3
"""Demo25 (Tsubaki, Hatsumode date) redone the standard layered way (DEMO_DESIGN_GUIDE §6): story unchanged, art = empty plate +
plain-background pose + drawn mouth / blink variants per view. Writes project/web_prompts.json for tools/openai/images.py
(refs d25:<view> = Demo25's flat stills, copied to assets/art/web/d25_<view>.jpg). Run: python3 scripts/prompts.py"""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = json.load(open(os.path.join(ROOT, "../Demo25_HatsumodeDate/project/web_prompts.json")))
VIEWS = ["torii", "stall", "amazake", "fire", "close", "pray", "omikuji", "stole"]
STYLE = ("Art style EXACTLY like image 1: soft modern cel animation with a light, airy palette, thin coloured lineart (dark lavender "
         "instead of black), flat colours with one soft-edged but still flat shadow tone. Hand-drawn feel, NOT glossy, no bloom. "
         "Realistic adult proportions (not chibi).")
LOOK = ("Tsubaki: the exact young woman from image 1 — very long silver-white hair in a loose low side ponytail tied with a red-and-white "
        "braided cord, soft pink-red eyes, a small red camellia pin; a white furisode fading to crimson at the sleeves with red camellias, "
        "a gold obi, a white fur stole.")
END = "Wide 16:9 game scene. No text, no logo, no watermark, no speech bubbles, no UI, no readable writing anywhere."
# Light character with dark lineart (silver hair, white furisode, dark-lavender lines): neither grey works (light grey eats the white
# clothes, dark grey eats the lineart between hair strands — Demo40 first try) → flat chroma GREEN (no green anywhere on her).
PLAIN = ("Plain flat CHROMA-KEY GREEN background (#00B140), one even colour, completely empty: no scenery, no snow, no floor line, no "
         "shadow and no gradient on the background, no green on her. Keep the same lighting on her as in image 2 (warm lantern light, cool night fill).")
EDIT = ("Edit this exact image. Keep EVERYTHING identical — same pose, hands, framing, size, position, hair strands, clothes, colours, "
        "lighting and background — and change ONLY {what}. Do not move, zoom or crop the picture.")
MOUTH = "her mouth: slightly open as if talking softly, a small natural opening, no teeth showing"
BLINK = "her eyes: closed in a natural blink (eyelids down, lashes visible); her bangs stay exactly as they are"

def pose_text(v):
    p = SRC["tsubaki_" + v]; p = p if isinstance(p, str) else p["prompt"]
    return p.split("\n\n")[2]

out = {"_doc": __doc__}
for v in VIEWS:
    out[f"bg_{v}"] = {"ref": f"d25:{v}", "prompt": "Image 1 is the reference picture. Remove the young woman completely (and any hand or cup "
        "she holds) and fill the space with what is behind her — the same Japanese shrine on New Year's Eve night: snow, lanterns, navy sky, "
        "bokeh lights, distant crowd silhouettes — the same composition, colours, lighting and art style. Empty scene, no people.\n\n" + END}
    if v == "torii":   # the character reference itself: her torii pose, redrawn once on the green background
        out["tsubaki_torii"] = {"ref": "tsubaki_torii_grey", "prompt": "Edit this exact image. Keep the young woman EXACTLY as she is — same "
            "pose, hands, framing, size, position, face, hair strands, lineart, clothes and colours — and replace ONLY the dark grey background "
            "with a flat CHROMA-KEY GREEN (#00B140): one even colour everywhere around her and in every gap between her hair strands, no "
            "shadow, no gradient, no green on her. Do not move, zoom or crop the picture."}
        out["tsubaki_torii_talk"] = {"ref": "tsubaki_torii", "prompt": EDIT.format(what=MOUTH)}
        out["tsubaki_torii_blink"] = {"ref": "tsubaki_torii", "prompt": EDIT.format(what=BLINK)}
        continue
    out[f"tsubaki_{v}"] = {"ref": ["tsubaki_torii", f"d25:{v}"], "prompt": "Image 1 is the CHARACTER and STYLE reference: draw this exact young "
        "woman (face, hair, eyes, hair ornament, furisode, fur stole, lineart and colouring). Image 2 shows only the POSE, FRAMING and SCALE "
        "for this picture (its art style and her details there are older: follow image 1 for how she looks).\n\n" + STYLE + "\n\n" + LOOK + "\n\nSame pose as image 1: "
        + pose_text(v) + " Mouth CLOSED (lips together) in the same expression.\n\nSAME FRAMING AND SCALE as image 1: do NOT zoom out and do NOT "
        "draw more of her body than image 2 shows — her head, shoulders and hands are exactly where and as big as in image 2, cut by the "
        "picture edges in the same places. Leave out the viewer's hand / arm if image 2 has one.\n\n" + PLAIN + "\n\n" + END}
    if v == "torii": continue
    out[f"tsubaki_{v}_talk"] = {"ref": f"tsubaki_{v}", "prompt": EDIT.format(what=MOUTH)}
    if v != "pray":   # she prays with her eyes already closed
        out[f"tsubaki_{v}_blink"] = {"ref": f"tsubaki_{v}", "prompt": EDIT.format(what=BLINK)}
FP = os.path.join(ROOT, "project/face_points.json")   # measured mouth / eye ellipses → masked edits (only those may change)
if os.path.exists(FP):
    for v, f in json.load(open(FP)).items():
        out[f"tsubaki_{v}_talk"]["mask"] = "{},{},{},{}".format(*f["mouth"])
        if "eyes" in f: out[f"tsubaki_{v}_blink"]["mask"] = ";".join("{},{},{},{}".format(*e) for e in f["eyes"])
json.dump(out, open(os.path.join(ROOT, "project/web_prompts.json"), "w"), ensure_ascii=False, indent=1)
print(len(out) - 1, "jobs")
