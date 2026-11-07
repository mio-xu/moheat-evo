"""Seedance (GPT Image 2) art for Gaku's winter-camp live stream — Demo 10's API client loaded by path (as in Demo 20 / 22).

  python3 scripts/seedance.py designs            # the look options for the user to pick (design_A … design_D)
  python3 scripts/seedance.py scenes [names…]    # the game stills (after the user picked a look → assets/art/ref_gaku.png)

Style anchor = Demo 12's "No. 3 soft cel" (assets/art/style_ref.png, a copy of Demo12 style_3_softcel.png): the same anchor as every
for-women idol demo. Raw PNGs in assets/art/ stay out of git → scripts/prepare_art.py → media/art/*.jpg. Stills first, video last.
"""
import glob, importlib.util, json, os, sys, time, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location('d10_seedance', glob.glob(os.path.join(ROOT, '..', '..', '*', 'Demo10_CaveSpring', 'scripts', 'seedance_images.py'))[0])
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
m.OUT = os.path.join(ROOT, 'assets', 'art')
m.LOG = os.path.join(ROOT, 'project', 'seedance_log.json')
STYLE_REF = os.path.join(m.OUT, 'style_ref.png')
CHAR_REF = os.path.join(m.OUT, 'ref_gaku.png')

LOOK = ("Art style EXACTLY like image 1: soft modern anime illustration, thin coloured lineart, soft cel shading with one soft-edged shadow "
        "layer, romantic otome-game card quality, clean and calm. Realistic adult proportions (not chibi), a handsome, masculine face with "
        "a clear jawline.")
PERSONA = ("Gaku, 29, a solo winter-camping live streamer: tall, broad-shouldered, quiet and a little clumsy with words, gentle and "
           "dependable like a big older brother; a small, shy, warm smile, calm kind eyes.")
CAMP = ("Background: a winter lakeside campsite at night — a crackling campfire in a ring of stones casting warm amber light on him from "
        "the RIGHT side, a canvas tent glowing faintly behind, dark pine trees, a frozen blue lake, light snow on the ground and a starry "
        "navy-blue sky; cold blue moonlight from the LEFT. Warm amber vs cold blue.")
WIDE = "Wide 16:9 illustration. No text, no letters, no logo, no watermark, no speech bubbles, no UI."
AVOID = ("Avoid: chibi, super-deformed, realistic photo, 3D render, extra fingers, deformed hands, readable text, glossy airbrush, heavy "
         "bloom, silver / pink / red / platinum hair, glasses, sunglasses.")

DESIGNS = {
    'design_A': "Look A: short black hair, a little messy, thick straight eyebrows, narrow dark-brown eyes, lightly tanned skin. A chunky "
                "cream cable-knit fisherman sweater under an open olive-green mountain parka. Sitting on a low camp chair by the fire, "
                "holding an enamel mug in both hands, looking at the viewer with a small shy smile. Upper body, centred.",
    'design_B': "Look B: dark-brown wavy hair, the back tied in a short little half-up knot, light stubble on the jaw, warm amber-brown "
                "eyes. A red-and-black buffalo-check flannel shirt with the sleeves rolled up over the forearms, a dark-brown down vest. "
                "Crouching by the fire, adding a split log with one hand, turning his head to the viewer with a calm, gentle look. Upper "
                "body, centred.",
    'design_C': "Look C: black two-block short hair under a charcoal knit beanie, sleepy-looking calm black eyes, a small silver carabiner "
                "on his belt loop. A charcoal turtleneck under an off-white fluffy boa-fleece jacket. Sitting by the fire with a camp "
                "kettle beside him, resting his chin on his hand, looking at the viewer with a quiet half-smile. Upper body, centred.",
    'design_D': "Look D: short black hair pushed back loosely, a thin old scar through his left eyebrow, deep-set dark eyes, big build. A "
                "moss-green canvas work jacket over a grey hoodie, a faded navy bandana around his neck. Standing by the fire, holding a "
                "wool blanket folded over his arm, looking down at the viewer with a soft, slightly awkward smile. Upper body, centred.",
}

SCENES = {}   # game stills: written after the user picks the look


def upload_once(path, cache):
    p = os.path.join(ROOT, 'project', cache)
    if os.path.exists(p) and time.time() - os.path.getmtime(p) < 3600: return json.load(open(p))['url']
    u = m.upload([path])[0]; json.dump({'url': u}, open(p, 'w')); return u


def gen(name, text, url, tag='d24'):
    dst = os.path.join(m.OUT, name + '.png')
    if os.path.exists(dst): print('exists', name); return
    log = json.load(open(m.LOG)) if os.path.exists(m.LOG) else {}
    body = {'model': 'gpt-image-2', 'mode': 'image-to-image', 'prompt': text, 'inputs': [{'type': 'image', 'url': url}],
            'parameters': {'resolution': '2K', 'aspect_ratio': '16:9'}, 'max_cost_credits': 40}
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


def designs(names):
    print('balance:', m.unwrap(m.call('GET', '/credits/balance')), flush=True)
    url = upload_once(STYLE_REF, 'style_url.json')
    for n in names or list(DESIGNS):
        text = '\n\n'.join(['Image 1 is the STYLE reference only (do not copy that man: different hair, face and clothes).', LOOK, PERSONA, DESIGNS[n], CAMP, WIDE, AVOID])
        gen(n, text, url)
    print('balance:', m.unwrap(m.call('GET', '/credits/balance')))


def scenes(names):
    print('balance:', m.unwrap(m.call('GET', '/credits/balance')), flush=True)
    url = upload_once(CHAR_REF, 'ref_url.json')
    for n in names or list(SCENES):
        gen(n, '\n\n'.join(['Image 1 is the STYLE and CHARACTER reference.', LOOK] + SCENES[n] + [AVOID]), url)
    print('balance:', m.unwrap(m.call('GET', '/credits/balance')))


if __name__ == '__main__':
    cmd, rest = (sys.argv[1], sys.argv[2:]) if len(sys.argv) > 1 else ('designs', [])
    {'designs': designs, 'scenes': scenes}[cmd](rest)
