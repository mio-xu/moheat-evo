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
