"""Seedance (GPT Image 2) art for Hinata's handshake event — Demo 10's API client loaded by path (as in Demo 12).

  python3 scripts/seedance.py            # all scenes (skips files that exist)
  python3 scripts/seedance.py hina_booth hina_booth_talk

Character + style reference: assets/art/ref_hinata.png (the user's chosen pink-hair design sheet, copied from Demo16_HandshakeEvent).
Raw PNGs in assets/art/ stay out of git → scripts/prepare_art.py → media/art/*.webp.
"""
import glob, importlib.util, json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location('d10_seedance', glob.glob(os.path.join(ROOT, '..', '..', '*', 'Demo10_CaveSpring', 'scripts', 'seedance_images.py'))[0])   # category folders get renamed
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
m.OUT = os.path.join(ROOT, 'assets', 'art')
m.LOG = os.path.join(ROOT, 'project', 'seedance_log.json')
REF = os.path.join(m.OUT, 'ref_hinata.png')

TEXT_LOOK = ("Beautiful Japanese anime illustration: soft modern anime with a light, airy pastel palette (lavender, blush pink, cream), "
             "thin coloured lineart, soft cel shading, clean shapes, luminous amber eyes, gentle round bokeh lights, romantic otome-game card "
             "quality. NOT chibi: realistic adult proportions, a handsome youthful bishounen face. Original character, not a real person.")
LOOK = ("Art style EXACTLY like image 1 (the user's chosen character sheet): soft modern anime illustration with a light, airy pastel "
        "palette, thin coloured lineart, soft cel shading, clean shapes, gentle bokeh lights. Realistic adult proportions (not chibi).")
HINA = ("Hinata: the exact young man from image 1 — fluffy, messy soft-pink hair with long bangs falling over his eyes, warm amber eyes, "
        "a small cute fang when he smiles, a small silver star stud earring, a thin silver chain necklace with a small tag pendant, an "
        "oversized cream cable-knit cardigan over a plain white T-shirt. A 19-year-old idol: sweet puppy-like smile with something "
        "mischievous behind it.")
BOOTH_BG = ("Background: the handshake booth of an idol event — a backdrop of soft pink and lavender balloons, fairy lights and blurred "
            "bokeh; a small table with a white cloth in front of him.")
WIDE = "Wide 16:9 game scene. No text, no letters, no logo, no watermark, no speech bubbles, no UI."
AVOID = ("Avoid: chibi, super-deformed, realistic photo, 3D render, extra fingers, deformed hands, extra arms, readable text or signs, "
         "glossy airbrush, heavy bloom.")
FACE = ("Image 2 is the base picture: the SAME picture — same pose, same hands, same framing, same size, same position, same background, "
        "same lighting — ONLY his face changes: ")

SCENES = {   # name: (base picture or None, prompt parts)
    'bg_queue': (None, [LOOK, "First-person view standing in the queue of an idol handshake event in a bright, warm event hall: the backs of "
                 "a few fans in line ahead (seen only from behind, faces not visible), low queue ropes on stands, a staff member in a black "
                 "T-shirt seen from behind; far ahead, slightly right of centre, a small booth glowing with pink and lavender balloons and "
                 "fairy lights. On the RIGHT edge of the picture: tall glass entrance doors, a snowy blue evening outside, cold light. "
                 "No visible faces, no readable text.", WIDE]),
    'hina_booth': (None, [LOOK, HINA, "Hinata stands behind the handshake table, leaning slightly forward, holding out his right hand toward "
                   "the viewer for a handshake, a bright sweet smile showing his small fang, eyes on the viewer. From the waist up. "
                   "Hinata is placed in the RIGHT half of the picture; the LEFT third is quiet, softly blurred balloons and lights.", BOOTH_BG, WIDE]),
    'hina_booth_quiet': ('hina_booth', [LOOK, FACE + "mouth CLOSED in a soft sweet smile (lips together, no teeth), eyes open, the same happy look.", WIDE]),
    'hina_booth_blink': ('hina_booth', [LOOK, FACE + "both eyes closed in a relaxed blink, mouth closed in the same sweet smile.", WIDE]),
    'hina_hands': (None, [LOOK, HINA, "Close point-of-view shot: Hinata holds the viewer's hand (a slim woman's hand coming in from the "
                   "bottom of the frame) wrapped between both of his hands, raised near his lips as if about to blow warm breath on it, "
                   "looking up at the viewer through his bangs with a soft, playful smile, a faint blush. His face slightly right of centre, "
                   "hands at the bottom centre.", BOOTH_BG, WIDE]),
    'hina_hands_talk': ('hina_hands', [LOOK, FACE + "lips open, talking softly, the same playful eyes.", WIDE]),
    'hina_lean': (None, [LOOK, HINA, "Very close: Hinata leans in toward the viewer's LEFT ear to whisper a secret. His face is large on the "
                  "LEFT side of the frame, turned three-quarters toward the viewer, half-lidded eyes glancing sideways at the viewer, a small "
                  "dark, knowing smile, one hand raised beside his mouth like shielding a whisper. The RIGHT half is softly blurred booth "
                  "lights. Intimate, a little dangerous.", WIDE]),
    'hina_lean_talk': ('hina_lean', [LOOK, FACE + "lips slightly parted, whispering, the same half-lidded knowing eyes.", WIDE]),
    'hina_wave': (None, [LOOK, HINA, "Hinata behind the handshake table, a little further away, waving goodbye to the viewer with one open "
                  "hand raised high, a big bright smile with his small fang, leaning a bit to one side. From the waist up, centred.", BOOTH_BG, WIDE]),
    'hina_wave_talk': ('hina_wave', [LOOK, FACE + "mouth wide open, calling out cheerfully, eyes bright.", WIDE]),
}


ANCHOR = 'hina_booth'   # the upload API is rate-limited (2026-11-08): the anchor is text-to-image, every other picture uses the
                       # anchor's own generation URL as the character reference (no upload). With a generation URL as input, the
                       # outputs list the input first and the new picture LAST.


def gen_url(log, name):
    try: return m.unwrap(m.call('GET', f"/generations/{log[name]['generation']}", tries=2))['outputs'][-1]['url']
    except SystemExit:
        if name != ANCHOR: raise
    # the anchor's own record answers 503 (server side, 2026-11-08): take it from a generation that used it as input (outputs[0])
    for other in log:
        if other == ANCHOR: continue
        try: return m.unwrap(m.call('GET', f"/generations/{log[other]['generation']}", tries=2))['outputs'][0]['url']
        except SystemExit: pass
    raise SystemExit('no URL for the anchor')


def save_last(gid, dst, name):
    import time, urllib.request
    while True:
        time.sleep(10)
        g = m.unwrap(m.call('GET', f'/generations/{gid}'))
        if g['status'] in ('pending', 'processing'): continue
        if g['status'] != 'success': raise SystemExit(f'  {name} {g["status"]}: {g.get("error")}')
        tmp = dst + '.part'; urllib.request.urlretrieve(g['outputs'][-1]['url'], tmp); os.replace(tmp, dst); print('  saved', name, flush=True); return


def scenes(names):
    print('balance:', m.unwrap(m.call('GET', '/credits/balance')), flush=True)
    log = json.load(open(m.LOG)) if os.path.exists(m.LOG) else {}
    for name in names:
        dst = os.path.join(m.OUT, name + '.png')
        if os.path.exists(dst): print('exists', name); continue
        base, parts = SCENES[name]
        if name == ANCHOR:
            body = {'model': 'gpt-image-2', 'mode': 'text-to-image', 'prompt': '\n\n'.join([TEXT_LOOK] + parts[1:] + [AVOID]).replace('the exact young man from image 1 — ', 'a young man with '),
                    'parameters': {'resolution': '2K', 'aspect_ratio': '16:9'}, 'max_cost_credits': 40}
        else:
            urls = [gen_url(log, ANCHOR)] + ([gen_url(log, base)] if base and base != ANCHOR else [])
            intro = ('Image 1 is the STYLE and CHARACTER reference.' + (' Image 2 is the base picture.' if len(urls) > 1 else '')
                     if base != ANCHOR else 'Image 1 is the base picture (and the STYLE and CHARACTER reference).')
            text = '\n\n'.join([intro] + parts + [AVOID])
            if base == ANCHOR: text = text.replace('Image 2 is the base picture', 'Image 1 is the base picture')
            body = {'model': 'gpt-image-2', 'mode': 'image-to-image', 'prompt': text,
                    'inputs': [{'type': 'image', 'url': u} for u in urls], 'parameters': {'resolution': '2K', 'aspect_ratio': '16:9'}, 'max_cost_credits': 40}
        idem = f'moheat-d20-{name}-v' + ('2' if name.startswith('hina_hands') else '1').replace('_', '-')
        g = m.unwrap(m.call('POST', '/images', body, {'Idempotency-Key': idem}))
        print(f'[{name}] generation {g["id"]} cost {g.get("credits")}', flush=True)
        log[name] = {'generation': g['id'], 'idempotency_key': idem}; json.dump(log, open(m.LOG, 'w'), indent=1)
        save_last(g['id'], dst, name)
    print('balance:', m.unwrap(m.call('GET', '/credits/balance')))





# ---------------------------------------------------------------- animation (Seedance 2.5 lite image-to-video, 720p)
# The stills' own generations answer 503 after ~10 min, but later generations list their inputs among their outputs:
# (generation of, output index) where each still can be fetched — no upload needed (uploads were rate-limited on 2026-11-08).
STILL = {'hina_booth': ('hina_wave_talk', 0), 'hina_wave': ('hina_wave_talk', 1), 'hina_wave_talk': ('hina_wave_talk', 2),
         'hina_lean': ('hina_lean_talk', 0), 'hina_lean_talk': ('hina_lean_talk', 1), 'hina_hands': ('hina_hands_talk', 1),
         'hina_hands_talk': ('hina_hands_talk', 2), 'bg_queue': ('hina_booth_blink', 0)}
VLOOK = ("Japanese anime cel animation. Keep EXACTLY the art style, the character, the colours and the background of the input "
         "image(s). Locked-off camera: no zoom, no pan, no camera shake. Natural, gentle, believable motion; the face keeps its exact "
         "proportions; hands keep five fingers.")
VAVOID = ("Avoid: morphing, face distortion, changing hair style or colour, extra fingers, extra hands, warped hands, flicker, new objects, "
          "text, subtitles, logo, watermark, camera movement, fast jerky motion.")
LOOPV = " The clip starts and ends on exactly the same frame, so it loops seamlessly."
VIDEOS = {   # name: (first still, last still, motion)
    'v_booth_idle': ('hina_booth', 'hina_booth', "He keeps holding out his hand to the viewer with a bright smile, waiting for the handshake: slow natural breathing, his open hand moves slightly as if inviting, a small happy laugh, one natural blink, balloons sway softly." + LOOPV),
    'v_take_hand': ('hina_booth', 'hina_hands', "He takes the viewer's hand: his outstretched hand gently closes around the viewer's hand (a slim woman's hand coming in from the bottom of the frame), then he leans a little forward and wraps it in both of his hands and brings it up close to his lips, looking up at the viewer with a soft playful smile. One smooth continuous movement."),
    'v_hands_idle': ('hina_hands', 'hina_hands', "He holds the viewer's hand wrapped in both of his hands near his lips: slow breathing, his thumbs gently rub the back of her hand to warm it, a slow blink, a soft smile, a few hair strands move." + LOOPV),
    'v_hands_talk': ('hina_hands', 'hina_hands', "He talks softly and playfully while holding the viewer's hand in both of his near his lips: natural mouth movement as if speaking Japanese, small head tilts, a natural blink, his thumbs move a little." + LOOPV),
    'v_hands_breath': ('hina_hands', 'hina_hands', "He brings the viewer's hand closer and blows warm breath on it: lips rounded, eyes half closed, a soft faint white breath mist on the hand, then he looks up at the viewer with a gentle smile." + LOOPV),
    'v_lean_in': ('hina_hands', 'hina_lean', "Still holding the viewer's hand with one hand, he leans in close toward the viewer's left ear, his face moving to the left side of the frame, his other hand rising beside his mouth as if to whisper a secret; his smile turns small and knowing. One smooth continuous movement."),
    'v_lean_whisper': ('hina_lean', 'hina_lean', "He whispers into the viewer's ear, very close: lips moving softly as he whispers, slow half-lidded blinks, a tiny tilt of the head, gentle breathing, the lights behind twinkle softly." + LOOPV),
    'v_wave': ('hina_wave', 'hina_wave', "He waves goodbye to the viewer with his raised open hand, a big bright smile with his small fang, calling out cheerfully, leaning a little side to side, balloons sway." + LOOPV),
}


def still_url(log, name):
    gen, i = STILL[name]
    return m.unwrap(m.call('GET', f"/generations/{log[gen]['generation']}", tries=3))['outputs'][i]['url']


def videos(names, model='seedance-2.5-lite'):
    import time, urllib.request
    print('balance:', m.unwrap(m.call('GET', '/credits/balance')), flush=True)
    log = json.load(open(m.LOG))
    os.makedirs(os.path.join(ROOT, 'assets', 'video'), exist_ok=True)
    for name in names:
        dst = os.path.join(ROOT, 'assets', 'video', name + '.mp4')
        if os.path.exists(dst): print('exists', name); continue
        a, b, motion = VIDEOS[name]
        body = {'model': model, 'mode': 'image-to-video', 'prompt': '\n\n'.join([VLOOK, motion, VAVOID]),
                'inputs': [{'type': 'image', 'url': still_url(log, a)}, {'type': 'image', 'url': still_url(log, b)}],
                'parameters': {'resolution': '720p', 'aspect_ratio': '16:9', 'duration_seconds': 5, 'image_mode': 'first-last-frame'}, 'max_cost_credits': 80}
        idem = f'moheat-d20-{name}-v1'.replace('_', '-')
        g = None
        for path in ('/videos', '/generations'):
            try: g = m.unwrap(m.call('POST', path, body, {'Idempotency-Key': idem}, tries=200)); break
            except SystemExit as e:
                if '404' not in str(e) and '405' not in str(e): raise
        print(f'[{name}] generation {g["id"]} cost {g.get("credits")}', flush=True)
        log[name] = {'generation': g['id'], 'idempotency_key': idem}; json.dump(log, open(m.LOG, 'w'), indent=1)
        while True:
            time.sleep(12)
            r = m.unwrap(m.call('GET', f'/generations/{g["id"]}'))
            if r.get('outputs'):
                tmp = dst + '.part'; urllib.request.urlretrieve(r['outputs'][-1]['url'], tmp); os.replace(tmp, dst); print('  saved', name, flush=True); break
            if r['status'] not in ('pending', 'processing'): print(f'  {name} {r["status"]}: {r.get("error")}', flush=True); break
    print('balance:', m.unwrap(m.call('GET', '/credits/balance')))


if __name__ == '__main__':
    a = sys.argv[1:]
    if a[:1] == ['video']: videos(a[1:] or list(VIDEOS))
    else: scenes(a or list(SCENES))
