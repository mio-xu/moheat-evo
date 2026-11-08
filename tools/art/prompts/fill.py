#!/usr/bin/env python3
"""Fill a prompt template from a character card (user 2026-11-08 提效标准「提示词模板库」+「角色资料卡」; guide §6 G3).

  python3 tools/art/prompts/fill.py <template> [<character id>] [field=value …] [--job <demo> <job>] [--ref r1,r2] [--mask "cx,cy,rx,ry;…"]
  python3 tools/art/prompts/fill.py --list                                   # templates + their fields

  <template>  base_pose | full_figure | lock_face_edit | masked_blink | masked_outpaint | empty_plate (tools/art/prompts/<name>.txt)
  <id>        docs/characters/<id>.md (its ```json block): fills {look} (the card's "## Look (prompt wording)" paragraph), {style}
              (series_style), {backdrop_colour} / {backdrop_name} (backdrop), {name_en}; anything else comes from field=value.
  --job       also writes the job {ref, prompt[, mask]} into <demo>/project/web_prompts.json (read, then tmp + os.replace), ready for
              python3 tools/openai/images.py <demo> <job>. Without --ref, base_pose / full_figure use the card's lock_face reference.
Missing fields stay as {field} and are listed — never send a prompt with an unfilled field.
"""
import glob, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
NAMES = {'#00b140': 'chroma green', '#ff00ff': 'magenta', '#c8c8c8': 'light grey', '#707070': 'mid grey'}


def card(cid):
    t = open(os.path.join(REPO, 'docs', 'characters', cid + '.md'), encoding='utf-8').read()
    c = json.loads(re.search(r'```json\s*(\{.*?\})\s*```', t, re.S).group(1))
    m = re.search(r'## Look \(prompt wording\)\s*\n+(.+?)(?:\n## |\Z)', t, re.S)
    c['_look'] = m.group(1).strip() if m else ''
    return c


def fields_of(text):
    return sorted(set(re.findall(r'\{(\w+)\}', text)))


def main(a):
    if not a or a[0] in ('-h', '--help'): print(__doc__); return 0
    if a[0] == '--list':
        for p in sorted(glob.glob(os.path.join(HERE, '*.txt'))):
            t = open(p).read(); print(f'{os.path.basename(p)[:-4]:16} {t.splitlines()[0].lstrip("# ")}\n{"":16} fields: {", ".join(fields_of(body(t)))}')
        return 0
    name, rest = a[0], a[1:]
    tpl = open(os.path.join(HERE, name + '.txt'), encoding='utf-8').read()
    job = ref = mask = None; vals = {}; cid = None
    i = 0
    while i < len(rest):
        x = rest[i]
        if x == '--job': job = (rest[i + 1], rest[i + 2]); i += 3; continue
        if x == '--ref': ref = rest[i + 1].split(','); i += 2; continue
        if x == '--mask': mask = rest[i + 1]; i += 2; continue
        if '=' in x: k, v = x.split('=', 1); vals[k] = v
        else: cid = x
        i += 1
    c = card(cid) if cid else {}
    if c:
        b = c.get('backdrop') or {}
        vals.setdefault('look', c['_look']); vals.setdefault('style', c.get('series_style', ''))
        vals.setdefault('name_en', c.get('name_en', cid))
        if b.get('colour'):
            vals.setdefault('backdrop_colour', b['colour']); vals.setdefault('backdrop_name', NAMES.get(b['colour'].lower(), 'plain'))
    text = body(tpl)
    for k, v in vals.items(): text = text.replace('{' + k + '}', v)
    left = fields_of(text)
    print(text)
    if left: print(f'\n!! unfilled: {", ".join(left)} — pass them as field=value', file=sys.stderr)
    if job:
        if left: print('!! not written to web_prompts.json while fields are unfilled', file=sys.stderr); return 1
        demo, jn = job; wp = os.path.join(REPO, demo, 'project', 'web_prompts.json') if not os.path.isabs(demo) else os.path.join(demo, 'project', 'web_prompts.json')
        P = json.load(open(wp, encoding='utf-8')) if os.path.exists(wp) else {}
        if ref is None and c and name in ('base_pose', 'full_figure'):
            lf = (c.get('refs') or {}).get('lock_face'); ref = [os.path.splitext(os.path.basename(lf))[0]] if lf else None
        P[jn] = {'ref': ref if ref and len(ref) > 1 else (ref[0] if ref else None), 'prompt': text, **({'mask': mask} if mask else {})}
        tmp = wp + '.tmp'; json.dump(P, open(tmp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1); os.replace(tmp, wp)
        print(f'\n→ {os.path.relpath(wp, REPO)} job "{jn}" (refs are file names in the demo\'s assets/art; copy the card\'s lock_face there)', file=sys.stderr)
    return 0


def body(t):
    return '\n'.join(l for l in t.splitlines() if not l.startswith('#')).strip()


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
