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


if __name__ == '__main__':
    cmd, rest = (sys.argv[1], sys.argv[2:]) if len(sys.argv) > 1 else ('designs', [])
    {'designs': designs}[cmd](rest)
