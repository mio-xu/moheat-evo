#!/usr/bin/env python3
"""The edit of the promo: which captured moments go where on the music grid (128 BPM, beat = 0.46875 s), and what is drawn on top.
Reads the capture folders (render.js: state.jsonl + frames/) and writes <work>/frames.json (one compositor descriptor per video frame,
read by comp.js + comp.html) and <work>/audio_plan.json (read by mix.py).  Usage: python3 edit.py <work dir>"""
import json, math, os, re, sys

W = sys.argv[1]
FPS, BEAT = 30, 60 / 128
BAR = 4 * BEAT
DUR = 62.5
STAGE = [196, 152, 2756, 1550.25]          # the page's stage in the DPR-2 capture (layout.json)


def states(d):
    S = {}
    for l in open(os.path.join(W, d, 'state.jsonl')):
        s = json.loads(l); S[s['f']] = s
    return S


CAPS = ['s_gifu', 'n_tea', 'k_rt', 's_yama', 's_tea']
ST = {d: states(d) for d in CAPS if os.path.exists(os.path.join(W, d, 'state.jsonl'))}
strip = lambda s: re.sub(r'\s+', ' ', re.sub(r'\[[^\]]*\]', '', s or '')).strip()
clamp = lambda v, a=0., b=1.: max(a, min(b, v))
ease = lambda x: 1 - (1 - clamp(x)) ** 3

# ---------------------------------------------------------------- the edit: (video start, capture, src start, src end, extras)
# All footage = the PUBLIC scripted pages (Demo23 / 41 / 42) rendered by render.js; capture times = their virtual seconds
# (state.jsonl "t"). Every cut lands on a beat (video side).
B = lambda n: round(n * BEAT, 4)
SEGS = []
def seg(cap, a, b, **kw):
    t0 = SEGS[-1]['t1'] if SEGS else 0.
    SEGS.append(dict(cap=cap, a=a, b=b, t0=t0, t1=round(t0 + (b - a), 4), **kw))

# 0 – 8 beats: hook — Demo23 at Gifu keep: Nobunaga whispers at your left ear 「…ここから天下を取る。」, the left ear warms with his voice
seg('s_gifu', 30.95, 30.95 + B(8), part='hook')
# 8 – 16 beats: statement card (drawn): real-time AI conversation + the flow chips
SEGS.append(dict(cap=None, t0=B(8), t1=B(16), part='statement'))
# 16 – 43 beats: 1 : 1 (Demo23, tea room): a draught from behind (cool, left) while he whispers at your left ear (warm) = DUAL on one
# ear → you answer by voice 「こたつで温まります！」 → he answers from your ear
seg('n_tea', 38.40, 38.40 + B(27), part='solo', you={'u': 'u6', 'near': 43.6})
# 43 – 93 beats: round table (Demo42, Kyoto izakaya, two characters): your yakitori tip → Nobunaga laughs → he opens the window on the
# snow (right cold) → Ieyasu whispers at your LEFT ear (left warm, right still cold) → Nobunaga laughs from the window (far = mild)
seg('k_rt', 41.55, 41.55 + B(50), part='rt', you={'u': 'u5', 'near': 41.8})
# 93 – 108 beats: montage (7 cuts: 3 + 6 × 2 beats): the three demos, then hot ↔ cold moments from other places
MONT = [('cover', 'Demo23_NobunagaTalk', '1 : 1 · 信長と', 'Talk with Nobunaga'), ('cover', 'Demo41_IeyasuTalk', '1 : 1 · 家康と', 'Talk with Ieyasu'),
        ('cover', 'Demo42_SengokuRoundtable', 'ふたりと · 座談会', 'Round table with both'),
        ('s_yama', 54.0, '山崎 · 蒸溜釜の熱', 'Yamazaki: heat from the stills'), ('s_yama', 87.3, '山崎 · 氷の杯', 'An iced glass at your ear'),
        ('s_tea', 98.6, '茶室 · 熱いお茶', 'Tea room: “It’s hot”'), ('s_tea', 56.5, '茶室 · すきま風', 'A draught through the shoji')]
for i, m in enumerate(MONT):
    t0, t1 = B(93 + (0 if i == 0 else 1 + 2 * i)), B(93 + 3 + 2 * i)
    if m[0] == 'cover': SEGS.append(dict(cap=None, cover=m[1], t0=t0, t1=t1, part='montage', label=m[2:]))
    else: SEGS.append(dict(cap=m[0], a=m[1], b=m[1] + 2 * BEAT, t0=t0, t1=t1, part='montage', label=m[2:]))
SEGS.append(dict(cap=None, t0=B(108), t1=B(120), part='flow'))
for S_ in SEGS:   # your turn, from the capture itself: "your turn" opens (a) → the reply starts (b)
    Y = S_.get('you')
    if Y and S_['cap'] in ST:
        fr = sorted(ST[S_['cap']].values(), key=lambda q: q['t'])
        Y['a'] = next(q['t'] for q in fr if q['t'] >= Y['near'] - 1.5 and q.get('phase') == 'listen')
        Y['b'] = next(q['t'] for q in fr if q['t'] > Y['a'] and q.get('phase') == 'speak' and q.get('sub') and q['who'] != 'あなた')
SEGS.append(dict(cap=None, t0=B(120), t1=DUR, part='end'))

# ---------------------------------------------------------------- per-frame helpers
NAMEJ = {'信長': 'N', '家康': 'I', 'あなた': 'Y'}
POSJ = {'left_ear': ('左耳元', 'at your left ear', 12), 'right_ear': ('右耳元', 'at your right ear', 12), 'near': ('目の前', 'close', 50),
        'seat': ('座', 'seat', 130), 'left': ('左', 'on your left', 100), 'right': ('右', 'on your right', 100), 'window': ('窓辺', 'by the window', 400), 'behind': ('背後', 'behind', 90)}
PLACE = {'n_tea': ('tea',), 'k_rt': ('kyoto',), 's_gifu': ('gifu',), 's_yama': ('yamazaki',), 's_tea': ('tea',)}
EVT = {('azuchi', 'fire'): ('h', '🔥 火鉢 brazier · R'), ('kyoto', 'window'): ('c', '❄️ 雪の窓 snowy window · R'), ('kyoto', 'fire'): ('h', '🍶 熱燗 warm sake'),
       ('kyoto', 'gust'): ('c', '🌬 戸口の風 door draught'), ('gifu', 'gust'): ('c', '🍃 山風 mountain wind · R'), ('gifu', 'fanL'): ('c', '🪭 扇 fan · L'),
       ('yamazaki', 'glass'): ('c', '🧊 氷の杯 iced glass · R'), ('yamazaki', 'still'): ('h', '♨️ 蒸溜釜 stills · L'), ('yamazaki', 'gust'): ('c', '🌫 霧の風 mist'),
       ('tea', 'fire'): ('h', '🔥 炭 more charcoal'), ('tea', 'gust'): ('c', '🌬 すきま風 draught')}
AMB = {'azuchi': ('c', '🌙 夜風 night wind'), 'kyoto': ('c', '❄️ 雪の窓 snowy window · R'), 'gifu': ('c', '🍃 山風 wind · R'), 'yamazaki': ('c', '🌫 霧 mist'), 'tea': ('h', '🔥 囲炉裏 hearth')}


def tags(s, cap):
    out = []
    place = PLACE[cap][0]
    for c, ch in (s.get('ch') or {}).items():
        if ch['talk']:
            p = POSJ.get(ch['key'], ('', '', 0)); nm = ('信長' if c == 'N' else '家康')
            out.append(('h', f"🗣 {nm}の声 voice · {p[1]}"))
    for e in s.get('ev') or []:
        x = EVT.get((place, e[0]))
        if x and x not in out: out.append(x)
    if len(out) < 3: out.append(AMB[place])
    return out[:3]


def frame_path(cap, t):
    f = int(round(t * FPS))
    for g in [f, f - 1, f - 2, f - 3, f + 1, f + 2]:   # (a frame or two past the captured range → the nearest captured one)
        p = os.path.join(W, cap, 'frames', f'{g:05d}.jpg')
        if os.path.exists(p): return p, g
    return os.path.join(W, cap, 'frames', f'{f:05d}.jpg'), f


LAY = {}
def stage_of(cap):
    if cap not in LAY:
        L = json.load(open(os.path.join(W, cap, 'layout.json')))['stage']; LAY[cap] = [L['x'] * 2, L['y'] * 2, L['w'] * 2, L['h'] * 2]
    return LAY[cap]


def crop_zoom(z, cap, cx=.5, cy=.45):
    x, y, w, h = stage_of(cap); nw, nh = w / z, h / z
    return [x + (w - nw) * cx, y + (h - nh) * cy, nw, nh]


WAVE = json.load(open(os.path.join(W, 'user', 'levels.json'))) if os.path.exists(os.path.join(W, 'user', 'levels.json')) else {}
UTXT = {'u6': ('こたつで温まります！', 'I warm up under a kotatsu!'), 'u5': ('焼き鳥のねぎまがおすすめです！', 'Try the negima yakitori!')}

frames, plan = [], {'segs': [], 'user': [], 'beats': BEAT}
HS = {'seg': None}
for fi in range(int(round(DUR * FPS))):
    t = fi / FPS
    S = next(s for s in SEGS if s['t0'] - 1e-6 <= t < s['t1'] + 1e-6)
    lt = t - S['t0']; beat = t / BEAT; D = {'t': round(t, 3)}
    part = S['part']
    if S.get('cap'):
        src_t = S['a'] + lt; st = ST[S['cap']].get(int(round(src_t * FPS))) or {}
        path, _ = frame_path(S['cap'], src_t)
        zoom = 1 + .035 * clamp(lt / max(1, S['t1'] - S['t0']))
        D['foot'] = {'src': 'file://' + path, 'crop': crop_zoom(zoom, S['cap'])}
        # subtitles: the characters' lines (your own line is the "you" panel)
        who = NAMEJ.get(st.get('who'), '')
        if st.get('sub') and who in ('N', 'I'):
            D['sub'] = {'who': who, 'ja': strip(st['ja']), 'en': strip(st['en']), 'a': 1}
        # the HUD (real meters / command of that frame) + the badge: one corner, the side where no face is (a close-up at an ear or a
        # standing figure fills the top of its side); a side change waits 0.3 s and swaps with a short fade
        occ = set()
        for ch in (st.get('ch') or {}).values():
            if ch['a'] < .2 or not (ch['kind'] in ('stand', 'ear') or (ch['kind'] == 'bust' and ch['h'] > 1300 and abs(ch['x'] - 960) > 300)): continue
            if ch['x'] > 1150: occ.add('R')
            elif ch['x'] < 770: occ.add('L')
        want = 'L' if ('R' in occ and 'L' not in occ) else 'R'
        if S is not HS['seg']: HS.update(seg=S, side=want, pend=None, sw=-9)
        elif want != HS['side']:
            if HS['pend'] != want: HS['pend'], HS['since'] = want, t
            elif t - HS['since'] >= .3: HS.update(side=want, pend=None, sw=t)
        else: HS['pend'] = None
        side = HS['side']; fa = clamp(abs(t - HS['sw'] - .0) / .2) if t - HS['sw'] < .2 else 1
        hs = .82 if part == 'montage' else 1
        hx = 56 if side == 'L' else 1920 - int(520 * hs) - 56
        D['hud'] = {'m': st.get('m', [0, 0, 0, 0]), 'cmd': st.get('cmd', 'stop'), 'tags': tags(st, S['cap']), 'x': hx, 'y': 104, 's': hs, 'a': fa}
        corner = {'x': 56, 'y': 40} if side == 'L' else {'r': 56, 'y': 40}
        if part == 'hook':   # first appearance: zoomed in, with a caption, then into its corner
            k = ease((lt - 2.45) / .8)
            D['hud'].update(x=1100 + (hx - 1100) * k, y=70 + (104 - 70) * k, s=1.2 + (1 - 1.2) * k, a=ease(lt / .5))
            if lt < 2.7: D['hudcap'] = {'x': 1100, 'y': 545, 'p': clamp((lt - .3) / .8) * (1 - clamp((lt - 2.25) / .4)), 'k': 'MoHeat Evo · output',
                                        'ja': '耳に届く*温度*', 'en': 'What your ears feel: his whisper<br>warms your *left* ear.'}
        if part in ('solo', 'rt'):
            D['badge'] = [{**corner, 'p': clamp(lt / .5) * fa, 'dot': '#ff7a2f',
                           'html': ('1 : 1 · 信長と、語らう <small>Talk with Nobunaga</small>' if part == 'solo' else 'ふたりと · 座談会 <small>Nobunaga × Ieyasu</small>')}]
        Y = S.get('you')
        if Y and Y['a'] - .05 <= src_t < Y['b'] + .1:
            u = Y['u']; ly = src_t - Y['a']
            lv = WAVE.get(u, {}); i = int((ly - .35) * 20)
            wave = [lv['lv'][j] if lv and 0 <= j < len(lv['lv']) else 0 for j in range(i - 23, i + 1)]
            typed = st.get('phase') in ('think', 'speak') and st.get('who') == 'あなた'
            D['you'] = {'p': clamp(ly / .3) * (1 - clamp((src_t - Y['b']) / .1)), 'k': 'あなた · You — 声で話す' if not typed else 'あなた · You → 考え中 thinking…', 'wave': wave,
                        't': UTXT[u][0] if typed else '', 'e': UTXT[u][1] if typed else ''}
            D.pop('sub', None)
        # explanatory callouts (big, film style) at the key thermal moments
        cal = None; fin = lambda x0, x1: clamp((src_t - x0) / .35) * (1 - clamp((src_t - x1) / .35))
        if part == 'solo':
            if src_t < 43.45: cal = ('左耳に、*声のぬくもり*と~すきま風~', 'DUAL: his warm *voice* and a cold ~draught~ on the same ear', fin(S['a'], 43.1))
            elif src_t >= 46.3: cal = ('声が近いほど、*温かい*', 'The closer his voice, the *warmer* that ear', fin(46.4, 50.55))
        if part == 'rt':
            if src_t < 44.6: cal = ('*信長*と*家康*、同時に', 'Round table: two characters talk with you — and with each other', fin(S['a'], 44.2))
            elif 54.55 <= src_t < 55.5: cal = ('窓を開けた → 右から~雪の冷気~', 'He opens the window: cold air from your *right*', fin(54.55, 55.2))
            elif 55.5 <= src_t < 60.15: cal = ('家康の声 → *左耳*が温かい、右は~冷たい~', 'Ieyasu whispers on your left: left *warm*, right ~cold~, at once', fin(55.5, 59.8))
            elif src_t >= 60.15: cal = ('遠くの声は、ほんのり', 'A voice far away warms only gently', fin(60.25, 64.6))
        if cal:   # on the free side at the top, else under the HUD
            other = 'L' if side == 'R' else 'R'
            if other not in occ: box = {'x': 100, 'y': 70, 'w': 1000} if other == 'L' else {'x': 1920 - 100 - 1000, 'y': 70, 'w': 1000, 'align': 'right'}
            else: box = {'x': 56, 'y': 440, 'w': 820} if side == 'L' else {'x': 1920 - 56 - 820, 'y': 440, 'w': 820, 'align': 'right'}
            D['text'] = [{**box, 'k': '', 'ja': cal[0], 'jas': 50, 'en': cal[1], 'ens': 28, 'p': cal[2], 'card': True}]
        if part == 'montage':
            D['text'] = [{'x': 100, 'b': 70, 'w': 1300, 'k': 'Every conversation is different', 'ja': '会話は、*毎回ちがう*。', 'en': '', 'p': 1}]
            D['badge'] = [{**corner, 'p': 1, 'html': f"{S['label'][0]} <small>{S['label'][1]}</small>"}]
            D.pop('sub', None); D['grad'] = .9
    elif S.get('cover'):
        p = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', S['cover'], 'media', 'cover', 'en.w1920.webp'))
        z = 1 + .04 * clamp(lt / (S['t1'] - S['t0']))
        D['foot'] = {'src': 'file://' + p, 'crop': [1920 * (1 - 1 / z) / 2, 1080 * (1 - 1 / z) / 2, 1920 / z, 1080 / z], 'vign': False}
        D['badge'] = [{'r': 56, 'y': 40, 'p': 1, 'html': f"{S['label'][0]} <small>{S['label'][1]}</small>"}]
        D['text'] = [{'x': 100, 'b': 70, 'w': 1300, 'k': 'Every conversation is different', 'ja': '会話は、*毎回ちがう*。', 'en': '', 'p': 1}]; D['grad'] = .9
    elif part == 'statement':
        bg = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '_kit', 'art', 'banquet_bg.webp'))
        D['foot'] = {'src': 'file://' + bg, 'crop': [0, 0, 1536, 864], 'blur': 18, 'dim': .72}
        b = lt / BEAT
        D['text'] = [{'x': 160, 'y': 250, 'w': 1600, 'align': 'center', 'k': 'Real-time AI conversation · リアルタイムAI会話', 'ja': '信長と、*リアルタイム*で語らう。', 'jas': 84,
                      'en': 'A live AI — not a script. And you <span class="acc">feel</span> every word.', 'ens': 36, 'p': clamp(b / 1.2)}]
        D['cards'] = [{'kind': 'chips', 'y': 640, 'b': b, 'b0': 2, 'step': 1.2}]
        D['glow'] = [{'x': 50, 'y': 110, 'c': 'rgba(255,122,47,.35)', 'r': 60, 'a': .6}]
    elif part == 'flow':
        b = lt / BEAT
        D['text'] = [{'x': 100, 'y': 80, 'w': 1100, 'k': 'How it works', 'ja': '声も、温度も、*リアルタイム*。', 'jas': 66, 'en': 'Voice and temperature, generated live — every 0.1 s.', 'ens': 30, 'p': clamp(b / 1.2)}]
        D['cards'] = [{'kind': 'flow', 'y': 400, 'b': b, 'b0': 1, 'step': 1.4},
                      {'kind': 'code', 'y': 790, 'b': b, 'b0': 7, 'step': .8, 'lines': ['<span style="color:#8fe0b4">I</span>|left_ear|[whispers] …お寒うござろう。それがしの側へお寄りなされ。', '<span style="color:#5fb4ff">@|window</span>   → ❄️ cold from the right',
                                                                                         '→ <span style="color:#fff">DUAL LC0 LH121 RC68 RH28</span>   <span style="color:#a8afb8">(left: his warm voice · right: the snow)</span>']}]
        D['glow'] = [{'x': 15, 'y': 100, 'c': 'rgba(255,122,47,.25)', 'r': 55, 'a': 1}, {'x': 90, 'y': 0, 'c': 'rgba(95,180,255,.18)', 'r': 50, 'a': 1}]
        pf = os.path.join(W, 'prod', 'heat', f'{min(int(lt * FPS) + 1, 168):05d}.jpg')
        D['cards'].append({'kind': 'pip', 'x': 1300, 'y': 70, 'w': 520, 'h': 292, 'b': b, 'b0': 2, 'src': 'file://' + pf, 'label': 'LED heating · mist cooling', 'dot': '#ff7a2f'})
    elif part == 'end':
        b = lt / BEAT
        pf = os.path.join(W, 'prod', 'rays', f'{min(int(lt * FPS) + 1, 180):05d}.jpg')
        D['cards'] = [{'kind': 'end', 'b': b}, {'kind': 'pip', 'x': 1160, 'y': 170, 'w': 660, 'h': 740, 'b': b, 'b0': 1, 'src': 'file://' + pf}]
        D['glow'] = [{'x': 30, 'y': 100, 'c': 'rgba(255,122,47,.28)', 'r': 60, 'a': 1}]
        D['fade'] = round(clamp((t - (DUR - .5)) / .5), 3)
    # downbeat flash on the big cuts
    for c in [B(8), B(16), B(43), B(93), B(108), B(120)]:
        if 0 <= t - c < .25: D['flash'] = {'a': round(.32 * (1 - (t - c) / .25), 3), 'c': '#fff'}
    if t < .4: D['fade'] = round(1 - t / .4, 3)
    frames.append(D)

plan['segs'] = [{k: v for k, v in s.items() if k in ('cap', 'a', 'b', 't0', 't1', 'part', 'you', 'cover', 'label')} for s in SEGS]
json.dump(frames, open(os.path.join(W, 'frames.json'), 'w'))
json.dump(plan, open(os.path.join(W, 'audio_plan.json'), 'w'), ensure_ascii=False, indent=1)
need = {}
for s in SEGS:
    if s.get('cap'): need.setdefault(s['cap'], []).append(f"{s['a'] - .1:.2f}-{s['b'] + .1:.2f}")
print('frames', len(frames), 'segments:'); [print(f"  {s['t0']:6.2f}–{s['t1']:6.2f} {s['part']:9} {s.get('cap') or s.get('cover') or ''} {s.get('a', '')}") for s in SEGS]
print('capture ranges:', json.dumps(need))
