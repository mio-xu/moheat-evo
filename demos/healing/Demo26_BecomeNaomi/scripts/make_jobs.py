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

POV = ("STRICT FIRST-PERSON VIEW: the camera IS the cat Naomi's own eyes. The camera is LOW, about 25 cm above the surface she "
       "stands on, slightly wide-angle. Naomi's body, head and face are NOT in the picture (the viewer is inside her). The ONLY parts "
       "of her that show are the tips of her own two fluffy WHITE mitten front paws resting at the very bottom edge of the frame, seen "
       "from above, close to the camera. Wide 16:9 game scene. Keep the lower 20 % calm (subtitles go there). No text, no logo, no "
       "watermark, no UI.")
FUR = ("Her fur colour is a soft BLUE-GREY (cool bluish grey, like a Russian Blue tint, never neutral or brownish grey) with white.")
OWNER = ("The cat's owner, a young woman in her twenties, appears ONLY partly (legs, slippers, hands or sweater) and her face is NEVER "
         "shown: cream chunky cable-knit sweater, soft grey sweatpants, fluffy beige slippers, gentle slim hands with short natural nails.")
R_ROOM = "Image 2 is the LAYOUT reference: the SAME cozy apartment (same window, curtains, plant, rug, shelf, colours) seen from a new spot."
R_CAT = "Image 3 is the CHARACTER SHEET of Naomi: copy her exact face, markings and art style for her REFLECTION (but make the grey a clearer blue-grey)."
AVOID_POV = AVOID.replace(', human,', ',') + ", showing the owner's face, a cat sitting in front of the camera, the cat's body or head in the scene, more than two paws, neutral grey fur."

jobs = {}
def job(i, name, refs, *parts):
    jobs[f'{i:02d}'] = {'name': name, 'ratio': '16:9', 'refs': refs, 'prompt': '\n\n'.join(parts)}

job(1, 'window_sill', [STYLE, D11ART('bg_room_day'), D11ART('naomi_sit')], R_STYLE + ' ' + R_ROOM + ' ' + R_CAT, LOOK, POV,
    "Seen through Naomi's eyes as she sits on the wide wooden WINDOWSILL on a WINTER morning, looking slightly to the left at the "
    "window. LEFT half: the big window glass very close to the camera, with delicate white frost flowers on the lower corners of the "
    "pane; outside a pale blue sky and snowy rooftops. Bright golden winter sunlight streams in through the glass from the upper left; a "
    "warm sunbeam falls across the sill and across her two white paw tips at the bottom edge. Naomi appears ONLY as a soft, faint, "
    "semi-transparent REFLECTION in the window glass: her face looking back at the viewer, close and centred in the glass, her own "
    "eyes meeting ours. RIGHT half: the cozy living room seen from the sill height, slightly blurred (round cream rug, low shelf, "
    "little cat tower, fairy lights), empty. Cold blue glass on the left, warm gold light on the right: a clear cool-and-warm contrast. "
    "Her reflection: ", FUR, NAOMI, AVOID_POV)

# --- the other stills: refs = style board, Demo11 room, and the approved window_sill (first-person POV + paw anchor) ---
POVREF = os.path.join(ROOT, 'assets', 'refs', '4_window_sill.jpg')
R_POV = ("Image 3 is the VIEWPOINT reference: the same strict first-person cat's-eye view, the same two fluffy white paw tips at the "
         "bottom edge, the same art style, colours and lighting quality. Do NOT copy its window or reflection.")
PAWS = "Naomi's own two fluffy WHITE mitten paw tips at the bottom edge are the only part of the cat in the picture."
AVOID_POV2 = AVOID_POV + ", reflection of a cat, a cat face anywhere."
pov = lambda i, name, room, *scene: job(i, name, [STYLE, D11ART(room), POVREF], R_STYLE + ' ' + R_ROOM + ' ' + R_POV, LOOK, POV, *scene, PAWS, AVOID_POV2)

pov(2, 'wake_bed', 'bg_room_morning',
    "Early winter MORNING, seen from INSIDE Naomi's round plush cat bed on the living-room floor: the soft, thick cream-and-pink rim of "
    "the bed curves around the lower left and lower right of the frame, slightly out of focus, her two white paw tips curled together "
    "on the cushion at the bottom. Beyond the rim, the same cozy living room at floor level, slightly blurred: soft pink-gold dawn light "
    "through the sheer curtains on the LEFT, a sparrow silhouette on the outside sill; on the RIGHT, an open doorway to a small kitchen "
    "with a warm light on and a little steam rising from a kettle. Sleepy, quiet, cozy.")
pov(3, 'kitchen_fridge', 'bg_room_day',
    "Late morning in the small bright KITCHEN of the same apartment, at floor level. CENTRE-LEFT: a tall cream refrigerator with its door "
    "wide OPEN towards the camera, cold blue-white light pouring out, a soft pale mist of cold air spilling down and flowing across the "
    "light-wood floor towards the camera. RIGHT of the door: the owner standing at the fridge, seen only from the knees down. " + OWNER +
    " Warm sunlight elsewhere in the kitchen; a clear cold-blue pool of light and mist in front.")
pov(4, 'laundry_pile', 'bg_room_day',
    "Early afternoon in the same living room, on the round cream rug at floor level. CENTRE: a big soft heap of freshly tumble-dried "
    "laundry just dumped on the rug - fluffy white and pastel towels, a cream knit sweater, socks - with faint warm wisps of steam rising "
    "from it, glowing in the sunlight. RIGHT edge: the owner's hands letting go of an empty pastel laundry basket. " + OWNER +
    " Inviting, warm and fluffy.")
pov(5, 'laundry_inside', 'bg_room_day',
    "INSIDE the heap of warm freshly dried laundry: soft folds of white towel and cream knit fabric surround the camera on all sides like "
    "a cozy tunnel, warm amber light glowing softly through the thin fabric, tiny dust motes floating; straight ahead a small gap between "
    "the folds shows a bright sliver of the living room. Very warm, muffled, safe. No people.")
pov(6, 'sofa_chest', 'bg_room_night',
    "NIGHT in the same living room. Naomi lies on her owner's CHEST on the sofa: the lower half of the frame is a big soft hill of the "
    "owner's cream chunky cable-knit sweater rising and falling, her two white paw tips resting on it; the owner's relaxed hand rests "
    "gently on the sweater at the lower right. " + OWNER + " Beyond, the room at night: a warm amber floor lamp, fairy lights, and on "
    "the LEFT the window with a deep blue snowy night outside (closed). Cozy, sleepy, warm amber against cool blue.")

if __name__ == '__main__':
    json.dump(jobs, open(os.path.join(ROOT, 'project', 'seedance_jobs.json'), 'w'), indent=1, ensure_ascii=False)
    print(len(jobs), 'jobs')
