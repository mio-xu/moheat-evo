"""Scene previews (interior + window scenery) and the style sheet → assets/style_sheet.png, storyboard/frames/*.jpg

  python3 scripts/make_style_sheet.py
The player composites the same way: scenery behind, interior (transparent glass) in front, glass overlays on top.
"""
import os, sys
from PIL import Image, ImageDraw, ImageFont
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import seasons as S

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = lambda p: os.path.join(ROOT, "assets", p)
FONT = "/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc"

SCENES = {   # name: (left layers, right layers, interior, glass overlays left/right)
    "winter": (["winter/winter_far", "winter/winter_mid", "winter/winter_near"],) * 2 + ("day", ["winter/frost_corner"], ["winter/frost_corner"]),
    "summer": (["winter/winter_far", "winter/winter_mid", "winter/winter_near"], ["summer/summer_far", "summer/summer_mid", "summer/summer_near"], "day",
               ["winter/frost_overlay"], ["summer/heat_haze_overlay"]),
    "storm": (["rainforest/rainforest_storm_far", "rainforest/rainforest_mid", "rainforest/rainforest_near"],
              ["rainforest/rainforest_far", "rainforest/rainforest_mid", "rainforest/rainforest_near"], "dusk", ["rainforest/raindrops_overlay"], ["summer/heat_haze_overlay"]),
    "tunnel": (["ice_fire/tunnel_ice_wall"], ["ice_fire/tunnel_lava_wall"], "night", [], []),
    "chaos": (["ice_fire/tunnel_lava_wall"], ["winter/winter_far", "winter/winter_mid"], "night", ["seasonal_chaos/fog_overlay"], ["winter/frost_overlay"]),
    "spring": (["spring/spring_far", "spring/spring_mid", "spring/spring_near"], ["spring/spring_station"], "day", [], []),
}


def layers(names, size=(1536, 1024)):
    c = Image.new("RGBA", size, (0, 0, 0, 255))
    for n in names: c.alpha_composite(Image.open(A(n + ".png")).convert("RGBA").resize(size))
    return c


def scene(name):
    left, right, light, gl, gr = SCENES[name]
    bg = Image.new("RGBA", (1536, 1024))
    lft, rgt = layers(left), layers(right)
    # put the layers' horizon (y≈590) at eye level (y≈418), as the player does
    bg.paste(lft.crop((0, 172, 768, 1024)), (0, 0)); bg.paste(rgt.crop((768, 172, 1536, 1024)), (768, 0))
    for g, x0 in ((gl, 0), (gr, 768)):                     # glass overlays are drawn on the glass itself (not raised)
        for n in g:
            ov = Image.open(A(n + ".png")).convert("RGBA").crop((x0, 0, x0 + 768, 1024)); bg.alpha_composite(ov, (x0, 0))
    door = Image.new("RGBA", (1536, 1024), (255, 214, 150, 255))                       # warm light from the next car
    bg.paste(door.crop((700, 300, 836, 420)), (700, 300))
    bg.alpha_composite(Image.open(A(f"train_interior/train_interior_{light}.png")).convert("RGBA"))
    return bg.convert("RGB")


def main():
    os.makedirs(os.path.join(ROOT, "storyboard", "frames"), exist_ok=True)
    frames = {}
    for n in SCENES:
        frames[n] = scene(n); frames[n].save(os.path.join(ROOT, "storyboard", "frames", f"{n}.jpg"), quality=88)
    W, H = 1536, 1024
    sheet = Image.new("RGB", (W, H), (255, 246, 236))
    d = ImageDraw.Draw(sheet)
    d.text((W // 2, 52), "季節が、暴走する。  The Runaway Seasons Express", fill=(111, 74, 90), font=ImageFont.truetype(FONT, 46), anchor="mm")
    d.text((W // 2, 100), "MoHeat Evo thermal ASMR · Demo 5 · style sheet", fill=(160, 120, 135), font=ImageFont.truetype(FONT, 22), anchor="mm")
    tw, th, gap, x0, y0 = 464, 309, 36, 36, 140
    small = ImageFont.truetype(FONT, 22)
    for i, (t0, t1, sid, ja, en, *_r) in enumerate(S.SEGMENTS):
        x, y = x0 + (i % 3) * (tw + gap), y0 + (i // 3) * (th + 80)
        d.rounded_rectangle((x - 6, y - 6, x + tw + 6, y + th + 6), 18, fill=(255, 255, 255), outline=(230, 190, 200), width=3)
        sheet.paste(frames[sid].resize((tw, th)), (x, y))
        d.text((x + tw // 2, y + th + 22), f"{t0}–{t1} s  {ja}", fill=(111, 74, 90), font=small, anchor="mm")
        d.text((x + tw // 2, y + th + 48), en, fill=(160, 120, 135), font=ImageFont.truetype(FONT, 18), anchor="mm")
    sw = [(169, 200, 240), (251, 236, 210), (243, 169, 185), (159, 211, 199), (200, 139, 93), (95, 180, 242), (255, 154, 74), (255, 198, 214), (63, 111, 196), (109, 58, 82)]
    for i, c in enumerate(sw):
        d.rounded_rectangle((W // 2 - len(sw) * 36 + i * 72, 940, W // 2 - len(sw) * 36 + i * 72 + 60, 995), 14, fill=c, outline=(111, 74, 90), width=2)
    sheet.save(A("style_sheet.png"))
    print("style sheet + 6 scene frames written")


if __name__ == "__main__":
    main()
