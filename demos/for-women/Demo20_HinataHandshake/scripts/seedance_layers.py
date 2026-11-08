"""Seedance art for the layered Demo20 (Hinata, redone the standard way — DEMO_DESIGN_GUIDE §6 "标准制作流程"): an empty booth backdrop,
Hinata on a plain background per pose (Demo20's stills as pose references), mouth-open / eyes-closed variants as edits.
Demo20's look / character prompts are loaded by path. The API upload was rate-limited (2026-11-08), so the pictures are made on the
website with exactly these prompts: `python3 scripts/seedance.py prompts` writes project/web_prompts.json (job → reference + prompt);
downloads → `python3 tools/seedance/web_take.py <demo> <name>`.
"""
import importlib.util, json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location('d20', os.path.join(ROOT, 'scripts', 'seedance.py'))
d20 = importlib.util.module_from_spec(spec); spec.loader.exec_module(d20)

PLAIN = ("Plain flat light-grey studio background (#c8c8c8), completely empty: no balloons, no lights, no scenery, no floor line, no "
         "shadow on the background. Soft warm, slightly pink-tinted light from the front, like the booth's fairy lights.")
REF = "Image 1 is the CHARACTER, POSE and STYLE reference: redraw the same young man in the same pose and framing, same art style."
EDIT = ("Edit this exact image. Keep EVERYTHING identical — same pose, hands, framing, size, position, hair strands, clothes, colours, "
        "lighting and background — and change ONLY {what}. Do not move, zoom or crop the picture.")
SAME_FACE = ("Keep his face, head, hair, expression and position EXACTLY as they are (same pixels), the same plain grey background, "
             "table and lighting; do not zoom or crop. Change only his arms / hands: {what}")
MOUTH = "his mouth: slightly open as if softly talking, a small natural opening (teeth barely visible, the small fang may show)"
BLINK = "his eyes: closed in a natural blink (eyelids down, lashes visible); his long bangs stay exactly as they are"

JOBS = {   # name: (reference image — an original Demo20 still or a job of this list —, prompt parts)
    'bg_booth': ('d20:hina_booth', ["Image 1 is the reference picture. Remove the young man and the table completely and fill the space "
                 "with the same backdrop: soft pink and lavender balloons, fairy lights and blurred bokeh over the whole picture, the same "
                 "colours, lighting and art style. No people, no hands, no table.", d20.WIDE]),
    'hina_ref': ('d20:hina_booth', [REF, d20.LOOK, d20.HINA, "Same pose as image 1: standing behind the handshake table, leaning slightly "
                 "forward, holding out his right hand toward the viewer for a handshake, from the waist up, in the RIGHT half of the "
                 "picture. Mouth CLOSED in a soft sweet smile (lips together), eyes open, looking at the viewer. Keep the white-cloth "
                 "table edge across the bottom of the picture in front of him.", PLAIN, d20.WIDE, d20.AVOID]),
    'hina_hands': ('d20:hina_hands', [REF, d20.LOOK, d20.HINA, "Same pose as image 1: a close point-of-view shot, he holds the viewer's hand "
                   "(a slim woman's hand coming in from the bottom of the frame) wrapped between both of his hands, raised near his chin, "
                   "looking up at the viewer through his bangs with a soft playful smile and a faint blush; his mouth CLOSED (lips "
                   "together) and visible above the hands. Keep the white-cloth table edge at the bottom.", PLAIN, d20.WIDE, d20.AVOID]),
    'hina_lean': ('d20:hina_lean', [REF, d20.LOOK, d20.HINA, "Same pose as image 1: very close, he leans in toward the viewer's LEFT ear to "
                  "whisper, his face large on the LEFT side of the frame, turned three-quarters toward the viewer, half-lidded eyes glancing "
                  "sideways, a small dark knowing smile with lips closed, one hand raised beside (not over) his mouth. The right half of the "
                  "picture is empty grey.", PLAIN, d20.WIDE, d20.AVOID]),
    'hina_wave': ('hina_ref', [SAME_FACE.format(what="he lowers the hand he was holding out, and raises his other hand high in a cheerful "
                  "wave goodbye, palm to the viewer, beside his head (never over his face).")]),
    'hina_ref_talk': ('hina_ref', [EDIT.format(what=MOUTH)]),
    'hina_ref_blink': ('hina_ref', [EDIT.format(what=BLINK)]),
    'hina_hands_talk': ('hina_hands', [EDIT.format(what=MOUTH)]),
    'hina_hands_blink': ('hina_hands', [EDIT.format(what=BLINK)]),
    'hina_lean_talk': ('hina_lean', [EDIT.format(what="his lips: parted a little, whispering, the same half-lidded knowing eyes")]),
    'hina_lean_blink': ('hina_lean', [EDIT.format(what="his half-lidded eyes: fully closed for a moment (eyelids down); his bangs stay exactly as they are")]),
}
ORDER = ['bg_booth', 'hina_ref', 'hina_hands', 'hina_lean', 'hina_wave', 'hina_ref_talk', 'hina_ref_blink',
         'hina_hands_talk', 'hina_hands_blink', 'hina_lean_talk', 'hina_lean_blink']

if __name__ == '__main__' and sys.argv[1:] == ['prompts']:
    out = {n: {'ref': JOBS[n][0], 'prompt': '\n\n'.join(JOBS[n][1])} for n in ORDER}
    json.dump(out, open(os.path.join(ROOT, 'project', 'web_prompts.json'), 'w'), ensure_ascii=False, indent=1); print('wrote project/web_prompts.json')
