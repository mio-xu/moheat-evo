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
