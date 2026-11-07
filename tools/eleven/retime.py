"""Let a timeline film follow its voices' natural length (user, 2026-11-08: no need to keep 150 s).

compute(cues, durs) → [(old t, extra s)]: wherever a voiced line would run into the next voiced line, everything from just before
that next line on is pushed later. make_voice writes it to <demo>/audio/retime.json.
apply(globals(), root) at the end of a timeline module maps every time through W(): CUES (t, dur), SCENES, PRESENT, any *_KEYS
list of (t, ...) or {who: [(t, ...)]}, AMBIENCE_EVENTS, FOOTSTEPS, DURATION; keeps the script's own times in CUES0 / DURATION0 and exposes W. Load by path:
    import importlib.util as _iu, os as _os
    _s = _iu.spec_from_file_location("retime", "<repo>/tools/eleven/retime.py"); _R = _iu.module_from_spec(_s); _s.loader.exec_module(_R)
"""
import copy, json, os

VOICED = ("say", "whisper", "laugh")


def compute(cues, durs, gap_same=.15, gap_other=.3):
    """cues: the script's own timeline; durs: {cue index: seconds}."""
    vo = sorted([(c["t"], i, c) for i, c in enumerate(cues) if c["kind"] in VOICED and i in durs])
    pts, shift = [], 0.0
    for (ta, ia, a), (tb, ib, b) in zip(vo, vo[1:]):
        inhale = .45 if b["kind"] == "whisper" and a["who"] == b["who"] else 0   # the mixers place an inhale 0.45 s before a whisper
        over = ta + durs[ia] + (gap_same if a["who"] == b["who"] else gap_other) + inhale - tb
        if over > 0: pts.append((round(tb - .01, 3), round(over, 3)))
        # the shift accumulates in W(); comparisons stay in script time because both lines move together up to here
    return pts


def apply(g, root):
    g["CUES0"], g["DURATION0"] = copy.deepcopy(g["CUES"]), g["DURATION"]
    p = os.path.join(root, "audio", "retime.json")
    pts = json.load(open(p)) if os.path.exists(p) else []
    W = lambda t: t + sum(e for q, e in pts if t >= q)   # noqa: E731
    g["W"], g["RETIME"] = W, pts
    if not pts: return
    for c in g["CUES"]:
        if "dur" in c: c["dur"] = round(W(c["t"] + c["dur"]) - W(c["t"]), 3)
        c["t"] = round(W(c["t"]), 3)
    if "SCENES" in g: g["SCENES"] = [(W(t), *r) for t, *r in g["SCENES"]]
    if "PRESENT" in g: g["PRESENT"] = {k: (W(a), W(b)) for k, (a, b) in g["PRESENT"].items()}
    for k in [k for k in g if k.endswith("KEYS")]:
        if isinstance(g[k], list): g[k] = [(W(t), *r) for t, *r in g[k]]
        elif isinstance(g[k], dict): g[k] = {w: [(W(t), *r) for t, *r in ks] for w, ks in g[k].items()}   # Demo 1: KEYS = {who: [...]}
    if "AMBIENCE_EVENTS" in g: g["AMBIENCE_EVENTS"] = [dict(e, t=W(e["t"])) for e in g["AMBIENCE_EVENTS"]]
    if "FOOTSTEPS" in g: g["FOOTSTEPS"] = [(W(a), W(b)) for a, b in g["FOOTSTEPS"]]
    g["DURATION"] = W(g["DURATION"])
