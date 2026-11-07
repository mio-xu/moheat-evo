"""Seedance (GPT Image 2) for the family-call demo — Demo 10's API client loaded by path.
Art style = Demo 12's soft-cel pick (assets/art/ref_style3.png is a symlink to Demo 12's style_3_softcel.png).

  python3 scripts/seedance.py design [names]   # 3 grandma + grandpa couple designs → assets/art/design_*.png
  python3 scripts/seedance.py scenes [names]   # the game frames (16:9, 2K) from the chosen design

Key: ~/.seedance_key. Raw PNGs in assets/art/ stay out of git. Idempotency keys make retries free.
"""
import importlib.util, json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location('d10_seedance', os.path.join(os.path.dirname(ROOT), '../all-ages/Demo10_CaveSpring', 'scripts', 'seedance_images.py'))
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
m.JOBS = os.path.join(ROOT, 'project', 'seedance_jobs.json')
m.OUT = os.path.join(ROOT, 'assets', 'art')
m.LOG = os.path.join(ROOT, 'project', 'seedance_log.json')
REF = os.path.join(m.OUT, 'ref_style3.png')
import time as _t, types as _ty   # cap the client's waits: a 429 sometimes says Retry-After: 10 h while a slot frees in seconds
m.time = _ty.SimpleNamespace(sleep=lambda s: _t.sleep(min(s, 30)), time=_t.time)

LOOK = ("Image 1 is the ART STYLE reference ONLY — do NOT draw that young man; draw the elderly couple described below. "
        "Art style EXACTLY like image 1: soft modern cel animation with a light, airy palette — thin coloured lineart (warm brown "
        "instead of black), flat pastel colours with one soft-edged but still flat shadow tone, simple clean backgrounds, gentle and "
        "heart-warming like an anime film. Hand-drawn feel, NOT glossy: no airbrush gradients, no bloom, no over-detailed strands. "
        "The grandparents are CUTE: small, soft and round, about 5 heads tall, round rosy faces, big kind smiling eyes, gentle wrinkles "
        "drawn with only a few soft lines — storybook-cute and lovable, but NOT chibi and NOT a baby face. Original characters, not real people.")
AVOID = ("Avoid: chibi, super-deformed, realistic photo, 3D render, glossy, airbrushed, bloom, scary or ugly old faces, heavy wrinkles, "
         "extra fingers, deformed hands, text, letters, the young man from image 1.")
SHOT = ("The two of them squeeze together at their old cream-coloured home telephone (a landline with a curly cord) on a small wooden "
        "phone stand: grandma holds the receiver to her ear and laughs, grandpa presses his cheek against hers to listen in too, both look "
        "delighted, as if their grandchild just called. Their cosy Japanese countryside living room: tatami, a kotatsu with a bowl of "
        "mandarin oranges, dried persimmons hanging at a window with soft snow outside, warm evening light. "
        "Medium shot from the waist up. No text, no logo, no watermark, no speech bubbles, no frame.")
DESIGNS = {
    'design_A_classic': "Grandma Hana, 78: silver-white hair in a small round bun with a red ball hairpin, round gold-rimmed glasses, crescent smiling eyes, very rosy cheeks; a soft pink hand-knitted cardigan over a lavender blouse and a white apron. Grandpa Gen, 80: bald on top with fluffy white hair at the sides, big bushy white eyebrows, a round white moustache, a round red nose, small sparkly eyes; a navy padded hanten jacket with a white pattern over a grey sweater.",
    'design_B_stylish': "Grandma Hana, 76: short fluffy lilac-grey permed curls, cat-eye glasses on a beaded chain, rosy cheeks, a bright cheeky smile; a mustard-yellow cardigan with big buttons over a white blouse, a small brooch. Grandpa Gen, 79: neat white hair and a short white beard, round black glasses, a brown flat cap he never takes off, a soft knitted brown vest over a checked shirt, a pencil behind his ear.",
    'design_C_farm': "Grandma Hana, 79: white hair tied back under a pale blue triangular head scarf, tiny smiling eyes, apple-red cheeks; a white kappogi apron-smock with rolled sleeves, a little flour on her cheek. Grandpa Gen, 81: very short white crew-cut hair, a sun-tanned round face, a big toothy grin with one missing tooth, thick white eyebrows; a green padded farmer's vest over a long-sleeved undershirt, a white towel around his neck.",
}


def design(names):
    print('balance:', m.unwrap(m.call('GET', '/credits/balance')))
    log = json.load(open(m.LOG)) if os.path.exists(m.LOG) else {}
    t2i = os.environ.get('T2I') == '1'     # uploads rate-limited (2026-11-07): text-to-image with the style written out
    url = None if t2i else m.upload([REF])[0]
    for name in names:
        dst = os.path.join(m.OUT, name + '.png')
        if os.path.exists(dst): print('exists', name); continue
        look = LOOK.replace("Image 1 is the ART STYLE reference ONLY — do NOT draw that young man; draw the elderly couple described below. Art style EXACTLY like image 1:", "Art style:") if t2i else LOOK
        body = {'model': 'gpt-image-2', 'mode': 'text-to-image' if t2i else 'image-to-image', 'prompt': '\n\n'.join([look, DESIGNS[name], SHOT, AVOID]),
                'parameters': {'resolution': '1K', 'aspect_ratio': '4:3'}, 'max_cost_credits': 30}
        if not t2i: body['inputs'] = [{'type': 'image', 'url': url}]
        idem = f'moheat-d15-{name}-{"t2i-" if t2i else ""}v1'.replace('_', '-')
        g = m.unwrap(m.call('POST', '/images', body, {'Idempotency-Key': idem}))
        print(f'[{name}] generation {g["id"]} cost {g.get("credits")}', flush=True)
        log[name] = {'generation': g['id'], 'idempotency_key': idem}; json.dump(log, open(m.LOG, 'w'), indent=1)
        m.wait_save(g['id'], dst, name)
    print('balance:', m.unwrap(m.call('GET', '/credits/balance')))


# ---------------------------------------------------------------- the game frames (user's pick: design A), 16:9 at 2K
STYLE = ("Art style EXACTLY like image 1: soft modern cel animation with a light, airy palette, thin coloured lineart (warm brown), flat "
         "pastel colours with one soft-edged but still flat shadow tone, simple clean backgrounds, warm and heart-warming like an anime film. "
         "Hand-drawn feel, NOT glossy. The grandparents are cute, small and round, storybook-cute but NOT chibi.")
STYLE_T2I = STYLE.replace('EXACTLY like image 1', '').replace('Art style :', 'Art style:')
CAST = ("Image 1 is the CHARACTER and STYLE reference: keep these exact two grandparents. Grandma Hana: silver-white hair in a small round "
        "bun with a red ball hairpin, round gold-rimmed glasses, crescent smiling eyes, rosy cheeks, a soft pink hand-knitted cardigan over a "
        "lavender blouse with a round collar, a white apron. Grandpa Gen: bald on top with fluffy white hair at the sides, big bushy white "
        "eyebrows, a round white moustache, a round red nose, small round sparkly black eyes, a navy padded hanten jacket with a white cross "
        "pattern over a grey sweater.")
ROOM = ("Their cosy Japanese countryside living room: tatami, a kotatsu with a red flower-pattern futon and a bowl of mandarin oranges, "
        "dried persimmons hanging at a window with soft snow outside, warm evening light.")
WIDE = "Wide 16:9 game scene. No text, no logo, no watermark, no speech bubbles, no UI, no frame."
FACE = ("Image 2 is the base picture: the SAME picture — same pose, same framing, same size, same position, same background, same "
        "lighting — ONLY this changes: ")
DUO = ("The two of them squeeze together at their old cream-coloured landline telephone (curly cord) on a small wooden phone stand: "
       "grandma (LEFT of centre) holds the receiver to her ear, grandpa (RIGHT of centre) presses his cheek against hers to listen in. "
       "Both have happy closed-mouth smiles (mouths CLOSED), grandpa's eyes open. Medium shot from the waist up, both faces fully visible "
       "in the upper-middle of the picture. " + ROOM)
GM = ("Grandma alone, standing at the old cream-coloured landline telephone on its small wooden stand, holding the receiver to her ear "
      "with both hands, delighted and surprised (eyebrows up, a happy closed-mouth smile, mouth CLOSED), as if her grandchild just called. "
      "She is in the centre-left, from the waist up; an open sliding door behind her on the right shows the dim corridor. " + ROOM)
SNOW = ("Grandpa in their snowy back garden in the morning, wearing his hanten plus a knitted red hat and gloves, crouching proudly over "
        "a TINY cute snowman (about 20 cm) on a tray, with twig arms and two dark seed eyes; grandma laughs at him from the wooden engawa "
        "veranda behind, holding a cup of tea. Snow falling softly, a persimmon tree with a few orange fruits, a wooden fence. Bright, gentle.")
KNIT = ("Night: grandma sits at the kotatsu under a warm lamp, knitting a long RED wool scarf with two needles, the finished part lying "
        "across her lap, her glasses low on her nose, a gentle concentrated smile; a sleepy tabby cat curled beside her on the futon; "
        "grandpa asleep sitting up at the other side of the kotatsu with his mouth open. Snow outside the dark window. Very cosy.")
BYE = ("The two of them at the landline telephone, the receiver held up between their two faces, both waving at it with their free "
       "hands as if waving goodbye to their grandchild; grandma's smile is soft, grandpa beams with slightly teary happy eyes. "
       "Medium shot from the waist up. " + ROOM)
YOU_ROOM = ("A small cosy city apartment at a winter evening, seen from the floor cushion in front of a low table, nobody in it: on the LEFT "
            "the apartment's front door and a tiny entrance with shoes; on the RIGHT a window with light snow falling over city lights; in the "
            "centre a low wooden table with a smartphone lying face up, a mug and a small lamp; a fan heater glowing on the floor, a bookshelf.")
BOX = ("Seen from above at a slight angle: an opened cardboard parcel on a low wooden table in a cosy apartment. Inside, on top, a neatly "
       "folded hand-knitted RED wool scarf; also mandarin oranges, a bag of dried persimmons, a handwritten letter in a cream envelope "
       "with a little drawn flower. On the RIGHT side of the table, next to the parcel, a small closed LIGHT-BLUE cooler box with a white lid.")
COOLER = ("Close-up: an opened small light-blue cooler box with a white lid, inside on blue ice packs stands a TINY adorable snowman "
          "(two snowballs) with small twig arms, two black seed eyes, a tiny orange carrot-chip nose, a smile, and a mandarin-orange leaf "
          "on its head like a hat; soft cold mist rising, a few sparkles of frost. Warm room light around, cool blue light from inside the box.")
SCENES = {   # name: (refs: design / earlier frames by name, prompt parts) — refs are used through their generation URLs
    'duo_call': (['design_A_classic'], [CAST, STYLE, DUO, WIDE]),
    'duo_call_gm': (['duo_call', 'duo_call'], [CAST, STYLE, FACE + "GRANDMA's mouth is open, talking happily into the phone. Everything else identical.", WIDE]),
    'duo_call_gp': (['duo_call', 'duo_call'], [CAST, STYLE, FACE + "GRANDPA's mouth is open under his moustache, talking loudly and happily. Everything else identical.", WIDE]),
    'duo_call_blink': (['duo_call', 'duo_call'], [CAST, STYLE, FACE + "GRANDPA's eyes are closed (relaxed closed eyes). Everything else identical.", WIDE]),
    'gm_call': (['duo_call'], [CAST, STYLE, GM, WIDE]),
    'gm_call_gm': (['duo_call', 'gm_call'], [CAST, STYLE, FACE + "her mouth is open, talking happily into the phone. Everything else identical.", WIDE]),
    'gp_snow': (['duo_call'], [CAST, STYLE, SNOW, WIDE]),
    'gm_knit': (['duo_call'], [CAST, STYLE, KNIT, WIDE]),
    'duo_bye': (['duo_call'], [CAST, STYLE, BYE, WIDE]),
    'bg_room': ([], [STYLE_T2I, YOU_ROOM, WIDE]),
    'box_open': ([], [STYLE_T2I, BOX, WIDE]),
    'cooler': ([], [STYLE_T2I, COOLER, WIDE]),
}


def gen_url(name, log):   # a fresh link to an earlier generation's output (uploads were rate-limited on 2026-11-07)
    g = m.unwrap(m.call('GET', f"/generations/{log[name]['generation']}"))
    return g['outputs'][-1]['url']


def save_last(gid, dst, name):   # with generation-URL inputs the API also returns the inputs: the new picture is the LAST output
    import time, urllib.request
    while True:
        time.sleep(12)
        g = m.unwrap(m.call('GET', f'/generations/{gid}'))
        if g['status'] in ('pending', 'processing'): continue
        if g['status'] != 'success': raise SystemExit(f'  {name} {g["status"]}: {g.get("error")}')
        urllib.request.urlretrieve(g['outputs'][-1]['url'], dst + '.part'); os.replace(dst + '.part', dst)
        print(f'  saved {name} ({len(g["outputs"])} outputs)', flush=True); return


def scenes(names):
    print('balance:', m.unwrap(m.call('GET', '/credits/balance')))
    log = json.load(open(m.LOG)) if os.path.exists(m.LOG) else {}
    for name in names:
        dst = os.path.join(m.OUT, name + '.png')
        if os.path.exists(dst): print('exists', name); continue
        refs, parts = SCENES[name]
        urls = [gen_url(r, log) for r in refs]
        body = {'model': 'gpt-image-2', 'mode': 'image-to-image' if urls else 'text-to-image', 'prompt': '\n\n'.join(parts + [AVOID.replace(', the young man from image 1', '')]),
                'parameters': {'resolution': '2K', 'aspect_ratio': '16:9'}, 'max_cost_credits': 40}
        if urls: body['inputs'] = [{'type': 'image', 'url': u} for u in urls]
        idem = f'moheat-d15-{name}-v1'.replace('_', '-')
        g = m.unwrap(m.call('POST', '/images', body, {'Idempotency-Key': idem}))
        print(f'[{name}] generation {g["id"]} cost {g.get("credits")}', flush=True)
        log[name] = {'generation': g['id'], 'idempotency_key': idem}; json.dump(log, open(m.LOG, 'w'), indent=1)
        save_last(g['id'], dst, name)
    print('balance:', m.unwrap(m.call('GET', '/credits/balance')))


if __name__ == '__main__':
    a = sys.argv[1:]
    if a[:1] in (['scenes'], ['frames']): scenes(a[1:] or list(SCENES))
    elif a[:1] == ['design']: design(a[1:] or list(DESIGNS))
    else: print(__doc__)
