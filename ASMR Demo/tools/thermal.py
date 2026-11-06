"""Stage 6 (tuned for high contrast: full-range peaks, near-zero valleys, sharp L/R): sound-driven thermal control → 4-channel CSV for MoHeat Evo.

  python3 tools/thermal.py            (needs output/stems/{K,H}_dry.wav from build_audio.py)

Principle
  temperature TYPE  ← character   (Koyuki = cooling, Homura = heating)
  STRENGTH          ← RMS of that character's own dry stem (voice + breath + magic; ambience never counts)
  LEFT/RIGHT SPLIT  ← her position around the head (azimuth + distance)

Pipeline per character (20 Hz, 50 ms RMS window)
  RMS dB → noise gate → normalise to her own loud passages → non-linear curve (quiet speech
  stays gentle, breaths reach full) → hold + attack/release smoothing (thermal inertia)
  → × proximity(d) → × ear weights(az, d) → four intent channels.

MoHeat Evo constraint (firmware): each ear is EITHER cooling OR heating (writing one clears the other).
Conflict policy when both want the same ear:
  * the stronger request wins; the weaker one subtracts half its value ("they cancel out a bit")
  * polarity can only flip after the current mode has been held ≥ MIN_DWELL and the other side
    exceeds it by HYSTERESIS; every flip passes through DEAD_TIME of zero output
    (protects the skin from abrupt hot↔cold jumps and the element from thermal shock).

Safety
  * global CAP (0–1) on every channel, per-mode calibrated PWM range (cool 35–80, heat 0–200)
  * dose limiter: running 8 s mean of each output channel ≤ DOSE_MAX, otherwise scaled down
  * the players send "stop" on pause/end/E-stop; the CSV itself ends with zeros.

Latency compensation
  The device needs time before the skin feels the change, so each mode is sent EARLIER by its lead
  (COOL_LEAD / HEAT_LEAD).  These are starting values — measure your unit (see production/README).
"""
import csv, json, os, subprocess, sys
import numpy as np
from scipy.io import wavfile

sys.path.insert(0, os.path.dirname(__file__))
import story as S

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT, MEDIA, STEMS = (os.path.join(ROOT, d) for d in ("output", "media", "output/stems"))

CFG = dict(
    RATE=20,            # control updates per second
    WIN=0.050,          # RMS window (s)
    GATE_BELOW_REF=30,  # dB under the character's reference level → silence
    REF_PCT=93,         # percentile of active frames treated as "loud"
    CURVE=2.2,          # y = x^CURVE (expansive)
    HOLD=0.15,          # s, hold peaks between syllables
    ATTACK=0.08,        # s, rise time constant
    RELEASE=0.45,       # s, fall time constant
    PROX_REF=0.30,      # m, distance with full proximity
    PROX_EXP=1.0,
    PROX_MIN=0.08,
    COOL_LEAD=0.35,     # s, send cooling this much earlier
    HEAT_LEAD=0.60,     # s, send heating this much earlier
    CANCEL=0.5,         # weaker same-ear request subtracts this fraction
    HYSTERESIS=0.08,
    MIN_DWELL=0.40,     # s
    DEAD_TIME=0.15,     # s of zero output on every polarity flip
    CAP=1.00,           # global output cap (fraction of calibrated range)
    DOSE_WIN=8.0,       # s
    DOSE_MAX=0.70,      # max running mean per channel
    OFF_BELOW=0.03,     # treat as off
    # calibrated PWM ranges (firmware COLD_PWM_MIN/MAX, HOT_PWM_MIN/MAX); re-measure per unit
    COOL_PWM=(35, 80),
    HEAT_PWM=(0, 200),
)


def read_mono(path):
    tmp = path + ".tmp.wav"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", path, "-c:a", "pcm_f32le", tmp], check=True)
    sr, x = wavfile.read(tmp); os.remove(tmp)
    return sr, x.astype(np.float64)


def rms_db(x, sr, times, win):
    h = int(win * sr / 2)
    c = np.concatenate([[0.0], np.cumsum(x ** 2)])
    i = np.clip((times * sr).astype(int), 0, len(x))
    a, b = np.clip(i - h, 0, len(x)), np.clip(i + h, 0, len(x))
    ms = (c[b] - c[a]) / np.maximum(b - a, 1)
    return 10 * np.log10(ms + 1e-12)


def one_pole(y, rate, attack, release):
    out = np.zeros_like(y); s = 0.0
    ka, kr = 1 - np.exp(-1 / (attack * rate)), 1 - np.exp(-1 / (release * rate))
    for i, v in enumerate(y):
        s += (v - s) * (ka if v > s else kr)
        out[i] = s
    return out


def level(x, sr, times, cfg):
    """Character stem → smoothed drive 0..1."""
    d = rms_db(x, sr, times, cfg["WIN"])
    active = d[d > -70]
    ref = np.percentile(active, cfg["REF_PCT"]) if len(active) else -20
    gate = ref - cfg["GATE_BELOW_REF"]
    u = np.clip((d - gate) / (ref - gate), 0, 1) ** cfg["CURVE"]
    hold = int(cfg["HOLD"] * cfg["RATE"])
    held = np.array([u[max(0, i - hold): i + 1].max() for i in range(len(u))])
    return one_pole(held, cfg["RATE"], cfg["ATTACK"], cfg["RELEASE"]), d, ref


def ear_weights(az_deg, d):
    """Equal-ish split in front/behind, fully one-sided at the ear; sharper when very close."""
    s = np.sin(np.radians(az_deg))
    near = np.clip((0.6 - d) / 0.45, 0, 1)
    p = 1.3 + 1.7 * near
    return ((1 - s) / 2) ** p, ((1 + s) / 2) ** p


def proximity(d, cfg):
    return np.clip((cfg["PROX_REF"] / np.maximum(d, cfg["PROX_REF"])) ** cfg["PROX_EXP"], cfg["PROX_MIN"], 1)


def lead(x, sec, rate):
    k = int(round(sec * rate))
    return np.concatenate([x[k:], np.zeros(k)]) if k > 0 else x


def resolve_ear(cool, heat, cfg):
    """Firmware allows one mode per ear. Returns (cool_out, heat_out)."""
    rate = cfg["RATE"]
    co, ho = np.zeros_like(cool), np.zeros_like(heat)
    mode, since, dead = 0, 0, 0          # mode: -1 cool, +1 heat, 0 off
    dwell, dt = int(cfg["MIN_DWELL"] * rate), max(1, int(cfg["DEAD_TIME"] * rate))
    for i, (c, h) in enumerate(zip(cool, heat)):
        want = 0
        if max(c, h) > cfg["OFF_BELOW"]:
            want = 1 if h > c else -1
            if mode != 0 and want != mode:                       # hysteresis + dwell before flipping
                cur, oth = (h, c) if mode == 1 else (c, h)
                if not (oth > cur + cfg["HYSTERESIS"] and since >= dwell):
                    want = mode
        if mode != 0 and want == -mode:                          # polarity flip → dead time first
            dead, mode, since = dt, want, 0
        elif want != mode:
            mode, since = want, 0
        since += 1
        if dead > 0:
            dead -= 1; continue
        if mode == 1:
            ho[i] = max(0.0, h - cfg["CANCEL"] * c)
        elif mode == -1:
            co[i] = max(0.0, c - cfg["CANCEL"] * h)
    return co, ho


def dose_limit(x, cfg):
    n = int(cfg["DOSE_WIN"] * cfg["RATE"])
    out = x.copy(); acc = 0.0; buf = np.zeros(n)
    for i in range(len(x)):
        acc -= buf[i % n]                       # drop the sample leaving the window
        if (acc + x[i]) / n > cfg["DOSE_MAX"]:
            out[i] = max(0.0, cfg["DOSE_MAX"] * n - acc)
        acc += out[i]; buf[i % n] = out[i]
    return out


def to_pwm(v, rng, off):
    lo, hi = rng
    return np.where(v > off, np.round(lo + v * (hi - lo)), 0).astype(int)


def run(cfg=CFG):
    rate = cfg["RATE"]
    times = np.arange(int(S.DURATION * rate) + 1) / rate
    pos = S.positions(times)
    intent, info = {}, {}
    for who in "KH":
        sr, x = read_mono(os.path.join(STEMS, f"{who}_dry.wav"))
        lv, dbs, ref = level(x, sr, times, cfg)
        az, d = pos[who]
        wl, wr = ear_weights(az, d)
        pr = proximity(d, cfg)
        intent[who] = (lv * pr * wl, lv * pr * wr)
        info[who] = dict(level=lv, db=dbs, az=az, d=d, prox=pr, ref=ref)
        print(f"{who}: reference {ref:.1f} dBFS, gate {ref - cfg['GATE_BELOW_REF']:.1f} dBFS")

    # latency compensation: shift each mode earlier by its own lead, then resolve per ear
    kL, kR = (lead(v, cfg["COOL_LEAD"], rate) for v in intent["K"])
    hL, hR = (lead(v, cfg["HEAT_LEAD"], rate) for v in intent["H"])
    cap = lambda v: np.minimum(v, 1.0) * cfg["CAP"]
    Lc, Lh = resolve_ear(cap(kL), cap(hL), cfg)
    Rc, Rh = resolve_ear(cap(kR), cap(hR), cfg)
    Lc, Lh, Rc, Rh = (dose_limit(v, cfg) for v in (Lc, Lh, Rc, Rh))
    for v in (Lc, Lh, Rc, Rh): v[-int(rate):] *= np.linspace(1, 0, int(rate))   # CSV always ends at zero

    pLc, pRc = to_pwm(Lc, cfg["COOL_PWM"], cfg["OFF_BELOW"]), to_pwm(Rc, cfg["COOL_PWM"], cfg["OFF_BELOW"])
    pLh, pRh = to_pwm(Lh, cfg["HEAT_PWM"], cfg["OFF_BELOW"]), to_pwm(Rh, cfg["HEAT_PWM"], cfg["OFF_BELOW"])

    def cmd(i):
        parts = []
        for side, c, h in (("L", pLc[i], pLh[i]), ("R", pRc[i], pRh[i])):
            parts.append(f"{side}C{c}" if c else f"{side}H{h}")
        return "stop" if not (pLc[i] or pLh[i] or pRc[i] or pRh[i]) else " ".join(parts)

    rows = [["time_s", "L_cool", "R_cool", "L_heat", "R_heat", "L_cool_pwm", "R_cool_pwm", "L_heat_pwm", "R_heat_pwm", "command"]]
    for i, t in enumerate(times):
        rows.append([f"{t:.2f}", f"{Lc[i]:.3f}", f"{Rc[i]:.3f}", f"{Lh[i]:.3f}", f"{Rh[i]:.3f}",
                     pLc[i], pRc[i], pLh[i], pRh[i], cmd(i)])
    for path in (os.path.join(MEDIA, "thermal.csv"), os.path.join(OUT, "thermal_control.csv")):
        with open(path, "w", newline="") as f: csv.writer(f).writerows(rows)

    # analysis copy: before latency shift / conflict resolution
    with open(os.path.join(OUT, "thermal_intent.csv"), "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["time_s", "K_rms_db", "K_level", "K_az", "K_d", "H_rms_db", "H_level", "H_az", "H_d",
                    "K_L", "K_R", "H_L", "H_R"])
        for i, t in enumerate(times):
            k, h = info["K"], info["H"]
            w.writerow([f"{t:.2f}", f"{k['db'][i]:.1f}", f"{k['level'][i]:.3f}", f"{k['az'][i]:.1f}", f"{k['d'][i]:.2f}",
                        f"{h['db'][i]:.1f}", f"{h['level'][i]:.3f}", f"{h['az'][i]:.1f}", f"{h['d'][i]:.2f}",
                        f"{intent['K'][0][i]:.3f}", f"{intent['K'][1][i]:.3f}", f"{intent['H'][0][i]:.3f}", f"{intent['H'][1][i]:.3f}"])
    with open(os.path.join(OUT, "thermal_config.json"), "w") as f: json.dump(cfg, f, indent=1)

    # checks
    both_same_ear = int(np.sum((Lc > 0) & (Lh > 0)) + np.sum((Rc > 0) & (Rh > 0)))
    simult = int(np.sum(((Lc > 0) | (Rc > 0)) & ((Lh > 0) | (Rh > 0))))
    print(f"frames {len(times)} @ {rate} Hz | same-ear cool+heat: {both_same_ear} (must be 0) | "
          f"cool & heat at once (different ears): {simult / rate:.1f} s")
    for n, v in (("L_cool", Lc), ("R_cool", Rc), ("L_heat", Lh), ("R_heat", Rh)):
        print(f"  {n}: max {v.max():.2f}  active {np.sum(v > 0) / rate:5.1f} s  mean(active) {v[v > 0].mean() if (v > 0).any() else 0:.2f}")
    plot(times, Lc, Rc, Lh, Rh, info)
    return times, (Lc, Rc, Lh, Rh)


def plot(times, Lc, Rc, Lh, Rh, info):
    import matplotlib; matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    fig, ax = plt.subplots(3, 1, figsize=(16, 8), sharex=True)
    ax[0].plot(times, info["K"]["level"], color="#3a8dde", label="Koyuki level"); ax[0].plot(times, info["H"]["level"], color="#e0582a", label="Homura level")
    ax[0].legend(loc="upper right"); ax[0].set_ylabel("drive")
    for a, c, h, name in ((ax[1], Lc, Lh, "LEFT"), (ax[2], Rc, Rh, "RIGHT")):
        a.fill_between(times, 0, -c, color="#3a8dde", alpha=.8, label="cool"); a.fill_between(times, 0, h, color="#e0582a", alpha=.8, label="heat")
        a.set_ylim(-1, 1); a.set_ylabel(name); a.axhline(0, color="k", lw=.5)
    for t, n, *_ in S.SCENES:
        for a in ax: a.axvline(t, color="#888", lw=.6, ls=":")
        ax[0].text(t + .5, 1.02, n, fontsize=9)
    ax[2].set_xlabel("time (s) — output already shifted by the device lead")
    fig.tight_layout(); fig.savefig(os.path.join(OUT, "thermal_overview.png"), dpi=90)


if __name__ == "__main__":
    run()
