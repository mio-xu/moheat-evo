#!/usr/bin/env python3
"""The edit of the promo (v3, plain): which captured moments and real shots go where, and the little text that sits on them.
Reads the capture folders (render.js: state.jsonl + frames/) and <work>/real/, writes <work>/frames.json (comp.js + comp.html) and
<work>/audio_plan.json (mix.py).  Usage: python3 edit.py <work dir>"""
import json, os, re, sys

W = sys.argv[1]
FPS, DUR = 30, 62.5
RADAR = [2954, 270, 620]                   # the demo's own radar in the DPR-2 page capture (x, y, side)
strip = lambda s: re.sub(r'\s+', ' ', re.sub(r'\[[^\]]*\]', '', s or '')).strip()
clamp = lambda v, a=0., b=1.: max(a, min(b, v))
ease = lambda x: 1 - (1 - clamp(x)) ** 3


def states(d):
    return {s['f']: s for s in map(json.loads, open(os.path.join(W, d, 'state.jsonl')))}


ST = {d: states(d) for d in ['s_gifu', 'n_tea', 'k_rt', 's_yama', 's_tea']}
LAY = {d: [v * 2 for v in (lambda L: [L['x'], L['y'], L['w'], L['h']])(json.load(open(os.path.join(W, d, 'layout.json')))['stage'])] for d in ST}


def pick(cap, who, key, near):   # 0.55 s after that character starts talking there in THIS capture
    fr = sorted(ST[cap].values(), key=lambda q: q['t'])
    return next(q['t'] for q in fr if q['t'] >= near - 2 and q.get('ch') and q['ch'].get(who, {}).get('key') == key and q['ch'][who]['talk']) + .55


SEGS, T = [], 0.
def add(dur, part, **kw):
    global T
    SEGS.append(dict(part=part, t0=T, t1=round(T + dur, 4), **kw)); T = round(T + dur, 4)
def cap(name, a, dur, part, **kw): add(dur, part, cap=name, a=a, b=a + dur, **kw)

cap('s_gifu', 30.90, 3.9, 'hook')                                 # his whisper at your left ear, held
add(2.3, 'real', real='r1')                                       # a real person, hands on the ear cups
add(9.375 - T, 'title')
cap('n_tea', 38.40, 12.625, 'solo', you={'u': 'u6m', 'near': 43.6})
cap('k_rt', 41.55, 23.44, 'rt', you={'u': 'u5m', 'near': 41.8})
COV = lambda d: dict(cover=d)
add(.75, 'montage', **COV('Demo23_NobunagaTalk')); add(.75, 'montage', **COV('Demo41_IeyasuTalk')); add(.9, 'montage', **COV('Demo42_SengokuRoundtable'))
cap('s_yama', pick('s_yama', 'N', 'right_ear', 87.0), 1.2, 'montage')
cap('s_tea', pick('s_tea', 'I', 'left_ear', 98.2), .9, 'montage')
add(1.7, 'how', real='led'); add(2.0, 'how', real='heat'); add(55.4 - T, 'how', real='cool')
add(DUR - T, 'end')
for S in SEGS:
    Y = S.get('you')
    if Y:
        fr = sorted(ST[S['cap']].values(), key=lambda q: q['t'])
        Y['a'] = next(q['t'] for q in fr if q['t'] >= Y['near'] - 1.5 and q.get('phase') == 'listen')
        Y['b'] = next(q['t'] for q in fr if q['t'] > Y['a'] and q.get('phase') == 'speak' and q.get('sub') and q['who'] != 'あなた')

WAVE = json.load(open(os.path.join(W, 'user', 'levels.json')))
UTXT = {'u6m': ('こたつで温まります！', 'I warm up under a kotatsu!'), 'u5m': ('焼き鳥のねぎまがおすすめです！', 'Try the negima yakitori!')}
HOW = {'ja': 'あなたの声 → キャラが答える → 耳に届く', 'en': 'Your voice → the character answers → your ears feel it', 'x': 100, 'b': 64, 'js': 40, 'es': 28, 'a': 1}
MONT = {'ja': '会話は、毎回ちがう。', 'en': 'Every conversation is different', 'x': 100, 'b': 64, 'js': 40, 'es': 28, 'a': 1}
HERE = os.path.dirname(os.path.abspath(__file__))
HS = {'seg': None}
frames = []
for fi in range(int(round(DUR * FPS))):
    t = fi / FPS
    S = next(s for s in SEGS if s['t0'] - 1e-6 <= t < s['t1'] + 1e-6)
    lt, part, D = t - S['t0'], S['part'], {'t': round(t, 3)}
    if S.get('cap'):
        src_t = S['a'] + lt; st = ST[S['cap']].get(int(round(src_t * FPS))) or {}
        f = int(round(src_t * FPS)); path = next((p for p in (os.path.join(W, S['cap'], 'frames', f'{g:05d}.jpg') for g in [f, f - 1, f - 2, f - 3, f + 1]) if os.path.exists(p)), None)
        D['foot'] = {'src': 'file://' + path, 'crop': LAY[S['cap']][:3]}
        if st.get('sub') and st.get('who') in ('信長', '家康') and part != 'montage':
            D['sub'] = {'name': st['who'], 'ja': strip(st['ja']), 'en': strip(st['en'])}
        # the radar: on the side without a face; a change of side waits 0.3 s and fades
        occ = set()
        for ch in (st.get('ch') or {}).values():
            if ch['a'] < .2 or not (ch['kind'] in ('stand', 'ear') or (ch['kind'] == 'bust' and abs(ch['x'] - 960) > 300)): continue
            occ.add('R' if ch['x'] > 1150 else 'L' if ch['x'] < 770 else 'C')
        want = 'L' if 'R' in occ and 'L' not in occ else 'R'
        if S is not HS['seg']: HS.update(seg=S, side=want, pend=None, sw=-9)
        elif want != HS['side']:
            if HS['pend'] != want: HS['pend'], HS['since'] = want, t
            elif t - HS['since'] >= .3: HS.update(side=want, pend=None, sw=t)
        else: HS['pend'] = None
        size, y, a = 400, 64, clamp((t - HS['sw']) / .2)
        if part == 'montage' and 'L' in occ and 'R' in occ: y = 1080 - 64 - size
        if part == 'hook':
            k = ease((lt - 2.5) / .7); size = 560 + (400 - 560) * k; a = clamp(lt / .4)
        x = 100 if HS['side'] == 'L' else 1920 - 100 - size
        D['radar'] = {'src': D['foot']['src'], 'crop': RADAR, 'x': x, 'y': y, 'size': size, 'a': a}
        L = None
        if part == 'hook' and lt < 3.3: L = ('耳に届く温度', 'What your ears feel', clamp((lt - .3) / .3) * (1 - clamp((lt - 2.9) / .3)))
        if part == 'solo' and src_t < 43.0: L = ('声が近いほど、温かい', 'The closer the voice, the warmer', clamp(lt / .3) * (1 - clamp((src_t - 42.7) / .3)))
        if part == 'rt':
            if src_t < 44.0: L = ('ふたりと、同時に', 'With both of them at once', clamp(lt / .3) * (1 - clamp((src_t - 43.7) / .3)))
            elif 54.6 <= src_t < 60.0: L = ('右は雪、左はささやき', 'Snow on the right, a whisper on the left', clamp((src_t - 54.6) / .3) * (1 - clamp((src_t - 59.7) / .3)))
        if L: D['line'] = {'ja': L[0], 'en': L[1], 'x': x, 'y': y + size + 12, 'w': max(size, 400), 'js': 34, 'es': 24, 'a': round(L[2], 3)}
        Y = S.get('you')
        if Y and Y['a'] - .05 <= src_t < Y['b']:
            lv = WAVE[Y['u']]['lv']; i = int((src_t - Y['a'] - .35) * 20)
            D['you'] = {'ja': UTXT[Y['u']][0], 'en': UTXT[Y['u']][1], 'a': round(clamp((src_t - Y['a']) / .2), 3), 'wave': [lv[j] if 0 <= j < len(lv) else 0 for j in range(i - 23, i + 1)]}
            D.pop('sub', None)
        if part == 'montage': D['line'] = MONT
    elif S.get('cover'):
        D['foot'] = {'src': 'file://' + os.path.abspath(os.path.join(HERE, '..', '..', '..', S['cover'], 'media', 'cover', 'en.w1920.webp')), 'crop': [0, 0, 1920]}
        D['line'] = MONT
    elif S.get('real'):
        n = min(int(lt * FPS) + 1, len(os.listdir(os.path.join(W, 'real', S['real']))))
        D['foot'] = {'src': 'file://' + os.path.join(W, 'real', S['real'], f'{n:05d}.jpg'), 'crop': [0, 0, 1920]}
        if part == 'how': D['line'] = HOW
    elif part == 'title':
        D['title'] = {'ja': '信長と、リアルタイムで語らう。', 'en': 'Powered by real-time AI. And you feel every word.', 'a': round(clamp(lt / .4), 3)}
    elif part == 'end':
        D['end'] = {'src': 'file://' + os.path.join(W, 'real', 'photo', 'photo.jpg')}
        f = clamp(1 - lt / .5)
        if f: D['fade'] = round(f, 3)
    if t > DUR - .6: D['fade'] = round(clamp((t - (DUR - .6)) / .5), 3)
    if t < .3: D['fade'] = round(1 - t / .3, 3)
    frames.append(D)

K = ('cap', 'a', 'b', 't0', 't1', 'part', 'you', 'cover', 'real')
rt = next(s for s in SEGS if s['part'] == 'rt')
plan = {'segs': [{k: v for k, v in s.items() if k in K} for s in SEGS], 'beats': 60 / 128, 'hits': [9.375, 55.4],
        'breathe': [[rt['t0'] + 54.4 - rt['a'], rt['t0'] + 60.0 - rt['a']]]}   # the snow-window moment: the music almost gone
json.dump(frames, open(os.path.join(W, 'frames.json'), 'w'))
json.dump(plan, open(os.path.join(W, 'audio_plan.json'), 'w'), ensure_ascii=False, indent=1)
print('frames', len(frames)); [print(f"  {s['t0']:6.2f}–{s['t1']:6.2f} {s['part']:8} {s.get('cap') or s.get('cover') or s.get('real') or ''} {s.get('a', '')}") for s in SEGS]
