#!/usr/bin/env python3
"""Thermal plan simulator for pre-production (DEMO_DESIGN_GUIDE §3 DUAL, §6 G1 thermal table) — before any page exists.

  python3 tools/thermal/plan_sim.py <demo folder> [--alt] [--plot] [--lang ja|en|zh]

Reads <demo>/scripts/script_data.py (STEPS: beats = [line id, position] · {interaction} · ['@event'] · ['window', who, qid]; L = lines)
and <demo>/project/thermal_plan.json (voice distances, smoothing, events), takes each line's real loudness from
<demo>/media/voice/<id>.m4a (50 ms RMS → 0–1 per line), plays the default story path (first option of every choice — `--alt` = the
last option; a step's 'pos' = the default position of its option / window lines; holds held for their secs; free-talk windows = 4 s silence + the speaker's 'silence' bridge; 0.35 s between lines) and
writes <demo>/project/thermal_preview.csv (20 Hz: t, LC, LH, RC, RH, the DUAL command, and a legacy one-mode-per-ear command `L±nn R±nn`
= the dominant mode per ear, so the old command set has 0 same-ear conflicts by construction) + prints the DUAL showcase checks:
  fast_switch  one ear goes from warm-only to cool-only (or back) within 3 s      peak  a channel ≥ 0.85
  direction    |left − right| ≥ 0.3 for one mode                                   dual  cool ≥ 0.2 and warm ≥ 0.2 on the same ear
Exit 1 when a showcase item is missing. `--plot` writes project/thermal_preview.png (needs matplotlib; optional).
Model: voice warm = (0.1 + 0.8 × loudness) × distance at the speaker's position; ambient 'set' sources stay, 'pulse' rises / holds /
fades, 'sweep' moves from az0 to az1; ear weights wL = 1 − 1.2·max(0, sin az), wR = 1 − 1.2·max(0, −sin az); first-order smoothing per
channel (warm rise / fall, cool rise / fall); caps warm 0.9, cool 1."""
import importlib.util, json, math, os, subprocess, sys
import numpy as np

D = os.path.abspath(sys.argv[1]); ALT = '--alt' in sys.argv
VLANG = sys.argv[sys.argv.index('--lang') + 1] if '--lang' in sys.argv else 'ja'   # voices per language: media/voice/<lang>/
sp = importlib.util.spec_from_file_location('sd', os.path.join(D, 'scripts', 'script_data.py')); SD = importlib.util.module_from_spec(sp); sp.loader.exec_module(SD)
PLAN = json.load(open(os.path.join(D, 'project', 'thermal_plan.json'), encoding='utf-8'))
EV, VO, SM = PLAN['events'], PLAN['voice'], PLAN['smoothing']
FPS = 20


def loud(lid):
    p = os.path.join(D, 'media', 'voice', VLANG, lid + '.m4a')
    if not os.path.exists(p): p = os.path.join(D, 'media', 'voice', lid + '.m4a')   # older single-language layout
    if not os.path.exists(p): raise SystemExit(f'missing voice {p} (run scripts/voice.py first)')
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-ac', '1', '-ar', '16000', '-f', 's16le', '-'], capture_output=True).stdout
    x = np.frombuffer(raw, np.int16).astype(np.float32) / 32768
    n = 800; r = np.sqrt([np.mean(x[i:i + n] ** 2) for i in range(0, max(1, len(x) - n), n)])
    gate = r > 0.01; v = np.clip(r / (np.percentile(r[gate], 95) if gate.any() else 1), 0, 1) * gate
    return np.repeat(v, 1)[: max(1, int(len(x) / 16000 * FPS))]   # 50 ms frames = 20 Hz


def w(az):
    s = math.sin(math.radians(az)); return max(0, 1 - 1.2 * max(0, s)), max(0, 1 - 1.2 * max(0, -s))   # (left, right), never negative


# --- build the timeline: list of (t0, kind, payload)
T = 0.0; tl = []
def add_line(lid, pos):
    global T
    v = loud(lid); tl.append((T, 'voice', (lid, pos, v))); T += len(v) / FPS + 0.35
def add_ev(name, extra=0.0):
    global T
    if name not in EV: raise SystemExit(f'event {name} not in thermal_plan.json')
    tl.append((T, 'event', name)); T += extra
last_who = None; starts = []
for st in SD.STEPS:
    starts.append((st['id'], T))
    if PLAN.get('step_start', {}).get(st['id']): add_ev(PLAN['step_start'][st['id']])
    for b in st['beats']:
        if isinstance(b, dict):
            T += 2.5   # the viewer answers (auto)
            if b['type'] == 'hold':
                if b.get('event'): add_ev(b['event'], b.get('secs', 4))
                else: T += b.get('secs', 4)
            opts = b.get('options') or []
            if opts:
                o = opts[-1] if ALT else opts[0]
                for lid in o['then']:
                    add_line(lid, o.get('ear') or o.get('pos') or st.get('pos', 'front'))
        elif b[0] == 'window':
            add_line(b[2], st.get('pos', 'near')); T += 4.0
            add_line(f"b{b[1].lower()}_silence", st.get('pos', 'near'))
        elif b[0].startswith('@'): add_ev(b[0], EV.get(b[0], {}).get('secs', 0.6))   # 'secs' = a silent moment the event needs
        else: add_line(b[0], b[1])
DUR = T + 3.0; N = int(DUR * FPS)

# --- render
amb = {}; pulses = []; target = np.zeros((N, 4))   # LC LH RC RH
def put(i, kind, az, lev):
    l, r = w(az); c = 0 if kind == 'cool' else 1
    target[i, c] += lev * l; target[i, 2 + c] += lev * r
events_at = {}
for t0, k, p in tl:
    events_at.setdefault(int(t0 * FPS), []).append((k, p))
voices = []
pending = []
for i in range(N):
    t = i / FPS
    for k, p in events_at.get(i, []):
        if k == 'voice': voices.append((i, p))
        else:
            e = EV[p]
            for nm, (kind, az, lev) in e.get('set', {}).items():
                if lev <= 0: amb.pop(nm, None)
                else: amb[nm] = (kind, az, lev)
            if 'pulse' in e: kind, az, lev, rise, hold, fade = e['pulse']; pulses.append(('pulse', t, kind, az, lev, rise, hold, fade))
            if 'sweep' in e: kind, a0, a1, secs, lev = e['sweep']; pulses.append(('sweep', t, kind, a0, a1, secs, lev))
            if 'then' in e: pending.append((t + e['then']['after'], e['then']['set']))
    for tp, s in [x for x in pending if x[0] <= t]:
        for nm, (kind, az, lev) in s.items():
            if lev <= 0: amb.pop(nm, None)
            else: amb[nm] = (kind, az, lev)
        pending.remove((tp, s))
    for kind, az, lev in amb.values(): put(i, kind, az, lev)
    for pz in pulses:
        if pz[0] == 'pulse':
            _, t0, kind, az, lev, rise, hold, fade = pz; dt = t - t0
            if 0 <= dt < rise + hold + fade:
                f = dt / rise if dt < rise else (1 if dt < rise + hold else 1 - (dt - rise - hold) / fade)
                put(i, kind, az, lev * f)
        else:
            _, t0, kind, a0, a1, secs, lev = pz; dt = t - t0
            if 0 <= dt <= secs: put(i, kind, a0 + (a1 - a0) * dt / secs, lev * min(1, dt / .3, (secs - dt) / .3 + .0001))
    for i0, (lid, pos, v) in voices:
        j = i - i0
        if 0 <= j < len(v):
            lev = (0.1 + 0.8 * v[j]) * VO['distance'][pos] * (VO['front_split'] if pos in ('front', 'near') else 1)
            put(i, 'warm', VO['az'][pos], lev)
target[:, [1, 3]] = np.minimum(target[:, [1, 3]], 0.9); target[:, [0, 2]] = np.minimum(target[:, [0, 2]], 1.0)
out = np.zeros_like(target); y = np.zeros(4)
tau = [(SM['cool_rise'], SM['cool_fall']), (SM['warm_rise'], SM['warm_fall'])] * 2
for i in range(N):
    for c in range(4):
        up, dn = tau[c]; tc = up if target[i, c] > y[c] else dn
        y[c] += (target[i, c] - y[c]) * min(1, (1 / FPS) / tc)
    out[i] = y
# --- write
csv = os.path.join(D, 'project', 'thermal_preview' + ('_alt' if ALT else '') + ('' if VLANG == 'ja' else '_' + VLANG) + '.csv')
with open(csv, 'w') as f:
    f.write('t,LC,LH,RC,RH,dual,legacy\n')
    for i in range(N):
        lc, lh, rc, rh = out[i]
        leg = lambda c, h, s: f'{s}C{round(c * 100)}' if c > h else f'{s}H{round(h * 100)}'
        f.write(f'{i / FPS:.2f},{lc:.3f},{lh:.3f},{rc:.3f},{rh:.3f},DUAL LC{round(lc * 100)} LH{round(lh * 100)} RC{round(rc * 100)} RH{round(rh * 100)},{leg(lc, lh, "L")} {leg(rc, rh, "R")}\n')
# --- checks
LC, LH, RC, RH = out.T
res = {}
def fast(c, h):
    warm_only = (h > .25) & (c < .1); cool_only = (c > .25) & (h < .1)
    wi = np.where(warm_only)[0]; ci = np.where(cool_only)[0]
    best = None
    for a in wi:
        later = ci[(ci > a) & (ci <= a + 3 * FPS)]
        if len(later): d = (later[0] - a) / FPS; best = d if best is None or d < best else best
    for a in ci:
        later = wi[(wi > a) & (wi <= a + 3 * FPS)]
        if len(later): d = (later[0] - a) / FPS; best = d if best is None or d < best else best
    return best
fl, fr = fast(LC, LH), fast(RC, RH)
res['fast_switch'] = (fl is not None or fr is not None, f'left {fl} s / right {fr} s')
pk = out.max(0); res['peak'] = (pk.max() >= .85, f'max LC {pk[0]:.2f} LH {pk[1]:.2f} RC {pk[2]:.2f} RH {pk[3]:.2f}')
dc, dh = np.abs(LC - RC).max(), np.abs(LH - RH).max(); res['direction'] = (max(dc, dh) >= .3, f'max |L−R| cool {dc:.2f} warm {dh:.2f}')
dl = ((LC >= .2) & (LH >= .2)).sum() / FPS; dr = ((RC >= .2) & (RH >= .2)).sum() / FPS
res['dual'] = (dl + dr > 0.5, f'same-ear cool+warm ≥ 0.2: left {dl:.1f} s, right {dr:.1f} s')
print(f'{os.path.relpath(csv)}: {DUR:.1f} s, {len([x for x in tl if x[1] == "voice"])} lines' + (' (alt path)' if ALT else ''))
print('  steps: ' + ' · '.join(f'{k} {t0:.0f}s' for k, t0 in starts))
for k, (ok, why) in res.items(): print(f'  {"PASS" if ok else "FAIL"}  {k:12s} {why}')
print('  legacy one-mode-per-ear commands: 0 same-ear conflicts (dominant mode per ear)')
if '--plot' in sys.argv:
    try:
        import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
        tt = np.arange(N) / FPS; fig, ax = plt.subplots(2, 1, figsize=(16, 5), sharex=True)
        for a, (c, h, nm) in zip(ax, [(LC, LH, 'left'), (RC, RH, 'right')]):
            a.fill_between(tt, 0, h, color='#e8743b', alpha=.7, label='warm'); a.fill_between(tt, 0, -c, color='#4a90d9', alpha=.7, label='cool')
            a.set_ylim(-1, 1); a.set_ylabel(nm); a.axhline(0, color='k', lw=.5)
        for t0, k, p in tl:
            if k == 'event': ax[0].annotate(p, (t0, .95), fontsize=6, rotation=90, va='top')
        ax[1].set_xlabel('s'); fig.tight_layout(); fig.savefig(csv.replace('.csv', '.png'), dpi=110)
    except ImportError: print('  (no matplotlib: --plot skipped)')
sys.exit(0 if all(ok for ok, _ in res.values()) else 1)
