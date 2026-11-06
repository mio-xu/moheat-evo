"""Demo 2 thermal control: idol voice → HEAT, cooling SFX → COOL, each split left/right by its OWN position.

  python3 tools/thermal.py      (after build_audio.py)

Reuses Demo 1's controller (Demo1_SnowFoxfire/tools/thermal.py): RMS → gate → normalise → curve → hold/attack/release →
proximity → device lead → per-ear conflict resolution (firmware: one mode per ear) → dose limit → PWM.
Demo 2 changes: two independent sources with independent positions, and a much sharper left/right split.

Writes media/thermal.csv (= output/thermal_control.csv), output/thermal_intent.csv, output/mapping_config.json,
output/thermal_overview.png, output/thermal_checks.json
"""
import csv, json, os, sys
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fanmeeting as FM
from demo1 import load
T1 = load("thermal")                      # Demo 1 controller functions

OUT, MEDIA, STEMS = os.path.join(ROOT, "output"), os.path.join(ROOT, "media"), os.path.join(ROOT, "output", "stems")
CFG = dict(T1.CFG)
CFG.update(
    SIDE_EXP_FAR=2.0,    # ear-weight exponent when the source is ≥ 0.6 m away  (Demo 1: 1.3)
    SIDE_EXP_NEAR=3.5,   # … when it is at the ear (then normalised to the nearer ear) → far ear ≈ 0
    HEAT_SOURCE="heat_dry.wav (voice + whispers + laughs + song + warm breaths)",
    COOL_SOURCE="cool_dry.wav (fan flaps + swishes + ice + fizz + cool breath + cool magic)",
)


def ear_weights(az, d, cfg=CFG):
    s = np.sin(np.radians(az))
    near = np.clip((0.6 - d) / 0.45, 0, 1)
    p = cfg["SIDE_EXP_FAR"] + (cfg["SIDE_EXP_NEAR"] - cfg["SIDE_EXP_FAR"]) * near
    wl, wr = ((1 - s) / 2) ** p, ((1 + s) / 2) ** p
    m = np.maximum(np.maximum(wl, wr), 1e-6)     # centred source → both ears full; off-centre → far ear drops fast
    return wl / m, wr / m


def run(cfg=CFG):
    rate = cfg["RATE"]
    times = np.arange(int(FM.DURATION * rate) + 1) / rate
    pos = FM.positions(times)
    srcs = {}
    for name, stem, who in (("heat", "heat_dry.wav", "A"), ("cool", "cool_dry.wav", "C")):
        sr, x = T1.read_mono(os.path.join(STEMS, stem))
        lv, dbs, ref = T1.level(x, sr, times, cfg)
        az, d = pos[who]
        wl, wr = ear_weights(az, d, cfg)
        pr = T1.proximity(d, cfg)
        srcs[name] = dict(L=lv * pr * wl, R=lv * pr * wr, level=lv, db=dbs, ref=ref, az=az, d=d)
        print(f"{name}: reference {ref:.1f} dBFS, gate {ref - cfg['GATE_BELOW_REF']:.1f} dBFS")

    cap = lambda v: np.minimum(v, 1.0) * cfg["CAP"]
    cL, cR = (cap(T1.lead(srcs["cool"][s], cfg["COOL_LEAD"], rate)) for s in "LR")
    hL, hR = (cap(T1.lead(srcs["heat"][s], cfg["HEAT_LEAD"], rate)) for s in "LR")
    Lc, Lh = T1.resolve_ear(cL, hL, cfg)
    Rc, Rh = T1.resolve_ear(cR, hR, cfg)
    Lc, Lh, Rc, Rh = (T1.dose_limit(v, cfg) for v in (Lc, Lh, Rc, Rh))
    for v in (Lc, Lh, Rc, Rh): v[-int(rate):] *= np.linspace(1, 0, int(rate))
    off = cfg["OFF_BELOW"]
    pLc, pRc = T1.to_pwm(Lc, cfg["COOL_PWM"], off), T1.to_pwm(Rc, cfg["COOL_PWM"], off)
    pLh, pRh = T1.to_pwm(Lh, cfg["HEAT_PWM"], off), T1.to_pwm(Rh, cfg["HEAT_PWM"], off)

    def cmd(i):
        if not (pLc[i] or pLh[i] or pRc[i] or pRh[i]): return "stop"
        return " ".join(f"{s}C{c}" if c else f"{s}H{h}" for s, c, h in (("L", pLc[i], pLh[i]), ("R", pRc[i], pRh[i])))

    rows = [["time_s", "L_cool", "R_cool", "L_heat", "R_heat", "L_cool_pwm", "R_cool_pwm", "L_heat_pwm", "R_heat_pwm", "command"]]
    rows += [[f"{t:.2f}", f"{Lc[i]:.3f}", f"{Rc[i]:.3f}", f"{Lh[i]:.3f}", f"{Rh[i]:.3f}", pLc[i], pRc[i], pLh[i], pRh[i], cmd(i)] for i, t in enumerate(times)]
    for p in (os.path.join(MEDIA, "thermal.csv"), os.path.join(OUT, "thermal_control.csv")):
        with open(p, "w", newline="") as f: csv.writer(f).writerows(rows)
    with open(os.path.join(OUT, "thermal_intent.csv"), "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["time_s", "heat_rms_db", "heat_level", "voice_az", "voice_d", "cool_rms_db", "cool_level", "cool_az", "cool_d", "heat_L", "heat_R", "cool_L", "cool_R"])
        h, c = srcs["heat"], srcs["cool"]
        for i, t in enumerate(times):
            w.writerow([f"{t:.2f}", f"{h['db'][i]:.1f}", f"{h['level'][i]:.3f}", f"{h['az'][i]:.1f}", f"{h['d'][i]:.2f}",
                        f"{c['db'][i]:.1f}", f"{c['level'][i]:.3f}", f"{c['az'][i]:.1f}", f"{c['d'][i]:.2f}",
                        f"{h['L'][i]:.3f}", f"{h['R'][i]:.3f}", f"{c['L'][i]:.3f}", f"{c['R'][i]:.3f}"])
    json.dump(cfg, open(os.path.join(OUT, "mapping_config.json"), "w"), indent=1, ensure_ascii=False)
    checks(times, Lc, Rc, Lh, Rh, rate)
    plot(times, Lc, Rc, Lh, Rh, srcs)


def segments(mask, times, min_len):
    out, start = [], None
    for i, m in enumerate(np.append(mask, False)):
        if m and start is None: start = i
        if not m and start is not None:
            if (i - start) / 20 >= min_len: out.append((round(float(times[start]), 1), round(float(times[i - 1]), 1)))
            start = None
    return out


def checks(times, Lc, Rc, Lh, Rh, rate):
    th = .25
    same_ear = int(np.sum((Lc > 0) & (Lh > 0)) + np.sum((Rc > 0) & (Rh > 0)))
    # 1) left/right DIFFERENT temperatures at the same time
    cross = segments(((Lc > th) & (Rh > th)) | ((Lh > th) & (Rc > th)), times, .3)
    # 2) alternations: sequence of strong one-sided events (side, mode) — count changes of side
    ev = []
    for i in range(len(times)):
        vals = {("L", "cool"): Lc[i], ("R", "cool"): Rc[i], ("L", "heat"): Lh[i], ("R", "heat"): Rh[i]}
        k, v = max(vals.items(), key=lambda kv: kv[1])
        other = max(v2 for k2, v2 in vals.items() if k2[0] != k[0])
        if v > .45 and v - other > .3 and (not ev or ev[-1][1] != k): ev.append((round(float(times[i]), 1), k))
    side_switch = sum(1 for a, b in zip(ev, ev[1:]) if a[1][0] != b[1][0])
    lr_contrast = float(np.mean(np.abs((Lc + Lh) - (Rc + Rh))[(Lc + Lh + Rc + Rh) > .1]))
    res = dict(same_ear_conflicts=same_ear, simultaneous_different_temps=cross, one_sided_events=[(t, f"{s} {m}") for t, (s, m) in ev],
               side_switches=side_switch, mean_lr_contrast=round(lr_contrast, 3))
    json.dump(res, open(os.path.join(OUT, "thermal_checks.json"), "w"), indent=1, ensure_ascii=False)
    print(f"same-ear cool+heat frames: {same_ear} (must be 0)")
    print(f"left/right different temperatures at once: {len(cross)} times  {cross}")
    print(f"strong one-sided events: {len(ev)}, left↔right switches: {side_switch}, mean |L−R| while active: {lr_contrast:.2f}")
    for n, v in (("L_cool", Lc), ("R_cool", Rc), ("L_heat", Lh), ("R_heat", Rh)):
        print(f"  {n}: max {v.max():.2f}  active {np.sum(v > 0) / rate:5.1f} s")


def plot(times, Lc, Rc, Lh, Rh, srcs):
    import matplotlib; matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    fig, ax = plt.subplots(3, 1, figsize=(16, 8), sharex=True)
    ax[0].plot(times, srcs["heat"]["level"], color="#e0582a", label="voice → heat"); ax[0].plot(times, srcs["cool"]["level"], color="#3a8dde", label="cooling SFX → cool")
    ax[0].legend(loc="upper right"); ax[0].set_ylabel("drive")
    for a, c, h, name in ((ax[1], Lc, Lh, "LEFT"), (ax[2], Rc, Rh, "RIGHT")):
        a.fill_between(times, 0, -c, color="#3a8dde", alpha=.85); a.fill_between(times, 0, h, color="#e0582a", alpha=.85)
        a.set_ylim(-1, 1); a.set_ylabel(name); a.axhline(0, color="k", lw=.5)
    for t, n, *_ in FM.SCENES:
        for a in ax: a.axvline(t, color="#888", lw=.6, ls=":")
        ax[0].text(t + .5, 1.02, n, fontsize=9)
    ax[2].set_xlabel("time (s) — cooling below the axis, heating above; already shifted by the device lead")
    fig.tight_layout(); fig.savefig(os.path.join(OUT, "thermal_overview.png"), dpi=90)


if __name__ == "__main__":
    run()
