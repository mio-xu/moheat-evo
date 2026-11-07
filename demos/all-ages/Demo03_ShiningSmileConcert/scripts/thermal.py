"""Demo 3 music-driven thermal control → thermal/thermal_mode_A.csv, thermal_mode_B.csv (+ media/thermal.csv = Mode B)

  python3 scripts/thermal.py      (after edit_music.py, music_features.py on the edit, build_audio.py)

Heat = 0.65·vocal + 0.25·bass + 0.10·drums          Cool = 0.75·high + 0.25·cooling-FX       (weights in mapping_config.json)
Each feature: noise gate → percentile normalisation (p_lo…p_hi) → curve; then hold / attack / release, contrast
re-normalisation, device lead, per-ear arbitration (firmware: one mode per ear), dose limit, cap, PWM.
Mode A: left/right from the song's own L/R channel energy (vocals sit in the centre → both ears ≈ equal).
Mode B: left/right from the SAME position data that moves Ayane / the ice FX on stage, times the stage-state weights
        (ice stage → cooling, ice & fire → cool on the ice side, heat on the warm side; swap → both swap).
Reuses Demo 1's controller (thermal.py) and Demo 2's sharper ear split.
"""
import csv, importlib.util, json, os, sys
import numpy as np
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.dirname(ROOT)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import concert as C
from demo1 import load
T1 = load("thermal")

def _load_path(name, path):
    spec = importlib.util.spec_from_file_location(name, path); m = importlib.util.module_from_spec(spec)
    sys.modules[name] = m; spec.loader.exec_module(m); return m
T2 = _load_path("demo2_thermal", os.path.join(SITE, "../all-ages/Demo02_FanMeeting", "tools", "thermal.py"))

CFG = dict(T1.CFG)
CFG.update(dict(
    RATE=20, N_SAMPLES=3000,
    HEAT_WEIGHTS=dict(vocal=.65, bass=.25, drums=.10), COOL_WEIGHTS=dict(high=.75, coolfx=.25),
    NORM_PCT=(10, 97), FEATURE_CURVE=1.3, CONTRAST_PCT=(20, 98), CONTRAST_CURVE=1.4,
    ATTACK=.08, RELEASE=.45, HOLD=.10, STAGE_XFADE_S=2.73,
    SIDE_EXP_FAR=2.0, SIDE_EXP_NEAR=3.5, MODE_A_BALANCE_DB=4.0,
    STAGE_WEIGHTS=C.STAGE_WEIGHTS,
    CAP=1.0, DOSE_WIN=8.0, DOSE_MAX=.65,
))


def read_features():
    rows = list(csv.DictReader(open(os.path.join(ROOT, "analysis", "music_features.csv"))))
    F = {k: np.array([float(r[k]) for r in rows]) for k in rows[0]}
    sr, fx = T1.read_mono(os.path.join(ROOT, "audio", "stems", "coolfx_dry.wav"))
    F["coolfx"] = T1.rms_db(fx, sr, F["time_s"], .05)
    return F


def norm(db, cfg):
    lo, hi = np.percentile(db[db > -100], cfg["NORM_PCT"])
    return np.clip((db - lo) / max(hi - lo, 1e-6), 0, 1) ** cfg["FEATURE_CURVE"]


def drive(raw, cfg):
    rate = cfg["RATE"]; hold = int(cfg["HOLD"] * rate)
    held = np.array([raw[max(0, i - hold): i + 1].max() for i in range(len(raw))])
    sm = T1.one_pole(held, rate, cfg["ATTACK"], cfg["RELEASE"])
    lo, hi = np.percentile(sm, cfg["CONTRAST_PCT"])
    return np.clip((sm - lo) / max(hi - lo, 1e-6), 0, 1) ** cfg["CONTRAST_CURVE"]


def stage_weights(times, cfg):
    """per-side heat / cool weights from the stage state, cross-faded over one bar at section changes"""
    wh = np.zeros((len(times), 2)); wc = np.zeros((len(times), 2))
    for i, t in enumerate(times):
        w = cfg["STAGE_WEIGHTS"][C.segment_at(t)[5]]; wh[i] = w["heat"]; wc[i] = w["cool"]
    k = int(cfg["STAGE_XFADE_S"] * cfg["RATE"]); ker = np.ones(k) / k
    sm = lambda a: np.stack([np.convolve(np.pad(a[:, j], (k // 2, k - k // 2 - 1), mode="edge"), ker, "valid") for j in range(2)], 1)
    return sm(wh), sm(wc)


def finish(heatL, heatR, coolL, coolR, cfg):
    rate = cfg["RATE"]; cap = lambda v: np.minimum(v, 1.0) * cfg["CAP"]
    cL, cR = (cap(T1.lead(v, cfg["COOL_LEAD"], rate)) for v in (coolL, coolR))
    hL, hR = (cap(T1.lead(v, cfg["HEAT_LEAD"], rate)) for v in (heatL, heatR))
    Lc, Lh = T1.resolve_ear(cL, hL, cfg); Rc, Rh = T1.resolve_ear(cR, hR, cfg)
    Lc, Lh, Rc, Rh = (T1.dose_limit(v, cfg) for v in (Lc, Lh, Rc, Rh))
    for v in (Lc, Lh, Rc, Rh): v[-int(rate):] *= np.linspace(1, 0, int(rate))
    return Lc, Rc, Lh, Rh


def write_csv(path, times, Lc, Rc, Lh, Rh, cfg):
    off = cfg["OFF_BELOW"]
    pLc, pRc = T1.to_pwm(Lc, cfg["COOL_PWM"], off), T1.to_pwm(Rc, cfg["COOL_PWM"], off)
    pLh, pRh = T1.to_pwm(Lh, cfg["HEAT_PWM"], off), T1.to_pwm(Rh, cfg["HEAT_PWM"], off)
    with open(path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["time_s", "L_cool", "R_cool", "L_heat", "R_heat", "L_cool_pwm", "R_cool_pwm", "L_heat_pwm", "R_heat_pwm", "command"])
        for i, t in enumerate(times):
            cmd = "stop" if not (pLc[i] or pLh[i] or pRc[i] or pRh[i]) else " ".join(
                f"{s}C{c}" if c else f"{s}H{h}" for s, c, h in (("L", pLc[i], pLh[i]), ("R", pRc[i], pRh[i])))
            w.writerow([f"{t:.2f}", f"{Lc[i]:.3f}", f"{Rc[i]:.3f}", f"{Lh[i]:.3f}", f"{Rh[i]:.3f}", pLc[i], pRc[i], pLh[i], pRh[i], cmd])


def run(cfg=CFG):
    F = read_features(); times = F["time_s"]
    assert len(times) == cfg["N_SAMPLES"], len(times)
    n = {k: norm(F[k], cfg) for k in ("vocal", "bass", "drums", "high", "coolfx")}
    heat = drive(sum(w * n[k] for k, w in cfg["HEAT_WEIGHTS"].items()), cfg)
    cool = drive(sum(w * n[k] for k, w in cfg["COOL_WEIGHTS"].items()), cfg)

    # Mode A — the music's own stereo balance only
    bal = np.clip((F["left"] - F["right"]) / cfg["MODE_A_BALANCE_DB"], -1, 1)
    wl, wr = np.clip(1 + np.minimum(bal, 0) * .5, 0, 1), np.clip(1 - np.maximum(bal, 0) * .5, 0, 1)   # nearer side 1, other ≥ .5
    wl, wr = np.clip(1 - np.maximum(-bal, 0) * .5, 0, 1), np.clip(1 - np.maximum(bal, 0) * .5, 0, 1)
    A = finish(heat * wl, heat * wr, cool * wl, cool * wr, cfg)

    # Mode B — music energy for strength, stage positions + stage state for left/right
    pos = C.positions(times)
    hwl, hwr = T2.ear_weights(pos["A"][0], pos["A"][1], cfg)
    cwl, cwr = T2.ear_weights(pos["C"][0], pos["C"][1], cfg)
    in_cue = np.zeros(len(times), bool)
    for c in C.cool_cues(): in_cue |= (times >= c["t"] - .3) & (times <= c["t"] + c["dur"] + .3)
    cwl, cwr = np.where(in_cue, cwl, 1.0), np.where(in_cue, cwr, 1.0)        # no ice FX → cooling from the whole stage
    sh, sc = stage_weights(times, cfg)
    Bm = finish(heat * hwl * sh[:, 0], heat * hwr * sh[:, 1], cool * cwl * sc[:, 0], cool * cwr * sc[:, 1], cfg)

    os.makedirs(os.path.join(ROOT, "thermal"), exist_ok=True)
    write_csv(os.path.join(ROOT, "thermal", "thermal_mode_A.csv"), times, *A, cfg)
    write_csv(os.path.join(ROOT, "thermal", "thermal_mode_B.csv"), times, *Bm, cfg)
    write_csv(os.path.join(ROOT, "media", "thermal.csv"), times, *Bm, cfg)
    with open(os.path.join(ROOT, "thermal", "drive_features.csv"), "w", newline="") as f:
        w = csv.writer(f); w.writerow(["time_s", "vocal_n", "bass_n", "drums_n", "high_n", "coolfx_n", "heat_drive", "cool_drive", "ayane_az", "ayane_d", "ice_az", "stage"])
        for i, t in enumerate(times):
            w.writerow([f"{t:.2f}"] + [f"{n[k][i]:.3f}" for k in ("vocal", "bass", "drums", "high", "coolfx")] +
                       [f"{heat[i]:.3f}", f"{cool[i]:.3f}", f"{pos['A'][0][i]:.1f}", f"{pos['A'][1][i]:.2f}", f"{pos['C'][0][i]:.1f}", C.segment_at(t)[5]])
    cfg_out = {k: v for k, v in cfg.items()}
    for p in (os.path.join(ROOT, "thermal", "mapping_config.json"), os.path.join(ROOT, "project", "mapping_config.json")):
        json.dump(cfg_out, open(p, "w"), indent=1, ensure_ascii=False)
    report(times, A, Bm, heat, n)
    plot(times, A, Bm, heat, cool)


def report(times, A, Bm, heat, n):
    res = {}
    for name, (Lc, Rc, Lh, Rh) in (("A", A), ("B", Bm)):
        act = (Lc + Rc + Lh + Rh) > .1
        cross = T2.segments(((Lc > .25) & (Rh > .25)) | ((Lh > .25) & (Rc > .25)), times, .5)
        res[name] = dict(same_ear=int(np.sum((Lc > 0) & (Lh > 0)) + np.sum((Rc > 0) & (Rh > 0))),
                         mean_LR_contrast=round(float(np.mean(np.abs((Lc + Lh) - (Rc + Rh))[act])), 3),
                         cross_temperature_segments=len(cross), corr_heat_vs_vocal=round(float(np.corrcoef(Lh + Rh, n["vocal"])[0, 1]), 3))
        print(f"Mode {name}: same-ear conflicts {res[name]['same_ear']} | mean |L−R| {res[name]['mean_LR_contrast']} | "
              f"L/R different-temperature segments {len(cross)} | corr(heat, vocal) {res[name]['corr_heat_vs_vocal']}")
    json.dump(res, open(os.path.join(ROOT, "thermal", "thermal_checks.json"), "w"), indent=1)


def plot(times, A, Bm, heat, cool):
    import matplotlib; matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    fig, ax = plt.subplots(5, 1, figsize=(18, 10), sharex=True)
    ax[0].plot(times, heat, color="#e0582a", lw=.8, label="heat drive (vocal/bass/drums)"); ax[0].plot(times, cool, color="#3a8dde", lw=.8, label="cool drive (high/ice FX)")
    ax[0].legend(loc="upper right", fontsize=8)
    for row, (name, (Lc, Rc, Lh, Rh)) in enumerate((("A", A), ("B", Bm))):
        for j, (c, h, side) in enumerate(((Lc, Lh, "L"), (Rc, Rh, "R"))):
            a = ax[1 + row * 2 + j]
            a.fill_between(times, 0, -c, color="#3a8dde", alpha=.85); a.fill_between(times, 0, h, color="#e0582a", alpha=.85)
            a.set_ylim(-1, 1); a.set_ylabel(f"Mode {name} {side}"); a.axhline(0, color="k", lw=.4)
    for s in C.SEGMENTS:
        for a in ax: a.axvline(s[0], color="#888", lw=.6, ls=":")
        ax[0].text(s[0] + .4, 1.02, s[4], fontsize=8)
    ax[-1].set_xlabel("time (s) — cooling below, heating above (lead-compensated)")
    fig.tight_layout(); fig.savefig(os.path.join(ROOT, "thermal", "thermal_overview.png"), dpi=80)


if __name__ == "__main__":
    run()
