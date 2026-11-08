"""Seedance art for Demo34 (Jin, Demo21 redone the standard way — DEMO_DESIGN_GUIDE §6 "标准制作流程"): the empty VIP lounge cut from
Demo21's still, Jin on a plain mid-grey background (Demo21's stills as pose references), mouth / blink variants as edits; the close-up
"gaze" pose is the base of the can / wrist / jacket poses (same face → shared patches). Style text = Demo12's soft cel (Demo21 used the
same style 3), loaded by path. Made on the website: `python3 scripts/seedance.py prompts` → project/web_prompts.json; helpers
tools/seedance/web_helpers.js; downloads → `python3 tools/seedance/web_take.py <demo> <name>`.
"""
import importlib.util, json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location('d12', os.path.join(ROOT, '..', 'Demo12_LateCall', 'scripts', 'seedance.py'))
d12 = importlib.util.module_from_spec(spec); spec.loader.exec_module(d12)

JIN = ("Jin: the exact young man from image 1 — a domineering idol rapper, rich-heir type: messy crimson-red hair, sharp golden eyes, "
       "small black ear studs, black sunglasses, a black leather jacket over an open black shirt, a silver chain, silver rings. Extremely "
       "handsome, confident, a little dangerous smile.")
PLAIN = ("Plain flat MID-GREY studio background (#707070), completely empty: no sofa, no lounge, no scenery, no floor line, no shadow on "
         "the background. Lighting as in a dim VIP lounge: warm amber light from the vanity bulbs on the LEFT, deep red ambience.")
REF = "Image 1 is the CHARACTER, POSE and STYLE reference: redraw the same young man in the same pose and framing, same art style."
EDIT = ("Edit this exact image. Keep EVERYTHING identical — same pose, hands, framing, size, position, hair strands, clothes, colours, "
        "lighting and background — and change ONLY {what}. Do not move, zoom or crop the picture.")
SAME_FACE = ("Keep his face, head, hair, sunglasses on his head, expression and position EXACTLY as they are (same pixels), the same plain "
             "grey background and lighting; do not zoom or crop. Change only his arms / hands and what they hold: {what}")
MOUTH = "his mouth: slightly open as if talking low, a small natural opening (teeth barely visible)"
BLINK = "his eyes: closed in a natural blink (eyelids down, lashes visible); his red bangs stay exactly as they are"
KEEP = "Mouth CLOSED (lips together) in the same smirk."

JOBS = {   # name: (reference — 'd21:<still>' = Demo21's picture, else a job of this list —, prompt parts)
    'bg_lounge': ('d21:jin_lounge', ["Image 1 is the reference picture. Remove the young man completely and fill the space with what is "
                  "behind him — the dark red velvet sofa, the vanity mirror with warm bulbs, the bar table with water bottles and an ice "
                  "bucket — the same composition, colours, lighting and art style. No people, no hands.", d12.WIDE]),
    'jin_lounge': ('d21:jin_lounge', [REF, d12.LOOK4, JIN, "Same pose as image 1: sitting back on a sofa (draw no sofa — only him, his "
                   "body as if seated), legs apart, one arm resting along the back, the other hand stretched toward the viewer beckoning "
                   "'come here', black sunglasses on his eyes. " + KEEP, PLAIN, d12.WIDE]),
    'jin_gaze': ('d21:jin_gaze', [REF, d12.LOOK4, JIN, "Same pose as image 1: a close-up, leaning toward the viewer, sunglasses pushed up "
                 "on his head, his golden eyes looking straight into the viewer's, a confident half-smile. Hands not in the picture. " + KEEP, PLAIN, d12.WIDE]),
    'jin_glasses': ('d21:jin_glasses', [REF, d12.LOOK4, JIN, "Same pose as image 1: a close-up, one ringed hand pulling his black "
                    "sunglasses down his nose, his golden eyes peeking over the lenses at the viewer (the hand beside the glasses, not over "
                    "his mouth). " + KEEP, PLAIN, d12.WIDE]),
    'jin_whisper': ('d21:jin_whisper', [REF, d12.LOOK4, JIN, "Same pose as image 1: very close, he leans in from the RIGHT toward the "
                    "viewer's right ear, his face large, three-quarter view, eyes half closed, a low dangerous smile, sunglasses on his "
                    "head. " + KEEP, PLAIN, d12.WIDE]),
    'jin_can': ('jin_gaze', [SAME_FACE.format(what="his ringed hand now presses an ice-cold silver drink can, beaded with water, toward the "
                "viewer's right cheek at the lower RIGHT of the picture (below his chin, never over his face).")]),
    'jin_wrist': ('jin_gaze', [SAME_FACE.format(what="his ringed hand now grips the viewer's wrist (a slim woman's forearm coming in from the "
                  "lower RIGHT edge), held at chest height below his chin.")]),
    'jin_jacket': ('jin_gaze', [SAME_FACE.format(what="his leather jacket is off; he holds it open with both ringed hands at the bottom of the "
                   "picture, about to wrap it around the viewer's shoulders (an open black shirt and the silver chain on him).")]),
    'jin_lounge_talk': ('jin_lounge', [EDIT.format(what=MOUTH)]),
    'jin_gaze_talk': ('jin_gaze', [EDIT.format(what=MOUTH)]),
    'jin_gaze_blink': ('jin_gaze', [EDIT.format(what=BLINK)]),
    'jin_glasses_talk': ('jin_glasses', [EDIT.format(what=MOUTH)]),
    'jin_whisper_talk': ('jin_whisper', [EDIT.format(what="his lips: parted a little, saying something low at her ear, the same half-closed eyes")]),
}
ORDER = list(JOBS)

if __name__ == '__main__' and sys.argv[1:] == ['prompts']:
    out = {n: {'ref': JOBS[n][0], 'prompt': '\n\n'.join(JOBS[n][1])} for n in ORDER}
    json.dump(out, open(os.path.join(ROOT, 'project', 'web_prompts.json'), 'w'), ensure_ascii=False, indent=1); print('wrote project/web_prompts.json')
