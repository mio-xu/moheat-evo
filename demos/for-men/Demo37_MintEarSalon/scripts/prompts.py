#!/usr/bin/env python3
"""Demo37 Mint's ear salon (the one live stream, new form) — prompts for the layered art (DEMO_DESIGN_GUIDE §6) → project/web_prompts.json
for tools/openai/images.py. Reference: her stream art (Demo14 mint_live → assets/art/web/d14_mint_live.jpg). The first pose (mint_greet)
becomes the character reference. She has mint-GREEN hair, so the poses are on chroma MAGENTA (#FF00FF) here and the
build uses "matte": "magenta" (build_stage). Mouth / blink variants: masked edits from project/face_points.json. Run: python3 scripts/prompts.py"""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STYLE = ("Art style EXACTLY like image 1: soft modern cel animation, thin coloured lineart (dark teal-grey instead of black), flat colours "
         "with one soft-edged but still flat shadow tone, a calm night palette. Hand-drawn feel, NOT glossy, no bloom. Realistic adult "
         "proportions (not chibi), 7 heads tall.")
LOOK = ("Mint, 20: the exact young woman from image 1 — long silky mint-green hair fading to white at the tips, a thin low side braid, sleepy "
        "pale aqua eyes, a small star hair clip; an oversized white cable-knit cardigan over a pale blue camisole, and tonight a small mint "
        "salon apron over it.")
PLAIN = ("Plain flat CHROMA-KEY MAGENTA background (#FF00FF), one even colour, completely empty: no scenery, no chair, no floor line, no "
         "shadow and no gradient on the background, no magenta or pink anywhere on her or her props.")
LIGHT = "Lighting on her: a soft warm lamp from the upper left and a cool teal glow from the right, calm night light."
END = "Wide 16:9 game scene. No text, no logo, no watermark, no speech bubbles, no UI, no readable writing anywhere."
EDIT = ("Edit this exact image. Keep EVERYTHING identical — same pose, hands, framing, size, position, hair strands, clothes, colours, "
        "lighting and background — and change ONLY {what}. Do not move, zoom or crop the picture.")
MOUTH = "her mouth: slightly open as if whispering softly, a small natural opening, no teeth showing"
BLINK = ("BOTH of her eyes: FULLY closed in a natural soft blink (upper eyelids all the way down on both eyes, lashes visible, no iris "
         "showing); her bangs stay exactly as they are")
SALON = ("Her little 'ear salon' live-stream set at night, seen from the head of a cushioned reclining chair (first person, the viewer lies "
         "back slightly, eye level a little low): a white towel warmer with a small green light and a tiny steam kettle on a shelf on the "
         "left, a warm paper lamp, glass jars of cotton swabs and bamboo ear picks, a small potted mint plant, sheer curtains with a "
         "teal aquarium-like night glow on the right, fairy lights, a soft rug. The centre of the picture is open (a person will be placed "
         "there later, seated beside the chair).")
POSES = {   # name: pose text (all with the salon plate)
    'greet': "She sits just beside the chair, centre, from the waist up, leaning a little toward the viewer, one hand raised in a small "
             "sleepy wave by her cheek, a soft drowsy smile, eyes half-lidded but open. Mouth CLOSED.",
    'towel': "She sits close, centre, chest up, holding a folded white steamed towel in both hands with soft steam rising from it, about to "
             "lay it over the viewer's ears, gentle smile. Mouth CLOSED.",
    'spoon': "She sits close, centre-right, chest up, holding a small chilled silver spoon (a little frost on it) up near her cheek between "
             "two fingers with a playful sleepy smile, head tilted. Mouth CLOSED.",
    'earL': "Very close: she leans in toward the viewer's LEFT ear, so her face is large at the LEFT side of the picture in three-quarter "
            "view, eyes looking down-right at the ear, a bamboo ear pick with a white fluffy bonten in her right hand near the picture's "
            "left edge, her other hand cupped softly; calm focused expression, faint blush. The right half of the picture stays empty. Mouth CLOSED.",
    'earR': "Very close: she leans in toward the viewer's RIGHT ear, so her face is large at the RIGHT side of the picture in three-quarter "
            "view, eyes looking down-left at the ear, a bamboo ear pick with a white fluffy bonten in her hand near the picture's right "
            "edge, her other hand cupped softly; calm focused expression, faint blush. The left half of the picture stays empty. Mouth CLOSED.",
    'lullaby': "She sits beside the chair, centre-left, chest up, hands folded at her chest, head tilted, eyes half closed, humming softly "
               "with a tender sleepy smile. Mouth CLOSED.",
    'goodnight': "An intimate close-up: she leans over the viewer, face large in the centre, a soft mint blanket edge in her hands near the "
                 "bottom of the picture as she tucks it in, eyes gentle and half-lidded, a very soft smile. Mouth CLOSED.",
}
out = {"_doc": __doc__}
out["bg_salon"] = {"ref": "d14:mint_live", "prompt": "Image 1 is the ART STYLE reference only (do not draw her or her room). Same soft "
    "cel-animation style, thin coloured lineart, flat colours. Background plate only, NO people.\n\n" + SALON + "\n\nEmpty scene, no people. " + END}
for n, t in POSES.items():
    ref = "d14:mint_live" if n == "greet" else ["mint_greet", "d14:mint_live"]
    lead = ("Image 1 is the CHARACTER and STYLE reference: draw this exact young woman (face, eyes, hair, braid, star clip)." if n == "greet" else
            "Image 1 is the CHARACTER and STYLE reference: draw this exact young woman (face, eyes, hair, braid, star clip, cardigan, apron, "
            "lineart and colouring). Image 2 is an extra face reference.")
    out[f"mint_{n}"] = {"ref": ref, "prompt": lead + "\n\n" + STYLE + "\n\n" + LOOK + "\n\n" + t + "\n\n" + LIGHT + "\n\n" + PLAIN + "\n\n" + END}
    out[f"mint_{n}_talk"] = {"ref": f"mint_{n}", "prompt": EDIT.format(what=MOUTH)}
    out[f"mint_{n}_blink"] = {"ref": f"mint_{n}", "prompt": EDIT.format(what=BLINK)}
FP = os.path.join(ROOT, "project/face_points.json")
if os.path.exists(FP):
    for v, f in json.load(open(FP)).items():
        out[f"mint_{v}_talk"]["mask"] = "{},{},{},{}".format(*f["mouth"])
        if "eyes" in f: out[f"mint_{v}_blink"]["mask"] = ";".join("{},{},{},{}".format(*e) for e in f["eyes"])
json.dump(out, open(os.path.join(ROOT, "project/web_prompts.json"), "w"), ensure_ascii=False, indent=1)
print(len(out) - 1, "jobs")
