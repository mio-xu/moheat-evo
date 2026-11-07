"""Homepage "Made for the voices fans already love" cards (#stories) — Seedance GPT Image 2, text-to-image (the upload endpoint is often rate-limited).

Each card shows WHO listens + WHAT they listen to (the content is visible on their screen) + the warm ear glow,
so the use case reads at a glance. The headset is described in PRODUCT (look of assets/images/media-music.jpg).

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

PRODUCT = ("No headphones, no earphones, no headset anywhere in the picture. The picture is about the CONTENT, seen from the "
           "listener's own point of view, and about a warm, close, intimate feeling.")
LOOK = ("Photorealistic lifestyle advertising photo, cinematic, shallow depth of field, soft warm practical lights, cosy evening at home, "
        "rich but natural colours, 50mm lens. Portrait 3:4 composition (it may be cropped a little at the top and sides, so keep faces and the screen in the central area). The screen content must be clearly readable as described, large in frame. "
        "Keep the bottom 15% of the picture dark and simple. No text, no letters, no logos, no watermark, no UI captions.")
AVOID = "Avoid: headphones, earphones, headset, text, letters, logos, extra fingers, deformed hands, distorted headset, cartoonish faces."

CARDS = {   # v2 (user: better without the headset) — first-person POV, the screen is the hero
    'use-idols': ("First-person point of view: the viewer's own hands hold a smartphone up close in a cosy dark bedroom with fairy "
                  "lights; one hand also holds a glowing pink penlight. The phone screen fills most of the picture and clearly shows a "
                  "beautiful young Japanese idol singer in a frilly pastel stage dress, leaning toward the camera and smiling sweetly into "
                  "a stand microphone, as if singing just for the viewer, pink and gold stage lights behind her. Warm soft glow from the "
                  "screen on the hands."),
    'use-vtubers': ("First-person point of view at a desk at night: a large computer monitor fills most of the picture and clearly shows "
                    "a cute 2D anime-style virtual streamer girl (silver hair, cat-ear hair accessory, big friendly eyes) leaning close to "
                    "the camera and waving, in a pastel streaming room, with a soft blurred chat column at the side (no readable text). "
                    "The viewer's hand rests on the desk near a keyboard and a mug of tea with steam. Warm desk lamp light."),
    'use-calls': ("First-person point of view: the viewer's own hands hold a tablet over a wooden dining table in a warm living room "
                  "in the evening, a cup of tea beside it. The tablet screen fills most of the picture and clearly shows a video call: "
                  "an elderly Japanese grandmother and a small grandchild smiling and waving close to the camera from their own cosy "
                  "home far away. Warm, tender, family feeling."),
    'use-asmr': ("First-person point of view lying in bed at night: the viewer's hand holds a smartphone just above a soft white "
                 "pillow and blanket in a dark bedroom. The phone screen fills most of the picture and clearly shows an ASMR video: a "
                 "young woman with gentle eyes whispering closely into a white binaural dummy-head microphone with two realistic ears, "
                 "her lips near its ear, soft warm lamp light. Only the phone light and a small warm bedside lamp light the room."),
}


def main(names, v):
    os.makedirs(OUT, exist_ok=True)
    log = json.load(open(LOG)) if os.path.exists(LOG) else {}
    print('balance:', m.unwrap(m.call('GET', '/credits/balance')))
    for name in names:
        tag = f'{name}_v{v}'
        dst = os.path.join(OUT, tag + '.png')
        if os.path.exists(dst): print('exists', tag); continue
        body = {'model': 'gpt-image-2', 'mode': 'text-to-image', 'prompt': '\n\n'.join([PRODUCT, CARDS[name], LOOK, AVOID]),
                'parameters': {'resolution': '2K', 'aspect_ratio': '3:4'}, 'max_cost_credits': 40}
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
