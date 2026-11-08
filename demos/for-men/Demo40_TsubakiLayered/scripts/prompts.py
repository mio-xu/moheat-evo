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
# Light character (silver hair, white furisode) → DARK grey plain background (guide §6: #404040) + "matte": "ai" in stage.json.
PLAIN = ("Plain flat DARK-GREY studio background (#404040), completely empty: no scenery, no snow, no floor line, no shadow on the "
         "background. Keep the same lighting on her as in image 1 (warm lantern light, cool night fill).")
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
    out[f"tsubaki_{v}"] = {"ref": f"d25:{v}", "prompt": "Image 1 is the CHARACTER, POSE and STYLE reference: redraw the same young woman in "
        "the same pose, size and position in the frame, same art style.\n\n" + STYLE + "\n\n" + LOOK + "\n\nSame pose as image 1: "
        + pose_text(v) + " Mouth CLOSED (lips together) in the same expression; full figure as framed in image 1, nothing cut off "
        "that image 1 shows.\n\n" + PLAIN + "\n\n" + END}
    out[f"tsubaki_{v}_talk"] = {"ref": f"tsubaki_{v}", "prompt": EDIT.format(what=MOUTH)}
    if v != "pray":   # she prays with her eyes already closed
        out[f"tsubaki_{v}_blink"] = {"ref": f"tsubaki_{v}", "prompt": EDIT.format(what=BLINK)}
json.dump(out, open(os.path.join(ROOT, "project/web_prompts.json"), "w"), ensure_ascii=False, indent=1)
print(len(out) - 1, "jobs")
