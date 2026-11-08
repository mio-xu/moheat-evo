#!/usr/bin/env python3
"""Demo44 魔法学院 (まちがい召喚と、まほう学院の三人) — prompts for the layered art (DEMO_DESIGN_GUIDE §6 标准制作流程, §6.5) →
project/web_prompts.json for tools/openai/images.py (Seedance API upload probe 2026-11-09 01:10: 429, Retry-After 28,086 s → OpenAI per §5.3).

Characters = special versions of three for-men heroines (face, hair colour, personality, voice unchanged; outfit / hairstyle / identity
changed — docs/proposals/2026-11-08_crossover.md M1-West). References COPIED into assets/art/ (never linked, so nothing is written into
the original demos): ref_tsubaki (Demo25 tsubaki_torii = card lock_face) / ref_cocoa (Demo17 cocoa_welcome) / ref_luna (Demo19
luna_counter) + a closer face crop each (ref_<c>_close).
Step 1: two design options per character (design_<c>_a / _b, project/designs_contact.jpg) → picks 2026-11-09 (prepro, coordinator rule: pick yourself): Tsubaki A (academy uniform + crown braid), Cocoa A (leather apron, goggles on the beret, side braid), Luna B (witch's coat + hat: the biggest change, brim above the brows); the pick is copied to
<c>_base.png (the base pose). Step 2: the other poses reference the pick; blink variants are masked edits (face_points.json);
mouths = LivePortrait sets (free, tools/art/lp_mouths.py), so no talk variants are drawn.
Screens (guide §6 / card backdrop): all three on chroma GREEN #00B140 ("matte": "green"): silver-white Tsubaki, pastel Cocoa, Luna in
a navy robe (dark) — nothing green on any of them.
Run: python3 scripts/prompts.py"""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

STYLE = ("Art style EXACTLY like image 1: modern anime cel illustration (the same series), thin dark-lavender lineart, flat colours with one "
         "soft-edged but still flat shadow tone. Hand-drawn feel, NOT glossy, no bloom, not realistic, not 3D. Realistic adult proportions "
         "(not chibi), about 7 heads tall, a beautiful adult face.")
WORLD = ("She now lives in an imaginary Western-fantasy kingdom with a royal academy of magic (storybook European, invented, not a real "
         "country or era): wool, velvet, leather, brass, embroidered crests, long cloaks. Nothing modern (no zips, no hoodies, no headphones, "
         "no plastic), no school-uniform sailor collar, not a Japanese kimono.")
SAME = ("Keep her FACE exactly as in images 1 and 2: the same eye shape, eye colour, eyebrows, nose, mouth, face shape and expression style "
        "— the same person, recognisable at once. Only her clothes and hairstyle change.")
CHAR = {
    'tsubaki': ("Tsubaki: the exact young woman from images 1-2 — very long silver-white hair, soft pink-red eyes, a gentle refined face, "
                "fair skin, a small RED CAMELLIA hair ornament (her anchor). Identity: a princess and top student of the academy's "
                "summoning class — polite, elegant, a little naive."),
    'cocoa': ("Cocoa: the exact young woman from images 1-2 — long fluffy wavy chestnut-brown hair, warm pink eyes, a gentle sweet face, "
              "fair skin, CREAM-coloured satin ribbons (her anchor). Identity: the master of the academy's underground alchemy workshop "
              "who brews sweet potions."),
    'luna': ("Luna: the exact young woman from images 1-2 — long straight black hair with DEEP-BLUE inner streaks, dark sapphire-blue eyes "
             "with long lashes, a cool mature face with a faint teasing smile, fair skin, a small silver CRESCENT-MOON earring (her anchor). "
             "Identity: the academy's professor of ice and night magic, keeper of the astronomy tower."),
}
DESIGNS = {   # two options each — both keep face / hair colour / anchor; B is the bigger change
    'tsubaki_a': ("Outfit A: a white academy uniform with gold trim — fitted white jacket with gold buttons and a red camellia crest on the "
                  "chest, a short white capelet with a gold clasp, a white pleated knee-length skirt, white gloves; a slim white wand with a "
                  "gold tip in one hand. Hair A: her long silver-white hair partly braided into a CROWN BRAID around her head, the rest "
                  "falling long down her back, the red camellia ornament at the side of the braid."),
    'tsubaki_b': ("Outfit B: a long ceremonial summoner's mantle in white with crimson lining and gold embroidery (hood down), a high "
                  "collar, over a crimson-and-white long dress; a slim white wand with a gold tip in one hand. Hair B: her silver-white "
                  "hair in TWO long braids looped up at the back and pinned with red camellia hairpins, soft side locks framing her face."),
    'cocoa_a': ("Outfit A: a brown leather alchemist's apron with many small pockets and glass vials over a cream blouse with the sleeves "
                "rolled up, fingerless brown gloves, round brass goggles pushed up on a soft cream beret. Hair A: her fluffy chestnut hair "
                "gathered into ONE big loose side braid over her front shoulder, tied with a cream ribbon."),
    'cocoa_b': ("Outfit B: a rust-red alchemist's long coat with brass buttons and rolled cuffs over a cream shirt, a belt bandolier of "
                "small corked bottles, brown gloves. Hair B: her chestnut hair in a high fluffy ponytail tied with a big cream ribbon, round "
                "brass goggles worn as a headband, loose wavy strands at her cheeks."),
    'luna_a': ("Outfit A: a deep-navy scholar's robe with wide sleeves and a black fur collar, silver star-chart embroidery along the hem, "
               "a thin black choker, the silver crescent earring. Hair A: her black hair in a LOW loose bun at the nape with several long "
               "strands left down, the deep-blue inner layer clearly showing in the bun and strands."),
    'luna_b': ("Outfit B: a midnight-blue witch's long coat with a high collar and silver crescent clasps over a black dress, a wide-brimmed "
               "pointed witch's HAT in midnight blue (the brim stays ABOVE her eyebrows, her whole face clearly visible), the silver "
               "crescent earring. Hair B: long straight black hair down to her waist with one thin side braid, the deep-blue inner streaks "
               "showing."),
}
REFS = {'tsubaki': ['ref_tsubaki', 'ref_tsubaki_close'], 'cocoa': ['ref_cocoa', 'ref_cocoa_close'], 'luna': ['ref_luna', 'ref_luna_close']}
LIGHT = {'tsubaki': "Lighting on her: cool pale moonlight-blue light from above and warm torchlight from BOTH sides, soft and even.",
         'cocoa': "Lighting on her: warm orange furnace light from the RIGHT of the picture, a faint cool blue light from the LEFT.",
         'luna': "Lighting on her: warm firelight from the LEFT of the picture, cool silver moonlight from the RIGHT, dim and calm."}
DESIGN_POSE = {
    'tsubaki': "She stands facing the viewer, from the thighs up, centre, at eye level, holding the wand in front of her chest with both hands, a polite, slightly puzzled gentle smile. Mouth CLOSED.",
    'cocoa': "She stands facing the viewer, from the thighs up, centre, at eye level, holding a long wooden stirring ladle in one hand at her side, the other hand on her hip, a warm sweet teasing smile. Mouth CLOSED.",
    'luna': "She stands facing the viewer, from the thighs up, centre, at eye level, one hand raised palm-up at chest height as if about to cast a quiet spell (nothing in the hand), a cool half-smile. Mouth CLOSED.",
}


def plain():
    return ("Plain flat CHROMA-KEY GREEN background (#00B140), one even colour, completely empty: no scenery, no floor line, no shadow and no "
            "gradient on the background, no green anywhere on her. Her whole head and hair inside the frame with space above; her shoulders, "
            "arms and elbows not cut by the left or right picture edge (full figure inside the frame with margin at the sides). ONLY the "
            "character: no furniture, no cauldron, no table, no fire, no other people, no other hands.")


END = "Wide 16:9 game art. No text, no letters, no captions, no logo, no watermark, no speech bubbles, no UI, no readable writing anywhere."
EDIT = ("Edit this exact image. Keep EVERYTHING identical — same pose, hands, framing, size, position, hair strands, clothes, colours, "
        "lighting and background — and change ONLY {what}. Do not move, zoom or crop the picture.")
BLINK = ("BOTH of her eyes: FULLY closed in a natural soft blink (upper eyelids all the way down on both eyes, lashes visible, no iris "
         "visible, same skin tone and lighting); her bangs stay exactly as they are")
BLOW = ("her mouth only: lips gently pursed into a small round 'o' as if softly blowing to cool a hot drink, cheeks very slightly puffed, "
        "eyes unchanged")
PLATE = ("Image 1 is the ART STYLE reference only (do not draw her). Same anime cel style, thin lineart, flat colours. "
         "Background plate only, NO people, empty scene.\n\n")
WORLD_BG = ("An imaginary storybook Western-fantasy royal academy of magic (invented, not a real place): stone, oak, brass, velvet, "
            "stained glass without figures, candles; no modern objects, no readable writing on books, banners or anything.")
BGS = {
    'bg_hall': ("The great summoning hall of the academy at night, seen at the eye level of a person sitting on the floor in the middle "
                "(first person): a huge round stone hall with tall gothic arches and pillars, a large magic circle carved into the floor "
                "glowing soft pale blue-white around the viewer (plain geometric rings and stars, no letters), two tall iron braziers "
                "with real orange fire at the LEFT and the RIGHT of the picture, tall dark stained-glass windows with moonlight, faint "
                "sparkling dust in the air. Grand, cold stone, a little mysterious. The centre is open (a person will stand there later)."),
    'bg_sky': ("High in the evening sky above the academy, seen from a flying broom (first person, looking forward): far below, the "
               "academy's towers and spires with tiny warm windows, a forest and a lake; a huge sky at blue hour with the last orange light "
               "on the RIGHT horizon and the first stars on the LEFT, wisps of cloud streaming past. Wide, airy, cold, a sense of speed "
               "and height. The lower centre is open (a person on a broom will be placed there later)."),
    'bg_lab': ("The academy's underground alchemy workshop at night, seen at the eye level of a person sitting on a stool (first person): "
               "vaulted brick ceiling, wooden shelves full of glass bottles and jars, brass instruments, hanging dried herbs; on the RIGHT "
               "a big copper cauldron on a brick furnace with real orange fire under it and white steam rising; on the LEFT a tall iron "
               "cold cabinet with its door ajar, frost and icicles on it, pale blue cold mist spilling out; warm lamp light. Cosy but "
               "busy. The centre is open (a person will stand there later)."),
    'bg_tower': ("A small round room at the very top of the academy's astronomy tower at night, a secret little night tea salon, seen "
                 "at the eye level of a person sitting in an armchair (first person): on the LEFT a stone fireplace with a real crackling "
                 "fire; on the RIGHT a tall open arched window to the night sky with a big moon and many stars, a brass telescope beside "
                 "it, thin curtains moving in the cold night air; star charts on the curved walls (no readable writing), bookshelves, a "
                 "small round tea table in the lower foreground with a teapot and two glasses. Calm, intimate, warm on the left and cool "
                 "on the right. The centre is open (a person will stand there later)."),
}
DAWN = ("Edit this exact image: the same room and camera, but it is now DAWN — through the open arched window on the right the sky glows "
        "soft pink and gold with the sun just rising over distant hills, the stars fading; the fire on the left has burned down to "
        "glowing embers; on the floor in the centre a faint pale-gold magic circle glows (plain rings, no letters). Keep the layout, "
        "furniture, style and colours otherwise identical. No people.")
POSES = {   # name: (character, pose, lighting or None)
    'tsubaki_broom': ('tsubaki', "She rides a long wooden flying broom, seen from close BEHIND her as if the viewer sits right behind her on the "
                      "same broom: her back and shoulders in the lower centre of the picture, her body leaning forward, both gloved hands "
                      "on the broom handle in front of her, the capelet and her long hair streaming toward the viewer in the wind; she "
                      "turns her head back over her LEFT shoulder to look at the viewer, her face in three-quarter view on the left side "
                      "of the picture, clearly visible, a polite excited smile. From the waist up. Mouth CLOSED.",
                      "Lighting on her: cool blue evening sky light from above-left, a warm orange sunset rim from the RIGHT."),
    'cocoa_ear': ('cocoa', "An intimate close-up: she leans in very near the viewer at the RIGHT side of the picture, toward the viewer's "
                  "right cheek, face in three-quarter view, a sweet doting smile, eyes on the viewer; both hands low near the bottom edge "
                  "hold a round steaming mug of hot cocoa (a little steam), held below her chin. Nothing across her face. Mouth CLOSED.", None),
    'luna_ear': ('luna', "An intimate close-up: she sits very near the viewer at the RIGHT side of the picture, leaning toward the viewer's "
                 "right ear, face in three-quarter view, wearing her pointed witch's hat tilted back so the brim stays above her eyebrows and clear of the viewer, half-lidded calm eyes looking sideways at the viewer, a faint teasing smile; one "
                 "hand low near the bottom edge holds a tall glass of iced tea. Nothing across her face. Mouth CLOSED.", None),
}

out = {"_doc": __doc__}
for c in CHAR:
    for o in 'ab':
        lead = ("Image 1 is the CHARACTER and STYLE reference: draw this exact young woman (her face, eyes, hair colour). Image 2 is the same "
                "woman closer (face reference).")
        out[f"design_{c}_{o}"] = {"ref": REFS[c], "prompt": "\n\n".join([lead, STYLE, SAME, CHAR[c], WORLD, DESIGNS[f'{c}_{o}'], DESIGN_POSE[c], LIGHT[c], plain(), END])}
out["bg_hall"] = {"ref": "ref_tsubaki", "prompt": PLATE + WORLD_BG + "\n\n" + BGS['bg_hall'] + "\n\n" + END}
out["bg_sky"] = {"ref": "ref_tsubaki", "prompt": PLATE + WORLD_BG + "\n\n" + BGS['bg_sky'] + "\n\n" + END}
out["bg_lab"] = {"ref": "ref_cocoa", "prompt": PLATE + WORLD_BG + "\n\n" + BGS['bg_lab'] + "\n\n" + END}
out["bg_tower"] = {"ref": "ref_luna", "prompt": PLATE + WORLD_BG + "\n\n" + BGS['bg_tower'] + "\n\n" + END}
out["bg_dawn"] = {"ref": "bg_tower", "prompt": DAWN + "\n\n" + END}
for c in CHAR: out[f"{c}_base_blink"] = {"ref": f"{c}_base", "prompt": EDIT.format(what=BLINK)}
for n, (c, pose, light) in POSES.items():
    lead = ("Image 1 is the CHARACTER and STYLE reference: draw this exact young woman (face, eyes, hair, hairstyle, outfit, lineart and "
            "colouring) — the same person, the same art style, not more realistic, same hair colour. Image 2 is an extra face reference.")
    out[n] = {"ref": [f"{c}_base", REFS[c][1]], "prompt": "\n\n".join([lead, STYLE, CHAR[c], pose, light or LIGHT[c], plain(), END])}
    out[f"{n}_blink"] = {"ref": n, "prompt": EDIT.format(what=BLINK)}
out["cocoa_ear_blow"] = {"ref": "cocoa_ear", "prompt": EDIT.format(what=BLOW)}
# cover art still (UI v2: media/cover/art.webp at the build stage, 1920×1080; title on the left → figures on the right two-thirds)
out["cover_art"] = {"ref": ["luna_base", "tsubaki_base", "cocoa_base"], "prompt": "\n\n".join([
    "Images 1, 2 and 3 are the CHARACTER and STYLE references: draw these exact three young women (Image 1 Luna, the witch with the hat; "
    "Image 2 Tsubaki, silver-white hair; Image 3 Cocoa, chestnut braid and goggles) with the same faces, hair, hairstyles and outfits, the "
    "same art style. " + STYLE,
    "A striking cover illustration: the three stand close together on the open balcony at the top of a magic academy's astronomy tower at "
    "night, a huge full moon and stars behind them, the academy's spires far below. They fill the RIGHT two-thirds of the picture, seen "
    "from the waist up, all looking at the viewer: Luna in the middle, a little in front, one hand raised with a swirl of small glittering "
    "BLUE-WHITE ice crystals and frost mist circling above her palm (cold); Tsubaki on the left of the group holding her slim white wand, a "
    "faint pale circle of light at its tip; Cocoa on the right holding a steaming mug of hot cocoa, a tiny cute round fire salamander "
    "(chibi-like, red-orange, friendly, glowing warm ORANGE, little flames on its tail) perched on her shoulder (warm). Cold blue light on "
    "the left of the group, warm orange glow on the right. The LEFT third of the picture is calm dark night sky with a few stars (space for a "
    "title), no figures there. Faces large and clear, nobody's face covered, full heads inside the frame.",
    END])}
FP = os.path.join(ROOT, "project/face_points.json")
if os.path.exists(FP):
    for v, f in json.load(open(FP)).items():
        if f"{v}_blink" in out and "eyes" in f: out[f"{v}_blink"]["mask"] = ";".join("{},{},{},{}".format(*e) for e in f["eyes"])
        if f"{v}_blow" in out and "mouth" in f: out[f"{v}_blow"]["mask"] = "{},{},{},{}".format(*f["mouth"])
json.dump(out, open(os.path.join(ROOT, "project/web_prompts.json"), "w"), ensure_ascii=False, indent=1)
print(len(out) - 1, "jobs")
