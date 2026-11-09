#!/usr/bin/env python3
"""The edit of the promo (v5): one continuous stretch of the whole page (Demo42 round table, Kyoto; only the dialogue subtitles in the
dark band under the stage), a hard cut into ~15 s of ~1 s shots of what else is in the demos (one plain label per group), one closing line. Reads <work>/v4/ (render.js state + frames), writes
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
first = next(x for x in subs if x[2].startswith('Look, snow'))
A0 = round(first[0] - PREROLL, 3)   # his whisper is ending at your ear: the take fades in on it, the first question follows
LEVELS = json.load(open(os.path.join(W, 'user', 'levels.json')))
TEXT = [('u8', 'こたつでみかんです', 'Under the kotatsu, with mandarins.'), ('u9', 'えっ…いや、何も知らないです…', 'Uh… no, I don’t know anything…')]
starts = [q['t'] for p, q in zip(fr, fr[1:]) if q.get('phase') == 'listen' and p.get('phase') != 'listen' and q['t'] > A0][:2]
you = [dict(u=u, a=round(a, 3), s=round(a + .35, 3), e=round(a + .35 + LEVELS[u]['dur'] + .5, 3), ja=ja, en=en) for a, (u, ja, en) in zip(starts, TEXT)]
after = [x for x in subs if x[0] > you[-1]['e'] - .3 and x[1] != 'あなた']       # his answer to your last line, then whatever follows it
B0 = round(you[-1]['e'] + .15, 3); TAKE = round(B0 - A0, 3); END = 3.2   # cut on your stammer (~60 s; his answer would add 5 s)
# the quick section: (label ja, en, shots); a shot = (capture, second, length) or ('film', file index, second, length)
QUICK = [('場所を選ぶ', 'Choose the place', [('s_gifu', 31.4, .95), ('s_tea', 56.7, .9), ('s_yama', 53.1, .9), ('k_rt', 50.2, .95), ('s_az', 1.6, .9)]),
         ('一対一', 'One on one', [('n_tea', 46.7, 1.3), ('s_tea', 99.0, 1.3)]),
         ('座談会', 'Round table', [('k_rt', 45.4, 1.2), ('s_az', 11.8, 1.3)]),
         ('物語', 'Story', [('film', 'f1', 56.6, 1.0), ('film', 'f2', 56.6, 1.0), ('film', 'f3', 41.0, 1.0), ('film', 'f4', 104.6, 1.0), ('film', 'f5', 120.6, 1.0)])]
FILM = {'f1': 'Demo05_GifuCastle/video/final/final_gifu_150s.mp4', 'f2': 'Demo07_KyotoIzakaya/video/final/final_izakaya_150s.mp4', 'f3': 'Demo08_YamazakiDistillery/video/final/final_yamazaki_150s.mp4',
        'f4': 'Demo09_SengokuBanquet/video/final/final_banquet_150s.mp4', 'f5': 'Demo05_GifuCastle/video/final/final_gifu_150s.mp4'}
HERE = os.path.dirname(os.path.abspath(__file__))
shots, T = [], TAKE
for ja, en, group in QUICK:
    for j, sh in enumerate(group):
        d = sh[-1]; shots.append(dict(t0=round(T, 3), t1=round(T + d, 3), ja=ja, en=en, first=j == 0, **({'film': sh[1], 'ss': sh[2], 'path': os.path.abspath(os.path.join(HERE, '..', '..', '..', FILM[sh[1]]))} if sh[0] == 'film' else {'cap': sh[0], 'a': sh[1], 'b': sh[1] + d}))); T += d
CLOSE = round(T, 3); DUR = round(CLOSE + END, 3)
LAY = {}
def stage(c):
    if c not in LAY:
        L = json.load(open(os.path.join(W, c, 'layout.json')))['stage']; LAY[c] = [L['x'] * 2, L['y'] * 2, L['w'] * 2]
    return LAY[c]
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
        if t < .9: D['fade'] = round(1 - t / .9, 3)
    elif t < CLOSE:
        Q = next(q for q in shots if q['t0'] - 1e-6 <= t < q['t1'] + 1e-6); lt = t - Q['t0']
        if 'film' in Q:
            n = int(lt * FPS) + 1; D['foot'] = {'src': 'file://' + os.path.join(W, 'real', Q['film'], f'{n:05d}.jpg'), 'crop': [0, 0, 1920]}
        else:
            f = int(round((Q['a'] + lt) * FPS)); path = next(p for p in (os.path.join(W, Q['cap'], 'frames', f'{g:05d}.jpg') for g in [f, f - 1, f + 1, f - 2, f + 2]) if os.path.exists(p))
            D['foot'] = {'src': 'file://' + path, 'crop': stage(Q['cap'])}
        D['line'] = {'ja': Q['ja'], 'en': Q['en'], 'x': 64, 'b': 130, 'js': 34, 'es': 22, 'a': 1}
    else:
        D['endline'] = {'ja': '信長と、語らう', 'a': round(clamp((t - CLOSE) / .6) * (1 - clamp((t - (DUR - .5)) / .5)), 3)}
    frames.append(D)
json.dump(frames, open(os.path.join(W, 'frames.json'), 'w'))
KEYS = lambda q: {k: q[k] for k in ('cap', 'a', 'b', 't0', 't1', 'film', 'ss', 'path', 'first') if k in q}
json.dump({'dur': DUR, 'take': TAKE, 'close': CLOSE, 'segs': [{'cap': 'v4', 'a': A0, 'b': B0, 't0': 0, 't1': TAKE, 'part': 'take', 'you': you}] + [{**KEYS(q), 'part': 'quick'} for q in shots]}, open(os.path.join(W, 'audio_plan.json'), 'w'), ensure_ascii=False, indent=1)
json.dump([{'film': q['film'], 'ss': q['ss'], 'd': round(q['t1'] - q['t0'], 3), 'path': q['path']} for q in shots if 'film' in q], open(os.path.join(W, 'films.json'), 'w'))
print('frames', len(frames), 'take', TAKE, 'close', CLOSE, 'dur', DUR); [print(y) for y in you]
