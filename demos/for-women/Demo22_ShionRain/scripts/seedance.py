"""Seedance (GPT Image 2) stills for Shion's rainy night — Demo 10's API client loaded by path (as in Demo 20).

  python3 scripts/seedance.py               # all scenes (skips files that exist)
  python3 scripts/seedance.py shion_door    # only these

Character + style reference: assets/art/ref_shion.png (the user's chosen sheet shion_v4_platinum.png from Demo16_HandshakeEvent).
It is uploaded once (the upload API is rate-limited); every scene is image-to-image from it. Raw PNGs in assets/art/ stay out of git →
scripts/prepare_art.py → media/art/*.jpg. Stills first, video last (user, 2026-11-08).
"""
import glob, importlib.util, json, os, sys, time, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location('d10_seedance', glob.glob(os.path.join(ROOT, '..', '..', '*', 'Demo10_CaveSpring', 'scripts', 'seedance_images.py'))[0])
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
m.OUT = os.path.join(ROOT, 'assets', 'art')
m.LOG = os.path.join(ROOT, 'project', 'seedance_log.json')
REF = os.path.join(m.OUT, 'ref_shion.png')

LOOK = ("Art style EXACTLY like image 1 (the user's chosen character sheet): soft modern anime illustration, thin coloured lineart, soft "
        "cel shading, a muted lavender / violet night palette with warm amber lamp light, gentle round bokeh. Realistic adult proportions "
        "(not chibi), a handsome, elegant bishounen face, romantic otome-game card quality.")
SHION = ("Shion: the exact man from image 1 — long platinum-blonde hair, loose messy bangs, the rest tied in a low ponytail falling over "
         "one shoulder, calm grey-violet eyes, a small beauty mark under his right eye, a silver ear cuff, a thin silver chain necklace, a "
         "loose white silk shirt open at the chest with the sleeves rolled up. 27, the keyboardist of an idol group: soft-spoken, elegant, "
         "with a quiet, knowing, slightly dangerous smile.")
ROOM = ("Background: his quiet apartment at night — warm amber floor-lamp light, a dark grey sofa, a black upright piano in the back, "
        "a large window with rain streaking down the glass and blurred violet city lights beyond.")
WIDE = "Wide 16:9 game scene, first-person point of view of the viewer (a woman; only her hands may appear). No text, no letters, no logo, no watermark, no speech bubbles, no UI."
AVOID = ("Avoid: chibi, super-deformed, realistic photo, 3D render, extra fingers, deformed hands, extra arms, readable text, glossy "
         "airbrush, heavy bloom, nudity.")

SCENES = {
    'shion_door': [SHION, "He has just opened the door of his apartment for the viewer, who stands outside soaked by the rain. He leans one "
                   "shoulder on the door frame, thin silver-rimmed glasses on, looking down at the viewer with a soft, slightly amused, "
                   "worried smile, a folded white bath towel over his other arm. Warm amber light from the hall behind him; at the very "
                   "edges of the frame cold blue rain and wet darkness. From the chest up, slightly right of centre.", WIDE],
    'shion_towel': [SHION, "Close point-of-view: he stands right in front of the viewer and gently holds a fluffy white bath towel over the "
                    "viewer's head with both hands — the towel's edges hang into the top corners of the frame and his forearms come in "
                    "from the sides. He looks down into the viewer's eyes with a tender, teasing smile, thin silver-rimmed glasses on. "
                    "His face centred, from the chest up.", ROOM, WIDE],
    'shion_dryer': [SHION, "Point-of-view: the viewer sits on the sofa; he stands close in front of her, slightly to the right, holding a sleek "
                    "matte-white hair dryer in his right hand aimed at the LEFT side of the viewer's head (the dryer at the left edge of the "
                    "frame), his left hand raised as if combing through her hair with his fingers. Glasses on, a relaxed, fond smile, a "
                    "few strands of his own platinum hair lifted by the warm air.", ROOM, WIDE],
    'shion_glasses': [SHION, "Close point-of-view: he kneels in front of the viewer at eye level, slowly taking off his thin silver-rimmed "
                      "glasses with one hand (the glasses half-lowered from his face), looking straight into the viewer's eyes with "
                      "half-lidded eyes and a quiet, dangerous, gentle smile. Face centred and close, warm lamp light on one cheek.", ROOM, WIDE],
    'shion_whisper': [SHION, "Very close: without his glasses, he leans in toward the viewer's LEFT ear to whisper. His face is large on the "
                      "LEFT side of the frame, turned three-quarters, eyes half closed, lips near the viewer's ear, a strand of long platinum "
                      "hair falling forward across the frame. The RIGHT half is the softly blurred, rain-streaked window with violet city "
                      "lights. Intimate and quiet.", WIDE],
    'shion_window': [SHION, "He sits beside the viewer on the sofa, on her LEFT, turned toward her, one arm resting along the sofa back, "
                     "glasses off and hanging from his fingers, his head tilted, looking at the viewer with a soft, warm, inviting smile. "
                     "Behind them the large window with rain running down the glass and the blurred violet city at night. He is in the "
                     "LEFT half of the picture; the right side shows the rainy window.", WIDE],
}


def ref_url():
    p = os.path.join(ROOT, 'project', 'ref_url.json')
    if os.path.exists(p) and time.time() - os.path.getmtime(p) < 3600: return json.load(open(p))['url']
    u = m.upload([REF])[0]; json.dump({'url': u}, open(p, 'w')); return u


def scenes(names):
    print('balance:', m.unwrap(m.call('GET', '/credits/balance')), flush=True)
    log = json.load(open(m.LOG)) if os.path.exists(m.LOG) else {}
    url = ref_url()
    for name in names:
        dst = os.path.join(m.OUT, name + '.png')
        if os.path.exists(dst): print('exists', name); continue
        text = '\n\n'.join(['Image 1 is the STYLE and CHARACTER reference.', LOOK] + SCENES[name] + [AVOID])
        body = {'model': 'gpt-image-2', 'mode': 'image-to-image', 'prompt': text, 'inputs': [{'type': 'image', 'url': url}],
                'parameters': {'resolution': '2K', 'aspect_ratio': '16:9'}, 'max_cost_credits': 40}
        n = log.get(name, {}).get('variant', 0) + 1
        idem = f'moheat-d22-{name}-v{n}'.replace('_', '-')
        g = m.unwrap(m.call('POST', '/images', body, {'Idempotency-Key': idem}))
        print(f'[{name}] generation {g["id"]} cost {g.get("credits")}', flush=True)
        log[name] = {'generation': g['id'], 'idempotency_key': idem, 'variant': n}; json.dump(log, open(m.LOG, 'w'), indent=1)
        while True:
            time.sleep(10)
            r = m.unwrap(m.call('GET', f'/generations/{g["id"]}'))
            if r['status'] in ('pending', 'processing'): continue
            if r['status'] != 'success': print(f'  {name} {r["status"]}: {r.get("error")}', flush=True); break
            tmp = dst + '.part'; urllib.request.urlretrieve(r['outputs'][-1]['url'], tmp); os.replace(tmp, dst); print('  saved', name, flush=True); break
    print('balance:', m.unwrap(m.call('GET', '/credits/balance')))


if __name__ == '__main__':
    scenes(sys.argv[1:] or list(SCENES))
