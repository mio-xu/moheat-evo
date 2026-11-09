#!/usr/bin/env python3
"""Sound of the promo (48 kHz stereo, numpy): the REAL voices of the captured moments (the public scripted pages) at the time and place the engine played them
(audio.json of each capture: voice + move log → binaural-style pan: level / time / colour difference per ear, distance, room),
the demo's own room sounds and events re-synthesised like audio.js (night wind + crickets, izakaya murmur + hearth, brazier
crackle, the window gust from the right …), your spoken turns, and the film's soundtrack underneath — ducked hard under the
voices and under the captured demo sound, up in the intro card, montage, flow and end card.  Usage: python3 mix.py <work>"""
import json, math, os, subprocess, sys
import numpy as np

W = sys.argv[1]; SR = 48000; FPS = 30
plan = json.load(open(os.path.join(W, 'audio_plan.json'))); DUR = plan['dur']
N = int(DUR * SR); out = np.zeros((N, 2)); dry_voice = np.zeros(N); duck = np.zeros(N)   # duck: 1 where a voice plays
rng = np.random.default_rng(3)


def load(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(np.float64)


def onepole_lp(x, fc):
    a = math.exp(-2 * math.pi * fc / SR); y = np.empty_like(x); s = 0.
    # vectorised via lfilter-free recursion in chunks (fast enough for a few seconds)
    for i in range(len(x)): s = (1 - a) * x[i] + a * s; y[i] = s
    return y


try:
    from scipy.signal import lfilter, butter, fftconvolve
    def lp(x, fc): a = math.exp(-2 * math.pi * fc / SR); return lfilter([1 - a], [1, -a], x)
    def bp(x, lo, hi): b, a = butter(2, [lo / (SR / 2), hi / (SR / 2)], 'band'); return lfilter(b, a, x)
    def hp(x, fc): b, a = butter(2, fc / (SR / 2), 'high'); return lfilter(b, a, x)
    conv = fftconvolve
except ImportError:
    lp = onepole_lp
    def bp(x, lo, hi): return lp(x, hi) - lp(x, lo)
    def hp(x, fc): return x - lp(x, fc)
    def conv(a, b, mode='full'): n = len(a) + len(b) - 1; m = 1 << (n - 1).bit_length(); return np.fft.irfft(np.fft.rfft(a, m) * np.fft.rfft(b, m), m)[:n]

IR = rng.standard_normal(int(SR * .9)) * (1 - np.arange(int(SR * .9)) / (SR * .9)) ** 3.2   # a wooden hall, like audio.js
IR /= math.sqrt((IR ** 2).sum())                                                            # unit energy: `rev` = the send level


def place(x, t, az, dist, gain=1., rev=None, vo=False):
    """put mono x at video time t, from direction az (rad, + = right) and distance (m)"""
    p = math.sin(az); ap = abs(p)
    near = 1.0 if dist <= .15 else .92 if dist <= .6 else .8 if dist <= 1.5 else .55
    gN, gF = math.sqrt((1 + ap) / 2), math.sqrt((1 - ap) / 2)
    if dist <= .15: gF *= .6                                   # at the ear: the far ear hears much less
    far = lp(x, 9000 - 6500 * ap) if ap > .05 else x            # head shadow: duller far ear
    itd = int(.00068 * ap * SR)
    far = np.concatenate([np.zeros(itd), far])[:len(x)]
    L, R = (x * gN, far * gF) if p < 0 else (far * gF, x * gN)
    if ap <= .05: L = R = x * math.sqrt(.5)
    i0 = int(t * SR); n = min(len(x), N - i0)
    if n <= 0: return
    out[i0:i0 + n, 0] += L[:n] * gain * near; out[i0:i0 + n, 1] += R[:n] * gain * near
    r = rev if rev is not None else (.03 if dist <= .15 else .12 if dist <= .6 else .2 if dist <= 1.5 else .45)
    if r > 0:
        w = conv(x[:n], IR)[:n + len(IR)] * gain * r; m = min(len(w), N - i0)
        out[i0:i0 + m, 0] += w[:m] * (1 - .3 * p); out[i0:i0 + m, 1] += w[:m] * (1 + .3 * p)
    if vo: duck[i0:i0 + n] = np.maximum(duck[i0:i0 + n], (np.abs(x[:n]) > 1e-4).astype(float))


def fade(x, a=.02, b=.04):
    na, nb = int(a * SR), int(b * SR); x = x.copy()
    if na: x[:na] *= np.linspace(0, 1, na)
    if nb: x[-nb:] *= np.linspace(1, 0, nb)
    return x


def norm_rms(x, target=.085):
    v = x[np.abs(x) > .01]; r = math.sqrt((v ** 2).mean()) if len(v) else 1
    return x * (target / r)


# ---------------------------------------------------------------- room sounds (synthesised like audio.js) + events
def noise(n): return rng.standard_normal(n)
def tt(n): return np.arange(n) / SR

def amb(place_id, t0, t1, g=1.):
    n = int((t1 - t0) * SR)
    if n <= 0: return
    x = np.zeros((n, 2))
    def add(m, az, s):
        p = math.sin(az); x[:, 0] += m * s * math.sqrt((1 - p) / 2) * 1.4; x[:, 1] += m * s * math.sqrt((1 + p) / 2) * 1.4
    if place_id in ('azuchi', 'gifu', 'yamazaki'):   # wind: a breathing band of noise
        w = bp(noise(n), 250, 700) * (.6 + .4 * np.sin(2 * math.pi * .09 * tt(n) + t0)); add(w, .6, .05)
    if place_id == 'azuchi':                          # crickets on the left
        c = np.zeros(n)
        for k in np.arange(0, n / SR, .9):
            for j in range(4):
                i = int((k + j * .06) * SR); m = int(.03 * SR)
                if i + m < n: c[i:i + m] += np.sin(2 * math.pi * 4300 * tt(m)) * np.hanning(m)
        add(c, -1.3, .012)
    if place_id in ('kyoto',):                        # izakaya murmur behind you
        mur = bp(noise(n), 300, 900) * (.7 + .3 * np.sin(2 * math.pi * 3.1 * tt(n))); add(mur, 2.4, .05)
    if place_id in ('kyoto', 'tea'):                  # hearth / kitchen fire: rumble + crackles in front
        f = lp(noise(n), 260) * .35
        for k in rng.uniform(0, n / SR, int(n / SR * 4)):
            i = int(k * SR); m = int(.012 * SR)
            if i + m < n: f[i:i + m] += bp(noise(m), 1800, 4200) * rng.uniform(.15, .5)
        add(f, 0, .06 if place_id == 'kyoto' else .1)
    x[:int(.03 * SR)] *= np.linspace(0, 1, int(.03 * SR))[:, None]; x[-int(.05 * SR):] *= np.linspace(1, 0, int(.05 * SR))[:, None]
    i0 = int(t0 * SR); out[i0:i0 + n] += x * g


def fx(kind, t, az):
    if kind == 'fire':
        n = int(2 * SR); x = lp(noise(n), 300) * np.exp(-tt(n) * 2) * .5
        for k in rng.uniform(0, 1.6, 12):
            i = int(k * SR); m = int(.012 * SR); x[i:i + m] += bp(noise(m), 1800, 4500) * rng.uniform(.2, .6)
        place(x * .5, t, az, 1.3, rev=.1)
    elif kind == 'gust':
        n = int(4 * SR); env = np.interp(tt(n), [0, 1.2, 3.8, 4], [0, .9, 0, 0])
        x = bp(noise(n), 300, 1100) * env; place(x * .3, t, az, 1.5, rev=.2)
    elif kind == 'clink':
        n = int(.6 * SR); x = (np.sin(2 * math.pi * 2650 * tt(n)) * .08 + np.sin(2 * math.pi * 3980 * tt(n)) * .05) * np.exp(-tt(n) * 8); place(x, t, az, .3)
    elif kind == 'fan':
        n = int(3.3 * SR); x = np.zeros(n)
        for j in range(6): i = int(j * .55 * SR); m = int(.22 * SR); x[i:i + m] += bp(noise(m), 600, 1300) * np.hanning(m) * .32
        place(x, t, az, .35)


PLACE = {'s_az': 'azuchi', 'v4': 'kyoto', 'n_tea': 'tea', 'k_rt': 'kyoto', 's_gifu': 'gifu', 's_yama': 'yamazaki', 's_tea': 'tea'}
AUD = {}
for s in plan['segs']:
    if s.get('film'):   # a story film: its own finished stereo mix for this one shot
        raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(s['ss']), '-t', str(s['t1'] - s['t0']), '-i', s['path'], '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True).stdout
        x = np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).astype(np.float64); n_ = min(len(x), N - int(s['t0'] * SR)); nf = int(.012 * SR)
        x[:nf] *= np.linspace(0, 1, nf)[:, None]; x[-nf:] *= np.linspace(1, 0, nf)[:, None]; out[int(s['t0'] * SR):int(s['t0'] * SR) + n_] += x[:n_] * .9
        continue
    cap = s.get('cap')
    if not cap: continue
    quick = s['part'] == 'quick'
    if cap not in AUD: AUD[cap] = json.load(open(os.path.join(W, cap, 'audio.json')))
    A = AUD[cap]
    if 'off' not in A:   # virtual time → the capture's state time: calibrated on the subtitle that appears with each voice
        subs, last = [], ''
        for l in open(os.path.join(W, cap, 'state.jsonl')):
            q = json.loads(l); k = q['who'] + q['en'] if q.get('sub') else ''
            if k != last and q.get('sub') and q['who'] != 'あなた': subs.append(q['t'])
            last = k
        vs = [e['vt'] for e in A['log'] if e['k'] == 'voice']
        d = sorted(sb - v for sb, v in zip(subs, vs)); A['off'] = d[len(d) // 2] if d else -A['t0']
        print(f'{cap}: state t = vt {A["off"]:+.3f}')
    st = lambda vt, A=A: vt + A['off']
    a, b, t0, t1 = s['a'], s['b'], s['t0'], s['t1']
    amb(PLACE[cap], t0, t1, .6 if quick else .9)
    pos = {}
    for e in A['log']:
        if e['k'] == 'move': pos.setdefault(e['id'], []).append((st(e['vt']), e['az'], e['dist']))
    for e in A['log']:
        s0 = st(e['vt'])
        if e['k'] == 'fx' and e['fx'] in ('fire', 'gust', 'clink', 'fan') and a - .05 <= s0 < b - .3:
            fx(e['fx'], t0 + s0 - a, (e['a'] or [0])[0] if e['fx'] != 'fan' else e['a'][0])
        if e['k'] != 'voice': continue
        if not ((a - (e.get('dur') or 0) < s0 < b - .1) if quick else (a - 1.0 <= s0 < b - .2)): continue        # a line already under way when the cut starts: its tail
        key = e['key']; f = os.path.join(W, cap, 'voices', key.replace(':', '_') + ('.mp3' if key.startswith('mp3') else '.m4a'))
        x = norm_rms(load(f))
        if s0 < a: x = x[int((a - s0) * SR):]; s0 = a
        if not len(x): continue
        room = min(len(x), int((t1 - (t0 + s0 - a)) * SR))
        x = fade(x[:room], .005, .03)
        ps = [p for p in pos.get(e['id'], []) if p[0] <= s0 + .02]; az, dist = (ps[-1][1], ps[-1][2]) if ps else (0, 1.3)
        place(x, t0 + s0 - a, az, dist, gain=.85 if quick else 1.0, vo=not quick)
        print(f"voice {cap} {key} {e['id']} src {s0:.2f} → video {t0 + s0 - a:.2f}  az {az:+.2f} d {dist}")
    for Y in s.get('you') or []:   # your spoken turns: from the front, close (the mic)
        x = norm_rms(load(os.path.join(W, 'user', Y['u'] + '_t.wav')), .075); place(fade(x), t0 + (Y['s'] - a), 0, .55, gain=.9, rev=.05, vo=True)

# ---------------------------------------------------------------- music: the Nobunaga series' own synthesised koto (Karplus-Strong,
# miyako-bushi; Demo09 build_audio.py, listed as synthesized in credits.html): up only at the very start and on the closing line, a
# whisper under the scene, silent whenever anyone speaks.
def koto_note(hz, dur=2.4):
    n = int(dur * SR); p = int(SR / hz); buf = rng.uniform(-1, 1, p); o = np.zeros(n)
    for i in range(n):
        o[i] = buf[i % p]; buf[i % p] = .5 * (buf[i % p] + buf[(i + 1) % p]) * .996
    return hp(o, 80)
SCALE = [329.63, 349.23, 440.0, 493.88, 523.25, 659.26, 698.46]
PHRASE = [(0, 4), (1.1, 2), (1.9, 1), (3.2, 0), (5.0, 3), (5.8, 4), (6.6, 6), (8.4, 5), (10.6, 2), (11.4, 1), (12.2, 0), (14.4, 4), (15.2, 3), (16.0, 2), (17.6, 0)]
OUTRO = [(0, 4), (.8, 3), (1.6, 2), (2.4, 0)]
music = np.zeros((N, 2))
def pluck(t, k, g=1.):
    x = koto_note(SCALE[k]) * .5 * g; i0 = int(t * SR); m_ = min(len(x), N - i0); pan = (k - 3) / 8
    if m_ > 0: music[i0:i0 + m_, 0] += x[:m_] * (1 - pan); music[i0:i0 + m_, 1] += x[:m_] * (1 + pan)
t_ = 0.
while t_ < plan['take']:
    for dt, k in PHRASE:
        if t_ + dt < plan['take'] - .5: pluck(t_ + dt, k)
    t_ += 19.5
close = plan.get('close', plan['take'])
quick_t = [s['t0'] for s in plan['segs'] if s['part'] == 'quick']
for n_, s in enumerate(s for s in plan['segs'] if s['part'] == 'quick'):   # one pluck on every cut, a low note where a new group starts
    pluck(s['t0'], 0 if s.get('first') else [4, 2, 5, 3, 1][n_ % 5], 1.2 if s.get('first') else .9)
for dt, k in OUTRO: pluck(close + .1 + dt, k, 1.1)
first = np.argmax(duck > 0) / SR
gdb = np.full(N, -26.)                                     # under the scene: very low
gdb[:int(first * SR)] = -7                                 # the very start, before the first word
gdb[int(plan['take'] * SR):int(close * SR)] = -11          # the quick section
gdb[int(close * SR):] = -7                                 # the closing line
gdb = np.where(duck > 0, -70., gdb)                        # silent while anyone speaks
k_a, k_r = math.exp(-1 / (.05 * SR)), math.exp(-1 / (.4 * SR)); g = np.empty(N); v = gdb[0]
for i in range(N):
    tgt = gdb[i]; k = k_a if tgt < v else k_r; v = k * v + (1 - k) * tgt; g[i] = v
music = music * (10 ** (g / 20))[:, None]

mix = out + music
# gentle bus: soft-knee limiter → peak −1.5 dBFS, then a true-peak safe gain
pk = np.abs(mix).max(); mix = np.tanh(mix / (pk * .9) * 1.2) * (pk * .9) / 1.2 if pk > 0 else mix
mix *= 10 ** (-1.6 / 20) / np.abs(mix).max()
wav = os.path.join(W, 'mix.wav')
raw = (np.clip(mix, -1, 1) * 32767).astype('<i2').tobytes()
import wave
with wave.open(wav, 'wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(raw)
print('wrote', wav, f'{N / SR:.2f} s')
