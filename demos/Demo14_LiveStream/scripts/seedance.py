"""Seedance (GPT Image 2) for the live-stream demo — Demo 10's API client loaded by path.
Art style = Demo 12's soft-cel pick (assets/art/ref_style3.png is a symlink to Demo 12's style_3_softcel.png).

  python3 scripts/seedance.py design [names]   # the 4 streamer design candidates → assets/art/design_*.png
  python3 scripts/seedance.py scenes [names]   # the stream frames for Mint + Cocoa (16:9, 2K)

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


# ---------------------------------------------------------------- the stream frames (user's picks: Mint + Cocoa), 16:9 at 2K
DES = {'mint': os.path.join(m.OUT, 'design_A_mint.png'), 'cocoa': os.path.join(m.OUT, 'design_D_cocoa.png')}
LOOK2 = ("Image 1 is the ART STYLE reference only (do not draw that man). Image 2 is the CHARACTER reference: keep this exact woman "
         "(face, hair, eyes, outfit, room). Art style EXACTLY like image 1: soft modern cel animation with a light, airy palette, thin "
         "coloured lineart (dark lavender instead of black), flat pastel colours with one soft-edged but still flat shadow tone, simple "
         "clean backgrounds with a few round lights. Hand-drawn feel, NOT glossy. Realistic adult proportions (not chibi).")
MINT = ("Mint: long silky mint-green hair fading to white at the tips, a thin low side braid, sleepy pale aqua eyes, a small star hair "
        "clip, an oversized white cable-knit cardigan over a pale blue camisole. Her room: dim lavender, fairy lights, a plush cat on a shelf.")
COCOA = ("Cocoa: fluffy wavy chestnut-brown hair in low twin tails with cream ribbons, a small cream beret, warm pink eyes, a cream-and-pink "
         "frilly blouse with a big soft collar. Her room: warm orange light, a heater glow, a plush bear, a window.")
CAM = ("Framed like her live-stream webcam: we look at her across her desk at eye level. Keep the RIGHT quarter of the picture simple "
       "background (a chat overlay will cover it); she is a little LEFT of centre. Wide 16:9. No text, no logo, no watermark, no UI, no speech bubbles.")
DUMMY = ("In the lower foreground, seen from BEHIND, stands her binaural dummy-head microphone: a smooth white mannequin head on a short "
         "stand with two realistic ears, its back towards us, so its LEFT ear is on the left side of the picture and its RIGHT ear on the right side.")
BEAR = ("In the lower foreground, seen from BEHIND, stands her binaural microphone shaped like a plush cream bear head with two round "
        "ear-mics, its back towards us, so its LEFT ear is on the left side of the picture and its RIGHT ear on the right side.")
FACE2 = ("Image 3 is the base picture: the SAME picture, same pose, framing, size, position, background and lighting. ONLY her face changes: ")
SCENES = {   # name: (char, extra refs, prompt parts)
    'mint_live': ('mint', [], [MINT, DUMMY, "She sits behind the dummy head, both hands resting on the desk, looking at the camera with a soft, sleepy, gentle smile, mouth closed.", CAM]),
    'mint_live_talk': ('mint', ['mint_live'], [FACE2 + "mouth slightly open, softly talking, same sleepy eyes."]),
    'mint_live_blink': ('mint', ['mint_live'], [FACE2 + "both eyes closed (relaxed), soft closed smile."]),
    'mint_lean_L': ('mint', ['mint_live'], [MINT, DUMMY, "She leans in close to the dummy head's LEFT ear (on the LEFT side of the picture), her lips almost touching it, whispering, eyes half closed, one hand cupped beside the ear. Her face is in the left half of the picture.", CAM]),
    'mint_lean_R': ('mint', ['mint_live'], [MINT, DUMMY, "She leans in close to the dummy head's RIGHT ear (on the RIGHT-centre of the picture), her lips almost touching it, whispering, eyes half closed, one hand cupped beside the ear.", CAM]),
    'mint_ice': ('mint', ['mint_live'], [MINT, DUMMY, "She holds a clear glass full of ice cubes right next to the dummy head's ear and smiles at the camera, cold condensation on the glass, a faint cool blue light.", CAM]),
    'mint_towel': ('mint', ['mint_live'], [MINT, DUMMY, "She gently wraps a warm, softly steaming white towel around the dummy head's ears with both hands, a cosy warm smile, the room light a bit warmer.", CAM]),
    'mint_bye': ('mint', ['mint_live'], [MINT, DUMMY, "Late at night, the room darker, only the fairy lights on. She rests her cheek on one hand, very sleepy, eyes almost closed, waving a small goodbye with the other hand.", CAM]),
    'cocoa_live': ('cocoa', [], [COCOA, BEAR, "She sits behind the bear microphone holding a big pink mug of hot cocoa with whipped cream and gentle steam in both hands, sweet happy smile at the camera, mouth closed.", CAM]),
    'cocoa_live_talk': ('cocoa', ['cocoa_live'], [FACE2 + "mouth open, talking cheerfully, same sweet eyes."]),
    'cocoa_live_blink': ('cocoa', ['cocoa_live'], [FACE2 + "both eyes closed in a happy smile (closed curved eyes), mouth closed."]),
    'cocoa_fufu': ('cocoa', ['cocoa_live'], [COCOA, BEAR, "She leans toward the bear mic's RIGHT ear holding the steaming cocoa mug near it and blows on the cocoa with pursed lips (fu-fu), cheeks a little puffed, eyes looking at the camera.", CAM]),
    'cocoa_aan': ('cocoa', ['cocoa_live'], [COCOA, "Close-up: she leans toward the camera and holds out a spoon with a melting marshmallow and cocoa straight toward the viewer, as if feeding them, saying 'aaah' with her mouth a little open, playful warm eyes.", CAM]),
    'cocoa_blanket': ('cocoa', ['cocoa_live'], [COCOA, BEAR, "Rain on the dark window behind her. She is wrapped in a big fluffy pink blanket, the heater glowing orange beside her, and she cups both hands softly over the bear mic's RIGHT ear to warm it, smiling tenderly.", CAM]),
    'cocoa_bye': ('cocoa', ['cocoa_live'], [COCOA, BEAR, "She waves goodbye to the camera with both hands, a big bright smile, the empty mug on the desk.", CAM]),
}

# round 2 (user: animation should be more natural, more frames are fine): extra face frames for every shot. Only the eyes / mouth
# are blended in by prepare_art.py, so these must keep the face colour and hair exactly like the base.
KEEP = " Keep her skin colour, cheeks, hair strands and lighting EXACTLY the same as image 3 — no blush, no colour change; only the described part moves."
FX = {
    'talk_s': "mouth slightly open as if softly saying 'u' or 'n' (a small gap), eyes unchanged.",
    'talk': "mouth open, talking (a medium 'a' shape), eyes unchanged.",
    'half': "eyelids half closed (halfway through a blink), mouth unchanged.",
    'blink': "both eyes fully closed (relaxed), mouth unchanged.",
}
for base, kinds in {'mint_live': ['talk_s', 'half'], 'cocoa_live': ['talk_s', 'half'],
                    'mint_lean_L': ['talk_s', 'blink'], 'mint_lean_R': ['talk_s', 'blink'], 'mint_ice': ['talk', 'blink'], 'mint_towel': ['talk', 'blink'], 'mint_bye': ['talk'],
                    'cocoa_fufu': ['blink'], 'cocoa_aan': ['talk_s', 'blink'], 'cocoa_blanket': ['talk', 'blink'], 'cocoa_bye': ['talk', 'blink']}.items():
    for k in kinds:
        SCENES[f'{base}_{k}'] = (base.split('_')[0], [base], [FACE2 + FX[k] + KEEP])


def scenes(names):
    print('balance:', m.unwrap(m.call('GET', '/credits/balance')))
    log = json.load(open(m.LOG)) if os.path.exists(m.LOG) else {}
    for name in names:
        dst = os.path.join(m.OUT, name + '.png')
        if os.path.exists(dst): print('exists', name); continue
        char, extra, parts = SCENES[name]
        paths = [REF, DES[char]] + [os.path.join(m.OUT, e + '.png') for e in extra]
        urls = m.upload(paths)
        lead = [LOOK2] + (["Image 3 shows her in this scene (same room, same camera): keep the room and camera the same."] if extra and not parts[0].startswith('Image 3') else [])
        body = {'model': 'gpt-image-2', 'mode': 'image-to-image', 'prompt': '\n\n'.join(lead + parts + [AVOID]),
                'inputs': [{'type': 'image', 'url': u} for u in urls], 'parameters': {'resolution': '2K', 'aspect_ratio': '16:9'}, 'max_cost_credits': 40}
        idem = f'moheat-d14-{name}-v1'.replace('_', '-')
        g = m.unwrap(m.call('POST', '/images', body, {'Idempotency-Key': idem}))
        print(f'[{name}] generation {g["id"]} cost {g.get("credits")}', flush=True)
        log[name] = {'generation': g['id'], 'idempotency_key': idem}; json.dump(log, open(m.LOG, 'w'), indent=1)
        m.wait_save(g['id'], dst, name)
    print('balance:', m.unwrap(m.call('GET', '/credits/balance')))


if __name__ == '__main__':
    a = sys.argv[1:]
    if a[:1] == ['design']: design(a[1:] or list(DESIGNS))
    if a[:1] == ['scenes']: scenes(a[1:] or list(SCENES))
