"""Seedance (GPT Image 2) for the late-night call demo — Demo 10's API client loaded by path.

  python3 scripts/seedance.py design          # the 5 character design candidates (text-to-image) → assets/art/design_*.png
  python3 scripts/seedance.py <job> [...]     # jobs from project/seedance_jobs.json (image-to-image with refs)

Key: ~/.seedance_key. Raw PNGs in assets/art/ stay out of git. Idempotency keys make retries free.
"""
import importlib.util, json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location('d10_seedance', os.path.join(os.path.dirname(ROOT), '../for-kids/Demo10_CaveSpring', 'scripts', 'seedance_images.py'))
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
m.JOBS = os.path.join(ROOT, 'project', 'seedance_jobs.json')
m.OUT = os.path.join(ROOT, 'assets', 'art')
m.LOG = os.path.join(ROOT, 'project', 'seedance_log.json')

STYLE = ("Beautiful Japanese anime illustration in the style of top-quality otome game / idol rhythm game card art. NOT chibi, NOT "
         "super-deformed: realistic adult proportions (about 7.5 heads tall), a handsome bishounen face with a defined jaw, delicate "
         "clean linework, soft cel shading with smooth gradients, glossy detailed hair strands, luminous eyes with fine highlights, "
         "gentle bloom and soft rim light. Original character, not a real person.")
SHOT = ("Upper-body portrait from the waist up, facing the viewer in a slight three-quarter view, holding a smartphone to his ear, "
        "looking straight at the viewer with a gentle, intimate smile, as if talking to you on a late-night phone call. Background: a "
        "softly blurred night city with bokeh lights in deep blue and violet. No text, no logo, no watermark, no signature, no frame.")
AVOID = "Avoid: chibi, super-deformed, big head, childish face, realistic photo, 3D render, extra fingers, deformed hands, two phones, text."
REN = "Ren, a 24-year-old Japanese male idol, the lead vocalist of a popular idol group."
DESIGNS = {
    'design_A_silver': "Silver-white hair in a soft layered wolf cut with slightly long bangs, pale lavender-grey eyes, a small silver ear cuff; black high-neck knit under a long charcoal coat. Cool on stage, gentle and a little shy in private.",
    'design_B_black': "Glossy black hair, neat with slightly long bangs over one eye, deep navy-blue eyes, a small beauty mark under the left eye; a white shirt with an open collar under a soft beige cardigan. Calm, mature, quietly sweet.",
    'design_C_honey': "Fluffy honey-brown hair, warm amber eyes, a bright puppy-like smile showing a little canine tooth; an oversized cream hoodie with the hood down, a thin silver necklace. Sunny, playful, affectionate.",
    'design_D_rose': "Ash-pink hair in a half-up style, rose-red eyes, long eyelashes; a white idol stage jacket with gold trims and a loosened ribbon tie, as if just off stage. Princely, elegant, a little teasing.",
    'design_E_wine': "Wine-red hair swept back with a few loose strands, sharp golden eyes, small black stud earrings; a black leather jacket over a plain white tee. Looks like a bad boy rock vocalist, but his smile for you is soft.",
}


def design(names):
    bal = m.unwrap(m.call('GET', '/credits/balance')); print('balance:', bal)
    log = json.load(open(m.LOG)) if os.path.exists(m.LOG) else {}
    for name in names:
        dst = os.path.join(m.OUT, name + '.png')
        if os.path.exists(dst): print('exists', name); continue
        body = {'model': 'gpt-image-2', 'mode': 'text-to-image', 'prompt': '\n\n'.join([STYLE, REN, DESIGNS[name], SHOT, AVOID]),
                'parameters': {'resolution': '1K', 'aspect_ratio': '3:4'}, 'max_cost_credits': 30}
        idem = f'moheat-d12-{name}-v1'.replace('_', '-')
        g = m.unwrap(m.call('POST', '/images', body, {'Idempotency-Key': idem}))
        print(f'[{name}] generation {g["id"]} cost {g.get("credits")}')
        log[name] = {'generation': g['id'], 'idempotency_key': idem}; json.dump(log, open(m.LOG, 'w'), indent=1)
        m.wait_save(g['id'], dst, name)
    print('balance:', m.unwrap(m.call('GET', '/credits/balance')))


# ---------------------------------------------------------------- style tests: design A redrawn in different cel styles
CEL = ("Hand-drawn look, NOT a glossy AI illustration: FLAT cel shading with hard-edged shadow shapes (one shadow tone, at most one "
       "highlight tone), NO airbrush gradients, NO bloom, NO glow, NO lens flare, NO over-detailed hair strands, NO plastic skin "
       "shine. Clean confident lineart with consistent line weight, simple readable shapes, a limited colour palette, natural "
       "relaxed hands with five fingers. Keep realistic adult proportions (not chibi).")
CHAR_A = ("Image 1 is the CHARACTER reference: keep this exact young man — silver-white soft layered wolf-cut hair, pale lavender-grey "
          "eyes, small silver ear cuff, black high-neck knit, long charcoal coat — and the same pose: upper body, holding a smartphone "
          "to his ear, gentle intimate smile at the viewer, night city behind him. Redraw him completely in the art style below.")
STYLES = {
    'style_1_tvanime': "Style: a modern Japanese TV anime key frame (2010s–2020s studio anime). Crisp thin black lineart, two-tone cel shading, clean flat colours, a simple painted night-city background slightly out of focus, like a screenshot from a high-budget anime episode.",
    'style_2_retro90s': "Style: a 1990s hand-painted anime cel. Slightly thicker warm-brown lineart, flat cel colours with hard shadows, a muted retro palette (dusty violet, teal, cream), subtle film grain and VHS softness, a simple painted city background with flat window lights, like a 90s shoujo anime still.",
    'style_3_softcel': "Style: soft modern cel animation with a light, airy palette. Thin coloured lineart (dark lavender instead of black), flat pastel colours with one soft-edged but still flat shadow tone, a simple pale night background with a few round city lights, gentle and clean, like a romantic anime film.",
    'style_4_graphic': "Style: a bold graphic idol MV poster. Thick clean black outlines, very flat colours from a limited palette (deep navy, silver, lavender, one hot-pink accent), hard graphic shadows, a simplified flat night-city silhouette background with a few shapes, stylish and striking.",
}


CHAR_A_FREE = ("Image 1 is the CHARACTER reference: keep this exact young man — silver-white soft layered wolf-cut hair, pale lavender-grey "
               "eyes, small silver ear cuff, black high-neck knit, long charcoal coat. Pose and composition are NEW (described below); redraw "
               "him completely in the art style below.")
STYLES.update({   # round 2: all from the graphic MV direction (thick clean outlines, flat colour), each with its own mood + a new composition
    'style_5_citypop': "Style: 1980s Japanese city-pop record-sleeve illustration. Thick clean outlines, perfectly flat colours, a pastel-neon palette (mint, peach, lilac, sky blue), crisp geometric shadows. Composition: he leans on a balcony railing at dusk, phone at his ear, smiling over his shoulder at the viewer; a flat simplified city skyline and a big pale moon behind.",
    'style_6_noir': "Style: high-contrast graphic duotone. Thick black outlines and big solid black shadow shapes, only two colours plus black: deep midnight blue and silver-white, one tiny pink accent on the phone screen glow. Composition: close-up, his face lit from below by the phone screen in a dark room, looking at the viewer through his bangs, intimate and a little mysterious.",
    'style_7_risograph': "Style: risograph / screen-print poster. Flat ink layers in three colours (fluorescent pink, teal, warm off-white paper), slight misregistration between layers, fine halftone dots in the shadows, thick confident outlines, visible paper texture. Composition: he sits on the edge of a bed at night with his knees up, phone at his ear, soft smile, a window with city lights behind.",
    'style_8_popart': "Style: bold pop anime key art like a stylish game menu screen. Very thick black outlines, flat saturated colours (lavender, black, white and a strong hot-pink accent), sharp angular shadows, a few graphic shapes and stripes in the background. Composition: dynamic three-quarter view, walking on a night street with one hand in his coat pocket and the phone at his ear, turning his head to smile at the viewer.",
})


def styles(names):
    print('balance:', m.unwrap(m.call('GET', '/credits/balance')))
    log = json.load(open(m.LOG)) if os.path.exists(m.LOG) else {}
    url = m.upload([os.path.join(m.OUT, 'design_A_silver.png')])[0]
    for name in names:
        dst = os.path.join(m.OUT, name + '.png')
        if os.path.exists(dst): print('exists', name); continue
        char = CHAR_A_FREE if int(name.split('_')[1]) >= 5 else CHAR_A
        body = {'model': 'gpt-image-2', 'mode': 'image-to-image', 'prompt': '\n\n'.join([char, STYLES[name], CEL, AVOID + ' Avoid: glossy, airbrushed, bloom, glow, over-rendered, hyper-detailed.']),
                'inputs': [{'type': 'image', 'url': url}], 'parameters': {'resolution': '1K', 'aspect_ratio': '3:4'}, 'max_cost_credits': 30}
        idem = f'moheat-d12-{name}-v1'.replace('_', '-')
        g = m.unwrap(m.call('POST', '/images', body, {'Idempotency-Key': idem}))
        print(f'[{name}] generation {g["id"]} cost {g.get("credits")}')
        log[name] = {'generation': g['id'], 'idempotency_key': idem}; json.dump(log, open(m.LOG, 'w'), indent=1)
        m.wait_save(g['id'], dst, name)
    print('balance:', m.unwrap(m.call('GET', '/credits/balance')))


# ---------------------------------------------------------------- the game art (style 3 = the user's pick), 16:9 full frames at 2K
REF4 = os.path.join(ROOT, 'assets', 'art', 'style_3_softcel.png')   # the user's pick: style 3 (soft cel)
LOOK4 = ("Art style EXACTLY like image 1 (the user's chosen style): soft modern cel animation with a light, airy palette — thin "
         "coloured lineart (dark lavender instead of black), flat pastel colours with one soft-edged but still flat shadow tone, simple "
         "clean backgrounds with a few round lights, gentle and romantic like an anime film. Hand-drawn feel, NOT glossy: no airbrush "
         "gradients, no bloom, no heavy glow, no over-detailed strands. "
         "Realistic adult proportions (not chibi).")
REN4 = ("Ren: the exact young man from image 1 — silver-white soft layered wolf-cut hair, pale lavender-grey eyes, small silver ear "
        "cuff, black high-neck knit, long charcoal coat.")
WIDE = "Wide 16:9 game scene. No text, no logo, no watermark, no speech bubbles, no UI."
FACE = ("Image 2 is the base picture: the SAME picture — same pose, same framing, same size, same position, same background, same "
        "lighting — ONLY his face changes: ")
STREET = ("Medium shot from the chest up: Ren stands on a quiet snowy city street at night after his concert, under a street lamp, "
          "holding a smartphone to his ear, talking to the viewer on the phone with a gentle smile, light snow falling, flat simplified "
          "buildings with lit windows behind him. Ren is placed in the RIGHT half of the picture; the LEFT third is quiet background.")
CLOSE = ("Intimate close-up: Ren's face very near the viewer, slightly tilted, as if whispering into the viewer's ear through the phone, "
         "half-lidded soft eyes, faint pink blush, the phone against his ear, dim night light from a window. His face is a little right of centre.")
DOOR = ("Ren stands in the open front door of the viewer's apartment at night, seen from inside: snow on his silver hair and on the "
        "shoulders of his coat, cheeks pink from the cold, his phone lowered in one hand, a shy happy smile, warm light from inside on him, "
        "the snowy night corridor behind him. Ren centred, from the waist up.")
ROOM = ("The viewer's small dark bedroom at night, seen from the bed: on the LEFT a closed bedroom door; on the RIGHT a window with "
        "closed curtains and faint city light through them; a small nightstand with a lamp turned off in the foreground right. No people.")
SCENES = {   # name: (refs, prompt)
    'ren_call': ([REF4], [LOOK4, REN4, STREET, WIDE]),
    'ren_call_talk': ([REF4, 'ren_call'], [LOOK4, FACE + 'mouth open, talking warmly, eyes open.', WIDE]),
    'ren_call_blink': ([REF4, 'ren_call'], [LOOK4, FACE + 'both eyes closed (relaxed closed eyes), mouth closed in a soft smile.', WIDE]),
    'ren_call_shy': ([REF4, 'ren_call'], [LOOK4, FACE + 'embarrassed and happy: cheeks blushing pink, eyes looking away to the side, a shy small smile.', WIDE]),
    'ren_close': ([REF4], [LOOK4, REN4, CLOSE, WIDE]),
    'ren_close_talk': ([REF4, 'ren_close'], [LOOK4, FACE + 'lips slightly parted, whispering, same half-lidded eyes.', WIDE]),
    'ren_door': ([REF4], [LOOK4, REN4, DOOR, WIDE]),
    'ren_door_talk': ([REF4, 'ren_door'], [LOOK4, FACE + 'mouth open, talking, a shy happy smile.', WIDE]),
    'bg_room': ([REF4], [LOOK4, ROOM, WIDE]),
    'bg_room_open': ([REF4, 'bg_room'], [LOOK4, "Image 2 is the same room: EXACTLY the same composition. Now the curtains and the window on the RIGHT are wide open, snow is falling outside, cold blue light and a few snowflakes come in, the curtains move in the wind.", WIDE]),
}


def scenes(names):
    print('balance:', m.unwrap(m.call('GET', '/credits/balance')))
    log = json.load(open(m.LOG)) if os.path.exists(m.LOG) else {}
    for name in names:
        dst = os.path.join(m.OUT, name + '.png')
        if os.path.exists(dst): print('exists', name); continue
        refs, parts = SCENES[name]
        paths = [r if os.path.isabs(r) else os.path.join(m.OUT, r + '.png') for r in refs]
        urls = m.upload(paths)
        intro = 'Image 1 is the STYLE and CHARACTER reference.' + (' Image 2 is the base picture.' if len(paths) > 1 else '')
        body = {'model': 'gpt-image-2', 'mode': 'image-to-image', 'prompt': '\n\n'.join([intro] + parts + [AVOID + ' Avoid: glossy, airbrushed, bloom, glow, over-rendered.']),
                'inputs': [{'type': 'image', 'url': u} for u in urls], 'parameters': {'resolution': '2K', 'aspect_ratio': '16:9'}, 'max_cost_credits': 40}
        idem = f'moheat-d12-{name}-s3-v1'.replace('_', '-')   # s3: style 3 (the first run used style 4 by mistake)
        g = m.unwrap(m.call('POST', '/images', body, {'Idempotency-Key': idem}))
        print(f'[{name}] generation {g["id"]} cost {g.get("credits")}')
        log[name] = {'generation': g['id'], 'idempotency_key': idem}; json.dump(log, open(m.LOG, 'w'), indent=1)
        m.wait_save(g['id'], dst, name)
    print('balance:', m.unwrap(m.call('GET', '/credits/balance')))


# ---------------------------------------------------------------- animation: seamless loops (first frame = last frame = the base picture)
# The base picture is passed by the URL of its own generation in this account (no upload needed).
VLOOK = ("Japanese anime cel animation. Keep EXACTLY the art style, the character, the framing, the colours and the background of the "
         "input image. Locked-off camera: no zoom, no pan, no camera shake. The clip starts and ends on exactly this frame, so it loops "
         "seamlessly. Gentle, natural, subtle motion only; the face keeps its exact proportions.")
VAVOID = ("Avoid: morphing, face distortion, changing face shape, changing hair style, extra fingers, warped hands, flicker, new objects, "
          "text, subtitles, logo, watermark, camera movement, fast motion.")
VIDEOS = {   # name: (base generation, seconds, motion)
    'v_call_idle': ('ren_call', 5, "He listens on the phone with a gentle smile, mouth closed. Slow natural breathing, one natural blink, a few hair strands and the coat collar sway slightly in the cold wind, snow keeps falling softly."),
    'v_call_talk': ('ren_call_talk', 5, "He talks softly and warmly into the phone: natural mouth movement as if speaking Japanese, small relaxed nods, a natural blink, hair strands sway slightly, snow keeps falling."),
    'v_call_shy': ('ren_call_talk', 5, "He laughs shyly while talking on the phone: glances away to the side for a moment with a light pink blush only on his cheeks, a small embarrassed laugh, then looks back at the viewer with a soft smile. Snow keeps falling."),
    'v_close_whisper': ('ren_close', 5, "He whispers softly into the phone, very close: lips moving slightly as he whispers, slow half-lidded blinks, a tiny tilt of the head, gentle breathing, the city lights behind twinkle softly."),
    'v_door_idle': ('ren_door', 5, "He stands at the open door a little out of breath from running: shoulders rise and fall, small puffs of white breath in the cold air, snowflakes drift behind him, a shy happy smile, one natural blink."),
    'v_door_talk': ('ren_door', 5, "He talks happily and a little shyly: natural mouth movement as if speaking, a small laugh, white breath in the cold air, snowflakes drift behind him, a natural blink."),
    'v_room_open': ('bg_room_open', 5, "No people. The sheer curtains billow gently in the wind from the open window, snow falls outside and a few flakes drift into the dark room, the city lights twinkle."),
}


def videos(names, model='seedance-2.5-lite'):
    print('balance:', m.unwrap(m.call('GET', '/credits/balance')))
    log = json.load(open(m.LOG)) if os.path.exists(m.LOG) else {}
    os.makedirs(os.path.join(ROOT, 'assets', 'video'), exist_ok=True)
    for name in names:
        dst = os.path.join(ROOT, 'assets', 'video', name + '.mp4')
        if os.path.exists(dst): print('exists', name); continue
        base, sec, motion = VIDEOS[name]
        url = m.unwrap(m.call('GET', f"/generations/{log[base]['generation']}"))['outputs'][0]['url']
        body = {'model': model, 'mode': 'image-to-video', 'prompt': '\n\n'.join([VLOOK, motion, VAVOID]),
                'inputs': [{'type': 'image', 'url': url}, {'type': 'image', 'url': url}],
                'parameters': {'resolution': '720p', 'aspect_ratio': '16:9', 'duration_seconds': sec, 'image_mode': 'first-last-frame'}, 'max_cost_credits': 80}
        print(name, 'quote', m.unwrap(m.call('POST', '/quotes', body)))
        idem = f'moheat-d12-{name}-{model}-v1'.replace('_', '-').replace('.', '')
        g = None
        for path in ('/videos', '/generations'):
            try: g = m.unwrap(m.call('POST', path, body, {'Idempotency-Key': idem}, tries=200)); break   # 429 = another job on the account: wait in line
            except SystemExit as e:
                if '404' not in str(e) and '405' not in str(e): raise
        print(f'[{name}] generation {g["id"]} cost {g.get("credits")}')
        log[name] = {'generation': g['id'], 'idempotency_key': idem}; json.dump(log, open(m.LOG, 'w'), indent=1)
        wait_video(g['id'], dst, name)
    print('balance:', m.unwrap(m.call('GET', '/credits/balance')))


def wait_video(gid, dst, name):
    """video generations report 'expired' as soon as they are done (it is the signed link's state) → download whenever an output exists."""
    import time, urllib.request
    while True:
        time.sleep(12)
        g = m.unwrap(m.call('GET', f'/generations/{gid}'))
        if g.get('outputs'):
            tmp = dst + '.part'; urllib.request.urlretrieve(g['outputs'][0]['url'], tmp); os.replace(tmp, dst); print('  saved', name); return
        if g['status'] in ('pending', 'processing'): print('  …', g['status']); continue
        raise SystemExit(f'  {name} {g["status"]}: {g.get("error")}')


if __name__ == '__main__':
    a = sys.argv[1:]
    if a[:1] == ['video']: videos(a[1:] or list(VIDEOS)); sys.exit()
    if a[:1] == ['scenes']: scenes(a[1:] or list(SCENES)); sys.exit()
    if a[:1] == ['design']: design(a[1:] or list(DESIGNS))
    elif a[:1] == ['style']: styles(a[1:] or list(STYLES))
    else: m.main()
