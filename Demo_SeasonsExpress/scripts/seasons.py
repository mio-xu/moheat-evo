"""Demo 5 timeline — 《四季暴走列車 / The Runaway Seasons Express》 (150 s, no characters, no dialogue).

Single source of truth for: scene segments, every ambience source (gain envelope, azimuth, distance, thermal
role), the designed (silent) thermal envelopes, and the silence gap.  build_audio.py, thermal.py, check_sync.py
and the player all read it.

Azimuth: degrees, 0 = straight ahead (towards the locomotive), −90 = left ear / left window, +90 = right.
Envelope: list of trapezoids (t_start, t_end, fade_in, fade_out, gain) — the source is at `gain` from t_start
to t_end, fading in before t_start and out after t_end.
"""
import numpy as np

DURATION, SR, RATE, FPS = 150.0, 48000, 20, 30
SILENCE = (110.0, 114.0)                    # everything (sound, music, train, thermal) is exactly zero

SEGMENTS = [  # t0, t1, id, Japanese title, English title, left window, right window
    (0, 20, "winter", "冬の雪林", "Winter Forest", "winter", "winter"),
    (20, 45, "summer", "真夏の海岸", "Summer Coast", "winter_thaw", "summer"),
    (45, 70, "storm", "熱帯のスコール", "Tropical Downpour", "storm", "rainforest_sun"),
    (70, 95, "tunnel", "氷と炎のトンネル", "Tunnel of Ice & Fire", "ice", "lava"),
    (95, 125, "chaos", "季節の暴走", "Seasons Out of Control", "chaos", "chaos"),
    (125, 150, "spring", "春の桜駅", "Cherry Blossom Station", "spring", "spring"),
]
# the tunnel swaps sides at 80–83 (neutral) → 83–95 left = lava, right = ice
TUNNEL_SWAP = (80.0, 83.0)

L, R = -72.0, 72.0


def T(t0, t1, fi=1.0, fo=1.0, g=1.0): return (t0, t1, fi, fo, g)


# name: role (cool / heat / none), thermal weight, envelope, azimuth keyframes, distance (m), mix level (dBFS, active RMS)
SOURCES = {
    "winter_wind":    dict(role="cool", w=1.00, env=[T(0, 19.5, 2, 3), T(72, 79.3, .8, 1.2, .55), T(84.0, 93, .8, 1.0, .55),
                                                   T(95, 98.2, .4, .8), T(108.5, 110, .3, .02, .9), T(116, 119.2, .4, .8)],
                           az=[(0, L), (81.6, L), (82.3, R), (94.1, R), (94.5, L), (100, L), (108, R)], d=1.3, mix=-17),
    "snow":           dict(role="cool", w=.60, env=[T(.5, 19, 2, 3, .9), T(95, 98.2, .5, .8, .8)],
                           az=[(0, -62)], d=1.1, mix=-27),
    "ice_cracking":   dict(role="cool", w=.90, env=[T(3, 19, 1, 1), T(72, 79.3, .5, .8), T(84.0, 93, .5, .8), T(104, 107, .2, .3), T(120, 122, .2, .4)],
                           az=[(0, -76), (81.6, -76), (82.3, 76), (119.5, 76), (119.8, -76)], d=.9, mix=-23),
    "summer_breeze":  dict(role="heat", w=.80, env=[T(21, 44, 2.5, 2.5), T(104, 107, .3, .6), T(119, 122.5, .5, 1.5, .6)],
                           az=[(0, R), (60, R), (100, L), (118, L), (118.5, 0)], d=1.3, mix=-17),
    "ocean_waves":    dict(role="none", w=0, env=[T(20.5, 44.5, 2.5, 3)], az=[(0, 80)], d=4.0, mix=-18),
    "tropical_rain":  dict(role="cool", w=1.00, env=[T(45.5, 68.5, 2.5, 2.5), T(101, 104, .3, .6, .9)],
                           az=[(0, -76), (55, -76), (66, 76)], d=1.2, mix=-18),
    "water_drops":    dict(role="cool", w=.50, env=[T(46.5, 68.5, 2, 2), T(101, 104, .3, .5)],
                           az=[(0, -70), (55, -70), (66, 70)], d=.6, mix=-24),
    "thunder":        dict(role="none", w=0, events=[(52.0, -40, 1.0), (61.5, 35, .9), (67.0, 55, .7), (101.3, 60, .6)],
                           az=[(0, -40), (56, -40), (57, 35), (64, 35), (65, 55)], d=6.0, mix=-7),
    "fire_crackling": dict(role="heat", w=1.00, env=[T(72, 79.3, .8, 1.2), T(84.0, 93, .8, 1.5), T(98, 101.2, .3, .6), T(117, 120.2, .4, .8)],
                           az=[(0, R), (81.6, R), (82.3, L), (95, L), (96, R), (110, R), (114.5, L)], d=1.0, mix=-17),
    "lava":           dict(role="heat", w=.90, env=[T(72, 79.3, 1, 1.2, .9), T(84.0, 93, 1, 1.5, .9), T(107, 108.5, .2, .3)],
                           az=[(0, 78), (81.6, 78), (82.3, -78)], d=1.6, mix=-19),
    "steam":          dict(role="heat", w=.80, events=[(84.1, 0, 1.0), (101.2, 0, .9), (102.7, 0, .8), (114.6, 0, 1.0)],
                           az=[(0, -66), (110, -66), (112, 66)], d=.9, mix=-21),
    "spring_breeze":  dict(role="heat", w=.22, env=[T(123.5, 145, 3, 4)], az=[(0, 0)], d=1.5, mix=-20),
    "birds":          dict(role="none", w=0, env=[T(127, 145, 1, 3)], az=[(0, 65), (133, 65), (135, -60), (140, -60), (142, 30)], d=5.0, mix=-17),
    "train_wheels":   dict(role="none", w=0, env=[T(0, 146.5, .01, 1.5)], az=None, d=1.5, mix=-23),
    "train_interior": dict(role="none", w=0, env=[T(0, 147, .01, 2)], az=None, d=2.0, mix=-22),
    "background_music": dict(role="none", w=0, env=[T(0, 147.5, 1.5, 2.5)], az=None, d=None, mix=-22),
}
ORDER = list(SOURCES)

# Silent visual events → designed envelopes (NOT derived from audio). side: L / R; role: heat / cool
DESIGNED = {
    "sunlight_right": dict(role="heat", side="R", keys=[(22, 0), (26, .7), (44, .75), (50, .62), (57, .35), (60.5, 0)],
                           why="sunshine through the right window (summer coast → sunny half of the downpour); light has no sound"),
    "frost_residual_left": dict(role="cool", side="L", keys=[(19, 0), (21.5, .45), (27, .3), (31, 0)],
                                why="left window still frosted after winter — melting frost is silent"),
}

# Visual-only cues for the player (lightning flashes, steam puffs, clock speed, train shake …)
VISUAL_CUES = [
    dict(t=52.0, kind="lightning", side="L"), dict(t=61.5, kind="lightning", side="R"), dict(t=67.0, kind="lightning", side="R"),
    dict(t=101.3, kind="lightning", side="R"), dict(t=84.1, kind="steam", side="L"), dict(t=101.2, kind="steam", side="L"),
    dict(t=102.7, kind="steam", side="L"), dict(t=114.6, kind="steam", side="R"), dict(t=110.0, kind="blackout_start", side="B"),
    dict(t=114.0, kind="blackout_end", side="B"), dict(t=140.0, kind="station_arrive", side="B"),
]

# Chaos section: which "season" each window shows (for the player) — matches the sound layout above
CHAOS = [  # t0, t1, left, right
    (95.0, 98.0, "winter", "winter"), (98.0, 101.0, "winter", "lava"), (101.0, 104.0, "steam", "storm"),
    (104.0, 107.0, "summer", "ice"), (107.0, 108.5, "lava", "ice"), (108.5, 110.0, "lava", "winter"),
    (110.0, 114.0, "dark", "dark"), (114.0, 116.0, "spring", "steam"), (116.0, 119.0, "lava", "winter"),
    (119.0, 122.5, "ice", "summer"), (122.5, 125.0, "spring", "spring"),
]


def env(name, t):
    t = np.asarray(t, float); e = np.zeros_like(t)
    for t0, t1, fi, fo, g in SOURCES[name].get("env", []):
        up = np.clip((t - (t0 - fi)) / max(fi, 1e-3), 0, 1); dn = np.clip(((t1 + fo) - t) / max(fo, 1e-3), 0, 1)
        e = np.maximum(e, g * np.minimum(up, dn) ** 1.5)
    return e * silence_gate(t)


def silence_gate(t, fade=.05):
    t = np.asarray(t, float); a, b = SILENCE
    return np.clip(np.maximum((a - t) / fade, (t - b) / fade), 0, 1)


def azimuth(name, t):
    k = SOURCES[name]["az"] or [(0, 0)]
    return np.interp(t, [a for a, _ in k], [b for _, b in k])


def positions(times):
    """same interface as Demo 1's story.positions → {name: (az, d)} (used by the HRTF renderer)"""
    return {n: (azimuth(n, times), np.full(len(np.atleast_1d(times)), float(s["d"] or 1.5))) for n, s in SOURCES.items()}


def designed(name, t):
    k = DESIGNED[name]["keys"]
    return np.interp(t, [a for a, _ in k], [b for _, b in k], left=0, right=0) * silence_gate(t)


def segment_at(t):
    for s in SEGMENTS:
        if s[0] <= t < s[1]: return s
    return SEGMENTS[-1]
