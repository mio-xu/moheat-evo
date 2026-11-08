"""Demo 4 thermal control: ambience stems → thermal/thermal_4ch.csv (3000 rows, 0–149.95 s, 20 Hz)

  python3 scripts/thermal.py          (after build_audio.py)

COOL  ← power of winter_wind, snow, ice_cracking, tropical_rain, water_drops (each its own dry stem, summed per ear)
HEAT  ← RMS of summer_breeze, fire_crackling, lava, steam, spring_breeze
        + designed envelopes for silent visuals (sunlight through the right window, melting frost on the left);
          these are marked as designed in the config, never presented as audio-derived.
NEVER ← train_wheels, train_interior, background_music, ocean_waves, thunder, birds
Left/right ← the SAME azimuth keyframes that place each sound in the binaural mix (seasons.py), via Demo 2's
sharp ear split.  Then Demo 1's controller: device lead, one-mode-per-ear arbitration, dose limit, PWM.
The silence gap (110–114 s) is forced to exactly zero on all four channels.
"""
import csv, importlib.util, json, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import seasons as S
from demo1 import load, load_path, D2_TOOLS

T1 = load("thermal")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.dirname(ROOT)


def _load_path(name, path):
    spec = importlib.util.spec_from_file_location(name, path); m = importlib.util.module_from_spec(spec)
    sys.modules[name] = m; spec.loader.exec_module(m); return m


T2 = load_path("demo2_thermal", os.path.join(D2_TOOLS, "thermal.py"))

CFG = dict(T1.CFG)
CFG.update(dict(
    RATE=S.RATE, N_SAMPLES=int(S.DURATION * S.RATE),
    REF_PCT=99.5, SPAN_DB=30, CURVE=1.5, PEAK=.95, HOLD=.12, ATTACK=.08, RELEASE=.50,   # ambience, but quick enough for 2–3 s gusts
    SIDE_EXP_FAR=2.5, SIDE_EXP_NEAR=4.0,
    DOSE_WIN=8.0, DOSE_MAX=.85, CAP=1.0,
    SILENCE=list(S.SILENCE),
))


def features(times):
    F = {}
    for name in S.ORDER:
        sr, x = T1.read_mono(os.path.join(ROOT, "audio", "source_stems", f"{name}.wav"))
        lv, dbs, ref = T1.level(x, sr, times, CFG)
        F[name] = dict(level=lv, db=dbs, ref=ref)
    return F


def run():
    rate = CFG["RATE"]; times = np.arange(CFG["N_SAMPLES"]) / rate
    F = features(times)
    # Per ear and per mode, the POWER of the driving stems is summed (each weighted and split by its own azimuth), then
    # turned into a drive once: a gust is felt as a gust, a loud scene is stronger than a quiet one, and several sources
    # in one scene no longer flatten each other (summing already-normalised levels saturated at a constant ~0.8).
    power = {k: np.full(len(times), 1e-12) for k in ("coolL", "coolR", "heatL", "heatR")}
    contrib = {}
    for name, s in S.SOURCES.items():
        if s["role"] == "none": continue
        az = S.azimuth(name, times)
        wl, wr = T2.ear_weights(az, np.full(len(times), s["d"]), CFG)
        ms = 10 ** (F[name]["db"] / 10) * s["w"]
        power[s["role"] + "L"] += ms * wl; power[s["role"] + "R"] += ms * wr
        v = F[name]["level"] * s["w"]; contrib[name] = (v * wl, v * wr)          # plot only
    drive = {}
    for role in ("cool", "heat"):
        dbL, dbR = (10 * np.log10(power[role + sd]) for sd in "LR")
        both = np.concatenate([dbL, dbR]); act = both[both > -90]
        ref = np.percentile(act, CFG["REF_PCT"]); gate = ref - CFG["SPAN_DB"]
        for sd, d in (("L", dbL), ("R", dbR)):
            u = np.clip((d - gate) / (ref - gate), 0, 1) ** CFG["CURVE"]
            hold = int(CFG["HOLD"] * rate)
            held = np.array([u[max(0, i - hold): i + 1].max() for i in range(len(u))])
            drive[role + sd] = T1.one_pole(held, rate, CFG["ATTACK"], CFG["RELEASE"]) * CFG["PEAK"]
        print(f"{role}: reference {ref:.1f} dB, gate {gate:.1f} dB")
    for k_ in drive:                                                     # v2 world rule: the season comes in only through OPEN rune panels
        drive[k_] = drive[k_] * S.rune_open(k_[-1], times)
    for name, dsg in S.DESIGNED.items():
        v = T1.one_pole(S.designed(name, times), rate, .3, .6)
        contrib[name] = (v, np.zeros_like(v)) if dsg["side"] == "L" else (np.zeros_like(v), v)
        k_ = dsg["role"] + dsg["side"]; drive[k_] = 1 - (1 - drive[k_]) * (1 - v)       # soft union with the audio drive
    intent = {k_: np.clip(v, 0, 1) for k_, v in drive.items()}

    cap = lambda v: np.minimum(v, 1.0) * CFG["CAP"]
    cL, cR = (cap(T1.lead(intent[k], CFG["COOL_LEAD"], rate)) for k in ("coolL", "coolR"))
    hL, hR = (cap(T1.lead(intent[k], CFG["HEAT_LEAD"], rate)) for k in ("heatL", "heatR"))
    Lc, Lh, Rc, Rh = cL, hL, cR, hR                                      # v2: DUAL firmware — cool and warm independent on one ear, no arbitration
    Lc, Lh, Rc, Rh = (T1.dose_limit(v, CFG) for v in (Lc, Lh, Rc, Rh))
    gate = ~((times >= S.SILENCE[0]) & (times < S.SILENCE[1]))
    for v in (Lc, Lh, Rc, Rh):
        v *= gate
        v[-int(rate):] *= np.linspace(1, 0, int(rate)); v[-2:] = 0           # always ends at zero

    os.makedirs(os.path.join(ROOT, "thermal"), exist_ok=True); os.makedirs(os.path.join(ROOT, "analysis"), exist_ok=True)
    write_csv(os.path.join(ROOT, "thermal", "thermal_4ch.csv"), times, Lc, Rc, Lh, Rh)
    with open(os.path.join(ROOT, "analysis", "audio_features.csv"), "w", newline="") as f:
        w = csv.writer(f)
        cols = [f"{n}_rms_db" for n in S.ORDER] + [f"{n}_level" for n in S.ORDER] + [f"{n}_az" for n in S.ORDER if S.SOURCES[n]["az"]] + \
               [f"{n}_design" for n in S.DESIGNED] + ["intent_coolL", "intent_coolR", "intent_heatL", "intent_heatR", "segment"]
        w.writerow(["time_s"] + cols)
        for i, t in enumerate(times):
            w.writerow([f"{t:.2f}"] + [f"{F[n]['db'][i]:.1f}" for n in S.ORDER] + [f"{F[n]['level'][i]:.3f}" for n in S.ORDER] +
                       [f"{S.azimuth(n, t):.0f}" for n in S.ORDER if S.SOURCES[n]["az"]] + [f"{S.designed(n, t):.3f}" for n in S.DESIGNED] +
                       [f"{intent[k][i]:.3f}" for k in ("coolL", "coolR", "heatL", "heatR")] + [S.segment_at(t)[2]])
    config = dict(
        description="Demo 4 thermal mapping. Strength = RMS of each ambience source's own dry stem; L/R = the source's azimuth in the binaural mix.",
        controller={k: v for k, v in CFG.items()},
        sources={n: dict(role=s["role"], weight=s["w"], azimuth_keyframes=s["az"], distance_m=s["d"],
                         drives_thermal=s["role"] != "none", reference_dbfs=round(float(F[n]["ref"]), 1)) for n, s in S.SOURCES.items()},
        designed_envelopes={n: dict(role=d["role"], side=d["side"], keyframes=d["keys"], audio_derived=False, why=d["why"]) for n, d in S.DESIGNED.items()},
        excluded_from_thermal=[n for n, s in S.SOURCES.items() if s["role"] == "none"],
        silence_zero_window_s=list(S.SILENCE),
        csv=dict(rate_hz=rate, rows=len(times), first=0.0, last=round(float(times[-1]), 2),
                 columns=["time_s", "L_cool", "R_cool", "L_heat", "R_heat", "L_cool_pwm", "R_cool_pwm", "L_heat_pwm", "R_heat_pwm", "command"]),
    )
    for p in (os.path.join(ROOT, "thermal", "thermal_mapping_config.json"), os.path.join(ROOT, "project", "thermal_mapping_config.json")):
        json.dump(config, open(p, "w"), indent=1, ensure_ascii=False)
    plot(times, Lc, Rc, Lh, Rh, contrib)
    same = int(np.sum((Lc > 0) & (Lh > 0)) + np.sum((Rc > 0) & (Rh > 0)))
    print(f"rows {len(times)} ({times[0]:.2f}–{times[-1]:.2f} s) | same-ear cool + warm together (DUAL) {same / rate:.1f} s")
    for n, v in (("L_cool", Lc), ("R_cool", Rc), ("L_heat", Lh), ("R_heat", Rh)):
        print(f"  {n}: max {v.max():.2f}  active {np.sum(v > 0) / rate:5.1f} s")
    return times, (Lc, Rc, Lh, Rh), intent, F


def write_csv(path, times, Lc, Rc, Lh, Rh):
    off = CFG["OFF_BELOW"]
    pLc, pRc = T1.to_pwm(Lc, CFG["COOL_PWM"], off), T1.to_pwm(Rc, CFG["COOL_PWM"], off)
    pLh, pRh = T1.to_pwm(Lh, CFG["HEAT_PWM"], off), T1.to_pwm(Rh, CFG["HEAT_PWM"], off)
    with open(path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["time_s", "L_cool", "R_cool", "L_heat", "R_heat", "L_cool_pwm", "R_cool_pwm", "L_heat_pwm", "R_heat_pwm", "command"])
        for i, t in enumerate(times):
            cmd = "stop" if not (pLc[i] or pLh[i] or pRc[i] or pRh[i]) else f"DUAL LC{pLc[i]} LH{pLh[i]} RC{pRc[i]} RH{pRh[i]}"
            w.writerow([f"{t:.2f}", f"{Lc[i]:.3f}", f"{Rc[i]:.3f}", f"{Lh[i]:.3f}", f"{Rh[i]:.3f}", pLc[i], pRc[i], pLh[i], pRh[i], cmd])


SEG_COL = {"winter": "#dbeafe", "summer": "#fef3c7", "storm": "#e0e7ff", "tunnel": "#fde2e4", "chaos": "#ede9fe", "spring": "#fce7f3"}


def plot(times, Lc, Rc, Lh, Rh, contrib):
    import matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt
    fig, ax = plt.subplots(3, 1, figsize=(16, 10), sharex=True, gridspec_kw=dict(height_ratios=[1.3, 1, 1]))
    for a in ax:
        for t0, t1, sid, *_ in S.SEGMENTS: a.axvspan(t0, t1, color=SEG_COL[sid], lw=0)
        a.axvspan(*S.SILENCE, color="#111827", alpha=.15, lw=0)
    for t0, t1, sid, ja, en, *_ in S.SEGMENTS: ax[0].text((t0 + t1) / 2, 1.04, en, ha="center", fontsize=9)
    cm = plt.get_cmap("tab20")
    for i, (n, (l, r)) in enumerate(contrib.items()):
        ls = "--" if n in S.DESIGNED else "-"
        ax[0].plot(times, l + r, ls, lw=1.1, color=cm(i), label=n + (" (designed)" if n in S.DESIGNED else ""))
    ax[0].set_ylabel("source drive (L+R)"); ax[0].legend(ncol=4, fontsize=7, loc="upper left"); ax[0].set_ylim(0, 1.15)
    ax[1].fill_between(times, Lc, color="#3b82f6", alpha=.8, label="L cool"); ax[1].fill_between(times, -Lh, color="#ef4444", alpha=.8, label="L heat")
    ax[2].fill_between(times, Rc, color="#3b82f6", alpha=.8, label="R cool"); ax[2].fill_between(times, -Rh, color="#ef4444", alpha=.8, label="R heat")
    for a, s in ((ax[1], "LEFT ear"), (ax[2], "RIGHT ear")):
        a.set_ylim(-1.05, 1.05); a.axhline(0, color="k", lw=.5); a.set_ylabel(f"{s}\ncool ↑  heat ↓"); a.legend(fontsize=8, loc="upper right")
    ax[2].set_xlabel("time (s)"); ax[2].set_xlim(0, S.DURATION)
    fig.suptitle("The Runaway Seasons Express — thermal energy curves (DUAL: after device lead and dose limit, no arbitration)")
    fig.tight_layout(); fig.savefig(os.path.join(ROOT, "analysis", "thermal_energy_curves.png"), dpi=110)
    fig.savefig(os.path.join(ROOT, "thermal", "thermal_energy_curves.png"), dpi=110)


if __name__ == "__main__":
    run()
