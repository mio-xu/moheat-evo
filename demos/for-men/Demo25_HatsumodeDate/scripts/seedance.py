"""Seedance (GPT Image 2) for the hatsumode date demo — Demo 10's API client loaded by path.
Art style = the for-men series anchor (Demo 12's style_3_softcel.png, same LOOK as Demo 14).

  python3 scripts/seedance.py probe            # one POST /uploads (API usable? 429 with a long Retry-After / 401 -> use the website)
  python3 scripts/seedance.py design [names]   # Tsubaki design candidates -> assets/art/design_*.png (3:4, 1K)
  python3 scripts/seedance.py scenes [names]   # the date stills (16:9, 2K)

Key: ~/.seedance_key. Raw PNGs in assets/art/ stay out of git. Idempotency keys make retries free.
"""
import importlib.util, json, os, sys, urllib.request, urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location('d10_seedance', os.path.join(ROOT, '..', '..', 'all-ages', 'Demo10_CaveSpring', 'scripts', 'seedance_images.py'))
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
m.JOBS = os.path.join(ROOT, 'project', 'seedance_jobs.json')
m.OUT = os.path.join(ROOT, 'assets', 'art')
m.LOG = os.path.join(ROOT, 'project', 'seedance_log.json')
REF = os.path.join(m.OUT, 'ref_style3.png')
UPLOADS = os.path.join(ROOT, 'project', 'seedance_uploads.json')

LOOK = ("Image 1 is the ART STYLE reference ONLY — do NOT draw that young man; draw the new woman described below. "
        "Art style EXACTLY like image 1: soft modern cel animation with a light, airy palette — thin coloured lineart (dark lavender "
        "instead of black), flat pastel colours with one soft-edged but still flat shadow tone, simple clean backgrounds with a few round "
        "lights, gentle and romantic like an anime film. Hand-drawn feel, NOT glossy: no airbrush gradients, no bloom, no heavy glow, no "
        "over-detailed strands. Realistic adult proportions (about 7 heads tall, not chibi), a beautiful adult face. Original character, not a real person.")
SHOT = ("Upper-body portrait from the waist up at a Japanese shrine on New Year's Eve night (stone lanterns, a red torii gate softly out of "
        "focus, paper lanterns, a little snow in the air), she looks straight at the viewer with the expression described. "
        "No text, no logo, no watermark, no speech bubbles, no frame.")
AVOID = ("Avoid: chibi, super-deformed, childish face, realistic photo, 3D render, glossy, airbrushed, bloom, extra fingers, deformed hands, "
         "text, letters, the man from image 1.")
BASE_CHAR = ("Shirogane Tsubaki, 20, the sheltered young lady of an old ryokan family, at her very first crowded New Year shrine visit. "
             "Elegant, polite and composed, but naive and curious (an airhead in a cute way). ")
DESIGNS = {
    'design_A_camellia': BASE_CHAR + "Long straight silver-white hair with a neat hime cut (straight bangs, side locks), deep ruby-red eyes, a big red camellia "
        "hair ornament; a crimson furisode with white camellia and snowflake patterns, gold obi, a fluffy white fur stole around her shoulders. "
        "Expression: a graceful, slightly shy smile, hands politely together.",
    'design_B_taisho': BASE_CHAR + "Silver-white hair in a soft half-up style with a large crimson ribbon bow (Taisho-romance look), long hair falling to the waist, "
        "gentle violet eyes; a deep plum furisode with an arrow-feather (yagasuri) pattern, a red obi, a white fur stole. "
        "Expression: curious, wide-eyed, a small excited smile.",
    'design_C_crane': BASE_CHAR + "Silver-white hair in an elegant low updo with a gold kanzashi and dangling red beads, two long side locks, golden amber eyes; "
        "a black furisode with gold and white crane patterns and a red obi, a white fur stole. "
        "Expression: dignified and calm, a faint gentle smile.",
    'design_D_sakura': BASE_CHAR + "Very long silver-white hair in a loose low side ponytail tied with a red-and-white braided cord, soft pink-red eyes, a small "
        "red camellia pin; a white furisode fading to crimson at the sleeves with red camellia patterns, a gold obi, a white fur stole. "
        "Expression: an innocent, airy smile, head tilted a little.",
}


# ---------------------------------------------------------------- the date stills (16:9, 2K). Image 1 = style anchor, image 2 = the chosen design.
LOOK2 = ("Image 1 is the ART STYLE reference only (do not copy its person or room). Image 2 is the CHARACTER reference: keep this exact young "
         "woman (face, hair, eyes, hair ornament, furisode, fur stole). Art style EXACTLY like image 1: soft modern cel animation with a light, "
         "airy palette, thin coloured lineart (dark lavender instead of black), flat colours with one soft-edged but still flat shadow tone, "
         "simple clean backgrounds with a few round lights. Hand-drawn feel, NOT glossy, no bloom. Realistic adult proportions (not chibi).")
CHAR = "{CHAR}"   # filled from the design the user picks (see CHARS)
CHARS = {
    'A': "Tsubaki: long straight silver-white hair with a neat hime cut (straight bangs, side locks), deep ruby-red eyes, a big red camellia hair ornament with dangling red tassels; a crimson furisode with white camellia and snowflake patterns, a gold obi, a fluffy white fur stole.",
    'B': "Tsubaki: silver-white hair in a soft half-up style with a large crimson ribbon bow, long hair to the waist, gentle violet eyes; a deep plum furisode with an arrow-feather pattern, a red obi, a white fur stole.",
    'C': "Tsubaki: silver-white hair in an elegant low updo with a gold kanzashi and dangling red beads, two long side locks, golden amber eyes; a black furisode with gold and white cranes, a red obi, a white fur stole.",
    'D': "Tsubaki: very long silver-white hair in a loose low side ponytail tied with a red-and-white braided cord, soft pink-red eyes, a small red camellia pin; a white furisode fading to crimson at the sleeves with red camellias, a gold obi, a white fur stole.",
}
BG = ("A Japanese shrine on New Year's Eve night: snow on the ground and on stone lanterns, warm paper lanterns, a deep navy night sky, "
      "light snow falling, soft round bokeh lights, distant crowd silhouettes.")
CAM = ("First-person view (the viewer is her date; at most the viewer's hand is visible). Wide 16:9. Leave the bottom fifth calm for subtitles. "
       "No text, no logo, no watermark, no speech bubbles, no UI, no readable writing anywhere.")
AVOID2 = ("Avoid: chibi, super-deformed, childish face, realistic photo, 3D render, glossy, airbrushed, bloom, extra fingers, deformed hands, "
          "readable text, letters, the man from image 1.")
SCENES = {
    'tsubaki_torii': "She has just hurried up to you in front of a big red torii gate and stands about one metre away, centre-right of the picture, "
        "a little out of breath, one hand raised in a small shy wave, cheeks pink from the cold, a bright happy smile. Warm lantern light on her face.",
    'tsubaki_stall': "A street of food stalls (yatai) inside the shrine: glowing stall awnings, steam, hanging lanterns. She stands centre, turned toward "
        "you, holding up a small black credit card with an embarrassed, apologetic little smile, the other hand at her cheek.",
    'tsubaki_amazake': "Close-up by the food stalls: she leans in from the RIGHT side of the picture and playfully presses a steaming white paper cup of "
        "amazake against the viewer's right cheek (the cup at the right edge, very near the camera, soft steam rising); her own cup in her other hand; "
        "a teasing, delighted smile.",
    'tsubaki_fire': "A large shrine bonfire (takibi) burns on the LEFT side of the picture with orange sparks rising. She stands on the right half, "
        "holding both hands out toward the fire, her face lit warm orange on the side facing the fire, the cool blue night on her other side; a soft, "
        "content smile.",
    'tsubaki_close': "Extreme close-up: the crowd has pushed her against you. Her face is very close on the RIGHT side of the picture, right beside the "
        "viewer's right ear, looking up through her lashes, deeply blushing, lips parted as if whispering; one hand resting on the viewer's chest. "
        "Warm bonfire glow from the left, people's shoulders blurred behind.",
    'tsubaki_pray': "In front of the main shrine hall: the big thick bell rope with a brass bell, a wooden offering box, white paper streamers. She stands "
        "on the LEFT side of the picture beside you, seen in three-quarter profile, eyes closed, both palms pressed together in prayer, serene and earnest.",
    'tsubaki_omikuji': "By the omikuji racks covered in many tied white paper slips. She stands centre, holding an opened plain paper fortune slip with "
        "both hands (no readable writing), a cute shocked and teary face, mouth a small wobbly line, a sweat drop.",
    'tsubaki_stole': "Very close from the LEFT side: she wraps her white fur stole around both of your shoulders, her face right beside the viewer's left "
        "ear, eyes half closed, a tender shy smile, snowflakes in her hair; lanterns softly blurred behind.",
}


def scene_prompt(name, design):
    return '\n\n'.join([LOOK2, CHARS[design], SCENES[name], BG, CAM, AVOID2])


def call_once(method, path, body):
    """One request without the client's long retry loop — to see at once whether the upload endpoint is rate-limited."""
    req = urllib.request.Request(m.BASE + path, data=json.dumps(body).encode(), method=method,
                                 headers={'Authorization': f'Bearer {m.key()}', 'Content-Type': 'application/json', 'Accept': 'application/json', 'User-Agent': 'moheat-demo25/1.0'})
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


def design(names):
    print('balance:', m.unwrap(m.call('GET', '/credits/balance')))
    log = json.load(open(m.LOG)) if os.path.exists(m.LOG) else {}
    url = ref_url(REF)
    for name in names:
        dst = os.path.join(m.OUT, name + '.png')
        if os.path.exists(dst): print('exists', name); continue
        body = {'model': 'gpt-image-2', 'mode': 'image-to-image', 'prompt': '\n\n'.join([LOOK, DESIGNS[name], SHOT, AVOID]),
                'inputs': [{'type': 'image', 'url': url}], 'parameters': {'resolution': '1K', 'aspect_ratio': '3:4'}, 'max_cost_credits': 30}
        idem = f'moheat-d25-{name}-v1'.replace('_', '-')
        g = m.unwrap(m.call('POST', '/images', body, {'Idempotency-Key': idem}))
        print(f'[{name}] generation {g["id"]} cost {g.get("credits")}', flush=True)
        log[name] = {'generation': g['id'], 'idempotency_key': idem}; json.dump(log, open(m.LOG, 'w'), indent=1)
        m.wait_save(g['id'], dst, name)
    print('balance:', m.unwrap(m.call('GET', '/credits/balance')))


if __name__ == '__main__':
    a = sys.argv[1:]
    if a[:1] == ['probe']:
        print('balance:', m.unwrap(m.call('GET', '/credits/balance')))
        print(call_once('POST', '/uploads', {'files': [{'name': 'ref_style3.png', 'type': 'image/png', 'size': os.path.getsize(REF)}]}))
    if a[:1] == ['design']: design(a[1:] or list(DESIGNS))


def design_t2i(names):
    """Text-to-image fallback for the design candidates while the upload endpoint is rate-limited (no style image; LOOK words only)."""
    look = LOOK.replace("Image 1 is the ART STYLE reference ONLY — do NOT draw that young man; draw the new woman described below. ", "").replace("EXACTLY like image 1", "")
    print('balance:', m.unwrap(m.call('GET', '/credits/balance')))
    log = json.load(open(m.LOG)) if os.path.exists(m.LOG) else {}
    for name in names:
        dst = os.path.join(m.OUT, name + '.png')
        if os.path.exists(dst): print('exists', name); continue
        body = {'model': 'gpt-image-2', 'mode': 'text-to-image', 'prompt': '\n\n'.join([look, DESIGNS[name], SHOT, AVOID.replace(', the man from image 1', '')]),
                'parameters': {'resolution': '1K', 'aspect_ratio': '3:4'}, 'max_cost_credits': 30}
        idem = f'moheat-d25-{name}-t2i-v1'.replace('_', '-')
        g = m.unwrap(m.call('POST', '/images', body, {'Idempotency-Key': idem}, tries=3))
        print(f'[{name}] generation {g["id"]} cost {g.get("credits")}', flush=True)
        log[name] = {'generation': g['id'], 'idempotency_key': idem, 'mode': 't2i'}; json.dump(log, open(m.LOG, 'w'), indent=1)
        m.wait_save(g['id'], dst, name)
    print('balance:', m.unwrap(m.call('GET', '/credits/balance')))


if __name__ == '__main__' and sys.argv[1:2] == ['design_t2i']:
    design_t2i(sys.argv[2:] or list(DESIGNS))
