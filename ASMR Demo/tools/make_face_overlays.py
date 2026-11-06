"""Blink / closed-mouth patches for the two portrait sprites (Live2D-style overlays on the original art).
  python3 tools/make_face_overlays.py  → media/sprites/{K,H}_eyes.png, {K,H}_mouth.png, faces.json
Coordinates are in the portrait sprite's pixels (see make_sprites.py)."""
import json, os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SP = os.path.join(ROOT, "media", "sprites")
FACES = {
    #      eyes: (cx, cy, w, h, tilt)                                  mouth: (cx, cy, w, h)   skin sample box         line colour
    "K": dict(eyes=[(545, 568, 186, 150, 4), (808, 505, 140, 135, -2)], mouth=(716, 658, 92, 66), skin=(640, 600, 690, 630), line=(43, 45, 94)),
    "H": dict(eyes=[(542, 698, 186, 150, 4), (792, 622, 120, 140, -2)], mouth=(720, 778, 92, 70), skin=(620, 730, 680, 760), line=(92, 36, 16)),
}
SS = 4   # supersampling


def patch(img, boxes, draw_fn, skin):
    x0 = int(min(b[0] - b[2] / 2 for b in boxes)) - 24; y0 = int(min(b[1] - b[3] / 2 for b in boxes)) - 24
    x1 = int(max(b[0] + b[2] / 2 for b in boxes)) + 24; y1 = int(max(b[1] + b[3] / 2 for b in boxes)) + 24
    W, H = (x1 - x0) * SS, (y1 - y0) * SS
    fill = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(fill)
    mask = Image.new("L", (W, H), 0); dm = ImageDraw.Draw(mask)
    for (cx, cy, w, h, *_) in boxes:
        e = [((cx - x0 - w / 2) * SS, (cy - y0 - h / 2) * SS), ((cx - x0 + w / 2) * SS, (cy - y0 + h / 2) * SS)]
        dm.ellipse(e, fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(5 * SS))
    base = Image.new("RGBA", (W, H), skin + (255,)); base.putalpha(mask)
    draw_fn(ImageDraw.Draw(base), x0, y0)
    return base.resize((x1 - x0, y1 - y0), Image.LANCZOS), (x0, y0)


def main():
    meta = {}
    for who, f in FACES.items():
        img = Image.open(os.path.join(SP, f"{who}_portrait.png")).convert("RGB")
        skin = tuple(int(v) for v in np.median(np.asarray(img.crop(f["skin"])).reshape(-1, 3), axis=0))
        line = f["line"]

        def eyes_closed(d, x0, y0):
            for (cx, cy, w, h, tilt) in f["eyes"]:
                X = lambda x: (x - x0) * SS; Y = lambda y: (y - y0) * SS
                pts = []
                for i in range(41):                    # gentle downward curve, thick in the middle, tapered ends
                    u = i / 40 - .5; pts.append((cx + u * w * .9, cy + h * .08 + (1 - (2 * u) ** 2) * h * .16 + u * tilt * 4))
                for i in range(40):
                    a, b = pts[i], pts[i + 1]; th = (9 - 7 * abs(i / 40 - .5) * 2) * SS
                    d.line([(X(a[0]), Y(a[1])), (X(b[0]), Y(b[1]))], fill=line + (255,), width=int(th))
                outer = pts[-1] if cx > 600 else pts[0]; s = 1 if cx > 600 else -1
                d.line([(X(outer[0]), Y(outer[1])), (X(outer[0] + s * 16), Y(outer[1] - 12))], fill=line + (255,), width=5 * SS)

        def mouth_closed(d, x0, y0):
            cx, cy, w, h = f["mouth"]
            X = lambda x: (x - x0) * SS; Y = lambda y: (y - y0) * SS
            pts = [(cx + u * w * .42, cy - h * .05 + (1 - (2 * u) ** 2) * h * .14) for u in np.linspace(-.5, .5, 21)]
            d.line([(X(x), Y(y)) for x, y in pts], fill=(150, 70, 70, 255), width=6 * SS, joint="curve")

        e_img, e_off = patch(img, f["eyes"], eyes_closed, skin)
        cx, cy, w, h = f["mouth"]
        m_img, m_off = patch(img, [(cx, cy, w, h)], mouth_closed, skin)
        e_img.save(os.path.join(SP, f"{who}_eyes.png")); m_img.save(os.path.join(SP, f"{who}_mouth.png"))
        meta[who] = dict(eyes=e_off, mouth=m_off, size=img.size, skin=skin)
        print(who, "skin", skin, "eyes@", e_off, "mouth@", m_off)
    json.dump(meta, open(os.path.join(SP, "faces.json"), "w"))


if __name__ == "__main__":
    main()
