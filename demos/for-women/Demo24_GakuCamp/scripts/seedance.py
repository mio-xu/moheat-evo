"""Seedance (GPT Image 2) art for Gaku's winter-camp live stream — Demo 10's API client loaded by path (as in Demo 20 / 22).

  python3 scripts/seedance.py designs            # the look options for the user to pick (design_A … design_D, text-to-image)
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

LOOK = ("Art style: soft modern anime illustration, thin coloured lineart, soft cel shading with one soft-edged shadow layer, "
        "romantic otome-game card quality (like a top-tier otome game's love-interest card), clean and calm, not glossy. Realistic adult "
        "proportions (7.5 heads, not chibi). He is EXTREMELY handsome: an idol-level beautiful face, a sharp clear jawline, a straight "
        "nose, long lashes, smooth fair skin, slim and tall with broad shoulders — the kind of man the whole chat falls for.")
PERSONA = ("Gaku, 26, a solo winter-camping live streamer: cool, quiet and a little aloof at first glance (kuudere), actually gentle and "
           "clumsy with words; a rare, small, shy smile.")
CAMP = ("Background: a winter lakeside campsite at night — a crackling campfire in a ring of stones casting warm amber light on him from "
        "the RIGHT side, a canvas tent glowing faintly behind, dark pine trees, a frozen blue lake, light snow on the ground and a starry "
        "navy-blue sky; cold blue moonlight from the LEFT. Warm amber vs cold blue, soft round bokeh of the fire sparks.")
WIDE = "Wide 16:9 illustration. No text, no letters, no logo, no watermark, no speech bubbles, no UI."
AVOID = ("Avoid: chibi, super-deformed, realistic photo, 3D render, extra fingers, deformed hands, readable text, glossy airbrush, heavy "
         "bloom, beard, stubble, scars, rugged or old-looking face, silver / pink / red / platinum hair, glasses, sunglasses.")

DESIGNS = {
    'design_A': "Look A: layered black hair, medium-short, soft bangs falling just over the eyebrows, narrow phoenix eyes with dark-grey "
                "irises, one small black stud earring in his right ear. A chunky off-white cable-knit turtleneck sweater under an open "
                "deep forest-green mountain parka. Sitting on a low camp chair by the fire, an enamel mug in both hands, glancing at the "
                "viewer with a cool, quiet look and the faintest smile. Upper body, centred.",
    'design_B': "Look B: soft wavy black hair with a centre-parted comma fringe, gentle slightly droopy eyes with warm amber irises. A cream "
                "fluffy shearling jacket over a heather-grey hoodie. Crouching by the fire, adding a split log with one hand, turning his "
                "face to the viewer with a calm, tender look. Upper body, centred.",
    'design_C': "Look C: sleek short black hair with a hidden deep-green inner colour at the nape and sides, long-lashed cool black eyes, "
                "a thin silver chain necklace. A black aviator jacket with a fluffy cream shearling collar over a black knit. Sitting by "
                "the fire with a camp kettle beside him, resting his cheek on his hand, looking at the viewer with a quiet, aloof gaze "
                "that is just starting to soften. Upper body, centred.",
    'design_D': "Look D: dark-brown, slightly long, soft wavy hair falling naturally around his face, pale grey-blue eyes, a mixed-heritage "
                "elegance. A camel wool coat over a white knit sweater, a dark-green tartan scarf loosely around his neck. Standing by "
                "the fire holding a folded wool blanket over his arm, looking down at the viewer with a soft, slightly awkward smile. "
                "Upper body, centred.",
}

GAKU = ("Gaku: the exact man from image 1 — sleek short black hair with a hidden deep-green inner colour at the nape and sides, "
        "long-lashed cool dark-grey eyes, a thin silver chain necklace, a black aviator jacket with a fluffy cream shearling collar over a "
        "black knit. 26, a solo winter-camping live streamer: extremely handsome, cool and quiet (kuudere), secretly gentle and shy.")
STREAM = ("Composition for a live-stream frame: the camera is a small binaural microphone on a camp chair by the fire (the viewer's "
          "head). Keep everything important in the LEFT three quarters of the picture; the right quarter is calm background (it will be "
          "covered by the chat column). The lower 20% stays simple for subtitles.")
CAMP = ("Background (the same campsite as image 1): a winter lakeside campsite at night — the campfire in a ring of stones just RIGHT of "
        "centre casting warm amber light on him from the right, the canvas tent glowing behind, dark snowy pine trees, a dark blue lake "
        "on the left, light snow on the ground and a starry navy sky; cold blue moonlight from the LEFT.")
SCENES = {
    'gaku_live': [GAKU, "He sits on a low camp stool about one metre in front of the camera, slightly left of centre, leaning forward with "
                  "his forearms on his knees, looking straight into the camera with a cool, calm face and the faintest smile. Upper body.", CAMP, STREAM, WIDE],
    'gaku_log': [GAKU, "He crouches beside the campfire (right of centre), placing a split log on the fire with one hand, sparks rising; "
                 "he turns his face toward the camera with a quiet look. The fire burns brighter, strong warm light on his face.", CAMP, STREAM, WIDE],
    'gaku_left': [GAKU, "Very close: he has sat down right next to the camera on its LEFT side to block the cold wind from the lake. His "
                  "face and shoulder are large in the LEFT half of the frame, turned three-quarters toward the camera, looking at it "
                  "from very near with a gentle, slightly shy expression, his shearling collar filling the left edge. Behind him the "
                  "dark lake; the campfire glows at the right of centre.", CAMP, STREAM, WIDE],
    'gaku_coffee': [GAKU, "Close, in front of the camera: he holds a steaming black enamel camp mug of hot coffee right in front of the "
                    "camera with both hands, soft white steam rising across the frame, his face just behind the mug looking at the camera "
                    "with a small, shy smile. A black camp kettle on the stones by the fire.", CAMP, STREAM, WIDE],
    'gaku_imo': [GAKU, "Close, in front of the camera, slightly to the right: he holds a roasted sweet potato wrapped in foil, broken in "
                 "half to show the golden steaming inside, offering it toward the camera, soft steam rising; his face looking at the "
                 "camera with a rare, warm little smile.", CAMP, STREAM, WIDE],
    'gaku_blanket': [GAKU, "Snow is falling softly. Close in front of the camera, he leans over it and drapes a thick grey wool blanket over "
                     "the camera — the blanket's soft edge hangs across the top of the frame, his arms reach in from both sides holding it, "
                     "snowflakes on his black hair and collar, looking down into the camera with a tender, quiet look. The campfire "
                     "is lower now, glowing embers.", CAMP, STREAM, WIDE],
    'gaku_whisper_R': [GAKU, "Very close: he leans in toward the camera's RIGHT ear to whisper. His face is large just right of centre "
                       "(between 40% and 75% of the width), turned three-quarters, eyes half closed, lips near the ear, a few snowflakes "
                       "in his hair; the left half shows the softly blurred snowy lake at night. Intimate and quiet.", STREAM, WIDE],
    'gaku_bye': [GAKU, "Snow falling softly, the campfire burned down to warm embers. He sits on the camp stool about one metre in front "
                 "of the camera, slightly left of centre, raising one hand in a small, awkward wave goodbye, a shy, warm smile, a grey "
                 "wool blanket over his shoulders.", CAMP, STREAM, WIDE],
}


def upload_once(path, cache):
    p = os.path.join(ROOT, 'project', cache)
    if os.path.exists(p) and time.time() - os.path.getmtime(p) < 3600: return json.load(open(p))['url']
    u = m.upload([path])[0]; json.dump({'url': u}, open(p, 'w')); return u


def gen(name, text, url=None, tag='d24'):
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


def designs(names):
    print('balance:', m.unwrap(m.call('GET', '/credits/balance')), flush=True)
    for n in names or list(DESIGNS):   # text-to-image: the upload endpoint was rate-limited (2026-11-08); LOOK spells out the No. 3 soft cel
        gen(n, '\n\n'.join([LOOK, PERSONA, DESIGNS[n], CAMP, WIDE, AVOID]))
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
