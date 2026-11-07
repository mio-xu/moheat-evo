"""Write project/seedance_jobs.json: the Seedance (GPT Image 2, image-to-image) stills for Demo26 'ねこになった日'.

  python3 scripts/make_jobs.py

Art style = Demo11 exactly (user, 2026-11-08): LOOK, NAOMI, AVOID and the style board are taken from Demo11's make_jobs.py
by path (only its constant block is executed, so Demo11's own jobs file is never touched). Layout refs = Demo11's room PNGs.
"""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D11 = os.path.join(os.path.dirname(ROOT), 'Demo11_Naomi')
src = open(os.path.join(D11, 'scripts', 'make_jobs.py'), encoding='utf-8').read().split('\njobs = {}')[0]
C = {'__file__': os.path.join(D11, 'scripts', 'make_jobs.py')}; exec(src, C)
STYLE, LOOK, NAOMI, AVOID, R_STYLE = C['STYLE'], C['LOOK'], C['NAOMI'], C['AVOID'], C['R_STYLE']
D11ART = lambda n: os.path.join(D11, 'assets', 'art', n + '.png')

POV = ("First-person view through the eyes of the cat Naomi: the camera is LOW, about 25 cm above the surface she stands on, "
       "slightly wide-angle, as if the viewer IS the cat. At most her own two fluffy WHITE mitten front paws show at the bottom edge. "
       "Wide 16:9 game scene. Keep the lower 20 % calm (subtitles go there). No text, no logo, no watermark, no UI.")
OWNER = ("The cat's owner, a young woman in her twenties, appears ONLY partly (legs, slippers, hands or sweater) and her face is NEVER "
         "shown: cream chunky cable-knit sweater, soft grey sweatpants, fluffy beige slippers, gentle slim hands with short natural nails.")
R_ROOM = "Image 2 is the LAYOUT reference: the SAME cozy apartment (same window, curtains, plant, rug, shelf, colours) seen from a new spot."
R_CAT = "Image 3 is the CHARACTER SHEET of Naomi: copy her exact face, markings, colours and art style wherever she appears."
AVOID_POV = AVOID.replace(', human,', ',') + ", showing the owner's face, extra paws, full cat body in front of the camera."

jobs = {}
def job(i, name, refs, *parts):
    jobs[f'{i:02d}'] = {'name': name, 'ratio': '16:9', 'refs': refs, 'prompt': '\n\n'.join(parts)}

job(1, 'window_sill', [STYLE, D11ART('bg_room_day'), D11ART('naomi_sit')], R_STYLE + ' ' + R_ROOM + ' ' + R_CAT, LOOK, POV,
    "Naomi sits on the wide wooden WINDOWSILL on a WINTER morning. LEFT half: the big window glass very close to her, with delicate white "
    "frost flowers on the lower corners of the pane; outside a pale blue sky and snowy rooftops. Bright golden winter sunlight streams "
    "in through the glass from the upper left, a warm sunbeam falls across the sill and her white paws. On the glass, a soft, faint, "
    "semi-transparent REFLECTION of Naomi's own face (blue-grey and white, white inverted-V blaze, pink nose, big olive-green eyes) "
    "looking back at the viewer. RIGHT half: the cozy living room seen from the sill height, slightly blurred (round cream rug, low shelf, "
    "little cat tower), empty. Cold blue glass on the left, warm gold light on the right: a clear cool-and-warm contrast.", NAOMI, AVOID_POV)

if __name__ == '__main__':
    json.dump(jobs, open(os.path.join(ROOT, 'project', 'seedance_jobs.json'), 'w'), indent=1, ensure_ascii=False)
    print(len(jobs), 'jobs')
