"""Write project/seedance_jobs.json: every Seedance (GPT Image 2, image-to-image) job for the Naomi demo.

  python3 scripts/make_jobs.py

Refs: the Demo 1–4 style board (read-only from Demo 10), the photo board of the real Naomi (local only, not in git),
and — once it exists — assets/art/naomi_sit.png as the character sheet for every other pose.
"""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STYLE = os.path.join(os.path.dirname(ROOT), '../all-ages/Demo10_CaveSpring', 'project', 'seedance_refs', 'style_board.jpg')
PHOTOS = os.path.join(ROOT, 'project', 'seedance_refs', 'naomi_photos.jpg')
ART = lambda n: os.path.join(ROOT, 'assets', 'art', n + '.png')

LOOK = ("Beautiful Japanese anime illustration in the polished style of a high-quality gacha game / visual novel: delicate clean "
        "linework, soft cel shading with smooth gradients, luminous pastel colours, gentle glow and bloom, sparkling highlights, "
        "rich fine details, cozy healing (iyashikei) mood. Match the art style of the style reference image exactly.")
NAOMI = ("Naomi, a real domestic CAT (an animal on four legs, not a human, not a cat girl, no clothes): a very fluffy long-haired "
         "blue-grey and white bicolour cat (Siberian / Ragamuffin type). Soft blue-grey fur on the top of the head, the ears, the "
         "back, the sides and the tail, with faint darker grey tabby shading on the flanks; a pure WHITE inverted-V blaze from the "
         "forehead down between the eyes to the muzzle; white muzzle and chin; a huge fluffy white chest ruff and white belly; "
         "white mitten paws on all four feet; a small soft PINK nose; big round OLIVE-GREEN / yellow-green eyes; grey ears with "
         "long white tufts inside; long white whiskers; a very long plush darker-grey tail. Round, chubby, extremely soft and "
         "fluffy. Cute anime proportions: slightly big round head, big shiny eyes with sparkly highlights, soft pink blush on the "
         "cheeks. Personality: gentle, obedient, a little shy and easy to tease — a sweet, soft, good-natured cat.")
SPRITE = ("Single isolated character, centred, complete and fully visible (ears, paws and the whole tail inside the picture), "
          "generous margin around it, on a fully transparent background (transparent PNG with alpha channel, nothing behind). "
          "No shadow, no floor, no background scenery, no other objects, no text.")
BG = ("Background art only, wide 16:9 game scene, fixed front view from LOW at a cat's eye level, as if the viewer sits on the "
      "floor. No characters, no animals, no cats, no people, no text.")
AVOID = ("Avoid: ukiyo-e, woodblock print, gold leaf, realistic photo, photorealistic fur, 3D render, CGI, horror, gritty, dark "
         "muddy colours, text, letters, writing, logo, watermark, signature, frame, border, blurry, low resolution, jpeg "
         "artifacts, deformed, extra limbs, extra tails, extra ears, human, cat girl, clothes, collar, phone stickers, hearts")
AVOID_SPRITE = AVOID + ", green background, coloured background, background scenery, floor, cushion, furniture."
AVOID_BG = AVOID + ", animals, cats, characters."

R_PHOTO = "Image 2 is the CHARACTER reference: photos of the real cat Naomi. Copy her exact fur colours, markings, white blaze, pink nose and eye colour (ignore the phone stickers, hearts and text in the photos)."
R_SHEET = "Image 2 is the CHARACTER SHEET: keep this exact cat — same face, same markings, same colours, same eyes, same fluffiness and the same art style — in a new pose. Image 3 shows photos of the real cat for her markings (ignore stickers and text)."
R_FACE = "Image 2 is the character reference: keep this exact cat. The SAME picture, same pose, same size, same position, same lighting — ONLY the face changes:"
R_STYLE = "Image 1 is the STYLE reference (copy its art style only, not its content)."

ROOM = ("A cozy small Japanese apartment living room. LEFT third: a big window with sheer white curtains and a potted green plant "
        "on the sill. CENTRE: open light-wood floor with a big round fluffy cream rug in the centre foreground (EMPTY). RIGHT: a low "
        "wooden shelf with books and a little cat tower with a round cushion bed on top at the far right (EMPTY). Back wall in warm "
        "cream with a small framed picture and a string of tiny fairy lights. The whole lower 45 % of the picture is open floor and "
        "rug, completely empty, so characters can walk across it.")

jobs = {}
def job(i, name, ratio, refs, *parts):
    jobs[f'{i:02d}'] = {'name': name, 'ratio': ratio, 'refs': refs, 'prompt': '\n\n'.join(parts)}

pose = lambda i, name, text: job(i, name, '1:1', [STYLE, ART('naomi_sit'), PHOTOS], R_STYLE + ' ' + R_SHEET, LOOK, SPRITE, NAOMI, text, AVOID_SPRITE)
face = lambda i, name, base, text: job(i, name, '1:1', [STYLE, ART(base)], R_STYLE + ' ' + R_FACE + ' ' + text, LOOK, SPRITE, AVOID_SPRITE)

job(1, 'naomi_sit', '1:1', [STYLE, PHOTOS], R_STYLE + ' ' + R_PHOTO, LOOK, SPRITE, NAOMI,
    "Character sheet pose: Naomi sitting upright, facing the viewer in a slight three-quarter view, front white paws together, "
    "long fluffy tail curled around her front paws, head tilted a tiny bit, mouth closed in a soft shy smile, eyes open looking at "
    "the viewer. Gentle soft glow on the fur edges.", AVOID_SPRITE)
job(2, 'bg_room_morning', '16:9', [STYLE], R_STYLE, LOOK, BG, ROOM,
    "Early MORNING: soft pink-gold dawn light through the curtains, a gentle pale blue tint in the shadows, quiet and sleepy.", AVOID_BG)
face(3, 'naomi_sit_blink', 'naomi_sit', "both eyes CLOSED (gentle relaxed closed eyes, curved lines), mouth closed.")
face(4, 'naomi_sit_meow', 'naomi_sit', "mouth OPEN in a small cute 'mew', showing a little pink tongue, eyes open.")
face(5, 'naomi_sit_happy', 'naomi_sit', "eyes happily closed in content upside-down U curves, a tiny smile, extra pink blush, purring contentedly.")
pose(6, 'naomi_close', "CLOSE-UP: Naomi's head, ears and the top of her fluffy white chest, very close to the viewer and filling most of "
     "the picture, leaning in curiously toward the camera with her pink nose forward, as if about to boop the viewer's nose; big "
     "round olive-green eyes looking straight into the viewer's eyes, whiskers forward. Front view. The chest fur reaches the "
     "bottom edge of the picture.")
face(7, 'naomi_close_blink', 'naomi_close', "both eyes CLOSED (gentle relaxed closed eyes), mouth closed.")
face(8, 'naomi_close_happy', 'naomi_close', "eyes happily closed in content upside-down U curves, mouth in a tiny smile, extra pink blush, purring, as if being petted.")
pose(9, 'naomi_walk', "Full side view, walking toward the LEFT side of the picture, one front paw lifted mid-step, tail held up high with "
     "a soft curl at the tip, head turned slightly toward the viewer with a friendly look.")
pose(10, 'naomi_pounce', "Playing: standing up on her hind legs like a meerkat, body upright facing the viewer, both white front paws raised "
     "up in the air to catch something above her, eyes wide and sparkling with excitement, mouth slightly open, tail out for balance.")
pose(11, 'naomi_eat', "Side view facing LEFT, crouched down eating happily from a cute round pastel-pink ceramic food bowl with a white paw-"
     "print on the floor in front of her; eyes happily closed, cheeks puffed. The bowl is part of the picture.")
pose(12, 'naomi_loaf', "Sleepy 'cat loaf': lying down facing the viewer with all paws tucked under her round fluffy body, eyes half closed "
     "and drowsy, very soft and round like a bread loaf, tail wrapped around her side.")
pose(13, 'naomi_belly', "Rolled over onto her back showing her fluffy WHITE belly to the viewer, all four white paws curled up in the air, "
     "head tilted back on the floor looking at the viewer with a shy, trusting, slightly embarrassed expression, tail curled. Soft and defenceless.")
pose(14, 'naomi_sleep', "Curled up into a round ball, sleeping peacefully, nose tucked into her long fluffy tail, eyes closed, ears relaxed, "
     "seen from slightly above; a tiny peaceful smile.")
job(15, 'bg_room_day', '16:9', [STYLE, ART('bg_room_morning')], R_STYLE + " Image 2 is the LAYOUT reference: EXACTLY the same room.",
    LOOK, BG, "EXACTLY the same room, same composition and the same objects in the same places as image 2. Now it is a bright sunny "
    "AFTERNOON: the curtains are open and warm golden sunshine pours through the window, making a big bright warm patch of sunlight "
    "on the rug in the centre-left, tiny sparkling dust motes float in the sunbeam. Warm, happy, peaceful.", AVOID_BG)
job(16, 'bg_room_night', '16:9', [STYLE, ART('bg_room_morning')], R_STYLE + " Image 2 is the LAYOUT reference: EXACTLY the same room.",
    LOOK, BG, "EXACTLY the same room, same composition and the same objects in the same places as image 2. Now it is a quiet rainy "
    "NIGHT: raindrops and streaks run down the window glass, the city outside is a soft blur of blue night lights; inside, a warm orange "
    "floor lamp glows on the right and fairy lights shine softly; a soft folded blanket lies on the rug. Cozy, safe, sleepy.", AVOID_BG)
job(18, 'prop_bowl', '1:1', [STYLE], R_STYLE, LOOK, SPRITE.replace('character', 'object'),
    "A cute round pastel-pink ceramic cat food bowl with a white paw-print, seen from the front and slightly above, filled with "
    "warm cat food. No steam.", AVOID_SPRITE)

json.dump(jobs, open(os.path.join(ROOT, 'project', 'seedance_jobs.json'), 'w'), indent=1, ensure_ascii=False)
print(len(jobs), 'jobs')
