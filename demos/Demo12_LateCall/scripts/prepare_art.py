"""assets/art/*.png (Seedance, not in git) → media/art/*.webp (1920×1080).

  python3 scripts/prepare_art.py

Face frames (ren_call_talk/blink/shy, ren_close_talk, ren_door_talk) are aligned to their base with the Naomi demo's
search (loaded by path) and only the face region is blended in, so switching frames never moves Ren or the background.
"""
import importlib.util, os
from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC, DST = os.path.join(ROOT, 'assets', 'art'), os.path.join(ROOT, 'media', 'art')
spec = importlib.util.spec_from_file_location('naomi_prep', os.path.join(os.path.dirname(ROOT), 'Demo11_Naomi', 'scripts', 'prepare_art.py'))
NP = importlib.util.module_from_spec(spec); spec.loader.exec_module(NP)
FULL = ['bg_room', 'bg_room_open', 'ren_call', 'ren_close', 'ren_door']
FACES = {   # base: (variants, face box as fractions of 1920×1080)
    'ren_call': (['talk', 'blink', 'shy'], (.52, .06, .80, .52)),
    'ren_close': (['talk'], (.40, .08, .97, .92)),
    'ren_door': (['talk'], (.36, .02, .60, .42)),
}
has = lambda n: os.path.exists(os.path.join(SRC, n + '.png'))
load = lambda n: Image.open(os.path.join(SRC, n + '.png')).convert('RGB').resize((1920, 1080), Image.LANCZOS)


def main():
    os.makedirs(DST, exist_ok=True)
    for n in FULL:
        if has(n): load(n).save(os.path.join(DST, n + '.webp'), quality=86, method=6); print('full', n)
    for base_name, (variants, fb) in FACES.items():
        if not has(base_name): continue
        base = load(base_name).convert('RGBA')
        box = (round(1920 * fb[0]), round(1080 * fb[1]), round(1920 * fb[2]), round(1080 * fb[3]))
        for v in variants:
            n = f'{base_name}_{v}'
            if not has(n): print('missing', n); continue
            fr = load(n).convert('RGBA')
            warped, best = NP.align(base, fr, box)
            m = Image.new('L', base.size, 0)
            ImageDraw.Draw(m).ellipse(box, fill=255)
            m = m.filter(ImageFilter.GaussianBlur(28))
            out = base.copy(); out.paste(warped.convert('RGB'), (0, 0), ImageChops.multiply(m, warped.getchannel('A')))
            out.convert('RGB').save(os.path.join(DST, n + '.webp'), quality=86, method=6)
            print('face', n, 'diff %.1f scale %.2f dx %d dy %d' % best)


if __name__ == '__main__':
    main()
