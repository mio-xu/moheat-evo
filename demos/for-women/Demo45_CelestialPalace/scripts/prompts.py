#!/usr/bin/env python3
"""Demo45 月宫天女 (てんにょ様は、未来から · A Celestial from the Future) — prompts for the layered art (DEMO_DESIGN_GUIDE §6, §6.5) →
project/web_prompts.json for tools/openai/images.py (Seedance API upload probe 2026-11-09: 429, long Retry-After → OpenAI per §5.3).

Characters = special versions of three for-women leads (face, hair colour, personality, voice unchanged; outfit / hairstyle / identity
changed — docs/proposals/2026-11-08_crossover.md F1-East: an UNNAMED fictional East, 蒼月国・白露宮; no real dynasty markers).
References COPIED into assets/art/ (never linked): ref_jin (Demo21 jin_gaze = lock_face) + ref_jin_close (jin_sheet), ref_shion (Demo22
shion_door) + ref_shion_close (ref_shion = lock_face), ref_saku (Demo30 saku_ref = lock_face) + ref_saku_close (crop of ref_saku).
Step 1: two design options each (design_<c>_a / _b → project/designs_contact.jpg) → pick → <c>_base.png. Picks 2026-11-09 (prepro; team picks per the user's taste): Jin A (gold-dragon black robe, topknot + gold crown, long red hair), Shion B (lavender star-chart robe, half-up bun + silver hairstick, glasses = his anchor), Saku A (navy shadow-guard outfit, high ponytail, fox mask on the side of his head). Step 2: close poses reference
the pick; blinks = masked edits (face_points.json); mouths = LivePortrait sets (no talk variants).
Screens (character cards): Jin (dark, wine-red hair, black robe) light grey #c8c8c8; Shion (platinum hair, white robe) and Saku
chroma GREEN #00B140 ("matte": "green"). Style = for-women style card (style_3 soft cel, otome card finish, idol-handsome men).
Run: python3 scripts/prompts.py"""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

STYLE = ("Art style EXACTLY like image 1: soft modern anime illustration, thin coloured lineart, soft cel shading with one soft-edged shadow "
         "layer, romantic otome-game card quality, clean and calm, not glossy, no bloom, not realistic, not 3D. Realistic adult proportions "
         "(7.5 heads, not chibi). He is EXTREMELY handsome: an idol-level beautiful face, a clear jawline, long lashes, smooth fair skin, slim "
         "and tall with broad shoulders, no stubble.")
WORLD = ("He now lives in an imaginary East-Asian-flavoured palace kingdom of long ago (an invented country, NOT any real dynasty or era): "
         "flowing layered silk robes with wrap collars, wide sleeves, embroidered sashes, jade and gold ornaments. NOT a Japanese kimono, NOT "
         "a samurai, no Tang or Ming court hats, no queue, nothing modern (no zips, no glasses frames of metal unless asked, no headphones).")
SAME = ("Keep his FACE exactly as in images 1 and 2: the same eye shape, eye colour, eyebrows, nose, mouth, face shape and expression style "
        "— the same man, recognisable at once. Only his clothes and hairstyle change.")
CHAR = {
    'jin': ("Jin: the exact young man from images 1-2 — vivid wine-red / crimson hair, sharp golden eyes, a cocky confident face with a "
            "dangerous half-smile, fair skin. Identity: the crown prince of the realm, feared as a tyrant — domineering, blunt, protective."),
    'shion': ("Shion: the exact young man from images 1-2 — long platinum-blonde hair, calm grey-violet eyes, a small BEAUTY MARK under his "
              "RIGHT eye, an elegant gentle face with a mysterious smile, fair skin. Identity: the realm's imperial astrologer and strategist "
              "— polite, soft-spoken, dangerous under the courtesy."),
    'saku': ("Saku: the exact young man from images 1-2 — soft fluffy chestnut-brown hair, bright honey-brown eyes, a small MOLE under his "
             "LEFT eye, a playful teasing grin, fair skin. Identity: the crown prince's shadow guard — teasing in private, deadly serious "
             "when danger comes. His anchor: a white FOX MASK."),
}
DESIGNS = {
    'jin_a': ("Outfit A: a long black silk robe with GOLD DRAGON embroidery on the chest and sleeves, a wide black-and-gold sash with a "
              "white jade pendant, a crimson inner collar, wide sleeves. Hair A: his wine-red hair grown LONG, the upper half tied back in a "
              "small topknot held by a slim gold crown piece (the crown does not hide his red hair), the rest falling past his shoulders, "
              "messy red bangs."),
    'jin_b': ("Outfit B: a crimson-and-black brocade outer robe worn open and draped over his shoulders like a cape over a fitted black inner "
              "robe with gold edging, a gold-buckled belt, a gold arm guard on one forearm. Hair B: his wine-red hair long and loose to his "
              "shoulder blades, a thin gold circlet across his forehead under the red bangs."),
    'shion_a': ("Outfit A: a long white robe with layers of pale lavender and lilac at the collar and sleeves, silver star-pattern embroidery, "
                "a lavender sash with a jade tassel, a white crane-feather fan in one hand, a small round MONOCLE on a thin silver chain over "
                "his left eye (not over the beauty mark). Hair A: his platinum hair completely DOWN, long and straight to his waist, "
                "a white jade comb at the back, loose bangs."),
    'shion_b': ("Outfit B: a lavender outer robe embroidered with a silver star chart over a white inner robe, a dark violet sash, wide "
                "sleeves, a white crane-feather fan in one hand, thin round silver-rimmed glasses (his anchor). Hair B: platinum hair "
                "HALF-UP, wound into a small bun pierced with a silver hairstick, the rest long down his back."),
    'saku_a': ("Outfit A: a close-fitting dark navy shadow-guard outfit (wrap-collar jacket, belted), light dark-leather bracers, a short "
               "sheathed blade at his hip, a dark cloak over one shoulder; the white fox mask pushed up on the SIDE of his head. Hair A: "
               "his chestnut hair grown long enough for a short HIGH PONYTAIL, fluffy bangs and loose side strands, the mole visible."),
    'saku_b': ("Outfit B: a black short hooded cloak (hood DOWN) over a charcoal fitted outfit with dark red cords, leather bracers, a "
               "short blade on his back; the white fox mask hanging at his belt. Hair B: chestnut hair to the shoulders, tied LOW at the "
               "nape with a dark red cord, fluffy bangs, the mole visible."),
}
REFS = {'jin': ['ref_jin', 'ref_jin_close'], 'shion': ['ref_shion', 'ref_shion_close'], 'saku': ['ref_saku', 'ref_saku_close']}
SCREEN = {'jin': ('LIGHT GREY', '#c8c8c8', 'no grey haze around him'), 'shion': ('GREEN', '#00B140', 'no green anywhere on him'),
          'saku': ('GREEN', '#00B140', 'no green anywhere on him')}
LIGHT = {'jin': "Lighting on him: warm orange brazier light from the RIGHT of the picture, cool blue snowy window light from the LEFT.",
         'shion': "Lighting on him: cool silver moonlight from the LEFT of the picture, warm amber incense-burner glow from the RIGHT.",
         'saku': "Lighting on him: cool blue moonlight from above, a little warm lantern light from the front, soft."}
DESIGN_POSE = {
    'jin': "He stands facing the viewer, from the thighs up, centre, at eye level, arms crossed, chin slightly raised, a cocky possessive half-smile, looking straight at the viewer. Mouth CLOSED.",
    'shion': "He stands facing the viewer, from the thighs up, centre, at eye level, holding the feather fan loosely at chest height (below his chin), a gentle mysterious smile. Mouth CLOSED.",
    'saku': "He stands facing the viewer, from the thighs up, centre, at eye level, one hand on the hilt at his hip, a teasing grin with closed lips. Mouth CLOSED.",
}


def plain(c):
    n, hexv, no = SCREEN[c]
    return (f"Plain flat {n} background ({hexv}), one even colour, completely empty: no scenery, no floor line, no shadow and no gradient on "
            f"the background, {no}. His whole head and hair inside the frame with space above; his shoulders, arms and elbows not cut by the "
            "left or right picture edge (full figure inside the frame with margin at the sides). ONLY the character: no furniture, no "
            "brazier, no railing, no pillar, no other people, no other hands.")


END = "Wide 16:9 game art. No text, no letters, no captions, no logo, no watermark, no speech bubbles, no UI, no readable writing anywhere."
EDIT = ("Edit this exact image. Keep EVERYTHING identical — same pose, hands, framing, size, position, hair strands, clothes, colours, "
        "lighting and background — and change ONLY {what}. Do not move, zoom or crop the picture.")
BLINK = ("BOTH of his eyes: FULLY closed in a natural soft blink (upper eyelids all the way down on both eyes, lashes visible, no iris "
         "visible, same skin tone and lighting); his bangs stay exactly as they are")
PLATE = ("Image 1 is the ART STYLE reference only (do not draw him). Same soft anime cel style, thin coloured lineart. "
         "Background plate only, NO people, empty scene.\n\n")
WORLD_BG = ("An imaginary East-Asian-flavoured palace of long ago (invented, not a real dynasty): dark wood, vermilion pillars, white "
            "plaster, grey tiled roofs with curled eaves, silk lanterns, jade, bronze; no modern objects, no readable writing anywhere.")
BGS = {
    'bg_pond': ("A frozen lotus pond in the palace garden at night in winter, seen at the eye level of a person standing waist-deep at "
                "the pond's edge (first person): thin ice with a broken dark hole in the near centre, dry lotus stalks frozen in the ice, "
                "a curved stone bridge in the middle distance, palace halls with curled roofs and glowing silk lanterns behind, a huge pale "
                "blue moon, light snow falling. Cold blue night, warm lantern dots. The centre is open (a person will stand there later)."),
    'bg_chamber': ("The crown prince's private chamber at night, seen from a person sitting on a cushion on the floor (first person): dark "
                   "lacquered wood, black and gold silk hangings, on the LEFT a tall wooden lattice window with blue snowy night outside, on "
                   "the RIGHT a large bronze brazier full of glowing orange charcoal, a low black lacquer table in the foreground with a "
                   "small teapot, a folding screen with a painted dragon among clouds behind. Rich, dim, warm on the right, cool on the "
                   "left. The centre is open (a person will stand there later)."),
    'bg_terrace': ("A high open star-viewing terrace on top of the palace at night, seen from a person sitting at a low table (first "
                   "person): the LEFT side is wide open to the night sky with the wind blowing silk ribbons and pennants (no writing) to the "
                   "right, a huge starry sky with the Milky Way and a big moon; on the RIGHT a bronze incense burner on a stand with thin "
                   "curls of smoke and a warm amber glow, a large bronze armillary sphere; a low table with star charts (no readable "
                   "writing). Vast, cold blue on the left, small warm amber on the right. The centre is open (a person will sit there later)."),
    'bg_corridor': ("A long covered palace corridor at night, seen at the eye level of a person standing in a dark alcove between two "
                    "pillars (first person): vermilion pillars in a long row, a wooden railing, moonlight falling in stripes across the "
                    "floorboards, far down the corridor on the LEFT a few small warm torch lights, snow on the garden beyond the railing. "
                    "Quiet, tense, mostly cool blue and dark. The near right is open (a person will stand there later)."),
}
DAWN = ("Edit this exact image: the same pond and camera, but it is now DAWN — the sky glows soft pink and gold behind the palace roofs, "
        "the moon pale and fading, the ice on the pond melting in places with soft mist, the broken hole in the ice now glowing faintly with "
        "a pale golden ring of light (plain, no letters), the lanterns burned down. Keep layout, style and colours otherwise identical. No people.")
POSES = {
    'jin_ear': ('jin', "An intimate close-up: he leans in very near the viewer at the RIGHT side of the picture, toward the viewer's right "
                "cheek, face in three-quarter view, a possessive, softened half-smile, golden eyes on the viewer; one hand low near the "
                "bottom edge holds a small round bronze hand-warmer (a little warm glow) near the viewer's cheek but BELOW his own chin. "
                "Nothing across his face. Mouth CLOSED.", None),
    'shion_ear': ('shion', "An intimate close-up: he leans in very near the viewer at the LEFT side of the picture, toward the viewer's left "
                  "ear, face in three-quarter view, half-lidded calm eyes looking sideways at the viewer, a soft dangerous smile; the "
                  "feather fan held low near the bottom edge. Nothing across his face, the beauty mark under his right eye visible. "
                  "Mouth CLOSED.", "Lighting on him: cool silver moonlight from the LEFT, a little warm amber from the RIGHT."),
    'saku_ear': ('saku', "An intimate close-up: he stands very near the viewer at the RIGHT side of the picture, leaning toward the viewer's "
                 "right ear in a dark corridor, face in three-quarter view, serious alert eyes glancing sideways, one index finger raised "
                 "near his chin in a quiet 'shh' gesture but NOT covering his lips, the mole under his left eye visible. Mouth CLOSED.",
                 "Lighting on him: cool blue moonlight in stripes, a faint warm torch glow from the LEFT."),
}

out = {"_doc": __doc__}
for c in CHAR:
    for o in 'ab':
        lead = ("Image 1 is the CHARACTER and STYLE reference: draw this exact young man (his face, eyes, hair colour). Image 2 is the same "
                "man closer (face reference).")
        out[f"design_{c}_{o}"] = {"ref": REFS[c], "prompt": "\n\n".join([lead, STYLE, SAME, CHAR[c], WORLD, DESIGNS[f'{c}_{o}'], DESIGN_POSE[c], LIGHT[c], plain(c), END])}
out["bg_pond"] = {"ref": "ref_saku", "prompt": PLATE + WORLD_BG + "\n\n" + BGS['bg_pond'] + "\n\n" + END}
out["bg_chamber"] = {"ref": "ref_jin", "prompt": PLATE + WORLD_BG + "\n\n" + BGS['bg_chamber'] + "\n\n" + END}
out["bg_terrace"] = {"ref": "ref_shion", "prompt": PLATE + WORLD_BG + "\n\n" + BGS['bg_terrace'] + "\n\n" + END}
out["bg_corridor"] = {"ref": "ref_saku", "prompt": PLATE + WORLD_BG + "\n\n" + BGS['bg_corridor'] + "\n\n" + END}
out["bg_dawn"] = {"ref": "bg_pond", "prompt": DAWN + "\n\n" + END}
for c in CHAR: out[f"{c}_base_blink"] = {"ref": f"{c}_base", "prompt": EDIT.format(what=BLINK)}
for n, (c, pose, light) in POSES.items():
    lead = ("Image 1 is the CHARACTER and STYLE reference: draw this exact young man (face, eyes, hair, hairstyle, outfit, lineart and "
            "colouring) — the same man, the same art style, not more realistic, same hair colour. Image 2 is an extra face reference.")
    out[n] = {"ref": [f"{c}_base", REFS[c][1]], "prompt": "\n\n".join([lead, STYLE, CHAR[c], pose, light or LIGHT[c], plain(c), END])}
    out[f"{n}_blink"] = {"ref": n, "prompt": EDIT.format(what=BLINK)}
out["cover_art"] = {"ref": ["jin_base", "shion_base", "saku_base"], "prompt": "\n\n".join([
    "Images 1, 2 and 3 are the CHARACTER and STYLE references: draw these exact three young men (Image 1 Jin, wine-red hair; Image 2 Shion, "
    "platinum hair; Image 3 Saku, chestnut hair with the fox mask) with the same faces, hair, hairstyles and outfits, the same art style. " + STYLE,
    "A striking romantic cover illustration: the three stand close together on a curved stone bridge over a frozen lotus pond in a "
    "palace garden at night, a huge pale moon behind them, silk lanterns glowing warm ORANGE along the eaves, light snow and frost "
    "sparkling BLUE-WHITE on the ice. They fill the RIGHT two-thirds of the picture, seen from the waist up, all looking at the viewer: Jin "
    "in the middle, a little in front, one hand reaching toward the viewer; Shion on the left of the group with his feather fan; Saku on "
    "the right with his fox mask; a small cute white MOON RABBIT (round, fluffy, friendly, glowing faintly) sits on Shion's shoulder. The "
    "LEFT third of the picture is calm dark night sky and snowy roofs (space for a title), no figures there. Faces large and clear, full "
    "heads inside the frame.", END])}
FP = os.path.join(ROOT, "project/face_points.json")
if os.path.exists(FP):
    for v, f in json.load(open(FP)).items():
        if f"{v}_blink" in out and "eyes" in f: out[f"{v}_blink"]["mask"] = ";".join("{},{},{},{}".format(*e) for e in f["eyes"])
json.dump(out, open(os.path.join(ROOT, "project/web_prompts.json"), "w"), ensure_ascii=False, indent=1)
print(len(out) - 1, "jobs")
