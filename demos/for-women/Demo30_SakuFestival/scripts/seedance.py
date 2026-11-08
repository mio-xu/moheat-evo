"""Seedance (GPT Image 2) art for Saku's summer festival — Demo 10's API client loaded by path (as in Demo 24).

  python3 scripts/seedance.py designs [names…]   # the look options for the user to pick (design_A … design_C)
  python3 scripts/seedance.py scenes [names…]    # the stills, after the user picked a look → assets/art/ref_saku.png

Style anchor = Demo 12's "No. 3 soft cel" (assets/art/style_ref.png, a copy of Demo12 style_3_softcel.png). If the upload endpoint is
rate-limited, the designs fall back to text-to-image (LOOK spells out the No. 3 soft cel, as Demo 24 did). Raw PNGs stay out of git.
"""
import glob, importlib.util, json, os, shutil, sys, time, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location('d10_seedance', glob.glob(os.path.join(ROOT, '..', '..', '*', 'Demo10_CaveSpring', 'scripts', 'seedance_images.py'))[0])
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
m.OUT = os.path.join(ROOT, 'assets', 'art')
m.LOG = os.path.join(ROOT, 'project', 'seedance_log.json')
STYLE_REF = os.path.join(m.OUT, 'style_ref.png')
CHAR_REF = os.path.join(m.OUT, 'ref_saku.png')

LOOK = ("Art style: soft modern anime illustration, thin coloured lineart, soft cel shading with one soft-edged shadow layer, "
        "romantic otome-game card quality (like a top-tier otome game's love-interest card), clean and calm, not glossy. Realistic adult "
        "proportions (7.5 heads, not chibi). He is EXTREMELY handsome: an idol-level beautiful face, a sharp clear jawline, a straight "
        "nose, long lashes, smooth fair skin, slim and tall with broad shoulders.")
PERSONA = ("Saku, 20, the heir of his family's small Shinto shrine and the viewer's childhood friend: playful and teasing, a mischievous "
           "grin, but tonight at the summer festival he is quietly serious about her.")
FESTIVAL = ("Background: a Japanese summer festival at night — a lantern-lit path of food stalls, rows of glowing red-orange paper "
            "lanterns, a vermilion torii gate softly blurred behind, a deep indigo summer night sky; warm lantern light from the RIGHT, "
            "cool indigo night from the LEFT. Warm vermilion vs deep indigo, soft round bokeh of the lanterns.")
WIDE = "Wide 16:9 illustration. No text, no letters, no logo, no watermark, no speech bubbles, no UI, no writing on lanterns."
AVOID = ("Avoid: chibi, super-deformed, realistic photo, 3D render, extra fingers, deformed hands, readable text, kanji on lanterns, "
         "glossy airbrush, heavy bloom, beard, stubble, rugged or old-looking face, pink / red / lavender / platinum hair, glasses, "
         "a second person, a woman.")

DESIGNS = {
    'design_A': "Look A: soft fluffy chestnut-brown hair, medium-short with light bangs, bright honey-brown eyes, a small mole under his "
                "left eye. A deep indigo yukata with a subtle white wave pattern and a white obi; a white fox festival mask tilted on the "
                "side of his head. Holding a round paper uchiwa fan in one hand, turning back to the viewer with a teasing grin. Upper body, centred.",
    'design_B': "Look B: neat dark-brown short hair swept slightly back, a few strands on his forehead, sharp but warm dark-amber eyes, one "
                "small silver hoop earring in his right ear. A plain off-white linen yukata with thin indigo stripes and a navy obi, "
                "sleeves loosely rolled. Resting an uchiwa fan on his shoulder, looking at the viewer with a confident, playful smile. Upper body, centred.",
    'design_C': "Look C: chestnut-brown hair, slightly long, tied in a small low ponytail with loose side locks framing his face, gentle "
                "light-brown eyes. A vermilion festival happi coat (he helps run the shrine festival) open over a black jinbei top, a "
                "white tenugui towel loosely around his neck. Holding an uchiwa fan, leaning toward the viewer with a cheeky, bright smile. Upper body, centred.",
}


def upload_once(path, cache):
    p = os.path.join(ROOT, 'project', cache)
    if os.path.exists(p) and time.time() - os.path.getmtime(p) < 1800: return json.load(open(p))['url']
    u = m.upload([path])[0]; json.dump({'url': u}, open(p, 'w')); return u


def gen(name, text, url=None, tag='d30'):
    dst = os.path.join(m.OUT, name + '.png')
    if os.path.exists(dst): print('exists', name); return
    log = json.load(open(m.LOG)) if os.path.exists(m.LOG) else {}
    body = {'model': 'gpt-image-2', 'mode': 'image-to-image' if url else 'text-to-image', 'prompt': text,
            'parameters': {'resolution': '2K', 'aspect_ratio': '16:9'}, 'max_cost_credits': 40}
    if url: body['inputs'] = [{'type': 'image', 'url': url}]
    n = log.get(name, {}).get('variant', 0) + 1
    idem = f'moheat-{tag}-{name}-v{n}'.replace('_', '-')
    g = m.unwrap(m.call('POST', '/images', body, {'Idempotency-Key': idem}))
    print(f'[{name}] generation {g["id"]} cost {g.get("credits")}', flush=True)
    log[name] = {'generation': g['id'], 'idempotency_key': idem, 'variant': n}; json.dump(log, open(m.LOG, 'w'), indent=1)
    while True:
        time.sleep(10)
        r = m.unwrap(m.call('GET', f'/generations/{g["id"]}'))
        if r['status'] in ('pending', 'processing'): continue
        if r['status'] != 'success': print(f'  {name} {r["status"]}: {r.get("error")}', flush=True); return
        tmp = dst + '.part'; urllib.request.urlretrieve(r['outputs'][-1]['url'], tmp); os.replace(tmp, dst); print('  saved', name, flush=True); return


def style_url():
    """One upload try (guide §5.3): a long 429 / 401 → text-to-image instead of waiting."""
    os.makedirs(m.OUT, exist_ok=True)
    if not os.path.exists(STYLE_REF):
        shutil.copy(glob.glob(os.path.join(ROOT, '..', 'Demo12_LateCall', 'assets', 'art', 'style_3_softcel.png'))[0], STYLE_REF)
    real_sleep = m.time.sleep
    def no_long_wait(s):
        if s > 60: raise RuntimeError(f'rate-limited, Retry-After {s}s')
        real_sleep(s)
    m.time.sleep = no_long_wait
    try:
        return upload_once(STYLE_REF, 'style_url.json')
    except (Exception, SystemExit) as e:
        print('upload unavailable → text-to-image:', e, flush=True); return None
    finally:
        m.time.sleep = real_sleep


def designs(names):
    print('balance:', m.unwrap(m.call('GET', '/credits/balance')), flush=True)
    url = style_url()
    head = ['Image 1 is the STYLE reference only (copy its drawing style, not its character).'] if url else []
    for n in names or list(DESIGNS):
        gen(n, '\n\n'.join(head + [LOOK, PERSONA, DESIGNS[n], FESTIVAL, WIDE, AVOID]), url)
    print('balance:', m.unwrap(m.call('GET', '/credits/balance')))

SAKU = ("Saku: the exact man from image 1 — soft fluffy chestnut-brown hair, medium-short with light bangs, bright honey-brown eyes, a "
        "small mole under his left eye, a deep indigo yukata with a subtle white wave pattern and a white obi, a white fox festival mask "
        "tilted on the side of his head, a round indigo paper uchiwa fan with a white wave design. 20, the viewer's childhood friend: "
        "extremely handsome, playful and teasing, tonight quietly serious about her.")
POV = ("CAMERA: first-person view of the viewer (a young woman in a yukata) at eye level — she is never shown except at most her hand. "
       "He is the only person in focus. Keep the lower 20% of the picture simple for subtitles; no hands across his face.")
STALLS = ("Background: a Japanese summer festival street at night — rows of glowing red-orange paper lanterns, food stalls with warm "
          "light, a yakisoba stall's hot iron griddle steaming on the RIGHT, a softly blurred crowd in yukata, a vermilion torii far behind, "
          "a deep indigo sky. Warm vermilion vs deep indigo, soft round lantern bokeh.")
STEPS = ("Background: the old stone steps up to a small shrine at night, away from the crowd — mossy stone lanterns, tall cedar trees, a "
         "vermilion torii behind, the festival's red-orange lantern lights glowing softly below in the distance, fireflies of bokeh, a deep "
         "indigo summer night sky. Quiet, cooler night air, warm lantern light from below-right.")
SCENES = {
    'saku_stalls': [SAKU, "In the middle of the crowded festival street he has turned back toward the viewer, centred, about one metre "
                    "away, reaching out one open hand toward her at chest height (palm up, offering to hold hands so they don't get "
                    "separated), the uchiwa tucked in his obi, a teasing but caring grin. Upper body.", STALLS, POV, WIDE],
    'saku_fan': [SAKU, "Sitting next to the viewer on the stone steps, on her LEFT: his face and shoulders in the LEFT third of the frame "
                 "(face between 12% and 40% of the width), turned toward her, gently fanning her with the round uchiwa held out at the "
                 "level of her face on the right side of his body (the fan does not cover his face), a soft relaxed smile, his hair "
                 "lifted slightly by the breeze. Upper body.", STEPS, POV, WIDE],
    'saku_kakigori': [SAKU, "Sitting close in front of the viewer on the stone steps, slightly left of centre, holding a paper cup of "
                      "matcha shaved ice (green syrup, sweet red beans, white condensed milk) in one hand at chest height and holding "
                      "out a small spoonful toward the viewer's mouth with the other, below his chin, cold mist from the ice, a cheeky "
                      "'say aah' grin. Upper body.", STEPS, POV, WIDE],
    'saku_breath_R': [SAKU, "Very close: he leans in to the viewer's RIGHT ear, so he is at the RIGHT edge of the picture. The LEFT 50% of "
                      "the frame shows only the blurred background; his face is on the RIGHT side (from 55% to 90% of the width), seen in "
                      "three-quarter profile facing LEFT toward the centre, lips softly pursed as if blowing a cool breath into her ear, "
                      "eyes half closed with a mischievous look, a few hair strands moving; the left half shows the softly blurred stone "
                      "steps and distant lantern lights. Intimate.", STEPS, POV, WIDE],
    'saku_whisper_L': [SAKU, "Fireworks are bursting in the night sky behind, their coloured light on his face. Very close: he leans in to "
                       "the viewer's LEFT ear to say something again over the noise. His face is large on the LEFT side of the frame "
                       "(between 15% and 50% of the width), three-quarter profile, eyes half closed, serious and gentle, lips near her "
                       "ear; the right half shows big golden and vermilion firework blossoms over the shrine's cedar trees. Intimate.", STEPS, POV, WIDE],
    'saku_fireworks': [SAKU, "Sitting beside the viewer on the stone steps, slightly left of centre, he has turned from the fireworks to "
                       "look straight at her with a serious, tender smile and a faint blush, the multicoloured light of large fireworks "
                       "in the sky behind him reflected in his eyes. Upper body.", STEPS, POV, WIDE],
}


def ref_url():
    """the newest generation that is still listed (output urls of older ones expire, guide §11): first design_A, then each new still."""
    log = json.load(open(m.LOG))
    for name in sorted(log, key=lambda k: -os.path.getmtime(os.path.join(m.OUT, k + '.png')) if os.path.exists(os.path.join(m.OUT, k + '.png')) else 0):
        if not (name == 'design_A' or name in SCENES): continue
        try: return m.unwrap(m.call('GET', f'/generations/{log[name]["generation"]}', tries=1))['outputs'][-1]['url']
        except SystemExit: continue
    raise SystemExit('no reference url left: wait for uploads or use the website')


def scenes(names):
    """image-to-image from the chosen look's OUTPUT url (uploads rate-limited; that url is fresh only while the generation is listed)."""
    print('balance:', m.unwrap(m.call('GET', '/credits/balance')), flush=True)
    for n in names or list(SCENES):
        gen(n, '\n\n'.join(['Image 1 is the STYLE and CHARACTER reference.', LOOK] + SCENES[n] + [AVOID]), ref_url())
    print('balance:', m.unwrap(m.call('GET', '/credits/balance')))

# ---------------------------------------------------------------- the layered set (user 2026-11-08: same final look and method as Gaku,
# Demo27 — DEMO_DESIGN_GUIDE §6.2 / §6.3): empty background plates, Saku on a plain grey background per pose, drawn expression variants
# (talk = mouth open, blink = eyes closed) as edits of each pose. Bases are text-to-image; every edit / new pose references a FRESH output
# URL of an earlier generation (uploads rate-limited), all in ONE batch so no reference expires (guide §11).
SAKU_T = ("Saku, 20, the heir of a small Shinto shrine and the viewer's childhood friend: soft fluffy chestnut-brown hair, medium-short with "
          "light bangs, bright honey-brown eyes, a small mole under his left eye, a deep indigo yukata with a subtle white wave pattern and a "
          "white obi, a white fox festival mask (red markings) tilted on the RIGHT side of his head (the picture's right). Extremely handsome, "
          "playful and teasing, tonight quietly serious.")
PLAIN = ("Plain flat light-grey studio background (#c8c8c8), completely empty: no floor line, no shadow on the background, no scenery, "
         "no props except what he holds. Lighting as at a summer festival night: warm orange lantern key light from the RIGHT, cool indigo "
         "rim light from the LEFT, soft contrast.")
FRAME = ("Eye-level camera about one metre in front of him. Upper body from the waist up, the whole head and shoulders in frame with some "
         "space above the head. Mouth closed, eyes open. Hands and props stay below his chin and never cross his face.")
EDIT = ("Edit this exact image. Keep EVERYTHING identical — same pose, framing, size, position, hair strands, clothes, colours, lighting "
        "and background — and change ONLY {what}. Do not move, zoom or crop the picture.")
SAME_FACE = ("Keep his face, head, hair, fox mask, expression and position EXACTLY as they are (same pixels), the same plain grey background "
             "and lighting; do not zoom or crop. Change only his arms / hands and what they hold: {what}")
REF = "Image 1 is the CHARACTER and STYLE reference: the exact same man, outfit and art style."
LOOK_BG = LOOK.split(' Realistic adult')[0]
TALK = "his mouth: slightly open as if speaking, a small natural opening, teeth barely visible"
BLINK = "his eyes: gently closed in a natural blink (eyelids down, lashes visible); the hair stays exactly as it is"
JOBS = {   # name: (prompt parts, reference job or None)
    'saku_ref': ([LOOK, SAKU_T, "Standing, facing the viewer straight on, relaxed, the round indigo uchiwa fan tucked into his obi, a "
                  "teasing, warm grin, looking straight at the viewer. Centred.", FRAME, PLAIN, WIDE, AVOID], None),
    'bg_stalls': ([LOOK_BG, "Background plate only, NO people in the foreground: " + STALLS.split(':', 1)[1].strip(), "Eye-level view. The "
                   "centre of the picture is an open stretch of the lantern-lit path (a person will be placed there later); the crowd is "
                   "only small and far away, softly blurred.", WIDE, "Avoid: people in the foreground, text, kanji, chibi, 3D render, photo."], None),
    'bg_steps': ([LOOK_BG, "Background plate only, NO people: " + STEPS.split(':', 1)[1].strip(), "Eye-level view as if sitting on the "
                  "steps; the left and centre of the picture are calm (a person will be placed there later).", WIDE,
                  "Avoid: people, text, kanji, chibi, 3D render, photo."], None),
    'bg_steps_fw': ([EDIT.format(what="the sky: large golden, vermilion and violet firework blossoms now burst in the night sky above the "
                     "cedar trees in the upper right half, their colourful glow faintly lighting the scene")], 'bg_steps'),
    'saku_ref_talk': ([EDIT.format(what=TALK)], 'saku_ref'),
    'saku_ref_blink': ([EDIT.format(what=BLINK)], 'saku_ref'),
    'saku_reach': ([SAME_FACE.format(what="he now reaches one open hand out toward the viewer at chest height on the RIGHT side of the "
                    "picture, palm up, offering to hold hands; the uchiwa stays in his obi.")], 'saku_ref'),
    'saku_fan': ([REF, LOOK, SAKU_T, "He sits on stone steps (not shown) beside the viewer, his body turned three-quarters toward the "
                  "RIGHT side of the picture (toward the viewer), looking at her with a soft relaxed smile, holding the round indigo uchiwa "
                  "fan out to the RIGHT at shoulder height, fanning her (the fan is beside, never in front of, his face).",
                  FRAME, PLAIN, WIDE, AVOID], 'saku_ref'),
    'saku_fan_talk': ([EDIT.format(what=TALK)], 'saku_fan'),
    'saku_fan_blink': ([EDIT.format(what=BLINK)], 'saku_fan'),
    'saku_kakigori': ([SAME_FACE.format(what="instead of the fan he now holds a paper cup of matcha shaved ice (green syrup, red beans, "
                       "white condensed milk) at chest height in one hand, and holds out a small spoonful toward the RIGHT side of the "
                       "picture (toward the viewer's mouth) with the other, below his chin; faint cold mist from the ice.")], 'saku_fan'),
    'saku_fw': ([SAME_FACE.format(what="the uchiwa fan now rests loosely in one hand on his lap, both hands low and relaxed.")], 'saku_fan'),
    'saku_breath': ([REF, LOOK, SAKU_T, "An intimate close-up event illustration: he leans in from the RIGHT toward the listener's right ear, "
                     "his face large and in three-quarter profile facing LEFT, lips softly pursed as if blowing a cool breath, eyes half "
                     "closed with a mischievous look.", PLAIN, WIDE, AVOID], 'saku_ref'),
    'saku_breath_talk': ([EDIT.format(what="his lips: parted a little, as in the middle of a whispered word")], 'saku_breath'),
    'saku_whisper': ([REF, LOOK, SAKU_T, "An intimate close-up event illustration: he leans in from the LEFT toward the listener's left ear, "
                      "his face large and in three-quarter profile facing RIGHT, eyes half closed, serious and gentle, lips slightly apart "
                      "near the ear.", PLAIN, WIDE, AVOID], 'saku_ref'),
    'saku_whisper_talk': ([EDIT.format(what="his lips: parted a little more, as in the middle of a whispered word")], 'saku_whisper'),
}
ORDER = ['saku_ref', 'saku_ref_talk', 'saku_ref_blink', 'saku_reach', 'saku_fan', 'saku_breath', 'saku_whisper',   # saku_ref's url first
         'saku_fan_talk', 'saku_fan_blink', 'saku_kakigori', 'saku_fw', 'saku_breath_talk', 'saku_whisper_talk', 'bg_steps', 'bg_steps_fw', 'bg_stalls']
URLS = {}   # job → its output url, kept from the moment it was made (GET /generations stops answering after ~10 min)


def gen_url(name, text, ref=None):
    """gen() + remember the output url; the reference = the stored url of `ref` (fresh: made minutes ago in this batch)."""
    dst = os.path.join(m.OUT, name + '.png')
    if os.path.exists(dst) and name in URLS: return
    if os.path.exists(dst): print('exists', name); return
    url = URLS.get(ref) if ref else None
    if ref and not url: print(f'  {name}: no fresh url for {ref} → skipped (redo {ref} first, or use the website)'); return
    gen(name, text, url)
    log = json.load(open(m.LOG)); g = log.get(name, {}).get('generation')
    if g and os.path.exists(dst):
        try: URLS[name] = m.unwrap(m.call('GET', f'/generations/{g}', tries=3))['outputs'][-1]['url']
        except SystemExit: pass


def layers(names):
    print('balance:', m.unwrap(m.call('GET', '/credits/balance')), flush=True)
    for n in names or ORDER:
        parts, ref = JOBS[n]
        gen_url(n, '\n\n'.join(parts), ref)
    print('balance:', m.unwrap(m.call('GET', '/credits/balance')))

# fixes (2026-11-08): the first close-ups drew the listener's hand / hair in the picture (POV: she is never shown) → edits that remove
# them. The talk variants stay the originals (only their mouth area is used as a patch, and it has no hand in it).
CLEAN = ("the other person: remove the listener completely — no second person, no woman's head, hair, ear, shoulder or hand anywhere; "
         "remove any hand touching or resting on anything; where they were, show the same plain flat light-grey background or his own "
         "yukata continuing naturally; his own arms hang down out of the picture")
JOBS.update({
    'saku_whisper2': (["This is an inpainting-style clean-up of this exact picture: the man's head, face, fox mask, hair, eyes, lips, yukata, "
                       "pose, size and position must stay pixel-identical — do NOT redraw him, do NOT change the camera. The ONLY change: on the "
                       "RIGHT edge of the picture there is a second person's head, hair and ear, and a hand near it — paint all of those over "
                       "with the same plain flat light-grey background (#c8c8c8). If his own hand was there, it simply disappears (his arm "
                       "ends out of frame below). Also close his lips gently (only just touching, calm)."], 'saku_whisper_talk'),
    'saku_breath2': ([EDIT.format(what=CLEAN + "; and his lips: softly pursed as if blowing a cool breath (mouth not open)")], 'saku_breath_talk'),
})

# the left-ear close-up again with room around the head (a cut-out must not touch the picture's top / sides, or a straight edge shows)
JOBS.update({
    'saku_whisper3': ([REF, LOOK, SAKU_T, "An intimate close-up event illustration: he leans in toward the listener's LEFT ear, so he is on the "
                       "LEFT side of the picture: his head and shoulders occupy the left 55% of the picture, face in three-quarter profile "
                       "facing RIGHT (toward the centre), eyes half closed, serious and gentle, lips gently closed. The WHOLE head and the "
                       "whole fox mask are inside the picture with clear grey space above the head and on both sides; only the shoulders "
                       "reach the bottom edge. No second person, no hands.", PLAIN, WIDE, AVOID], 'saku_whisper2'),
    'saku_whisper3_talk': ([EDIT.format(what="his lips: parted a little, as in the middle of a whispered word")], 'saku_whisper3'),
})


def fix(names):
    log = json.load(open(m.LOG))
    for n in names:
        parts, ref = JOBS[n]
        if ref not in URLS: URLS[ref] = m.unwrap(m.call('GET', f'/generations/{log[ref]["generation"]}', tries=2))['outputs'][-1]['url']
        gen_url(n, '\n\n'.join(parts), ref)


if __name__ == '__main__':
    cmd, rest = (sys.argv[1], sys.argv[2:]) if len(sys.argv) > 1 else ('designs', [])
    {'designs': designs, 'scenes': scenes, 'layers': layers, 'fix': fix}[cmd](rest)
