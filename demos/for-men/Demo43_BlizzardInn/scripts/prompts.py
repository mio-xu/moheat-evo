#!/usr/bin/env python3
"""Demo43 風雪客栈 (白嶺の峠、ひと晩の宿) — prompts for the layered art (DEMO_DESIGN_GUIDE §6 标准制作流程) → project/web_prompts.json
for tools/openai/images.py (Seedance API upload was rate-limited, 429 / Retry-After 64409 s on 2026-11-08 → OpenAI per §5.3).

Characters = special versions of the for-men heroines (face, hair colour, personality, voice unchanged; outfit / hairstyle / identity
changed — docs/proposals/2026-11-08_crossover.md M1-East). References copied into assets/art/ (not linked, so nothing is ever written
into the original demos): ref_mint (Demo37), ref_hinata (Demo18), ref_nagisa (Demo31) + a closer face reference each.
Step 1: two design options per character (design_<char>_a / _b) → the coordinator picks one each; the pick becomes that character's
base pose (<char>_base) by copy. Step 2: the other poses / variants reference the pick.
Chroma screens (guide §6): Mint has mint-green hair → magenta #FF00FF ("matte": "magenta"); Hinata and Nagisa → green #00B140.
Run: python3 scripts/prompts.py"""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

STYLE = ("Art style EXACTLY like image 1: modern anime cel illustration (the same series), thin dark-lavender lineart, flat colours with one "
         "soft-edged but still flat shadow tone. Hand-drawn feel, NOT glossy, no bloom, not realistic, not 3D. Realistic adult proportions "
         "(not chibi), about 7 heads tall, a beautiful adult face.")
WORLD = ("She now lives in an imaginary snowy East-Asian-flavoured mountain land of long ago (an invented country, not any real dynasty or era): "
         "practical layered cloth garments with wrap collars, quilted and fur-lined winter wear, cords and sashes. NOT a Chinese palace "
         "costume, NOT a Japanese kimono or miko outfit, no Tang hats, no court robes, nothing modern (no zips, no hoodies, no headphones).")
SAME = ("Keep her FACE exactly as in images 1 and 2: the same eye shape, eye colour, eyebrows, nose, mouth, face shape and expression style "
        "— the same person, recognisable at once. Only her clothes and hairstyle change.")
CHAR = {
    'mint': ("Mint: the exact young woman from images 1-2 — very long hair in pale mint green fading to white at the tips, sleepy pale "
             "aqua-blue eyes with heavy lids, soft gentle face, fair skin. Her small silver STAR hair ornament is now a star-shaped jade "
             "hairpin. Identity: a travelling woman doctor who 'cures people even half asleep'."),
    'hinata': ("Hinata: the exact young woman from images 1-2 — bright orange hair, big golden-amber eyes, a small fang (snaggletooth) "
               "showing at one corner of her closed smile, energetic cheeky face, a RED satin ribbon. Identity: the young landlady of a "
               "mountain inn, hotpot cook and dice dealer."),
    'nagisa': ("Nagisa: the exact young woman from images 1-2 — chestnut-brown hair, amber eyes, short side-swept bangs, slightly tanned "
               "skin, a tomboyish, blunt face with a stubborn frown, a plain ORANGE hair tie. Identity: a woman escort-guard who protects "
               "caravans over the mountain pass."),
}
DESIGNS = {   # two options each — both keep face / hair colour / anchor; B is the bigger change
    'mint_a': ("Outfit A: layered long travelling robes in pale green and off-white with a wrap collar, a soft white fur-lined short "
               "capelet, a wide pale-green sash, a small wooden medicine chest on a strap at her hip, a cloth roll of needles tucked in the "
               "sash. Hair A: her long hair gathered into ONE loose low braid hanging over her front shoulder, the star jade hairpin above "
               "her ear, the white-mint tips at the end of the braid, soft loose strands framing her face."),
    'mint_b': ("Outfit B: a deep teal-green hooded travelling cloak (hood down, fur trim) over a white inner robe with a wrap collar and a "
               "mint-green underlayer, a dark sash, a small lacquered medicine box hanging from a cord, long wide sleeves. Hair B: her hair "
               "put UP — a loose twisted bun at the back of her head held by the star-shaped jade hairpin, two long side locks falling to "
               "her chest showing the white-mint tips, short wispy bangs."),
    'hinata_a': ("Outfit A: a short padded jacket in warm orange-red with a wrap collar over a cream inner garment, sleeves tied back with "
                 "a red cord (tasuki), a dark navy apron tied at the waist, a small cloth pouch for dice at her belt. Hair A: TWO round "
                 "buns on top of her head, each tied with a red ribbon, short orange bangs and a few loose strands."),
    'hinata_b': ("Outfit B: a quilted vest in deep red over a long-sleeved ochre work robe with a wrap collar, sleeves rolled up to the "
                 "elbows, a long white work apron, a red sash. Hair B: all her hair pulled up into ONE high bun wrapped with a red cloth "
                 "headband tied in a bow with long red ribbon tails, orange bangs out in front."),
    'nagisa_a': ("Outfit A: a dark indigo close-fitting martial outfit (wrap-collar jacket, belted), a sleeveless grey-white FUR vest over "
                 "it, leather wrist guards, cloth leg wraps, an orange waist cord, a long wooden staff on her back (diagonal, behind her "
                 "shoulder). Hair A: cut to SHOULDER LENGTH, the back gathered into a small stubby tail with the orange hair tie, messy "
                 "short bangs."),
    'nagisa_b': ("Outfit B: a long charcoal-black travelling coat with a big brown fur collar, a rust-orange inner jacket, a leather "
                 "belt with a pouch, leather gauntlets, she holds a long wooden staff upright beside her. Hair B: cut SHORT (a boyish "
                 "short cut above the shoulders), a long orange cloth headband tied around her forehead with the tails flying, the "
                 "orange hair tie wrapped around one thin side lock."),
}
REFS = {'mint': ['ref_mint', 'ref_mint_close'], 'hinata': ['ref_hinata', 'ref_hinata_close'], 'nagisa': ['ref_nagisa', 'ref_nagisa_close']}
SCREEN = {'mint': ('MAGENTA', '#FF00FF', 'no magenta or pink anywhere on her'), 'hinata': ('GREEN', '#00B140', 'no green anywhere on her'),
          'nagisa': ('GREEN', '#00B140', 'no green anywhere on her')}
LIGHT = {'mint': "Lighting on her: warm amber lamplight from the LEFT of the picture, soft and dim, a faint cool rim on the right.",
         'hinata': "Lighting on her: warm lantern and hearth light from the front and the RIGHT of the picture (a charcoal brazier), cosy.",
         'nagisa': "Lighting on her: cold grey-blue snowy daylight, soft and even, a few snowflakes caught on her shoulders and hair."}
DESIGN_POSE = {
    'mint': "She stands facing the viewer, from the thighs up, centre, at eye level, one hand resting on the medicine box strap at her waist, a sleepy, gentle half-smile, eyes half-lidded. Mouth CLOSED.",
    'hinata': "She stands facing the viewer, from the thighs up, centre, at eye level, both hands on her hips, a confident cheeky grin with closed lips and the little fang showing. Mouth CLOSED.",
    'nagisa': "She stands facing the viewer, from the thighs up, centre, at eye level, looking straight at the viewer with an annoyed, worried frown, one hand on her hip. Mouth CLOSED.",
}


def plain(c):
    n, hexv, no = SCREEN[c]
    return (f"Plain flat CHROMA-KEY {n} background ({hexv}), one even colour, completely empty: no scenery, no floor line, no shadow and no "
            f"gradient on the background, {no}. Her whole head and hair inside the frame with space above; her shoulders, arms and elbows "
            "not cut by the left or right picture edge (full figure inside the frame with margin at the sides).")


END = "Wide 16:9 game art. No text, no letters, no captions, no logo, no watermark, no speech bubbles, no UI, no readable writing anywhere."
EDIT = ("Edit this exact image. Keep EVERYTHING identical — same pose, hands, framing, size, position, hair strands, clothes, colours, "
        "lighting and background — and change ONLY {what}. Do not move, zoom or crop the picture.")
MOUTH = "her mouth: slightly open as if talking softly, a small natural opening, no teeth showing"
BLINK = ("BOTH of her eyes: FULLY closed in a natural soft blink (upper eyelids all the way down on both eyes, lashes visible, no iris "
         "visible, same skin tone and lighting); her bangs stay exactly as they are")
PLATE = ("Image 1 is the ART STYLE reference only (do not draw her or her room). Same anime cel style, thin lineart, flat colours. "
         "Background plate only, NO people, empty scene.\n\n")
WORLD_BG = ("An imaginary snowy East-Asian-flavoured mountain land of long ago (invented, not a real dynasty): wood, paper, plaster, "
            "stone, cloth, no modern objects, no readable writing on lanterns, signs, flags or anything.")
BGS = {
    'bg_pass': ("A high mountain pass in deep snow, daytime under a heavy grey-blue winter sky with light snowfall, seen at the eye level "
                "of a person standing in the snow (first person). A narrow path climbs through the snow toward an old weathered wooden "
                "gate of the pass with a small tiled roof in the middle distance; dark snow-laden pine trees on both sides; on the RIGHT "
                "a long wooden pole stuck in the snow with a small tattered rust-orange cloth pennant (plain, no writing) flapping to the "
                "right; on the LEFT the slope falls away into white mist. Cold, wide, quiet. The centre foreground is open (a person will "
                "stand there later)."),
    'bg_hall': ("The main room of a small old mountain inn at night, seen from a seat at a low wooden table (first person, eye level of a "
                "seated person): dark wooden beams and posts, warm paper lanterns (plain, no writing) hanging from the beams, rough "
                "plaster walls, a wooden lattice window on the LEFT with blue night and falling snow outside, on the RIGHT a black iron "
                "charcoal brazier glowing orange; shelves with clay jars and bowls; the edge of the wooden table along the bottom of the "
                "picture. Warm, cosy, a little smoky. The centre behind the table is open (a person will stand there later)."),
    'bg_room': ("A small quiet back room of the same mountain inn at night (image 2 is the inn: keep its wood, plaster, colours and warm "
                "light): sliding paper screens, a paper floor lamp (andon) glowing warm amber on the LEFT, a tall wooden medicine chest "
                "with many small drawers on the RIGHT, bundles of herbs drying from a beam, a folded quilt, a low tray with small jars "
                "and a thin moxa stick. Seen from a person sitting on the floor (eye level of a seated person), intimate and dim. The "
                "centre is open (a person will sit there later)."),
    'bg_door': ("The entrance hall of the same mountain inn late at night (image 2 is the inn: keep its wood, plaster, colours and lanterns), "
                "seen from inside at the eye level of a sitting person: on the LEFT the heavy wooden double doors are blown half OPEN, a "
                "blizzard outside in cold blue darkness, snow blowing in across the floorboards; one paper lantern swinging in the wind; "
                "on the RIGHT a warm-lit wooden corridor going deeper into the inn. Cold blue on the left, warm amber on the right. The "
                "left-centre is open (a person will stand there later)."),
}
POSES = {   # name: (character, ref job, lighting, pose)
    'nagisa_guard': ('nagisa', "A close shot: she stands on the LEFT side of the picture, close to the viewer, from the chest up and larger "
                     "in the frame, her body turned three-quarters toward the viewer, her back to a strong wind blowing from the LEFT of the "
                     "picture so her hair, headband tails and fur collar stream toward the picture's right; she shields the viewer with her "
                     "shoulder, cheeks a little red from the cold, a gruff but soft look at the viewer. Mouth CLOSED.",
                     "Lighting on her: cold blue night light from the LEFT (the open door), warm amber lantern light from the RIGHT."),
    'hinata_dice': ('hinata', None, None),   # edit of the base: same face → shares its mouth / blink patches
    'hinata_ear': ('hinata', "An intimate close-up: her face near the viewer at the RIGHT side of the picture, leaning in toward the viewer's "
                   "right ear, face in three-quarter view, a mischievous grin with closed lips and the little fang, eyes sideways at the "
                   "viewer; one hand low near the bottom edge holding a small wooden dice cup. Mouth CLOSED.", None),
    'mint_ear': ('mint', "An intimate close-up: she kneels very near the viewer at the RIGHT side of the picture, leaning toward the viewer's "
                 "right ear, face in three-quarter view, sleepy half-closed eyes, a soft smile; her far hand low at the bottom-right "
                 "holds a thin lit moxa stick (a small orange ember at its tip, a thin wisp of smoke) at a distance; her other hand low "
                 "at the bottom-left holds a tiny open round tin of pale green balm. Both hands below her chin, nothing across her face. "
                 "Mouth CLOSED.", None),
}
DICE = ("her hands: she now holds a small wooden dice cup upside down in one hand at chest height and has just slammed it down on her "
        "other palm, a gleeful competitive grin with closed lips and the fang showing (her face, eyes, hair and body stay exactly the same)")

out = {"_doc": __doc__}
for c in CHAR:
    for o in 'ab':
        lead = ("Image 1 is the CHARACTER and STYLE reference: draw this exact young woman (her face, eyes, hair colour). Image 2 is the same "
                "woman closer (face reference).")
        out[f"design_{c}_{o}"] = {"ref": REFS[c], "prompt": "\n\n".join([lead, STYLE, SAME, CHAR[c], WORLD, DESIGNS[f'{c}_{o}'], DESIGN_POSE[c], LIGHT[c], plain(c), END])}
out["bg_pass"] = {"ref": "ref_nagisa", "prompt": PLATE + WORLD_BG + "\n\n" + BGS['bg_pass'] + "\n\n" + END}
out["bg_hall"] = {"ref": "ref_hinata", "prompt": PLATE + WORLD_BG + "\n\n" + BGS['bg_hall'] + "\n\n" + END}
for b in ('bg_room', 'bg_door'):
    out[b] = {"ref": ["ref_mint", "bg_hall"], "prompt": PLATE.replace("Background plate only", "Image 2 is the same inn. Background plate only") + WORLD_BG + "\n\n" + BGS[b] + "\n\n" + END}
for c in CHAR:   # the picked design = the base pose (copied to <c>_base.png); variants of it
    out[f"{c}_base_talk"] = {"ref": f"{c}_base", "prompt": EDIT.format(what=MOUTH)}
    out[f"{c}_base_blink"] = {"ref": f"{c}_base", "prompt": EDIT.format(what=BLINK)}
out["hinata_dice"] = {"ref": "hinata_base", "prompt": EDIT.format(what=DICE)}
for n in ("talk", "blink"): out[f"hinata_dice_{n}"] = {"ref": "hinata_dice", "prompt": EDIT.format(what=MOUTH if n == "talk" else BLINK)}
for n, (c, pose, light) in POSES.items():
    if pose is None: continue
    lead = ("Image 1 is the CHARACTER and STYLE reference: draw this exact young woman (face, eyes, hair, hairstyle, outfit, lineart and "
            "colouring) — the same person, the same art style, not more realistic, same hair colour. Image 2 is an extra face reference.")
    out[n] = {"ref": [f"{c}_base", REFS[c][1]], "prompt": "\n\n".join([lead, STYLE, CHAR[c], pose, light or LIGHT[c], plain(c), END])}
    out[f"{n}_talk"] = {"ref": n, "prompt": EDIT.format(what=MOUTH)}
    out[f"{n}_blink"] = {"ref": n, "prompt": EDIT.format(what=BLINK)}
# hinata_ear_talk v1 came out as a faint smear (barely open, semi-transparent): a clearer open mouth for her close-up (v2)
out["hinata_ear_talk"]["prompt"] = EDIT.format(what="her mouth: slightly open in a small narrow opening as if whispering, a thin dark-red gap clearly visible between the lips (not a big oval), crisp lip lines in the same lineart, the little fang still at the corner, no other teeth")
# (v3 was made with a smaller mask on the command line: images.py … hinata_ear_talk --quality medium --force --mask "1702,646,58,26")
FP = os.path.join(ROOT, "project/face_points.json")
if os.path.exists(FP):
    for v, f in json.load(open(FP)).items():
        if f"{v}_talk" in out and "mouth" in f: out[f"{v}_talk"]["mask"] = "{},{},{},{}".format(*f["mouth"])
        if f"{v}_blink" in out and "eyes" in f: out[f"{v}_blink"]["mask"] = ";".join("{},{},{},{}".format(*e) for e in f["eyes"])
json.dump(out, open(os.path.join(ROOT, "project/web_prompts.json"), "w"), ensure_ascii=False, indent=1)
print(len(out) - 1, "jobs")
