#!/usr/bin/env python3
"""Demo39 Luna, the secret bartender — prompts for the layered art (DEMO_DESIGN_GUIDE §6 标准制作流程) → project/web_prompts.json for
tools/openai/images.py. Character reference: her stream art from Demo14 (copied before Demo14 was replaced: assets/ref/luna_*.png →
assets/art/ref_luna.png / ref_luna_close.png). The first pose (luna_counter) becomes the character reference for every other pose.
Poses on chroma green (#00B140, "matte": "green": black hair with deep-blue streaks, white shirt, black vest — nothing green on her);
mouth / blink variants are masked edits from project/face_points.json (measured on each pose). Run: python3 scripts/prompts.py"""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STYLE = ("Art style EXACTLY like image 1: modern anime cel illustration, thin dark lineart, flat colours with one soft-edged but still flat "
         "shadow tone, a cool night palette. Hand-drawn feel, NOT glossy, no bloom, not realistic. Realistic adult proportions (not chibi), "
         "about 7 heads tall, a beautiful mature adult face.")
LOOK = ("Luna, 25: the exact young woman from image 1 — long straight black hair falling past her shoulders with deep-blue inner streaks "
        "(visible on the strands under her hair on one side), dark sapphire-blue eyes with long lashes, a cool mature face with a faint "
        "teasing smile, a thin black choker on her neck, a small silver crescent-moon earring. Tonight she is a bartender: a crisp white "
        "shirt with the sleeves rolled up to the elbows and the top button open, a fitted black waistcoat (vest) over it, no tie, no jacket.")
PLAIN = ("Plain flat CHROMA-KEY GREEN background (#00B140), one even colour, completely empty: no scenery, no bar counter, no bottles, no "
         "floor line, no shadow and no gradient on the background, no green anywhere on her or her props. Her whole head and hair inside "
         "the frame with space above; her shoulders and arms not cut by the left or right picture edge.")
LIGHT = {"bar": "Lighting on her: warm amber light from the lamps above the bar, a faint cool blue rim light from the LEFT side of the picture.",
         "dim": "Lighting on her: the bar lights are dimmed; she is lit mostly from below by a soft cool BLUE glow (the blue flame in her hand), a faint amber rim from above.",
         "seat": "Lighting on her: warm amber light from the lamps above the counter, a faint cool blue light from the RIGHT side of the picture (the door)."}
END = "Wide 16:9 game scene. No text, no logo, no watermark, no speech bubbles, no UI, no readable writing anywhere."
EDIT = ("Edit this exact image. Keep EVERYTHING identical — same pose, hands, framing, size, position, hair strands, clothes, colours, "
        "lighting and background — and change ONLY {what}. Do not move, zoom or crop the picture.")
MOUTH = "her mouth: slightly open as if talking softly, a small natural opening, no teeth showing"
BLINK = "BOTH of her eyes: FULLY closed in a natural soft blink (upper eyelids all the way down on both eyes, lashes visible, no iris showing); her bangs stay exactly as they are"
BAR = ("A small hidden basement cocktail bar late at night after last orders, seen from a bar stool at the counter (first person, eye level of "
       "a seated person). A dark polished wooden bar counter runs across the bottom of the picture. Behind it, in the middle: a back bar "
       "of softly back-lit glass shelves with rows of bottles (no labels, no readable writing), a few hanging brass lamps with warm amber "
       "light. On the LEFT: the foot of a narrow stone staircase and a heavy wooden door with a small window, cold blue rainy night "
       "light from outside, a wet umbrella stand. On the RIGHT: an old glowing jukebox with soft coloured light. Moody, quiet, intimate. "
       "The centre of the picture behind the counter is open (a person will stand there later).")
SEAT = ("The same small basement bar late at night, seen from your bar stool turned to the LEFT, toward the empty stool next to you: the "
        "end of the dark wooden counter on the right side of the picture with a small candle, the next bar stool (empty) in the centre, "
        "behind it the bottom of the stone staircase and the wooden door with cold blue rainy light through its small window (towards the "
        "RIGHT background), warm amber lamps, back-lit bottle shelves blurred on the left. Eye level of a seated person, intimate, "
        "close. The centre of the picture is open (a person will sit there later).")
POSES = {   # name: (light, pose text)
    'counter': ('bar', "She stands behind the bar counter, centre, from the waist up, polishing a short crystal glass with a white cloth at "
                       "chest height, looking at the viewer with a quiet, knowing half-smile, head slightly tilted. Mouth CLOSED."),
    'shake': ('bar', "She stands behind the bar, centre, from the waist up, shaking a silver cocktail shaker with both hands beside her RIGHT "
                     "shoulder (picture left), elbows out, her long hair swinging a little, eyes on the viewer with a playful smile. The "
                     "shaker stays below her chin and away from her face. Mouth CLOSED."),
    'lean': ('bar', "She leans across the counter toward the viewer, centre, from the chest up and larger in the frame, her left arm stretched "
                    "out toward the RIGHT edge of the picture holding a frosted silver shaker at cheek height, as if pressing it to the "
                    "viewer's right cheek (the shaker far from her own face); her other forearm rests on the counter; a teasing sideways "
                    "smile, eyes half-lidded. Mouth CLOSED."),
    'flame': ('dim', "Behind the counter, centre, from the waist up, the lights dimmed: she holds a small stemmed cocktail glass at chest "
                     "height in one hand, a gentle pale-blue flame dancing on top of the drink, and looks at the viewer over the flame, "
                     "soft serious eyes, the blue glow lighting her chin and face from below. Mouth CLOSED."),
    'sit': ('seat', "She sits on the bar stool next to the viewer (on the viewer's left), centre of the picture, her body in three-quarter "
                    "view turned toward the viewer, from the waist up, close; she holds a warm Irish coffee in a stemmed glass mug (dark "
                    "coffee, white cream on top) in both hands at chest height, offering it toward the viewer, a relaxed off-duty smile; "
                    "her waistcoat unbuttoned. Mouth CLOSED."),
    'whisper': ('seat', "An intimate extreme close-up: her face very near the viewer at the LEFT side of the picture, leaning in toward the "
                        "viewer's left ear, her face in three-quarter view, eyes half-closed, a faint blush, a few straight black strands "
                        "with deep-blue streaks falling forward, the crescent earring visible; her waistcoat unbuttoned. Mouth CLOSED."),
}
out = {"_doc": __doc__}
PLATE = ("Image 1 is the ART STYLE reference only (do not draw her or her room). Same anime cel style, thin lineart, flat colours. "
         "Background plate only, NO people.\n\n")
out["bg_bar"] = {"ref": "ref_luna", "prompt": PLATE + BAR + "\n\nEmpty scene, no people. " + END}
out["bg_seat"] = {"ref": ["ref_luna", "bg_bar"], "prompt": PLATE.replace("Background plate only", "Image 2 is the bar itself: keep its "
                  "materials, colours and light. Background plate only") + SEAT + "\n\nEmpty scene, no people. " + END}
for n, (b, t) in POSES.items():
    ref = ["ref_luna", "ref_luna_close"] if n == "counter" else ["luna_counter", "ref_luna_close"]
    lead = ("Image 1 is the CHARACTER and STYLE reference: draw this exact young woman (face, eyes, hair, blue streaks, choker, earring). "
            "Image 2 is the same woman closer (face reference)." if n == "counter" else
            "Image 1 is the CHARACTER and STYLE reference: draw this exact young woman (face, eyes, hair with deep-blue streaks, choker, "
            "earring, white shirt, black waistcoat, lineart and colouring) — the same person, the same art style, not more realistic. "
            "Image 2 is an extra face reference.")
    out[f"luna_{n}"] = {"ref": ref, "prompt": lead + "\n\n" + STYLE + "\n\n" + LOOK + "\n\n" + t + "\n\n" + LIGHT[b] + "\n\n" + PLAIN + "\n\n" + END}
    out[f"luna_{n}_talk"] = {"ref": f"luna_{n}", "prompt": EDIT.format(what=MOUTH)}
    out[f"luna_{n}_blink"] = {"ref": f"luna_{n}", "prompt": EDIT.format(what=BLINK)}
FP = os.path.join(ROOT, "project/face_points.json")
if os.path.exists(FP):
    for v, f in json.load(open(FP)).items():
        out[f"luna_{v}_talk"]["mask"] = "{},{},{},{}".format(*f["mouth"])
        if "eyes" in f: out[f"luna_{v}_blink"]["mask"] = ";".join("{},{},{},{}".format(*e) for e in f["eyes"])
json.dump(out, open(os.path.join(ROOT, "project/web_prompts.json"), "w"), ensure_ascii=False, indent=1)
print(len(out) - 1, "jobs")
