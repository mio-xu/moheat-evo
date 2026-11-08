"""Seedance art for Demo35 (Shion, Demo22 redone the standard way — DEMO_DESIGN_GUIDE §6 "标准制作流程"): two empty backgrounds (his
front door, the living room with the rainy window) cut from Demo22's stills, Shion on a plain DARK-grey background (platinum hair +
white shirt) with Demo22's stills as pose references, mouth / blink variants as edits; "window" is a same-face edit of the dryer pose.
Demo22's look / character prompts are loaded by path. Made on the website: `python3 scripts/seedance.py prompts` →
project/web_prompts.json; helpers tools/seedance/web_helpers.js; downloads → `python3 tools/seedance/web_take.py <demo> <name>`.
"""
import importlib.util, json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location('d22', os.path.join(ROOT, '..', 'Demo22_ShionRain', 'scripts', 'seedance.py'))
d22 = importlib.util.module_from_spec(spec); spec.loader.exec_module(d22)

PLAIN = ("Plain flat DARK-GREY studio background (#404040), completely empty: no room, no window, no scenery, no floor line, no shadow "
         "on the background. Lighting as in his flat on a rainy night: warm lamp light from the RIGHT, cool violet city light from the LEFT.")
REF = "Image 1 is the CHARACTER, POSE and STYLE reference: redraw the same man in the same pose and framing, same art style."
EMPTY = ("Image 1 is the reference picture. Remove the man (and the viewer's hands) completely and fill the space with what is behind "
         "him — {what} — the same composition, colours, lighting and art style. No people, no hands.")
EDIT = ("Edit this exact image. Keep EVERYTHING identical — same pose, hands, framing, size, position, hair strands, glasses, clothes, "
        "colours, lighting and background — and change ONLY {what}. Do not move, zoom or crop the picture.")
SAME_FACE = ("Keep his face, head, hair, glasses, expression and position EXACTLY as they are (same pixels), the same dark grey "
             "background and lighting; do not zoom or crop. Change only his arms / hands and what they hold: {what}")
MOUTH = "his mouth: slightly open as if speaking softly, a small natural opening (teeth barely visible)"
BLINK = "his eyes: closed in a natural blink (eyelids down, lashes visible); his loose bangs and glasses stay exactly as they are"
KEEP = "Mouth CLOSED (lips together) in the same soft smile."

JOBS = {   # name: (reference — 'd22:<still>' = Demo22's picture, else a job of this list —, prompt parts)
    'bg_door': ('d22:shion_door', [EMPTY.format(what="the open front door of his flat, the warm hallway with its wall lamp, the dark rainy night at the door"), d22.WIDE]),
    'bg_room': ('d22:shion_glasses', [EMPTY.format(what="his dim living room at night: the large rainy window with blurred violet city lights, the floor lamp, the sofa"), d22.WIDE]),
    'shion_door': ('d22:shion_door', [REF, d22.LOOK, d22.SHION, "Same pose as image 1: standing in his doorway, one hand on the door "
                   "frame, holding a folded white towel against his chest with the other, looking at the viewer with a soft worried smile, "
                   "from the waist up. " + KEEP, PLAIN, d22.WIDE, d22.AVOID]),
    'shion_towel': ('d22:shion_towel', [REF, d22.LOOK, d22.SHION, "Same pose as image 1: close, he holds a white towel up over the viewer's "
                    "head with both hands (the towel's edge across the top of the picture), drying her hair, looking down at her with a "
                    "gentle smile. " + KEEP, PLAIN, d22.WIDE, d22.AVOID]),
    'shion_dryer': ('d22:shion_dryer', [REF, d22.LOOK, d22.SHION, "Same pose as image 1: he holds a white hair dryer in one hand on the LEFT "
                    "and runs the fingers of his other hand through the viewer's long hair (a few strands of her hair in the lower left "
                    "foreground), looking at her with a calm smile. " + KEEP, PLAIN, d22.WIDE, d22.AVOID]),
    'shion_glasses': ('d22:shion_glasses', [REF, d22.LOOK, d22.SHION, "Same pose as image 1: close, he takes off his glasses with one hand "
                      "(holding them by the temple, beside his face, not over his mouth), leaning toward the viewer, a quiet dangerous "
                      "half-smile, bare eyes. " + KEEP, PLAIN, d22.WIDE, d22.AVOID]),
    'shion_whisper': ('d22:shion_whisper', [REF, d22.LOOK, d22.SHION, "Same pose as image 1: an intimate close-up event illustration — he "
                      "leans in to whisper into the viewer's LEFT ear (her long hair at the left edge), his face large, three-quarter view, "
                      "eyes half closed, lips near her ear. " + KEEP, PLAIN, d22.WIDE, d22.AVOID]),
    'shion_window': ('shion_dryer', [SAME_FACE.format(what="the dryer is gone; he now holds his folded glasses loosely in one hand at chest "
                     "height, his other arm resting along the back of a sofa (draw no sofa), relaxed.")]),
    'shion_door_talk': ('shion_door', [EDIT.format(what=MOUTH)]),
    'shion_door_blink': ('shion_door', [EDIT.format(what=BLINK)]),
    'shion_towel_talk': ('shion_towel', [EDIT.format(what=MOUTH)]),
    'shion_towel_blink': ('shion_towel', [EDIT.format(what=BLINK)]),
    'shion_dryer_talk': ('shion_dryer', [EDIT.format(what=MOUTH)]),
    'shion_dryer_blink': ('shion_dryer', [EDIT.format(what=BLINK)]),
    'shion_glasses_talk': ('shion_glasses', [EDIT.format(what=MOUTH)]),
    'shion_glasses_blink': ('shion_glasses', [EDIT.format(what="his bare eyes: closed in a natural blink (eyelids down, lashes visible); his bangs stay exactly as they are")]),
    'shion_whisper_talk': ('shion_whisper', [EDIT.format(what="his lips: parted a little, whispering into her ear, the same half-closed eyes")]),
}
ORDER = list(JOBS)

if __name__ == '__main__' and sys.argv[1:] == ['prompts']:
    out = {n: {'ref': JOBS[n][0], 'prompt': '\n\n'.join(JOBS[n][1])} for n in ORDER}
    json.dump(out, open(os.path.join(ROOT, 'project', 'web_prompts.json'), 'w'), ensure_ascii=False, indent=1); print('wrote project/web_prompts.json')
