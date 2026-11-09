#!/usr/bin/env python3
"""The edit of the promo (v4, "one take"): one continuous stretch of the whole page (Demo42 round table, Kyoto), nothing laid over it
but the dialogue subtitles in the dark band under the stage, then one closing line. Reads <work>/v4/ (render.js state + frames), writes
<work>/frames.json (comp.js + comp.html) and <work>/audio_plan.json (mix.py).  Usage: python3 edit.py <work dir>"""
import json, os, re, sys
W = sys.argv[1]; FPS = 30; PREROLL = 1.2
strip = lambda s: re.sub(r'\s+', ' ', re.sub(r'\[[^\]]*\]', '', s or '')).strip()
clamp = lambda v, a=0., b=1.: max(a, min(b, v))
ST = {s['f']: s for s in map(json.loads, open(os.path.join(W, 'v4', 'state.jsonl')))}
fr = sorted(ST.values(), key=lambda q: q['t'])
subs = []; last = ''
for q in fr:                     # every new subtitle: (time, speaker, en)
    k = (q['who'] + q['en']) if q.get('sub') else ''
    if k and k != last: subs.append((q['t'], q['who'], q['en']))
    last = k
first = next(x for x in subs if x[2].startswith('Which do you recommend'))
A0 = round(first[0] - PREROLL, 3)   # his whisper is ending at your ear: the take fades in on it, the first question follows
LEVELS = json.load(open(os.path.join(W, 'user', 'levels.json')))
TEXT = [('u7', '焼き鳥のねぎまがおすすめです！', 'Try the negima yakitori!'), ('u8', 'こたつでみかんです', 'Under the kotatsu, with mandarins.'), ('u9', 'えっ…いや、何も知らないです…', 'Uh… no, I don’t know anything…')]
starts = [q['t'] for p, q in zip(fr, fr[1:]) if q.get('phase') == 'listen' and p.get('phase') != 'listen' and q['t'] > A0][:3]
you = [dict(u=u, a=round(a, 3), s=round(a + .35, 3), e=round(a + .35 + LEVELS[u]['dur'] + .5, 3), ja=ja, en=en) for a, (u, ja, en) in zip(starts, TEXT)]
after = [x for x in subs if x[0] > you[-1]['e'] - .3 and x[1] != 'あなた']       # his answer to your last line, then whatever follows it
B0 = round(you[-1]['e'] + .15, 3); TAKE = round(B0 - A0, 3); END = 3.2; DUR = round(TAKE + END, 3)   # cut on your stammer (~60 s; his answer would add 5 s)
frames = []
for fi in range(int(round(DUR * FPS))):
    t = fi / FPS; D = {'t': round(t, 3)}
    if t < TAKE:
        src = A0 + t; f = int(round(src * FPS)); st = ST.get(f) or {}
        path = next(p for p in (os.path.join(W, 'v4', 'frames', f'{g:05d}.jpg') for g in [f, f - 1, f + 1, f - 2]) if os.path.exists(p))
        D['foot'] = {'src': 'file://' + path, 'crop': [0, 0, 1920]}
        Y = next((y for y in you if y['s'] - .05 <= src < y['e']), None)
        if Y: D['band'] = {'name': 'あなた', 'ja': Y['ja'], 'en': Y['en']}
        elif st.get('sub') and st.get('who') in ('信長', '家康'): D['band'] = {'name': st['who'], 'ja': strip(st['ja']), 'en': strip(st['en'])}
        fo = max(1 - t / .9, (t - (TAKE - .5)) / .5)
        if fo > 0: D['fade'] = round(clamp(fo), 3)
    else:
        D['endline'] = {'ja': '信長と、語らう', 'a': round(clamp((t - TAKE) / .6) * (1 - clamp((t - (DUR - .5)) / .5)), 3)}
    frames.append(D)
json.dump(frames, open(os.path.join(W, 'frames.json'), 'w'))
json.dump({'dur': DUR, 'take': TAKE, 'segs': [{'cap': 'v4', 'a': A0, 'b': B0, 't0': 0, 't1': TAKE, 'part': 'take', 'you': you}]}, open(os.path.join(W, 'audio_plan.json'), 'w'), ensure_ascii=False, indent=1)
print('frames', len(frames), 'take', TAKE, 'dur', DUR); [print(y) for y in you]
