"""Homepage "Made for the voices fans already love" cards (#stories) — Seedance GPT Image 2, image-to-image.

Each card shows WHO listens + WHAT they listen to (the content is visible on their screen) + the warm ear glow,
so the use case reads at a glance. Product reference = assets/images/media-music.jpg (the MoHeat Evo headset).

  python3 tools/seedance/site_story_cards.py [names] [--v N]   # raw PNGs → $OUT (default: scratchpad), then convert to assets/images/use-*.jpg
Client = Demo 10's seedance_images.py loaded by path. Key: ~/.seedance_key.
"""
import importlib.util, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
spec = importlib.util.spec_from_file_location('d10', os.path.join(ROOT, 'demos/all-ages/Demo10_CaveSpring/scripts/seedance_images.py'))
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
OUT = os.environ.get('OUT', os.path.join(HERE, 'out'))
LOG = os.path.join(HERE, 'site_story_cards_log.json')
REF = os.path.join(ROOT, 'assets/images/media-music.jpg')

PRODUCT = ("Image 1 is the PRODUCT reference only (do not copy that man): the MoHeat Evo headset — a black over-ear headset with soft grey "
           "fuzzy ear pads, an open mechanical black ear cup with small round metal thermal modules and thin red-white wires, and two small "
           "light-up wing fins on top of the headband. Draw exactly this headset on the person below. Its wing fins and the inner rim of the "
           "ear pad glow WARM ORANGE-RED, and a soft warm orange light spills from the ear pad onto the cheek and ear, showing the ear is "
           "being warmed.")
LOOK = ("Photorealistic lifestyle advertising photo, cinematic, shallow depth of field, soft warm practical lights, cosy evening at home, "
        "rich but natural colours, 50mm lens. Portrait 3:4 composition (it may be cropped a little at the top and sides, so keep faces and the screen in the central area). The screen content must be clearly readable as described, large in frame. "
        "Keep the bottom 15% of the picture dark and simple. No text, no letters, no logos, no watermark, no UI captions.")
AVOID = "Avoid: text, letters, logos, extra fingers, deformed hands, distorted headset, the man from image 1, cartoonish faces."

CARDS = {
    'use-idols': ("Over-the-shoulder shot from slightly behind and to the side: a young Japanese woman fan in a pink hoodie, wearing the "
                  "headset, sits on her bed in a cosy room with fairy lights and holds a smartphone up in front of her. The phone screen is "
                  "large in frame and clearly shows a beautiful young idol singer on a bright concert stage with a stand microphone, "
                  "pink and gold stage lights. The fan holds a glowing pink penlight in her other hand and smiles happily, her face in "
                  "three-quarter view. The headset ear facing us glows warm orange."),
    'use-vtubers': ("Over-the-shoulder shot from behind and to the side: a young woman wearing the headset sits at her desk at night in "
                    "front of a large computer monitor. The monitor is large in frame and clearly shows a cute anime-style virtual "
                    "streamer character (a 2D anime girl with silver hair and cat-ear hair accessory) waving and leaning toward the camera "
                    "in a pastel streaming room, with a soft chat column at the side (blurry, no readable text). The woman leans in, "
                    "smiling, her cheek lit by the screen. The headset ear facing us glows warm orange."),
    'use-calls': ("Side three-quarter shot: a Japanese man in his fifties with glasses and a beige cardigan, wearing the headset, sits at a "
                  "wooden dining table in a warm living room in the evening and holds a tablet in both hands. The tablet screen is large "
                  "in frame and clearly shows a video call: his adult daughter and a small child smiling and waving at him from far away. "
                  "He smiles tenderly back at the screen. The headset ear facing us glows warm orange."),
    'use-asmr': ("High angle close shot: a young woman wearing the headset lies on her side on a soft white pillow in a dark bedroom at "
                 "night, eyes closed, a peaceful smile, a blanket pulled up. Beside her face on the pillow lies a smartphone, screen "
                 "large in frame and facing the camera, clearly showing an ASMR video: a person softly whispering into a white binaural "
                 "dummy-head microphone with two realistic ears, gentle lamp light. Only the phone and the warm headset glow light the "
                 "scene. The headset ear facing us glows warm orange."),
}


def main(names, v):
    os.makedirs(OUT, exist_ok=True)
    log = json.load(open(LOG)) if os.path.exists(LOG) else {}
    print('balance:', m.unwrap(m.call('GET', '/credits/balance')))
    url = log.get('_ref_url') or m.upload([REF])[0]
    log['_ref_url'] = url; json.dump(log, open(LOG, 'w'), indent=1)
    for name in names:
        tag = f'{name}_v{v}'
        dst = os.path.join(OUT, tag + '.png')
        if os.path.exists(dst): print('exists', tag); continue
        body = {'model': 'gpt-image-2', 'mode': 'image-to-image', 'prompt': '\n\n'.join([PRODUCT, CARDS[name], LOOK, AVOID]),
                'inputs': [{'type': 'image', 'url': url}], 'parameters': {'resolution': '2K', 'aspect_ratio': '3:4'}, 'max_cost_credits': 40}
        idem = f'moheat-site-{tag}'.replace('_', '-')
        g = m.unwrap(m.call('POST', '/images', body, {'Idempotency-Key': idem}))
        print(f'[{tag}] generation {g["id"]} cost {g.get("credits")}', flush=True)
        log[tag] = {'generation': g['id'], 'idempotency_key': idem}; json.dump(log, open(LOG, 'w'), indent=1)
        m.wait_save(g['id'], dst, tag)
    print('balance:', m.unwrap(m.call('GET', '/credits/balance')))


if __name__ == '__main__':
    args = sys.argv[1:]
    v = 1
    if '--v' in args: i = args.index('--v'); v = int(args[i + 1]); del args[i:i + 2]
    main(args or list(CARDS), v)
