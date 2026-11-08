"""Demo 4 timeline — 《四季暴走列車 / The Runaway Seasons Express》 (150 s, no characters, no dialogue).

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

# Pacing (2026-11-07, user feedback "the opening is too slow and too long"): every time below is AUTHORED on the
# original brief's grid (winter 0–20, summer 20–45, …) and remapped once at import by tw(): winter 20 → 12 s,
# the 8 s go to the tunnel (+3) and the chaos (+5); the spring ending keeps its length; the blackout is 2 s.
WARP_OLD = [0, 20, 45, 70, 95, 110, 114, 125, 150]
WARP_NEW = [0, 12, 37, 62, 90, 118.5, 126.0, 128.5, 150]   # v2 (2026-11-09): chaos 90–118.5 (incl. 1-s hot↔cold), power cut 118.5–126 = the
                                                         # conductor whispers at your right ear (not a dead black gap), spring from 126


def tw(x):
    """authored (brief) time → film time"""
    return float(np.interp(x, WARP_OLD, WARP_NEW))

SEGMENTS = [  # t0, t1, id, Japanese title, English title, left window, right window
    (0, 20, "winter", "冬の雪林", "Winter Forest", "winter", "winter"),
    (20, 45, "summer", "真夏の海岸", "Summer Coast", "winter_thaw", "summer"),
    (45, 70, "storm", "熱帯のスコール", "Tropical Downpour", "storm", "rainforest_sun"),
    (70, 95, "tunnel", "氷と炎のトンネル", "Tunnel of Ice & Fire", "ice", "lava"),
    (95, 125, "chaos", "季節の暴走", "Seasons Out of Control", "chaos", "chaos"),
    (125, 150, "spring", "春のさくら駅", "Cherry Blossom Station", "spring", "spring"),
]
# the tunnel swaps sides at 80–83 (neutral) → 83–95 left = lava, right = ice
TUNNEL_SWAP = (80.0, 83.0)

L, R = -72.0, 72.0


def T(t0, t1, fi=1.0, fo=1.0, g=1.0): return (t0, t1, fi, fo, g)


# name: role (cool / heat / none), thermal weight, envelope, azimuth keyframes, distance (m), mix level (dBFS, active RMS)
SOURCES = {
    "winter_wind":    dict(role="cool", w=1.00, env=[T(0, 19.5, .5, 2), T(72, 93, .8, 1.0, .55),
                                                   T(95, 98.2, .4, .8), T(108.5, 110, .3, .02, .9), T(116, 119.2, .4, .8)],
                           az=[(0, L), (94.1, L), (100, L), (108, R)], d=1.3, mix=-17),   # v2: no tunnel swap — the ice cabin stays LEFT
    "snow":           dict(role="cool", w=.60, env=[T(0, 19, .6, 2, .9), T(95, 98.2, .5, .8, .8)],
                           az=[(0, -62)], d=1.1, mix=-27),
    "ice_cracking":   dict(role="cool", w=.90, env=[T(3, 19, 1, 1), T(72, 93, .5, .8), T(104, 107, .2, .3), T(120, 122, .2, .4)],
                           az=[(0, -76)], d=.9, mix=-23),
    "summer_breeze":  dict(role="heat", w=.80, env=[T(21, 44, 2.5, 2.5), T(104, 107, .3, .6), T(119, 122.5, .5, 1.5, .6)],
                           az=[(0, R), (60, R), (100, L), (118, L), (118.5, 0)], d=1.3, mix=-17),
    "ocean_waves":    dict(role="none", w=0, env=[T(20.5, 44.5, 2.5, 3)], az=[(0, 80)], d=4.0, mix=-18),
    "tropical_rain":  dict(role="cool", w=1.00, env=[T(45.5, 68.5, 2.5, 2.5), T(101, 104, .3, .6, .9)],
                           az=[(0, -76), (55, -76), (66, 76)], d=1.2, mix=-18),
    "water_drops":    dict(role="cool", w=.50, env=[T(46.5, 68.5, 2, 2), T(101, 104, .3, .5)],
                           az=[(0, -70), (55, -70), (66, 70)], d=.6, mix=-24),
    "thunder":        dict(role="none", w=0, events=[(52.0, -40, 1.0), (61.5, 35, .9), (67.0, 55, .7), (101.3, 60, .6)],
                           az=[(0, -40), (56, -40), (57, 35), (64, 35), (65, 55)], d=6.0, mix=-7),
    "fire_crackling": dict(role="heat", w=1.00, env=[T(72, 93, .8, 1.5), T(98, 101.2, .3, .6), T(117, 120.2, .4, .8)],
                           az=[(0, R)], d=1.0, mix=-17),
    "lava":           dict(role="heat", w=.90, env=[T(72, 93, 1, 1.5, .9), T(107, 108.5, .2, .3)],
                           az=[(0, 78)], d=1.6, mix=-19),
    "steam":          dict(role="heat", w=.80, events=[(84.1, 0, 1.0), (101.2, 0, .9), (102.7, 0, .8), (114.6, 0, 1.0)],
                           az=[(0, 66)], d=.9, mix=-21),   # tunnel steam bursts from the lava (right) side
    "spring_breeze":  dict(role="heat", w=.05, env=[T(123.5, 145, 3, 4)], az=[(0, 0)], d=1.5, mix=-20),
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
    dict(t=101.3, kind="lightning", side="R"), dict(t=84.1, kind="steam", side="R"), dict(t=101.2, kind="steam", side="L"),
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


# ---------------------------------------------------------------- remap everything authored above onto the film grid
SILENCE = (tw(SILENCE[0]), tw(SILENCE[1]))
TUNNEL_SWAP = (tw(TUNNEL_SWAP[0]), tw(TUNNEL_SWAP[1]))
SEGMENTS = [(tw(a), tw(b)) + tuple(r) for a, b, *r in SEGMENTS]
for _s in SOURCES.values():
    if "env" in _s: _s["env"] = [(round(tw(a), 3), round(tw(b), 3), fi, fo, g) for a, b, fi, fo, g in _s["env"]]
    if _s.get("az"): _s["az"] = [(round(tw(a), 3), v) for a, v in _s["az"]]
    if "events" in _s: _s["events"] = [(round(tw(a), 3), v, g) for a, v, g in _s["events"]]
for _d in DESIGNED.values(): _d["keys"] = [(round(tw(a), 3), v) for a, v in _d["keys"]]
for _c in VISUAL_CUES: _c["t"] = round(tw(_c["t"]), 3)
CHAOS = [(round(tw(a), 3), round(tw(b), 3), l_, r_) for a, b, l_, r_ in CHAOS]


# ---------------------------------------------------------------- faster opening (user: "the front is still slow")
# film-time sweeps: the winter wind howls across the car a few times; the summer breeze swings to the left now and then
def _replace_az(name, keys, until):
    SOURCES[name]["az"] = sorted([k for k in SOURCES[name]["az"] if k[0] >= until] + keys)
WINTER_SWEEP = [(0, L), (3.0, L), (3.8, R), (5.6, R), (6.4, L), (8.4, L), (9.1, R), (10.5, R), (11.2, L), (14.0, L)]
for _n in ("winter_wind", "snow", "ice_cracking"):                   # the whole blizzard moves together, so the cold really changes side
    _replace_az(_n, WINTER_SWEEP, 40)
_replace_az("summer_breeze", [(0, R), (23.5, R), (24.3, L), (26.0, L), (26.8, R), (29.5, R), (30.3, L), (32.0, L), (32.8, R), (40.0, R)], 40)
# gust / pulse rhythm (period s, depth): strength rises and falls every 2–3 s instead of a steady bed
PULSE = {"winter_wind": (2.4, .75), "snow": (2.4, .6), "summer_breeze": (2.6, .75), "tropical_rain": (2.2, .45),
         "fire_crackling": (1.9, .45), "lava": (2.3, .45), "spring_breeze": (4.5, .3)}
SUN_PULSE = (3.0, .6)                                                 # clouds passing the sun


def pulse(t, period, depth, seed=0.0):
    t = np.asarray(t, float)
    g = .6 * (.5 + .5 * np.cos(2 * np.pi * t / period + seed)) + .4 * (.5 + .5 * np.cos(2 * np.pi * t / (period * 1.618) + 2.1 * seed + 1))
    return (1 - depth) + depth * g ** 1.5


# ---------------------------------------------------------------- fast chaos (user: "switch about every 2 s")
# Rebuilt in FILM time from one table: every row is ~2 s; each window gets one season; sound, thermal side and the
# window picture all follow the row.  A sound never jumps to the other side in consecutive rows (no audible pan drag).
CHAOS_FILM = [  # t0, t1, left, right — v2 (2026-11-09): 2-s rows, then a 1-s hot↔cold block (L lava/ice against R winter/summer in
    # opposite phase: each ear switches every second, no source ever changes side between neighbouring rows), the power cut, the spring
    (90.0, 92.0, "winter", "summer"), (92.0, 94.0, "lava", "ice"), (94.0, 96.0, "storm", "steam"),
    (96.0, 98.0, "summer", "winter"), (98.0, 100.0, "steam", "storm"),
    (100.0, 101.0, "lava", "winter"), (101.0, 102.0, "ice", "summer"), (102.0, 103.0, "lava", "winter"), (103.0, 104.0, "ice", "summer"),
    (104.0, 105.0, "lava", "winter"), (105.0, 106.0, "ice", "summer"), (106.0, 107.0, "lava", "winter"), (107.0, 108.0, "ice", "summer"),
    (108.0, 110.0, "storm", "lava"), (110.0, 112.0, "summer", "ice"), (112.0, 114.0, "winter", "steam"), (114.0, 116.0, "lava", "storm"),
    (116.0, 118.5, "ice", "summer"),
    (118.5, 126.0, "dark", "dark"),
    (126.0, 128.5, "spring", "spring"),
]
SEASON_SOURCES = {"winter": [("winter_wind", 1.0), ("snow", .8)], "ice": [("ice_cracking", 1.0)], "storm": [("tropical_rain", 1.0), ("water_drops", 1.0)],
                  "summer": [("summer_breeze", 1.0)], "lava": [("lava", 1.0), ("fire_crackling", 1.0)], "spring": [("spring_breeze", 1.0)], "steam": [], "dark": []}
SIDE_AZ = {"L": -74.0, "R": 74.0}
C0, C1 = CHAOS_FILM[0][0], CHAOS_FILM[-1][1]
_chaos_names = {n for v in SEASON_SOURCES.values() for n, _ in v} | {"steam", "thunder"}
for _n in _chaos_names:                                               # drop the old hand-made chaos parts
    _s = SOURCES[_n]
    if "env" in _s and _n != "spring_breeze": _s["env"] = [e for e in _s["env"] if not (C0 - .5 <= e[0] < C1)]   # keep the spring ending
    if "events" in _s: _s["events"] = [e for e in _s["events"] if not (C0 - .5 <= e[0] < C1)]
    if _s.get("az") and _n != "spring_breeze":
        _hold = float(np.interp(C0 - 1.2, [k[0] for k in _s["az"]], [k[1] for k in _s["az"]]))   # keep the pre-chaos side
        _s["az"] = [k for k in _s["az"] if not (C0 - 1 <= k[0] < C1 + 1)] + [(C0 - 1.2, _hold)]
VISUAL_CUES = [c for c in VISUAL_CUES if not (C0 - .5 <= c["t"] < C1) or c["kind"].startswith("blackout")]
for t0, t1, left, right in CHAOS_FILM:
    for side, season in (("L", left), ("R", right)):
        az = 0.0 if season == "spring" else SIDE_AZ[side]
        for n, g in SEASON_SOURCES[season]:
            _s = SOURCES[n]
            _s["env"].append((round(t0 + .05, 3), round(t1 - .3, 3), .2, .3, g))
            if n != "spring_breeze": _s["az"] += [(round(t0 - .25, 3), az), (round(t1 + .35, 3), az)]
        if season == "steam":
            SOURCES["steam"]["events"].append((t0 + .1, 0, 1.0)); SOURCES["steam"]["az"] += [(t0 - .2, SIDE_AZ[side]), (t0 + 1.8, SIDE_AZ[side])]
            VISUAL_CUES.append(dict(t=t0 + .1, kind="steam", side=side))
        if season == "storm":
            SOURCES["thunder"]["events"].append((t0 + .3, SIDE_AZ[side] * .6, .6)); SOURCES["thunder"]["az"] += [(t0, SIDE_AZ[side] * .6), (t0 + 4, SIDE_AZ[side] * .6)]
            VISUAL_CUES.append(dict(t=t0 + .3, kind="lightning", side=side))
for _s in SOURCES.values():
    if _s.get("az"): _s["az"] = sorted(_s["az"])
    if "env" in _s: _s["env"] = sorted(_s["env"])
    if "events" in _s: _s["events"] = sorted(_s["events"])
VISUAL_CUES.sort(key=lambda c: c["t"])
CHAOS = [r for r in CHAOS_FILM]


def env(name, t):
    t = np.asarray(t, float); e = np.zeros_like(t)
    for t0, t1, fi, fo, g in SOURCES[name].get("env", []):
        up = np.clip((t - (t0 - fi)) / max(fi, 1e-3), 0, 1); dn = np.clip(((t1 + fo) - t) / max(fo, 1e-3), 0, 1)
        e = np.maximum(e, g * np.minimum(up, dn) ** 1.5)
    if name in PULSE: e = e * pulse(t, *PULSE[name], seed=len(name) * .7)
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
    v = np.interp(t, [a for a, _ in k], [b for _, b in k], left=0, right=0) * silence_gate(t)
    return v * pulse(t, *SUN_PULSE, seed=3.0) if name == "sunlight_right" else v


def segment_at(t):
    for s in SEGMENTS:
        if s[0] <= t < s[1]: return s
    return SEGMENTS[-1]


# ---------------------------------------------------------------- v2 (2026-11-09): rune panels + real warm sources (film time)
# World rule (project/script.md §2): the season outside a window reaches the car only through that side's OPEN rune panels.
# Slow first demonstration: the left panels open 2.0–4.5 s, the right ones 5.0–7.0 s; they close again in the spring 128–132.
RUNE_OPEN = {"L": [(0, 0), (2.0, 0), (4.5, 1), (128.0, 1), (131.0, 0)], "R": [(0, 0), (5.0, 0), (7.0, 1), (128.6, 1), (131.6, 0)]}


def rune_open(side, t):
    k = RUNE_OPEN[side]
    return np.interp(t, [a for a, _ in k], [b for _, b in k])


# real warm sources (not audio: light / a cup make no sound) — DUAL: they sit on the same ear as a cold source
DESIGNED["lamp_left"] = dict(role="heat", side="L", keys=[(38.5, 0), (40.5, .32), (56, .35), (59, 0)], real=True,
                             why="the brass wall lamp beside the left window, ~30 cm from your ear, lit for the downpour (cool rain spray on the same ear)")
DESIGNED["tea_steam_left"] = dict(role="heat", side="L", keys=[(63.5, 0), (66, .36), (88, .4), (90.5, 0)], real=True,
                                  why="the cup of tea stands by the LEFT window in the tunnel: its steam warms the ear that the ice cabin cools")
