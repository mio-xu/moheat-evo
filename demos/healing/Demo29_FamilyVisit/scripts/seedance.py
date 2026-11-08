#!/usr/bin/env python3
"""Seedance (GPT Image 2, image-to-image, 16:9 2K) stills for the New Year visit — Demo 10's API client loaded by path.
Style + characters = Demo15's approved frames (design A, soft cel): image 1 = duo_call (both, style anchor), image 2 = gp_snow
(grandpa outdoors, the garden). Downscaled copies in assets/art/ref_*.jpg (raw PNGs stay out of git).

  python3 scripts/seedance.py [names]      # default: every scene whose PNG does not exist yet
Key: ~/.seedance_key. One upload for both references (the upload endpoint is rate-limited); Idempotency keys make retries free."""
import importlib.util, json, os, sys, time, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location('d10', os.path.join(ROOT, '..', '..', 'all-ages', 'Demo10_CaveSpring', 'scripts', 'seedance_images.py'))
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
OUT = os.path.join(ROOT, 'assets', 'art'); LOG = os.path.join(ROOT, 'project', 'seedance_log.json')
REFS = [os.path.join(OUT, 'ref_duo_call.jpg'), os.path.join(OUT, 'ref_gp_snow.jpg')]

CAST = ("Image 1 is the CHARACTER and STYLE reference: keep these exact two grandparents and this exact art style (image 2 shows grandpa "
        "outdoors and their snowy garden). Grandma Hana: silver-white hair in a small round bun with a red ball hairpin, round gold-rimmed "
        "glasses, crescent smiling eyes, rosy cheeks, a soft pink hand-knitted cardigan over a lavender blouse with a round collar, a white "
        "apron. Grandpa Gen: bald on top with fluffy white hair at the sides, big bushy white eyebrows, a round white moustache, a round red "
        "nose, small round sparkly black eyes, a navy padded hanten jacket with a white cross pattern over a grey sweater.")
STYLE = ("Art style EXACTLY like image 1: soft modern cel animation with a light, airy palette, thin coloured lineart (warm brown), flat "
         "pastel colours with one soft-edged but still flat shadow tone, simple clean backgrounds, warm and heart-warming like an anime film. "
         "Hand-drawn feel, NOT glossy. The grandparents are cute, small and round, about 5 heads tall, storybook-cute but NOT chibi.")
POV = "First-person view: you are the grandchild (only, at most, your hands may show). Keep the bottom fifth of the picture calm (subtitles)."
WIDE = "Wide 16:9 game scene. No text, no letters, no signs with writing, no logo, no watermark, no speech bubbles, no UI, no frame."
AVOID = ("Avoid: chibi, super-deformed, realistic photo, 3D render, glossy, airbrushed, bloom, scary or ugly old faces, heavy wrinkles, "
         "extra fingers, deformed hands, readable text, letters, extra people.")
SCENES = {
    'visit_station': ("Dusk at a tiny snowy countryside train station: a short wooden platform, a small wooden station building with a warm "
        "lit window and an old lamp post, snow falling, snowy mountains far away, a little one-car local train standing at the LEFT edge. "
        "Grandpa Gen stands on the platform slightly RIGHT of centre, full body at a few metres, holding a dark umbrella with snow on it and "
        "waving his other hand high with a big happy grin; he wears a knitted red hat and a grey scarf with his hanten. Blue dusk with warm lamp light."),
    'visit_genkan': ("The entrance (genkan) of their old countryside house, seen from just outside the open wooden sliding door at night: warm "
        "orange light pours out from inside; grandma Hana hurries towards you from the LEFT of centre in her slippers, arms open for a hug, a "
        "happy teary smile, very close (from the knees up). A stone floor with shoes, a wooden step up, a small shelf with a vase of red "
        "nanten berries, a warm corridor behind. A few snowflakes in the cold blue air at the edges of the picture."),
    'visit_kotatsu': ("Evening, their cosy living room (the same room as image 1), seen from your seat at the kotatsu (red flower-pattern "
        "futon, a bowl of mandarin oranges on top): across the kotatsu grandma (LEFT of centre) holds out a lacquer bowl of hot oshiruko "
        "(sweet red-bean soup with toasted mochi) towards you with soft steam rising, smiling; grandpa (RIGHT of centre) proudly peels a "
        "mandarin orange. At the RIGHT edge a glowing old kerosene stove with a kettle steaming on top. Dried persimmons hang at the window, snow outside."),
    'visit_yard': ("The next morning in their snowy back garden (the garden of image 2): grandpa crouches RIGHT of centre beside a big lumpy "
        "snowman he is building, grinning mischievously, a snowball raised in his hand, about to throw it towards you; grandma sits on the "
        "wooden engawa veranda in the back on the left with a tray of steaming cups of amazake, laughing. Bright soft morning light, snow "
        "falling gently, a persimmon tree with a few orange fruits, a wooden fence."),
    'visit_futon': ("Night, you lie in a futon in a dim tatami bedroom, seen from your pillow: grandma Hana kneels on the LEFT right next to "
        "you, leaning close, gently pulling the thick patterned futon quilt up towards your chin, her face softly lit by a paper andon "
        "lamp, a tender sleepy smile, her cardigan over a nightgown, glasses on. On the RIGHT the sliding door to the next room is a little "
        "open: in the dark, grandpa sleeps far away under his quilt with his mouth open (small). Snow outside the dark window. Warm, dim, very cosy."),
}


def save_last(gid, dst, name):
    while True:
        time.sleep(12)
        g = m.unwrap(m.call('GET', f'/generations/{gid}'))
        if g['status'] in ('pending', 'processing', 'queued'): continue
        if g['status'] != 'success': raise SystemExit(f'  {name} {g["status"]}: {g.get("error")}')
        urllib.request.urlretrieve(g['outputs'][-1]['url'], dst + '.part'); os.replace(dst + '.part', dst)
        print(f'  saved {name}', flush=True); return


def main(names):
    print('balance:', m.unwrap(m.call('GET', '/credits/balance')), flush=True)
    log = json.load(open(LOG)) if os.path.exists(LOG) else {}
    todo = [n for n in names if not os.path.exists(os.path.join(OUT, n + '.png'))]
    if not todo: return print('nothing to do')
    urls = m.upload(REFS); print('uploaded references', flush=True)
    for name in todo:
        body = {'model': 'gpt-image-2', 'mode': 'image-to-image', 'prompt': '\n\n'.join([CAST, STYLE, SCENES[name], POV, WIDE, AVOID]),
                'inputs': [{'type': 'image', 'url': u} for u in urls], 'parameters': {'resolution': '2K', 'aspect_ratio': '16:9'}, 'max_cost_credits': 40}
        idem = f'moheat-d29-{name}-v1'.replace('_', '-')
        g = m.unwrap(m.call('POST', '/images', body, {'Idempotency-Key': idem}))
        print(f'[{name}] generation {g["id"]} cost {g.get("credits")}', flush=True)
        log[name] = {'generation': g['id'], 'idempotency_key': idem, 'prompt': body['prompt']}; json.dump(log, open(LOG, 'w'), ensure_ascii=False, indent=1)
        save_last(g['id'], os.path.join(OUT, name + '.png'), name)
    print('balance:', m.unwrap(m.call('GET', '/credits/balance')), flush=True)


if __name__ == '__main__':
    main(sys.argv[1:] or list(SCENES))
