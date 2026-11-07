"""Shining Smile Melody — Ice & Fire Concert: the 150 s timeline, aligned to the real song structure.

ONE position data set drives the stage movement, the cooling-FX spatial audio and the thermal Mode B:
  "A" = Ayane on stage (heat follows her)    "C" = the ice FX / ice side of the stage (cool follows it)
Section boundaries, bars and beats come from analysis/music_structure.json (scripts/music_features.py on the edited song).
"""
import json, os
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DURATION, SR, RATE = 150.0, 48000, 20
STRUCT = json.load(open(os.path.join(ROOT, "analysis", "music_structure.json")))
BEATS, BARS = np.array(STRUCT["beats"]), np.array(STRUCT["bars"])
BAR = float(np.median(np.diff(BARS)))

# (start, end, key, ja, en, stage)  stage ∈ normal | ice | split | split_swap | climax
SEGMENTS = [
    (0.00, 11.32, "opening", "オープニング", "Opening", "normal"),
    (11.32, 38.59, "song1", "ファーストステージ", "First song", "normal"),
    (38.59, 57.68, "ice", "氷のステージ", "Ice stage", "ice"),
    (57.68, 74.05, "split", "氷と炎", "Ice & Fire", "split"),
    (74.05, 95.86, "swap", "氷と炎 — 入れ替わり", "Ice & Fire — swap", "split_swap"),
    (95.86, 128.59, "climax", "クライマックス", "Climax", "climax"),
    (128.59, 150.00, "curtain", "カーテンコール", "Curtain call", "normal"),
]
STAGE_WEIGHTS = {   # how strongly each stage state lets heat / cool through (Mode B), per side (L, R)
    "normal": dict(heat=(1.0, 1.0), cool=(.55, .55)),
    "ice": dict(heat=(.45, .45), cool=(1.0, 1.0)),
    "split": dict(heat=(.25, 1.0), cool=(1.0, .2)),       # left ice, right warm
    "split_swap": dict(heat=(1.0, .25), cool=(.2, 1.0)),  # left warm, right ice
    "climax": dict(heat=(1.0, 1.0), cool=(1.0, 1.0)),
}


def bar_at(t): return float(BARS[np.argmin(np.abs(BARS - t))])


# Ayane's stage path (t, az_deg, d_m). Stage centre ≈ 0°, stage left/right ≈ ∓30°, runway (T-stage) brings her to ~1 m.
A_KEYS = [
    (0.0, 30, 4.6), (2.6, 30, 4.4), (6.0, 0, 3.0), (11.3, 0, 2.9),
    (14.0, -10, 2.6), (19.5, -30, 2.4), (25.0, -30, 2.4), (29.5, 0, 2.6), (32.5, 0, 1.4), (35.5, 0, .5), (37.8, 0, .55), (39.4, 0, 2.2),
    (44.0, 12, 2.4), (49.5, 25, 2.4), (54.0, 0, 2.2), (57.0, 10, 2.5),
    (59.5, 30, 2.3), (73.0, 30, 2.3),
    (74.8, 0, 2.0), (76.6, -30, 2.3), (94.5, -30, 2.3),
]
CLIMAX_SWINGS = 6        # climax: left / right swings every 2 bars, two runway walk-outs
PRESENT = {"A": (2.4, 150.0)}


def _climax_keys():
    ks, t, side = [], 95.86, 1
    step = 2 * BAR
    while t + step <= 128.0:
        mid = t + step / 2
        ks += [(round(t + .6, 3), 30 * side, 2.3), (round(mid, 3), 34 * side, 2.2)]
        t += step; side = -side
    # two walk-outs to the runway on the strongest bars of the chorus
    ks += [(104.0, 0, 1.0), (105.4, 0, .55), (106.8, 0, 1.1), (118.6, 0, 1.0), (120.0, 0, .55), (121.4, 0, 1.1)]
    ks = [k for k in ks if not any(abs(k[0] - w) < 1.2 for w in (104.0, 105.4, 106.8, 118.6, 120.0, 121.4)) or k[1] == 0]
    return ks


CURTAIN = [(129.5, 0, 2.6), (136.0, 0, 2.0), (142.0, 0, 2.2), (147.5, 0, 3.0), (150.0, 0, 3.4)]


def a_keys():
    return sorted(A_KEYS + _climax_keys() + CURTAIN)


# Cooling FX cues (ice chimes / sparkle sweeps) — positions are the cooling source "C"
def cool_cues():
    cues = []
    # ice stage: ice crystals sweep left → right every 2 bars, alternating direction
    t, d = 38.59, 1
    while t + 2 * BAR <= 57.6:
        cues.append(dict(t=round(t, 3), dur=round(2 * BAR - .2, 3), az0=-70 * d, az1=70 * d, dist=1.2, gain=.8, style="sweep")); t += 2 * BAR; d = -d
    # ice & fire: ice side is fixed (left, then right after the swap)
    for a, b, az in ((57.68, 74.05, -65), (74.05, 95.86, 65)):
        t = a
        while t + BAR <= b - .1:
            cues.append(dict(t=round(t, 3), dur=round(BAR - .15, 3), az0=az, az1=az, dist=1.0, gain=.55, style="sparkle")); t += BAR
    # climax: ice bursts on the side OPPOSITE Ayane, on every 2-bar swing
    t, side = 95.86, 1
    while t + 2 * BAR <= 128.0:
        cues.append(dict(t=round(t + .1, 3), dur=round(2 * BAR - .3, 3), az0=-60 * side, az1=-60 * side, dist=1.0, gain=.75, style="burst")); t += 2 * BAR; side = -side
    return cues


def _interp(keys, times):
    from scipy.interpolate import PchipInterpolator
    ks = sorted(keys)
    t = np.array([k[0] for k in ks]); az = np.array([k[1] for k in ks], float); d = np.array([k[2] for k in ks], float)
    tt = np.clip(times, t[0], t[-1])
    return PchipInterpolator(t, az)(tt), np.clip(PchipInterpolator(t, d)(tt), .3, 8)


def cool_keys():
    ks = []
    for c in cool_cues():
        ks += [(c["t"] - .02, c["az0"], c["dist"]), (c["t"] + c["dur"], c["az1"], c["dist"])]
    return ks


def positions(times):
    return {"A": _interp(a_keys(), times), "C": _interp(cool_keys(), times)}


def segment_at(t):
    for s in SEGMENTS:
        if s[0] <= t < s[1]: return s
    return SEGMENTS[-1]


def pose_plan():
    """Pose per beat (or per bar), deterministic. Returns [(t, pose)]."""
    plan = []
    dances = ["A_dance_arms_up", "A_dance_step", "A_dance_heart", "A_dance_point", "A_dance_clap", "A_dance_sway", "A_dance_kick", "A_dance_jump", "A_dance_spin"]
    hype = ["A_dance_jump", "A_dance_kick", "A_dance_arms_up", "A_dance_spin", "A_dance_clap", "A_dance_point", "A_dance_step", "A_dance_heart"]
    plan += [(0.0, "A_pose_run"), (6.0, "A_pose_wave"), (9.0, "A_dance_heart")]
    for i, b in enumerate(BEATS):
        seg = segment_at(b)[2]
        if b < 11.32 or b >= 128.59: continue
        if seg == "song1": pose = ["A_mic_sing", "A_pose_sing", "A_dance_sway", "A_mic_sing"][(i // 4) % 4]
        elif seg == "ice": pose = dances[(i // 2) % len(dances)]
        elif seg in ("split", "swap"): pose = ["A_mic_belt", "A_dance_step", "A_dance_point", "A_mic_sing", "A_dance_sway", "A_dance_heart"][(i // 2) % 6]
        else: pose = hype[i % len(hype)]
        if not plan or plan[-1][1] != pose: plan.append((round(float(b), 3), pose))
    plan += [(128.59, "A_dance_finale"), (134.0, "A_pose_bow"), (139.0, "A_pose_wave"), (144.0, "A_pose_bye")]
    return sorted(plan)
