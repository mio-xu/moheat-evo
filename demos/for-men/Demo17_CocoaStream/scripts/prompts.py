#!/usr/bin/env python3
"""Demo36 Cocoa, Valentine's Eve — prompts for the layered art (DEMO_DESIGN_GUIDE §6 标准制作流程) → project/web_prompts.json for
tools/openai/images.py. Reference: her stream art (Demo14 cocoa_live, copied to assets/art/web/d17_cocoa_live.jpg). The first pose
(cocoa_welcome) becomes the character reference for every other pose. Poses on chroma green (#00B140, "matte": "green"); mouth / blink
variants are masked edits from project/face_points.json (measured on each pose). Run: python3 scripts/prompts.py"""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STYLE = ("Art style EXACTLY like image 1: soft modern cel animation, thin coloured lineart (warm dark brown instead of black), flat colours "
         "with one soft-edged but still flat shadow tone, a warm cosy palette. Hand-drawn feel, NOT glossy, no bloom. Realistic adult "
         "proportions (not chibi), 7 heads tall.")
LOOK = ("Cocoa, 22: the exact young woman from image 1 — long fluffy wavy chestnut-brown hair, cream ribbons tied in it at both sides, a "
        "small cream beret, warm pink eyes, a gentle sweet face. Tonight she wears a cream-and-pink frilly blouse with a big soft collar "
        "and a pink patisserie apron with a small heart pocket over it, sleeves pushed up a little.")
PLAIN = ("Plain flat CHROMA-KEY GREEN background (#00B140), one even colour, completely empty: no scenery, no counter, no floor line, no "
         "shadow and no gradient on the background, no green anywhere on her or her props.")
LIGHT = {"shop": "Lighting on her: warm golden shop light from above and a soft orange glow from the oven on the RIGHT side of the picture.",
         "window": "Lighting on her: warm golden lamp light from above, a faint cool blue snow-light from the window behind her."}
END = "Wide 16:9 game scene. No text, no logo, no watermark, no speech bubbles, no UI, no readable writing anywhere."
EDIT = ("Edit this exact image. Keep EVERYTHING identical — same pose, hands, framing, size, position, hair strands, clothes, colours, "
        "lighting and background — and change ONLY {what}. Do not move, zoom or crop the picture.")
MOUTH = "her mouth: slightly open as if talking softly, a small natural opening, no teeth showing"
BLINK = "BOTH of her eyes: FULLY closed in a natural soft blink (upper eyelids all the way down on both eyes, lashes visible, no iris showing); her bangs stay exactly as they are"
SHOP = ("A small cosy patisserie at night after closing, seen from a stool at its marble work counter (first person, eye level of a seated "
        "person). The counter top runs across the bottom of the picture. On the RIGHT: a stainless built-in oven in a brick wall, its window "
        "glowing orange. On the LEFT: the tall stainless door of a walk-in fridge. Behind, in the middle: glass shelves of jars and a wall "
        "clock, and the shop's front window and glass door with a pink awning seen from inside, snow falling outside in the dark blue night, "
        "warm pendant lamps, a few heart garlands. The centre of the picture is open (a person will stand behind the counter later).")
POSES = {   # name: (bg, pose text)
    'welcome': ('shop', "She stands behind the counter, centre-right, from the waist up, one hand raised in a happy little wave, the other holding "
                        "a cream dishcloth, head tilted, a sweet surprised-happy smile, cheeks pink. Mouth CLOSED."),
    'melt': ('shop', "She leans over the counter toward the viewer, centre, from the chest up and bigger in the frame, holding a small silver spoon "
                     "of melted chocolate out toward the viewer's mouth with her right hand, her left hand cupped under it, a sweet teasing smile. "
                     "A small steel bowl over a pot (bain-marie) on the counter in front of her, faint steam. Mouth CLOSED."),
    'whisk': ('shop', "First-person, very close: she stands right beside and slightly behind the viewer on the viewer's RIGHT, leaning in over the "
                      "viewer's right shoulder, so only her head and shoulder are in the picture, LARGE, at the RIGHT edge (cut by the right edge "
                      "of the frame), her face in three-quarter view turned toward the viewer's right ear and looking DOWN-LEFT at the bowl; a "
                      "lock of her wavy hair falling forward; her right hand and arm reach in from the right toward the bottom centre, where "
                      "a steel bowl of whipped cream and a whisk are (her hand over the viewer's hand on the whisk). Soft focused smile, light blush. "
                      "The left two-thirds of the picture stay empty green. Mouth CLOSED."),
    'cookie': ('shop', "She stands close across the counter, centre, from the chest up, holding a heart-shaped cookie between two fingers out toward "
                       "the viewer's mouth, her other hand under it, a playful 'say aah' smile, eyes bright. Mouth CLOSED."),
    'piping': ('shop', "Behind the counter, centre-left, from the waist up, she holds a pink piping bag over a big heart-shaped chocolate on a plate, "
                       "and covers it with her other hand so the viewer can't see, looking up at the viewer shyly, blushing. Mouth CLOSED."),
    'whisper': ('window', "An intimate extreme close-up: her face very near the viewer at the LEFT side of the picture, turned toward the viewer's "
                          "left ear, eyes half-closed, deep blush, a few wavy strands falling forward, the beret slightly tilted. Mouth CLOSED."),
    'ending': ('window', "By the shop window at night, centre-right, from the waist up, she holds a small heart-shaped chocolate box with a pink "
                         "ribbon at her chest with both hands, smiling warmly and a little teary-happy at the viewer, cheeks pink. Mouth CLOSED."),
}
BGS = {
    'shop': SHOP,
    'window': ("The same small patisserie at night, the corner by its front window: a big window with snow falling outside in the dark blue "
               "night and a street lamp, a small round café table with two cups, warm pendant lamp light, heart garland, a wall clock showing "
               "midnight on the left. Eye level of a seated person. The centre and right of the picture are open (a person will be placed there)."),
}
out = {"_doc": __doc__}
for b, t in BGS.items():
    out[f"bg_{b}"] = {"ref": "d17:cocoa_live", "prompt": "Image 1 is the ART STYLE reference only (do not draw her or her room). Same soft "
        "cel-animation style, thin coloured lineart, flat colours. Background plate only, NO people.\n\n" + t + "\n\nEmpty scene, no people. " + END}
for n, (b, t) in POSES.items():
    ref = "d17:cocoa_live" if n == "welcome" else ["cocoa_welcome", "d17:cocoa_live"]
    lead = ("Image 1 is the CHARACTER and STYLE reference: draw this exact young woman (face, eyes, hair, ribbons, beret)."
            if n == "welcome" else
            "Image 1 is the CHARACTER and STYLE reference: draw this exact young woman (face, eyes, hair, ribbons, beret, blouse, apron, "
            "lineart and colouring). Image 2 is an extra face reference.")
    out[f"cocoa_{n}"] = {"ref": ref, "prompt": lead + "\n\n" + STYLE + "\n\n" + LOOK + "\n\n" + t + "\n\n" + LIGHT[b] + "\n\n" + PLAIN + "\n\n" + END}
    out[f"cocoa_{n}_talk"] = {"ref": f"cocoa_{n}", "prompt": EDIT.format(what=MOUTH)}
    out[f"cocoa_{n}_blink"] = {"ref": f"cocoa_{n}", "prompt": EDIT.format(what=BLINK)}
FP = os.path.join(ROOT, "project/face_points.json")
if os.path.exists(FP):
    for v, f in json.load(open(FP)).items():
        out[f"cocoa_{v}_talk"]["mask"] = "{},{},{},{}".format(*f["mouth"])
        if "eyes" in f: out[f"cocoa_{v}_blink"]["mask"] = ";".join("{},{},{},{}".format(*e) for e in f["eyes"])
os.makedirs(os.path.join(ROOT, "project"), exist_ok=True)
json.dump(out, open(os.path.join(ROOT, "project/web_prompts.json"), "w"), ensure_ascii=False, indent=1)
print(len(out) - 1, "jobs")
