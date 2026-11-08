#!/usr/bin/env python3
"""Per-category style cards + drift check + family portrait (user 2026-11-08: 每个类别的整体设计风格保持一致; DEMO_DESIGN_GUIDE §5.1 / §6.5).

  python3 tools/art/style_card.py build                 # write demos/<cat>/_kit/style.json + style.js + STYLE.md (anchor stats measured)
  python3 tools/art/style_card.py check <demo>          # cover + main view vs the series anchor → WARN lines (exit 1 on drift)
  python3 tools/art/style_card.py check --all           # every demo, one line each
  python3 tools/art/style_card.py sheet [<category>]    # family portrait: demos/<cat>/_kit/style_family.jpg (every cover + main view)

A style card holds the art LOOK anchor (reference demos / images per series), theme colours, fonts, music / SFX tone and the thermal
colour code (cold = blue-white, hot = orange-red). Pages / covers read it from their own kit (`_kit/style.js` → window.MOHEAT_STYLE;
JSON for tools). Crossover demos keep their category's style (series: the one the card lists them under).
Drift statistics (on a 480-px-wide copy): mean saturation, mean lightness, contrast (lightness std), line density (share of strong
edges = line weight / detail), hue histogram (12 bins, saturated pixels). A demo is compared with the median of its series' anchor
images on the STYLE statistics only (saturation, contrast, line density — lightness / hue vary with the scene and the character's
theme colour, so they are only recorded); a statistic outside the tolerance → WARN (look at the family portrait, then fix the art / the prompt LOOK, not the numbers).
"""
import glob, json, os, re, sys
import numpy as np
from PIL import Image

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
THERMAL = {'cold': 'blue-white #9fd8ff → #ffffff', 'hot': 'orange-red #ff8a3d → #ff3b1f', 'rule': 'same in every demo and effect (§0.1)'}
TOL = {'sat': 0.2, 'contrast': 0.12, 'lines': 1.0}   # lines: |log2 ratio| (1.0 = twice / half the line density)
# light / hue are measured but not judged: day vs night scenes and each character's theme colour differ by design.

CARDS = {
 'all-ages': {'series': [
   {'id': 'fairy', 'demos': ['Demo01_SnowFoxfire', 'Demo02_FanMeeting', 'Demo03_ShiningSmileConcert', 'Demo04_SeasonsExpress', 'Demo10_CaveSpring', 'Demo28_SnowFoxLullaby', 'Demo47_GhostLantern', 'Demo48_AnimalOnsen'],
    'anchor': ['Demo01_SnowFoxfire', 'Demo03_ShiningSmileConcert', 'Demo10_CaveSpring'],
    'look': 'cute Japanese 2D, pastel cel shading, chibi idols / fairies, 2–3 heads tall, big eyes; NOT ukiyo-e / gold leaf',
    'colours': ['bright saturated pink #ff7eb6', 'sky blue #6ec6ff', 'orange #ffa94d', 'dreamy night navy #1d2350'],
    'sound': 'music-box / bells, soft synth pads, playful foley'}]},
 'healing': {'series': [
   {'id': 'cat', 'demos': ['Demo11_Naomi', 'Demo13_NaomiCam', 'Demo26_BecomeNaomi', 'Demo49_NaomiSummer'], 'anchor': ['Demo11_Naomi'],
    'look': 'high-finish mobile-game / visual-novel illustration, healing mood; a realistic cat (four legs, not anthropomorphic)',
    'colours': ['afternoon warm light #ffd9a0', 'glowing pastels #f7c6d9', 'soft cream #fff4e0'],
    'sound': 'purring, breathing, small movement foley (Naomi rarely meows), soft piano'},
   {'id': 'family', 'demos': ['Demo15_FamilyCall', 'Demo16_FamilyCall2', 'Demo29_FamilyVisit', 'Demo50_WatermelonSummer'], 'anchor': ['Demo15_FamilyCall'],
    'look': 'soft cel, hand-drawn feel, flat colour + one soft-edged shadow, warm brown lines; 5 heads tall, round and cute (not chibi)',
    'colours': ['warm orange interior #f2a65a', 'snow-blue window #a9c8e8', 'wood brown #8a5a3c'],
    'sound': 'kettle, kotatsu, snow outside, gentle acoustic guitar'}]},
 'for-men': {'series': [
   {'id': 'streamer', 'demos': ['Demo14_MintStream', 'Demo17_CocoaStream', 'Demo18_HinataStream', 'Demo19_LunaStream', 'Demo43_BlizzardInn', 'Demo44_MagicAcademy'],
    'anchor': ['Demo14_MintStream', 'Demo17_CocoaStream', 'Demo19_LunaStream'],
    'look': 'soft cel, hand-drawn, flat colour + one soft-edged shadow, dark-lavender lines; NO gloss, NO bloom; 7-heads adult women',
    'colours': ['Mint mint-green #9fe3cf', 'Cocoa milk-tea pink #e8b4a8', 'Hinata warm orange #ffa24c', 'Luna deep blue-black #1b1f3b', 'night room #14162a'],
    'sound': 'lo-fi / city-pop beds, close ASMR foley, room tone'},
   {'id': 'date', 'demos': ['Demo25_HatsumodeDate', 'Demo31_SummerRooftop'], 'anchor': ['Demo25_HatsumodeDate', 'Demo31_SummerRooftop'],
    'look': 'Demo12 style_3 soft cel: thin dark-lavender lineart, flat pastel + one soft-edged shadow, not glossy, no bloom; ~7 heads adult',
    'colours': ['soda blue #5ab4e6', 'sparkler orange #ff9a3c', 'winter shrine red #c8323c', 'night navy #18203a'],
    'sound': 'festival / seasonal ambience (geta, wind chime, fireworks with delay), light acoustic'}]},
 'for-women': {'series': [
   {'id': 'idol', 'demos': ['Demo12_LateCall', 'Demo20_HinataHandshake', 'Demo21_JinLounge', 'Demo22_ShionRain', 'Demo24_GakuCamp', 'Demo30_SakuFestival', 'Demo45_CelestialPalace', 'Demo46_DragonContract'],
    'anchor': ['Demo12_LateCall', 'Demo22_ShionRain', 'Demo24_GakuCamp'],
    'look': 'style_3 soft cel: thin coloured lines, soft cel shadows, otome-game card finish; 7–7.5-heads handsome men, clear jawline (idol faces, no stubble)',
    'colours': ['Ren snowy blue-violet #6f6fc8', 'Hinata pink / cream #ffc2d4', 'Jin wine red + black #7a1630', 'Shion lavender + amber #b49ad8', 'Gaku campfire amber + pine #e0902f', 'night bokeh #121426'],
    'sound': 'night ambience (rain, snow, campfire, city), close whisper ASMR, soft piano / R&B pads'}]},
 'nobunaga-suntory': {'series': [
   {'id': 'sengoku', 'demos': ['Demo05_GifuCastle', 'Demo06_FutureWhisky', 'Demo07_KyotoIzakaya', 'Demo08_YamazakiDistillery', 'Demo09_SengokuBanquet',
                               'Demo23_NobunagaTalk', 'Demo41_IeyasuTalk', 'Demo42_SengokuRoundtable'],
    'anchor': ['Demo07_KyotoIzakaya', 'Demo09_SengokuBanquet'],
    'look': 'ukiyo-e-style anime illustration with gold-leaf ornament, fine lines, cinematic light; seated cast sprites from _kit/art',
    'colours': ['vermilion #c8372d', 'indigo #263a6b', 'deep green #2f5d46', 'gold #c9a43a'],
    'sound': 'shakuhachi / koto / taiko, wooden-hall reverb, fire and wind'}]},
}


def fonts(cat):
    c = {}
    for p in glob.glob(os.path.join(REPO, 'demos', cat, 'Demo*', 'index.html')):
        for f in re.findall(r'family=([A-Za-z+]+)', open(p, encoding='utf-8', errors='ignore').read()): c[f.replace('+', ' ')] = c.get(f.replace('+', ' '), 0) + 1
    return [f for f, _ in sorted(c.items(), key=lambda x: -x[1])]


def views(demo_dir):
    """the images that show the demo's look: the cover + the main view (first layered still, else the biggest media/art image)."""
    out = []
    cv = os.path.join(demo_dir, 'media', 'cover.jpg')
    if os.path.exists(cv): out.append(cv)
    lj = os.path.join(demo_dir, 'media', 'layers.js')
    if os.path.exists(lj):
        try:
            t = open(lj, encoding='utf-8').read(); d = json.loads(t[t.index('{'):t.rindex('}') + 1])
            for stem in d.get('views', {}):
                p = os.path.join(demo_dir, 'media', 'art', stem + '.jpg')
                if os.path.exists(p): out.append(p); break
        except ValueError: pass
    if len(out) < 2:
        arts = [p for p in glob.glob(os.path.join(demo_dir, 'media', 'art', '*')) if p.lower().endswith(('.jpg', '.webp', '.png'))
                and not re.search(r'mouth|eyes|blink|char_|prop_|fx_|_bust|_ear', os.path.basename(p))]
        def opaque(p):
            with Image.open(p) as im: return 'A' not in im.getbands() or np.asarray(im.getchannel('A')).min() > 200
        arts = [p for p in arts if opaque(p)]   # sprites / overlays are not a view
        if arts: out.append(max(arts, key=os.path.getsize))
    return out


def stats(p):
    im = Image.open(p).convert('RGB'); im = im.resize((480, max(1, round(480 * im.height / im.width))))
    a = np.asarray(im, np.float32) / 255
    mx, mn = a.max(-1), a.min(-1); l = (mx + mn) / 2; s = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    gy, gx = np.abs(np.diff(l, axis=0))[:, :-1], np.abs(np.diff(l, axis=1))[:-1, :]
    lines = float(((gx + gy) > 0.12).mean())
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    h = (np.degrees(np.arctan2(np.sqrt(3) * (g - b), 2 * r - g - b)) % 360)
    hist = np.histogram(h[s > 0.25], bins=12, range=(0, 360))[0].astype(float); hist = hist / max(1, hist.sum())
    return {'sat': float(s.mean()), 'light': float(l.mean()), 'contrast': float(l.std()), 'lines': lines, 'hue': [round(x, 4) for x in hist]}


def combine(sts):
    if not sts: return None
    out = {k: float(np.median([x[k] for x in sts])) for k in ('sat', 'light', 'contrast', 'lines')}
    out['hue'] = [round(float(x), 4) for x in np.mean([x['hue'] for x in sts], 0)]
    return {k: (round(v, 4) if isinstance(v, float) else v) for k, v in out.items()}


def drift(st, an):
    bad = []
    for k in ('sat', 'contrast'):
        if abs(st[k] - an[k]) > TOL[k]: bad.append(f'{k} {st[k]:.2f} vs {an[k]:.2f}')
    if an['lines'] > 0 and abs(np.log2(max(st['lines'], 1e-4) / an['lines'])) > TOL['lines']:
        bad.append(f'line density {st["lines"]:.3f} vs {an["lines"]:.3f} (line weight / detail level)')
    return bad


def card_of(cat):
    p = os.path.join(REPO, 'demos', cat, '_kit', 'style.json')
    return json.load(open(p, encoding='utf-8')) if os.path.exists(p) else None


def build():
    for cat, c in CARDS.items():
        kit = os.path.join(REPO, 'demos', cat, '_kit'); os.makedirs(kit, exist_ok=True)
        card = {'_doc': 'Category style card (tools/art/style_card.py build; DEMO_DESIGN_GUIDE §5.1 / §6.5). Edit CARDS in the tool, then rebuild.',
                'category': cat, 'fonts': fonts(cat), 'thermal_colours': THERMAL, 'crossover': 'a crossover keeps this category\'s art style; only outfit / world change', 'series': []}
        for s in c['series']:
            imgs = [v for d in s['anchor'] for v in views(os.path.join(REPO, 'demos', cat, d))]
            card['series'].append({**s, 'anchor_images': [os.path.relpath(p, REPO) for p in imgs], 'anchor_stats': combine([stats(p) for p in imgs])})
        for name, text in (('style.json', json.dumps(card, ensure_ascii=False, indent=1)),
                           ('style.js', '// Category style card for pages / covers (generated by tools/art/style_card.py build — do not edit).\nwindow.MOHEAT_STYLE = '
                            + json.dumps({k: card[k] for k in ('category', 'fonts', 'thermal_colours')} | {'series': [{k: s[k] for k in ('id', 'demos', 'look', 'colours', 'sound')} for s in card['series']]}, ensure_ascii=False) + ';\n'),
                           ('STYLE.md', md(card))):
            p = os.path.join(kit, name); open(p + '.tmp', 'w', encoding='utf-8').write(text); os.replace(p + '.tmp', p)
        print(f'{cat}: {len(card["series"])} series, fonts {", ".join(card["fonts"][:4])}')


def md(card):
    L = [f'# Style card · {card["category"]}', '', 'Generated by `python3 tools/art/style_card.py build` (data in the tool\'s CARDS). Family portrait: `style_family.jpg` (`… sheet`).',
         f'Fonts: {", ".join(card["fonts"])} · Thermal colours: cold = {card["thermal_colours"]["cold"]}, hot = {card["thermal_colours"]["hot"]} · {card["crossover"]}.', '']
    for s in card['series']:
        L += [f'## {s["id"]}', '', f'- **Look (prompt anchor)**: {s["look"]}', f'- **Colours**: {", ".join(s["colours"])}', f'- **Music / SFX**: {s["sound"]}',
              f'- **Demos**: {", ".join(s["demos"])}', f'- **Anchor images**: ' + ', '.join(f'`{p}`' for p in s['anchor_images']), '']
    return '\n'.join(L)


def series_of(demo_dir):
    cat, name = demo_dir.split(os.sep)[-2], os.path.basename(demo_dir)
    card = card_of(cat)
    if not card: return None, None
    for s in card['series']:
        if name in s['demos']: return card, s
    return card, None


def check(demo_dir):
    demo_dir = os.path.abspath(demo_dir).rstrip('/')
    card, s = series_of(demo_dir)
    if not card: return None, [f'no demos/<category>/_kit/style.json (python3 tools/art/style_card.py build)']
    if not s: return None, [f'{os.path.basename(demo_dir)} is in no series of the {card["category"]} style card — add it to CARDS in tools/art/style_card.py']
    if not s.get('anchor_stats'): return s, ['series has no anchor images']
    out = []
    for p in views(demo_dir):
        b = drift(stats(p), s['anchor_stats'])
        if b: out.append(f'{os.path.relpath(p, demo_dir)} drifts from the {s["id"]} anchor: ' + '; '.join(b))
    return s, out


def sheet(cats):
    from PIL import ImageDraw
    for cat in cats:
        rows = [(os.path.basename(d), views(d)) for d in sorted(glob.glob(os.path.join(REPO, 'demos', cat, 'Demo*'))) if os.path.isdir(d)]
        rows = [r for r in rows if r[1]]
        W, TH = 320, 180; im = Image.new('RGB', (W * 2 + 230, (TH + 8) * len(rows) + 8), (24, 24, 30)); dr = ImageDraw.Draw(im)
        for i, (n, vs) in enumerate(rows):
            y = 8 + i * (TH + 8); dr.text((8, y + TH // 2 - 6), n, fill=(230, 230, 230))
            for j, p in enumerate(vs[:2]):
                t = Image.open(p).convert('RGB'); t.thumbnail((W, TH)); im.paste(t, (222 + j * (W + 4), y))
        out = os.path.join(REPO, 'demos', cat, '_kit', 'style_family.jpg'); im.save(out, quality=82); print('wrote', os.path.relpath(out, REPO))


if __name__ == '__main__':
    a = sys.argv[1:]
    if not a or a[0] in ('-h', '--help'): print(__doc__); sys.exit(0)
    if a[0] == 'build': build()
    elif a[0] == 'sheet': sheet(a[1:] or list(CARDS))
    elif a[0] == 'check':
        ds = sorted(glob.glob(os.path.join(REPO, 'demos', '*', 'Demo*'))) if '--all' in a else a[1:]
        n = 0
        for d in ds:
            s, w = check(d); n += len(w)
            print(f'{os.path.relpath(os.path.abspath(d), REPO)} [{s["id"] if s else "-"}]: ' + ('ok' if not w else ' | '.join(w)))
        sys.exit(1 if n else 0)
