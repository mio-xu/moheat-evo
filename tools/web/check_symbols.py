#!/usr/bin/env python3
"""No emoji / pictographs in the cover chips and the kiosk's texts (user 2026-11-09; the demo menu: tools/web/check_menu_text.js).

    python3 tools/web/check_symbols.py [demo folder …] [--kiosk] [--fix]     no arguments = every demo + the kiosk + the new-demo template

Exit 1 when one is found. Chips: cover.json / tools/web/cover_template.json, every language (warm / cool stay distinguishable by the chip's
coloured border). Kiosk: visitor-facing text in kiosk/pitches.js, app.js, queue.js and the kiosk code in demos/shared/kiosk.js.
Stays on purpose (user): the ★ rating buttons and report columns, keyboard hints (⌘ ⌃), arrows and playback keys, the intro's pictogram art.
--fix removes them from the chips and kiosk texts (then: python3 tools/web/covers.py --publish).
"""
import glob, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
# Extended_Pictographic + dingbats, without © ® ™, arrows, ★ ☆, keyboard symbols
SYM = re.compile('[☀-☄☆-⭏\U0001F000-\U0001FAFF️⃣]'.replace('☆-⭏', '☇-➿⬀-⭏'))
CLEAN = lambda t: re.sub(r'[ 　]{2,}', ' ', SYM.sub('', t).replace('‍', '')).strip()
KIOSK = ['kiosk/pitches.js', 'kiosk/app.js', 'kiosk/queue.js', 'demos/shared/kiosk.js']


def strip_comments(t):
    return re.sub(r'(^|\s)//[^\n]*', r'\1', re.sub(r'/\*.*?\*/', '', t, flags=re.S))


def chips(path, fix=False):
    d = json.load(open(path, encoding='utf-8')); bad = []
    for c in d.get('chips') or []:
        for l, v in (c.get('text') or {}).items():
            if isinstance(v, str) and SYM.search(v):
                bad.append(f'{os.path.relpath(path, ROOT)} chip {l}: {v}')
                if fix: c['text'][l] = CLEAN(v)
    if fix and bad:
        tmp = path + '.tmp'; json.dump(d, open(tmp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1); open(tmp, 'a').write('\n'); os.replace(tmp, path)
    return bad


def kiosk(fix=False):
    bad = []
    for rel in KIOSK:
        p = os.path.join(ROOT, rel); t = open(p, encoding='utf-8').read()
        for n, line in enumerate(strip_comments(t).split('\n'), 1):
            m = SYM.findall(line)
            if m: bad.append(f'{rel}:{n}: {"".join(sorted(set(m)))}')
        if fix and SYM.search(strip_comments(t)):
            s = re.sub(r"(?<=['`\" ])[" + SYM.pattern[1:-1] + r"]+ ?", '', t)                     # a symbol at the start of a string / word, with its space
            s = re.sub(r" ?[" + SYM.pattern[1:-1] + r"]+", '', s)                                  # at the end of a sentence
            tmp = p + '.tmp'; open(tmp, 'w', encoding='utf-8').write(s); os.replace(tmp, p)
    return bad


def main(a):
    fix = '--fix' in a; only_k = '--kiosk' in a; ds = [x for x in a if not x.startswith('--')]; bad = []
    if not only_k:
        fs = [os.path.join(d, 'cover.json') for d in ds] or sorted(glob.glob(os.path.join(ROOT, 'demos', '*', 'Demo*', 'cover.json'))) + [os.path.join(ROOT, 'tools', 'web', 'cover_template.json')]
        for f in fs:
            if os.path.exists(f): bad += chips(f, fix)
    if only_k or not ds: bad += kiosk(fix)
    for b in bad: print(b)
    print(f'{len(bad)} symbol line(s)' + (' fixed' if fix else ''))
    sys.exit(1 if bad and not fix else 0)


if __name__ == '__main__':
    main(sys.argv[1:])
