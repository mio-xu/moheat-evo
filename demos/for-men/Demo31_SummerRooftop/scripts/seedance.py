"""Seedance (GPT Image 2) for the summer-rooftop demo — Demo 10's API client loaded by path.
Art style = the for-men series anchor (Demo 12's style_3_softcel.png, same LOOK as Demo 14 / 25).

  python3 scripts/seedance.py probe            # one POST /uploads (API usable? 429 with a long Retry-After / 401 -> use the website)
  python3 scripts/seedance.py design [names]   # Nagisa design candidates -> assets/art/design_*.png (3:4, 1K)

Key: ~/.seedance_key. Raw PNGs in assets/art/ stay out of git. Idempotency keys make retries free.
"""
import importlib.util, json, os, sys, urllib.request, urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location('d10_seedance', os.path.join(ROOT, '..', '..', 'all-ages', 'Demo10_CaveSpring', 'scripts', 'seedance_images.py'))
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
m.OUT = os.path.join(ROOT, 'assets', 'art')
m.LOG = os.path.join(ROOT, 'project', 'seedance_log.json')
REF = os.path.join(m.OUT, 'ref_style3.png')
UPLOADS = os.path.join(ROOT, 'project', 'seedance_uploads.json')

LOOK = ("Image 1 is the ART STYLE reference ONLY — do NOT draw that young man; draw the new woman described below. "
        "Art style EXACTLY like image 1: soft modern cel animation with a light, airy palette — thin coloured lineart (dark lavender "
        "instead of black), flat pastel colours with one soft-edged but still flat shadow tone, simple clean backgrounds with a few round "
        "lights, gentle and romantic like an anime film. Hand-drawn feel, NOT glossy: no airbrush gradients, no bloom, no heavy glow, no "
        "over-detailed strands. Realistic adult proportions (about 7 heads tall, not chibi), a beautiful adult face. Original character, not a real person.")
SHOT = ("Upper-body portrait from the waist up on the flat rooftop of an old apartment building on a summer night (a low railing, a water tank, "
        "the lights of a small town below, a deep blue night sky with a few stars), she looks at the viewer with the expression described. "
        "No text, no logo, no watermark, no speech bubbles, no frame.")
AVOID = ("Avoid: chibi, super-deformed, childish face, realistic photo, 3D render, glossy, airbrushed, bloom, extra fingers, deformed hands, "
         "text, letters, the man from image 1, heavy makeup, princess look.")
BASE_CHAR = ("Hayase Nagisa, 20, the viewer's tomboyish childhood friend, home for the summer break. Usually in T-shirts and sneakers, sporty "
             "and blunt, but tonight she is, for once, wearing a yukata — and is embarrassed about it. Slightly sun-tanned skin, a sporty slim build. "
             "Colour theme: soda blue and sparkler orange. ")
DESIGNS = {
    'design_A_hanabi': BASE_CHAR + "Chestnut-brown hair in a high ponytail tied with a plain orange hair tie, short side-swept bangs, a few loose strands, "
        "bright amber eyes; a navy-blue yukata with small white-and-orange firework patterns, a simple orange half-width obi. "
        "Expression: looking away to the side with a grumpy blush, one hand rubbing the back of her neck.",
    'design_B_asagao': BASE_CHAR + "Long glossy black hair in a very high, swinging ponytail, a sporty black wristband still on her wrist, sharp dark-blue eyes "
        "with straight brows; a white-and-indigo yukata with soda-blue morning-glory (asagao) patterns, a lemon-yellow obi. "
        "Expression: a cocky, toothy grin, a hand on her hip.",
    'design_C_ramune': BASE_CHAR + "Dark-brown high ponytail tied with a soda-blue scrunchie, messy bangs held back with a simple hairpin on one side, teal eyes, "
        "a faint tan line at the collar; a faded indigo yukata with white wave (seigaiha) patterns borrowed from her mother, a white obi; "
        "she holds a blue glass ramune bottle. Expression: pouting, blushing, glancing at the viewer from the corner of her eye.",
}


def call_once(method, path, body):
    """One request without the client's long retry loop — to see at once whether the upload endpoint is rate-limited."""
    req = urllib.request.Request(m.BASE + path, data=json.dumps(body).encode(), method=method,
                                 headers={'Authorization': f'Bearer {m.key()}', 'Content-Type': 'application/json', 'Accept': 'application/json', 'User-Agent': 'moheat-demo31/1.0'})
    try:
        with urllib.request.urlopen(req, timeout=60) as r: return r.status, json.loads(r.read().decode() or 'null'), None
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode(errors='ignore')[:300], e.headers.get('Retry-After')


def ref_url(path):
    cache = json.load(open(UPLOADS)) if os.path.exists(UPLOADS) else {}
    k = os.path.basename(path)
    if k not in cache:
        cache[k] = m.upload([path])[0]; json.dump(cache, open(UPLOADS, 'w'), indent=1)
    return cache[k]


def submit(name, prompt, urls, res, ratio):
    log = json.load(open(m.LOG)) if os.path.exists(m.LOG) else {}
    body = {'model': 'gpt-image-2', 'mode': 'image-to-image', 'prompt': prompt,
            'inputs': [{'type': 'image', 'url': u} for u in urls], 'parameters': {'resolution': res, 'aspect_ratio': ratio}, 'max_cost_credits': 60}
    idem = f'moheat-d31-{name}-v1'.replace('_', '-')
    g = m.unwrap(m.call('POST', '/images', body, {'Idempotency-Key': idem}))
    print(f'[{name}] generation {g["id"]} cost {g.get("credits")}', flush=True)
    log[name] = {'generation': g['id'], 'idempotency_key': idem}; json.dump(log, open(m.LOG, 'w'), indent=1)
    return g['id']


def design(names):
    print('balance:', m.unwrap(m.call('GET', '/credits/balance')))
    url = ref_url(REF)
    jobs = []
    for name in names:
        dst = os.path.join(m.OUT, name + '.png')
        if os.path.exists(dst): print('exists', name); continue
        jobs.append((submit(name, '\n\n'.join([LOOK, DESIGNS[name], SHOT, AVOID]), [url], '1K', '3:4'), dst, name))
    for gid, dst, name in jobs: m.wait_save(gid, dst, name)
    print('balance:', m.unwrap(m.call('GET', '/credits/balance')))


if __name__ == '__main__':
    a = sys.argv[1:]
    if a[:1] == ['probe']:
        print('balance:', m.unwrap(m.call('GET', '/credits/balance')))
        print(call_once('POST', '/uploads', {'files': [{'name': 'ref_style3.png', 'type': 'image/png', 'size': os.path.getsize(REF)}]}))
    if a[:1] == ['design']: design(a[1:] or list(DESIGNS))


# ---------------------------------------------------------------- the rooftop stills (16:9, 2K). Image 1 = style anchor, image 2 = design A (user's pick).
LOOK2 = ("Image 1 is the ART STYLE reference only (do not copy its person or room). Image 2 is the CHARACTER reference: keep this exact young "
         "woman (face, chestnut-brown high ponytail with the orange hair tie, amber eyes, slightly tanned skin, the navy firework-pattern yukata, "
         "the orange obi). Art style like image 2 and image 1: soft modern cel animation, thin coloured lineart, flat colours with one soft-edged "
         "but still flat shadow tone, simple clean backgrounds with a few round lights. Hand-drawn feel, NOT glossy, no bloom. Realistic adult "
         "proportions (not chibi).")
CHAR = ("Nagisa: 20, tomboyish childhood friend; chestnut-brown hair in a high ponytail tied with a plain orange hair tie, short side-swept "
        "bangs, a few loose strands, bright amber eyes, slightly tanned skin; a navy-blue yukata with small white-and-orange firework patterns, "
        "a simple orange half-width obi.")
BG = ("The flat rooftop of an old apartment building on a hot summer night: a low metal railing, a water tank, a wooden bench, potted plants, "
      "the lights of a small seaside town below, a deep blue night sky with a few stars.")
CAM = ("First-person view (the viewer is her childhood friend sitting on the rooftop bench; at most the viewer's hand is visible). Wide 16:9. "
       "Leave the bottom fifth calm for subtitles. No text, no logo, no watermark, no speech bubbles, no UI, no readable writing anywhere.")
AVOID2 = ("Avoid: chibi, super-deformed, childish face, realistic photo, 3D render, glossy, airbrushed, bloom, extra fingers, deformed hands, "
          "readable text, letters, the man from image 1, a second girl.")
SCENES = {
    'nagisa_arrive': "Wide shot. An open grey steel rooftop door in the LEFT background with warm light spilling out. She has just walked over and "
        "stands about one metre in front of you, centre-right, one hand rubbing the back of her neck, looking away to the side with a grumpy blush, "
        "embarrassed to be seen in a yukata.",
    'nagisa_popsicle': "Close-up: she leans in from the RIGHT side of the picture and presses one half of a split light-blue soda twin popsicle "
        "against the viewer's right cheek (the popsicle at the right edge, very near the camera, a little frost on it); she holds the other half in "
        "her mouth, a teasing, toothy grin.",
    'nagisa_fan': "She sits right next to you on the bench, on the LEFT side of the picture, turned toward you, fanning you with a round paper "
        "uchiwa fan (plain light-blue paper, no writing); she looks away with a pout and a blush, the fan blurred with motion.",
    'nagisa_sparkler': "Extreme close-up, very intimate: two lit senko-hanabi sparklers hang in the lower centre, each a tiny glowing orange ball "
        "with delicate crackling sparks. Her face is very close on the LEFT side of the picture, cheek almost touching the viewer, lit warm orange "
        "from below, holding her breath in concentration, eyes on the sparklers. The rest of the scene is dark blue.",
    'nagisa_fireworks': "Big colourful fireworks bloom far away over the town on the RIGHT side of the sky. She sits on your LEFT, seen in "
        "three-quarter profile, lips parted mid-sentence, the firework light tinting her face; a shy, serious expression.",
    'nagisa_whisper': "Extreme close-up from the LEFT: her face right beside the viewer's left ear, eyes half closed, deeply blushing, lips parted "
        "as if whispering a secret; one hand resting on the viewer's left shoulder; fireworks softly blurred in the background.",
    'nagisa_shoulder': "Ending: she leans her forehead against the viewer's LEFT shoulder (seen from very close: the top of her head, her ponytail "
        "and orange hair tie, her red ear peeking out, her hand gripping the viewer's sleeve). Fireworks softly blurred behind.",
    'nagisa_laugh': "Ending: she sits on your LEFT, flustered and laughing at the same time, pointing at the viewer accusingly with a red face, "
        "eyes squeezed half shut, mouth open in a 'what!?' shout; fireworks softly blurred behind.",
}


def scene_prompt(name):
    return '\n\n'.join([LOOK2, CHAR, SCENES[name], BG, CAM, AVOID2])


# ================================================================ the standard way (DEMO_DESIGN_GUIDE §6 = Demo27 Gaku; project/layers.md)
# One empty rooftop plate + Nagisa on a plain grey background per pose + drawn variants (mouth / eyes) → tools/art/build_stage.py.
# Web (API uploads rate-limited): image 1 = the reference named in REFS (design_A_hanabi for new poses, the base pose for edits).
NAGISA = ("Nagisa, 20, the viewer's tomboyish childhood friend: chestnut-brown hair in a high ponytail tied with a plain orange hair tie, "
          "short side-swept bangs, a few loose strands, bright amber eyes, slightly tanned skin, a sporty slim build; a navy-blue yukata "
          "with small white-and-orange firework patterns and a simple orange half-width obi.")
LOOK3 = ("Image 1 is the CHARACTER and STYLE reference: the exact same young woman, yukata and art style — soft modern cel animation, "
         "thin coloured lineart, flat colours with one soft-edged but still flat shadow tone. Hand-drawn feel, NOT glossy, no bloom. "
         "Realistic adult proportions (not chibi).")
PLAIN = ("Plain flat light-grey studio background (#c8c8c8), completely empty: no floor line, no shadow on the background, no scenery, "
         "no props except what she holds. Lighting as on a summer-night rooftop: cool blue night light from the upper RIGHT, a soft warm "
         "light from the LEFT (an open door), soft contrast.")
FRAME = ("Straight-on, eye-level camera about one metre in front of her; she looks at the viewer. Upper body from the waist up, centred, "
         "the whole head and ponytail in frame with some space above. Mouth closed, eyes open. Hands and props stay below her chin and "
         "never cross her face.")
WIDE = "Wide 16:9 illustration. No text, no letters, no logo, no watermark, no UI."
AVOID3 = "Avoid: chibi, childish face, realistic photo, 3D render, glossy, bloom, extra fingers, deformed hands, text, a second person."
EDIT = ("Edit this exact image. Keep EVERYTHING identical — same pose, framing, size, position, hair strands, clothes, colours, lighting "
        "and background — and change ONLY {what}. Do not move, zoom or crop the picture.")
SAME_FACE = ("Edit this exact image. Keep her face, head, hair, expression and position EXACTLY as they are (same pixels), the same plain "
             "grey background and lighting; do not zoom or crop. Change only her arms / hands and what they hold: {what}")
TALK = "her mouth: slightly open as if softly saying 'a', a small natural opening, no teeth showing"
BLINK = "her eyes: gently closed in a natural blink (eyelids down, lashes visible); her bangs stay exactly as they are"
JOBS3 = {   # name: (prompt, reference image for the web)
    'nagisa_ref': ('\n\n'.join([LOOK3, NAGISA, "She stands, arms crossed under her chest, embarrassed to be seen in a yukata: cheeks blushing, "
                   "a grumpy little pout, glancing at the viewer from the corner of her eyes.", FRAME, PLAIN, WIDE, AVOID3]), 'design_A_hanabi'),
    'bg_roof': ('\n\n'.join(["Image 1 is the ART STYLE reference only (do not draw her). Same soft cel-animation style, thin coloured lineart, flat "
                "colours, simple clean shapes. Background plate only, NO people.",
                "The flat rooftop of an old apartment building on a hot summer night: a grey steel roof door standing open on the LEFT with warm "
                "light spilling out, a water tank on the right, a low metal railing, potted plants, the lights of a small seaside town and the "
                "dark sea below, a deep blue starry sky (no fireworks). Eye-level view of someone sitting on a bench; the centre of the picture "
                "is open roof floor in front of the railing, where a person will be placed later.", WIDE, "Avoid: people, animals, text, fireworks, chibi, 3D render, photo."]), 'design_A_hanabi'),
    'nagisa_ref_talk': (EDIT.format(what=TALK), 'nagisa_ref'),
    'nagisa_ref_blink': (EDIT.format(what=BLINK), 'nagisa_ref'),
    # batch 2 (after the user has seen the test)
    'nagisa_popsicle': (SAME_FACE.format(what="her arms are no longer crossed: one hand holds half of a split light-blue soda twin popsicle "
                        "(frosty, on a wooden stick) held out toward the viewer at the RIGHT edge of the picture at chest height, her other "
                        "hand holds the other half low at her side."), 'nagisa_ref'),
    'nagisa_sit': ('\n\n'.join([LOOK3, NAGISA, "She sits on a low bench (the bench itself not drawn, just her seated posture), slightly LEFT of "
                   "centre, her body turned a little toward the viewer, hands resting in her lap, a shy, serious look straight at the viewer.",
                   FRAME.replace("centred", "slightly left of centre"), PLAIN, WIDE, AVOID3]), 'nagisa_ref'),
    'nagisa_fan': (SAME_FACE.format(what="one hand now holds a round light-blue paper uchiwa fan (plain, no writing) out at the LEFT side of the "
                   "picture at shoulder height, beside (not in front of) her face, as if fanning the viewer; the other hand stays in her lap."), 'nagisa_sit'),
    'nagisa_laugh': ('\n\n'.join([LOOK3, NAGISA, "She sits in the same place, slightly RIGHT of centre, flustered and laughing at the same time: a "
                     "red face, eyes squeezed half shut, mouth open in a 'what!?' shout, pointing at the viewer with one hand at chest height.",
                     FRAME.replace("centred", "slightly right of centre").replace("Mouth closed, eyes open. ", ""), PLAIN, WIDE, AVOID3]), 'nagisa_ref'),
    'nagisa_sparkler': ('\n\n'.join([LOOK3, NAGISA, "An intimate close-up event illustration: she leans in very close in front of the viewer, "
                        "slightly left of centre, holding a thin senko-hanabi sparkler string between two fingers at chest height so its tip hangs "
                        "in front of her chest (no flame drawn); the viewer's hand comes in from the lower RIGHT holding another sparkler string "
                        "the same way. She looks down at the tips, holding her breath; warm orange light from below on her face.",
                        "Mouth closed, eyes open.", PLAIN, WIDE, AVOID3.replace(', a second person', '')]), 'nagisa_ref'),
    'nagisa_whisper': ('\n\n'.join([LOOK3, NAGISA, "An intimate close-up event illustration: she leans in from the LEFT to whisper into the "
                       "viewer's left ear, her face large and in three-quarter profile facing RIGHT, eyes half closed, deeply blushing, lips "
                       "slightly apart; one hand resting on the viewer's shoulder at the lower edge.", PLAIN, WIDE, AVOID3]), 'nagisa_ref'),
    'nagisa_shoulder': ('\n\n'.join([LOOK3, NAGISA, "An intimate close-up event illustration seen from very close: she leans her forehead against "
                        "the viewer's LEFT shoulder (the dark T-shirt shoulder at the lower left): we see the top of her head, her ponytail and "
                        "orange hair tie, her red ear peeking out, her hand gripping the viewer's sleeve.", PLAIN, WIDE, AVOID3.replace(', a second person', '')]), 'nagisa_ref'),
}
JOBS3.update({
    'nagisa_sit_talk': (EDIT.format(what=TALK), 'nagisa_sit'), 'nagisa_sit_blink': (EDIT.format(what=BLINK), 'nagisa_sit'),
    'nagisa_laugh_talk': (EDIT.format(what="her mouth: open a little wider, in the middle of the shout"), 'nagisa_laugh'),
    'nagisa_sparkler_talk': (EDIT.format(what=TALK), 'nagisa_sparkler'), 'nagisa_sparkler_blink': (EDIT.format(what=BLINK), 'nagisa_sparkler'),
    'nagisa_whisper_talk': (EDIT.format(what="her lips: parted a little more, as in the middle of a whispered word"), 'nagisa_whisper'),
})
TEST3 = ['nagisa_ref', 'bg_roof', 'nagisa_ref_talk', 'nagisa_ref_blink']
