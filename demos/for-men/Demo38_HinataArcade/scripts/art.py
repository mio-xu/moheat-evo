#!/usr/bin/env python3
"""Art prompts for Demo38 (Hinata's arcade date) → project/web_prompts.json, made with the shared tools (DEMO_DESIGN_GUIDE §6 standard):
  python3 scripts/art.py                                  # (re)write the prompt table
  python3 tools/openai/images.py demos/for-men/Demo38_HinataArcade <job…>          # OpenAI gpt-image-2 (Seedance API: uploads limited)
  python3 tools/openai/images.py … <variant job> --mask "cx,cy,rx,ry"              # mouth / blink variants: masked edits only
Character reference = the current Hinata art (Demo14 assets/art/hinata_live.png → assets/art/ref_hinata.png): same face, hair, hoodie.
Poses on a chroma-key green background (#00B140, stage.json "matte": "green") — she is light (orange hair, white headset / shirt).
"""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STYLE = ("Image 1 is the CHARACTER and STYLE reference: the exact same young woman (face, eyes, hair, fang) and the exact same art style — "
         "soft modern cel animation with a light, airy palette, thin coloured lineart (dark lavender instead of black), flat colours with "
         "one soft-edged but still flat shadow tone, hand-drawn feel, NOT glossy, no bloom, no airbrush. Realistic adult proportions (about "
         "7 heads tall, not chibi), a beautiful adult face.")
HINATA = ("Hinata, 21, an energetic gamer streamer on her day off: bright orange short bob with one small side ponytail tied with a red "
          "ribbon, sparkling golden eyes, a tiny fang; the same red-and-white zip hoodie jacket over a white T-shirt, a white gaming "
          "headset around her neck, and today a plain black baseball cap pulled a little low as a light disguise (no logo, no letters).")
GREEN = ("Plain flat chroma-key GREEN background (#00B140), completely even, empty: no floor line, no shadow on the background, no scenery. "
         "Nothing green on her (no green clothing, accessories or props). Lighting as in a neon arcade at night: cool cyan neon light from "
         "the LEFT, warm pink-magenta neon from the RIGHT, soft contrast.")
FRAME = ("Straight-on, eye-level camera about one metre in front of her; she looks at the viewer. Upper body from the waist up, centred, "
         "the whole head, cap and ponytail in frame with some space above. Mouth closed, eyes open. Hands and props stay below her chin "
         "and never cross her face.")
WIDE = "Wide 16:9 illustration. No text, no letters, no logo, no watermark, no UI, no readable writing anywhere."
AVOID = "Avoid: chibi, childish face, realistic photo, 3D render, glossy, bloom, extra fingers, deformed hands, text, a second person."
PLATE = ("Image 1 is the ART STYLE reference only (do not draw her). Same soft cel-animation style, thin coloured lineart, flat colours, "
         "simple clean shapes. Background plate only, NO people.")
J = lambda *p: '\n\n'.join(p)

JOBS = {
    # ---------------- background plates (16:9): empty scenes, the centre left open for her
    'bg_entrance': J(PLATE, "Inside a neon Japanese game centre (arcade) at night, just inside the automatic glass entrance doors on the "
                     "RIGHT, through which a cold winter night street with lit shop signs is visible. Rows of colourful arcade cabinets and "
                     "UFO-catcher machines with soft glowing screens and pink / cyan neon strips, a patterned carpet floor; the centre of "
                     "the picture is open floor where a person will be placed later. Eye level of a standing person.", WIDE,
                     "Avoid: people, text, readable signs, chibi, 3D render, photo."),
    'bg_games': J(PLATE, "Inside a neon arcade at night: a row of game cabinets — a big red taiko drum rhythm game on the LEFT with its "
                  "two drums, racing game cabinets with bucket seats and steering wheels on the RIGHT, glowing screens and neon strips; "
                  "the centre is open floor where a person will be placed later. Eye level.", WIDE,
                  "Avoid: people, text, readable signs, chibi, 3D render, photo."),
    'bg_crane': J(PLATE, "Inside a neon arcade at night: a big glowing UFO-catcher (crane game) machine fills the LEFT half — a glass box "
                  "full of cute plush toys, a white cat plushie near the front, a metal claw hanging above; the RIGHT half is open, softly "
                  "lit aisle where a person will be placed later. Eye level.", WIDE, "Avoid: people, text, readable signs, chibi, 3D render, photo."),
    'bg_booth': J(PLATE, "Inside a Japanese purikura photo booth: a bright, softly lit pastel pink-and-white backdrop curtain filling the "
                  "picture, a ring of soft studio light, very close and cramped; empty, where two people will be placed later. Eye level.",
                  WIDE, "Avoid: people, text, letters, chibi, 3D render, photo."),
    'bg_street': J(PLATE, "A winter night street right outside the arcade: the arcade's glowing neon entrance on the RIGHT behind, a "
                   "brightly lit drink vending machine on the LEFT, cold blue night air, a few people-free shop lights, wet pavement "
                   "reflecting the neon; the centre is open where a person will be placed later. Eye level.", WIDE,
                   "Avoid: people, text, readable signs, chibi, 3D render, photo."),
    # ---------------- poses (green screen)
    'hin_ref': J(STYLE, HINATA, "She stands, one hand raised beside her shoulder in a cheerful little wave (the hand below chin level, "
                 "away from her face), the other hand in her hoodie pocket; a big bright closed-mouth grin with her tiny fang peeking.",
                 FRAME, GREEN, WIDE, AVOID),
}
POSES = {   # need hin_ref first (reference 2 = the base pose, so face and outfit stay identical)
    'hin_taiko': "She stands behind a big red taiko drum (the drum at the bottom of the picture, part of the figure), holding two wooden "
                 "drumsticks (bachi) raised at shoulder height, a fierce competitive grin, mouth closed.",
    'hin_race': "She sits in a racing-game bucket seat (only the seat back visible behind her), both hands on a small racing steering "
                "wheel in front of her chest, leaning forward excitedly, glancing at the viewer with a challenging grin, mouth closed.",
    'hin_crane': "She stands and points excitedly to the LEFT side of the picture with one hand (at shoulder height, away from her face), "
                 "the other hand clasped to her chest, a pleading, hopeful look at the viewer, mouth closed.",
    'hin_booth': "A close, cramped photo-booth event illustration: she leans in from the RIGHT side of the picture, her face large and "
                 "close to the viewer's right cheek, cap tilted, making a peace sign beside her chin (below the eyes, not covering her "
                 "face), hugging a small white cat plushie with the other arm; a shy, happy smile, mouth closed.",
    'hin_can': "Outside in the cold: she holds a small hot can of corn soup out toward the LEFT edge of the picture at cheek height, as if "
               "pressing it to the viewer's left cheek (the can away from her own face), hugging a small white cat plushie with the "
               "other arm; a playful, warm smile, mouth closed, a little breath vapour.",
}
for k, v in POSES.items():
    JOBS[k] = J(STYLE + " Image 2 is the same character in her date outfit: keep her face, hair, hoodie and headset EXACTLY like image 2, and the SAME plain black baseball cap (no logo) worn at the same angle on her head.",
                HINATA, v, FRAME.replace("Upper body from the waist up, centred", "Upper body from the waist up") if k != 'hin_booth' else
                "Eye-level, very close.", GREEN, WIDE, AVOID)
# masked mouth / blink variants (images.py "mask": only these ellipses may change; measured on the bases, 2560×1440 px)
FACE = {   # pose: (mouth cx, cy), (eye1 cx, cy), (eye2 cx, cy), radius scale
    'hin_ref': ((1270, 485), (1160, 410), (1315, 355), 1.0), 'hin_taiko': ((1280, 480), (1195, 390), (1365, 355), 1.0),
    'hin_race': ((1285, 568), (1180, 465), (1365, 400), 1.0), 'hin_crane': ((1335, 485), (1220, 400), (1385, 335), 1.0),
    'hin_booth': ((1400, 680), (1190, 570), (1455, 450), 1.45), 'hin_can': ((1300, 555), (1200, 445), (1375, 395), 1.0),
}
EDIT = ("Edit this exact image. Keep EVERYTHING identical — same pose, framing, size, position, hair strands, cap, clothes, colours, "
        "lighting and the green background — and change ONLY {what}. Do not move, zoom or crop the picture.")
MASK = {}
for pose, (m, e1, e2, k) in FACE.items():
    JOBS[pose + '_talk'] = EDIT.format(what="her mouth: open a little more, as in the middle of a cheerful word (a natural small opening, her tiny fang may show)")
    JOBS[pose + '_blink'] = EDIT.format(what="her eyes: both gently closed in a natural blink (curved lids, lashes visible); hair and cap unchanged")
    MASK[pose + '_talk'] = f"{m[0]},{m[1]},{round(85 * k)},{round(55 * k)}"
    MASK[pose + '_blink'] = f"{e1[0]},{e1[1]},{round(80 * k)},{round(55 * k)};{e2[0]},{e2[1]},{round(80 * k)},{round(55 * k)}"
REFS = {k: 'ref_hinata' for k in JOBS}
REFS.update({k: ['ref_hinata', 'hin_ref'] for k in POSES})
REFS.update({k: k.rsplit('_', 1)[0] for k in MASK})
out = {k: {'ref': REFS[k], 'prompt': v, **({'mask': MASK[k]} if k in MASK else {})} for k, v in JOBS.items()}
json.dump(out, open(os.path.join(ROOT, 'project', 'web_prompts.json'), 'w'), ensure_ascii=False, indent=1)
print(len(out), 'jobs')
