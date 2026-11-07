"""Demo 5 audio: 16 procedurally synthesised ambience stems → binaural 48 kHz mix.

  python3 scripts/build_audio.py

Writes
  audio/source_stems/<name>.wav       dry mono stems with their gain envelope (24-bit, 48 kHz) — the ONLY input of thermal.py
  audio/spatialized/<name>_binaural.wav   each stem through Demo 1's spherical-head HRTF renderer (position from seasons.py)
  audio/final/final_binaural_150s.wav  final binaural mix (48 kHz / 24-bit stereo)
  audio/final/mix.m4a                  web copy for the player
No recordings, no third-party samples: every sound is generated here (seeded → reproducible).
"""
import os, subprocess, sys
import numpy as np
from scipy import signal

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import seasons as S
from demo1 import load

B = load("build_audio")                 # Demo 1 helpers + HRTF renderer (read-only import)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DRY, SPA, FIN = (os.path.join(ROOT, "audio", d) for d in ("source_stems", "spatialized", "final"))
SR, N = S.SR, int(S.DURATION * S.SR)
t_all = np.arange(N) / SR
rng = np.random.default_rng(55)


# ------------------------------------------------------------------ helpers
def bp(x, lo, hi, o=2): return B.filt(B.sos_bp(lo, hi, o), x)
def lp(x, f, o=2): return B.filt(B.sos_lp(f, o), x)
def hp(x, f, o=2): return B.filt(B.sos_hp(f, o), x)
def white(n=N): return rng.standard_normal(n)


def pink(n=N):
    b = [0.049922035, -0.095993537, 0.050612699, -0.004408786]; a = [1, -2.494956002, 2.017265875, -0.522189400]
    return signal.lfilter(b, a, white(n)) * 8


def brown(n=N):
    return signal.lfilter([1], [1, -.997], white(n)) * .06


def slow_rand(hz, n=N, lo=0.0, hi=1.0):
    """smooth random control signal (low-passed noise) scaled to lo..hi"""
    k = max(2, int(S.DURATION * hz * 4))
    pts = rng.uniform(lo, hi, k)
    from scipy.interpolate import CubicSpline
    return np.clip(CubicSpline(np.linspace(0, S.DURATION, k), pts)(t_all[:n]), lo, hi)


def poisson(rate_fn, t0=0, t1=S.DURATION):
    out, t = [], t0
    while t < t1:
        r = max(rate_fn(t), 1e-3); t += rng.exponential(1 / r)
        if t < t1 and rate_fn(t) > .01: out.append(t)
    return out


def decay(n, tau): return np.exp(-np.arange(n) / (tau * SR))


def tone(f0, f1, dur, tau, harm=((1, 1),)):
    n = int(dur * SR); f = np.geomspace(f0, f1, n); ph = 2 * np.pi * np.cumsum(f) / SR
    return sum(a * np.sin(k * ph) for k, a in harm) * decay(n, tau) * B.adsr(n, .002, .01)


def ev_env(name): return S.env(name, t_all)


MIX_OFFSET = -12.0                       # all SOURCES[*]["mix"] levels are shifted by this (headroom for the binaural sum)


def level_to(x, target_db):
    """normalise by the RMS of the frames where the source is actually sounding (sparse events stay sane),
    then make sure the stem itself never clips (24-bit WAV)."""
    f = len(x) // 960; e = np.sqrt(np.mean(x[: f * 960].reshape(f, 960) ** 2, axis=1))
    act = np.sort(e[e > e.max() * 10 ** (-40 / 20)])[::-1]
    ref = np.sqrt(np.mean(act[: max(1, int(len(act) * .6))] ** 2)) + 1e-12
    y = x * (B.db(target_db + MIX_OFFSET) / ref)
    pk = np.abs(y).max()
    return y * min(1.0, B.db(-3) / pk) if pk > 0 else y


# ------------------------------------------------------------------ the 16 sources
def winter_wind():
    base = brown() * .4 + pink() * .15
    gust = slow_rand(.35, lo=.25, hi=1.0)
    x = bp(base, 250, 900) * gust + bp(base, 700, 1800) * gust ** 2 * .7
    for f0, q in ((780, 25), (1180, 30)):
        b, a = signal.iirpeak(f0, q, SR)
        x += signal.lfilter(b, a, white()) * gust ** 3 * .25           # whistle in the window frame
    return x


def snow():
    x = hp(pink(), 3500) * .15
    for t in poisson(lambda t: 7):
        n = int(rng.uniform(.03, .08) * SR)
        B.place(x, t, lp(white(n), 1800) * B.adsr(n, .01, .03) * rng.uniform(.2, .6))   # soft powder slides
    return x


def ice_crack_event(scale=1.0):
    n = int(.45 * SR); y = np.zeros(n)
    for k in range(rng.integers(3, 7)):                                  # click train
        i = int(rng.uniform(0, .12) * SR); m = int(rng.uniform(.001, .004) * SR)
        y[i:i + m] += white(m) * rng.uniform(.5, 1)
    for _ in range(3):                                                    # glassy ringing chirps
        f = rng.uniform(2200, 6500)
        r = tone(f, f * .8, .35, rng.uniform(.03, .12)) * rng.uniform(.2, .5)
        j = int(rng.uniform(0, .1) * SR); y[j:j + len(r)] += r[: n - j]
    y += lp(white(n), 500) * decay(n, .08) * .5                            # low creak
    return y * scale


def ice_cracking():
    x = np.zeros(N)
    rate = lambda t: 1.2 if t < S.tw(20) else 3.0 if t < S.tw(100) else 4.0
    for t in poisson(rate):
        B.place(x, t, ice_crack_event(rng.uniform(.5, 1.0)))
    return x


def summer_breeze():
    gust = slow_rand(.25, lo=.35, hi=1.0)
    x = bp(pink(), 200, 1300) * gust * .8
    rustle = hp(white(), 3000) * np.clip(lp(np.abs(white()), 18) * 6, 0, 1) * gust ** 2
    return x + rustle * .35


def ocean_waves():
    period = 7.5
    ph = (t_all / period + .3 * slow_rand(.05)) % 1
    swell = np.sin(np.pi * np.clip(ph / .7, 0, 1)) ** 2
    wash = np.where(ph > .55, np.exp(-(ph - .55) * 9), 0)
    return lp(brown() * 3, 900) * swell + hp(pink(), 1500) * wash * .6


def tropical_rain():
    x = bp(pink(), 700, 9000) * .7
    for t in poisson(lambda t: 260):
        B.place(x, t, tone(rng.uniform(2500, 6000), 2000, .006, .002) * rng.uniform(.1, .5))
    return x


def water_drops():
    x = np.zeros(N)
    for t in poisson(lambda t: 4.0):
        f = rng.uniform(700, 1300)
        B.place(x, t, tone(f, f * 2.1, .06, .025, ((1, 1), (2, .15))) * rng.uniform(.4, 1))
    return x


def thunder():
    x = np.zeros(N)
    for t, _, g in S.SOURCES["thunder"]["events"]:
        n = int(5 * SR)
        crack = hp(white(int(.08 * SR)), 800) * decay(int(.08 * SR), .02)
        bumps = 1 + np.interp(np.arange(n), np.linspace(0, n, 12), rng.uniform(0, 1.2, 12))
        rumble = lp(brown(n) * 6, 180, 4) * decay(n, 1.4) * bumps * B.adsr(n, .15, .5)
        y = rumble; y[: len(crack)] += crack * 1.5
        B.place(x, t, y * g)
    return x


def fire_crackling():
    x = lp(brown() * 2, 350) * .5 + bp(white(), 2000, 6000) * .04
    for t in poisson(lambda t: 14):
        m = int(rng.uniform(.002, .009) * SR)
        B.place(x, t, bp(white(m + 64), 900, 5000)[:m] * rng.uniform(.3, 1) ** 2 * 2.2)
    for t in poisson(lambda t: 1.2):                                        # bigger pops
        m = int(.03 * SR)
        B.place(x, t, bp(white(m), 300, 3000) * decay(m, .006) * 3)
    return x


def lava():
    x = lp(brown() * 3, 140, 4) * .9
    for t in poisson(lambda t: 3.5):
        d = rng.uniform(.08, .16); f = rng.uniform(70, 120)
        B.place(x, t, tone(f, f * rng.uniform(2.5, 4), d, d / 2.5, ((1, 1), (2, .3))) * rng.uniform(.6, 1.2))
        m = int(.012 * SR)                                                   # the bubble's skin pops
        B.place(x, t + d * .8, bp(white(m), 1200, 6000) * decay(m, .003) * rng.uniform(.3, .7))
    x += bp(white(), 1800, 6500) * slow_rand(1.5, lo=.02, hi=.12)            # sizzle where lava meets air
    return x


def steam():
    x = np.zeros(N)
    for t, _, g in S.SOURCES["steam"]["events"]:
        n = int(1.6 * SR)
        e = np.minimum(np.arange(n) / (.06 * SR), 1) * decay(n, .55)
        B.place(x, t, (hp(white(n), 2000) * .8 + bp(white(n), 500, 2000) * .3) * e * g)
    return x


def spring_breeze():
    gust = slow_rand(.2, lo=.4, hi=1.0)
    return bp(pink(), 300, 1100) * gust * .7 + hp(white(), 4000) * gust ** 3 * .05


def birds():
    x = np.zeros(N)
    t = 127.5
    while t < 146:
        f = rng.uniform(3000, 4600)
        for k in range(rng.integers(3, 7)):
            d = rng.uniform(.05, .11)
            B.place(x, t, tone(f * rng.uniform(.9, 1.1), f * rng.uniform(1.15, 1.5), d, d / 2) * .8)
            t += d + rng.uniform(.03, .08)
        t += rng.uniform(.8, 2.2)
    return x


SPEED_END = (139.0, 146.0)          # the train brakes into the spring station


def speed(t):
    t = np.asarray(t, float)
    a, b = SPEED_END
    return np.clip((b - t) / (b - a), 0, 1) ** 1.3 * (1 + .25 * ((t > S.tw(95)) & (t < S.tw(125))) + .2 * (t < S.tw(20)))   # faster in winter and the chaos


def train_wheels():
    x = np.zeros(N)
    # rail joints: clack-clack pair every ~1.05 s at full speed
    t, phase = 0.0, 0.0
    while t < S.DURATION:
        sp = float(speed(t))
        if sp < .03: break
        for dt in (0, .11):
            n = int(.12 * SR)
            thump = lp(white(n), 160) * decay(n, .03) * 3 + bp(white(n), 1800, 4000) * decay(n, .004) * .6
            B.place(x, t + dt / max(sp, .3), thump * (.5 + .5 * sp))
        t += 1.05 / max(sp, .15)
    roll = bp(pink(), 120, 700) * .25 * speed(t_all)
    b, a = signal.iirpeak(2400, 40, SR)                                      # brake squeal
    sq = signal.lfilter(b, a, white()) * np.clip((t_all - 141.5) / .5, 0, 1) * np.clip((146 - t_all) / 1.5, 0, 1) * .3
    return x + roll + sq


def train_interior():
    hum = lp(brown() * 3, 110, 4) + .08 * np.sin(2 * np.pi * 55 * t_all) * (.6 + .4 * speed(t_all))
    rattle = np.zeros(N)
    for t in poisson(lambda t: 1.5 * float(speed(t)) + .05):
        m = int(.02 * SR); B.place(rattle, t, bp(white(m), 1500, 5000) * decay(m, .004) * .4)
    return hum * (.4 + .6 * speed(t_all)) + rattle


NOTE = lambda m: 440 * 2 ** ((m - 69) / 12)
MUSIC = [  # t0, t1, bpm, chord progression (MIDI chords), notes per beat
    (0, 20, 96, [[57, 60, 64, 69], [53, 57, 60, 65], [55, 59, 62, 67], [52, 57, 60, 64]], 2),         # winter: A minor, celesta (brisk opening)
    (20, 45, 100, [[50, 54, 57, 62], [55, 59, 62, 67], [47, 50, 54, 59], [57, 61, 64, 69]], 2),        # summer: D major
    (45, 70, 84, [[50, 53, 57, 62], [46, 50, 53, 58], [48, 52, 55, 60], [45, 49, 52, 57]], 1),          # storm: D minor
    (70, 95, 70, [[48, 52, 56, 60], [50, 54, 58, 62], [46, 50, 54, 58], [52, 56, 60, 64]], 1),          # tunnel: whole-tone
    (95, 125, 138, [[57, 60, 64, 69], [50, 54, 57, 62], [52, 56, 59, 64], [53, 57, 60, 65]], 2),        # chaos: fast arps
    (125, 150, 72, [[53, 57, 60, 65], [58, 62, 65, 70], [48, 52, 55, 60], [53, 57, 60, 65]], 1),        # spring: F major
]


def background_music():
    x = np.zeros(N)
    for t0, t1, bpm, prog, sub in MUSIC:
        t0, t1 = S.tw(t0), S.tw(t1)
        beat = 60 / bpm; bar = beat * 4; k = 0
        t = t0
        while t < min(t1, 146.5):
            ch = prog[int((t - t0) // bar) % len(prog)]
            step = beat / sub
            m = ch[(k * (3 if sub == 2 else 1) + (k // 4)) % 4] + 12 * (1 + (k % 8 == 7))
            g = .55 if k % 4 == 0 else .38
            B.place(x, t, tone(NOTE(m), NOTE(m), 1.6, .45, ((1, 1), (2, .28), (3.01, .1), (5.4, .03))) * g)   # music box
            if k % (4 * sub) == 0:
                n = int(bar * SR)
                pad = sum(np.sin(2 * np.pi * NOTE(c - 12) * np.arange(n) / SR) for c in ch[:3]) * B.adsr(n, .6, .8) * .07
                B.place(x, t, pad)
            t += step; k += 1
    # last chord rings out at the station
    for i, c in enumerate([65, 69, 72, 77]):
        B.place(x, 145.0 + i * .12, tone(NOTE(c), NOTE(c), 3.5, 1.2, ((1, 1), (2, .25))) * .4)
    return x


SYNTH = {n: globals()[n] for n in S.ORDER}


# ------------------------------------------------------------------ build
class _Pos:                                             # Demo 1's renderer reads B.S.positions(bt)[who]
    off = 0.0
    @staticmethod
    def positions(bt): return S.positions(np.asarray(bt) + _Pos.off)


def spatialise(name, x):
    s = S.SOURCES[name]
    if name == "background_music":                      # plain stereo, slightly wide (not a physical source)
        d = int(.012 * SR); return np.stack([x, np.concatenate([np.zeros(d), x[:-d]])], 1) * .75
    if s["az"] is None:                                 # train: under / around the listener → two wide copies
        a = B.render(x, az=-95, d=s["d"]); b = B.render(np.roll(x, int(.017 * SR)), az=95, d=s["d"])
        return (a + b) * .5
    nz = np.flatnonzero(np.abs(x) > 1e-7)
    out = np.zeros((N, 2))
    if not len(nz): return out
    a0, a1 = max(0, nz[0] - SR // 10), min(N, nz[-1] + SR)
    B.S = _Pos; _Pos.off = a0 / SR
    out[a0:a1] = B.render(x[a0:a1], who=name)[: a1 - a0]
    return out


def main():
    for d in (DRY, SPA, FIN): os.makedirs(d, exist_ok=True)
    mix = np.zeros((N, 2))
    for name in S.ORDER:
        raw = SYNTH[name]()[:N]
        e = ev_env(name) if "env" in S.SOURCES[name] else S.silence_gate(t_all)
        x = level_to(raw * e, S.SOURCES[name]["mix"])
        B.write_wav(os.path.join(DRY, f"{name}.wav"), x)
        y = spatialise(name, x) * S.silence_gate(t_all)[:, None]
        B.write_wav(os.path.join(SPA, f"{name}_binaural.wav"), y)
        mix += y
        print(f"{name:17s} peak {20 * np.log10(np.abs(x).max() + 1e-9):6.1f} dBFS  binaural peak {20 * np.log10(np.abs(y).max() + 1e-9):6.1f}")
    pk = np.abs(mix).max(); mix *= B.db(-1.0) / pk
    mix *= S.silence_gate(t_all)[:, None]
    mix[-int(.02 * SR):] *= np.linspace(1, 0, int(.02 * SR))[:, None]
    wav = os.path.join(FIN, "final_binaural_150s.wav")
    B.write_wav(wav, mix)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-c:a", "aac", "-b:a", "192k", os.path.join(FIN, "mix.m4a")], check=True)
    print(f"mix: gain {20 * np.log10(B.db(-1) / pk):+.1f} dB → {wav}")


if __name__ == "__main__":
    main()
