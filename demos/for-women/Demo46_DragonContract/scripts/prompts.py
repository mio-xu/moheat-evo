#!/usr/bin/env python3
"""Demo46 竜の王と、エルフの王と、小悪魔 — prompts for the layered art (DEMO_DESIGN_GUIDE §6, §6.5) → project/web_prompts.json for
tools/openai/images.py (Seedance API upload rate-limited 2026-11-09 → OpenAI per §5.3). Keeps the option jobs of scripts/design_options.py.

USER PICKS 2026-11-09: 陽向 C (plum page-boy butler, half-cape, tea tray, small horns + bat wings + devil tail), 岳 C (high-collar black
royal coat with green-silver embroidery, his own fringe over one eye, slim black horns, dragon tail, wings folded), 蓮 A (silver-white
robe + ice-crystal crown, long silver hair, elf ears). The options were drawn on #d8d8d8 → the bases are redrawn on the card screens:
陽向 / 蓮 chroma GREEN #00B140 ("matte": "green"), 岳 light grey #c8c8c8 (dark figure). Faces stay those of the options (= the
characters' lock faces). Mouths = LivePortrait sets; blinks = masked edits (project/face_points.json).
Run: python3 scripts/design_options.py && python3 scripts/prompts.py"""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WP = os.path.join(ROOT, 'project', 'web_prompts.json')
out = json.load(open(WP)) if os.path.exists(WP) else {}
out = {k: v for k, v in out.items() if k.startswith('opt_')}; out['_doc'] = __doc__

STYLE = ("Art style EXACTLY like image 1: soft modern anime illustration, thin coloured lineart, soft cel shading with one soft-edged shadow "
         "layer, romantic otome-game card quality, not glossy, no bloom, not realistic, not 3D. Realistic adult proportions (7.5 heads). He is "
         "EXTREMELY handsome: idol-level face, clear jawline, long lashes, no stubble. A storybook Western-fantasy world: nothing modern, "
         "no glasses, no earbuds.")
CHAR = {
    'hinata': ("Hinata (the little-devil butler): fluffy messy soft PINK hair with long bangs, warm amber eyes, a sly sweet smile with a tiny "
               "fang, a small silver star stud earring; a plum velvet page-boy butler outfit (short jacket, bow tie, knee breeches, white "
               "stockings), a short black half-cape, tiny black horns in the pink fluff, small round bat wings, a thin devil tail."),
    'gaku': ("Gaku (the Black Dragon King): sleek black hair with a FRINGE falling across one eye and a hidden DEEP-GREEN inner colour, cool "
             "dark long-lashed eyes, a calm quiet face; a long high-collared black royal coat with green-silver embroidery, black gloves, slim "
             "black horns curving back, a black dragon tail, black dragon wings folded like a cape."),
    'ren': ("Ren (the Elf King of the snow forest): long straight silver-white hair, pale lavender-grey eyes, a gentle slightly shy face, "
            "long pointed elf ears, a small silver ear cuff; a long silver-white robe with pale-blue embroidery and a light cape, a crown of "
            "clear ice crystals."),
}
PICK = {'hinata': 'opt_hinata_c', 'gaku': 'opt_gaku_c', 'ren': 'opt_ren_a'}
SCREEN = {'hinata': ('GREEN', '#00B140', 'no green anywhere on him'), 'gaku': ('LIGHT GREY', '#c8c8c8', 'no grey haze around him'),
          'ren': ('GREEN', '#00B140', 'no green anywhere on him')}
LIGHT = {'hinata': "Lighting on him: warm firelight from the RIGHT of the picture, cool window light from the LEFT.",
         'gaku': "Lighting on him: cold dusk light from the LEFT, a warm orange glow from a fire ahead (front).",
         'ren': "Lighting on him: cool moonlight and soft green-violet aurora light from above, pale and glowing."}


def plain(c):
    n, hexv, no = SCREEN[c]
    return (f"Plain flat {n} background ({hexv}), one even colour, completely empty: no scenery, no floor line, no shadow, no gradient, {no}. "
            "His whole head, horns / ears and hair inside the frame with space above; shoulders, arms and elbows not cut by the left or right "
            "picture edge. ONLY the character: no furniture, no fire, no other people, no other hands.")


END = "Wide 16:9 game art. No text, no letters, no captions, no logo, no watermark, no speech bubbles, no UI, no readable writing anywhere."
EDIT = ("Edit this exact image. Keep EVERYTHING identical — same pose, hands, framing, size, position, hair strands, clothes, colours, "
        "lighting and background — and change ONLY {what}. Do not move, zoom or crop the picture.")
BLINK = ("BOTH of his eyes: FULLY closed in a natural soft blink (upper eyelids all the way down on both eyes, lashes visible, no iris "
         "visible, same skin tone and lighting); his bangs stay exactly as they are")
PLATE = ("Image 1 is the ART STYLE reference only (do not draw him). Same soft anime cel style, thin coloured lineart. Background plate only, "
         "NO people, empty scene.\n\n")
WORLD_BG = "A storybook Western-fantasy world (invented): stone, oak, velvet, brass, candles, snow forests; nothing modern, no readable writing."
BGS = {
    'bg_study': ("A small old study at night where a devil's contract was opened, seen from a person sitting in a leather armchair (first "
                 "person, eye level): on the LEFT a tall arched window with frost patterns and blue snowy night outside, on the RIGHT a stone "
                 "fireplace with a real crackling fire, shelves of old books, candles, a writing desk with an old open book glowing faintly "
                 "purple (no readable writing), a small round tea table in the lower foreground with a silver teapot. Warm right, cool left. "
                 "The centre is open (a person will stand there later)."),
    'bg_valley': ("The edge of a cliff high in a dragon valley at dusk, seen at the eye level of a person standing on the cliff (first person): "
                  "a deep rocky valley with mist, jagged dark mountains, snow on the peaks, wind streaming from the LEFT (blown snow and torn "
                  "clouds moving left to right), a tall old STONE BEACON TOWER with an unlit iron fire basket a few metres AHEAD in the middle "
                  "of the picture, a violet-orange dusk sky. Wide, cold and windy. The lower centre is open (a person will stand there later)."),
    'bg_lake': ("A frozen lake in a snowy elf forest at night, seen at the eye level of a person standing on the ice (first person): clear "
                "dark ice with stars visible under it, tall snow-covered silver birches and pines around the shore, a green and violet aurora "
                "across the sky, a faint path of footprints coming across the ice from the far RIGHT. Quiet, cold, magical. The centre is "
                "open (a person will stand there later)."),
}
DAWN = ("Edit this exact image: the same study and camera, but it is now DAWN — pink-gold sunlight streams through the frosted window on the "
        "LEFT, the fire on the right has burned down to glowing embers, the old book on the desk glows softly gold (a return gate, no "
        "letters). Keep layout, style and colours otherwise identical. No people.")
POSES = {
    'hinata_ear': ('hinata', "An intimate close-up: he leans in very near the viewer from the RIGHT, his face in the RIGHT THIRD of the picture, "
                   "his head tilted toward the picture's centre as he brings his lips to the viewer's right ear, face in three-quarter view, a "
                   "sly dark-sweet smile with closed lips, amber eyes sideways at the viewer; his hands low near the bottom edge. Nothing "
                   "across his face. Mouth CLOSED."),
    'gaku_wing': ('gaku', "An intimate close-up: he stands very near the viewer on the LEFT, his face in the LEFT THIRD of the picture, turned "
                  "toward the picture's centre as he speaks into the viewer's left ear; his huge black dragon wing curves around from behind "
                  "him across the left side of the picture like a sheltering cloak, the thin inner wing membrane glowing faintly warm ORANGE "
                  "from inside; calm gentle eyes, the fringe over one eye. Nothing across his face. Mouth CLOSED."),
    'ren_ear': ('ren', "An intimate close-up: he leans in very near the viewer from the RIGHT, his face in the RIGHT THIRD of the picture, his "
                "head tilted toward the picture's centre as if softly singing into the viewer's right ear, face in three-quarter view, shy "
                "gentle eyes half-lowered, a soft smile; the ice crown and long silver hair, pointed ear visible. Nothing across his face. "
                "Mouth CLOSED."),
}
for c in CHAR:
    out[f"{c}_base"] = {"ref": [PICK[c], f"ref_{c}_close"], "prompt": "\n\n".join([
        "Image 1 is the exact CHARACTER DESIGN to keep (same face, eyes, hair, outfit, pose, proportions); image 2 is his face reference. "
        "Redraw image 1 at full quality, closer, on a different plain background.", STYLE, CHAR[c],
        "Same pose as image 1 but framed CLOSER: from the thighs up, the figure large in the frame (his head about one sixth of the picture height), centred, at eye level, looking at the viewer, wings / tail / cape may be cut by the bottom edge only. Mouth CLOSED.",
        LIGHT[c], plain(c), END])}
    out[f"{c}_base_blink"] = {"ref": f"{c}_base", "prompt": EDIT.format(what=BLINK)}
for n, (c, pose) in POSES.items():
    out[n] = {"ref": [f"{c}_base", f"ref_{c}_close"], "prompt": "\n\n".join([
        "Image 1 is the CHARACTER and STYLE reference: draw this exact man (face, eyes, hair, outfit, horns / ears, lineart and colouring) — "
        "the same man, not more realistic. Image 2 is an extra face reference.", STYLE, CHAR[c], pose, LIGHT[c], plain(c), END])}
    out[f"{n}_blink"] = {"ref": n, "prompt": EDIT.format(what=BLINK)}
out["bg_study"] = {"ref": "ref_hinata", "prompt": PLATE + WORLD_BG + "\n\n" + BGS['bg_study'] + "\n\n" + END}
out["bg_valley"] = {"ref": "ref_gaku", "prompt": PLATE + WORLD_BG + "\n\n" + BGS['bg_valley'] + "\n\n" + END}
out["bg_lake"] = {"ref": "ref_ren", "prompt": PLATE + WORLD_BG + "\n\n" + BGS['bg_lake'] + "\n\n" + END}
out["bg_dawn"] = {"ref": "bg_study", "prompt": DAWN + "\n\n" + END}
out["cover_art"] = {"ref": ["gaku_base", "ren_base", "hinata_base"], "prompt": "\n\n".join([
    "Images 1, 2 and 3 are the CHARACTER and STYLE references: draw these exact three young men (Image 1 Gaku the dragon king, Image 2 Ren "
    "the elf king, Image 3 Hinata the little-devil butler) with the same faces, hair, outfits, horns, ears and wings. " + STYLE,
    "A striking romantic cover illustration at night on a frozen lake under a green-violet aurora: the three stand close together, seen from "
    "the waist up, filling the RIGHT two-thirds of the picture, all looking at the viewer — Gaku in the middle with one black dragon wing "
    "half-open behind the group, its inner membrane glowing warm ORANGE; Ren on the right with his ice-crystal crown and a few floating "
    "BLUE-WHITE snow crystals; Hinata on the left, smiling slyly, a tiny cute bat familiar on his shoulder. The LEFT third is calm dark sky "
    "and snowy forest (space for a title). Faces large and clear, full heads, horns and crown inside the frame.", END])}
# hinata_base came out with an open grin (teeth): a masked edit closes it into his sly closed-lip smile with the tiny fang; that becomes the base
out["hinata_base_closed"] = {"ref": "hinata_base", "mask": "1300,392,58,34", "prompt": EDIT.format(what="his mouth only: a sly CLOSED-lip smile (lips together, no teeth showing except the tiny fang at one corner)")}
FP = os.path.join(ROOT, "project/face_points.json")
if os.path.exists(FP):
    for v, f in json.load(open(FP)).items():
        if f"{v}_blink" in out and "eyes" in f: out[f"{v}_blink"]["mask"] = ";".join("{},{},{},{}".format(*e) for e in f["eyes"])
json.dump(out, open(WP, "w"), ensure_ascii=False, indent=1)
print(len(out) - 1, "jobs")
