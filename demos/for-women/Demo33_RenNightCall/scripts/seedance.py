"""Seedance art for Demo33 (Ren, Demo12 redone the standard way — DEMO_DESIGN_GUIDE §6 "标准制作流程"): empty backgrounds (his
street, the window, your door) cut from Demo12's stills, Ren on a plain mid-grey background per pose (Demo12's stills as pose
references), mouth-open / eyes-closed variants as edits. Demo12's look / character prompts are loaded by path.
Made on the website (uploads shared with the API): `python3 scripts/seedance.py prompts` → project/web_prompts.json (job → reference +
prompt); helpers tools/seedance/web_helpers.js; downloads → `python3 tools/seedance/web_take.py <demo> <name>`.
Your room (bg_room / bg_room_open) has no Ren in it: Demo12's pictures are used as they are.
"""
import importlib.util, json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location('d12', os.path.join(ROOT, '..', 'Demo12_LateCall', 'scripts', 'seedance.py'))
d12 = importlib.util.module_from_spec(spec); spec.loader.exec_module(d12)

PLAIN = ("Plain flat MID-GREY studio background (#707070), completely empty: no scenery, no floor line, no shadow on the background. "
         "Night lighting: soft cool blue light from the city, a little warm light on his face.")
REF = "Image 1 is the CHARACTER, POSE and STYLE reference: redraw the same young man in the same pose and framing, same art style."
REF2 = ("Image 1 is the CHARACTER and ART-STYLE reference: match its face, hair, outfit, line weight, shading and colours EXACTLY "
        "(the same drawing as image 1, as if from the same illustrator on the same day). Image 2 is ONLY the pose and framing reference — "
        "ignore image 2's drawing style, line weight and colouring.")   # user: close-ups and wide shots must match; Demo12's own stills differ in style
EMPTY = ("Image 1 is the reference picture. Remove the young man completely and fill the space with what is behind him — {what} — the "
         "same composition, colours, lighting and art style. No people, no hands, no phone.")
EDIT = ("Edit this exact image. Keep EVERYTHING identical — same pose, hands, framing, size, position, hair strands, clothes, colours, "
        "lighting and background — and change ONLY {what}. Do not move, zoom or crop the picture.")
MOUTH = "his mouth: slightly open as if talking softly, a small natural opening (teeth barely visible)"
BLINK = "his eyes: closed in a natural blink (eyelids down, lashes visible); his silver bangs stay exactly as they are"
KEEP = "Mouth CLOSED (lips together) in the same gentle expression, eyes as in image 1."

JOBS = {   # name: (reference — 'd12:<still>' = Demo12's picture, else a job of this list —, prompt parts)
    'bg_street': ('d12:ren_call', [EMPTY.format(what="the quiet snowy city street at night, the street lamp, the buildings with lit windows, falling snow"), d12.WIDE]),
    'bg_window': ('d12:ren_close', [EMPTY.format(what="a dark room by a large window with blurred city lights (bokeh) at night"), d12.WIDE]),
    'bg_door': ('d12:ren_door', [EMPTY.format(what="the open front door seen from inside, the snowy night corridor with its railing and ceiling light, warm light from inside on the door frame"), d12.WIDE]),
    'ren_call': ('d12:ren_call', [REF, d12.LOOK4, d12.REN4, "Same pose as image 1: medium shot from the chest up, holding a smartphone to "
                 "his ear, talking to the viewer on the phone with a gentle smile, placed in the RIGHT half of the picture. " + KEEP, PLAIN, d12.WIDE]),
    'ren_close': (['ren_call', 'd12:ren_close'], [REF2, d12.LOOK4, d12.REN4, "Same pose as image 2: an intimate close-up, his face very near the viewer, "
                  "slightly tilted, the phone against his ear, half-lidded soft eyes, faint pink blush, a little right of centre. " + KEEP, PLAIN, d12.WIDE]),
    'ren_door': (['ren_call', 'd12:ren_door'], [REF2, d12.LOOK4, d12.REN4, "Same pose as image 2: standing, from the waist up, centred, snow on his silver "
                 "hair and on the shoulders of his coat, cheeks pink from the cold, his phone lowered in one hand, a shy happy smile. " + KEEP, PLAIN, d12.WIDE]),
    'ren_hug': (['ren_call', 'd12:ren_hug'], [REF2, d12.LOOK4, d12.REN4, "Same pose as image 2: a close hug — he holds the viewer (her long brown hair "
                "and shoulder at the right, seen from behind) against him, his cheek near her ear, his face on the LEFT, eyes closed, a "
                "peaceful happy smile with lips closed, snow on his hair and coat.", PLAIN, d12.WIDE]),
    'ren_call_talk': ('ren_call', [EDIT.format(what=MOUTH)]),
    'ren_call_blink': ('ren_call', [EDIT.format(what=BLINK)]),
    'ren_close_talk': ('ren_close', [EDIT.format(what=MOUTH)]),
    'ren_close_blink': ('ren_close', [EDIT.format(what=BLINK)]),
    'ren_door_talk': ('ren_door', [EDIT.format(what=MOUTH)]),
    'ren_door_blink': ('ren_door', [EDIT.format(what=BLINK)]),
    'ren_hug_talk': ('ren_hug', [EDIT.format(what="his lips: parted a little, whispering into her ear, eyes still closed")]),
}
ORDER = list(JOBS)

if __name__ == '__main__' and sys.argv[1:] == ['prompts']:
    out = {n: {'ref': JOBS[n][0], 'prompt': '\n\n'.join(JOBS[n][1])} for n in ORDER}
    json.dump(out, open(os.path.join(ROOT, 'project', 'web_prompts.json'), 'w'), ensure_ascii=False, indent=1); print('wrote project/web_prompts.json')
