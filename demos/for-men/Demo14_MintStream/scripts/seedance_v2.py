"""Round 4 (user 2026-11-08: "the four streams all happen at home, a bit boring — make the styles differ more, from their settings").
Each streamer now streams from her own place, with her own palette:
  Mint   → a night aquarium after closing (deep teal, jellyfish tank, caustic light)
  Cocoa  → a retro kissaten after closing (warm wood + amber, rain on the shop window)
  Hinata → her ramen yatai at a summer-night festival (red lanterns, night-blue sky, fireworks at the end)
  Luna   → a jazz bar after closing (navy + wine red, one warm spot on the piano, moon through the window)
Same series style (soft cel, dark-lavender lines) and the same faces: image 1 = her old stream frame (style + character).

  python3 scripts/seedance_v2.py <names…>        # → assets/art/v2/<name>.png (the sample stills first)
"""
import importlib.util, json, os, sys, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location('d10_seedance', os.path.join(ROOT, '../../all-ages/Demo10_CaveSpring/scripts/seedance_images.py'))
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
ART = os.path.join(ROOT, 'assets', 'art')
OUT = os.path.join(ART, 'v2')
m.LOG = os.path.join(ROOT, 'project', 'seedance_log_v2.json')
UPLOADS = os.path.join(ROOT, 'project', 'upload_cache_v2.json')

LOOK = ("Image 1 is the ART STYLE and CHARACTER reference: keep this exact woman (face, eyes, hair colour and hairstyle) and this exact "
        "art style, but she is now in a NEW PLACE with a NEW OUTFIT as described below — do NOT copy the room of image 1 (no bedroom, "
        "no gaming chair, no fairy lights, no shelf, no potted plant). Art style EXACTLY like image 1: soft modern cel animation, thin "
        "coloured lineart (dark lavender instead of black), flat colours with one soft-edged but still flat shadow tone, hand-drawn "
        "feel, NOT glossy, no bloom, no airbrush. Realistic adult proportions (about 7 heads tall, not chibi), a beautiful adult face. "
        "Original character, not a real person.")
CAM = ("Framed like her live-stream camera: we look at her at eye level. Keep the RIGHT quarter of the picture simple, calm background "
       "(a chat overlay will cover it); she is a little LEFT of centre. The bottom fifth stays calm too (subtitles). Wide 16:9. "
       "No text, no letters, no signs with writing, no logo, no watermark, no UI, no speech bubbles.")
AVOID = ("Avoid: chibi, super-deformed, childish face, realistic photo, 3D render, glossy, airbrushed, bloom, extra fingers, deformed "
         "hands, any readable text or letters, a bedroom, fairy lights.")

CHAR = {
    'mint': ("Mint: long silky mint-green hair fading to white at the tips, a thin low side braid, sleepy pale aqua eyes, a small star hair "
             "clip. Outfit: an oversized white cable-knit cardigan over a pale blue camisole, a thin aquarium staff lanyard with a blank card."),
    'cocoa': ("Cocoa: fluffy wavy chestnut-brown hair in low twin tails with cream ribbons, a small cream beret, warm pink eyes. Outfit: a "
              "cream frilly blouse with a big soft collar under a dusty-pink café apron."),
    'hinata': ("Hinata: bright orange short bob with one small side ponytail tied with a red ribbon, sparkling golden eyes, a tiny fang. "
               "Outfit: a short red-and-white festival happi coat over a white tank top, a twisted white hachimaki headband, a white "
               "gaming headset around her neck."),
    'luna': ("Luna: long straight black hair with deep blue inner-colour streaks, dark sapphire eyes with long lashes, a thin black "
             "choker, a small crescent-moon earring. Outfit: an elegant midnight-blue satin slip dress with thin straps, a black "
             "cardigan off her shoulders."),
}
PLACE = {
    'mint': ("PLACE: a public aquarium at night after closing time, all visitors gone. Behind her a huge floor-to-ceiling tank glowing deep "
             "teal and aqua, slow pale jellyfish and a few small silver fish drifting, soft rippling caustic light patterns on her and on "
             "the floor, tiny rising bubbles. She sits on a low cushioned bench in front of the tank. Palette: deep teal, aqua, "
             "moonlight white; the only warm light is a small amber staff lamp on the bench."),
    'cocoa': ("PLACE: a small retro Japanese kissaten (coffee shop) after closing time, the sign turned. Dark warm wood counter, a brass "
              "espresso machine, glass jars of coffee beans and sugar, a little vase of flowers, warm amber pendant lamps; behind her a "
              "big shop window onto a dark rainy street with blurred streetlights and raindrops on the glass. She sits behind the "
              "counter on a stool. Palette: caramel brown, cream, amber, with the cool blue-grey rain outside."),
    'hinata': ("PLACE: her own little ramen yatai food stall at a summer-night festival. A row of glowing red paper lanterns along the "
               "stall roof, a short noren curtain (plain, no letters) at the top edge, a steaming pot behind her, the deep navy summer "
               "night sky, blurred festival stalls and lanterns in the distance, a small electric fan clipped to the stall post. She sits "
               "behind the stall's wooden counter. Palette: lantern red and orange against night navy, warm and lively."),
    'luna': ("PLACE: a small jazz bar after closing time, empty. Dark navy walls, a black grand piano lit by one warm spotlight behind her, "
             "a dark wood bar counter with a few upside-down glasses, a deep wine-red velvet curtain, a tall window at the LEFT edge with "
             "the full moon and night city. She sits at the bar counter. Palette: navy, wine red, one warm amber spot; cool and mature."),
}
MIC = {
    'mint': ("In the lower foreground, seen from BEHIND, stands her binaural dummy-head microphone: a smooth white mannequin head on a short "
             "stand with two realistic ears, its back towards us, so its LEFT ear is on the left side of the picture and its RIGHT ear on the right side."),
    'cocoa': ("On the counter in the lower foreground, seen from BEHIND, stands her binaural microphone shaped like a plush cream bear head "
              "with two round ear-mics, its back towards us, so its LEFT ear is on the left side of the picture and its RIGHT ear on the right side."),
    'hinata': ("On the counter in the lower foreground, seen from BEHIND, stands her binaural microphone shaped like a white cat head with "
               "two big cat-ear mics, its back towards us, so its LEFT ear is on the left side of the picture and its RIGHT ear on the right side."),
    'luna': ("On the bar counter in front of her stands a vintage silver studio microphone on a short stand, to the left of her face."),
}
POSE = {
    'mint_live': "She sits behind the dummy head, both hands resting on her knees, looking at the camera with a soft, sleepy, gentle smile, mouth closed.",
    'cocoa_live': "She holds a big pink mug of hot cocoa with whipped cream and gentle steam in both hands, sweet happy smile at the camera, mouth closed.",
    'hinata_live': "A big bowl of very spicy red ramen with steam on the counter in front of her. She holds chopsticks up and grins at the camera, full of energy, mouth closed in a big smile.",
    'luna_live': "She leans on the bar counter, chin resting lightly on one hand, looking at the camera with a calm, mature small smile, mouth closed.",
}
SCENES = {n: [CHAR[n.split('_')[0]], PLACE[n.split('_')[0]], MIC[n.split('_')[0]], p, CAM] for n, p in POSE.items()}

# ---------------------------------------------------------------- the other shots (after the user approves the four bases)
SAME = "Image 1 shows her in this place: keep the SAME place, outfit, camera and lighting as image 1 (and do not go back to any bedroom). "
SHOTS = {
    'mint_lean_L': "She leans in close to the dummy head's LEFT ear (on the LEFT side of the picture), her lips almost touching it, whispering, eyes half closed, one hand cupped beside the ear. Her face is in the left half of the picture.",
    'mint_lean_R': "She leans in close to the dummy head's RIGHT ear (on the RIGHT-centre of the picture), her lips almost touching it, whispering, eyes half closed, one hand cupped beside the ear.",
    'mint_ice': "She holds a clear glass full of ice cubes right next to the dummy head's ear and smiles at the camera, cold condensation on the glass, the tank's teal light glinting in the ice.",
    'mint_towel': "She gently wraps a warm, softly steaming white towel around the dummy head's ears with both hands, a cosy warm smile; the small amber staff lamp glows a little brighter.",
    'mint_bye': "Later at night, the hall darker, only the glowing tank. She rests her cheek on one hand, very sleepy, eyes almost closed, waving a small goodbye with the other hand.",
    'cocoa_fufu': "She leans toward the bear mic's RIGHT ear holding the steaming cocoa mug near it and blows on the cocoa with pursed lips (fu-fu), cheeks a little puffed, eyes looking at the camera.",
    'cocoa_aan': "Close-up: she leans across the counter toward the camera and holds out a spoon with a melting marshmallow and cocoa straight toward the viewer, as if feeding them, saying 'aaah' with her mouth a little open, playful warm eyes.",
    'cocoa_blanket': "Heavier rain streams down the dark shop window behind her. She is wrapped in a big fluffy pink blanket, a small round kerosene stove glowing orange beside the counter, and she cups both hands softly over the bear mic's RIGHT ear to warm it, smiling tenderly.",
    'cocoa_bye': "She waves goodbye to the camera with both hands, a big bright smile, the empty mug on the counter.",
    'hinata_eat': "She slurps a big mouthful of red ramen noodles with her chopsticks, eyes squeezed shut with determination, steam rising.",
    'hinata_spicy': "Too spicy! She sticks her tongue out and fans her mouth with one hand, a few sweat drops, teary eyes, a funny panicked face; only a light pink on her cheeks (NOT a red face).",
    'hinata_cool': "Relief: the stall's small electric fan blows her hair back, she holds a cold glass ramune bottle (beaded with water drops, a marble in its neck) and smiles blissfully with closed eyes.",
    'hinata_fan': "She leans forward and fans the cat-ear microphone (and the viewer) with a round paper festival uchiwa fan (plain pattern, no letters), playful wink.",
    'hinata_whisper': "She leans in close to the cat mic's RIGHT ear (right-centre of the picture), one hand cupped beside her mouth, whispering a secret with a shy smile.",
    'hinata_bye': "Big fireworks burst in the night sky above the festival behind her, their coloured light on her face; she waves goodbye with both hands and a huge grin, the empty ramen bowl on the counter.",
    'luna_window': "She stands by the tall bar window on the LEFT side of the picture, the window half open, the night wind lifting the curtain and her hair, moonlight on her face, looking at the camera.",
    'luna_tea': "She sits at the bar counter holding a cup of hot black tea with gentle steam in both hands near the microphone, a soft warm smile, a teapot beside her.",
    'luna_piano': "She sits at the black grand piano in the warm spotlight a little further back, playing softly with both hands, eyes closed, a gentle smile; the bar around her dark.",
    'luna_close': "Intimate close-up: she leans in very close to the camera from the LEFT side, as if whispering into the viewer's left ear, half-lidded eyes, hair falling forward.",
    'luna_bye': "Before dawn: the window shows a pale blue-grey sky over the city. Her black cardigan pulled around her shoulders, she waves a small goodbye with a gentle sleepy smile at the counter.",
}
for n, p in SHOTS.items():
    c = n.split('_')[0]
    SCENES[n] = [CHAR[c], PLACE[c], MIC[c], SAME + p, CAM]

# face frames: only the eyes / mouth change (prepare_art.py blends just those boxes into the base)
FACE = "Image 1 is the base picture: the SAME picture, same pose, framing, size, position, background and lighting. ONLY her face changes: "
KEEP = " Keep her skin colour, cheeks, hair strands and lighting EXACTLY the same as image 1 — no blush, no colour change; only the described part moves."
FX = {'talk_s': "mouth slightly open as if softly saying 'u' or 'n' (a small gap), eyes unchanged.",
      'talk': "mouth open, talking (a medium 'a' shape), eyes unchanged.",
      'half': "eyelids half closed (halfway through a blink), mouth unchanged.",
      'blink': "both eyes fully closed (relaxed), mouth unchanged."}
FACES = {'mint_live': ['talk', 'talk_s', 'half', 'blink'], 'mint_lean_L': ['talk_s'], 'mint_lean_R': ['talk_s'], 'mint_ice': ['talk'], 'mint_towel': ['talk'], 'mint_bye': ['talk'],
         'cocoa_live': ['talk', 'talk_s', 'half', 'blink'], 'cocoa_fufu': ['talk_s'], 'cocoa_aan': ['talk_s'], 'cocoa_blanket': ['talk'], 'cocoa_bye': ['talk'],
         'hinata_live': ['talk', 'blink'], 'hinata_spicy': ['talk'], 'hinata_cool': ['talk'], 'hinata_whisper': ['talk_s'], 'hinata_bye': ['talk'],
         'luna_live': ['talk', 'talk_s', 'blink'], 'luna_window': ['talk'], 'luna_tea': ['talk'], 'luna_piano': ['talk'], 'luna_close': ['talk'], 'luna_bye': ['talk']}
for base, kinds in FACES.items():
    for k in kinds: SCENES[f'{base}_{k}'] = [FACE + FX[k] + KEEP]
BASE_OF = {f'{b}_{k}': b for b, ks in FACES.items() for k in ks}


def ref_url(ref):
    """A reference: 'v2:<name>' = a round-4 image already generated (its signed output URL, no upload), else a local path
    (uploaded once and cached; one upload request for all missing paths, ≤5 files — the upload endpoint is rate-limited)."""
    if ref.startswith('v2:'):
        log = json.load(open(m.LOG))
        return m.unwrap(m.call('GET', f"/generations/{log[ref[3:]]['generation']}", tries=3))['outputs'][0]['url']
    cache = json.load(open(UPLOADS)) if os.path.exists(UPLOADS) else {}
    if ref not in cache:
        cache[ref] = m.upload([ref])[0]; json.dump(cache, open(UPLOADS, 'w'), indent=1)
    return cache[ref]


def preupload(paths):
    cache = json.load(open(UPLOADS)) if os.path.exists(UPLOADS) else {}
    todo = [p for p in dict.fromkeys(paths) if not p.startswith('v2:') and p not in cache]
    for i in range(0, len(todo), 5):
        for p, u in zip(todo[i:i + 5], m.upload(todo[i:i + 5])): cache[p] = u
        json.dump(cache, open(UPLOADS, 'w'), indent=1); print('uploaded', len(todo[i:i + 5]), flush=True)


def refs_of(name):   # the four new bases come from the old frames; shots refer to her new base, face frames to their shot (no upload)
    ch = name.split('_')[0]
    if name in BASE_OF: return [f'v2:{BASE_OF[name]}']
    return [os.path.join(ART, 'web', f'{ch}_live.jpg')] if name.endswith('_live') else [f'v2:{ch}_live']


def scenes(names):
    os.makedirs(OUT, exist_ok=True)
    print('balance:', m.unwrap(m.call('GET', '/credits/balance')))
    preupload([r for n in names for r in refs_of(n)])
    log = json.load(open(m.LOG)) if os.path.exists(m.LOG) else {}
    for name in names:
        dst = os.path.join(OUT, name + '.png')
        if os.path.exists(dst): print('exists', name); continue
        refs = refs_of(name)
        idem = f'moheat-d14v2-{name}-v1'.replace('_', '-')
        for attempt in range(4):
            try:
                lead = [] if name in BASE_OF else [LOOK]   # face frames: only the edit instruction
                body = {'model': 'gpt-image-2', 'mode': 'image-to-image', 'prompt': '\n\n'.join(lead + SCENES[name] + [AVOID]),
                        'inputs': [{'type': 'image', 'url': ref_url(r)} for r in refs],
                        'parameters': {'resolution': '2K', 'aspect_ratio': '16:9'}, 'max_cost_credits': 40}
                g = m.unwrap(m.call('POST', '/images', body, {'Idempotency-Key': idem}, tries=6))
                print(f'[{name}] generation {g["id"]} cost {g.get("credits")}', flush=True)
                log[name] = {'generation': g['id'], 'idempotency_key': idem}; json.dump(log, open(m.LOG, 'w'), indent=1)
                m.wait_save(g['id'], dst, name); break
            except SystemExit as e:
                print('  retry', name, str(e)[:200], flush=True); time.sleep(30)
    print('balance:', m.unwrap(m.call('GET', '/credits/balance')))


if __name__ == '__main__':
    scenes(sys.argv[1:] or list(SCENES))
