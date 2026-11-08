"""Seedance art for Demo27 (Gaku, redone from the design the new way — DEMO_DESIGN_GUIDE §6.2 / §6.3): an empty background, the
character on a plain background per pose, and expression variants as edits of each pose (talk = mouth open, blink = eyes closed).
Demo24's look / persona prompts and Demo10's API client are loaded by path. No uploads needed: bases are text-to-image, and every
edit / new pose references a FRESH output URL of an earlier generation (the upload endpoint is rate-limited).

  python3 scripts/seedance.py test        # first check: gaku_ref (pose 'live'), bg_camp, gaku_ref_talk, gaku_ref_blink
  python3 scripts/seedance.py batch2      # the other poses (4 same-face edits, log / left / whisper + their variants)
  python3 scripts/seedance.py <names…>    # any of the jobs below

Raw PNGs → assets/art/ (not in git); log with each generation's output URL → project/seedance_log.json.
"""
import glob, importlib.util, json, os, sys, time, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location('d24', os.path.join(ROOT, 'scripts', 'seedance.py'))
d24 = importlib.util.module_from_spec(spec); spec.loader.exec_module(d24)
m = d24.m
OUT, LOG = os.path.join(ROOT, 'assets', 'art'), os.path.join(ROOT, 'project', 'seedance_log_layers.json')

GAKU = ("Gaku, 26, a solo winter-camping live streamer: " + d24.DESIGNS['design_C'].split(':', 1)[1].split('Sitting')[0].strip() +
        " Extremely handsome, cool and quiet (kuudere), secretly gentle and shy. Keep his signature hair exactly: sleek short black hair "
        "whose fringe falls across one eye, with the hidden deep-green inner colour.")
PLAIN = ("Plain flat light-grey studio background (#c8c8c8), completely empty: no floor line, no shadow on the background, no scenery, "
         "no props except what he holds. Lighting as at a night campfire: warm amber key light from the RIGHT, cool blue rim light from "
         "the LEFT, soft contrast.")
FRAME = ("Straight-on, eye-level camera about one metre in front of him (a phone on a tripod at his eye level); he looks straight into "
         "the lens. Upper body from the waist up, centred, the whole head and shoulders in frame with some space above the head. "
         "Mouth closed, eyes open. Hands and props stay below his chin and never cross his face.")
WIDE = "Wide 16:9 illustration. No text, no letters, no logo, no watermark, no UI."
EDIT = ("Edit this exact image. Keep EVERYTHING identical — same pose, framing, size, position, hair strands, clothes, colours, lighting "
        "and background — and change ONLY {what}. Do not move, zoom or crop the picture.")

JOBS = {   # name: (prompt parts, reference job or None)
    'gaku_ref': ([d24.LOOK, GAKU, "He sits on a black folding camp chair, relaxed, forearms resting on his thighs, a calm cool face "
                  "with the faintest smile.", FRAME, PLAIN, WIDE, d24.AVOID], None),
    'bg_camp': ([d24.LOOK.split(' Realistic adult')[0], "Background plate only, NO people, no chair in the middle: " + d24.CAMP.split(":", 1)[1].strip().replace(" on him", ""),
                 "Eye-level view from a phone on a tripod. The campfire in its ring of stones sits right of centre (about 75% of the width, "
                 "lower third); the centre and left of the picture are open snowy ground in front of the dark lake, where a person will be "
                 "placed later.", WIDE, "Avoid: people, animals, text, chibi, 3D render, photo."], None),
    'gaku_ref_talk': ([EDIT.format(what="his mouth: slightly open as if softly saying 'a', a small natural opening, teeth barely visible")], 'gaku_ref'),
    'gaku_ref_blink': ([EDIT.format(what="his eyes: gently closed in a natural blink (eyelids down, lashes visible); the fringe over his eye stays exactly as it is")], 'gaku_ref'),
}
# poses that are edits of gaku_ref keep his face identical → they reuse gaku_ref_talk / gaku_ref_blink for the face patches
SAME_FACE = ("Keep his face, head, hair, expression and position EXACTLY as they are (same pixels), the same plain grey background "
             "and lighting; do not zoom or crop. Change only his arms / hands and what they hold: {what}")
REF = "Image 1 is the CHARACTER and STYLE reference: the exact same man, outfit and art style."
JOBS.update({
    'gaku_coffee': ([SAME_FACE.format(what="he now holds a steaming black enamel camp mug of hot coffee in both hands in front of his "
                     "chest, lifted a little toward the viewer, soft white steam rising from it (the mug stays below his chin).")], 'gaku_ref'),
    'gaku_imo': ([SAME_FACE.format(what="he now holds up a roasted sweet potato wrapped in foil, broken in half to show the golden "
                  "steaming inside, in one hand at shoulder height on the LEFT side of the picture, beside (not in front of) his face; "
                  "a little steam rising.")], 'gaku_ref'),
    'gaku_blanket': ([SAME_FACE.format(what="he now holds a thick grey wool blanket up with both hands at both sides, raised to the "
                      "height of his ears, the blanket spreading behind his head and over his shoulders like a hood he is about to "
                      "drape over the camera; it never covers his face. A few snowflakes on his hair and collar.")], 'gaku_ref'),
    'gaku_bye': ([SAME_FACE.format(what="he raises one hand (on the LEFT side of the picture) beside his shoulder in a small, awkward "
                  "wave goodbye, palm to the viewer, the hand below his chin level and away from his face; a grey wool blanket is "
                  "draped over his shoulders. A few snowflakes on his hair.")], 'gaku_ref'),
    'gaku_log': ([REF, d24.LOOK, GAKU, "He sits on the same black folding camp chair and leans to the RIGHT side of the picture, "
                  "stretching his arm down toward the lower right corner to place a split log (held in that hand) on a fire that is just "
                  "outside the picture at the lower right; his head turned toward the lens at eye level with a quiet look. Warm firelight "
                  "from the lower right on his face and hand.", FRAME.replace("centred", "slightly left of centre"), PLAIN, WIDE, d24.AVOID], 'gaku_ref'),
    'gaku_left': ([REF, d24.LOOK, GAKU, "Very close: he has moved his chair right next to the camera on its LEFT to shield it from the "
                   "cold lake wind. A close-up of his head and shoulders, filling most of the picture's height, turned toward the lens and "
                   "looking into it from very near with a gentle, slightly shy expression; his shearling collar at the bottom. Eyes and "
                   "mouth unobstructed except for his usual fringe. He holds NOTHING: no cup, no mug, no props; his hands are out of the picture.", "Eye-level, straight into the lens. Mouth closed, eyes open.", PLAIN, WIDE, d24.AVOID], 'gaku_ref'),
    'gaku_whisper': ([REF, d24.LOOK, GAKU, "An intimate close-up event illustration: he leans in from the RIGHT to whisper into the "
                      "listener's right ear, his face large and in three-quarter profile facing LEFT, eyes half closed, lips slightly "
                      "apart near the ear; a few snowflakes in his hair, the edge of a grey wool blanket over his head and shoulders.",
                      PLAIN, WIDE, d24.AVOID], 'gaku_ref'),
    'gaku_log_talk': ([EDIT.format(what="his mouth: slightly open as if softly speaking, a small natural opening")], 'gaku_log'),
    'gaku_log_blink': ([EDIT.format(what="his eyes: gently closed in a natural blink; the fringe stays exactly as it is")], 'gaku_log'),
    'gaku_left_talk': ([EDIT.format(what="his mouth: slightly open as if softly speaking, a small natural opening")], 'gaku_left'),
    'gaku_left_blink': ([EDIT.format(what="his eyes: gently closed in a natural blink; the fringe stays exactly as it is")], 'gaku_left'),
    'gaku_whisper_talk': ([EDIT.format(what="his lips: parted a little more, as in the middle of a whispered word")], 'gaku_whisper'),
})
BATCH2 = ['gaku_coffee', 'gaku_imo', 'gaku_blanket', 'gaku_bye', 'gaku_log', 'gaku_left', 'gaku_whisper',
          'gaku_log_talk', 'gaku_log_blink', 'gaku_left_talk', 'gaku_left_blink', 'gaku_whisper_talk']


def log():
    return json.load(open(LOG)) if os.path.exists(LOG) else {}


def gen(name):
    dst = os.path.join(OUT, name + '.png')
    if os.path.exists(dst): print('exists', name); return
    parts, ref = JOBS[name]
    L = log(); url = None
    if ref:
        url = L.get(ref, {}).get('url')
        if not url: raise SystemExit(f'{name}: generate {ref} first')
    body = {'model': 'gpt-image-2', 'mode': 'image-to-image' if url else 'text-to-image', 'prompt': '\n\n'.join(parts),
            'parameters': {'resolution': '2K', 'aspect_ratio': '16:9'}, 'max_cost_credits': 40}
    if url: body['inputs'] = [{'type': 'image', 'url': url}]
    n = L.get(name, {}).get('variant', 0) + 1
    idem = f'moheat-d27-{name}-v{n}'.replace('_', '-')
    g = m.unwrap(m.call('POST', '/images', body, {'Idempotency-Key': idem}))
    print(f'[{name}] generation {g["id"]} cost {g.get("credits")}', flush=True)
    while True:
        time.sleep(8)
        r = m.unwrap(m.call('GET', f'/generations/{g["id"]}'))
        if r['status'] in ('pending', 'processing'): continue
        if r['status'] != 'success': print(f'  {name} {r["status"]}: {r.get("error")}', flush=True); return
        out = r['outputs'][-1]['url']
        tmp = dst + '.part'; urllib.request.urlretrieve(out, tmp); os.replace(tmp, dst)
        L = log(); L[name] = {'generation': g['id'], 'idempotency_key': idem, 'variant': n, 'url': out, 'credits': g.get('credits')}
        json.dump(L, open(LOG, 'w'), indent=1); print('  saved', name, flush=True); return


if __name__ == '__main__':
    names = sys.argv[1:] or ['test']
    if names == ['test']: names = ['gaku_ref', 'bg_camp', 'gaku_ref_talk', 'gaku_ref_blink']
    if names == ['batch2']: names = BATCH2
    print('balance:', m.unwrap(m.call('GET', '/credits/balance')), flush=True)
    for n in names: gen(n)
    print('balance:', m.unwrap(m.call('GET', '/credits/balance')), flush=True)
