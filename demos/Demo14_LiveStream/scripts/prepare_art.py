"""assets/art/*.png (Seedance, not in git) → media/art/*.webp (1920×1080) + media/cover.jpg.

  python3 scripts/prepare_art.py

Face frames (*_live_talk / *_live_blink) are aligned to their base with the Naomi demo's search (loaded by path) and only
the face region is blended in, so switching frames never moves her or the room.
"""
import importlib.util, os, subprocess
from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC, DST = os.path.join(ROOT, 'assets', 'art'), os.path.join(ROOT, 'media', 'art')
spec = importlib.util.spec_from_file_location('naomi_prep', os.path.join(os.path.dirname(ROOT), 'Demo11_Naomi', 'scripts', 'prepare_art.py'))
NP = importlib.util.module_from_spec(spec); spec.loader.exec_module(NP)
FULL = ['mint_live', 'mint_lean_L', 'mint_lean_R', 'mint_ice', 'mint_towel', 'mint_bye',
        'cocoa_live', 'cocoa_fufu', 'cocoa_aan', 'cocoa_blanket', 'cocoa_bye',
        'hinata_live', 'hinata_eat', 'hinata_spicy', 'hinata_cool', 'hinata_fan', 'hinata_whisper', 'hinata_bye',
        'luna_live', 'luna_window', 'luna_tea', 'luna_musicbox', 'luna_close', 'luna_bye']
FACES = {   # base: (eyes box, mouth box) in 1920×1080 px. Talk frames blend ONLY the mouth, blink frames ONLY the eyes, so the
            # skin colour, blush and hair always stay those of the base frame. Boxes are checked with `prepare_art.py boxes`.
    'mint_live': ((450, 285, 715, 375), (550, 385, 660, 450)),
}
KINDS = ['talk_s', 'talk', 'half', 'blink']
has = lambda n: os.path.exists(os.path.join(SRC, n + '.png'))
load = lambda n: Image.open(os.path.join(SRC, n + '.png')).convert('RGB').resize((1920, 1080), Image.LANCZOS)


def soft_box(b, pad=14):
    m = Image.new('L', (1920, 1080), 0); ImageDraw.Draw(m).rounded_rectangle((b[0] - pad, b[1] - pad, b[2] + pad, b[3] + pad), radius=40, fill=255)
    return m.filter(ImageFilter.GaussianBlur(12))


def boxes():   # contact sheet with the boxes drawn, to check them
    for n, (e, mo) in FACES.items():
        if not has(n): continue
        im = load(n); d = ImageDraw.Draw(im); d.rectangle(e, outline=(0, 255, 255), width=3); d.rectangle(mo, outline=(255, 0, 128), width=3)
        im.resize((960, 540)).save(os.path.join(ROOT, 'project', f'box_{n}.jpg'), quality=80)


def change_mask(base, warped, box):
    """Only the parts that really changed (eyes, mouth): |diff| inside the face box → blobs → keep the strongest few → feather.
    Skin tone, blush and hair drift outside those blobs stay exactly as in the base frame."""
    import numpy as np
    from scipy import ndimage
    a = np.asarray(base.convert('RGB'), np.float32); b = np.asarray(warped.convert('RGB'), np.float32)
    d = np.abs(a - b).max(2); d[np.asarray(warped.getchannel('A')) < 250] = 0
    x0, y0, x1, y1 = box; inside = np.zeros_like(d, bool); inside[y0:y1, x0:x1] = True
    hot = ndimage.binary_opening((d > 38) & inside, iterations=1)
    hot = ndimage.binary_dilation(hot, iterations=14)
    lab, n = ndimage.label(hot)
    if n:
        score = ndimage.sum(d, lab, range(1, n + 1)); keep = np.argsort(score)[::-1][:3] + 1   # two eyes + mouth
        hot = np.isin(lab, keep)
    m = Image.fromarray((hot * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(10))
    return m


def main():
    os.makedirs(DST, exist_ok=True)
    for n in FULL:
        if has(n): load(n).save(os.path.join(DST, n + '.webp'), quality=84, method=6); print('full', n)
    for base_name, fb in FACES.items():  # fb = (eyes, mouth)
        if not has(base_name): continue
        base = load(base_name).convert('RGBA')
        box = (min(fb[0][0], fb[1][0]) - 80, min(fb[0][1], fb[1][1]) - 80, max(fb[0][2], fb[1][2]) + 80, max(fb[0][3], fb[1][3]) + 80)
        for v in KINDS:
            n = f'{base_name}_{v}'
            if not has(n): continue
            fr = load(n).convert('RGBA')
            warped, best = NP.align(base, fr, box)
            eyes, mouth = FACES[base_name]
            m = soft_box(mouth if v.startswith('talk') else eyes)
            out = base.copy(); out.paste(warped.convert('RGB'), (0, 0), ImageChops.multiply(m, warped.getchannel('A')))
            out.convert('RGB').save(os.path.join(DST, n + '.webp'), quality=84, method=6)
            print('face', n, 'diff %.1f scale %.2f dx %d dy %d' % best, 'mask %.1f%%' % (100 * sum(m.histogram()[128:]) / (1920 * 1080)))


if __name__ == '__main__':
    import sys
    boxes() if sys.argv[1:] == ['boxes'] else main()
