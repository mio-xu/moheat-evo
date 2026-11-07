"""Demo 5 thermal control (4 channels, 20 Hz).

  python3 scripts/thermal.py      (after build_audio.py)

Sources (each from its OWN dry stem, split left/right by its OWN position):
  N voice  → HEAT  (Nobunaga, front-left → mostly L_Heat)
  I voice  → HEAT  (Ieyasu, front-right → mostly R_Heat)
  F warm   → HEAT  (hot-sake steam, charcoal brazier)
  C cold   → COOL  (ice bucket, night wind, rain)
Voices share one loudness scale per character (reference = his loudest frames = the laugh), so
laugh = hottest, normal speech = medium, whisper = weak but noticeable. Proximity is gentle (0.6 seated → 1.0 at the ear)
so closeness never comes from volume alone. Then Demo 1's controller: device lead → per-ear arbitration
(firmware: one mode per ear) → 8 s dose limit → PWM.

Writes media/thermal.csv (= thermal/thermal_4ch.csv), thermal/thermal_intent.csv, thermal/mapping_config.json,
thermal/thermal_overview.png, thermal/thermal_checks.json
"""
import csv, json, os, sys
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import banquet as BQ
from demo1 import load
T1 = load("thermal")

TH, MEDIA, STEMS = os.path.join(ROOT, "thermal"), os.path.join(ROOT, "media"), os.path.join(ROOT, "audio", "stems")
CFG = dict(T1.CFG)
CFG.update(
    VOICE_REF_PCT=99.5,   # character's reference = his loudest frames (the laugh)
    VOICE_CURVE=2.4,
    AMB_CURVE=1.6,
    PROX_FAR=0.75,        # proximity factor when seated (≥ 0.6 m) …
    PROX_NEAR=1.0,        # … and at the ear (≤ 0.15 m)
    GAIN=dict(N=1.0, I=1.0, F=0.85, C=1.0),
    SIDE_EXP_FAR=2.0, SIDE_EXP_NEAR=3.5,
    SOURCES=dict(N="N_voice.wav (Nobunaga dry voice)", I="I_voice.wav (Ieyasu dry voice)",
                 F="F_warm.wav (hot-sake steam + brazier)", C="C_cool.wav (ice bucket + wind + rain)"),
)


def ear_weights(az, d, cfg=CFG):
    s = np.sin(np.radians(az)); near = np.clip((0.6 - d) / 0.45, 0, 1)
    p = cfg["SIDE_EXP_FAR"] + (cfg["SIDE_EXP_NEAR"] - cfg["SIDE_EXP_FAR"]) * near
    wl, wr = ((1 - s) / 2) ** p, ((1 + s) / 2) ** p
    m = np.maximum(np.maximum(wl, wr), 1e-6)
    return wl / m, wr / m


def proximity(d, cfg=CFG):
    return cfg["PROX_FAR"] + (cfg["PROX_NEAR"] - cfg["PROX_FAR"]) * np.clip((0.6 - d) / 0.45, 0, 1)


def level(x, sr, times, cfg, ref_pct, curve):
    d = T1.rms_db(x, sr, times, cfg["WIN"])
    active = d[d > -70]
    ref = np.percentile(active, ref_pct) if len(active) else -20
    gate = ref - cfg["GATE_BELOW_REF"]
    u = np.clip((d - gate) / (ref - gate), 0, 1) ** curve
    hold = int(cfg["HOLD"] * cfg["RATE"])
    held = np.array([u[max(0, i - hold): i + 1].max() for i in range(len(u))])
    return T1.one_pole(held, cfg["RATE"], cfg["ATTACK"], cfg["RELEASE"]), d, ref


def run(cfg=CFG):
    os.makedirs(TH, exist_ok=True)
    rate = cfg["RATE"]
    times = np.arange(int(BQ.DURATION * rate)) / rate          # 3000 points, 0 … 149.95 s
    pos = BQ.positions(times)
    srcs = {}
    for who, stem in (("N", "N_voice.wav"), ("I", "I_voice.wav"), ("F", "F_warm.wav"), ("C", "C_cool.wav")):
        sr, x = T1.read_mono(os.path.join(STEMS, stem))
        voice = who in "NI"
        lv, dbs, ref = level(x, sr, times, cfg, cfg["VOICE_REF_PCT"] if voice else cfg["REF_PCT"], cfg["VOICE_CURVE"] if voice else cfg["AMB_CURVE"])
        az, d = pos[who]
        wl, wr = ear_weights(az, d, cfg)
        g = lv * proximity(d, cfg) * cfg["GAIN"][who]
        srcs[who] = dict(L=g * wl, R=g * wr, level=lv, db=dbs, ref=ref, az=az, d=d)
        print(f"{who}: reference {ref:.1f} dBFS")

    cap = lambda v: np.minimum(v, 1.0) * cfg["CAP"]
    soft_or = lambda *v: 1 - np.prod([1 - np.clip(a, 0, 1) for a in v], axis=0)
    hL = cap(T1.lead(soft_or(srcs["N"]["L"], srcs["I"]["L"], srcs["F"]["L"]), cfg["HEAT_LEAD"], rate))
    hR = cap(T1.lead(soft_or(srcs["N"]["R"], srcs["I"]["R"], srcs["F"]["R"]), cfg["HEAT_LEAD"], rate))
    cL, cR = (cap(T1.lead(srcs["C"][s], cfg["COOL_LEAD"], rate)) for s in "LR")
    Lc, Lh = T1.resolve_ear(cL, hL, cfg)
    Rc, Rh = T1.resolve_ear(cR, hR, cfg)
    Lc, Lh, Rc, Rh = (T1.dose_limit(v, cfg) for v in (Lc, Lh, Rc, Rh))
    for v in (Lc, Lh, Rc, Rh): v[-int(rate * 1.5):] *= np.linspace(1, 0, int(rate * 1.5))
    off = cfg["OFF_BELOW"]
    for v in (Lc, Lh, Rc, Rh): v[v <= off] = 0.0
    pLc, pRc = T1.to_pwm(Lc, cfg["COOL_PWM"], off), T1.to_pwm(Rc, cfg["COOL_PWM"], off)
    pLh, pRh = T1.to_pwm(Lh, cfg["HEAT_PWM"], off), T1.to_pwm(Rh, cfg["HEAT_PWM"], off)

    def cmd(i):
        if not (pLc[i] or pLh[i] or pRc[i] or pRh[i]): return "stop"
        return " ".join(f"{s}C{c}" if c else f"{s}H{h}" for s, c, h in (("L", pLc[i], pLh[i]), ("R", pRc[i], pRh[i])))

    rows = [["time_s", "L_cool", "R_cool", "L_heat", "R_heat", "L_cool_pwm", "R_cool_pwm", "L_heat_pwm", "R_heat_pwm", "command"]]
    rows += [[f"{t:.2f}", f"{Lc[i]:.3f}", f"{Rc[i]:.3f}", f"{Lh[i]:.3f}", f"{Rh[i]:.3f}", pLc[i], pRc[i], pLh[i], pRh[i], cmd(i)] for i, t in enumerate(times)]
    for p in (os.path.join(MEDIA, "thermal.csv"), os.path.join(TH, "thermal_4ch.csv")):
        with open(p, "w", newline="") as f: csv.writer(f).writerows(rows)
    with open(os.path.join(TH, "thermal_intent.csv"), "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["time_s"] + [f"{k}_{c}" for k in "NIFC" for c in ("rms_db", "level", "az", "d", "L", "R")])
        for i, t in enumerate(times):
            w.writerow([f"{t:.2f}"] + [f"{srcs[k][c][i]:.3f}" if c not in ("rms_db",) else f"{srcs[k]['db'][i]:.1f}"
                                       for k in "NIFC" for c in ("rms_db", "level", "az", "d", "L", "R")])
    json.dump({k: v for k, v in cfg.items()}, open(os.path.join(TH, "mapping_config.json"), "w"), indent=1, ensure_ascii=False)
    checks(times, Lc, Rc, Lh, Rh, srcs, rate)
    plot(times, Lc, Rc, Lh, Rh, srcs)


def segments(mask, times, min_len, rate=20):
    out, start = [], None
    for i, m in enumerate(np.append(mask, False)):
        if m and start is None: start = i
        if not m and start is not None:
            if (i - start) / rate >= min_len: out.append((round(float(times[start]), 1), round(float(times[i - 1]), 1)))
            start = None
    return out


def checks(times, Lc, Rc, Lh, Rh, srcs, rate):
    th = .2
    same_ear = int(np.sum((Lc > 0) & (Lh > 0)) + np.sum((Rc > 0) & (Rh > 0)))
    cross = segments(((Lc > th) & (Rh > th)) | ((Lh > th) & (Rc > th)), times, .5)
    ev = []
    for i in range(len(times)):
        vals = {("L", "cool"): Lc[i], ("R", "cool"): Rc[i], ("L", "heat"): Lh[i], ("R", "heat"): Rh[i]}
        k, v = max(vals.items(), key=lambda kv: kv[1])
        other = max(v2 for k2, v2 in vals.items() if k2[0] != k[0])
        if v > .3 and v - other > .2 and (not ev or ev[-1][1] != k): ev.append((round(float(times[i]), 1), k))
    side_switch = sum(1 for a, b in zip(ev, ev[1:]) if a[1][0] != b[1][0])
    # heat per delivery (mean of the speaker's own-ear heat during his lines, device lead removed)
    lead = int(CFG["HEAT_LEAD"] * rate)
    per = {}
    for c in BQ.CUES:
        if c["kind"] not in ("say", "whisper", "laugh"): continue
        i0, i1 = int(c["t"] * rate), int((c["t"] + 1.2) * rate)
        ear = Lh if c["who"] == "N" else Rh
        v = float(np.max(ear[max(0, i0 - lead): max(1, i1 - lead)]))
        cls = "laugh" if c["kind"] == "laugh" and c["emo"] != "earlaugh" else c["kind"] if c["emo"] != "earlaugh" else "whisper"
        per.setdefault(cls, []).append(v)
    per = {k: round(float(np.mean(v)), 3) for k, v in per.items()}
    # voice-energy ↔ heat agreement (per character, own ear)
    corr = {}
    for who, ear in (("N", Lh), ("I", Rh)):
        want = T1.lead(srcs[who]["L" if who == "N" else "R"], CFG["HEAT_LEAD"], rate)   # his voice drive at his ear
        corr[who] = round(float(np.corrcoef(want, ear)[0, 1]), 3)
    res = dict(same_ear_conflicts=same_ear, simultaneous_opposite_temps=cross, one_sided_events=[(t, f"{s} {m}") for t, (s, m) in ev],
               side_switches=side_switch, heat_by_delivery=per, voice_heat_correlation=corr,
               channel_max={n: round(float(v.max()), 3) for n, v in (("L_cool", Lc), ("R_cool", Rc), ("L_heat", Lh), ("R_heat", Rh))},
               channel_active_s={n: round(float(np.sum(v > 0) / rate), 1) for n, v in (("L_cool", Lc), ("R_cool", Rc), ("L_heat", Lh), ("R_heat", Rh))})
    json.dump(res, open(os.path.join(TH, "thermal_checks.json"), "w"), indent=1, ensure_ascii=False)
    print(f"same-ear cool+heat frames: {same_ear} (must be 0)")
    print(f"left/right opposite temperatures at once: {len(cross)}  {cross}")
    print(f"one-sided events: {len(ev)}, left↔right switches: {side_switch}")
    print(f"heat by delivery (own ear peak): {per}   (want laugh > say > whisper > 0)")
    print(f"voice ↔ heat correlation: {corr}")
    print("max:", res["channel_max"], " active s:", res["channel_active_s"])


def plot(times, Lc, Rc, Lh, Rh, srcs):
    import matplotlib; matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    fig, ax = plt.subplots(3, 1, figsize=(16, 8), sharex=True)
    for k, col, lab in (("N", "#c0392b", "Nobunaga voice"), ("I", "#2e7d5b", "Ieyasu voice"), ("F", "#f39c12", "steam / brazier"), ("C", "#3a8dde", "ice / wind / rain")):
        ax[0].plot(times, srcs[k]["level"], color=col, label=lab, lw=1)
    ax[0].legend(loc="upper right", ncol=4); ax[0].set_ylabel("drive")
    for a, c, h, name in ((ax[1], Lc, Lh, "LEFT"), (ax[2], Rc, Rh, "RIGHT")):
        a.fill_between(times, 0, -c, color="#3a8dde", alpha=.85); a.fill_between(times, 0, h, color="#e0582a", alpha=.85)
        a.set_ylim(-1, 1); a.set_ylabel(name); a.axhline(0, color="k", lw=.5)
    for t, n, *_ in BQ.SCENES:
        for a in ax: a.axvline(t, color="#888", lw=.6, ls=":")
        ax[0].text(t + .5, 1.02, f"S{BQ.SCENES.index((t, n, *_)) + 1}", fontsize=10)
    ax[2].set_xlabel("time (s) — cooling below the axis, heating above; already shifted by the device lead")
    fig.tight_layout(); fig.savefig(os.path.join(TH, "thermal_overview.png"), dpi=90)


if __name__ == "__main__":
    run()
