"""Seedance (GPT Image 2) for the live-stream demo — Demo 10's API client loaded by path.
Art style = Demo 12's soft-cel pick (assets/art/ref_style3.png is a symlink to Demo 12's style_3_softcel.png).

  python3 scripts/seedance.py design [names]   # the 4 streamer design candidates → assets/art/design_*.png

Key: ~/.seedance_key. Raw PNGs in assets/art/ stay out of git. Idempotency keys make retries free.
"""
import importlib.util, json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location('d10_seedance', os.path.join(os.path.dirname(ROOT), 'Demo10_CaveSpring', 'scripts', 'seedance_images.py'))
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
m.JOBS = os.path.join(ROOT, 'project', 'seedance_jobs.json')
m.OUT = os.path.join(ROOT, 'assets', 'art')
m.LOG = os.path.join(ROOT, 'project', 'seedance_log.json')
REF = os.path.join(m.OUT, 'ref_style3.png')

LOOK = ("Image 1 is the ART STYLE reference ONLY — do NOT draw that young man; draw the new woman described below. "
        "Art style EXACTLY like image 1: soft modern cel animation with a light, airy palette — thin coloured lineart (dark lavender "
        "instead of black), flat pastel colours with one soft-edged but still flat shadow tone, simple clean backgrounds with a few round "
        "lights, gentle and romantic like an anime film. Hand-drawn feel, NOT glossy: no airbrush gradients, no bloom, no heavy glow, no "
        "over-detailed strands. Realistic adult proportions (about 7 heads tall, not chibi), a beautiful adult face. Original character, not a real person.")
SHOT = ("Upper-body portrait from the waist up, she sits at her live-streaming desk at night and looks straight into the webcam (the viewer) "
        "with the expression described, as if talking to her chat. No text, no logo, no watermark, no on-screen UI, no speech bubbles, no frame.")
AVOID = ("Avoid: chibi, super-deformed, childish face, realistic photo, 3D render, glossy, airbrushed, bloom, extra fingers, deformed hands, "
         "text, letters, the man from image 1.")
DESIGNS = {
    'design_A_mint': "Shiromi Mint, 23, a calm ASMR whisper streamer. Long silky mint-green hair fading to white at the tips, loose with a thin low side braid, sleepy pale aqua eyes, a small star hair clip; an oversized white cable-knit cardigan slipping off one shoulder over a pale blue camisole. In front of her stands a binaural dummy-head microphone (a white mannequin head with two realistic ears) and she gently holds a soft brush near one of its ears. Dim lavender room with fairy lights. Expression: soft, sleepy, gentle half-smile.",
    'design_B_hinata': "Hino Hinata, 21, an energetic gamer streamer. Bright orange short bob with one small side ponytail tied with a red ribbon, sparkling golden eyes, a tiny fang; a red-and-white zip hoodie jacket, a white gaming headset around her neck. A game controller in one hand, the other hand making a peace sign; a bowl of very spicy red ramen with steam on the desk. Cosy room with pastel desk lights. Expression: big bright grin, full of energy.",
    'design_C_luna': "Yoi Luna, 25, a cool late-night singing and chatting streamer. Long straight black hair with deep blue inner-colour streaks, dark sapphire eyes with long lashes, a thin black choker and a small crescent-moon earring; a black off-shoulder knit top. A studio condenser microphone with a round pop filter in front of her. Dark room lit by moonlight from a window and a small blue lamp. Expression: calm, mature, a small cool smile, eyes a little half-lidded.",
    'design_D_cocoa': "Amane Cocoa, 22, a sweet and cosy café-style chatting streamer. Fluffy wavy chestnut-brown hair in low twin tails with cream ribbons, a small beret, warm pink eyes; a cream-and-pink frilly blouse with a big soft collar. She holds a big mug of hot cocoa with whipped cream and gentle steam with both hands, about to blow on it. Warm orange room with a heater glow and a plush bear. Expression: sweet, warm, slightly teasing smile.",
}


def design(names):
    print('balance:', m.unwrap(m.call('GET', '/credits/balance')))
    log = json.load(open(m.LOG)) if os.path.exists(m.LOG) else {}
    url = m.upload([REF])[0]
    for name in names:
        dst = os.path.join(m.OUT, name + '.png')
        if os.path.exists(dst): print('exists', name); continue
        body = {'model': 'gpt-image-2', 'mode': 'image-to-image', 'prompt': '\n\n'.join([LOOK, DESIGNS[name], SHOT, AVOID]),
                'inputs': [{'type': 'image', 'url': url}], 'parameters': {'resolution': '1K', 'aspect_ratio': '3:4'}, 'max_cost_credits': 30}
        idem = f'moheat-d14-{name}-v1'.replace('_', '-')
        g = m.unwrap(m.call('POST', '/images', body, {'Idempotency-Key': idem}))
        print(f'[{name}] generation {g["id"]} cost {g.get("credits")}', flush=True)
        log[name] = {'generation': g['id'], 'idempotency_key': idem}; json.dump(log, open(m.LOG, 'w'), indent=1)
        m.wait_save(g['id'], dst, name)
    print('balance:', m.unwrap(m.call('GET', '/credits/balance')))


if __name__ == '__main__':
    a = sys.argv[1:]
    if a[:1] == ['design']: design(a[1:] or list(DESIGNS))
